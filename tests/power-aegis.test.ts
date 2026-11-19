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

test('projectiles: a perfectly timed Aegis parries a hostile shot (negated, not reflected): refund and empowerment, no stagger', () => {
  const { g } = arena({ foe: false }); let t = 1000; ({ t } = run(g, t, 1100));
  g.castSpell('aegis'); const p = g.player;
  g.projectiles.push({ id: 'enemy-shot-x', x: p.x + .5 + 1.2, y: p.y + .42, dx: -1, dy: 0, speed: 4.2, life: 2.4, damage: 25, hostile: true, hits: {}, path: 'straight' });
  const r = run(g, t, t + 400);
  assert.ok(g.parryFlashAt > 0, 'parried'); assert.equal(g.player.hp, 100, 'negated');
  assert.equal(cds(g)['spell:aegis'], 0); assert.ok(g.powerAegisUntil > r.t);
  assert.equal(g.projectiles.filter((q) => q.hostile === false || q.reflectedBy).length, 0, 'not reflected');
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
