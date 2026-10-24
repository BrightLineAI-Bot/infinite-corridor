// Release 395: the town smith: salvage, reforge, an extra socket and masterwork, opening as Listeners fall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { SMITHY, salvageItem, reforgeAffix, addSocket, masterwork, smithOpen } from '../src/smithy.ts';
import { socketCount } from '../src/glyphs.ts';
import { itemCap, upgradeCost, UPGRADE_CAPS, normalizeItemUpgrade } from '../src/items.ts';

const rich = (listeners = 3) => { const s = freshSave(); s.seed = 'SMITH'; s.farArray = { listeners }; s.materials.cinderIron = 100; s.materials.lumenDust = 50; s.currency = 1000;
  s.equipment.primary = { id: 'blade-1', name: 'Test Blade', slot: 'primary', property: 'x', tier: 'epic', power: 5, basePower: 5, upgradeRank: 0, affixes: [{ id: 'attack', value: 3 }, { id: 'reach', value: .12 }], glyphs: [null, null] }; return s; };

test('services open as Listeners fall', () => {
  const s = rich(1); assert.equal(smithOpen(s, 'salvage'), true); assert.equal(smithOpen(s, 'reforge'), true); assert.equal(smithOpen(s, 'socket'), false);
  assert.match(addSocket(s, 'primary').message, /2 Listeners/); assert.match(masterwork(s, 'primary').message, /3 Listeners/);
});

test('salvage gives iron by tier, returns glyphs, and removes the item', () => {
  const s = rich(); s.inventory = [{ id: 'old-1', name: 'Old Axe', slot: 'primary', tier: 'rare', power: 2, glyphs: ['ignite', null] }]; const ig = s.glyphs.ignite, iron = s.materials.cinderIron;
  const r = salvageItem(s, 0); assert.equal(r.ok, true); assert.equal(s.inventory.length, 0); assert.equal(s.materials.cinderIron, iron + SMITHY.salvage.iron.rare); assert.equal(s.glyphs.ignite, ig + 1);
});

test('reforge rolls an affix again, paid, seeded, never doubling a kind', () => {
  const s = rich(), iron = s.materials.cinderIron; const r = reforgeAffix(s, 'primary', 0);
  assert.equal(r.ok, true); assert.equal(s.materials.cinderIron, iron - SMITHY.reforge.iron); assert.equal(s.currency, 1000 - SMITHY.reforge.marks);
  const ids = s.equipment.primary.affixes.map((a) => a.id); assert.equal(new Set(ids).size, ids.length);
  const t = rich(); reforgeAffix(t, 'primary', 0); assert.deepEqual(t.equipment.primary.affixes, s.equipment.primary.affixes, 'the same save rolls the same');
  const poor = rich(); poor.materials.cinderIron = 0; assert.equal(reforgeAffix(poor, 'primary', 0).ok, false);
});

test('one extra socket per item, and a masterwork goes one rank past the cap; both survive a reload', () => {
  const s = rich(); const before = socketCount(s.equipment.primary);
  assert.equal(addSocket(s, 'primary').ok, true); assert.equal(socketCount(s.equipment.primary), before + 1); assert.equal(s.equipment.primary.glyphs.length, before + 1);
  assert.equal(addSocket(s, 'primary').ok, false);
  assert.equal(masterwork(s, 'primary').ok, true); assert.equal(itemCap(s.equipment.primary), UPGRADE_CAPS.epic + 1);
  const at = normalizeItemUpgrade({ ...s.equipment.primary, upgradeRank: UPGRADE_CAPS.epic + 1 }); assert.equal(at.upgradeRank, UPGRADE_CAPS.epic + 1);
  assert.equal(upgradeCost({ ...s.equipment.primary, upgradeRank: UPGRADE_CAPS.epic }).eligible, true);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.equipment.primary.masterwork, true); assert.equal(back.equipment.primary.extraSockets, 1); assert.equal(socketCount(back.equipment.primary), before + 1);
});
