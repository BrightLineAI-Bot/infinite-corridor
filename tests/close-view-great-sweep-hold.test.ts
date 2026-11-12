// Tim, 2026-11-12 (Close View): "he takes the Great Sweep out and does a full sweeping animation when you attack
// with it... and then he just keeps holding the Great Sweep until you attack with something else"; the same day:
// "when he uses the tool in its standard form it should be a 360° sweep around you", and Mirage of Blades blades
// should be "rendered projectiles that travel through the air". Presentation only throughout.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { BRAWLER } from '../src/brawler-spells.ts';
import { TOOL_ACTION_TIMING, TOOL_USE_STARTUP_MS, heldToolKind } from '../src/action-motion.ts';
import { closeViewPlayerAction } from '../src/close-view.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { CLOSE_VIEW_GREAT_SWEEP, sampleGreatSweep, closeViewHandRoles } from '../src/close-view-player-presentation.ts';
import { MIRAGE, MIRAGE_BLADE_VIEW, mirageBladePresentation, drawToolForms } from '../src/tool-forms.ts';
import { writeCloseViewModel, modelTriangleCount, MODEL_FLOATS } from '../src/close-view-models.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const SWEEP = { id: 'secondary-great-sweep', name: 'Great Sweep', slot: 'secondary', power: 5, property: 'brawler' };
const T = TOOL_ACTION_TIMING['great-sweep'], STARTUP = TOOL_USE_STARTUP_MS['great-sweep'];
const BLADE = (2.38 - .79) * .82; // the drawn blade past the grip, in hero sockets (writeCloseViewHeroGear)

function input(moveX = 0, press = null) { let pressed = press; return { state: { x: moveX, y: 0 }, consume: (k) => { if (k === pressed) { pressed = null; return true; } return false; }, held: () => false }; }
function arena(passives = []) {
  const s = freshSave(); s.seed = 'GREAT-SWEEP-HOLD'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = passives.map((id) => `field:${id}`);
  s.equipment.secondary = passives.length ? normalizeItemUpgrade({ id: 't', slot: 'secondary', property: 'impact', tier: 'relic', affixes: [], power: 5, name: 'Great Sweep' }) : structuredClone(SWEEP);
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = []; g.projectiles = [];
  return { s, g };
}
const run = (g, ms, t0, inp = () => input()) => { let t = t0; for (let i = 0; i < ms / 50; i++) { t += 50; g.update(.05, inp(i), t); } return t; };
function heroAt(ms, extra = {}) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  const toolUse = ms < STARTUP ? { v: 1, id: 'gs', startupMs: STARTUP, phase: 'startup' } : { v: 1, id: 'gs', startupMs: STARTUP, phase: 'released', releaseOffsetMs: STARTUP };
  const action = { kind: 'melee', profile: 'great-sweep', toolKind: 'great-sweep', toolMotion: { v: 1, entry: [0, 0, 0, 0, 0], direction: 1, baseKind: 'salvage-blade' }, toolUse, durationMs: T.durationMs, phase: ms / T.durationMs, yaw: 0 };
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 5000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: 'great-sweep', heldTool: 'great-sweep', action, alpha: 1, tint: [1, 1, 1], hitFlash: 0, ...extra }, frame));
  return { state, frame };
}
function tip(frame) { const m = frame[closeViewHandRoles('great-sweep').grip], ax = Math.hypot(m[0], m[1], m[2]); return [0, 1, 2].map((k) => m[12 + k] + m[k] / ax * BLADE); }

test('after a use the Great Sweep stays held through walking for seconds, on an exact resume too', () => {
  const { g } = arena();
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true);
  assert.equal(heldToolKind(g.player), 'great-sweep');
  let t = run(g, 5000, 1000, (i) => input(i % 40 < 20 ? 1 : -1)); // five seconds walking back and forth
  assert.equal(closeViewPlayerAction(g, t).active, false, 'the use itself is long over');
  assert.equal(heldToolKind(g.player), 'great-sweep', 'still drawn after 5 s of movement');
  g.jumpUntil = t + 300; t = run(g, 400, t); assert.equal(heldToolKind(g.player), 'great-sweep', 'a jump keeps it');
  g.setPaused(true, t); const back = new Game(migrateSave(structuredClone(g.exportSnapshot(t))), t + 50000);
  assert.equal(heldToolKind(back.player), 'great-sweep', 'exact resume keeps it drawn');
  // The additive flag lives on the saved attack record only; a record without it loads as not held.
  const plain = migrateSave(structuredClone(g.exportSnapshot(t))); delete plain.session.playerRuntime.attackVisual.heldTool;
  assert.equal(heldToolKind(new Game(plain, t + 50000).player), null);
});

