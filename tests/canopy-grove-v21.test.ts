// The canopy grove and the two-tile hop (Tim, 2026-11-05: "a grove where there's multiple great trees and they make like a canopy
// area up above the floor, where the floor is kind of invisible. But you can walk around and jump between great trees... If they
// fall off they'll die, or their glider will get deployed... Maybe there's only one tree to access the whole larger area above
// there. It doesn't have to be offered in every grove"). Tree generator version 21 (trees.ts TREES_V21) on ground first seen at
// landscape 22: groves hop only over open ground and no tree offers a two-tile hop; a share of tree sections try a canopy grove
// first. Landscape 21 and older regenerate byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Game, JUMP, crownSpot } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { hashSeed } from '../src/random.ts';
import { LANDSCAPE_VERSION, canStep, fallDamage, LETHAL_KINDS, applyLandscape, applyDream, DREAM_VERSION } from '../src/landscape.ts';
import { TREES_V21, TREES_V20, longGapAt, canopyRepaint, canopyAboveCrown } from '../src/trees.ts';
import { wonderAt } from '../src/wonders.ts';
import { treeGlideWindowAt } from '../src/vehicle-gates.ts';
import { render, canopyFloorReveal, CANOPY_FLOOR, SKY } from '../src/renderer.ts';

const W = 32, idx = (x, y) => y * W + x, at = (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : m.tiles[idx(x, y)], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const section = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, canopy: m.canopy || null, spawns: m.enemySpawns || null })).digest('hex').slice(0, 16);

// ---------------------------------------------------------------- the climb solver of great-tree-climb.test.ts, with a gap limit
const SPEED = 2.4, BUDGET = JUMP.sky / 1000 * SPEED;
const step = (m, a, b, jumping, airElev?) => footing(b) && canStep({ isPlayer: true, jumping, airElev }, m, W, a.x, a.y, b.x, b.y);
function movesFrom(m, a, maxGap) {
  const out = [];
  for (const [dx, dy] of N4) {
    const b = at(m, a.x + dx, a.y + dy); if (!b) continue;
    const d = (b.elev || 0) - (a.elev || 0);
    if (step(m, a, b, false)) out.push({ to: b, kind: 'walk', hurt: fallDamage(Math.max(0, -d), 100) });
    else if (step(m, a, b, true)) out.push({ to: b, kind: 'jump', hurt: 0 });
    if (!a.skyPlatform) continue;
    const L = a.elev || 0; let prev = a;
    for (let k = 1; k <= 3; k++) {
      const g = at(m, a.x + dx * k, a.y + dy * k); if (!g || g.blocked || LETHAL_KINDS.has(g.kind) || k - .5 > BUDGET) break;
      if (!canStep({ isPlayer: true, jumping: true, airElev: L }, m, W, prev.x, prev.y, g.x, g.y)) break;
      if (g.canopy && (g.elev || 0) >= L - 1) { if (k > 1 && k - 1 <= maxGap) out.push({ to: g, kind: 'hop', gap: k - 1, hurt: fallDamage(Math.max(0, L - (g.elev || 0)), 100), marginWorst: BUDGET - k }); break; }
      prev = g;
    }
  }
  return out;
}
// Every tile reached from `from` with moves that never hurt; hops cross at most `maxGap` tiles (one: with margin from anywhere on the launching tile).
function reach(m, from, maxGap = 1) {
  const seen = new Set(from.map((t) => idx(t.x, t.y))), q = [...from];
  for (let i = 0; i < q.length; i++) for (const mv of movesFrom(m, q[i], maxGap)) { if (mv.hurt > 0 || (mv.kind === 'hop' && maxGap === 1 && mv.marginWorst < .5)) continue; const j = idx(mv.to.x, mv.to.y); if (!seen.has(j)) { seen.add(j); q.push(mv.to); } }
  return seen;
}
// The safest climb from the ground to the door tree's crown (great-tree-climb.test.ts solveClimb).
function solveClimb(m, maxGap = 2) {
  const c = m.canopy; if (!c) return null;
  const crown = m.tiles.filter((t) => t.kind === 'canopyTrunk' && t.elev === c.top && t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size);
  const dist = new Float64Array(W * W).fill(Infinity), prev = new Array(W * W).fill(null), via = new Array(W * W).fill(null), seen = new Uint8Array(W * W), q = [];
  for (let i = 0; i < W * W; i++) if (footing(m.tiles[i]) && !m.tiles[i].canopy) { dist[i] = 0; q.push(i); }
  const cost = (mv) => 1 + (mv.hurt >= 100 ? 1e6 : mv.hurt * 50) + (mv.kind === 'hop' ? 5 : 0);
  while (q.length) {
    let bi = 0; for (let i = 1; i < q.length; i++) if (dist[q[i]] < dist[q[bi]]) bi = i; const i = q.splice(bi, 1)[0]; if (seen[i]) continue; seen[i] = 1;
    for (const mv of movesFrom(m, m.tiles[i], maxGap)) { const j = idx(mv.to.x, mv.to.y), nd = dist[i] + cost(mv); if (nd < dist[j]) { dist[j] = nd; prev[j] = i; via[j] = mv; if (!seen[j]) q.push(j); } }
  }
  let best = null; for (const t of crown) { const j = idx(t.x, t.y); if (dist[j] < Infinity && (best == null || dist[j] < dist[best])) best = j; }
  if (best == null) return { ok: false };
  const route = []; for (let j = best; prev[j] != null; j = prev[j]) route.unshift(via[j]);
  const hops = route.filter((r) => r.kind === 'hop'), hurt = route.reduce((s, r) => s + r.hurt, 0);
  return { ok: hurt < 100, route, hurt, maxGap: hops.length ? Math.max(...hops.map((h) => h.gap)) : 0, minMarginWorst: hops.length ? Math.min(...hops.map((h) => h.marginWorst)) : null };
}
const square = (m, tr) => { const out = []; for (let j = 0; j < tr.size; j++) for (let i = 0; i < tr.size; i++) out.push(at(m, tr.x0 + i, tr.y0 + j)); return out; };

