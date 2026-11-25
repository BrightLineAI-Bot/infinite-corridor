// The Washing at Sallowby (2026-11-21, the daily narrative pass; docs/narrative-bible.md section 6 item 5 and item 6, story
// version 6). A middle-band thread in the shared roll: it splits the slots of crossings first entered from story version 6 and
// adds none, so every crossing pinned before offers exactly what it did and the density is unchanged. Once its first bundle is
// read, the compass follows it to the crossing that holds the next (thread-trails.ts); its end writes the Journal and the Tome and
// leaves 40 marks on the post (threads.ts THREAD_GIFTS), no ability.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, normalizeCompassFollow, setCompassChoice } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { THREADS, THREAD_ORDER, THREAD_BANDS, THREAD_TRAILS, THREAD_GIFTS, STORY_BUDGET, budgetFor, threadIn, inBand, sharedThreads, sharedRate, storyVersionFor, addThreadRelic, readThreadRelic, threadFound, threadsDone, threadsStarted, settleThreadGifts, ensureThreadTrails, arcanaProgress } from '../src/threads.ts';
import { ARCANA_REGIONS, arcanaHint, inArcanaHome, regionVersionFor } from '../src/lore.ts';
import { saveFrame, saveStart, IDENTITY_FRAME, useJourneyFrame } from '../src/journey-start.ts';
import { startJourney } from '../src/progression.ts';
import { trailBegun, trailPlace, trailTarget, trailLeads, trailFollowId, trailOfFollow, nearestTrailCrossing, TRAIL_IDS } from '../src/thread-trails.ts';
import { compassFollowTarget } from '../src/atlas-view.ts';
import { nextRumour, recordRumour, rumourLive, questLeadCount } from '../src/leads.ts';
import { crossingAt } from '../src/quest-places.ts';

const ID = 'washing', T = THREADS[ID], V = 6;
const dmap = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
// Crossings on the ring `d` sections walked out, spread round it, over several seeds.
const ring = (d, n, tag = 'w') => Array.from({ length: n }, (_, i) => { const seed = `WASH${i % 9}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`, x, y]; });
const DISTANCES = [3, 6, 7, 10, 12, 15, 18, 19, 22, 26, 30, 35, 36, 50, 70, 71, 150, 700, 1000, 1500, 3000];
// threadIn as it would be with the Washing never written (the pools read THREAD_ORDER as they roll).
function without(fn) { const t = THREADS[ID], at = THREAD_ORDER.indexOf(ID); delete THREADS[ID]; THREAD_ORDER.splice(at, 1); try { return fn(); } finally { THREADS[ID] = t; THREAD_ORDER.splice(at, 0, ID); } }

test('written in full, never a wave: six bundles in order, an ending, its own relic drawn, a home south-east, in the bible', () => {
  assert.equal(T.title, 'The Washing at Sallowby'); assert.equal(T.band, 'middle'); assert.ok(!T.wave && !T.layer, 'never a wave');
  assert.deepEqual(T.shared, { 6: ['middle', 'far'] }); assert.equal(T.relic, 'bundle'); assert.match(T.colour, /^#[0-9a-f]{6}$/i);
  assert.equal(T.pieces.length, 6); assert.equal(new Set(T.pieces).size, 6); assert.ok(T.pieces.every((p) => p.length > 200 && p.length < 420), 'each bundle a short read');
  assert.ok(T.ending.length > 300 && T.ending.length < 650); assert.ok(!/corridor/i.test(T.pieces.join(' ') + T.ending), 'never names what the Corridor is');
  assert.ok(!/elder|wanderer|listener/i.test(T.pieces.join(' ') + T.ending), 'never points at a named thing');
  assert.match(T.pieces[5], /green going grey, bronze at the clasp/); assert.match(T.ending, /Nothing in the eddy is the colour of it\.$/);
  const relics = THREAD_ORDER.map((id) => THREADS[id].relic); assert.equal(new Set(relics).size, relics.length, 'every thread has its own relic');
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /case "bundle"/);
  const bible = readFileSync(new URL('../docs/narrative-bible.md', import.meta.url), 'utf8'); assert.ok(bible.includes(T.title)); assert.match(bible, /Story version 6/);
  assert.deepEqual(ARCANA_REGIONS.sets[ID], { toward: 'se', from: 12, to: 30 });
  assert.ok(THREAD_ORDER.indexOf(ID) < THREAD_ORDER.indexOf('tallSlates'), 'listed before the far threads');
  assert.deepEqual(TRAIL_IDS, [ID]); assert.equal(THREAD_TRAILS[ID].radius, 40); assert.deepEqual(THREAD_GIFTS[ID].marks, 40);
});

