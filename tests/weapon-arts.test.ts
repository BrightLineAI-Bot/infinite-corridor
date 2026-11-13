// Weapon arts (Tim, 2026-11-13; weapon-arts.ts WEAPON_ARTS): a selectable Lattice passive for each primary weapon (a tool form,
// `field:<id>`), working only with its weapon. Three accepted presses arm it (one charge kept); holding Attack past the grace
// charges it toward a perfect window; letting go releases it at a share of a normal hit. Lava Slash (Verge Cleaver), Blade Stream
// (Fourfold Daggers), Cinder Javelin (Cinder Pike), Ki Blast (Iron Fists) and Transpose (Salvage Blade). Also: the Cinder Pike's
// Close View thrusts keep the unchanged narrow forward hit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { PRIMARY_PROFILES, primaryProfile, weaponKey } from '../src/items.ts';
import { IRON_FISTS } from '../src/brawler-spells.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { WEAPON_ARTS, WEAPON_ART_IDS, artWindow, artShare, artFill, artFor, artAnchored, sealBase, transposeBonus, weaponArtArmed, weaponArtCharge, liveArtShots, drawWeaponArts } from '../src/weapon-arts.ts';
import { TOOL_FORMS, TOOL_FORM_KEYS, fieldForm } from '../src/lattice-fields.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave, splitSnapshot, assembleSave } from '../src/persistence.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const C = WEAPON_ARTS.charge, A = WEAPON_ARTS.arts, DT = .02;
const WEAPONS = {
  'verge-cleaver': () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 10, property: 'impact', tier: 'rare', affixes: [] }),
  'cinder-pike': () => ({ id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 10, property: 'reach', tier: 'rare', affixes: [] }),
  'fourfold-daggers': () => ({ id: 'primary-fd-test', name: 'Fourfold Daggers', slot: 'primary', power: 10, property: 'paired', tier: 'rare', affixes: [] }),
  'iron-fists': () => ({ id: 'primary-if-test', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] }),
  'salvage-blade': () => ({ id: 'primary-sb-test', name: 'Salvage Blade', slot: 'primary', power: 10, property: 'steady', tier: 'rare', affixes: [] }),
  'quandrix-staff': () => ({ id: 'primary-qs-test', name: 'Quandrix Staff', slot: 'primary', power: 10, property: 'arcane', tier: 'rare', affixes: [] }),
};
const weaponOf = (art) => A[art].weapon;
function arena(art, { weapon = weaponOf(art), foes = [[3, 0]], passives = [`field:${art}`], echo = false } = {}) {
  const s = freshSave(); s.seed = 'WEAPON-ARTS'; s.level = 15; s.equipment.primary = WEAPONS[weapon]();
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = passives; // the Lattice open, as quandrix-staff.test.ts
  if (echo) { s.equipment.primary = normalizeSockets(s.equipment.primary); s.glyphs.echo = 1; assert.equal(socketGlyph(s, 'melee', 0, 'echo').ok, true); }
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  const clock = { t: 1000 };
  return { s, g, clock };
}
// One frame; `held` is whether Attack is down.
function frame(g, clock, held = false, input = {}) { g.player.invulnerableUntil = clock.t + 1e6; g.update(DT, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held, ...input }, clock.t); clock.t += DT * 1000; }
const idle = (g, clock, n) => { for (let i = 0; i < n; i++) frame(g, clock, false); };
function press(g, clock, action = 'attack') { g.attackAction = action; try { return g.primaryAttack(clock.t, { x: 1, y: 0 }); } finally { g.attackAction = null; } }
// Three ordinary presses, the swings let finish (fists: taps with no held button).
function arm(g, clock, n = WEAPON_ARTS.arm.presses) { for (let i = 0; i < n; i++) { press(g, clock, null); idle(g, clock, 40); } }
// A press held for the grace and `seconds` more, then let go. Returns how long the charge itself was held at the release.
function charge(g, clock, seconds) {
  press(g, clock); let last = 0, was = false;
  for (let i = 0; i < Math.round((WEAPON_ARTS.hold.grace + seconds) / DT) + 1; i++) { frame(g, clock, true); const on = !!g.weaponArts?.hold.on; if (on) last = g.weaponArts.hold.held; else if (was) last = C.max; was = on; } // gone while held: it overcharged
  frame(g, clock, false); return last;
}
// Records every art blow's amount (the hook stays the game's own).
function spy(g) { const log = []; const own = g.artBlow.bind(g); g.artBlow = (e, amount, ...rest) => { log.push({ id: e.id, amount }); return own(e, amount, ...rest); }; return log; }

