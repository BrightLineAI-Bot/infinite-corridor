// The jump-up hitch (Tim, 2026-11-12: "when you jump up onto something, the character's movement isn't steady or stable at the
// moment of landing... a weird little hitch: not lag, just odd motion"). Traced frame by frame (game update and render each frame,
// Close View first, then the standard view), before this fix:
// - jumping against a one-level ledge (the feet cross onto it on the jump's first frame) the drawn feet popped a whole level (1.2 tiles,
//   76 px on a phone) in one frame, and the footing then rose toward the level beyond, so after the landing it dropped a level again;
// - from a run-up the first frame leapt a third of a level (.32 tiles at 60 Hz, .64 at 30 Hz), and at the touchdown the camera was
//   still a fifth of a tile short and kept rising half a second, so on screen the Wayfarer sank after landing;
// - a great tree's branch hop landed with a .3-tile pop (the hop was drawn in the flat view's units);
// - the standard view cut the whole world a level the frame the feet crossed onto the ledge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, FALL } from '../src/game.ts';
import { render, standardStep, STANDARD_STEP } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { liftAt, LIFT_PER_LEVEL } from '../src/landscape.ts';
import { OUTDOOR, outdoorRelief, outdoorSurfaceZ } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, CLOSE_VIEW_LEAP, closeViewCamera, closeViewHeroFeetZ, closeViewPan, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { ordinaryFallPresentation, ordinaryLandingPresentation } from '../src/close-view-player-presentation.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

