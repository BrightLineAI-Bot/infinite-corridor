import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { MODEL_FLOATS, modelTriangleCount } from '../src/close-view-models.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';
import { interiorArchAt } from '../src/vehicle-gates.ts';
import * as CV from '../src/close-view.ts';

const context = () => new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true),
});
const ctx = context();
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: context }));
let now = 100000;
function fixture(scenario = 'outer', preset = 'standard') {
  const g = createLabFixture({ lab: 'close-view', scenario, seed: 'CINDER-VERGE-47', variant: 0, now }).game;
  g.save.closeViewPreset = preset; g.save.closeViewAutoFollow = false;
  g.presentation = { effectiveQuality: 'full', reduceMotion: true };
  CV.resetCloseViewCamera(); CV.closeViewPan(0, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now);
  return g;
}
function frame(g, n = 1, width = 1280, height = 720) {
  for (let i = 0; i < n; i++) { now += 16; assert.equal(CV.closeViewFrame(ctx, g, width, height, now, () => {}), true); }
  return CV.closeViewCamera();
}
function safe(g) {
  const c = CV.closeViewCamera(), px = g.player.x + .5, py = g.player.y + .75;
  for (const key of ['x', 'y', 'height', 'pitch', 'distance', 'rigOffset']) assert.ok(Number.isFinite(c[key]), key);
  assert.ok(Math.abs(c.rigOffset) <= CV.closeViewPreset(g).shoulder + 1e-8, 'within existing shoulder reach');
  assert.ok(c.distance <= CV.closeViewPreset(g).distance + 1e-8, 'preset distance remains the ceiling');
  for (let i = 1; i <= 60; i++) assert.equal(CV.closeViewWallAt(g.map, px + (c.x - px) * i / 60, py + (c.y - py) * i / 60), false, 'clear feet-to-eye line including endpoint');
  let cap = CV.CLOSE_VIEW.walls.height - .15;
  const arch = CV.closeViewTheme(g.map).arch;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (interiorArchAt(g.map, c.x + i * .3, c.y + j * .3)) cap = Math.min(cap, arch.spring + arch.radius * .55 - .08);
  assert.ok(c.height <= interiorSurfaceHeight(g.map, c.x, c.y) + cap + 1e-8, 'below solid roof and arches');
}

test('actual outer entrance chooses a useful forward view with safe lateral rig reach', () => {
  const g = fixture(), tiles = JSON.stringify(g.map.tiles), save = JSON.stringify(g.save);
  assert.equal(g.map.id, 'pentagon:CINDER-VERGE-47:0:24:v8:f1'); assert.deepEqual([g.player.x, g.player.y], [25, 11]);
  const first = frame(g); safe(g);
  assert.ok(Math.abs(first.yaw - Math.PI) < 1e-8, 'looks west into the existing room');
  const c = frame(g, 300); safe(g);
  // Original exact fixture: centered .30 boom, 71.565 degree pitch, despite a
  // legal eye beside that centerline. Keep both useful distance and lower pitch.
  assert.ok(c.distance >= 1 && c.distance <= 1.2, `useful safe boom: ${c.distance}`);
  assert.ok(c.pitch < 50 * Math.PI / 180, `less overhead: ${c.pitch}`);
  assert.ok(c.rigOffset > .1 && c.rigOffset < .3);
  assert.equal(JSON.stringify(g.map.tiles), tiles); assert.equal(JSON.stringify(g.save), save);
});

