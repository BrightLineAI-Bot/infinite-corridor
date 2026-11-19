// Tim's batch (2026-11-18/19): Tempo, Shatterpoint, Pocket Time, Arcane Edge, Glyph Mine, Casting Wind (his "Second Wind"),
// Echoing Cast and Rapid Reload (src/hit-cast-passives.ts), on the branch's `hit` trigger (game.ts landHit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { FIELD_KEYS, TOOL_FORM_KEYS, fieldForm } from '../src/lattice-fields.ts';
import { BRANCHES, BRANCH_IDS, learnExtra, learnRank, pointsSpent, respec, hasNode, latticePassiveGroups, PASSIVE_KEYS } from '../src/constellation.ts';
import { TEMPO, SHATTERPOINT, POCKET_TIME, ARCANE_EDGE, GLYPH_MINE, CASTING_WIND, ECHOING_CAST, RAPID_RELOAD, CAST_NODE_IDS, vulnerableUntil, passiveMarkOf, glyphMinesOf, reloadPips, edgeMoveBonus, weakenScale } from '../src/hit-cast-passives.ts';
import { CARBINE } from '../src/tool-forms.ts';

const DT = 1 / 60;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
// A flat dungeon with the Lattice open (`fields`: Lattice keys without `field:`) and constellation nodes learned (`nodes`).
function arena({ fields = [], nodes = [], foes = [[12, 10]] } = {}) {
  const s = freshSave(); s.seed = 'HIT-CAST'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s);
  s.lattice.extra.passive = 3; s.lattice.passives = fields.map((id) => `field:${id}`);
  for (const id of nodes) s.constellation.mods[id] = true;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100, stamina: 0 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 }));
  return { s, g, e: g.enemies[0] };
}
// The extra health a landHit took (the hit's own damage is already dealt by its caller).
const extra = (g, e, actual, now, src = 'melee') => { const b = e.hp; g.landHit(e, actual, now, src); return b - e.hp; };

test('placement: two Lattice field passives, a Lattice tool form, and one constellation node a branch', () => {
  assert.ok(FIELD_KEYS.includes('field:tempo') && FIELD_KEYS.includes('field:shatterpoint'));
  assert.ok(TOOL_FORM_KEYS.includes('field:rapid-reload'));
  for (const k of ['field:tempo', 'field:shatterpoint', 'field:rapid-reload']) assert.ok(fieldForm(k)?.text.length > 20, k);
  assert.deepEqual(BRANCH_IDS.map((b) => BRANCHES[b].extras[0].id), ['arcane-edge', 'casting-wind', 'pocket-time', 'echoing-cast', 'glyph-mine']);
  assert.deepEqual([...CAST_NODE_IDS].sort(), BRANCH_IDS.map((b) => BRANCHES[b].extras[0].id).sort());
  assert.notEqual(BRANCHES.motion.extras[0].name, 'Second Wind', 'Light Feet\'s secondary form already has that name');
  for (const id of CAST_NODE_IDS) assert.ok(!PASSIVE_KEYS.includes(id), 'not a Lattice passive');
  const all = latticePassiveGroups().flatMap((g) => g.keys); assert.ok(all.includes('field:tempo') && all.includes('field:rapid-reload'));
  // learned like a modifier: a point once the discipline has a rank; respec refunds it; nothing new in the save
  const s = freshSave(); s.perception.aperture = 600;
  assert.equal(learnExtra(s, 'force', 'echoing-cast').ok, false, 'needs Force Channel first');
  assert.equal(learnRank(s, 'force').ok, true); const spent = pointsSpent(s);
  assert.equal(learnExtra(s, 'force', 'echoing-cast').ok, true); assert.equal(pointsSpent(s), spent + 1); assert.ok(hasNode(s, 'echoing-cast'));
  assert.equal(learnExtra(s, 'force', 'echoing-cast').ok, false, 'once');
  assert.equal(learnExtra(s, 'force', 'glyph-mine').ok, false, 'a node of another branch');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.constellation.mods['echoing-cast'], true, 'kept through a save');
  s.materials.lumenDust = 99; assert.equal(respec(s).ok, true); assert.equal(hasNode(s, 'echoing-cast'), false);
});

