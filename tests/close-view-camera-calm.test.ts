// Close View camera calm (Tim, 2026-11-12, the overworld): "the camera just zooms in so much on the player based on the
// terrain... when you get to the edge of the sections, the camera still zooms in, even though you can still see the player";
// "could be moved out just a little bit more... maybe like another tile"; "when you transition between levels or elevations,
// sometimes it just does a cut that's too quick"; "he jumps so much higher than the blocks". Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { canStep } from '../src/landscape.ts';
import { OUTDOOR, outdoorRelief, outdoorSurfaceZ } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, CLOSE_VIEW_LEAP, closeViewCamera, closeViewLeap, closeViewPan, closeViewShowing, closeViewWallAt, closeViewOccluder, presentLeap, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

const C = CLOSE_VIEW.camera, O = C.outdoor, V = C.vertical, L = OUTDOOR.terrain.level;
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

// The overworld test tile (32 x 32; rows 22-30 open level ground; rows 8-10 open off the east edge), the camera turned to
// look along `yaw`, the boom behind. Frames at 60 per second.
function scene(x: number, y: number, yaw: number, reduceMotion = true, preset = 'standard') {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = true; g.save.closeViewPreset = preset; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion }; g.enemies = [];
  g.player.x = x; g.player.y = y; let T = 50000; resetCloseViewCamera(); render(screen, g, 390, 844, T += 16); assert.equal(closeViewShowing(g), true);
  closeViewPan(wrap(yaw - closeViewCamera().yaw) / CLOSE_VIEW.crescent.yaw, -closeViewCamera().pitchUser / CLOSE_VIEW.crescent.pitch, T - 10000);
  const frame = (n = 1) => { for (let i = 0; i < n; i++) render(screen, g, 390, 844, T += 16); return closeViewCamera(); };
  frame(240);
  return { g, frame, ground: () => outdoorSurfaceZ(outdoorRelief(g.map), g.player.x + .5, g.player.y + .75), now: () => T };
}
const setElev = (g: any, x0: number, x1: number, y0: number, y1: number, elev: number) => { const w = g.map.width || 32; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.map.tiles[y * w + x] = { ...g.map.tiles[y * w + x], elev }; };
// the line from the chest to the eye clears the ground (checked far finer than the camera samples it)
function chestLineClear(g: any, c: any, z: number) {
  const R = outdoorRelief(g.map), px = g.player.x + .5, py = g.player.y + .75;
  for (let i = 1; i <= 80; i++) { const k = i / 80, line = z + O.chest + (c.height - z - O.chest) * k; if (line < outdoorSurfaceZ(R, px + (c.x - px) * k, py + (c.y - py) * k) + O.clear - .02) return false; }
  return true;
}

test('the calm thresholds are data: a chest line, a fixed handful of samples, eased pull-in and let-out, the vertical follow, the jump apex', () => {
  assert.ok(O.chest >= .9 && O.chest <= 1.2, `the chest, not the feet (${O.chest})`);
  assert.ok(Number.isInteger(O.samples) && O.samples >= 6 && O.samples <= 16, 'a fixed handful of terrain samples a frame');
  assert.ok(O.pullIn > 0 && O.letOut > 0 && O.letOut < O.pullIn && O.riseRate > 0 && O.hold > 0, 'eased both ways, let out more slowly and only after a hold');
  assert.equal(O.edgeOpen, true);
  assert.ok(V.tau >= .25 && V.tau <= .4 && V.reducedTau < V.tau && V.maxLag > L && V.maxLag < 2 * L && V.snap > 2 * L, 'the height follow');
  for (const id of ['close', 'standard', 'wide']) { const P: any = CLOSE_VIEW.presets[id]; assert.ok(Math.abs(P.outdoorDistance - P.distance - 1) < .05, `${id}: a tile further out in the overworld (${P.distance} -> ${P.outdoorDistance})`); }
  assert.ok(CLOSE_VIEW_LEAP.apexMargin > 0 && CLOSE_VIEW_LEAP.apexMargin <= .25, 'a jump peaks a little over the step');
});

