// The Close View polish pass (Tim, 2026-11-19: "buttery smooth, no rendering glitches", controls feel and ease of navigation):
// continuous pitch, sight parity with the room, the under-floor cross-fade, eased zoom, drag inertia and soft tilt limits, fades,
// the eased recentre, the softer cutout rim and transition cross-fades (src/close-view-polish.ts).
// Tim 2026-11-19: the presentation-only full-frame hit-stop is removed; hit-stop is per actor in game time now
// (src/hitstop-actors.ts, tests/hitstop-actors.test.ts). Test 10 checks the hold is gone and its numbers moved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { SIGHT_LINES, creatureSightLevel, sightRule, sightFieldAt } from '../src/labyrinths.ts';
import { CLOSE_VIEW_POLISH as P, smoothDamp, softTilt, inertiaRelease, inertiaDecay, inertiaTravel, recentreStep, fadeToward, smoothstep01, crossfadeAlpha } from '../src/close-view-polish.ts';
import { HITSTOP_ACTORS } from '../src/hitstop-actors.ts';

const C = CV.CLOSE_VIEW, DEG = Math.PI / 180, W = 390, H = 844;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function logCtx() {
  const fills: string[] = [], rects: string[] = [], images: number[] = [];
  const ctx: any = new Proxy({ canvas: { width: W, height: H }, globalAlpha: 1, fillStyle: '', measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
    fill() { fills.push(String(ctx.fillStyle)); }, fillRect() { rects.push(String(ctx.fillStyle)); }, drawImage() { images.push(ctx.globalAlpha); } },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  return { ctx, fills, rects, images };
}
const plainFactory = () => ({ width: 1, height: 1, getContext: () => logCtx().ctx }); CV.setCloseViewCanvasFactory(plainFactory);
class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  CV.setCloseViewCanvasFactory(() => { if (++made === 1) return { width: W, height: H, getContext: () => logCtx().ctx }; return { width: W, height: H, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : logCtx().ctx }; });
  CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); CV.resetCloseViewCamera();
  try { run(); } finally { CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(plainFactory); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
let T = 1500000;
function room() {
  const g: any = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game, w = g.map.width, h = g.map.height, open = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !g.map.tiles[y * w + x].blocked;
  let best: any = null; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0; while (r < 6) { let ok = true; for (let dy = -r - 1; dy <= r + 1 && ok; dy++) for (let dx = -r - 1; dx <= r + 1 && ok; dx++) ok = open(x + dx, y + dy); if (!ok) break; r++; } if (!best || r > best.r) best = { x, y, r }; }
  const proto = g.enemies.find((e: any) => !e.dead) || g.enemies[0]; for (const e of g.enemies) e.dead = true;
  const foe = (id: string, dx: number, dy: number, extra = {}) => { const e = { ...proto, id, x: best.x + dx, y: best.y + dy, dead: false, hidden: false, ambient: false, aggro: false, hp: 25, maxHp: 50, hitFlash: 0, hitStun: 0, worldBeast: undefined, passingBeast: undefined, retreating: false, ...extra }; g.enemies.push(e); return e; };
  const tile = (dx: number, dy: number, on: boolean) => { const i = (best.y + dy) * w + best.x + dx; if (i >= 0 && i < g.map.tiles.length) g.map.tiles[i] = { ...g.map.tiles[i], kind: on ? 'keepWall' : 'keepFloor', blocked: on }; };
  g.player.x = best.x; g.player.y = best.y; g.save.closeView = true; g.save.closeViewAutoFollow = false; g.save.closeViewPreset = 'standard'; g.player.hp = g.player.maxHp = 1e6;
  CV.resetCloseViewCamera();
  return { g, best, foe, tile, w, h };
}
const frame = (g: any, n = 1, step = 16) => { let c: any; for (let i = 0; i < n; i++) { const L = logCtx(); render(L.ctx, g, W, H, (T += step)); c = L; } return c; };
const face = (yaw: number) => CV.closeViewPan(wrap(yaw - CV.closeViewCamera().yaw) / C.crescent.yaw, -CV.closeViewCamera().pitchUser / C.crescent.pitch, T - 10000);

