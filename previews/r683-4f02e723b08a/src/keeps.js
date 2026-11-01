// Great Keeps (Tim, 2026-11-01: "buildings to explore like castles and keeps... reuse the platforming structure from the great
// trees... larger buildings... castles that you can get up on top of that have bridges that go over courtyards... floors...
// jump ups to different levels or stairs... you should be able to see... the ways up to the next floor").
//
// A Great Keep stands in some sections first seen from this release (`chance`, past `minRing`), on ground that has a landscape
// layer (so heights matter), in a clear block away from the plaza and the four ways through the section. It is built only from
// heights, the same rules as the great trees: walk up a stair (a slope) one level, jump up one level, drop any height (a fall
// hurts). From the gate:
//   courtyard (level 0) → stairs beside the gate (1) → the wall walk round the courtyard (2) → a stair to each corner tower (3)
//   → the corner towers (4); the far wall's gatehouse tower (4) → a bridge over the courtyard (4) → the keep's wall walk (4)
//   → jump up to the keep's upper floor (5) → jump up to its crown (6), where a Keep Rest and the keep's cache wait.
// Creatures hold the courtyard, the wall walk and the towers (they cannot change level). Bounded: one keep a section, built once.
import { hashSeed } from "./random.js?v=r683-4f02e723b08a";
import { canStep } from "./landscape.js?v=r683-4f02e723b08a";

export const KEEPS = {
  version: 1,
  chance: .06, minRing: 6,
  sizes: [[22, 20], [20, 18], [18, 16], [16, 14], [14, 13]], // tried largest first
  keep: 5, // the central keep's side
  levels: { wall: 2, tower: 4, bridge: 4, keepWall: 4, keepUpper: 5, crown: 6 },
  spawns: { court: 3, wall: 2, tower: 1 }, // creatures: in the courtyard, on the wall walk, on each corner tower
  undoTries: 6, // spots laid and undone (each a few thousand steps) before the section goes without
  fallback: ["ashling", "glassMite", "ashenHound", "rootBrute"],
  name: "Great Keep",
  messages: { arrive: "A Great Keep rises here. Its stair climbs from the gate to the wall walk, the towers and a bridge over the courtyard to the keep's crown." },
};

const I = (x, y) => y * 32 + x, WET = /ocean|Ocean|lake|Lake|swamp|Swamp|toxic|Toxic|water|Water|lava|abyss|river|canyon|mire|Mire|shallows|pool|Pool/;
export const keepHere = (seed, rx, ry) => Math.abs(rx) + Math.abs(ry) >= KEEPS.minRing && (hashSeed(`${seed}:great-keep:v1:${rx}:${ry}`) % 10000) / 10000 < KEEPS.chance;

// Build the keep into `map` (a 32×32 overworld section). Returns the keep's record (also map.keep) or null when nothing fits.
// The ways through the section (the exit lanes) and the plaza's heart stay open ground: where a lane crosses the wall it is a gate,
// where it crosses the wall walk the walk has a gap with a stair down on each side; the towers, the bridge and the keep never
// stand on them.
export function buildKeep(map, seed, rx, ry) {
  if (!map?.landscape || map.keep || map.castle || map.canopy) return null;
  const ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1, link = (x, y) => (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))); // each way's line, and its stretch to the middle
  const ground = (x, y) => lane(x, y) || link(x, y) || (x >= 14 && x <= 18 && y >= 14 && y <= 18);
  // The keep is built over the natural ground (rock, scrub, a rise, the trees, which it clears), never over water, lava, a
  // building, a structure or anything placed there.
  const ok = (x, y) => { const t = map.tiles[I(x, y)]; return !!t && !t.structure && !t.buildingId && !t.canopy && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && !(map.objects || []).some((o) => !o.decor && !o.environmental && Math.round(o.x) === x && Math.round(o.y) === y); };
  let undone = 0;
  for (const [W, H] of KEEPS.sizes) {
    const spots = []; for (let oy = 1; oy <= 31 - H; oy++) for (let ox = 1; ox <= 31 - W; ox++) spots.push([ox, oy]);
    spots.sort((a, b) => hashSeed(`${seed}:great-keep-spot:${rx}:${ry}:${a}`) - hashSeed(`${seed}:great-keep-spot:${rx}:${ry}:${b}`));
    for (const [ox, oy] of spots.slice(0, 300)) {
      let fits = true; for (let y = oy; y < oy + H && fits; y++) for (let x = ox; x < ox + W && fits; x++) { const q = map.tiles[I(x, y)]; fits = ok(x, y) && (!ground(x, y) || (!q.blocked && !q.slope && !(q.elev > 0))); } // a way through stays level ground
      if (!fits) continue;
      const plan = planKeep(ox, oy, W, H); let clear = true;
      for (const [k, r] of plan.roles) if (ground(k % 32, Math.floor(k / 32)) && !["court", "wall", "edge"].includes(r)) { clear = false; break; }
      if (!clear) continue;
      const oy2 = plan.gy + (plan.gateSouth ? 1 : -1), out = map.tiles[I(plan.gx, oy2)]; if (!out || out.structure || out.buildingId || WET.test(out.kind || "")) continue; // the gate opens onto the section
      if (out.blocked || out.elev > 0 || out.slope) map.tiles[I(plan.gx, oy2)] = { ...out, kind: "castleCourt", blocked: false, elev: 0, slope: false, landscape: "castle", keep: true }; // paved, if rock stood there
      const tiles = map.tiles.slice(), objects = map.objects.slice(), spawns = (map.enemySpawns || []).slice(), before = exitsOpen(map);
      const keep = layKeep(map, seed, rx, ry, plan, ground), after = exitsOpen(map);
      if (before.every((open, i) => !open || after[i])) return keep;
      map.tiles = tiles; map.objects = objects; map.enemySpawns = spawns; delete map.keep; // it would cut a way through: undo it
      if (++undone >= KEEPS.undoTries) return null;
    }
  }
  return null;
}

