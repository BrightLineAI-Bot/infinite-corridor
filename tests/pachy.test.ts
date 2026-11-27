// The Pachycephalosaurus (Tim, 2026-11-27; pachy.ts): its moves' data, each move in a headless arena, its three forms (armor
// tougher, the fossil turn that keeps fighting with bone moves), the rock ambush, its hunger (ordinary creatures eaten), the Stego
// Bait, the phone caps, determinism, version-pinned big rooms and overworld ambushes, the save record and exact resume, and its Echo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, beast, pachy, run } from './pachy-harness.ts';
import { MONSTER_PACK, ATTACK_MODULES, PACK_KINDS, validateMonster, resetPackRuntime, updatePackMonster } from '../src/monster-pack.ts';
import { PACHY, PACHY_ATTACKS, PACHY_START, PACHY_RUN, PACHY_ROOMS, PACHY_AMBUSH, PACHY_PROFILE, pachyRoomSpawn, pachyAmbushSpawn, ensurePachyState, notePachySlain, pachySlain, pachyTuned } from '../src/pachy.ts';
import { stegoBaitLures } from '../src/stego-bait.ts';
import { ROOM_BEAST_KILL } from '../src/echoes.ts';
import { behaviourProfile } from '../src/enemy-behaviour.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { generatePinnedDungeon, tunePachy } from '../src/game.ts';

const MOVES = MONSTER_PACK.pachy.attacks;
function fire(id, { seconds = 6, player = { x: 20, y: 22.5 }, extra = {} } = {}) {
  const w = arena({ player }), e = pachy(w, { extra }); run(w, .1); const s = e.pack; s.cd = {}; s.gap = 0; s.attack = null;
  for (const k of Object.keys(PACHY_ATTACKS)) if (k !== id) s.cd[k] = 999;
  let started = false, ended = false; run(w, seconds, () => { if (s.attack === id) started = true; else if (started) ended = true; });
  return { w, e, started, ended };
}
const bone = { pachyForm: 'fossil', pachyShift: 1 };

test('registry: a huge unique beast, never an ordinary creature, every number in its tables', () => {
  const def = MONSTER_PACK.pachy; assert.deepEqual(validateMonster(def), []); assert.ok(def.unique && !def.noEcho && PACK_KINDS.includes('pachy'));
  assert.equal(Object.keys(MONSTER_PACK).at(-1), 'pachy', 'listed last: every older roll is as it was');
  for (const id of Object.keys(PACHY_ATTACKS)) { const A = ATTACK_MODULES[id]; assert.equal(A, PACHY_ATTACKS[id], id); assert.ok(PACHY_START[id] && PACHY_RUN[id], `${id} runs`);
    for (const k of ['name', 'cooldown', 'windup', 'recover', 'damage', 'text']) assert.ok(A[k] !== undefined && A[k] !== '', `${id}.${k}`); }
  for (const want of ['pachyHeadSlam', 'pachyCharge', 'pachyRockLaunch', 'pachyJumpSlam', 'pachyBicycle', 'pachyBoneSpikes', 'pachySkullLaunch']) assert.ok(MOVES.includes(want), want);
  assert.ok(PACHY.rocks.count <= PACHY.caps.rocks && PACHY.skulls.count <= PACHY.caps.skulls && PACHY.bones.count <= PACHY.caps.bones);
  assert.ok(PACHY.forms.armor.taken > 0 && PACHY.forms.armor.taken < 1 && PACHY.forms.fossil.at < Math.min(...PACHY.forms.armor.at));
  assert.ok(PACHY_PROFILE.damageShare >= .2, 'at the Spinosaurus level: a big hit takes a fifth of a build or more');
  assert.equal(behaviourProfile({ kind: 'pachy', pachyRoom: true, hp: 1 }), null, 'no squad role');
});

test('each move: it starts, runs to its end and hurts the Wayfarer standing in it; nothing out of reach', () => {
  for (const id of MOVES) {
    const fossil = PACHY.fossilOnly.includes(id), { w, started, ended } = fire(id, { player: ['pachyCharge', 'pachyBicycle', 'pachyJumpSlam'].includes(id) ? { x: 20, y: 25 } : { x: 20, y: 22.2 }, extra: fossil ? bone : {} });
    assert.ok(started, `${id} started`); assert.ok(ended, `${id} ran to its end`);
    assert.ok(w.hurts.some((h) => h.source === id || h.source === 'pachyWave'), `${id} landed`);
  }
  const far = fire('pachyHeadSlam', { player: { x: 2, y: 2 }, seconds: 3 }); assert.equal(far.w.hurts.length, 0);
});

