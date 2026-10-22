// Release 291 (Tim, 2026-10-22): each preset sets the Build button to Build or to an item; items are put on a preset from
// Supplies, and only on a preset whose button is set to Item.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureSlots, presetButton, setPresetButton, assignPresetItem, activeButton, togglePreset } from '../src/spell-slots.ts';
import { Game } from '../src/game.ts';

test('a preset button is Build by default; an item goes only on a preset set to Item; it survives a save and a preset swap', () => {
  const s = freshSave(); ensureSlots(s);
  assert.deepEqual(presetButton(s, 0), { button: 'build', item: null }); assert.deepEqual(activeButton(s), { mode: 'build' });
  assert.equal(assignPresetItem(s, 0, 'ironbarkTonic').ok, false, 'preset 1 is Build');
  setPresetButton(s, 1, 'item'); assert.equal(assignPresetItem(s, 1, 'ironbarkTonic').ok, true);
  assert.deepEqual(activeButton(s), { mode: 'build' }, 'preset 1 is still active');
  togglePreset(s); assert.deepEqual(activeButton(s), { mode: 'item', item: 'ironbarkTonic' });
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(activeButton(back), { mode: 'item', item: 'ironbarkTonic' });
  togglePreset(back); assert.deepEqual(activeButton(back), { mode: 'build' }); togglePreset(back); assert.deepEqual(presetButton(back, 1), { button: 'item', item: 'ironbarkTonic' }, 'kept through swaps');
  assert.equal(assignPresetItem(s, 1, 'ironbarkTonic').ok, true); assert.equal(presetButton(s, 1).item, null, 'again takes it off');
  const odd = freshSave(); odd.magicSkills.presets = [{ a: null, b: null, button: 'zap', item: 'gold' }]; ensureSlots(odd); assert.deepEqual(presetButton(odd, 0), { button: 'build', item: null });
});

test('in Item mode the Build button uses the item', () => {
  const s = freshSave(), g = new Game(s, 0); g.loadArea('overworld', false); ensureSlots(s);
  setPresetButton(s, 0, 'item'); assignPresetItem(s, 0, 'ironbarkTonic'); s.consumables.ironbarkTonic = 2;
  g.update(.05, { state: { x: 0, y: 0 }, consume: (a) => a === 'build', held: () => false }, 1000);
  assert.equal(s.consumables.ironbarkTonic, 1); assert.ok(g.guardRemaining > 0 || s.consumables.ironbarkTonic === 1);
});
