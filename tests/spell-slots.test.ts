import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, actionReadiness } from '../src/game.ts';
import { learnRank, learnMod, chooseCap } from '../src/constellation.ts';
import { ATTRIBUTES, CASTABLES, PAIRINGS, pairKey, ensureSlots, setSlot, slotted, activePairing, pairingMods, availableCastables, togglePreset, PRESETS } from '../src/spell-slots.ts';
import { SPELLS } from '../src/items.ts';

const learned = () => { const s = freshSave(); s.perception.aperture = 72; for (let i = 0; i < 3; i++) learnRank(s, 'motion'); learnMod(s, 'motion'); chooseCap(s, 'motion', 'aerial-step'); learnRank(s, 'veil'); return s; };

test('every castable has its own symbol and an attribute colour; every attribute pair has a Pairing', () => {
  const symbols = Object.values(CASTABLES).map((c) => c.symbol);
  assert.equal(new Set(symbols).size, symbols.length, 'unique symbols');
  for (const c of Object.values(CASTABLES)) assert.ok(ATTRIBUTES[c.attr]?.color);
  for (const id of Object.keys(SPELLS)) assert.ok(CASTABLES[`spell:${id}`], `${id} castable`);
  const attrs = Object.keys(ATTRIBUTES);
  for (const x of attrs) for (const y of attrs) { const p = PAIRINGS[pairKey(x, y)]; assert.ok(p?.name && p.text && Object.keys(p.mods).length, `${x}+${y}`); }
  assert.equal(Object.keys(PAIRINGS).length, attrs.length * (attrs.length + 1) / 2);
});

test('slots are additive at schema 14: A from the equipped spell, B from the old Spell-button discipline', () => {
  const f = freshSave(); assert.deepEqual(f.magicSkills.slots, { a: 'spell:ember-ring', b: null });
  const old = learned(); delete old.magicSkills.slots; old.equippedSpell = 'grave-sun'; old.magicSkills.selected = 'quickening';
  const m = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(m.magicSkills.slots, { a: 'spell:grave-sun', b: 'skill:quickening' }); assert.equal(m.version, 14);
  const kept = migrateSave({ ...learned(), magicSkills: { ...learned().magicSkills, slots: { a: 'skill:veil-guard', b: 'bogus' } } });
  assert.deepEqual(kept.magicSkills.slots, { a: 'skill:veil-guard', b: null });
});

test('setting slots: only what is learned, swaps when moved, keeps the old fields in step', () => {
  const s = freshSave();
  assert.equal(setSlot(s, 'b', 'skill:quickening').ok, false, 'not learned');
  const t = learned();
  assert.ok(availableCastables(t).includes('skill:aerial-step'));
  assert.equal(setSlot(t, 'b', 'skill:aerial-step').ok, true); assert.equal(t.magicSkills.selected, 'aerial-step');
  assert.equal(setSlot(t, 'b', 'spell:ember-ring').ok, true, 'moving A into B swaps');
  assert.deepEqual(t.magicSkills.slots, { a: 'skill:aerial-step', b: 'spell:ember-ring' }); assert.equal(t.equippedSpell, 'ember-ring');
  setSlot(t, 'a', null); assert.equal(slotted(t, 'a'), null); assert.equal(t.magicSkills.selected, null);
});

test('Pairings: found once, and their bonuses reach speed, guard, spells and stamina', () => {
  const s = learned(), base = characterStats(s);
  setSlot(s, 'a', 'spell:ember-ring'); const r = setSlot(s, 'b', 'skill:quickening');
  assert.equal(activePairing(s).name, 'Wildfire'); assert.match(r.message, /Pairing found: Wildfire/); assert.equal(s.magicSkills.pairingsSeen['fire+wind'], true);
  assert.doesNotMatch(setSlot(s, 'b', 'skill:quickening').message, /Pairing found/);
  assert.ok(characterStats(s).moveSpeed > base.moveSpeed, 'speed');
  setSlot(s, 'a', 'skill:veil-guard'); setSlot(s, 'b', 'skill:aerial-step');
  assert.equal(activePairing(s).name, 'Tailwind'); assert.ok(characterStats(s).damageReduction > base.damageReduction, 'guard');
  setSlot(s, 'b', null); assert.equal(activePairing(s), null); assert.deepEqual(pairingMods(s), { spellDamage: 0, cooldown: 0, speed: 0, guard: 0, stamina: 0 });
});