// Which of the section's four ways out can be walked to from its middle, on foot (no jumping), as the Wayfarer.
function exitsOpen(map) {
  const ex = map.exits || {}, seen = new Uint8Array(1024), q = [16 * 32 + 16], me = { isPlayer: true, jumping: false }; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const k = q[i], px = k % 32, py = (k / 32) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = px + dx, y = py + dy, n = y * 32 + x, t = map.tiles[n]; if (x < 0 || y < 0 || x > 31 || y > 31 || seen[n] || !t || t.blocked || !canStep(me, map, 32, px, py, x, y)) continue; seen[n] = 1; q.push(n); } }
  return [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]].map(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && !!seen[y * 32 + x]);
}
// Every cell's part in a keep at (ox, oy), W×H: edge (the curtain wall), wall (the wall walk), court, tower, gatehouse, keep,
// bridge, stair. The gate faces the section's middle.
function planKeep(ox, oy, W, H) {
  const K = KEEPS.keep, gateSouth = oy + H / 2 < 16, gx = ox + (W >> 1), gy = gateSouth ? oy + H - 1 : oy, dir = gateSouth ? -1 : 1, farY = gateSouth ? oy : oy + H - 1;
  const kx = ox + (W >> 1) - (K >> 1), ky = oy + (H >> 1) - (K >> 1) + (gateSouth ? 1 : -1), roles = new Map(), put = (x, y, r) => roles.set(I(x, y), r);
  for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) {
    const edge = x === ox || y === oy || x === ox + W - 1 || y === oy + H - 1, inner = x === ox + 1 || y === oy + 1 || x === ox + W - 2 || y === oy + H - 2;
    const corner = (x <= ox + 2 || x >= ox + W - 3) && (y <= oy + 2 || y >= oy + H - 3), gate = Math.abs(x - gx) <= 1 && (gateSouth ? y >= farY && y <= farY + 2 : y <= farY && y >= farY - 2);
    put(x, y, corner ? "tower" : gate ? "gatehouse" : edge ? "edge" : inner ? "wall" : x >= kx && x < kx + K && y >= ky && y < ky + K ? "keep" : "court");
  }
  put(gx, gy, "gate"); put(gx, gy + dir, "court");
  for (const sx of [gx - 2, gx + 2]) put(sx, gy + dir * 2, "stair1");
  for (const [cx, cy] of [[ox + 3, oy + 1], [ox + 1, oy + 3], [ox + W - 4, oy + 1], [ox + W - 2, oy + 3], [ox + 3, oy + H - 2], [ox + 1, oy + H - 4], [ox + W - 4, oy + H - 2], [ox + W - 2, oy + H - 4], [gx - 2, farY - dir], [gx + 2, farY - dir]]) put(cx, cy, "stair3"); // into each corner tower from both walks, and into the gatehouse
  const from = farY - dir * 3, to = gateSouth ? ky - 1 : ky + K; for (let y = Math.min(from, to); y <= Math.max(from, to); y++) put(gx, y, "bridge");
  return { ox, oy, W, H, K, kx, ky, gx, gy, gateSouth, dir, farY, roles };
}

