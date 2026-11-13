// Weapon arts and awakened moves: the balance pass (2026-11-13) and its review fixes. The numbers live in weapon-arts.ts
// (WEAPON_ARTS, AWAKENED_ARTS); the fixes are in game.ts (lapseKick, artBlocked, the committed Cleaver's `awakened`) and
// awakened-arts.ts (the axe kick's record).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { IRON_FISTS } from '../src/brawler-spells.ts';
import { WEAPON_ARTS, AWAKENED_ARTS, artShare } from '../src/weapon-arts.ts';
import { liveAwakened } from '../src/awakened-arts.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deserializeSave, serializeSave } from '../src/persistence.ts';

const M = AWAKENED_ARTS.moves, A = WEAPON_ARTS.arts, DT = .02, AWAKE = { resonance: 'wildfire', version: 1 };
const WEAPONS = {
  'verge-cleaver': () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 10, property: 'impact', tier: 'rare', affixes: [] }),
  'iron-fists': () => ({ id: 'primary-if-test', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] }),
};
const foe = (fx, fy, i = 0) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] });
function arena(weapon, { foes = [[1.2, 0]], awakened = true, art = null } = {}) {
  const s = freshSave(); s.seed = 'ARTS-BALANCE'; s.level = 15; s.equipment.primary = { ...WEAPONS[weapon](), ...(awakened ? { awakened: { ...AWAKE } } : {}) };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = art ? [`field:${art}`] : [];
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy], i) => foe(fx, fy, i));
  return { s, g, clock: { t: 1000 } };
}
function frame(g, clock, held = false) { g.player.invulnerableUntil = clock.t + 1e6; g.update(DT, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held }, clock.t); clock.t += DT * 1000; }
const idle = (g, clock, n) => { for (let i = 0; i < n; i++) frame(g, clock, false); };
function press(g, clock, action = null) { g.attackAction = action; try { return g.primaryAttack(clock.t, { x: 1, y: 0 }); } finally { g.attackAction = null; } }
function charge(g, clock, seconds) { press(g, clock, 'attack'); for (let i = 0; i < Math.round((WEAPON_ARTS.hold.grace + seconds) / DT) + 1; i++) frame(g, clock, true); frame(g, clock, false); }
function spy(g) { const log = []; const own = g.artBlow.bind(g); g.artBlow = (e, amount, ...rest) => { log.push({ id: e.id, amount }); return own(e, amount, ...rest); }; return log; }
const combo = (g, clock) => { for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 5); } }; // the dash punch, the jab, the uppercut

test('balance pass: a release just past the grace is a small poke; the perfect window is unchanged; the moves weigh less than the crescent', () => {
  assert.equal(artShare(0), WEAPON_ARTS.charge.early[0]); assert.ok(artShare(0) <= .3, 'no free extra hit every fourth press');
  assert.equal(artShare(1.15), 2.6); assert.equal(WEAPON_ARTS.charge.late, 1.4); assert.equal(WEAPON_ARTS.charge.overcharge, 1.6);
  for (const id of Object.keys(A)) if (id !== 'transpose') assert.ok(A[id].share > 0 && A[id].share <= 1, `${id}: its own weight`);
  assert.ok(A['lava-slash'].share < 1 && A['blade-stream'].share < 1);
  assert.ok(M.fissure.share < .7 && M.lance.share < .7 && M['returning-blades'].share * 2 < .7, 'below the crescent');
  assert.equal(M.roundhouse.share, .8, 'the kick stays at 0.8 (Tim)');
  assert.ok(M.lance.share >= M.fissure.share && M['returning-blades'].share * 2 >= M.fissure.share, 'the pike and daggers lean single-target');
  // Blade Stream: six hits total the charge's share times the art's own weight
  const { g, clock } = arena('verge-cleaver', { foes: [[1.4, 0]], awakened: false, art: 'lava-slash' }), log = spy(g);
  for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 30); }
  const power = g.artPower(clock.t); charge(g, clock, 1.15); idle(g, clock, 5);
  assert.equal(log.length, 1); assert.ok(Math.abs(log[0].amount - power * 2.6 * A['lava-slash'].share) < 1e-6);
});

