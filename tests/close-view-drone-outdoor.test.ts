// Close View play-through of 926, bug 7: the drone was never drawn in the open world's Close View, while up or while lifting.
// The model (close-view-models.ts corridorDrone) was placed only in interiors (the bare-floor capture); the open world's scene
// (the world capture) now places it too: beside the Wayfarer at the shoulder while up, and over them, carrying them, during a
// lift, at the hero's drawn height (Close View draws the lift at its own 1.2 a level, presentLeap). Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { DRONE, setMechMode } from '../src/vehicle-gates.ts';
import { PLAYER_DRONE_VISUAL } from '../src/actor-presentation.ts';
import { CLOSE_VIEW_HOOKS, closeViewHeroFeetZ, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';

const PORT = [0xe0 / 255, 0x62 / 255, 0x3c / 255]; // the drone's three rocket ports (close-view-models.ts corridorDrone)
class MockGL {
  uploads: Float32Array[] = []; program: any = null;
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } createShader() { return {}; } createProgram() { return { shaders: [] }; } shaderSource(s: any, t: any) { s.text = t; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  bufferData(_t: any, d: any) { if (d instanceof Float32Array && this.program?.shaders?.some((s: any) => s.text.includes('in float a_alpha'))) this.uploads.push(Float32Array.from(d)); }
}
const ctx2d = () => new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
function withGPU(run: (gl: any) => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new MockGL(); (globalThis as any).WebGL2RenderingContext = MockGL;
  setCloseViewCanvasFactory(() => ({ width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }));
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(gl); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
function droneUp() {
  const s: any = freshSave(); s.seed = 'ROOF'; s.maxHp = 100; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1;
  Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 }); s.overworldCloseView = true; s.closeViewPreset = 'standard'; s.closeViewAutoFollow = false;
  const g: any = new Game(s, 0); g.enemies = []; g.player.hp = s.maxHp; g.presentation = { effectiveQuality: 'full', reduceMotion: true };
  assert.equal(setMechMode(s, 'drone').ok, true); assert.equal(g.toggleMech(), true); assert.ok(g.droneUp()); s.mech.fuel = DRONE.carry; return g;
}
// The drone's ports in the last upload: their mean position, or null when no drone was drawn.
function ports(gl: any) { const d = gl.uploads.at(-1); if (!d) return null; let x = 0, y = 0, z = 0, n = 0;
  for (let i = 0; i < d.length; i += 10) if (Math.abs(d[i + 6] - PORT[0]) < 1e-5 && Math.abs(d[i + 7] - PORT[1]) < 1e-5 && Math.abs(d[i + 8] - PORT[2]) < 1e-5) { x += d[i]; y += d[i + 1]; z += d[i + 2]; n++; }
  return n ? { x: x / n, y: y / n, z: z / n } : null; }
const inp = (x: number, y: number, hold = false, jump = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: (k: string) => k === 'jump' && hold }; };

test('926 bug 7: the drone is drawn in the open world\'s Close View while up, beside the Wayfarer at the shoulder', () => withGPU((gl) => {
  const g = droneUp(), screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
  for (let i = 0; i < 30; i++) { T += 16; g.update(.016, inp(0, 0), T); render(screen, g, 390, 844, T); }
  assert.equal(closeViewShowing(g), true, 'Close View draws the open world');
  assert.equal(closeViewGLStats.auxKinds.corridorDrone, 1, 'the drone model is placed');
  const at = ports(gl), feet = closeViewHeroFeetZ(), p = g.player; assert.ok(at, 'its ports are in the scene');
  assert.ok(Math.abs(at!.z - feet - PLAYER_DRONE_VISUAL.hover) < .25, `at the shoulder (${(at!.z - feet).toFixed(2)} over the feet)`);
  assert.ok(Math.hypot(at!.x - (p.x + .5), at!.y - (p.y + .82)) < .75, 'beside the Wayfarer, within reach of the shoulder');
}));

test('926 bug 7: during a lift the drone is drawn over the Wayfarer, carrying them at the hero\'s drawn height', () => withGPU((gl) => {
  const g = droneUp(), screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
  for (let i = 0; i < 20; i++) { T += 16; g.update(.016, inp(0, 0), T); render(screen, g, 390, 844, T); }
  let carried = 0, worst = 0;
  for (let i = 0; i < 120; i++) { T += 16; g.update(.016, inp(0, 0, i >= 8, i === 0 || i === 8), T); render(screen, g, 390, 844, T); // Jump, then Jump again in the air and hold: the drone lifts
    if (!g.mechBoosting || !g.droneLift) continue; const at = ports(gl), feet = closeViewHeroFeetZ(), p = g.player; assert.ok(at, 'drawn while lifting');
    worst = Math.max(worst, Math.abs(at!.z - feet - PLAYER_DRONE_VISUAL.carry), Math.hypot(at!.x - (p.x + .5), at!.y - (p.y + .82)) > .6 ? 9 : 0); carried++; }
  assert.ok(carried > 10, `the drone lifted the Wayfarer (${carried} frames)`);
  assert.ok(g.droneLift.z - g.elevationHere(g.player.x, g.player.y) > .5, 'risen at least half a level');
  assert.ok(worst < .25, `over the hero's drawn feet at the carry height every frame (worst ${worst.toFixed(2)})`);
}));
