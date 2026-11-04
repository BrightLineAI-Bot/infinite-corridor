// Dig gates (Tim, 2026-11-04: "we shouldn't be able to dig through the secrets or break the actual labyrinth path... the path
// should be enforced by natural consequences and natural laws that don't need invisible walls"). Inside labyrinths (the
// Shell-Labyrinth too), the Pentagon, castles, great buildings and compounds a tunnel breaks through only into floor you have
// walked, nothing (not even the iron shovel) opens floor a gate keeps, and a chamber's outer wall says why it will not dig.
// On the open land a great building's stone will not dig. Nothing is regenerated: the rules are checked when you dig.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { DIG, DIG_GATES, isInteriorArea, planDig, reachable, markWalked, wallTreasure, wallGlints, applyTunnels, ensureDigging } from '../src/digging.ts';
import { labyrinthPlan, generateLabyrinthChamber } from '../src/labyrinths.ts';
import { pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { generateCastleFloor } from '../src/castles.ts';
import { generateCompoundFloor } from '../src/compounds.ts';
import { generateBuildingFloor } from '../src/great-buildings.ts';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const clone = (m) => ({ ...m, tiles: m.tiles.map((t) => ({ ...t })), objects: m.objects });
const OLD = (id) => `old-${id}`; // a key outside DIG_GATES.interiors, with no walked record: exactly the release-748 rules
// walking distances from `from` (one-tile holes jumped; tunnels are floor); -1 where you cannot walk
function walkDist(m, from) {
  const W = m.width, H = m.height, d = new Int32Array(W * H).fill(-1), q = [from.y * W + from.x]; d[q[0]] = 0;
  const tile = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? m.tiles[y * W + x] : null), ok = (x, y) => { const t = tile(x, y); return t && !t.blocked && !t.hole; };
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of Object.values(DIRS)) { let nx = x + dx, ny = y + dy; const t = tile(nx, ny); if (!t || t.blocked) continue; let c = 1; if (t.hole) { nx += dx; ny += dy; c = 2; if (!ok(nx, ny)) continue; } const nk = ny * W + nx; if (d[nk] < 0) { d[nk] = d[k] + c; q.push(nk); } } }
  return d;
}
function pathTo(m, from, to) {
  const d = walkDist(m, to), W = m.width, out = []; let k = from.y * W + from.x; if (d[k] < 0) return out;
  for (let g = 0; g < 2000 && d[k] > 0; g++) { out.push(k); const x = k % W, y = (k / W) | 0; let best = -1;
    for (const [dx, dy] of Object.values(DIRS)) for (const s of [1, 2]) { const nk = (y + dy * s) * W + x + dx * s; if (nk >= 0 && nk < d.length && d[nk] >= 0 && d[nk] < d[k] && (best < 0 || d[nk] < d[best])) best = nk; }
    if (best < 0) break; k = best; }
  out.push(k); return out;
}
// The best a digger can do: every dig the rules allow, with shovels to spare, repeated until nothing more opens. With a walked
// record the digger walks into each tunnel it makes (marking round it, as game.ts does), and digs only from walked floor.
function digAll(m0, key, { iron = false, walked = null } = {}) {
  const m = clone(m0), W = m.width; let changed = true;
  while (changed) { changed = false;
    for (const k of reachable(m, m.entry.x, m.entry.y)) { if (walked && !walked[k]) continue; const px = k % W, py = (k / W) | 0;
      for (const f of Object.keys(DIRS)) { let p = planDig(m, px, py, f, key, { walked }); if (!p.ok && p.resists && iron) p = planDig(m, px, py, f, key, { iron: true, walked }); if (!p.ok) continue;
        const i = p.y * W + p.x; m.tiles[i] = { ...m.tiles[i], kind: 'tunnel', blocked: false, tunnel: true }; changed = true; if (walked) markWalked(walked, m, p.x, p.y); } } }
  return m;
}
const inner = (m, t) => t.x > 0 && t.y > 0 && t.x < m.width - 1 && t.y < m.height - 1;
// Interiors of every kind, a few seeds each.
function* interiors(n) {
  for (let i = 0; i < n; i++) {
    for (const style of ['keep', 'apartment', 'hive', 'shell']) { const base = style === 'shell' ? `labyrinth:DG${i}~shell0:${i}:${-i}:shell` : `labyrinth:DG${i}:${i + 6}:${-i}:${style}`;
      for (const q of labyrinthPlan(base).nodes) { const id = `${base}:f${q.n + 1}`; yield [`labyrinth ${q.kind}`, id, generateLabyrinthChamber('DG', id, 1 + (i % 2))]; } }
    for (const V of [1, 3, 6]) { const P = pentagonPlan(`DGP${i}`, 8 * i, 8, V); for (const q of P.nodes) { const id = `${P.base}:f${q.n + 1}`; yield [`pentagon ${q.kind}`, id, generatePentagonChamber(`DGP${i}`, id)]; } }
    for (const part of ['w0', 'w1', 'k']) for (let f = 1; f <= 3; f++) { const id = `castle:DGC${i}:${i}:${i}:${part}:3:f${f}`; let m = null; try { m = generateCastleFloor(`DGC${i}`, id, 1 + (i % 2)); } catch { /* a part this corner does not have */ } if (m) yield ['castle', id, m]; }
    for (const part of ['w0', 't']) for (let f = 1; f <= 3; f++) { const id = `compound:DGK${i}:${i}:3:keep:${part}:3:f${f}`; yield ['compound', id, generateCompoundFloor(`DGK${i}`, id, 2)]; }
    for (let f = 1; f <= 3; f++) { const id = `building:DGB${i}:${i}:4:${i % 2 ? 'keep' : 'apartment'}:3:f${f}`; yield ['building', id, generateBuildingFloor(`DGB${i}`, id, 1 + (i % 2))]; }
  }
}
const goalsOf = (m) => m.objects.filter((o) => ['buildingStair', 'exit', 'labKey', 'chest'].includes(o.kind));

