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
import { hashSeed, rng, byHash } from "./random.js?v=r887-c84d55569c78";
import { CLOSE_VIEW_ROOM_ROUTING, layCloseViewRooms, routingStairPair, routingNearLanding, routingKeepAppearance } from "./close-view-room-routing.js?v=r887-c84d55569c78";
import { canStep } from "./landscape.js?v=r887-c84d55569c78";

export const BUILDINGS = {
  version: 3, // 2: shaped footprints (rect, L, T, U), hives, built over natural ground (`placeBuildingV2`); 1 stays as it was
  // 3 (Tim, 2026-11-04: "there should always be an exit to the roof"): as 2, and a building that rolls no roof hatch still has a
  // roof to stand on (`roofTop`), reached only by the roof exit from its top floor (ROOF_EXIT); sections pinned to 2 keep theirs
  hiveRegions: ["alien", "biomech"], shapes: ["rect", "L", "T", "U", "L"],
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
    // Tim: "some of the... alien buildings would be cool": the compounds' hives (compounds.ts). Standalone buildings never
    // roll this style (their roll is pinned to keep / apartment), so the buildings of release 711 are unchanged.
    hive: {
      name: "Alien Hive", footprints: [[8, 7]], floors: [3, 4], size: [24, 20],
      wall: "hiveWall", hall: "chitinFloor", rooms: ["fleshFloor", "chitinFloor", "crystalFloor", "fleshFloor"],
      guards: ["glassMite", "veilMoth", "coilStalker", "cinderWisp"], guardian: "voidSentinel", cache: "arcology-cache",
      floorNames: ["Hollow", "Second Gallery", "Third Gallery", "Crown"],
    },
  },
  split: { min: 4, at: 9 }, // rooms: a block is split while its side is at least `at`; no room narrower than `min`
  extraDoors: .25, // share of inner walls given a second doorway (collapsed brickwork)
  holes: { share: .04, cluster: 3, clear: 2 }, // of a floor's open ground above the first; kept `clear` steps from either stair
  rubble: .015, // blocked rubble a floor, never where it would cut the floor in two
  creatures: { perFloor: [3, 5], far: 5, scale: { hp: .14, damage: .08 }, guardian: { hp: 2.2, damage: 1.3, affixes: 1 } },
  fall: .1, // share of max health a fall through the floor costs
  // Interior generator versions (release 735), pinned per building in its floors' dungeon histories (`interiorVersion`, game.ts
  // `interiorVersion`): an interior any floor of which was generated before keeps version 1 exactly as it was. Version 2:
  // - a floor's holes never stand over a hole in the floor below (a fall lands on floor, not straight through a second floor);
  // - a top-floor guardian (great buildings, compound towers, castle keeps, labyrinth vaults) that finds no free tile beside its
  //   cache stands on the nearest free tile it can be walked to within `guardianReach` instead of not appearing at all;
  // - labyrinth galleries of gaps keep the platform beside every door (labyrinths.ts), and a key always lies somewhere.
  interior: { version: 4, guardianReach: 3 },
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

export const FLOOR_KINDS = ["mosaicFloor", "carpetFloor", "plankFloor", "flagFloor", "tileFloor", "concreteFloor", "rubbleFloor", "floorHole", "chitinFloor", "fleshFloor", "crystalFloor", "yardGrass", "cellarFloor"];
export const WALL_KINDS = ["keepWall", "aptWall", "hiveWall", "hedgeWall", "cellarWall"];

const ID = /^building:(.+):(-?\d+):(-?\d+):(keep|apartment|hive):(\d+)(r?):f(\d+)$/; // `r`: it has a roof to stand on
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
      map.greatBuilding = { id, base, style: plan.style, floors: plan.floors, roof, version: 2 }; // version 1's record as it always read
      return rec;
    }
  }
  return null;
}

