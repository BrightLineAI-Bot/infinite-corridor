// Compounds (Tim, 2026-11-03: "buildings that have courtyards in the middle, and multiple doors so that you can come in and
// out of the building from different places... the building can seem larger on the inside... a Back Door to the keep... an
// entrance to a Courtyard... some doors that you can only access from within the Courtyard, so you have to find the path to
// get to the Courtyard... cross the Courtyard to get to the stairs... to the treasure room or the boss room... some of them
// are like mazes where you have to go in and out, through different doors... to get to the top").
//
// A compound is a ring of four wings round an open courtyard on the overworld, with a tower in the middle of the courtyard.
// The wings' roofs are one wall walk, high above the ground (a fatal drop; the drone lets you down). Every wing and the tower
// is a building of its own inside (floors that are areas of their own, joined by ladders, as in great-buildings.ts), with its
// own doors: an outer door onto the land round the compound, a courtyard door that opens only onto the courtyard, a hatch
// onto the wall walk from its top floor. Which wing has which is a hash of the seed and the section. In a maze compound no
// wing with an outer door has a courtyard door: you go in, up its ladders and out onto the wall walk, across it, and down
// through another wing's hatch and floors to reach the courtyard, and from the courtyard the tower climbs to the boss and the
// treasure room (and, sometimes, the tower's own roof). Everything is pinned per section (`atlas.compoundVersion`).
import { hashSeed } from "./random.js?v=r732-683fdfd90b67";
import { BUILDINGS, layFloor, farthest, addHoles } from "./great-buildings.js?v=r732-683fdfd90b67";
import { canStep } from "./landscape.js?v=r732-683fdfd90b67";

export const COMPOUNDS = {
  version: 1,
  chance: .14, minRing: 5,
  maze: .6, // share of compounds where no outer door reaches the courtyard
  sizes: [[14, 12], [13, 12], [13, 11], [12, 11], [12, 10], [11, 10]], // tried largest first
  ring: 3, tower: (W, H) => [W >= 13 ? 4 : 3, H >= 11 ? 3 : 2], // the tower leaves the courtyard at least a step all round
  wingFloors: [2, 3], towerFloors: [3, 4],
  elev: 5, crumbled: .07, rise: 2, // `rise`: natural ground up to this height is levelled to build on // the wall walk: a fatal height; this share of its inner cells has fallen in
  towerRoof: .6, // share of towers with a hatch onto their own roof
  wingCache: .35, // share of wings with a cache on their top floor
  interior: { wing: [22, 14], tower: [22, 20] },
  courtyardGuards: 2,
  styles: {
    keep: { name: "Castle Compound", wings: ["North Hall", "East Range", "Gatehouse", "West Range"], tower: "Keep Tower", top: "Throne Room" },
    apartment: { name: "Arcology Block", wings: ["North Block", "East Block", "South Block", "West Block"], tower: "Core Spire", top: "Penthouse Vault" },
    hive: { name: "Alien Hive", wings: ["North Lobe", "East Lobe", "South Lobe", "West Lobe"], tower: "Hive Heart", top: "Brood Chamber" },
  },
  messages: {
    arrive: "A walled compound stands here round its courtyard. Its doors lead different ways: find the one that gets you in.",
    court: "You step out into the courtyard.",
  },
};

const LIFT = .34; // landscape.ts LIFT_PER_LEVEL
export const compoundFaceH = (floors) => 1 + floors * .5;
const ID = /^compound:(.+):(-?\d+):(-?\d+):(keep|apartment|hive):(w[0-3]|t):(\d+)(r?):f(\d+)$/;
export const isCompoundId = (id) => ID.test(String(id || ""));
export function parseCompoundId(id) {
  const m = String(id || "").match(ID); if (!m) return null;
  return { seed: m[1], rx: Number(m[2]), ry: Number(m[3]), style: m[4], part: m[5], floors: Number(m[6]), roof: m[7] === "r", floor: Number(m[8]), base: `compound:${m[1]}:${m[2]}:${m[3]}:${m[4]}:${m[5]}:${m[6]}${m[7]}` };
}

