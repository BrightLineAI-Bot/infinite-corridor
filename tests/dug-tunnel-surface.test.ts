import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { DIG, ensureDigging, planDig, validateDigPlan, dig, applyTunnels } from '../src/digging.ts';
import { Game } from '../src/game.ts';
import { elevationAt } from '../src/landscape.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const tile = (x, y, extra = {}) => ({ x, y, kind: 'floor', blocked: false, elev: 0, ...extra });
function heightMap(source, wall = {}) {
  const width = 7, height = 7, tiles = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push(tile(x, y, x === 0 || y === 0 || x === width - 1 || y === height - 1 ? { kind: 'wall', blocked: true } : {}));
  tiles[3 * width + 3] = tile(3, 3, source); tiles[4 * width + 3] = tile(3, 4, { kind: 'wall', blocked: true, elev: 0, ...wall });
  return { width, height, tiles, objects: [], landscape: true, interiorTerrain: { version: 1, maxLevel: 5 } };
}
const save = () => { const s = freshSave(); s.seed = 'DUG-SURFACE'; s.digging.shovel = 6; return s; };
const key = 'building:DUG-SURFACE:1:1:keep:4:f1';
const witnessId = 'building:DIG-AUDIT0:1:1:keep:4:f1';
function witness(saved = null) {
  const s = saved || freshSave(); s.seed = 'DIG-AUDIT0'; s.materials.wood = 99; s.materials.stone = 99; s.session.activeDungeonId = witnessId;
  const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; Object.assign(g.player, { x: 18, y: 25, facing: 'down', hp: 100, maxHp: 100 }); g.save.maxHp = 100;
  assert.equal(g.map.building.interiorVersion, 4); return g;
}
function drive(g, axis, frames, jump = false, start = 1000) {
  let takeJump = jump, now = start; const input = { state: { x: 0, y: axis }, consume: (k) => k === 'jump' && takeJump ? (takeJump = false, true) : false, held: () => false };
  for (let i = 0; i < frames; i++) g.update(.016, input, now += 16);
  return now;
}

test('exact generated v4 witness digs at ramp height, walks in and jumps back, then real Game reload replays it', () => {
  const g = witness(), r = g.digAhead(); assert.equal(r.ok, true, r.message);
  const target = g.map.tiles[26 * g.map.width + 18]; assert.deepEqual([target.elev, target.slope], [2, false]); assert.equal(elevationAt(g.map, g.map.width, 18, 26), 2);
  const now = drive(g, 1, 25); assert.ok(g.player.y > 25.7, g.player.y); g.save.digging.peer = { nested: 'kept' }; g.save.digging.surfaces[witnessId]['18,26'].unknown = { nested: true };
  const loaded = new Game(deserializeSave(serializeSave(g.exportSnapshot(now))), now + 1000); loaded.enemies = [];
  assert.equal(loaded.areaStateId(), witnessId); assert.equal(loaded.map.tiles[26 * loaded.map.width + 18].elev, 2); assert.deepEqual(loaded.save.digging.surfaces[witnessId]['18,26'], { version: DIG.surface.version, elev: 2, unknown: { nested: true } }); assert.deepEqual(loaded.save.digging.peer, { nested: 'kept' });
  const loadedHp = loaded.player.hp; drive(loaded, -1, 35, true, now + 1000); assert.ok(loaded.player.y < 25.25, loaded.player.y); assert.equal(loaded.player.hp, loadedHp, 'the repaired return after reload is not a fall');
});

test('the exact generated witness stays at historical elevation for a coordinate-only legacy tunnel', () => {
  const s = freshSave(); s.seed = 'DIG-AUDIT0'; ensureDigging(s); s.digging.dug[witnessId] = ['18,26']; s.session.activeDungeonId = witnessId;
  const g = witness(migrateSave(JSON.parse(JSON.stringify(s)))); assert.equal(g.map.tiles[26 * g.map.width + 18].tunnel, true); assert.equal(g.map.tiles[26 * g.map.width + 18].elev, 0); assert.equal(g.save.digging.surfaces, undefined);
});

