// World caches (Tim, 2026-11-11: "an item somewhere in the dungeon — underneath a corpse, or underneath a throne, or behind a
// lever you pull"; some on ledges or at the top of a climb). world.ts WORLD_CACHES: placed at load, only in crossings first
// entered and sections first seen from version 1, rolled from the seed and the place, taken once (worldFlags).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, generatePinnedDungeon } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { WORLD_CACHES, placeWorldCaches, cacheDungeonAllowed, cachePlan, cacheLoot, grantCacheLoot, cacheFlag, cacheLeverFlag, validCachePin, dungeonId } from '../src/world.ts';
import { SEEDS } from '../src/skylands.ts';
import { validActions } from '../src/interactions.ts';
import { reachableFrom, canReturnTo } from '../src/landscape.ts';

const reload = (g, now = 1000) => new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(now)))), now);
const caches = (g) => g.map.objects.filter((o) => o.kind === 'worldCache' || o.kind === 'cacheLever');
const plain = (list) => JSON.parse(JSON.stringify(list));
function game(seed = 'CACHE1') { const s = freshSave(); s.seed = seed; return new Game(s, 0); }
function enterDungeon(g, rx, ry) {
  g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const d = g.map.objects.find((o) => o.kind === 'dungeon' && !o.dungeonType); if (!d) return null;
  const s = g.save, id = dungeonId(s.seed, s.worldGeneration, rx, ry, d.id);
  s.session.dungeonReturn = { rx, ry, x: d.x, y: d.y + 1 }; s.session.activeDungeonId = id; g.loadArea('dungeon'); return id;
}
function leave(g) { g.save.session.activeDungeonId = null; g.area = 'overworld'; }
const stand = (g, o) => { Object.assign(g.player, { x: o.x, y: o.y }); g.sync?.(); };

test('the tables: every loot item can be given, rarity rises from corpse to throne to alcove, plans are rare and pure', () => {
  assert.equal(WORLD_CACHES.version, 1);
  const seedShare = (tier) => { const L = WORLD_CACHES.loot[tier], all = L.reduce((n, e) => n + e[2], 0); return L.filter((e) => e[0].startsWith('seed:')).reduce((n, e) => n + e[2], 0) / all; };
  assert.ok(seedShare('common') < .05 && seedShare('common') < seedShare('fine') && seedShare('fine') < seedShare('rare') && seedShare('rare') <= .3, 'seeds: uncommon, likelier the harder the spot');
  const kinds = new Set(Object.values(WORLD_CACHES.loot).flat().filter((e) => e[0].startsWith('seed:')).map((e) => e[0].slice(5)));
  assert.deepEqual([...kinds].sort(), [...SEEDS.kinds].sort(), 'fossilized, opal, pumice and crimson seeds all turn up');
  for (const tier of Object.values(WORLD_CACHES.loot)) for (const [item, count] of tier) {
    const s = freshSave(); assert.ok(grantCacheLoot(s, { item, count }), item);
    if (item.startsWith('seed:')) assert.equal(s.seedPouch[item.slice(5)], count);
    else if (item === 'returnEmber') assert.equal(s.theDeep.embers, count);
    else if (item === 'marks') assert.equal(s.currency, (freshSave().currency || 0) + count);
    else assert.equal(s.consumables[item], (freshSave().consumables[item] || 0) + count);
  }
  assert.equal(grantCacheLoot(freshSave(), { item: 'nothing', count: 1 }), false);
  for (const scope of ['dungeon', 'overworld']) {
    const C = WORLD_CACHES[scope]; let n = 0;
    for (let k = 0; k < 4000; k++) { const p = cachePlan('RATE', scope, `k${k}`); assert.deepEqual(p, cachePlan('RATE', scope, `k${k}`)); n += p.length > 0; for (const q of p) assert.ok(C.spots.some(([s]) => s === q.spot)); }
    assert.ok(Math.abs(n / 4000 - C.chance) < .03, `${scope}: ${n} of 4000`);
  }
  assert.deepEqual(cacheLoot('A', 'k', 0, 'throne'), cacheLoot('A', 'k', 0, 'throne'));
});

