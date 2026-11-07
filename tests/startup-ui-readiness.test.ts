import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the real bootstrap through UI registration. A delayed IndexedDB load
// must not expose callbacks whose lexical game/save bindings are still pending.
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const registrationEnd = main.indexOf('// Release 734 (S4):');
const startup = main.slice(0, registrationEnd)
  .replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];[^\n]*/gm, '')
  .replace(/^export /gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function harness(immediate = false) {
  const listeners = new Map(), nodes = new Map(), timers = [], intervals = [], calls = [];
  const node = (key) => {
    if (!nodes.has(key)) nodes.set(key, {
      textContent: '', open: false, classList: { toggle() {} },
      getContext: () => ({}), getBoundingClientRect: () => ({left: 0, top: 0, width: 800, height: 600}),
      addEventListener: (type, fn) => listeners.set(type, fn),
    });
    return nodes.get(key);
  };
  const save = { equipment: {primary: {name: 'Blade'}, secondary: {name: 'Tool'}}, activeWeaponSlot: 'primary', equippedSpell: 'ember-ring', aimMode: 'attack' };
  const game = { player: {x: 2, y: 3}, area: 'overworld', paused: false,
    enemyAt: () => null, placeShadowClone: () => false, aimAt: (...args) => calls.push(['aim', ...args]),
    primaryAttack: (...args) => calls.push(['attack', ...args]),
  };
  let resolveLoad;
  const loaded = immediate ? Promise.resolve(save) : new Promise((resolve) => {resolveLoad = resolve;});
  const dependencies = {
    document: { querySelector: node }, globalThis: {}, mountCloseViewControls: () => ({}),
    CLOSE_VIEW_HOOKS: {groundLayers: []}, loadSettings: () => ({}), createInput: () => ({}),
    loadSave: () => loaded, startGame: (loadedSave) => [loadedSave, game],
    setTimeout: (fn, ms) => {timers.push({fn, ms});},
    setInterval: (fn, ms) => {intervals.push({fn, ms});},
    SPELLS: {'ember-ring': {name: 'Ember Ring'}}, viewportSeq: null,
    closeViewScreenToWorld: () => null, screenToWorld: () => ({x: 4, y: 5}),
    persist: () => calls.push(['persist']), performance: {now: () => 1234},
    openInteraction: (id) => calls.push(['interaction', id]),
  };
  const run = new AsyncFunction(...Object.keys(dependencies), startup);
  return {listeners, nodes, timers, intervals, calls, game,
    start: () => run(...Object.values(dependencies)), resolve: () => resolveLoad?.(save),
    flushTimers: () => {for (const timer of timers.splice(0)) timer.fn();},
  };
}

for (const immediate of [false, true]) test(`game UI waits for ${immediate ? 'immediate' : 'delayed'} journey initialization`, async () => {
  const h = harness(immediate), boot = h.start();
  // Flush several virtual timer rounds while the asynchronous load is pending.
  // The old bootstrap installed the interval here and threw on its first tick.
  for (let i = 0; i < 6; i++) {
    h.flushTimers();
    for (const interval of h.intervals) interval.fn();
    h.listeners.get('worldtap')?.({detail: {clientX: 10, clientY: 20}});
  }
  assert.equal(h.intervals.length, 0);
  assert.equal(h.listeners.has('worldtap'), false);
  assert.deepEqual(h.calls, []);
  h.resolve(); await boot; h.flushTimers();
  assert.equal(h.intervals.length, 1);
  assert.equal(h.intervals[0].ms, 100);
  assert.equal(typeof h.listeners.get('worldtap'), 'function');
  h.intervals[0].fn();
  assert.equal(h.nodes.get('#attackInfo').textContent, 'ATTACK Blade');
  assert.equal(h.nodes.get('#spellInfo').textContent, 'SPELL Ember Ring');
  h.game.interactionRequested = 'mural';
  h.intervals[0].fn(); h.intervals[0].fn();
  assert.equal(h.calls.filter((c) => c[0] === 'interaction').length, 1);
  const tap = {detail: {clientX: 10, clientY: 20}};
  h.listeners.get('worldtap')(tap);
  assert.equal(h.calls.filter((c) => c[0] === 'attack').length, 1);
  assert.equal(h.calls.filter((c) => c[0] === 'persist').length, 1);
  h.game.paused = true;
  h.listeners.get('worldtap')(tap);
  assert.equal(h.calls.filter((c) => c[0] === 'attack').length, 1);
  h.flushTimers();
  assert.equal(h.intervals.length, 1);
});
