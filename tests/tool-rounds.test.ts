// Tool rounds (Tim, 2026-11-11): firing tools fire rounds. Ordinary rounds are made as you shoot from cinder iron (2, +1 per Echo
// glyph in the tool), after the journey's belt; empowered rounds (found in crossing chests and on great-tree crowns) are used first
// and hit harder; with neither, the tool cannot fire. Salvage pays cinder iron again, the full pack's included.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, actionReadiness, salvageInventoryItem, storeInventoryItem, EQUIPMENT_CAPACITY, ECONOMY } from '../src/game.ts';
import { SMITHY } from '../src/smithy.ts';
import { rangedWeapon, generateItem, RANGED_WEAPONS } from '../src/items.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { createCombatant } from '../src/combat.ts';
import { ROUNDS, ORRERY, ensureRounds, usesRounds, roundIronCost, spendRound, grantEmpoweredRounds, roundsFindRoll, roundsFindFlag, roundsLabel, ordinaryRounds, orreryPress } from '../src/tool-forms.ts';

const NEEDLE = { id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', tier: 'relic', power: 10 };
function rig({ iron = 0, belt = 0, empowered = 0, glyphs = [], item = NEEDLE } = {}) {
  const s = freshSave(); s.seed = 'ROUNDS'; s.materials.cinderIron = iron; s.rounds.loaded = belt; s.rounds.empowered = empowered;
  s.equipment.secondary = { ...item, extraSockets: 1, glyphs };
  const g = new Game(s, 0); g.enemies = []; g.projectiles = []; g.effects = []; s.lastAim = { x: 1, y: 0 };
  return { s, g };
}
let clock = 10000;
const fire = (g) => { clock += 1000; g.player.attackReadyAt = 0; return g.fireSecondary(clock, { x: 1, y: 0 }); };
const tool = (g) => g.projectiles.filter((p) => !p.dead && String(p.id).startsWith('shot-') && !/-(echo|pellet|fan|shadow)/.test(p.id));

test('the rounds table: firing tools take rounds, brawler tools do not', () => {
  const takes = Object.values(RANGED_WEAPONS).filter(usesRounds).map((w) => w.name).sort();
  assert.deepEqual(takes, ['Aether Orrery', 'Blunderbuss', 'Carbine', 'Lumen Spindle', 'Needle Caster', 'Rift Bombard', 'Spark Coil'] /* 2026-11-12: the Carbine (the Spark Coil at +6) */);
  for (const n of ['Hammerfall', 'Great Sweep']) assert.equal(usesRounds(rangedWeapon({ name: n })), false, n);
  assert.equal(usesRounds(null), false);
  assert.deepEqual(ROUNDS.iron, { base: 2, perEcho: 1, echoCap: 2 });
  assert.equal(roundIronCost(0), 2); assert.equal(roundIronCost(1), 3); assert.equal(roundIronCost(2), 4); assert.equal(roundIronCost(3), 4, 'only the Echo shots a tool fires count');
  assert.ok(ROUNDS.empowered.damage > 1);
});

test('each shot costs 2 cinder iron, 3 with one Echo glyph, 4 with two', () => {
  for (const [glyphs, cost] of [[[], 2], [['echo'], 3], [['echo', 'echo'], 4]]) {
    const { s, g } = rig({ iron: 20, glyphs });
    assert.equal(fire(g), true); assert.equal(s.materials.cinderIron, 20 - cost, `${glyphs.length} Echo`);
    assert.equal(fire(g), true); assert.equal(s.materials.cinderIron, 20 - 2 * cost);
  }
});

test('the belt is spent before cinder iron', () => {
  const { s, g } = rig({ iron: 10, belt: 2 });
  fire(g); fire(g); assert.equal(s.rounds.loaded, 0); assert.equal(s.materials.cinderIron, 10);
  fire(g); assert.equal(s.materials.cinderIron, 8);
});

test('empowered rounds are used first and hit harder; then ordinary rounds from cinder iron', () => {
  const plain = rig({ iron: 20 }), emp = rig({ iron: 20, empowered: 2 });
  fire(plain.g); fire(emp.g);
  const base = tool(plain.g)[0].damage, hot = tool(emp.g)[0];
  assert.equal(emp.s.rounds.empowered, 1); assert.equal(emp.s.materials.cinderIron, 20, 'no iron while empowered rounds last');
  assert.equal(hot.damage, Math.max(1, Math.round(base * ROUNDS.empowered.damage))); assert.equal(hot.empowered, true);
  fire(emp.g); assert.equal(emp.s.rounds.empowered, 0); assert.match(emp.g.message, /last empowered round/);
  emp.g.projectiles = []; fire(emp.g); assert.equal(emp.s.materials.cinderIron, 18); assert.equal(tool(emp.g)[0].damage, base, 'ordinary damage again');
});

test('an empowered Blunderbuss shell is one round, and every pellet and Echo copy carries the bonus', () => {
  const B = { id: 'secondary-needle-caster', name: 'Blunderbuss', slot: 'secondary', tier: 'relic', power: 10, upgradeRank: 6 };
  const plain = rig({ iron: 20, item: B, glyphs: ['echo'] }), emp = rig({ iron: 20, item: B, glyphs: ['echo'], empowered: 5 });
  fire(plain.g); fire(emp.g);
  assert.equal(emp.s.rounds.empowered, 4, 'one round for the whole shell'); assert.equal(plain.s.materials.cinderIron, 17, 'a shell with one Echo takes 3 iron');
  const pellets = (g) => g.projectiles.filter((p) => !p.dead && /^shot-/.test(p.id)).map((p) => p.damage);
  assert.equal(pellets(emp.g).length, pellets(plain.g).length);
  for (const d of pellets(emp.g)) assert.ok(d > pellets(plain.g)[0]);
  const echo = (emp.g.glyphTimers || []).filter((t) => t.kind === 'shot'); assert.ok(echo.length >= 1); for (const t of echo) assert.equal(t.shot.empowered, true);
});

test('with no empowered rounds, no belt and too little cinder iron, the tool cannot fire', () => {
  const { s, g } = rig({ iron: 1 });
  assert.equal(fire(g), false); assert.equal(g.projectiles.length, 0); assert.equal(s.materials.cinderIron, 1);
  assert.match(g.message, /Out of rounds/);
  const r = actionReadiness(g, clock).tool; assert.equal(r.available, false); assert.equal(r.rounds, 'EMPTY');
  s.materials.cinderIron = 2; assert.equal(actionReadiness(g, clock).tool.available, true); assert.equal(actionReadiness(g, clock).tool.rounds, '1');
  s.rounds.empowered = 3; assert.equal(roundsLabel(s, rangedWeapon(s.equipment.secondary)), '✦3·1');
  assert.equal(g.roundsSummary(), ' · rounds ✦3 empowered + 1 (2 iron each)');
  s.equipment.secondary = { id: 'secondary-hammerfall', name: 'Hammerfall', slot: 'secondary' }; assert.equal(actionReadiness(g, clock).tool.rounds, null, 'a brawler tool shows no count');
  assert.equal(g.roundsSummary(), '');
});

test('the Aether Orrery takes a round per tap orb, empowered first, and taps nothing when empty', () => {
  const plain = rig({ iron: 6, item: ORRERY.item }), emp = rig({ iron: 6, item: ORRERY.item, empowered: 1 });
  const orb = (g) => g.projectiles.find((p) => !p.dead && p.orrery === 'orb');
  assert.equal(orreryPress(plain.g, 1000, { x: 1, y: 0 }), true); assert.equal(plain.s.materials.cinderIron, 4);
  assert.equal(orreryPress(emp.g, 1000, { x: 1, y: 0 }), true); assert.equal(emp.s.rounds.empowered, 0); assert.equal(emp.s.materials.cinderIron, 6);
  assert.ok(orb(emp.g).damage > orb(plain.g).damage);
  const dry = rig({ iron: 0, item: ORRERY.item }); assert.equal(orreryPress(dry.g, 1000, { x: 1, y: 0 }, 'tool'), false); assert.equal(dry.g.projectiles.length, 0); assert.equal(dry.g.orrery?.charge ?? null, null, 'no charge with nothing to release');
});

test('salvage pays cinder iron again, by hand and from a full pack', () => {
  assert.deepEqual(SMITHY.salvage.iron, { common: 1, rare: 2, epic: 3, relic: 4 }); assert.equal(ECONOMY.autoSalvageShare, 1);
  const s = freshSave(); s.materials.cinderIron = 0; s.inventory = [{ ...generateItem('r', 20), tier: 'relic' }];
  assert.equal(salvageInventoryItem(s, 0).iron, 4); assert.equal(s.materials.cinderIron, 4);
  const t = freshSave(); t.materials.cinderIron = 0; t.inventory = Array.from({ length: EQUIPMENT_CAPACITY }, (_, i) => ({ ...generateItem('f' + i, 20), tier: 'rare' }));
  storeInventoryItem(t, { ...generateItem('n', 20), tier: 'rare' }); assert.equal(t.materials.cinderIron, SMITHY.salvage.iron.rare, 'a full pack pays its salvage');
  const u = freshSave(); u.materials.cinderIron = 0; u.inventory = [{ ...generateItem('c', 20), tier: 'common' }]; assert.equal(salvageInventoryItem(u, 0, true).iron, 1);
});

test('saves: rounds are additive at schema 14, normalised by freshSave and migrateSave, unknown fields kept', () => {
  const f = freshSave(); assert.deepEqual(f.rounds, { v: 1, empowered: 0, loaded: ROUNDS.belt }); assert.equal(f.version, 14);
  const old = JSON.parse(JSON.stringify(f)); delete old.rounds; const m = migrateSave(old); assert.deepEqual(m.rounds, { v: 1, empowered: 0, loaded: ROUNDS.belt }, 'a journey from before rounds gets the belt');
  const odd = JSON.parse(JSON.stringify(f)); odd.rounds = { empowered: '7', loaded: -3, future: { kept: true } }; const n = migrateSave(odd);
  assert.equal(n.rounds.empowered, 7); assert.equal(n.rounds.loaded, 0); assert.deepEqual(n.rounds.future, { kept: true });
  for (const bad of [null, 'x', [1], { empowered: NaN, loaded: Infinity }]) { const q = JSON.parse(JSON.stringify(f)); q.rounds = bad; const r = migrateSave(q).rounds; assert.ok(Number.isFinite(r.empowered) && Number.isFinite(r.loaded)); }
  const again = migrateSave(JSON.parse(JSON.stringify(n))); assert.deepEqual(again.rounds, n.rounds, 'idempotent');
});

test('exact resume keeps the rounds and the iron', () => {
  const { s, g } = rig({ iron: 30, belt: 1, empowered: 2 }); fire(g); fire(g); fire(g);
  assert.deepEqual([s.rounds.empowered, s.rounds.loaded, s.materials.cinderIron], [0, 0, 30]);
  fire(g); const text = serializeSave(g.exportSnapshot(clock + 10)), back = new Game(deserializeSave(text), 900000);
  assert.deepEqual([back.save.rounds.empowered, back.save.rounds.loaded, back.save.materials.cinderIron], [0, 0, 28]);
});

test('finds: rolled by journey and place, version-pinned, paid once', () => {
  assert.equal(roundsFindRoll('A', 'crown', '3,4'), roundsFindRoll('A', 'crown', '3,4'));
  assert.equal(roundsFindRoll('A', 'nowhere', '3,4'), 0);
  let hits = 0, key = null; for (let i = 0; i < 400; i++) { const n = roundsFindRoll('ROUNDS', 'crown', `${i},0`); if (n) { hits++; key ??= `${i},0`; assert.ok(n >= ROUNDS.finds.crown.n[0] && n <= ROUNDS.finds.crown.n[1]); } }
  assert.ok(hits > 400 * ROUNDS.finds.crown.chance * .6 && hits < 400 * ROUNDS.finds.crown.chance * 1.4, `crown rate ${hits}/400`);
  let chest = 0; for (let i = 0; i < 400; i++) if (roundsFindRoll('ROUNDS', 'dungeon', `d:${i}`)) chest++;
  assert.ok(chest > 400 * ROUNDS.finds.dungeon.chance * .5 && chest < 400 * ROUNDS.finds.dungeon.chance * 1.5, `chest rate ${chest}/400`);
  const { s, g } = rig(); const n = roundsFindRoll(s.seed, 'crown', key);
  assert.equal(g.grantRoundsFind('crown', key), n); assert.equal(s.rounds.empowered, n); assert.equal(s.worldFlags[roundsFindFlag('crown', key)], true);
  assert.equal(g.grantRoundsFind('crown', key), 0, 'once'); assert.equal(s.rounds.empowered, n);
  assert.ok(g.questNotices.some((q) => q.title === 'EMPOWERED ROUNDS'));
  assert.equal(grantEmpoweredRounds(s, 5), n + 5, 'the hook for other sources');
});

test('a great tree crown pays its empowered rounds when the Crown Rest is reached', () => {
  const { s, g } = rig(); let rx = 0; while (!roundsFindRoll(s.seed, 'crown', `${rx},0`)) rx++;
  g.rx = rx; g.ry = 0; const w = 32; g.area = 'overworld';
  g.map = { ...g.map, objects: [{ id: 'crown-rest-x', kind: 'crownRest', x: 5, y: 5, state: 'open', actions: [] }], tiles: Array.from({ length: w * w }, (_, i) => ({ x: i % w, y: Math.floor(i / w), kind: 'ash', elev: 0 })) };
  Object.assign(g.player, { x: 5, y: 5 });
  assert.equal(g.touchCrownRest(), true); assert.equal(s.rounds.empowered, roundsFindRoll(s.seed, 'crown', `${rx},0`)); assert.match(g.message, /empowered rounds/);
  const held = s.rounds.empowered; g.map.objects[0].roundsChecked = false; g.touchCrownRest(); assert.equal(s.rounds.empowered, held, 'once');
});

test('60 s of firing every frame with cooldowns wiped: bounded, finite, iron spent by the rule', () => {
  const { s, g } = rig({ iron: 100000, glyphs: ['echo'] }); g.area = 'dungeon';
  g.enemies = [Object.assign(createCombatant('rootBrute', 14, 10), { id: 'dummy', hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 1e9, speed: 0 })];
  Object.assign(g.player, { x: 10, y: 10, hp: 1e9 });
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 20000, shots = 0, maxProj = 0;
  for (let i = 0; i < 3600; i++) { g.player.attackReadyAt = 0; if (g.fireSecondary(t, { x: 1, y: 0 })) shots++; g.update(1 / 60, idle, t); t += 1000 / 60; maxProj = Math.max(maxProj, g.projectiles.length); }
  assert.ok(shots > 0); assert.ok(maxProj <= 64, `projectiles ${maxProj}`);
  assert.equal(s.materials.cinderIron, 100000 - 3 * shots); assert.ok(Number.isFinite(s.rounds.empowered) && Number.isFinite(s.rounds.loaded));
  for (const p of g.projectiles) assert.ok(Number.isFinite(p.damage) && Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.ok(ordinaryRounds(s, 1) === Math.floor(s.materials.cinderIron / 3));
});

test('spendRound and ensureRounds stay sane on damaged state', () => {
  const s = { materials: { cinderIron: 'x' } }; assert.equal(spendRound(s, 0), 'ordinary', 'a save without rounds gets the belt'); assert.equal(s.rounds.loaded, ROUNDS.belt - 1);
  const t = { materials: { cinderIron: 3 }, rounds: { empowered: -2, loaded: NaN } }; ensureRounds(t); assert.equal(spendRound(t, 5), null); assert.equal(t.materials.cinderIron, 3);
});
