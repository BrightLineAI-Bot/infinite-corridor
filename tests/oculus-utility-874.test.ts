// Release 874 (Tim, 2026-11-10): "Make a close view button... It will be called the Oculus and it will sit where the compass
// now sits... The robot/power armor/drone and build buttons will be moved to this button and you can choose which one you
// want to select in the preset menu. The current build button will be another selectable slot... a new C button"; then
// "the player can now equip 3 spells across A, B and C".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, actionReadiness, footprintOpen, mapWidth } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { learnRank } from '../src/constellation.ts';
import { UTILITY, SLOTS, ensureSlots, setSlot, slotted, slotTool, togglePreset, presetUtility, setPresetUtility, activeUtility, setPresetButton, assignPresetItem } from '../src/spell-slots.ts';
import { OCULUS, OCULUS_HOOKS, oculusAvailable, oculusSpot, oculusTarget, pressOculus, tickOculus } from '../src/oculus.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const once = (action) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k) => k === action && !used && (used = true), held: () => false }; };
const roundTrip = (s) => deserializeSave(serializeSave(s));
function world(seed = 'OCULUS') {
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld', false); g.enemies = [];
  const W = mapWidth(g.map, g.area), H = g.map.tiles.length / W, open = (x, y) => footprintOpen(g.map, W, x, y);
  // a spot with open ground all round it, so the dais goes exactly one tile ahead
  let at = null; for (let y = 3; y < H - 3 && !at; y++) for (let x = 3; x < W - 3 && !at; x++) { let ok = true; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) ok &&= open(x + dx, y + dy); if (ok) at = { x, y }; }
  assert.ok(at, 'an open spot');
  Object.assign(g.player, { x: at.x, y: at.y, facing: 'right' }); return { s, g, W, H, open, at };
}
const withGpu = (ok, fn) => { const was = OCULUS_HOOKS.gpu; OCULUS_HOOKS.gpu = () => ok; try { return fn(); } finally { OCULUS_HOOKS.gpu = was; } };

test('the utility choices are data: Oculus, Build and Robot / Drone (one frame); Build is the default', () => {
  assert.deepEqual([...UTILITY.choices], ['oculus', 'build', 'frame']); assert.equal(UTILITY.default, 'build');
  for (const u of UTILITY.choices) assert.ok(UTILITY.names[u]);
  assert.equal(OCULUS.seconds, 5, 'the dais stands 5 s (Tim)'); assert.ok(OCULUS.cooldown > 0);
});

test('each preset keeps its utility choice through a save and a preset swap; an unknown choice falls back to Build', () => {
  const s = freshSave(); ensureSlots(s);
  assert.equal(presetUtility(s, 0), 'build'); assert.equal(presetUtility(s, 1), 'build'); assert.equal(activeUtility(s), 'build');
  assert.equal(setPresetUtility(s, 1, 'oculus').ok, true); assert.equal(setPresetUtility(s, 0, 'frame').ok, true);
  assert.equal(setPresetUtility(s, 0, 'zap').ok, false); assert.equal(presetUtility(s, 0), 'frame', 'unchanged');
  const back = roundTrip(s); assert.equal(presetUtility(back, 0), 'frame'); assert.equal(presetUtility(back, 1), 'oculus');
  togglePreset(back); assert.equal(activeUtility(back), 'oculus'); togglePreset(back); assert.equal(activeUtility(back), 'frame');
  const odd = freshSave(); odd.magicSkills.presets[0].utility = 'teleporter'; ensureSlots(odd); assert.equal(presetUtility(odd, 0), 'build');
});

