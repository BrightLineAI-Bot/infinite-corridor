// Story version 4 (2026-11-06). Tim: past 1000 sections (straight line) the first ten's deep pair, the Second Surveyor and the
// Sleeper, held their own 0.07 a crossing, about four times any far thread; once a veteran had read them, those slots showed
// nothing, so the story density met out there fell toward 0.05. From version 4, past FAR_REALMS.start the first ten's roll takes
// no slot and the whole 0.12 is shared among the far threads and the deep-band shared threads at their weights (five far threads
// at weight 3, kept). Inside 1000 version 4 rolls exactly as version 3. Crossings pinned at version 0 to 3 roll exactly as
// releases 772, 773, 779 and 781 laid them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashSeed } from '../src/random.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { FAR_REALMS, farDistance } from '../src/far-realms.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, STORY_BUDGET, budgetFor, threadIn, sharedThreads, sharedRate, threadWeight, storyVersionFor, storyVersionOf, addThreadRelic, readThreadRelic, threadFound, threadsDone } from '../src/threads.ts';

const OLD_FAR = ['tallSlates', 'sporePrints', 'inkBlotters'], FAR = [...OLD_FAR, 'enumerator', 'tinkerTags'];
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
const roll = (key) => (hashSeed(key) % 10000) / 10000;

// What a crossing offered under releases 772 (version 0), 773 (version 1), 779 (version 2) and 781 (version 3), and what version 4
// offers, written out from those rules and their numbers (not from src/threads.ts).
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
function shared(seed, id, rate, here) {
  if (roll(`${seed}:threads:shared:v1:${id}`) >= rate || !here.length) return null; const h = hashSeed(`${seed}:threads:shared:which:v1:${id}`);
  let k = h % here.reduce((n, [, w]) => n + w, 0); for (const [t, w] of here) { k -= w; if (k < 0) return t; } return null;
}
const deepPool = (d) => Object.keys(LATER).filter((t) => LATER[t][3].some((b) => inb(b, d))).map((t) => [t, 1]);
function budgeted(seed, id, budget, pool, giveWay = false) {
  const p = at(id); if (!p) return null; const d = Math.abs(p[0]) + Math.abs(p[1]); if (d < 3) return null;
  if (giveWay && Math.hypot(p[0], p[1]) >= 1000) return shared(seed, id, budget, pool(p[0], p[1], d)); // version 4: the first ten give way past 1000
  const f = firstTen(seed, id, d); if (f !== undefined) return f;
  const base = Object.values(FIRST).some((b) => inb(b, d)) ? .07 : 0; return shared(seed, id, (budget - base) / (1 - base), pool(p[0], p[1], d));
}
const r773 = (seed, id) => budgeted(seed, id, .13, (x, y, d) => deepPool(d));
const r779 = (seed, id) => budgeted(seed, id, .12, (x, y, d) => [...deepPool(d), ...(Math.hypot(x, y) >= 1000 ? OLD_FAR.map((t) => [t, 2]) : [])]);
const pool781 = (x, y, d) => [...deepPool(d), ...(Math.hypot(x, y) >= 1000 ? FAR.map((t) => [t, 3]) : [])];
const r781 = (seed, id) => budgeted(seed, id, .12, pool781);
const v4 = (seed, id) => budgeted(seed, id, .12, pool781, true);

