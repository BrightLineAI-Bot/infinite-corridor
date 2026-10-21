// Release 261 (Tim, 2026-10-21): the Mountain Turtle may be met at sea; it walks the ocean on a floor of ice it freezes,
// which you can walk on (a skiff slides over it), and which thaws after a few seconds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TURTLE } from '../src/monster-pack.ts';
import { worldBeastFor, ensureWorldBeasts } from '../src/world-beasts.ts';
import { BOAT, sailable } from '../src/boats.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

function seaGame() {
  const map = { width: 32, height: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: i % 32 < 4 ? 'grass' : 'ocean', blocked: i % 32 >= 4 })), objects: [], enemySpawns: [] };
  const game = Object.assign(Object.create(Game.prototype), { save: freshSave(), area: 'overworld', map, rx: 9, ry: 9, player: { x: 2, y: 16, hp: 1e6 }, enemies: [], projectiles: [], effects: [], packEffects: [], performanceStats: { pathfindingWork: 0 } });
  const t = createCombatant('mountainTurtle', 16, 16, true, []); Object.assign(t, { id: 'turtle', worldBeast: 'mountainTurtle' }); game.enemies = [t];
  return { game, map, t };
}
const at = (map, x, y) => map.tiles[y * 32 + x];

test('the Turtle can hold an all-ocean section', () => {
  const s = freshSave(); s.worldBeasts = { mountainTurtle: { active: { rx: 7, ry: 7, tries: 0 }, cycle: 0 } }; ensureWorldBeasts(s);
  const sea = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ocean', blocked: true })) };
  assert.equal(worldBeastFor(s, sea, 7, 7)?.worldBeast, 'mountainTurtle');
});

test('the sea freezes into walkable ice around it, a skiff slides over it, and it thaws after its life', () => {
  const { game, map, t } = seaGame();
  game.tickSeaIce(.01); const under = at(map, 16, 17);
  assert.equal(under.kind, 'seaIce'); assert.equal(under.blocked, false, 'walkable');
  assert.ok(sailable('seaIce') && BOAT.waterKinds.includes('seaIce'), 'a skiff slides over it');
  assert.equal(at(map, 2, 16).kind, 'grass', 'land is untouched'); assert.equal(at(map, 28, 4).kind, 'ocean', 'far water is untouched');
  // The Turtle walks on: the ice under it is renewed, and ice it left behind thaws after TURTLE.seaIce.life.
  const left = { x: 16, y: 17 }; t.x = 26; t.y = 16;
  for (let s = 0; s < TURTLE.seaIce.life - 1; s += .1) game.tickSeaIce(.1);
  assert.equal(at(map, left.x, left.y).kind, 'seaIce', 'still frozen a while');
  for (let s = 0; s < 2; s += .1) game.tickSeaIce(.1);
  assert.equal(at(map, left.x, left.y).kind, 'ocean', 'thawed back to sea'); assert.equal(at(map, left.x, left.y).blocked, true);
  assert.equal(at(map, 26, 17).kind, 'seaIce', 'where it stands now is frozen');
  const tiles = [...game.seaIce.tiles.keys()]; assert.ok(tiles.length > 0 && tiles.length < 40, 'a bounded patch');
});

test('with no Turtle the ice all thaws; leaving the overworld clears it; it is never saved', () => {
  const { game, map } = seaGame(); game.tickSeaIce(.01); assert.ok(game.seaIce.tiles.size > 0);
  game.enemies = []; for (let s = 0; s < TURTLE.seaIce.life + 1; s += .25) game.tickSeaIce(.25);
  assert.equal(game.seaIce.tiles.size, 0); assert.ok(map.tiles.every((t) => t.kind !== 'seaIce'));
  const again = seaGame(); again.game.tickSeaIce(.01); again.game.area = 'dungeon'; again.game.tickSeaIce(.01); assert.equal(again.game.seaIce, null);
  assert.ok(!JSON.stringify(freshSave()).includes('seaIce'));
});

test('ice under the Wayfarer does not thaw until they step off it', () => {
  const { game, map, t } = seaGame(); game.tickSeaIce(.01);
  Object.assign(game.player, { x: 16, y: 16.3 }); const under = Math.floor(16.3 + .72) * 32 + 16; assert.equal(map.tiles[under].kind, 'seaIce');
  t.x = 28; for (let s = 0; s < TURTLE.seaIce.life + 3; s += .25) game.tickSeaIce(.25);
  assert.equal(map.tiles[under].kind, 'seaIce', 'still holding them up');
  game.player.x = 2; game.tickSeaIce(TURTLE.seaIce.tick); assert.equal(map.tiles[under].kind, 'ocean', 'thaws once they leave');
});
