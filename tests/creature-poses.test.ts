// Creature root motion (Tim, 2026-11-14: ordinary creatures "don't really have good animations for attacks. They just stand next
// to me"). Phase B step 0: close-view-models.ts CREATURE_POSE / creatureRootPose, a shared layer under every ordinary 3D creature
// that crouches or coils it in the windup, drives its root into the blow, leans and twists into the swing, kicks back on contact
// and settles, all on the creature's real attack clocks. Presentation only; no triangles, draw calls or per-frame objects added.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCombatant, MELEE_PATTERNS, enemyMeleeGeometry } from '../src/combat.ts';
import { MONSTER_PACK, ATTACK_MODULES, freshPackState } from '../src/monster-pack.ts';
import { ACTOR_PRESENTATION, nativeCreatureCoverage, actorModelKey } from '../src/actor-presentation.ts';
import { closeViewMonsterAction, closeViewRootAttack, closeViewRootReach } from '../src/close-view.ts';
import { CREATURE_POSE, creatureRootPose, creaturePoseFamily, creaturePoseStyle, modelSupported, modelTriangleCount,
  writeCloseViewModel, MODEL_FLOATS, MODEL_MAX_VERTICES } from '../src/close-view-models.ts';

const G_KINDS = Object.entries(ACTOR_PRESENTATION).filter(([, p]) => p.action === 'ordinary').map(([k]) => k);
const S_KINDS = Object.entries(ACTOR_PRESENTATION).filter(([k, p]) => p.action === 'pack' && modelSupported(k)).map(([k]) => k);
const FOUNDRY_KEYS = Object.keys(CREATURE_POSE.kinds).filter(k => k.startsWith('foundry-'));
const own = (kind: string) => MONSTER_PACK[kind].attacks.filter((id: string) => !ATTACK_MODULES[id].passive);

// The actor close-view.ts builds for a creature (buildActorModels), from the real presentation of its real state.
function actorOf(e: any, kind: string, windupDuration: number | null = null, extra: any = {}) {
  const a: any = closeViewMonsterAction(e, kind, windupDuration);
  const pose = a.semanticPose ? 'semantic' : a.attack ? 'attack' : a.winding ? 'windup' : a.leapActive ? 'jump' : 'idle';
  const amount = a.winding ? a.windupAmount ?? 0 : a.attack ? a.amount ?? 0 : 0;
  const id = closeViewRootAttack(e, a);
  return { kind: actorModelKey(e), x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose, amount, reduceMotion: false,
    action: a.semantic?.action, actionFamily: a.semantic?.family, actionPhase: a.semantic?.phase, actionProgress: a.semantic?.progress || 0,
    rootAttack: id, attackReach: closeViewRootReach(e, id), eliteWindup: e.eliteWindup || 0, eliteActive: e.eliteActive || 0, ...extra };
}
// A pack creature `p` of the way through `phase` of attack `id` (pack.t counts the phase down, as monster-pack.ts does).
function pack(kind: string, id: string, phase: string, p: number) {
  const e: any = createCombatant(kind, 0, 0), spec = ATTACK_MODULES[id];
  const dur = phase === 'windup' ? spec.windup : phase === 'recover' ? spec.recover : phase === 'active' ? spec.active || 1 : ({ strike: .32, track: 1, lock: .45, travel: 2.6, erupt: .75 } as any)[phase];
  e.pack = { ...freshPackState(), state: 'attack', attack: id, phase, t: dur * (1 - p), data: { aim: { x: 1, y: 0 } } };
  return e;
}
// An ordinary creature winding up its real pattern `p` of the way, or `q` of the way through its e.strike contact countdown.
function ordinary(kind: string, stage: 'windup' | 'strike', p: number) {
  const e: any = createCombatant(kind, 0, 0), id = e.meleePatterns[0] || null, pattern = id && MELEE_PATTERNS[id], dur = pattern?.telegraph || 1;
  if (stage === 'windup') { e.telegraph = dur * (1 - p) || 1e-6; e.attackAim = { x: 1, y: 0 }; if (pattern) { e.meleePhase = { id, stage: 0, aim: { x: 1, y: 0 }, target: { x: 2, y: 0 } }; e.threatRange = pattern.range; } }
  else { e.attackAim = { x: 1, y: 0 }; if (pattern) e.strikeGeometry = enemyMeleeGeometry(e, { id, aim: { x: 1, y: 0 } }); e.strike = .24 * (1 - p); }
  return actorOf(e, kind, stage === 'windup' ? dur : null);
}
const size = (r: any) => Math.abs(r.lunge) + r.squash + Math.abs(r.lean) + Math.abs(r.twist) + Math.abs(r.lift);
const copy = (r: any) => ({ ...r });
const pose = (a: any) => copy(creatureRootPose(a));

