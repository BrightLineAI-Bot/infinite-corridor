// Power Aegis (Tim, 2026-11-19): the Aegis's perfect parry, a Transit Lattice spell passive (hit-cast-passives.ts POWER_AEGIS,
// lattice-fields.ts FIELD_PASSIVES["power-aegis"], game.ts perfectParry). Blows here are real: an ashling's own attack through
// updateEnemyAI (its timing is measured first, then the Aegis is cast before it), a hostile shot through updateProjectiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, GAME_CLOCKS, RESUME_GAME_CLOCKS } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { FIELD_KEYS, fieldForm, FIELD_PASSIVES } from '../src/lattice-fields.ts';
import { latticePassiveGroups, toggleLatticePassive } from '../src/constellation.ts';
import { POWER_AEGIS, powerAegisLeft } from '../src/hit-cast-passives.ts';
import { BRAWLER, ESSENCE_WALK } from '../src/brawler-spells.ts';
import { SPELLS } from '../src/items.ts';
import { ATTACK_MODULES, reflectShotStep } from '../src/monster-pack.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const DT = 1 / 60, FRAME = 1000 / 60;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
// A flat dungeon, the Lattice open; `passive`: Power Aegis held. One ashling beside the Wayfarer that strikes for real.
function arena({ passive = true, boss = false, foe = true } = {}) {
  const s = freshSave(); s.seed = 'POWER-AEGIS'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s);
  s.lattice.passives = passive ? ['field:power-aegis'] : []; s.maxHp = 100; s.maxStamina = 100;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100, stamina: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foe ? [Object.assign(createCombatant('ashling', 11, 10), { id: 'foe', hp: 5000, maxHp: 5000, damage: 20, aggro: true }, boss ? { boss: true } : {})] : [];
  return { s, g, e: g.enemies[0] };
}
const cds = (g) => g.save.magicSkills.cooldowns;
// Steps frames from `t` until `until` (exclusive); returns the frame time of the first hp loss (or null) and the next t.
function run(g, t, until, onFrame = null) {
  let hit = null;
  while (t < until) { const b = g.player.hp; g.update(DT, idle, t); if (hit === null && g.player.hp < b) hit = t; onFrame?.(t); t += FRAME; }
  return { hit, t };
}
// When the ashling's first blow lands, measured on an identical arena with no Aegis (a boss is paced slower: BOSS_PACE).
const firstBlow = (opts = {}) => { const { g } = arena({ ...opts, passive: false }); return run(g, 1000, 8000).hit; };
const FIRST = firstBlow(), FIRST_BOSS = firstBlow({ boss: true });
// Casts the Aegis `lead` ms before the measured blow, then runs past it. Returns what happened.
function parryAt(lead, opts = {}) {
  const A = arena(opts), { g } = A, FIRST = opts.boss ? FIRST_BOSS : firstBlow(opts); let t = 1000;
  ({ t } = run(g, t, FIRST - lead));
  if (opts.before) opts.before(g);
  const castAt = g.lastUpdateNow, ok = g.castSpell('aegis'), cd = cds(g)['spell:aegis'];
  const hpBefore = g.player.hp; const r = run(g, t, FIRST + 3 * FRAME);
  return { ...A, ok, castAt, cd, hpBefore, lost: hpBefore - g.player.hp, t: r.t, at: FIRST };
}

test('placement: a Lattice spell passive, Power Aegis, nothing to learn; the window is forgiving and in the table', () => {
  assert.ok(FIELD_KEYS.includes('field:power-aegis'));
  assert.equal(fieldForm('field:power-aegis').name, 'Power Aegis');
  assert.equal(FIELD_PASSIVES['power-aegis'].rules, POWER_AEGIS);
  assert.ok(latticePassiveGroups().find((q) => q.id === 'spells').keys.includes('field:power-aegis'));
  assert.equal(Object.values(SPELLS).filter((q) => /power aegis/i.test(q.name)).length, 0, 'no spell of that name');
  assert.ok(POWER_AEGIS.windowMs >= 400 && POWER_AEGIS.windowMs <= 500 && POWER_AEGIS.windowMs < BRAWLER.aegis.ms, 'about the first half of the ward (Tim: generous)');
  for (const k of ['aegisPerfectUntil', 'powerAegisUntil']) assert.ok(GAME_CLOCKS.includes(k) && RESUME_GAME_CLOCKS.includes(k), k);
  const s = freshSave(); s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s);
  assert.equal(toggleLatticePassive(s, 'field:power-aegis').ok, true); assert.deepEqual(s.lattice.passives, ['field:power-aegis']);
  assert.ok(FIRST > 1000 && FIRST < 4000, `the ashling's blow lands at ${FIRST}`);
});

