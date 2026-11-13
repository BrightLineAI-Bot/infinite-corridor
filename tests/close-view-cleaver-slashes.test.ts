// Tim, 2026-11-12: the Verge Cleaver's Close View attack is three standard sword slashes, and the
// Salvage Blade is reskinned without changing how it is held. Presentation only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { writeCloseViewHeroEquipment, writeCloseViewHeroGear, CLOSE_VIEW_HERO_WEAPON_FORM, HERO_EQUIPMENT_MAX_TRIANGLES, MODEL_FLOATS } from '../src/close-view-models.ts';
import { CLOSE_VIEW_CLEAVER_SLASHES, CLOSE_VIEW_CLEAVER_SLASH_TIMING, sampleCleaverSlash, cleaverSlashBlade, sampleMeleeActionPose } from '../src/close-view-player-presentation.ts';
import { CLOSE_VIEW_MELEE_TIMING, normalizeMeleeActionVisual } from '../src/action-motion.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const T = CLOSE_VIEW_MELEE_TIMING.cleaverQuick;
const TIP = (CLOSE_VIEW_HERO_WEAPON_FORM.cleaver.tip - .79) * .82;
const RAD = Math.PI / 180;
const base = { x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: 'verge-cleaver', handProfile: 'verge-cleaver' };
const meleeAction = (contactMs = T.contactMs) => ({ v: 2, kind: 'verge-cleaver', move: 'cleaver', contactMs, durationMs: T.durationMs });
function pose(step: number, ms: number, extra: any = {}) {
  const contactMs = extra.contactMs ?? T.contactMs, state = createHeroPoseState(asset), frame = createHeroFrame(asset);
  const input = { ...base, ...extra, nowMs: 1200 + ms, primaryCarryStage: { kind: 'cleaver-three', step, direction: step === 2 ? -1 : 1 },
    action: { kind: 'melee', profile: 'verge-cleaver', primaryMotion: { v: 3, mode: 'quick', step }, meleeAction: meleeAction(contactMs), phase: ms / T.durationMs, durationMs: T.durationMs, poseMs: 1200, yaw: 0 } };
  assert.equal(sampleCloseViewHero(asset, state, input, frame), true);
  const m = frame.rightSocket, ax = Math.hypot(m[0], m[1], m[2]), ay = Math.hypot(m[4], m[5], m[6]);
  const blade = [m[0] / ax, m[1] / ax, m[2] / ax], edge = [m[4] / ay, m[5] / ay, m[6] / ay];
  return { state, frame, blade, edge, grip: [m[12], m[13], m[14]], tip: [0, 1, 2].map(k => m[12 + k] + blade[k] * TIP) };
}
const angle = (a: number[], b: number[]) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// In this sample frame (yaw 0) +x is forward, z is up and the Cleaver hand is on the -y side.
const SWORD_SIDE = -1;

test('the hero rig has no sword-slash clip, so the three slashes are authored data on it', () => {
  assert.deepEqual(Object.keys(asset.clips).sort(), ['Attacking_Idle', 'Dagger_Attack', 'Dagger_Attack2', 'Death', 'Idle', 'PickUp', 'Punch', 'RecieveHit', 'RecieveHit_2', 'Roll', 'Run', 'Walk']);
  assert.deepEqual(CLOSE_VIEW_CLEAVER_SLASHES.map(s => s.name), ['diagonal', 'return', 'overhead']);
  for (const s of CLOSE_VIEW_CLEAVER_SLASHES) {
    assert.ok(Object.isFrozen(s) && s.from < 0 && s.to > 0 && s.to - s.from < 300, `${s.name} sweeps less than a turn`);
    const b = cleaverSlashBlade(s, 0); assert.ok(b[2] > .95, `${s.name} points forward at contact`);
  }
  for (let step = 1; step <= 3; step++) assert.equal(pose(step, 100).state.clip, 'derived-cleaver-slash-' + CLOSE_VIEW_CLEAVER_SLASHES[step - 1].name);
});

