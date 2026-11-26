// The Turves of Scarrow Moss (2026-11-26, the daily narrative pass; docs/narrative-bible.md section 6 items 5 and 6, story
// version 8). A far-band thread in the shared roll, home north-west: it splits the slots of crossings first entered from story
// version 8 and adds none, so every crossing pinned before offers exactly what it did and the density is unchanged. Once its first
// turf is read the compass follows it to the crossing that holds the next (thread-trails.ts); its end writes the Journal and the
// Tome and leaves 40 marks (threads.ts THREAD_GIFTS), no ability. Every step resolves to a real crossing the Wayfarer can enter:
// walked from start to finish in the game in both modes, and on many seeds from rumour to gift.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, normalizeCompassFollow } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { THREADS, THREAD_ORDER, THREAD_BANDS, THREAD_TRAILS, THREAD_GIFTS, THREAD_CERTAIN, STORY_BUDGET, budgetFor, threadIn, inBand, sharedThreads, sharedRate, threadPays, threadEligible, readThreadRelic, threadFound, threadsDone, settleThreadGifts, arcanaProgress } from '../src/threads.ts';
import { ARCANA_REGIONS, arcanaHint, arcanaToward, inArcanaHome } from '../src/lore.ts';
import { saveFrame, IDENTITY_FRAME, useJourneyFrame } from '../src/journey-start.ts';
import { startJourney } from '../src/progression.ts';
import { trailBegun, trailPlace, trailLeads, trailFollowId, trailOfFollow, nearestTrailCrossing, settleCrossingThread, TRAIL_IDS } from '../src/thread-trails.ts';
import { compassFollowTarget } from '../src/atlas-view.ts';
import { nextRumour, recordRumour, rumourLive, questLeadCount, RUMOURS, RUMOUR_ORDER } from '../src/leads.ts';
import { crossingAt } from '../src/quest-places.ts';
import { regionSettled } from '../src/world.ts';

const ID = 'turves', T = THREADS[ID], V = 8;
const floorMap = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
// Crossings on the ring `d` sections walked out, spread round it, over several seeds.
const ring = (d, n, tag = 't') => Array.from({ length: n }, (_, i) => { const seed = `MOSS${i % 9}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`, x, y]; });
const DISTANCES = [3, 7, 12, 18, 19, 24, 30, 35, 36, 48, 60, 70, 71, 90, 150, 1000, 1500];
// threadIn as it would be with the Turves never written (the pools read THREAD_ORDER as they roll).
function without(fn) { const t = THREADS[ID], at = THREAD_ORDER.indexOf(ID); delete THREADS[ID]; THREAD_ORDER.splice(at, 1); try { return fn(); } finally { THREADS[ID] = t; THREAD_ORDER.splice(at, 0, ID); } }
// The middle of the thread's home on this journey (its frame turns the homes on a start-1 journey).
function homeMid(s) { const h = ARCANA_REGIONS.sets[ID], a = (ARCANA_REGIONS.headings[arcanaToward(ID, saveFrame(s))] * Math.PI) / 180, d = (h.from + h.to) / 2; return { rx: Math.round(Math.cos(a) * d), ry: Math.round(-Math.sin(a) * d) }; }
// Entering a crossing for the first time, as game.ts does: pinned, dressed, and visited.
const enter = (s, id) => { pinDungeonLayout(s, id); const held = settleCrossingThread(floorMap(), s, id); s.consequences.dungeons[id].visits = 1; return held; };
const journey = (seed, mode = 1) => { const s = freshSave(); s.seed = seed; startJourney(s, mode ? {} : { mode: 0 }); useJourneyFrame(s); return s; };

