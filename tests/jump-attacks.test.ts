// Jump attacks (Tim, 2026-11-12: "All the weapons should have a jump attack. If you hit the weapon button when you're in the
// air, you slam down to the ground. And if you have Shadow Boxing running, you do a charge dive towards the nearest enemy and
// an explosion on impact"). brawler-spells.ts PLUNGE, PLUNGE_PROFILES, PLUNGE_DIVE; game.ts airAttack, plungeSteer, plungeLand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, GAME_CLOCKS, RESUME_GAME_CLOCKS, GAME_NESTED_CLOCKS, jumpLift, JUMP } from '../src/game.ts';
import { createCombatant, WAYFARER_DAMAGE } from '../src/combat.ts';
import { PRIMARY_PROFILES } from '../src/items.ts';
import { BRAWLER, PLUNGE, PLUNGE_PROFILES, PLUNGE_DIVE, plungeProfile, plungeKind, drawBrawler } from '../src/brawler-spells.ts';
import { fallDamage } from '../src/landscape.ts';
import { roofDeckById } from '../src/roof-decks.ts';
import { setMechMode, DRONE } from '../src/vehicle-gates.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const WEAPONS = {
  'salvage-blade': { id: 'salvage-blade', name: 'Salvage Blade', slot: 'primary', power: 1 },
  'primary-verge-cleaver': { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 1 },
  'primary-cinder-pike': { id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 1 },
  'primary-iron-fists': { id: 'primary-iron-fists', name: 'Iron Fists', slot: 'primary', power: 1 },
};
function arena(foes, weapon = 'salvage-blade', extra = (s, g) => {}) {
  const s = freshSave(); s.seed = 'PLUNGE'; s.perception.aperture = 3255; s.maxHp = 100;
  s.equipment.primary = { ...WEAPONS[weapon] };
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 }));
  extra(s, g);
  return { s, g };
}
// One 50 ms frame; `press` lists the buttons pressed this frame.
function driver(g, t0 = 1000) {
  let t = t0;
  const step = (press = [], x = 0, y = 0) => { const left = new Set(press); t += 50; g.update(.05, { state: { x, y }, consume: (k) => left.delete(k), held: () => false }, t); };
  return { step, idle: (ms) => { for (let i = 0; i < ms / 50; i++) step(); }, now: () => t };
}
const lost = (g, id) => 5000 - g.enemies.find((e) => e.id === id).hp;

test('every melee weapon has a jump attack profile; a weapon not listed falls back to the default', () => {
  for (const k of Object.keys(PRIMARY_PROFILES)) {
    const P = plungeProfile(k); assert.ok(P, k);
    assert.ok(P.radius >= 1.4 && P.radius <= 1.8, `${k} radius ${P.radius}`);
    assert.ok(P.share >= 1.3 && P.share <= 1.6, `${k} share ${P.share}`);
    assert.ok(P.stun > 0 && P.stun < 1, `${k} stagger`);
  }
  assert.equal(plungeProfile('primary-fourfold-daggers'), PLUNGE_PROFILES.default, 'a new weapon kind uses the default');
  assert.equal(plungeKind({ id: 'primary-something-new', name: 'Something New' }), 'salvage-blade', 'an unknown item resolves as primaryProfile does');
  assert.equal(plungeKind({ id: 'x', name: 'Iron Fists' }), 'primary-iron-fists');
  assert.ok(PLUNGE_DIVE.range >= 6 && PLUNGE_DIVE.range <= 8 && Math.abs(PLUNGE_DIVE.burstRadius - 1.6) < 1e-9);
});

