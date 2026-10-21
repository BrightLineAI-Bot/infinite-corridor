import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTRAL, ASTRAL_ALLY_FOCUS, createAstralState, startAstralMove, updateAstralActor } from '../src/astral-worm.ts';
import { ASTRAL_RIDER, tickAstralRiderChoice, mountAstralWalker } from '../src/astral-worm-mount.ts';
import { ASTRAL_WALKER_ALLY, updateAstralWalkerAllyFixture, tickPackEffects } from '../src/monster-pack.ts';
import { worldBeastPatience, WORLD_BEASTS } from '../src/world-beasts.ts';
import { astralCompanionFor } from '../src/astral-encounters.ts';
import { createCombatant } from '../src/combat.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
const frame = 1 / 60;

function arena() {
  const save = freshSave(); save.seed = 'ASTRAL-PAIR-RULES'; save.maxHp = 10000;
  const g = new Game(save, 0), width = 32;
  save.session.activeDungeonId = 'dungeon:ASTRAL-PAIR-RULES:g1:5:5:rules';
  const map = { width, height: width, entry: { x: 3, y: 3 }, objects: [], enemySpawns: [], tiles: Array.from({ length: width * width }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'floor', blocked: false, elev: 0 })) };
  Object.assign(g, { area: 'dungeon', rx: 5, ry: 5, map, enemies: [], effects: [], projectiles: [], packEffects: [], paused: false, seaHazards: null, storm: null });
  Object.assign(g.player, { x: 24, y: 24, hp: 10000, invulnerableUntil: 0, dodgeUntil: 0 });
  const worm = createCombatant('astralWorm', 10, 10, false, []); Object.assign(worm, { id: 'worm', astralMountFixture: true, aggro: true, hp: 1400, maxHp: 1400, damage: 60 });
  worm.astral = createAstralState({ x: worm.x, y: worm.y, hp: worm.maxHp, damage: worm.damage, namespace: worm.id });
  const ally = createCombatant('voidWalker', 10, 10, false, []); Object.assign(ally, { id: 'ally', astralAllyOf: worm.id, hp: 400, maxHp: 400 });
  g.enemies = [worm, ally];
  return { g, worm, ally };
}

test('hostile rider: stays on most of the time, sometimes gets off or leaves, deterministically and never as an ally', () => {
  const rider = { astralMount: { status: 'mounted' } }, seen = new Set();
  assert.equal(tickAstralRiderChoice(rider, ASTRAL_RIDER.decideEvery - .01, () => .99), 'stay', 'no decision before the interval');
  for (const [r, want] of [[.1, 'stay'], [ASTRAL_RIDER.stay + .01, 'dismount'], [.99, 'leave']]) {
    const m = { astralMount: { status: 'mounted' } }; seen.add(tickAstralRiderChoice(m, ASTRAL_RIDER.decideEvery, () => r)); assert.equal(tickAstralRiderChoice({ astralMount: { status: 'mounted' } }, ASTRAL_RIDER.decideEvery, () => r), want);
  }
  assert.deepEqual([...seen].sort(), ['dismount', 'leave', 'stay']);
  assert.equal(tickAstralRiderChoice({ astralAllyOf: 'w', astralMount: { status: 'mounted' } }, 99, () => .99), 'stay');
  assert.equal(tickAstralRiderChoice(rider, 99, () => .99, { paused: true }), 'stay');
  assert(Math.abs(ASTRAL_RIDER.stay + ASTRAL_RIDER.dismount + ASTRAL_RIDER.leave - 1) < 1e-12);
});

test('a helping Walker never rides the Worm', () => {
  const { worm, ally } = arena();
  assert.equal(mountAstralWalker(worm, ally, { alignment: 'hostile' }), false);
});

