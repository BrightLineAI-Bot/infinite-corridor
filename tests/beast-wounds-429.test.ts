// Release 429 (Tim: "I just fought the void Walker in a dungeon... I was gonna kill him, but also his health reset. When I
// died... make sure that the health doesn't reset when you die for the world bosses"): the death code itself no longer
// heals a living world beast, in a dungeon or in the open, and its wounds wait on its hunt for the rematch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };

test('a Void Walker you hurt in a dungeon is still hurt when you come back after dying', () => {
  const s = freshSave(); s.seed = 'WOUND429'; s.level = 8; const g = new Game(s, 0), did = 'dungeon:WOUND429:g1:7:2:room';
  s.session.activeDungeonId = did; s.session.dungeonReturn = { rx: 7, ry: 2, x: 16, y: 16 }; s.worldBeasts.voidWalker.active = { dungeon: did, tries: 0 };
  g.loadArea('dungeon', false); let e = g.enemies.find((q) => q.worldBeast === 'voidWalker'); assert.ok(e);
  e.hp = Math.round(e.maxHp * .35); const left = e.hp / e.maxHp;
  g.player.hp = 0; g.update(.001, idle, 1000);
  assert.equal(s.worldBeasts.voidWalker.active.tries, 1, 'the try is spent as before');
  assert.ok(Math.abs(s.worldBeasts.voidWalker.active.wounds - left) < .01, 'its wounds wait on its hunt');
  s.session.activeDungeonId = did; g.loadArea('dungeon', false); e = g.enemies.find((q) => q.worldBeast === 'voidWalker' && !q.dead);
  assert.ok(e && Math.abs(e.hp / e.maxHp - left) < .01, `back at ${(e.hp / e.maxHp).toFixed(2)} of its health`);
});

test('no new Void Walker hunts begin in dungeons', () => {
  assert.equal(WORLD_BEASTS.voidWalker.dungeonChance, 0);
});