test('the rules hold in every interior kind, by area id; the numbers live in DIG_GATES', () => {
  for (const id of ['labyrinth:S:1:2:keep:f3', 'labyrinth:S~shell0:1:2:shell:f1', 'pentagon:S:8:8:v6:f4', 'castle:S:3:3:k:3:f2', 'building:S:4:4:keep:3:f1', 'compound:S:5:5:hive:t:3:f2']) assert.ok(isInteriorArea(id), id);
  for (const id of ['dungeon:S:g1:2:3:crypt', 'overworld:3,4', 'arena:x', 'dive:1']) assert.ok(!isInteriorArea(id), id);
  assert.equal(DIG_GATES.walked.radius, 1); assert.equal(DIG.reach, 3, 'the reach is unchanged');
  for (const k of ['unwalked', 'sealed', 'outerWall', 'building']) assert.ok(DIG_GATES.messages[k].length > 20, k);
});

test('a sweep of generated interiors: digging reaches no gated floor and no unexplored passage, and never cuts the outer wall', () => {
  const by = {}, total = { maps: 0, goals: 0, oldShortcuts: 0, newShortcuts: 0, gatedReached: 0, ironGatedReached: 0, border: 0 };
  for (const [kind, id, m] of interiors(3)) { if (!m?.tiles) continue; const W = m.width, s = (by[kind] ||= { maps: 0 }); s.maps++; total.maps++;
    const foot = walkDist(m, m.entry), gated = m.tiles.filter((t) => !t.blocked && !t.hole && foot[t.y * W + t.x] < 0).map((t) => t.y * W + t.x);
    // floor nobody can walk to (none is gated within a chamber: gates are its doors and ladders; a gallery's odd island)
    if (gated.length) { const all = new Uint8Array(m.tiles.length).fill(1);
      for (const [iron, field] of [[false, 'gatedReached'], [true, 'ironGatedReached']]) { const d = digAll(m, id, { iron, walked: all.slice() }), dd = walkDist(d, d.entry); if (gated.some((k) => dd[k] >= 0)) total[field]++; } }
    // walk the way to the nearest goal; can digging then reach another goal not yet walked to sooner than walking there?
    const goals = goalsOf(m).filter((o) => foot[o.y * W + o.x] >= 0).sort((a, b) => foot[a.y * W + a.x] - foot[b.y * W + b.x]); if (goals.length < 2) continue;
    const walked = new Uint8Array(m.tiles.length); for (const k of pathTo(m, m.entry, goals[0])) markWalked(walked, m, k % W, (k / W) | 0);
    const before = digAll(m, OLD(id)), after = digAll(m, id, { walked: walked.slice() }), dB = walkDist(before, m.entry), dA = walkDist(after, m.entry);
    for (const t of after.tiles) if (t.tunnel && !inner(m, t)) total.border++;
    for (const o of goals.slice(1)) { const k = o.y * W + o.x; if (walked[k]) continue; total.goals++; const near = (d) => Math.min(...[k, k - 1, k + 1, k - W, k + W].map((j) => (d[j] >= 0 ? d[j] : 1e9)));
      if (near(dB) < foot[k] - 2) total.oldShortcuts++; if (near(dA) < foot[k] - 2) total.newShortcuts++; } }
  for (const k of ['labyrinth hall', 'labyrinth court', 'labyrinth cellar', 'labyrinth gaps', 'pentagon outer', 'pentagon inner', 'pentagon heart', 'castle', 'compound', 'building']) assert.ok(by[k]?.maps > 0, `swept ${k}`);
  assert.ok(total.maps > 400, `${total.maps} interiors`); assert.ok(total.goals > 300, `${total.goals} passages, keys and caches not yet reached`);
  assert.ok(total.oldShortcuts > total.goals / 2, `before: digging skipped the way to ${total.oldShortcuts} of ${total.goals}`);
  assert.equal(total.newShortcuts, 0, 'now: none'); assert.equal(total.gatedReached, 0); assert.equal(total.ironGatedReached, 0); assert.equal(total.border, 0);
});