test('bounded probes and persistent sides settle at actual outer, cellar, hive and arcology entries', () => {
  for (const scenario of ['outer', 'cellar', 'hive', 'arcology']) for (const preset of ['standard', 'close', 'wide']) {
    const g = fixture(scenario, preset), tiles = JSON.stringify(g.map.tiles);
    frame(g); assert.ok(CV.closeViewStats.rigProbes <= 41, 'entry: at most nine headings x four alternatives plus five live probes');
    assert.ok(CV.closeViewStats.rigSamples <= 32 * CV.closeViewStats.rigProbes, 'each probe is bounded by widest saved preset');
    frame(g, 300); const first = CV.closeViewCamera();
    for (let i = 0; i < 80; i++) {
      frame(g); safe(g);
      assert.ok(CV.closeViewStats.rigProbes <= 5); assert.ok(CV.closeViewStats.rigSamples <= 160);
      const c = CV.closeViewCamera();
      for (const key of ['x', 'y', 'distance', 'pitch', 'rigOffset']) assert.ok(Math.abs(c[key] - first[key]) < .002, `${scenario}/${preset}: stationary ${key} never pumps or alternates sides`);
      assert.equal(c.yaw, first.yaw, 'entry scoring never re-runs while stationary');
    }
    assert.equal(JSON.stringify(g.map.tiles), tiles);
  }
});

test('small corner movement retains the chosen side instead of alternating shoulders', () => {
  const g = fixture(); frame(g, 300); const yaw = CV.closeViewCamera().yaw;
  let previous = CV.closeViewCamera(), largest = 0;
  for (let i = 0; i < 240; i++) {
    g.player.y = 11 + .015 * Math.sin(i * .2); frame(g); safe(g); const c = CV.closeViewCamera();
    assert.equal(c.yaw, yaw); assert.ok(c.rigOffset > .1, 'the useful side remains persistent');
    largest = Math.max(largest, Math.hypot(c.x - previous.x, c.y - previous.y)); previous = c;
  }
  assert.ok(largest < .025, `no side jumps around the corner: ${largest}`);
});

