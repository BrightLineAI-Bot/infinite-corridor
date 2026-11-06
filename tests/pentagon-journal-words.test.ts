// Release 775's Pentagon Journal lines gave the Pentagon's section; release 777 writes words only (Tim, 2026-11-05: "it's
// gonna be on you to find them"). Tim, 2026-11-06: rewrite the old stored lines in words. migrateSave (ensurePentagonJournal)
// rewrites `pentagon-sigil:` and `pentagon-hunt:` records into PENTAGON_FINDING.messages.sigilJournal / huntJournal, with the
// heading and distance words; `pentagon-hunt-done:` keeps its section. Additive at schema 14, idempotent, never throws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { PENTAGON_FINDING, PENTAGON_JOURNAL, pentagonHeading, pentagonFarWords, pentagonJournalWords, ensurePentagonJournal } from '../src/pentagon.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const M = PENTAGON_FINDING.messages, words = (dx, dy) => [pentagonHeading(dx, dy), pentagonFarWords(Math.round(Math.hypot(dx, dy)))];
// Release 775's exact text (src/game.ts at 4559b396: readPentagonSigil and offerPentagonHunt).
const oldSigil = (rx, ry, cx, cy) => ({ recordId: `pentagon-sigil:${cx}:${cy}`, instanceKey: `record:pentagon-sigil:${cx}:${cy}`, title: 'The Pentagon', text: `A Pentagon sigil, read at ${rx}, ${ry}, points ${pentagonHeading(cx - rx, cy - ry)} to a Pentagon at ${cx}, ${cy}.`, provenance: 'original' });
const oldHunt = (id, rx, ry, cx, cy) => ({ recordId: `pentagon-hunt:${id}`, instanceKey: `record:pentagon-hunt:${id}`, title: 'The Pentagon', text: `A Pentagon hunt: a five-sided wall stands at ${cx}, ${cy}, ${pentagonHeading(cx - rx, cy - ry)} of ${rx}, ${ry}.`, provenance: 'original' });
const done = (id, cx, cy) => ({ recordId: `pentagon-hunt-done:${id}`, instanceKey: `record:pentagon-hunt-done:${id}`, title: 'The Pentagon', text: `The Pentagon hunt is complete: the Pentagon at ${cx}, ${cy}.`, provenance: 'original' });
const NUM = /-?\d+, -?\d+/;
function journey(records) { const s = freshSave(); s.seed = 'PJW'; s.narrative.journal.push(...structuredClone(records)); return s; }

test('the table: 775\'s two shapes by id prefix, never the completion lines', () => {
  assert.deepEqual(Object.keys(PENTAGON_JOURNAL.retired), ['pentagon-sigil:', 'pentagon-hunt:']);
  assert.equal(pentagonJournalWords(done('h1', 120, 40)), null, 'the done line keeps its section');
});

test('migrateSave rewrites 775\'s sigil and hunt lines in 777\'s words, with heading and distance, and keeps every other field', () => {
  const sigil = { ...oldSigil(112, 48, 120, 40), seen: 3, extra: { keep: true } }, hunt = { ...oldHunt('h7', 10, -4, 40, -44), note: 'kept' }, fin = done('h7', 40, -44);
  const other = { recordId: 'bell:2', instanceKey: 'record:bell:2', title: 'The Seven Bells', text: 'A cracked bell rang at 120, 44.', provenance: 'original' };
  const s = migrateSave(journey([other, sigil, hunt, fin]));
  assert.equal(s.version, 14);
  const [o2, s2, h2, f2] = s.narrative.journal.slice(-4);
  assert.deepEqual(o2, other, 'another line, numbers and all, untouched');
  assert.equal(s2.text, M.sigilJournal(...words(8, -8))); assert.match(s2.text, /north-east/); assert.doesNotMatch(s2.text, NUM);
  assert.deepEqual({ ...s2, text: null }, { ...sigil, text: null }, 'every other field of the sigil line kept, unknown ones too');
  assert.equal(h2.text, M.huntJournal(...words(30, -40))); assert.match(h2.text, /north-east, very far off/); assert.doesNotMatch(h2.text, NUM);
  assert.deepEqual({ ...h2, text: null }, { ...hunt, text: null });
  assert.deepEqual(f2, fin, 'the completion line keeps its section');
});

