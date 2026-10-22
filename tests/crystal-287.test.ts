// Release 287 (Tim, 2026-10-22): the Crystal need not engage on sight; touch it or attack it and it does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYSTAL, QB_MOVES, updatePackMonster } from '../src/monster-pack.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';

const IDLE = { state: { x: 0, y: 0 }, consume: () => false };
function mapOf(width = 32, height = width) {
  return { width, height, entry: { x: 4, y: 5 }, objects: [], enemySpawns: [], tiles: Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'wall', blocked: true })) };
}
function rect(map, x0, y0, x1, y1, kind = 'floor') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) Object.assign(map.tiles[y * map.width + x], { kind, blocked: false }); return map; }
// Two rooms side by side behind a 3-thick wall, a far room no corridor reaches, and solid black all around.
function dungeon() { const m = mapOf(); rect(m, 3, 3, 9, 9); rect(m, 13, 3, 19, 9); rect(m, 24, 22, 27, 25); return m; }
function fixture(map = dungeon(), at = { x: 5, y: 5 }) {
  const game = Object.assign(Object.create(Game.prototype), { save: freshSave(), area: 'dungeon', map, player: { x: 7, y: 7, hp: 1e6, facing: 'down' }, enemies: [], projectiles: [], effects: [], packEffects: [], performanceStats: { pathfindingWork: 0 } });
  const e = createCombatant('psychicCrystal', at.x, at.y, true, []); Object.assign(e, { id: 'c', worldBeast: 'psychicCrystal', aggro: true, hp: 3000, maxHp: 3000, packAttacks: [], packBossAttacks: [] });
  game.enemies = [e]; return { game, e, map };
}

test('unprovoked it keeps wandering even in plain sight; touched or hurt, it engages', () => {
  const { game, e } = fixture(dungeon(), { x: 5, y: 5 }); game.player.x = 7; game.player.y = 5;
  const w = game.packWorld(1 / 30, 0); w.los = () => true; e.aggro = false; e.packAttacks = []; e.evasive = false;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  for (let i = 0; i < 60; i++) { tick(); game.player.x = e.x + 2; game.player.y = e.y; } assert.equal(e.aggro, false, 'seen, not touched');
  e.hp -= 1; tick(); assert.equal(e.aggro, true, 'hurt, it engages');
  e.aggro = false; e.pack.calmHp = undefined; tick(); game.player.x = e.x + .4; game.player.y = e.y; tick(); assert.equal(e.aggro, true, 'touched, it engages');
});
