import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureMech } from '../src/vehicle-gates.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const FUTURE = Object.freeze({ added: 'later' });
const readyDrone = (save) => {
  save.mech = { built: true, active: true, mode: 'drone', plate: 60, fuel: 3, cooldown: 0 };
  ensureMech(save);
  return save;
};

test('schema-14 outdoor drone lift keeps unknown runtime fields through migrate, play and export', () => {
  const save = readyDrone(freshSave());
  save.seed = 'DRONE-RUNTIME-OUTDOOR';
  save.futureTop = FUTURE;
  save.session.futureSession = FUTURE;
  save.session.playerRuntime.futureRuntime = FUTURE;
  save.session.playerRuntime.droneLift = { base: '0', z: '1.25', vz: '0', futureLift: FUTURE };
  save.equipment.primary.futureGear = FUTURE;
  save.consequences.dungeons['dungeon:future:g1'] = { discovered: true, visits: 1, abandoned: 0, futureHistory: FUTURE };

  const migrated = migrateSave(structuredClone(save));
  assert.deepEqual(migrated.session.playerRuntime.droneLift.futureLift, FUTURE, 'migration keeps the nested canary');
  const game = new Game(migrated, 1000);
  assert.deepEqual(game.droneLift.futureLift, FUTURE, 'runtime restoration keeps it');
  const out = game.exportSnapshot(1100);

  assert.deepEqual(out.session.playerRuntime.droneLift.futureLift, FUTURE, 'normal save keeps it');
  assert.deepEqual(out.session.playerRuntime.droneLift, { base: 0, z: 1.25, vz: 0, futureLift: FUTURE });
  assert.deepEqual(out.futureTop, FUTURE);
  assert.deepEqual(out.session.futureSession, FUTURE);
  assert.deepEqual(out.session.playerRuntime.futureRuntime, FUTURE);
  assert.deepEqual(out.equipment.primary.futureGear, FUTURE);
  assert.deepEqual(out.consequences.dungeons['dungeon:future:g1'].futureHistory, FUTURE);
});

test('a bound dungeon lift keeps unknown fields and rewrites canonical identity on export', () => {
  const fixture = createLabFixture({ lab: 'close-view', scenario: 'terrain-pentagon', seed: 'DRONE-RUNTIME-DUNGEON', now: 1000 });
  const save = readyDrone(fixture.game.exportSnapshot(1000));
  const areaId = fixture.game.areaId(), levelId = String(fixture.game.map.levelId || 'root');
  const ground = fixture.game.elevationHere(fixture.game.player.x, fixture.game.player.y);
  save.session.playerRuntime.droneLift = { base: ground, z: ground, vz: 0, area: 'dungeon', areaId, levelId, futureLift: FUTURE };

  const game = new Game(migrateSave(structuredClone(save)), 2000);
  assert.deepEqual(game.droneLift?.futureLift, FUTURE);
  game.droneLift.areaId = 'stale-overwritten';
  game.droneLift.levelId = 'stale-overwritten';
  const out = game.exportSnapshot(2100).session.playerRuntime.droneLift;

  assert.deepEqual(out.futureLift, FUTURE);
  assert.equal(out.area, 'dungeon');
  assert.equal(out.areaId, game.areaId(), 'the current area identity is authoritative');
  assert.equal(out.levelId, String(game.map.levelId || 'root'), 'the current level identity is authoritative');
  const resumed = new Game(migrateSave(structuredClone(game.save)), 3000);
  assert.deepEqual(resumed.droneLift?.futureLift, FUTURE, 'the bound lift survives another load');
});

test('invalid and stale dungeon lifts are still discarded instead of preserving their unknown fields', () => {
  const invalid = readyDrone(freshSave());
  invalid.session.playerRuntime.droneLift = { base: 0, z: 'bad', vz: 0, futureLift: FUTURE };
  const migrated = migrateSave(structuredClone(invalid));
  assert.equal(migrated.session.playerRuntime.droneLift, null);
  assert.equal(new Game(migrated, 0).exportSnapshot(1).session.playerRuntime.droneLift, null);

  const fixture = createLabFixture({ lab: 'close-view', scenario: 'terrain-pentagon', seed: 'DRONE-RUNTIME-STALE', now: 1000 });
  const stale = readyDrone(fixture.game.exportSnapshot(1000));
  stale.session.playerRuntime.droneLift = { base: 0, z: 1, vz: 0, area: 'dungeon', areaId: 'another-area', levelId: 'root', futureLift: FUTURE };
  const game = new Game(migrateSave(structuredClone(stale)), 2000);
  assert.equal(game.droneLift, null);
  assert.equal(game.exportSnapshot(2100).session.playerRuntime.droneLift, null);
});
