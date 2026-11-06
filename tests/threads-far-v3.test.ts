// Story version 3 (2026-11-06). Tim: "I'm sure we can have more stories... there's tons of room to find stories... the world is
// huge and I intended it to be massive"; the far stories should be the main ones out past 1000, since they only exist there.
// Two more far threads (the Enumerator's Count, for the Crystal Civilisation; the Tinker's Tags, for the Storm Halls) share the
// beyond slots from version 3, and all five far threads take weight 3 there, at the same budget (0.12). Crossings pinned at
// version 0, 1 or 2 roll exactly as releases 772, 773 and 779 laid them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashSeed } from '../src/random.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { FAR_REALMS, farDistance } from '../src/far-realms.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, STORY_BUDGET, budgetFor, threadIn, inBand, sharedThreads, sharedRate, threadWeight, storyVersionFor, storyVersionOf, addThreadRelic, readThreadRelic, threadFound, threadsDone, threadsStarted } from '../src/threads.ts';

const OLD_FAR = ['tallSlates', 'sporePrints', 'inkBlotters'], NEW_FAR = ['enumerator', 'tinkerTags'], FAR = [...OLD_FAR, ...NEW_FAR];
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
const roll = (key) => (hashSeed(key) % 10000) / 10000;

// What a crossing offered under releases 772 (version 0), 773 (version 1, 0.13, even) and 779 (version 2, 0.12, the three far
// threads at weight 2 past 1000 straight-line), written out from those rules and their numbers.
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
function budgeted(seed, id, budget, pool) {
  const p = at(id); if (!p) return null; const d = Math.abs(p[0]) + Math.abs(p[1]); if (d < 3) return null; const f = firstTen(seed, id, d); if (f !== undefined) return f;
  const base = Object.values(FIRST).some((b) => inb(b, d)) ? .07 : 0; if (roll(`${seed}:threads:shared:v1:${id}`) >= (budget - base) / (1 - base)) return null;
  const here = pool(p[0], p[1], d); if (!here.length) return null; const h = hashSeed(`${seed}:threads:shared:which:v1:${id}`);
  let k = h % here.reduce((n, [, w]) => n + w, 0); for (const [t, w] of here) { k -= w; if (k < 0) return t; } return null;
}
const r773 = (seed, id) => budgeted(seed, id, .13, (x, y, d) => Object.keys(LATER).filter((t) => LATER[t][3].some((b) => inb(b, d))).map((t) => [t, 1]));
const r779 = (seed, id) => budgeted(seed, id, .12, (x, y, d) => [...Object.keys(LATER).filter((t) => LATER[t][3].some((b) => inb(b, d))).map((t) => [t, 1]), ...(Math.hypot(x, y) >= 1000 ? OLD_FAR.map((t) => [t, 2]) : [])]);

const ring = (d, n, tag = 'f') => Array.from({ length: n }, (_, i) => { const seed = `FAR3${i % 7}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const circle = (r, n, tag = 'c') => Array.from({ length: n }, (_, i) => { const seed = `FAR3C${i % 5}`, a = (i * 2.399963) % (Math.PI * 2), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const NEAR = [[3, 6], [7, 18], [19, 35], [36, 70], [71, 150], [495, 505]], OUT = [[995, 1005], [1100, 1110], [1495, 1505], [2995, 3005]];

test('story version 3: the budget stays 0.12, the five far threads share the beyond slots at weight 3, and the two new ones are written in full', () => {
  assert.ok(STORY_BUDGET.version >= 3); assert.equal(STORY_BUDGET.perCrossing, .12); assert.equal(STORY_BUDGET.byVersion[3], .12); // story version 4 (2026-11-06) adds an entry
  assert.equal(budgetFor(3), .12); assert.equal(budgetFor(2), .12); assert.equal(budgetFor(1), .13); assert.equal(storyVersionFor(false), STORY_BUDGET.version); assert.equal(storyVersionFor(true), 0);
  for (const id of FAR) { const T = THREADS[id]; assert.equal(T.band, 'beyond'); assert.deepEqual(T.shared[3], ['beyond']); assert.equal(threadWeight(id, 3), 3, id); assert.equal(threadWeight(id), 3); }
  for (const id of OLD_FAR) { assert.deepEqual(THREADS[id].shared[2], ['beyond']); assert.equal(threadWeight(id, 2), 2, `${id} keeps weight 2 at version 2`); assert.equal(threadWeight(id, 1), 1); }
  for (const id of THREAD_ORDER.filter((t) => !FAR.includes(t))) for (const v of [1, 2, 3]) assert.equal(threadWeight(id, v), 1, `${id} v${v}`);
  assert.deepEqual(THREAD_ORDER.filter((id) => THREADS[id].shared?.[3]), FAR, 'only the far threads are listed at version 3');
  assert.deepEqual(THREAD_ORDER.slice(-2), NEW_FAR, 'the new threads come last, so older pools keep their order');
  const relics = THREAD_ORDER.map((id) => THREADS[id].relic); assert.equal(new Set(relics).size, relics.length, 'every thread has its own relic');
  const rend = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), bible = readFileSync(new URL('../docs/narrative-bible.md', import.meta.url), 'utf8');
  for (const id of NEW_FAR) { const T = THREADS[id]; assert.ok(!T.wave && !T.layer, `${id} is never a wave`); assert.deepEqual(Object.keys(T.shared), ['3']);
    assert.equal(T.pieces.length, 6); assert.equal(new Set(T.pieces).size, 6); assert.ok(T.pieces.every((p) => p.length > 80 && p.length < 400), id); assert.ok(T.ending.length > 200 && T.ending.length < 650, id);
    assert.ok(!/corridor/i.test(T.pieces.join(' ') + T.ending), `${id}: never names what the Corridor is`); assert.match(T.colour, /^#[0-9a-f]{6}$/i);
    assert.match(rend, new RegExp(`case "${T.relic}"`), `the ${T.relic} is drawn`); assert.ok(bible.includes(T.title), `${id} is in the bible's thread list`); }
  assert.match(THREADS.enumerator.pieces.join(' '), /crystal/i); assert.match(THREADS.tinkerTags.ending, /Storm Halls/);
});

