// Arcana unlocks (2026-11-11; Tim: tie the sets to unlocking existing Arcanum things that were simply given; Bell Toll for the
// Seven Bells and a longer light for the Lamplighter's Round; a first quest from the Refuge; never take away what a journey has).
// lore.ts ARCANA_UNLOCKS is the mapping; a journey created from now on begins gated (persistence.ts beginArcanaGates); a journey
// from before keeps everything that was free open, and earns only the two new passives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { ARCANA_UNLOCKS, ARCANA_PASSIVES, ARCANA_REGIONS, arcanaOpen, arcanaHas, arcanaClue, arcanaHint, lightRadius, beginArcanaGates, ensureArcanaState } from '../src/lore.ts';
import { THREADS, ARCANA_SETS, ARCANA_MILESTONES, settleArcanaUnlocks, arcanaDone, arcanaUnlockFrom } from '../src/threads.ts';
import { SPELLS, spellOpen } from '../src/items.ts';
import { setSlot, availableCastables, setPresetButton } from '../src/spell-slots.ts';
import { awakenCheck, chooseCap, BRANCHES } from '../src/constellation.ts';
import { SURVEYOR, CAIRN_KEEPER, speakCairnKeeper, addSurveyorLink } from '../src/surveyor.ts';
import { LAB_FOG, labFogLook, labFogState } from '../src/labyrinths.ts';

const gated = (seed = 'GATED') => { const s = beginArcanaGates(freshSave()); s.seed = seed; return s; };
const capWeapon = (s) => { s.equipment.primary = { ...s.equipment.primary, upgradeRank: 99, glyphs: [] }; return s; };
// Finishing each set or milestone, as its own rules record it.
const finish = {
  bells: (s) => { s.lore.bells = '1234567'; }, lamplighter: (s) => { (s.lore.threads ||= {}).lamplighter = THREADS.lamplighter.pieces.map((_, i) => `d${i}`); },
  letters: (s) => { (s.lore.threads ||= {}).letters = THREADS.letters.pieces.map((_, i) => `d${i}`); }, beekeeper: (s) => { (s.lore.threads ||= {}).beekeeper = THREADS.beekeeper.pieces.map((_, i) => `d${i}`); },
  toolmaker: (s) => { (s.lore.threads ||= {}).toolmaker = THREADS.toolmaker.pieces.map((_, i) => `d${i}`); },
  surveyor: (s) => { s.lore.surveyor = { links: Array.from({ length: SURVEYOR.links }, (_, i) => i), where: {} }; },
  firstLink: (s) => { if (!s.lore.surveyor?.links?.length) s.lore.surveyor = { links: [0], where: { 0: 'x' } }; }, firstGreatTree: (s) => { s.glider = true; }, firstSkyway: (s) => { s.skylands = { ...(s.skylands || {}), clears: 1 }; },
};

test('the mapping: every unlock is something that was free, opened by a real set or milestone, with a clue that names where to look', () => {
  assert.deepEqual(Object.keys(ARCANA_UNLOCKS).sort(), ['awaken:primary', 'awaken:secondary', 'cap:aerial-step', 'cap:second', 'passive:bell-toll', 'passive:lamplight', 'slot:c', 'spell:fire-burst', 'spell:grave-sun']);
  for (const [id, u] of Object.entries(ARCANA_UNLOCKS)) {
    assert.ok(['slot', 'spell', 'passive', 'awaken'].includes(u.kind), id); assert.ok(u.name && u.clue, id);
    assert.ok(THREADS[u.from] || ARCANA_SETS[u.from] || ARCANA_MILESTONES[u.from], `${id}: from ${u.from}`); assert.equal(arcanaUnlockFrom(u.from), id, 'one unlock per set');
    assert.doesNotMatch(arcanaClue(id), /\{where\}/); if (u.clue.includes('{where}')) assert.ok(arcanaClue(id).includes(arcanaHint(u.from)), id);
    if (u.kind === 'spell') { const sp = SPELLS[id.slice(6)]; assert.ok(sp, id); assert.equal(sp.unlockTier, undefined, `${id} was free, not an Infinite-tier spell`); } }
  assert.deepEqual(Object.entries(ARCANA_UNLOCKS).filter(([, u]) => u.fresh).map(([id]) => id).sort(), ['passive:bell-toll', 'passive:lamplight'], 'only the two passives Tim chose are new');
  assert.equal(ARCANA_UNLOCKS['passive:bell-toll'].from, 'bells'); assert.equal(ARCANA_UNLOCKS['passive:lamplight'].from, 'lamplighter'); assert.equal(ARCANA_UNLOCKS['slot:c'].from, 'firstLink');
  assert.equal(arcanaClue('spell:grave-sun'), `Letters were sent into the Corridor and never answered. They lie in crossings ${arcanaHint('letters')}. Read them all.`);
  assert.equal(ARCANA_REGIONS.live, true, 'the regions are live, so every clue names a real home');
  for (const id of ['spell:cinder-dart', 'spell:ember-ring']) assert.equal(ARCANA_UNLOCKS[id], undefined, `${id}: the starting spells stay free`);
});

