// Close View visibility (Tim, 2026-11-19). The contract checked here:
// - the creature silhouette (the x-ray shape through walls) compares against walls and solid architecture only: the props'
//   range of the solids buffer is drawn after the silhouette passes, so no creature (nor its spiky parts) shows through a crate;
// - no silhouette for a creature within CLOSE_VIEW_VISIBILITY.silhouette.near tiles of the Wayfarer, one engaging her, or a
//   dying body (models: GLF.silRuns; cards: the board's silhouette field; beasts: `noSil`);
// - a creature between the camera and the Wayfarer, covering her on screen, eases to `between.alpha` over the polish pass's
//   0.2 s smoothstep and back (Reduced Motion: at once);
// - a creature card takes the floor's light where it stands: no light floor of its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { render } from '../src/renderer.ts';
import { GLF, closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { CLOSE_VIEW_POLISH, smoothstep01 } from '../src/close-view-polish.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, CLOSE_VIEW_VISIBILITY, closeViewCamera, closeViewCreatureBetween, closeViewFloorLight, closeViewSilhouetteAllowed,
  resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';

const V = CLOSE_VIEW_VISIBILITY;
// A WebGL2 stand-in that records each draw with the depth test it ran under and the vertex range it drew.
class MockGL {
  program: any = null; depth = 0; draws: any[] = [];
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(s: any, t: any) { s.text = t; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  depthFunc(f: any) { this.depth = f; }
  drawArrays(_m: any, first: number, count: number) { const t = this.program?.shaders?.map((s: any) => s.text).join('\n') || ''; this.draws.push({ prog: this.program, first, count, depth: this.depth, solid: t.includes('in float a_mat'), model: t.includes('in float a_alpha') }); }
}
const ctx2d = () => new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
let GL: any = null;
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new MockGL(); GL = gl; (globalThis as any).WebGL2RenderingContext = MockGL;
  setCloseViewCanvasFactory(() => ({ width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }));
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
function scene(reduceMotion = false) {
  const s: any = freshSave(); s.seed = 'VISIBILITY-1119'; s.maxHp = 100; s.level = 20;
  Object.assign(s.session, { area: 'overworld', rx: 3, ry: 2, x: 16, y: 16 }); s.overworldCloseView = true; s.closeViewPreset = 'standard'; s.closeViewAutoFollow = false;
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.enemies = []; g.projectiles = []; g.player.hp = s.maxHp;
  for (const t of g.map.tiles) { t.blocked = false; t.environment = false; t.structure = null; t.elev = 0; t.kind = 'grass'; }
  g.map.objects = []; g.presentation = { effectiveQuality: 'balanced', reduceMotion };
  return g;
}
const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
function frame(g: any, place: () => void = () => {}) { T += 16; place(); g.update(.016, still, T); place(); GL.draws.length = 0; render(screen, g, 390, 844, T); }
// `d` tiles from the Wayfarer along the camera's look (negative: between the camera and her), `side` across.
function ahead(g: any, d: number, side = 0) { const c = closeViewCamera(), fx = Math.cos(c.yaw), fy = Math.sin(c.yaw), p = g.player; return { x: p.x + fx * d - fy * side, y: p.y + fy * d + fx * side }; }
const pin = (e: any, at: any) => Object.assign(e, { x: at.x, y: at.y, cooldown: 99, telegraph: 0, aggro: false, speedMultiplier: 1e-6, hitStun: 1 });
const silVerts = () => { let n = 0; for (let i = 0; i < GLF.nSil; i++) n += GLF.silRuns[i * 2 + 1]; return n; };

test('the table: a near band of about two tiles, a .35 fade on the polish pass\'s 0.2 s, bounded runs', () => {
  assert.ok(V.silhouette.near >= 1.5 && V.silhouette.near <= 2.5, `about 2 tiles (${V.silhouette.near})`);
  assert.ok(Number.isInteger(V.silhouette.runs) && V.silhouette.runs >= 4 && V.silhouette.runs * 2 <= GLF.silRuns.length, 'bounded, preallocated runs');
  assert.equal(V.between.alpha, .35); assert.equal(V.between.sec, CLOSE_VIEW_POLISH.fade.creatureSec); assert.equal(V.between.sec, .2);
  assert.ok(V.between.overlap > 0 && V.between.overlap < 1 && V.between.depth > 0);
});

test('the silhouette rule: never near the Wayfarer, never engaging her, never dying', () => {
  const g: any = { player: { x: 10, y: 10 }, lockedTarget: () => null };
  const foe = (x: number, extra: any = {}) => Object.assign({ x, y: 10, hp: 10, dead: false, aggro: true, telegraph: 0 }, extra);
  assert.equal(closeViewSilhouetteAllowed(foe(16), g), true, 'far off, behind a wall: its silhouette shows');
  assert.equal(closeViewSilhouetteAllowed(foe(11.5), g), false, 'within the near band: none');
  assert.equal(closeViewSilhouetteAllowed(foe(10 + V.silhouette.near), g), false, 'at the band\'s edge: none');
  assert.equal(closeViewSilhouetteAllowed(foe(16, { telegraph: .4 }), g), false, 'winding up at her: none');
  assert.equal(closeViewSilhouetteAllowed(foe(16, { pack: { phase: 'strike' } }), g), false, 'striking: none');
  const target = foe(16); assert.equal(closeViewSilhouetteAllowed(target, { ...g, lockedTarget: () => target }), false, 'her locked target: none');
  assert.equal(closeViewSilhouetteAllowed(foe(16, { dead: true }), g), false, 'dying: none');
  assert.equal(closeViewSilhouetteAllowed(foe(16, { hp: 0 }), g), false, 'no hp left: none');
  assert.equal(closeViewSilhouetteAllowed(null, g), false);
});

test('model bodies: only the far creature takes the silhouette pass; near, engaging and dying ones do not', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 20; i++) frame(g);
  const base = silVerts(); // the Wayfarer alone
  const e: any = createCombatant('ashling', 0, 0); e.id = 'vis-ashling'; Object.assign(e, { hp: 1e6, maxHp: 1e6 }); g.enemies = [e];
  let at = ahead(g, 5); for (let k = 0; k < 4; k++) frame(g, () => pin(e, at));
  assert.ok(closeViewGLStats.models >= 1, 'the creature is a body');
  const far = silVerts(); assert.ok(far > base, `the far creature takes the pass (${base} -> ${far})`);
  at = ahead(g, 1.4); for (let k = 0; k < 4; k++) frame(g, () => pin(e, at));
  assert.equal(silVerts(), base, 'within two tiles of her: no silhouette');
  at = ahead(g, 5); for (let k = 0; k < 4; k++) frame(g, () => { pin(e, at); e.telegraph = .5; });
  assert.equal(silVerts(), base, 'winding up at her: no silhouette');
  for (let k = 0; k < 4; k++) frame(g, () => pin(e, at)); assert.equal(silVerts(), far, 'calm again: it shows');
  e.hp = 0; e.dead = true; let saw = false;
  for (let k = 0; k < 20; k++) { frame(g); if (closeViewGLStats.dying > 0) { saw = true; assert.equal(silVerts(), base, 'a dying body: no silhouette'); } }
  assert.ok(saw, 'the death sequence played');
  // every pass-1 (depth GREATER) model draw stays inside the listed runs
  const runs: number[][] = []; for (let i = 0; i < GLF.nSil; i++) runs.push([GLF.silRuns[i * 2], GLF.silRuns[i * 2 + 1]]);
  for (const d of GL.draws.filter((d: any) => d.model && d.depth === GL.GREATER)) assert.ok(runs.some(([a, c]) => d.first >= a && d.first + d.count <= a + c), 'a listed run');
}));

