// The Earth Apatosaurus (Tim, 2026-11-18; earth-apato.ts, apato-poison.ts, apato-render.ts, close-view-beast-apato.ts): its moves'
// data, each move in a headless arena, determinism, the phone caps, its root venom (stacking, sources, the save), the tree clones'
// coil and the ways out of it (mash, Rift Step, the Shadow Clone's step), saplings grown only by the beam, its duels with the
// Spinosaurus and the Wild Stegosaurus (an eaten loser pays nothing), the Triceratops ignored, version-pinned big rooms, exact
// resume, no allocation in its per-frame hazards, no squad role, its Echo and its Close View body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, apato, beast, run } from './earth-apato-harness.ts';
import { MONSTER_PACK, ATTACK_MODULES, PACK_KINDS, validateMonster, updatePackMonster, resetPackRuntime } from '../src/monster-pack.ts';
import { APATO, APATO_CLONE, APATO_ATTACKS, APATO_ROOMS, APATO_START, APATO_RUN, apatoPools, apatoFx, apatoRoomSpawn, apatoLatchedClones, apatoMashNeed, tuneApatoClone, apatoIgnores } from '../src/earth-apato.ts';
import { POISON, ensureApatoPoison, dosePoison, tickPoison, poisonDps, tickCreatureVenom, doseCreature } from '../src/apato-poison.ts';
import { DINO_DUEL, tickDinoDuels, duelPair } from '../src/dino-duel.ts';
import { WORLD_BEASTS, PASSING, BEAST_APERTURE, PLACEMENT } from '../src/world-beasts.ts';
import { ECHOES, APATO_ECHO, earthResolvePlant, earthResolveHit, tickEarthResolve } from '../src/echoes.ts';
import { behaviourProfile } from '../src/enemy-behaviour.ts';
import { CLOSE_VIEW_BEASTS } from '../src/close-view-beasts.ts';
import { apatoMesh, apatoCloneMesh, createApatoTrack, sampleApato, apatoBone, APATO_SKELETON } from '../src/close-view-beast-apato.ts';
import { stegoMesh } from '../src/close-view-beast-stego.ts';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { sampleDuel, BOSS_THEMES } from '../src/soundtrack-director.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, PLAYER_CLOCKS, RESUME_PLAYER_CLOCKS } from '../src/game.ts';
import { ensureWorldBeasts } from '../src/world-beasts.ts';

const MOVES = MONSTER_PACK.earthApato.attacks, CLONE_MOVES = MONSTER_PACK.apatoClone.attacks;
// Starts `id` now (as the brain would, aimed at the Wayfarer) and runs `seconds`; returns what happened.
function fire(id, { seconds = 6, player = { x: 20, y: 25 }, setup = null } = {}) {
  const w = arena({ player }), e = apato(w); if (setup) setup(w, e);
  run(w, .1); const s = e.pack; s.cd = {}; s.gap = 0; s.attack = null;
  for (const k of Object.keys(ATTACK_MODULES)) if (k.startsWith('apato') && k !== id) s.cd[k] = 999; // only this one is ready
  let started = false, ended = false; run(w, seconds, () => { if (s.attack === id) started = true; else if (started) ended = true; });
  return { w, e, started, ended };
}

// ------------------------------------------------------------------------------------------------ the data
test('registry: a huge unique land beast with eleven moves, its tree clone a minion, every number in its tables', () => {
  const def = MONSTER_PACK.earthApato, c = MONSTER_PACK.apatoClone;
  assert.deepEqual(validateMonster(def), []); assert.deepEqual(validateMonster(c), []); assert.ok(PACK_KINDS.includes('earthApato')); assert.ok(!PACK_KINDS.includes('apatoClone'), 'the clone is never an ordinary creature');
  assert.equal(MOVES.length, 11); assert.equal(CLONE_MOVES.length, 4); assert.ok(def.unique && !def.noEcho && c.noEcho);
  for (const id of [...MOVES, ...CLONE_MOVES]) { const A = ATTACK_MODULES[id]; assert.equal(A, APATO_ATTACKS[id], id); assert.ok(APATO_START[id] && APATO_RUN[id], `${id} runs`);
    for (const k of ['name', 'cooldown', 'windup', 'recover', 'damage', 'text']) assert.ok(A[k] !== undefined && A[k] !== '', `${id}.${k}`);
    assert.ok(Array.isArray(A.range) && A.range[0] <= A.range[1] && A.tags.length, id); }
  const W = WORLD_BEASTS.earthApato; assert.equal(Object.keys(WORLD_BEASTS).at(-1), 'earthApato', 'listed last: every older beast rolls as it did');
  assert.ok(W.hitsToKill && W.damageShare && BEAST_APERTURE.earthApato && PLACEMENT.bigBeasts.includes('earthApato') && PASSING.not.includes('earthApato'));
  assert.deepEqual(APATO.caps, { saplings: 6, clones: 3, roots: 6, hands: 4, spires: 6, leaves: 12, rocks: 8, seeds: 6, waves: 6 });
  assert.ok(APATO.hydra.roots <= APATO.caps.roots && APATO.hands.count <= APATO.caps.hands && APATO.spires.count <= APATO.caps.spires && APATO.leaves.fan <= APATO.caps.leaves && APATO.seeds.count <= APATO.caps.seeds);
  assert.equal(BOSS_THEMES.earthApato, 'rootedColossus', 'its own theme');
});

