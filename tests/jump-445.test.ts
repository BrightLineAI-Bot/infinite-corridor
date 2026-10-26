// Release 445 (Tim: "a significant delay between when you press the jump button and when the character actually jumps...
// the character needs to jump when you actually press the button, not like a second later"): with Quickening ranks the
// leap lasted longer than the 520 ms arc the renderer drew, so the hero stood flat for the first rank × 140 ms. The arc now
// rises from the press itself, whatever the rank.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, JUMP, jumpLift } from '../src/game.ts';

const press = (rank) => {
  const s = freshSave(); s.seed = 'JUMP445'; const g = new Game(s, 0); g.loadArea('overworld', false); g.enemies = [];
  s.magicSkills ||= { schema: 1, learned: {}, selected: null, active: null, cooldowns: {}, lastSafe: null }; s.magicSkills.learned = { ...(s.magicSkills.learned || {}), quickening: rank };
  let fired = false; const input = { state: { x: 0, y: 0 }, consume: (k) => (k === 'jump' && !fired ? (fired = true) : false), held: () => false, reset() {} };
  g.update(.016, input, 1000); return g;
};

test('the leap leaves the ground on the frame you press, at every Quickening rank', () => {
  for (const rank of [0, 1, 2, 3]) {
    const g = press(rank), dur = g.jumpUntil - g.jumpStart;
    assert.ok(g.jumpUntil > 1000, `rank ${rank}: airborne`);
    assert.ok(jumpLift(g, g.jumpStart + 50) > .1, `rank ${rank}: already lifted 50 ms after the press (${jumpLift(g, g.jumpStart + 50).toFixed(3)})`);
    assert.ok(Math.abs(jumpLift(g, g.jumpStart + dur / 2) - JUMP.arc) < 1e-9, 'top of the arc halfway');
    assert.ok(Math.abs(jumpLift(g, g.jumpStart + JUMP.base / 2) - JUMP.arc) < 1e-9, 'at the top as quickly as a plain leap');
    assert.ok(jumpLift(g, g.jumpUntil - 30) < .1 && jumpLift(g, g.jumpUntil) === 0, 'lands at the end');
  }
});

test('the robot boost holds the top; a resumed leap still arcs; the renderer uses jumpLift', () => {
  const g = { jumpUntil: 2000, jumpStart: 1900, jumpDur: 520, mechBoosting: true }; assert.equal(jumpLift(g, 1950), JUMP.arc);
  assert.ok(jumpLift({ jumpUntil: 2000 }, 1800) > 0, 'no start recorded');
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /lift = jumpLift\(g, now\) \* s/);
});
