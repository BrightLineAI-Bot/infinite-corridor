// Close View forms pass (Tim, 2026-11-15: "a triple-A feel" for every ordinary creature, "even trash mobs should feel real",
// "without exceeding the phone budget"). The floating, blob, construct and plant bodies, the Arcology bodies and the Foundry
// forms were reshaped at exactly their pinned triangle counts, and each attack has its own authored joint rows on the shared
// root clock. Presentation only: no gameplay number, timing, save field or allocation is added.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, ATTACK_MODULES, freshPackState } from '../src/monster-pack.ts';
import { actorModelKey } from '../src/actor-presentation.ts';
import { closeViewMonsterAction, closeViewRootAttack, closeViewRootReach } from '../src/close-view.ts';
import { CREATURE_POSE, modelTriangleCount, writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES } from '../src/close-view-models.ts';
import { CLOSE_VIEW_ADVENTURE_MODELS, ADVENTURE_JOINT_POSE } from '../src/close-view-adventure-models.ts';
import { CLOSE_VIEW_FOUNDRY_MODELS, CLOSE_VIEW_FOUNDRY_VARIANTS, FOUNDRY_PALETTES } from '../src/close-view-foundry-models.ts';
import { CLOSE_VIEW_PENTAGON_MODELS } from '../src/close-view-pentagon-models.ts';
import { ADVENTURE_BODIES, ADVENTURE_SPRITE, attackLimbs } from '../src/adventure-creature-render.ts';

const PINS: Record<string, number> = { cinderWisp: 136, veilMoth: 116, hangedChoir: 204, graveLantern: 152, cinderSeraph: 214, lumenWraith: 152, gloomwisp: 166,
  cinderKite: 176, spindriftMedusa: 146, amalgam: 192, gnawingMaw: 158, gloomgorge: 208, sparkWarden: 184, voidSentinel: 198, knellkeeper: 172, prismStilt: 160,
  slagwright: 170, rootBrute: 204, vinehookLeaper: 218, thornspitterBloom: 178, glassMite: 166, 'foundry-quadruped': 176, 'foundry-floating': 160,
  'foundry-segmented': 192, 'foundry-tentacled': 184, 'foundry-geometric': 152, 'foundry-biomechanical': 204, 'foundry-tentacled-3': 152,
  'foundry-tentacled-6': 200, 'foundry-biomechanical-3': 204, 'foundry-biomechanical-6': 228 };
const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
function actorOf(e: any, kind: string) {
  const a: any = closeViewMonsterAction(e, kind, null);
  const pose = a.semanticPose ? 'semantic' : a.attack ? 'attack' : a.winding ? 'windup' : 'idle', id = closeViewRootAttack(e, a);
  return { kind: actorModelKey(e), x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose, amount: a.winding ? a.windupAmount ?? 0 : a.attack ? a.amount ?? 0 : 0,
    reduceMotion: false, action: a.semantic?.action, actionFamily: a.semantic?.family, actionPhase: a.semantic?.phase, actionProgress: a.semantic?.progress || 0,
    rootAttack: id, attackReach: closeViewRootReach(e, id) };
}
function pack(kind: string, id: string, phase: string, p: number) {
  const e: any = createCombatant(kind, 0, 0), spec = ATTACK_MODULES[id];
  const dur = phase === 'windup' ? spec.windup : phase === 'recover' ? spec.recover : ({ strike: .32 } as any)[phase];
  e.pack = { ...freshPackState(), state: 'attack', attack: id, phase, t: dur * (1 - p), data: { aim: { x: 1, y: 0 } } };
  return actorOf(e, kind);
}
const written = (actor: any) => out.slice(0, writeCloseViewModel(out, 0, actor));
const PACK_KINDS = Object.keys(PINS).filter(k => MONSTER_PACK[k] && !k.startsWith('foundry-'));

test('every reshaped body writes exactly its pinned triangles (reshaped, never added)', () => {
  for (const [kind, n] of Object.entries(PINS)) {
    assert.equal(modelTriangleCount(kind), n, kind);
    assert.equal(writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'idle', amount: 0 }), n * 3 * MODEL_FLOATS, kind);
  }
  for (const k of Object.keys(PINS)) assert.ok(CREATURE_POSE.kinds[k] || k === 'glassMite', `${k} keeps its body family`);
});

test('each pack attack winds up, lands and recovers through distinct poses, and two attacks never share one contact pose', () => {
  for (const kind of PACK_KINDS) {
    const ids = MONSTER_PACK[kind].attacks.filter((id: string) => !ATTACK_MODULES[id].passive), contacts: Float32Array[] = [];
    for (const id of ids) {
      const coil = written(pack(kind, id, 'windup', .55)), land = written(pack(kind, id, ['diveBomb'].includes(id) ? 'strike' : 'windup', ['diveBomb'].includes(id) ? .9 : .97)), back = written(pack(kind, id, 'recover', .2));
      assert.notDeepEqual([...coil], [...land], `${kind}/${id}: the blow differs from the wind-up`);
      assert.notDeepEqual([...land], [...back], `${kind}/${id}: the recovery moves on from the blow`);
      contacts.push(land);
    }
    for (let i = 1; i < contacts.length; i++) assert.notDeepEqual([...contacts[i]], [...contacts[0]], `${kind}: ${ids[i]} has its own contact pose`);
  }
});

