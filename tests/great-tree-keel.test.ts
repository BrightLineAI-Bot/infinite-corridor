// Great trees you can actually climb (Tim, 2026-11-11: "potentially impossible to traverse a tree to get to the top of a great
// tree right now... substantially broken"; make the platforming "more straightforward", and make it "visually clear where
// platforms end"). The solver in great-tree-climb.test.ts proves a route exists under the step rules; this file plays the real
// Game up the tree with a thumb: Game.update every frame, no centring on a tile, the stick a seeded few degrees off the branch
// on every move, Jump pressed the moment a jump is due. Before the keel (TREE_KEEL) such a thumb walked off a branch at the first
// turn, and a long sky jump up one step carried a held stick past the turn (TREE_FOOTING.stepLands).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, JUMP, TREE_KEEL, TREE_FOOTING } from '../src/game.ts';
import { canStep, fallDamage, LETHAL_KINDS, LIFT_PER_LEVEL, tileLiftScale } from '../src/landscape.ts';
import { wonderAt } from '../src/wonders.ts';
import { CANOPY_RIM, drawLandscapeTile } from '../src/landscape-render.ts';

const W = 32, idx = (x, y) => y * W + x, at = (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : m.tiles[idx(x, y)], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const step = (m, a, b, jumping, airElev?) => footing(b) && canStep({ isPlayer: true, jumping, airElev }, m, W, a.x, a.y, b.x, b.y);
const BUDGET = JUMP.sky / 1000 * 2.4;
// The moves out of a tile that never hurt (a walk, a jump-step, a one-gap sky hop), as great-tree-climb.test.ts movesFrom.
function movesFrom(m, a) {
  const out = [];
  for (const [dx, dy] of N4) {
    const b = at(m, a.x + dx, a.y + dy); if (!b) continue;
    if (step(m, a, b, false)) { if (fallDamage(Math.max(0, (a.elev || 0) - (b.elev || 0)), 100) === 0) out.push({ to: b, kind: 'walk', dx, dy }); }
    else if (step(m, a, b, true)) out.push({ to: b, kind: 'jump', dx, dy });
    if (!a.skyPlatform) continue;
    const L = a.elev || 0, g1 = at(m, a.x + dx, a.y + dy), g2 = at(m, a.x + 2 * dx, a.y + 2 * dy);
    if (!g1 || !g2 || g1.blocked || LETHAL_KINDS.has(g1.kind) || g1.canopy || !canStep({ isPlayer: true, jumping: true, airElev: L }, m, W, a.x, a.y, g1.x, g1.y)) continue;
    if (g2.canopy && footing(g2) && (g2.elev || 0) >= L - 1 && (g2.elev || 0) <= L + 1 && canStep({ isPlayer: true, jumping: true, airElev: L }, m, W, g1.x, g1.y, g2.x, g2.y) && fallDamage(Math.max(0, L - (g2.elev || 0)), 100) === 0) out.push({ to: g2, kind: 'hop', dx, dy });
  }
  return out;
}
// Distance to the door tree's crown from every tile (Dijkstra over the reversed moves, worked out once per tree).
function toCrown(m) {
  const c = m.canopy, n = W * W, edges = Array.from({ length: n }, () => []), back = Array.from({ length: n }, () => []);
  for (const t of m.tiles) if (footing(t)) for (const mv of movesFrom(m, t)) { edges[idx(t.x, t.y)].push(mv); back[idx(mv.to.x, mv.to.y)].push({ from: idx(t.x, t.y), cost: mv.kind === 'hop' ? 3 : 1 }); }
  const dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  for (const t of m.tiles) if (t.kind === 'canopyTrunk' && t.elev === c.top && t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size) dist[idx(t.x, t.y)] = 0;
  for (;;) { let i = -1; for (let k = 0; k < n; k++) if (!done[k] && dist[k] < Infinity && (i < 0 || dist[k] < dist[i])) i = k; if (i < 0) break; done[i] = 1; for (const e of back[i]) if (dist[i] + e.cost < dist[e.from]) dist[e.from] = dist[i] + e.cost; }
  return { dist, edges };
}
const loadAt = (seed, x, y) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; return g; };
const under = (g) => at(g.map, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75));
// The thumb: from the nearest ground tile that can climb, each move holds the stick along the move with a seeded sideways lean
// of up to `lean` (.5 is about 27 degrees), and presses Jump at once for a jump or a hop; it never centres on a tile first.
function climb(g, lean, seed) {
  const m = g.map, rx = g.rx, ry = g.ry, { dist, edges } = toCrown(m); let rnd = (seed >>> 0) || 1, t = 10000; const dt = 1 / 30;
  const r = () => ((rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0) / 4294967296);
  const tick = (sx, sy, jump = false) => { let pressed = false; g.enemies = []; g.update(dt, { state: { x: sx, y: sy }, consume: (k) => k === 'jump' && jump && !pressed ? (pressed = true) : false, held: () => false }, t += dt * 1000); };
  const start = m.tiles.filter((q) => footing(q) && !q.canopy && dist[idx(q.x, q.y)] < Infinity).sort((a, b) => dist[idx(a.x, a.y)] - dist[idx(b.x, b.y)])[0];
  if (!start) return { ok: false, why: 'no climb' };
  g.player.x = start.x; g.player.y = start.y - .25; g.player.hp = g.player.maxHp = g.save.maxHp; const hp0 = g.player.hp; let moves = 0;
  for (let n = 0; n < 300; n++) {
    if (g.rx !== rx || g.ry !== ry || g.player.hp <= 0) return { ok: false, why: 'died', moves };
    if (g.player.hp < hp0 || g.glide) return { ok: false, why: `fell by ${under(g)?.x},${under(g)?.y}`, moves };
    const u = under(g); if (!u) return { ok: false, why: 'off the map' }; const d = dist[idx(u.x, u.y)];
    if (d === 0) return { ok: true, moves, top: u.elev };
    if (d === Infinity) return { ok: false, why: `stranded on ${u.x},${u.y}@${u.elev}`, moves };
    const mv = edges[idx(u.x, u.y)].filter((q) => dist[idx(q.to.x, q.to.y)] < Infinity).sort((a, b) => (dist[idx(a.to.x, a.to.y)] + (a.kind === 'hop' ? 3 : 1)) - (dist[idx(b.to.x, b.to.y)] + (b.kind === 'hop' ? 3 : 1)))[0];
    const k = (r() * 2 - 1) * lean, sx = mv.dx + (mv.dy ? k : 0), sy = mv.dy + (mv.dx ? k : 0); moves++;
    if (mv.kind === 'walk') { for (let i = 0; i < 60 && under(g) === u; i++) tick(sx, sy); }
    else { tick(sx, sy, true); for (let i = 0; i < 60 && (t < g.jumpUntil || under(g) === u); i++) tick(sx, sy); }
  }
  return { ok: false, why: 'too long', moves };
}
// Great trees on new ground across several journeys (spires, compact trees, groves and canopy groves), Tim's journey among them.
const SEEDS = ['CLIMB18', 'SURVEY19', 'CORRIDOR-MUHAPQHU', 'GROVE-3'], PER = 4;
let sample = null;
const trees = () => { if (sample) return sample; sample = [];
  for (const seed of SEEDS) { let n = 0; for (let y = 14; y < 200 && n < PER; y++) for (let x = 14; x < 200 && n < PER; x++) { if (!wonderAt(seed, x, y, 'tree')) continue; const g = loadAt(seed, x, y); if (!g.map.canopy) continue; n++; sample.push({ seed, x, y, form: g.map.canopy.form, top: g.map.canopy.top }); } }
  return sample; };