test('slash timing follows the accepted quick Cleaver action and leaves its contact alone', () => {
  assert.deepEqual({ ...T }, { durationMs: 260, contactMs: 75 });
  assert.deepEqual(normalizeMeleeActionVisual(meleeAction()), meleeAction());
  for (const contactMs of [T.contactMs, 40]) for (let step = 1; step <= 3; step++) {
    const c = contactMs / T.durationMs, at = (ms: number) => sampleCleaverSlash(step, ms / T.durationMs, c, {});
    // The sampler reads the same contact fraction the shared melee descriptor reports.
    assert.equal(sampleMeleeActionPose(meleeAction(contactMs), .5, step).contact, c);
    const contact = at(contactMs);
    assert.equal(contact.angle, 0, 'the blade crosses the middle of the strike zone exactly at contact');
    assert.equal(contact.phase, 'follow-through');
    assert.equal(at(0).weight, 0); assert.equal(at(T.durationMs).weight, 0, 'back at guard when the action ends');
    const windEnd = contactMs * CLOSE_VIEW_CLEAVER_SLASH_TIMING.windup, followEnd = contactMs + (T.durationMs - contactMs) * CLOSE_VIEW_CLEAVER_SLASH_TIMING.follow;
    assert.ok(Math.abs(at(windEnd).weight - 1) < 1e-12 && at(windEnd).phase === 'swing');
    assert.equal(at(windEnd - .5).phase, 'windup'); assert.equal(at(followEnd + .5).phase, 'recovery');
    // Speed peaks at contact: fast swing through the strike, settling in the follow-through.
    const speed = (ms: number) => Math.abs(at(ms + .5).angle - at(ms - .5).angle);
    assert.ok(speed(contactMs - 1) > speed(windEnd + 2) * 3 && speed(contactMs + 1) > speed(followEnd - 2) * 3);
  }
  // The actual game stamps exactly this action and its pending contact for a quick Cleaver cut.
  const g: any = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  g.save.closeView = true; g.save.activeWeaponSlot = 'primary'; g.save.lastAim = { x: 1, y: 0 }; g.enemies = [];
  g.save.equipment.primary = { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact' };
  for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; if (t.kind === 'yardGrass') t.kind = 'flagFloor'; }
  assert.equal(g.closeViewActionEligible(), true);
  let used = false; g.update(.016, { state: { x: 0, y: 0 }, consume: (k: string) => k === 'attack' && !used && (used = true), held: () => false, reset: () => {} }, 100000);
  const v = g.player.attackVisual;
  assert.deepEqual(v.primaryMotion, { v: 3, mode: 'quick', step: 1 });
  assert.deepEqual(v.meleeAction, meleeAction(T.contactMs));
  assert.equal(v.durationMs, T.durationMs);
  assert.equal(g.pendingMeleeContact.releaseAt - g.pendingMeleeContact.acceptedAt, T.contactMs, 'the hit still lands at the table contact time');
});

