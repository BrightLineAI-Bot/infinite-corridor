// Less loot from monsters, every weapon and tool from the start (Tim, 2026-11-25).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, RANK_AND_FILE_LOOT, DROP_IRON, rankAndFileKill, rankAndFileGear, ordinaryMonsterGearDrop, storeInventoryItem, grantBrawlerGear, grantOrreryGear, grantMilestoneGear, velaShop } from '../src/game.ts';
import { ITEM_TABLE, BRAWLER_LOOT, ORDINARY_MONSTER_LOOT, FOURFOLD_DAGGERS, QUANDRIX_STAFF, SPARK_COIL_LOOT, ORRERY_LOOT, APERTURE_BANDS, normalizeItemUpgrade, generateItem, isValidItem } from '../src/items.ts';
import { SMITHY } from '../src/smithy.ts';
import { startJourney } from '../src/progression.ts';

// The reference pace and the incomes before this change, measured on r1058 with the real Game (a mid-game build, level 15, rare
// gear +3, pack of 20, cinder iron yield): every rank-and-file kill dropped a piece and paid 4.88 cinder iron (1 with the drop,
// the rest its salvage on arrival). The pace is the headless hunter bot's (about 300 kills an hour; Tim's 42 h journey ran at
// about 680 drops an hour).
const PACE = 300, BEFORE = { gearPerKill: 1, ironPerKill: 4.88 };
const gear = (slot: string, name: string, property: string, tier: string, power: number, rank = 0) => normalizeItemUpgrade({ id: `${slot}-kit`, name, slot, property, tier, power, upgradeRank: rank, affixes: [] });
function midBuild(seed = 'LESS-LOOT') {
  const s: any = freshSave(); s.seed = seed; s.level = 15; s.perception.aperture = APERTURE_BANDS[5].threshold;
  s.equipment.primary = gear('primary', 'Verge Cleaver', 'impact', 'rare', 16, 3); s.equipment.secondary = gear('secondary', 'Needle Caster', 'quick', 'rare', 16, 3);
  s.equipment.armor = gear('armor', 'Kiln Mantle', 'guard', 'rare', 16, 3); s.equipment.charm = gear('charm', 'Quiet Compass', 'discovery', 'rare', 16, 3);
  return s;
}
function kills(kind: string, n = 1500, seed?: string) {
  const s = midBuild(seed), g: any = new Game(s, 0), proto = g.enemies.find((e: any) => ordinaryMonsterGearDrop(e)) || g.enemies[0];
  const iron0 = s.materials.cinderIron || 0, d0 = s.consumables.restorativeDraught || 0; let drops = 0, pity = 0; const ironPerDrop: number[] = [];
  for (let i = 0; i < n; i++) {
    const e = Object.assign(structuredClone({ ...proto, id: `less-loot-${kind}-${i}` }), { hp: 0, dead: true, rewarded: false });
    if (kind === 'guardian') e.boss = true; if (kind === 'elite') Object.assign(e, { elite: true, eliteId: 'x' }); if (kind === 'dungeon') Object.assign(e, { dungeonRole: 'hunter', encounterSpawn: true });
    g.enemies.push(e); const dc = s.dropCounter, ir = s.materials.cinderIron || 0; g.defeatEnemy(e); g.enemies.pop();
    if (s.dropCounter > dc) { drops++; ironPerDrop.push((s.materials.cinderIron || 0) - ir); } else assert.equal(s.materials.cinderIron || 0, ir, 'no drop, no iron');
    pity = Math.max(pity, s.worldFlags.flaskPity || 0); s.level = 15; s.xp = 0;
  }
  return { gearPerKill: drops / n, ironPerKill: ((s.materials.cinderIron || 0) - iron0) / n, draughtsPerKill: ((s.consumables.restorativeDraught || 0) - d0) / n, pity, ironPerDrop };
}