test('a perfect parry: the blow is turned aside, the foe staggers, the Aegis is ready again, Power Aegis starts', () => {
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6));
  assert.equal(r.ok, true); assert.ok(r.cd > 0, 'the cast started its cooldown');
  assert.equal(r.lost, 0, 'no damage');
  assert.equal(cds(r.g)['spell:aegis'], 0, 'cooldown refunded');
  assert.match(r.g.message, /Perfect!/);
  assert.ok(r.g.parryFlashAt >= r.at && r.g.parryFlashAt <= r.at + FRAME, 'the flash');
  assert.ok(r.g.powerAegisUntil > r.at + POWER_AEGIS.buffMs - 3 * FRAME && r.g.powerAegisUntil <= r.at + POWER_AEGIS.buffMs + FRAME, 'empowered for buffMs');
  assert.equal(r.g.aegisPerfectUntil, 0, 'the window closed: one parry a cast');
  assert.ok(r.e.hitStun > 0 || r.e.staggerGuard > 0 || r.e.staggerMeter > 0, `the attacker staggered (${r.e.hitStun})`);
  assert.equal(r.g.castSpell('aegis'), true, 'and it casts again at once');
});

test('the edge of the window: a wind-up that ends just inside it parries; a blow later in the ward is only blocked', () => {
  const inside = parryAt(POWER_AEGIS.windowMs - 2 * FRAME);
  assert.equal(inside.lost, 0); assert.equal(cds(inside.g)['spell:aegis'], 0, 'inside: refunded');
  const late = parryAt(700);
  assert.equal(late.lost, 0, 'late: still blocked, as the Aegis always did');
  assert.ok(cds(late.g)['spell:aegis'] > SPELLS.aegis.cooldown - 1, 'late: the cooldown runs on');
  assert.ok(!(late.g.powerAegisUntil > 0), 'late: no empowerment'); assert.doesNotMatch(late.g.message, /Perfect!/);
  assert.ok(!(late.e.hitStun > .3), 'late: no parry stagger');
  const after = parryAt(BRAWLER.aegis.ms + 150);
  assert.ok(after.lost > 0, 'after the ward ends, the blow lands');
});

test('one refund a cast: a second blow in the same window does not refund again', () => {
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6));
  cds(r.g)['spell:aegis'] = 5; // as if spent again without casting
  r.g.player.invulnerableUntil = 0;
  r.g.effects.push({ id: 'hit-2', hostile: true, x: r.g.player.x + .5, y: r.g.player.y + .52, radius: 1, damage: 30, life: .3, pulse: 99, untilPulse: 0, hits: {} });
  const b = r.g.player.hp; r.g.update(DT, idle, r.t);
  assert.equal(r.g.player.hp, b, 'still blocked by the ward'); assert.equal(cds(r.g)['spell:aegis'] > 4, true, 'no second refund');
});

test('stamina: an Essence Walk cast of the Aegis gets staminaShare of its price back, and its lockout is lifted', () => {
  const price = ESSENCE_WALK.costs.aegis;
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6), { before: (g) => {
    g.castSpell('essence-walk'); g.castSpell('aegis'); // a ready Aegis is free; now it recovers
    g.player.stamina = price + 10; // the next cast (below) costs the price and spends it down: locked
  } });
  assert.equal(r.ok, true);
  assert.equal(r.g.aegisLockUntil, 0, 'the lockout lifted'); assert.equal(cds(r.g)['spell:aegis'], 0);
  const late = parryAt(700, { before: (g) => { g.castSpell('essence-walk'); g.castSpell('aegis'); g.player.stamina = price + 10; } });
  assert.ok(late.g.aegisLockUntil > late.at, 'late: still locked');
  // the same cast at the same moment without the passive: the same regeneration, no refund
  const lead = Math.round(POWER_AEGIS.windowMs * .6), plain = parryAt(lead, { passive: false, before: (g) => { g.castSpell('essence-walk'); g.castSpell('aegis'); g.player.stamina = price + 10; } });
  const gain = r.g.player.stamina - plain.g.player.stamina, want = price * POWER_AEGIS.staminaShare;
  assert.ok(Math.abs(gain - want) < .01, `refunded ${want} (with ${r.g.player.stamina.toFixed(2)}, without ${plain.g.player.stamina.toFixed(2)})`);
});

