// Arcana passives (2026-11-11; Tim: the Seven Bells give a bell toll, the Lamplighter's Round a bigger light radius; of tying the
// other sets to things now given freely: "leave them as free for now, we can come back to this later"). lore.ts ARCANA_UNLOCKS
// holds only the two passives, earned on every journey by finishing their set; nothing is locked anywhere. The Cairn Keeper at
// the Refuge starts the Surveyor's Chain and unlocks nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { ARCANA_UNLOCKS, ARCANA_PASSIVES, arcanaHas, arcanaHint, lightRadius, ensureArcanaState } from '../src/lore.ts';
import { THREADS, settleArcanaUnlocks, arcanaDone, arcanaUnlockFrom } from '../src/threads.ts';
import { spellOpen } from '../src/items.ts';
import { setSlot, availableCastables } from '../src/spell-slots.ts';
import { awakenCheck, chooseCap, BRANCHES } from '../src/constellation.ts';
import { CAIRN_KEEPER, speakCairnKeeper, addSurveyorLink } from '../src/surveyor.ts';
import { LAB_FOG, labFogLook, labFogState } from '../src/labyrinths.ts';

const finish = {
  bells: (s) => { s.lore.bells = '1234567'; }, lamplighter: (s) => { (s.lore.threads ||= {}).lamplighter = THREADS.lamplighter.pieces.map((_, i) => `d${i}`); },
};

test('the mapping: only the two passives Tim chose, each earned by finishing its set', () => {
  assert.deepEqual(Object.keys(ARCANA_UNLOCKS).sort(), ['passive:bell-toll', 'passive:lamplight']);
  assert.equal(ARCANA_UNLOCKS['passive:bell-toll'].from, 'bells'); assert.equal(ARCANA_UNLOCKS['passive:lamplight'].from, 'lamplighter');
  for (const [id, u] of Object.entries(ARCANA_UNLOCKS)) { assert.equal(u.kind, 'passive'); assert.ok(u.name && u.text, id); assert.equal(arcanaUnlockFrom(u.from), id); }
  for (const from of ['letters', 'beekeeper', 'surveyor', 'toolmaker', 'pages']) assert.equal(arcanaUnlockFrom(from), null, `${from} opens nothing yet`);
});

test('nothing is locked on any journey: an old save, a fresh one, and one carrying a gated flag from a preview build', () => {
  const old = freshSave(); old.seed = 'OLD'; const preview = freshSave(); preview.seed = 'PREVIEW'; preview.arcana = { gated: 1, unlocked: {} };
  for (const raw of [old, preview, freshSave()]) {
    const s = migrateSave(JSON.parse(JSON.stringify(raw))); s.equipment.primary = { ...s.equipment.primary, upgradeRank: 99, glyphs: [] };
    assert.ok(spellOpen(s, 'grave-sun') && spellOpen(s, 'fire-burst') && spellOpen(s, 'ember-ring')); assert.ok(availableCastables(s).includes('spell:fire-burst'));
    assert.ok(setSlot(s, 'c', 'spell:grave-sun').ok, 'slot C is open'); assert.doesNotMatch(awakenCheck(s, 'primary').message, /links|toolmaker/);
    s.magicSkills.learned.quickening = 3; s.constellation.mods[BRANCHES.motion.mod.id] = true; s.constellation.bonus = 20;
    assert.ok(chooseCap(s, 'motion', 'slipstream').ok); assert.ok(chooseCap(s, 'motion', 'aerial-step').ok, 'Aerial Step as a second capstone, as before');
    assert.ok(!arcanaHas(s, 'passive:bell-toll') && !arcanaHas(s, 'passive:lamplight')); }
  const p = readFileSync(new URL('../src/persistence.ts', import.meta.url), 'utf8'); assert.doesNotMatch(p, /beginArcanaGates|arcana/i, 'journeys are created as before');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.doesNotMatch(main, /arcanaOpen|arcanaClue|C: not yet open/, 'no locked entries or clues');
  assert.deepEqual(ensureArcanaState({ arcana: { gated: 1, unlocked: { 'passive:bell-toll': true, junk: 1, future: true }, extra: 1 } }).arcana, { gated: 1, unlocked: { 'passive:bell-toll': true, future: true }, extra: 1 }, 'normalised; an old flag and unknown fields kept, unread');
});

