// Landscape Pack v1: overland geography layered onto generated sections.
//
// Biomes come from continuous world-scale noise sampled at global tile coordinates, so mountain ranges, deserts,
// coastlines and alien wilds span several sections and line up across section borders (like rivers and canyons).
// Each landscape tile may carry an elevation level (0-5). The player climbs one level per jump and may drop off any
// ledge: one level is safe, two hurt, three hurt badly, four or more are fatal (FALL_DAMAGE). Generation guarantees
// every walkable tile can be reached from the plaza by climbing at most one level at a time, so cliffs exist but nothing
// is stranded. `slope` tiles (stairs, trails, dune faces, sky bridges' ramps) are walked by anyone; ground creatures
// only change level on slopes. Mountains add sky bridges between high plateaus and, sometimes, an erupting volcano.
//
// Sections already explored keep their original terrain (Game.loadArea pins the version in the atlas); the starting
// ring, settlements, exit corridors, the central plaza, structures, rivers/canyons, objects and spawns are protected.
import { farCivAt } from "./far-realms.js?v=r740-29f9ebbdac8f";
import { hashSeed, byHash } from "./random.js?v=r740-29f9ebbdac8f";
import { placeDock } from "./boats.js?v=r740-29f9ebbdac8f";
import { growTrees, TREES_V14 } from "./trees.js?v=r740-29f9ebbdac8f";
import { growMushrooms, MUSHROOM_KINDS } from "./great-mushrooms.js?v=r740-29f9ebbdac8f";
import { DOMAIN_WALKABLE, DOMAIN_BLOCKED } from "./domain-looks.js?v=r740-29f9ebbdac8f";

// Version 1: release 94 landscape. Version 2 (Waterbodies, water world W1): seas spanning many sections with islands
// and a deep-ocean band, inland lakes, swamps and poison swamps. Version 3 (the Skiff, W2): docks with a Shipwright.
// Each section keeps the version it was first seen with.
export const LANDSCAPE_VERSION = 17; // 721: the great mushrooms beyond a thousand sections (great-mushrooms.ts); 717: the Storm Halls' pillar lands; 716: the far civilisations (far-realms.ts FAR_CIVS) take their own land (each from its `landSince`); // 672: great trees found where they fit, and in forests and amberwood too (trees.ts TREES_V14); 645: the tree package (trees.ts: spires and groves, perches, leaves); 631: giant canopy trees in the jungle (633: rebuilt tall, before 631 was published); 629: petrified woods, savanna, reef flats, amberwood, obsidian fields; 625: jungles, carapace wastes, salt marshes, crystal fields, sporewoods; 617: fog moors; release 569: world regions (REGIONS); 573: forest and frost regions, region names; 579: moonlands; 583: volcanic regions; 591: pillar lands; earlier versions are kept for the sections pinned to them
export const LIFT_PER_LEVEL = 0.34; // drawn height of one elevation level, in tiles
export const CANOPY_LIFT = 2; // release 637: a great tree's levels are drawn this many times taller (the climb is unchanged)
export const tileLiftScale = (t) => (t?.canopy ? CANOPY_LIFT : t?.roofLift || 1); // a great building's roof is drawn at the top of its facade (great-buildings.ts)
export const MAX_LEVEL = 5;
// Fraction of max health lost when dropping this many levels; null = fatal.
export const FALL_DAMAGE = { 1: 0, 2: .15, 3: .4 };
export function fallDamage(drop, maxHp) { if (drop <= 1) return 0; if (drop >= 4) return Infinity; return Math.ceil(maxHp * FALL_DAMAGE[drop]); }
export const BIOMES = {
  mountains: { id: "mountains", name: "Snowpeak Range", atlas: "#d9e3ea" },
  desert: { id: "desert", name: "Dune Sea", atlas: "#d6b26e" },
  coast: { id: "coast", name: "Shattered Coast", atlas: "#3f7fa3" },
  alien: { id: "alien", name: "Lumen Wilds", atlas: "#9a6fe0" },
  castle: { id: "castle", name: "Overland Castle", atlas: "#8a7f73" },
  sea: { id: "sea", name: "Open Sea", atlas: "#1d4f7a" },
  isles: { id: "isles", name: "Scattered Isles", atlas: "#4f9fb0" },
  lake: { id: "lake", name: "Stillwater Lake", atlas: "#4a90c8" },
  swamp: { id: "swamp", name: "Sunken Fen", atlas: "#5d6b3c" },
  blight: { id: "blight", name: "Blight Mire", atlas: "#7cbf3a" },
};
// Release 573: ground laid by a region rather than by the landscape fields (biomeFor never reports these).
export const REGION_GROUNDS = { forest: { id: "forest", name: "Deepwood", atlas: "#2f5a34" }, frost: { id: "frost", name: "Frostlands", atlas: "#dce9f2" }, lunar: { id: "lunar", name: "Moonlands", atlas: "#b4b7bf" }, volcanic: { id: "volcanic", name: "Firelands", atlas: "#3a2420" }, pillars: { id: "pillars", name: "Pillar Lands", atlas: "#b9784c" }, fog: { id: "fog", name: "Fog Moors", atlas: "#7f8a86" }, jungle: { id: "jungle", name: "Jungle", atlas: "#1f6b2c" }, biomech: { id: "biomech", name: "Carapace Wastes", atlas: "#4a4f57" }, salt: { id: "salt", name: "Salt Marsh", atlas: "#e4dfd0" }, crystal: { id: "crystal", name: "Crystal Fields", atlas: "#8fd3e8" }, fungal: { id: "fungal", name: "Sporewood", atlas: "#7a4f8a" }, petrified: { id: "petrified", name: "Petrified Wood", atlas: "#8d8a82" }, savanna: { id: "savanna", name: "Savanna", atlas: "#c9a84a" }, reef: { id: "reef", name: "Reef Flats", atlas: "#e48f7a" }, amber: { id: "amber", name: "Amberwood", atlas: "#b8652a" }, obsidian: { id: "obsidian", name: "Obsidian Fields", atlas: "#1d1b22" } };
// Waterbodies (version 2) balance table. `continent` bends the ocean field so whole seas form; `island` lifts land back
// out of open water; `deep` is how far above the ocean threshold deep water starts.
export const WATERBODIES = {
  continent: { scale: 1100, weight: 1.2 },
  island: { scale: 38, threshold: .66, lift: 4 },
  deep: .07,
  lake: { scale: 40, water: .785, rim: .765 },
  swamp: { scale: 110, threshold: .65, blight: .725, pool: .74, mire: .58, poolScale: 3.3 },
  landmarkMacrocell: 5,
};
// Water every map treats as lethal without the Tidemantle (rivers and dungeon water are generator-made, not landscape).
export const DEEP_WATER = ["ocean", "deepOcean", "lakeWater", "swampWater", "toxicWater"];
// Thresholds tuned so roughly a third of sections carry a landscape feature (see tests/landscape.test.ts).
const T = { ocean: 0.70, beach: 0.675, mountain: 0.68, alien: 0.75, desert: 0.67 };
const SHALLOWS_FROM = T.ocean - .012; // sea level above which water is shallows (below it, beach)
const WALKABLE_LANDSCAPE = new Set(["craterFloor", /* Canyon craters */ "arcFloor", "arcStair", /* the ruined arcologies (keeps.ts) */ "snowRock", "snowPeak", "mountainRock", "alpineGrass", "mountainTrail", "sand", "duneCrest", "duneFace",
  "beach", "shallows", "dock", "bogGround", "mireWater", "toxicBog", "toxicMire", "alienMoss", "alienPlatform", "castleCourt", "castleStair", "battlement", "mesaTop", "skyBridge", "volcanicRim", "ashSlope", "forestFloor", "snowField", "lakeIce", "moonDust", "craterFloor", "craterRim", "basalt", "basaltFissure", "pillarGround", "skyPlatform", "fogMoor", "mistPool", "jungleFloor", "jungleMire", "ribPlate", "oilSlick", "saltCrust", "brinePool", "crystalShale", "prismPool", "sporeLoam", "sporeBed", "stoneLitter", "silicaPool", "savannaGrass", "wateringHole", "reefFlat", "tidePool", "amberLitter", "amberPool", "obsidianFloor", "quicksilverPool", "canopyBranch", "canopyCrown", "canopyLeaf", ...MUSHROOM_KINDS, "thornBasalt", "thornFloor", "thornShards", ...DOMAIN_WALKABLE]); // 721: great mushroom caps; 723: the Thornglass Caldera (far-domains.ts) // 631: canopy trees (canopyTrunk is blocked) // 629: the second palette // 617: fog moors; 625: the palette regions // release 573: forestFloor..lakeIce; 579: the moon; 583: basalt; 591: pillar lands