test('story version 6 is the gate: the budget stays 0.12, and crossings pinned at 0 to 5 roll exactly as with the Washing never written', () => {
  assert.ok(STORY_BUDGET.version >= V); assert.equal(STORY_BUDGET.byVersion[V], .12); assert.equal(budgetFor(V), .12); assert.equal(storyVersionFor(false), STORY_BUDGET.version); // story version 7 (every offered goal can be completed) adds an entry assert.equal(storyVersionFor(true), 0);
  const sample = []; for (const d of DISTANCES) sample.push(...ring(d, 2400, 'g'));
  const now = sample.map(([seed, id]) => [0, 1, 2, 3, 4, 5].map((v) => [0, 1, 2].map((r) => threadIn(seed, id, v, r))));
  const was = without(() => sample.map(([seed, id]) => [0, 1, 2, 3, 4, 5].map((v) => [0, 1, 2].map((r) => threadIn(seed, id, v, r)))));
  assert.deepEqual(now, was, 'every older version, every region version, crossing for crossing');
  assert.ok(sample.length * 18 >= 900000, `${sample.length * 18} rolls`); assert.ok(!now.flat(2).includes(ID), 'no older crossing ever offers it');
  for (let d = 3; d <= 3000; d += d < 100 ? 1 : 37) for (const v of [0, 1, 2, 3, 4, 5]) assert.equal(sharedThreads(v, d, 0).includes(ID), false);
});

test('version 6 holds a piece exactly where version 5 does; only the middle and far bands\' shared slots are re-split, and the first ten keep theirs', () => {
  let n = 0, held = 0, moved = 0, took = 0;
  for (const d of DISTANCES) for (const [seed, id, x, y] of ring(d, 4000, 's')) for (const r of [0, 1, 2]) {
    n++; const v5 = threadIn(seed, id, 5, r), v6 = threadIn(seed, id, V, r); assert.equal(v6, threadIn(seed, id, V, r), 'deterministic');
    assert.equal(!!v6, !!v5, `${id}: a slot is a slot`); if (v6) held++;
    if (!inBand('middle', x, y) && !inBand('far', x, y)) { assert.equal(v6, v5, `${id}: outside its bands nothing changes`); continue; }
    if (v5 && !THREADS[v5].shared && !THREADS[v5].wave) assert.equal(v6, v5, 'a first-ten crossing holds the same thread');
    if (v6 !== v5) { moved++; assert.ok(THREADS[v5].shared && (v6 === ID || THREADS[v6].shared), 'only shared slots are re-split'); if (v6 === ID) took++; }
  }
  assert.ok(n >= 250000, `${n} crossings`); assert.ok(held > n * .1, 'the budget places pieces'); assert.ok(took > 400 && moved >= took, `${took} slots taken, ${moved} re-split`);
});

test('measured: density at version 6 is the budget in every stretch, the same count as version 5; the Washing takes a share of the middle and far bands, likelier at home', () => {
  for (const [lo, hi] of [[3, 6], [7, 18], [19, 35], [36, 70], [995, 1005]]) {
    let n = 0, h5 = 0, h6 = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(30000 / (hi - lo + 1)), 'm')) { n++; if (threadIn(seed, id, 5, 1)) h5++; if (threadIn(seed, id, V, 1)) h6++; }
    assert.equal(h6, h5, `${lo}-${hi}: the same slots`); assert.ok(Math.abs(h6 / n - .12) < .01, `${lo}-${hi}: ${(h6 / n).toFixed(4)}`);
  }
  // Inside the middle band (7 to 35 walked): its share of every crossing, at home (south-east, 12 to 30 straight-line) and away.
  let home = 0, homeN = 0, away = 0, awayN = 0;
  for (let d = 7; d <= 35; d++) for (const [seed, id, x, y] of ring(d, 4000, 'h')) { const t = threadIn(seed, id, V, 1) === ID; if (inArcanaHome(ID, x, y, IDENTITY_FRAME)) { homeN++; if (t) home++; } else { awayN++; if (t) away++; } }
  const at = home / homeN, off = away / awayN; assert.ok(at > .02 && at < .05, `at home ${at.toFixed(4)}`); assert.ok(off > .004 && off < .014, `away ${off.toFixed(4)}`); assert.ok(at > 2.4 * off, 'likelier at home');
  for (const d of [3, 6, 71, 150, 1200]) for (const [seed, id] of ring(d, 3000, 'o')) assert.notEqual(threadIn(seed, id, V, 1), ID, `never ${d} out`);
  assert.equal(sharedRate(20, 0, V), sharedRate(20, 0, 5), 'the shared roll keeps its chance');
});

