// The Second Wayfarer (docs/narrative-bible.md section 4, recurring character 4; section 6, item 9): footprints in a crossing first
// entered from story version 5 begin a trail of six sightings on the overworld, each a few sections farther out, where someone
// dressed as you was seen at a distance and left something behind. Story version 5 changes no thread roll; the footprints lie only
// where no thread piece does; the trail is fixed per seed, kept in the save, read in order and followed by the compass once taken up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, normalizeCompassFollow, setCompassChoice } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { STORY_BUDGET, threadIn, storyVersionFor } from '../src/threads.ts';
import { compassFollowTarget } from '../src/atlas-view.ts';
import { SECOND_WAYFARER, SECOND_TRACES, SECOND_SIGHTINGS, SECOND_ENDING, SECOND_LAST_WORDS, SECOND_HAND, SECOND_PASSED_LAST, secondFootprintsIn, secondSightingAfter, addSecondFootprints, readSecondFootprints, addSecondTrace, readSecondTrace, secondNext, secondFound, secondDone, secondBegun, ensureSecondWayfarer, secondWayfarerTarget, secondTraceText } from '../src/second-wayfarer.ts';

const dmap = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
const omap = (sea = false) => ({ width: 32, height: 32, objects: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: sea ? 'water' : 'grass', blocked: false })) });
const ring = (d, n, tag = 'sw') => Array.from({ length: n }, (_, i) => { const seed = `SECOND${i % 9}`, x = ((i * 7919) % (2 * d + 1)) - d, y = (i % 2 ? 1 : -1) * (d - Math.abs(x)); return [seed, `dungeon:${seed}:g1:${x}:${y}:dungeon-g1-${x}-${y}-${tag}${i}`, x, y]; });
const V = SECOND_WAYFARER.storyVersion;
const pinned = (s, id, v = V) => { s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, storyVersion: v, regionVersion: 1 }; };
const findFootprints = (seed, from = 12, to = 40) => { for (let d = from; d <= to; d++) for (const [s, id] of ring(d, 400, `f${seed}`)) { const sid = id.replace(/SECOND\d/g, seed); if (secondFootprintsIn(seed, sid, V, 1)) return sid; } return null; };

test('story version 5 is the gate: crossings first entered from now pin to it, and every thread roll is exactly version 4\'s', () => {
  assert.equal(STORY_BUDGET.version, V); assert.equal(STORY_BUDGET.byVersion[5], .12); assert.equal(storyVersionFor(false), V); assert.equal(storyVersionFor(true), 0);
  let n = 0, held = 0;
  for (const d of [3, 6, 12, 18, 25, 36, 70, 150, 700, 1000, 1500, 3000]) for (const [seed, id] of ring(d, 4000, 'v')) for (const r of [0, 1]) { n++; const t = threadIn(seed, id, 5, r); if (t) held++; assert.equal(t, threadIn(seed, id, 4, r), id); }
  assert.ok(n >= 90000, `${n} crossings`); assert.ok(held > n * .08, 'the budget still places pieces');
});

test('the footprints lie only in version 5 crossings 12 or more out, never where a thread piece lies, about 4 in 100 of the rest', () => {
  let n = 0, hit = 0, free = 0;
  for (const d of [2, 6, 11]) for (const [seed, id] of ring(d, 3000, 'near')) assert.equal(secondFootprintsIn(seed, id, V, 1), false, 'not near the Refuge');
  for (const d of [12, 15, 20, 30, 45, 80, 200, 1200]) for (const [seed, id] of ring(d, 5000, 'far')) {
    n++; const has = secondFootprintsIn(seed, id, V, 1), thread = threadIn(seed, id, V, 1);
    for (const v of [0, 1, 2, 3, 4]) assert.equal(secondFootprintsIn(seed, id, v, 1), false, 'never in a crossing entered before');
    if (has) { hit++; assert.equal(thread, null, `${id}: no crossing changes the thread it offers`); }
    if (!thread) free++;
  }
  const rate = hit / free; assert.ok(n === 40000 && Math.abs(rate - SECOND_WAYFARER.footprintChance) < .006, `rate ${rate} over ${free} thread-free crossings`);
  assert.equal(secondFootprintsIn('X', 'overworld:3:4', V, 1), false); assert.equal(secondFootprintsIn('X', 'dungeon:X:g1:20:0:a', V, 1), secondFootprintsIn('X', 'dungeon:X:g1:20:0:a', V, 1));
});

