// Release 281 (Tim, 2026-10-22: "Dodge needs to work all the time... it's the way I get out of damage"): a dodge press
// always dodges, however little stamina is left, and the Dodge button never shows as unavailable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, actionReadiness } from '../src/game.ts';
import { dodge, DODGE } from '../src/combat.ts';

test('a spam of dodge presses dodges every time, even with no stamina', () => {
  const s = freshSave(), g = new Game(s, 0); g.loadArea('overworld', false); g.player.stamina = 0;
  let t = 1000; const press = { state: { x: 1, y: 0 }, consume: (a) => a === 'dodge', held: () => false }, idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  for (let k = 0; k < 8; k++) { g.update(.05, press, t += 50); assert.ok(g.player.dodgeUntil > t, `press ${k + 1} dodged`); assert.ok(g.player.invulnerableUntil > t); for (let i = 0; i < 4; i++) g.update(.05, idle, t += 50); }
  assert.ok(g.player.stamina >= 0); assert.equal(actionReadiness(g, t).dodge.available, true);
  const p = { stamina: 5, lastMoveVector: { x: 0, y: 1 } }; assert.equal(dodge(p, 0, 0, 0).ok, true); assert.equal(p.stamina, 0); assert.equal(DODGE.cost, 15);
});
