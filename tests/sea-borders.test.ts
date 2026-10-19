import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape } from '../src/landscape.ts';

// Release 211 (Tim): shallow channels and lakes that reach a section's edge no longer keep the section wall there.
function walledShallowEdges(version) {
  let edges = 0, walled = 0;
  for (let rx = -9; rx <= 9; rx += 2) for (let ry = -9; ry <= 9; ry += 2) {
    const map = generateRegion('sea-borders', rx, ry, 2); applyLandscape(map, 'sea-borders', rx, ry, { version, openSea: 3 });
    for (const t of map.tiles) {
      if (!(t.x === 0 || t.y === 0 || t.x === 31 || t.y === 31)) continue;
      const inner = map.tiles[Math.min(30, Math.max(1, t.y)) * 32 + Math.min(30, Math.max(1, t.x))];
      if (inner.kind !== 'shallows') continue;
      edges++; if (t.blocked && !['ocean', 'deepOcean', 'lakeWater', 'shallows'].includes(t.kind)) walled++;
    }
  }
  return { edges, walled };
}
test('water reaching a section edge opens the border in landscape version 3', () => {
  const v3 = walledShallowEdges(3), v2 = walledShallowEdges(2);
  assert.ok(v3.edges > 20, 'the sample has shallow water at section edges');
  assert.ok(v3.walled < v2.walled * .5, `v3 walls ${v3.walled} of ${v3.edges} shallow edges; v2 kept ${v2.walled}`);
});
