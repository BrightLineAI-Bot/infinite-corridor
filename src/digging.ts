// The shovel (release 225; Tim, 2026-10-19). A shovel is lashed together from wood and stone wherever you stand, digs
// up to three blocks deep into a dungeon wall, and breaks after DIG.shovelUses blocks (two since release 263; a new one is
// lashed together automatically on the next dig while you have the materials). Walls hide treasure, now and then showing a
// glint. In the overworld it digs up the rare patch of disturbed earth.
//
// The rule that keeps digging from breaking anything: a shovel makes shortcuts, never keys. It never digs the map's
// outer edge, a door, a sealed gate or a tile something stands on; a tunnel goes at most DIG.reach blocks from open
// floor; and it may break through only into floor you could already walk to, so no sealed or guarded part is ever
// opened early. Hunts, portals, dives and crossings are temporary places and are never dug.
// Pure rules: no DOM.
import { hashSeed } from "./random.ts";
import { LETHAL_KINDS } from "./landscape.ts";

// Balance (data, not literals in the logic).
export const DIG = {
  version: 1,
  reach: 3,                      // blocks deep from open floor a tunnel may go
  shovelUses: 2,                 // wall blocks a shovel digs before it breaks (release 263, Tim: "one shovel will only dig two blocks, and then it breaks"; it was 6)
  heldUses: 6,                   // the most uses a saved shovel may keep (a 6-use shovel from before 263 is not cut down)
  recipe: { wood: 1, stone: 1 }, // what a shovel costs (release 259, Tim: "one wood and one stone to make a shovel")
  carryStone: 99,                // the most stone the Wayfarer carries (release 259 set 2; release 261, Tim: "99 wood and 99 stone. You can dig as much as you want")
  stone: { wall: 1, chip: 1, break: 0, spot: 2 }, // release 275 (Tim: "every rock gives one stone"): breaking a chipped rock now only clears it (it gave 2)
  cache: { stone: 2, wood: 1 }, // release 275 (Tim: "The supply caches give 2 stone and one wood"), on top of their supply
  treasureChance: .1,            // share of wall blocks that hide something
  glintShare: .4,                // share of those whose glint shows on an exposed face
  spotChance: .03, spotMinDepth: 2,
  maxTunnelsPerArea: 60,         // bounds what a save may hold for one area
};
// What a wall or a patch of earth can hold, by weight. `marks` is currency; others are materials.
export const DIG_FINDS = [
  { id: "marks", weight: 46, min: 6, max: 18, label: "marks" },
  { id: "cinderIron", weight: 22, min: 1, max: 3, label: "Cinder Iron" },
  { id: "lumenDust", weight: 20, min: 1, max: 3, label: "Lumen Dust" },
  { id: "weaponSphere", weight: 6, min: 1, max: 1, label: "a Weapon Sphere" },
  { id: "armorSphere", weight: 6, min: 1, max: 1, label: "an Armor Sphere" },
];
const TEMPORARY = /^(hunt-instance:|hunt-arena:|elite-portal:|proving:|displacement:|arena:|far-array:|dive:)/;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// save.digging: { shovel: uses left (0 = none), dug: { areaKey: ["x,y", …] }, spots: { "rx,ry": true } }; save.materials.stone.
export function ensureDigging(save) {
  const d = save.digging && typeof save.digging === "object" ? save.digging : {}, dug = {};
  for (const [k, list] of Object.entries(d.dug || {})) if (typeof k === "string" && Array.isArray(list)) dug[k] = [...new Set(list.filter((p) => typeof p === "string" && /^-?\d+,-?\d+$/.test(p)))].slice(0, DIG.maxTunnelsPerArea);
  const spots = {}; for (const [k, v] of Object.entries(d.spots || {})) if (v === true && /^-?\d+,-?\d+$/.test(k)) spots[k] = true;
  save.digging = { ...d, shovel: Math.max(0, Math.min(DIG.heldUses, Math.floor(Number(d.shovel) || 0))), dug, spots };
  save.materials ||= {}; save.materials.stone = Math.max(0, Math.floor(Number(save.materials.stone) || 0));
  return save;
}
// Adds up to the carry limit; stone already held over it (an older save) is kept, never taken away.
export function addStone(save, n) { save.materials ||= {}; const have = Math.max(0, Number(save.materials.stone) || 0); save.materials.stone = have >= DIG.carryStone ? have : Math.min(DIG.carryStone, have + n); return save.materials.stone; }
export const canDigArea = (areaKey) => typeof areaKey === "string" && areaKey.length > 0 && !TEMPORARY.test(areaKey);