test('one data table: arming, the grace and the Quandrix slam\'s charge numbers', () => {
  assert.equal(WEAPON_ARTS.arm.presses, 3); assert.equal(WEAPON_ARTS.hold.grace, .2);
  assert.deepEqual([...C.perfect], [1, 1.3]); assert.equal(C.max, 2); assert.equal(C.perfectShare, 2.6); assert.equal(C.late, 1.4); assert.equal(C.overcharge, 1.6); assert.deepEqual([...C.early], [.8, 1.4]);
  assert.deepEqual(WEAPON_ART_IDS, ['lava-slash', 'blade-stream', 'cinder-javelin', 'ki-blast', 'transpose']);
  assert.deepEqual(WEAPON_ART_IDS.map(weaponOf), ['verge-cleaver', 'fourfold-daggers', 'cinder-pike', 'iron-fists', 'salvage-blade']);
  assert.ok(Object.isFrozen(WEAPON_ARTS) && Object.isFrozen(A) && WEAPON_ART_IDS.every((id) => Object.isFrozen(A[id])));
  assert.equal(artWindow(0), 'early'); assert.equal(artWindow(.99), 'early'); assert.equal(artWindow(1), 'perfect'); assert.equal(artWindow(1.3), 'perfect'); assert.equal(artWindow(1.31), 'late'); assert.equal(artWindow(2), 'overcharge');
  assert.equal(artShare(0), .8); assert.ok(Math.abs(artShare(.5) - 1.1) < 1e-9); assert.equal(artShare(1.15), 2.6); assert.equal(artShare(1.6), 1.4); assert.equal(artShare(2.5), 1.6);
  assert.ok(artShare(1.15) > artShare(2) && artShare(2) > artShare(1.6), 'perfect > overcharge > late');
  assert.equal(artFill(1), .5); assert.equal(artFill(9), 1); assert.equal(artFill(NaN), 0);
  assert.equal(sealBase('perfect'), 6); assert.equal(sealBase('early'), 4); assert.equal(sealBase('late'), 4); assert.equal(sealBase('overcharge'), 4);
  const T = A.transpose; assert.equal(T.radius, 2.2); assert.equal(T.perHit, .6); assert.equal(T.cap, 10); assert.equal(T.linger, 3); assert.equal(T.spellDamage, .25); assert.equal(T.damageTaken, .05);
  assert.equal(A['ki-blast'].air, 1.25); assert.equal(A['cinder-javelin'].pierce, 3); assert.equal(A['blade-stream'].hits, 6);
});

test('five Lattice tool forms, selectable, each only with its own weapon', () => {
  assert.equal(TOOL_FORM_KEYS.length, 12);
  for (const id of WEAPON_ART_IDS) { assert.ok(TOOL_FORMS[id]); assert.ok(TOOL_FORM_KEYS.includes(`field:${id}`)); const f = fieldForm(`field:${id}`); assert.equal(f.name, A[id].name); assert.ok(f.text.length > 40); }
  for (const id of WEAPON_ART_IDS) for (const weapon of Object.keys(WEAPONS)) {
    const { s } = arena(id, { weapon }); assert.equal(artFor(s), weapon === weaponOf(id) ? id : null, `${id} with ${weapon}`);
  }
  const { s } = arena('lava-slash', { passives: [] }); assert.equal(artFor(s), null, 'not selected: nothing');
  assert.equal(weaponKey(WEAPONS['iron-fists']()), 'iron-fists'); assert.equal(weaponKey(WEAPONS['fourfold-daggers']()), 'fourfold-daggers');
  // The wrong weapon never arms (nor creates any state).
  const { g, clock } = arena('lava-slash', { weapon: 'cinder-pike' }); arm(g, clock, 5); assert.equal(g.weaponArts, undefined);
});

