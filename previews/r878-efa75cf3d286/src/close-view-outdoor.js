// Overworld Close View: the open world as a place (Tim, 2026-11-10: "Close View for the overworld... mapping and visual
// fidelity for that, and just overall visual fidelity").
//
// Release 867 laid the ordinary renderer's top-down art flat under a grey fog ten tiles out: no sky, no horizon, every rock
// and tree a painting on the ground. This module holds the data and the pure builders for the outdoor scene; close-view.ts
// picks it for the overworld and close-view-gl.ts draws it:
// - A sky per region (OUTDOOR.skies): a gradient from the horizon to the zenith, a sun and its glow, drifting clouds
//   (balanced and full tiers; still with reduced motion), and a far ridge line on the horizon. The fog takes the horizon's
//   colour, so the ground fades into the sky rather than into a grey wall.
// - The ground beyond the ordinary renderer's texture: one texel a tile (outdoorTerrainData), the tile's atlas colour and its
//   flags (water, a blocking outcrop, its height level and its surface class), uploaded once a section. Near the Wayfarer the
//   ground is still the ordinary art; it blends into this farther out, so the view reaches the section's edge.
// - Surface detail by class (grass, sand, snow, rock, paving, glass, earth) in the shader, world-anchored, fading with
//   distance: the magnified tile art reads as a surface and never swims. Water reflects the sky with a Fresnel term and
//   catches the sun; a raised level casts a soft line at its foot and catches the light along its lip.
// - Blocking outcrops (rubble, crags, castle walls, ice spires, monoliths) and standing trees as low-polygon solids
//   (outdoorMesh), built once a section into one static buffer and drawn in one call: they stand up instead of lying flat.
//
// Every number is in OUTDOOR. Nothing here runs per frame except outdoorSignature (a pass over the section's tiles and
// objects, about a thousand reads) and the palette lookup (cached per map).
import { ATLAS_TILE_COLORS } from "./atlas-colors.js?v=r878-efa75cf3d286";

