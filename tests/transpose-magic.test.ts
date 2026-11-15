// Transpose buffs all magic damage (Tim, 2026-11-14: "Transpose should buff magic damage. So it should buff the Carbine, since
// that does magic damage, and other weapons that do magic damage. It shouldn't just be spells and skills. It should be all magic
// damage."). weapon-arts.ts MAGIC_DAMAGE_SOURCES lists every magic source with the one route the seal's bonus takes to it:
// armor's Spell Damage (game.ts armorGlyphBonus) or, for the Quandrix Staff, which scales with armor attack damage, its own
// (transposeMagic in game.ts quandrixPower). Physical damage is never buffed, and nothing is buffed twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade, CARBINE_RANK, RANGED_WEAPONS } from '../src/items.ts';
import { QUANDRIX } from '../src/quandrix-staff.ts';
import { ORRERY } from '../src/tool-forms.ts';
import { WEAPON_ARTS, MAGIC_DAMAGE_SOURCES, transposeBonus, transposeMagic, weaponArtsState } from '../src/weapon-arts.ts';
import { TOOL_FORMS } from '../src/lattice-fields.ts';

const BONUS = WEAPON_ARTS.arts.transpose.spellDamage, W = 40, DT = .05;
const PRIMARY = {
  'salvage-blade': () => ({ id: 'primary-sb-test', name: 'Salvage Blade', slot: 'primary', power: 10, property: 'steady', tier: 'rare', affixes: [] }),
  'quandrix-staff': () => ({ id: 'primary-qs-test', name: 'Quandrix Staff', slot: 'primary', power: 10, property: 'arcane', tier: 'rare', affixes: [] }),
};
const TOOL = {
  carbine: () => normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + CARBINE_RANK, upgradeRank: CARBINE_RANK }),
  'spark-coil': () => normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 16, upgradeRank: 2 }),
  'lumen-spindle': () => normalizeItemUpgrade({ id: 'secondary-lumen-spindle', name: 'Lumen Spindle', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], power: 20, upgradeRank: 4 }),
  'aether-orrery': () => ({ ...ORRERY.item, tier: 'relic' }),
  blunderbuss: () => normalizeItemUpgrade({ id: 'secondary-blunderbuss', name: 'Blunderbuss', slot: 'secondary', property: 'impact', tier: 'relic', affixes: [], power: 20, upgradeRank: 4 }),
  'needle-caster': () => normalizeItemUpgrade({ id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', property: 'reach', tier: 'relic', affixes: [], power: 20, upgradeRank: 4 }),
  hammerfall: () => normalizeItemUpgrade({ id: 'secondary-hammerfall', name: 'Hammerfall', slot: 'secondary', property: 'impact', tier: 'relic', affixes: [], power: 20, upgradeRank: 4 }),
};
const input = () => ({ state: { x: 0, y: 0 }, consume: () => false, held: () => false });
// An open room; the Wayfarer at (3, 9.55); strong stats so rounding is small against the damage. `seal`: standing in Transpose's
// seal (the runtime game.weaponArts the Salvage Blade's art makes; placed directly, as the art's release does).
function arena({ seal = false, primary = 'salvage-blade', tool = 'carbine', foes = [] } = {}) {
  const s = freshSave(); s.seed = 'TRANSPOSE-MAGIC'; s.level = 30; s.perception.aperture = 3255; s.farArray = { listeners: 1 };
  Object.assign(s.stats, { Finesse: 40, Focus: 40, Might: 40 });
  s.equipment.primary = PRIMARY[primary](); s.equipment.secondary = tool ? TOOL[tool]() : null; s.activeWeaponSlot = 'secondary';
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6, invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: 'foe' + i, hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, speedMultiplier: 1e-6, aggro: false, meleePatterns: [] }));
  if (seal) { const K = weaponArtsState(g); K.where = g.orreryWhere(); Object.assign(K.seal, { on: true, x: 3.5, y: 10, left: WEAPON_ARTS.arts.transpose.cap }); }
  const clock = { t: 1000 }; step(g, clock);
  assert.equal(!!transposeBonus(s), seal, seal ? 'standing in the seal' : 'no seal');
  return { s, g, clock };
}
function step(g, clock, n = 1) { for (let i = 0; i < n; i++) { clock.t += DT * 1000; g.update(DT, input(), clock.t); g.player.x = 3; g.player.y = 9.55; } }
// `with / without` is the seal's 1 + bonus, within the rounding of an integer damage of `without`.
function scaled(withSeal, without, what) {
  assert.ok(without > 20, `${what}: a damage big enough to measure (${without})`);
  assert.ok(Math.abs(withSeal - without * (1 + BONUS)) <= 1 + without * 1e-9 + 1, `${what}: x${1 + BONUS} (${without} -> ${withSeal})`);
}
const same = (a, b, what) => assert.equal(a, b, `${what}: unchanged (${b} -> ${a})`);
const newShots = (g, before) => g.projectiles.filter((p) => !before.has(p) && !p.echo && !p.shadow);
function toolShot(seal, tool) {
  const { g, clock } = arena({ seal, tool }), before = new Set(g.projectiles);
  if (tool === 'carbine') assert.ok(g.carbineFire(clock.t, { x: 1, y: 0 }, 0)); else { g.fireSecondary(clock.t, { x: 1, y: 0 }); step(g, clock, 3); }
  const shot = newShots(g, before)[0]; assert.ok(shot, `${tool}: a shot`); return shot;
}
function spellDamage(seal, id) {
  const { g } = arena({ seal, tool: null }), before = new Set(g.effects), shots = new Set(g.projectiles);
  assert.ok(g.castSpell(id), `${id} casts`);
  const fx = g.effects.find((f) => !before.has(f) && !f.echo), p = g.projectiles.find((q) => !shots.has(q));
  return (fx || p).damage;
}