test('in the open overworld the boom is a tile longer; terrain below the chest line moves neither the boom nor the crane', () => withGPU(() => {
  const s = scene(10.5, 26, Math.PI), P: any = CLOSE_VIEW.presets.standard, flat = s.frame();
  assert.ok(Math.abs(flat.distance - P.outdoorDistance) < .02, `the full overworld boom (${flat.distance.toFixed(2)})`);
  assert.ok(Math.abs(flat.height - s.ground() - P.outdoorHeight) < .02, 'at its outdoor height');
  // a one-level ledge a tile behind the Wayfarer's heels, and a half-level block further back: both under the line from the
  // chest to the eye (before, the line ran from the hips and that ledge threw the crane up most of a tile at once)
  setElev(s.g, 12, 12, 22, 30, 1); setElev(s.g, 14, 14, 22, 30, .5);
  const seen: any[] = []; for (let i = 0; i < 90; i++) seen.push(s.frame());
  for (const c of seen) {
    assert.ok(Math.abs(c.distance - flat.distance) < 1e-6, `the boom holds (${c.distance.toFixed(3)})`);
    assert.ok(Math.abs(c.height - flat.height) < 1e-6, `the crane holds (${(c.height - flat.height).toFixed(3)})`);
  }
  assert.ok(chestLineClear(s.g, seen[seen.length - 1], s.ground()), 'and the chest is in sight');
}));

test('a cliff that blocks the chest pulls the camera in, eased, and lets it out eased once it is gone', () => withGPU(() => {
  const s = scene(10, 26, Math.PI), full = s.frame().distance, z = s.ground();
  setElev(s.g, 11, 13, 22, 30, 3); // a three-level cliff at the Wayfarer's back: too tall and close for the crane alone
  const d: number[] = [], h: number[] = []; for (let i = 0; i < 120; i++) { const c = s.frame(); d.push(c.distance); h.push(c.height); }
  const last = s.frame();
  assert.ok(last.distance < full - 1, `pulled in (${full.toFixed(2)} -> ${last.distance.toFixed(2)})`);
  assert.ok(last.height - z > CLOSE_VIEW.presets.standard.outdoorHeight + .5 && last.height - z <= CLOSE_VIEW.presets.standard.outdoorHeight + O.riseMax + .03, 'risen first, within the bound');
  // Release 932 (Tim approved): with limits.terrain on, the boom may stop at minBoom with the cliff cut open by the occluder window.
  assert.ok(chestLineClear(s.g, last, z) || (last.distance >= C.limits.minBoom - .02 && closeViewOccluder().terrain === 1), 'settled where the chest is in sight, or at the minimum with the cliff cut open');
  assert.ok(full - d[0] < .35 && d[2] > last.distance + .3, `eased, not cut (${full.toFixed(2)}, ${d[0].toFixed(2)}, ${d[1].toFixed(2)}, ${d[2].toFixed(2)})`);
  for (let i = 1; i < d.length; i++) assert.ok(Math.abs(d[i] - d[i - 1]) < .25 && Math.abs(h[i] - h[i - 1]) < .25, `smooth at frame ${i}`);
  const settled = d.slice(90); assert.ok(Math.max(...settled) - Math.min(...settled) < .01, 'and holds still');
  // the cliff goes: the hold, then an eased let-out back to the full boom
  setElev(s.g, 11, 13, 22, 30, 0); const held = s.frame(Math.floor(O.hold / .016) - 4).distance;
  assert.ok(Math.abs(held - last.distance) < .02, 'held a moment, so a flicker does not pump the view');
  const out: number[] = []; for (let i = 0; i < 240; i++) out.push(s.frame().distance);
  for (let i = 1; i < out.length; i++) assert.ok(out[i] >= out[i - 1] - 1e-9 && out[i] - out[i - 1] < .15, `let out smoothly (${i})`);
  assert.ok(Math.abs(out[out.length - 1] - full) < .02, 'back to the full boom');
}));

test('no pull-in at a section edge while the Wayfarer is in view', () => withGPU(() => {
  const s = scene(29, 9, Math.PI), P: any = CLOSE_VIEW.presets.standard, c = s.frame(); // the eye is past the east edge (x 32), over the next section
  assert.ok(c.x > 32, `the eye is off the section (${c.x.toFixed(2)})`);
  assert.equal(closeViewWallAt(s.g.map, 33, 9.75), true, 'off the floor is still "wall" to everything but the camera');
  assert.ok(Math.abs(c.distance - P.outdoorDistance) < .02, `the full boom (${c.distance.toFixed(2)})`);
  const seen: number[] = []; for (let i = 0; i < 60; i++) { s.g.player.x = 29 - i * .02; seen.push(s.frame().distance); }
  assert.ok(Math.min(...seen) > P.outdoorDistance - .02, 'walking along the edge never pulls it in');
}));

