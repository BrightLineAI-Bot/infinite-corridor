import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_MOTION, ATTACK_VISUAL_PROFILES, normalizeAttackVisual, stampAttackVisual } from '../src/action-motion.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';
import { closeViewPlayerAction, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { GLB, DECAL_FLOATS, closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';

test('attack visuals validate, clone and stamp without touching gameplay clocks', () => {
  const raw = { profile: 'future-safe-profile', durationMs: 420, canary: 17, aim: { x: 3, y: 4, nestedCanary: 23 } };
  const copy = normalizeAttackVisual(raw, 419.9999995);
  assert.notEqual(copy, raw); assert.notEqual(copy.aim, raw.aim);
  assert.deepEqual(copy, raw, 'safe future profiles and unknown fields survive');
  for (const bad of [null, {}, { profile: '', durationMs: 20 }, { profile: '../bad', durationMs: 20 },
    { profile: 'melee', durationMs: 0 }, { profile: 'melee', durationMs: 5001 },
    { profile: 'melee', durationMs: 20, aim: { x: 0, y: 0 } }, { profile: 'melee', durationMs: 20, aim: { x: NaN, y: 1 } }])
    assert.equal(normalizeAttackVisual(bad), null);
  assert.equal(normalizeAttackVisual(raw, 421), null, 'an impossible restored remainder is rejected');

  const player = { attackUntil: 900, meleeUntil: 800, target: { id: 'keep' } };
  const stamped = stampAttackVisual(player, 'hammer', 360, { dx: 3, dy: 4 });
  assert.deepEqual(stamped.aim, { x: .6, y: .8 });
  assert.equal(player.attackUntil, 900); assert.equal(player.meleeUntil, 800); assert.deepEqual(player.target, { id: 'keep' });
});

test('latched profiles suppress stale melee fallback and every native mesh stays finite within 256 triangles', () => {
  const g = { player: { attackUntil: 1200, meleeUntil: 1400, attackVisual: { profile: 'emitter', durationMs: 300, aim: { x: 1, y: 0 } } } };
  assert.equal(closeViewPlayerAction(g, 1000).profile, 'emitter');
  assert.equal(closeViewPlayerAction(g, 1250).active, false, 'expired metadata does not resurrect the still-active melee clock');
  g.player.attackVisual = null;
  assert.equal(closeViewPlayerAction(g, 1000).legacy, true, 'a normalized legacy null record uses the old mid-attack heuristic');
  delete g.player.attackVisual;
  assert.equal(closeViewPlayerAction(g, 1000).legacy, true, 'an absent record also uses the legacy heuristic');
  g.player.attackVisual = { profile: 'future-safe-profile', durationMs: 300 };
  assert.equal(closeViewPlayerAction(g, 1000).profile, 'future-safe-profile', 'future profiles remain active for neutral rendering');

  const kinds = ['player', 'playerTool', 'playerUnarmed', 'playerHammer', 'playerSweep', 'playerMirage', 'playerOrrery'];
  assert.deepEqual(ATTACK_VISUAL_PROFILES, ['melee', 'fist', 'emitter', 'hammer', 'sweep', 'mirage', 'orrery-tap', 'orrery-release']);
  for (const kind of kinds) for (const pose of ['idle', 'attack', 'tool', 'cast', 'knockdown']) for (const amount of [0, .5, 1]) {
    const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
    const end = writeCloseViewModel(out, 0, { kind, x: 1, y: 2, z: 3, yaw: .4, phase: 1, pace: .7, pose, amount, turn: .2, reduceMotion: false });
    assert.ok(end > 0 && end / MODEL_FLOATS / 3 <= 256, `${kind}/${pose}: ${end / MODEL_FLOATS / 3} triangles`);
    for (let i = 0; i < end; i++) assert.ok(Number.isFinite(out[i]), `${kind}/${pose}/${i}`);
  }
});

const noopContext = () => new Proxy({
  canvas: null,
  measureText: () => ({ width: 10 }),
  getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
}, { get: (object, key) => key in object ? object[key] : () => {}, set: (object, key, value) => { object[key] = value; return true; } });

class MockWebGL2RenderingContext {
  uploads = [];
  constructor() { let constant = 1; const constants = new Map(); return new Proxy(this, { get: (object, key) => {
    if (key in object) return object[key];
    if (typeof key === 'string' && /^[A-Z][A-Z0-9_]+$/.test(key)) { if (!constants.has(key)) constants.set(key, constant++); return constants.get(key); }
    return () => {};
  } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return {}; } createBuffer() { return {}; }
  createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; }
  getProgramParameter(program, parameter) { return parameter === this.ACTIVE_UNIFORMS || parameter === this.ACTIVE_ATTRIBUTES ? 0 : true; }
  getExtension() { return null; }
  bufferData(target, data) { if (data instanceof Float32Array && data.length > 1000) this.uploads.push(Float32Array.from(data)); }
}

const meanColor = (vertices, channel) => { let sum = 0, n = 0; for (let i = 6 + channel; i < vertices.length; i += MODEL_FLOATS) { sum += vertices[i]; n++; } return sum / n; };
const modelUpload = (gl) => gl.uploads.filter((a) => a.length % MODEL_FLOATS === 0 && a.length <= MODEL_MAX_VERTICES * MODEL_FLOATS).at(-1);
const flameVertices = () => { let n = 0; for (let i = 0; i < GLB.nDecal; i++) if (GLB.decal[i * DECAL_FLOATS + 5] === 3) n++; return n; };

test('the real GPU renderer keeps native stun, poison and a bounded frozen fire batch', () => {
  const previous = globalThis.WebGL2RenderingContext; globalThis.WebGL2RenderingContext = MockWebGL2RenderingContext;
  const gl = new MockWebGL2RenderingContext(), screen = noopContext();
  const canvas = { width: 390, height: 844, addEventListener() {}, getContext: (kind) => kind === 'webgl2' ? gl : noopContext() };
  screen.canvas = canvas; setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try {
    const { game } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', now: 100000 });
    game.enemies = []; game.presentation = { effectiveQuality: 'full', reduceMotion: true }; resetCloseViewCamera();
    let now = 100000; for (let i = 0; i < 4; i++) render(screen, game, 390, 844, now += 16);
    const plain = modelUpload(gl); assert.ok(plain && closeViewGLStats.models === 1, 'the player used the native GPU model');
    const baseFlames = flameVertices();

    game.save.elites ||= {}; game.save.elites.status ||= {}; game.save.elites.status.poison = 1;
    render(screen, game, 390, 844, now += 16); const poisoned = modelUpload(gl);
    assert.ok(meanColor(poisoned, 1) > meanColor(plain, 1), 'poison tints native vertices green');

    game.player.stunnedAt = now; game.player.stunnedUntil = now + 1000;
    render(screen, game, 390, 844, now += 500); const knocked = modelUpload(gl);
    const zSpan = (a) => { let lo = Infinity, hi = -Infinity; for (let i = 2; i < a.length; i += MODEL_FLOATS) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); } return hi - lo; };
    assert.ok(zSpan(knocked) < zSpan(poisoned) * .75, 'stun lays the native body down instead of swapping to a sprite');

    game.playerFire = { left: 1 }; render(screen, game, 390, 844, now += 16);
    assert.equal(flameVertices() - baseFlames, 18, 'three six-vertex flame cards share the existing additive batch');
    const frozen = [];
    for (let i = GLB.nGlowStart; i < GLB.nDecal; i++) if (GLB.decal[i * DECAL_FLOATS + 5] === 3) frozen.push(...GLB.decal.slice(i * DECAL_FLOATS, (i + 1) * DECAL_FLOATS));
    render(screen, game, 390, 844, now += 160);
    const later = [];
    for (let i = GLB.nGlowStart; i < GLB.nDecal; i++) if (GLB.decal[i * DECAL_FLOATS + 5] === 3) later.push(...GLB.decal.slice(i * DECAL_FLOATS, (i + 1) * DECAL_FLOATS));
    assert.deepEqual(later.slice(0, frozen.length), frozen, 'reduced motion freezes native body-fire wobble');
  } finally {
    CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null);
    if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous;
  }
});
