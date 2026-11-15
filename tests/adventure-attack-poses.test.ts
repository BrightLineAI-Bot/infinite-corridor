// Adventure creatures and Foundry kin: refined bodies and limb attack poses (Tim, 2026-11-14: ordinary creatures "just stand next
// to me"; "a couple of visual refinement passes for each creature" without adding to the phone budget). close-view-adventure-models.ts
// ADVENTURE_JOINT_POSE (and close-view-foundry-models.ts FOUNDRY_JOINT_POSE) move each creature's own limbs on the shared root
// pose's stage clock: loaded in the windup, extended at the strike, back at rest once recovered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, ATTACK_MODULES, freshPackState } from '../src/monster-pack.ts';
import { actorModelKey } from '../src/actor-presentation.ts';
import { closeViewMonsterAction, closeViewRootAttack, closeViewRootReach } from '../src/close-view.ts';
import { CREATURE_POSE, creatureRootPose, modelTriangleCount, writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES } from '../src/close-view-models.ts';
import { CLOSE_VIEW_ADVENTURE_KINDS, ADVENTURE_JOINT_POSE, ADVENTURE_JOINT_KINDS, adventureJointPose } from '../src/close-view-adventure-models.ts';
import { FOUNDRY_JOINT_POSE } from '../src/close-view-foundry-models.ts';

// Triangle caps: the refined bodies never exceed what they cost before the pass (Lake Glider, Sinkmaw and Knellkeeper came down).
const CAP: any = { galleryLurker: 220, censerWarden: 196, vinehookLeaper: 218, thornspitterBloom: 178, sinkmaw: 208, cinderKite: 176, lamplighter: 196,
  knellkeeper: 172, spindriftMedusa: 146, prismStilt: 160, rimeSentinel: 220, lakeGlider: 184, hookhanger: 174, slagwright: 170,
  'foundry-quadruped': 176, 'foundry-floating': 160, 'foundry-segmented': 192, 'foundry-tentacled': 184, 'foundry-geometric': 152, 'foundry-biomechanical': 204,
  'foundry-tentacled-3': 152, 'foundry-biomechanical-3': 204, 'foundry-tentacled-6': 200, 'foundry-biomechanical-6': 228 };

function actorOf(e: any, kind: string, extra: any = {}) {
  const a: any = closeViewMonsterAction(e, kind, null);
  const pose = a.semanticPose ? 'semantic' : a.attack ? 'attack' : a.winding ? 'windup' : 'idle', id = closeViewRootAttack(e, a);
  return { kind: actorModelKey(e), x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose, amount: 0, reduceMotion: false,
    action: a.semantic?.action, actionFamily: a.semantic?.family, actionPhase: a.semantic?.phase, actionProgress: a.semantic?.progress || 0,
    rootAttack: id, attackReach: closeViewRootReach(e, id), ...extra };
}
function pack(kind: string, id: string, phase: string, p: number) {
  const e: any = createCombatant(kind, 0, 0), spec = ATTACK_MODULES[id];
  const dur = phase === 'windup' ? spec.windup : phase === 'recover' ? spec.recover : phase === 'active' ? spec.active || 1 : ({ strike: .32, travel: 2.6, erupt: .75 } as any)[phase];
  e.pack = { ...freshPackState(), state: 'attack', attack: id, phase, t: dur * (1 - p), data: { aim: { x: 1, y: 0 } } };
  return e;
}
const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS * 2);
const write = (a: any) => out.slice(0, writeCloseViewModel(out, 0, a));
// Largest vertex displacement between two posed streams (positions only).
function moved(a: Float32Array, b: Float32Array) { let m = 0; for (let i = 0; i < a.length; i += MODEL_FLOATS) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2])); return m; }
// The same stream with the root offset removed: only the limb poses differ from rest.
function limbsOnly(kind: string, e: any, extra: any = {}) { const a = actorOf(e, kind, extra), r = { ...creatureRootPose(a) }; return { a, r }; }
const authored = (kind: string) => MONSTER_PACK[kind].attacks.filter((id: string) => Object.hasOwn(ADVENTURE_JOINT_POSE[kind], id));

