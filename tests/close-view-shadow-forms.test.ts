// Close View shadow forms (Tim, 2026-11-12): Shadow Boxing charges as a wraith with afterimages instead of popping, and
// the Shadow Clone is a hooded spectre. Presentation only: gameplay positions, timing and hits are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewShadowDash } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL, CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
import { drawHeroGL, HERO_VERTEX_BODY } from '../src/close-view-hero-gl.ts';
import { CLOSE_VIEW_SHADOW_FORMS as SF, createShadowDash, stepShadowDash, shadowStrikePhase, shadowCloneAlpha } from '../src/close-view-shadow-forms.ts';

const FRAME = 1000 / 60, MAX_STEP = .75; // tiles: no drawn jump between two 60 Hz frames may exceed this

// Run one dash of `dist` tiles along x through the pure stepper; returns per-frame samples.
function dash(dist, reduce = false, frame = FRAME) {
  const D = createShadowDash(), out = []; let t = 1000, x = 10;
  stepShadowDash(D, t, x, 5, x, 5, frame, true, false, reduce);
  t += frame; const from = x; x += dist; // gameplay: the whole move lands in one update
  for (let i = 0; i < 40; i++, t += frame) { stepShadowDash(D, t, x, 5, i ? x : from, 5, frame, true, i === 0, reduce); out.push({ t, x: D.x, y: D.y, n: D.trailCount, trail: Array.from(D.trail.subarray(0, D.trailCount * 3)), charge: D.charge, wraith: D.wraith, active: D.active, lag: D.lag, start: D.start }); }
  return { D, out, from, to: x };
}

test('a Shadow Boxing dash is drawn as a continuous charge along the dash line, no single-frame jump over the limit', () => {
  for (const dist of [1, 2.5, 4, 6]) {
    const { out, from, to } = dash(dist);
    let prev = from;
    for (const s of out) {
      assert.ok(Math.abs(s.x - prev) <= MAX_STEP + 1e-9, `${dist} tiles: frame step ${(s.x - prev).toFixed(3)}`);
      assert.ok(s.x >= prev - 1e-9 && s.x <= to + 1e-9, 'monotonic along the path, never past the foe');
      assert.equal(s.y, 5, 'on the dash line');
      prev = s.x;
    }
    assert.ok(out[0].x - from < dist * .2, 'the first frame does not pop');
    assert.ok(out[0].charge >= 0 && out[2].charge > .5 && out[2].wraith === 1, 'leans into the charge as a wraith');
  }
});

test('the drawn hero arrives exactly within the lag, which stays in the 120-180 ms band', () => {
  for (const dist of [.7, 3, 9]) {
    const { out, to } = dash(dist), lag = out[0].lag;
    assert.ok(lag >= 120 && lag <= 180, `lag ${lag}`);
    const arrived = out.find((s) => s.x === to);
    assert.ok(arrived && arrived.t - out[0].start <= lag + FRAME, `${dist}: arrived ${arrived && arrived.t - out[0].start} ms`);
    for (const s of out) if (s.t >= out[0].start + lag) assert.equal(s.x, to, 'stays on the logical position after arrival');
    assert.equal(out.at(-1).active, false, 'settles back to the ordinary hero');
    assert.equal(out.at(-1).wraith, 0);
  }
});

test('afterimages are pooled, bounded at five, fade with distance behind and lie on the travelled path', () => {
  const { out, from, to } = dash(6); let most = 0;
  for (const s of out) {
    assert.ok(s.n <= SF.trail.max && s.n <= 5); most = Math.max(most, s.n);
    for (let k = 0; k < s.n; k++) {
      const x = s.trail[k * 3], a = s.trail[k * 3 + 2];
      assert.ok(x >= from - 1e-9 && x <= s.x + 1e-9 && x <= to, 'behind the hero, on the path');
      assert.ok(a > 0 && a < 1); if (k) assert.ok(a < s.trail[k * 3 - 1], 'farther back is fainter');
    }
  }
  assert.ok(most >= 3, `a visible trail (${most})`);
  const D = dash(6).D; assert.equal(D.trail.length, SF.trail.max * 3, 'fixed pool');
  // Reduced motion: no trail, no travel, only a simple spectral fade.
  const R = dash(6, true);
  for (const s of R.out) { assert.equal(s.n, 0); assert.equal(s.x, R.to); }
  assert.ok(R.out[0].wraith === 1 && R.out.at(-1).wraith === 0);
});

