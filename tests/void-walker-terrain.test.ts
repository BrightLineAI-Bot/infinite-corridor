// Authorized new regression file: permanent Supernova terrain, without changing any old test contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VOID_SCARS, ensureVoidScars, consumeVoidTerrain, applyVoidScars, worldBeastsLost } from '../src/world-beasts.ts';
import { freshSave, migrateSave, SAVE_VERSION } from '../src/types.ts';
import { footprintOpen, footprintHazard, relocateIfStranded, generatePinnedDungeon, applyDeepDungeonProgress } from '../src/game.ts';
import { generateDeepV2Dungeon, deepV2Id } from '../src/deep-dungeons.ts';
import { canStep } from '../src/landscape.ts';
import { snapshotSave } from '../src/persistence.ts';

const key = 'dungeon:VOID-TERRAIN:g1:5:5:hollow', surfaceKey = 'overworld:5:5:g1';
function room(width = 18, height = 13) {
  return { width, height, entry: { x: 2, y: 2 }, objects: [], enemySpawns: [],
    tiles: Array.from({ length: width * height }, (_, i) => {
      const x = i % width, y = Math.floor(i / width), blocked = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      return { x, y, kind: blocked ? 'wall' : 'floor', blocked, elev: 0 };
    }) };
}
const tile = (map, x, y) => map.tiles[y * (map.width || 32) + x];
function wall(map, x, y, fields = {}) { Object.assign(tile(map, x, y), { kind: 'wall', blocked: true }, fields); }
function divided() {
  const map = room();
  for (let y = 1; y < map.height - 2; y++) for (const x of [7, 8]) wall(map, x, y);
  Object.assign(tile(map, 5, 5), { kind: 'abyss', blocked: true, environment: 'abyss', pit: true, elev: 5 });
  return map;
}
function reach(map, from = map.entry) {
  const seen = new Set(), queue = [from];
  for (let q = 0; q < queue.length; q++) {
    const { x, y } = queue[q], k = `${x},${y}`;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height || seen.has(k) || tile(map, x, y).blocked) continue;
    seen.add(k); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: x + dx, y: y + dy });
  }
  return seen;
}
function assertScar(t) {
  assert.equal(t.kind, 'voidScar'); assert.equal(t.blocked, false); assert.equal(t.voidScar, true);
  assert.deepEqual(Object.keys(t).sort(), ['blocked', 'detail', 'elev', 'kind', 'slope', 'voidScar', 'x', 'y']);
}

test('a dungeon Supernova consumes room walls and pits into safe, distinctive floor with no old metadata', () => {
  const save = freshSave(), map = divided();
  Object.assign(tile(map, 7, 5), { environment: 'lava', pit: true, volcanic: true, wallSides: ['north'], tunnel: true, oddMetadata: 42 });
  const result = consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
  assert.equal(result.ok, true, result.reason); assert.ok(result.changed > 15);
  for (const [x, y] of [[5, 5], [7, 5], [8, 5]]) {
    const t = tile(map, x, y); assertScar(t); assert.equal(t.elev, 0);
    assert.equal(footprintOpen(map, map.width, x, y), true); assert.equal(footprintHazard(map, map.width, x, y), null);
  }
  assert.ok(save.voidScars.areas[key].cells.includes('7,5')); assert.equal(tile(map, 0, 5).blocked, true);
});

test('the whole circular footprint is consumed without a square halo or occupied-floor holes', () => {
  const save = freshSave(), map = divided(), before = structuredClone(map.tiles), center = { x: 7.4, y: 5.3 }, radius = 3.6;
  map.objects.push({ id: 'relic', kind: 'storyRelic', x: 7, y: 5, state: 'ready' });
  const result = consumeVoidTerrain(save, map, key, center, radius, [{ x: 8, y: 6 }]);
  assert.equal(result.ok, true); assert.deepEqual(result.protected, []); assert.deepEqual(result.rejected, []);
  let count = 0;
  for (let i = 0; i < map.tiles.length; i++) {
    const t = map.tiles[i];
    const dx = Math.max(t.x - center.x, 0, center.x - t.x - 1), dy = Math.max(t.y - center.y, 0, center.y - t.y - 1);
    if (Math.hypot(dx, dy) < radius) { assertScar(t); count++; }
    else assert.deepEqual(t, before[i]);
  }
  assert.equal(result.changed, count); assert.equal(save.voidScars.areas[key].cells.length, count);
});

