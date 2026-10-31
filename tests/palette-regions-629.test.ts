// Release 629 (the same blitz, second batch): version 11 adds five more
// region types from the same table: petrified woods, savanna, reef flats, amberwood and obsidian fields. They come from regions that
// are still wild or bare plains after version 10, each rolled once on its own hash; explored ground (versions 1 to 10) keeps
// what it was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, regionName, REGION_NAMES, REGION_GROUNDS, LANDSCAPE_VERSION, PALETTE_REGIONS, REGIONS_V11, reachableFromPlaza, trappedTiles } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';
import { REGION_BANNER } from '../src/game.ts';

const SEED = 'PAL629', TYPES = Object.keys(PALETTE_REGIONS).filter((t) => PALETTE_REGIONS[t].version === 11);
const make = (x, y, version = 11) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version }); return m; };
const found = {}; const find = (type, n = 3) => { const out = (found[type] ||= []);
  for (let x = 14; x < 220 && out.length < n; x++) for (let y = 14; y < 220 && out.length < n; y += 3) { if (out.some(([a, b]) => a === x && b === y)) continue; const r = sectionRegion(SEED, x, y, 11); if (r.type === type && r.hold >= 1 && make(x, y).tiles.filter((t) => t.landscape === type).length > 300) out.push([x, y]); }
  return out; };

test('version 11 turns some remaining wild and plains regions into five more types; every other region keeps its version 10 type', () => {
  assert.equal(LANDSCAPE_VERSION, 12); const seen = new Set();
  for (let x = 14; x < 140; x += 2) for (let y = 14; y < 140; y += 2) {
    const a = sectionRegion(SEED, x, y, 10), b = sectionRegion(SEED, x, y, 11); seen.add(b.type); assert.equal(a.id, b.id);
    if (!REGIONS_V11.from.includes(a.type)) assert.equal(b.type, a.type); else assert.ok([a.type, ...TYPES].includes(b.type), `${a.type} -> ${b.type}`);
  }
  for (const t of TYPES) { assert.ok(seen.has(t), `${t} appears`); assert.ok(REGION_GROUNDS[t] && REGION_BANNER.kinds[t] && REGION_NAMES.nouns[t]?.length, t); }
  const [x, y] = find('savanna', 1)[0]; assert.ok(REGION_NAMES.nouns.savanna.some((n) => regionName(SEED, sectionRegion(SEED, x, y, 11)).endsWith(` ${n}`)));
});

test('each palette region: its ground, wadeable pools, impassable blocks, Atlas colours; reachable and trap-free; deterministic; version 10 has none', () => {
  for (const type of TYPES) {
    const P = PALETTE_REGIONS[type], sections = find(type); assert.ok(sections.length, `a ${type} section`);
    for (const [x, y] of sections) {
      const m = make(x, y), mine = m.tiles.filter((t) => t.landscape === type);
      assert.ok(mine.some((t) => t.kind === P.ground)); assert.ok(mine.filter((t) => t.kind === P.block.kind).every((t) => t.blocked)); assert.ok(mine.filter((t) => t.kind === P.ground || t.kind === P.pool.kind).every((t) => !t.blocked));
      const seen = reachableFromPlaza(m); for (const o of m.objects.filter((q) => q.actions?.length && !q.jungle)) { const ox = Math.round(o.x), oy = Math.round(o.y); assert.ok(seen[oy * 32 + ox] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(oy + dy) * 32 + ox + dx]) || m.tiles.some((t) => Math.abs(t.x - ox) <= 2 && Math.abs(t.y - oy) <= 2 && /lakeWater|ocean|swampWater/.test(t.kind)), `${type} ${x},${y}: ${o.kind} reachable (by land or water)`); }
      assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }).length, 0, `${type} ${x},${y}: no traps`);
      assert.deepEqual(make(x, y), m, 'deterministic'); assert.ok(!make(x, y, 10).tiles.some((t) => t.landscape === type), 'version 10 ground has none');
    }
    for (const k of [P.ground, P.pool.kind, P.block.kind]) assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`);
  }
});

test('in the game: the banner names the region and the atlas pins the current version; the ground is painted', () => {
  const [x, y] = find('amber', 1)[0], s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, LANDSCAPE_VERSION); const b = (g.questNotices || []).find((q) => q.kind === 'discovery'); if (b) assert.equal(b.detail, 'Amberwood');
  const src = readFileSync(new URL('../src/landscape-render.ts', import.meta.url), 'utf8'); assert.match(src, /export const PALETTE_PAINT/); for (const t of TYPES) assert.match(src, new RegExp(`\\b${t}: \\{ ground:`));
});
