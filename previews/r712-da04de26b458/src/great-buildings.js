// Great buildings (Tim, 2026-11-03: "more like actual buildings... a building that has multiple floors that you can, on each
// floor, walk around on and fight enemies, and the floor is separate from the other floor so you have to find a way to get
// through and a way to get to the top... floors can be dilapidated or falling through... opaque from the outside... some of
// them can have broken backsides... when you enter it... you're inside of that building... mosaic floors... carpets... wood
// plank floors... rendered similar to the shacks... and when you go inside, it has just traversable floor space").
//
// Outside, a great building is a closed, opaque block on the overworld, drawn like the shacks (roof, a facade with a row of
// windows a floor, one door); some have a broken back with a second way in. It stands in some sections first seen from this
// release (`chance`, past `minRing`), in place of the climbable keeps and arcologies of releases 683 and 685 (sections seen
// before keep theirs). Inside, every floor is an area of its own (a dungeon id a floor, so each keeps its own state): rooms
// split by inner walls with doorways, each room laid with its own floor (mosaic, carpet, planks, flagstones, tile), a stair up
// somewhere across the floor from where you came in, and above the ground floor, holes where the floor has fallen through
// (step in and you drop to the floor below, hurt; jump and you clear them). The top floor holds the building's guardian and
// its cache. Everything is a hash of the seed and the building (ids carry the style and the floor count), built per floor.
import { hashSeed, rng } from "./random.js?v=r712-da04de26b458";

export const BUILDINGS = {
  version: 1,
  chance: .09, minRing: 4,
  machine: ["glasslands", "biomech", "emberlands", "ashfields", "crystal", "obsidian", "alien"], // apartments stand here
  apartmentShare: .3, // elsewhere, this share are apartments and the rest keeps
  breach: .35, // share with a broken back, a second way in
  // Tim: "you should be able to get on the roofs of these buildings, not all of them, but some of them... sections of the roof
  // ... crumbling... get on top of the roof and look out... you can hop off... if you don't have the drone... you'll die".
  // A roof is high ground on the overworld (`elev`, a fatal height: the drone's booster lets you down), reached by a ladder
  // from the top floor through a hatch; `crumbled` of it has fallen in. Only in sections with a landscape layer.
  roof: { share: .55, elev: 5, crumbled: .1 },
  roofLadderClear: 9, // the roof ladder stands at least this far from the top floor's guardian (game.ts ARRIVAL.clear is 8)
  styles: {
    keep: {
      name: "Old Keep", footprints: [[9, 7], [8, 7], [8, 6]], floors: [3, 4], size: [28, 22],
      wall: "keepWall", hall: "mosaicFloor", rooms: ["flagFloor", "carpetFloor", "plankFloor", "flagFloor"],
      guards: ["ashling", "ashenHound", "rootBrute", "coilStalker"], guardian: "hollowMarshal", cache: "keep-cache",
      floorNames: ["Great Hall", "Gallery", "Solar", "High Chamber"],
    },
    apartment: {
      name: "Ruined Arcology", footprints: [[8, 8], [8, 7], [7, 7]], floors: [3, 5], size: [24, 20],
      wall: "aptWall", hall: "tileFloor", rooms: ["plankFloor", "carpetFloor", "concreteFloor", "tileFloor"],
      guards: ["glassMite", "sparkWarden", "cinderWisp", "veilMoth"], guardian: "voidSentinel", cache: "arcology-cache",
      floorNames: ["Atrium", "Second Floor", "Third Floor", "Fourth Floor", "Penthouse"],
    },
  },
  split: { min: 4, at: 9 }, // rooms: a block is split while its side is at least `at`; no room narrower than `min`
  extraDoors: .25, // share of inner walls given a second doorway (collapsed brickwork)
  holes: { share: .04, cluster: 3, clear: 2 }, // of a floor's open ground above the first; kept `clear` steps from either stair
  rubble: .015, // blocked rubble a floor, never where it would cut the floor in two
  creatures: { perFloor: [3, 5], far: 5, scale: { hp: .14, damage: .08 }, guardian: { hp: 2.2, damage: 1.3, affixes: 1 } },
  fall: .1, // share of max health a fall through the floor costs
  messages: {
    arrive: "A great building stands here, shut and dark. Its door is the way in.",
    enter: "inside",
    climb: "You climb the ladder to",
    descend: "You climb down the ladder to",
    roof: "You climb out through the hatch onto the roof. Mind the edge: it is a long way down.",
    fall: "The floor gives way: you fall through to",
    top: "the top floor: its guardian and its cache wait somewhere across it",
  },
};