// Does a compound stand here? Returns { style } or null (only for sections first seen from its release).
export function compoundHere(seed, rx, ry, region) {
  if (Math.abs(rx) + Math.abs(ry) < COMPOUNDS.minRing) return null;
  if ((hashSeed(`${seed}:compound:v1:${rx}:${ry}:roll`) % 10000) / 10000 >= COMPOUNDS.chance) return null;
  return { style: BUILDINGS.hiveRegions.includes(region?.type) ? "hive" : BUILDINGS.machine.includes(region?.type) ? "apartment" : "keep" };
}

// Which part has which doors (pure: the seed and the section). Parts 0–3 are the wings N, E, S, W; "t" is the tower.
export function compoundTopology(seed, rx, ry, style) {
  const h = (k) => hashSeed(`${seed}:compound:v1:${rx}:${ry}:${k}`), C = COMPOUNDS, maze = (h("maze") % 1000) / 1000 < C.maze;
  const wf = C.wingFloors[0] + h("wf") % (C.wingFloors[1] - C.wingFloors[0] + 1), tf = C.towerFloors[0] + h("tf") % (C.towerFloors[1] - C.towerFloors[0] + 1);
  const wings = [0, 1, 2, 3].map((w) => ({ part: `w${w}`, w, floors: wf, outer: false, court: false, hatch: false }));
  const a = h("outer") % 4; wings[a].outer = true; if (h("outer2") % 2) wings[(a + 2) % 4].outer = true;
  if (maze) { const others = wings.filter((q) => !q.outer), c = others[h("court") % others.length]; c.court = true; for (const q of wings) if (q.outer || q.court) q.hatch = true; for (const q of others) if (!q.court && h(`hatch${q.w}`) % 2) q.hatch = true; }
  else { wings[a].court = true; for (const q of wings) q.hatch = h(`hatch${q.w}`) % 3 > 0; if (!wings.some((q) => q.hatch)) wings[a].hatch = true; }
  for (const q of wings) q.cache = (h(`cache${q.w}`) % 1000) / 1000 < C.wingCache;
  const tower = { part: "t", floors: tf, court: true, hatch: (h("troof") % 1000) / 1000 < C.towerRoof };
  return { style, maze, wings, tower, parts: [...wings, tower] };
}
const partBase = (seed, rx, ry, style, p) => `compound:${seed}:${rx}:${ry}:${style}:${p.part}:${p.floors}${p.hatch ? "r" : ""}`;

