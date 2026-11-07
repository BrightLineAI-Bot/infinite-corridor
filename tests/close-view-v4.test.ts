// Close View, version 4 (release 793, Tim, 2026-11-06): a floor that holds still (the GPU scene, close-view-gl.ts), a ceiling,
// detailed walls, pits with depth and lava, smooth framing, drag-anywhere camera control (the default; the crescent kept as an
// option, with a wider band and more gain) and the quick turnaround.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { createInput } from '../src/input.ts';
import * as CV from '../src/close-view.ts';
import * as GL from '../src/close-view-gl.ts';
import { createLabFixture, findLabPentagon } from '../src/proving-ground-labs.ts';

const W = 390, H = 844;
const DRAW = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText', 'clearRect']);
function recorder() {
  const r = { draws: 0, log: [], keep: false };
  r.ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
    get: (o, k) => k in o ? o[k] : (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${String(k)} was given ${v}`); if (DRAW.has(k)) r.draws++; if (r.keep) r.log.push(`${String(k)}(${a.map((v) => typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v === 'string' ? v : typeof v).join(',')})`); },
    set: (o, k, v) => { o[k] = v; if (r.keep && typeof v !== 'object') r.log.push(`${String(k)}=${v}`); return true; } });
  return r;
}
const ground = recorder();
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ground.ctx }));
let T = 200000; const frame = (g, n = 1, step = 16) => { for (let i = 0; i < n; i++) render(recorder().ctx, g, W, H, (T += step)); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function room(scenario = 'heart') {
  const f = createLabFixture({ lab: 'close-view', scenario, now: 1000 }), g = f.game, w = g.map.width, h = g.map.height, open = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !g.map.tiles[y * w + x].blocked;
  let best = null; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0; while (r < 5) { let ok = true; for (let dy = -r - 1; dy <= r + 1 && ok; dy++) for (let dx = -r - 1; dx <= r + 1 && ok; dx++) ok = open(x + dx, y + dy); if (!ok) break; r++; } if (!best || r > best.r) best = { x, y, r }; }
  const proto = g.enemies.find((e) => !e.dead) || g.enemies[0]; for (const e of g.enemies) e.dead = true;
  g.player.x = best.x; g.player.y = best.y; g.player.facing = 'up'; CV.resetCloseViewCamera();
  const foe = (id, dx, dy) => { const e = { ...proto, id, x: best.x + dx, y: best.y + dy, dead: false, hidden: false, ambient: false, hp: 50, maxHp: 50, telegraph: 0, hitFlash: 0, pack: null }; g.enemies.push(e); return e; };
  return { g, foe, best };
}

test('the floor is exact and world-anchored: every pixel\'s floor point projects back onto it, and the texture origin is a whole pixel at every scale', () => {
  const { g } = room(); frame(g, 3);
  let worst = 0, n = 0; for (let y = H * .45; y < H; y += 37) for (let x = 0; x <= W; x += 29) { const P = CV.closeViewFloorRay(x, y); if (!P) continue; const q = CV.closeViewProject(P.x, P.y, 0); worst = Math.max(worst, Math.hypot(q.sx - x, q.sy - y)); n++; }
  assert.ok(n > 50 && worst < 1e-6, `${n} pixels round-trip exactly (worst ${worst})`);
  for (const ts of [.75, 1, 1.25]) for (let i = 0; i < 200; i++) { const px = 3 + i * .0137, py = 7 - i * .0091, o = CV.closeViewGroundOrigin(px, py, 792, ts);
    assert.ok(Math.abs(o.x - Math.round(o.x)) < 1e-9 && Math.abs(o.y - Math.round(o.y)) < 1e-9, `ts ${ts}: whole device pixels (${o.x}, ${o.y})`); }
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(src, /float t = -u_hc \/ dir\.z; vec2 P = u_cam \+ dir\.xy \* t;/, 'the GPU floor casts a ray to the floor plane per pixel');
});

test('without WebGL2 (here, and on a lost context) Close View draws its 2D view; every tier asks for the GPU scene', () => {
  const { g } = room(); for (const q of ['low', 'balanced', 'full']) { g.presentation = { effectiveQuality: q }; frame(g, 2); assert.equal(CV.closeViewStats.gl, 0); assert.ok(CV.closeViewStats.bands > 0, `${q}: the 2D floor drew`); assert.equal(CV.CLOSE_VIEW.quality[q].gl, true); }
  assert.equal(GL.closeViewGLStats.ready, false, 'no GPU scene here');
  const Q = CV.CLOSE_VIEW.quality; assert.ok(Q.low.glScale < Q.full.glScale && !Q.low.ceilingDetail && !Q.low.relief && !Q.low.lavaLight && Q.balanced.relief, 'the low tier is cheaper');
});

test('the hazard mask: holes, lava, chasms and bridges by tile; the sky where it is open; nothing shown that the fog of war hides', () => {
  const t = (kind, extra = {}) => ({ kind, blocked: false, ...extra });
  const map = { width: 4, height: 2, tiles: [t('flagFloor'), t('floorHole', { hole: true }), t('lava'), t('plankFloor', { bridge: true }), t('keepWall', { blocked: true }), t('yardGrass'), t('void', { chasm: true, blocked: true }), t('flagFloor', { open: true })] };
  const all = GL.closeViewMask(map, null, new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0])), at = (m, i, c) => m.data[i * 4 + c];
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((i) => at(all, i, 1)), [0, 1, 2, 4, 0, 0, 3, 0], 'hazard codes'); assert.equal(at(all, 1, 2), 1, 'the safe drop'); assert.equal(all.lava, 1);
  assert.deepEqual([0, 5, 7].map((i) => at(all, i, 0)), [1, 0, 0], 'a ceiling indoors; the sky over a yard and an open roof'); assert.equal(at(all, 4, 3), 1, 'a wall');
  const fogged = GL.closeViewMask(map, (x) => x === 0); assert.equal(at(fogged, 1, 1), 0, 'an unseen hole shows nothing'); assert.equal(at(fogged, 2, 1), 0);
});

test('a ladder down lies flat on the floor (drawn into the ground, not a standing card); other objects stay cards', () => {
  assert.equal(CV.closeViewFlatObject({ kind: 'buildingStair', dir: 'down' }), true); assert.equal(CV.closeViewFlatObject({ kind: 'buildingStair', dir: 'up' }), false); assert.equal(CV.closeViewFlatObject({ kind: 'chest' }), false);
  const f = createLabFixture({ lab: 'close-view', scenario: 'hazards', now: 1000 }), g = f.game; CV.resetCloseViewCamera(); frame(g, 2);
  assert.ok(g.map.objects.some((o) => o.kind === 'buildingStair' && o.dir === 'down'), 'an upper floor has its ladder down'); assert.ok(CV.closeViewStats.flat >= 1, `flat on the floor (${CV.closeViewStats.flat})`);
  assert.ok(g.map.tiles.some((q) => q.kind === 'lava') && g.map.tiles.some((q) => q.hole), 'the hazards lab has lava and a hole');
});

test('smooth motion: sprites drawn on the world\'s pixel grid leave the Wayfarer exactly where it was; the camera follows on a spring, never far behind, at once after a jump', () => {
  const { g } = room(); frame(g, 3); g.player.x += .0123; g.player.y -= .0071; const x = g.player.x, y = g.player.y; frame(g, 1); assert.equal(g.player.x, x); assert.equal(g.player.y, y, 'restored exactly');
  const C = CV.CLOSE_VIEW.camera, yaw = CV.closeViewCamera().yaw; let worst = 0;
  for (let i = 0; i < 40; i++) { g.player.x += Math.cos(yaw) * .07; g.player.y += Math.sin(yaw) * .07; if (CV.closeViewWallAt(g.map, g.player.x + .5, g.player.y + .75)) break; frame(g, 1);
    const c = CV.closeViewCamera(), d = Math.hypot(g.player.x + .5 - c.x, g.player.y + .75 - c.y); worst = Math.max(worst, d); }
  assert.ok(worst <= CV.closeViewPreset(g).distance + C.followMax + CV.closeViewPreset(g).shoulder + .05, `the follow lag is bounded (${worst.toFixed(2)})`);
  assert.ok(C.follow > 0 && C.followMax > 0 && C.followSnap > C.followMax, 'numbers in the table');
});

// A page for the controls: #actions with the action cluster, a #game canvas whose capturing listeners run before its
// on-handlers (as the browser's do at the target), and the real input module bound to the same canvas.
function page(vw = 400, vh = 800) {
  const mk = (tag) => { const el = { tag, children: [], style: {}, attrs: {}, listeners: {}, cap: {}, hidden: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f, o) { ((o === true || o?.capture) ? this.cap : this.listeners)[t] ||= []; ((o === true || o?.capture) ? this.cap : this.listeners)[t].push(f); }, removeEventListener() {}, dispatchEvent(e) { (this.listeners[e.type] || []).forEach((f) => f(e)); },
    append(...c) { for (const x of c) { x.parent = this; this.children.push(x); } }, insertBefore(n, ref) { n.parent = this; this.children.splice(this.children.indexOf(ref), 0, n); }, after(n) { const p = this.parent; n.parent = p; p.children.splice(p.children.indexOf(this) + 1, 0, n); },
    querySelector(sel) { return sel === '.action-diamond' ? this.children.find((c) => c.cls === 'action-diamond') : sel === '#game' ? canvas : null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return this.className === "close-move-pad" ? { left: 34, top: 454, width: 92, height: 92 } : { left: 220, top: 560, width: 162, height: 162 }; }, setPointerCapture() {}, set innerHTML(v) { this._html = v; } }; return el; };
  const actions = mk('section'), cluster = mk('div'), canvas = mk('canvas'); cluster.cls = 'action-diamond'; cluster.offsetWidth = 162; cluster.offsetHeight = 162; cluster.offsetLeft = 220; cluster.offsetTop = 560; actions.append(cluster); actions.getBoundingClientRect = () => ({ left: 0, top: 0, width: vw, height: vh });
  const doc = { getElementById: (id) => id === 'actions' ? actions : id === 'game' ? canvas : null, createElementNS: (ns, t) => mk(t), createElement: (t) => mk(t) };
  const host = { document: doc, performance: { now: () => T }, addEventListener() {}, innerWidth: vw, innerHeight: vh };
  // dispatch on the canvas: capturing listeners first; a stopImmediatePropagation keeps the on-handler from it
  const fire = (type, id, x, y) => { let stopped = false; const e = { type, pointerId: id, clientX: x, clientY: y, pointerType: 'touch', preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { stopped = true; } };
    for (const f of canvas.cap[type] || []) { f(e); if (stopped) return true; } canvas['on' + type]?.(e); for (const f of canvas.listeners[type] || []) f(e); return stopped; };
  const root = { querySelector: (s) => s === '#game' ? canvas : null, querySelectorAll: () => [], addEventListener() {}, hidden: false };
  return { doc, host, canvas, actions, fire, root };
}

test('drag anywhere (the default): a drag outside the joystick pans on either side; a tap is still a tap', () => {
  const { g } = room(); assert.equal(g.save.closeViewCamera, 'drag', 'the default control'); const P = page(), ui = CV.mountCloseViewControls(() => g, P.host);
  frame(g, 2); ui.sync(); assert.equal(ui.svg.style.display, 'none', 'drag mode: no crescent drawn'); assert.equal(ui.lock.style.display, 'grid', 'the bullseye stays');
  const y0 = CV.closeViewCamera().yaw;
  assert.equal(P.fire('pointerdown', 1, 300, 300), true, 'a press on the right is the camera\'s'); for (let i = 1; i <= 10; i++) { T += 16; P.fire('pointermove', 1, 300 + i * 6, 300); ui.sync(); }
  P.fire('pointermove', 1, 372, 700); // sliding down over the action buttons: still the camera's
  P.fire('pointerup', 1, 372, 700); ui.sync(); assert.ok(wrap(CV.closeViewCamera().yaw - y0) > .2, `dragging right turns the view right (${wrap(CV.closeViewCamera().yaw - y0).toFixed(3)})`);
  const beforeLeft = CV.closeViewCamera().yaw;
  assert.equal(P.fire('pointerdown', 2, 80, 400), true, 'an off-stick press on the left belongs to the camera');
  P.fire('pointermove', 2, 132, 400); P.fire('pointerup', 2, 132, 400);
  assert.ok(wrap(CV.closeViewCamera().yaw - beforeLeft) > .2, 'a left-side drag outside the stick pans');
  let taps = 0; P.canvas.listeners.worldtap = [() => taps++]; P.fire('pointerdown', 3, 330, 250); P.fire('pointerup', 3, 332, 251); assert.equal(taps, 1, 'a tap on the right still reaches the world');
  const yl = CV.closeViewCamera().yaw; ui.lock.listeners.pointerdown[0]({ pointerId: 4, clientX: 360, clientY: 300, preventDefault() {}, stopPropagation() {} }); ui.lock.listeners.pointerup[0]({ pointerId: 4, clientX: 360, clientY: 300, preventDefault() {}, stopPropagation() {} });
  for (let i = 0; i < 3; i++) { T += 16; ui.sync(); } assert.equal(CV.closeViewCamera().yaw, yl, 'a touch on the lock never turns the view');
  const D = CV.CLOSE_VIEW.drag; assert.ok(D.side > 0 && D.side < 1 && D.yaw > 0 && D.sensitivity[0] < 1 && D.sensitivity[1] > 1);
});

test('move and look at once: the left thumb drives the stick while the right drags the camera', () => {
  const { g } = room(); const P = page(), input = createInput(P.root, { addEventListener() {} }), ui = CV.mountCloseViewControls(() => g, P.host); frame(g, 2); ui.sync();
  const y0 = CV.closeViewCamera().yaw;
  assert.equal(P.fire('pointerdown', 10, 80, 500), false, 'left thumb: the stick'); assert.equal(P.fire('pointerdown', 11, 320, 300), true, 'right thumb: the camera');
  assert.equal(P.fire('pointerdown', 12, 85, 500), true, 'an extra joystick touch cannot take over');
  for (let i = 1; i <= 12; i++) { T += 16; P.fire('pointermove', 10, 80, 500 - i * 5); P.fire('pointermove', 11, 320 + i * 5, 300); input.update(.016); ui.sync(); }
  assert.ok(input.state.y < -.5, `the stick pushes up (${input.state.y.toFixed(2)})`); assert.ok(wrap(CV.closeViewCamera().yaw - y0) > .2, 'and the view turned');
  P.fire('pointerup', 11, 380, 300); P.fire('pointerup', 10, 80, 440); input.update(.5); assert.ok(Math.abs(input.state.y) < .2, 'both let go');
});

test('the crescent option still turns the view, with its wider band beyond the arc and more gain; it never reaches left into the stick\'s side', () => {
  const { g } = room(); g.save.closeViewCamera = 'crescent'; const P = page(), ui = CV.mountCloseViewControls(() => g, P.host); frame(g, 2); ui.sync();
  assert.equal(ui.svg.style.display, 'block'); assert.equal(P.fire('pointerdown', 5, 300, 300), true, 'crescent mode also reserves movement for the joystick'); P.fire('pointerup', 5, 300, 300);
  const outer = ui.svg.children[2], K = CV.CLOSE_VIEW.crescent; assert.equal(outer.style.pointerEvents, 'stroke'); assert.ok(K.reach >= 30 && K.gain > 1, 'a generous band, more gain');
  const span = (ui.svg.getAttribute('data-outer') || '').split(' ').map(Number); assert.ok(span.length === 2 && span[0] > span[1], `the outer band has a span (${span})`);
  const cx = 301, cy = 641, R = 81 + K.gap; for (const deg of [span[0], span[1]]) { const r = R + K.band + K.reach, x = cx + r * Math.cos(deg * Math.PI / 180); assert.ok(x >= 400 * K.stickShare - 1, `outer band right of the stick's side (${x.toFixed(0)})`); }
  const y0 = CV.closeViewCamera().yaw, a = -90 * Math.PI / 180, r = R + K.band + K.reach * .8, ev = (id, t) => ({ pointerId: id, clientX: cx + r * Math.cos(a + t), clientY: cy + r * Math.sin(a + t), preventDefault() {}, stopPropagation() {} });
  ui.svg.getBoundingClientRect = () => ({ left: cx - 200, top: cy - 200, width: 400, height: 400 });
  outer.listeners.pointerdown[0](ev(6, 0)); for (let i = 1; i <= 6; i++) { T += 16; outer.listeners.pointermove[0](ev(6, i * .05)); ui.sync(); } outer.listeners.pointerup[0](ev(6, .3));
  assert.ok(wrap(CV.closeViewCamera().yaw - y0) > .1, 'a slide on the outer band turns the view');
});