test('three presses arm; one charge is stored and swinging on keeps it; echoes and the second cut do not count', () => {
  for (const id of WEAPON_ART_IDS) {
    const { g, clock } = arena(id); arm(g, clock, 2); assert.equal(g.weaponArts.armed, false, `${id}: two presses`); assert.equal(weaponArtArmed(g), false);
    arm(g, clock, 1); assert.equal(g.weaponArts.armed, true, `${id}: three`); assert.equal(weaponArtArmed(g), true);
    arm(g, clock, 4); assert.equal(g.weaponArts.armed, true); assert.equal(g.weaponArts.presses, 3, 'one charge, never more');
  }
  { const { g, clock } = arena('blade-stream'); press(g, clock, null); idle(g, clock, 40); assert.equal(g.weaponArts.presses, 1, 'the daggers\' second cut is no press'); }
  { const { g, clock } = arena('transpose', { echo: true }); press(g, clock, null); idle(g, clock, 60); assert.equal(g.weaponArts.presses, 1, 'an Echo copy is no press'); }
});

test('a tap stays an ordinary attack; a charge spends the stored charge and three more presses re-arm', () => {
  const { g, clock } = arena('lava-slash'), log = spy(g); arm(g, clock);
  press(g, clock); for (let i = 0; i < 6; i++) frame(g, clock, true); frame(g, clock, false); idle(g, clock, 30); // held under the grace
  assert.equal(log.length, 0); assert.equal(g.weaponArts.armed, true, 'kept');
  charge(g, clock, 1.15); idle(g, clock, 10); assert.ok(log.length >= 1); assert.equal(g.weaponArts.armed, false, 'spent');
  const n = log.length; charge(g, clock, 1.15); idle(g, clock, 10); assert.equal(log.length, n, 'nothing stored: a hold does nothing');
  arm(g, clock, 2); assert.equal(g.weaponArts.armed, true, 'the held press and two more re-arm');
});

test('perfect, late, early and overcharge releases strike at their share of a normal hit (meleePower)', () => {
  for (const [seconds, label] of [[1.15, 'perfect'], [1.6, 'late'], [.5, 'early'], [2.4, 'overcharge']]) {
    const { g, clock } = arena('lava-slash', { foes: [[1.4, 0]] }), log = spy(g); arm(g, clock);
    const power = g.artPower(clock.t); assert.ok(Math.abs(power - g.meleePower()) < 1e-9, 'a normal hit of the weapon');
    const held = charge(g, clock, seconds); idle(g, clock, 5); assert.equal(artWindow(held), label);
    assert.equal(log.length, 1); assert.ok(Math.abs(log[0].amount / power - artShare(held)) < 1e-6, `${label}: ${log[0].amount / power}`);
    if (label === 'perfect') assert.match(g.message, /perfect/i);
  }
  const { g } = arena('ki-blast'); assert.ok(Math.abs(g.artPower(0) - g.fistPower() * IRON_FISTS.punches[0].share) < 1e-9, 'the fists: their dash punch');
});

test('Lava Slash dashes to the nearest foe and erupts; Blade Stream cuts all round in six; the Javelin pierces three', () => {
  { const { g, clock } = arena('lava-slash', { foes: [[3.5, 0], [3.5, .8], [7, 0]] }), log = spy(g); arm(g, clock); const x0 = g.player.x; const held = charge(g, clock, 1.15);
    assert.ok(g.player.x - x0 > 2, 'dashed toward the foe'); assert.ok(g.player.x < 10 + 3.5, 'stopped short of it');
    assert.deepEqual(log.map((q) => q.id).sort(), ['foe-0', 'foe-1'], 'the eruption, not the far foe'); assert.ok(held > 0); }
  { const { g, clock } = arena('lava-slash', { foes: [] }); arm(g, clock); const x0 = g.player.x; charge(g, clock, 1.15); assert.ok(g.player.x - x0 > 3 && g.player.x - x0 <= A['lava-slash'].dash + 1e-6, 'straight ahead with no foe'); }
  { const { g, clock } = arena('lava-slash', { foes: [] }); g.map.tiles[10 * 32 + 12] = { x: 12, y: 10, kind: 'wall', blocked: true }; arm(g, clock); charge(g, clock, 1.15); assert.ok(g.player.x < 11.5, 'a wall stops it'); }
  { const { g, clock } = arena('blade-stream', { foes: [[1.5, 0], [-1, 1], [4, 0]] }), log = spy(g); arm(g, clock); const power = g.artPower(clock.t), held = charge(g, clock, 1.15); idle(g, clock, 40);
    const near = log.filter((q) => q.id === 'foe-0'); assert.equal(near.length, A['blade-stream'].hits); assert.equal(log.filter((q) => q.id === 'foe-1').length, 6, 'all round');
    assert.equal(log.filter((q) => q.id === 'foe-2').length, 0, 'outside the radius'); assert.ok(Math.abs(near.reduce((n, q) => n + q.amount, 0) / power - artShare(held)) < 1e-6, 'six hits total the share'); }
  { const { g, clock } = arena('cinder-javelin', { foes: [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0]] }), log = spy(g); arm(g, clock); charge(g, clock, 1.15);
    assert.equal(log.length, 0, 'the wind-up first'); idle(g, clock, 60); assert.deepEqual(log.map((q) => q.id), ['foe-0', 'foe-1', 'foe-2'], 'pierces three'); assert.equal(liveArtShots(g), 0); }
  { const { g, clock } = arena('cinder-javelin', { foes: [[7.5, 0], [10.5, 0]] }), log = spy(g); arm(g, clock); charge(g, clock, 1.15); idle(g, clock, 80); assert.deepEqual(log.map((q) => q.id), ['foe-0'], `${A['cinder-javelin'].range} tiles`); }
});

