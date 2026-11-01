// Tim (2026-11-01): world beasts tuned to the Wayfarer's level, but "I wanna be able to... test my gear... see how fast I can
// beat them... speed run them": their health is counted in a standard Wayfarer's blows at that level (not your own gear), their
// damage still follows your health and guard, and each kill from full health is timed against your best.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { WORLD_BEAST_IDS, tuneWorldBeast, standardHit, STANDARD_HIT, BEAST_BASELINE } from '../src/world-beasts.ts';
import { createCombatant } from '../src/combat.ts';

test("a beast's health follows your level, not your weapon; its damage still follows your health and guard", () => {
  assert.equal(standardHit(8), BEAST_BASELINE.starterHit); assert.equal(standardHit(60), BEAST_BASELINE.starterHit + 52 * STANDARD_HIT.perLevel);
  for (const id of WORLD_BEAST_IDS) {
    const tune = (power, level, maxHp) => { const s = freshSave(); s.level = level; s.maxHp = maxHp; s.equipment.primary.power = power; const e = createCombatant(id, 0, 0, true); return tuneWorldBeast(e, s, id, characterStats(s)); };
    const weak = tune(10, 40, 300), strong = tune(90, 40, 300);
    assert.equal(strong.maxHp, weak.maxHp, `${id}: the same health whatever your weapon`);
    assert.ok(tune(10, 70, 300).maxHp > weak.maxHp, `${id}: more at a higher level`);
    assert.ok(tune(10, 40, 900).damage > weak.damage, `${id}: it still hits as hard as your health`);
  }
});

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