test('the quick turnaround: stick held back, a fast swipe down swings the view behind the Wayfarer, who keeps walking the same way', () => {
  const { g, foe } = room(); const P = page(), ui = CV.mountCloseViewControls(() => g, P.host), Q = CV.CLOSE_VIEW.quickTurn; frame(g, 3); ui.sync();
  const y0 = CV.closeViewCamera().yaw, back = { x: 0, y: 1 }; CV.closeViewSteer(g, { x: 0, y: 0 }); // latch the basis to the view
  const st = { ...back }; CV.closeViewSteer(g, st); const walk = { x: st.x, y: st.y }; CV.closeViewUnsteer(st); // the world direction the held stick walks
  const swipe = (id, dy, ms) => { P.fire('pointerdown', id, 320, 200); const n = 6; for (let i = 1; i <= n; i++) { T += ms / n; P.fire('pointermove', id, 320, 200 + dy * i / n); } P.fire('pointerup', id, 320, 200 + dy); };
  const e = foe('locked', Math.round(Math.cos(y0) * 2), Math.round(Math.sin(y0) * 2)); g.lockTarget(e.id);
  swipe(20, 120, 80); assert.equal(CV.closeViewTurning(), true, 'it triggers'); assert.equal(g.lockedTarget?.() || null, null, 'locked on, the turn breaks the lock (CLOSE_VIEW.quickTurn.lock)'); assert.equal(Q.lock, 'break');
  for (let i = 0; i < 40; i++) { const s2 = { ...back }; CV.closeViewSteer(g, s2); assert.ok(Math.abs(s2.x - walk.x) < 1e-9 && Math.abs(s2.y - walk.y) < 1e-9, `frame ${i}: the held stick keeps walking the same way`); CV.closeViewUnsteer(s2); T += 16; render(recorder().ctx, g, W, H, T); ui.sync(); }
  assert.equal(CV.closeViewTurning(), false, 'it settles'); const y1 = CV.closeViewCamera().yaw; assert.ok(Math.abs(wrap(y1 - y0 - Math.PI)) < .02, `the view faces the way the Wayfarer walks (${(wrap(y1 - y0) / Math.PI).toFixed(3)} pi)`);
  assert.ok(Math.abs(wrap(Math.atan2(walk.y, walk.x) - y1)) < .02, 'over the Wayfarer\'s back: the walk is straight ahead now'); assert.equal(CV.closeViewCamera().pitchUser, 0, 'the standard view');
  const fv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.player.facing]; assert.ok(fv[0] * Math.cos(y1) + fv[1] * Math.sin(y1) > .7, `the Wayfarer faces the new way (${g.player.facing})`);
  assert.ok(Q.seconds >= .25 && Q.seconds <= .35 && Q.reducedSeconds < Q.seconds && Q.cooldown >= .4);
});

