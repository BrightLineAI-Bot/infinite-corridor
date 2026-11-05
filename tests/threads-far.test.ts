// Story version 2 (2026-11-05). Tim: "trim the shared story rate to about 12%" and "Yes, you should write them for out past 1000".
// Crossings first entered from now on hold a thread piece at 0.12 (version 1 keeps 0.13, version 0 the waves), and three far
// threads (the Tall Child's Slates, the Spore Prints, the Ink-Clerk's Blotters) share those slots past FAR_REALMS.start, straight
// line, taking a larger share out there than the deep band's generic threads. Crossings pinned at version 0 or 1 never move.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashSeed } from '../src/random.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { FAR_REALMS, farDistance } from '../src/far-realms.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, STORY_BUDGET, budgetFor, threadIn, inBand, sharedThreads, sharedRate, threadWeight, storyVersionFor, storyVersionOf, addThreadRelic, readThreadRelic, threadFound, threadsDone, threadsStarted } from '../src/threads.ts';

const FAR = ['tallSlates', 'sporePrints', 'inkBlotters'];
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
const roll = (key) => (hashSeed(key) % 10000) / 10000;

// What a crossing offered under releases 772 (version 0, the waves) and 773 (version 1, the budget at 0.13), written out from
// those rules and their numbers, so no later edit to threads.ts can move them unseen.
const BANDS = { near: [3, 18], middle: [7, 35], far: [19, 70], deep: [36, Infinity] };
const FIRST = { lamplighter: 'near', letters: 'near', choir: 'middle', clockmaker: 'middle', ferry: 'middle', moth: 'far', library: 'far', orchard: 'far', cartographer: 'deep', sleeper: 'deep' };
const LATER = { wellDigger: ['far', 2, 0, ['far', 'deep']], tollKeys: ['middle', 3, 0, ['middle', 'deep']], weaver: ['far', 3, 1, ['far', 'deep']], mirror: ['far', 3, 1, ['far', 'deep']], beekeeper: ['near', 4, 0, ['near']], toolmaker: ['middle', 5, 0, ['near', 'middle']] };
const at = (id) => { const m = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(id); return m ? [Number(m[1]), Number(m[2])] : null; };
const inb = (b, d) => d >= BANDS[b][0] && d <= BANDS[b][1];
function firstTen(seed, id, d) { if (roll(`${seed}:threads:v1:${id}`) >= .07) return undefined; const here = Object.keys(FIRST).filter((t) => inb(FIRST[t], d)); return here.length ? here[hashSeed(`${seed}:threads:which:v1:${id}`) % here.length] : undefined; }
function r772(seed, id) {
  const p = at(id); if (!p) return null; const d = Math.abs(p[0]) + Math.abs(p[1]); if (d < 3) return null; const f = firstTen(seed, id, d); if (f !== undefined) return f;
  if (roll(`${seed}:threads:v1:${id}`) < .07) return null;
  for (const [w, rate, name] of [[2, .025, 'later'], [3, .025, 'third'], [4, .04, 'fourth'], [5, .025, 'fifth']]) if (roll(`${seed}:threads:${name}:v1:${id}`) < rate) {
    const all = Object.keys(LATER).filter((t) => LATER[t][1] === w && inb(LATER[t][0], d)); if (!all.length) continue;
    const first = Math.min(...all.map((t) => LATER[t][2])), here = all.filter((t) => LATER[t][2] === first); return here[hashSeed(`${seed}:threads:${name}:which:v1:${id}`) % here.length]; }
  return null;
}
function r773(seed, id) {
  const p = at(id); if (!p) return null; const d = Math.abs(p[0]) + Math.abs(p[1]); if (d < 3) return null; const f = firstTen(seed, id, d); if (f !== undefined) return f;
  const base = Object.values(FIRST).some((b) => inb(b, d)) ? .07 : 0; if (roll(`${seed}:threads:shared:v1:${id}`) >= (.13 - base) / (1 - base)) return null;
  const here = Object.keys(LATER).filter((t) => LATER[t][3].some((b) => inb(b, d))); return here.length ? here[hashSeed(`${seed}:threads:shared:which:v1:${id}`) % here.length] : null;
}
// Crossings on the ring `d` sections walked out (|rx| + |ry|), spread round it, several seeds; and on the circle `r` straight-line.
const ring = (d, n, tag = 'f') => Array.from({ length: n }, (_, i) => { const seed = `FAR${i % 7}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const circle = (r, n, tag = 'c') => Array.from({ length: n }, (_, i) => { const seed = `FARC${i % 5}`, a = (i * 2.399963) % (Math.PI * 2), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const NEAR = [[3, 6], [7, 18], [19, 35], [36, 70], [71, 150], [495, 505]], OUT = [[995, 1005], [1100, 1110], [1495, 1505], [2995, 3005]];

test('story version 2: the budget is 0.12, one table entry; version 1 keeps 0.13; the three far threads are written in full', () => {
  assert.equal(STORY_BUDGET.version, 2); assert.equal(STORY_BUDGET.perCrossing, .12); assert.deepEqual(STORY_BUDGET.byVersion, { 1: .13, 2: .12 });
  assert.equal(budgetFor(0), 0); assert.equal(budgetFor(1), .13); assert.equal(budgetFor(2), .12); assert.equal(budgetFor(9), .12, 'a later version keeps the latest budget until it sets its own');
  assert.equal(storyVersionFor(false), 2); assert.equal(storyVersionFor(true), 0);
  for (const id of FAR) { const T = THREADS[id]; assert.ok(T, id); assert.equal(T.band, 'beyond'); assert.deepEqual(T.shared, { 2: ['beyond'] }); assert.ok(!T.wave && !T.layer, `${id} is never a wave`);
    assert.equal(T.pieces.length, 6); assert.equal(new Set(T.pieces).size, 6); assert.ok(T.pieces.every((p) => p.length > 80 && p.length < 400), id); assert.ok(T.ending.length > 200 && T.ending.length < 650, id);
    assert.ok(!/corridor/i.test(T.pieces.join(' ')), `${id}: the pieces never name what the Corridor is`); assert.equal(threadWeight(id), 2); }
  assert.deepEqual(THREAD_ORDER.filter((id) => THREADS[id].shared?.[2]), FAR, 'only the far threads join at version 2');
  for (const id of THREAD_ORDER.filter((t) => !FAR.includes(t))) assert.equal(threadWeight(id), 1, `${id} keeps an even share`);
  const rend = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  for (const k of ['slate', 'print', 'blotter']) assert.match(rend, new RegExp(`case "${k}"`), `the ${k} is drawn`);
  assert.match(main, /beyond: "the far realms/, 'the Arcana says where the far threads lie');
  const bible = readFileSync(new URL('../docs/narrative-bible.md', import.meta.url), 'utf8'); for (const id of FAR) assert.ok(bible.includes(THREADS[id].title), `${id} is in the bible's thread list`);
});