test('the polish numbers are data, in their asked ranges', () => {
  assert.ok(P.zoom.tau >= .08 && P.zoom.tau <= .16, 'zoom eases over about .12 s');
  assert.ok(P.drag.inertiaTau >= .08 && P.drag.inertiaTau <= .16 && P.drag.inertiaMaxDeg <= 300, 'inertia: about .12 s, at most 300 degrees a second');
  assert.ok(Math.abs(P.drag.pitch - .006) < 1e-9 && P.drag.pitch > C.drag.pitch, 'drag pitch raised to .006 rad/px');
  assert.ok(P.fade.creatureSec >= .15 && P.fade.creatureSec <= .25 && P.fade.haloSec <= .25 && P.fade.cardSec <= .25, 'fades about .2 s');
  assert.ok(P.crossfade.underFloorSec >= .15 && P.crossfade.underFloorSec <= .25, 'the under-floor view fades in over .15-.25 s');
  // Tim 2026-11-19: the hit-stop numbers moved to hitstop-actors.ts (per actor, game time); parry and stagger keep 40-70 ms, off under Reduced Motion
  assert.ok(!('hitStop' in P), 'no presentation hit-stop table here any more');
  assert.ok(HITSTOP_ACTORS.parry.maxMs <= 70 && HITSTOP_ACTORS.parry.ms >= 40 && HITSTOP_ACTORS.stagger.ms >= 40 && HITSTOP_ACTORS.stagger.maxMs <= 70 && HITSTOP_ACTORS.parry.reducedScale === 0 && HITSTOP_ACTORS.stagger.reducedScale === 0, 'hit-stop 40-70 ms, off under Reduced Motion');
  assert.ok(C.camera.orbit.cutout.soft > .3 && C.camera.orbit.cutout.soft < .6, 'a wider soft rim');
});

// 1. the pitch never leaps (the framing clamp's window closing used to drop the clamp for a frame: ~10 degrees)
test('pitch is continuous: a slow tilt sweep over the whole orbit, near and far, never jumps between frames', () => withGPU(() => {
  for (const zoom of [0, 1]) {
    const { g } = room(); g.save.closeViewZoom = zoom; frame(g, 2); face(0); frame(g, 30);
    CV.closeViewPan(0, -1e5, T); frame(g, 40); // from the bottom of the sphere
    let prev = CV.closeViewCamera().pitch, worst = 0;
    for (let i = 0; i < 220; i++) { CV.closeViewPan(0, (.8 * DEG) / C.crescent.pitch, T); frame(g, 1); const p = CV.closeViewCamera().pitch; worst = Math.max(worst, Math.abs(p - prev)); prev = p; }
    assert.ok(worst < 3 * DEG, `zoom ${zoom}: largest pitch step ${(worst / DEG).toFixed(2)} degrees (no jump)`);
    for (let i = 0; i < 220; i++) { CV.closeViewPan(0, (-.8 * DEG) / C.crescent.pitch, T); frame(g, 1); const p = CV.closeViewCamera().pitch; worst = Math.max(worst, Math.abs(p - prev)); prev = p; }
    assert.ok(worst < 3 * DEG, `zoom ${zoom}, back down: largest pitch step ${(worst / DEG).toFixed(2)} degrees`);
  }
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /const fitted = FIT\.low <= FIT\.high \? Math\.max\(FIT\.low, Math\.min\(FIT\.high, pitch\)\) : \(FIT\.low \+ FIT\.high\) \/ 2;/, 'a closed window holds the middle, not the free pitch');
}));

