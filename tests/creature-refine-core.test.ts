// The core and Arcology creature refinement pass (Tim, 2026-11-14): eleven ordinary creatures get clearer bodies at or under
// their earlier triangle counts and joint attack poses (CORE_JOINT_POSE, merged into ADVENTURE_JOINT_POSE) on the root layer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeCloseViewModel, modelTriangleCount, MODEL_FLOATS, MODEL_MAX_VERTICES, creatureRootPose } from '../src/close-view-models.ts';
import { CORE_JOINT_POSE } from '../src/close-view-arcology-models.ts';
import { ADVENTURE_JOINT_POSE, adventureJointPose } from '../src/close-view-adventure-models.ts';

// The counts before this pass; a refined body may only stay level or come in under them.
const before: Record<string, number> = { ashling: 160, rootBrute: 204, pallidCrawler: 178, hollowMarshal: 224, ashenHound: 224, coilStalker: 176,
  glassMite: 168, sparkWarden: 196, cinderWisp: 140, veilMoth: 120, voidSentinel: 204 };
const attacks: Record<string, string> = { ashling: 'lunge', rootBrute: 'slam', hollowMarshal: 'longReach', ashenHound: 'zigzag', coilStalker: 'longReach',
  glassMite: 'hop', sparkWarden: 'ranged', cinderWisp: 'ranged', veilMoth: 'ranged', voidSentinel: 'ranged' };
const actor = (kind: string, extra: any = {}) => ({ kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: 'idle', amount: 0, rootAttack: attacks[kind], attackReach: 2.4, ...extra });
function written(kind: string, extra: any = {}) { const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), end = writeCloseViewModel(out, 0, actor(kind, extra)); return out.slice(0, end); }
const crawler = (phase: string, p: number, pose: string, extra: any = {}) => ({ pose, amount: p, action: 'bite', actionFamily: 'bite', actionPhase: phase, actionProgress: p, ...extra });

test('every refined body stays within its earlier triangle count and writes exactly its triangles', () => {
  let total = 0, was = 0;
  for (const [kind, count] of Object.entries(before)) {
    const n = modelTriangleCount(kind); total += n; was += count;
    assert.ok(n > 0 && n <= count, `${kind}: ${n} > ${count}`);
    assert.equal(written(kind).length / MODEL_FLOATS / 3, n);
    assert.equal(written(kind, { pose: 'windup', amount: .9 }).length / MODEL_FLOATS / 3, n);
  }
  assert.ok(total <= was);
});

test('each kind registers its joint rows in the shared table, and each row evaluates', () => {
  for (const kind of Object.keys(before)) {
    assert.ok(Object.hasOwn(ADVENTURE_JOINT_POSE, kind) && ADVENTURE_JOINT_POSE[kind] === CORE_JOINT_POSE[kind], kind);
    const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
    for (const [id, set] of Object.entries(CORE_JOINT_POSE[kind]) as [string, any][]) for (const swing of Object.keys(set)) {
      assert.ok(Number.isFinite(adventureJointPose(kind, Number(swing), id, '', 1, .5)), `${kind} ${swing}`);
    }
    assert.ok(writeCloseViewModel(out, 0, actor(kind)) > 0);
  }
  // The Pallid Crawler keeps its authored hybrid gestures for anything but its own bite and leap.
  assert.equal(adventureJointPose('pallidCrawler', 2, 'clawSweep', 'sweep', 1, .5), null);
  assert.ok(adventureJointPose('pallidCrawler', 2, 'bite', 'lunge', 1, .5) !== 0);
});

test('attack joints coil in the windup, extend at the strike and rest again after the recovery', () => {
  for (const kind of Object.keys(attacks)) {
    const idle = written(kind, { reduceMotion: true }), coil = written(kind, { pose: 'windup', amount: .6 }), strike = written(kind, { pose: 'attack', amount: .2 });
    assert.notDeepEqual([...coil], [...idle], `${kind} windup`); assert.notDeepEqual([...strike], [...coil], `${kind} strike`);
    const rest = written(kind, { pose: 'attack', amount: 1, reduceMotion: true });
    for (let i = 0; i < rest.length; i++) assert.ok(Math.abs(rest[i] - idle[i]) < 1e-5, `${kind} settles at rest`);
    // The joint angles themselves (not only the root) change between the coil and the strike.
    const set = (CORE_JOINT_POSE as any)[kind]['*'];
    for (const swing of Object.keys(set)) { const c = adventureJointPose(kind, Number(swing), attacks[kind], '', 1, 1), e = adventureJointPose(kind, Number(swing), attacks[kind], '', 3, 0), r = adventureJointPose(kind, Number(swing), attacks[kind], '', 4, 1);
      assert.ok(Math.abs((c as number) - (e as number)) > .05, `${kind} ${swing} swings`); assert.ok(Math.abs(r as number) < 1e-9, `${kind} ${swing} rests`); }
  }
  const idle = written('pallidCrawler', { reduceMotion: true }), bite = written('pallidCrawler', crawler('windup', .6, 'windup')), snap = written('pallidCrawler', crawler('recover', .1, 'attack'));
  assert.notDeepEqual([...bite], [...idle]); assert.notDeepEqual([...snap], [...bite]);
});

test('the Root Brute slam raises its fists overhead and stops them short of the floor at contact', () => {
  const fists = (data: Float32Array) => { const lo = [] as number[]; for (let t = 0; t < data.length / MODEL_FLOATS / 3; t++) { const c = data[t * 3 * MODEL_FLOATS + 6]; if (Math.abs(c - 0xb6 / 255) < 1e-3) lo.push(data[t * 3 * MODEL_FLOATS + 2]); } return lo; };
  const top = (data: Float32Array) => { let h = -Infinity; for (let i = 2; i < data.length; i += MODEL_FLOATS) h = Math.max(h, data[i]); return h; };
  const idle = written('rootBrute'), coiled = written('rootBrute', { pose: 'windup', amount: .78 }), contact = written('rootBrute', { pose: 'attack', amount: .2 });
  assert.ok(Math.max(...fists(coiled)) > top(idle) - .1, 'fists high over the head in the windup');
  assert.ok(Math.min(...fists(contact)) > .15, 'fists stop short of the floor');
  assert.ok(Math.max(...fists(contact)) < 1.2, 'fists come down in front at contact');
  const r: any = creatureRootPose(actor('rootBrute', { pose: 'attack', amount: .2 }));
  assert.ok(r.lean < .35, 'the lean itself stays modest');
});

test('attack poses are deterministic and Reduced Motion swings less with no follow-through', () => {
  for (const kind of Object.keys(attacks)) {
    assert.deepEqual([...written(kind, { pose: 'windup', amount: .9 })], [...written(kind, { pose: 'windup', amount: .9 })]);
    const set = (CORE_JOINT_POSE as any)[kind]['*'];
    for (const swing of Object.keys(set)) {
      const full = adventureJointPose(kind, Number(swing), attacks[kind], '', 3, 0, 1) as number, calm = adventureJointPose(kind, Number(swing), attacks[kind], '', 3, 0, .5) as number;
      assert.ok(Math.abs(calm) <= Math.abs(full) + 1e-9);
      assert.equal(adventureJointPose(kind, Number(swing), attacks[kind], '', 4, 1, .5), 0);
    }
    assert.notDeepEqual([...written(kind, { pose: 'attack', amount: .2, reduceMotion: true })], [...written(kind, { pose: 'attack', amount: .2 })]);
  }
});