test('the Thornspitter bloom rides its stalk as one piece, so nothing comes away from it as it rears and drives', () => {
  const parts = CLOSE_VIEW_ADVENTURE_MODELS.thornspitterBloom, bloom = parts.filter((p: any) => p.swing === 31);
  assert.ok(bloom.length >= 18, 'stalk, bulb, maw, jaws, petals, leaves and thorns');
  for (const p of bloom) { assert.equal(p.px, 0); assert.equal(p.pz, .2); }
  assert.ok(parts.every((p: any) => p.swing === 31 || p.swing === 0 || (p.swing >= 55 && p.swing <= 58)), 'only the mound and the roots stay off the stalk joint');
  for (const id of ['thornDarts', 'bite']) assert.deepEqual(Object.keys(ADVENTURE_JOINT_POSE.thornspitterBloom[id]).filter(k => !/^5[5-8]$/.test(k)), ['31'], id);
});

test('Foundry forms keep only their palette colours (so all five palettes recolour the whole body) and their variant structure', () => {
  const base = new Set(FOUNDRY_PALETTES[0]);
  for (const [key, parts] of Object.entries({ ...CLOSE_VIEW_FOUNDRY_MODELS, ...CLOSE_VIEW_FOUNDRY_VARIANTS })) for (const p of parts as any[]) {
    const m = p.mesh, rgb = (Math.round(m[6] * 255) << 16) | (Math.round(m[7] * 255) << 8) | Math.round(m[8] * 255);
    assert.ok(base.has(rgb), `${key}: ${rgb.toString(16)} is a palette colour`);
  }
  assert.equal(CLOSE_VIEW_FOUNDRY_MODELS['foundry-tentacled'].filter((p: any) => p.swing >= 52).length, 5);
  assert.equal(CLOSE_VIEW_FOUNDRY_MODELS['foundry-biomechanical'].filter((p: any) => p.swing >= 75).length, 3);
});

test('the Lumen Wraith reaches with its sleeves for the bite and frames its lens for the beam; the Choir singers have heads', () => {
  const wraith = CLOSE_VIEW_PENTAGON_MODELS.lumenWraith;
  assert.equal(wraith.filter((p: any) => p.swing === 50 || p.swing === 51).length, 2, 'two sleeves');
  const sleeve = (id: string, phase: string, p: number) => { const d = written(pack('lumenWraith', id, phase, p)); let x = -Infinity; for (let v = 104 * 3; v < 120 * 3; v++) x = Math.max(x, d[v * MODEL_FLOATS]); return x; };
  assert.ok(sleeve('bite', 'windup', .97) > sleeve('bite', 'windup', .55) + .1, 'the bite reaches forward');
  assert.equal(CLOSE_VIEW_PENTAGON_MODELS.hangedChoir.length, 2 + 4 * 7, 'beam, cord and four singers of seven parts');
});

test('the per-frame path is unchanged: no new allocation in the joint evaluator', () => {
  const src = readFileSync(new URL('../src/close-view-adventure-models.ts', import.meta.url), 'utf8'), i = src.indexOf('export function adventureJointPose(');
  assert.ok(i > 0); const body = src.slice(i, src.indexOf('\n}', i));
  assert.ok(!/\bnew\s|\[\s*\]|\.map\(|\.filter\(|\.slice\(|\.\.\./.test(body), 'adventureJointPose allocates nothing');
});

test('Standard View limbs on the shared limb clock: the forms pivots draw back, strike and settle, and the rest pose is unchanged', () => {
  const trace = (kind: string, pack: any, state: string) => {
    const calls: any[] = [], ctx: any = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (o: any, k: string) => (k in o ? o[k] : (...a: any[]) => { calls.push([k, ...a.map((v) => typeof v === 'number' ? Math.round(v * 10) : v)]); }), set: (o: any, k: string, v: any) => (o[k] = v, true) });
    ADVENTURE_BODIES[kind](ctx, { e: { kind, pack }, k: 100, b: 200, u: 50, flip: 1, p: MONSTER_PACK[kind].palette, state, t: 0 });
    return JSON.stringify(calls);
  };
  // The stalk, talons, tendrils and front leg pivot on the shared clock (adventure-creature-render.ts attackLimbs).
  for (const [kind, id] of [['thornspitterBloom', 'thornDarts'], ['cinderKite', 'bite'], ['spindriftMedusa', 'tendrilRain'], ['prismStilt', 'bite'], ['slagwright', 'slagPour']]) {
    const A = ATTACK_MODULES[id], at = (phase: string, p: number) => ({ attack: id, phase, t: (phase === 'windup' ? A.windup : A.recover) * (1 - p) });
    const rest = trace(kind, {}, 'idle'), held = trace(kind, at('windup', .9), 'windup'), hit = trace(kind, at('recover', .05), 'attack');
    assert.equal(rest, trace(kind, { state: 'move' }, 'idle'), `${kind} rest`);
    assert.notEqual(held, rest, `${kind} draws back`); assert.notEqual(hit, held, `${kind} strikes`);
    assert.equal(trace(kind, at('recover', .99), 'attack'), trace(kind, at('recover', .995), 'attack'), `${kind} settles`);
  }
  const out: any = {}; attackLimbs({}, 'idle', out); assert.equal(out.dq, 0, 'no frame key at rest, so the cache key is today\'s');
  assert.ok(ADVENTURE_SPRITE.limb.steps <= 4);
});