test('props are drawn after the silhouette passes, so nothing is seen through a crate (walls still hide)', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 10; i++) frame(g);
  const at = ahead(g, 3); g.map.objects.push({ kind: 'supplyCache', id: 'vis-crate', x: Math.floor(at.x), y: Math.floor(at.y), state: 'ready' });
  const e: any = createCombatant('ashling', 0, 0); e.id = 'vis-behind'; Object.assign(e, { hp: 1e6, maxHp: 1e6 }); g.enemies = [e];
  const behind = ahead(g, 5); for (let k = 0; k < 4; k++) frame(g, () => pin(e, behind));
  assert.ok(GLF.propB > GLF.propA, `the crate is in the solids' prop range (${GLF.propA}..${GLF.propB})`);
  const D = GL.draws, lastSil = D.map((d: any) => d.depth === GL.GREATER).lastIndexOf(true);
  assert.ok(lastSil >= 0, 'a silhouette pass ran');
  const props = D.findIndex((d: any) => d.solid && d.first === GLF.propA && d.count === GLF.propB - GLF.propA);
  assert.ok(props > lastSil, `the props are drawn after it (props ${props}, last silhouette ${lastSil})`);
  assert.ok(D.slice(0, lastSil).every((d: any) => d.prog !== D[props].prog || d.first + d.count <= GLF.propA || d.first >= GLF.propB), 'and not before it');
  assert.ok(D[props].depth === GL.LEQUAL, 'opaque, depth-tested, so they cover what stands behind them');
  // the source keeps the order: silhouettes, the deferred props, then the hint and the bodies
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  const i1 = src.indexOf('calls += drawBeastsGL(gl,S.beast,beasts,1'), i2 = src.indexOf('solidRuns(true)'), i3 = src.indexOf('drawBeastsGL(gl,S.beast,beasts,0');
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2, 'creature silhouettes, then props, then bodies');
  assert.match(readFileSync(new URL('../src/close-view-beast-gl.ts', import.meta.url), 'utf8'), /pass === 1 && f\.noSil/, 'beasts honour the rule');
  assert.match(readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), /foe && closeViewSilhouetteAllowed\(foe, g\) \? At\.silAlpha/, 'creature cards honour the rule');
}));