test('written in full, never a wave: six turves in order, an ending, its own relic drawn, a home north-west inside its band, in the bible', () => {
  assert.equal(T.title, 'The Turves of Scarrow Moss'); assert.equal(T.band, 'far'); assert.ok(!T.wave && !T.layer, 'never a wave');
  assert.deepEqual(T.shared, { 8: ['far'] }); assert.equal(T.relic, 'turf'); assert.match(T.colour, /^#[0-9a-f]{6}$/i);
  assert.equal(T.pieces.length, 6); assert.equal(new Set(T.pieces).size, 6); assert.ok(T.pieces.every((p) => p.length > 200 && p.length < 420), 'each turf a short read');
  assert.ok(T.ending.length > 300 && T.ending.length < 650);
  const all = T.pieces.join(' ') + ' ' + T.ending;
  assert.ok(!/corridor|density|remember/i.test(all), 'never says what it shows'); assert.ok(!/elder|wanderer|listener|wayfarer/i.test(all), 'never points at a named thing');
  // no repeated lines: no sentence of it appears in any other thread
  const others = THREAD_ORDER.filter((id) => id !== ID).map((id) => [...THREADS[id].pieces, THREADS[id].ending].join(' ')).join(' ');
  for (const sentence of all.split(/(?<=[.!?]["]?)\s+/).filter((x) => x.length > 24)) assert.ok(!others.includes(sentence), sentence);
  assert.match(T.pieces[5], /a child's bare feet, and a dog's beside them/); assert.match(T.ending, /a long way from any fire\.$/);
  const relics = THREAD_ORDER.map((id) => THREADS[id].relic); assert.equal(new Set(relics).size, relics.length, 'every thread has its own relic');
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /case "turf"/);
  const bible = readFileSync(new URL('../docs/narrative-bible.md', import.meta.url), 'utf8'); assert.ok(bible.includes(T.title)); assert.match(bible, /Story version 8/);
  assert.deepEqual(ARCANA_REGIONS.sets[ID], { toward: 'nw', from: 22, to: 48 });
  // the whole home lies inside the far band, measured as it is (sections walked), even on the diagonal
  for (let x = -60; x <= 60; x++) for (let y = -60; y <= 60; y++) if (inArcanaHome(ID, x, y, IDENTITY_FRAME)) assert.ok(inBand('far', x, y), `${x},${y} is in the far band`);
  assert.ok(THREAD_ORDER.indexOf(ID) > THREAD_ORDER.indexOf('washing') && THREAD_ORDER.indexOf(ID) < THREAD_ORDER.indexOf('tallSlates'), 'listed after the Washing, before the far threads');
  assert.ok(TRAIL_IDS.includes(ID)); assert.equal(THREAD_TRAILS[ID].radius, 40); assert.equal(THREAD_TRAILS[ID].unit, 'turves');
  assert.equal(THREAD_GIFTS[ID].marks, THREAD_GIFTS.washing.marks, "the Washing's gift: no new economy"); assert.ok(threadPays(freshSave(), ID), 'it pays, so a begun journey is never stranded (THREAD_CERTAIN)');
  assert.ok(RUMOUR_ORDER.includes(ID) && RUMOURS[ID].set === ID && !RUMOURS[ID].passive, 'a rumour names it, and no passive');
});

test('story version 8 is the gate: the budget stays 0.12, and crossings pinned at 0 to 7 roll exactly as with the Turves never written', () => {
  assert.equal(STORY_BUDGET.version, V); assert.equal(STORY_BUDGET.byVersion[V], .12); assert.equal(budgetFor(V), .12); assert.equal(THREAD_CERTAIN.storyVersion, 7);
  const sample = []; for (const d of DISTANCES) sample.push(...ring(d, 1600, 'g'));
  const vs = [0, 1, 2, 3, 4, 5, 6, 7], now = sample.map(([seed, id]) => vs.map((v) => [0, 1, 2].map((r) => threadIn(seed, id, v, r))));
  const was = without(() => sample.map(([seed, id]) => vs.map((v) => [0, 1, 2].map((r) => threadIn(seed, id, v, r)))));
  assert.deepEqual(now, was, 'every older version, every region version, crossing for crossing');
  assert.ok(sample.length * 24 >= 600000, `${sample.length * 24} rolls`); assert.ok(!now.flat(2).includes(ID), 'no older crossing ever offers it');
  for (let d = 3; d <= 3000; d += d < 100 ? 1 : 37) for (const v of vs) assert.equal(sharedThreads(v, d, 0).includes(ID), false);
});

test('version 8 holds a piece exactly where version 7 does; only the far band\'s shared slots are re-split, and the first ten keep theirs', () => {
  let n = 0, held = 0, moved = 0, took = 0;
  for (const d of DISTANCES) for (const [seed, id, x, y] of ring(d, 3000, 's')) for (const r of [0, 1, 2]) {
    n++; const v7 = threadIn(seed, id, 7, r), v8 = threadIn(seed, id, V, r); assert.equal(v8, threadIn(seed, id, V, r), 'deterministic');
    assert.equal(!!v8, !!v7, `${id}: a slot is a slot`); if (v8) held++;
    if (!inBand('far', x, y)) { assert.equal(v8, v7, `${id}: outside the far band nothing changes`); continue; }
    if (v7 && !THREADS[v7].shared && !THREADS[v7].wave) assert.equal(v8, v7, 'a first-ten crossing holds the same thread');
    if (v8 !== v7) { moved++; assert.ok(THREADS[v7].shared && (v8 === ID || THREADS[v8].shared), 'only shared slots are re-split'); if (v8 === ID) took++; }
  }
  assert.ok(n >= 150000, `${n} crossings`); assert.ok(held > n * .1, 'the budget places pieces'); assert.ok(took > 300 && moved >= took, `${took} slots taken, ${moved} re-split`);
});

test('measured: density at version 8 is the budget in every stretch, the same count as version 7; the Turves take a share of the far band, likelier at home', () => {
  for (const [lo, hi] of [[3, 6], [7, 18], [19, 35], [36, 70], [71, 150], [995, 1005]]) {
    let n = 0, h7 = 0, h8 = 0; for (let d = lo; d <= hi; d++) for (const [seed, id] of ring(d, Math.ceil(24000 / (hi - lo + 1)), 'm')) { n++; if (threadIn(seed, id, 7, 1)) h7++; if (threadIn(seed, id, V, 1)) h8++; }
    assert.equal(h8, h7, `${lo}-${hi}: the same slots`); assert.ok(Math.abs(h8 / n - .12) < .01, `${lo}-${hi}: ${(h8 / n).toFixed(4)}`);
  }
  let home = 0, homeN = 0, away = 0, awayN = 0;
  for (let d = 19; d <= 70; d++) for (const [seed, id, x, y] of ring(d, 3000, 'h')) { const t = threadIn(seed, id, V, 1) === ID; if (inArcanaHome(ID, x, y, IDENTITY_FRAME)) { homeN++; if (t) home++; } else { awayN++; if (t) away++; } }
  const at = home / homeN, off = away / awayN; assert.ok(at > .015 && at < .05, `at home ${at.toFixed(4)}`); assert.ok(off > .002 && off < .012, `away ${off.toFixed(4)}`); assert.ok(at > 2.4 * off, 'likelier at home');
  for (const d of [3, 10, 18, 71, 150, 1200]) for (const [seed, id] of ring(d, 3000, 'o')) assert.notEqual(threadIn(seed, id, V, 1), ID, `never ${d} out`);
  assert.equal(sharedRate(30, 0, V), sharedRate(30, 0, 7), 'the shared roll keeps its chance');
});

// ------------------------------------------------------------------------------- walked in the game, start to finish
const enterGame = (s, p) => { s.session.activeDungeonId = p.dungeon; s.session.dungeonReturn = { rx: p.rx, ry: p.ry, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); return g; };
const readIn = (g) => { const o = g.map.objects.find((q) => q.kind === 'threadRelic' && q.state === 'waiting'); assert.ok(o, 'laid in the crossing'); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y }); return { o, r: g.interact('read', o.id) }; };

for (const mode of [0, 1]) test(`in the game (${mode ? 'exploration' : 'classic'}): the first turf takes it up and points the compass; each crossing pointed at holds the next; the end writes the Journal and the Tome and pays once`, () => {
  const s = journey(`SCARROW-${mode}`, mode);
  assert.equal(trailBegun(s, ID), false); assert.equal(trailPlace(s, ID), null); assert.deepEqual(trailLeads(s), []);
  assert.equal(compassFollowTarget(s, { kind: 'quest', id: trailFollowId(ID) }), null, 'never pointed at before it is taken up');
  const leadsBefore = questLeadCount(s), marks = s.currency, m = homeMid(s);
  const p = nearestTrailCrossing(s, ID, m.rx, m.ry); assert.ok(p, 'a crossing near its home holds the first turf');
  let g = enterGame(s, p); assert.equal(s.consequences.dungeons[p.dungeon].storyVersion, V, 'a new crossing pins to version 8');
  let { o, r } = readIn(g); assert.ok(r.ok && r.first && !r.done, g.message); assert.equal(o.thread, ID); assert.equal(o.index, 0);
  assert.deepEqual(s.guidance.follow, { kind: 'quest', id: trailFollowId(ID) }, 'taking it up chooses it for the compass');
  assert.ok(g.questNotices.some((q) => q.title === 'OFF THE MOSS')); assert.ok(s.narrative.journal.some((j) => j.recordId === 'thread:turves:0'));
  assert.equal(questLeadCount(s), leadsBefore + 1, 'a quest in progress is a lead');
  for (let i = 1; i < T.pieces.length; i++) {
    const at = trailPlace(s, ID); assert.ok(at && at.dungeon, `turf ${i + 1}: a crossing to point at`);
    assert.equal(crossingAt(s, at.rx, at.ry), at.dungeon, 'an ordinary crossing not yet entered'); assert.ok(!regionSettled(at.rx, at.ry, s.seed), 'never a town');
    assert.deepEqual(trailPlace(migrateSave(JSON.parse(JSON.stringify(s))), ID), at, 'the needle does not move across a reload');
    assert.deepEqual(compassFollowTarget(s, s.guidance.follow), { area: 'overworld', rx: at.rx, ry: at.ry, kind: 'guidance', name: T.title });
    const row = trailLeads(s).find((q) => q.title === T.title); assert.match(row.detail, new RegExp(`^Hester Mayne's turves, carried off the moss: ${i} of 6 turves found`));
    g = enterGame(s, at); ({ o, r } = readIn(g)); assert.equal(o.index, i, 'the next turf, in order'); assert.ok(r.ok && r.first); assert.equal(r.done, i === T.pieces.length - 1);
  }
  assert.ok(threadsDone(s).includes(ID)); assert.equal(threadFound(s, ID).length, 6);
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'thread:turves:end' && j.text === T.ending), 'the ending in the Journal');
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'thread-gift:turves')); assert.equal(s.currency, marks + 40, '40 marks, once');
  assert.deepEqual(settleThreadGifts(s), [], 'never paid twice'); g.settleArcana(); assert.equal(s.currency, marks + 40);
  assert.equal(s.lore.threadGifts.turves, true); assert.equal(s.lore.arcanaClaimed?.turves, undefined, 'no ability, nothing claimed');
  assert.equal(trailBegun(s, ID), false); assert.equal(compassFollowTarget(s, s.guidance.follow), null, 'nothing left to follow'); assert.equal(questLeadCount(s), leadsBefore);
  assert.ok(arcanaProgress(s).find((q) => q.id === ID).complete, 'the Arcana card is whole');
  assert.match(readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), /for\(const id of threadsStarted\(save\)\)/, 'the Tome keeps every thread begun as a book');
});

