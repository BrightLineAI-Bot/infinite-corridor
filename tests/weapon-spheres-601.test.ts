// Release 601 (Tim, 2026-10-31: the weapon sphere "isn't dropping"): every crossing generated since generator 2 paid an armor
// sphere for its clear, so weapon spheres all but stopped. Clears now alternate weapon, armor, weapon...
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { registerDungeonBosses, recordDungeonBossDefeat, claimDungeonPayoff } from '../src/dungeon-completion.ts';

const clear = (save, generatorVersion = 5) => { const h = { generatorVersion }, b = { id: 'g', boss: true, x: 1, y: 1 }; registerDungeonBosses(h, [{ enemySpawns: [b] }]); recordDungeonBossDefeat(h, b); return claimDungeonPayoff(save, h); };

test('crossing clears alternate weapon and armor spheres, and the count survives a save', () => {
  let s = freshSave(); s.materials.weaponSphere = 0; s.materials.armorSphere = 0;
  for (let i = 0; i < 3; i++) assert.ok(clear(s));
  s = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(clear(s));
  assert.equal(s.materials.weaponSphere, 2); assert.equal(s.materials.armorSphere, 2);
});

test('an old generator 2 crossing still pays its weapon sphere and does not shift the alternation', () => {
  const s = freshSave(); s.materials.weaponSphere = 0; s.materials.armorSphere = 0;
  clear(s, 2); assert.equal(s.materials.weaponSphere, 1); clear(s); assert.equal(s.materials.weaponSphere, 2, 'the next new crossing pays a weapon sphere');
  clear(s); assert.equal(s.materials.armorSphere, 1);
});
