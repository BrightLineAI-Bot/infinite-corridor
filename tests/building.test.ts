// Release 265 (Tim, 2026-10-21): wood walls and stone blocks raised from carried materials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD, ensureBuild, setBuildKind, placeBuild, breakBuild, buildSpot, tickBuilds, buildBetween, buildRefusal, tapTarget } from '../src/building.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen, updateProjectiles } from '../src/game.ts';
import { canStep } from '../src/landscape.ts';

function field() {
  const map = { width: 32, height: 32, landscape: true, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: i % 32 > 25 ? 'ocean' : 'grass', blocked: i % 32 > 25, elev: 0 })), objects: [], enemySpawns: [] };
  const save = freshSave(); save.materials.wood = 20; save.materials.stone = 40;
  const game = Object.assign(Object.create(Game.prototype), { save, area: 'overworld', map, rx: 3, ry: 3, player: { x: 10, y: 10, hp: 100, facing: 'right' }, enemies: [], projectiles: [], effects: [], packEffects: [], builds: [], guardRemaining: 0, jumpUntil: 0, performanceStats: { pathfindingWork: 0 } });
  return { game, map, save };
}
const at = (map, x, y) => map.tiles[y * 32 + x];

test('the build choice is additive save state, wood by default', () => {
  assert.equal(freshSave().build.kind, 'wood');
  const old = freshSave(); delete old.build; assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).build.kind, 'wood');
  const s = freshSave(); s.build = { kind: 'gold', other: 1 }; ensureBuild(s); assert.deepEqual(s.build, { kind: 'wood', other: 1 });
  assert.equal(setBuildKind(s, 'stone'), 'stone'); assert.equal(setBuildKind(s, 'nope'), 'stone');
  assert.deepEqual([BUILD.kinds.wood.cost.wood, BUILD.kinds.wood.hits, BUILD.kinds.stone.cost.stone, BUILD.kinds.stone.hits, BUILD.life, BUILD.maxOut], [5, 1, 10, 2, 10, 5], 'Tim\'s numbers');
});

test('a wood wall goes in front, costs 5 wood, blocks everyone, and crumbles after 10 s back to the ground it stood on', () => {
  const { game, map, save } = field(), spot = buildSpot(game.player); assert.deepEqual(spot, { x: 11, y: 10 });
  const r = placeBuild(game, spot.x, spot.y, 'wood'); assert.equal(r.ok, true, r.message); assert.equal(save.materials.wood, 15);
  assert.equal(at(map, 11, 10).build, 'wood'); assert.equal(footprintOpen(map, 32, 10.8, 9.5, true), false, 'not even the Wayfarer walks through');
  assert.equal(at(map, 11, 10).buildRun, 'v', 'built facing sideways, it runs across the way'); game.player.facing = 'down'; placeBuild(game, 10, 11, 'wood'); assert.equal(at(map, 10, 11).buildRun, 'h'); breakBuild(game, game.builds[1]);
  game.player.facing = 'left'; placeBuild(game, 9, 10, 'wood', false); assert.equal(at(map, 9, 10).buildRun, 'h', 'standing still: the standard fence'); breakBuild(game, game.builds[1]);
  tickBuilds(game, BUILD.life - .5); assert.equal(at(map, 11, 10).build, 'wood');
  tickBuilds(game, 1); assert.equal(at(map, 11, 10).build, undefined); assert.equal(at(map, 11, 10).blocked, false); assert.equal(game.builds.length, 0);
});

test('refusals: water, an occupied tile, too few materials, and more than five standing', () => {
  const { game, map, save } = field();
  assert.match(buildRefusal(map, 27, 10, 'stone', false), /sink/); assert.match(placeBuild(game, 27, 10, 'stone').message, /sink/); assert.equal(save.materials.stone, 40, 'nothing spent');
  game.enemies = [{ x: 11.5 - .5, y: 10, dead: false }]; assert.match(placeBuild(game, 11, 10, 'wood').message, /stands there/); game.enemies = [];
  save.materials.stone = 60; save.materials.wood = 4; assert.match(placeBuild(game, 11, 10, 'wood').message, /takes 5 wood \(you have 4\)/);
  for (let k = 0; k < BUILD.maxOut; k++) assert.equal(placeBuild(game, 12 + k, 5, 'stone').ok, true);
  assert.match(placeBuild(game, 12, 7, 'stone').message, /5 builds already stand/);
});

test('a stone block is a perch: only the Wayfarer steps onto it, jumping as onto a ledge; two stack; it takes two blows', () => {
  const { game, map } = field();
  assert.equal(placeBuild(game, 11, 10, 'stone').ok, true);
  const t = at(map, 11, 10); assert.equal(t.perch, true); assert.equal(t.elev, 1);
  assert.equal(footprintOpen(map, 32, 10.8, 9.5), false, 'creatures cannot walk onto it'); assert.equal(footprintOpen(map, 32, 10.8, 9.5, true), true, 'the Wayfarer can');
  assert.equal(canStep({ isPlayer: true, jumping: false }, map, 32, 10, 10, 11, 10), false, 'a ledge: jump'); assert.equal(canStep({ isPlayer: true, jumping: true }, map, 32, 10, 10, 11, 10), true);
  assert.equal(placeBuild(game, 11, 10, 'stone').ok, true, 'stacked'); assert.equal(at(map, 11, 10).elev, 2);
  assert.match(placeBuild(game, 11, 10, 'stone').message, /Two blocks/);
  breakBuild(game, game.builds[1]); assert.equal(at(map, 11, 10).elev, 1, 'the top block goes first'); breakBuild(game, game.builds[0]); assert.equal(at(map, 11, 10).perch, undefined); assert.equal(at(map, 11, 10).elev, 0);
});

