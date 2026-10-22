// Release 289 (Tim, 2026-10-22): the Watcher's sigil in the world, and pristine tombs that fold the Wayfarer elsewhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WATCHER, SIGIL_CELLS, inlaySigil, placeWatcherOverworld, placeWatcherDungeon, dungeonFoldTarget, sigilSpot } from '../src/watcher.ts';
import { canStep } from '../src/landscape.ts';

const flat = (w = 32, extra = {}) => ({ width: w, height: w, landscape: { biome: 'mountains' }, objects: [], tiles: Array.from({ length: w * w }, (_, i) => ({ x: i % w, y: Math.floor(i / w), kind: 'grass', blocked: false, elev: 0, landscape: 'mountains', ...extra })) });

test('the sigil: lid, ring, eye, pupil, orbit and tools; a shrine raises it so each part is one jump from the next', () => {
  const parts = new Set(SIGIL_CELLS.map((c) => c.part)); for (const p of ['lid', 'ring', 'eye', 'pupil', 'orbit', 'tools']) assert.ok(parts.has(p), p);
  const m = flat(); inlaySigil(m, 32, 16, 14, { shrine: true });
  const body = { isPlayer: true, jumping: true };
  for (const t of m.tiles) for (const [dx, dy] of [[1, 0], [0, 1]]) { const n = m.tiles[(t.y + dy) * 32 + t.x + dx]; if (n && t.x + dx < 32 && t.y + dy < 32) assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `step ${t.x},${t.y}`); }
  assert.equal(m.tiles[14 * 32 + 16].elev, 2, 'the pupil is the summit'); assert.equal(m.tiles[14 * 32 + 16].sigil, 'pupil');
  assert.equal(canStep(body, m, 32, 16, 13.3, 16, 14.3), true);
});

test('placement is seeded, rare, once per map, and keeps clear of the home section', () => {
  let shrines = 0, shelters = 0;
  for (let rx = 1; rx < 400; rx++) { const m = flat(); m.tiles[5 * 32 + 5].structure = 'shackInterior'; const r = placeWatcherOverworld(m, 32, 'SEED', rx, 3); if (r?.shrine) shrines++; if (r?.shelter) shelters++; assert.equal(placeWatcherOverworld(m, 32, 'SEED', rx, 3), null, 'once per map'); }
  assert.ok(shrines > 60 && shrines < 140, `shrines ${shrines} (every flat test map has room, so about a quarter)`); assert.ok(shelters >= 4 && shelters < 30, `shelters ${shelters}`);
  assert.equal(placeWatcherOverworld(flat(), 32, 'SEED', 0, 0), null);
  const a = flat(), b = flat(); placeWatcherDungeon(Object.assign(a, { arena: true }), 32, 'S', 'arena:x'); placeWatcherDungeon(Object.assign(b, { arena: true }), 32, 'S', 'arena:x');
  assert.deepEqual(a.tiles.map((t) => t.sigil || ''), b.tiles.map((t) => t.sigil || '')); assert.ok(a.tiles.some((t) => t.sigil === 'border'), 'arenas carry the mosaic border');
});

test('a crypt tomb sits beside a coffin; below ground it folds the Wayfarer far across reachable floor', () => {
  let found = 0;
  for (let k = 0; k < 40; k++) { const m = flat(); for (let x = 3; x < 29; x += 3) Object.assign(m.tiles[20 * 32 + x], { kind: 'sarcophagus', blocked: true }); const r = placeWatcherDungeon(m, 32, 'S', `dungeon:${k}`); if (r.tomb) { found++; const o = m.objects.find((q) => q.kind === 'watcherTomb'); assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => m.tiles[(o.y + dy) * 32 + o.x + dx].kind === 'sarcophagus')); } }
  assert.ok(found > 5 && found < 30, `${found}`);
  const floor = new Set(Array.from({ length: 1024 }, (_, i) => i)); const to = dungeonFoldTarget(floor, 32, { x: 2, y: 2 }, 'k');
  assert.ok(Math.hypot(to.x - 2, to.y - 2) >= WATCHER.foldMinTiles); assert.equal(dungeonFoldTarget('none', 32, { x: 2, y: 2 }, 'k'), null);
  assert.equal(sigilSpot(flat(8), 8, 'k', () => true), null, 'no room, no sigil');
});