test('each move: it starts, runs to its end, and hurts the Wayfarer standing in it (and nothing when out of reach)', () => {
  const near = { x: 20, y: 22.5 }, hurtBy = {};
  for (const id of MOVES) {
    const setup = id === 'apatoBeamSweep' ? (w, e) => { e.apatoSaplings = [{ x: 20, y: 21, grow: 0, age: 0 }]; } : null;
    const { w, started, ended } = fire(id, { player: id === 'apatoLash' || id === 'apatoStomp' ? { x: 20, y: 26 } : near, setup });
    assert.ok(started, `${id} started`); assert.ok(ended, `${id} ran to its end`);
    hurtBy[id] = w.hurts.filter((h) => h.source === id).length;
  }
  for (const id of MOVES.filter((m) => m !== 'apatoWrap')) assert.ok(hurtBy[id] > 0, `${id} landed: ${JSON.stringify(hurtBy)}`);
  const far = fire('apatoNeckSlam', { player: { x: 2, y: 2 }, seconds: 3 }); assert.equal(far.w.hurts.length, 0, 'out of reach, no blow');
});

test('the neck wrap: held fast, venom sprayed (the strongest), then flung; dodged when the mark is left', () => {
  const { w } = fire('apatoWrap', { player: { x: 20, y: 22 }, seconds: 6 });
  const sprays = w.hurts.filter((h) => h.source === 'apatoWrap'); assert.ok(sprays.length >= APATO.wrap.sprays, `${sprays.length} sprays and the fling`);
  const w2 = arena({ player: { x: 20, y: 22 } }), e2 = apato(w2); run(w2, .1); e2.pack.cd = {}; e2.pack.gap = 0; for (const k of MOVES) if (k !== 'apatoWrap') e2.pack.cd[k] = 999;
  let peak = 0; run(w2, 6, () => { peak = Math.max(peak, w2.save.apatoPoison.stacks); }); assert.ok(peak > POISON.cloneMax, `the wrap fills past a clone's cap (${peak})`);
  const w3 = arena({ player: { x: 20, y: 22 } }), e3 = apato(w3); run(w3, .1); e3.pack.cd = {}; e3.pack.gap = 0; for (const k of MOVES) if (k !== 'apatoWrap') e3.pack.cd[k] = 999;
  run(w3, 6, () => { if (e3.pack.attack === 'apatoWrap' && e3.pack.phase === 'windup' && e3.pack.t < .1) { w3.player.x = 29; w3.player.y = 30; } });
  assert.equal(w3.hurts.filter((h) => h.source === 'apatoWrap').length, 0, 'out from under the mark when it stops: no wrap');
});

test('determinism: the same fight twice is the same to the frame', () => {
  const play = () => { const w = arena(), e = apato(w); const log = []; run(w, 40, () => { w.player.x = 20 + Math.cos(w.now / 2000) * 6; w.player.y = 26 + Math.sin(w.now / 2000) * 4; log.push(`${e.pack?.attack}|${e.x.toFixed(4)}|${e.y.toFixed(4)}`); }); return { log: log.join(';'), hurts: JSON.stringify(w.hurts), sap: JSON.stringify(e.apatoSaplings) }; };
  const a = play(), b = play(); assert.equal(a.log, b.log); assert.equal(a.hurts, b.hurts); assert.equal(a.sap, b.sap);
});

test('the phone caps hold through a long fight: saplings, clones, roots, hands, rocks, spires, leaves, seeds, waves', () => {
  const w = arena(), e = apato(w), max = {};
  run(w, 150, () => { w.player.x = 20 + Math.cos(w.now / 1700) * 7; w.player.y = 25 + Math.sin(w.now / 2300) * 5;
    const F = e.apatoFx; for (const k of Object.keys(APATO.caps)) { const n = k === 'saplings' ? e.apatoSaplings.length : k === 'clones' ? w.enemies.filter((q) => q.apatoCloneOf === e.id && !q.dead).length : F[k].filter((q) => q.on).length; max[k] = Math.max(max[k] || 0, n); } });
  for (const k of Object.keys(APATO.caps)) assert.ok(max[k] <= APATO.caps[k], `${k}: ${max[k]} <= ${APATO.caps[k]}`);
  assert.ok(max.saplings > 0 && max.roots > 0 && max.spires > 0 && max.leaves > 0, JSON.stringify(max));
});