// ---------------------------------------------------------------- noise
// Perf pack (worldgen WG-09): a lattice value is hashSeed(`${key}:${ix}:${iy}`), and a section needs about 70k of them, each
// building and hashing a new string. hashSeed is FNV-1a, which reads its input in order, so the state after `${key}:` is
// worked out once per key (the same code-point loop hashSeed runs) and only the digits are fed per sample: the same values.
const FNV_PRIME = 16777619, latticeStates = new Map(), octaveKeys = new Map();
function latticeState(key) {
  let h = latticeStates.get(key);
  if (h === undefined) { h = 2166136261; for (const c of `${key}:`) { h ^= c.charCodeAt(0); h = Math.imul(h, FNV_PRIME); } if (latticeStates.size >= 4096) latticeStates.clear(); latticeStates.set(key, h); }
  return h;
}
function feed(h, n) { const s = `${n}`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, FNV_PRIME); } return h; }
const latticeAt = (state, ix, iy) => ((feed(Math.imul(feed(state, ix) ^ 58 /* ":" */, FNV_PRIME), iy) >>> 0) % 10007) / 10007;
function lattice(key, ix, iy) { return latticeAt(latticeState(key), ix, iy); }
const smooth = (t) => t * t * (3 - 2 * t);
function valueNoiseAt(state, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = latticeAt(state, ix, iy), b = latticeAt(state, ix + 1, iy), c = latticeAt(state, ix, iy + 1), d = latticeAt(state, ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function valueNoise(key, x, y) { return valueNoiseAt(latticeState(key), x, y); }
// The lattice states of `${key}:${o}` for each octave o, kept per key.
function octaveStates(key) { let s = octaveKeys.get(key); if (!s) { s = []; if (octaveKeys.size >= 1024) octaveKeys.clear(); octaveKeys.set(key, s); } return s; }
export function fbm(key, x, y, octaves = 3) {
  let sum = 0, amp = 1, norm = 0; const states = octaveStates(key);
  for (let o = 0; o < octaves; o++) { const st = states[o] ??= latticeState(`${key}:${o}`); sum += valueNoiseAt(st, x * 2 ** o, y * 2 ** o) * amp; norm += amp; amp *= .5; }
  return sum / norm;
}
export { lattice as latticeValue }; // for the perf-pack test, which checks it against hashSeed

// ---------------------------------------------------------------- fields (global tile coordinates)
const field = {
  ocean: (seed, gx, gy) => fbm(`${seed}:land:ocean`, gx / 150, gy / 150),
  mountain: (seed, gx, gy) => fbm(`${seed}:land:mountain`, gx / 96, gy / 96),
  desert: (seed, gx, gy) => fbm(`${seed}:land:desert`, gx / 120, gy / 120),
  alien: (seed, gx, gy) => fbm(`${seed}:land:alien`, gx / 100, gy / 100),
  // version 2
  continent: (seed, gx, gy) => fbm(`${seed}:land:continent`, gx / WATERBODIES.continent.scale, gy / WATERBODIES.continent.scale, 2),
  island: (seed, gx, gy) => fbm(`${seed}:land:island`, gx / WATERBODIES.island.scale, gy / WATERBODIES.island.scale),
  lake: (seed, gx, gy) => fbm(`${seed}:land:lake`, gx / WATERBODIES.lake.scale, gy / WATERBODIES.lake.scale, 2),
  wet: (seed, gx, gy) => fbm(`${seed}:land:wet`, gx / WATERBODIES.swamp.scale, gy / WATERBODIES.swamp.scale),
};
// ---------------------------------------------------------------- world regions (release 569)
// Tim, 2026-10-29: "when I look at the Atlas... with random tiles... it just kind of just looks muddied. And there's no clear
// direction... we can have larger... regions... a random region size and type... I don't want all the sections to be like...
// circles or squares or any kind of... uniform shape... there can also be... sections where they're just like random tiles. So
// you never know what you're gonna get". Version 4 lays a deterministic map of regions over the world: one site per
// `cell`×`cell` block of sections, jittered inside it, each with a type (weighted, `types`) and a weight that grows or shrinks
// its share (a power diagram, so sizes vary from a handful of sections to dozens). Section coordinates are warped by noise
// (`warp`, `warpScale`) before the nearest site is found, so borders wander. A region does not paint tiles: it leans the
// landscape fields its way (`lean`), so the land inside it is that land and its edges blend over `blend` sections. "wild"
// regions leave the fields alone (the old mix). Dream regions only stand past the Far Sleep's edge (elsewhere they are wild),
// and the three plains (ash, glass, ember) also give their region one ground colour where no landscape lies. Within
// `heartland` sections of Ember Refuge (straight-line) the old mix stands, and regions take hold over the next `fadeIn`.
// Pure; cached per site cell.
export const REGIONS = { heartland: 12, fadeIn: 4, cell: 9, jitter: .8, weightSpread: 3.5, warp: 3.2, warpScale: 7, blend: 1.4,
  types: [["wild", 2.2], ["sea", 1.1], ["mountains", 1], ["desert", 1], ["alien", .8], ["swamp", .7], ["lakes", .6], ["isles", .6], ["dream", .45], ["ashfields", .7], ["glasslands", .6], ["emberlands", .6]],
  lean: { sea: { ocean: .32 }, isles: { ocean: .2 }, mountains: { mountain: .3, ocean: -.25 }, desert: { desert: .3, ocean: -.25, wet: -.3, lake: -.2 },
    alien: { alien: .3, ocean: -.2 }, swamp: { wet: .11, ocean: -.2, desert: -.3 }, lakes: { lake: .2, ocean: -.15 }, dream: { ocean: -.2, mountain: -.2 },
    ashfields: { ocean: -.25, mountain: -.25, desert: -.3, alien: -.3, wet: -.3, lake: -.2 }, glasslands: { ocean: -.25, mountain: -.25, desert: -.3, alien: -.3, wet: -.3, lake: -.2 },
    emberlands: { ocean: -.25, mountain: -.25, desert: -.3, alien: -.3, wet: -.3, lake: -.2 },
    forest: { ocean: -.15, desert: -.35, alien: -.3, wet: -.12, mountain: -.1, lake: -.05 }, lunar: { ocean: -.3, wet: -.4, lake: -.3, desert: -.25, mountain: -.15, alien: -.15 }, /* 579 */ pillars: { ocean: -.3, wet: -.4, lake: -.3, desert: -.15, mountain: -.2, alien: -.2 }, /* 591 */ fog: { ocean: -.2, desert: -.35, alien: -.3, mountain: -.15, lake: -.1 }, /* 617 */ jungle: { ocean: -.2, desert: -.4, alien: -.25, mountain: -.15, wet: .04 }, biomech: { ocean: -.3, wet: -.35, lake: -.3, desert: -.2, alien: -.2, mountain: -.2 }, salt: { ocean: -.18, desert: -.1, alien: -.3, mountain: -.25, lake: -.1 }, crystal: { ocean: -.3, wet: -.35, lake: -.25, desert: -.25, alien: -.1, mountain: -.15 }, fungal: { ocean: -.25, desert: -.4, alien: -.15, mountain: -.2, wet: -.05 }, /* 625 */ petrified: { ocean: -.25, wet: -.3, lake: -.2, desert: -.15, alien: -.25, mountain: -.15 }, savanna: { ocean: -.25, wet: -.3, desert: -.05, alien: -.3, mountain: -.25 }, reef: { ocean: -.1, desert: -.3, alien: -.2, mountain: -.3, lake: .05 }, amber: { ocean: -.2, desert: -.35, alien: -.3, mountain: -.15 }, obsidian: { ocean: -.3, wet: -.4, lake: -.3, desert: -.2, alien: -.15, mountain: -.1 }, /* 629 */ volcanic: { ocean: -.3, wet: -.45, lake: -.35, desert: -.2, alien: -.2, mountain: .05 }, /* 583 */ frost: { desert: -.4, wet: -.3, alien: -.3, ocean: -.1, lake: .05 } }, // release 573 (version 5)
  plains: { ashfields: "ash", glasslands: "glass", emberlands: "ember" } };
const REGION_TOTAL = REGIONS.types.reduce((n, [, w]) => n + w, 0), siteCache = new Map();
function regionSite(seed, cx, cy) {
  const key = `${seed}:${cx}:${cy}`; let q = siteCache.get(key); if (q) return q;
  const h = (k) => (hashSeed(`${seed}:region-site:v1:${cx}:${cy}:${k}`) % 10007) / 10007, C = REGIONS.cell, J = REGIONS.jitter;
  let pick = h("type") * REGION_TOTAL, type = "wild"; for (const [t, w] of REGIONS.types) { if ((pick -= w) < 0) { type = t; break; } }
  q = { x: (cx + .5 + (h("x") - .5) * J) * C, y: (cy + .5 + (h("y") - .5) * J) * C, w: (h("w") - .5) * REGIONS.weightSpread, type, id: `${cx},${cy}` };
  siteCache.set(key, q); if (siteCache.size > 4096) siteCache.delete(siteCache.keys().next().value);
  return q;
}
// The region at a point given in section units (tile / 32), with how firmly it holds there (1 inside, toward 0 at its edge).
// Release 573 (Tim: "we should have some actual forest sections... there should be some ice regions... when you generate a
// region, you can generate a name as well"): from version 5 some wild regions become forests or frostlands (`wildTo`, decided
// per region by its own hash, so every other region keeps the type it had in version 4 and borders with older ground still
// meet), and every region has a name (regionName).
export const REGIONS_V5 = { wildTo: [["forest", .3], ["frost", .2]] };
// Release 579 (the daily world-regions work; Tim: "a lunar / alien-planet surface"): from version 6 a region still wild after
// the version 5 roll may become moonlands (`REGIONS_V6.wildTo`, its own hash), so forests and frostlands stay where they were.
export const REGIONS_V6 = { wildTo: [["lunar", .3]] };
// Release 583 (Tim: "let's do the volcanic region next"): from version 7 a region still wild after the version 6 roll may become
// a volcanic one (`REGIONS_V7.wildTo`, its own hash), so moonlands, forests and frostlands stay where they were.
export const REGIONS_V7 = { wildTo: [["volcanic", .3]] };
// Release 591 (Tim, 2026-10-30: "make those platforms a part of the world... sections of the world that have those tall platforms
// ... dungeons on top of them"): from version 8 a region still wild after the version 7 roll may become pillar lands.
export const REGIONS_V8 = { wildTo: [["pillars", .3]] };
// Release 617 (the daily world-regions work; Tim's list: "fog regions"): from version 9 a region still wild after the version 8
// roll may become fog moors.
export const REGIONS_V9 = { wildTo: [["fog", .3]] };
// Release 625 (Tim, 2026-10-31: "do... 10 sets of... daily region passes... condense them into today"): by version 9 hardly any
// region is still wild (about 2%), so version 10 also draws on the bare plains (ashfields, glasslands, emberlands: about 15% of
// regions). Each such region rolls once, on its own hash, and may become one of the palette regions (PALETTE_REGIONS).
export const REGIONS_V10 = { from: ["wild", "ashfields", "glasslands", "emberlands"], to: [["jungle", .12], ["biomech", .08], ["salt", .1], ["crystal", .08], ["fungal", .1]] };
function v10RegionType(seed, id, type) {
  if (!REGIONS_V10.from.includes(type)) return type;
  let roll = (hashSeed(`${seed}:region-site:v10:${id}`) % 10007) / 10007; for (const [t, p] of REGIONS_V10.to) { if ((roll -= p) < 0) return t; }
  return type;
}
// Release 629 (the same blitz, second batch): version 11 rolls again, on its own hash, over what is still wild or bare plains.
export const REGIONS_V11 = { from: ["wild", "ashfields", "glasslands", "emberlands"], to: [["petrified", .1], ["savanna", .12], ["reef", .08], ["amber", .1], ["obsidian", .08]] };
function v11RegionType(seed, id, type) {
  if (!REGIONS_V11.from.includes(type)) return type;
  let roll = (hashSeed(`${seed}:region-site:v11:${id}`) % 10007) / 10007; for (const [t, p] of REGIONS_V11.to) { if ((roll -= p) < 0) return t; }
  return type;
}
function wildRegionType(seed, id, version = 5) {
  let roll = (hashSeed(`${seed}:region-site:v5:${id}`) % 10007) / 10007;
  for (const [t, p] of REGIONS_V5.wildTo) { if ((roll -= p) < 0) return t; }
  if (version >= 6) { let r6 = (hashSeed(`${seed}:region-site:v6:${id}`) % 10007) / 10007; for (const [t, p] of REGIONS_V6.wildTo) { if ((r6 -= p) < 0) return t; } }
  if (version >= 7) { let r7 = (hashSeed(`${seed}:region-site:v7:${id}`) % 10007) / 10007; for (const [t, p] of REGIONS_V7.wildTo) { if ((r7 -= p) < 0) return t; } }
  if (version >= 8) { let r8 = (hashSeed(`${seed}:region-site:v8:${id}`) % 10007) / 10007; for (const [t, p] of REGIONS_V8.wildTo) { if ((r8 -= p) < 0) return t; } }
  if (version >= 9) { let r9 = (hashSeed(`${seed}:region-site:v9:${id}`) % 10007) / 10007; for (const [t, p] of REGIONS_V9.wildTo) { if ((r9 -= p) < 0) return t; } }
  return "wild";
}
export function regionAt(seed, sx, sy, version = 4) {
  const W = REGIONS.warp, S = REGIONS.warpScale, wx = sx + (valueNoise(`${seed}:region:warp:x`, sx / S, sy / S) - .5) * 2 * W, wy = sy + (valueNoise(`${seed}:region:warp:y`, sx / S, sy / S) - .5) * 2 * W;
  const C = REGIONS.cell, cx = Math.floor(wx / C), cy = Math.floor(wy / C); let best = null, bd = Infinity, second = Infinity;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const q = regionSite(seed, cx + i, cy + j), d = Math.hypot(wx - q.x, wy - q.y) - q.w; if (d < bd) { second = bd; bd = d; best = q; } else if (d < second) second = d; }
  let type = best.type; if (type === "dream" && Math.abs(sx) + Math.abs(sy) <= FAR_SLEEP_DEPTH + 1) type = "wild";
  if (version >= 5 && type === "wild") type = wildRegionType(seed, best.id, version);
  if (version >= 10) type = v10RegionType(seed, best.id, type); // release 625
  if (version >= 11) type = v11RegionType(seed, best.id, type); // release 629
  if (version >= 15) { const civ = farCivAt(seed, sx, sy); if (civ && version >= civ.landSince) type = civ.land; } // release 716: a civilisation's country is its own land (717: from its own version)
  const ring = Math.hypot(sx, sy), fade = Math.max(0, Math.min(1, (ring - REGIONS.heartland) / REGIONS.fadeIn)); // the heartland round Ember Refuge keeps the old mix
  return { id: best.id, type: fade > 0 ? type : "wild", hold: Math.min(1, (second - bd) / REGIONS.blend) * fade, gap: fade > 0 ? second - bd : Infinity };
}
// The region of a whole section (sampled at its centre).
export const sectionRegion = (seed, rx, ry, version = 4) => regionAt(seed, rx + .5, ry + .5, version);
// A region's name ("the Hollow Weald"), from its id and type: the same region always has the same name.
export const REGION_NAMES = {
  words: ["Hollow", "Long", "Quiet", "Ashen", "Pale", "Bitter", "Drowned", "Silver", "Lantern", "Broken", "Wandering", "Sleepless", "Rusted",
    "Thorn", "Grey", "Ember", "Whispering", "Low", "High", "Far", "Old", "Salt", "Glass", "Weeping", "Iron", "Kindled", "Lost", "Endless",
    "Hermit's", "Weaver's", "Cartographer's", "Saint's", "Antler", "Moth", "Bell", "Cinder", "Lonely", "Crooked", "Golden", "Hushed"],
  nouns: { wild: ["Marches", "Reaches", "Tangle", "Wilds", "Borderlands", "Shifting Lands"], sea: ["Sea", "Deep", "Gulf", "Expanse", "Water"],
    mountains: ["Peaks", "Spine", "Heights", "Teeth", "Range"], desert: ["Waste", "Dunes", "Barrens", "Sands", "Erg"], alien: ["Garden", "Bloom", "Lattice", "Strangeland", "Reef"],
    swamp: ["Fen", "Mire", "Bog", "Sump", "Marsh"], lakes: ["Meres", "Lakes", "Tarns", "Waters"], isles: ["Isles", "Archipelago", "Scatter", "Keys"],
    dream: ["Sleep", "Reverie", "Dreaming", "Slumber"], ashfields: ["Ashfields", "Cinderplain", "Greys"], glasslands: ["Glasslands", "Shards", "Mirrorfields"],
    emberlands: ["Emberlands", "Kilnlands", "Smoulder"], lunar: ["Mare", "Moonfields", "Craters", "Highlands", "Dust"], volcanic: ["Firelands", "Caldera", "Cinders", "Furnace", "Burning Lands"], fog: ["Moor", "Mists", "Fogs", "Greyfells", "Murk", "Hollows"], jungle: ["Jungle", "Canopy", "Green Deep", "Vines", "Rainwood"], biomech: ["Carapace", "Ossuary", "Engine", "Ribwork", "Husk"], salt: ["Saltings", "Brines", "Salt Pans", "Salt Marsh", "Flats"], crystal: ["Prisms", "Facets", "Geodes", "Crystal Fields", "Lattice Fields"], fungal: ["Sporewood", "Caps", "Mycelium", "Gills", "Rotwood"], petrified: ["Stonewood", "Petrified Wood", "Grey Grove", "Fossil Wood"], savanna: ["Savanna", "Grasslands", "Veldt", "Long Grass", "Plains"], reef: ["Reef", "Coral Flats", "Shoals", "Tidelands"], amber: ["Amberwood", "Autumn Wood", "Leaffall", "Russet Wood"], obsidian: ["Obsidian", "Black Glass", "Mirrors", "Quicksilver Fields"], pillars: ["Pillars", "Mesas", "Tablelands", "Hoodoos", "Stone Forest", "Tepuis"], forest: ["Wood", "Weald", "Forest", "Pines", "Greenwood"], frost: ["Frost", "Snows", "Rime", "Icefields", "Tundra"] },
};
export function regionName(seed, region) {
  const h = hashSeed(`${seed}:region-name:v1:${region.id}`), N = REGION_NAMES, nouns = N.nouns[region.type] || N.nouns.wild;
  return `the ${N.words[h % N.words.length]} ${nouns[Math.floor(h / N.words.length) % nouns.length]}`;
}
// The region under a tile, looked up once per 4×4 tiles (borders blend over ~45 tiles, so this is invisible) and kept in a
// bounded cache, so generating a section costs a few hundred lookups, not thousands.
const leanCache = new Map();
function regionTile(seed, gx, gy, version = 4) {
  const v = version >= 11 ? 11 : version >= 10 ? 10 : version >= 9 ? 9 : version >= 8 ? 8 : version >= 7 ? 7 : version >= 6 ? 6 : version >= 5 ? 5 : 4, cx = gx >> 2, cy = gy >> 2, key = `${seed}:${v}:${cx}:${cy}`; let r = leanCache.get(key);
  if (!r) { r = regionAt(seed, (cx * 4 + 2) / 32, (cy * 4 + 2) / 32, v); leanCache.set(key, r); if (leanCache.size > 30000) leanCache.delete(leanCache.keys().next().value); }
  return r;
}
function lean(seed, gx, gy, name, version) { if (version < 4) return 0; const r = regionTile(seed, gx, gy, version), d = REGIONS.lean[r.type]?.[name]; return d ? d * r.hold : 0; }
const fieldAt = (name, seed, gx, gy, version) => field[name](seed, gx, gy) + lean(seed, gx, gy, name, version);
// Version 2 sea level: the version 1 field bent by the continent field (seas), minus island lift. `open` is before islands.
// Version 4 adds the region's lean.
function seaLevel(seed, gx, gy, version) {
  const base = field.ocean(seed, gx, gy) + lean(seed, gx, gy, "ocean", version);
  if (version < 2) return { o: base, open: base };
  const open = base + (field.continent(seed, gx, gy) - .5) * WATERBODIES.continent.weight, isl = field.island(seed, gx, gy);
  return { o: open > T.beach && isl > WATERBODIES.island.threshold ? open - (isl - WATERBODIES.island.threshold) * WATERBODIES.island.lift : open, open };
}

// The section's dominant biome (sampled at its centre), used for the atlas and for section-wide features.
export function biomeFor(seed, rx, ry, version = LANDSCAPE_VERSION) {
  if (Math.abs(rx) + Math.abs(ry) <= 1) return null;
  const gx = rx * 32 + 16, gy = ry * 32 + 16;
  if (version >= 2) {
    const { o, open } = seaLevel(seed, gx, gy, version);
    if (o > T.ocean + WATERBODIES.deep) return "sea";
    if (open > T.ocean && o <= T.beach) return "isles";
    if (o > T.ocean) return "coast";
  } else if (field.ocean(seed, gx, gy) > T.ocean) return "coast";
  if (fieldAt("mountain", seed, gx, gy, version) > T.mountain) return "mountains";
  if (castleSection(seed, rx, ry)) return "castle";
  if (fieldAt("alien", seed, gx, gy, version) > T.alien) return "alien";
  if (fieldAt("desert", seed, gx, gy, version) > T.desert) return "desert";
  if (version >= 2) {
    if (fieldAt("lake", seed, gx, gy, version) > WATERBODIES.lake.rim) return "lake";
    const wet = fieldAt("wet", seed, gx, gy, version);
    if (wet > WATERBODIES.swamp.blight) return "blight";
    if (wet > WATERBODIES.swamp.threshold) return "swamp";
  }
  // A section can still touch a neighbouring biome's edge (coastline, foothills); report that for the atlas.
  for (const [dx, dy] of [[-12, 0], [12, 0], [0, -12], [0, 12]]) {
    if (seaLevel(seed, gx + dx, gy + dy, version).o > T.beach) return "coast";
    if (fieldAt("mountain", seed, gx + dx, gy + dy, version) > T.mountain) return "mountains";
  }
  return null;
}

// Rare landmark: one candidate section per 7x7 macrocell, never in water or the starting ring.
export function castleSection(seed, rx, ry) {
  const mx = Math.floor(rx / 7), my = Math.floor(ry / 7), n = hashSeed(`${seed}:land:castle:${mx}:${my}`);
  const cx = mx * 7 + (n % 7), cy = my * 7 + (Math.floor(n / 7) % 7);
  if (cx !== rx || cy !== ry || Math.abs(rx) + Math.abs(ry) <= 2) return false;
  return field.ocean(seed, rx * 32 + 16, ry * 32 + 16) < T.beach - .05 && field.mountain(seed, rx * 32 + 16, ry * 32 + 16) < T.mountain;
}

// ---------------------------------------------------------------- application
const idx = (x, y) => y * 32 + x;
const DECOR = new Set(["tree", "rock"]); // ordinary vegetation a castle may clear
function protectedMask(map, { spawns = true, ruins = true, decor = true, plaza = true, exits = true, border = true, reach = 1 } = {}) {
  const mask = new Uint8Array(1024), mark = (x, y, r = 0) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const px = x + dx, py = y + dy; if (px >= 0 && py >= 0 && px < 32 && py < 32) mask[idx(px, py)] = 1; } };
  const e = map.exits || {};
  if (exits) for (let d = -1; d <= 1; d++) {
    for (let y = 0; y <= 16; y++) mark(e.north + d, y);
    for (let y = 16; y < 32; y++) mark(e.south + d, y);
    for (let x = 0; x <= 16; x++) mark(x, e.west + d);
    for (let x = 16; x < 32; x++) mark(x, e.east + d);
  }
  if (plaza) for (let y = 13; y <= 19; y++) for (let x = 13; x <= 19; x++) mark(x, y);
  for (const o of [...(map.objects || []).filter((q) => decor || !DECOR.has(q.kind)), ...(spawns ? map.enemySpawns || [] : [])]) if (Number.isFinite(o?.x) && Number.isFinite(o?.y)) mark(Math.round(o.x), Math.round(o.y), reach);
  for (const t of map.tiles) if (t.structure || t.environment || t.kind === "bridge" || t.buildingId || (ruins && Number.isInteger(t.ruin)) || (border && (t.x === 0 || t.y === 0 || t.x === 31 || t.y === 31))) mask[idx(t.x, t.y)] = 1;
  return mask;
}
function setTile(map, x, y, props) { const i = idx(x, y); map.tiles[i] = { ...map.tiles[i], ...props, landscape: props.landscape || map.tiles[i].landscape }; }