function layKeep(map, seed, rx, ry, plan, ground) {
  const L = KEEPS.levels, { ox, oy, W, H, K, kx, ky, gx, gy, dir } = plan, set = (x, y, p) => { const i = I(x, y); map.tiles[i] = { ...map.tiles[i], x, y, blocked: false, slope: false, structure: undefined, ...p, landscape: "castle", keep: true }; };
  const inX = (x) => x >= ox && x < ox + W, inY = (y) => y >= oy && y < oy + H;
  for (const [k, r] of plan.roles) { const x = k % 32, y = Math.floor(k / 32);
    if (r === "tower" || r === "gatehouse") set(x, y, { kind: "battlement", elev: L.tower, keepTower: true });
    else if (r === "edge") set(x, y, ground(x, y) ? { kind: "castleCourt", elev: 0, gate: true } : { kind: "castleWall", blocked: true, elev: L.wall + 1 });
    else if (r === "wall") set(x, y, ground(x, y) ? { kind: "castleCourt", elev: 0 } : { kind: "battlement", elev: L.wall });
    else if (r === "gate") set(x, y, { kind: "castleCourt", elev: 0, gate: true });
    else if (r === "stair1") set(x, y, { kind: "castleStair", elev: 1, slope: true });
    else if (r === "stair3") set(x, y, { kind: "castleStair", elev: L.tower - 1, slope: true });
    else if (r === "bridge") set(x, y, { kind: "battlement", elev: L.bridge, keepBridge: true });
    else if (r === "keep") { const ring = x === kx || y === ky || x === kx + K - 1 || y === ky + K - 1, mid = x === kx + (K >> 1) && y === ky + (K >> 1); set(x, y, { kind: "battlement", elev: ring ? L.keepWall : mid ? L.crown : L.keepUpper, keepCore: true }); }
    else set(x, y, { kind: "castleCourt", elev: 0, ...(x === gx && y === gy + dir ? { gatehouse: true } : {}) });
  }
  // where a way through cuts the wall walk, a stair down on each side of the gap
  for (const [k, r] of plan.roles) { const x = k % 32, y = Math.floor(k / 32); if (r !== "wall" || !ground(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = plan.roles.get(I(x + dx, y + dy)); if (q === "wall" && !ground(x + dx, y + dy)) set(x + dx, y + dy, { kind: "castleStair", elev: 1, slope: true }); } }
  const crown = { x: kx + (K >> 1), y: ky + (K >> 1) }, h = (k) => hashSeed(`${seed}:great-keep:${rx}:${ry}:${k}`);
  map.objects = (map.objects || []).filter((o) => !(inX(Math.round(o.x)) && inY(Math.round(o.y)) && (o.decor || o.environmental)));
  map.objects.push({ id: `keep-rest-${rx}-${ry}`, kind: "crownRest", name: "Keep Rest", keepRest: true, x: crown.x, y: crown.y, elev: L.crown, state: "open", actions: [] });
  map.objects.push({ id: `keep-cache-${rx}-${ry}`, kind: "chest", name: "Keep Cache", x: crown.x + 1, y: crown.y, elev: L.keepUpper, state: "closed", actions: ["open"], rewardSource: "keep-cache" });
  map.objects.push({ id: `keep-gate-${rx}-${ry}`, kind: "ruinMarker", name: KEEPS.name, lore: "Stair, wall walk, tower and bridge: the way up is all in sight. At the crown, a rest and a cache.", x: gx + 1, y: gy + dir * 2, state: "quiet", actions: ["inspect"], landmark: true });
  // creatures, of the kinds already here: in the courtyard, on the wall walk and on each corner tower
  const kinds = [...new Set((map.enemySpawns || []).filter((e) => !e.boss && !e.ambient && !e.passiveBehavior && e.kind !== "npc").map((e) => e.kind))], pick = (k) => (kinds.length ? kinds : KEEPS.fallback)[h(k) % (kinds.length || KEEPS.fallback.length)];
  const spawns = [], add = (k, x, y) => { if (!spawns.some((q) => q.x === x && q.y === y)) spawns.push({ id: `keep-${rx}-${ry}-${k}`, kind: pick(k), x, y, keepGuard: true }); };
  const court = []; for (let y = oy + 2; y < oy + H - 2; y++) for (let x = ox + 2; x < ox + W - 2; x++) { const t = map.tiles[I(x, y)]; if (t.kind === "castleCourt" && !t.gatehouse && Math.abs(x - gx) + Math.abs(y - gy) > 3) court.push([x, y]); }
  for (let i = 0; i < KEEPS.spawns.court && court.length; i++) add(`court${i}`, ...court[h(`c${i}`) % court.length]);
  add("wall0", ox + 1, oy + (H >> 1)); add("wall1", ox + W - 2, oy + (H >> 1));
  for (const [i, [cx, cy]] of [[ox + 1, oy + 1], [ox + W - 2, oy + 1], [ox + 1, oy + H - 2], [ox + W - 2, oy + H - 2]].entries()) add(`tower${i}`, cx, cy);
  map.enemySpawns = [...(map.enemySpawns || []), ...spawns];
  map.keep = { x: ox, y: oy, w: W, h: H, gate: { x: gx, y: gy }, crown, version: KEEPS.version };
  return map.keep;
}