const ring = (d, n, tag = 'f') => Array.from({ length: n }, (_, i) => { const seed = `FAR4${i % 7}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const circle = (r, n, tag = 'c') => Array.from({ length: n }, (_, i) => { const seed = `FAR4C${i % 5}`, a = (i * 2.399963) % (Math.PI * 2), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const NEAR = [[3, 6], [7, 18], [19, 35], [36, 70], [71, 150], [495, 505], [700, 720]], OUT = [[995, 1005], [1100, 1110], [1495, 1505], [2995, 3005]];
const beyond = (id) => { const [x, y] = at(id); return farDistance(x, y) >= FAR_REALMS.start; };

test('story version 4: the budget stays 0.12, the first ten give way past 1000, and every pool and weight is version 3\'s', () => {
  assert.equal(STORY_BUDGET.version, 4); assert.equal(STORY_BUDGET.perCrossing, .12); assert.deepEqual(STORY_BUDGET.byVersion, { 1: .13, 2: .12, 3: .12, 4: .12 });
  assert.equal(STORY_BUDGET.firstTenGivesWay, 4); assert.equal(budgetFor(4), .12); assert.equal(budgetFor(3), .12); assert.equal(budgetFor(1), .13);
  assert.equal(storyVersionFor(false), 4); assert.equal(storyVersionFor(true), 0);
  for (const [x, y] of [[0, 1500], [1000, 0], [708, 708], [3000, -4000], [999, 0], [700, 700], [40, 0], [5, 2]]) {
    assert.deepEqual(sharedThreads(4, x, y), sharedThreads(3, x, y), `${x},${y}: the pools are version 3's`);
    for (const t of THREAD_ORDER) assert.equal(threadWeight(t, 4), threadWeight(t, 3), t); }
  for (const id of FAR) assert.equal(threadWeight(id, 4), 3, `${id}: the pace is kept, weight 3`);
  assert.equal(sharedRate(1500, 0, 4), .12, 'past 1000 the whole budget is shared'); assert.equal(sharedRate(708, 708, 4), .12);
  assert.equal(sharedRate(999, 0, 4), sharedRate(999, 0, 3)); assert.equal(sharedRate(700, 700, 4), sharedRate(700, 700, 3), 'inside 1000 straight-line, as version 3');
  assert.ok(Math.abs(sharedRate(1500, 0, 3) - .05 / .93) < 1e-12, 'version 3 keeps the first ten\'s 0.07 out there');
});

test('version 4 holds a piece at exactly 0.12 at every distance from 3 to 3000, and measured at it, near and far', () => {
  for (let d = THREAD_RULES.minDepth; d <= 3000; d++) for (const [x, y] of [[d, 0], [Math.round(d * .7), Math.round(d * .7)]]) {
    const held = farDistance(x, y) >= FAR_REALMS.start ? sharedRate(x, y, 4) : THREAD_RULES.chance + (1 - THREAD_RULES.chance) * sharedRate(x, y, 4);
    assert.ok(Math.abs(held - .12) < 1e-12, `${x},${y}: ${held}`); assert.ok(sharedThreads(4, x, y).length >= 2); }
  let held = 0, all = 0;
  for (const [lo, hi] of [...NEAR, ...OUT]) { let h = 0, n = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(24000 / (hi - lo + 1)), 'd')) { n++; if (threadIn(seed, id, 4)) h++; }
    held += h; all += n; assert.ok(Math.abs(h / n - .12) < .0063, `${lo}-${hi}: ${(h / n).toFixed(4)}`); }
  for (const r of [1000, 1200, 2000, 5000]) { let h = 0; const c = circle(r, 24000, 'd'); for (const [seed, id] of c) if (threadIn(seed, id, 4)) h++; held += h; all += c.length; assert.ok(Math.abs(h / c.length - .12) < .0063, `r ${r}: ${(h / c.length).toFixed(4)}`); }
  assert.ok(all > 300000 && Math.abs(held / all - .12) < .0018, `${all} crossings, ${(held / all).toFixed(4)} overall`);
});

test('at version 4 no first-ten piece lies past 1000 straight-line; inside 1000 every crossing holds exactly what it holds at version 3', () => {
  let out = 0, inside = 0, firstInside = 0, deepPair = 0;
  for (const [lo, hi] of [...NEAR, [990, 1010], [1300, 1310], [2000, 2010]]) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(12000 / (hi - lo + 1)), 'b')) {
    const t = threadIn(seed, id, 4);
    if (beyond(id)) { out++; assert.ok(!t || !FIRST[t], `${id}: ${t}`); }
    else { inside++; assert.equal(t, threadIn(seed, id, 3), id); if (t && FIRST[t]) firstInside++; if (t === 'cartographer' || t === 'sleeper') deepPair++; } }
  for (const r of [1000, 1001, 1500, 3000]) for (const [seed, id] of circle(r, 20000, 'o')) { const t = threadIn(seed, id, 4); if (!beyond(id)) { inside++; assert.equal(t, threadIn(seed, id, 3), id); continue; } out++; assert.ok(!t || !FIRST[t], `${id}: ${t}`); }
  for (const r of [900, 999]) for (const [seed, id] of circle(r, 10000, 'i')) { inside++; const t = threadIn(seed, id, 4); assert.equal(t, threadIn(seed, id, 3), id); if (t === 'cartographer' || t === 'sleeper') deepPair++; }
  assert.ok(out > 80000 && inside > 80000 && firstInside > 3000 && deepPair > 1000, `${out} beyond, ${inside} inside, ${firstInside} first-ten inside, ${deepPair} deep pair inside`);
});

