// Fixes from a 20-hour headless playthrough of the real engine (Unreleased). Each test reproduces one finding on the real Game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SEA_REFUSAL, DISPLACEMENT_STRAND, regionalScale } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { createCombatant } from '../src/combat.ts';
import { HATCHLING } from '../src/hatchling.ts';
import { QUESTS, QUEST_IDS } from '../src/quests.ts';
import { openQuest, questTalk, QUEST_WORDS } from '../src/quest-places.ts';
import { LEADS, liveRumours, recordRumour, questLeadCount } from '../src/leads.ts';
import { ownership } from '../src/progression.ts';
import { setPotionChoice } from '../src/potions.ts';
import { namedFresh } from '../src/persistence.ts';
import { freshSave, migrateSave, killPaid } from '../src/types.ts';
import { resetPackRuntime, freshPackState, PACK_RESUME } from '../src/monster-pack.ts';

const SEED = 'CORRIDOR-EB33C6B092';
const held = (x: number, y: number) => { const state: any = { x, y }; return { state, consume: (k: string) => { const v = state[k]; state[k] = false; return !!v; }, held: () => false, reset() {} }; };

// I3/I11: section 2,5 of this Exploration journey has an east lane that opens on open sea (3,5).
function atSeaLane() {
  const s: any = namedFresh('t', SEED, { mode: 1 }); const g: any = new Game(s, 1000);
  g.rx = 2; g.ry = 5; g.loadArea('overworld'); for (const e of g.enemies) e.dead = true;
  g.player.x = 30.5; g.player.y = g.map.exits.east; return { s, g };
}

test('a walker held into a lane onto open sea is refused without loading or exploring anything', () => {
  const { s, g } = atSeaLane(); let loads = 0; const L = g.loadArea.bind(g); g.loadArea = (...a: any[]) => { loads++; return L(...a); };
  const explored = JSON.stringify(s.explored), atlas = JSON.stringify(s.atlas), input = held(1, 0); let now = 1000;
  for (let i = 0; i < 120; i++) { now += 1000 / 60; input.state.x = 1; g.update(1 / 60, input, now); }
  assert.equal(loads, 0, 'no section is loaded while the stick is held into the sea');
  assert.deepEqual([g.rx, g.ry], [2, 5]);
  assert.equal(g.message, SEA_REFUSAL, 'the refusal message is unchanged');
  assert.equal(JSON.stringify(s.explored), explored, 'the refused sea section is not explored');
  assert.equal(s.explored['3,5'], undefined);
  assert.equal(JSON.stringify(s.atlas), atlas, 'nothing is pinned in the atlas');
  assert.ok(g.player.x > 29 && g.player.x < 32, 'the Wayfarer stays at the lane');
});

test('the same lane still crosses for a swimmer, and a land lane still crosses for a walker', () => {
  const a = atSeaLane(); a.s.capabilities = { ...(a.s.capabilities || {}), swim: true };
  assert.notEqual(a.g.transitionSection(1, 0), false); assert.deepEqual([a.g.rx, a.g.ry], [3, 5]); assert.equal(a.s.explored['3,5'], true);
  const b = atSeaLane(); b.g.player.x = .3; b.g.player.y = b.g.map.exits.west;
  assert.equal(b.g.seaBeyondLane(-1, 0), false);
  b.g.transitionSection(-1, 0); assert.deepEqual([b.g.rx, b.g.ry], [1, 5]);
});

// I4: a rewarded kill wrote two lasting keys (worldFlags drop:v1:<area>:<id>, perception.awarded enemy:<area>:<id>). They now go
// into one compact per-area kill ledger, and still stop a foe that stands again with the same id from paying twice.
const fresh = (seed = 'LEDGER') => { const s: any = freshSave(); s.seed = seed; Object.assign(s.session, { area: 'overworld', rx: 3, ry: 1, x: 16, y: 16 }); return s; };
const reward = (s: any) => ({ ap: s.perception.aperture, draughts: s.consumables.restorativeDraught, pity: s.worldFlags.flaskPity || 0 });