test('every ordinary 3D creature has a body family, and every family and style is in the tables', () => {
  for (const kind of [...G_KINDS, ...S_KINDS, ...FOUNDRY_KEYS]) {
    assert.ok(modelSupported(kind), `${kind} is a 3D model`);
    const f = creaturePoseFamily(kind); assert.ok(f && CREATURE_POSE.families[f], `${kind} has a family (${f})`);
  }
  for (const f of Object.values(CREATURE_POSE.families)) assert.ok(CREATURE_POSE.styles[f.style], f.style);
  for (const s of [...Object.values(CREATURE_POSE.attacks), ...Object.values(CREATURE_POSE.semantic)]) assert.ok(CREATURE_POSE.styles[s], s);
  const want: any = { bite: 'lunge', longStab: 'lunge', poleThrust: 'lunge', clawSweep: 'sweep', heavySweep: 'sweep', giantSwing: 'sweep', leapSlam: 'leap', vineVault: 'leap',
    diveBomb: 'dive', sigilScatter: 'cast', censerLob: 'cast', lampFlare: 'cast', prismBeam: 'cast', sweepBeam: 'cast', ramCharge: 'ram', burrowAmbush: 'burrow',
    mortarVolley: 'recoil', devourPull: 'pull', webSpit: 'spray', thornDarts: 'spray', stillnessCurse: 'dread' };
  for (const [id, s] of Object.entries(want)) assert.equal(creaturePoseStyle('biped', id, ''), s, id);
  assert.equal(creaturePoseStyle('plant', 'noSuchAttack', ''), CREATURE_POSE.families.plant.style, 'an unknown attack takes the family default');
  assert.equal(creaturePoseFamily('player'), null); assert.equal(creaturePoseFamily('wayfarer'), null);
});

test('pack kinds: a root offset in the windup and the strike of every real attack, and at rest once it has recovered', () => {
  const fails: string[] = [];
  for (const kind of S_KINDS) for (const id of own(kind)) {
    const phased = CREATURE_POSE.phased.includes(id), spec = ATTACK_MODULES[id];
    const wind = pose(actorOf(pack(kind, id, 'windup', .5), kind));
    const strike = phased ? pose(actorOf(pack(kind, id, id === 'blinkStrike' ? 'strike' : id === 'diveBomb' ? 'lock' : 'erupt', .6), kind)) : pose(actorOf(pack(kind, id, 'windup', .96), kind));
    const hold = spec.active ? pose(actorOf(pack(kind, id, 'active', .5), kind)) : null;
    const contact = pose(actorOf(pack(kind, id, 'recover', .1), kind));
    const done = pose(actorOf(pack(kind, id, 'recover', 1), kind));
    if (!(size(wind) > .02)) fails.push(`${kind}/${id} windup ${size(wind)}`);
    if (!(size(strike) > .02)) fails.push(`${kind}/${id} strike ${size(strike)}`);
    if (hold && !(size(hold) > .02)) fails.push(`${kind}/${id} active ${size(hold)}`);
    if (!(size(contact) > .02)) fails.push(`${kind}/${id} contact ${size(contact)}`);
    if (size(done) !== 0) fails.push(`${kind}/${id} not at rest after recover ${JSON.stringify(done)}`);
    if (!phased && !(strike.stage === 2)) fails.push(`${kind}/${id} strikes in the windup's tail`);
  }
  assert.equal(fails.length, 0, fails.join('\n'));
});

