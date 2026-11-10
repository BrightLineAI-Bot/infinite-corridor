import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { actorPresentation } from '../src/actor-presentation.ts';
import { render } from '../src/renderer.ts';
import { MODEL_FLOATS } from '../src/close-view-models.ts';
import { GLB, BOARD_FLOATS, closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { closeViewActorEnvironmentAlpha, closeViewCamera, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';

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


test('enemy visibility separates environment from captured spectral and phase alpha', () => {
  for (const kind of ['glassMite', 'veilMoth', 'graveLantern', 'cinderWisp', 'gnawingMaw']) {
    const enemy = createCombatant(kind, 0, 0), capture = { enemy };
    for (const lit of [0, .2, 1]) for (const foreground of [false, true])
      assert.equal(closeViewActorEnvironmentAlpha(capture, lit, 0, foreground), 1, kind);
    assert.equal(closeViewActorEnvironmentAlpha(capture, 0, .75, true), .25);
    assert.equal(closeViewActorEnvironmentAlpha(capture, 1, 1), 0);
  }
  const phased = createCombatant('veilMoth', 0, 0);
  Object.assign(phased, { phasing: true, illusion: true, fleeFade: .5 });
  const before = structuredClone(phased), intrinsic = actorPresentation(phased).alpha;
  assert.equal(intrinsic, .45 * .92 * .5);
  assert.equal(intrinsic * closeViewActorEnvironmentAlpha({ enemy: phased }, 0, 0, true), intrinsic);
  assert.deepEqual(phased, before);
  assert.ok(closeViewActorEnvironmentAlpha({}, 0, 0) < .11, 'props retain their darkness policy');
  assert.equal(closeViewActorEnvironmentAlpha({}, 1, 0, true), .4, 'foreground props retain their cut');
});

test('production native and unsupported fallback submissions retain solid nearby enemies', () => withGPU(({ gl, screen }) => {
  const now = 100000;
  const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now });
  game.presentation = { effectiveQuality: 'full', reduceMotion: true };
  // Restored paused scenes initialize visibility directly; active-play fade-in is tested elsewhere.
  game.paused = true; game.pauseStarted = now;
  resetCloseViewCamera();
  game.enemies = [];
  render(screen, game, 390, 844, now);
  const eye = closeViewCamera();
  const enemy = Object.assign(createCombatant('glassMite',
    (eye.x + game.player.x + .5) / 2 - .5,
    (eye.y + game.player.y + .75) / 2 - .82), { id: 'opacity-native' });
  game.enemies = [enemy];
  render(screen, game, 390, 844, now);
  const native = gl.uploads.at(-1);
  assert.ok(native?.length && closeViewGLStats.models >= 2);
  const alphas = Array.from(native).filter((_, i) => i % MODEL_FLOATS === 9);
  const visibility = Math.min(...alphas);
  assert.ok(visibility > .9 && visibility <= 1, 'near native body retains only the current transition fog; player stays opaque');
  enemy.phasing = true;
  render(screen, game, 390, 844, now + 16);
  assert.ok(Array.from(gl.uploads.at(-1)).some((a, i) => i % MODEL_FLOATS === 9 && Math.abs(a - visibility * .45) < 1e-6), 'native intrinsic phase survives');
  enemy.phasing = false;
  enemy.affixes = ['future-affix'];
  render(screen, game, 390, 844, now + 32);
  assert.equal(closeViewGLStats.models, 1, 'unsupported effect forces the actual sprite fallback');
  const boardAlphas = Array.from(GLB.board.subarray(0, GLB.nBoard * BOARD_FLOATS)).filter((_, i) => i % BOARD_FLOATS === 5);
  assert.ok(boardAlphas.length && boardAlphas.every(a => Math.abs(a - visibility) < 1e-6), 'fallback receives the same solid visibility');
  game.paused = true; game.pauseStarted = now + 32;
  const snapshot = JSON.stringify(game.enemies);
  render(screen, game, 390, 844, now + 500);
  assert.deepEqual(Array.from(GLB.board.subarray(0, GLB.nBoard * BOARD_FLOATS)).filter((_, i) => i % BOARD_FLOATS === 5), boardAlphas);
  assert.equal(JSON.stringify(game.enemies), snapshot, 'opacity does not mutate actors while paused');
}));


test('Stillworks submits the native Walker body, then falls back for an unsupported attack', () => withGPU(({ screen }) => {
  const now = 100000;
  const { game, stillworksProbes } = createLabFixture({ lab: 'close-view', scenario: 'stillworks-void-walker', now });
  const walker = game.enemies.find(e => e.pentFinaleBeast === 'voidWalker');
  const at = stillworksProbes.find(q => q.id === 'stillworks-exposed');
  Object.assign(game.player, { x: at.x, y: at.y });
  game.presentation = { effectiveQuality: 'full', reduceMotion: true };
  game.paused = true; game.pauseStarted = now;
  game.enemies = [];
  render(screen, game, 390, 844, now);
  const eye = closeViewCamera();
  Object.assign(walker, { x: (eye.x + at.x + .5) / 2 - .5, y: (eye.y + at.y + .75) / 2 - .82 });
  game.enemies = [walker];
  render(screen, game, 390, 844, now);
  assert.equal(closeViewGLStats.models, 2);
  Object.assign(walker.pack, { attack: 'voidHand', phase: 'windup', seq: 1, t: .13, data: { aim: { x: 0, y: 1 } } });
  render(screen, game, 390, 844, now + 16);
  assert.equal(closeViewGLStats.models, 2);
  walker.pack.attack = 'voidClaw';
  render(screen, game, 390, 844, now + 32);
  assert.equal(closeViewGLStats.models, 1);
  assert.equal(closeViewGLStats.modelFallbacks['walker-rig-fallback'], 1);
  assert.ok(GLB.nBoard > 0);
}));

test('retained native death completes without changing actor state or admission budgets', () => withGPU(({ screen }) => {
  const now = 200000;
  const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now });
  game.presentation = { effectiveQuality: 'low', reduceMotion: true };
  game.paused = true; game.pauseStarted = now;
  const enemy = Object.assign(createCombatant('glassMite', game.player.x + .5, game.player.y + .5), { id: 'opacity-death' });
  game.enemies = [enemy]; resetCloseViewCamera();
  render(screen, game, 390, 844, now);
  assert.equal(closeViewGLStats.models, 2);
  enemy.dead = true; enemy.hp = 0;
  const snapshot = JSON.stringify(enemy);
  game.paused = false;
  render(screen, game, 390, 844, now + 16);
  assert.equal(closeViewGLStats.models, 2, 'retained death body is still submitted');
  render(screen, game, 390, 844, now + 500);
  assert.equal(closeViewGLStats.models, 1, 'death body expires through its existing bounded track');
  assert.equal(JSON.stringify(enemy), snapshot, 'death rendering cannot mutate simulation');
}));