for (const weapon of Object.keys(WEAPONS)) {
  test(`${weapon}: Attack in the air plunges to the ground and slams every foe in the weapon's radius`, () => {
    const P = PLUNGE_PROFILES[weapon], { g } = arena([['near', 10 + P.radius - .4, 10], ['far', 10 + P.radius + .9, 10]], weapon), p = g.player, d = driver(g);
    d.step(['jump']); d.step(); assert.ok(g.jumpUntil > d.now(), 'airborne');
    d.step(['attack'], 1, 0); assert.ok(g.plunge, 'a plunge starts'); assert.equal(g.message, 'Plunge!');
    const x0 = p.x, y0 = p.y; // (the press frame's own step came before the press)
    assert.ok(g.jumpUntil - d.now() <= PLUNGE.dropMs, 'it drops in dropMs at most');
    const lift0 = g.plunge.lift0; assert.ok(lift0 > 0 && Math.abs(jumpLift(g, d.now()) - lift0) < 1e-9, 'from the height it was at');
    assert.ok(jumpLift(g, d.now() + 40) < lift0 && jumpLift(g, d.now() + 80) < jumpLift(g, d.now() + 40), 'the height falls');
    for (let i = 0; i < 6 && g.plunge; i++) d.step([], 1, 0);
    assert.equal(g.plunge, null, 'landed'); assert.ok(!(g.jumpUntil > d.now()));
    assert.equal(p.x, x0, 'straight down: the stick does not steer it'); assert.equal(p.y, y0);
    assert.ok(lost(g, 'near') > 0, 'the foe within the radius is hit'); assert.equal(lost(g, 'far'), 0, 'the foe outside it is not');
    assert.ok(g.enemies[0].hitStun > 0, 'and staggered');
    assert.ok(g.effects.some((e) => e.kind === 'plunge-slam' && Math.abs(e.radius - P.radius) < 1e-9), 'the slam ring is drawn at the weapon radius');
    assert.equal(p.attackVisual?.profile, 'hammer', 'Close View shows the overhead blow brought down');
  });
}

test('the Fourfold Daggers (release 918) plunge on the default profile, through the 918 weapon bonus', () => {
  const item = { id: 'primary-fd-loot', name: 'Fourfold Daggers', slot: 'primary', power: 10, basePower: 10, upgradeRank: 0, property: 'paired', tier: 'rare', affixes: [] };
  assert.equal(plungeKind(item), 'primary-fourfold-daggers'); assert.equal(plungeProfile(plungeKind(item)), PLUNGE_PROFILES.default);
  const { g } = arena([['foe', 11, 10]]); g.save.equipment.primary = item; const d = driver(g);
  assert.ok(Math.abs(g.plungeBase() - g.meleePower()) < 1e-9, 'a dagger plunge is built on meleePower (weaponBonus inside)');
  d.step(['jump']); d.step(); d.step(['attack']); assert.ok(g.plunge); assert.equal(g.plunge.kind, 'primary-fourfold-daggers');
  d.idle(300); assert.equal(g.plunge, null); assert.ok(lost(g, 'foe') > 0, 'the slam lands');
  assert.ok(g.effects.some((e) => e.kind === 'plunge-slam' && Math.abs(e.radius - PLUNGE_PROFILES.default.radius) < 1e-9));
});

test('the slam deals the weapon share of a normal hit, scaling with the melee bonus as a swing does', () => {
  for (const weapon of ['salvage-blade', 'primary-verge-cleaver', 'primary-iron-fists']) {
    const { g } = arena([['foe', 11, 10]], weapon), d = driver(g); d.step(['jump']); d.step();
    const base = g.plungeBase(d.now());
    d.step(['attack']); d.idle(300);
    const fx = g.effects.find((e) => e.kind === 'plunge-slam') || null, expected = Math.round(base * PLUNGE_PROFILES[weapon].share);
    assert.ok(Math.abs(lost(g, 'foe') - Math.round(expected * WAYFARER_DAMAGE.scale)) <= 2, `${weapon}: ${lost(g, 'foe')} vs ${expected}`);
    if (weapon === 'salvage-blade') assert.ok(Math.abs(base - g.meleePower()) < 1e-9, 'a blade plunge is built on a swing');
    void fx;
  }
  // A stronger character hits harder, by the weapon's own scaling stat (release 918 WEAPON_SCALING through weaponBonus)
  for (const [weapon, stat] of [['primary-verge-cleaver', 'Might'], ['salvage-blade', 'Focus']]) {
    const weak = arena([], weapon).g, strong = arena([], weapon, (s) => { s.stats[stat] = (Number(s.stats[stat]) || 1) + 40; }).g;
    assert.ok(strong.plungeBase() > weak.plungeBase(), `${weapon} with ${stat}: ${strong.plungeBase()} > ${weak.plungeBase()}`);
  }
});

