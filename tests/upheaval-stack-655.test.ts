// Worm's Upheaval (Tim, 2026-11-02, undoing release 655's stacking): "each Dodge made a discrete like puddle underneath the
// creature, and then it would just like pop... the puddles would pop like sequentially... better than having one just large burst".
import test from 'node:test';
import assert from 'node:assert/strict';
import { echoEvent, UPHEAVAL } from '../src/echoes.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';

function arena() {
  const s = freshSave(), g = new Game(s, 0);
  g.map = { ...g.map, width: 24, height: 24, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.echoes.owned.tremorWorm = true; s.echoes.equipped = ['tremorWorm'];
  g.enemies = [Object.assign(createCombatant('rootBrute', 12, 10), { id: 'foe', hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 99 }), Object.assign(createCombatant('rootBrute', 10, 13), { id: 'foe2', hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 99 })];
  return { s, g };
}

test('each dodge lays its own puddle, on a foe not yet marked first; each bursts on its own, one after another', () => {
  const { g } = arena(); echoEvent(g, 'dodge', 1000); echoEvent(g, 'dodge', 1200); echoEvent(g, 'dodge', 1400);
  const p = g.echoPatches.filter((q) => q.upheaval); assert.equal(p.length, 3, 'three puddles, not one ring');
  assert.deepEqual(p.map((q) => q.foe), ['foe', 'foe2', 'foe'], 'the second goes to the other foe; with both marked, the nearest again');
  assert.deepEqual(p.map((q) => q.until), [1000 + UPHEAVAL.delay, 1200 + UPHEAVAL.delay, 1400 + UPHEAVAL.delay], 'each bursts a moment after its own dodge');
  assert.ok(p.every((q) => q.radius === UPHEAVAL.radius && q.detonate === p[0].detonate && !q.stacks), 'no stacking, no growing');
});