// Version 2 (Tim, 2026-11-03: "different shapes like some of the shapes of the shacks, or some of the... alien buildings"):
// the footprint is a rectangle with a corner (L), both back corners (T) or a notch in its back (U) left out, drawn by the
// renderer's block painter like the compounds; hives stand in `hiveRegions`; built over natural ground (rock, brush, low
// rises and trees are cleared). Interiors are as in version 1. Sections pinned to version 1 keep `placeBuilding`.
export function buildingHereV2(seed, rx, ry, region) {
  const p = buildingHere(seed, rx, ry, region); if (!p) return null;
  const h = (k) => hashSeed(`${seed}:great-building:v2:${rx}:${ry}:${k}`);
  if (BUILDINGS.hiveRegions.includes(region?.type)) { const S = BUILDINGS.styles.hive; p.style = "hive"; p.floors = S.floors[0] + h("floors") % (S.floors[1] - S.floors[0] + 1); }
  p.shape = BUILDINGS.shapes[h("shape") % BUILDINGS.shapes.length]; return p;
}
const CLEAR_OBJECTS = new Set(["tree", "treeShrub", "treeSpindle", "rock", "wayfindingCue"]);
// `doorOk(map, at)` (world coherence 1, new ground only): the front door must join the land the exits join (WG-05).
export function placeBuildingV2(map, seed, rx, ry, plan, exitsOpen, doorOk = null, version = 2) {
  if (!map?.tiles?.length || map.keep || map.castle || map.canopy || map.greatBuilding) return null;
  const S = BUILDINGS.styles[plan.style], ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 13 && x <= 19 && y >= 13 && y <= 19);
  const objAt = (x, y) => (map.objects || []).some((o) => !o.decor && !o.environmental && !CLEAR_OBJECTS.has(o.kind) && Math.round(o.x) === x && Math.round(o.y) === y);
  const natural = (t) => !!t && !t.structure && !t.buildingId && !t.canopy && !t.keep && !t.greatBuilding && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && (t.elev || 0) <= 2;
  const ground = (x, y) => natural(map.tiles[I(x, y)]) && !lane(x, y) && !objAt(x, y);
  const open = (x, y) => { const t = map.tiles[I(x, y)]; return natural(t) && !t.blocked && !t.slope && !(t.elev > 0) && !objAt(x, y); };
  const h = (k) => hashSeed(`${seed}:great-building-spot:v2:${rx}:${ry}:${k}`), R = BUILDINGS.roof, shape = plan.shape || "rect";
  let tries = 0, doorMiss = 0;
  for (const [W, H] of [...S.footprints, ...(plan.style === "hive" ? [[7, 7], [7, 6]] : [])]) {
    const spots = []; for (let oy = 2; oy <= 30 - H; oy++) for (let ox = 2; ox <= 30 - W; ox++) spots.push([ox, oy]);
    spots.sort((a, b) => h(a) - h(b));
    for (const [ox, oy] of spots.slice(0, 260)) {
      const south = oy + H / 2 < 16, backHalf = (y) => south ? y < oy + (H >> 1) : y >= oy + H - (H >> 1), cw = Math.max(2, Math.floor(W / 3)), flip = h("flip") % 2;
      const cut = (x, y) => shape === "L" ? backHalf(y) && (flip ? x >= ox + W - cw - 1 : x < ox + cw + 1) : shape === "T" ? backHalf(y) && (x < ox + cw || x >= ox + W - cw) : shape === "U" ? backHalf(y) && x >= ox + cw && x < ox + W - cw && (south ? y < oy + (H >> 1) - 1 : y > oy + H - (H >> 1)) : false;
      const cells = []; for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) if (!cut(x, y)) cells.push({ x, y });
      if (!cells.every((c) => ground(c.x, c.y))) continue;
      const set = new Set(cells.map((c) => I(c.x, c.y))), has = (x, y) => set.has(I(x, y));
      const dx = ox + (W >> 1), dy = south ? oy + H - 1 : oy, out = { x: dx, y: dy + (south ? 1 : -1) };
      if (!has(dx, dy) || !open(out.x, out.y)) continue;
      const inner = cells.filter((c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => has(c.x + a, c.y + b)));
      const roof = !!map.landscape && inner.length > 0 && (hashSeed(`${seed}:great-building:v1:${rx}:${ry}:roof`) % 1000) / 1000 < R.share;
      const top = roof || (version >= 3 && !!map.landscape); // version 3: a roof to stand on even without a hatch (reached by the roof exit)
      const faceH = facadeHeight(H, plan.floors), lift = faceH / (R.elev * LIFT);
      const hatch = roof && inner.length ? inner[h("hatch") % inner.length] : null;
      const breachWanted = (hashSeed(`${seed}:great-building:v1:${rx}:${ry}:breach`) % 1000) / 1000 < BUILDINGS.breach;
      const backFace = cells.filter((c) => !has(c.x, c.y + (south ? -1 : 1)) && c.x > ox && c.x < ox + W - 1).map((c) => ({ ...c, out: { x: c.x, y: c.y + (south ? -1 : 1) } })).filter((c) => open(c.out.x, c.out.y));
      const bc = breachWanted && backFace.length ? backFace[h("bx") % backFace.length] : null;
      const tiles = map.tiles.slice(), before = exitsOpen(map), crumbled = [];
      for (const c of cells) { const i = I(c.x, c.y);
        if (!top) { map.tiles[i] = { ...map.tiles[i], x: c.x, y: c.y, blocked: true, slope: false, elev: 0, greatBuilding: true, environment: undefined }; continue; }
        const fallen = inner.includes(c) && !(hatch && Math.abs(c.x - hatch.x) + Math.abs(c.y - hatch.y) <= 1) && (hashSeed(`${seed}:great-building-roof:${rx}:${ry}:${c.x}:${c.y}`) % 1000) / 1000 < R.crumbled;
        if (fallen) crumbled.push({ x: c.x, y: c.y });
        map.tiles[i] = { ...map.tiles[i], x: c.x, y: c.y, kind: plan.style === "keep" ? "castleCourt" : "arcFloor", landscape: plan.style === "keep" ? "castle" : "arcology", blocked: fallen, slope: false, elev: R.elev, roofLift: lift, structure: "buildingRoof", greatBuilding: true, roofHole: fallen || undefined, environment: undefined, canopy: undefined }; }
      const after = exitsOpen(map);
      if (!before.every((o, i) => !o || after[i])) { map.tiles = tiles; if (++tries >= 6) return null; continue; }
      if (doorOk && !doorOk(map, out)) { map.tiles = tiles; if (++doorMiss >= doorOk.tries) return null; continue; }
      const base = `building:${seed}:${rx}:${ry}:${plan.style}:${plan.floors}${roof ? "r" : ""}`, id = `great-building-${rx}-${ry}`;
      map.objects = (map.objects || []).filter((o) => !set.has(I(Math.round(o.x), Math.round(o.y))));
      map.enemySpawns = (map.enemySpawns || []).filter((e) => !set.has(I(Math.round(e.x), Math.round(e.y))));
      // the interior's broken back is on its far wall; outside, it opens where the building's back face lets it
      const doors = { rx, ry, front: out, breach: bc ? bc.out : null, hatch, ...(version >= 3 && top ? { roofTop: true } : {}) }; // `roofTop`: the roof exit has a roof to come out on
      const rec = { id, kind: "greatBuilding", v: 2, name: S.name, style: plan.style, shape, floors: plan.floors, x: dx, y: oy + H - 1, bounds: { x: ox, y: oy, w: W, h: H }, footprint: cells, door: { x: dx, y: dy, side: south ? "south" : "north" }, breach: bc ? { x: bc.x, y: bc.y } : null, roof: roof ? { elev: R.elev, hatch, crumbled } : top ? { elev: R.elev, hatch: null, crumbled, top: true } : null, faceH,
        blocks: [{ part: "b", cells, faceH, floors: plan.floors }], doors: [{ x: dx, y: dy, face: south ? "south" : "north" }, ...(bc ? [{ x: bc.x, y: bc.y, face: south ? "north" : "south", breach: true }] : [])], hatches: hatch ? [hatch] : [], crumbled, grain: h("grain") % 97, state: "closed", actions: [] };
      map.objects.push(rec);
      map.objects.push({ id: `${id}-door`, kind: "dungeon", buildingDoor: true, buildingDoors: doors, dungeonId: buildingFloorId(base, 1), dungeonType: "greatBuilding", name: S.name, identity: `${plan.floors} floors, shut and dark`, x: out.x, y: out.y, state: "open", actions: ["enter"], landmark: true, lore: `${S.name}: ${plan.floors} floors. The door is the way in; somewhere above, its guardian and its cache.` });
      if (hatch) map.objects.push({ id: `${id}-hatch`, kind: "dungeon", buildingDoor: true, roofHatch: true, buildingDoors: doors, dungeonId: buildingFloorId(base, plan.floors), dungeonType: "greatBuilding", name: `${S.name} (roof hatch)`, x: hatch.x, y: hatch.y, elev: R.elev, state: "open", actions: ["enter"], enterAt: "roof" });
      if (bc) map.objects.push({ id: `${id}-breach`, kind: "dungeon", buildingDoor: true, breachDoor: true, buildingDoors: doors, dungeonId: buildingFloorId(base, 1), dungeonType: "greatBuilding", name: `${S.name} (broken wall)`, x: bc.out.x, y: bc.out.y, state: "open", actions: ["enter"], enterAt: "breach" });
      map.greatBuilding = { id, base, style: plan.style, floors: plan.floors, roof, shape, version: 2, ...(version >= 3 ? { version, roofTop: top } : {}) }; // `roof`: a hatch roof (the id's `r`)
      return rec;
    }
  }
  return null;
}

