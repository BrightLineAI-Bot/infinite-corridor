// Aerial Step walks on air (Tim, 2026-11-15): "while Aerial Step is active the Wayfarer walks on air at the height they cast it";
// cast falling it stops the fall; a jump lands back on the held level; it never lifts and never lets them down early; when it ends
// over empty space they fall from there (lethal stays lethal); at most two casts before the feet touch ground; one charge, two with
// Quickening's secondary form, Quickened Stride. game.ts AERIAL; constellation.ts ALT_PASSIVES.quickening, aerialChargesNow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, FALL, AERIAL } from '../src/game.ts';
import { fallDamage } from '../src/landscape.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { ALT_PASSIVES, ALT_UNLOCK_TIER, toggleAlt, ensureConstellation, aerialChargesNow, aerialChargeMax, quickenedStride, respec } from '../src/constellation.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { slotReadiness, setSlot } from '../src/spell-slots.ts';
import fs from 'node:fs';
import { AERIAL_RINGS, aerialRingState } from '../src/close-view.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero, AERIAL_CAST_POSE } from '../src/close-view-hero.ts';
import { ACTION_MOTION } from '../src/action-motion.ts';

const SEED = 'ROOF', W = 32, ROW = 30, A = APERTURE_SKILLS['aerial-step'];
const inp = (x: number, y = 0, jump = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
// A Wayfarer in an open-world section with Aerial Step learned (and Quickening to rank 3, for its secondary form).
function wayfarer({ stride = false } = {}) {
  const s: any = freshSave(); s.seed = SEED; s.maxHp = 100; s.perception.aperture = APERTURE_BANDS[ALT_UNLOCK_TIER].threshold;
  s.magicSkills.learned = { quickening: 3, 'aerial-step': 1 }; s.constellation.mods['light-feet'] = true; s.constellation.caps.motion = 'aerial-step';
  if (stride) assert.equal(toggleAlt(s, 'quickening').ok, true);
  Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.player.maxHp = s.maxHp;
  g.update(1 / 60, inp(0), 4000); g.enemies = []; g.player.hp = g.player.maxHp; return g;
}
const open = (g: any, x: number, y: number, elev: number, kind = 'ash') => Object.assign(g.map.tiles[y * W + x], { kind, blocked: false, elev, slope: false, environment: undefined, structure: undefined, buildingId: undefined, canopy: undefined, skyPlatform: undefined });
// A ledge on rows ROW-1..ROW+1: x 1..4 at `high`, x 5..20 at `low`, a far ledge from `farFrom` at `far` (when given).
function ledgeTiles(g: any, high: number, low = 0, far: number | null = null, farFrom = 14, lowKind = 'ash') {
  for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) open(g, x, y, x <= 4 ? high : far != null && x >= farFrom ? far : low, x <= 4 || (far != null && x >= farFrom) ? 'ash' : lowKind);
}
function ledge(g: any, high: number, low = 0, far: number | null = null, farFrom = 14, lowKind = 'ash') { ledgeTiles(g, high, low, far, farFrom, lowKind); g.player.x = 3.6; g.player.y = ROW - .25; }
function drive(g: any, hz = 60, t0 = 5000) { let t = t0; const dt = 1 / hz; return { step(x = 0, y = 0, jump = false) { t += 1000 / hz; g.lastUpdateNow = t; g.update(dt, inp(x, y, jump), t); g.enemies = []; return t; }, now: () => t }; }
const deaths = (g: any) => g.save.worldFlags.deaths || 0;
const dead = (g: any, d0 = 0) => deaths(g) > d0 || g.player.hp <= 0 || g._fatalFall === true;
const cast = (g: any, now: number) => { g.lastUpdateNow = now; return g.activateApertureSkill('aerial-step'); };

test('the data: one charge, two casts an airtime, Quickened Stride on Quickening adds one; the description says what it does', () => {
  assert.equal(A.charges, 1); assert.equal(A.airCasts, 2); assert.equal(A.cooldown, 22); assert.equal(A.duration, 3.5);
  assert.match(A.description, /walk on air/i); assert.doesNotMatch(A.description, /briefly cross/i);
  const Q = ALT_PASSIVES.quickening; assert.equal(Q.name, 'Quickened Stride'); assert.equal(Q.kind, 'changes'); assert.equal(Q.charges, 1); assert.match(Q.text, /second charge/);
  assert.ok(ALT_PASSIVES['aerial-step'], 'Long Quickening keeps its id');
});

