import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
import { CORE_JOINT_POSE } from '../src/close-view-arcology-models.ts';
import { ACTOR_BODY_HEIGHT } from '../src/actor-contact.ts';
import { meleePatternsFor } from '../src/combat.ts';
import { BEHAVIOUR } from '../src/enemy-behaviour.ts';
import { CORE_LIMBS, coreLimbPose, coreLimbAngle, CORE_SPRITE, drawCoreCreature, coreSpriteCount, isCoreSpriteKind } from '../src/monster-render.ts';
import { ACTION_MOTION } from '../src/action-motion.ts';

// Creature visual pass (Tim, 2026-11-15): the core bestiary's per-attack signatures, its budgets and its Standard View bodies.
const KINDS = { ashling: 158, hollowMarshal: 220, ashenHound: 216, coilStalker: 172, glassMite: 166, pallidCrawler: 168 };
const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
const base = (kind, extra = {}) => ({ kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: 'idle', amount: 0, ...extra });
function frame(kind, extra) { const n = writeCloseViewModel(out, 0, base(kind, extra)); return out.slice(0, n); }
function zRange(data) { let lo = Infinity, hi = -Infinity; for (let i = 2; i < data.length; i += MODEL_FLOATS) { lo = Math.min(lo, data[i]); hi = Math.max(hi, data[i]); } return [lo, hi]; }
function diff(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i])); return d; }
// the moves each ordinary kind can really use (its pattern table and its behaviour family's moves)
function moves(kind) {
  const row = BEHAVIOUR.kinds[kind], extra = Array.isArray(row) ? row[1]?.moves || [] : [];
  return [...new Set([...meleePatternsFor(kind), ...extra])].filter((m) => ['lunge', 'longReach', 'zigzag', 'hop', 'slam'].includes(m));
}
const ORDINARY = ['ashling', 'hollowMarshal', 'ashenHound', 'coilStalker', 'glassMite'];
const REACH = 2;

test('budgets: every core body is exactly its pinned triangle count', () => {
  for (const [kind, n] of Object.entries(KINDS)) assert.equal(modelTriangleCount(kind), n, kind);
});

test('each ordinary kind has its own authored row for every move it uses, and the moves read differently', () => {
  for (const kind of ORDINARY) {
    const table = CORE_JOINT_POSE[kind], used = moves(kind);
    assert.ok(used.length >= 2, `${kind} has more than one move`);
    for (const m of used) assert.ok(Object.hasOwn(table, m), `${kind} authors ${m}`);
    // at the height of the wind-up, the moves hold visibly different anticipation poses
    const coils = used.map((m) => frame(kind, { pose: 'windup', amount: .8, rootAttack: m, attackReach: REACH }));
    for (let i = 1; i < coils.length; i++) assert.ok(diff(coils[0], coils[i]) > .08, `${kind}: ${used[0]} and ${used[i]} wind up alike`);
  }
  assert.ok(Object.hasOwn(CORE_JOINT_POSE.pallidCrawler, 'bite') && Object.hasOwn(CORE_JOINT_POSE.pallidCrawler, 'leapSlam'));
  assert.notDeepEqual(CORE_JOINT_POSE.pallidCrawler.bite, CORE_JOINT_POSE.pallidCrawler.leapSlam);
});

test('every attack moves through wind-up, contact and recovery, and settles back toward rest', () => {
  for (const kind of ORDINARY) for (const m of moves(kind)) {
    const r = { rootAttack: m, attackReach: REACH }, rest = frame(kind, {});
    const coil = frame(kind, { pose: 'windup', amount: .8, ...r }), hit = frame(kind, { pose: 'windup', amount: 1, ...r });
    const hold = frame(kind, { pose: 'attack', amount: .25, ...r }), late = frame(kind, { pose: 'attack', amount: .97, ...r });
    assert.ok(diff(rest, coil) > .1, `${kind}/${m} anticipation`);
    assert.ok(diff(coil, hit) > .1, `${kind}/${m} strike`);
    assert.ok(diff(hit, hold) < 1e-4, `${kind}/${m} holds the extension at contact`);
    assert.ok(diff(rest, late) < diff(rest, hold), `${kind}/${m} recovers`);
  }
});

test('no attack pose sinks into the floor, and rest and gait stay inside the contact envelope', () => {
  for (const kind of ORDINARY) {
    const top = ACTOR_BODY_HEIGHT.kinds[kind];
    for (const p of [0, 1.3, 2.6, 4]) for (const pace of [0, 1]) assert.ok(zRange(frame(kind, { pace, phase: p }))[1] <= top + 1e-6, `${kind} rest/gait under ${top}`);
    for (const m of moves(kind)) for (const [pose, amount] of [['windup', .3], ['windup', .6], ['windup', .8], ['windup', .9], ['windup', 1], ['attack', .25], ['attack', .5], ['attack', .8]]) {
      const [lo] = zRange(frame(kind, { pose, amount, rootAttack: m, attackReach: REACH }));
      // the shared root lean tips a serpent's last coil about .09 under while it rears (as before this pass); nothing goes deeper
      assert.ok(lo > -.1, `${kind}/${m} ${pose} ${amount}: ${lo.toFixed(3)} under the floor`);
    }
  }
});

