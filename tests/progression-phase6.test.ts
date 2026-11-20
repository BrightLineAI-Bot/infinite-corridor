// Progression Phase 6, milestones, the Reliquary and pity (docs/progression-design.md rev 3, sections 2.2 routes c and R, 2.5 G3,
// 2.7, 3, 6 and 7 row 6). save.feats is additive at schema 14; a milestone's threshold grants once; the first horde, Pentagon
// heart, seed-realm heart and Shell-Labyrinth vault each hold a certain reliquary, other ends one in ten by a seeded roll; the pool
// of 8 is ordered per seed; a reliquary is laid over a place as it loads, never by a generator; pity gives a lead after 200
// sections and never an ability; Classic gets the extras and a consolation; Exploration withholds exactly the c and R abilities;
// kept abilities are honoured; and every one of them has a working route.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { EXPLORATION, exploring, ensureFeats, FEAT_RECORD } from '../src/journey-start.ts';
import { startJourney, switchProgression, ownership, stateV0, stateV1, compendium, adoptExploration, howToPage, hintSubjectsHeld, hintFor, PROGRESSION_ROWS, ROW_BY_ID } from '../src/progression.ts';
import { MILESTONES, RELIQUARY, PITY, HORDE_RUMOUR, WORLD_WITHHELD, WORLD_ROUTE_OF, worldWithheld, earnedWorld, featCount, milestonesUnderWay, reliquaryOrder, reliquaryDue, reliquaryRoll } from '../src/world-routes.ts';
import { STORY_WITHHELD } from '../src/quests.ts'; // Phase 7
import { countFeat, grantWorld, reliquaryEnd, layReliquaries, openReliquary, nextFromPool, pityTick } from '../src/world-finds.ts';
import { nearestHorde, nearestShaft, pityDue, pityLead, pitySince } from '../src/world-leads.ts';
import { rumourTurn, liveRumours, nextRumour } from '../src/leads.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { toggleAlt, toggleLatticePassive, learnExtra, altChosen, altOpen, ALT_PASSIVES, WORLD_WAIT } from '../src/constellation.ts';
import { generateRegion, generateDungeon } from '../src/world.ts';
import { Game } from '../src/game.ts';

const band = (tier) => APERTURE_BANDS[tier].threshold;
const v1Save = (seed = 'PHASE6') => { const s = freshSave(); s.seed = seed; return startJourney(s, {}); };
const classicSave = (seed = 'PHASE6-C') => { const s = freshSave(); s.seed = seed; return startJourney(s, { mode: 0 }); };
// Every discipline mastered, every modifier and the capstones the c and R forms hang on, at Infinite III with a Listener felled:
// everything today's rules open is open.
function rich(s, tier = 13) {
  s.perception.aperture = band(tier); s.farArray.listeners = 1; s.level = 30;
  s.magicSkills.learned = { 'ember-form': 5, quickening: 5, 'veil-guard': 5, 'force-channel': 5, 'rift-step': 5 };
  s.constellation.mods = { 'ember-skin': true, 'light-feet': true, 'thorned-veil': true, overflow: true, 'rift-wake': true };
  s.constellation.caps = { form: 'cinder-heart', motion: 'slipstream', veil: 'sanctuary', force: 'resonant-force', rift: 'anchor' };
  s.constellation.caps2 = { veil: 'mirror-veil', form: 'colossus', force: 'amplifier', rift: 'fold' };
  s.constellation.bonus = 60;
  return s;
}
const explore = (s, n) => { s.explored ||= {}; for (let i = Object.keys(s.explored).length, k = 0; k < n; i++, k++) s.explored[`${1000 + i},0`] = true; };

