import { hashSeed } from "./random.js?v=91";

export const DUNGEON_CONTRACT_SCHEMA = "infinite-corridor-dungeon/1.0.0";
export const DUNGEON_DISCOVERY_SCHEMA = 1;
export const ORDINARY_GENERATOR_VERSION = 4;
export const DUNGEON_CHUNK_SIZE = 6;
export const DUNGEON_SIZE_PROFILES = Object.freeze({
  compact: { id: "compact", width: 38, height: 38, routeRooms: 8, branchRooms: 3 },
  standard: { id: "standard", width: 46, height: 46, routeRooms: 10, branchRooms: 4 },
  extended: { id: "extended", width: 52, height: 52, routeRooms: 12, branchRooms: 5 },
  deep: { id: "deep", width: 64, height: 64, routeRooms: 12, branchRooms: 5 },
  threefold: { id: "threefold", width: 64, height: 64, routeRooms: 14, branchRooms: 6 },
});

const pointKey = (x, y) => `${x},${y}`;
const levelKey = (map) => String(map.levelStableId || map.levelId || "root");
export function dungeonChunkId(map, x, y) {
  return `${levelKey(map)}:${Math.max(0, Math.floor(Number(x) / DUNGEON_CHUNK_SIZE))},${Math.max(0, Math.floor(Number(y) / DUNGEON_CHUNK_SIZE))}`;
}

function openTile(map, x, y) {
  return x >= 0 && y >= 0 && x < map.width && y < map.height && !map.tiles[y * map.width + x]?.blocked;
}

function chunkGraph(map) {
  const chunks = new Map();
  for (const tile of map.tiles || []) {
    if (tile.blocked) continue;
    const id = dungeonChunkId(map, tile.x, tile.y);
    let chunk = chunks.get(id);
    if (!chunk) {
      const cx = Math.floor(tile.x / DUNGEON_CHUNK_SIZE), cy = Math.floor(tile.y / DUNGEON_CHUNK_SIZE);
      chunk = { id, levelId: levelKey(map), cx, cy, x: cx * DUNGEON_CHUNK_SIZE, y: cy * DUNGEON_CHUNK_SIZE, width: DUNGEON_CHUNK_SIZE, height: DUNGEON_CHUNK_SIZE, tileCount: 0, neighbours: [] };
      chunks.set(id, chunk);
    }
    chunk.tileCount++;
  }
  const links = new Set();
  for (const tile of map.tiles || []) {
    if (tile.blocked) continue;
    const from = dungeonChunkId(map, tile.x, tile.y);
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (!openTile(map, tile.x + dx, tile.y + dy)) continue;
      const to = dungeonChunkId(map, tile.x + dx, tile.y + dy);
      if (from !== to) links.add([from, to].sort().join("|"));
    }
  }
  for (const tile of map.tiles || []) {
    if (!tile.blocked || tile.kind !== "sealedGate") continue;
    const around = new Set();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (openTile(map, tile.x + dx, tile.y + dy)) around.add(dungeonChunkId(map, tile.x + dx, tile.y + dy));
    const ids = [...around]; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (ids[i] !== ids[j]) links.add([ids[i], ids[j]].sort().join("|"));
  }
  const edges = [...links].sort().map((key) => key.split("|"));
  for (const [a, b] of edges) { chunks.get(a)?.neighbours.push(b); chunks.get(b)?.neighbours.push(a); }
  return { chunks: [...chunks.values()].sort((a, b) => a.id.localeCompare(b.id)), edges };
}

function route(graph, start, goal) {
  if (!start || !goal) return [];
  const neighbours = new Map(graph.chunks.map((q) => [q.id, q.neighbours])), queue = [start], prior = new Map([[start, null]]);
  while (queue.length) {
    const id = queue.shift();
    if (id === goal) break;
    for (const next of neighbours.get(id) || []) if (!prior.has(next)) { prior.set(next, id); queue.push(next); }
  }
  if (!prior.has(goal)) return [];
  const out = []; for (let at = goal; at; at = prior.get(at)) out.push(at); return out.reverse();
}