test('the quick turnaround never fires on an ordinary drag, with the stick forward or sideways, or twice within its cooldown', () => {
  const { g } = room(); const P = page(), ui = CV.mountCloseViewControls(() => g, P.host); frame(g, 3); ui.sync();
  const swipe = (id, dx, dy, ms) => { P.fire('pointerdown', id, 320, 200); const n = 6; for (let i = 1; i <= n; i++) { T += ms / n; P.fire('pointermove', id, 320 + dx * i / n, 200 + dy * i / n); } P.fire('pointerup', id, 320 + dx, 200 + dy); };
  const stick = (x, y) => { const s = { x, y }; CV.closeViewSteer(g, s); CV.closeViewUnsteer(s); };
  stick(0, -1); swipe(30, 0, 140, 80); assert.equal(CV.closeViewTurning(), false, 'stick forward');
  stick(1, 0); swipe(31, 0, 140, 80); assert.equal(CV.closeViewTurning(), false, 'stick sideways');
  stick(.75, .66); swipe(32, 0, 140, 80); assert.equal(CV.closeViewTurning(), false, 'stick back but too far to the side (beyond the cone)');
  stick(0, 1); swipe(33, 0, 140, 900); assert.equal(CV.closeViewTurning(), false, 'a slow drag down is just a tilt');
  swipe(34, 160, 60, 80); assert.equal(CV.closeViewTurning(), false, 'a swipe across is just a turn');
  swipe(35, 0, 20, 30); assert.equal(CV.closeViewTurning(), false, 'too short');
  swipe(36, 0, 140, 80); assert.equal(CV.closeViewTurning(), true, 'and with everything right, it fires');
  for (let i = 0; i < 40; i++) { T += 16; render(recorder().ctx, g, W, H, T); } assert.equal(CV.closeViewTurning(), false);
  const at = T; assert.equal(CV.closeViewQuickTurn(g, at - 1e6), false, 'within the cooldown of the last one: refused');
  g.presentation = { reduceMotion: true }; T += 1000; assert.equal(CV.closeViewQuickTurn(g, T), true); for (let i = 0; i < 9; i++) { T += 16; render(recorder().ctx, g, W, H, T); } assert.equal(CV.closeViewTurning(), false, 'reduced motion: a quicker swing'); g.presentation = {};
});

test('save: the camera control and sensitivity are additive at schema 14, normalised, unknown fields kept', () => {
  const s = freshSave(); assert.equal(s.closeViewCamera, 'drag'); assert.equal(s.closeViewSensitivity, 1);
  for (const [v, want] of [['crescent', 'crescent'], ['drag', 'drag'], ['bogus', 'drag'], [undefined, 'drag']]) { const raw = { ...freshSave(), closeViewCamera: v, keepMe: 3 }; if (v === undefined) delete raw.closeViewCamera; const m = migrateSave(JSON.parse(JSON.stringify(raw))); assert.equal(m.closeViewCamera, want); assert.equal(m.keepMe, 3); assert.equal(m.version, 14); }
  const [lo, hi] = CV.CLOSE_VIEW.drag.sensitivity; for (const [v, want] of [[1.7, 1.7], [99, hi], [-1, lo], ['x', 1]]) assert.equal(migrateSave({ ...freshSave(), closeViewSensitivity: v }).closeViewSensitivity, want);
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(main, /Drag anywhere \(default\)/); assert.match(main, /Pan crescent/); assert.match(main, /quick turnaround/i); assert.match(main, /Camera sensitivity/);
});