test('ordinary kinds: their real pattern winds up, strikes and recovers on the telegraph and e.strike clocks', () => {
  for (const kind of G_KINDS) {
    const wind = pose(ordinary(kind, 'windup', .5)), tail = pose(ordinary(kind, 'windup', .95)), hit = pose(ordinary(kind, 'strike', 0)), done = pose(ordinary(kind, 'strike', 1));
    assert.equal(wind.stage, 1, `${kind} coils`); assert.ok(size(wind) > .02, `${kind} windup ${size(wind)}`);
    assert.equal(tail.stage, 2, `${kind} strikes`); assert.ok(size(tail) > .02, `${kind} strike`);
    assert.ok(size(hit) > .02 && hit.stage === 3, `${kind} holds its extension at contact`);
    assert.equal(size(done), 0, `${kind} back at rest after the strike countdown`);
    const e: any = createCombatant(kind, 0, 0);
    assert.equal(wind.style, creaturePoseStyle(creaturePoseFamily(kind), e.meleePatterns[0] || 'ranged', ''), `${kind} takes its pattern's style`);
  }
});

test('Foundry bodies: their windup and contact (stab, slam, sweep, ranged) move the root', () => {
  for (const kind of FOUNDRY_KEYS) for (const family of ['stab', 'slam', 'sweep', 'ranged']) {
    const a = (phase: string, p: number) => ({ kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'semantic', amount: 0, action: 'meleeSwipe', actionFamily: family, actionPhase: phase, actionProgress: p, attackReach: 2 });
    assert.ok(size(pose(a('windup', .5))) > .02 && size(pose(a('recover', .1))) > .02, `${kind}/${family}`);
    assert.equal(size(pose(a('recover', 1))), 0, `${kind}/${family} rest`);
  }
});

test('the lunge never travels past the attack\'s real reach', () => {
  const S = CREATURE_POSE.reachShare;
  for (const kind of S_KINDS) for (const id of own(kind)) for (const phase of ['windup', 'strike', 'lock', 'active', 'recover']) for (const p of [0, .3, .82, .9, .96, 1]) {
    const e = pack(kind, id, phase, p), a = actorOf(e, kind), r = pose(a);
    assert.ok(a.attackReach > 0, `${kind}/${id} reach`);
    assert.ok(r.lunge <= a.attackReach * S + 1e-9 && r.lunge <= ATTACK_MODULES[id].range[1], `${kind}/${id} ${phase} ${p}: ${r.lunge} of ${a.attackReach}`);
  }
  for (const kind of G_KINDS) for (const p of [.5, .9, .97, 1]) {
    const a = ordinary(kind, 'windup', p), r = pose(a);
    assert.ok(r.lunge <= a.attackReach * S + 1e-9, `${kind} ${p}: ${r.lunge} of ${a.attackReach}`);
  }
  // a short reach clamps a long-lunging family
  const a: any = { kind: 'serpent' in {} ? '' : 'coilStalker', pose: 'semantic', action: 'bite', actionFamily: 'bite', actionPhase: 'active', actionProgress: .5, attackReach: .4 };
  assert.ok(Math.abs(pose(a).lunge - .4 * S) < 1e-9);
});

