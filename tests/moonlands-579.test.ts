// Release 579 (the daily world-regions work; Tim: "a lunar / alien-planet surface"): from landscape version 6 some wild
// regions are moonlands: grey dust pocked with craters, all walkable, named and coloured on the Atlas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, regionName, REGION_NAMES, LANDSCAPE_VERSION, MOON } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { REGION_BANNER } from '../src/game.ts';

const SEED = 'MOON579';
function find(type, version = 6) { for (let x = 14; x < 140; x++) for (let y = 14; y < 140; y += 2) { const r = sectionRegion(SEED, x, y, version); if (r.type === type && r.hold >= 1) return [x, y]; } }

test('version 6 turns some still-wild regions into moonlands; forests, frostlands and every other region stay as in version 5', () => {
  assert.equal(LANDSCAPE_VERSION, 9); const types = new Set();
  for (let x = 14; x < 120; x += 2) for (let y = 14; y < 120; y += 2) {
    const a = sectionRegion(SEED, x, y, 5), b = sectionRegion(SEED, x, y, 6); types.add(b.type);
    assert.equal(a.id, b.id); if (a.type !== 'wild') assert.equal(b.type, a.type); else assert.ok(['wild', 'lunar'].includes(b.type));
  }
  assert.ok(types.has('lunar') && types.has('wild') && types.has('forest'));
});

test('a moonland section is grey dust with craters, every tile of it walkable, the same each time', () => {
  const [rx, ry] = find('lunar'), m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, { version: 6 });
  const kinds = {}; for (const t of m.tiles) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
  assert.ok(kinds.moonDust > 200, JSON.stringify(kinds)); assert.ok(kinds.craterFloor > 0 && kinds.craterRim > 0, 'craters');
  assert.ok(m.tiles.filter((t) => t.landscape === 'lunar').every((t) => !t.blocked)); assert.equal(m.landscape.name, 'Moonlands');
  const again = generateRegion(SEED, rx, ry); applyLandscape(again, SEED, rx, ry, { version: 6 }); assert.deepEqual(again, m);
  const old = generateRegion(SEED, rx, ry); applyLandscape(old, SEED, rx, ry, { version: 5 }); assert.ok(!old.tiles.some((t) => t.landscape === 'lunar'), 'ground pinned to version 5 is untouched');
  assert.ok(MOON.craters[1] <= 4, 'bounded');
});

test('moonlands are named, announced and coloured on the Atlas', () => {
  const r = sectionRegion(SEED, ...find('lunar'), 6), name = regionName(SEED, r);
  assert.ok(REGION_NAMES.nouns.lunar.some((n) => name.endsWith(` ${n}`)), name); assert.equal(REGION_BANNER.kinds.lunar, 'Moonlands');
  for (const k of ['moonDust', 'craterFloor', 'craterRim']) assert.match(ATLAS_TILE_COLORS[k], /^#[0-9a-f]{6}$/);
  const grey = sectionAtlasColor({ tiles: Array(10).fill({ kind: 'moonDust' }) }), n = parseInt(grey.slice(1), 16);
  assert.ok(Math.abs(((n >> 16) & 255) - (n & 255)) < 20, 'reads grey');
});
