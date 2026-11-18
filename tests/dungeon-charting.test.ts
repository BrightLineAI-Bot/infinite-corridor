// Charting (dungeon-framework.ts DUNGEON_CHARTING; Tim's log): clearing the fog from every walkable tile of a dungeon floor pays a
// bonus of 20% of the Aperture earned on that floor, once, in every dungeon. Walkable ground is what base movement reaches, so 100% is
// always within reach; a floor of the Deep is a new floor each visit and has its own record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { DUNGEON_CHARTING, chartableGround, chartProgress, chartRecord, chartOwed, ensureCharting, dungeonChunkId } from '../src/dungeon-framework.ts';
import { shaftHere, floorSpecial } from '../src/the-deep.ts';
import { LETHAL_KINDS, canStep } from '../src/landscape.ts';
import { labyrinthPlan, labFogOn } from '../src/labyrinths.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function enter(seed = 'CHART1', tag = 'chart-test', s = null) {
  s ||= freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = 5; g.ry = 5; g.loadArea('overworld', false);
  const id = `dungeon:${seed}:g${s.worldGeneration}:5:5:${tag}`; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 5, ry: 5, x: 16, y: 16 };
  g.loadArea('dungeon', false); g.player.x = g.map.entry.x; g.player.y = g.map.entry.y; return { s, g, id };
}
const tick = (g, t = 1000) => g.update(.016, idle, t);
// Walk the floor: stand on every walkable tile once, the way the Wayfarer's own steps reveal it.
function chartAll(g) {
  const st = g.chartFloor(), W = g.map.width, ground = chartableGround(g.map);
  assert.ok(st && st.total > 0, 'a floor with something to chart');
  for (let k = 0; k < ground.reach.length; k++) if (ground.reach[k]) { g.player.x = k % W; g.player.y = Math.floor(k / W); g.updateDungeonDiscovery(); }
}

test('the walkable ground: what base movement reaches, nothing walled off, across water or out of a pit', () => {
  // 18 x 12: a room the entry stands in; a sealed room beside it; an island across a channel of water; a ledge two steps up.
  const W = 18, H = 12, tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1, wall = x === 8 || (x === 13 && y < 6);
    tiles.push({ x, y, kind: edge || wall ? 'wall' : x === 12 && y >= 6 ? 'dungeonWater' : 'floor', blocked: edge || wall });
  }
  tiles[3 * W + 8] = { x: 8, y: 3, kind: 'sealedGate', blocked: true }; // the sealed gate counts: it opens in the floor's course
  tiles[9 * W + 4] = { x: 4, y: 9, kind: 'floor', pit: true };
  const map = { width: W, height: H, tiles, entry: { x: 2, y: 2 } }, open = (t) => !!t && (!t.blocked || t.kind === 'sealedGate') && t.kind !== 'dungeonWater' && !t.pit;
  const g = chartableGround(map, open, () => true, [map.entry]);
  assert.equal(g.reach[2 * W + 2], 1); assert.equal(g.reach[3 * W + 10], 1, 'through the sealed gate'); assert.equal(g.reach[9 * W + 4], 0, 'the pit is not ground');
  assert.equal(g.reach[8 * W + 15], 0, 'the island across the water is out of reach'); assert.equal(g.reach[2 * W + 15], 0, 'the room behind the wall is out of reach');
  assert.equal(chartableGround(map), g, 'worked out once per map');
  const all = [...g.chunks], st = chartProgress(g, { revealed: all }); assert.ok(st.done); assert.equal(st.pct, 100);
  assert.ok(!all.includes(dungeonChunkId(map, 15, 8)), 'its chunk is not asked for');
  const half = chartProgress(g, { revealed: all.slice(1) }); assert.ok(!half.done && half.pct < 100);
  const seen = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) if (g.reach[k]) seen[k] = 1;
  assert.ok(chartProgress(g, { seen }).done, 'tile fog: every reachable tile seen'); seen[2 * W + 2] = 0; assert.equal(chartProgress(g, { seen }).done, false);
});