// 2. sight parity (Tim): a creature is shown exactly where the room is drawn
test('sight parity: in Close View a creature is drawn exactly where the sight field draws its floor; the ambush radius never passes sight\'s reach', () => {
  const { g, best, foe, tile } = room(); g.player.x = 2; const dx0 = 2 - best.x; // a long clear row from the Wayfarer, along +x
  for (let dx = -1; dx <= 12; dx++) for (let dy = -1; dy <= 1; dy++) tile(dx0 + dx, dy, false);
  frame(g, 2); face(0); frame(g, 4);
  const R = sightRule(g), far = R.range + .5; assert.ok(Math.min(R.hideNear, R.range) <= R.range);
  const e = foe('far', dx0 + far, 0);
  // Standard View: past the reach, in the open: never nothing at all (it was 0, drawn as nothing, at 7 to 8 tiles)
  g.save.closeView = false; frame(g, SIGHT_LINES.ttlFrames + 2);
  assert.notEqual(creatureSightLevel(g, e), 0, 'Standard View, in the open past the reach: at least the silhouette');
  // Close View: its tile is in the field (the floor under it is drawn), so it is drawn, fully
  g.save.closeView = true; frame(g, 4); face(0); frame(g, SIGHT_LINES.ttlFrames + 2);
  const field = CV.closeViewSight().field; assert.ok(field && sightFieldAt(field, Math.floor(e.x + .5), Math.floor(e.y + .82)), 'the floor under it is in the field');
  assert.deepEqual([CV.closeViewSightOf(e)?.visible, CV.closeViewSightOf(e)?.alpha], [true, 1], 'Close View: the creature in the drawn room is drawn');
  // a wall between: out of the field and near: not drawn (the ambush), as its floor is not drawn either
  e.x = 2 + 3; for (let dy = -2; dy <= 2; dy++) tile(dx0 + 1, dy, true); frame(g, 40);
  assert.ok(!sightFieldAt(CV.closeViewSight().field, Math.floor(e.x + .5), Math.floor(e.y + .82)), 'behind the wall: its floor is not drawn');
  assert.deepEqual([CV.closeViewSightOf(e)?.visible, CV.closeViewSightOf(e)?.alpha], [false, 0], 'and neither is it');
});

// 3. and 9. cross-fades: under the floor, and a teleport on the floor
test('the under-floor view fades in from the last frame: the flip frame starts a cross-fade at full strength, never a black frame', () => withGPU(() => {
  assert.equal(crossfadeAlpha(0, .2), 1, 'at the flip the last frame covers everything'); assert.equal(crossfadeAlpha(.2, .2), 0);
  let prev = 1; for (let t = 0; t <= .2; t += .016) { const a = crossfadeAlpha(t, .2); assert.ok(a <= prev + 1e-12 && a >= 0, 'monotone'); assert.ok(prev - a < .2, `no step over a fifth (${(prev - a).toFixed(3)})`); prev = a; }
  const { g } = room(); g.presentation = { effectiveQuality: 'balanced', reduceMotion: false }; frame(g, 2); face(0); frame(g, 20);
  assert.equal(CV.closeViewCrossfade().below, false, 'over the floor');
  let flipAt = -1, last: any = null;
  for (let i = 0; i < 160 && flipAt < 0; i++) { CV.closeViewPan(0, (-1 * DEG) / C.crescent.pitch, T); last = frame(g, 1); if (CV.closeViewCrossfade().below) flipAt = T; }
  assert.ok(flipAt > 0, 'the tilt took the eye under the floor');
  const X = CV.closeViewCrossfade(); assert.equal(X.active, true, 'a cross-fade is under way'); assert.equal(X.t0, flipAt, 'it began on the flip frame itself');
  assert.ok(last.images.some((a: number) => a > .98), 'the flip frame draws the last frame over it at full strength (no black frame)');
  const mid = frame(g, 6); assert.ok(mid.images.some((a: number) => a > .05 && a < .95), 'part way: both views, blended');
  frame(g, 20); assert.equal(CV.closeViewCrossfade().active, false, 'done in about .2 s');
  // a teleport across the floor (past the follow spring's snap): cross-faded, not cut
  const before = CV.closeViewCrossfade().t0; g.player.x += 4; frame(g, 1); assert.ok(CV.closeViewCrossfade().active && CV.closeViewCrossfade().t0 !== before, 'a teleport cross-fades');
}));