export const FLOOR_KINDS = ["mosaicFloor", "carpetFloor", "plankFloor", "flagFloor", "tileFloor", "concreteFloor", "rubbleFloor", "floorHole"];
export const WALL_KINDS = ["keepWall", "aptWall"];

const ID = /^building:(.+):(-?\d+):(-?\d+):(keep|apartment):(\d+)(r?):f(\d+)$/; // `r`: it has a roof to stand on
export const isBuildingId = (id) => ID.test(String(id || ""));
export function parseBuildingId(id) {
  const m = String(id || "").match(ID); if (!m) return null;
  return { seed: m[1], rx: Number(m[2]), ry: Number(m[3]), style: m[4], floors: Number(m[5]), roof: m[6] === 'r', floor: Number(m[7]), base: `building:${m[1]}:${m[2]}:${m[3]}:${m[4]}:${m[5]}${m[6]}` };
}
export const buildingFloorId = (base, floor) => `${base}:f${floor}`;

// Does a great building stand in this section (seed, coordinates, its region)? Returns { style, floors } or null.
export function buildingHere(seed, rx, ry, region) {
  if (Math.abs(rx) + Math.abs(ry) < BUILDINGS.minRing) return null;
  const h = (k) => (hashSeed(`${seed}:great-building:v1:${rx}:${ry}:${k}`) % 10000) / 10000;
  if (h("roll") >= BUILDINGS.chance) return null;
  const style = BUILDINGS.machine.includes(region?.type) || h("style") < BUILDINGS.apartmentShare ? "apartment" : "keep", S = BUILDINGS.styles[style];
  return { style, floors: S.floors[0] + Math.floor(h("floors") * (S.floors[1] - S.floors[0] + 1)) };
}

