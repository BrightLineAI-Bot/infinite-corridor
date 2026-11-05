// The daily narrative pass of 2026-11-05: the Toolmaker's Handles, a wave 5 thread of the middle band, rolled only in crossings where
// none of the first four rolls placed a thread, so no crossing changes what it offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashSeed } from '../src/random.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, threadIn, inBand, addThreadRelic, readThreadRelic, threadFound, threadsDone, threadsStarted } from '../src/threads.ts';

const T = THREADS.toolmaker;
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
const roll = (key) => (hashSeed(key) % 10000) / 10000;
// What a crossing offered under wave 4 (2026-11-04), written out from those rules.
const wave4 = (seed, id) => {
  const m = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(id); if (!m) return null; const x = Number(m[1]), y = Number(m[2]);
  if (Math.abs(x) + Math.abs(y) < THREAD_RULES.minDepth) return null;
  const pick = (wave, key) => { const all = THREAD_ORDER.filter((t) => THREADS[t].wave === wave && inBand(THREADS[t].band, x, y)); if (!all.length) return null;
    const first = Math.min(...all.map((t) => THREADS[t].layer || 0)), here = all.filter((t) => (THREADS[t].layer || 0) === first); return here[hashSeed(key) % here.length]; };
  if (roll(`${seed}:threads:v1:${id}`) < THREAD_RULES.chance) return pick(undefined, `${seed}:threads:which:v1:${id}`);
  if (roll(`${seed}:threads:later:v1:${id}`) < THREAD_RULES.later) { const t = pick(2, `${seed}:threads:later:which:v1:${id}`); if (t) return t; }
  if (roll(`${seed}:threads:third:v1:${id}`) < THREAD_RULES.third) { const t = pick(3, `${seed}:threads:third:which:v1:${id}`); if (t) return t; }
  if (roll(`${seed}:threads:fourth:v1:${id}`) < THREAD_RULES.fourth) return pick(4, `${seed}:threads:fourth:which:v1:${id}`);
  return null;
};
const middle = (seed) => { const out = []; for (let r = THREAD_RULES.minDepth; r <= 36; r++) for (let x = -r; x <= r; x++) for (const y of new Set([r - Math.abs(x), Math.abs(x) - r])) { const id = `dungeon:${seed}:g1:${x}:${y}:room`; if (threadIn(seed, id) === 'toolmaker') out.push(id); } return out; };
const SEEDS = ['HANDLES1', 'HANDLES2', 'THREADS627', 'LATER1', 'BEES1', 'wayfarer'];

test("the Toolmaker's Handles is written in full as a wave 5 middle thread, its rule a table number", () => {
  assert.ok(T && T.wave === 5 && T.band === 'middle' && T.relic === 'handle' && !T.layer);
  assert.equal(T.pieces.length, 6); assert.ok(T.pieces.every((p) => p.length > 80 && p.length < 400)); assert.ok(T.ending.length > 200 && T.ending.length < 600);
  assert.equal(new Set(T.pieces).size, 6); assert.ok(typeof THREAD_RULES.fifth === 'number' && THREAD_RULES.fifth > 0 && THREAD_RULES.fifth < .1);
  assert.equal(THREAD_ORDER.filter((id) => THREADS[id].wave === 5).length, 1, 'one wave 5 thread');
  assert.ok(!/corridor/i.test(T.pieces.join(' ')), 'the pieces never name what the Corridor is');
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /case "handle"/, 'its relic is drawn');
});

test('it lies only in middle crossings, in every seed, with crossings enough for every piece', () => {
  for (const seed of SEEDS) { const c = middle(seed); assert.ok(c.length >= T.pieces.length, `${seed}: ${c.length} crossings`);
    for (const id of c) { const [, , , x, y] = id.split(':'); assert.ok(inBand('middle', Number(x), Number(y)), id); } }
  for (let x = -60; x <= 60; x++) for (let y = -60; y <= 60; y += 2) { if (inBand('middle', x, y)) continue; assert.notEqual(threadIn('HANDLES1', `dungeon:HANDLES1:g1:${x}:${y}:room`), 'toolmaker', `${x},${y}`); }
  assert.equal(threadIn('HANDLES1', 'arena:x'), null);
});

