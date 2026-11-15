// Ordinary creatures stand solid in a fight (Tim, 2026-11-14: "they appear too spectral. They fade in and out of view too often.
// When they're close to you, while you're interacting with or fighting them, they need to be fully solid. The range at which
// they materialise in the distance is fine for now"). In the open world the fog's far edge is the tier's radius plus two tiles
// (8.5 tiles of camera depth on the low tier), and the camera stands about four tiles behind the Wayfarer, so a creature a few
// tiles past her took the creature fog's edge band and was dithered; walking round her it faded in and out. Now a creature near
// her, or engaging her, is solid (CLOSE_VIEW.creatures.solid, with hysteresis); farther creatures materialise as before. Only
// design makes a creature see-through. Tim's review the same day: a shaman-warded creature stays somewhat spectral in Close View
// (CLOSE_VIEW.creatures.ward, held .5 s so the ward's edge never flickers), and a Cinder Seraph keeps its translucent dive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { render } from '../src/renderer.ts';
import { actorPresentation, ACTOR_ALPHA } from '../src/actor-presentation.ts';
import { PHASE_SHIELD } from '../src/affixes.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewCamera, closeViewCreatureFog, closeViewCreatureFade, closeViewCreatureIntrinsicAlpha,
  closeViewCreatureSolidity, closeViewCreatureSolidNear, closeViewCreatureWard, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';

class MockGL {
  program: any = null; sources: string[] = [];
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(s: any, t: any) { s.text = t; this.sources.push(t); } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
}
const ctx2d = () => new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
let GL: any = null;
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new MockGL(); GL = gl; (globalThis as any).WebGL2RenderingContext = MockGL;
  setCloseViewCanvasFactory(() => ({ width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }));
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
// The open world in Close View on the low tier (the shortest fog), the Wayfarer mid-section, clear ground.
function scene() {
  const s: any = freshSave(); s.seed = 'SOLID-CREATURES'; s.maxHp = 100; s.level = 20;
  Object.assign(s.session, { area: 'overworld', rx: 3, ry: 2, x: 16, y: 16 }); s.overworldCloseView = true; s.closeViewPreset = 'standard'; s.closeViewAutoFollow = false;
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.enemies = []; g.projectiles = []; g.player.hp = s.maxHp;
  for (const t of g.map.tiles) { t.blocked = false; t.environment = false; t.structure = null; t.elev = 0; t.kind = 'grass'; }
  g.map.objects = [];
  g.presentation = { effectiveQuality: 'low', reduceMotion: true };
  return g;
}
const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
// One frame with the world held still; the foes are placed where `place` says before the update and again before the render.
function frame(g: any, place: () => void = () => {}) { T += 16; place(); g.update(.016, still, T); place(); render(screen, g, 390, 844, T); }
// A point `d` tiles straight ahead of the camera from the Wayfarer (the far side of her), `side` tiles across.
function ahead(g: any, d: number, side = 0) { const c = closeViewCamera(), fx = Math.cos(c.yaw), fy = Math.sin(c.yaw), p = g.player;
  return { x: p.x + fx * d - fy * side, y: p.y + fy * d + fx * side }; }
const pin = (e: any, at: any) => Object.assign(e, { x: at.x, y: at.y, cooldown: 99, telegraph: 0, aggro: false, speedMultiplier: 1e-6, hitStun: 1 });
// The camera depth of a creature standing at `at` (its billboard's base: x + .5, y + .82).
function depthOf(at: any) { const c = closeViewCamera(), fx = Math.cos(c.yaw), fy = Math.sin(c.yaw); return (at.x + .5 - c.x) * fx + (at.y + .82 - c.y) * fy; }

test('the table: near and engage bands with a hold, a short far edge unchanged', () => {
  const S = CLOSE_VIEW.creatures.solid;
  assert.ok(S.near >= 4 && S.engage > S.near && S.hold > 0 && S.hold <= 1.5);
  assert.equal(CLOSE_VIEW.creatures.edge, 1.5);
  assert.equal(CLOSE_VIEW.camera.occlude.creatureFade, false);
});

test('creatures within range are opaque, on the far side of the Wayfarer where the open world fog used to dither them', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 30; i++) frame(g);
  const kinds = ['ashling', 'rootBrute', 'ashenHound', 'veilMoth', 'riftLynx', 'thunderhorn'];
  for (const [i, kind] of kinds.entries()) {
    const at = ahead(g, 3.6, (i - 2.5) * .9), e = pin(createCombatant(kind, at.x, at.y), at); e.id = `near-${kind}`; g.enemies = [e];
    for (let k = 0; k < 3; k++) frame(g, () => pin(e, at));
    const d = depthOf(at), was = closeViewCreatureFog(d, 8.5 * .65, 8.5);
    assert.ok(was > 0, `${kind}: stands in the old fade band (depth ${d.toFixed(2)}, fog ${was.toFixed(2)})`);
    const r = closeViewCreatureSolidity(e); assert.ok(r, `${kind} drawn`);
    assert.equal(r.alpha, 1, `${kind} opaque on its ${r.path} (alpha ${r.alpha})`);
  }
}));

