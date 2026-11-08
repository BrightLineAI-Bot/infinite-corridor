import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { updateEnemyAI } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { actorPresentation, nativeCreatureCoverage, projectileVisualHeight, shotVisualHeight } from '../src/actor-presentation.ts';
import { MODEL_FLOATS, modelTriangleCount, modelSupportsAttachments } from '../src/close-view-models.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewMonsterAction, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { GLB, DECAL_FLOATS, closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { nativeWindupDuration, render, drawNativeCreatureFloor, drawNativeCreatureDecorations } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';

const kinds = ['glassMite', 'sparkWarden', 'cinderWisp', 'veilMoth', 'voidSentinel'];
const capture = (e) => ({ enemy: e, nativeFloor() {}, nativeDecorations() {} });
const floor = () => ({ width: 16, height: 16, tiles: Array.from({ length: 256 }, (_, i) => ({ x: i % 16, y: Math.floor(i / 16), blocked: false })), objects: [] });

test('presentation admission requires exact identity, supported action/effects and attachment room', () => {
  for (const kind of kinds) {
    const e = createCombatant(kind, 5, 5), d = capture(e);
    assert.equal(nativeCreatureCoverage(e, d), null, kind);
    assert.equal(nativeCreatureCoverage(e, capture({ ...e })), 'capture', 'colocated objects cannot borrow another capture');
    Object.assign(e, { fracRank: 'rare', packName: 'Test Rare', fracShaman: true, warded: true, affixes: ['droneSwarm'], poiseBreak: .5 });
    assert.equal(nativeCreatureCoverage(e, d), 'attachment-budget');
    assert.ok(modelSupportsAttachments(kind, 3));
    assert.equal(nativeCreatureCoverage(e, d, { attachments: true }), null);
    assert.ok(modelTriangleCount(kind) + 24 <= 256);
    e.affixes = ['future-affix']; assert.equal(nativeCreatureCoverage(e, d), 'affix');
    e.affixes = []; e.packKind = true; assert.equal(nativeCreatureCoverage(e, d), 'pack-effects');
    e.packKind = false; e.hidden = true; assert.equal(nativeCreatureCoverage(e, d), 'visibility');
  }
  assert.equal(nativeCreatureCoverage({ kind: 'psychicCrystal' }, {}), 'body', 'special body effects retain the complete sprite renderer');
});

test('real ordinary producers distinguish Moth contact from Warden/Wisp ranged release and resume windup from state', () => {
  const map = floor(), player = { x: 8, y: 5 }, aim = { x: 1, y: 0 };
  for (const kind of ['sparkWarden', 'cinderWisp', 'veilMoth']) {
    const e = Object.assign(createCombatant(kind, 5, 5), { telegraph: .45, attackAim: { ...aim } });
    const before = structuredClone(e);
    const winding = closeViewMonsterAction(e, kind, nativeWindupDuration(e));
    assert.equal(winding.winding, true); assert.equal(winding.windupAmount, .5); assert.deepEqual(winding.aim, aim);
    assert.deepEqual(e, before, 'presentation does not stamp a gameplay clock');
    let shots = 0; e.telegraph = .01;
    const hit = updateEnemyAI(e, player, map, 16, .02, 100, null, () => { shots++; });
    assert.equal(shots, kind === 'veilMoth' ? 0 : 1); assert.equal(hit, kind === 'veilMoth');
    const action = closeViewMonsterAction(e, kind);
    assert.equal(action.attack, true); assert.deepEqual(action.aim, aim);
    assert.equal(actorPresentation(e).bodyLift > 0, kind !== 'sparkWarden', 'Warden stays grounded, Moth/Wisp fly');
  }
});

