// Progression Phase 2 (docs/progression-design.md rev 3, sections 4.0, 6 and 7 row 2): save.progression (modes and the start
// version), the switch rules, the journey creator's choices, random seeds for new journeys, and start version 1's frame turn for
// every fixed direction (the old towns, the Arcana homes, the Readings and their Torn Pages, the Far Sleep's edge, the Surveyor's
// statue line, the Viewport's first hunt). Old journeys load as Classic at start version 0, and every direction stays as it was.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { hashSeed } from '../src/random.ts';
import { ensureProgression, frameOf, frameByIndex, saveFrame, toFrame, fromFrame, turnSection, turnBearing, sectionWords, useJourneyFrame, activeFrame, frameFor, IDENTITY_FRAME, START_FRAME, COMPASS, PROGRESSION_RECORD } from '../src/journey-start.ts';
import { startJourney, switchProgression, switchKeeps, ownership, stateV0, PROGRESSION_ROWS, START_KIT, startCards, compendium, SWITCH_TEXT } from '../src/progression.ts';
import { namedFresh, randomSeed } from '../src/persistence.ts';
import { spellOpen, weaponKey, toolKey, WEAPON_SCALING, TOOL_SCALING, SCALING_LABELS } from '../src/items.ts';
import { generateRegion, regionSettled } from '../src/world.ts';
import { oldTownSections, oldTownAt, OLD_TOWNS, hamletSection, fixedPlaceSection } from '../src/settlements.ts';
import { openSeaSection, farSleepSection, farSleepDepth, FAR_SLEEP_DEPTH, sectionRegion } from '../src/landscape.ts';
import { readingAt, inArcanaHome, arcanaHint, readingRegionHint, ARCANA_REGIONS, READING_BANDS, regionVersionFor, regionFrame, arcanaRate } from '../src/lore.ts';
import { pageIn } from '../src/torn-pages.ts';
import { surveyorStatueSection, SURVEYOR } from '../src/surveyor.ts';
import { viewportContracts, ashenMeridianTarget, ashenMeridianSection, ensureViewportState, freshViewportState } from '../src/foundry.ts';
import { guideHostable } from '../src/waymark-guides.ts';
import { learnRank } from '../src/constellation.ts';
import { Game } from '../src/game.ts';

const OLD = 'CINDER-VERGE-47', TIM = 'CORRIDOR-MUHAPQHU';
const seedWith = (pred, prefix = 'TURN') => { for (let i = 0; i < 5000; i++) { const s = `${prefix}-${i}`; if (pred(frameOf(s, 1))) return s; } throw new Error('no seed'); };
const ODD = seedWith((f) => f.turn === 1 && !f.mirror), MIRROR = seedWith((f) => f.mirror && f.turn === 3), QUARTER = seedWith((f) => f.turn === 2 && !f.mirror);
const v1Save = (seed, choices = {}) => { const s = freshSave(); s.seed = seed; return startJourney(s, choices); };
const heading = (key) => ({ e: 0, ne: 45, n: 90, nw: 135, w: 180, sw: 225, s: 270, se: 315 })[key] * Math.PI / 180;
const along = (key, d) => ({ rx: Math.round(Math.cos(heading(key)) * d), ry: Math.round(-Math.sin(heading(key)) * d) });
// The original rules, written out here so a change to the identity path shows.
const readingAtOld = (x, y) => { const d = Math.abs(x) + Math.abs(y); if (d <= 6) return 'longCampaign'; if (d > 35) return 'dreamlands'; const q = -y >= Math.abs(x) ? 'n' : y >= Math.abs(x) ? 's' : x > 0 ? 'e' : 'w'; return ({ middle: { n: 'riverThatRemembers', e: 'transparentEye', s: 'yellowCity', w: 'pathAlone' }, far: { n: 'threeBrothers', e: 'bookOfImages', s: 'underTheFloor', w: 'secondCampaign' } })[d <= 18 ? 'middle' : 'far'][q]; };

