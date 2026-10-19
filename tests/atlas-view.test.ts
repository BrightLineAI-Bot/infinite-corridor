import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { discoverReading } from '../src/lore.ts';
import { ATLAS_ZOOM, clampZoom, sectionPixels, worldView, exploredSections, boundsOf, frame, panStep, atlasPlaces } from '../src/atlas-view.ts';

test('the Atlas zooms from a single section to hundreds across', () => {
  assert.equal(clampZoom(100), ATLAS_ZOOM.max);
  assert.equal(clampZoom(0), ATLAS_ZOOM.min);
  assert.ok(680 / sectionPixels(ATLAS_ZOOM.min) > 500, 'at least 500 sections across a 680-pixel map');
  assert.ok(worldView(.1) && !worldView(1));
  assert.ok(panStep(ATLAS_ZOOM.min, 680) > 100 && panStep(3, 680) === 1);
});

test('framing fits any set of sections into the view', () => {
  assert.equal(frame(null, 600, 400), null);
  const b = boundsOf([[-30, 5], [40, -12], [0, 0]]);
  assert.deepEqual(b, { minX: -30, minY: -12, maxX: 40, maxY: 5 });
  const f = frame(b, 600, 400);
  assert.equal(f.x, 5); assert.ok(f.y === -3 || f.y === -4);
  assert.ok((b.maxX - b.minX + 1) * sectionPixels(f.zoom) <= 600);
  assert.ok(frame({ minX: 3, maxX: 3, minY: 3, maxY: 3 }, 600, 400).zoom <= ATLAS_ZOOM.max);
});

test('places are grouped by region; unheard regions are never named', () => {
  const s = freshSave(); s.seed = 'places'; s.explored = {}; s.atlas = {};
  for (const [x, y, sites] of [[0, 0, []], [1, 0, [{ kind: 'checkpoint', name: 'Wayglass', x: 3, y: 3 }]], [0, -12, [{ kind: 'shack', name: 'Shelter', x: 1, y: 1 }]], [12, 0, [{ kind: 'architecturalDistrict', name: 'Old Quarter', x: 1, y: 1 }, { kind: 'supplyCache', name: 'Supply Cache', x: 2, y: 2 }]]]) { s.explored[`${x},${y}`] = true; s.atlas[`${x},${y}`] = { terrain: 'ash', sites }; }
  assert.equal(exploredSections(s).length, 4);
  discoverReading(s, 'longCampaign'); discoverReading(s, 'riverThatRemembers');
  const g = atlasPlaces(s), names = g.map((q) => q.name);
  assert.deepEqual(names, ['The Smoke Meadows', 'The Ferry Reaches', 'Elsewhere']);
  assert.deepEqual(g[0].places.map((p) => p.name), ['Ember Refuge', 'Wayglass']);
  assert.deepEqual(g[1].places.map((p) => p.kind), ['shack']);
  assert.deepEqual(g[2].places.map((p) => p.name), ['Old Quarter'], 'supply caches are not destinations');
  assert.deepEqual(g[2].bounds, { minX: 12, minY: 0, maxX: 12, maxY: 0 });
});