// Mutates a generated overworld section. Returns the map. `explored` sections and excluded sections are untouched.
// `openSea` (release 152, pinned per section by the atlas's seaVersion): deep water may reach the section's border so
// seas run on across sections, and a section that is mostly sea (OPEN_SEA.minWater) drops its dry plaza, exit
// causeways and walled border entirely: open water from edge to edge, with islets kept only around its landmarks.
// Near the Refuge (within `minDepth` sections, by |rx| + |ry|) seas keep their causeways, so the first journeys stay
// walkable; open ocean lies farther out.
export const OPEN_SEA = { minDepth: 8, minWater: .55, landmarkReach: 2, hamletIsle: { halfW: 9, halfH: 7 } };
// Sea features (open-sea version 2, release 156). Each is placed on clear deep water and stays put:
//   buoy   Lighthouse Buoy: a small moored platform with a Wayglass checkpoint, a rest point far from land.
//   wreck  Shipwreck: a hull run aground on a sandbar, with salvage aboard.
//   floe   Ice floes (cold seas only): islands of packed ice you can land on.
// Version 3 (release 158; Tim: not every stretch of sea needs a rest point) makes buoys rarer: one in `buoyEveryV3`.
export const SEA_FEATURES = { buoyEvery: 3, buoyEveryV3: 8, wreckEvery: 4, floes: [1, 3], floeRadius: [1.6, 3.2], coldScale: 7, cold: .66 };
export function coldSea(seed, rx, ry) { return valueNoise(`${seed}:sea:cold`, rx / SEA_FEATURES.coldScale, ry / SEA_FEATURES.coldScale) > SEA_FEATURES.cold; }
function addSeaFeatures(map, seed, rx, ry, buoy = true, version = 2) {
  const F = SEA_FEATURES, h = (k) => hashSeed(`${seed}:sea-feature:${k}:${rx}:${ry}`), deep = (x, y) => x > 2 && y > 2 && x < 29 && y < 29 && DEEP_WATER.includes(map.tiles[idx(x, y)].kind);
  const clear = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (!deep(x, y)) return false; return true; };
  const spot = (k, r) => { const n = h(k); for (let i = 0; i < 60; i++) { const x = 4 + (n + i * 7919) % 24, y = 4 + Math.floor((n / 24 + i * 104729) % 24); if (clear(x, y, r)) return { x, y }; } return null; };
  const paint = (x, y, kind) => setTile(map, x, y, { kind, blocked: false, elev: 0, landscape: "coast", detail: map.tiles[idx(x, y)].detail });
  if (buoy && h("buoy") % (version >= 3 ? F.buoyEveryV3 : F.buoyEvery) === 0 && !map.objects.some((o) => o.kind === "checkpoint")) {
    const at = spot("buoy-at", 2);
    if (at) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) paint(at.x + dx, at.y + dy, "dock"); map.objects.push({ id: `sea-buoy-${rx}-${ry}`, kind: "checkpoint", name: "Lighthouse Buoy", lore: "A lamp on a moored raft, turning for whoever is still out here.", x: at.x, y: at.y, state: "quiet", actions: ["activate"], landmark: true, seaBuoy: true }); }
  }
  if (h("wreck") % F.wreckEvery === 0) {
    const at = spot("wreck-at", 3);
    if (at) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) { const d = Math.abs(dx) / 3.2 + Math.abs(dy) / 2.2; if (d <= .8) paint(at.x + dx, at.y + dy, "beach"); else if (d <= 1.25) paint(at.x + dx, at.y + dy, "shallows"); }
      const n = h("wreck-loot");
      map.objects.push({ id: `wreck-${rx}-${ry}`, kind: "shipwreck", name: "Shipwreck", lore: "A hull from beyond the Corridor, ribs bared on a sandbar.", x: at.x, y: at.y, state: "ready", actions: ["salvage"], landmark: true, salvage: { marks: 30 + n % 60, wood: 2 + Math.floor(n / 8) % 3, supply: ["restorativeDraught", "ironbarkTonic", "lumenPhial"][Math.floor(n / 64) % 3] } });
    }
  }
  if (coldSea(seed, rx, ry)) {
    const n = F.floes[0] + h("floes") % (F.floes[1] - F.floes[0] + 1);
    for (let k = 0; k < n; k++) {
      const r = F.floeRadius[0] + (h(`floe-r-${k}`) % 100) / 100 * (F.floeRadius[1] - F.floeRadius[0]), at = spot(`floe-${k}`, Math.ceil(r) + 1);
      if (!at) continue;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const a = Math.atan2(dy, dx), edge = r * (.75 + .25 * valueNoise(`${seed}:floe:${rx}:${ry}:${k}`, Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3));
        if (Math.hypot(dx, dy) <= edge) setTile(map, at.x + dx, at.y + dy, { kind: "snowRock", blocked: false, elev: 0, landscape: "mountains", seaIce: true, detail: map.tiles[idx(at.x + dx, at.y + dy)].detail });
      }
    }
  }
}
// True when a section would be generated as full open sea (the same test applyLandscape uses).
export function openSeaSection(seed, rx, ry, version = LANDSCAPE_VERSION) { return version >= 2 && Math.abs(rx) + Math.abs(ry) >= OPEN_SEA.minDepth && openSeaShare(seed, rx, ry, version) >= OPEN_SEA.minWater; }
// Perf pack (WG-09): 256 sea-level samples, asked again for each neighbour a castle, Pentagon or wonder check looks at, so
// the answer is kept per section (it depends on nothing else).
const seaShares = new Map();
export function openSeaShare(seed, rx, ry, version = LANDSCAPE_VERSION) {
  const key = `${seed}\u0001${rx}\u0001${ry}\u0001${version}`, known = seaShares.get(key); if (known !== undefined) return known;
  let n = 0; for (let y = 0; y < 32; y += 2) for (let x = 0; x < 32; x += 2) if (seaLevel(seed, rx * 32 + x, ry * 32 + y, version).o > T.ocean) n++;
  if (seaShares.size >= 4096) seaShares.clear();
  seaShares.set(key, n / 256); return n / 256;
}
export function applyLandscape(map, seed, rx, ry, { explored = false, version = LANDSCAPE_VERSION, openSea = false, hamlet = false, buoy = true, coherence = 0 } = {}) {
  if (!map || map.landscape || explored || map.settlement || Math.abs(rx) + Math.abs(ry) <= 1 || map.tiles?.length !== 1024) return map;
  const full = openSea && version >= 2 && Math.abs(rx) + Math.abs(ry) >= OPEN_SEA.minDepth && openSeaShare(seed, rx, ry, version) >= OPEN_SEA.minWater;
  const walls = coherence >= 1, plazaReach = walls ? (m, start) => reachableFromPlaza(m, start, true) : reachableFromPlaza; // WG-06: thin walls count, new ground only
  const mask = full ? protectedMask(map, { spawns: false, decor: false, ruins: false, plaza: false, exits: false, border: false, reach: OPEN_SEA.landmarkReach }) : protectedMask(map, { border: !openSea }), biome = biomeFor(seed, rx, ry, version), v2 = version >= 2, W = WATERBODIES;
  // A hamlet in open sea keeps an island to stand on.
  // Shelters and districts in open sea stand on their own islands, with a strand around them.
  if (full) {
    const keep = new Uint8Array(1024);
    for (const t of map.tiles) if (t.structure || t.buildingId) keep[idx(t.x, t.y)] = 1;
    for (const o of map.objects || []) if (o.bounds) for (let y = o.bounds.y; y < o.bounds.y + o.bounds.h; y++) for (let x = o.bounds.x; x < o.bounds.x + o.bounds.w; x++) if (x >= 0 && y >= 0 && x < 32 && y < 32) keep[idx(x, y)] = 1;
    for (let i = 0; i < 1024; i++) if (keep[i]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = i % 32 + dx, y = Math.floor(i / 32) + dy; if (x >= 0 && y >= 0 && x < 32 && y < 32) mask[idx(x, y)] = 1; }
  }
  const isle = new Uint8Array(1024);
  if (full && hamlet) { const h = OPEN_SEA.hamletIsle; for (let y = 16 - h.halfH; y <= 16 + h.halfH; y++) for (let x = 16 - h.halfW; x <= 16 + h.halfW; x++) { mask[idx(x, y)] = 1; if (Math.abs(x - 16) < h.halfW && Math.abs(y - 16) < h.halfH) isle[idx(x, y)] = 1; } }
  let touched = 0;
  // Release 211: in version 3, borders are visited in every section, but only water opens them (see below). Versions 1
  // and 2 keep their exact output (tests pin them byte for byte): borders only in sea sections, only to deep water.
  const openEdges = version >= 3, lo = openSea || openEdges ? 0 : 1, hi = openSea || openEdges ? 32 : 31;
  const edgeMask = !openEdges || openSea || full ? mask : protectedMask(map, { border: false });
  for (let y = lo; y < hi; y++) for (let x = lo; x < hi; x++) {
    const i = idx(x, y), t = map.tiles[i], gx = rx * 32 + x, gy = ry * 32 + y, d = hashSeed(`${seed}:land:detail:${gx}:${gy}`) % 997;
    const prot = mask[i] === 1, o = seaLevel(seed, gx, gy, version).o, m = fieldAt("mountain", seed, gx, gy, version), a = fieldAt("alien", seed, gx, gy, version), s = fieldAt("desert", seed, gx, gy, version);
    // Borders open only to water (release 211, Tim 2026-10-19). Before, only deep sea reached a border, and only in sea
    // sections; a shallow channel or a lake reaching the edge kept the section wall there and stopped skiffs. In version
    // 3 (the current landscape, explored sections included, at Tim's request: it only removes walls where water runs on
    // across the border) sea shallows and lake water open the border in every section.
    if ((x === 0 || y === 0 || x === 31 || y === 31) && !openEdges && (prot || o <= T.ocean)) continue; // versions 1–2: deep water only
    if ((x === 0 || y === 0 || x === 31 || y === 31) && openEdges) {
      if (edgeMask[i] === 1) continue;
      if (o <= SHALLOWS_FROM) {
        const lk = v2 ? fieldAt("lake", seed, gx, gy, version) : 0;
        if (lk > W.lake.rim) { setTile(map, x, y, lk > W.lake.water ? { kind: "lakeWater", blocked: true, elev: 0, landscape: "lake", detail: d } : { kind: "shallows", blocked: false, elev: 0, landscape: "lake", detail: d }); touched++; }
        continue;
      }
      if (!openSea && o > T.ocean) continue; // deep sea at the edge of a non-sea section stays walled, as before
    }
    if (o > T.beach) {
      const deep = o > T.ocean, abyssal = v2 && o > T.ocean + W.deep;
      if (isle[i]) { setTile(map, x, y, { kind: "beach", blocked: false, elev: 0, landscape: "coast", detail: d }); touched++; continue; }
      setTile(map, x, y, deep && !prot ? { kind: abyssal ? "deepOcean" : "ocean", blocked: true, elev: 0, landscape: abyssal ? "sea" : "coast", detail: d } : { kind: deep || o > SHALLOWS_FROM ? "shallows" : "beach", blocked: false, elev: 0, landscape: "coast", detail: d });
      touched++; continue;
    }
    if (t.blocked && !t.landscape) continue; // ruins and section walls stay
    if (m > T.mountain) {
      const ridge = 1 - Math.abs(valueNoise(`${seed}:land:ridge`, gx / 9, gy / 9) * 2 - 1), height = Math.min(1, (m - T.mountain + .015) / .06) * (.6 + ridge * .4);
      const elev = prot ? 0 : Math.max(0, Math.min(MAX_LEVEL, Math.floor(height * 5.99)));
      const crag = !prot && elev >= 4 && valueNoise(`${seed}:land:crag`, gx / 2.3, gy / 2.3) > .8;
      setTile(map, x, y, { kind: crag ? "crag" : mountainKind(elev), blocked: crag, elev, landscape: "mountains", detail: d });
      touched++; continue;
    }
    if (a > T.alien) {
      const plat = !prot && valueNoise(`${seed}:land:platform`, gx / 4, gy / 4) > .7, spire = !prot && !plat && valueNoise(`${seed}:land:spire`, gx / 1.7, gy / 1.7) > .86;
      const pool = !prot && !plat && !spire && valueNoise(`${seed}:land:pool`, gx / 3.1, gy / 3.1) > .82;
      setTile(map, x, y, spire ? { kind: "crystalSpire", blocked: true, elev: 0, landscape: "alien", detail: d } : pool ? { kind: "alienPool", blocked: true, elev: 0, landscape: "alien", detail: d }
        : { kind: plat ? "alienPlatform" : "alienMoss", blocked: false, elev: plat ? 1 + (valueNoise(`${seed}:land:platform2`, gx / 2, gy / 2) > .72 ? 1 : 0) : 0, landscape: "alien", detail: d });
      touched++; continue;
    }
    if (s > T.desert) {
      const dune = Math.sin(gx * .42 + Math.sin(gy * .19) * 2.4 + valueNoise(`${seed}:land:dune`, gx / 7, gy / 7) * 3), mesa = !prot && valueNoise(`${seed}:land:mesa`, gx / 5, gy / 5) > .84;
      const elev = prot ? 0 : mesa ? 2 : dune > .35 ? 1 : 0;
      setTile(map, x, y, { kind: mesa ? "mesaTop" : elev === 1 ? (dune > .82 ? "duneCrest" : "sand") : "sand", blocked: false, elev, landscape: "desert", detail: d });
      touched++; continue;
    }
    if (!v2) continue;
    const lk = fieldAt("lake", seed, gx, gy, version);
    if (lk > W.lake.rim) {
      setTile(map, x, y, lk > W.lake.water && !prot ? { kind: "lakeWater", blocked: true, elev: 0, landscape: "lake", detail: d } : { kind: "shallows", blocked: false, elev: 0, landscape: "lake", detail: d });
      touched++; continue;
    }
    const wet = fieldAt("wet", seed, gx, gy, version);
    if (wet > W.swamp.threshold) {
      const blight = wet > W.swamp.blight, pool = valueNoise(`${seed}:land:mire`, gx / W.swamp.poolScale, gy / W.swamp.poolScale);
      const kind = pool > W.swamp.pool && !prot ? (blight ? "toxicWater" : "swampWater") : pool > W.swamp.mire ? (blight ? "toxicMire" : "mireWater") : (blight ? "toxicBog" : "bogGround");
      setTile(map, x, y, { kind, blocked: kind === "toxicWater" || kind === "swampWater", elev: 0, landscape: blight ? "blight" : "swamp", detail: d });
      touched++;
    }
  }
  if (version >= 4) { // release 569: a plains region keeps one ground colour where no landscape lies
    const plain = REGIONS.plains[sectionRegion(seed, rx, ry).type];
    if (plain) { for (const t of map.tiles) if (!t.landscape && !t.structure && !t.buildingId && (t.kind === "ash" || t.kind === "glass" || t.kind === "ember")) t.kind = plain; map.dominant = plain; }
  }
  if (version >= 5 && !full) touched += applyWoodsAndFrost(map, seed, rx, ry, mask, hamlet); // release 573
  if (version >= 6 && !full) touched += applyMoonlands(map, seed, rx, ry); // release 579
  if (version >= 7 && !full) touched += applyFirelands(map, seed, rx, ry, mask); // release 583
  if (version >= 8 && !full) touched += applyPillarGround(map, seed, rx, ry, mask); // release 591
  if (version >= 9 && !full) touched += applyFogMoor(map, seed, rx, ry, mask); // release 617
  if (version >= 10 && !full) touched += applyPaletteRegions(map, seed, rx, ry, mask, hamlet, version); // release 625; 629: version-aware
  if (biome === "castle") touched += buildCastle(map, seed, rx, ry, protectedMask(map, { spawns: false, ruins: false, decor: false }));
  if (!touched) return map;
  if (biome === "mountains" && hashSeed(`${seed}:land:volcano:${rx}:${ry}`) % 3 === 0) buildVolcano(map, seed, rx, ry, mask);
  else if (map.firelands && hashSeed(`${seed}:land:fire-caldera:${rx}:${ry}`) % FIRE.calderaEvery === 0) buildVolcano(map, seed, rx, ry, mask); // release 583
  ensureClimbable(map, mask);
  if (biome === "mountains") buildSkyBridges(map, seed, rx, ry, mask);
  markSlopes(map, seed, rx, ry);
  if (full) {
    // Open sea: trees and rocks that ended up in the water go, and so do land creatures (the sea has its own).
    const wet = (q) => DEEP_WATER.includes(map.tiles[idx(Math.round(q.x), Math.round(q.y))]?.kind);
    map.objects = (map.objects || []).filter((q) => !(DECOR.has(q.kind) && wet(q)));
    map.enemySpawns = (map.enemySpawns || []).filter((q) => !wet(q));
    map.openSea = true;
    if (openSea >= 2) addSeaFeatures(map, seed, rx, ry, buoy, openSea);
  } else connectStranded(map, walls);
  if (biome === "mountains" || biome === "desert" || biome === "alien") placeSummit(map, seed, rx, ry, biome, coherence);
  for (const t of ensureReturnable(map, 32, 32, { x: 16, y: 16 }, walls)) if (t.landscape === "mountains" && !t.volcanic && !t.slope && t.kind !== "skyBridge") t.kind = mountainKind(t.elev || 0);
  addRamps(map, 32, 32, `${seed}:${rx}:${ry}`);
  if (v2) placeIslandLandmark(map, seed, rx, ry);
  if (version >= 3) placeDock(map, seed, rx, ry, reachableFromPlaza(map, undefined, walls));
  if (biome === "mountains") map.weather = "snow";
  else if (map.firelands) map.weather = "embers"; // release 583
  else if (map.fogMoor) map.weather = "fog"; // release 617
  if (version >= 5) for (const t of map.tiles) if (t.landscape === "mountains" && (t.kind === "alpineGrass" || t.kind === "mountainRock") && regionTile(seed, rx * 32 + t.x, ry * 32 + t.y, 5).type === "frost") t.kind = "snowRock"; // release 573: frost mountains are snowbound
  if (map.pillarlands) buildMesas(map, seed, rx, ry); // release 591: last, so nothing after it ramps or lowers them
  if (version >= 14 && !full) { const region = treeRegion(map); if (region) growTrees(map, seed, rx, ry, { ground: canopyGround(map, region), reachable: plazaReach, trapped: (m) => trappedTiles(m, 32, 32, { x: 16, y: 16 }, walls), version, region }); } // release 672
  else if (version >= 13 && !full && map.paletteRegion) growTrees(map, seed, rx, ry, { ground: canopyGround(map), reachable: plazaReach, trapped: (m) => trappedTiles(m, 32, 32, { x: 16, y: 16 }, walls) }); // release 645: the tree package
  else if (version >= 12 && !full && map.paletteRegion) buildCanopyTree(map, seed, rx, ry); // release 631: likewise last
  if (version >= 17 && !full) growMushrooms(map, seed, rx, ry, { reachable: plazaReach, version }); // release 721: the great mushrooms, after the trees
  map.landscape = { version, biome: biome || dominantLandscape(map), name: (BIOMES[biome || dominantLandscape(map)] || REGION_GROUNDS[biome || dominantLandscape(map)])?.name || null, ...(openSea ? { openSea: full ? "open" : "coast" } : {}) };
  return map;
}