test('secrets stay diggable: every treasure wall the old rules let you dig, once the floor round it is walked; a wall pocket at once', () => {
  let walls = 0, pockets = 0;
  for (const [, id, m] of interiors(2)) { if (!m?.tiles) continue; const W = m.width, foot = walkDist(m, m.entry), all = new Uint8Array(m.tiles.length);
    for (const t of m.tiles) if (foot[t.y * W + t.x] >= 0) markWalked(all, m, t.x, t.y);
    for (const t of m.tiles) { if (!t.blocked || !inner(m, t) || !wallTreasure('DG', id, t.x, t.y)) continue;
      const beyond = Object.values(DIRS).map(([dx, dy]) => m.tiles[(t.y + dy) * W + t.x + dx]).filter((n) => n && !n.blocked); if (!beyond.every((n) => foot[n.y * W + n.x] >= 0)) continue; // floor you can stand on
      for (const [f, [dx, dy]] of Object.entries(DIRS)) { const px = t.x - dx, py = t.y - dy; if (foot[py * W + px] < 0) continue;
        const was = planDig(m, px, py, f, OLD(id)); if (!was.ok) continue; walls++;
        assert.ok(planDig(m, px, py, f, id, { walked: all }).ok, `${id} ${t.x},${t.y}`);
        if (!was.through) { pockets++; const near = new Uint8Array(m.tiles.length); markWalked(near, m, px, py); assert.ok(planDig(m, px, py, f, id, { walked: near }).ok, 'a pocket digs on arrival'); }
        break; } } }
  assert.ok(walls > 1000, `${walls} treasure walls`); assert.ok(pockets > 0, `${pockets} of them pockets`);
});

// A chamber in play: a labyrinth cellar maze.
function cellar() {
  for (let i = 0; i < 40; i++) { const base = `labyrinth:DGM${i}:7:-3:keep`, q = labyrinthPlan(base).nodes.find((n) => n.kind === 'cellar'); if (!q) continue;
    const s = freshSave(); s.seed = 'DGM'; s.materials = { ...(s.materials || {}), wood: 20, stone: 20 }; ensureDigging(s);
    const g = new Game(s, 0); g.save.session.activeDungeonId = `${base}:f${q.n + 1}`; g.loadArea('dungeon', false); if (g.map?.building?.kind === 'cellar') return g; }
  return null;
}
// a 1-thick maze wall with floor either side (neither side a passage or the way in), away from the outer wall
function hedge(g) {
  const m = g.map, W = m.width, taken = new Set(m.objects.map((o) => o.y * W + o.x)), free = (x, y) => { const t = m.tiles[y * W + x]; return t && !t.blocked && !t.hole && !taken.has(y * W + x); };
  for (const t of m.tiles) { if (!t.blocked || !inner(m, t) || t.x < 2 || t.y < 2 || t.x > W - 3 || t.y > m.height - 3) continue;
    for (const [f, [dx, dy]] of Object.entries(DIRS)) if (free(t.x - dx, t.y - dy) && free(t.x + dx, t.y + dy) && Math.abs(t.x - m.entry.x) + Math.abs(t.y - m.entry.y) > 4) return { x: t.x, y: t.y, f, a: { x: t.x - dx, y: t.y - dy }, b: { x: t.x + dx, y: t.y + dy } }; }
  return null;
}

