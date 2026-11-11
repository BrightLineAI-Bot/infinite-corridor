// Arcana regions (2026-11-11; Tim: "if you want to do the bell quest, go to the south-west quadrant, roughly 25 to 50 tiles out";
// the Journal shows "5 of 7 bells" and where the rest likely are; "don't make it so restrictive the map feels less free").
// lore.ts ARCANA_REGIONS gives each set a home (a compass sector around the Refuge and a stretch of distance). Crossings pinned to
// region version 1 place the Seven Bells and the Surveyor's Chain mostly at home and weigh a thread's share of the story budget
// toward its home; crossings pinned before (region version 0) keep exactly what they offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { hashSeed } from '../src/random.ts';
import { ARCANA_REGIONS, inArcanaHome, arcanaHint, arcanaRate, regionVersionFor, regionVersionOf, readingAt, readingRegion, readingRegionHint, READING_ORDER, READINGS } from '../src/lore.ts';
import { BELLS, bellIn, bellsRung, addBell, ringBell } from '../src/bells.ts';
import { SURVEYOR, surveyorCrossing, addSurveyorLink, takeSurveyorLink, surveyorComplete } from '../src/surveyor.ts';
import { THREADS, THREAD_ORDER, THREAD_BANDS, STORY_BUDGET, threadIn, inBand, addThreadRelic, readThreadRelic, threadsDone, arcanaProgress, arcanaWhere, ARCANA_REWARDS, settleArcanaRewards, arcanaComplete, ensureThreadState } from '../src/threads.ts';
import { farDistance, FAR_REALMS } from '../src/far-realms.ts';

const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });
// Crossings spread over every direction, `per` at each Manhattan distance from `lo` to `hi`.
const spread = (lo, hi, per, tag = 'a') => { const out = []; for (let d = lo; d <= hi; d++) for (let i = 0; i < per; i++) { const x = ((i * 7919 + d * 31) % (2 * d + 1)) - d, y = ((i >> 1) % 2 ? 1 : -1) * (d - Math.abs(x)), seed = `ARC${i % 9}`; out.push([seed, `dungeon:${seed}:g1:${x}:${y}:${tag}${d}-${i}`, x, y]); } return out; };
// The rules as they stood before the regions (bells, release 577; the chain, release 505), written out again here.
const bell577 = (seed, id, rung = '') => { const m = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(id); if (!m || Math.abs(+m[1]) + Math.abs(+m[2]) < 3) return 0; const h = hashSeed(`${seed}:seven-bells:v1:${id}`); if ((h % 10000) / 10000 >= .14) return 0; const left = [1, 2, 3, 4, 5, 6, 7].filter((n) => !rung.includes(String(n))); return left.length ? left[(h >>> 9) % left.length] : 1 + ((h >>> 9) % 7); };
const chain505 = (seed, id) => { const m = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(id); if (!m || Math.hypot(+m[1], +m[2]) < 8) return false; return (hashSeed(`${seed}:surveyor:v1:${id}`) % 10000) / 10000 < .14; };
const pinned = (s, id, region, story = STORY_BUDGET.version) => { s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, storyVersion: story, ...(region ? { regionVersion: region } : {}) }; };