test('the carry is a real held pose while walking, running, dodging and jumping', () => {
  const grip = closeViewHandRoles('great-sweep').grip;
  for (const [speed, action] of [[0, null], [1.6, null], [3.6, null], [2.4, { kind: 'dodge', profile: '', phase: .4, durationMs: 260, yaw: 0, moveX: 1, moveY: 0, poseMs: 1000 }], [0, { kind: 'jump', profile: '', phase: .5, durationMs: 420, yaw: 0 }]]) {
    const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
    assert.ok(sampleCloseViewHero(asset, state, { nowMs: 3000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed, gaitPhase: 2.1, heldProfile: 'great-sweep', heldTool: 'great-sweep', action, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, frame));
    assert.ok(state.primaryGripResidual < .02, `the hand reaches the carry (${speed}, ${action?.kind})`);
    assert.ok(frame.positionsNormals.every(Number.isFinite) && frame[grip].every(Number.isFinite));
    const p = tip(frame); assert.ok(p[2] > .05, 'the blade tip stays above the floor');
  }
});

test('using another weapon, tool, spell or a drink puts it away', () => {
  { const { g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }); const t = run(g, 1500, 1000);
    g.update(.05, input(0, 'attack'), t + 50); assert.notEqual(g.player.attackVisual?.toolKind, 'great-sweep'); assert.equal(heldToolKind(g.player), null, 'the primary weapon replaces it'); }
  { const { g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }); const t = run(g, 1500, 1000);
    g.save.equipment.secondary = { id: 'secondary-rift-bombard', name: 'Rift Bombard', slot: 'secondary', power: 5, property: 'blast' };
    g.update(.05, input(), t + 50); assert.equal(heldToolKind(g.player), null, 'another tool in the slot'); }
  { const { g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }); const t = run(g, 1500, 1000);
    g.player.castUntil = t + 400; g.update(.05, input(), t + 50); assert.equal(heldToolKind(g.player), null, 'a spell'); }
  { const { g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }); const t = run(g, 1500, 1000);
    g.stampConsumeVisual('healing', t + 10); assert.equal(heldToolKind(g.player), null, 'a drink'); }
  { const { g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }); let t = run(g, 1500, 1000);
    assert.equal(g.fireSecondary(t, { x: 1, y: 0 }), true); assert.equal(heldToolKind(g.player), 'great-sweep', 'a second sweep keeps it');
    t = run(g, 1500, t); assert.equal(heldToolKind(g.player), 'great-sweep'); }
});

test('the sweep timing follows the accepted action table and the hit effect', () => {
  const S = CLOSE_VIEW_GREAT_SWEEP, q = sampleGreatSweep(0);
  assert.equal(S.swingMs, BRAWLER['great-sweep'].lifetime * 1000, 'the turn lasts as long as the hit effect');
  assert.equal(q.startupMs, STARTUP); assert.equal(q.swingEndMs, STARTUP + S.swingMs); assert.equal(q.durationMs, T.durationMs);
  assert.ok(q.followEndMs < T.durationMs);
  assert.equal(sampleGreatSweep(0).weight, 0); assert.equal(sampleGreatSweep(T.durationMs).weight, 0, 'back to the carry at the end of the action');
  assert.equal(sampleGreatSweep(STARTUP - 1).phase, 'windup'); assert.equal(sampleGreatSweep(STARTUP + 1).phase, 'swing'); assert.equal(sampleGreatSweep(STARTUP + S.swingMs + 1).phase, 'follow-through');
  assert.equal(sampleGreatSweep(T.durationMs - 1).phase, 'recovery');
  // A shorter accepted startup (cooldown glyphs) releases the turn at that startup.
  assert.equal(sampleGreatSweep(0, 80).swingEndMs, 80 + S.swingMs);
  // Through the turn the heading round the body never goes back, and spans a full turn.
  let last = -Infinity; for (let ms = STARTUP; ms <= STARTUP + S.swingMs; ms += 5) { const v = sampleGreatSweep(ms).sweep; assert.ok(v >= last - 1e-9); last = v; }
  assert.ok(sampleGreatSweep(STARTUP + S.swingMs).sweep - sampleGreatSweep(STARTUP).sweep >= 2 * Math.PI - 1e-9);
});

