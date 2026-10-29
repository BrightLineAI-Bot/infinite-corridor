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

test('a Mouth section seen before 557 keeps the hamlet it had; one first seen from 557 stays open land', async () => {
  const { legacyMouthHamlet, hamletSection } = await import('../src/settlements.ts');
  const { relayCoordinate } = await import('../src/relay-network.ts');
  const { walkerCrossingMap } = await import('../src/game.ts');
  const { freshSave } = await import('../src/types.ts');
  let seed = null, at = null;
  for (let i = 0; i < 2000 && !seed; i++) { const s = `MOUTHHAM${i}`, m = relayCoordinate({ seed: s }); if (legacyMouthHamlet({ seed: s, atlas: { [`${m.rx},${m.ry}`]: { hamletVersion: 2, dreamVersion: 2 } } }, m.rx, m.ry)) { seed = s; at = m; } }
  assert.ok(seed, 'a seed whose hamlet roll lands on the Mouth');
  assert.equal(hamletSection(seed, at.rx, at.ry), false, 'never for new ground');
  const key = `${at.rx},${at.ry}`, old = freshSave(); old.seed = seed; old.atlas = { [key]: { terrain: 'ash', hamletVersion: 2, dreamVersion: 2, landscapeVersion: 3, seaVersion: 1, travelVersion: 1 } };
  const fresh = freshSave(); fresh.seed = seed; fresh.atlas = { [key]: { ...old.atlas[key], dreamVersion: 3 } };
  assert.equal(legacyMouthHamlet(old, at.rx, at.ry), true); assert.equal(legacyMouthHamlet(fresh, at.rx, at.ry), false);
  const before = walkerCrossingMap(old, at.rx, at.ry), after = walkerCrossingMap(fresh, at.rx, at.ry);
  assert.equal(!!after.hamlet, false, 'first seen from 557: open land');
  assert.ok(before.hamlet || !before.tiles, `seen before 557: keeps its hamlet (${before.hamlet})`);
  // Release 565 (second pre-publish review): the old answer is kept, never forced. Before 557 a Mouth roll only became a hamlet
  // where the ground had a flat site; the rest stayed open land, and must still.
  let legacy = 0, built = 0;
  for (let i = 0; i < 400; i++) { const s = `MOUTHHAM${i}`, m = relayCoordinate({ seed: s }), k = `${m.rx},${m.ry}`, sv = freshSave(); sv.seed = s; sv.atlas = { [k]: { terrain: 'ash', hamletVersion: 2, dreamVersion: 2, landscapeVersion: 3, seaVersion: 1, travelVersion: 1 } }; if (!legacyMouthHamlet(sv, m.rx, m.ry)) continue; legacy++; if (walkerCrossingMap(sv, m.rx, m.ry).hamlet) built++; }
  assert.ok(legacy > 5 && built > 0 && built < legacy, `${built} of ${legacy} legacy Mouth rolls hold a hamlet, not all`);
});