test('a creature between the camera and the Wayfarer eases to .35 over 0.2 s and back; Reduced Motion snaps', () => withGPU(() => {
  for (const reduce of [false, true]) {
    const g = scene(reduce); for (let i = 0; i < 20; i++) frame(g);
    const e: any = createCombatant('ashling', 0, 0); e.id = `vis-between-${reduce}`; Object.assign(e, { hp: 1e6, maxHp: 1e6 }); g.enemies = [e];
    const front = ahead(g, -1.3), aside = ahead(g, 4, 3);
    for (let k = 0; k < 3; k++) frame(g, () => pin(e, aside));
    assert.equal(closeViewCreatureBetween(e), 1, 'off her line: untouched');
    const seq: number[] = []; for (let k = 0; k < 24; k++) { frame(g, () => pin(e, front)); seq.push(closeViewCreatureBetween(e)); }
    assert.ok(Math.abs(seq.at(-1)! - V.between.alpha) < 1e-6, `settles at .35 (${seq.at(-1)})`);
    if (reduce) assert.ok(Math.abs(seq[0] - V.between.alpha) < 1e-6, 'Reduced Motion: at once');
    else {
      assert.ok(seq[0] > V.between.alpha + .05 && seq[0] < 1, `eased, not cut (${seq[0].toFixed(3)})`);
      for (let i = 1; i < seq.length; i++) assert.ok(seq[i] <= seq[i - 1] + 1e-9, 'monotone in');
      const frames = seq.findIndex((v) => Math.abs(v - V.between.alpha) < 1e-6); assert.ok(frames >= 8 && frames <= 16, `about 0.2 s at 60 fps (${frames} frames)`);
      assert.ok(Math.abs(seq[5] - (1 - (1 - V.between.alpha) * smoothstep01(6 * .016 / V.between.sec))) < .08, 'on the smoothstep');
    }
    const back: number[] = []; for (let k = 0; k < 24; k++) { frame(g, () => pin(e, aside)); back.push(closeViewCreatureBetween(e)); }
    assert.equal(back.at(-1), 1, 'and back to whole off her line');
    if (!reduce) assert.ok(back[0] < 1 && back[0] > V.between.alpha, 'eased back'); else assert.equal(back[0], 1);
    // beyond her (the far side), it is never faded
    const beyond = ahead(g, 1.5); for (let k = 0; k < 20; k++) frame(g, () => pin(e, beyond)); assert.equal(closeViewCreatureBetween(e), 1, 'beyond her: untouched');
  }
}));

test('a creature card takes the floor\'s light: no floor, the same evaluation as the floor under it', () => {
  const F: any = { amb: new Float32Array([.02, .02, .02]), torch: new Float32Array([1, .8, .6]), torchP: new Float32Array([5, 1, 1.2, .25]), px: 0, py: 0,
    sun: new Float32Array([0, 0, 1, 0]), sunC: new Float32Array(3), lp: new Float32Array(32), lc: new Float32Array(32), nl: 0 };
  const dim = closeViewFloorLight(F, 20, 20, 0); assert.ok(Math.abs(dim - .02) < 1e-6, `a dark corner is as dark as its ambient (${dim})`);
  assert.ok(dim < CLOSE_VIEW.atmosphere.boardLight[0], 'below the old .42 card floor (kept only for cards that are not creatures)');
  const lit = closeViewFloorLight(F, 1, 0, 0); assert.ok(lit > dim, 'near the carried light it is lit');
  // the floor shader's own torch term with the up normal (close-view-gl.ts lightsAt)
  const fall = (d: number, R: number) => { const x = d / R, k = Math.max(0, 1 - x * x); return k * k / (1 + 2.5 * x * x); };
  const d = Math.hypot(1, 0, 1.2), want = .02 + .8 * fall(d, 5) * Math.min(1, Math.max(0, (1.2 / d + .25) / 1.25)); assert.ok(Math.abs(lit - want) < 1e-6, `${lit} = ${want}`);
  F.nl = 1; F.lp.set([20, 20, .6, 3]); F.lc.set([.9, .6, .3, 1]); assert.ok(closeViewFloorLight(F, 20, 20, 0) > dim + .1, 'a placed source lights its pool');
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /li = foe \? closeViewFloorLight\(F, X, Y, surfaceZ\(g\.map, X, Y\)\)/, 'a creature card takes the floor light where it stands');
  const gl = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(gl, /vec3 lit = mix\(env, min\(dif, env\)/, 'the 3D bodies already match the floor (release 1026), unchanged');
});
