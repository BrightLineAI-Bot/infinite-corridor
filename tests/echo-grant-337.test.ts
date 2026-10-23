// Release 337 (Tim, 2026-10-23): guardians and world beasts always leave their Echo while you lack it, and a Questing Beast
// (or world beast) slain before then grants its missing Echo when the save loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { echoDrop, grantSlainEchoes } from '../src/echoes.ts';
import { freshSave, migrateSave } from '../src/types.ts';

test('a guardian kind whose Echo you lack leaves it on the next kill', () => {
  for (const kind of ['thunderhorn', 'cinderSeraph', 'weepingSaint']) { const s = freshSave(); assert.equal(echoDrop(s, { id: `x-${kind}`, packKind: kind }, true, 1), kind); }
  const s = freshSave(); assert.equal(echoDrop(s, { id: 'o', packKind: 'thunderhorn' }, false, 1), null, 'ordinary kills never');
});

test('a slain Questing Beast or world beast grants its missing Echo on load, once', () => {
  const s = freshSave(); s.questingBeast.slain = 1; s.worldBeasts.psychicCrystal.slain = 2; s.echoes.owned.psychicCrystal = true;
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.echoes.owned.questingBeast, true); assert.equal(m.echoes.owned.psychicCrystal, true);
  assert.deepEqual(grantSlainEchoes(m), [], 'nothing more to grant');
  const fresh = migrateSave(JSON.parse(JSON.stringify(freshSave()))); assert.equal(fresh.echoes.owned.questingBeast, undefined, 'never slain: nothing');
});
