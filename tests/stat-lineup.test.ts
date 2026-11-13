// Tim (2026-11-12, final): which stat each weapon and tool scales with. One table each (items.ts WEAPON_SCALING /
// TOOL_SCALING); game.ts scaledBonus routes every blow through it. The stamina stat is Finesse (it grows maximum stamina).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, characterStats, scaledBonus } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { WEAPON_SCALING, TOOL_SCALING, SCALING_STATS, SCALING_STRENGTH, weaponScaling, toolScaling, scalingOf, scaledGearNames } from '../src/items.ts';

const PROP = { 'Iron Fists': 'brawler', 'Salvage Blade': 'steady', 'Verge Cleaver': 'impact', 'Cinder Pike': 'reach', 'Fourfold Daggers': 'paired', 'Lumen Spindle': 'focus', 'Needle Caster': 'quick', Blunderbuss: 'quick', 'Rift Bombard': 'blast', 'Great Sweep': 'brawler', Hammerfall: 'brawler', 'Aether Orrery': 'orrery', 'Spark Coil': 'focus', Carbine: 'focus' };
const item = (name, slot, power = 15) => ({ id: `${slot}-sl-${name.replace(/ /g, '')}`, name, slot, power: power + (name === 'Blunderbuss' ? 6 : 0), basePower: power, upgradeRank: name === 'Blunderbuss' ? 6 : 0, property: PROP[name], tier: 'rare', affixes: [] });
const LINEUP = {
  weapons: { 'Iron Fists': 'might', 'Verge Cleaver': 'might', 'Cinder Pike': 'stamina', 'Fourfold Daggers': 'stamina', 'Salvage Blade': 'magic' },
  tools: { 'Aether Orrery': 'magic', 'Lumen Spindle': 'magic', 'Needle Caster': 'stamina', Blunderbuss: 'stamina', Carbine: 'stamina' /* 2026-11-12: the Spark Coil at +6 */, 'Great Sweep': 'might', 'Rift Bombard': 'might' },
};
// Reference builds at level 15 (14 points): heavy builds put 10 into one stat and 4 into Vigor.
const BUILDS = { might: { Might: 11, Finesse: 1, Focus: 1, Vigor: 5, Resolve: 1 }, magic: { Might: 1, Finesse: 1, Focus: 11, Vigor: 5, Resolve: 1 }, stamina: { Might: 1, Finesse: 11, Focus: 1, Vigor: 5, Resolve: 1 }, balanced: { Might: 4, Finesse: 4, Focus: 4, Vigor: 6, Resolve: 1 } };
function arena(build, primary = 'Salvage Blade', tool = 'Needle Caster', level = 15) {
  const s = freshSave(); s.seed = 'STAT-LINEUP'; s.level = level; s.stats = { ...BUILDS[build] };
  s.equipment.primary = item(primary, 'primary', level); s.equipment.secondary = item(tool, 'secondary', level);
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 10.9, 10), { id: 'foe-0', hp: 1e6, maxHp: 1e6 })];
  return { s, g, e: g.enemies[0] };
}
const step = (g, ms, from) => { for (let t = 0; t < ms; t += 50) g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, from + t); };
// The damage one press (or shot) deals in the arena, as the game measures it.
function dealt(build, kind, name) {
  if (kind === 'weapon') {
    const a = arena(build, name);
    if (name === 'Iron Fists') return a.g.fistPower();
    a.g.primaryAttack(1000, { x: 1, y: 0 }); step(a.g, 300, 1000); return 1e6 - a.e.hp;
  }
  const a = arena(build, 'Salvage Blade', name);
  if (name === 'Great Sweep' || name === 'Hammerfall') return a.g.toolPower();
  if (name === 'Aether Orrery') return a.g.orreryPower();
  a.e.x = 12; a.s.materials.cinderIron = 99; a.g.fireSecondary(1000, { x: 1, y: 0 }); step(a.g, 1500, 1000); return 1e6 - a.e.hp;
}
// Run `fn` with the scaling tables set as they were before this decision (everything on its damage type's own stat).
function withOldTables(fn) {
  const w = { ...WEAPON_SCALING }, t = { ...TOOL_SCALING };
  Object.assign(WEAPON_SCALING, { 'salvage-blade': 'might', 'cinder-pike': 'might', 'fourfold-daggers': 'might' });
  Object.assign(TOOL_SCALING, { 'needle-caster': 'might', blunderbuss: 'might' });
  try { return fn(); } finally { Object.assign(WEAPON_SCALING, w); Object.assign(TOOL_SCALING, t); }
}

test('the stamina stat is Finesse: it grows maximum stamina, and the table names it', () => {
  const s = freshSave(), base = characterStats(s).maxStamina; s.stats.Finesse = 11;
  assert.equal(characterStats(s).maxStamina, base + 30);
  assert.deepEqual(SCALING_STATS, { might: 'Might', magic: 'Focus', stamina: 'Finesse' });
  assert.deepEqual(SCALING_STRENGTH, { melee: 2, magic: 1 }, 'a stamina weapon gains 2 a rank, as Might always gave a melee blow');
});