const L = OUTDOOR.terrain.level, V = CLOSE_VIEW.camera.vertical;
class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx2d() }; return { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const inp = (x: number, y: number, jump = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
// The overworld test tile: row 3 rises a level at x 24 (and another at x 25). `close`: Close View, else the standard view.
function tile(hz: number, x0: number, close = true) {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = close; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: false }; g.enemies = [];
  g.player.x = x0; g.player.y = 3; let T = 50000; resetCloseViewCamera(); render(screen, g, 390, 844, T);
  if (close) closeViewPan(wrap(0 - closeViewCamera().yaw) / CLOSE_VIEW.crescent.yaw, 0, T - 10000);
  const frame = (x: number, jump = false) => { T += 1000 / hz; g.update(1 / hz, inp(x, 0, jump), T); render(screen, g, 390, 844, T); return T; };
  for (let i = 0; i < hz * 2; i++) frame(0);
  return { g, frame, now: () => T, R: () => outdoorRelief(g.map) };
}
// A jump onto the ledge: `at` the frame the jump is pressed, the stick held until `release` seconds. One record a frame.
function leapTrace(hz: number, x0: number, at: number, release = .9) {
  const s = tile(hz, x0), rows: any[] = [];
  for (let i = 0; i < hz * 1.4; i++) { const T = s.frame(i < hz * release ? 1 : 0, i === Math.round(hz * at)); const p = s.g.player, c = closeViewCamera();
    rows.push({ T, x: p.x, level: s.g.playerLevel(), jumping: T < s.g.jumpUntil, feet: closeViewHeroFeetZ(), ground: outdoorSurfaceZ(s.R(), p.x + .5, p.y + .75), cam: c.anchorZ, land: ordinaryLandingPresentation(s.g, T) }); }
  assert.equal(closeViewShowing(s.g), true); return { rows, g: s.g };
}

test('the hitch numbers are data: the footing spring, its look ahead, and the camera\'s jump follow', () => {
  assert.ok(CLOSE_VIEW_LEAP.rise >= 12 && CLOSE_VIEW_LEAP.rise <= 30, 'the footing follows on a critically damped spring');
  assert.ok(CLOSE_VIEW_LEAP.ahead > 0 && CLOSE_VIEW_LEAP.samples >= 3 && CLOSE_VIEW_LEAP.samples <= 8, 'a bounded look along the jump');
  assert.ok(V.jumpTau > 0 && V.jumpTau < V.tau && V.jumpHold > 0);
  assert.ok(STANDARD_STEP.rise > 0 && STANDARD_STEP.gravity > 0 && STANDARD_STEP.max > LIFT_PER_LEVEL);
});

for (const hz of [60, 30]) for (const [name, x0, at] of [['from a run-up', 22.6, .1], ['against the ledge', 22.6, .7]] as const) {
  test(`Close View, ${hz} Hz, a jump onto a one-level ledge ${name}: the drawn feet never jump, and the landing is still`, () => withGPU(() => {
    const { rows } = leapTrace(hz, x0, at), up = rows.findIndex((r) => r.jumping); assert.ok(up > 0, 'a jump');
    const landed = rows.findIndex((r, i) => i > up && !r.jumping); assert.ok(landed > up, 'it lands'); assert.equal(rows[landed].level, 1, 'on the ledge');
    // at most 12 tiles a second, any frame (before: a 1.2-tile pop in one frame against the ledge, .32 / .64 a frame from a run-up)
    let most = 0; for (let i = 1; i < rows.length; i++) most = Math.max(most, Math.abs(rows[i].feet - rows[i - 1].feet)); assert.ok(most <= 12 / hz, `feet move at most ${(12 / hz).toFixed(2)} a frame (${most.toFixed(3)})`);
    // the touchdown: the feet arrive on the ledge's surface and stay there (no drop after the landing); a short absorb pose
    for (let i = landed; i < rows.length; i++) assert.ok(Math.abs(rows[i].feet - rows[i].ground) < 1e-6, `frame ${i}: on the ground`);
    assert.ok(rows[landed].land != null, 'the touchdown absorb plays');
    // never more than a level and a little over the ground it leaves (the calm pass's apex)
    for (const r of rows) assert.ok(r.feet <= L * (1 + CLOSE_VIEW_LEAP.apexMargin) + .05, `apex ${r.feet.toFixed(3)}`);
    // the camera arrives with the landing: within a twentieth of a level of the feet at the touchdown, and still after it
    assert.ok(Math.abs(rows[landed].cam - rows[landed].feet) < .06 * L, `camera at the touchdown ${(rows[landed].cam - rows[landed].feet).toFixed(3)} (before: -.22)`);
    let drift = 0; for (let i = landed + 1; i < rows.length; i++) drift += Math.abs(rows[i].cam - rows[i - 1].cam); assert.ok(drift < .06 * L, `settled (${drift.toFixed(3)} after it; before: .22)`);
  }));
}

test('Close View: let go of the stick mid-jump beside a second level, and the footing never stands a level over the landing', () => withGPU(() => {
  const { rows } = leapTrace(60, 22.6, .7, .9), up = rows.findIndex((r) => r.jumping), landed = rows.findIndex((r, i) => i > up && !r.jumping);
  assert.equal(rows[landed].level, 1); for (const r of rows) assert.ok(r.feet <= 1.2 * L + .05, `never toward the second level (${r.feet.toFixed(3)}; before: 2.42)`);
  for (let i = landed; i < rows.length; i++) assert.ok(Math.abs(rows[i].feet - L) < 1e-6, 'and no fall after the landing (before: a level)');
}));

test('Close View: a great tree branch hop is drawn at the branch\'s own height and lands without a pop', () => withGPU(() => {
  const SEED = 'CORRIDOR-MUHAPQHU', SX = 41, SY = 62;
  const pin = (() => { const s: any = freshSave(); s.seed = SEED; const g: any = new Game(s, 0); g.rx = SX; g.ry = SY; g.loadArea('overworld'); return { ...s.atlas[`${SX},${SY}`], landscapeVersion: 17 }; })();
  for (const hz of [60, 30]) {
    const s: any = freshSave(); s.seed = SEED; s.atlas = { [`${SX},${SY}`]: pin }; const g: any = new Game(s, 0); g.rx = SX; g.ry = SY; g.loadArea('overworld'); g.enemies = [];
    g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: false };
    const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; g.player.x = 10.9; g.player.y = 10.4; g.player.hp = g.player.maxHp = 400; s.maxHp = 400; let t = 50000; resetCloseViewCamera();
    const frame = (x: number, jump: boolean) => { t += 1000 / hz; g.update(1 / hz, { state: { x, y: 0 }, consume: (k: string) => k === 'jump' && jump, held: () => false }, t); render(screen, g, 390, 844, t); };
    for (let i = 0; i < hz; i++) frame(0, false); assert.equal(closeViewShowing(g), true);
    let prev = closeViewHeroFeetZ(), most = 0, hopped = false; for (let i = 0; i < hz * 1.2; i++) { frame(i < hz * .75 ? 1 : 0, i === 2); hopped ||= g.skyAir != null; const f = closeViewHeroFeetZ(); most = Math.max(most, Math.abs(f - prev)); prev = f; }
    assert.ok(hopped, 'a sky hop'); assert.ok(g.playerLevel() === 4 && g.map.tiles[Math.floor(g.player.y + .75) * 32 + Math.floor(g.player.x + .5)].canopy, 'on the next branch');
    assert.ok(most <= 12 / hz, `${hz} Hz: at most ${(12 / hz).toFixed(2)} a frame (${most.toFixed(3)}; before: .37 at the take-off and .32 at the landing)`);
  }
}));