test('save.feats: additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept; counters persist', () => {
  const f = freshSave();
  assert.deepEqual(f.feats, { v: 1, counts: {}, earned: {}, reliquary: { sites: {}, firsts: {} }, pity: { mark: 0, owned: 0, told: 0 } });
  const old = JSON.parse(JSON.stringify(f)); delete old.feats;
  assert.deepEqual(migrateSave(old).feats, f.feats, 'a journey from before gets an empty record');
  const odd = JSON.parse(JSON.stringify(f));
  odd.feats = { counts: { dives: 4.7, glideTiles: -3, airCasts: 'x', big: 1e12 }, earned: { 'anchor:alt': { route: 'c', at: 9, from: 'deepFloors' }, bad: { route: 'q' }, 'x:alt': 7 },
    reliquary: { sites: { a: { kind: 'horde', area: 'dungeon:x', x: 3, y: 4, state: 'waiting' }, b: { area: 5 }, c: { kind: 'deep', area: 'd', x: '2', y: 1, state: 'odd' } }, firsts: { horde: 'a', pentagon: 3 }, mine: 1 },
    pity: { mark: 40, owned: -2, told: 2 }, future: 'kept' };
  const n = migrateSave(odd).feats;
  assert.deepEqual(n.counts, { dives: 4, big: FEAT_RECORD.countMax });
  assert.deepEqual(Object.keys(n.earned), ['anchor:alt']);
  assert.deepEqual(n.reliquary.sites, { a: { kind: 'horde', area: 'dungeon:x', x: 3, y: 4, state: 'waiting' }, c: { kind: 'deep', area: 'd', x: 2, y: 1, state: 'waiting' } });
  assert.deepEqual(n.reliquary.firsts, { horde: 'a' }); assert.equal(n.reliquary.mine, 1);
  assert.deepEqual(n.pity, { mark: 40, owned: 0, told: 2 }); assert.equal(n.future, 'kept');
  // counted deeds survive a save round trip
  const s = v1Save(); countFeat(s, 'dives', 3); countFeat(s, 'glideTiles', 250);
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(featCount(back, 'dives'), 3); assert.equal(featCount(back, 'glideTiles'), 250); assert.deepEqual(back.feats, s.feats);
});

test('Exploration withholds exactly the milestone (c) and reliquary (R) abilities, and nothing else', () => {
  const cR = PROGRESSION_ROWS.filter((r) => ['c', 'R'].includes(r.v1.route)).map((r) => r.id).sort();
  assert.deepEqual([...WORLD_WITHHELD].sort(), cR, 'the withheld set is the design\'s c and R rows');
  assert.equal(cR.length, 18); assert.equal(MILESTONES.length, 10); assert.equal(RELIQUARY.pool.length, 8);
  for (const id of RELIQUARY.pool) assert.equal(ROW_BY_ID[id].v1.route, 'R', id);
  for (const m of MILESTONES) assert.equal(ROW_BY_ID[m.ability].v1.route, 'c', m.ability);
  assert.ok(EXPLORATION.table >= 3); // Phase 7 moved it to 4 (quests and threads: tests/progression-phase7.test.ts)
  // A journey where today's rules open everything: under Exploration only the c and R rows differ from the same journey
  // holding them all kept.
  const s = rich(v1Save('WITHHOLD')), all = rich(v1Save('WITHHOLD')); all.progression.kept = [...all.progression.kept, ...WORLD_WITHHELD, ...STORY_WITHHELD]; s.progression.kept = [...s.progression.kept, ...STORY_WITHHELD]; // Phase 7's b and d: held apart here
  const a = ownership(s), b = ownership(all), differ = Object.keys(a).filter((id) => a[id] !== b[id]).sort();
  assert.deepEqual(differ, cR, 'exactly the c and R rows are shut');
  for (const id of cR) { assert.equal(a[id], 'locked', id); assert.ok(['owned', 'open'].includes(stateV0(s, ROW_BY_ID[id])), `${id}: Classic's rules have it`); assert.equal(b[id], stateV0(s, ROW_BY_ID[id]), id); }
  // and the game refuses them
  for (const id of cR.filter((q) => q.endsWith(':alt'))) { const node = id.slice(0, -4); assert.deepEqual(toggleAlt(s, node), { ok: false, message: WORLD_WAIT }, id); assert.equal(altOpen(s, node), false); }
  for (const id of cR.filter((q) => q.startsWith('field:'))) assert.deepEqual(toggleLatticePassive(s, id), { ok: false, message: WORLD_WAIT }, id);
  assert.deepEqual(learnExtra(s, 'motion', 'casting-wind'), { ok: false, message: WORLD_WAIT });
  // what is still routed to Phase 8 stays open by today's rules (Phase 7's quests and threads: tests/progression-phase7.test.ts)
  for (const id of ['ember-mend', 'colossus:alt', 'light-feet:alt', 'field:tempo', 'field:power-aegis', 'field:arc-wave']) if (ROW_BY_ID[id]) assert.notEqual(a[id], 'locked', id);
  assert.ok(toggleAlt(s, 'colossus').ok, 'a Viscera form keeps today\'s switch'); assert.ok(toggleLatticePassive(s, 'field:tempo').ok, 'a quest\'s Lattice pick stays open');
  assert.ok(learnExtra(s, 'form', 'arcane-edge').ok, 'a thread\'s extra node, kept, stays open');
  // Classic withholds nothing
  const c = rich(classicSave('WITHHOLD-C')); for (const id of cR) assert.equal(ownership(c)[id], stateV0(c, ROW_BY_ID[id]), id);
  assert.ok(toggleAlt(c, 'anchor').ok); assert.ok(toggleLatticePassive(c, 'field:rapid-reload').ok);
});

