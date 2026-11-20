// Progression Phase 7, quests (route b) and thread rewards (route d) (docs/progression-design.md rev 3, sections 2.2 routes b and d,
// 2.5 G4 and G6, 2.8, 3, 6 and 7 row 7). save.quests is additive at schema 14; a quest opens at its gate, once; its steps use only
// the verbs of 2.8; a step's place is resolved once, saved and never moved, on reachable ground (never the open sea, a town, the
// Far Sleep or a crossing that might be a Poison Crypt); thread endings grant through threads.ts ARCANA_REWARDS; two rewards are
// seeded per journey and saved; Exploration withholds exactly the b and d abilities built; Classic gets the extras and the
// consolation; kept abilities are honoured; an in-progress journey keeps what it had; and a 1,000-seed simulation (G6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, setCompassChoice } from '../src/types.ts';
import { EXPLORATION, exploring, ensureQuests, QUEST_RECORD, useJourneyFrame } from '../src/journey-start.ts';
import { startJourney, switchProgression, ownership, stateV0, compendium, adoptExploration, howToPage, hintSubjectsHeld, hintFor, PROGRESSION_ROWS, ROW_BY_ID } from '../src/progression.ts';
import { STORY, QUESTS, QUEST_IDS, THREAD_REWARDS, SEEDED_REWARDS, SEEDED_IDS, STORY_WITHHELD, STORY_ROUTE_OF, STORY_LATER, STORY_OWN, REWARD_CARRIERS, PHASE7_STORY, storyWithheld, seededPick, seededThreads, threadReward, carrierOf, questOpen, questStep, questDue, stepPlace, questFollowId } from '../src/quests.ts';
import { QUEST_PLACES, starfieldAt, questPlace, openQuest, questTarget, questLeads, questClear, placeSpent } from '../src/quest-places.ts';
import { WORLD_WITHHELD, worldWithheld, earnedWorld } from '../src/world-routes.ts';
import { grantWorld } from '../src/world-finds.ts';
import { THREADS, THREAD_ORDER, THREAD_BANDS, ARCANA_REWARDS, settleArcanaRewards, sharedThreads, inBand } from '../src/threads.ts';
import { SECOND_WAYFARER } from '../src/second-wayfarer.ts';
import { compassFollowTarget } from '../src/atlas-view.ts';
import { questLeadCount } from '../src/leads.ts';
import { APERTURE_BANDS, spellOpen } from '../src/items.ts';
import { availableCastables } from '../src/spell-slots.ts';
import { toggleAlt, toggleLatticePassive, learnExtra, WORLD_WAIT } from '../src/constellation.ts';
import { openSeaSection, farSleepSection } from '../src/landscape.ts';
import { generateRegion, regionSettled } from '../src/world.ts';
import { Game } from '../src/game.ts';

const band = (tier) => APERTURE_BANDS[tier].threshold;
// Phase 8 (tests/progression-phase8.test.ts) withholds its own quests' and the Viscera forms too; these tests hold those aside
// (kept), so they see Phase 7's alone, as when it shipped.
const P8 = STORY_WITHHELD.filter((id) => !PHASE7_STORY.includes(id));
const v1Save = (seed = 'PHASE7') => { const s = freshSave(); s.seed = seed; startJourney(s, {}); s.progression.kept = [...s.progression.kept, ...P8]; return s; };
const classicSave = (seed = 'PHASE7-C') => { const s = freshSave(); s.seed = seed; return startJourney(s, { mode: 0 }); };
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
const whole = (set) => Array.from({ length: THREADS[set].pieces.length }, (_, i) => `dungeon:x:g1:9:9:${set}${i}`);
const BUILT_B = ['spell:essence-walk'];

