// Realms creature pass (Tim, 2026-11-15: a second visual pass on every ordinary creature to a "triple-A feel" without exceeding
// the phone budget). The Pentagon and adventure bodies keep their exact triangle counts; every own attack now has its own authored
// joint row (no shared '*' fallback); the Weeping Saint's head rides a neck joint; the Knellkeeper is one body grown out of its bell;
// eyes and lamps use the shared emissive colours so they are lit from within like the rest of the bestiary. Standard View keeps
// the existing art (Tim, 2026-11-15); only the Knellkeeper strike and the Slagwright sweep gain motion, the rest pose unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, ATTACK_MODULES, freshPackState } from '../src/monster-pack.ts';
import { closeViewMonsterAction, closeViewRootAttack, closeViewRootReach } from '../src/close-view.ts';
import { actorModelKey } from '../src/actor-presentation.ts';
import { CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { CLOSE_VIEW_PENTAGON_KINDS, CLOSE_VIEW_PENTAGON_MODELS, PENTAGON_JOINT_POSE } from '../src/close-view-pentagon-models.ts';
import { CLOSE_VIEW_ADVENTURE_KINDS, CLOSE_VIEW_ADVENTURE_MODELS, ADVENTURE_JOINT_POSE } from '../src/close-view-adventure-models.ts';
import { ADVENTURE_BODIES, ADVENTURE_SPRITE } from '../src/adventure-creature-render.ts';
import { modelTriangleCount, writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES } from '../src/close-view-models.ts';
import { MESH_FLOATS } from '../src/close-view-mesh.ts';

const PINS: Record<string, number> = { weepingSaint: 148, hangedChoir: 204, graveLantern: 152, mirrorShade: 96, amalgam: 192, gnawingMaw: 158, cinderSeraph: 214,
  lumenWraith: 152, veilSpinner: 192, riftLynx: 188, sunderjaw: 178, thunderhorn: 176, siegeBeetle: 214, gloomwisp: 166, gloomgorge: 208,
  galleryLurker: 220, censerWarden: 196, vinehookLeaper: 218, thornspitterBloom: 178, sinkmaw: 208, cinderKite: 176, lamplighter: 196,
  knellkeeper: 172, spindriftMedusa: 146, prismStilt: 160, rimeSentinel: 220, lakeGlider: 184, hookhanger: 174, slagwright: 170 };

function actor(kind: string, id: string | null, phase = 'idle', p = 0) {
  const e: any = createCombatant(kind, 0, 0);
  if (id) {
    const spec = ATTACK_MODULES[id], dur = phase === 'windup' ? spec.windup : phase === 'recover' ? spec.recover : .5;
    e.pack = { ...freshPackState(), state: 'attack', attack: id, phase, t: dur * (1 - p), data: { aim: { x: 1, y: 0 } } };
  }
  const a: any = closeViewMonsterAction(e, kind), rid = closeViewRootAttack(e, a);
  return { kind: actorModelKey(e), x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: a.semanticPose ? 'semantic' : 'idle', amount: 0,
    action: a.semantic?.action, actionFamily: a.semantic?.family, actionPhase: a.semantic?.phase, actionProgress: a.semantic?.progress || 0, rootAttack: rid, attackReach: closeViewRootReach(e, rid) };
}
const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
const mesh = (a: any) => out.slice(0, writeCloseViewModel(out, 0, a));
// Vertices of the parts on joint `swing` (model order), as written.
function partVerts(models: any, kind: string, swing: number, data: Float32Array) {
  const pts: number[][] = []; let offset = 0;
  for (const part of models[kind]) { const n = part.mesh.length / MESH_FLOATS * MODEL_FLOATS; if (part.swing === swing) for (let i = offset; i < offset + n; i += MODEL_FLOATS) pts.push([data[i], data[i + 1], data[i + 2]]); offset += n; }
  return pts;
}
const mean = (pts: number[][]) => [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);

test('every realms body keeps its exact triangle count (reshaped, never added)', () => {
  assert.deepEqual([...CLOSE_VIEW_PENTAGON_KINDS, ...CLOSE_VIEW_ADVENTURE_KINDS].sort(), Object.keys(PINS).sort());
  for (const [kind, n] of Object.entries(PINS)) {
    assert.equal(modelTriangleCount(kind), n, kind);
    assert.equal(mesh(actor(kind, null)).length / MODEL_FLOATS / 3, n, `${kind} writes ${n}`);
  }
});

test('every own attack has its own authored joint row (the Grave Lantern witness excepted), and borrowed attacks keep a fallback', () => {
  for (const kind of [...CLOSE_VIEW_PENTAGON_KINDS, ...CLOSE_VIEW_ADVENTURE_KINDS]) {
    if (kind === 'graveLantern') continue;
    for (const id of MONSTER_PACK[kind].attacks) if (!ATTACK_MODULES[id].passive) assert.ok(Object.hasOwn(ADVENTURE_JOINT_POSE[kind], id), `${kind}/${id}`);
  }
  const t: any = PENTAGON_JOINT_POSE;
  assert.notDeepEqual(t.mirrorShade.mirrorClones, t.mirrorShade.mirrorSwap, 'clones and swap are different gestures');
  assert.notDeepEqual(t.amalgam.fleshBloom, t.amalgam.broodBirth);
  for (const [a, b] of [['clawSweep', 'devourPull'], ['devourPull', 'gorgeHowl'], ['clawSweep', 'gorgeHowl']]) assert.notDeepEqual(t.gloomgorge[a], t.gloomgorge[b], `gorge ${a}/${b}`);
  assert.ok(t.gloomgorge.clawSweep[25][0] < -1.2 && t.gloomgorge.clawSweep[25][2] > .5, 'the rake is hauled overhead and follows through low');
  for (const kind of ['thunderhorn', 'siegeBeetle', 'gloomgorge', 'mirrorShade', 'riftLynx']) assert.ok(t[kind]['*'], `${kind} keeps a fallback for borrowed attacks`);
});

test('the Weeping Saint head lifts out of its hands in the coil and snaps down into the stab', () => {
  const head = (a: any) => mean(partVerts(CLOSE_VIEW_PENTAGON_MODELS, 'weepingSaint', 82, mesh(a)));
  const parts = CLOSE_VIEW_PENTAGON_MODELS.weepingSaint.filter((p: any) => p.swing === 82);
  assert.equal(parts.length, 4, 'head, veil and both tears ride the neck');
  const idle = head(actor('weepingSaint', null)), coil = head(actor('weepingSaint', 'longStab', 'windup', .6)), strike = head(actor('weepingSaint', 'longStab', 'windup', .99));
  assert.ok(Math.hypot(coil[0] - idle[0], coil[2] - idle[2]) > .02, 'the head moves in the coil');
  assert.ok(strike[0] > coil[0] + .05, 'and drives forward into the blow');
  // Watched stone stays still.
  const w = (phase: number) => mesh({ kind: 'weepingSaint', x: 0, y: 0, z: 0, yaw: 0, phase, pace: 0, pose: 'idle', amount: 0, watched: true });
  assert.deepEqual([...w(.2)], [...w(2.2)]);
});

test('the Knellkeeper is one body: torso grows from the bell crown, head and arms hang off its shoulders', () => {
  const parts = CLOSE_VIEW_ADVENTURE_MODELS.knellkeeper, data = mesh(actor('knellkeeper', null));
  const bounds = (i: number) => { let off = 0; for (let j = 0; j < i; j++) off += parts[j].mesh.length / MESH_FLOATS * MODEL_FLOATS;
    const n = parts[i].mesh.length / MESH_FLOATS * MODEL_FLOATS, lo = [9, 9, 9], hi = [-9, -9, -9];
    for (let q = off; q < off + n; q += MODEL_FLOATS) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], data[q + k]); hi[k] = Math.max(hi[k], data[q + k]); } return { lo, hi }; };
  const bell = bounds(0), torso = bounds(1), head = bounds(2);
  assert.ok(torso.lo[2] < bell.hi[2] && torso.hi[2] > bell.hi[2] + .15, 'the torso rises out of the crown');
  assert.ok(head.lo[2] < torso.hi[2] + .02 && head.lo[0] < torso.hi[0], 'the head sits on the torso, not beside the bell');
  assert.ok(Math.max(Math.abs(head.lo[1]), Math.abs(head.hi[1])) < .2);
});