// Canopy groves found on new ground (landscape 22) by a survey of 300 tree sections on two seeds (23 canopy groves; the rest
// of the 300 grew 126 spires, 137 compact trees and 14 groves). [seed, x, y, crowns].
const GROVES = [['SURVEY19', 179, 18, 4], ['SURVEY19', 513, 27, 4], ['SURVEY19', 158, 20, 3], ['CLIMB18', 73, 14, 3], ['CLIMB18', 506, 16, 3], ['CLIMB18', 509, 18, 3],
  ['SURVEY19', 283, 15, 2], ['SURVEY19', 590, 16, 2], ['SURVEY19', 183, 25, 2], ['CLIMB18', 412, 18, 2], ['CLIMB18', 563, 20, 2], ['CLIMB18', 557, 14, 2]];
const cache = new Map(), grove = (seed, x, y) => { const k = `${seed}:${x}:${y}`; if (!cache.has(k)) cache.set(k, section(seed, x, y, 22)); return cache.get(k); };

test('landscape 22: the tables; a one-tile hop is made from anywhere on the tile, a two-tile one only from its middle', () => {
  assert.equal(LANDSCAPE_VERSION, 25); assert.equal(TREES_V21.since, 22); assert.equal(TREES_V21.version, 21);
  for (const k of ['specs', 'readable', 'tries', 'greaterTries', 'forms', 'allTurns']) assert.deepEqual(TREES_V21[k], TREES_V20[k], `${k} as version 20`);
  assert.ok(BUDGET - 2 >= .5, 'one gap tile, from the launching tile\'s far edge, with margin'); assert.ok(BUDGET < TREES_V21.longGap + 1 && BUDGET >= TREES_V21.longGap + .5, `two gap tiles: ${(BUDGET - 3).toFixed(2)} from the far edge (the hop longGapAt keeps out)`);
  const C = TREES_V21.canopy; assert.ok(C.share > 0 && C.share <= .2, 'a share of tree sections, not most'); assert.ok(C.crowns[0] >= 2 && C.crowns[1] <= 4); assert.ok(C.bridge.min >= 2 && C.bridge.max <= 10 && C.bridge.gapEvery >= 3);
  assert.equal(CANOPY_FLOOR.below + CANOPY_FLOOR.ramp <= C.minTop - SKY.from, true, 'the floor goes before the sky alone would take it');
});

