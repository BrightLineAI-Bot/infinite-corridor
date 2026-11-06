// The story budget (Tim, 2026-11-05: "I don't really want to increase story density, but my goal is to get out to 1000 and then
// beyond... I don't want to increase it. Find a way to merge these stories into the whole Corridor without making it too many
// stories"). A crossing first entered from now on (story version 1) holds a thread piece at one fixed density, STORY_BUDGET
// .perCrossing, from the Refuge out past 1000 and on: the first ten's roll, then one shared roll among every later thread listed for
// that stretch. A crossing entered before keeps the waves' rule (version 0), exactly as release 772 laid it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed } from '../src/random.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { THREADS, THREAD_ORDER, THREAD_RULES, THREAD_BANDS, STORY_BUDGET, budgetFor, threadIn, inBand, sharedThreads, sharedRate, storyVersionOf, storyVersionFor, addThreadRelic, readThreadRelic, threadFound, threadsDone } from '../src/threads.ts';

const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
const roll = (key) => (hashSeed(key) % 10000) / 10000;
const LATER = THREAD_ORDER.filter((id) => THREADS[id].wave);
// What a crossing offered under release 772 (waves 1 to 5), written out from those rules and their numbers.
const R772 = { chance: .07, minDepth: 3, later: .025, third: .025, fourth: .04, fifth: .025 };
const BANDS772 = { near: [3, 18], middle: [7, 35], far: [19, 70], deep: [36, Infinity] };
const BAND772 = { lamplighter: 'near', letters: 'near', choir: 'middle', clockmaker: 'middle', ferry: 'middle', moth: 'far', library: 'far', orchard: 'far', cartographer: 'deep', sleeper: 'deep', wellDigger: 'far', tollKeys: 'middle', weaver: 'far', mirror: 'far', beekeeper: 'near', toolmaker: 'middle' };
const WAVE772 = { wellDigger: 2, tollKeys: 3, weaver: 3, mirror: 3, beekeeper: 4, toolmaker: 5 }, LAYER772 = { weaver: 1, mirror: 1 };
function r772(seed, id) {
  const m = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(id); if (!m) return null; const x = Number(m[1]), y = Number(m[2]), d = Math.abs(x) + Math.abs(y);
  if (d < R772.minDepth) return null; const inb = (t) => d >= BANDS772[BAND772[t]][0] && d <= BANDS772[BAND772[t]][1];
  const pick = (wave, key) => { const all = Object.keys(BAND772).filter((t) => WAVE772[t] === wave && inb(t)); if (!all.length) return null;
    const first = Math.min(...all.map((t) => LAYER772[t] || 0)), here = all.filter((t) => (LAYER772[t] || 0) === first); return here[hashSeed(key) % here.length]; };
  if (roll(`${seed}:threads:v1:${id}`) < R772.chance) return pick(undefined, `${seed}:threads:which:v1:${id}`);
  for (const [w, rate, name] of [[2, R772.later, 'later'], [3, R772.third, 'third'], [4, R772.fourth, 'fourth'], [5, R772.fifth, 'fifth']])
    if (roll(`${seed}:threads:${name}:v1:${id}`) < rate) { const t = pick(w, `${seed}:threads:${name}:which:v1:${id}`); if (t) return t; }
  return null;
}
// Crossings on the ring `d` sections out (Manhattan, as THREAD_BANDS measure), spread round it, several seeds.
const ring = (d, n, tag = 'room') => Array.from({ length: n }, (_, i) => { const seed = `BUDGET${i % 7}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`]; });
const density = (lo, hi, n, version) => { let held = 0, all = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(n / (hi - lo + 1)))) { all++; if (threadIn(seed, id, version)) held++; } return held / all; };
const STRETCHES = [[3, 6], [7, 18], [19, 35], [36, 70], [71, 150], [195, 205], [495, 505], [995, 1005], [1495, 1505], [2995, 3005]];

