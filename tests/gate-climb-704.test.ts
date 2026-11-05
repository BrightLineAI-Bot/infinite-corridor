// Release 704 (Tim, 2026-11-02): "you beat the listener one time... you open the first gate, and then you beat the listener 2
// additional times... it opens the second gate, and then... 3 additional times to unlock the third gate, and then... 4
// additional times [for] the fourth gate and so on." The Gate at tier g climbs after g more Listener kills.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureFarArray, listenerFelled, killsToClimb, piecesToUnlock } from '../src/far-array.ts';
import { mechGate, droneGate } from '../src/vehicle-gates.ts';

const fresh = () => { const s = freshSave(); s.seed = 'GATES'; ensureFarArray(s); return s; };

// 2026-11-05 (Tim; far-array.ts LISTENER_CYCLE v2): "Once you complete five, it beats the gate and it opens." Every Gate now
// takes five pieces (a Listener felled, or a Gate Revenant horde broken); release 704's g kills for Gate g stays as killsToClimb.
test('the Gate climbs after every five pieces (was 1, then 2, then 3, then 4 more Listener kills)', () => {
  const s = fresh(), tierAfter = [];
  for (let k = 1; k <= 10; k++) { listenerFelled(s); tierAfter.push(s.farArray.gate); }
  assert.deepEqual(tierAfter, [1, 1, 1, 1, 2, 2, 2, 2, 2, 3]);
  assert.equal(s.farArray.listeners, 10); assert.equal(s.farArray.toNext, 0);
  assert.deepEqual([1, 2, 3, 4].map(killsToClimb), [1, 2, 3, 4], "release 704's rule, kept behind LISTENER_CYCLE.gatePieces");
  assert.deepEqual([1, 2, 3, 4].map(piecesToUnlock), [5, 5, 5, 5]);
});

test('the kill message says whether the Gate climbed or how many pieces remain', () => {
  const s = fresh();
  assert.match(listenerFelled(s), /\(1\/5\)\. 4 more unlock the Gate/);
  for (let k = 2; k <= 4; k++) listenerFelled(s);
  assert.match(listenerFelled(s), /\(5\/5\)\. The Gate is unlocked: it climbs to tier 2\./);
  assert.match(listenerFelled(s), /\(1\/5\)\. 4 more unlock the Gate/);
});

test('progress toward the next climb survives a save; an old journey keeps its tier', () => {
  const s = fresh(); listenerFelled(s); listenerFelled(s);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); ensureFarArray(back); assert.equal(back.farArray.gate, 1); assert.equal(back.farArray.toNext, 2);
  const old = freshSave(); old.farArray = { gate: 4, listeners: 3 }; ensureFarArray(old); assert.equal(old.farArray.gate, 4); assert.equal(old.farArray.toNext, 0);
});

test('the robot needs the second Gate opened (10 pieces) and the drone the fourth (20 pieces)', () => {
  const s = fresh(); s.perception.aperture = 3255;
  for (let k = 1; k <= 20; k++) {
    listenerFelled(s);
    assert.equal(mechGate(s).ok, k >= 10, `robot after ${k}`); assert.equal(droneGate(s).ok, k >= 20, `drone after ${k}`);
  }
});
