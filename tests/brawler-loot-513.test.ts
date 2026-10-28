// Release 513 (Tim, 2026-10-27): "monsters aren't dropping them... I accidentally destroyed my hammerfall, and so I want
// to get some instances of the hammerfall". Brawler gear drops about twice as often, and a full Pack keeps a piece you
// do not have instead of salvaging it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { storeInventoryItem, EQUIPMENT_CAPACITY, BRAWLER_GEAR } from '../src/game.ts';
import { generateItem, BRAWLER_LOOT } from '../src/items.ts';

const gear = (name) => ({ ...BRAWLER_GEAR.find((g) => g.item.name === name).item, id: `x-${name}`, power: 1, tier: 'common' });
const fullPack = () => { const s = freshSave(); s.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => ({ id: `p${i}`, name: 'Kiln Mantle', slot: 'armor', property: 'guard', power: 90, tier: 'relic', affixes: [] })); return s; };

test('Hammerfall drops from roughly one item in twenty or more', () => {
  let n = 0; for (let i = 0; i < 4000; i++) if (generateItem(`TIM:rootBrute:${i}`, 30).name === 'Hammerfall') n++;
  assert.ok(BRAWLER_LOOT.share >= .35); assert.ok(n / 4000 > .035, `${n} of 4000`);
});

test('a full Pack keeps a Hammerfall you do not have, and salvages a weak one you already have', () => {
  const s = fullPack(); const r = storeInventoryItem(s, gear('Hammerfall'));
  assert.equal(r.stored, true); assert.ok(s.inventory.some((q) => q.name === 'Hammerfall')); assert.equal(s.inventory.length, EQUIPMENT_CAPACITY);
  // Release 545 (Tim: "first in first out... if they're all the same tier... salvage the first one that you got"): a second
  // copy of the same tier now takes the older copy's place (was: the new copy was salvaged). Either way one Hammerfall stays.
  const again = storeInventoryItem(s, { ...gear('Hammerfall'), id: 'second' }); assert.equal(again.salvaged.id, 'x-Hammerfall', 'the older copy goes'); assert.equal(s.inventory.filter((q) => q.name === 'Hammerfall').length, 1);
  const g = fullPack(); g.equipment.secondary = gear('Great Sweep'); assert.equal(storeInventoryItem(g, { ...gear('Great Sweep'), id: 'y' }).stored, false, 'already equipped');
});

test('keeping new brawler gear never pushes out other brawler gear', () => {
  const s = fullPack(); storeInventoryItem(s, gear('Hammerfall')); storeInventoryItem(s, gear('Great Sweep')); storeInventoryItem(s, gear('Iron Fists'));
  for (const n of ['Hammerfall', 'Great Sweep', 'Iron Fists']) assert.ok(s.inventory.some((q) => q.name === n), n);
});