// ------------------------------------------------------------------------------------------------ outside
const I = (x, y) => y * 32 + x, WET = /ocean|Ocean|lake|Lake|swamp|Swamp|toxic|Toxic|water|Water|lava|abyss|river|canyon|mire|Mire|shallows|pool|Pool/;
export function placeCompound(map, seed, rx, ry, plan, exitsOpen) {
  if (!map?.landscape || !map?.tiles?.length || map.keep || map.castle || map.canopy || map.greatBuilding) return null;
  const C = COMPOUNDS, T = compoundTopology(seed, rx, ry, plan.style), ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 13 && x <= 19 && y >= 13 && y <= 19);
  const objAt = (x, y) => (map.objects || []).some((o) => !o.decor && !o.environmental && !CLEARS.has(o.kind) && Math.round(o.x) === x && Math.round(o.y) === y);
  // A compound is built over the natural ground: rock, brush, a low rise and the trees go (the courtyard is levelled and paved);
  // never over water, lava, a building, a structure, a great tree or anything placed there.
  const natural = (t) => !!t && !t.structure && !t.buildingId && !t.canopy && !t.keep && !t.greatBuilding && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && (t.elev || 0) <= C.rise;
  const plain = (t) => natural(t) && !t.blocked && !t.slope && !(t.elev > 0);
  const ground = (x, y) => natural(map.tiles[I(x, y)]) && !lane(x, y) && !objAt(x, y), open = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32 && plain(map.tiles[I(x, y)]) && !objAt(x, y);
  const h = (k) => hashSeed(`${seed}:compound-spot:${rx}:${ry}:${k}`), R = C.ring;
  const wingFace = compoundFaceH(T.wings[0].floors), towerFace = compoundFaceH(T.tower.floors);
  let tries = 0;
  for (const [W, H] of C.sizes) {
    const [tw, th] = C.tower(W, H);
    const spots = []; for (let oy = 1; oy <= 31 - H; oy++) for (let ox = 1; ox <= 31 - W; ox++) spots.push([ox, oy]);
    spots.sort((a, b) => h(a) - h(b));
    for (const [ox, oy] of spots.slice(0, 240)) {
      let fits = true; for (let y = oy; y < oy + H && fits; y++) for (let x = ox; x < ox + W && fits; x++) fits = ground(x, y);
      if (!fits) continue;
      const wingOf = (x, y) => y < oy + R ? 0 : y >= oy + H - R ? 2 : x < ox + R ? 3 : x >= ox + W - R ? 1 : -1;
      const tx = ox + (W >> 1) - (tw >> 1), ty = oy + (H >> 1) - (th >> 1), inTower = (x, y) => x >= tx && x < tx + tw && y >= ty && y < ty + th;
      const ringCells = [], towerCells = [], court = [];
      for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) (wingOf(x, y) >= 0 ? ringCells : inTower(x, y) ? towerCells : court).push({ x, y });
      // doors: an outer door on a wing's outer face, a courtyard door on its inner face, a hatch on its roof
      const pick = (cells, k) => cells.length ? cells[h(k) % cells.length] : null, doors = {};
      for (const q of T.wings) { const w = q.w, D = doors[q.part] = { exits: {}, inner: {} };
        if (q.outer) { const face = w === 0 ? range(ox + R, ox + W - R - 1).map((x) => [x, oy, x, oy - 1]) : w === 2 ? range(ox + R, ox + W - R - 1).map((x) => [x, oy + H - 1, x, oy + H]) : w === 3 ? range(oy + R, oy + H - R - 1).map((y) => [ox, y, ox - 1, y]) : range(oy + R, oy + H - R - 1).map((y) => [ox + W - 1, y, ox + W, y]);
          const c = pick(face.filter(([, , x, y]) => open(x, y)), `o${w}`); if (c) { D.exits["building-exit-outer"] = { x: c[2], y: c[3] }; D.inner.outer = { x: c[0], y: c[1], face: ["north", "east", "south", "west"][w] }; } }
        if (q.court) { const face = w === 0 ? range(ox + R, ox + W - R - 1).map((x) => [x, oy + R - 1, x, oy + R]) : w === 2 ? range(ox + R, ox + W - R - 1).map((x) => [x, oy + H - R, x, oy + H - R - 1]) : w === 3 ? range(oy + R, oy + H - R - 1).map((y) => [ox + R - 1, y, ox + R, y]) : range(oy + R, oy + H - R - 1).map((y) => [ox + W - R, y, ox + W - R - 1, y]);
          const c = pick(face.filter(([, , x, y]) => !inTower(x, y)), `c${w}`); if (c) { D.exits["building-exit-court"] = { x: c[2], y: c[3] }; D.inner.court = { x: c[0], y: c[1], face: ["south", "west", "north", "east"][w] }; } }
        if (q.hatch) { const mid = w === 0 ? range(ox + 2, ox + W - 3).map((x) => [x, oy + 1]) : w === 2 ? range(ox + 2, ox + W - 3).map((x) => [x, oy + H - 2]) : w === 3 ? range(oy + R, oy + H - R - 1).map((y) => [ox + 1, y]) : range(oy + R, oy + H - R - 1).map((y) => [ox + W - 2, y]);
          const c = pick(mid, `h${w}`); if (c) D.hatch = { x: c[0], y: c[1] }; } }
      { const D = doors.t = { exits: {}, inner: {} }, faces = [...range(tx, tx + tw - 1).map((x) => [x, ty + th - 1, x, ty + th, "south"]), ...range(tx, tx + tw - 1).map((x) => [x, ty, x, ty - 1, "north"])];
        const c = faces.find(([, , x, y]) => court.some((q) => q.x === x && q.y === y)) && pick(faces.filter(([, , x, y]) => court.some((q) => q.x === x && q.y === y)).slice(0, tw), "td");
        if (c) { D.exits["building-exit-court"] = { x: c[2], y: c[3] }; D.inner.court = { x: c[0], y: c[1], face: c[4] }; }
        if (T.tower.hatch) D.hatch = { x: tx + (tw >> 1), y: ty + (th >> 1) }; }
      // the way in must hold: from outside, by the doors, the wall walk and the courtyard, to the tower
      if (!solvable(T, doors)) { if (++tries >= 8) return null; continue; }
      const tiles = map.tiles.slice(), objects = (map.objects || []).slice(), spawns = (map.enemySpawns || []).slice(), before = exitsOpen(map);
      const hatchCells = Object.values(doors).map((D) => D.hatch).filter(Boolean), nearHatch = (x, y) => hatchCells.some((q) => Math.abs(q.x - x) + Math.abs(q.y - y) <= 1);
      const roofTile = (x, y, face, crumbled = false) => { const i = I(x, y); map.tiles[i] = { ...map.tiles[i], x, y, kind: plan.style === "keep" ? "castleCourt" : "arcFloor", landscape: plan.style === "keep" ? "castle" : "arcology", blocked: crumbled, slope: false, elev: C.elev, roofLift: face / (C.elev * LIFT), structure: "buildingRoof", greatBuilding: true, roofHole: crumbled || undefined, environment: undefined, canopy: undefined }; };
      const crumbled = [];
      for (const c of ringCells) { const inner = wingOf(c.x, c.y) >= 0 && c.x > ox && c.y > oy && c.x < ox + W - 1 && c.y < oy + H - 1, fall = inner && !nearHatch(c.x, c.y) && (hashSeed(`${seed}:compound-roof:${rx}:${ry}:${c.x}:${c.y}`) % 1000) / 1000 < C.crumbled; if (fall) crumbled.push(c); roofTile(c.x, c.y, wingFace, fall); }
      // the wall walk must join every hatch on it: mend fallen cells (last first) until it does
      const ringHatches = T.wings.filter((q) => doors[q.part].hatch).map((q) => doors[q.part].hatch);
      while (crumbled.length && !roofJoins(map, ringHatches)) { const c = crumbled.pop(); roofTile(c.x, c.y, wingFace, false); }
      for (const c of towerCells) roofTile(c.x, c.y, towerFace);
      for (const c of court) { const i = I(c.x, c.y), t = map.tiles[i]; map.tiles[i] = { ...t, ...(plan.style !== "hive" || t.blocked ? { kind: plan.style === "hive" ? "arcFloor" : plan.style === "keep" ? "castleCourt" : "arcFloor", landscape: plan.style === "keep" ? "castle" : "arcology" } : {}), blocked: false, slope: false, elev: 0, courtyard: true, environment: undefined }; } // levelled and paved
      const after = exitsOpen(map), outsideOk = T.wings.filter((q) => doors[q.part].exits["building-exit-outer"]).every((q) => walkable(map, doors[q.part].exits["building-exit-outer"]));
      if (!before.every((o, i) => !o || after[i]) || !outsideOk) { map.tiles = tiles; map.objects = objects; map.enemySpawns = spawns; if (++tries >= 8) return null; continue; }
      const inside = (o) => o.x >= ox - .5 && o.x < ox + W - .5 && o.y >= oy - .5 && o.y < oy + H - .5, id = `compound-${rx}-${ry}`, S = C.styles[plan.style];
      map.objects = (map.objects || []).filter((o) => !inside(o) || (plan.style === "hive" && (o.decor || o.environmental) && !CLEARS.has(o.kind) && court.some((q) => q.x === Math.round(o.x) && q.y === Math.round(o.y))));
      map.enemySpawns = (map.enemySpawns || []).filter((e) => !inside(e));
      const blocks = [{ part: "ring", cells: ringCells, faceH: wingFace, floors: T.wings[0].floors }, { part: "t", cells: towerCells, faceH: towerFace, floors: T.tower.floors }];
      const drawnDoors = [], hatches = [];
      for (const p of T.parts) { const D = doors[p.part]; for (const k of ["outer", "court"]) if (D.inner[k]) drawnDoors.push({ ...D.inner[k], part: p.part, kind: k }); if (D.hatch) hatches.push({ ...D.hatch, part: p.part, faceH: p.part === "t" ? towerFace : wingFace }); }
      map.objects.push({ id, kind: "greatBuilding", v: 2, name: S.name, style: plan.style, compound: true, maze: T.maze, x: ox + (W >> 1), y: oy + H - 1, bounds: { x: ox, y: oy, w: W, h: H }, footprint: [...ringCells, ...towerCells], blocks, doors: drawnDoors, hatches, crumbled, grain: h("grain") % 97, state: "closed", actions: [] });
      for (const p of T.parts) { const D = doors[p.part], base = partBase(seed, rx, ry, plan.style, p), rec = { rx, ry, exits: D.exits, hatch: D.hatch || null }, label = p.part === "t" ? S.tower : S.wings[p.w];
        if (D.exits["building-exit-outer"]) map.objects.push({ id: `${id}-${p.part}-outer`, kind: "dungeon", buildingDoor: true, compoundDoor: true, buildingDoors: rec, dungeonId: `${base}:f1`, dungeonType: "compound", name: `${S.name}: ${label}`, identity: `a door into the ${label}`, ...D.exits["building-exit-outer"], state: "open", actions: ["enter"], enterAt: "outer", landmark: true, lore: `${S.name}. This door leads into the ${label}; others lead elsewhere.` });
        if (D.exits["building-exit-court"]) map.objects.push({ id: `${id}-${p.part}-court`, kind: "dungeon", buildingDoor: true, compoundDoor: true, buildingDoors: rec, dungeonId: `${base}:f1`, dungeonType: "compound", name: `${label} (courtyard door)`, ...D.exits["building-exit-court"], state: "open", actions: ["enter"], enterAt: "court" });
        if (D.hatch) map.objects.push({ id: `${id}-${p.part}-hatch`, kind: "dungeon", buildingDoor: true, roofHatch: true, compoundDoor: true, buildingDoors: rec, dungeonId: `${base}:f${p.floors}`, dungeonType: "compound", name: `${label} (roof hatch)`, ...D.hatch, elev: C.elev, state: "open", actions: ["enter"], enterAt: "roof" }); }
      // the courtyard is held
      const kinds = BUILDINGS.styles[plan.style].guards, free = court.filter((c) => !Object.values(doors).some((D) => Object.values(D.exits).some((q) => q.x === c.x && q.y === c.y)));
      for (let i = 0; i < C.courtyardGuards && free.length; i++) { const c = free[h(`cg${i}`) % free.length]; if (!map.enemySpawns.some((e) => e.x === c.x && e.y === c.y)) map.enemySpawns.push({ id: `${id}-court-${i}`, kind: kinds[h(`cgk${i}`) % kinds.length], x: c.x, y: c.y, courtyardGuard: true }); }
      map.greatBuilding = { id, compound: true, style: plan.style, maze: T.maze, version: C.version };
      return map.objects.find((o) => o.id === id);
    }
  }
  return null;
}
const CLEARS = new Set(["tree", "treeShrub", "treeSpindle", "rock", "wayfindingCue"]); // cleared away where a compound is built
const range = (a, b) => { const out = []; for (let v = a; v <= b; v++) out.push(v); return out; };
// From outside, by doors and the wall walk, can the courtyard (and so the tower) be reached?
function solvable(T, doors) {
  const reach = new Set(["outside"]), edges = [];
  for (const q of T.wings) { const D = doors[q.part]; if (D.exits["building-exit-outer"]) edges.push(["outside", q.part]); if (D.exits["building-exit-court"]) edges.push(["court", q.part]); if (D.hatch) edges.push(["walk", q.part]); }
  if (!doors.t.exits["building-exit-court"]) return false;
  for (let k = 0; k < 10; k++) for (const [a, b] of edges) { if (reach.has(a)) reach.add(b); if (reach.has(b)) reach.add(a); }
  return reach.has("court");
}
// Do the open roof cells join every hatch on the wall walk?
function roofJoins(map, hatches) {
  if (hatches.length < 2) return true;
  const ok = (t) => t && t.structure === "buildingRoof" && !t.blocked, seen = new Set([I(hatches[0].x, hatches[0].y)]), q = [hatches[0]];
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = I(x, y); if (x < 0 || y < 0 || x > 31 || y > 31 || seen.has(k) || !ok(map.tiles[k])) continue; seen.add(k); q.push({ x, y }); } }
  return hatches.every((p) => seen.has(I(p.x, p.y)));
}
// Can `p` be walked to from the section's middle, on foot (no jumping), as the Wayfarer?
function walkable(map, p) {
  const me = { isPlayer: true, jumping: false }, seen = new Uint8Array(1024), q = [16 * 32 + 16]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const k = q[i], px = k % 32, py = (k / 32) | 0; if (px === p.x && py === p.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = px + dx, y = py + dy, n = y * 32 + x, t = map.tiles[n]; if (x < 0 || y < 0 || x > 31 || y > 31 || seen[n] || !t || t.blocked || !canStep(me, map, 32, px, py, x, y)) continue; seen[n] = 1; q.push(n); } }
  return false;
}