test('forms: bone moves only as a fossil, the rock flick never; flesh never uses bone', () => {
  for (const id of PACHY.fossilOnly) assert.equal(fire(id, { seconds: 2 }).started, false, `${id} not in the flesh`);
  assert.equal(fire('pachyRockLaunch', { seconds: 2, extra: bone }).started, false, 'no rock flick as bone: it launches skulls');
});

test('armor: at its thresholds it plates itself (no blows while shifting), takes half of every blow while armored, then the plating falls', () => {
  const w = arena({ player: { x: 20, y: 34 } }), e = pachy(w, { hp: 1000 }); run(w, .5);
  e.hp = 700; run(w, .2); assert.equal(e.pachyForm, 'armor'); assert.equal(e.pack.attack, null, 'shifting');
  run(w, 1.5); const before = e.hp; e.hp -= 100; run(w, 1 / 30); assert.equal(Math.round(before - e.hp), 100 * PACHY.forms.armor.taken, 'half of a blow while armored');
  run(w, PACHY.forms.armor.time); assert.equal(e.pachyForm, 'flesh'); const b2 = e.hp; e.hp -= 100; run(w, 1 / 30); assert.ok(b2 - e.hp >= 99, 'full blows again');
  assert.ok(w.forms.map((f) => f.form).join() === 'armor,flesh');
  e.hp = 470; run(w, .2); assert.equal(e.pachyForm, 'armor', 'the second threshold armors it again'); assert.equal(e.pachyArmorUsed, 2);
});

test('fossil: after enough damage its flesh falls away for good, the armor goes, and it keeps fighting with bone', () => {
  const w = arena({ player: { x: 20, y: 24 } }), e = pachy(w, { hp: 1000 }); run(w, .5);
  e.hp = 250; run(w, .1); assert.equal(e.pachyForm, 'fossil'); assert.equal(e.pachyPose, 'shed');
  run(w, 12); assert.equal(e.pachyShift, 1); assert.equal(e.pachyForm, 'fossil');
  assert.ok(w.hurts.some((h) => h.source === 'pachyBoneSpikes' || h.source === 'pachySkullLaunch'), 'bone moves used: ' + [...new Set(w.hurts.map((h) => h.source))]);
  const b = e.hp; e.hp -= 50; run(w, 1 / 30); assert.ok(b - e.hp >= 49, 'bone is no armor');
});

test('ambush: it lies as a rock and does nothing until the Wayfarer comes close (or strikes it), then bursts out', () => {
  const w = arena({ player: { x: 20, y: 32 } }), e = pachy(w, { aggro: false, extra: { pachyDisguised: true } });
  run(w, 3); assert.ok(e.pachyDisguised && e.pachyPose === 'rock' && !e.aggro && w.hurts.length === 0 && e.x === 20 && e.y === 18, 'still as stone');
  w.player.y = 18 + PACHY.ambush.reveal - .2; run(w, 1.2); assert.ok(!e.pachyDisguised && e.aggro); assert.ok(w.hurts.some((h) => h.source === 'pachyAmbush' || h.source === 'pachyWave'), 'it bursts out on you');
  assert.ok(w.said.some((t) => /odd rock/.test(t)));
  const w2 = arena({ player: { x: 20, y: 36 } }), e2 = pachy(w2, { aggro: false, extra: { pachyDisguised: true } }); run(w2, .5); e2.hp -= 10; run(w2, .3); assert.equal(e2.pachyDisguised, false, 'a blow on the rock wakes it');
});

test('hungry: it turns on an ordinary creature near it, kills it and eats (no reward for the eaten)', () => {
  const w = arena({ player: { x: 2, y: 38 } }), e = pachy(w), q = beast(w, 'riftLynx', { id: 'lynx', x: 24, y: 18, hp: 60, damage: 5 }); q.boss = false; q.packAttacks = [];
  let fed = false; run(w, 12, () => { if (e.pachyPose === 'feed') fed = true; }); assert.ok(q.dead && q.noRewards, 'killed and eaten'); assert.ok(fed, 'it fed');
});

