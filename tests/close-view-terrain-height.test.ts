// Close View terrain height (Tim, 2026-11-11: "these 3 or 4 high stacked platforms that are only about hip height for the
// Wayfarer... things need more vertical distance... in the overworld [Close View] the blocks need to be higher... and gives
// us things to jump onto"). Presentation only: the standard view's lift, the steps, jumps and falls are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { LIFT_PER_LEVEL, liftAt, canStep } from '../src/landscape.ts';
import { OUTDOOR, OUTDOOR_FLOATS, outdoorRelief, outdoorSurfaceZ, outdoorLevelHeight, outdoorScene, outdoorTerrainMesh } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW_HOOKS, CLOSE_VIEW_LEAP, closeViewLeap, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

const testTile = () => createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game as any;

test('a level is a ledge you jump onto: chest high to the 1.8-tile Wayfarer; a great tree\'s and a roof\'s own', () => {
  const T = OUTDOOR.terrain; assert.ok(T.level >= 1.0 && T.level <= 1.5, `a level is ${T.level} tiles: chest to shoulder`);
  assert.ok(T.level > 3 * LIFT_PER_LEVEL, 'over three times the ordinary view\'s drawn lift'); assert.ok(T.canopyLevel > 2 * LIFT_PER_LEVEL && T.canopyLevel < T.level, 'a great tree\'s level a little taller than before');
  assert.equal(outdoorLevelHeight({ elev: 1 }), T.level); assert.equal(outdoorLevelHeight({ canopy: true }), T.canopyLevel); assert.equal(outdoorLevelHeight({ roofLift: 3 }), 3 * LIFT_PER_LEVEL, 'a roof keeps its facade\'s lift');
  assert.ok(T.pitDepth >= 3 * T.level, 'a hole is deeper than three levels');
});

test('the plateau stands at the new heights and everything on it with it; the standard view and the steps are unchanged', () => {
  const g = testTile(), map = g.map, w = map.width || 32, R: any = outdoorRelief(map), L = OUTDOOR.terrain.level;
  assert.ok(Math.abs(outdoorSurfaceZ(R, 26.5, 4.5) - 2 * L) < 1e-6, 'the core, two levels up'); assert.ok(Math.abs(outdoorSurfaceZ(R, 24.5, 2.5) - L) < 1e-6, 'the ring, one level');
  const s0 = outdoorSurfaceZ(R, 24.05, 4.5), s1 = outdoorSurfaceZ(R, 24.95, 4.5); assert.ok(s1 - s0 > .5 * L * .8, `the stair is a real slope (${s0.toFixed(2)} to ${s1.toFixed(2)})`);
  // the standard view draws the same lift as before, and one jump still climbs one level
  assert.ok(Math.abs(liftAt(map, w, 26, 4) - 2 * LIFT_PER_LEVEL) < 1e-6, 'the ordinary view\'s lift is untouched');
  const p = { isPlayer: true, jumping: false }; assert.equal(canStep(p, map, w, 23, 3, 24, 3), false, 'no walking up a level');
  assert.equal(canStep({ isPlayer: true, jumping: true }, map, w, 23, 3, 24, 3), true, 'one jump, one level');
  // the cliff faces are as tall as the levels, and the solids on the plateau stand on it
  const m = outdoorTerrainMesh(map, R); let top = 0; for (let v = 0; v < m.verts; v++) top = Math.max(top, m.data[v * OUTDOOR_FLOATS + 2]); assert.ok(Math.abs(top - 2 * L) < 1e-6);
  const sc: any = outdoorScene(map, true); assert.ok(sc.ground.verts === m.verts);
});

// A WebGL2 stand-in: enough for the frame to run (the GPU itself is not available here).
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

test('a jump onto the ledge rises to it before the feet cross; stepping off the ledge is a fall, not a drop; the game is untouched', () => withGPU(() => {
  const g = testTile(), L = OUTDOOR.terrain.level, screen = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = true; g.presentation = { effectiveQuality: 'low', reduceMotion: true }; g.enemies = [];
  let T = 90000; g.player.x = 22.4; g.player.y = 3; render(screen, g, 390, 844, T); assert.equal(closeViewShowing(g), true);
  assert.ok(Math.abs(closeViewLeap().base) < 1e-6, 'on the ground');
  // the jump: toward the plateau's first level (24, 3), the feet still over the ground for the first frames
  g.jumpStart = T; g.jumpDur = 520; g.jumpUntil = T + 520; const before = JSON.stringify({ x: g.player.x, until: g.jumpUntil, map: g.map.tiles.length });
  let risenBeforeCrossing = 0;
  for (let k = 1; k <= 8; k++) { T += 60; g.player.x = 22.4 + k * .2; render(screen, g, 390, 844, T); if (Math.floor(g.player.x + .5) < 24 && closeViewLeap().base > .5 * L) risenBeforeCrossing++; }
  assert.ok(risenBeforeCrossing > 0, 'the footing rose toward the ledge while the feet were still short of it');
  T += 200; g.jumpUntil = 0; render(screen, g, 390, 844, T); assert.ok(Math.abs(closeViewLeap().base - L) < 1e-6, 'standing on the ledge');
  assert.equal(JSON.stringify({ x: g.player.x, until: 0, map: g.map.tiles.length }), JSON.stringify({ ...JSON.parse(before), x: g.player.x, until: 0 }), 'presentation never moves the Wayfarer');
  // stepping off the far side: a fall under gravity, a little each frame, down to the ground
  g.player.x = 22.6; T += 16; render(screen, g, 390, 844, T); const a = closeViewLeap().base; assert.ok(a > 0 && a < L, `falling (${a.toFixed(3)})`);
  T += 16; render(screen, g, 390, 844, T); const b = closeViewLeap().base; assert.ok(b < a, 'still falling, faster');
  for (let k = 0; k < 20; k++) { T += 33; render(screen, g, 390, 844, T); } assert.ok(Math.abs(closeViewLeap().base) < 1e-6, 'landed');
  assert.ok(CLOSE_VIEW_LEAP.arcPeak * L > .5 && CLOSE_VIEW_LEAP.gravity > 9.8, 'a jump\'s arc and a fall\'s pull are game-sized');
}));
