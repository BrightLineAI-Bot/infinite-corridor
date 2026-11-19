// Encumbered tiers and the softer rift void line (Tim, 2026-11-19; src/hit-cast-passives.ts ENCUMBERED.tiers, RIFT_MINE.lineScale).
// Each proc raises the creature's tier: the first is easiest, the second needs more, the third and later the most (the tier stops),
// by the same pick as the freeze's `need` and a boss's poise `hits`; a quiet spell of the freeze's `calm` drops it a tier. The rift void's line strikes softer than its triangle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { BRANCHES, learnRank, learnMod, chooseCap } from '../src/constellation.ts';
import { BOSS_POISE, staggerClass } from '../src/monster-pack.ts';
import { SWEEP_FREEZE } from '../src/great-sweep.ts';
import { ENCUMBERED, GLYPH_MINE, RIFT_MINE, encumberThreshold, encumberTierOf, encumberTierScale, encumberedLeft, passiveMarkOf, riftVoidOf, tickHitCastPassives } from '../src/hit-cast-passives.ts';

function arena(extra = {}) {
  const s = freshSave(); s.seed = 'ENC-TIERS'; s.perception.aperture = 900;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, hp: 1000 }); s.maxHp = 1000;
  g.enemies = [[12, 10], [14, 10]].map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 2000, maxHp: 2000, damage: 0, cooldown: 99, speed: 0 }, extra));
  return { g, e: g.enemies[0], other: g.enemies[1] };
}
// Pull damage in steps of 1 until it procs: the amount it took.
function procCost(g, e, t) { let n = 0; while (!g.pullBuild(e, 1, t)) { n++; if (n > 1e5) throw new Error('never procs'); } return n + 1; }
const expire = (g, t) => tickHitCastPassives(g, ENCUMBERED.durationMs / 1000 + .01, t);

test('the tier table: three entries, rising, the last held; it mirrors the boss poise tiers', () => {
  const T = ENCUMBERED.tiers; assert.equal(T.length, 3); assert.equal(T[0], 1); assert.ok(T[0] < T[1] && T[1] < T[2]);
  assert.deepEqual(T, BOSS_POISE.default.hits.map((h) => h / BOSS_POISE.default.hits[0]), 'BOSS_POISE.default.hits over its first');
  assert.equal(SWEEP_FREEZE.classes.boss.need.length, T.length, 'as many tiers as the freeze');
  assert.equal(encumberTierScale(0), T[0]); assert.equal(encumberTierScale(1), T[1]); assert.equal(encumberTierScale(2), T[2]); assert.equal(encumberTierScale(9), T[2]);
  assert.equal(encumberTierScale(NaN), T[0]);
});

for (const [label, extra] of [['a boss', { boss: true }], ['an ordinary foe', {}]]) {
  test(`${label}: the first proc easiest, the second harder, the third and later at the highest tier; per creature`, () => {
    const { g, e, other } = arena(extra), cls = staggerClass(e); let t = 1000;
    const base = encumberThreshold(e, cls), costs = [];
    for (let k = 0; k < 5; k++) { assert.equal(encumberTierOf(e), Math.min(2, k)); costs.push(procCost(g, e, t)); assert.ok(encumberedLeft(e) > 0); expire(g, t += 11000); }
    const want = [0, 1, 2, 2, 2].map((k) => Math.ceil(base * ENCUMBERED.tiers[k] - 1e-9));
    assert.deepEqual(costs, want, `costs ${costs} (base ${base})`);
    assert.ok(costs[1] > costs[0] && costs[2] > costs[1] && costs[3] === costs[2] && costs[4] === costs[2]);
    assert.equal(encumberTierOf(e), 2, 'held at the top');
    // another creature starts at the first tier
    assert.equal(encumberTierOf(other), 0); assert.equal(procCost(g, other, t), costs[0]);
    // runtime only: the mark is not enumerable, so never saved with the foe
    assert.ok(!Object.keys(e).some((k) => /tier/i.test(k) && k !== 'visualTier')); assert.equal(passiveMarkOf(e).tier, 2);
  });
}

test('the tier calms down as the freeze\'s does: one tier after its class\'s quiet spell, not before; a proc restarts the count', () => {
  for (const [extra, cls] of [[{ boss: true }, 'boss'], [{}, 'ordinary'], [{ eliteId: 'test-elite' }, 'elite']]) {
    const { g, e } = arena(extra); let t = 1000; assert.equal(staggerClass(e) || 'ordinary', cls);
    const calm = SWEEP_FREEZE.classes[cls].calm;
    procCost(g, e, t); expire(g, t += 11000); procCost(g, e, t); expire(g, t += 11000); assert.equal(encumberTierOf(e), 2);
    tickHitCastPassives(g, calm - .05, t += 1000 * (calm - .05)); assert.equal(encumberTierOf(e), 2, `${cls}: not before ${calm} s`);
    tickHitCastPassives(g, .1, t += 100); assert.equal(encumberTierOf(e), 1, `${cls}: one tier after ${calm} s`);
    // building the meter does not stop the count; a proc does
    g.pullBuild(e, 1, t); tickHitCastPassives(g, calm - .05, t += 1000 * (calm - .05)); assert.equal(encumberTierOf(e), 1);
    tickHitCastPassives(g, .1, t += 100); assert.equal(encumberTierOf(e), 0, `${cls}: back to the first tier`);
    assert.equal(procCost(g, e, t), Math.ceil(encumberThreshold(e, staggerClass(e), 0) - 1e-9), 'the first tier\'s cost again');
    // while Encumbered nothing calms: the whole 10 s pass, the tier holds
    tickHitCastPassives(g, 9.9, t += 9900); assert.equal(encumberTierOf(e), 1, `${cls}: no calm while Encumbered`);
  }
});

// Glyph Mine × Rift Step, as tests/rift-mines.test.ts sets it up.
function riftArena(fold) {
  const s = freshSave(); s.seed = 'RIFT-LINE'; s.perception.aperture = 900;
  for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift');
  if (fold) { learnMod(s, 'rift'); chooseCap(s, 'rift', 'fold'); }
  s.constellation.mods['glyph-mine'] = true;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 6, y: 6, hp: 100 }); s.maxHp = 100; g.enemies = []; g.lastUpdateNow = 1000;
  return g;
}

test('the rift void: a line strikes lineScale of the triangle\'s tick; the triangle is unchanged', () => {
  assert.equal(RIFT_MINE.lineScale, .6); assert.ok(RIFT_MINE.lineScale > 0 && RIFT_MINE.lineScale < 1);
  const line = riftArena(false); line.player.lastMoveVector = { x: 1, y: 0 }; assert.equal(line.activateApertureSkill('rift-step'), true);
  const tri = riftArena(true); tri.player.lastMoveVector = { x: 1, y: 0 }; tri.activateApertureSkill('rift-step'); tri.player.lastMoveVector = { x: 0, y: 1 }; tri.activateApertureSkill('rift-step');
  const L = riftVoidOf(line), T = riftVoidOf(tri); assert.equal(L.n, 2); assert.equal(T.n, 3);
  const power = Number(line.spellPower({ damage: GLYPH_MINE.power })) || GLYPH_MINE.power;
  assert.equal(T.dmg, Math.max(1, Math.round(power * RIFT_MINE.tickShare)), 'the triangle as before');
  assert.equal(L.dmg, Math.max(1, Math.round(power * RIFT_MINE.tickShare * RIFT_MINE.lineScale)), 'the line softer');
  assert.ok(L.dmg < T.dmg, `${L.dmg} < ${T.dmg}`);
});