// ------------------------------------------------------------------------------------------------ inside
const memo = new Map();
export function compoundPartPlan(base) {
  if (memo.has(base)) return memo.get(base);
  const P = parseCompoundId(`${base}:f1`); if (!P) return null;
  const T = compoundTopology(P.seed, P.rx, P.ry, P.style), part = T.parts.find((q) => q.part === P.part), S = BUILDINGS.styles[P.style];
  const [W, H] = P.part === "t" ? COMPOUNDS.interior.tower : COMPOUNDS.interior.wing, h = (k) => hashSeed(`${base}:plan:${k}`);
  // floor 1's doors: the outer door on the far (bottom) wall, the courtyard door on the near (top) wall; the tower's at the bottom
  const doors = {}; if (part.outer) doors.outer = { x: 3 + h("ox") % (W - 6), y: H - 1, inner: { x: 0, y: H - 2 } };
  if (part.court) doors.court = P.part === "t" ? { x: 3 + h("cx") % (W - 6), y: H - 1, inner: { x: 0, y: H - 2 } } : { x: 3 + h("cx") % (W - 6), y: 0, inner: { x: 0, y: 1 } };
  for (const d of Object.values(doors)) d.inner.x = d.x;
  const first = doors.outer?.inner || doors.court?.inner || { x: W >> 1, y: H >> 1 }, floors = []; let arrive = first;
  for (let f = 1; f <= P.floors; f++) {
    const keep = f === 1 ? Object.values(doors).flatMap((d) => [{ x: d.x, y: d.y, v: 2 }, { ...d.inner, v: 2 }]) : [];
    const L = layFloor(base, f, W, H, S, arrive, keep), top = f === P.floors, far = farthest(L, arrive, () => true);
    const up = top ? null : far[h(`up${f}`) % Math.max(1, Math.ceil(far.length * .12))];
    floors.push({ ...L, floor: f, arrive, up, top, far }); if (up) arrive = up;
  }
  for (const F of floors) if (F.floor > 1) addHoles(base, F, floors[F.floor - 2], W, H);
  const plan = { base, ...P, part, W, H, doors, entry: first, floors, partName: P.part === "t" ? COMPOUNDS.styles[P.style].tower : COMPOUNDS.styles[P.style].wings[part.w] };
  if (memo.size > 40) memo.clear(); memo.set(base, plan); return plan;
}