test('laid in a version 5 crossing until the trail begins; afterwards only the crossing it began in keeps them, read', () => {
  const seed = 'TRAILSEED', id = findFootprints(seed); assert.ok(id, 'a crossing with footprints');
  const s = freshSave(); s.seed = seed; assert.equal(s.lore.second, undefined, 'nothing saved before the trail');
  assert.equal(addSecondFootprints(dmap(), s, id), null, 'not pinned: a crossing entered before (version 0) holds none');
  pinned(s, id, 4); assert.equal(addSecondFootprints(dmap(), s, id), null, 'version 4 holds none');
  pinned(s, id); const o = addSecondFootprints(dmap(), s, id); assert.ok(o && o.state === 'waiting');
  const m = dmap(); m.objects.push(o); assert.equal(addSecondFootprints(m, s, id), null, 'once per map');
  const other = findFootprints(seed, 41, 80); pinned(s, other); assert.ok(addSecondFootprints(dmap(), s, other), 'another crossing has them too, before the trail');
  const r = readSecondFootprints(s, o); assert.ok(r.ok && r.begun); assert.match(r.message, new RegExp(`${r.next.rx}, ${r.next.ry}`));
  assert.deepEqual(secondNext(s), r.next); assert.equal(s.lore.second.begun, id);
  assert.equal(addSecondFootprints(dmap(), s, other), null, 'once begun, no other crossing offers them');
  const back = addSecondFootprints(dmap(), s, id); assert.equal(back.state, 'read'); assert.equal(readSecondFootprints(s, back).begun, false);
});

test('the trail: six sightings, each 3 to 6 sections on and outward, the same for the same seed, read in order to the ending', () => {
  const play = (seed) => {
    const id = findFootprints(seed), s = freshSave(); s.seed = seed; pinned(s, id); readSecondFootprints(s, addSecondFootprints(dmap(), s, id));
    const [, , , x0, y0] = id.split(':').map((v, i) => i >= 3 && i <= 4 ? Number(v) : v); let prev = { rx: x0, ry: y0 }; const seen = [];
    for (let i = 0; i < SECOND_WAYFARER.sightings; i++) {
      const at = secondNext(s); assert.ok(at, `sighting ${i}`); seen.push(at);
      const step = Math.hypot(at.rx - prev.rx, at.ry - prev.ry); assert.ok(step >= SECOND_WAYFARER.step.min - 1 && step <= SECOND_WAYFARER.step.max + 1, `step ${step}`);
      assert.ok(Math.hypot(at.rx, at.ry) > Math.hypot(prev.rx, prev.ry), 'outward');
      assert.equal(addSecondTrace(omap(), s, at.rx + 1, at.ry), null, 'nothing on a neighbouring section');
      const m = omap(), r = addSecondTrace(m, s, at.rx, at.ry); assert.equal(r.sighting, SECOND_SIGHTINGS[i]); assert.equal(r.object.state, 'waiting');
      assert.deepEqual(secondWayfarerTarget(s), { area: 'overworld', rx: at.rx, ry: at.ry, x: r.object.x, y: r.object.y, kind: 'guidance', name: SECOND_WAYFARER.title });
      assert.ok(r.object.x >= 2 && r.object.x <= 29 && r.object.y >= 2 && r.object.y <= 29);
      const read = readSecondTrace(s, r.object); assert.ok(read.ok && read.first); assert.equal(secondFound(s), i + 1);
      assert.equal(read.text, i < 5 ? SECOND_TRACES[i](secondNext(s)) : SECOND_TRACES[5]());
      assert.equal(readSecondTrace(s, r.object).first, false, 'read once');
      assert.equal(read.done, i === SECOND_WAYFARER.sightings - 1); if (read.done) assert.ok(read.message.endsWith(SECOND_ENDING));
      const again = addSecondTrace(omap(), s, at.rx, at.ry); assert.equal(again, null, 'a read trace lays quietly, with no sighting'); prev = at;
    }
    assert.ok(secondDone(s)); assert.equal(secondNext(s), null); assert.equal(secondWayfarerTarget(s), null);
    const m = omap(); addSecondTrace(m, s, seen[2].rx, seen[2].ry); assert.equal(m.objects[0].state, 'read', 'what was left stays, read');
    return seen;
  };
  const a = play('TRAILSEED'); assert.deepEqual(play('TRAILSEED'), a, 'deterministic per seed'); assert.notDeepEqual(play('OTHERSEED'), a);
  assert.equal(new Set(a.map((q) => `${q.rx},${q.ry}`)).size, 6, 'six distinct sections');
  for (let k = 0; k < 2000; k++) { const from = { rx: (k % 61) - 30, ry: ((k * 7) % 61) - 30 }; if (Math.abs(from.rx) + Math.abs(from.ry) < 12) continue; const n = secondSightingAfter('S' + k, from, k % 6); assert.ok(n.rx !== from.rx || n.ry !== from.ry); assert.ok(Math.hypot(n.rx, n.ry) > Math.hypot(from.rx, from.ry) - .01, 'never back toward the Refuge'); }
});