test('every crossing that held a thread (or none) under wave 4 offers the same now; only empty crossings gain the handles', () => {
  let held = 0, gained = 0, checked = 0;
  for (const seed of SEEDS) for (let x = -80; x <= 80; x++) for (let y = -80; y <= 80; y += 2) {
    const id = `dungeon:${seed}:g1:${x}:${y}:room`, was = wave4(seed, id), now = threadIn(seed, id); checked++;
    if (was) { held++; assert.equal(now, was, id); } else if (now !== null) { gained++; assert.equal(now, 'toolmaker', id); assert.ok(inBand('middle', x, y), id); }
  }
  assert.ok(checked > 70000 && held > 3000 && gained > 50, `${checked} checked, ${held} held, ${gained} gained`);
});

test('the same seed and crossing give the same thread and the same place', () => {
  const [a] = middle('HANDLES1'), s1 = freshSave(), s2 = freshSave(); s1.seed = s2.seed = 'HANDLES1';
  assert.equal(threadIn('HANDLES1', a), threadIn('HANDLES1', a)); const o1 = addThreadRelic(map(), s1, a), o2 = addThreadRelic(map(), s2, a);
  assert.deepEqual([o1.x, o1.y, o1.thread, o1.index], [o2.x, o2.y, o2.thread, o2.index]);
});

test('the handles are read in order across crossings and never stranded; the save keeps them at schema 14', () => {
  const c = middle('HANDLES2'), s = freshSave(); s.seed = 'HANDLES2';
  const o = addThreadRelic(map(), s, c[0]); assert.equal(o.relic, 'handle'); assert.equal(o.index, 0);
  assert.equal(addThreadRelic(map(), s, c[1]).index, 0, 'the first handle waits in every crossing until it is found');
  for (let i = 0; i < T.pieces.length; i++) { const q = addThreadRelic(map(), s, c[i]); assert.equal(q.index, i); assert.equal(q.state, 'waiting'); const r = readThreadRelic(s, q); assert.ok(r.first); assert.equal(r.text, T.pieces[i]); assert.equal(r.done, i === T.pieces.length - 1); }
  assert.equal(addThreadRelic(map(), s, c[2]).state, 'read', 'a crossing keeps the handle found there'); assert.equal(addThreadRelic(map(), s, c[2]).index, 2);
  if (c.length > T.pieces.length) assert.equal(addThreadRelic(map(), s, c[T.pieces.length]), null, 'nothing left once the thread is done');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(threadFound(back, 'toolmaker'), c.slice(0, T.pieces.length)); assert.equal(back.version, 14);
  const junk = migrateSave({ ...JSON.parse(JSON.stringify(s)), lore: { ...s.lore, threads: { toolmaker: [c[0], 3, null], beekeeper: ['x'], nonsense: ['y'] } } });
  assert.deepEqual(junk.lore.threads, { toolmaker: [c[0]], beekeeper: ['x'] });
  assert.equal(freshSave().lore?.threads, undefined, 'nothing added to a fresh save');
});

test('the last handle writes the ending in the Journal, raises QUEST COMPLETE, and the Tome keeps the thread as a book', () => {
  const seed = 'HANDLES1', c = middle(seed), s = freshSave(); s.seed = seed;
  for (let i = 0; i < T.pieces.length - 1; i++) readThreadRelic(s, addThreadRelic(map(), s, c[i]));
  const id = c[T.pieces.length - 1], [, , , x, y] = id.split(':'); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: Number(x), ry: Number(y), x: 16, y: 16 };
  s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, storyVersion: 0 }; // the story budget (2026-11-05): a crossing pinned to the waves' rule, as one seen before the budget is
  const g = new Game(s, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'threadRelic'); assert.ok(o, 'laid in the crossing'); assert.equal(o.thread, 'toolmaker'); assert.equal(o.index, T.pieces.length - 1);
  g.player.x = o.x; g.player.y = o.y; const r = g.interact('read', o.id); assert.ok(r.ok && r.done, g.message);
  assert.ok(threadsDone(s).includes('toolmaker')); assert.ok(s.narrative.journal.some((j) => j.text === T.ending)); assert.ok(s.narrative.journal.some((j) => j.text === T.pieces.at(-1)));
  assert.ok((g.questNotices || []).some((q) => /toolmaker/i.test(q.detail)));
  assert.ok(threadsStarted(s).includes('toolmaker'));
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /for\(const id of threadsStarted\(save\)\)\{const T=THREADS\[id\]/, 'the Tome makes a book of every thread begun');
});
