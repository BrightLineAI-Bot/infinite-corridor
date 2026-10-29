// Release 561 (Tim, 2026-10-29): a blow during a windup holds it briefly and the attack still lands; nothing ordinary can be
// stun-locked; the deep dungeons' wardens stand up as bosses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, updateEnemyAI, DEEP_WARDEN } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { createCombatant } from '../src/combat.ts';
import { WINDUP_STAGGER, windupHeld, staggerGovernor, STAGGER_GOVERNOR } from '../src/monster-pack.ts';
function floor(){return {width:16,height:16,tiles:Array.from({length:256},(_,i)=>({x:i%16,y:Math.floor(i/16),blocked:false})),objects:[]};}

test('shot every frame through a windup, a foe still finishes its attack', () => {
  const map = floor(), target = { x: 7, y: 5 }, e = Object.assign(createCombatant('hollowMarshal', 5, 5), { telegraph: .3, meleePhase: { id: 'longReach', aim: { x: 1, y: 0 }, target: { x: 7, y: 5 } } });
  let landed = false, t = 0;
  for (let i = 0; i < 60 && !landed; i++) { e.hitStun = .2; t += 50; landed = updateEnemyAI(e, target, map, 16, .05, t) === true; }
  assert.ok(landed, 'the blow lands despite constant hits');
  assert.ok(t <= (.3 + WINDUP_STAGGER.max) * 1000 + 200, `within the windup plus the hold (${t} ms)`);
});

test('the hold is bounded per attack; ordinary foes cannot be stun-locked', () => {
  const e = {}, held = {}; let n = 0; while (windupHeld(Object.assign(e, { hitStun: .2 }), held, .05)) n++;
  assert.ok(n * .05 <= WINDUP_STAGGER.max + 1e-9); assert.equal(e.hitStun, 0);
  const pawn = { kind: 'ashling' }; let stunned = 0; for (let i = 0; i < 200; i++) { pawn.hitStun = .2; staggerGovernor(pawn, .05); if (pawn.hitStun > 0) stunned++; }
  assert.ok(stunned / 200 < .45, `stunned ${stunned}/200 frames`); assert.ok(STAGGER_GOVERNOR.limit.ordinary > 0);
});

test('a deep dungeon warden has a boss\'s health, not a crossing guardian\'s', () => {
  const g = new Game(Object.assign(freshSave(), { seed: 'WARD' }), 0);
  const make = (extra) => g.createEnemyFromSpawn({ id: 'w', kind: 'rootBrute', x: 5, y: 5, boss: true, dungeonRole: 'objectiveGuardian', ...extra }, 'dungeon');
  const deep = make({ deepDungeon: true }), plain = make({});
  assert.ok(deep.maxHp >= plain.maxHp * (DEEP_WARDEN.hp / 1.35) * .95, `${deep.maxHp} vs ${plain.maxHp}`);
});