test('empowerment: melee hits deal +bonus for buffMs, tool shots toolBonus; nothing after', () => {
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6)), g = r.g, e = r.e, at = g.parryFlashAt;
  const extra = (now, src) => { const b = e.hp; g.landHit(e, 100, now, src); return b - e.hp; };
  assert.equal(extra(at + 100, 'melee'), Math.round(100 * POWER_AEGIS.bonus), 'a swing');
  assert.equal(extra(at + 200, { brawler: true }), Math.round(100 * POWER_AEGIS.bonus), 'a punch, Hammerfall, the Great Sweep');
  assert.equal(extra(at + 300, { glyphHost: 'tool' }), Math.round(100 * POWER_AEGIS.toolBonus), 'a tool shot');
  assert.ok(powerAegisLeft(g, at + POWER_AEGIS.buffMs - 50) > 0);
  assert.equal(extra(at + POWER_AEGIS.buffMs + 50, 'melee'), 0, 'over');
  assert.equal(powerAegisLeft(g, at + POWER_AEGIS.buffMs + 50), 0);
});

test('bosses, world beasts and elites stagger only bossShare of it', () => {
  const plain = parryAt(Math.round(POWER_AEGIS.windowMs * .6)), big = parryAt(Math.round(POWER_AEGIS.windowMs * .6), { boss: true });
  assert.equal(cds(big.g)['spell:aegis'], 0, 'still a parry');
  // read the stagger on the frame of the parry (before the governor's countdown): re-run and stop there
  const stunOn = (opts) => { const A = arena(opts), F = opts.boss ? FIRST_BOSS : FIRST; let t = 1000; ({ t } = run(A.g, t, F - 200)); A.g.castSpell('aegis'); let s = null; run(A.g, t, F + 2 * FRAME, () => { if (s === null && A.g.parryFlashAt > 0) s = A.e.hitStun; }); return s; };
  const ordinary = stunOn({}), boss = stunOn({ boss: true });
  assert.ok(Math.abs(ordinary - POWER_AEGIS.stun) < 1e-9, `ordinary ${ordinary}`);
  assert.ok(Math.abs(boss - POWER_AEGIS.stun * POWER_AEGIS.bossShare) < 1e-9, `boss ${boss}`);
  assert.ok(plain.lost === 0 && big.lost === 0);
});

// 2026-11-19 (Tim: "projectiles should be reflected back"): this test pinned "negated, not reflected"; the shot now turns round
// (no shooter here, so it simply flies back the way it came). The refund, the empowerment and "no stagger" are unchanged.
test('projectiles: a perfectly timed Aegis parries a hostile shot (negated, turned round): refund and empowerment, no stagger', () => {
  const { g } = arena({ foe: false }); let t = 1000; ({ t } = run(g, t, 1100));
  g.castSpell('aegis'); const p = g.player;
  g.projectiles.push({ id: 'enemy-shot-x', x: p.x + .5 + 1.2, y: p.y + .42, dx: -1, dy: 0, speed: 4.2, life: 2.4, damage: 25, hostile: true, hits: {}, path: 'straight' });
  const r = run(g, t, t + 400);
  assert.ok(g.parryFlashAt > 0, 'parried'); assert.equal(g.player.hp, 100, 'negated');
  assert.equal(cds(g)['spell:aegis'], 0); assert.ok(g.powerAegisUntil > r.t);
  assert.equal(g.projectiles.filter((q) => q.hostile === false && q.aegisReflected).length, 1, 'turned round (2026-11-19: was "not reflected")');
  assert.equal(g.projectiles.filter((q) => q.hostile).length, 0, 'nothing hostile left');
});

test('without the passive nothing changes: no window, the cooldown runs on, no empowerment', () => {
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6), { passive: false });
  assert.equal(r.lost, 0, 'the Aegis blocks as always');
  assert.ok(cds(r.g)['spell:aegis'] > SPELLS.aegis.cooldown - 1);
  assert.ok(!(r.g.aegisPerfectUntil > 0) && !(r.g.powerAegisUntil > 0) && !(r.g.parryFlashAt > 0));
  const b = r.e.hp; r.g.landHit(r.e, 100, r.t, 'melee'); assert.equal(b - r.e.hp, 0, 'no bonus');
});