test('the budget is one table number, and its chance comes out exactly the budget at every distance from 3 to 3000', () => {
  // Story version 2 (2026-11-05) trimmed the budget of crossings entered from then on to 0.12; version 1 keeps 0.13.
  assert.ok(STORY_BUDGET.version >= 2); assert.equal(STORY_BUDGET.perCrossing, .12); // story version 3 (2026-11-06) keeps 0.12 assert.equal(budgetFor(1), .13); assert.equal(budgetFor(2), .12);
  // The reference: the near-and-middle stretch (7 to 18 out) before wave 5, the most any stretch held then.
  const before5 = 1 - (1 - R772.chance) * (1 - R772.third) * (1 - R772.fourth); assert.ok(Math.abs(before5 - budgetFor(1)) < .001, String(before5));
  for (let d = THREAD_RULES.minDepth; d <= 3000; d++) for (const v of [1, 2]) { const r = sharedRate(d, 0, v), held = THREAD_RULES.chance + (1 - THREAD_RULES.chance) * r;
    assert.ok(Math.abs(held - budgetFor(v)) < 1e-12, `${d}: ${held}`); assert.ok(sharedThreads(1, d, 0).length >= 2, `${d}: later threads share the slots`); }
  for (let d = 0; d < THREAD_RULES.minDepth; d++) assert.equal(threadIn('BUDGET1', `dungeon:BUDGET1:g1:${d}:0:room`, 1), null, 'nothing by the Refuge');
  assert.equal(threadIn('BUDGET1', 'arena:x', 1), null);
});

test('measured: a crossing first entered under the budget holds a piece at the budget in every stretch out to 3000, none above it', () => {
  for (const [lo, hi] of STRETCHES) { const v1 = density(lo, hi, 24000, 1);
    assert.ok(Math.abs(v1 - budgetFor(1)) < .01, `${lo}-${hi}: ${v1.toFixed(4)}`); assert.ok(v1 <= budgetFor(1) + .01, `${lo}-${hi} above budget`); }
});

test('measured: release 772 held 0.107 near, 0.151 and 0.138 where wave 5 landed, 0.116 far and 0.07 past 70 (the first ten alone)', () => {
  const want = { '3-6': .1072, '7-18': .1513, '19-35': .1380, '36-70': .1159, '71-150': .07, '995-1005': .07, '2995-3005': .07 };
  for (const [k, w] of Object.entries(want)) { const [lo, hi] = k.split('-').map(Number), v0 = density(lo, hi, 24000, 0); assert.ok(Math.abs(v0 - w) < .01, `${k}: ${v0.toFixed(4)} (wanted ${w})`); }
  // Wave 5 (the Toolmaker's Handles) took the middle band above the budget; under the budget it shares the one roll instead.
  assert.ok(density(7, 18, 24000, 0) > budgetFor(1) + .015); assert.ok(density(7, 18, 24000, 1) <= budgetFor(1) + .01);
});

test('version 0 is release 772 crossing for crossing, over 60,000 crossings out to 3000; version 1 keeps every first-ten crossing', () => {
  let n = 0, kept = 0;
  for (const [lo, hi] of STRETCHES) for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(6000 / (hi - lo + 1)), 'v')) {
    n++; const was = r772(seed, id); assert.equal(threadIn(seed, id), was, id); assert.equal(threadIn(seed, id, 0), was, id);
    const now = threadIn(seed, id, 1); assert.equal(now, threadIn(seed, id, 1), 'deterministic');
    if (was && !THREADS[was].wave) { kept++; assert.equal(now, was, 'a first-ten crossing holds the same thread under the budget'); }
    if (now && THREADS[now].wave) { const [, , , x, y] = id.split(':'); assert.ok(sharedThreads(1, Number(x), Number(y)).includes(now), 'a later thread only where it shares slots'); }
  }
  assert.ok(n >= 60000 && kept > 3000, `${n} crossings, ${kept} first-ten`);
});

