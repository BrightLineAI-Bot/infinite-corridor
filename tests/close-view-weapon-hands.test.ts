import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CLOSE_VIEW_HELD_GEAR, CLOSE_VIEW_RIFLE_GRIP, closeViewHandRoles, closeViewHeldHand, closeViewHeldScale, cleaverHandRoles } from '../src/close-view-player-presentation.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewHeroGear, writeCloseViewModel, closeViewHeldMuzzlePoint, closeViewHeldMuzzleLocal, closeViewToolEmissionPoint } from '../src/close-view-models.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { TOOL_ACTION_TIMING, TOOL_USE_STARTUP_MS } from '../src/action-motion.ts';
import { CLOSE_VIEW_SHOT_MUZZLE, closeViewMuzzleShot, closeViewMuzzleWeight, closeViewMuzzleOffset } from '../src/close-view.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
const SWORDS = ['melee', 'salvage-blade', 'verge-cleaver', 'cinder-pike', 'great-sweep', 'mirage'];
const FIRING = ['rift-bombard', 'blunderbuss', 'lumen-spindle', 'spark-coil', 'needle-caster', 'emitter'];

test('every sword is held in the displayed left hand; guns and tools in the displayed right', () => {
  for (const p of SWORDS) {
    assert.equal(closeViewHeldHand(p), 'left', p);
    // Source-right (rightSocket) is the displayed anatomical left in the Close View projection.
    assert.deepEqual(closeViewHandRoles(p), { grip: 'rightSocket', free: 'leftSocket' }, p);
  }
  for (const p of [...FIRING, 'hammer', 'orrery-tap', 'orrery-release']) {
    assert.equal(closeViewHeldHand(p), 'right', p);
    assert.deepEqual(closeViewHandRoles(p), { grip: 'leftSocket', free: 'rightSocket' }, p);
  }
  // The Verge Cleaver no longer changes hands with its combo stage.
  for (const stage of [null, { kind: 'cleaver-four', step: 2 }, { kind: 'cleaver-three', step: 1 }, { kind: 'legacy', step: 1 }])
    assert.equal(cleaverHandRoles('verge-cleaver', stage).grip, 'rightSocket');
  assert.equal(closeViewHeldHand('future-tool'), 'left');
  assert.equal(closeViewHeldHand('constructor'), 'left');
});

test('the held-gear table shrinks tools a little and leaves swords at full size', () => {
  for (const p of SWORDS) assert.equal(closeViewHeldScale(p), 1, p);
  for (const p of FIRING) { const k = closeViewHeldScale(p); assert.ok(k >= .7 && k < 1, `${p} ${k}`); }
  assert.ok(Object.isFrozen(CLOSE_VIEW_HELD_GEAR) && Object.values(CLOSE_VIEW_HELD_GEAR).every(Object.isFrozen));
  assert.deepEqual(Object.keys(CLOSE_VIEW_RIFLE_GRIP).sort(), ['blunderbuss', 'rift-bombard']);
  for (const p of Object.keys(CLOSE_VIEW_RIFLE_GRIP)) assert.equal(CLOSE_VIEW_HELD_GEAR[p].grip, 'rifle');
  for (const p of ['needle-caster', 'spark-coil', 'lumen-spindle']) assert.equal(CLOSE_VIEW_HELD_GEAR[p].grip, 'one', `${p} stays one-handed`);
  // A drawn bombard spans exactly the scaled recipe: muzzle (1.585) minus grip (.79) at .82 x scale.
  const out = new Float32Array(160 * 3 * MODEL_FLOATS), end = writeCloseViewHeroGear(out, 0, { profile: 'rift-bombard', rightSocket: identity, leftSocket: identity });
  let reach = -Infinity; for (let i = 0; i < end; i += MODEL_FLOATS) reach = Math.max(reach, out[i]);
  assert.ok(Math.abs(reach - (1.585 - .79) * .82 * closeViewHeldScale('rift-bombard')) < 1e-5, String(reach));
});

test('each firing tool muzzle lies at the tip of its drawn mesh', () => {
  for (const p of FIRING) {
    const out = new Float32Array(160 * 3 * MODEL_FLOATS), end = writeCloseViewHeroGear(out, 0, { profile: p, rightSocket: identity, leftSocket: identity });
    assert.ok(end > 0, p);
    const tip = closeViewHeldMuzzlePoint(new Float32Array(3), p, identity); assert.ok(tip, p);
    // The barrel axis is socket +X for every recipe except the generic emitter (socket -Y).
    const axis = p === 'emitter' ? 1 : 0, sign = p === 'emitter' ? -1 : 1;
    let far = -Infinity; for (let i = 0; i < end; i += MODEL_FLOATS) far = Math.max(far, sign * out[i + axis]);
    assert.ok(Math.abs(sign * tip[axis] - far) < .02, `${p}: muzzle ${sign * tip[axis]} vs mesh tip ${far}`);
    assert.ok(closeViewHeldMuzzleLocal(p));
  }
  // The accepted release flash keeps its phased-tool contract.
  assert.equal(closeViewToolEmissionPoint(new Float32Array(3), 'needle-caster', identity), null);
  assert.ok(closeViewToolEmissionPoint(new Float32Array(3), 'rift-bombard', identity));
});

