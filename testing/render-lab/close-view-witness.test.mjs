import test from 'node:test';
import assert from 'node:assert/strict';
import { cleaverWitness, closeViewWitness, movementKey, routePanelWitness, summitWitness } from './close-view-witness.mjs';
import { waitForBrowserScene, navigationObservation, diagnosticObservation } from './resources.mjs';

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

test('route panel witnesses current-floor cues and requires the Pentagon overview', async () => {
  const state = { open: true, current: 'You are here: a chamber', routes: [], headings: [] };
  const capture = async name => name;
  const check = (scenario, report) => routePanelWitness(scenario, { evaluate: async () => report, capture });
  assert.equal(await check('routing-crawl-keep', null), null);
  assert.equal((await check('routing-crawl-keep', state)).status, 'observed');
  assert.equal((await check('routing-crawl-pentagon', state)).status, 'blocked');
  const headings = ['Discovered chambers (1)', 'Mapped connections (0)'];
  const result = await check('routing-crawl-pentagon', { ...state, headings });
  assert.equal(result.status, 'observed');
  assert.deepEqual(result.screenshots, ['known-routes']);
});

test('summit staging accepts real Act admission only to a fresh cloud encounter with a distinct target', async () => {
  const from = { rx: 38, ry: 18 }, to = { rx: 37, ry: 15 };
  const before = { scratch: true, area: 'overworld', section: from, gate: 'cloud' };
  const after = { scratch: true, area: 'dungeon', wave: 0, alive: 4, route: { from, to } };
  const input = [];
  const check = (state) => {
    const states = [before, state];
    return summitWitness({
      evaluate: async () => states.shift(), capture: async name => name, wait: async () => {},
      call: async (method, args) => input.push([method, args.key, args.type]),
    });
  };
  const result = await check(after);
  assert.equal(result.status, 'observed');
  assert.deepEqual(result.screenshots, ['summit-gate', 'cloud-hold-entry']);
  assert.deepEqual(input, [['Input.dispatchKeyEvent', 'e', 'keyDown'], ['Input.dispatchKeyEvent', 'e', 'keyUp']]);
  assert.equal((await check({ ...after, route: { from, to: from } })).status, 'blocked');
  assert.equal((await check({ ...after, alive: 0 })).status, 'blocked');
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

test('failed diagnosis retains only recognized stages from the fixture context', () => {
  const marker = 'ic-render-diagnostics:cleaver-echo-inspection';
  const event = (context, sample, stage, label = marker) => ({
    sessionId: 'target', method: 'Runtime.consoleAPICalled',
    params: { executionContextId: context, args: [label, sample, stage].map(value => ({ value })) },
  });
  const events = [
    event(3, 0, 'evaluation-entered'),
    event(1, 0, 'import-resolved'),
    event(3, 0, 'import-resolved', 'ordinary-game-message'),
    event(3, 0, 'import-resolved'),
    event(3, 2, 'diagnostics-returned'),
    event(3, 0, 'unrecognized-stage'),
  ];
  assert.deepEqual(diagnosticObservation(events, 'target', 3, marker), [
    { sample: 0, stage: 'evaluation-entered' },
    { sample: 0, stage: 'import-resolved' },
  ]);
});