test('Tim\'s lineup: every listed weapon and tool reads its stat from one table', () => {
  for (const [name, stat] of Object.entries(LINEUP.weapons)) assert.equal(weaponScaling(item(name, 'primary')), stat, name);
  for (const [name, stat] of Object.entries(LINEUP.tools)) assert.equal(toolScaling(item(name, 'secondary')), stat, name);
  assert.equal(toolScaling({ name: 'Needle Caster', slot: 'secondary', upgradeRank: 6, power: 12 }), 'stamina', 'a Needle Caster at +6 (the Blunderbuss) too');
  assert.equal(scalingOf(item('Rift Bombard', 'secondary')), 'might'); assert.equal(scalingOf(null), null);
  assert.equal(toolScaling({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', upgradeRank: 6, power: 9 }), 'stamina', 'a Spark Coil at +6 (the Carbine) is stamina');
  assert.equal(toolScaling({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', upgradeRank: 5, power: 8 }), 'magic', 'below the rank it is still a magic Spark Coil');
  assert.deepEqual(scaledGearNames('stamina'), ['Cinder Pike', 'Fourfold Daggers', 'Needle Caster', 'Blunderbuss', 'Carbine']);
  assert.deepEqual(scaledGearNames('magic'), ['Salvage Blade', 'Quandrix Staff', 'Aether Orrery', 'Lumen Spindle', 'Spark Coil']);
});

test('each weapon and tool grows with its own stat and no other', () => {
  const rows = [...Object.entries(LINEUP.weapons).map(([n, s]) => ['weapon', n, s]), ...Object.entries(LINEUP.tools).map(([n, s]) => ['tool', n, s])];
  for (const [kind, name, stat] of rows) {
    const own = dealt(stat, kind, name);
    for (const other of ['might', 'magic', 'stamina'].filter((q) => q !== stat))
      assert.ok(own > dealt(other, kind, name) * 1.2, `${name}: its own stat (${stat}) ${own} beats ${other} ${dealt(other, kind, name)}`);
  }
});

test('switching the table switches the stat', () => {
  const s = freshSave(); s.level = 15; s.stats = { ...BUILDS.might }; s.equipment.primary = item('Salvage Blade', 'primary');
  const focusRead = scaledBonus(s, weaponScaling(s.equipment.primary), 'melee');
  const prior = WEAPON_SCALING['salvage-blade'];
  try { WEAPON_SCALING['salvage-blade'] = 'might'; assert.equal(scaledBonus(s, weaponScaling(s.equipment.primary), 'melee'), characterStats(s).meleeBonus, 'on Might it reads the old melee bonus'); assert.equal(characterStats(s).weaponBonus, characterStats(s).meleeBonus); }
  finally { WEAPON_SCALING['salvage-blade'] = prior; }
  assert.equal(characterStats(s).meleeBonus - focusRead, 20, 'on Focus a Might-10 build loses its 20 Might bonus');
  assert.equal(characterStats(s).weaponBonus, focusRead, 'the boss references (characterStats.weaponBonus) follow the weapon');
});

test('power stays where it was: the matched build hits as the old Might build did, a balanced build is unchanged', () => {
  const rows = [['weapon', 'Salvage Blade', 'magic'], ['weapon', 'Cinder Pike', 'stamina'], ['tool', 'Needle Caster', 'stamina'], ['tool', 'Blunderbuss', 'stamina'], ['weapon', 'Verge Cleaver', 'might'], ['tool', 'Rift Bombard', 'might'], ['tool', 'Great Sweep', 'might'], ['tool', 'Lumen Spindle', 'magic']];
  for (const [kind, name, stat] of rows) {
    const oldMight = withOldTables(() => dealt(kind === 'tool' && stat === 'magic' ? 'magic' : 'might', kind, name)), now = dealt(stat, kind, name);
    assert.ok(Math.abs(now - oldMight) <= Math.max(1, oldMight * .02), `${name}: ${stat} build now ${now}, old matched build ${oldMight}`);
    const oldBalanced = withOldTables(() => dealt('balanced', kind, name)), nowBalanced = dealt('balanced', kind, name);
    assert.ok(Math.abs(nowBalanced - oldBalanced) <= 1, `${name}: balanced ${oldBalanced} -> ${nowBalanced}`);
  }
});

test('a fresh Wayfarer (every stat at 1) deals exactly what it did', () => {
  for (const name of ['Salvage Blade', 'Cinder Pike']) {
    const s = freshSave(); s.equipment.primary = item(name, 'primary', 6);
    assert.equal(characterStats(s).weaponBonus, characterStats(s).meleeBonus, name);
  }
  const s = freshSave(); s.equipment.secondary = item('Needle Caster', 'secondary', 6); const g = new Game(s, 0);
  assert.equal(g.toolBonus('melee'), characterStats(s).meleeBonus);
});