test('a crossing seen under release 772 keeps exactly what it offered; only a crossing never generated takes the budget', () => {
  const s = freshSave(); s.seed = 'SEEN772'; const seen = [], fresh = [];
  for (const [seed, id] of ring(24, 4000, 's').map(([, id]) => ['SEEN772', id.replace(/BUDGET\d/, 'SEEN772')])) { const was = r772(seed, id), now = threadIn(seed, id, 1); if (was && now !== was && seen.length < 40) seen.push(id); else if (now && now !== was && fresh.length < 40) fresh.push(id); }
  assert.ok(seen.length >= 20 && fresh.length >= 20, `${seen.length} seen, ${fresh.length} fresh crossings where the rules differ`);
  // A release 772 save: the crossings it entered have histories pinned then (no storyVersion), some in the exact-resume areas only,
  // and one piece found in one of them.
  seen.forEach((id, i) => { if (i % 3 === 0) s.session.areas[id] = { enemies: [] }; else s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: i % 3 === 1 ? 1 : 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, ...(i % 3 === 2 ? { layoutVersion: 1, generatorVersion: 5 } : {}) }; });
  const firstThread = r772('SEEN772', seen[1]); s.lore.threads = { [firstThread]: [seen[1]] };
  const before = JSON.parse(JSON.stringify(seen.map((id) => addThreadRelic(map(), s, id))));
  const loaded = migrateSave(JSON.parse(JSON.stringify(s)));
  for (const [i, id] of seen.entries()) { const h = pinDungeonLayout(loaded, id); assert.equal(h.storyVersion, 0, id); assert.equal(storyVersionOf(loaded, id), 0);
    const o = addThreadRelic(map(), loaded, id); assert.deepEqual(o, before[i], 'the same piece, in the same place, read or waiting as before'); assert.equal(o?.thread ?? null, r772('SEEN772', id)); }
  assert.equal(addThreadRelic(map(), loaded, seen[1]).state, 'read');
  for (const id of fresh) { assert.equal(storyVersionOf(loaded, id), 0, 'not pinned yet'); const h = pinDungeonLayout(loaded, id); assert.equal(h.storyVersion, STORY_BUDGET.version);
    assert.equal(addThreadRelic(map(), loaded, id)?.thread ?? null, threadIn('SEEN772', id, STORY_BUDGET.version)); }
  // A pin never moves: a crossing pinned to the budget keeps its version after it is visited, saved and loaded.
  for (const id of fresh) { loaded.consequences.dungeons[id].visits = 3; pinDungeonLayout(loaded, id); }
  const again = migrateSave(JSON.parse(JSON.stringify(loaded)));
  for (const id of fresh) { assert.equal(again.consequences.dungeons[id].storyVersion, STORY_BUDGET.version); assert.equal(storyVersionOf(again, id), STORY_BUDGET.version); }
  for (const id of seen) assert.equal(again.consequences.dungeons[id].storyVersion, 0);
  assert.equal(storyVersionFor(true), 0); assert.equal(storyVersionFor(false), STORY_BUDGET.version);
});

test('entering a new crossing in the game pins it to the budget; one already generated keeps version 0', () => {
  const pickId = (want) => { for (let i = 0; i < 5000; i++) { const id = `dungeon:GAMEBUD:g1:${20 + (i % 9)}:${i % 5}:dungeon-g1-gb-${i}`; const v1 = threadIn('GAMEBUD', id, STORY_BUDGET.version), v0 = threadIn('GAMEBUD', id, 0); if (v1 && v0 !== v1 && (want > 0 || v0)) return id; } };
  for (const version of [STORY_BUDGET.version, 0]) { const s = freshSave(); s.seed = 'GAMEBUD'; const id = pickId(version), [, , , x, y] = id.split(':');
    if (version === 0) s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, layoutVersion: 1, generatorVersion: 5 };
    s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: Number(x), ry: Number(y), x: 16, y: 16 };
    const g = new Game(s, 0); g.loadArea('dungeon', false); assert.equal(s.consequences.dungeons[id].storyVersion, version);
    const o = g.map.objects.find((q) => q.kind === 'threadRelic'); assert.ok(o, 'laid in the crossing'); assert.equal(o.thread, threadIn('GAMEBUD', id, version)); }
});

