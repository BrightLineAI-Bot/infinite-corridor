// Tim's log (Unreleased): a Triad on the Glyphs screen read "✦ undefined: undefined" (describeHost spread RESONANCES[id], which
// has no triads); armor triads never showed on the armor card; and triads are written into every journey already under way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { TRIADS, RESONANCES, describeHost, giftTriads, armorGlyphBonus, normalizeSockets } from '../src/glyphs.ts';

const relic = (slot, name) => normalizeSockets({ id: `t-${slot}`, name, slot, power: 6, tier: 'relic', property: 'steady', affixes: [] });
const set = (s, item, glyphs) => { item.glyphs = [...glyphs, ...Array(Math.max(0, item.glyphs.length - glyphs.length)).fill(null)].slice(0, item.glyphs.length); };

test('a weapon triad on the Glyphs screen has its name and text, never undefined', () => {
  const s = freshSave(); s.equipment.primary = relic('primary', 'Salvage Blade'); assert.ok(s.equipment.primary.glyphs.length >= 3);
  for (const [id, t] of Object.entries(TRIADS)) {
    set(s, s.equipment.primary, t.pair); const d = describeHost(s, 'melee'), r = d.resonances.find((q) => q.id === id);
    assert.ok(r, `${id} is listed`); assert.equal(r.name, t.name); assert.equal(r.text, t.text);
    for (const q of d.resonances) { assert.equal(typeof q.name, 'string'); assert.equal(typeof q.text, 'string'); assert.ok(!/undefined/.test(`${q.name}: ${q.text}`)); }
  }
  set(s, s.equipment.primary, RESONANCES['ember-choir'].pair); assert.deepEqual(describeHost(s, 'melee').resonances.map((q) => q.name), ['Ember Choir'], 'pairs read as before');
});

test('the armor card lists its triads with their armor text; armor pairs still never resonate', () => {
  const s = freshSave(); s.equipment.armor = relic('armor', 'Wayfarer Coat');
  set(s, s.equipment.armor, TRIADS.requiem.pair); const d = describeHost(s, 'armor');
  assert.deepEqual(d.resonances.map((q) => [q.id, q.name, q.text]), [['requiem', 'Requiem', TRIADS.requiem.armorText]]);
  assert.ok(armorGlyphBonus(s).defense >= TRIADS.requiem.armor.defense, 'and it works');
  set(s, s.equipment.armor, RESONANCES['ember-choir'].pair); assert.deepEqual(describeHost(s, 'armor').resonances, [], 'a pair in armor lists nothing');
});

test('every triad is written into the codex of a journey under way, once; a new journey still discovers them', () => {
  const old = migrateSave(JSON.parse(JSON.stringify({ ...freshSave(), level: 30 }))); old.glyphCodex.resonances = { inferno: true }; delete old.triadGift; old.resonanceGift = 1;
  new Game(old, 0);
  for (const id of Object.keys(TRIADS)) assert.equal(old.glyphCodex.resonances[id], true, id);
  assert.equal(old.triadGift, 1); assert.deepEqual(giftTriads(old), [], 'once');
  const kept = migrateSave(JSON.parse(JSON.stringify(old))); assert.equal(kept.triadGift, 1); assert.ok(Object.keys(TRIADS).every((id) => kept.glyphCodex.resonances[id]));
  const fresh = freshSave(); new Game(fresh, 0); assert.equal(fresh.triadGift, 1); assert.ok(Object.keys(TRIADS).every((id) => !fresh.glyphCodex.resonances[id]), 'a new journey is only marked');
});
