import { hashSeed } from "./random.js?v=r1036-6e23959101e8";

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

// Release 159: the renderer asks this for every tile, object and enemy each frame; building a chunk-id string per call
// made garbage the collector had to clear mid-play (dungeon stutter). A per-chunk table is built once per revealed set
// (applyDungeonDiscovery always installs a new Set) and each call is then an array read.
const revealGrid = new WeakMap();
function revealedChunks(map) {
  const set = map._dungeonRevealed || null, prior = revealGrid.get(map);
  if (prior && prior.set === set && prior.size === (set?.size || 0) && prior.level === levelKey(map)) return prior;
  const cols = Math.ceil((map.width || 1) / DUNGEON_CHUNK_SIZE) + 1, rows = Math.ceil((map.height || Math.ceil(map.tiles.length / (map.width || 1))) / DUNGEON_CHUNK_SIZE) + 1, grid = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) if (set?.has(`${levelKey(map)}:${cx},${cy}`)) grid[cy * cols + cx] = 1;
  const entry = { set, size: set?.size || 0, level: levelKey(map), cols, rows, grid };
  revealGrid.set(map, entry); return entry;
}
export function dungeonTileVisibility(map, x, y) {
  if (!map?.dungeonContract?.discoveryEnabled || map._dungeonRevealMode === "full") return "visible";
  const r = revealedChunks(map), cx = Math.max(0, Math.floor(Number(x) / DUNGEON_CHUNK_SIZE)), cy = Math.max(0, Math.floor(Number(y) / DUNGEON_CHUNK_SIZE));
  if (!(cx < r.cols && cy < r.rows)) return (map._dungeonRevealed || new Set()).has(dungeonChunkId(map, x, y)) ? "visible" : "unseen";
  return r.grid[cy * r.cols + cx] ? "visible" : "unseen";
}

export function dungeonPointDiscovered(map, point) {
  return !map?.dungeonContract?.discoveryEnabled || dungeonTileVisibility(map, point?.x, point?.y) !== "unseen";
}

export function dungeonDiscoveryReport(map) {
  const total = map?.dungeonContract?.graph?.chunks.length || 0, revealed = map?._dungeonRevealed?.size || 0;
  return { totalChunks: total, revealedChunks: Math.min(total, revealed), unexploredChunks: Math.max(0, total - revealed), currentMode: map?._dungeonRevealMode || "normal" };
}