test('Ki Blast: a tap punches as ever; a charge fires the blast; on the uppercut she leaps and it strikes x1.25', () => {
  { const { g, clock } = arena('ki-blast', { foes: [[5, 0]] }), log = spy(g); arm(g, clock); idle(g, clock, 40);
    press(g, clock); frame(g, clock, true); frame(g, clock, false); assert.ok(g.fistCombo || g.fistRecoverUntil, 'the tap punched'); idle(g, clock, 40); assert.equal(log.length, 0); assert.equal(g.weaponArts.armed, true); }
  const blast = (taps) => { const { g, clock } = arena('ki-blast', { foes: [[5, 0]] }), log = spy(g); arm(g, clock); idle(g, clock, 40);
    for (let i = 0; i < taps; i++) { press(g, clock, null); idle(g, clock, 5); }
    const power = g.artPower(clock.t), held = charge(g, clock, 1.15), air = clock.t < g.jumpUntil; idle(g, clock, 60);
    return { amount: log.find((q) => q.id === 'foe-0')?.amount / power / artShare(held), air, armed: g.weaponArts.armed };
  };
  const ground = blast(0), upper = blast(2);
  assert.ok(Math.abs(ground.amount - 1) < 1e-6, 'grounded: the share'); assert.equal(ground.air, false);
  assert.ok(Math.abs(upper.amount - A['ki-blast'].air) < 1e-6, `the uppercut: x${A['ki-blast'].air} (${upper.amount})`); assert.equal(upper.air, true, 'popped into the air');
  assert.equal(ground.armed, false);
});