test('the swing is re-timed so its contact pose lands on arrival and it still ends with the gameplay swing', () => {
  const D = createShadowDash(); stepShadowDash(D, 1000, 0, 0, 0, 0, FRAME, true, false, false); stepShadowDash(D, 1017, 4, 0, 0, 0, FRAME, true, true, false);
  const dur = 260, contact = 75 / 260, at = (ms) => shadowStrikePhase(D, 1017 + ms, ms / dur, dur, contact);
  assert.equal(at(0), 0); assert.ok(Math.abs(at(D.lag) - contact) < 1e-9, 'contact at arrival'); assert.equal(at(dur), 1);
  let prev = 0; for (let ms = 0; ms <= dur; ms += 4) { const p = at(ms); assert.ok(p >= prev - 1e-12 && p - prev < .2); prev = p; }
  assert.ok(at(D.lag * .5) < contact, 'still winding up mid-charge');
  assert.equal(shadowStrikePhase(createShadowDash(), 1100, .4, dur, contact), .4, 'no dash: the swing is untouched');
});

// ---- the real Close View renderer, with a recording WebGL2 stand-in (as native-auxiliary-actors.test.ts)
const ctx = (log = []) => new Proxy({ canvas: null, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o, k) => k in o ? o[k] : (...args) => log.push([k, ...args]), set: (o, k, v) => { o[k] = v; return true; } });
class MockGL {
  uploads = []; program = null;
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o, k) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; } shaderSource(s, t) { s.text = t; } attachShader(p, s) { p.shaders.push(s); } useProgram(p) { this.program = p; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; } getProgramParameter(p, k) { return k === this.ACTIVE_UNIFORMS || k === this.ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  bufferData(t, d) { if (d instanceof Float32Array && this.program?.shaders?.some((s) => s.text.includes('in float a_alpha'))) this.uploads.push(Float32Array.from(d)); }
}
function gpu(run) {
  const old = globalThis.WebGL2RenderingContext; globalThis.WebGL2RenderingContext = MockGL; const gl = new MockGL(), screen = ctx(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: (k) => k === 'webgl2' ? gl : ctx() }; screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try { run({ gl, screen }); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); if (old === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = old; }
}
function layer(g, run) { const fn = (c, w, h, shots) => drawRangedEffects(c, g, w, h, shots); CLOSE_VIEW_HOOKS.groundLayers.push(fn); try { return run(); } finally { CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(fn), 1); } }
function boxingFixture(reduceMotion = false) {
  const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'shadow-clone', now: 100000 });
  g.shadowClone = null; g.presentation = { effectiveQuality: 'full', reduceMotion };
  const foe = Object.assign(createCombatant('ashling', g.player.x + 3.5, g.player.y), { id: 'box-foe', hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 });
  g.enemies = [foe]; g.boxingUntil = 108000; g.lastUpdateNow = 100000; g.save.lastAim = { x: 1, y: 0 }; g.player.facing = 'right';
  return g;
}
const facts = (g) => JSON.stringify({ p: [g.player.x, g.player.y, g.player.hp, g.player.attackUntil, g.player.attackReadyAt], e: g.enemies.map((e) => [e.x, e.y, e.hp]), b: g.boxingUntil, c: g.pendingMeleeContact?.id ?? null });

