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
import { hashSeed } from "./random.js?v=r183-41a3bdd9b25e";
import { placeDock } from "./boats.js?v=r183-41a3bdd9b25e";

// Version 1: release 94 landscape. Version 2 (Waterbodies, water world W1): seas spanning many sections with islands
// and a deep-ocean band, inland lakes, swamps and poison swamps. Version 3 (the Skiff, W2): docks with a Shipwright.
// Each section keeps the version it was first seen with.
export const LANDSCAPE_VERSION = 3;
export const LIFT_PER_LEVEL = 0.34; // drawn height of one elevation level, in tiles
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
const WALKABLE_LANDSCAPE = new Set(["snowRock", "snowPeak", "mountainRock", "alpineGrass", "mountainTrail", "sand", "duneCrest", "duneFace",
  "beach", "shallows", "dock", "bogGround", "mireWater", "toxicBog", "toxicMire", "alienMoss", "alienPlatform", "castleCourt", "castleStair", "battlement", "mesaTop", "skyBridge", "volcanicRim", "ashSlope"]);

// ---------------------------------------------------------------- noise
function lattice(key, ix, iy) { return (hashSeed(`${key}:${ix}:${iy}`) % 10007) / 10007; }
const smooth = (t) => t * t * (3 - 2 * t);
export function valueNoise(key, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = lattice(key, ix, iy), b = lattice(key, ix + 1, iy), c = lattice(key, ix, iy + 1), d = lattice(key, ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(key, x, y, octaves = 3) {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += valueNoise(`${key}:${o}`, x * 2 ** o, y * 2 ** o) * amp; norm += amp; amp *= .5; }
  return sum / norm;
}

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
// Version 2 sea level: the version 1 field bent by the continent field (seas), minus island lift. `open` is before islands.
function seaLevel(seed, gx, gy, version) {
  const base = field.ocean(seed, gx, gy);
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
  if (field.mountain(seed, gx, gy) > T.mountain) return "mountains";
  if (castleSection(seed, rx, ry)) return "castle";
  if (field.alien(seed, gx, gy) > T.alien) return "alien";
  if (field.desert(seed, gx, gy) > T.desert) return "desert";
  if (version >= 2) {
    if (field.lake(seed, gx, gy) > WATERBODIES.lake.rim) return "lake";
    const wet = field.wet(seed, gx, gy);
    if (wet > WATERBODIES.swamp.blight) return "blight";
    if (wet > WATERBODIES.swamp.threshold) return "swamp";
  }
  // A section can still touch a neighbouring biome's edge (coastline, foothills); report that for the atlas.
  for (const [dx, dy] of [[-12, 0], [12, 0], [0, -12], [0, 12]]) {
    if (seaLevel(seed, gx + dx, gy + dy, version).o > T.beach) return "coast";
    if (field.mountain(seed, gx + dx, gy + dy) > T.mountain) return "mountains";
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
export function openSeaShare(seed, rx, ry, version = LANDSCAPE_VERSION) {
  let n = 0; for (let y = 0; y < 32; y += 2) for (let x = 0; x < 32; x += 2) if (seaLevel(seed, rx * 32 + x, ry * 32 + y, version).o > T.ocean) n++;
  return n / 256;
}
export function applyLandscape(map, seed, rx, ry, { explored = false, version = LANDSCAPE_VERSION, openSea = false, hamlet = false, buoy = true } = {}) {
  if (!map || map.landscape || explored || map.settlement || Math.abs(rx) + Math.abs(ry) <= 1 || map.tiles?.length !== 1024) return map;
  const full = openSea && version >= 2 && Math.abs(rx) + Math.abs(ry) >= OPEN_SEA.minDepth && openSeaShare(seed, rx, ry, version) >= OPEN_SEA.minWater;
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
  const lo = openSea ? 0 : 1, hi = openSea ? 32 : 31;
  for (let y = lo; y < hi; y++) for (let x = lo; x < hi; x++) {
    const i = idx(x, y), t = map.tiles[i], gx = rx * 32 + x, gy = ry * 32 + y, d = hashSeed(`${seed}:land:detail:${gx}:${gy}`) % 997;
    const prot = mask[i] === 1, o = seaLevel(seed, gx, gy, version).o, m = field.mountain(seed, gx, gy), a = field.alien(seed, gx, gy), s = field.desert(seed, gx, gy);
    if ((x === 0 || y === 0 || x === 31 || y === 31) && (prot || o <= T.ocean)) continue; // borders only ever open to deep water
    if (o > T.beach) {
      const deep = o > T.ocean, abyssal = v2 && o > T.ocean + W.deep;
      if (isle[i]) { setTile(map, x, y, { kind: "beach", blocked: false, elev: 0, landscape: "coast", detail: d }); touched++; continue; }
      setTile(map, x, y, deep && !prot ? { kind: abyssal ? "deepOcean" : "ocean", blocked: true, elev: 0, landscape: abyssal ? "sea" : "coast", detail: d } : { kind: deep || o > T.ocean - .012 ? "shallows" : "beach", blocked: false, elev: 0, landscape: "coast", detail: d });
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
    const lk = field.lake(seed, gx, gy);
    if (lk > W.lake.rim) {
      setTile(map, x, y, lk > W.lake.water && !prot ? { kind: "lakeWater", blocked: true, elev: 0, landscape: "lake", detail: d } : { kind: "shallows", blocked: false, elev: 0, landscape: "lake", detail: d });
      touched++; continue;
    }
    const wet = field.wet(seed, gx, gy);
    if (wet > W.swamp.threshold) {
      const blight = wet > W.swamp.blight, pool = valueNoise(`${seed}:land:mire`, gx / W.swamp.poolScale, gy / W.swamp.poolScale);
      const kind = pool > W.swamp.pool && !prot ? (blight ? "toxicWater" : "swampWater") : pool > W.swamp.mire ? (blight ? "toxicMire" : "mireWater") : (blight ? "toxicBog" : "bogGround");
      setTile(map, x, y, { kind, blocked: kind === "toxicWater" || kind === "swampWater", elev: 0, landscape: blight ? "blight" : "swamp", detail: d });
      touched++;
    }
  }
  if (biome === "castle") touched += buildCastle(map, seed, rx, ry, protectedMask(map, { spawns: false, ruins: false, decor: false }));
  if (!touched) return map;
  if (biome === "mountains" && hashSeed(`${seed}:land:volcano:${rx}:${ry}`) % 3 === 0) buildVolcano(map, seed, rx, ry, mask);
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
  } else connectStranded(map);
  if (biome === "mountains" || biome === "desert" || biome === "alien") placeSummit(map, seed, rx, ry, biome);
  for (const t of ensureReturnable(map, 32, 32, { x: 16, y: 16 })) if (t.landscape === "mountains" && !t.volcanic && !t.slope && t.kind !== "skyBridge") t.kind = mountainKind(t.elev || 0);
  addRamps(map, 32, 32, `${seed}:${rx}:${ry}`);
  if (v2) placeIslandLandmark(map, seed, rx, ry);
  if (version >= 3) placeDock(map, seed, rx, ry, reachableFromPlaza(map));
  if (biome === "mountains") map.weather = "snow";
  map.landscape = { version, biome: biome || dominantLandscape(map), name: BIOMES[biome || dominantLandscape(map)]?.name || null, ...(openSea ? { openSea: full ? "open" : "coast" } : {}) };
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

function dominantLandscape(map) {
  const count = {};
  for (const t of map.tiles) if (t.landscape) count[t.landscape] = (count[t.landscape] || 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function mountainKind(elev) { return elev >= 4 ? "snowPeak" : elev === 3 ? "snowRock" : elev >= 1 ? "mountainRock" : "alpineGrass"; }
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// What the player can reach from the plaza: climb at most one level (or along a slope), drop any height.
export function reachableFromPlaza(map, start = { x: 16, y: 16 }) {
  const seen = new Uint8Array(1024), q = [idx(start.x, start.y)];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], a = map.tiles[i], x = i % 32, y = Math.floor(i / 32);
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy, j = idx(nx, ny), b = map.tiles[j];
      if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j] || !b || b.blocked) continue;
      const up = (b.elev || 0) - (a.elev || 0);
      if (up > 1) continue;
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
const step = (a, b) => (b.elev || 0) - (a.elev || 0) <= 1;
function sweep(map, width, height, start, reverse) {
  const T = map.tiles, seen = new Uint8Array(width * height), s0 = start.y * width + start.x;
  if (!walkable(T[s0])) return seen;
  const q = [s0]; seen[s0] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % width, y = (i - x) / width;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy, j = ny * width + nx;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[j] || !walkable(T[j])) continue;
      if (reverse ? !step(T[j], T[i]) : !step(T[i], T[j])) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}
export const reachableFrom = (map, width, height, start) => sweep(map, width, height, start, false);
export const canReturnTo = (map, width, height, start) => sweep(map, width, height, start, true);
export function trappedTiles(map, width, height, start) {
  const go = reachableFrom(map, width, height, start), back = canReturnTo(map, width, height, start), out = [];
  for (let i = 0; i < go.length; i++) if (go[i] && !back[i]) out.push(map.tiles[i]);
  return out;
}
// Raise each trap floor to one level below the lowest way out, until every reachable tile leads back to start.
export function ensureReturnable(map, width, height, start) {
  const raised = [];
  for (let pass = 0; pass < 80; pass++) {
    const go = reachableFrom(map, width, height, start), back = canReturnTo(map, width, height, start);
    let changed = false;
    for (let i = 0; i < go.length; i++) {
      if (!go[i] || back[i]) continue;
      const t = map.tiles[i], x = i % width, y = (i - x) / width;
      let target = Infinity;
      for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = ny * width + nx; if (nx >= 0 && ny >= 0 && nx < width && ny < height && back[j] && walkable(map.tiles[j])) target = Math.min(target, (map.tiles[j].elev || 0) - 1); }
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
function connectStranded(map) {
  const convertible = (tt) => tt.landscape && tt.blocked && [...DEEP_WATER, "alienPool", "crystalSpire", "crag"].includes(tt.kind);
  for (const o of [...map.objects.filter((q) => q.actions?.length), ...(map.enemySpawns || [])]) {
    const seen = reachableFromPlaza(map), ox = Math.round(o.x), oy = Math.round(o.y);
    if (seen[idx(ox, oy)] || N4.some(([dx, dy]) => seen[idx(ox + dx, oy + dy)])) continue;
    let best = null;
    for (let i = 0; i < 1024; i++) if (seen[i]) { const d = Math.abs(i % 32 - ox) + Math.abs(Math.floor(i / 32) - oy); if (!best || d < best.d) best = { i, d }; }
    if (!best) continue;
    const tx = best.i % 32, ty = Math.floor(best.i / 32);
    for (const path of [[[ox, oy, tx, oy], [tx, oy, tx, ty]], [[ox, oy, ox, ty], [ox, ty, tx, ty]]]) {
      const cells = [];
      for (const [x0, y0, x1, y1] of path) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) cells.push([x0 + Math.sign(x1 - x0) * k, y0 + Math.sign(y1 - y0) * k]); }
      if (cells.some(([x, y]) => { const tt = map.tiles[idx(x, y)]; return tt.blocked && !convertible(tt); })) continue;
      for (const [x, y] of cells) { const tt = map.tiles[idx(x, y)]; if (tt.blocked) setTile(map, x, y, { kind: tt.kind === "swampWater" ? "mireWater" : tt.kind === "toxicWater" ? "toxicMire" : DEEP_WATER.includes(tt.kind) ? "shallows" : tt.landscape === "alien" ? "alienMoss" : "mountainRock", blocked: false, elev: 0 }); }
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

function bfsPath(map, from, isGoal) {
  const prev = new Int16Array(1024).fill(-1), seen = new Uint8Array(1024), q = [idx(from.x, from.y)];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % 32, y = Math.floor(i / 32), t = map.tiles[i];
    if (isGoal(t)) { const path = []; for (let c = i; c !== -1; c = prev[c]) path.push(c); return path.reverse(); }
    // prefer turning: alternate neighbour order by row so trails zigzag instead of running straight
    const order = y % 4 < 2 ? [[1, 0], [0, -1], [-1, 0], [0, 1]] : [[-1, 0], [0, -1], [1, 0], [0, 1]];
    for (const [dx, dy] of order) {
      const nx = x + dx, ny = y + dy, n = map.tiles[idx(nx, ny)];
      if (nx < 1 || ny < 1 || nx > 30 || ny > 30 || seen[idx(nx, ny)] || n.blocked || Math.abs((n.elev || 0) - (t.elev || 0)) > 1) continue;
      seen[idx(nx, ny)] = 1; prev[idx(nx, ny)] = i; q.push(idx(nx, ny));
    }
  }
  return null;
}

function placeSummit(map, seed, rx, ry, biome) {
  let best = null;
  for (const t of map.tiles) if (!t.blocked && t.landscape === biome && (t.elev || 0) >= 1 && (!best || t.elev > best.elev || (t.elev === best.elev && hashSeed(`${seed}:land:summit:${t.x}:${t.y}`) > hashSeed(`${seed}:land:summit:${best.x}:${best.y}`)))) best = t;
  if (!best || map.objects.some((o) => Math.abs(o.x - best.x) + Math.abs(o.y - best.y) < 2)) return;
  if (biome === "mountains") {
    const path = bfsPath(map, { x: 16, y: 16 }, (t) => t === best);
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
  spots.sort((a, b) => hashSeed(`${seed}:land:castle-spot:${rx}:${ry}:${a}`) - hashSeed(`${seed}:land:castle-spot:${rx}:${ry}:${b}`));
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
  return t ? ((t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL : 0;
}
// Elevation rule for one movement step (see header). `entity.isPlayer` and `entity.jumping` are set by the game.
export function canStep(entity, map, width, fromX, fromY, toX, toY) {
  if (!map?.landscape || entity?.flying || entity?.phases) return true;
  const a = tileUnder(map, width, fromX, fromY), b = tileUnder(map, width, toX, toY);
  if (!a || !b || a === b) return true;
  const ea = a.elev || 0, eb = b.elev || 0, diff = eb - ea;
  if (diff === 0) return true;
  if ((a.slope || b.slope) && Math.abs(diff) <= 1) return true;
  if (!entity?.isPlayer) return false;
  if (diff === 1) return !!entity.jumping;
  return diff < 0; // dropping off a ledge: the game applies fall damage by height
}
export function isLandscapeKind(kind) { return WALKABLE_LANDSCAPE.has(kind) || [...DEEP_WATER, "crag", "crystalSpire", "alienPool", "castleWall", "castleTower", "castleKeep", "lava"].includes(kind); }
export function elevationAt(map, width, x, y) { return map?.landscape ? (tileUnder(map, width, x, y)?.elev || 0) : 0; }
