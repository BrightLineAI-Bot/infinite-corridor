// Release 339 (Tim, 2026-10-23): the Potion, the High Potion (twice the heal, brewed from 3 draughts) and the Max Potion
// (heals to full, brewed from 5); the Potion button drinks the chosen tier, then plain draughts when it runs out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { POTIONS, craftPotion, setPotionChoice, potionToDrink } from '../src/potions.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const press = (t) => ({ state: { x: 0, y: 0 }, consume: (k) => k === 'potion' && t.once && !(t.once = false), held: () => false });

test('brewing: 3 draughts make a High Potion, 5 a Max Potion', () => {
  const s = freshSave(); s.consumables.restorativeDraught = 8;
  assert.equal(craftPotion(s, 'highPotion').ok, true); assert.equal(s.consumables.restorativeDraught, 5); assert.equal(s.consumables.highPotion, 1);
  assert.equal(craftPotion(s, 'maxPotion').ok, true); assert.equal(s.consumables.restorativeDraught, 0); assert.equal(s.consumables.maxPotion, 1);
  assert.equal(craftPotion(s, 'highPotion').ok, false, 'not enough draughts');
  assert.equal(POTIONS.highPotion.heal, POTIONS.restorativeDraught.heal * 2);
});

test('the Potion button drinks the chosen tier, then plain draughts; the Max Potion heals to full', () => {
  const s = freshSave(); s.level = 30; s.consumables.restorativeDraught = 2; s.consumables.maxPotion = 1; s.consumables.highPotion = 1;
  const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = [];
  const max = s.maxHp; assert.ok(max >= 160, `max ${max}`);
  setPotionChoice(s, 'maxPotion'); g.player.hp = 20; g.update(.016, press({ once: true }), 1000);
  assert.equal(g.player.hp, max); assert.equal(s.consumables.maxPotion, 0);
  assert.equal(potionToDrink(s), 'restorativeDraught', 'out of Max Potions: plain draughts next');
  g.player.hp = 50; g.update(.016, press({ once: true }), 1100); assert.equal(g.player.hp, 80);
  setPotionChoice(s, 'highPotion'); g.player.hp = 50; g.update(.016, press({ once: true }), 1200); assert.equal(g.player.hp, 110); assert.equal(s.consumables.highPotion, 0);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).potionChoice, 'highPotion', 'the choice is kept');
});
