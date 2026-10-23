// Release 341 (Tim, 2026-10-23): pick tier 1, 2 or 3 for the Potion button; a High or Max Potion not carried is brewed from
// draughts the moment the button drinks it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setPotionChoice, potionsReady } from '../src/potions.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

test('the button brews the chosen tier from draughts as it drinks, and never at full health', () => {
  const s = freshSave(); s.level = 30; s.consumables.restorativeDraught = 11;
  const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = []; const max = s.maxHp;
  setPotionChoice(s, 'maxPotion'); assert.equal(potionsReady(s), 2, '11 draughts brew two Max Potions');
  g.player.hp = max; assert.equal(g.drinkPotion(1000), false); assert.equal(s.consumables.restorativeDraught, 11, 'nothing brewed at full health');
  g.player.hp = 10; assert.equal(g.drinkPotion(1000), true); assert.equal(g.player.hp, max); assert.equal(s.consumables.restorativeDraught, 6); assert.equal(s.consumables.maxPotion || 0, 0);
  g.player.hp = 10; g.drinkPotion(1100); assert.equal(s.consumables.restorativeDraught, 1);
  g.player.hp = 10; g.drinkPotion(1200); assert.equal(g.player.hp, 40, 'too few to brew: a plain draught'); assert.equal(s.consumables.restorativeDraught, 0);
  setPotionChoice(s, 'highPotion'); s.consumables.restorativeDraught = 3; assert.equal(potionsReady(s), 1);
  g.player.hp = 10; g.drinkPotion(1300); assert.equal(g.player.hp, 70);
});