test('a joined hostile Walker shares the tries already spent and stays until killed unless he chose to leave', () => {
  const save = freshSave(); save.seed = 'PAIR-TRIES';
  save.worldBeasts.astralWorm.active = { rx: 3, ry: 4, tries: 1 };
  const scene = { rx: 3, ry: 4 }, main = { id: 'world-beast:astralWorm:0', worldBeast: 'astralWorm', x: 10, y: 10 };
  let hostile = null;
  for (let cycle = 0; cycle < 400 && !hostile; cycle++) {
    save.worldBeasts.astralWorm.cycle = cycle; delete save.worldBeasts.astralWorm.active.astralPair; save.worldBeasts.voidWalker.active = null; save.worldBeasts.voidWalker.cooldown = 0;
    astralCompanionFor(save, main, scene, 0);
    if (save.worldBeasts.astralWorm.active.astralPair.alignment === 'hostile') hostile = save.worldBeasts.voidWalker.active;
  }
  assert(hostile, 'a hostile pairing occurs for some cycle');
  assert.equal(hostile.tries, 1, 'counting from the first monster met'); assert.equal(hostile.astralJoined, true);
  assert.equal(worldBeastPatience(save, 'voidWalker', WORLD_BEASTS.voidWalker.patience * 2), false, 'no patience retreat once joined');
  hostile.astralLeave = true;
  assert.equal(worldBeastPatience(save, 'voidWalker', .01), true, 'leaves when he chooses to');
});

test('free-for-all: a helping Walker\'s attacks also strike the player where they pass', () => {
  const owner = { id: 'ally', kind: 'voidWalker', hp: 10, x: 0, y: 0 }, toWorm = [], toPlayer = [];
  const w = { dt: .05, now: 0, player: { x: 20, y: 20 }, enemies: [owner], hurt: (...a) => toWorm.push(a), slow() {}, pull() {},
    bystander: { actor: { x: 4, y: 4 }, hurt: (...a) => toPlayer.push(a) } };
  const fx = [{ kind: 'voidRend', variant: 'hand', owner: 'ally', x: 4, y: 4, radius: .5, damage: 9, arming: 0, life: 1 },
    { kind: 'voidHorizon', owner: 'ally', x: 4, y: 4, radius: 2, coreRadius: .5, damage: 3, arming: 0, life: 2, elapsed: 0 }];
  for (let i = 0; i < 4; i++) tickPackEffects(fx, w);
  assert.equal(toWorm.length, 0);
  assert(toPlayer.some(a => a[2].source === 'voidHand'), 'the hand slam lands on the player');
  assert.equal(toPlayer.filter(a => a[2].source === 'voidHand').length, 1, 'one-shot');
  assert(toPlayer.some(a => a[2].source === 'voidHorizon'));
});

test('the player can hit a helping Walker, and he leaves after losing half his health', () => {
  const { g, worm, ally } = arena(), w = g.packWorld(.05, 1000);
  updateAstralWalkerAllyFixture(ally, worm, w);
  assert.equal(ally.untargetable, false, 'the player\'s blows land on him');
  ally.hp = ally.maxHp * (1 - ASTRAL_WALKER_ALLY.leaveShare);
  updateAstralWalkerAllyFixture(ally, worm, w);
  assert.equal(ally.astralAllyLeaving, 1); assert.equal(ally.untargetable, true); assert.equal(ally.dead, false);
  for (let i = 0; i < 40 && !ally.dead; i++) updateAstralWalkerAllyFixture(ally, worm, g.packWorld(.05, 1000 + i * 50));
  assert.equal(ally.dead, true); assert.equal(ally.noRewards, true);
});

test('the Worm mostly hunts the player but turns on a helping Walker from time to time, and hurts him in its hazards', () => {
  const { g, worm, ally } = arena(); let allyFocus = 0, playerFocus = 0;
  const s = worm.astral;
  for (let i = 0; i < 60 * 120; i++) {
    updateAstralActor(worm, g.packWorld(frame, (i + 1) * 1000 * frame));
    if (s.focusAlly) allyFocus++; else playerFocus++;
    ally.hp = ally.maxHp; ally.dead = false; g.player.hp = 10000;
  }
  assert(allyFocus > 0, 'sometimes on the ally'); assert(playerFocus > allyFocus, 'mostly on the player');
  assert(ASTRAL_ALLY_FOCUS.allyShare < .5);
  // Caught in an active pool while the Worm focuses the player: the ally still takes damage.
  const fresh = arena(); fresh.worm.astral.focusAlly = false; fresh.worm.astral.focusClock = 99;
  startAstralMove(fresh.worm.astral, 'pool', fresh.g.player);
  const before = fresh.ally.hp;
  for (let i = 0; i < 60 * 2; i++) updateAstralActor(fresh.worm, fresh.g.packWorld(frame, (i + 1) * 1000 * frame));
  assert(fresh.ally.hp < before, 'bystander ally hurt by the pool');
  assert(ASTRAL.poolRadius > 0);
});