test('generated floors, many seeds: walking every walkable tile charts 100%, and the ground left out is truly out of reach', () => {
  let floors = 0, left = 0;
  for (let k = 0; k < 40; k++) {
    const { g } = enter(`CH${k}`, `walk-${k}`);
    chartAll(g); const st = g.chartFloor(); floors++;
    assert.ok(st.done, `CH${k}: ${st.charted}/${st.total}`); assert.equal(st.pct, 100);
    const ground = chartableGround(g.map), W = g.map.width;
    for (const t of g.map.tiles) if (!t.blocked && !ground.reach[t.y * W + t.x]) { left++; assert.ok(LETHAL_KINDS.has(t.kind) || t.pit || [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => { const n = g.map.tiles[(t.y + dy) * W + t.x + dx]; return !n || !ground.reach[n.y * W + n.x] || !canStep({ isPlayer: true, jumping: true }, g.map, W, n.x, n.y, t.x, t.y); }), `CH${k} ${t.x},${t.y} ${t.kind}`); }
  }
  assert.equal(floors, 40); assert.ok(left > 0, 'some open tiles are out of reach and left out');
});

test('a labyrinth chamber charts by its tile fog: every walkable tile seen', () => {
  const base = 'labyrinth:LB5:5:5:keep', node = labyrinthPlan(base).nodes.find((q) => q.kind !== 'gaps') || labyrinthPlan(base).nodes[0];
  const s = freshSave(); s.seed = 'LB5'; const g = new Game(s, 0); s.session.activeDungeonId = `${base}:f${node.n + 1}`; s.session.dungeonReturn = { rx: 5, ry: 5, x: 16, y: 16 }; g.loadArea('dungeon', false);
  assert.ok(labFogOn(g.map)); g.labFogTick(); tick(g, 1000); s.perception.aperture += 20; tick(g, 1016);
  const st = g.chartFloor(); assert.ok(st.total > 0 && !st.done, `${st.charted}/${st.total}`);
  const ground = chartableGround(g.map), W = g.map.width, a = s.perception.aperture;
  for (let k = 0; k < ground.reach.length; k++) if (ground.reach[k]) { g.player.x = k % W; g.player.y = Math.floor(k / W) - .25; g.labFogTick(); }
  tick(g, 1032); assert.ok(g.chartFloor().done); assert.equal(s.perception.aperture, a + 4); assert.equal(g.message, 'Every corner charted: +4 Aperture.');
});

test('the bonus: 20% of the floor\'s Aperture, once, when the last corner is charted; topped up if more is earned there later', () => {
  const { s, g, id } = enter(); tick(g, 1000);
  assert.equal(DUNGEON_CHARTING.bonus, .2);
  const st0 = g.chartFloor(); assert.ok(st0.pct < 100); assert.match(g.chartLine(), /^Charted \d+%$/);
  s.perception.aperture += 15; tick(g, 1016); // fifteen Aperture earned on this floor
  const rec = chartRecord(s.consequences.dungeons[id]); assert.equal(rec.earned, 15); assert.equal(rec.paid, 0); assert.equal(rec.done, false);
  chartAll(g); const before = s.perception.aperture; tick(g, 1032);
  assert.equal(s.perception.aperture - before, 3, 'round(15 * 20%)'); assert.equal(g.message, 'Every corner charted: +3 Aperture.');
  assert.equal(rec.done, true); assert.equal(rec.paid, 3); assert.equal(rec.earned, 15, 'the bonus itself is not counted as earned');
  assert.equal(g.chartLine(), 'Charted 100%');
  for (let t = 0; t < 10; t++) tick(g, 1048 + t * 16); assert.equal(s.perception.aperture, before + 3, 'paid once');
  s.perception.aperture += 5; tick(g, 1300); assert.equal(rec.earned, 20); assert.equal(s.perception.aperture, before + 3 + 5 + 1, 'topped up to round(20 * 20%)');
  // leave and come back: nothing more
  const after = s.perception.aperture; g.snapshotArea(true); g.loadArea('overworld', false); s.session.activeDungeonId = id; g.loadArea('dungeon', false);
  for (let t = 0; t < 10; t++) tick(g, 2000 + t * 16); assert.equal(s.perception.aperture, after); assert.equal(chartOwed(rec), 0);
});