test('no allocation in its per-frame hazards: the pools and the art records are the same objects frame after frame', () => {
  const w = arena(), e = apato(w); run(w, 20); const F = apatoPools(e), before = [F, ...Object.values(F).filter(Array.isArray).flat()];
  for (const q of F.roots) Object.assign(q, { on: true, bx: 20, by: 18, x: 22, y: 24, hx: 1, hy: 0, t: .5, life: 99, next: 99, prey: null });
  for (const q of F.leaves) Object.assign(q, { on: true, x: 5, y: 5, vx: .01, vy: 0, left: 99, dmg: 1, spin: 0, prey: null });
  w.player.x = 35; w.player.y = 35;
  for (let i = 0; i < 300; i++) { w.now += 33; apatoFx(e, w); }
  const after = [e.apatoFx, ...Object.values(e.apatoFx).filter(Array.isArray).flat()];
  assert.equal(after.length, before.length); for (let i = 0; i < after.length; i++) assert.equal(after[i], before[i], 'same object');
  assert.ok(F.roots.every((q) => q.on) && F.leaves.every((q) => q.on), 'still live, never replaced');
});

// ------------------------------------------------------------------------------------------------ root venom
test('venom: stacks, a clone fills only to its cap, the wrap to the top, it ebbs once the doses stop; damage in whole points', () => {
  const s = {}; ensureApatoPoison(s); assert.deepEqual(s.apatoPoison, { stacks: 0, quiet: 0, tick: 0, owed: 0 });
  assert.ok(dosePoison(s, 3, 'clone')); dosePoison(s, 30, 'clone'); assert.equal(s.apatoPoison.stacks, POISON.cloneMax, 'a clone tops out');
  dosePoison(s, 30, 'wrap'); assert.equal(s.apatoPoison.stacks, POISON.max, 'the wrap is the strongest'); dosePoison(s, 5, 'clone'); assert.equal(s.apatoPoison.stacks, POISON.max, 'a weaker dose never lowers it');
  let taken = 0, frames = 0; while (s.apatoPoison.stacks > 0 && frames < 3600) { const r = tickPoison(s, 1 / 30, 1000); assert.equal(r.damage, Math.floor(r.damage)); taken += r.damage; frames++; }
  assert.ok(frames < 3600 && taken > 0, `it ebbed (${frames} frames, ${taken} health)`);
  assert.ok(poisonDps(POISON.max, 1000) > poisonDps(POISON.cloneMax, 1000));
  const c = { maxHp: 1000, hp: 1000 }; doseCreature(c, 6); let n = 0; for (let i = 0; i < 300; i++) n += tickCreatureVenom(c, 1 / 30); assert.ok(n > 0, 'a creature takes it too');
});

test('venom in the save: additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept, resumed exactly', () => {
  const f = freshSave(); assert.deepEqual(f.apatoPoison, { stacks: 0, quiet: 0, tick: 0, owed: 0 }); assert.equal(f.version, 14);
  const old = JSON.parse(JSON.stringify(f)); delete old.apatoPoison; const m = migrateSave(old); assert.deepEqual(m.apatoPoison, { stacks: 0, quiet: 0, tick: 0, owed: 0 }, 'an old journey gains a clean record');
  dosePoison(m, 5.5, 'wrap'); tickPoison(m, .4, 800); m.apatoPoison.note = 'kept';
  const back = migrateSave(JSON.parse(JSON.stringify(m))); assert.deepEqual(back.apatoPoison, m.apatoPoison, 'exact resume, unknown field kept');
  const a = tickPoison(m, 2, 800).damage, b = tickPoison(back, 2, 800).damage; assert.equal(a, b);
  const bad = migrateSave({ ...JSON.parse(JSON.stringify(f)), apatoPoison: { stacks: 'x', quiet: -4, owed: NaN } }); assert.equal(bad.apatoPoison.stacks, 0);
});

