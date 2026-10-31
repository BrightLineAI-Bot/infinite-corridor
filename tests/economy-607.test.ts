// Release 607 (Tim, 2026-10-31: "I have like 43000 marks... maybe 100000 cinder iron... the economy of the game... is almost
// without consequence"; he took the recommendation): salvage pays 1/1/2/2 iron by tier, a full pack's automatic salvage pays
// no iron (glyph dust only), and kill and clear marks halve.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, ECONOMY, salvageInventoryItem, storeInventoryItem, EQUIPMENT_CAPACITY } from '../src/game.ts';
import { SMITHY, salvageItem } from '../src/smithy.ts';
import { CLEAR_MARKS } from '../src/dungeon-completion.ts';
import { generateItem } from '../src/items.ts';

test('the new numbers', () => {
  assert.deepEqual(SMITHY.salvage.iron, { common: 1, rare: 1, epic: 2, relic: 2 });
  assert.deepEqual(ECONOMY.marks, { boss: 6, aperture: 3, common: 1 }); assert.equal(ECONOMY.autoSalvageIron, 0); assert.deepEqual(CLEAR_MARKS, { plain: 5, deep: 9 });
});

test('salvage by hand pays by tier; a full pack makes room without paying iron', () => {
  const s = freshSave(); s.materials.cinderIron = 0; s.inventory = [{ ...generateItem('r', 20), tier: 'relic' }];
  assert.equal(salvageInventoryItem(s, 0).iron, 2); assert.equal(s.materials.cinderIron, 2);
  const t = freshSave(); t.materials.cinderIron = 0; t.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => ({ ...generateItem('f' + i, 20), tier: 'relic' }));
  for (let i = 0; i < 5; i++) storeInventoryItem(t, { ...generateItem('n' + i, 20), tier: 'relic' }); assert.equal(t.materials.cinderIron, 0, 'no iron from a full pack'); assert.ok(t.glyphDust >= 0);
});

test('an ordinary kill pays 1 mark', () => {
  const s = freshSave(), g = new Game(s, 0), e = { ...g.enemies[0], id: 'plain-kill', boss: false, rewarded: false }, before = s.currency; g.defeatEnemy(e); assert.equal(s.currency - before, ECONOMY.marks.common);
});