// Crafts a shovel from the recipe if there is none. Returns { ok, crafted, message }.
export function ensureShovel(save) {
  ensureDigging(save);
  if (save.digging.shovel > 0) return { ok: true, crafted: false };
  const { wood, stone } = DIG.recipe, m = save.materials;
  if ((m.wood || 0) < wood || (m.stone || 0) < stone) return { ok: false, crafted: false, message: `A shovel takes ${wood} wood and ${stone} stone (you have ${m.wood || 0} and ${m.stone || 0}). Fell trees for wood; chip or break rocks for stone.` };
  m.wood -= wood; m.stone -= stone; save.digging.shovel = DIG.shovelUses;
  return { ok: true, crafted: true, message: `You lash a shovel together from ${wood} wood and ${stone} stone.` };
}

// --- dungeon walls ---------------------------------------------------------------------------------------------------
const W = (map) => map.width || 32, H = (map) => map.height || Math.floor(map.tiles.length / W(map));
const at = (map, x, y) => (x < 0 || y < 0 || x >= W(map) || y >= H(map) ? null : map.tiles[y * W(map) + x]);
const walkable = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind) && t.kind !== "sealedGate" && t.kind !== "void";
const occupied = (map, x, y) => (map.objects || []).some((o) => Math.round(o.x) === x && Math.round(o.y) === y && o.kind !== "chest");
// A wall block a shovel can take: blocked rock inside the map's edge, with nothing standing on it.
export function diggable(map, x, y) {
  const t = at(map, x, y);
  if (!t || !t.blocked || t.tunnel || t.kind === "sealedGate" || t.kind === "void" || t.door || t.structure || LETHAL_KINDS.has(t.kind)) return false;
  if (x <= 0 || y <= 0 || x >= W(map) - 1 || y >= H(map) - 1) return false;
  return !occupied(map, x, y);
}
// Every floor tile reachable on foot from (x, y) as things stand (sealed gates and blocking objects stop you).
export function reachable(map, x, y) {
  const seen = new Set(), q = [[x, y]], w = W(map), blockers = new Set((map.objects || []).filter((o) => o.blocked || o.kind === "sealedGate" && o.state !== "open").map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  if (!walkable(at(map, x, y))) return seen;
  seen.add(y * w + x);
  while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of Object.values(DIRS)) { const nx = cx + dx, ny = cy + dy, k = ny * w + nx; if (seen.has(k) || !walkable(at(map, nx, ny)) || blockers.has(`${nx},${ny}`)) continue; seen.add(k); q.push([nx, ny]); } }
  return seen;
}
// How deep a dug tile lies from untouched open floor (1 = the first block into the wall).
function tunnelDepth(map, x, y) {
  const w = W(map), seen = new Set([y * w + x]); let frontier = [[x, y]];
  for (let d = 0; d <= DIG.reach; d++) {
    const next = [];
    for (const [cx, cy] of frontier) { const t = at(map, cx, cy); if (t && !t.blocked && !t.tunnel) return d; for (const [dx, dy] of Object.values(DIRS)) { const nx = cx + dx, ny = cy + dy, k = ny * w + nx, n = at(map, nx, ny); if (seen.has(k) || !n || n.blocked && !n.tunnel) continue; seen.add(k); next.push([nx, ny]); } }
    frontier = next;
  }
  return Infinity;
}
// Plans one dig from where you stand, facing `facing`. Returns { ok, x, y, through, reason }.
export function planDig(map, px, py, facing, areaKey) {
  if (!canDigArea(areaKey)) return { ok: false, reason: "The walls here are not stone a shovel can bite." };
  const [dx, dy] = DIRS[facing] || DIRS.down, x = px + dx, y = py + dy;
  if (!diggable(map, x, y)) return { ok: false, reason: null };
  const from = at(map, px, py), depth = (from?.tunnel ? tunnelDepth(map, px, py) : 0) + 1;
  if (depth > DIG.reach) return { ok: false, reason: `The rock is too deep here: a tunnel reaches ${DIG.reach} blocks from open floor.` };
  // Breaking through: any untouched floor next to the new block must be floor you can already reach.
  const mine = reachable(map, px, py), w = W(map);
  for (const [ex, ey] of Object.values(DIRS)) { const nx = x + ex, ny = y + ey, n = at(map, nx, ny); if (walkable(n) && !n.tunnel && !mine.has(ny * w + nx)) return { ok: false, reason: "The rock beyond rings hollow and sealed. Something keeps that side; the shovel will not open it." }; }
  const through = Object.values(DIRS).some(([ex, ey]) => { const n = at(map, x + ex, y + ey); return (x + ex !== px || y + ey !== py) && walkable(n) && !n.tunnel; });
  return { ok: true, x, y, through, depth };
}
// Turns a wall block into tunnel floor on this map.
export function openTunnel(map, x, y) { const i = y * W(map) + x, t = map.tiles[i]; map.tiles[i] = { ...t, kind: "tunnel", wallKind: t.kind, blocked: false, tunnel: true }; return map.tiles[i]; }
// Re-applies an area's dug tunnels after it is generated (generation itself never changes).
export function applyTunnels(map, save, areaKey) {
  for (const p of save.digging?.dug?.[areaKey] || []) { const [x, y] = p.split(",").map(Number), t = at(map, x, y); if (t && t.blocked && !t.tunnel && t.kind !== "sealedGate" && t.kind !== "void") openTunnel(map, x, y); }
  return map;
}
// What a wall block hides, decided by the seed and the block's place: null, or { id, n, label, glint }.
export function wallTreasure(seed, areaKey, x, y) {
  const h = hashSeed(`${seed}:wall-treasure:v${DIG.version}:${areaKey}:${x},${y}`);
  if ((h % 10000) / 10000 >= DIG.treasureChance) return null;
  return { ...pickFind(h >>> 7), glint: ((h >>> 3) % 1000) / 1000 < DIG.glintShare };
}
function pickFind(h) {
  const total = DIG_FINDS.reduce((a, f) => a + f.weight, 0); let roll = h % total;
  for (const f of DIG_FINDS) { if (roll < f.weight) return { id: f.id, label: f.label, n: f.min + ((h >>> 9) % (f.max - f.min + 1)) }; roll -= f.weight; }
  return { id: "marks", label: "marks", n: 6 };
}
// Glints showing on exposed wall faces (a wall block with open floor beside it) of an undug, treasure-holding block.
export function wallGlints(map, seed, areaKey, save) {
  if (!canDigArea(areaKey)) return [];
  const out = [], dug = new Set(save.digging?.dug?.[areaKey] || []);
  for (const t of map.tiles) {
    if (!t.blocked || dug.has(`${t.x},${t.y}`) || !diggable(map, t.x, t.y)) continue;
    if (!Object.values(DIRS).some(([dx, dy]) => walkable(at(map, t.x + dx, t.y + dy)))) continue;
    const found = wallTreasure(seed, areaKey, t.x, t.y); if (found?.glint) out.push({ x: t.x, y: t.y });
  }
  return out;
}
// Credits a find to the save. Returns the line to show.
export function creditFind(save, find) {
  if (find.id === "marks") save.currency = (Number(save.currency) || 0) + find.n;
  else { save.materials ||= {}; save.materials[find.id] = (Number(save.materials[find.id]) || 0) + find.n; }
  return `${find.n > 1 && find.id !== "weaponSphere" && find.id !== "armorSphere" ? `${find.n} ` : ""}${find.label}`;
}
// Digs the planned block: opens it, records it, wears the shovel, yields stone and any treasure.
// Returns { ok, message, broke, find }.
export function dig(save, map, plan, areaKey) {
  ensureDigging(save);
  if (save.digging.shovel <= 0) return { ok: false, message: "You have no shovel." };
  const list = (save.digging.dug[areaKey] ||= []);
  if (list.length >= DIG.maxTunnelsPerArea) return { ok: false, message: "This place has been dug enough; the rock is unsound." };
  openTunnel(map, plan.x, plan.y); list.push(`${plan.x},${plan.y}`);
  save.digging.shovel -= 1; addStone(save, DIG.stone.wall);
  const find = wallTreasure(save.seed, areaKey, plan.x, plan.y), got = find ? creditFind(save, find) : null, broke = save.digging.shovel === 0;
  const parts = [plan.through ? "You break through into the passage beyond." : "You dig a block into the wall.", got ? `Something in the rock: ${got}.` : null, broke ? "The shovel snaps." : `Shovel: ${save.digging.shovel} dig${save.digging.shovel === 1 ? "" : "s"} left.`];
  return { ok: true, message: parts.filter(Boolean).join(" "), broke, find };
}

