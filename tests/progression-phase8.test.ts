// Progression Phase 8, far, sea, sky and strange; Divine Viscera (docs/progression-design.md rev 3, sections 2.2 routes b and V,
// 2.3, 2.4, 2.5 G2/G4/G6, 2.7, 3 and 7 row 8). The remaining quests (Corridor Golem, Tempo, Blade Stream, Glyph Mine, Arc Wave,
// Power Aegis, Ember Mend, Wellspring) on Phase 7's engine; the four Viscera forms and the rumour at Sela's forge and every smith
// once refinement opens; the seeded guardian roster. Exploration now withholds the whole designed set; Classic gets extra routes and
// the consolation; kept is honoured; an in-progress journey keeps what it had; the searches are bounded and cached; a 1,000-seed
// G6 run over every new step; and the cadence (2.7) as a simulation, its numbers printed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { EXPLORATION, exploring, ensureQuests, QUEST_RECORD, useJourneyFrame } from '../src/journey-start.ts';
import { startJourney, switchProgression, ownership, stateV0, compendium, adoptExploration, howToPage, hintFor, PROGRESSION_ROWS, ROW_BY_ID } from '../src/progression.ts';
import { STORY, QUESTS, QUEST_IDS, THREAD_REWARDS, seededThreads, STORY_WITHHELD, STORY_ROUTE_OF, STORY_LATER, STORY_OWN, PHASE7_STORY, STORY_SINCE, MOVED, VISCERA_SHOP, VISCERA_IDS, storyWithheld, questOpen, questStep, questDue, stepPlace, stepCount, openQuestCount, farthest, boughtRumour } from '../src/quests.ts';
import { QUEST_PLACES, openQuest, questPlace, questEvent, questToken, questSpeak, questLay, questArrive, questLeads, questTarget, farCentre, canyonAt, wreckAt, skywayAt, revenantAt, pentagonPlaceAt } from '../src/quest-places.ts';
import { WORLD_WITHHELD, worldWithheld, earnedWorld, MILESTONES, RELIQUARY } from '../src/world-routes.ts';
import { grantWorld, visceraShop, buyVisceraForm, buyVisceraRumour, visceraSells } from '../src/world-finds.ts';
import { liveRumours, questLeadCount } from '../src/leads.ts';
import { THREADS, THREAD_BANDS } from '../src/threads.ts';
import { GUARDIAN_POOL, GUARDIAN_ROSTER, guardianRoster, rosterGuardianKind, rosterRing, guardianKindFor } from '../src/monster-pack.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { toggleAlt, toggleLatticePassive, learnExtra, altOpen, WORLD_WAIT } from '../src/constellation.ts';
import { openSeaSection, farSleepSection } from '../src/landscape.ts';
import { regionSettled } from '../src/world.ts';
import { hamletSection } from '../src/settlements.ts';
import { farDomainCentre, farCivCentre, farCivAt } from '../src/far-realms.ts';
import { canyonIdFor } from '../src/canyon.ts';
import { ensureSeeds } from '../src/skylands.ts';
import { hashSeed } from '../src/random.ts';
import { Game } from '../src/game.ts';

const band = (tier) => APERTURE_BANDS[tier].threshold;
const v1Save = (seed = 'PHASE8') => { const s = freshSave(); s.seed = seed; return startJourney(s, {}); };
const classicSave = (seed = 'PHASE8-C') => { const s = freshSave(); s.seed = seed; return startJourney(s, { mode: 0 }); };
// Infinite III with a Listener felled, every discipline mastered: everything today's rules open is open.
function rich(s, tier = 13) {
  s.perception.aperture = band(tier); s.farArray.listeners = 1; s.level = 30;
  s.magicSkills.learned = { 'ember-form': 5, quickening: 5, 'veil-guard': 5, 'force-channel': 5, 'rift-step': 5 };
  s.constellation.mods = { 'ember-skin': true, 'light-feet': true, 'thorned-veil': true, overflow: true, 'rift-wake': true };
  s.constellation.caps = { form: 'cinder-heart', motion: 'slipstream', veil: 'sanctuary', force: 'resonant-force', rift: 'anchor' };
  s.constellation.caps2 = { veil: 'mirror-veil', form: 'colossus', force: 'amplifier', rift: 'fold' };
  s.constellation.bonus = 60;
  return s;
}
const P8_QUESTS = QUEST_IDS.filter((id) => id !== 'essence-walk');
const P8 = STORY_WITHHELD.filter((id) => !PHASE7_STORY.includes(id));
// Holds every quest but `ids` aside (kept), so only those open.
const only = (s, ...ids) => { s.progression.kept = [...s.progression.kept, ...QUEST_IDS.filter((q) => !ids.includes(q)).map((q) => QUESTS[q].ability)]; return s; };
const enter = (g, s, id, rx, ry) => { s.session.activeDungeonId = id; s.session.dungeonReturn = { rx, ry, x: 16, y: 16 }; g.rx = rx; g.ry = ry; g.loadArea('dungeon', false); g.enemies = []; };
const foe = (g, kind, extra = {}) => { const e = g.createEnemyFromSpawn({ id: `t-${kind}-${Math.random()}`, kind, x: g.player.x + 1, y: g.player.y, ...extra }, g.area); g.enemies.push(e); return e; };
const fell = (g, e) => { e.hp = 0; e.dead = true; g.defeatEnemy(e); };