// One island landmark per macrocell of sea, placed after causeways so it stays an island (reached by swimming, and
// later by boat). Picks the candidate section's island tile farthest from the plaza.
const LANDMARKS = [["Tide Shrine", "Shell-crusted stones ring a basin that fills and empties with no tide."], ["Wrecked Hull", "A ship's ribs, bleached and barnacled. Whoever sailed her came from beyond the Corridor."], ["Drowned Beacon", "A lighthouse lamp, cold, still turning toward the open sea."]];
export function placeIslandLandmark(map, seed, rx, ry) {
  const M = WATERBODIES.landmarkMacrocell, mx = Math.floor(rx / M), my = Math.floor(ry / M), n = hashSeed(`${seed}:land:isle-mark:${mx}:${my}`);
  if (mx * M + (n % M) !== rx || my * M + (Math.floor(n / M) % M) !== ry) return null;
  const reach = reachableFromPlaza(map), water = (t) => t && DEEP_WATER.includes(t.kind);
  let best = null;
  for (const t of map.tiles) {
    if (t.blocked || t.x < 2 || t.y < 2 || t.x > 29 || t.y > 29 || reach[idx(t.x, t.y)] || !map.tiles.some((q) => water(q))) continue;
    if (!N4.some(([dx, dy]) => water(map.tiles[idx(t.x + dx, t.y + dy)]) || !map.tiles[idx(t.x + dx, t.y + dy)]?.blocked)) continue;
    if (map.objects.some((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 2)) continue;
    const dd = Math.hypot(t.x - 16, t.y - 16);
    if (!best || dd > best.dd) best = { t, dd };
  }
  if (!best) return null;
  const [name, lore] = LANDMARKS[n % LANDMARKS.length], o = { id: `landscape-isle-${rx}-${ry}`, kind: "ruinMarker", name, lore, x: best.t.x, y: best.t.y, state: "quiet", actions: ["inspect"], landmark: true, islandLandmark: true };
  map.objects.push(o);
  return o;
}

// ---------------------------------------------------------------- forests and frostlands (release 573, version 5)
// Tim: "we should have some actual forest sections where there's just... a bunch of trees... that you can chop down. It can
// be passed through... some taller trees... that reach beyond the frame... you can walk behind them... maybe you can see
// like a silhouette" and "there should be some ice regions". Inside a forest region the bare ground turns to forest floor and
// trees stand thick (`density`, opened into clearings by noise, at most `max`), each one a tree you can cut for wood or walk
// between; about one in `giantEvery` is a giant whose crown rises out of view (no two within `giantGap` tiles). A section
// with a hamlet keeps its ground clear. Inside a frost region the bare ground is snow, lakes are frozen over and walkable,
// low mountain slopes are snowbound and ice spires stand here and there. Trees also grow on the firm ground of a fen in a forest. Regions are read per tile, so their edges wander
// through a section.
export const WOODS = { density: .46, clearing: { scale: 5, below: .3 }, max: 140, giantEvery: 8, giantGap: 4, giantWood: 5, forms: ["canopy", "canopy", "spindle", "shrub"] };
export const FROST = { spire: { scale: 1.9, above: .86 } };
const BARE_GROUND = new Set(["ash", "glass", "ember"]);
// Firelands (release 583, version 7): bare ground in a volcanic region becomes black basalt, split by glowing fissures (noise,
// walkable, harmless) with drifts of ash, and `FIRE.pools` lava pools (lethal, as all lava) on unprotected basalt. A pool that
// would cut any walkable ground off from the plaza is not made, so everything stays reachable. One section in
// `calderaEvery` also holds a smouldering caldera (buildVolcano: lava bombs). Embers fall. Bounded per section.
export const FIRE = { pools: [3, 6], radius: [1.1, 2.3], fissure: { scale: 3.2, band: .035 }, ash: { scale: 5, above: .64 }, calderaEvery: 2 };
function lavaBlocked(map) { // walkable ground cut off from the plaza when lava counts as a wall
  const seen = new Uint8Array(1024), q = [idx(16, 16)]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % 32, y = Math.floor(i / 32); for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny), b = map.tiles[j]; if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j] || !b || b.blocked || b.kind === "lava") continue; seen[j] = 1; q.push(j); } }
  return seen;
}
function applyFirelands(map, seed, rx, ry, mask) {
  let touched = 0; const F = FIRE, basalt = [];
  for (const t of map.tiles) {
    if (t.structure || t.buildingId || t.blocked || t.landscape || !BARE_GROUND.has(t.kind)) continue;
    const gx = rx * 32 + t.x, gy = ry * 32 + t.y; if (regionTile(seed, gx, gy, 7).type !== "volcanic") continue;
    const crack = Math.abs(valueNoise(`${seed}:fire:fissure`, gx / F.fissure.scale, gy / F.fissure.scale) - .5) < F.fissure.band, ash = valueNoise(`${seed}:fire:ash`, gx / F.ash.scale, gy / F.ash.scale) > F.ash.above;
    t.kind = crack ? "basaltFissure" : ash ? "ashSlope" : "basalt"; t.landscape = "volcanic"; touched++;
    if (t.kind === "basalt" && !mask[idx(t.x, t.y)]) basalt.push(t);
  }
  if (!touched) return 0;
  map.firelands = true;
  const h = (k) => hashSeed(`${seed}:fire:v1:${rx}:${ry}:${k}`), n = F.pools[0] + h("n") % (F.pools[1] - F.pools[0] + 1);
  for (let k = 0; k < n && basalt.length; k++) {
    const c = basalt[h(`at${k}`) % basalt.length], r = F.radius[0] + (h(`r${k}`) % 1000) / 1000 * (F.radius[1] - F.radius[0]), before = lavaBlocked(map), changed = [];
    for (let y = Math.floor(c.y - r); y <= c.y + r; y++) for (let x = Math.floor(c.x - r); x <= c.x + r; x++) {
      if (x < 1 || y < 1 || x > 30 || y > 30 || Math.hypot(x - c.x, y - c.y) > r || mask[idx(x, y)]) continue;
      const t = map.tiles[idx(x, y)]; if (t.landscape !== "volcanic" || t.blocked) continue;
      changed.push([t, { kind: t.kind, environment: t.environment }]); t.kind = "lava"; t.environment = "lava";
    }
    const after = lavaBlocked(map); let cut = false;
    for (let i = 0; i < 1024 && !cut; i++) if (before[i] && !after[i] && map.tiles[i].kind !== "lava") cut = true;
    if (cut) for (const [t, was] of changed) { t.kind = was.kind; if (was.environment === undefined) delete t.environment; else t.environment = was.environment; }
  }
  return touched;
}
// Pillar lands (release 591, version 8): bare ground in a pillar region turns to red sandstone dust, with hoodoos (thin rock
// spires, impassable) standing where noise rises (`PILLARS.hoodoo`), never on protected ground. Then, last of all (buildMesas),
// up to `mesas` tablelands rise `height` levels: square tops of the skyway's pale stone (`size` tiles), each climbed by a stair
// of stone pillars, each `step` tiles square, one level lower than the last and a `gap` of open ground apart, so every jump goes up
// one level, as on the 585 skyway (the tiles are skyPlatform: a jump from one keeps its height over the gap). The first mesa
// rises under the section's dungeon (else a shrine or cache) when it has one, so it stands on top; a later one anywhere that fits.
// Mesas and stairs keep off the plaza and the exit causeways, and creatures cannot climb them; nothing spawns on them. Coming down
// is a drop of one level a step, or the whole height at once (fall damage; the height is below the fatal four).
export const PILLARS = { hoodoo: { scale: 1.6, above: .86 }, mesas: [1, 2], size: [4, 6], height: 3, step: 2, gap: 1, tries: 40, holdTries: 16, gapBetween: 2, prefer: ["dungeon", "shrine", "weaponCache", "supplyCache", "ruinMarker"] };
// Fog moors (release 617, version 9): bare ground in a fog region turns to grey heath (`fogMoor`), with shallow mist-pools you
// can wade (`mistPool`, where `FOG.pool` noise rises) and leaning standing stones (`moorStone`, impassable, scattered by `FOG.stone`
// noise, never on protected ground); the section's weather is fog (renderer: drifting banks over the screen, a few per frame).
export const FOG = { pool: { scale: 4.2, above: .74 }, stone: { scale: 1.3, above: .9 } };
function applyFogMoor(map, seed, rx, ry, mask) {
  let touched = 0;
  for (const t of map.tiles) {
    if (t.structure || t.buildingId || t.blocked || t.landscape || !BARE_GROUND.has(t.kind)) continue;
    const gx = rx * 32 + t.x, gy = ry * 32 + t.y; if (regionTile(seed, gx, gy, 9).type !== "fog") continue;
    const stone = !mask[idx(t.x, t.y)] && valueNoise(`${seed}:fog:stone`, gx / FOG.stone.scale, gy / FOG.stone.scale) > FOG.stone.above;
    const pool = valueNoise(`${seed}:fog:pool`, gx / FOG.pool.scale, gy / FOG.pool.scale) > FOG.pool.above;
    Object.assign(t, stone ? { kind: "moorStone", blocked: true, landscape: "fog" } : { kind: pool ? "mistPool" : "fogMoor", landscape: "fog" }); touched++;
  }
  if (touched) map.fogMoor = true;
  return touched;
}
// The palette regions (release 625, version 10): bare ground in such a region becomes its `ground`, with wadeable `pool`s where
// one noise rises and impassable `block`s (never on protected ground) where another peaks; a jungle also grows dense trees
// (`trees`, choppable like the forest's, capped per section). One table row per region: mobile-cheap, no per-frame cost.
export const PALETTE_REGIONS = {
  jungle: { ground: "jungleFloor", pool: { kind: "jungleMire", scale: 3.4, above: .74 }, block: { kind: "buttressRoot", scale: 1.2, above: .9 }, trees: { density: .3, max: 110, forms: ["canopy", "canopy", "canopy", "spindle", "shrub"] } },
  biomech: { ground: "ribPlate", pool: { kind: "oilSlick", scale: 3.8, above: .76 }, block: { kind: "ribSpire", scale: 1.25, above: .86 } },
  salt: { ground: "saltCrust", pool: { kind: "brinePool", scale: 3, above: .66 }, block: { kind: "saltStack", scale: 1.3, above: .91 } },
  crystal: { ground: "crystalShale", pool: { kind: "prismPool", scale: 4, above: .78 }, block: { kind: "crystalCluster", scale: 1.15, above: .87 } },
  fungal: { ground: "sporeLoam", pool: { kind: "sporeBed", scale: 3.2, above: .72 }, block: { kind: "giantCap", scale: 1.4, above: .87 } },
  // Release 629 (version 11): the second batch.
  petrified: { ground: "stoneLitter", pool: { kind: "silicaPool", scale: 3.6, above: .8 }, block: { kind: "stoneTrunk", scale: 1.1, above: .84 }, version: 11 },
  savanna: { ground: "savannaGrass", pool: { kind: "wateringHole", scale: 5, above: .8 }, block: { kind: "acacia", scale: 1.6, above: .9 }, version: 11 },
  reef: { ground: "reefFlat", pool: { kind: "tidePool", scale: 2.8, above: .68 }, block: { kind: "coralHead", scale: 1.2, above: .88 }, version: 11 },
  amber: { ground: "amberLitter", pool: { kind: "amberPool", scale: 3.6, above: .78 }, block: { kind: "amberTree", scale: 1.15, above: .85 }, version: 11 },
  obsidian: { ground: "obsidianFloor", pool: { kind: "quicksilverPool", scale: 3.8, above: .78 }, block: { kind: "obsidianShard", scale: 1.2, above: .87 }, version: 11 },
};
export const PALETTE_BLOCKERS = Object.values(PALETTE_REGIONS).map((r) => r.block.kind);
function applyPaletteRegions(map, seed, rx, ry, mask, hamlet, version = 10) {
  let touched = 0; const grove = [];
  for (const t of map.tiles) {
    if (t.structure || t.buildingId || t.blocked || t.landscape || !BARE_GROUND.has(t.kind)) continue;
    const gx = rx * 32 + t.x, gy = ry * 32 + t.y, type = regionTile(seed, gx, gy, Math.min(version, 11)).type, P = PALETTE_REGIONS[type]; if (!P || (P.version || 10) > version) continue; // 629: version 11 adds the second batch
    const block = !mask[idx(t.x, t.y)] && valueNoise(`${seed}:${type}:block`, gx / P.block.scale, gy / P.block.scale) > P.block.above;
    const pool = valueNoise(`${seed}:${type}:pool`, gx / P.pool.scale, gy / P.pool.scale) > P.pool.above;
    Object.assign(t, block ? { kind: P.block.kind, blocked: true, landscape: type } : { kind: pool ? P.pool.kind : P.ground, landscape: type }); touched++;
    if (P.trees && !block && !pool && !mask[idx(t.x, t.y)]) grove.push(t);
  }
  if (touched) map.paletteRegion = true;
  // Release 629 (version 11): blocks never seal anything off. None stands beside a thing you can use; and while some open ground
  // the plaza cannot reach touches a block, the shortest run of blocks from reachable ground to it turns back to ground (a
  // breadth-first search over block tiles; a few rounds at most, 1024 tiles each).
  if (touched && version >= 11) {
    const near = new Set(); for (const o of map.objects || []) if (o.actions?.length) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near.add(idx(Math.round(o.x) + dx, Math.round(o.y) + dy));
    const unblock = (t) => Object.assign(t, { kind: PALETTE_REGIONS[t.landscape].ground, blocked: false }), isBlock = (t) => t?.blocked && PALETTE_BLOCKERS.includes(t.kind);
    for (const t of map.tiles) if (isBlock(t) && near.has(idx(t.x, t.y))) unblock(t);
    for (let round = 0; round < 8; round++) {
      const seen = reachableFromPlaza(map), from = new Int16Array(1024).fill(-1), q = []; let hit = -1;
      for (let i = 0; i < 1024; i++) if (seen[i]) { from[i] = i; q.push(i); }
      for (let h = 0; h < q.length && hit < 0; h++) { const i = q[h], x = i % 32, y = Math.floor(i / 32);
        for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) continue; const j = idx(nx, ny), n = map.tiles[j]; if (from[j] >= 0) continue;
          if (!seen[i] && !n.blocked && !LETHAL_KINDS.has(n.kind)) { hit = i; break; } // a block that touches sealed-off open ground
          if (isBlock(n)) { from[j] = i; q.push(j); } } }
      if (hit < 0) break;
      for (let i = hit; !seen[i]; i = from[i]) unblock(map.tiles[i]);
    }
  }
  if (!hamlet && grove.length) { const T = PALETTE_REGIONS.jungle.trees, made = [];
    for (const t of grove) { const h = hashSeed(`${seed}:jungle:v1:${rx * 32 + t.x}:${ry * 32 + t.y}`); if ((h % 1000) / 1000 < T.density) made.push([t, h]); }
    made.sort((a, b) => (a[1] >>> 7) % 9973 - (b[1] >>> 7) % 9973);
    for (const [t, h] of made.slice(0, T.max)) { const form = T.forms[(h >>> 4) % T.forms.length]; map.objects.push({ id: `jungle-${rx}-${ry}-${t.x}-${t.y}`, kind: "tree", x: t.x, y: t.y, state: "standing", actions: ["cut", "ignite"], environmental: true, forest: true, jungle: true, vegetationForm: form, scale: form === "canopy" ? 1.35 : form === "shrub" ? .8 : 1.15 }); }
  }
  return touched;
}
function applyPillarGround(map, seed, rx, ry, mask) {
  let touched = 0; const P = PILLARS;
  for (const t of map.tiles) {
    if (t.structure || t.buildingId || t.blocked || t.landscape || !BARE_GROUND.has(t.kind)) continue;
    const gx = rx * 32 + t.x, gy = ry * 32 + t.y; if (regionTile(seed, gx, gy, 8).type !== "pillars") continue;
    const spire = !mask[idx(t.x, t.y)] && valueNoise(`${seed}:pillars:hoodoo`, gx / P.hoodoo.scale, gy / P.hoodoo.scale) > P.hoodoo.above;
    Object.assign(t, spire ? { kind: "hoodoo", blocked: true, landscape: "pillars" } : { kind: "pillarGround", landscape: "pillars" }); touched++;
  }
  if (touched) map.pillarlands = true;
  return touched;
}
// Release 631 (Tim, 2026-10-31: "giant trees you can climb by jumping between platforms... to a platform or dungeon"); 633 ("1-2
// tile wide tiles that you can hop between... super tall"); release 637 (Tim, 2026-11-01: "The tree is just a little too busy...
// they just look like platforms around the tree, when they could just be branches that are poking off... extending from the tree
// that you can hop onto, and then hop up to get to higher heights... something like the divine towers in Elden Ring... mostly
// traversal... constantly being scared of dying... super tall... the real goal is to get to the top"). From version 12 a share
// (`chance`) of jungle sections grow one great tree:
// - its trunk, a `trunk`-square column of `canopyTrunk`, and its top is the crown: a platform you stand on, with the door;
// - from each side of the trunk two branches stick straight out (in the side's first and last column, a gap column between), each
//   rising one level a tile as it goes (slope tiles: walked, not hopped), `reach` tiles long as the ground allows;
// - the climb: out along one branch to its tip, a hop across the gap to the tip of its twin, back up the twin to the trunk, over a
//   knot of wood at the corner to the next side, and so round the four sides; the last branch ends one hop below the crown.
// Every branch tile is a sky platform (a hop keeps its height over the gap). The first tile is level 1 and flat, so creatures
// cannot step on; nothing spawns up there; jungle trees on its ground are cleared. A fall is a fall: the leaf glider opens only from
// the crown. Bounded: one tree, a few hundred tile checks, once per section.
export const CANOPY = { chance: .55, trunk: 3, reach: [3, 7], tries: 80, starfield: .5 };
// The jungle ground a great tree may grow on (versions 12 and 13): flat jungle floor, mire or root, clear of the plaza, the exit
// lines, structures and anything standing there but the jungle's own trees.
// Release 672 (version 14): the tree region with the most of its own ground in this section, if it has `minTiles` of it.
function treeRegion(map) {
  const n = {}; for (const t of map.tiles) { const R = TREES_V14.regions[t.landscape]; if (R && R.ground.includes(t.kind)) n[t.landscape] = (n[t.landscape] || 0) + 1; }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  return best && best[1] >= TREES_V14.minTiles ? best[0] : null;
}
function canopyGround(map, region = null) {
  const at = (x, y) => map.tiles[idx(x, y)], ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1, objAt = new Set((map.objects || []).filter((o) => !o.jungle && !(region && o.forest)).map((o) => idx(Math.round(o.x), Math.round(o.y))));
  const exitLine = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  return (x, y) => { const t = x >= 1 && y >= 1 && x <= 30 && y <= 30 && at(x, y); return !!t && (region ? t.landscape === region && TREES_V14.regions[region].ground.includes(t.kind) : t.landscape === "jungle") && !t.structure && !t.buildingId && !t.environment && !t.slope && !(t.elev > 0) && !exitLine(x, y) && !(x >= 12 && x <= 20 && y >= 12 && y <= 20) && !objAt.has(idx(x, y)) && (region ? true : t.kind === "jungleFloor" || t.kind === "jungleMire" || t.kind === "buttressRoot"); };
}
// Would the rite's tree fit here? Tried on a copy, so the section is left as it is.
export function riteTreeFits(map, seed, rx, ry) {
  if (map.canopy) return false;
  const copy = { ...map, tiles: map.tiles.map((t) => ({ ...t })), objects: (map.objects || []).map((o) => ({ ...o })), enemySpawns: (map.enemySpawns || []).map((q) => ({ ...q })), canopy: null };
  return !!growRiteTree(copy, seed, rx, ry);
}
// The Rite of Ascendancy (ascendancy.ts): its tree grows in any country, on open natural ground clear of the plaza, the exit lines
// and what stands there; the same tree each load (growTrees' hashes). Returns map.canopy or null when there is no room.
export function growRiteTree(map, seed, rx, ry, keepClear = []) {
  if (map.canopy) return map.canopy;
  const at = (x, y) => map.tiles[idx(x, y)], ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const exitLine = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  const objAt = new Set((map.objects || []).filter((o) => !o.forest && !o.jungle && !o.environmental).map((o) => idx(Math.round(o.x), Math.round(o.y))));
  const clear = new Set(keepClear.map(([x, y]) => idx(x, y)));
  const ground = (x, y) => { const t = x >= 1 && y >= 1 && x <= 30 && y <= 30 && at(x, y); return !!t && !t.blocked && !t.structure && !t.buildingId && !t.environment && !t.slope && !(t.elev > 0) && !t.canopy && !DEEP_WATER.includes(t.kind) && !exitLine(x, y) && !(x >= 12 && x <= 20 && y >= 12 && y <= 20) && !objAt.has(idx(x, y)) && !clear.has(idx(x, y)); };
  return growTrees(map, seed, rx, ry, { ground, reachable: reachableFromPlaza, trapped: (m) => trappedTiles(m, 32, 32, { x: 16, y: 16 }), version: 14, region: "rite", force: true });
}
function buildCanopyTree(map, seed, rx, ry) {
  const C = CANOPY, h = (k) => hashSeed(`${seed}:canopy:v3:${rx}:${ry}:${k}`), at = (x, y) => map.tiles[idx(x, y)];
  if ((hashSeed(`${seed}:canopy-grow:v1:${ry * 7919 + rx}`) % 1000) / 1000 >= C.chance) return null;
  const ground = canopyGround(map);
  const walked = reachableFromPlaza(map), N = C.trunk;
  // The four sides in climbing order, each as: outward direction, the side's first and last column (from the previous corner
  // round to the next), and the corner knot that follows it.
  const sides = (tx, ty) => [
    { d: [1, 0], a: [tx + N, ty], b: [tx + N, ty + N - 1], knot: [tx + N, ty + N] },
    { d: [0, 1], a: [tx + N - 1, ty + N], b: [tx, ty + N], knot: [tx - 1, ty + N] },
    { d: [-1, 0], a: [tx - 1, ty + N - 1], b: [tx - 1, ty], knot: [tx - 1, ty - 1] },
    { d: [0, -1], a: [tx, ty - 1], b: [tx + N - 1, ty - 1], knot: null }];
  for (let t = 0; t < C.tries; t++) {
    const tx = 2 + h(`x${t}`) % 26, ty = 2 + h(`y${t}`) % 26; let fine = true;
    for (let j = 0; j < N && fine; j++) for (let i = 0; i < N && fine; i++) fine = ground(tx + i, ty + j);
    if (!fine) continue;
    const S = sides(tx, ty), plan = [];
    for (const sd of S) { // the longest reach the ground allows for both branches of the side, at most the hashed reach
      const want = C.reach[0] + h(`r${t}:${plan.length}`) % (C.reach[1] - C.reach[0] + 1); let L = 0;
      for (let r = 0; r < want; r++) { if (![sd.a, sd.b].every(([x, y]) => ground(x + sd.d[0] * r, y + sd.d[1] * r))) break; L = r + 1; }
      if (L < C.reach[0] || (sd.knot && !ground(...sd.knot))) { fine = false; break; }
      plan.push({ ...sd, L });
    }
    if (!fine) continue;
    const foot = S[0].a, step = [foot[0], foot[1] - 1]; if (!walked[idx(step[0], step[1])] || !ground(step[0], step[1])) continue; // the climb starts from ground you can walk to: the tile beside the first branch, outside every bough
    // Lay the climb.
    const laid = [], saved = new Map(), keep = (x, y) => { if (!saved.has(idx(x, y))) saved.set(idx(x, y), { ...at(x, y) }); };
    const put = (x, y, elev, slope, kind = "canopyBranch") => { keep(x, y); Object.assign(at(x, y), { kind, elev, slope, blocked: false, canopy: true, skyPlatform: true }); laid.push([x, y]); };
    let lv = 0;
    for (const sd of plan) {
      for (let r = 0; r < sd.L; r++) { lv++; put(sd.a[0] + sd.d[0] * r, sd.a[1] + sd.d[1] * r, lv, !(lv === 1)); } // out, rising (the very first tile flat)
      lv++; // the hop across the gap at the tips
      for (let r = sd.L - 1; r >= 0; r--) { put(sd.b[0] + sd.d[0] * r, sd.b[1] + sd.d[1] * r, lv, true); if (r) lv++; } // back in, rising
      if (sd.knot) { lv++; put(sd.knot[0], sd.knot[1], lv, false); }
    }
    const top = lv + 1; // one hop up from the last branch onto the crown
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { keep(tx + i, ty + j); Object.assign(at(tx + i, ty + j), { kind: "canopyTrunk", elev: top, slope: false, blocked: false, canopy: true, skyPlatform: true }); laid.push([tx + i, ty + j]); }
    if (!reachableFromPlaza(map)[idx(step[0], step[1])]) { for (const [i, t0] of saved) { const t = map.tiles[i]; for (const k of Object.keys(t)) delete t[k]; Object.assign(t, t0); } continue; } // the boughs cut the foot off: try elsewhere
    const all = new Set(laid.map(([x, y]) => idx(x, y)));
    map.objects = (map.objects || []).filter((o) => !(o.jungle && all.has(idx(Math.round(o.x), Math.round(o.y)))));
    const dest = (hashSeed(`${seed}:canopy-door:v1:${ry * 7919 + rx}`) % 1000) / 1000 < C.starfield ? "starfield" : "cloud";
    map.objects.push({ id: `canopy-gate-${rx}-${ry}`, kind: "canopyGate", name: dest === "starfield" ? "A door in the great tree, full of stars" : "A door in the great tree, full of cloud", x: tx + 1, y: ty + 1, dest, actions: ["enter"], state: "open" });
    map.canopy = { x0: tx, y0: ty, size: N, height: top, top, branches: plan.length * 2, reach: plan.map((q) => q.L), dest, box: { x: tx - C.reach[1], y: ty - C.reach[1], n: N + 2 * C.reach[1] } };
    map.enemySpawns = (map.enemySpawns || []).filter((q) => !all.has(idx(Math.round(q.x), Math.round(q.y))));
    return map.canopy;
  }
  return null;
}
function buildMesas(map, seed, rx, ry) {
  const P = PILLARS, h = (k) => hashSeed(`${seed}:pillars:v1:${rx}:${ry}:${k}`), at = (x, y) => map.tiles[idx(x, y)], ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const exitLine = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  const taken = new Set(), ground = (x, y, spire = false) => { const t = x >= 1 && y >= 1 && x <= 30 && y <= 30 && at(x, y); return !!t && t.landscape === "pillars" && (t.kind === "pillarGround" ? !t.blocked : spire && t.kind === "hoodoo") && !t.structure && !t.buildingId && !t.environment && !t.slope && !(t.elev > 0) && !exitLine(x, y) && !(x >= 12 && x <= 20 && y >= 12 && y <= 20) && !taken.has(`${x},${y}`); };
  const square = (x0, y0, n) => Array.from({ length: n * n }, (_, i) => [x0 + i % n, y0 + Math.floor(i / n)]);
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]], out = [], count = P.mesas[0] + h("n") % (P.mesas[1] - P.mesas[0] + 1);
  const holds = (map.objects || []).filter((o) => P.prefer.includes(o.kind)).sort((a, b) => P.prefer.indexOf(a.kind) - P.prefer.indexOf(b.kind));
  const tryHold = Math.min(holds.length, 2) * P.holdTries; // a held thing is tried at several sizes and places on the top
  for (let t = 0; t < tryHold + P.tries && out.length < count; t++) {
    const o = t < tryHold ? holds[Math.floor(t / P.holdTries)] : null; if (o && out.some((q) => q.holds === o)) continue;
    const n = P.size[0] + h(`s${t}`) % (P.size[1] - P.size[0] + 1), cx = o ? Math.round(o.x) : 3 + h(`x${t}`) % 26, cy = o ? Math.round(o.y) : 3 + h(`y${t}`) % 26;
    const x0 = o ? cx - h(`ox${t}`) % n : cx - Math.floor(n / 2), y0 = o ? cy - h(`oy${t}`) % n : cy - Math.floor(n / 2), top = square(x0, y0, n);
    if (!top.every(([x, y]) => ground(x, y, true))) continue;
    let stair = null;
    for (let k = 0; k < 4 && !stair; k++) {
      const [dx, dy] = DIRS[(h(`d${t}`) + k) % 4], steps = [], gaps = []; let edge = dx > 0 ? x0 + n - 1 : dx < 0 ? x0 : dy > 0 ? y0 + n - 1 : y0;
      const along = dx ? Math.max(y0, Math.min(y0 + n - P.step, cy - Math.floor(P.step / 2))) : Math.max(x0, Math.min(x0 + n - P.step, cx - Math.floor(P.step / 2)));
      for (let lv = P.height - 1; lv >= 1; lv--) {
        const g0 = edge + (dx || dy) * 1, s0 = g0 + (dx || dy) * P.gap; // the gap's first line, then the pillar's first line
        for (let g = 0; g < P.gap; g++) for (let i = 0; i < P.step; i++) gaps.push(dx ? [g0 + (dx || dy) * g, along + i] : [along + i, g0 + (dx || dy) * g]);
        const near0 = s0, far0 = s0 + (dx || dy) * (P.step - 1), lo = Math.min(near0, far0);
        for (let a = 0; a < P.step; a++) for (let i = 0; i < P.step; i++) steps.push(dx ? [lo + a, along + i, lv] : [along + i, lo + a, lv]);
        edge = far0;
      }
      if (gaps.every(([x, y]) => ground(x, y)) && steps.every(([x, y]) => ground(x, y, true))) stair = { steps, gaps };
    }
    if (!stair) continue;
    const raise = (x, y, elev) => { const t = at(x, y); Object.assign(t, { kind: "skyPlatform", elev, slope: false, blocked: false, skyPlatform: true, mesa: true }); }; // a hoodoo in the way is part of it
    for (const [x, y] of top) raise(x, y, P.height); for (const [x, y, lv] of stair.steps) raise(x, y, lv);
    for (const [x, y] of [...top, ...stair.steps, ...stair.gaps]) taken.add(`${x},${y}`);
    for (let y = y0 - P.gapBetween; y < y0 + n + P.gapBetween; y++) for (let x = x0 - P.gapBetween; x < x0 + n + P.gapBetween; x++) taken.add(`${x},${y}`);
    out.push({ x0, y0, size: n, height: P.height, holds: o || null, steps: stair.steps.length / (P.step * P.step) });
  }
  if (!out.length) return null;
  map.mesas = out.map((q) => ({ ...q, holds: q.holds ? q.holds.kind : null })); const raised = (q) => at(Math.round(q.x), Math.round(q.y))?.mesa;
  map.enemySpawns = (map.enemySpawns || []).filter((q) => !raised(q));
  return out;
}
// Moonlands (release 579, version 6): bare ground in a lunar region turns to grey dust, pocked with craters (`MOON.craters`
// per section, radius `radius`): a darker bowl inside a pale rim. Both are walkable, so nothing is ever cut off; read per tile,
// so the region's edge wanders. Bounded per section: no per-frame cost beyond the ground texture.
export const MOON = { craters: [2, 4], radius: [1.8, 4.6], rim: .9 };
function applyMoonlands(map, seed, rx, ry) {
  let touched = 0;
  for (const t of map.tiles) {
    if (t.structure || t.buildingId || t.blocked || t.landscape || !BARE_GROUND.has(t.kind)) continue;
    if (regionTile(seed, rx * 32 + t.x, ry * 32 + t.y, 6).type !== "lunar") continue;
    t.kind = "moonDust"; t.landscape = "lunar"; touched++;
  }
  if (!touched) return 0;
  const M = MOON, h = (k) => hashSeed(`${seed}:moon:v1:${rx}:${ry}:${k}`), n = M.craters[0] + h("n") % (M.craters[1] - M.craters[0] + 1);
  for (let k = 0; k < n; k++) {
    const r = M.radius[0] + (h(`r${k}`) % 1000) / 1000 * (M.radius[1] - M.radius[0]), cx = 4 + h(`x${k}`) % 24, cy = 4 + h(`y${k}`) % 24;
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      if (x < 0 || y < 0 || x > 31 || y > 31) continue; const t = map.tiles[idx(x, y)];
      if (t.kind !== "moonDust" && t.kind !== "craterFloor" && t.kind !== "craterRim") continue;
      const d = Math.hypot(x - cx, y - cy); if (d < r - M.rim) t.kind = "craterFloor"; else if (d <= r && t.kind === "moonDust") t.kind = "craterRim";
    }
  }
  return touched;
}
function applyWoodsAndFrost(map, seed, rx, ry, mask, hamlet) {
  let touched = 0; const grove = [];
  for (const t of map.tiles) {
    if (t.structure || t.buildingId || t.blocked && !t.landscape) continue;
    const gx = rx * 32 + t.x, gy = ry * 32 + t.y, type = regionTile(seed, gx, gy, 5).type;
    if (type === "forest" && !t.landscape && BARE_GROUND.has(t.kind)) { t.kind = "forestFloor"; t.landscape = "forest"; touched++; if (!mask[idx(t.x, t.y)]) grove.push(t); }
    else if (type === "forest" && t.kind === "bogGround" && !mask[idx(t.x, t.y)]) grove.push(t); // swamp woods
    else if (type === "frost") {
      if (!t.landscape && BARE_GROUND.has(t.kind)) {
        const spire = !mask[idx(t.x, t.y)] && valueNoise(`${seed}:frost:spire`, gx / FROST.spire.scale, gy / FROST.spire.scale) > FROST.spire.above;
        Object.assign(t, spire ? { kind: "iceSpire", blocked: true, landscape: "frost" } : { kind: "snowField", landscape: "frost" }); touched++;
      } else if (t.landscape === "lake" && (t.kind === "lakeWater" || t.kind === "shallows")) { Object.assign(t, { kind: "lakeIce", blocked: false, landscape: "frost" }); touched++; }
    }
  }
  if (hamlet || !grove.length) return touched;
  const W = WOODS, giants = [], made = [];
  for (const t of grove) {
    const gx = rx * 32 + t.x, gy = ry * 32 + t.y, h = hashSeed(`${seed}:woods:v1:${gx}:${gy}`);
    if (valueNoise(`${seed}:woods:clearing`, gx / W.clearing.scale, gy / W.clearing.scale) < W.clearing.below || (h % 1000) / 1000 >= W.density) continue;
    made.push([t, h]);
  }
  made.sort((a, b) => (a[1] >>> 7) % 9973 - (b[1] >>> 7) % 9973);
  for (const [t, h] of made.slice(0, W.max)) {
    const giant = (h >>> 11) % W.giantEvery === 0 && !giants.some((q) => Math.hypot(q.x - t.x, q.y - t.y) < W.giantGap), form = giant ? "giant" : W.forms[(h >>> 4) % W.forms.length];
    if (giant) giants.push(t);
    map.objects.push({ id: `wood-${rx}-${ry}-${t.x}-${t.y}`, kind: "tree", x: t.x, y: t.y, state: "standing", actions: ["cut", "ignite"], environmental: true, forest: true, vegetationForm: form, ...(giant ? { wood: W.giantWood } : {}), scale: giant ? 1 : form === "canopy" ? 1.25 : form === "shrub" ? .72 : 1.05 });
  }
  return touched;
}
function dominantLandscape(map) {
  const count = {};
  for (const t of map.tiles) if (t.landscape) count[t.landscape] = (count[t.landscape] || 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function mountainKind(elev) { return elev >= 4 ? "snowPeak" : elev === 3 ? "snowRock" : elev >= 1 ? "mountainRock" : "alpineGrass"; }
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// What the player can reach from the plaza: climb at most one level (or along a slope), drop any height.
// `walls` (world coherence, COHERENCE version 1 and on): a shack's or a district's thin wall between two tiles stops the step,
// as it does in play (game.ts footprintOpen). Without it (sections pinned before) the helpers read as they always did.
export function reachableFromPlaza(map, start = { x: 16, y: 16 }, walls = false) {
  const seen = new Uint8Array(1024), q = [idx(start.x, start.y)];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], a = map.tiles[i], x = i % 32, y = Math.floor(i / 32);
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy, j = idx(nx, ny), b = map.tiles[j];
      if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j] || !b || b.blocked || (walls && sideWalled(a, b, dx, dy))) continue;
      const up = (b.elev || 0) - (a.elev || 0);
      if (up > 1 && !safeVoidScarTransition(a, b)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}