test('a dungeon floor is given the same caches on two fresh loads; old crossings and excluded runs get none', () => {
  const a = game(), b = game(); enterDungeon(a, 3, -6); enterDungeon(b, 3, -6);
  assert.ok(caches(a).length >= 2); assert.deepEqual(plain(caches(a)), plain(caches(b)), 'deterministic');
  for (const run of ['skyland:S:1,1:m0:t0:r1', 'far-array:S:1', 'the-deep:S:4:4:f3', 'hunt-instance:x', 'arena:v1:S:9,9', 'dungeon:S:g1:1:1:x:aperture-annex']) assert.equal(cacheDungeonAllowed(run, a.map), false, run);
  assert.equal(cacheDungeonAllowed(a.save.session.activeDungeonId, a.map), true);
  const id = a.save.session.activeDungeonId, h = a.save.consequences.dungeons[id];
  assert.equal(h.cacheVersion, 1); assert.ok(Array.isArray(h.caches[id]) && h.caches[id].every(validCachePin), 'where they lie is kept');
  // A crossing entered before world caches (no cacheVersion, a visit on its history) is pinned 0 and stays as it was.
  const old = game(); old.rx = 3; old.ry = -6; old.loadArea('overworld'); const s = old.save; s.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 1, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false };
  enterDungeon(old, 3, -6); assert.equal(s.consequences.dungeons[id].cacheVersion, 0); assert.equal(caches(old).length, 0);
  // The same crossing pinned 0 (every other pin as a fresh one): the generator's own output is byte-identical, and the loaded
  // floor is the same tile for tile and object for object, apart from the caches laid over it.
  const zero = game(); zero.rx = 3; zero.ry = -6; zero.loadArea('overworld');
  zero.save.consequences.dungeons[id] = { discovered: true, bypassed: false, visits: 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false, cacheVersion: 0 };
  enterDungeon(zero, 3, -6); assert.equal(caches(zero).length, 0);
  const strip = (m) => JSON.stringify({ tiles: m.tiles, objects: m.objects, enemySpawns: m.enemySpawns, entry: m.entry });
  const g0 = structuredClone(zero.save), g1 = structuredClone(a.save);
  assert.equal(strip(generatePinnedDungeon(g0, id)), strip(generatePinnedDungeon(g1, id)), 'byte-identical floors, pinned or not');
  assert.equal(JSON.stringify(zero.map.tiles), JSON.stringify(a.map.tiles));
  assert.deepEqual(a.map.objects.filter((o) => !caches(a).includes(o)).map((o) => o.id), zero.map.objects.map((o) => o.id));
});

test('sections: only ground first seen from now on; the rest of the section is untouched; caches never move', () => {
  const a = game(); a.rx = 9; a.ry = 4; a.loadArea('overworld');
  const key = '9,4', here = caches(a); assert.equal(a.save.atlas[key].cacheVersion, 1); assert.equal(here.length, 1); assert.equal(here[0].spot, 'ledge');
  const b = game(); b.rx = 9; b.ry = 4; b.loadArea('overworld'); assert.deepEqual(plain(caches(b)), plain(here), 'deterministic');
  // Seen before world caches: the same Atlas entry without the pin holds none, and the section is otherwise the same.
  const c = game(); c.save.atlas[key] = structuredClone(a.save.atlas[key]); delete c.save.atlas[key].cacheVersion; delete c.save.atlas[key].caches;
  c.rx = 9; c.ry = 4; c.loadArea('overworld'); assert.equal(caches(c).length, 0); assert.equal(c.save.atlas[key].cacheVersion, undefined);
  assert.equal(JSON.stringify(c.map.tiles), JSON.stringify(a.map.tiles));
  // Coming back after the world around it changed (a cue added beside it) leaves it where it lay.
  a.rx = 10; a.ry = 4; a.loadArea('overworld'); a.save.worldFlags.something = true;
  a.rx = 9; a.ry = 4; a.loadArea('overworld'); assert.deepEqual(plain(caches(a)), plain(here));
  // With its pins the same ground lays it where it lay even with something new beside it; without them it would be refitted.
  const pins = structuredClone(a.save.atlas[key].caches), m = structuredClone(a.map); m.objects = m.objects.filter((o) => o.kind !== 'worldCache'); m.objects.push({ id: 'beside', kind: 'rock', x: here[0].x + 1, y: here[0].y });
  const kept = placeWorldCaches(m, a.save, 'overworld', key, pins); assert.deepEqual([kept[0].x, kept[0].y], [here[0].x, here[0].y]); assert.deepEqual(kept.pins, pins);
  const m2 = structuredClone(m); m2.objects = m2.objects.filter((o) => o.kind !== 'worldCache'); const refit = placeWorldCaches(m2, a.save, 'overworld', key);
  assert.ok(refit.every((o) => Math.max(Math.abs(o.x - (here[0].x + 1)), Math.abs(o.y - here[0].y)) > 1), 'unpinned, nothing is laid against another thing');
});

