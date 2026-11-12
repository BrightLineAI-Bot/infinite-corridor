// Close View section heading (Tim, 2026-11-12): "The camera does a weird change when you transition between sections. The
// camera should just point straight ahead so the Wayfarer is facing the new section." On a crossing the camera is put straight
// behind the Wayfarer looking along the crossing, every spring at its target from the first frame (CLOSE_VIEW.camera.crossing).
// Other arrivals in the open overworld from another map (Wayglass travel, a dungeon's exit) look the way the Wayfarer faces.
// Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewCamera, closeViewPan, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

const X: any = (CLOSE_VIEW.camera as any).crossing, P: any = CLOSE_VIEW.presets.standard;
const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

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
// The overworld test tile in Close View, the Wayfarer at (x, y), the view turned `turn` radians off its facing and tilted, a
// second of frames at 60 a second.
function scene(x: number, y: number, facing: string, turn = 0) {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.presentation = { effectiveQuality: 'low', reduceMotion: false }; g.enemies = [];
  g.player.x = x; g.player.y = y; g.player.facing = facing; let T = 50000; resetCloseViewCamera(); render(screen, g, 390, 844, T += 16); assert.equal(closeViewShowing(g), true);
  closeViewPan(turn / CLOSE_VIEW.crescent.yaw, 30, T);
  const frame = () => { render(screen, g, 390, 844, T += 16); return closeViewCamera(); };
  for (let i = 0; i < 60; i++) frame();
  return { g, frame };
}
// Where the camera stands with no lag: the boom straight back from the Wayfarer's feet along the view, the shoulder to its right.
const behind = (g: any, c: any) => { const fx = Math.cos(c.yaw), fy = Math.sin(c.yaw), px = g.player.x + .5, py = g.player.y + .75; return { x: px - fx * c.distance - fy * c.shoulder, y: py - fy * c.distance + fx * c.shoulder }; };
const CROSSINGS: [string, number, number, number][] = [['north', 0, -1, -Math.PI / 2], ['south', 0, 1, Math.PI / 2], ['east', 1, 0, 0], ['west', -1, 0, Math.PI]];
// Each crossing's last step: the Wayfarer at the leaving edge, facing and the view both somewhere else (the old cause: the
// view's yaw came from the four-way facing, or an eight-way sweep, and the crane, shoulder and rig eased in from indoor defaults).
const start = (dx: number, dy: number) => ({ x: dx > 0 ? 30.6 : dx < 0 ? .2 : 13, y: dy > 0 ? 30.6 : dy < 0 ? .2 : 9 });

test('the crossing rule is data: snap, face the travel', () => {
  assert.ok(Object.isFrozen(X), 'a frozen table entry');
  assert.equal(X.snap, true); assert.equal(X.faceTravel, true);
  assert.ok(X.edge >= 1 && X.edge <= 3, `arrival within a tile or so of the edge (${X.edge})`);
});

for (const [name, dx, dy, yaw] of CROSSINGS) test(`crossing ${name}: the view looks along the crossing from the first frame, straight behind the Wayfarer, no sweep`, () => withGPU(() => {
  const at = start(dx, dy), s = scene(at.x, at.y, dx ? 'down' : 'left', 1.2), before = s.frame();
  assert.ok(Math.abs(wrap(before.yaw - yaw)) > .5, 'the old view looked elsewhere');
  s.g.transitionSection(dx, dy); assert.equal(s.g.area, 'overworld');
  const frames: any[] = [];
  for (let i = 0; i < 60; i++) { s.g.player.x += dx * .05; s.g.player.y += dy * .05; const c = s.frame(); frames.push({ ...c, behind: behind(s.g, c) }); }
  assert.equal(closeViewShowing(s.g), true);
  frames.forEach((c, i) => {
    assert.ok(Math.abs(wrap(c.yaw - yaw)) < 1e-6, `frame ${i}: looking ${name} (${c.yaw.toFixed(3)})`);
    assert.ok(Math.abs(wrap(c.inputYaw - yaw)) < 1e-6, `frame ${i}: the stick walks ${name}`);
    const b = c.behind, off = Math.hypot(c.x - b.x, c.y - b.y);
    assert.ok(off < 1, `frame ${i}: within a tile of the place behind the Wayfarer (${off.toFixed(2)})`);
    assert.ok(Math.abs(c.pitchUser) < 1e-9, 'the user tilt is let go');
  });
  // no frame-to-frame sweep across the section: the eye moves with the Wayfarer, about their step a frame
  for (let i = 1; i < frames.length; i++) assert.ok(Math.hypot(frames[i].x - frames[i - 1].x, frames[i].y - frames[i - 1].y) < .2, `frame ${i}: no sweep`);
  assert.ok(Math.abs(frames[0].distance - P.outdoorDistance) < .02 || frames[0].distance < P.outdoorDistance, 'the outdoor boom');
}));

test('after a crossing the springs start at their targets: a still Wayfarer, a still camera from the first frame', () => withGPU(() => {
  for (const [name, dx, dy] of CROSSINGS) {
    const at = start(dx, dy), s = scene(at.x, at.y, 'up', -.9); s.g.transitionSection(dx, dy);
    const first = s.frame(), still: any[] = []; for (let i = 0; i < 90; i++) still.push(s.frame());
    for (const c of still) {
      for (const k of ['x', 'y', 'height', 'distance', 'shoulder', 'rigOffset', 'anchorZ', 'pitch']) assert.ok(Math.abs(c[k] - first[k]) < 1e-3, `${name}: ${k} holds (${first[k].toFixed(3)} -> ${c[k].toFixed(3)})`);
    }
    assert.ok(first.height - first.anchorZ > P.height + .3, `${name}: the outdoor crane at once, not the indoor default (${(first.height - first.anchorZ).toFixed(2)})`);
    assert.ok(first.shoulder > .2, `${name}: the shoulder at once (${first.shoulder.toFixed(2)})`);
  }
}));

test('after the snap the ordinary camera resumes: a pan turns the view and the walk with it', () => withGPU(() => {
  const s = scene(13, .2, 'up'); s.g.transitionSection(0, -1); s.frame();
  closeViewPan(.5 / CLOSE_VIEW.crescent.yaw, 0, 0); const c = s.frame();
  assert.ok(Math.abs(wrap(c.yaw - (-Math.PI / 2 + .5))) < 1e-6, 'the pan turned the view');
  assert.ok(Math.abs(wrap(c.inputYaw - c.yaw)) < 1e-6, 'and the walk with it');
}));

test('Wayglass travel into the open overworld snaps the same way and looks the way the Wayfarer faces', () => withGPU(() => {
  const s = scene(13, 20, 'up', 1.5); s.g.save.activeCheckpoint = { name: 'nowhere' }; s.g.player.facing = 'left';
  const map = s.g.map; assert.notEqual(s.g.travelToCheckpoint(), false); assert.notEqual(s.g.map, map);
  s.g.player.facing = 'left'; const first = s.frame();
  if (!closeViewShowing(s.g)) return; // the refuge may stand in a building: the indoor camera's own entry applies there
  assert.ok(Math.abs(wrap(first.yaw - Math.PI)) < 1e-6, `facing west (${first.yaw.toFixed(3)})`);
  const still: any[] = []; for (let i = 0; i < 30; i++) still.push(s.frame());
  for (const c of still) for (const k of ['height', 'distance', 'shoulder']) assert.ok(Math.abs(c[k] - first[k]) < 1e-3, `${k} holds`);
}));