function toolRecord(kind: string, elapsed: number) {
  const durationMs = TOOL_ACTION_TIMING[kind].durationMs, startupMs = TOOL_USE_STARTUP_MS[kind];
  return { profile: 'emitter', toolKind: kind, durationMs, toolMotion: { v: 1, entry: [0, 0, 0, 0, 0], direction: 1, baseKind: 'salvage-blade' },
    toolUse: elapsed < startupMs ? { v: 1, id: 't', startupMs, phase: 'startup' } : { v: 1, id: 't', startupMs, phase: 'released', releaseOffsetMs: startupMs } };
}
function hero(input: any) {
  const state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  assert.ok(sampleCloseViewHero(asset, state, { nowMs: 1000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, ...input }, frame));
  return { state, frame };
}
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('imported Wayfarer fires right-hand tools from the posed muzzle; rifles take a second hand under the barrel', () => {
  for (const kind of ['rift-bombard', 'blunderbuss', 'lumen-spindle']) {
    const r = toolRecord(kind, 260), { state, frame } = hero({ heldProfile: 'salvage-blade', handProfile: kind, action: { ...r, kind: 'ranged', profile: kind, phase: 260 / r.durationMs, yaw: 0 } });
    const grip = frame.leftSocket, muzzle = closeViewHeldMuzzlePoint(new Float32Array(3), kind, grip)!;
    // Facing +X: the right hand is on +Y; the raised muzzle is ahead of the grip and at chest height or above.
    assert.ok(grip[13] > 0, `${kind} is in the right hand`);
    assert.ok(muzzle[0] > grip[12] + .15, `${kind} muzzle points forward`);
    assert.ok(muzzle[2] > .8 && muzzle[2] < 1.45, `${kind} muzzle height ${muzzle[2]}`);
    const support = frame.rightSocket[12] > 0 && dist(frame.rightSocket.subarray(12, 15), grip.subarray(12, 15)) < .45;
    if (kind in CLOSE_VIEW_RIFLE_GRIP) { assert.equal(state.clip, 'derived-rifle-grip'); assert.ok(support, `${kind} support hand reaches the barrel`); }
    else assert.ok(!support, `${kind} stays one-handed`);
  }
  // Blunderbuss: raised to the shoulder line. Rift Bombard: two hands on it, low at the hip/waist, muzzle forward.
  const fire = (kind: string) => { const r = toolRecord(kind, 260); return hero({ heldProfile: 'salvage-blade', handProfile: kind, action: { ...r, kind: 'ranged', profile: kind, phase: 260 / r.durationMs, yaw: 0 } }).frame; };
  const bombard = fire('rift-bombard'), blunderbuss = fire('blunderbuss');
  const bombardMuzzle = closeViewHeldMuzzlePoint(new Float32Array(3), 'rift-bombard', bombard.leftSocket)!;
  assert.ok(bombard.leftSocket[14] < .92 && bombard.leftSocket[14] > .6, `bombard trigger hand at the hip/waist (${bombard.leftSocket[14]})`);
  assert.ok(Math.abs(bombardMuzzle[2] - bombard.leftSocket[14]) < .12, 'bombard barrel held level, muzzle forward');
  assert.ok(blunderbuss.leftSocket[14] - bombard.leftSocket[14] > .15, 'the Blunderbuss is shouldered higher than the low Bombard');
});

