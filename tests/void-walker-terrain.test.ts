// Authorized new regression file: permanent Supernova terrain, without changing any existing test contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VOID_SCARS, ensureVoidScars, consumeVoidTerrain, applyVoidScars } from '../src/world-beasts.ts';
import { freshSave, migrateSave, SAVE_VERSION } from '../src/types.ts';
import { footprintOpen, footprintHazard, relocateIfStranded } from '../src/game.ts';
import { generateDeepV2Dungeon, deepV2Id } from '../src/deep-dungeons.ts';
import { generatePinnedDungeon } from '../src/game.ts';
import { snapshotSave } from '../src/persistence.ts';

const key = 'dungeon:VOID-TERRAIN:g1:5:5:hollow';
function room(width = 18, height = 13) {
  return { width, height, entry: { x: 2, y: 2 }, objects: [], enemySpawns: [],
    tiles: Array.from({ length: width * height }, (_, i) => {
      const x = i % width, y = Math.floor(i / width), blocked = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      return { x, y, kind: blocked ? 'wall' : 'floor', blocked, elev: 0 };
    }) };
}
const tile = (map, x, y) => map.tiles[y * map.width + x];
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

test('a dungeon Supernova consumes room walls and pits into safe, distinctive floor with no old metadata', () => {
  const save = freshSave(), map = divided();
  Object.assign(tile(map, 7, 5), { environment: 'lava', pit: true, volcanic: true, wallSides: ['north'], tunnel: true, oddMetadata: 42 });
  const result = consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
  assert.equal(result.ok, true, result.reason); assert.ok(result.changed > 15);
  for (const [x, y] of [[5, 5], [7, 5], [8, 5]]) {
    const t = tile(map, x, y);
    assert.equal(t.kind, 'voidScar'); assert.equal(t.blocked, false); assert.equal(t.elev, 0);
    assert.equal(footprintOpen(map, map.width, x, y), true); assert.equal(footprintHazard(map, map.width, x, y), null);
    assert.deepEqual(Object.keys(t).sort(), ['blocked', 'detail', 'elev', 'kind', 'slope', 'voidScar', 'x', 'y']);
  }
  assert.ok(save.voidScars.areas[key].cells.includes('7,5'));
  assert.equal(tile(map, 0, 5).blocked, true);
});

test('scar persistence is additive schema 14, preserving unknown fields and exact converted positions', () => {
  const save = freshSave(), map = divided(); save.voidScars.futureRoot = { kept: true };
  consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
  save.voidScars.areas[key].futureArea = 'retained'; save.currency = 171;
  const copied = snapshotSave(save, 100), migrated = migrateSave(JSON.parse(JSON.stringify(copied))), restored = divided();
  assert.equal(SAVE_VERSION, 14); assert.equal(migrated.version, 14); assert.equal(migrated.currency, 171);
  assert.deepEqual(migrated.voidScars, save.voidScars);
  assert.equal(applyVoidScars(migrated, restored, key).ok, true);
  assert.deepEqual(restored.tiles, map.tiles);
  assert.deepEqual(freshSave().voidScars, { schema: 1, areas: {} });
});

test('area and level keys never share scars, and map dimensions cannot reinterpret stored coordinates', () => {
  const save = freshSave(), map = divided(), level = `${key}:level:lower`;
  consumeVoidTerrain(save, map, level, { x: 7, y: 5 }, 3);
  for (const other of [key, `${key}:level:upper`, `${key}-other`]) {
    const untouched = divided(), before = structuredClone(untouched.tiles);
    assert.equal(applyVoidScars(save, untouched, other).changed, 0); assert.deepEqual(untouched.tiles, before);
  }
  assert.equal(applyVoidScars(save, room(19, 13), level).reason, 'geometry-mismatch');
  assert.equal(applyVoidScars(save, divided(), level).ok, true);
});

test('repeated and overlapping consumption and replay are idempotent without evicting old scars', () => {
  const save = freshSave(), map = divided(), center = { x: 7, y: 5 };
  consumeVoidTerrain(save, map, key, center, 3);
  const before = structuredClone(save.voidScars), ref = tile(map, 7, 5);
  assert.equal(consumeVoidTerrain(save, map, key, center, 3).changed, 0);
  assert.equal(applyVoidScars(save, map, key).changed, 0); assert.equal(tile(map, 7, 5), ref);
  assert.deepEqual(save.voidScars, before);
  consumeVoidTerrain(save, map, key, { x: 10, y: 5 }, 3);
  for (const p of before.areas[key].cells) assert.ok(save.voidScars.areas[key].cells.includes(p));
});