// A journey on new ground: an ordinary crossing that holds the Washing's first bundle, near the middle of its home.
function firstCrossing(s, cx = 14, cy = 10) { const p = nearestTrailCrossing(s, ID, cx, cy, 30); assert.ok(p, 'a crossing holds it'); return p; }
const enter = (s, p) => { s.session.activeDungeonId = p.dungeon; s.session.dungeonReturn = { rx: p.rx, ry: p.ry, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); return g; };
const readIn = (g) => { const o = g.map.objects.find((q) => q.kind === 'threadRelic' && q.state === 'waiting'); assert.ok(o, 'laid in the crossing'); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y }); return { o, r: g.interact('read', o.id) }; };

for (const mode of ['classic', 'exploration']) test(`in the game (${mode}): the first bundle takes it up and points the compass; each crossing pointed at holds the next; the end writes the Journal and the Tome and pays once`, () => {
  const s = freshSave(); s.seed = `SALLOWBY-${mode}`; if (mode === 'exploration') startJourney(s, {}); else startJourney(s, { mode: 0 }); useJourneyFrame(s); // the journey in play, as threadIn reads its frame
  assert.equal(trailBegun(s, ID), false); assert.equal(trailPlace(s, ID), null); assert.equal(compassFollowTarget(s, { kind: 'quest', id: trailFollowId(ID) }), null, 'nothing to follow before it is begun');
  const leadsBefore = questLeadCount(s), marks = s.currency;
  let p = firstCrossing(s), g = enter(s, p);
  assert.equal(s.consequences.dungeons[p.dungeon].storyVersion, STORY_BUDGET.version, 'a new crossing pins to the current version (6 or later)');
  let { o, r } = readIn(g); assert.ok(r.ok && r.first && !r.done, g.message); assert.equal(o.thread, ID); assert.equal(o.index, 0);
  assert.deepEqual(s.guidance.follow, { kind: 'quest', id: trailFollowId(ID) }, 'taking it up chooses it for the compass');
  assert.ok(g.questNotices.some((q) => q.title === 'DOWNSTREAM')); assert.ok(s.narrative.journal.some((j) => j.recordId === 'thread:washing:0'));
  assert.equal(questLeadCount(s), leadsBefore + 1, 'a quest in progress is a lead');
  for (let i = 1; i < T.pieces.length; i++) {
    const at = trailPlace(s, ID); assert.ok(at && at.dungeon, `bundle ${i + 1}: a crossing to point at`); assert.equal(s.lore.trails[ID].n, i);
    const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.guidance.follow, s.guidance.follow, 'the follow survives a reload'); assert.deepEqual(trailPlace(back, ID), at, 'the needle does not move across a reload');
    assert.deepEqual(compassFollowTarget(s, s.guidance.follow), { area: 'overworld', rx: at.rx, ry: at.ry, kind: 'guidance', name: T.title });
    const row = trailLeads(s)[0]; assert.equal(row.title, T.title); assert.deepEqual(row.at, { rx: at.rx, ry: at.ry }); assert.deepEqual(row.follow, s.guidance.follow); assert.match(row.detail, new RegExp(`${i} of 6 bundles`));
    assert.equal(crossingAt(s, at.rx, at.ry), at.dungeon, 'an ordinary crossing not yet entered');
    g = enter(s, at); assert.equal(s.consequences.dungeons[at.dungeon].storyVersion, STORY_BUDGET.version); ({ o, r } = readIn(g));
    assert.equal(o.index, i, 'the next bundle, in order'); assert.ok(r.ok && r.first); assert.equal(r.done, i === T.pieces.length - 1);
  }
  assert.ok(threadsDone(s).includes(ID) && threadsStarted(s).includes(ID)); assert.equal(threadFound(s, ID).length, 6);
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'thread:washing:end' && j.text === T.ending), 'the ending in the Journal');
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'thread-gift:washing')); assert.equal(s.currency, marks + 40, '40 marks, once');
  assert.ok(g.questNotices.some((q) => q.title === 'QUEST COMPLETE') && g.questNotices.some((q) => q.title === 'ARCANA' && /40 marks/.test(q.detail)));
  assert.deepEqual(settleThreadGifts(s), [], 'never paid twice'); g.settleArcana(); assert.equal(s.currency, marks + 40);
  assert.deepEqual(s.lore.threadGifts, { washing: true }); assert.equal(s.lore.arcanaClaimed?.washing, undefined, 'no ability, nothing claimed');
  assert.equal(trailBegun(s, ID), false); assert.equal(trailPlace(s, ID), null); assert.equal(compassFollowTarget(s, s.guidance.follow), null, 'nothing left to follow'); assert.equal(questLeadCount(s), leadsBefore);
  const row = arcanaProgress(s).find((q) => q.id === ID); assert.ok(row.complete && row.found === 6, 'the Arcana card is whole');
  const tome = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(tome, /for\(const id of threadsStarted\(save\)\)/, 'the Tome keeps every thread begun as a book');
});