test('a kill writes no per-kill keys, only the area ledger, and is paid once', () => {
  const s = fresh(), g: any = new Game(s, 0), area = g.areaId(), flags = Object.keys(s.worldFlags).length, awarded = Object.keys(s.perception.awarded).length;
  const e = g.createEnemyFromSpawn({ id: 'ledger-foe', kind: 'ashling', x: 5, y: 5 }); g.enemies.push(e); e.hp = 0; e.dead = true;
  const r0 = reward(s); g.defeatEnemy(e); const r1 = reward(s);
  assert.equal(r1.ap, r0.ap + 1, 'one Aperture'); assert.ok(r1.draughts > r0.draughts || r1.pity === r0.pity + 1, 'the draught roll is made');
  assert.equal(Object.keys(s.worldFlags).filter((k) => k.startsWith('drop:v1:')).length, 0); assert.equal(Object.keys(s.perception.awarded).filter((k) => k.startsWith('enemy:')).length, 0);
  assert.ok(Object.keys(s.worldFlags).length <= flags + 1 && Object.keys(s.perception.awarded).length === awarded, 'no key per kill');
  assert.deepEqual(s.killLedger.areas[area], { k: ['ledger-foe'] });
  assert.ok(killPaid(s, 'a', area, 'ledger-foe') && killPaid(s, 'd', area, 'ledger-foe'));
  // the same foe stands again (a Fractured refill, a chamber's rest, a reset floor) and is felled again, before and after a reload
  for (const again of [g, new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0) as any]) {
    const q = again.createEnemyFromSpawn({ id: 'ledger-foe', kind: 'ashling', x: 5, y: 5 }); again.enemies.push(q); q.hp = 0; q.dead = true;
    const before = reward(again.save); again.defeatEnemy(q); assert.deepEqual(reward(again.save), before, 'nothing is paid twice');
  }
});