test('in the real Close View the drawn hero charges continuously and arrives, with gameplay positions untouched', () => gpu(({ gl, screen }) => {
  const g = boxingFixture(), x0 = g.player.x; resetCloseViewCamera();
  layer(g, () => { for (let t = 99900; t <= 100000; t += FRAME) render(screen, g, 390, 844, t); });
  const before = g.player.x; g.primaryAttack(100000); const after = g.player.x;
  assert.ok(after - before >= 2, `gameplay still dashes in one update (${after - before} tiles)`);
  // A twin game that never renders moves exactly the same.
  const twin = boxingFixture(); twin.primaryAttack(100000); assert.equal(twin.player.x, after); assert.equal(twin.player.y, g.player.y);
  const D = closeViewShadowDash(), drawn = []; let maxTrail = 0, ghostTris = 0;
  layer(g, () => { for (let i = 0; i < 18; i++) { const t = 100000 + i * FRAME, f = facts(g); render(screen, g, 390, 844, t); assert.equal(facts(g), f, 'rendering mutates no gameplay state');
    drawn.push({ t, x: D.x, active: D.active }); maxTrail = Math.max(maxTrail, D.trailCount);
    if (D.trailCount) ghostTris = Math.max(ghostTris, closeViewGLStats.modelTriangles - closeViewGLStats.models * 256); } });
  assert.equal(g.player.x, after, 'the logical position never moved back');
  let prev = before; for (const s of drawn) { assert.ok(Math.abs(s.x - prev) <= MAX_STEP, `drawn step ${(s.x - prev).toFixed(3)} at ${s.t - 100000} ms`); prev = s.x; }
  assert.ok(drawn[1].x < after - .5, 'still charging after the first frames');
  const arrival = drawn.find((s) => s.x === after); assert.ok(arrival && arrival.t - 100000 <= SF.dash.lagMax + FRAME, 'arrives within the lag');
  assert.ok(maxTrail > 0 && maxTrail <= 5, `bounded afterimages (${maxTrail})`);
  assert.ok(ghostTris <= 5 * 256, 'afterimages stay inside five model budgets');
  assert.ok(gl.uploads.at(-1).every(Number.isFinite));
  assert.ok(x0 < after);
}));

test('reduced motion keeps the hero on its logical place with no trail', () => gpu(({ screen }) => {
  const g = boxingFixture(true); resetCloseViewCamera();
  layer(g, () => render(screen, g, 390, 844, 99980)); g.primaryAttack(100000);
  const D = closeViewShadowDash();
  layer(g, () => { for (let i = 0; i < 14; i++) { render(screen, g, 390, 844, 100000 + i * FRAME); assert.equal(D.x, g.player.x); assert.equal(D.trailCount, 0); } });
}));

test('the Shadow Clone is a spectral wraith within the model budget, brighter than before, its glow kept', () => {
  assert.ok(modelTriangleCount('playerShadow') <= MODEL_MAX_VERTICES / 3, `${modelTriangleCount('playerShadow')} triangles`);
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), n = writeCloseViewModel(out, 0, { kind: 'playerShadow', x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'idle', amount: 0, shadow: true, alpha: shadowCloneAlpha(110000, 100000, true) });
  assert.ok(n > 0);
  const rgb = (c) => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255], glow = CLOSE_VIEW_ACTOR_LOOK.emissive.map(rgb);
  let lit = 0, dark = 0, low = Infinity, alpha = null;
  for (let o = 0; o < n; o += MODEL_FLOATS) {
    const c = [out[o + 6], out[o + 7], out[o + 8]]; alpha = out[o + 9]; low = Math.min(low, out[o + 2]);
    if (glow.some((e) => Math.abs(e[0] - c[0]) + Math.abs(e[1] - c[1]) + Math.abs(e[2] - c[2]) < .012)) lit++;
    else if (c[2] >= c[0] && c[2] >= c[1] && c[0] + c[1] + c[2] < .8) dark++;
  }
  assert.ok(lit >= 3 * 20, `an emissive violet edge, eyes and heart survive the shadow tint (${lit / 3} triangles)`);
  assert.equal(lit + dark, n / MODEL_FLOATS, 'every other colour is a cool violet-black');
  assert.ok(alpha >= .8 && alpha < 1, `more visible yet spectral (alpha ${alpha})`);
  assert.ok(low < .06, 'wisps trail to the floor');
  // Still translucent while it lasts, brighter than the old .62-.70, and it fades out over its last moments.
  for (let t = 0; t < 2000; t += 37) { const a = shadowCloneAlpha(110000, 100000 + t); assert.ok(a > .75 && a < 1, `${a}`); }
  assert.ok(shadowCloneAlpha(110000, 109500) < .4 && shadowCloneAlpha(110000, 110000) === 0);
});