test('the needle moves only when the crossing pointed at is entered without the bundle, or a bundle is read; with none near it points home', () => {
  const s = freshSave(); s.seed = 'SALLOWBY-STALE'; startJourney(s, { mode: 0 }); useJourneyFrame(s);
  const p = firstCrossing(s); s.consequences.dungeons[p.dungeon] = { storyVersion: V, regionVersion: regionVersionFor(false, true, saveStart(s)) };
  readThreadRelic(s, addThreadRelic(dmap(), s, p.dungeon)); assert.equal(trailBegun(s, ID), true);
  const a = trailPlace(s, ID); assert.ok(a.dungeon); assert.deepEqual(trailPlace(s, ID), a, 'kept');
  // nothing else moves it: other crossings entered, time passing
  s.consequences.dungeons['dungeon:SALLOWBY-STALE:g1:1:1:elsewhere'] = { visits: 2 }; assert.deepEqual(trailPlace(s, ID), a);
  // entered without it (its map had no room): the next is found, never the same
  s.consequences.dungeons[a.dungeon] = { storyVersion: V, visits: 1, generatorVersion: 5 }; const b = trailPlace(s, ID); assert.ok(b.dungeon && b.dungeon !== a.dungeon);
  // the stored record is checked, not trusted: a damaged one is searched again
  s.lore.trails[ID] = { n: 99, rx: 0, ry: 0, dungeon: a.dungeon }; assert.deepEqual(trailPlace(s, ID), b);
  // no crossing inside the window: the home's nearest edge, in the journey's frame
  s.lore.trails[ID] = { n: 1, none: true }; const h = trailPlace(s, ID); assert.ok(h.home); assert.ok(Math.hypot(h.rx, h.ry) >= 11 && Math.hypot(h.rx, h.ry) <= 13, JSON.stringify(h));
  assert.ok(inArcanaHome(ID, h.rx + Math.sign(h.rx), h.ry + Math.sign(h.ry), saveFrame(s)), 'just inside its home');
  assert.match(trailLeads(s)[0].detail, new RegExp(arcanaHint(ID, saveFrame(s))));
  // the search is bounded and deterministic, and only ever names a crossing that holds the thread when first entered
  for (const [cx, cy] of [[14, 10], [-20, 4], [5, 25], [30, -2]]) { const q = nearestTrailCrossing(s, ID, cx, cy); assert.deepEqual(nearestTrailCrossing(s, ID, cx, cy), q);
    if (q) { assert.ok(Math.max(Math.abs(q.rx - cx), Math.abs(q.ry - cy)) <= THREAD_TRAILS[ID].radius); assert.equal(threadIn(s.seed, q.dungeon, V, regionVersionFor(false, true, saveStart(s))), ID); } }
  // standing in the section: the crossing's own door
  const here = { rx: b.rx, ry: b.ry, objects: [{ kind: 'dungeon', landmark: true, id: b.dungeon.split(':').pop(), x: 9, y: 21 }] };
  s.lore.trails[ID] = { n: 1, rx: b.rx, ry: b.ry, dungeon: b.dungeon }; assert.deepEqual(trailTarget(s, ID, here), { area: 'overworld', rx: b.rx, ry: b.ry, kind: 'guidance', name: T.title, x: 9, y: 21 });
});

