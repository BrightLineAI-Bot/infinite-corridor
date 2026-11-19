// Encumbered (Tim, 2026-11-19; src/hit-cast-passives.ts ENCUMBERED): damage a pull deals builds a meter on every creature (bosses
// and the unmovable too); at its threshold the creature takes 5% more and deals 5% less for 10 s, then the meter starts again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { ENCUMBERED, ARCANE_EDGE, encumberThreshold, encumberedLeft, pullMeterOf, passiveMarkOf, foeDealtScale, vulnScale, tickHitCastPassives } from '../src/hit-cast-passives.ts';
import { staggerClass } from '../src/monster-pack.ts';
import { QUANDRIX_STAFF } from '../src/items.ts';
import { QUANDRIX } from '../src/quandrix-staff.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { glyphHit } from '../src/glyphs.ts';

const DT = 1 / 60;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function arena({ foes = [[12, 10]], extra = {}, nodes = [] } = {}) {
  const s = freshSave(); s.seed = 'ENCUMBERED'; s.perception.aperture = 900;
  for (const id of nodes) s.constellation.mods[id] = true;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 1000, stamina: 0 }); s.maxHp = 1000; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 2000, maxHp: 2000, damage: 0, cooldown: 99, speed: 0 }, extra));
  return { s, g, e: g.enemies[0] };
}
const well = (g, x, y, damage) => g.effects.push({ id: `gw-${g.effects.length}`, kind: 'gravity-well', x, y, radius: 3, life: 30, pulse: .7, untilPulse: 0, damage, hits: {} });

test('pull damage builds the meter on an unpullable boss (a Gravity Well), and it procs at the threshold', () => {
  const { g, e } = arena({ extra: { boss: true, name: 'The Test Warden' } });
  const cls = staggerClass(e); assert.equal(cls, 'boss');
  const th = encumberThreshold(e, cls); assert.equal(th, 2000 * ENCUMBERED.threshold.share * ENCUMBERED.threshold.factor.boss);
  assert.ok(encumberThreshold(createCombatant('rootBrute', 0, 0), null) > encumberThreshold({ maxHp: 1 }, null) - 1, 'ordinary: no factor');
  assert.ok(encumberThreshold({ maxHp: 10 }, null) >= ENCUMBERED.threshold.min, 'never under the floor');
  well(g, e.x + .5, e.y + .45, 20); let t = 1000;
  for (let i = 0; i < 60; i++) { t += 1000 * DT; g.update(DT, idle, t); }
  const r = passiveMarkOf(e); assert.ok(r.pull > 0, `the meter filled (${r.pull})`); assert.ok(pullMeterOf(e) > 0 && pullMeterOf(e) < 1); assert.equal(encumberedLeft(e), 0);
  // the same damage that does not pull fills nothing
  const { g: g2, e: e2 } = arena({ extra: { boss: true } }); g2.effects.push({ id: 'blast', kind: 'ember-ring', x: e2.x + .5, y: e2.y + .45, radius: 3, life: 30, pulse: .7, untilPulse: 0, damage: 20, hits: {} });
  for (let i = 0; i < 60; i++) g2.update(DT, idle, 1000 + i * 1000 * DT); assert.equal(passiveMarkOf(e2)?.pull || 0, 0, 'a pulse that does not pull builds nothing');
  // drive it to the threshold through the hook a pull calls
  g.message = ''; assert.equal(g.pullBuild(e, th, t), true, 'procs at the threshold');
  assert.equal(encumberedLeft(e), ENCUMBERED.durationMs / 1000); assert.equal(passiveMarkOf(e).pull, 0, 'the meter resets');
  assert.match(g.message, /Encumbered/, 'a message the first time on a boss');
  g.message = ''; assert.equal(g.pullBuild(e, th * 5, t), false, 'nothing builds while Encumbered'); assert.equal(passiveMarkOf(e).pull, 0);
});

