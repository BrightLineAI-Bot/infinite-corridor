// Per-actor hit-stop (Tim, 2026-11-19: "like Elden Ring"; src/hitstop-actors.ts). A heavy connect pauses only the Wayfarer and
// the creature she struck; every other creature, shot and timer runs on, and a blow from another creature still lands during the
// stop. Weighted swings, a perfect parry and hard-staggering blows (Hammerfall, its clap, a charged Iron Fist) all go through it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { PRIMARY_SWINGS } from '../src/melee-swing.ts';
import { HITSTOP_ACTORS as H, hitStopActorMs, beginHitStop, tickHitStop, normalizeHitStop, holdFoe, foeHeld } from '../src/hitstop-actors.ts';
import { CLOSE_VIEW_POLISH } from '../src/close-view-polish.ts';

const STEP1 = PRIMARY_SWINGS['verge-cleaver'].steps[0];
const cleaver = () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5, property: 'impact' });
const calm = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
const once = (key: string) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k: string) => k === key && !used && (used = true), held: () => false, reset: () => {} }; };
const open = (g: any) => { for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; t.environment = false; if (t.kind === 'yardGrass' || t.kind === 'water' || t.kind === 'river') t.kind = 'flagFloor'; } g.map.objects = (g.map.objects || []).filter((o: any) => o.kind !== 'npc'); };
// A fresh journey on an open overworld section, the Cleaver in hand, the Wayfarer facing right at (15, 16).
function overworld({ lattice = false } = {}) {
  const s: any = freshSave(); s.seed = 'HITSTOP-ACTORS'; s.level = 10; s.activeWeaponSlot = 'primary'; s.equipment.primary = cleaver(); s.maxHp = 500;
  if (lattice) { s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = ['field:power-aegis']; }
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.rx = 4; g.ry = 4; g.loadArea('overworld', false); open(g); g.projectiles = []; g.effects = [];
  Object.assign(g.player, { x: 15, y: 16, facing: 'right', hp: 500 }); s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = null; return g;
}
const foe = (g: any, id: string, x: number, y: number, extra = {}) => Object.assign(createCombatant('ashling', x, y), { id, hp: 1e6, maxHp: 1e6, damage: 0, aggro: true }, extra);
// A Hammerfall-weight blow of the Wayfarer's (a brawler effect with a stagger), landing on whatever stands in its radius.
const hammer = (g: any, x: number, y: number, stun = .6, radius = 1.2) => g.effects.push({ id: `tool-hs-${g.effects.length}`, kind: 'hammerfall', brawler: true, x, y, life: .25, radius, pulse: 99, untilPulse: 0, damage: 5, pulseIndex: 0, hits: {}, stun });
const pose = (e: any) => JSON.stringify([e.x, e.y, e.hitStun, e.cooldown, e.telegraph, e.recoil, e.ai?.mode]);

test('the table: data, capped, gapped; swing by its step, parry 70 ms, a stagger scaled by weight; Reduced Motion turns parry and stagger off', () => {
  assert.ok(Object.isFrozen(H) && Object.isFrozen(H.swing) && Object.isFrozen(H.parry) && Object.isFrozen(H.stagger));
  assert.ok(H.swing.maxMs <= 110 && H.parry.maxMs <= 70 && H.stagger.maxMs <= 70 && H.gapMs >= 100 && H.foeMaxMs <= 110);
  assert.equal(hitStopActorMs('swing', { ms: STEP1.hitStopMs }), STEP1.hitStopMs);
  assert.equal(hitStopActorMs('swing', { ms: 400 }), H.swing.maxMs, 'a heavy swing is capped at ~110 ms');
  assert.equal(hitStopActorMs('parry'), H.parry.ms); assert.ok(H.parry.ms >= 40 && H.parry.ms <= 70);
  assert.equal(hitStopActorMs('stagger', { stun: .1 }), 0, 'a light blow: none');
  assert.equal(hitStopActorMs('stagger', { stun: .6 }), H.stagger.ms, 'Hammerfall');
  const mid = hitStopActorMs('stagger', { stun: .4 }); assert.ok(mid >= 40 && mid < H.stagger.ms, `scaled by weight (${mid})`);
  assert.ok(hitStopActorMs('stagger', { stun: 9 }) <= H.stagger.maxMs);
  assert.equal(hitStopActorMs('parry', { reduce: true }), 0); assert.equal(hitStopActorMs('stagger', { stun: .6, reduce: true }), 0);
  assert.equal(hitStopActorMs('swing', { ms: 60, reduce: true }), 60, 'a swing keeps its own tuned hold');
  assert.equal(hitStopActorMs('nope' as any), 0);
  assert.ok(!('hitStop' in CLOSE_VIEW_POLISH), 'the full-frame hold\'s table is gone from the polish pass');
});