test('each passive is earned once by finishing its set, on any save, including one finished before, and kept through a save and load', () => {
  for (const [id, u] of Object.entries(ARCANA_UNLOCKS)) {
    const s = migrateSave(JSON.parse(JSON.stringify(freshSave()))); assert.equal(s.arcana, undefined, 'nothing added until something is earned'); assert.ok(!arcanaDone(s, u.from));
    finish[u.from](s); assert.deepEqual(settleArcanaUnlocks(s), [id]); assert.ok(arcanaHas(s, id)); assert.deepEqual(settleArcanaUnlocks(s, () => assert.fail('paid twice')), []);
    assert.ok(arcanaHas(migrateSave(JSON.parse(JSON.stringify(s))), id)); }
  const s = freshSave(); s.seed = 'EARN'; finish.bells(s); const g = new Game(s, 0); g.rx = 3; g.ry = 2; g.loadArea('overworld', false);
  assert.ok(arcanaHas(s, 'passive:bell-toll'), 'a set finished before is paid on the next area load'); assert.ok((g.questNotices || []).some((q) => q.title === 'ARCANA' && q.detail === 'Bell Toll opens'));
  assert.ok(s.narrative.journal.some((j) => j.title === 'Arcana' && /Bell Toll/.test(j.text)));
});

test('the first quest: the Cairn Keeper at the Refuge sets you on the chain; the first crossing gives the first link, and the Journal leads on', () => {
  const s = freshSave(); s.seed = 'CAIRN'; const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld', false);
  const keeper = g.map.objects.find((o) => o.id === CAIRN_KEEPER.id); assert.ok(keeper, 'she stands at Ember Refuge'); assert.equal(keeper.name, 'Maud Fennick'); assert.ok(keeper.cairnKeeper);
  Object.assign(g.player, { x: keeper.x, y: keeper.y + .6 }); const r = g.interact('speak', keeper.id); assert.ok(r.started, g.message); assert.match(g.message, /first crossing/);
  assert.equal(s.arcana.starter, 'set'); assert.ok(s.narrative.journal.some((j) => j.title === 'The Cairn Keeper'));
  assert.match(g.interact('speak', keeper.id).message, /worn bright/, 'until the link is found she says where it lies');
  // The first ordinary crossing entered holds the link, wherever it lies (here a crossing only 2 sections out, where no link would roll).
  const id = 'dungeon:CAIRN:g1:2:1:first-crossing'; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 2, ry: 1, x: 16, y: 16 }; g.rx = 2; g.ry = 1; g.loadArea('dungeon', false);
  const link = g.map.objects.find((o) => o.kind === 'surveyorLink'); assert.ok(link, 'the first link lies there'); g.enemies = []; Object.assign(g.player, { x: link.x, y: link.y + .6 });
  assert.ok(g.interact('take', link.id).ok, g.message); assert.equal(s.lore.surveyor.links.length, 1); assert.ok(!(g.questNotices || []).some((q) => q.title === 'ARCANA'), 'she unlocks nothing');
  // Once one link is found the errand no longer places links; her next words name where the rest went.
  assert.equal(addSurveyorLink({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) }, s, 'dungeon:CAIRN:g1:1:1:next'), null);
  assert.equal(speakCairnKeeper(s, null, arcanaHint('surveyor')).message, `"So it was there. The rest went the way he did: ${arcanaHint('surveyor')}. He never came back for them. You might."`); assert.equal(s.arcana.starter, 'done');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /add\("The Cairn Keeper's errand"/); assert.doesNotMatch(main, /add\("The Surveyor's Chain"/, 'the chain itself is still not an Active quest (release 581)');
  assert.match(main, /Completing it opens \$\{U\.name\}/);
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