test("the Marshal's halberd turns about its fist: the chop raises it behind the helm and brings it down in front", () => {
  // brass (the blade, the crest and the gorget): its rearmost and foremost reach along the facing
  const brassX = (data) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < data.length; i += MODEL_FLOATS) if (Math.abs(data[i + 6] - 0xc6 / 255) < .01 && Math.abs(data[i + 7] - 0xa4 / 255) < .01) { lo = Math.min(lo, data[i]); hi = Math.max(hi, data[i]); } return [lo, hi]; };
  const r = { rootAttack: 'slam', attackReach: REACH }, rest = brassX(frame('hollowMarshal', {}));
  assert.ok(brassX(frame('hollowMarshal', { pose: 'windup', amount: .8, ...r }))[0] < rest[0] - .3, 'the blade is cocked back behind the helm');
  const down = brassX(frame('hollowMarshal', { pose: 'windup', amount: 1, ...r }))[1];
  assert.ok(down > rest[1] + .2, `the chop lands in front (${down.toFixed(2)} from ${rest[1].toFixed(2)})`);
});

test('Standard View: limbs wind up, strike and recover on the attack clocks, and flinch back', () => {
  const STRIKE = ACTION_MOTION.monsterStrikeMs / 1000;
  for (const kind of ORDINARY) {
    const limbs = Object.keys(CORE_LIMBS.kinds[kind]['*']);
    assert.ok(limbs.length >= 2, `${kind} has articulated limbs`);
    for (const id of moves(kind)) {
      const e: any = { kind, x: 3, y: 4, telegraph: 0, strike: 0, flinch: 0, meleePhase: { id } };
      const at = (o, limb, quiet = true) => { Object.assign(e, { telegraph: 0, strike: 0, flinch: 0 }, o); return coreLimbAngle(coreLimbPose(e, 0, false), limb) - (quiet ? coreLimbAngle(coreLimbPose({ ...e, telegraph: 0, strike: 0, flinch: 0 }, 0, false), limb) : 0); };
      const full = CORE_LIMBS.windups[id], lead = limbs[0];
      const early = at({ telegraph: full * .9 }, lead), coil = at({ telegraph: full * (1 - CORE_LIMBS.snapAt) }, lead), hit = at({ strike: STRIKE * .95 }, lead), done = at({ strike: STRIKE * .01 }, lead);
      assert.ok(Math.abs(coil) > Math.abs(early) && Math.abs(coil) > .25, `${kind}/${id} the ${lead} draws back and holds`);
      assert.ok(Math.abs(hit - coil) > .4, `${kind}/${id} the ${lead} swings through at contact`);
      assert.ok(Math.abs(done) < Math.abs(hit) * .3 + .05, `${kind}/${id} the ${lead} recovers`);
      // the snap runs from the coil to the strike inside the wind-up's last share
      const snap = at({ telegraph: full * (1 - CORE_LIMBS.snapAt) * .5 }, lead);
      assert.ok(Math.min(coil, hit) - 1e-9 <= snap && snap <= Math.max(coil, hit) + 1e-9, `${kind}/${id} snaps between coil and strike`);
    }
    const f: any = { kind, x: 3, y: 4, flinch: 1, meleePhase: null }, rest: any = { kind, x: 3, y: 4 };
    assert.ok(limbs.some((l) => Math.abs(coreLimbAngle(coreLimbPose(f, 0, true), l) - coreLimbAngle(coreLimbPose(rest, 0, true), l)) > .1), `${kind} flinches`);
  }
  // other kinds, and no pose at all, leave the figure still
  assert.equal(coreLimbAngle(coreLimbPose({ kind: 'gateRevenant', telegraph: .5 }), 'lead'), 0);
  assert.equal(coreLimbAngle(null, 'lead'), 0);
  // Reduced Motion: no idle sway, half the swing
  const e = { kind: 'ashling', x: 1, y: 2, telegraph: .16, meleePhase: { id: 'lunge' } };
  assert.equal(coreLimbAngle(coreLimbPose({ kind: 'ashling', x: 1, y: 2 }, 777, true), 'lead'), 0);
  assert.ok(Math.abs(coreLimbAngle(coreLimbPose(e, 0, true), 'lead')) < Math.abs(coreLimbAngle(coreLimbPose(e, 0, false), 'lead')));
  // one scratch record and nothing built per call, in the pose, the angle and the renderer's joint
  const a = { kind: 'ashling', telegraph: .4 }, first = coreLimbPose(a);
  for (let i = 0; i < 50; i++) { a.telegraph = i / 100; assert.equal(coreLimbPose(a), first); }
  const fn = (file, name) => { const src = readFileSync(new URL(file, import.meta.url), 'utf8'), i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); let d = 0, j = src.indexOf('{', src.indexOf(')', i)); const s0 = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(s0, j + 1); };
  for (const [file, name] of [['../src/monster-render.ts', 'coreLimbPose'], ['../src/monster-render.ts', 'coreLimbAngle'], ['../src/renderer.ts', 'limbTurn']])
    assert.ok(!/\bnew\s|=>|\[\s*\]|\.map\(|\.filter\(|\.slice\(|\.\.\./.test(fn(file, name)), `${name} allocates nothing`);
});

test('Standard View: the other ordinary kinds drawn by actor() have jointed limbs too, and no boss or world beast does', () => {
  const STRIKE = ACTION_MOTION.monsterStrikeMs / 1000;
  const attackers = { rootBrute: 'lead', sparkWarden: 'staff', cinderWisp: 'head', veilMoth: 'wing', voidSentinel: 'tentacle', riftColossus: 'lead' };
  for (const [kind, limb] of Object.entries(attackers)) {
    assert.ok(Object.hasOwn(CORE_LIMBS.kinds, kind), kind);
    const e: any = { kind, x: 2, y: 5, telegraph: 0, strike: 0, flinch: 0, meleePhase: null }, at = (o) => { Object.assign(e, { telegraph: 0, strike: 0, flinch: 0 }, o); return coreLimbAngle(coreLimbPose(e, 0, true), limb); };
    const rest = at({}), coil = at({ telegraph: CORE_LIMBS.windupDefault * (1 - CORE_LIMBS.snapAt) }), hit = at({ strike: STRIKE * .95 }), done = at({ strike: STRIKE * .01 }), hurt = at({ flinch: 1 });
    assert.ok(Math.abs(coil - rest) > .15 && Math.abs(hit - coil) > .3 && Math.abs(done - rest) < Math.abs(hit - rest), `${kind} winds up, strikes and recovers`);
    assert.ok(Math.abs(hurt - rest) > .05, `${kind} flinches`);
  }
  for (const kind of ['mossGrazer', 'lanternDoe', 'hushling']) {
    const rest = coreLimbAngle(coreLimbPose({ kind, x: 1, y: 1 }, 0, true), 'head'), hurt = coreLimbAngle(coreLimbPose({ kind, x: 1, y: 1, flinch: 1 }, 0, true), 'head');
    assert.ok(Math.abs(hurt - rest) > .05, `${kind}: a quiet creature flinches`);
  }
  for (const kind of ['gateRevenant', 'vesperwing', 'gravitantBell', 'mireApostle', 'knifeChoir', 'spinoRex', 'wildStego']) assert.ok(!Object.hasOwn(CORE_LIMBS.kinds, kind), `${kind} untouched`);
});

test('the bizarro-world style: the rounded core bodies draw and cache boundedly, and the normal renderer never calls them', () => {
  const calls = { fill: 0, stroke: 0 };
  const ctx = new Proxy({}, { get: (t, k) => k in calls ? () => { calls[k]++; } : typeof k === 'string' && /^(save|restore|translate|scale|rotate|beginPath|moveTo|lineTo|closePath|quadraticCurveTo|ellipse|drawImage|fillRect)$/.test(k) ? () => {} : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : t[k], set: (t, k, v) => { t[k] = v; return true; } });
  for (const kind of ORDINARY) {
    assert.ok(isCoreSpriteKind(kind));
    for (const state of ['walk', 'telegraph', 'attack']) assert.equal(drawCoreCreature(ctx, { kind, scale: 1, segments: kind === 'coilStalker' ? 3 : 1, segmentSpacing: .31 }, 3, 4, 48, 'right', state, 0), true);
  }
  assert.ok(calls.fill > 50 && calls.stroke > 20);
  assert.equal(drawCoreCreature(ctx, { kind: 'rootBrute' }, 0, 0, 48, 'right', 'walk'), false, 'other kinds are not drawn');
  assert.equal(coreSpriteCount(), 0, 'without a DOM canvas nothing is cached');
  assert.ok(CORE_SPRITE.max > 0 && CORE_SPRITE.max <= 64);
  const mr = readFileSync(new URL('../src/monster-render.ts', import.meta.url), 'utf8'), at = mr.indexOf('export function drawCoreCreature');
  assert.match(mr.slice(at, at + 3000), /coreSprites\.size > CORE_SPRITE\.max/, 'the sprite cache is bounded');
  assert.doesNotMatch(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /drawCoreCreature/, 'the normal Standard View keeps its blocky figures');
});