const f = Object.freeze;
export const OUTDOOR = f({
  version: 1,
  // fog per tier, in tiles of camera depth; the ground texture's own reach is the quality tier's radius
  view: f({ low: f({ near: 8, far: 18 }), balanced: f({ near: 10, far: 24 }), full: f({ near: 12, far: 30 }) }),
  // the ordinary art fades into the per-tile ground over this band, in tiles inside the texture's edge
  blend: f({ inner: 1.6, outer: .35 }),
  // ground detail: strength near, and the camera depths over which it fades out
  detail: f({ amp: .22, near: 3, far: 16 }),
  // the foot of a raised level and of an outcrop: how wide (tiles) and how dark; the lip of a level: width and light
  relief: f({ foot: .38, dark: .34, lip: .1, light: .28, levels: 7 }),
  // water: how much of the sky it reflects head on and at a glance, ripple scale and strength, the sun's glint
  water: f({ base: .12, glance: .62, ripple: 2.6, rippleAmp: .35, glint: 1.4 }),
  // the carried torch outdoors in daylight (a share of the theme's), and the vignette
  torch: .22, vignette: .32,
  // weather: cloud cover added, sun strength kept
  weather: f({ rain: f({ clouds: .45, sun: .55 }), snow: f({ clouds: .35, sun: .7 }), sunbreak: f({ clouds: -.15, sun: 1.08 }), still: f({ clouds: 0, sun: 1 }) }),
  // skies by region. zenith, horizon, ridge (far hills) and haze are 0-255 RGB; sun: colour, azimuth and elevation in
  // degrees (azimuth 0 east, 90 south); ambient: the light from the sky; clouds: cover 0-1; ridge: height (radians above
  // the horizon) and roughness; grade: tint and gamma (as the themes); trees: crown, bark and the cold dusting (0-1).
  skies: f({
    waste: f({ zenith: [74, 102, 138], horizon: [196, 170, 150], haze: [182, 160, 142], ridge: [92, 84, 86], ridgeH: .055, rough: .7,
      sun: [255, 214, 170], sunAz: 210, sunEl: 34, sunK: .62, ambient: [.5, .52, .58], clouds: .35, grade: [1.02, 1, .97, 1.02],
      crown: [74, 92, 58], bark: [70, 52, 38], frost: 0 }),
    temperate: f({ zenith: [62, 118, 188], horizon: [184, 206, 222], haze: [170, 192, 206], ridge: [78, 98, 104], ridgeH: .05, rough: .6,
      sun: [255, 238, 206], sunAz: 220, sunEl: 42, sunK: .6, ambient: [.5, .56, .62], clouds: .45, grade: [1, 1, 1, 1],
      crown: [52, 104, 50], bark: [84, 60, 40], frost: 0 }),
    desert: f({ zenith: [70, 128, 196], horizon: [236, 214, 176], haze: [228, 204, 164], ridge: [190, 136, 98], ridgeH: .035, rough: .4,
      sun: [255, 236, 196], sunAz: 200, sunEl: 52, sunK: .7, ambient: [.54, .52, .5], clouds: .12, grade: [1.03, 1, .95, 1],
      crown: [96, 112, 58], bark: [110, 82, 54], frost: 0 }),
    cold: f({ zenith: [86, 128, 178], horizon: [214, 226, 238], haze: [206, 220, 232], ridge: [176, 190, 206], ridgeH: .1, rough: .95,
      sun: [255, 244, 228], sunAz: 230, sunEl: 26, sunK: .58, ambient: [.56, .6, .68], clouds: .4, grade: [.98, 1, 1.03, 1],
      crown: [44, 78, 60], bark: [72, 58, 48], frost: .5 }),
    sea: f({ zenith: [58, 112, 178], horizon: [178, 208, 226], haze: [168, 198, 216], ridge: [120, 150, 168], ridgeH: .012, rough: .3,
      sun: [255, 240, 214], sunAz: 215, sunEl: 38, sunK: .64, ambient: [.5, .58, .66], clouds: .5, grade: [.98, 1, 1.03, 1],
      crown: [60, 112, 64], bark: [96, 72, 50], frost: 0 }),
    fen: f({ zenith: [84, 104, 112], horizon: [168, 176, 152], haze: [150, 160, 136], ridge: [70, 80, 64], ridgeH: .04, rough: .5,
      sun: [236, 230, 190], sunAz: 205, sunEl: 30, sunK: .45, ambient: [.5, .54, .5], clouds: .7, grade: [1, 1.02, .96, 1.03],
      crown: [58, 82, 44], bark: [62, 54, 38], frost: 0 }),
    wild: f({ zenith: [44, 36, 92], horizon: [170, 136, 196], haze: [150, 120, 180], ridge: [70, 52, 104], ridgeH: .06, rough: .8,
      sun: [226, 210, 255], sunAz: 240, sunEl: 30, sunK: .5, ambient: [.52, .48, .62], clouds: .3, grade: [1, .98, 1.04, 1.02],
      crown: [120, 70, 150], bark: [70, 50, 80], frost: 0 }),
    moon: f({ zenith: [14, 16, 28], horizon: [86, 90, 110], haze: [80, 84, 100], ridge: [50, 52, 62], ridgeH: .06, rough: .9,
      sun: [226, 232, 255], sunAz: 250, sunEl: 40, sunK: .62, ambient: [.4, .42, .5], clouds: 0, grade: [.97, 1, 1.05, 1],
      crown: [90, 96, 110], bark: [60, 60, 66], frost: .2 }),
    fire: f({ zenith: [52, 40, 46], horizon: [200, 120, 82], haze: [170, 104, 76], ridge: [52, 36, 34], ridgeH: .07, rough: .9,
      sun: [255, 170, 110], sunAz: 200, sunEl: 22, sunK: .55, ambient: [.54, .44, .42], clouds: .5, grade: [1.04, .98, .94, 1.03],
      crown: [70, 60, 40], bark: [52, 38, 30], frost: 0 }),
    spring: f({ zenith: [72, 132, 196], horizon: [222, 226, 220], haze: [214, 220, 214], ridge: [190, 176, 150], ridgeH: .05, rough: .5,
      sun: [255, 240, 214], sunAz: 220, sunEl: 44, sunK: .62, ambient: [.54, .58, .62], clouds: .3, grade: [1, 1, 1, 1],
      crown: [70, 110, 62], bark: [90, 70, 50], frost: 0 }),
    rule: f({ zenith: [10, 12, 30], horizon: [60, 70, 140], haze: [52, 60, 120], ridge: [20, 22, 46], ridgeH: .05, rough: .2,
      sun: [190, 200, 255], sunAz: 250, sunEl: 36, sunK: .5, ambient: [.42, .44, .58], clouds: 0, grade: [.98, 1, 1.06, 1],
      crown: [60, 70, 130], bark: [30, 32, 50], frost: 0 }),
  }),
  // which sky a section's ground takes (its landscape biome or region ground; else its most common tile)
  skyOf: f({ desert: "desert", mountains: "cold", frost: "cold", coast: "sea", sea: "sea", isles: "sea", lake: "temperate", swamp: "fen", blight: "fen",
    alien: "wild", castle: "temperate", forest: "temperate", jungle: "temperate", savanna: "desert", salt: "desert", pillars: "desert", lunar: "moon",
    volcanic: "fire", obsidian: "fire", amber: "fire", terraces: "spring", reckoning: "rule", fog: "fen", fungal: "wild", crystal: "wild", biomech: "waste",
    petrified: "waste", reef: "sea", snowField: "cold", glass: "waste", ash: "waste", ember: "waste" }),
  // surface classes for the ground detail (the shader's outdoorDetail): the first pattern a tile's kind matches
  surfaces: f([
    f(["grass", /grass|moss|forest|jungle|meadow|savanna|fen|bog|loam|refuge|canopyLeaf|fringe|mat$/i]),
    f(["sand", /sand|dune|beach|salt|mesa|desert|pillarGround|reefFlat/i]),
    f(["snow", /snow|ice|frost|peak|sinter|seaIce/i]),
    f(["rock", /rock|crag|stone|trail|basalt|rim|slope|crater|shale|moon|hoodoo/i]),
    f(["paved", /court|city|floor|stair|battlement|dock|bridge|platform|cloister|arc|rule/i]),
    f(["glass", /glass|crystal|obsidian|quicksilver|prism/i]),
  ]),
  surfaceIds: f({ earth: 0, grass: 1, sand: 2, snow: 3, rock: 4, paved: 5, glass: 6 }),
  waterKinds: /water|ocean|shallow|river|lake|sea|pool|mire|tide|brine|current|wateringHole/i,
  // outcrops: blocking tiles stood up as solids. The first rule whose pattern matches the kind; h: height in tiles, jitter:
  // up to this much more by the tile's hash, perLevel: added a height level, taper: the top's inset share, inset: the
  // footprint's inset (tiles), mat: 0 rock, 1 masonry, 2 ice and crystal, 3 glass and obsidian, 6 vitrified rubble
  outcrops: f([
    f({ test: /^castleKeep$/, h: 3.1, jitter: .2, mat: 1, inset: 0 }),
    f({ test: /^castleTower$/, h: 2.7, jitter: .15, mat: 1, inset: .04 }),
    f({ test: /^castle|Wall$|wall$/, h: 1.9, jitter: .1, mat: 1, inset: 0 }),
    f({ test: /^crag$/, h: 1.3, jitter: .7, perLevel: .18, mat: 0, inset: .04, taper: .12 }),
    f({ test: /Spire$|Cluster$|Stack$/, h: 2.1, jitter: .8, mat: 2, inset: .14, taper: .7 }),
    f({ test: /Monolith$/, h: 2.8, jitter: .2, mat: 3, inset: .12, taper: .08 }),
    f({ test: /Vent$/, h: .45, jitter: .15, mat: 0, inset: .12, taper: .3 }),
    f({ test: /Tree$|Trunk$|acacia|Cap$/, h: 1.6, jitter: .4, mat: 5, inset: .3, taper: .2 }),
    f({ test: /^glass$/, h: .55, jitter: .55, mat: 6, inset: .03, taper: .1 }),
    f({ test: /.*/, h: .6, jitter: .6, mat: 0, inset: .03, taper: .1 }),
  ]),
  // standing trees by form: trunk height and radius, crown kind (0 cone stack, 1 round, 2 low round), crown size and lift
  trees: f({
    spindle: f({ trunk: .45, trunkR: .07, crown: 0, r: .44, h: 1.75, lift: .3 }),
    canopy: f({ trunk: .85, trunkR: .09, crown: 1, r: .62, h: .95, lift: .8 }),
    shrub: f({ trunk: 0, trunkR: 0, crown: 2, r: .4, h: .5, lift: .02 }),
  }),
  treeShadow: f({ r: .62, alpha: .34 }),
  // rough outcrops as mounds: an open edge at `rim` of the height, a shared corner at `inner` of the mean, heights varied by
  // up to `jitter` either way, the peak wandering this far (tiles) from the tile's middle
  mound: f({ rim: .5, inner: .92, jitter: .14, wander: .3 }),
  // bounds: at most this many solids in a section (the buffer never grows past it)
  maxOutcrops: 1600, maxTrees: 160,
});

