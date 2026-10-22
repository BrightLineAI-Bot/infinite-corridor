// Release 287 (Tim, 2026-10-22): supply caches in dungeons give 2 stone and 2 wood on the first level; deeper levels give
// the same, with a seeded chance of 3 and 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInteraction, dungeonCacheMaterials } from '../src/interactions.ts';
import { DIG } from '../src/digging.ts';
import { freshSave } from '../src/types.ts';

const cache = (id) => ({ id, kind: 'supplyCache', supplyType: 'restorativeDraught', state: 'ready', actions: ['collect'], x: 1, y: 1 });
test('first level: 2 stone and 2 wood, flat', () => {
  const s = freshSave(); s.materials.stone = 0; s.materials.wood = 0;
  const r = applyInteraction(cache('c1'), 'collect', s, 'dungeon:x', { dungeonDepth: 0 });
  assert.equal(r.ok, true); assert.equal(s.materials.stone, 2); assert.equal(s.materials.wood, 2);
});
test('deeper levels: 2 and 2, sometimes 3 and 3; the overworld keeps its own cache', () => {
  const got = Array.from({ length: 60 }, (_, i) => dungeonCacheMaterials(freshSave(), 'dungeon:x', { id: `c${i}` }, 1).stone);
  assert.ok(got.every((n) => n === 2 || n === 3) && got.includes(3) && got.includes(2));
  const s = freshSave(); s.materials.stone = 0; applyInteraction(cache('o'), 'collect', s, 'overworld'); assert.equal(s.materials.stone, DIG.cache.stone);
});