test('the two-tile hop, found and fixed: groves whose walk hopped a buttress root, and a walk that offered a hop of two tiles', () => {
  // GROVE3 447,17 and GROVE1 557,35 (landscape 21): a walk's hop gap fell on a buttress root, which stops a hop; the greater tree
  // could not be reached at all, by any hop.
  for (const [seed, x, y, from, over] of [['GROVE3', 447, 17, [6, 2], [7, 2]], ['GROVE1', 557, 35, [17, 3], [18, 3]]]) {
    const old = section(seed, x, y, 21), g = at(old, ...over); assert.equal(old.canopy.form, 'grove');
    assert.ok(at(old, ...from).walk && g.kind === 'buttressRoot' && g.blocked && at(old, 2 * over[0] - from[0], 2 * over[1] - from[1]).walk, `${seed} ${x},${y}: a hop over a root`);
    assert.equal(solveClimb(old, 2).ok, false, `${seed} ${x},${y} at 21: the door tree cannot be reached`);
    const now = section(seed, x, y, 22), r = solveClimb(now, 1); assert.equal(now.canopy.form, 'grove'); assert.ok(r.ok && r.hurt === 0 && r.maxGap <= 1 && r.minMarginWorst >= .5, `${seed} ${x},${y} at 22: climbed with one-tile hops`);
    for (const t of now.tiles) if (t.walk) for (const [dx, dy] of N4) { const q = at(now, t.x + dx, t.y + dy), b = at(now, t.x + 2 * dx, t.y + 2 * dy); if (q && b?.walk && !q.canopy) assert.ok(!q.blocked, `${seed} ${x},${y}: every walk gap is open ground`); }
  }
  // CANOPY631 290,15 (landscape 21): two walk platforms across two open tiles; the shortest climb hopped them (−.36 from the far edge).
  const old = section('CANOPY631', 290, 15, 21), r = solveClimb(old, 2), long = r.route.find((q) => q.gap === 2);
  assert.ok(long && Math.abs(long.marginWorst - (BUDGET - 3)) < 1e-9 && long.marginWorst < 0, 'the route took a two-tile hop'); assert.ok(longGapAt(old.tiles, W, old.tiles.flatMap((t, i) => t.canopy ? [i] : [])));
  const now = section('CANOPY631', 290, 15, 22), laid = now.tiles.flatMap((t, i) => t.canopy ? [i] : []); assert.equal(longGapAt(now.tiles, W, laid), null); assert.ok(solveClimb(now, 1).ok);
});

test('a canopy grove: one access tree climbed, crowns joined at crown height by branch bridges, the door on the last crown', () => {
  const m = grove('SURVEY19', 179, 18), c = m.canopy, [a, ...crowns] = c.trees, door = crowns.at(-1);
  assert.deepEqual([c.version, c.form, c.crowns, c.trees.length], [21, 'canopy', 4, 5]);
  assert.ok(a.low && crowns.slice(0, -1).every((t) => t.low) && !door.low, 'every crown a level of the canopy; the door tree\'s trunk goes on up');
  assert.deepEqual([c.x0, c.y0, c.size, c.top], [door.x0, door.y0, door.size, door.top], 'the record\'s tree is the door tree');
  const gate = m.objects.find((o) => o.kind === 'canopyGate'); assert.ok(square(m, door).some((t) => t.x === gate.x && t.y === gate.y), 'the door is in the last crown');
  assert.ok(square(m, a).every((t) => t.kind === 'canopyTrunk' && t.elev === a.top) && a.top >= TREES_V21.canopy.minTop, 'the access crown');
  const bridges = m.tiles.filter((t) => t.bridge); assert.equal(bridges.length, c.walk); assert.ok(bridges.every((t) => t.canopy && t.skyPlatform && t.walk && t.kind === 'canopyBranch' && !t.blocked));
  for (const cr of crowns) { const sq = square(m, cr); assert.ok(sq.every((t) => t.kind === 'canopyTrunk' && t.elev === cr.top), 'a crown square'); assert.ok(Math.abs(cr.top - a.top) <= crowns.length, 'near the access crown\'s height');
    for (const t of sq) for (const [dx, dy] of N4) { const n = at(m, t.x + dx, t.y + dy); if (n && !n.canopy && footing(n)) assert.ok(!step(m, n, t, true), 'no crown but the access tree\'s is climbed from the ground'); } }
  // Only the access tree has a climb from the ground: every tile of wood above level 1 that the ground steps onto is its first branch.
  const fromGround = m.tiles.filter((t) => t.canopy && N4.some(([dx, dy]) => { const n = at(m, t.x + dx, t.y + dy); return n && !n.canopy && footing(n) && (step(m, n, t, false) || step(m, n, t, true)); }));
  assert.ok(fromGround.every((t) => (t.elev || 0) <= 2 && !t.bridge), `the only way up is the access climb (${fromGround.map((t) => `${t.x},${t.y}@${t.elev}`).join(' ')})`);
});