// --- the overworld: disturbed earth ----------------------------------------------------------------------------------
export function spotHere(save, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < DIG.spotMinDepth) return false;
  return (hashSeed(`${save?.seed}:dig-spot:v${DIG.version}:${rx}:${ry}`) % 10000) / 10000 < DIG.spotChance;
}
// Places this section's patch of disturbed earth on open ground, unless it was dug. Returns it or null.
export function addDigSpot(map, save, rx, ry) {
  if (!map?.tiles?.length || map.settlement || map.skirmish || !spotHere(save, rx, ry) || save.digging?.spots?.[`${rx},${ry}`]) return null;
  if (map.objects.some((o) => o.kind === "digSpot")) return map.objects.find((o) => o.kind === "digSpot");
  const h = hashSeed(`${save.seed}:dig-spot-at:${rx}:${ry}`), taken = new Set(map.objects.map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.structure && !LETHAL_KINDS.has(t.kind) && t.kind !== "shallows" && t.x > 4 && t.y > 4 && t.x < 27 && t.y < 27 && !taken.has(`${t.x},${t.y}`));
  if (!open.length) return null;
  const t = open[h % open.length], o = { id: `dig-spot-${rx}-${ry}`, kind: "digSpot", name: "Disturbed earth", x: t.x, y: t.y, state: "buried", actions: ["dig"] };
  map.objects.push(o); return o;
}
// Digs a patch of disturbed earth with the shovel (one use). Returns { ok, message }.
export function digSpot(save, o, rx, ry) {
  ensureDigging(save);
  const key = `${rx},${ry}`;
  if (save.digging.spots[key]) return { ok: false, message: "Only loose earth now." };
  if (save.digging.shovel <= 0) return { ok: false, message: "You have no shovel." };
  save.digging.spots[key] = true; save.digging.shovel -= 1; addStone(save, DIG.stone.spot);
  const h = hashSeed(`${save.seed}:dig-spot-find:${rx}:${ry}`), got = creditFind(save, pickFind(h)), broke = save.digging.shovel === 0;
  o.state = "dug"; o.actions = []; o.name = "Turned earth";
  return { ok: true, message: `You dig down and find ${got}, and some stone.${broke ? " The shovel snaps." : ` Shovel: ${save.digging.shovel} dig${save.digging.shovel === 1 ? "" : "s"} left.`}` };
}