test('shares past 1000 at version 4: the far five take 15/19 of the whole 0.12, about 0.019 each, and every version 3 shared piece stays', () => {
  const counts = {}, c = circle(1500, 150000, 's'); let all = 0, kept = 0;
  for (const [seed, id] of c) { all++; const t = threadIn(seed, id, 4); if (t) counts[t] = (counts[t] || 0) + 1;
    const t3 = threadIn(seed, id, 3); if (t3 && !FIRST[t3]) { kept++; assert.equal(t, t3, `${id}: a shared slot keeps its thread`); } }
  const pool = sharedThreads(4, 1500, 0), weights = pool.reduce((s, t) => s + threadWeight(t, 4), 0);
  assert.deepEqual(pool, ['wellDigger', 'tollKeys', 'weaver', 'mirror', ...FAR]); assert.equal(weights, 19);
  assert.deepEqual(Object.keys(counts).sort(), [...pool].sort(), 'only the shared pool, no first ten');
  for (const t of pool) assert.ok(Math.abs(counts[t] / all - .12 * threadWeight(t, 4) / weights) < .0015, `${t}: ${(counts[t] / all).toFixed(4)}`);
  const far = FAR.reduce((s, t) => s + counts[t], 0) / all; assert.ok(Math.abs(far - .12 * 15 / 19) < .003, `far five ${far.toFixed(4)}`);
  let far3 = 0; for (const [seed, id] of c) if (FAR.includes(threadIn(seed, id, 3))) far3++;
  assert.ok(far > 2 * far3 / all, `the far stories met out there: ${(far3 / all).toFixed(4)} at v3, ${far.toFixed(4)} at v4`);
  assert.ok(kept > 6000, `${kept} version 3 shared pieces`);
});

test('crossings pinned at version 0, 1, 2 or 3 roll exactly as releases 772, 773, 779 and 781 laid them, and version 4 as written out, over 100,000 crossings', () => {
  let n = 0, moved = 0;
  const check = (seed, id) => { n++; assert.equal(threadIn(seed, id), r772(seed, id), id); assert.equal(threadIn(seed, id, 0), r772(seed, id), id);
    assert.equal(threadIn(seed, id, 1), r773(seed, id), id); assert.equal(threadIn(seed, id, 2), r779(seed, id), id);
    const t3 = threadIn(seed, id, 3); assert.equal(t3, r781(seed, id), id); const t4 = threadIn(seed, id, 4); assert.equal(t4, v4(seed, id), id); if (t4 !== t3) moved++; };
  for (const [lo, hi] of [...NEAR, ...OUT]) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(8000 / (hi - lo + 1)), 'p')) check(seed, id);
  for (const r of [1000, 1200, 1500, 3000, 5000]) for (const [seed, id] of circle(r, 4000, 'q')) check(seed, id);
  assert.ok(n >= 100000 && moved > 2000, `${n} crossings, ${moved} differ at version 4`);
});

test('a crossing pinned at version 3 keeps its pin and its first-ten piece through save and load; a crossing never generated pins to version 4', () => {
  const s = freshSave(); s.seed = 'FAR4PIN'; const ids = circle(1300, 6000, 'pin').map(([, id]) => id.replace(/FAR4C\d/, 'FAR4PIN'));
  const v3 = ids.filter((id) => FIRST[threadIn('FAR4PIN', id, 3)]).slice(0, 30), fresh = ids.filter((id) => !v3.includes(id) && FAR.includes(threadIn('FAR4PIN', id, 4)) && threadIn('FAR4PIN', id, 3) !== threadIn('FAR4PIN', id, 4)).slice(0, 30);
  assert.ok(v3.length >= 20 && fresh.length >= 20, `${v3.length}, ${fresh.length}`);
  for (const id of v3) s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, storyVersion: 3 };
  const loaded = migrateSave(JSON.parse(JSON.stringify(s)));
  for (const id of v3) { pinDungeonLayout(loaded, id); assert.equal(storyVersionOf(loaded, id), 3); const o = addThreadRelic(map(), loaded, id); assert.equal(o?.thread, r781('FAR4PIN', id)); assert.ok(FIRST[o.thread]); }
  for (const id of fresh) { const h = pinDungeonLayout(loaded, id); assert.equal(h.storyVersion, 4); assert.equal(addThreadRelic(map(), loaded, id)?.thread, v4('FAR4PIN', id)); }
  const again = migrateSave(JSON.parse(JSON.stringify(loaded)));
  for (const id of v3) assert.equal(again.consequences.dungeons[id].storyVersion, 3); for (const id of fresh) assert.equal(again.consequences.dungeons[id].storyVersion, 4);
  assert.equal(again.version, 14);
});