test('each slash sweeps a continuous blade-tip arc across the front strike zone, with no spin and no NaN', () => {
  const head = base.height; // world height of the Wayfarer
  for (let step = 1; step <= 3; step++) {
    const c = T.contactMs, windEnd = c * CLOSE_VIEW_CLEAVER_SLASH_TIMING.windup, followEnd = c + (T.durationMs - c) * CLOSE_VIEW_CLEAVER_SLASH_TIMING.follow;
    const guard = pose(step, 0), samples = [];
    for (let ms = 0; ms <= T.durationMs; ms++) samples.push({ ms, ...pose(step, ms) });
    let roll = 0, turn = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      assert.ok(Array.from(s.frame.positionsNormals).every(Number.isFinite) && s.tip.every(Number.isFinite) && Array.from(s.frame.rightSocket).every(Number.isFinite), `finite at ${s.ms} ms`);
      assert.ok(s.state.primaryGripResidual < .01, `grip reaches its target at ${s.ms} ms`);
      if (!i) continue;
      const p = samples[i - 1];
      // Contact at 75 ms leaves a ~34 ms wind-up, so the tip is fast, but it never jumps.
      const moved = dist(s.tip, p.tip), before = i > 1 ? dist(p.tip, samples[i - 2].tip) : moved;
      assert.ok(moved < .2 && moved < 2.5 * before + .02, `step ${step}: tip moves continuously at ${s.ms} ms (${moved})`);
      const d = angle(s.blade, p.blade); turn += d;
      assert.ok(d < 20 * RAD, `step ${step}: no blade snap at ${s.ms} ms`);
      // Wrist roll: the edge turning about the blade, with the blade's own swing removed.
      const e = s.edge, b = s.blade, pe = p.edge, k = pe[0] * b[0] + pe[1] * b[1] + pe[2] * b[2], q = [pe[0] - k * b[0], pe[1] - k * b[1], pe[2] - k * b[2]], ql = Math.hypot(...q);
      roll += angle(e, q.map(v => v / ql));
    }
    assert.ok(roll < Math.PI, `step ${step}: no wrist spin (total roll ${(roll / RAD).toFixed(0)} deg)`);
    assert.ok(turn < 2.5 * Math.PI, `step ${step}: the blade swings out and back, never round and round (${(turn / RAD).toFixed(0)} deg)`);
    // The strike: from the wind-up to the end of the follow-through the blade turns monotonically
    // through its whole arc, about one axis, and at contact the tip is out in front at reach.
    const swing = samples.filter(s => s.ms >= Math.ceil(windEnd) && s.ms <= Math.floor(followEnd));
    const n = [0, 0, 0]; for (let i = 1; i < swing.length; i++) { const a = swing[i - 1].blade, b = swing[i].blade; n[0] += a[1] * b[2] - a[2] * b[1]; n[1] += a[2] * b[0] - a[0] * b[2]; n[2] += a[0] * b[1] - a[1] * b[0]; }
    for (let i = 1; i < swing.length; i++) { const a = swing[i - 1].blade, b = swing[i].blade, x = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; assert.ok(x[0] * n[0] + x[1] * n[1] + x[2] * n[2] >= 0, `step ${step}: the swing never reverses (${swing[i].ms} ms)`); }
    const sweep = angle(swing[0].blade, swing.at(-1).blade) + 0, arc = (CLOSE_VIEW_CLEAVER_SLASHES[step - 1].to - CLOSE_VIEW_CLEAVER_SLASHES[step - 1].from) * RAD;
    let swept = 0; for (let i = 1; i < swing.length; i++) swept += angle(swing[i - 1].blade, swing[i].blade);
    assert.ok(swept > arc * .9 && swept < arc * 1.05 && swept < 2 * Math.PI, `step ${step}: one clean ${(arc / RAD).toFixed(0)} deg arc (${(swept / RAD).toFixed(0)}, chord ${(sweep / RAD).toFixed(0)})`);
    const hit = pose(step, c);
    assert.ok(hit.tip[0] > .9 && hit.blade[0] > .9, `step ${step}: blade straight out in front at contact`);
    assert.ok(Math.abs(hit.tip[1]) < .35 && hit.tip[2] > .4 * head && hit.tip[2] < 1.05 * head, `step ${step}: tip at the strike zone at contact`);
    const from = pose(step, windEnd), to = pose(step, followEnd);
    if (step === 1) { assert.ok(from.tip[1] * SWORD_SIDE > .5 && to.tip[1] * SWORD_SIDE < -.5 && from.tip[2] - to.tip[2] > .9, 'diagonal: high on the sword side down across the body'); }
    if (step === 2) { assert.ok(from.tip[1] * SWORD_SIDE < -.6 && to.tip[1] * SWORD_SIDE > .6 && Math.abs(from.tip[2] - to.tip[2]) < .05, 'return: across from the far side, level (2026-11-13: was a little down)'); }
    if (step === 3) {
      assert.ok(from.tip[2] > head && from.tip[0] < 0 && to.tip[2] < .3 * head && to.tip[2] > 0 && to.tip[0] > .5, 'overhead: from behind the head down in front');
      for (const s of swing) assert.ok(Math.abs(s.tip[1]) < .35, 'overhead stays on the centre line');
    }
    // Every frame of the strike keeps the tip above the floor; guard and end are the exact carry.
    for (const s of samples) assert.ok(s.tip[2] > 0, `step ${step}: tip above the floor at ${s.ms} ms`);
    const carried = createHeroFrame(asset); sampleCloseViewHero(asset, createHeroPoseState(asset), { ...base, nowMs: 1200 + T.durationMs, primaryCarryStage: { kind: 'cleaver-three', step } }, carried);
    assert.deepEqual(pose(step, T.durationMs).frame.rightSocket, carried.rightSocket, 'recovered to the exact carry');
    assert.ok(dist(guard.grip, pose(step, 1).grip) < .01, 'leaves the carry continuously');
  }
});

