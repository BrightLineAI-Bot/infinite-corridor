// Tim, 2026-11-15: "The Oculus gets its own small dedicated button just under the top-right compass... One tap toggles Close
// View on and off", and "the utility button becomes a fourth assignable slot... alongside A, B and C". Then "we can do a b c
// and d... so they know there's no overlap": the four slot buttons are lettered A-D in on-screen reading order (display only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, actionReadiness, footprintOpen, mapWidth } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { SLOTS, SLOT_ACTIONS, SLOT_TOOLS, SLOT_ORDER, SLOT_LABELS, FRAME_TOOLS, UTILITY, slotLabel, ensureSlots, setSlot, slotTool, slotted, togglePreset, presetUtility, setPresetUtility, setPresetSlot, presetSlot, assignPresetItem } from '../src/spell-slots.ts';
import { swapPreset } from '../src/build-presets.ts';
import { OCULUS, OCULUS_HOOKS, oculusAvailable, oculusTarget, pressOculusButton } from '../src/oculus.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const once = (action) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k) => k === action && !used && (used = true), held: () => false }; };
const roundTrip = (s) => deserializeSave(serializeSave(s));
const clone = (x) => JSON.parse(JSON.stringify(x));
const withGpu = (ok, fn) => { const was = OCULUS_HOOKS.gpu; OCULUS_HOOKS.gpu = () => ok; try { return fn(); } finally { OCULUS_HOOKS.gpu = was; } };
function world(seed = 'SLOT-D', setup = () => {}) {
  const s = freshSave(); s.seed = seed; setup(s); const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld', false); g.enemies = []; return { s, g };
}
const room = (closeView = false) => { const W = 12, tiles = Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'floor', blocked: i % W === 0 || i % W === W - 1 || i < W || i >= W * (W - 1) })); return { area: 'dungeon', map: { width: W, height: W, tiles, building: { style: 'keep', base: 'k', floor: 0 } }, player: { x: 5, y: 5, facing: 'down' }, save: { closeView, overworldCloseView: false }, message: '' }; };

// ---- the Oculus button

test('the Oculus button: one tap switches Close View on, the next (after the cooldown) back off; no dais, no hold', () => {
  const { s, g } = world('OCB-1');
  withGpu(true, () => {
    assert.equal(OCULUS.button, 'switch'); assert.equal(oculusTarget(g), 'close');
    g.update(.016, once('oculus'), 1000);
    assert.equal(s.overworldCloseView, true, 'one tap: Close View'); assert.equal(g.oculus ?? null, null, 'no dais to step onto'); assert.equal(g.oculusWarp?.to, 'close', 'the warp flash');
    assert.equal(oculusTarget(g), 'top');
    g.update(.016, once('oculus'), 1100); assert.equal(s.overworldCloseView, true, 'a double tap inside the cooldown does not flicker'); assert.match(g.message, /still closing/);
    g.update(.016, once('oculus'), 1000 + OCULUS.cooldown * 1000 + 1); assert.equal(s.overworldCloseView, false, 'the next tap: back to the top-down view'); assert.equal(g.oculusWarp?.to, 'top');
    g.update(.016, idle, 9000); assert.equal(s.overworldCloseView, false, 'nothing happens without a tap');
  });
});

test('the Oculus button indoors flips the indoor switch, both ways', () => {
  const g = room(false);
  withGpu(false, () => {
    assert.equal(pressOculusButton(g, 100, () => true), true); assert.equal(g.save.closeView, true); assert.equal(g.save.overworldCloseView, false);
    assert.equal(pressOculusButton(g, 100 + OCULUS.cooldown * 1000, () => true), true); assert.equal(g.save.closeView, false);
  });
});

test('the Oculus button answers exactly where the old Oculus did (oculusAvailable), with the same refusals', () => {
  const { s, g } = world('OCB-2');
  withGpu(false, () => { const why = oculusAvailable(g).why; g.update(.016, once('oculus'), 1000); assert.equal(s.overworldCloseView, false); assert.equal(g.message, why); assert.match(why, /WebGL2/); });
  const big = { area: 'overworld', map: { width: 200, height: 200, tiles: Array.from({ length: 40000 }, () => ({ kind: 'grass' })) }, player: { x: 5, y: 5, facing: 'down' }, save: { closeView: false, overworldCloseView: false }, message: '' };
  withGpu(true, () => { assert.equal(oculusAvailable(big).ok, false); assert.equal(pressOculusButton(big, 0, () => true), false); assert.equal(big.save.overworldCloseView, false); assert.match(big.message, /cannot show/); });
  // the Oculus is no longer a preset's utility: choosing it (the old way) leaves slot D empty and the button still answers
  setPresetUtility(s, 0, 'oculus'); assert.equal(s.magicSkills.slots.d, null);
  withGpu(true, () => { g.update(.016, once('oculus'), 5000); assert.equal(s.overworldCloseView, true); });
});

