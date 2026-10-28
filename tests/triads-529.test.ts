// Release 529 (Tim, 2026-10-28): three-glyph resonances (triads); armor resonates only through triads.
// Release 531 (Tim): spells and skills keep two sockets, so triads come from three-socket items.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { TRIADS, RESONANCES, SPELL_SOCKETS, hostLoadout, glyphHit, armorGlyphBonus, socketGlyph, resonancesOf } from '../src/glyphs.ts';

test('six triads of three different glyphs, apart from the eight pairs; spells and skills keep two sockets', () => {
  assert.equal(Object.keys(TRIADS).length, 6); assert.equal(Object.keys(RESONANCES).length, 8);
  for (const r of Object.values(TRIADS)) assert.equal(new Set(r.pair).size, 3);
  assert.equal(SPELL_SOCKETS, 2);
  const old = freshSave(); old.spellGlyphs = { 'ember-ring': ['ignite', 'chain'] }; assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(old))).spellGlyphs['ember-ring'], ['ignite', 'chain'], 'spells keep two sockets');
});

const relic = (slot, name, glyphs) => ({ id: slot, name, slot, property: 'impact', power: 5, tier: 'relic', affixes: [], glyphs });

test('a relic weapon with ignite, chain and volatile lights Inferno: a burning foe that dies erupts', () => {
  const s = freshSave(); s.equipment.primary = relic('primary', 'Verge Cleaver', ['ignite', 'chain', 'volatile']);
  const l = hostLoadout(s, 'melee'); assert.ok(l.resonant('inferno'));
  const blasts = []; const e = { id: 'a', x: 5, y: 5, hp: 0, dead: true, glyphBurn: { until: 9999, dps: 2 } };
  glyphHit({ now: 1000, enemies: [], maxHp: 100, heal() {}, stamina() {}, damage() {}, blast: (x, y, r, n) => blasts.push(r), arc() {} }, l, e, 20, {});
  assert.ok(blasts.some((r) => r >= 1.9), 'the wide blaze');
});

test('Requiem freezes on echo strikes; Undertow heals on kills', () => {
  const s = freshSave(); s.equipment.primary = relic('primary', 'Verge Cleaver', ['echo', 'still', 'heavy']); s.equipment.secondary = relic('secondary', 'Needle Caster', ['tether', 'still', 'leech']);
  const e = { id: 'x', x: 1, y: 1, hp: 10 }; glyphHit({ now: 0, enemies: [], heal() {}, stamina() {}, damage() {}, blast() {}, arc() {} }, hostLoadout(s, 'melee'), e, 5, { echo: true }); assert.ok(e.hitStun >= 1);
  let healed = 0; glyphHit({ now: 0, enemies: [], maxHp: 200, heal: (n) => { healed += n; }, stamina() {}, damage() {}, blast() {}, arc() {}, nudge() {} }, hostLoadout(s, 'tool'), { id: 'y', x: 1, y: 1, hp: 0, dead: true }, 5, {});
  assert.ok(healed >= 10, `healed ${healed}`);
});

test('armor resonates only through triads, and they add past the usual caps; socketing one discovers it', () => {
  const s = freshSave(); s.equipment.armor = { id: 'ar', name: 'Kiln Mantle', slot: 'armor', property: 'guard', power: 5, tier: 'relic', affixes: [], glyphs: [null, null, null] };
  for (const g of ['echo', 'still', 'heavy']) s.glyphs[g] = 1;
  const before = armorGlyphBonus(s).defense;
  socketGlyph(s, 'armor', 0, 'echo'); socketGlyph(s, 'armor', 1, 'still'); const r = socketGlyph(s, 'armor', 2, 'heavy');
  assert.match(r.message, /Triad discovered: Requiem/); assert.equal(s.glyphCodex.resonances.requiem, true);
  assert.ok(Math.abs(armorGlyphBonus(s).defense - before - (0.05 + TRIADS.requiem.armor.defense)) < 1e-9, 'heavy\'s own +5% and the triad\'s +10%');
  assert.deepEqual(resonancesOf(['ignite', 'echo']), ['ember-choir']);
});

test('the Needle Caster scales with Might; the Lumen Spindle with Focus', async () => {
  const { Game } = await import('../src/game.ts');
  const fire = (name, property, stats) => { const s = freshSave(); s.stats = { ...s.stats, ...stats }; s.equipment.secondary = { id: 't', name, slot: 'secondary', property, power: 5, tier: 'common', affixes: [] }; const g = new Game(s, 0); g.area = 'dungeon'; g.enemies = []; g.fireSecondary(1000, { x: 1, y: 0 }); return g.projectiles.find((p) => String(p.id).startsWith('shot-')).damage; };
  assert.ok(fire('Needle Caster', 'quick', { Might: 30 }) > fire('Needle Caster', 'quick', { Might: 1 }) + 40, 'Might');
  assert.equal(fire('Needle Caster', 'quick', { Focus: 30 }), fire('Needle Caster', 'quick', { Focus: 1 }), 'not Focus');
  assert.ok(fire('Lumen Spindle', 'focus', { Focus: 30 }) > fire('Lumen Spindle', 'focus', { Focus: 1 }), 'the Spindle keeps Focus');
});
