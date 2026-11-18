// 2026-11-18 (Tim: lumen dust could not be earned from salvage): the Wayfarer chooses what salvage yields, cinder iron (the
// default, as before) or lumen dust at SALVAGE_YIELD.lumenPerIron of the iron, the fraction carried until whole. The choice
// applies to salvage by hand, at the smith and from a full pack, and save.salvageYield is additive at schema 14.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { salvageInventoryItem, salvageInventoryItems, storeInventoryItem, EQUIPMENT_CAPACITY } from '../src/game.ts';
import { SMITHY, SALVAGE_YIELD, ensureSalvageYield, setSalvageYield, paySalvage, salvageItem, salvageYieldText } from '../src/smithy.ts';

const relic = (id) => ({ id, name: 'Kiln Mantle', slot: 'armor', property: 'guard', power: 20, basePower: 20, upgradeRank: 0, tier: 'relic', affixes: [] });
const common = (id) => ({ ...relic(id), power: 2, basePower: 2, tier: 'common' });

test('the yield table: two modes, cinder iron by default, lumen dust at the smelting rate', () => {
  assert.deepEqual([...SALVAGE_YIELD.modes], ['cinderIron', 'lumenDust']);
  assert.equal(SALVAGE_YIELD.fallback, 'cinderIron');
  assert.equal(SALVAGE_YIELD.lumenPerIron, .2);
  assert.ok(SMITHY.salvage.iron.relic * SALVAGE_YIELD.lumenPerIron < 1, 'one relic salvage is worth under one lumen dust (towers give 1-3 a cache)');
});

test('fresh and migrated saves carry the choice; bad values normalise and unknown fields stay', () => {
  assert.deepEqual(freshSave().salvageYield, { mode: 'cinderIron', carry: 0 });
  const old = freshSave(); delete old.salvageYield;
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(old))).salvageYield, { mode: 'cinderIron', carry: 0 }, 'a save from before gets the default');
  const odd = { ...freshSave(), salvageYield: { mode: 'gold', carry: 7, note: 'kept' } };
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(odd))).salvageYield, { mode: 'cinderIron', carry: 0, note: 'kept' });
  const kept = { ...freshSave(), salvageYield: { mode: 'lumenDust', carry: .6 } };
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(kept))).salvageYield, { mode: 'lumenDust', carry: .6 }, 'a sound choice survives a reload');
  const neg = { salvageYield: { mode: 'lumenDust', carry: -1 } }; assert.equal(ensureSalvageYield(neg).carry, 0);
  const arr = { salvageYield: [] }; assert.deepEqual(ensureSalvageYield(arr), { mode: 'cinderIron', carry: 0 });
  assert.equal(freshSave().version, 14, 'schema unchanged');
});

test('cinder iron mode pays exactly as before', () => {
  const s = freshSave(); s.materials.cinderIron = 0; s.materials.lumenDust = 0; s.inventory = [relic('a')];
  const r = salvageInventoryItem(s, 0);
  assert.equal(r.iron, SMITHY.salvage.iron.relic); assert.equal(r.lumenDust, 0);
  assert.equal(s.materials.cinderIron, SMITHY.salvage.iron.relic); assert.equal(s.materials.lumenDust, 0);
  assert.equal(salvageYieldText(s, 4), '4 iron');
});

test('lumen dust mode pays lumen dust, carrying fractions until whole, by hand, in bulk and at the smith', () => {
  const s = freshSave(); s.materials.cinderIron = 0; s.materials.lumenDust = 0;
  assert.equal(setSalvageYield(s, 'lumenDust').ok, true); assert.equal(setSalvageYield(s, 'gold').ok, false); assert.equal(s.salvageYield.mode, 'lumenDust');
  s.inventory = [relic('a'), relic('b'), common('c')];
  const one = salvageInventoryItem(s, 0); // 4 iron × .2 = .8
  assert.deepEqual([one.iron, one.lumenDust, s.salvageYield.carry, s.materials.lumenDust], [0, 0, .8, 0]);
  const two = salvageInventoryItem(s, 0); // .8 + .8 = 1.6
  assert.deepEqual([two.lumenDust, s.salvageYield.carry, s.materials.lumenDust], [1, .6, 1]);
  const bulk = salvageInventoryItems(s, [s.inventory[0]]); // a common: .2 → .8
  assert.deepEqual([bulk.count, bulk.iron, bulk.lumenDust, s.salvageYield.carry], [1, 0, 0, .8]);
  assert.equal(s.materials.cinderIron, 0, 'no iron in lumen dust mode');
  assert.ok(s.glyphDust > 0, 'glyph dust is paid either way');
  // The town smith's salvage follows the same choice.
  s.farArray.listeners = 5; s.inventory = [relic('d')];
  const smith = salvageItem(s, 0); assert.equal(smith.ok, true); assert.equal(smith.lumenDust, 1); assert.equal(smith.iron, 0);
  assert.match(smith.message, /lumen dust/);
  assert.equal(salvageYieldText(s, 4), '0.8 lumen dust');
});

test('a full pack salvages in the chosen yield too', () => {
  const s = freshSave(); s.materials.cinderIron = 0; s.materials.lumenDust = 0; setSalvageYield(s, 'lumenDust');
  s.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => relic('p' + i));
  for (let i = 0; i < 5; i++) storeInventoryItem(s, relic('n' + i)); // five relic salvages: 5 × .8 = 4
  assert.equal(s.materials.lumenDust, 4); assert.equal(s.salvageYield.carry, 0); assert.equal(s.materials.cinderIron, 0);
  const low = storeInventoryItem(s, common('low')); assert.equal(low.stored, false); assert.equal(low.lumenDust, 0); assert.equal(s.salvageYield.carry, .2);
});

test('rounding never drifts: a hundred commons pay exactly twenty lumen dust', () => {
  const s = freshSave(); s.materials.lumenDust = 0; setSalvageYield(s, 'lumenDust');
  for (let i = 0; i < 100; i++) paySalvage(s, SMITHY.salvage.iron.common);
  assert.equal(s.materials.lumenDust, 20); assert.equal(s.salvageYield.carry, 0);
});

test('the choice is offered at the Sphere Forge and the smith, and salvage buttons name the yield', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /function salvageYieldPicker\(/);
  assert.match(main, /body\.append\(iron,salvageYieldPicker\(openForge\)\)/, 'Sela\'s Sphere Forge');
  assert.match(main, /salvageYieldPicker\(\(\)=>openSmithy\(note\)\)/, 'the town smith');
  assert.match(main, /Salvage selected \(\$\{n\}\) · \$\{salvageYieldText\(save, iron\)\}/);
});