test('an old save migrates: A and B kept, C empty, utility Build; a Build button that held something keeps it', () => {
  const learned = freshSave(); learned.perception.aperture = 72; learnRank(learned, 'motion');
  const old = JSON.parse(JSON.stringify(learned)); const ms = old.magicSkills;
  ms.slots = { a: 'spell:ember-ring', b: 'skill:quickening' }; ms.preset = 0; ms.futureSlotThing = 'kept';
  ms.presets = [
    { a: 'spell:ember-ring', b: 'skill:quickening', button: 'build', item: null, extra: 7 },
    { a: 'spell:cinder-dart', b: null, button: 'item', item: 'submersible' },
  ];
  const m = migrateSave(old), p = m.magicSkills.presets;
  assert.deepEqual(m.magicSkills.slots, { a: 'spell:ember-ring', b: 'skill:quickening', c: null }, 'A and B kept, C empty');
  assert.equal(m.version, 14); assert.equal(m.magicSkills.futureSlotThing, 'kept', 'unknown fields kept');
  assert.equal(p[0].utility, 'build'); assert.equal(p[0].c, null); assert.equal(p[0].button, 'build', 'the old field is kept'); assert.equal(p[0].extra, 7);
  assert.equal(p[1].utility, 'frame', 'the robot on the old Build button moves to the utility button'); assert.equal(p[1].c, null); assert.equal(p[1].item, 'submersible');
  assert.deepEqual([p[1].a, p[1].b], ['spell:cinder-dart', null]);
  // a spell or an item on the old Build button moves to C
  const o2 = JSON.parse(JSON.stringify(learned)); o2.magicSkills.slots = { a: 'spell:cinder-dart', b: null }; o2.magicSkills.preset = 0;
  o2.magicSkills.presets = [{ a: 'spell:cinder-dart', b: null, button: 'spell:ember-ring', item: null }, { a: null, b: null, button: 'item', item: 'lumenPhial' }];
  const m2 = migrateSave(o2);
  assert.equal(m2.magicSkills.slots.c, 'spell:ember-ring'); assert.equal(slotted(m2, 'c').name, 'Ember Ring'); assert.equal(m2.magicSkills.presets[1].c, 'item'); assert.equal(m2.magicSkills.presets[1].utility, 'build');
  togglePreset(m2); assert.deepEqual(slotTool(m2, 'c'), { tool: 'item', item: 'lumenPhial' });
  // migrating again changes nothing
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(m2))).magicSkills, m2.magicSkills);
});

test('three spells at once in A, B and C: each casts with its own cooldown, from its own button, and survives a save', () => {
  const s = freshSave(); s.perception.aperture = 72; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld', false); g.enemies = [];
  assert.equal(setSlot(s, 'a', 'spell:cinder-dart').ok, true); assert.equal(setSlot(s, 'b', 'spell:ember-ring').ok, true); assert.equal(setSlot(s, 'c', 'spell:grave-sun').ok, true);
  assert.deepEqual(SLOTS.map((q) => slotted(s, q)?.kind), ['spell', 'spell', 'spell']);
  assert.equal(g.castSlot('c'), true, 'C casts'); assert.equal(g.castSlot('c'), false, 'C recovers');
  assert.equal(g.castSlot('a'), true, 'A is its own spell'); assert.equal(g.castSlot('b'), true, 'B is its own spell');
  const r = actionReadiness(g, 0); assert.ok(r.spell3.remaining > 0, 'C shows its cooldown'); assert.ok(r.spell.remaining > 0 && r.spell2.remaining > 0);
  // the C button (input action spell3, key C) casts slot C
  s.magicSkills.cooldowns = {}; g.update(.016, once('spell3'), 9000); assert.ok((s.magicSkills.cooldowns['spell:grave-sun'] || 0) > 0, 'the C button cast Grave Sun');
  const back = roundTrip(s); assert.deepEqual(back.magicSkills.slots, { a: 'spell:cinder-dart', b: 'spell:ember-ring', c: 'spell:grave-sun' });
  // moving a spell already in C into A swaps them, as A and B always did
  setSlot(back, 'a', 'spell:grave-sun'); assert.deepEqual(back.magicSkills.slots, { a: 'spell:grave-sun', b: 'spell:ember-ring', c: 'spell:cinder-dart' });
  setSlot(back, 'c', null); assert.match(setSlot(back, 'c', null).message, /Slot C emptied/);
  g.save.magicSkills.slots.c = null; assert.equal(g.castSlot('c'), false); assert.match(g.message, /Slot C is empty/);
});

test('C holds Build or the preset item like A and B; the item reaches C; presets carry C', () => {
  const s = freshSave(); ensureSlots(s);
  assert.equal(setSlot(s, 'c', 'item').ok, true); assert.equal(assignPresetItem(s, 0, 'lumenPhial').ok, true); assert.deepEqual(slotTool(s, 'c'), { tool: 'item', item: 'lumenPhial' });
  togglePreset(s); assert.equal(s.magicSkills.slots.c, null, 'preset 2 has its own C'); setSlot(s, 'c', 'build'); togglePreset(s);
  assert.deepEqual(slotTool(s, 'c'), { tool: 'item', item: 'lumenPhial' }); togglePreset(s); assert.deepEqual(slotTool(s, 'c'), { tool: 'build', item: null });
  assert.equal(setPresetButton(s, 0, 'item'), 'item', 'the release-291 call sets C of a preset');
});