test('a rider on a retreating Worm rides it away and leaves with it; his hunt ends as an escape', async () => {
  const { syncAstralMount } = await import('../src/astral-worm-mount.ts');
  const { g, worm } = arena();
  const rider = createCombatant('voidWalker', 10, 10, false, []); Object.assign(rider, { id: 'world-beast:voidWalker:0', worldBeast: 'voidWalker', hp: 400, maxHp: 400 });
  g.enemies = [worm, rider]; g.save.worldBeasts.voidWalker.active = { rx: 5, ry: 5, tries: 1, astralJoined: true };
  assert.equal(mountAstralWalker(worm, rider, g.astralMountHost()), true);
  worm.retreating = true; g.syncAstralRiders();
  assert.equal(rider.astralMount.status, 'mounted'); assert.equal(rider.untargetable, true);
  worm.x += 2; g.syncAstralRiders(); assert.equal(rider.x, worm.x, 'carried along');
  assert.equal(tickAstralRiderChoice(rider, 999, () => .99), 'stay', 'no decisions while riding away');
  const escaped = g.save.worldBeasts.voidWalker.escaped;
  g.astralRiderLeavesWith(worm);
  assert.equal(rider.dead, true); assert.equal(rider.noRewards, true);
  assert.equal(g.save.worldBeasts.voidWalker.active, null); assert.equal(g.save.worldBeasts.voidWalker.escaped, escaped + 1);
  void syncAstralMount;
});

test('a Walker fighting on foot keeps fighting after the Worm is gone, until he chooses to leave', async () => {
  const { ASTRAL_FIGHTER, tickAstralFighterChoice } = await import('../src/astral-worm-mount.ts');
  const q = { astralJoined: true, tries: 1 };
  assert.equal(tickAstralFighterChoice(q, ASTRAL_FIGHTER.decideEvery - .01, () => 0), false);
  assert.equal(tickAstralFighterChoice(q, .01, () => .99), false, 'decides to stay');
  assert.equal(tickAstralFighterChoice(q, ASTRAL_FIGHTER.decideEvery, () => 0), true, 'decides to leave');
  assert.equal(tickAstralFighterChoice({ tries: 0 }, 999, () => 0), false, 'only a Walker that joined an Astral fight');
  assert.equal(tickAstralFighterChoice({ astralJoined: true, retreat: {} }, 999, () => 0), false);
});

test('in the game loop, a joined Walker on foot (never seated or dismounted) gets his leave rolls; a seated one does not', async () => {
  const { ASTRAL_FIGHTER } = await import('../src/astral-worm-mount.ts');
  for (const status of [undefined, 'dismounted', 'mounted']) {
    const { g, worm } = arena();
    const walker = createCombatant('voidWalker', 4, 4, true, []); Object.assign(walker, { id: 'world-beast:voidWalker:0', worldBeast: 'voidWalker', hp: 400, maxHp: 400, aggro: true });
    if (status === 'mounted') { Object.assign(walker, { x: worm.x, y: worm.y }); assert.equal(mountAstralWalker(worm, walker, g.astralMountHost()), true); }
    else if (status) walker.astralMount = { status, ownerId: worm.id, reason: 'dismount' };
    g.enemies = [worm, walker]; g.save.worldBeasts.voidWalker.active = { rx: 5, ry: 5, tries: 0, astralJoined: true };
    const q = g.save.worldBeasts.voidWalker.active, input = { state: { x: 0, y: 0 }, consume: () => false };
    for (let i = 0, now = 1000; i < Math.ceil(ASTRAL_FIGHTER.decideEvery / .05) + 4; i++) { g.update(.05, input, now += 50); g.player.hp = 10000; if (walker.dead) break; }
    if (status === 'mounted') assert.equal(q.fightDecisions ?? 0, 0, 'seated: rider choices apply instead');
    else assert.equal(q.fightDecisions, 1, `${status ?? 'never seated'}: one leave roll after the interval`);
  }
});
