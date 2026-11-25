// Every offered goal can be completed (2026-11-25; Tim: "make it so you can hold all the leads that are required, so you can
// actually complete the quests"). A 60-hour passive-hunting run on CORRIDOR-ED889D959F found goals the game offers that could not
// be finished on that world: threads with too few carriers, milestones with one far source, leads never told, and two quest steps
// that were nearly impossible as built. Rarity and balance are unchanged; only the impossible is fixed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { startJourney } from '../src/progression.ts';
import { useJourneyFrame } from '../src/journey-start.ts';
import { Game, pinDungeonLayout } from '../src/game.ts';
import { THREADS, THREAD_CERTAIN, STORY_BUDGET, threadIn, threadHeld, threadDry, threadDue, threadPays, threadEligible, settleThreadLot, addThreadRelic, readThreadRelic, threadsDone, setThreadDry } from '../src/threads.ts';
import { settleCrossingThread, trailPlace } from '../src/thread-trails.ts';
import { crossingAt, openQuest, questEvent, questGift, questCalled } from '../src/quest-places.ts';
import { QUESTS, questState, stepDone } from '../src/quests.ts';
import { regionVersionOf, regionVersionFor, ARCANA_REGIONS } from '../src/lore.ts';
import { saveStart } from '../src/journey-start.ts';
import { namedFresh } from '../src/persistence.ts';
import { MILESTONES, BURNS, MOLTEN, PITY, HORDE_RUMOUR, burnSource, moltenTile, featCount } from '../src/world-routes.ts';
import { nearestHorde, nearestShaft } from '../src/world-leads.ts';
import { rumourTurn, needsRumour, liveRumours } from '../src/leads.ts';
import { ATTACK_MODULES } from '../src/monster-pack.ts';
import { AFFIXES } from '../src/affixes.ts';
import { sectionRegion, LANDSCAPE_VERSION, tileUnder } from '../src/landscape.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { seedCount } from '../src/skylands.ts';
import { RESPAWN, respawnPack } from '../src/fractured.ts';

