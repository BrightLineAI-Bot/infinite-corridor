// Release 303 (Tim, 2026-10-22): the Poison Crypt. Seep pools send seeplings home to the Mire Heart (a half-strength
// Morphing Blob) in its lair; each that arrives swells it; finding the lair stops the pools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExpeditionDungeon, reachableInMap, MIRE_CRYPT, rollMireCrypt, plainCrossing } from '../src/underlands.ts';
import { Game, generatePinnedDungeon, pinDungeonLayout } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { rollHorde } from '../src/revenant-horde.ts';
import { WORLD_BEASTS, beastProfileVitals } from '../src/world-beasts.ts';
import { freshSave } from '../src/types.ts';

test('the crypt: a mire lair around the Heart, seep pools, gas jets, everything reachable', () => {
  for (let i = 0; i < 12; i++) {
    const m = generateExpeditionDungeon('MIRE', `dungeon:MIRE:g1:${i}:2:x`, 'hollow', { theme: 'poisonCrypt', layoutPool: 5 });
    const heart = m.enemySpawns.find((e) => e.mireHeart); assert.ok(heart, `${i}: heart`); assert.equal(heart.kind, 'morphingBlob'); assert.equal(heart.dungeonRole, 'gateWarden');
    assert.ok(m.mireLair && m.seepPools.length >= 2, `${i}: lair and pools (${m.seepPools.length})`);
    assert.ok(m.tiles.filter((t) => t.kind === 'toxicMire').length > 40, 'a lot of mire');
    assert.ok(m.objects.some((o) => o.gas), 'gas jets');
    const seen = reachableInMap(m, m.entry); for (const o of m.objects) assert.ok(seen[o.y * m.width + o.x], `${i}: ${o.kind}`); assert.ok(seen[heart.y * m.width + heart.x]);
  }
});

test('rare, never plain, only in fresh histories, never also a horde', () => {
  let n = 0; for (let i = 0; i < 4000; i++) if (rollMireCrypt('R', `dungeon:R:g1:${i}:1:x`, 5)) { n++; assert.ok(!plainCrossing('R', `dungeon:R:g1:${i}:1:x`, 5)); }
  assert.ok(n > 30 && n < 120, `about 2% (${n}/4000)`); assert.equal(rollMireCrypt('R', 'dungeon:R:g1:1:1:x', 4), false, 'older layout pools never');
  const s = freshSave('MC'); s.seed = 'MC'; let id = null;
  for (let i = 0; i < 4000 && !id; i++) if (rollMireCrypt('MC', `dungeon:MC:g1:${i}:3:x`, 5)) id = `dungeon:MC:g1:${i}:3:x`;
  const m = generatePinnedDungeon(s, id), h = s.consequences.dungeons[id];
  assert.deepEqual(h.mire, { version: 1, merged: 0, found: false }); assert.equal(m.theme, 'poisonCrypt');
  assert.equal(rollHorde(s, id, h), null);
  const old = 'dungeon:MC:g1:9999:3:old', oh = dungeonHistory(s, old); oh.generatorVersion = 5; oh.layoutPool = 4; generatePinnedDungeon(s, old); assert.equal(oh.mire, undefined);
});

test('seeplings rise, crawl home and swell the Heart; finding the lair stops them', () => {
  const s = freshSave('MC2'); s.seed = 'MC2'; s.level = 6; let id = null;
  for (let i = 0; i < 4000 && !id; i++) if (rollMireCrypt('MC2', `dungeon:MC2:g1:${i}:3:x`, 5)) id = `dungeon:MC2:g1:${i}:3:x`;
  const g = new Game(s, 0); s.session.activeDungeonId = id; pinDungeonLayout(s, id); dungeonHistory(s, id).visits++; g.loadArea('dungeon');
  const heart = g.enemies.find((e) => e.mireHeart); assert.ok(heart);
  const full = beastProfileVitals(WORLD_BEASTS.morphingBlob, s, {}).hp; assert.ok(heart.maxHp < full * .7, `half strength (${heart.maxHp} of ${full})`);
  const lair = g.map.mireLair; g.player.x = g.map.entry.x; g.player.y = g.map.entry.y;
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  let t = 0; for (let k = 0; k < 20 * 12; k++) { g.player.hp = g.player.maxHp || 999; g.update(.05, idle, (t += 50)); }
  const seeps = g.enemies.filter((e) => e.mireSeep); assert.ok(seeps.length >= 1, 'pools sent seeplings');
  assert.ok(Math.hypot(heart.x - lair.x, heart.y - lair.y) < .01, 'the Heart waits in its lair');
  // one arrives
  const before = heart.maxHp, e = seeps[0]; e.bornAt = -1e9; e.x = heart.x + .3; e.y = heart.y; g.update(.05, idle, (t += 50)); g.update(.05, idle, (t += 50));
  assert.ok(e.merged && heart.maxHp > before, 'merging swells it'); assert.equal(dungeonHistory(s, id).mire.merged, 1);
  g.player.x = lair.x + 2; g.player.y = lair.y; g.update(.05, idle, (t += 50)); assert.equal(dungeonHistory(s, id).mire.found, true);
  const count = g.seepSeq; for (let k = 0; k < 20 * 20; k++) { g.player.hp = 999; g.update(.05, idle, (t += 50)); }
  assert.equal(g.seepSeq, count, 'no more seeplings once the lair is found');
});