test('the region table: every home is a known set with a compass sector, inside its band, and a hint in words', () => {
  assert.equal(ARCANA_REGIONS.version, 1); assert.ok(ARCANA_REGIONS.homeWeight > 1);
  assert.deepEqual(ARCANA_REGIONS.sets.bells, { toward: 'sw', from: 25, to: 50, home: .2, stray: .02 }, "Tim's example: the south-west, 25 to 50 out");
  for (const [id, h] of Object.entries(ARCANA_REGIONS.sets)) {
    assert.ok(THREADS[id] || id === 'bells' || id === 'surveyor', `${id} is a set`); assert.ok(h.toward in ARCANA_REGIONS.headings && h.toward in ARCANA_REGIONS.words, id); assert.ok(h.from >= 3 && h.to > h.from, id);
    if (THREADS[id]) { const bands = [THREADS[id].band, ...Object.values(THREADS[id].shared || {}).flat()]; for (let d = h.from; d <= h.to; d++) assert.ok(bands.some((b) => THREAD_BANDS[b][0] <= d && d <= THREAD_BANDS[b][1]), `${id}'s home lies inside its bands (${d})`); assert.equal(h.home, undefined, 'threads keep the budget; no rate of their own'); }
    else assert.ok(h.home > h.stray && h.stray > 0, `${id}: likelier at home, never fenced`);
    assert.match(arcanaHint(id), new RegExp(`^${ARCANA_REGIONS.words[h.toward]} of the Refuge, ${h.from} to ${h.to} sections out$`)); }
  for (const id of THREAD_ORDER) if (THREADS[id].band === 'beyond') { assert.equal(ARCANA_REGIONS.sets[id], undefined, `${id}: the far realms are its region`); assert.equal(arcanaHint(id), null); }
  for (const id of THREAD_ORDER) if (THREADS[id].band !== 'beyond') assert.ok(ARCANA_REGIONS.sets[id], `${id} has a home`);
  // A diagonal is a quadrant; a cardinal point is the Reading's compass quarter. From 2026-11-11 (Tim) a home's distance is
  // straight-line from the Refuge: the ferry's home is the north quarter from 7 to 18 out as the crow flies.
  assert.ok(inArcanaHome('bells', -20, 20) && inArcanaHome('bells', -30, 0) && !inArcanaHome('bells', 10, 20) && !inArcanaHome('bells', -10, -20) && !inArcanaHome('bells', -5, 5) && !inArcanaHome('bells', -10, 20));
  for (let x = -40; x <= 40; x++) for (let y = -40; y <= 40; y++) { const r = Math.hypot(x, y), north = -y >= Math.abs(x);
    assert.equal(inArcanaHome('ferry', x, y), north && r >= 7 && r <= 18, `${x},${y}`); assert.equal(inArcanaHome('clockmaker', x, y), north && r >= 19 && r <= 35, `${x},${y}`); }
  assert.equal(arcanaRate('bells', -20, 20), .2); assert.equal(arcanaRate('bells', 20, 20), .02); assert.equal(arcanaRate('surveyor', 15, -15), .2);
  for (const r of READING_ORDER) { const g = readingRegion(r); assert.ok(g, r); assert.ok(readingRegionHint(r)); if (g.toward) assert.equal(readingAt(g.toward === 'e' ? g.from + 1 : g.toward === 'w' ? -g.from - 1 : 0, g.toward === 'n' ? -g.from - 1 : g.toward === 's' ? g.from + 1 : 0), r); }
});

test('region version 0 is exactly the old rule, over tens of thousands of crossings; nothing pins version 1 while the regions are not live', () => {
  const all = spread(0, 160, 400, 'old'); let n = 0;
  for (const [seed, id] of all) { n++;
    for (const rung of ['', '135', '1234567']) assert.equal(bellIn(seed, id, rung, 0), bell577(seed, id, rung), id), assert.equal(bellIn(seed, id, rung), bell577(seed, id, rung));
    assert.equal(surveyorCrossing(seed, id, 0), chain505(seed, id), id); assert.equal(surveyorCrossing(seed, id), chain505(seed, id));
    for (const v of [0, 1, 2, 3, 4]) assert.equal(threadIn(seed, id, v, 0), threadIn(seed, id, v), id);
    assert.equal(threadIn(seed, id, 0, 1), threadIn(seed, id, 0), 'story version 0 (the waves) never reads the region'); }
  assert.ok(n >= 60000, `${n} crossings`);
  // A save whose crossings carry no regionVersion lays exactly what the old rules lay, before and after a save and load.
  const s = freshSave(); s.seed = 'ARCOLD'; const ids = spread(3, 60, 40, 'o').map(([, id]) => id.replace(/ARC\d/, 'ARCOLD')); ids.forEach((id) => pinned(s, id, 0));
  const lay = (save) => ids.map((id) => [addBell(map(), save, id), addSurveyorLink(map(), save, id), addThreadRelic(map(), save, id)]);
  const before = JSON.parse(JSON.stringify(lay(s))), back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(JSON.parse(JSON.stringify(lay(back))), before);
  for (const [i, id] of ids.entries()) { assert.equal(before[i][0]?.bell ?? 0, bell577('ARCOLD', id)); assert.equal(!!before[i][1], chain505('ARCOLD', id)); assert.equal(before[i][2]?.thread ?? null, threadIn('ARCOLD', id, STORY_BUDGET.version)); }
  // The pin: never written while not live; when live, only a crossing never generated or visited takes version 1.
  const f = freshSave(); f.seed = 'ARCPIN'; const h = pinDungeonLayout(f, 'dungeon:ARCPIN:g1:-20:20:x'); assert.equal(h.regionVersion, ARCANA_REGIONS.live ? 1 : undefined, 'a crossing never generated: version 1 once live, nothing written before');
  assert.equal(regionVersionOf(f, 'dungeon:ARCPIN:g1:-20:20:x'), ARCANA_REGIONS.live ? 1 : 0);
  const seen = 'dungeon:ARCPIN:g1:-21:20:x'; f.consequences.dungeons[seen] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false }; assert.equal(pinDungeonLayout(f, seen).regionVersion, undefined, 'a crossing visited before keeps the old placements');
  assert.equal(regionVersionFor(false, true), 1); assert.equal(regionVersionFor(true, true), 0); assert.equal(regionVersionFor(false, false), 0); assert.equal(regionVersionFor(false), ARCANA_REGIONS.live ? 1 : 0);
});