// ---------------------------------------------------------------- two-way reachability (no trap pockets)
// Movement rule: climb at most one level (jump), drop any height. A tile the player can reach but never leave
// (a pit ringed by walls two or more levels high) is a trap. Operator report 2026-10-14: stuck in a hole, had to
// burn a Crossing Sigil. These helpers work on any map (overworld 32x32 or dungeon of any size).
export const LETHAL_KINDS = new Set(["abyss", "lava", "canyon", "river", "dungeonWater", ...DEEP_WATER]);
const walkable = (t) => t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// A consumed wall can join floors of different heights. The inert scar is a safe
// transition, not a newly lethal cliff; ordinary terrain keeps its original fall rules.
export const safeVoidScarTransition = (a, b) => !!(a?.voidScar || b?.voidScar) &&
  walkable(a) && walkable(b) && !a.pit && !b.pit &&
  ![a.kind, b.kind].some(kind => kind === "void" || kind === "sealedGate");
const step = (a, b) => safeVoidScarTransition(a, b) || (b.elev || 0) - (a.elev || 0) <= 1;
// The thin walls on a tile's sides (a shack's or a district building's, or an enclosure's), and whether one stands between a
// tile and its neighbour at (dx, dy). The same boxes as game.ts tileOpen/footprintOpen, read per tile side.
const SIDE_OF = { "1,0": ["east", "west"], "-1,0": ["west", "east"], "0,1": ["south", "north"], "0,-1": ["north", "south"] };
export const wallSidesOf = (t) => t?.encSides?.length ? t.encSides : (t?.structure === "shackWall" || t?.structure === "districtWall") ? t.wallSides || [] : [];
// A south wall also stands in the way of a step east or west along its row: the Wayfarer's footprint (game.ts footprintOpen,
// y+.5 to y+.88 of the tile it stands on) reaches into the wall's strip along the tile's south side.
export function sideWalled(a, b, dx, dy) { const s = SIDE_OF[`${dx},${dy}`]; return !!s && (wallSidesOf(a).includes(s[0]) || wallSidesOf(b).includes(s[1]) || (!!dx && (wallSidesOf(a).includes("south") || wallSidesOf(b).includes("south")))); }
function sweep(map, width, height, start, reverse, walls = false) {
  const T = map.tiles, seen = new Uint8Array(width * height), s0 = start.y * width + start.x;
  if (!walkable(T[s0])) return seen;
  const q = [s0]; seen[s0] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % width, y = (i - x) / width;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy, j = ny * width + nx;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[j] || !walkable(T[j])) continue;
      if (reverse ? !step(T[j], T[i]) : !step(T[i], T[j])) continue;
      if (walls && sideWalled(T[i], T[j], dx, dy)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}