test('the tables: the keel, the step that lands, the rim', () => {
  assert.deepEqual(Object.keys(TREE_KEEL).sort(), ['lean', 'max', 'on', 'pull']); assert.equal(TREE_KEEL.on, true);
  assert.ok(TREE_KEEL.lean > 0 && TREE_KEEL.lean < 1, 'a stick clearly sideways is never steered: you can still step off');
  assert.ok(TREE_KEEL.max < 1, 'the pull never outruns the stick');
  assert.equal(TREE_FOOTING.stepLands, true); assert.equal(TREE_FOOTING.dodgeAxes, 4, 'the dodge rules are untouched (no cooldown, no axis change)');
  assert.equal(CANOPY_RIM.drop, 2, 'a rim where a step off would hurt (one level down is free)');
});

test('the Wayfarer climbs every sampled great tree to its crown under a drifting thumb, without a fall, on four journeys', () => {
  const S = trees(); assert.ok(S.length >= 14, `${S.length} trees`);
  const forms = new Set(S.map((q) => q.form)); assert.ok(forms.size >= 3, `forms: ${[...forms].join(' ')}`);
  for (const lean of [0, .3, .5]) for (const { seed, x, y, form } of S) {
    const g = loadAt(seed, x, y), r = climb(g, lean, x * 977 + y * 31 + Math.round(lean * 100));
    assert.ok(r.ok, `${seed} ${x},${y} (${form}) at lean ${lean}: ${r.why} after ${r.moves} moves`);
    assert.equal(r.top, g.map.canopy.top, 'on the crown');
  }
});