// ------------------------------------------------------------------------------------------------ outside, on the overworld
const LIFT = .34; // landscape.ts LIFT_PER_LEVEL (not imported, so this module stays free of the landscape)
// The facade's drawn height in tiles: a band a floor. A roof is drawn at its top, so the Wayfarer on it stands where it is drawn.
export const facadeHeight = (H, floors) => Math.min(H - 2.2, 1 + floors * .5);
const I = (x, y) => y * 32 + x, WET = /ocean|Ocean|lake|Lake|swamp|Swamp|toxic|Toxic|water|Water|lava|abyss|river|canyon|mire|Mire|shallows|pool|Pool/;
// Lay the building into `map` (a 32×32 overworld section): a footprint of blocked tiles, the `greatBuilding` object that draws
// it, the door (a `dungeon` object, so entering works as for any crossing) and, for a broken back, a second door.
// `exitsOpen(map)` (keeps.ts) checks the section's ways out; a spot that would cut one is not used. Returns the record or null.
export function placeBuilding(map, seed, rx, ry, plan, exitsOpen) {
  if (!map?.tiles?.length || map.keep || map.castle || map.canopy || map.greatBuilding) return null;
  const S = BUILDINGS.styles[plan.style], ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 13 && x <= 19 && y >= 13 && y <= 19);
  const objAt = (x, y) => (map.objects || []).some((o) => !o.decor && !o.environmental && Math.round(o.x) === x && Math.round(o.y) === y);
  const ground = (x, y) => { const t = map.tiles[I(x, y)]; return !!t && !t.blocked && !t.slope && !(t.elev > 0) && !t.structure && !t.buildingId && !t.canopy && !t.keep && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && !lane(x, y) && !objAt(x, y); };
  const open = (x, y) => { const t = map.tiles[I(x, y)]; return !!t && !t.blocked && !t.slope && !(t.elev > 0) && !t.structure && !t.buildingId && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && !objAt(x, y); };
  const h = (k) => hashSeed(`${seed}:great-building-spot:${rx}:${ry}:${k}`);
  let tries = 0;
  for (const [W, H] of S.footprints) {
    const spots = []; for (let oy = 2; oy <= 30 - H; oy++) for (let ox = 2; ox <= 30 - W; ox++) spots.push([ox, oy]);
    spots.sort((a, b) => h(a) - h(b));
    for (const [ox, oy] of spots.slice(0, 260)) {
      let fits = true; for (let y = oy; y < oy + H && fits; y++) for (let x = ox; x < ox + W && fits; x++) fits = ground(x, y);
      if (!fits) continue;
      const south = oy + H / 2 < 16, dx = ox + (W >> 1), dy = south ? oy + H - 1 : oy, out = { x: dx, y: dy + (south ? 1 : -1) }; // the door faces the section's middle
      if (!open(out.x, out.y)) continue;
      const breach = (hashSeed(`${seed}:great-building:v1:${rx}:${ry}:breach`) % 1000) / 1000 < BUILDINGS.breach;
      const bx = ox + 1 + (h("bx") % Math.max(1, W - 2)), by = south ? oy : oy + H - 1, bout = { x: bx, y: by + (south ? -1 : 1) };
      const back = breach && open(bout.x, bout.y);
      const R = BUILDINGS.roof, roof = !!map.landscape && (hashSeed(`${seed}:great-building:v1:${rx}:${ry}:roof`) % 1000) / 1000 < R.share;
      const faceH = facadeHeight(H, plan.floors), lift = faceH / (R.elev * LIFT), hatch = { x: ox + (W >> 1) + (h("hx") % 3) - 1, y: oy + 2 + (h("hy") % Math.max(1, H - 4)) };
      const tiles = map.tiles.slice(), before = exitsOpen(map), footprint = [], crumbled = [];
      for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) { footprint.push({ x, y }); const i = I(x, y);
        if (!roof) { map.tiles[i] = { ...map.tiles[i], x, y, blocked: true, slope: false, greatBuilding: true, environment: undefined }; continue; }
        const inner = x > ox && y > oy && x < ox + W - 1 && y < oy + H - 1, fallen = inner && Math.abs(x - hatch.x) + Math.abs(y - hatch.y) > 1 && (hashSeed(`${seed}:great-building-roof:${rx}:${ry}:${x}:${y}`) % 1000) / 1000 < R.crumbled;
        if (fallen) crumbled.push({ x, y });
        map.tiles[i] = { ...map.tiles[i], x, y, kind: plan.style === "keep" ? "castleCourt" : "arcFloor", landscape: plan.style === "keep" ? "castle" : "arcology", blocked: fallen, slope: false, elev: R.elev, roofLift: lift, structure: "buildingRoof", greatBuilding: true, roofHole: fallen || undefined, environment: undefined, canopy: undefined }; }
      const after = exitsOpen(map);
      if (!before.every((o, i) => !o || after[i])) { map.tiles = tiles; if (++tries >= 6) return null; continue; }
      const base = `building:${seed}:${rx}:${ry}:${plan.style}:${plan.floors}${roof ? 'r' : ''}`, id = `great-building-${rx}-${ry}`;
      map.objects = (map.objects || []).filter((o) => !(o.x >= ox - .5 && o.x < ox + W - .5 && o.y >= oy - .5 && o.y < oy + H - .5));
      map.enemySpawns = (map.enemySpawns || []).filter((e) => !(e.x >= ox - .5 && e.x < ox + W - .5 && e.y >= oy - .5 && e.y < oy + H - .5));
      const rec = { id, kind: "greatBuilding", name: S.name, style: plan.style, floors: plan.floors, x: dx, y: oy + H - 1, bounds: { x: ox, y: oy, w: W, h: H }, footprint, door: { x: dx, y: dy, side: south ? "south" : "north" }, breach: back ? { x: bx, y: by } : null, roof: roof ? { elev: R.elev, hatch, crumbled } : null, faceH, grain: h("grain") % 97, state: "closed", actions: [] };
      map.objects.push(rec);
      const doors = { rx, ry, front: out, breach: back ? bout : null, hatch: roof ? hatch : null };
      map.objects.push({ id: `${id}-door`, kind: "dungeon", buildingDoor: true, buildingDoors: doors, dungeonId: buildingFloorId(base, 1), dungeonType: "greatBuilding", name: S.name, identity: `${plan.floors} floors, shut and dark`, x: out.x, y: out.y, state: "open", actions: ["enter"], landmark: true, lore: `${S.name}: ${plan.floors} floors. The door is the way in; somewhere above, its guardian and its cache.` });
      if (roof) map.objects.push({ id: `${id}-hatch`, kind: "dungeon", buildingDoor: true, roofHatch: true, buildingDoors: doors, dungeonId: buildingFloorId(base, plan.floors), dungeonType: "greatBuilding", name: `${S.name} (roof hatch)`, x: hatch.x, y: hatch.y, elev: R.elev, state: "open", actions: ["enter"], enterAt: "roof" });
      if (back) map.objects.push({ id: `${id}-breach`, kind: "dungeon", buildingDoor: true, breachDoor: true, buildingDoors: doors, dungeonId: buildingFloorId(base, 1), dungeonType: "greatBuilding", name: `${S.name} (broken wall)`, x: bout.x, y: bout.y, state: "open", actions: ["enter"], enterAt: "breach" });
      map.greatBuilding = { id, base, style: plan.style, floors: plan.floors, roof, version: BUILDINGS.version };
      return rec;
    }
  }
  return null;
}

