// Release 399 (Tim: "the further away... the harder the monsters get... we should also get more experience"): a kill pays
// the regional xpMultiplier the distance scaling already sets on each foe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { regionalThreat } from '../src/world.ts';

test('a far foe gives more experience than a near one', () => {
  const near = freshSave(), far = freshSave(); near.seed = far.seed = 'XP';
  const kill = (s, mult) => { const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); const e = g.createEnemyFromSpawn({ kind: 'ashling', x: 10, y: 10 }); e.xpMultiplier = mult; e.hp = 0; e.dead = true; g.enemies = [e]; g.defeatEnemy(e); return s.xp; };
  const a = kill(near, 1), b = kill(far, regionalThreat(6, 8).xpMultiplier);
  assert.equal(a, 10); assert.equal(b, Math.round(10 * regionalThreat(6, 8).xpMultiplier));
});
