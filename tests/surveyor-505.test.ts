// Release 505 (docs/narrative-bible.md, thread 2): the Surveyor's Chain, part one. Abel Corwin's links lie in crossings of the
// middle and far bands; each gives the next page of his notes, kept in the Journal; a crossing gives at most one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { SURVEYOR, SURVEYOR_NOTES, SURVEYOR_LENGTHS, surveyorCrossing, ensureSurveyor } from '../src/surveyor.ts';

test('twelve notes whose lengths grow by one more each time', () => {
  assert.equal(SURVEYOR_NOTES.length, SURVEYOR.links); assert.equal(SURVEYOR_LENGTHS.length, SURVEYOR.links);
  for (let i = 2; i < SURVEYOR_LENGTHS.length; i++) assert.equal(SURVEYOR_LENGTHS[i] - SURVEYOR_LENGTHS[i - 1], SURVEYOR_LENGTHS[i - 1] - SURVEYOR_LENGTHS[i - 2] + 1);
});

test('links lie only in crossings of the middle and far bands, at about the set chance', () => {
  let far = 0, hit = 0;
  for (let i = 0; i < 4000; i++) { const rx = (i % 40) - 20, ry = Math.floor(i / 40) - 50, id = `dungeon:SURV:g1:${rx}:${ry}:d${i}`; if (Math.hypot(rx, ry) < SURVEYOR.minRing) { assert.equal(surveyorCrossing('SURV', id), false); continue; } far++; if (surveyorCrossing('SURV', id)) hit++; }
  assert.ok(Math.abs(hit / far - SURVEYOR.chance) < .03, `${hit} of ${far}`);
  assert.equal(surveyorCrossing('SURV', 'dungeon:SURV:g1:0:2:x'), false, 'near the Refuge: none');
});

test('taking links: the notes come in order, into the Journal; a crossing gives one link; the state survives a save', () => {
  const s = migrateSave(freshSave()); s.seed = 'SURV'; const g = new Game(s, 0); const found = [];
  for (let i = 0; i < 6000 && found.length < 3; i++) {
    const rx = 9 + (i % 7), ry = 4 + Math.floor(i / 7) % 9, id = `dungeon:SURV:g${s.worldGeneration}:${rx}:${ry}:d${i}`; if (!surveyorCrossing('SURV', id)) continue;
    s.session.activeDungeonId = id; s.session.dungeonReturn = { rx, ry, x: 5, y: 5 }; g.rx = rx; g.ry = ry; g.loadArea('dungeon', false);
    const o = g.map.objects.find((q) => q.kind === 'surveyorLink'); if (!o) continue;
    Object.assign(g.player, { x: o.x, y: o.y + .6 }); const r = g.interact('take', o.id); assert.ok(r.ok, r.message); found.push(r.index); assert.equal(r.note, SURVEYOR_NOTES[found.length - 1]);
    g.loadArea('dungeon', false); assert.equal(g.map.objects.some((q) => q.kind === 'surveyorLink' && q.state !== 'taken'), false, 'no second link in that crossing');
  }
  assert.deepEqual(found, [0, 1, 2]);
  assert.ok(JSON.stringify(s.journal || s.journalEntries || s).includes(SURVEYOR_NOTES[0].slice(0, 30)), 'in the Journal');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(ensureSurveyor(back).links, [0, 1, 2]);
});
