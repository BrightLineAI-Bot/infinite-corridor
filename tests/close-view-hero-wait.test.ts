// Close View play-through of 926, bug 11: at a scene's start a stand-in Wayfarer (the native body) showed and then popped to the
// real imported model. While the real model is on its way nothing stands in for the Wayfarer (no body, no sprite card), for at
// most CLOSE_VIEW_HERO_WAIT.maxMs; past that the native body stands in; once ready, the real model is drawn. The failed-load
// fallback is in close-view-hero-wait-unavailable.test.ts (the asset loader keeps its answer for the whole process).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCloseViewHero, closeViewHeroAssetStatus } from '../src/close-view-hero.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HERO_WAIT, CLOSE_VIEW_HOOKS, closeViewRenderDiagnostics, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';

const context = () => new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => (o[k] = v, true) });
class GL {
  uploads: Float32Array[] = [];
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return {}; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; } getError() { return (this as any).NO_ERROR; } getUniformLocation() { return {}; } getAttribLocation() { return 0; }
  bufferSubData(_t: any, _o: any, a: any) { this.uploads.push(Float32Array.from(a)); }
}
const respond = (url: any) => { const u = new URL(url); assert.equal(u.protocol, 'file:', 'never a network'); const b = fs.readFileSync(u); return { ok: true, json: async () => JSON.parse(b.toString()), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), blob: async () => new Blob([b]) }; };

test('926 bug 11: no stand-in Wayfarer while the real model loads; the native body only after the wait; then the real model', async () => {
  const names = ['window', 'fetch', 'createImageBitmap', 'Image', 'WebGL2RenderingContext'], old = new Map(names.map((n) => [n, (globalThis as any)[n]]));
  const gl = new GL(), screen: any = context(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : context() }; screen.canvas = canvas;
  (globalThis as any).WebGL2RenderingContext = GL; setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  let release: any = null; const first = new Promise((r) => { release = r; });
  (globalThis as any).window = {}; (globalThis as any).Image = function Image() {}; (globalThis as any).createImageBitmap = async () => ({ width: 1024, height: 1024 });
  (globalThis as any).fetch = async (url: any) => { if (release) { const go = first; await go; } return respond(url); }; // the first request hangs until released
  try {
    const { game: g } = createLabFixture({ lab: 'creature-assets', scenario: 'ashenHound', now: 100000 }); g.enemies = []; g.presentation = { effectiveQuality: 'full', reduceMotion: false };
    resetCloseViewCamera(); let t = 100000;
    for (let i = 0; i < 30; i++) { render(screen, g, 390, 844, t += 16); assert.equal(closeViewHeroAssetStatus(), 'loading');
      assert.equal(closeViewRenderDiagnostics().player, 'pending', 'nothing stands in while the real model is on its way');
      assert.equal(closeViewGLStats.models, 0, 'no native stand-in body'); assert.equal(closeViewGLStats.heroTriangles, 0); }
    t += CLOSE_VIEW_HERO_WAIT.maxMs + 50; render(screen, g, 390, 844, t);
    assert.equal(closeViewRenderDiagnostics().player, 'native', 'a load that never finishes: the native body stands in after the wait');
    const r = release; release = null; r(); const asset = await loadCloseViewHero(); assert.ok(asset, 'loaded');
    render(screen, g, 390, 844, t += 16);
    assert.equal(closeViewRenderDiagnostics().player, 'imported'); assert.equal(closeViewGLStats.heroTriangles, 3170, 'the real model');
    // A later scene start (a new map) with the model ready draws it from the first frame.
    const { game: h } = createLabFixture({ lab: 'creature-assets', scenario: 'ashenHound', now: 200000 }); h.enemies = []; h.presentation = g.presentation;
    resetCloseViewCamera(); render(screen, h, 390, 844, 200016); assert.equal(closeViewRenderDiagnostics().player, 'imported', 'never a stand-in once the model is ready');
  } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); for (const n of names) { if (old.get(n) === undefined) delete (globalThis as any)[n]; else (globalThis as any)[n] = old.get(n); } }
});