test('milestones: counted, shown from the first count, and each threshold grants once', () => {
  const s = rich(v1Save('MILES'));
  assert.equal(milestonesUnderWay(s).length, 0); assert.ok(!hintSubjectsHeld(s).includes('milestone:first'));
  assert.deepEqual(countFeat(s, 'dives', 9), []);
  assert.equal(stateV1(s, ROW_BY_ID['mirror-veil:alt']), 'open', 'counting: open, with its count');
  assert.match(compendium(s).groups.find((g) => g.id === 'forms').entries.find((e) => e.id === 'mirror-veil:alt').label, /Dives cleared: 9 of 10/);
  assert.ok(hintSubjectsHeld(s).includes('milestone:first')); assert.match(hintFor(s, 'milestone:first').text, /Dives cleared: 9 of 10\. Something answers at 10\./);
  const [got] = countFeat(s, 'dives');
  assert.equal(got.id, 'mirror-veil:alt'); assert.equal(got.given, true); assert.equal(got.route, 'c');
  assert.ok(earnedWorld(s, 'mirror-veil:alt')); assert.ok(s.progression.kept.includes('mirror-veil:alt'));
  assert.equal(ownership(s)['mirror-veil:alt'], 'owned'); assert.ok(toggleAlt(s, 'mirror-veil').ok);
  assert.deepEqual(countFeat(s, 'dives', 50), [], 'once');
  assert.match(howToPage(s, 'mirror-veil:alt').sections.find(([k]) => k === 'Where it came from')[1], /Earned by a milestone.*Dives cleared, 10/);
  // every milestone's threshold grants its own ability
  const t = rich(v1Save('MILES-ALL'));
  for (const m of MILESTONES) {
    if (m.derived) { t.worldBeasts = { a: { slain: 6 }, b: { slain: m.need - 6 } }; } else countFeat(t, m.key, m.need - 1);
    const notes = countFeat(t, m.key, m.derived ? 0 : 1); assert.equal(notes.length, 1, m.key); assert.equal(notes[0].id, m.ability);
  }
  for (const id of WORLD_WITHHELD.filter((q) => WORLD_ROUTE_OF[q] === 'c')) assert.equal(ownership(t)[id], id === 'casting-wind' ? 'open' : 'owned', id);
  assert.ok(learnExtra(t, 'motion', 'casting-wind').ok, 'Casting Wind earned: learned for a point'); assert.equal(ownership(t)['casting-wind'], 'owned');
  // a found form opens before Infinite III (its switch works once its node is learned)
  const e = rich(v1Save('EARLY'), 11); assert.ok(!toggleAlt(e, 'colossus').ok, 'today\'s forms still wait for Infinite III');
  countFeat(e, 'deepFloors', 10); assert.ok(altOpen(e, 'anchor')); assert.ok(toggleAlt(e, 'anchor').ok); assert.ok(altChosen(e, 'anchor'));
  assert.equal(ownership(e)['field:rapid-reload'], 'locked'); countFeat(e, 'chargedReleases', 200);
  assert.equal(ownership(e)['field:rapid-reload'], 'open', 'a Lattice pick found before the Lattice: open, waiting for it');
});