test('Tempo: the 5th hit on one foe within 4 s opens a 2 s window of +25% from every source; one at a time; then it counts again', () => {
  const { g, e } = arena({ fields: ['tempo'] }); let t = 1000;
  for (let i = 0; i < TEMPO.hits - 1; i++) { assert.equal(extra(g, e, 100, t), 0); t += 200; }
  assert.equal(vulnerableUntil(e) > t, false);
  extra(g, e, 100, t); assert.equal(vulnerableUntil(e), t + TEMPO.vulnMs, 'the 5th opens it');
  t += 100; assert.equal(extra(g, e, 100, t), 25, 'a hit: +25%');
  const w = g.glyphWorld(t), b = e.hp; w.damage(e, 40); const procTaken = b - e.hp;
  const { g: g2, e: e2 } = arena(); const b2 = e2.hp; g2.glyphWorld(t).damage(e2, 40); assert.equal(procTaken, Math.round((b2 - e2.hp) * 1.25), 'a proc: +25%');
  e.glyphBurn = { until: t + 5000, dps: 60, tick: 0 }; const b3 = e.hp; g.tickGlyphs(.5, t); const burn1 = b3 - e.hp;
  e2.glyphBurn = { until: t + 5000, dps: 60, tick: 0 }; const b4 = e2.hp; g2.tickGlyphs(.5, t); assert.ok(burn1 > b4 - e2.hp, `a burn too (${burn1} > ${b4 - e2.hp})`);
  // hits during the window do not count; after it the count starts again from nothing
  for (let i = 0; i < 6; i++) { t += 100; extra(g, e, 100, t); } assert.equal(passiveMarkOf(e).n, 0);
  t = vulnerableUntil(e) + 10; assert.equal(extra(g, e, 100, t), 0, 'the window closed');
  for (let i = 0; i < TEMPO.hits - 1; i++) { t += 100; extra(g, e, 100, t); } assert.ok(vulnerableUntil(e) > t, 'opens again');
  // one attack's hits within the gap count once; a slow pace (over 4 s) never opens it
  const { g: g3, e: e3 } = arena({ fields: ['tempo'] }); for (let i = 0; i < 10; i++) extra(g3, e3, 100, 5000 + i * 10); assert.equal(passiveMarkOf(e3).n, 2);
  const { g: g4, e: e4 } = arena({ fields: ['tempo'] }); for (let i = 0; i < 12; i++) extra(g4, e4, 100, 5000 + i * 1100); assert.equal(vulnerableUntil(e4), 0);
  // without the passive: nothing
  const { g: g5, e: e5 } = arena(); for (let i = 0; i < 8; i++) assert.equal(extra(g5, e5, 100, 5000 + i * 100), 0); assert.equal(passiveMarkOf(e5), null);
});

test('Shatterpoint: +40% on a staggered or poise-broken foe, nothing on an ordinary flinch', () => {
  const { g, e } = arena({ fields: ['shatterpoint'] });
  e.hitStun = .22; assert.equal(extra(g, e, 100, 1000), 0, 'a swing\'s own flinch');
  e.hitStun = .5; assert.equal(extra(g, e, 100, 1100), 40, 'staggered');
  e.hitStun = 0; Object.defineProperty(e, 'bhv', { value: { stagger: .3 }, writable: true, configurable: true, enumerable: false }); assert.equal(extra(g, e, 100, 1200, null), 40, 'poise broken (any hit)');
  e.bhv.stagger = 0; assert.equal(extra(g, e, 100, 1300), 0);
  assert.equal(SHATTERPOINT.bonus, .4);
});

test('Pocket Time: melee hits lengthen the active skill .15 s each, at most 3 s an activation; spells and shots do not', () => {
  const { s, g, e } = arena({ nodes: ['pocket-time'] });
  s.magicSkills.active = { id: 'veil-guard', rank: 1, remaining: 5 };
  extra(g, e, 10, 1000); assert.ok(Math.abs(s.magicSkills.active.remaining - 5.15) < 1e-9);
  extra(g, e, 10, 1010); assert.ok(Math.abs(s.magicSkills.active.remaining - 5.15) < 1e-9, 'the same attack (within the gap)');
  extra(g, e, 10, 1200, null); extra(g, e, 10, 1300, { glyphHost: 'spell' }); assert.ok(Math.abs(s.magicSkills.active.remaining - 5.15) < 1e-9, 'not melee');
  extra(g, e, 10, 1400, { brawler: true }); assert.ok(Math.abs(s.magicSkills.active.remaining - 5.3) < 1e-9, 'a punch is melee');
  for (let i = 0; i < 60; i++) extra(g, e, 10, 2000 + i * 100);
  assert.ok(Math.abs(s.magicSkills.active.remaining - (5 + POCKET_TIME.cap)) < 1e-9, `capped (${s.magicSkills.active.remaining})`);
  s.magicSkills.active = { id: 'ember-form', rank: 1, remaining: 4 }; extra(g, e, 10, 9000); assert.ok(s.magicSkills.active.remaining > 4, 'a new activation: a new cap');
  // a timed spell: Imbue Weapon
  g.imbueUntil = 10000 + 3000; extra(g, e, 10, 10000); assert.equal(g.imbueUntil, 13150);
  for (let i = 0; i < 60; i++) extra(g, e, 10, 10100 + i * 100); assert.equal(g.imbueUntil, 13000 + POCKET_TIME.cap * 1000);
  g.aegisUntil = 20000; extra(g, e, 10, 16200); assert.equal(g.aegisUntil, 20000, 'Aegis is left out');
});

