import test from 'node:test';
import assert from 'node:assert/strict';
import { cleaverWitness, closeViewWitness, movementKey } from './close-view-witness.mjs';
import { waitForBrowserScene, navigationObservation } from './resources.mjs';

test('crawl movement maps the desired world heading to the camera-relative keys', () => {
  assert.equal(movementKey(-Math.PI / 2, 1, 0), 'd');
  assert.equal(movementKey(Math.PI, 1, 0), 's');
  assert.equal(movementKey(Math.PI / 2, 0, 1), 'w');
  assert.equal(movementKey(NaN, 1, 0), null);
});

test('Cleaver evidence requires a newly accepted first cut from normal Attack input', async () => {
  const attack = { weapon: 'verge-cleaver', step: 1, acceptedAt: 42, contactMs: 75, durationMs: 360 };
  const input = [], samples = [{}, {}, attack];
  const result = await cleaverWitness({
    call: async (method, args) => input.push([method, args.key, args.type]),
    evaluate: async () => samples.shift(),
    wait: async () => {},
    capture: async name => name,
  });
  assert.equal(result.status, 'observed');
  assert.deepEqual(input, [['Input.dispatchKeyEvent', 'j', 'keyDown'], ['Input.dispatchKeyEvent', 'j', 'keyUp']]);
  assert.deepEqual(result.screenshots, ['before-attack', 'after-accepted-attack']);
  const stale = await cleaverWitness({
    call: async () => {}, evaluate: async () => attack, wait: async () => {}, capture: async name => name,
  });
  assert.equal(stale.status, 'blocked');
  assert.deepEqual(stale.screenshots, ['before-attack']);
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

test('navigation readiness ties buffered events to the new loader and live default context', () => {
  const event = (method, params, sessionId = 'target') => ({ method, params, sessionId });
  const events = [
    event('Page.frameNavigated', { frame: { id: 'main', loaderId: 'old' } }),
    event('Runtime.executionContextCreated', { context: { id: 1, auxData: { frameId: 'main', isDefault: true } } }),
    event('Page.lifecycleEvent', { frameId: 'main', loaderId: 'old', name: 'DOMContentLoaded' }),
    event('Runtime.executionContextsCleared', {}),
    event('Page.frameNavigated', { frame: { id: 'main', loaderId: 'next' } }),
    event('Runtime.executionContextCreated', { context: { id: 2, auxData: { frameId: 'main', isDefault: false } } }),
    event('Runtime.executionContextCreated', { context: { id: 3, auxData: { frameId: 'main', isDefault: true } } }),
    event('Page.lifecycleEvent', { frameId: 'main', loaderId: 'next', name: 'DOMContentLoaded' }),
    event('Network.loadingFailed', {}, 'other-tab'),
  ];
  const observe = () => navigationObservation(events, 'target', { frameId: 'main', loaderId: 'next' });
  assert.deepEqual(observe(), { committed: true, domReady: true, contextId: 3, failedRequests: 0, exceptions: 0 });
  events.push(event('Runtime.executionContextDestroyed', { executionContextId: 3 }), event('Network.loadingFailed', {}));
  assert.equal(observe().contextId, undefined);
  assert.equal(observe().failedRequests, 1);
});
