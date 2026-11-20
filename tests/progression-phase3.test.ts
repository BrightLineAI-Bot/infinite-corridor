// Progression Phase 3, the core kit (docs/progression-design.md rev 3, sections 2.5, 3.1-3.9, 6 and 7 row 3): Exploration only.
// Aegis and Cinder Dart from the start; Ember Ring, Fire Burst and Grave Sun by level; Aerial Step a discipline at Aperture 6 with
// Long Quickening the Motion capstone; Rift Step unchanged; the Lattice's three free passives; awakening and the hatchling from
// Infinite II; weapons never gated (the brawler gear already drops on its own stream in both modes). Classic is untouched, kept
// abilities are honoured, switching never takes anything away, and an Exploration journey from before Phase 3 keeps what it had.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { EXPLORATION, exploring, ensureProgression } from '../src/journey-start.ts';
import { startJourney, switchProgression, ownership, ownershipV0, stateV0, stateV1, compendium, adoptExploration, PROGRESSION_ROWS, ROW_BY_ID, PROGRESSION_TABLE_VERSION, pace } from '../src/progression.ts';
import { spellOpen, spellOpenClassic, explorationGateOpen, generateItem, SPELLS, APERTURE_SKILLS, APERTURE_BANDS, skillRank, BRAWLER_LOOT } from '../src/items.ts';
import { BRANCHES, ALT_PASSIVES, learnRank, learnMod, chooseCap, learnExtra, learnAerialStep, toggleAlt, respec, pointsSpent, pointsFree, hasNode, skillDurationScale, longQuickeningOn, aerialStepBlocked, capstoneOf, awakenCheck, ensureConstellation, toggleLatticePassive } from '../src/constellation.ts';
import { setSlot, availableCastables } from '../src/spell-slots.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { Game, hatchMamaHere } from '../src/game.ts';
import { namedFresh } from '../src/persistence.ts';

const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const band = (tier) => APERTURE_BANDS[tier].threshold;
const v1Save = (seed = 'PHASE3', choices = {}) => { const s = freshSave(); s.seed = seed; return startJourney(s, choices); };
const classicSave = (seed = 'PHASE3-C') => { const s = freshSave(); s.seed = seed; return startJourney(s, { mode: 0 }); };
const awakenable = (s) => { s.equipment.primary = normalizeSockets({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 8, basePower: 4, property: 'impact', tier: 'rare', affixes: [], upgradeRank: 4 }); s.equipment.primary.glyphs = ['ignite', 'chain']; return s; };
const LATER = ['ember-ring', 'fire-burst', 'grave-sun'];

test('Exploration starts with Aegis and Cinder Dart; the other starter spells open at levels 3, 6 and 10', () => {
  const s = v1Save();
  assert.equal(PROGRESSION_TABLE_VERSION, EXPLORATION.table); assert.equal(s.progression.table, EXPLORATION.table); assert.ok(exploring(s));
  assert.ok(spellOpen(s, 'aegis') && spellOpen(s, 'cinder-dart'));
  assert.equal(s.magicSkills.slots.a, 'spell:cinder-dart', 'slot A holds Cinder Dart, not a closed Ember Ring'); assert.equal(s.magicSkills.slots.b, 'spell:aegis');
  assert.ok(s.magicSkills.presets.every((p) => p.a === 'spell:cinder-dart' && p.b === 'spell:aegis')); assert.equal(s.equippedSpell, 'cinder-dart');
  for (const id of LATER) { assert.ok(!spellOpen(s, id), id); assert.ok(spellOpenClassic(s, id), `${id} is open by today's rule`); assert.ok(!availableCastables(s).includes(`spell:${id}`)); }
  assert.equal(setSlot(s, 'c', 'spell:ember-ring').ok, false, 'a closed spell cannot be slotted');
  const want = { 'ember-ring': 3, 'fire-burst': 6, 'grave-sun': 10 };
  for (let level = 1; level <= 11; level++) { s.level = level; for (const id of LATER) assert.equal(spellOpen(s, id), level >= want[id], `${id} at level ${level}`); }
  for (const [id, g] of Object.entries(EXPLORATION.gates)) if (g.level) assert.equal(g.level, want[id.slice(6)]);
  // the Game refuses a closed spell even by the legacy call, and casts it once open
  const t = v1Save('PHASE3-CAST'), g = new Game(t, 0); t.equippedSpell = 'ember-ring';
  assert.equal(g.castSpellEffect('ember-ring'), false); assert.match(g.message, /Ember Ring is not yours yet/);
  t.level = 3; t.magicSkills.cooldowns = {}; assert.notEqual(g.castSpellEffect('ember-ring'), false, 'open at level 3');
  // the Tier-13 spells keep their band; Aegis is the only one held early
  assert.ok(!spellOpen(s, 'shadow-clone') && !spellOpen(s, 'stillpoint'));
});

