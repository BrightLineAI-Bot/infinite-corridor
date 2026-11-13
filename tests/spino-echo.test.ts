// Spinosaur's Echo (Tim, 2026-11-12: "the Spinosaurus's Echo increases your jump attacks. When you do the jump-attack slam,
// it adds an echo to the hit: a secondary, afterimage-like slam that does less damage. You slam, and then it does the second
// slam"). echoes.ts ECHOES.spinoRex, SPINO_ECHO, plungeAfterimage; game.ts plungeLand; brawler-spells.ts drawAfterimage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant, WAYFARER_DAMAGE } from '../src/combat.ts';
import { PLUNGE, PLUNGE_PROFILES, drawBrawler, PLUNGE_AFTERIMAGE_VIEW, plungeAfterimagePose } from '../src/brawler-spells.ts';
import { ECHOES, ECHO_IDS, SPINO_ECHO, plungeAfterimage, toggleEcho, ensureEchoState, echoDrop, grantSlainEchoes, hasEcho, notchesUsed, NOTCHES } from '../src/echoes.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const WEAPONS = {
  'salvage-blade': { id: 'salvage-blade', name: 'Salvage Blade', slot: 'primary', power: 1 },
  'primary-verge-cleaver': { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 1 },
  'primary-cinder-pike': { id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 1 },
  'primary-iron-fists': { id: 'primary-iron-fists', name: 'Iron Fists', slot: 'primary', power: 1 },
};
function arena(foes, { weapon = 'salvage-blade', echo = true, seed = 'SPINO-ECHO' } = {}) {
  const s = freshSave(); s.seed = seed; s.perception.aperture = 3255; s.maxHp = 100;
  s.equipment.primary = { ...WEAPONS[weapon] };
  if (echo) { s.echoes.owned.spinoRex = true; s.echoes.equipped = ['spinoRex']; }
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 }));
  return { s, g };
}
function driver(g, t0 = 1000) {
  let t = t0;
  const step = (press = [], x = 0, y = 0) => { const left = new Set(press); t += 50; g.update(.05, { state: { x, y }, consume: (k) => left.delete(k), held: () => false }, t); };
  return { step, idle: (ms) => { for (let i = 0; i < ms / 50; i++) step(); }, now: () => t };
}
const hpOf = (g, id) => g.enemies.find((e) => e.id === id).hp;
const ghosts = (g) => g.effects.filter((e) => e.kind === 'plunge-afterimage');
// Jump, plunge and step until the slam lands; returns the frame time it landed and the slam effect.
function plungeToLanding(g, d) {
  d.step(['jump']); d.step(); d.step(['attack'], 1, 0); assert.ok(g.plunge, 'a plunge starts');
  for (let i = 0; i < 12 && g.plunge; i++) d.step();
  assert.equal(g.plunge, null, 'landed');
  return { at: d.now(), slam: g.effects.find((e) => e.kind === 'plunge-slam') };
}

test("the Spinosaurus's Echo is defined like the others, from data, and waits for its beast", () => {
  const E = ECHOES.spinoRex;
  assert.ok(E, 'keyed by the beast kind'); assert.equal(E.name, "Spinosaur's Echo");
  assert.equal(E.trigger, 'plunge'); assert.equal(E.module, 'spinoLeapSlam');
  assert.ok(E.cost >= 1 && E.cost <= 3 && E.text); assert.equal(E.cost, 2);
  assert.match(E.text, /jump-attack/); assert.ok(E.text.includes(`${Math.round(SPINO_ECHO.share * 100)}%`), 'its text reads the table');
  assert.ok(SPINO_ECHO.delay >= .25 && SPINO_ECHO.delay <= .4, 'the delay is a quarter to two fifths of a second');
  assert.ok(SPINO_ECHO.share > 0 && SPINO_ECHO.share < 1, 'less than the slam'); assert.equal(SPINO_ECHO.share, .5);
  // once the beast has landed it must list its Echo
  if (MONSTER_PACK.spinoRex) {
    assert.ok(!E.pending, "remove `pending` from ECHOES.spinoRex now that the Spinosaurus is in the pack");
    assert.ok(!MONSTER_PACK.spinoRex.noEcho, 'and `noEcho` from its MONSTER_PACK entry');
    assert.ok(ECHO_IDS.includes('spinoRex'));
  } else {
    assert.equal(E.pending, true); assert.ok(!ECHO_IDS.includes('spinoRex'), 'not listed before its beast exists');
  }
});

