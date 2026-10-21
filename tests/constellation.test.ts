import test from 'node:test';
import assert from 'node:assert/strict';
import { BRANCHES, BRANCH_IDS, POINT_EVERY, ensureConstellation, pointsEarned, pointsSpent, pointsFree, learnRank, learnMod, chooseCap, respec, respecCost, hasNode, awakenCheck, awaken, AWAKEN_COST, RIFT } from '../src/constellation.ts';
import { APERTURE_SKILLS, skillRank } from '../src/items.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { validActions, applyInteraction } from '../src/interactions.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const rich = (aperture = 90) => { const s = freshSave(); s.perception.aperture = aperture; s.materials.lumenDust = 50; return s; };
const master = (s, bid) => { for (let i = 0; i < APERTURE_SKILLS[BRANCHES[bid].active].maxRank; i++) assert.equal(learnRank(s, bid).ok, true); assert.equal(learnMod(s, bid).ok, true); };
function arena(s, foes = [[11.2, 10]]) {
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', stamina: 50 }); s.lastAim = { x: 1, y: 0 }; g.player.lastMoveVector = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 300, maxHp: 300, damage: 0, cooldown: 99 }));
  return g;
}
const idle = { state: { x: 0, y: 0 }, consume: () => false };
const run = (g, ms, from) => { for (let t = 0; t < ms; t += 50) g.update(.05, idle, from + t); };

test('five branches, each an active with a modifier and two exclusive capstones; Rift Step is new', () => {
  assert.deepEqual(BRANCH_IDS, ['form', 'motion', 'veil', 'force', 'rift']);
  for (const b of Object.values(BRANCHES)) { assert.ok(APERTURE_SKILLS[b.active], b.active); assert.equal(b.caps.length, 2); }
  assert.equal(APERTURE_SKILLS['rift-step'].branch, 'Rift');
});

test('points come from Aperture; ranks and modifiers cost 1, capstones 2; a mastered branch can take both capstones (release 109)', () => {
  const s = rich(30); // 5 points
  assert.equal(pointsEarned(s), Math.floor(30 / POINT_EVERY));
  for (let i = 0; i < 3; i++) learnRank(s, 'form');
  assert.equal(learnMod(s, 'form').ok, true); assert.equal(pointsFree(s), 1);
  assert.equal(chooseCap(s, 'form', 'colossus').ok, false, 'needs 2 points');
  s.perception.aperture = 42;
  assert.equal(chooseCap(s, 'form', 'colossus').ok, true);
  assert.equal(chooseCap(s, 'form', 'colossus').ok, false, 'already taken');
  assert.equal(chooseCap(s, 'form', 'cinder-heart').ok, false, 'the second capstone also needs 2 points');
  s.perception.aperture = 54;
  assert.equal(chooseCap(s, 'form', 'cinder-heart').ok, true, 'both capstones once mastered');
  assert.equal(hasNode(s, 'colossus'), true); assert.equal(hasNode(s, 'cinder-heart'), true);
  assert.equal(pointsSpent(s), 3 + 1 + 2 + 2); assert.equal(chooseCap(s, 'form', 'cinder-heart').ok, false);
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual([m.constellation.caps.form, m.constellation.caps2.form], ['colossus', 'cinder-heart'], 'survives reload');
  assert.equal(learnRank(rich(0), 'form').ok, false, 'Ember Form opens at Aperture 6');
  const t = rich(90); assert.equal(learnMod(t, 'veil').ok, false, 'modifier needs the active first');
});

test('older saves keep every learned rank as grandfathered points; a learned Aerial Step becomes the Motion capstone', () => {
  const old = freshSave(); old.perception.aperture = 36; delete old.constellation;
  old.magicSkills.learned = { 'ember-form': 3, quickening: 3, 'veil-guard': 3, 'aerial-step': 1 };
  const m = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.equal(skillRank(m, 'ember-form'), 3); assert.equal(m.constellation.caps.motion, 'aerial-step');
  assert.ok(pointsFree(m) >= 0, `never negative (${pointsFree(m)})`);
  assert.equal(m.constellation.bonus, pointsSpent(m) - pointsEarned(m));
  const again = migrateSave(JSON.parse(JSON.stringify(m))); assert.equal(again.constellation.bonus, m.constellation.bonus, 'bonus is fixed once');
});

test('respec happens at shrines for lumen dust and refunds everything', () => {
  const s = rich(); master(s, 'veil'); chooseCap(s, 'veil', 'sanctuary');
  const shrine = { id: 'sh', kind: 'shrine', actions: ['inspect'], x: 1, y: 1 };
  assert.ok(validActions(shrine, s).includes('attune'));
  const r = applyInteraction(shrine, 'attune', s, 'test'); assert.equal(r.transition, 'skills'); assert.equal(r.shrine, true);
  const cost = respecCost(s), dust = s.materials.lumenDust;
  assert.equal(respec(s).ok, true);
  assert.equal(s.materials.lumenDust, dust - cost); assert.equal(pointsSpent(s), 0); assert.equal(hasNode(s, 'sanctuary'), false);
  const poor = rich(); master(poor, 'form'); poor.materials.lumenDust = 0; assert.equal(respec(poor).ok, false);
});