test('exact resume: the window and the empowerment survive a pause and a reload', () => {
  const { g } = arena({ foe: false }); run(g, 1000, 1100); g.castSpell('aegis');
  const win = g.aegisPerfectUntil; assert.ok(win > g.lastUpdateNow);
  g.setPaused(true, 1200); g.setPaused(false, 61200); assert.equal(g.aegisPerfectUntil, win + 60000, 'a pause does not eat the window');
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6)), until = r.g.powerAegisUntil, clock = r.g.parryFlashAt + 1000;
  const { main, puts } = splitSnapshot(snapshotSave(r.g.exportSnapshot(clock)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts)))); assert.equal(v.health, 'healthy', v.error);
  const later = 500000, h = new Game(v.save, later);
  assert.equal(h.powerAegisUntil, later + (until - clock), 'empowerment time remaining restored');
  assert.ok(powerAegisLeft(h, later + 100) > 0);
  const { g: w } = arena({ foe: false }); run(w, 1000, 1100); w.castSpell('aegis'); const wl = w.aegisPerfectUntil - w.lastUpdateNow;
  const snap = splitSnapshot(snapshotSave(w.exportSnapshot(w.lastUpdateNow))); const v2 = validateJourney(assembleSave(structuredClone(snap.main), new Map(structuredClone(snap.puts))));
  const h2 = new Game(v2.save, later); assert.equal(h2.aegisPerfectUntil, later + wl, 'the window restored');
});

test('soak: the Aegis cast every frame with cooldowns wiped for 60 s under a real attacker: no NaN, bounded', () => {
  const { g, e } = arena(); let t = 1000, parries = 0, last = 0;
  run(g, t, t + 60000, (now) => {
    cds(g)['spell:aegis'] = 0; g.castSpell('aegis');
    if (g.parryFlashAt !== last && g.parryFlashAt > 0) { parries++; last = g.parryFlashAt; }
    g.player.invulnerableUntil = Math.min(g.player.invulnerableUntil || 0, now);
  });
  for (const v of [g.player.hp, g.player.stamina, g.powerAegisUntil, g.aegisPerfectUntil, e.hitStun, e.hp]) assert.ok(Number.isFinite(Number(v) || 0) && !Number.isNaN(Number(v ?? 0)), String(v));
  assert.equal(g.player.hp, 100, 'every blow turned aside'); assert.ok(parries > 3, `parries ${parries}`);
  assert.ok(g.effects.length < 64 && g.projectiles.length < 64, 'bounded');
});

// ---------------------------------------------------------------- the reflect and the tool bonus (Tim, 2026-11-19)
// `inject(g, fn)`: runs `fn(world, now)` inside the next frame's update, after the creatures have moved and before the Aegis
// resolves the frame's blows (where a creature's blow lands), through the game's real pack world. Unhooks itself.
function inject(g, fn) {
  g.applyInkShield = (...a) => { delete g.applyInkShield; fn(g.packWorld(DT, g.lastUpdateNow), g.lastUpdateNow); return g.applyInkShield(...a); };
}
// A Wayfarer with the passive and the Aegis just cast, and a still foe of 5000 health `gap` tiles off.
function warded({ boss = false, gap = 3, passive = true } = {}) {
  const A = arena({ passive, foe: false }), { g } = A; let t = 1000; ({ t } = run(g, t, 1100));
  const e = Object.assign(createCombatant('ashling', 10 + gap, 10, boss), { id: 'foe', hp: 5000, maxHp: 5000, damage: 20, aggro: false, speedMultiplier: 0, staggerImmune: true });
  g.enemies = [e]; g.castSpell('aegis');
  return { g, e, t, p: g.player };
}
const shotAt = (p, id, damage = 25, dy = 0) => ({ id, visualOwnerId: 'foe', x: p.x + .5 + 1.2, y: p.y + .42 + dy, dx: -1, dy: 0, speed: 4.2, life: 2.4, damage, hostile: true, hits: {}, path: 'straight' });

