// Release 483 (Tim, 2026-10-27): brawler spells that hit like weapons. Hammerfall, Great Sweep, Iron Fist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';




function arena(foes) {
  const s = freshSave(); s.seed = 'BRAWL'; s.perception.aperture = 3255; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const run = (g, n, input = idle, t0 = 1000) => { let t = t0; for (let i = 0; i < n; i++) { g.update(.05, input, t); t += 50; } return t; };

// Release 493: Hammerfall and Great Sweep became tools and the Iron Fist a weapon; their tests are in
// tests/brawler-tools-493.test.ts and tests/iron-fists-489.test.ts. Melee power, which Shadow Boxing's damage shares, stays.
test('meleePower follows melee damage', () => {
  const { g } = arena([]); const base = g.meleePower();
  const strong = arena([]); strong.s.equipment.armor = { id: 'a', slot: 'armor', name: 'Coat', tier: 'relic', power: 1, glyphs: ['volatile', 'volatile'] };
  assert.ok(base > 0 && strong.g.meleePower() > base);
});