test('a sighting on open sea passes on arrival, and the trail goes on', () => {
  const seed = 'SEASEED', id = findFootprints(seed), s = freshSave(); s.seed = seed; pinned(s, id); readSecondFootprints(s, addSecondFootprints(dmap(), s, id));
  const at = secondNext(s), r = addSecondTrace(omap(true), s, at.rx, at.ry); assert.ok(r.passed && !r.object); assert.equal(secondFound(s), 1);
  assert.match(r.passed.text, new RegExp(`${secondNext(s).rx}, ${secondNext(s).ry}`)); assert.equal(secondTraceText(s, 0), r.passed.text);
  assert.deepEqual(s.lore.second.passed, [0]); assert.equal(addSecondTrace(omap(true), s, at.rx, at.ry), null, 'once');
});

test('the save: absent until begun, normalised in place by migrateSave, unknown fields kept, exact through JSON', () => {
  assert.equal(freshSave().lore.second, undefined);
  const seed = 'SAVESEED', id = findFootprints(seed), s = freshSave(); s.seed = seed; pinned(s, id); readSecondFootprints(s, addSecondFootprints(dmap(), s, id));
  const at = secondNext(s); readSecondTrace(s, addSecondTrace(omap(), s, at.rx, at.ry).object); const m = omap(); addSecondTrace(m, s, secondNext(s).rx, secondNext(s).ry);
  s.lore.second.future = { kept: true };
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.lore.second, s.lore.second); assert.deepEqual(back.lore.second.future, { kept: true });
  assert.deepEqual(secondWayfarerTarget(back), secondWayfarerTarget(s));
  const junk = freshSave(); junk.seed = 'J'; junk.lore.second = { trail: [{ rx: 20, ry: 1 }, 'x', { rx: 1.5, ry: 2 }, { rx: 24, ry: 2 }], found: 9, passed: [0, 5, 'a'], spot: { i: 0, x: 3, y: 3 }, begun: 7, other: 'kept' };
  const j = migrateSave(JSON.parse(JSON.stringify(junk))).lore.second;
  assert.deepEqual(j.trail.slice(0, 2), [{ rx: 20, ry: 1 }, { rx: 24, ry: 2 }]); assert.equal(j.found, 2); assert.equal(j.trail.length, 3, 'a trail cut short gains its next section');
  assert.deepEqual(j.passed, [0]); assert.equal(j.spot, undefined, 'a stale spot is dropped'); assert.equal(j.begun, ''); assert.equal(j.other, 'kept');
  const odd = freshSave(); odd.lore.second = null; ensureSecondWayfarer(odd); assert.deepEqual(odd.lore.second, { trail: [], found: 0, passed: [], begun: '' }); assert.equal(secondBegun(odd), false);
});

