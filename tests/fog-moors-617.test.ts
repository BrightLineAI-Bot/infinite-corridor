// Release 617 (the daily world-regions work; Tim's list: "fog regions"): fog moors in version 9: grey heath, mist-pools to wade,
// leaning standing stones and drifting fog; explored ground (versions 1 to 8) never changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, regionName, REGION_NAMES, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';

const SEED = 'FOG617';
const make = (x, y, version = 9) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version }); return m; };
const moor = (x, y) => make(x, y).tiles.filter((t) => t.kind === 'fogMoor').length > 300;
const sections = (n, ok = moor) => { const out = []; for (let x = 14; x < 200 && out.length < n; x++) for (let y = 14; y < 200 && out.length < n; y += 3) { const r = sectionRegion(SEED, x, y, 9); if (r.type === 'fog' && r.hold >= 1 && ok(x, y)) out.push([x, y]); } return out; };

test('version 9 turns some still-wild regions into fog moors; every other region keeps its version 8 type', () => {
  assert.equal(LANDSCAPE_VERSION, 9); const types = new Set();
  for (let x = 14; x < 120; x += 2) for (let y = 14; y < 120; y += 2) { const a = sectionRegion(SEED, x, y, 8), b = sectionRegion(SEED, x, y, 9); types.add(b.type); assert.equal(a.id, b.id); if (a.type !== 'wild') assert.equal(b.type, a.type); else assert.ok(['wild', 'fog'].includes(b.type)); }
  assert.ok(types.has('fog') && types.has('wild'), [...types].join());
  const r = sectionRegion(SEED, ...sections(1, () => true)[0], 9); assert.ok(REGION_NAMES.nouns.fog.some((n) => regionName(SEED, r).endsWith(` ${n}`)));
});

test('a fog moor: heath, wadeable mist-pools, impassable stones, fog weather; deterministic; version 8 has none', () => {
  for (const [x, y] of sections(6)) {
    const m = make(x, y), k = {}; for (const t of m.tiles) k[t.kind] = (k[t.kind] || 0) + 1;
    assert.ok(k.fogMoor > 150, JSON.stringify(k)); assert.equal(m.weather, 'fog');
    assert.ok(m.tiles.filter((t) => t.kind === 'moorStone').every((t) => t.blocked)); assert.ok(m.tiles.filter((t) => t.kind === 'fogMoor' || t.kind === 'mistPool').every((t) => !t.blocked));
    assert.deepEqual(make(x, y), m); assert.ok(!make(x, y, 8).tiles.some((t) => t.landscape === 'fog'));
  }
  assert.ok(sections(12).some(([x, y]) => make(x, y).tiles.some((t) => t.kind === 'mistPool')), 'some mist-pools');
  for (const k of ['fogMoor', 'mistPool', 'moorStone']) assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`);
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /g\.map\.weather==="fog"/);
});

test('in the game: the banner names the fog moors and the atlas pins version 9', () => {
  const [x, y] = sections(1)[0], s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 9); const b = (g.questNotices || []).find((q) => q.kind === 'discovery' && q.detail === 'Fog moors'); assert.ok(b || g.map.landscape.biome !== 'fog');
});