test('height and alpha contracts are finite, scaled once and preserve old shots', () => {
  const e = { kind: 'cinderWisp', scale: 2, phasing: true, illusion: true, fleeFade: .5 };
  const p = actorPresentation(e);
  assert.equal(p.bodyLift, .76); assert.equal(p.alpha, .45 * .92 * .5);
  assert.equal(projectileVisualHeight(e), (.38 + .58) * 2);
  assert.equal(projectileVisualHeight(e, 'drone'), .66);
  assert.equal(shotVisualHeight({ visualHeight: NaN }), .66); assert.equal(shotVisualHeight({}), .66);
  assert.equal(shotVisualHeight({ visualHeight: Infinity }), .66);
  assert.equal(projectileVisualHeight({ kind: 'unknown' }), .66);
});

const context = (log = []) => new Proxy({
  canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
}, { get: (o, key) => key in o ? o[key] : (...args) => { log.push([key, ...args]); }, set: (o, key, v) => { o[key] = v; return true; } });
class MockGL {
  uploads = []; sources = []; program = null;
  constructor() { let id = 1; const constants = new Map(); return new Proxy(this, { get: (o, key) => {
    if (key in o) return o[key];
    if (typeof key === 'string' && /^[A-Z][A-Z0-9_]+$/.test(key)) { if (!constants.has(key)) constants.set(key, id++); return constants.get(key); }
    return () => {};
  } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return { shaders: [] }; }
  shaderSource(shader, text) { shader.text = text; this.sources.push(text); } attachShader(program, shader) { program.shaders.push(shader); }
  useProgram(program) { this.program = program; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(p, key) { return key === this.ACTIVE_UNIFORMS || key === this.ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
  bufferData(target, data) { if (data instanceof Float32Array && this.program?.shaders?.some(s => s.text.includes('in float a_alpha'))) this.uploads.push(Float32Array.from(data)); }
}
function withGPU(run) {
  const previous = globalThis.WebGL2RenderingContext; globalThis.WebGL2RenderingContext = MockGL;
  const gl = new MockGL(), log = [], screen = context(log);
  const canvas = { width: 390, height: 844, addEventListener() {}, getContext: kind => kind === 'webgl2' ? gl : context(log) };
  screen.canvas = canvas; setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try { run({ gl, log, screen }); } finally {
    CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null);
    if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous;
  }
}

test('GPU capture preserves native decorations, sprite fallbacks, phase coverage and tier caps', () => withGPU(({ gl, log, screen }) => {
  const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now: 100000 });
  game.presentation = { effectiveQuality: 'full', reduceMotion: true }; resetCloseViewCamera();
  const at = { x: game.player.x + .5, y: game.player.y + .5 };
  game.enemies = kinds.map((kind, i) => Object.assign(createCombatant(kind, at.x, at.y), { id: `native-${i}` }));
  const e = game.enemies[1]; Object.assign(e, { fracRank: 'rare', packName: 'Test Rare', fracShaman: true, warded: true, affixes: ['droneSwarm'], poiseBreak: .5, phasing: true });
  game.enemies.push(Object.assign(createCombatant('glassMite', at.x, at.y), { id: 'unsupported', affixes: ['future-affix'] }));
  let now = 100000; for (let i = 0; i < 8; i++) render(screen, game, 390, 844, now += 16);
  assert.equal(closeViewGLStats.models, 6, 'player and all five colocated species use their actual captures');
  assert.ok(closeViewGLStats.boards >= 2, 'decoration-only card and unsupported full sprite remain');
  assert.equal(closeViewGLStats.modelFallbacks.affix, 1);
  assert.ok(log.some(row => row[0] === 'fillText' && row[1] === 'Test Rare'));
  assert.ok(log.some(row => row[0] === 'fillText' && row[1] === 'Drone Swarm'));
  const vertices = gl.uploads.at(-1); assert.equal(MODEL_FLOATS, 10);
  assert.ok(vertices && vertices.every(Number.isFinite));
  const alphas = Array.from(vertices).filter((_, i) => i % MODEL_FLOATS === 9);
  assert.ok(alphas.some(a => a > 0 && a <= .45));
  const shader = gl.sources.find(s => s.includes('bayer[16]'));
  assert.ok(shader.indexOf('if (v_alpha <=') < shader.indexOf('if (u_pass >'), 'both passes apply the same alpha discard');
  assert.ok(closeViewGLStats.modelTriangles <= closeViewGLStats.models * 256);
  game.paused = true; game.pauseStarted = now;
  render(screen, game, 390, 844, now + 100); const paused = gl.uploads.at(-1);
  render(screen, game, 390, 844, now + 300); const later = gl.uploads.at(-1);
  assert.deepEqual(Array.from(later).filter((_, i) => i % MODEL_FLOATS !== 9), Array.from(paused).filter((_, i) => i % MODEL_FLOATS !== 9), 'paused body motion and gameplay-position drone attachments freeze; camera visibility may ease independently');
  game.paused = false;
  const maxCalls = closeViewGLStats.drawCalls;
  for (const [quality, cap] of [['low', 8], ['balanced', 14], ['full', 20]]) {
    game.presentation.effectiveQuality = quality;
    game.enemies = Array.from({ length: 30 }, (_, i) => Object.assign(createCombatant(kinds[i % 5], at.x, at.y), { id: `crowd-${i}` }));
    render(screen, game, 390, 844, now += 16);
    assert.ok(closeViewGLStats.models <= cap, quality); assert.ok(closeViewGLStats.modelTriangles <= cap * 256);
    assert.ok(closeViewGLStats.drawCalls <= maxCalls, 'crowds add no model passes');
  }
}));

test('projected shot heads and trails use visual height without changing simulation XY', () => withGPU(({ screen }) => {
  const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now: 100000 });
  game.enemies = []; game.presentation = { effectiveQuality: 'full' }; resetCloseViewCamera();
  const shot = { id: 'height-test', x: game.player.x + .5, y: game.player.y + .6, dx: 1, dy: 0, age: .1, speed: 3, damage: 2, life: 1, hostile: true, visualHeight: 1.4 };
  game.projectiles = [shot]; const before = structuredClone(shot);
  for (let i = 0; i < 5; i++) render(screen, game, 390, 844, 100000 + i * 16);
  assert.deepEqual(shot, before);
  const z = []; for (let i = 0; i < GLB.nDecal; i++) { const b = i * DECAL_FLOATS; if (GLB.decal[b + 5] === 11) z.push(GLB.decal[b + 2] - interiorSurfaceHeight(game.map, GLB.decal[b], GLB.decal[b + 1])); }
  assert.equal(z.length, 12, 'one head and one trail in the existing additive batch');
  assert.ok(z.every(v => v > 1.3 && v < 1.5));
}));

