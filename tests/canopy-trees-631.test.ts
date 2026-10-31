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

test('jungle sections grow great trees: a trunk far taller than the climb, a spiral of 1- and 2-tile branches each a hop up, a door at the landing', () => {
  assert.equal(LANDSCAPE_VERSION, 12); const found = find(8); assert.ok(found.length >= 6, `${found.length} trees`); const dests = new Set();
  for (const [x, y, m] of found) {
    const c = m.canopy, trunk = m.tiles.filter((t) => t.kind === 'canopyTrunk'), branch = m.tiles.filter((t) => t.kind === 'canopyBranch' || t.kind === 'canopyCrown'), leaves = m.tiles.filter((t) => t.kind === 'canopyLeaf');
    assert.equal(trunk.length, CANOPY.trunk ** 2); assert.ok(trunk.every((t) => t.blocked && t.elev === c.top && c.top > c.height), 'the trunk stands above the landing');
    assert.ok(c.height >= 20, `${x},${y}: ${c.height} levels: unreasonably tall`); assert.ok(branch.every((t) => t.skyPlatform && !t.blocked) && leaves.every((t) => t.skyPlatform && !t.blocked));
    const byLevel = {}; for (const t of branch) (byLevel[t.elev] ||= []).push(t);
    for (let lv = 1; lv <= c.height; lv++) { const here = byLevel[lv]; assert.ok(here && (here.length <= 2 || lv === c.height), `${x},${y}: a branch of 1 or 2 tiles at level ${lv}`);
      if (lv > 1) assert.ok(here.some((a) => byLevel[lv - 1].some((q) => Math.abs(a.x - q.x) + Math.abs(a.y - q.y) <= CANOPY.gap + 1 + 1)), `level ${lv} is a hop from level ${lv - 1}`); }
    assert.ok(leaves.every((t) => branch.some((q) => q.elev === t.elev + 1 && Math.abs(q.x - t.x) + Math.abs(q.y - t.y) === 1)), 'every gap is one level below the branch before it');
    const gate = m.objects.find((o) => o.kind === 'canopyGate'); assert.ok(gate && at(m, gate.x, gate.y).elev === c.height); dests.add(gate.dest);
    const seen = reachableFromPlaza(m), foot = byLevel[1]; assert.ok(foot.some((t) => [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => { const n = at(m, t.x + dx, t.y + dy); return n && !n.canopy && seen[n.y * 32 + n.x]; })), `${x},${y}: the climb starts from reachable ground`);
    assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }).length, 0, 'no pit to fall into and never leave');
    for (const t of branch) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = at(m, t.x + dx, t.y + dy); if (!n || n.canopy) continue; assert.equal(canStep({ isPlayer: false }, m, 32, n.x, n.y, t.x, t.y), (n.elev || 0) >= t.elev, 'creatures cannot climb'); }
    assert.ok(!(m.enemySpawns || []).some((q) => at(m, Math.round(q.x), Math.round(q.y))?.canopy), 'nothing spawns up there');
    assert.ok(!m.objects.some((o) => o.jungle && at(m, Math.round(o.x), Math.round(o.y))?.canopy), 'no tree grows through it');
    assert.deepEqual(make(x, y), m, 'deterministic'); assert.ok(!make(x, y, 11).canopy, 'version 11 ground has none');
  }
  assert.deepEqual([...dests].sort(), ['cloud', 'starfield'], 'both doors');
});

test('a fall off the great tree is broken by its leaves: a hard landing, never death', () => {
  const [x, y, m] = find(8)[0], s = freshSave(); s.seed = SEED; s.maxHp = 100; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = [];
  const hi = g.map.tiles.filter((t) => t.kind === 'canopyBranch' && t.elev >= 10).find((t) => [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => { const n = at(g.map, t.x + dx, t.y + dy); return n && !n.blocked && (n.elev || 0) === 0; }));
  assert.ok(hi, 'a high branch on the outside'); const [dx, dy] = [[0, -1], [-1, 0], [1, 0], [0, 1]].find(([a, b]) => { const n = at(g.map, hi.x + a, hi.y + b); return n && !n.blocked && (n.elev || 0) === 0; });
  Object.assign(g.player, { x: hi.x, y: hi.y - .25, hp: 100 }); const move = { state: { x: dx, y: dy }, consume: () => false, held: () => false }; let t = 1000;
  for (let i = 0; i < 30 && (g.map.tiles[Math.floor(g.player.y + .75) * 32 + Math.floor(g.player.x + .5)]?.elev || 0) > 0; i++) { t += 50; g.update(.05, move, t); }
  for (let i = 0; i < 4; i++) { t += 50; g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, t); }
  assert.ok(g.player.hp > 0 && g.player.hp < 100, `hp ${g.player.hp}: hurt, alive`); assert.equal(s.worldFlags.deaths || 0, 0);
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