test('a journey from before the gates keeps everything: free things stay open through a save and load, and only the new passives must be earned', () => {
  const old = capWeapon(freshSave()); old.seed = 'OLDJOURNEY'; assert.equal(old.arcana, undefined, 'freshSave itself is not a new journey: persistence gates those');
  const s = migrateSave(JSON.parse(JSON.stringify(old)));
  for (const id of Object.keys(ARCANA_UNLOCKS)) assert.equal(arcanaOpen(s, id), !ARCANA_UNLOCKS[id].fresh, id);
  assert.ok(spellOpen(s, 'grave-sun') && spellOpen(s, 'fire-burst')); assert.ok(availableCastables(s).includes('spell:grave-sun'));
  assert.ok(setSlot(s, 'c', 'spell:grave-sun').ok, 'slot C stays open'); assert.equal(s.magicSkills.slots.c, 'spell:grave-sun');
  assert.doesNotMatch(awakenCheck(s, 'primary').message, /Corwin|chain/, 'awakening is not closed by the arcana');
  // A save that already used them keeps them exactly, and its earned passives come from finishing the sets.
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.magicSkills.slots.c, 'spell:grave-sun'); assert.equal(back.arcana, undefined, 'nothing added to an old save until something is earned');
  assert.ok(!arcanaHas(back, 'passive:bell-toll')); finish.bells(back); assert.deepEqual(settleArcanaUnlocks(back), ['passive:bell-toll']); assert.ok(arcanaHas(back, 'passive:bell-toll'));
  assert.equal(back.arcana.gated, undefined, 'earning a passive never gates an old journey');
  for (const id of Object.keys(ARCANA_UNLOCKS)) if (!ARCANA_UNLOCKS[id].fresh) assert.ok(arcanaOpen(back, id));
});

test('a new journey begins gated: what a set opens is closed with its clue; the starting spells and slots A and B are open', () => {
  const s = capWeapon(gated()); const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.arcana.gated, 1, 'the gate survives a save and load');
  for (const t of [s, back]) {
    assert.ok(spellOpen(t, 'ember-ring') && spellOpen(t, 'cinder-dart')); assert.ok(!spellOpen(t, 'grave-sun') && !spellOpen(t, 'fire-burst'));
    assert.ok(!availableCastables(t).includes('spell:fire-burst'));
    assert.ok(setSlot(t, 'b', 'spell:cinder-dart').ok); const c = setSlot(t, 'c', 'spell:ember-ring'); assert.ok(!c.ok); assert.match(c.message, /Cairn Keeper/);
    assert.equal(setPresetButton(t, 1, 'spell:ember-ring'), 'build', 'the other preset\'s C is closed too');
    assert.match(awakenCheck(t, 'primary').message, /twelve links/); assert.match(awakenCheck(t, 'secondary').message, /toolmaker|Only a primary/); }
  // Capstones: Aerial Step waits for a great tree's crown; a second capstone for a skyway.
  const m = gated('CAPS'); m.magicSkills.learned.quickening = 3; m.constellation.mods[BRANCHES.motion.mod.id] = true; m.constellation.bonus = 20;
  assert.match(chooseCap(m, 'motion', 'aerial-step').message, /great tree/); assert.ok(chooseCap(m, 'motion', 'slipstream').ok, 'the first capstone is open');
  assert.match(chooseCap(m, 'motion', 'aerial-step').message, /great tree/); finish.firstGreatTree(m); settleArcanaUnlocks(m);
  assert.match(chooseCap(m, 'motion', 'aerial-step').message, /skyway/, 'now it is a second capstone'); finish.firstSkyway(m); settleArcanaUnlocks(m); assert.ok(chooseCap(m, 'motion', 'aerial-step').ok);
  const j = ensureArcanaState({ arcana: { gated: 'yes', unlocked: { 'spell:grave-sun': true, junk: 1, future: true }, starter: 'odd', extra: 1 } }).arcana;
  assert.deepEqual(j, { gated: 1, unlocked: { 'spell:grave-sun': true, future: true }, extra: 1 }, 'normalised; unknown ids and fields kept');
});

