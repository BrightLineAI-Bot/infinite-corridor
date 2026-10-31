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

test('jungle sections grow giant trees: a crown three levels up, a winding stair of branches each one jump up, a door on top', () => {
  assert.equal(LANDSCAPE_VERSION, 12); const found = find(8); assert.ok(found.length >= 6, `${found.length} trees`); const dests = new Set();
  for (const [x, y, m] of found) {
    const c = m.canopy, crown = m.tiles.filter((t) => t.kind === 'canopyCrown'), branches = m.tiles.filter((t) => t.kind === 'canopyBranch');
    assert.equal(crown.length, CANOPY.size ** 2); assert.ok(crown.every((t) => t.elev === CANOPY.height && !t.blocked));
    for (let lv = 1; lv < CANOPY.height; lv++) assert.equal(branches.filter((t) => t.elev === lv).length, CANOPY.step ** 2, `a branch at level ${lv}`);
    const gate = m.objects.find((o) => o.kind === 'canopyGate'); assert.ok(gate && at(m, gate.x, gate.y).kind === 'canopyCrown'); dests.add(gate.dest);
    // The climb: the lowest branch touches ground the plaza reaches; each branch is one level above the one before, one gap away.
    const seen = reachableFromPlaza(m), foot = branches.filter((t) => t.elev === 1);
    assert.ok(foot.some((t) => [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => { const n = at(m, t.x + dx, t.y + dy); return n && !n.canopy && seen[n.y * 32 + n.x]; })), `${x},${y}: the foot of the climb is on reachable ground`);
    const byLevel = [...Array.from({ length: CANOPY.height - 1 }, (_, i) => branches.filter((t) => t.elev === i + 1)), crown];
    for (let i = 1; i < byLevel.length; i++) assert.ok(byLevel[i].some((a) => byLevel[i - 1].some((b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === CANOPY.gap + 1 && (a.x === b.x || a.y === b.y))), `${x},${y}: level ${i + 1} is one jump from level ${i}`);
    assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }).length, 0, 'no traps');
    for (const t of [...crown, ...branches]) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = at(m, t.x + dx, t.y + dy); if (!n || n.canopy) continue; assert.equal(canStep({ isPlayer: false }, m, 32, n.x, n.y, t.x, t.y), (n.elev || 0) >= t.elev, 'creatures cannot climb'); }
    assert.ok(!(m.enemySpawns || []).some((q) => at(m, Math.round(q.x), Math.round(q.y))?.canopy), 'nothing spawns up there');
    assert.ok(!m.objects.some((o) => o.jungle && at(m, Math.round(o.x), Math.round(o.y))?.canopy), 'no tree grows through the branches');
    assert.deepEqual(make(x, y), m, 'deterministic'); assert.ok(!make(x, y, 11).canopy, 'version 11 ground has none');
  }
  assert.deepEqual([...dests].sort(), ['cloud', 'starfield'], 'both doors');
});

const climbIn = (dest) => { const [x, y] = find(12).find(([, , m]) => m.canopy.dest === dest), s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
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