// ------------------------------------------------------------------------------------------------ charting (Unreleased)
// Tim's log: clearing the fog from every walkable tile of a dungeon floor pays a bonus of `bonus` of the Aperture earned on that floor,
// in every dungeon. "Walkable" is the ground the Wayfarer can stand on from the floor's ways in with base movement (no swimming, no robot,
// a jump of one step up, any drop down): a tile behind a wall, across water or lava, in a pit, or on a ledge no step reaches is left out,
// so 100% can always be reached. A sealed gate counts as ground (it opens in the floor's own course). The fog is the floor's own record:
// a labyrinth chamber's tile fog (labyrinths.ts LAB_FOG) where it has one, else the dungeon discovery's chunks (a chunk is charted once
// revealed; standing on any tile of it reveals it). A floor with neither (an arena, a building floor without fog) is never charted.
// The record is on the floor's dungeon history (`charted`: { [level]: { earned, paid, done } }; additive at schema 14, normalised by
// ensureCharting): the Aperture earned while on the floor, what the bonus has paid, and whether it was charted. The bonus is owed on
// what was earned (`round(earned * bonus) - paid`), paid when the floor is charted and topped up if more is earned on it later; it
// never pays twice for the same Aperture, and leaving and coming back changes nothing. A floor of the Deep is a new floor each visit
// (its history goes with it, game.ts resetDeepFloor), so each visit has its own record.
export const DUNGEON_CHARTING = { version: 1, bonus: .2, maxTiles: 65536, maxLevels: 64, message: "Every corner charted", topUp: "Charted ground" };
const chartMemo = new WeakMap();
// The floor's walkable ground, worked out once per map object: `open(tile)` whether a tile can be stood on, `step(fx, fy, tx, ty)`
// whether base movement crosses between neighbouring tiles, `seeds` the tiles it starts from (the ways in). { W, H, reach, chunks, tiles }.
export function chartableGround(map, open, step, seeds = []) {
  const kept = map ? chartMemo.get(map) : null; if (kept) return kept;
  const W = Number(map?.width) || 0, H = W ? (Number(map.height) || Math.floor((map.tiles?.length || 0) / W)) : 0;
  const out = { W, H, reach: new Uint8Array(Math.max(0, Math.min(W * H, DUNGEON_CHARTING.maxTiles))), chunks: new Set(), tiles: 0 };
  if (map) chartMemo.set(map, out);
  if (!W || !H || W * H > DUNGEON_CHARTING.maxTiles) return out;
  const q = [];
  for (const p of seeds) { const x = Math.round(Number(p?.x)), y = Math.round(Number(p?.y)), k = y * W + x; if (x >= 0 && y >= 0 && x < W && y < H && !out.reach[k] && open(map.tiles[k])) { out.reach[k] = 1; q.push(k); } }
  for (let i = 0; i < q.length; i++) {
    const k = q[i], x = k % W, y = (k - x) / W;
    for (let d = 0; d < 4; d++) {
      const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0), n = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || out.reach[n] || !open(map.tiles[n]) || !step(x, y, nx, ny)) continue;
      out.reach[n] = 1; q.push(n);
    }
  }
  out.tiles = q.length; for (const k of q) out.chunks.add(dungeonChunkId(map, k % W, Math.floor(k / W)));
  return out;
}
// How much of the walkable ground is charted: by `seen` (a byte a tile, the labyrinth fog) when given, else by `revealed` (chunk ids).
// { total, charted, pct (whole percent, 100 only when done), done }; total 0 when there is nothing to chart.
export function chartProgress(ground, { seen = null, revealed = null } = {}) {
  let total = 0, charted = 0;
  if (seen) { total = ground.tiles; for (let k = 0; k < ground.reach.length; k++) if (ground.reach[k] && seen[k]) charted++; }
  else { total = ground.chunks.size; const r = revealed instanceof Set ? revealed : new Set(revealed || []); for (const id of ground.chunks) if (r.has(id)) charted++; }
  const done = total > 0 && charted >= total;
  return { total, charted, done, pct: total ? (done ? 100 : Math.min(99, Math.floor(100 * charted / total))) : 0 };
}
// A floor's record on its dungeon history (`level`: the discovery level key, "root" for a single floor).
export function chartRecord(history, level = "root") {
  const C = (history.charted && typeof history.charted === "object" && !Array.isArray(history.charted)) ? history.charted : (history.charted = {});
  return (C[level] ||= { earned: 0, paid: 0, done: false });
}
// What the bonus owes on a record now (0 until the floor is charted).
export const chartOwed = (rec) => rec?.done ? Math.max(0, Math.round((Number(rec.earned) || 0) * DUNGEON_CHARTING.bonus) - (Number(rec.paid) || 0)) : 0;
// Saves (freshSave / migrateSave): each dungeon history's `charted` kept as { [level]: { earned, paid, done } } with whole, non-negative
// numbers (a record that is not an object is dropped; other fields on a record are kept). Additive at schema 14.
export function ensureCharting(save) {
  const D = save?.consequences?.dungeons; if (!D || typeof D !== "object") return save;
  const n = (v) => { const k = Math.floor(Number(v)); return Number.isFinite(k) && k > 0 ? k : 0; };
  for (const h of Object.values(D)) {
    if (!h || typeof h !== "object" || !("charted" in h)) continue;
    const src = h.charted && typeof h.charted === "object" && !Array.isArray(h.charted) ? h.charted : {}, out = {};
    for (const [level, r] of Object.entries(src).slice(0, DUNGEON_CHARTING.maxLevels)) if (r && typeof r === "object" && !Array.isArray(r)) out[String(level)] = { ...r, earned: n(r.earned), paid: n(r.paid), done: r.done === true };
    h.charted = out;
  }
  return save;
}