test('Aerial Step is a discipline at Aperture 6 for one point, with no prerequisite; Long Quickening is the Motion capstone', () => {
  const s = v1Save(); s.perception.aperture = 5; ensureConstellation(s);
  assert.match(learnAerialStep(s).message, /opens at Aperture 6/); assert.equal(skillRank(s, 'aerial-step'), 0);
  s.perception.aperture = 6; assert.equal(pointsFree(s), 1);
  const r = learnAerialStep(s); assert.ok(r.ok, r.message);
  assert.equal(skillRank(s, 'aerial-step'), 1); assert.equal(s.constellation.aerial, true); assert.equal(pointsSpent(s), EXPLORATION.aerialStep.cost); assert.equal(pointsFree(s), 0);
  assert.equal(skillRank(s, 'quickening'), 0, 'no prerequisite'); assert.ok(!hasNode(s, 'aerial-step'), 'it is not the capstone');
  assert.ok(availableCastables(s).includes('skill:aerial-step')); assert.equal(aerialStepBlocked(s), false);
  assert.equal(learnAerialStep(s).ok, false, 'once');
  // a reload keeps it as a discipline: the old reconcile never claims the Motion capstone for it, and the points add up
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(skillRank(m, 'aerial-step'), 1); assert.equal(m.constellation.aerial, true); assert.ok(!hasNode(m, 'aerial-step')); assert.equal(m.constellation.bonus, 0); assert.equal(pointsFree(m), 0);
  // the capstone: Long Quickening (2 points, Quickening mastered and Light Feet taken); no secondary form
  s.perception.aperture = 60; for (let i = 0; i < 3; i++) learnRank(s, 'motion'); learnMod(s, 'motion');
  assert.deepEqual([capstoneOf(s, BRANCHES.motion.caps[0]).name, capstoneOf(s, BRANCHES.motion.caps[0]).text], [EXPLORATION.aerialStep.cap.name, EXPLORATION.aerialStep.cap.text]);
  assert.equal(skillDurationScale(s, 'quickening'), 1);
  assert.ok(chooseCap(s, 'motion', 'aerial-step').ok); assert.ok(hasNode(s, 'aerial-step'));
  assert.equal(skillDurationScale(s, 'quickening'), ALT_PASSIVES['aerial-step'].duration, 'Quickening lasts half again as long'); assert.ok(longQuickeningOn(s));
  assert.equal(aerialStepBlocked(s), false, 'Aerial Step still casts beside it');
  s.perception.aperture = band(13); assert.match(toggleAlt(s, 'aerial-step').message, /no secondary form in Exploration/);
  // a Classic-learned Aerial Step capstone reads in Exploration as both
  const c = freshSave(); c.perception.aperture = 60; for (let i = 0; i < 3; i++) learnRank(c, 'motion'); learnMod(c, 'motion'); chooseCap(c, 'motion', 'aerial-step');
  assert.equal(skillRank(c, 'aerial-step'), 1); switchProgression(c, 1); assert.ok(exploring(c));
  assert.equal(skillRank(c, 'aerial-step'), 1); assert.ok(longQuickeningOn(c)); assert.equal(c.constellation.aerial, undefined); assert.equal(pointsSpent(c), 3 + 1 + 2, 'no point moves');
  // a respec refunds the discipline's point
  const q = v1Save('PHASE3-RESPEC'); q.perception.aperture = 12; learnAerialStep(q); q.materials.lumenDust = 99;
  assert.ok(respec(q).ok); assert.equal(skillRank(q, 'aerial-step'), 0); assert.equal(q.constellation.aerial, undefined); assert.equal(pointsFree(q), 2);
  // the Arcanum draws it (main.ts), and the Game casts it
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /bid==='motion'&&aerialDiscipline\(save\)/); assert.match(main, /act:\(\)=>learnAerialStep\(save\)/); assert.match(main, /b\.caps\.map\(c=>capstoneOf\(save,c\)\)/);
  assert.match(readFileSync('src/game.ts', 'utf8'), /if\(id==='aerial-step'&&aerialStepBlocked\(this\.save\)\)/);
});

