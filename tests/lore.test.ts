import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { RECITATIONS } from '../src/recitations.ts';
import { READINGS, READING_ORDER, BOOK_SIZE, readingAt, readingLines, bookPieces, ensureLore, hearLine, heardLine, bookProgress, enterReading, nextReadingLine } from '../src/lore.ts';
import { travelerTalk, reciterTalk, reciterPlan, READING_VOICE_SHARE, RECITER_CHANCE } from '../src/travelers.ts';
import { applyInteraction } from '../src/interactions.ts';

function seeded(n = 1) { let x = n; return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); }

test('Readings divide the Atlas into bands and quarters, north up', () => {
  assert.equal(readingAt(0, 0), 'longCampaign');
  assert.equal(readingAt(3, -3), 'longCampaign');
  assert.equal(readingAt(0, -10), 'riverThatRemembers');
  assert.equal(readingAt(10, 0), 'transparentEye');
  assert.equal(readingAt(0, 10), 'yellowCity');
  assert.equal(readingAt(-10, 0), 'pathAlone');
  assert.equal(readingAt(0, -20), 'threeBrothers');
  assert.equal(readingAt(20, 0), 'bookOfImages');
  assert.equal(readingAt(0, 20), 'underTheFloor');
  assert.equal(readingAt(-20, 0), 'secondCampaign');
  assert.equal(readingAt(30, 30), 'dreamlands');
  assert.deepEqual([...new Set(READING_ORDER)].sort(), Object.keys(READINGS).sort());
});

test('every book has 20 distinct pieces pointing at real lines of its own voices', () => {
  for (const id of READING_ORDER) {
    const pieces = bookPieces(id), lines = new Set(readingLines(id).map(([v, i]) => `${v}:${i}`));
    assert.equal(pieces.length, BOOK_SIZE, id);
    assert.equal(new Set(pieces.map((p) => p.id)).size, BOOK_SIZE, id);
    const spoken = pieces.filter((p) => p.voice);
    assert.equal(new Set(spoken.map((p) => `${p.voice}:${p.line}`)).size, spoken.length, `${id} pieces share a line`);
    for (const p of spoken) { assert.ok(lines.has(`${p.voice}:${p.line}`), `${id} ${p.id}`); assert.ok(RECITATIONS[p.voice][p.line]); }
  }
  // The two War and Peace Readings hear different halves.
  const a = new Set(readingLines('longCampaign').map(String)), b = readingLines('secondCampaign').map(String);
  assert.ok(b.every((k) => !a.has(k)));
});

test('saves gain an additive lore block that survives migration and drops junk', () => {
  const s = freshSave();
  assert.deepEqual(s.lore, { v: 1, heard: {}, pieces: {}, entered: {} });
  hearLine(s, 'siddhartha', 5);
  s.lore.pieces.riverThatRemembers = ['voice:0', 'nonsense', 'voice:0'];
  s.lore.pieces.unknownReading = ['voice:1'];
  s.lore.heard.nobody = 'ff';
  s.lore.future = { kept: true };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.version, 14);
  assert.ok(heardLine(m, 'siddhartha', 5));
  assert.deepEqual(m.lore.pieces.riverThatRemembers, ['voice:0']);
  assert.equal(m.lore.pieces.unknownReading, undefined);
  assert.equal(m.lore.heard.nobody, undefined);
  assert.deepEqual(m.lore.future, { kept: true });
  const old = migrateSave({ ...JSON.parse(JSON.stringify(freshSave())), lore: undefined });
  assert.deepEqual(old.lore.pieces, {});
});

test('hearing a piece line credits its book once; recitations count only from reciters', () => {
  const s = freshSave(), [voice, recite] = [bookPieces('yellowCity').find((p) => p.kind === 'voice'), bookPieces('yellowCity').find((p) => p.kind === 'recite')];
  assert.equal(hearLine(s, voice.voice, voice.line).piece.id, voice.id);
  assert.equal(hearLine(s, voice.voice, voice.line), null);
  assert.equal(hearLine(s, recite.voice, recite.line), null);
  assert.equal(hearLine(s, recite.voice, recite.line, { reciter: true }).piece.id, recite.id);
  assert.deepEqual(bookProgress(s, 'yellowCity'), { found: 2, total: 20, mastered: false });
  s.lore.pieces.yellowCity = bookPieces('yellowCity').map((p) => p.id);
  assert.equal(bookProgress(s, 'yellowCity').mastered, true);
});

test('a Reading never repeats a line until every line has been heard', () => {
  const s = freshSave(), rand = seeded(7), total = readingLines('pathAlone').length - bookPieces('pathAlone').filter((p) => p.kind === 'recite').length, seen = new Set();
  for (let i = 0; i < total; i++) { const l = nextReadingLine(s, 'pathAlone', rand); assert.ok(!seen.has(`${l.voice}:${l.line}`), `repeat after ${i}`); seen.add(`${l.voice}:${l.line}`); hearLine(s, l.voice, l.line); }
  assert.equal(seen.size, total);
  assert.ok(nextReadingLine(s, 'pathAlone', rand), 'falls back to heard lines once exhausted');
  // Every voice piece was found along the way; recitation pieces wait for the reciter.
  assert.equal(bookProgress(s, 'pathAlone').found, 8);
});

test('first entry into a Reading is announced once', () => {
  const s = freshSave();
  assert.deepEqual(enterReading(s, 0, -12), { id: 'riverThatRemembers', name: 'The River That Remembers' });
  assert.equal(enterReading(s, 2, -12), null);
});

test('travellers speak their Reading and reciters do not repeat themselves', () => {
  const s = freshSave(); s.session = { ...s.session, rx: 0, ry: -12 };
  const o = { name: 'Brisk', role: 'Pilgrim', lines: ['Spoons. That is all I will say.'] }, said = new Set();
  for (let i = 0; i < 30; i++) { const msg = travelerTalk(o, s); assert.match(msg, /^Brisk \(Pilgrim\): “/); assert.ok(!/Spoons/.test(msg)); said.add(msg.replace(/ · A page.*$/, '')); }
  assert.equal(said.size, 30);
  assert.ok(Object.keys(s.lore.heard).every((v) => v === 'siddhartha'));
  assert.match(travelerTalk(o), /Spoons/, 'without a save the old lines remain');
  const r = { reciter: 'musashi', linesLeft: 99 }, lines = new Set();
  for (let i = 0; i < RECITATIONS.musashi.length; i++) lines.add(reciterTalk(r, s).replace(/ · A page.*$/, ''));
  assert.equal(lines.size, RECITATIONS.musashi.length);
  assert.equal(bookProgress(s, 'pathAlone').found, 11, 'all voice and recitation pieces of the Path Walked Alone');
  const res = applyInteraction({ kind: 'traveler', actions: ['speak'], name: 'Hob' }, 'speak', s);
  assert.ok(res.ok && /^Hob: “/.test(res.message));
});

test('reciters lean toward the voices of the Reading they walk in', () => {
  const s = freshSave(); let local = 0, n = 0;
  for (let i = 0; i < 4000 && n < 300; i++) { const q = reciterPlan('seed-x', `k${i}`, s, 1, 'yellowCity'); n++; if (['raskolnikov', 'porfiry', 'svidrigailov'].includes(q.id)) local++; }
  assert.ok(local / n > READING_VOICE_SHARE - 0.1, `${local}/${n}`);
  // Without a Reading the plan is unchanged from before.
  assert.equal(reciterPlan('seed-x', 'k1', s, 1).id, reciterPlan('seed-x', 'k1', s, 1, null).id);
  assert.ok(RECITER_CHANCE.wild < 1);
});