test('Rift Step blinks along the move direction, stops at walls and ledges, and Fold holds two charges', () => {
  const s = rich(); master(s, 'rift'); s.magicSkills.selected = 'rift-step';
  let g = arena(s, []); g.lastUpdateNow = 1000;
  assert.equal(g.activateApertureSkill('rift-step'), true); assert.ok(g.player.x > 14.5, `blinked to ${g.player.x}`);
  assert.equal(g.activateApertureSkill('rift-step'), false, 'one charge without Fold');
  g = arena(s, []); g.map.tiles[10 * 32 + 12] = { ...g.map.tiles[10 * 32 + 12], blocked: true, kind: 'wall' }; g.lastUpdateNow = 1000; s.magicSkills.riftCharges = 1; s.magicSkills.cooldowns['rift-step'] = 0;
  g.activateApertureSkill('rift-step'); assert.ok(g.player.x < 11.5, 'stopped before the wall');
  const f = rich(); master(f, 'rift'); chooseCap(f, 'rift', 'fold');
  g = arena(f, []); g.lastUpdateNow = 1000;
  assert.equal(g.activateApertureSkill('rift-step'), true); assert.equal(g.activateApertureSkill('rift-step'), true, 'second charge');
});

test('release 259: Rift Step never recalls you; the Anchor capstone is Long Step and reaches farther', () => {
  const plain = rich(); master(plain, 'rift'); let g = arena(plain, []); g.lastUpdateNow = 1000; const x0 = g.player.x;
  g.activateApertureSkill('rift-step'); const short = g.player.x - x0;
  const s = rich(); master(s, 'rift'); chooseCap(s, 'rift', 'anchor');
  g = arena(s, []); g.lastUpdateNow = 1000;
  assert.equal(g.activateApertureSkill('rift-step'), true); const long = g.player.x - x0;
  assert.ok(long > short + RIFT.longStep - .3, `Long Step goes farther (${short} -> ${long})`);
  s.magicSkills.riftCharges = 1; s.magicSkills.cooldowns['rift-step'] = 0; const landed = g.player.x; g.lastUpdateNow = 1500;
  g.activateApertureSkill('rift-step');
  assert.ok(g.player.x >= landed, 'a second use within 3 s steps on; it never pulls you back');
  assert.equal(s.magicSkills.riftAnchor, undefined, 'no recall point is kept');
  s.magicSkills.riftAnchor = { x: 1, y: 1, until: 1e12, areaId: g.areaId() }; s.magicSkills.riftCharges = 1; const before = g.player.x;
  g.activateApertureSkill('rift-step'); assert.notEqual(g.player.x, 1, 'a recall point saved by an older release is ignored'); assert.equal(s.magicSkills.riftAnchor, undefined);
  assert.ok(g.player.x >= before);
});

test('modifiers and capstones act in play: Ember Skin burns, Mirror Veil undoes a blow, Overflow speeds spells, Cinder Heart bursts', () => {
  const s = rich(120); master(s, 'form'); chooseCap(s, 'form', 'cinder-heart'); master(s, 'veil'); chooseCap(s, 'veil', 'mirror-veil'); master(s, 'force');
  const g = arena(s);
  g.activateApertureSkill('ember-form'); g.primaryAttack(1000, { x: 1, y: 0 });
  assert.ok(g.enemies[0].glyphBurn, 'Ember Skin');
  const hp = g.enemies[0].hp; s.magicSkills.active.remaining = .01; run(g, 100, 1100);
  assert.ok(g.enemies[0].hp < hp, 'Cinder Heart burst when the form ended');
  s.magicSkills.cooldowns = {}; g.activateApertureSkill('veil-guard'); run(g, 50, 2000);
  const before = g.player.hp; g.player.hp -= 10; run(g, 50, 2100);
  assert.equal(g.player.hp, before, 'first blow undone');
  s.magicSkills.cooldowns = {}; s.magicSkills.active = null; g.activateApertureSkill('force-channel'); g.spellCooldownRemaining = 5; run(g, 1000, 3000);
  assert.ok(g.spellCooldownRemaining < 5 - 1 - .2, 'Overflow');
});

test('awakening needs a max-rank weapon holding a Resonance and lumen dust; awakened weapons gain new shapes', () => {
  const s = rich(); s.equipment.primary = normalizeSockets({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 4, basePower: 4, property: 'impact', tier: 'common', affixes: [], upgradeRank: 0 });
  assert.match(awakenCheck(s, 'primary').message, /Strengthen/);
  s.equipment.primary.upgradeRank = 3; s.equipment.primary.power = 7;
  assert.match(awakenCheck(s, 'primary').message, /Resonance/);
  s.equipment.primary = normalizeSockets({ ...s.equipment.primary, tier: 'rare' }); s.equipment.primary.upgradeRank = 4; s.equipment.primary.glyphs = ['ignite', 'chain'];
  assert.equal(awakenCheck(s, 'primary').ok, true);
  const dust = s.materials.lumenDust; assert.equal(awaken(s, 'primary').ok, true); assert.equal(s.materials.lumenDust, dust - AWAKEN_COST);
  assert.equal(s.equipment.primary.awakened.resonance, 'wildfire'); assert.equal(awaken(s, 'primary').ok, false, 'once');
  const g = arena(s, [[11.2, 10], [14, 10]]);
  for (let k = 0; k < 3; k++) g.primaryAttack(1000 + k * 600, { x: 1, y: 0 });
  assert.ok(g.projectiles.some((p) => p.crescent), 'third swing releases a crescent');
  s.equipment.secondary = normalizeSockets({ id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', power: 4, property: 'quick', tier: 'rare', affixes: [], awakened: { resonance: 'wildfire' } });
  const before = g.projectiles.length; g.fireSecondary(5000, { x: 1, y: 0 });
  assert.equal(g.projectiles.length - before, 3, 'awakened tool fans three shots');
});

test('the Forge lab awakening scenario is ready to awaken and spend points', () => {
  const f = createLabFixture({ lab: 'forge', scenario: 'awakening', now: 0 });
  assert.equal(awakenCheck(f.save, 'primary').ok, true); assert.ok(pointsFree(f.save) >= 15);
});