test('walking off a ledge with Aerial Step holds the height: no fall, no damage, over the drop', () => {
  const g = wayfarer(); ledge(g, 6); const d = drive(g); assert.equal(cast(g, d.now()), true);
  for (let i = 0; i < 90; i++) d.step(1);
  assert.ok(g.player.x > 7, `walked out over the drop (${g.player.x.toFixed(2)})`); assert.ok(g.fall, 'in the air');
  assert.equal(g.fall.z, 6, 'at the cast height'); assert.equal(g.fall.vz, 0); assert.equal(g.playerLevel(), 6); assert.equal(g.aerialHeld(), true);
  assert.equal(g.player.hp, g.player.maxHp); assert.equal(g.fallPoseDue(), false, 'no falling pose while it holds');
});

test('off a great tree with the glider owned, Aerial Step still holds the height (no freefall glide); without it the freefall begins', () => {
  for (const held of [true, false]) { const g = wayfarer(); g.save.glider = true; ledge(g, 6); const d = drive(g); if (held) cast(g, d.now());
    for (let i = 0; i < 60; i++) { g.lastCrownAt = d.now(); d.step(1); } // as if just off a great tree's canopy (treeLaunch)
    if (held) { assert.equal(g.glide, null, 'no glide'); assert.equal(g.aerialHeld(), true); assert.equal(g.fall.z, 6); } else assert.ok(g.glide, 'the freefall glide, as before'); }
});

test('without Aerial Step the same walk off six levels is a fall, and lethal (the terror is kept)', () => {
  const g = wayfarer(); ledge(g, 6); const d = drive(g); let i = 0;
  for (; i < 400 && !dead(g); i++) d.step(i < 90 ? 1 : 0); assert.ok(dead(g), 'six levels kill');
});

test('cast while falling: the fall stops where it is, and when it ends the damage counts afresh from the held height', () => {
  const g = wayfarer(); ledge(g, 6); const d = drive(g); let i = 0;
  for (; i < 160 && !(g.fall && g.fall.z < 3.4); i++) d.step(1); assert.ok(g.fall && g.fall.vz < 0 && g.fall.z > 2, 'falling');
  const z = g.fall.z; assert.equal(cast(g, d.now()), true);
  assert.equal(g.fall.vz, 0, 'downward speed gone'); assert.equal(g.fall.z, z); assert.equal(g.fall.from, z, 'counted afresh from here'); assert.equal(g.fall.hold, z);
  for (let k = 0; k < 60; k++) d.step(k < 20 ? 1 : 0); assert.ok(Math.abs(g.fall.z - z) < 1e-12, 'held'); assert.equal(g.player.hp, g.player.maxHp);
  // it ends (3.5 s): the fall goes on from the held height, under FALL, and the landing is charged from there
  const M = g.player.maxHp; for (let k = 0; k < 400 && g.save.magicSkills.active; k++) d.step(0);
  assert.equal(g.save.magicSkills.active, null); assert.ok(g.fall && g.fall.hold === undefined && Math.abs(g.fall.from - z) < 1e-9, 'falls from the held height');
  for (let k = 0; k < 200 && g.fall; k++) d.step(0); assert.equal(g.fall, null);
  assert.equal(g.player.hp, M - fallDamage(z, M), `a ${z.toFixed(2)}-level drop from the hold, not 6 from the ledge`); assert.equal(dead(g), false);
});

test('a jump on held air lands back on the held level; a jump onto ground one level up stands there', () => {
  const g = wayfarer(); ledge(g, 3, 0, 4, 7); const d = drive(g); cast(g, d.now());
  for (let i = 0; i < 40; i++) d.step(1); assert.equal(g.aerialHeld(), true); const x0 = g.player.x; assert.ok(x0 > 5, 'over the drop');
  d.step(0, 0, true); assert.ok(d.now() < g.jumpUntil, 'a jump, not a catch'); assert.notEqual(g.message, FALL.nothing); assert.equal(g.jumpFrom, 3);
  for (let i = 0; i < 90 && d.now() < g.jumpUntil; i++) d.step(0); d.step(0); assert.equal(g.fall.z, 3, 'back on the held level'); assert.equal(g.aerialHeld(), true); assert.equal(g.player.hp, g.player.maxHp);
  // walk to the ledge one level up: a wall without a jump, then a jump lands on it
  for (let i = 0; i < 40; i++) d.step(1); assert.ok(g.player.x < 6.5 && g.player.x > 6.3, `stopped by the level-4 ledge (${g.player.x.toFixed(2)})`); assert.equal(g.fall.z, 3);
  assert.ok(g.save.magicSkills.active, 'still holding'); d.step(1, 0, true); for (let i = 0; i < 60; i++) d.step(1);
  assert.ok(g.player.x > 6.5, 'up on it'); assert.equal(g.fall, null, 'on real ground'); assert.equal(g.playerLevel(), 4); assert.equal(g.player.hp, g.player.maxHp);
});