// ------------------------------------------------------------------------------------------------ inside, a floor at a time
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const memo = new Map();
// Every floor of a building, laid in order (each floor's stair up stands where the next floor's stair down is).
export function buildingPlan(base) {
  if (memo.has(base)) return memo.get(base);
  const P = parseBuildingId(`${base}:f1`); if (!P) return null;
  const S = BUILDINGS.styles[P.style], [W, H] = S.size, floors = [];
  const h = (k) => hashSeed(`${base}:plan:${k}`);
  const door = { x: W >> 1, y: H - 1 }, entry = { x: W >> 1, y: H - 2 };
  const breach = (hashSeed(`${P.seed}:great-building:v1:${P.rx}:${P.ry}:breach`) % 1000) / 1000 < BUILDINGS.breach ? { x: 3 + h("breach") % (W - 6), y: 0 } : null;
  let arrive = entry;
  for (let f = 1; f <= P.floors; f++) {
    const L = layFloor(base, f, W, H, S, arrive, f === 1 ? [{ ...door, v: 2 }, { ...entry, v: 2 }, ...(breach ? [{ ...breach, v: 3 }, { x: breach.x, y: 1, v: 3 }] : [])] : []);
    const top = f === P.floors, far = farthest(L, arrive, (x, y) => true);
    const up = top ? null : far[h(`up${f}`) % Math.max(1, Math.ceil(far.length * .12))];
    floors.push({ ...L, floor: f, arrive, up, top, far });
    if (up) arrive = up;
  }
  // holes above the ground floor, over open ground on the floor below, clear of the stairs and never cutting the way up
  for (const F of floors) if (F.floor > 1) addHoles(base, F, floors[F.floor - 2], W, H);
  const plan = { base, ...P, W, H, door, entry, breach, floors };
  if (memo.size > 24) memo.clear(); memo.set(base, plan); return plan;
}