test('the Oculus button is in both HUDs under the compass, on key O, and fallen Wayfarers cannot use it', () => {
  for (const file of ['../index.html', '../proving-ground/index.html']) {
    const html = readFileSync(new URL(file, import.meta.url), 'utf8'), left = html.slice(html.indexOf('class="left-controls'), html.indexOf('class="action-diamond'));
    assert.match(left, /<button id="oculusButton" class="oculus-button" type="button" data-action="oculus"/); assert.match(html, /id="navCompassSlot"/, 'the compass stays');
  }
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const compass = css.match(/\.left-controls \.compass-slot \{ position: fixed;[^}]*top: calc\(env\(safe-area-inset-top\) \+ (\d+)px\);[^}]*right: calc\(env\(safe-area-inset-right\) \+ (\d+)px\);[^}]*height: (\d+)px; \}/);
  const ocu = css.match(/\.left-controls \.oculus-button \{ position: fixed;[^}]*top: calc\(env\(safe-area-inset-top\) \+ (\d+)px\); right: calc\(env\(safe-area-inset-right\) \+ (\d+)px\); width: (\d+)px; height: (\d+)px;/);
  assert.ok(compass && ocu, 'both are pinned to the safe-area corner');
  const [cTop, cRight, cH] = compass.slice(1).map(Number), [oTop, oRight, oW, oH] = ocu.slice(1).map(Number);
  assert.ok(oTop >= cTop + cH, 'below the compass, never over it'); assert.ok(oTop - (cTop + cH) <= 10, 'just under it');
  assert.equal(oW, 36); assert.equal(oH, 36, 'the compass dial size'); assert.equal(oRight, cRight + (40 - 36) / 2, 'centred under the 40 px compass slot');
  assert.match(css, /\.left-controls \.compass-slot \.look-subject \{ top: calc\(100% \+ 48px\); \}/, 'Look mode\'s subject line drops below the button');
  assert.match(readFileSync(new URL('../src/input.ts', import.meta.url), 'utf8'), /o: "oculus"/);
  const { s, g } = world('OCB-3'); g.fallen = true;
  withGpu(true, () => { const inp = once('oculus'); g.tickFallen(.016, inp, 1000); assert.equal(inp.consume('oculus'), false, 'swallowed while fallen'); assert.equal(s.overworldCloseView, false); });
});

// ---- slot D

test('slot D is a fourth slot: it takes everything A, B and C take, and the Robot and Drone go in any slot', () => {
  assert.deepEqual(SLOTS, ['a', 'b', 'c', 'd']); assert.equal(SLOT_ACTIONS.d, 'utility', 'the utility button\'s own action');
  assert.deepEqual(FRAME_TOOLS, ['robot', 'drone']); for (const t of FRAME_TOOLS) assert.ok(SLOT_TOOLS.includes(t));
  const s = freshSave(); s.perception.aperture = 72; ensureSlots(s); assert.equal(s.magicSkills.slots.d, 'build', 'a new journey: Build, the old default');
  for (const k of [...SLOT_TOOLS, 'spell:cinder-dart']) {
    assert.equal(setSlot(s, 'd', k).ok, true, k); assert.equal(s.magicSkills.slots.d, k);
    for (const q of ['a', 'b', 'c']) assert.notEqual(s.magicSkills.slots[q], k, 'a slot holds a thing once');
  }
  assert.equal(slotted(s, 'd')?.name, 'Cinder Dart');
  for (const q of ['a', 'b', 'c']) for (const t of FRAME_TOOLS) { assert.equal(setSlot(s, q, t).ok, true); assert.deepEqual(slotTool(s, q), { tool: t, item: null }); }
  setSlot(s, 'd', 'item'); assert.equal(assignPresetItem(s, 0, 'lumenPhial').ok, true); assert.deepEqual(slotTool(s, 'd'), { tool: 'item', item: 'lumenPhial' });
  assert.match(assignPresetItem(s, 0, 'lumenPhial').message, /no item/); assert.equal(setSlot(s, 'd', 'skill:rift-step').ok, false, 'only what is learned');
});