test("the Spinosaurus's Echo is granted, set and saved like the others", () => {
  const s = freshSave(); s.seed = 'GRANT';
  assert.equal(toggleEcho(s, 'spinoRex').ok, false, 'must own it first');
  // the first kill of a world beast leaves its Echo for certain (game.ts takeFirstSpoils, then echoDrop)
  assert.equal(echoDrop(s, { id: 'spino-1', kind: 'spinoRex', packKind: true, worldBeast: 'spinoRex' }, true, 1, true), 'spinoRex');
  assert.equal(s.echoes.owned.spinoRex, true);
  assert.equal(echoDrop(s, { id: 'spino-2', packKind: 'spinoRex' }, true, 2, true), null, 'owned once');
  assert.equal(toggleEcho(s, 'spinoRex').ok, true); assert.deepEqual(s.echoes.equipped, ['spinoRex']); assert.equal(notchesUsed(s.echoes.equipped), 2);
  assert.ok(hasEcho(s, 'spinoRex'));
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(back.echoes.owned.spinoRex, true); assert.deepEqual(back.echoes.equipped, ['spinoRex'], 'kept through a reload');
  ensureEchoState(back); assert.deepEqual(back.echoes.equipped, ['spinoRex']);
  assert.ok(NOTCHES >= 2);
  // a Wayfarer who slew it before taking the Echo is given it on load, as every world beast's
  const old = freshSave(); old.worldBeasts = { ...(old.worldBeasts || {}), spinoRex: { slain: 1 } };
  assert.deepEqual(grantSlainEchoes(old), ['spinoRex']); assert.equal(old.echoes.owned.spinoRex, true);
});

test('with the Echo, a plunge slam is followed by exactly one afterimage slam: same spot and reach, at the delay, for the reduced damage', () => {
  const P = PLUNGE_PROFILES['salvage-blade'], { g } = arena([['foe', 11, 10], ['far', 10 + P.radius + 1, 10]]), d = driver(g);
  const { at, slam } = plungeToLanding(g, d);
  assert.ok(slam, 'the slam'); const ghost = ghosts(g);
  assert.equal(ghost.length, 1, 'one afterimage');
  const a = ghost[0];
  assert.equal(a.x, slam.x); assert.equal(a.y, slam.y); assert.equal(a.radius, slam.radius, 'the same reach'); assert.equal(a.stun, slam.stun);
  assert.equal(a.damage, Math.max(1, Math.round(slam.damage * SPINO_ECHO.share)), 'the share of the slam');
  assert.ok(Math.abs(a.delay - SPINO_ECHO.delay) < .051, 'waits the delay');
  const first = 5000 - hpOf(g, 'foe'); assert.ok(first > 0, 'the slam lands');
  let landed = null;
  for (let i = 0; i < 20; i++) { const before = hpOf(g, 'foe'); d.step(); if (hpOf(g, 'foe') < before) { assert.equal(landed, null, 'only once'); landed = { t: d.now(), dealt: before - hpOf(g, 'foe') }; } }
  assert.ok(landed, 'the afterimage slams');
  const wait = landed.t - at;
  assert.ok(wait >= SPINO_ECHO.delay * 1000 - 50 && wait <= SPINO_ECHO.delay * 1000 + 50, `${wait} ms after the slam`);
  assert.ok(Math.abs(landed.dealt - Math.round(a.damage * WAYFARER_DAMAGE.scale)) <= 2, `${landed.dealt} vs ${a.damage}`);
  assert.ok(landed.dealt < first, 'less than the slam'); assert.ok(Math.abs(landed.dealt - first * SPINO_ECHO.share) <= 2, 'about half');
  assert.equal(hpOf(g, 'far'), 5000, 'the foe outside the reach is untouched by either');
  assert.equal(ghosts(g).length, 0, 'and it is gone once faded');
});

for (const weapon of Object.keys(WEAPONS)) {
  test(`${weapon}: the afterimage follows the slam with the weapon's own reach`, () => {
    const { g } = arena([['foe', 11, 10]], { weapon }), d = driver(g);
    const { slam } = plungeToLanding(g, d);
    const [a] = ghosts(g); assert.ok(a); assert.equal(a.radius, PLUNGE_PROFILES[weapon].radius); assert.equal(a.x, slam.x); assert.equal(a.y, slam.y);
    const hp = hpOf(g, 'foe'); d.idle(600); assert.ok(hpOf(g, 'foe') < hp, 'it lands');
  });
}