test('the utility button: Build builds (and keeps the old Build key), the frame calls the robot through its cycle', () => {
  const { s, g } = world('UTIL-B'); s.materials.stone = 20; s.materials.wood = 20; s.aimMode = null;
  g.update(.016, once('utility'), 1000); assert.equal(s.aimMode, 'build', 'Build on the utility button turns build mode on');
  s.aimMode = null; g.update(.016, once('build'), 1100); assert.equal(s.aimMode, 'build', 'the older build action reaches it too');
  const r = freshSave(); r.seed = 'UTIL-R'; r.perception.aperture = 3255; r.farArray = { listeners: 3, gate: 3 }; r.consumables.submersible = 1; r.materials = { ...(r.materials || {}), cinderIron: 5 };
  const h = new Game(r, 0); h.rx = 3; h.ry = 3; h.loadArea('overworld'); h.enemies = []; setPresetUtility(r, 0, 'frame');
  let t = 1000; h.update(.05, once('utility'), t); assert.ok(h.mechUp(), `built and up: ${h.message}`);
  t += 100; h.update(.05, once('utility'), t); assert.equal(r.mech.empowered, true, 'a second press: Empowered (the power armor)');
  t += 100; h.update(.05, once('utility'), t); assert.equal(h.mechUp(), false, 'a third press stows it');
});

test('Oculus: the dais opens one tile ahead (or the nearest free tile), lasts 5 s, and a second press does nothing', () => {
  const { s, g, open, at } = world('OC-1'); setPresetUtility(s, 0, 'oculus');
  withGpu(true, () => {
    assert.equal(oculusTarget(g), 'close'); assert.equal(oculusAvailable(g).ok, true);
    g.update(.016, once('utility'), 1000); assert.deepEqual({ x: g.oculus.x, y: g.oculus.y }, { x: at.x + 1, y: at.y }, 'one tile ahead (facing right)');
    assert.equal(g.oculus.to, 'close'); const first = g.oculus;
    assert.equal(pressOculus(g, 1500, open), false); assert.equal(g.oculus, first, 'a press while it stands does nothing');
    g.update(.016, idle, 1000 + OCULUS.seconds * 1000 - 20); assert.ok(g.oculus, 'still there just before 5 s');
    g.update(.016, idle, 1000 + OCULUS.seconds * 1000); assert.equal(g.oculus, null, 'gone at 5 s'); assert.equal(s.overworldCloseView, false, 'no switch');
    assert.equal(pressOculus(g, 1000 + OCULUS.seconds * 1000 + 10, open), false, 'a short cooldown'); assert.match(g.message, /still closing/);
  });
  // blocked ahead: the nearest free tile, never the Wayfarer's own
  const blockedAhead = (x, y) => !(x === at.x + 1 && y === at.y) && open(x, y);
  const spot = oculusSpot(g.player, blockedAhead); assert.ok(spot); assert.notDeepEqual(spot, { x: at.x + 1, y: at.y }); assert.notDeepEqual(spot, { x: at.x, y: at.y });
  assert.ok(Math.max(Math.abs(spot.x - (at.x + 1)), Math.abs(spot.y - at.y)) === 1, 'within one tile of the spot ahead');
  assert.equal(oculusSpot(g.player, () => false), null, 'no ground: no dais');
});

test('Oculus: stepping onto it switches to Close View, and a second dais switches back (overworld switch)', () => {
  const { s, g, at } = world('OC-2'); setPresetUtility(s, 0, 'oculus'); const was = s.closeView;
  withGpu(true, () => {
    g.update(.016, once('utility'), 1000); assert.ok(g.oculus);
    Object.assign(g.player, { x: at.x + 1, y: at.y }); g.update(.016, idle, 1200);
    assert.equal(g.oculus, null, 'the dais is used up'); assert.equal(s.overworldCloseView, true, 'Close View on'); assert.equal(s.closeView, was, 'the indoor switch untouched');
    assert.equal(g.oculusWarp?.to, 'close'); assert.equal(oculusTarget(g), 'top');
    const t = 1200 + OCULUS.cooldown * 1000 + 10; g.player.facing = 'left'; g.update(.016, once('utility'), t); assert.equal(g.oculus?.to, 'top');
    Object.assign(g.player, { x: at.x, y: at.y }); g.update(.016, idle, t + 100); // the dais is at at.x, ahead to the left of at.x + 1
    assert.equal(s.overworldCloseView, false, 'back to the top-down view'); assert.equal(g.oculusWarp?.to, 'top');
  });
});