test('reachability over many canopy groves: from the access crown every bridge and crown is reached with legal moves and one-tile hops, and every one leads back', () => {
  let tiles = 0, hops = 0;
  for (const [seed, x, y, n] of GROVES) {
    const m = grove(seed, x, y), c = m.canopy, name = `${seed} ${x},${y}`; assert.equal(c.form, 'canopy', name); assert.equal(c.crowns, n, name);
    const access = square(m, c.trees[0]), up = m.tiles.filter((t) => t.canopy && (t.bridge || (t.kind === 'canopyTrunk' && c.trees.slice(1).some((tr) => t.x >= tr.x0 && t.x < tr.x0 + tr.size && t.y >= tr.y0 && t.y < tr.y0 + tr.size))));
    const r = reach(m, access); for (const t of up) assert.ok(r.has(idx(t.x, t.y)), `${name}: ${t.x},${t.y}@${t.elev} reached from the access crown`);
    const r2 = reach(m, access, 2); assert.equal(r2.size, r.size, `${name}: no platform needs a longer hop`); assert.equal(longGapAt(m.tiles, W, m.tiles.flatMap((t, i) => t.canopy ? [i] : [])), null, `${name}: no two-tile gap offered`);
    for (const t of up) assert.ok(reach(m, [t]).has(idx(access[0].x, access[0].y)), `${name}: back to the access crown from ${t.x},${t.y}`);
    const climb = solveClimb(m, 1); assert.ok(climb.ok && climb.hurt === 0 && climb.maxGap <= 1 && (climb.minMarginWorst == null || climb.minMarginWorst >= .5), `${name}: the ground to the door with no fall`); assert.ok(r.has(idx(c.x0, c.y0)), `${name}: the door crown among them`);
    const down = reach(m, [access[0]]); assert.ok(m.tiles.some((t) => !t.canopy && footing(t) && down.has(idx(t.x, t.y))), `${name}: and back down the access climb to the ground without a fall`);
    tiles += up.length; hops += c.hops;
  }
  assert.ok(tiles >= 150 && hops >= 10, `${tiles} canopy tiles, ${hops} bridge hops`);
});

test('drawn is walkable: every bridge and crown shows; at most the access climb\'s one twin-covered tile hides', () => {
  for (const [seed, x, y] of GROVES) {
    const m = grove(seed, x, y), c = m.canopy, door = c.trees.at(-1), hidden = canopyRepaint(m.tiles, W, c.box, canopyAboveCrown(m.tiles, W, door)).hiddenAfter;
    assert.ok(hidden.length <= c.trees.length, `${seed} ${x},${y}: ${hidden.length}`);
    for (const t of hidden) { assert.ok(!t.bridge, `${seed} ${x},${y}: ${t.x},${t.y} a bridge tile hidden`); const s = at(m, t.x, t.y + 2); assert.ok(s?.canopy && s.elev === t.elev + 3, `${seed} ${x},${y}: only the twin-tip kind`); }
  }
});

test('rarity: a hashed share of tree sections try a canopy grove (the data table), and fewer grow one', () => {
  const C = TREES_V21.canopy, seed = 'SURVEY19', rolled = (x, y) => (hashSeed(`${seed}:trees:v13:${x}:${y}:canopy-form`) % 1000) / 1000 < C.share;
  let trees = 0, roll = 0; for (let y = 14; y < 240; y++) for (let x = 14; x < 240; x++) if (wonderAt(seed, x, y, 'tree')) { trees++; if (rolled(x, y)) roll++; }
  const sigma = Math.sqrt(C.share * (1 - C.share) / trees); assert.ok(trees > 1000 && Math.abs(roll / trees - C.share) < 3 * sigma, `${roll} of ${trees} tree sections roll a canopy grove (${(roll / trees).toFixed(3)} against ${C.share})`);
  for (const [s, x, y] of GROVES) assert.ok((hashSeed(`${s}:trees:v13:${x}:${y}:canopy-form`) % 1000) / 1000 < C.share, `${s} ${x},${y} rolled it`);
  let n = 0, grown = 0; const forms = {};
  for (let y = 14; y < 400 && n < 60; y++) for (let x = 14; x < 400 && n < 60; x++) { if (!wonderAt(seed, x, y, 'tree') || !rolled(x, y)) continue; const m = section(seed, x, y, 22); if (!m.canopy) continue; n++; forms[m.canopy.form] = (forms[m.canopy.form] || 0) + 1; if (m.canopy.form === 'canopy') grown++; }
  assert.equal(n, 60); assert.ok(grown >= 30 && grown <= n, `${grown} of ${n} rolled sections grow one (${JSON.stringify(forms)})`);
  for (let y = 14, k = 0; y < 400 && k < 25; y++) for (let x = 14; x < 400 && k < 25; x++) { if (!wonderAt(seed, x, y, 'tree') || rolled(x, y)) continue; const m = section(seed, x, y, 22); if (!m.canopy) continue; k++; assert.notEqual(m.canopy.form, 'canopy', `${x},${y}: no canopy grove without the roll`); }
});