// On many worlds, from the rumour to the gift: a player who hears it, goes to the home, and then follows only the compass (or,
// where it points only at the home, wanders the crossings round there). Every step is a real crossing entered; none is lost.
test('every step resolves to a real crossing: 24 worlds, both modes, walked from the rumour to the gift', () => {
  let pointed = 0, wandered = 0, gaps = [], farthest = 0;
  for (let k = 0; k < 24; k++) {
    const s = journey(`MOSSWALK${k}`, k % 2), m = homeMid(s);
    let r = null; for (let i = 0; i < 8 && (!r || r.kind !== ID); i++) { r = nextRumour(s); assert.ok(r, 'a rumour to tell'); if (r.kind !== ID) recordRumour(s, r, 'test'); }
    assert.equal(r.kind, ID, 'a traveller names it'); assert.ok(r.text.includes(arcanaHint(ID, saveFrame(s))), r.text); recordRumour(s, r, 'test');
    const first = nearestTrailCrossing(s, ID, r.rx, r.ry) || nearestTrailCrossing(s, ID, m.rx, m.ry); assert.ok(first, `world ${k}: a first turf near where the rumour points`);
    assert.equal(enter(s, first.dungeon), ID); readThreadRelic(s, { thread: ID, dungeonId: first.dungeon }); assert.equal(rumourLive(s, r), false, 'the rumour gives way to the quest');
    let last = first;
    while (!threadsDone(s).includes(ID)) {
      const at = trailPlace(s, ID); assert.ok(at, `world ${k}: always somewhere to go`);
      if (at.dungeon) {
        assert.equal(crossingAt(s, at.rx, at.ry), at.dungeon, 'an ordinary crossing not yet entered');
        assert.equal(enter(s, at.dungeon), ID, `world ${k}: the crossing pointed at holds the turf`); pointed++;
        gaps.push(Math.min(Math.max(Math.abs(at.rx - last.rx), Math.abs(at.ry - last.ry)), Math.max(Math.abs(at.rx - m.rx), Math.abs(at.ry - m.ry)))); last = at; farthest = Math.max(farthest, Math.abs(at.rx) + Math.abs(at.ry));
        readThreadRelic(s, { thread: ID, dungeonId: at.dungeon }); continue;
      }
      // only the home is known: wander its crossings, nearest first, until one holds the turf (THREAD_CERTAIN makes it sure)
      assert.ok(at.home); let found = null, n = 0;
      for (let d = 0; d <= 30 && !found; d++) for (let dy = -d; dy <= d && !found; dy++) for (let dx = -d; dx <= d && !found; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue; const x = at.rx + dx, y = at.ry + dy, id = crossingAt(s, x, y); if (!id || regionSettled(x, y, s.seed)) continue;
        n++; if (enter(s, id) === ID) { found = id; last = { rx: x, ry: y }; }
      }
      assert.ok(found && n <= 120, `world ${k}: wandering the home finds it (${n} crossings)`); wandered++; readThreadRelic(s, { thread: ID, dungeonId: found });
    }
    assert.deepEqual(settleThreadGifts(s), [ID], 'the gift, once'); assert.deepEqual(settleThreadGifts(s), []);
  }
  console.log(`turves: ${pointed} pointed, ${wandered} by wandering; steps ${gaps.sort((x, y) => x - y)[gaps.length >> 1]} median, ${Math.max(...gaps)} most; farthest ${farthest} walked`);
  assert.ok(pointed >= 24 * 5 * .8, `${pointed} turves found where the compass pointed, ${wandered} by wandering the home`);
  assert.ok(Math.max(...gaps) <= THREAD_TRAILS[ID].radius, `each next turf within the search window round the last one or the home's middle (largest ${Math.max(...gaps)})`);
  assert.ok(farthest <= THREAD_BANDS.far[1], `never past the far band (${farthest} walked)`);
});