test('Encumbered: +5% taken from every source, -5% dealt; expires after 10 s; the meter starts again from 0', () => {
  const { g, e } = arena({ extra: { boss: true } }); const { g: g0, e: e0 } = arena({ extra: { boss: true } }); let t = 1000;
  g.pullBuild(e, 1e6, t); assert.ok(encumberedLeft(e) > 0);
  assert.equal(vulnScale(e, t), ENCUMBERED.takenMul); assert.equal(vulnScale(e0, t), 1);
  // a hit: the extra share straight to health (as Tempo's window)
  const b = e.hp; g.landHit(e, 200, t, 'melee'); assert.equal(b - e.hp, Math.round(200 * (ENCUMBERED.takenMul - 1)), 'a hit: +5%');
  const b0 = e0.hp; g0.landHit(e0, 200, t, 'melee'); assert.equal(b0 - e0.hp, 0);
  // a proc
  const p1 = e.hp; g.glyphWorld(t).damage(e, 400); const p0 = e0.hp; g0.glyphWorld(t).damage(e0, 400);
  assert.ok(Math.abs((p1 - e.hp) - (p0 - e0.hp) * ENCUMBERED.takenMul) <= 1, `a proc: x${ENCUMBERED.takenMul} (${p1 - e.hp} vs ${p0 - e0.hp})`);
  // its blows
  assert.equal(foeDealtScale(e), ENCUMBERED.dealtMul); assert.equal(foeDealtScale(e0), 1);
  g.player.hp = 1000; g0.player.hp = 1000; g.packHurt(e, 300, {}, t); g0.packHurt(e0, 300, {}, t);
  const hurt = 1000 - g.player.hp, hurt0 = 1000 - g0.player.hp; assert.ok(hurt < hurt0 && Math.abs(hurt - hurt0 * ENCUMBERED.dealtMul) <= 1.5, `deals 5% less (${hurt} vs ${hurt0})`);
  // expiry: frame time, 10 s
  for (let i = 0; i < 9; i++) tickHitCastPassives(g, 1, t += 1000); assert.ok(encumberedLeft(e) > 0, 'still at 9 s');
  tickHitCastPassives(g, 1.01, t += 1010); assert.equal(encumberedLeft(e), 0, 'over at 10 s'); assert.equal(vulnScale(e, t), 1); assert.equal(foeDealtScale(e), 1);
  assert.equal(passiveMarkOf(e).pull, 0, 'the meter is empty');
  g.pullBuild(e, 10, t); assert.equal(passiveMarkOf(e).pull, 10 * ENCUMBERED.gain, 'and builds again');
});

test('the meter decays only after a few seconds without pull damage', () => {
  const { g, e } = arena(); let t = 1000; const th = encumberThreshold(e, staggerClass(e));
  g.pullBuild(e, th * .5, t); const full = passiveMarkOf(e).pull;
  tickHitCastPassives(g, ENCUMBERED.decayDelayMs / 1000 - .1, t += 2900); assert.equal(passiveMarkOf(e).pull, full, 'held through the delay');
  tickHitCastPassives(g, .1, t += 100); tickHitCastPassives(g, 1, t += 1000);
  assert.ok(Math.abs(passiveMarkOf(e).pull - (full - th * ENCUMBERED.decayPerSec * 1.1)) < 1e-6, 'then drains at decayPerSec of the threshold');
  g.pullBuild(e, 1, t); tickHitCastPassives(g, 1, t += 1000); const kept = passiveMarkOf(e).pull; tickHitCastPassives(g, 1, t += 1000); assert.equal(passiveMarkOf(e).pull, kept, 'a new pull resets the delay');
  for (let i = 0; i < 40; i++) tickHitCastPassives(g, 1, t += 1000); assert.equal(passiveMarkOf(e).pull, 0, 'never below 0');
});

test('pull sources: Arcane Edge Rift on a foe that holds, Tether spell pulses, Mage\'s Hand-style blows; an ordinary foe procs in a few seconds', () => {
  // Arcane Edge (Rift): a boss is never moved, its meter still builds from the hit
  const { g, e } = arena({ nodes: ['arcane-edge'], extra: { boss: true } }); const x0 = e.x;
  g.passiveCast(1000); g._hcp.edge.el = 'rift'; g.landHit(e, 100, 1100, 'melee');
  assert.equal(e.x, x0, 'held its ground'); assert.ok(passiveMarkOf(e).pull >= 100, 'the Rift touch counted');
  // Tether in a spell: a pulse that is not itself a pull counts once; a Gravity Well's own pulse with Tether is not counted twice
  const { g: g2, e: e2 } = arena(); const w = g2.glyphWorld(1000); w.pull(e2, 30); assert.equal(passiveMarkOf(e2).pull, 30);
  // an ordinary foe (300 health) in a Gravity Well of a middling Focus (20 a pulse) procs within a few seconds
  const { g: g3, e: e3 } = arena({ extra: { hp: 300, maxHp: 300 } }); well(g3, e3.x + .5, e3.y + .45, 20); let t = 1000, at = null;
  for (let i = 0; i < 600 && at === null; i++) { t += 1000 * DT; g3.update(DT, idle, t); if (encumberedLeft(e3) > 0) at = (t - 1000) / 1000; }
  assert.ok(at !== null && at < 6, `procs in ${at} s`);
  assert.equal(ARCANE_EDGE.rift.pull > 0, true);
});

