// Release 299 (Tim, 2026-10-22): more dungeon environments with their own floors and patterns (theme pool 2), only for
// dungeons generated from now on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExpeditionDungeon, reachableInMap, UNDER_THEMES, THEME_POOLS, THEME_POOL_VERSION } from '../src/underlands.ts';
import { generatePinnedDungeon } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { freshSave } from '../src/types.ts';

const NEW = ['starHive', 'geode', 'mosaic', 'rootwood', 'brass'];

test('pool 1 keeps the six old environments in their old order; pool 2 adds five', () => {
  assert.deepEqual(THEME_POOLS[1].ids, ['chasm', 'lavaBog', 'river', 'frozen', 'boneCrypt', 'fungal']);
  assert.equal(THEME_POOLS[1].chance, 45);
  for (const id of NEW) { assert.ok(UNDER_THEMES[id], id); assert.ok(THEME_POOLS[2].ids.includes(id), id); }
  const old = new Set(), now = new Set();
  for (let i = 0; i < 160; i++) {
    const id = `dungeon:POOL:${i}:${i * 5}`;
    const a = generateExpeditionDungeon('POOL', id, 'hollow'), b = generateExpeditionDungeon('POOL', id, 'hollow', { themePool: 1 });
    assert.equal(a.theme || null, b.theme || null, 'no pool is pool 1');
    old.add(a.theme || 'none'); now.add(generateExpeditionDungeon('POOL', id, 'hollow', { themePool: 2 }).theme || 'none');
  }
  assert.ok(NEW.every((t) => !old.has(t)), 'pool 1 never draws a new environment');
  assert.ok(NEW.filter((t) => now.has(t)).length >= 4, `pool 2 draws them: ${[...now]}`);
});

test('only never-generated dungeons adopt theme pool 2', () => {
  const save = freshSave('TP'); save.seed = 'TP';
  const fresh = 'dungeon:TP:0:4:2:new'; generatePinnedDungeon(save, fresh);
  assert.equal(save.consequences.dungeons[fresh].themePool, THEME_POOL_VERSION);
  const old = 'dungeon:TP:0:5:2:old'; dungeonHistory(save, old).generatorVersion = 5; dungeonHistory(save, old).layoutPool = 4; generatePinnedDungeon(save, old);
  assert.equal(save.consequences.dungeons[old].themePool, undefined, 'a dungeon generated before keeps pool 1');
  const entered = 'dungeon:TP:0:6:2:entered'; save.session.areas[entered] = { enemies: [] }; generatePinnedDungeon(save, entered);
  assert.equal(save.consequences.dungeons[entered].themePool, undefined);
});

test('each new environment is reachable, carries its decor, and every tile kind has a painter', () => {
  const decor = { starHive: ['crystalSpire', 'alienPlatform'], geode: ['geodeCluster'], mosaic: ['templePillar'], rootwood: ['rootKnot'], brass: ['brassPipe'] };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : /Gradient$/.test(String(k)) ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => ((t[k] = v), true) });
  for (const theme of NEW) for (let i = 0; i < 6; i++) {
    const map = generateExpeditionDungeon('NEWT', `dungeon:NEWT:${theme}:${i}`, 'hollow', { theme, layout: ['cavern', 'hub', 'spine'][i % 3] });
    const seen = reachableInMap(map, map.entry), w = map.width;
    for (const o of map.objects) assert.ok(seen[o.y * w + o.x], `${theme}/${i}: ${o.kind} reachable`);
    for (const e of map.enemySpawns) assert.ok(seen[Math.round(e.y) * w + Math.round(e.x)], `${theme}/${i}: ${e.kind} reachable`);
    assert.equal(map.weather, UNDER_THEMES[theme].weather);
    if (i === 0) for (const k of decor[theme]) assert.ok(map.tiles.some((t) => t.kind === k), `${theme} has ${k}`);
    for (const kind of new Set(map.tiles.map((t) => t.kind))) { const t = map.tiles.find((q) => q.kind === kind); assert.ok(drawLandscapeTile(ctx, t, t.x, t.y, 32, map.tiles, w), `${theme}: ${kind} painted`); }
  }
  const mosaic = generateExpeditionDungeon('NEWT', 'dungeon:NEWT:mosaic:q', 'hollow', { theme: 'mosaic' });
  for (const t of mosaic.tiles.filter((q) => q.kind === 'templeMosaic')) assert.equal(t.detail, (t.x & 1) + (t.y & 1) * 2, 'the rosette spans four tiles');
});
