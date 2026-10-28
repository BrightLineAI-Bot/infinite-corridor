// Release 517 (Tim, 2026-10-28: "assess whether... the glyphs are actually showing the resonances in the spells, or the
// skills... I've only discovered four"): every one of the eight resonances lights and is discovered when its pair sits in
// a spell, a weapon (the Iron Fists too) or a tool (Hammerfall too). In an Aperture skill only infusing glyphs carry onto
// weapon and tool hits, so only pairs of two infusing glyphs resonate there. Armor glyphs give bonuses, never resonances.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { RESONANCES, SKILL_GLYPHS } from '../src/glyphs.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const press = (k) => { let u = false; return { state: { x: 0, y: 0 }, consume: (q) => q === k && !u && (u = true), held: () => false }; };
const gear = (n) => ({ ...BRAWLER_GEAR.find((g) => g.item.name === n).item });
function arena(setup) {
  const s = freshSave(); s.seed = 'RES'; s.perception.aperture = 3255; setup(s); const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 11, 10), { id: 'foe', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 })];
  return { s, g };
}
const run = (setup, act) => { const { s, g } = arena(setup); let t = 1000; g.update(.05, idle, t); t += 50; act(g, t); for (let i = 0; i < 6; i++) { t += 50; g.update(.05, idle, t); } return s.glyphCodex.resonances; };
const HOSTS = {
  'a weapon': [(p) => (s) => { s.equipment.primary = { ...s.equipment.primary, tier: 'relic', glyphs: [...p, null] }; }, (g, t) => g.update(.05, press('attack'), t)],
  'the Iron Fists': [(p) => (s) => { s.equipment.primary = { ...gear('Iron Fists'), tier: 'relic', glyphs: [...p, null] }; }, (g, t) => g.update(.05, press('attack'), t)],
  'a tool': [(p) => (s) => { s.equipment.secondary = { id: 't', name: 'Needle Caster', slot: 'secondary', property: 'quick', power: 5, tier: 'relic', affixes: [], glyphs: [...p, null] }; }, (g, t) => g.update(.05, press('tool'), t)],
  'Hammerfall': [(p) => (s) => { s.equipment.secondary = { ...gear('Hammerfall'), tier: 'relic', glyphs: [...p, null] }; }, (g, t) => g.update(.05, press('tool'), t)],
  'a spell': [(p) => (s) => { s.spellGlyphs = { 'ember-ring': [...p] }; }, (g) => g.castSpell('ember-ring')],
  'Shadow Boxing': [(p) => (s) => { s.spellGlyphs = { 'shadow-boxing': [...p] }; }, (g) => g.castSpell('shadow-boxing')],
};

for (const [host, [setup, act]] of Object.entries(HOSTS)) test(`every resonance is discovered in ${host}`, () => {
  for (const [id, r] of Object.entries(RESONANCES)) assert.ok(run(setup(r.pair), act)[id], `${r.name} in ${host}`);
});

test('in an Aperture skill, a pair of infusing glyphs resonates on weapon hits while the skill holds', () => {
  for (const [id, r] of Object.entries(RESONANCES)) {
    const found = !!run((s) => { s.spellGlyphs = { 'skill:quickening': [...r.pair] }; s.magicSkills.learned = { ...(s.magicSkills.learned || {}), quickening: 1 }; }, (g, t) => { assert.ok(g.activateApertureSkill('quickening'), g.message); g.update(.05, press('attack'), t); })[id];
    assert.equal(found, r.pair.every((q) => SKILL_GLYPHS[q]?.infuse), r.name);
  }
});