test('the table: every magic tool and the magic primary, each with exactly one route', () => {
  const magicTools = Object.keys(RANGED_WEAPONS).filter((k) => RANGED_WEAPONS[k].damageType === 'magic').sort();
  const listed = Object.keys(MAGIC_DAMAGE_SOURCES).filter((k) => RANGED_WEAPONS[k]).sort();
  assert.deepEqual(listed, magicTools, 'the magic tools are exactly the RANGED_WEAPONS profiles of damageType magic');
  assert.ok(magicTools.includes('secondary-carbine'), 'the Carbine is magic');
  for (const k of Object.keys(RANGED_WEAPONS)) if (RANGED_WEAPONS[k].damageType === 'physical') assert.equal(MAGIC_DAMAGE_SOURCES[k], undefined, `${k} is physical`);
  assert.equal(QUANDRIX.damageType, 'magic'); assert.equal(MAGIC_DAMAGE_SOURCES['quandrix-staff'], 'own');
  for (const [k, route] of Object.entries(MAGIC_DAMAGE_SOURCES)) assert.ok(route === 'spell-damage' || route === 'own', `${k}: one route (${route})`);
  assert.ok(Object.isFrozen(MAGIC_DAMAGE_SOURCES));
  assert.equal(BONUS, .25, 'the seal\'s own percentage is unchanged');
  assert.match(TOOL_FORMS.transpose.text, /all your magic damage is 25% greater/);
  assert.match(TOOL_FORMS.transpose.text, /Carbine/);
});

test('with Transpose the Carbine deals (1 + bonus) x, at the shot and where it lands', () => {
  scaled(toolShot(true, 'carbine').damage, toolShot(false, 'carbine').damage, 'Carbine beam');
  const lost = (seal) => { const { g, clock } = arena({ seal, foes: [[9, 9.55]] }); assert.ok(g.carbineFire(clock.t, { x: 1, y: 0 }, 0)); step(g, clock, 20); return 1e9 - g.enemies[0].hp; };
  const a = lost(true), b = lost(false); assert.ok(b > 0, 'the beam lands'); scaled(a, b, 'Carbine hit on a foe');
});

test('with Transpose every other magic tool and the Quandrix Staff deal (1 + bonus) x', () => {
  for (const tool of ['spark-coil', 'lumen-spindle']) scaled(toolShot(true, tool).damage, toolShot(false, tool).damage, tool);
  const orrery = (seal) => arena({ seal, tool: 'aether-orrery' }).g.orreryPower();
  assert.ok(Math.abs(orrery(true) / orrery(false) - (1 + BONUS)) < 1e-9, 'Aether Orrery');
  const staff = (seal) => arena({ seal, primary: 'quandrix-staff', tool: null }).g;
  const a = staff(true), b = staff(false);
  assert.ok(Math.abs(a.quandrixPower() / b.quandrixPower() - (1 + BONUS)) < 1e-9, 'Quandrix Staff');
  assert.equal(a.meleePower(), b.meleePower(), 'only through its own route: armor attack damage is untouched');
  assert.equal(transposeMagic(a.save, 'quandrix-staff'), BONUS); assert.equal(transposeMagic(b.save, 'quandrix-staff'), 0);
  assert.equal(transposeMagic(a.save, 'secondary-carbine'), 0, 'a Spell Damage source never adds it a second time');
  const hit = (g) => { const clock = { t: 2000 }; g.enemies = [Object.assign(createCombatant('rootBrute', 5, 9.55), { id: 'q', hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99 })]; g.quandrixBlow(g.enemies[0], g.quandrixPower(), clock.t); return 1e9 - g.enemies[0].hp; };
  scaled(hit(a), hit(b), 'Quandrix blow on a foe');
});