test('Arcane Edge: a cast empowers the next three melee attacks by 30%, each with its element\'s touch', () => {
  const { s, g, e } = arena({ nodes: ['arcane-edge'], foes: [[12, 10], [12, 11]] });
  assert.equal(extra(g, e, 100, 900), 0, 'nothing before a cast');
  s.equippedSpell = 'ember-ring'; g.passiveCast(1000);
  assert.equal(extra(g, e, 100, 1100), 30); assert.ok(e.glyphBurn?.until > 1100, 'Fire burns');
  assert.equal(extra(g, g.enemies[1], 100, 1100), 30, 'the same attack\'s other foe rides on it');
  assert.equal(extra(g, e, 100, 1200, null), 0, 'a spell or shot is not melee');
  assert.equal(extra(g, e, 100, 1300), 30); assert.equal(extra(g, e, 100, 1400), 30); assert.equal(extra(g, e, 100, 1500), 0, 'three attacks');
  const touch = (spell, setup = () => {}) => { const A = arena({ nodes: ['arcane-edge'] }); A.s.equippedSpell = spell; setup(A); A.g.passiveCast(1000); extra(A.g, A.e, 100, 1100); return A; };
  { const A = touch('grave-sun'); assert.equal(weakenScale(A.e, 1200), 1 - ARCANE_EDGE.dusk.share, 'Dusk weakens'); assert.equal(weakenScale(A.e, 4000), 1); }
  { const A = touch('gravity-well'); assert.ok(A.e.x < 12, `Rift pulls (${A.e.x})`); }
  { const A = touch('stillpoint'); assert.ok(A.g.guardRemaining >= ARCANE_EDGE.ward.guard, 'Ward guards'); }
  { const A = touch('essence-walk'); assert.equal(edgeMoveBonus(A.s), ARCANE_EDGE.wind.move, 'Wind speeds'); A.g.update(DT, idle, 1100); for (let i = 0; i < 200; i++) A.g.update(DT, idle, 1200 + i * 16); assert.equal(edgeMoveBonus(A.s), 0, 'for a while'); }
  { const A = touch('imbue-weapon'); assert.ok(A.e.hitStun >= ARCANE_EDGE.force.stun, 'Force staggers'); }
  { const A = touch('gravity-well', ({ e }) => { e.boss = true; }); assert.equal(A.e.x, 12, 'a boss holds its ground'); }
});

test('Glyph Mine: each cast leaves a sigil (three at most); it bursts on a foe stepping in, or after 4 s, as a proc', () => {
  const { s, g, e } = arena({ nodes: ['glyph-mine'], foes: [[20, 20]] });
  s.equippedSpell = 'ember-ring'; for (let i = 0; i < 5; i++) g.passiveCast(1000 + i);
  assert.equal(glyphMinesOf(g).length, GLYPH_MINE.max, 'the oldest gives way');
  const hp = e.hp; e.x = 10; e.y = 10; g.tickGlyphs(DT, 1100); g.update(DT, idle, 1100);
  assert.equal(glyphMinesOf(g).length, 0, 'a foe stepped in: all three under it burst'); assert.ok(e.hp < hp);
  e.x = 25; e.y = 25; g.passiveCast(2000); g.update(DT, idle, 2000 + GLYPH_MINE.lifeMs - 50); assert.equal(glyphMinesOf(g).length, 1);
  g.update(DT, idle, 2000 + GLYPH_MINE.lifeMs + 1); assert.equal(glyphMinesOf(g).length, 0, 'burst on its own');
});

