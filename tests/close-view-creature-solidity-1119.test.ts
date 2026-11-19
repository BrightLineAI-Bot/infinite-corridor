// Close View creature solidity, pass 2 (Tim, 2026-11-19, in Close View at full motion: "the creatures still feel ephemeral, a
// little wireframe-y, like they aren't filled in... I want... creatures concrete and persistent while in frame, while
// attacking, while the Wayfarer can interact with them, until they die"). The contract checked here:
// - a live creature in view is never screen-door dithered by the fog's edge (CLOSE_VIEW.creatures.fogDither false), and in the
//   open world it is kept to the GPU's own fog (OUTDOOR.view), not the floor's shorter radius, on every tier;
// - creatures share the Wayfarer's broad exposure with a form fill (CLOSE_VIEW_ACTOR_LOOK expose/contrast/form; rims kept
//   as edge separation only), in the model and beast programs;
// - bodies stand on the floor (CREATURE_GROUND) on a contact shadow sized to their stance (CLOSE_VIEW.creatures.contact);
// - a slain body falls, rests on the floor, lies whole and sinks (CLOSE_VIEW.creatures.death), opaque, capped per tier;
// - a blow's weight scales the flinch and the grounded slide back, and the body flashes white-hot first (CREATURE_MOTION.impact);
// - triangle counts are unchanged (no added geometry), and nothing allocates beyond one record per kind measured once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { render } from '../src/renderer.ts';
import { GLB, DECAL_FLOATS, closeViewGLStats, resetCloseViewGL, CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { beastFragmentBody } from '../src/close-view-beast-gl.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewCamera, closeViewCreatureSolidity, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { MODEL_FLOATS, writeCloseViewModel, modelTriangleCount, creatureRestGround, creatureFootprint, CREATURE_GROUND, creaturePoseFamily } from '../src/close-view-models.ts';
import { CREATURE_MOTION, creatureMotion } from '../src/creature-motion.ts';

class MockGL {
  program: any = null; uploads: Float32Array[] = [];
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(s: any, t: any) { s.text = t; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  bufferData(_t: any, data: any) { if (data instanceof Float32Array && this.program?.shaders?.some((s: any) => s.text.includes('in float a_alpha'))) this.uploads.push(Float32Array.from(data)); }
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
function scene(quality = 'balanced') {
  const s: any = freshSave(); s.seed = 'SOLID-1119'; s.maxHp = 100; s.level = 20;
  Object.assign(s.session, { area: 'overworld', rx: 3, ry: 2, x: 16, y: 16 }); s.overworldCloseView = true; s.closeViewPreset = 'standard'; s.closeViewAutoFollow = false;
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.enemies = []; g.projectiles = []; g.player.hp = s.maxHp;
  for (const t of g.map.tiles) { t.blocked = false; t.environment = false; t.structure = null; t.elev = 0; t.kind = 'grass'; }
  g.map.objects = []; g.presentation = { effectiveQuality: quality, reduceMotion: false };
  return g;
}
const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
function frame(g: any, place: () => void = () => {}) { T += 16; place(); g.update(.016, still, T); place(); render(screen, g, 390, 844, T); }
function ahead(g: any, d: number, side = 0) { const c = closeViewCamera(), fx = Math.cos(c.yaw), fy = Math.sin(c.yaw), p = g.player; return { x: p.x + fx * d - fy * side, y: p.y + fy * d + fx * side }; }
const pin = (e: any, at: any) => Object.assign(e, { x: at.x, y: at.y, cooldown: 99, telegraph: 0, aggro: false, speedMultiplier: 1e-6, hitStun: 1 });
const modelAlphas = (u: Float32Array) => Array.from(u || []).filter((_, i) => i % MODEL_FLOATS === 9);
const KINDS = ['ashling', 'rootBrute', 'ashenHound', 'hollowMarshal', 'glassMite', 'coilStalker', 'pallidCrawler', 'sparkWarden', 'voidSentinel'];

test('the tables: no fog-edge dither for live creatures, outdoor reach, contact, death and impact are data', () => {
  const C = CLOSE_VIEW.creatures;
  assert.equal(C.fogDither, false); assert.equal(C.outdoorReach, true);
  assert.ok(C.contact.min > 0 && C.contact.max > C.contact.min && C.contact.alpha > 0 && C.contact.alpha <= 1);
  assert.ok(C.death.holdMs > 0 && C.death.sinkMs > 0 && C.death.sink > 0);
  assert.ok(C.death.cap.low <= C.death.cap.balanced && C.death.cap.balanced <= C.death.cap.full && C.death.cap.full <= 8, 'bounded per tier');
  const I = CREATURE_MOTION.impact; assert.ok(I.light < 1 && I.heavy > 1 && I.knock > 0 && I.knock < .3 && I.flashMs <= 120);
});

test('outdoors, a live creature 2 to 7 tiles past the Wayfarer is a whole body on every tier (it was dithered at 5, gone at 6-7)', () => withGPU(() => {
  for (const q of ['low', 'balanced', 'full']) {
    const g = scene(q); for (let i = 0; i < 20; i++) frame(g);
    const placed = KINDS.slice(0, 6).map((kind, i) => { const at = ahead(g, 2 + i, i % 2 ? 1.2 : -1.2), e = pin(createCombatant(kind, at.x, at.y), at); e.id = `far-${q}-${i}`; return [e, at]; });
    g.enemies = placed.map(([e]) => e);
    for (let k = 0; k < 4; k++) frame(g, () => { for (const [e, at] of placed) pin(e, at); });
    for (const [e] of placed) { const r = closeViewCreatureSolidity(e); assert.ok(r && r.path === 'model', `${q} ${e.kind}: a body (${r?.path})`); assert.equal(r.alpha, 1, `${q} ${e.kind}: opaque`); }
    assert.ok(modelAlphas(GL.uploads.at(-1)).every(a => a === 1), `${q}: every uploaded body vertex opaque`);
  }
}));

test('a creature walking in from far out never thins: one opacity, every frame', () => withGPU(() => {
  const g = scene('full'); for (let i = 0; i < 20; i++) frame(g);
  const e = createCombatant('ashenHound', 0, 0); e.id = 'approach'; g.enemies = [e]; const seen: number[] = [];
  for (let k = 0; k <= 40; k++) { const at = ahead(g, 9 - k * .18, .5); frame(g, () => pin(e, at)); const r = closeViewCreatureSolidity(e); if (r && r.path !== 'culled') seen.push(r.alpha); }
  assert.ok(seen.length >= 35, `drawn on the walk (${seen.length})`); assert.ok(seen.every(a => a === 1), `opaque every frame (min ${Math.min(...seen)})`);
}));

test('shading: the Wayfarer-like exposure and form fill are in the model and beast programs; rims are only edge separation', () => {
  const L = CLOSE_VIEW_ACTOR_LOOK, src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.ok(L.expose > .7 && L.expose <= 1 && L.contrast > 0 && L.contrast < 1 && L.form > 0 && L.rim < 1 && L.spec < .25);
  assert.match(src, /mix\(vec3\(\$\{glf\(CLOSE_VIEW_ACTOR_LOOK\.expose\)\}\), dif, \$\{glf\(CLOSE_VIEW_ACTOR_LOOK\.contrast\)\}\)/);
  assert.match(src, /CLOSE_VIEW_ACTOR_LOOK\.form/);
  const beast = beastFragmentBody(L as any); assert.ok(beast.includes(L.expose.toFixed(4)) && beast.includes(L.form.toFixed(4)), 'world beasts share it');
});

test('bodies stand on the floor: grounded families touch it, designed hovering bodies do not', () => {
  const out = new Float32Array(400000);
  for (const kind of KINDS) {
    if (!CREATURE_GROUND.families.includes(creaturePoseFamily(kind))) continue;
    const n = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount: 0, pose: 'idle', alpha: 1, scale: 1, effectTime: 0, reduceMotion: true });
    let low = Infinity; for (let o = 2; o < n; o += MODEL_FLOATS) low = Math.min(low, out[o]);
    assert.ok(Math.abs(low) < .012, `${kind}: lowest point ${low.toFixed(3)} on the floor`);
    assert.ok(creatureRestGround(kind) >= 0 && creatureRestGround(kind) <= CREATURE_GROUND.max);
  }
  assert.equal(creatureRestGround('veilMoth'), 0, 'a hovering moth stays aloft');
  for (const kind of KINDS) assert.ok(creatureFootprint(kind) > .1 && creatureFootprint(kind) < 1.5, `${kind}: a stance`);
});

test('triangle budgets: the pass adds no geometry', () => {
  const pins: any = { ashling: 158, rootBrute: 204, ashenHound: 216, hollowMarshal: 220, glassMite: 166, coilStalker: 172, pallidCrawler: 168, sparkWarden: 184, voidSentinel: 198 };
  for (const kind of Object.keys(pins)) assert.equal(modelTriangleCount(kind), pins[kind], kind);
});

test('each body stands on one contact shadow sized to its stance', () => withGPU(() => {
  const g = scene('balanced'); for (let i = 0; i < 20; i++) frame(g);
  const at = ahead(g, 2.5), e = pin(createCombatant('rootBrute', at.x, at.y), at); e.id = 'stance'; g.enemies = [e];
  for (let k = 0; k < 3; k++) frame(g, () => pin(e, at));
  const K = CLOSE_VIEW.creatures.contact, want = Math.max(K.min, Math.min(K.max, creatureFootprint('rootBrute') * K.share)) * 1.15;
  let found = 0; const D = GLB.decal;
  for (let v = 0; v < GLB.nDecal; v += 6) { const b = v * DECAL_FLOATS; if (D[b + 5] !== 0) continue; const cx = D[b], cy = D[b + 1];
    if (Math.hypot(cx - (e.x + .5), cy - (e.y + .77)) < 1 && Math.abs(Math.abs(D[b + 3]) - 1) < 1e-6) found++; }
  assert.ok(found >= 1, 'a contact decal under it');
  assert.ok(want > CLOSE_VIEW.contact.radius * 1.15, 'wider than the old coin under a wide body');
}));

test('a slain body falls, rests whole on the floor, sinks, and goes; at most the tier cap lie at once', () => withGPU(() => {
  const g = scene('low'); for (let i = 0; i < 20; i++) frame(g);
  const D = CLOSE_VIEW.creatures.death, life = 430 + D.holdMs + D.sinkMs;
  const foes = Array.from({ length: 6 }, (_, i) => { const at = ahead(g, 2 + (i % 3) * .9, (i - 2.5) * .9), e = pin(createCombatant('ashling', at.x, at.y), at); e.id = `slain-${i}`; return [e, at]; });
  g.enemies = foes.map(([e]) => e); for (let k = 0; k < 3; k++) frame(g, () => { for (const [e, at] of foes) pin(e, at); });
  for (const [e] of foes) { e.hp = 0; e.dead = true; }
  const alphas: number[] = [], counts: number[] = []; let t = 0;
  while (t < life + 200) { frame(g); t += 16; counts.push(closeViewGLStats.dying); if (closeViewGLStats.dying > 0) alphas.push(Math.min(...modelAlphas(GL.uploads.at(-1)))); }
  assert.ok(Math.max(...counts) >= 1 && Math.max(...counts) <= D.cap.low, `capped on low (${Math.max(...counts)})`);
  assert.ok(counts.filter(c => c > 0).length * 16 >= life - 100, 'the whole fall, rest and sink play');
  assert.ok(alphas.every(a => a === 1), `opaque throughout (min ${Math.min(...alphas)})`);
  assert.equal(counts.at(-1), 0, 'gone after its life');
}));

test('a fallen body rests on the floor, not above it', () => {
  const out = new Float32Array(400000);
  for (const kind of ['rootBrute', 'ashling', 'hollowMarshal', 'ashenHound']) for (const amount of [.3, .6, 1]) {
    const n = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount, pose: 'death', alpha: 1, scale: 1, effectTime: 0, hitX: -1, hitY: 0 });
    let low = Infinity; for (let o = 2; o < n; o += MODEL_FLOATS) low = Math.min(low, out[o]);
    assert.ok(low <= .005, `${kind} at ${amount}: lowest point ${low.toFixed(3)}`);
  }
});

