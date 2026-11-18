// The fixed-distance orbit camera, the wall cutout and sight lines (Tim, 2026-11-18: Close View "basically unusable" indoors
// because "the camera keeps moving around obstacles"; "we shouldn't be able to see creatures that are in the distance or behind
// walls... it should be a surprise... faint silhouettes only"). Presentation only: no world, save or rule changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { GLF, resetCloseViewGL } from '../src/close-view-gl.ts';
import { SIGHT_LINES, creatureInSight, sightLineTo, sightFrame, sightStats, sightExempt } from '../src/labyrinths.ts';

const C = CV.CLOSE_VIEW, O = C.camera.orbit, K = O.cutout, DEG = Math.PI / 180, W = 390, H = 844;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
// a canvas context that records the fill colours and the rectangles filled (the health bars are rectangles)
function logCtx() {
  const fills: string[] = [], rects: string[] = [];
  const ctx: any = new Proxy({ canvas: { width: W, height: H }, globalAlpha: 1, fillStyle: '', measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
    fill() { fills.push(String(ctx.fillStyle)); }, fillRect() { rects.push(String(ctx.fillStyle)); } },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  return { ctx, fills, rects };
}
const plainFactory = () => ({ width: 1, height: 1, getContext: () => logCtx().ctx }); CV.setCloseViewCanvasFactory(plainFactory); // the 2D Close View
class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  CV.setCloseViewCanvasFactory(() => { if (++made === 1) return { width: W, height: H, getContext: () => logCtx().ctx }; return { width: W, height: H, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : logCtx().ctx }; });
  CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); CV.resetCloseViewCamera();
  try { run(); } finally { CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(plainFactory); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
let T = 900000;
// The lab's Heart, the Wayfarer in its widest clear square, the view looking along +x, foes cloned from the lab's own
function room() {
  const g: any = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game, w = g.map.width, h = g.map.height, open = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !g.map.tiles[y * w + x].blocked;
  let best: any = null; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0; while (r < 6) { let ok = true; for (let dy = -r - 1; dy <= r + 1 && ok; dy++) for (let dx = -r - 1; dx <= r + 1 && ok; dx++) ok = open(x + dx, y + dy); if (!ok) break; r++; } if (!best || r > best.r) best = { x, y, r }; }
  const proto = g.enemies.find((e: any) => !e.dead) || g.enemies[0]; for (const e of g.enemies) e.dead = true;
  const foe = (id: string, dx: number, dy: number, extra = {}) => { const e = { ...proto, id, x: best.x + dx, y: best.y + dy, dead: false, hidden: false, ambient: false, aggro: false, hp: 50, maxHp: 50, worldBeast: undefined, passingBeast: undefined, retreating: false, ...extra }; g.enemies.push(e); return e; };
  const wall = (dx: number, dy: number, on = true) => { const i = (best.y + dy) * w + best.x + dx; g.map.tiles[i] = { ...g.map.tiles[i], kind: on ? 'keepWall' : g.map.tiles[i].kind, blocked: on }; };
  g.player.x = best.x; g.player.y = best.y; g.save.closeView = true; g.save.closeViewAutoFollow = false; g.save.closeViewPreset = 'standard'; g.player.hp = g.player.maxHp = 1e6;
  CV.resetCloseViewCamera();
  return { g, best, foe, wall };
}
const frame = (g: any, n = 1) => { let c: any; for (let i = 0; i < n; i++) { const L = logCtx(); render(L.ctx, g, W, H, (T += 16)); c = L; } return c; };
const face = (yaw: number) => CV.closeViewPan(wrap(yaw - CV.closeViewCamera().yaw) / C.crescent.yaw, -CV.closeViewCamera().pitchUser / C.crescent.pitch, T - 10000);

test('the orbit, its cutout and sight lines are data', () => {
  assert.equal(O.on, true, 'the fixed-distance orbit is the camera');
  assert.ok(O.maxElevation >= 80 && O.maxElevation < 90, `nearly straight above, never the pole (${O.maxElevation})`);
  assert.ok(O.minElevation <= -60 && O.minElevation > -90, `well below the Wayfarer, never the pole (${O.minElevation})`);
  assert.ok(K.on && K.radius > .5 && K.radius < 2 && K.maxShare > 0 && K.maxShare <= .5 && K.minPx > 0 && K.stop > 0 && K.soft >= 0 && K.soft < 1, 'a modest, bounded cutout');
  assert.ok(SIGHT_LINES.indoor.range >= 5 && SIGHT_LINES.indoor.walls === true && SIGHT_LINES.outdoor.walls === false, 'indoors walls stop sight');
  assert.ok(Number.isInteger(SIGHT_LINES.maxChecks) && SIGHT_LINES.maxChecks <= 64 && SIGHT_LINES.ttlFrames > 0, 'a bounded budget a frame');
  const S = SIGHT_LINES.silhouette; assert.ok(S.alpha > 0 && S.alpha <= .25 && S.rim <= .35, `faint (${S.alpha})`);
  assert.ok(S.rgb[0] === S.rgb[1] - 6 || Math.max(...S.rgb) - Math.min(...S.rgb) < 20, 'neutral: no threat colour');
});