test('the designed set: Exploration withholds every b, d and V row (and the c and R ones), exactly; nothing waits any more', () => {
  const designed = PROGRESSION_ROWS.filter((r) => ['b', 'd', 'V', 'c', 'R'].includes(r.v1.route) && !STORY_OWN[r.id]).map((r) => r.id).sort();
  assert.deepEqual([...WORLD_WITHHELD, ...STORY_WITHHELD].sort(), designed, 'the withheld set is the whole designed set');
  assert.deepEqual(Object.keys(STORY_LATER), [], 'no b or d row waits for a later phase');
  assert.equal(STORY.table, 5); assert.equal(EXPLORATION.table, STORY.table); assert.equal(EXPLORATION.storyTable, STORY.phase7Table);
  for (const id of STORY_WITHHELD) assert.equal(STORY_ROUTE_OF[id], ROW_BY_ID[id].v1.route, id);
  for (const id of P8) assert.equal(STORY_SINCE[id], 5, id); for (const id of PHASE7_STORY) assert.equal(STORY_SINCE[id], 4, id);
  assert.deepEqual(P8.filter((id) => STORY_ROUTE_OF[id] === 'b').sort(), P8_QUESTS.map((q) => QUESTS[q].ability).sort());
  assert.deepEqual(VISCERA_IDS.slice().sort(), PROGRESSION_ROWS.filter((r) => r.v1.route === 'V').map((r) => r.id).sort(), 'the four Viscera forms');
  // the four that exist only past 1,000 sections (design 3.10): two quests here, two far threads (Phase 7)
  assert.deepEqual(PROGRESSION_ROWS.filter((r) => ['b', 'd'].includes(r.v1.route) && r.tier === 'R5').map((r) => r.name).sort(), ['Continuous Assault', 'Ember Mend', "Mage's Hand", 'Wellspring']);
  for (const id of ['ember-mend', 'wellspring']) assert.equal(QUESTS[id].gate.far, 1000, id);
  for (const set of ['tallSlates', 'tinkerTags']) assert.equal(THREADS[set].band, 'beyond', set);
  // the moved quests say so, and every step is a verb of 2.8
  assert.deepEqual(Object.keys(MOVED).sort(), ['field:blade-stream', 'field:tempo']);
  for (const id of QUEST_IDS) for (const st of QUESTS[id].steps) assert.ok(['act', 'defeat', 'reach', 'survive', 'clear', 'use'].includes(st.verb), `${id}:${st.key}`);
  // in a game where today's rules open everything, the game refuses each until earned
  const s = rich(v1Save('WITHHOLD8')), a = ownership(s);
  for (const id of P8) { assert.equal(a[id], 'locked', id); assert.ok(['owned', 'open'].includes(stateV0(s, ROW_BY_ID[id])), `${id}: Classic's rules have it`); assert.ok(storyWithheld(s, id) && worldWithheld(s, id), id); }
  for (const id of P8.filter((q) => q.startsWith('field:'))) assert.deepEqual(toggleLatticePassive(s, id), { ok: false, message: WORLD_WAIT }, id);
  assert.deepEqual(learnExtra(s, 'rift', 'glyph-mine'), { ok: false, message: WORLD_WAIT });
  for (const node of ['colossus', 'overflow', 'light-feet', 'thorned-veil', 'amplifier', 'fold']) { assert.equal(altOpen(s, node), false, node); assert.equal(toggleAlt(s, node).ok, false, node); }
  // kept is honoured; Classic withholds nothing
  const k = rich(v1Save('KEPT8')); k.progression.kept = [...k.progression.kept, ...P8];
  for (const id of P8) assert.ok(!worldWithheld(k, id), id); assert.ok(toggleLatticePassive(k, 'field:tempo').ok); assert.ok(learnExtra(k, 'rift', 'glyph-mine').ok); assert.ok(toggleAlt(k, 'colossus').ok);
  const c = rich(classicSave('CLASSIC8')); for (const id of P8) { assert.ok(!storyWithheld(c, id), id); assert.equal(ownership(c)[id], stateV0(c, ROW_BY_ID[id]), id); }
});

test('save.quests: Phase 8 fields (counts, tokens, window, giverAt; a place\'s miss/fixed/flag) normalised, unknown fields kept, round trip', () => {
  const f = freshSave(); assert.deepEqual(f.quests, { v: 1, open: {}, threads: {} }, 'nothing new until used');
  const odd = JSON.parse(JSON.stringify(f));
  odd.quests = { open: { 'corridor-golem': { state: 'open', at: 5, steps: {}, places: [{ step: 'golems', rx: 4, ry: 4, dungeon: 'c', miss: true }, { step: 'golems', rx: 5, ry: 6 }],
    counts: { golems: 3.7, bad: -2, x: 'y' }, tokens: [{ id: 'corridor-golem:golems:4', step: 'golems', area: 'canyon:x', x: 3.4, y: 7 }, { id: 9 }, 'no'], window: { step: 'w', at: 'x' }, seq: 4, giverAt: { rx: 2, ry: -1 }, mine: 1 },
    'blade-stream': { state: 'open', at: 0, steps: {}, places: [], window: { step: 'lamps', at: 100, n: 2 }, giverAt: 'here' } }, future: 'kept' };
  const q = migrateSave(odd).quests;
  assert.deepEqual(q.open['corridor-golem'], { state: 'open', at: 5, steps: {}, places: [{ step: 'golems', rx: 4, ry: 4, dungeon: 'c', miss: true }, { step: 'golems', rx: 5, ry: 6 }],
    counts: { golems: 3 }, tokens: [{ id: 'corridor-golem:golems:4', step: 'golems', area: 'canyon:x', x: 3, y: 7 }], seq: 4, giverAt: { rx: 2, ry: -1 }, mine: 1 });
  assert.deepEqual(q.open['blade-stream'].window, { step: 'lamps', at: 100, n: 2 }); assert.equal(q.open['blade-stream'].giverAt, undefined); assert.equal(q.future, 'kept');
  assert.ok(QUEST_RECORD.openMax >= QUEST_IDS.length && QUEST_RECORD.tokensMax >= 5);
  // a game in progress survives a save round trip
  const s = only(rich(v1Save('ROUND8')), 'corridor-golem'); new Game(s, 0); assert.ok(questOpen(s, 'corridor-golem'));
  s.quests.open['corridor-golem'].counts = { golems: 2 }; s.quests.open['corridor-golem'].tokens = [{ id: 'corridor-golem:golems:3', step: 'golems', area: 'canyon:a', x: 4, y: 5 }];
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.quests, s.quests);
});

