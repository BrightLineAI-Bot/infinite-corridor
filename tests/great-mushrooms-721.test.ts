// Release 721 (Tim, 2026-11-03): great mushrooms, as tall as trees, a thousand sections or more out, hopped up one cap at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GREAT_MUSHROOMS, MUSHROOM_KINDS, growMushrooms } from '../src/great-mushrooms.ts';
import { LANDSCAPE_VERSION, sectionRegion, canStep, fallDamage, reachableFromPlaza, isLandscapeKind } from '../src/landscape.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const seed = 'MUSH721';
const load = (rx, ry, atlas = null) => { const s = freshSave(); s.seed = seed; if (atlas) s.atlas = atlas; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return g; };
let found = null;
const stand = () => {
  if (found) return found;
  for (let a = 0; a < 6.28; a += .013) { const rx = Math.round(Math.cos(a) * 1150), ry = Math.round(Math.sin(a) * 1150);
    if (!Object.keys(GREAT_MUSHROOMS.regions).includes(sectionRegion(seed, rx, ry, LANDSCAPE_VERSION).type)) continue;
    const g = load(rx, ry); if (g.map.mushrooms?.stands.some((c) => c.length === 3)) return (found = { rx, ry, g }); }
  return null;
};

test('the great mushrooms grow only a thousand sections out, on new ground, the same each time', () => {
  assert.equal(LANDSCAPE_VERSION, 19); assert.equal(GREAT_MUSHROOMS.start, 1000);
  for (const k of MUSHROOM_KINDS) { assert.ok(isLandscapeKind(k), k); assert.ok(ATLAS_TILE_COLORS[k], k); }
  const { rx, ry, g } = stand(); assert.ok(Math.hypot(rx, ry) >= 1000);
  assert.deepEqual(load(rx, ry).map.mushrooms, g.map.mushrooms, 'deterministic');
  const old = load(rx, ry, { [`${rx},${ry}`]: { terrain: 'grass', landscapeVersion: 16 } }); assert.equal(old.map.mushrooms, undefined, 'ground first seen before keeps none');
  assert.ok(old.map.tiles.every((t) => !t.mushroom));
  const near = { tiles: g.map.tiles.map((t) => ({ ...t, mushroom: undefined, elev: 0 })), objects: [], enemySpawns: [] };
  assert.equal(growMushrooms(near, seed, 300, 200, { reachable: reachableFromPlaza }), null, 'not near home');
  assert.equal(growMushrooms(near, seed, rx, ry, { reachable: reachableFromPlaza, version: 16 }), null, 'not before version 17');
});

test('a stand climbs one level a cap to the third, with a cache on top, and walls nothing off', () => {
  const { g } = stand(), m = g.map, at = (x, y) => m.tiles[y * 32 + x], seen = reachableFromPlaza(m);
  for (const caps of m.mushrooms.stands) {
    caps.forEach((c, i) => { assert.equal(c.elev, i + 1); assert.equal(at(c.x, c.y).elev, c.elev); assert.ok(at(c.x, c.y).mushroom); assert.ok(seen[c.y * 32 + c.x], `cap ${i + 1} reached`); });
    for (let i = 1; i < caps.length; i++) { // some tile of each cap borders a tile of the cap below
      const touch = m.tiles.some((t) => t.mushroom && t.elev === i + 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = at(t.x + dx, t.y + dy); return n?.mushroom === t.mushroom && n.elev === i; }));
      assert.ok(touch, `cap ${i + 1} touches cap ${i}`); }
  }
  assert.ok(m.tiles.every((t) => !t.mushroom || (t.elev >= 1 && t.elev <= 3 && !t.blocked)), 'never higher than three');
  assert.notEqual(fallDamage(3, 100), Infinity, 'a fall off the top hurts, never kills');
  const top = m.mushrooms.stands[0].at(-1), cache = m.objects.find((o) => o.id.startsWith('mushroom-cache'));
  assert.ok(cache && cache.kind === 'chest' && cache.x === top.x && cache.y === top.y);
  assert.ok((m.enemySpawns || []).every((q) => !at(Math.round(q.x), Math.round(q.y))?.mushroom), 'nothing spawns on a cap');
  assert.ok(g.enemies.every((e) => !at(Math.round(e.x), Math.round(e.y))?.mushroom));
  assert.ok(g.save.narrative.journal.some((j) => j.recordId === 'great-mushrooms'), 'the journal notes them');
});

test('the Wayfarer hops up a cap; creatures cannot follow', () => {
  const { g } = stand(), m = g.map, at = (x, y) => m.tiles[y * 32 + x];
  const first = m.tiles.find((t) => t.mushroom && t.elev === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = at(t.x + dx, t.y + dy); return n && !n.blocked && !n.mushroom && !(n.elev > 0); }));
  const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { const n = at(first.x + dx, first.y + dy); return n && !n.blocked && !n.mushroom && !(n.elev > 0); });
  const from = [first.x + dx, first.y + dy], to = [first.x, first.y];
  assert.ok(canStep({ isPlayer: true, jumping: true }, m, 32, ...from, ...to), 'a hop up');
  assert.ok(!canStep({ isPlayer: true, jumping: false }, m, 32, ...from, ...to), 'not a walk');
  assert.ok(!canStep({}, m, 32, ...from, ...to), 'creatures stay below');
});

test('caps draw: ground, stalk, gills and dome, into any context', () => {
  const { g } = stand(), m = g.map, calls = []; let n = 0;
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.push(k); }, set: () => true });
  for (const t of m.tiles) if (t.mushroom) { assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, 32), true); n++; }
  assert.ok(n > 10 && calls.includes('arc') && calls.includes('clip'));
  assert.ok(m.tiles.some((t) => t.stalk), 'each cap has its stalk');
});