test('version 3 holds a piece at exactly 0.12 at every distance from 3 to 3000, and measured at or under it, near and far', () => {
  for (let d = THREAD_RULES.minDepth; d <= 3000; d++) for (const [x, y] of [[d, 0], [Math.round(d * .7), Math.round(d * .7)]]) {
    const held = THREAD_RULES.chance + (1 - THREAD_RULES.chance) * sharedRate(x, y, 3); assert.ok(Math.abs(held - .12) < 1e-12, `${x},${y}: ${held}`); assert.ok(sharedThreads(3, x, y).length >= 2); }
  let held = 0, all = 0;
  for (const [lo, hi] of [...NEAR, ...OUT]) { let h = 0, n = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(24000 / (hi - lo + 1)), 'd')) { n++; if (threadIn(seed, id, 3)) h++; }
    held += h; all += n; assert.ok(h / n <= .12 + .0063, `${lo}-${hi}: ${(h / n).toFixed(4)} above the budget`); assert.ok(Math.abs(h / n - .12) < .0063, `${lo}-${hi}: ${(h / n).toFixed(4)}`); }
  for (const r of [1000, 1200, 2000, 5000]) { let h = 0; const c = circle(r, 24000, 'd'); for (const [seed, id] of c) if (threadIn(seed, id, 3)) h++; held += h; all += c.length; assert.ok(Math.abs(h / c.length - .12) < .0063, `r ${r}: ${(h / c.length).toFixed(4)}`); }
  assert.ok(all > 300000 && held / all <= .12 + .0018, `${all} crossings, ${(held / all).toFixed(4)} overall`);
  // The same crossings hold a piece at version 3 exactly where they do at version 2: the slots are the same; only who fills them moves.
  for (const [seed, id] of [...ring(1003, 20000, 'same'), ...circle(1500, 20000, 'same'), ...ring(40, 10000, 'same')]) assert.equal(!!threadIn(seed, id, 3), !!threadIn(seed, id, 2), id);
});

test('the new far threads lie only beyond 1000 sections (straight line) and only at version 3', () => {
  let found = 0, n = 0;
  for (const [lo, hi] of [...NEAR, [700, 720], [990, 1010], [1300, 1310], [2000, 2010]]) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(12000 / (hi - lo + 1)), 'b')) {
    n++; const [x, y] = at(id); for (const v of [0, 1, 2]) assert.ok(!NEW_FAR.includes(threadIn(seed, id, v)), `${id} v${v}`);
    const t = threadIn(seed, id, 3); if (FAR.includes(t)) { if (NEW_FAR.includes(t)) found++; assert.ok(farDistance(x, y) >= FAR_REALMS.start, `${id}: ${farDistance(x, y).toFixed(1)}`); }
    if (farDistance(x, y) < FAR_REALMS.start) assert.ok(!sharedThreads(3, x, y).some((q) => FAR.includes(q)), id); else assert.ok(NEW_FAR.every((q) => sharedThreads(3, x, y).includes(q)), id); }
  assert.ok(n > 110000 && found > 200, `${n} crossings, ${found} new far pieces`);
  for (const id of NEW_FAR) { assert.ok(!sharedThreads(2, 1500, 0).includes(id)); assert.ok(sharedThreads(3, 1500, 0).includes(id)); assert.ok(!sharedThreads(3, 999, 0).includes(id)); assert.ok(sharedThreads(3, 708, 708).includes(id)); }
});