test('it never lifts: a walk off lower ground holds there, not at the higher cast height; it never lets the Wayfarer down early', () => {
  const g = wayfarer(); ledge(g, 3); for (let y = ROW - 1; y <= ROW + 1; y++) Object.assign(g.map.tiles[y * W + 1], { elev: 4, slope: true }); g.player.x = 1.1; g.player.y = ROW - .25;
  const d = drive(g); d.step(0); assert.equal(g.playerLevel(), 4); cast(g, d.now()); assert.equal(g.save.magicSkills.active.hold, 4);
  for (let i = 0; i < 150; i++) d.step(1); assert.ok(g.player.x > 7);
  assert.equal(g.fall.z, 3, 'held where it stepped off (3), not lifted to the cast height (4)'); assert.ok(g.player.hp > 0);
  // stick held every way for a while: never below the held level while it lasts
  let low = Infinity; for (let i = 0; i < 150 && g.save.magicSkills.active; i++) { d.step(i % 2, 1 - i % 2); if (g.fall && g.save.magicSkills.active) low = Math.min(low, g.fall.z); }
  assert.equal(low, 3);
});

test('ending over empty space falls; ending on the level over water still returns the Wayfarer to stable ground (the old crossing)', () => {
  const g = wayfarer(); ledge(g, 6); const d = drive(g); cast(g, d.now()); for (let i = 0; i < 90; i++) d.step(1);
  const d0 = deaths(g); for (let i = 0; i < 600 && !dead(g, d0); i++) d.step(0); assert.ok(dead(g, d0), 'six levels from the held height: lethal');
  // the old crossing: level ground on both sides of water, cast on the bank
  const k = wayfarer(); ledge(k, 0, 0, 0, 9, 'lakeWater'); const dk = drive(k); cast(k, dk.now());
  for (let i = 0; i < 70; i++) dk.step(1); assert.equal(k.fall, null, 'crossing on the level is no fall'); assert.equal(k.player.hp, k.player.maxHp);
  const x = k.player.x; assert.ok(x > 5 && x < 9, `over the water (${x.toFixed(2)})`);
  for (let i = 0; i < 400 && k.save.magicSkills.active; i++) dk.step(0);
  assert.equal(dead(k), false); assert.ok(k.player.x < 5, 'back on the bank'); assert.match(k.message, /stable ground/);
});