test('deterministic: the same clocks give the same pose and the same vertices', () => {
  const a = actorOf(pack('riftLynx', 'clawSweep', 'windup', .97), 'riftLynx'), b = actorOf(pack('riftLynx', 'clawSweep', 'windup', .97), 'riftLynx');
  assert.deepEqual(pose(a), pose(b));
  const o1 = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), o2 = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
  const n1 = writeCloseViewModel(o1, 0, a); writeCloseViewModel(o2, 0, { kind: 'ashling', x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'idle', amount: 0 }); const n2 = writeCloseViewModel(o2, 0, b);
  assert.equal(n1, n2); assert.deepEqual(o1, o2);
});

test('the drawn root translates: at full extension the body stands lunge tiles forward of the same pose without root motion', () => {
  for (const [kind, id] of [['thunderhorn', 'bite'], ['veilSpinner', 'bite'], ['riftLynx', 'blinkStrike'], ['lamplighter', 'poleThrust']]) {
    const a: any = actorOf(pack(kind, id, 'active', .5), kind); a.actionPhase = 'active';
    const r = pose(a), out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), n = writeCloseViewModel(out, 0, a);
    const ref = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS); writeCloseViewModel(ref, 0, { ...a, attackReach: 1e-9 });
    // attackReach ~0 leaves every component but the lunge, so the difference is the lunge, along +X (yaw 0)
    let dx = 0, dy = 0; for (let i = 0; i < n; i += MODEL_FLOATS) { dx += out[i] - ref[i]; dy += out[i + 1] - ref[i + 1]; } dx /= n / MODEL_FLOATS; dy /= n / MODEL_FLOATS;
    // forward along its facing, which the twist has turned
    assert.ok(r.lunge > .05 && Math.abs(dx - r.lunge * Math.cos(r.twist)) < 1e-4 && Math.abs(dy - r.lunge * Math.sin(r.twist)) < 1e-4, `${kind}: drawn forward ${dx}, ${dy}, lunge ${r.lunge}`);
  }
});

test('Reduced Motion holds a calm pose: no lunge or recoil translation, half the crouch, lean and twist; the attack still reads', () => {
  for (const kind of S_KINDS) for (const id of own(kind)) for (const [phase, p] of [['windup', .5], ['windup', .96], ['recover', .1], ['active', .5]] as const) {
    if (phase === 'active' && !ATTACK_MODULES[id].active) continue;
    const full = actorOf(pack(kind, id, phase, p), kind), calm = { ...full, reduceMotion: true }, f = pose(full), c = pose(calm);
    assert.equal(c.lunge === 0 ? 0 : c.lunge, 0, `${kind}/${id} ${phase}: no translation`);
    for (const k of ['lean', 'twist', 'lift']) assert.ok(Math.abs(c[k] - f[k] * CREATURE_POSE.reduced.scale) < 1e-9, `${kind}/${id} ${k}`);
    assert.ok(c.squash <= f.squash + 1e-9, `${kind}/${id} squash`);
    if (phase === 'windup' && p === .5) assert.ok(size(c) > .01, `${kind}/${id} still reads`);
  }
});

test('triangle counts are unchanged per kind, and a posed creature writes exactly its triangles', () => {
  const pinned: any = { ashling: 160, hollowMarshal: 224, weepingSaint: 148, mirrorShade: 104, censerWarden: 196, lamplighter: 196, rimeSentinel: 220, ashenHound: 224, riftLynx: 192, thunderhorn: 176,
    'foundry-quadruped': 176, glassMite: 168, pallidCrawler: 178, veilSpinner: 202, siegeBeetle: 220, galleryLurker: 220, lakeGlider: 184, hookhanger: 174, coilStalker: 176, sunderjaw: 200, sinkmaw: 208,
    'foundry-segmented': 192, cinderWisp: 140, veilMoth: 120, hangedChoir: 204, graveLantern: 160, cinderSeraph: 232, lumenWraith: 154, gloomwisp: 180, cinderKite: 176, spindriftMedusa: 146,
    'foundry-floating': 160, amalgam: 192, gnawingMaw: 168, gloomgorge: 220, 'foundry-tentacled': 184, 'foundry-tentacled-3': 152, 'foundry-tentacled-6': 200, sparkWarden: 196, voidSentinel: 204,
    knellkeeper: 172, prismStilt: 160, slagwright: 170, 'foundry-geometric': 152, 'foundry-biomechanical': 204, 'foundry-biomechanical-3': 204, 'foundry-biomechanical-6': 228, rootBrute: 204,
    vinehookLeaper: 218, thornspitterBloom: 178 };
  assert.deepEqual(Object.keys(pinned).sort(), Object.keys(CREATURE_POSE.kinds).sort());
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
  for (const [kind, n] of Object.entries(pinned)) {
    assert.equal(modelTriangleCount(kind), n, kind);
    const end = writeCloseViewModel(out, 0, { kind, x: 0, y: 0, z: 0, yaw: 0, phase: 0, pace: 0, pose: 'semantic', amount: 0, action: 'bite', actionFamily: 'bite', actionPhase: 'windup', actionProgress: .97, attackReach: 2 });
    assert.equal(end, n * 3 * MODEL_FLOATS, `${kind} writes ${n} triangles`);
  }
});

