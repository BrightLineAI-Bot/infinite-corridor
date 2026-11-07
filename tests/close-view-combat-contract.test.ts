import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCombatant } from '../src/combat.ts';
import { updateEnemyAI } from '../src/game.ts';
import { ACTION_MOTION } from '../src/action-motion.ts';
import { ATTACK_MODULES, MONSTER_PACK_VERSION, updatePackMonster } from '../src/monster-pack.ts';
import { closeViewActorLift, closeViewMonsterAction } from '../src/close-view.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';

const floor = () => ({
  width: 16,
  height: 16,
  tiles: Array.from({ length: 256 }, (_, i) => ({ x: i % 16, y: Math.floor(i / 16), blocked: false })),
  objects: [],
});

test('the real ordinary enemy impact becomes native contact and keeps its committed direction', () => {
  const map = floor();
  const enemy = Object.assign(createCombatant('hollowMarshal', 5, 5), {
    telegraph: .01,
    meleePhase: { id: 'longReach', stage: 0, aim: { x: 1, y: 0 }, target: { x: 7, y: 5 } },
    attackAim: { x: 0, y: 1 },
  });

  const windup = closeViewMonsterAction(enemy, enemy.kind);
  assert.equal(windup.winding, true);
  assert.deepEqual(windup.aim, { x: 1, y: 0 }, 'native windup uses the committed melee aim, not movement facing');

  assert.equal(updateEnemyAI(enemy, { x: 7, y: 5 }, map, 16, .02, 100), true, 'the real producer resolves the hit');
  assert.equal(enemy.strike, .24);
  assert.equal(enemy.meleePhase, null);
  const contact = closeViewMonsterAction(enemy, enemy.kind);
  assert.equal(contact.attack, true, 'the post-impact strike countdown is a native attack');
  assert.equal(contact.amount, ACTION_MOTION.monsterContact, 'the first rendered frame is blade contact, not a new windup');
  assert.equal(contact.aim.dx, 1);
  assert.equal(contact.aim.dy, 0, 'strike geometry survives after meleePhase is cleared');

  updateEnemyAI(enemy, { x: 7, y: 5 }, map, 16, .12, 220);
  const recovery = closeViewMonsterAction(enemy, enemy.kind);
  assert.ok(recovery.amount > contact.amount && recovery.amount < 1, `recovery advances with the real countdown (${recovery.amount})`);
});

const packWorld = (enemy) => ({
  dt: 0,
  now: 1000,
  area: 'dungeon',
  player: { x: 8, y: 5, hp: 10, maxHp: 10 },
  enemies: [enemy],
  effects: [],
  open: () => true,
  tileOpen: () => true,
  los: () => true,
  move: () => true,
  hurt() {},
  addEffect() {},
});

const crawler = (attack, phase, t, data) => {
  const enemy = Object.assign(createCombatant('pallidCrawler', 5, 5), { packKind: true, aggro: true });
  enemy.pack = { v: MONSTER_PACK_VERSION, state: 'attack', attack, phase, t, seq: 4, data, hitOnce: false, cd: {}, gap: 0 };
  return enemy;
};

test('real crawler bite and leap transitions preserve exact mid-phase native timing', () => {
  const bite = crawler('bite', 'windup', .01, { aim: { x: 1, y: 0 }, target: { x: 8, y: 5 } });
  const biteWorld = packWorld(bite); biteWorld.dt = .02;
  updatePackMonster(bite, biteWorld);
  assert.equal(bite.pack.phase, 'recover');
  assert.equal(bite.pack.t, ATTACK_MODULES.bite.recover);
  assert.equal(closeViewMonsterAction(bite, bite.kind).amount, ACTION_MOTION.monsterContact);
  bite.pack.t = ATTACK_MODULES.bite.recover / 2;
  const biteMid = closeViewMonsterAction(bite, bite.kind);
  assert.equal(biteMid.amount, ACTION_MOTION.monsterContact + (1 - ACTION_MOTION.monsterContact) / 2,
    'first admission halfway through recovery does not restart at contact');

  const leap = crawler('leapSlam', 'windup', .01, { aim: { x: 1, y: 0 }, target: { x: 8, y: 5 } });
  const leapWorld = packWorld(leap); leapWorld.dt = .02;
  updatePackMonster(leap, leapWorld);
  assert.equal(leap.pack.phase, 'active');
  assert.equal(closeViewMonsterAction(leap, leap.kind).attack, false, 'takeoff is flight, not a landing strike');
  leapWorld.dt = ATTACK_MODULES.leapSlam.active / 2;
  updatePackMonster(leap, leapWorld);
  const flight = closeViewMonsterAction(leap, leap.kind);
  assert.equal(flight.leapAmount, .5);
  assert.ok(Math.abs(leap.hopLift - .9) < 1e-12, `the real producer reaches its apex (${leap.hopLift})`);
  leapWorld.dt = ATTACK_MODULES.leapSlam.active / 2;
  updatePackMonster(leap, leapWorld);
  const landing = closeViewMonsterAction(leap, leap.kind);
  assert.equal(leap.pack.phase, 'recover');
  assert.equal(leap.hopLift, 0);
  assert.equal(landing.attack, true);
  assert.equal(landing.amount, ACTION_MOTION.monsterContact);
});

const crawlerZ = (z) => {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
  const end = writeCloseViewModel(out, 0, { kind: 'pallidCrawler', x: 0, y: 0, z, yaw: 0, phase: 0, pace: 0, pose: 'jump', amount: .5, turn: 0, reduceMotion: false });
  let low = Infinity, high = -Infinity;
  for (let i = 2; i < end; i += MODEL_FLOATS) { low = Math.min(low, out[i]); high = Math.max(high, out[i]); }
  return { low, high, end };
};

test('native crawler support takes the full apex lift without moving the sprite billboard', () => {
  const floorPose = crawlerZ(0), apex = crawlerZ(.9), landing = crawlerZ(0);
  assert.ok(Math.abs(apex.low - floorPose.low - .9) < 1e-6);
  assert.ok(Math.abs(apex.high - floorPose.high - .9) < 1e-6);
  assert.deepEqual(landing, floorPose, 'landing returns exactly to the terrain support height');
  assert.equal(apex.end, floorPose.end, 'the fixed model buffer/draw budget is unchanged');
  const captured = { nativeLift: .9 };
  assert.equal(closeViewActorLift(captured), 0, 'the sprite billboard stays at its authored projection');
  assert.equal(closeViewActorLift(captured, true), .9, 'the native support receives the full hop height');

  const renderer = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  const closeView = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(renderer, /nativeLift: Math\.max\(0, Number\(e\.hopLift\) \|\| 0\)/,
    'renderer capture provides full lift only to native presentation');
  assert.doesNotMatch(renderer, /jumpLift:\s*Math\.max\(0, Number\(e\.hopLift\)/,
    'captured sprite projection is not lifted a second time');
  assert.match(closeView, /closeViewActorLift\(d, true\)/, 'native support consumes the dedicated metadata');
});