test('walls never shorten the distance: a wall at the Wayfarer\'s back leaves the eye on its sphere (inside the wall), never pulled in or snapped', () => {
  const { g, wall } = room(); frame(g, 2); face(0); const free = frame(g, 30) && CV.closeViewCamera();
  const P: any = C.presets.standard, R = Math.hypot(P.distance, P.height - O.focus);
  assert.ok(Math.abs(free.orbitRadius - R) < 1e-9, `on the preset's sphere (${free.orbitRadius} vs ${R})`);
  for (let dy = -6; dy <= 6; dy++) wall(-1, dy); // a wall right behind the heels, the eye far behind it
  const seen: number[] = []; for (let i = 0; i < 90; i++) { frame(g); const c = CV.closeViewCamera(); seen.push(c.distance); assert.ok(Math.abs(c.orbitRadius - R) < 1e-9, `frame ${i}: the radius holds`); }
  assert.ok(Math.max(...seen) - Math.min(...seen) < 1e-9 && Math.abs(seen[0] - free.distance) < 1e-9, `the boom never moves (${Math.min(...seen)}..${Math.max(...seen)})`);
  const c = CV.closeViewCamera(); assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), true, 'the eye stands in the wall: it is cut away, not avoided');
  // walking along the wall and turning in a narrow way: still never a pull or a snap
  for (let i = 0; i < 60; i++) { g.player.y += .03; CV.closeViewPan(3, 0, T); frame(g); assert.ok(Math.abs(CV.closeViewCamera().orbitRadius - R) < 1e-9); }
});

