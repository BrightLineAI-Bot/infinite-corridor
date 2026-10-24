// Release 401 (Tim, 2026-10-24: the Psychic Crystal "spends too much time in the squares where he can't be hurt... he dodges
// too much... a smaller stagger cooldown... he just runs too much"): fighting a Wayfarer it can see, it no longer drifts
// into walls; it dodges less, breaks after fewer blows and can break again sooner; a dodge no longer saves a spent poise.
// Also: found Watcher's Daises are marked on the dungeon map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CRYSTAL } from '../src/monster-pack.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';

function mapOf(width = 32, height = width) { return { width, height, entry: { x: 4, y: 5 }, objects: [], enemySpawns: [], tiles: Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'wall', blocked: true })) }; }
function rect(map, x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) Object.assign(map.tiles[y * map.width + x], { kind: 'floor', blocked: false }); return map; }
function fixture(map = dungeon(), at = { x: 5, y: 5 }) {
  const game = Object.assign(Object.create(Game.prototype), { save: freshSave(), area: 'dungeon', map, player: { x: 7, y: 7, hp: 1e6, facing: 'down' }, enemies: [], projectiles: [], effects: [], packEffects: [], performanceStats: { pathfindingWork: 0 } });
  const e = createCombatant('psychicCrystal', at.x, at.y, true, []); Object.assign(e, { id: 'c', worldBeast: 'psychicCrystal', aggro: true, hp: 3000, maxHp: 3000, packAttacks: [], packBossAttacks: [] });
  game.enemies = [e]; return { game, e, map };
}

test('fighting a Wayfarer it can see, it cannot drift into a wall; unaware, it still phases', () => {
  const map = rect(mapOf(), 3, 3, 12, 9), { game, e } = fixture(map, { x: 4, y: 6 }); game.player.x = 8; game.player.y = 6;
  const w = game.packWorld(1 / 30, 0);
  w.move(e, -1.6, 0); assert.ok(Math.round(e.x) >= 3 && !map.tiles[6 * 32 + Math.round(e.x)].blocked, `stayed out of the wall (x=${e.x.toFixed(2)})`);
  e.aggro = false; e.x = 4; w.move(e, -1.6, 0); assert.ok(e.x < 2.5, 'patrolling, it still drifts through stone');
});

test('it dodges less and staggers sooner', () => {
  assert.equal(CRYSTAL.evadeCooldown, 5); assert.equal(CRYSTAL.evadeCooldownEnraged, 3.5); assert.equal(CRYSTAL.poiseHits, 10); assert.equal(CRYSTAL.poiseGuard, 4);
});

test('found Watcher\'s Daises are drawn on the dungeon map', () => {
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(src, /const colors=\{warpDais:"#c9a6ff"/); assert.match(src, /o\.kind==="warpDais"/);
});
