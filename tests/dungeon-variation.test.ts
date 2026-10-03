import test from "node:test";
import assert from "node:assert/strict";
import { generateDungeon, generateDeepDungeon, deepDungeonId } from "../src/world.ts";
import { generateUnifiedDungeon, generateVariedDungeon } from "../src/arenas.ts";
import { DEEP_ARCHETYPE_IDS, deepV2Id, deepV2Levels, generateDeepV2Dungeon } from "../src/deep-dungeons.ts";
import { varyDungeonLayout } from "../src/dungeon-variation.ts";

function reachable(map, at) {
  const seen = new Set(), queue = [at];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i], key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height || seen.has(key) || map.tiles[y * map.width + x].blocked) continue;
    seen.add(key); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push({ x:x+dx, y:y+dy });
  }
  return seen;
}
const entry = map => map.entry || map.objects.find(o => o.kind === "exit");
const mask = map => map.tiles.map(t => t.blocked ? "#" : ".").join("");
function families(seed) {
  const out = [];
  for (const recipe of ["hollow", "cistern", "kiln"]) {
    out.push([`legacy-${recipe}`, () => generateDungeon(seed, `dungeon:${seed}:g1:1:2:${recipe}`)]);
    out.push([`v3-${recipe}`, () => generateVariedDungeon(seed, `v3:${recipe}`, recipe)]);
    for (const sizeProfile of ["compact", "standard", "extended"]) out.push([`${recipe}-${sizeProfile}`, () => generateUnifiedDungeon(seed, `v4:${recipe}:${sizeProfile}`, recipe, { sizeProfile })]);
  }
  out.push(["threefold-v1", () => generateDeepDungeon(seed, deepDungeonId(seed, 1, 2, 3))]);
  for (const archetype of DEEP_ARCHETYPE_IDS) {
    const id = deepV2Id(seed, 1, 4, 5, archetype);
    for (const level of deepV2Levels(id)) out.push([`${archetype}-${level.id}`, () => generateDeepV2Dungeon(seed, id, { levelId:level.id })]);
  }
  return out;
}

test("layout additions vary geometry across small, large, legacy and deep families deterministically", () => {
  const shapes = new Set(), changed = new Map();
  for (let seedIndex = 0; seedIndex < 3; seedIndex++) {
    const seed = `LAYOUT-${seedIndex}`;
    for (const [name, make] of families(seed)) {
      const baseline = make(), first = varyDungeonLayout(make(), seed, name), second = varyDungeonLayout(make(), seed, name);
      assert.equal(mask(first), mask(second), name);
      assert.deepEqual(first.layoutVariation, second.layoutVariation, name);
      assert.equal(first.generatorVersion, baseline.generatorVersion, "preserve base generator");
      assert.equal(first.layoutVersion, 1);
      assert.deepEqual(first.enemySpawns.filter(e => !e.layoutResident).map(e => e.id), baseline.enemySpawns.map(e => e.id));
      assert.deepEqual(first.enemySpawns.filter(e => e.layoutResident), second.enemySpawns.filter(e => e.layoutResident));
      assert.ok(first.layoutVariation.residents.length <= 2);
      assert.equal(first.activeEnemyCap, baseline.activeEnemyCap || 7);
      if (mask(first) !== mask(baseline)) changed.set(name, (changed.get(name) || 0) + 1);
      for (const room of first.layoutVariation.rooms) shapes.add(room.shape);
      assert.ok(first.layoutVariation.rooms.length <= 5);
      const before = JSON.stringify(first);
      assert.equal(varyDungeonLayout(first, seed, name), first);
      assert.equal(JSON.stringify(first), before, "modifier cannot run twice");
    }
  }
  for (const [name] of families("LAYOUT-0")) assert.ok(changed.get(name), `${name} must add real traversable geometry`);
  assert.deepEqual([...shapes].sort(), ["chamber", "cross"]);
});