test('awakened Iron Fists: an unused kick window ends the combo with the uppercut\'s recovery; the kick still chains inside it', () => {
  const F = IRON_FISTS;
  { // skip the kick: once the window has lapsed the next combo waits the recovery, measured from the lapse
    const { g, clock } = arena('iron-fists'); combo(g, clock); const c = g.fistCombo; assert.equal(c?.step, 3); assert.equal(c.kick, true, 'the window is open for the kick');
    const until = c.until; while (clock.t <= until) frame(g, clock); frame(g, clock);
    assert.equal(g.fistCombo, null, 'the window lapsed'); assert.equal(g.fistRecoverUntil, until + F.recover * 1000, 'the uppercut\'s recovery, from the lapse');
    const t = clock.t, hp = g.enemies[0].hp; assert.equal(press(g, clock).length, 0); idle(g, clock, 2); assert.equal(g.enemies[0].hp, hp, 'no early dash punch'); assert.equal(g.fistCombo, null);
    while (clock.t < g.fistRecoverUntil) frame(g, clock); press(g, clock); idle(g, clock, 2); assert.equal(g.fistCombo?.step, 1, 'then the next combo'); assert.ok(clock.t - t >= F.recover * 1000 - 2 * DT * 1000);
  }
  { // direct presses (no frame between): the lapse is noticed at the press as well
    const { g, clock } = arena('iron-fists'); combo(g, clock); const until = g.fistCombo.until; clock.t = until + 10;
    assert.equal(g.fistPress(clock.t, { x: 1, y: 0 }, null), false); assert.equal(g.fistRecoverUntil, until + F.recover * 1000);
  }
  { // the kick inside the window: chained, then the kick's own recovery (unchanged)
    const { g, clock } = arena('iron-fists', { foes: [[1.2, 0], [-1.2, 0]] }); combo(g, clock); idle(g, clock, 20); assert.equal(g.kickReady(clock.t), true);
    const log = spy(g); press(g, clock); idle(g, clock, 2); assert.ok(log.length >= 1, 'the kick lands'); assert.equal(g.player.attackVisual.awakenedArt, 'roundhouse');
    assert.equal(g.fistCombo, null); assert.ok(Math.abs(g.fistRecoverUntil - (clock.t - 3 * DT * 1000 + F.recover * 1000)) <= DT * 1000 + 1e-6);
  }
  { // not awakened: the uppercut ends the combo at once, as ever
    const { g, clock } = arena('iron-fists', { awakened: false }); for (let i = 0; i < 3; i++) { press(g, clock); if (i < 2) idle(g, clock, 5); }
    assert.equal(g.fistCombo, null); assert.equal(g.fistRecoverUntil, clock.t + F.recover * 1000);
  }
});

test('artBlocked: no charge starts or releases mounted, aboard, gliding, falling, plunging, in the robot, swimming or diving; the stored charge is kept', () => {
  const { s, g, clock } = arena('verge-cleaver', { foes: [[1.4, 0]], awakened: false, art: 'lava-slash' });
  assert.equal(g.artBlocked(clock.t), false);
  const states = {
    mounted: [() => { g.mountRide = () => ({ id: 'test-mount' }); }, () => { delete g.mountRide; }],
    boat: [() => { s.boat = { owned: true, aboard: true }; }, () => { delete s.boat; }],
    gliding: [() => { g.glide = { z: 3, vx: 0, vy: 0, open: true }; }, () => { g.glide = null; }],
    falling: [() => { g.fall = { z: 2, vz: -1, from: 3 }; }, () => { g.fall = null; }],
    plunging: [() => { g.plunge = { start: clock.t, until: clock.t + 200 }; }, () => { g.plunge = null; }],
    'plunge recovery': [() => { g.plungeRecoverUntil = clock.t + 300; }, () => { g.plungeRecoverUntil = 0; }],
    robot: [() => { s.mech = { active: true, mode: 'robot' }; }, () => { delete s.mech; }],
    drone: [() => { s.mech = { active: true, mode: 'drone' }; }, () => { delete s.mech; }],
    swimming: [() => { g.swimming = true; }, () => { g.swimming = false; }],
    diving: [() => { g.map.underwater = true; }, () => { delete g.map.underwater; }],
  };
  for (const [name, [on, off]] of Object.entries(states)) { on(); assert.equal(g.artBlocked(clock.t), true, name); off(); assert.equal(g.artBlocked(clock.t), false, `${name} cleared`); }
  // in play: armed, a hold in the plunge's recovery never starts a charge; a charge whose release falls in it fizzles and stays stored
  const log = spy(g); for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 30); } assert.equal(g.weaponArts.armed, true);
  g.plungeRecoverUntil = clock.t + 5000; press(g, clock, 'attack'); for (let i = 0; i < 30; i++) frame(g, clock, true);
  assert.equal(g.weaponArts.hold.on, false, 'no charge begins'); frame(g, clock, false); assert.equal(g.weaponArts.armed, true); g.plungeRecoverUntil = 0;
  idle(g, clock, 30); press(g, clock, 'attack'); for (let i = 0; i < 40; i++) frame(g, clock, true); assert.equal(g.weaponArts.hold.on, true, 'charging');
  const n = log.length; g.plungeRecoverUntil = clock.t + 5000; frame(g, clock, false); g.plungeRecoverUntil = 0; // let go while blocked
  assert.equal(log.length, n, 'the release fizzles'); assert.equal(g.weaponArts.armed, true, 'the stored charge is kept'); assert.equal(g.weaponArts.hold.on, false);
  idle(g, clock, 30); charge(g, clock, 1.15); idle(g, clock, 5); assert.equal(log.length, n + 1, 'free again: it releases'); assert.equal(g.weaponArts.armed, false);
  { // the Iron Fists: a Ki Blast let go while blocked fizzles too, and the held punch is still thrown (as a tap)
    const { g, clock } = arena('iron-fists', { foes: [[5, 0]], awakened: false, art: 'ki-blast' }); for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 40); }
    idle(g, clock, 40); assert.equal(g.weaponArts.armed, true); const shots = () => g.weaponArts.shots.filter((q) => q.on).length;
    press(g, clock, 'attack'); for (let i = 0; i < 40; i++) frame(g, clock, true); assert.equal(g.weaponArts.hold.on, true);
    g.plungeRecoverUntil = clock.t + 5000; frame(g, clock, false); g.plungeRecoverUntil = 0;
    assert.equal(shots(), 0, 'no blast'); assert.equal(g.weaponArts.armed, true, 'still stored'); assert.equal(g.fistCombo?.step, 1, 'the dash punch was thrown'); }
});

