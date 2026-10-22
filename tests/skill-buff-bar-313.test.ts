// Release 313 (Tim, 2026-10-22): a running skill's button shows how much of its effect is left, draining to nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buffLeft, RIFT_INFUSE_SECONDS } from '../src/spell-slots.ts';
import { SKILL_INFUSE_AFTER_STEP } from '../src/glyphs.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

test("the buff left drains from 1 to 0 over the skill's own duration", () => {
  const s = freshSave(); s.magicSkills.learned = { 'ember-form': 1 }; const g = new Game(s, 0);
  assert.equal(buffLeft(s, 'skill:ember-form'), 0, 'not running');
  assert.equal(g.activateApertureSkill('ember-form'), true); const total = s.magicSkills.active.duration; assert.ok(total > 0);
  assert.equal(buffLeft(s, 'skill:ember-form'), 1);
  s.magicSkills.active.remaining = total / 4; assert.ok(Math.abs(buffLeft(s, 'skill:ember-form') - .25) < 1e-9);
  assert.equal(buffLeft(s, 'skill:quickening'), 0, 'only the running skill');
  assert.equal(buffLeft(s, 'spell:ember-ring'), 0, 'spells are instant');
  s.magicSkills.active = { id: 'ember-form', rank: 1, remaining: 1 }; assert.ok(buffLeft(s, 'skill:ember-form') > 0, 'an older save without duration still shows');
});

test('Rift Step shows its after-step infusion', () => {
  assert.equal(RIFT_INFUSE_SECONDS, SKILL_INFUSE_AFTER_STEP);
  const s = freshSave(); s.magicSkills.riftInfuse = 2; assert.equal(buffLeft(s, 'skill:rift-step'), .5);
});