test('the compass follows the trail once it is taken up, and only then', () => {
  assert.deepEqual(normalizeCompassFollow({ kind: 'quest', id: 'second' }), { kind: 'quest', id: 'second' });
  assert.equal(normalizeCompassFollow({ kind: 'quest', id: 'nope' }), null);
  const s = freshSave(); s.seed = 'COMPASS'; assert.equal(compassFollowTarget(s, { kind: 'quest', id: 'second' }), null, 'nothing before it is begun');
  const id = findFootprints('COMPASS'); pinned(s, id); readSecondFootprints(s, addSecondFootprints(dmap(), s, id));
  setCompassChoice(s, { follow: { kind: 'quest', id: 'second' } }); const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.guidance.follow, { kind: 'quest', id: 'second' }, 'kept through a reload');
  const at = secondNext(s); assert.deepEqual(compassFollowTarget(s, back.guidance.follow), { area: 'overworld', rx: at.rx, ry: at.ry, kind: 'guidance', name: SECOND_WAYFARER.title });
  assert.deepEqual(compassFollowTarget(s, back.guidance.follow, { area: 'dungeon' }).rx, at.rx, 'shown dormant indoors, as a hunt is');
});

test('in the game: footprints read through Act begin the trail and point the compass; the sighting and the last trace write the Journal', () => {
  const seed = 'GAMESECOND', id = findFootprints(seed), [, , , x, y] = id.split(':'), s = freshSave(); s.seed = seed;
  s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: Number(x), ry: Number(y), x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); assert.equal(s.consequences.dungeons[id].storyVersion, V, 'a new crossing pins to version 5');
  const o = g.map.objects.find((q) => q.kind === 'secondFootprints'); assert.ok(o, 'laid in the crossing'); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y });
  const r = g.interact('read', o.id); assert.ok(r.ok && r.begun, g.message); assert.deepEqual(s.guidance.follow, { kind: 'quest', id: 'second' }, 'taking it up chooses it');
  assert.ok(s.narrative.journal.some((j) => j.recordId === 'second-wayfarer:footprints')); assert.ok(g.questNotices.some((q) => q.title === 'SOMEONE AHEAD'));
  // the rest of the trail, then the last sighting on a real overworld section
  for (let i = 0; i < SECOND_WAYFARER.sightings - 1; i++) { const at = secondNext(s); readSecondTrace(s, addSecondTrace(omap(), s, at.rx, at.ry).object); }
  const at = secondNext(s), g2 = new Game(s, 0); g2.rx = at.rx; g2.ry = at.ry; g2.loadArea('overworld', false);
  const t = g2.map.objects.find((q) => q.kind === 'secondTrace' && q.state === 'waiting');
  if (t) { g2.enemies = []; Object.assign(g2.player, { x: t.x, y: t.y }); const done = g2.interact('read', t.id); assert.ok(done.ok && done.done, g2.message); }
  assert.ok(secondDone(s)); assert.ok(s.narrative.journal.some((j) => j.recordId === 'second-wayfarer:end' && j.text === SECOND_ENDING));
  assert.ok(g2.questNotices.some((q) => q.title === 'QUEST COMPLETE'));
  assert.equal(compassFollowTarget(s, s.guidance.follow), null, 'a finished trail gives no needle');
});

test('wired: Journal quest and Arcana, the Tome, the renderer, and the module lists', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /add\(SECOND_WAYFARER\.title,[^;]*\{kind:"quest",id:"second"\}/); assert.match(main, /arcanaCard\(out,SECOND_WAYFARER\.title/); assert.match(main, /e\.textContent=SECOND_ENDING/);
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /o\.kind === "secondTrace"\) \{ drawSecondTrace/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'second-wayfarer'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/second-wayfarer\.js\?v=/);
  for (const text of [...SECOND_SIGHTINGS, ...SECOND_TRACES.map((f) => f({ rx: 1, ry: 2 })), SECOND_ENDING, SECOND_PASSED_LAST]) assert.doesNotMatch(text, /Corridor (is|has) (made|density)|unread/i, 'shown, never stated');
});

