// Tim (2026-11-27): "In Close View, inside a town, the view flickers back and forth between Close View and Standard View. It
// should stay steadily in one view." And: the standard view's small yellow edge arrow (with its distance) goes; the dial
// already shows the target and distance, and Close View keeps its Ribbon.
// The camera is chosen each frame by close-view.ts closeViewFrame. What could switch it every few frames: a frame the device
// fails to draw (the fallback was retried on the very next frame, with a new WebGL context, so an intermittent failure
// alternated the views), and the indoor rule's open-air tiles (openAirAt: a keep's court, a yard) with Overworld Close View on
// and the indoor switch off, which switched at once on every crossing of the edge. Both now apply with hysteresis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { hamletSection } from '../src/settlements.ts';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import * as AV from '../src/atlas-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const W = 475, H = 661; // Tim's screen in CSS px
const proxy = (o: any) => new Proxy(o, { get: (t: any, k: any) => k in t ? t[k] : () => {}, set: (t: any, k: any, v: any) => { t[k] = v; return true; } });
const ctx2d = () => proxy({ canvas: null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) });
const FAULT = { every: 0, n: 0 }; // every > 0: one frame in `every` reports a GL error at its end
class StubGL {
  constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  getError() { return FAULT.every > 0 && ++FAULT.n % FAULT.every === 0 ? 1282 : (this as any).NO_ERROR; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; }
  createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; }
}
// The GPU path, as on the phone (Overworld Close View needs it); counts the WebGL contexts made.
function withGPU(run: (h: { frame: (g: any) => string, contexts: () => number, now: () => number, advance: (ms: number) => void }) => void) {
  const prev = (globalThis as any).WebGL2RenderingContext; let made = 0, contexts = 0, now = 300000; const ground = ctx2d();
  (globalThis as any).WebGL2RenderingContext = StubGL; CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); CV.resetCloseViewCamera();
  CV.setCloseViewCanvasFactory(() => { if (++made === 1) return { width: W, height: H, getContext: () => ground }; return { width: W, height: H, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? (contexts++, new StubGL()) : ctx2d() }; });
  const screen = proxy({ canvas: { width: W, height: H }, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) });
  const frame = (g: any) => { now += 16; render(screen, g, W, H, now); const close = CV.closeViewBlend().mode === 'close'; assert.equal(CV.closeViewShowing(g), close && CV.closeViewCamera().drawn, 'what is shown is what was chosen'); return close ? 'C' : 's'; };
  try { run({ frame, contexts: () => contexts, now: () => now, advance: (ms) => { now += ms; } }); }
  finally { FAULT.every = 0; CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
const switches = (seq: string) => { let n = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) n++; return n; };

test('the blend table holds the hysteresis numbers (data, not literals in the logic)', () => {
  const B = CV.CLOSE_VIEW.blend;
  assert.ok(B.settle > 0 && B.dwell >= B.settle && B.edge > 0 && B.edge < .5, 'a threshold holds a moment, then a while, and only well past the edge');
  assert.ok(B.failWindow > B.failHold && B.failHoldMax >= B.failHold && B.failHold >= 1000, 'repeated failures hold the standard view for seconds, not frames');
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), body = src.slice(src.indexOf('export function closeViewFrame('), src.indexOf('// The last frame drawn, which is still on the canvas'));
  assert.match(body, /B\.settle/); assert.match(body, /B\.dwell/); assert.match(body, /B\.failHold/); assert.match(body, /thresholdFirm\(g, B\.edge\)/);
  assert.doesNotMatch(body, /MODE\.pend = MODE\.cur;\s*MODE\.wanted/, 'the pending threshold is no longer reset every frame');
});