test('save.quests: additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept; an in-progress quest survives', () => {
  const f = freshSave();
  assert.deepEqual(f.quests, { v: 1, open: {}, threads: {} });
  const old = JSON.parse(JSON.stringify(f)); delete old.quests;
  assert.deepEqual(migrateSave(old).quests, f.quests, 'a journey from before gets an empty record');
  const odd = JSON.parse(JSON.stringify(f));
  odd.quests = { open: { 'essence-walk': { state: 'open', at: 12.7, steps: { meal: 40, bad: -1, x: 'y' }, places: [{ step: 'starfield', rx: 3, ry: -2, dungeon: 'd' }, { step: 'starfield', rx: 1.5 }, 'no', { step: 'starfield', relaxed: true }], mine: 1 },
    junk: { state: 'lost' }, '': { state: 'open' } }, threads: { 'echoing-cast': 'choir', bad: 7 }, future: 'kept' };
  const q = migrateSave(odd).quests;
  assert.deepEqual(Object.keys(q.open), ['essence-walk']);
  assert.deepEqual(q.open['essence-walk'], { state: 'open', at: 12, steps: { meal: 40 }, places: [{ step: 'starfield', rx: 3, ry: -2, dungeon: 'd' }, { step: 'starfield', relaxed: true }], mine: 1 });
  assert.deepEqual(q.threads, { 'echoing-cast': 'choir' }); assert.equal(q.future, 'kept');
  // a quest in progress, and the abilities earned by a quest or a thread, survive a save round trip
  const s = rich(v1Save('ROUND')); const g = new Game(s, 0); assert.ok(g); assert.ok(questOpen(s, 'essence-walk'));
  grantWorld(s, 'pocket-time', 'd', 'clockmaker');
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.quests, s.quests); assert.deepEqual(back.feats.earned, s.feats.earned); assert.equal(back.feats.earned['pocket-time'].route, 'd');
  assert.ok(QUEST_RECORD.openMax >= QUEST_IDS.length);
});

test('Exploration withholds exactly the b and d abilities whose quest or thread is built; Phase 8\'s stay open', () => {
  const bd = PROGRESSION_ROWS.filter((r) => ['b', 'd'].includes(r.v1.route)).map((r) => r.id);
  const built = bd.filter((id) => !STORY_LATER[id] && !STORY_OWN[id]).sort();
  assert.deepEqual(STORY_WITHHELD.filter((id) => STORY_ROUTE_OF[id] !== 'V').sort(), built, 'the withheld set is the b and d rows built, no more (Phase 8 adds the V forms)');
  for (const id of [...Object.keys(STORY_LATER), ...Object.keys(STORY_OWN)]) assert.ok(bd.includes(id), `${id} is a b or d row`);
  assert.deepEqual(PHASE7_STORY.filter((id) => STORY_ROUTE_OF[id] === 'b'), BUILT_B);
  for (const id of STORY_WITHHELD) assert.equal(ROW_BY_ID[id].v1.route, STORY_ROUTE_OF[id], id);
  assert.equal(EXPLORATION.table, STORY.table);
  // a journey where today's rules open everything: under Exploration exactly the c, R, b and d rows built differ from the same journey holding them kept
  const s = rich(v1Save('WITHHOLD')), all = rich(v1Save('WITHHOLD')); all.progression.kept = [...all.progression.kept, ...WORLD_WITHHELD, ...STORY_WITHHELD];
  const a = ownership(s), b = ownership(all), differ = Object.keys(a).filter((id) => a[id] !== b[id]).sort();
  assert.deepEqual(differ, [...WORLD_WITHHELD, ...PHASE7_STORY].sort());
  for (const id of PHASE7_STORY) { assert.equal(a[id], 'locked', id); assert.ok(['owned', 'open'].includes(stateV0(s, ROW_BY_ID[id])), `${id}: Classic's rules have it`); assert.ok(storyWithheld(s, id) && worldWithheld(s, id), id); }
  // the game refuses them
  for (const id of ['essence-walk', 'shadow-clone', 'gravity-well']) { assert.equal(spellOpen(s, id), false, id); assert.ok(!availableCastables(s).includes(`spell:${id}`), id); }
  for (const id of PHASE7_STORY.filter((q) => q.startsWith('field:'))) assert.deepEqual(toggleLatticePassive(s, id), { ok: false, message: WORLD_WAIT }, id);
  for (const [branch, id] of [['form', 'arcane-edge'], ['veil', 'pocket-time'], ['force', 'echoing-cast']]) assert.deepEqual(learnExtra(s, branch, id), { ok: false, message: WORLD_WAIT }, id);
  // the rows with their own route: today's rules (Phase 8 built the rest: STORY_LATER is empty; held aside here as kept)
  assert.deepEqual(Object.keys(STORY_LATER), []);
  for (const id of Object.keys(STORY_OWN)) { assert.ok(!worldWithheld(s, id), id); assert.equal(a[id], b[id], id); }
  // Classic withholds nothing
  const c = rich(classicSave('WITHHOLD-C')); for (const id of STORY_WITHHELD) { assert.equal(ownership(c)[id], stateV0(c, ROW_BY_ID[id]), id); assert.ok(!storyWithheld(c, id)); }
  for (const id of ['essence-walk', 'shadow-clone', 'gravity-well']) assert.ok(spellOpen(c, id));
});