function canonicalTopology(map, graph) {
  const objects = (map.objects || []).filter((q) => Number.isFinite(q.x) && Number.isFinite(q.y)).map((q) => [q.id, q.kind, q.x, q.y, q.requires || q.unlockObjectiveId || null]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const enemies = (map.enemySpawns || []).filter((q) => Number.isFinite(q.x) && Number.isFinite(q.y)).map((q) => [q.id || q.kind, q.kind, q.x, q.y, q.dungeonRole || null]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify({ schema: DUNGEON_CONTRACT_SCHEMA, id: map.id, generatorVersion: map.generatorVersion, width: map.width, height: map.height, tiles: (map.tiles || []).map((q) => [q.kind, !!q.blocked]), objects, enemies, edges: graph.edges });
}

export function dungeonTopologyHash(map) {
  const graph = map.dungeonContract?.graph || chunkGraph(map);
  return hashSeed(canonicalTopology(map, graph)).toString(16).padStart(8, "0");
}

export function annotateDungeon(map, options = {}) {
  const metadata = (key, value) => Object.defineProperty(map, key, { configurable: true, enumerable: Object.prototype.propertyIsEnumerable.call(map, key), writable: true, value });
  if (!map.width) metadata("width", Math.max(1, Math.round(Math.sqrt(map.tiles?.length || 1))));
  if (!map.height) metadata("height", Math.max(1, Math.floor((map.tiles?.length || map.width) / map.width)));
  const graph = chunkGraph(map), entry = map.entry || map.objects?.find((q) => q.kind === "exit") || map.tiles?.find((q) => !q.blocked) || { x: 0, y: 0 };
  const final = (map.enemySpawns || []).find((q) => q.dungeonRole === "finalBoss") || (map.enemySpawns || []).find((q) => q.boss) || map.objective || entry;
  const entryChunkId = dungeonChunkId(map, entry.x, entry.y), finalChunkId = dungeonChunkId(map, final.x, final.y), criticalRoute = route(graph, entryChunkId, finalChunkId);
  const traversableTiles = (map.tiles || []).filter((q) => !q.blocked).length;
  metadata("generatorVersion", Number(options.generatorVersion || map.generatorVersion || 1));
  metadata("sizeProfile", options.sizeProfile || map.sizeProfile || (map.deepDungeon ? (map.archetype === "threefold" ? "threefold" : "deep") : "compact"));
  metadata("dungeonContract", {
    schema: DUNGEON_CONTRACT_SCHEMA,
    classification: options.classification || (map.arena ? "bounded-arena" : map.deepDungeon || map.recipe === "deep-v1" ? "deep-expedition" : "exploration-dungeon"),
    discoveryEnabled: options.discoveryEnabled !== false && !map.arena,
    generatorVersion: map.generatorVersion,
    sizeProfile: map.sizeProfile,
    levelId: levelKey(map),
    entryChunkId,
    finalChunkId,
    graph,
    criticalRoute,
    optionalBranchCount: Number.isFinite(map.diagnostic?.branchCount) ? map.diagnostic.branchCount : Math.max(0, graph.edges.length - Math.max(0, graph.chunks.length - 1)),
    loopCount: Number.isFinite(map.diagnostic?.loopCount) ? map.diagnostic.loopCount : Math.max(0, graph.edges.length - Math.max(0, graph.chunks.length - 1)),
    traversableTiles,
    objectiveIds: (map.objectives || []).map((q) => q.id),
    gateIds: (map.objects || []).filter((q) => q.kind === "sealedGate").map((q) => q.id),
    shortcutIds: (map.shortcuts || map.objects?.filter((q) => q.kind === "deepShortcut") || []).map((q) => q.id),
    returnRouteIds: (map.routes || []).filter((q) => q.type === "postBoss" || q.type === "physical").map((q) => q.id),
  });
  map.dungeonContract.topologyHash = dungeonTopologyHash(map);
  metadata("diagnostic", { ...(map.diagnostic || {}), dungeonContract: DUNGEON_CONTRACT_SCHEMA, generatorVersion: map.generatorVersion, sizeProfile: map.sizeProfile, chunkCount: graph.chunks.length, traversableTiles, criticalRouteLength: criticalRoute.length, optionalBranchCount: map.dungeonContract.optionalBranchCount, loopCount: map.dungeonContract.loopCount, topologyHash: map.dungeonContract.topologyHash, traversalValidation: criticalRoute.length ? "pass" : "fail" });
  return map;
}

export function normalizeDungeonDiscovery(value) {
  const source = value && typeof value === "object" ? value : {};
  const levels = {};
  for (const [id, list] of Object.entries(source.levels || {})) levels[String(id)] = [...new Set((Array.isArray(list) ? list : []).map(String))].slice(0, 512);
  return { schema: DUNGEON_DISCOVERY_SCHEMA, levels };
}

export function discoveryForLevel(history, map) {
  history.discovery = normalizeDungeonDiscovery(history.discovery);
  const key = levelKey(map);
  return history.discovery.levels[key] ||= [];
}

export function revealDungeonAt(map, prior, x, y, radius = 0) {
  const set = new Set((prior || []).map(String)), current = dungeonChunkId(map, x, y), chunk = map.dungeonContract?.graph?.chunks.find((q) => q.id === current);
  if (chunk) for (const q of map.dungeonContract.graph.chunks) if (Math.abs(q.cx - chunk.cx) <= radius && Math.abs(q.cy - chunk.cy) <= radius) set.add(q.id);
  else set.add(current);
  return [...set].sort();
}

export function applyDungeonDiscovery(map, ids = [], mode = "normal") {
  const revealed = mode === "full" ? new Set(map.dungeonContract?.graph?.chunks.map((q) => q.id) || []) : new Set(ids.map(String));
  Object.defineProperty(map, "_dungeonRevealed", { configurable: true, enumerable: false, writable: true, value: revealed });
  Object.defineProperty(map, "_dungeonRevealMode", { configurable: true, enumerable: false, writable: true, value: mode });
  return map;
}

export function dungeonTileVisibility(map, x, y) {
  if (!map?.dungeonContract?.discoveryEnabled || map._dungeonRevealMode === "full") return "visible";
  const set = map._dungeonRevealed || new Set();
  return set.has(dungeonChunkId(map, x, y)) ? "visible" : "unseen";
}

export function dungeonPointDiscovered(map, point) {
  return !map?.dungeonContract?.discoveryEnabled || dungeonTileVisibility(map, point?.x, point?.y) !== "unseen";
}

export function dungeonDiscoveryReport(map) {
  const total = map?.dungeonContract?.graph?.chunks.length || 0, revealed = map?._dungeonRevealed?.size || 0;
  return { totalChunks: total, revealedChunks: Math.min(total, revealed), unexploredChunks: Math.max(0, total - revealed), currentMode: map?._dungeonRevealMode || "normal" };
}