test('hysteresis: no flicker over a walk past, in the band or out of it', () => {
  const g: any = { player: { x: 10, y: 10 }, lockedTarget: () => null };
  const e: any = createCombatant('ashling', 20, 10); e.aggro = false;
  const S = CLOSE_VIEW.creatures.solid; let flips = 0, last = closeViewCreatureSolidNear(e, g), enter = NaN, leave = NaN;
  // in from 10 tiles to the Wayfarer, out again, with a jitter of a tenth of a tile at every step
  const path = []; for (let x = 20; x >= 10; x -= .05) path.push(x); for (let x = 10; x <= 20; x += .05) path.push(x);
  for (const [i, x] of path.entries()) { e.x = x + (i % 2 ? .1 : -.1); const now = closeViewCreatureSolidNear(e, g); if (now !== last) { flips++; if (now) enter = e.x - 10; else leave = e.x - 10; } last = now; }
  assert.equal(flips, 2, 'solid once on the way in, released once on the way out');
  assert.ok(enter <= S.near + 1e-9 && leave > S.near + S.hold - 1e-9, `enters by ${S.near}, leaves past ${S.near + S.hold} (${enter.toFixed(2)}, ${leave.toFixed(2)})`);
  // engaging: a creature winding up (or striking, or the locked target) is solid out to the engage band
  e.x = 10 + S.engage - .5; e.aggro = true; e.telegraph = .4; assert.equal(closeViewCreatureSolidNear(e, g), true);
  e.telegraph = 0; e.pack = { phase: 'recover' }; assert.equal(closeViewCreatureSolidNear(e, g), true);
  e.pack = null; assert.equal(closeViewCreatureSolidNear(e, g), false, 'past the near band, not engaging: released');
  g.lockedTarget = () => e; assert.equal(closeViewCreatureSolidNear(e, g), true, 'the locked target'); g.lockedTarget = () => null;
});

test('hysteresis rendered: a creature walking past the Wayfarer keeps one body and full opacity every frame', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 30; i++) frame(g);
  const e = createCombatant('ashenHound', 0, 0); e.id = 'walker'; g.enemies = [e];
  const paths = new Set(), alphas: number[] = [];
  for (let k = 0; k <= 40; k++) { const at = ahead(g, 3.2, -3 + k * .15); frame(g, () => pin(e, at)); const r = closeViewCreatureSolidity(e); if (r) { paths.add(r.path); alphas.push(r.alpha); } }
  assert.ok(alphas.length >= 30, `drawn through the pass (${alphas.length})`);
  assert.deepEqual([...paths], ['model'], 'never swapped for its card');
  assert.ok(alphas.every(a => a === 1), `solid every frame (min ${Math.min(...alphas)})`);
}));

test('a full model budget: the creatures engaging the Wayfarer keep their bodies; idle ones nearer the camera give way', () => withGPU(() => {
  const g = scene(); g.presentation.effectiveQuality = 'balanced'; for (let i = 0; i < 30; i++) frame(g);
  const fight: any[] = [], idle: any[] = [];
  for (let i = 0; i < 3; i++) { const e = createCombatant('ashling', 0, 0); e.id = `fight-${i}`; fight.push([e, ahead(g, 6.2, (i - 1) * 1.2)]); }
  for (let i = 0; i < 14; i++) { const e = createCombatant('glassMite', 0, 0); e.id = `idle-${i}`; idle.push([e, ahead(g, 5 + (i % 2) * .3, (i - 6.5) * .35)]); }
  g.enemies = [...fight, ...idle].map(([e]) => e);
  const place = () => { for (const [e, at] of idle) pin(e, at); for (const [e, at] of fight) Object.assign(pin(e, at), { aggro: true, telegraph: .5 }); };
  const seen = new Map();
  for (let k = 0; k < 8; k++) { frame(g, place); for (const [e] of fight) { const r = closeViewCreatureSolidity(e); if (r) { const s = seen.get(e.id) || new Set(); s.add(r.path); seen.set(e.id, s); } } }
  for (const [e, at] of fight) assert.ok(depthOf(at) > depthOf(idle[0][1]) && Math.hypot(at.x - g.player.x, at.y - g.player.y) > CLOSE_VIEW.creatures.solid.near, 'farther from the camera and past the near band');
  for (const [e] of fight) assert.deepEqual([...(seen.get(e.id) || [])], ['model'], `${e.id}: a body every frame`);
}));