test('scar persistence is additive schema 14, preserving unknown fields, heights and exact converted positions', () => {
  const save = freshSave(), map = divided(); save.voidScars.futureRoot = { kept: true };
  Object.assign(tile(map, 6, 5), { elev: 3, slope: true });
  consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
  save.voidScars.areas[key].futureArea = 'retained'; save.currency = 171;
  const copied = snapshotSave(save, 100), migrated = migrateSave(JSON.parse(JSON.stringify(copied))), restored = divided();
  assert.equal(SAVE_VERSION, 14); assert.equal(migrated.version, 14); assert.equal(migrated.currency, 171);
  assert.deepEqual(migrated.voidScars, save.voidScars);
  assert.equal(applyVoidScars(migrated, restored, key).ok, true); assert.deepEqual(restored.tiles, map.tiles);
  assert.equal(tile(restored, 6, 5).elev, 3); assert.equal(tile(restored, 6, 5).slope, true);
  assert.deepEqual(freshSave().voidScars, { schema: 1, areas: {} });
});

test('area and level keys never share scars, and map dimensions cannot reinterpret stored coordinates', () => {
  const save = freshSave(), map = divided(), level = `${key}:level:lower`;
  consumeVoidTerrain(save, map, level, { x: 7, y: 5 }, 3);
  for (const other of [key, `${key}:level:upper`, `${key}-other`, surfaceKey]) {
    const untouched = divided(), before = structuredClone(untouched.tiles);
    assert.equal(applyVoidScars(save, untouched, other).changed, 0); assert.deepEqual(untouched.tiles, before);
  }
  assert.equal(applyVoidScars(save, room(19, 13), level).reason, 'geometry-mismatch'); assert.equal(applyVoidScars(save, divided(), level).ok, true);
});

test('repeated and overlapping consumption and replay are idempotent without evicting old scars or their heights', () => {
  const save = freshSave(), map = divided(), center = { x: 7, y: 5 };
  Object.assign(tile(map, 6, 5), { elev: 3, slope: true }); consumeVoidTerrain(save, map, key, center, 3);
  const before = structuredClone(save.voidScars), priorTiles = new Map(map.tiles.filter(t => t.voidScar).map(t => [`${t.x},${t.y}`, structuredClone(t)])), ref = tile(map, 7, 5);
  assert.equal(consumeVoidTerrain(save, map, key, center, 3).changed, 0); assert.equal(applyVoidScars(save, map, key).changed, 0);
  assert.equal(tile(map, 7, 5), ref); assert.deepEqual(save.voidScars, before);
  consumeVoidTerrain(save, map, key, { x: 10, y: 5 }, 3);
  for (const p of before.areas[key].cells) { const [x, y] = p.split(',').map(Number); assert.ok(save.voidScars.areas[key].cells.includes(p)); assert.deepEqual(tile(map, x, y), priorTiles.get(p)); }
});

test('objects, actors, rewards, inventory, quest completion and discovery remain unchanged beneath the scar', () => {
  const save = freshSave(), map = room();
  map.objects = [{ id: 'quest', kind: 'storyRelic', x: 5, y: 5, state: 'ready', actions: ['take'] }, { id: 'return', kind: 'exit', x: 7, y: 5, toX: 7, toY: 6, state: 'open' }];
  map.items = [{ id: 'loot', x: 4, y: 4, value: 100 }];
  map.objectives = [{ id: 'objective', x: 8, y: 5, completed: false }];
  save.session.areas[key] = { discovered: ['2,2'], objects: { quest: { state: 'ready' } } };
  const actors = [{ id: 'player', x: 6.3, y: 5.2, hp: 55 }, { id: 'enemy', x: 8, y: 6, hp: 90 }];
  const before = structuredClone({ objects: map.objects, items: map.items, objectives: map.objectives, actors, save });
  const result = consumeVoidTerrain(save, map, key, { x: 6, y: 5 }, 4, actors);
  assert.equal(result.ok, true); assertScar(tile(map, 5, 5)); assert.deepEqual(result.protected, []);
  const expected = { ...before.save, voidScars: save.voidScars };
  assert.deepEqual({ objects: map.objects, items: map.items, objectives: map.objectives, actors, save }, { ...before, save: expected });
  for (const a of actors) assert.equal(relocateIfStranded(a, map, map.width), false);
});

