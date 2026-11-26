// Reliable charged attacks on touch (Tim, 2026-11-25, Android Chrome, installed PWA): "It's hard to use the charged attacks. I
// think Android keeps recognising long presses as Chrome prompts... With the Quandrix Staff, I hit it 3 times and then hold the
// last hit, and it won't make the hand slam down... I can't just hit the button and hold it, then hit it and hold it."
// Every test here drives the real Input (input.ts createInput, through a DOM double whose buttons fire pointer events with
// real timing) and the real Game, one 60 fps frame at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createInput } from '../src/input.ts';
import { createCombatant } from '../src/combat.ts';
import { QUANDRIX } from '../src/quandrix-staff.ts';
import { CARBINE, drawCarbine } from '../src/tool-forms.ts';
import { CHARGE_GLYPH, GLYPHS, chargeScale, normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { QUANDRIX_STAFF, normalizeItemUpgrade, CARBINE_RANK } from '../src/items.ts';
import { IRON_FISTS } from '../src/brawler-spells.ts';
import { ensureLattice } from '../src/transit-lattice.ts';

const DT = 1000 / 60;
let clock = 0; // performance.now for input.ts while a test runs
const realNow = performance.now.bind(performance);
const withClock = (fn) => () => { (performance as any).now = () => clock; try { return fn(); } finally { (performance as any).now = realNow; } };

// --- a DOM double: buttons and a window that keep real listener lists
function target(tag = 'div') {
  const L: any = {}, e: any = { tagName: tag, dataset: {}, hidden: false, captured: new Set(), classList: { add() {}, remove() {} },
    addEventListener(t, f) { (L[t] ||= []).push(f); }, removeEventListener(t, f) { L[t] = (L[t] || []).filter((x) => x !== f); },
    setPointerCapture(id) { e.captured.add(id); }, releasePointerCapture(id) { e.captured.delete(id); }, contains: () => false, querySelectorAll: () => [], dispatchEvent() {},
    count: (t) => (L[t] || []).length,
    fire(t, ev = {}) { let prevented = false; const event = { type: t, pointerType: 'touch', target: e, currentTarget: e, preventDefault() { prevented = true; }, stopPropagation() {}, ...ev };
      for (const f of [...(L[t] || [])]) f(event); if (typeof e[`on${t}`] === 'function') e[`on${t}`](event); return prevented; } };
  return e;
}
function page() {
  const buttons: any = {}, canvas = target('canvas'), win = target('window'), doc = target('document');
  for (const a of ['attack', 'tool', 'dodge', 'jump']) buttons[a] = Object.assign(target('button'), { dataset: { action: a } });
  doc.querySelector = (s) => s === '#game' ? canvas : null; doc.querySelectorAll = (s) => s === '[data-action]' ? Object.values(buttons) : [];
  const input = createInput(doc, win);
  // A finger on a button: pointerdown on it (as the browser sends it), and later its pointerup (or cancel) on `where`.
  const down = (a, id = 7) => buttons[a].onpointerdown({ type: 'pointerdown', pointerType: 'touch', pointerId: id, clientX: 0, clientY: 0, preventDefault() {}, currentTarget: buttons[a], target: buttons[a] });
  const up = (a, id = 7, where = buttons[a], type = 'pointerup') => { where.fire(type, { pointerId: id }); if (where !== win) win.fire(type, { pointerId: id }); }; // it bubbles to the window
  return { buttons, canvas, win, doc, input, down, up };
}
function flatMap(g, n = 40) { g.map = { ...g.map, width: n, height: n, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: n * n }, (_, i) => ({ x: i % n, y: Math.floor(i / n), kind: 'ash', blocked: false })) }; g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; }
const breathArmor = (s, n) => { s.equipment.armor = normalizeSockets({ id: 'armor-breath', name: 'Coat', slot: 'armor', power: 5, tier: 'relic', affixes: [] }); s.glyphs[CHARGE_GLYPH.id] = n; for (let i = 0; i < n; i++) assert.equal(socketGlyph(s, 'armor', i, CHARGE_GLYPH.id).ok, true); };
// One frame: the input's own update, then the game's.
function stepper(g, input, each = null) {
  return (ms) => { const end = clock + ms; while (clock < end) { input.update(DT / 1000); g.player.invulnerableUntil = clock + 1e6; g.update(DT / 1000, input, clock); each?.(); clock += DT; } };
}