test('each set and milestone pays its unlock once, and a set finished before is paid when the hook next runs', () => {
  for (const [id, u] of Object.entries(ARCANA_UNLOCKS)) {
    const s = capWeapon(gated(`PAY-${id}`)); assert.ok(!arcanaOpen(s, id)); assert.ok(!arcanaDone(s, u.from));
    finish[u.from](s); assert.ok(arcanaDone(s, u.from), u.from);
    const opened = settleArcanaUnlocks(s); assert.ok(opened.includes(id), `${u.from} opens ${id}`); assert.ok(arcanaOpen(s, id)); assert.deepEqual(settleArcanaUnlocks(s, () => assert.fail('paid twice')), []);
    assert.ok(arcanaHas(migrateSave(JSON.parse(JSON.stringify(s))), id), 'kept through a save and load'); }
  const s = capWeapon(gated('PAYALL')); for (const f of Object.values(finish)) f(s); assert.equal(settleArcanaUnlocks(s).length, Object.keys(ARCANA_UNLOCKS).length);
  assert.ok(spellOpen(s, 'grave-sun') && spellOpen(s, 'fire-burst') && setSlot(s, 'c', 'spell:fire-burst').ok); assert.doesNotMatch(awakenCheck(s, 'primary').message, /twelve links/);
});

test('the first quest: the Cairn Keeper at the Refuge sets you on the chain; the first crossing gives the first link; slot C opens and the Journal leads on', () => {
  const s = gated('CAIRN'); const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld', false);
  const keeper = g.map.objects.find((o) => o.id === CAIRN_KEEPER.id); assert.ok(keeper, 'she stands at Ember Refuge'); assert.equal(keeper.name, 'Maud Fennick'); assert.ok(keeper.cairnKeeper);
  Object.assign(g.player, { x: keeper.x, y: keeper.y + .6 }); const r = g.interact('speak', keeper.id); assert.ok(r.started, g.message); assert.match(g.message, /first crossing/);
  assert.equal(s.arcana.starter, 'set'); assert.ok(s.narrative.journal.some((j) => j.title === 'The Cairn Keeper'));
  assert.match(g.interact('speak', keeper.id).message, /worn bright/, 'until the link is found she says where it lies');
  // The first ordinary crossing entered holds the link, wherever it lies (here a crossing only 2 sections out, where no link would roll).
  const id = 'dungeon:CAIRN:g1:2:1:first-crossing'; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 2, ry: 1, x: 16, y: 16 }; g.rx = 2; g.ry = 1; g.loadArea('dungeon', false);
  const link = g.map.objects.find((o) => o.kind === 'surveyorLink'); assert.ok(link, 'the first link lies there'); g.enemies = []; Object.assign(g.player, { x: link.x, y: link.y + .6 });
  assert.ok(g.interact('take', link.id).ok, g.message); assert.ok(arcanaHas(s, 'slot:c')); assert.ok((g.questNotices || []).some((q) => q.title === 'ARCANA' && q.detail === 'Spell slot C opens'));
  assert.ok(s.narrative.journal.some((j) => j.title === 'Arcana' && /Spell slot C/.test(j.text))); assert.ok(setSlot(s, 'c', 'spell:cinder-dart').ok);
  // Once one link is found the errand no longer places links; her next words name where the rest went.
  assert.equal(addSurveyorLink({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) }, s, 'dungeon:CAIRN:g1:1:1:next'), null);
  assert.equal(speakCairnKeeper(s, null, arcanaHint('surveyor')).message, `"So it was there. The rest went the way he did: ${arcanaHint('surveyor')}. He never came back for them. You might."`); assert.equal(s.arcana.starter, 'done');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /add\("The Cairn Keeper's errand"/); assert.doesNotMatch(main, /add\("The Surveyor's Chain"/, 'the chain itself is still not an Active quest (release 581)');
  assert.match(main, /Completing it opens \$\{U\.name\}/); assert.match(main, /arcanaClue\(`spell:\$\{show\.id\}`\)/); assert.match(main, /C: not yet open/);
  // On a journey that has found links she only talks, and nothing is forced.
  const o = freshSave(); o.lore.surveyor = { links: [0, 1], where: {} }; assert.ok(!speakCairnKeeper(o, null).started); assert.equal(o.arcana.starter, undefined);
});

