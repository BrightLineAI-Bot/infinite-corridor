// Release 545 (Tim, 2026-10-28): a full pack salvages first in, first out, but by tier first: relic and higher pieces stay;
// a purchase into a full pack makes room instead of being lost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { storeInventoryItem, packVictim, EQUIPMENT_CAPACITY, buyFromVela, velaShop } from '../src/game.ts';

const piece = (id, tier, extra = {}) => ({ id, name: `Blade ${id}`, slot: 'primary', property: 'steady', power: 10, tier, affixes: [], ...extra });
const pack = (tiers) => { const s = freshSave(); s.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => piece(`p${i}`, tiers(i))); return s; };

test('the lowest tier goes first, and within it the oldest; worked pieces outlast plain ones', () => {
  const s = pack((i) => (i < 10 ? 'relic' : i < 30 ? 'rare' : 'common'));
  assert.equal(packVictim(s), 30, 'the oldest common');
  s.inventory[30].upgradeRank = 2; assert.equal(packVictim(s), 31, 'an upgraded common outlasts a plain one');
  const r = storeInventoryItem(s, piece('new', 'rare')); assert.equal(r.stored, true); assert.equal(r.salvaged.id, 'p31');
  assert.equal(s.inventory.length, EQUIPMENT_CAPACITY); assert.equal(s.inventory.at(-1).id, 'new');
});

test('a drop below everything kept is salvaged; at the same tier the oldest makes room', () => {
  const s = pack(() => 'relic');
  assert.equal(storeInventoryItem(s, piece('low', 'common')).stored, false);
  const r = storeInventoryItem(s, piece('same', 'relic')); assert.equal(r.stored, true); assert.equal(r.salvaged.id, 'p0');
});

test('buying into a full pack keeps the purchase and salvages the least-kept, oldest piece', () => {
  const s = pack(() => 'relic'); s.currency = 100000; const shop = velaShop(s), item = shop.equipment[0];
  const r = buyFromVela(s, item.id); assert.equal(r.ok, true, r.message);
  assert.ok(s.inventory.some((q) => q.id === item.id), 'the purchase is in the pack'); assert.equal(s.inventory.length, EQUIPMENT_CAPACITY);
});