test('one plunge per jump, a landing recovery, and no plunge on the ground', () => {
  const { g } = arena([['foe', 11, 10]]), p = g.player, d = driver(g);
  d.step(['attack']); assert.equal(g.plunge ?? null, null, 'on the ground Attack swings'); d.idle(600);
  d.step(['jump']); d.step(['attack']); assert.ok(g.plunge); d.idle(200); assert.equal(g.plunge, null);
  assert.ok(g.plungeRecoverUntil > d.now(), 'recovering'); assert.ok(p.attackReadyAt >= g.plungeRecoverUntil, 'no attack while recovering');
  const hp = g.enemies[0].hp; d.step(['attack']); assert.equal(g.enemies[0].hp, hp, 'an Attack in the recovery does nothing');
  d.step(['jump']); assert.ok(!(g.jumpUntil > d.now()), 'nor does a jump');
  const x = p.x; d.step([], -1, 0); assert.equal(p.x, x, 'nor a step');
  d.step(['dodge'], -1, 0); assert.ok(p.x < x - .1, 'a dodge is never held back');
  d.idle(PLUNGE.recoverMs + 200);
  // A plunge's own jump is spent: a second press while still in the air does not start another
  g.plungeSpent = true; d.step(['jump']); d.step(['attack']); assert.equal(g.plunge ?? null, null, 'spent for this jump');
  d.idle(800); assert.equal(g.plungeSpent, false, 'and given back on landing');
  d.step(['jump']); d.step(['attack']); assert.ok(g.plunge, 'the next jump plunges again');
});

function onDeck() {
  const s = freshSave(); s.seed = 'ROOF'; s.maxHp = 100; Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = [];
  const deck = roofDeckById(g.map, 'shack--2-0'), c = deck.cells[Math.floor(deck.cells.length / 2)];
  g.player.x = c % 32; g.player.y = Math.floor(c / 32) - .25; g.setRoofDeck(deck);
  return { s, g, deck };
}
function roundTrip(g, now) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}

test('the clocks shift on pause and resume on reload; a plunge saved mid-drop lands safely as an ordinary jump', () => {
  assert.ok(GAME_CLOCKS.includes('plungeRecoverUntil') && RESUME_GAME_CLOCKS.includes('plungeRecoverUntil'));
  assert.deepEqual(GAME_NESTED_CLOCKS.plunge, ['start', 'until']);
  { // a pause shifts the plunge and the recovery
    const { g } = arena([]), d = driver(g); d.step(['jump']); d.step(['attack']); const q = { ...g.plunge };
    g.setPaused(true, d.now()); g.setPaused(false, d.now() + 5000);
    assert.equal(g.plunge.start, q.start + 5000); assert.equal(g.plunge.until, q.until + 5000);
  }
  const { g, deck } = onDeck(), d = driver(g); d.idle(100); const hp = g.player.hp;
  d.step(['jump']); d.step(); d.step(['attack']); assert.ok(g.plunge);
  const x = g.player.x, y = g.player.y, left = g.jumpUntil - d.now();
  const h = new Game(roundTrip(g, d.now()), 50000), hd = driver(h, 50000);
  assert.equal(h.plunge ?? null, null, 'the plunge itself is not carried over');
  assert.equal(h.player.x, x); assert.equal(h.player.y, y); assert.ok(Math.abs(h.jumpUntil - 50000 - left) < 1e-6, 'the jump that was left resumes');
  hd.idle(400); assert.equal(h.roofDeck?.id, deck.id, 'and lands on the roof it was over'); assert.equal(h.player.hp, hp, 'safely');
  assert.ok(!h.effects.some((e) => e.kind === 'plunge-slam'), 'with no slam');
  // the recovery is saved as time remaining
  d.idle(200); assert.equal(g.plunge, null); const rec = g.plungeRecoverUntil - d.now(); assert.ok(rec > 0);
  const r = new Game(roundTrip(g, d.now()), 90000); assert.equal(r.plungeRecoverUntil, 90000 + rec);
});