test('Transpose: the seal\'s time, its growth and cap, the linger, the spell bonus and the damage taken', () => {
  const T = A.transpose;
  { const { g, clock } = arena('transpose', { foes: [[1.2, 0]] }); arm(g, clock); charge(g, clock, 1.15); const S = g.weaponArts.seal;
    assert.equal(S.on, true); assert.ok(Math.abs(S.left - T.perfectBase) < .05, `perfect: ${S.left}`); }
  { const { g, clock } = arena('transpose', { foes: [] }); arm(g, clock); charge(g, clock, .5); assert.ok(Math.abs(g.weaponArts.seal.left - T.base) < .05, 'early: base'); }
  const { s, g, clock } = arena('transpose', { foes: [[1.2, 0]] }); arm(g, clock); charge(g, clock, .5); const S = g.weaponArts.seal;
  const before = S.left; press(g, clock, null); assert.ok(Math.abs(S.left - before - T.perHit) < 1e-9, 'a melee hit adds its time');
  g.enemies.push(...[.4, -.4].map((dy, i) => Object.assign(createCombatant('ashling', 11.2, 10 + dy), { id: `more-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] })));
  for (let i = 0; i < 12; i++) { press(g, clock, null); idle(g, clock, 22); assert.ok(S.left <= T.cap + 1e-9); } press(g, clock, null); assert.ok(S.left > T.cap - .05, `capped at ${T.cap} (${S.left})`);
  idle(g, clock, 1); assert.equal(g.weaponArts.buff, true); assert.equal(transposeBonus(s).spellDamage, T.spellDamage);
  // the spell damage (Imbue's magic share reads the same armor-glyph path) and the damage taken, against the same game without it
  s.stats = { ...s.stats, Focus: 11 }; g.imbueUntil = 1e15; const imbued = g.imbueBonus(clock.t); g.player.invulnerableUntil = 0; g.player.hp = 1000; g.packHurt(null, 400, {}, clock.t); const hurt = 1000 - g.player.hp;
  g.player.x += 2.5; for (let i = 0; i < Math.round((T.linger - .1) / DT); i++) frame(g, clock, false); g.player.invulnerableUntil = 1e15; assert.equal(g.weaponArts.buff, true, 'lingers after stepping out');
  for (let i = 0; i < 10; i++) frame(g, clock, false); assert.equal(g.weaponArts.buff, false, 'then fades'); assert.equal(transposeBonus(s), null);
  const plain = g.imbueBonus(clock.t); g.player.invulnerableUntil = 0; g.player.hp = 1000; g.packHurt(null, 400, {}, clock.t); const hurtPlain = 1000 - g.player.hp;
  assert.ok(plain > 0 && Math.abs(imbued / plain - (1 + T.spellDamage)) < 1e-9, `+25% spell damage (${imbued / plain})`);
  assert.ok(hurt > hurtPlain && Math.abs(hurt / hurtPlain - (1 + T.damageTaken)) < .02, `+5% damage taken (${hurt} vs ${hurtPlain})`);
  // one seal at a time: a new one replaces the old where she now stands
  g.player.invulnerableUntil = 1e15; arm(g, clock); charge(g, clock, .5); assert.ok(Math.abs(g.weaponArts.seal.x - (g.player.x + .5)) < 1e-9); assert.ok(Math.abs(g.weaponArts.seal.left - T.base) < .05);
  idle(g, clock, Math.round((T.base + .2) / DT)); assert.equal(g.weaponArts.seal.on, false, 'it ends');
});

test('foes that hold their ground take the blow but are never knocked', () => {
  const { g, clock } = arena('lava-slash', { foes: [[1.3, -.3], [1.3, .5, { boss: true }]] }), log = spy(g); arm(g, clock);
  const at = g.enemies.map((e) => [e.x, e.y]); charge(g, clock, 1.15);
  assert.deepEqual(log.map((q) => q.id).sort(), ['foe-0', 'foe-1'], 'both struck');
  assert.ok(Math.hypot(g.enemies[0].x - at[0][0], g.enemies[0].y - at[0][1]) > .2, 'the ordinary foe is thrown back');
  assert.ok(Math.hypot(g.enemies[1].x - at[1][0], g.enemies[1].y - at[1][1]) < 1e-4, 'the boss does not move');
  for (const k of ['boss', 'worldBeast', 'eliteId', 'elite']) assert.equal(artAnchored({ [k]: true }), true);
  assert.equal(artAnchored({ kind: 'ashling' }), false);
});

test('a dodge cancels a charge and keeps the stored one; a new area keeps it and drops the seal; a reload drops everything', () => {
  const { s, g, clock } = arena('transpose', { foes: [] }); arm(g, clock); press(g, clock);
  for (let i = 0; i < 30; i++) frame(g, clock, true); assert.equal(g.weaponArts.hold.on, true);
  g.player.dodgeUntil = clock.t + 200; frame(g, clock, true); assert.equal(g.weaponArts.hold.on, false, 'cancelled'); assert.equal(g.weaponArts.armed, true, 'kept');
  for (let i = 0; i < 30; i++) frame(g, clock, true); assert.equal(g.weaponArts.hold.on, false, 'Attack must be let go first'); frame(g, clock, false); assert.equal(g.weaponArts.seal.on, false, 'no release');
  charge(g, clock, .5); assert.equal(g.weaponArts.seal.on, true); assert.ok(transposeBonus(s));
  const save = assembleSave(...Object.values(splitSnapshot(snapshotSave(s)))); const back = new Game(save, clock.t);
  assert.equal(back.weaponArts, undefined, 'runtime only'); assert.equal(transposeBonus(save), null); assert.equal(JSON.stringify(save).includes('weaponArts'), false);
  arm(g, clock); g.area = 'overworld'; frame(g, clock, false); assert.equal(g.weaponArts.seal.on, false); assert.equal(g.weaponArts.armed, true); assert.equal(transposeBonus(s), null);
});

test('the Cinder Pike keeps its narrow forward hit; its Close View combo is three lunging thrusts', () => {
  assert.deepEqual(PRIMARY_PROFILES['primary-cinder-pike'], { shape: 'thrust', range: 2.45, arc: 32, damage: 8 });
  const { g, clock } = arena('cinder-javelin', { foes: [[2.1, 0], [1.2, 1.2]], passives: [] }), hp = g.enemies.map((e) => e.hp);
  press(g, clock, null); assert.ok(g.enemies[0].hp < hp[0], 'straight ahead within reach'); assert.equal(g.enemies[1].hp, hp[1], '45 degrees off: missed');
  assert.equal(primaryProfile(WEAPONS['cinder-pike']()).shape, 'thrust');
});

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url)), asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
test('Close View: every art pose and the charge lean are finite and return to the carry at both ends', () => {
  const held = { 'lava-slash': 'verge-cleaver', 'cinder-javelin': 'cinder-pike', 'blade-stream': 'salvage-blade', transpose: 'salvage-blade', 'ki-blast': 'fist' };
  const sample = (heldProfile, action, artCharge = 0) => { const st = createHeroPoseState(asset), f = createHeroFrame(asset); assert.ok(sampleCloseViewHero(asset, st, { nowMs: 2000, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile, handProfile: heldProfile, action, artCharge, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, f)); return { st, f }; };
  for (const [art, hp] of Object.entries(held)) for (const reducedMotion of [false, true]) {
    const profile = art === 'ki-blast' ? 'fist' : hp === 'salvage-blade' ? 'melee' : hp;
    const carry = sample(hp === 'fist' ? null : hp, null).f;
    for (const phase of [0, .2, .4, .6, 1]) { const a = sample(hp === 'fist' ? null : hp, { kind: 'melee', profile, weaponArt: art, phase, durationMs: A[art].poseMs, poseMs: 2000, fistStep: 1, fistLead: 'right' });
      assert.ok(a.f.positionsNormals.every(Number.isFinite), `${art} ${phase}`);
      if (phase === .4 && art !== 'ki-blast') assert.ok(Math.hypot(...[12, 13, 14].map((k) => a.f.rightSocket[k] - carry.rightSocket[k])) > .05, `${art} moves the weapon hand`); }
    const end = sample(hp === 'fist' ? null : hp, { kind: 'melee', profile, weaponArt: art, phase: 1, durationMs: A[art].poseMs, poseMs: 2000 - A[art].poseMs }), still = sample(hp === 'fist' ? null : hp, null);
    if (art !== 'ki-blast') assert.deepEqual(end.f.rightSocket, still.f.rightSocket, `${art} ends on the carry`);
  }
  const c0 = sample('verge-cleaver', null, 0).f, c1 = sample('verge-cleaver', null, .8).f;
  assert.ok(c1.positionsNormals.every(Number.isFinite)); assert.ok(Math.hypot(c1.rightSocket[12] - c0.rightSocket[12], c1.rightSocket[13] - c0.rightSocket[13], c1.rightSocket[14] - c0.rightSocket[14]) > .02, 'the charge draws the weapon back');
});

test('the stored charge, the ring and the arts in play draw from fixed pools; 60 s of releases stay bounded and finite', () => {
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } }), toScreen = (q) => [q.x * 32, q.y * 32];
  for (const id of WEAPON_ART_IDS) {
    const { g, clock } = arena(id, { foes: Array.from({ length: 8 }, (_, i) => [1 + (i % 4), (i >> 2) - .5]) }); arm(g, clock);
    const K = g.weaponArts, sizes = [K.shots.length, K.streams.length, K.flashes.length];
    for (let t = 0; t < 60 / DT; ) { // re-armed every frame (the cooldown wiped), a charge held a random-ish length, let go
      K.armed = true; press(g, clock); const hold = 12 + (t % 97); for (let i = 0; i < hold; i++, t++) { K.armed = true; frame(g, clock, true); drawWeaponArts(ctx, g, toScreen, 32, clock.t / 1000); }
      frame(g, clock, false); t++; for (const e of g.enemies) { e.hp = 1e6; e.dead = false; }
    }
    assert.deepEqual([K.shots.length, K.streams.length, K.flashes.length], sizes, `${id}: the pools never grow`);
    assert.ok(K.seal.left <= A.transpose.cap + 1e-9); assert.ok([g.player.x, g.player.y, ...g.enemies.flatMap((e) => [e.x, e.y, e.hp])].every(Number.isFinite), `${id}: finite`);
    assert.ok(g.effects.length < 200 && g.projectiles.length < 100, `${id}: the game's own lists stay bounded`);
    assert.ok(weaponArtCharge(g) >= 0 && weaponArtCharge(g) <= 1);
  }
});