test('Bell Toll: a heavy blow stuns the foes near it, at most once a cooldown; light blows and an unearned passive do nothing', () => {
  const B = ARCANA_PASSIVES['bell-toll'], s = freshSave(); s.seed = 'TOLL'; const g = new Game(s, 0);
  const foe = (x, extra = {}) => ({ id: `f${x}`, kind: 'beast', x, y: 5, hp: 100, maxHp: 100, ...extra }), mk = () => [foe(5), foe(6.5), foe(5 + B.radius + 1), foe(6, { boss: true })];
  g.enemies = mk(); assert.equal(g.bellToll(g.enemies[0], 60, 1000), false, 'not earned');
  finish.bells(s); settleArcanaUnlocks(s); assert.ok(arcanaHas(s, 'passive:bell-toll'));
  g.enemies = mk(); assert.equal(g.bellToll(g.enemies[0], B.minDamage - 1, 1000), false, 'a light blow');
  assert.equal(g.bellToll(g.enemies[0], 19, 1000), false, 'under the share of its health');
  assert.equal(g.bellToll(g.enemies[0], 30, 1000), true); const [a, b, far, boss] = g.enemies;
  assert.equal(a.hitStun, B.stun); assert.equal(b.hitStun, B.stun); assert.equal(far.hitStun, undefined); assert.equal(boss.hitStun, B.stun * B.bossShare);
  assert.equal(g.bellToll(g.enemies[0], 30, 1000 + B.cooldown * 1000 - 1), false, 'cooldown'); assert.equal(g.bellToll(g.enemies[0], 30, 1000 + B.cooldown * 1000), true);
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /if \(!isEcho && !scattered\) this\.bellToll\(e, dealt \+ imbued, now\)/, 'every melee hit asks');
});

test('Lamplighter\'s Light: any light radius reaches farther once earned; a labyrinth chamber\'s sight reads it', () => {
  const s = freshSave(); assert.equal(lightRadius(s, LAB_FOG.radius), LAB_FOG.radius); finish.lamplighter(s); settleArcanaUnlocks(s);
  const L = ARCANA_PASSIVES.lamplight; assert.equal(lightRadius(s, LAB_FOG.radius), LAB_FOG.radius * L.mult + L.add); assert.equal(lightRadius(s, 3), 3 * L.mult + L.add, 'any light, not one lamp');
  const room = (id) => ({ id, width: 30, height: 30, building: { labyrinth: true }, tiles: Array.from({ length: 900 }, (_, i) => ({ x: i % 30, y: Math.floor(i / 30), kind: 'floor', blocked: false })) });
  const plain = room('labyrinth:LAMP:0:0:keep:f1'), lit = room('labyrinth:LAMP:0:1:keep:f1'); lit.lightRadius = lightRadius(s, LAB_FOG.radius);
  labFogLook(plain, 10, 10); labFogLook(lit, 10, 10); const edge = 10 + LAB_FOG.radius + 1;
  assert.equal(labFogState(plain, edge, 10), 0, 'beyond the usual sight'); assert.equal(labFogState(lit, edge, 10), 2, 'in sight with the longer light');
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /this\.map\.lightRadius = lightRadius\(this\.save, LAB_FOG\.radius\)/);
});

test('new journeys are gated where journeys are created; nothing else is', () => {
  const p = readFileSync(new URL('../src/persistence.ts', import.meta.url), 'utf8');
  assert.match(p, /function namedFresh\(name,seed\)\{const save=beginArcanaGates\(freshSave\(\)\)/); assert.match(p, /\[0\]\|\|beginArcanaGates\(freshSave\(\)\)/);
  assert.equal(freshSave().arcana, undefined); assert.equal(migrateSave(freshSave()).arcana, undefined);
  for (const f of ['../src/proving-ground.ts', '../src/proving-ground-handoff.ts']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /beginArcanaGates/, 'the Proving Ground plays ungated scratch saves');
});