test('actual GPU frames submit bounded raised Echo ribbons without a floor duplicate', () => withGPU(({ screen }) => {
  const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now: 100000 });
  game.enemies = []; game.projectiles = []; game.presentation = { effectiveQuality: 'full', reduceMotion: false }; resetCloseViewCamera();
  const actual = { x: game.player.x + .5, y: game.player.y + .45, dx: 1, dy: 0, range: 1.75, arc: 180, shape: 'arc' };
  const memory = { x: actual.x - 1, y: actual.y, dx: 0, dy: 1, range: 2.45, arc: 32, shape: 'thrust', weaponKind: 'cinder-pike', primaryStep: 1, support: 2 };
  game.glyphVisuals = [{ kind: 'primaryEcho', life: .14, max: .28, actual, memory }];
  for (let i = 0; i < 5; i++) render(screen, game, 390, 844, 100000 + i * 16);
  assert.equal(closeViewGLStats.echoRibbonPaths, 2); assert.equal(closeViewGLStats.echoRibbonVertices, CLOSE_VIEW.echoRibbon.segments * 6 * 2);
  const verts = []; for (let i = GLB.nGlowStart; i < GLB.nDecal; i++) { const b = i * DECAL_FLOATS; if (GLB.decal[b + 5] === 11) verts.push(Array.from(GLB.decal.slice(b, b + DECAL_FLOATS))); }
  assert.equal(verts.length, 84, 'actual + differing immutable memory share the existing additive kind-11 batch');
  assert.ok(verts.every(v => Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[2] >= .72 && v[2] <= 2 * .34 + .97));
  assert.ok(verts.some(v => v[7] === 0xc9a7ff) && verts.some(v => v[7] === 0xd8c8ff));
  assert.ok(verts.every(v => v[8] === 1), 'ribbons use trail geometry, not a body/model replay or floor stamp');
  assert.ok(verts.some(v => Math.abs(v[0] - actual.x) > 1.5), 'world positions follow the authoritative delayed arc');
  assert.deepEqual(game.glyphVisuals[0].memory, memory, 'rendering does not mutate accepted memory metadata');

  game.presentation.reduceMotion = true; render(screen, game, 390, 844, 100100);
  assert.equal(closeViewGLStats.echoRibbonPaths, 1); assert.equal(closeViewGLStats.echoRibbonVertices, 42, 'reduced motion keeps the truthful actual path only');
  game.presentation.reduceMotion = false; game.presentation.effectiveQuality = 'low';
  game.glyphVisuals = Array.from({ length: 9 }, (_, i) => ({ kind: 'primaryEcho', life: .2, max: .28, actual: { ...actual, x: actual.x + i * .01 }, memory: null }));
  render(screen, game, 390, 844, 100116); assert.equal(closeViewGLStats.echoRibbonPaths, CLOSE_VIEW.echoRibbon.cap.low); assert.equal(closeViewGLStats.echoRibbonVertices, CLOSE_VIEW.echoRibbon.cap.low * 42);
  const echoData = () => { const out=[]; for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+5]===11&&GLB.decal[b+7]===0xc9a7ff)out.push(...GLB.decal.slice(b,b+DECAL_FLOATS));} return out; };
  game.paused = true; game.pauseStarted = 100116; const paused = echoData();
  render(screen, game, 390, 844, 101116); assert.deepEqual(echoData(), paused, 'pause does not move or age submitted ribbons');
  game.paused = false; game.glyphVisuals = [{ kind: 'primaryEcho', life: 0, max: .28, actual }, { kind: 'primaryEcho', life: .2, max: .28, actual: { ...actual, dx: NaN } }, { kind: 'futureEcho', life: 1, max: 1, actual }];
  render(screen, game, 390, 844, 101132); assert.equal(closeViewGLStats.echoRibbonPaths, 0); assert.equal(closeViewGLStats.echoRibbonVertices, 0, 'expired, malformed and unknown records skip within the same bound');
}));

