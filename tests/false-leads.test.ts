import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { freshSave, migrateSave } from '../src/types.ts';
import { startJourney, compendium, ROW_BY_ID } from '../src/progression.ts';
import { useJourneyFrame } from '../src/journey-start.ts';
import { nearestShaft, nearestHorde, setWorldLeadProbe } from '../src/world-leads.ts';
import { Game, worldLeadPhysical, generatePinnedDungeon, sectionTerrainCacheStats } from '../src/game.ts';
import { generateRegion, dungeonId } from '../src/world.ts';
import { shaftHere } from '../src/the-deep.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { RELIQUARY, WORLD_WITHHELD, reliquaryOrder } from '../src/world-routes.ts';
import { STORY_WITHHELD, paidRumourView, boughtRumour } from '../src/quests.ts';
import { liveRumours, rumourLeads } from '../src/leads.ts';
import { compassGuidance } from '../src/atlas-view.ts';
import { buyVisceraRumour, nextFromPool } from '../src/world-finds.ts';
import { rollHorde } from '../src/revenant-horde.ts';
import { ladderRoll } from '../src/dungeon-ladder.ts';

function save(seed) { const s = freshSave(); s.seed = seed; s.perception.aperture = APERTURE_BANDS[13].threshold; useJourneyFrame(s); return s; }

test('audited shaft hashes are not promises when arrival has no shaft', () => {
  for (const [seed, x, y] of [['AUDIT-H-6', 6, 6], ['AUDIT-H-28', -5, 3]]) {
    const s = save(seed); assert.equal(shaftHere(seed, x, y), true, seed);
    assert.equal(nearestShaft(s, x, y, 0), null, seed);
    const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false);
    assert.equal(g.map.objects.some((o) => o.kind === 'deepShaft'), false, `${seed}: actual arrival`);
  }
});

test('a physical shaft lead survives real arrival, and old explored ground stays excluded', () => {
  const s = save('SHAFT-ARRIVAL'), before = structuredClone(s), cache = sectionTerrainCacheStats();
  const q = nearestShaft(s, 0, 0); assert.ok(q);
  assert.deepEqual(s, before, 'search does not normalise or mutate the live save');
  assert.deepEqual(sectionTerrainCacheStats(), cache, 'search does not replace or warm arrival terrain');
  const g = new Game(s, 0); g.rx = q.rx; g.ry = q.ry; g.loadArea('overworld', false);
  assert.ok(g.map.objects.some((o) => o.kind === 'deepShaft'));
  const pinned = structuredClone(s.atlas[`${q.rx},${q.ry}`]);
  assert.equal(nearestShaft(s, q.rx, q.ry, 0), null);
  assert.deepEqual(s.atlas[`${q.rx},${q.ry}`], pinned);
  const old = save('SHAFT-ARRIVAL'); old.explored[`${q.rx},${q.ry}`] = true;
  assert.equal(nearestShaft(old, q.rx, q.ry, 0), null);
});

test('later Pentagon placement cannot erase a promised horde crossing or Deep Shaft', () => {
  const h = save('REVIEW-48'), id = 'dungeon:REVIEW-48:g1:-8:-8:dungeon-g1--8--8-64801';
  assert.equal(nearestHorde(h, -8, -8, 0), null);
  const hg = new Game(structuredClone(h), 0); hg.rx = -8; hg.ry = -8; hg.loadArea('overworld', false);
  assert.ok(hg.map.pentagon);
  assert.equal(hg.map.objects.some((o) => o.kind === 'dungeon' && (o.dungeonId || dungeonId(h.seed, 1, -8, -8, o.id)) === id), false);
  const s = save('OVERLAY-4'); assert.equal(shaftHere(s.seed, -7, 8), true);
  assert.equal(worldLeadPhysical(s, -7, 8, 'shaft'), false);
  assert.equal(nearestShaft(s, -7, 8, 0), null);
  const sg = new Game(structuredClone(s), 0); sg.rx = -7; sg.ry = 8; sg.loadArea('overworld', false);
  assert.ok(sg.map.pentagon); assert.equal(sg.map.objects.some((o) => o.kind === 'deepShaft'), false);
  useJourneyFrame(h);
  const next = nearestHorde(h, 0, 0, 40); assert.ok(next); assert.notEqual(next.dungeon, id);
  const ng = new Game(structuredClone(h), 0); ng.rx = next.rx; ng.ry = next.ry; ng.loadArea('overworld', false);
  assert.ok(ng.map.objects.some((o) => o.kind === 'dungeon' && (o.dungeonId || dungeonId(h.seed, 1, next.rx, next.ry, o.id)) === next.dungeon));
});

