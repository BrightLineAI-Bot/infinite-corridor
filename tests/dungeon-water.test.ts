// Release 283 (Tim, 2026-10-22): dungeon water wounds quickly (health, not maximum health), and a swimmer without
// stamina drowns outright. The overworld keeps its rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { DUNGEON_WATER, dungeonWaterToll, grantTidemantle } from '../src/water-traversal.ts';

function pool(area) {
  const s = freshSave(), g = new Game(s, 0);
  g.map = { ...g.map, width: 8, height: 8, exits: null, objects: [], enemySpawns: [], underwater: false, openSea: false, tiles: Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = Math.floor(i / 8), wet = x >= 3; return { x, y, kind: wet ? 'dungeonWater' : 'ash', environment: wet ? 'dungeonWater' : undefined, blocked: wet }; }) };
  g.area = area; Object.assign(g.player, { x: 4.5, y: 3, hp: s.maxHp, stamina: s.maxStamina }); g.enemies = []; grantTidemantle(s, 'test');
  return { s, g };
}
const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

test('the toll: a share of max health a second, or drowning without stamina', () => {
  assert.equal(dungeonWaterToll({ stamina: 30 }, 1, 200), 200 * DUNGEON_WATER.hpPerSecond);
  assert.equal(dungeonWaterToll({ stamina: 0 }, 1 / 60, 200), Infinity);
});

test('swimming dungeon water costs health quickly, but not maximum health', () => {
  const { s, g } = pool('dungeon'), max = s.maxHp;
  for (let i = 0; i < 60; i++) g.update(1 / 60, still, 1000 + i * 1000 / 60);
  assert.ok(g.swimming, 'swimming');
  const lost = max - g.player.hp; assert.ok(lost > max * DUNGEON_WATER.hpPerSecond * .8 && lost < max * DUNGEON_WATER.hpPerSecond * 1.2, `lost ${lost}`);
  assert.equal(s.maxHp, max); assert.ok(!s.worldFlags.deaths);
});

test('entering dungeon water without stamina is death', () => {
  const { s, g } = pool('dungeon'); g.player.stamina = 0;
  for (let i = 0; i < 10 && !s.worldFlags.deaths; i++) g.update(1 / 60, still, 1000 + i * 17);
  assert.equal(s.worldFlags.deaths, 1);
});

test('overworld water is unchanged: no health toll while stamina lasts', () => {
  const { s, g } = pool('overworld');
  for (let i = 0; i < 60; i++) g.update(1 / 60, still, 1000 + i * 1000 / 60);
  assert.equal(g.player.hp, s.maxHp);
});
