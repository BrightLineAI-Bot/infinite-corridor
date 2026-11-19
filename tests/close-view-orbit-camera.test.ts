// The fixed-distance orbit camera, the wall cutout and sight lines (Tim, 2026-11-18: Close View "basically unusable" indoors
// because "the camera keeps moving around obstacles"; "we shouldn't be able to see creatures that are in the distance or behind
// walls... it should be a surprise... faint silhouettes only"). Presentation only: no world, save or rule changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { GLF, GLB, resetCloseViewGL, closeViewMask } from '../src/close-view-gl.ts';
import { SIGHT_LINES, creatureInSight, creatureSightLevel, sightLineTo, sightFrame, sightStats, sightExempt, sightField, sightFieldAt } from '../src/labyrinths.ts';
import { ensureCloseView } from '../src/close-view.ts';

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
  // Tim's review (2026-11-18): near and out of sight, nothing; far, the silhouette (indoors); the sight field and the Wayfarer's
  // own distance are data too
  assert.equal(SIGHT_LINES.indoor.hideNear, 8, 'hidden within 8 tiles indoors'); assert.equal(SIGHT_LINES.outdoor.hideNear, 0, 'outdoors as built');
  assert.ok(SIGHT_LINES.field.on && SIGHT_LINES.field.radius >= 8 && SIGHT_LINES.field.radius <= 16 && SIGHT_LINES.field.refreshMs > 0, 'a bounded field');
  const Z = O.zoom; assert.ok(Z.perUnit > 0 && Z.minRadius >= .8 && Z.maxRadius <= 12 && Z.indoorMaxRadius <= Z.maxRadius, 'the Wayfarer\'s distance is bounded');
  assert.ok(S.rgb[0] === S.rgb[1] - 6 || Math.max(...S.rgb) - Math.min(...S.rgb) < 20, 'neutral: no threat colour');
});

test('walls never shorten the distance: a wall at the Wayfarer\'s back leaves the eye on its sphere (inside the wall), never pulled in or snapped', () => {
  const { g, wall } = room(); frame(g, 2); face(0); const free = frame(g, 30) && CV.closeViewCamera();
  const P: any = C.presets.standard, R = Math.hypot(P.orbitDistance, P.orbitHeight - O.focus); // 2026-11-18 (Tim's review): indoors the orbit's own, nearer framing
  assert.ok(Math.abs(free.orbitRadius - R) < 1e-9, `on the preset's sphere (${free.orbitRadius} vs ${R})`);
  for (let dy = -6; dy <= 6; dy++) { wall(-1, dy); wall(-2, dy); } // a wall right behind the heels, the eye far behind it (2026-11-18: two tiles thick, the indoor orbit stands nearer)
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
  assert.ok(c.height < feetZ + O.focus - .9 * c.orbitRadius, `under the floor (${(c.height - feetZ).toFixed(2)})`); // 2026-11-18: indoors the radius is nearer (Tim's review), so "2 tiles under" became 90% of the radius under her middle assert.ok(c.pitch < -60 * DEG, `looking up (${(c.pitch / DEG).toFixed(1)})`);
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
  // 2026-11-19 (Tim's bug, the floor and ceiling cut): the depth pass also hands the fragment's height, so a level floor or ceiling is cut only between the eye and the body
  assert.match(src, /if \(cutAway\(v_depth, v_nrm\.z, v_world\.z\)\) discard;/, 'the walls\' depth pass cuts');
  assert.match(src, /u_cutC\.x < 0\.5 \/\* the eye over the ceiling/, 'the environment leaves the ceiling out over it');
  // 2026-11-19 (Tim's bug, the floor and ceiling cut): nor a level floor or ceiling that does not stand between the eye and her
  assert.match(src, /if \(r >= 1\.0 \|\| depth >= u_cut\.w \|\| !across\) return false;/, 'outside the ellipse, or behind her, nothing is cut');
  // the low tier: a hard edge (no dither)
  g.presentation = { effectiveQuality: 'low', reduceMotion: true }; CV.closeViewPan(0, -CV.closeViewCamera().pitchUser / C.crescent.pitch, T); frame(g, 3);
  if (CV.closeViewCutout().on) assert.equal(GLF.cutB[2], 0);
}));

