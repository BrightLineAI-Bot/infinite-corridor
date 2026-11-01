// Release 631 (Tim, 2026-10-31: "The pale vines looks good, but I'm not seeing any giant trees you can climb by jumping between
// platforms. This should take you to a platform or dungeon... a skyland dungeon without the divine challenge... or a starfield
// dungeon"): from landscape version 12 some jungle sections grow a giant tree, climbed branch by branch, with a door in its crown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, CHASM } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, LANDSCAPE_VERSION, CANOPY, reachableFromPlaza, trappedTiles, canStep } from '../src/landscape.ts';
import { skylandModeOf } from '../src/skylands.ts';

const SEED = 'CANOPY631';
const make = (x, y, version = 12) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version }); return m; };
const trees = []; const find = (n) => { for (let x = 14; x < 260 && trees.length < n; x++) for (let y = 14; y < 260 && trees.length < n; y += 3) { if (sectionRegion(SEED, x, y, 12).type !== 'jungle') continue; const m = make(x, y); if (m.canopy) trees.push([x, y, m]); } return trees; };
const at = (m, x, y) => m.tiles[y * 32 + x];

// The climb, as the Wayfarer can make it going up only: walk level, step or slope one level up, or hop one level up across one gap.
function climbTo(m) {
  const T = m.tiles, at = (x, y) => (x < 0 || y < 0 || x > 31 || y > 31) ? null : T[y * 32 + x], seen = new Set(), q = [];
  for (const t of T) if (t.canopy && t.elev === 1) { q.push(t); seen.add(t); }
  while (q.length) { const t = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const k of [1, 2]) { const n = at(t.x + dx * k, t.y + dy * k); if (!n || !n.canopy || seen.has(n)) continue; const d = n.elev - t.elev; if ((k === 1 && (d === 0 || d === 1)) || (k === 2 && d === 1 && !at(t.x + dx, t.y + dy)?.canopy)) { seen.add(n); q.push(n); } } }
  return Math.max(...[...seen].map((t) => t.elev));
}

test('jungle sections grow great trees: a trunk whose top is the crown, branches sticking out of it, a climb of thirty levels and more', () => {
  assert.equal(LANDSCAPE_VERSION, 14); const found = find(8); assert.ok(found.length >= 6, `${found.length} trees`); const dests = new Set();
  for (const [x, y, m] of found) {
    const c = m.canopy, crown = m.tiles.filter((t) => t.kind === 'canopyTrunk'), branch = m.tiles.filter((t) => t.kind === 'canopyBranch');
    assert.equal(crown.length, CANOPY.trunk ** 2); assert.ok(crown.every((t) => !t.blocked && t.elev === c.top && t.skyPlatform), 'the crown is the trunk\'s top');
    assert.ok(c.top >= 30, `${x},${y}: ${c.top} levels: unreasonably tall`); assert.equal(climbTo(m), c.top, `${x},${y}: the crown can be climbed to`);
    assert.equal(c.branches, 8); assert.ok(c.reach.every((L) => L >= CANOPY.reach[0] && L <= CANOPY.reach[1]));
    assert.ok(branch.every((t) => t.skyPlatform && !t.blocked && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = at(m, t.x + dx, t.y + dy); return n?.canopy; })), 'every branch tile is part of a bough');
    for (const t of branch) { const off = (t.x < c.x0 || t.x >= c.x0 + 3) && (t.y < c.y0 || t.y >= c.y0 + 3); if (off) assert.ok([[1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => at(m, t.x - dx, t.y - dy)?.kind === 'canopyTrunk'), 'off the trunk\'s rows and columns only the corner knots'); }
    const gate = m.objects.find((o) => o.kind === 'canopyGate'); assert.ok(gate && at(m, gate.x, gate.y).kind === 'canopyTrunk'); dests.add(gate.dest);
    const seen = reachableFromPlaza(m), foot = branch.find((t) => t.elev === 1); assert.ok(!foot.slope && [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => { const n = at(m, foot.x + dx, foot.y + dy); return n && !n.canopy && seen[n.y * 32 + n.x]; }), `${x},${y}: the climb starts from reachable ground`);
    for (const t of [...branch, ...crown]) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = at(m, t.x + dx, t.y + dy); if (!n || n.canopy) continue; assert.equal(canStep({ isPlayer: false }, m, 32, n.x, n.y, t.x, t.y), (n.elev || 0) >= t.elev, 'creatures cannot climb'); }
    assert.ok(!(m.enemySpawns || []).some((q) => at(m, Math.round(q.x), Math.round(q.y))?.canopy), 'nothing spawns up there');
    assert.ok(!m.objects.some((o) => o.jungle && at(m, Math.round(o.x), Math.round(o.y))?.canopy), 'no tree grows through it');
    assert.deepEqual(make(x, y), m, 'deterministic'); assert.ok(!make(x, y, 11).canopy, 'version 11 ground has none');
  }
  assert.deepEqual([...dests].sort(), ['cloud', 'starfield'], 'both doors');
});