test('slashes keep source feet, read with reduced motion and stay continuous at 30 and 60 Hz while walking', () => {
  for (let step = 1; step <= 3; step++) for (const speed of [0, 1.4]) for (const reducedMotion of [false, true]) {
    const still = (ms: number) => { const s = createHeroPoseState(asset), f = createHeroFrame(asset); sampleCloseViewHero(asset, s, { ...base, speed, gaitPhase: .7, reducedMotion, nowMs: 1200 + ms, primaryCarryStage: { kind: 'cleaver-three', step } }, f); return s; };
    for (const ms of [20, 75, 150]) {
      const q = pose(step, ms, { speed, gaitPhase: .7, reducedMotion }), s = still(ms);
      assert.deepEqual([...q.state.pose.slice(10, 20), ...q.state.pose.slice(360, 370)], [...s.pose.slice(10, 20), ...s.pose.slice(360, 370)], 'feet stay on their own support');
      assert.ok(q.tip.every(Number.isFinite));
    }
    // Reduced motion damps the body, not the blade arc.
    if (reducedMotion) assert.ok(angle(pose(step, 75, { speed, gaitPhase: .7, reducedMotion }).blade, pose(step, 75, { speed, gaitPhase: .7 }).blade) < 10 * RAD);
    for (const hz of [30, 60]) { let last = null; for (let n = 0; n <= Math.ceil(T.durationMs / 1000 * hz); n++) { const t = pose(step, Math.min(T.durationMs, n * 1000 / hz), { speed, gaitPhase: .7, reducedMotion }).tip; if (last) assert.ok(dist(t, last) < (hz === 60 ? 2 : 3)); last = t; } }
  }
});

test('Salvage Blade reskin: the grip transform is unchanged and the model stays inside its budget', () => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.salvage;
  assert.deepEqual([F.grip, F.gripRadius, F.pommel], [[.700, .742], .018, [.664, .684, .700]], 'the hold below the guard is unchanged');
  // Socket matrices of the held Salvage Blade, pinned from release 914 (idle, walk, run; normal and reduced motion).
  const PINNED = [
    [-0.31145, -0.13489, -0.13852, 0, 0.11351, 0.08504, -0.33803, 0, 0.15652, -0.33008, -0.03048, 0, 0.16582, -0.17427, 0.68024, 1],
    [-0.31241, -0.13688, -0.13433, 0, 0.11626, 0.06904, -0.34073, 0, 0.15253, -0.33299, -0.01543, 0, 0.16508, -0.18622, 0.69416, 1],
    [-0.08812, -0.14878, -0.32324, 0, 0.22307, 0.23634, -0.1696, 0, 0.27723, -0.23747, 0.03372, 0, 0.35153, -0.03873, 0.78001, 1],
    [-0.08655, -0.15074, -0.32275, 0, 0.22422, 0.23504, -0.1699, 0, 0.2768, -0.23752, 0.03671, 0, 0.35309, -0.04073, 0.7834, 1],
    [-0.24983, -0.23072, -0.13689, 0, 0.16676, 0.01296, -0.3262, 0, 0.21014, -0.28458, 0.09612, 0, 0.17834, -0.23927, 0.61586, 1],
    [-0.24983, -0.23072, -0.13689, 0, 0.16676, 0.01296, -0.3262, 0, 0.21014, -0.28458, 0.09612, 0, 0.17834, -0.23927, 0.61586, 1],
  ];
  let i = 0;
  for (const speed of [0, 1.2, 3.5]) for (const reducedMotion of [false, true]) {
    const s = createHeroPoseState(asset), f = createHeroFrame(asset);
    sampleCloseViewHero(asset, s, { ...base, nowMs: 1500, yaw: .4, speed, gaitPhase: 1.1, reducedMotion, heldProfile: 'salvage-blade', handProfile: 'salvage-blade' }, f);
    const want = PINNED[i++]; for (let k = 0; k < 16; k++) assert.ok(Math.abs(f.rightSocket[k] - want[k]) < 2e-5, `salvage grip socket ${speed}/${reducedMotion}[${k}]`);
  }
  for (const profile of ['salvage-blade', 'melee']) {
    const out = new Float32Array(256 * 3 * MODEL_FLOATS), id = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const end = writeCloseViewHeroGear(out, 0, { profile, leftSocket: id, rightSocket: id }), tris = end / MODEL_FLOATS / 3;
    assert.ok(tris > 0 && tris <= 58 && tris <= HERO_EQUIPMENT_MAX_TRIANGLES, `${profile}: ${tris} triangles, within the old 58`);
    assert.ok(Array.from(out.subarray(0, end)).every(Number.isFinite));
    // The spike points straight up the socket axis, to the accepted point.
    let far = -Infinity; for (let k = 0; k < end; k += MODEL_FLOATS) far = Math.max(far, out[k]);
    assert.ok(Math.abs(far - (F.blade.tip + .004 - .79) * .82) < 1e-5);
    const frame = createHeroFrame(asset), s = createHeroPoseState(asset); sampleCloseViewHero(asset, s, { ...base, nowMs: 1500, heldProfile: profile, handProfile: profile }, frame);
    assert.equal(writeCloseViewHeroEquipment(out, 0, { profile, primaryStage: null, leftSocket: frame.leftSocket, rightSocket: frame.rightSocket }, frame) / MODEL_FLOATS / 3, tris);
  }
});
