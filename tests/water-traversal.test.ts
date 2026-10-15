import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { TIDEMANTLE, tidemantleTrial, grantTidemantle, swimsThrough, drownedPlace, swimUpkeep } from '../src/water-traversal.ts';

function pool(kind) {
  const s = freshSave(), g = new Game(s, 0);
  g.map = { ...g.map, width: 8, height: 8, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = Math.floor(i / 8), hazard = x >= 4; return { x, y, kind: hazard ? kind : 'ash', environment: hazard ? kind : undefined, blocked: hazard }; }) };
  g.area = 'dungeon'; g.player.x = 2; g.player.y = 2; g.enemies = [];
  return { s, g };
}
const run = (g, s, frames, dt = 1 / 60) => { const input = { state: { x: 1, y: 0 }, consume: () => false }; for (let i = 0; i < frames && !s.worldFlags.deaths; i++) g.update(dt, input, i * dt * 1000); };

test('without the Tidemantle surface water still drowns (release 101 rule kept)', () => {
  const { s, g } = pool('river'); run(g, s, 180); assert.equal(s.worldFlags.deaths, 1);
});

test('the Tidemantle lets the Wayfarer swim on river, flooded hall and ocean water, slower and tiring', () => {
  for (const kind of TIDEMANTLE.swimKinds) {
    const { s, g } = pool(kind); grantTidemantle(s, 'test'); run(g, s, 120);
    assert.ok(!s.worldFlags.deaths, `${kind} swimmable`); assert.ok(g.player.x > 4.2, `${kind} entered`); assert.ok(g.swimming);
    assert.ok(g.player.stamina < g.player.maxStamina, 'swimming drains stamina');
  }
});

test('the Tidemantle is not submersion: lava, chasms and canyons stay lethal', () => {
  for (const kind of ['canyon']) { const { s, g } = pool(kind); grantTidemantle(s, 'test'); run(g, s, 180, 1 / 20); assert.equal(s.worldFlags.deaths, 1, kind); }
  for (const kind of ['lava', 'abyss', 'canyon']) assert.equal(swimsThrough({ capabilities: { swim: true } }, kind), false);
});

test('an exhausted swimmer takes damage instead of regaining stamina', () => {
  const p = { stamina: 0 }; assert.ok(swimUpkeep(p, 1) > 0); const q = { stamina: 10 }; assert.equal(swimUpkeep(q, 1), 0); assert.equal(q.stamina, 10 - TIDEMANTLE.staminaDrainPerSecond);
});

test('the Tidemantle quest: a drowned dungeon guardian or a Mire Apostle grants it once', () => {
  const wet = { tiles: Array.from({ length: 10 }, () => ({ kind: 'dungeonWater' })) }, dry = { tiles: [{ kind: 'ash' }] };
  assert.equal(drownedPlace(wet), true); assert.equal(drownedPlace(dry), false);
  assert.equal(tidemantleTrial('dungeon', wet, { boss: true, kind: 'rootBrute' }), true);
  assert.equal(tidemantleTrial('dungeon', dry, { boss: true, kind: 'rootBrute' }), false);
  assert.equal(tidemantleTrial('dungeon', wet, { kind: 'ashling' }), false);
  assert.equal(tidemantleTrial('overworld', dry, { kind: 'mireApostle', eliteId: 'mireApostle' }), true);
  const s = freshSave(); assert.equal(s.capabilities.swim, false);
  assert.equal(grantTidemantle(s, 'a'), true); assert.equal(grantTidemantle(s, 'b'), false); assert.equal(s.worldFlags.tidemantle, 'a');
});

test('defeating a drowned guardian through the game grants the Tidemantle and journals it', () => {
  const { s, g } = pool('dungeonWater'); const e = { id: 'g1', kind: 'rootBrute', boss: true, hp: 0, x: 1, y: 1 };
  g.defeatEnemy(e); assert.equal(s.capabilities.swim, true); assert.match(g.defeatNotice.detail, /Tidemantle/);
});

test('the Tidemantle survives migration and old saves stay unable to swim', () => {
  const s = freshSave(); grantTidemantle(s, 'x'); const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.capabilities.swim, true); assert.equal(m.capabilities.dive, false);
  const old = JSON.parse(JSON.stringify(freshSave())); delete old.capabilities; assert.equal(migrateSave(old).capabilities.swim, false);
});