test('saved scar replays beneath a subsequently moved object or actor without changing their position', () => {
  const save = freshSave(), map = divided(); consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
  const restored = divided(), player = { x: 7.2, y: 5.1 };
  restored.objects.push({ id: 'wanderer', kind: 'traveler', x: 7, y: 5, state: 'walking' });
  const original = structuredClone(restored.objects);
  assert.equal(applyVoidScars(save, restored, key).ok, true); assert.equal(relocateIfStranded(player, restored, restored.width), false);
  assert.deepEqual(player, { x: 7.2, y: 5.1 }); assert.deepEqual(restored.objects, original);
});

test('native width-less overworld sections persist wall scars while preserving ocean across reloads', () => {
  const save = freshSave(), map = room(32, 32);
  delete map.width; delete map.height;
  Object.assign(tile(map, 15, 15), { kind: 'districtWall', blocked: false, structure: 'districtWall', buildingId: 'house', wallSides: ['north', 'west'] });
  Object.assign(tile(map, 16, 15), { kind: 'deepOcean', blocked: true, waterDepth: 'deep' });
  map.objects.push({ id: 'house', kind: 'architecturalBuilding', x: 15, y: 15, state: 'quiet', bounds: { x: 15, y: 15, w: 2, h: 2 } });
  const base = structuredClone(map), objects = structuredClone(map.objects);
  assert.equal(consumeVoidTerrain(save, map, surfaceKey, { x: 15, y: 15 }, 4).ok, true);
  assertScar(tile(map, 15, 15)); assert.deepEqual(tile(map, 16, 15), tile(base, 16, 15)); assert.equal(footprintHazard(map, 32, 16, 15), 'deepOcean');
  for (let revisit = 0; revisit < 3; revisit++) {
    const migrated = migrateSave(JSON.parse(JSON.stringify(snapshotSave(save, revisit)))), restored = structuredClone(base);
    assert.equal(applyVoidScars(migrated, restored, surfaceKey).ok, true); assert.deepEqual(restored.tiles, map.tiles); assert.deepEqual(restored.objects, objects);
  }
});

test('gate and shortcut terrain is destroyed without opening or completing the independent quest object', () => {
  for (const fixture of ['gate', 'shortcut']) {
    const save = freshSave(), map = room();
    map.objects.push(fixture === 'gate' ? { id: 'gate', kind: 'sealedGate', x: 8, y: 5, state: 'sealed', blocked: true } : { id: 'shortcut', kind: 'deepShortcut', x: 8, y: 5, state: 'hidden', cells: [{ x: 7, y: 5 }, { x: 8, y: 5 }] });
    wall(map, 8, 5, { gateId: fixture }); const objects = structuredClone(map.objects), result = consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
    assert.equal(result.ok, true); assertScar(tile(map, 8, 5)); assert.deepEqual(map.objects, objects);
  }
});

test('the disk intentionally opens previously disconnected rooms even when a distant gate is still sealed', () => {
  const save = freshSave(), map = room(20, 16);
  for (let x = 0; x < map.width; x++) wall(map, x, 7);
  Object.assign(tile(map, 16, 7), { kind: 'sealedGate', gateId: 'sealed' });
  map.objects.push({ id: 'sealed', kind: 'sealedGate', x: 16, y: 7, state: 'sealed' });
  assert.equal(reach(map).has('6,10'), false);
  const result = consumeVoidTerrain(save, map, key, { x: 6, y: 7 }, 3);
  assert.equal(result.ok, true); assert.equal(reach(map).has('6,10'), true); assert.equal(tile(map, 16, 7).blocked, true); assert.equal(map.objects[0].state, 'sealed');
});