test('the axe kick is dropped when the fists are put away or a newer action came after the uppercut', () => {
  const setUp = () => { const a = arena('iron-fists', { foes: [[1, .2], [6, 0]], art: 'ki-blast' }); const { g, clock } = a; for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 40); }
    idle(g, clock, 40); press(g, clock); idle(g, clock, 5); press(g, clock); idle(g, clock, 5); const log = spy(g); charge(g, clock, 1.15);
    assert.ok(clock.t < g.jumpUntil, 'airborne'); assert.equal(liveAwakened(g).axes, 1); return { ...a, log }; };
  const axeHits = (g, log) => log.filter((q) => q.id === 'foe-0' && Math.abs(q.amount - g.artPower(0) * M.roundhouse.up.share) < 1e-3 * g.artPower(0)).length;
  { const { g, clock, log } = setUp(); idle(g, clock, 80); assert.equal(axeHits(g, log), 1, 'left alone: it lands'); assert.equal(liveAwakened(g).axes, 0); }
  { const { s, g, clock, log } = setUp(); const axe = g.artPower(clock.t) * M.roundhouse.up.share; s.equipment.primary = { ...WEAPONS['verge-cleaver'](), awakened: { ...AWAKE } }; const before = g.player.attackVisual;
    idle(g, clock, 80); assert.equal(log.filter((q) => q.id === 'foe-0' && Math.abs(q.amount - axe) < 1e-3 * axe).length, 0, 'no axe kick with the Verge Cleaver in hand'); assert.equal(liveAwakened(g).axes, 0);
    assert.notEqual(g.player.attackVisual?.awakenedArt, 'axe-kick'); assert.equal(g.player.attackVisual, before, 'no fist pose stamped'); assert.doesNotMatch(g.message || '', /Axe kick/); }
  { const { g, clock, log } = setUp(); g.player.attackVisual = { ...g.player.attackVisual, profile: 'melee', weaponArt: null }; const newer = g.player.attackVisual; // a newer action's record
    idle(g, clock, 80); assert.equal(axeHits(g, log), 0, 'dropped'); assert.equal(g.player.attackVisual, newer, 'the newer record is never overwritten'); assert.equal(liveAwakened(g).axes, 0); }
});

test('Close View: the awakened Verge Cleaver\'s delayed contact counts the swings and the third releases the Fissure', () => {
  const input = (attack = false) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k) => attack && k === 'attack' && !used && (used = true), held: () => false, reset: () => {} }; };
  const g = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }).game;
  g.save.closeView = true; g.save.activeWeaponSlot = 'primary'; g.save.equipment.primary = { ...WEAPONS['verge-cleaver'](), awakened: { ...AWAKE } }; g.save.lastAim = { x: 1, y: 0 };
  for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; if (t.kind === 'yardGrass') t.kind = 'flagFloor'; }
  const target = Object.assign(createCombatant('rootBrute', g.player.x + 1, g.player.y), { id: 'contact-foe', hp: 1e5, maxHp: 1e5, damage: 0, cooldown: 99 }); g.enemies = [target];
  assert.equal(g.closeViewActionEligible(), true);
  let t = 100000;
  for (let i = 0; i < 3; i++) {
    g.update(.016, input(true), t); const q = g.pendingMeleeContact; assert.ok(q, `swing ${i + 1} accepted with a delayed contact`);
    assert.equal(q.payload.awakened, true, 'the committed swing carries the awakening (a boolean: item.awakened is a record)');
    assert.equal(g.player.attackVisual.awakenedArt ?? null, i === 2 ? 'fissure' : null, 'the third wears the move');
    assert.equal(liveAwakened(g).fissures, 0, 'nothing before the contact');
    g.update(.016, input(), q.releaseAt); assert.equal(g.pendingMeleeContact, null); t = Math.max(q.releaseAt, g.player.attackReadyAt || 0) + 600;
    g.update(.016, input(), t - 300);
  }
  assert.equal(g.awakenSwings, 3); assert.equal(liveAwakened(g).fissures, 1, 'the Fissure is in the ground');
  assert.equal(g.projectiles.some((p) => p.crescent), false, 'never the crescent');
  // a reload keeps the committed swing's flag (exact resume of a pending contact)
  g.update(.016, input(true), t); assert.ok(g.pendingMeleeContact); g.setPaused(true, t + 10);
  const resumed = new Game(deserializeSave(serializeSave(g.exportSnapshot(200000))), 400000); assert.equal(resumed.pendingMeleeContact?.payload?.awakened, true, 'the flag survives a reload');
});