test('without the Echo there is no afterimage; owned but not set, none either', () => {
  for (const setup of [{ echo: false }, { echo: true, unset: true }]) {
    const { g, s } = arena([['foe', 11, 10]], { echo: setup.echo }), d = driver(g);
    if (setup.unset) s.echoes.equipped = [];
    plungeToLanding(g, d); const hp = hpOf(g, 'foe'); assert.ok(hp < 5000);
    assert.equal(ghosts(g).length, 0, 'no afterimage');
    d.idle(1000); assert.equal(hpOf(g, 'foe'), hp, 'no second slam');
  }
});

test('no chaining: an afterimage never lays another, and only a Wayfarer slam makes one', () => {
  const { g } = arena([['foe', 11, 10]]), d = driver(g), seen = new Set();
  plungeToLanding(g, d);
  for (let i = 0; i < 30; i++) { for (const e of ghosts(g)) seen.add(e.id); d.step(); }
  assert.equal(seen.size, 1, 'one afterimage in all');
  const slam = { kind: 'plunge-slam', x: 1, y: 1, radius: 1.5, damage: 20, life: .3, stun: .35, hits: {} };
  const a = plungeAfterimage(slam, 'a', { x: 1, y: 0 }); assert.ok(a);
  assert.equal(plungeAfterimage(a, 'b', { x: 1, y: 0 }), null, 'an afterimage of an afterimage: none');
  assert.equal(plungeAfterimage({ ...slam, kind: 'plunge-burst' }, 'c'), null, 'the dive burst is not echoed');
  assert.equal(plungeAfterimage({ ...slam, hostile: true }, 'd'), null);
  assert.equal(plungeAfterimage({ ...slam, damage: 1 }, 'e').damage, 1, 'never below one');
  assert.notEqual(a.hits, slam.hits, 'its own hit record');
});

test('Shadow Boxing: the dive slams, bursts, and the afterimage repeats the slam only, where it landed', () => {
  const { g } = arena([['near', 15, 11]]), d = driver(g);
  d.step(); g.castSpell('shadow-boxing'); d.step(['jump']); d.step(['attack']); assert.ok(g.plunge?.dive);
  for (let i = 0; i < 20 && g.plunge; i++) d.step();
  const slam = g.effects.find((e) => e.kind === 'plunge-slam'), [a] = ghosts(g);
  assert.ok(slam && a); assert.equal(ghosts(g).length, 1); assert.equal(a.x, slam.x); assert.equal(a.y, slam.y);
  const hp = hpOf(g, 'near'); d.idle(600); assert.ok(hpOf(g, 'near') < hp, 'the afterimage lands on the dived foe');
});

test('deterministic: the same journey slams the same afterimage', () => {
  const run = () => { const { g } = arena([['a', 11, 10], ['b', 10, 11]], { seed: 'DET' }), d = driver(g), log = []; plungeToLanding(g, d); log.push(JSON.stringify(ghosts(g))); for (let i = 0; i < 20; i++) { d.step(); log.push(`${hpOf(g, 'a')},${hpOf(g, 'b')}`); } return log.join('|'); };
  assert.equal(run(), run());
});

function roundTrip(g, now) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}
test('save and resume mid-afterimage: the pending afterimage is kept and lands once, for its share', () => {
  const s = freshSave(); s.seed = 'SPINO-RESUME'; s.maxHp = 100; s.echoes.owned.spinoRex = true; s.echoes.equipped = ['spinoRex'];
  s.equipment.primary = { ...WEAPONS['salvage-blade'] };
  // a foe of the section's own (a reload restores the section's foes by id), on its own ground, the Wayfarer beside it
  const g = new Game(s, 0), d = driver(g); d.idle(100);
  const foe = g.enemies.find((e) => !e.dead && !e.boss); assert.ok(foe, 'the section has a foe');
  Object.assign(foe, { hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 }); g.enemies = [foe]; const id = foe.id;
  Object.assign(g.player, { x: foe.x - 1, y: foe.y, hp: 100 });
  plungeToLanding(g, d); const [a] = ghosts(g); assert.ok(a && a.delay > 0, 'mid-afterimage');
  const hp = hpOf(g, id), left = a.delay;
  const h = new Game(roundTrip(g, d.now()), 70000), hd = driver(h, 70000), hfoe = h.enemies.find((e) => e.id === id);
  assert.ok(hfoe, 'the foe resumes'); assert.equal(hfoe.hp, hp);
  const kept = ghosts(h); assert.equal(kept.length, 1, 'the afterimage resumes'); assert.ok(Math.abs(kept[0].delay - left) < 1e-9, 'with the wait it had left');
  assert.equal(hasEcho(h.save, 'spinoRex'), true, 'and the Echo is still set');
  Object.assign(hfoe, { damage: 0, cooldown: 99 }); h.enemies = [hfoe];
  let hits = 0; for (let i = 0; i < 20; i++) { const before = hfoe.hp; hd.step(); if (hfoe.hp < before) hits++; }
  assert.equal(hits, 1, 'it lands once'); assert.ok(Math.abs((hp - hfoe.hp) - Math.round(a.damage * WAYFARER_DAMAGE.scale)) <= 2);
  assert.equal(ghosts(h).length, 0);
});