test('the Reliquary: certain on each first-clear kind, then the seeded roll or nothing', () => {
  const s = v1Save('RELIC'), map = generateDungeon('RELIC'), at = { x: 5, y: 5 };
  for (const kind of RELIQUARY.certain) {
    const o = reliquaryEnd(s, map, kind, `${kind}:first`, 'area-1', at);
    assert.ok(o && o.kind === 'reliquary' && o.site === `${kind}:first`, `${kind}: the first is certain`);
    assert.equal(s.feats.reliquary.firsts[kind], `${kind}:first`);
    assert.equal(reliquaryEnd(s, map, kind, `${kind}:first`, 'area-1', at), null, 'each end holds one');
  }
  for (const kind of ['horde', 'pentagon', 'seedRealm']) for (let i = 0; i < 40; i++) assert.equal(reliquaryDue(s, kind, `${kind}:${i}`), null, `${kind}: only the first`);
  let later = 0; for (let i = 0; i < 400; i++) if (reliquaryDue(s, 'shellVault', `shell:${i}`) === 'labyrinth') later++;
  assert.ok(later > 15 && later < 70, `a later Shell-Labyrinth vault is a labyrinth vault's roll (${later}/400)`);
  // a taste horde is a horde: the kind is the horde's, whatever its size (game.ts: hordeKill's `cleared`)
  assert.match(readFileSync('src/game.ts', 'utf8'), /this\.reliquaryHere\("horde", e\.hordeOf\)/);
});

test('the Reliquary: one in ten at other dungeon ends, seeded per site', () => {
  for (const kind of Object.keys(RELIQUARY.chance)) {
    let n = 0; const N = 20000; for (let i = 0; i < N; i++) if (reliquaryRoll('RATE', kind, `site:${i}`)) n++;
    assert.ok(Math.abs(n / N - .1) < .01, `${kind}: ${n / N}`);
    for (let i = 0; i < 50; i++) assert.equal(reliquaryRoll('RATE', kind, `s${i}`), reliquaryRoll('RATE', kind, `s${i}`), 'the same site, the same answer');
  }
  const s = v1Save('RATE'); let due = 0; for (let i = 0; i < 2000; i++) if (reliquaryDue(s, 'deep', `the-deep:x:f${i}`)) due++;
  assert.ok(due > 150 && due < 250, `deep floors: ${due}/2000`);
});