test('Rift Step keeps its gate (Aperture 18) in Exploration, as in Classic', () => {
  assert.equal(APERTURE_SKILLS['rift-step'].threshold, 18);
  for (const s of [v1Save('RIFT-1'), classicSave('RIFT-0')]) {
    s.perception.aperture = 17; assert.equal(learnRank(s, 'rift').ok, false, 'not at 17');
    s.perception.aperture = 18; assert.ok(learnRank(s, 'rift').ok, 'at 18'); assert.equal(skillRank(s, 'rift-step'), 1);
  }
  const s = v1Save('RIFT-2'); s.perception.aperture = 17; assert.equal(stateV1(s, ROW_BY_ID['skill:rift-step']), 'locked'); s.perception.aperture = 18; assert.equal(stateV1(s, ROW_BY_ID['skill:rift-step']), 'open');
});

test('the Lattice: Sanctum, Charged Air and Spellblade are free when it opens; every other pick stays open as today', () => {
  const s = v1Save('LATTICE'); assert.deepEqual([...EXPLORATION.latticeFree], ['field:sanctum', 'field:charged-air', 'field:spellblade']);
  for (const id of EXPLORATION.latticeFree) assert.equal(stateV1(s, ROW_BY_ID[id]), 'locked');
  s.perception.aperture = band(13); assert.equal(stateV1(s, ROW_BY_ID['field:sanctum']), 'locked', 'and a Listener felled');
  s.farArray.listeners = 1;
  for (const id of EXPLORATION.latticeFree) assert.equal(ownership(s)[id], 'owned', id);
  const others = PROGRESSION_ROWS.filter((r) => r.own[0] === 'field' && !EXPLORATION.latticeFree.includes(r.id));
  assert.ok(others.length >= 18); for (const r of others) assert.equal(ownership(s)[r.id], 'open', `${r.id}: no route of its own yet, so open as today`);
  for (const key of ['field:sanctum', 'field:tempo']) assert.ok(toggleLatticePassive(s, key).ok, key);
  assert.deepEqual(s.lattice.passives, ['field:sanctum', 'field:tempo']);
});