test('the Wayfarer record: begins, refuses while one runs, joins in the same update, then waits out the gap', () => {
  let r = beginHitStop(null, 'stagger', 60, 1000); assert.equal(r.ms, 60); let s: any = r.state;
  r = beginHitStop(s, 'parry', 70, 1000); assert.equal(r.ms, 60, 'joined in the same update: never longer than she has left'); assert.equal(r.joined, true); assert.equal(s.left, 60, 'she pauses once');
  assert.equal(tickHitStop(s, 16), 16); assert.equal(beginHitStop(s, 'parry', 70, 1016).ms, 0, 'no stacking');
  let held = 16; for (let i = 0; i < 10; i++) held += tickHitStop(s, 16); assert.equal(held, 60, 'held exactly its length');
  assert.ok(s.gap > 0 && s.gap <= H.gapMs); assert.equal(beginHitStop(s, 'stagger', 60, 2000).ms, 0, 'inside the gap: none');
  for (let i = 0; i < 20; i++) tickHitStop(s, 16); assert.equal(s.gap, 0); assert.equal(beginHitStop(s, 'stagger', 60, 3000).ms, 60);
  assert.equal(normalizeHitStop({ kind: 'parry', left: 9999, gap: 9999 }).left, H.parry.maxMs, 'a stored record is clamped');
  assert.equal(normalizeHitStop({ kind: 'x', left: 50 }), null); assert.equal(normalizeHitStop({ kind: 'parry', left: 0, gap: 0 }), null);
  const e: any = { hitStop: 99999 }; assert.equal(foeHeld(e, 16), true); assert.ok(e.hitStop <= H.foeMaxMs, 'a stored foe stop is clamped');
  assert.equal(holdFoe({ staggerGuard: 1 }, 60), false, 'a guarded foe shrugs it off'); assert.equal(holdFoe({ kind: 'npc' }, 60), false);
});