test('tool shots: +20% while Power Aegis holds (Tim: tool shots get some of the empowerment)', () => {
  assert.equal(POWER_AEGIS.toolBonus, .2);
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6)), at = r.g.parryFlashAt, b = r.e.hp;
  r.g.landHit(r.e, 100, at + 100, { glyphHost: 'tool' }); assert.equal(b - r.e.hp, 20, 'a tool shot of 100: 20 more');
  const c = r.e.hp; r.g.landHit(r.e, 100, at + POWER_AEGIS.buffMs + 50, { glyphHost: 'tool' }); assert.equal(c - r.e.hp, 0, 'not after');
});

test('a parried shot turns round, gold and friendly, and strikes the creature that loosed it', () => {
  const { g, e, t, p } = warded({ gap: 4 });
  g.projectiles.push(shotAt(p, 'enemy-shot-foe-1'));
  let turned = null; run(g, t, t + 1300, () => { turned ||= g.projectiles.find((q) => q.aegisReflected) || null; }); // before the ashling's own lunge
  assert.ok(turned, 'turned round'); assert.equal(turned.hostile, false); assert.equal(turned.seekId, 'foe', 'at its shooter');
  assert.equal(g.player.hp, 100, 'the Wayfarer takes nothing');
  assert.equal(5000 - e.hp, Math.round(25 * POWER_AEGIS.reflect), 'its own damage back (the reflect multiple)');
  assert.equal(cds(g)['spell:aegis'], 0, 'still a parry: refunded'); assert.match(g.message, /Perfect!/);
});

test('a parried melee blow lands back on the attacker as direct damage, with the reflect flash', () => {
  let carried = null, dealt = null;
  const r = parryAt(Math.round(POWER_AEGIS.windowMs * .6), { before: (g) => {
    const pb = g.parryBlow.bind(g), rb = g.reflectBlow.bind(g);
    g.parryBlow = (...a) => { const ok = pb(...a); if (ok && carried === null) carried = a[2]; return ok; };
    g.reflectBlow = (...a) => { const d = rb(...a); dealt ??= d; return d; };
  } });
  assert.equal(r.lost, 0); assert.ok(carried >= r.e.damage * .5, `carried ${carried}`);
  assert.equal(dealt, Math.round(carried * POWER_AEGIS.reflect), 'the blow sent back');
  assert.equal(5000 - r.e.hp, dealt, 'on the attacker');
  assert.ok(r.g.reflectFlashAt >= r.at && r.g.reflectFlashX === r.e.x, 'the gold flash on it');
});

test('roars, beams and area blasts go back to their maker; their riders never take hold', () => {
  const cases = [['doomRoar', {}, (w) => w.frenzy?.(99)], ['blobGasJet', { beam: true }, (w) => w.poison(4, 3)], ['spinoRoar', {}, (w) => { w.slow(.5, 2); w.confuse(2); w.stun(1); w.shockHit(); }]];
  for (const [source, opts, riders] of cases) {
    const { g, e, t } = warded({ gap: 6 });
    inject(g, (w) => { w.hurt(e, 30, { jumpable: false, source, ...opts }); riders(w); w.bleed(); w.ignite(3, 4); w.apatoPoison(2, 'wrap'); });
    run(g, t, t + 2 * FRAME);
    const now = g.lastUpdateNow;
    assert.equal(g.player.hp, 100, `${source}: blocked`); assert.equal(5000 - e.hp, 30, `${source}: sent back to its maker 6 tiles off`);
    assert.ok(!(g.playerFire?.left > 0), `${source}: no burn`); assert.ok(!(g.save.bleed?.left > 0), `${source}: no bleed`);
    assert.ok(!(g.save.elites?.status?.poison > 0) && !(g.save.poison?.stacks > 0), `${source}: no poison`);
    assert.ok(!(g.player.slowUntil > now) && !(g.player.confusedUntil > now) && !(g.player.stunnedUntil > now) && !(g.player.shockCount > 0), `${source}: no slow, confusion, stun or shock`);
    assert.ok(!g.frenzy?.active && !(g.frenzy?.build > 0), `${source}: no frenzy`);
    assert.equal(cds(g)['spell:aegis'], 0, `${source}: a parry`); assert.ok(g.reflectFlashAt > 0, `${source}: the flash on its maker`);
  }
  // the same blow and riders without the passive: blocked as before, and the riders take hold
  const { g, e, t } = warded({ passive: false });
  inject(g, (w) => { w.hurt(e, 30, { jumpable: false, source: 'blobGasJet', beam: true }); w.poison(4, 3); w.ignite(3, 4); });
  run(g, t, t + 2 * FRAME);
  assert.equal(g.player.hp, 100); assert.equal(e.hp, 5000, 'nothing goes back'); assert.ok(g.save.elites.status.poison > 0 && g.playerFire.left > 0, 'riders land as before');
});

