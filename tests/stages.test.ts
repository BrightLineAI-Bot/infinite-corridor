// Release 275 (Tim, 2026-10-21): creature stages. Aperture holds at the stage's top tier until the Listener falls; Stage 1
// beasts stop growing from tier 13 until three Listener kills.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { APERTURE_THRESHOLDS, apertureTier } from '../src/world.ts';
import { gainAperture } from '../src/interactions.ts';
import { STAGES, stageOf, tierCap, apertureCeiling } from '../src/stages.ts';
import { beastProfileVitals, WORLD_BEASTS } from '../src/world-beasts.ts';

const kills = (s, n) => { s.farArray.listeners = n; return s; };

test('the stage rises with Listener kills: the first opens Stage 2, then every two more', () => {
  const s = freshSave();
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((n) => stageOf(kills(s, n))), [1, 2, 2, 3, 3, 4, 4, 5]);
  assert.equal(tierCap(kills(s, 0)), 12); assert.equal(tierCap(kills(s, 1)), 24); assert.equal(STAGES.thawKills, 3);
});

test('Aperture holds one short of tier 13 until the Listener falls, and a save already past it keeps what it has', () => {
  const s = freshSave(); s.perception.aperture = APERTURE_THRESHOLDS[11] + 10; // tier 12
  gainAperture(s, 1e7, 'test:huge'); assert.equal(apertureTier(s.perception.aperture), 12); assert.equal(s.perception.aperture, APERTURE_THRESHOLDS[12] - 1);
  assert.equal(s.perception.aperture, apertureCeiling(s));
  kills(s, 1); gainAperture(s, 1e9, 'test:after'); assert.equal(apertureTier(s.perception.aperture), 24, 'Stage 2 holds at tier 24');
  const past = freshSave(); past.perception.aperture = APERTURE_THRESHOLDS[14]; const was = past.perception.aperture;
  gainAperture(past, 50, 'test:past'); assert.equal(past.perception.aperture, was, 'never taken away, never grows');
});

test('Stage 1 beasts are held from tier 13 until three Listener kills, then match the Wayfarer again', () => {
  const B = WORLD_BEASTS.morphingBlob, s = kills(freshSave(), 1); s.level = 30; s.maxHp = 400; s.perception.aperture = APERTURE_THRESHOLDS[12];
  const held = beastProfileVitals(B, s, { meleeBonus: 40, damageReduction: .2 });
  assert.ok(s.beastCeiling, 'the measure is kept');
  s.level = 45; s.maxHp = 700; const later = beastProfileVitals(B, s, { meleeBonus: 90, damageReduction: .3 });
  assert.deepEqual(later, held, 'stronger Wayfarer, same beast');
  kills(s, 3); const thawed = beastProfileVitals(B, s, { meleeBonus: 90, damageReduction: .3 });
  assert.ok(thawed.hp > held.hp && thawed.damage > held.damage, 'after three Listeners it matches again');
  const young = freshSave(); young.level = 10; beastProfileVitals(B, young, {}); assert.equal(young.beastCeiling, undefined, 'below tier 13 nothing is held');
});

test('saves: beastCeiling is additive and normalised by migrateSave', () => {
  const s = freshSave(); assert.equal(s.beastCeiling, undefined);
  const good = migrateSave({ ...JSON.parse(JSON.stringify(s)), beastCeiling: { level: '20', perHit: 50, maxHp: 300, guard: .1 } });
  assert.deepEqual(good.beastCeiling, { level: 20, perHit: 50, maxHp: 300, guard: .1 });
  assert.equal(migrateSave({ ...JSON.parse(JSON.stringify(s)), beastCeiling: { level: 'x' } }).beastCeiling, undefined);
});

test('Act on a rock gathers its one stone: chip first, then break, never rolling it away first (Tim, 2026-10-21 probe)', async () => {
  const { validActions, applyInteraction } = await import('../src/interactions.ts');
  const s = freshSave(); s.stats.Might = 5; s.materials.stone = 0; const rock = { id: 'q-rock', kind: 'rock', state: 'sealed', actions: ['move', 'break'], environmental: true };
  assert.deepEqual(validActions(rock, s), ['chip', 'break', 'move']);
  applyInteraction(rock, validActions(rock, s)[0], s); assert.equal(s.materials.stone, 1, 'every rock gives one stone');
  applyInteraction(rock, validActions(rock, s)[0], s); assert.equal(s.materials.stone, 1, 'breaking only clears it'); assert.equal(rock.state, 'broken');
  assert.deepEqual(validActions(rock, s), [], 'rubble takes no more presses');
});

test('the Gate Revenant is held with the world beasts; nothing else is', async () => {
  const { tuneGatePredator } = await import('../src/monster-pack.ts');
  const s = kills(freshSave(), 1); s.level = 30; s.maxHp = 400; s.perception.aperture = APERTURE_THRESHOLDS[12];
  const a = tuneGatePredator({ gatePredator: true, maxHp: 360, hp: 360, damage: 22 }, s, { meleeBonus: 40, damageReduction: .2 });
  s.level = 50; s.maxHp = 800; const b = tuneGatePredator({ gatePredator: true, maxHp: 360, hp: 360, damage: 22 }, s, { meleeBonus: 120, damageReduction: .3 });
  assert.equal(b.maxHp, a.maxHp); assert.equal(b.damage, a.damage);
  kills(s, 3); const c = tuneGatePredator({ gatePredator: true, maxHp: 360, hp: 360, damage: 22 }, s, { meleeBonus: 120, damageReduction: .3 });
  assert.ok(c.maxHp > a.maxHp && c.damage > a.damage);
});

test('a supply cache gives 2 stone and 1 wood on top of its supply', async () => {
  const { applyInteraction } = await import('../src/interactions.ts');
  const s = freshSave(); s.materials.stone = 0; s.materials.wood = 0;
  const r = applyInteraction({ id: 'sc', kind: 'supplyCache', supplyType: 'potion', state: 'sealed', actions: ['collect'] }, 'collect', s);
  assert.equal(s.materials.stone, 2); assert.equal(s.materials.wood, 1); assert.match(r.message, /\+2 stone, \+1 wood/);
});