// ------------------------------------------------------------------------------------------------ inside, a floor at a time
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const memo = new Map();
// Every floor of a building, laid in order (each floor's stair up stands where the next floor's stair down is).
export function buildingPlan(base, V = 1) {
  const key = V >= 2 ? `${base}|v${V}` : base; if (memo.has(key)) return memo.get(key);
  const P = parseBuildingId(`${base}:f1`); if (!P) return null;
  const S = BUILDINGS.styles[P.style], [W, H] = V >= 3 ? [44, 40] : S.size, floors = [];
  const h = (k) => hashSeed(`${base}:plan:${k}`);
  const door = { x: W >> 1, y: H - 1 }, entry = { x: W >> 1, y: H - 2 };
  const breach = (hashSeed(`${P.seed}:great-building:v1:${P.rx}:${P.ry}:breach`) % 1000) / 1000 < BUILDINGS.breach ? { x: 3 + h("breach") % (W - 6), y: 0 } : null;
  let arrive = entry;
  for (let f = 1; f <= P.floors; f++) {
    const layout = V === CLOSE_VIEW_ROOM_ROUTING.keepVersion && P.style === "keep" ? layCloseViewRooms : V >= 4 ? layFloorV4 : V === 3 ? layFloorV3 : layFloor;
    const L = layout(base, f, W, H, S, arrive, f === 1 ? [{ ...door, v: 2 }, { ...entry, v: 2 }, ...(breach ? [{ ...breach, v: 3 }, { x: breach.x, y: 1, v: 3 }] : [])] : []);
    const top = f === P.floors, far = farthest(L, arrive, (x, y) => true);
    const up = top ? null : far[h(`up${f}`) % Math.max(1, Math.ceil(far.length * .12))];
    floors.push({ ...L, floor: f, arrive, up, top, far });
    if (up) arrive = up;
  }
  let optionalRoute = null;
  if (V === CLOSE_VIEW_ROOM_ROUTING.keepVersion && P.style === "keep" && floors.length > 1) {
    const f = hashSeed(`${base}:optional-floor-pair:v2`) % (floors.length - 1), a = floors[f], b = floors[f+1];
    const point = routingStairPair(base, a, b, a.up, b.arrive, [a.arrive,a.up], [b.arrive,b.up], base);
    optionalRoute = { id:`keep-${f+1}-${f+2}`, from:f+1, to:f+2, ...point };
    if (!point.reason) { a.optionalStairs=[{...point,toFloor:f+2,dir:"up",routeId:optionalRoute.id}]; b.optionalStairs=[{...point,toFloor:f+1,dir:"down",routeId:optionalRoute.id}]; }
  }
  // holes above the ground floor, over open ground on the floor below, clear of the stairs and never cutting the way up
  for (const F of floors) if (F.floor > 1) addHoles(base, F, floors[F.floor - 2], W, H, V);
  const plan = { base, ...P, W, H, door, entry, breach, floors, ...(optionalRoute ? { optionalRoute } : {}) };
  if (memo.size > 24) memo.clear(); memo.set(key, plan); return plan;
}

export function layFloor(base, f, W, H, S, arrive, keepOpen) {
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
  cells.sort(byHash((a) => `${base}:rub:${f}:${a}`));
  for (const [x, y] of cells.slice(0, Math.round(cells.length * BUILDINGS.rubble))) { grid[at(x, y)] = 4; if (count(reach()) !== total - 1) grid[at(x, y)] = 0; }
  return { W, H, grid, room, leaves, mat, walls };
}