test('neighboring architecture pins invalidate a previously accepted physical candidate', () => {
  const s = save('REVIEW-48');
  s.atlas = { '-8,-8': { pentVersion: 11 }, '-9,-9': {} };
  const q = nearestHorde(s, -8, -8, 0); assert.ok(q, 'the old neighbor prevents a Pentagon across this footprint');
  s.atlas['-9,-9'] = { pentVersion: 11 };
  const before = structuredClone(s);
  assert.equal(nearestHorde(s, -8, -8, 0), null, 'the cached crossing must be checked again when its neighboring pins enable the overlay');
  assert.deepEqual(s, before);
  const g = new Game(structuredClone(s), 0); g.rx = -8; g.ry = -8; g.loadArea('overworld', false);
  assert.ok(g.map.pentagon);
  assert.equal(g.map.objects.some((o) => o.kind === 'dungeon' && (o.dungeonId || dungeonId(s.seed, 1, -8, -8, o.id)) === q.dungeon), false);
});

test('hamlets, recorded far domains and hometowns invalidate cached shaft candidates', () => {
  const s = save('SHAFT-ARRIVAL'), q = nearestShaft(s, 0, 0); assert.ok(q);
  s.hometowns.towns.push({ rx: q.rx, ry: q.ry });
  assert.equal(nearestShaft(s, q.rx, q.ry, 0), null);
  s.hometowns.towns = [];
  s.farQuests = { questingBeast: { status: 'open', rx: q.rx, ry: q.ry } };
  assert.equal(nearestShaft(s, q.rx, q.ry, 0), null);
});

test('audited horde hashes do not promise a crossing overridden by terrain or Poison Crypt', () => {
  for (const [seed, x, y] of [['AUDIT-H-16', 15, -14], ['AUDIT-H-113', -1, -3], ['AUDIT-H-283', 7, -6]]) {
    const s = save(seed); assert.equal(nearestHorde(s, x, y, 0), null, seed);
    const door = generateRegion(seed, x, y, 1).objects.find((o) => o.kind === 'dungeon' && o.id.startsWith(`dungeon-g1-${x}-${y}-`)); assert.ok(door);
    const id = dungeonId(seed, 1, x, y, door.id);
    generatePinnedDungeon(s, id); assert.ok(s.consequences.dungeons[id].mire, seed);
    assert.equal(rollHorde(s, id, s.consequences.dungeons[id], 'full'), null);
  }
});

test('historical non-mire crossing uses pinned rules and the search never rewrites its history', () => {
  const s = save('H1'), q = nearestHorde(s, 0, 0, 40); assert.ok(q);
  s.consequences.dungeons[q.dungeon] = { generatorVersion: 5, mire: false, ladder: { tier: 13, version: 1 }, visits: 0, future: 'kept' };
  s.perception.aperture = 0;
  const before = structuredClone(s.consequences.dungeons[q.dungeon]);
  assert.equal(nearestHorde(s, q.rx, q.ry, 0)?.dungeon, q.dungeon);
  assert.deepEqual(s.consequences.dungeons[q.dungeon], before);
});

test('an invalid cached horde rescans and finds the next real crossing', () => {
  const s = save('H1'), q = nearestHorde(s, 0, 0, 40); assert.ok(q);
  s.consequences.dungeons[q.dungeon] = { visits: 1 };
  const next = nearestHorde(s, 0, 0, 40); assert.ok(next); assert.notEqual(next.dungeon, q.dungeon);
  generatePinnedDungeon(s, next.dungeon);
  const h = s.consequences.dungeons[next.dungeon];
  assert.ok(rollHorde(s, next.dungeon, h, ladderRoll(s.seed, next.dungeon, 'horde', h.ladder.tier)));
});

test('physical generation is shortlisted, bounded and memoised between repeated calls', () => {
  const s = save('SHORTLIST'); let calls = 0;
  setWorldLeadProbe((...args) => { calls++; return worldLeadPhysical(...args); });
  try {
    const q = nearestShaft(s, 0, 0, 15); assert.ok(q); const first = calls;
    assert.ok(first > 0 && first < 20, `${first} physical candidates in a 961-section bound`);
    for (let i = 0; i < 20; i++) assert.deepEqual(nearestShaft(s, 0, 0, 15), q);
    assert.equal(calls, first);
  } finally { setWorldLeadProbe(worldLeadPhysical); }
});