test('version 2 holds a piece at exactly 0.12 at every distance from 3 to 3000, and measured at or under it, near and far', () => {
  for (let d = THREAD_RULES.minDepth; d <= 3000; d++) for (const [x, y] of [[d, 0], [Math.round(d * .7), Math.round(d * .7)]]) {
    const held = THREAD_RULES.chance + (1 - THREAD_RULES.chance) * sharedRate(x, y, 2); assert.ok(Math.abs(held - .12) < 1e-12, `${x},${y}: ${held}`);
    assert.ok(sharedThreads(2, x, y).length >= 2, `${x},${y}: threads share the slots`); }
  // Measured: 10 stretches, 24,000 crossings each. One standard error at 0.12 over 24,000 is 0.0021; allow three.
  let held = 0, all = 0;
  for (const [lo, hi] of [...NEAR, ...OUT]) { let h = 0, n = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(24000 / (hi - lo + 1)))) { n++; if (threadIn(seed, id, 2)) h++; }
    held += h; all += n; assert.ok(h / n <= .12 + .0063, `${lo}-${hi}: ${(h / n).toFixed(4)} above the budget`); assert.ok(Math.abs(h / n - .12) < .0063, `${lo}-${hi}: ${(h / n).toFixed(4)}`); }
  // Straight-line circles in the far realms, the same.
  for (const r of [1000, 1200, 2000, 5000]) { let h = 0; const c = circle(r, 24000); for (const [seed, id] of c) if (threadIn(seed, id, 2)) h++; held += h; all += c.length; assert.ok(Math.abs(h / c.length - .12) < .0063, `r ${r}: ${(h / c.length).toFixed(4)}`); }
  assert.ok(all > 300000 && held / all <= .12 + .0018, `${all} crossings, ${(held / all).toFixed(4)} overall`);
  // Fewer than version 1 holds at every stretch, over the same crossings.
  for (const [lo, hi] of [[7, 18], [995, 1005]]) { let v1 = 0, v2 = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, 2000)) { if (threadIn(seed, id, 1)) v1++; if (threadIn(seed, id, 2)) v2++; } assert.ok(v2 < v1, `${lo}-${hi}`); }
});