// Interior v3: a spacious combat room joined to a small graph of broad halls and side cells. The legacy
// splitter above is deliberately untouched: only callers pinned to v3 opt into this namespace and layout.
export function layFloorV3(base, f, W, H, S, arrive, keepOpen = []) {
  const r = rng(`${base}:floor:v3:${f}`);
  const at = (x, y) => y * W + x;
  const grid = new Array(W * H).fill(1);
  const room = new Array(W * H).fill(-1);
  const leaves = [];
  const walls = [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const open = (x, y, v = 0) => {
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {
      grid[at(x, y)] = grid[at(x, y)] === 2 ? 2 : v;
    }
  };
  const carveRoom = (x0, y0, w, h) => {
    const id = leaves.length;
    const bounds = { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 };
    leaves.push(bounds);
    for (let y = bounds.y0; y <= bounds.y1; y++) {
      for (let x = bounds.x0; x <= bounds.x1; x++) {
        open(x, y);
        room[at(x, y)] = id;
      }
    }
    return { x: x0 + (w >> 1), y: y0 + (h >> 1), id };
  };
  const hall = (a, b, width) => {
    let x = a.x;
    let y = a.y;
    const horizontalFirst = r() < .5;
    const step = (axis, end) => {
      while ((axis === "x" ? x : y) !== end) {
        if (axis === "x") x += Math.sign(end - x);
        else y += Math.sign(end - y);
        for (let q = -(width >> 1); q <= width - 1 - (width >> 1); q++) {
          open(axis === "x" ? x : x + q, axis === "x" ? y + q : y);
        }
      }
    };
    if (horizontalFirst) {
      step("x", b.x);
      step("y", b.y);
    } else {
      step("y", b.y);
      step("x", b.x);
    }
  };
  const mainW = clamp(10 + Math.floor(r() * 7), 8, W - 4);
  const mainH = clamp(10 + Math.floor(r() * 7), 7, H - 4);
  const main = carveRoom(
    clamp((W - mainW) >> 1, 2, W - mainW - 2),
    clamp((H - mainH) >> 1, 2, H - mainH - 2),
    mainW,
    mainH,
  );
  const nodes = [main];
  const mainBox = leaves[0];
  for (let side = 0; side < 4; side++) {
    const sideWidth = 3 + Math.floor(r() * 3);
    const sideHeight = 3 + Math.floor(r() * 3);
    const horizontal = side < 2;
    const roomSize = horizontal ? sideWidth : sideHeight;
    const before = !(side & 1);
    const space = before
      ? (horizontal ? mainBox.x0 : mainBox.y0) - 1
      : (horizontal ? W - 2 - mainBox.x1 : H - 2 - mainBox.y1);
    const gap = clamp(6 + Math.floor(r() * 5), 3, space - roomSize);
    const x = horizontal
      ? (before ? mainBox.x0 - gap - sideWidth : mainBox.x1 + gap + 1)
      : main.x - (sideWidth >> 1);
    const y = horizontal
      ? main.y - (sideHeight >> 1)
      : (before ? mainBox.y0 - gap - sideHeight : mainBox.y1 + gap + 1);
    nodes.push(carveRoom(
      clamp(x, 1, W - sideWidth - 1),
      clamp(y, 1, H - sideHeight - 1),
      sideWidth,
      sideHeight,
    ));
  }
  // A branching tree plus one cross-link gives every cell a route and at least one loop where the footprint permits it.
  hall(main, nodes[1], 2 + (hashSeed(`${base}:floor:v3:${f}:wide`) & 1));
  hall(main, nodes[2], 2);
  hall(nodes[1], nodes[3], 2);
  hall(nodes[2], nodes[4], 3);
  if (W >= 18 && H >= 14) hall(nodes[3], nodes[4], 2);
  const nearestOpen = (point) => {
    let best = main;
    let bestDistance = Infinity;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid[at(x, y)] === 1) continue;
        const distance = Math.abs(x - point.x) + Math.abs(y - point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return best;
  };
  for (const point of keepOpen) {
    const inside = {
      x: clamp(point.x, 1, W - 2),
      y: clamp(point.y, 1, H - 2),
    };
    const nearest = nearestOpen(inside);
    hall(inside, nearest, 2);
    grid[at(point.x, point.y)] = point.v;
    if (point.x > 0 && point.y > 0 && point.x < W - 1 && point.y < H - 1) {
      room[at(point.x, point.y)] = -1;
    }
  }
  if (grid[at(arrive.x, arrive.y)] === 1) {
    hall(
      { x: clamp(arrive.x, 1, W - 2), y: clamp(arrive.y, 1, H - 2) },
      nearestOpen(arrive),
      2,
    );
  }
  const big = leaves.reduce((b, q, i) => (q.x1 - q.x0 + 1) * (q.y1 - q.y0 + 1) > (leaves[b].x1 - leaves[b].x0 + 1) * (leaves[b].y1 - leaves[b].y0 + 1) ? i : b, 0);
  const mat = leaves.map((q, i) => i === big ? S.hall : S.rooms[hashSeed(`${base}:mat:v3:${f}:${i}`) % S.rooms.length]);
  return { W, H, grid, room, leaves, mat, walls };
}

// Interior v4 keeps v3's rooms, corridors and hash namespace byte-for-byte, changing only a blocked
// in-bounds arrival into floor. In v3 the connector started one step beyond this cell, which could
// leave an upper floor's ladder down embedded in a wall even though it remained usable from beside it.
export function layFloorV4(base, f, W, H, S, arrive, keepOpen = []) {
  const floor = layFloorV3(base, f, W, H, S, arrive, keepOpen);
  if (arrive && arrive.x >= 0 && arrive.y >= 0 && arrive.x < W && arrive.y < H) {
    const index = arrive.y * W + arrive.x;
    if (floor.grid[index] === 1) floor.grid[index] = 0;
  }
  return floor;
}

// Interior terrain versions, pinned per floor in its dungeon history (`terrainVersion`, game.ts `interiorTerrainVersion`):
// a floor generated before keeps version 1 exactly as it was. Version 2 changes only when the optional jump platform is
// accepted (`platformJudge`): the floor reachable from the entry, under the real step rules with jumps, must be the
// same with the platform as without it, every reachable tile must still lead back to the entry, the first step needs open
// floor on its approach side, and creatures' spawns and the exit are kept clear as objects are. In version 1 the platform
// could plug a two-wide corridor: a one-way drop into a pocket walled three high, or a sealed area with guards in it.
export const INTERIOR_TERRAIN = {
  version: 2,
  // Fixed for every version (a change here moves floors already generated). `cells`: the chain as [dx, dy, height] from its
  // first step, two steps east then a 2x2 top; `clear`: its least distance (steps along the axes) from the entry, every
  // object and, from version 2, the exit and every creature's spawn.
  platform: { cells: [[0, 0, 1], [1, 0, 2], [2, 0, 3], [3, 0, 3], [2, 1, 3], [3, 1, 3]], clear: 3 },
};

// A tame, single-surface heightfield for v3 maps. Mandatory objects remain on level ground; broad cardinal
// ramps connect every raised patch, so baseline on-foot progression never depends on a jump or drone.
// `T`: the interior terrain version (INTERIOR_TERRAIN); 1 lays the platform exactly as every floor generated before.
export function addInteriorTerrain(map, base, V = 1, T = 1) {
  if (V < 3 || !map?.tiles?.length) return map;
  const W = map.width;
  const H = map.height;
  const hash = (key) => hashSeed(`${base}:interior-terrain:v1:${key}`);
  const level = 2 + hash("level") % 2;
  const vertical = !!(hash("axis") & 1);
  const edge = vertical
    ? 3 + hash("edge") % Math.max(1, W - 8)
    : 3 + hash("edge") % Math.max(1, H - 8);
  for (const tile of map.tiles) {
    tile.elev = 0;
    tile.slope = false;
    delete tile.rampDir;
  }
  const candidates = map.tiles.filter((t) => !t.blocked && !t.hole && (vertical ? t.x > edge + level : t.y > edge + level));
  for (const tile of candidates) tile.elev = level;
  for (let step = 0; step <= level; step++) {
    for (let cross = 0; cross < (vertical ? H : W); cross++) {
      const x = vertical ? edge + step : cross;
      const y = vertical ? cross : edge + step;
      const tile = map.tiles[y * W + x];
      if (!tile || tile.blocked || tile.hole) continue;
      tile.elev = step;
      tile.slope = step > 0;
      if (tile.slope) tile.rampDir = vertical ? "east" : "south";
    }
  }
  // Optional jump chain: two stepping blocks lead to a 2x2 top. It is accepted only when the whole
  // island can be removed from ordinary walking and every interactable still remains reachable.
  const PL = INTERIOR_TERRAIN.platform, top = Math.max(...PL.cells.map((c) => c[2]));
  const occupied = [map.entry, ...(T >= 2 ? [map.exit, ...(map.enemySpawns || [])] : []), ...(map.objects || [])].filter(Boolean);
  const farFromUse = (x, y) => occupied.every((object) =>
    Math.abs(Math.round(object.x) - x) + Math.abs(Math.round(object.y) - y) >= PL.clear
  );
  const accept = T >= 2 ? platformJudge(map, W, H) : null;
  const patterns = [];
  for (let y = 3; y < H - 4; y++) {
    for (let x = 3; x < W - 6; x++) patterns.push({ x, y });
  }
  patterns.sort(byHash((p) => `${base}:interior-platform:v1:${p.x},${p.y}`));
  for (const pattern of patterns) {
    const cells = PL.cells.map(([dx, dy, elev]) => [pattern.x + dx, pattern.y + dy, elev]);
    const cut = new Set(cells.map(([x, y]) => y * W + x));
    const available = cells.every(([x, y]) => {
      const tile = map.tiles[y * W + x];
      return tile && !tile.blocked && !tile.hole && !tile.slope && tile.elev === 0 && farFromUse(x, y);
    });
    if (!available) continue;
    const start = Math.round(map.entry.y) * W + Math.round(map.entry.x);
    if (cut.has(start)) continue;
    const seen = new Uint8Array(W * H);
    const queue = [start];
    seen[start] = 1;
    for (let i = 0; i < queue.length; i++) {
      const index = queue[i];
      const x = index % W;
      const y = (index / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        const next = ny * W + nx;
        const tile = map.tiles[next];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[next] || cut.has(next) || !tile || tile.blocked || tile.hole) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }
    const strandsObject = (map.objects || []).some((object) => {
      const x = Math.round(object.x);
      const y = Math.round(object.y);
      return x >= 0 && y >= 0 && x < W && y < H && !seen[y * W + x];
    });
    if (strandsObject) continue;
    if (accept && !accept(cells)) continue;
    for (const [x, y, elev] of cells) {
      Object.assign(map.tiles[y * W + x], {
        elev,
        slope: false,
        interiorPlatform: true,
        platformTop: elev === top || undefined,
      });
    }
    break;
  }
  map.landscape = { version: 0, biome: null, name: null, interior: true };
  map.interiorTerrain = T >= 2 ? { version: 1, maxLevel: 5, platform: T } : { version: 1, maxLevel: 5 };
  return map;
}

// Interior terrain v2's acceptance test for a platform chain (`cells`: [x, y, elev], the first the height-1 step). Built once
// a floor over its ramped heightfield (platform not yet laid): null when nothing could be accepted, because the floor itself
// already has ground with no way back, or something used that cannot be reached. Going out, a hole may be jumped across (so
// ground past a gap counts as reached); coming back, never (so it must lead home on foot). Generation-time only.
function platformJudge(map, W, H) {
  const tiles = map.tiles, N = W * H;
  if (!map.entry) return null;
  const ex = Math.round(map.entry.x), ey = Math.round(map.entry.y), start = ey * W + ex;
  const open = (k) => { const t = tiles[k]; return !!t && !t.blocked && !t.hole; };
  const floor = (k) => { const t = tiles[k]; return !!t && !t.blocked; };
  if (ex < 0 || ey < 0 || ex >= W || ey >= H || !open(start)) return null;
  // canStep reads only the tiles and the terrain record; the probe carries the record the finished map will have
  const probe = { tiles, width: W, height: H, landscape: { version: 0, interior: true }, interiorTerrain: { version: 1, maxLevel: 5 } };
  const walker = { isPlayer: true, jumping: true, airElev: undefined };
  // a jump from a platform step keeps its height in the air (game.ts skyAir), as the Wayfarer's does
  const step = (a, b) => {
    const from = tiles[a];
    walker.airElev = from.interiorPlatform ? from.elev : undefined;
    return canStep(walker, probe, W, a % W, ((a / W) | 0) - .25, b % W, ((b / W) | 0) - .25);
  };
  const queue = new Int32Array(N);
  const flood = (seen, backward) => {
    seen.fill(0); seen[start] = 1; queue[0] = start; let n = 1;
    for (let i = 0; i < n; i++) {
      const k = queue[i], x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy, next = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[next] || !(backward ? open(next) : floor(next))) continue;
        if (tiles[k].hole || tiles[next].hole ? false : !(backward ? step(next, k) : step(k, next))) continue;
        seen[next] = 1; queue[n++] = next;
      }
    }
    return seen;
  };
  const used = [...(map.objects || []), ...(map.enemySpawns || [])].filter(Boolean);
  const sound = (forward, back) => {
    for (let k = 0; k < N; k++) if (forward[k] && !back[k] && !tiles[k].hole) return false;
    return used.every((o) => {
      const x = Math.round(o.x), y = Math.round(o.y);
      if (x < 0 || y < 0 || x >= W || y >= H) return true; // an edge door outside the floor
      if (open(y * W + x)) return !!forward[y * W + x];
      return N4.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && !!forward[ny * W + nx]; });
    });
  };
  const before = flood(new Uint8Array(N), false);
  if (!sound(before, flood(new Uint8Array(N), true))) return null;
  const forward = new Uint8Array(N), back = new Uint8Array(N);
  return (cells) => {
    const [sx, sy] = cells[0], approach = sy * W + sx - 1;
    if (sx < 1 || !open(approach) || !before[approach] || tiles[approach].slope) return false;
    const was = cells.map(([x, y]) => tiles[y * W + x]);
    for (const [i, [, , elev]] of cells.entries()) tiles[cells[i][1] * W + cells[i][0]] = { ...was[i], elev, slope: false, interiorPlatform: true };
    let ok = step(approach, sy * W + sx);
    if (ok) { flood(forward, false); for (let k = 0; k < N && ok; k++) if (forward[k] !== before[k]) ok = false; }
    if (ok) ok = sound(forward, flood(back, true));
    for (const [i, [x, y]] of cells.entries()) tiles[y * W + x] = was[i];
    return ok;
  };
}