test('actual Game preflight refuses source build, out-of-policy support and area cap before spending or rewards', () => {
  for (const [label, arrange] of [
    ['source build', (g) => { g.map.tiles[25 * g.map.width + 18].build = 'stone'; }],
    ['out-of-range support', (g) => { g.map.tiles[25 * g.map.width + 18].elev = DIG.surface.maxElev + 1; }],
    ['area cap', (g) => { g.save.digging.dug[witnessId] = Array.from({ length: DIG.maxTunnelsPerArea }, (_, i) => `${i},1`); }],
  ]) {
    const g = witness(); g.save.digging.shovel = label === 'area cap' ? 0 : 1; arrange(g); const target = g.map.tiles[26 * g.map.width + 18], terrain = { ...target }, state = JSON.stringify({ materials: g.save.materials, shovel: g.save.digging.shovel, iron: g.save.digging.iron, dug: g.save.digging.dug, surfaces: g.save.digging.surfaces, currency: g.save.currency, inventory: g.save.inventory });
    const r = g.digAhead(); assert.equal(r?.ok, false, label); assert.deepEqual(g.map.tiles[26 * g.map.width + 18], terrain, label); assert.equal(JSON.stringify({ materials: g.save.materials, shovel: g.save.digging.shovel, iron: g.save.digging.iron, dug: g.save.digging.dug, surfaces: g.save.digging.surfaces, currency: g.save.currency, inventory: g.save.inventory }), state, label);
  }
});

test('a south-ramp high edge is recorded exactly and replayed without the old two-level return lip', () => {
  const m = heightMap({ elev: 2, slope: true, rampDir: 'south' }), s = save(), p = planDig(m, 3, 3, 'down', key);
  assert.equal(p.ok, true); assert.deepEqual(p.surface, { version: 1, elev: 2 });
  assert.equal(dig(s, m, p, key).ok, true); assert.equal(m.tiles[4 * 7 + 3].elev, 2); assert.equal(m.tiles[4 * 7 + 3].slope, false);
  assert.deepEqual(s.digging.surfaces[key]['3,4'], { version: 1, elev: 2 });
  const replay = heightMap({ elev: 2, slope: true, rampDir: 'south' }); applyTunnels(replay, s, key); assert.equal(replay.tiles[4 * 7 + 3].elev, 2);
});

test('all ramp approaches preserve high, low and fractional side-edge support', () => {
  const cases = [['south', 'down', 2], ['north', 'down', 1], ['east', 'down', 1.5], ['west', 'down', 1.5]];
  for (const [rampDir, facing, expected] of cases) {
    const m = heightMap({ elev: 2, slope: true, rampDir }), p = planDig(m, 3, 3, facing, key);
    assert.equal(p.ok, true, rampDir); assert.equal(p.surface.elev, expected, rampDir); assert.equal(validateDigPlan(save(), m, p, key).ok, true);
  }
});

test('chains inherit the preceding dug surface and the fourth block remains beyond reach', () => {
  const m = heightMap({ elev: 2, slope: true, rampDir: 'south' }), s = save();
  for (let y = 4; y <= 5; y++) { m.tiles[y * 7 + 3] = tile(3, y, { kind: 'wall', blocked: true }); const p = planDig(m, 3, y - 1, 'down', key); assert.equal(p.ok, true); assert.equal(p.surface.elev, 2); assert.equal(dig(s, m, p, key).ok, true); }
  // A wider fixture makes the depth refusal explicit without conflating it with the map edge.
  const wide = heightMap({ elev: 2, slope: true, rampDir: 'south' }); wide.height = 9;
  for (let y = 7; y < 9; y++) for (let x = 0; x < 7; x++) wide.tiles.push(tile(x, y, x === 0 || x === 6 || y === 8 ? { kind: 'wall', blocked: true } : {}));
  for (let y = 4; y <= 7; y++) for (let x = 1; x <= 5; x++) wide.tiles[y * 7 + x] = tile(x, y, { kind: 'wall', blocked: true });
  const q = save(); for (let y = 4; y <= 6; y++) dig(q, wide, planDig(wide, 3, y - 1, 'down', key), key);
  assert.match(planDig(wide, 3, 6, 'down', key).reason, /3 blocks/);
});