test('two casts an airtime at most (with Quickened Stride\'s second charge); the count comes back only on ground', () => {
  const g = wayfarer({ stride: true }); assert.equal(quickenedStride(g.save), true); assert.equal(aerialChargeMax(g.save), 2); ledge(g, 9); const d = drive(g);
  assert.equal(cast(g, d.now()), true); assert.equal(aerialChargesNow(g.save), 1); for (let i = 0; i < 90; i++) d.step(1); assert.equal(g.aerialHeld(), true);
  // the first ends; falling, the second catches; a third (charges refilled by hand) is refused: no ground touched
  for (let i = 0; i < 400 && g.save.magicSkills.active; i++) d.step(0); for (let i = 0; i < 12; i++) d.step(0); assert.ok(g.fall.vz < 0, 'falling');
  assert.equal(cast(g, d.now()), true, 'second cast'); assert.equal(g.fall.vz, 0); const held = g.fall.z;
  g.save.magicSkills.aerialCharges = 2; g.save.magicSkills.cooldowns['aerial-step'] = 0;
  for (let i = 0; i < 400 && g.save.magicSkills.active; i++) d.step(0); for (let i = 0; i < 6; i++) d.step(0);
  assert.equal(cast(g, d.now()), false, 'a third in one airtime'); assert.equal(g.message, AERIAL.capped); assert.equal(g.aerialCasts, 2);
  assert.ok(held < 9);
  // ground: the count comes back
  const k = wayfarer({ stride: true }); ledge(k, 0); const dk = drive(k); cast(k, dk.now()); cast(k, dk.now()); assert.equal(k.aerialCasts, 2); k.save.magicSkills.aerialCharges = 2;
  assert.equal(cast(k, dk.now()), false, 'twice while still on the ground counts');
  for (let i = 0; i < 400 && k.save.magicSkills.active; i++) dk.step(0); dk.step(0); assert.equal(k.aerialCasts, 0, 'on ground once it ends: back');
  // a landing on real ground resets it even while it still holds
  const h = wayfarer({ stride: true }); ledge(h, 3, 0, 4, 7); const dh = drive(h); cast(h, dh.now()); for (let i = 0; i < 30; i++) dh.step(1);
  assert.equal(h.aerialCasts, 1); assert.equal(h.aerialAloft, true); for (let i = 0; i < 80; i++) dh.step(1, 0, i === 0); assert.ok(h.save.magicSkills.active, 'still holding'); assert.equal(h.fall, null); assert.equal(h.aerialCasts, 0, 'landed on the level-4 ground');
});

test('charges: one without Quickened Stride, two with it; each comes back on the 22 s cooldown; Quickening is passive while Stride is chosen', () => {
  const g = wayfarer(); const d = drive(g); assert.equal(aerialChargeMax(g.save), 1);
  assert.equal(cast(g, d.now()), true); assert.equal(aerialChargesNow(g.save), 0); assert.equal(cast(g, d.now()), false, 'one charge'); assert.match(g.message, /recovers/);
  const s2 = wayfarer({ stride: true }), d2 = drive(s2); assert.equal(cast(s2, d2.now()), true); assert.equal(cast(s2, d2.now()), true, 'a second back to back');
  assert.equal(aerialChargesNow(s2.save), 0); assert.ok(Math.abs(s2.save.magicSkills.cooldowns['aerial-step'] - A.cooldown) < 1e-9, 'the second keeps the first one\'s clock');
  for (let i = 0; i < 60 * 22 + 5; i++) d2.step(0); assert.equal(aerialChargesNow(s2.save), 1, 'one back after 22 s');
  assert.ok(s2.save.magicSkills.cooldowns['aerial-step'] > 21, 'the next starts');
  for (let i = 0; i < 60 * 22 + 5; i++) d2.step(0); assert.equal(aerialChargesNow(s2.save), 2); assert.equal(s2.save.magicSkills.cooldowns['aerial-step'], 0);
  // Quickening cannot be cast while Quickened Stride is chosen (as Aerial Step cannot under Long Quickening); toggled back, it can
  s2.lastUpdateNow = d2.now(); assert.equal(s2.activateApertureSkill('quickening'), false); assert.match(s2.message, /Quickened Stride/);
  assert.equal(toggleAlt(s2.save, 'quickening').ok, true); assert.equal(aerialChargeMax(s2.save), 1); assert.equal(aerialChargesNow(s2.save), 1, 'clamped to one');
  assert.equal(s2.activateApertureSkill('quickening'), true);
  // both secondaries at once: both passive, nothing breaks
  const b = wayfarer({ stride: true }); assert.equal(toggleAlt(b.save, 'aerial-step').ok, true); b.lastUpdateNow = 6000;
  assert.equal(b.activateApertureSkill('quickening'), false); assert.equal(b.activateApertureSkill('aerial-step'), false); const db = drive(b); for (let i = 0; i < 30; i++) db.step(1); assert.ok(b.player.hp > 0);
  // the slot shows the charges
  const t = wayfarer({ stride: true }); setSlot(t.save, 'b', 'skill:aerial-step'); assert.equal(slotReadiness(t.save, 'b').charges, 2); cast(t, 6000);
  assert.deepEqual([slotReadiness(t.save, 'b').charges, slotReadiness(t.save, 'b').remaining], [1, 0], 'ready with one left'); cast(t, 6000);
  assert.equal(slotReadiness(t.save, 'b').charges, 0); assert.ok(slotReadiness(t.save, 'b').remaining > 0);
});

