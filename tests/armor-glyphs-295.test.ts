// Release 295 (Tim, 2026-10-22): armor takes the existing glyphs, each giving a steady bonus; gear glyph layouts can be saved
// and applied to new gear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARMOR_GLYPHS, ARMOR_GLYPH_CAP, armorGlyphBonus, normalizeSockets, socketGlyph, saveGlyphLayout, applyGlyphLayout, describeHost } from '../src/glyphs.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { characterStats, dodgeCost } from '../src/game.ts';

const armor = (tier = 'relic') => normalizeSockets({ id: 'armor-test', name: 'Test Mail', slot: 'armor', power: 2, tier, affixes: [] });
test('armor glyphs: every glyph has an armor bonus; bonuses add and are capped; stats follow', () => {
  for (const [id, a] of Object.entries(ARMOR_GLYPHS)) assert.ok(a.text && Object.keys(a).some((k) => k in ARMOR_GLYPH_CAP), id);
  const s = freshSave(), base = characterStats(s); s.equipment.armor = armor(); s.glyphs.leech = 3; s.glyphs.swift = 1; s.glyphs.still = 1;
  assert.equal(socketGlyph(s, 'armor', 0, 'leech').ok, true); assert.equal(socketGlyph(s, 'armor', 1, 'swift').ok, true); assert.equal(socketGlyph(s, 'armor', 2, 'still').ok, true);
  const b = armorGlyphBonus(s), st = characterStats(s); assert.equal(b.hp, .1); assert.equal(b.move, .08); assert.equal(b.dodgeCost, .2);
  assert.ok(st.maxHp > base.maxHp && st.moveSpeed > base.moveSpeed); assert.equal(dodgeCost(s), 12);
  assert.deepEqual(describeHost(s, 'armor').resonances, [], 'armor glyphs do not resonate');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.equipment.armor.glyphs, ['leech', 'swift', 'still']);
});
test('a saved layout goes onto new gear from the pouch', () => {
  const s = freshSave(); s.equipment.armor = armor(); s.glyphs.heavy = 2; s.glyphs.tether = 1;
  socketGlyph(s, 'armor', 0, 'heavy'); socketGlyph(s, 'armor', 1, 'tether'); assert.equal(saveGlyphLayout(s, 'armor').ok, true);
  // New armor arrives; the old one (with its glyphs) goes to the pack.
  s.inventory.push(s.equipment.armor); s.equipment.armor = { ...armor(), id: 'armor-new' };
  const r = applyGlyphLayout(s, 'armor'); assert.match(r.message, /missing: Tether/); assert.deepEqual(s.equipment.armor.glyphs, ['heavy', null, null]);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).glyphLayouts.armor, ['heavy', 'tether', null]);
});