function staffGame({ breath = 0 } = {}) {
  const s = freshSave(); s.seed = 'CHARGE-HOLDS'; s.level = 15; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s);
  s.equipment.primary = { id: 'primary-qs', name: QUANDRIX_STAFF.name, slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [], awakened: { resonance: 'x', version: 1 } };
  if (breath) breathArmor(s, breath);
  const g = new Game(s, 0); flatMap(g, 32); Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [];
  return g;
}
function carbineGame({ breath = 0 } = {}) {
  const s = freshSave(); s.seed = 'CHARGE-CARBINE'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; Object.assign(s.stats, { Finesse: 30 }); ensureLattice(s); s.lattice.passives = [];
  s.equipment.secondary = normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + CARBINE_RANK, upgradeRank: CARBINE_RANK }); s.activeWeaponSlot = 'secondary';
  if (breath) breathArmor(s, breath);
  const g = new Game(s, 0); flatMap(g); Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [];
  return g;
}

test('the controls take no browser long press: CSS on the buttons and the game, the context menu and drag cancelled, the pointer kept', withClock(() => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const rule = css.match(/#game, #actions, \.action-diamond, \[data-action\][^{]*\{([^}]*)\}/); assert.ok(rule, 'a rule for the game surface and every action button');
  for (const p of [/touch-action: none/, /-webkit-touch-callout: none/, /(^|[^-])user-select: none/, /-webkit-user-select: none/, /-webkit-user-drag: none/]) assert.match(rule[1], p);
  const inputs = css.match(/input, textarea[^{]*\{([^}]*)\}/); assert.ok(inputs && /user-select: text/.test(inputs[1]), 'text fields keep selection');
  const src = readFileSync(new URL('../src/input.ts', import.meta.url), 'utf8'); assert.doesNotMatch(src, /selectstart/, 'no selectstart handler');
  const P = page();
  assert.equal(P.doc.fire('contextmenu', { target: P.buttons.attack }), true, 'a long press on a button opens no menu');
  assert.equal(P.doc.fire('contextmenu', { target: P.canvas }), true, 'nor on the game');
  assert.equal(P.canvas.fire('contextmenu'), true, 'the canvas itself cancels it too');
  assert.equal(P.doc.fire('dragstart', { target: P.buttons.tool }), true, 'a button (or its icon) is never dragged');
  assert.equal(P.doc.fire('contextmenu', { target: { tagName: 'INPUT' } }), false, 'a text field keeps its menu');
  assert.equal(P.doc.fire('contextmenu', { target: { tagName: 'DIV', isContentEditable: true } }), false);
  // the press captures its pointer, and its hold ends on its own pointerup or pointercancel only
  clock = 1000; P.down('attack', 11); P.input.update(); assert.ok(P.buttons.attack.captured.has(11), 'the button holds the pointer');
  assert.equal(P.input.held('attack'), true);
  P.buttons.attack.fire('pointerleave', { pointerId: 11 }); P.buttons.attack.fire('lostpointercapture', { pointerId: 11 }); assert.equal(P.input.held('attack'), true, 'drifting off the button or losing the capture keeps the hold');
  P.win.fire('pointerup', { pointerId: 12 }); assert.equal(P.input.held('attack'), true, 'another finger lifting does not end it');
  P.win.fire('pointerup', { pointerId: 11 }); assert.equal(P.input.held('attack'), false, 'its own pointerup, heard on the window wherever it lands, does');
  assert.equal(P.buttons.attack.count('pointerup') + P.win.count('pointerup') + P.win.count('pointercancel'), 0, 'and every listener is removed (nothing grows)');
  P.down('tool', 13); assert.equal(P.input.held('tool'), true); P.buttons.tool.fire('pointercancel', { pointerId: 13 }); assert.equal(P.input.held('tool'), false, 'a pointercancel is a release, never a hold stuck down');
}));

// The penultimate hand (Tim, 2026-11-25): every press throws its own hand; a hold slams the hand thrown before it, or, with none
// out, slams right at the Wayfarer's feet. Watches the hold as it begins: the hand it took (its seq and place) and the newest hand.
function holdWatch(g) {
  const w = { slam: false, seq: 0, newest: 0, at: null, centre: null };
  w.each = () => { const K = g.quandrix; if (!K) return; w.newest = Math.max(w.newest, K.seq);
    if (K.hold.on && K.hold.mode === 'slam' && !w.slam) { w.slam = true; w.seq = K.hold.hand.seq; w.at = { x: K.hold.hand.x, y: K.hold.hand.y }; w.centre = { x: g.player.x + .5, y: g.player.y + .45 }; } };
  return w;
}