test('Quickened Stride: open with the other secondary forms, learned Quickening required, kept through migrateSave, cleared by respec; old saves', () => {
  const s: any = freshSave(); s.perception.aperture = APERTURE_BANDS[ALT_UNLOCK_TIER].threshold; ensureConstellation(s);
  assert.equal(toggleAlt(s, 'quickening').ok, false, 'learn it first'); s.magicSkills.learned.quickening = 1; assert.equal(toggleAlt(s, 'quickening').ok, true);
  assert.match(toggleAlt(s, 'quickening').message, /Quickening \(primary\)/); toggleAlt(s, 'quickening');
  const m: any = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.constellation.alt.quickening, true); assert.equal(quickenedStride(m), true);
  const low: any = freshSave(); low.magicSkills.learned.quickening = 1; ensureConstellation(low); assert.equal(toggleAlt(low, 'quickening').ok, false, 'below Infinite III');
  s.materials.lumenDust = 99; respec(s); assert.equal(quickenedStride(s), false);
  // an old save (no aerialCharges): full, or one short while its single cooldown still runs; loaded unchanged otherwise
  const old: any = freshSave(); old.magicSkills.learned['aerial-step'] = 1; old.magicSkills.cooldowns['aerial-step'] = 9; const o: any = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.equal(o.magicSkills.aerialCharges, undefined); assert.equal(aerialChargesNow(o), 0); assert.equal(o.magicSkills.cooldowns['aerial-step'], 9);
  const bad: any = migrateSave({ ...JSON.parse(JSON.stringify(old)), magicSkills: { ...old.magicSkills, aerialCharges: 'x', future: 1 } }); assert.equal(bad.magicSkills.aerialCharges, undefined); assert.equal(bad.magicSkills.future, 1, 'unknown fields kept');
  const big: any = migrateSave({ ...JSON.parse(JSON.stringify(old)), magicSkills: { ...old.magicSkills, aerialCharges: 7.6 } }); assert.equal(big.magicSkills.aerialCharges, 2);
});

test('exact resume: pause holds air-walking still; a save while held or mid-recharge resumes frame for frame', () => {
  const g = wayfarer({ stride: true }); ledge(g, 6); const d = drive(g); cast(g, d.now()); for (let i = 0; i < 70; i++) d.step(1);
  assert.equal(g.aerialHeld(), true);
  const before = { x: g.player.x, fall: { ...g.fall }, rem: g.save.magicSkills.active.remaining };
  g.setPaused(true, d.now()); for (let i = 0; i < 60; i++) d.step(1); assert.equal(g.player.x, before.x); assert.deepEqual({ ...g.fall }, before.fall); assert.equal(g.save.magicSkills.active.remaining, before.rem); g.setPaused(false, d.now());
  const saved: any = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now()))));
  assert.equal(saved.session.playerRuntime.fall.hold, 6); assert.deepEqual(saved.session.playerRuntime.aerialAir, { casts: 1, aloft: true }); assert.equal(saved.magicSkills.aerialCharges, 1);
  const back: any = new Game(saved, d.now()); back.enemies = []; ledgeTiles(back, 6); /* the test's own terrain, painted again on the regenerated section */ assert.equal(back.fall.hold, 6); assert.equal(back.aerialCasts, 1); assert.equal(back.aerialAloft, true);
  const db = drive(back, 60, d.now());
  for (let j = 0; j < 500; j++) { const x = j < 60 ? 1 : 0, jump = j === 20; d.step(x, 0, jump); db.step(x, 0, jump);
    assert.equal(back.player.x, g.player.x, `frame ${j}`); assert.equal(!!back.fall, !!g.fall); if (g.fall) assert.ok(Math.abs(back.fall.z - g.fall.z) < 1e-12);
    assert.equal(back.player.hp, g.player.hp); assert.equal(aerialChargesNow(back.save), aerialChargesNow(g.save)); assert.ok(Math.abs((back.save.magicSkills.cooldowns['aerial-step'] || 0) - (g.save.magicSkills.cooldowns['aerial-step'] || 0)) < 1e-9);
    if (!g.save.magicSkills.active && !g.fall) break; }
  // a save in the middle of a jump on held air lands back on the held level after reload, as it would have
  const j = wayfarer(); ledge(j, 5); const dj = drive(j); cast(j, dj.now()); for (let i = 0; i < 70; i++) dj.step(1); dj.step(0, 0, true); for (let i = 0; i < 15; i++) dj.step(1);
  assert.ok(dj.now() < j.jumpUntil, 'mid-jump');
  const js: any = migrateSave(JSON.parse(JSON.stringify(j.exportSnapshot(dj.now())))), jb: any = new Game(js, dj.now()); jb.enemies = []; ledgeTiles(jb, 5); const djb = drive(jb, 60, dj.now());
  for (let i = 0; i < 80; i++) { dj.step(1); djb.step(1); assert.equal(jb.player.x, j.player.x, `jump frame ${i}`); assert.equal(jb.fall?.z, j.fall?.z); assert.equal(jb.player.hp, j.player.hp); }
  assert.equal(j.fall.z, 5); assert.equal(j.aerialHeld(), true);
  // the second charge mid-recharge, the Stride toggle and the count survive a save on the ground
  const k = wayfarer({ stride: true }), dk = drive(k); cast(k, dk.now()); cast(k, dk.now()); for (let i = 0; i < 300; i++) dk.step(0);
  const ks: any = migrateSave(JSON.parse(JSON.stringify(k.exportSnapshot(dk.now())))), kb: any = new Game(ks, dk.now());
  assert.equal(ks.constellation.alt.quickening, true); assert.equal(aerialChargesNow(kb.save), 0); assert.ok(Math.abs(kb.save.magicSkills.cooldowns['aerial-step'] - k.save.magicSkills.cooldowns['aerial-step']) < 1e-9);
});