test('imported swords stay in the displayed left hand, including every Verge Cleaver cut', () => {
  const carry = hero({ heldProfile: 'verge-cleaver', handProfile: 'verge-cleaver', primaryCarryStage: { kind: 'cleaver-three', step: 1 } });
  assert.equal(carry.state.clip, 'derived-left-cleaver-four');
  assert.ok(carry.frame.rightSocket[13] < 0, 'cleaver carry is on the left (-Y)');
  for (const step of [1, 2, 3]) {
    const stage = { kind: 'cleaver-three', step }, meleeAction = { v: 2, kind: 'verge-cleaver', move: 'cleaver', contactMs: 75, durationMs: 260 };
    const { frame } = hero({ heldProfile: 'verge-cleaver', handProfile: 'verge-cleaver', primaryCarryStage: stage,
      action: { kind: 'melee', profile: 'verge-cleaver', phase: .3, durationMs: 260, yaw: 0, meleeAction, primaryStage: stage, primaryMotion: { v: 3, mode: 'quick', step }, poseMs: 900 } });
    assert.ok(frame.rightSocket[12] > .2, `cut ${step} swings the left-hand grip forward`);
    assert.ok(frame.leftSocket[12] < frame.rightSocket[12], `cut ${step}: the free right hand trails`);
    const out = new Float32Array(160 * 3 * MODEL_FLOATS);
    assert.ok(writeCloseViewHeroGear(out, 0, { profile: 'verge-cleaver', primaryStage: stage, leftSocket: frame.leftSocket, rightSocket: frame.rightSocket }) > 0);
  }
});

test('native fallback mirrors tools to the right hand, keeps the raised tool level and reports its muzzle', () => {
  const write = (actor: any) => { const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), muzzleOut = new Float32Array(4);
    const n = writeCloseViewModel(out, 0, { x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, amount: 0, reduceMotion: false, muzzleOut, ...actor }); assert.ok(n > 0); return { out: out.subarray(0, n), muzzleOut }; };
  const idle = write({ kind: 'playerTool', pose: 'idle' });
  assert.equal(idle.muzzleOut[3], 1); assert.ok(idle.muzzleOut[1] > 0, 'native tool on the right (+Y)');
  for (const kind of ['rift-bombard', 'lumen-spindle']) {
    const r = toolRecord(kind, 260), { out, muzzleOut } = write({ kind: 'playerTool', pose: 'tool', amount: 260 / r.durationMs, toolAction: r });
    assert.equal(muzzleOut[3], 1);
    let far = -Infinity; for (let i = 0; i < out.length; i += MODEL_FLOATS) far = Math.max(far, out[i]);
    assert.ok(Math.abs(muzzleOut[0] - far) < .03, `${kind}: muzzle at the forward tip (${muzzleOut[0]} vs ${far})`);
    assert.ok(muzzleOut[2] > .7 && muzzleOut[2] < 1.15, `${kind}: level at chest height (${muzzleOut[2]})`);
  }
  // Native Cleaver: every weapon vertex is on the left side.
  const blade = write({ kind: 'playerVergeCleaver', pose: 'idle', primaryStage: { kind: 'cleaver-three', step: 1 } });
  assert.equal(blade.muzzleOut[3], 0);
  const bronze = [];
  for (let i = 0; i < blade.out.length; i += MODEL_FLOATS) if (Math.abs(blade.out[i + 6] - 0xaa / 255) < 1e-3 && Math.abs(blade.out[i + 7] - 0xa6 / 255) < 1e-3) bronze.push(blade.out[i + 1]);
  assert.ok(bronze.length > 0 && bronze.every(y => y < 0), 'cleaver edge on the left (-Y)');
});

test('player tool shots are drawn leaving the muzzle, then ease onto their unchanged path', () => {
  assert.equal(closeViewMuzzleWeight(0), 1);
  assert.equal(closeViewMuzzleWeight(CLOSE_VIEW_SHOT_MUZZLE.settle), 0);
  assert.ok(closeViewMuzzleWeight(CLOSE_VIEW_SHOT_MUZZLE.settle / 2) > 0 && closeViewMuzzleWeight(CLOSE_VIEW_SHOT_MUZZLE.settle / 2) < 1);
  const shot = { x: 5.5, y: 4.45, dx: 1, dy: 0, speed: 10, age: .02, glyphHost: 'tool', hostile: false };
  assert.ok(closeViewMuzzleShot(shot));
  for (const other of [{ hostile: true }, { shadow: true }, { echo: true }, { glyphHost: null }, { visualLaunch: { v: 1, dx: 0, dy: 0, dz: 0 } }, { dead: true }])
    assert.equal(closeViewMuzzleShot({ ...shot, ...other }), false);
  const before = structuredClone(shot), muzzle = [5.3, 4.7, 1.1], out = new Float32Array(3);
  assert.ok(closeViewMuzzleOffset(out, shot, muzzle, 0));
  // Offset is from the spawn point (5.3 = 5.5 - 10 * .02) to the muzzle; the shot itself is untouched.
  assert.ok(Math.abs(out[0]) < 1e-6 && Math.abs(out[1] - .25) < 1e-5 && Math.abs(out[2] - (1.1 - .66)) < 1e-5, String(Array.from(out)));
  assert.deepEqual(shot, before);
  assert.equal(closeViewMuzzleOffset(out, shot, [50, 4, 1], 0), null, 'a far-off muzzle is never latched');
});
