// Release 575 (Tim, 2026-10-29): the Transit Lattice's passives grouped by what they serve (each skill, then spells, tools and
// what is always on), in a Passives view of folds, an Echoes view and the old All view.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { latticePassiveGroups, PASSIVE_KEYS, BRANCH_IDS, BRANCHES, NODE_EFFECTS, ALT_PASSIVES } from '../src/constellation.ts';
import { FIELD_KEYS, TOOL_FORM_KEYS } from '../src/lattice-fields.ts';
import { APERTURE_SKILLS } from '../src/items.ts';

test('every Lattice passive sits in exactly one group', () => {
  const groups = latticePassiveGroups(), all = groups.flatMap((g) => g.keys);
  assert.deepEqual([...all].sort(), [...PASSIVE_KEYS, ...FIELD_KEYS, ...TOOL_FORM_KEYS].sort());
  assert.equal(new Set(all).size, all.length, 'no passive twice');
  assert.deepEqual(groups.map((g) => g.id), [...BRANCH_IDS, 'spells', 'tools', 'general']);
});

test('a skill holds its own modifier and capstones; what is always on is General', () => {
  const groups = latticePassiveGroups(), byId = Object.fromEntries(groups.map((g) => [g.id, g]));
  for (const bid of BRANCH_IDS) {
    const b = BRANCHES[bid], g = byId[bid]; assert.equal(g.title, APERTURE_SKILLS[b.active].name); assert.ok(g.skill);
    for (const key of g.keys) assert.ok([b.mod, ...b.caps].some((n) => key === n.id || key === `${n.id}:alt`), `${key} belongs to ${bid}`);
  }
  assert.equal(byId.force.title, 'Force Channel'); assert.ok(byId.force.keys.includes('overflow:alt'), 'Wellspring sits under Force Channel');
  for (const key of byId.general.keys) { const [id, alt] = key.split(':'); assert.equal(alt ? ALT_PASSIVES[id].kind : NODE_EFFECTS[id].kind, 'always'); }
  assert.ok(byId.general.keys.includes('light-feet')); assert.deepEqual(byId.spells.keys, FIELD_KEYS); assert.deepEqual(byId.tools.keys, TOOL_FORM_KEYS);
});

test('the Lattice page has Passives, Echoes and All views, and folds that remember being open', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /LATTICE_VIEWS=\[\['passives','Passives'\],\['echoes','Echoes'\],\['all','All'\]\]/);
  assert.match(main, /latticePassiveGroups\(\)/); assert.match(main, /latticeFolds\.add\(g\.id\)/);
});