test('search bounds: each kind searches its own bounded window once, far steps only at least that far out on a seeded bearing, kept and never moved', () => {
  assert.deepEqual(Object.keys(QUEST_PLACES.radii).sort(), ['canyon', 'pentagon', 'revenant', 'skyway', 'starfield', 'wreck']);
  for (const r of Object.values(QUEST_PLACES.radii)) assert.ok(r > 0 && r <= 48);
  const places = {}; for (const id of P8_QUESTS) for (const st of QUESTS[id].steps) if (st.place) places[st.place] = (places[st.place] || 0) + 1;
  for (const k of Object.keys(places)) assert.ok(QUEST_PLACES.radii[k] || ['caldera', 'storm'].includes(k), k);
  const s = rich(v1Save('BOUNDS')); useJourneyFrame(s);
  for (const id of P8_QUESTS) {
    const t0 = performance.now(); openQuest(s, id); assert.ok(performance.now() - t0 < 2000, `${id}: bounded`);
    for (const st of QUESTS[id].steps.filter((q) => q.place)) {
      const p = stepPlace(s, id, st.key); assert.ok(p, `${id}:${st.key}`);
      if (p.relaxed || p.fixed) continue;
      const c = st.far ? farCentre(s.seed, id, st.far) : QUESTS[id].from;
      assert.ok(Math.max(Math.abs(p.rx - c.rx), Math.abs(p.ry - c.ry)) <= QUEST_PLACES.radii[st.place], `${id}: inside its window`);
      if (st.far) assert.ok(Math.hypot(p.rx, p.ry) >= st.far, `${id}: at least ${st.far} out`);
      // kept: asked again, the same place, and no new search (the record does not grow)
      const n = s.quests.open[id].places.length; for (let i = 0; i < 3; i++) assert.deepEqual(questPlace(s, id, st.key), p); assert.equal(s.quests.open[id].places.length, n);
    }
  }
  // the bearing of a far step is seeded: different journeys, different sectors
  const bearings = new Set(); for (let i = 0; i < 40; i++) { const c = farCentre(`B-${i}`, 'tempo', 50); bearings.add(Math.round(Math.atan2(c.ry, c.rx) * 2)); } assert.ok(bearings.size >= 8);
  // the R5 places are the far realms' own: 1,000 sections and more
  assert.deepEqual([stepPlace(s, 'ember-mend', 'caldera').rx, stepPlace(s, 'ember-mend', 'caldera').ry], [farDomainCentre(s.seed, 'questingBeast').rx, farDomainCentre(s.seed, 'questingBeast').ry]);
  assert.deepEqual([stepPlace(s, 'wellspring', 'warden').rx, stepPlace(s, 'wellspring', 'warden').ry], [farCivCentre(s.seed, 'storm').rx, farCivCentre(s.seed, 'storm').ry]);
  // a place found empty gives way to the next, saved after it
  const p = stepPlace(s, 'arc-wave', 'wrecks'); questArrive(s, { area: 'overworld', rx: p.rx, ry: p.ry, objects: [] });
  assert.equal(p.miss, true); const next = stepPlace(s, 'arc-wave', 'wrecks'); assert.notDeepEqual([next.rx, next.ry], [p.rx, p.ry]); assert.ok(!next.miss);
});

test('eligible quests open without an admission cap; an old journey with three unfinished quests receives the fourth on the ordinary offer path', () => {
  const s = rich(v1Save('LIMIT8')); s.explored['1001,0'] = true; const g = new Game(s, 0);
  assert.equal(openQuestCount(s), QUEST_IDS.length); assert.ok(QUEST_IDS.every((id) => questOpen(s, id)));
  const old = only(rich(v1Save('OLD-LIMIT8')), ...QUEST_IDS.slice(0, 4));
  for (const id of QUEST_IDS.slice(0, 3)) openQuest(old, id);
  assert.equal(openQuestCount(old), 3); assert.equal(questOpen(old, QUEST_IDS[3]), false);
  const ordinary = new Game(old, 0);
  assert.equal(openQuestCount(old), 4); assert.ok(questOpen(old, QUEST_IDS[3]));
  assert.ok((ordinary.questNotices || []).some((q) => q.title === 'A QUEST' && q.detail.includes(QUESTS[QUEST_IDS[3]].title)));
  const near = rich(v1Save('FAR-GATE')); only(near, 'ember-mend', 'wellspring'); assert.equal(farthest(near), 0);
  assert.equal(questDue(near, 'ember-mend', 13), false, 'not before 1,000 sections');
  near.explored['-700,-800'] = true; assert.ok(farthest(near) >= 1000); assert.ok(questDue(near, 'ember-mend', 13) && questDue(near, 'wellspring', 13));
});