// Open cells by distance from `from`, farthest first (only cells `ok` allows, ignoring holes).
export function farthest(L, from, ok) {
  const { W, H, grid } = L, dist = new Int32Array(W * H).fill(-1), q = [from.y * W + from.x]; dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || dist[n] >= 0 || grid[n] === 1 || grid[n] === 4) continue; dist[n] = dist[k] + 1; q.push(n); } }
  const out = []; for (let k = 0; k < W * H; k++) if (dist[k] > 0 && grid[k] === 0 && ok(k % W, (k / W) | 0)) out.push({ x: k % W, y: (k / W) | 0, d: dist[k] });
  return out.sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x);
}

export function addHoles(base, F, below, W, H, V = 1) {
  const B = BUILDINGS.holes, at = (x, y) => y * W + x, near = (p, x, y) => p && Math.abs(p.x - x) + Math.abs(p.y - y) <= B.clear;
  const belowHole = V >= 2 ? new Set((below.holes || []).map(([x, y]) => at(x, y))) : null; // interior v2: never over a hole below
  const ok = (x, y) => F.grid[at(x, y)] === 0 && below.grid[at(x, y)] === 0 && !near(F.arrive, x, y) && !near(F.up, x, y) && !near(below.up, x, y) && !near(below.arrive, x, y) && !routingNearLanding(F.optionalStairs,x,y) && !routingNearLanding(below.optionalStairs,x,y) && !(belowHole && belowHole.has(at(x, y)));
  const cand = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ok(x, y)) cand.push([x, y]);
  cand.sort(byHash((a) => `${base}:hole:${F.floor}:${a}`));
  const want = Math.round(cand.length * B.share), holes = [];
  for (const [x, y] of cand) { if (holes.length >= want) break; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]].slice(0, B.cluster)) { const hx = x + dx, hy = y + dy; if (ok(hx, hy) && !holes.some((q) => q[0] === hx && q[1] === hy)) holes.push([hx, hy]); } }
  // every open cell must still be reachable from the arrival without stepping in a hole: drop holes (newest first) until so
  const reachAll = () => { const set = new Set(holes.map(([x, y]) => at(x, y))), seen = new Uint8Array(W * H), q = [at(F.arrive.x, F.arrive.y)]; seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const n = at(x + dx, y + dy); if (seen[n] || F.grid[n] === 1 || F.grid[n] === 4 || set.has(n)) continue; seen[n] = 1; q.push(n); } }
    for (let k = 0; k < W * H; k++) if ((F.grid[k] === 0 || F.grid[k] === 2) && !set.has(k) && !seen[k]) return false; return true; };
  while (holes.length && !reachAll()) holes.pop();
  F.holes = holes;
}