test('with Transpose spells, Imbue Weapon and dodge bursts deal (1 + bonus) x, and only once', () => {
  for (const id of ['ember-ring', 'cinder-dart', 'grave-sun', 'fire-burst']) {
    const a = spellDamage(true, id), b = spellDamage(false, id); scaled(a, b, id);
    assert.ok(a < b * (1 + BONUS) * (1 + BONUS) - 2, `${id}: not doubled (${b} -> ${a})`);
  }
  const imbue = (seal) => { const { g, clock } = arena({ seal }); g.imbueUntil = 1e15; return g.imbueBonus(clock.t); };
  assert.ok(Math.abs(imbue(true) / imbue(false) - (1 + BONUS)) < 1e-9, 'Imbue Weapon');
  const burst = (seal) => arena({ seal }).g.dodgeBurst(10, 10, 1.6, 20);
  scaled(burst(true), burst(false), 'dodge burst');
});

test('physical damage is unchanged by Transpose', () => {
  for (const tool of ['blunderbuss', 'needle-caster']) same(toolShot(true, tool).damage, toolShot(false, tool).damage, tool);
  const a = arena({ seal: true, tool: 'hammerfall' }).g, b = arena({ seal: false, tool: 'hammerfall' }).g;
  same(a.meleePower(), b.meleePower(), 'Salvage Blade swing'); same(a.toolPower(), b.toolPower(), 'Hammerfall / golem'); same(a.artPower(), b.artPower(), 'weapon arts');
  const swing = (seal) => { const { g, clock } = arena({ seal, foes: [[4.2, 9.55]] }); g.save.activeWeaponSlot = 'primary'; g.primaryAttack(clock.t, { x: 1, y: 0 }); step(g, clock, 12); return 1e9 - g.enemies[0].hp; };
  const x = swing(true), y = swing(false); assert.ok(y > 0, 'the swing lands'); same(x, y, 'a Salvage Blade hit on a foe');
});

test('without Transpose everything is as it was: no bonus and no seal state', () => {
  const plain = (fn) => { const s = freshSave(); s.seed = 'TRANSPOSE-MAGIC'; s.level = 30; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; Object.assign(s.stats, { Finesse: 40, Focus: 40, Might: 40 }); s.equipment.primary = PRIMARY['quandrix-staff'](); s.equipment.secondary = TOOL['aether-orrery'](); return fn(new Game(s, 0)); };
  // a game that never had weapon arts at all, and one whose arts state exists with no seal: the same numbers
  const { g } = arena({ seal: false, primary: 'quandrix-staff', tool: 'aether-orrery' });
  assert.equal(transposeBonus(g.save), null); assert.equal(transposeMagic(g.save, 'quandrix-staff'), 0);
  assert.equal(g.quandrixPower(), plain((h) => h.quandrixPower())); assert.equal(g.orreryPower(), plain((h) => h.orreryPower()));
  assert.equal(g.quandrixPower(), g.meleePower(), 'the staff is its melee power, as before');
  for (const id of Object.keys(MAGIC_DAMAGE_SOURCES)) assert.equal(transposeMagic(null, id), 0);
  // the seal fades: out of it and past the linger, the Carbine is back to its plain damage
  const { g: f, clock } = arena({ seal: true }), base = toolShot(false, 'carbine').damage;
  f.player.x = 12; for (let i = 0; i < Math.round((WEAPON_ARTS.arts.transpose.linger + .3) / DT); i++) { clock.t += DT * 1000; f.update(DT, input(), clock.t); f.player.x = 12; f.player.y = 9.55; }
  assert.equal(transposeBonus(f.save), null, 'faded');
  const before = new Set(f.projectiles); assert.ok(f.carbineFire(clock.t, { x: 1, y: 0 }, 0)); assert.equal(newShots(f, before)[0].damage, base);
});