test('deterministic: two fresh loads grow the same canopy grove, in the game too', () => {
  for (const [seed, x, y] of GROVES.slice(0, 6)) assert.equal(fp(section(seed, x, y, 22)), fp(grove(seed, x, y)), `${seed} ${x},${y}`);
  const load = () => { const s = freshSave(); s.seed = 'SURVEY19'; const g = new Game(s, 0); g.rx = 179; g.ry = 18; g.loadArea('overworld'); return { s, g }; };
  const one = load(), two = load(); assert.equal(one.s.atlas['179,18'].landscapeVersion, 25); assert.equal(one.g.map.canopy.form, 'canopy'); assert.deepEqual(one.g.map.canopy, two.g.map.canopy);
  assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles));
});

test('older ground regenerates byte for byte: landscape 14 to 21 fingerprinted on main (release 775) before this change', () => {
  for (const [seed, v, x, y, hash, form] of [
    ['GROVE3', 20, 447, 17, 'b4dab7c123ab6c50', 'grove'], ['GROVE3', 21, 447, 17, 'b4dab7c123ab6c50', 'grove'], ['GROVE1', 14, 557, 35, '345df203f88551c2', 'grove'], ['GROVE1', 21, 557, 35, 'cbe1aee2453f6743', 'grove'],
    ['CANOPY631', 19, 290, 15, 'a28a4893bb33ec31', 'grove'], ['CANOPY631', 21, 290, 15, '45b590c092e76daa', 'grove'], ['TREEX2', 21, 560, 23, '24f628cf75b16db3', 'grove'], ['SURVEY19', 21, 557, 14, '854a79b4547b24b6', 'spire'],
    ['SURVEY19', 21, 224, 16, 'f9c0a6c32f4c00bc', 'grove'], ['SURVEY19', 14, 179, 18, '4d159d3caa8f080e', 'spire'], ['SURVEY19', 18, 179, 18, '84301883e8d52c5b', 'spire'], ['SURVEY19', 19, 179, 18, '46bbdd587a4d6eab', 'spire'],
    ['SURVEY19', 20, 179, 18, '80a0245b926b35fe', 'spire'], ['SURVEY19', 21, 179, 18, '80a0245b926b35fe', 'spire'], ['CLIMB18', 21, 73, 14, '494e817ddd5e9c26', 'spire'], ['SURVEY19', 19, 181, 14, '404b48d7cbccde0e', 'spire'],
    ['SURVEY19', 21, 282, 14, '836d45779b1fc176', 'spire'],
  ]) { const m = section(seed, x, y, v); assert.equal(m.canopy?.form || null, form, `${seed} v${v} ${x},${y}`); assert.equal(fp(m), hash, `${seed} v${v} ${x},${y}`); }
  const old = freshSave(); old.seed = 'SURVEY19'; const g = new Game(old, 0); g.rx = 179; g.ry = 18; g.loadArea('overworld'); const pin = { ...old.atlas['179,18'], landscapeVersion: 21 };
  const s21 = freshSave(); s21.seed = 'SURVEY19'; s21.atlas = { '179,18': pin }; const g21 = new Game(s21, 0); g21.rx = 179; g21.ry = 18; g21.loadArea('overworld');
  assert.notEqual(g21.map.canopy?.form, 'canopy', 'ground first seen at 21 keeps its tree'); assert.deepEqual(g21.map.canopy ?? null, section('SURVEY19', 179, 18, 21).canopy ?? null);
});

// ---------------------------------------------------------------- in the game
const stick = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
function onCanopy(glider) {
  const s = freshSave(); s.seed = 'SURVEY19'; s.glider = glider; const g = new Game(s, 0); g.rx = 179; g.ry = 18; g.loadArea('overworld'); g.enemies = []; g.map.enemySpawns = [];
  // a bridge tile with open air beside it, along the bridge's side
  const m = g.map; let spot = null;
  for (const t of m.tiles) if (t.bridge && !t.slope) for (const [dx, dy] of N4) { const n = at(m, t.x + dx, t.y + dy), far = at(m, t.x + 2 * dx, t.y + 2 * dy), back = at(m, t.x - dx, t.y - dy); if (!spot && n && !n.canopy && footing(n) && far && !far.canopy && back && !back.canopy && dx === 0) spot = { t, dx, dy }; }
  assert.ok(spot, 'a bridge tile with air on both sides'); g.player.x = spot.t.x; g.player.y = spot.t.y - .25; g.player.hp = s.maxHp; return { s, g, ...spot };
}