test('stress: pulls every frame on many foes for 60 s: bounded, no NaN', () => {
  const foes = Array.from({ length: 12 }, (_, i) => [8 + (i % 4) * 2, 8 + Math.floor(i / 4) * 2]);
  const { g } = arena({ foes, extra: { hp: 1e7, maxHp: 1e7 } }); let t = 1000;
  for (let f = 0; f < 3600; f++) { t += 1000 * DT; for (const e of g.enemies) g.pullBuild(e, (f % 3) * 50, t); tickHitCastPassives(g, DT, t); }
  for (const e of g.enemies) { const r = passiveMarkOf(e); assert.ok(Number.isFinite(r.pull) && r.pull >= 0 && Number.isFinite(r.enc) && r.enc >= 0); assert.ok(Number.isFinite(vulnScale(e, t))); }
});

// Mage's Hand (quandrix-staff.ts), set up as tests/quandrix-staff.test.ts does: the fist's burst is a pull's damage, on a boss it
// never grabs too; a plain staff's hand is no pull.
function staffArena(foes, mageHand) {
  const s = freshSave(); s.seed = 'QUANDRIX'; s.level = 15; s.stats = { ...s.stats, Might: 1, Finesse: 1, Focus: 11, Vigor: 5, Resolve: 1 };
  s.equipment.primary = { id: 'primary-qs-test', name: QUANDRIX_STAFF.name, slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [] };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); if (mageHand) s.lattice.passives = [`field:${QUANDRIX.passive}`];
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  return g;
}
function staffRun(g, from, to, held) { let t = from; for (; t < to; t += 20) { g.player.invulnerableUntil = t + 1e6; g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held(t) }, t); } return t; }
const press = (g, t) => { g.attackAction = 'attack'; try { return g.primaryAttack(t, { x: 1, y: 0 }); } finally { g.attackAction = null; } };

test('Mage\'s Hand: the fist\'s burst fills the meter of a boss it cannot grab; a plain hand builds nothing', () => {
  const g = staffArena([[2.4, 0, { boss: true }]], true), e = g.enemies[0], x0 = e.x; let t = 1000;
  press(g, t); t = staffRun(g, t, t + 40, () => false); t = staffRun(g, t, t + 400, () => false);
  assert.equal(passiveMarkOf(e)?.pull || 0, 0, 'the drifting hand is no pull');
  g.player.attackReadyAt = 0; press(g, t); t = staffRun(g, t, t + 220 + QUANDRIX.fist.time * 1000 + 100, () => true);
  assert.equal(g.quandrix.hold.on, false, 'burst'); assert.ok(Math.abs(e.x - x0) < .05, 'the boss held its ground');
  assert.ok(passiveMarkOf(e)?.pull > 0, `its meter filled (${passiveMarkOf(e)?.pull})`);
  const g2 = staffArena([[2.4, 0, { boss: true }]], false), e2 = g2.enemies[0]; t = 1000; press(g2, t); t = staffRun(g2, t, t + 40, () => false); t = staffRun(g2, t, t + 1200, () => false);
  assert.ok(e2.hp < 1e6, 'struck'); assert.equal(passiveMarkOf(e2)?.pull || 0, 0, 'a plain hand builds nothing');
});

test('Tether in a spell: a pulse counts its damage; a pulse that already pulls (the Gravity Well) is not counted twice', () => {
  const { g, e } = arena(); const L = { host: 'spell', has: (k) => k === 'tether', resonant: () => false, count: () => 1 };
  glyphHit(g.glyphWorld(1000), L, e, 40, { origin: { x: e.x + 2, y: e.y } }); assert.equal(passiveMarkOf(e).pull, 40);
  glyphHit(g.glyphWorld(1000), L, e, 40, { origin: { x: e.x + 2, y: e.y }, pulled: true }); assert.equal(passiveMarkOf(e).pull, 40, 'counted once');
  const melee = { ...L, host: 'melee' }; const { g: g2, e: e2 } = arena(); glyphHit(g2.glyphWorld(1000), melee, e2, 40, {}); assert.equal(passiveMarkOf(e2)?.pull || 0, 0, 'a weapon Tether slows, it does not pull');
});