test('a find is taken once: given, kept through a reload, never given again', () => {
  const g = game(); enterDungeon(g, 16, -6);
  const o = caches(g).find((q) => q.spot === 'throne'); assert.ok(o, 'a throne'); assert.equal(o.item, 'seed:crimson');
  assert.deepEqual(validActions(o, g.save), ['take']);
  stand(g, o); const r = g.interact(null, o.id); assert.ok(r.ok, r.message); assert.match(r.message, /beneath the throne/i);
  assert.equal(g.save.seedPouch.crimson, 1); assert.equal(g.save.worldFlags[cacheFlag(o.cacheKey, o.cacheIndex)], true);
  assert.equal(o.state, 'used'); assert.deepEqual(validActions(o, g.save), []);
  assert.ok(g.save.narrative.journal.some((j) => j.recordId === 'seed:crimson'));
  const again = g.interact('take', o.id); assert.equal(again.ok, false); assert.equal(g.save.seedPouch.crimson, 1);
  const back = reload(g), q = caches(back).find((c) => c.id === o.id); assert.ok(q); assert.equal(q.state, 'used');
  stand(back, q); assert.equal(back.interact('take', q.id).ok, false); assert.equal(back.save.seedPouch.crimson, 1, 'never twice');
  // Left and entered again: still taken.
  const id = g.save.session.activeDungeonId; leave(g); g.save.session.activeDungeonId = id; g.loadArea('dungeon');
  assert.equal(caches(g).find((c) => c.id === o.id).state, 'used');
});

test('a barred alcove opens only when its lever is pulled; the lever stays pulled and resumes exactly', () => {
  const g = game(); enterDungeon(g, 3, -6);
  const alcove = caches(g).find((o) => o.spot === 'lever'), lever = caches(g).find((o) => o.kind === 'cacheLever' && o.cacheIndex === alcove.cacheIndex);
  assert.ok(alcove && lever); assert.equal(alcove.state, 'sealed'); assert.equal(lever.state, 'ready');
  const marks = Number(g.save.currency) || 0;
  stand(g, alcove); const shut = g.interact(null, alcove.id); assert.equal(shut.ok, false); assert.ok(shut.sealed); assert.match(shut.message, /lever/);
  assert.equal(Number(g.save.currency) || 0, marks, 'nothing taken through the bars');
  const mid = reload(g); assert.equal(caches(mid).find((o) => o.id === alcove.id).state, 'sealed', 'still barred after a reload');
  stand(g, lever); const pull = g.interact(null, lever.id); assert.ok(pull.ok, pull.message);
  assert.equal(lever.state, 'pulled'); assert.deepEqual(validActions(lever, g.save), []); assert.equal(alcove.state, 'waiting');
  assert.equal(g.save.worldFlags[cacheLeverFlag(alcove.cacheKey, alcove.cacheIndex)], true);
  const resumed = reload(g); assert.deepEqual([caches(resumed).find((o) => o.id === alcove.id).state, caches(resumed).find((o) => o.id === lever.id).state], ['waiting', 'pulled']);
  assert.deepEqual([resumed.player.x, resumed.player.y], [g.player.x, g.player.y], 'exact resume');
  const a2 = caches(resumed).find((o) => o.id === alcove.id); stand(resumed, a2); const r = resumed.interact(null, a2.id); assert.ok(r.ok, r.message);
  assert.equal(Number(resumed.save.currency) || 0, marks + 200); assert.equal(a2.state, 'used');
  assert.equal(resumed.interact('pull', caches(resumed).find((o) => o.id === lever.id).id).ok, false);
});