test('an old save keeps its per-kill guarantees: its keys move into the ledger and still stop a second reward', () => {
  const s = fresh('LEDGER-OLD'), area = 'overworld:3:1:g1', deep = 'dungeon:LEDGER-OLD:g1:2:3:door-1';
  s.session.areas[area] = { enemies: [{ id: 'old-foe', kind: 'ashling', dead: true, rewarded: true, hp: 0, maxHp: 10, x: 5, y: 5 }], objects: {} };
  s.consequences.dungeons[deep] = { discovered: true };
  Object.assign(s.worldFlags, { [`drop:v1:${area}:old-foe`]: true, [`drop:v1:${deep}:${deep}:encounter:3`]: true, 'drop:v1:keep:wild-stego': true, 'drop:v1:nocolon': true, flaskPity: 1 });
  Object.assign(s.perception.awarded, { [`enemy:${area}:old-foe`]: true, [`guardian:${deep}:${deep}:guardian`]: true, 'section:3,1': true });
  const m: any = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.worldFlags['drop:v1:nocolon'], true, 'a key that cannot be split stays, and is still honoured');
  assert.equal(Object.keys(m.worldFlags).filter((k) => k.startsWith('drop:v1:') && k !== 'drop:v1:nocolon').length, 0, 'the rest moved');
  assert.equal(m.perception.awarded['section:3,1'], true, 'other awards stay');
  assert.deepEqual(m.killLedger.areas[deep], { d: ['@:encounter:3'], a: ['@:guardian'] }, 'a crossing foe is written short');
  assert.ok(killPaid(m, 'd', area, 'old-foe') && killPaid(m, 'a', area, 'old-foe') && killPaid(m, 'd', deep, `${deep}:encounter:3`) && killPaid(m, 'a', deep, `${deep}:guardian`));
  assert.ok(killPaid(m, 'd', 'keep', 'wild-stego') && killPaid(m, 'd', 'no', 'colon') === false && killPaid({ worldFlags: { 'drop:v1:x:y': true } }, 'd', 'x', 'y'));
  assert.equal(m.roomBeastSlain.wildStego, 1, 'the old room-beast scan still sees its kill');
  assert.equal(JSON.stringify(migrateSave(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'a second load changes nothing');
  const g: any = new Game(m, 0), q = g.createEnemyFromSpawn({ id: 'old-foe', kind: 'ashling', x: 5, y: 5 }); g.enemies.push(q); q.hp = 0; q.dead = true;
  const before = reward(m); g.defeatEnemy(q); assert.deepEqual(reward(m), before, 'an old kill is not paid again');
});

// I10: a reload reset each pack foe's runtime to fresh, so a foe between attacks lost its circling side, idle wander, attack
// count, last attack and the breath before its next attack, and restarted its pattern. Those are kept now (bounded).
test('a pack foe between attacks resumes its pattern exactly after a reload', () => {
  let s: any, g: any; for (let rx = 2; rx < 12 && !g?.enemies.some((e: any) => e.packKind && !e.dead); rx++) { s = freshSave(); s.seed = 'PACK-RESUME'; Object.assign(s.session, { area: 'overworld', rx, ry: 2, x: 16, y: 16 }); g = new Game(s, 1000); }
  const idle = held(0, 0); let now = 1000;
  for (let i = 0; i < 400; i++) { now += 1000 / 60; g.update(1 / 60, idle, now); }
  const foes = g.enemies.filter((e: any) => !e.dead && e.packKind && e.pack); assert.ok(foes.length, 'pack foes in the section');
  for (const e of foes) Object.assign(e.pack, { state: 'move', attack: null, phase: null, gap: .4321, orbitDir: -1, wander: 2.5, seq: 7, last: 'bite', stillT: .5, anchor: { x: 16, y: 16 } });
  g.exportSnapshot(now); const re: any = new Game(migrateSave(JSON.parse(JSON.stringify(g.save))), now);
  for (const e of foes) { const q = re.enemies.find((r: any) => r.id === e.id); assert.ok(q, e.id);
    for (const k of ['gap', 'orbitDir', 'wander', 'seq', 'last', 'stillT', 'anchor', 'state', 'attack', 'cd']) assert.deepEqual(q.pack[k], e.pack[k], `${e.kind} pack.${k}`); }
});

test('a reload still never resumes an attack mid-swing, and junk pack fields are not kept', () => {
  const mid: any = { packKind: true, kind: 'ashling', pack: { state: 'attack', attack: 'bite', phase: 'windup', t: .2, gap: 0, seq: 3, last: 'bite', orbitDir: 1, wander: 1, cd: { bite: 2 }, data: { aim: { x: 1, y: 0 } } } };
  resetPackRuntime(mid); assert.equal(mid.pack.attack, null); assert.equal(mid.pack.state, 'move'); assert.equal(mid.pack.gap, freshPackState().gap, 'an attack cut short leaves the fresh pause');
  assert.deepEqual([mid.pack.seq, mid.pack.last, mid.pack.orbitDir, mid.pack.cd.bite], [3, 'bite', 1, 2]); assert.equal(mid.pack.data, undefined);
  const junk: any = { packKind: true, kind: 'ashling', pack: { gap: 1e9, orbitDir: 5, wander: NaN, seq: -2, last: 'x'.repeat(200), stillT: 3, anchor: null } };
  resetPackRuntime(junk); const f = freshPackState();
  assert.deepEqual([junk.pack.gap, junk.pack.orbitDir, junk.pack.wander, junk.pack.seq, junk.pack.last, junk.pack.stillT, junk.pack.anchor], [PACK_RESUME.gapMax, f.orbitDir, undefined, f.seq, undefined, f.stillT, f.anchor]);
});

// I12: the hatchling's guards took the region's threat only on the site's first visit; on any later visit, or after a reload,
// they stood at bare strength. A rescue begun now scales them on every visit, once; one begun before keeps its guards as they were.
const guardsOf = (g: any) => g.enemies.filter((e: any) => String(e.id).startsWith('hatchling-guard:'));
const vitals = (g: any) => guardsOf(g).map((e: any) => [e.kind, e.maxHp, e.damage, e.threatRing]);
function rescue(scaled: boolean) {
  const s: any = freshSave(); s.seed = 'HATCH-SCALE'; const g: any = new Game(s, 0); g.hatchMamaTalk(null); const q = s.mounts.hatchling.quest;
  if (!scaled) delete q.scaled; g.snapshotArea(); g.rx = q.rx; g.ry = q.ry; g.loadArea('overworld', false); return { s, g, q };
}
test('a new rescue\'s guards take their region on every visit and after a reload, never twice', () => {
  const { s, g, q } = rescue(true); assert.equal(q.scaled, HATCHLING.quest.scaled);
  const first = vitals(g), ring = regionalThreat(q.rx, q.ry).ring;
  assert.ok(first.length === HATCHLING.quest.guards && first.every((v: any) => v[3] === ring), 'scaled as the place is');
  const bare = guardsOf(g).map((e: any) => createCombatant(e.kind, 0, 0).maxHp); assert.deepEqual(first.map((v: any) => v[1]), bare.map((hp: number) => regionalScale({ hp, maxHp: hp, damage: 1 }, regionalThreat(q.rx, q.ry)).maxHp));
  g.snapshotArea(); g.rx += 1; g.loadArea('overworld', false); g.snapshotArea(); g.rx -= 1; g.loadArea('overworld', false);
  assert.deepEqual(vitals(g), first, 'a later visit: the same');
  g.exportSnapshot(1000); const re: any = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 1000); assert.deepEqual(vitals(re), first, 'after a reload: the same');
});
test('a rescue begun before keeps its guards exactly as they were', () => {
  const { g } = rescue(false); const first = vitals(g);
  g.snapshotArea(); g.rx += 1; g.loadArea('overworld', false); g.snapshotArea(); g.rx -= 1; g.loadArea('overworld', false);
  assert.deepEqual(vitals(g).map((v: any) => [v[0], v[1], v[3]]), guardsOf(g).map((e: any) => { const c = createCombatant(e.kind, 0, 0); return [e.kind, c.maxHp, undefined]; }), 'as before: bare on a later visit');
  assert.ok(first.every((v: any) => v[3] != null), 'and scaled on the first, as before');
});