test('real Threefold gate geometry is consumed but wing, story and final completion state never changes', () => {
  const save = freshSave(), id = deepV2Id('VOID-PROTECT', 1, 3, -3, 'threefold'), map = generateDeepV2Dungeon('VOID-PROTECT', id);
  const progress = applyDeepDungeonProgress(save, id, map), before = structuredClone(progress), objects = structuredClone(map.objects);
  const boss = map.enemySpawns.find((e) => e.dungeonRole === 'finalBoss');
  assert.equal(reach(map).has(`${boss.x},${boss.y}`), false);
  assert.equal(consumeVoidTerrain(save, map, id, map.finalGate, 7).ok, true);
  assert.equal(reach(map).has(`${boss.x},${boss.y}`), true); assert.deepEqual(progress, before); assert.deepEqual(map.objects, objects);
  for (const p of map.finalGateTiles) if (Math.hypot(p.x - map.finalGate.x, p.y - map.finalGate.y) <= 7) assertScar(tile(map, p.x, p.y));
  const migrated = migrateSave(JSON.parse(JSON.stringify(save))), restored = generateDeepV2Dungeon('VOID-PROTECT', id);
  applyDeepDungeonProgress(migrated, id, restored); assert.equal(applyVoidScars(migrated, restored, id).ok, true);
  assert.deepEqual(restored.tiles, map.tiles); assert.deepEqual(migrated.consequences.dungeons[id].deep, save.consequences.dungeons[id].deep);
});

test('safe floor height and ramps survive while walls and pits inherit nearest safe floor elevation', () => {
  const save = freshSave(), map = room(); map.landscape = { version: 1 };
  for (const t of map.tiles) if (!t.blocked) t.elev = 4;
  Object.assign(tile(map, 6, 5), { slope: true }); wall(map, 7, 5, { elev: 0 });
  Object.assign(tile(map, 8, 5), { kind: 'abyss', pit: true, blocked: true, elev: 0 });
  assert.equal(consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 2).ok, true);
  for (const [x, y] of [[6, 5], [7, 5], [8, 5]]) { assertScar(tile(map, x, y)); assert.equal(tile(map, x, y).elev, 4); }
  assert.equal(tile(map, 6, 5).slope, true); assert.equal(tile(map, 7, 5).slope, false);
  const restored = room(); assert.equal(applyVoidScars(migrateSave(JSON.parse(JSON.stringify(save))), restored, key).ok, true);
  for (const p of save.voidScars.areas[key].cells) { const [x, y] = p.split(',').map(Number); assert.deepEqual(tile(restored, x, y), tile(map, x, y)); }
});

test('a consumed thin separation between steep floors is traversable without weakening surviving terrain', () => {
  const save = freshSave(), map = room(); map.landscape = { version: 1 };
  wall(map, 7, 5); tile(map, 8, 5).elev = 5;
  assert.equal(consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, .2).ok, true);
  assert.equal(canStep({}, map, map.width, 7, 5, 8, 5), true); assert.equal(canStep({}, map, map.width, 8, 5, 7, 5), true);
  assert.equal(canStep({}, map, map.width, 8, 5, 9, 5), false, 'ordinary five-level steps remain ordinary cliffs');
  wall(map, 7, 6); assert.equal(footprintOpen(map, map.width, 7, 6), false);
  Object.assign(tile(map, 6, 5), { kind: 'lava', blocked: true }); assert.equal(footprintHazard(map, map.width, 6, 5), 'lava');
});

test('normalization rejects bad coordinates, deduplicates and preserves unknown fields', () => {
  const save = freshSave(); save.voidScars = { schema: 1, custom: 99, areas: { [key]: { width: 18, height: 13, elevation: 0, custom: 77, cells: ['7,5', '07,05', 'nope', -1, 'Infinity,1', '3,4', '999,1'], elevations: { '7,5': 4, '3,4': Infinity, '999,1': 5 }, slopes: ['7,5', '07,05', '999,1'] } } };
  ensureVoidScars(save); assert.deepEqual(save.voidScars.areas[key].cells, ['3,4', '7,5']); assert.equal(save.voidScars.custom, 99); assert.equal(save.voidScars.areas[key].custom, 77);
  assert.deepEqual(save.voidScars.areas[key].elevations, { '7,5': 4 }); assert.deepEqual(save.voidScars.areas[key].slopes, ['7,5']);
  save.voidScars.areas[key].cells = new Array(16385).fill('7,5'); ensureVoidScars(save);
  assert.deepEqual(save.voidScars.areas[key].cells, ['7,5'], 'the removed 16K cap must not reject duplicate input');
});