test('Quandrix: tap, tap, hold the third throws hand 3 and slams hand 2, at any tapping pace', withClock(() => {
  for (const [gap, tap] of [[120, 50], [150, 60], [250, 80], [300, 100], [450, 90], [700, 120]]) {
    const g = staffGame(), P = page(); clock = 1000; const w = holdWatch(g), run = stepper(g, P.input, w.each);
    for (let i = 0; i < 2; i++) { P.down('attack'); run(tap); P.up('attack'); run(gap - tap); }
    P.down('attack'); run(1200); P.up('attack'); run(QUANDRIX.slam.max * 1000 + 400);
    assert.ok(w.slam, `gap ${gap} ms, taps ${tap} ms: a hand slams down`);
    assert.equal(w.seq, 2, `gap ${gap}: the hold slams hand 2 (the penultimate cast), not the newest`);
    assert.equal(w.newest, 3, `gap ${gap}: the held press threw hand 3 (and no hand was made for the hold)`);
    assert.equal(g.quandrix.hold.on, false, 'and it bursts (on its clock when let go outside the window)');
  }
}));

test('Quandrix: a held first press slams at the feet; tap then hold throws hand 2 and slams hand 1', withClock(() => {
  for (const pace of [0, 200, 600]) { // the first press held from a standstill, and after the staff's cadence is spent
    const g = staffGame(), P = page(); clock = 1000; const w = holdWatch(g), run = stepper(g, P.input, w.each);
    run(pace); P.down('attack'); run(QUANDRIX.hold.grace * 1000 + 200);
    assert.ok(w.slam, 'held: it slams'); assert.ok(Math.hypot(w.at.x - w.centre.x, w.at.y - w.centre.y) < .05, `right at the feet (${JSON.stringify(w.at)})`);
    assert.ok(w.newest === 2 && w.seq === 2, 'the press threw its own hand too (hand 1; the feet slam is hand 2)'); // and, awakened, it was recalled to the slam (no foe) and clapped (2026-11-26)
    assert.equal(g.quandrix.hands.filter((h) => h.on && h.mode === 'drift').length, 0, 'recalled: no hand flies on');
    P.up('attack'); run(QUANDRIX.slam.max * 1000 + 200); assert.equal(g.quandrix.hold.on, false);
  }
  for (const [gap, tap] of [[150, 60], [450, 90], [900, 100]]) {
    const g = staffGame(), P = page(); clock = 1000; const w = holdWatch(g), run = stepper(g, P.input, w.each);
    P.down('attack'); run(tap); P.up('attack'); run(gap - tap);
    P.down('attack'); run(1100); P.up('attack'); run(QUANDRIX.slam.max * 1000 + 400);
    assert.equal(w.seq, 1, `gap ${gap}: the hold slams hand 1`); assert.equal(w.newest, 2, `gap ${gap}: the held press threw hand 2`);
    assert.ok(w.at.x - w.centre.x > .3, 'out where hand 1 had flown, not at the feet');
  }
}));

test('Quandrix: a quick tap-tap-tap still casts three hands, never faster than the staff\'s cadence', withClock(() => {
  const g = staffGame(), P = page(); clock = 1000; const casts = []; let seq = 0;
  const run = stepper(g, P.input, () => { if (g.quandrix && g.quandrix.seq !== seq) { seq = g.quandrix.seq; casts.push(clock); } });
  for (let i = 0; i < 3; i++) { P.down('attack'); run(50); P.up('attack'); run(100); }
  run(1500);
  assert.equal(casts.length, 3, 'three taps, three hands');
  for (let i = 1; i < casts.length; i++) assert.ok(casts[i] - casts[i - 1] >= QUANDRIX.hand.cadenceMs - 1, `spaced by the cadence (${casts[i] - casts[i - 1]} ms)`);
  assert.equal(g.quandrix.hold.on, false, 'no tap became a hold');
}));

test('Quandrix: hold, release, hold slams twice; a world tap during the cadence is still refused', withClock(() => {
  const g = staffGame(), P = page(); clock = 1000; let slams = 0, on = false;
  const run = stepper(g, P.input, () => { const h = !!g.quandrix?.hold?.on && g.quandrix.hold.mode === 'slam'; if (h && !on) slams++; on = h; });
  P.down('attack'); run(QUANDRIX.hold.grace * 1000 + 1100); P.up('attack'); run(60); // a held slam, let go in its gold window
  P.down('attack'); run(QUANDRIX.hold.grace * 1000 + 1100); P.up('attack'); run(400);
  assert.equal(slams, 2, 'each hold slams');
  g.player.attackReadyAt = clock + 300; const before = g.quandrix.seq; assert.deepEqual(g.primaryAttack(clock, { x: 1, y: 0 }), []); run(500);
  assert.equal(g.quandrix.seq, before, 'a press with no button to hold (a world tap) during the cadence casts nothing, as before');
}));