test('slot D fires what the utility button fired: Build (key B\'s old button) and the Robot through its cycle', () => {
  const { s, g } = world('SLOTD-B'); s.materials.stone = 20; s.materials.wood = 20; s.aimMode = null;
  g.update(.016, once('utility'), 1000); assert.equal(s.aimMode, 'build', 'Build on D turns build mode on');
  s.aimMode = null; g.update(.016, once('build'), 1100); assert.equal(s.aimMode, 'build', 'the older build action reaches D too');
  // exact resume: build aim mode and D survive a save and a reload
  const back = migrateSave(clone(roundTrip(s))); assert.equal(back.aimMode, 'build'); assert.deepEqual(slotTool(back, 'd'), { tool: 'build', item: null });
  const r = freshSave(); r.seed = 'SLOTD-R'; r.perception.aperture = 3255; r.farArray = { listeners: 3, gate: 3 }; r.consumables.submersible = 1; r.materials = { ...(r.materials || {}), cinderIron: 5 };
  const h = new Game(r, 0); h.rx = 3; h.ry = 3; h.loadArea('overworld'); h.enemies = []; assert.equal(setSlot(r, 'd', 'robot').ok, true);
  let t = 1000; h.update(.05, once('utility'), t); assert.ok(h.mechUp(), `built and up: ${h.message}`);
  t += 100; h.update(.05, once('utility'), t); assert.equal(r.mech.empowered, true, 'a second press: Empowered');
  t += 100; h.update(.05, once('utility'), t); assert.equal(h.mechUp(), false, 'a third press stows it');
  // the same Robot from slot A's button (spell) answers the same way
  setSlot(r, 'a', 'robot'); assert.equal(r.magicSkills.slots.d, 'spell:ember-ring', 'moving it swaps what A held into D');
  t += 5000; r.mech.cooldown = 0; h.update(.05, once('spell'), t); assert.ok(h.mechUp(), `A calls the robot: ${h.message}`);
});

test('slot D casts a spell, shows its cooldown, and lights the Lantern, like A, B and C', () => {
  const { s, g } = world('SLOTD-S', (q) => { q.perception.aperture = 72; });
  setSlot(s, 'd', 'spell:grave-sun'); g.update(.016, once('utility'), 9000);
  assert.ok((s.magicSkills.cooldowns['spell:grave-sun'] || 0) > 0, 'D cast Grave Sun'); assert.ok(actionReadiness(g, 9000).utility.remaining > 0, 'D shows its cooldown');
  setSlot(s, 'd', 'lantern'); g.update(.016, once('utility'), 12000); assert.equal(s.lantern.lit, true);
  setSlot(s, 'd', null); assert.equal(g.castSlot('d'), false); assert.match(g.message, /Slot A is empty/, 'D is lettered A on screen');
});

// ---- migration

test('migration: every old utility value becomes slot D, for each preset and the loadout in hand, idempotently', () => {
  const cases = [['oculus', null], ['build', 'build'], ['robot', 'robot'], ['drone', 'drone'], ['frame', 'drone', 'drone'], ['frame', 'robot'], [undefined, 'build'], ['teleporter', 'build']];
  for (const [utility, want, mode] of cases) for (const active of [0, 1]) {
    const f = freshSave(); f.perception.aperture = 72; ensureSlots(f); const old = clone(f), ms = old.magicSkills;
    delete ms.slots.d; ms.slots.extra = 'slot-kept'; ms.preset = active; ms.futureThing = 'kept';
    ms.presets = [{ a: 'spell:ember-ring', b: null, c: null, utility: 'build', item: null, keep: 1 }, { a: 'spell:cinder-dart', b: null, c: null, item: null, keep: 2 }];
    if (utility === undefined) delete ms.presets[active].utility; else ms.presets[active].utility = utility;
    if (mode) old.mech = { mode };
    ms.slots.a = ms.presets[active].a;
    const m = migrateSave(old), p = m.magicSkills.presets, label = `${utility} (preset ${active + 1} active)`;
    assert.equal(p[active].d, want, `preset: ${label}`); assert.equal(m.magicSkills.slots.d, want, `loadout: ${label}`);
    assert.equal(p[1 - active].d, 'build', 'the other preset: its own utility (Build here)');
    assert.equal(p[active].utility, utility === undefined ? 'build' : UTILITY.choices.includes(utility) ? utility : utility === 'frame' ? (mode || 'robot') : 'build', 'the old field is kept');
    assert.equal(p[0].keep, 1); assert.equal(p[1].keep, 2); assert.equal(m.magicSkills.futureThing, 'kept', 'unknown fields kept'); assert.equal(m.version, 14);
    const again = migrateSave(clone(m)); assert.deepEqual(again.magicSkills, m.magicSkills, `idempotent: ${label}`);
    const viaCodec = migrateSave(clone(roundTrip(m))); assert.deepEqual(viaCodec.magicSkills, m.magicSkills, `through the save codec: ${label}`);
  }
});