test('surface metadata round-trips, preserves siblings, and legacy coordinates keep historical wall elevation', () => {
  const s = save(), m = heightMap({ elev: 2, slope: true, rampDir: 'south' }); dig(s, m, planDig(m, 3, 3, 'down', key), key);
  s.digging.extra = { future: true }; s.digging.surfaces[key]['3,4'].future = 'kept';
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.digging.extra, { future: true }); assert.equal(back.digging.surfaces[key]['3,4'].future, 'kept');
  const replay = heightMap({ elev: 2, slope: true, rampDir: 'south' }); applyTunnels(replay, back, key); assert.equal(replay.tiles[4 * 7 + 3].elev, 2);
  const legacy = save(); legacy.digging.dug[key] = ['3,4']; const old = heightMap({ elev: 2, slope: true, rampDir: 'south' }); applyTunnels(old, legacy, key); assert.equal(old.tiles[4 * 7 + 3].elev, 0, 'coordinate-only saves retain historical geometry');
});

test('malformed, future and orphan metadata normalize safely without synthesizing legacy records', () => {
  const s = save(); s.digging = { ...s.digging, mystery: 7, dug: { [key]: ['3,4'] }, surfaces: { [key]: { '3,4': { version: 1, elev: 9 }, '2,2': { version: 1, elev: 2 } } } };
  ensureDigging(s); assert.equal(s.digging.mystery, 7); assert.deepEqual(s.digging.surfaces, {});
  const future = save(); future.digging.dug[key] = ['3,4']; future.digging.surfaces = { [key]: { '3,4': { version: 2, elev: 99, opaque: true } } }; ensureDigging(future); assert.equal(future.digging.surfaces[key]['3,4'].opaque, true);
  const legacy = save(); delete legacy.digging.surfaces; ensureDigging(legacy); assert.equal('surfaces' in legacy.digging, false);
});

test('unsupported surface metadata is ignored byte-for-byte by historical replay geometry', () => {
  for (const [label, surface, heightfield, overworld] of [
    ['invalid known', { version: DIG.surface.version, elev: DIG.surface.maxElev + 1 }, true, false],
    ['future', { version: DIG.surface.version + 1, elev: 2 }, true, false],
    ['legacy map', { version: DIG.surface.version, elev: 2 }, false, false],
    ['overworld', { version: DIG.surface.version, elev: 2 }, true, true],
  ]) {
    const m = heightMap({ elev: 2, slope: true, rampDir: 'south' }, { rampDir: 'north', slope: true }), control = structuredClone(m); if (!heightfield) { delete m.interiorTerrain; delete control.interiorTerrain; }
    const s = save(); s.digging.dug[key] = ['3,4']; s.digging.surfaces = { [key]: { '3,4': surface } }; applyTunnels(m, s, key, overworld);
    const legacy = save(); legacy.digging.dug[key] = ['3,4']; applyTunnels(control, legacy, key, overworld);
    assert.deepEqual(m.tiles[4 * 7 + 3], control.tiles[4 * 7 + 3], label);
  }
});

test('stale plans, builds and caps reject atomically; temporary heightfield digs do not persist', () => {
  for (const mutate of [
    (m) => { m.tiles[3 * 7 + 3].elev = 1; },
    (m) => { m.tiles[3 * 7 + 3].build = 'stone'; },
    (m) => { m.tiles[4 * 7 + 3].build = 'stone'; },
  ]) {
    const m = heightMap({ elev: 2, slope: true, rampDir: 'south' }), s = save(), p = planDig(m, 3, 3, 'down', key), before = JSON.stringify(s); mutate(m);
    assert.equal(dig(s, m, p, key).ok, false); assert.equal(JSON.stringify(s), before); assert.equal(m.tiles[4 * 7 + 3].blocked, true);
  }
  const capped = save(); capped.digging.dug[key] = Array.from({ length: DIG.maxTunnelsPerArea }, (_, i) => `${i},1`); const cm = heightMap({ elev: 2, slope: true, rampDir: 'south' }), cp = planDig(cm, 3, 3, 'down', key), before = JSON.stringify(capped); assert.equal(dig(capped, cm, cp, key).ok, false); assert.equal(JSON.stringify(capped), before);
  const temp = save(), tm = heightMap({ elev: 2, slope: true, rampDir: 'south' }), tp = planDig(tm, 3, 3, 'down', 'hunt-instance:x'); assert.equal(dig(temp, tm, tp, 'hunt-instance:x').ok, true); assert.equal(temp.digging.dug['hunt-instance:x'], undefined); assert.equal(temp.digging.surfaces, undefined);
});