const rgb01 = (c) => [c[0] / 255, c[1] / 255, c[2] / 255];
const hex01 = (h) => { const n = parseInt(String(h || "#4a4a46").slice(1, 7), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const DEG = Math.PI / 180;
// a small integer hash, the same for the same inputs (generation never reads it: presentation only)
export function outdoorHash(a, b, c = 0) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

const isWater = (t) => !!t && OUTDOOR.waterKinds.test(String(t.kind || ""));
const WALL_EXEMPT = /water|ocean|shallow|lava|river|canyon|abyss|chasm|void|pit|sky|star|cloud/i;
// the same blocking test Close View's camera uses (close-view.ts isWall): the camera never stands inside an outcrop
export const outdoorOutcrop = (t) => !!t && t.blocked === true && !t.chasm && !t.doorway && !WALL_EXEMPT.test(String(t.kind || ""));
export const outdoorTreeObject = (o) => !!o && o.kind === "tree" && o.state === "standing" && !o.strange && !!OUTDOOR.trees[o.vegetationForm];
export function outdoorSurface(kind) { for (const [id, re] of OUTDOOR.surfaces) if (re.test(String(kind || ""))) return OUTDOOR.surfaceIds[id]; return OUTDOOR.surfaceIds.earth; }

// The section's sky: by its landscape (biome or region ground), else its most common tile kind. Cached per map.
const SKY_OF = new WeakMap();
export function outdoorSkyId(map) {
  if (map && SKY_OF.has(map)) return SKY_OF.get(map);
  let id = OUTDOOR.skyOf[map?.landscape?.biome];
  if (!id) { const n = {}; let best = "", bn = 0; for (const t of map?.tiles || []) { const k = t?.landscape || t?.kind; if (!k) continue; n[k] = (n[k] || 0) + 1; if (n[k] > bn) { bn = n[k]; best = k; } } id = OUTDOOR.skyOf[best] || "waste"; }
  if (map && typeof map === "object") SKY_OF.set(map, id); return id;
}
// The sky's numbers for the GPU, made once per sky and weather (0-1 colours, the sun's direction).
const SKY_GL = new Map(), SKY_MAP = new WeakMap();
export function outdoorSky(map) {
  const known = map && typeof map === "object" ? SKY_MAP.get(map) : null; if (known && known.weather === map.weather) return known.sky;
  const sky = skyFor(map); if (map && typeof map === "object") SKY_MAP.set(map, { weather: map.weather, sky }); return sky;
}
function skyFor(map) {
  const id = outdoorSkyId(map), weather = OUTDOOR.weather[map?.weather] || OUTDOOR.weather.still, key = `${id}:${map?.weather || "still"}`;
  let s = SKY_GL.get(key); if (s) return s; const k = OUTDOOR.skies[id] || OUTDOOR.skies.waste;
  const az = k.sunAz * DEG, el = k.sunEl * DEG, sunK = k.sunK * weather.sun;
  s = f({ id, zenith: rgb01(k.zenith), horizon: rgb01(k.horizon), haze: rgb01(k.haze), ridge: rgb01(k.ridge), ridgeH: k.ridgeH, rough: k.rough,
    sun: f([Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]), sunC: rgb01(k.sun).map((v) => v * sunK), ambient: k.ambient,
    clouds: Math.max(0, Math.min(1, k.clouds + weather.clouds)), grade: k.grade, crown: rgb01(k.crown), bark: rgb01(k.bark), frost: k.frost });
  SKY_GL.set(key, s); return s;
}

// One texel a tile: RGB the tile's atlas colour; A its flags: bit 0 water, bit 1 an outcrop, bits 2-4 its height level
// (0-7), bits 5-7 its surface class. Pure (tests read it); the caller caches it per map and signature.
export function outdoorTerrainData(map, out = null) {
  const w = Math.max(1, Number(map?.width) || 32), tiles = map?.tiles || [], h = Math.max(1, Number(map?.height) || Math.floor(tiles.length / w));
  const data = out && out.length >= w * h * 4 ? out : new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const t = tiles[i], o = i * 4; const c = hex01(ATLAS_TILE_COLORS[t?.kind] || ATLAS_TILE_COLORS.blocked);
    data[o] = Math.round(c[0] * 255); data[o + 1] = Math.round(c[1] * 255); data[o + 2] = Math.round(c[2] * 255);
    const lv = Math.max(0, Math.min(OUTDOOR.relief.levels, Math.round(Number(t?.elev) || 0)));
    data[o + 3] = (isWater(t) ? 1 : 0) | (outdoorOutcrop(t) ? 2 : 0) | (lv << 2) | (outdoorSurface(t?.kind) << 5); }
  return { data, w, h };
}

// What the static scene depends on: which tiles block and which trees stand. A pass over the tiles and objects.
export function outdoorSignature(map) {
  let a = 0, b = 0; const tiles = map?.tiles || [];
  for (let i = 0; i < tiles.length; i++) if (tiles[i]?.blocked) a = (a + Math.imul(i + 1, 2654435761)) | 0;
  const objs = map?.objects || []; for (let i = 0; i < objs.length; i++) if (outdoorTreeObject(objs[i])) b = (b + Math.imul(Math.round(objs[i].x * 16) + 1, 40503) + Math.imul(Math.round(objs[i].y * 16) + 1, 9973)) | 0;
  return tiles.length * 4294967296 + ((a ^ Math.imul(b, 0x9e3779b1)) >>> 0); // a number: nothing allocated per frame
}

// ---------------------------------------------------------------------------------------------- the solids
// Vertices: x, y, z, normal x, y, z, r, g, b, material (OUTDOOR_FLOATS each), flat-shaded triangles.
export const OUTDOOR_FLOATS = 10;
const CTR = [0, 0, 0]; // the centre of the solid being built
const centre = (x, y, z) => { CTR[0] = x; CTR[1] = y; CTR[2] = z; };
function pushTri(V, n, a, b, c, col, mat) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  // facing out of the solid: away from its centre (the solids are convex; nothing is culled by winding)
  if (nx * ((a[0] + b[0] + c[0]) / 3 - CTR[0]) + ny * ((a[1] + b[1] + c[1]) / 3 - CTR[1]) + nz * ((a[2] + b[2] + c[2]) / 3 - CTR[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
  for (const p of [a, b, c]) { const o = n * OUTDOOR_FLOATS; V[o] = p[0]; V[o + 1] = p[1]; V[o + 2] = p[2]; V[o + 3] = nx; V[o + 4] = ny; V[o + 5] = nz; V[o + 6] = col[0]; V[o + 7] = col[1]; V[o + 8] = col[2]; V[o + 9] = mat; n++; }
  return n;
}
// a quad a b c d (counter-clockwise seen from outside)
const pushQuad = (V, n, a, b, c, d, col, mat) => pushTri(V, pushTri(V, n, a, b, c, col, mat), a, c, d, col, mat);
const outcropRule = (kind) => { for (const r of OUTDOOR.outcrops) if (r.test.test(kind)) return r; return OUTDOOR.outcrops[OUTDOOR.outcrops.length - 1]; };
export function outdoorOutcropHeight(t) { const r = outcropRule(String(t?.kind || "")); return r.h + r.jitter * outdoorHash(t?.x | 0, t?.y | 0, 7) + (r.perLevel || 0) * (Number(t?.elev) || 0); }

// The static solids of a section: outcrops and standing trees. Returns { data, verts, outcrops, trees }. Pure.
export function outdoorMesh(map, sky) {
  const w = Math.max(1, Number(map?.width) || 32), tiles = map?.tiles || [], h = Math.max(1, Number(map?.height) || Math.floor(tiles.length / w));
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : tiles[y * w + x];
  const heights = new Float32Array(w * h); let outcrops = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = tiles[y * w + x]; if (outdoorOutcrop(t) && outcrops < OUTDOOR.maxOutcrops) { heights[y * w + x] = outdoorOutcropHeight(t); outcrops++; } }
  const trees = (map?.objects || []).filter(outdoorTreeObject).slice(0, OUTDOOR.maxTrees);
  const V = new Float32Array((outcrops * 72 + trees.length * 240) * OUTDOOR_FLOATS); let n = 0;
  const frost = sky?.frost || 0;
  // Rough outcrops (rock, rubble) are faceted mounds: each tile a ring of eight points round its peak, the points shared with
  // a rough neighbour at the heights both compute alike (so a run of rubble is one lumpy ridge, with no seams), the open
  // edges dropped to `rim` of the height with a short face to the ground. Masonry, ice and the rest stay upright blocks.
  const rough = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) if (heights[i] > 0) { const r = outcropRule(String(tiles[i].kind || "")); rough[i] = r.mat === 0 || r.mat === 6 ? 1 : 0; }
  const R = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rough[y * w + x] === 1, Hh = (x, y) => heights[y * w + x], M = OUTDOOR.mound;
  const cornerZ = (cx, cy) => { let sum = 0, k = 0, open = false; for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { if (R(cx + dx, cy + dy)) { sum += Hh(cx + dx, cy + dy); k++; } else open = true; }
    return (sum / Math.max(1, k)) * (open ? M.rim : M.inner) * (1 - M.jitter + 2 * M.jitter * outdoorHash(cx, cy, 21)); };
  const edgeZ = (ax, ay, bx, by, H) => R(bx, by) ? (H + Hh(bx, by)) * .5 * (1 - M.jitter + 2 * M.jitter * outdoorHash(ax + bx, ay + by, 23)) : H * M.rim * (1 - M.jitter + 2 * M.jitter * outdoorHash(ax + bx, ay + by, 29));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const H = heights[y * w + x]; if (!(H > 0)) continue; const t = tiles[y * w + x], r = outcropRule(String(t.kind || ""));
    const base = hex01(ATLAS_TILE_COLORS[t.kind] || ATLAS_TILE_COLORS.blocked), shade = .9 + .2 * outdoorHash(x, y, 3), col = base.map((v) => Math.min(1, v * shade * (r.mat === 1 ? 1.25 : 1.15) + .03));
    const top = frost > 0 && r.mat === 0 ? col.map((v) => v + (.92 - v) * frost) : col;
    if (rough[y * w + x]) { centre(x + .5, y + .5, H * .35);
      const ring = [[x, y, cornerZ(x, y)], [x + .5, y, edgeZ(x, y, x, y - 1, H)], [x + 1, y, cornerZ(x + 1, y)], [x + 1, y + .5, edgeZ(x, y, x + 1, y, H)],
        [x + 1, y + 1, cornerZ(x + 1, y + 1)], [x + .5, y + 1, edgeZ(x, y, x, y + 1, H)], [x, y + 1, cornerZ(x, y + 1)], [x, y + .5, edgeZ(x, y, x - 1, y, H)]];
      const peak = [x + .5 + (outdoorHash(x, y, 31) - .5) * M.wander, y + .5 + (outdoorHash(x, y, 37) - .5) * M.wander, H];
      for (let i = 0; i < 8; i++) n = pushTri(V, n, ring[i], ring[(i + 1) % 8], peak, top, r.mat);
      const open = [!R(x, y - 1), !R(x + 1, y), !R(x, y + 1), !R(x - 1, y)]; // the faces down to the ground on open edges
      for (let e = 0; e < 4; e++) if (open[e]) { const a = ring[e * 2], b = ring[e * 2 + 1], c = ring[(e * 2 + 2) % 8];
        n = pushQuad(V, n, [a[0], a[1], 0], [b[0], b[1], 0], b, a, col, r.mat); n = pushQuad(V, n, [b[0], b[1], 0], [c[0], c[1], 0], c, b, col, r.mat); }
      continue; }
    const inset = r.inset || 0, k = (r.taper || 0) * .5 * (1 - 2 * inset), x0 = x + inset, x1 = x + 1 - inset, y0 = y + inset, y1 = y + 1 - inset;
    const tx0 = x0 + k, tx1 = x1 - k, ty0 = y0 + k, ty1 = y1 - k; centre(x + .5, y + .5, H * .5);
    // a side is drawn where the neighbour is lower (from the neighbour's top, or the ground), and always when tapered or inset
    const sideFrom = (nx, ny) => { if (inset > 0 || k > 0 || R(nx, ny)) return 0; const q = at(nx, ny) ? heights[ny * w + nx] : 0; return q > 0 ? q : 0; };
    let z0 = sideFrom(x, y - 1); if (z0 < H) n = pushQuad(V, n, [x1, y0, z0], [x0, y0, z0], [tx0, ty0, H], [tx1, ty0, H], col, r.mat); // north (y-)
    z0 = sideFrom(x, y + 1); if (z0 < H) n = pushQuad(V, n, [x0, y1, z0], [x1, y1, z0], [tx1, ty1, H], [tx0, ty1, H], col, r.mat); // south
    z0 = sideFrom(x - 1, y); if (z0 < H) n = pushQuad(V, n, [x0, y0, z0], [x0, y1, z0], [tx0, ty1, H], [tx0, ty0, H], col, r.mat); // west
    z0 = sideFrom(x + 1, y); if (z0 < H) n = pushQuad(V, n, [x1, y1, z0], [x1, y0, z0], [tx1, ty0, H], [tx1, ty1, H], col, r.mat); // east
    n = pushQuad(V, n, [tx0, ty0, H], [tx0, ty1, H], [tx1, ty1, H], [tx1, ty0, H], top, r.mat); }
  // trees: a tapered trunk and a faceted crown, turned and sized a little by their place
  const crown = sky?.crown || [.2, .4, .2], bark = sky?.bark || [.33, .24, .16];
  for (const o of trees) { const T = OUTDOOR.trees[o.vegetationForm], cx = Number(o.x) + .5, cy = Number(o.y) + .72, hs = outdoorHash(Math.round(o.x * 4), Math.round(o.y * 4), 11), sc = .85 + .35 * hs, rot = hs * 6.283;
    const tint = .85 + .3 * outdoorHash(Math.round(o.x * 4), Math.round(o.y * 4), 13), cc = crown.map((v, i) => Math.min(1, v * tint * (i === 1 ? 1.04 : 1))), fc = frost > 0 ? cc.map((v) => v + (.9 - v) * frost * .55) : cc;
    const ring = (r, z, sides, ph = 0) => { const out = []; for (let i = 0; i < sides; i++) { const a = rot + ph + i / sides * 6.283; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); } return out; };
    const band = (A, B, col, mat) => { for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; n = pushQuad(V, n, A[i], A[j], B[j], B[i], col, mat); } };
    const capTop = (A, apex, col, mat) => { for (let i = 0; i < A.length; i++) n = pushTri(V, n, A[i], A[(i + 1) % A.length], apex, col, mat); };
    const capBot = (A, apex, col, mat) => { for (let i = 0; i < A.length; i++) n = pushTri(V, n, A[(i + 1) % A.length], A[i], apex, col, mat); };
    centre(cx, cy, T.trunk * sc * .5); if (T.trunk > 0) band(ring(T.trunkR * sc * 1.3, 0, 5), ring(T.trunkR * sc * .8, (T.trunk + T.lift * .5) * sc, 5), bark, 5);
    const r = T.r * sc, z = T.lift * sc, H = T.h * sc;
    if (T.crown === 0) { // a spindle: three stacked cones, each overhanging the next
      for (let k = 0; k < 3; k++) { const z0 = z + k * H * .3, r0 = r * (1 - k * .26), A = ring(r0, z0, 7, k * .4); centre(cx, cy, z0 + H * .12); capBot(A, [cx, cy, z0 + H * .04], fc, 4); capTop(A, [cx, cy, z0 + H * (k === 2 ? .5 : .42)], k === 2 ? fc : cc, 4); }
    } else { // a round crown: rings of a faceted ellipsoid
      const rings = 4, sides = 7, layers = []; for (let k = 1; k < rings; k++) { const a = k / rings * Math.PI, wob = 1 + .12 * (outdoorHash(k, Math.round(o.x * 4), Math.round(o.y * 4)) - .5); layers.push(ring(r * Math.sin(a) * wob, z + H * .5 * (1 - Math.cos(a)), sides, k * .45)); }
      centre(cx, cy, z + H * .5); capBot(layers[0], [cx, cy, z], cc, 4); for (let k = 0; k < layers.length - 1; k++) band(layers[k], layers[k + 1], k === layers.length - 2 ? fc : cc, 4); capTop(layers[layers.length - 1], [cx, cy, z + H], fc, 4); }
  }
  return { data: V.subarray(0, n * OUTDOOR_FLOATS), verts: n, outcrops, trees: trees.length };
}

// The outdoor scene of a section for the GPU: the sky, the per-tile ground and the static solids, rebuilt only when its
// signature changes (a dig, a block, a felled tree). Cached per map.
const SCENES = new WeakMap();
export function outdoorScene(map) {
  if (!map || typeof map !== "object") return null; const sig = outdoorSignature(map), sky = outdoorSky(map); let sc = SCENES.get(map);
  if (sc && sc.sig === sig && sc.sky === sky) return sc;
  const terrain = outdoorTerrainData(map), mesh = outdoorMesh(map, sky);
  sc = { sig, sky, terrain, mesh, key: {} }; SCENES.set(map, sc); return sc; // key: a fresh object each rebuild (the GPU side uploads when it changes)
}