test('in the game: A and B cast independently, each spell keeps its own cooldown', () => {
  const s = learned(), g = new Game(s, 0); g.area = 'overworld';
  setSlot(s, 'a', 'spell:cinder-dart'); setSlot(s, 'b', 'spell:ember-ring');
  assert.equal(g.castSlot('a'), true); assert.equal(g.castSlot('a'), false, 'A cooling');
  assert.equal(g.castSlot('b'), true, 'B is its own spell');
  const r = actionReadiness(g, 0); assert.ok(r.spell.remaining > 0 && r.spell2.remaining > 0); assert.equal(r.spell.duration, SPELLS['cinder-dart'].cooldown);
  setSlot(s, 'b', 'skill:quickening'); assert.equal(g.castSlot('b'), true); assert.equal(s.magicSkills.active?.id, 'quickening');
  setSlot(s, 'b', null); assert.equal(g.castSlot('b'), false); assert.match(g.message, /Slot B is empty/);
  const inputs = ['spell2']; g.update(1 / 60, { state: { x: 0, y: 0 }, consume: (a) => inputs.includes(a) && inputs.splice(inputs.indexOf(a), 1).length > 0 }, 5000);
  assert.match(g.message, /Slot B is empty/, 'the second button casts slot B');
});

test('the bottom row trades the Menu toggle for spell slot B', () => {
  for (const file of ['../index.html', '../proving-ground/index.html']) {
    const html = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(html, /data-action="spell2"/); assert.doesNotMatch(html, /id="fieldMenuToggle"/); assert.match(html, /id="hudExpand"/, 'field details stay reachable');
  }
});

test('release 261: two spell presets; the preset button swaps A and B; passives stay; older saves start with both as their slots', () => {
  const ab = (p) => ({ a: p.a, b: p.b }); // release 291: presets also carry the Build button's mode and item
  const s = freshSave(); const slots = ensureSlots(s); const before = JSON.stringify(s.constellation);
  assert.equal(s.magicSkills.preset, 0); assert.deepEqual(s.magicSkills.presets.map(ab), [{ ...slots }, { ...slots }], 'both presets start as the current slots');
  setSlot(s, 'a', 'spell:cinder-dart'); setSlot(s, 'b', null); assert.deepEqual(ab(s.magicSkills.presets[0]), { a: 'spell:cinder-dart', b: null }, 'setting a slot sets the active preset');
  let r = togglePreset(s); assert.equal(r.preset, 2); assert.equal(s.magicSkills.preset, 1); assert.deepEqual(s.magicSkills.slots, { ...slots }, 'preset 2 still holds the original spells');
  setSlot(s, 'a', 'spell:grave-sun'); setSlot(s, 'b', 'spell:ember-ring');
  r = togglePreset(s); assert.deepEqual(s.magicSkills.slots, { a: 'spell:cinder-dart', b: null }); assert.match(r.message, /preset 1/i);
  togglePreset(s); assert.deepEqual(s.magicSkills.slots, { a: 'spell:grave-sun', b: 'spell:ember-ring' });
  assert.equal(JSON.stringify(s.constellation), before, 'passives are untouched');
  const old = freshSave(); delete old.magicSkills.presets; delete old.magicSkills.preset; ensureSlots(old); assert.equal(old.magicSkills.preset, 0); assert.equal(old.magicSkills.presets.length, PRESETS);
  const bad = freshSave(); bad.magicSkills.presets = [{ a: 'spell:nonsense', b: 7 }, 'x']; bad.magicSkills.preset = 5; ensureSlots(bad); assert.equal(bad.magicSkills.preset, 0); assert.deepEqual(ab(bad.magicSkills.presets[1]), { ...bad.magicSkills.slots });
});