test('the blade tip traces one wide continuous turn round the Wayfarer, no wrist spin and no NaN', () => {
  const heads = [], heights = [];
  let unwrapped = null, prev = null, maxStep = 0;
  for (let ms = 0; ms <= T.durationMs; ms += 10) {
    const { frame } = heroAt(ms), p = tip(frame), m = frame[closeViewHandRoles('great-sweep').grip];
    assert.ok(p.every(Number.isFinite) && frame.positionsNormals.every(Number.isFinite), `finite at ${ms}`);
    const a = Math.atan2(p[1], p[0]);
    if (prev === null) unwrapped = a; else { let d = a - prev; d = Math.atan2(Math.sin(d), Math.cos(d)); unwrapped += d; if (ms > STARTUP && ms <= STARTUP + CLOSE_VIEW_GREAT_SWEEP.swingMs) { maxStep = Math.max(maxStep, Math.abs(d)); assert.ok(d > -.02, `the tip only moves one way round (${ms} ms)`); } }
    prev = a; heads.push([ms, unwrapped]); heights.push(p[2]);
    if (ms > STARTUP && ms <= STARTUP + CLOSE_VIEW_GREAT_SWEEP.swingMs) {
      // The flat stays level through the turn: the blade's width (socket Z) keeps near horizontal.
      const ez = m[10] / Math.hypot(m[8], m[9], m[10]); assert.ok(Math.abs(ez) < .35, `no wrist roll at ${ms} ms (${ez})`);
      const r = Math.hypot(p[0], p[1]); assert.ok(r > 1, `wide: the tip is ${r.toFixed(2)} out at ${ms} ms`);
    }
  }
  const at = (ms) => heads.find(([t]) => t === ms)[1];
  const turn = at(STARTUP + CLOSE_VIEW_GREAT_SWEEP.swingMs) - at(STARTUP);
  assert.ok(turn >= 2 * Math.PI - .2, `one full turn of the blade (${(turn * 180 / Math.PI).toFixed(0)} deg)`);
  assert.ok(turn < 2 * Math.PI + 1.2, 'not a flail of several turns');
  assert.ok(maxStep < 1.2, `no snap between 10 ms frames (${maxStep.toFixed(2)} rad)`);
  assert.ok(Math.min(...heights) > .05, 'the tip never cuts into the floor');
  // Carry at both ends, the same pose.
  assert.deepEqual(Array.from(heroAt(0).frame.positionsNormals), Array.from(heroAt(T.durationMs).frame.positionsNormals));
});

test('Mirage of Blades: Close View blades fly through the air on the gameplay path, bounded', () => {
  const { g } = arena(['nanoknives']);
  const foe = Object.assign(createCombatant('rootBrute', 13, 10), { id: 'f', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99, speed: 0, aggro: false }); g.enemies = [foe];
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
  const captured = [], capture = { now: 0, captureActor: (spec) => { captured.push(spec); return true; } };
  let t = 1000, maxSeen = 0;
  for (let i = 0; i < 60; i++) {
    if (i % 4 === 0) g.fireSecondary(t, { x: 1, y: 0 }); // presses far faster than the cooldown allows
    t += 50; g.update(.05, input(), t);
    captured.length = 0; drawToolForms(ctx, g, (q) => [q.x * 32, q.y * 32], 32, t / 1000, capture);
    const live = g.projectiles.filter((p) => p.mirage && !p.dead);
    assert.equal(captured.length, live.length, 'each live blade is one 3D blade');
    maxSeen = Math.max(maxSeen, captured.length); assert.ok(captured.length <= MIRAGE.max, 'never more than the gameplay cap');
    for (const spec of captured) {
      const p = spec.source, a = spec.sample(t);
      assert.equal(a.kind, 'mirageBlade'); assert.equal(a.x, p.x); assert.equal(a.y, p.y); assert.ok(Number.isFinite(a.yaw));
      assert.ok(a.lift >= .6 && spec.lift === a.lift, 'at chest height, above the floor');
    }
  }
  assert.ok(maxSeen >= 1);
  assert.ok(foe.hp < 50000, 'gameplay unchanged: the blades still cut');
  // The baked blade is small and sits wholly above the floor at its flying height.
  assert.ok(modelTriangleCount('mirageBlade') > 0 && modelTriangleCount('mirageBlade') <= 64);
  const a = mirageBladePresentation({ mirage: true, x: 4, y: 5, age: .3 }), out = new Float32Array(256 * 3 * MODEL_FLOATS);
  const end = writeCloseViewModel(out, 0, { ...a, z: a.lift, reduceMotion: false, alpha: 1 });
  assert.equal(end / MODEL_FLOATS / 3, modelTriangleCount('mirageBlade'));
  for (let i = 0; i < end; i += MODEL_FLOATS) { assert.ok(out[i + 2] > MIRAGE_BLADE_VIEW.lift - .1, 'above the floor'); assert.ok(Math.hypot(out[i] - 4, out[i + 1] - 5) < 1); }
  assert.equal(mirageBladePresentation({ mirage: true, dead: true, x: 1, y: 1 }), null);
  // The standard view keeps its own spinning rotor sprite (no capture).
  captured.length = 0; drawToolForms(ctx, g, (q) => [q.x * 32, q.y * 32], 32, t / 1000, null); assert.equal(captured.length, 0);
});
