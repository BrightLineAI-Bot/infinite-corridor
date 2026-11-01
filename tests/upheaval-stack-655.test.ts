// Release 655 (Tim, 2026-11-01: "if you dodge multiple times before the ring bursts... it should just stack... the ring gets
// more powerful depending on the number of times you dodge"): Worm's Upheaval stacks.
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
  g.enemies = [Object.assign(createCombatant('rootBrute', 12, 10), { id: 'foe', hp: 1e6, maxHp: 1e6, damage: 0, cooldown: 99 })];
  return { s, g };
}

test('each dodge while the ring pulses stacks onto it; the burst carries every stack', () => {
  const one = arena(); echoEvent(one.g, 'dodge', 1000); const single = one.g.echoPatches.find((q) => q.upheaval).detonate;
  const { g } = arena(); echoEvent(g, 'dodge', 1000); echoEvent(g, 'dodge', 1300); echoEvent(g, 'dodge', 1600);
  const rings = g.echoPatches.filter((q) => q.upheaval); assert.equal(rings.length, 1, 'one ring'); assert.equal(rings[0].stacks, 3); assert.equal(rings[0].detonate, single * 3);
  assert.ok(rings[0].radius > UPHEAVAL.radius && rings[0].until <= 1000 + UPHEAVAL.longest);
  for (let i = 0; i < 40; i++) echoEvent(g, 'dodge', 1700 + i * 10); assert.ok(g.echoPatches.find((q) => q.upheaval).until <= 1000 + UPHEAVAL.longest, 'never past its longest');
  echoEvent(g, 'dodge', 1000 + UPHEAVAL.longest + 50); assert.equal(g.echoPatches.filter((q) => q.upheaval && q.until > 1000 + UPHEAVAL.longest).length, 1, 'after it bursts, a fresh ring');
});