// 4. zoom easing
test('the Wayfarer\'s distance eases (critically damped, about .12 s); Reduced Motion snaps it', () => withGPU(() => {
  const o: any = { x: 0, v: 0 }; let prev = 0, over = false; const steps: number[] = [];
  for (let i = 0; i < 60; i++) { smoothDamp(o, 'x', 'v', 1, P.zoom.tau, 1 / 60); if (o.x > 1 + 1e-9) over = true; steps.push(o.x - prev); prev = o.x; }
  assert.equal(over, false, 'never overshoots'); assert.ok(steps[0] < .25, 'no jump on the first frame'); assert.ok(Math.abs(o.x - 1) < .01, 'settled within a second');
  { const q: any = { x: 0, v: 0 }; let t = 0; while (q.x < .5 && t < 1) { smoothDamp(q, 'x', 'v', 1, P.zoom.tau, 1 / 120); t += 1 / 120; } assert.ok(t > .06 && t < .25, `half way in ${t.toFixed(3)} s`); }
  const { g } = room(); frame(g, 2); face(0); frame(g, 10); const r0 = CV.closeViewCamera().orbitRadius;
  g.save.closeViewZoom = .6; frame(g, 1); const r1 = CV.closeViewCamera().orbitRadius; frame(g, 60); const r2 = CV.closeViewCamera().orbitRadius;
  assert.ok(r1 < r0 && r1 > r2 + (r0 - r2) * .5, `the first frame moves only part way (${r0.toFixed(3)} -> ${r1.toFixed(3)} -> ${r2.toFixed(3)})`);
  g.presentation = { effectiveQuality: 'balanced', reduceMotion: true }; g.save.closeViewZoom = 0; frame(g, 1); assert.ok(Math.abs(CV.closeViewCamera().orbitRadius - r0) < 1e-9, 'Reduced Motion: snapped');
}));

// 5. drag: inertia, its cap and decay, no jump on release, faster pitch, soft tilt limits
test('drag inertia: carried at the release speed, capped at 300 degrees a second, decaying with a .12 s time constant; nothing after a rest', () => {
  const cap = P.drag.inertiaMaxDeg * DEG;
  assert.equal(inertiaRelease(20, 10), cap, 'capped'); assert.equal(inertiaRelease(-20, 10), -cap); assert.equal(inertiaRelease(2, P.drag.idleMs + 1), 0, 'a resting finger carries nothing');
  const v1 = inertiaDecay(2, P.drag.inertiaTau); assert.ok(Math.abs(v1 - 2 / Math.E) < 1e-9, 'one time constant: 1/e');
  let v = cap, total = 0, frames = 0; while (v !== 0 && frames < 600) { total += inertiaTravel(v, 1 / 60); v = inertiaDecay(v, 1 / 60); frames++; }
  assert.ok(frames < 60, `stops within a second (${frames} frames)`); assert.ok(total <= cap * P.drag.inertiaTau + 1e-9 && total > cap * P.drag.inertiaTau * .9, `the glide is about v x tau (${(total / DEG).toFixed(1)} degrees)`);
});