test('shares past 1000 at version 3: each far thread takes three times a deep-band shared thread, about 0.79 of the shared slots', () => {
  const counts = {}; let all = 0; for (const [seed, id] of circle(1500, 150000, 's')) { all++; const t = threadIn(seed, id, 3); if (t) counts[t] = (counts[t] || 0) + 1; }
  const pool = sharedThreads(3, 1500, 0), weights = pool.reduce((s, t) => s + threadWeight(t, 3), 0), rest = .12 - THREAD_RULES.chance;
  assert.deepEqual(pool, ['wellDigger', 'tollKeys', 'weaver', 'mirror', ...FAR]); assert.equal(weights, 19);
  for (const t of pool) assert.ok(Math.abs(counts[t] / all - rest * threadWeight(t, 3) / weights) < .0015, `${t}: ${(counts[t] / all).toFixed(4)}`);
  const farShare = FAR.reduce((s, t) => s + counts[t], 0) / pool.reduce((s, t) => s + counts[t], 0); assert.ok(Math.abs(farShare - 15 / 19) < .02, `far share ${farShare.toFixed(3)}`);
  assert.ok(Math.abs((counts.cartographer + counts.sleeper) / all - THREAD_RULES.chance) < .003, 'the first ten keep their slots');
  // Against version 2 at the same crossings, the far threads together take more of the slots than they did.
  let v2far = 0; for (const [seed, id] of circle(1500, 150000, 's')) if (OLD_FAR.includes(threadIn(seed, id, 2))) v2far++;
  assert.ok(FAR.reduce((s, t) => s + counts[t], 0) > v2far * 1.2, 'the far stories are more of what is met out there');
});

test('crossings pinned at version 0, 1 or 2 roll exactly as releases 772, 773 and 779 laid them, over 100,000 crossings out to 3000', () => {
  let n = 0, kept = 0, moved = 0;
  for (const [lo, hi] of [...NEAR, ...OUT]) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(8000 / (hi - lo + 1)), 'p')) {
    n++; assert.equal(threadIn(seed, id), r772(seed, id), id); assert.equal(threadIn(seed, id, 0), r772(seed, id), id); assert.equal(threadIn(seed, id, 1), r773(seed, id), id);
    const v2 = r779(seed, id); assert.equal(threadIn(seed, id, 2), v2, id);
    const v3 = threadIn(seed, id, 3); if (v2 && FIRST[v2]) { kept++; assert.equal(v3, v2, 'a first-ten crossing holds the same thread at every version'); } else if (v3 !== v2) moved++; }
  for (const r of [1000, 1200, 1500, 3000, 5000]) for (const [seed, id] of circle(r, 4000, 'q')) { n++; assert.equal(threadIn(seed, id, 0), r772(seed, id), id); assert.equal(threadIn(seed, id, 1), r773(seed, id), id);
    const v2 = r779(seed, id); assert.equal(threadIn(seed, id, 2), v2, id); if (threadIn(seed, id, 3) !== v2) moved++; }
  assert.ok(n >= 100000 && kept > 5000 && moved > 1000, `${n} crossings, ${kept} first-ten, ${moved} differ at version 3`);
});

test('a crossing pinned at version 2 keeps its thread through save and load; a crossing never generated pins to the current version', () => {
  const s = freshSave(); s.seed = 'FAR3PIN'; const ids = circle(1300, 4000, 'pin').map(([, id]) => id.replace(/FAR3C\d/, 'FAR3PIN'));
  const v2 = ids.filter((id) => threadIn('FAR3PIN', id, 2) !== threadIn('FAR3PIN', id, 3)).slice(0, 30), fresh = ids.filter((id) => NEW_FAR.includes(threadIn('FAR3PIN', id, 3)) && !v2.includes(id)).slice(0, 30);
  assert.ok(v2.length >= 20 && fresh.length >= 10, `${v2.length}, ${fresh.length}`);
  for (const id of v2) s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, storyVersion: 2 };
  const loaded = migrateSave(JSON.parse(JSON.stringify(s)));
  for (const id of v2) { pinDungeonLayout(loaded, id); assert.equal(storyVersionOf(loaded, id), 2); assert.equal(addThreadRelic(map(), loaded, id)?.thread ?? null, r779('FAR3PIN', id)); }
  for (const id of fresh) { const h = pinDungeonLayout(loaded, id); assert.equal(h.storyVersion, STORY_BUDGET.version); assert.ok(NEW_FAR.includes(addThreadRelic(map(), loaded, id).thread)); }
  const again = migrateSave(JSON.parse(JSON.stringify(loaded)));
  for (const id of v2) assert.equal(again.consequences.dungeons[id].storyVersion, 2); for (const id of fresh) assert.equal(again.consequences.dungeons[id].storyVersion, STORY_BUDGET.version);
  assert.equal(again.version, 14);
});

