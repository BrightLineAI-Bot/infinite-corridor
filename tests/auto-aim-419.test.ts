// Release 419 (Tim: "the automatic targeting of enemies isn't working very well... a little bit more sensitive and a little bit
// longer range"; and "make the build button hold too" for the Shadow Clone).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectMeleeAim, selectRangedAim, AUTO_AIM, TARGET_LOCK, autoAimBody, autoAimable } from '../src/game.ts';

const map = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
const player = { x: 10, y: 10, facing: 'right' };

test('longer reach: swings turn to foes 3 tiles past reach (5 until release 469: "the targeting seems a little bit long"), shots to 2.2 times their range; taps pick wider', () => {
  assert.equal(AUTO_AIM.meleeExtra, 3); assert.equal(AUTO_AIM.rangedScale, 2.2); assert.equal(TARGET_LOCK.pick, 1.35);
  const foe = [{ id: 'f', x: 10, y: 14, dead: false }];
  assert.ok(selectMeleeAim(player, foe, map, 32, 1.4 + AUTO_AIM.meleeExtra)?.y > .9);
  assert.ok(selectRangedAim(player, [{ id: 'g', x: 10, y: 24, dead: false }], map, 32, 7 * AUTO_AIM.rangedScale)?.y > .9);
});

test('reach is measured to a big creature\'s edge', () => {
  assert.equal(autoAimBody({}), 0); assert.equal(autoAimBody({ bodyRadius: 1.2 }), 1.2); assert.equal(autoAimBody({ scale: 3 }), 1);
  const big = [{ id: 'b', x: 10, y: 15, dead: false, bodyRadius: 1.5 }];
  assert.equal(selectMeleeAim(player, [{ ...big[0], bodyRadius: 0 }], map, 32, 4), null);
  assert.ok(selectMeleeAim(player, big, map, 32, 4)?.y > .9, 'its edge is within reach');
});

test('more sensitive to what is ahead; never drawn to what cannot be hit', () => {
  const ahead = { id: 'a', x: 13, y: 10, dead: false }, behind = { id: 'z', x: 7.4, y: 10, dead: false }; // ahead 3, behind 2.6
  assert.ok(selectMeleeAim(player, [ahead, behind], map, 32, 8).x > .9, 'the one in front wins');
  for (const flag of ['hidden', 'untargetable', 'ambient']) {
    const odd = { id: flag, x: 10, y: 11, dead: false, [flag]: true }; assert.equal(autoAimable(odd), false);
    assert.ok(selectMeleeAim(player, [odd, ahead], map, 32, 8).x > .9); assert.ok(selectRangedAim(player, [odd, ahead], map, 32, 20).x > .9);
  }
  assert.equal(autoAimable({ kind: 'npc' }), false); assert.equal(autoAimable({ astralAllyOf: 'p' }), false);
});

test('a Shadow Clone cast from the Build button listens to Build while it is held', () => {
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /btn\.mode === "cast"\) \{ this\.castAction = "build"; try \{ this\.castKey\(btn\.key\); \} finally \{ this\.castAction = null; \} \}/);
});