test('awakening and the hatchling\'s mother wait for Infinite II in Exploration; Classic keeps them open', () => {
  assert.equal(EXPLORATION.gates['awakened:awakening'].tier, 12); assert.equal(EXPLORATION.gates['companion:hatchling'].tier, 12); assert.equal(APERTURE_BANDS[12].name, 'Infinite II');
  const s = awakenable(v1Save('AWAKE-1')), c = awakenable(classicSave('AWAKE-0'));
  for (const ap of [0, band(11), band(12) - 1]) { s.perception.aperture = ap; c.perception.aperture = ap;
    const r = awakenCheck(s, 'primary'); assert.equal(r.ok, false); assert.match(r.message, /Infinite II/); assert.ok(awakenCheck(c, 'primary').ok, 'Classic: as today');
    assert.equal(hatchMamaHere(s), false); assert.equal(hatchMamaHere(c), true); }
  s.perception.aperture = band(12); assert.ok(awakenCheck(s, 'primary').ok); assert.equal(hatchMamaHere(s), true);
  // in play: the Beast Hotel has no mother before the band, and talking to her place gives nothing
  const g = new Game(v1Save('HATCH-GATE'), 0), door = g.map.objects.find((o) => o.beastHotelDoor); Object.assign(g.player, { x: door.x, y: door.y });
  const r = g.enterBeastHotel(door); assert.ok(r.ok); assert.doesNotMatch(r.message, /mother/);
  assert.ok(!g.map.objects.some((o) => o.kind === 'hatchMama')); assert.equal(g.hatchMamaTalk(null).ok, false); assert.equal(g.save.mounts.hatchling.quest.state, 'none');
  g.save.perception.aperture = band(12); g.refreshBeastHotel(); const mama = g.map.objects.find((o) => o.kind === 'hatchMama'); assert.ok(mama);
  assert.ok(g.hatchMamaTalk(mama).ok); assert.equal(g.save.mounts.hatchling.quest.state, 'active');
  // a rescue begun (or kept across a switch) keeps her there whatever the band
  const k = v1Save('HATCH-KEPT'); k.mounts.hatchling.quest.state = 'active'; k.mounts.hatchling.quest.rx = 3; k.mounts.hatchling.quest.ry = 3; assert.ok(hatchMamaHere(k));
  const kept = v1Save('HATCH-KEPT-2'); kept.progression.kept.push('companion:hatchling', 'awakened:awakening'); assert.ok(hatchMamaHere(kept)); assert.ok(awakenCheck(awakenable(kept), 'primary').ok);
  assert.match(readFileSync('src/main.ts', 'utf8'), /explorationGateOpen\(save, "companion:hatchling"\)/);
});

test('weapons are never gated: the Iron Fists, Hammerfall and Great Sweep drop in Exploration, and no loot roll moves', () => {
  // generateItem reads no mode; its brawler stream (items.ts BRAWLER_LOOT, `brawler-loot:v1`) runs in both modes from the start
  const items = Array.from({ length: 400 }, (_, i) => generateItem(`CINDER-VERGE-47:drop:${i}`, 1 + (i % 30), i % 3 ? null : { ordinaryMonster: true }));
  assert.equal(hash(items), '9958f4bd0b2a3fa6', 'pinned: every roll as before Phase 3');
  const drops = (save) => { save.inventory = []; const g = new Game(save, 0); for (let i = 0; i < 40; i++) { g.obtainDrop('monster', i % 2 === 0); if (save.inventory.length > 30) save.inventory = []; } return [save.inventory, save.dropCounter]; };
  const old = freshSave(); old.seed = 'CINDER-VERGE-47'; assert.equal(hash(drops(old)), '53317e384b1ff0b1', 'an old (Classic) save drops exactly as before');
  const v1 = v1Save('CINDER-VERGE-47'); assert.equal(hash(drops(v1)), '53317e384b1ff0b1', 'an Exploration journey on that seed drops the same');
  const names = new Set(); for (let i = 0; i < 600; i++) { const s = v1Save(`LOOT-${i % 3}`); void s; names.add(generateItem(`LOOT-${i}:monster:${i}`, 2).name); }
  for (const [n] of [...BRAWLER_LOOT.primary, ...BRAWLER_LOOT.secondary]) assert.ok(names.has(n), `${n} drops at level 2`);
  for (const r of PROGRESSION_ROWS.filter((q) => q.group === 'gear')) assert.ok(['S', 'F', 'U'].includes(r.v1.route), r.id);
});

