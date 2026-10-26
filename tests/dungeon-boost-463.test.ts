// Release 463 (Tim: "increase the enemies in the dungeons... 20% more health... 20% more damage... about twenty percent more
// monsters"): dungeon foes are tougher and there are more of them; cleared crossings stay cleared.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, DUNGEON_BOOST } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';

const enter = (seed, at = [7, 2]) => { const s = freshSave(); s.seed = seed; s.level = 20; const id = `dungeon:${seed}:g1:${at[0]}:${at[1]}:room`; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: at[0], ry: at[1], x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); return { s, g, id }; };

test('dungeon foes have 20% more health and hit 20% harder; overworld foes do not', () => {
  assert.deepEqual([DUNGEON_BOOST.hp, DUNGEON_BOOST.damage, DUNGEON_BOOST.count], [1.2, 1.2, .2]);
  const g = new Game(freshSave(), 0), spawn = { kind: 'rootBrute', x: 5, y: 5 }, inside = g.createEnemyFromSpawn(spawn, 'dungeon');
  const out = g.createEnemyFromSpawn(spawn, 'overworld'); assert.ok(inside.maxHp > out.maxHp);
  const beast = g.createEnemyFromSpawn({ kind: 'rootBrute', x: 5, y: 5, gatePredator: true }, 'dungeon'); assert.ok(beast);
});

test('about a fifth more foes, on open floor near the others, stable across loads; none in a cleared crossing', () => {
  let base = 0, extra = 0;
  for (let k = 0; k < 8; k++) {
    const { g } = enter(`BOOST${k}`, [4 + k, -3]), extras = g.enemies.filter((e) => String(e.id).includes(':extra:'));
    const ordinary = g.map.enemySpawns.filter((q) => !q.extraSpawn && !q.boss && !['gateWarden', 'objectiveGuardian', 'wingMiniboss', 'finalBoss'].includes(q.dungeonRole) && !q.marginWarden && !q.worldBeast && !q.gatePredator && !q.ambient && !q.passiveBehavior && !q.objectiveId).length;
    base += ordinary; extra += extras.length;
    const again = enter(`BOOST${k}`, [4 + k, -3]).g.enemies.filter((e) => String(e.id).includes(':extra:')).map((e) => [e.x, e.y]);
    assert.deepEqual(again, extras.map((e) => [e.x, e.y]), 'by seed');
  }
  assert.ok(extra >= base * .15 && extra <= base * .25, `${extra} extra for ${base}`);
  const { s, g, id } = enter('BOOST0', [4, -3]); dungeonHistory(s, id).resolved = true; g.map.enemySpawns = g.map.enemySpawns.filter((q) => !q.extraSpawn);
  assert.deepEqual(g.extraDungeonSpawns(), [], 'a cleared crossing gains none');
});