test('legacy schema-1 scar records without height metadata replay exactly at their original level zero', () => {
  const save = freshSave(); save.voidScars = { schema: 1, future: true, areas: { [key]: { width: 18, height: 13, elevation: 0, cells: ['7,5'], custom: 'preserved' } } };
  const map = divided(); for (const t of map.tiles) t.elev = 5;
  const migrated = migrateSave(JSON.parse(JSON.stringify(save))); assert.deepEqual(migrated.voidScars, save.voidScars);
  assert.equal(applyVoidScars(migrated, map, key).ok, true); assertScar(tile(map, 7, 5)); assert.equal(tile(map, 7, 5).elev, 0);
  consumeVoidTerrain(migrated, map, key, { x: 7, y: 5 }, 2); assert.equal(tile(map, 7, 5).elev, 0); assert.equal(migrated.voidScars.areas[key].custom, 'preserved');
});

test('more than 256 marked areas and 16K cells retain every old scar and still accept new scars', () => {
  const save = freshSave(), map = room(140, 140), cells = Array.from({ length: 16384 }, (_, i) => `${i % 140},${Math.floor(i / 140)}`);
  save.voidScars.areas[key] = { width: 140, height: 140, elevation: 0, cells };
  for (let i = 0; i < 300; i++) save.voidScars.areas[`dungeon:extra:${i}`] = { width: 18, height: 13, elevation: 0, cells: ['3,4'], custom: i };
  const original = structuredClone(save.voidScars.areas), result = consumeVoidTerrain(save, map, key, { x: 135, y: 135 }, 2);
  assert.equal(result.ok, true); assert.ok(save.voidScars.areas[key].cells.length > 16384);
  const marked = new Set(save.voidScars.areas[key].cells); for (const p of cells) assert.ok(marked.has(p));
  for (let i = 0; i < 300; i++) assert.deepEqual(save.voidScars.areas[`dungeon:extra:${i}`], original[`dungeon:extra:${i}`]);
  assert.equal(consumeVoidTerrain(save, room(), 'overworld:999:-999:g1', { x: 4, y: 4 }, 2).ok, true);
  const migrated = migrateSave(JSON.parse(JSON.stringify(save))); assert.equal(Object.keys(migrated.voidScars.areas).length, 302);
  assert.equal(applyVoidScars(migrated, map, key).ok, true); assertScar(tile(map, 0, 0)); assertScar(tile(map, 135, 135));
  assert.equal(applyVoidScars(migrated, room(), 'dungeon:extra:0').ok, true);
});

test('the largest supported map can retain one permanent scar for every actual tile', () => {
  const save = freshSave(), map = room(256, 256);
  save.voidScars.areas[key] = { width: 256, height: 256, elevation: 0, cells: map.tiles.map(t => `${t.x},${t.y}`) };
  assert.equal(applyVoidScars(save, map, key).changed, 65536); assert.equal(map.tiles.every(t => t.voidScar), true);
  assert.equal(consumeVoidTerrain(save, map, key, { x: 128, y: 128 }, 7).changed, 0); assert.equal(save.voidScars.areas[key].cells.length, 65536);
});

test('map-edge walls inside the circle are destroyed, but movement and records stay in bounds', () => {
  const save = freshSave(), map = room(), before = structuredClone(map.tiles), center = { x: 0, y: 0 };
  assert.equal(consumeVoidTerrain(save, map, key, center, 3).ok, true);
  assertScar(tile(map, 0, 0)); assertScar(tile(map, 2, 0)); assertScar(tile(map, 0, 2));
  assert.deepEqual(tile(map, 3, 0), before[3]); assert.deepEqual(tile(map, 0, 3), before[3 * map.width]); assert.deepEqual(tile(map, 3, 3), before[3 * map.width + 3]);
  assert.equal(footprintOpen(map, map.width, -1, 0), false); assert.equal(footprintOpen(map, map.width, 0, -1), false);
  for (const p of save.voidScars.areas[key].cells) { const [x, y] = p.split(',').map(Number); assert.ok(x >= 0 && y >= 0 && x < map.width && y < map.height); }
  const restored = room(); assert.equal(applyVoidScars(save, restored, key).ok, true); assert.deepEqual(restored.tiles, map.tiles);
});