test('real pack effects: a burning tree\'s touch goes back to its maker; a creature\'s bolt flies back as a gold shot', () => {
  { const { g, e, t, p } = warded({ gap: 5 });
    g.packEffects = [{ id: 'tree', kind: 'burnTree', owner: 'foe', x: p.x, y: p.y, radius: 1, grow: 0, burn: 5, age: 0, arming: 0, life: 6, damage: 30, seed: 1 }];
    run(g, t, t + 3 * FRAME);
    assert.ok(5000 - e.hp > 0, 'the touch went back'); assert.ok(!(g.playerFire?.left > 0), 'no burn'); assert.equal(g.player.hp, 100); }
  { const { g, e, t, p } = warded({ gap: 5 });
    g.packEffects = [{ id: 'thorn', kind: 'thorn', owner: 'foe', x: p.x + 1.4, y: p.y, vx: -6, vy: 0, radius: .3, arming: 0, life: 2, damage: 18 }];
    let bolt = null; run(g, t, t + 2000, () => { bolt ||= g.projectiles.find((q) => q.aegisReflected) || null; });
    assert.ok(bolt && bolt.hostile === false && bolt.seekId === 'foe', 'sent back as a shot'); assert.equal(5000 - e.hp, 18, 'its damage'); assert.equal(g.player.hp, 100); }
});

test('command grabs are not parried: the Spinosaurus Grab takes you inside the perfect window; the Aegis still blocks its damage', () => {
  const { g, t } = warded({ gap: 4 }), spino = Object.assign(createCombatant('spinoRex', 11, 10), { id: 'spino', hp: 9000, maxHp: 9000, speedMultiplier: 0 });
  g.enemies.push(spino); assert.ok(g.lastUpdateNow < g.aegisPerfectUntil, 'inside the window');
  let held = null;
  inject(g, (w) => { held = w.spinoHold(spino, 2); w.hurt(spino, 30, { jumpable: false, source: 'spinoGrab', piercing: true, beam: true }); w.bleed(); });
  run(g, t, t + 2 * FRAME);
  assert.equal(held, true, 'the hold takes');
  assert.ok(g.player.heldUntil > g.lastUpdateNow && g.player.heldBy === 'spino', 'held fast');
  assert.equal(g.player.hp, 100, 'the Aegis blocks the damage as it always did');
  assert.equal(spino.hp, 9000, 'nothing goes back'); assert.ok(g.save.bleed?.left > 0, 'the grab bleeds as before');
  assert.ok(cds(g)['spell:aegis'] > 4 && !(g.powerAegisUntil > 0) && !(g.parryFlashAt > 0), 'no parry, no refund, no empowerment');
  assert.ok(g.aegisPerfectUntil > g.lastUpdateNow, 'the window stays open for a real blow');
  // the rule, per move: the table's grabs, every ATTACK_MODULES move tagged "grab", the Stalker's arm, the biting draggers
  const now = g.lastUpdateNow;
  for (const id of [...POWER_AEGIS.grabs, ...Object.values(ATTACK_MODULES).filter((m) => m.tags?.includes('grab')).map((m) => m.id)]) assert.equal(g.aegisGrab(null, id, now), true, id);
  for (const id of ['spinoRoar', 'spinoBite', 'doomRoar', 'psyPush', 'sweepBeam', 'orb']) assert.equal(g.aegisGrab(null, id, now), false, id);
  assert.equal(g.aegisGrab({ id: 'ape', stalkAct: { kind: 'grab' } }, null, now), true, 'the Stalker ape arm');
  assert.equal(g.aegisGrab({ id: 'bog', seaKind: 'bogLurker' }, null, now), true, 'the Bog Lurker');
  assert.equal(g.aegisGrab(spino, 'spinoBite', now), true, 'any blow from the creature holding you');
});

