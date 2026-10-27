// Release 499 (Tim, 2026-10-27): "if a dungeon will [spawn] in that tile, sometimes it can be spawned in a building. If there's
// a building in that tile, no other changes beyond that".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen, INDOOR_DUNGEON } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';

const reachable = (map, from, to) => { // a walk over open footprints from the section edge
  const seen = new Set(), q = [], key = (x, y) => `${x},${y}`;
  for (let n = 0; n < 32; n++) for (const [x, y] of [[n, 1], [n, 30], [1, n], [30, n]]) if (footprintOpen(map, 32, x, y) && !seen.has(key(x, y))) { seen.add(key(x, y)); q.push([x, y]); }
  for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; if (Math.abs(x - to.x) <= 1 && Math.abs(y - to.y) <= 1) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen.has(key(nx, ny)) || !footprintOpen(map, 32, nx, ny)) continue; seen.add(key(nx, ny)); q.push([nx, ny]); } }
  return false;
};

test('in sections first seen now, a dungeon entrance sometimes stands inside a building, reachable, the same every visit', () => {
  let both = 0, inside = 0, unreachable = 0;
  const s = migrateSave(freshSave()); s.seed = 'DUN-1'; const g = new Game(s, 0);
  for (let rx = -12; rx <= 12; rx++) for (let ry = -12; ry <= 12; ry++) {
    const base = generateRegion('DUN-1', rx, ry, s.worldGeneration); if (!base.objects.some((o) => o.kind === 'dungeon') || !base.tiles.some((t) => t.buildingId)) continue;
    g.rx = rx; g.ry = ry; g.loadArea('overworld', false); const d = g.map.objects.find((o) => o.kind === 'dungeon'); if (!d) continue; both++;
    if (d.indoors) { inside++; const t = g.map.tiles[d.y * 32 + d.x]; assert.match(String(t.structure), /Interior/); if (!reachable(g.map, null, d)) unreachable++;
      g.loadArea('overworld', false); const again = g.map.objects.find((o) => o.kind === 'dungeon'); assert.deepEqual([again.x, again.y], [d.x, d.y], 'the same spot on a return'); }
    assert.equal(s.atlas[`${rx},${ry}`].indoorDungeonVersion, INDOOR_DUNGEON.version);
  }
  assert.ok(both > 10, `${both} sections hold both`); assert.ok(inside > both * .25 && inside < both * .75, `${inside} of ${both} indoors`);
  assert.ok(unreachable <= inside * .1, `${unreachable} of ${inside} indoor entrances unreachable`);
});

test('a section explored before this release keeps its entrance where it was', () => {
  const s = migrateSave(freshSave()); s.seed = 'DUN-1'; const g = new Game(s, 0); let checked = 0;
  for (let rx = -12; rx <= 12 && checked < 15; rx++) for (let ry = -12; ry <= 12 && checked < 15; ry++) {
    const base = generateRegion('DUN-1', rx, ry, s.worldGeneration), bd = base.objects.find((o) => o.kind === 'dungeon'); if (!bd || !base.tiles.some((t) => t.buildingId)) continue;
    s.atlas[`${rx},${ry}`] = { terrain: base.dominant }; // seen before release 499
    g.rx = rx; g.ry = ry; g.loadArea('overworld', false); const d = g.map.objects.find((o) => o.kind === 'dungeon'); if (!d) continue;
    assert.equal(d.indoors, undefined); assert.equal(s.atlas[`${rx},${ry}`].indoorDungeonVersion, undefined); checked++;
  }
  assert.ok(checked > 5);
});