function layFloor(base, f, W, H, S, arrive, keepOpen) {
  const r = rng(`${base}:floor:${f}`), grid = new Array(W * H).fill(1), room = new Array(W * H).fill(-1), leaves = [];
  const at = (x, y) => y * W + x, wall = (x, y) => grid[at(x, y)] === 1;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) grid[at(x, y)] = 0;
  const walls = [];
  const split = (x0, y0, x1, y1) => { // an open block, inclusive
    const w = x1 - x0 + 1, hh = y1 - y0 + 1, M = BUILDINGS.split;
    const canV = w >= M.at && w >= M.min * 2 + 1, canH = hh >= M.at && hh >= M.min * 2 + 1;
    if (!canV && !canH) { leaves.push({ x0, y0, x1, y1 }); return; }
    const vert = canV && (!canH || w > hh || (w === hh && r() < .5));
    if (vert) { const c = x0 + M.min + Math.floor(r() * (w - M.min * 2)); for (let y = y0; y <= y1; y++) grid[at(c, y)] = 1; walls.push({ vert, c, a: y0, b: y1 }); split(x0, y0, c - 1, y1); split(c + 1, y0, x1, y1); }
    else { const c = y0 + M.min + Math.floor(r() * (hh - M.min * 2)); for (let x = x0; x <= x1; x++) grid[at(x, c)] = 1; walls.push({ vert, c, a: x0, b: x1 }); split(x0, y0, x1, c - 1); split(x0, c + 1, x1, y1); }
  };
  split(1, 1, W - 2, H - 2);
  leaves.forEach((q, i) => { for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) room[at(x, y)] = i; });
  // materials: the largest room is the hall
  const big = leaves.reduce((b, q, i) => ((q.x1 - q.x0 + 1) * (q.y1 - q.y0 + 1) > (leaves[b].x1 - leaves[b].x0 + 1) * (leaves[b].y1 - leaves[b].y0 + 1) ? i : b), 0);
  const mat = leaves.map((q, i) => i === big ? S.hall : S.rooms[(hashSeed(`${base}:mat:${f}:${i}`)) % S.rooms.length]);
  // doorways: each wall gets one (more for collapsed brickwork), at a cell that opens room to room on both sides
  const opens = (x, y, vert) => vert ? !wall(x - 1, y) && !wall(x + 1, y) : !wall(x, y - 1) && !wall(x, y + 1);
  for (const q of walls) { const cells = []; for (let v = q.a; v <= q.b; v++) { const [x, y] = q.vert ? [q.c, v] : [v, q.c]; if (opens(x, y, q.vert)) cells.push([x, y]); }
    if (!cells.length) continue; const n = 1 + (r() < BUILDINGS.extraDoors ? 1 : 0);
    for (let k = 0; k < n; k++) { const [x, y] = cells[Math.floor(r() * cells.length)]; grid[at(x, y)] = 2; } }
  for (const p of keepOpen) if (grid[at(p.x, p.y)] === 1 || p.v === 3) grid[at(p.x, p.y)] = p.v; // the door, the way in, a broken back wall
  if (grid[at(arrive.x, arrive.y)] === 1) grid[at(arrive.x, arrive.y)] = 2;
  if (N4.every(([dx, dy]) => grid[at(arrive.x + dx, arrive.y + dy)] === 1)) for (const [dx, dy] of N4) { const x = arrive.x + dx, y = arrive.y + dy; if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[at(x, y)] = 2; } // arriving where two walls cross: break through them
  // join anything still cut off (a doorway that opened into a later wall), and check the arrival reaches every open cell
  const reach = () => { const seen = new Uint8Array(W * H), q = [at(arrive.x, arrive.y)]; seen[q[0]] = 1; for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = at(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || grid[n] === 1 || grid[n] === 4) continue; seen[n] = 1; q.push(n); } } return seen; };
  for (let guard = 0; guard < 40; guard++) { const seen = reach(); let fixed = false;
    for (let y = 1; y < H - 1 && !fixed; y++) for (let x = 1; x < W - 1 && !fixed; x++) { const k = at(x, y); if (grid[k] !== 1) continue;
      const a = [[x - 1, y], [x + 1, y]], b = [[x, y - 1], [x, y + 1]];
      for (const [p, q] of [a, b]) { const i = at(p[0], p[1]), j = at(q[0], q[1]); if (grid[i] !== 1 && grid[j] !== 1 && grid[i] !== 4 && grid[j] !== 4 && seen[i] !== seen[j]) { grid[k] = 2; fixed = true; break; } } }
    if (!fixed) break; }
  // rubble: a few blocked heaps in the rooms, never cutting the floor in two
  const seen0 = reach(), count = (s) => s.reduce((n, v) => n + v, 0), total = count(seen0), cells = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (grid[at(x, y)] === 0 && Math.abs(x - arrive.x) + Math.abs(y - arrive.y) > 2) cells.push([x, y]);
  cells.sort((a, b) => hashSeed(`${base}:rub:${f}:${a}`) - hashSeed(`${base}:rub:${f}:${b}`));
  for (const [x, y] of cells.slice(0, Math.round(cells.length * BUILDINGS.rubble))) { grid[at(x, y)] = 4; if (count(reach()) !== total - 1) grid[at(x, y)] = 0; }
  return { W, H, grid, room, leaves, mat, walls };
}

// Open cells by distance from `from`, farthest first (only cells `ok` allows, ignoring holes).
function farthest(L, from, ok) {
  const { W, H, grid } = L, dist = new Int32Array(W * H).fill(-1), q = [from.y * W + from.x]; dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || dist[n] >= 0 || grid[n] === 1 || grid[n] === 4) continue; dist[n] = dist[k] + 1; q.push(n); } }
  const out = []; for (let k = 0; k < W * H; k++) if (dist[k] > 0 && grid[k] === 0 && ok(k % W, (k / W) | 0)) out.push({ x: k % W, y: (k / W) | 0, d: dist[k] });
  return out.sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x);
}