test('a weighted swing: only the Wayfarer and the struck foe pause; a third creature moves on and its blow lands during the stop', () => {
  // A walks toward the Wayfarer and is struck; C, far behind her, keeps chasing.
  const g = overworld(), A = foe(g, 'A', 16.2, 16), C = foe(g, 'C', 8, 16); g.enemies = [A, C];
  g.update(.008, once('attack'), 1000);
  let t = 1000; while (!(g.hitStop?.left > 0) && t < 2000) { t += 8; g.update(.008, calm, t); }
  assert.equal(g.hitStop.kind, 'swing'); assert.equal(g.hitStop.left, STEP1.hitStopMs, 'the step\'s own hold');
  assert.ok(A.hitStop > 0, 'the struck foe pauses'); assert.ok(!(C.hitStop > 0), 'the other does not');
  const q = g.pendingMeleeContact, e0 = q.elapsedMs, a0 = pose(A), c0 = C.x; let frames = 0;
  while (g.hitStop?.left > 0) { t += 8; g.update(.008, calm, t); frames++; if (A.hitStop > 0) assert.equal(pose(A), a0, 'the struck foe\'s AI, movement and stagger hold'); if (g.hitStop?.left > 0) assert.equal(q.elapsedMs, e0, 'the swing holds'); }
  assert.ok(frames * 8 >= STEP1.hitStopMs && frames * 8 <= STEP1.hitStopMs + 8, `${frames} frames`);
  assert.ok(C.x > c0 + .01, `the third creature kept moving (${c0} -> ${C.x})`);
  for (let i = 0; i < 4; i++) { t += 8; g.update(.008, calm, t); } assert.ok(q.elapsedMs > e0, 'the swing runs on after it'); assert.ok(!(A.hitStop > 0));
  // A blow from another creature lands on her during the stop (damage is never deferred): B stands behind her and attacks for
  // real; some press time puts a stop over one of its blows.
  const arena = () => { const g = overworld(), A = foe(g, 'A', 16.2, 16), B = foe(g, 'B', 14.1, 16, { damage: 7 }); g.enemies = [A, B]; return { g, A, B }; };
  let landed = null;
  for (let press = 1000; press < 3000 && !landed; press += 8) {
    const { g, A, B } = arena(); for (let t = 1000; t < press; t += 8) g.update(.008, calm, t); g.update(.008, once('attack'), press);
    for (let t = press + 8; t < press + 900; t += 8) { const hp = g.player.hp, b0 = pose(B), held = g.hitStop?.left > 0 && A.hitStop > 0; g.update(.008, calm, t); if (held && g.player.hp < hp) { landed = { press, t, b: b0 !== pose(B) }; break; } }
  }
  assert.ok(landed, 'the third creature\'s blow landed while the Wayfarer and her foe were held');
});

test('multi-hit: a hard blow over three foes pauses each of them and the Wayfarer once; a foe outside it never pauses', () => {
  const g = overworld(), foes = [foe(g, 'a', 17, 16), foe(g, 'b', 17, 16.8), foe(g, 'c', 17, 15.2)], far = foe(g, 'far', 9, 16); g.enemies = [...foes, far];
  g.player.actionVisualUntil = 1000 + 400; const until0 = g.player.actionVisualUntil;
  hammer(g, 17.5, 16.45); g.update(.016, calm, 1000);
  assert.equal(g.hitStop.kind, 'stagger'); assert.equal(g.hitStop.left, H.stagger.ms, 'the Wayfarer: one stop, not three');
  for (const e of foes) assert.ok(e.hitStop > 0, `${e.id} pauses`); assert.ok(!(far.hitStop > 0));
  const x0 = far.x; let t = 1000; while (g.hitStop?.left > 0) { t += 16; g.update(.016, calm, t); }
  assert.equal(g.player.actionVisualUntil, until0 + H.stagger.ms, 'her action clock held for exactly the stop');
  assert.ok(far.x !== x0, 'the far foe moved on through it');
  // a second hard blow inside the gap: no stop; after it: a stop again (never chained into a long freeze)
  hammer(g, 17.5, 16.45); t += 16; g.update(.016, calm, t); assert.ok(!(g.hitStop?.left > 0), 'inside the gap');
  while (g.hitStop) { t += 16; g.update(.016, calm, t); }
  for (const e of foes) delete e.hitStop; hammer(g, 17.5, 16.45); t += 16; g.update(.016, calm, t); assert.equal(g.hitStop.left, H.stagger.ms);
  // the swing: one stop for the whole pack
  const h = overworld(), pack = [-30, 0, 30].map((a, i) => foe(h, `p${i}`, 15 + Math.cos(a * Math.PI / 180) * 1.2, 16 + Math.sin(a * Math.PI / 180) * 1.2)); h.enemies = pack;
  h.update(.008, once('attack'), 1000); let u = 1000; while (!(h.hitStop?.left > 0) && u < 2000) { u += 8; h.update(.008, calm, u); }
  assert.equal(h.pendingMeleeContact.stopLeft, STEP1.hitStopMs); const paused = new Set(pack.filter(e => e.hitStop > 0).map(e => e.id)), hp = pack.map(e => e.hp);
  let wayfarer = 0; while (h.pendingMeleeContact && u < 3000) { u += 8; const was = h.hitStop?.at; h.update(.008, calm, u); for (const e of pack) if (e.hitStop > 0) paused.add(e.id); if (h.hitStop?.left > 0 && h.hitStop.at !== was) wayfarer++; }
  assert.ok(pack.every((e, i) => e.hp < hp[i] || e.hp < 1e6), 'the blade met all three'); assert.equal(paused.size, 3, 'each foe it struck paused'); assert.equal(wayfarer, 0, 'the Wayfarer paused once, on the first hit');
});