test('region version 1: the bells and the chain lie mostly at home, the same roll deciding, and still turn up elsewhere', () => {
  for (const [set, fn, old, lo, hi] of [['bells', (s, id, r) => bellIn(s, id, '', r) > 0, (s, id) => bell577(s, id) > 0, 3, 90], ['surveyor', surveyorCrossing, chain505, 8, 90]]) {
    let home = 0, homeHit = 0, away = 0, awayHit = 0;
    for (const [seed, id, x, y] of spread(lo, hi, 900, set)) { if (set === 'surveyor' && Math.hypot(x, y) < SURVEYOR.minRing) continue; const at = inArcanaHome(set, x, y), now = fn(seed, id, 1);
      assert.equal(fn(seed, id, 1), now, 'deterministic'); if (at && old(seed, id)) assert.ok(now, `${id}: at home every crossing that held one still does`);
      if (at) { home++; if (now) homeHit++; } else { away++; if (now) awayHit++; } }
    assert.ok(home > 5000 && away > 40000, `${set}: ${home} at home, ${away} away`);
    assert.ok(Math.abs(homeHit / home - ARCANA_REGIONS.sets[set].home) < .012, `${set} at home: ${homeHit / home}`); assert.ok(Math.abs(awayHit / away - ARCANA_REGIONS.sets[set].stray) < .004, `${set} away: ${awayHit / away}`); }
});

test('region version 1: exactly the same crossings hold a thread piece, at the same density; a thread at home is several times likelier there', () => {
  const rate = {}; let n = 0;
  for (const [seed, id, x, y] of spread(3, 200, 300, 'th')) { n++;
    for (const v of [1, 2, 3, 4]) { const a = threadIn(seed, id, v, 0), b = threadIn(seed, id, v, 1); assert.equal(!!a, !!b, `${id} v${v}: the slot is unchanged`); if (!b) continue; assert.ok([...Object.values(THREADS[b].shared || {}).flat(), THREADS[b].band].some((band) => inBand(band, x, y)), `${b} stays in its band`); }
    const t = threadIn(seed, id, STORY_BUDGET.version, 1);
    for (const tid of Object.keys(ARCANA_REGIONS.sets)) { if (!THREADS[tid]) continue; const bands = [THREADS[tid].band, ...Object.values(THREADS[tid].shared || {}).flat()]; if (!bands.some((b) => inBand(b, x, y))) continue;
      const r = (rate[tid] ||= { h: 0, nh: 0, a: 0, na: 0 }); if (inArcanaHome(tid, x, y)) { r.nh++; if (t === tid) r.h++; } else { r.na++; if (t === tid) r.a++; } } }
  assert.ok(n >= 59000, `${n} crossings`);
  for (const [tid, r] of Object.entries(rate)) { const x = (r.h / r.nh) / (r.a / r.na); assert.ok(x > 2.2, `${tid}: ${x.toFixed(1)} times likelier at home`); assert.ok(r.a > 0, `${tid}: still found away from home`); }
  // Past 1000 straight-line no thread has a home: version 1 rolls there exactly as version 0.
  for (const [seed, id] of spread(1450, 1452, 3000, 'far')) for (const v of [2, 3, 4]) assert.equal(threadIn(seed, id, v, 1), threadIn(seed, id, v, 0));
  assert.ok(farDistance(1451, 0) >= FAR_REALMS.start);
});