test('save.progression: normalised, migrated and round-tripped; unknown fields kept; an old save is Classic at start 0', () => {
  const f = freshSave();
  assert.deepEqual(f.progression, { v: 1, mode: 0, table: 1, start: 0, kept: [], log: [] });
  const old = JSON.parse(JSON.stringify(f)); delete old.progression;
  assert.deepEqual(migrateSave(old).progression, { v: 1, mode: 0, table: 1, start: 0, kept: [], log: [] }, 'no record: Classic, start 0');
  const junk = { progression: { mode: 'v1', start: -3, table: 'x', kept: ['spell:aegis', 'spell:aegis', 7, ''], log: [{ from: 0, to: 1 }, 'bad'], kit: 'no', future: { a: 1 } } };
  const p = ensureProgression(junk);
  assert.deepEqual([p.mode, p.start, p.table, p.kept, p.log.length, 'kit' in p, p.future], [0, 0, 1, ['spell:aegis'], 1, false, { a: 1 }]);
  const v1 = v1Save(ODD, { weapon: 'cinder-pike', tool: 'rift-bombard' }); v1.progression.extra = 'kept';
  const back = migrateSave(JSON.parse(JSON.stringify(v1)));
  assert.deepEqual(back.progression, v1.progression, 'a v1 record survives the round trip exactly');
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(back))).progression, v1.progression, 'idempotent');
  assert.equal(PROGRESSION_RECORD.newMode, 1); assert.equal(START_FRAME.version, 1);
});

test('old journeys: no record loads as v0 at start 0, the identity frame, and their world sections byte for byte', () => {
  const s = freshSave(); s.seed = TIM; const raw = JSON.parse(JSON.stringify(s)); delete raw.progression;
  const m = migrateSave(raw); assert.equal(m.progression.mode, 0); assert.equal(m.progression.start, 0);
  assert.equal(saveFrame(m), IDENTITY_FRAME);
  const sections = [[0, 0], [4, -2], [-5, 3], [5, -2], [3, 1], [-7, 4], [12, -9], [30, 20], [-40, 2]];
  const before = sections.map(([x, y]) => JSON.stringify(generateRegion(TIM, x, y)));
  useJourneyFrame(v1Save(ODD)); // another journey's frame never touches this seed
  assert.deepEqual(sections.map(([x, y]) => JSON.stringify(generateRegion(TIM, x, y))), before);
  useJourneyFrame(m);
  assert.deepEqual(sections.map(([x, y]) => JSON.stringify(generateRegion(TIM, x, y))), before);
  assert.ok(generateRegion(TIM, 4, -2).settlement?.id === 'glasshaven' && generateRegion(TIM, -5, 3).settlement?.id === 'coilmarket');
  assert.deepEqual([...oldTownSections(TIM)], [['4,-2', '4,-2'], ['-5,3', '-5,3']]);
  for (let x = -45; x <= 45; x += 3) for (let y = -45; y <= 45; y += 4) {
    assert.equal(readingAt(x, y), readingAtOld(x, y)); assert.equal(farSleepSection(x, y), Math.abs(x) + Math.abs(y) > FAR_SLEEP_DEPTH);
  }
  assert.equal(arcanaHint('bells'), 'south-west of the Refuge, 25 to 50 sections out');
  assert.equal(readingRegionHint('riverThatRemembers'), 'north, 7 to 18 sections out');
  const c = viewportContracts(OLD)[0]; assert.deepEqual([c.title, c.target, c.summary], ['The Ashen Meridian', { rx: 5, ry: -2 }, 'A Vesperwing circles an exposed crossing five sections east and two north.']);
  assert.deepEqual(ashenMeridianSection(m), { rx: 5, ry: -2 });
  assert.deepEqual(fixedPlaceSection(TIM, 'mireApostle', saveFrame(m)), { rx: -7, ry: 4 });
  const oldHunts = JSON.stringify(m.viewport.contracts); assert.equal(JSON.stringify(ensureViewportState(migrateSave(JSON.parse(JSON.stringify(m)))).contracts), oldHunts, 'an old journey keeps its hunts exactly');
  assert.equal(regionVersionFor(false), 1); assert.equal(regionVersionFor(false, true, 0), 1); assert.equal(regionVersionFor(true, true, 1), 0);
  // the statue keeps the old rule (a link in the north-east, and no link at all)
  const st = freshSave(); st.seed = TIM; st.lore.surveyor = { links: Array.from({ length: SURVEYOR.links }, (_, i) => i), where: { [SURVEYOR.links - 1]: `dungeon:${TIM}:g1:10:-10:x` } };
  assert.deepEqual(surveyorStatueSection(st), { rx: 18, ry: -18 });
});