test('the far threads lie only beyond 1000 sections (straight line), only at version 2, and take most of the far slots there', () => {
  let far = 0, n = 0;
  for (const [lo, hi] of [...NEAR, [700, 720], [990, 1010], [1300, 1310], [2000, 2010]]) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(12000 / (hi - lo + 1)), 'b')) {
    n++; const [x, y] = at(id); for (const v of [0, 1]) assert.ok(!FAR.includes(threadIn(seed, id, v)), `${id} v${v}`);
    const t = threadIn(seed, id, 2); if (FAR.includes(t)) { far++; assert.ok(farDistance(x, y) >= FAR_REALMS.start, `${id}: ${farDistance(x, y).toFixed(1)}`); assert.ok(inBand('beyond', x, y)); }
    if (farDistance(x, y) < FAR_REALMS.start) assert.ok(!sharedThreads(2, x, y).some((q) => FAR.includes(q)), id); }
  assert.ok(n > 110000 && far > 400, `${n} crossings, ${far} far pieces`);
  for (const r of [999.4, 999.9]) assert.ok(!inBand('beyond', r, 0)); assert.ok(inBand('beyond', 1000, 0)); assert.ok(inBand('beyond', 708, 708)); assert.ok(!inBand('beyond', 707, 707));
  // Shares out there: the first ten keep 0.07; each far thread takes twice the share of each deep-band shared thread.
  const counts = {}; let all = 0; for (const [seed, id] of circle(1500, 120000, 's')) { all++; const t = threadIn(seed, id, 2); if (t) counts[t] = (counts[t] || 0) + 1; }
  const pool = sharedThreads(2, 1500, 0), weights = pool.reduce((s, t) => s + threadWeight(t), 0), rest = .12 - THREAD_RULES.chance;
  assert.deepEqual(pool, ['wellDigger', 'tollKeys', 'weaver', 'mirror', ...FAR]);
  for (const t of pool) assert.ok(Math.abs(counts[t] / all - rest * threadWeight(t) / weights) < .002, `${t}: ${(counts[t] / all).toFixed(4)}`);
  const farShare = FAR.reduce((s, t) => s + counts[t], 0) / pool.reduce((s, t) => s + counts[t], 0); assert.ok(farShare > .55 && farShare < .65, `far share ${farShare.toFixed(3)}`);
  assert.ok(Math.abs((counts.cartographer + counts.sleeper) / all - THREAD_RULES.chance) < .003, 'the first ten keep their slots');
});

test('crossings pinned at version 0 or 1 roll exactly as releases 772 and 773 laid them, over 80,000 crossings out to 3000', () => {
  let n = 0, kept = 0, moved = 0;
  for (const [lo, hi] of [...NEAR, ...OUT]) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(8000 / (hi - lo + 1)), 'p')) {
    n++; assert.equal(threadIn(seed, id), r772(seed, id), id); assert.equal(threadIn(seed, id, 0), r772(seed, id), id); const v1 = r773(seed, id); assert.equal(threadIn(seed, id, 1), v1, id);
    const v2 = threadIn(seed, id, 2), [x, y] = at(id); assert.equal(v2, threadIn(seed, id, 2), 'deterministic');
    if (v1 && FIRST[v1]) { kept++; assert.equal(v2, v1, 'a first-ten crossing holds the same thread at every version'); } else if (v2 !== v1) moved++;
    if (v2 && !FIRST[v2]) assert.ok(sharedThreads(2, x, y).includes(v2)); }
  for (const r of [1000, 1500, 3000]) for (const [seed, id] of circle(r, 4000, 'q')) { n++; assert.equal(threadIn(seed, id, 1), r773(seed, id), id); assert.equal(threadIn(seed, id, 0), r772(seed, id), id); }
  assert.ok(n >= 80000 && kept > 5000 && moved > 500, `${n} crossings, ${kept} first-ten, ${moved} differ at version 2`);
});