test('a floor charted before any Aperture was earned pays as it is earned; nothing for nothing', () => {
  const { s, g, id } = enter('CHART2', 'empty'); tick(g, 1000); chartAll(g); const a = s.perception.aperture; tick(g, 1016);
  assert.equal(s.perception.aperture, a); assert.equal(g.message, 'Every corner charted.');
  s.perception.aperture += 10; tick(g, 1032); assert.equal(s.perception.aperture, a + 10 + 2); assert.equal(chartRecord(s.consequences.dungeons[id]).paid, 2);
});

test('the record survives a save round trip, and bad records are normalised', () => {
  const { s, g, id } = enter(); tick(g, 1000); s.perception.aperture += 10; tick(g, 1016); chartAll(g); tick(g, 1032);
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(m.consequences.dungeons[id].charted.root, { earned: 10, paid: 2, done: true });
  const g2 = new Game(m, 0); g2.loadArea('dungeon', false); const a = m.perception.aperture; for (let t = 0; t < 5; t++) g2.update(.016, idle, 3000 + t * 16);
  assert.equal(m.perception.aperture, a, 'a reload pays nothing again'); assert.equal(g2.chartLine(), 'Charted 100%');
  const bad = { consequences: { dungeons: { a: { charted: [1, 2] }, b: { charted: { root: { earned: -4, paid: 'x', done: 'yes', note: 'kept' }, lvl: 7 } }, c: { visits: 1 } } } };
  ensureCharting(bad); assert.deepEqual(bad.consequences.dungeons.a.charted, {}); assert.deepEqual(bad.consequences.dungeons.b.charted, { root: { earned: 0, paid: 0, done: false, note: 'kept' } });
  assert.equal('charted' in bad.consequences.dungeons.c, false); assert.equal(freshSave().consequences.dungeons && true, true);
});

test('the Deep: each visit to a floor is a new floor with its own record; the next floor starts at nothing', () => {
  const SEED = 'DEEP677'; let g = null, s = null;
  for (let rx = 6; rx < 90 && !g; rx++) for (let ry = -30; ry < 30 && !g; ry++) if (shaftHere(SEED, rx, ry)) {
    s = freshSave(); s.seed = SEED; const q = new Game(s, 0); q.rx = rx; q.ry = ry; q.loadArea('overworld', false);
    const o = q.map.objects.find((x) => x.kind === 'deepShaft'); if (o) { q.player.x = o.x; q.player.y = o.y; assert.ok(q.interact('descend:1', o.id).ok); g = q; }
  }
  const id = g.areaId(); tick(g, 1000); s.perception.aperture += 10; tick(g, 1016); chartAll(g); const a = s.perception.aperture; tick(g, 1032);
  assert.equal(s.perception.aperture, a + 2); assert.equal(s.consequences.dungeons[id].charted.root.paid, 2);
  for (const e of g.enemies) if (!e.dead && !e.ambient) { e.hp = 0; g.defeatEnemy(e); e.dead = true; }
  const st = g.map.objects.find((o) => o.kind === 'deepStair'); g.player.x = st.x; g.player.y = st.y; assert.ok(g.interact('descend', st.id).ok);
  tick(g, 1100); const rec = s.consequences.dungeons[id].charted?.root;
  assert.ok(!rec || (rec.earned === 0 && rec.paid === 0 && !rec.done), 'floor 2 has its own record');
  assert.ok(floorSpecial(SEED, id, 2) === null || g.map.deepLair, 'lair or not, it charts the same');
});
