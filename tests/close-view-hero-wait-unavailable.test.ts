// Close View play-through of 926, bug 11 (see close-view-hero-wait.test.ts): the native fallback is kept when the real model
// cannot load. A failed load stands the native body in at once, with no wait. (Its own file: the loader keeps its answer.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCloseViewHero, closeViewHeroAssetStatus } from '../src/close-view-hero.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, closeViewRenderDiagnostics, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';

const context = () => new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => (o[k] = v, true) });
class GL {
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return {}; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; } getError() { return (this as any).NO_ERROR; } getUniformLocation() { return {}; } getAttribLocation() { return 0; }
}

test('926 bug 11: an asset that fails to load leaves the native Wayfarer in place, at once', async () => {
  const names = ['window', 'fetch', 'Image', 'WebGL2RenderingContext'], old = new Map(names.map((n) => [n, (globalThis as any)[n]]));
  const gl = new GL(), screen: any = context(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : context() }; screen.canvas = canvas;
  (globalThis as any).WebGL2RenderingContext = GL; setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  (globalThis as any).window = {}; (globalThis as any).Image = function Image() {}; (globalThis as any).fetch = async () => ({ ok: false });
  try {
    const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'ashenHound', now: 100000 }); g.enemies = []; g.presentation = { effectiveQuality: 'full', reduceMotion: false };
    resetCloseViewCamera(); render(screen, g, 390, 844, 100016); assert.equal(closeViewHeroAssetStatus(), 'loading');
    assert.equal(closeViewRenderDiagnostics().player, 'pending', 'held while the load is in flight');
    assert.equal(await loadCloseViewHero(), null); assert.equal(closeViewHeroAssetStatus(), 'unavailable');
    render(screen, g, 390, 844, 100032);
    assert.equal(closeViewRenderDiagnostics().player, 'native', 'the native body stands in at once'); assert.equal(closeViewGLStats.models, 1);
  } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); for (const n of names) { if (old.get(n) === undefined) delete (globalThis as any)[n]; else (globalThis as any)[n] = old.get(n); } }
});
