// Release 704 (Tim, 2026-11-02): "you beat the listener one time... you open the first gate, and then you beat the listener 2
// additional times... it opens the second gate, and then... 3 additional times to unlock the third gate, and then... 4
// additional times [for] the fourth gate and so on." The Gate at tier g climbs after g more Listener kills.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureFarArray, listenerFelled, killsToClimb } from '../src/far-array.ts';
import { mechGate, droneGate } from '../src/vehicle-gates.ts';

const fresh = () => { const s = freshSave(); s.seed = 'GATES'; ensureFarArray(s); return s; };

test('the Gate climbs after 1, then 2, then 3, then 4 more Listener kills', () => {
  const s = fresh(), tierAfter = [];
  for (let k = 1; k <= 10; k++) { listenerFelled(s); tierAfter.push(s.farArray.gate); }
  assert.deepEqual(tierAfter, [2, 2, 3, 3, 3, 4, 4, 4, 4, 5]);
  assert.equal(s.farArray.listeners, 10); assert.equal(s.farArray.toNext, 0);
  assert.deepEqual([1, 2, 3, 4].map(killsToClimb), [1, 2, 3, 4]);
});

test('the kill message says whether the Gate climbed or how many kills remain', () => {
  const s = fresh();
  assert.match(listenerFelled(s), /The Gate climbs to tier 2\./);
  assert.match(listenerFelled(s), /holds at tier 2: fell the Listener 1 more time to climb to tier 3/);
  assert.match(listenerFelled(s), /The Gate climbs to tier 3\./);
  assert.match(listenerFelled(s), /fell the Listener 2 more times/);
});

test('progress toward the next climb survives a save; an old journey keeps its tier', () => {
  const s = fresh(); listenerFelled(s); listenerFelled(s);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); ensureFarArray(back); assert.equal(back.farArray.gate, 2); assert.equal(back.farArray.toNext, 1);
  const old = freshSave(); old.farArray = { gate: 4, listeners: 3 }; ensureFarArray(old); assert.equal(old.farArray.gate, 4); assert.equal(old.farArray.toNext, 0);
});

test('the robot needs the second Gate opened (3 kills) and the drone the fourth (10 kills)', () => {
  const s = fresh(); s.perception.aperture = 3255;
  for (let k = 1; k <= 10; k++) {
    listenerFelled(s);
    assert.equal(mechGate(s).ok, k >= 3, `robot after ${k}`); assert.equal(droneGate(s).ok, k >= 10, `drone after ${k}`);
  }
});