test('60 s of plunges with the Echo: effects stay bounded, nothing NaN', () => {
  const { g } = arena([['a', 11, 10], ['b', 10, 11], ['c', 9, 10]]), d = driver(g);
  let most = 0; const made = new Set();
  for (let t = 0; t < 60000; t += 50) {
    for (const e of g.enemies) { e.hp = 5000; e.dead = false; }
    g.plungeRecoverUntil = 0; g.player.attackReadyAt = 0; g.player.stamina = 999;
    const jumping = g.jumpUntil > d.now();
    d.step(jumping ? ['attack'] : ['jump'], 0, 0);
    for (const e of ghosts(g)) made.add(e.id);
    most = Math.max(most, g.effects.length);
    for (const e of g.effects) for (const k of ['x', 'y', 'radius', 'damage', 'life']) assert.ok(Number.isFinite(e[k]), `${e.kind}.${k}`);
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y) && Number.isFinite(g.player.hp));
  }
  assert.ok(made.size > 20, `many plunges echoed (${made.size})`);
  assert.ok(most <= 8, `effects bounded (${most})`);
});

test('the afterimage is drawn: a pale Wayfarer and a ghostly ring in the standard view, the hammer-stomp model in Close View', () => {
  const calls = []; const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { calls.push(k); }, set: (o, k, v) => { o[k] = v; return true; } });
  const fx = plungeAfterimage({ kind: 'plunge-slam', brawler: true, x: 1, y: 1, radius: 1.5, damage: 20, life: PLUNGE.slamLife, stun: .35, hits: {} }, 'g', { x: 0, y: 1 });
  const game = { effects: [fx], player: { x: 0, y: 0 } }, to = (q) => [q.x * 10, q.y * 10];
  drawBrawler(ctx, game, to, 10, 0); assert.ok(calls.includes('arc') && calls.includes('fill'), 'waiting: the mark and the afterimage');
  // the pose: the blow comes down as the wait runs out and strikes as it lands
  assert.equal(plungeAfterimagePose(fx).amount, 0);
  fx.delay = 1e-9; assert.ok(Math.abs(plungeAfterimagePose(fx).amount - PLUNGE_AFTERIMAGE_VIEW.strikeAt) < 1e-6);
  fx.delay = 0; fx.life = PLUNGE.slamLife / 2; const mid = plungeAfterimagePose(fx); assert.ok(mid.amount > PLUNGE_AFTERIMAGE_VIEW.strikeAt && mid.alpha > 0 && mid.alpha < PLUNGE_AFTERIMAGE_VIEW.alpha);
  calls.length = 0; drawBrawler(ctx, game, to, 10, 0); assert.ok(calls.filter((k) => k === 'arc').length >= 3, 'the ghostly ring');
  // Close View: captured as the Wayfarer's hammer-stomp model, tinted as the Shadow Clone
  let spec = null; calls.length = 0;
  drawBrawler(ctx, game, to, 10, 0, { captureActor: (q) => { spec = q; return true; } });
  assert.ok(spec && spec.source === fx); const a = spec.sample(0, false);
  assert.equal(a.kind, 'playerHammerStomp'); assert.equal(a.shadow, true); assert.equal(a.pose, 'attack');
  assert.ok(Number.isFinite(a.amount) && Number.isFinite(a.alpha) && Number.isFinite(a.yaw)); assert.ok(Math.abs(a.yaw - Math.PI / 2) < 1e-9, 'facing its slam');
  assert.equal(a.x, fx.x); assert.ok(Math.abs(a.y - (fx.y + .37)) < 1e-9, 'standing on the spot');
  // faded: nothing more is drawn of the figure
  fx.life = 0; assert.equal(plungeAfterimagePose(fx).alpha, 0);
});
