// Tim (2026-11-01): "see how fast I can beat them... speed run them". Boss tuning is unchanged (Tim: "The way it's scaled is
// fine... don't change them"); each kill from full health is timed against your best.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

test('a kill from full health is timed and your best kept; a wounded beast is not timed', () => {
  const s = freshSave(); s.seed = 'SPEEDRUN'; const g = new Game(s, 0); g.rx = 7; g.ry = 2; g.loadArea('overworld', false);
  const fight = (id, start, end, wounded = false) => {
    const e = g.createEnemyFromSpawn({ id: `world-beast:${id}:t${start}`, kind: id, worldBeast: id, boss: true, x: 10, y: 10 }, 'overworld'); if (wounded) e.hp = Math.round(e.maxHp * .6);
    g.enemies.push(e); g.beastClock(start); e.hp -= 5; g.beastClock(start + 100); e.hp = 0; e.dead = true; g.lastUpdateNow = end; g.defeatEnemy(e); return g.defeatNotice?.detail || '';
  };
  assert.match(fight('morphingBlob', 1000, 46100), /felled in 45\.0 s · your best/); assert.equal(s.beastTimes.morphingBlob, 45);
  assert.match(fight('morphingBlob', 1000, 31100), /felled in 30\.0 s · a new best \(was 45\.0 s\)/); assert.equal(s.beastTimes.morphingBlob, 30);
  assert.match(fight('morphingBlob', 1000, 61100), /felled in 60\.0 s · best 30\.0 s/); assert.equal(s.beastTimes.morphingBlob, 30);
  assert.doesNotMatch(fight('mountainTurtle', 1000, 5000, true), /felled in/); assert.equal(s.beastTimes.mountainTurtle, undefined);
  const m = migrateSave(JSON.parse(JSON.stringify({ ...s, beastTimes: { morphingBlob: 30, bad: -2, worse: 'x' } }))); assert.deepEqual(m.beastTimes, { morphingBlob: 30 });
  assert.deepEqual(freshSave().beastTimes, {});
});