test('no allocation in the hot path: one scratch record, and nothing built per call', () => {
  const a = actorOf(pack('thunderhorn', 'ramCharge', 'windup', .5), 'thunderhorn'), first = creatureRootPose(a);
  for (let i = 0; i < 2000; i++) { a.actionProgress = (i % 100) / 100; assert.equal(creatureRootPose(a), first); }
  const src = readFileSync(new URL('../src/close-view-models.ts', import.meta.url), 'utf8');
  for (const name of ['creatureRootPose', 'creaturePoseStyle', 'poseEase']) {
    const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); let d = 0, j = src.indexOf('{', i); const s = j;
    for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
    assert.ok(!/\bnew\s|=>|\[\s*\]|\.map\(|\.filter\(|\.slice\(|\{\s*[A-Za-z_$]+\s*:|\.\.\./.test(src.slice(s, j + 1)), `${name} allocates nothing`);
  }
});

test('an elite action keeps the body: no card fallback, and it braces on the gravity clocks', () => {
  const cap = (e: any) => ({ enemy: e, nativeDecorations() {}, nativeFloor() {}, nativePackEffects() {} });
  for (const kind of ['ashling', 'rootBrute', 'riftLynx', 'veilSpinner']) {
    const e: any = createCombatant(kind, 0, 0); e.eliteWindup = .6;
    assert.notEqual(nativeCreatureCoverage(e, cap(e), { mesh: true, attachments: true }), 'elite-action', `${kind}: windup`);
    const wind = pose(actorOf(e, kind)); assert.equal(wind.stage, 1); assert.ok(size(wind) > .02, `${kind} braces`); assert.equal(wind.style, CREATURE_POSE.elite.style);
    e.eliteWindup = 0; e.eliteActive = 1;
    assert.notEqual(nativeCreatureCoverage(e, cap(e), { mesh: true, attachments: true }), 'elite-action', `${kind}: active`);
    assert.equal(pose(actorOf(e, kind)).stage, 3, `${kind} holds the pull`);
    e.eliteActive = .01; assert.equal(pose(actorOf(e, kind)).stage, 4, `${kind} settles at the pull's end`);
    e.eliteActive = 0; assert.equal(size(pose(actorOf(e, kind))), 0);
  }
});

test('the Grave Lantern\'s stillness curse is a slow dread pulse on its real clock, at rest when the curse falls', () => {
  const at = (t: number) => pose({ kind: 'graveLantern', pose: 'idle', stillness: t, amount: 0 });
  assert.equal(size(at(0)), 0);
  assert.ok(size(at(CREATURE_POSE.stillness.fires * .5)) > .02 && at(.6).style === 'dread');
  assert.ok(size(at(CREATURE_POSE.stillness.fires)) < 1e-6, 'back at rest when it falls');
  assert.ok(size(at(.3)) < size(at(.62)), 'swells toward the middle');
});