test('before the keel the same thumb falls off: the keel is what carries it up', () => {
  const S = trees().slice(0, 4), was = TREE_KEEL.on; let fell = 0;
  try { TREE_KEEL.on = false; for (const { seed, x, y } of S) { const r = climb(loadAt(seed, x, y), .3, x * 977 + y * 31 + 30); if (!r.ok) fell++; } }
  finally { TREE_KEEL.on = was; }
  assert.ok(fell >= 2, `${fell} of ${S.length} trees lost the Wayfarer without it`);
});

test('the keel never stops a step off on purpose, never steers off the tree, and leaves the ground alone', () => {
  const { seed, x, y } = trees().find((q) => q.form === 'spire'), g = loadAt(seed, x, y), m = g.map;
  // a branch tile with a hurting drop beside it, and a level neighbour along it
  const b = m.tiles.find((t) => t.canopy && t.kind !== 'canopyTrunk' && (t.elev || 0) >= 4 && [[0, 1], [0, -1]].every(([dx, dy]) => { const n = at(m, t.x + dx, t.y + dy); return n && !n.canopy && !n.blocked; }));
  assert.ok(b, 'a branch running east-west over open ground');
  g.player.x = b.x; g.player.y = b.y - .25 + .3; // a third of a tile south of its middle line
  let k = g.treeKeel(1, .2, false, 1 / 30, 0); assert.ok(k < 0, 'held along it: the sideways part steered back north to the middle');
  k = g.treeKeel(.2, 1, false, 1 / 30, 0); assert.ok(k === null || Math.abs(k) <= TREE_KEEL.max, 'pushed sideways: the push off the edge (the larger axis) is never touched; only its own small sideways part may be steered');
  g.player.x = b.x; g.player.y = b.y - .25; k = g.treeKeel(1, 0, false, 1 / 30, 0); assert.ok(Math.abs(k) < 1e-9, 'on the line: nothing');
  const ground = m.tiles.find((t) => !t.canopy && footing(t) && !t.elev); g.player.x = ground.x; g.player.y = ground.y; assert.equal(g.treeKeel(1, .3, false, 1 / 30, 0), null, 'on the ground: nothing');
  // the step off still happens through the real update
  g.player.x = b.x; g.player.y = b.y - .25; g.player.hp = g.save.maxHp; let t = 5000;
  for (let i = 0; i < 30 && under(g) === b; i++) g.update(1 / 30, { state: { x: 0, y: 1 }, consume: () => false, held: () => false }, t += 33);
  assert.notEqual(under(g), b, 'walked straight off the side');
});

