// Release 393: presets carry the whole build: spell and skill glyphs, passive forms and the Transit Lattice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { ensureSlots } from '../src/spell-slots.ts';
import { swapPreset, snapshotBuild, applyBuild, normalizeBuild } from '../src/build-presets.ts';
import { socketGlyph } from '../src/glyphs.ts';
import { ensureLattice } from '../src/transit-lattice.ts';

const ready = () => { const s = freshSave(); s.seed = 'PRESET'; ensureSlots(s); ensureLattice(s); s.glyphs.ignite = 2; s.glyphs.chain = 2; s.glyphs.echo = 2; return s; };

test('the first switch keeps the build; after that each preset brings back its own glyphs, forms and Lattice picks', () => {
  const s = ready();
  socketGlyph(s, 'ember-ring', 0, 'ignite'); s.constellation.alt = { 'light-feet': true }; s.lattice.passives = ['light-feet:alt'];
  const one = snapshotBuild(s);
  swapPreset(s); assert.equal(s.magicSkills.preset, 1); assert.deepEqual(snapshotBuild(s), one, 'nothing changes on the first switch');
  socketGlyph(s, 'ember-ring', 0, null); socketGlyph(s, 'ember-ring', 0, 'chain'); s.constellation.alt = {}; s.lattice.passives = [];
  const two = snapshotBuild(s);
  const r = swapPreset(s); assert.equal(s.magicSkills.preset, 0); assert.match(r.message, /Glyphs, passive forms and the Lattice follow/);
  assert.equal(s.spellGlyphs['ember-ring'][0], 'ignite'); assert.deepEqual(s.constellation.alt, { 'light-feet': true }); assert.deepEqual(s.lattice.passives, ['light-feet:alt']);
  swapPreset(s); assert.equal(s.spellGlyphs['ember-ring'][0], 'chain'); assert.deepEqual(s.constellation.alt, {}); assert.deepEqual(snapshotBuild(s), two);
  assert.equal(s.glyphs.ignite + s.glyphs.chain, 3, 'glyphs move between pouch and sockets, never lost or copied');
});

test('a glyph no longer in the pouch is left empty and named', () => {
  const s = ready(); s.glyphs.echo = 1;
  const missing = applyBuild(s, { glyphs: { 'ember-ring': ['echo', 'echo'] } });
  assert.deepEqual(missing, ['Echo']); assert.equal(s.glyphs.echo, 0);
});

test('presets with builds survive a reload, and junk is dropped', () => {
  const s = ready(); socketGlyph(s, 'ember-ring', 0, 'ignite'); swapPreset(s); swapPreset(s);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(back.magicSkills.presets[0].build && back.magicSkills.presets[1].build);
  assert.deepEqual(normalizeBuild({ glyphs: { x: ['nope', 'ignite'] }, alt: { 'not-a-node': true }, lattice: { passives: [3, 'a'] } }), { glyphs: { x: [null, 'ignite'] }, alt: {}, lattice: { passives: ['a'], echoes: [] } });
  assert.equal(normalizeBuild(null), null);
});