test('Corridor Golem: five Earth Golems in canyon craters, each heart collected with Act, then Shale at the quarry', () => {
  const s = only(rich(v1Save('GOLEM8'), 3), 'corridor-golem'), g = new Game(s, 0); assert.ok(questOpen(s, 'corridor-golem'));
  assert.ok((g.questNotices || []).some((q) => q.title === 'A QUEST' && /Hearts of Clay/.test(q.detail)));
  const p = stepPlace(s, 'corridor-golem', 'golems'); assert.equal(p.dungeon, canyonIdFor(s.seed, p.rx, p.ry));
  assert.ok(s.quests.open['corridor-golem'].giverAt, 'Shale stands at the quarry');
  // a golem elsewhere does not count; one in a crater leaves a heart
  enter(g, s, `dungeon:${s.seed}:g1:3:3:x`, 3, 3); fell(g, foe(g, 'earthGolem')); assert.equal(g.map.objects.filter((o) => o.kind === 'questToken').length, 0);
  enter(g, s, p.dungeon, p.rx, p.ry); assert.ok(g.questWhere().includes('canyon'));
  fell(g, foe(g, 'crystalCrab')); assert.equal(g.map.objects.filter((o) => o.kind === 'questToken').length, 0, 'only golems');
  fell(g, foe(g, 'earthGolem')); const heart = g.map.objects.find((o) => o.kind === 'questToken'); assert.ok(heart, 'a heart where it fell'); assert.equal(heart.name, "Golem's heart");
  // left lying, it is laid again when the crater loads
  g.loadArea('dungeon', false); assert.ok(g.map.objects.some((o) => o.id === heart.id));
  const lying = g.map.objects.find((o) => o.id === heart.id); assert.match(g.questTokenAct(lying).message, /1 of 5/); assert.equal(stepCount(s, 'corridor-golem', 'golems'), 1);
  for (let i = 0; i < 4; i++) { g.enemies = []; fell(g, foe(g, 'earthGolem')); g.questTokenAct(g.map.objects.find((o) => o.kind === 'questToken')); }
  assert.equal(questStep(s, 'corridor-golem').key, 'shale'); assert.match(g.message, /Take them to Shale/);
  assert.equal(questTarget(s, 'corridor-golem').rx, s.quests.open['corridor-golem'].giverAt.rx, 'the compass points at the quarry');
  // a sixth golem leaves nothing: enough are held
  g.enemies = []; fell(g, foe(g, 'earthGolem')); assert.equal(g.map.objects.filter((o) => o.kind === 'questToken').length, 0);
  // Shale takes them
  const r = questSpeak(s, 'quarry-keeper'); assert.match(r.line, /small stone man/); assert.deepEqual(r.done, ['corridor-golem']);
  g.questDone(r.done); assert.ok(earnedWorld(s, 'field:corridor-golem')); assert.equal(s.feats.earned['field:corridor-golem'].route, 'b');
  assert.ok(!worldWithheld(s, 'field:corridor-golem')); assert.equal(ownership(s)['field:corridor-golem'], 'open', 'found; it waits for the Lattice');
  s.perception.aperture = band(13); assert.ok(toggleLatticePassive(s, 'field:corridor-golem').ok); assert.match(hintFor(s, 'row:field:corridor-golem').text, /^Corridor Golem, from Shale's quest: /);
});

test('Glyph Mine: five Vein Wraiths in the Hollow Husk, their sigils collected, then Sela', () => {
  const s = only(rich(v1Save('HUSK8'), 10), 'glyph-mine'), g = new Game(s, 0); assert.ok(questOpen(s, 'glyph-mine'));
  assert.equal(stepPlace(s, 'glyph-mine', 'wraiths'), null, 'no section: any Pumice Seed at any shrine'); assert.match(questLeads(s)[0].detail, /Hollow Husk/);
  ensureSeeds(s).pumice = 1; g.rx = 0; g.ry = 0; g.loadArea('overworld', false);
  const tomb = { kind: 'watcherTomb', id: 'test-tomb', x: g.player.x, y: g.player.y, where: 'field' }; g.map.objects.push(tomb);
  assert.ok(g.enterSeedRealm(tomb, 'pumice').ok); assert.equal(g.map.seedRealm.realm, 'husk'); assert.ok(g.questWhere().includes('husk'));
  g.enemies = []; for (let i = 0; i < 5; i++) { fell(g, foe(g, 'veinWraith')); g.questTokenAct(g.map.objects.find((o) => o.kind === 'questToken')); }
  assert.equal(questStep(s, 'glyph-mine').key, 'sela');
  const r = questSpeak(s, 'keeper-sela'); assert.match(r.line, /under your feet/); g.questDone(r.done); assert.ok(earnedWorld(s, 'glyph-mine')); assert.ok(learnExtra(s, 'rift', 'glyph-mine').ok);
});

test('Arc Wave: three shipwrecks salvaged with the Blunderbuss equipped (out at sea: a boat); without it nothing counts', () => {
  const s = only(rich(v1Save('WRECK8'), 10), 'arc-wave'), g = new Game(s, 0); const p = stepPlace(s, 'arc-wave', 'wrecks');
  assert.ok(openSeaSection(s.seed, p.rx, p.ry), 'open sea: reachable by boat'); assert.equal(p.flag, `wreck-${p.rx}-${p.ry}`);
  g.rx = p.rx; g.ry = p.ry; g.loadArea('overworld', false); const wreck = g.map.objects.find((o) => o.kind === 'shipwreck'); assert.ok(wreck, 'the wreck is there');
  Object.assign(g.player, { x: wreck.x, y: wreck.y + 1 }); g.interact(wreck.id, 'salvage'); assert.equal(stepCount(s, 'arc-wave', 'wrecks'), 0, 'the Spark Coil does not count');
  s.equipment.secondary = { ...s.equipment.secondary, id: 'secondary-needle-caster', name: 'Blunderbuss', upgradeRank: 6 };
  for (let i = 0; i < 3; i++) questEvent(s, { on: 'salvage', with: 'blunderbuss', rx: 9, ry: 9 });
  assert.ok(!questOpen(s, 'arc-wave') && s.quests.open['arc-wave'].state === 'done');
});

test('Power Aegis: a Gate Revenant whose blow the Aegis turned, felled at least 50 sections out; nearer, or unturned, does not count', () => {
  const s = only(rich(v1Save('AEGIS8'), 11), 'power-aegis'), g = new Game(s, 0), p = stepPlace(s, 'power-aegis', 'revenant');
  assert.ok(Math.hypot(p.rx, p.ry) >= 50 && p.dungeon);
  enter(g, s, p.dungeon, p.rx, p.ry); g.enemies = [];
  fell(g, foe(g, 'gateRevenant', { gatePredator: true })); assert.ok(questOpen(s, 'power-aegis'), 'not turned');
  const near = foe(g, 'gateRevenant', { gatePredator: true }); g.aegisUntil = 1e12; g.parryBlow(near, 1000, 10); assert.equal(near.aegisTurned, true);
  s.session.dungeonReturn = { rx: 10, ry: 10, x: 16, y: 16 }; fell(g, near); assert.ok(questOpen(s, 'power-aegis'), '10 sections out');
  s.session.dungeonReturn = { rx: p.rx, ry: p.ry, x: 16, y: 16 }; const far = foe(g, 'gateRevenant', { gatePredator: true }); g.parryBlow(far, 1000, 10); fell(g, far);
  assert.ok(earnedWorld(s, 'field:power-aegis')); s.perception.aperture = band(13); assert.ok(toggleLatticePassive(s, 'field:power-aegis').ok);
});

test('Blade Stream (moved to a Pentagon): three Grave Lanterns within two minutes of the first; a slow third starts again', () => {
  const s = only(rich(v1Save('LAMP8'), 9), 'blade-stream'); openQuest(s, 'blade-stream');
  const kill = (at) => questEvent(s, { on: 'kill', kind: 'graveLantern', where: ['pentagon'], at });
  kill(100); kill(150); assert.equal(stepCount(s, 'blade-stream', 'lamps'), 2); kill(400); assert.equal(stepCount(s, 'blade-stream', 'lamps'), 1, 'the first relit');
  questEvent(s, { on: 'kill', kind: 'graveLantern', where: [], at: 410 }); assert.equal(stepCount(s, 'blade-stream', 'lamps'), 1, 'only in a Pentagon');
  kill(420); const r = kill(430); assert.deepEqual(r.done, ['blade-stream']);
  const p = stepPlace(s, 'blade-stream', 'lamps'); assert.ok(pentagonPlaceAt(s, p.rx, p.ry) || p.relaxed === undefined);
});

test('Tempo (moved to the sky): the metronome on a Skyland at least 50 out, wound with Act, then that Skyland cleared', () => {
  const s = only(rich(v1Save('TEMPO8'), 9), 'tempo'), g = new Game(s, 0), p = stepPlace(s, 'tempo', 'wind');
  assert.ok(Math.hypot(p.rx, p.ry) >= 50 && skywayAt({ ...s, atlas: {} }, p.rx, p.ry));
  assert.deepEqual(questLay(s, { areaId: 'skyland:x', skyland: { rx: 3, ry: 3 } }), [], 'not on a near Skyland');
  const sky = `skyland:${s.seed}:${p.rx},${p.ry}:m0:t0:r1`; enter(g, s, sky, p.rx, p.ry);
  const metro = g.map.objects.find((o) => o.kind === 'questToken'); assert.ok(metro, 'the metronome stands on the first island'); assert.deepEqual(metro.actions, ['wind']);
  assert.match(g.questTokenAct(metro).message, /wind the metronome/); assert.equal(questStep(s, 'tempo').key, 'beat');
  g.questPlaceCleared('skyland', { rx: 1, ry: 1 }); assert.ok(questOpen(s, 'tempo'), 'another Skyland does not count');
  g.questPlaceCleared('skyland', { rx: p.rx, ry: p.ry }); assert.ok(earnedWorld(s, 'field:tempo'));
});

test('Ember Mend and Wellspring (R5): the Questing Beast comes home to the caldera; a Coil Warden felled in the Storm Halls under Force Channel', () => {
  const s = only(rich(v1Save('FAR8')), 'ember-mend', 'wellspring'); s.explored['900,700'] = true; const g = new Game(s, 0);
  assert.ok(questOpen(s, 'ember-mend') && questOpen(s, 'wellspring')); assert.ok((g.questNotices || []).some((q) => /far out, something calls/.test(q.detail)));
  const c = stepPlace(s, 'ember-mend', 'caldera'); g.rx = c.rx; g.ry = c.ry; g.loadArea('overworld', false); assert.equal(g.map.farDomain, 'questingBeast', 'the caldera stands there');
  g.domainVisit.clock = g.domainVisit.wait; g.domainTick(0.1); assert.ok(earnedWorld(s, 'colossus:alt')); assert.ok(toggleAlt(s, 'colossus').ok);
  const w = stepPlace(s, 'wellspring', 'warden'); assert.equal(farCivAt(s.seed, w.rx + .5, w.ry + .5)?.id, 'storm');
  g.rx = w.rx; g.ry = w.ry; g.loadArea('overworld', false); g.enemies = []; assert.ok(g.questWhere().includes('storm'));
  fell(g, foe(g, 'coilWarden')); assert.ok(questOpen(s, 'wellspring'), 'Force Channel was not holding');
  s.magicSkills.active = { id: 'force-channel', remaining: 10 }; fell(g, foe(g, 'coilWarden')); assert.ok(earnedWorld(s, 'overflow:alt'));
});

test('Divine Viscera: the price table; the forms and the rumour sold at Sela\'s forge and every smith once refinement opens', () => {
  assert.deepEqual(VISCERA_SHOP, { forms: { 'light-feet:alt': 8, 'thorned-veil:alt': 8, 'amplifier:alt': 10, 'fold:alt': 10 }, rumour: 3 });
  for (const [id, n] of Object.entries(VISCERA_SHOP.forms)) { assert.ok(Number.isInteger(n) && n > 0); assert.equal(ROW_BY_ID[id].v1.route, 'V'); }
  const s = rich(v1Save('VISCERA8')); s.skylands = { ...(s.skylands || {}), viscera: 30 };
  assert.equal(visceraShop(s).open, false); assert.match(buyVisceraForm(s, 'fold:alt').message, /refinement opens it/); assert.equal(ownership(s)['fold:alt'], 'locked');
  s.refinement = { ...(s.refinement || {}), unlocked: true }; assert.equal(ownership(s)['fold:alt'], 'open');
  assert.match(compendium(s).groups.find((x) => x.id === 'forms').entries.find((e) => e.id === 'fold:alt').label, /10 Divine Viscera at Sela's forge or any smith/);
  const r = buyVisceraForm(s, 'fold:alt', 'forge'); assert.ok(r.ok); assert.equal(s.skylands.viscera, 20); assert.equal(s.feats.earned['fold:alt'].route, 'V'); assert.equal(s.feats.earned['fold:alt'].paid, 10);
  assert.ok(toggleAlt(s, 'fold').ok); assert.equal(buyVisceraForm(s, 'fold:alt').ok, false, 'once'); assert.equal(visceraSells(s, 'fold:alt'), false);
  assert.match(howToPage(s, 'fold:alt').sections.find(([k]) => k === 'Where it came from')[1], /Bought for 10 Divine Viscera.*Sela's forge/);
  s.skylands.viscera = 2; assert.match(buyVisceraForm(s, 'light-feet:alt').message, /takes 8 Divine Viscera; you hold 2/);
  // the rumour: the nearest ability still unknown becomes a hinted lead, rumoured in the compendium
  s.skylands.viscera = 9; const before = liveRumours(s).length, q = buyVisceraRumour(s, 0, 0); assert.ok(q.ok, q.message); assert.equal(s.skylands.viscera, 6);
  assert.equal(liveRumours(s).length, before + 1); assert.ok(boughtRumour(s, q.rumour.ability)); assert.equal(ownership(s)[q.rumour.ability], 'rumoured');
  const e = compendium(s).groups.flatMap((x) => x.entries).find((x) => x.id === q.rumour.ability); assert.match(e.label, /^Rumoured: /);
  const q2 = buyVisceraRumour(s, 0, 0); assert.notEqual(q2.rumour.ability, q.rumour.ability, 'the next one');
  // found, the rumour is spent
  grantWorld(s, q.rumour.ability, STORY_ROUTE_OF[q.rumour.ability] || 'R', 'test'); assert.ok(!liveRumours(s).some((x) => x.ability === q.rumour.ability));
  // Classic: a form its rules give is not sold; before Infinite III one is (an extra route, given early)
  const c = rich(classicSave('VISCERA-C')); c.refinement = { unlocked: true }; c.skylands = { viscera: 50 }; assert.equal(visceraSells(c, 'fold:alt'), false);
  const e2 = rich(classicSave('VISCERA-C2'), 11); e2.refinement = { unlocked: true }; e2.skylands = { viscera: 50 }; assert.ok(visceraSells(e2, 'fold:alt')); assert.ok(buyVisceraForm(e2, 'fold:alt').ok); assert.ok(altOpen(e2, 'fold'));
  // the shelf is drawn at both
  const main = readFileSync('src/main.ts', 'utf8'); assert.match(main, /visceraShelf\(body,'smith'/); assert.match(main, /visceraShelf\(body,'forge'/);
});

test('the guardian roster: seeded per journey and ring, deterministic, only for crossings first entered under Exploration', () => {
  assert.deepEqual([...GUARDIAN_ROSTER.rings], [6, 18, 50]);
  for (let ring = 0; ring < 3; ring++) { assert.deepEqual(guardianRoster('R-A', ring), guardianRoster('R-A', ring)); assert.deepEqual([...guardianRoster('R-A', ring)].sort(), [...GUARDIAN_POOL].sort()); }
  const firsts = new Set(); for (let i = 0; i < 40; i++) firsts.add(guardianRoster(`R-${i}`, 0).slice(0, GUARDIAN_ROSTER.favoured).join()); assert.ok(firsts.size >= 35, 'journeys differ');
  assert.equal(rosterRing(3, 3), 0); assert.equal(rosterRing(10, 0), 1); assert.equal(rosterRing(30, 30), 2); assert.equal(rosterRing(60, 0), null); assert.equal(rosterGuardianKind('R-A', 80, 0, 'x'), null);
  // the favoured kinds are commonest near the Refuge
  const fav = new Set(guardianRoster('R-A', 0).slice(0, GUARDIAN_ROSTER.favoured)); let n = 0; const N = 4000;
  for (let i = 0; i < N; i++) { const k = rosterGuardianKind('R-A', 2, 1, `crossing-${i}`); assert.equal(k, rosterGuardianKind('R-A', 2, 1, `crossing-${i}`)); if (fav.has(k)) n++; }
  const share = GUARDIAN_ROSTER.favoured * GUARDIAN_ROSTER.weight / (GUARDIAN_ROSTER.favoured * GUARDIAN_ROSTER.weight + GUARDIAN_POOL.length - GUARDIAN_ROSTER.favoured);
  assert.ok(Math.abs(n / N - share) < .04, `${n / N} vs ${share}`);
  // in the game: an Exploration crossing records the roster; a Classic one keeps today's pick
  const pick = (s) => { const g = new Game(s, 0); for (let i = 0; i < 30; i++) { const id = `dungeon:${s.seed}:g1:2:1:dungeon-g1-2-1-${i}`; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 2, ry: 1, x: 16, y: 16 }; g.rx = 2; g.ry = 1; try { g.loadArea('dungeon', false); } catch { continue; } const h = s.consequences.dungeons[id]; if (h?.guardianKind) return { h, id }; } return null; };
  const v = pick(v1Save('ROSTER-V1')); assert.ok(v); assert.equal(v.h.guardianRoster, GUARDIAN_ROSTER.version);
  const c = pick(classicSave('ROSTER-V0')); assert.ok(c); assert.equal(c.h.guardianRoster, undefined); assert.equal(c.h.guardianKind, c.h.ladder ? c.h.guardianKind : guardianKindFor(c.h.guardianKind && 'ROSTER-V0', c.id));
});

test('Classic: the Phase 8 quests are extra routes (given early), consolation once its rules give it; switching never removes anything', () => {
  // before the Lattice opens Classic does not give Corridor Golem: the quest opens and gives it early
  const c = classicSave('EXTRA8'); c.perception.aperture = band(3); const g = new Game(c, 0); assert.ok(questOpen(c, 'corridor-golem'));
  const p = stepPlace(c, 'corridor-golem', 'golems'); enter(g, c, p.dungeon, p.rx, p.ry);
  for (let i = 0; i < 5; i++) { g.enemies = []; fell(g, foe(g, 'earthGolem')); g.questTokenAct(g.map.objects.find((o) => o.kind === 'questToken')); }
  g.questDone(questSpeak(c, 'quarry-keeper').done); assert.equal(c.feats.earned['field:corridor-golem'].dust, undefined); assert.ok(c.progression.kept.includes('field:corridor-golem'));
  // with the Lattice open Classic gives it already: no quest is offered for it
  const k = rich(classicSave('EXTRA8-K')); new Game(k, 0); assert.equal(questOpen(k, 'corridor-golem'), false);
  // a quest under way in Exploration, finished after a switch to Classic: the consolation
  const s = only(rich(v1Save('SWITCH8')), 'blade-stream'); new Game(s, 0); assert.ok(questOpen(s, 'blade-stream'));
  assert.ok(switchProgression(s, 0).ok); s.materials.lumenDust = 0;
  for (const at of [1, 2, 3]) { const r = questEvent(s, { on: 'kill', kind: 'graveLantern', where: ['pentagon'], at }); if (r.done.length) new Game(s, 0).questDone(r.done); }
  assert.equal(s.feats.earned['field:blade-stream'].dust, RELIQUARY.consolation.dust); assert.equal(s.materials.lumenDust, RELIQUARY.consolation.dust);
  assert.ok(switchProgression(s, 1).ok); assert.ok(!worldWithheld(s, 'field:blade-stream'), 'kept across the switch');
});

test('an in-progress journey keeps what it had: table 4 adopts table 5 with Phase 8\'s rows today\'s rules had open; its quests keep', () => {
  const s = rich(v1Save('ADOPT8')); s.progression.table = EXPLORATION.storyTable; assert.ok(!exploring(s));
  openQuest(s, 'essence-walk'); s.quests.open['essence-walk'].steps.meal = 10; const rec = JSON.stringify(s.quests);
  const n = adoptExploration(s); assert.ok(n >= P8.length - 2); assert.equal(s.progression.table, 5); assert.ok(exploring(s));
  for (const id of P8) { assert.ok(s.progression.kept.includes(id), id); assert.ok(!worldWithheld(s, id), id); }
  for (const id of PHASE7_STORY) assert.ok(!s.progression.kept.includes(id) || stateV0(s, ROW_BY_ID[id]) !== 'locked', `${id}: Phase 7's are not re-adopted`);
  assert.equal(JSON.stringify(s.quests), rec, 'the quest under way is untouched');
  // before Infinite III nothing of the Lattice or the forms was open: those stay withheld from now on
  const e = rich(v1Save('ADOPT8-EARLY'), 11); e.progression.table = EXPLORATION.storyTable; adoptExploration(e);
  for (const id of ['field:tempo', 'field:power-aegis', 'colossus:alt', 'fold:alt']) { assert.ok(!e.progression.kept.includes(id), id); assert.ok(worldWithheld(e, id), id); }
  assert.ok(e.progression.kept.includes('glyph-mine'), 'Glyph Mine was open (Rift Step has a rank)');
  // through the game, from a real old save shape (migrateSave)
  const g = rich(v1Save('ADOPT8-GAME')); g.progression.table = 4; g.lattice = { ...(g.lattice || {}), passives: ['field:tempo'] };
  const back = migrateSave(JSON.parse(JSON.stringify(g))); new Game(back, 0); assert.equal(back.progression.table, 5); assert.ok(back.progression.kept.includes('field:tempo'));
  // a Classic journey is never touched
  const c = classicSave('ADOPT8-C'); c.progression.table = 4; assert.equal(adoptExploration(c), 0); assert.equal(c.progression.table, 4);
});

test('G6, 1,000 seeds: every Phase 8 step resolves to reachable ground inside its bounds, deterministic per seed', () => {
  const t0 = Date.now(), dist = {}, relaxed = {};
  for (let i = 0; i < 1000; i++) {
    const seed = `G6-${i}`, s = rich(v1Save(seed)); useJourneyFrame(s); s.explored['1000,1'] = true;
    for (const id of P8_QUESTS) {
      openQuest(s, id);
      for (const st of QUESTS[id].steps.filter((q) => q.place)) {
        const p = stepPlace(s, id, st.key), k = `${id}:${st.key}`; assert.ok(p, `${seed}: ${k}`);
        if (p.relaxed) { relaxed[k] = (relaxed[k] || 0) + 1; continue; }
        if (!p.fixed) assert.ok(!(p.rx === 0 && p.ry === 0) && !regionSettled(p.rx, p.ry, seed) && !hamletSection(seed, p.rx, p.ry), `${seed}: ${k} not a town`); // a domain is built whole over whatever was there
        if (st.place === 'wreck') assert.ok(openSeaSection(seed, p.rx, p.ry), `${seed}: a wreck lies at sea (by boat)`);
        else if (!p.fixed) assert.ok(!openSeaSection(seed, p.rx, p.ry), `${seed}: ${k} on land, no boat asked for`);
        if (st.far) assert.ok(Math.hypot(p.rx, p.ry) >= st.far, `${seed}: ${k} far enough`);
        if (QUESTS[id].tier === 'R5') assert.ok(Math.hypot(p.rx, p.ry) >= 1000, `${seed}: ${k} past 1,000`);
        const re = { canyon: canyonAt, wreck: wreckAt, skyway: skywayAt, revenant: revenantAt, pentagon: pentagonPlaceAt }[st.place];
        if (re) assert.ok(re(s, p.rx, p.ry), `${seed}: ${k} holds what it should by its own hashes`);
        if (st.place === 'storm') assert.equal(farCivAt(seed, p.rx + .5, p.ry + .5)?.id, 'storm');
        (dist[k] ||= []).push(Math.round(Math.hypot(p.rx, p.ry)));
        if (i % 100 === 0) { const again = rich(v1Save(seed)); again.explored['1000,1'] = true; openQuest(again, id); assert.deepEqual(stepPlace(again, id, st.key), p, `${seed}: ${k} the same place`); }
      }
    }
  }
  useJourneyFrame(freshSave());
  const out = Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, { min: Math.min(...v), avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), max: Math.max(...v), relaxed: relaxed[k] || 0 }]));
  console.log('G6 Phase 8 places (sections from the Refuge, 1,000 seeds):', JSON.stringify(out));
  for (const [k, v] of Object.entries(out)) assert.equal(v.relaxed, 0, `${k}: relaxed on ${v.relaxed} seeds`);
  assert.ok(Date.now() - t0 < 120000, 'the searches are bounded');
});

