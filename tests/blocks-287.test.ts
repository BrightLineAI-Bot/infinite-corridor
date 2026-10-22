// Release 287 (Tim, 2026-10-22): blocks as stairs, stacks that stop fliers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeBuild, tallBuildAt } from '../src/building.ts';
import { freshSave } from '../src/types.ts';
import { Game, moveAxis } from '../src/game.ts';
import { canStep } from '../src/landscape.ts';

function field() {
  const map = { width: 32, height: 32, landscape: true, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: i % 32 > 25 ? 'ocean' : 'grass', blocked: i % 32 > 25, elev: 0 })), objects: [], enemySpawns: [] };
  const save = freshSave(); save.materials.wood = 20; save.materials.stone = 40;
  const game = Object.assign(Object.create(Game.prototype), { save, area: 'overworld', map, rx: 3, ry: 3, player: { x: 10, y: 10, hp: 100, facing: 'right' }, enemies: [], projectiles: [], effects: [], packEffects: [], builds: [], guardRemaining: 0, jumpUntil: 0, performanceStats: { pathfindingWork: 0 } });
  return { game, map, save };
}
const at = (map, x, y) => map.tiles[y * 32 + x];

test('blocks make stairs: one block, a two-high stack beside it, then a level-3 platform, each a single jump up', () => {
  const { game, map } = field();
  for (const t of map.tiles) if (t.x >= 14 && t.x < 20 && !t.blocked) t.elev = 3; // a level-3 platform from x 14
  game.player.x = 10; game.player.y = 10; game.player.facing = 'right';
  assert.equal(placeBuild(game, 11, 10, 'stone').ok, true); assert.equal(placeBuild(game, 12, 10, 'stone').ok, true); assert.equal(placeBuild(game, 12, 10, 'stone').ok, true);
  assert.equal(placeBuild(game, 13, 10, 'stone').ok, true); assert.equal(placeBuild(game, 13, 10, 'stone').ok, true);
  const levels = [10, 11, 12, 13, 14].map((x) => at(map, x, 10).elev); assert.deepEqual(levels, [0, 1, 2, 2, 3]);
  const body = { isPlayer: true, jumping: true };
  for (let x = 10; x < 14; x++) assert.equal(canStep(body, map, 32, x, 10, x + 1, 10), true, `jump from ${x} to ${x + 1}`);
});

test('a two-high stack stops a flier (walls stop everyone); a single block does not stop a flier', () => {
  const { game, map } = field(); game.player.x = 5; game.player.y = 20;
  assert.equal(placeBuild(game, 12, 10, 'stone').ok, true);
  const flier = { x: 10, y: 10, flying: true }; moveAxis(flier, 3, 0, map, 32, true); assert.ok(flier.x > 12, 'over one block');
  placeBuild(game, 12, 10, 'stone'); const again = { x: 10, y: 10, flying: true }; moveAxis(again, 3, 0, map, 32, true); assert.ok(again.x < 11.5, `stopped by two (${again.x})`);
  assert.equal(tallBuildAt(map, 32, 11.6, 9.5), true);
});