test('the Stego Bait works on it: lured, it goes for the bait (the bait world is its Wayfarer)', () => {
  assert.ok(stegoBaitLures({ kind: 'pachy', pachyRoom: true, hp: 10 }) && stegoBaitLures({ kind: 'pachy', pachyAmbush: true, hp: 10 }));
  const w = arena({ player: { x: 20, y: 30 } }), e = pachy(w, { aggro: false, extra: { pachyDisguised: true } }); e.aggro = true; // the bait's scent rouses it (game.ts stegoBaitTick)
  run(w, 4); assert.equal(e.pachyDisguised, false, 'the scent wakes the rock'); assert.ok(Math.hypot(e.x - 20, e.y - 30) < 8, 'it closes on the bait');
});

test('phone caps hold and the fight is deterministic', () => {
  const play = () => { const w = arena(), e = pachy(w, { extra: bone }); const max = { rocks: 0, skulls: 0, bones: 0, waves: 0 }, log = [];
    run(w, 40, () => { w.player.x = 20 + Math.cos(w.now / 1500) * 7; w.player.y = 27 + Math.sin(w.now / 1500) * 4; for (const k of Object.keys(max)) max[k] = Math.max(max[k], e.pachyFx[k].filter((q) => q.on).length); log.push(`${e.pack.attack}|${e.x.toFixed(3)}|${e.y.toFixed(3)}`); });
    return { max, log: log.join(';'), hurts: JSON.stringify(w.hurts) }; };
  const a = play(), b = play(); assert.equal(a.log, b.log); assert.equal(a.hurts, b.hurts);
  for (const k of Object.keys(a.max)) assert.ok(a.max[k] <= PACHY.caps[k], `${k} ${a.max[k]}`);
  const w = arena(), e = pachy(w); run(w, 20); for (const k of Object.keys(PACHY.caps)) assert.equal(e.pachyFx[k].length, PACHY.caps[k], `${k}: one pool, allocated once`);
});

test('big rooms: version-pinned per floor history; a floor generated before never gains one; ordinary dungeons never', () => {
  const map = { building: { style: 'keep' }, width: 30, tiles: Array.from({ length: 900 }, (_, i) => ({ x: i % 30, y: Math.floor(i / 30), kind: 'floor' })), entry: { x: 1, y: 1 } };
  let held = 0, hid = 0; for (let i = 0; i < 400; i++) { const q = pachyRoomSpawn('S', `building:S:${i}:f1`, map, 'building'); if (q) { held++; if (q.pachyDisguised) hid++; assert.ok(q.pachyRoom && q.id.endsWith(':pachy')); } }
  assert.ok(held > 0 && held < 400 * PACHY_ROOMS.chance * 2 && hid > 0 && hid < held, `${held} ${hid}`);
  assert.equal(pachyRoomSpawn('S', 'x', map, 'building', 0), null); assert.equal(pachyRoomSpawn('S', 'x', map, 'dungeon', 1), null); assert.equal(pachyRoomSpawn('S', 'x', map, 'building', 1, true), null);
  let found = null; for (let i = 0; i < 400 && !found; i++) { const s = freshSave(); s.seed = 'PACHY-ROOMS'; const id = `building:PACHY-ROOMS:${i}:2:${i % 2 ? 'keep' : 'apartment'}:4:f1`, m = generatePinnedDungeon(s, id);
    assert.equal(s.consequences.dungeons[id].pachyRooms, PACHY_ROOMS.version); if (m.enemySpawns.some((e) => e.kind === 'pachy')) found = { id, m }; }
  assert.ok(found, 'some fresh floor holds one');
  const s = freshSave(); s.seed = 'PACHY-ROOMS'; generatePinnedDungeon(s, found.id); delete s.consequences.dungeons[found.id].pachyRooms; const m = generatePinnedDungeon(s, found.id);
  const fresh = JSON.parse(JSON.stringify(found.m)); fresh.enemySpawns = fresh.enemySpawns.filter((e) => e.kind !== 'pachy');
  assert.equal(JSON.stringify(m), JSON.stringify(fresh), 'generated before: byte for byte the floor it was, with no Pachycephalosaurus');
  const s2 = freshSave(); s2.seed = 'PACHY-ROOMS'; notePachySlain(s2, found.m.enemySpawns.find((e) => e.kind === 'pachy').id); assert.ok(!generatePinnedDungeon(s2, found.id).enemySpawns.some((e) => e.kind === 'pachy'), 'slain: never laid again');
});