test('Casting Wind: each cast gives back 15% of stamina; under Essence Walk never more than half its cost', () => {
  const { s, g } = arena({ nodes: ['casting-wind'] }); s.maxStamina = 100; g.player.stamina = 10;
  g.passiveCast(1000); assert.equal(g.player.stamina, 10 + 100 * CASTING_WIND.share);
  g.player.stamina = 99; g.passiveCast(1100); assert.equal(g.player.stamina, 100, 'capped at the maximum');
  // Essence Walk: a recovering spell cast for stamina
  const B = arena({ nodes: ['casting-wind'] }); B.s.maxStamina = 100; B.g.player.stamina = 100; B.g.essenceUntil = 99999; B.g.lastUpdateNow = 1000;
  B.s.magicSkills.cooldowns['spell:cinder-dart'] = 5; const cost = B.g.essencePrice('cinder-dart');
  assert.equal(B.g.castSpell('cinder-dart'), true);
  const back = Math.min(100 * CASTING_WIND.share, cost * CASTING_WIND.essenceShare);
  assert.ok(Math.abs(B.g.player.stamina - (100 - cost + back)) < 1e-9, `${B.g.player.stamina} vs ${100 - cost + back}`); assert.ok(back < cost, 'the walk always costs');
});

test('Echoing Cast: every 4th cast repeats 0.4 s later at half power, as an Echo copy that is never counted', () => {
  const { s, g } = arena({ nodes: ['echoing-cast'] }); g.lastUpdateNow = 1000;
  const cast = () => { s.magicSkills.cooldowns = {}; g.spellCooldownRemaining = 0; assert.equal(g.castSpell('ember-ring'), true); };
  for (let i = 0; i < 3; i++) cast(); assert.equal(g.effects.filter((f) => f.recast).length, 0);
  const n = g.effects.length; cast(); const rec = g.effects.filter((f) => f.recast);
  assert.equal(rec.length, 1); const orig = g.effects[n];
  assert.equal(rec[0].damage, Math.max(1, Math.round(orig.damage * ECHOING_CAST.share))); assert.ok(Math.abs(rec[0].delay - .4) < 1e-9); assert.equal(rec[0].echo, true);
  for (let i = 0; i < 3; i++) cast(); assert.equal(g.effects.filter((f) => f.recast).length, 1, 'the repeat is not a cast');
  cast(); assert.equal(g.effects.filter((f) => f.recast).length, 2);
  // a spell's shots repeat from the Wayfarer, later
  const B = arena({ nodes: ['echoing-cast'] }); B.g.lastUpdateNow = 1000;
  for (let i = 0; i < 4; i++) { B.s.magicSkills.cooldowns = {}; B.g.castSpell('fire-burst'); }
  assert.ok((B.g.glyphTimers || []).some((t) => t.kind === 'shot' && t.shot.recast && t.at === 1400));
});

test('Rapid Reload: every 3rd charged release that hits gives back 20% stamina; one per release; taps never; capped and paced', () => {
  const { s, g, e } = arena({ fields: ['rapid-reload'] }); s.maxStamina = 90; let t = 1000;
  assert.equal(reloadPips(g), 0); assert.equal(reloadPips(arena().g), -1, 'hidden without it');
  const shot = (cost = 0) => ({ rr: g.chargedRelease(cost) });
  const a = shot(); g.landHit(e, 10, t, a); g.landHit(e, 10, t + 5, a); g.landHit(g.enemies[0], 10, t + 300, a); assert.equal(reloadPips(g), 1, 'a release counts once');
  g.landHit(e, 10, t, {}); g.landHit(e, 10, t, null); g.landHit(e, 10, t, { rr: 0 }); assert.equal(reloadPips(g), 1, 'taps never count');
  g.landHit(e, 10, t, shot()); g.landHit(e, 10, t, shot()); assert.equal(reloadPips(g), 3);
  g.player.stamina = 0; g.update(DT, idle, t); assert.ok(Math.abs(g.player.stamina - 90 * RAPID_RELOAD.share) < 1, `refunded (${g.player.stamina})`); assert.equal(reloadPips(g), 0);
  // paced: a full count waits for the cooldown
  for (let i = 0; i < 3; i++) g.landHit(e, 10, t + 100, shot()); g.player.stamina = 0; g.update(DT, idle, t + 200); assert.ok(g.player.stamina < 5, 'not yet');
  g.update(DT, idle, t + RAPID_RELOAD.cooldownMs + 10); assert.ok(g.player.stamina >= 90 * RAPID_RELOAD.share - 1, 'after the cooldown');
  // a release paid in stamina never refunds more than it cost
  t += 5000; for (let i = 0; i < 3; i++) g.landHit(e, 10, t, shot(2)); g.player.stamina = 0; g.update(DT, idle, t); assert.ok(g.player.stamina <= 6 + 1, `≤ the 6 they cost, plus a frame of regen (${g.player.stamina})`);
  // without the passive the count never moves
  const B = arena(); for (let i = 0; i < 5; i++) B.g.landHit(B.e, 10, 1000, { rr: B.g.chargedRelease() }); assert.equal(B.g._hcp.rr.n, 0);
});

