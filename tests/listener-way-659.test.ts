// Release 659 (Tim, 2026-11-01: "I don't know how to access the listener once I get to the dungeon... I'm trapped in the
// listener's dungeon. There's no exit"): an Array run says what it holds and where the Listener is, a Gate piece says how many
// more, and every floor of a deep run says which way the passages lie.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { guardianFelled, ensureFarArray } from '../src/far-array.ts';

test('a Gate piece says how many more, and what then', () => {
  const s = freshSave(); const f = ensureFarArray(s); f.gate = 4; f.pieces = 3; f.listeners = 3;
  assert.match(guardianFelled(s), /\(4\/6\)\. 2 more and the Listener's Dais rises beside the Mouth/);
  s.farArray.pieces = 5; assert.match(guardianFelled(s), /whole.*Listener's Dais rises beside the Mouth/);
  const t = freshSave(); const g = ensureFarArray(t); g.gate = 1; g.pieces = 0; g.listeners = 0; assert.match(guardianFelled(t), /the next run holds the Listener/);
});

test('a deep floor names the way up (or out) and the way down', () => {
  const s = freshSave(); const g = new Game(s, 0);
  g.area = 'dungeon'; g.map = { ...g.map, multiLevel: true, objects: [{ kind: 'deepTransition', id: 'r:level:pressure:up', x: 2, y: 10 }, { kind: 'deepTransition', id: 'r:level:pressure:down', x: 20, y: 10 }] };
  Object.assign(g.player, { x: 10, y: 10 }); assert.equal(g.levelWays(), ' Way up: west. Way down: east.');
  g.map.objects.push({ kind: 'exit', id: 'out', x: 10, y: 20 }); assert.equal(g.levelWays(), ' Way out: south. Way down: east.');
});
