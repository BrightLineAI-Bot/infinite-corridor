import { rng } from "./random.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8";
import { annotateDungeon } from "./dungeon-framework.js?v=icp_c9137bd9656e472181abc7ab_d5f10a66f65863d8";

export const DUNGEON_LAYOUT_VERSION = 1;
const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const key = (x, y) => `${x},${y}`;

function component(map, start, tiles = map.tiles) {
  const seen = new Set(), queue = [];
  const add = (x, y) => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height || !tiles[y * map.width + x] || tiles[y * map.width + x].blocked || seen.has(key(x, y))) return;
    seen.add(key(x, y)); queue.push({ x, y });
  };
  if (start) add(Math.round(start.x), Math.round(start.y));
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of DIRECTIONS) add(queue[i].x + dx, queue[i].y + dy);
  return seen;
}

// Add rooms only to the entry's existing component. A proposed room may never
// touch another original component, so it cannot cut around a sealed gate.
export function varyDungeonLayout(map, seed, id) {
  if (map.layoutVersion === DUNGEON_LAYOUT_VERSION || map.arena) return map;
  const entry = map.entry || map.objects?.find(o => o.kind === "exit");
  if (!entry || !map.width || !map.height) throw new Error("Dungeon variation requires dimensions and an entry");
  const random = rng(`${seed}:dungeon-layout-v1:${id}:${map.levelId || "root"}`);
  const original = map.tiles.map(t => ({ ...t })), reachable = component(map, entry);
  const protectedCells = new Set();
  for (const point of [...(map.finalGateTiles || []), ...(map.objects || []).flatMap(o => o.cells || [])]) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) protectedCells.add(key(point.x + dx, point.y + dy));
  }
  const wall = t => t?.blocked && !t.environment && !t.pit && !t.gateId && /wall/i.test(t.kind);
  const candidates = [];
  for (const t of original) if (reachable.has(key(t.x, t.y))) for (const [dx, dy] of DIRECTIONS) {
    const x = t.x + dx, y = t.y + dy;
    if (x > 1 && y > 1 && x < map.width - 2 && y < map.height - 2 && wall(original[y * map.width + x])) candidates.push({ x: t.x, y: t.y, dx, dy });
  }
  for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
  const roomLimit = Math.min(5, Math.max(2, Math.floor(map.width / 16))), rooms = [];
  const floorKind = map.floorKind || original.find(t => !t.blocked && /floor/i.test(t.kind))?.kind || "floor";
  for (const anchor of candidates) {
    if (rooms.length >= roomLimit) break;
    const length = 2 + Math.floor(random() * 3), wide = random() < .5, shape = random() < .5 ? "chamber" : "cross";
    const cells = new Map(), add = (forward, side) => {
      const x = anchor.x + anchor.dx * forward - anchor.dy * side, y = anchor.y + anchor.dy * forward + anchor.dx * side;
      cells.set(key(x, y), { x, y });
    };
    for (let forward = 1; forward <= length; forward++) add(forward, 0);
    for (let forward = length; forward <= length + 2; forward++) for (let side = -(wide ? 2 : 1); side <= (wide ? 2 : 1); side++) {
      if (shape === "chamber" || forward === length + 1 || Math.abs(side) <= 1) add(forward, side);
    }
    const points = [...cells.values()];
    if (points.some(({ x, y }) => {
      if (x < 2 || y < 2 || x >= map.width - 2 || y >= map.height - 2 || protectedCells.has(key(x, y))) return true;
      const tile = map.tiles[y * map.width + x];
      if (!wall(tile)) return true; // A real side branch, not a repaint of existing floor.
      return DIRECTIONS.some(([dx, dy]) => {
        const neighbour = original[(y + dy) * map.width + x + dx];
        return neighbour && !neighbour.blocked && !reachable.has(key(x + dx, y + dy));
      });
    })) continue;
    const roomId = `layout-v1:${map.levelId || "root"}:room:${rooms.length}`;
    for (const { x, y } of points) map.tiles[y * map.width + x] = { x, y, kind: floorKind, blocked: false, detail: Math.floor(random() * 4), variationRoomId: roomId };
    rooms.push({ id: roomId, shape, anchor: { x: anchor.x, y: anchor.y }, tileCount: points.length });
    // Keep additions spatially distinct, including their short connecting hall.
    for (const { x, y } of points) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) protectedCells.add(key(x + dx, y + dy));
  }

  // Move bosses within their original chamber/component, never through a gate.
  // IDs and objective ownership are stable across regeneration and saved deaths.
  const moved = [];
  for (const boss of (map.enemySpawns || []).filter(e => e.boss || ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"].includes(e.dungeonRole))) {
    const radius = boss.dungeonRole === "finalBoss" ? 4 : 3;
    const ordinary = !map.deepDungeon && map.recipe !== "deep-v1" && !map.finalGate;
    const blockedSpawn = original[boss.y * map.width + boss.x]?.blocked !== false;
    // Legacy cistern Marshal coordinates can land in its dividing wall. Repair
    // only the new layout, to the nearest entry-reachable floor; never carve it.
    const origin = blockedSpawn ? original.filter(t => reachable.has(key(t.x, t.y))).sort((a, b) => Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y))[0] : boss;
    const bossTiles = ordinary ? map.tiles : original, domain = component(map, ordinary ? entry : origin, bossTiles);
    const choices = bossTiles.filter(t => {
      if (!domain.has(key(t.x, t.y)) || (!ordinary && boss.dungeonRole !== "finalBoss" && Math.hypot(t.x - boss.x, t.y - boss.y) > radius) || Math.hypot(t.x - boss.x, t.y - boss.y) < 1.5) return false;
      if (Math.hypot(t.x - entry.x, t.y - entry.y) < 6 || (!ordinary && protectedCells.has(key(t.x, t.y)))) return false;
      if (DIRECTIONS.some(([dx, dy]) => bossTiles[(t.y + dy) * map.width + t.x + dx]?.blocked !== false)) return false;
      return ![...(map.objects || []), ...(map.enemySpawns || []).filter(e => e !== boss)].some(o => Math.hypot(t.x - o.x, t.y - o.y) < 2);
    });
    if (!choices.length && blockedSpawn && origin) choices.push(origin);
    if (!choices.length) continue;
    // Ordinary bosses may occupy near, middle or remote floor bands, including
    // the new branches. Deep final bosses stay in the sealed final component.
    let pool = choices, band = null;
    if (ordinary) {
      choices.sort((a, b) => Math.hypot(a.x - entry.x, a.y - entry.y) - Math.hypot(b.x - entry.x, b.y - entry.y));
      band = Math.floor(random() * 3);
      pool = choices.slice(Math.floor(choices.length * band / 3), Math.max(Math.floor(choices.length * band / 3) + 1, Math.floor(choices.length * (band + 1) / 3)));
    }
    const at = pool[Math.floor(random() * pool.length)];
    moved.push({ id: boss.id || boss.kind, from: { x: boss.x, y: boss.y }, to: { x: at.x, y: at.y } });
    boss.x = at.x; boss.y = at.y;
    if (ordinary) {
      const chest = map.objects.find(o => o.id === "dungeon-chest");
      if (chest) {
        const nearby = bossTiles.filter(t => domain.has(key(t.x, t.y)) && Math.hypot(t.x - boss.x, t.y - boss.y) >= 1.5 && [...map.objects.filter(o => o !== chest), ...map.enemySpawns].every(o => Math.hypot(t.x - o.x, t.y - o.y) >= 1.5))
          .sort((a, b) => Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y));
        if (nearby.length) { chest.x = nearby[0].x; chest.y = nearby[0].y; }
      }
      moved[moved.length - 1].distanceBand = band;
    }
    for (const objective of [...(map.objectives || []), ...(map.allObjectives || [])]) if (objective.enemyId === boss.id) { objective.x = at.x; objective.y = at.y; }
  }
  const spawnRepairs = [];
  for (const enemy of map.enemySpawns) {
    if (map.tiles[enemy.y * map.width + enemy.x]?.blocked === false) continue;
    // Legacy generators can select a resident before cistern water is painted.
    // Repair the actor, preserving every authored terrain and hazard tile.
    const choices = map.tiles.filter(t => !t.blocked && reachable.has(key(t.x, t.y)) &&
      Math.hypot(t.x - entry.x, t.y - entry.y) >= 4 &&
      [...map.objects, ...map.enemySpawns.filter(e => e !== enemy)].every(o => Math.hypot(t.x - o.x, t.y - o.y) >= 1.5))
      .sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y));
    if (!choices.length) throw new Error("No safe floor for a dungeon spawn");
    spawnRepairs.push({ id: enemy.id || enemy.kind, from: { x: enemy.x, y: enemy.y }, to: { x: choices[0].x, y: choices[0].y } });
    enemy.x = choices[0].x; enemy.y = choices[0].y;
  }
  const residentLimit = map.width <= 38 && !map.deepDungeon && map.recipe !== "deep-v1" ? 1 : 2;
  const residents = [], ecology = map.recipe === "kiln" ? ["glassMite", "cinderWisp"] : map.archetype === "flooded" || map.recipe === "cistern" ? ["coilStalker", "rootBrute"] : ["ashling", "veilMoth"];
  for (const room of rooms) {
    if (residents.length >= residentLimit) break;
    const choices = map.tiles.filter(t => t.variationRoomId === room.id && Math.hypot(t.x - entry.x, t.y - entry.y) >= 6 &&
      [...(map.objects || []), ...(map.enemySpawns || [])].every(o => Math.hypot(t.x - o.x, t.y - o.y) >= 2.25) &&
      DIRECTIONS.every(([dx, dy]) => map.tiles[(t.y + dy) * map.width + t.x + dx]?.blocked === false));
    if (!choices.length) continue;
    const at = choices[Math.floor(random() * choices.length)], identity = map.levelStableId || map.id || id, groupId = `${identity}:${room.id}:residents`;
    const resident = { id: `${groupId}:0`, kind: ecology[Math.floor(random() * ecology.length)], x: at.x, y: at.y, traits: [], dungeonRole: "keeper", encounterGroup: groupId, encounterSpawn: true, layoutResident: true };
    map.enemySpawns.push(resident); residents.push(resident.id);
    (map.encounterGroups ||= []).push({ id: groupId, role: "keeper", enemyIds: [resident.id], activationRadius: 8 });
  }
  map.activeEnemyCap ||= map.encounterProfile === "infested" ? 9 : 7;
  map.layoutVersion = DUNGEON_LAYOUT_VERSION;
  map.layoutVariation = { version: DUNGEON_LAYOUT_VERSION, rooms, movedBosses: moved, residents, spawnRepairs };
  map.diagnostic = { ...map.diagnostic, layoutVersion: 1, variationRooms: rooms.length, totalPopulation: map.enemySpawns.length, activeEnemyCap: map.activeEnemyCap };
  // Refresh graph/hash after geometry changes without changing the base generator.
  return annotateDungeon(map, { generatorVersion: map.generatorVersion, sizeProfile: map.sizeProfile, classification: map.dungeonContract?.classification, discoveryEnabled: map.dungeonContract?.discoveryEnabled });
}
