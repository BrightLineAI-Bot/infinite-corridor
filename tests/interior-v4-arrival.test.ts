import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BUILDINGS, generateBuildingFloor } from '../src/great-buildings.ts';
import { generateCompoundFloor } from '../src/compounds.ts';
import { generateCastleFloor } from '../src/castles.ts';
import { generateLabyrinthChamber } from '../src/labyrinths.ts';
import { generatePentagonChamber, pentagonPlan } from '../src/pentagon.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { canStep } from '../src/landscape.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

test('v4 opens the exact upper-floor arrival while v3 remains pinned', () => {
  const id = 'building:AUDIT0:1:1:keep:4:f4', old = generateBuildingFloor('AUDIT0', id, 3), map = generateBuildingFloor('AUDIT0', id, 4);
  const down = map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down');
  assert.deepEqual([down.x, down.y], [6, 5]);
  assert.equal(old.tiles[down.y * old.width + down.x].blocked, true, 'the shipped v3 pin is unchanged');
  const tile = map.tiles[down.y * map.width + down.x]; assert.ok(!tile.blocked && !tile.hole, 'the ladder itself stands on floor');
});

test('v4 down ladders stand on their reachable floor across styles and floors', () => {
  for (let i = 0; i < 50; i++) for (const style of ['keep', 'apartment', 'hive']) for (let floor = 1; floor <= 4; floor++) {
    const seed = `SCAN${i}`, id = `building:${seed}:${i % 11}:${-(i % 13)}:${style}:4:f${floor}`, map = generateBuildingFloor(seed, id, 4);
    const down = map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); if (!down) continue;
    const tile = map.tiles[down.y * map.width + down.x]; assert.ok(!tile.blocked && !tile.hole, id);
    const start = map.entry.y * map.width + map.entry.x, seen = new Set([start]), queue = [start];
    for (let n = 0; n < queue.length; n++) { const at = queue[n], x = at % map.width, y = (at / map.width) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, next = ny * map.width + nx, q = map.tiles[next]; if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || seen.has(next) || !q || q.blocked || q.hole || !canStep({ isPlayer: false }, map, map.width, x, y, nx, ny)) continue; seen.add(next); queue.push(next); } }
    assert.ok(seen.has(down.y * map.width + down.x), `${id}: ladder tile reached on foot`);
  }
});

test('all old interior and Pentagon generator pins retain their bytes', () => {
  const hash = createHash('sha256');
  for (let V = 1; V <= 3; V++) {
    hash.update(JSON.stringify(generateBuildingFloor('PIN', 'building:PIN:1:1:keep:4:f4', V)));
    hash.update(JSON.stringify(generateCompoundFloor('PIN', 'compound:PIN:1:3:keep:t:3:f3', V)));
    hash.update(JSON.stringify(generateCastleFloor('PIN', 'castle:PIN:2:3:k:3:f3', V)));
    hash.update(JSON.stringify(generateLabyrinthChamber('PIN', 'labyrinth:PIN:3:4:keep:f2', V)));
  }
  for (let V = 1; V <= 9; V++) { const plan = pentagonPlan('PIN', 8, -8, V); hash.update(JSON.stringify(generatePentagonChamber('PIN', `${plan.base}:f1`))); }
  assert.equal(hash.digest('hex'), '82cc6a8c78e99447e4c4850c2cd839232f1bc507d68c5ac32127346cc86f9f76');
  assert.equal(BUILDINGS.interior.version, 4);
});

test('v4 dispatch reaches compound, castle and labyrinth arrivals without changing their topology', () => {
  const maps = [
    generateCompoundFloor('PIN', 'compound:PIN:1:3:keep:t:3:f3', 4),
    generateCastleFloor('PIN', 'castle:PIN:2:3:k:3:f3', 4),
    generateLabyrinthChamber('PIN', 'labyrinth:PIN:3:4:keep:f2', 4),
  ];
  for (const map of maps) {
    const entry = map.tiles[map.entry.y * map.width + map.entry.x]; assert.ok(entry && !entry.blocked && !entry.hole, map.id);
    const down = map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down');
    if (down) { const tile = map.tiles[down.y * map.width + down.x]; assert.ok(!tile.blocked && !tile.hole, `${map.id}: down ladder`); }
  }
});

test('normal play climbs and descends a fresh v4 building without changing stair choices', () => {
  const seed = 'AUDIT0', base = `building:${seed}:1:1:keep:4`, save = freshSave(); save.seed = seed;
  save.session.activeDungeonId = `${base}:f3`; save.session.dungeonReturn = { rx: 1, ry: 1, x: 16, y: 16 };
  const game = new Game(save, 0); game.loadArea('dungeon', false);
  assert.equal(game.map.building.interiorVersion, 4);
  const up = game.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); game.player.x = up.x; game.player.y = up.y;
  assert.ok(game.interact('climb', up.id).ok); assert.equal(game.areaId(), `${base}:f4`);
  const down = game.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'), tile = game.map.tiles[down.y * game.map.width + down.x];
  assert.ok(!tile.blocked && !tile.hole); game.player.x = game.map.entry.x; game.player.y = game.map.entry.y;
  assert.ok(game.interact('descend', down.id).ok); assert.equal(game.areaId(), `${base}:f3`);
});

test('the four traversal labs remain quiet through updates and dungeon reloads', () => {
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  for (const scenario of ['terrain-ramps', 'platform-chain', 'indoor-drone', 'terrain-pentagon']) {
    const fixture = createLabFixture({ lab: 'close-view', scenario, now: 1000 }), game = fixture.game;
    assert.equal(game.enemies.length, 0, scenario); assert.ok(game.map.enemySpawns.length > 0, `${scenario}: production spawns preserved`);
    for (let i = 0; i < 20; i++) game.update(.016, idle, 1016 + i * 16);
    assert.equal(game.enemies.length, 0, `${scenario}: quiet after updates`);
    game.loadArea('dungeon', false); assert.equal(game.enemies.length, 0, `${scenario}: quiet after reload`);
  }
});