test('in play: a hedge in the maze will not open onto ground you have not walked, says why, and opens once you have been there', () => {
  const g = cellar(); assert.ok(g, 'a cellar chamber'); const m = g.map, W = m.width, h = hedge(g); assert.ok(h, 'a maze wall');
  const before = JSON.stringify(m.tiles[h.y * W + h.x]);
  g.player.x = h.a.x; g.player.y = h.a.y; g.player.facing = h.f;
  const no = g.digAhead(); assert.ok(no && !no.ok); assert.equal(no.message, DIG_GATES.messages.unwalked); assert.equal(JSON.stringify(m.tiles[h.y * W + h.x]), before, 'the wall is untouched');
  assert.equal(g.save.digging.shovel, 0, 'no shovel was spent (none was even lashed together)');
  // walk round to the far side (the game marks where you stand each frame), and come back
  g.player.x = h.b.x; g.player.y = h.b.y; g.markWalked(); g.player.x = h.a.x; g.player.y = h.a.y; g.player.facing = h.f;
  const yes = g.digAhead(); assert.ok(yes?.ok, yes?.message); assert.match(yes.message, /break through/); assert.ok(m.tiles[h.y * W + h.x].tunnel);
  assert.deepEqual(g.save.digging.dug[g.areaStateId()], [`${h.x},${h.y}`], 'the shortcut is kept like any tunnel');
  // the outer wall says what it is
  g.player.x = 1; g.player.y = 1; g.player.facing = 'up'; const wall = g.digAhead(); assert.ok(wall && !wall.ok); assert.equal(wall.message, DIG_GATES.messages.outerWall);
  // a new visit is a new walk: the record is the map's, made fresh when the chamber loads
  const id = g.save.session.activeDungeonId; g.loadArea('dungeon', false); assert.equal(g.save.session.activeDungeonId, id); assert.ok(g.map.tiles[h.y * W + h.x].tunnel, 'the tunnel is re-applied');
  assert.equal(g.walkedHere().reduce((a, v) => a + v, 0), 0);
});

test('nothing opens what a gate keeps, not even the iron shovel; outside an interior the iron shovel works as before (release 379)', () => {
  const W = 12, H = 9, tiles = []; // a room, a 3-thick wall, and a pocket of floor at (8,1) nobody can walk to
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const wall = x === 0 || y === 0 || x === W - 1 || y === H - 1 || x >= 5; tiles.push({ x, y, kind: wall ? 'wall' : 'floor', blocked: wall }); }
  tiles[1 * W + 8] = { x: 8, y: 1, kind: 'floor', blocked: false };
  const m = { width: W, height: H, tiles, objects: [], entry: { x: 2, y: 2 } }; for (const x of [5, 6]) m.tiles[1 * W + x] = { ...m.tiles[1 * W + x], kind: 'tunnel', blocked: false, tunnel: true };
  const all = new Uint8Array(W * H).fill(1), id = 'castle:S:3:3:k:3:f2';
  for (const iron of [false, true]) { const p = planDig(m, 6, 1, 'right', id, { iron, walked: all }); assert.equal(p.ok, false); assert.equal(p.sealed, true); assert.ok(!p.resists, 'no iron shovel is offered'); assert.equal(p.reason, DIG_GATES.messages.sealed); }
  assert.equal(planDig(m, 6, 1, 'right', 'dungeon:S:g1:1:1:gate', { iron: true }).ok, true, 'an ordinary dungeon keeps the iron shovel of release 379');
});