test('a perfect parry pauses the Wayfarer and the parried foe; Reduced Motion and Safe Mode: no parry or stagger stop', () => {
  const g = overworld({ lattice: true }), A = foe(g, 'A', 16, 16), C = foe(g, 'C', 9, 16); g.enemies = [A, C]; g.update(.016, calm, 1000);
  assert.equal(g.perfectParry(1016, A), true); assert.equal(g.hitStop.kind, 'parry'); assert.equal(g.hitStop.left, H.parry.ms); assert.ok(A.hitStop > 0); assert.ok(!(C.hitStop > 0));
  for (const presentation of [{ reduceMotion: true }, { safeMode: true }]) {
    const r = overworld({ lattice: true }), B = foe(r, 'B', 16, 16); r.enemies = [B]; r.presentation = presentation; r.update(.016, calm, 1000);
    r.perfectParry(1016, B); hammer(r, 16.5, 16.45); r.update(.016, calm, 1032);
    assert.ok(!(r.hitStop?.left > 0), 'no stop'); assert.ok(!(B.hitStop > 0), 'the foe never pauses');
  }
});

test('exact resume: a reload mid-stop resumes the same remainder, never longer; a pause holds it exactly', () => {
  const g = overworld(), A = Object.assign(g.enemies.find((e: any) => !e.dead) || g.enemies[0], { x: 16.2, y: 16, hp: 1e6, maxHp: 1e6, damage: 0, aggro: true, dead: false });
  g.enemies = [A]; hammer(g, 16.7, 16.45); g.update(.016, calm, 1000); g.update(.016, calm, 1016);
  const left = g.hitStop.left, foeLeft = A.hitStop; assert.ok(left > 0 && left < H.stagger.ms && foeLeft > 0);
  const snap = g.exportSnapshot(1016); assert.deepEqual(snap.session.playerRuntime.hitStop, { kind: 'stagger', left, gap: 0, at: null });
  const back: any = new Game(deserializeSave(serializeSave(snap)), 500000);
  assert.equal(back.hitStop.left, left, 'the Wayfarer\'s remainder'); const bA = back.enemies.find((e: any) => e.id === A.id); assert.equal(bA.hitStop, foeLeft, 'the foe\'s remainder');
  let a = 0, b = 0, t = 1016, u = 500000; while (g.hitStop?.left > 0) { t += 16; g.update(.016, calm, t); a++; } while (back.hitStop?.left > 0) { u += 16; back.update(.016, calm, u); b++; }
  assert.equal(b, a, 'it ends after the same frames'); assert.ok(!(bA.hitStop > 0));
  // a save with no stop running writes nothing of it (additive)
  const quiet = overworld(); assert.equal('hitStop' in quiet.exportSnapshot(1000).session.playerRuntime, false);
  // a pause (and the app in the background) holds both exactly
  const p = overworld(), P = foe(p, 'P', 16.2, 16); p.enemies = [P]; hammer(p, 16.7, 16.45); p.update(.016, calm, 1000);
  const l0 = p.hitStop.left, f0 = P.hitStop; p.setPaused(true, 1000); for (let t = 1016; t < 9000; t += 16) p.update(.016, calm, t); p.setPaused(false, 9000);
  assert.equal(p.hitStop.left, l0); assert.equal(P.hitStop, f0);
});