test('a crossing pinned before keeps its version through save and load; a crossing never generated pins to version 2', () => {
  const s = freshSave(); s.seed = 'FARPIN'; const ids = circle(1200, 3000, 'pin').map(([, id]) => id.replace(/FARC\d/, 'FARPIN'));
  const v1 = ids.filter((id) => threadIn('FARPIN', id, 1) !== threadIn('FARPIN', id, 2)).slice(0, 30), fresh = ids.filter((id) => FAR.includes(threadIn('FARPIN', id, 2)) && !v1.includes(id)).slice(0, 30);
  assert.ok(v1.length >= 20 && fresh.length >= 20, `${v1.length}, ${fresh.length}`);
  for (const id of v1) s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, storyVersion: 1 };
  const loaded = migrateSave(JSON.parse(JSON.stringify(s)));
  for (const id of v1) { pinDungeonLayout(loaded, id); assert.equal(storyVersionOf(loaded, id), 1); assert.equal(addThreadRelic(map(), loaded, id)?.thread ?? null, r773('FARPIN', id)); }
  for (const id of fresh) { const h = pinDungeonLayout(loaded, id); assert.equal(h.storyVersion, 2); assert.ok(FAR.includes(addThreadRelic(map(), loaded, id).thread)); }
  const again = migrateSave(JSON.parse(JSON.stringify(loaded)));
  for (const id of v1) assert.equal(again.consequences.dungeons[id].storyVersion, 1); for (const id of fresh) assert.equal(again.consequences.dungeons[id].storyVersion, 2);
});

const farCrossings = (seed, thread, n) => { const out = []; for (let i = 0; out.length < n && i < 200000; i++) { const a = i * 2.399963, r = 1000 + (i % 400), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r), id = `dungeon:${seed}:g1:${x}:${y}:room${i}`; if (threadIn(seed, id, 2) === thread) out.push(id); } return out; };

test('each far thread is read in order across crossings, never stranded, and the save keeps it at schema 14', () => {
  for (const id of FAR) { const T = THREADS[id], seed = `READ-${id}`, c = farCrossings(seed, id, T.pieces.length + 1), s = freshSave(); s.seed = seed;
    assert.equal(c.length, T.pieces.length + 1, `${id}: crossings enough`); for (const q of c) s.consequences.dungeons[q] = { storyVersion: 2 };
    const o = addThreadRelic(map(), s, c[0]); assert.equal(o.relic, T.relic); assert.equal(o.index, 0); assert.equal(addThreadRelic(map(), s, c[1]).index, 0, 'the first piece waits in every crossing until found');
    for (let i = 0; i < T.pieces.length; i++) { const q = addThreadRelic(map(), s, c[i]); assert.equal(q.index, i); assert.equal(q.state, 'waiting'); const r = readThreadRelic(s, q); assert.ok(r.first); assert.equal(r.text, T.pieces[i]); assert.equal(r.done, i === T.pieces.length - 1); }
    assert.equal(addThreadRelic(map(), s, c[2]).state, 'read', 'a crossing keeps the piece found there'); assert.equal(addThreadRelic(map(), s, c[T.pieces.length]), null, 'nothing left once the thread is done');
    assert.ok(threadsDone(s).includes(id) && threadsStarted(s).includes(id));
    const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(threadFound(back, id), c.slice(0, T.pieces.length)); assert.equal(back.version, 14);
    // Unpinned (version 0), the same crossings never offer it.
    const old = freshSave(); old.seed = seed; for (const q of c) assert.ok(!FAR.includes(addThreadRelic(map(), old, q)?.thread)); }
});

test('in the game, the last piece of a far thread writes its ending in the Journal and raises QUEST COMPLETE', () => {
  const id = 'sporePrints', T = THREADS[id], seed = 'FARGAME', c = farCrossings(seed, id, T.pieces.length), s = freshSave(); s.seed = seed;
  for (let i = 0; i < T.pieces.length - 1; i++) { s.consequences.dungeons[c[i]] = { storyVersion: 2 }; readThreadRelic(s, addThreadRelic(map(), s, c[i])); }
  const last = c[T.pieces.length - 1], [x, y] = at(last); s.session.activeDungeonId = last; s.session.dungeonReturn = { rx: x, ry: y, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); assert.equal(s.consequences.dungeons[last].storyVersion, 2, 'a new crossing pins to version 2');
  const o = g.map.objects.find((q) => q.kind === 'threadRelic'); assert.ok(o, 'laid in the crossing'); assert.equal(o.thread, id); assert.equal(o.index, T.pieces.length - 1);
  g.player.x = o.x; g.player.y = o.y; const r = g.interact('read', o.id); assert.ok(r.ok && r.done, g.message);
  assert.ok(threadsDone(s).includes(id)); assert.ok(s.narrative.journal.some((j) => j.text === T.ending)); assert.ok(s.narrative.journal.some((j) => j.text === T.pieces.at(-1)));
  assert.ok((g.questNotices || []).some((q) => q.title === 'QUEST COMPLETE' && q.detail.includes(T.title)));
});