test('the rank and file: ordinary creatures, dungeon encounter foes and respawns; not bosses, guardians, elites or champions', () => {
  assert.ok(Object.isFrozen(RANK_AND_FILE_LOOT)); const { guardianRoles, ...rates } = RANK_AND_FILE_LOOT; assert.deepEqual(rates, { version: 1, stream: 'rank-and-file-gear:v1', gear: .5, dropIron: 0, salvageShare: 1 }); // 2026-11-26: salvageShare .5 -> 1 (Tim: about 1,000 cinder iron an hour) assert.equal(DROP_IRON, 1);
  const foe = { id: 'f', kind: 'rootBrute' };
  assert.equal(rankAndFileKill(foe), true); assert.equal(rankAndFileKill({ ...foe, dungeonRole: 'hunter', encounterSpawn: true }), true); assert.equal(rankAndFileKill({ ...foe, respawned: true }), true); assert.equal(rankAndFileKill({ ...foe, dungeonRole: 'keeper' }), true, 'a room resident');
  for (const extra of [{ boss: true }, { elite: true }, { eliteId: 'x' }, { worldBeast: 'x' }, { worldBoss: true }, { questingBeast: true }, { stalker: true }, { seaKind: 'x' }, { apertureEncounter: true }, { fracRank: 'rare' }, { fracReinforcement: true }, { summonedBy: 'x' }, { noRewards: true }, { dungeonRole: 'objectiveGuardian' }, { dungeonRole: 'gateWarden' }, { dungeonRole: 'wingMiniboss' }, { dungeonRole: 'canyonWarden' }, { dungeonRole: 'finalBoss', boss: true }])
    assert.equal(rankAndFileKill({ ...foe, ...extra }), false, JSON.stringify(extra));
  // the Salvage Blade pool is unchanged: a dungeon encounter foe is still outside it
  assert.equal(ordinaryMonsterGearDrop({ ...foe, dungeonRole: 'hunter', encounterSpawn: true }), false); assert.equal(ordinaryMonsterGearDrop(foe), true);
  assert.equal(rankAndFileGear('S', 'a', 'f', 3), rankAndFileGear('S', 'a', 'f', 3), 'pure');
});

test('per hour: gear from the rank and file halves and their cinder iron falls by about three fifths (2026-11-26: was four fifths)', () => {
  for (const kind of ['ordinary', 'dungeon']) {
    const r = kills(kind);
    const gearH = r.gearPerKill * PACE, ironH = r.ironPerKill * PACE, beforeGear = BEFORE.gearPerKill * PACE, beforeIron = BEFORE.ironPerKill * PACE;
    assert.ok(r.gearPerKill > .44 && r.gearPerKill < .56, `${kind}: ${r.gearPerKill} pieces a kill`);
    assert.ok(gearH <= beforeGear * .56 && gearH >= beforeGear * .44, `${kind}: ${gearH.toFixed(0)} pieces an hour (was ${beforeGear})`);
    assert.ok(ironH <= 660 && ironH >= 480, `${kind}: ${ironH.toFixed(0)} cinder iron an hour (was ${beforeIron.toFixed(0)}; 2026-11-26: was 200-360)`);
    assert.ok(ironH <= beforeIron * .45, `${kind}: at most about two fifths of the iron (2026-11-26: was a quarter)`);
    // a drop salvaged on arrival pays its share of its salvage; only an older piece a kept drop pushes out of a full pack pays in full
    const half = Math.max(1, Math.floor(SMITHY.salvage.iron.relic * RANK_AND_FILE_LOOT.salvageShare)) + RANK_AND_FILE_LOOT.dropIron, more = r.ironPerDrop.filter((q) => q > half).length;
    assert.ok(more / r.ironPerDrop.length < .2, `${kind}: ${more} of ${r.ironPerDrop.length} drops paid more than half a relic's salvage`);
  }
});

test('bosses, guardians and elites drop and pay as before; draughts and their pity are unchanged', () => {
  for (const kind of ['guardian', 'elite']) {
    const r = kills(kind, 600);
    assert.equal(r.gearPerKill, 1, `${kind}: a piece every kill`);
    assert.ok(r.ironPerKill > 4.5, `${kind}: ${r.ironPerKill} iron a kill, as before (${BEFORE.ironPerKill})`);
    for (const q of r.ironPerDrop) assert.ok(q >= DROP_IRON, 'the drop still brings its cinder iron');
  }
  const plain = kills('ordinary'), boss = kills('guardian', 300);
  assert.ok(plain.pity <= 2, `pity never runs past 2 (${plain.pity})`); assert.ok(plain.draughtsPerKill > .46 && plain.draughtsPerKill < .58, `${plain.draughtsPerKill} draughts a kill`);
  assert.equal(boss.draughtsPerKill, 2, 'a boss leaves two draughts');
});