test('a fall off a bridge follows the rules: death without the glider; with it, a freefall the glider opens; the tree window holds', () => {
  const bare = onCanopy(false), d0 = bare.s.worldFlags.deaths || 0; let t = 1000; assert.ok(fallDamage(bare.t.elev, 100) === Infinity, `${bare.t.elev} levels up`);
  for (let i = 0; i < 80 && (bare.s.worldFlags.deaths || 0) === d0; i++) bare.g.update(.05, stick(bare.dx, bare.dy), t += 50);
  assert.equal((bare.s.worldFlags.deaths || 0) - d0, 1, 'off the side of a bridge with no glider: a fatal fall');
  const wing = onCanopy(true); t = 1000; for (let i = 0; i < 30 && !wing.g.glide; i++) wing.g.update(.05, stick(wing.dx, wing.dy), t += 50);
  assert.ok(wing.g.glide, 'with the glider: a freefall (Jump opens it)'); assert.ok(wing.g.player.hp > 0); assert.equal(wing.s.worldFlags.deaths || 0, 0);
  assert.ok(treeGlideWindowAt(wing.g.map, wing.g.player.x, wing.g.player.y), 'inside the great trees\' glide window: north stays closed');
});

test('the glider is found on the access crown; the Crown Rest and the wake spot keep to the door crown', () => {
  const s = freshSave(); s.seed = 'SURVEY19'; const g = new Game(s, 0); g.rx = 179; g.ry = 18; g.loadArea('overworld'); g.enemies = [];
  const c = g.map.canopy, a = c.trees[0], rest = g.map.objects.find((o) => o.kind === 'crownRest'), door = square(g.map, c.trees.at(-1)), spot = crownSpot(g.map);
  assert.ok(door.some((t) => t.x === rest.x && t.y === rest.y), 'the rest on the door crown'); assert.ok(door.some((t) => t.x === spot.x && Math.abs(t.y - .2 - spot.y) < 1e-9), 'a glide from the canopy wakes you on the door crown');
  assert.ok(!s.glider); g.player.x = a.x0; g.player.y = a.y0 - .25; g.update(.05, stick(0, 0), 1000); assert.equal(s.glider, true, 'the first crown you stand on gives the glider');
});

test('the floor goes up among the crowns: the canopy floor is drawn from a handful of leaves; a frame costs about what a spire\'s does', () => {
  const m = grove('SURVEY19', 179, 18), c = m.canopy, base = c.trees[0].top;
  assert.equal(canopyFloorReveal(c, 0), 0); assert.equal(canopyFloorReveal(c, base), 1); assert.equal(canopyFloorReveal(c, base - CANOPY_FLOOR.below), 1); assert.ok(canopyFloorReveal(c, base - CANOPY_FLOOR.below - CANOPY_FLOOR.ramp / 2) > 0);
  assert.equal(canopyFloorReveal({ ...c, form: 'spire' }, base), 0, 'only a canopy grove');
  let ops = 0; const ctx = new Proxy({ measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }) }, { get: (o, k) => (k in o ? o[k] : () => { ops++; }), set: () => true });
  const frame = (seed, x, y, px, py) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = []; g.player.x = px; g.player.y = py; render(ctx, g, 475, 661, 5000); ops = 0; render(ctx, g, 475, 661, 5050); return ops; };
  const bridge = m.tiles.find((t) => t.bridge), up = frame('SURVEY19', 179, 18, bridge.x, bridge.y - .25), ground = frame('SURVEY19', 179, 18, 16, 16);
  const spire = section('SURVEY19', 181, 14, 22); assert.equal(spire.canopy.form, 'spire'); const crown = spire.tiles.find((t) => t.kind === 'canopyTrunk' && t.elev === spire.canopy.top), high = frame('SURVEY19', 181, 14, crown.x, crown.y - .25);
  assert.ok(up < high * 1.5 && up < ground * 2, `draw calls on the canopy ${up}, on the ground ${ground}, on a spire's crown ${high}`);
});