// Where a top-floor guardian stands by its cache `c`: one of the six tiles beside it (as in version 1); from interior v2, when
// none is free, the nearest free tile within `guardianReach` that can be walked to from `from` (null when there is none).
export function guardianBeside(tiles, W, c, free, V = 1, from = null) {
  const g = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).find((q) => free(q.x, q.y));
  if (g || V < 2) return g || null;
  const R = BUILDINGS.interior.guardianReach, H = Math.floor(tiles.length / W), walk = (t) => t && !t.blocked && !t.hole, seen = new Uint8Array(W * H), q = [];
  const s = from && walk(tiles[from.y * W + from.x]) ? from.y * W + from.x : c.y * W + c.x; seen[s] = 1; q.push(s);
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || !walk(tiles[n])) continue; seen[n] = 1; q.push(n); } }
  let best = null, bd = Infinity;
  for (let y = c.y - R; y <= c.y + R; y++) for (let x = c.x - R; x <= c.x + R; x++) { if (x < 0 || y < 0 || x >= W || y >= H || (x === c.x && y === c.y) || !seen[y * W + x] || !free(x, y)) continue;
    const d = Math.hypot(x - c.x, y - c.y); if (d <= R && d < bd) { bd = d; best = { x, y }; } }
  return best;
}

// The dungeon map for one floor (`id` as `buildingFloorId`). `V` is the interior version pinned for the building (1 by default).
export function generateBuildingFloor(seed, id, V = 1, T = 1) { // `T`: the floor's interior terrain version (INTERIOR_TERRAIN)
  const P = parseBuildingId(id), plan = P && buildingPlan(P.base, V); if (!plan) return null;
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
  for(const stair of F.optionalStairs || []) objects.push({ id:`routing-${stair.routeId}-${stair.dir}`, counterpartId:`routing-${stair.routeId}-${stair.dir === "up" ? "down" : "up"}`, routeId:stair.routeId,
    kind:"buildingStair", name:`Side ladder ${stair.dir} · floor ${stair.toFloor}`, x:stair.x,y:stair.y,state:"open",actions:[stair.dir === "up" ? "climb" : "descend"],
    dir:stair.dir,toId:buildingFloorId(P.base,stair.toFloor),toFloor:stair.toFloor,toX:stair.x,toY:stair.y });
  // creatures: one a room, the rooms farthest from where you come in first; the top floor's guardian by its cache
  const C = BUILDINGS.creatures, h = (k) => hashSeed(`${P.base}:f${P.floor}:${k}`), n = C.perFloor[0] + h("n") % (C.perFloor[1] - C.perFloor[0] + 1);
  const taken = new Set(objects.map((o) => o.y * W + o.x)), free = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole && !t.doorway && !taken.has(y * W + x) && !routingNearLanding(F.optionalStairs,x,y); };
  const spots = F.far.filter((p) => p.d >= C.far && free(p.x, p.y)), used = new Set();
  for (const p of spots) { if (enemySpawns.length >= n) break; const rm = F.room[p.y * W + p.x]; if (used.has(rm)) continue; used.add(rm); taken.add(p.y * W + p.x);
    enemySpawns.push({ id: `${id}:g${enemySpawns.length}`, kind: S.guards[h(`k${enemySpawns.length}`) % S.guards.length], x: p.x, y: p.y, buildingGuard: true }); }
  if (F.top) { const c = spots.find((p) => !taken.has(p.y * W + p.x)) || F.far[0];
    if (c) { objects.push({ id: "building-cache", kind: "chest", name: `${S.name} Cache`, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(c.y * W + c.x);
      const g = guardianBeside(tiles, W, c, free, V, entry);
      if (g) enemySpawns.push({ id: `${id}:guardian`, kind: S.guardian, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true }); }
    if (P.roof) { const gd = enemySpawns.find((e) => e.buildingGuardian), clear = (p) => !gd || Math.hypot(gd.x - p.x, gd.y - p.y) >= BUILDINGS.roofLadderClear; // arriving from the roof, never on the guardian's doorstep
      const q = F.far.find((p) => free(p.x, p.y) && clear(p) && Math.abs(p.x - F.arrive.x) + Math.abs(p.y - F.arrive.y) > 3 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => taken.has((p.y + dy) * W + p.x + dx))) || [...F.far].reverse().find((p) => free(p.x, p.y) && clear(p)) || F.far.find((p) => free(p.x, p.y));
      if (q) { objects.push({ id: "building-roof-ladder", kind: "buildingStair", name: "Ladder up · the roof", x: q.x, y: q.y, state: "open", actions: ["climb"], dir: "roof" }); taken.add(q.y * W + q.x); } } }
  return addInteriorTerrain({ seed, id, recipe: "greatBuilding", name, identity: `${S.name}, ${P.floor === 1 ? "the ground floor" : `floor ${P.floor}`} of ${P.floors}`, danger: "falling floors", width: W, height: H, tiles, entry, exit: P.floor === 1 ? { ...plan.door } : null, objects, enemySpawns,
    building: { base: P.base, style: P.style, ...(F.routing ? { routing:F.routing, optionalRoute:plan.optionalRoute, ...(routingKeepAppearance(P.base,V) ? {appearance:routingKeepAppearance(P.base,V)} : {}) } : {}), floor: P.floor, floors: P.floors, roof: P.roof, ...(V >= 2 ? { interiorVersion: V } : {}), breachEntry: plan.breach ? { x: plan.breach.x, y: 1 } : null, roofLadder: objects.find((o) => o.dir === "roof") ? (({ x, y }) => ({ x, y }))(objects.find((o) => o.dir === "roof")) : null }, layoutVersion: 1, themePool: 0 }, P.base, V, T); // layoutVersion 1: dungeon-variation leaves it as laid
}

// The nearest open floor beside `p` (not on a stair or a hole), to stand on when you arrive by it.
function stepOff(tiles, W, p) {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const t = tiles[(p.y + dy) * W + p.x + dx]; if (t && !t.blocked && !t.hole && t.x === p.x + dx) return { x: p.x + dx, y: p.y + dy }; }
  return { x: p.x, y: p.y };
}
export const buildingArrival = (map, x, y) => stepOff(map.tiles, map.width, { x, y });
export const buildingScale = (floor) => ({ hp: 1 + BUILDINGS.creatures.scale.hp * (floor - 1), damage: 1 + BUILDINGS.creatures.scale.damage * (floor - 1) });

// ------------------------------------------------------------------------------------------------ the roof exit
// Tim (2026-11-04): "when you get to the final room where the caches are, the vault, at the central tower — there should also be
// an exit, so you don't have to walk all the way out. Something to the roof, so you can jump off (and die if you really want),
// or use the robot to jump from the central tower to the roof of the next building and jump down. There should always be an
// exit to the roof or something like that."
// The vault floor of a great building without a roof hatch, a compound's tower without one, a castle keep (castle version 2)
// and a labyrinth vault (labyrinth version 2) gets a stair up (`buildingStair`, `dir: "roofExit"`). It is laid over the
// generated floor when the floor loads (game.ts `addRoofExit`), never into its tiles. It is sealed while the vault's guardian
// stands; once the guardian has fallen (or where none stands) it opens for good (`roofExit` on the vault floor's history). It
// lets you out onto the building's roof on its own section, on the walkable roof cell nearest the middle of its highest block
// (`roofLanding`); where the building has no roof to stand on (ground explored before roofs), out by the front door instead.
export const ROOF_EXIT = {
  fromCache: 3, // it stands about this far from the vault's cache, on floor you can reach from the way in
  minFromEntry: 2,
  landing: { minElev: 4 },
  names: { roof: "Stair up · the roof", tower: "Stair up · the tower roof", keep: "Stair up · the keep's roof", door: "Back stair · out by the front door" },
  messages: {
    sealed: "The stair up is barred while the vault's guardian stands.",
    opens: "With the guardian fallen, the stair up to the roof stands open.",
    roof: "You climb the stair and come out on the roof, high over the land. Mind the edge: it is a long way down.",
    door: "The back stair winds down and lets you out by the front door.",
  },
};