// ------------------------------------------------------------------------------------------------ the clones
function clonesOn(w, owner, n = 1, at = null) { const out = []; for (let i = 0; i < n; i++) { const c = createCombatant('apatoClone', w.player.x + 1 + i * .3, w.player.y, false, []); tuneApatoClone(c, owner, i + 1); w.enemies.push(c); out.push(c); } return out; }
test('the coil: a clone darts, latches and pulls itself in; the venom grows with time held and with more clones on', () => {
  const w = arena({ player: { x: 20, y: 28 } }), e = apato(w, { x: 20, y: 10 }); e.pack = null; run(w, .05); for (const k of MOVES) e.pack.cd[k] = 999;
  const [c] = clonesOn(w, e); run(w, .05); c.pack.cd = { apatoCloneSlam: 99, apatoCloneTail: 99, apatoCloneThorn: 99 }; c.pack.gap = 0;
  run(w, 4, () => { w.player.x = 20; w.player.y = 28; }); assert.ok(c.apatoLatched, 'latched'); assert.ok(Math.hypot(c.x - w.player.x, c.y - w.player.y) < 1.5, 'pulled itself in');
  const rate = (secs) => { const s0 = w.save.apatoPoison.stacks; run(w, secs, () => { w.player.x = 20; w.player.y = 28; }); return w.save.apatoPoison.stacks - s0; };
  w.save.apatoPoison.stacks = 0; c.apatoLatchT = 0; const early = rate(.5); w.save.apatoPoison.stacks = 0; c.apatoLatchT = 4; const late = rate(.5); assert.ok(late > early * 1.5, `longer held, stronger (${early} then ${late})`);
  const [d, f] = clonesOn(w, e, 2); for (const q of [d, f]) { q.apatoLatched = true; q.apatoLatchT = c.apatoLatchT; } w.save.apatoPoison.stacks = 0; const crowd = rate(.5); assert.ok(crowd > late * 1.5, `more clones, stronger (${crowd})`);
  assert.equal(apatoLatchedClones(w.enemies), 3); assert.equal(apatoMashNeed(1), APATO_CLONE.coil.mash); assert.ok(apatoMashNeed(3) > apatoMashNeed(1));
});

function gameWithLatch(n = 1) {
  const s = freshSave(); s.seed = 'APATO-LATCH'; ensureWorldBeasts(s); const g = new Game(s, 0); g.enemies = [];
  const e = createCombatant('earthApato', g.player.x + 8, g.player.y, true, []); Object.assign(e, { id: 'apato-room', apatoRoom: true, hp: 900, maxHp: 900, aggro: true }); g.enemies.push(e);
  for (let i = 0; i < n; i++) { const c = createCombatant('apatoClone', g.player.x + 1, g.player.y, false, []); tuneApatoClone(c, e, i + 1); c.apatoLatched = true; g.enemies.push(c); }
  g.apatoPin = { x: g.player.x, y: g.player.y }; g.apatoMash = 0; return { g, s, e };
}
const pressing = (attack) => ({ state: { attack }, consume() { return false; } });
test('breaking free: mashing attack (more presses for more clones), or a Rift Step / Shadow Clone step away; held still meanwhile', () => {
  for (const n of [1, 3]) { const { g } = gameWithLatch(n); let presses = 0;
    while (g.apatoLatchInput(pressing(true))) { presses++; assert.ok(presses < 50); }
    assert.equal(presses + 1, apatoMashNeed(n), `${n} clone(s): ${apatoMashNeed(n)} presses`); assert.equal(apatoLatchedClones(g.enemies), 0); assert.equal(g.apatoPin, null);
    assert.ok(g.enemies.filter((q) => q.kind === 'apatoClone').every((q) => q.hitStun > 0 && q.apatoCoilAgain > 0), 'flung off, stunned, and not coiling again at once'); }
  { const { g } = gameWithLatch(2); assert.equal(g.apatoLatchInput(pressing(false)), true, 'no press: still held'); const p = g.player, x0 = p.x;
    p.x += .4; g.apatoLatchSlip(); assert.equal(p.x, x0, 'a shove does not move her out of the coils'); assert.equal(apatoLatchedClones(g.enemies), 2);
    p.x += 4; g.apatoLatchSlip(); assert.equal(apatoLatchedClones(g.enemies), 0, 'a Rift Step (or stepping into the Shadow Clone) slips them'); assert.equal(g.message, APATO.text.slip); }
});

test('saplings grow only while the beam touches them; a full-grown one becomes a clone (never more than the cap)', () => {
  const setup = (w, e) => { e.apatoSaplings = [{ x: 20, y: 22, grow: 0, age: 0 }, { x: 4, y: 4, grow: 0, age: 0 }]; };
  const { w, e } = fire('apatoBeam', { player: { x: 20, y: 24 }, setup, seconds: 5 });
  assert.equal(e.apatoSaplings.find((q) => q.x === 4)?.grow, 0, 'out of the light: unchanged');
  assert.ok(w.enemies.some((q) => q.kind === 'apatoClone' && q.apatoCloneOf === e.id), 'the lit one grew into a clone');
  const dark = arena(), d = apato(dark); setup(dark, d); run(dark, 30, () => { for (const k of MOVES) if (k.startsWith('apatoBeam')) d.pack.cd[k] = 999; });
  assert.ok(d.apatoSaplings.every((q) => q.grow === 0), 'no beam, no growth'); assert.ok(!dark.enemies.some((q) => q.kind === 'apatoClone'));
  const capW = arena(), ce = apato(capW); clonesOn(capW, ce, APATO.caps.clones); setup(capW, ce); run(capW, .05); for (const k of MOVES) if (k !== 'apatoBeam') ce.pack.cd[k] = 999; ce.pack.cd.apatoBeam = 0; ce.pack.gap = 0;
  run(capW, 5); assert.equal(capW.enemies.filter((q) => q.kind === 'apatoClone' && !q.dead).length, APATO.caps.clones, 'at the cap no more grow');
});