export const reachableFrom = (map, width, height, start, walls = false) => sweep(map, width, height, start, false, walls);
export const canReturnTo = (map, width, height, start, walls = false) => sweep(map, width, height, start, true, walls);
export function trappedTiles(map, width, height, start, walls = false) {
  const go = reachableFrom(map, width, height, start, walls), back = canReturnTo(map, width, height, start, walls), out = [];
  for (let i = 0; i < go.length; i++) if (go[i] && !back[i]) out.push(map.tiles[i]);
  return out;
}
// Raise each trap floor to one level below the lowest way out, until every reachable tile leads back to start.
export function ensureReturnable(map, width, height, start, walls = false) {
  const raised = [];
  for (let pass = 0; pass < 80; pass++) {
    const go = reachableFrom(map, width, height, start, walls), back = canReturnTo(map, width, height, start, walls);
    let changed = false;
    for (let i = 0; i < go.length; i++) {
      if (!go[i] || back[i]) continue;
      const t = map.tiles[i], x = i % width, y = (i - x) / width;
      let target = Infinity;
      for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = ny * width + nx; if (nx >= 0 && ny >= 0 && nx < width && ny < height && back[j] && walkable(map.tiles[j]) && !(walls && sideWalled(t, map.tiles[j], dx, dy))) target = Math.min(target, (map.tiles[j].elev || 0) - 1); }
      if (target !== Infinity && target > (t.elev || 0)) { t.elev = target; raised.push(t); changed = true; }
    }
    if (!changed) break;
  }
  return raised;
}
// Ramps (release 101): walkable stairs on one-level steps, so every level change has nearby routes that need no jump.
// A ramp is the lower tile beside a +1 neighbour, marked `slope` (canStep lets anyone cross it); one per short run.
export function addRamps(map, width, height, key, spacing = 3) {
  const T = map.tiles, made = [], candidates = [];
  const blockedNear = (x, y, r) => { for (let yy = Math.max(0, y - r); yy <= Math.min(height - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(width - 1, x + r); xx++) if ((xx !== x || yy !== y) && T[yy * width + xx]?.slope) return true; return false; };
  const make = (t) => { t.slope = true; if (t.landscape === "mountains" && !t.volcanic) t.kind = "mountainTrail"; else if (t.kind === "chasmLedge") t.kind = "chasmStair"; made.push(t); };
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const t = T[y * width + x];
    if (!walkable(t) || t.slope || ["skyBridge", "bridge"].includes(t.kind)) continue;
    const up = N4.some(([dx, dy]) => { const n = T[(y + dy) * width + x + dx]; return walkable(n) && !n.slope && (n.elev || 0) === (t.elev || 0) + 1; });
    if (!up) continue;
    candidates.push(t);
    if (hashSeed(`${key}:ramp:${x}:${y}`) % 3 === 0 && !blockedNear(x, y, spacing)) make(t);
  }
  // A section or dungeon with any one-level step always gets at least one ramp.
  if (!made.length && candidates.length) make(candidates[hashSeed(`${key}:ramp-fallback`) % candidates.length]);
  return made;
}
// Nearest tile (to `from`) that can still walk back to `start`; used by the Stuck? recovery.
export function nearestReturnable(map, width, height, start, from) {
  const back = canReturnTo(map, width, height, start);
  let best = null;
  for (let i = 0; i < back.length; i++) if (back[i]) { const x = i % width, y = (i - x) / width, d = Math.hypot(x - from.x, y - from.y); if (!best || d < best.d) best = { x, y, d }; }
  return best;
}

// ---------------------------------------------------------------- world coherence (version 1)
// Ground first seen from this version on (`atlas.coherenceVersion`) keeps its ways through: a river or canyon band never
// cuts an exit lane (the lane is bridged, the same on both sides of every edge, since where a lane runs is the edge's own
// hash, sectionExits), every land exit, the plaza and the doors of the great buildings join as one walkable ground (where
// nothing joins them a short path is carved, a step of at most one level at a time, so it walks both ways), no pit holds the
// Wayfarer, and no creature stands on a pad it cannot leave. Sections pinned before keep their exact ground: none of this
// runs for them (Game.loadArea reads the version from the atlas).
export const COHERENCE = {
  version: 1,
  lane: { half: 1, depth: 16 }, // an exit lane: the exit tile and `half` either side, from the edge in to the plaza
  crossing: { river: "bridge", canyon: "bridge" }, // what a band becomes where a lane (or a carved path) crosses it
  lethalDrop: 4, // a drop of this many levels or more kills (fallDamage), so no way through may need one
  cost: { step: 1, level: 3, band: 4, ruin: 5, rock: 6, wall: 6, water: 12 }, // the price of each repair, for the cheapest path
  carves: 24, // repaired paths per section at most
  creatureRegion: 12, nudge: 8, // a creature's own ground holds at least this many tiles, or it moves (up to `nudge` tiles)
  memo: 256, // Game's settled-section memo is cleared past this many keys
  doorTries: 12, // spots a great building may pass over because its door would not join the land
  altCores: 6, // grounds tried for an exit cut off from the plaza (by open sea): it joins the largest of them
  fixedKinds: ["ocean", "deepOcean", "lava", "abyss", "void", "sealedGate", "dungeonWater"], // never repaired
  rockGround: { alien: "alienMoss", desert: "sand", coast: "beach", lake: "shallows" }, // what a cleared rock becomes (mountains: by height)
  messages: { noCrossing: "No crossing here: the river or the canyon runs on over the edge, and this lane was never bridged." },
};
const designTile = (t) => !!t && !!(t.greatBuilding || t.courtyard || t.keep || t.keepPart || t.canopy || t.mushroom || t.causeway || t.structure === "buildingRoof" || t.landscape === "castle" || t.skyPlatform || t.kind === "skyBridge" || t.kind === "bridge" || t.kind === "logBridge" || t.volcanic);
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const edgeTile = (i) => { const x = i % 32, y = (i - x) / 32; return x === 0 || y === 0 || x === 31 || y === 31; };
// The Wayfarer's step from a to b (dx, dy): climb one level (a jump), walk a slope, drop less than a lethal fall; thin walls stop it.
export function playerStepOk(a, b, dx, dy) {
  if (!footing(a) || !footing(b) || sideWalled(a, b, dx, dy)) return false;
  if (safeVoidScarTransition(a, b)) return true;
  const d = (b.elev || 0) - (a.elev || 0);
  return d <= 1 && (d > -COHERENCE.lethalDrop || !!(a.slope || b.slope));
}
// A ground creature's step: the same level, or along a slope; never onto a perch.
export function creatureStepOk(a, b, dx, dy) {
  if (!footing(a) || !footing(b) || b.perch || sideWalled(a, b, dx, dy)) return false;
  const d = (b.elev || 0) - (a.elev || 0);
  return d === 0 || safeVoidScarTransition(a, b) || (!!(a.slope || b.slope) && Math.abs(d) <= 1);
}
function flood(map, starts, ok, reverse = false) {
  const seen = new Uint8Array(1024), q = [];
  for (const s of starts) if (s >= 0 && s < 1024 && !seen[s] && footing(map.tiles[s])) { seen[s] = 1; q.push(s); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % 32, y = (i - x) / 32;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j]) continue;
      if (reverse ? !ok(map.tiles[j], map.tiles[i], -dx, -dy) : !ok(map.tiles[i], map.tiles[j], dx, dy)) continue; seen[j] = 1; q.push(j); } }
  return seen;
}
// The plaza's tile (or the open tile nearest it), and the section's core: every tile walked to from there and back.
export function coherenceHub(map) { let best = -1, bd = Infinity; for (let y = 12; y <= 20; y++) for (let x = 12; x <= 20; x++) { const d = Math.abs(x - 16) + Math.abs(y - 16) + (x + y * 32) / 1e5; if (footing(map.tiles[idx(x, y)]) && d < bd) { bd = d; best = idx(x, y); } } return best; }
export function coherenceCore(map, hub = coherenceHub(map)) {
  const core = new Uint8Array(1024); if (hub < 0) return core;
  const go = flood(map, [hub], playerStepOk), back = flood(map, [hub], playerStepOk, true);
  for (let i = 0; i < 1024; i++) core[i] = go[i] & back[i];
  return core;
}
// A door (or any spot) joins the core: the tile itself, or one beside it, is walked to from the plaza and back.
export function joinsCore(map, p, core = coherenceCore(map)) { const x = Math.round(p.x), y = Math.round(p.y); return [[0, 0], ...N4].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < 32 && y + dy < 32 && !!core[idx(x + dx, y + dy)]); }
// WG-07: the tops a summit cairn may stand on (from the plaza and back; for mountains, the trail of single steps it lays).
function summitReach(map, biome) {
  const hub = coherenceHub(map); if (hub < 0) return new Uint8Array(1024);
  if (biome !== "mountains") return coherenceCore(map, hub);
  const trail = flood(map, [hub], (a, b, dx, dy) => !!b && !b.blocked && b.x >= 1 && b.y >= 1 && b.x <= 30 && b.y <= 30 && Math.abs((b.elev || 0) - (a.elev || 0)) <= 1 && !sideWalled(a, b, dx, dy));
  return trail;
}
// The section's exit lanes, as tile indices from each edge in to the plaza.
function laneTiles(map) {
  const ex = map.exits || {}, H = COHERENCE.lane.half, D = COHERENCE.lane.depth, out = [];
  for (const [d, c] of Object.entries(ex)) { if (!Number.isFinite(c) || !["north", "south", "west", "east"].includes(d)) continue;
    for (let k = 0; k <= D; k++) for (let o = -H; o <= H; o++) { const v = c + o; if (v < 0 || v > 31) continue;
      const [x, y] = d === "north" ? [v, k] : d === "south" ? [v, 31 - k] : d === "west" ? [k, v] : [31 - k, v]; out.push(idx(x, y)); } }
  return out;
}
// WG-01: a river or canyon band never cuts a lane. Where a band's tile lies on a lane (walled or deadly), the lane bridges it.
// Where a lane runs is the edge's own (sectionExits hashes the edge), so the two sections of an edge bridge the same tiles.
export function bridgeLanes(map) {
  let made = 0;
  if (!map?.tiles || map.tiles.length !== 1024) return made;
  for (const i of laneTiles(map)) { const t = map.tiles[i], band = t?.environment;
    if (!band || !COHERENCE.crossing[band] || designTile(t) || (!t.blocked && !LETHAL_KINDS.has(t.kind))) continue;
    map.tiles[i] = { ...t, kind: COHERENCE.crossing[band], blocked: false, slope: false, bridgeOver: band, laneBridge: true }; made++; }
  return made;
}
// What it costs to make tile t walkable (Infinity: never touched). Design tiles (buildings, castles, trees, caps, bridges) are
// walked where they are open, at their own height, and never changed; the open sea and lava are never changed.
function repairCost(t, i) {
  const C = COHERENCE.cost;
  if (!t) return Infinity;
  if (footing(t)) return C.step;
  if (designTile(t) || edgeTile(i)) return Infinity; // the section's border stays (only lanes cross it)
  if (t.environment && COHERENCE.crossing[t.environment]) return C.band;
  if (COHERENCE.fixedKinds.includes(t.kind) || t.pit || t.voidScar) return Infinity;
  if (DEEP_WATER.includes(t.kind)) return C.water;
  if (t.blocked && (t.ruin !== undefined || t.kind === "blocked") && !t.structure && !t.buildingId) return C.ruin;
  if (t.blocked && t.landscape && !t.structure && !t.buildingId) return C.rock;
  return Infinity;
}
// Which heights a repaired path may give a tile: natural landscape ground may be cut or built up; anything else keeps its own.
const reshapes = (t, i) => !designTile(t) && !edgeTile(i) && !t.environment && !t.structure && !t.buildingId && !!t.landscape && !t.slope && !DEEP_WATER.includes(t.kind);
// Make tile i walkable at height e (the path's own height there), keeping what it was where it can.
function repairTile(map, i, e, from) {
  const t = map.tiles[i], prev = from >= 0 ? map.tiles[from] : null;
  if (footing(t) && (t.elev || 0) === e) return;
  let next = { ...t, carved: true };
  if (!footing(t)) {
    if (t.environment && COHERENCE.crossing[t.environment]) next = { ...next, kind: COHERENCE.crossing[t.environment], blocked: false, bridgeOver: t.environment, laneBridge: true };
    else if (DEEP_WATER.includes(t.kind)) next = { ...next, kind: t.kind === "swampWater" ? "mireWater" : t.kind === "toxicWater" ? "toxicMire" : "shallows", blocked: false };
    else { const near = prev && footing(prev) && !designTile(prev) && !prev.structure && !prev.buildingId && prev.landscape === t.landscape ? prev.kind : null;
      next = { ...next, kind: COHERENCE.rockGround[t.landscape] || near || (t.landscape ? null : map.dominant) || map.dominant || "ash", blocked: false, ruin: undefined }; }
  }
  next.elev = e;
  if (next.landscape === "mountains" && !next.volcanic && !next.slope && next.kind !== "bridge") next.kind = mountainKind(e);
  map.tiles[i] = next;
}
// The cheapest repaired path from tile s to the core (Dijkstra over tile and height): every step joins two tiles at most one
// level apart with no wall between, so it walks both ways; a height changes at `level` a level. Applied in place.
function carveToCore(map, s, core) {
  const C = COHERENCE.cost, M = MAX_LEVEL + 1, dist = new Float64Array(1024 * M).fill(Infinity), prev = new Int32Array(1024 * M).fill(-1), heap = [];
  const push = (k, d) => { heap.push([d, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] < heap[c][0] || (heap[p][0] === heap[c][0] && heap[p][1] <= heap[c][1])) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  const heights = (t, i) => reshapes(t, i) ? Array.from({ length: M }, (_, e) => e) : [t.elev || 0];
  const st = map.tiles[s], c0 = repairCost(st, s); if (c0 === Infinity) return false;
  for (const e of footing(st) ? [st.elev || 0] : heights(st, s)) { const k = s * M + e, d = c0 + C.level * Math.abs(e - (st.elev || 0)); if (d < dist[k]) { dist[k] = d; push(k, d); } }
  let goal = -1;
  while (heap.length) { const [d, k] = pop(); if (d > dist[k]) continue; const i = (k / M) | 0, e = k % M, a = map.tiles[i];
    if (core[i] && e === (a.elev || 0) && footing(a)) { goal = k; break; }
    const x = i % 32, y = (i - x) / 32;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) continue; const j = idx(nx, ny), b = map.tiles[j], cb = repairCost(b, j); if (cb === Infinity) continue;
      const wall = sideWalled(a, b, dx, dy); if (wall && (designTile(a) || designTile(b))) continue;
      for (const f of heights(b, j)) { if (Math.abs(f - e) > 1) continue;
        const nd = d + cb + C.level * Math.abs(f - (b.elev || 0)) + (wall ? C.wall : 0), nk = j * M + f; if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push(nk, nd); } } } }
  if (goal < 0) return false;
  const path = []; for (let k = goal; k !== -1; k = prev[k]) path.push(k); path.reverse();
  for (let n = 0; n < path.length; n++) { const i = (path[n] / M) | 0, e = path[n] % M, from = n ? (path[n - 1] / M) | 0 : -1; repairTile(map, i, e, from);
    if (from < 0) continue;
    const a = map.tiles[from], b = map.tiles[i], dx = (i % 32) - (from % 32), dy = Math.floor(i / 32) - Math.floor(from / 32), side = SIDE_OF[`${dx},${dy}`];
    if (!sideWalled(a, b, dx, dy)) continue;
    for (const [t, k, s0] of [[a, from, side[0]], [b, i, side[1]]]) { if (!wallSidesOf(t).length) continue; const gone = (w) => w === s0 || (!!dx && w === "south"), q = { ...t, wallGap: true };
      if (q.encSides?.length) q.encSides = q.encSides.filter((w) => !gone(w)); if (q.wallSides?.length) q.wallSides = q.wallSides.filter((w) => !gone(w)); map.tiles[k] = q; } }
  return true;
}
// The section's land exits (open water is a boat's crossing) as tile indices.
function landExits(map) {
  const ex = map.exits || {}, out = [];
  for (const [x, y] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { if (!Number.isFinite(x) || !Number.isFinite(y)) continue; const t = map.tiles[idx(x, y)]; if (t && !DEEP_WATER.includes(t.kind)) out.push(idx(x, y)); }
  return out;
}
// WG-02, WG-05, WG-06, WG-07: every land exit, each given door or spot, and every pit (ground walked into but never out of)
// joins the core; as little ground changes as will do it. Returns how many paths were carved.
export function cohereSection(map, { spots = [] } = {}) {
  if (!map?.tiles || map.tiles.length !== 1024) return 0;
  const hub = coherenceHub(map); if (hub < 0) return 0;
  let carved = 0, core = coherenceCore(map, hub);
  const inner = (i) => { const x = i % 32, y = (i - x) / 32; return idx(x === 0 ? 1 : x === 31 ? 30 : x, y === 0 ? 1 : y === 31 ? 30 : y); }; // the tile an arrival also stands on
  const targets = [...landExits(map).flatMap((i) => [i, inner(i)]), ...spots.filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)).map((p) => idx(Math.round(p.x), Math.round(p.y))).filter((i) => i >= 0 && i < 1024)];
  const lost = [];
  for (const i of targets) { if (carved >= COHERENCE.carves) break; if (core[i]) continue; if (carveToCore(map, i, core)) { carved++; core = coherenceCore(map, hub); } else lost.push(i); }
  // Exits that cannot reach the plaza at all (it stands on an island, past open sea) join the largest ground near them, and
  // each other.
  const cut = lost.filter((i) => edgeTile(i) && footing(map.tiles[i]));
  for (const i of cut) { if (carved >= COHERENCE.carves) break; const own = coherenceCore(map, i), seen = new Uint8Array(1024), x0 = i % 32, y0 = (i - x0) / 32; let best = null, tried = 0;
    const near = []; for (let j = 0; j < 1024; j++) if (!own[j] && footing(map.tiles[j])) near.push([Math.abs(j % 32 - x0) + Math.abs(((j - (j % 32)) / 32) - y0), j]);
    near.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [d, j] of near) { if (d > COHERENCE.lane.depth || tried >= COHERENCE.altCores) break; if (seen[j]) continue; const c = coherenceCore(map, j); let n = 0; for (let k = 0; k < 1024; k++) if (c[k]) { seen[k] = 1; n++; } tried++; if (!best || n > best.n) best = { c, n }; }
    if (best && best.n > COHERENCE.creatureRegion && carveToCore(map, i, best.c)) carved++; }
  if (cut.length > 1) { let alt = coherenceCore(map, cut[0]); for (const i of cut.slice(1)) { if (carved >= COHERENCE.carves) break; if (alt[i]) continue; if (carveToCore(map, i, alt)) { carved++; alt = coherenceCore(map, cut[0]); } } core = coherenceCore(map, hub); }
  for (let pass = 0; carved < COHERENCE.carves && pass < COHERENCE.carves; pass++) {
    const go = flood(map, [hub, ...landExits(map)], playerStepOk); let pit = -1;
    for (let i = 0; i < 1024 && pit < 0; i++) if (go[i] && !core[i]) pit = i;
    if (pit < 0 || !carveToCore(map, pit, core)) break;
    carved++; core = coherenceCore(map, hub);
  }
  return carved;
}
// WG-08: each tile's creature ground (where a ground creature can walk from it) and its size.
export function creatureRegions(map) {
  const label = new Int32Array(1024).fill(-1), size = [];
  for (let s = 0; s < 1024; s++) { if (label[s] >= 0 || !footing(map.tiles[s]) || map.tiles[s].perch) continue; const id = size.length, q = [s]; label[s] = id;
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % 32, y = (i - x) / 32; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || label[j] >= 0 || !creatureStepOk(map.tiles[i], map.tiles[j], dx, dy)) continue; label[j] = id; q.push(j); } }
    size.push(q.length); }
  return { label, size, at: (x, y) => { const tx = Math.round(x), ty = Math.round(y); if (tx < 0 || ty < 0 || tx > 31 || ty > 31) return 0; const i = idx(tx, ty); return label[i] >= 0 ? size[label[i]] : 0; } };
}
// Ground a creature may be put on: open, outside every building, castle court, cap and tree, and big enough to move about in.
export function creatureSpot(map, regions = creatureRegions(map)) { return (t) => !!t && footing(t) && !t.perch && !designTile(t) && !t.structure && !t.buildingId && regions.at(t.x, t.y) >= COHERENCE.creatureRegion; }
// Creatures standing where they cannot move (a raised pad, a pocket) go to the nearest good ground within `nudge` tiles that
// the Wayfarer can also reach. `skip(spawn)` leaves one where it is (sea creatures, guards, bosses, anything flagged).
export function settleSpawns(map, skip = () => false) {
  const R = creatureRegions(map), ok = creatureSpot(map, R), core = coherenceCore(map), N = COHERENCE.nudge;
  const taken = new Set((map.enemySpawns || []).map((q) => idx(Math.round(q.x), Math.round(q.y)))), held = new Set((map.objects || []).map((o) => idx(Math.round(o.x), Math.round(o.y))));
  let moved = 0;
  for (const e of map.enemySpawns || []) {
    if (!Number.isFinite(e?.x) || !Number.isFinite(e?.y) || skip(e)) continue;
    const ex = Math.round(e.x), ey = Math.round(e.y), t = map.tiles[idx(ex, ey)];
    if (!t || designTile(t) || R.at(ex, ey) >= COHERENCE.creatureRegion) continue;
    let best = null;
    for (let dy = -N; dy <= N; dy++) for (let dx = -N; dx <= N; dx++) { const x = ex + dx, y = ey + dy, d = Math.hypot(dx, dy); if (x < 2 || y < 2 || x > 29 || y > 29 || d > N) continue; const i = idx(x, y);
      if (taken.has(i) || held.has(i) || !core[i] || !ok(map.tiles[i])) continue; if (!best || d < best.d || (d === best.d && i < best.i)) best = { i, d, x, y }; }
    if (!best) continue;
    taken.delete(idx(ex, ey)); taken.add(best.i); e.x = best.x; e.y = best.y; e.settled = true; moved++;
  }
  return moved;
}