const SIM = 'CORRIDOR-ED889D959F'; // the 60-hour run's seed
const journey = (seed = SIM) => { const s = freshSave(); s.seed = seed; startJourney(s, {}); useJourneyFrame(s); return s; };
const floorMap = () => ({ tiles: Array.from({ length: 24 * 22 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor' })), width: 24, height: 22, entry: { x: 4, y: 5 }, objects: [] });
const ORD = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
// The crossings of the world in a walking order: rings outward from the Refuge.
function walk(s, out = 40) { const list = []; for (let d = 1; d <= out; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d) { const id = crossingAt(s, dx, dy); if (id) list.push([dx, dy, id]); } return list; }
// Entering a crossing for the first time, as game.ts does: pinned, then dressed.
const enter = (s, id) => { pinDungeonLayout(s, id); return settleCrossingThread(floorMap(), s, id); };

// ------------------------------------------------------------------------------------------------ 1. threads that can finish
test('story version 7: the budget and every roll stay as version 6; a begun paying thread is never more than THREAD_CERTAIN.dry crossings from its next piece', () => {
  assert.ok(STORY_BUDGET.version >= 7); assert.equal(STORY_BUDGET.byVersion[7], .12); assert.equal(THREAD_CERTAIN.storyVersion, 7);
  assert.ok(THREAD_CERTAIN.dry >= 4 && THREAD_CERTAIN.dry <= 7, 'rare-feeling: the sixth or so dry crossing, not the next');
  for (const s of [journey()]) for (const [, , id] of walk(s, 25)) for (const r of [0, 1, 2]) assert.equal(threadIn(SIM, id, 7, r), threadIn(SIM, id, 6, r), 'version 7 rolls as 6');
  const s = journey(); for (const id of ['clockmaker', 'lamplighter', 'ferry', 'washing', 'wellDigger']) assert.equal(threadPays(s, id), true, `${id} pays something`);
  assert.equal(threadPays(s, 'letters'), false, 'a thread that gives nothing is left to its rolls');
});

// The holders counted with the journey's own frame (as the game reads them): on S12 the whole world holds one Lamplighter crossing,
// so Lamplighter's Light could never be earned there; on the 60-hour seed every Clockmaker crossing of the middle band would have
// had to be found.
for (const [seed, TID, few] of [[SIM, 'clockmaker', false], [SIM, 'lamplighter', false], ['S12', 'lamplighter', true]]) test(`on ${seed} ${THREADS[TID].title} can be finished`, () => {
  const s = namedFresh('Sim', seed, { mode: 1, weapon: 'salvage-blade', tool: 'spark-coil' }), T = THREADS[TID], all = walk(s, 40); useJourneyFrame(s); // the run's own kind of journey
  const rv = regionVersionFor(false, ARCANA_REGIONS.live, saveStart(s)), natural = all.filter(([, , id]) => threadIn(seed, id, STORY_BUDGET.version, rv) === TID);
  if (few) assert.ok(natural.length < T.pieces.length, `the world itself holds too few (${natural.length} of ${T.pieces.length})`);
  const first = all.find(([, , id]) => { const h = s.consequences.dungeons[id]; if (h) return false; enter(s, id); return threadHeld(s, id) === TID; });
  assert.ok(first, 'its first piece lies in the world'); readThreadRelic(s, { thread: TID, dungeonId: first[2] });
  let eligibleSince = 0, longest = 0, entered = 0;
  for (const [x, y, id] of all) {
    if (s.consequences.dungeons[id]) continue;
    const held = enter(s, id); entered++; if (threadEligible(TID, x, y, STORY_BUDGET.version)) eligibleSince++;
    if (held === TID) { longest = Math.max(longest, eligibleSince); eligibleSince = 0; const r = readThreadRelic(s, { thread: TID, dungeonId: id }); assert.ok(r.ok && r.first); if (r.done) break; }
  }
  assert.ok(threadsDone(s).includes(TID), `${T.title} is whole after ${entered} crossings`);
  assert.ok(longest <= THREAD_CERTAIN.dry + 1, `never more than ${THREAD_CERTAIN.dry} eligible crossings without a piece (${longest})`);
});

test('old crossings are unchanged: nothing pinned before story version 7 is made certain, and a decision is made once and kept', () => {
  const s = journey(); s.lore.threads = { clockmaker: ['dungeon:x:g1:9:9:a'], lamplighter: ['dungeon:x:g1:2:2:a'] }; setThreadDry(s, 'clockmaker', 99); setThreadDry(s, 'lamplighter', 99);
  const sample = walk(s, 30);
  for (const [, , id] of sample) for (const v of [0, 1, 2, 3, 4, 5, 6]) {
    s.consequences.dungeons[id] = { storyVersion: v, regionVersion: 1 };
    const before = threadIn(SIM, id, v, v >= 1 ? 1 : 0);
    assert.equal(settleThreadLot(s, id), before); assert.equal(s.consequences.dungeons[id].threadLot, undefined, `version ${v}: never decided`);
    assert.equal(threadHeld(s, id), before); assert.equal(addThreadRelic(floorMap(), s, id)?.thread ?? null, before && THREADS[before].pieces.length > (s.lore.threads[before]?.length || 0) ? before : null);
    delete s.consequences.dungeons[id];
  }
  assert.equal(threadDry(s, 'clockmaker'), 99, 'old crossings never count'); setThreadDry(s, 'lamplighter', 0);
  // a version 7 crossing is decided once: what it holds never changes after, whatever the counts do
  const fresh = sample.find(([x, y, id]) => threadEligible('clockmaker', x, y, 7) && threadIn(SIM, id, 7, regionVersionOf(s, id)) !== 'clockmaker')[2];
  s.consequences.dungeons[fresh] = { storyVersion: 7, regionVersion: 1 };
  assert.equal(settleThreadLot(s, fresh), 'clockmaker', 'due: made certain'); assert.equal(s.consequences.dungeons[fresh].threadLot, 'clockmaker'); assert.equal(threadDry(s, 'clockmaker'), 0);
  setThreadDry(s, 'clockmaker', 0); s.lore.threads.clockmaker = []; assert.equal(settleThreadLot(s, fresh), 'clockmaker', 'kept'); assert.equal(threadHeld(s, fresh), 'clockmaker');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.consequences.dungeons[fresh].threadLot, 'clockmaker'); assert.equal(threadHeld(back, fresh), 'clockmaker');
  // nothing begun: a new crossing keeps its own roll, and says so once
  const t = journey(), [, , id] = walk(t, 12).find(([x, y]) => Math.abs(x) + Math.abs(y) >= 7);
  t.consequences.dungeons[id] = { storyVersion: 7, regionVersion: 1 }; assert.equal(settleThreadLot(t, id), threadIn(SIM, id, 7, 1)); assert.equal(t.consequences.dungeons[id].threadLot, '');
});

test('a crossing whose own roll holds a thread awaiting a piece keeps it; the count is saved, normalised, and starts again on a read', () => {
  const s = journey(); s.lore.threads = { ferry: ['dungeon:x:g1:9:9:a'] }; setThreadDry(s, 'ferry', 3);
  const own = walk(s, 40).find(([, , id]) => threadIn(SIM, id, 7, 1) === 'ferry')[2];
  s.consequences.dungeons[own] = { storyVersion: 7, regionVersion: 1 }; assert.equal(settleThreadLot(s, own), 'ferry'); assert.equal(s.consequences.dungeons[own].threadLot, '', 'its own roll'); assert.equal(threadDry(s, 'ferry'), 0);
  setThreadDry(s, 'ferry', 4); readThreadRelic(s, { thread: 'ferry', dungeonId: 'dungeon:x:g1:9:10:b' }); assert.equal(threadDry(s, 'ferry'), 0, 'a piece read starts the count again');
  const raw = JSON.parse(JSON.stringify(s)); raw.lore.threadDry = { ferry: '3', clockmaker: -2, future: 7.6 };
  assert.deepEqual(migrateSave(raw).lore.threadDry, { ferry: 3, clockmaker: 0, future: 7 }); assert.equal(freshSave().lore.threadDry, undefined, 'created on first use');
});

test('the Washing trail points at the crossing made certain once its next bundle is due', () => {
  const s = journey(); const list = walk(s, 40);
  const a = list.find(([, , id]) => threadIn(SIM, id, STORY_BUDGET.version, regionVersionOf(s, id) || 1) === 'washing') || list.find(([x, y]) => threadEligible('washing', x, y, 7));
  s.lore.threads = { washing: [a[2]] }; setThreadDry(s, 'washing', THREAD_CERTAIN.dry); assert.equal(threadDue(s, 'washing'), true);
  const p = trailPlace(s, 'washing'); assert.ok(p?.dungeon, 'a crossing to point at'); assert.equal(s.lore.trails.washing.due, true);
  assert.equal(enter(s, p.dungeon), 'washing', 'the crossing pointed at holds the bundle');
});

// ------------------------------------------------------------------------------------------------ 2. milestones on any world
test('milestone counts are unchanged; a world with no Magma Rivers in reach can still earn both fire milestones', () => {
  assert.equal(MILESTONES.find((m) => m.key === 'magmaKills').need, 30); assert.equal(MILESTONES.find((m) => m.key === 'burnsSurvived').need, 20);
  for (let y = -50; y <= 50; y += 2) for (let x = -50; x <= 50; x += 2) assert.notEqual(sectionRegion(SIM, x, y, LANDSCAPE_VERSION)?.type, 'magma', `the 60-hour seed has no Magma Rivers within 50 (${x},${y})`);
  for (const t of [{ landscape: 'magma' }, { landscape: 'volcanic' }, { kind: 'lava' }, { kind: 'ashSlope', volcanic: true }, { kind: 'crustBridge', magma: 'river' }]) assert.ok(moltenTile(t), JSON.stringify(t));
  for (const t of [{ kind: 'grass' }, { landscape: 'frost' }, null]) assert.ok(!moltenTile(t));
  const fire = Object.values(ATTACK_MODULES).filter((a) => (a.tags || []).includes(BURNS.tag)).map((a) => a.id);
  assert.ok(fire.length >= 10); for (const id of fire) assert.ok(burnSource(id, ATTACK_MODULES[id].tags), id);
  for (const id of ['burnTree', 'gateBreath', 'gateFireball', 'flameTrail', 'wormLava', 'lavaBomb', 'doomTarFire']) assert.ok(burnSource(id), id);
  for (const id of ['ramCharge', 'frostTrail', 'blobGas', '', null]) assert.ok(!burnSource(id, ATTACK_MODULES[id]?.tags), String(id));
  assert.ok(AFFIXES[BURNS.affix], 'the Volcanic affix is a burn');
});

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function overworld(seed = SIM) { const g = new Game(journey(seed), 0); g.loadArea('overworld', false); g.enemies = []; g.player.x = 12; g.player.y = 12; g.player.hp = g.save.maxHp; return g; }
const W = 32;
test('in the game: a foe felled on or beside lava, in the Firelands or the Magma Rivers counts a magma kill, anywhere; elsewhere it does not', () => {
  const g = overworld(), at = (x, y) => tileUnder(g.map, W, x, y);
  for (const t of g.map.tiles) { delete t.magma; delete t.volcanic; if (t.kind === 'lava') t.kind = 'grass'; if (MOLTEN.landscapes.includes(t.landscape)) delete t.landscape; if (t.environment === 'lava') delete t.environment; }
  const foe = (x, y) => ({ kind: 'ashenHound', x, y });
  g.player.x = 2; g.player.y = 2; g.featKill(foe(20, 20)); assert.equal(featCount(g.save, 'magmaKills'), 0, 'plain ground: nothing');
  Object.assign(at(21, 20), { kind: 'lava' }); g.featKill(foe(20, 20)); assert.equal(featCount(g.save, 'magmaKills'), 1, 'beside a lava tile');
  Object.assign(at(10, 25), { landscape: 'volcanic' }); g.featKill(foe(10, 25)); assert.equal(featCount(g.save, 'magmaKills'), 2, 'on the Firelands');
  Object.assign(at(5, 8), { landscape: 'magma' }); g.featKill(foe(5, 8)); assert.equal(featCount(g.save, 'magmaKills'), 3, 'in the Magma Rivers, as before');
  g.area = 'dungeon'; g.map.width = W; g.featKill(foe(20, 20)); assert.equal(featCount(g.save, 'magmaKills'), 4, 'in a crossing too (a lava bog, a crater\'s lava stream)');
});

test('in the game: any fire that lands and is lived through counts one burn; one burn however many blows; death or no fire counts none', () => {
  const g = overworld(); let t = 5000;
  const run = (secs) => { for (let i = 0; i < secs * 20; i++) { g.player.invulnerableUntil = 0; g.update(.05, idle, (t += 50)); } };
  assert.equal(g.packHurt(null, 1, { source: 'gateBreath' }, t), true); run(1); g.player.invulnerableUntil = 0; g.packHurt(null, 1, { source: 'gateFireball' }, t);
  assert.equal(featCount(g.save, 'burnsSurvived'), 0, 'still burning'); run(BURNS.quiet + 1); assert.equal(featCount(g.save, 'burnsSurvived'), 1, 'a Gate Revenant\'s fire, lived through');
  g.packHurt(null, 1, { source: 'slagPour' }, t); run(BURNS.quiet + 1); assert.equal(featCount(g.save, 'burnsSurvived'), 2, 'an attack tagged fire');
  g.packHurt(null, 1, { source: 'ramCharge' }, t); run(BURNS.quiet + 1); assert.equal(featCount(g.save, 'burnsSurvived'), 2, 'not fire');
  const w = g.packWorld(1 / 30, t); g.player.invulnerableUntil = 0; g.packHurt(null, 1, { source: 'burnTree' }, t); w.ignite(2, 1); run(2 + BURNS.quiet + 1);
  assert.equal(featCount(g.save, 'burnsSurvived'), 3, 'the Briar Stag\'s grove: set alight and lived, once'); assert.equal(g.playerFire, null);
  g.packHurt(null, 1, { source: 'lavaBomb' }, t); g.player.hp = 0; g.burnTick(t + 10000); assert.equal(featCount(g.save, 'burnsSurvived'), 3, 'died in it: none');
});

// ------------------------------------------------------------------------------------------------ 3. leads that appear
test('the horde rumour is told floor or not, once, and looks 48 sections out; the strong lead looks 40', () => {
  assert.ok(HORDE_RUMOUR.radius >= 48); assert.ok(PITY.radius >= 40); assert.equal(PITY.sections, 200, 'how often pity comes is unchanged');
  const s = journey(); s.perception.aperture = APERTURE_BANDS[HORDE_RUMOUR.tier].threshold;
  for (const id of ['blade-stream', 'glyph-mine']) openQuest(s, id);
  assert.equal(needsRumour(s), false, 'the lead floor is met, as it was all the 60-hour run');
  const r = rumourTurn(s, 'warden-oren', 0, 0); assert.equal(r?.rumour?.kind, 'horde', 'told anyway'); assert.equal(r.rumour.rx, 8); assert.equal(r.rumour.ry, -4);
  assert.equal(rumourTurn(s, 'vendor-vela', 0, 0), null, 'once: no second rumour above the floor'); assert.equal(liveRumours(s).filter((q) => q.kind === 'horde').length, 1);
  // farther out on the same world: none within the old 24, one within 48
  assert.equal(nearestHorde(s, 0, 30, 24), null); const far = nearestHorde(s, 0, 30); assert.ok(far && far.d > 24 && far.d <= HORDE_RUMOUR.radius, JSON.stringify(far));
  const sh = nearestShaft(s, 0, 0); assert.ok(sh && sh.d <= PITY.radius);
});

// ------------------------------------------------------------------------------------------------ 4. quest steps that work
test('Blade Stream: while its two minutes run, the creatures that come back to a Pentagon floor are Grave Lanterns, so three can be met in time', () => {
  const s = journey(), Q = QUESTS['blade-stream'], step = Q.steps[0]; assert.equal(step.within, 120); assert.equal(step.need, 3); assert.equal(step.calls, true);
  openQuest(s, 'blade-stream'); assert.equal(questCalled(s, ['pentagon']), null, 'nothing before the first');
  const kill = (at) => questEvent(s, { on: 'kill', kind: 'graveLantern', where: ['pentagon'], at, areaId: 'pentagon:x', x: 1, y: 1 });
  kill(1000); assert.equal(questCalled(s, ['pentagon'], 1010), 'graveLantern'); assert.equal(questCalled(s, ['canyon'], 1010), null, 'only where it counts');
  assert.equal(questCalled(s, ['pentagon'], 1000 + 121), null, 'the window closed');
  const pack = respawnPack(s.seed, 'pentagon:x', 0, Array.from({ length: 20 }, (_, i) => ({ x: 5 + (i % 5), y: 5 + Math.floor(i / 5) })), [questCalled(s, ['pentagon'], 1040)], 12);
  assert.ok(pack.length >= RESPAWN.pack[0] && pack.every((q) => q.kind === 'graveLantern'), 'a pack of lanterns');
  kill(1000 + RESPAWN.every + 10); const r = kill(1000 + RESPAWN.every + 20); assert.deepEqual(r.done, ['blade-stream'], 'three within two minutes'); assert.equal(questCalled(s, ['pentagon'], 1080), null);
  // in the game: the respawn table of a Pentagon floor follows it
  const g = overworld(), q = g.save; openQuest(q, 'blade-stream'); g.area = 'dungeon'; g.map = { ...g.map, building: { pentagon: true }, enemySpawns: [{ kind: 'mirrorShade', buildingGuard: true }] };
  assert.deepEqual(g.respawnKinds('pentagon'), ['mirrorShade']); q.playSeconds = 500; questEvent(q, { on: 'kill', kind: 'graveLantern', where: g.questWhere(), at: 500, x: 1, y: 1 });
  assert.deepEqual(g.respawnKinds('pentagon'), ['graveLantern']); q.playSeconds = 700; assert.deepEqual(g.respawnKinds('pentagon'), ['mirrorShade'], 'after the window, as before');
});

test('Glyph Mine: Sela hands one Pumice Seed when it opens (and to a journey that opened it before), once, never after the sigils are taken', () => {
  const Q = QUESTS['glyph-mine']; assert.deepEqual({ seed: Q.gift.seed, n: Q.gift.n, step: Q.gift.step }, { seed: 'pumice', n: 1, step: 'wraiths' });
  const g = overworld(); g.save.perception.aperture = APERTURE_BANDS[Q.gate.tier].threshold; const before = seedCount(g.save, 'pumice');
  assert.ok(g.settleQuests().includes('glyph-mine')); assert.equal(seedCount(g.save, 'pumice'), before + 1, 'handed as it opens'); assert.equal(questState(g.save, 'glyph-mine').gifted, true);
  assert.ok(g.questNotices.some((n) => n.title === 'A GIFT')); g.settleQuests(); assert.equal(seedCount(g.save, 'pumice'), before + 1, 'once');
  const back = migrateSave(JSON.parse(JSON.stringify(g.save))); assert.equal(questState(back, 'glyph-mine').gifted, true); assert.equal(questGift(back, 'glyph-mine'), null);
  const old = journey(); openQuest(old, 'glyph-mine'); assert.equal(questState(old, 'glyph-mine').gifted, undefined); assert.equal(questGift(old, 'glyph-mine')?.seed, 'pumice', 'opened before gifts: handed now'); assert.equal(seedCount(old, 'pumice'), 1);
  const done = journey(); openQuest(done, 'glyph-mine'); questState(done, 'glyph-mine').steps = { wraiths: 10 }; assert.ok(stepDone(done, 'glyph-mine', 'wraiths')); assert.equal(questGift(done, 'glyph-mine'), null, 'not needed any more');
  assert.equal(questGift(journey(), 'glyph-mine'), null, 'not open: nothing');
});