test('new journeys: Exploration at start version 1 with a random seed, today\'s kit and Aegis; Classic keeps today\'s start', () => {
  const seeds = new Set(); for (let i = 0; i < 60; i++) seeds.add(randomSeed()); assert.equal(seeds.size, 60, 'random seeds differ');
  const a = namedFresh(), b = namedFresh();
  assert.notEqual(a.seed, b.seed); assert.match(a.seed, /^CORRIDOR-[0-9A-Z]+$/); assert.notEqual(a.seed, OLD);
  for (const s of [a, b]) {
    assert.deepEqual([s.progression.mode, s.progression.start, s.progression.kit], [1, 1, { weapon: 'salvage-blade', tool: 'spark-coil' }]);
    assert.ok(spellOpen(s, 'aegis'), 'Aegis is held from the start'); assert.equal(s.magicSkills.slots.b, 'spell:aegis');
    assert.ok(s.magicSkills.presets.every((p) => p.b === 'spell:aegis'));
    assert.equal(s.equipment.primary.id, 'salvage-blade'); assert.equal(s.equipment.secondary.id, 'spark-coil');
    assert.ok(!spellOpen(s, 'shadow-clone'), 'nothing else opens early');
  }
  const typed = namedFresh('Tim', '  MY-SEED  '); assert.equal(typed.seed, 'MY-SEED', 'a typed seed is kept');
  assert.ok(!spellOpen(freshSave(), 'aegis'), 'a fresh save (and every old one) keeps Aegis at Infinite III');
  const classic = namedFresh('C', 'CLASSIC-1', { mode: 0 });
  assert.deepEqual([classic.progression.mode, classic.progression.start, classic.progression.kept], [0, 1, []]);
  assert.ok(!spellOpen(classic, 'aegis')); assert.equal(classic.magicSkills.slots.b, null);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(a))).magicSkills.slots.b, 'spell:aegis', 'the slot survives a reload');
});

