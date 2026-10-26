// Release 457 (Tim: "after Infinite 4, after you've played the second gate, you should be able to upgrade your weapons to
// +10... +10 is the max upgrade"): every tier's upgrade cap rises by 3 from Infinite IV with two Listeners felled.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { UPGRADE_CAPS, LATE_UPGRADE, lateUpgradeOpen, itemCap, upgradeCost, upgradeEquipment, normalizeItemUpgrade, APERTURE_BANDS } from '../src/items.ts';

const late = (s) => { s.perception.aperture = APERTURE_BANDS[LATE_UPGRADE.tier].threshold; s.farArray = { ...(s.farArray || {}), listeners: LATE_UPGRADE.listeners }; return s; };
const relic = (rank, masterwork = false) => ({ id: 'r', name: 'Relic Blade', slot: 'primary', tier: 'relic', power: 20 + rank, basePower: 20, upgradeRank: rank, masterwork });

test('the late cap opens only at Infinite IV with the second Gate passed', () => {
  assert.equal(APERTURE_BANDS[LATE_UPGRADE.tier].name, 'Infinite IV');
  const s = freshSave(); assert.equal(lateUpgradeOpen(s), false);
  s.perception.aperture = APERTURE_BANDS[LATE_UPGRADE.tier].threshold; s.farArray = { ...s.farArray, listeners: 1 }; assert.equal(lateUpgradeOpen(s), false, 'one Listener is not enough');
  s.farArray.listeners = 2; assert.equal(lateUpgradeOpen(s), true);
  s.perception.aperture = APERTURE_BANDS[LATE_UPGRADE.tier].threshold - 1; assert.equal(lateUpgradeOpen(s), false, 'Infinite III is not enough');
});

test('a relic reaches +9, a masterwork relic +10; ranks earned are kept through a save', () => {
  const s = late(freshSave());
  assert.equal(itemCap(relic(0), s), UPGRADE_CAPS.relic + 3); assert.equal(itemCap(relic(0, true), s), 10);
  assert.equal(upgradeCost(relic(6)).eligible, false, 'without the save: the old cap'); assert.equal(upgradeCost(relic(6), s).eligible, true);
  s.equipment.primary = relic(9, true); s.materials.weaponSphere = 50;
  assert.ok(upgradeEquipment(s, 'primary').ok); assert.equal(s.equipment.primary.upgradeRank, 10);
  const r = upgradeEquipment(s, 'primary'); assert.equal(r.ok, false); assert.match(r.message, /upgrade limit/);
  assert.equal(normalizeItemUpgrade(relic(10, true)).upgradeRank, 10, 'never trimmed');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).equipment.primary.upgradeRank, 10);
  const early = freshSave(); early.equipment.primary = relic(6); early.materials.weaponSphere = 50;
  const e = upgradeEquipment(early, 'primary'); assert.equal(e.ok, false); assert.match(e.message, /Infinite IV and the second Gate raise every limit by 3/);
});