test('extreme/malformed regions fail boundedly and cannot change terrain or existing records', () => {
  const save = freshSave(), map = room(), before = structuredClone(map);
  for (const [center, radius] of [[{ x: NaN, y: 5 }, 3], [{ x: 5, y: 5 }, Infinity], [{ x: 5, y: 5 }, 1e9], [{ x: -1, y: 5 }, 3], [{ x: 5, y: 5 }, -1]]) assert.equal(consumeVoidTerrain(save, map, key, center, radius).ok, false);
  assert.equal(consumeVoidTerrain(save, { width: 1e9, height: 1e9, tiles: [] }, key, { x: 5, y: 5 }, 3).ok, false);
  assert.equal(consumeVoidTerrain(save, { ...map, tiles: [null] }, key, { x: 5, y: 5 }, 3).ok, false);
  assert.equal(consumeVoidTerrain(save, map, key, { x: 5, y: 5 }, 3, {}).ok, false);
  assert.equal(consumeVoidTerrain(save, map, '__proto__', { x: 5, y: 5 }, 3).ok, false);
  assert.deepEqual(map, before); assert.deepEqual(save.voidScars.areas, {});
});

test('future schema and malformed oversized imported records are retained without partial terrain mutation', () => {
  const save = freshSave(), map = room(), before = structuredClone(map);
  const cells = new Array(VOID_SCARS.maxMapCells + 1).fill('7,5');
  save.voidScars.areas[key] = { width: 18, height: 13, elevation: 0, cells, future: true };
  ensureVoidScars(save); assert.equal(save.voidScars.areas[key].cells, cells);
  assert.equal(applyVoidScars(save, map, key).reason, 'invalid-record'); assert.equal(consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3).reason, 'invalid-record');
  assert.deepEqual(map, before); assert.equal(save.voidScars.areas[key].cells, cells);
  save.voidScars = { schema: 2, areas: {}, future: true }; ensureVoidScars(save);
  assert.deepEqual(save.voidScars, { schema: 2, areas: {}, future: true }); assert.equal(applyVoidScars(save, map, key).reason, 'unsupported-schema');
});

test('pinned dungeon generation remains byte-for-byte unchanged by permanent terrain overlays', () => {
  const save = freshSave(); save.seed = 'VOID-PIN';
  const id = 'dungeon:VOID-PIN:g1:5:5:hollow'; save.consequences.dungeons[id] = { generatorVersion: 2, layoutVersion: 0, monsterPack: 0, visits: 1 };
  const base = generatePinnedDungeon(save, id), before = JSON.stringify(base), history = structuredClone(save.consequences.dungeons[id]);
  assert.equal(consumeVoidTerrain(save, base, id, { x: 4, y: 5 }, 3).ok, true);
  assert.equal(JSON.stringify(generatePinnedDungeon(save, id)), before); assert.deepEqual(save.consequences.dungeons[id], history);
});


test('continuous world-space circle centers and radii persist exactly, without reconstruction from scar tile centers', () => {
  const save = freshSave(), map = room(), center = { x: 7.12345, y: 5.67891 }, radius = 2.34567;
  const result = consumeVoidTerrain(save, map, key, center, radius);
  assert.equal(result.ok, true); assert.equal(result.visualChanged, true);
  const expected = [{ ...center, radius }];
  assert.deepEqual(save.voidScars.areas[key].circles, expected); assert.deepEqual(map._voidScarCircles, expected); assert.deepEqual(map._voidScarLegacyCells, []);
  assert.notEqual(map._voidScarCircles, save.voidScars.areas[key].circles); assert.notEqual(map._voidScarCircles[0], save.voidScars.areas[key].circles[0]);
  const migrated = migrateSave(JSON.parse(JSON.stringify(snapshotSave(save, 1)))), restored = room();
  assert.equal(applyVoidScars(migrated, restored, key).ok, true);
  assert.deepEqual(restored._voidScarCircles, expected); assert.deepEqual(restored._voidScarLegacyCells, []); assert.deepEqual(restored.tiles, map.tiles);
});