test('exact resume: a hop saved mid-air keeps the branch it left from, and lands where the unbroken hop lands', () => {
  const S = trees(); let checked = 0;
  for (const { seed, x, y } of S) {
    const g = loadAt(seed, x, y), m = g.map, { edges, dist } = toCrown(m);
    const from = m.tiles.find((t) => dist[idx(t.x, t.y)] < Infinity && edges[idx(t.x, t.y)].some((q) => q.kind === 'hop')); if (!from) continue;
    const hop = edges[idx(from.x, from.y)].find((q) => q.kind === 'hop');
    // launch from the tile's edge, the stick leaning off the line
    g.player.x = from.x + (hop.dy ? .3 : 0); g.player.y = from.y - .25 + (hop.dx ? .3 : 0); g.player.hp = g.save.maxHp; let t = 7000, pressed = false;
    const stick = { x: hop.dx + (hop.dy ? -.35 : 0), y: hop.dy + (hop.dx ? -.35 : 0) }, input = (q = null, at = 0) => ({ state: !q || at < q.jumpUntil ? stick : { x: 0, y: 0 }, consume: (k) => k === 'jump' && !pressed ? (pressed = true) : false, held: () => false }); // the stick is let go when the hop lands
    for (let i = 0; i < 6; i++) g.update(1 / 30, input(), t += 1000 / 30);
    assert.ok(g.keelLine && g.jumpUntil > t, 'in the air, on the line of the branch it left');
    const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t)));
    assert.deepEqual(snap.session.playerRuntime.jumpAir.keel, { x: from.x, y: from.y }, 'saved with the jump');
    const r = new Game(migrateSave(snap), 20000); r.enemies = [];
    assert.deepEqual(r.keelLine, g.keelLine); assert.deepEqual([r.player.x, r.player.y, r.skyAir], [g.player.x, g.player.y, g.skyAir]);
    let t2 = 20000; for (let i = 0; i < 40; i++) { g.enemies = []; r.enemies = []; g.update(1 / 30, input(g, t), t += 1000 / 30); r.update(1 / 30, input(r, t2), t2 += 1000 / 30); }
    assert.equal(under(r), at(r.map, hop.to.x, hop.to.y), 'the reloaded hop lands on the far tip'); assert.equal(under(g), hop.to);
    assert.ok(Math.abs(r.player.x - g.player.x) < 1e-6 && Math.abs(r.player.y - g.player.y) < 1e-6, 'at the same spot');
    assert.equal(r.player.hp, g.player.hp);
    const old = JSON.parse(JSON.stringify(snap)); delete old.session.playerRuntime.jumpAir.keel; assert.equal(new Game(migrateSave(old), 0).keelLine, null, 'an older save has none');
    if (++checked >= 3) break;
  }
  assert.ok(checked >= 2, `${checked} hops resumed`);
});

test('a death or a new section clears the jump\'s line', () => {
  const { seed, x, y } = trees()[0], g = loadAt(seed, x, y); g.keelLine = { x: 3, y: 3 }; g.clearCarriedStates(); assert.equal(g.keelLine, null);
  g.keelLine = { x: 3, y: 3 }; g.loadArea('overworld', false); assert.equal(g.keelLine, null);
});

test('the rim: a branch over a drop is edged in gold on its open sides, not where it steps on to the next branch', () => {
  const { seed, x, y } = trees().find((q) => q.form === 'spire'), m = loadAt(seed, x, y).map;
  const b = m.tiles.find((t) => t.canopy && t.kind === 'canopyBranch' && (t.elev || 0) >= 4 && N4.filter(([dx, dy]) => { const n = at(m, t.x + dx, t.y + dy); return n && !n.canopy && !n.blocked; }).length === 2);
  assert.ok(b, 'a branch with two open sides');
  const rects = []; let fill = '';
  const ctx = new Proxy({ set fillStyle(v) { fill = v; }, get fillStyle() { return fill; }, fillRect(x0, y0, w0, h0) { rects.push({ fill, x0, y0, w0, h0 }); }, drawImage() {}, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const s = 40; drawLandscapeTile(ctx, b, b.x, b.y, s, m.tiles, W);
  const gold = rects.filter((q) => q.fill === CANOPY_RIM.edge), lift = (b.elev - (b.slope ? .5 : 0)) * LIFT_PER_LEVEL * tileLiftScale(b) * s, top = b.y * s - lift;
  const sides = { n: gold.some((q) => q.h0 < s / 2 && Math.abs(q.y0 - top) < 1), s: gold.some((q) => q.h0 < s / 2 && Math.abs(q.y0 + q.h0 - (top + s)) < 1), w: gold.some((q) => q.w0 < s / 2 && Math.abs(q.x0 - b.x * s) < 1), e: gold.some((q) => q.w0 < s / 2 && Math.abs(q.x0 + q.w0 - (b.x + 1) * s) < 1) };
  for (const [k, [dx, dy]] of Object.entries({ n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] })) { const n = at(m, b.x + dx, b.y + dy), open = !n || (!n.blocked && (b.elev - (n.elev || 0)) >= CANOPY_RIM.drop); assert.equal(sides[k], open, `${k} side: rim ${sides[k]}, open ${open}`); }
  const ground = m.tiles.find((t) => t.landscape && !t.canopy && !t.elev && !t.blocked); rects.length = 0; drawLandscapeTile(ctx, ground, ground.x, ground.y, s, m.tiles, W); assert.ok(!rects.some((q) => q.fill === CANOPY_RIM.edge), 'the ground has none');
});