test('Classic is unchanged: today\'s tables byte for byte, every gate as before, and a Classic journey reads only today\'s rules', () => {
  assert.equal(hash([SPELLS, APERTURE_SKILLS, BRANCHES, ALT_PASSIVES]), '61cb90dc06bbd8f1', 'the spell, discipline and constellation tables');
  for (const s of [freshSave(), classicSave(), migrateSave(JSON.parse(JSON.stringify(freshSave())))]) {
    assert.ok(!exploring(s));
    for (const id of ['cinder-dart', ...LATER]) assert.ok(spellOpen(s, id), id);
    assert.ok(!spellOpen(s, 'aegis'));
    for (const id of Object.keys(EXPLORATION.gates)) assert.ok(explorationGateOpen(s, id), id);
    assert.deepEqual(ownership(s), ownershipV0(s), 'Classic reads today\'s rules');
    s.perception.aperture = 60; assert.equal(learnAerialStep(s).ok, false, 'no Aerial Step discipline in Classic');
    for (let i = 0; i < 3; i++) learnRank(s, 'motion'); learnMod(s, 'motion'); chooseCap(s, 'motion', 'aerial-step');
    assert.equal(skillRank(s, 'aerial-step'), 1, 'the capstone grants Aerial Step'); assert.equal(skillDurationScale(s, 'quickening'), 1);
    assert.equal(capstoneOf(s, BRANCHES.motion.caps[0]), BRANCHES.motion.caps[0]);
    s.perception.aperture = band(13); assert.ok(toggleAlt(s, 'aerial-step').ok); assert.ok(aerialStepBlocked(s), 'Long Quickening chosen stands in for Aerial Step, as before');
  }
  assert.deepEqual(compendium(freshSave()).ahead.map((a) => a.label), ['Aperture 6', 'Aperture 18', 'Aperture 36', 'Infinite III']);
  // A Classic journey's slots are today's (Ember Ring in A), and an Exploration journey on table 1 still reads today's rules
  assert.equal(classicSave().magicSkills.slots.a, 'spell:ember-ring');
  const t1 = freshSave(); t1.progression.mode = 1; assert.ok(!exploring(t1)); assert.ok(spellOpen(t1, 'grave-sun'));
});

test('switching keeps everything: Classic -> Exploration keeps today\'s open; Exploration -> Classic takes nothing', () => {
  const c = awakenable(classicSave('SWITCH-3')); c.playSeconds = 60;
  assert.ok(switchProgression(c, 1).ok); assert.ok(exploring(c));
  for (const id of LATER) assert.ok(spellOpen(c, id), `${id} kept at level 1`);
  for (const id of ['spell:ember-ring', 'spell:fire-burst', 'spell:grave-sun', 'awakened:awakening', 'companion:hatchling']) assert.ok(c.progression.kept.includes(id), id);
  assert.ok(awakenCheck(c, 'primary').ok, 'awakening stays open'); assert.ok(hatchMamaHere(c), 'the mother stays');
  assert.equal(ownership(c)['awakened:awakening'], 'open', 'kept access shows open, not done');
  // Exploration -> Classic: a Long Quickening capstone (no Aerial Step learned) becomes Classic's Aerial Step capstone, and Long Quickening stays
  const e = v1Save('SWITCH-LQ'); e.perception.aperture = 60; for (let i = 0; i < 3; i++) learnRank(e, 'motion'); learnMod(e, 'motion'); chooseCap(e, 'motion', 'aerial-step');
  assert.equal(skillRank(e, 'aerial-step'), 0); assert.ok(longQuickeningOn(e));
  const before = pointsSpent(e); assert.ok(switchProgression(e, 0).ok); assert.ok(!exploring(e));
  assert.equal(skillRank(e, 'aerial-step'), 1, 'Classic\'s capstone grants Aerial Step'); assert.ok(longQuickeningOn(e), 'Long Quickening kept'); assert.ok(e.progression.kept.includes('aerial-step:alt'));
  assert.equal(aerialStepBlocked(e), false); assert.equal(pointsSpent(e), before);
  // and back again: nothing moves
  assert.ok(switchProgression(e, 1).ok); assert.equal(skillRank(e, 'aerial-step'), 1); assert.ok(longQuickeningOn(e)); assert.ok(spellOpen(e, 'aegis'));
  // an Exploration Aerial Step discipline stays through Classic and back, at the same cost
  const d = v1Save('SWITCH-AS'); d.perception.aperture = 6; learnAerialStep(d); switchProgression(d, 0);
  assert.equal(skillRank(d, 'aerial-step'), 1); assert.ok(!hasNode(d, 'aerial-step')); assert.equal(pointsSpent(d), 1);
  const dm = migrateSave(JSON.parse(JSON.stringify(d))); assert.ok(!hasNode(dm, 'aerial-step'), 'Classic\'s reconcile leaves it a discipline'); assert.equal(skillRank(dm, 'aerial-step'), 1);
  switchProgression(d, 1); assert.equal(skillRank(d, 'aerial-step'), 1);
  // kept ids are always honoured, even if the band were lost
  const k = v1Save('KEPT'); k.progression.kept.push('spell:grave-sun'); assert.ok(spellOpen(k, 'grave-sun'));
});

