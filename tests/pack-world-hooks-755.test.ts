// Release 755: the pre-publish review found that an inline comment had swallowed three pack-world hooks (dragonLava,
// dragonLavaPreview, playerMaxHp), so the Crimson Tyrant's Colonize never laid lava. The real Game's packWorld must offer them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

test('the overworld pack world offers the dragon and max-HP hooks', () => {
  const s = freshSave(); s.seed = 'HOOKS755'; const g = new Game(s, 0);
  g.rx = 3; g.ry = 2; g.loadArea('overworld', false);
  const w = g.packWorld();
  for (const k of ['dragonDue', 'dragonLava', 'dragonLavaPreview', 'playerMaxHp']) assert.equal(typeof w[k], 'function', k);
  assert.ok(w.playerMaxHp() > 0);
});
