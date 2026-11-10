import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { CLOSE_VIEW_HOOKS, closeViewStats, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL, GLF } from '../src/close-view-gl.ts';

const noopContext = () => new Proxy({
  canvas: null,
  measureText: () => ({ width: 10 }),
  getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createPattern: () => ({}),
}, {
  get: (object, key) => key in object ? object[key] : () => {},
  set: (object, key, value) => { object[key] = value; return true; },
});

class MockWebGL2RenderingContext {
  constructor() {
    let constant = 1; const constants = new Map();
    return new Proxy(this, {
      get: (object, key) => {
        if (key in object) return object[key];
        if (typeof key === 'string' && /^[A-Z][A-Z0-9_]+$/.test(key)) { if (!constants.has(key)) constants.set(key, constant++); return constants.get(key); }
        return () => {};
      },
    });
  }
  isContextLost() { return false; }
  createShader() { return {}; }
  createProgram() { return {}; }
  createBuffer() { return {}; }
  createTexture() { return {}; }
  createVertexArray() { return {}; }
  getShaderParameter() { return true; }
  getProgramParameter(program, parameter) {
    return parameter === this.ACTIVE_UNIFORMS || parameter === this.ACTIVE_ATTRIBUTES ? 0 : true;
  }
  getExtension() { return null; }
}

test('the GPU Close View renders captured actors on every new interior heightfield', () => {
  const previous = globalThis.WebGL2RenderingContext;
  globalThis.WebGL2RenderingContext = MockWebGL2RenderingContext;
  const gl = new MockWebGL2RenderingContext(), screen = noopContext();
  const canvas = { width: 390, height: 844, addEventListener() {}, getContext: (kind) => kind === 'webgl2' ? gl : noopContext() };
  screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try {
    let now = 100000;
    for (const scenario of ['terrain-ramps', 'platform-chain', 'indoor-drone', 'terrain-pentagon', 'vertical-gallery-keep', 'vertical-gallery-pentagon', 'vertical-gallery-drone']) {
      const { game } = createLabFixture({ lab: 'close-view', scenario, now });
      game.presentation = { effectiveQuality: 'full' }; resetCloseViewCamera();
      const before = closeViewGLStats.frames;
      assert.doesNotThrow(() => { for (let i = 0; i < 4; i++) render(screen, game, 390, 844, now += 16); }, scenario);
      assert.ok(closeViewGLStats.frames > before, `${scenario}: GPU frame completed`);
      assert.equal(closeViewStats.gl, 1, `${scenario}: WebGL path, not the fallback`);
      assert.ok(closeViewGLStats.drawCalls > 0, `${scenario}: GPU draw calls submitted`);
      if(scenario.startsWith('vertical-gallery-'))assert.equal(GLF.amb[0]>.4,scenario!=='vertical-gallery-pentagon',`${scenario}: authored ambient lighting`);
      assert.ok(closeViewGLStats.models > 0 || closeViewGLStats.boards > 0, `${scenario}: a native model or captured sprite was submitted`);
    }
  } finally {
    CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null);
    if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous;
  }
});
