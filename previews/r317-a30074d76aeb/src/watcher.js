// The Watcher's sigil in the world (release 289; Tim, 2026-10-22). "The symbol represents... the coterminous nature of the
// corridor. The top symbol is a closed eyelid. So even when the eye is closed... the second symbol is the eye, which is
// existence, reality... the watcher, the wanderer... still open, still aware... the slash across is... coterminous with
// everything... touching everything... in all directions, the vision is continuous... and the symbol below are the tools...
// for accessing it." "The listener is there, listening, but the symbol that dominates the corridor is the watcher."
//
// The sigil, laid out in tiles, appears as:
//   - a floor inlay in some dungeons (rare) and a large mosaic with an ornate border in arenas;
//   - a rare overworld shrine ruin whose raised platforms are the sigil (each part one jump above the next), with a
//     pristine Watcher's tomb on the eye;
//   - pristine Watcher's tombs (very rare; "the glyph is just very bright... a little halo above it") in shelters, crypts
//     and shrines. Touched, a tomb folds the Wayfarer elsewhere: across the corridor from the overworld (the shelter
//     Folded Seam's displacement), or to a far corner of the same dungeon from below.
// Generation is pinned: overworld sections first seen from 289 on (atlas `watcherVersion`), and dungeons first entered from
// 289 on (history `watcherVersion`); nothing changes in places already explored. Pure data and placement; game.ts calls in.
import { hashSeed, rng } from "./random.js?v=r317-a30074d76aeb";

export const WATCHER = {
  version: 1,
  shelterTomb: .03,   // chance a shelter in a newly seen section holds a pristine tomb
  cryptTomb: .35,     // chance a bone crypt dungeon holds one
  shrine: .25,        // chance a newly seen section rolls for a shrine ruin; it also needs open flat ground (about 1 in 25 has it), so ~1 in 100
  dungeonFloor: .2,   // chance a dungeon rolls for the sigil inlay; about 1 in 3 has room, so ~6%
  foldMinTiles: 10,   // a tomb below ground carries the Wayfarer at least this far
};

// The sigil as tile offsets from the eye: { dx, dy, part, lift }. `lift` is the shrine platform height.
function line(ax, ay, bx, by) { const out = [], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let i = 0; i <= n; i++) out.push([Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n)]); return out; }
export const SIGIL_CELLS = (() => {
  const cells = new Map(), put = (dx, dy, part, lift) => { const k = `${dx},${dy}`, was = cells.get(k); if (!was || lift > was.lift) cells.set(k, { dx, dy, part, lift }); };
  for (const [dx, dy] of [[-1, -6], [0, -6], [1, -6], [-2, -5], [2, -5]]) put(dx, dy, "lid", 1);              // the closed eyelid
  for (let a = 0; a < 64; a++) { const dx = Math.round(Math.cos(a / 64 * Math.PI * 2) * 3), dy = Math.round(Math.sin(a / 64 * Math.PI * 2) * 3); put(dx, dy, "ring", 1); }
  for (const [dx, dy] of [[-2, 0], [-1, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1]]) put(dx, dy, "eye", 1);
  put(0, 0, "pupil", 2);                                                                                       // the eye open
  for (const [dx, dy] of line(-5, 3, 5, -3)) put(dx, dy, "orbit", 1);                                          // coterminous
  for (const [dx, dy] of [...line(-1, 5, 1, 6), ...line(1, 6, 0, 8)]) put(dx, dy, "tools", 1);                // the tools
  put(1, 4, "tools", 1);                                                                                       // the short stroke
  return [...cells.values()];
})();
export const SIGIL_BOUNDS = { minX: -5, maxX: 5, minY: -6, maxY: 8 };