test('Rapid Reload reads the real charged releases: a charged Carbine beam and a charged Orbit Volley; a tap never', () => {
  const { s, g } = arena({ fields: ['rapid-reload'] }); s.equipment.secondary = { id: 'secondary-spark-coil', slot: 'secondary', name: 'Carbine', tier: 'rare', power: 5, upgradeRank: 6, glyphs: [] }; s.rounds = { empowered: 9 };
  const n0 = g.projectiles.length; g.carbineFire(1000, { x: 1, y: 0 }, 0);
  const tap = g.projectiles.slice(n0).find((q) => q.carbine); assert.ok(tap && !(tap.rr > 0), 'a tap is no release');
  const n1 = g.projectiles.length; g.carbineFire(3000, { x: 1, y: 0 }, CARBINE.charge.full);
  const beam = g.projectiles.slice(n1).find((q) => q.carbine); assert.ok(beam && beam.rr > 0, 'a charged beam is');
  // Orbit Volley: a charged launch carries its release to the burst
  const B = arena({ fields: ['rapid-reload'] }); B.g.orbit = { start: 0, where: `${B.g.area}:${B.g.areaId()}` }; B.g.launchOrbit(false, 2200); assert.ok(B.g.orbit.flight.rr > 0);
  const C = arena({ fields: ['rapid-reload'] }); C.g.orbit = { start: 0, where: `${C.g.area}:${C.g.areaId()}` }; C.g.launchOrbit(false, 300); assert.equal(C.g.orbit.flight.rr, 0, 'barely held');
  const D = arena({ fields: ['rapid-reload'] }); D.g.orbit = { start: 0, where: `${D.g.area}:${D.g.areaId()}` }; D.g.launchOrbit(true, 3300); assert.equal(D.g.orbit.flight.rr, 0, 'timed out: the plain ball');
});

test('stress: every spell cast every frame with cooldowns wiped for 60 s, all passives set: no NaN, nothing unbounded', () => {
  const { s, g } = arena({ fields: ['tempo', 'shatterpoint', 'rapid-reload'], nodes: CAST_NODE_IDS, foes: [[12, 10], [13, 11], [11, 12], [14, 9]] });
  s.magicSkills.active = { id: 'veil-guard', rank: 1, remaining: 3 }; s.maxStamina = 100;
  const ids = Object.keys(SPELLS); let t = 1000, maxFx = 0, maxShots = 0, maxTimers = 0;
  for (let f = 0; f < 60 * 60; f++) {
    t += 1000 / 60; g.lastUpdateNow = t; s.magicSkills.cooldowns = {}; g.spellCooldownRemaining = 0;
    for (const e of g.enemies) { if (e.dead || e.hp < 1000) Object.assign(e, { dead: false, hp: 50000 }); }
    try { g.castSpell(ids[f % ids.length]); } catch (err) { assert.fail(`${ids[f % ids.length]}: ${err.message}`); }
    g.update(1 / 60, idle, t);
    for (const e of g.enemies) g.landHit(e, 20, t, f % 7 ? 'melee' : { rr: g.chargedRelease() });
    maxFx = Math.max(maxFx, g.effects.length); maxShots = Math.max(maxShots, g.projectiles.length); maxTimers = Math.max(maxTimers, (g.glyphTimers || []).length);
    assert.ok(Number.isFinite(g.player.stamina) && Number.isFinite(g.player.hp), `frame ${f}`);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp), `foe hp frame ${f}`);
  }
  assert.ok(glyphMinesOf(g).length <= GLYPH_MINE.max);
  assert.ok(maxFx < 400 && maxShots < 400 && maxTimers < 400, `bounded: ${maxFx} effects, ${maxShots} shots, ${maxTimers} timers`);
  assert.ok(Number.isFinite(s.magicSkills.active?.remaining ?? 0) && (s.magicSkills.active?.pocket ?? 0) <= POCKET_TIME.cap + 1e-9);
});
