// Release 627 (Tim, 2026-10-31: "do your narrative passes... 10 sets... condense them into today"; and of the Seven Bells and the
// Surveyor's Chain: "Tim loves them"): ten more threads, each a handful of pieces scattered through crossings of its band of the
// map, read in order, never stranded in one crossing, ending in the Journal and in the Reciter's Tome.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, threadIn, inBand, addThreadRelic, readThreadRelic, threadFound, threadsDone } from '../src/threads.ts';

const seed = 'THREADS627';
const crossings = (thread, n) => { const out = []; for (let r = THREAD_RULES.minDepth; r < 90 && out.length < n; r++) for (let x = -r; x <= r && out.length < n; x++) for (const y of [r - Math.abs(x), Math.abs(x) - r]) { const id = `dungeon:${seed}:g1:${x}:${y}:room`; if (threadIn(seed, id) === thread && !out.includes(id)) out.push(id); } return out; };
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });

test('ten threads, each written in full, each found only in crossings of its own band', () => {
  assert.equal(THREAD_ORDER.length, 10);
  for (const id of THREAD_ORDER) { const T = THREADS[id]; assert.ok(T.pieces.length >= 5 && T.pieces.every((p) => p.length > 20) && T.ending.length > 150, id);
    const c = crossings(id, 2); assert.equal(c.length, 2, `${id} has crossings`); for (const q of c) { const [, , , x, y] = q.split(':'); assert.ok(inBand(T.band, Number(x), Number(y))); } }
  assert.equal(threadIn(seed, `dungeon:${seed}:g1:0:1:room`), null, 'not by the Refuge'); assert.equal(threadIn(seed, 'arena:x'), null);
  let n = 0; for (let x = 0; x < 3000; x++) if (threadIn(seed, `dungeon:${seed}:g1:${x}:20:room`)) n++; assert.ok(Math.abs(n / 3000 - THREAD_RULES.chance) < .02, `${n} of 3000`);
});

test('pieces are read in order and never stranded; a crossing keeps the piece found there; the save keeps them', () => {
  const [a, b, c] = crossings('clockmaker', 3), s = freshSave(); s.seed = seed;
  const o = addThreadRelic(map(), s, a); assert.equal(o.index, 0); assert.equal(addThreadRelic(map(), s, b).index, 0, 'offered elsewhere too');
  const r = readThreadRelic(s, o); assert.ok(r.first && !r.done); assert.equal(r.text, THREADS.clockmaker.pieces[0]); assert.match(r.message, /1 of 6/);
  assert.equal(addThreadRelic(map(), s, b).index, 1, 'the next piece waits in the next crossing'); const again = addThreadRelic(map(), s, a); assert.equal(again.state, 'read'); assert.equal(again.index, 0);
  assert.equal(readThreadRelic(s, again).first, false);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(threadFound(back, 'clockmaker'), [a]);
  const junk = migrateSave({ ...JSON.parse(JSON.stringify(s)), lore: { ...s.lore, threads: { clockmaker: [a, 7, null], nonsense: ['x'] } } }); assert.deepEqual(junk.lore.threads, { clockmaker: [a] });
  assert.equal(freshSave().lore?.threads, undefined, 'nothing added to a fresh save');
});

test('the last piece completes the thread; in the game each piece is written in the Journal and the end raises QUEST COMPLETE', () => {
  const T = THREADS.lamplighter, ids = crossings('lamplighter', T.pieces.length), s = freshSave(); s.seed = seed;
  for (let i = 0; i < ids.length - 1; i++) readThreadRelic(s, addThreadRelic(map(), s, ids[i]));
  const id = ids.at(-1), [, , , x, y] = id.split(':'); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: Number(x), ry: Number(y), x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'threadRelic'); assert.ok(o, 'laid in the crossing'); assert.equal(o.index, T.pieces.length - 1);
  g.player.x = o.x; g.player.y = o.y; const r = g.interact('read', o.id); assert.ok(r.ok && r.done, g.message);
  assert.deepEqual(threadsDone(s), ['lamplighter']); assert.ok(s.narrative.journal.some((j) => j.text === T.ending)); assert.ok((g.questNotices || []).some((q) => /lamplighter/i.test(q.detail)));
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), rend = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(main, /threadsStarted\(save\)/); assert.match(rend, /export function drawThreadRelic/); for (const k of new Set(THREAD_ORDER.map((t) => THREADS[t].relic))) if (k !== 'shell') assert.match(rend, new RegExp(`case "${k}"`));
});
