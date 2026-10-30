// Release 595 (docs/narrative-bible.md section 6, thread 3): the Torn Pages, one for each Reading, found in crossings of that
// Reading; a page is never stranded in one crossing; with all of them the Reciter's Tome gains a book that fills with the Journal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { READING_ORDER, readingAt } from '../src/lore.ts';
import { pageIn, addTornPage, readTornPage, pagesFound, PAGE_TEXT, PAGES_FINAL, TORN_PAGES } from '../src/torn-pages.ts';

const seed = 'PAGES595';
const crossings = (reading, n) => { const out = []; for (let r = TORN_PAGES.minDepth; r < 60 && out.length < n; r++) for (let x = -r; x <= r && out.length < n; x++) for (const y of [r - Math.abs(x), Math.abs(x) - r]) { const id = `dungeon:${seed}:g1:${x}:${y}:room`; if (pageIn(seed, id) === reading && !out.some((q) => q.id === id)) out.push({ id, rx: x, ry: y }); } return out; };
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });

test('every Reading has a page, written, and found only in crossings of that Reading', () => {
  for (const id of READING_ORDER) { assert.ok(PAGE_TEXT[id]?.length > 80, id); const c = crossings(id, 2); assert.equal(c.length, 2, `${id} has page crossings`); for (const q of c) assert.equal(readingAt(q.rx, q.ry), id); }
  assert.equal(pageIn(seed, `dungeon:${seed}:g1:0:1:room`), null, 'not at the Refuge'); assert.equal(pageIn(seed, 'arena:x'), null);
});

test('a page is never stranded: another crossing of the Reading offers it until found; the finding crossing keeps it, read', () => {
  const [a, b] = crossings('riverThatRemembers', 2), s = freshSave(); s.seed = seed;
  const o = addTornPage(map(), s, a.id); assert.equal(o.reading, 'riverThatRemembers'); assert.ok(addTornPage(map(), s, b.id), 'offered elsewhere too');
  const r = readTornPage(s, o); assert.ok(r.first && !r.done); assert.match(r.message, /1 of 10 pages/);
  assert.equal(addTornPage(map(), s, b.id), null, 'found: no second copy'); assert.equal(addTornPage(map(), s, a.id).state, 'read');
  assert.equal(readTornPage(s, o).first, false);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(pagesFound(back), ['riverThatRemembers']); assert.equal(back.lore.pages.riverThatRemembers, a.id);
  assert.equal(freshSave().lore.pages, undefined, 'nothing added to a fresh save');
});

test('the tenth page completes the book; in the game each page is written in the Journal', () => {
  const s = freshSave(); s.seed = seed; let last;
  for (const id of READING_ORDER) { const [c] = crossings(id, 1); last = readTornPage(s, addTornPage(map(), s, c.id)); }
  assert.ok(last.done); assert.ok(last.message.includes(PAGES_FINAL));
  const g0 = freshSave(); g0.seed = seed; const [c] = crossings('longCampaign', 1); g0.session.activeDungeonId = c.id; g0.session.dungeonReturn = { rx: c.rx, ry: c.ry, x: 16, y: 16 };
  const g = new Game(g0, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'tornPage');
  assert.ok(o, 'the page lies in the crossing'); { g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y + .2 }); assert.ok(g.interact('read', o.id).ok); assert.ok(g0.narrative.journal.some((j) => j.title === 'The Torn Pages')); assert.equal(g0.lore.pages.longCampaign, c.id); }
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(main, /TORN_PAGES\.title/); assert.doesNotMatch(main, /add\("The Torn Pages"/);
});