test('impact: a heavy blow jolts harder and slides further back than a chip; reduced motion is smaller, not none', () => {
  const actor = (blow: number, reduce = false) => ({ kind: 'ashling', yaw: 0, flinch: .8, hitX: -1, hitY: 0, blow, effectTime: 0, seed: 1, reduceMotion: reduce, pace: 0 });
  const take = (a: any) => { const r = creatureMotion(a, 'biped', null); return { lean: Math.abs(r.lean), lunge: r.lunge, head: Math.abs(r.headPitch) }; };
  const chip = take(actor(0)), heavy = take(actor(1)), old = take({ ...actor(0), blow: undefined }), slow = take(actor(1, true));
  assert.ok(heavy.lean > chip.lean * 2 && heavy.head > chip.head * 2, 'heavier jolt');
  assert.ok(heavy.lunge < chip.lunge - .1, `slides back along the push (${chip.lunge.toFixed(3)} -> ${heavy.lunge.toFixed(3)})`);
  assert.ok(Math.abs(old.head - chip.head / CREATURE_MOTION.impact.light) < 1e-9, 'with no weight given, the old strength');
  assert.ok(slow.lean > 0 && slow.lean < heavy.lean && slow.lunge === 0, 'reduced: smaller, no slide');
});

test('impact: the body itself flashes white-hot for the blow\'s first instant, then the hurt tint', () => {
  const out = new Float32Array(20000), a: any = { kind: 'rootBrute', x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount: 0, pose: 'idle', alpha: 1, scale: 1, effectTime: 0, hitReact: 1 };
  const avg = (b: Float32Array, n: number) => { let s = 0, c = 0; for (let o = 0; o < n; o += MODEL_FLOATS) { s += b[o + 6] + b[o + 7] + b[o + 8]; c++; } return s / c; };
  const n0 = writeCloseViewModel(out, 0, { ...a, impactFlash: 0 }), red = avg(out, n0);
  const n1 = writeCloseViewModel(out, 0, { ...a, impactFlash: 1 }), hot = avg(out, n1);
  assert.equal(n0, n1, 'same geometry'); assert.ok(hot > red + .3, `brighter in the first instant (${red.toFixed(2)} -> ${hot.toFixed(2)})`);
});