test('the Carbine: hold, release, hold fires two charged beams whatever the gap', withClock(() => {
  for (const gap of [100, 400, 800, 1200]) {
    const g = carbineGame(), P = page(); clock = 1000; const shots = [];
    const run = stepper(g, P.input, () => { for (const p of g.projectiles) if (p.carbine && !p.shadow && !p.echo && !shots.includes(p)) shots.push(p); });
    P.down('tool'); run(1400); P.up('tool'); run(gap); P.down('tool'); run(1400 + CARBINE.cadence * 1000); P.up('tool'); run(100);
    assert.equal(shots.length, 2, `gap ${gap} ms: two beams`);
    assert.equal(shots[0].charge, 1, 'the first full');
    assert.equal(shots[1].charge, 1, `gap ${gap} ms: the second held press charged once the Carbine was ready (${shots[1].charge})`);
  }
  // a tap in the recovery fires nothing (unchanged), and a held press let go before ready fires nothing either
  const g = carbineGame(), P = page(); clock = 1000; const seen = new Set(); const run = stepper(g, P.input, () => { for (const p of g.projectiles) if (p.carbine && !p.shadow) seen.add(p); });
  P.down('tool'); run(60); P.up('tool'); run(100); P.down('tool'); run(300); P.up('tool'); run(1500);
  assert.equal(seen.size, 1, 'one beam: the press inside the recovery was let go before the Carbine was ready');
  assert.equal(g.carbine.pending.on, false);
}));

test('a pointercancel mid-charge releases the charge (it fires); lostpointercapture keeps charging', withClock(() => {
  const g = carbineGame(), P = page(); clock = 1000; const shots = [];
  const run = stepper(g, P.input, () => { for (const p of g.projectiles) if (p.carbine && !p.shadow && !shots.includes(p)) shots.push(p); });
  P.down('tool', 21); run(300); P.buttons.tool.fire('lostpointercapture', { pointerId: 21 }); P.buttons.tool.fire('pointerleave', { pointerId: 21 }); run(1100);
  assert.equal(shots.length, 0, 'still charging after the capture was lost'); assert.ok(g.carbine.charge, 'the charge lives');
  P.up('tool', 21, P.buttons.tool, 'pointercancel'); run(40);
  assert.equal(shots.length, 1, 'the cancel released it'); assert.equal(shots[0].charge, 1, 'as the full charge it was');
  // the Quandrix slam: a cancel lets it go (it lingers on its clock and bursts), never lost
  const q = staffGame(), Q = page(); clock = 5000; const qrun = stepper(q, Q.input);
  Q.down('attack', 22); qrun(QUANDRIX.hold.grace * 1000 + 300); assert.equal(q.quandrix.hold.on, true);
  Q.buttons.attack.fire('lostpointercapture', { pointerId: 22 }); qrun(100); assert.equal(q.quandrix.hold.released, false, 'still held');
  Q.up('attack', 22, Q.buttons.attack, 'pointercancel'); qrun(40); assert.equal(q.quandrix.hold.released, true, 'let go by the cancel');
  qrun(QUANDRIX.slam.max * 1000); assert.equal(q.quandrix.hold.on, false); assert.equal(q.message, QUANDRIX.messages.released, 'and it burst on its clock');
}));

