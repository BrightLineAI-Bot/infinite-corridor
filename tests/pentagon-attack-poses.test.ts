// Pentagon creature refinement (Tim, 2026-11-14: ordinary creatures "just stand next to me"; "a couple of visual refinement
// passes for each creature ... without adding anything to the phone budget"). The fifteen Pentagon bodies were rebuilt to their
// standard-view art inside their old triangle counts, and their limbs, jaws, wings and weapons now load, strike and follow through
// on the shared root clock (PENTAGON_JOINT_POSE, evaluated by close-view-adventure-models.ts adventureJointPose).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, ATTACK_MODULES, freshPackState } from '../src/monster-pack.ts';
import { closeViewMonsterAction, closeViewRootAttack, closeViewRootReach } from '../src/close-view.ts';
import { actorModelKey } from '../src/actor-presentation.ts';
import { MESH_FLOATS } from '../src/close-view-mesh.ts';
import { CLOSE_VIEW_PENTAGON_KINDS, CLOSE_VIEW_PENTAGON_MODELS, PENTAGON_JOINT_POSE } from '../src/close-view-pentagon-models.ts';
import { ADVENTURE_JOINT_POSE, adventureJointPose } from '../src/close-view-adventure-models.ts';
import { CREATURE_POSE, creatureRootPose, modelTriangleCount, writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES } from '../src/close-view-models.ts';

// The counts before the refinement pass: a body may only keep or lower its count.
const BEFORE: Record<string, number> = { weepingSaint: 148, hangedChoir: 204, graveLantern: 160, mirrorShade: 104, amalgam: 192, gnawingMaw: 168, cinderSeraph: 232,
  lumenWraith: 154, veilSpinner: 202, riftLynx: 192, sunderjaw: 200, thunderhorn: 176, siegeBeetle: 220, gloomwisp: 180, gloomgorge: 220 };
const own = (kind: string) => MONSTER_PACK[kind].attacks.filter((id: string) => !ATTACK_MODULES[id].passive);
const PHASED_STRIKE: Record<string, string> = { blinkStrike: 'strike', diveBomb: 'lock', burrowAmbush: 'erupt' };

function actor(kind: string, id: string | null, phase = 'idle', p = 0, reduceMotion = false) {
  const e: any = createCombatant(kind, 0, 0);
  if (id) {
    const spec = ATTACK_MODULES[id], dur = phase === 'windup' ? spec.windup : phase === 'recover' ? spec.recover : phase === 'active' ? spec.active || 1 : ({ strike: .32, lock: .45, erupt: .75 } as any)[phase];
    e.pack = { ...freshPackState(), state: 'attack', attack: id, phase, t: dur * (1 - p), data: { aim: { x: 1, y: 0 } } };
  }
  const a: any = closeViewMonsterAction(e, kind), rid = closeViewRootAttack(e, a);
  return { kind: actorModelKey(e), x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, reduceMotion, pose: a.semanticPose ? 'semantic' : 'idle', amount: 0,
    action: a.semantic?.action, actionFamily: a.semantic?.family, actionPhase: a.semantic?.phase, actionProgress: a.semantic?.progress || 0, rootAttack: rid, attackReach: closeViewRootReach(e, rid) };
}
const mesh = (a: any) => { const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS); return out.slice(0, writeCloseViewModel(out, 0, a)); };
// The largest move of the parts on `swings` (root motion included).
function jointMove(kind: string, swings: Set<number>, a: any, b: any) {
  let offset = 0, max = 0;
  for (const part of CLOSE_VIEW_PENTAGON_MODELS[kind]) {
    const n = part.mesh.length / MESH_FLOATS * MODEL_FLOATS;
    if (swings.has(part.swing)) for (let i = offset; i < offset + n; i += MODEL_FLOATS) max = Math.max(max, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]));
    offset += n;
  }
  return max;
}
const rowsFor = (kind: string, id: string, style: string) => { const t: any = PENTAGON_JOINT_POSE[kind]; return t[id] || t[style] || t['*']; };

test('every Pentagon body keeps to its old triangle count, and its rows are registered with the shared joint evaluator', () => {
  assert.deepEqual([...CLOSE_VIEW_PENTAGON_KINDS].sort(), Object.keys(BEFORE).sort());
  assert.deepEqual(Object.keys(PENTAGON_JOINT_POSE).sort(), Object.keys(BEFORE).sort());
  for (const kind of CLOSE_VIEW_PENTAGON_KINDS) {
    assert.ok(modelTriangleCount(kind) <= BEFORE[kind], `${kind} ${modelTriangleCount(kind)} <= ${BEFORE[kind]}`);
    assert.equal(ADVENTURE_JOINT_POSE[kind], PENTAGON_JOINT_POSE[kind], `${kind} merged into the evaluated table`);
    const swings = new Set(CLOSE_VIEW_PENTAGON_MODELS[kind].map((p: any) => p.swing));
    for (const set of Object.values(PENTAGON_JOINT_POSE[kind]) as any[]) for (const s of Object.keys(set)) assert.ok(swings.has(Number(s)), `${kind} row ${s} names a real joint`);
  }
});