test('Oculus indoors flips the indoor Close View switch, both ways', () => {
  const W = 12, tiles = Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'floor', blocked: i % W === 0 || i % W === W - 1 || i < W || i >= W * (W - 1) }));
  const g = { area: 'dungeon', map: { width: W, height: W, tiles, building: { style: 'keep', base: 'k', floor: 0 } }, player: { x: 5, y: 5, facing: 'down' }, save: { closeView: false, overworldCloseView: false }, message: '' };
  const open = (x, y) => !!tiles[y * W + x] && !tiles[y * W + x].blocked;
  withGpu(false, () => { // indoors keeps its own fallbacks, so no GPU check refuses it
    assert.deepEqual(oculusAvailable(g), { ok: true, to: 'close', setting: 'closeView' });
    assert.equal(pressOculus(g, 100, open), true); assert.deepEqual({ x: g.oculus.x, y: g.oculus.y }, { x: 5, y: 6 });
    g.player.y = 5.4; assert.equal(tickOculus(g, 200), 'warp'); assert.equal(g.save.closeView, true); assert.equal(g.save.overworldCloseView, false);
    assert.equal(oculusTarget(g), 'top'); assert.equal(pressOculus(g, 200 + OCULUS.cooldown * 1000, open), true); assert.equal(g.oculus.to, 'top');
    g.player.y = g.oculus.y - .5; assert.equal(tickOculus(g, 2000), 'warp'); assert.equal(g.save.closeView, false);
  });
});

test('Oculus: no dais where Close View is unavailable (no WebGL2 outdoors, a map past its bounds)', () => {
  const { s, g } = world('OC-3'); setPresetUtility(s, 0, 'oculus');
  withGpu(false, () => { g.update(.016, once('utility'), 1000); assert.equal(g.oculus ?? null, null); assert.match(g.message, /WebGL2/); });
  const big = { area: 'overworld', map: { width: 200, height: 200, tiles: Array.from({ length: 40000 }, () => ({ kind: 'grass' })) }, player: { x: 5, y: 5, facing: 'down' }, save: { closeView: false, overworldCloseView: false }, message: '' };
  withGpu(true, () => { assert.equal(oculusAvailable(big).ok, false); assert.equal(pressOculus(big, 0, () => true), false); assert.equal(big.oculus ?? null, null); assert.match(big.message, /cannot show/); });
});

test('the dais is runtime only: never saved, dropped on a change of map or when a pause outlasts it', () => {
  const { s, g } = world('OC-4'); setPresetUtility(s, 0, 'oculus');
  withGpu(true, () => {
    g.update(.016, once('utility'), 1000); assert.ok(g.oculus);
    const text = serializeSave(s); assert.doesNotMatch(text, /"oculus"\s*:\s*\{/, 'no dais in the save'); assert.equal(new Game(deserializeSave(text), 0).oculus ?? null, null);
    g.update(.016, idle, 1000 + 60000); assert.equal(g.oculus, null, 'a long pause: the dais is simply gone'); assert.equal(s.overworldCloseView, false);
    g.update(.016, once('utility'), 70000); assert.ok(g.oculus); g.loadArea('overworld', false); g.update(.016, idle, 70100); assert.equal(g.oculus, null, 'a new map drops it');
  });
});

test('the HUD: a fixed utility button where the compass was, C where Build was, the compass kept (top right)', () => {
  for (const file of ['../index.html', '../proving-ground/index.html']) {
    const html = readFileSync(new URL(file, import.meta.url), 'utf8'), left = html.slice(html.indexOf('class="left-controls'), html.indexOf('class="action-diamond')), diamond = html.slice(html.indexOf('class="action-diamond'));
    assert.match(left, /data-action="utility"/); assert.match(diamond, /class="core spell spell-c" data-action="spell3" data-slot="C"/); assert.doesNotMatch(html, /data-action="build"/);
    assert.match(html, /id="navCompass"[\s\S]*id="navGuidanceArrow"[\s\S]*id="navManualArrow"/, 'the compass and its arrows stay');
  }
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.left-controls \.compass-slot \{ position: fixed;[^}]*top:[^}]*right:/, 'the compass sits at the top right');
  const input = readFileSync(new URL('../src/input.ts', import.meta.url), 'utf8'); assert.match(input, /c: "spell3"/); assert.match(input, /b: "utility"/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/oculus\.js\?v=\d+/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'oculus'/);
});