test('G6 on the ground: each place pointed at holds what it promised within a few steps (a miss gives way to the next)', () => {
  const hops = {};
  for (let i = 0; i < 6; i++) {
    const s = rich(v1Save(`G6-GROUND8-${i}`)), g = new Game(s, 0);
    for (const id of ['corridor-golem', 'tempo', 'blade-stream', 'arc-wave', 'power-aegis']) openQuest(s, id);
    for (const [id, key, holds] of [['corridor-golem', 'golems', (m) => m.objects.some((o) => String(o.id).startsWith('canyon-crater-'))], ['tempo', 'wind', (m) => m.objects.some((o) => o.kind === 'skyStair')],
      ['blade-stream', 'lamps', (m) => !!m.pentagon], ['arc-wave', 'wrecks', (m) => m.objects.some((o) => o.kind === 'shipwreck')], ['power-aegis', 'revenant', null]]) {
      let n = 0, ok = false;
      for (; n < 10 && !ok; ) {
        const p = questPlace(s, id, key); n++; assert.ok(p && !p.relaxed, `${id}`);
        g.rx = p.rx; g.ry = p.ry; g.loadArea('overworld', false);
        if (holds) ok = holds(g.map);
        else if (!p.miss) { enter(g, s, p.dungeon, p.rx, p.ry); g.loadArea('dungeon', false); ok = !p.miss; s.session.activeDungeonId = null; }
        if (!ok) p.miss = true;
      }
      assert.ok(ok, `${s.seed}: ${id} found within 10`); (hops[id] ||= []).push(n);
    }
  }
  console.log('G6 ground: places tried before one held (6 journeys):', JSON.stringify(hops));
});

