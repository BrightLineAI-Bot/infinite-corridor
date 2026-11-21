import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { startJourney } from '../src/progression.ts';
import { useJourneyFrame } from '../src/journey-start.ts';
import { Game, worldLeadPhysical, generatePinnedDungeon, sectionTerrainCacheStats } from '../src/game.ts';
import { nearestHorde, nearestShaft, hordeLeadLive, deepLeadLive, pityDue, setWorldLeadProbe } from '../src/world-leads.ts';
import { liveRumours, rumourLeads, nextRumour, rumourTurn } from '../src/leads.ts';
import { compassGuidance } from '../src/atlas-view.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { PITY } from '../src/world-routes.ts';
import { deepIdFor, deepKey } from '../src/the-deep.ts';

function save(seed) {
  const s = freshSave(); s.seed = seed; startJourney(s, {}); s.progression.start = 0;
  s.perception.aperture = APERTURE_BANDS[13].threshold; useJourneyFrame(s); return s;
}
function stored(s, records) {
  s.leads.rumours = records.map((r) => ({ text: 'An old physical lead.', by: 'warden-oren', at: 50, future: { kept: true }, ...r }));
  s.guidance = { ...s.guidance, pin: { rx: records[0].rx, ry: records[0].ry, name: 'My chosen point' }, follow: null, pick: null };
  const out = migrateSave(JSON.parse(JSON.stringify(s))); useJourneyFrame(out); return out;
}
const hordeRecord = (q, pity = false) => ({ ...q, id: `${pity ? 'pity:' : ''}horde:${q.rx},${q.ry}`, kind: pity ? 'pity' : 'horde', ...(pity ? { target: 'horde' } : {}) });
const deepRecord = (q) => ({ ...q, id: `pity:deep:${q.rx},${q.ry}`, kind: 'pity', target: 'deep' });

test('migrated impossible unpaid destinations disappear from Journal without changing receipts or the chosen compass', () => {
  for (const [seed, records] of [
    ['REVIEW-48', [hordeRecord({ rx: -8, ry: -8, dungeon: 'dungeon:REVIEW-48:g1:-8:-8:dungeon-g1--8--8-64801' }), hordeRecord({ rx: -8, ry: -8, dungeon: 'dungeon:REVIEW-48:g1:-8:-8:dungeon-g1--8--8-64801' }, true)]],
    ['AUDIT-H-16', [hordeRecord({ rx: 15, ry: -14, dungeon: 'dungeon:AUDIT-H-16:g1:15:-14:dungeon-g1-15--14-27959' }), hordeRecord({ rx: 15, ry: -14, dungeon: 'dungeon:AUDIT-H-16:g1:15:-14:dungeon-g1-15--14-27959' }, true)]],
    ['AUDIT-H-6', [deepRecord({ rx: 6, ry: 6, shaft: deepIdFor('AUDIT-H-6', 6, 6), floor: 2 })]],
  ]) {
    const s = stored(save(seed), records), before = structuredClone(s), cache = sectionTerrainCacheStats(); let probes = 0;
    setWorldLeadProbe((...args) => { probes++; assert.equal(args[1], records[0].rx); assert.equal(args[2], records[0].ry); return worldLeadPhysical(...args); });
    try {
      for (let i = 0; i < 12; i++) { assert.deepEqual(liveRumours(s), []); assert.deepEqual(rumourLeads(s), []); }
      assert.ok(probes <= 1, 'only the explicit candidate is generated once, never a ring of new destinations');
    } finally { setWorldLeadProbe(worldLeadPhysical); }
    assert.deepEqual(s, before); assert.deepEqual(sectionTerrainCacheStats(), cache);
    assert.deepEqual(compassGuidance(s, { pin: s.guidance.pin }), { area: 'overworld', rx: records[0].rx, ry: records[0].ry, name: 'My chosen point', kind: 'guidance' });
    const g = new Game(structuredClone(s), 0); g.rx = records[0].rx; g.ry = records[0].ry; g.loadArea('overworld', false);
    if (seed === 'REVIEW-48') { assert.ok(g.map.pentagon); assert.equal(g.map.objects.some((o) => o.id === 'dungeon-g1--8--8-64801'), false); }
    else if (seed === 'AUDIT-H-16') { generatePinnedDungeon(g.save, records[0].dungeon); assert.ok(g.save.consequences.dungeons[records[0].dungeon].mire); }
    else assert.equal(g.map.objects.some((o) => o.kind === 'deepShaft'), false);
  }
});

