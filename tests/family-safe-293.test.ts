// Release 293 (Tim, 2026-10-22): a child-safety setting turns off the horror and violence Glimpses; creatures are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GLIMPSES, GLIMPSE_ORDER, pickGlimpse, glimpseFor, glimpseAllowed } from '../src/glimpses.ts';
import { normalizeSettings, DEFAULT_SETTINGS } from '../src/persistence.ts';
import { freshSave } from '../src/types.ts';

test('the setting is off by default and normalised', () => {
  assert.equal(DEFAULT_SETTINGS.familySafe, false); assert.equal(normalizeSettings({ familySafe: 1 }).familySafe, true); assert.equal(normalizeSettings({}).familySafe, false);
});
test('with it on, mature Glimpses never surface; with it off they can', () => {
  const mature = GLIMPSE_ORDER.filter((id) => GLIMPSES[id].mature); assert.ok(mature.length >= 6);
  let r = 0; const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const save = freshSave(), seen = new Set(), seenOff = new Set();
  for (let i = 0; i < 4000; i++) { const id = pickGlimpse(save, i % 30, i % 7, rand, { family: true }); if (id) seen.add(id); const off = pickGlimpse(save, i % 30, i % 7, rand); if (off) seenOff.add(off); }
  for (const id of mature) { assert.ok(!seen.has(id), id); assert.equal(glimpseAllowed(id, true), false); }
  assert.ok(mature.some((id) => seenOff.has(id)), 'off: they can appear');
  assert.equal(glimpseFor(save, 'strange', 0, 0, () => 0, { family: true }) !== null, true);
});