// Can the sigil sit with its eye at (cx, cy)? `ok(tile, x, y)` says whether a tile may carry it.
export function sigilFits(map, width, cx, cy, ok, margin = 1) {
  const h = Math.floor(map.tiles.length / width);
  if (margin < 0) { // the sigil's own tiles only (a shrine: the ground between its parts may be anything)
    for (const c of SIGIL_CELLS) { const x = cx + c.dx, y = cy + c.dy; if (x < 1 || y < 1 || x >= width - 1 || y >= h - 1 || !ok(map.tiles[y * width + x], x, y, cx, cy)) return false; }
    return true;
  }
  for (let y = cy + SIGIL_BOUNDS.minY - margin; y <= cy + SIGIL_BOUNDS.maxY + margin; y++) for (let x = cx + SIGIL_BOUNDS.minX - margin; x <= cx + SIGIL_BOUNDS.maxX + margin; x++) {
    if (x < 1 || y < 1 || x >= width - 1 || y >= h - 1 || !ok(map.tiles[y * width + x], x, y, cx, cy)) return false;
  }
  return true;
}
// The first spot (scanning outward from the map's centre, seeded) where the sigil fits.
export function sigilSpot(map, width, seedKey, ok, margin = 1) {
  const h = Math.floor(map.tiles.length / width), mx = Math.floor(width / 2), my = Math.floor(h / 2), r = rng(seedKey), jx = Math.floor(r() * 5) - 2, jy = Math.floor(r() * 5) - 2;
  const spots = [];
  const m = Math.max(0, margin);
  for (let y = 1 - SIGIL_BOUNDS.minY + m; y < h - 1 - SIGIL_BOUNDS.maxY - m; y++) for (let x = 1 - SIGIL_BOUNDS.minX + m; x < width - 1 - SIGIL_BOUNDS.maxX - m; x++) spots.push([x, y]);
  spots.sort((a, b) => Math.hypot(a[0] - mx - jx, a[1] - my - jy) - Math.hypot(b[0] - mx - jx, b[1] - my - jy));
  for (const [x, y] of spots.slice(0, 220)) if (sigilFits(map, width, x, y, ok, margin)) return { x, y };
  return null;
}
// Marks the sigil's tiles (`tile.sigil = part`); with `shrine`, raises them as platforms (elev + lift).
export function inlaySigil(map, width, cx, cy, { shrine = false, mosaic = false } = {}) {
  for (const c of SIGIL_CELLS) { const i = (cy + c.dy) * width + cx + c.dx, t = map.tiles[i]; map.tiles[i] = { ...t, sigil: c.part, ...(shrine ? { elev: (t.elev || 0) + c.lift, sigilShrine: true } : {}) }; }
  if (mosaic) { // an ornate border of tesserae around the sigil (arenas)
    for (let y = cy + SIGIL_BOUNDS.minY - 1; y <= cy + SIGIL_BOUNDS.maxY + 1; y++) for (let x = cx + SIGIL_BOUNDS.minX - 1; x <= cx + SIGIL_BOUNDS.maxX + 1; x++) {
      const i = y * width + x, t = map.tiles[i]; if (!t || t.sigil || t.blocked) continue;
      const edge = y === cy + SIGIL_BOUNDS.minY - 1 || y === cy + SIGIL_BOUNDS.maxY + 1 || x === cx + SIGIL_BOUNDS.minX - 1 || x === cx + SIGIL_BOUNDS.maxX + 1;
      map.tiles[i] = { ...t, sigil: edge ? "border" : "tessera" };
    }
  }
  return { x: cx, y: cy };
}

const CLEARABLE = new Set(["tree", "rock", "wayfindingCue"]);
const walkableFloor = (t) => !!t && !t.blocked && !t.structure && !t.door && !t.slope && !t.build && !t.environment;
const occupied = (map) => new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));

// A pristine tomb object at (x, y).
export function watcherTomb(id, x, y, where) { return { id, kind: "watcherTomb", name: "Pristine Tomb of the Watcher", x, y, state: "sealed", actions: ["touch"], where }; }