test('the camera\'s height eases after a change of level, rises and drops, capped so a long fall keeps the Wayfarer framed', () => withGPU(() => {
  const s = scene(10, 26, Math.PI, false), z0 = s.ground(), a0 = s.frame().anchorZ; assert.ok(Math.abs(a0 - z0) < 1e-6);
  setElev(s.g, 9, 11, 25, 27, 1); // the ground under the Wayfarer rises one level (a lift; the footing is on it at once)
  const a: number[] = []; for (let i = 0; i < 120; i++) a.push(s.frame().anchorZ);
  assert.ok(a[0] - z0 < .1 * L, `not a cut (${a[0].toFixed(3)})`);
  const at = (sec: number) => a[Math.round(sec / .016) - 1];
  assert.ok(at(V.tau) > .25 * L && at(V.tau) < .85 * L, `about halfway after one time constant (${at(V.tau).toFixed(3)})`);
  for (let i = 1; i < a.length; i++) assert.ok(a[i] >= a[i - 1] - 1e-9 && a[i] <= L + 1e-6, 'rises without overshoot');
  assert.ok(Math.abs(a[a.length - 1] - L) < .02, 'arrives');
  for (const c of a) assert.ok(L - c <= V.maxLag + 1e-6, 'never more than maxLag behind');
  // a drop of two levels: eased too, and capped
  setElev(s.g, 9, 11, 25, 27, 3); s.frame(150); const top = s.frame().anchorZ; assert.ok(Math.abs(top - 3 * L) < .02);
  setElev(s.g, 9, 11, 25, 27, 1); const b: number[] = [], falls: number[] = []; for (let i = 0; i < 150; i++) { const c = s.frame(), foot = closeViewLeap().base; b.push(c.anchorZ); assert.ok(c.anchorZ - foot <= V.maxLag + 1e-6, `capped to the falling footing (${(c.anchorZ - foot).toFixed(3)})`); falls.push(foot); }
  assert.ok(falls[0] > falls[falls.length - 1] + 1.5 * L, 'the footing fell (the drawn fall, under gravity)');
  assert.ok(b.some((z, i) => z - falls[i] > V.maxLag - 1e-6), 'and the cap bound during it');
  assert.ok(b[0] > L + .5 * V.maxLag, 'not cut down'); assert.ok(Math.abs(b[b.length - 1] - L) < .02, 'arrives');
  // Reduced Motion: a shorter follow
  const r = scene(10, 26, Math.PI, true); setElev(r.g, 9, 11, 25, 27, 1); const ra: number[] = []; for (let i = 0; i < 30; i++) ra.push(r.frame().anchorZ);
  assert.ok(ra[Math.round(V.tau / .016) - 1] > at(V.tau) + .1, 'quicker under Reduced Motion');
}));

test('a jump onto a level peaks a little over it, never far above, and never sinks into it; the jump itself is unchanged', () => withGPU(() => {
  const s = scene(22.4, 3, 0), g = s.g; // facing the plateau's first level at x 24, row 3
  assert.equal(canStep({ isPlayer: true, jumping: true }, g.map, 32, 23, 3, 24, 3), true, 'one jump, one level');
  const dur = 520, apex = CLOSE_VIEW_LEAP.arcFrom; // the ordinary jump's own lift (JUMP.arc tiles at its peak)
  const leap = (x0: number, x1: number) => {
    let T = s.now() + 1000, peak = -Infinity; const start = T; g.jumpStart = T; g.jumpDur = dur; g.jumpUntil = T + dur; g.player.x = x0; presentLeap(g, T, { jumpLift: 0, lift: 0 });
    for (let t = 16; t <= dur + 200; t += 16) { T = start + t; const u = Math.min(1, t / dur); g.player.x = x0 + (x1 - x0) * u; if (t > dur) g.jumpUntil = 0;
      const d = { jumpLift: t < dur ? 4 * apex * u * (1 - u) : 0, lift: 0 }, z = presentLeap(g, T, d), ground = outdoorSurfaceZ(outdoorRelief(g.map), g.player.x + .5, g.player.y + .75);
      assert.ok(z >= ground - 1e-9 && d.jumpLift >= 0, `never below the ground under the feet (${z.toFixed(3)} < ${ground.toFixed(3)})`); peak = Math.max(peak, z); }
    return { peak, end: presentLeap(g, T + 16, { jumpLift: 0, lift: 0 }) };
  };
  const up = leap(22.4, 23.9); // onto one level
  assert.ok(Math.abs(up.end - L) < 1e-6, 'lands on the level');
  const ratio = up.peak / L; assert.ok(ratio >= 1 && ratio <= 1 + CLOSE_VIEW_LEAP.apexMargin + .01, `peak over the step: ${ratio.toFixed(3)} of a level (was about ${(1 + CLOSE_VIEW_LEAP.arcPeak).toFixed(2)})`);
  // a jump on level ground keeps its flat arc, lower than the tallest step one jump clears plus the margin
  g.player.y = 26; resetCloseViewCamera(); s.frame(4); const flat = leap(10, 11);
  assert.ok(Math.abs(flat.peak - CLOSE_VIEW_LEAP.arcPeak * L) < .02 && flat.peak < L * (1 + CLOSE_VIEW_LEAP.apexMargin), `flat peak ${flat.peak.toFixed(3)}`);
}));