test('native floor and body decorations split without revealing hidden actors; reduced motion freezes decorative stars', () => {
  const e = Object.assign(createCombatant('sparkWarden', 5, 5), { fracRank: 'rare', packName: 'Rare', fracShaman: true, warded: true, affixes: ['enraged'], poiseBreak: .5 });
  const g = { enemies: [e], presentation: { reduceMotion: true } }, a = [], b = [];
  drawNativeCreatureFloor(context(a), g, e, 32, 1000);
  assert.ok(a.some(r => r[0] === 'arc')); assert.ok(!a.some(r => r[0] === 'fillText'));
  a.length = 0; drawNativeCreatureDecorations(context(a), e, 32, 1000, g.presentation);
  drawNativeCreatureDecorations(context(b), e, 32, 2000, g.presentation); assert.deepEqual(a, b);
  e.hidden = true; a.length = 0; drawNativeCreatureFloor(context(a), g, e, 32, 1000); drawNativeCreatureDecorations(context(a), e, 32, 1000, g.presentation); assert.equal(a.length, 0);
});

test('Game, renderer and Close View remain independently importable', () => {
  for (const file of ['game.ts', 'renderer.ts', 'close-view.ts']) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `await import(${JSON.stringify(new URL('../src/' + file, import.meta.url).href)})`], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
});