test('at region version 1 every set is read to its end in order, never stranded: bells, the chain and a thread, through the game rules', () => {
  const s = freshSave(); s.seed = 'ARCREAD'; const home = (set, test, n) => { const out = []; for (const [, id0, x, y] of spread(18, 50, 300, set)) { const id = id0.replace(/ARC\d/, 'ARCREAD'); if (out.length < n && inArcanaHome(set, x, y) && test(id)) out.push(id); } return out; };
  const bells = home('bells', (id) => bellIn('ARCREAD', id, '', 1) > 0, 8); assert.equal(bells.length, 8);
  for (const [i, id] of bells.slice(0, 7).entries()) { pinned(s, id, 1); const o = addBell(map(), s, id); assert.ok(o && !bellsRung(s).includes(String(o.bell))); const r = ringBell(s, o); assert.ok(r.first); assert.equal(r.done, i === 6); }
  assert.equal(bellsRung(s), '1234567'); pinned(s, bells[7], 1); assert.equal(addBell(map(), s, bells[7]).state, 'rung', 'all rung: it hangs silent');
  const links = home('surveyor', (id) => surveyorCrossing('ARCREAD', id, 1), 12); assert.equal(links.length, 12);
  for (const id of links) { pinned(s, id, 1); const o = addSurveyorLink(map(), s, id); assert.ok(o, id); assert.ok(takeSurveyorLink(s, o, id).ok); }
  assert.ok(surveyorComplete(s));
  const T = THREADS.lamplighter, lamp = []; for (const [, id0, x, y] of spread(3, 18, 400, 'lamp')) { const id = id0.replace(/ARC\d/, 'ARCREAD'); if (lamp.length < 7 && threadIn('ARCREAD', id, STORY_BUDGET.version, 1) === 'lamplighter') lamp.push([id, inArcanaHome('lamplighter', x, y)]); }
  assert.equal(lamp.length, 7);
  for (const [i, [id]] of lamp.slice(0, 6).entries()) { pinned(s, id, 1); const o = addThreadRelic(map(), s, id); assert.equal(o.thread, 'lamplighter'); assert.equal(o.index, i); const r = readThreadRelic(s, o); assert.ok(r.first); assert.equal(r.done, i === T.pieces.length - 1); }
  assert.ok(threadsDone(s).includes('lamplighter')); pinned(s, lamp[6][0], 1); assert.equal(addThreadRelic(map(), s, lamp[6][0]), null);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(bellsRung(back), '1234567'); assert.ok(surveyorComplete(back)); assert.ok(threadsDone(back).includes('lamplighter'));
  for (const id of [...bells, ...links]) assert.equal(back.consequences.dungeons[id].regionVersion, 1, 'the pin survives a save and load'); assert.equal(back.version, 14);
});