test('thread endings grant their abilities through ARCANA_REWARDS, once, with the hook, a hint naming the thread, and the how-to', () => {
  assert.deepEqual(Object.keys(ARCANA_REWARDS).sort(), [...REWARD_CARRIERS].sort());
  for (const [set, r] of Object.entries(THREAD_REWARDS)) { assert.ok(ROW_BY_ID[r.ability], r.ability); assert.equal(ROW_BY_ID[r.ability].v1.route, 'd'); assert.equal(r.seen, ROW_BY_ID[r.ability].visibility, r.ability); assert.equal(r.name, ROW_BY_ID[r.ability].name); if (set !== 'second') assert.equal(THREADS[set]?.title, r.title, set); }
  assert.equal(THREAD_REWARDS.second.title, SECOND_WAYFARER.title);
  for (const id of SEEDED_IDS) { assert.equal(ROW_BY_ID[id].v1.route, 'd'); for (const [set, c] of Object.entries(SEEDED_REWARDS[id].candidates)) { assert.equal(THREADS[set]?.title, c.title, set); assert.ok(!THREAD_REWARDS[set], `${set} carries one reward`); } }
  const cands = SEEDED_IDS.flatMap((id) => Object.keys(SEEDED_REWARDS[id].candidates)); assert.equal(new Set(cands).size, cands.length, 'no thread is a candidate twice');
  // in the game: the Clockmaker's Hours finished, the next area load pays Pocket Time
  const s = rich(v1Save('THREADS')); s.lore.threads = { clockmaker: whole('clockmaker') }; const g = new Game(s, 0); g.loadArea('overworld', false);
  assert.ok(earnedWorld(s, 'pocket-time')); assert.equal(s.feats.earned['pocket-time'].route, 'd'); assert.equal(s.feats.earned['pocket-time'].from, 'clockmaker');
  assert.ok((g.questNotices || []).some((q) => q.title === "A THREAD'S END" && /Pocket Time/.test(q.detail)), 'a banner');
  assert.match(g.message, /The last watch still runs, set to yours\./, 'the hook');
  assert.equal(s.lore.arcanaClaimed.clockmaker, true); assert.ok(!worldWithheld(s, 'pocket-time')); assert.ok(learnExtra(s, 'veil', 'pocket-time').ok); assert.equal(ownership(s)['pocket-time'], 'owned');
  assert.match(hintFor(s, 'row:pocket-time').text, /^Pocket Time, from the Clockmaker's Hours: /, '4A.5: the hint names where it came from');
  assert.match(howToPage(s, 'pocket-time').sections.find(([k]) => k === 'Where it came from')[1], /end of The Clockmaker's Hours.*set to yours/);
  const before = JSON.stringify(s.feats.earned); g.loadArea('overworld', false); assert.equal(JSON.stringify(s.feats.earned), before, 'once');
  // a spell from a thread: castable once given
  const w = rich(v1Save('ROPE')); w.lore.threads = { wellDigger: whole('wellDigger') }; new Game(w, 0).loadArea('overworld', false);
  assert.ok(spellOpen(w, 'gravity-well')); assert.ok(availableCastables(w).includes('spell:gravity-well')); assert.equal(ownership(w)['spell:gravity-well'], 'owned');
  // the Second Wayfarer's trail: Shadow Clone, hidden until it comes
  const sw = rich(v1Save('SECOND')); assert.equal(compendium(sw).groups.find((x) => x.id === 'spells').entries.some((e) => e.id === 'spell:shadow-clone'), false);
  sw.lore.second = { begun: 'd', trail: Array.from({ length: 6 }, (_, i) => ({ rx: i, ry: 9 })), found: 6, passed: [] };
  new Game(sw, 0).loadArea('overworld', false); assert.ok(spellOpen(sw, 'shadow-clone')); assert.equal(sw.feats.earned['spell:shadow-clone'].from, 'second');
  // every d ability built is reachable through its carrier, for any seed
  const all = rich(v1Save('ALL-D'));
  all.lore.threads = Object.fromEntries(THREAD_ORDER.map((set) => [set, whole(set)])); all.lore.second = { begun: 'd', trail: [{ rx: 1, ry: 1 }], found: 6 };
  settleArcanaRewards(all, (set, r) => grantWorld(all, r.id, 'd', set), ['second']);
  for (const id of STORY_WITHHELD.filter((q) => STORY_ROUTE_OF[q] === 'd')) assert.ok(earnedWorld(all, id) && !worldWithheld(all, id), id);
});

test('the seeded thread rewards: one pick per seed, deterministic, saved the first time it is read, never moved by a later table', () => {
  const counts = {};
  for (let i = 0; i < 300; i++) { const p = seededPick(`SEED-${i}`); assert.deepEqual(seededPick(`SEED-${i}`), p); for (const id of SEEDED_IDS) { assert.ok(SEEDED_REWARDS[id].candidates[p[id]], id); counts[`${id}:${p[id]}`] = (counts[`${id}:${p[id]}`] || 0) + 1; } }
  for (const id of SEEDED_IDS) for (const set of Object.keys(SEEDED_REWARDS[id].candidates)) assert.ok(counts[`${id}:${set}`] > 40, `${id} rides ${set} on some journeys`);
  const s = v1Save('PICK'), p = seededThreads(s); assert.deepEqual(s.quests.threads, p, 'saved');
  // a saved pick wins over whatever the stream says later (as if a later table changed the candidates' order)
  const other = Object.keys(SEEDED_REWARDS['echoing-cast'].candidates).find((k) => k !== p['echoing-cast']); s.quests.threads['echoing-cast'] = other;
  assert.equal(seededThreads(s)['echoing-cast'], other); assert.equal(carrierOf(s, 'echoing-cast'), other); assert.equal(threadReward(s, other).id, 'echoing-cast');
  assert.equal(threadReward(s, p['echoing-cast']), null, 'the stream\'s pick carries nothing once another was saved');
  // the carrier picked pays; a candidate not picked pays nothing and is never claimed
  const t = rich(v1Save('PICK-GAME')), picks = seededThreads(t), loser = Object.keys(SEEDED_REWARDS['field:wellspring'].candidates).find((k) => k !== picks['field:wellspring']);
  t.lore.threads = { [loser]: whole(loser) }; new Game(t, 0).loadArea('overworld', false); assert.ok(!earnedWorld(t, 'field:wellspring')); assert.ok(!t.lore.arcanaClaimed?.[loser]);
  t.lore.threads[picks['field:wellspring']] = whole(picks['field:wellspring']); new Game(t, 0).loadArea('overworld', false); assert.ok(earnedWorld(t, 'field:wellspring'));
});

test('Essence Walk: the quest opens at Infinite III, points the compass, and is done with the verbs it already has (act, then clear)', () => {
  const s = rich(v1Save('BROTH'), 12); s.currency = 100;
  const g = new Game(s, 0); assert.ok(!questOpen(s, 'essence-walk'), 'not before its gate');
  s.perception.aperture = band(13); g.rx = 0; g.ry = 0; g.loadArea('overworld', false); g.enemies = [];
  assert.ok(questOpen(s, 'essence-walk')); assert.ok((g.questNotices || []).some((q) => q.title === 'A QUEST' && /Wrong-Way Broth/.test(q.detail)));
  assert.equal(questLeadCount(s), 1, 'a lead'); assert.ok(hintSubjectsHeld(s).includes('quest:first'));
  assert.equal(ownership(s)['spell:essence-walk'], 'open'); assert.match(compendium(s).groups.find((x) => x.id === 'spells').entries.find((e) => e.id === 'spell:essence-walk').label, /Hollis Dray: eat any meal/);
  const [lead] = questLeads(s); assert.equal(lead.title, QUESTS['essence-walk'].title); assert.deepEqual(lead.follow, { kind: 'quest', id: questFollowId('essence-walk'), name: lead.title });
  // accepting is choosing it on the compass: it points at Hollis's table, then (fed) at the Starfield crossing saved for it
  setCompassChoice(s, { follow: lead.follow }); assert.equal(s.guidance.follow.id, 'progress:essence-walk', 'the follow survives normalisation');
  assert.deepEqual(compassFollowTarget(s, s.guidance.follow), { area: 'overworld', rx: 0, ry: 0, kind: 'guidance', name: "Hollis Dray's table" });
  s.leads.told['refuge-farmer'] = true; // his first-journey line (Phase 4) is said once, before
  const hollis = g.map.objects.find((o) => o.id === 'refuge-farmer'); Object.assign(g.player, { x: hollis.x, y: hollis.y + 1, facing: 'up' });
  assert.match(g.interact().message, /Eat first/, 'Hollis gives it');
  // clearing a Starfield without his meal does nothing
  assert.deepEqual(questClear(s, 'starfield'), []);
  assert.ok(g.eatAt('refuge-farmer', 'lumenCap', 'lumenCap').ok); assert.match(g.message, /Clear a Starfield crossing before it wears off/);
  assert.equal(s.meal.quest, 'essence-walk'); assert.equal(questStep(s, 'essence-walk').key, 'starfield');
  const place = stepPlace(s, 'essence-walk', 'starfield'), t = compassFollowTarget(s, s.guidance.follow);
  assert.deepEqual([t.rx, t.ry], [place.rx, place.ry]);
  // a meal elsewhere replaces his: the step waits for his table again
  const keep = { ...s.meal }; s.meal = { a: 'ironroot', b: 'ironroot', remaining: 600 }; assert.equal(questStep(s, 'essence-walk').key, 'meal'); assert.match(questLeads(s)[0].detail, /Eat any meal/);
  s.meal = keep;
  // go there: the crossing saved is a Starfield, and clearing it (its guardian down) completes the quest
  s.session.activeDungeonId = place.dungeon; s.session.dungeonReturn = { rx: place.rx, ry: place.ry, x: 16, y: 16 }; g.rx = place.rx; g.ry = place.ry; g.loadArea('dungeon', false);
  assert.ok(g.map.chasm, 'a crossing that opens on stars'); assert.equal(g.areaId(), place.dungeon);
  const boss = g.enemies.find((e) => e.boss) || Object.assign(g.enemies[0] || {}, { boss: true });
  const h = s.consequences.dungeons[place.dungeon]; h.combatClear = { ...(h.combatClear || {}), completed: true }; boss.hp = 0; boss.dead = true; g.defeatEnemy(boss);
  assert.equal(s.quests.open['essence-walk'].state, 'done'); assert.ok(earnedWorld(s, 'spell:essence-walk')); assert.equal(s.feats.earned['spell:essence-walk'].route, 'b');
  assert.ok(spellOpen(s, 'essence-walk')); assert.ok(availableCastables(s).includes('spell:essence-walk'));
  assert.ok((g.questNotices || []).some((q) => q.title === 'QUEST COMPLETE')); assert.equal(compassFollowTarget(s, s.guidance.follow), null, 'done: no needle');
  assert.match(hintFor(s, 'row:spell:essence-walk').text, /^Essence Walk, from Hollis Dray's quest: /);
  assert.match(howToPage(s, 'spell:essence-walk').sections.find(([k]) => k === 'Where it came from')[1], /Earned by a quest.*Wrong-Way Broth.*wrong way round/);
  assert.equal(questLeadCount(s), 0); assert.equal(s.meal.quest, undefined);
  // the quest's verbs are 2.8's
  for (const id of QUEST_IDS) for (const step of QUESTS[id].steps) assert.ok(['act', 'defeat', 'reach', 'survive', 'clear', 'use'].includes(step.verb), `${id}:${step.key}`);
});

test('saved steps never move; a spent place gives way to the next, saved after it; a quest for a kept ability is never offered', () => {
  const s = rich(v1Save('SPENT')); openQuest(s, 'essence-walk'); const first = stepPlace(s, 'essence-walk', 'starfield');
  for (let i = 0; i < 3; i++) assert.deepEqual(questPlace(s, 'essence-walk', 'starfield'), first);
  (s.atlas ||= {})[`${first.rx},${first.ry}`] = { seen: true }; s.consequences.dungeons[first.dungeon] = { visits: 1, generatorVersion: 5 };
  assert.deepEqual(questPlace(s, 'essence-walk', 'starfield'), first, 'entered, not finished: still the place');
  s.consequences.dungeons[first.dungeon].guardianDefeated = true; assert.ok(placeSpent(s, first));
  const next = questPlace(s, 'essence-walk', 'starfield'); assert.notDeepEqual([next.rx, next.ry], [first.rx, first.ry]);
  assert.equal(s.quests.open['essence-walk'].places.length, 2, 'the old place is kept in order'); assert.deepEqual(questPlace(s, 'essence-walk', 'starfield'), next);
  // kept (a switch from Classic at Infinite III), so not offered; Classic: Essence Walk is open there at its gate, so never offered either
  const c = rich(classicSave('KEPT-Q')); switchProgression(c, 1); assert.ok(!questDue(c, 'essence-walk', 13));
  const k = rich(classicSave('CLASSIC-Q')); const g = new Game(k, 0); assert.ok(g); assert.equal(questOpen(k, 'essence-walk'), false);
  assert.equal(questDue(k, 'essence-walk', 13, ['owned', 'open'].includes(stateV0(k, ROW_BY_ID['spell:essence-walk']))), false);
});

test('Classic: quests and threads are extra routes; an ability already given pays the consolation; switching never removes anything', () => {
  // a thread finished before today's rules give its ability: given early; one finished after: lumen dust
  const c = classicSave('EXTRA-C'); c.magicSkills.learned = { 'veil-guard': 1 }; c.lore.threads = { clockmaker: whole('clockmaker'), wellDigger: whole('wellDigger') };
  c.materials = { lumenDust: 0 }; const g = new Game(c, 0); g.loadArea('overworld', false);
  assert.equal(c.feats.earned['spell:gravity-well'].dust, undefined, 'before Infinite III: given early'); assert.ok(spellOpen(c, 'gravity-well'));
  assert.equal(c.feats.earned['pocket-time'].dust, 3, 'Classic opens Pocket Time once Veil Guard has a rank: the consolation'); assert.equal(c.materials.lumenDust, 3);
  assert.match(JSON.stringify(g.questNotices), /it would have taught Pocket Time/);
  // a quest open in Exploration stays a lead after a switch to Classic, and earning it there is the consolation
  const s = rich(v1Save('SWITCH')); s.currency = 50; new Game(s, 0); assert.ok(questOpen(s, 'essence-walk'));
  s.lore.threads = { ferry: whole('ferry') }; new Game(s, 0).loadArea('overworld', false); assert.ok(earnedWorld(s, 'field:cinder-javelin'));
  assert.ok(switchProgression(s, 0).ok); assert.ok(questOpen(s, 'essence-walk')); assert.equal(questLeadCount(s), 1);
  assert.ok(switchProgression(s, 1).ok); for (const id of ['field:cinder-javelin', 'spell:essence-walk']) assert.ok(!worldWithheld(s, id), `${id} kept`);
  assert.ok(toggleLatticePassive(s, 'field:cinder-javelin').ok);
});

test('an in-progress journey keeps what it had: tables 2 and 3 adopt table 4 with the b and d abilities today\'s rules had open', () => {
  for (const from of [EXPLORATION.coreTable, EXPLORATION.worldTable]) {
    const s = rich(v1Save(`ADOPT-${from}`)); s.progression.table = from; assert.ok(!exploring(s));
    s.magicSkills.learned.quickening = 0; delete s.constellation.mods['thorned-veil'];
    const n = adoptExploration(s); assert.ok(n > 0); assert.equal(s.progression.table, EXPLORATION.table); assert.ok(exploring(s));
    for (const id of ['spell:essence-walk', 'spell:shadow-clone', 'spell:gravity-well', 'arcane-edge', 'echoing-cast', 'field:transpose', 'field:mages-hand']) { assert.ok(s.progression.kept.includes(id), `${from}: ${id} kept`); assert.ok(!worldWithheld(s, id), id); }
    assert.ok(spellOpen(s, 'gravity-well'));
  }
  // before Infinite III nothing of them was open: nothing is kept, and Exploration's rules hold from now on
  const e = rich(v1Save('ADOPT-EARLY'), 11); e.progression.table = EXPLORATION.worldTable; adoptExploration(e);
  for (const id of ['spell:gravity-well', 'field:transpose']) { assert.ok(!e.progression.kept.includes(id), id); assert.ok(worldWithheld(e, id), id); }
  // through the game, with a saved quest record and a Lattice pick set before
  const g = rich(v1Save('ADOPT-GAME')); g.progression.table = EXPLORATION.worldTable; g.lattice = { ...(g.lattice || {}), passives: ['field:transpose'] };
  new Game(g, 0); assert.equal(g.progression.table, EXPLORATION.table); assert.ok(g.progression.kept.includes('field:transpose'));
});

test('compendium, Journal and how-to: an open quest names its step, a hinted reward is rumoured once its thread is begun, a hidden one never', () => {
  const s = rich(v1Save('TOME'));
  s.lore.threads = { clockmaker: whole('clockmaker').slice(0, 2), tinkerTags: whole('tinkerTags').slice(0, 2) };
  const c = compendium(s), all = c.groups.flatMap((x) => x.entries);
  assert.match(all.find((e) => e.id === 'pocket-time').label, /^Rumoured: a thread's ending$/);
  assert.equal(all.find((e) => e.id === 'field:continuous-assault'), undefined, 'hidden (X): unknown until yours');
  assert.equal(all.find((e) => e.id === 'spell:gravity-well'), undefined, 'a hinted reward of a thread not begun: unknown');
  assert.equal(howToPage(s, 'pocket-time'), null, 'a rumour has no page');
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /questLeads\(save\)/); assert.match(main, /something waits at the end/); assert.match(main, /Something waits at the end\./);
});

test('G6, 1,000 seeds: every quest step resolves to reachable ground, every b and d ability built has a working route, all per seed', () => {
  const t0 = Date.now(), dist = [];
  const carriers = Object.keys(THREAD_REWARDS).filter((k) => k !== 'second');
  // every carrier thread is offered somewhere in its band to crossings first entered now (story version 5): reachable on any journey
  for (const set of [...carriers, ...SEEDED_IDS.flatMap((id) => Object.keys(SEEDED_REWARDS[id].candidates))]) {
    const [lo, hi] = THREAD_BANDS[THREADS[set].band], d = Math.min(hi, lo + 2), rx = THREADS[set].band === 'beyond' ? d + 1 : d, first = !THREADS[set].wave && !THREADS[set].shared;
    assert.ok(inBand(THREADS[set].band, rx, 0), set); assert.ok(first || sharedThreads(5, rx, 0).includes(set), `${set} is rolled for new crossings`);
  }
  for (let i = 0; i < 1000; i++) {
    const seed = `G6-${i}`, s = rich(v1Save(seed)); useJourneyFrame(s);
    for (const id of QUEST_IDS.filter((q) => PHASE7_STORY.includes(QUESTS[q].ability))) { // Phase 8's quests: tests/progression-phase8.test.ts
      assert.ok(questDue(s, id, 13)); openQuest(s, id);
      for (const step of QUESTS[id].steps.filter((q) => q.place)) {
        const p = stepPlace(s, id, step.key); assert.ok(p && !p.relaxed, `${seed}: ${id}:${step.key} resolves to a section`);
        assert.ok(!openSeaSection(seed, p.rx, p.ry) && !regionSettled(p.rx, p.ry, seed) && !farSleepSection(p.rx, p.ry) && !(p.rx === 0 && p.ry === 0), `${seed}: reachable ground`);
        assert.deepEqual(starfieldAt(s, p.rx, p.ry), { rx: p.rx, ry: p.ry, dungeon: p.dungeon });
        dist.push(Math.max(Math.abs(p.rx), Math.abs(p.ry)));
        // determinism: a fresh save of the same seed resolves the same place
        if (i % 50 === 0) { const again = rich(v1Save(seed)); openQuest(again, id); assert.deepEqual(stepPlace(again, id, step.key), p, `${seed}: the same place`); }
      }
    }
    const picks = seededThreads(s);
    for (const id of SEEDED_IDS) assert.ok(SEEDED_REWARDS[id].candidates[picks[id]], `${seed}: ${id}`);
    for (const id of STORY_WITHHELD.filter((q) => STORY_ROUTE_OF[q] === 'd')) assert.ok(carrierOf(s, id), `${seed}: ${id} has a carrier`);
  }
  useJourneyFrame(freshSave());
  assert.ok(Math.max(...dist) <= QUEST_PLACES.radius); assert.ok(dist.reduce((a, b) => a + b, 0) / dist.length < 8, 'the Starfield is near the Refuge, inside a meal\'s reach');
  assert.ok(Date.now() - t0 < 60000, 'the searches are bounded');
});

test('G6, reachable on the ground: the place saved is a Starfield crossing in a built section and a built crossing', () => {
  for (let i = 0; i < 12; i++) {
    const seed = `G6-GROUND-${i}`, s = rich(v1Save(seed)); s.currency = 99; const g = new Game(s, 0); const p = stepPlace(s, 'essence-walk', 'starfield'); assert.ok(p, seed);
    const region = generateRegion(seed, p.rx, p.ry, 1); assert.ok(region.objects.some((o) => o.kind === 'dungeon' && `dungeon:${seed}:g1:${p.rx}:${p.ry}:${o.id}` === p.dungeon), `${seed}: the crossing stands there`);
    s.session.activeDungeonId = p.dungeon; s.session.dungeonReturn = { rx: p.rx, ry: p.ry, x: 16, y: 16 }; g.rx = p.rx; g.ry = p.ry; g.loadArea('dungeon', false);
    assert.ok(g.map.chasm, `${seed}: it opens on stars`); assert.ok(g.enemies.some((e) => e.boss), `${seed}: it has a guardian to clear`);
  }
});

test('wired: modules built and precached; the compass follows a quest; no model names', () => {
  const build = readFileSync('scripts/build.mjs', 'utf8'), sw = readFileSync('sw.js', 'utf8'), pg = readFileSync('proving-ground/sw.js', 'utf8');
  for (const m of ['quests', 'quest-places']) { assert.ok(build.includes(`'${m}'`), m); assert.ok(sw.includes(`./src/${m}.js?v=`), m); assert.ok(pg.includes(`../src/${m}.js?v=`), m); }
  const game = readFileSync('src/game.ts', 'utf8'); assert.match(game, /questPlaceCleared\("starfield"\)/); assert.match(game, /settleQuests\(\)/); assert.match(game, /questMeal\(this\.save, o\.id\)/);
  for (const f of ['src/quests.ts', 'src/quest-places.ts']) assert.ok(!/claude|opus|sonnet|fable/i.test(readFileSync(f, 'utf8')), f);
  assert.ok(ensureQuests(freshSave()));
});