test("variation preserves sealed components, gate cells, objectives and return destinations", () => {
  for (let seedIndex = 0; seedIndex < 3; seedIndex++) for (const [name, make] of families(`SAFE-${seedIndex}`)) {
    const before = make(), after = varyDungeonLayout(make(), `SAFE-${seedIndex}`, name);
    const priorReach = reachable(before, entry(before)), nextReach = reachable(after, entry(after));
    for (const tile of before.tiles) {
      const k = `${tile.x},${tile.y}`;
      if (!tile.blocked) assert.equal(nextReach.has(k), priorReach.has(k), `${name} changes an existing component at ${k}`);
      if (tile.environment || tile.gateId || tile.pit) assert.deepEqual(after.tiles[tile.y * before.width + tile.x], tile);
    }
    for (const tile of after.tiles.filter(t => t.variationRoomId)) assert.ok(nextReach.has(`${tile.x},${tile.y}`), "new rooms connect to entry");
    assert.deepEqual(after.finalGateTiles, before.finalGateTiles);
    assert.deepEqual(after.objects.filter(o => o.id !== "dungeon-chest"), before.objects.filter(o => o.id !== "dungeon-chest"), "mechanisms, transitions and return coordinates remain fixed");
    for (const chest of after.objects.filter(o => o.id === "dungeon-chest")) assert.ok(nextReach.has(`${chest.x},${chest.y}`), "relocated cache remains reachable");
    for (let i = 0; i < before.enemySpawns.length; i++) {
      const old = before.enemySpawns[i], current = after.enemySpawns[i];
      assert.ok(!after.tiles[current.y * after.width + current.x].blocked, `${name}: ${current.id || current.kind} at ${current.x},${current.y}; baseline blocked=${before.tiles[old.y * before.width + old.x].blocked}`);
      if (before.tiles[old.y * before.width + old.x].blocked) assert.ok(nextReach.has(`${current.x},${current.y}`), "legacy wall spawn repaired onto reachable floor");
      else assert.equal(nextReach.has(`${current.x},${current.y}`), priorReach.has(`${old.x},${old.y}`), "boss stays on its side of sealed gate");
    }
    for (const resident of after.enemySpawns.filter(e => e.layoutResident)) {
      assert.ok(nextReach.has(`${resident.x},${resident.y}`));
      assert.ok(after.tiles[resident.y * after.width + resident.x].variationRoomId);
    }
    if (after.finalGateTiles?.length) {
      for (const p of after.finalGateTiles) after.tiles[p.y * after.width + p.x].blocked = false;
      const opened = reachable(after, entry(after));
      for (const boss of after.enemySpawns.filter(e => e.dungeonRole === "finalBoss")) assert.ok(opened.has(`${boss.x},${boss.y}`), `${name} final boss reachable after gate opens`);
    }
  }
});

test("ordinary bosses occupy different distance bands and take their cache to a nearby room", () => {
  for (const sizeProfile of ["compact", "extended"]) {
    const bands = new Set(), distances = [];
    for (let i = 0; i < 12; i++) {
      const seed = `BOSS-ROOM-${i}`, map = varyDungeonLayout(generateUnifiedDungeon(seed, "boss-placement", "hollow", { sizeProfile }), seed, "boss-placement");
      const boss = map.enemySpawns.find(e => e.boss), change = map.layoutVariation.movedBosses.find(e => e.id === boss.id), chest = map.objects.find(o => o.id === "dungeon-chest");
      bands.add(change.distanceBand); distances.push(Math.hypot(boss.x - map.entry.x, boss.y - map.entry.y));
      assert.ok(Math.hypot(chest.x - boss.x, chest.y - boss.y) <= 5);
      assert.ok(reachable(map, map.entry).has(`${boss.x},${boss.y}`));
    }
    assert.equal(bands.size, 3, `${sizeProfile} near, middle and remote boss bands`);
    assert.ok(Math.max(...distances) - Math.min(...distances) >= 10, "placement changes route distance materially");
  }
});