test('death lets go: the hold, the count and the cast height do not follow the Wayfarer home', () => {
  const g = wayfarer(); ledge(g, 6); const d = drive(g); cast(g, d.now()); for (let i = 0; i < 90; i++) d.step(1);
  g.clearCarriedStates(); assert.equal(g.fall, null); assert.equal(g.aerialCasts, 0); assert.equal(g.save.magicSkills.active.hold, undefined);
});

test('the rings: two, half a cycle apart, gliding smoothly between feet and shins; still under Reduced Motion and while paused; faded in and out', () => {
  const g = wayfarer(); assert.equal(aerialRingState(g, 0), null, 'none before the cast'); cast(g, 6000);
  const at = (now: number) => { const r = aerialRingState(g, now); return r ? { a: r.a, h0: r.h0, h1: r.h1 } : null; };
  g.save.magicSkills.active.remaining -= .3; // past the fade-in
  let prev = at(10000)!, moved = 0; for (let t = 10000; t <= 10000 + AERIAL_RINGS.periodMs; t += 1000 / 60) { const r = at(t)!;
    assert.ok(Math.abs(r.h0 + r.h1 - 1) < 1e-9, 'out of phase'); assert.ok(r.h0 >= 0 && r.h0 <= 1); assert.ok(Math.abs(r.h0 - prev.h0) < .05, 'a glide, never a jump'); moved = Math.max(moved, r.h0); prev = r; }
  assert.ok(moved > .99, 'feet to shins');
  g.presentation = { reduceMotion: true }; assert.deepEqual([at(1).h0, at(777).h0], [AERIAL_RINGS.still[0], AERIAL_RINGS.still[0]], 'still');
  g.presentation = {}; g.paused = true; g.pauseStarted = 4321; assert.equal(at(5000).h0, at(9000).h0, 'paused: held'); g.paused = false;
  g.save.magicSkills.active.remaining = g.save.magicSkills.active.duration; assert.equal(at(1).a, 0, 'fades in from nothing');
  g.save.magicSkills.active.remaining = .1; assert.ok(at(1).a < .3, 'fades out at the end');
});

const heroMeta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), heroRaw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const hero = decodeCloseViewHero(heroMeta, heroRaw.buffer.slice(heroRaw.byteOffset, heroRaw.byteOffset + heroRaw.byteLength));
const heroInput = (nowMs: number, action: any, reducedMotion = false) => ({ nowMs, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile: null, handProfile: null, action, alpha: 1, tint: [1, 1, 1], hitFlash: 0 });
const maxMove = (a: Float32Array, b: Float32Array) => { let m = 0; for (let i = 0; i < a.length; i += 6) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2])); return m; };

