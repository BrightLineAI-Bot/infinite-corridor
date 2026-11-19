// Melee buffs reach every melee source (Tim, 2026-11-19: "Ember Form should work with the fists and the tools that do melee
// damage... whatever melee damage buffs, they should also work with the tools that do melee damage"; corrected the same day:
// the Great Sweep is melee, the Blunderbuss stays as it is). One line: hit-cast-passives.ts isMeleeSource; the skills' melee
// stat parts: constellation.ts SKILL_MELEE. Tool shots are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR, characterStats } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { BRAWLER } from '../src/brawler-spells.ts';
import { SKILL_MELEE, skillMeleeBonus, skillReachBonus } from '../src/constellation.ts';
import { ARCANE_EDGE, isMeleeSource, edgeCharges } from '../src/hit-cast-passives.ts';
import { FIELD_PASSIVES } from '../src/lattice-fields.ts';
import { ensureLattice } from '../src/transit-lattice.ts';

const gear = (name) => ({ ...BRAWLER_GEAR.find((g) => g.item.name === name).item });
const fists = () => ({ id: 'primary-if-test', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
const blunderbuss = () => ({ id: 'secondary-blunderbuss', name: 'Blunderbuss', slot: 'secondary', power: 10, tier: 'rare', affixes: [] });
// `ember`: Ember Form running at rank 3; `nodes`: constellation mods; `secondary` / `primary`: gear; `spellblade`: held and a spell running.
function arena({ ember = false, nodes = [], secondary = null, primary = null, spellblade = false, foes = [[12, 10]] } = {}) {
  const s = freshSave(); s.seed = 'MELEE-SCOPE'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s);
  if (spellblade) s.lattice.passives = ['field:spellblade'];
  if (secondary) s.equipment.secondary = secondary; if (primary) s.equipment.primary = primary;
  s.magicSkills.learned['ember-form'] = 3; for (const id of nodes) s.constellation.mods[id] = true;
  if (ember) s.magicSkills.active = { id: 'ember-form', rank: 3, remaining: 99, duration: 99 };
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100, invulnerableUntil: 1e15 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99, speed: 0 }));
  if (spellblade) g.spellRunning = () => true;
  g.lastUpdateNow = 1000;
  return { s, g, e: g.enemies[0] };
}
const SHOT = { glyphHost: 'tool', damageType: 'physical' }, FIST = { kind: 'iron-fist', brawler: true }, HAMMER = { kind: 'hammerfall', brawler: true },
  SWEEP = { kind: 'great-sweep', brawler: true }, ART = { melee: true };

test('one rule: swings, arts, fists, Hammerfall and the Great Sweep are melee; shots, pulses, procs and reflects are not', () => {
  for (const src of ['melee', ART, FIST, HAMMER, SWEEP, { kind: 'plunge-slam', brawler: true }]) assert.equal(isMeleeSource(src), true, JSON.stringify(src));
  for (const src of [null, undefined, SHOT, { glyphHost: 'tool', mirage: true }, { kind: 'ember-ring', damage: 5 }, { aegisReflected: true }, { aegisReflected: true, brawler: true }, 'shot']) assert.equal(isMeleeSource(src), false, JSON.stringify(src));
});

test('Ember Skin burns from every melee hit (fists and melee tools too), never from a tool shot', () => {
  for (const src of ['melee', ART, FIST, HAMMER, SWEEP]) {
    const { g, e } = arena({ ember: true, nodes: ['ember-skin'] }); g.landHit(e, 20, 1000, src);
    assert.ok(e.glyphBurn?.until > 1000, `burns: ${JSON.stringify(src)}`);
  }
  const { g, e } = arena({ ember: true, nodes: ['ember-skin'] }); g.landHit(e, 20, 1000, SHOT); assert.equal(e.glyphBurn, undefined, 'a shot does not');
  const { g: g2, e: e2 } = arena({ nodes: ['ember-skin'] }); g2.landHit(e2, 20, 1000, FIST); assert.equal(e2.glyphBurn, undefined, 'only while Ember Form holds');
});

test('Arcane Edge charges ride fists and melee tools, never shots', () => {
  for (const src of [FIST, HAMMER, SWEEP]) {
    const { g, e } = arena({ nodes: ['arcane-edge'] }); g.passiveCast(1000); const b = e.hp; g.landHit(e, 100, 1100, src);
    assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits - 1); assert.ok(b - e.hp >= Math.round(100 * ARCANE_EDGE.bonus));
  }
  const { g, e } = arena({ nodes: ['arcane-edge'] }); g.passiveCast(1000); const b = e.hp; g.landHit(e, 100, 1100, SHOT);
  assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits, 'a shot spends nothing'); assert.equal(b - e.hp, 0);
});

