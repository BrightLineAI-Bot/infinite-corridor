// Release 449 (Tim, with a screenshot of Supplies: "Crossing sigil is still not something I can use"): the sigil has a Use
// button in Supplies (inside a dungeon it opens the Atlas), and it carries you on to the Wayglass you choose, as it says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

function inDungeon() {
  const s = freshSave(); s.seed = 'SIGIL449'; s.consumables.crossingSigil = 3; s.checkpoints['4,-2'] = { rx: 4, ry: -2, x: 16, y: 16, name: 'Far Glass' };
  s.session.activeDungeonId = 'dungeon:SIGIL449:g1:7:2:room'; s.session.dungeonReturn = { rx: 7, ry: 2, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; return { s, g };
}

test('a sigil carries you out of the dungeon and across the corridor to the chosen Wayglass', () => {
  const { s, g } = inDungeon();
  assert.ok(g.useCrossingSigil('4,-2'), g.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [4, -2]); assert.equal(s.consumables.crossingSigil, 2); assert.match(g.message, /Far Glass/);
});

test('with no Wayglass chosen it still takes you to the entrance; outside a dungeon it keeps', () => {
  const { s, g } = inDungeon();
  assert.ok(g.useCrossingSigil(null)); assert.deepEqual([g.area, g.rx, g.ry], ['overworld', 7, 2]); assert.equal(s.consumables.crossingSigil, 2);
  assert.equal(g.useCrossingSigil('4,-2'), false); assert.equal(s.consumables.crossingSigil, 2);
});

test('Supplies has a Use button for it, and the Atlas button names where it goes', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /openSigilAtlas\(\); \}\);\n    use\.disabled = game\.area !== "dungeon"/);
  assert.match(main, /game\.useCrossingSigil\(save\.checkpoints\?\.\[key\] \? key : null\)/);
  assert.match(main, /Use Crossing Sigil ×\$\{save\.consumables\.crossingSigil \|\| 0\} → /);
});
