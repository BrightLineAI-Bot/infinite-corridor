// Release 583 (Tim, 2026-10-30: "let's do the volcanic region next"): from landscape version 7 some still-wild regions are
// firelands: black basalt split by glowing fissures, ash drifts, lava pools that never cut ground off, sometimes a caldera,
// embers falling. Named and coloured on the Atlas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, regionName, REGION_NAMES, LANDSCAPE_VERSION, FIRE, LETHAL_KINDS } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';
import { REGION_BANNER } from '../src/game.ts';

const SEED = 'FIRE583';
const sections = (n) => { const out = []; for (let x = 14; x < 160 && out.length < n; x++) for (let y = 14; y < 160 && out.length < n; y += 3) { const r = sectionRegion(SEED, x, y, 7); if (r.type === 'volcanic' && r.hold >= 1) out.push([x, y]); } return out; };
const make = (x, y, version = 7) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version }); return m; };

test('version 7 turns some still-wild regions volcanic; every other region keeps its version 6 type', () => {
  assert.equal(LANDSCAPE_VERSION, 12); const types = new Set();
  for (let x = 14; x < 120; x += 2) for (let y = 14; y < 120; y += 2) {
    const a = sectionRegion(SEED, x, y, 6), b = sectionRegion(SEED, x, y, 7); types.add(b.type);
    assert.equal(a.id, b.id); if (a.type !== 'wild') assert.equal(b.type, a.type); else assert.ok(['wild', 'volcanic'].includes(b.type));
  }
  assert.ok(types.has('volcanic') && types.has('lunar') && types.has('wild'));
});

test('a fireland is basalt with fissures, ash and lava pools; lava never cuts walkable ground off from the plaza', () => {
  let calderas = 0;
  for (const [x, y] of sections(6)) {
    const m = make(x, y), k = {}; for (const t of m.tiles) k[t.kind] = (k[t.kind] || 0) + 1;
    assert.ok(k.basalt > 150 && k.basaltFissure > 0 && k.lava > 0, JSON.stringify(k)); assert.equal(m.weather, 'embers'); assert.equal(m.landscape.name, 'Firelands');
    assert.ok(m.tiles.filter((t) => t.landscape === 'volcanic' && t.kind !== 'lava').every((t) => !t.blocked), 'basalt, fissures and ash are walkable');
    assert.ok(LETHAL_KINDS.has('lava'));
    // flood from the plaza, with and without lava as a wall: lava pools never cut off ground that was reachable without them
    const flood = (lavaWall) => { const seen = new Uint8Array(1024), q = [16 * 32 + 16]; seen[q[0]] = 1;
      for (let h = 0; h < q.length; h++) { const i = q[h], cx = i % 32, cy = Math.floor(i / 32); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, j = ny * 32 + nx; if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j] || m.tiles[j].blocked || (lavaWall && m.tiles[j].kind === 'lava')) continue; seen[j] = 1; q.push(j); } }
      return seen; };
    const open = flood(false), withLava = flood(true), poolLava = (i) => m.tiles[i].kind === 'lava' && m.tiles[i].landscape === 'volcanic';
    for (let i = 0; i < 1024; i++) if (open[i] && !withLava[i] && !(m.tiles[i].kind === 'lava') && !m.volcano) assert.fail(`tile ${i % 32},${Math.floor(i / 32)} in ${x},${y} cut off by lava`);
    assert.ok(m.tiles.some((t, i) => poolLava(i)));
    if (m.volcano) calderas++;
    assert.deepEqual(make(x, y), m, 'deterministic');
    assert.ok(!make(x, y, 6).tiles.some((t) => t.landscape === 'volcanic'), 'ground pinned to version 6 is untouched');
  }
  assert.ok(FIRE.pools[1] <= 6, 'bounded');
});

test('firelands are named, announced and coloured on the Atlas', () => {
  const [x, y] = sections(1)[0], name = regionName(SEED, sectionRegion(SEED, x, y, 7));
  assert.ok(REGION_NAMES.nouns.volcanic.some((n) => name.endsWith(` ${n}`)), name); assert.equal(REGION_BANNER.kinds.volcanic, 'Firelands');
  for (const k of ['basalt', 'basaltFissure']) assert.match(ATLAS_TILE_COLORS[k], /^#[0-9a-f]{6}$/);
});
