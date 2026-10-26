// Release 437 (Tim: "the psychic crystal keeps staying in the squares where I can't attack him... He just stays there,
// attacks me, and then... i'm dead"): release 401 stopped it drifting into walls only while it could see you. Fighting you,
// inside rock it now begins no attack and heads out to you; out of sight it may still pass through a wall, but never stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, footprintOpen } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshPackState, updatePackMonster } from '../src/monster-pack.ts';
import { freshSave } from '../src/types.ts';

function mapOf(width = 32, height = width) { return { width, height, entry: { x: 4, y: 5 }, objects: [], enemySpawns: [], tiles: Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'wall', blocked: true })) }; }
function rect(map, x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) Object.assign(map.tiles[y * map.width + x], { kind: 'floor', blocked: false }); return map; }
function fixture(map, at) {
  const game = Object.assign(Object.create(Game.prototype), { save: freshSave(), area: 'dungeon', map, player: { x: 7, y: 7, hp: 1e6, facing: 'down' }, enemies: [], projectiles: [], effects: [], packEffects: [], performanceStats: { pathfindingWork: 0 } });
  const e = createCombatant('psychicCrystal', at.x, at.y, true, []); Object.assign(e, { id: 'c', worldBeast: 'psychicCrystal', aggro: true, hp: 3000, maxHp: 3000, packAttacks: [], packBossAttacks: [] });
  game.enemies = [e]; return { game, e };
}

// Runs the Crystal's own AI in the game's world; returns frames spent in rock and whether it began an attack there.
function fight(map, at, player, frames = 240) {
  const { game, e } = fixture(map, at); Object.assign(game.player, player); e.packAttacks = ['psyPush', 'psyDebris']; e.pack = freshPackState(); e.pack.gap = 0;
  let inRock = 0, attackInRock = false, longest = 0, run = 0;
  for (let i = 0; i < frames; i++) { const w = game.packWorld(1 / 30, i * 33); const before = e.pack.attack; updatePackMonster(e, w); const rock = !footprintOpen(map, 32, e.x, e.y, true);
    if (rock) { inRock++; run++; longest = Math.max(longest, run); if (!before && e.pack.attack) attackInRock = true; } else run = 0; }
  return { e, inRock, attackInRock, longest };
}

test('caught inside rock in a fight, it attacks nothing from there and comes out to you', () => {
  const map = rect(mapOf(), 3, 3, 12, 9), r = fight(map, { x: 15, y: 6 }, { x: 8, y: 6 });
  assert.equal(r.attackInRock, false, 'no attack begins inside rock');
  assert.ok(footprintOpen(map, 32, r.e.x, r.e.y, true), `it came out (x=${r.e.x.toFixed(2)})`); assert.ok(r.longest < 90, `left within 3 s (${r.longest} frames)`);
});

test('out of sight in the next room it may pass through the wall to reach you, but does not stay in it', () => {
  const map = rect(rect(mapOf(), 3, 3, 12, 9), 16, 3, 26, 9), r = fight(map, { x: 11, y: 6 }, { x: 20, y: 6 }, 300);
  assert.equal(r.attackInRock, false); assert.ok(r.longest < 90, `never lingers (${r.longest} frames)`); assert.ok(r.e.x > 15, 'it reached your room');
});

test('unaware, it still roams through stone as before', () => {
  const map = rect(mapOf(), 3, 3, 12, 9), { game, e } = fixture(map, { x: 4, y: 6 }); e.aggro = false;
  game.packWorld(1 / 30, 0).move(e, -1.6, 0); assert.ok(e.x < 2.5);
});