test('a crowd past the low tier cap: the bodies stay with the creatures that have them, frame after frame', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 30; i++) frame(g);
  const crowd: any[] = [];
  for (let i = 0; i < 12; i++) { const e = createCombatant(['ashling', 'rootBrute', 'ashenHound', 'glassMite'][i % 4], 0, 0); e.id = `crowd-${i}`; crowd.push([e, (i - 5.5) * .45]); }
  g.enemies = crowd.map(([e]) => e);
  const last = new Map(); let swaps = 0;
  for (let k = 0; k < 24; k++) {
    // they jostle in a line two tiles ahead of her, each stepping a fifth of a tile to and fro, so their depth order turns over every frame
    const spots = crowd.map(([, side], i) => ahead(g, 2 + ((k + i) % 2 ? .1 : -.1), side));
    frame(g, () => { for (const [i, [e]] of crowd.entries()) pin(e, spots[i]); });
    for (const [e] of crowd) { const r = closeViewCreatureSolidity(e); if (!r) continue; assert.equal(r.alpha, 1, `${e.id} solid`);
      if (k >= 2 && last.has(e.id) && last.get(e.id) !== r.path) swaps++; last.set(e.id, r.path); }
  }
  assert.equal(swaps, 0, 'no creature swaps between its body and its card while the crowd jostles');
}));

test('ghost kinds stay ghostly; a warded creature and an aloft Seraph are translucent in Close View', () => {
  const sp = CLOSE_VIEW.creatures.spectralAlpha;
  for (const kind of ['lumenWraith', 'gloomwisp', 'gloomgorge']) assert.equal(closeViewCreatureIntrinsicAlpha(createCombatant(kind, 0, 0)), sp, kind);
  const clone = Object.assign(createCombatant('mirrorShade', 0, 0), { illusion: true });
  assert.equal(closeViewCreatureIntrinsicAlpha(clone), ACTOR_ALPHA.illusion, 'a Mirror Shade illusion');
  assert.equal(closeViewCreatureIntrinsicAlpha(Object.assign(createCombatant('veilMoth', 0, 0), { phasing: true })), ACTOR_ALPHA.phasing, 'a wall phase');
  assert.equal(closeViewCreatureIntrinsicAlpha(Object.assign(createCombatant('sunderjaw', 0, 0), { hidden: true })), 0, 'burrowed');
  assert.equal(closeViewCreatureIntrinsicAlpha(Object.assign(createCombatant('ashling', 0, 0), { fleeFade: .4 })), .4, 'a departure');
  const seraph = Object.assign(createCombatant('cinderSeraph', 0, 0), { aloft: true });
  assert.equal(actorPresentation(seraph).alpha, ACTOR_ALPHA.aloftSeraph, 'the standard view keeps its aloft fade');
  assert.equal(closeViewCreatureIntrinsicAlpha(seraph), ACTOR_ALPHA.aloftSeraph, 'Close View keeps the translucent dive too');
  const W = CLOSE_VIEW.creatures.ward;
  assert.ok(W.alpha >= PHASE_SHIELD.alpha && W.alpha < 1 && W.holdMs >= 400, 'a steadier ward opacity, held');
  assert.equal(closeViewCreatureIntrinsicAlpha(Object.assign(createCombatant('voidSentinel', 0, 0), { warded: true })), W.alpha, 'warded');
  for (const kind of ['ashling', 'rootBrute', 'riftLynx', 'veilSpinner', 'thunderhorn', 'sparkWarden']) assert.equal(closeViewCreatureIntrinsicAlpha(createCombatant(kind, 0, 0)), 1, kind);
  assert.ok(PHASE_SHIELD.alpha < 1, 'the standard view still ghosts a warded creature');
});

test('a warded creature next to the Wayfarer is translucent in Close View, steadily; a spectral one keeps its own opacity', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 30; i++) frame(g);
  const W = CLOSE_VIEW.creatures.ward;
  const at = ahead(g, 1.6, .6), w = pin(createCombatant('voidSentinel', at.x, at.y), at); w.id = 'warded';
  const at2 = ahead(g, 1.6, -.9), ghost = pin(createCombatant('lumenWraith', at2.x, at2.y), at2); ghost.id = 'wraith';
  g.enemies = [w, ghost]; let ward = true;
  const place = () => { pin(w, at); w.warded = ward; w.untargetable = ward; pin(ghost, at2); };
  const alphas: number[] = [];
  for (let k = 0; k < 6; k++) { frame(g, place); alphas.push(closeViewCreatureSolidity(w)?.alpha); }
  assert.ok(alphas.every(a => Math.abs(a - W.alpha) < 1e-6), `warded and in the solid band: the ward wins (${alphas})`);
  assert.equal(closeViewCreatureSolidity(ghost)?.alpha, CLOSE_VIEW.creatures.spectralAlpha, 'the wraith: ghostly');
  // the ward flickering at the edge of the shaman's range: held steady, no flicker
  const held: number[] = [];
  for (let k = 0; k < 24; k++) { ward = k % 3 !== 0; frame(g, place); held.push(closeViewCreatureSolidity(w)?.alpha); }
  assert.ok(held.every(a => Math.abs(a - W.alpha) < 1e-6), `a ward toggling every few frames holds one opacity (${held})`);
  // the ward truly gone: solid again once the hold has run out, and not before
  ward = false; const after: number[] = [];
  for (let k = 0; k < 50; k++) { frame(g, place); after.push(closeViewCreatureSolidity(w)?.alpha); }
  const first = after.findIndex(a => a === 1);
  assert.ok(first > 0 && first * 16 >= W.holdMs - 32 && after.slice(first).every(a => a === 1), `released after the hold (${first} frames)`);
}));