test('eyes, lamps and embers use the shared emissive colours, never most of a body', () => {
  const E = new Set(CLOSE_VIEW_ACTOR_LOOK.emissive), hex = (r: number, g: number, b: number) => (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  for (const kind of ['knellkeeper', 'censerWarden', 'lamplighter', 'galleryLurker', 'vinehookLeaper', 'sinkmaw', 'cinderKite', 'spindriftMedusa', 'rimeSentinel', 'hookhanger', 'slagwright']) {
    const d = mesh(actor(kind, null)); let lit = 0;
    for (let i = 0; i < d.length; i += MODEL_FLOATS) if (E.has(hex(d[i + 6], d[i + 7], d[i + 8]))) lit++;
    assert.ok(lit > 0, `${kind} has a lit part`); assert.ok(lit / (d.length / MODEL_FLOATS) <= .62, `${kind} is not mostly lit`);
  }
});

test('standard view: the Knellkeeper raises its hammer in the windup and the Slagwright hauls its ladle for the sweep', () => {
  const trace = (kind: string, attack: string, state: string) => {
    const calls: any[] = [], ctx: any = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (o: any, k: string) => (k in o ? o[k] : (...a: any[]) => { calls.push([k, ...a.map((v) => typeof v === 'number' ? Math.round(v) : v)]); }), set: (o: any, k: string, v: any) => (o[k] = v, true) });
    ADVENTURE_BODIES[kind](ctx, { e: { kind, pack: { attack } }, k: 100, b: 200, u: 50, flip: 1, p: MONSTER_PACK[kind].palette, state, t: 0 });
    return JSON.stringify(calls);
  };
  for (const [kind, attack] of [['knellkeeper', 'bellToll'], ['slagwright', 'heavySweep']]) {
    const idle = trace(kind, attack, 'idle'), wind = trace(kind, attack, 'windup'), hit = trace(kind, attack, 'attack');
    assert.notEqual(wind, idle, `${kind} windup`); assert.notEqual(hit, wind, `${kind} strike`); assert.notEqual(hit, idle, `${kind} strike reads`);
  }
});