test('soft tilt limits: a push slows into the stop and settles there; moving away is linear; always inside', () => {
  const lo = -1, hi = 1, z = P.drag.softTiltDeg * DEG; let x = 0, prevStep = Infinity;
  for (let i = 0; i < 400; i++) { const n = softTilt(x, .01, lo, hi, z); assert.ok(n <= hi && n >= x, 'never past the stop, never back'); const st = n - x; if (x > hi - z && n < hi) assert.ok(st <= prevStep + 1e-12, 'slowing in the zone'); prevStep = st; x = n; }
  assert.equal(x, hi, 'settled on the stop'); assert.ok(Math.abs(softTilt(hi, -.05, lo, hi, z) - (hi - .05)) < 1e-12, 'away from it: linear');
  assert.equal(softTilt(0, -100, lo, hi, z), lo); assert.ok(Math.abs(softTilt(0, .2, lo, hi, z) - .2) < 1e-12, 'well inside: exact');
});

function el(tag = 'div') {
  const listeners: any = {}, e: any = { tagName: tag, style: {}, dataset: {}, children: [], hidden: false, offsetWidth: 162, offsetHeight: 162, offsetLeft: 300, offsetTop: 480, offsetParent: {},
    setAttribute(k: string, v: any) { this[`@${k}`] = v; }, getAttribute(k: string) { return this[`@${k}`]; }, append(...c: any[]) { this.children.push(...c); }, insertBefore(c: any) { this.children.push(c); }, after() {},
    addEventListener(t: string, f: any, o: any) { (listeners[t] ||= []).push({ f, capture: !!o?.capture }); }, removeEventListener() {}, setPointerCapture() {}, contains: () => false,
    querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({ left: 300, top: 480, width: 162, height: 162, right: 462, bottom: 642 }), classList: { add() {}, remove() {}, toggle() {} },
    fire(t: string, ev: any) { let stopped = false; const event = { type: t, pointerType: 'touch', preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { stopped = true; }, ...ev };
      for (const pass of [true, false]) for (const l of listeners[t] || []) if (l.capture === pass && !stopped) l.f(event); return event; } };
  return e;
}
function dragRig(g: any) {
  const actions = el(), cluster = el(), canvas = el('canvas'); actions.querySelector = (s: string) => s === '.action-diamond' ? cluster : null;
  const doc = { getElementById: (id: string) => id === 'actions' ? actions : id === 'game' ? canvas : null, createElementNS: () => el('svg'), createElement: (t: string) => { const e = el(t); if (t === 'div') e.getBoundingClientRect = () => ({ left: 16, top: 520, width: 120, height: 120, right: 136, bottom: 640 }); return e; } };
  const host = { document: doc, innerWidth: 475, innerHeight: 661, performance: { now: () => T }, navigator: { maxTouchPoints: 5 }, addEventListener() {} };
  const ui = CV.mountCloseViewControls(() => g, host); ui.sync(); frame(g, 2); ui.sync(); return { ui, canvas };
}
test('the drag: faster pitch, momentum after the finger lifts (no jump on release), none under Reduced Motion', () => {
  const { g } = room(); frame(g, 2); face(0); frame(g, 4); const { ui, canvas } = dragRig(g);
  const tick = (n: number) => { const ys: number[] = []; for (let i = 0; i < n; i++) { T += 16; ui.sync(); ys.push(CV.closeViewCamera().yaw); } return ys; };
  // pitch: 20 px down tilts by about 20 x .006 (eased in over a few frames)
  const p0 = CV.closeViewCamera().pitchUser; canvas.fire('pointerdown', { pointerId: 1, clientX: 400, clientY: 200 });
  for (let i = 1; i <= 10; i++) { T += 16; canvas.fire('pointermove', { pointerId: 1, clientX: 400, clientY: 200 + 2 * i }); } tick(30); const dp = CV.closeViewCamera().pitchUser - p0; // slow: no swipe acceleration
  assert.ok(Math.abs(dp - 20 * P.drag.pitch) < .02, `pitch per px about .006 (${(dp / 20).toFixed(4)})`);
  canvas.fire('pointerup', { pointerId: 1, clientX: 400, clientY: 220 }); T += 200; tick(5);
  // a fast swipe right, released while moving: the view keeps turning, slowing, and the first frame after the lift is no jump
  canvas.fire('pointerdown', { pointerId: 2, clientX: 300, clientY: 300 }); let x = 300;
  for (let i = 0; i < 8; i++) { T += 16; x += 12; canvas.fire('pointermove', { pointerId: 2, clientX: x, clientY: 300 }); ui.sync(); }
  const held = tick(0); void held; const yRelease = CV.closeViewCamera().yaw; canvas.fire('pointerup', { pointerId: 2, clientX: x, clientY: 300 });
  assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - yRelease)) < 1e-12, 'the release itself moves nothing (no flush jump)');
  const after = tick(40), steps = after.map((y, i) => Math.abs(wrap(y - (i ? after[i - 1] : yRelease))));
  assert.ok(steps[5] > 0, 'still turning after the lift'); assert.ok(steps[30] < steps[5], 'and slowing'); assert.ok(Math.max(...steps) < 300 * DEG * .016 + .08, 'never a lurch');
  assert.ok(steps[39] < 1e-6, 'stopped');
  // Reduced Motion: the release keeps nothing beyond the eased remainder
  g.presentation = { ...(g.presentation || {}), reduceMotion: true }; canvas.fire('pointerdown', { pointerId: 3, clientX: 300, clientY: 300 }); x = 300;
  for (let i = 0; i < 8; i++) { T += 16; x += 12; canvas.fire('pointermove', { pointerId: 3, clientX: x, clientY: 300 }); ui.sync(); }
  canvas.fire('pointerup', { pointerId: 3, clientX: x, clientY: 300 }); tick(20); const y1 = CV.closeViewCamera().yaw; tick(10); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - y1)) < 1e-6, 'Reduced Motion: no glide');
});