test('the Iron Fists: a press held through the gate is thrown and charges; one let go before it is dropped (mashing unchanged)', withClock(() => {
  const make = () => { const s = freshSave(); s.seed = 'CHARGE-FISTS'; s.level = 15; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = [];
    s.equipment.primary = normalizeSockets({ id: 'p', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
    s.glyphs.echo = 1; assert.equal(socketGlyph(s, 'melee', 0, 'echo').ok, true); // one Echo: the jab (step 2) can be held too
    const g = new Game(s, 0); flatMap(g); Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
    g.enemies = [Object.assign(createCombatant('ashling', 11.2, 10), { id: 'foe', hp: 1e9, maxHp: 1e9, speedMultiplier: 1e-6, speed: 0, damage: 0, cooldown: 99, meleePatterns: [], aggro: false })]; return g; };
  let g = make(), P = page(); clock = 1000; let charged = false; let run = stepper(g, P.input, () => { if (g.fistCharge) charged = true; });
  P.down('attack'); run(40); P.up('attack'); run(20); // the cross, tapped
  assert.ok(g.fistRecoverUntil > clock + IRON_FISTS.buffer * 1000, 'pressing again well before the gate opens');
  charged = false; // the tap's own press began a charge (released as a tap): count only the second
  let thrownAt = 0; run = stepper(g, P.input, () => { if (g.fistCharge && !thrownAt) { charged = true; thrownAt = clock; } });
  const pressedAt = clock, gate = g.fistRecoverUntil; P.down('attack'); run(900); P.up('attack'); run(400);
  assert.ok(thrownAt && thrownAt >= gate - 1 && thrownAt - pressedAt <= IRON_FISTS.holdWait * 1000 + 2 * DT, `the held press began its charge as the step could begin (${thrownAt - pressedAt} ms)`);
  assert.ok(charged); assert.equal(g.fistCombo?.step, 2, 'and the jab was thrown on release');
  g = make(); P = page(); clock = 1000; let steps = 0, last = 0; run = stepper(g, P.input, () => { const s = g.fistCombo?.step || 0; if (s !== last && s) steps++; last = s; });
  P.down('attack'); run(40); P.up('attack'); run(20); P.down('attack'); run(30); P.up('attack'); run(600);
  assert.equal(steps, 1, 'an early tap let go before the gate throws nothing, as before');
}));

test('Gathered Breath: each copy shortens the Carbine and the slam charge, and the rings show a bead per copy', withClock(() => {
  const C = CARBINE.charge, S = QUANDRIX.slam;
  // the Carbine: time from the press to a full charge, through the real input
  const full = [];
  for (const n of [0, 1, 2, 3]) {
    const g = carbineGame({ breath: n }), P = page(); clock = 1000; let at = null; const t0 = clock;
    const run = stepper(g, P.input, () => { if (at == null && g.carbine?.charge && g.carbine.charge.held >= C.full - 1e-9) at = clock + DT - t0; });
    P.down('tool'); run(1500); P.up('tool'); run(40); full.push(Math.round(at));
    const want = (C.grace + (C.full - C.grace) * chargeScale(g.save, C.full - C.grace)) * 1000; assert.ok(Math.abs(at - want) <= 2 * DT + 1, `${n}: ${at} ms, want ${want}`);
  }
  for (let i = 1; i < full.length; i++) assert.ok(full[i] < full[i - 1] - 100, `each copy is felt: ${full.join(' / ')} ms`);
  assert.ok(full[3] < full[0] / 2, 'three: under half the press-to-full time');
  // the slam: time from the slam to its gold window
  const gold = [];
  for (const n of [0, 1, 2, 3]) {
    const g = staffGame({ breath: n }), P = page(); clock = 1000; let start = null, at = null;
    const run = stepper(g, P.input, () => { const H = g.quandrix?.hold; if (H?.on && start == null) start = clock; if (H?.on && at == null && H.held >= S.perfect[0]) at = clock - start; });
    P.down('attack'); run(2600); P.up('attack'); run(40); gold.push(Math.round(at));
    assert.ok(Math.abs(at - S.perfect[0] * CHARGE_GLYPH.per ** n * 1000) <= 2 * DT + 1, `${n}: the gold window opens ${at} ms into the slam`);
  }
  for (let i = 1; i < gold.length; i++) assert.ok(gold[i] < gold[i - 1]);
  // the description says what it does
  assert.match(GLYPHS[CHARGE_GLYPH.id].text.tool, /30% sooner/); assert.match(GLYPHS[CHARGE_GLYPH.id].text.tool, /bead/);
  // the beads: one per copy beside the Carbine's ring
  for (const n of [0, 3]) {
    const g = carbineGame({ breath: n }); g.carbineState().charge = { held: C.grace + .3, action: 'tool', dir: { x: 1, y: 0 }, clone: null };
    let fills = 0; const ctx: any = new Proxy({}, { get: (_, k) => k === 'fill' ? () => { fills++; } : k === 'save' || k === 'restore' || typeof k !== 'string' ? () => {} : (() => {}), set: () => true });
    drawCarbine(ctx, g, (p) => [p.x * 32, p.y * 32], 32, 0); (globalThis as any)[`fills${n}`] = fills;
  }
  assert.equal((globalThis as any).fills3 - (globalThis as any).fills0, 3, 'three beads drawn with three copies');
}));
