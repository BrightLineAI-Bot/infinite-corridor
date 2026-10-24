// Release 419 (Tim: "I keep getting spawned in... out of bound areas... when I get spawned into the second level of a dungeon
// the dungeon will be just black... it spawns me right by The Guardian... a hard rule where you don't get placed next to the
// guardian"): every dungeon arrival lands on the floor the level's entry stands on, and never within ARRIVAL.clear of a
// living guardian.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, ARRIVAL, settleDungeonArrival, isDungeonGuardian, footprintOpen, mapWidth, deepDungeonProgress } from '../src/game.ts';
import { DEEP_ARCHETYPE_IDS, deepV2Id } from '../src/deep-dungeons.ts';

// The floor reachable from the level's entry.
const floorOf = (map, w) => { const h = Math.floor(map.tiles.length / w), e = map.entry, seen = new Set([e.y * w + e.x]), q = [[e.x, e.y]]; for (let k = 0; k < q.length; k++) { const [x, y] = q[k]; if (!footprintOpen(map, w, x, y)) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, i = ny * w + nx; if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(i)) continue; seen.add(i); q.push([nx, ny]); } } return seen; };
// A Game standing on the deepest level of a multi-level deep dungeon.
function lowest(archetype, i = 0) {
  const s = freshSave(); s.seed = `ARRIVE419-${i}`; const id = deepV2Id(s.seed, 1, i, -i, archetype);
  s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: i, ry: -i, x: 8, y: 8 }; const g = new Game(s, 0); g.loadArea('dungeon', false);
  if (!g.map.multiLevel) return null; const last = g.map.levels[g.map.levels.length - 1]; s.session.activeDungeonLevelId = last.id; g.loadArea('dungeon', false); return g;
}
const sound = (g, label) => {
  const w = mapWidth(g.map, 'dungeon'), p = g.player, h = Math.floor(g.map.tiles.length / w);
  assert.ok(p.x >= 0 && p.y >= 0 && p.x < w && p.y < h, `${label}: in bounds`); assert.ok(footprintOpen(g.map, w, p.x, p.y), `${label}: on open ground`);
  assert.ok(floorOf(g.map, w).has(Math.round(p.y) * w + Math.round(p.x)), `${label}: on the level's own floor`);
  for (const e of g.enemies.filter((q) => !q.dead && isDungeonGuardian(q))) assert.ok(Math.hypot(e.x - p.x, e.y - p.y) >= ARRIVAL.clear, `${label}: ${Math.hypot(e.x - p.x, e.y - p.y).toFixed(1)} from ${e.kind}`);
};

test('an arrival inside the sealed guardian chamber, in a wall or out of bounds lands on the open floor, clear of the guardian', () => {
  let checked = 0;
  for (const archetype of DEEP_ARCHETYPE_IDS) {
    const g = lowest(archetype); if (!g) continue; const boss = g.enemies.find((e) => !e.dead && e.dungeonRole === 'finalBoss'); if (!boss) continue;
    for (const at of [{ x: boss.x + 1, y: boss.y + 1 }, { x: 0, y: 0 }, { x: -5, y: 400 }, { x: NaN, y: 3 }]) {
      Object.assign(g.player, at); g.settleArrival(); sound(g, `${archetype} at ${at.x},${at.y}`); checked++;
    }
  }
  assert.ok(checked >= 4, `checked ${checked}`);
});

test('a sound arrival is left alone; the floor rule alone does not move a resumed Wayfarer away from a fight', () => {
  const g = lowest(DEEP_ARCHETYPE_IDS[0]) || lowest(DEEP_ARCHETYPE_IDS[1]); const w = mapWidth(g.map, 'dungeon');
  Object.assign(g.player, { x: g.map.entry.x, y: g.map.entry.y }); assert.equal(settleDungeonArrival(g.map, w, g.player, g.enemies), null);
  const foe = { x: g.map.entry.x + 1, y: g.map.entry.y, boss: true, kind: 'rootBrute' };
  assert.equal(settleDungeonArrival(g.map, w, g.player, [foe], false), null, 'resume keeps you where you were');
  const to = settleDungeonArrival(g.map, w, g.player, [foe]); assert.ok(to && Math.hypot(foe.x - to.x, foe.y - to.y) >= ARRIVAL.clear, 'an arrival is moved clear');
});

test('a fall on a lower level recovers to a sound spot even when the anchor sits in the sealed chamber', () => {
  let checked = 0;
  for (const archetype of DEEP_ARCHETYPE_IDS) {
    const g = lowest(archetype, 1); if (!g) continue; const boss = g.enemies.find((e) => !e.dead && e.dungeonRole === 'finalBoss'); if (!boss) continue;
    deepDungeonProgress(g.save, g.areaId()).activeAnchor = { id: 'test', x: boss.x, y: boss.y + 2, levelId: g.map.levelId, name: 'test anchor' };
    g.player.hp = 0; g.recoverFromDeath(5000); sound(g, `${archetype} recovery`); checked++;
  }
  assert.ok(checked >= 1);
});