export function generateCompoundFloor(seed, id) {
  const P = parseCompoundId(id), plan = P && compoundPartPlan(P.base); if (!plan) return null;
  const S = BUILDINGS.styles[P.style], CS = COMPOUNDS.styles[P.style], F = plan.floors[P.floor - 1], { W, H } = plan, tiles = [], holes = new Set((F.holes || []).map(([x, y]) => y * W + x));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, g = F.grid[k], rm = F.room[k];
    const nb = rm >= 0 ? rm : [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => F.room[(y + dy) * W + x + dx]).find((v) => v >= 0);
    const floorKind = nb !== undefined && nb >= 0 ? F.mat[nb] : S.hall;
    if (holes.has(k)) tiles.push({ x, y, kind: "floorHole", blocked: false, hole: true, detail: k % 4 });
    else if (g === 1) tiles.push({ x, y, kind: S.wall, blocked: true, detail: (x * 3 + y) % 4 });
    else if (g === 4) tiles.push({ x, y, kind: "rubbleFloor", blocked: true, rubble: true, detail: k % 4 });
    else tiles.push({ x, y, kind: floorKind, blocked: false, doorway: g === 2, detail: (x * 7 + y * 3) % 4 }); }
  const tower = P.part === "t", top = P.floor === P.floors, floorName = tower && top ? CS.top : `${P.floor === 1 ? "Ground Floor" : `Floor ${P.floor}`}`;
  const objects = [], enemySpawns = [], name = `${plan.partName} · ${floorName}`;
  const entry = P.floor === 1 ? { ...plan.entry } : stepOff(tiles, W, F.arrive), entries = {};
  if (P.floor === 1) for (const [k, d] of Object.entries(plan.doors)) { objects.push({ id: `building-exit-${k}`, kind: "exit", name: k === "outer" ? "Door out" : "Courtyard door", x: d.x, y: d.y, state: "open", actions: ["exit"] }); entries[k] = { ...d.inner }; }
  else objects.push({ id: "building-stair-down", kind: "buildingStair", name: `Ladder down · ${P.floor === 2 ? "Ground Floor" : `Floor ${P.floor - 1}`}`, x: F.arrive.x, y: F.arrive.y, state: "open", actions: ["descend"], toId: `${P.base}:f${P.floor - 1}`, toX: F.arrive.x, toY: F.arrive.y, toFloor: P.floor - 1, dir: "down" });
  if (F.up) objects.push({ id: "building-stair-up", kind: "buildingStair", name: `Ladder up · ${tower && P.floor + 1 === P.floors ? CS.top : `Floor ${P.floor + 1}`}`, x: F.up.x, y: F.up.y, state: "open", actions: ["climb"], toId: `${P.base}:f${P.floor + 1}`, toX: F.up.x, toY: F.up.y, toFloor: P.floor + 1, dir: "up" });
  const C = BUILDINGS.creatures, h = (k) => hashSeed(`${P.base}:f${P.floor}:${k}`), n = (tower ? 3 : 2) + h("n") % 2;
  const taken = new Set(objects.map((o) => o.y * W + o.x)), free = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole && !t.doorway && !taken.has(y * W + x); };
  const spots = F.far.filter((p) => p.d >= C.far && free(p.x, p.y)), used = new Set();
  for (const p of spots) { if (enemySpawns.length >= n) break; const rm = F.room[p.y * W + p.x]; if (used.has(rm)) continue; used.add(rm); taken.add(p.y * W + p.x);
    enemySpawns.push({ id: `${id}:g${enemySpawns.length}`, kind: S.guards[h(`k${enemySpawns.length}`) % S.guards.length], x: p.x, y: p.y, buildingGuard: true }); }
  if (top && (tower || plan.part.cache)) { const c = spots.find((p) => !taken.has(p.y * W + p.x)) || F.far[0];
    if (c) { objects.push({ id: "building-cache", kind: "chest", name: tower ? `${CS.top} Cache` : `${plan.partName} Cache`, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(c.y * W + c.x);
      if (tower) { const g = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).find((q) => free(q.x, q.y)); if (g) enemySpawns.push({ id: `${id}:guardian`, kind: S.guardian, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true }); } } }
  if (top && P.roof) { const gd = enemySpawns.find((e) => e.buildingGuardian), clear = (p) => !gd || Math.hypot(gd.x - p.x, gd.y - p.y) >= BUILDINGS.roofLadderClear;
    const q = F.far.find((p) => free(p.x, p.y) && clear(p) && Math.abs(p.x - F.arrive.x) + Math.abs(p.y - F.arrive.y) > 3) || [...F.far].reverse().find((p) => free(p.x, p.y) && clear(p)) || F.far.find((p) => free(p.x, p.y));
    if (q) objects.push({ id: "building-roof-ladder", kind: "buildingStair", name: tower ? "Ladder up · the tower roof" : "Ladder up · the wall walk", x: q.x, y: q.y, state: "open", actions: ["climb"], dir: "roof" }); }
  const roofLadder = objects.find((o) => o.dir === "roof");
  return { seed, id, recipe: "greatBuilding", name, identity: `${COMPOUNDS.styles[P.style].name}: the ${plan.partName}, ${floorName.toLowerCase()} of ${P.floors}`, danger: "falling floors", width: W, height: H, tiles, entry, exit: null, objects, enemySpawns,
    building: { base: P.base, style: P.style, floor: P.floor, floors: P.floors, roof: P.roof, compound: true, part: P.part, entries, breachEntry: null, roofLadder: roofLadder ? { x: roofLadder.x, y: roofLadder.y } : null }, layoutVersion: 1, themePool: 0 };
}
function stepOff(tiles, W, p) {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const t = tiles[(p.y + dy) * W + p.x + dx]; if (t && !t.blocked && !t.hole && t.x === p.x + dx) return { x: p.x + dx, y: p.y + dy }; }
  return { x: p.x, y: p.y };
}
