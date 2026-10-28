// Release 543 (Tim, 2026-10-28): a sling of ten items that don't count against the pack, can't be sold or salvaged and
// stay put; for masterworked weapons and tools you are not using right now.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { SLING, ensureSling, toSling, fromSling, equipFromSling } from '../src/sling.ts';
import { EQUIPMENT_CAPACITY } from '../src/game.ts';

const piece = (slot, name, extra = {}) => ({ id: `${slot}-${name}`, name, slot, power: 5, property: 'steady', tier: 'relic', affixes: [], ...extra });

test('fresh and old saves gain an empty sling; slung pieces round-trip, junk is dropped', () => {
  assert.deepEqual(freshSave().sling, []);
  const s = freshSave(); delete s.sling; assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).sling, []);
  const t = freshSave(); t.sling = [piece('secondary', 'Hammerfall', { masterwork: true }), 'junk', { slot: 'potion' }];
  const back = migrateSave(JSON.parse(JSON.stringify(t))); assert.equal(back.sling.length, 1); assert.equal(back.sling[0].masterwork, true);
});

test('a slung piece leaves the pack (no space taken, nothing to sell or salvage) and holds at most ten', () => {
  const s = freshSave(); s.inventory = Array.from({ length: 12 }, (_, i) => piece('primary', `Blade ${i}`));
  for (let i = 0; i < SLING.size; i++) assert.equal(toSling(s, 0).ok, true);
  assert.equal(s.sling.length, 10); assert.equal(s.inventory.length, 2);
  const r = toSling(s, 0); assert.equal(r.ok, false); assert.match(r.message, /holds 10/);
  assert.equal(toSling(s, 99).ok, false);
});

test('back to the pack only with room; equipping from the sling swaps the old piece into its place', () => {
  const s = freshSave(); s.equipment.secondary = piece('secondary', 'Needle Caster'); s.sling = [piece('secondary', 'Hammerfall')]; ensureSling(s);
  const r = equipFromSling(s, 0); assert.equal(r.ok, true); assert.equal(s.equipment.secondary.name, 'Hammerfall'); assert.equal(s.sling[0].name, 'Needle Caster');
  s.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => piece('armor', `Coat ${i}`));
  assert.equal(fromSling(s, 0, EQUIPMENT_CAPACITY).ok, false, 'pack full');
  s.inventory.pop(); assert.equal(fromSling(s, 0, EQUIPMENT_CAPACITY).ok, true); assert.equal(s.sling.length, 0); assert.ok(s.inventory.some((q) => q.name === 'Needle Caster'));
});