test('save: trails and gifts are additive at schema 14, normalised in freshSave and migrateSave, unknown ids kept; the follow id is validated', () => {
  const s = freshSave(); assert.equal(s.version, 14); assert.equal(s.lore.trails, undefined); assert.equal(s.lore.threadGifts, undefined, 'created only on first use');
  const raw = JSON.parse(JSON.stringify(s)); raw.lore.trails = { washing: { n: '2', rx: 4, ry: 9, dungeon: 'dungeon:X:g1:4:9:dungeon-g1-4-9-1', extra: 'kept' }, future: { anything: [1] }, junk: 5 };
  raw.lore.threadGifts = { washing: true, future: true, bad: 'yes' }; raw.someday = { kept: true };
  const m = migrateSave(raw);
  assert.deepEqual(m.lore.trails, { washing: { n: 2, rx: 4, ry: 9, dungeon: 'dungeon:X:g1:4:9:dungeon-g1-4-9-1', extra: 'kept' }, future: { anything: [1] }, junk: 5 });
  assert.deepEqual(m.lore.threadGifts, { washing: true, future: true }); assert.deepEqual(m.someday, { kept: true }); assert.equal(m.version, 14);
  for (const bad of [{ n: 1, rx: 1.5, ry: 2, dungeon: 'dungeon:X:g1:1:2:a' }, { n: 1, rx: 1, ry: 2, dungeon: 'arena:x' }, 'text', null]) { const q = migrateSave({ ...JSON.parse(JSON.stringify(s)), lore: { ...s.lore, trails: { washing: bad } } }); assert.deepEqual(q.lore.trails, {}, JSON.stringify(bad)); }
  assert.deepEqual(migrateSave({ ...JSON.parse(JSON.stringify(s)), lore: { ...s.lore, trails: { washing: { n: 3, none: true } } } }).lore.trails, { washing: { n: 3, none: true } });
  const odd = freshSave(); odd.lore.trails = 'x'; odd.lore.threadGifts = [1]; ensureThreadTrails(odd); assert.deepEqual(odd.lore.trails, {}); assert.deepEqual(odd.lore.threadGifts, {});
  assert.deepEqual(normalizeCompassFollow({ kind: 'quest', id: 'thread:washing' }), { kind: 'quest', id: 'thread:washing' });
  for (const id of ['thread:', 'thread:../x', 'thread:a b']) assert.equal(normalizeCompassFollow({ kind: 'quest', id }), null, id);
  assert.equal(trailOfFollow('thread:washing'), ID); assert.equal(trailOfFollow('thread:lamplighter'), null, 'only threads with a trail'); assert.equal(compassFollowTarget(s, { kind: 'quest', id: 'thread:lamplighter' }), null);
  const k = freshSave(); setCompassChoice(k, { follow: { kind: 'quest', id: 'thread:washing' } }); assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(k))).guidance.follow, { kind: 'quest', id: 'thread:washing' });
});

test('leads: travellers name it and its home until its first bundle is found, in both modes; then it is a quest the compass can follow', () => {
  for (const mode of [0, 1]) {
    const s = freshSave(); s.seed = `SALLOWBY-LEADS-${mode}`; startJourney(s, mode ? {} : { mode: 0 }); useJourneyFrame(s);
    let r = null; for (let i = 0; i < 6 && (!r || r.kind !== 'washing'); i++) { r = nextRumour(s); assert.ok(r, 'a rumour to tell'); if (r.kind !== 'washing') recordRumour(s, r, 'test'); }
    assert.equal(r.kind, 'washing'); assert.equal(r.id, 'arcana:washing'); assert.ok(r.text.includes(arcanaHint(ID, saveFrame(s))), r.text); assert.equal(r.name, 'Washing in the crossings');
    assert.ok(Number.isInteger(r.rx) && Number.isInteger(r.ry)); recordRumour(s, r, 'test'); assert.ok(rumourLive(s, r));
    const p = firstCrossing(s); s.consequences.dungeons[p.dungeon] = { storyVersion: V, regionVersion: regionVersionFor(false, true, saveStart(s)) };
    const o = addThreadRelic(dmap(), s, p.dungeon); assert.equal(o?.thread, ID); readThreadRelic(s, o);
    assert.equal(rumourLive(s, r), false, 'heard and found: the rumour gives way to the quest'); assert.equal(trailLeads(s).length, 1);
    assert.notEqual(nextRumour(s)?.kind, 'washing', 'not told again');
  }
});

test('build lists carry the new module', () => {
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'thread-trails'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/thread-trails\.js\?v=/);
});
