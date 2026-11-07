import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BUILDINGS, generateBuildingFloor } from '../src/great-buildings.ts';
import { interiorTerrainSignature, interiorTileLevel, canStep } from '../src/landscape.ts';
import { PENTAGON, generatePentagonChamber, pentagonFinaleSpot, pentagonLinkEnds, pentagonPlan, pentagonVaultId } from '../src/pentagon.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function baselineReach(map) {
  const W = map.width, H = map.height, start = Math.round(map.entry.y) * W + Math.round(map.entry.x);
  const seen = new Set([start]), queue = [start], walker = { isPlayer: false };
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy, n = ny * W + nx, tile = map.tiles[n];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(n) || !tile || tile.blocked || tile.hole) continue;
      if (!canStep(walker, map, W, x, y, nx, ny)) continue;
      seen.add(n); queue.push(n);
    }
  }
  return seen;
}

function objectReached(map, seen, object) {
  const W = map.width, x = Math.round(object.x), y = Math.round(object.y), k = y * W + x;
  if (seen.has(k)) return true;
  return N4.some(([dx, dy]) => seen.has((y + dy) * W + x + dx));
}

test('current building interiors have deterministic bounded heightfields, cardinal ramps and optional jump chains', () => {
  assert.equal(BUILDINGS.interior.version, 4);
  let platforms = 0;
  for (let i = 0; i < 30; i++) {
    const seed = `IT${i}`, id = `building:${seed}:${i}:-${i}:keep:4:f2`;
    const a = generateBuildingFloor(seed, id, 4), b = generateBuildingFloor(seed, id, 4);
    assert.equal(interiorTerrainSignature(a), interiorTerrainSignature(b), id);
    assert.deepEqual(a.interiorTerrain, { version: 1, maxLevel: 5 });
    assert.ok(a.tiles.every((t) => Number.isFinite(t.elev) && t.elev >= 0 && t.elev <= 5));
    assert.ok(a.tiles.filter((t) => t.slope).every((t) => ['north', 'east', 'south', 'west'].includes(t.rampDir)));
    const chain = a.tiles.filter((t) => t.interiorPlatform); platforms += chain.length > 0;
    if (chain.length) {
      assert.deepEqual([...new Set(chain.map((t) => t.elev))].sort(), [1, 2, 3]);
      const steps = chain.filter((t) => t.y === Math.min(...chain.map((q) => q.y))).sort((x, y) => x.x - y.x);
      for (let j = 1; j < steps.length; j++) assert.ok(canStep({ isPlayer: true, jumping: true }, a, a.width, steps[j - 1].x, steps[j - 1].y, steps[j].x, steps[j].y));
    }
  }
  assert.ok(platforms > 0, 'the deterministic sample includes optional jump chains');
});

test('all cardinal ramp directions interpolate from elev - 1 to the declared high endpoint', () => {
  for (const [rampDir, low, high] of [
    ['east', [4, 7.5], [5, 7.5]], ['west', [5, 7.5], [4, 7.5]],
    ['south', [4.5, 7], [4.5, 8]], ['north', [4.5, 8], [4.5, 7]],
  ]) {
    const tile = { x: 4, y: 7, elev: 3, slope: true, rampDir };
    assert.equal(interiorTileLevel(tile, ...low), 2, `${rampDir} low end`);
    assert.equal(interiorTileLevel(tile, ...high), 3, `${rampDir} high end`);
  }
});

test('ramps preserve every mandatory route on foot, including boundary doors', () => {
  for (let i = 0; i < 40; i++) {
    const seed = `IR${i}`, id = `building:${seed}:${i % 9}:${-i}:apartment:4:f${1 + i % 4}`;
    const map = generateBuildingFloor(seed, id, 4), seen = baselineReach(map);
    for (const object of map.objects.filter((o) => o.actions?.length)) assert.ok(objectReached(map, seen, object), `${id}: ${object.id}`);
  }
});

test('legacy building and Pentagon versions retain their pinned generator bytes', () => {
  const building = 'building:TERRAINPIN:4:-3:keep:4:f2';
  assert.equal(digest(generateBuildingFloor('TERRAINPIN', building, 1)), '22579af881f01efe553a8bcce47110f16b53b446811f3e48452acf95f7f871bb');
  assert.equal(digest(generateBuildingFloor('TERRAINPIN', building, 2)), '0d456c9a94357d25257d0ccd86b1aaf0f03f21f84f322cf744a7cee666d0fcd7');
  for (const [V, expected] of [[7, 'cc99799c33d1442f847454e08eeb0eb9f05310bfc9a538ad845c861421cdcf27'], [8, '8e12fa16a0de64f818c939c4147884dfbc2edc000b3c516d8f31549817cb6f29']]) {
    const plan = pentagonPlan('TERRAINPIN', 8, -8, V);
    assert.equal(digest(generatePentagonChamber('TERRAINPIN', `${plan.base}:f1`)), expected, `Pentagon v${V}`);
  }
});

test('every fresh v9 vault reserves a reachable, clear finale opening', () => {
  assert.equal(PENTAGON.version, 9);
  for (let i = 0; i < 100; i++) {
    const seed = `IV${i}`, plan = pentagonPlan(seed, i * 8, -i * 8, 9), map = generatePentagonChamber(seed, pentagonVaultId(plan));
    const spot = pentagonFinaleSpot({ ...map, objects: [...map.objects, ...pentagonLinkEnds(plan, map)] });
    assert.ok(spot, `${map.id}: finale opening`);
  }
});

test('an indoor drone lift pauses and restores only in the same generated floor; malformed runtime is dropped at schema 14', () => {
  const seed = 'IDRONE', id = `building:${seed}:4:-3:keep:4:f2`, save = freshSave();
  save.seed = seed; save.session.activeDungeonId = id; save.session.dungeonReturn = { rx: 4, ry: -3, x: 16, y: 16 };
  (save.consequences.dungeons[id] ||= {}).interiorVersion = 4;
  save.mech = { ...(save.mech || {}), built: true, active: true, mode: 'drone', fuel: 20 };
  const game = new Game(save, 0); game.loadArea('dungeon', false); game.player.x = game.map.entry.x; game.player.y = game.map.entry.y;
  const runtime = { base: 0, z: .5, vz: .2, area: 'dungeon', areaId: id, levelId: String(game.map.levelId || 'root') };
  assert.ok(game.restoreDroneLift(runtime, 100)); const paused = game.exportSnapshot(100);
  assert.deepEqual(paused.session.playerRuntime.droneLift, runtime);
  const resumed = new Game(deserializeSave(serializeSave(paused)), 200);
  assert.equal(resumed.areaId(), id); assert.deepEqual(resumed.droneLift, { base: 0, z: .5, vz: .2 });
  const wrong = { ...runtime, areaId: `${id}-elsewhere` }; assert.equal(resumed.restoreDroneLift(wrong, 300), false); assert.equal(resumed.droneLift, null);
  const bad = freshSave(); bad.session.playerRuntime = { droneLift: { base: 'bad', z: 2, vz: 0, area: 'dungeon', areaId: id, levelId: 'root' } };
  const migrated = migrateSave(JSON.parse(JSON.stringify(bad))); assert.equal(migrated.version, 14); assert.equal(migrated.session.playerRuntime.droneLift, null);
});
