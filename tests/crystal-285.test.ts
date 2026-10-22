// Release 285 (Tim, 2026-10-22): the Psychic Crystal comes out of the walls to fight, dodges less, takes more hits to
// stagger, and cannot be staggered again for a while.
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

test('the wall budget: one second off reachable floor, refilled over five seconds on it', () => {
  const { game, e } = fixture(dungeon(), { x: 11, y: 5 }); game.player.x = 6; game.player.y = 6;
  const w = game.packWorld(1 / 30, 0); w.los = () => true; e.packAttacks = []; e.evasive = false;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  tick(); assert.ok(!e.pack.manifest, 'a full budget: it may stay a moment');
  let i = 0; for (; i < 30 * 5 && !e.pack.manifest; i++) tick();
  assert.ok(i / 30 <= CRYSTAL.wallBudget + .1, `it set out after ${(i / 30).toFixed(2)} s`);
  for (let k = 0; k < 30 * 5 && !w.walkable(e.x, e.y); k++) tick(); assert.ok(w.walkable(e.x, e.y));
  e.x = 11; e.y = 5; tick(); tick(); assert.ok(e.pack.manifest, 'straight back in with an empty budget: it comes out at once');
  for (let k = 0; k < 30 * 5 && !w.walkable(e.x, e.y); k++) tick();
  assert.ok(w.walkable(e.x, e.y)); w.move = () => false; w.roamMove = () => false; // hold it on the floor
  for (let k = 0; k < 30 * (CRYSTAL.wallWindow + .5); k++) tick();
  assert.ok(e.pack.wallBudget >= CRYSTAL.wallBudget - 1e-9, `refilled on the floor (${e.pack.wallBudget})`);
});

test('it breaks off an attack begun inside a wall once its budget is spent', () => {
  const { game, e } = fixture(dungeon(), { x: 11, y: 5 }); game.player.x = 6; game.player.y = 6;
  const w = game.packWorld(1 / 30, 0); w.los = () => true; e.packAttacks = []; e.evasive = false;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  e.pack.attack = 'heldInWall'; e.pack.phase = 'active'; e.pack.t = 1e6; // any attack in progress
  for (let i = 0; i < 30 * 5 && !w.walkable(e.x, e.y); i++) tick();
  assert.ok(w.walkable(e.x, e.y), 'out of the wall'); assert.notEqual(e.pack.attack, 'heldInWall');
});

test('after a poise break it cannot be broken again for poiseGuard seconds', () => {
  const { game, e } = fixture(dungeon(), { x: 6, y: 6 }); game.player.x = 7; game.player.y = 6;
  const w = game.packWorld(1 / 30, 0); w.los = () => true; e.packAttacks = []; e.evasive = false;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  tick(); for (let k = 0; k < CRYSTAL.poiseHits; k++) { e.hp -= 5; tick(); }
  assert.ok(e.pack.broken > 0, 'broken'); let i = 0; while (e.pack.broken > 0 && i++ < 300) tick();
  assert.ok(e.pack.poiseGuard > 0);
  for (let k = 0; k < CRYSTAL.poiseHits * 2; k++) { e.hp -= 5; tick(); assert.ok(!(e.pack.broken > 0), 'no second break inside the guard'); }
  for (let j = 0; j < 30 * (CRYSTAL.poiseGuard + 1); j++) tick();
  for (let k = 0; k < CRYSTAL.poiseHits; k++) { e.hp -= 5; tick(); }
  assert.ok(e.pack.broken > 0, 'breakable again once the guard has passed');
});

test('it dodges less often than the shared evade cooldown', () => {
  assert.ok(CRYSTAL.evadeCooldown > QB_MOVES.evadeCooldown && CRYSTAL.evadeCooldownEnraged > QB_MOVES.evadeCooldownEnraged);
  const { game, e } = fixture(dungeon(), { x: 6, y: 6 }); e.evasive = true; game.player.x = 7; game.player.y = 6;
  const w = game.packWorld(1 / 30, 0); w.playerSwinging = true; w.los = () => true;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  tick(); assert.ok(e.pack.evade); assert.ok(e.pack.cd.qbEvade > QB_MOVES.evadeCooldown, 'the Crystal\'s own, longer cooldown');
});