test('manual yaw and held movement keep ownership; offset and recovery freeze across a callback-free pause', () => {
  const g = fixture(); frame(g, 240);
  const stick = { x: 0, y: -1 };
  const manualYaw = -3 * Math.PI / 4;
  CV.closeViewPan((manualYaw - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, now);
  CV.closeViewSteer(g, stick); const world = { ...stick }; CV.closeViewUnsteer(stick);
  frame(g, 200); safe(g);
  assert.ok(Math.abs(CV.closeViewCamera().yaw - manualYaw) < 1e-8, 'clearance cannot override manual look');
  CV.closeViewSteer(g, stick); assert.deepEqual(stick, world, 'held movement basis survives camera repositioning'); CV.closeViewUnsteer(stick);
  assert.ok(CV.closeViewCamera().distance < .5, 'impossible requested rear direction still shortens honestly');
  CV.closeViewPan((Math.PI - manualYaw) / CV.CLOSE_VIEW.crescent.yaw, 0, now); frame(g, 22);
  const before = CV.closeViewCamera(); g.setPaused(true, now); now += 5000; g.setPaused(false, now);
  frame(g); assert.deepEqual(CV.closeViewCamera(), before, 'neither offset spring nor hysteresis consumes suspended time');
  let largest = 0, previous = before.distance;
  for (let i = 0; i < 280; i++) { frame(g); safe(g); const c = CV.closeViewCamera(); largest = Math.max(largest, Math.abs(c.distance - previous)); previous = c.distance; }
  assert.ok(previous >= 1 && largest < .06, `smooth safe recovery: ${largest}`);
});

class GL {
  native = null; hero = null; program = null;
  constructor() { let n = 1; const constants = new Map(); return new Proxy(this, { get: (o, k) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, n++); return constants.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(s, text) { s.text = text; } attachShader(p, s) { p.shaders.push(s); } useProgram(p) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; }
  getShaderParameter() { return true; } getProgramParameter(p, k) { return k === this.ACTIVE_UNIFORMS || k === this.ACTIVE_ATTRIBUTES ? 0 : true; }
  getExtension() { return null; } getError() { return this.NO_ERROR; } getUniformLocation() { return {}; } getAttribLocation() { return 0; }
  bufferData(t, data) { if (data instanceof Float32Array && this.program?.shaders?.some(s => s.text.includes('in float a_alpha'))) this.native = Float32Array.from(data); }
  bufferSubData(t, o, data) { this.hero = Float32Array.from(data); }
}
function projectedBounds(data, stride, count, zMin = -Infinity) {
  const bounds = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, near: 0, vertices: 0 };
  for (let i = 0; i < count; i += stride) {
    if (data[i + 2] < zMin) continue;
    const q = CV.closeViewProject(data[i], data[i + 1], data[i + 2]); if (!q) { bounds.near++; continue; }
    bounds.x0 = Math.min(bounds.x0, q.sx); bounds.x1 = Math.max(bounds.x1, q.sx); bounds.y0 = Math.min(bounds.y0, q.sy); bounds.y1 = Math.max(bounds.y1, q.sy); bounds.vertices++;
  }
  return bounds;
}

test('actual submitted outer player and loaded hero vertices retain readable hood framing', async (t) => {
  const names = ['window', 'fetch', 'createImageBitmap', 'WebGL2RenderingContext'], old = new Map(names.map(n => [n, globalThis[n]]));
  const gl = new GL(), screen = context(), canvas = { width: 1280, height: 720, addEventListener() {}, getContext: k => k === 'webgl2' ? gl : context() }; screen.canvas = canvas;
  globalThis.WebGL2RenderingContext = GL; CV.setCloseViewCanvasFactory(() => canvas); CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try {
    const g = fixture();
    for (let i = 0; i < 300; i++) render(screen, g, 1280, 720, now += 16);
    assert.equal(closeViewGLStats.heroTriangles, 0, 'fallback body while asset is not loaded');
    const n = modelTriangleCount('player') * 3 * MODEL_FLOATS;
    assert.ok(gl.native && gl.native.length >= n);
    const body = projectedBounds(gl.native, MODEL_FLOATS, n), hood = projectedBounds(gl.native, MODEL_FLOATS, n, 1);
    assert.equal(body.near, 0); assert.ok(hood.vertices > 0);
    assert.ok(hood.y1 - hood.y0 < 250, 'actual submitted fallback hood was 371px at old .3 boom / 71 degree entrance');
    assert.ok(body.x0 >= 0 && body.x1 <= 1280 && body.y0 > 100 && body.y1 - body.y0 < 540);
    t.diagnostic(`fallback submitted body ${JSON.stringify(body)}; hood ${JSON.stringify(hood)}`);
    // Exact local shipped asset, no network, through its production loader and renderer hook.
    globalThis.window = {}; globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024 });
    globalThis.fetch = async url => { const u = new URL(url); assert.equal(u.protocol, 'file:'); const b = fs.readFileSync(u); return { ok: true, json: async () => JSON.parse(b.toString()), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), blob: async () => new Blob([b]) }; };
    const asset = await loadCloseViewHero(); assert.ok(asset); render(screen, g, 1280, 720, now += 16);
    assert.equal(closeViewGLStats.heroTriangles, 3170, 'real imported hero admission stays intact'); assert.ok(gl.hero?.length > 0);
    const imported = projectedBounds(gl.hero, 6, gl.hero.length), headMesh = asset.meta.meshes.find(m => m.node === asset.meta.headAttachment.node);
    assert.ok(headMesh); const headVertices = gl.hero.subarray(headMesh.firstVertex * 6, (headMesh.firstVertex + headMesh.vertexCount) * 6);
    const head = projectedBounds(headVertices, 6, headVertices.length);
    t.diagnostic(`imported submitted body ${JSON.stringify(imported)}; head ${JSON.stringify(head)}`);
    assert.equal(imported.near, 0); assert.ok(head.vertices > 0 && head.y1 - head.y0 < 250);
    assert.ok(imported.x0 >= 0 && imported.x1 <= 1280 && imported.y0 > 100 && imported.y1 - imported.y0 < 540, 'loaded hero keeps useful finite framing; lower-edge crop is recorded, not hidden');

  } finally {
    CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: context }));
    for (const n of names) { if (old.get(n) === undefined) delete globalThis[n]; else globalThis[n] = old.get(n); }
  }
});