test('overworld ambush: only on ground pinned to its version, never near Ember Refuge, always as a rock on open ground', () => {
  const open = () => true; let n = 0;
  for (let i = 0; i < 2000; i++) { const rx = 10 + (i % 50), ry = -20 + Math.floor(i / 50), q = pachyAmbushSpawn('S', rx, ry, 1, open); if (q) { n++; assert.ok(q.pachyAmbush && q.pachyDisguised && q.id.endsWith(':pachy') && q.x >= PACHY_AMBUSH.fromEdge && q.x < 32 - PACHY_AMBUSH.fromEdge); assert.deepEqual(q, pachyAmbushSpawn('S', rx, ry, 1, open)); } }
  assert.ok(n > 0 && n < 2000 * PACHY_AMBUSH.perThousand / 1000 * 2, `${n}`);
  for (let i = 0; i < 400; i++) assert.equal(pachyAmbushSpawn('S', 10 + i, 5, undefined, open), null, 'ground seen before (no version): never');
  for (let r = 0; r < PACHY_AMBUSH.minDepth; r++) for (let i = 0; i < 50; i++) assert.equal(pachyAmbushSpawn(`S${i}`, r, 0, 1, open), null);
  assert.equal(pachyAmbushSpawn('S', 30, 30, 1, () => false), null, 'no open ground, none');
});

test('the save: additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept, resumed exactly', () => {
  const f = freshSave(); assert.deepEqual(f.pachy, { v: 1, slain: [] }); assert.equal(f.version, 14);
  const old = freshSave(); delete old.pachy; const m = migrateSave(JSON.parse(JSON.stringify(old))); assert.deepEqual(m.pachy, { v: 1, slain: [] });
  m.pachy.extra = 'kept'; notePachySlain(m, 'a:pachy'); notePachySlain(m, 'a:pachy'); m.pachy.slain.push(7);
  const back = migrateSave(JSON.parse(JSON.stringify(m))); assert.deepEqual(back.pachy, { v: 1, slain: ['a:pachy'], extra: 'kept' }); assert.ok(pachySlain(back, 'a:pachy'));
  assert.ok(ROOM_BEAST_KILL.pachy.test('building:x:f1:pachy') && ROOM_BEAST_KILL.pachy.test('S:pachy-ambush:v1:3:4:pachy'));
});

test('exact resume: its form, the armor clock, used thresholds and the disguise come back; no move or shot resumes mid-way', () => {
  const w = arena({ player: { x: 20, y: 24 } }), e = pachy(w, { hp: 1000 }); run(w, .5); e.hp = 690; run(w, 4);
  const snap = JSON.parse(JSON.stringify(w.enemies.find((q) => q.kind === 'pachy'))); resetPackRuntime(snap);
  assert.equal(snap.pachyForm, 'armor'); assert.ok(Math.abs(snap.pachyArmorLeft - e.pachyArmorLeft) < 1e-9); assert.equal(snap.pachyArmorUsed, 1); assert.equal(snap.pack.attack, null);
  assert.ok(Object.values(snap.pachyFx).filter(Array.isArray).flat().every((q) => !q.on), 'no shot resumes');
  const rock = JSON.parse(JSON.stringify({ ...e, pachyDisguised: true })); resetPackRuntime(rock); assert.equal(rock.pachyDisguised, true);
  const bad = { kind: 'pachy', packKind: 'pachy', pachyForm: 'armor', pachyArmorLeft: -3, pachyArmorUsed: 99 }; resetPackRuntime(bad); assert.equal(bad.pachyForm, 'flesh'); assert.equal(bad.pachyArmorUsed, PACHY.forms.armor.at.length);
  const w2 = arena({ player: { x: 20, y: 24 } }); w2.enemies.push(snap); run(w2, 6); assert.ok(w2.hurts.length > 0, 'it plays on');
});

test('tuned to the Wayfarer like the room beasts (no hunt), and its disguise rides on the spawn', () => {
  const s = freshSave(); s.seed = 'T'; const c = { kind: 'pachy', hp: 1, maxHp: 1, damage: 1, worldBeast: 'x' }; tunePachy(c, s, {}, { pachyAmbush: true, pachyDisguised: true });
  assert.ok(pachyTuned(c) && !c.worldBeast && !c.boss && c.hp > 100 && c.pachyDisguised && c.pachyHpSeen === c.hp);
});

// Dome Rush (its Echo) was redesigned into the Earth Golem (Tim, 2026-11-27): tests/pachy-golem.test.ts.