// 6. fades
test('fades: a creature, a halo and a card ease in and out over about .2 s (smoothstep), held while paused', () => {
  let a = 0; const seen: number[] = []; for (let i = 0; i < 20; i++) { a = fadeToward(a, 1, .016, P.fade.creatureSec); seen.push(smoothstep01(a)); }
  assert.ok(seen[0] > 0 && seen[0] < .1, 'starts gently'); assert.equal(seen[13], 1, 'in after about .2 s');
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1]);
  assert.equal(fadeToward(.4, 1, 0, .2), .4, 'paused: held'); assert.equal(fadeToward(.4, 0, .1, 0), 0, 'no fade time: at once');
  const { g, foe, tile } = room(); frame(g, 2); face(0); frame(g, 4); const e = foe('fader', 3, 0); frame(g, 4);
  assert.equal(CV.closeViewSightOf(e)?.alpha, 1, 'in sight');
  for (let dy = -2; dy <= 2; dy++) tile(1, dy, true); // a wall comes between: the field sees it within its refresh
  let n = 0; while (CV.closeViewSightOf(e)?.visible !== false && n < 60) { frame(g, 1); n++; }
  const seq: number[] = []; for (let i = 0; i < 16; i++) { seq.push(CV.closeViewSightOf(e)!.alpha); frame(g, 1); }
  assert.ok(seq[0] > .5 && seq[0] < 1, `the first frame out of sight is still mostly drawn (${seq[0].toFixed(3)})`);
  for (let i = 1; i < seq.length; i++) assert.ok(seq[i] <= seq[i - 1] && seq[i - 1] - seq[i] < .25, 'easing out, no pop');
  assert.equal(seq[15], 0, 'gone after about .2 s');
  for (let dy = -2; dy <= 2; dy++) tile(1, dy, false); n = 0; while (CV.closeViewSightOf(e)?.visible !== true && n < 60) { frame(g, 1); n++; }
  assert.ok(CV.closeViewSightOf(e)!.alpha < .2, 'back in sight: fading in, not popping');
});