test('towns in the overworld: Ember Refuge, Glasshaven, Coilmarket and a hamlet, walked through with Overworld Close View on, never switch the view', () => {
  const s: any = freshSave(); s.seed = 'CINDER-VERGE-47'; s.overworldCloseView = true; s.closeView = false; s.closeViewPreset = 'close'; s.closeViewZoom = -.72; // Tim's camera
  const g: any = new Game(s, 0); g.presentation = { effectiveQuality: 'low' };
  const towns: number[][] = [[0, 0], [4, -2], [-5, 3]];
  for (let rx = 1, tries = 0; rx < 400 && tries < 12; rx++) if (hamletSection(s.seed, rx, 0)) { tries++; g.rx = rx; g.ry = 0; g.loadArea('overworld'); if (g.map.settlement?.procedural) { towns.push([rx, 0]); break; } }
  assert.equal(towns.length, 4, 'a hamlet to walk through');
  withGPU(({ frame }) => {
    for (const [x, y] of towns) {
      g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = [];
      if (x || y) assert.ok(g.map.settlement, `a town at ${x},${y}`);
      const S = Number.isFinite(g.map.settlement?.x) ? g.map.settlement : { x: 16, y: 16 }; let seq = '';
      for (let i = 0; i < 20; i++) seq += frame(g); // arrive
      for (let i = 0; i < 240; i++) { const a = i / 40, r = 2 + i / 40; g.player.x = Math.max(1, Math.min(30, S.x + Math.cos(a) * r)); g.player.y = Math.max(1, Math.min(30, S.y + Math.sin(a) * r)); seq += frame(g); } // a widening spiral through the square
      const shown = seq.replace(/^s+/, '');
      assert.ok(shown.length > 200, `town ${x},${y}: Close View shows`); assert.equal(switches(shown), 0, `town ${x},${y}: ${seq}`);
    }
  });
});

// A keep's floor with a court (open air) east of the Wayfarer's column: the indoor rule's edge.
function courtFloor(indoor: boolean) {
  const g: any = createLabFixture({ lab: 'close-view', scenario: 'building', now: 1000 }).game; g.enemies = [];
  g.save.closeView = indoor; g.save.overworldCloseView = true; g.presentation = { effectiveQuality: 'low' };
  const x0 = Math.floor(g.player.x); for (const t of g.map.tiles) t.courtyard = t.x > x0;
  return { g, x0, y0: g.player.y };
}

test("a court's edge with Overworld Close View on and the indoor switch off: weaving along it never switches; crossing it switches once", () => withGPU(({ frame }) => {
  const { g, x0, y0 } = courtFloor(false); g.player.x = x0 - 2; let seq = '';
  for (let i = 0; i < 30; i++) seq += frame(g);
  assert.equal(seq.at(-1), 's', 'under the roof, the indoor switch off: the standard view (the existing rule)');
  // openAirAt samples x + .5: the edge is at x = x0 + .5. Weave ±.3 tiles across it at walking pace, for five seconds.
  let raw = 0, last: any = null; seq = '';
  for (let i = 0; i < 300; i++) { g.player.x = x0 + .5 + .3 * Math.sin(i / 6); g.player.y = y0 + Math.sin(i / 50); seq += frame(g); const a = CV.closeViewApplies(g); if (last !== null && a !== last) raw++; last = a; }
  assert.ok(raw >= 10, `the tile rule alone toggles ${raw} times`); assert.equal(switches(seq), 0, `weaving: ${seq}`);
  // walk into the court and stay: one switch, a moment after the edge
  seq = ''; for (let i = 0; i < 80; i++) { g.player.x = x0 - 1 + i * .05; g.player.y = y0; seq += frame(g); }
  assert.equal(switches(seq), 1, seq); assert.equal(seq.at(-1), 'C');
  // and back under the roof: one more
  seq = ''; for (let i = 0; i < 80; i++) { g.player.x = x0 + 3 - i * .05; seq += frame(g); }
  assert.equal(switches(seq), 1, seq); assert.equal(seq.at(-1), 's');
}));

