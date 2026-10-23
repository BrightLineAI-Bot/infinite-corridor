// Release 331 (Tim, 2026-10-23): from Infinite III the world beasts hold their strength; from the third Listener on, each
// Listener kill catches them up to the Wayfarer as they stand, and they hold there until the next kill.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { APERTURE_THRESHOLDS } from '../src/world.ts';
import { beastCatchUp } from '../src/stages.ts';
import { beastProfileVitals, liveBeastReference, WORLD_BEASTS } from '../src/world-beasts.ts';

const B = WORLD_BEASTS.morphingBlob;
const at = (n) => { const s = freshSave(); s.farArray.listeners = n; s.perception.aperture = APERTURE_THRESHOLDS[12]; s.level = 30; s.maxHp = 400; return s; };
const grow = (s, level, maxHp) => { s.level = level; s.maxHp = maxHp; };

test('each Listener kill from the third catches the beasts up, and they hold until the next', () => {
  const s = at(3), st = { meleeBonus: 40, damageReduction: .2 }, first = beastProfileVitals(B, s, st);
  assert.equal(s.beastCeiling.kills, 3);
  grow(s, 45, 700); const big = { meleeBonus: 90, damageReduction: .3 };
  assert.deepEqual(beastProfileVitals(B, s, big), first, 'held while the Wayfarer grows');
  s.farArray.listeners = 4; assert.equal(beastCatchUp(s, liveBeastReference(s, big)), true);
  const caught = beastProfileVitals(B, s, big); assert.ok(caught.hp > first.hp && caught.damage > first.damage, 'caught up at the kill');
  grow(s, 60, 1000); assert.deepEqual(beastProfileVitals(B, s, { meleeBonus: 150, damageReduction: .4 }), caught, 'held again until the next Listener');
});

test('before the third Listener nothing catches up; a measure from before 331 catches up once, then holds', () => {
  const s = at(2); beastProfileVitals(B, s, {}); assert.equal(beastCatchUp(s, liveBeastReference(s, {})), false);
  const old = at(5); old.beastCeiling = { level: 20, perHit: 20, maxHp: 200, guard: .1 };
  const v = migrateSave(JSON.parse(JSON.stringify(old))); assert.equal(v.beastCeiling.kills, undefined, 'additive');
  const a = beastProfileVitals(B, old, { meleeBonus: 40 }); assert.equal(old.beastCeiling.kills, 5);
  grow(old, 50, 900); assert.deepEqual(beastProfileVitals(B, old, { meleeBonus: 100 }), a);
});
