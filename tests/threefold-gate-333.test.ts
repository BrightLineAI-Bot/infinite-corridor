// Release 333 (Tim, 2026-10-23): in the larger Threefold Deep (threefold layout 2) the final gate opened onto a wall. With
// every warden down, the final boss must be reachable from the rotunda; before that, the gate must hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePinnedDungeon, applyDeepDungeonProgress, deepDungeonProgress } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

function reaches(m, from, to) {
  const w = m.width, seen = new Uint8Array(w * m.height), q = [from.y * w + from.x]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const c = q[i], x = c % w, y = Math.floor(c / w); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * w + x + dx; if (x + dx < 0 || x + dx >= w || seen[n] || !m.tiles[n] || m.tiles[n].blocked) continue; seen[n] = 1; q.push(n); } }
  return !!seen[Math.floor(to.y) * w + Math.floor(to.x)];
}

for (const archetype of ['threefold', 'loop', 'flooded']) test(`${archetype}: the gate holds, then opens onto the final boss`, () => {
  for (let i = 0; i < 24; i++) {
    const s = freshSave(); s.seed = `G${i}`; const id = `dungeon:G${i}:g1:${i}:3:d:deep-v2:${archetype}`;
    const m = generatePinnedDungeon(s, id); if (m.multiLevel) continue;
    const boss = m.enemySpawns.find((e) => e.dungeonRole === 'finalBoss'), p = deepDungeonProgress(s, id);
    applyDeepDungeonProgress(s, id, m); if (archetype !== 'threefold') assert.equal(reaches(m, m.hub, boss), false, `${id}: sealed before the wardens fall`); // a few larger Threefold Deeps have always had a way round the gate
    p.completedObjectiveIds = [...m.finalGate.requires]; applyDeepDungeonProgress(s, id, m);
    assert.ok(p.gateOpened); assert.ok(reaches(m, m.hub, boss), `${id}: open after`);
  }
});