test('save and compass: the trail is additive at schema 14, normalised, survives a reload; the follow id is valid only for a trail', () => {
  const s = journey('SCARROW-SAVE'), m = homeMid(s), p = nearestTrailCrossing(s, ID, m.rx, m.ry);
  enter(s, p.dungeon); readThreadRelic(s, { thread: ID, dungeonId: p.dungeon }); const at = trailPlace(s, ID);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.version, 14); assert.deepEqual(back.lore.trails[ID], s.lore.trails[ID]); assert.deepEqual(trailPlace(back, ID), at);
  const raw = JSON.parse(JSON.stringify(freshSave())); raw.lore.trails = { turves: { n: '1', rx: 3, ry: -30, dungeon: 'dungeon:X:g1:3:-30:a', extra: 'kept' }, future: 1 };
  assert.deepEqual(migrateSave(raw).lore.trails, { turves: { n: 1, rx: 3, ry: -30, dungeon: 'dungeon:X:g1:3:-30:a', extra: 'kept' }, future: 1 });
  assert.deepEqual(normalizeCompassFollow({ kind: 'quest', id: 'thread:turves' }), { kind: 'quest', id: 'thread:turves' }); assert.equal(trailOfFollow('thread:turves'), ID);
  // eligibility for the certain next piece (story version 7's rule) reads the far band only
  assert.equal(threadEligible(ID, -20, -20, V), true); assert.equal(threadEligible(ID, -5, -5, V), false); assert.equal(threadEligible(ID, -60, -60, V), false);
});