test('the ward hold, unit: on while warded, for holdMs after, then off', () => {
  const W = CLOSE_VIEW.creatures.ward, e: any = createCombatant('ashling', 0, 0);
  assert.equal(closeViewCreatureWard(e, 1000), 1);
  e.warded = true; assert.equal(closeViewCreatureWard(e, 1100), W.alpha);
  e.warded = false; assert.equal(closeViewCreatureWard(e, 1100 + W.holdMs - 1), W.alpha); assert.equal(closeViewCreatureWard(e, 1100 + W.holdMs), 1);
});

test('the occluder never cuts a creature next to the Wayfarer, between her and the camera', () => withGPU(() => {
  const g = scene(); for (let i = 0; i < 30; i++) frame(g);
  const at = ahead(g, -1.1, .15), e = pin(createCombatant('rootBrute', at.x, at.y), at); e.id = 'between'; e.scale = 2.2; g.enemies = [e];
  for (let k = 0; k < 4; k++) frame(g, () => pin(e, at));
  assert.ok(depthOf(at) < depthOf(g.player), 'it stands between the camera and the Wayfarer');
  assert.equal(closeViewCreatureFade(e), 1, 'no occluder share');
  assert.equal(closeViewCreatureSolidity(e)?.alpha, 1, 'drawn solid');
  // the cut is only in the scenery's programs (props and terrain), never in a creature's (models, cards, beasts)
  const cut = GL.sources.filter((t: string) => t.includes('occlude(v_pos)'));
  assert.ok(cut.length >= 1 && cut.every((t: string) => !t.includes('in float v_alpha') && !t.includes('u_emitA')), 'occluder programs are scenery only');
}));

test('distant materialisation is unchanged: a creature far from the Wayfarer still thins at the fog edge', () => withGPU(() => {
  const E = CLOSE_VIEW.creatures.edge, far = 9.5 + 2, near = far * .65;
  assert.equal(closeViewCreatureFog(far - E - .01, near, far), 0); assert.ok(Math.abs(closeViewCreatureFog(far - E / 2, near, far) - .5) < 1e-9); assert.equal(closeViewCreatureFog(far, near, far), 1);
  const g = scene(); g.presentation.effectiveQuality = 'full'; for (let i = 0; i < 30; i++) frame(g);
  const S = CLOSE_VIEW.creatures.solid;
  // a camera depth half way through the full tier's edge band, straight ahead of the Wayfarer
  const gap = far - E / 2 - depthOf(g.player), at = ahead(g, gap);
  assert.ok(gap > S.near + S.hold, `far from her (${gap.toFixed(2)} tiles)`);
  const e = pin(createCombatant('ashling', at.x, at.y), at); e.id = 'distant'; g.enemies = [e];
  for (let k = 0; k < 3; k++) frame(g, () => pin(e, at));
  const r = closeViewCreatureSolidity(e);
  assert.ok(r && r.path !== 'culled', `drawn (${r?.path})`);
  assert.ok(r.alpha > 0 && r.alpha < 1, `materialising in the edge band, as before (${r.alpha})`);
  assert.equal(r.near, false); assert.equal(r.w, 0, 'spared none of the fade: exactly the old opacity');
  // walking in, it is spared the fade smoothly (eased), never popping; walking out again, it thins smoothly
  const steps: number[] = []; for (let k = 0; k <= 60; k++) { const a2 = ahead(g, gap - (k < 30 ? k : 60 - k) * .2); frame(g, () => pin(e, a2)); const q = closeViewCreatureSolidity(e); if (q) steps.push(q.alpha); }
  for (let k = 1; k < steps.length; k++) assert.ok(Math.abs(steps[k] - steps[k - 1]) < .35, `no pop (${steps[k - 1].toFixed(3)} to ${steps[k].toFixed(3)})`);
}));