test('clones are its minions: no reward, no squad role, gone with it; its own fall ends their life', () => {
  const w = arena(), e = apato(w); const [c] = clonesOn(w, e); assert.ok(c.noRewards && c.summonedBy === e.id && c.apatoCloneOf === e.id);
  assert.equal(behaviourProfile(c), null, 'no squad role'); assert.equal(behaviourProfile(e), null); assert.equal(behaviourProfile({ ...e, worldBeast: undefined, apatoRoom: true }), null);
  e.hp = 0; e.dead = true; run(w, .2); assert.ok(!w.enemies.some((q) => q.kind === 'apatoClone' && !q.dead), 'they wither with it');
});

// ------------------------------------------------------------------------------------------------ duels
test('duels: it fights the Spinosaurus and the Wild Stegosaurus; each ends by the cap in a kill or an escape; the old pair unchanged', () => {
  assert.deepEqual(DINO_DUEL.pairs[0], ['spinoRex', 'wildStego'], 'the original pair first');
  for (const kind of ['spinoRex', 'wildStego']) {
    const ends = { kill: 0, escape: 0 }, winners = { earthApato: 0, [kind]: 0 };
    for (let i = 0; i < 6; i++) {
      const w = arena({ player: { x: 20, y: 36 } }), a = apato(w, { id: `apato-${i}`, x: 14, y: 18, hp: 3000 }), b = beast(w, kind, { id: `${kind}-${i}`, x: 27, y: 18, hp: 3000 });
      const ev = run(w, 95, () => {}, { eaten: (l) => { l.noRewards = true; } }), start = ev.find((x) => x.type === 'start'), out = ev.find((x) => x.type === 'eaten' || x.type === 'escape');
      assert.ok(start && start.a === a.id && start.b === b.id, `${kind} #${i}: a duel began`); assert.ok(out, `${kind} #${i}: it ended`); assert.ok(out.at <= DINO_DUEL.cap + 2, `by the cap (${out.at})`);
      ends[out.type === 'eaten' ? 'kill' : 'escape']++; winners[out.winner === a.id ? 'earthApato' : kind]++;
      if (out.type === 'eaten') { const l = w.enemies.find((q) => q.id === out.loser) || (out.loser === a.id ? a : b); assert.ok(l.noRewards, 'the eaten loser pays nothing'); }
    }
    assert.ok(ends.kill + ends.escape === 6, JSON.stringify(ends));
  }
});

test('in its duel it coils the foe in its neck, poisons it and leaves it dazed', () => {
  const w = arena({ player: { x: 20, y: 38 } }), a = apato(w, { x: 14, y: 18, hp: 5000 }), b = beast(w, 'wildStego', { x: 21, y: 18, hp: 5000 });
  let held = false, dazed = false, venom = false; run(w, 60, () => { held ||= b.apatoHeldBy === a.id; dazed ||= b.apatoDazed > 0; venom ||= b.apatoVenom > 0; });
  assert.ok(held && venom && dazed, JSON.stringify({ held, venom, dazed }));
  const cues = w.cues.filter((c) => c.who === 'earthApato' && c.phase === 'hit' && c.victim === 'wildStego'); assert.ok(cues.length > 0, 'its blows sound');
  const g = { player: { x: 20, y: 30 }, enemies: [a, b] }; a.dead = false; b.dead = false; a.hp = b.hp = 100; a.aggro = b.aggro = true; const pair = sampleDuel(g); assert.ok(pair && pair.apato === a, 'the music hushes for it');
});

test('eaten in the game: no reward from the eaten Apatosaurus; its hunt ends', () => {
  const s = freshSave(); s.seed = 'APATO-EATEN'; ensureWorldBeasts(s); const g = new Game(s, 0); g.enemies = []; s.worldBeasts.earthApato.active = { rx: g.rx, ry: g.ry, tries: 0 };
  const a = createCombatant('earthApato', g.player.x + 4, g.player.y, true, []); Object.assign(a, { id: 'world-beast:earthApato:0', worldBeast: 'earthApato', boss: true, hp: 900, maxHp: 1000, aggro: true });
  const sp = createCombatant('spinoRex', g.player.x - 4, g.player.y, true, []); Object.assign(sp, { id: 'room:spino', hp: 900, maxHp: 1000, aggro: true }); g.enemies.push(a, sp);
  a.dinoDuel = { foe: sp.id, start: 0, t: 40, hp: 900, byRival: 0, rivalSeen: 0, byYou: 0, apart: 0, verdict: { loser: a.id, winner: sp.id, end: 'kill' } }; sp.dinoDuel = { ...a.dinoDuel, foe: a.id };
  const marks = s.currency || 0; g.packWorld(1 / 30, 1000).hurtCreature(sp, a, 5000); assert.ok(a.dead && a.noRewards);
  g.dinoDuelTick(1 / 30); assert.equal(g.message, 'The Spinosaurus devours the Earth Apatosaurus. Its spoils are lost.');
  assert.equal(s.currency || 0, marks); assert.equal(s.worldBeasts.earthApato.slain, 0); assert.equal(s.worldBeasts.earthApato.active, null);
});

