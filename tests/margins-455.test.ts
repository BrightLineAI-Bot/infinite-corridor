// Release 455 (docs/narrative-bible.md section 2, "Margins", and section 7, step 6): writing in the stone of ordinary
// crossings, a line of the Reading's book with a reader's note beside it, crediting the Reading's margin fragments.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { READINGS, READING_ORDER, readingLines, bookProgress } from '../src/lore.ts';
import { RECITATIONS } from '../src/recitations.ts';
import { MARGINS, MARGIN_NOTES, marginIn, marginPassage, addMargin, readMargin } from '../src/margins.ts';

const seed = 'MARGIN455';
const crossings = () => { const out = []; for (let rx = -40; rx <= 40; rx++) for (let ry = -40; ry <= 40; ry++) { const id = `dungeon:${seed}:g1:${rx}:${ry}:room`, m = marginIn(seed, id); if (m) out.push({ id, rx, ry, ...m }); } return out; };

test('one original note for every margin fragment of every Reading, each beside a short line of its own book', () => {
  for (const id of READING_ORDER) {
    assert.equal(MARGIN_NOTES[id].length, READINGS[id].pieces.margin, id);
    const own = new Set(readingLines(id).map(([v, n]) => RECITATIONS[v][n]));
    assert.equal(new Set(MARGIN_NOTES[id].map((_, i) => marginPassage(id, i))).size, MARGIN_NOTES[id].length, `${id}: a different line for each`);
    for (let i = 0; i < MARGIN_NOTES[id].length; i++) { const p = marginPassage(id, i); assert.ok(own.has(p) && p.length <= MARGINS.maxPassage, `${id} ${i}`); assert.ok(p.toLowerCase().includes(MARGIN_NOTES[id][i][0].toLowerCase()), `${id} ${i}: the note's own line`); }
  }
});

test('margins lie in ordinary crossings by seed, in every Reading; a read one gives way to an unread one', () => {
  const list = crossings(); assert.deepEqual(crossings(), list, 'deterministic');
  const share = list.length / (81 * 81); assert.ok(share > MARGINS.chance * .6 && share < MARGINS.chance * 1.4, `share ${share}`);
  for (const id of READING_ORDER) assert.ok(list.some((c) => c.readingId === id), id);
  const s = freshSave(); s.seed = seed; const c = list.find((q) => q.readingId === 'pathAlone'), map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
  const first = addMargin(map(), s, c.id); readMargin(s, first); const second = addMargin(map(), s, c.id);
  assert.notEqual(second.margin, first.margin, 'the same crossing now shows the other margin'); readMargin(s, second);
  assert.equal(bookProgress(s, 'pathAlone').found, 2); assert.equal(addMargin(map(), s, c.id).state, 'read', 'all read: its own, read');
  for (const id of ['dungeon:MARGIN455:g1', 'hunt-instance:1', 'arena:2', 'far-array:3', `displacement:1:2:x`]) assert.equal(marginIn(seed, id), null);
});

test('reading one: the line and the note, the fragment once, remembered on reload and through migration', () => {
  const s = freshSave(); s.seed = seed; const c = crossings().find((q) => q.readingId === 'longCampaign');
  const map = { width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) };
  const o = addMargin(map, s, c.id); assert.equal(o.kind, 'marginNote'); assert.ok(Math.hypot(o.x - 4, o.y - 5) >= MARGINS.minFromEntry);
  const r = readMargin(s, o); assert.ok(r.first && r.credit); assert.match(r.message, /Cut into the stone/); assert.ok(r.message.includes(MARGIN_NOTES.longCampaign[c.index][1]));
  assert.equal(bookProgress(s, 'longCampaign').found, 1); assert.equal(readMargin(s, o).first, false); assert.equal(bookProgress(s, 'longCampaign').found, 1);
  const s2 = migrateSave(JSON.parse(JSON.stringify(s))), again = addMargin({ ...map, objects: [] }, s2, c.id); assert.equal(bookProgress(s2, 'longCampaign').found, 1, 'kept'); assert.notEqual(again.margin, o.margin, 'next visit: an unread one'); assert.equal(again.state, 'unread');
});

test('found in a real crossing, read through Act, journalled, drawn and built', () => {
  const s = freshSave(); s.seed = seed; const c = crossings().find((q) => q.readingId === 'longCampaign'); s.session.activeDungeonId = c.id; s.session.dungeonReturn = { rx: c.rx, ry: c.ry, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'marginNote');
  assert.ok(o, 'the writing is there'); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y + .2 });
  const r = g.interact('read', o.id); assert.ok(r.ok && r.first, g.message); assert.match(g.message, /A fragment of a book you have not heard yet|A margin of/);
  assert.ok(s.narrative.journal.some((j) => String(j.recordId).startsWith('margin:longCampaign:')));
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /o\.kind === "marginNote"\) \{ drawMarginNote/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'margins'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/margins\.js\?v=/);
});