test('exact circle unions are deterministic and overlapping or contained circles neither duplicate nor erase history', () => {
  const circles = [{ x: 7.1, y: 5.2, radius: 2.6 }, { x: 9.4, y: 5.5, radius: 2.1 }], records = [];
  for (const ordered of [circles, [...circles].reverse()]) {
    const save = freshSave(), map = room();
    for (const c of ordered) consumeVoidTerrain(save, map, key, c, c.radius);
    const before = structuredClone(save.voidScars), duplicate = consumeVoidTerrain(save, map, key, circles[0], circles[0].radius);
    assert.equal(duplicate.changed, 0); assert.equal(duplicate.visualChanged, false); assert.deepEqual(save.voidScars, before);
    const contained = consumeVoidTerrain(save, map, key, circles[0], .5);
    assert.equal(contained.changed, 0); assert.equal(contained.visualChanged, false); assert.deepEqual(save.voidScars, before);
    records.push(save.voidScars.areas[key]);
  }
  assert.deepEqual(records[0], records[1]); assert.equal(records[0].circles.length, 2);
  const save = freshSave(), map = room();
  for (const radius of [1, 2, 3]) consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, radius);
  assert.deepEqual(save.voidScars.areas[key].circles, [{ x: 7, y: 5, radius: 3 }], 'a larger exact disk subsumes earlier smaller disks without changing their union');
});

test('a continuous outline change invalidates visuals even when it adds no new collision tile', () => {
  const save = freshSave(), map = room();
  consumeVoidTerrain(save, map, key, { x: 7.5, y: 5.5 }, .1);
  const result = consumeVoidTerrain(save, map, key, { x: 7.5, y: 5.5 }, .2);
  assert.equal(result.changed, 0); assert.equal(result.visualChanged, true); assert.deepEqual(map._voidScarCircles, [{ x: 7.5, y: 5.5, radius: .2 }]);
});

test('a new exact circle preserves older cell-only visual scars through migration and revisit', () => {
  const save = freshSave(), map = room();
  save.voidScars.areas[key] = { width: 18, height: 13, elevation: 0, cells: ['2,2', '3,2'], custom: true };
  applyVoidScars(save, map, key); assert.deepEqual(map._voidScarCircles, []); assert.deepEqual(map._voidScarLegacyCells, ['2,2', '3,2']);
  consumeVoidTerrain(save, map, key, { x: 8.5, y: 5.62 }, 2);
  assert.deepEqual(save.voidScars.areas[key].legacyCells, ['2,2', '3,2']); assert.deepEqual(map._voidScarLegacyCells, ['2,2', '3,2']);
  assert.deepEqual(map._voidScarCircles, [{ x: 8.5, y: 5.62, radius: 2 }]);
  const migrated = migrateSave(JSON.parse(JSON.stringify(save))), restored = room(); applyVoidScars(migrated, restored, key);
  assert.deepEqual(restored._voidScarCircles, map._voidScarCircles); assert.deepEqual(restored._voidScarLegacyCells, map._voidScarLegacyCells); assert.deepEqual(restored.tiles, map.tiles);
});


test('cast-center visual lift survives exact-circle deduplication and reload independently of physical floor heights', () => {
  const save = freshSave(), map = room(); map.landscape = { version: 1 };
  for (const t of map.tiles) t.elev = 4;
  const center = { x: 7.5, y: 5.62, visualLift: 1.36 };
  consumeVoidTerrain(save, map, key, center, 2);
  assert.equal(tile(map, 7, 5).elev, 4); assert.deepEqual(map._voidScarCircles, [{ ...center, radius: 2 }]);
  assert.equal(consumeVoidTerrain(save, map, key, center, 2).visualChanged, false);
  const migrated = migrateSave(JSON.parse(JSON.stringify(save))), restored = room(); applyVoidScars(migrated, restored, key);
  assert.deepEqual(restored._voidScarCircles, [{ ...center, radius: 2 }]); assert.equal(tile(restored, 7, 5).elev, 4);
  assert.equal(consumeVoidTerrain(save, map, key, { ...center, visualLift: .68 }, 2).visualChanged, true);
  assert.equal(save.voidScars.areas[key].circles.length, 2, 'different projected planes are not identical circles');
  const direct = freshSave(); consumeVoidTerrain(direct, room(), key, { x: 7.5, y: 5.62 }, 2);
  assert.equal(direct.voidScars.areas[key].circles[0].visualLift ?? 0, 0);
});