test('valid saved horde and shaft leads remain offered; repeated reads use their exact candidate memo', () => {
  for (const type of ['horde', 'deep']) {
    let s = save(type === 'horde' ? 'H1' : 'SHAFT-ARRIVAL');
    const q = type === 'horde' ? nearestHorde(s, 0, 0) : nearestShaft(s, 0, 0); assert.ok(q);
    s = stored(s, [type === 'horde' ? hordeRecord(q) : deepRecord(q)]);
    const before = structuredClone(s), cache = sectionTerrainCacheStats(); let probes = 0;
    setWorldLeadProbe((...args) => { probes++; assert.equal(args[1], q.rx); assert.equal(args[2], q.ry); return worldLeadPhysical(...args); });
    try {
      for (let i = 0; i < 10; i++) { assert.equal(liveRumours(s).length, 1); assert.deepEqual(rumourLeads(s)[0].at, { rx: q.rx, ry: q.ry }); }
      assert.equal(probes, 1);
    } finally { setWorldLeadProbe(worldLeadPhysical); }
    assert.deepEqual(s, before); assert.deepEqual(sectionTerrainCacheStats(), cache);
    assert.equal(type === 'horde' ? hordeLeadLive(s, { ...q, dungeon: `${q.dungeon}-wrong` }) : deepLeadLive(s, { ...q, shaft: `${q.shaft}-wrong` }), false, 'coordinates cannot validate another identity');
  }
});

test('real pinned sites survive read-time validation after the section has been seen and snapshotted', () => {
  for (const type of ['horde', 'deep']) {
    const s = save(type === 'horde' ? 'H1' : 'SHAFT-ARRIVAL'), q = type === 'horde' ? nearestHorde(s, 0, 0) : nearestShaft(s, 0, 0); assert.ok(q);
    const g = new Game(s, 0); g.rx = q.rx; g.ry = q.ry; g.loadArea('overworld', false); g.snapshotArea(false);
    assert.ok(g.map.objects.some((o) => type === 'horde' ? o.id === q.dungeon.split(':').at(-1) : o.kind === 'deepShaft'));
    const old = stored(g.save, [type === 'horde' ? hordeRecord(q) : deepRecord(q)]), before = structuredClone(old); let probes = 0;
    setWorldLeadProbe(() => { probes++; throw new Error('known actual pinned site needs no new-ground generation'); });
    try { assert.equal(liveRumours(old).length, 1); assert.deepEqual(rumourLeads(old)[0].at, { rx: q.rx, ry: q.ry }); assert.equal(probes, 0); }
    finally { setWorldLeadProbe(worldLeadPhysical); }
    assert.deepEqual(old, before);
    const missing = structuredClone(old); missing.atlas[`${q.rx},${q.ry}`].sites = [{ kind: 'dungeon', name: 'An unrelated tower door', x: 16, y: 16 }];
    assert.equal(liveRumours(missing).length, 0, 'an updated atlas with no target overrides a stale object snapshot');
    if (type === 'horde') { old.consequences.dungeons[q.dungeon] = { visits: 1 }; assert.equal(liveRumours(old).length, 0); }
    else { old.theDeep.shafts[deepKey(q.shaft)].best = q.floor; assert.equal(liveRumours(old).length, 0); }
  }
});

test('ordinary due requests replace a stale strong source without resetting cadence or retargeting the compass', () => {
  const bad = deepRecord({ rx: 6, ry: 6, shaft: deepIdFor('AUDIT-H-6', 6, 6), floor: 2 }), s = stored(save('AUDIT-H-6'), [bad]);
  assert.equal(pityDue(s), false); const old = structuredClone(s.leads.rumours[0]), pin = structuredClone(s.guidance), kept = structuredClone(s.progression), earned = structuredClone(s.feats.earned), money = s.skylands.viscera;
  for (let i = 0; i < PITY.sections; i++) s.explored[`${1000 + i},0`] = true;
  assert.equal(pityDue(s), true);
  const result = rumourTurn(s, 'warden-oren'); assert.equal(result.strong, true); assert.notEqual(result.rumour.id, bad.id);
  assert.ok(liveRumours(s).some((r) => r.id === result.rumour.id)); assert.equal(liveRumours(s).some((r) => r.id === bad.id), false);
  assert.deepEqual(s.leads.rumours.find((r) => r.id === bad.id), old); assert.deepEqual(s.guidance, pin); assert.deepEqual(s.progression, kept);
  assert.deepEqual(s.feats.earned, earned); assert.equal(s.skylands.viscera, money); assert.equal(pityDue(s), false);
});

test('an invalid unpaid horde no longer blocks the ordinary horde rumour slot', () => {
  const s = save('H1'), q = nearestHorde(s, 0, 0); assert.ok(q);
  const bad = hordeRecord({ ...q, dungeon: `${q.dungeon}-wrong` }); s.leads.rumours = [{ ...bad, text: 'Old wrong identity.' }];
  s.mounts.hatchling.owned = true; s.equipment.primary.awakened = { resonance: 'x' };
  const next = nextRumour(s, 0, 0); assert.equal(next.kind, 'horde'); assert.equal(next.dungeon, q.dungeon);
  assert.equal(s.leads.rumours[0].dungeon, bad.dungeon, 'read-time replacement choice does not rewrite the stored record');
});