test('every later thread shares slots in each stretch it lists, at an even share, and can be read to its ending under the budget', () => {
  for (const id of LATER) { const T = THREADS[id], bands = T.shared[1]; assert.ok(bands.includes(T.band), `${id} keeps its own stretch`);
    for (const b of bands) for (const d of [THREAD_BANDS[b][0], Math.min(THREAD_BANDS[b][1], 3000)]) assert.ok(inBand(b, d, 0) && sharedThreads(1, d, 0).includes(id), `${id} in ${b} at ${d}`); }
  // Even shares: in 71 to 150, the first ten hold 0.07 and the later threads listed there split the rest evenly.
  const counts = {}; let all = 0; for (let d = 71; d <= 150; d++) for (const [seed, id] of ring(d, 400, 'e')) { all++; const t = threadIn(seed, id, 1); if (t && THREADS[t].wave) counts[t] = (counts[t] || 0) + 1; }
  const deep = sharedThreads(1, 100, 0); assert.deepEqual(Object.keys(counts).sort(), [...deep].sort());
  for (const t of deep) assert.ok(Math.abs(counts[t] / all - (budgetFor(1) - THREAD_RULES.chance) / deep.length) < .006, `${t}: ${counts[t] / all}`);
  // Read each later thread to its ending through crossings pinned to the budget (none ever stranded).
  for (const id of LATER) { const T = THREADS[id], s = freshSave(); s.seed = 'READALL'; const found = [];
    for (let d = 3; d <= 400 && found.length < T.pieces.length + 1; d++) for (const [, cid] of ring(d, 60, 'r').map(([, c]) => [0, c.replace(/BUDGET\d/, 'READALL')])) if (found.length < T.pieces.length + 1 && threadIn('READALL', cid, 1) === id) found.push(cid);
    assert.ok(found.length > T.pieces.length, `${id}: ${found.length} crossings by 400 out`);
    for (let i = 0; i < T.pieces.length; i++) { s.consequences.dungeons[found[i]] = { storyVersion: 1 }; const o = addThreadRelic(map(), s, found[i]); assert.equal(o.thread, id); assert.equal(o.index, i); const r = readThreadRelic(s, o); assert.ok(r.first); assert.equal(r.done, i === T.pieces.length - 1); }
    assert.ok(threadsDone(s).includes(id)); assert.equal(threadFound(s, id).length, T.pieces.length);
    s.consequences.dungeons[found[T.pieces.length]] = { storyVersion: 1 }; assert.equal(addThreadRelic(map(), s, found[T.pieces.length]), null, 'nothing left once the thread is done'); }
});

test('a thread written later splits the slots of crossings not yet entered and adds none; pinned crossings never move', () => {
  const sample = []; for (const d of [5, 12, 30, 60, 400, 1200]) sample.push(...ring(d, 3000, 'n'));
  const v1 = sample.map(([seed, id]) => threadIn(seed, id, 1)), heldV1 = v1.filter(Boolean).length;
  // Story version 2 trimmed the budget, so the trial is a version 3 thread measured against version 2 (the same budget).
  const v2 = sample.map(([seed, id]) => threadIn(seed, id, 2)), heldV2 = v2.filter(Boolean).length;
  THREADS.__trial = { title: 'Trial', band: 'deep', relic: 'book', colour: '#fff', shared: { 3: ['near', 'middle', 'far', 'deep'] }, pieces: ['a', 'b'], ending: 'z' }; THREAD_ORDER.push('__trial');
  try {
    sample.forEach(([seed, id], i) => assert.equal(threadIn(seed, id, 1), v1[i], 'a version 1 crossing keeps its thread'));
    sample.forEach(([seed, id], i) => assert.equal(threadIn(seed, id, 2), v2[i], 'a version 2 crossing keeps its thread'));
    sample.forEach(([seed, id], i) => assert.equal(threadIn(seed, id, 0), r772(seed, id), 'a version 0 crossing keeps its thread'));
    const v3 = sample.map(([seed, id]) => threadIn(seed, id, 3)); assert.equal(v3.filter(Boolean).length, heldV2, 'the same number of slots');
    assert.ok(heldV1 > heldV2, 'version 2 holds fewer than version 1');
    assert.ok(v3.filter((t) => t === '__trial').length > 100, 'the new thread takes a share');
    v3.forEach((t, i) => { if (t !== v2[i]) assert.ok(t === '__trial' || (v2[i] && THREADS[v2[i]].shared), 'only shared slots are re-split'); });
  } finally { delete THREADS.__trial; THREAD_ORDER.pop(); }
});
