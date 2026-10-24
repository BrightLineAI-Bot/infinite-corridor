// Release 411 (Tim: the iron shovel "can dig through 2 of these... obstacles... 4 blocks [of] regular dungeon walls before it
// breaks... the hard dungeon walls that resist the shovel... just two of them").
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { DIG, ensureDigging, dig, isObstacle } from '../src/digging.ts';

const W = 12;
const map = () => ({ width: W, height: 9, objects: [], tiles: Array.from({ length: W * 9 }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'cisternWall', blocked: true })) });
const save = () => { const s = freshSave(); s.seed = 'IRON411'; ensureDigging(s); s.digging.iron = DIG.iron.uses; return s; };

test('four points: a plain wall costs one, an obstacle or a hard wall two', () => {
  assert.equal(DIG.iron.uses, 4); assert.deepEqual(DIG.iron.cost, { wall: 1, obstacle: 2, hard: 2 });
  const a = save(); for (let i = 0; i < 4; i++) dig(a, map(), { x: 3 + i, y: 3, iron: true, cut: 'wall' }, 'k'); assert.equal(a.digging.iron, undefined, 'four walls, then it breaks');
  const b = save(); dig(b, map(), { x: 3, y: 3, iron: true, cut: 'obstacle' }, 'k'); assert.equal(b.digging.iron, 2); dig(b, map(), { x: 4, y: 3, iron: true, cut: 'obstacle' }, 'k'); assert.equal(b.digging.iron, undefined, 'two obstacles');
  const c = save(); dig(c, map(), { x: 3, y: 3, iron: true, cut: 'wall', hard: true }, 'k'); assert.equal(c.digging.iron, 2, 'a hard wall costs two');
});

test('obstacles are the things standing in halls, not walls', () => {
  assert.equal(isObstacle({ kind: 'sleeperStone', blocked: true }), true); assert.equal(isObstacle({ kind: 'crystalSpire', blocked: true }), true);
  for (const k of ['wall', 'cisternWall', 'volcanicRim', 'deepWall', 'hiveWall']) assert.equal(isObstacle({ kind: k, blocked: true }), false, k);
  assert.equal(isObstacle({ kind: 'sleeperStone', blocked: false }), false);
});