test('the pool: 8 abilities in a seeded order, the same for a seed, given in that order', () => {
  const a = reliquaryOrder('POOL-A');
  assert.deepEqual([...a].sort(), [...RELIQUARY.pool].sort()); assert.deepEqual(reliquaryOrder('POOL-A'), a);
  const orders = new Set(['POOL-A', 'POOL-B', 'POOL-C', 'POOL-D', 'POOL-E', 'POOL-F'].map((q) => reliquaryOrder(q).join()));
  assert.ok(orders.size >= 4, 'seeds differ');
  const s = rich(v1Save('POOL-A')), map = generateDungeon('POOL-A'), got = [];
  for (let i = 0; i < 9; i++) {
    const o = reliquaryEnd(s, map, 'deep', `forced:${i}`, 'a', { x: 5, y: 5 }) || (s.feats.reliquary.sites[`forced:${i}`] = { kind: 'deep', area: 'a', x: 1, y: 1, state: 'waiting' }, { kind: 'reliquary', site: `forced:${i}` });
    const r = openReliquary(s, o); assert.ok(r.ok && r.first); got.push(r.notice?.id || null);
    assert.deepEqual(openReliquary(s, o).first, false, 'opened once');
  }
  assert.deepEqual(got.slice(0, 8), [...a], 'in the seed\'s order'); assert.equal(got[8], null, 'the ninth: nothing left');
  for (const id of RELIQUARY.pool) { assert.equal(ownership(s)[id], 'owned', id); assert.match(compendium(s).groups.flatMap((g) => g.entries).find((e) => e.id === id).obtained, /Found in a reliquary/); }
  // Exploration skips what is already kept
  const k = v1Save('POOL-A'); k.progression.kept.push(a[0]); assert.equal(nextFromPool(k), a[1]);
});

test('old floors are byte for byte: a reliquary is laid over the floor as it loads, never generated', () => {
  const id = 'dungeon:FLOORS:g1:3:4:dungeon-g1-3-4-1', base = JSON.stringify(generateDungeon('FLOORS', id));
  const s = v1Save('FLOORS'), map = generateDungeon('FLOORS', id);
  assert.equal(JSON.stringify(map), base, 'the generator takes no part');
  assert.deepEqual(layReliquaries(map, s, id), [], 'nothing recorded: nothing laid'); assert.equal(JSON.stringify(map), base);
  reliquaryEnd(s, map, 'horde', id, id, { x: 5, y: 5 });
  const again = generateDungeon('FLOORS', id); assert.equal(JSON.stringify(again), base, 'a later generation is the same');
  layReliquaries(again, s, id); layReliquaries(again, s, id);
  assert.equal(again.objects.filter((o) => o.kind === 'reliquary').length, 1, 'laid once per load');
  assert.deepEqual(again.tiles, JSON.parse(base).tiles); assert.deepEqual(again.objects.filter((o) => o.kind !== 'reliquary'), JSON.parse(base).objects);
  // no generator imports the Phase 6 modules
  for (const f of ['src/world.ts', 'src/deep-dungeons.ts', 'src/the-deep.ts', 'src/labyrinths.ts', 'src/keeps.ts', 'src/castles.ts', 'src/pentagon.ts', 'src/seed-realms.ts', 'src/turtle-shell.ts', 'src/revenant-horde.ts'])
    assert.ok(!/world-(routes|finds|leads)/.test(readFileSync(f, 'utf8')), f);
});

test('in the game: an end lays a reliquary where it came, a reload lays it again, and opening it gives the pool\'s next', () => {
  const s = v1Save('INGAME'), g = new Game(s, 0), o = g.reliquaryHere('horde', 'dungeon:INGAME:test');
  assert.ok(o && g.map.objects.includes(o)); assert.ok(g.questNotices.some((q) => q.title === 'A RELIQUARY'));
  g.loadArea('overworld'); assert.equal(g.map.objects.filter((q) => q.kind === 'reliquary').length, 1, 'laid again as the area loads');
  const laid = g.map.objects.find((q) => q.kind === 'reliquary'), r = g.openReliquaryHere(laid);
  assert.ok(r.ok && r.notice?.given); assert.equal(r.notice.id, reliquaryOrder('INGAME')[0]); assert.ok(s.progression.kept.includes(r.notice.id));
  g.loadArea('overworld'); assert.equal(g.map.objects.filter((q) => q.kind === 'reliquary').length, 0, 'an opened one is not laid again');
  assert.equal(g.reliquaryHere('horde', 'dungeon:INGAME:second'), null, 'the second horde: nothing');
});

