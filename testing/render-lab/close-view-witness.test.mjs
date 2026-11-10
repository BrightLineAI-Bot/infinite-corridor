import test from 'node:test';
import assert from 'node:assert/strict';
import { closeViewWitness, movementKey } from './close-view-witness.mjs';
import { waitForBrowserScene } from './resources.mjs';

test('crawl movement maps the desired world heading to the camera-relative keys', () => {
  assert.equal(movementKey(-Math.PI / 2, 1, 0), 'd');
  assert.equal(movementKey(Math.PI, 1, 0), 's');
  assert.equal(movementKey(Math.PI / 2, 0, 1), 'w');
  assert.equal(movementKey(NaN, 1, 0), null);
});

test('a failed public teleport is blocked instead of producing a landing receipt', async () => {
  const start = { x: 2, y: 3, yaw: 0, hp: 60, area: 'keep' };
  const crawl = { approach: { x: 8, y: 9 }, path: [], returnSteps: 12 };
  const results = [start, crawl, start];
  const witness = await closeViewWitness('routing-crawl-keep', {
    evaluate: async () => results.shift(),
    call: async () => assert.fail('no movement input before teleport verification'),
    wait: async () => {},
    capture: async () => assert.fail('no approach or landing screenshot before teleport verification'),
  });
  assert.equal(witness.status, 'blocked');
  assert.match(witness.reason, /did not arrive/);
});

test('readiness waits for a loading scene but stops on the first browser transport failure', async () => {
  let clock = 0, calls = 0;
  const timing = { budgetMs: 250, now: () => clock, delay: async ms => { clock += ms; } };
  assert.equal(await waitForBrowserScene(async () => ++calls === 3, timing), true);
  clock = calls = 0;
  await assert.rejects(waitForBrowserScene(async () => {
    calls++;
    throw Error('CDP timeout: Runtime.evaluate');
  }, timing), /CDP timeout/);
  assert.equal(calls, 1);
  assert.equal(clock, 0);
});
