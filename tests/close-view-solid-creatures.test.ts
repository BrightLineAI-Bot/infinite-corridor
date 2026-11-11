// Solid creatures in Close View (Tim, 2026-11-11: "the monsters are still pretty ephemeral and spectral... a little bit
// see-through. Make them firm and concrete, so they come into view easily and stay in view"). The opacity contract: every
// creature is fully opaque inside the view range, from its first frame; only the last CLOSE_VIEW.creatures.edge tiles before
// the fog's far end thin it out; only a spectral kind (its presentation profile's design flag) or a designed state (phasing,
// a departing fade) is drawn below full opacity, and the GPU gives those a rim light so they still read.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { ACTOR_PRESENTATION } from '../src/actor-presentation.ts';
import { render } from '../src/renderer.ts';
import { MODEL_FLOATS } from '../src/close-view-models.ts';
import { GLB, BOARD_FLOATS, closeViewGLStats, resetCloseViewGL, CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { CLOSE_VIEW, closeViewCreatureFog, closeViewCreatureIntrinsicAlpha, closeViewActorEnvironmentAlpha, closeViewCamera, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';

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
const modelAlphas = (upload) => Array.from(upload || []).filter((_, i) => i % MODEL_FLOATS === 9);

test('the opacity fog: none inside the view range for every place, a short crisp edge at its far end', () => {
  const E = CLOSE_VIEW.creatures.edge; assert.ok(E > 0 && E <= 2, 'a short edge band');
  const fogs = [[CLOSE_VIEW.fog.near, CLOSE_VIEW.fog.far], ...Object.values(CLOSE_VIEW.themes).filter(t => t?.fog).map(t => [t.fog.near, t.fog.far])];
  for (const [near, far] of fogs) {
    for (let d = 0; d <= far - E + 1e-9; d += .25) assert.equal(closeViewCreatureFog(d, near, far), 0, `solid at ${d} of ${far}`);
    assert.ok(far - E >= 8.9, `no fade under ${far - E} tiles of camera depth`);
    let last = 0; for (let d = far - E; d <= far + 1; d += .1) { const f = closeViewCreatureFog(d, near, far); assert.ok(f >= last - 1e-12 && f <= 1); last = f; }
    assert.equal(closeViewCreatureFog(far, near, far), 1);
  }
  // A short fog (a narrow place) never starts thinning before its near edge.
  assert.equal(closeViewCreatureFog(2.5, 3, 4), 0);
  // The environment alpha of a creature is exactly 1 - that share, whatever the light or the camera line.
  const enemy = createCombatant('ashling', 0, 0);
  for (const lit of [0, .3, 1]) for (const fg of [false, true]) assert.equal(closeViewActorEnvironmentAlpha({ enemy }, lit, closeViewCreatureFog(6, 3.2, 12), fg), 1);
});

test('designed opacity per kind: every creature is solid unless its profile flags it spectral', () => {
  const spectral = Object.entries(ACTOR_PRESENTATION).filter(([, p]) => p.spectral).map(([k]) => k).sort();
  assert.deepEqual(spectral, ['gloomgorge', 'gloomwisp', 'lumenWraith']);
  assert.ok(CLOSE_VIEW.creatures.spectralAlpha >= .7 && CLOSE_VIEW.creatures.spectralAlpha < 1, 'ghostly, still readable');
  for (const kind of Object.keys(ACTOR_PRESENTATION)) {
    const { game } = createLabFixture({ lab: 'creature-assets', scenario: kind, now: 1000 });
    const e = game.enemies.find(q => q.kind === kind) || Object.assign(createCombatant(kind, 0, 0), { kind });
    const a = closeViewCreatureIntrinsicAlpha(e);
    if (ACTOR_PRESENTATION[kind].spectral) assert.equal(a, CLOSE_VIEW.creatures.spectralAlpha, kind); else assert.equal(a, 1, kind);
  }
  for (const kind of ['ashling', 'glassMite', 'veilMoth', 'cinderWisp', 'sparkWarden']) assert.equal(closeViewCreatureIntrinsicAlpha(createCombatant(kind, 0, 0)), 1, kind);
  const phased = Object.assign(createCombatant('veilMoth', 0, 0), { phasing: true });
  assert.equal(closeViewCreatureIntrinsicAlpha(phased), .45, 'a designed phase keeps its opacity');
  assert.equal(closeViewCreatureIntrinsicAlpha(null), 1);
});

function lane(scenario = 'terrain-ramps', now = 100000) {
  const { game } = createLabFixture({ lab: 'close-view', scenario, now });
  game.presentation = { effectiveQuality: 'full', reduceMotion: true };
  return game;
}
// A creature `d` tiles ahead of the camera's eye along its view (camera depth about d), on the Wayfarer's level.
function ahead(game, kind, d, id) {
  const eye = closeViewCamera(), fx = Math.cos(eye.yaw), fy = Math.sin(eye.yaw);
  return Object.assign(createCombatant(kind, eye.x + fx * d - .5, eye.y + fy * d - .82), { id });
}

test('active play: a native creature is wholly opaque from its first frame at every distance inside the view', () => withGPU(({ gl, screen }) => {
  const game = lane(); let now = 100000; game.paused = false;
  resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  for (const d of [1.6, 2.5, 3.5, 5, 6.5, 8]) {
    game.enemies = [ahead(game, 'glassMite', d, `solid-${d}`)];
    render(screen, game, 390, 844, now += 16);
    const alphas = modelAlphas(gl.uploads.at(-1));
    assert.ok(closeViewGLStats.models >= 2, `native body admitted at ${d}`);
    assert.ok(alphas.length && alphas.every(a => a === 1), `opaque on its first frame at ${d} tiles (min ${Math.min(...alphas)})`);
  }
}));

test('active play: the sprite fallback is just as solid, and only leaving the view thins a creature', () => withGPU(({ screen }) => {
  const game = lane(); let now = 100000; game.paused = false;
  resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  const boardAlpha = () => Array.from(GLB.board.subarray(0, GLB.nBoard * BOARD_FLOATS)).filter((_, i) => i % BOARD_FLOATS === 5);
  for (const d of [2, 4, 6, 8]) {
    const e = ahead(game, 'glassMite', d, `card-${d}`); e.affixes = ['future-affix']; game.enemies = [e];
    render(screen, game, 390, 844, now += 16);
    const a = boardAlpha(); assert.ok(a.length && a.every(v => v === 1), `card opaque at ${d} (${a})`);
  }
}));

test('spectral kinds and designed phases stay ghostly but lit; the shader rim and late fog are in the model program', () => withGPU(({ gl, screen }) => {
  const game = lane(); let now = 100000; game.paused = false;
  resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  game.enemies = [ahead(game, 'veilMoth', 3, 'phase')]; game.enemies[0].phasing = true;
  render(screen, game, 390, 844, now += 16);
  const ph = modelAlphas(gl.uploads.at(-1)); assert.ok(ph.some(a => Math.abs(a - .45) < 1e-6), 'phase opacity survives');
  const src = gl.sources.find(t => t.includes('in float v_alpha') && t.includes('outColor'));
  assert.ok(src.includes('float ghost') && src.includes('float late'), 'model shader has the ghost rim and the late creature fog');
  assert.ok(CLOSE_VIEW_ACTOR_LOOK.fogLate > 0 && CLOSE_VIEW_ACTOR_LOOK.spectralGlow > 0);
}));

test('a paused frame changes no creature opacity and mutates nothing', () => withGPU(({ gl, screen }) => {
  const game = lane(); const now = 100000; resetCloseViewCamera(); game.enemies = []; render(screen, game, 390, 844, now);
  game.enemies = [ahead(game, 'glassMite', 4, 'still')]; game.paused = true; game.pauseStarted = now;
  const snap = JSON.stringify(game.enemies);
  render(screen, game, 390, 844, now); const a = modelAlphas(gl.uploads.at(-1));
  render(screen, game, 390, 844, now + 400); const b = modelAlphas(gl.uploads.at(-1));
  assert.deepEqual(a, b); assert.ok(a.every(v => v === 1)); assert.equal(JSON.stringify(game.enemies), snap);
}));