test('objects, inventory/items, actors and their occupied floor stay untouched; only terrain changes', () => {
  const save = freshSave(), map = room();
  map.objects = [{ id: 'quest', kind: 'storyRelic', x: 5, y: 5, state: 'ready', actions: ['take'] }, { id: 'return', kind: 'exit', x: 7, y: 5, toX: 7, toY: 6, state: 'open' }];
  map.items = [{ id: 'loot', x: 4, y: 4, value: 100 }];
  const actors = [{ id: 'player', x: 6.3, y: 5.2, hp: 55 }, { id: 'enemy', x: 8, y: 6, hp: 90 }];
  const before = structuredClone({ objects: map.objects, items: map.items, actors, inventory: save.inventory });
  const occupiedTile = tile(map, 5, 5);
  const result = consumeVoidTerrain(save, map, key, { x: 6, y: 5 }, 4, actors);
  assert.equal(result.ok, true); assert.ok(result.protected.includes('5,5')); assert.equal(tile(map, 5, 5), occupiedTile);
  assert.deepEqual({ objects: map.objects, items: map.items, actors, inventory: save.inventory }, before);
  for (const a of actors) assert.equal(relocateIfStranded(a, map, map.width), false);
});

test('saved scar replays beneath a subsequently moved object or actor without changing their position', () => {
  const save = freshSave(), map = divided(); consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
  const restored = divided(), player = { x: 7.2, y: 5.1 };
  restored.objects.push({ id: 'wanderer', kind: 'traveler', x: 7, y: 5, state: 'walking' });
  const original = structuredClone(restored.objects);
  assert.equal(applyVoidScars(save, restored, key).ok, true);
  assert.equal(relocateIfStranded(player, restored, restored.width), false);
  assert.deepEqual(player, { x: 7.2, y: 5.1 }); assert.deepEqual(restored.objects, original);
});

test('no permanent overworld deletion, even if a malformed save includes matching scar keys', () => {
  const save = freshSave(), map = divided(), before = structuredClone(map);
  assert.equal(consumeVoidTerrain(save, map, 'overworld:5:5:g1', { x: 7, y: 5 }, 3).reason, 'unsupported-area');
  save.voidScars.areas['overworld:5:5:g1'] = { width: map.width, height: map.height, elevation: 0, cells: ['7,5'] };
  assert.equal(applyVoidScars(save, map, 'overworld:5:5:g1').reason, 'unsupported-area'); assert.deepEqual(map, before);
});

test('gate and shortcut collisions refuse the whole proposed region, openly and without partial mutations', () => {
  for (const fixture of ['gate', 'shortcut']) {
    const save = freshSave(), map = room();
    map.objects.push(fixture === 'gate' ? { id: 'gate', kind: 'sealedGate', x: 8, y: 5, state: 'sealed', blocked: true } : { id: 'shortcut', kind: 'deepShortcut', x: 8, y: 5, cells: [{ x: 7, y: 5 }, { x: 8, y: 5 }] });
    wall(map, 8, 5); const before = structuredClone(map);
    const result = consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 3);
    assert.equal(result.ok, false); assert.equal(result.reason, 'protected-region'); assert.ok(result.rejected.length);
    assert.equal(result.changed, 0); assert.deepEqual(map, before); assert.equal(save.voidScars.areas[key], undefined);
  }
});

test('a bulk disk cannot connect disconnected rooms around an untouched gate', () => {
  const save = freshSave(), map = room(20, 16);
  for (let x = 1; x < map.width - 1; x++) wall(map, x, 7);
  Object.assign(tile(map, 16, 7), { kind: 'sealedGate', gateId: 'sealed' });
  map.objects.push({ id: 'sealed', kind: 'sealedGate', x: 16, y: 7, state: 'sealed' });
  const before = structuredClone(map), result = consumeVoidTerrain(save, map, key, { x: 6, y: 7 }, 3);
  assert.equal(result.reason, 'disconnected-regions'); assert.ok(result.rejected.length);
  assert.deepEqual(map, before); assert.equal(reach(map).has('6,10'), false);
});

test('real Threefold gate geometry stays sealed; saved malformed bypass batches are refused too', () => {
  const save = freshSave(), id = deepV2Id('VOID-PROTECT', 1, 3, -3, 'threefold'), map = generateDeepV2Dungeon('VOID-PROTECT', id);
  const boss = map.enemySpawns.find((e) => e.dungeonRole === 'finalBoss'), before = structuredClone(map.tiles);
  const result = consumeVoidTerrain(save, map, id, map.finalGate, 7);
  assert.equal(result.ok, false); assert.deepEqual(map.tiles, before); assert.equal(reach(map).has(`${boss.x},${boss.y}`), false);
  // Exclude the gate and its halo, just as a naive "protect gate tiles" implementation would.
  const cells = map.tiles.filter((t) => t.blocked && /wall/i.test(t.kind) && Math.hypot(t.x - map.finalGate.x, t.y - map.finalGate.y) <= 7 && !map.finalGateTiles.some((p) => Math.abs(p.x - t.x) <= 1 && Math.abs(p.y - t.y) <= 1)).map((t) => `${t.x},${t.y}`);
  save.voidScars.areas[id] = { width: map.width, height: map.height, elevation: 0, cells };
  assert.equal(applyVoidScars(save, map, id).reason, 'disconnected-regions'); assert.deepEqual(map.tiles, before);
});

