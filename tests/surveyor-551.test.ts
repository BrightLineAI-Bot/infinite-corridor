// Release 551 (docs/narrative-bible.md, thread 2): the Surveyor's Chain, part two. With all twelve links the crossings join into
// one chain on the Atlas that runs to the edge of the Far Sleep, where Abel Corwin stands as a statue, measuring himself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { SURVEYOR, ensureSurveyor, takeSurveyorLink, surveyorStatueSection, surveyorChainPath, addSurveyorStatue, visitSurveyorStatue, surveyorComplete } from '../src/surveyor.ts';
import { FAR_SLEEP_DEPTH, farSleepSection } from '../src/landscape.ts';

const withLinks = (n) => { const s = freshSave(); s.seed = 'CORWIN'; for (let i = 0; i < n; i++) takeSurveyorLink(s, { state: 'lying' }, `dungeon:CORWIN:g1:${9 + i}:${-3 - i}:d${i}`); return s; };

test('no chain and no statue before all twelve links', () => {
  const s = withLinks(11); assert.equal(surveyorComplete(s), false); assert.equal(surveyorStatueSection(s), null); assert.deepEqual(surveyorChainPath(s), []);
});

test('with twelve, the crossings in order make the chain, ending at a statue just inside the Far Sleep, along the twelfth', () => {
  const s = withLinks(12), at = surveyorStatueSection(s), path = surveyorChainPath(s);
  assert.equal(path.length, SURVEYOR.links + 1); assert.deepEqual(path[0], { rx: 9, ry: -3 }); assert.deepEqual(path.at(-1), at);
  assert.equal(Math.abs(at.rx) + Math.abs(at.ry), FAR_SLEEP_DEPTH + 1); assert.ok(farSleepSection(at.rx, at.ry)); assert.ok(at.rx > 0 && at.ry < 0, 'the same way as the twelfth crossing');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(surveyorStatueSection(back), at, 'it never moves');
});

test('the statue rises on its section only, once; touching it closes the thread', () => {
  const s = withLinks(12), at = surveyorStatueSection(s), map = () => ({ width: 32, objects: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'sleepMeadow', blocked: false })) });
  assert.equal(addSurveyorStatue(map(), s, at.rx + 1, at.ry), null);
  const m = map(), o = addSurveyorStatue(m, s, at.rx, at.ry); assert.ok(o); assert.equal(addSurveyorStatue(m, s, at.rx, at.ry), null);
  const first = visitSurveyorStatue(s, o); assert.equal(first.first, true); assert.match(first.message, /measured everything else/); assert.equal(visitSurveyorStatue(s, o).first, false);
});

test('in the game: the twelfth link points the Journal at the statue, and the statue writes the last page', () => {
  const s = withLinks(11); const g = new Game(s, 0);
  g.map.objects.push({ id: 'surveyor-link', kind: 'surveyorLink', x: g.player.x, y: g.player.y, state: 'lying', actions: ['take'] });
  g.interact('take', 'surveyor-link');
  assert.equal(surveyorComplete(s), true); const at = surveyorStatueSection(s);
  assert.match(g.message, new RegExp(`edge of the Far Sleep, at ${at.rx}, ${at.ry}`));
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'surveyor:map'));
  g.map.objects.push({ id: 'surveyor-statue', kind: 'surveyorStatue', x: g.player.x, y: g.player.y, state: 'standing', actions: ['inspect'] });
  g.interact('inspect', 'surveyor-statue');
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'surveyor:statue')); assert.equal(ensureSurveyor(s).statueSeen, true);
});
