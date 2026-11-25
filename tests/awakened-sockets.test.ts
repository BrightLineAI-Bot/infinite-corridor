// Awakened sockets (Tim, 2026-11-25): glyph sockets stay by rarity (SOCKETS_BY_TIER); awakening a weapon or tool adds
// AWAKENED_SOCKETS more, the smith's extra socket still stacks (at most SOCKET_MAX: a relic's 3 + 1 + 1), and items awakened before
// open theirs on load: idempotent, additive, every socketed glyph kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { SOCKETS_BY_TIER, AWAKENED_SOCKETS, SOCKET_MAX, socketCount, normalizeSockets, ensureGlyphState, saveGlyphLayout, applyGlyphLayout } from '../src/glyphs.ts';
import { awaken, AWAKEN_COST } from '../src/constellation.ts';
import { addSocket } from '../src/smithy.ts';
import { ensurePresetGear } from '../src/build-presets.ts';

const relic = (slot, name, property, extra = {}) => ({ id: `${slot}-4437426`, name, slot, power: 51, basePower: 45, upgradeRank: 6, property, tier: 'relic', affixes: [], ...extra });
const awake = { resonance: 'ember-choir', version: 1 };

test('the numbers: sockets by rarity unchanged; +1 for an awakened weapon or tool; at most 5', () => {
  assert.deepEqual(SOCKETS_BY_TIER, { common: 1, rare: 2, epic: 2, relic: 3 });
  assert.equal(AWAKENED_SOCKETS, 1); assert.equal(SOCKET_MAX, 5);
  for (const tier of Object.keys(SOCKETS_BY_TIER)) for (const slot of ['primary', 'secondary']) {
    const item = { slot, tier }; assert.equal(socketCount(item), SOCKETS_BY_TIER[tier]);
    assert.equal(socketCount({ ...item, awakened: awake }), SOCKETS_BY_TIER[tier] + 1, `${tier} ${slot} awakened`);
    assert.equal(socketCount({ ...item, awakened: awake, extraSockets: 1 }), SOCKETS_BY_TIER[tier] + 2, `${tier} ${slot} awakened, and the smith's`);
  }
  assert.equal(socketCount({ slot: 'primary', tier: 'relic', awakened: awake, extraSockets: 1 }), SOCKET_MAX);
  assert.equal(socketCount({ slot: 'armor', tier: 'relic', awakened: awake }), 3, 'armor never awakens: no extra socket');
  assert.equal(socketCount({ slot: 'charm', tier: 'relic', awakened: awake }), 0);
  assert.equal(socketCount({ slot: 'primary', tier: 'relic', awakened: true }), 3, 'only an awakening record counts');
});

test('awakening opens the socket at once, keeping the glyphs; the smith\'s socket still stacks to 5', () => {
  const s = freshSave(); s.perception.aperture = 90; s.materials.lumenDust = 50; s.materials.cinderIron = 50; s.farArray = { ...s.farArray, listeners: 5 };
  s.equipment.primary = normalizeSockets(relic('primary', 'Verge Cleaver', 'impact', { glyphs: ['ignite', 'echo', 'leech'] }));
  const r = awaken(s, 'primary'); assert.equal(r.ok, true, r.message); assert.match(r.message, /new glyph socket/);
  assert.deepEqual(s.equipment.primary.glyphs, ['ignite', 'echo', 'leech', null]); assert.equal(s.materials.lumenDust, 50 - AWAKEN_COST);
  const k = addSocket(s, 'primary'); assert.equal(k.ok, true, k.message); assert.match(k.message, /5 now/);
  assert.deepEqual(s.equipment.primary.glyphs, ['ignite', 'echo', 'leech', null, null]);
  s.equipment.primary.glyphs = ['ignite', 'echo', 'leech', 'chain', 'tether'];
  assert.equal(saveGlyphLayout(s, 'melee').ok, true); assert.deepEqual(s.glyphLayouts.melee, ['ignite', 'echo', 'leech', 'chain', 'tether']);
  ensureGlyphState(s); assert.deepEqual(s.glyphLayouts.melee, ['ignite', 'echo', 'leech', 'chain', 'tether'], 'a five-socket layout survives normalisation');
  s.glyphs.chain += 1; s.glyphs.tether += 1; for (const q of ['ignite', 'echo', 'leech']) s.glyphs[q] += 1;
  assert.equal(applyGlyphLayout(s, 'melee').ok, true); assert.deepEqual(s.equipment.primary.glyphs, ['ignite', 'echo', 'leech', 'chain', 'tether']);
});

test('on load: an item awakened before gains its socket, wherever it is kept; idempotent; glyphs and unknown fields kept', () => {
  const s = freshSave(); s.seed = 'AWAKE-SOCKETS';
  s.equipment.primary = relic('primary', 'Quandrix Staff', 'arcane', { glyphs: ['echo', 'leech', 'ignite'], awakened: awake, futureField: 7 }); // as saved before: 3 sockets
  s.equipment.secondary = relic('secondary', 'Aether Orrery', 'orrery', { id: 'secondary-98740889', glyphs: ['echo', 'echo', 'ignite', 'chain'], awakened: awake, extraSockets: 1 });
  s.equipment.armor = relic('armor', 'Glassweave Coat', 'stamina', { id: 'armor-1', glyphs: ['still', 'still', 'still'], awakened: awake });
  s.inventory = [relic('secondary', 'Spark Coil', 'focus', { id: 'secondary-1234', glyphs: ['chain', null], tier: 'rare', awakened: awake })];
  s.presetGear = [{ primary: relic('primary', 'Salvage Blade', 'steady', { id: 'primary-777', glyphs: ['leech', 'heavy', 'echo'], awakened: awake }), secondary: null }, { primary: null, secondary: null }];
  const once = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(once.equipment.primary.glyphs, ['echo', 'leech', 'ignite', null]); assert.equal(once.equipment.primary.futureField, 7);
  assert.deepEqual(once.equipment.secondary.glyphs, ['echo', 'echo', 'ignite', 'chain', null], 'awakened with the smith\'s socket: 5');
  assert.deepEqual(once.equipment.armor.glyphs, ['still', 'still', 'still'], 'armor unchanged');
  assert.deepEqual(once.inventory.find((q) => q.id === 'secondary-1234').glyphs, ['chain', null, null], 'in the pack too');
  assert.deepEqual(once.presetGear[0].primary.glyphs, ['leech', 'heavy', 'echo', null], 'and held for the other preset');
  const twice = migrateSave(JSON.parse(JSON.stringify(once)));
  for (const k of ['primary', 'secondary', 'armor']) assert.deepEqual(twice.equipment[k].glyphs, once.equipment[k].glyphs, `${k}: idempotent`);
  assert.deepEqual(twice.presetGear, once.presetGear); assert.deepEqual(twice.inventory, once.inventory);
  ensurePresetGear(twice); ensureGlyphState(twice); assert.deepEqual(twice.presetGear[0].primary.glyphs, ['leech', 'heavy', 'echo', null]);
  const glyphs = Object.values(once.glyphs).reduce((n, v) => n + v, 0); assert.equal(Object.values(twice.glyphs).reduce((n, v) => n + v, 0), glyphs, 'no glyph is lost or made');
});

test('an unawakened item is exactly as before', () => {
  const s = freshSave(); s.equipment.primary = relic('primary', 'Verge Cleaver', 'impact', { glyphs: ['ignite', 'echo', 'leech'] });
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).equipment.primary.glyphs, ['ignite', 'echo', 'leech']);
});
