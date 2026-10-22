// Release 281 (Tim, 2026-10-22): a dodge still needs stamina ("if we don't have stamina, we should not be able to dodge"),
// but a refused dodge is never silent: it is marked for the HUD to flash, with a clear message.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, actionReadiness } from '../src/game.ts';

test('a dodge needs stamina, and a refusal is marked for the HUD', () => {
  const s = freshSave(), g = new Game(s, 0); g.loadArea('overworld', false);
  const press = { state: { x: 1, y: 0 }, consume: (a) => a === 'dodge', held: () => false };
  g.player.stamina = 40; g.update(.05, press, 1000); assert.ok(g.player.dodgeUntil > 1000, 'with stamina it dodges'); assert.equal(g.dodgeRefusedAt, undefined);
  g.player.stamina = 5; g.player.dodgeUntil = 0; g.update(.05, press, 3000);
  assert.ok(!(g.player.dodgeUntil > 3000), 'without stamina it does not'); assert.equal(g.dodgeRefusedAt, 3000); assert.match(g.message, /Out of stamina/);
  assert.equal(actionReadiness(g, 3000).dodge.available, false);
});