test('the tilt covers the sphere: from nearly straight down to below the Wayfarer, the drag and the crescent alike, Look mode too', () => withGPU(() => {
  const { g } = room(); frame(g, 2); face(0); frame(g, 4);
  const R = CV.closeViewPitchRange(), base = CV.closeViewCamera().elevation;
  assert.ok(Math.abs(R[0] - (O.minElevation * DEG - base)) < 1e-9 && Math.abs(R[1] - (O.maxElevation * DEG - base)) < 1e-9, 'the range is the orbit\'s limits less the preset\'s own elevation');
  assert.ok(R[1] - R[0] > 150 * DEG, `far more than the old crescent range (${((R[1] - R[0]) / DEG).toFixed(0)} degrees)`);
  // up: the crescent's and the drag's pan (one entry point, closeViewPan) to the top
  CV.closeViewPan(0, 1e5, T); let c = frame(g, 3) && CV.closeViewCamera();
  const feetZ = c.anchorZ, p = g.player;
  assert.ok(Math.abs(c.elevation - O.maxElevation * DEG) < 1e-9, 'held at the top limit (never the pole)');
  assert.ok(c.height > feetZ + 3, `high above (${(c.height - feetZ).toFixed(2)})`); assert.ok(c.pitch > 70 * DEG, `looking down (${(c.pitch / DEG).toFixed(1)})`);
  assert.ok(Math.abs(Math.hypot(c.distance, c.height - feetZ - O.focus) - c.orbitRadius) < 1e-6, 'at the same distance');
  let q = CV.closeViewProject(p.x + .5, p.y + .75, feetZ + O.focus); assert.ok(q && Math.abs(q.sx - W / 2) < W * .2 && q.sy > 0 && q.sy < H, 'the Wayfarer framed from above');
  // the yaw still turns at the top (no gimbal flip): a pan sideways turns the view, the eye stays above
  const y0 = c.yaw; CV.closeViewPan(40, 0, T); c = frame(g, 2) && CV.closeViewCamera(); assert.ok(Math.abs(wrap(c.yaw - y0 - 40 * C.crescent.yaw)) < 1e-9 && c.pitch > 70 * DEG, 'yaw defined at the pole');
  // down: below the floor, looking up at the Wayfarer at the same distance
  CV.closeViewPan(0, -1e5, T); c = frame(g, 3) && CV.closeViewCamera();
  assert.ok(Math.abs(c.elevation - O.minElevation * DEG) < 1e-9, 'held at the bottom limit');
  assert.equal(CV.closeViewStats.gl, 1, 'the GPU scene (the 2D fallback keeps the eye over its floor, orbit.floor2D)');
  assert.ok(c.height < feetZ - 2, `under the floor (${(c.height - feetZ).toFixed(2)})`); assert.ok(c.pitch < -60 * DEG, `looking up (${(c.pitch / DEG).toFixed(1)})`);
  assert.ok(Math.abs(Math.hypot(c.distance, c.height - feetZ - O.focus) - c.orbitRadius) < 1e-6, 'still at the same distance');
  q = CV.closeViewProject(p.x + .5, p.y + .75, feetZ + O.focus); assert.ok(q && Math.abs(q.sx - W / 2) < W * .2 && q.sy > 0 && q.sy < H, 'the Wayfarer framed from below');
  // the crescent's and the drag's own sensitivities both feed the same pan
  assert.ok(C.crescent.pitch > 0 && C.drag.pitch > 0);
  // Look mode on the Wayfarer: the same sphere limits apply to its orbit
  CV.closeViewPan(0, 1e5, T); assert.ok(CV.closeViewCamera().pitchUser <= R[1] + 1e-9);
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /pitchO = ORB \? Math\.max\(Ob\.minElevation \* DEG, Math\.min\(Ob\.maxElevation \* DEG/, 'Look mode orbits its subject within the same limits, never pulled in by walls');
}));

test('the cutout is a modest ellipse round the Wayfarer, nearer than her only; over the ceiling it is left out, under the floor only the ellipse sees up', () => withGPU(() => {
  const { g, wall } = room(); g.presentation = { effectiveQuality: 'balanced', reduceMotion: true }; frame(g, 2); face(0);
  for (let dy = -6; dy <= 6; dy++) wall(-2, dy); frame(g, 20);
  if (!CV.closeViewStats.gl) return; // no GPU scene in this environment: nothing to cut
  const cut = CV.closeViewCutout(), p = g.player, c = CV.closeViewCamera();
  assert.equal(cut.on, true, 'cut');
  const q = CV.closeViewProject(p.x + .5, p.y + .75, c.anchorZ + O.focus)!;
  assert.ok(Math.abs(cut.sx - q.sx) < 1 && Math.abs(cut.sy - q.sy) < 1, 'centred on her body');
  assert.ok(cut.rx >= K.minPx - 1e-9 && cut.rx <= K.maxShare * Math.min(W, H) + 1e-9 && Math.abs(cut.ry - cut.rx * K.tall) < 1e-9, `bounded (${cut.rx.toFixed(0)} px of ${Math.min(W, H)})`);
  assert.ok(cut.depth < q.depth && cut.depth > q.depth - 1, 'only what stands nearer the eye than her body');
  assert.ok(GLF.cutB[0] === 1 && GLF.cut[2] > 0 && Math.abs(GLF.cut[3] - cut.depth) < 1e-4 && GLF.cutB[1] === K.tall, 'handed to the walls\' depth pass');
  // from far above: the ceiling is left out; from below: the floor's underside, the ellipse open
  CV.closeViewPan(0, 1e5, T); frame(g, 3); assert.equal(CV.closeViewCutout().above, true); assert.equal(GLF.cutC[0], 1);
  assert.equal(GLF.cutC[1], 1, 'over the walls\' tops: wall tiles read as rock'); assert.ok(Math.abs(GLF.cutC[2] - K.rock) < 1e-6 && Math.abs(GLF.cutC[3] - K.under) < 1e-6, 'the rock\'s and the underside\'s shares (dark stone)'); assert.ok(Math.abs(GLF.cutNear - K.near) < 1e-9, 'nothing at the lens');
  CV.closeViewPan(0, -1e5, T); frame(g, 3); assert.equal(CV.closeViewCutout().below, true); assert.equal(GLF.cutB[3], 1);
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(src, /if \(cutAway\(v_depth, v_nrm\.z\)\) discard;/, 'the walls\' depth pass cuts');
  assert.match(src, /u_cutC\.x < 0\.5 \/\* the eye over the ceiling/, 'the environment leaves the ceiling out over it');
  assert.match(src, /if \(r >= 1\.0 \|\| depth >= u_cut\.w\) return false;/, 'outside the ellipse, or behind her, nothing is cut');
  // the low tier: a hard edge (no dither)
  g.presentation = { effectiveQuality: 'low', reduceMotion: true }; CV.closeViewPan(0, -CV.closeViewCamera().pitchUser / C.crescent.pitch, T); frame(g, 3);
  if (CV.closeViewCutout().on) assert.equal(GLF.cutB[2], 0);
}));

test('sight: a creature behind a wall or out of reach is out of sight; announced beasts stay; the budget is bounded', () => {
  const { g, foe, wall } = room(); frame(g, 2);
  const near = foe('near', 2, 0), far = foe('far', SIGHT_LINES.indoor.range + 3, 0);
  assert.equal(sightLineTo(g, near.x + .5, near.y + .75), true, 'in the open, in reach');
  wall(1, 0); assert.equal(sightLineTo(g, near.x + .5, near.y + .75), false, 'a wall between'); wall(1, 0, false);
  if (far.x < g.map.width) assert.equal(sightLineTo(g, far.x + .5, far.y + .75), false, 'beyond sight\'s reach');
  assert.equal(sightExempt(g, { passingBeast: 'x', x: 0, y: 0 }), true, 'a passing beast is a sight to watch');
  assert.equal(sightExempt(g, { worldBeast: 'x', retreating: true, x: 0, y: 0 }), true, 'a fleeing beast is announced');
  // the budget: many creatures, at most maxChecks fresh walks a frame; the rest keep their last answer (or hide)
  for (let i = 0; i < 120; i++) foe(`crowd${i}`, (i % 9) - 4, Math.floor(i / 9) % 5 - 2);
  sightFrame(); const s0 = sightStats().walks; for (const e of g.enemies) if (!e.dead) creatureInSight(g, e);
  assert.ok(sightStats().walks - s0 <= SIGHT_LINES.maxChecks, `bounded (${sightStats().walks - s0})`);
  sightFrame(); const s1 = sightStats().walks; for (const e of g.enemies) if (!e.dead) creatureInSight(g, e);
  assert.ok(sightStats().walks - s1 <= SIGHT_LINES.maxChecks, 'again the next frame');
});

test('both views: a creature out of sight is only a faint neutral silhouette (no health bar, no colours); in sight, drawn as before', () => {
  const { g, foe, wall } = room(); const e = foe('behind', 3, 0); e.hp = 25; // a wounded foe shows a health bar when seen
  const SIL = `rgb(${SIGHT_LINES.silhouette.rgb.join(',')})`;
  // Standard View
  g.save.closeView = false; let L = frame(g, 3);
  assert.ok(L.rects.includes('#9b4d50') && !L.fills.includes(SIL), 'in sight: its body and its health bar');
  for (let dy = -2; dy <= 2; dy++) wall(1, dy); L = frame(g, SIGHT_LINES.ttlFrames + 2);
  assert.ok(!L.rects.includes('#9b4d50'), 'behind the wall: no health bar'); assert.ok(L.fills.includes(SIL), 'behind the wall: the silhouette');
  // Close View (the 2D path here): its card is the same silhouette, captured from the ordinary renderer
  g.save.closeView = true; frame(g, 2); face(0); const cap = logCtx(); CV.setCloseViewCanvasFactory(() => ({ width: W, height: H, getContext: () => cap.ctx }));
  try { frame(g, 4); face(0); frame(g, 4); assert.equal(CV.closeViewShowing(g), true, 'Close View draws');
    assert.ok(cap.fills.includes(SIL), 'Close View: the silhouette card'); assert.ok(!cap.rects.includes('#9b4d50'), 'Close View: no health bar');
    for (let dy = -2; dy <= 2; dy++) wall(1, dy, false); frame(g, SIGHT_LINES.ttlFrames + 2); cap.fills.length = cap.rects.length = 0; frame(g, 2); // a kept answer is walked again within ttlFrames
    assert.ok(!cap.fills.includes(SIL), `in sight again: no silhouette (${creatureInSight(g, e)} ${sightLineTo(g, e.x + .5, e.y + .75)})`); }
  finally { CV.setCloseViewCanvasFactory(plainFactory); }
});

test('lock-on: only a foe in sight; a locked one keeps the lock through brief cover, then lets go', () => {
  const { g, foe, wall } = room(); frame(g, 2); face(0); frame(g, 4);
  const e = foe('t', 3, 0);
  for (let dy = -2; dy <= 2; dy++) wall(1, dy); frame(g, 2);
  assert.equal(CV.closeViewLockCandidate(g), null, 'behind a wall: nothing to lock');
  for (let dy = -2; dy <= 2; dy++) wall(1, dy, false); frame(g, 2);
  assert.equal(CV.closeViewLockToggle(g)?.id, 't', 'in sight: locked');
  wall(1, 0); frame(g, Math.floor(C.lock.lostSec / .016 * .5));
  assert.equal(g.lockedTarget()?.id, 't', 'briefly behind cover: kept'); assert.equal(CV.closeViewIdleLockAim(g, T), null, 'but not tracked through the wall');
  frame(g, Math.ceil(C.lock.lostSec / .016)); assert.equal(g.lockedTarget(), null, 'behind cover longer: released');
  wall(1, 0, false); e.x = g.player.x + SIGHT_LINES.indoor.range + 1.5; frame(g, 2);
  if (e.x < g.map.width - 1 && Math.hypot(e.x - g.player.x, 0) <= C.lock.range) assert.equal(CV.closeViewLockCandidate(g, { screen: false, cone: 180 }), null, 'in the open but past sight\'s reach: a silhouette, not a target');
});