test('it ignores the Triceratops: never a target, never a duel, never struck by its blows', () => {
  const w = arena({ player: { x: 20, y: 30 } }), a = apato(w, { x: 20, y: 18 }); const t = createCombatant('triceratops', 21, 21, false, []); Object.assign(t, { id: 'trike', aggro: true, hp: 500, maxHp: 500, triceratopsDisposition: 'bad' }); w.enemies.push(t);
  const ev = run(w, 40); assert.ok(!ev.some((x) => x.type === 'start'), 'no duel'); assert.ok(!w.creatureHits.some((h) => h.id === 'trike' && h.by === a.id), 'never struck by it');
  assert.ok(apatoIgnores(t) && apatoIgnores({ kind: 'triceratops', mountView: true }) && !duelPair(a, t));
  assert.ok(!w.enemies.some((q) => q.pack?.data?.prey === 'trike' && q.id === a.id));
});

// ------------------------------------------------------------------------------------------------ spawns, resume, Echo
test('big rooms: version-pinned per floor history; a floor generated before never gains one; ordinary dungeons never', () => {
  const map = { building: { style: 'keep' }, width: 30, tiles: Array.from({ length: 900 }, (_, i) => ({ x: i % 30, y: Math.floor(i / 30), kind: 'floor' })), entry: { x: 1, y: 1 } };
  let held = 0; for (let i = 0; i < 300; i++) { const q = apatoRoomSpawn('S', `building:S:${i}:f1`, map, 'building'); if (q) { held++; assert.equal(q.kind, 'earthApato'); assert.ok(q.apatoRoom); } }
  assert.ok(held > 0 && held < 300 * APATO_ROOMS.chance * 2, `${held}`); assert.equal(apatoRoomSpawn('S', 'x', map, 'building', 0), null, 'no version, none');
  assert.equal(apatoRoomSpawn('S', 'x', map, 'dungeon', 1), null); assert.equal(apatoRoomSpawn('S', 'x', map, 'building', 1, true), null, 'a stego or Spinosaurus already there');
  let found = null; for (let i = 0; i < 300 && !found; i++) { const s = freshSave(); s.seed = 'APATO-ROOMS'; const id = `building:APATO-ROOMS:${i}:2:${i % 2 ? 'keep' : 'apartment'}:4:f1`, m = generatePinnedDungeon(s, id);
    assert.equal(s.consequences.dungeons[id].apatoRooms, APATO_ROOMS.version); const q = m.enemySpawns.find((e) => e.kind === 'earthApato'); if (q) found = { id, m }; }
  assert.ok(found, 'some fresh floor holds one');
  const s = freshSave(); s.seed = 'APATO-ROOMS'; generatePinnedDungeon(s, found.id); delete s.consequences.dungeons[found.id].apatoRooms; const m = generatePinnedDungeon(s, found.id);
  assert.ok(!m.enemySpawns.some((e) => e.kind === 'earthApato'), 'generated before: keeps what it had');
  const fresh = JSON.parse(JSON.stringify(found.m)); fresh.enemySpawns = fresh.enemySpawns.filter((e) => e.kind !== 'earthApato'); assert.equal(JSON.stringify(m), JSON.stringify(fresh), 'and is otherwise byte for byte the same floor');
});

test('exact resume: mid-fight its saplings, venom and hunt state come back; no move or hazard resumes mid-way; then it plays on', () => {
  const w = arena(), e = apato(w); let saved = null;
  run(w, 50, () => { w.player.x = 20 + Math.cos(w.now / 2000) * 6; if (!saved && e.apatoSaplings.length >= 2 && e.pack.attack) saved = JSON.parse(JSON.stringify(w.enemies)); });
  assert.ok(saved, 'a mid-fight snapshot'); const back = saved.find((q) => q.kind === 'earthApato'); resetPackRuntime(back);
  assert.equal(back.pack.attack, null); assert.ok(Object.values(back.apatoFx).filter(Array.isArray).flat().every((q) => !q.on), 'no hazard resumes');
  assert.deepEqual(back.apatoSaplings.map((q) => [q.x, q.y]), saved.find((q) => q.kind === 'earthApato').apatoSaplings.map((q) => [q.x, q.y]), 'its saplings are where they were');
  for (const c of saved.filter((q) => q.kind === 'apatoClone')) { resetPackRuntime(c); assert.equal(c.apatoLatched, false, 'a reload lets every coil go'); }
  const v = arena(); v.enemies = saved; run(v, 10); assert.ok(v.hurts.length > 0, 'it fights on');
});