test('ledge and climb finds are taken from up there, not from below', () => {
  const g = game(); g.rx = 9; g.ry = 4; g.loadArea('overworld');
  const o = caches(g)[0], W = 32, el = (x, y) => g.map.tiles[y * W + x]?.elev || 0; assert.equal(o.spot, 'ledge'); assert.equal(o.cacheElev, el(o.x, o.y));
  const below = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: o.x + dx, y: o.y + dy })).find((q) => !g.map.tiles[q.y * W + q.x].blocked && el(q.x, q.y) <= o.cacheElev - WORLD_CACHES.spots.ledge.drop);
  assert.ok(below, 'a drop beside it');
  stand(g, below); assert.equal(g.reachOf(o), Infinity); assert.notEqual(g.nearestObject(), o);
  const before = structuredClone(g.save.consumables); assert.equal(g.interact('take', o.id).ok, false); assert.deepEqual(g.save.consumables, before);
  stand(g, o); const r = g.interact(null, o.id); assert.ok(r.ok, r.message); assert.equal(g.save.currency, (freshSave().currency || 0) + 30);
  const t = game(); t.rx = 14; t.ry = -6; t.loadArea('overworld'); const top = caches(t)[0]; assert.equal(top.spot, 'climbTop');
  const tiles = t.map.tiles; assert.equal(Math.max(...tiles.filter((q) => !q.blocked).map((q) => q.elev || 0)) >= top.cacheElev, true);
});

test('every cache over many seeds stands on ground walkable there and back, never sealed off, and saves migrate', () => {
  let floors = 0, sections = 0, seen = { corpse: 0, throne: 0, lever: 0, ledge: 0, climbTop: 0 };
  for (const seed of ['REACH-A', 'REACH-B', 'REACH-C']) {
    const g = game(seed);
    for (let rx = 3; rx < 11; rx++) for (let ry = -3; ry < 2; ry++) {
      g.rx = rx; g.ry = ry; g.loadArea('overworld'); sections++;
      for (const o of caches(g)) {
        seen[o.spot]++; const go = reachableFrom(g.map, 32, 32, o, true), back = canReturnTo(g.map, 32, 32, o, true);
        let edge = false; for (let i = 0; i < 1024; i++) { const x = i % 32, y = (i - x) / 32; if ((x === 0 || y === 0 || x === 31 || y === 31) && go[i] && back[i]) edge = true; }
        assert.ok(edge, `${seed} ${rx},${ry} ${o.spot}: joined both ways to an edge`);
      }
      if (floors >= 18 || !enterDungeon(g, rx, ry)) continue; floors++;
      const W = g.map.width || 24, H = Math.floor(g.map.tiles.length / W), e = { x: Math.round(g.map.entry.x), y: Math.round(g.map.entry.y) };
      const go = reachableFrom(g.map, W, H, e), back = canReturnTo(g.map, W, H, e);
      for (const o of caches(g)) { if (o.spot) seen[o.spot]++; const i = o.y * W + o.x; assert.ok(go[i] && back[i], `${seed} ${rx},${ry} ${o.kind}:${o.spot} reachable from the entry and back`); }
      for (const o of caches(g).filter((q) => q.spot === 'lever')) assert.ok(caches(g).some((q) => q.kind === 'cacheLever' && q.cacheIndex === o.cacheIndex && q.cacheKey === o.cacheKey), 'every alcove has its lever');
      leave(g);
    }
  }
  assert.ok(floors >= 10 && sections >= 100, `${floors} floors, ${sections} sections`); assert.ok(seen.corpse > 0 && seen.lever + seen.throne + seen.ledge + seen.climbTop > 0, JSON.stringify(seen));
  // Save migration: an older save (no flags, no pins) loads; flags, pins and unknown fields survive migrateSave.
  const s = freshSave(); s.seed = 'CACHE1'; s.worldFlags[cacheFlag('9,4', 0)] = true; s.atlas ||= {}; s.atlas['9,4'] = { cacheVersion: 1, caches: [{ i: 0, spot: 'ledge', x: 10, y: 27 }], future: 1 };
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(m.version, 14); assert.equal(m.worldFlags[cacheFlag('9,4', 0)], true); assert.deepEqual(m.atlas['9,4'].caches, s.atlas['9,4'].caches); assert.equal(m.atlas['9,4'].future, 1);
  const old = JSON.parse(JSON.stringify(freshSave())); for (const k of Object.keys(old.atlas || {})) delete old.atlas[k].cacheVersion; assert.doesNotThrow(() => new Game(migrateSave(old), 0));
});