test('every own attack loads its joints in the windup, drives them at the strike, follows through and comes back to rest', () => {
  const fails: string[] = [];
  for (const kind of CLOSE_VIEW_PENTAGON_KINDS) for (const id of own(kind)) {
    const idleA = actor(kind, null), idle = mesh(idleA);
    const coilA = actor(kind, id, 'windup', .6), strikeA = PHASED_STRIKE[id] ? actor(kind, id, PHASED_STRIKE[id], .7) : actor(kind, id, 'windup', .97);
    const style = creatureRootPose(coilA).style, rows = rowsFor(kind, id, style), swings = new Set(Object.keys(rows).map(Number));
    const coil = mesh(coilA), strike = mesh(strikeA), follow = mesh(actor(kind, id, 'recover', .15)), done = mesh(actor(kind, id, 'recover', 1));
    if (!(jointMove(kind, swings, coil, idle) > .03)) fails.push(`${kind}/${id} coil`);
    if (!(jointMove(kind, swings, strike, coil) > .03)) fails.push(`${kind}/${id} strike`);
    if (!(jointMove(kind, swings, follow, strike) > .02)) fails.push(`${kind}/${id} follow-through`);
    for (let i = 0; i < idle.length; i++) if (Math.abs(done[i] - idle[i]) > 1e-5) { fails.push(`${kind}/${id} not at rest after recovery`); break; }
  }
  assert.equal(fails.length, 0, fails.join('\n'));
});

test('the lead joint of each own attack is authored: it loads against the blow and strikes through it', () => {
  for (const kind of CLOSE_VIEW_PENTAGON_KINDS) for (const id of own(kind)) {
    const style = creatureRootPose(actor(kind, id, 'windup', .5)).style, rows = rowsFor(kind, id, style);
    assert.ok(rows, `${kind}/${id} has rows`);
    const lead = Object.values(rows).reduce((m: any, r: any) => Math.abs(r[1] - r[0]) > Math.abs(m[1] - m[0]) ? r : m) as number[];
    assert.ok(Math.abs(lead[1] - lead[0]) >= .4, `${kind}/${id} lead joint travels ${Math.abs(lead[1] - lead[0])}`);
  }
  // Attack-specific accents: the Saint's stab and sweep, the Spinner's spit and bite, the Beetle's mortar kick differ.
  const t: any = PENTAGON_JOINT_POSE;
  assert.notDeepEqual(t.weepingSaint.longStab, t.weepingSaint.clawSweep);
  assert.notDeepEqual(t.veilSpinner.webSpit, t.veilSpinner.bite);
  assert.ok(t.siegeBeetle.mortarVolley[30][1] < 0 && t.siegeBeetle.mortarVolley[30][0] > 0, 'the mortar lowers to aim, then kicks back');
  assert.ok(t.mirrorShade.longStab[36][0] < -.5 && Math.abs(t.mirrorShade.longStab[36][1]) < .3, 'the blade is raised, then levelled into the thrust');
});

test('deterministic: the same attack frame writes the same bytes, with no clock or random input', () => {
  for (const kind of CLOSE_VIEW_PENTAGON_KINDS) for (const id of own(kind)) {
    const a = actor(kind, id, 'windup', .8);
    assert.deepEqual(mesh(a), mesh({ ...a }), `${kind}/${id}`);
  }
});

test('Reduced Motion: joints load and strike at the calm scale with no follow-through, and still read', () => {
  const amp = CREATURE_POSE.reduced.scale;
  for (const kind of CLOSE_VIEW_PENTAGON_KINDS) for (const [set, rows] of Object.entries(PENTAGON_JOINT_POSE[kind]) as any[]) for (const s of Object.keys(rows)) {
    const swing = Number(s), id = set === '*' ? 'noSuchAttack' : set, r = rows[s];
    for (const [stage, u] of [[1, .5], [2, .5], [3, 0], [4, .2]]) {
      const full = adventureJointPose(kind, swing, id, '*', stage, u, 1), calm = adventureJointPose(kind, swing, id, '*', stage, u, amp);
      if (stage === 4) { const lag = r[3], v = lag > 0 ? Math.max(0, (u - lag) / (1 - lag)) : u, e = 1 - v * v * (3 - 2 * v); assert.ok(Math.abs(calm! - amp * r[1] * e) < 1e-9, `${kind}/${set}/${s} no follow-through`); }
      else assert.ok(Math.abs(calm! - amp * full!) < 1e-9, `${kind}/${set}/${s} stage ${stage}`);
    }
  }
  for (const kind of CLOSE_VIEW_PENTAGON_KINDS) for (const id of own(kind)) {
    const idle = mesh(actor(kind, null, 'idle', 0, true)), wind = mesh(actor(kind, id, 'windup', .6, true));
    const rows = rowsFor(kind, id, creatureRootPose(actor(kind, id, 'windup', .6, true)).style);
    assert.ok(jointMove(kind, new Set(Object.keys(rows).map(Number)), wind, idle) > .015, `${kind}/${id} reads in Reduced Motion`);
  }
});
