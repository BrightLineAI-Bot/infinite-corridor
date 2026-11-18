// Low-health edge (Tim, 2026-11-18): "the screen should get a red tinge around the edges when you get to 30% health or below — the
// danger zone", refined the same day to the Viewport Closed death static, tinted red, creeping in only at the screen's edges.
// combat-visuals.ts LOW_HEALTH_EDGE, lowHealthEdgeLevel/State/Frames, drawLowHealthEdge (sharing staticFrames with the death's
// viewportNoiseFrames); renderer.ts drawLowHealth (both views; yields to FALL_RESCUE's doom cue).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOW_HEALTH_EDGE as L, VIEWPORT_CLOSED as V, lowHealthEdgeLevel, lowHealthEdgeReach, lowHealthEdgeState, lowHealthEdgeFrames, drawLowHealthEdge, viewportNoiseFrames } from '../src/combat-visuals.ts';
import { freshSave } from '../src/types.ts';
import { Game, FALL_RESCUE } from '../src/game.ts';
import { render } from '../src/renderer.ts';

// A fake canvas whose pixels the tests can read.
type Fake = { width: number; height: number; tag: string; data: Uint8ClampedArray | null; getContext: () => any };
function mk(tag = 'frame') { const made: Fake[] = []; const make = (w: number, h: number): Fake => { const c: Fake = { width: w, height: h, tag, data: null, getContext: () => ({ createImageData: (cw: number, ch: number) => ({ data: new Uint8ClampedArray(cw * ch * 4) }), putImageData: (img: any) => { c.data = img.data; } }) }; made.push(c); return c; }; return { make, made }; }
const g = (hp: number, max = 100, extra: any = {}) => ({ player: { hp }, save: { maxHp: max }, presentation: {}, ...extra });

test('the danger zone: at 30% of maximum health or below, alive; 0 at the threshold rising to 1 at none', () => {
  assert.equal(L.threshold, .3);
  assert.equal(lowHealthEdgeLevel(100, 100), -1); assert.equal(lowHealthEdgeLevel(31, 100), -1); assert.equal(lowHealthEdgeLevel(30.5, 100), -1);
  assert.equal(lowHealthEdgeLevel(30, 100), 0); assert.ok(Math.abs(lowHealthEdgeLevel(15, 100) - .5) < 1e-9); assert.ok(lowHealthEdgeLevel(1, 100) > .95);
  assert.equal(lowHealthEdgeLevel(0, 100), -1, 'dead: none'); assert.equal(lowHealthEdgeLevel(-3, 100), -1); assert.equal(lowHealthEdgeLevel(10, 0), -1, 'no maximum: none');
  assert.equal(lowHealthEdgeLevel(9, 30), 0, 'a share of the maximum, not a number of points');
});

test('it creeps further in and grows stronger as health falls', () => {
  // Tim 2026-11-18: the band deepens from 30% health and is at its full depth by 15% (reach.fullAt), then holds
  const full = Math.round(L.steps * L.reach.fullAt);
  for (let s = 1; s <= L.steps; s++) assert.ok(s <= full ? lowHealthEdgeReach(s) > lowHealthEdgeReach(s - 1) : lowHealthEdgeReach(s) === lowHealthEdgeReach(s - 1));
  assert.ok(Math.abs(lowHealthEdgeReach(full) - L.reach.max) < 1e-9, 'full depth by 15%');
  assert.equal(lowHealthEdgeReach(0), L.reach.min); assert.ok(Math.abs(lowHealthEdgeReach(L.steps) - L.reach.max) < 1e-9);
  let lastAlpha = 0, lastStep = -1;
  for (const hp of [30, 25, 20, 15, 10, 5, 1]) { const st = lowHealthEdgeState(g(hp, 100, { presentation: { reduceMotion: true } }), 1000); assert.ok(st.show); assert.ok(st.alpha > lastAlpha, `alpha at ${hp}`); assert.ok(st.step >= lastStep); lastAlpha = st.alpha; lastStep = st.step; }
  assert.ok(lowHealthEdgeState(g(30), 0).alpha > 0, 'visible already at the threshold');
  assert.equal(lowHealthEdgeState(g(30), 0).step, 0); assert.equal(lowHealthEdgeState(g(1), 0).step, L.steps);
});