// Protected tiles sit at ground level; any walkable tile that cannot be climbed to is lowered until it can.
// Cliffs (drops of two or more levels) survive wherever another way up exists.
function ensureClimbable(map, mask) {
  for (let i = 0; i < 1024; i++) if (mask[i] && map.tiles[i].elev && map.tiles[i].landscape !== "castle") map.tiles[i].elev = 0;
  for (let pass = 0; pass < 40; pass++) {
    const seen = reachableFromPlaza(map);
    let changed = false;
    for (let i = 0; i < 1024; i++) {
      const t = map.tiles[i];
      if (seen[i] || t.blocked || !(t.elev > 0) || t.landscape === "castle") continue;
      let best = -1;
      for (const [dx, dy] of N4) { const j = idx(t.x + dx, t.y + dy), n = map.tiles[j]; if (n && seen[j] && !n.blocked) best = Math.max(best, (n.elev || 0) + 1); }
      if (best >= 0 && best < t.elev) { t.elev = best; changed = true; }
    }
    if (!changed) break;
  }
  for (const t of map.tiles) if (t.landscape === "mountains" && !t.blocked && !t.volcanic) t.kind = mountainKind(t.elev || 0);
}

// Volcano: a cone rising to the top level with a lava crater (fatal) and lava bombs while it erupts (Game).
function buildVolcano(map, seed, rx, ry, mask) {
  const spots = [];
  for (let y = 6; y < 26; y++) for (let x = 6; x < 26; x++) {
    let clear = true;
    for (let dy = -3; dy <= 3 && clear; dy++) for (let dx = -3; dx <= 3; dx++) { if (Math.hypot(dx, dy) > 3.4) continue; const tt = map.tiles[idx(x + dx, y + dy)]; if (mask[idx(x + dx, y + dy)] || (tt.blocked && !tt.landscape)) { clear = false; break; } }
    if (clear) spots.push([x, y]);
  }
  if (!spots.length) return;
  const [cx, cy] = spots[hashSeed(`${seed}:land:volcano-spot:${rx}:${ry}`) % spots.length];
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const d = Math.hypot(dx, dy), x = cx + dx, y = cy + dy, i = idx(x, y);
    if (d > 4.4 || x < 1 || y < 1 || x > 30 || y > 30 || mask[i] || (map.tiles[i].blocked && !map.tiles[i].landscape)) continue;
    if (d < 1.2) setTile(map, x, y, { kind: "lava", blocked: false, elev: 4, landscape: "mountains", volcanic: true, environment: "lava" });
    else setTile(map, x, y, { kind: d < 2.3 ? "volcanicRim" : "ashSlope", blocked: false, elev: Math.max(map.tiles[i].elev || 0, Math.max(0, 5 - Math.floor(d))), landscape: "mountains", volcanic: true });
  }
  map.volcano = { x: cx, y: cy, radius: 4.4, period: 5 + (hashSeed(`${seed}:land:volcano-period:${rx}:${ry}`) % 4) };
  map.objects.push({ id: `landscape-volcano-${rx}-${ry}`, kind: "ruinMarker", name: "Smouldering Caldera", lore: "The ground hums. Lava bombs fall wherever the shadow circles burn.", x: cx + 2, y: cy + 2, state: "quiet", actions: ["inspect"], landmark: true, landscapeSummit: true });
}

// Sky bridges: rope-and-plank spans between two high plateaus across lower ground (2-7 tiles, straight).
function buildSkyBridges(map, seed, rx, ry, mask) {
  const made = [], tile = (x, y) => map.tiles[idx(x, y)];
  for (let y = 2; y < 30 && made.length < 3; y++) for (let x = 2; x < 30 && made.length < 3; x++) {
    const a = tile(x, y);
    if (a.blocked || (a.elev || 0) < 2 || a.volcanic) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let len = 1, ok = true;
      while (len <= 8) { const nx = x + dx * len, ny = y + dy * len, n = tile(nx, ny); if (!n || nx > 30 || ny > 30) { ok = false; break; } if ((n.elev || 0) >= (a.elev || 0) - 0) break; len++; }
      if (!ok || len < 3 || len > 8) continue;
      const end = tile(x + dx * len, y + dy * len);
      if (!end || end.blocked || (end.elev || 0) !== (a.elev || 0) || end.volcanic) continue;
      const span = []; for (let k = 1; k < len; k++) span.push([x + dx * k, y + dy * k]);
      if (span.some(([sx, sy]) => mask[idx(sx, sy)] || tile(sx, sy).volcanic || (tile(sx, sy).elev || 0) > (a.elev || 0) - 2 || (tile(sx, sy).blocked && !tile(sx, sy).landscape))) continue;
      if (hashSeed(`${seed}:land:bridge:${rx}:${ry}:${x}:${y}:${dx}`) % 2 !== 0) continue;
      for (const [sx, sy] of span) setTile(map, sx, sy, { kind: "skyBridge", blocked: false, elev: a.elev, landscape: "mountains", bridgeAxis: dx ? "x" : "y", bridgeOver: tile(sx, sy).elev || 0 });
      made.push({ from: [x, y], to: [x + dx * len, y + dy * len] });
    }
  }
  map.skyBridges = made;
}

// Objects and creature spawns on islands (shallows ringed by ocean, spires, pools) get a walkable causeway.
function connectStranded(map, walls = false) {
  const convertible = (tt) => tt.landscape && tt.blocked && [...DEEP_WATER, "alienPool", "crystalSpire", "crag", "starVoid", "sleeperStone"].includes(tt.kind);
  for (const o of [...map.objects.filter((q) => q.actions?.length), ...(map.enemySpawns || [])]) {
    const seen = reachableFromPlaza(map, undefined, walls), ox = Math.round(o.x), oy = Math.round(o.y);
    if (seen[idx(ox, oy)] || N4.some(([dx, dy]) => seen[idx(ox + dx, oy + dy)])) continue;
    let best = null;
    for (let i = 0; i < 1024; i++) if (seen[i]) { const d = Math.abs(i % 32 - ox) + Math.abs(Math.floor(i / 32) - oy); if (!best || d < best.d) best = { i, d }; }
    if (!best) continue;
    const tx = best.i % 32, ty = Math.floor(best.i / 32);
    for (const path of [[[ox, oy, tx, oy], [tx, oy, tx, ty]], [[ox, oy, ox, ty], [ox, ty, tx, ty]]]) {
      const cells = [];
      for (const [x0, y0, x1, y1] of path) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) cells.push([x0 + Math.sign(x1 - x0) * k, y0 + Math.sign(y1 - y0) * k]); }
      if (cells.some(([x, y]) => { const tt = map.tiles[idx(x, y)]; return tt.blocked && !convertible(tt); })) continue;
      for (const [x, y] of cells) { const tt = map.tiles[idx(x, y)]; if (tt.blocked) setTile(map, x, y, { kind: tt.kind === "swampWater" ? "mireWater" : tt.kind === "toxicWater" ? "toxicMire" : DEEP_WATER.includes(tt.kind) ? "shallows" : tt.landscape === "alien" ? "alienMoss" : tt.landscape === "dream" ? "sleepMeadow" : "mountainRock", blocked: false, elev: 0 }); }
      break;
    }
  }
}

// Walkable slopes: dune faces everywhere, and a stair trail from the plaza to the summit in mountains.
function markSlopes(map, seed, rx, ry) {
  for (const t of map.tiles) {
    if (t.blocked || t.landscape !== "desert" || t.kind === "mesaTop") continue;
    const up = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = map.tiles[idx(t.x + dx, t.y + dy)]; return n && !n.blocked && n.kind !== "mesaTop" && (n.elev || 0) > (t.elev || 0); });
    if (up) { t.slope = true; t.kind = "duneFace"; }
  }
}

function bfsPath(map, from, isGoal, walls = false) {
  const prev = new Int16Array(1024).fill(-1), seen = new Uint8Array(1024), q = [idx(from.x, from.y)];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % 32, y = Math.floor(i / 32), t = map.tiles[i];
    if (isGoal(t)) { const path = []; for (let c = i; c !== -1; c = prev[c]) path.push(c); return path.reverse(); }
    // prefer turning: alternate neighbour order by row so trails zigzag instead of running straight
    const order = y % 4 < 2 ? [[1, 0], [0, -1], [-1, 0], [0, 1]] : [[-1, 0], [0, -1], [1, 0], [0, 1]];
    for (const [dx, dy] of order) {
      const nx = x + dx, ny = y + dy, n = map.tiles[idx(nx, ny)];
      if (nx < 1 || ny < 1 || nx > 30 || ny > 30 || seen[idx(nx, ny)] || n.blocked || Math.abs((n.elev || 0) - (t.elev || 0)) > 1 || (walls && sideWalled(t, n, dx, dy))) continue;
      seen[idx(nx, ny)] = 1; prev[idx(nx, ny)] = i; q.push(idx(nx, ny));
    }
  }
  return null;
}