test('standard view limbs follow the attack clock: drawn back and held in the windup, struck, then settled; rest pose untouched', () => {
  const trace = (kind: string, pack: any, state: string) => {
    const calls: any[] = [], ctx: any = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (o: any, k: string) => (k in o ? o[k] : (...a: any[]) => { calls.push([k, ...a.map((v) => typeof v === 'number' ? Math.round(v * 10) : v)]); }), set: (o: any, k: string, v: any) => (o[k] = v, true) });
    ADVENTURE_BODIES[kind](ctx, { e: { kind, pack }, k: 100, b: 200, u: 50, flip: 1, p: MONSTER_PACK[kind].palette, state, t: 0 });
    return JSON.stringify(calls);
  };
  assert.ok(ADVENTURE_SPRITE.limb.steps <= 4, 'a few frames per phase keeps the sprite cache small');
  for (const [kind, id] of [['slagwright', 'heavySweep'], ['knellkeeper', 'bellToll'], ['rimeSentinel', 'poleThrust'], ['lamplighter', 'poleThrust'], ['galleryLurker', 'clawSweep']]) {
    const A = ATTACK_MODULES[id], at = (phase: string, p: number) => ({ attack: id, phase, t: (phase === 'windup' ? A.windup : A.recover) * (1 - p) });
    assert.equal(trace(kind, {}, 'idle'), trace(kind, { state: 'move' }, 'idle'), `${kind} rest`);
    const early = trace(kind, at('windup', .3), 'windup'), held = trace(kind, at('windup', .8), 'windup');
    assert.notEqual(early, held, `${kind} draws back over the windup`);
    assert.equal(held, trace(kind, at('windup', .99), 'windup'), `${kind} holds the draw-back to the blow`);
    const hit = trace(kind, at('recover', .05), 'attack'), settled = trace(kind, at('recover', .99), 'attack');
    assert.notEqual(hit, held, `${kind} strikes`); assert.notEqual(settled, hit, `${kind} settles`);
    assert.equal(hit, trace(kind, at('recover', .15), 'attack'), `${kind} follows through`);
  }
});