test('the Journal\'s Arcana: counts with their unit and a hint of where the rest most likely lie', () => {
  const s = freshSave(); s.seed = 'ARCJ'; const row = (id, live) => arcanaProgress(s, live).find((r) => r.id === id);
  assert.deepEqual(arcanaProgress(s, true).map((r) => r.id), [...THREAD_ORDER, 'bells', 'surveyor', 'pages']);
  let b = row('bells', true); assert.deepEqual([b.found, b.total, b.unit, b.complete], [0, 7, 'bells rung', false]); assert.equal(b.where, 'south-west of the Refuge, 25 to 50 sections out'); assert.deepEqual(b.home, ARCANA_REGIONS.sets.bells);
  s.lore.bells = '12345'; b = row('bells', true); assert.equal(b.found, 5); assert.equal(`${b.found} of ${b.total} ${b.unit}`, '5 of 7 bells rung');
  assert.equal(row('bells', false).where, 'ordinary crossings anywhere from 3 sections out', 'not live: where the bells have always been'); assert.equal(row('bells', false).home, null);
  assert.equal(row('surveyor', true).where, 'north-east of the Refuge, 18 to 45 sections out'); assert.equal(row('surveyor', false).where, 'crossings 8 or more sections from the Refuge');
  assert.equal(row('lamplighter', true).where, 'south of the Refuge, 3 to 18 sections out'); assert.equal(row('lamplighter', false).where, null, 'not live: the Journal words the band');
  assert.equal(row('tallSlates', true).where, null); assert.equal(row('tallSlates', true).band, 'beyond');
  s.lore.bells = '1234567'; b = row('bells', true); assert.ok(b.complete); assert.equal(b.where, null);
  // The Torn Pages: the Readings still missing, named only once heard, each with its region.
  s.lore.pages = { longCampaign: 'dungeon:ARCJ:g1:1:2:x' }; s.lore.entered = { riverThatRemembers: true, longCampaign: true };
  const p = row('pages', false); assert.equal(p.found, 1); assert.equal(p.where, `${READINGS.riverThatRemembers.name} (north, 7 to 18 sections out); 8 in Readings not yet heard`); assert.equal(arcanaWhere(s, 'pages', true), p.where);
  assert.equal(readingRegionHint('dreamlands'), 'every way, 36 sections out and more'); assert.equal(readingRegionHint('longCampaign'), 'every way, within 6 sections of the Refuge');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /const hints=Object\.fromEntries\(arcanaProgress\(save\)/); assert.match(main, /the rest most likely lie \$\{where\}/); assert.match(main, /you are in that region now/); assert.match(main, /inArcanaHome\(hint\.id, game\.rx, game\.ry\)/);
  assert.doesNotMatch(main, /add\("The Seven Bells"/, 'still not among Active quests (release 581)');
});

test('save: arcana rewards claimed and region pins are additive at schema 14; unknown fields are kept', () => {
  const s = freshSave(); assert.equal(s.lore.arcanaClaimed, undefined, 'absent stays absent');
  s.lore.arcanaClaimed = { bells: true, futureSet: true, junk: 'yes', other: 1 }; s.lore.somethingNew = { a: 1 }; s.consequences.dungeons['dungeon:X:g1:1:9:x'] = { regionVersion: 1, storyVersion: 4, extra: 'kept' };
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.lore.arcanaClaimed, { bells: true, futureSet: true }); assert.deepEqual(back.lore.somethingNew, { a: 1 }); assert.equal(back.version, 14);
  assert.equal(back.consequences.dungeons['dungeon:X:g1:1:9:x'].regionVersion, 1); assert.equal(back.consequences.dungeons['dungeon:X:g1:1:9:x'].extra, 'kept'); assert.equal(regionVersionOf(back, 'dungeon:X:g1:1:9:x'), 1);
  for (const bad of [null, [], 'x', 3]) { const t = { lore: { arcanaClaimed: bad } }; ensureThreadState(t); assert.deepEqual(t.lore.arcanaClaimed, {}); }
  assert.equal(regionVersionOf(back, 'dungeon:X:g1:0:9:nothing'), 0); back.consequences.dungeons.junk = { regionVersion: 'one' }; assert.equal(regionVersionOf(back, 'junk'), 0);
});

test('the completion reward hook: a set with a reward is paid once, through the game, and a set finished before is paid the next time it runs', () => {
  assert.deepEqual(ARCANA_REWARDS, {}, 'no unlocks are tied to sets yet: Tim chooses');
  const s = freshSave(); s.seed = 'BELLS431'; assert.deepEqual(settleArcanaRewards(s), []); assert.deepEqual(arcanaComplete(s), []);
  ARCANA_REWARDS.bells = { kind: 'test', id: 'x', label: 'A test reward' }; ARCANA_REWARDS.lamplighter = { kind: 'test', id: 'y', label: 'Another' };
  try {
    s.lore.threads = { lamplighter: ['a', 'b', 'c', 'd', 'e', 'f'] }; const paid = []; assert.deepEqual(settleArcanaRewards(s, (id, r) => paid.push([id, r.id])), ['lamplighter'], 'finished before the reward existed: paid now');
    assert.deepEqual(paid, [['lamplighter', 'y']]); assert.deepEqual(settleArcanaRewards(s, () => assert.fail('paid twice')), []);
    // The seventh bell, rung in the game, runs the hook.
    let c = null; for (let rx = -40; rx <= 40 && !c; rx++) for (let ry = -40; ry <= 40 && !c; ry++) { const id = `dungeon:BELLS431:g1:${rx}:${ry}:room`; if (bellIn('BELLS431', id, '', regionVersionFor(false))) c = { id, rx, ry }; } // a fresh crossing: the rule it will be pinned to
    s.lore.bells = '123456'; s.session.activeDungeonId = c.id; s.session.dungeonReturn = { rx: c.rx, ry: c.ry, x: 16, y: 16 };
    const g = new Game(s, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'crackedBell'); assert.ok(o); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y + .2 });
    const r = g.interact('ring', o.id); assert.ok(r.done, g.message); assert.ok((g.questNotices || []).some((q) => q.title === 'ARCANA' && q.detail === 'A test reward'));
    assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).lore.arcanaClaimed, { lamplighter: true, bells: true });
  } finally { delete ARCANA_REWARDS.bells; delete ARCANA_REWARDS.lamplighter; }
});