test('a death clears the plunge', () => {
  const { g } = arena([]), d = driver(g); d.step(['jump']); d.step(['attack']); assert.ok(g.plunge);
  g.clearCarriedStates(); assert.equal(g.plunge, null); assert.equal(g.plungeSpent, false); assert.equal(g.plungeRecoverUntil, 0);
});

test('Shadow Boxing: the air attack dives to the nearest foe, slams and bursts', () => {
  const { g } = arena([['near', 15, 11], ['far', 17, 10], ['side', 10, 4]]), p = g.player, d = driver(g);
  d.step(); g.castSpell('shadow-boxing'); assert.ok(g.boxingUntil > d.now());
  p.hp = 60; d.step(['jump']); d.step(['attack']);
  assert.ok(g.plunge?.dive, 'a dive'); assert.equal(g.plunge.dive.id, 'near', 'the nearest foe'); assert.equal(g.message, 'Shadow dive!');
  for (let i = 0; i < 20 && g.plunge; i++) d.step();
  assert.equal(g.plunge, null, 'landed');
  const near = g.enemies.find((e) => e.id === 'near'); assert.ok(Math.hypot(near.x - p.x, near.y - p.y) < 1.4, `flew to it (${p.x.toFixed(2)},${p.y.toFixed(2)})`);
  assert.ok(g.effects.some((e) => e.kind === 'plunge-burst' && Math.abs(e.radius - PLUNGE_DIVE.burstRadius) < 1e-9), 'the burst');
  const P = PLUNGE_PROFILES['salvage-blade'], one = Math.round(g.plungeBase() * (1 + BRAWLER['shadow-boxing'].damage) * P.share), two = Math.round(g.plungeBase() * (1 + BRAWLER['shadow-boxing'].damage) * PLUNGE_DIVE.burstShare);
  assert.ok(lost(g, 'near') >= Math.round((one + two) * WAYFARER_DAMAGE.scale) - 3, `hit and burst (${lost(g, 'near')} vs ${one}+${two})`);
  assert.equal(lost(g, 'side'), 0, 'a foe away from the impact is untouched');
  assert.ok(p.hp > 60, 'Shadow Boxing heals from the blows');
});

test('Shadow Boxing: the dive takes the locked foe over a nearer one', () => {
  const { g } = arena([['near', 12, 10], ['locked', 10, 15]]), p = g.player, d = driver(g);
  d.step(); g.castSpell('shadow-boxing'); g.targetId = 'locked';
  d.step(['jump']); d.step(['attack']); assert.equal(g.plunge?.dive?.id, 'locked');
  for (let i = 0; i < 20 && g.plunge; i++) d.step();
  const L = g.enemies.find((e) => e.id === 'locked'); assert.ok(Math.hypot(L.x - p.x, L.y - p.y) < 1.4, 'to the locked foe'); assert.ok(lost(g, 'locked') > 0);
});

test('Shadow Boxing: with no foe in range it is the ordinary plunge; walls stop the dive', () => {
  { const { g } = arena([['away', 10 + PLUNGE_DIVE.range + 3, 10]]), p = g.player, d = driver(g); d.step(); g.castSpell('shadow-boxing');
    const x = p.x; d.step(['jump']); d.step(['attack']); assert.ok(g.plunge); assert.equal(g.plunge.dive, null, 'no dive'); assert.equal(g.message, 'Plunge!');
    d.idle(300); assert.equal(p.x, x); assert.ok(!g.effects.some((e) => e.kind === 'plunge-burst'), 'no burst'); }
  { const { g } = arena([['foe', 15, 10]]), p = g.player, d = driver(g); for (const t of g.map.tiles) if (t.x === 13) t.blocked = true;
    d.step(); g.castSpell('shadow-boxing'); d.step(['jump']); d.step(['attack']); assert.ok(g.plunge?.dive);
    for (let i = 0; i < 20 && g.plunge; i++) d.step();
    assert.ok(p.x + .76 <= 13 + 1e-6, `stopped at the wall (${p.x})`); }
});