// I2: three quests never said what they need. Each giver and Journal line now names it, and a giver with two quests open (Vela:
// Tempo and Arc Wave; Oren: Blade Stream and Power Aegis) speaks of both instead of only the first.
test('the quests that need something name it, in the giver\'s words and in the Journal', () => {
  const journal = (id: string) => QUESTS[id].steps.map((q: any) => q.text).join(' ');
  const needs: Record<string, RegExp[]> = { 'arc-wave': [/boat/, /shipwright/, /Blunderbuss/, /Needle Caster/], 'glyph-mine': [/Pumice Seed/, /Watcher's shrine/, /chests/], 'blade-stream': [/Pentagon/, /sigil/] };
  for (const [id, words] of Object.entries(needs)) for (const w of words) { assert.match(QUESTS[id].offer, w, `${id}: the giver says ${w}`); assert.match(journal(id), w, `${id}: the Journal says ${w}`); }
  assert.match(QUEST_WORDS.pentagon, /sigil/); assert.match(QUEST_WORDS.wreck, /boat/); assert.match(QUEST_WORDS.husk, /Pumice Seed/);
  for (const id of QUEST_IDS) { const Q = QUESTS[id]; assert.ok(Q.giver ? Q.offer : Q.opened, `${id} has words to open with`); for (const t of [Q.offer, Q.opened, ...Q.steps.map((q: any) => q.text)]) if (t) assert.doesNotMatch(t, /tutorial|tap |press /i); }
});
test('a giver with two quests open speaks of both', () => {
  const s: any = freshSave(); s.seed = 'TWO-ASKS';
  for (const id of ['tempo', 'arc-wave', 'blade-stream', 'power-aegis']) openQuest(s, id);
  const vela = questTalk(s, 'vendor-vela'), oren = questTalk(s, 'warden-oren');
  assert.ok(vela.includes(QUESTS.tempo.offer) && vela.includes(QUESTS['arc-wave'].offer), 'Vela: the metronome and the wrecks');
  assert.ok(oren.includes(QUESTS['blade-stream'].offer) && oren.includes(QUESTS['power-aegis'].offer), 'Oren: the lamps and the Revenant');
  assert.equal(questTalk(s, 'keeper-sela'), null, 'nothing open with Sela');
});

// I9: every traveller's wonder was kept as a lead, so from about ten hours thirty-odd leads stood against a floor of two. At most
// LEADS.wonderMax wonders stand now; a new one replaces the oldest. No quest, thread or other rumour is ever dropped for one.
test('travellers\' wonders are capped as leads, the oldest replaced; nothing else is dropped', () => {
  const s: any = freshSave(); s.seed = 'WONDERS'; openQuest(s, 'tempo');
  const other = [{ id: 'arcana:bells', kind: 'bells', text: 'bells', name: 'Bells' }, { id: 'viscera:x', kind: 'viscera', ability: 'x', text: 'paid' }, { id: 'horde:9,9', kind: 'horde', rx: 9, ry: 9, text: 'horde' }];
  for (const r of other) recordRumour(s, r, 'someone');
  const quests = questLeadCount(s);
  for (let i = 0; i < 12; i++) recordRumour(s, { id: `wonder:${40 + i},3`, kind: 'wonder', rx: 40 + i, ry: 3, text: `wonder ${i}` }, 'traveller', 100 + i);
  const wonders = liveRumours(s).filter((r: any) => r.kind === 'wonder');
  assert.equal(wonders.length, LEADS.wonderMax); assert.deepEqual(wonders.map((r: any) => r.rx), [47, 48, 49, 50, 51], 'the newest stand');
  assert.equal(s.leads.rumours.filter((r: any) => r.kind === 'wonder').length, LEADS.wonderMax, 'the store is trimmed too');
  for (const r of other) assert.ok(s.leads.rumours.some((q: any) => q.id === r.id), `${r.id} kept`);
  assert.equal(questLeadCount(s), quests, 'quest leads untouched');
  // an old journey that already holds many: only the newest wonders count, before any new one is heard
  const old: any = freshSave(); old.seed = 'WONDERS'; old.leads.rumours = Array.from({ length: 20 }, (_, i) => ({ id: `wonder:${i},7`, kind: 'wonder', rx: i, ry: 7, text: 'w', by: 't', at: i }));
  assert.equal(liveRumours(migrateSave(JSON.parse(JSON.stringify(old)))).length, LEADS.wonderMax);
  // a wonder reached is no lead; the next one heard takes its place, and the reached one's record goes
  (s.atlas ||= {})['51,3'] = { v: 1 }; assert.equal(liveRumours(s).filter((r: any) => r.kind === 'wonder').length, LEADS.wonderMax - 1);
  recordRumour(s, { id: 'wonder:60,3', kind: 'wonder', rx: 60, ry: 3, text: 'w' }, 'traveller'); assert.deepEqual(liveRumours(s).filter((r: any) => r.kind === 'wonder').map((r: any) => r.rx), [47, 48, 49, 50, 60]);
});

// I14: after a Watcher's-tomb fold, Return home and Wayglass travel wait for a physical Wayglass, a death or a Crossing Sigil. On
// ground with no way on, a Wayfarer with no sigil and nothing to die to was held there for good: the line finds them now.
function displaced() {
  let s: any, g: any; for (let rx = 3; rx < 20 && !g?.map?.landscape; rx++) { s = freshSave(); s.seed = 'FOLDED'; Object.assign(s.session, { area: 'overworld', rx, ry: 2, x: 16, y: 16 }); g = new Game(s, 0); }
  s.session.displacementJourney = { source: { rx: 0, ry: 0, x: 16, y: 16 }, destination: { rx: g.rx, ry: g.ry } }; s.consumables.crossingSigil = 0;
  g.enemies = []; Object.assign(g.player, { x: 16, y: 16 }); return { s, g };
}
test('a displaced Wayfarer who can walk on is still sent to find a Wayglass', () => {
  const { s, g } = displaced(); const at = [g.rx, g.ry];
  assert.equal(g.routeOut(), true); assert.equal(g.returnHome(), false); assert.match(g.message, /cannot find you after the displacement/);
  assert.deepEqual([g.rx, g.ry], at); assert.ok(s.session.displacementJourney, 'the displacement holds');
});
test('a displaced Wayfarer on ground with no way on can go home without a sigil', () => {
  const { s, g } = displaced(), M = g.map;
  for (let y = 12; y <= 20; y++) for (let x = 12; x <= 20; x++) if (Math.max(Math.abs(x - 16), Math.abs(y - 16)) === 4) M.tiles[y * 32 + x] = { ...M.tiles[y * 32 + x], blocked: true }; // walled in
  for (const o of M.objects) if (o.kind === 'checkpoint') o.kind = 'ruinMarker';
  assert.equal(g.routeOut(), false);
  assert.equal(g.returnHome(), true); assert.ok(g.message.startsWith(DISPLACEMENT_STRAND.message));
  assert.deepEqual([g.rx, g.ry], [0, 0]); assert.equal(s.session.displacementJourney, null); assert.equal(s.consumables.crossingSigil, 0, 'no sigil spent');
});

// I15: the compendium counted a potion found only while one was carried, so High and Max Potions the Potion button brews and
// drinks at once stayed unfound. Brewed or drunk, a potion is known for good; the chosen tier the button can brew counts too.
test('High and Max Potions brewed and drunk at once show as found in the compendium', () => {
  const s: any = namedFresh('t', 'POTIONS', { mode: 1 }), g: any = new Game(s, 1000), state = (id: string) => ownership(s)[`potion:${id}`];
  s.consumables.restorativeDraught = 0; s.consumables.highPotion = 0; s.consumables.maxPotion = 0;
  assert.equal(state('highPotion'), 'open'); assert.equal(state('maxPotion'), 'open');
  s.consumables.restorativeDraught = 20; setPotionChoice(s, 'maxPotion'); assert.equal(state('maxPotion'), 'owned', 'the button can brew it now'); assert.equal(state('highPotion'), 'open');
  setPotionChoice(s, 'highPotion'); g.player.hp = 1; assert.ok(g.drinkPotion(1000)); assert.equal(s.consumables.highPotion, 0, 'brewed and drunk at once');
  s.consumables.restorativeDraught = 0; assert.equal(state('highPotion'), 'owned', 'still found with none carried and none to brew');
  s.consumables.maxPotion = 1; setPotionChoice(s, 'maxPotion'); g.player.hp = 1; assert.ok(g.drinkPotion(5000)); assert.equal(s.consumables.maxPotion, 0);
  assert.equal(state('maxPotion'), 'owned', 'a found one drunk is known');
  assert.equal(state('highPotion'), 'owned'); assert.equal(JSON.stringify(migrateSave(JSON.parse(JSON.stringify(s))).worldFlags['potion-known:highPotion']), 'true', 'kept over a reload');
});
