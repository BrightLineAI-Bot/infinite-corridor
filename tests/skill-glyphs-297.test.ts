// Release 297 (Tim, 2026-10-22): glyphs modify the Aperture skills (constellation) slotted in A or B, not only spells.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_GLYPHS, skillGlyphMods, skillInfusion, socketGlyph, hostLoadout, SKILL_INFUSE_AFTER_STEP, GLYPHS } from '../src/glyphs.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

test('every glyph says what it does in a skill; skill sockets are kept in the save', () => {
  for (const id of Object.keys(GLYPHS)) assert.ok(SKILL_GLYPHS[id]?.text && GLYPHS[id].text.skill, id);
  const s = freshSave(); s.glyphs.echo = 1; s.glyphs.pierce = 1;
  assert.equal(socketGlyph(s, 'skill:rift-step', 0, 'echo').ok, true); assert.equal(socketGlyph(s, 'skill:rift-step', 1, 'pierce').ok, true);
  assert.deepEqual(skillGlyphMods(s, 'rift-step'), { cooldown: .9, duration: 1.25, reach: 2, charges: 1 });
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).spellGlyphs['skill:rift-step'], ['echo', 'pierce', null]); // release 529: a third socket for triads
});

test('a timed skill lasts longer and recovers faster with its glyphs; infusing glyphs ride on weapon hits while it is active', () => {
  const s = freshSave(), g = new Game(s, 0); g.loadArea('overworld', false);
  s.magicSkills.learned.quickening = 1; s.glyphs.swift = 1; s.glyphs.heavy = 1; s.glyphs.leech = 1;
  g.activateApertureSkill('quickening'); const plainDur = s.magicSkills.active.remaining, plainCd = s.magicSkills.cooldowns.quickening;
  s.magicSkills.active = null; s.magicSkills.cooldowns.quickening = 0;
  socketGlyph(s, 'skill:quickening', 0, 'swift'); socketGlyph(s, 'skill:quickening', 1, 'heavy');
  g.activateApertureSkill('quickening'); assert.ok(s.magicSkills.active.remaining > plainDur * 1.3); assert.ok(s.magicSkills.cooldowns.quickening < plainCd * .8);
  assert.deepEqual(skillInfusion(s), [], 'swift and heavy shape the skill, they do not infuse');
  socketGlyph(s, 'skill:quickening', 1, 'leech'); assert.deepEqual(skillInfusion(s), ['leech']); assert.ok(hostLoadout(s, 'melee').has('leech'), 'the weapon carries Leech while Quickening runs');
  s.magicSkills.active = null; assert.ok(!hostLoadout(s, 'melee').has('leech'));
  s.glyphs.leech += 1; s.magicSkills.riftInfuse = SKILL_INFUSE_AFTER_STEP; assert.equal(socketGlyph(s, 'skill:rift-step', 0, 'leech').ok, true); assert.deepEqual(skillInfusion(s), ['leech'], 'a Rift Step leaves its infusion for a while');
});