test('uniform scar elevation never creates a trap beside untouched raised ground', () => {
  const save = freshSave(), map = room(), before = structuredClone(map);
  Object.assign(tile(map, 10, 5), { elev: 3 }); before.tiles = structuredClone(map.tiles);
  const result = consumeVoidTerrain(save, map, key, { x: 7, y: 5 }, 2);
  assert.equal(result.reason, 'unsafe-elevation'); assert.deepEqual(map, before);
});

test('normalization rejects bad coordinates, preserves unknown fields, and does not truncate over-budget history', () => {
  const save = freshSave(); save.voidScars = { schema: 1, custom: 99, areas: { [key]: { width: 18, height: 13, elevation: 0, custom: 77, cells: ['7,5', '07,05', 'nope', -1, 'Infinity,1', '3,4', '999,1'] } } };
  ensureVoidScars(save); assert.deepEqual(save.voidScars.areas[key].cells, ['3,4', '7,5']); assert.equal(save.voidScars.custom, 99); assert.equal(save.voidScars.areas[key].custom, 77);
  const tooMany = Array.from({ length: VOID_SCARS.maxAreaCells + 1 }, () => '7,5'); save.voidScars.areas[key].cells = tooMany;
  ensureVoidScars(save); assert.equal(save.voidScars.areas[key].cells, tooMany);
  assert.equal(applyVoidScars(save, divided(), key).reason, 'capacity-or-record');
  assert.equal(consumeVoidTerrain(save, divided(), key, { x: 7, y: 5 }, 3).reason, 'capacity-or-record');
});

test('capacity exhaustion refuses new changes while retaining every old scar', () => {
  const save = freshSave(), map = room(140, 140), cells = Array.from({ length: VOID_SCARS.maxAreaCells }, (_, i) => `${1 + i % 138},${1 + Math.floor(i / 138)}`);
  save.voidScars.areas[key] = { width: 140, height: 140, elevation: 0, cells };
  const before = structuredClone(map.tiles), result = consumeVoidTerrain(save, map, key, { x: 135, y: 135 }, 2);
  assert.equal(result.reason, 'area-capacity'); assert.equal(save.voidScars.areas[key].cells.length, VOID_SCARS.maxAreaCells); assert.deepEqual(map.tiles, before);
  for (let i = 0; i <= VOID_SCARS.maxAreas; i++) save.voidScars.areas[`dungeon:extra:${i}`] = { arbitrary: i };
  const rows = Object.keys(save.voidScars.areas).length; ensureVoidScars(save);
  assert.equal(Object.keys(save.voidScars.areas).length, rows);
  assert.equal(consumeVoidTerrain(save, map, key, { x: 135, y: 135 }, 2).reason, 'area-capacity');
  assert.equal(applyVoidScars(save, map, key).ok, true, 'a full global registry must not hide already recorded scars');
});

test('extreme/malformed regions fail boundedly and cannot change terrain or existing records', () => {
  const save = freshSave(), map = room(), before = structuredClone(map);
  for (const [center, radius] of [[{ x: NaN, y: 5 }, 3], [{ x: 5, y: 5 }, Infinity], [{ x: 5, y: 5 }, 1e9], [{ x: -1, y: 5 }, 3], [{ x: 5, y: 5 }, -1]]) assert.equal(consumeVoidTerrain(save, map, key, center, radius).ok, false);
  assert.equal(consumeVoidTerrain(save, { width: 1e9, height: 1e9, tiles: [] }, key, { x: 5, y: 5 }, 3).ok, false);
  assert.equal(consumeVoidTerrain(save, { ...map, objects: {} }, key, { x: 5, y: 5 }, 3).ok, false);
  assert.equal(consumeVoidTerrain(save, { ...map, objects: [null] }, key, { x: 5, y: 5 }, 3).ok, false);
  assert.equal(consumeVoidTerrain(save, map, key, { x: 5, y: 5 }, 3, new Array(VOID_SCARS.maxEntities + 1).fill({ x: 5, y: 5 })).ok, false);
  assert.deepEqual(map, before); assert.deepEqual(save.voidScars.areas, {});
  save.voidScars = { schema: 2, areas: {}, future: true }; ensureVoidScars(save);
  assert.deepEqual(save.voidScars, { schema: 2, areas: {}, future: true }); assert.equal(applyVoidScars(save, map, key).reason, 'capacity-or-schema');
});

test('pinned dungeon generation remains byte-for-byte unchanged by permanent terrain overlays', () => {
  const save = freshSave(); save.seed = 'VOID-PIN';
  const id = 'dungeon:VOID-PIN:g1:5:5:hollow'; save.consequences.dungeons[id] = { generatorVersion: 2, layoutVersion: 0, monsterPack: 0, visits: 1 };
  const base = generatePinnedDungeon(save, id), before = JSON.stringify(base), history = structuredClone(save.consequences.dungeons[id]);
  let consumed = false;
  for (const t of base.tiles) if (!t.blocked && t.x > 2 && t.y > 2) {
    const result = consumeVoidTerrain(save, base, id, t, 1); if (result.ok && result.changed) { consumed = true; break; }
  }
  assert.equal(consumed, true); assert.equal(JSON.stringify(generatePinnedDungeon(save, id)), before);
  assert.deepEqual(save.consequences.dungeons[id], history);
});
