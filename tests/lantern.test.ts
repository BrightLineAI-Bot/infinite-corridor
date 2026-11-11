// The Lantern (Tim, 2026-11-11): "a LANTERN... the Wayfarer can put on, assignable to one of the A/B/C option buttons...
// Toggling it illuminates the area around the Wayfarer more"; the darkness itself is left as it is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { LANTERN, LANTERN_STOPS, SLOTS, SLOT_TOOLS, UTILITY, ensureLantern, ensureSlots, lanternLift, lanternLit, lanternReach, lanternShines, litDarkness, setSlot, slotTool, slotted, toggleLantern, togglePreset } from '../src/spell-slots.ts';
import { drawLanternDark } from '../src/renderer.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const once = (action) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k) => k === action && !used && (used = true), held: () => false }; };
const roundTrip = (s) => deserializeSave(serializeSave(s));
function world(seed = 'LANTERN') { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld', false); g.enemies = []; return { s, g }; }

test('the Lantern is data: a slot tool beside Build and Item, carried from the start, with its light in a table', () => {
  assert.deepEqual(SLOT_TOOLS, ['build', 'item', 'lantern']);
  assert.ok(!UTILITY.choices.includes('lantern'), 'the utility button keeps its four choices');
  for (const k of ['radius', 'inner', 'strength', 'glow', 'closeReach', 'maskPx']) assert.ok(Number.isFinite(LANTERN[k]) && LANTERN[k] > 0, k);
  assert.ok(LANTERN.strength < 1, 'the dark still reads at the heart'); assert.ok(LANTERN.inner > 0 && LANTERN.inner < 1);
  assert.ok(Object.isFrozen(LANTERN) && Object.isFrozen(LANTERN_STOPS));
  const s = freshSave(); assert.deepEqual(s.lantern, { lit: false }, 'a fresh journey: shuttered'); assert.equal(lanternLit(s), false);
  assert.equal(setSlot(s, 'a', 'lantern').ok, true, 'no source needed: it can be slotted at once');
});

test('assignment: the Lantern goes in A, B or C, moves between them, and survives preset swaps', () => {
  const s = freshSave(); ensureSlots(s);
  for (const q of SLOTS) {
    const r = setSlot(s, q, 'lantern'); assert.equal(r.ok, true); assert.match(r.message, new RegExp(`Lantern set in slot ${q.toUpperCase()}`));
    assert.deepEqual(slotTool(s, q), { tool: 'lantern', item: null }); assert.equal(slotted(s, q), null, 'not a castable');
    for (const o of SLOTS) if (o !== q) assert.notEqual(s.magicSkills.slots[o], 'lantern', `only one slot holds it (${o})`);
  }
  setSlot(s, 'b', 'lantern'); const was = s.magicSkills.slots.a; setSlot(s, 'a', 'lantern');
  assert.equal(s.magicSkills.slots.a, 'lantern'); assert.equal(s.magicSkills.slots.b, was, 'taking it into A swaps what A held into B');
  const m = togglePreset(s); assert.match(m.message, /Spell preset 2/); togglePreset(s); assert.deepEqual(slotTool(s, 'a'), { tool: 'lantern', item: null }, 'back on preset 1');
  setSlot(s, 'a', null); assert.equal(slotTool(s, 'a'), null, 'cleared');
});

test('toggle: a press of its slot lights it, the next shutters it', () => {
  const { s, g } = world('LANTERN-T'); setSlot(s, 'c', 'lantern');
  g.update(.016, once('spell3'), 1000); assert.equal(s.lantern.lit, true, g.message);
  g.update(.016, idle, 1100); assert.equal(s.lantern.lit, true, 'stays lit untouched');
  g.update(.016, once('spell3'), 1200); assert.equal(s.lantern.lit, false);
  setSlot(s, 'a', 'lantern'); g.update(.016, once('spell'), 1300); assert.equal(s.lantern.lit, true, 'from A as well');
  const r = toggleLantern(s); assert.deepEqual([r.ok, r.lit], [true, false]); assert.match(r.message, /shutter/); assert.match(toggleLantern(s).message, /lantern is lit/);
});

test('the toggle under stress: pressed every frame for 60 s, the state stays a plain boolean and nothing grows', () => {
  const { s, g } = world('LANTERN-60'); setSlot(s, 'b', 'lantern'); const keys = Object.keys(s).length;
  let t = 1000, lit = 0; for (let i = 0; i < 60 * 30; i++) { t += 1000 / 30; g.update(1 / 30, once('spell2'), t); if (s.lantern.lit) lit++; assert.equal(typeof s.lantern.lit, 'boolean'); }
  assert.equal(lit, 900, 'every press flips it'); assert.deepEqual(Object.keys(s.lantern), ['lit']); assert.equal(Object.keys(s).length, keys);
  assert.ok(Number.isFinite(g.player.hp) && Number.isFinite(g.player.x) && Number.isFinite(g.player.y));
});

test('saves: additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept', () => {
  const old = JSON.parse(JSON.stringify(freshSave())); delete old.lantern; const m = migrateSave(old);
  assert.equal(m.version, 14); assert.deepEqual(m.lantern, { lit: false }, 'a save from before the Lantern: shuttered');
  assert.deepEqual(migrateSave({ ...old, lantern: { lit: true, mine: 'kept' } }).lantern, { lit: true, mine: 'kept' });
  for (const bad of [{ lit: 'yes' }, { lit: 1 }, [], 'on', null, 7]) assert.deepEqual(migrateSave({ ...old, lantern: bad }).lantern.lit, false, JSON.stringify(bad));
  assert.equal(ensureLantern(null), null);
  const slotted = JSON.parse(JSON.stringify(freshSave())); slotted.magicSkills.slots.c = 'lantern'; slotted.magicSkills.presets[1].a = 'lantern';
  const back = migrateSave(slotted); assert.equal(back.magicSkills.slots.c, 'lantern'); assert.equal(back.magicSkills.presets[1].a, 'lantern', 'kept on the other preset too');
  togglePreset(back); assert.deepEqual(slotTool(back, 'a'), { tool: 'lantern', item: null });
});

test('exact resume: the lit Lantern and its slot come back as they were, and the next press shutters it', () => {
  const { s, g } = world('LANTERN-R'); setSlot(s, 'b', 'lantern'); g.update(.016, once('spell2'), 1000); assert.equal(s.lantern.lit, true);
  const r = new Game(roundTrip(g.exportSnapshot(1100)), 1200);
  assert.equal(r.save.lantern.lit, true); assert.deepEqual(slotTool(r.save, 'b'), { tool: 'lantern', item: null });
  r.update(.016, once('spell2'), 1300); assert.equal(r.save.lantern.lit, false);
  const again = new Game(roundTrip(r.exportSnapshot(1400)), 1500); assert.equal(again.save.lantern.lit, false);
});

test('the light lifts darkness only within its radius: full at the heart, easing out, none at the radius or beyond', () => {
  const R = LANTERN.radius, D = .9;
  assert.equal(lanternLift(0), LANTERN.strength); assert.equal(lanternLift(R * LANTERN.inner), LANTERN.strength);
  let prev = Infinity; for (let i = 0; i <= 100; i++) { const d = R * i / 100, k = lanternLift(d); assert.ok(k <= prev + 1e-12, `never rises outward (${d})`); assert.ok(k >= 0 && k <= LANTERN.strength); prev = k; }
  for (const d of [R, R + 1e-9, R + .5, R * 3, 1e6, Infinity]) { assert.equal(lanternLift(d), 0, `${d}`); assert.equal(litDarkness(D, d), D, `darkness untouched at ${d}`); }
  assert.equal(lanternLift(NaN), 0); for (const d of [0, 1, 2, R - .01]) assert.ok(litDarkness(D, d) < D, `lifted within the radius (${d})`);
  for (const d of [0, 1, R * 2]) assert.equal(litDarkness(D, d, false), D, 'shuttered: nothing lifted');
  assert.equal(LANTERN_STOPS[0][1], 1); assert.equal(LANTERN_STOPS.at(-1)[0], 1); assert.equal(LANTERN_STOPS.at(-1)[1], 0, 'the mask is clear at its rim');
  for (const [o, a] of LANTERN_STOPS) assert.ok(Math.abs(a * LANTERN.strength - lanternLift(o * R)) < 1e-12, 'the mask is lanternLift');
});

test('where it shines: dungeons only (lit), and Close View\'s torch reaches further there', () => {
  const s = freshSave(); assert.equal(lanternShines(s, 'dungeon'), false); assert.equal(lanternReach(s, 'dungeon'), 1);
  toggleLantern(s); assert.equal(lanternShines(s, 'dungeon'), true); assert.equal(lanternShines(s, 'overworld'), false);
  assert.equal(lanternReach(s, 'dungeon'), LANTERN.closeReach); assert.equal(lanternReach(s, 'overworld'), 1);
});

test('the renderer draws a darkness overlay unchanged when shuttered, and lit takes the light out of it round the Wayfarer only', () => {
  const made = [], log = [];
  const fakeCtx = (name, canvas) => new Proxy({ canvas, globalCompositeOperation: 'source-over', globalAlpha: 1 }, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => { log.push({ on: name, call: String(k), args: a, op: t.globalCompositeOperation, alpha: t.globalAlpha }); }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const was = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; this.name = `canvas${made.length}`; made.push(this); } getContext() { return (this.ctx ||= fakeCtx(this.name, this)); } };
  try {
    const screen = fakeCtx('screen', { width: 800, height: 1200 }), w = 400, h = 600, s = 36, x = 218, y = 320, R = LANTERN.radius * s;
    const dark = (c, ww, hh, arg) => { c.fillRect(0, 0, ww, hh); log.push({ on: c === screen ? 'screen' : 'layer', call: 'overlay', args: [arg] }); };
    drawLanternDark(screen, w, h, s, false, x, y, dark, .45);
    assert.deepEqual(log.map((q) => `${q.on}:${q.call}`), ['screen:fillRect', 'screen:overlay'], 'shuttered: the overlay straight onto the screen');
    assert.equal(made.length, 0, 'and nothing made'); log.length = 0;
    drawLanternDark(screen, w, h, s, true, x, y, dark, .45);
    const out = log.find((q) => q.call === 'drawImage' && q.op === 'destination-out');
    assert.ok(out, 'lit: the light is taken out of the overlay'); assert.deepEqual(out.args.slice(1), [x - R, y - R, 2 * R, 2 * R], 'centred on the Wayfarer, its size the radius');
    assert.equal(out.alpha, LANTERN.strength); assert.notEqual(out.on, 'screen', 'out of the layer, never the screen');
    assert.ok(log.some((q) => q.on === 'layer' && q.call === 'overlay' && q.args[0] === .45), 'the overlay itself drawn as it is, into the layer');
    const last = log.at(-1); assert.equal(last.on, 'screen'); assert.equal(last.call, 'drawImage'); assert.deepEqual(last.args.slice(1), [0, 0, w, h], 'the layer laid over the screen');
    const n = made.length; log.length = 0; for (let i = 0; i < 30; i++) drawLanternDark(screen, w, h, s, true, x, y, dark, .45);
    assert.equal(made.length, n, 'no canvas made per frame: the mask and the layer are reused'); assert.equal(n, 2);
  } finally { if (was === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = was; }
});

test('the Close View and Standard View hooks read the Lantern', async () => {
  const { readFileSync } = await import('node:fs');
  const cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), rd = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(cv, /lightR = Lt\.radius \* \(1 - dread \* Lt\.dreadShrink\) \* flick \* lanternReach\(g\.save, g\.area\)/);
  assert.match(rd, /drawLanternDark\(ctx, w, h, s, lanternLit, lanternX, lanternY, drawDread, g\.map\.building\.dread\)/);
  assert.match(rd, /drawLanternDark\(ctx, w, h, s, lanternLit, lanternX, lanternY, drawChasmPenumbra, s\)/);
  assert.match(rd, /function drawChasmPenumbra\(ctx, w, h, s\) \{ const P = CHASM_STARS\.penumbra, cx = w \/ 2, cy = h \/ 2, gr = ctx\.createRadialGradient\(cx, cy, s \* P\.inner, cx, cy, s \* P\.outer\); gr\.addColorStop\(0, "rgba\(4,3,14,0\)"\); gr\.addColorStop\(1, `rgba\(4,3,14,\$\{P\.dark\}\)`\); ctx\.fillStyle = gr; ctx\.fillRect\(0, 0, w, h\); \}/, 'the lit penumbra is the same drawing');
  assert.match(rd, /!closeViewCapturing\(\) && lanternShines\(g\.save, g\.area\)\) drawLanternGlow/, 'never baked into Close View\'s ground');
});