// ---------------------------------------------------------------- the cadence (design 2.7) as a simulation
// A model of a player exploring at Tim's pace (about 32 new sections an hour, about 1,000 sections out by 40 hours), run over
// seeded journeys with every route now live. What is read from the game: the quests' gates (band, 1,000 sections), their places'
// distances (resolved for each journey), the milestone thresholds, the Reliquary's certain finds and
// chance, the thread carriers' bands, the Viscera prices. What is assumed (MODEL, below; Tim's playtests replace it): the band
// reached by each hour, how often each deed happens, how long a quest takes once its place is reached, how long a thread takes,
// and Viscera income past 1,000 sections.
const MODEL = Object.freeze({
  sectionsPerHour: 32, outPerHour: 25, travel: 40, // new sections an hour; straight-line sections out an hour; sections an hour on a quest's errand
  bands: [[0, 0], [1, 1], [5, 2], [10, 6], [20, 12], [40, 13], [80, 15], [150, 18]], // [hour, Aperture band]
  lattice: 40, // the first Listener falls (the Lattice opens)
  task: { 'essence-walk': .7, 'corridor-golem': 3, tempo: 1.5, 'blade-stream': 2, 'glyph-mine': 4, 'arc-wave': 4, 'power-aegis': 2.5, 'ember-mend': .5, wellspring: 1 }, // hours once there
  deeds: { airCasts: 1.2, burnsSurvived: .9, summitSkyways: .02, dives: .2, worldBeasts: .15, deepFloors: .3, glideTiles: 30, beatKills: .3, magmaKills: .6, chargedReleases: 6 }, // a share of journeys play each build (below)
  build: .45, // the share of milestones whose deed the player's build does (2.5: thresholds come from playing the matching build)
  threads: { near: [3, 15], middle: [15, 50], far: [40, 110], beyond: [70, 160] }, // [earliest, latest] hour a carrier thread ends, by band
  threadShare: .85, // the share of carrier threads a player finishes at all
  reliquary: { horde: [25, 45], seedRealm: [12, 30], pentagon: [30, 70], shellVault: [40, 90], otherEndsPerHour: .4 },
  viscera: { perHour: 1.6, rumours: false }, // income once refinement is open (past 1,000 sections); forms bought as soon as affordable
});
function cadence(seed) {
  const r = (k) => (hashSeed(`${seed}:cadence:${k}`) % 10000) / 10000, at = (lo, hi, k) => lo + r(k) * (hi - lo);
  const bandAt = (h) => { const B = MODEL.bands; for (let i = 1; i < B.length; i++) if (h <= B[i][0]) return Math.floor(B[i - 1][1] + (B[i][1] - B[i - 1][1]) * (h - B[i - 1][0]) / (B[i][0] - B[i - 1][0])); return B.at(-1)[1]; };
  const hourOfBand = (t) => { for (let h = 0; h <= 400; h += .25) if (bandAt(h) >= t) return h; return Infinity; };
  const got = []; // [hour, route]
  // quests: place distances from the journey's own resolution; eligible quests may proceed concurrently
  const s = rich(v1Save(seed)); s.explored['1000,1'] = true; for (const id of QUEST_IDS) openQuest(s, id);
  const due = QUEST_IDS.map((id) => { const Q = QUESTS[id], p = Q.steps.map((q) => (q.place ? stepPlace(s, id, q.key) : null)).find(Boolean), d = p && !p.relaxed ? Math.hypot(p.rx, p.ry) : 20;
    const gate = Math.max(hourOfBand(Q.gate.tier), Q.gate.far ? Q.gate.far / MODEL.outPerHour : 0); return { id, gate, work: (Q.gate.far ? 0 : 2 * d / MODEL.travel) + MODEL.task[id] * (.6 + .8 * r(`task:${id}`)) }; });
  const open = []; let h = 0; const pending = due.slice().sort((a, b) => a.gate - b.gate);
  while (pending.length || open.length) {
    while (pending.length && pending[0].gate <= h) { const q = pending.shift(); open.push({ ...q, end: h + q.work }); }
    open.sort((a, b) => a.end - b.end); const next = Math.min(open[0]?.end ?? Infinity, pending[0] ? Math.max(h, pending[0].gate) : Infinity);
    if (!Number.isFinite(next)) break; h = next; while (open.length && open[0].end <= h) { open.shift(); got.push([h, 'b']); }
  }
  // milestones
  for (const m of MILESTONES) if (r(`build:${m.key}`) < MODEL.build) got.push([m.need / MODEL.deeds[m.key] * (.7 + .6 * r(`m:${m.key}`)), 'c']);
  // threads: the ten carriers of d abilities (the seeded two by this journey's own pick) and the two Arcana passives' sets
  const picks = seededThreads(s), carriers = [...Object.keys(THREAD_REWARDS).filter((k) => k !== 'second').map((k) => THREADS[k].band), 'middle', ...Object.values(picks).map((k) => THREADS[k].band), 'near', 'near'];
  carriers.forEach((b, i) => { if (r(`t:${i}`) < MODEL.threadShare) { const [lo, hi] = MODEL.threads[b] || MODEL.threads.far; got.push([at(lo, hi, `th:${i}`), 'd']); } });
  // reliquaries: the four certain finds, then one in ten of other ends, until the pool of eight is empty
  const R = []; for (const k of RELIQUARY.certain) { const w = MODEL.reliquary[k]; R.push(at(w[0], w[1], `r:${k}`)); }
  for (let hh = 0; hh < 300; hh += 1 / MODEL.reliquary.otherEndsPerHour) if (r(`end:${hh.toFixed(2)}`) < RELIQUARY.chance.deep) R.push(hh);
  R.sort((a, b) => a - b).slice(0, RELIQUARY.pool.length).forEach((q) => got.push([q, 'R']));
  // Viscera: refinement past 1,000 sections out, income from there; each form bought as soon as affordable
  { const open = 1000 / MODEL.outPerHour; let need = 0; for (const n of Object.values(VISCERA_SHOP.forms)) { need += n; got.push([open + need / MODEL.viscera.perHour, 'V']); } }
  return got;
}
test('the cadence (2.7), simulated now that every route is live: the numbers, against the design\'s bands', () => {
  const HOURS = [1, 5, 10, 20, 40, 80, 150], BANDS = { 1: [0, 1], 5: [1, 3], 10: [3, 5], 20: [7, 10], 40: [12, 16], 80: [24, 30], 150: [36, 44] }, N = 60, runs = [];
  for (let i = 0; i < N; i++) runs.push(cadence(`PACE-${i}`));
  const at = (h) => runs.map((g) => g.filter(([t]) => t <= h).length).sort((a, b) => a - b), med = (a) => a[Math.floor(a.length / 2)];
  const rows = HOURS.map((h) => { const a = at(h); return { hours: h, sections: h * MODEL.sectionsPerHour, low: a[Math.floor(a.length * .1)], median: med(a), high: a[Math.floor(a.length * .9)], band: BANDS[h].join('-'), inBand: med(a) >= BANDS[h][0] && med(a) <= BANDS[h][1] }; });
  const by40 = {}; for (const k of ['b', 'c', 'd', 'R', 'V']) by40[k] = med(runs.map((g) => g.filter(([t, q]) => t <= 40 && q === k).length).sort((a, b) => a - b));
  console.log('Cadence (world abilities of 44, median and 10th-90th percentile over', N, 'journeys):'); for (const q of rows) console.log(`  ${q.hours} h (~${q.sections} sections): ${q.median} [${q.low}-${q.high}] · design ${q.band}${q.inBand ? '' : ' · OUTSIDE'}`);
  console.log('  by route at 40 h (median):', JSON.stringify(by40), '· design b 5, c 3, d 3, R 3, V 0');
  for (const g of runs) { assert.ok(g.length <= 44); assert.equal(g.filter(([t, q]) => q === 'V' && t < 1000 / MODEL.outPerHour).length, 0, 'no Viscera before 1,000 sections'); }
  assert.equal(by40.V, 0); assert.ok(rows.every((q, i) => !i || q.median >= rows[i - 1].median), 'it only grows');
});

test('wired: no new module; the game reports every deed; no model names', () => {
  const game = readFileSync('src/game.ts', 'utf8');
  for (const m of [/this\.questKill\(e\)/, /questPlaceCleared\("skyland"/, /questHome\(this\.save, v\.id\)/, /on: "salvage", with: toolKey/, /this\.questArea\(area\)/, /foe\.aegisTurned = true/, /o\.kind === "questToken"\) return this\.questTokenAct\(o\)/, /rosterGuardianKind\(/]) assert.match(game, m);
  for (const f of ['src/quests.ts', 'src/quest-places.ts', 'src/world-finds.ts']) assert.ok(!/claude|opus|sonnet|fable/i.test(readFileSync(f, 'utf8')), f);
  assert.ok(ensureQuests(freshSave())); assert.ok(questLeadCount(freshSave()) === 0); assert.ok(THREAD_BANDS.beyond);
});