test('on the open land a great building, castle or Pentagon is dressed stone: refused, with a reason, only where the building is drawn', () => {
  const tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y, kind: 'grass', blocked: false });
  const block = []; for (let y = 10; y < 16; y++) for (let x = 10; x < 18; x++) { tiles[y * 32 + x] = { x, y, kind: 'grass', blocked: true, greatBuilding: true }; block.push({ x, y }); } // a closed block, as version 1 laid it
  tiles[20 * 32 + 5] = { x: 5, y: 20, kind: 'rock', blocked: true };
  const m = { width: 32, height: 32, tiles, objects: [{ kind: 'greatBuilding', footprint: block }] }, key = 'overworld:4,5';
  const p = planDig(m, 9, 12, 'right', key, { overworld: true }); assert.equal(p.ok, false); assert.equal(p.reason, DIG_GATES.messages.building);
  assert.ok(m.objects[0].footprint.some((c) => c.x === 10 && c.y === 12), 'the refused stone is the drawn building');
  assert.equal(planDig(m, 4, 20, 'right', key, { overworld: true }).ok, true, 'ordinary rock still digs');
  // a tunnel dug into such a block before this release is kept
  const s = freshSave(); s.seed = 'DG'; ensureDigging(s); s.digging.dug[key] = ['10,12']; applyTunnels(m, s, key, true); assert.ok(m.tiles[12 * 32 + 10].tunnel);
});

test('glints still show, and interiors already explored keep their tiles: generation is untouched (the rules are checked on dig)', () => {
  const ids = ['labyrinth:DGH:7:-2:keep:f2', 'labyrinth:DGH~shell0:3:4:shell:f1', `${pentagonPlan('DGH', 16, 8, 6).base}:f3`, 'castle:DGH:3:3:k:3:f2', 'building:DGH:4:4:apartment:3:f2', 'compound:DGH:5:3:keep:t:3:f2'];
  const gen = (id, V) => id.startsWith('labyrinth') ? generateLabyrinthChamber('DGH', id, V) : id.startsWith('pentagon') ? generatePentagonChamber('DGH', id) : id.startsWith('castle') ? generateCastleFloor('DGH', id, V) : id.startsWith('building') ? generateBuildingFloor('DGH', id, V) : generateCompoundFloor('DGH', id, V);
  const digest = (m) => createHash('sha256').update(JSON.stringify(m.tiles)).digest('hex').slice(0, 16);
  // pinned from release 748 (this release changes no generator): version 1 and version 2 interiors
  const pinned = Object.fromEntries(ids.flatMap((id) => [1, 2].map((V) => [`${id}|${V}`, digest(gen(id, V))])));
  assert.deepEqual(pinned, PINNED);
  let glints = 0; for (const id of ids) { const m = gen(id, 2), s = freshSave(); s.seed = 'DGH'; ensureDigging(s); glints += wallGlints(m, 'DGH', id, s).length; } assert.ok(glints > 0, `${glints} glints`);
});
const PINNED = {
  'labyrinth:DGH:7:-2:keep:f2|1': '2a2e806865438df3', 'labyrinth:DGH:7:-2:keep:f2|2': '2a2e806865438df3',
  'labyrinth:DGH~shell0:3:4:shell:f1|1': '1beeae080c972119', 'labyrinth:DGH~shell0:3:4:shell:f1|2': '1beeae080c972119',
  'pentagon:DGH:16:8:v6:f3|1': '28eb59119c2e3c16', 'pentagon:DGH:16:8:v6:f3|2': '28eb59119c2e3c16',
  'castle:DGH:3:3:k:3:f2|1': 'dd5248232c452189', 'castle:DGH:3:3:k:3:f2|2': 'dd5248232c452189',
  'building:DGH:4:4:apartment:3:f2|1': 'f346f2ccf4d7c19d', 'building:DGH:4:4:apartment:3:f2|2': 'f346f2ccf4d7c19d',
  'compound:DGH:5:3:keep:t:3:f2|1': 'ca8a5eb2a8c436cc', 'compound:DGH:5:3:keep:t:3:f2|2': 'ca8a5eb2a8c436cc',
};