// Tim's bug (2026-11-19, the Pentagon, Close View indoors): the cutout took black half-ovals out of the floor in front of the
// Wayfarer and the ceiling over her, though neither stood between the eye and her. A level floor or ceiling is cut only when its
// height lies between the eye's and the body's: the eye between floor and ceiling cuts neither; over the ceiling or under the floor, that one is cut.
test('the cutout leaves the floor and the ceiling whole while the eye is between them, and cuts the one the eye is beyond', () => withGPU(() => {
  const m = K.level; assert.ok(m > 0 && m < .1, `a small margin (${m})`);
  const ceil = C.walls.height, body = O.focus;
  // the classification itself (close-view.ts cutFlatAcross; the shader's `across` is the same test)
  assert.equal(CV.cutFlatAcross(0, 1.7, body), false, 'eye above the floor: the floor under her stays');
  assert.equal(CV.cutFlatAcross(ceil, 1.7, body), false, 'eye under the ceiling: the ceiling over her stays');
  assert.equal(CV.cutFlatAcross(0, 0, body), false, 'eye at the floor: not beyond it');
  assert.equal(CV.cutFlatAcross(0, -1.1, body), true, 'eye under the floor: the floor is between, cut');
  assert.equal(CV.cutFlatAcross(ceil, ceil + 1, body), true, 'eye over the ceiling: the ceiling is between, cut');
  assert.equal(CV.cutFlatAcross(1.5, 2.2, body), true, 'a raised floor between a high eye and a low body: cut');
  // the frame's uniforms: the eye's height, the body's and the margin
  const { g } = room(); g.presentation = { effectiveQuality: 'balanced', reduceMotion: true }; frame(g, 2); face(0); frame(g, 20);
  if (!CV.closeViewStats.gl) return; // no GPU scene in this environment
  const c = CV.closeViewCamera(), z = (k: number) => GLF.cutZ[k];
  assert.ok(Math.abs(z(0) - c.height) < 1e-4 && Math.abs(z(1) - (c.anchorZ + body)) < 1e-4 && Math.abs(z(2) - m) < 1e-6, `handed to the depth pass (${[...GLF.cutZ].map((v) => v.toFixed(2))})`);
  assert.ok(c.height > c.anchorZ && c.height < ceil, 'the default framing: the eye between floor and ceiling');
  assert.equal(CV.cutFlatAcross(c.anchorZ, z(0), z(1), z(2)), false, 'the floor is not cut'); assert.equal(CV.cutFlatAcross(ceil, z(0), z(1), z(2)), false, 'the ceiling is not cut');
  CV.closeViewPan(0, 1e5, T); frame(g, 3); assert.ok(z(0) > ceil, 'from high above');
  assert.equal(CV.cutFlatAcross(ceil, z(0), z(1), z(2)), true, 'over the ceiling: it is cut'); assert.equal(CV.cutFlatAcross(c.anchorZ, z(0), z(1), z(2)), false, 'the floor stays');
  CV.closeViewPan(0, -1e5, T); frame(g, 3); assert.ok(z(0) < c.anchorZ, 'from below');
  assert.equal(CV.cutFlatAcross(c.anchorZ, z(0), z(1), z(2)), true, 'under the floor: it is cut'); assert.equal(CV.cutFlatAcross(ceil, z(0), z(1), z(2)), false, 'the ceiling stays');
  // the shader: the level parts (half-integer edges, the varying is interpolated) are cut only across, at the lens and in the ellipse
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(src, /bool level = part > 19\.5 && part < 22\.5 \|\| part > 9\.5 && part < 11\.5;/, 'floors, ceilings, a slab\'s underside and beams are level');
  assert.match(src, /bool across = !level \|\| z - min\(u_cutZ\.x, u_cutZ\.y\) > u_cutZ\.z && max\(u_cutZ\.x, u_cutZ\.y\) - z > u_cutZ\.z;/, 'between the eye and the body');
  assert.match(src, /if \(depth < u_cutNear && across\) return true;/, 'at the lens, only across');
  assert.match(src, /if \(r >= 1\.0 \|\| depth >= u_cut\.w \|\| !across\) return false;/, 'in the ellipse, only across');
  assert.match(src, /if \(part > 19\.5\) \{/, 'the walls\' shading pass takes the floor and ceiling at a half-integer edge');
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

// 2026-11-18 (Tim's review): "near ones that are out of sight are not shown at all, so they can ambush"; far ones on the same floor
// are the faint silhouette (SIGHT_LINES.indoor.hideNear). This test was "out of sight is only a faint neutral silhouette": the
// near foe behind the wall is now not drawn at all, and a far one keeps the silhouette.
test('both views: out of sight and near, nothing; out of sight and far, only a faint neutral silhouette (no health bar, no colours); in sight, drawn as before', () => {
  const { g, best, foe, wall } = room(); const e = foe('behind', 3, 0); e.hp = 25; // a wounded foe shows a health bar when seen
  const SIL = `rgb(${SIGHT_LINES.silhouette.rgb.join(',')})`;
  // Standard View
  g.save.closeView = false; let L = frame(g, 3);
  assert.equal(creatureSightLevel(g, e), 2); assert.ok(L.rects.includes('#9b4d50') && !L.fills.includes(SIL), 'in sight: its body and its health bar');
  for (let dy = -2; dy <= 2; dy++) wall(1, dy); L = frame(g, SIGHT_LINES.ttlFrames + 2);
  assert.equal(creatureSightLevel(g, e), 0, 'near, behind the wall: hidden');
  assert.ok(!L.rects.includes('#9b4d50'), 'behind the wall: no health bar'); assert.ok(!L.fills.includes(SIL), 'near, behind the wall: not even a silhouette (an ambush)');
  // far (past hideNear), out of sight: the silhouette, a hint of where to go
  e.x = best.x; e.y = best.y + SIGHT_LINES.indoor.hideNear + 2; L = frame(g, SIGHT_LINES.ttlFrames + 2);
  assert.equal(creatureSightLevel(g, e), 1, 'far, out of sight: the silhouette');
  assert.ok(!L.rects.includes('#9b4d50'), 'far: no health bar'); assert.ok(L.fills.includes(SIL), 'far: the faint silhouette');
  e.x = best.x + 3; e.y = best.y; frame(g, SIGHT_LINES.ttlFrames + 2);
  // Close View (the 2D path here): its card is the same silhouette, captured from the ordinary renderer
  g.save.closeView = true; frame(g, 2); face(0); const cap = logCtx(); CV.setCloseViewCanvasFactory(() => ({ width: W, height: H, getContext: () => cap.ctx }));
  try { frame(g, 4); face(0); frame(g, 4); assert.equal(CV.closeViewShowing(g), true, 'Close View draws');
    assert.ok(!cap.fills.includes(SIL), 'Close View, near behind the wall: nothing'); assert.ok(!cap.rects.includes('#9b4d50'), 'Close View: no health bar');
    e.x = best.x + SIGHT_LINES.indoor.hideNear + 2; e.y = best.y; for (let dy = -2; dy <= 2; dy++) wall(1, dy, false); wall(1, 0); // far down the room, a pillar between
    frame(g, SIGHT_LINES.ttlFrames + 2); cap.fills.length = cap.rects.length = 0; frame(g, 2);
    assert.ok(e.x < g.map.width, "the far foe on the floor"); { assert.equal(creatureSightLevel(g, e), 1); assert.ok(cap.fills.includes(SIL), 'Close View, far: the silhouette card'); assert.ok(!cap.rects.includes('#9b4d50'), 'Close View, far: no health bar'); }
    wall(1, 0, false); e.x = best.x + 3; frame(g, SIGHT_LINES.ttlFrames + 2); cap.fills.length = cap.rects.length = 0; frame(g, 2); // a kept answer is walked again within ttlFrames
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

test('indoors the Wayfarer is framed larger (each preset\'s nearer orbit); outdoors keeps its own distance', () => withGPU(() => {
  for (const id of ['standard', 'close', 'wide']) {
    const P: any = C.presets[id], R0 = Math.hypot(P.distance, P.height - O.focus), R1 = Math.hypot(P.orbitDistance, P.orbitHeight - O.focus);
    assert.ok(R0 / R1 >= 1.4, `${id}: at least 40% bigger on screen (${(R0 / R1).toFixed(2)})`);
    assert.ok(Math.abs(Math.atan2(P.orbitHeight - O.focus, P.orbitDistance) - Math.atan2(P.height - O.focus, P.distance)) < 4 * DEG, `${id}: about the same elevation`);
    const { g } = room(); g.save.closeViewPreset = id; frame(g, 2); face(0); frame(g, 6);
    const c = CV.closeViewCamera(); assert.equal(c.indoorOrbit, true); assert.ok(Math.abs(c.orbitRadius - R1) < 1e-9 && Math.abs(c.distance - P.orbitDistance) < 1e-9, `${id}: the orbit's own distance indoors`);
    if (id === 'standard') { // the body on a phone's portrait screen: feet to hood
      const p = g.player, a = CV.closeViewProject(p.x + .5, p.y + .75, c.anchorZ), b = CV.closeViewProject(p.x + .5, p.y + .75, c.anchorZ + C.camera.framing.bodyHeight);
      assert.ok(a && b && (a.sy - b.sy) / H > .2, `a fifth of the screen tall or more (${a && b ? ((a.sy - b.sy) / H).toFixed(3) : '?'})`); }
  }
  // outdoors (the open overworld): the outdoor boom, as before
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game; g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: true }; g.enemies = [];
  g.player.x = 16; g.player.y = 26; CV.resetCloseViewCamera(); frame(g, 2); face(0); frame(g, 6);
  assert.equal(CV.closeViewShowing(g), true, "Close View outdoors"); { const c = CV.closeViewCamera(); assert.equal(c.indoorOrbit, false); assert.ok(Math.abs(c.distance - C.presets.standard.outdoorDistance) < 1e-6, `outdoors: outdoorDistance (${c.distance})`); }
}));

test('indoors, what the Wayfarer cannot see is not drawn: the sight field masks floors, walls, props and lights behind walls, and loot', () => withGPU(() => {
  const { g, best, wall } = room(); g.presentation = { effectiveQuality: 'balanced', reduceMotion: true };
  for (let dy = -6; dy <= 6; dy++) wall(3, dy); // a wall across the room, three tiles in front
  frame(g, 2); face(0); frame(g, 4);
  const S = CV.closeViewSight(), F = S.field; assert.ok(F, 'indoors, with the orbit: a field');
  const at = (dx: number, dy: number) => sightFieldAt(F, best.x + dx, best.y + dy);
  assert.equal(at(1, 0), true, 'the floor in front: in sight'); assert.equal(at(3, 0), true, 'the wall itself (beside floor in sight): drawn');
  assert.equal(at(5, 0), false, 'behind the wall: out of sight'); assert.equal(at(-2, 1), true, 'behind her, in the open: in sight');
  assert.equal(CV.closeViewStats.gl, 1, 'the GPU scene'); {
    assert.ok(S.seen, 'the mask reads the field'); assert.equal(GLF.sight, 1, 'props leave out what stands out of sight');
    const m = closeViewMask(g.map, S.seen).data, w = g.map.width, bit = (dx: number, dy: number) => m[((best.y + dy) * w + best.x + dx) * 4] & 2;
    assert.equal(bit(5, 0), 2, 'behind the wall: unseen (dark: no floor, walls, decals or hazards)'); assert.equal(bit(1, 0), 0, 'in front: seen');
    const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
    assert.match(src, /if \(u_sight > 0\.5\) \{ ivec2 T = ivec2\(floor\(v_pos\.xy\)\);.*\(texelFetch\(u_mask, T, 0\)\.r & 2u\) == 2u\) discard; \}/, 'the props\' pass discards out of sight');
  }
  // a far creature out of sight (renderer.ts: a sightHidden draw): its faint shape is the hint pass, over the wall and the dark
  assert.equal(CV.closeViewStats.gl, 1, 'the GPU scene'); {
    const L = logCtx(); assert.equal(CV.closeViewFrame(L.ctx, g, W, H, (T += 16), () => { const player = { x: g.player.x, y: g.player.y, fn() {} }; CV.closeViewTake([{ x: best.x + 5, y: best.y, sightHidden: true, fn() {} }, player], player); }), true);
    assert.equal(GLB.nHint, 1, 'one hint'); let hintZ = 0; for (let v = 0; v < GLB.nBoard; v++) hintZ = Math.max(hintZ, GLB.board[v * 9 + 7]);
    assert.ok(Math.abs(hintZ - 3 - SIGHT_LINES.silhouette.through) < 1e-6, 'drawn at the hint\'s opacity');
    const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
    assert.match(src, /if \(GLB\.nHint > 0\) \{ gl\.depthFunc\(gl\.ALWAYS\); gl\.uniform1f\(S\.board\.U\.u_pass, 2\);/, 'over walls');
  }
  // bounded: worked out again only when her tile changes (or after refreshMs)
  const b0 = F.builds; frame(g, 10); assert.equal(sightField(g, NaN)!.builds, b0, 'no new lines while she stands on the same tile');
  g.player.x += 1; frame(g, 1); assert.equal(sightField(g, NaN)!.builds, b0 + 1, 'one new field for a new tile');
  assert.ok(Math.PI * SIGHT_LINES.field.radius ** 2 * 2 < 1000, 'at most about a thousand short lines a new tile');
  // outdoors: no field
  const o: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game; assert.equal(sightField(o, 0), null, 'outdoors nothing is masked');
}));

test('loot and objects out of the Wayfarer\'s sight are not drawn in Close View indoors; a far creature\'s silhouette still is', () => {
  const { g, best, wall } = room(); frame(g, 2); face(0); frame(g, 4);
  // the renderer's capture, as look-zoom.test.ts drives it: the Wayfarer, a relic and a far silhouette become the frame's draws
  const relic = { kind: 'waystoneRelic', id: 'cv-sight-relic', x: best.x + 2, y: best.y }, hint = { x: best.x + 2, y: best.y + 1, sightHidden: true, fn() {} };
  const shot = (withHint = false) => { const L = logCtx(); assert.equal(CV.closeViewFrame(L.ctx, g, W, H, (T += 16), () => { const player = { x: g.player.x, y: g.player.y, fn() {} }; CV.closeViewTake([{ x: relic.x, y: relic.y, object: relic, fn() {} }, ...(withHint ? [hint] : []), player], player); }), true); return CV.closeViewStats.boards; };
  shot(); const open = shot(); assert.ok(open >= 2, `the relic in sight: drawn (${open} cards)`);
  for (let dy = -6; dy <= 6; dy++) wall(1, dy); T += SIGHT_LINES.field.refreshMs + 1; shot(); // the same tile: the field is walked again after refreshMs (a door opened, a wall raised)
  assert.equal(sightFieldAt(CV.closeViewSight().field, best.x + 2, best.y), false, 'the relic\'s tile: out of sight');
  assert.equal(shot(), open - 1, 'behind the wall: the relic is not drawn');
  assert.equal(shot(true), open, 'a far creature\'s silhouette (sightHidden) is drawn behind the wall');
});

test('Look mode\'s pinch on the Wayfarer sets her own Close View distance, kept in the save and used after Look mode; further out than before', () => withGPU(() => {
  const { g, foe } = room(); frame(g, 2); face(0); frame(g, 4); const Z = O.zoom, P: any = C.presets.standard, R1 = Math.hypot(P.orbitDistance, P.orbitHeight - O.focus);
  assert.equal(ensureCloseView({}).closeViewZoom, 0, 'a fresh save: the preset\'s own distance');
  for (const [v, want] of [[NaN, 0], ['x', 0], [5, 1], [-9, C.camera.look.minZoom], [.4, .4]] as const) assert.equal(ensureCloseView({ closeViewZoom: v }).closeViewZoom, want, `normalised: ${String(v)}`);
  assert.equal(CV.closeViewLookZoomTo(.5), CV.closeViewLookZoomNow(), 'outside Look mode the zoom asks nothing'); assert.equal(g.save.closeViewZoom, 0);
  CV.closeViewLookSet(g, true); frame(g, 2); assert.equal(CV.closeViewLookState().homeActive, true, 'the Wayfarer is the subject');
  CV.closeViewLookZoomTo(.3); assert.equal(CV.closeViewHomeZoomTake(), true, 'changed: the host persists it'); assert.equal(CV.closeViewHomeZoomTake(), false, 'once');
  frame(g, 2); assert.equal(g.save.closeViewZoom, .3); assert.equal(CV.closeViewLookState().want, 0, 'no Look orbit round her');
  let c = CV.closeViewCamera(); assert.ok(Math.abs(c.orbitRadius - R1 * Math.pow(2, -.3 * Z.perUnit)) < 1e-9, `nearer (${c.orbitRadius.toFixed(3)})`);
  // the pinch's own arithmetic moves it: a doubling of the fingers' spread halves the distance
  CV.closeViewLookZoomTo(CV.closeViewPinchZoom(CV.closeViewLookZoomNow(), 100, 100 * Math.SQRT2)); frame(g, 2);
  assert.ok(Math.abs(CV.closeViewCamera().orbitRadius - c.orbitRadius / 2 ** (.5 * C.camera.look.pinchGain * Z.perUnit)) < 1e-6, 'the pinch moves it');
  // Look mode off: her distance stays (Look mode, a reset and a new frame do not undo it)
  CV.closeViewLookSet(g, false, true); frame(g, 4); const kept = CV.closeViewCamera().orbitRadius; assert.ok(kept < R1 - .5, 'kept after Look mode');
  CV.resetCloseViewCamera(); frame(g, 4); assert.ok(Math.abs(CV.closeViewCamera().orbitRadius - kept) < 1e-9, 'kept after a reset (it is the save\'s)');
  // further out than Look mode reached before (the boom `look.out` tiles longer at minZoom), bounded by maxRadius
  CV.closeViewLookSet(g, true); frame(g, 2); CV.closeViewLookZoomTo(-5); frame(g, 2); c = CV.closeViewCamera();
  const before = Math.hypot(P.orbitDistance + C.camera.look.out, P.orbitHeight - O.focus), beforeOld = Math.hypot(P.distance + C.camera.look.out, P.height - O.focus);
  assert.equal(g.save.closeViewZoom, C.camera.look.minZoom); assert.ok(c.orbitRadius > beforeOld && c.orbitRadius > before && c.orbitRadius <= Z.indoorMaxRadius + 1e-9 /* 2026-11-18 Tim: a shorter zoom-out indoors */, `further (${c.orbitRadius.toFixed(2)} vs ${beforeOld.toFixed(2)})`);
  CV.closeViewLookZoomTo(1); frame(g, 2); assert.ok(CV.closeViewCamera().orbitRadius >= Z.minRadius - 1e-9, 'never nearer than minRadius');
  // the elevation is kept: the distance and the height scale together
  assert.ok(Math.abs(CV.closeViewCamera().elevation - Math.atan2(P.orbitHeight - O.focus, P.orbitDistance)) < 1e-9);
  // another subject (a foe in front) zooms Look's own way, never her distance
  CV.closeViewLookSet(g, false, true); g.save.closeViewZoom = 0; foe('look-foe', 2, 0); frame(g, 2); face(0); frame(g, 2); CV.closeViewLookSet(g, true); frame(g, 3);
  assert.equal(CV.closeViewLookState().subject, 'creature'); CV.closeViewLookZoomTo(.5); assert.equal(CV.closeViewLookState().want, .5); assert.equal(g.save.closeViewZoom, 0, 'her distance untouched');
  CV.closeViewLookSet(g, false, true);
}));