test('migrated saves: an Exploration journey from before Phase 3 keeps what it had; Phase 3 records survive a reload exactly', () => {
  // A Release 1036 Exploration journey: table 1, Aegis kept, level 1.
  const old = v1Save('ADOPT'); old.progression.table = 1; old.magicSkills.slots.a = 'spell:ember-ring'; old.equippedSpell = 'ember-ring';
  const raw = JSON.parse(JSON.stringify(old)), m = migrateSave(raw); assert.equal(m.progression.table, 1, 'migrateSave changes nothing'); assert.ok(!exploring(m));
  const g = new Game(m, 0); assert.ok(g); assert.equal(m.progression.table, EXPLORATION.table); assert.ok(exploring(m));
  for (const id of ['cinder-dart', ...LATER, 'aegis']) assert.ok(spellOpen(m, id), `${id} still open`);
  assert.equal(m.magicSkills.slots.a, 'spell:ember-ring', 'its slots are as they were');
  assert.ok(explorationGateOpen(m, 'awakened:awakening') && hatchMamaHere(m));
  assert.equal(adoptExploration(m), 0, 'once'); assert.equal(adoptExploration(classicSave()), 0, 'never a Classic journey');
  // Phase 3 state round-trips
  const s = v1Save('ROUND'); s.perception.aperture = 60; learnAerialStep(s); for (let i = 0; i < 3; i++) learnRank(s, 'motion'); learnMod(s, 'motion'); chooseCap(s, 'motion', 'aerial-step'); s.level = 7;
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  for (const k of ['progression', 'constellation']) assert.deepEqual(back[k], s[k], k);
  assert.deepEqual(back.magicSkills.learned, s.magicSkills.learned); assert.deepEqual(ownership(back), ownership(s));
  assert.equal(JSON.stringify(migrateSave(JSON.parse(JSON.stringify(back)))), JSON.stringify(back), 'idempotent');
  // unknown progression fields still kept
  const u = v1Save('UNKNOWN'); u.progression.future = { x: 1 }; assert.deepEqual(ensureProgression(migrateSave(JSON.parse(JSON.stringify(u)))).future, { x: 1 });
});

test('the compendium reads Exploration: its core kit, its gates and Level-ups ahead', () => {
  const s = v1Save('BOOK'), c = compendium(s);
  assert.equal(c.mode.name, 'Exploration');
  const spells = c.groups.find((g) => g.id === 'spells').entries.map((e) => [e.id, e.state]);
  assert.deepEqual(spells, [['spell:cinder-dart', 'owned'], ['spell:aegis', 'owned']]);
  const ahead = Object.fromEntries(c.ahead.map((a) => [a.label, a.names]));
  assert.deepEqual(ahead['Aperture 6'], ['Ember Form', 'Quickening', 'Aerial Step']);
  assert.deepEqual(ahead['Aperture 18'], ['Veil Guard', 'Force Channel', 'Rift Step']);
  assert.deepEqual([ahead['Level 3'], ahead['Level 6'], ahead['Level 10']], [['Ember Ring'], ['Fire Burst'], ['Grave Sun']]);
  assert.deepEqual(ahead['Infinite II'], ['Awakening', 'Triceratops hatchling']);
  assert.deepEqual(ahead['Infinite III and a Listener felled'], ['Sanctum', 'Charged Air', 'Spellblade']);
  assert.ok(ahead['Infinite III'].includes('Shadow Clone')); assert.ok(!('Aperture 36' in ahead));
  s.level = 6; s.perception.aperture = 7;
  const c2 = compendium(s), sp = c2.groups.find((g) => g.id === 'spells').entries;
  assert.equal(sp.find((e) => e.id === 'spell:fire-burst').obtained, 'Opened at level 6.');
  assert.ok(!c2.ahead.some((a) => a.label === 'Level 3' || a.label === 'Level 6'));
  const as = c2.groups.find((g) => g.id === 'disciplines').entries.find((e) => e.id === 'skill:aerial-step'); assert.equal(as.state, 'open'); assert.match(as.label, /from the Arcanum/);
  learnAerialStep(s); const owned = compendium(s).groups.find((g) => g.id === 'disciplines').entries.find((e) => e.id === 'skill:aerial-step');
  assert.equal(owned.state, 'owned'); assert.match(owned.obtained, /Aperture reached 6/);
  s.perception.aperture = 60; for (let i = 0; i < 3; i++) learnRank(s, 'motion'); learnMod(s, 'motion'); chooseCap(s, 'motion', 'aerial-step');
  const lq = compendium(s).groups.find((g) => g.id === 'forms').entries.find((e) => e.id === 'aerial-step:alt');
  assert.deepEqual([lq.name, lq.state, lq.does], ['Long Quickening', 'owned', EXPLORATION.aerialStep.cap.text]); assert.match(lq.obtained, /Crowned the Motion branch/);
  // the Pace line counts an Exploration journey by its own routes: Cinder Dart and Aegis held from the start
  assert.ok(pace(s, ownership(s), true).byRoute.S >= 2);
  // reading never writes
  const before = JSON.stringify(s); compendium(s); ownership(s); assert.equal(JSON.stringify(s), before);
});