test('it flickers on the death static\'s ticks; Reduced Motion (and Safe Mode) hold one still frame; a pause holds it', () => {
  const tickMs = 1000 / V.flickerHz, seen = new Set<string>(), alphas = new Set<number>();
  for (let i = 0; i < 200; i++) { const st = lowHealthEdgeState(g(10), i * tickMs + 1); seen.add(`${st.pick}:${st.flipX}:${st.flipY}`); alphas.add(st.alpha); }
  assert.ok(seen.size > 50, 'the frame is re-picked per tick'); assert.equal(alphas.size, 2, 'full or dipped');
  const a = lowHealthEdgeState(g(10), 5), b = { ...a }, c = lowHealthEdgeState(g(10), 5 + tickMs * .5); assert.equal(c.pick, b.pick, 'steady within a tick');
  for (const p of [{ reduceMotion: true }, { safeMode: true }]) { const ref = { ...lowHealthEdgeState(g(10, 100, { presentation: p }), 0) };
    for (let t = 0; t < 5000; t += 37) { const st = lowHealthEdgeState(g(10, 100, { presentation: p }), t); assert.equal(st.alpha, ref.alpha); assert.equal(st.pick, 0); assert.equal(st.flipX, false); assert.equal(st.flipY, false); assert.equal(st.still, true); } }
  const paused = { ...lowHealthEdgeState(g(10, 100, { paused: true, pauseStarted: 4000 }), 4000) };
  for (let t = 4000; t < 9000; t += 41) assert.equal(lowHealthEdgeState(g(10, 100, { paused: true, pauseStarted: 4000 }), t).pick, paused.pick, 'paused: held');
});

test('hidden when dead or falling to the death screen, and it yields to the fall cue', () => {
  assert.equal(lowHealthEdgeState(g(0), 0).show, false, 'dead');
  assert.equal(lowHealthEdgeState(g(10, 100, { fallen: { until: 1 } }), 0).show, false, 'the death beat (Viewport Closed follows)');
  assert.equal(lowHealthEdgeState(g(10), 0, true).show, false, 'the lethal-fall cue is drawn: one red cue at a time');
  assert.equal(lowHealthEdgeState(g(10), 0, true).alpha, 0);
  assert.equal(lowHealthEdgeState(g(80), 0).show, false, 'healthy');
});

test('the death static itself is unchanged, and the edge is that same static, red, masked to the edges', () => {
  // the death frames: byte for byte the formula they always had
  const d = mk(), frames: any[] = viewportNoiseFrames(d.make, 'low', 1.4); let s = 0x51a7 >>> 0;
  for (const f of frames) for (let i = 0; i < f.data.length; i += 4) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const v = 34 + ((s >>> 24) * .8 | 0), want = new Uint8ClampedArray([v * .9, v, v * .97, 255]);
    if (f.data[i] !== want[0] || f.data[i + 1] !== want[1] || f.data[i + 2] !== want[2] || f.data[i + 3] !== 255) assert.fail(`death static changed at ${i}`); }
  for (const q of ['low', 'balanced', 'full'] as const) {
    const e = mk(), red: any[] = lowHealthEdgeFrames(e.make, q, 661 / 475, 0), grey: any[] = viewportNoiseFrames(mk().make, q, 661 / 475);
    assert.equal(red.length, V.quality[q].frames); assert.equal(red[0].width, grey[0].width); assert.equal(red[0].height, grey[0].height, 'the death static\'s own size');
    const f = red[0], W = f.width, H = f.height, px = (x: number, y: number) => f.data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4);
    assert.equal(px(W >> 1, H >> 1)[3], 0, 'the middle stays clear'); assert.equal(px(0, H >> 1)[3], 255, 'the edge is solid'); assert.equal(px(W >> 1, 0)[3], 255);
    let redder = 0, n = 0; for (let i = 0; i < f.data.length; i += 4) if (f.data[i + 3] > 0) { n++; if (f.data[i] > f.data[i + 1] * 5) redder++; } assert.equal(redder, n, 'red');
  }
  const lit = (step: number) => { const fr: any = lowHealthEdgeFrames(mk().make, 'low', 1.4, step)[0]; let k = 0; for (let i = 3; i < fr.data.length; i += 4) if (fr.data[i] > 0) k++; return k / (fr.data.length / 4); };
  const thin = lit(0), deep = lit(L.steps); assert.ok(thin > .03 && thin < .4, `a thin band at the threshold (${thin.toFixed(2)})`); assert.ok(deep > thin * 1.3, `deeper near death (Tim 2026-11-18: the band starts near the Oculus button's edge, so it grows less) (${deep.toFixed(2)})`);
});