const farCrossings = (seed, thread, n) => { const out = []; for (let i = 0; out.length < n && i < 200000; i++) { const a = i * 2.399963, r = 1000 + (i % 600), x = Math.round(Math.cos(a) * r), y = Math.round(Math.sin(a) * r), id = `dungeon:${seed}:g1:${x}:${y}:room${i}`; if (threadIn(seed, id, 3) === thread) out.push(id); } return out; };

test('each new far thread is read in order across crossings, never stranded, and the save keeps it at schema 14', () => {
  for (const id of NEW_FAR) { const T = THREADS[id], seed = `READ3-${id}`, c = farCrossings(seed, id, T.pieces.length + 1), s = freshSave(); s.seed = seed;
    assert.equal(c.length, T.pieces.length + 1, `${id}: crossings enough`); for (const q of c) s.consequences.dungeons[q] = { storyVersion: 3 };
    assert.equal(addThreadRelic(map(), s, c[0]).relic, T.relic); assert.equal(addThreadRelic(map(), s, c[3]).index, 0, 'the first piece waits in every crossing until found');
    for (let i = 0; i < T.pieces.length; i++) { const q = addThreadRelic(map(), s, c[i]); assert.equal(q.index, i); assert.equal(q.state, 'waiting'); const r = readThreadRelic(s, q); assert.ok(r.first); assert.equal(r.text, T.pieces[i]); assert.equal(r.done, i === T.pieces.length - 1);
      if (r.done) assert.ok(r.message.includes(T.ending)); else assert.ok(r.message.includes(`(${i + 1} of 6.)`)); }
    const again = readThreadRelic(s, addThreadRelic(map(), s, c[1])); assert.ok(again.ok && !again.first, 'a read piece reads again without counting twice');
    assert.equal(addThreadRelic(map(), s, c[2]).state, 'read'); assert.equal(addThreadRelic(map(), s, c[T.pieces.length]), null, 'nothing left once the thread is done');
    assert.ok(threadsDone(s).includes(id) && threadsStarted(s).includes(id));
    const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(threadFound(back, id), c.slice(0, T.pieces.length)); assert.equal(back.version, 14);
    for (const v of [0, 2]) { const old = freshSave(); old.seed = seed; for (const q of c) { old.consequences.dungeons[q] = { storyVersion: v }; assert.ok(!NEW_FAR.includes(addThreadRelic(map(), old, q)?.thread), `v${v} never offers it`); } } }
});

test('in the game, each new far thread is read to its end: the Journal keeps every piece and the ending, and QUEST COMPLETE is raised', () => {
  for (const id of NEW_FAR) { const T = THREADS[id], seed = `FAR3GAME-${id}`, c = farCrossings(seed, id, T.pieces.length), s = freshSave(); s.seed = seed;
    for (let i = 0; i < T.pieces.length; i++) { const q = c[i], [x, y] = at(q); s.session.activeDungeonId = q; s.session.dungeonReturn = { rx: x, ry: y, x: 16, y: 16 };
      const g = new Game(s, 0); g.loadArea('dungeon', false); assert.equal(s.consequences.dungeons[q].storyVersion, STORY_BUDGET.version, 'a new crossing pins to the current version');
      const o = g.map.objects.find((k) => k.kind === 'threadRelic'); assert.ok(o, `${id} ${i}: laid in the crossing`); assert.equal(o.thread, id); assert.equal(o.index, i);
      g.player.x = o.x; g.player.y = o.y; const r = g.interact('read', o.id); assert.ok(r.ok, g.message); assert.equal(r.done, i === T.pieces.length - 1);
      assert.ok(s.narrative.journal.some((j) => j.text === T.pieces[i]), `piece ${i + 1} is in the Journal`);
      if (r.done) { assert.ok(s.narrative.journal.some((j) => j.text === T.ending)); assert.ok((g.questNotices || []).some((k) => k.title === 'QUEST COMPLETE' && k.detail.includes(T.title))); } }
    assert.ok(threadsDone(s).includes(id)); }
});