function addHoles(base, F, below, W, H) {
  const B = BUILDINGS.holes, at = (x, y) => y * W + x, near = (p, x, y) => p && Math.abs(p.x - x) + Math.abs(p.y - y) <= B.clear;
  const ok = (x, y) => F.grid[at(x, y)] === 0 && below.grid[at(x, y)] === 0 && !near(F.arrive, x, y) && !near(F.up, x, y) && !near(below.up, x, y) && !near(below.arrive, x, y);
  const cand = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ok(x, y)) cand.push([x, y]);
  cand.sort((a, b) => hashSeed(`${base}:hole:${F.floor}:${a}`) - hashSeed(`${base}:hole:${F.floor}:${b}`));
  const want = Math.round(cand.length * B.share), holes = [];
  for (const [x, y] of cand) { if (holes.length >= want) break; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]].slice(0, B.cluster)) { const hx = x + dx, hy = y + dy; if (ok(hx, hy) && !holes.some((q) => q[0] === hx && q[1] === hy)) holes.push([hx, hy]); } }
  // every open cell must still be reachable from the arrival without stepping in a hole: drop holes (newest first) until so
  const reachAll = () => { const set = new Set(holes.map(([x, y]) => at(x, y))), seen = new Uint8Array(W * H), q = [at(F.arrive.x, F.arrive.y)]; seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const n = at(x + dx, y + dy); if (seen[n] || F.grid[n] === 1 || F.grid[n] === 4 || set.has(n)) continue; seen[n] = 1; q.push(n); } }
    for (let k = 0; k < W * H; k++) if ((F.grid[k] === 0 || F.grid[k] === 2) && !set.has(k) && !seen[k]) return false; return true; };
  while (holes.length && !reachAll()) holes.pop();
  F.holes = holes;
}

