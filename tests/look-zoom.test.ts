import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';
import { createInput } from '../src/input.ts';

// Look mode (Tim, 2026-11-13): a long press on the compass in Close View; a pinch zooms the Close View camera onto the Wayfarer
// or the character/creature/prop in front; Attack, Dodge, a spell (Rift Step is one) and the Tool end it; Action, Jump and
// walking keep it. Runtime only. Drives the production camera without a GPU, as close-view-camera-comfort.test.ts does.
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : (...args) => { for (const v of args) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)}: ${v}`); },
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
const L = CV.CLOSE_VIEW.camera.look;
let now = 500000;
let extras = [];
// The renderer's capture: the Wayfarer and any extra actors (a townsperson) become the frame's draws.
function base(g) { return () => { const player = { x: g.player.x, y: g.player.y, fn() {} }; CV.closeViewTake([...extras.map((o) => ({ x: o.x, y: o.y, object: o, fn() {} })), player], player); }; }
function frame(g, n = 1) { for (let i = 0; i < n; i++) { now += 16; assert.equal(CV.closeViewFrame(ctx, g, 475, 661, now, base(g)), true); CV.closeViewLookGuard(g); } }
function fixture(scenario = 'heart') {
  const g = createLabFixture({ lab: 'close-view', scenario, now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = false; extras = [];
  let best = { x: g.player.x, y: g.player.y, r: -1 };
  for (const t of g.map.tiles) if (!t.blocked) {
    let r = 0;
    outer: for (; r < 6; r++) for (let y = t.y - r; y <= t.y + r; y++) for (let x = t.x - r; x <= t.x + r; x++) if (CV.closeViewWallAt(g.map, x + .5, y + .5)) break outer;
    if (r > best.r) best = { x: t.x, y: t.y, r };
  }
  g.player.x = best.x; g.player.y = best.y;
  CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now - 10000); // look east
  frame(g, 60);
  return g;
}
const eyeDist = (c, x, y, z) => Math.hypot(c.x - x, c.y - y, c.height - z);
function clearLine(g, ax, ay, bx, by) { for (let j = 1; j <= 40; j++) assert.equal(CV.closeViewWallAt(g.map, ax + (bx - ax) * j / 40, ay + (by - ay) * j / 40), false, `clear line ${j}`); }

test('the compass: a tap stays a tap, a held press is Look mode, a slide cancels it', () => {
  const h = CV.createLookHold();
  h.down(1, 10, 10, 0); assert.equal(h.due(200), false); assert.equal(h.up(1, 200), false); assert.equal(h.takeClick(), false, 'a tap still steps the compass');
  h.down(2, 10, 10, 1000); assert.equal(h.due(1000 + L.holdMs - 1), false); assert.equal(h.due(1000 + L.holdMs), true); assert.equal(h.due(1000 + L.holdMs + 50), false, 'fires once');
  h.hold(); assert.equal(h.up(2, 1000 + L.holdMs + 100), false, 'already held: the release does not toggle again'); assert.equal(h.takeClick(), true, 'its click is swallowed'); assert.equal(h.takeClick(), false);
  // a busy frame delayed the timer past the release: the release itself is the hold, once
  h.down(9, 10, 10, 2000); assert.equal(h.up(9, 2000 + L.holdMs + 300), true); assert.equal(h.due(2000 + L.holdMs + 400), false);
  h.down(3, 10, 10, 3000); h.move(3, 10 + L.holdSlop + 1, 10); assert.equal(h.due(3000 + L.holdMs * 2), false, 'a slide is no hold');
  h.down(4, 10, 10, 5000); assert.equal(h.due(5000 + L.holdMs), true); assert.equal(h.takeClick(), false, 'a hold that did nothing (standard view) leaves the click alone');
  assert.ok(L.holdMs >= 450, 'never fires on an ordinary tap (the input reads a tap as under 450 ms)');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /navCompass\.addEventListener\("click",\(\)=>\{\n\s*if\(lookHold\.takeClick\(\)\)return;/, 'the compass click consults the hold first');
  assert.match(main, /lookHold\.due\(performance\.now\(\)\)&&closeViewShowing\(game\)/, 'a hold toggles Look only in Close View');
  assert.match(main, /lookHold\.up\(e\.pointerId,t==="pointerup"\?lookStamp\(e\):NaN\)&&closeViewShowing\(game\)/, 'or its late release, only in Close View');
  assert.match(main, /closeViewLookActions\(game, input\.state\)/); assert.match(main, /closeViewLookGuard\(game\)/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="navCompassHelp"[^>]*>[^<]*press and hold/, 'the long press has an accessible description');
});

test('Look mode only in Close View; the pinch zooms within bounds onto the Wayfarer, never inside a wall', () => {
  CV.resetCloseViewCamera();
  assert.equal(CV.closeViewLookSet({ map: {}, player: { x: 0, y: 0 } }, true), false, 'not in Close View: no Look mode');
  const g = fixture(); const before = CV.closeViewCamera(), save = JSON.stringify(g.save);
  assert.equal(CV.closeViewLookZoomTo(1), 0, 'no zoom outside Look mode');
  assert.equal(CV.closeViewLookToggle(g), true); frame(g, 5);
  assert.ok(Math.abs(CV.closeViewCamera().distance - before.distance) < 1e-6, 'turning it on alone moves nothing');
  const px = g.player.x + .5, py = g.player.y + .75;
  // pinch out: the fingers spread four times apart, two doublings, past the nearest (clamped to 1)
  CV.closeViewLookZoomTo(CV.closeViewPinchZoom(0, 50, 200 * 4)); frame(g, 120);
  const s = CV.closeViewLookState(), c = CV.closeViewCamera();
  assert.equal(s.want, 1); assert.equal(s.subject, 'wayfarer');
  const d = eyeDist(c, s.focus[0], s.focus[1], s.focus[2]);
  assert.ok(Math.abs(d - Math.max(L.hero.near, CV.CLOSE_VIEW.camera.framing.bodyHeight * .3)) < .02, `almost first-person on the Wayfarer (${d})`);
  assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false); clearLine(g, px, py, c.x, c.y);
  assert.ok(s.heroAlpha >= .999, 'the Wayfarer is never faded while she is the subject');
  // once zoomed onto her, someone stepping in front (or an orbit sweeping past them) does not steal the subject
  extras = [{ kind: 'villager', id: 'look-passer-by', x: g.player.x + 2, y: g.player.y }]; frame(g, 20);
  assert.equal(CV.closeViewLookState().subject, 'wayfarer', 'the Wayfarer stays the subject while zoomed');
  CV.closeViewLookZoomTo(0); frame(g, 120); CV.closeViewLookZoomTo(.5); frame(g, 4);
  assert.equal(CV.closeViewLookState().subject, 'character', 'pinched back out, the subject is chosen afresh'); extras = [];
  // pinch in past the normal view: at most `out` tiles further, walls still bounding it
  CV.closeViewLookZoomTo(CV.closeViewPinchZoom(1, 400, 10)); frame(g, 160);
  assert.equal(CV.closeViewLookState().want, L.minZoom);
  const far = CV.closeViewCamera();
  assert.ok(far.distance >= before.distance - 1e-6 && far.distance <= before.distance + L.out + 1e-6, `at most a bit beyond the normal view, walls still bounding it (${before.distance} -> ${far.distance})`);
  assert.equal(CV.closeViewWallAt(g.map, far.x, far.y), false);
  assert.equal(JSON.stringify(g.save), save, 'Look mode is runtime-only');
});

test('zooming in beside a wall keeps the eye out of the wall', () => {
  const g = fixture('cellar'); g.player.x = 11; g.player.y = 5; CV.resetCloseViewCamera(); frame(g, 3);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    CV.closeViewPan((yaw - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, now); frame(g, 4);
    CV.closeViewLookSet(g, true); for (const z of [.3, .7, 1]) { CV.closeViewLookZoomTo(z); frame(g, 40); const c = CV.closeViewCamera(), s = CV.closeViewLookState();
      assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false, `yaw ${yaw} zoom ${z}`); clearLine(g, s.focus[0], s.focus[1], c.x, c.y); }
    CV.closeViewLookSet(g, false, true); frame(g, 2);
  }
});

test('a character in front is framed whole, then closer toward the face; the Wayfarer, not they, is faded between', () => {
  const g = fixture(); const px = g.player.x + .5, py = g.player.y + .75;
  const npc = { kind: 'villager', id: 'look-test-villager', x: g.player.x + 2, y: g.player.y }; extras = [npc];
  assert.ok(!CV.closeViewWallAt(g.map, npc.x + .5, npc.y + .75), 'the villager stands on open floor');
  CV.closeViewLookSet(g, true); frame(g, 2); CV.closeViewLookZoomTo(.35); frame(g, 120);
  let s = CV.closeViewLookState();
  assert.equal(s.subject, 'character'); assert.equal(s.key, npc);
  const half = s.focus[2];
  { // part way in, the eye still behind the Wayfarer: she stands between it and the villager and is faded, the villager never
    CV.closeViewLookZoomTo(.4); frame(g, 120); const m = CV.closeViewLookState(), e = CV.closeViewCamera();
    const ahead = (px - e.x) * (m.focus[0] - e.x) + (py - e.y) * (m.focus[1] - e.y) > 0;
    assert.ok(ahead, 'part way in, the Wayfarer is still in front of the eye');
    assert.ok(m.heroAlpha < 1 - (1 - L.heroFade) * .5 * m.share, `the Wayfarer between is faded (${m.heroAlpha}, share ${m.share})`);
    const half2 = CV.closeViewLookState().focus[2]; assert.ok(half2 > half, 'aiming higher as the zoom closes'); }
  CV.closeViewLookZoomTo(1); frame(g, 140); s = CV.closeViewLookState(); const c = CV.closeViewCamera();
  assert.ok(s.focus[2] > half + .2, 'closer pinches aim up toward the face');
  assert.ok(Math.abs(Math.hypot(c.x - s.focus[0], c.y - s.focus[1]) - L.folk.near * Math.cos(L.pitch * DEG)) < .03, 'framed at the character’s near distance');
  assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false);
  // the eye has closed past the Wayfarer, onto the villager: she is behind the lens (not drawn)
  assert.ok((px - c.x) * (s.focus[0] - c.x) + (py - c.y) * (s.focus[1] - c.y) < 0, 'the Wayfarer is behind the eye at full zoom');
  // the pitch looks at the face: the focus sits on the screen's aim row
  const q = CV.closeViewCamera(); assert.ok(Math.abs(q.pitch - Math.atan2(q.height - s.focus[2], Math.hypot(q.x - s.focus[0], q.y - s.focus[1]))) < .02);
  // a drag orbits round the subject, keeping it
  CV.closeViewPan(.8 / CV.CLOSE_VIEW.crescent.yaw, 0, now); frame(g, 60); s = CV.closeViewLookState();
  assert.equal(s.key, npc, 'orbiting keeps the subject'); const o = CV.closeViewCamera();
  assert.ok(Math.abs(Math.hypot(o.x - s.focus[0], o.y - s.focus[1]) - Math.hypot(c.x - s.focus[0], c.y - s.focus[1])) < .1, 'the orbit holds its distance');
  assert.ok(Math.hypot(o.x - c.x, o.y - c.y) > .2, 'and has moved round');
  void px; void py;
});
const DEG = Math.PI / 180;

test('exits: Attack, Dodge, every spell (Rift Step too) and the Tool; Action, Jump, a potion and walking keep it', () => {
  const g = fixture();
  for (const k of ['interact', 'jump', 'potion', 'utility', 'preset']) { CV.closeViewLookSet(g, true); CV.closeViewLookZoomTo(.8); assert.equal(CV.closeViewLookActions(g, { [k]: true, x: .7, y: -.7 }), false, k); assert.equal(CV.closeViewLookActive(), true, `${k} keeps Look mode`); }
  // walking keeps it (and the zoom)
  CV.closeViewLookZoomTo(1); for (let i = 0; i < 30; i++) { g.player.x += .02; frame(g); } assert.equal(CV.closeViewLookActive(), true); assert.equal(CV.closeViewLookState().want, 1);
  for (const k of ['attack', 'dodge', 'spell', 'spell2', 'spell3', 'tool']) {
    CV.closeViewLookSet(g, true); CV.closeViewLookZoomTo(1); frame(g, 30);
    assert.equal(CV.closeViewLookActions(g, { [k]: true }), true, k); assert.equal(CV.closeViewLookActive(), false, `${k} ends Look mode`);
    frame(g, 120); assert.equal(CV.closeViewLookState().zoom, 0, `${k}: the camera eases back to the normal distance`);
  }
  assert.deepEqual([...CV.LOOK_EXITS].sort(), ['attack', 'dodge', 'spell', 'spell2', 'spell3', 'tool']);
  // the real input's latched presses are what main.ts hands over
  const root = fakeRoot(), input = createInput(root, { addEventListener() {} });
  CV.closeViewLookSet(g, true); root.press('jump'); input.update(); assert.equal(CV.closeViewLookActions(g, input.state), false); input.consume('jump');
  root.press('interact'); input.update(); assert.equal(CV.closeViewLookActions(g, input.state), false); input.consume('interact');
  root.press('dodge'); input.update(); assert.equal(CV.closeViewLookActions(g, input.state), true); assert.equal(input.state.dodge, true, 'the press itself still reaches the game');
});

test('it resets: a pause or menu, leaving Close View, a new area, death and a reload', () => {
  let g = fixture();
  const on = () => { CV.closeViewLookSet(g, true); CV.closeViewLookZoomTo(1); frame(g, 20); assert.equal(CV.closeViewLookActive(), true); };
  // a talk or a shop pauses the game under its panel: the zoom is kept, frozen
  on(); const held = CV.closeViewCamera(); g.paused = true; g.pauseStarted = now; frame(g, 30); assert.equal(CV.closeViewLookActive(), true, 'a talk keeps Look mode'); assert.deepEqual(CV.closeViewCamera(), held, 'and the zoomed view holds still');
  g.paused = false; frame(g, 2); assert.equal(CV.closeViewLookActive(), true);
  // the pause menu, Pack, Map and Journal end it as they open (main.ts)
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  for (const fn of ['function openMap() {\n  atlasOpenedAt = performance.now(); sigilAtlas = false;', 'function openPack(tab) {', 'function openJournal(mode = "chronicle") {']) assert.ok(main.includes(`${fn}\n  closeViewLookSet(game, false, true);`), fn);
  assert.match(main, /function pause\(show = true(?:, urgent = false)?\) \{\n  if \(show\) \{ overlayPause = false; closeViewLookSet\(game, false, true\); \}/);
  CV.closeViewLookSet(g, false, true); assert.equal(CV.closeViewLookActive(), false); assert.equal(CV.closeViewLookState().zoom, 0, 'a menu snaps back'); frame(g, 2);
  on(); g.save.closeView = false; CV.closeViewLookGuard(g); g.save.closeView = true; assert.equal(CV.closeViewLookActive(), false, 'leaving Close View'); frame(g, 2);
  on(); const hp = g.player.hp; g.player.hp = 0; CV.closeViewLookGuard(g); g.player.hp = hp; assert.equal(CV.closeViewLookActive(), false, 'death'); assert.equal(CV.closeViewLookState().zoom, 0);
  on(); const map = g.map; g.map = { ...map }; CV.closeViewLookGuard(g); g.map = map; assert.equal(CV.closeViewLookActive(), false, 'a new area'); assert.equal(CV.closeViewLookState().zoom, 0);
  on(); CV.resetCloseViewCamera(); assert.equal(CV.closeViewLookActive(), false, 'a reload starts without it'); assert.equal(CV.closeViewLookState().zoom, 0);
  g = fixture(); assert.equal(CV.closeViewLookActive(), false);
});

test('Reduced Motion snaps the zoom rather than gliding it', () => {
  const g = fixture(); g.presentation = { ...(g.presentation || {}), reduceMotion: true };
  CV.closeViewLookSet(g, true); CV.closeViewLookZoomTo(1); frame(g, 1); assert.equal(CV.closeViewLookState().zoom, 1);
  CV.closeViewLookActions(g, { attack: true }); frame(g, 1); assert.equal(CV.closeViewLookState().zoom, 0);
});

// --- the pinch on the game area: a DOM double for mountCloseViewControls and createInput
function el(tag = 'div') {
  const listeners = {}, e = { tagName: tag, style: {}, dataset: {}, children: [], hidden: false, offsetWidth: 162, offsetHeight: 162, offsetLeft: 300, offsetTop: 480, offsetParent: {},
    setAttribute(k, v) { this[`@${k}`] = v; }, getAttribute(k) { return this[`@${k}`]; }, append(...c) { this.children.push(...c); }, insertBefore(c) { this.children.push(c); }, after() {},
    addEventListener(t, f, o) { (listeners[t] ||= []).push({ f, capture: !!o?.capture }); }, removeEventListener() {}, setPointerCapture() {}, contains: () => false,
    querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({ left: 300, top: 480, width: 162, height: 162, right: 462, bottom: 642 }), classList: { add() {}, remove() {}, toggle() {} },
    fire(t, ev) { let stopped = false; const event = { type: t, pointerType: 'touch', preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { stopped = true; }, ...ev };
      for (const pass of [true, false]) for (const l of listeners[t] || []) if (l.capture === pass && !stopped) l.f(event);
      if (!stopped && typeof this[`on${t}`] === 'function') this[`on${t}`](event); return event; } };
  return e;
}
function fakeRoot() {
  const buttons = {}, canvas = el('canvas'), root = { canvas, querySelector: (s) => s === '#game' ? canvas : null, querySelectorAll: (s) => s === '[data-action]' ? Object.values(buttons) : [], addEventListener() {},
    press(a) { buttons[a] ||= Object.assign(el('button'), { dataset: { action: a } }); buttons[a].onpointerdown?.({ preventDefault() {}, pointerId: 99, currentTarget: buttons[a] }); } };
  for (const a of ['attack', 'dodge', 'jump', 'interact', 'spell', 'tool']) buttons[a] = Object.assign(el('button'), { dataset: { action: a } });
  return root;
}

test('a pinch on the game area is never movement, aim or a world tap, and outside Look mode it does nothing', () => {
  const g = fixture();
  const actions = el(), cluster = el(), canvas = el('canvas'), movePad = { r: null };
  actions.querySelector = (s) => s === '.action-diamond' ? cluster : null;
  const doc = { getElementById: (id) => id === 'actions' ? actions : id === 'game' ? canvas : null, createElementNS: () => el('svg'), createElement: (t) => { const e = el(t); if (t === 'div') { movePad.r = e; e.getBoundingClientRect = () => ({ left: 16, top: 520, width: 120, height: 120, right: 136, bottom: 640 }); } return e; } };
  const released = [], host = { document: doc, innerWidth: 475, innerHeight: 661, performance: { now: () => now }, navigator: { maxTouchPoints: 5 }, addEventListener() {} };
  const root = { querySelector: (s) => s === '#game' ? canvas : null, querySelectorAll: () => [], addEventListener() {} };
  const input = createInput(root, { addEventListener() {} });
  // as main.ts wires it: the joystick finger joined for a pinch is released from the input
  const controls = CV.mountCloseViewControls(() => g, host, { releaseMovement: (id) => { released.push(id); input.releasePointer(id); } });
  controls.sync(); frame(g, 2); controls.sync();
  let taps = 0; canvas.addEventListener('worldtap', () => taps++);
  canvas.dispatchEvent = (ev) => { if (ev.type === 'worldtap') taps++; };
  // outside Look mode: two fingers on open screen are a camera drag and an ignored finger, no zoom
  canvas.fire('pointerdown', { pointerId: 1, clientX: 300, clientY: 200 }); canvas.fire('pointerdown', { pointerId: 2, clientX: 380, clientY: 260 });
  canvas.fire('pointermove', { pointerId: 2, clientX: 450, clientY: 330 }); assert.equal(controls.pinching, false); assert.equal(CV.closeViewLookState().want, 0);
  canvas.fire('pointerup', { pointerId: 1, clientX: 300, clientY: 200 }); canvas.fire('pointerup', { pointerId: 2, clientX: 450, clientY: 330 });
  // in Look mode: a drag joined by a second finger becomes a pinch
  CV.closeViewLookSet(g, true); const tapsBefore = taps;
  canvas.fire('pointerdown', { pointerId: 3, clientX: 240, clientY: 300 }); assert.equal(controls.dragging, true);
  canvas.fire('pointerdown', { pointerId: 4, clientX: 290, clientY: 300 }); assert.equal(controls.pinching, true); assert.equal(controls.dragging, false, 'the drag is let go');
  canvas.fire('pointermove', { pointerId: 4, clientX: 340, clientY: 300 }); // 50 -> 100 px: one doubling
  assert.ok(Math.abs(CV.closeViewLookState().want - L.pinchGain) < 1e-9, 'one doubling of spread zooms pinchGain');
  canvas.fire('pointerup', { pointerId: 3, clientX: 240, clientY: 300 }); assert.equal(controls.pinching, false);
  canvas.fire('pointermove', { pointerId: 4, clientX: 360, clientY: 360 }); assert.equal(controls.dragging, false, 'the spent finger turns nothing');
  canvas.fire('pointerup', { pointerId: 4, clientX: 360, clientY: 360 }); assert.equal(taps, tapsBefore, 'neither finger taps the world');
  // a finger on the joystick joined at once by a second is a pinch too: the Wayfarer stops, nothing walks
  canvas.fire('pointerdown', { pointerId: 5, clientX: 76, clientY: 580 }); // inside the move pad: the input owns it
  assert.equal(input.state.x, 0); canvas.fire('pointermove', { pointerId: 5, clientX: 76, clientY: 540 }); input.update(1); assert.ok(input.state.y < -.5, 'the joystick moves as usual');
  canvas.fire('pointerdown', { pointerId: 6, clientX: 200, clientY: 500 });
  assert.equal(controls.pinching, true); assert.ok(released.includes(5), 'the joystick finger is released from movement');
  canvas.fire('pointermove', { pointerId: 5, clientX: 76, clientY: 400 }); input.update(1); assert.ok(Math.abs(input.state.y) < 1e-6, 'no movement while pinching');
  canvas.fire('pointerup', { pointerId: 6, clientX: 200, clientY: 500 }); canvas.fire('pointerup', { pointerId: 5, clientX: 76, clientY: 400 }); assert.equal(taps, tapsBefore);
  // walking alone in Look mode still works, and a late second finger (after pinchJoinMs) is just a camera drag
  canvas.fire('pointerdown', { pointerId: 7, clientX: 76, clientY: 580 }); now += L.pinchJoinMs + 50;
  canvas.fire('pointerdown', { pointerId: 8, clientX: 300, clientY: 300 }); assert.equal(controls.pinching, false); assert.equal(controls.dragging, true);
  canvas.fire('pointermove', { pointerId: 7, clientX: 76, clientY: 530 }); input.update(1); assert.ok(input.state.y < -.5, 'walking in Look mode');
  assert.equal(CV.closeViewLookActive(), true, 'walking does not end Look mode');
});