test('the standard view: the frame the feet cross onto the ledge no longer cuts the world a level; the footing eases and arrives', () => {
  for (const hz of [60, 30]) for (const at of [.1, .7]) {
    const s = tile(hz, 22.6, false), g = s.g; let prev = NaN, most = 0, view = NaN, viewMost = 0;
    for (let i = 0; i < hz * 1.4; i++) { const T = s.frame(i < hz * .9 ? 1 : 0, i === Math.round(hz * at)); const ground = liftAt(g.map, 32, g.player.x, g.player.y), off = standardStep().off;
      const jl = T < g.jumpUntil ? Math.sin(Math.max(0, Math.min(.5, (T - g.jumpStart) / 520, (g.jumpUntil - T) / 520)) * Math.PI) * .42 : 0, drawn = ground + off + jl, v = ground + off;
      if (Number.isFinite(prev)) { most = Math.max(most, Math.abs(drawn - prev)); viewMost = Math.max(viewMost, Math.abs(v - view)); } prev = drawn; view = v; }
    assert.equal(g.playerLevel(), 1, 'on the ledge');
    assert.ok(viewMost < LIFT_PER_LEVEL * .5, `${hz} Hz: the world moves at most ${viewMost.toFixed(3)} a frame (a level, ${LIFT_PER_LEVEL}, was cut in one)`);
    assert.ok(most < LIFT_PER_LEVEL * .5, `${hz} Hz: the drawn feet (${most.toFixed(3)} a frame)`); assert.equal(standardStep().off, 0, 'arrived');
  }
});

test('Close View: a long fall shows the falling pose, the feet follow the fall, and the camera follows it smoothly', () => withGPU(() => {
  const s = tile(60, 6.2), g = s.g, W = 32;
  for (let y = 1; y <= 5; y++) for (let x = 2; x <= 14; x++) Object.assign(g.map.tiles[y * W + x], { blocked: false, elev: x <= 7 ? 3 : 0, slope: false, structure: undefined, buildingId: undefined });
  g.player.x = 6.2; g.player.y = 2.6; g.player.hp = g.save.maxHp; resetCloseViewCamera(); for (let i = 0; i < 90; i++) s.frame(0);
  let posed = 0, fell = 0, most = 0, camMost = 0, prev = closeViewHeroFeetZ(), cam = closeViewCamera().anchorZ, landed = -1;
  for (let i = 0; i < 120; i++) { s.frame(i < 40 ? 1 : 0); const f = closeViewHeroFeetZ(), c = closeViewCamera().anchorZ;
    if (g.fall) { fell++; if (ordinaryFallPresentation(g, s.now(), f)) posed++; assert.ok(c - f <= V.maxLag + 1e-6, 'the camera keeps the falling Wayfarer framed'); }
    else if (fell && landed < 0) landed = i;
    most = Math.max(most, Math.abs(f - prev)); camMost = Math.max(camMost, Math.abs(c - cam)); prev = f; cam = c; }
  assert.ok(fell > 20, `a fall with airtime (${fell} frames)`); assert.ok(posed >= fell * .6, `the falling pose (${posed} of ${fell})`);
  assert.ok(most <= (FALL.terminal * L + 1) / 60, `the feet follow the fall (${most.toFixed(3)} a frame)`); assert.ok(camMost < .3, `the camera moves smoothly (${camMost.toFixed(3)} a frame)`);
  assert.ok(ordinaryLandingPresentation(g, s.now()) != null || landed >= 0, 'and lands');
}));