test('a build between a creature and the Wayfarer takes its blows: wood one, stone two; a world beast\'s melee smashes it', () => {
  const { game, map } = field(); game.player.x = 10; game.player.y = 10;
  const foe = { id: 'f', x: 14, y: 10, pack: { attack: 'mortarVolley' } };
  placeBuild(game, 12, 10, 'stone'); assert.ok(buildBetween(game, foe));
  assert.equal(game.packHurt(foe, 10, {}, 1000), false); assert.equal(game.player.hp, 100); assert.equal(game.builds[0].hits, 1);
  assert.equal(game.packHurt(foe, 10, {}, 2000), false); assert.equal(game.builds.length, 0, 'two blows break it'); assert.equal(at(map, 12, 10).perch, undefined);
  assert.equal(game.packHurt(foe, 10, {}, 3000), true, 'nothing left in the way'); assert.ok(game.player.hp < 100);
  const beast = { id: 'b', x: 14, y: 10, worldBeast: 'nanobotKnight', pack: { attack: 'clawSweep' } }; game.player.invulnerableUntil = 0;
  placeBuild(game, 12, 10, 'stone'); assert.equal(game.packHurt(beast, 10, {}, 9000), false, 'the blow is stopped'); assert.equal(game.builds.length, 0, 'but the block is smashed');
});

test('a world beast charging through breaks builds in its path; an ordinary creature does not', () => {
  const { game } = field(); placeBuild(game, 12, 10, 'wood'); placeBuild(game, 12, 12, 'stone');
  game.enemies = [{ id: 'o', x: 11.2, y: 9.6, sliding: true }]; tickBuilds(game, .01); assert.equal(game.builds.length, 2, 'not a world beast');
  game.enemies = [{ id: 'g', x: 11.2, y: 9.6, worldBeast: 'lightningGiant', scale: 1 }]; tickBuilds(game, .01, () => []); assert.equal(game.builds.length, 2, 'walking, not rushing');
  tickBuilds(game, .01, () => ['charge']); assert.equal(game.builds.length, 1, 'its charge goes through the wall'); assert.equal(game.builds[0].y, 12, 'the block out of reach stands');
});

test('a hostile shot is absorbed by a build in its path; one from the block the Wayfarer stands on is not', () => {
  const { game, map } = field(); placeBuild(game, 12, 10, 'stone'); let hits = 0;
  const shot = { id: 's', hostile: true, x: 15, y: 10.5, dx: -1, dy: 0, speed: 10, life: 2, damage: 5 };
  updateProjectiles([shot], [], map, 32, .5, undefined, undefined, game.player, () => { hits++; }, undefined, undefined, [], (x, y) => { assert.deepEqual([x, y], [12, 10]); hits += 10; });
  assert.equal(shot.dead, true); assert.equal(hits, 10, 'the build took it, not the Wayfarer');
  game.player.x = 11.5; game.player.y = 9.6; const close = { id: 't', hostile: true, x: 12.9, y: 10.12, dx: -1, dy: 0, speed: 4, life: 2, damage: 5 }; hits = 0;
  updateProjectiles([close], [], map, 32, .5, undefined, undefined, game.player, () => { hits++; }, undefined, undefined, [], () => { hits += 10; });
  assert.equal(hits, 1, 'standing on the block, the shot reaches the Wayfarer');
});

test('release 267: build mode: a tap builds there, or 3 tiles out along the line; a fence turns across the line in 8 directions', () => {
  const { game, map, save } = field(); Object.assign(game.player, { x: 10, y: 10 }); // feet at (10.5, 10.75)
  assert.deepEqual(tapTarget(game.player, 12.2, 10.6), { x: 12, y: 10, run: 'v' }, 'within reach: exactly where tapped; heading east, the fence runs up and down');
  const far = tapTarget(game.player, 30.5, 10.75); assert.deepEqual([far.x, far.y, far.run], [13, 10, 'v'], 'beyond reach: 3 tiles out');
  assert.equal(tapTarget(game.player, 10.5, 7.5).run, 'h', 'north: across');
  assert.equal(tapTarget(game.player, 12.5, 8.75).run, 'nw', 'north-east: the fence runs \\');
  assert.equal(tapTarget(game.player, 8.5, 8.75).run, 'ne', 'north-west: /');
  assert.equal(tapTarget(game.player, 12.5, 12.75).run, 'ne', 'south-east: /');
  const g = new Game(Object.assign(freshSave(), { seed: 'BUILDMODE' }), 0); g.map = map; g.area = 'overworld'; g.builds = []; g.enemies = []; Object.assign(g.player, { x: 10, y: 10 }); g.save.materials.wood = 20;
  const r = g.buildAt(12.5, 8.75); assert.equal(r.ok, true, r.message); assert.equal(at(map, 12, 8).buildRun, 'nw');
  assert.equal(new Game(Object.assign(freshSave(), { aimMode: 'build' }), 0).save.aimMode, 'build', 'build mode survives a reload');
});

test('a wood wall never closes around the Wayfarer: no wall on any tile their body overlaps (the Fable review\'s trap)', () => {
  for (const [x, y, facing, tx, ty] of [[10.52, 10, 'left', 10, 10], [10.45, 10, 'right', 11, 10], [10, 10.3, 'up', 10, 10]]) {
    const { game, map } = field(); Object.assign(game.player, { x, y, facing });
    const r = placeBuild(game, tx, ty, 'wood'); assert.equal(r.ok, false, `${facing}: refused`); assert.match(r.message, /Step back/);
    assert.equal(footprintOpen(map, 32, x, y, true), true, 'still free to move');
  }
  const { game } = field(); Object.assign(game.player, { x: 10, y: 10, facing: 'right' }); assert.equal(placeBuild(game, 11, 10, 'wood').ok, true, 'a step clear: built');
});