test('in the real Close View the clone is drawn as the wraith at its stronger alpha, at its gameplay place', () => gpu(({ gl, screen }) => {
  const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'shadow-clone', now: 100000 }); g.enemies = []; g.presentation = { effectiveQuality: 'full', reduceMotion: true };
  g.lastUpdateNow = 100050; const clone = structuredClone(g.shadowClone); resetCloseViewCamera();
  layer(g, () => render(screen, g, 390, 844, 100050));
  assert.equal(closeViewGLStats.auxKinds.playerShadow, 1); assert.deepEqual(g.shadowClone, clone, 'clone state untouched');
  const up = gl.uploads.at(-1), n = modelTriangleCount('playerShadow') * 3; let found = false;
  for (let start = 0; start + n * MODEL_FLOATS <= up.length; start += 3 * MODEL_FLOATS) {
    const a = up[start + 9]; if (!(a >= .8 && a < 1)) continue;
    let x = 0, y = 0; for (let i = 0; i < n; i++) { x += up[start + i * MODEL_FLOATS]; y += up[start + i * MODEL_FLOATS + 1]; }
    if (Math.hypot(x / n - (g.player.x + clone.ox + .5), y / n - (g.player.y + clone.oy + .82)) < .4) { found = true; break; }
  }
  assert.ok(found, 'a wraith-alpha body at the clone\'s place');
}));

test('imported hero afterimages are the same uploaded pose drawn again in the body pass only, offset and fainter', () => {
  assert.match(HERO_VERTEX_BODY, /a_pos\+u_offset/);
  const calls = [], uni = {}, gl = new Proxy({}, { get: (o, k) => k === 'drawElements' ? (_t, n) => calls.push({ n, offset: uni.u_offset, alpha: uni.u_alpha }) : k === 'uniform3f' ? (u, x, y, z) => { uni[u] = [x, y, z]; } : k === 'uniform1f' ? (u, v) => { uni[u] = v; } : k === 'uniform3fv' ? (u, v) => { uni[u] = Array.from(v); } : typeof k === 'string' && /^[A-Z]/.test(k) ? 1 : () => {} });
  const s = { program: { p: {}, U: { u_offset: 'u_offset', u_alpha: 'u_alpha', u_tint: 'u_tint', u_hit: 'u_hit' } }, vao: {}, texture: {} };
  const frame = { alpha: .52, tint: new Float32Array([.56, .42, .98]), hitFlash: 0, powerSuit: false, indexCount: 30, ghosts: new Float32Array(SF.trail.max * 4), ghostCount: 2, ghostTint: new Float32Array(SF.trail.tint) };
  frame.ghosts.set([-.4, 0, 0, .3, -.8, 0, 0, .2]);
  assert.equal(drawHeroGL(gl, s, frame, 1, () => {}, () => {}, [0, 0, 0]), 1, 'no afterimage silhouettes');
  calls.length = 0; assert.equal(drawHeroGL(gl, s, frame, 0, () => {}, () => {}, [0, 0, 0]), 3);
  assert.deepEqual(calls.map((c) => c.offset.map((v) => Math.round(v * 100) / 100)), [[0, 0, 0], [-.4, 0, 0], [-.8, 0, 0]]);
  assert.ok(Math.abs(calls[0].alpha - .52) < 1e-6 && Math.abs(calls[1].alpha - .3) < 1e-6 && Math.abs(calls[2].alpha - .2) < 1e-6);
  assert.deepEqual(uni.u_offset, [0, 0, 0], 'offset restored for the next draw');
  frame.ghostCount = 9; calls.length = 0; drawHeroGL(gl, s, frame, 0, () => {}, () => {}, [0, 0, 0]); assert.ok(calls.length <= 1 + SF.trail.max, 'capped by the pool');
});
