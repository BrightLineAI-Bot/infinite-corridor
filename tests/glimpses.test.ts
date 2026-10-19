import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { bookPieces, bookProgress, readingAt } from '../src/lore.ts';
import { GLIMPSES, GLIMPSE_ORDER, GLIMPSE_MAX_SEEN, GLIMPSE_CHANCE, pickGlimpse, glimpseFor, glimpseSeen, glimpseWeight, humanDrift, witnessGlimpse, witnessedGlimpses } from '../src/glimpses.ts';
import { startGlimpse } from '../src/glimpse-render.ts';

function seeded(n = 1) { let x = n; return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); }

test('the first Glimpses span the drift from human to unhuman', () => {
  assert.deepEqual(GLIMPSE_ORDER, ['wagonAtDusk', 'lanternFaceted', 'theRule']);
  for (const id of GLIMPSE_ORDER) { const g = GLIMPSES[id]; assert.ok(g.name && g.seconds >= 8 && g.seconds <= 20 && g.human >= 0 && g.human <= 1 && g.reduced.length >= 2, id); }
  assert.equal(humanDrift(0, 0), 1);
  assert.equal(humanDrift(30, 30), 0);
  // Near the Refuge the human Glimpse weighs most; far out the unhuman one does; nothing ever drops to zero.
  assert.ok(glimpseWeight('wagonAtDusk', 1, 0) > glimpseWeight('theRule', 1, 0));
  assert.ok(glimpseWeight('theRule', 40, 0) > glimpseWeight('wagonAtDusk', 40, 0));
  assert.ok(glimpseWeight('wagonAtDusk', 40, 0) > 0 && glimpseWeight('theRule', 0, 0) > 0);
});

test('unseen Glimpses come first, and none is seen more than a few times', () => {
  const s = freshSave(), rand = seeded(3), seen = [];
  for (let i = 0; i < GLIMPSE_ORDER.length; i++) { const id = pickGlimpse(s, 2, 0, rand); assert.ok(!seen.includes(id), `repeat ${id} before all were seen`); seen.push(id); witnessGlimpse(s, id, 2, 0); }
  for (let i = 0; i < 50; i++) { const id = pickGlimpse(s, 2, 0, rand); if (!id) break; witnessGlimpse(s, id, 2, 0); }
  for (const id of GLIMPSE_ORDER) assert.equal(glimpseSeen(s, id), GLIMPSE_MAX_SEEN);
  assert.equal(pickGlimpse(s, 2, 0, rand), null);
  assert.deepEqual(witnessedGlimpses(s), GLIMPSE_ORDER);
});

test('moments open Glimpses only by chance', () => {
  const s = freshSave(), never = () => .999, always = () => 0;
  assert.equal(glimpseFor(s, 'touch', 3, 3, never), null);
  assert.ok(GLIMPSE_ORDER.includes(glimpseFor(s, 'touch', 3, 3, always)));
  assert.equal(glimpseFor(s, 'unknown', 3, 3, always), null);
  assert.ok(GLIMPSE_CHANCE.tree < GLIMPSE_CHANCE.crossing && GLIMPSE_CHANCE.crossing < GLIMPSE_CHANCE.touch);
});

test('a first sighting gives the region one Glimpse fragment; later sightings give nothing', () => {
  const s = freshSave(), region = readingAt(0, -12);
  const found = witnessGlimpse(s, 'wagonAtDusk', 0, -12);
  assert.equal(found.readingId, region);
  assert.equal(found.piece.kind, 'glimpse');
  assert.equal(witnessGlimpse(s, 'wagonAtDusk', 0, -12), null);
  assert.equal(witnessGlimpse(s, 'wagonAtDusk', 30, 30), null);
  assert.equal(witnessGlimpse(s, 'theRule', 0, -12).piece.id, 'glimpse:1');
  assert.equal(bookProgress(s, region).found, 2);
  assert.equal(witnessGlimpse(s, 'nothing', 0, 0), null);
  // A region whose Glimpse fragments are all found gives no more.
  const t = freshSave(); t.lore.pieces.pathAlone = bookPieces('pathAlone').filter((p) => p.kind === 'glimpse').map((p) => p.id);
  assert.equal(witnessGlimpse(t, 'lanternFaceted', -10, 0), null);
  assert.equal(glimpseSeen(t, 'lanternFaceted'), 1);
});

test('Glimpse counts survive migration; nonsense is dropped and unknown ids kept', () => {
  const s = freshSave(); witnessGlimpse(s, 'theRule', 1, 1);
  s.lore.glimpses.futureGlimpse = 2; s.lore.glimpses.broken = 'x'; s.lore.glimpses.negative = -3;
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.lore.glimpses, { theRule: 1, futureGlimpse: 2 });
  assert.deepEqual(freshSave().lore.glimpses, {});
});

test('an unknown Glimpse ends at once instead of playing', () => {
  let ended = 0;
  startGlimpse({}, 'nothing', { onEnd: () => ended++ });
  assert.equal(ended, 1);
});