test('the cast pose: both arms swept behind and the body leaning in, eased in and out over the cast (no pop), and eased out when cut short', () => {
  const st = createHeroPoseState(hero), f = createHeroFrame(hero), castAt = (p: number, reduced = false) => { sampleCloseViewHero(hero, st, heroInput(2000, { kind: 'cast', profile: 'traversal-brace', phase: p, durationMs: ACTION_MOTION.castMs }, reduced), f); return { v: Float32Array.from(f.positionsNormals), l: f.leftSocket[12], r: f.rightSocket[12] }; };
  const rest = castAt(0), mid = castAt(.5), end = castAt(1);
  assert.ok(mid.l < rest.l - .08 && mid.r < rest.r - .08, `both hands go behind (${rest.l.toFixed(2)} -> ${mid.l.toFixed(2)}, ${rest.r.toFixed(2)} -> ${mid.r.toFixed(2)})`);
  assert.ok(maxMove(rest.v, end.v) < 1e-6, 'back where it began'); assert.ok(ACTION_MOTION.castMs >= 300 && ACTION_MOTION.castMs <= 400, 'about a third of a second');
  const worstStep = (dp: number) => { let prev = rest.v, worst = 0; for (let p = dp; p <= 1.0001; p += dp) { const c = castAt(Math.min(1, p)); worst = Math.max(worst, maxMove(prev, c.v)); prev = c.v; } return worst; };
  const coarse = worstStep(.02), fine = worstStep(.01); assert.ok(fine < coarse * .6, `continuous: halving the step halves the largest move (${coarse.toFixed(3)} -> ${fine.toFixed(3)}), so nothing pops`);
  const quiet = castAt(.5, true); assert.ok(quiet.l < rest.l && quiet.l > mid.l, 'Reduced Motion: the same gesture, smaller');
  // cut short at p = .45 (a dodge or a blow): the pose eases out over AERIAL_CAST_POSE.outMs instead of vanishing
  const s2 = createHeroPoseState(hero), f2 = createHeroFrame(hero), sample = (now: number, action: any) => { sampleCloseViewHero(hero, s2, heroInput(now, action), f2); return Float32Array.from(f2.positionsNormals); };
  const live = sample(3000, { kind: 'cast', profile: 'traversal-brace', phase: .45, durationMs: ACTION_MOTION.castMs }), next = sample(3016, null), later = sample(3000 + AERIAL_CAST_POSE.outMs + 20, null), idle = sample(3000 + AERIAL_CAST_POSE.outMs + 20, null);
  assert.ok(maxMove(live, next) < maxMove(live, later) * .5, 'one frame after the cut it is still close to the pose'); assert.ok(maxMove(later, idle) < 1e-9, 'and then it is gone');
});

test('the general cast flourish turns the free wrist and follows through mid-cast, and is gone at both ends', () => {
  const st = createHeroPoseState(hero), f = createHeroFrame(hero), at = (p: number, reduced: boolean) => { sampleCloseViewHero(hero, st, heroInput(2000, { kind: 'cast', profile: 'focus-forward', phase: p, durationMs: ACTION_MOTION.castMs }, reduced), f); return Float32Array.from(f.positionsNormals); };
  // castPose itself ignores Reduced Motion; the flourish halves under it, so the two differ only while the flourish acts
  for (const p of [0, 1]) assert.ok(maxMove(at(p, false), at(p, true)) < 1e-9, `rest at ${p}`);
  for (const p of [.3, .6]) assert.ok(maxMove(at(p, false), at(p, true)) > .005, `the flourish at ${p}`);
});

test('the Arcanum gives Quickening the same secondary-form button Aerial Step has (main.ts reads ALT_PASSIVES for the discipline node)', () => {
  const main = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /\{id:'active',\.\.\.\(ALT_PASSIVES\[skill\.id\]\?\.discipline\?\{ref:skill\.id\}:\{\}\)/, 'the Quickening node carries its own ref');
  assert.match(main, /if\(show\.ref&&ALT_PASSIVES\[show\.ref\]\)\{const A=ALT_PASSIVES\[show\.ref\],learned=show\.id==='active'\?rank>0:/, 'the swap box opens for it once it has a rank');
  assert.match(main, /const castId=show\.id==='active'&&rank>0&&!show\.alt\?skill\.id:/, 'no slot buttons while it is the passive');
  assert.equal(ALT_PASSIVES.quickening.discipline, true); assert.equal(Object.values(ALT_PASSIVES).filter((q: any) => q.discipline).length, 1, 'only Quickening');
});