test('triangle caps hold for every refined body, and every adventure kind has authored attack poses', () => {
  for (const [kind, n] of Object.entries(CAP)) assert.ok(modelTriangleCount(kind) <= (n as number), `${kind} ${modelTriangleCount(kind)} <= ${n}`);
  for (const kind of CLOSE_VIEW_ADVENTURE_KINDS) {
    assert.ok(ADVENTURE_JOINT_KINDS.has(kind), kind);
    assert.ok(authored(kind).length >= 2 || kind === 'lakeGlider' || authored(kind).length === MONSTER_PACK[kind].attacks.length, `${kind} poses its attacks`);
    for (const id of Object.keys(ADVENTURE_JOINT_POSE[kind])) assert.ok(ATTACK_MODULES[id] || CREATURE_POSE.styles[id] || id === '*', `${kind}: ${id} is a real attack or style`);
  }
  for (const kind of Object.keys(FOUNDRY_JOINT_POSE)) assert.ok(Object.hasOwn(CREATURE_POSE.kinds, kind) && ADVENTURE_JOINT_KINDS.has(kind), kind);
});

test('each authored attack moves its limbs in the windup and at the strike, beyond the root alone, and rests once recovered', () => {
  const fails: string[] = [];
  for (const kind of CLOSE_VIEW_ADVENTURE_KINDS) for (const id of authored(kind)) {
    const phased = CREATURE_POSE.phased.includes(id);
    const rest = write(actorOf(createCombatant(kind, 0, 0), kind));
    const coil = pack(kind, id, 'windup', phased ? .7 : .6), strike = phased ? pack(kind, id, 'erupt', .5) : pack(kind, id, 'windup', .97);
    for (const [name, e] of [['windup', coil], ['strike', strike]] as const) {
      const { a } = limbsOnly(kind, e), posed = write(a);
      // The limb angle itself is authored and non-zero for at least one joint of this attack.
      const r = creatureRootPose(a), joints = Object.keys(ADVENTURE_JOINT_POSE[kind][id]).map(Number);
      const extra = Math.max(...joints.map((s) => Math.abs(adventureJointPose(kind, s, id, r.style, r.stage, r.u) ?? 0)));
      if (!(extra > .2)) fails.push(`${kind}/${id} ${name}: limb pose ${extra}`);
      if (!(moved(posed, rest) > .08)) fails.push(`${kind}/${id} ${name}: moved ${moved(posed, rest)}`);
    }
    const done = write(actorOf(pack(kind, id, 'recover', 1), kind));
    if (moved(done, rest) > 1e-6) fails.push(`${kind}/${id} not at rest after recovery ${moved(done, rest)}`);
  }
  assert.equal(fails.length, 0, fails.join('\n'));
});

test('signature accents: the censer arcs over, the pole and spear level, the hook and ladle draw back then sweep', () => {
  const angle = (kind: string, swing: number, id: string, stage: number, u: number) => adventureJointPose(kind, swing, id, '', stage, u) as number;
  // Censer arm, chain and censer swing as one joint from the shoulder: back in the windup, over and forward at the throw.
  assert.ok(angle('censerWarden', 31, 'censerLob', 1, 1) > .8 && angle('censerWarden', 31, 'censerLob', 2, 1) < -2);
  for (const kind of ['lamplighter', 'rimeSentinel']) assert.ok(angle(kind, 50, 'poleThrust', 1, 1) < 0 && angle(kind, 50, 'poleThrust', 3, 0) > .9, `${kind} levels its pole`);
  assert.ok(angle('hookhanger', 70, 'heavySweep', 1, 1) > .8 && angle('hookhanger', 70, 'heavySweep', 3, 0) < -1);
  assert.ok(angle('knellkeeper', 50, 'bellToll', 1, 1) < -1.8, 'the hammer goes up before the toll');
  // Follow-through early in the recovery, lag on trailing joints.
  assert.ok(angle('galleryLurker', 70, 'clawSweep', 4, .2) < angle('galleryLurker', 70, 'clawSweep', 4, .6));
  assert.ok(angle('galleryLurker', 71, 'clawSweep', 2, .2) > angle('galleryLurker', 70, 'clawSweep', 2, .2), 'the trailing arm lags the lead');
  assert.equal(adventureJointPose('censerWarden', 999, 'censerLob', '', 2, .5), null, 'an unlisted joint keeps its own motion');
  assert.equal(adventureJointPose('censerWarden', 31, 'censerLob', '', 0, 0), null, 'no pose at rest');
});

