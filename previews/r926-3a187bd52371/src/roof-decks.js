// Roof decks (Tim, 2026-11-12: "explore the 3D space with existing mobility... get on top of shacks and houses if you can reach
// the height... there must always be a way down"). The roof of a shelter's shack, a hamlet's hut or a ruin district's house is a
// surface the Wayfarer can stand on, `levels` above the ground its footprint stands on. Nothing is generated or stored on the
// map: the decks are read from the house tiles a section already has (their `buildingId` and `structure`) into an index kept
// beside the map (a WeakMap), so the world, its digests and its saves are unchanged. Only overworld sections with a landscape
// have decks (the levels are landscape levels); interiors never do.
//
// Reaching a deck takes the height: a jump climbs one level, so a deck is reached from ground one level below it (a bank, a
// rise beside the house) or from a neighbouring roof, and by the drone or the glider coming down onto it; never by a jump from
// the ground the house stands on (every deck is at least two levels up). Leaving one is a drop by the ordinary fall rule
// (landscape.ts fallDamage). `safeDrop`: a deck is never higher than this many levels over the ground outside its door, so the
// way down by the door is always survivable (40% of health at most).
//
// Game rules that read the decks (game.ts): the walls of a house whose deck the Wayfarer stands on, or is in the air high
// enough to reach, do not stop them (footprintOpen's deckReach); the deck is their height for melee reach (playerLevel) and
// for falls; ground creatures and their pathing are unchanged. Mounts, the robot, the skiff and rafts never use decks.
export const ROOF_DECKS = Object.freeze({
  version: 1,
  // levels over the footprint's ground, by kind: a shelter's shack, a hamlet's house, a district house by its facadeHeight (1-3)
  levels: Object.freeze({ shack: 2, hut: 2, district: Object.freeze([2, 3, 3]) }),
  maxLevels: 3, // never more than this over the footprint's own ground
  safeDrop: 3, // never more than this over the ground outside the door (fallDamage: 3 levels is 40%, never fatal)
  minLevels: 2, // a deck lower than this over its ground (after safeDrop) is not a deck: ground melee would still reach it
  structures: /^(shack|district)(Wall|Interior|Door)$/,
});
const SIDE = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };
// The deck kind and levels of a house object (null: no object, the tiles' own structure decides).
export function roofDeckLevels(o, structure = "") {
  const L = ROOF_DECKS.levels;
  let n;
  if (o?.kind === "shack") n = L.shack;
  else if (o?.kind === "architecturalBuilding") n = o.settlementBuilding ? L.hut : L.district[Math.max(0, Math.min(L.district.length - 1, (Math.round(Number(o.facadeHeight)) || 1) - 1))];
  else n = String(structure).startsWith("shack") ? L.shack : L.hut;
  return Math.max(0, Math.min(ROOF_DECKS.maxLevels, n));
}
export function roofDeckKind(o) { return o?.kind === "shack" ? "shack" : o?.settlementBuilding ? "hut" : o?.kind === "architecturalBuilding" ? "district" : "house"; }
const INDEX = new WeakMap();
const EMPTY = Object.freeze({ tiles: null, width: 0, cells: null, decks: Object.freeze([]), byId: new Map() });
// Whether a map can have decks at all.
export function roofDecksApply(map) { return !!map?.landscape && map.interiorTerrain?.version !== 1 && !map.building && Array.isArray(map.tiles); }
// The index of a map's decks, built once per map (and again only if its tile array is replaced). Pure apart from the cache.
export function roofDeckIndex(map) {
  if (!roofDecksApply(map)) return EMPTY;
  const known = INDEX.get(map); if (known && known.tiles === map.tiles) return known;
  const tiles = map.tiles, width = Math.max(1, Number(map.width) || 32), height = Math.floor(tiles.length / width), houses = new Map();
  for (let i = 0; i < width * height; i++) { const t = tiles[i]; if (!t?.buildingId || !ROOF_DECKS.structures.test(String(t.structure || ""))) continue;
    let H = houses.get(t.buildingId); if (!H) { H = { id: t.buildingId, cells: [], structure: t.structure, base: -Infinity }; houses.set(t.buildingId, H); }
    H.cells.push(i); H.base = Math.max(H.base, Number(t.elev) || 0); }
  const cells = new Int16Array(width * height), decks = [], byId = new Map(), objects = new Map();
  for (const o of map.objects || []) if (o && houses.has(o.id)) objects.set(o.id, o);
  for (const H of houses.values()) { const o = objects.get(H.id), set = new Set(H.cells), levels = roofDeckLevels(o, H.structure);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, door = null, approach = Infinity;
    for (const i of H.cells) { const x = i % width, y = Math.floor(i / width), t = tiles[i]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
      const d = t.doorSide && SIDE[t.doorSide]; if (d) { const ox = x + d[0], oy = y + d[1], j = oy * width + ox, out = ox >= 0 && oy >= 0 && ox < width && oy < height && !set.has(j) ? tiles[j] : null;
        if (out && !out.blocked) { const e = Number(out.elev) || 0; if (e < approach || !door) { approach = Math.min(approach, e); door = { x: ox, y: oy, side: t.doorSide }; } } } }
    let level = H.base + levels; if (Number.isFinite(approach)) level = Math.min(level, approach + ROOF_DECKS.safeDrop);
    if (!(level - H.base >= ROOF_DECKS.minLevels)) continue;
    const deck = Object.freeze({ id: H.id, n: decks.length, kind: roofDeckKind(o), base: H.base, level, x0, y0, x1, y1, door, roofProfile: o?.roofProfile || "gable", cells: Object.freeze(H.cells.slice()) });
    decks.push(deck); byId.set(H.id, deck); for (const i of H.cells) cells[i] = decks.length; }
  const index = { tiles, width, cells, decks: Object.freeze(decks), byId };
  INDEX.set(map, index); return index;
}
// The deck over tile index i (its house tile still there), or null. O(1).
export function roofDeckOfTile(map, i) {
  const X = roofDeckIndex(map); if (!X.cells || i < 0 || i >= X.cells.length) return null;
  const k = X.cells[i]; if (!k) return null; const d = X.decks[k - 1];
  return map.tiles[i]?.buildingId === d.id ? d : null; // a house tile replaced since (a void scar, a dig) is no longer roof
}
// The deck whose roof is over the point (fx, fy) (the Wayfarer's feet: x + .5, y + .75), or null.
export function roofDeckAt(map, fx, fy) {
  const X = roofDeckIndex(map); if (!X.cells) return null; const tx = Math.floor(fx), ty = Math.floor(fy);
  if (tx < 0 || ty < 0 || tx >= X.width || ty >= Math.floor(X.cells.length / X.width)) return null;
  return roofDeckOfTile(map, ty * X.width + tx);
}
// The Wayfarer's collision box over a position (x, y), as game.ts footprintOpen reads it: x + .24..x + .76, y + .5..y + .88.
export const DECK_FOOT_BOX = Object.freeze({ left: .24, right: .76, top: .5, bottom: .88 });
// A deck with a house tile under the collision box at (x, y): deck `id` when given (null when none of its tiles is under the box),
// else the highest one at or under `maxLevel`. At most four tiles, no allocation. The edge of a roof (game.ts deckEdgeHold): the feet
// have left the roof but the box still stands over its walls.
export function roofDeckUnderBox(map, x, y, maxLevel = Infinity, id = null) {
  const X = roofDeckIndex(map); if (!X.cells || !Number.isFinite(x) || !Number.isFinite(y)) return null; const B = DECK_FOOT_BOX, h = Math.floor(X.cells.length / X.width);
  let best = null;
  for (let ty = Math.floor(y + B.top); ty <= Math.floor(y + B.bottom - 1e-6); ty++) for (let tx = Math.floor(x + B.left); tx <= Math.floor(x + B.right - 1e-6); tx++) {
    if (tx < 0 || ty < 0 || tx >= X.width || ty >= h) continue; const d = roofDeckOfTile(map, ty * X.width + tx); if (!d) continue;
    if (id != null) { if (d.id === id) return d; continue; }
    if (d.level <= maxLevel + 1e-6 && (!best || d.level > best.level)) best = d; }
  return best;
}
export function roofDeckById(map, id) { return id == null ? null : roofDeckIndex(map).byId.get(id) || null; }
// The level of the deck over tile index i, or Infinity (footprintOpen: walls of a deck at or under `deckReach` do not stop).
export function roofDeckLevelOfTile(map, i) { const d = roofDeckOfTile(map, i); return d ? d.level : Infinity; }
// Is any deck within `r` tiles of the point, at or under `maxLevel` (and at least `minLevel`)? For a jump's lazy height hold.
export function roofDeckNear(map, fx, fy, maxLevel, r = 1) {
  const X = roofDeckIndex(map); if (!X.decks.length) return false; const tx = Math.floor(fx), ty = Math.floor(fy), h = Math.floor(X.cells.length / X.width);
  for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) { if (x < 0 || y < 0 || x >= X.width || y >= h) continue; const d = roofDeckOfTile(map, y * X.width + x); if (d && d.level <= maxLevel) return true; }
  return false;
}
// The saved deck ({ id, level }) checked against the map: the deck itself when it is still there at that level under the feet.
export function validRoofDeck(map, saved, fx, fy) {
  if (!saved || typeof saved !== "object" || typeof saved.id !== "string" || !Number.isFinite(Number(saved.level))) return null;
  const d = roofDeckAt(map, fx, fy); return d && d.id === saved.id && d.level === Number(saved.level) ? d : null;
}
// The saved form (playerRuntime.roofDeck, additive at schema 14): { id, level } or null.
export function normalizeRoofDeck(q) {
  if (!q || typeof q !== "object" || Array.isArray(q) || typeof q.id !== "string" || !q.id || !Number.isFinite(Number(q.level))) return null;
  return { ...q, id: q.id, level: Math.round(Number(q.level)) };
}
