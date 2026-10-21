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

// Release 263: one patch when a combo ends, not a trail.
function combo(game, t, quiet = TURTLE.seaIce.settle + TURTLE.seaIce.tick) {
  t.pack = { attack: 'turtleSpin' }; game.tickSeaIce(.1); t.pack = { attack: null };
  for (let s = 0; s < quiet; s += .1) game.tickSeaIce(.1);
}

test('release 263: no ice while it moves or attacks; one walkable patch where it settles after a combo; a skiff slides over it; it thaws', () => {
  const { game, map, t } = seaGame();
  for (let s = 0; s < 3; s += .1) { t.x = 10 + s * 4; game.tickSeaIce(.1); }
  assert.ok(map.tiles.every((q) => q.kind !== 'seaIce'), 'no trail while it roams');
  t.pack = { attack: 'turtleDash' }; for (let s = 0; s < 2; s += .1) { t.x = 10 + s * 5; game.tickSeaIce(.1); }
  assert.ok(map.tiles.every((q) => q.kind !== 'seaIce'), 'none while the combo runs');
  t.x = 16; t.y = 16; t.pack = { attack: null }; for (let s = 0; s < TURTLE.seaIce.settle - .3; s += .1) game.tickSeaIce(.1);
  assert.ok(map.tiles.every((q) => q.kind !== 'seaIce'), 'a pause between attacks is not the end of the combo');
  for (let s = 0; s < 1; s += .1) game.tickSeaIce(.1);
  const under = at(map, 16, 17); assert.equal(under.kind, 'seaIce'); assert.equal(under.blocked, false, 'walkable');
  assert.ok(sailable('seaIce') && BOAT.waterKinds.includes('seaIce'), 'a skiff slides over it');
  assert.equal(at(map, 2, 16).kind, 'grass', 'land is untouched'); assert.equal(at(map, 28, 4).kind, 'ocean', 'far water is untouched');
  const n = game.seaIce.tiles.size; assert.ok(n > 8 && n < 40, `one bounded patch (${n})`);
  for (let s = 0; s < 3; s += .1) game.tickSeaIce(.1); assert.equal(game.seaIce.tiles.size, n, 'no second patch without another combo');
  for (let s = 0; s < TURTLE.seaIce.life; s += .1) game.tickSeaIce(.1);
  assert.equal(at(map, 16, 17).kind, 'ocean', 'thawed back to sea'); assert.equal(at(map, 16, 17).blocked, true);
  t.x = 24; combo(game, t); assert.equal(at(map, 24, 17).kind, 'seaIce', 'the next combo leaves the next patch');
});

test('with no Turtle the ice all thaws; leaving the overworld clears it; it is never saved', () => {
  const { game, map, t } = seaGame(); combo(game, t); assert.ok(game.seaIce.tiles.size > 0);
  game.enemies = []; for (let s = 0; s < TURTLE.seaIce.life + 1; s += .25) game.tickSeaIce(.25);
  assert.equal(game.seaIce.tiles.size, 0); assert.ok(map.tiles.every((q) => q.kind !== 'seaIce'));
  const again = seaGame(); combo(again.game, again.t); again.game.area = 'dungeon'; again.game.tickSeaIce(.01); assert.equal(again.game.seaIce, null);
  assert.ok(!JSON.stringify(freshSave()).includes('seaIce'));
});

test('release 263: ice that thaws under the Wayfarer drops them into the deep water', () => {
  const { game, map, t } = seaGame(); combo(game, t);
  Object.assign(game.player, { x: 16, y: 16.3 }); const under = Math.floor(16.3 + .72) * 32 + 16; assert.equal(map.tiles[under].kind, 'seaIce');
  t.x = 28; for (let s = 0; s < TURTLE.seaIce.life + 1; s += .25) game.tickSeaIce(.25);
  assert.equal(map.tiles[under].kind, 'ocean', 'it thaws with them on it');
});