test('G1: every archetype\'s levelling core is reachable in Exploration by levelling and the Arcanum alone', () => {
  const s = v1Save('G1'); s.level = 20; s.perception.aperture = band(13); s.farArray.listeners = 1;
  assert.ok(learnAerialStep(s).ok);
  for (const bid of Object.keys(BRANCHES)) { for (let i = 0; i < 3; i++) assert.ok(learnRank(s, bid).ok); assert.ok(learnMod(s, bid).ok); for (const cap of BRANCHES[bid].caps) assert.ok(chooseCap(s, bid, cap.id).ok, cap.id); }
  const st = ownership(s), core = {
    brawler: ['skill:ember-form', 'skill:force-channel', 'ember-skin', 'colossus', 'resonant-force', 'spell:aegis', 'spell:shadow-boxing', 'spell:imbue-weapon'],
    blade: ['skill:quickening', 'skill:aerial-step', 'skill:rift-step', 'light-feet', 'slipstream', 'fold', 'anchor', 'spell:aegis', 'spell:shadow-boxing'],
    spellblade: ['spell:cinder-dart', 'skill:ember-form', 'ember-skin', 'overflow', 'spell:imbue-weapon', 'field:spellblade'],
    caster: ['spell:cinder-dart', 'spell:ember-ring', 'spell:fire-burst', 'spell:grave-sun', 'overflow', 'amplifier', 'spell:orbit-volley'],
    gunner: ['skill:force-channel', 'overflow', 'amplifier', 'skill:quickening', 'spell:aegis', 'field:charged-air'],
    warden: ['spell:aegis', 'skill:veil-guard', 'thorned-veil', 'sanctuary', 'mirror-veil', 'spell:stillpoint', 'field:sanctum'],
    beastcaller: ['skill:force-channel', 'amplifier'],
  };
  for (const [arch, ids] of Object.entries(core)) for (const id of ids) assert.equal(st[id], 'owned', `${arch}: ${id}`);
  assert.equal(st['aerial-step:alt'], 'owned', 'Long Quickening crowns Motion');
  void learnExtra; void stateV0;
});

test('wired: Exploration\'s gates are data, and namedFresh starts an Exploration journey on Phase 3\'s table', () => {
  const s = namedFresh(); assert.equal(s.progression.table, EXPLORATION.table); assert.ok(exploring(s)); assert.equal(s.magicSkills.slots.a, 'spell:cinder-dart');
  assert.ok(Object.isFrozen(EXPLORATION) && Object.isFrozen(EXPLORATION.gates));
  assert.doesNotMatch(readFileSync('src/journey-start.ts', 'utf8'), /^import (?!\{ hashSeed \} from "\.\/random\.ts")/m);
  assert.match(readFileSync('src/game.ts', 'utf8'), /adoptExploration\(save\);/);
});