test('standalone lead import refuses physical promises before the runtime probe is installed', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `import {nearestShaft,nearestHorde} from './src/world-leads.ts'; if(nearestShaft({seed:'SHAFT-ARRIVAL'},0,0)||nearestHorde({seed:'H1'},0,0))process.exit(1);`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('paid rumours can name only the reward the next reliquary will actually give', () => {
  const s = startJourney(save('PAID-POOL'), {}); useJourneyFrame(s);
  s.refinement.unlocked = true; s.skylands.viscera = 30;
  s.progression.kept.push(...WORLD_WITHHELD.filter((id) => !RELIQUARY.pool.includes(id)), ...STORY_WITHHELD);
  const expected = nextFromPool(s), q = buyVisceraRumour(s); assert.equal(q.ok, true); assert.equal(q.rumour.ability, expected);
  assert.equal(s.leads.rumours.at(-1).source, 'reliquary', 'new purchases keep explicit source provenance');
  assert.equal(q.rumour.source, 'reliquary'); assert.equal(q.rumour.rx, undefined); assert.equal(q.rumour.ry, undefined);
  assert.match(q.message, /among reliquary rewards; it may take more than one reliquary/);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).leads.rumours.at(-1).source, 'reliquary');
  const money = s.skylands.viscera, again = buyVisceraRumour(s);
  assert.equal(again.ok, false, 'later pool rewards cannot be sold as the reward at the next site');
  assert.equal(s.skylands.viscera, money);
});

test('legacy paid shaft and horde rumours become truthful read-only views across Journal and compendium', () => {
  for (const [seed, rx, ry, where] of [
    ['AUDIT-H-6', 6, 6, 'at the bottom of something: floor 2 of a Deep Shaft'],
    ['AUDIT-H-16', 15, -14, 'at the bottom of something: a horde crossing 15 sections off'],
  ]) {
    let s = startJourney(save(seed), {}); s.progression.start = 0; useJourneyFrame(s);
    const ability = reliquaryOrder(seed)[1], name = ROW_BY_ID[ability].name;
    assert.notEqual(ability, nextFromPool(s), 'the legacy purchase names a later pool reward');
    const record = { id: `viscera:${ability}`, kind: 'viscera', ability, title: name, name, where,
      text: `For the Viscera, a rumour: ${name}, ${where}.`, by: 'viscera', at: 90, rx, ry, future: { preserved: true } };
    s.leads.rumours = [record]; s.skylands.viscera = 7;
    s.guidance = { ...s.guidance, pin: { rx, ry, name }, follow: null, pick: null, future: 'kept' };
    s = migrateSave(JSON.parse(JSON.stringify(s))); useJourneyFrame(s);
    const before = structuredClone({ record: s.leads.rumours[0], money: s.skylands.viscera, feats: s.feats,
      progression: s.progression, guidance: s.guidance, atlas: s.atlas, consequences: s.consequences });
    let probes = 0; setWorldLeadProbe(() => { probes++; throw new Error('UI reads must not generate physical candidates'); });
    try {
      for (let i = 0; i < 3; i++) {
        const bought = boughtRumour(s, ability), live = liveRumours(s)[0], row = rumourLeads(s)[0];
        assert.match(bought.where, /among reliquary rewards; it may take more than one reliquary/);
        assert.equal(live.id, record.id); assert.equal(live.ability, ability); assert.equal(live.at, 90); assert.deepEqual(live.future, record.future);
        assert.equal(live.rx, undefined); assert.equal(live.ry, undefined); assert.equal(row.at, undefined);
        assert.match(row.detail, /among reliquary rewards/); assert.doesNotMatch(row.detail, /Deep Shaft|horde crossing/);
        const entry = compendium(s).groups.flatMap((g) => g.entries).find((e) => e.id === ability);
        assert.equal(entry.state, 'rumoured'); assert.match(entry.label, /Rumoured: among reliquary rewards/);
      }
      assert.equal(probes, 0);
    } finally { setWorldLeadProbe(worldLeadPhysical); }
    assert.deepEqual({ record: s.leads.rumours[0], money: s.skylands.viscera, feats: s.feats,
      progression: s.progression, guidance: s.guidance, atlas: s.atlas, consequences: s.consequences }, before);
    assert.deepEqual(compassGuidance(s, { pin: s.guidance.pin }), { area: 'overworld', rx, ry, kind: 'guidance', name }, 'the player-selected compass pin stays selected');
  }
});

test('paid quest and milestone source clues keep their original read-time view', () => {
  for (const where of ['a milestone: dives cleared, 10', 'Hollis Dray at the Refuge will have work for you once you reach a deeper band of the Aperture']) {
    const r = { id: 'viscera:test', kind: 'viscera', ability: 'test', text: `A clue: ${where}`, where, rx: 0, ry: 0, future: true };
    assert.equal(paidRumourView(r), r);
    const s = save('UNCHANGED-PAID'); s.leads.rumours = [r]; assert.deepEqual(boughtRumour(s, 'test'), { where });
  }
});
