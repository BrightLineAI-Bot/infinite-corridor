// World-boss pacing (Tim, 2026-11-18: "I think he attacks too quickly. Maybe the monsters overall attack too quickly, so we need to
// slow them down — give their attacks more wind-up"). The roaming world beasts, the Questing Beast and the big-room beasts wind up
// WORLD_BOSS_PACE.windup times longer (on top of BOSS_PACE) and pause longer between attacks; the telegraph stretches with the windup
// and the blow lands as it fills; damage is unchanged; dungeon bosses, elites and ordinary creatures keep their timings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant } from '../src/combat.ts';
import { BOSS_PACE, WORLD_BOSS_PACE, worldBossPaced, bossPaced, packWindupScale, ATTACK_MODULES, freshPackState, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { WORLD_BOSS_PACE as KIT_PACE } from '../src/boss-kit.ts';
import { ASTRAL } from '../src/astral-worm.ts';
import { packActionPresentation } from '../src/actor-presentation.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';

// A headless arena: one creature, the Wayfarer standing `away` tiles to its east, every blow recorded (never fatal).
function duel(kind, flags, attack, { away = 3, seconds = 8, gap } = {}) {
  const w = { dt: 1 / 60, now: 0, area: 'overworld', bossPace: true, player: { x: 17, y: 12, hp: 1e9 }, enemies: [], fx: [], hurts: [],
    open: () => true, tileOpen: () => true, projectileOpen: () => true, los: () => true, move: () => true, slow() {}, shake() {},
    hurt(owner, amount) { w.hurts.push({ amount, t: w.t }); }, effects: () => w.fx, addEffect(f) { addPackEffect(w.fx, f, w.now); }, oceanAt: () => false };
  const e = createCombatant(kind, 13, 12, true, []);
  Object.assign(e, { id: `${kind}:pace`, aggro: true, evasive: false, hp: 1e7, maxHp: 1e7, damage: 40, speedMultiplier: 0, ...flags });
  if (gap !== undefined) e.attackGap = gap;
  e.pack = freshPackState(); e.pack.gap = 0; e.packAttacks = [attack]; e.packBossAttacks = []; w.enemies = [e];
  const out = { wind: null, teleTotal: null, teleFillAtStrike: null, gapAfter: null, hurts: w.hurts };
  let start = null; w.t = 0;
  for (; w.t < seconds; w.t += w.dt) {
    w.now += w.dt * 1000; w.player.x = e.x + away; w.player.y = e.y; w.player.hp = 1e9;
    const prev = e.pack.phase; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w);
    const s = e.pack;
    if (start == null && s.attack === attack && s.phase === 'windup') { start = w.t; out.scale = packWindupScale(s); if (s.tele?.total) out.teleTotal = s.tele.total; out.windStart = s.t; }
    if (start != null && out.wind == null && prev === 'windup' && s.phase !== 'windup') { out.wind = w.t - start; }
    if (start != null && out.wind != null && prev && !s.phase && out.gapAfter == null) { out.gapAfter = s.gap; break; }
  }
  return out;
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('one table, shared by the pack attacks and the Astral Worm; who is world-paced', () => {
  assert.deepEqual(WORLD_BOSS_PACE, { windup: 1.4, gap: 1.25, gapMin: .5 }); assert.equal(WORLD_BOSS_PACE, KIT_PACE);
  assert.ok(WORLD_BOSS_PACE.windup >= 1.35 && WORLD_BOSS_PACE.windup <= 1.5, 'Tim: about 1.35–1.5×');
  for (const e of [{ worldBeast: 'wildStego' }, { worldBeast: 'astralWorm' }, { questingBeast: true }, { stegoRoom: true }, { spinoRoom: true }, { spinoInterloper: 'x' }]) { assert.equal(worldBossPaced(e), true); assert.equal(bossPaced(e), true); }
  for (const e of [{ boss: true }, { dungeonRole: 'finalBoss' }, { gatePredator: true }, { stalker: true }, { elite: true }, { kind: 'ashling' }, null]) assert.equal(worldBossPaced(e), false);
  assert.equal(packWindupScale(null), 1); assert.equal(packWindupScale({}), 1, 'an unpaced world keeps the modules\' own timings');
  assert.equal(packWindupScale({ paced: true }), BOSS_PACE.windup); near(packWindupScale({ paced: true, worldPaced: true }), BOSS_PACE.windup * WORLD_BOSS_PACE.windup, 1e-12, 'stacked');
  near(ASTRAL.windup, .65 * WORLD_BOSS_PACE.windup, 1e-12, 'the Astral Worm winds up longer'); near(ASTRAL.recovery, .65 * WORLD_BOSS_PACE.gap, 1e-12, 'and rests longer between moves');
});

// [kind, flags of the world-paced creature, attack]: the Wild Stegosaurus and the Spinosaurus (roaming and in a big room), and three
// more roaming beasts.
const CASES = [
  ['wildStego', { worldBeast: 'wildStego' }, 'stegoTailSlam'],
  ['wildStego', { stegoRoom: true }, 'stegoPounce'],
  ['spinoRex', { worldBeast: 'spinoRex' }, 'spinoGrab'],
  ['spinoRex', { spinoRoom: true }, 'spinoGrab'],
  ['briarStag', { worldBeast: 'briarStag' }, 'stagMire'],
  ['mountainTurtle', { worldBeast: 'mountainTurtle' }, 'turtleComet'],
  ['lightningGiant', { worldBeast: 'lightningGiant' }, 'giantElectrify'],
];
for (const [kind, flags, attack] of CASES) test(`${kind} ${Object.keys(flags)[0]} ${attack}: the windup and its telegraph stretch together; the blow is the same`, () => {
  const before = duel(kind, { boss: true }, attack), after = duel(kind, flags, attack);
  assert.ok(before.wind && after.wind, 'both wound up and struck');
  const k = WORLD_BOSS_PACE.windup, base = ATTACK_MODULES[attack].windup;
  near(after.windStart, base * BOSS_PACE.windup * k, 1e-9, 'its clock'); near(after.wind / before.wind, k, .05, 'measured windup ratio');
  if (before.teleTotal != null) {
    // The mark fills (1 - t/total) exactly as the windup ends: the stretched part is the windup; extras after it (a comet's flight) are not stretched.
    near(after.teleTotal - after.windStart, before.teleTotal - before.windStart, 1e-9, 'telegraph and windup agree');
  }
  const dmg = (o) => o.hurts.length ? o.hurts[0].amount : null; assert.equal(dmg(after), dmg(before), 'damage unchanged');
});

test('the pause between attacks: longer, and never under gapMin, for world bosses only', () => {
  for (const [kind, id, attack] of [['wildStego', 'wildStego', 'stegoTailSlam'], ['briarStag', 'briarStag', 'stagMire']]) {
    const g = WORLD_BEASTS[id].attackGap, boss = duel(kind, { boss: true }, attack, { gap: g }), world = duel(kind, { worldBeast: id }, attack, { gap: g });
    near(boss.gapAfter, g * BOSS_PACE.gap, 1e-9, 'BOSS_PACE alone'); near(world.gapAfter, Math.max(WORLD_BOSS_PACE.gapMin, g * BOSS_PACE.gap * WORLD_BOSS_PACE.gap), 1e-9, 'world-paced');
    assert.ok(world.gapAfter > boss.gapAfter);
  }
});

test('ordinary creatures and dungeon bosses keep their timings', () => {
  const plain = duel('wildStego', { boss: false }, 'stegoTailSlam'), boss = duel('wildStego', { boss: true }, 'stegoTailSlam');
  near(plain.windStart, ATTACK_MODULES.stegoTailSlam.windup, 1e-9, 'an unpaced creature: the module\'s own windup');
  near(boss.windStart, ATTACK_MODULES.stegoTailSlam.windup * BOSS_PACE.windup, 1e-9, 'a dungeon boss: BOSS_PACE only');
});

test('presentation reads the same clock: halfway through the stretched windup the pose is halfway', () => {
  const T = ATTACK_MODULES.leapSlam.windup * BOSS_PACE.windup * WORLD_BOSS_PACE.windup;
  const a = packActionPresentation({ pack: { attack: 'leapSlam', phase: 'windup', t: T / 2, paced: true, worldPaced: true } }, ATTACK_MODULES, BOSS_PACE.windup);
  near(a.progress, .5, 1e-9, 'world-paced');
  const b = packActionPresentation({ pack: { attack: 'leapSlam', phase: 'windup', t: ATTACK_MODULES.leapSlam.windup * BOSS_PACE.windup / 2, paced: true } }, ATTACK_MODULES, BOSS_PACE.windup);
  near(b.progress, .5, 1e-9, 'BOSS_PACE only, as before');
});
