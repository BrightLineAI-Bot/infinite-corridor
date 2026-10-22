// Release 279 (Tim, 2026-10-22): the Proving Ground's standard test tile, the combat environment list, and the Atlas
// guidance that survives closing the map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, COMBAT_ENVIRONMENTS, TEST_TILE, stampTestTile, scenariosForLab, LABORATORIES } from '../src/proving-ground-labs.ts';
import { freshSave, migrateSave, normalizeGuidance } from '../src/types.ts';

test('the standard test tile has water, a chasm, raised blocks with stairs, a building and a crossing', () => {
  const f = createLabFixture({ lab: 'test-tile' }), m = f.game.map, kinds = new Set(m.tiles.map((t) => t.kind));
  assert.ok(LABORATORIES.some((l) => l.id === 'test-tile')); assert.deepEqual(scenariosForLab('test-tile').map((q) => q.id), ['standard']);
  assert.equal(f.game.area, 'overworld'); assert.equal(f.game.rx, TEST_TILE.rx); assert.equal(f.game.ry, TEST_TILE.ry); assert.ok(m.testTile && m.landscape);
  assert.ok(kinds.has('lakeWater') && kinds.has('canyon'));
  assert.ok(m.tiles.some((t) => t.elev === 2) && m.tiles.filter((t) => t.slope).length >= 2, 'a plateau with stairs');
  assert.ok(m.objects.some((o) => o.kind === 'shack'), 'a building'); assert.ok(m.objects.some((o) => o.id === 'test-tile-crossing' && o.kind === 'dungeon'));
  const again = stampTestTile(createLabFixture({ lab: 'test-tile' }).game.map); assert.equal(again.objects.filter((o) => o.id === 'test-tile-crossing').length, 1, 'stamping twice keeps one crossing');
  const g = f.game; Object.assign(g.player, { x: TEST_TILE.crossing.x, y: TEST_TILE.crossing.y + 1 }); g.interact('enter', 'test-tile-crossing'); assert.equal(g.area, 'dungeon', 'the crossing leads into a real dungeon');
});

test('a creature can be tried in every listed environment', () => {
  assert.equal(COMBAT_ENVIRONMENTS[0].id, 'test-tile');
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  for (const env of COMBAT_ENVIRONMENTS.map((e) => e.id).filter((id, i) => i < 5 || id === 'land-mountains' || id === 'arena-alien-vault')) {
    const f = createLabFixture({ lab: 'combat', scenario: 'pack-boss-lightningGiant', environment: env, now: 0 });
    assert.equal(f.environment, env); assert.equal(f.game.enemies[0]?.kind, 'lightningGiant', env);
    let t = 0; for (let k = 0; k < 20; k++) f.game.update(.05, idle, t += 50);
  }
  assert.equal(createLabFixture({ lab: 'combat', scenario: 'ashling' }).game.area, 'dungeon', 'without an environment the old hollow arena is used');
});

test('the compass choice is kept in the save (save.guidance, additive) and normalised', () => {
  assert.equal(freshSave().guidance, undefined);
  const s = freshSave(); s.guidance = { pick: '3,-2', pin: { rx: 4, ry: 1, name: 'Hunt' }, extra: 1 };
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).guidance, { pick: '3,-2', pin: { rx: 4, ry: 1, name: 'Hunt' }, extra: 1 });
  assert.equal(migrateSave({ ...JSON.parse(JSON.stringify(freshSave())), guidance: { pick: 'x', pin: { rx: 'a' } } }).guidance, undefined);
  assert.deepEqual(normalizeGuidance({ pick: null, pin: { rx: 1, ry: 2 } }), { pick: null, pin: { rx: 1, ry: 2, name: '' } });
});
