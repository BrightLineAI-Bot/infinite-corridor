// Release 435 (Tim: "a disproportionately large number of dungeons in the dreamland are just... dreamland dungeons...
// You should still be just... mixed dungeons"): only a share of crossings first found in the Far Sleep are Sleeper's Halls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { generatePinnedDungeon } from '../src/game.ts';
import { DREAM_HALL } from '../src/underlands.ts';

test('about 30% of new Far Sleep crossings dream; the rest are the ordinary mix, pinned', () => {
  const s = freshSave(); s.seed = 'MIX435'; let dream = 0, plain = 0; const themes = new Set();
  for (let i = 0; i < 60; i++) { const id = `dungeon:MIX435:g1:${40 + i}:${i % 5}:dungeon-g1-${40 + i}-${i % 5}-1`, m = generatePinnedDungeon(s, id), h = s.consequences.dungeons[id];
    if (h.dream) { dream++; assert.equal(h.dream, DREAM_HALL.version); } else { plain++; assert.equal(h.dream, 0, 'pinned ordinary'); themes.add(m.theme); }
    assert.equal(generatePinnedDungeon(s, id).theme, m.theme, 'the same crossing every time'); }
  assert.ok(dream > 60 * .15 && dream < 60 * .5, `${dream} dream of 60`); assert.ok(plain > 0); assert.ok(![...themes].includes('dream'));
  assert.ok(themes.size >= 2, `ordinary themes: ${[...themes].join(', ')}`);
});

test('a crossing already pinned a Sleeper\'s Hall stays one', () => {
  const s = freshSave(); s.seed = 'MIX435'; const id = 'dungeon:MIX435:g1:50:0:dungeon-g1-50-0-1';
  const h = (s.consequences.dungeons[id] = { dream: DREAM_HALL.version }); const m = generatePinnedDungeon(s, id);
  assert.equal(s.consequences.dungeons[id].dream, DREAM_HALL.version); assert.ok(['dream', 'poisonCrypt'].includes(m.theme), m.theme); void h;
});
