// Release 343 (Tim, 2026-10-23): auto targeting reaches farther: a swing turns to a foe a few tiles past its reach, a tool
// shot to one past its range.
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMeleeAim, selectRangedAim, AUTO_AIM } from '../src/game.ts';

const map = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
const player = { x: 10, y: 10, facing: 'right' };
test('a foe just past reach is now turned toward', () => {
  const foe = [{ id: 'f', x: 10, y: 13.2, dead: false }];
  assert.equal(selectMeleeAim(player, foe, map, 32, 1.4), null, 'reach alone misses it');
  const d = selectMeleeAim(player, foe, map, 32, 1.4 + AUTO_AIM.meleeExtra); assert.ok(d && d.y > .9, 'turns down toward it');
  const far = [{ id: 'g', x: 10, y: 20, dead: false }];
  assert.equal(selectRangedAim(player, far, map, 32, 7), null);
  assert.ok(selectRangedAim(player, far, map, 32, 7 * AUTO_AIM.rangedScale)?.y > .9);
});