// Overworld: a shrine ruin (rare) and a tomb in a shelter (rare). Only for sections first seen from release 289 on.
export function placeWatcherOverworld(map, width, seed, rx, ry) {
  if (!map?.tiles || (rx === 0 && ry === 0) || map.watcherPlaced) return null; map.watcherPlaced = true; // once per loaded map
  const objectsAt = occupied(map), level = (t) => t.elev || 0;
  let shrine = null;
  if (map.landscape && rng(`${seed}:watcher-shrine:v1:${rx}:${ry}`)() < WATCHER.shrine) {
    // The ruin claims flat open ground; trees, rocks and wayfinding marks within it are cleared, anything else rules a spot out.
    const solid = new Set((map.objects || []).filter((o) => !CLEARABLE.has(o.kind)).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
    const spot = sigilSpot(map, width, `${seed}:watcher-shrine-spot:v1:${rx}:${ry}`, (t, x, y, cx, cy) => walkableFloor(t) && !solid.has(`${x},${y}`) && !!t.landscape && level(t) === level(map.tiles[cy * width + cx]), -1);
    if (spot) {
      const inside = (o) => o.x >= spot.x + SIGIL_BOUNDS.minX - .5 && o.x <= spot.x + SIGIL_BOUNDS.maxX + .5 && o.y >= spot.y + SIGIL_BOUNDS.minY - .5 && o.y <= spot.y + SIGIL_BOUNDS.maxY + .5;
      map.objects = (map.objects || []).filter((o) => !(CLEARABLE.has(o.kind) && inside(o)));
      inlaySigil(map, width, spot.x, spot.y, { shrine: true }); shrine = spot; map.objects.push(watcherTomb(`watcher-tomb-shrine-${rx}-${ry}`, spot.x, spot.y, "shrine"));
    }
  }
  let shelter = null;
  if (rng(`${seed}:watcher-shelter:v1:${rx}:${ry}`)() < WATCHER.shelterTomb) {
    const cells = map.tiles.map((t, i) => [t, i % width, Math.floor(i / width)]).filter(([t, x, y]) => t?.structure === "shackInterior" && !objectsAt.has(`${x},${y}`));
    if (cells.length) { const [, x, y] = cells[hashSeed(`${seed}:watcher-shelter-spot:v1:${rx}:${ry}`) % cells.length]; shelter = { x, y }; (map.objects ||= []).push(watcherTomb(`watcher-tomb-shelter-${rx}-${ry}`, x, y, "shelter")); }
  }
  return { shrine, shelter };
}

// Dungeons: a floor inlay (rare), a mosaic in arenas, and a tomb in bone crypts (some). Only for dungeons first entered from
// release 289 on.
export function placeWatcherDungeon(map, width, seed, id) {
  if (!map?.tiles || map.underwater || map.watcherPlaced) return null; map.watcherPlaced = true;
  const objectsAt = occupied(map), floor = (t, x, y) => walkableFloor(t) && !objectsAt.has(`${x},${y}`);
  let inlay = null, tomb = null;
  if (map.arena || rng(`${seed}:watcher-floor:v1:${id}`)() < WATCHER.dungeonFloor) {
    const spot = sigilSpot(map, width, `${seed}:watcher-floor-spot:v1:${id}`, floor, -1);
    if (spot) inlay = inlaySigil(map, width, spot.x, spot.y, { mosaic: !!map.arena });
  }
  const crypt = map.tiles.some((t) => t?.kind === "sarcophagus");
  if (crypt && rng(`${seed}:watcher-crypt:v1:${id}`)() < WATCHER.cryptTomb) {
    const cells = map.tiles.map((t, i) => [t, i % width, Math.floor(i / width)]).filter(([t, x, y]) => floor(t, x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.tiles[(y + dy) * width + x + dx]?.kind === "sarcophagus"));
    if (cells.length) { const [, x, y] = cells[hashSeed(`${seed}:watcher-crypt-spot:v1:${id}`) % cells.length]; tomb = { x, y }; (map.objects ||= []).push(watcherTomb(`watcher-tomb-crypt-${hashSeed(id) % 100000}`, x, y, "crypt")); }
  }
  return { inlay, tomb };
}

// Where a tomb below ground folds the Wayfarer: a reachable floor tile at least WATCHER.foldMinTiles away, seeded.
export function dungeonFoldTarget(floorKeys, width, from, key) {
  if (!(floorKeys instanceof Set)) return null;
  const far = [...floorKeys].map((k) => ({ x: k % width, y: Math.floor(k / width) })).filter((c) => Math.hypot(c.x - from.x, c.y - from.y) >= WATCHER.foldMinTiles);
  return far.length ? far[hashSeed(key) % far.length] : null;
}
