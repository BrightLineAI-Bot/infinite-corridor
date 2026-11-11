import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import * as CV from '../src/close-view.ts';

const context = () => new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true),
});
class GL {
  program: any = null;
  constructor() { let n = 1; const constants = new Map(); return new Proxy(this, { get: (o, k) => { if (k in o) return (o as any)[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, n++); return constants.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(s: any, text: string) { s.text = text; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; }
  getShaderParameter() { return true; } getProgramParameter(p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; }
  getExtension() { return null; } getError() { return (this as any).NO_ERROR; } getUniformLocation() { return {}; } getAttribLocation() { return 0; }
}
const gl: any = new GL(), ctx = context(), canvas: any = { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : context() };
ctx.canvas = canvas; (globalThis as any).WebGL2RenderingContext = GL; CV.setCloseViewCanvasFactory(() => canvas); resetCloseViewGL();
let now = 1000;

function fixture(family: string, mode = 'pilot') {
  const f = createLabFixture({ lab: 'close-view', scenario: `padding-${family}-${mode}`, seed: 'CINDER-VERGE-47', now });
  f.game.enemies = []; f.game.save.closeViewAutoFollow = false; f.game.presentation = { effectiveQuality: 'full', reduceMotion: true };
  return f;
}
function frame(g: any, count = 1, width = 390, height = 844) {
  for (let i = 0; i < count; i++) { now += 16; CV.closeViewFrame(ctx, g, width, height, now, () => {}); }
  assert.equal(CV.closeViewCamera().valid, true, `wanted=${CV.closeViewWanted(g)} applies=${CV.closeViewApplies(g)} area=${g.area} point=${g.player.x},${g.player.y}`);
  return CV.closeViewCamera();
}
function at(g: any, point: { x: number, y: number }, yaw: number) {
  Object.assign(g.player, { x: point.x, y: point.y }); CV.resetCloseViewCamera(); frame(g);
  CV.closeViewPan((yaw - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, now); return frame(g, 180);
}
function body(g: any) {
  const p = g.player, z = interiorSurfaceHeight(g.map, p.x + .5, p.y + .75), h = CV.CLOSE_VIEW.camera.framing.bodyHeight;
  return [CV.closeViewProject(p.x + .5, p.y + .82, z), CV.closeViewProject(p.x + .5, p.y + .82, z + h)];
}

function safe(g: any, c: ReturnType<typeof CV.closeViewCamera>) {
  const px = g.player.x + .5, py = g.player.y + .75;
  assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false);
  for (let i = 1; i <= 40; i++) assert.equal(CV.closeViewWallAt(g.map, px + (c.x - px) * i / 40, py + (c.y - py) * i / 40), false);
}

test('Keep 5 and Pentagon 10 tight-corner orbits gain bounded focal room without changing orbit or clipping the body', () => {
  const cases = [
    ['keep', { x: 23, y: 7 }, -17 * Math.PI / 18],
    ['pentagon', { x: 25, y: 4 }, -11 * Math.PI / 18],
  ] as const;
  for (const [family, point, yaw] of cases) {
    const f = fixture(family); assert.ok(f.roomPadding.cells.some((q: any) => q.x === point.x && q.y === point.y));
    const c = at(f.game, point, yaw); safe(f.game, c);
    assert.ok(Math.abs(c.yaw - yaw) < 1e-9, `${family}: collision relief preserves exact user orbit`);
    assert.ok(c.distance < CV.CLOSE_VIEW.camera.minDistance, `${family}: exercises the physically compressed corner`);
    const projected = body(f.game);
    for (const q of projected) {
      assert.ok(q && q.depth > CV.CLOSE_VIEW.near && q.sx >= 0 && q.sx <= 390 && q.sy >= 0 && q.sy <= 844,
        `${family}: real foot/head projection remains in front of the near plane and in portrait frame; camera=${JSON.stringify(c)} q=${JSON.stringify(q)}`);
    }
    assert.ok(Math.abs(projected[0]!.sy - projected[1]!.sy) < (family === 'keep' ? 75 : 50), `${family}: bounded focal relief opens context around the compressed body`);
  }
});

test('ordinary Pentagon camera keeps its established preset while routed-corner relief recovers smoothly', () => {
  const ordinary = createLabFixture({ lab: 'close-view', scenario: 'outer', seed: 'CINDER-VERGE-47', now }).game;
  ordinary.enemies = []; ordinary.save.closeViewAutoFollow = false; ordinary.presentation = { effectiveQuality: 'full', reduceMotion: true };
  const baseline = at(ordinary, { x: ordinary.player.x, y: ordinary.player.y }, Math.PI);
  assert.ok(Math.abs(baseline.distance - 1.1) < .01 && Math.abs(baseline.pitch - .7395576356131514) < .01,
    `ordinary environment retains its established camera preset; ${JSON.stringify(baseline)}`);

  const f = fixture('keep'), yaw = -17 * Math.PI / 18;
  at(f.game, { x: 23, y: 7 }, yaw); Object.assign(f.game.player, f.roomPadding.approach);
  frame(f.game, 10); let previous = CV.closeViewCamera(), largest = 0;
  for (let i = 0; i < 170; i++) { const c = frame(f.game); safe(f.game, c); largest = Math.max(largest, Math.hypot(c.x - previous.x, c.y - previous.y, c.height - previous.height)); previous = c; }
  assert.ok(Math.abs(previous.yaw - yaw) < 1e-9, 'recovery never steers the orbit');
  assert.ok(previous.distance >= CV.CLOSE_VIEW.camera.minDistance && largest < .08, `bounded spring recovery is smooth (${largest})`);
});
