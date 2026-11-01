// Seasons in the woods (release 679). Tim, 2026-11-01: seasons for the forest and great-tree sections ("summer... lush green;
// spring... some green trees, some flowering; fall... red, orange, brown... some bare... falling leaves; winter... bare
// branches, some snow-capped... snowfall"), turning "30 to 40 tiles explored outside of the region... this attracts more of how
// I play the game".
//
// - Each forest or jungle region (landscape.ts regions, `regions`) has one season over all its sections, so neighbouring
//   groves agree. It starts at a season hashed from the seed and the region's id.
// - The season turns (spring → summer → fall → winter → spring) after `turn` (30–40, hashed per region and turn) sections are
//   explored for the first time outside that region. Only regions the Wayfarer has stood in keep a count (`save.seasons`, at
//   most `maxTracked`, the oldest dropped first); a region never seen starts at its hashed season when first met.
// - Nothing generated changes: the season is drawn over the same trees (renderer.ts: the tree's leaf colours, bare branches,
//   snow caps, blossom), with a little seasonal weather (`weather`). It never changes what can be walked, cut or climbed.
// Save: additive at schema 14 (`save.seasons`: { [regionId]: { t: turns so far, n: sections explored outside since the last turn } }).
import { hashSeed } from "./random.js?v=r689-750a4b5dcbe8";

export const SEASONS = {
  regions: ["forest", "jungle"],
  order: ["spring", "summer", "fall", "winter"],
  turn: [30, 40], // first-explored sections outside the region before its season turns
  maxTracked: 48,
  looks: {
    // leaves: crown palettes picked per tree; bare: share of trees with no leaves; bloom: share flowering; snow: share snow-capped
    spring: { name: "Spring", leaves: [["#5f9a4a", "#3a5a33", "#8cc06a"], ["#6aa852", "#3a5a33", "#a9d47e"]], bloom: .45, blossom: ["#f6c8dc", "#fff2f6", "#f0a8c8"], bare: 0, snow: 0 },
    summer: { name: "Summer", leaves: [["#3f7a34", "#353229", "#5a9440"], ["#2f6a2c", "#353229", "#4f8a3a"]], bloom: 0, bare: 0, snow: 0 },
    fall: { name: "Fall", leaves: [["#c4562a", "#3e2c1e", "#e08a3a"], ["#d68a2a", "#3e2c1e", "#efb54a"], ["#8a4a24", "#3e2c1e", "#b06a34"], ["#a83a24", "#3e2c1e", "#d0603a"]], bloom: 0, bare: .3, snow: 0 },
    winter: { name: "Winter", leaves: [["#2a4a36", "#2e2620", "#3a5e44"]], bloom: 0, bare: .85, snow: .5 },
  },
  // Great-tree crowns (tile canopies) and the forest's giant trees take a wash of the season over their leaves.
  wash: { spring: "#f6c8dc30", summer: null, fall: "#d0702a55", winter: "#eef4f870" },
  weather: { spring: "petals", fall: "leaves", winter: "snow" },
  // Leaf palettes for the great trees' canopies (branch leaves, boughs, crowns) and the forest's giant trees (dark, mid, light).
  canopy: { spring: ["#4f9a3f", "#f2b8d0", "#3f8a35", "#fbe0ea"], fall: ["#c4562a", "#e08a3a", "#8a4a24", "#efb54a"], winter: ["#e8eef2", "#2f4f3c", "#f6f9fb", "#3a5a44"] },
  crown: { spring: ["#2f5a2a", "#3f7a34", "#e8a8c4"], fall: ["#7a3418", "#a8481e", "#d6822e"], winter: ["#1e3a2a", "#26442f", "#2f4f38"] },
  snowCap: "#f4f8fb",
};

export function ensureSeasons(save) {
  const raw = save?.seasons, out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [id, r] of Object.entries(raw)) {
    const t = Math.floor(Number(r?.t)), n = Math.floor(Number(r?.n));
    out[id] = { t: Number.isFinite(t) && t >= 0 ? t : 0, n: Number.isFinite(n) && n >= 0 ? n : 0 };
  }
  if (save) save.seasons = out;
  return save;
}

export const seasonal = (region) => !!region && SEASONS.regions.includes(region.type);
const need = (seed, id, t) => { const [lo, hi] = SEASONS.turn; return lo + hashSeed(`${seed}:season-turn:v1:${id}:${t}`) % (hi - lo + 1); };
export const seasonTurnsIn = (seed, id, t) => need(seed, id, t);

// The season of a region now ("spring" … "winter"), or null for a region that has none. Does not change the save.
export function seasonOf(save, region) {
  if (!seasonal(region)) return null;
  const start = hashSeed(`${save.seed}:season:v1:${region.id}`) % 4, t = save.seasons?.[region.id]?.t || 0;
  return SEASONS.order[(start + t) % 4];
}

// The Wayfarer stands in `region`: start keeping its count (dropping the oldest past `maxTracked`).
export function trackSeason(save, region) {
  if (!seasonal(region)) return null; const S = (save.seasons ||= {});
  if (!S[region.id]) { S[region.id] = { t: 0, n: 0 }; const ids = Object.keys(S); while (ids.length > SEASONS.maxTracked) delete S[ids.shift()]; }
  return seasonOf(save, region);
}

// A section was explored for the first time in region `hereId`: every other tracked region counts it, and turns when due.
export function noteSeasonDiscovery(save, hereId) {
  const S = save.seasons || {}; const turned = [];
  for (const [id, r] of Object.entries(S)) { if (String(id) === String(hereId)) continue; r.n++; if (r.n >= need(save.seed, id, r.t)) { r.t++; r.n = 0; turned.push(id); } }
  return turned;
}

// The look of one tree in a season: its crown palette (null when bare), and whether it flowers or wears snow. Hashed per tree.
export function treeSeason(season, x, y) {
  const L = SEASONS.looks[season]; if (!L) return null;
  const h = hashSeed(`season-tree:${x}:${y}`), r = (k) => ((h >>> k) % 1000) / 1000;
  const bare = r(0) < L.bare;
  return { bare, leaves: bare ? null : L.leaves[(h >>> 12) % L.leaves.length], bloom: !bare && r(4) < L.bloom ? L.blossom[(h >>> 9) % L.blossom.length] : null, snow: r(8) < L.snow };
}