// Version 4 crossings of thread `thread` at Manhattan 40 to 900 (inside 1000 straight-line), or past 1000 straight-line.
const crossings = (seed, thread, n, far) => { const out = []; for (let i = 0; out.length < n && i < 400000; i++) { const a = i * 2.399963, r = far ? 1000 + (i % 600) : 40 + (i % 600), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r), id = `dungeon:${seed}:g1:${x}:${y}:room${i}`; if (beyond(id) === !!far && threadIn(seed, id, 4) === thread) out.push(id); } return out; };

test('at version 4 the Second Surveyor is still read to its end on the way out, inside 1000, in order; past 1000 it is never offered', () => {
  const id = 'cartographer', T = THREADS[id], seed = 'FAR4WAY', c = crossings(seed, id, T.pieces.length + 1, false), s = freshSave(); s.seed = seed;
  assert.equal(c.length, T.pieces.length + 1); for (const q of c) { assert.ok(!beyond(q)); s.consequences.dungeons[q] = { storyVersion: 4 }; }
  for (let i = 0; i < T.pieces.length; i++) { const o = addThreadRelic(map(), s, c[i]); assert.equal(o.thread, id); assert.equal(o.index, i); const r = readThreadRelic(s, o); assert.ok(r.first); assert.equal(r.done, i === T.pieces.length - 1); if (r.done) assert.ok(r.message.includes(T.ending)); }
  assert.ok(threadsDone(s).includes(id)); assert.equal(addThreadRelic(map(), s, c[T.pieces.length]), null, 'nothing stranded, nothing left');
  assert.deepEqual(crossings(seed, id, 1, true), [], 'no version 4 crossing past 1000 holds it');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(threadFound(back, id), c.slice(0, T.pieces.length)); assert.equal(back.version, 14);
});

test('in the game, a far thread is read to its end in version 4 crossings past 1000: the Journal keeps every piece and the ending, and QUEST COMPLETE is raised', () => {
  const id = 'tallSlates', T = THREADS[id], seed = 'FAR4GAME', c = crossings(seed, id, T.pieces.length, true), s = freshSave(); s.seed = seed;
  for (let i = 0; i < T.pieces.length; i++) { const q = c[i], [x, y] = at(q); assert.ok(beyond(q)); s.session.activeDungeonId = q; s.session.dungeonReturn = { rx: x, ry: y, x: 16, y: 16 };
    const g = new Game(s, 0); g.loadArea('dungeon', false); assert.equal(s.consequences.dungeons[q].storyVersion, 4, 'a new crossing pins to version 4');
    const o = g.map.objects.find((k) => k.kind === 'threadRelic'); assert.ok(o, `${i}: laid in the crossing`); assert.equal(o.thread, id); assert.equal(o.index, i);
    g.player.x = o.x; g.player.y = o.y; const r = g.interact('read', o.id); assert.ok(r.ok, g.message); assert.equal(r.done, i === T.pieces.length - 1);
    assert.ok(s.narrative.journal.some((j) => j.text === T.pieces[i]), `piece ${i + 1} is in the Journal`);
    if (r.done) { assert.ok(s.narrative.journal.some((j) => j.text === T.ending)); assert.ok((g.questNotices || []).some((k) => k.title === 'QUEST COMPLETE' && k.detail.includes(T.title))); } }
  assert.ok(threadsDone(s).includes(id));
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /for\(const id of threadsStarted\(save\)\)\{const T=THREADS\[id\]/, 'the Tome makes a book of every thread begun');
});