test('migration: a D that A, B or C already holds stays empty (a slot holds a thing once); a stored D is never replaced', () => {
  const f = freshSave(); ensureSlots(f); const old = clone(f), ms = old.magicSkills;
  for (const q of [...ms.presets, ms.slots]) delete q.d;
  ms.presets[0] = { ...ms.presets[0], a: 'build', utility: 'build' }; ms.slots.a = 'build';
  const m = migrateSave(old); assert.equal(m.magicSkills.presets[0].d, null); assert.equal(m.magicSkills.slots.d, null); assert.equal(m.magicSkills.slots.a, 'build');
  const kept = clone(m); kept.magicSkills.presets[1].d = 'lantern'; kept.magicSkills.presets[1].utility = 'robot';
  assert.equal(migrateSave(kept).magicSkills.presets[1].d, 'lantern', 'D wins over an old utility once it exists');
});

// ---- presets

test('the preset button swaps all four slots, D included, in one tap', () => {
  const { s, g } = world('SLOTD-P', (q) => { q.perception.aperture = 72; });
  setSlot(s, 'd', 'robot'); setSlot(s, 'a', 'spell:cinder-dart');
  assert.equal(setPresetSlot(s, 1, 'd', 'spell:grave-sun').ok, true); assert.equal(presetSlot(s, 1, 'd'), 'spell:grave-sun'); assert.equal(s.magicSkills.slots.d, 'robot', 'the other preset only');
  setPresetUtility(s, 1, 'drone'); assert.equal(presetUtility(s, 1), 'drone'); setPresetSlot(s, 1, 'd', 'spell:grave-sun');
  g.update(.016, once('preset'), 1000); assert.equal(s.magicSkills.preset, 1); assert.equal(s.magicSkills.slots.d, 'spell:grave-sun', 'D swapped');
  assert.match(g.message, /Spell preset 2: A Grave Sun · B /);
  g.update(.016, once('preset'), 1100); assert.equal(s.magicSkills.slots.d, 'robot'); assert.equal(s.magicSkills.slots.a, 'spell:cinder-dart');
  // Tim's examples: a traversal preset (Rift Step, Aerial Step, Build, Drone) and a boss preset (attacks and a buff)
  const t = freshSave(); t.perception.aperture = 3255; t.farArray = { listeners: 6, gate: 5 }; for (const k of ['rift-step', 'aerial-step']) t.magicSkills.learned[k] = 1;
  const want = ['skill:rift-step', 'skill:aerial-step', 'build', 'drone'];
  SLOTS.forEach((q, i) => assert.equal(setSlot(t, q, want[i]).ok, true, want[i]));
  assert.deepEqual(SLOTS.map((q) => t.magicSkills.slots[q]), want); assert.deepEqual(slotTool(t, 'd'), { tool: 'drone', item: null });
  togglePreset(t); setSlot(t, 'a', 'spell:cinder-dart'); setSlot(t, 'b', 'spell:ember-ring'); setSlot(t, 'c', 'spell:grave-sun'); setSlot(t, 'd', 'spell:aegis');
  const boss = { ...t.magicSkills.slots }; swapPreset(t); assert.deepEqual(SLOTS.map((q) => t.magicSkills.slots[q]), want, 'back to traversal'); swapPreset(t); assert.deepEqual(t.magicSkills.slots, boss);
});

// ---- letters on screen

test('the four slot buttons are lettered A-D left to right on screen; the save keys are unchanged', () => {
  assert.deepEqual([...SLOT_ORDER], ['d', 'a', 'b', 'c'], 'the utility place, the quick pair, the diamond\'s slot');
  assert.deepEqual(SLOT_ORDER.map(slotLabel), ['A', 'B', 'C', 'D']); assert.deepEqual(Object.keys(SLOT_LABELS).sort(), [...SLOTS].sort());
  const s = freshSave(); assert.match(setSlot(s, 'c', 'lantern').message, /slot D\./); assert.match(togglePreset(s).message, /: A .* · B .* · C .* · D /);
  for (const file of ['../index.html', '../proving-ground/index.html']) {
    const html = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const [action, letter] of [['utility', 'A'], ['spell', 'B'], ['spell2', 'C'], ['spell3', 'D']]) assert.match(html, new RegExp(`data-action="${action}"[^>]*data-slot="${letter}"`), `${action} → ${letter}`);
    assert.match(html, /data-action="preset" aria-label="Spell preset 1: tap to switch">1<\/button>/, 'the preset button keeps its plain number');
    const left = html.indexOf('data-action="utility"'), b = html.indexOf('data-action="spell"'), c = html.indexOf('data-action="spell2"'), d = html.indexOf('data-action="spell3"');
    assert.ok(left < b && b < c && c < d, 'document order follows the letters');
  }
  const input = readFileSync(new URL('../src/input.ts', import.meta.url), 'utf8');
  for (const [key, action] of [['f', 'utility'], ['g', 'spell'], ['c', 'spell2'], ['b', 'spell3']]) assert.match(input, new RegExp(`\\b${key}: "${action}"`), `key ${key.toUpperCase()}`);
});