test('bosses and world beasts take the same reflect, but never more than bossCap of their health from one', () => {
  const cap = Math.round(5000 * POWER_AEGIS.bossCap);
  const { g, e, t } = warded({ boss: true, gap: 3 });
  inject(g, (w) => w.hurt(e, 100000, { jumpable: false, source: 'sweepBeam', beam: true }));
  run(g, t, t + 2 * FRAME);
  assert.equal(5000 - e.hp, cap, 'capped'); assert.equal(g.player.hp, 100);
  const small = warded({ boss: true, gap: 3 }); inject(small.g, (w) => w.hurt(small.e, 40, { jumpable: false, source: 'sweepBeam', beam: true })); run(small.g, small.t, small.t + 2 * FRAME);
  assert.ok(5000 - small.e.hp > 0 && 5000 - small.e.hp < cap, `an ordinary boss blow goes back whole (${5000 - small.e.hp})`);
  const plain = warded({ gap: 3 }); inject(plain.g, (w) => w.hurt(plain.e, 1000, { jumpable: false, source: 'sweepBeam' })); run(plain.g, plain.t, plain.t + 2 * FRAME);
  assert.equal(5000 - plain.e.hp, 1000, 'an ordinary foe: no cap');
  assert.equal(g.reflectDamage(e, 100000), cap, 'a reflected shot on a boss: the same cap'); assert.equal(g.reflectDamage(plain.e, 100000), 100000);
});

test('no ping-pong: a turned shot passes a psychic wall, never hurts the Wayfarer, and reflected damage parries nothing', () => {
  const { g, e, t, p } = warded({ gap: 4 });
  g.projectiles.push(shotAt(p, 'enemy-shot-foe-a'), shotAt(p, 'enemy-shot-foe-b', 25, .01));
  let flashes = 0, last = 0; run(g, t, t + 1300, () => { if (g.parryFlashAt > 0 && g.parryFlashAt !== last) { flashes++; last = g.parryFlashAt; } });
  assert.equal(flashes, 1, 'one parry a cast'); assert.equal(g.player.hp, 100);
  assert.equal(5000 - e.hp, 25, 'only the first goes back; the second is only turned aside');
  const q = { x: 5, y: 5, dx: 1, dy: 0, damage: 10, hostile: false, aegisReflected: true, hits: {} };
  reflectShotStep(q, [{ kind: 'psyWall', id: 'w', x: 4.8, y: 4.55, nx: 1, ny: 0, arming: 0 }], .6);
  assert.equal(q.hostile, false, 'a psychic wall does not turn it back'); assert.equal(q.reflectedBy, undefined);
  g._reflecting = true; g.aegisPerfectUntil = g.aegisUntil = g.lastUpdateNow + 500;
  assert.equal(g.parryBlow(e, g.lastUpdateNow, 10), false, 'reflected damage never parries'); g._reflecting = false;
});

test('soak: shots, roars and bolts parried and sent back every frame for 60 s with cooldowns wiped: no NaN, bounded', () => {
  const { g, e, t, p } = warded({ gap: 2 }); e.staggerImmune = false; let n = 0;
  run(g, t, t + 60000, () => {
    cds(g)['spell:aegis'] = 0; g.castSpell('aegis'); g.player.invulnerableUntil = 0;
    const k = n++ % 3;
    if (k === 0 && g.projectiles.length < 48) g.projectiles.push({ ...shotAt(p, `enemy-shot-foe-${n}`, 5), x: p.x + .5 + .3 });
    else if (k === 1) inject(g, (w) => { w.hurt(e, 5, { jumpable: false, source: 'doomRoar' }); w.poison(2, 2); });
    else if (g.packEffects.length < 8) g.packEffects.push({ id: `t${n}`, kind: 'thorn', owner: 'foe', x: p.x + .6, y: p.y, vx: -6, vy: 0, radius: .3, arming: 0, life: 1, damage: 5 });
    if (e.hp < 1000) e.hp = 5000;
  });
  for (const v of [g.player.hp, e.hp, g.powerAegisUntil, g.reflectFlashAt, ...g.projectiles.map((q) => q.x + q.y + q.damage)]) assert.ok(Number.isFinite(Number(v)), String(v));
  assert.equal(g.player.hp, 100); assert.ok(g.projectiles.length <= 64 && g.packEffects.length <= 16 && g.effects.length < 64, `bounded (${g.projectiles.length}, ${g.packEffects.length})`);
});