test('deterministic, and Reduced Motion scales the limb pose with the root layer and drops the follow-through', () => {
  for (const kind of CLOSE_VIEW_ADVENTURE_KINDS) for (const id of authored(kind)) {
    const e = pack(kind, id, 'windup', .97);
    assert.deepEqual([...write(actorOf(e, kind))], [...write(actorOf(e, kind))], `${kind}/${id} deterministic`);
    const full = actorOf(pack(kind, id, 'recover', .2), kind), calm = { ...full, reduceMotion: true };
    const r = creatureRootPose(full);
    for (const s of Object.keys(ADVENTURE_JOINT_POSE[kind][id]).map(Number)) {
      const f = adventureJointPose(kind, s, id, r.style, r.stage, r.u, 1) as number, row = ADVENTURE_JOINT_POSE[kind][id][s];
      const c = adventureJointPose(kind, s, id, r.style, r.stage, r.u, CREATURE_POSE.reduced.scale) as number;
      const followShare = row[2] * (r.u - row[3] > 0 && (r.u - row[3]) / (1 - row[3]) < .45 ? Math.sin(Math.PI * ((r.u - row[3]) / (1 - row[3])) / .45) : 0);
      assert.ok(Math.abs(c - (f - followShare) * CREATURE_POSE.reduced.scale) < 1e-9, `${kind}/${id} ${s}`);
    }
    // Ambient motion stays still under Reduced Motion while the attack still reads.
    const w1 = write({ ...actorOf(pack(kind, id, 'windup', .6), kind), reduceMotion: true, phase: .4 }), w2 = write({ ...actorOf(pack(kind, id, 'windup', .6), kind), reduceMotion: true, phase: 2.4 });
    assert.deepEqual([...w1], [...w2], `${kind}/${id} reduced motion holds its sway`);
  }
});

test('Foundry kin: limbs load and release on their stab, sweep, slam and ranged clocks, and rest after', () => {
  for (const kind of Object.keys(FOUNDRY_JOINT_POSE)) for (const family of ['sweep', 'stab', 'slam', 'ranged']) {
    const base = { kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, amount: 0, action: 'meleeSwipe', actionFamily: family, attackReach: 1.4 };
    const rest = write({ ...base, pose: 'idle' }), wind = write({ ...base, pose: 'semantic', actionPhase: 'windup', actionProgress: .97 });
    const done = write({ ...base, pose: 'semantic', actionPhase: 'recover', actionProgress: 1 });
    assert.ok(moved(wind, rest) > .08, `${kind}/${family} strikes`); assert.ok(moved(done, rest) < 1e-6, `${kind}/${family} rests`);
  }
});

test('the joint pose allocates nothing per call', () => {
  const src = readFileSync(new URL('../src/close-view-adventure-models.ts', import.meta.url), 'utf8');
  const i = src.indexOf('function adventureJointPose('); let d = 0, j = src.indexOf('{', i); const s = j;
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
  assert.ok(!/\bnew\s|=>|\[\s*\]|\.map\(|\.filter\(|\.slice\(|\{\s*[A-Za-z_$]+\s*:|\.\.\./.test(src.slice(s, j + 1)));
});