test('creator choices: every weapon and tool card applies the chosen piece at the starting tier; cards read the game\'s data', () => {
  const base = freshSave();
  for (const w of START_KIT.weapons) for (const t of START_KIT.tools) {
    const s = v1Save(`KIT-${w}-${t}`, { weapon: w, tool: t });
    assert.equal(weaponKey(s.equipment.primary), w, w); assert.equal(toolKey(s.equipment.secondary), t, t);
    assert.equal(s.equipment.primary.power, base.equipment.primary.power); assert.equal(s.equipment.secondary.power, base.equipment.secondary.power);
    assert.equal(s.equipment.primary.upgradeRank, 0); assert.deepEqual(s.progression.kit, { weapon: w, tool: t });
    const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(weaponKey(m.equipment.primary), w); assert.equal(toolKey(m.equipment.secondary), t);
  }
  assert.equal(v1Save('KIT-BAD', { weapon: 'aether-orrery', tool: 'carbine' }).equipment.secondary.id, 'spark-coil', 'not offered: the default');
  for (const [kind, keys, table] of [['weapon', START_KIT.weapons, WEAPON_SCALING], ['tool', START_KIT.tools, TOOL_SCALING]]) {
    const cards = startCards(kind); assert.deepEqual(cards.map((c) => c.key), keys);
    for (const c of cards) { assert.equal(c.scales, SCALING_LABELS[table[c.key]]); assert.ok(c.name && c.style && c.goodWith.length, c.key); assert.match(c.style, /^[A-Z]/); }
  }
  assert.ok(startCards('tool').some((c) => c.name === 'Hammerfall') && startCards('tool').some((c) => c.name === 'Great Sweep'));
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /startCardGroup\("Choose your weapon","weapon"/); assert.match(main, /startCardGroup\("Choose your tool","tool"/);
  assert.match(main, /mode:mode\.value\(\),weapon:weapon\.value\(\),tool:tool\.value\(\)/);
  assert.match(readFileSync('src/persistence.ts', 'utf8'), /\|\|namedFresh\(\);/, 'an empty slot starts a new journey');
});

test('switching: v0 -> v1 keeps everything open by today\'s rules; v1 -> v0 takes nothing; both are logged and refused in a fight', () => {
  const s = freshSave(); s.seed = 'SWITCH'; s.perception.aperture = 3400; for (let i = 0; i < 2; i++) learnRank(s, 'form'); s.playSeconds = 3600;
  const owned = (q) => Object.entries(ownership(q)).filter(([, v]) => v === 'owned' || v === 'open').map(([k]) => k).sort();
  const before = owned(s);
  assert.equal(switchProgression(s, 0).ok, false, 'already Classic');
  assert.deepEqual(switchProgression(s, 1, { fighting: true }), { ok: false, message: SWITCH_TEXT.fighting }); assert.equal(s.progression.mode, 0);
  const r = switchProgression(s, 1);
  assert.ok(r.ok && r.added > 0); assert.equal(s.progression.mode, 1);
  for (const id of ['spell:shadow-clone', 'spell:aegis', 'skill:ember-form']) assert.ok(s.progression.kept.includes(id), id);
  assert.deepEqual(s.progression.kept.slice().sort(), switchKeeps(s).slice().sort());
  assert.deepEqual(s.progression.log, [{ from: 0, to: 1, playSeconds: 3600, section: '0,0' }]);
  assert.deepEqual(before.filter((id) => !owned(s).includes(id)), [], 'nothing lost going to Exploration'); // Phase 3: Exploration also opens its own (Aerial Step at Aperture 6; awakening and the hatchling shown open)
  s.perception.aperture = 0; // even if the band were lost, what was kept stays
  assert.ok(spellOpen(s, 'shadow-clone'));
  const r0 = switchProgression(s, 0); assert.ok(r0.ok); assert.equal(s.progression.mode, 0);
  assert.ok(s.progression.kept.includes('spell:shadow-clone'), 'v1 -> v0 keeps everything'); assert.equal(s.progression.log.length, 2);
  s.perception.aperture = 3400; assert.ok(before.every((id) => owned(s).includes(id)), 'and today\'s gates give what they give');
  // a start-1 Exploration journey going Classic keeps its Aegis; and back again
  const n = v1Save(ODD); switchProgression(n, 0); assert.ok(spellOpen(n, 'aegis')); switchProgression(n, 1); assert.ok(spellOpen(n, 'aegis'));
  assert.equal(compendium(n).mode.name, 'Exploration');
  const t = compendium(n).groups.find((g) => g.id === 'spells').entries.find((e) => e.id === 'spell:aegis'); assert.equal(t.state, 'owned');
  for (const row of PROGRESSION_ROWS) if (stateV0(n, row) === 'owned') assert.equal(ownership(n)[row.id], 'owned');
});

test('frames: 16 per seed, deterministic; the turn and its inverse agree; bearings and words', () => {
  const seen = new Set(); for (let i = 0; i < 400; i++) seen.add(frameOf(`F-${i}`, 1).index); assert.equal(seen.size, 16);
  assert.equal(frameOf('X', 0), IDENTITY_FRAME); assert.equal(frameOf('X', 1), frameOf('X', 1));
  assert.equal(frameOf('X', 1).index, hashSeed('X:start-frame:v1') % 16);
  for (let i = 0; i < 16; i++) { const f = frameByIndex(i); for (const [x, y] of [[4, -2], [-5, 3], [5, -2], [17, 30], [0, -1]]) {
    const [wx, wy] = fromFrame(f, x, y), [bx, by] = toFrame(f, wx, wy); assert.ok(Math.abs(bx - x) < 1e-9 && Math.abs(by - y) < 1e-9);
    assert.ok(Math.abs(Math.hypot(wx, wy) - Math.hypot(x, y)) < 1e-9, 'distances unchanged'); }
    for (const k of COMPASS) { const [wx, wy] = fromFrame(f, Math.cos(heading(k)), -Math.sin(heading(k))), a = Math.atan2(-wy, wx); assert.ok(Math.abs(Math.cos(a - heading(turnBearing(f, k))) - 1) < 1e-9, `${i} ${k}`); }
  }
  assert.equal(turnBearing(frameByIndex(1), 'e'), 'ne'); assert.equal(turnBearing(frameByIndex(8), 'e'), 'w'); assert.equal(turnBearing(frameByIndex(8), 'n'), 'n');
  assert.equal(sectionWords(5, -2), 'five sections east and two north'); assert.equal(sectionWords(-1, 0), 'one section west'); assert.equal(sectionWords(0, 4), 'four sections south');
});

test('start version 1: every fixed direction turns together, and the words read from the turn', () => {
  for (const seed of [ODD, MIRROR, QUARTER]) {
    const s = v1Save(seed), f = saveFrame(s); useJourneyFrame(s); assert.equal(activeFrame(), f); assert.equal(frameFor(seed), f); assert.ok(!f.identity);
    // the old towns: the same distance, the turned bearing (or the next), with their people
    const towns = oldTownSections(seed);
    for (const [cx, cy] of OLD_TOWNS) {
      const at = [...towns].find(([, k]) => k === `${cx},${cy}`)[0].split(',').map(Number);
      assert.ok(Math.abs(Math.hypot(...at) - Math.hypot(cx, cy)) <= 1, `${seed} ${cx},${cy} -> ${at}`);
      const id = cx === 4 ? 'glasshaven' : 'coilmarket'; assert.equal(generateRegion(seed, at[0], at[1]).settlement?.id, id);
      assert.ok(regionSettled(at[0], at[1], seed) && regionSettled(at[0], at[1]));
      if (!towns.has(`${cx},${cy}`)) { assert.equal(generateRegion(seed, cx, cy).settlement, undefined); assert.ok(!regionSettled(cx, cy, seed)); }
      assert.ok(!guideHostable(seed, 'shrine', at[0], at[1]), 'the waymark guides keep off the town');
    }
    // the Arcana homes: each set's home lies along its turned bearing; the bells stay opposite the chain
    for (const [id, h] of Object.entries(ARCANA_REGIONS.sets)) {
      const mid = (h.from + h.to) / 2, turned = along(turnBearing(f, h.toward), mid), plain = along(h.toward, mid);
      assert.ok(inArcanaHome(id, turned.rx, turned.ry), `${id} home turned`);
      assert.equal(inArcanaHome(id, turned.rx, turned.ry, f), true);
      const steps = Math.abs(COMPASS.indexOf(turnBearing(f, h.toward)) - COMPASS.indexOf(h.toward)) % 8;
      if (Math.min(steps, 8 - steps) >= 2) assert.ok(!inArcanaHome(id, plain.rx, plain.ry), `${id} no longer at its old bearing`);
      assert.equal(arcanaHint(id), `${ARCANA_REGIONS.words[turnBearing(f, h.toward)]} of the Refuge, ${h.from} to ${h.to} sections out`);
    }
    assert.equal((COMPASS.indexOf(turnBearing(f, 'sw')) - COMPASS.indexOf(turnBearing(f, 'ne')) + 8) % 8, 4, 'bells opposite the chain');
    assert.equal(regionVersionFor(false, true, s.progression.start), START_FRAME.regionVersion);
    assert.equal(regionFrame(seed, 2), f); assert.equal(regionFrame(seed, 1), IDENTITY_FRAME);
    const bellsHome = along(turnBearing(f, 'sw'), 37); assert.equal(arcanaRate('bells', bellsHome.rx, bellsHome.ry, regionFrame(seed, 2)), ARCANA_REGIONS.sets.bells.home);
    // the Readings: each quarter's book lies along the turned bearing; the hint and the Torn Pages follow
    for (const [q, mid, far] of [['n', 'riverThatRemembers', 'threeBrothers'], ['e', 'transparentEye', 'bookOfImages'], ['s', 'yellowCity', 'underTheFloor'], ['w', 'pathAlone', 'secondCampaign']]) {
      const a = along(turnBearing(f, q), 12), b = along(turnBearing(f, q), 26);
      assert.equal(readingAt(a.rx, a.ry), mid, `${seed} ${q} middle`); assert.equal(readingAt(b.rx, b.ry), far, `${seed} ${q} far`);
      assert.match(readingRegionHint(mid), new RegExp(`^${ARCANA_REGIONS.words[turnBearing(f, q)]}, `));
    }
    assert.equal(readingAt(0, 0), 'longCampaign'); assert.equal(readingAt(40, 30), 'dreamlands');
    let pages = 0; for (let i = 0; i < 4000 && pages < 30; i++) { const x = (hashSeed(`p${i}`) % 61) - 30, y = (hashSeed(`q${i}`) % 61) - 30, id = `dungeon:${seed}:g1:${x}:${y}:d${i}`, r = pageIn(seed, id); if (r) { pages++; assert.equal(r, readingAt(x, y)); } }
    assert.ok(pages > 0);
    // the Far Sleep's edge: the diamond turns with the frame, no nearer than about 25 sections, no farther than 35
    for (let deg = 0; deg < 360; deg += 7.5) { const r = deg * Math.PI / 180, x = Math.cos(r), y = -Math.sin(r);
      assert.ok(!farSleepSection(Math.round(x * 23), Math.round(y * 23)), 'never nearer than 24'); assert.ok(farSleepSection(Math.round(x * 37), Math.round(y * 37)), 'always by 36'); }
    if (f.turn & 1) { assert.ok(farSleepSection(26, 0) && !farSleepSection(20, 20), 'a 45° turn points the corners at the diagonals'); }
    assert.equal(farSleepDepth(20, 20), farSleepDepth(20, 20, f));
    // the Surveyor's statue: on the turned edge, along the last link's line; with no bearing, the frame's diagonal
    const links = Array.from({ length: SURVEYOR.links }, (_, i) => i);
    for (const [lx, ly] of [[10, -10], [3, 7], [-12, 0]]) {
      const q = v1Save(seed); q.lore.surveyor = { links, where: { [SURVEYOR.links - 1]: `dungeon:${seed}:g1:${lx}:${ly}:x` } };
      const at = surveyorStatueSection(q); assert.ok(farSleepSection(at.rx, at.ry), `${seed} statue past the edge`);
      assert.ok(farSleepDepth(at.rx, at.ry) <= FAR_SLEEP_DEPTH + 3, 'on the edge, not beyond it');
      const cos = (at.rx * lx + at.ry * ly) / Math.hypot(at.rx, at.ry) / Math.hypot(lx, ly); assert.ok(cos > .99, `along the chain ${cos}`);
      assert.deepEqual(surveyorStatueSection(q), at, 'recorded once');
    }
    const lone = v1Save(seed); lone.lore.surveyor = { links, where: {} }; const d = surveyorStatueSection(lone), [dx, dy] = toFrame(f, d.rx, d.ry);
    assert.ok(farSleepSection(d.rx, d.ry)); assert.ok(Math.abs(Math.abs(dx) - Math.abs(dy)) < 2.5, 'a diagonal of the frame');
    // the Viewport's first hunt: turned, and its summary names the turned directions
    const c = s.viewport.contracts['viewport-direct-vesperwing'], t = ashenMeridianTarget(seed, f);
    assert.deepEqual(c.target, t); assert.deepEqual(ashenMeridianSection(s), t); assert.equal(c.summary, `A Vesperwing circles an exposed crossing ${sectionWords(t.rx, t.ry)}.`);
    assert.ok(Math.abs(Math.hypot(t.rx, t.ry) - Math.hypot(5, 2)) <= 1); assert.ok(!oldTownAt(seed, t.rx, t.ry));
    assert.deepEqual(ensureViewportState(migrateSave(JSON.parse(JSON.stringify(s)))).contracts['viewport-direct-vesperwing'].target, t, 'kept across a reload');
    // every hunt is the journey's own (not CINDER-VERGE-47's), and the Mire Apostle turns like the towns
    assert.deepEqual(s.viewport, freshViewportState(seed, f));
    assert.deepEqual(s.viewport.contracts['viewport-frontier-manufactory'].target, viewportContracts(seed)[2].target, 'seeded from the journey\'s own seed');
    const mire = fixedPlaceSection(seed, 'mireApostle', f);
    assert.ok(Math.abs(Math.hypot(mire.rx, mire.ry) - Math.hypot(7, 4)) <= 3.75); assert.ok(!oldTownAt(seed, mire.rx, mire.ry));
  }
});

test('the Game sets the journey\'s frame; a Classic or old journey in play is the identity', () => {
  const s = v1Save(QUARTER), g = new Game(s, 0); assert.equal(activeFrame(), saveFrame(s)); assert.ok(g);
  const old = freshSave(); old.seed = TIM; new Game(old, 0); assert.equal(activeFrame(), IDENTITY_FRAME); assert.equal(frameFor(QUARTER), IDENTITY_FRAME);
  const src = readFileSync('src/game.ts', 'utf8');
  assert.match(src, /useJourneyFrame\(save\);/); assert.match(src, /this\.rx===meridian\.rx&&this\.ry===meridian\.ry/); assert.match(src, /oldTownAt\(this\.save\.seed,this\.rx,this\.ry\)==='-5,3'/);
  assert.match(src, /regionVersionFor\([^;]*saveStart\(save\)\)/);
});

test('200-seed sweep: turned towns, first hunts and the Far Sleep\'s edge land on valid ground', () => {
  const t0 = Date.now();
  for (let i = 0; i < 200; i++) {
    const seed = `SWEEP-${i}`, f = frameOf(seed, 1), towns = [...oldTownSections(seed, f)];
    assert.equal(towns.length, 2, seed);
    for (const [at, key] of towns) {
      const [x, y] = at.split(',').map(Number), [cx, cy] = key.split(',').map(Number);
      assert.ok(Math.abs(x) + Math.abs(y) >= 2, `${seed} town clear of the Refuge`);
      assert.ok(Math.abs(Math.hypot(x, y) - Math.hypot(cx, cy)) <= 1, `${seed} town distance`);
      if (!f.identity) { assert.ok(!openSeaSection(seed, x, y), `${seed} town not at sea`); assert.ok(!hamletSection(seed, x, y), `${seed} town not on a hamlet`); }
    }
    const t = ashenMeridianTarget(seed, f);
    const mire = fixedPlaceSection(seed, 'mireApostle', f);
    assert.ok(Math.abs(Math.hypot(mire.rx, mire.ry) - Math.hypot(7, 4)) <= 3.75 && Math.abs(mire.rx) + Math.abs(mire.ry) >= 2 && !oldTownAt(seed, mire.rx, mire.ry, f), `${seed} mire`);
    if (!f.identity) assert.ok(!openSeaSection(seed, mire.rx, mire.ry) && !hamletSection(seed, mire.rx, mire.ry), `${seed} mire ground`);
    assert.ok(Math.abs(t.rx) + Math.abs(t.ry) >= 3 && !oldTownAt(seed, t.rx, t.ry, f), `${seed} hunt`);
    assert.ok(Math.abs(Math.hypot(t.rx, t.ry) - Math.hypot(5, 2)) <= 1, `${seed} hunt distance`);
    for (let deg = 0; deg < 360; deg += 30) { const r = deg * Math.PI / 180, x = Math.cos(r), y = -Math.sin(r);
      assert.ok(!farSleepSection(Math.round(x * 23), Math.round(y * 23), f) && farSleepSection(Math.round(x * 37), Math.round(y * 37), f), `${seed} edge`); }
    assert.ok(sectionRegion(seed, 0, 0).type, 'the Refuge region reads');
  }
  assert.ok([0, 1, 2].some((i) => JSON.stringify(v1Save(`HUNTS-${i}`).viewport.contracts['viewport-frontier-rootbound'].target) !== JSON.stringify(freshSave().viewport.contracts['viewport-frontier-rootbound'].target)), 'no longer CINDER-VERGE-47\'s hunts');
  assert.ok(Date.now() - t0 < 60000, 'bounded');
});

test('wired: built and precached; the Options toggle and the compendium name the mode', () => {
  for (const f of ['sw.js', 'proving-ground/sw.js']) assert.match(readFileSync(f, 'utf8'), /src\/journey-start\.js\?v=\d+/, f);
  assert.match(readFileSync('scripts/build.mjs', 'utf8'), /'journey-start'/);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /function renderProgressionToggle\(\)/); assert.match(main, /confirm\(switchText\(save,other\.mode\)\)/); assert.match(main, /e\.aggro/);
  assert.match(main, /Progression: \$\{c\.mode\.name\}/);
  assert.doesNotMatch(readFileSync('src/journey-start.ts', 'utf8'), /^import (?!\{ hashSeed \} from "\.\/random\.ts")/m, 'journey-start.ts imports only random.ts');
});