test('with both switches on, Close View holds across the edge: no switch at all', () => withGPU(({ frame }) => {
  const { g, x0, y0 } = courtFloor(true); g.player.x = x0 - 2; let seq = '';
  for (let i = 0; i < 20; i++) seq += frame(g);
  for (let i = 0; i < 200; i++) { g.player.x = x0 - 2 + i * .03; g.player.y = y0 + Math.sin(i / 9) * .4; seq += frame(g); }
  assert.equal(seq.replace(/^s+/, '').includes('s'), false, seq);
}));

test('an intermittent GPU failure: the failed frame falls back and is retried at once, but repeated failures hold the standard view steadily', () => withGPU(({ frame, contexts, advance }) => {
  const { g, x0 } = courtFloor(true); g.player.x = x0 - 2; let seq = '';
  for (let i = 0; i < 20; i++) seq += frame(g); assert.equal(seq.at(-1), 'C');
  // one failure: the next frame is Close View again (the established fallback contract)
  const before = CV.closeViewSwitchStats.failures; FAULT.n = 0; FAULT.every = 1; assert.equal(frame(g), 's'); FAULT.every = 0;
  assert.equal(frame(g), 'C', 'a single failed frame recovers at once'); assert.equal(CV.closeViewSwitchStats.failures, before + 1);
  advance(CV.CLOSE_VIEW.blend.failWindow + 1); for (let i = 0; i < 5; i++) frame(g); // that failure is now history
  // one frame in four fails (before 2026-11-27: C C C s, every four frames, and a new WebGL context each time)
  const c0 = contexts(); FAULT.n = 0; FAULT.every = 4; seq = '';
  for (let i = 0; i < 300; i++) seq += frame(g); FAULT.every = 0;
  assert.ok(switches(seq) <= 6, `${switches(seq)} switches in 300 frames: ${seq}`);
  assert.ok(contexts() - c0 <= 3, `${contexts() - c0} new WebGL contexts`);
  assert.match(seq, /s{100,}/, 'the standard view holds steadily');
  assert.equal(CV.closeViewSwitchStats.held, true);
  // the hold ends; the device draws again: Close View comes back and stays
  advance(CV.CLOSE_VIEW.blend.failHoldMax + 1); seq = ''; for (let i = 0; i < 60; i++) seq += frame(g);
  assert.equal(seq.at(-1), 'C'); assert.ok(switches(seq) <= 1, seq);
}));

test('the standard view has no edge arrow: nothing computes it a frame; the dial and the Close View Ribbon stay', () => {
  assert.equal((AV as any).compassEdge, undefined, 'atlas-view.ts no longer exports it');
  assert.equal((AV.COMPASS_RIBBON as any).edge, undefined, 'nor keeps its margins');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /compassEdge|compass-edge|ce-dist|ce-chev/);
  assert.doesNotMatch(css, /compass-edge|\.ce-(rot|chev|glow|dist)\b/);
  const views = main.slice(main.indexOf('function renderCompassViews('), main.indexOf('// Active quests (Journal tab'));
  assert.match(views, /ribbonLayout\(P,compassHere,compassMarks\)/, 'the Ribbon is laid out in Close View as before');
  assert.match(views, /hudSet\(R\.dist,"text",t\)/, "the Ribbon's distance stays");
  assert.match(views, /hudSet\(compassWarmEl,"class:on",!close&&r\.on&&r\.warm\)/, 'the warm glow (no direction) stays');
  assert.match(css, /\.compass-ribbon \{[^}]*pointer-events: none;/);
});

test('Copy diagnostics carries the camera switch counts and the GPU state', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /closeView:\{\.\.\.closeViewSwitchStats,options:\{indoor:save\.closeView===true,overworld:save\.overworldCloseView===true\},render:closeViewRenderDiagnostics\(\)\}/);
  for (const k of ['switches', 'failures', 'holds', 'held']) assert.ok(k in CV.closeViewSwitchStats, k);
});
