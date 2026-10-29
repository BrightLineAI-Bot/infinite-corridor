// Release 563 (Tim, 2026-10-29): distance from Ember Refuge weighs more far out: vitality ×10 at ring 100, ×20 at ring 200;
// nothing changed up to ring 60. Aperture plays no part in it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { regionalThreat, REGIONAL_THREAT } from '../src/world.ts';

test('vitality reaches ×10 at ring 100 and ×20 at ring 200; near rings are as before', () => {
  assert.equal(regionalThreat(100, 0).hpMultiplier, 10); assert.equal(regionalThreat(0, -200).hpMultiplier, 20);
  assert.equal(regionalThreat(60, 0).hpMultiplier, 3.8); assert.equal(regionalThreat(60, 0).damageMultiplier, 2.75);
  assert.equal(regionalThreat(30, 40).hpMultiplier, 3.4); assert.equal(regionalThreat(30, 40).damageMultiplier, 2.5);
  let last = 0; for (let r = 0; r <= 300; r += 5) { const q = regionalThreat(r, 0); assert.ok(q.hpMultiplier >= last); last = q.hpMultiplier; }
  assert.ok(regionalThreat(160, 0).damageMultiplier > 5.25 && regionalThreat(160, 0).damageMultiplier < 7, 'damage climbs, more gently');
  assert.ok(REGIONAL_THREAT.every(([from, h, d], i) => i === 0 || from > REGIONAL_THREAT[i - 1][0]));
});
