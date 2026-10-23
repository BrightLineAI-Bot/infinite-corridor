// Release 351: Sleeper's Hall, the Far Sleep's dream crossings (docs/narrative-bible.md section 7, step 4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExpeditionDungeon, reachableInMap, DREAM_HALL } from '../src/underlands.ts';
import { generatePinnedDungeon } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { freshSave } from '../src/types.ts';

const far = (i) => `dungeon:D:g1:30:${10 + (i % 5)}:dungeon-g1-30-${10 + (i % 5)}-${i}`;

test('a Sleeper\'s Hall: meadow floors, night-sky walls, sleeping stones, terraces with stairs, petals; all reachable', () => {
  let stones = 0, stairs = 0;
  for (let i = 0; i < 40; i++) {
    const m = generateExpeditionDungeon('D', far(i), 'hollow', { layoutPool: 5, themePool: 3, theme: 'dream' });
    assert.equal(m.theme, 'dream'); assert.equal(m.weather, 'petals'); assert.match(m.name, /^Sleeper's Hall · /);
    const kinds = new Set(m.tiles.map((t) => t.kind));
    assert.ok(kinds.has('sleepMeadow') && kinds.has('starVoid'), [...kinds].join());
    for (const t of m.tiles) if (t.kind === 'starVoid') assert.ok(t.blocked && !t.environment, 'impassable, never lethal');
    stones += m.tiles.filter((t) => t.kind === 'sleeperStone').length; stairs += m.tiles.filter((t) => t.kind === 'dreamStair').length;
    const seen = reachableInMap(m, m.entry), w = m.width;
    for (const e of m.enemySpawns.filter((q) => q.dungeonRole === 'gateWarden')) assert.ok(seen[e.y * w + e.x], `${far(i)}: guardian reachable`);
    for (const o of m.objects.filter((q) => q.actions?.length)) assert.ok([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(o.y + dy) * w + o.x + dx]), `${far(i)}: ${o.kind} reachable`);
  }
  assert.ok(stones > 0 && stairs > 0, `${stones} stones, ${stairs} stairs`);
});

test('a crossing first found in the Far Sleep is pinned a Sleeper\'s Hall; nearer ones and older histories are not', () => {
  const s = freshSave(); s.seed = 'D';
  const id = far(3), m = generatePinnedDungeon(s, id);
  assert.equal(s.consequences.dungeons[id].dream, DREAM_HALL.version); assert.equal(m.theme, s.consequences.dungeons[id].mire ? 'poisonCrypt' : 'dream');
  assert.equal(generatePinnedDungeon(s, id).tiles.map((t) => t.kind).join(), m.tiles.map((t) => t.kind).join(), 'the same hall every time');
  const near = 'dungeon:D:g1:3:4:dungeon-g1-3-4-1'; generatePinnedDungeon(s, near); assert.equal(s.consequences.dungeons[near].dream, undefined);
  const old = 'dungeon:D:g1:30:12:old', h = dungeonHistory(s, old); h.generatorVersion = 5; h.layoutPool = 5; h.themePool = 3;
  const before = generatePinnedDungeon(s, old); assert.equal(h.dream, undefined); assert.notEqual(before.theme, 'dream', 'pinned before 351: unchanged');
});