test('a chest piece pays DROP_IRON and its full salvage; only a rank-and-file drop pays the salvage share', () => {
  const relic = () => generateItem('LESS-LOOT:relic', 20);
  const a: any = midBuild(), b: any = midBuild();
  const item: any = relic();
  for (const s of [a, b]) { s.inventory = []; s.equipment[item.slot] = { ...item, id: 'kept', power: 999 }; }
  const full = storeInventoryItem(a, { ...item }), half = storeInventoryItem(b, { ...item }, false, RANK_AND_FILE_LOOT.salvageShare);
  assert.equal(full.stored, false); assert.equal(half.stored, false);
  const tierIron = (SMITHY.salvage.iron as any)[item.tier];
  assert.equal(full.iron, tierIron); assert.equal(half.iron, Math.max(1, Math.floor(tierIron * RANK_AND_FILE_LOOT.salvageShare))); // 2026-11-26: the share is read, not .5
  const s: any = midBuild(), g: any = new Game(s, 0); s.inventory = []; const i0 = s.materials.cinderIron || 0, n0 = s.dropCounter;
  g.obtainDrop('chest'); assert.equal(s.dropCounter, n0 + 1); assert.ok((s.materials.cinderIron || 0) - i0 >= DROP_IRON, 'a chest piece brings its cinder iron');
});

test('one-time gear gifts are unchanged: the brawler gear and the Orrery at Infinite III, the level gifts', () => {
  const at = (band: number) => { const s: any = freshSave(); s.perception.aperture = APERTURE_BANDS[band].threshold; return s; };
  assert.deepEqual(grantBrawlerGear(at(12)), []); assert.equal(grantOrreryGear(at(12)), false);
  assert.deepEqual(grantBrawlerGear(at(13)), ['Iron Fists', 'Hammerfall', 'Great Sweep']); assert.equal(grantOrreryGear(at(13)), true);
  const l: any = freshSave(); l.level = 4; assert.deepEqual(grantMilestoneGear(l), ['Cinder Pike']);
});

const WEAPONS_AND_TOOLS = [...ITEM_TABLE.primary, ...ITEM_TABLE.secondary, ...BRAWLER_LOOT.primary, ...BRAWLER_LOOT.secondary, ...ORDINARY_MONSTER_LOOT.primary, [FOURFOLD_DAGGERS.name], [QUANDRIX_STAFF.name], ...SPARK_COIL_LOOT.secondary, ...ORRERY_LOOT.secondary].map((q) => q[0]);
test('every weapon and tool kind drops at band 0, level 1, in both modes, and the Orrery can be stocked', () => {
  assert.equal(ORRERY_LOOT.band, 0); assert.equal(new Set(WEAPONS_AND_TOOLS).size, 13);
  for (const mode of [0, 1]) {
    const s: any = freshSave(); s.seed = `EVERY-KIND-${mode}`; startJourney(s, { mode }); s.level = 1; s.perception.aperture = 0; const g: any = new Game(s, 0); const seen = new Set<string>();
    for (let i = 0; i < 4000 && seen.size < WEAPONS_AND_TOOLS.length; i++) { s.inventory = []; s.keepDuplicateGear = true; g.obtainDrop(i % 2 ? 'chest' : 'rootBrute', i % 2 === 0); const it = s.inventory[0]; if (it && (it.slot === 'primary' || it.slot === 'secondary')) { assert.ok(isValidItem(it), it.name); seen.add(it.name); } }
    assert.deepEqual([...WEAPONS_AND_TOOLS].filter((n) => !seen.has(n)), [], `mode ${mode}: every weapon and tool dropped`);
  }
  const v: any = freshSave(); v.seed = 'EVERY-KIND-SHOP'; const stocked = new Set<string>();
  for (let k = 0; k < 400 && !stocked.has('Aether Orrery'); k++) { v.explored = Object.fromEntries(Array.from({ length: 4 * k + 1 }, (_, i) => [`${i},0`, true])); v.shop = null; for (const q of velaShop(v).equipment) stocked.add(q.name); }
  assert.ok(stocked.has('Aether Orrery'), 'a vendor can stock the Aether Orrery from the start');
});