// Tim, 2026-11-19: the ending changes. At the last stop you find her, laid out still beside the folded suit and the gifts, under a
// note in blood in a hand that does not know what letters are. The closing line "Nobody is ahead of you now" becomes the note's
// own words, NO ONE IS AHEAD OF YOU NOW, in the Journal, the banner, the Arcana card and the Tome. Text and drawing only.
test('the ending (Tim, 2026-11-19): her body at the last stop, the note in blood, and its words as the closing line everywhere', () => {
  assert.equal(SECOND_LAST_WORDS, 'NO ONE IS AHEAD OF YOU NOW');
  assert.ok(SECOND_ENDING.endsWith(`${SECOND_LAST_WORDS}.`), 'the closing line is the note');
  const last = SECOND_TRACES[5]();
  assert.match(last, /^She is lying on her back in the grass, very still/); assert.match(last, /folded, the mask laid on top of it/); assert.match(last, /a lock of grey hair/);
  assert.match(last, /Wenna Callow\."/); assert.ok(last.endsWith(SECOND_HAND)); assert.ok(SECOND_PASSED_LAST.includes(SECOND_LAST_WORDS), 'passed at sea, the same words');
  assert.match(SECOND_HAND, /in blood/); assert.match(SECOND_HAND, /The hand is wrong/); assert.ok(SECOND_HAND.includes(`It says: ${SECOND_LAST_WORDS}.`));
  assert.doesNotMatch(last, /bare feet\./, 'she no longer simply walks home');
  for (const text of [last, SECOND_ENDING, SECOND_PASSED_LAST, ...SECOND_SIGHTINGS, ...SECOND_TRACES.slice(0, 5).map((f) => f({ rx: 1, ry: 2 }))]) {
    assert.doesNotMatch(text, /nobody is ahead/i); assert.doesNotMatch(text, /Elder|fractal|Listener|Far Array|Wanderer|Silver Key/i, 'who wrote it is never named');
    assert.doesNotMatch(text, /wound|gore|guts|torn open|entrails/i, 'restrained');
  }
  assert.match(SECOND_TRACES[4]({ rx: 1, ry: 2 }), /footprints round my fire that are not mine, bare/, 'something follows her too');
  for (const f of ['../src/game.ts', '../src/main.ts', '../src/second-wayfarer.ts']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /nobody is ahead of you/i, f);
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /title: "QUEST COMPLETE", detail: `\$\{SECOND_WAYFARER\.title\} · no one is ahead of you now`/);
  const r = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), draw = r.slice(r.indexOf('export function drawSecondTrace'), r.indexOf('export function drawSurveyorStatue'));
  for (const part of ['lying along the ground', 'the folded suit', 'the bundle', 'the flat stone at her head', 'the writing: short square strokes', 'bare prints going back']) assert.ok(draw.includes(part), part);
  // played to the end: the last stop is her, named once read; the Journal ends on the note's words
  const seed = 'ENDSEED', id = findFootprints(seed), s = freshSave(); s.seed = seed; pinned(s, id); readSecondFootprints(s, addSecondFootprints(dmap(), s, id));
  for (let i = 0; i < SECOND_WAYFARER.sightings - 1; i++) { const at = secondNext(s); readSecondTrace(s, addSecondTrace(omap(), s, at.rx, at.ry).object); }
  const at = secondNext(s), lay = addSecondTrace(omap(), s, at.rx, at.ry); assert.equal(lay.object.name, 'Someone lying still');
  const done = readSecondTrace(s, lay.object); assert.ok(done.done); assert.equal(lay.object.name, 'Wenna Callow'); assert.equal(done.text, last);
  assert.ok(done.message.endsWith(`${SECOND_LAST_WORDS}.`)); assert.equal(secondTraceText(s, 5), last, 'reread in the Arcana and the Tome');
  // a journey that finished under release 1024 keeps its saved Journal entry and trail as they were
  const old = migrateSave(JSON.parse(JSON.stringify({ ...s, narrative: { ...s.narrative, journal: [{ recordId: 'second-wayfarer:end', title: SECOND_WAYFARER.title, text: 'Nobody is ahead of you now.' }] } })));
  assert.deepEqual(old.lore.second, s.lore.second); assert.ok(old.narrative.journal.some((j) => j.recordId === 'second-wayfarer:end' && j.text === 'Nobody is ahead of you now.'), 'saved text is not rewritten');
});