test('a frame of it is one drawImage with no per-pixel work', () => {
  const calls: string[] = []; const ctx: any = new Proxy({}, { get: (o: any, k: any) => k in o ? o[k] : (...a: any[]) => { calls.push(k); }, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  const frames = lowHealthEdgeFrames(mk().make, 'balanced', 1.4, 3);
  drawLowHealthEdge(ctx, lowHealthEdgeState(g(10), 1234), 475, 661, frames);
  assert.equal(calls.filter((k) => k === 'drawImage').length, 1); assert.ok(!calls.some((k) => /ImageData|createRadialGradient|createLinearGradient/.test(k)));
  assert.equal(ctx.imageSmoothingEnabled, false, 'nearest-neighbour'); calls.length = 0;
  drawLowHealthEdge(ctx, lowHealthEdgeState(g(80), 1234), 475, 661, frames); assert.equal(calls.length, 0, 'nothing when healthy');
});

test('the renderer: drawn in the standard view at low health, frames made once, and the fall cue takes its place', () => {
  const made: any[] = []; const anyCtx = (c: any): any => new Proxy({}, { get: (o: any, k: any) => k === 'createImageData' ? (cw: number, ch: number) => ({ data: new Uint8ClampedArray(cw * ch * 4) }) : k === 'putImageData' ? () => { c.lhe = true; } : k === 'canvas' ? c : k === 'measureText' ? () => ({ width: 10 }) : /^create/.test(k) ? () => ({ addColorStop() {} }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  const doc = { createElement: () => { const c: any = { width: 0, height: 0, style: {} }; let x: any = null; c.getContext = () => x ??= anyCtx(c); made.push(c); return c; } };
  const had = 'document' in globalThis, prev = (globalThis as any).document; (globalThis as any).document = doc;
  try {
    const s: any = freshSave(); s.seed = 'CINDER-VERGE-47'; s.maxHp = 100; const game: any = new Game(s, 0); game.enemies = []; game.player.hp = 100;
    const edgeDraws: any[] = [], stops: string[] = [];
    const ctx: any = new Proxy({}, { get: (o: any, k: any) => k === 'drawImage' ? (img: any) => { if (img?.lhe) edgeDraws.push(img); } : k === 'createRadialGradient' ? () => ({ addColorStop: (_: number, c: string) => stops.push(c) }) : k === 'createLinearGradient' || k === 'createPattern' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : k === 'canvas' ? { width: 475, height: 661 } : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
    render(ctx, game, 475, 661, 5000); assert.equal(edgeDraws.length, 0, 'full health: nothing');
    game.player.hp = 15; render(ctx, game, 475, 661, 5016); assert.equal(edgeDraws.length, 1, '15%: the red static'); const n = made.filter((c) => c.lhe).length; assert.ok(n > 0 && n <= 4, 'a few small frames');
    render(ctx, game, 475, 661, 5100); assert.equal(edgeDraws.length, 2); assert.equal(made.filter((c) => c.lhe).length, n, 'the frames are kept, not re-made each frame');
    game.fallDoomed = () => true; edgeDraws.length = 0; stops.length = 0; render(ctx, game, 475, 661, 5200);
    assert.equal(edgeDraws.length, 0, 'a lethal fall: the static yields'); assert.ok(stops.some((c) => c.startsWith(`rgba(${FALL_RESCUE.flash.color},`)), 'and the fall cue is drawn');
  } finally { if (had) (globalThis as any).document = prev; else delete (globalThis as any).document; }
});