test('Shadow Boxing: the dive never flies onto lethal ground', () => {
  const { g } = arena([['foe', 16, 10]]), p = g.player, d = driver(g); for (const t of g.map.tiles) if (t.x === 13) t.kind = 'lava';
  d.step(); g.castSpell('shadow-boxing'); d.step(['jump']); d.step(['attack']); for (let i = 0; i < 20 && g.plunge; i++) d.step();
  assert.ok(p.hp > 0, 'alive'); assert.ok(p.x + .5 < 13, `short of the lava (${p.x})`);
});

test('no air attack while mounted, in the robot or the drone, or aboard: Attack does what it did', () => {
  const cases = {
    robot: (s, g) => { s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; setMechMode(s, 'robot'); g.useConsumable('submersible', 0); },
    drone: (s, g) => { s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; },
  };
  for (const [name, setup] of Object.entries(cases)) {
    const { g } = arena([['foe', 11, 10]], 'salvage-blade', setup), d = driver(g);
    assert.ok(name === 'robot' ? g.mechUp() : g.droneUp(), `${name} is up`);
    g.jumpUntil = d.now() + 400; d.step(['attack']); assert.equal(g.plunge ?? null, null, name);
  }
  const { g } = arena([['foe', 11, 10]]), d = driver(g);
  g.mountRide = () => ({ beast: 'stalker' }); g.jumpUntil = d.now() + 400; d.step(['attack']); assert.equal(g.plunge ?? null, null, 'mounted');
  const b = arena([['foe', 11, 10]]).g, bd = driver(b); b.save.activeWeaponSlot = 'secondary'; b.jumpUntil = bd.now() + 400; bd.step(['attack']); assert.equal(b.plunge ?? null, null, 'the secondary weapon fires as before');
});

test('a plunge never negates fall damage: off a sky hop over lower ground it lands as a fall', () => {
  const { g } = arena([]), p = g.player, d = driver(g);
  // ground three levels below the hop
  g.map.landscape = true; for (const t of g.map.tiles) t.elev = 0;
  d.step(); const hp = p.hp; g.jumpFrom = 3; g.skyAir = 3; g.jumpStart = d.now(); g.jumpDur = JUMP.sky; g.jumpUntil = d.now() + JUMP.sky;
  d.step(); assert.ok(g.jumpUntil > d.now()); d.step(['attack']); assert.ok(g.plunge);
  d.idle(300); assert.equal(g.plunge, null);
  assert.ok(fallDamage(3, g.save.maxHp) > 0); assert.equal(p.hp, hp - fallDamage(3, g.save.maxHp), `a three-level fall (${hp} -> ${p.hp})`);
});

test('roof decks: a plunge from a jump on a deck lands on the deck', () => {
  const { g, deck } = onDeck(), d = driver(g); d.idle(100); assert.equal(g.roofDeck?.id, deck.id, 'standing on the roof'); const hp = g.player.hp;
  d.step(['jump']); d.step(); assert.equal(g.roofDeck, null, 'in the air over it'); d.step(['attack']); assert.ok(g.plunge);
  d.idle(400); assert.equal(g.plunge, null);
  assert.equal(g.roofDeck?.id, deck.id, 'back on the roof'); assert.equal(g.playerLevel(), deck.level); assert.equal(g.player.hp, hp, 'no fall');
  assert.ok(g.plungeRecoverUntil > 0, 'and it slammed');
});

test('the standard view draws the slam ring and the burst', () => {
  const calls = []; const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { calls.push(k); }, set: (o, k, v) => { o[k] = v; return true; } });
  const game = { effects: [{ kind: 'plunge-slam', brawler: true, x: 1, y: 1, radius: 1.5, life: .2 }, { kind: 'plunge-burst', brawler: true, x: 1, y: 1, radius: 1.6, life: .2 }], player: { x: 0, y: 0 } };
  drawBrawler(ctx, game, (q) => [q.x * 10, q.y * 10], 10, 0);
  assert.ok(calls.filter((k) => k === 'arc').length >= 4, 'rings drawn');
});
