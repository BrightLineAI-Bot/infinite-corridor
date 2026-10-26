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
import { hashSeed } from "./random.js?v=r451-25244261f01f";
import { LETHAL_KINDS } from "./landscape.js?v=r451-25244261f01f";
import { APERTURE_BANDS, apertureBand } from "./items.js?v=r451-25244261f01f";

// Balance (data, not literals in the logic).
export const DIG = {
  version: 1,
  reach: 3,                      // blocks deep from open floor a tunnel may go
  shovelUses: 2,                 // wall blocks a shovel digs before it breaks (release 263, Tim: "one shovel will only dig two blocks, and then it breaks"; it was 6)
  heldUses: 6,                   // the most uses a saved shovel may keep (a 6-use shovel from before 263 is not cut down)
  recipe: { wood: 1, stone: 1 }, // what a shovel costs (release 259, Tim: "one wood and one stone to make a shovel")
  carryStone: 99,                // the most stone the Wayfarer carries (release 259 set 2; release 261, Tim: "99 wood and 99 stone. You can dig as much as you want")
  stone: { wall: 0, chip: 1, break: 0, spot: 0 }, // release 413 (Tim: "it shouldn't refund your stone... it's a resource you shouldn't get from digging"): dug walls and earth give none (they gave 1 and 2) // release 275 (Tim: "every rock gives one stone"): breaking a chipped rock now only clears it (it gave 2)
  // Release 277 (Tim, 2026-10-22: "the supply cache will just give you one of each of those, a stone... a draught, and a wood";
  // "the observatory can give you a random of... three wood or three stone or... one stone and one draught").
  cache: { stone: 1, wood: 1, restorativeDraught: 1 }, // on top of the cache's own supply (a draught cache gives just its one)
  // Release 287 (Tim, 2026-10-22: "the first level should just give 2 stone and 2 wood just flat... the second level...
  // 2 stone and 2 wood... plus... a random chance to get 3 stone and 3 wood"): a supply cache inside a dungeon gives these
  // instead of `cache`'s stone and wood (its draught and its own supply stay). `deeperChance` is seeded per cache.
  dungeonCache: { first: { stone: 2, wood: 2 }, deeper: { stone: 2, wood: 2 }, deeperRich: { stone: 3, wood: 3 }, deeperChance: .35 },
  observatory: [{ wood: 3 }, { stone: 3 }, { stone: 1, restorativeDraught: 1 }], // one, seeded per Broken Observatory, on its first inspection
  treasureChance: .1,            // share of wall blocks that hide something
  glintShare: .4,                // share of those whose glint shows on an exposed face
  spotChance: .03, spotMinDepth: 2,
  maxTunnelsPerArea: 60,         // bounds what a save may hold for one area
  // Release 387 (Tim approved "glints and buried treasure could scale with Aperture tier"): every `every` Aperture tiers a
  // wall is `chance` likelier to hold something, and marks and materials come `more` times as plentiful (spheres stay one).
  tierScale: { every: 4, chance: .02, more: .5 },
  // Release 379 (Tim, 2026-10-24: "you should be able to make a shovel with cinder iron to break through the walls... it'll
  // just cost one cinder iron and one wood"): the iron shovel digs the rock the standard one will not: rock that rings
  // hollow and sealed. It is lashed together the same way, only when such rock needs it. Release 381 (Tim: "even with the
  // iron shovel... you can still only dig three from your position"): it reaches no deeper than the standard shovel.
  // Release 411 (Tim: "the iron shovel... can dig through 2 of these immovable block type things or obstacles... it could dig
  // through 4... regular dungeon walls before it breaks. If they're the hard dungeon walls that resist the shovel... just
  // two of them"): `uses` is 4 points; a dig spends `cost` by what it cuts. With an iron shovel in hand and no standard
  // shovel (nor wood and stone for one), it digs plain walls too.
  iron: { recipe: { cinderIron: 1, wood: 1 }, uses: 4, cost: { wall: 1, obstacle: 2, hard: 2 } },
  // Release 413 (Tim: "to break those pillars, it should just take a full... shovel... we don't have to spend iron for that"):
  // an obstacle (isObstacle) takes the whole standard shovel, whatever digs it had left.
  obstacleTakesShovel: true,
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

// save.digging: { shovel: uses left (0 = none), iron: iron-shovel uses left (release 379), dug: { areaKey: ["x,y", …] }, spots: { "rx,ry": true } }; save.materials.stone.
export function ensureDigging(save) {
  const d = save.digging && typeof save.digging === "object" ? save.digging : {}, dug = {};
  for (const [k, list] of Object.entries(d.dug || {})) if (typeof k === "string" && Array.isArray(list)) dug[k] = [...new Set(list.filter((p) => typeof p === "string" && /^-?\d+,-?\d+$/.test(p)))].slice(0, DIG.maxTunnelsPerArea);
  const spots = {}; for (const [k, v] of Object.entries(d.spots || {})) if (v === true && /^-?\d+,-?\d+$/.test(k)) spots[k] = true;
  save.digging = { ...d, shovel: Math.max(0, Math.min(DIG.heldUses, Math.floor(Number(d.shovel) || 0))), ...(Number(d.iron) > 0 ? { iron: Math.min(DIG.iron.uses, Math.floor(Number(d.iron))) } : {}), dug, spots };
  if (!(save.digging.iron > 0)) delete save.digging.iron;
  save.materials ||= {}; save.materials.stone = Math.max(0, Math.floor(Number(save.materials.stone) || 0));
  return save;
}
// Adds up to the carry limit; stone already held over it (an older save) is kept, never taken away.
export function addStone(save, n) { save.materials ||= {}; const have = Math.max(0, Number(save.materials.stone) || 0); save.materials.stone = have >= DIG.carryStone ? have : Math.min(DIG.carryStone, have + n); return save.materials.stone; }
export const canDigArea = (areaKey) => typeof areaKey === "string" && areaKey.length > 0 && !TEMPORARY.test(areaKey);
// Release 433 (Tim: "I'm at a wall right now... it says the walls cannot be bitten by the shovel... we need to make sure
// that the shovels are actually working"): the shovel works in temporary places too (Far Array runs, arenas, hunts,
// grottoes, crossings). Their tunnels last only while you are there and are never written to the save, and their walls
// hide no treasure (`canDigArea` still marks the places whose tunnels are kept).
export const canDigHere = (areaKey) => typeof areaKey === "string" && areaKey.length > 0;

// Crafts a shovel from the recipe if there is none. Returns { ok, crafted, message }.
export function ensureShovel(save) {
  ensureDigging(save);
  if (save.digging.shovel > 0) return { ok: true, crafted: false };
  const { wood, stone } = DIG.recipe, m = save.materials;
  if ((m.wood || 0) < wood || (m.stone || 0) < stone) return { ok: false, crafted: false, message: `A shovel takes ${wood} wood and ${stone} stone (you have ${m.wood || 0} and ${m.stone || 0}). Fell trees for wood; chip or break rocks for stone.` };
  m.wood -= wood; m.stone -= stone; save.digging.shovel = DIG.shovelUses;
  return { ok: true, crafted: true, message: `You lash a shovel together from ${wood} wood and ${stone} stone.` };
}

// Crafts an iron shovel from its recipe if there is none. Returns { ok, crafted, message }.
export function ensureIronShovel(save) {
  ensureDigging(save);
  if (save.digging.iron > 0) return { ok: true, crafted: false };
  const { cinderIron, wood } = DIG.iron.recipe, m = save.materials;
  if ((m.cinderIron || 0) < cinderIron || (m.wood || 0) < wood) return { ok: false, crafted: false, message: `The standard shovel will not bite this rock. An iron shovel would: it takes ${cinderIron} cinder iron and ${wood} wood (you have ${m.cinderIron || 0} and ${m.wood || 0}).` };
  m.cinderIron -= cinderIron; m.wood -= wood; save.digging.iron = DIG.iron.uses;
  return { ok: true, crafted: true, message: `You forge an iron shovel from ${cinderIron} cinder iron and ${wood} wood.` };
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
// Release 423 (Tim: "you should be able to use the shovel in the overworld, also to dig through blocks and things... just
// like it works... in the dungeons"): in the open world a shovel takes rock, crags, stones and spires, never water, chasms,
// the night-sky voids of the Far Sleep, castle walls, buildings or anything in a settlement. A dug tile settles to the
// lowest open ground beside it, so it joins the path you dug from. Tunnels are kept per section (`overworldDigKey`).
// Release 425 (Tim: "you can get the shovel whenever, but you can't change the world... you can't modify the overworld
// until infinite two"): open-world digging opens at Aperture tier `tier` (Infinite II); dungeons are unchanged.
export const OVERWORLD_DIG = { tier: 12, refuse: /water|Water|river|lake|ocean|Ocean|canyon|chasm|Chasm|pool|Pool|castle|lava|Lava|void|Void|ice|Ice/, obstacle: /sleeperStone|Spire|spire|crag|pillar|Pillar|monolith|statue/ };
export const overworldDigKey = (rx, ry) => `overworld:${rx},${ry}`;
export function overworldDiggable(map, x, y) {
  if (map?.settlement || !diggable(map, x, y)) return false;
  const t = at(map, x, y); return !t.environment && !t.buildingId && !t.build && !OVERWORLD_DIG.refuse.test(String(t.kind || ""));
}
const settleElev = (map, x, y) => { let low = null; for (const [dx, dy] of Object.values(DIRS)) { const n = at(map, x + dx, y + dy); if (walkable(n)) low = low == null ? (n.elev || 0) : Math.min(low, n.elev || 0); } return low ?? 0; };
// Release 411: what a blocked tile is, for the iron shovel's cost: a wall of the dungeon, or something standing in a hall
// (a sleeper-stone, a pillar, a spire), named by its kind.
export const isObstacle = (t) => !!t && t.blocked && !/wall|rim|Wall|Rim/.test(String(t.kind || "")) && t.kind !== "deepWall";
// Plans one dig from where you stand, facing `facing`. Returns { ok, x, y, through, reason, resists }; `resists` marks rock
// that only the iron shovel digs (`iron`: plan for it).
export function planDig(map, px, py, facing, areaKey, { iron = false, overworld = false } = {}) {
  if (!canDigHere(areaKey)) return { ok: false, reason: "The walls here are not stone a shovel can bite." };
  const [dx, dy] = DIRS[facing] || DIRS.down, x = px + dx, y = py + dy;
  if (overworld) { // release 423: no sealed halls out here; walls of rock are one dig, a standing stone or crag a whole shovel
    if (!overworldDiggable(map, x, y)) return { ok: false, reason: null };
    const from = at(map, px, py), depth = (from?.tunnel ? tunnelDepth(map, px, py) : 0) + 1;
    if (depth > DIG.reach) return { ok: false, reason: `The rock is too deep here: a tunnel reaches ${DIG.reach} blocks from open ground.` };
    const through = Object.values(DIRS).some(([ex, ey]) => { const n = at(map, x + ex, y + ey); return (x + ex !== px || y + ey !== py) && walkable(n) && !n.tunnel; });
    return { ok: true, x, y, through, depth, overworld: true, cut: OVERWORLD_DIG.obstacle.test(String(at(map, x, y).kind)) ? "obstacle" : "wall", ...(iron ? { iron: true } : {}) };
  }
  if (!diggable(map, x, y)) return { ok: false, reason: null };
  const from = at(map, px, py), depth = (from?.tunnel ? tunnelDepth(map, px, py) : 0) + 1;
  if (depth > DIG.reach) return { ok: false, reason: `The rock is too deep here: a tunnel reaches ${DIG.reach} blocks from open floor.` };
  // Breaking through: any untouched floor next to the new block must be floor you can already reach.
  const mine = reachable(map, px, py), w = W(map);
  if (!iron) for (const [ex, ey] of Object.values(DIRS)) { const nx = x + ex, ny = y + ey, n = at(map, nx, ny); if (walkable(n) && !n.tunnel && !mine.has(ny * w + nx)) return { ok: false, resists: true, reason: "The rock beyond rings hollow and sealed. Something keeps that side; the shovel will not open it." }; }
  const through = Object.values(DIRS).some(([ex, ey]) => { const n = at(map, x + ex, y + ey); return (x + ex !== px || y + ey !== py) && walkable(n) && !n.tunnel; });
  return { ok: true, x, y, through, depth, cut: isObstacle(at(map, x, y)) ? "obstacle" : "wall", ...(iron ? { iron: true } : {}) };
}
// Turns a wall block into tunnel floor on this map.
export function openTunnel(map, x, y, overworld = false) { const i = y * W(map) + x, t = map.tiles[i], level = overworld ? { elev: settleElev(map, x, y), slope: false } : {}; map.tiles[i] = { ...t, kind: "tunnel", wallKind: t.kind, blocked: false, tunnel: true, ...level }; return map.tiles[i]; }
// Re-applies an area's dug tunnels after it is generated (generation itself never changes).
export function applyTunnels(map, save, areaKey, overworld = false) {
  for (const p of save.digging?.dug?.[areaKey] || []) { const [x, y] = p.split(",").map(Number), t = at(map, x, y); if (t && t.blocked && !t.tunnel && t.kind !== "sealedGate" && t.kind !== "void") openTunnel(map, x, y, overworld); }
  return map;
}
// What a wall block hides, decided by the seed and the block's place: null, or { id, n, label, glint }.
// `tier` (release 387): the Wayfarer's Aperture tier; 0 keeps the release-225 odds and amounts.
export const digStep = (tier) => Math.floor(Math.max(0, Number(tier) || 0) / DIG.tierScale.every);
export const saveTier = (save) => Math.max(0, APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0)));
export function wallTreasure(seed, areaKey, x, y, tier = 0) {
  const h = hashSeed(`${seed}:wall-treasure:v${DIG.version}:${areaKey}:${x},${y}`), step = digStep(tier);
  if ((h % 10000) / 10000 >= DIG.treasureChance + step * DIG.tierScale.chance) return null;
  const f = pickFind(h >>> 7);
  return { ...f, n: scaled(f, step), glint: ((h >>> 3) % 1000) / 1000 < DIG.glintShare };
}
const scaled = (f, step) => f.id === "weaponSphere" || f.id === "armorSphere" ? f.n : Math.round(f.n * (1 + step * DIG.tierScale.more));
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
    const found = wallTreasure(seed, areaKey, t.x, t.y, saveTier(save)); if (found?.glint) out.push({ x: t.x, y: t.y });
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
  const tool = plan.iron ? "iron" : "shovel", name = plan.iron ? "Iron shovel" : "Shovel";
  if (!(save.digging[tool] > 0)) return { ok: false, message: plan.iron ? "You have no iron shovel." : "You have no shovel." };
  const kept = canDigArea(areaKey), list = kept ? (save.digging.dug[areaKey] ||= []) : []; // release 433: a temporary place's tunnels are not saved
  if (list.length >= DIG.maxTunnelsPerArea) return { ok: false, message: "This place has been dug enough; the rock is unsound." };
  openTunnel(map, plan.x, plan.y, !!plan.overworld); if (kept) list.push(`${plan.x},${plan.y}`);
  save.digging[tool] = Math.max(0, save.digging[tool] - (plan.iron ? DIG.iron.cost[plan.hard ? "hard" : plan.cut] || 1 : plan.cut === "obstacle" && DIG.obstacleTakesShovel ? save.digging[tool] : 1)); if (DIG.stone.wall) addStone(save, DIG.stone.wall); // release 411: the iron shovel spends by what it cuts; 413: an obstacle takes a whole standard shovel, and no stone comes back
  const left = save.digging[tool], find = kept ? wallTreasure(save.seed, areaKey, plan.x, plan.y, saveTier(save)) : null, got = find ? creditFind(save, find) : null, broke = left === 0;
  if (plan.iron && broke) delete save.digging.iron;
  const parts = [plan.cut === "obstacle" ? "You break it down." : plan.through ? "You break through into the passage beyond." : "You dig a block into the wall.", got ? `Something in the rock: ${got}.` : null, broke ? `The ${name.toLowerCase()} snaps.` : `${name}: ${left} dig${left === 1 ? "" : "s"} left.`];
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
  save.digging.spots[key] = true; save.digging.shovel -= 1; if (DIG.stone.spot) addStone(save, DIG.stone.spot);
  const h = hashSeed(`${save.seed}:dig-spot-find:${rx}:${ry}`), f = pickFind(h), got = creditFind(save, { ...f, n: scaled(f, digStep(saveTier(save))) }), broke = save.digging.shovel === 0;
  o.state = "dug"; o.actions = []; o.name = "Turned earth";
  return { ok: true, message: `You dig down and find ${got}.${broke ? " The shovel snaps." : ` Shovel: ${save.digging.shovel} dig${save.digging.shovel === 1 ? "" : "s"} left.`}` };
}
