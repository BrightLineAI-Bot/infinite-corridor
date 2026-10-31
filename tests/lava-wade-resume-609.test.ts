// Release 609 (pre-publish review of 603→609): creatures are kept off open lethal ground, but the Wayfarer wading lava in the
// robot is not "stranded": pausing, crossing or resuming leaves them where they stand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, footprintOpen, relocateIfStranded } from '../src/game.ts';

const strip = () => ({ width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: Math.floor(i / 32) === 15 ? 'lava' : 'ash', blocked: false, ...(Math.floor(i / 32) === 15 ? { environment: 'lava' } : {}) })) });

test('open lava: no footing for a creature, but the Wayfarer standing in it is not moved', () => {
  const map = strip();
  assert.equal(footprintOpen(map, 32, 14, 14.7), false, 'a creature cannot step there');
  const creature = { x: 14, y: 14.7 }; assert.equal(relocateIfStranded(creature, map, 32), true, 'a creature found there is moved off');
  const wayfarer = { x: 14, y: 14.7, isPlayer: true }; assert.equal(relocateIfStranded(wayfarer, map, 32), false); assert.deepEqual([wayfarer.x, wayfarer.y], [14, 14.7]);
  const g = new Game(freshSave(), 0); assert.equal(g.player.isPlayer, true, 'the Wayfarer is known from the first frame');
});