test('sparse or invalid circle metadata normalizes by actual records without scanning an arbitrary array length', () => {
  const save = freshSave(), circles = new Array(1000000000);
  circles[42] = { x: 7.5, y: 5.62, radius: 2, visualLift: 1.36, future: 'preserved' };
  circles[84] = { x: NaN, y: 5, radius: 2 }; circles[85] = { x: 7, y: 5, radius: 2, visualLift: Infinity };
  save.voidScars.areas[key] = { width: 18, height: 13, elevation: 0, cells: ['7,5'], circles };
  ensureVoidScars(save);
  assert.deepEqual(save.voidScars.areas[key].circles, [{ x: 7.5, y: 5.62, radius: 2, visualLift: 1.36, future: 'preserved' }]);
});


test('edge casts stay in their loaded section and never alter neighboring section history', () => {
  const save=freshSave(), west=room(32,32),east=room(32,32),westKey='overworld:5:5:g1',eastKey='overworld:6:5:g1';
  consumeVoidTerrain(save,east,eastKey,{x:.5,y:15.5},2);const eastBefore=structuredClone(save.voidScars.areas[eastKey]),eastTiles=structuredClone(east.tiles);
  consumeVoidTerrain(save,west,westKey,{x:31.5,y:15.5},7);
  assert.deepEqual(save.voidScars.areas[westKey].circles,[{x:31.5,y:15.5,radius:7}]);
  assert.ok(save.voidScars.areas[westKey].cells.every(cell=>{const[x,y]=cell.split(',').map(Number);return x>=0&&x<32&&y>=0&&y<32;}));
  assert.deepEqual(save.voidScars.areas[eastKey],eastBefore);assert.deepEqual(east.tiles,eastTiles);
  const reload=migrateSave(JSON.parse(JSON.stringify(save))),restored=room(32,32);applyVoidScars(reload,restored,westKey);assert.deepEqual(restored.tiles,west.tiles);
});

test('new-journey fresh-save factory starts without scars and never shares old mutable history', () => {
  const old=freshSave(),map=room();old.seed='SAME-SEED';consumeVoidTerrain(old,map,key,{x:7.2,y:5.3},3);
  const oldBefore=structuredClone(old.voidScars),next=freshSave();next.seed=old.seed;const clean=room(),base=structuredClone(clean);
  assert.deepEqual(next.voidScars,{schema:1,areas:{}});assert.equal(applyVoidScars(next,clean,key).changed,0);assert.deepEqual(clean.tiles,base.tiles);
  consumeVoidTerrain(next,clean,key,{x:12,y:5},2);assert.deepEqual(old.voidScars,oldBefore);assert.notEqual(next.voidScars.areas,old.voidScars.areas);
  const restored=room();applyVoidScars(migrateSave(JSON.parse(JSON.stringify(old))),restored,key);assert.deepEqual(restored.tiles,map.tiles);
});

test('casts, replay and ordinary beast bookkeeping do not scan unrelated permanent area records', () => {
  const save=freshSave(),map=room();consumeVoidTerrain(save,map,key,{x:7,y:5},3);
  Object.defineProperty(save.voidScars.areas,'overworld:far:away:g1',{enumerable:true,configurable:true,get(){throw Error('unrelated scar history was scanned');}});
  assert.equal(consumeVoidTerrain(save,map,key,{x:8,y:5},3).ok,true);assert.equal(applyVoidScars(save,map,key).ok,true);
  assert.doesNotThrow(()=>worldBeastsLost(save,'overworld',5,5));
});