// The dungeon map for one floor (`id` as `buildingFloorId`).
export function generateBuildingFloor(seed, id) {
  const P = parseBuildingId(id), plan = P && buildingPlan(P.base); if (!plan) return null;
  const S = BUILDINGS.styles[P.style], F = plan.floors[P.floor - 1], { W, H } = plan, tiles = [], holes = new Set((F.holes || []).map(([x, y]) => y * W + x));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, g = F.grid[k], rm = F.room[k];
    const nb = rm >= 0 ? rm : [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => F.room[(y + dy) * W + x + dx]).find((v) => v >= 0);
    const floorKind = nb !== undefined && nb >= 0 ? F.mat[nb] : S.hall;
    if (holes.has(k)) tiles.push({ x, y, kind: "floorHole", blocked: false, hole: true, detail: k % 4 });
    else if (g === 1) tiles.push({ x, y, kind: S.wall, blocked: true, detail: (x * 3 + y) % 4 });
    else if (g === 4) tiles.push({ x, y, kind: "rubbleFloor", blocked: true, rubble: true, detail: k % 4 });
    else if (g === 3) tiles.push({ x, y, kind: "rubbleFloor", blocked: false, detail: k % 4 });
    else tiles.push({ x, y, kind: floorKind, blocked: false, doorway: g === 2, detail: (x * 7 + y * 3) % 4 }); }
  const objects = [], enemySpawns = [], name = `${S.name} · ${S.floorNames[P.floor - 1] || `Floor ${P.floor}`}`;
  const entry = P.floor === 1 ? { ...plan.entry } : stepOff(tiles, W, F.arrive);
  if (P.floor === 1) { objects.push({ id: "building-exit", kind: "exit", name: "Door out", x: plan.door.x, y: plan.door.y, state: "open", actions: ["exit"] });
    if (plan.breach) objects.push({ id: "building-breach", kind: "exit", name: "Broken wall", x: plan.breach.x, y: plan.breach.y, state: "open", actions: ["exit"] }); }
  else objects.push({ id: "building-stair-down", kind: "buildingStair", name: `Ladder down · ${S.floorNames[P.floor - 2] || `floor ${P.floor - 1}`}`, x: F.arrive.x, y: F.arrive.y, state: "open", actions: ["descend"], toId: buildingFloorId(P.base, P.floor - 1), toX: F.arrive.x, toY: F.arrive.y, toFloor: P.floor - 1, dir: "down" });
  if (F.up) objects.push({ id: "building-stair-up", kind: "buildingStair", name: `Ladder up · ${S.floorNames[P.floor] || `floor ${P.floor + 1}`}`, x: F.up.x, y: F.up.y, state: "open", actions: ["climb"], toId: buildingFloorId(P.base, P.floor + 1), toX: F.up.x, toY: F.up.y, toFloor: P.floor + 1, dir: "up" });
  // creatures: one a room, the rooms farthest from where you come in first; the top floor's guardian by its cache
  const C = BUILDINGS.creatures, h = (k) => hashSeed(`${P.base}:f${P.floor}:${k}`), n = C.perFloor[0] + h("n") % (C.perFloor[1] - C.perFloor[0] + 1);
  const taken = new Set(objects.map((o) => o.y * W + o.x)), free = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole && !t.doorway && !taken.has(y * W + x); };
  const spots = F.far.filter((p) => p.d >= C.far && free(p.x, p.y)), used = new Set();
  for (const p of spots) { if (enemySpawns.length >= n) break; const rm = F.room[p.y * W + p.x]; if (used.has(rm)) continue; used.add(rm); taken.add(p.y * W + p.x);
    enemySpawns.push({ id: `${id}:g${enemySpawns.length}`, kind: S.guards[h(`k${enemySpawns.length}`) % S.guards.length], x: p.x, y: p.y, buildingGuard: true }); }
  if (F.top) { const c = spots.find((p) => !taken.has(p.y * W + p.x)) || F.far[0];
    if (c) { objects.push({ id: "building-cache", kind: "chest", name: `${S.name} Cache`, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(c.y * W + c.x);
      const g = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).find((q) => free(q.x, q.y));
      if (g) enemySpawns.push({ id: `${id}:guardian`, kind: S.guardian, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true }); }
    if (P.roof) { const gd = enemySpawns.find((e) => e.buildingGuardian), clear = (p) => !gd || Math.hypot(gd.x - p.x, gd.y - p.y) >= BUILDINGS.roofLadderClear; // arriving from the roof, never on the guardian's doorstep
      const q = F.far.find((p) => free(p.x, p.y) && clear(p) && Math.abs(p.x - F.arrive.x) + Math.abs(p.y - F.arrive.y) > 3 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => taken.has((p.y + dy) * W + p.x + dx))) || [...F.far].reverse().find((p) => free(p.x, p.y) && clear(p)) || F.far.find((p) => free(p.x, p.y));
      if (q) { objects.push({ id: "building-roof-ladder", kind: "buildingStair", name: "Ladder up · the roof", x: q.x, y: q.y, state: "open", actions: ["climb"], dir: "roof" }); taken.add(q.y * W + q.x); } } }
  return { seed, id, recipe: "greatBuilding", name, identity: `${S.name}, ${P.floor === 1 ? "the ground floor" : `floor ${P.floor}`} of ${P.floors}`, danger: "falling floors", width: W, height: H, tiles, entry, exit: P.floor === 1 ? { ...plan.door } : null, objects, enemySpawns,
    building: { base: P.base, style: P.style, floor: P.floor, floors: P.floors, roof: P.roof, breachEntry: plan.breach ? { x: plan.breach.x, y: 1 } : null, roofLadder: objects.find((o) => o.dir === "roof") ? (({ x, y }) => ({ x, y }))(objects.find((o) => o.dir === "roof")) : null }, layoutVersion: 1, themePool: 0 }; // layoutVersion 1: dungeon-variation leaves it as laid
}

// The nearest open floor beside `p` (not on a stair or a hole), to stand on when you arrive by it.
function stepOff(tiles, W, p) {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const t = tiles[(p.y + dy) * W + p.x + dx]; if (t && !t.blocked && !t.hole && t.x === p.x + dx) return { x: p.x + dx, y: p.y + dy }; }
  return { x: p.x, y: p.y };
}
export const buildingArrival = (map, x, y) => stepOff(map.tiles, map.width, { x, y });
export const buildingScale = (floor) => ({ hp: 1 + BUILDINGS.creatures.scale.hp * (floor - 1), damage: 1 + BUILDINGS.creatures.scale.damage * (floor - 1) });