test('pity: after 200 sections with nothing gained, one strong lead, never an ability', () => {
  const s = v1Save('PITY'); s.perception.aperture = band(12);
  pityTick(s); assert.equal(pitySince(s), 0);
  explore(s, PITY.sections - 1); assert.equal(pityDue(s), false); assert.equal(pityLead(s, 0, 0), null);
  explore(s, 1); assert.equal(pityDue(s), true);
  const before = JSON.stringify(ownership(s)), kept = [...s.progression.kept], earned = JSON.stringify(s.feats.earned);
  const t = rumourTurn(s, 'warden-oren', 0, 0);
  assert.ok(t?.strong, 'the strong lead comes whatever the lead floor'); assert.equal(t.rumour.kind, 'pity');
  assert.ok(['horde', 'deep', 'milestone'].includes(t.rumour.target));
  if (t.rumour.target !== 'milestone') assert.ok(Math.max(Math.abs(t.rumour.rx), Math.abs(t.rumour.ry)) <= PITY.radius, 'within reach');
  assert.equal(JSON.stringify(ownership(s)), before, 'no ability'); assert.deepEqual(s.progression.kept, kept); assert.equal(JSON.stringify(s.feats.earned), earned);
  assert.equal(pityDue(s), false, 'the count starts again from the lead'); assert.equal(s.feats.pity.told, 1);
  assert.ok(liveRumours(s).some((r) => r.kind === 'pity'));
  // gaining something starts it again; Classic has no pity; nothing left to find, no pity
  explore(s, 150); countFeat(s, 'dives', 10); explore(s, 60); assert.equal(pityDue(s), false, 'an ability gained resets the count');
  const c = classicSave('PITY-C'); explore(c, 400); assert.equal(pityDue(c), false);
  const done = v1Save('PITY-D'); done.progression.kept.push(...WORLD_WITHHELD); explore(done, 400); assert.equal(pityDue(done), false);
  // the deep lead names a floor whose roll truly holds a reliquary
  for (const seed of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']) { const q = nearestShaft({ seed, atlas: {} }, 0, 0, PITY.radius); if (q) assert.ok(reliquaryRoll(seed, 'deep', `${q.shaft}:f${q.floor}`)); }
});

test('horde rumours from Infinite II point at a real, unentered horde crossing', () => {
  let found = 0, checked = 0;
  for (const seed of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8']) {
    const s = v1Save(seed); s.perception.aperture = band(12);
    const h = nearestHorde(s, 0, 0, HORDE_RUMOUR.radius); if (!h) continue; found++;
    // the crossing the hash names is the one the section really holds (world.ts addDungeonLandmark), and its horde roll holds
    const region = generateRegion(seed, h.rx, h.ry, 1), door = region.objects.find((o) => o.kind === 'dungeon' && o.landmark && String(o.id).startsWith('dungeon-g1-'));
    if (door) { checked++; assert.equal(`dungeon:${seed}:g1:${h.rx}:${h.ry}:${door.id}`, h.dungeon); }
    const r = nextRumour(s, 0, 0); assert.ok(r && ['hatchling', 'awakening', 'horde'].includes(r.kind));
    s.mounts.hatchling.owned = true; s.equipment.primary.awakened = { resonance: 'x' };
    const hr = nextRumour(s, 0, 0); assert.equal(hr.kind, 'horde'); assert.equal(hr.dungeon, h.dungeon);
    s.consequences.dungeons[h.dungeon] = { visits: 1 }; assert.equal(nearestHorde(s, 0, 0, HORDE_RUMOUR.radius)?.dungeon === h.dungeon, false, 'entered: no longer named');
    const low = v1Save(seed); low.perception.aperture = band(11); low.mounts.hatchling.owned = true; assert.notEqual(nextRumour(low, 0, 0)?.kind, 'horde', 'not before Infinite II');
  }
  assert.ok(found >= 5, `a horde within ${HORDE_RUMOUR.radius} sections on most seeds (${found}/8)`); assert.ok(checked >= 3);
});

test('Classic: milestones and reliquaries are extra routes, and what is already yours pays a consolation', () => {
  const c = rich(classicSave('CONSOLE')); c.materials.lumenDust = 0;
  const [q] = countFeat(c, 'dives', 10);
  assert.equal(q.given, false); assert.equal(q.dust, RELIQUARY.consolation.dust); assert.equal(c.materials.lumenDust, RELIQUARY.consolation.dust);
  assert.match(q.text, /would have taught Stillwater/); assert.ok(earnedWorld(c, 'mirror-veil:alt')); assert.deepEqual(countFeat(c, 'dives', 5), []);
  // before Infinite III a found form is a real extra: its switch opens early
  const e = rich(classicSave('CONSOLE-E'), 11); assert.ok(!toggleAlt(e, 'anchor').ok);
  const [g] = countFeat(e, 'deepFloors', 10); assert.equal(g.given, true); assert.ok(toggleAlt(e, 'anchor').ok); assert.equal(ownership(e)['anchor:alt'], 'owned');
  // a Classic reliquary: the pool's next not yet earned; already open by today's rules, a consolation that names it
  const r = rich(classicSave('CONSOLE-R')), map = generateDungeon('CONSOLE-R'); r.materials.lumenDust = 0;
  const o = reliquaryEnd(r, map, 'pentagon', 'p1', 'a', { x: 5, y: 5 }), out = openReliquary(r, o);
  assert.equal(out.notice.id, reliquaryOrder('CONSOLE-R')[0]); assert.equal(out.notice.given, false); assert.equal(r.materials.lumenDust, RELIQUARY.consolation.dust);
});

test('kept abilities are honoured, switching never removes anything, and a Phase 3 Exploration journey keeps what it had', () => {
  const s = rich(v1Save('KEPT')); s.progression.kept.push('sanctuary:alt', 'field:shatterpoint');
  assert.ok(toggleAlt(s, 'sanctuary').ok); assert.ok(toggleLatticePassive(s, 'field:shatterpoint').ok);
  countFeat(s, 'glideTiles', 1000); const earned = Object.keys(s.feats.earned);
  assert.ok(switchProgression(s, 0).ok); assert.ok(switchProgression(s, 1).ok);
  for (const id of ['sanctuary:alt', 'field:shatterpoint', ...earned]) { assert.ok(!worldWithheld(s, id), id); assert.equal(ownership(s)[id], 'owned', id); }
  // a Classic journey switched to Exploration keeps what today's rules had open
  const c = rich(classicSave('KEPT-C')); switchProgression(c, 1); assert.equal(c.progression.table, EXPLORATION.table);
  for (const id of WORLD_WITHHELD) assert.equal(ownership(c)[id], stateV0(c, ROW_BY_ID[id]), id);
  // an Exploration journey on Phase 3's table (2): its first load under table 3 keeps the c and R abilities it could use, no more
  const old = rich(v1Save('KEPT-OLD')); old.progression.table = EXPLORATION.coreTable; delete old.constellation.caps.rift; delete old.magicSkills.learned.quickening;
  assert.ok(!exploring(old)); const n = adoptExploration(old); assert.ok(n > 0); assert.equal(old.progression.table, EXPLORATION.table); assert.ok(exploring(old));
  assert.ok(old.progression.kept.includes('cinder-heart:alt') && old.progression.kept.includes('field:rapid-reload'));
  assert.ok(!old.progression.kept.includes('anchor:alt') && !old.progression.kept.includes('quickening:alt') && !old.progression.kept.includes('casting-wind'), 'not open then: Exploration\'s from now');
  assert.ok(!old.progression.kept.includes('spell:ember-ring') || old.level >= 3, 'the core kit\'s gates are untouched');
  const g = rich(v1Save('KEPT-GAME')); g.progression.table = EXPLORATION.coreTable; new Game(g, 0); assert.equal(g.progression.table, EXPLORATION.table);
});

test('reachability: every c and R ability has a working route', () => {
  const game = readFileSync('src/game.ts', 'utf8');
  // every milestone's deed is counted by the game (a derived one is read from the save, and the game checks it at the deed)
  for (const m of MILESTONES) assert.match(game, new RegExp(`worldFeat\\("${m.key}"`), m.key);
  // every reliquary kind has its end in the game
  for (const kind of [...RELIQUARY.certain, ...Object.keys(RELIQUARY.chance)]) assert.match(game, new RegExp(`reliquaryHere\\("${kind}"`), kind);
  // and each threshold, and the pool, reach every ability from a fresh Exploration journey
  const s = rich(v1Save('REACH')), map = generateDungeon('REACH');
  for (const m of MILESTONES) { if (m.derived) s.worldBeasts = { x: { slain: m.need } }; countFeat(s, m.key, m.derived ? 0 : m.need); }
  for (let i = 0; i < RELIQUARY.pool.length; i++) openReliquary(s, reliquaryEnd(s, map, RELIQUARY.certain[i % 4] === 'horde' && i ? 'deep' : RELIQUARY.certain[i % 4], `r${i}`, 'a', { x: 5, y: 5 }) || (s.feats.reliquary.sites[`r${i}`] = { kind: 'deep', area: 'a', x: 1, y: 1, state: 'waiting' }, { kind: 'reliquary', site: `r${i}` }));
  for (const id of WORLD_WITHHELD) { assert.ok(!worldWithheld(s, id), id); assert.equal(ownership(s)[id], id === 'casting-wind' ? 'open' : 'owned', id); }
  assert.ok(learnExtra(s, 'motion', 'casting-wind').ok); assert.equal(ownership(s)['casting-wind'], 'owned');
  // the game's own deeds count: a glide, a cast in the air, a charged release, a fire survived, a Deep floor
  const t = v1Save('REACH-G'), g = new Game(t, 0);
  g.worldFeat('glideTiles', 3); g.featRelease(7); g.featRelease(7); g.featRelease(8); g.worldFeat('burnsSurvived');
  assert.equal(featCount(t, 'glideTiles'), 3); assert.equal(featCount(t, 'chargedReleases'), 2, 'a release counts once'); assert.equal(featCount(t, 'burnsSurvived'), 1);
  const foe = { id: 'f', x: g.player.x, y: g.player.y, _beatAt: 0 }; g.lastUpdateNow = 100; g.featKill(foe); assert.equal(featCount(t, 'beatKills'), 1, 'felled on the beat');
});

test('wired: modules built and precached; the Journal shows milestones; no model names', () => {
  const build = readFileSync('scripts/build.mjs', 'utf8'), sw = readFileSync('sw.js', 'utf8'), pg = readFileSync('proving-ground/sw.js', 'utf8'), main = readFileSync('src/main.ts', 'utf8');
  for (const m of ['world-routes', 'world-finds', 'world-leads']) { assert.ok(build.includes(`'${m}'`), m); assert.ok(sw.includes(`./src/${m}.js?v=`), m); assert.ok(pg.includes(`../src/${m}.js?v=`), m); }
  assert.match(main, /milestonesUnderWay\(save\)/); assert.match(readFileSync('src/renderer.ts', 'utf8'), /o\.kind === "reliquary"/);
  for (const f of ['src/world-routes.ts', 'src/world-finds.ts', 'src/world-leads.ts']) assert.ok(!/claude|opus|sonnet|fable/i.test(readFileSync(f, 'utf8')), f);
  assert.ok(ensureFeats(freshSave()));
});