test('the skills\' melee stat parts are data, and the totals are as before', () => {
  const r = 3, act = (id) => ({ id });
  assert.equal(skillMeleeBonus(act('ember-form'), r), 2 + r * 2); assert.equal(skillMeleeBonus(act('force-channel'), r), r * 2); assert.equal(skillMeleeBonus(act('quickening'), r), 0); assert.equal(skillMeleeBonus(null, r), 0);
  assert.ok(Math.abs(skillReachBonus(act('ember-form'), r) - (.12 + .06 * r)) < 1e-12); assert.equal(skillReachBonus(act('force-channel'), r), 0);
  assert.ok(SKILL_MELEE['ember-form'] && SKILL_MELEE['force-channel']);
  const { s: s0 } = arena(), { s: s1 } = arena({ ember: true }), d0 = characterStats(s0), d1 = characterStats(s1);
  assert.equal(d1.meleeBonus - d0.meleeBonus, 2 + 3 * 2); assert.ok(Math.abs(d1.attackReach - d0.attackReach - (.12 + .06 * 3)) < 1e-12);
  assert.equal(d1.skillMelee, 8); assert.equal(d0.skillMelee, 0); assert.ok(d1.skillReach > 0);
});

test('Ember Form: more damage and reach on the Iron Fists\' punch', () => {
  const punch = (opts) => { const { g } = arena({ primary: fists(), ...opts }); g.fistPunch(2, 0, 1000, { x: 1, y: 0 }); return g.effects.find((f) => f.kind === 'iron-fist'); };
  const plain = punch({}), ember = punch({ ember: true }), blade = punch({ spellblade: true });
  assert.ok(ember.damage > plain.damage, `damage ${ember.damage} > ${plain.damage}`);
  assert.ok(Math.abs(ember.radius - plain.radius * (1 + skillReachBonus({ id: 'ember-form' }, 3))) < 1e-9, 'Ember Form\'s reach');
  assert.ok(Math.abs(blade.radius - (plain.radius + FIELD_PASSIVES.spellblade.reach)) < 1e-9, 'Spellblade\'s reach too');
  assert.ok(blade.damage > plain.damage, 'Spellblade\'s damage (as before)');
});

test('Ember Form: more damage and reach on the Great Sweep and Hammerfall', () => {
  const sweep = (opts) => { const { g } = arena({ secondary: gear('Great Sweep'), ...opts }); assert.ok(g.brawlerTool('great-sweep', 1000)); return g.toolSwing.payload; }; // the Great Sweep is a held swing (game.ts startToolSwing)
  const p = sweep({}), q = sweep({ ember: true }), sr = skillReachBonus({ id: 'ember-form' }, 3);
  assert.ok(q.damage > p.damage, `sweep damage ${q.damage} > ${p.damage}`);
  assert.ok(Math.abs(q.radius - BRAWLER['great-sweep'].radius * (1 + sr)) < 1e-9 && Math.abs(p.radius - BRAWLER['great-sweep'].radius) < 1e-9, 'sweep reach');
  // Hammerfall: a foe a little past its plain reach is struck only with Ember Form's reach
  const far = 10 + BRAWLER.hammerfall.reach + .5 + BRAWLER.hammerfall.reach * sr * .5;
  const hammer = (opts) => { const { g } = arena({ secondary: gear('Hammerfall'), foes: [[far, 10]], ...opts }); assert.ok(g.brawlerTool('hammerfall', 1000)); return g.effects.find((f) => f.kind === 'hammerfall'); };
  const h0 = hammer({}), h1 = hammer({ ember: true });
  assert.ok(Math.abs(h1.x - (far + .5)) < 1e-6, `lands on the foe with Ember Form (${h1.x})`); assert.ok(h0.x < far, `falls short without (${h0.x})`);
  assert.ok(h1.damage > h0.damage, 'hammer damage');
});

test('the Blunderbuss is unchanged: a physical shot, its pellets read the melee stat as before; no Spellblade, no Ember Skin', () => {
  const fire = (opts) => { const { g } = arena({ secondary: blunderbuss(), ...opts }); g.fireSecondary(1000, { x: 1, y: 0 }); return g.projectiles.filter((q) => q.glyphHost === 'tool'); };
  const p = fire({}), q = fire({ ember: true }), b = fire({ spellblade: true });
  assert.ok(p.length >= 3 && p.every((x) => x.damageType === 'physical' && !x.brawler && !x.melee), 'pellets, never melee');
  assert.equal(q[0].damage - p[0].damage, 8, 'Ember Form\'s melee bonus on the physical channel, as before');
  assert.equal(b[0].damage, p[0].damage, 'Spellblade does not touch it');
});