test('every heading and distance band reads as 777 would have written it', () => {
  for (const [dx, dy] of [[1, 0], [5, 5], [0, 9], [-12, 12], [-20, 0], [-30, -30], [0, -60], [44, -3], [3, 200]]) {
    const s = migrateSave(journey([oldSigil(7, 7, 7 + dx, 7 + dy), oldHunt(`h${dx}`, -3, 2, -3 + dx, 2 + dy)])), [a, b] = s.narrative.journal.slice(-2);
    assert.equal(a.text, M.sigilJournal(...words(dx, dy)), `sigil ${dx},${dy}`); assert.equal(b.text, M.huntJournal(...words(dx, dy)), `hunt ${dx},${dy}`);
  }
});

test('idempotent: a second migration, a save round trip and a third migration change nothing more', () => {
  const once = migrateSave(journey([oldSigil(0, 4, 8, 0), oldHunt('a', 1, 1, -30, 20)])), twice = migrateSave(structuredClone(once));
  assert.deepEqual(twice.narrative.journal, once.narrative.journal);
  const { main, puts } = splitSnapshot(snapshotSave(structuredClone(once))), v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); assert.deepEqual(v.save.narrative.journal, once.narrative.journal);
  assert.deepEqual(migrateSave(structuredClone(v.save)).narrative.journal, once.narrative.journal);
  const s = structuredClone(once); ensurePentagonJournal(s); assert.deepEqual(s.narrative.journal, once.narrative.journal);
});

test('odd data never fails: what cannot be read is left exactly as it was', () => {
  const odd = [
    null, 7, 'pentagon-sigil:1:2', [], { recordId: 'pentagon-sigil:1:2' }, { recordId: 'pentagon-sigil:1:2', text: 42 },
    { recordId: 42, text: 'A Pentagon sigil, read at 0, 0, points east to a Pentagon at 8, 0.' },
    { recordId: 'pentagon-sigil:8:0', text: 'A Pentagon sigil, read at x, 0, points east to a Pentagon at 8, 0.' },
    { recordId: 'pentagon-sigil:8:0', text: 'A Pentagon sigil, read at 8, 0, points here to a Pentagon at 8, 0.' }, // no heading from a section to itself
    { recordId: 'pentagon-sigil:8:0', text: 'A Pentagon sigil, read at 99999999999999999999, 0, points east to a Pentagon at 8, 0.' },
    { recordId: 'pentagon-hunt:z', text: 'A Pentagon hunt: a five-sided wall stands somewhere.' },
    { recordId: 'pentagon-hunt:z', text: 'A Pentagon hunt opens: a five-sided wall stands to the east, far off. Nothing marks it on the map; it is yours to find.' },
    { recordId: 'pentagon-sigil-other:8:0', text: 'A Pentagon sigil, read at 0, 0, points east to a Pentagon at 8, 0.' },
  ];
  const s = journey([]); s.narrative.journal = structuredClone(odd); assert.doesNotThrow(() => ensurePentagonJournal(s)); assert.deepEqual(s.narrative.journal, odd);
  for (const bad of [undefined, null, {}, { narrative: null }, { narrative: { journal: 'x' } }, { narrative: { journal: { 0: oldSigil(0, 0, 8, 0) } } }]) assert.doesNotThrow(() => ensurePentagonJournal(bad));
  const frozen = journey([]); frozen.narrative.journal = [Object.freeze(oldSigil(0, 0, 8, 0))]; ensurePentagonJournal(frozen); assert.equal(frozen.narrative.journal[0].text, M.sigilJournal(...words(8, 0)), 'a frozen record is replaced, not written into');
  const m = migrateSave(journey([oldSigil(0, 0, 8, 0)])); m.narrative.journal.push(...structuredClone(odd.filter((q) => q && typeof q === 'object' && !Array.isArray(q))));
  assert.doesNotThrow(() => migrateSave(structuredClone(m)));
});