// Where the roof exit stands on a vault floor (a dungeon map): a free floor cell reachable from the way in (a one-tile gap
// jumped, as in a gallery), off every object, creature and doorway, about `fromCache` from the cache. Null when none.
export function roofExitSpot(map) {
  const W = map.width, H = map.height, T = map.tiles, at = (x, y) => y * W + x, R = ROOF_EXIT;
  const taken = new Set([...(map.objects || []), ...(map.enemySpawns || [])].map((o) => at(Math.round(o.x), Math.round(o.y))));
  const near = (x, y) => (map.objects || []).some((o) => o.kind !== "chest" && Math.abs(Math.round(o.x) - x) + Math.abs(Math.round(o.y) - y) <= 1);
  const ok = (x, y) => { const t = x >= 0 && y >= 0 && x < W && y < H ? T[at(x, y)] : null; return !!t && !t.blocked && !t.hole; };
  const e = map.entry || { x: W >> 1, y: H >> 1 }, start = at(Math.round(e.x), Math.round(e.y)), dist = new Int32Array(W * H).fill(-1), q = [start]; dist[start] = 0;
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of N4) { let nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const t = T[at(nx, ny)]; if (!t || t.blocked) continue; if (t.hole) { nx += dx; ny += dy; if (!ok(nx, ny)) continue; }
      const n = at(nx, ny); if (dist[n] >= 0) continue; dist[n] = dist[k] + 1; q.push(n); } }
  const cache = (map.objects || []).find((o) => o.kind === "chest"), cand = [];
  for (let k = 0; k < W * H; k++) { const x = k % W, y = (k / W) | 0, t = T[k]; if (dist[k] < R.minFromEntry || !ok(x, y) || t.doorway || taken.has(k) || near(x, y) || x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    cand.push({ x, y, s: cache ? Math.abs(Math.hypot(x - cache.x, y - cache.y) - R.fromCache) : -dist[k] }); }
  cand.sort((a, b) => a.s - b.s || a.y - b.y || a.x - b.x);
  return cand[0] ? { x: cand[0].x, y: cand[0].y } : null;
}

// Where the roof exit lets you out on the overworld section `map`: the walkable roof cell nearest the middle of the highest
// roof `part` ("tower": a compound's tower; "keep": a castle's keep; "building" / "labyrinth": the whole block). Null when the
// building has no roof to stand on there.
export function roofLanding(map, part) {
  const rec = (map.objects || []).find((o) => o.kind === "greatBuilding" && (part === "tower" ? o.compound : part === "keep" ? o.castle && (o.blocks || []).some((b) => b.part === "t") : part === "labyrinth" ? o.labyrinth : !o.compound && !o.castle && !o.labyrinth && !o.pentagon));
  if (!rec) return null;
  const cells = part === "tower" || part === "keep" ? (rec.blocks || []).find((b) => b.part === "t")?.cells || [] : rec.footprint || [];
  const objAt = new Set((map.objects || []).filter((o) => o.kind !== "greatBuilding").map((o) => Math.round(o.y) * 32 + Math.round(o.x)));
  const walk = cells.filter((c) => { const t = map.tiles[c.y * 32 + c.x]; return t && t.structure === "buildingRoof" && !t.blocked && (t.elev || 0) >= ROOF_EXIT.landing.minElev && !objAt.has(c.y * 32 + c.x); });
  if (!walk.length) return null;
  const top = Math.max(...walk.map((c) => map.tiles[c.y * 32 + c.x].elev || 0)), high = walk.filter((c) => (map.tiles[c.y * 32 + c.x].elev || 0) === top);
  const mx = high.reduce((a, c) => a + c.x, 0) / high.length, my = high.reduce((a, c) => a + c.y, 0) / high.length;
  const best = [...high].sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my) || a.y - b.y || a.x - b.x)[0];
  return { x: best.x, y: best.y };
}

// ------------------------------------------------------------------------------------------------ sealed towers
// Tower seals (Tim, 2026-11-06: "For the keeps with courtyards, with the tower in the center... unless you are climbing those
// towers to access a lever or something, you need a key to enter it. So you can't just hop down with the rope, with the drone,
// and then just finish the level by getting on the roof somehow. Sometimes that's okay, but that shouldn't be a way to
// circumvent all the mazes."). From compound version `compound` and castle version `castle` (new ground only), every way into
// the central tower (a compound's Keep Tower, Core Spire or Hive Heart; a Great Castle's keep) is a sealed door: its courtyard
// door, and a compound tower's roof hatch. They open for the tower's key, which lies deep in the maze: in a compound, on an
// inner floor of the wing the way through runs down (or, in a simple compound, the top floor of the wing whose doors reach the
// courtyard, which then has no hatch), held by a Key Warden; in a castle, on the top floor of the wing between the gate's and the
// keep's quarters. The key is a labyrinth key (`labKey`), kept on the tower's first floor's history (`labKeys`), so it is never
// lost and pays nothing. A compound tower's airspace is closed (vehicle-gates.ts DRONE_FIZZLE zone `tower`, tiles `towerAir`):
// the drone fizzles and the glider is turned away, so nobody lands on its top. A share of the towers (`climb.share`, where the
// courtyard has room) have a designed way round: a climb of ledges up the tower's face from the courtyard, one level a jump (a
// fall from the upper ledges hurts or kills), to a lever on the top that unseals the tower as the key does. The ledges stand
// clear of every other raised ground (no drop onto them from the wall walk), and the tower and its ledges are closed to the air.
export const TOWER_SEAL = {
  compound: 2, castle: 3, // the placement versions from which the tower is sealed
  key: { id: "towerKey", names: { keep: "Tower Key", apartment: "Core Keycard", hive: "Heart Sigil", castle: "Keep Key" }, clear: 4 }, // `clear`: tiles the key lies from the floor's ladder up
  keeper: { name: "Key Warden" },
  climb: { share: .15, ledges: [1, 2, 3, 4], fatal: 4, tries: 64 }, // the ledges' heights, foot to top (each one jump up); `fatal`: a drop this many levels kills (landscape.ts fallDamage); chains tried a tower
  messages: {
    sealed: "Sealed. The {tower} wants the {key}.",
    hatch: "The hatch is bolted from below. The {tower} wants the {key}.",
    key: "You take the {key}. The {tower}'s doors will open for it.",
    lever: "You haul the lever over. Deep in the {tower}, bolts draw back: its doors stand unsealed.",
    pulled: "The lever is already over; the {tower} stands unsealed.",
    reach: "The lever stands on the top of the {tower}: climb up to it.",
    climb: "Ledges climb the {tower}'s face, one jump at a time, to a lever at the top. A long way down from the last of them.",
  },
};
export const towerSealText = (msg, seal) => String(msg).replace("{tower}", seal?.tower || "tower").replace("{key}", seal?.name || "key");
// Is this seal open for the journey (its key taken or its lever pulled, both kept as the key on the tower's first floor)? Pure.
export const towerUnsealed = (save, seal) => !seal || (save?.consequences?.dungeons?.[`${seal.base}:f1`]?.labKeys || []).includes(seal.key);