// 7. recentre
test('the recentre eases in and out: its speed rises from rest, never passes maxRate, and slows into the goal', () => {
  const o: any = { v: 0 }; let left = Math.PI, prevV = 0; const vs: number[] = [];
  for (let i = 0; i < 200 && left > 1e-6; i++) { const s = recentreStep(o, left, 1 / 60); left -= s; vs.push(o.v); assert.ok(s <= left + s + 1e-12 && left >= -1e-12, 'never past the goal'); }
  assert.ok(vs[0] < P.recentre.maxRate * .2, `eased start (${vs[0].toFixed(2)})`); assert.ok(Math.max(...vs) <= P.recentre.maxRate + 1e-9, 'capped');
  const peak = vs.indexOf(Math.max(...vs)); assert.ok(vs[vs.length - 1] < vs[peak] * .5, 'slows into the goal'); void prevV;
  assert.ok(left < 1e-6 && vs.length < 60, `arrives within a second (${vs.length} frames)`);
  const { g } = room(); frame(g, 2); face(Math.PI / 2); frame(g, 4); g.save.lastAim = { x: 1, y: 0 }; CV.closeViewRecentre(g, T);
  let prev = CV.closeViewCamera().yaw; const steps: number[] = []; for (let i = 0; i < 60; i++) { frame(g, 1); const y = CV.closeViewCamera().yaw; steps.push(Math.abs(wrap(y - prev))); prev = y; }
  assert.ok(steps[0] < steps[4], 'in the game: it gathers speed'); assert.ok(Math.abs(wrap(prev)) < .02, 'and arrives behind the Wayfarer');
});

// 8. the cutout's rim
test('the cutout rim: a finer dither under a smooth falloff; the floor and ceiling rules of release 1019 untouched', () => {
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(src, /ivec2 pc = ivec2\(gl_FragCoord\.xy\) & 7;/, '8x8'); assert.match(src, /\/ 64\.0;/, '64 levels');
  assert.match(src, /bool across = !level \|\| z - min\(u_cutZ\.x, u_cutZ\.y\) > u_cutZ\.z && max\(u_cutZ\.x, u_cutZ\.y\) - z > u_cutZ\.z;/, 'only across');
  // the 8x8 Bayer matrix by bit interleave is a permutation of 0..63
  const vals = new Set<number>(); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const bx = x ^ y, by = y; vals.add(((bx & 1) << 5) | ((by & 1) << 4) | ((bx & 2) << 2) | ((by & 2) << 1) | ((bx & 4) >> 1) | ((by & 4) >> 2)); }
  assert.equal(vals.size, 64); assert.equal(Math.min(...vals), 0); assert.equal(Math.max(...vals), 63);
});

// 10. hit-stop (Tim 2026-11-19: the full-frame hold is removed; only the Wayfarer and the struck creature pause, in game time,
// hitstop-actors.ts). The view never holds a frame: a hard stagger in view draws the live scene, and nothing of the old hold is left.
test('hit-stop: no presentation hold any more; a hard stagger in view draws the live frame, the save untouched', () => {
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.ok(!/hitStopBegin|holdSnapshot|closeViewHitStopNote|HS_SEEN/.test(src), 'the full-frame hold is gone from close-view.ts');
  assert.equal((CV as any).closeViewHitStop, undefined); assert.equal((CV as any).resetCloseViewHitStop, undefined);
  withGPU(() => {
    const { g, foe } = room(); frame(g, 2); face(0); frame(g, 6); const e = foe('struck', 2, 0); frame(g, 4); const base = frame(g, 1).images.length;
    const snapBefore = JSON.stringify(g.save); e.hitFlash = .18; e.hitStun = .6; const hit = frame(g, 1), live = frame(g, 1);
    assert.equal(hit.images.length, base, 'the frame of the hit draws as any other'); assert.equal(live.images.length, base, 'no held copy is drawn after it'); assert.equal(JSON.stringify(g.save), snapBefore, 'nothing saved changed');
  });
});
