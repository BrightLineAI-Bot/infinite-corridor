// Cinder iron about 1,000 an hour (Tim, 2026-11-26: "the target income is about 1,000 cinder iron per hour of play instead of the
// current ~700"; round and shot costs unchanged, elites keep dropping as now). The rank and file's drop salvaged on arrival pays
// its full salvage again (game.ts RANK_AND_FILE_LOOT.salvageShare .5 -> 1). Measured with the real Game's defeatEnemy, as in
// tests/less-loot.test.ts, at the headless hunter's pace of about 300 rank-and-file kills an hour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, RANK_AND_FILE_LOOT, DROP_IRON, ordinaryMonsterGearDrop } from '../src/game.ts';
import { normalizeItemUpgrade, APERTURE_BANDS } from '../src/items.ts';
import { SMITHY } from '../src/smithy.ts';
import { ROUNDS } from '../src/tool-forms.ts';

const PACE = 300;
// Before (r1070, salvageShare .5), measured by the same harness: about 1.0 iron a rank-and-file kill mid game (about 300 an
// hour); the other sources (elites, bosses, chests, caches) made up the rest of Tim's ~700 an hour and are unchanged.
const BEFORE = { rankAndFilePerHour: 302, totalPerHour: 700 }, OTHER = BEFORE.totalPerHour - BEFORE.rankAndFilePerHour;
const gear = (slot: string, name: string, property: string, tier: string, power: number, rank = 0) => normalizeItemUpgrade({ id: `${slot}-kit`, name, slot, property, tier, power, upgradeRank: rank, affixes: [] });
function midBuild(seed: string) {
  const s: any = freshSave(); s.seed = seed; s.level = 15; s.perception.aperture = APERTURE_BANDS[5].threshold;
  s.equipment.primary = gear('primary', 'Verge Cleaver', 'impact', 'rare', 16, 3); s.equipment.secondary = gear('secondary', 'Needle Caster', 'quick', 'rare', 16, 3);
  s.equipment.armor = gear('armor', 'Kiln Mantle', 'guard', 'rare', 16, 3); s.equipment.charm = gear('charm', 'Quiet Compass', 'discovery', 'rare', 16, 3);
  return s;
}
function ironPerKill(kind: string, n: number, seed = 'IRON-1000') {
  const s = midBuild(`${seed}-${kind}`), g: any = new Game(s, 0), proto = g.enemies.find((e: any) => ordinaryMonsterGearDrop(e)) || g.enemies[0];
  const iron0 = s.materials.cinderIron || 0, n0 = s.dropCounter;
  for (let i = 0; i < n; i++) {
    const e = Object.assign(structuredClone({ ...proto, id: `iron-1000-${kind}-${i}` }), { hp: 0, dead: true, rewarded: false });
    if (kind === 'elite') Object.assign(e, { elite: true, eliteId: 'x' }); if (kind === 'dungeon') Object.assign(e, { dungeonRole: 'hunter', encounterSpawn: true });
    g.enemies.push(e); g.defeatEnemy(e); g.enemies.pop(); s.level = 15; s.xp = 0;
  }
  return { iron: ((s.materials.cinderIron || 0) - iron0) / n, drops: (s.dropCounter - n0) / n };
}

test('the numbers: full salvage for a rank-and-file drop; gear per kill, the drop iron and every cost unchanged', () => {
  assert.equal(RANK_AND_FILE_LOOT.salvageShare, 1); assert.equal(RANK_AND_FILE_LOOT.gear, .5); assert.equal(RANK_AND_FILE_LOOT.dropIron, 0); assert.equal(DROP_IRON, 1);
  assert.deepEqual(ROUNDS.iron, { base: 2, perEcho: 1, echoCap: 2 }, 'round and shot costs unchanged');
  assert.deepEqual(SMITHY.salvage.iron, { common: 1, rare: 2, epic: 3, relic: 4 }, 'salvage tables unchanged');
});

test('per hour: the rank and file pay about 600 (was about 300), so the total comes to about 1,000', () => {
  for (const kind of ['ordinary', 'dungeon']) {
    const r = ironPerKill(kind, 2000), perHour = r.iron * PACE, total = perHour + OTHER;
    assert.ok(r.drops > .44 && r.drops < .56, `${kind}: ${r.drops} pieces a kill, unchanged`);
    assert.ok(perHour >= BEFORE.rankAndFilePerHour * 1.7 && perHour <= BEFORE.rankAndFilePerHour * 2.2, `${kind}: ${perHour.toFixed(0)} an hour (was ${BEFORE.rankAndFilePerHour})`);
    assert.ok(total >= 900 && total <= 1100, `${kind}: about 1,000 an hour in all (${total.toFixed(0)})`);
  }
});

test('elites drop and pay exactly as before', () => {
  const r = ironPerKill('elite', 400);
  assert.equal(r.drops, 1, 'a piece every kill');
  assert.ok(r.iron > 4.2 && r.iron < 5, `${r.iron} iron an elite (was about 4.4-4.6 by seed; an elite never took the share)`);
});