// Where the key lies on its floor (a laid floor `F` of a building part): the farthest free cell from the floor's way in that is at
// least `clear` from its ladder up. Null when nothing is free.
export function towerKeySpot(F, free) {
  const C = TOWER_SEAL.key.clear, far = F.far.filter((p) => free(p.x, p.y));
  return far.find((p) => !F.up || Math.abs(p.x - F.up.x) + Math.abs(p.y - F.up.y) >= C) || far[0] || null;
}
// The tower's key on its floor (compounds from version 2, castles from version 3): a labyrinth key (`labKey`) whose record is kept on
// the tower's first floor (`keyBase`), on the floor's farthest free cell clear of the ladder up, its Key Warden beside it (a guardian
// in strength, `keyKeeper`). Pushes onto `objects` / `enemySpawns`; returns the key's cell or null.
export function placeTowerKey(objects, enemySpawns, tiles, W, F, free, seal, id, guardian, V, entry) {
  const taken = (x, y) => objects.some((o) => o.x === x && o.y === y) || enemySpawns.some((e) => e.x === x && e.y === y), open = (x, y) => free(x, y) && !taken(x, y);
  const c = towerKeySpot(F, open); if (!c) return null;
  const S = { key: seal.key, name: seal.name, tower: seal.tower, base: seal.base };
  objects.push({ id: "tower-key", kind: "labKey", keyId: seal.key, keyBase: seal.base, towerSeal: S, name: seal.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: `The ${seal.name}. The ${seal.tower}'s sealed doors wait for it.` });
  const g = guardianBeside(tiles, W, c, open, Math.max(2, V), entry); // new with the seal: the wider search (interior v2) at either interior version
  if (g) enemySpawns.push({ id: `${id}:keeper`, kind: guardian, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true, keyKeeper: true });
  return c;
}

// The climb up a tower's face (section tiles, 32 wide). `tower`, `court`: cells; `avoid`: court cells kept clear (doors and the
// ground before them); `noLever`: tower cells the lever may not stand on. No raised ground but the climb itself may let you onto a
// ledge: every neighbour of a ledge (the eight round it) is the tower, the court, blocked, or ground so high above it that the drop
// onto it kills (`climb.fatal` levels or more). Where the only fault is a cell of a wall walk next to it, `crumble(k)` may say that
// cell can fall in (the wall walk above the climb has crumbled); the cells to crumble are returned, and `holds(cells)` must accept
// them (the wall walk still joins its hatches). The ledges run foot to top, each beside the last, the top one beside the tower;
// the court left over stays one piece. Returns { ledges: [{ x, y, elev }], lever: { x, y }, foot: { x, y }, crumble: [{ x, y }] }
// or null. Pure; at most `climb.tries` whole chains are tested.
export function planTowerClimb(map, tower, court, avoid, noLever, key, crumble = () => false, holds = () => true) {
  const C = TOWER_SEAL.climb, n = C.ledges.length, at = (x, y) => y * 32 + x, T = new Set(tower.map((c) => at(c.x, c.y))), K = new Set(court.map((c) => at(c.x, c.y)));
  const keep = new Set(avoid.map((c) => at(c.x, c.y))), bad = new Set(noLever.map((c) => at(c.x, c.y)));
  // a ledge `e` levels up on k: null when it cannot stand there, else the wall-walk cells that must fall in for it
  const fit = (k, e) => { if (!K.has(k) || keep.has(k)) return null; const x = k % 32, y = (k / 32) | 0, fall = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) return null; const q = at(nx, ny), t = map.tiles[q]; if (T.has(q) || K.has(q) || !t || t.blocked || (t.elev || 0) - e >= C.fatal) continue; if (crumble(q)) fall.push(q); else return null; }
    return fall; };
  const nb = (k) => { const out = []; for (const [dx, dy] of N4) { const x = k % 32 + dx, y = ((k / 32) | 0) + dy; if (x >= 0 && y >= 0 && x <= 31 && y <= 31) out.push(at(x, y)); } return out; };
  const elevAt = (i) => C.ledges[n - 1 - i]; // a chain is grown from its top down: its i-th cell is that high
  const tops = court.map((c) => at(c.x, c.y)).filter((k) => fit(k, elevAt(0)) && nb(k).some((q) => T.has(q) && !bad.has(q))).sort(byHash((k) => `${key}:top:${k}`));
  let tries = 0;
  for (const top of tops) {
    const chains = [[top]];
    while (chains.length && tries < C.tries) { const ch = chains.pop();
      if (ch.length < n) { for (const q of nb(ch[ch.length - 1]).sort(byHash((k) => `${key}:step:${ch.length}:${k}`)).reverse()) if (!ch.includes(q) && fit(q, elevAt(ch.length))) chains.push([...ch, q]); continue; }
      tries++; const lad = ch.slice().reverse(), used = new Set(lad), rest = court.map((c) => at(c.x, c.y)).filter((k) => !used.has(k));
      const foot = nb(lad[0]).find((q) => K.has(q) && !used.has(q)); if (foot === undefined || !rest.length) continue;
      // the court left over is one piece (every door's ground and the climb's foot in it)
      const seen = new Set([rest[0]]), q = [rest[0]]; while (q.length) { const k = q.pop(); for (const m of nb(k)) if (K.has(m) && !used.has(m) && !seen.has(m)) { seen.add(m); q.push(m); } }
      if (seen.size !== rest.length) continue;
      const fall = [...new Set(lad.flatMap((k, i) => fit(k, C.ledges[i])))].sort((a, b) => a - b), cells = fall.map((k) => ({ x: k % 32, y: (k / 32) | 0 }));
      if (fall.length && !holds(cells)) continue;
      const lever = nb(top).filter((m) => T.has(m) && !bad.has(m)).sort(byHash((k) => `${key}:lever:${k}`))[0];
      return { ledges: lad.map((k, i) => ({ x: k % 32, y: (k / 32) | 0, elev: C.ledges[i] })), lever: { x: lever % 32, y: (lever / 32) | 0 }, foot: { x: foot % 32, y: (foot / 32) | 0 }, crumble: cells };
    }
    if (tries >= C.tries) break;
  }
  return null;
}