function placeSummit(map, seed, rx, ry, biome, coherence = 0) {
  let best = null;
  // World coherence 1 (WG-07): only a top that can be walked to (and back from) holds the cairn; with none, no cairn.
  const can = coherence >= 1 ? summitReach(map, biome) : null;
  for (const t of map.tiles) if (!t.blocked && t.landscape === biome && (t.elev || 0) >= 1 && (!can || can[idx(t.x, t.y)]) && (!best || t.elev > best.elev || (t.elev === best.elev && hashSeed(`${seed}:land:summit:${t.x}:${t.y}`) > hashSeed(`${seed}:land:summit:${best.x}:${best.y}`)))) best = t;
  if (!best || map.objects.some((o) => Math.abs(o.x - best.x) + Math.abs(o.y - best.y) < 2)) return;
  if (biome === "mountains") {
    const path = bfsPath(map, { x: 16, y: 16 }, (t) => t === best, coherence >= 1);
    for (const i of path || []) { const t = map.tiles[i]; if ((t.elev || 0) > 0) { t.slope = true; t.kind = "mountainTrail"; } }
  }
  const names = { mountains: ["Summit Cairn", "A stone cairn on the roof of the range. The whole section lies below."], desert: ["Mesa Watchstone", "A weathered marker on the mesa, scoured by sand."], alien: ["Floating Lens", "A slow-turning lens hovering above the glowing moss."] }[biome];
  map.objects.push({ id: `landscape-summit-${rx}-${ry}`, kind: "ruinMarker", name: names[0], lore: names[1], x: best.x, y: best.y, state: "quiet", actions: ["inspect"], landmark: true, landscapeSummit: true });
}

// A walled castle in the quadrant clear of corridors and the plaza: walls, corner towers, a gate facing the centre,
// a courtyard, stairs up to walkable battlements and a keep with a lookout landmark on its stairs.
function buildCastle(map, seed, rx, ry, mask) {
  const W = 11, H = 9, spots = [];
  for (let oy = 2; oy <= 32 - H - 2; oy++) for (let ox = 2; ox <= 32 - W - 2; ox++) spots.push([ox, oy]);
  spots.sort(byHash((a) => `${seed}:land:castle-spot:${rx}:${ry}:${a}`));
  for (const [ox, oy] of spots) {
    let clear = true;
    for (let y = oy; y < oy + H && clear; y++) for (let x = ox; x < ox + W; x++) if (mask[idx(x, y)] || (map.tiles[idx(x, y)].blocked && !Number.isInteger(map.tiles[idx(x, y)].ruin))) { clear = false; break; }
    if (!clear) continue;
    const outside = map.tiles[idx(ox + Math.floor(W / 2), oy < 16 ? oy + H : oy - 1)];
    if (!outside || outside.blocked) continue; // the gate must open onto walkable ground
    const gateX = ox + Math.floor(W / 2), gateY = oy < 16 ? oy + H - 1 : oy, kx = ox + Math.floor(W / 2) - 1, ky = oy + Math.floor(H / 2) - 1;
    for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) {
      const edge = x === ox || y === oy || x === ox + W - 1 || y === oy + H - 1, inner = x === ox + 1 || y === oy + 1 || x === ox + W - 2 || y === oy + H - 2;
      const tower = (x <= ox + 1 || x >= ox + W - 2) && (y <= oy + 1 || y >= oy + H - 2), keep = x >= kx && x <= kx + 2 && y >= ky && y <= ky + 2;
      if (edge && x === gateX && y === gateY) setTile(map, x, y, { kind: "castleCourt", blocked: false, elev: 0, landscape: "castle", gate: true });
      else if (edge || tower) setTile(map, x, y, { kind: tower ? "castleTower" : "castleWall", blocked: true, elev: 2, landscape: "castle" });
      else if (inner) setTile(map, x, y, { kind: "battlement", blocked: false, elev: 2, landscape: "castle" });
      else if (keep) setTile(map, x, y, { kind: "castleKeep", blocked: true, elev: 3, landscape: "castle" });
      else setTile(map, x, y, { kind: "castleCourt", blocked: false, elev: 0, landscape: "castle" });
    }
    // grand stairs from the courtyard up to the battlements on both sides of the gate
    const stairY = oy < 16 ? oy + H - 3 : oy + 2, dir = oy < 16 ? -1 : 1;
    for (const sx of [gateX - 2, gateX + 2]) setTile(map, sx, stairY, { kind: "castleStair", blocked: false, elev: 1, slope: true, landscape: "castle" });
    setTile(map, gateX, gateY + dir, { kind: "castleCourt", blocked: false, elev: 0, landscape: "castle", gatehouse: true }); // passage just inside the gate
    // the lookout stands on the battlement farthest from the gate
    map.objects.push({ id: `landscape-castle-${rx}-${ry}`, kind: "ruinMarker", name: "Overland Castle Lookout", lore: "Its battlements still look out over the Corridor.", x: ox + 2, y: oy < 16 ? oy + 1 : oy + H - 2, state: "quiet", actions: ["inspect"], landmark: true, landscapeSummit: true });
    map.castle = { x: ox, y: oy, w: W, h: H, gate: { x: gateX, y: gateY } };
    map.objects = map.objects.filter((o) => !(DECOR.has(o.kind) && o.x >= ox && o.x < ox + W && o.y >= oy && o.y < oy + H));
    for (const e of map.enemySpawns || []) if (e.x >= ox && e.x < ox + W && e.y >= oy && e.y < oy + H && map.tiles[idx(e.x, e.y)].blocked) { e.x = gateX; e.y = gateY - (oy < 16 ? 3 : -3); } // into the courtyard
    return W * H;
  }
  return 0;
}

// ---------------------------------------------------------------- movement and drawing helpers
export function tileUnder(map, width, x, y) {
  const tx = Math.floor(x + .5), ty = Math.floor(y + .75);
  return map?.tiles?.[ty * width + tx] || null;
}
export function liftAt(map, width, x, y) {
  if (!map?.landscape) return 0;
  const t = tileUnder(map, width, x, y);
  return t ? ((t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL * tileLiftScale(t) : 0;
}
// Elevation rule for one movement step (see header). `entity.isPlayer` and `entity.jumping` are set by the game.
export function canStep(entity, map, width, fromX, fromY, toX, toY) {
  if (!map?.landscape || entity?.flying || entity?.phases) return true;
  const a = tileUnder(map, width, fromX, fromY), b = tileUnder(map, width, toX, toY);
  if (!a || !b || a === b) return true;
  const ea = Math.max(a.elev || 0, entity?.airElev ?? -Infinity), eb = b.elev || 0, diff = eb - ea; // release 585: in the air over a skyway gap
  if (diff === 0 || safeVoidScarTransition(a, b)) return true;
  if ((a.slope || b.slope) && Math.abs(diff) <= 1) return true;
  if (!entity?.isPlayer) return false;
  if (diff === 1) return !!entity.jumping;
  return diff < 0; // dropping off a ledge: the game applies fall damage by height
}
export function isLandscapeKind(kind) { return WALKABLE_LANDSCAPE.has(kind) || [...DEEP_WATER, "arcWall", "clodPlain", "clodGreen", "clodYellow", "clodRed", "craterWall", "crag", "crystalSpire", "alienPool", "castleWall", "castleTower", "castleKeep", "lava", "iceSpire", "hoodoo", "moorStone", "canopyTrunk", "thornCrystal", ...DOMAIN_BLOCKED, ...PALETTE_BLOCKERS].includes(kind); }
export function elevationAt(map, width, x, y) { return map?.landscape ? (tileUnder(map, width, x, y)?.elev || 0) : 0; }

// ---------------------------------------------------------------- the Far Sleep (release 305)
// docs/narrative-bible.md section 7, step 4: "The Far Sleep made strange". Past the far band of Readings (depth > 35,
// lore.ts READING_BANDS.far) the ground stops pretending: pale sleep-meadow, white marble terraces climbing in wide steps,
// standing sleeper-stones, and places where the ground has worn so thin that the night sky shows through underneath
// (starVoid, impassable, never lethal). Applied after applyLandscape, only to sections first seen from this release on
// (the atlas pins dreamVersion, as it pins hamletVersion); explored sections keep what they were. In open sea only the
// islands turn to meadow and marble; the water is left alone so boats and the sea's own rules are unchanged.
// Release 423 (Tim: "the dreamlands have too many obstacles in them. So I can't... burst around and run from the bosses...
// It also just makes... traverse... harder"): version 2 opens the ground up: far fewer star-voids and sleeper-stones, and
// lower, wider terraces. Sections first seen before keep version 1 (pinned in the atlas).
// Release 557 (Tim: "when you go far out... everything just is mostly just the dreamlands... I like the far sleep motif...
// more varied tiles... there could be some dreamland spaces... as you get farther out, it becomes less... coherent... pockets
// of... extended... tile types... I like variation where you never know what you're gonna get"): version 3 dreams only in
// pockets (dreamPocket); every other far section keeps the ordinary land its biome gives it. The pockets follow a broad noise
// near the edge of the Far Sleep and scatter more the farther out you go (a per-section roll weighs in up to `scatterMax`,
// reached `scatterOver` sections past the edge): roughly a quarter of far sections dream. Ground is drawn as in version 2.
// Release 569: version 4 follows the world regions: a dream region dreams whole, a wild region keeps version 3's scattered
// pockets, and every other region stays its own land.
export const DREAM_VERSION = 4;
export const DREAM_POCKETS = { scale: 4, above: .62, scatterMax: .5, scatterOver: 120 };
export const FAR_SLEEP_DEPTH = 35; // lore.ts READING_BANDS.far
export const DREAM = { name: "The Far Sleep", voidScale: 5, voidAbove: .72, terraceScale: 7, terraces: [.5, .64], stoneScale: 1.6, stoneAbove: .88 };
export const DREAM_BY_VERSION = { 1: {}, 2: { voidAbove: .82, terraces: [.62, .8], stoneAbove: .955 }, 3: { voidAbove: .82, terraces: [.62, .8], stoneAbove: .955 }, 4: { voidAbove: .82, terraces: [.62, .8], stoneAbove: .955 } };
// Dream seams (release 569; Tim: "the dreaming can be like a boundary between many regions... a connective glue... it isn't as
// rigidly fixed to the... laws of that reality... like a river... not always thick layers of dreaming... interspersed between
// the sections"): past `minDepth`, a section on the border between two regions (within `width` sections of it) dreams where a
// broad noise lets it (`broken`), so the dream runs along the seams of the world in broken veins.
export const DREAM_SEAMS = { minDepth: 24, width: .6, scale: 4, broken: .42 };
export function dreamSeam(seed, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) <= DREAM_SEAMS.minDepth) return false;
  return sectionRegion(seed, rx, ry).gap < DREAM_SEAMS.width && valueNoise(`${seed}:dream:seam`, rx / DREAM_SEAMS.scale, ry / DREAM_SEAMS.scale) > DREAM_SEAMS.broken;
}
// Release 573: on ground laid out at landscape version 5 (`land`), a forest or frostland keeps its own ground: only a seam dreams there.
export function dreamsHere(seed, rx, ry, version, land = 4) { if (version < 3) return true; if (version < 4) return dreamPocket(seed, rx, ry); const t = sectionRegion(seed, rx, ry, land).type; return t === "dream" || dreamSeam(seed, rx, ry) || (t === "wild" && dreamPocket(seed, rx, ry)); }
export function dreamPocket(seed, rx, ry) {
  const depth = Math.abs(rx) + Math.abs(ry), P = DREAM_POCKETS; if (depth <= FAR_SLEEP_DEPTH) return false;
  const w = Math.min(P.scatterMax, (depth - FAR_SLEEP_DEPTH) / P.scatterOver), roll = (hashSeed(`${seed}:dream:pocket:${rx}:${ry}`) % 10007) / 10007;
  return (1 - w) * valueNoise(`${seed}:dream:pocket`, rx / P.scale, ry / P.scale) + w * roll > P.above;
}
export function farSleepSection(rx, ry) { return Math.abs(rx) + Math.abs(ry) > FAR_SLEEP_DEPTH; }
export function applyDream(map, seed, rx, ry, version = DREAM_VERSION) {
  if (!version || !map || map.settlement || (version < 4 && !farSleepSection(rx, ry)) || map.tiles?.length !== 1024 || !dreamsHere(seed, rx, ry, version, map.landscape?.version || 4)) return map; // 569: seams may dream a little nearer (DREAM_SEAMS.minDepth)
  const mask = protectedMask(map, { border: true }), D = { ...DREAM, ...(DREAM_BY_VERSION[version] || {}) }, sea = !!map.openSea; // at sea only the islands dream
  if (sea) {
    for (const t of map.tiles) if (t.x > 0 && t.y > 0 && t.x < 31 && t.y < 31 && !t.blocked && !t.structure && !t.buildingId && !t.environment && t.kind !== "bridge" && t.kind !== "dock" && t.kind !== "shallows" && !Number.isInteger(t.ruin))
      setTile(map, t.x, t.y, { kind: t.slope ? "dreamStair" : t.elev ? "dreamMarble" : "sleepMeadow", landscape: "dream", detail: hashSeed(`${seed}:dream:detail:${rx * 32 + t.x}:${ry * 32 + t.y}`) % 997 });
    map.weather = "petals"; map.dream = version;
    return map;
  }
  for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
    const i = idx(x, y), t = map.tiles[i], gx = rx * 32 + x, gy = ry * 32 + y, d = hashSeed(`${seed}:dream:detail:${gx}:${gy}`) % 997;
    if (t.structure || t.buildingId || t.environment || t.kind === "bridge" || Number.isInteger(t.ruin) || (t.blocked && !t.landscape)) continue;
    if (mask[i]) { if (!t.blocked) setTile(map, x, y, { kind: "sleepMeadow", elev: 0, slope: false, landscape: "dream", detail: d }); continue; }
    const v = valueNoise(`${seed}:dream:void`, gx / D.voidScale, gy / D.voidScale), stone = valueNoise(`${seed}:dream:stone`, gx / D.stoneScale, gy / D.stoneScale) > D.stoneAbove;
    const e = valueNoise(`${seed}:dream:terrace`, gx / D.terraceScale, gy / D.terraceScale), elev = e > D.terraces[1] ? 2 : e > D.terraces[0] ? 1 : 0;
    setTile(map, x, y, v > D.voidAbove ? { kind: "starVoid", blocked: true, elev: 0, slope: false, landscape: "dream", detail: d }
      : stone ? { kind: "sleeperStone", blocked: true, elev, slope: false, landscape: "dream", detail: d }
      : { kind: elev ? "dreamMarble" : "sleepMeadow", blocked: false, elev, slope: false, landscape: "dream", detail: d });
  }
  const sunk = (q) => map.tiles[idx(Math.round(q.x), Math.round(q.y))]?.blocked;
  map.objects = (map.objects || []).filter((q) => !(DECOR.has(q.kind) && sunk(q)) && !(q.jungle && map.tiles[idx(Math.round(q.x), Math.round(q.y))]?.landscape === "dream")); // release 625: a jungle the dream lies over keeps no trees
  ensureClimbable(map, mask);
  wakeStranded(map, mask);
  ensureReturnable(map, 32, 32, { x: 16, y: 16 });
  for (const t of map.tiles) { // marble stairs wherever a terrace meets higher ground
    if (t.landscape !== "dream" || t.blocked) continue;
    if (t.elev) t.kind = "dreamMarble"; else if (t.kind === "dreamMarble" || t.kind === "dreamStair") t.kind = "sleepMeadow";
    const up = N4.some(([dx, dy]) => { const n = map.tiles[idx(t.x + dx, t.y + dy)]; return n && !n.blocked && n.landscape === "dream" && (n.elev || 0) > (t.elev || 0); });
    if (up) { t.slope = true; t.kind = "dreamStair"; }
  }
  map.landscape = { version: map.landscape?.version || LANDSCAPE_VERSION, biome: "dream", name: DREAM.name };
  map.weather = "petals"; map.dream = version;
  return map;
}
// Anything the dream cut off (an object, a spawn, a ruin's doorway) gets the shortest way back across dream ground:
// starVoid and sleeper-stones on that path become meadow at ground level.
function wakeStranded(map, mask) {
  for (const o of [...map.objects.filter((q) => q.actions?.length), ...(map.enemySpawns || [])]) {
    const ox = Math.round(o.x), oy = Math.round(o.y); if (ox < 0 || oy < 0 || ox > 31 || oy > 31) continue;
    let seen = reachableFromPlaza(map);
    if (seen[idx(ox, oy)] || N4.some(([dx, dy]) => seen[idx(ox + dx, oy + dy)])) continue;
    const prev = new Int16Array(1024).fill(-2), q = [idx(ox, oy)]; prev[q[0]] = -1; let hit = -1;
    for (let h = 0; h < q.length && hit < 0; h++) { const i = q[h], x = i % 32, y = Math.floor(i / 32); for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny), t = map.tiles[j]; if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || prev[j] !== -2 || (t.blocked && t.landscape !== "dream")) continue; prev[j] = i; if (seen[j]) { hit = j; break; } q.push(j); } }
    for (let c = prev[hit] ?? -1; hit >= 0 && c >= 0; c = prev[c]) { const t = map.tiles[c]; if (t.landscape === "dream" && (t.blocked || t.elev)) setTile(map, t.x, t.y, { kind: "sleepMeadow", blocked: false, elev: 0, slope: false }); }
  }
  ensureClimbable(map, mask);
}