function resolveGame() { const s = freshSave(); s.seed = 'RESOLVE'; s.echoes.owned.earthApato = true; s.echoes.equipped = ['earthApato']; const g = new Game(s, 0); g.enemies = []; return { s, g, p: g.player }; }
const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
test('Earth Resolve (its Echo): planted only by an attack made standing still, and never during its cooldown', () => {
  const E = ECHOES.earthApato; assert.equal(E.name, 'Earth Resolve'); assert.ok(E.cost >= 1 && E.cost <= 3 && /standing still/.test(E.text));
  const { g } = resolveGame(), now = 50000;
  g.resolveMovedAt = now - APATO_ECHO.still * 1000 + 50; assert.equal(earthResolvePlant(g, now), null, 'moving a moment ago: none');
  g.resolveMovedAt = now - APATO_ECHO.still * 1000 - 1; const q = earthResolvePlant(g, now); assert.ok(q && q.r === APATO_ECHO.radius, 'standing still: planted, small');
  assert.equal(earthResolvePlant(g, now + 10), null, 'one at a time');
  assert.equal(tickEarthResolve(g, q.until), 1); assert.equal(g.earthResolve, null, 'it ends when its time runs out'); assert.equal(g.player.echoResolveReadyAt, q.until + APATO_ECHO.cooldown);
  assert.equal(earthResolvePlant(g, q.until + APATO_ECHO.cooldown - 1), null, 'cooling down'); assert.ok(earthResolvePlant(g, q.until + APATO_ECHO.cooldown), 'then again, small, wherever she next attacks still');
  const { g: n } = resolveGame(); n.save.echoes.equipped = []; n.resolveMovedAt = -1e6; assert.equal(earthResolvePlant(n, now), null, 'only with the Echo equipped');
});
test('Earth Resolve: hits landed inside grow and extend it, to its caps; lifesteal inside; nothing outside; it never hurts a foe', () => {
  const { g, p } = resolveGame(), now = 50000; g.resolveMovedAt = 0; const q = earthResolvePlant(g, now), max = g.save.maxHp;
  const foe = createCombatant('rootBrute', p.x + 1, p.y, true, []); foe.hp = foe.maxHp = 500; g.enemies.push(foe);
  p.hp = 50; assert.equal(earthResolveHit(g, 100, now), Math.floor(100 * APATO_ECHO.lifesteal), 'heals its share of the damage dealt'); assert.equal(p.hp, 50 + 10);
  assert.ok(Math.abs(q.r - (APATO_ECHO.radius + APATO_ECHO.grow)) < 1e-9 && q.until === now + (APATO_ECHO.seconds + APATO_ECHO.extend) * 1000, 'grown and extended');
  for (let i = 0; i < 40; i++) earthResolveHit(g, 10, now); assert.equal(q.r, APATO_ECHO.maxRadius, 'to its largest'); assert.equal(q.until, q.at + APATO_ECHO.cap * 1000, 'never past 10 s');
  assert.equal(foe.hp, 500, 'it never touches a foe'); for (let t = 0; t < 30; t++) tickEarthResolve(g, now + t * 33); assert.equal(foe.hp, 500);
  p.x = q.x + q.r + 1; const r = q.r, hp = p.hp; assert.equal(earthResolveHit(g, 100, now), 0); assert.equal(q.r, r); assert.equal(p.hp, hp, 'outside: no heal, no growth');
  assert.equal(tickEarthResolve(g, now + 100), 1, 'outside: no guard'); p.x = q.x - .5; p.y = q.y - .45; assert.equal(tickEarthResolve(g, now + 100), 1 - APATO_ECHO.guard, 'inside: the guard');
  p.hp = max; p.invulnerableUntil = 0; g.update(1 / 30, still, now + 200); const a0 = p.hp; g.packHurt(null, 200, {}, now + 300); const inside = a0 - p.hp;
  p.x = q.x + 6; p.hp = max; p.invulnerableUntil = 0; g.update(1 / 30, still, now + 400); const b0 = p.hp; g.packHurt(null, 200, {}, now + 500); const outside = b0 - p.hp;
  assert.ok(inside > 0 && inside < outside * .85, `less damage inside (${inside} vs ${outside})`);
});
test('Earth Resolve resumes as the other Echo clocks: the cooldown comes back, the sigil does not', () => {
  assert.ok(PLAYER_CLOCKS.includes('echoResolveReadyAt') && RESUME_PLAYER_CLOCKS.includes('echoResolveReadyAt'));
  const { g } = resolveGame(); g.resolveMovedAt = 0; earthResolvePlant(g, 50000); g.player.echoResolveReadyAt = 70000;
  const json = JSON.stringify(g.save); assert.ok(!json.includes('earthResolve'), 'the sigil is never saved');
  const back = new Game(migrateSave(JSON.parse(json)), 0); assert.equal(back.earthResolve ?? null, null, 'a reload drops it');
});