test('a fall off the great tree is a fall: high enough, it kills', () => {
  const [x, y] = find(8)[0], s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; s.atlas = { ...(s.atlas || {}), [`${x},${y}`]: { landscapeVersion: 12 } }; /* release 645: a journey that first saw it at version 12 */ g.loadArea('overworld'); g.enemies = [];
  const hi = g.map.tiles.filter((t) => t.kind === 'canopyBranch' && t.elev >= 8).find((t) => [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([a, b]) => { const n = at(g.map, t.x + a, t.y + b); return n && !n.blocked && !n.canopy; }));
  const [dx, dy] = [[0, -1], [-1, 0], [1, 0], [0, 1]].find(([a, b]) => { const n = at(g.map, hi.x + a, hi.y + b); return n && !n.blocked && !n.canopy; });
  Object.assign(g.player, { x: hi.x, y: hi.y - .25 }); const before = s.worldFlags.deaths || 0; let t = 1000;
  for (let i = 0; i < 40 && (s.worldFlags.deaths || 0) === before; i++) { t += 50; g.update(.05, { state: { x: dx, y: dy }, consume: () => false, held: () => false }, t); }
  assert.equal((s.worldFlags.deaths || 0) - before, 1, 'a long fall');
});

const climbIn = (dest) => { const [x, y] = find(12).find(([, , m]) => m.canopy.dest === dest), s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; s.atlas = { ...(s.atlas || {}), [`${x},${y}`]: { landscapeVersion: 12 } }; /* release 645: a journey that first saw it at version 12 */ g.loadArea('overworld');
  const gate = g.map.objects.find((o) => o.kind === 'canopyGate'); g.player.x = gate.x; g.player.y = gate.y; return { s, g, r: g.interact('enter', gate.id), x, y }; };

test('the starfield door: a Starfield crossing high in the tree, and back out onto the crown', () => {
  const { s, g, r, x, y } = climbIn('starfield'); assert.ok(r.ok, g.message); assert.equal(g.area, 'dungeon');
  assert.equal(s.session.activeDungeonId, `dungeon:${SEED}:g${s.worldGeneration}:${x}:${y}:canopy`); assert.equal(g.map.chasm, CHASM.version, 'always a Starfield');
  assert.deepEqual([s.session.dungeonReturn.rx, s.session.dungeonReturn.ry], [x, y]);
});

test('the cloud door: a cloud hold of the Skylands, never a divine challenge, at no cost in sigils', () => {
  const { s, g, r } = climbIn('cloud'); assert.ok(r.ok, g.message); assert.equal(g.area, 'dungeon'); assert.equal(skylandModeOf(g.areaId()), 'cloud'); assert.match(g.map.name, /Cloud Hold/); assert.ok(!/Divine/.test(g.map.name));
  assert.equal(s.skylands.sigils || 0, 0);
});
