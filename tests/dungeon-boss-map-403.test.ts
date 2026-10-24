// Release 403 (Tim: "the Psychic Crystal and the Void Walker... any bosses... should be indicated in the dungeon, where they
// are"): the dungeon map marks every living boss on the current level.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { staggerClass } from '../src/monster-pack.ts';

test('bosses, world beasts and Revenants count; ordinary creatures, reflections and worms do not', () => {
  for (const e of [{ worldBeast: 'psychicCrystal' }, { worldBeast: 'voidWalker' }, { boss: true }, { dungeonRole: 'finalBoss' }, { dungeonRole: 'objectiveGuardian' }, { farArrayBoss: 'listener' }]) assert.equal(staggerClass(e), 'boss');
  assert.equal(staggerClass({ gatePredator: true }), 'revenant');
  for (const e of [{ kind: 'ashling' }, { mirrorClone: true }, { morphWorm: true }]) assert.equal(staggerClass(e), null);
  const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(src, /const k=staggerClass\(e\);if\(e\.dead\|\|\(k!=="boss"&&k!=="revenant"\)\)continue/);
});