// ------------------------------------------------------------------------------------------------ Close View
test('Close View: at or under the stego per tier, 39 bones, a cheaper clone in the minion allowance', () => {
  for (const t of ['full', 'balanced', 'low']) { assert.ok(apatoMesh(t).triangles <= stegoMesh(t).triangles, `${t}: ${apatoMesh(t).triangles} <= ${stegoMesh(t).triangles}`); assert.ok(apatoCloneMesh(t).triangles <= BEAST_SLOT.minion.triangles[t], `clone ${t}`); }
  assert.ok(APATO_SKELETON.count <= BEAST_SLOT.maxBones); assert.ok(CLOSE_VIEW_BEASTS.earthApato && CLOSE_VIEW_BEASTS.apatoClone.minion);
});

test('Close View: the long neck bends smoothly along the game\'s own lash path, its head at the lash\'s head', () => {
  const xs = [], ys = []; for (let i = 0; i <= 12; i++) { xs.push(11 + i * .8); ys.push(10 + Math.sin(i * .7) * 1.4); }
  const e = { id: 'cv', kind: 'earthApato', x: 10, y: 10, hp: 9, maxHp: 9, apatoHeading: { x: 1, y: 0 }, apatoPose: 'lash', apatoLash: { on: true, n: 12, xs, ys } }, tr = createApatoTrack();
  let F; for (let k = 0; k < 20; k++) F = sampleApato(tr, e, { now: 1000 + k * 33, scale: 2.64, x: 10.5, y: 10.75, z: 0, tier: 'full', target: { x: 18, y: 11 } });
  assert.ok(F && F.skin.every(Number.isFinite));
  const head = apatoBone(tr, 'head'); assert.ok(Math.hypot(head[0] - (xs[12] + .5), head[1] - (ys[12] + .75)) < .6, `head at the lash head (${head})`);
  let worst = 0; for (let i = 1; i < 12; i++) { const a = apatoBone(tr, 'n' + i), b = apatoBone(tr, 'n' + (i + 1)), c = apatoBone(tr, i < 11 ? 'n' + (i + 2) : 'head'); const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
    const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v) || 1); worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, cos)))); }
  assert.ok(worst < 1.1, `no joint folds sharply (${worst.toFixed(2)} rad)`);
  const rest = createApatoTrack(); let R; for (let k = 0; k < 20; k++) R = sampleApato(rest, { ...e, apatoPose: null, apatoLash: null }, { now: 1000 + k * 33, scale: 2.64, x: 10.5, y: 10.75, z: 0, tier: 'low' }); assert.ok(R && apatoBone(rest, 'head')[2] > 3, 'at rest its head is held high');
});

test('world-boss pacing: the roaming and big-room Apatosaurus wind up by packWindupScale (its marks with them); its clones are not paced', async () => {
  const { worldBossPaced, packWindupScale } = await import('../src/monster-pack.ts');
  assert.ok(worldBossPaced({ worldBeast: 'earthApato' }) && worldBossPaced({ apatoRoom: true })); assert.ok(!worldBossPaced({ apatoCloneOf: 'x', kind: 'apatoClone' }));
  const w = arena({ player: { x: 20, y: 22.5 } }); w.bossPace = true; const e = apato(w); e.worldBeast = 'earthApato'; e.boss = true;
  run(w, .1); const s = e.pack; assert.ok(s.paced && s.worldPaced, 'paced as a world boss'); s.cd = {}; s.gap = 0; for (const k of MOVES) if (k !== 'apatoNeckSlam') s.cd[k] = 999;
  let begun = null, landed = null; run(w, 6, () => { if (s.attack === 'apatoNeckSlam' && begun === null) begun = w.now; if (begun !== null && landed === null && w.hurts.some((h) => h.source === 'apatoNeckSlam')) landed = w.now; });
  const want = ATTACK_MODULES.apatoNeckSlam.windup * packWindupScale(s); assert.ok(packWindupScale(s) > 1.2, 'stretched beyond BOSS_PACE alone');
  assert.ok(Math.abs((landed - begun) / 1000 - want) < .1, `the slam lands as its windup ends (${((landed - begun) / 1000).toFixed(2)} s vs ${want.toFixed(2)} s)`);
});
