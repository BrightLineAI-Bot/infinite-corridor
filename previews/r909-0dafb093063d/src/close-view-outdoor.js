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
import { ATLAS_TILE_COLORS } from "./atlas-colors.js?v=r909-0dafb093063d";
import { LIFT_PER_LEVEL, tileLiftScale } from "./landscape.js?v=r909-0dafb093063d";
import { hashSeed } from "./random.js?v=r909-0dafb093063d";

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
  water: f({ base: .12, glance: .62, ripple: 2.6, rippleAmp: .35, glint: 1.4,
    // the shore (version 2, 2026-11-11): the coast follows a smooth field over the tiles' middles, wandering this far (tiles);
    // the wet band on land and the foam on the water (tiles wide, and the foam's strength); deep water darkened by `deep`,
    // shallow water lifted by `shallow`; clouds in the reflection (balanced and full tiers only)
    wander: .5, shore: .2, foam: .6, deep: .42, shallow: .16 }),
  // the ordinary art near the Wayfarer: how much of its tile-scale detail stays (the rest is its own colour, smoothed), so the
  // ground reads as one surface and not a board of squares; the per-tile colour beyond is unchanged
  ground: f({ art: .6 }),
  // the carried torch outdoors in daylight (a share of the theme's), and the vignette
  torch: .22, vignette: .32,
  // weather: cloud cover added, sun strength kept
  weather: f({ rain: f({ clouds: .45, sun: .55 }), snow: f({ clouds: .35, sun: .7 }), sunbreak: f({ clouds: -.15, sun: 1.08 }), still: f({ clouds: 0, sun: 1 }) }),
  // skies by region. zenith, horizon, ridge (far hills) and haze are 0-255 RGB; sun: colour, azimuth and elevation in
  // degrees (azimuth 0 east, 90 south); ambient: the light from the sky; clouds: cover 0-1; ridge: height (radians above
  // the horizon) and roughness; grade: tint and gamma (as the themes); trees: crown, bark and the cold dusting (0-1).
  skies: f({
    waste: f({ zenith: [62, 104, 166], horizon: [226, 182, 146], haze: [206, 168, 138], ridge: [98, 82, 80], ridgeH: .055, rough: .7,
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
    fen: f({ zenith: [58, 112, 128], horizon: [196, 206, 150], haze: [168, 180, 132], ridge: [62, 82, 60], ridgeH: .04, rough: .5,
      sun: [236, 230, 190], sunAz: 205, sunEl: 30, sunK: .45, ambient: [.5, .54, .5], clouds: .7, grade: [1, 1.02, .96, 1.03],
      crown: [58, 82, 44], bark: [62, 54, 38], frost: 0 }),
    wild: f({ zenith: [56, 26, 150], horizon: [236, 120, 196], haze: [204, 112, 186], ridge: [48, 92, 120], ridgeH: .06, rough: .8,
      sun: [255, 206, 246], sunAz: 240, sunEl: 30, sunK: .58, ambient: [.56, .48, .66], clouds: .3, grade: [1, .98, 1.04, 1.02],
      crown: [120, 70, 150], bark: [70, 50, 80], frost: 0 }),
    moon: f({ stars: .8, zenith: [14, 16, 28], horizon: [86, 90, 110], haze: [80, 84, 100], ridge: [50, 52, 62], ridgeH: .06, rough: .9,
      sun: [226, 232, 255], sunAz: 250, sunEl: 40, sunK: .62, ambient: [.4, .42, .5], clouds: 0, grade: [.97, 1, 1.05, 1],
      crown: [90, 96, 110], bark: [60, 60, 66], frost: .2 }),
    fire: f({ zenith: [74, 34, 40], horizon: [240, 128, 70], haze: [196, 104, 66], ridge: [52, 36, 34], ridgeH: .07, rough: .9,
      sun: [255, 170, 110], sunAz: 200, sunEl: 22, sunK: .55, ambient: [.54, .44, .42], clouds: .5, grade: [1.04, .98, .94, 1.03],
      crown: [70, 60, 40], bark: [52, 38, 30], frost: 0 }),
    spring: f({ zenith: [72, 132, 196], horizon: [222, 226, 220], haze: [214, 220, 214], ridge: [190, 176, 150], ridgeH: .05, rough: .5,
      sun: [255, 240, 214], sunAz: 220, sunEl: 44, sunK: .62, ambient: [.54, .58, .62], clouds: .3, grade: [1, 1, 1, 1],
      crown: [70, 110, 62], bark: [90, 70, 50], frost: 0 }),
    rule: f({ stars: .6, zenith: [10, 12, 30], horizon: [60, 70, 140], haze: [52, 60, 120], ridge: [20, 22, 46], ridgeH: .05, rough: .2,
      sun: [190, 200, 255], sunAz: 250, sunEl: 36, sunK: .5, ambient: [.42, .44, .58], clouds: 0, grade: [.98, 1, 1.06, 1],
      crown: [60, 70, 130], bark: [30, 32, 50], frost: 0 }),
  }),
  // which sky a section's ground takes (its landscape biome or region ground; else its most common tile)
  skyOf: f({ desert: "desert", mountains: "cold", frost: "cold", coast: "sea", sea: "sea", isles: "sea", lake: "temperate", swamp: "fen", blight: "fen",
    alien: "wild", castle: "temperate", forest: "temperate", jungle: "temperate", savanna: "desert", salt: "desert", pillars: "desert", lunar: "moon",
    volcanic: "fire", obsidian: "fire", amber: "fire", terraces: "spring", reckoning: "rule", glacier: "cold", fog: "fen", fungal: "wild", crystal: "wild", biomech: "waste",
    petrified: "waste", reef: "sea", snowField: "cold", glass: "waste", ash: "waste", ember: "waste" }),
  // Sky moods (Tim, 2026-11-11: "We can have sunset, we can have sunrise, we can have night sky, we can have clouds. We can have
  // stormy, overcast."). A mood is laid over the region's sky, not instead of it: each biome colour is scaled by `light` and
  // moved `mix` of the way to the mood's own (zenith, horizon; the haze and fog follow the horizon, the far ridge darkens with
  // it). sun: the light's colour (`sunMix` of the way from the region's), azimuth and elevation in degrees (null: the
  // region's) and strength (times the region's); at night the light is the moon (`moon` 1 draws its disc instead of the sun's).
  // ambient and grade multiply the region's; clouds is cover added; cloud: the clouds' colour, cloudDark how dark their
  // undersides are; stars 0-1; lightning: the strength of distant flashes (never with reduced motion); torch: the carried
  // light's share outdoors (OUTDOOR.torch by day). weight: how often a section takes it.
  moods: f({
    sunrise: f({ weight: 12, zenith: [72, 104, 178], horizon: [255, 176, 128], mix: .55, light: 1, sun: [255, 176, 112], sunMix: .8, sunAz: 15, sunEl: 7, sunK: .85,
      ambient: [.94, .84, .82], grade: [1.04, .99, .95, 1], clouds: 0, cloud: [255, 200, 176], cloudDark: 0, stars: .1, moon: 0, lightning: 0, torch: .3 }),
    day: f({ weight: 34, zenith: [96, 150, 220], horizon: [214, 228, 240], mix: 0, light: 1, sun: [255, 244, 224], sunMix: 0, sunAz: null, sunEl: null, sunK: 1,
      ambient: [1, 1, 1], grade: [1, 1, 1, 1], clouds: 0, cloud: [255, 255, 255], cloudDark: 0, stars: 0, moon: 0, lightning: 0, torch: .22 }),
    sunset: f({ weight: 14, zenith: [70, 52, 132], horizon: [255, 124, 76], mix: .6, light: .96, sun: [255, 138, 76], sunMix: .85, sunAz: 195, sunEl: 6, sunK: .8,
      ambient: [.96, .76, .74], grade: [1.06, .97, .92, 1], clouds: .05, cloud: [255, 150, 136], cloudDark: 0, stars: .15, moon: 0, lightning: 0, torch: .35 }),
    night: f({ weight: 16, zenith: [6, 10, 30], horizon: [30, 44, 82], mix: .78, light: .55, sun: [176, 196, 244], sunMix: 1, sunAz: 235, sunEl: 38, sunK: .36,
      ambient: [.46, .52, .72], grade: [.94, .98, 1.08, 1], clouds: -.1, cloud: [62, 72, 104], cloudDark: .4, stars: 1, moon: 1, lightning: 0, torch: 1 }),
    overcast: f({ weight: 14, zenith: [132, 140, 152], horizon: [184, 188, 192], mix: .62, light: .95, sun: [236, 236, 236], sunMix: .5, sunAz: null, sunEl: null, sunK: .35,
      ambient: [1.02, 1.02, 1.04], grade: [.98, 1, 1.02, 1], clouds: .55, cloud: [214, 218, 224], cloudDark: .25, stars: 0, moon: 0, lightning: 0, torch: .3 }),
    storm: f({ weight: 10, zenith: [34, 40, 56], horizon: [88, 96, 110], mix: .72, light: .7, sun: [200, 210, 230], sunMix: .6, sunAz: null, sunEl: null, sunK: .16,
      ambient: [.74, .78, .9], grade: [.96, .99, 1.04, 1], clouds: .75, cloud: [72, 78, 94], cloudDark: .7, stars: 0, moon: 0, lightning: 1, torch: .5 }),
  }),
  // how a section's own weather weighs the moods (missing: 1): rain is overcast or a storm, a sunbreak is never grey
  moodWeather: f({ rain: f({ storm: 3, overcast: 2, night: .5, day: 0, sunrise: 0, sunset: 0 }), snow: f({ overcast: 2.5, storm: .3 }),
    sunbreak: f({ storm: 0, overcast: 0, night: 0 }) }),
  // a mood holds over a block of `cell` x `cell` sections (it changes as the Wayfarer travels); `version` names the choice
  moodCell: 3, moodVersion: 1,
  // distant lightning (storm): a flash may fall in each `slot` ms (`chance`), as a double flicker (`flicker`: ms apart, the
  // second's share, the decay ms); the ground's ambient lifts by `lift` at its peak
  lightning: f({ slot: 2600, chance: .45, flicker: f([110, .65, 70]), lift: .25 }),
  // surface classes for the ground detail (the shader's outdoorDetail): the first pattern a tile's kind matches
  surfaces: f([
    f(["grass", /grass|moss|forest|jungle|meadow|savanna|fen|bog|loam|refuge|canopyLeaf|fringe|mat$/i]),
    f(["sand", /sand|dune|beach|salt|mesa|desert|pillarGround|reefFlat/i]),
    f(["snow", /snow|ice|frost|peak|sinter|seaIce|firn|serac/i]),
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
  // a crown's own shading: its underside, its lower band and its top (times the crown colour); a round crown's side lobe
  treeShade: f({ under: .58, low: .82, top: 1.12, lobe: .42 }),
  // rough outcrops as mounds: an open edge at `rim` of the height, a shared corner at `inner` of the mean, heights varied by
  // up to `jitter` either way, the peak wandering this far (tiles) from the tile's middle
  mound: f({ rim: .5, inner: .92, jitter: .14, wander: .3 }),
  // bounds: at most this many solids in a section (the buffer never grows past it)
  maxOutcrops: 1600, maxTrees: 160,
  // The heightfield (version 2, Tim 2026-11-11: "it doesn't show the different heights of things... the depths of holes in
  // canyons, chasms... Everything just looks kind of flat"). Every walkable tile stands at its level's height (the ordinary
  // view's LIFT_PER_LEVEL, a great tree's levels taller), a ramp tile slopes between its neighbours, a level's edge is a
  // cliff face, and a canyon, chasm or abyss is a real hole `pitDepth` deep with walls darkening toward its floor. Water lies
  // `waterDrop` below its bank. Built once a section; the solids (outcrops, trees, props, houses) stand on it.
  //
  // Version 3 (Tim, 2026-11-11: "these 3 or 4 high stacked platforms that are only about hip height for the Wayfarer...
  // things need more vertical distance"): Close View no longer borrows the ordinary view's drawn lift (.34 a tile, a knee's
  // height to a 1.8-tile Wayfarer). One level is `level` tall: 1.2, the Wayfarer's chest, so a single step is a ledge you
  // jump onto and four stacked levels stand well over their head. A great tree's levels (one a branch tile, climbed as a
  // spiral of slopes) are `canopyLevel`: .9, a little taller than the old 2 x .34 so its decks step clearly, gentler than a
  // ground level so a branch stays a walkable slope; its 25 levels make a crown about 22 tiles up. Holes are deeper to
  // match (`pitDepth`). A great building's roof keeps the ordinary view's own lift (roofLift), since its facade is drawn to it.
  // Gameplay is untouched: one jump a level, the same steps, falls and collision; only what is drawn is taller.
  terrain: f({ level: 1.2, canopyLevel: .9, pitDepth: 4.6, waterDrop: .08, maxTiles: 16384,
    // a great tree's branches and leaf pads (Tim, 2026-11-11: "The branches should float. They should extend from the tree
    // like normal branches on a real tree"): a deck `deck` thick with an underside, and a limb under it that tapers from
    // `limbRoot` wide at the trunk to `limbTip` at the deck, rising `limbRise` from the trunk to the deck; the ground under
    // them is in the tree's shade (`shade`). The trunk stays a column.
    deck: .3, limbRoot: .34, limbTip: .14, limbRise: .7, limbReach: 7, shade: .62 }),
  pitKinds: /canyon|abyss|chasm/i,
  // Props (version 2, 2026-11-11: "a full, detailed visual refinement pass on all the assets in Close View"): the world's
  // common standing things built as solids instead of the ordinary view's sprite on a card. By kind: the recipe, its
  // colours (body, dark, accent: the ordinary view's palette for the kind, so both views agree), how many of a section's
  // props at most, the most vertices one may take, and the soft shadow under each (radius in tiles, darkness).
  props: f({
    max: 120, maxVerts: 480, shadow: f({ r: .46, alpha: .3 }),
    kinds: f({
      rock: f({ recipe: "boulder", colors: f(["#666a65", "#343735", "#90948b"]) }),
      chest: f({ recipe: "chest", colors: f(["#8d6938", "#443326", "#b7a06a"]) }),
      cache: f({ recipe: "chest", colors: f(["#9a8549", "#4a4229", "#c1ae72"]) }),
      supplyCache: f({ recipe: "crate", colors: f(["#765f3c", "#2b251d", "#d7b96f"]) }),
      weaponCache: f({ recipe: "armory", colors: f(["#5d4a36", "#26201a", "#b9c2c8"]) }),
      shrine: f({ recipe: "shrine", colors: f(["#806f91", "#4d665f", "#8ed1c1"]) }),
      checkpoint: f({ recipe: "pylon", colors: f(["#b8f5f2", "#315c65", "#72d7df"]) }),
      ruinMarker: f({ recipe: "standingStone", colors: f(["#806b52", "#433a31", "#b09b79"]) }),
      dungeon: f({ recipe: "portal", colors: f(["#62576b", "#332d39", "#63817a"]) }),
      watcherTomb: f({ recipe: "tomb", colors: f(["#c9c6d8", "#5a566c", "#e8f4ff"]) }),
    }),
    // states that show a cache or chest opened (its lid thrown back), and that show a rock moved or broken (rubble)
    opened: /^(used|open|opened|empty|looted|taken)$/, rubble: /^(moved|broken)$/,
  }),
  // Buildings (version 2): a shelter's or a hamlet's house stands up from its own tiles: walls along each tile's wallSides
  // (as thick and as high as `wall`), a lintel over its door, and a roof over its footprint (a gable along its longer side,
  // `pitch` rise a tile from the eaves, at most `ridge` above them; flat roofs a low slab with a parade). The roof is not
  // drawn while the Wayfarer is inside, nor while the camera is over it or it stands between them (close-view.ts), so
  // the inside reads as the ordinary view shows it. Colours by the house's family or district style: wall, roof, trim
  // (the ordinary view's palette); mat: the walls' material (as the solids').
  buildings: f({
    wall: f({ h: 1.15, t: .14, lintel: .92 }), pitch: .42, ridge: 1.05, eave: .12, flat: .14, max: 12, perTile: 240,
    looks: f({
      timber: f({ wall: "#6a5a44", roof: "#3a3128", trim: "#8f7658", mat: 7 }), masonry: f({ wall: "#6f6a5e", roof: "#34332e", trim: "#8b8170", mat: 1 }),
      ruinedGatehouse: f({ wall: "#6d6152", roof: "#302d29", trim: "#9a8168", mat: 1 }), cyberRelay: f({ wall: "#22424a", roof: "#152b31", trim: "#42b8b2", mat: 8 }),
      alienGeometric: f({ wall: "#3a3a5c", roof: "#24243b", trim: "#a78cce", mat: 2 }), biomechanical: f({ wall: "#4a3444", roof: "#30222d", trim: "#9b647f", mat: 7 }),
      city: f({ wall: "#55565c", roof: "#393a3f", trim: "#858188", mat: 1 }), arcology: f({ wall: "#24474f", roof: "#18333b", trim: "#58a0a6", mat: 8 }),
      cloister: f({ wall: "#5a4650", roof: "#3b2d35", trim: "#9a737f", mat: 1 }), fortress: f({ wall: "#4a423b", roof: "#302b27", trim: "#9b8268", mat: 1 }),
      other: f({ wall: "#56524a", roof: "#33302a", trim: "#8f7658", mat: 1 }),
    }),
    structures: /^(shack|district)(Wall|Interior|Door)$/,
  }),
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
// The section's sky mood (OUTDOOR.moods): a weighted pick hashed from the journey's seed and the block of sections it lies in,
// weighed by the section's weather. Pure and cached per map; nothing generated or saved changes.
const MOOD_OF = new WeakMap(), MOOD_IDS = Object.keys(OUTDOOR.moods);
export function outdoorMoodId(map) {
  const known = map && typeof map === "object" ? MOOD_OF.get(map) : null; if (known && known.weather === map.weather) return known.id;
  const id = moodFor(map?.seed, map?.rx, map?.ry, map?.weather); if (map && typeof map === "object") MOOD_OF.set(map, { weather: map.weather, id }); return id;
}
export function moodFor(seed, rx, ry, weather) {
  const c = OUTDOOR.moodCell, cx = Math.floor((Number(rx) || 0) / c), cy = Math.floor((Number(ry) || 0) / c), w = OUTDOOR.moodWeather[weather] || null;
  let total = 0; for (const id of MOOD_IDS) total += OUTDOOR.moods[id].weight * (w?.[id] ?? 1);
  if (!(total > 0)) return "day";
  let r = hashSeed(`${seed ?? ""}:sky-mood:v${OUTDOOR.moodVersion}:${cx}:${cy}`) / 4294967296 * total;
  for (const id of MOOD_IDS) { r -= OUTDOOR.moods[id].weight * (w?.[id] ?? 1); if (r < 0) return id; }
  return MOOD_IDS[MOOD_IDS.length - 1];
}
// The sky's numbers for the GPU, made once per sky, weather and mood (0-1 colours, the sun's direction).
const SKY_GL = new Map(), SKY_MAP = new WeakMap();
export function outdoorSky(map) {
  const known = map && typeof map === "object" ? SKY_MAP.get(map) : null; if (known && known.weather === map.weather) return known.sky;
  const sky = outdoorSkyMix(outdoorSkyId(map), outdoorMoodId(map), map?.weather); if (map && typeof map === "object") SKY_MAP.set(map, { weather: map.weather, sky }); return sky;
}
const lerp = (a, b, t) => a + (b - a) * t;
const tint = (c, m, M) => f([0, 1, 2].map((i) => lerp(c[i] / 255 * m.light, M[i] / 255, m.mix)));
// a region's sky under a mood (exported for tests: every pair is complete and finite)
export function outdoorSkyMix(id, moodId = "day", weatherId = "still") {
  const key = `${id}:${weatherId || "still"}:${moodId}`; let s = SKY_GL.get(key); if (s) return s;
  const k = OUTDOOR.skies[id] || OUTDOOR.skies.waste, m = OUTDOOR.moods[moodId] || OUTDOOR.moods.day, weather = OUTDOOR.weather[weatherId] || OUTDOOR.weather.still;
  const az = (m.sunAz ?? k.sunAz) * DEG, el = (m.sunEl ?? k.sunEl) * DEG, sunK = k.sunK * weather.sun * m.sunK;
  const sunC = [0, 1, 2].map((i) => lerp(k.sun[i], m.sun[i], m.sunMix) / 255 * sunK);
  s = f({ id: k === OUTDOOR.skies[id] ? id : "waste", mood: m === OUTDOOR.moods[moodId] ? moodId : "day", zenith: tint(k.zenith, m, m.zenith), horizon: tint(k.horizon, m, m.horizon), haze: tint(k.haze, m, m.horizon),
    ridge: f([0, 1, 2].map((i) => lerp(k.ridge[i] / 255 * m.light, m.horizon[i] / 255 * .45, m.mix * .6))), ridgeH: k.ridgeH, rough: k.rough,
    sun: f([Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]), sunC: f(sunC), ambient: f(k.ambient.map((v, i) => v * m.ambient[i])),
    clouds: Math.max(0, Math.min(1, k.clouds + weather.clouds + m.clouds)), grade: f(k.grade.map((v, i) => v * m.grade[i])), crown: rgb01(k.crown), bark: rgb01(k.bark), frost: k.frost,
    cloud: rgb01(m.cloud), cloudDark: m.cloudDark, stars: Math.max(m.stars, k.stars || 0), moon: m.moon, lightning: m.lightning, torch: m.torch });
  SKY_GL.set(key, s); return s;
}
// Distant lightning at `now` ms for a sky of `strength` (0: none): 0-1, and its azimuth (radians) in LIGHTNING.az. A pure
// function of the time (the same flashes on every device); no allocation. Callers pass 0 with reduced motion.
export const LIGHTNING = { k: 0, az: 0 };
const boltHash = (n) => { let h = Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return (h ^ (h >>> 15)) >>> 0; };
export function outdoorLightning(now, strength) {
  LIGHTNING.k = 0; if (!(strength > 0) || !Number.isFinite(now)) return 0; const L = OUTDOOR.lightning, slot = Math.floor(now / L.slot), h = boltHash(slot);
  if ((h & 1023) / 1024 >= L.chance) return 0; const t = now - slot * L.slot - ((h >>> 10) & 1023) / 1024 * L.slot * .6; if (t < 0) return 0;
  const gap = L.flicker[0], second = L.flicker[1], decay = L.flicker[2], k = Math.exp(-t / decay) + (t >= gap ? second * Math.exp(-(t - gap) / decay) : 0);
  if (k < .003) return 0; LIGHTNING.az = ((h >>> 20) & 1023) / 1024 * Math.PI * 2; LIGHTNING.k = Math.min(1, k) * Math.min(1, strength); return LIGHTNING.k;
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

// What the static scene depends on: which tiles block, their levels, and which trees stand. A pass over the tiles and objects.
export function outdoorSignature(map) {
  let a = 0, b = 0; const tiles = map?.tiles || [];
  for (let i = 0; i < tiles.length; i++) { const t = tiles[i]; if (t?.blocked) a = (a + Math.imul(i + 1, 2654435761)) | 0; if (t?.elev) a = (a + Math.imul(i + 7, 40503) * ((t.elev * 4 | 0) + (t.slope ? 1 : 0))) | 0; }
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
export function outdoorMesh(map, sky, relief = null) { // R: the section's relief (outdoorRelief): outcrops rise from their level, trees stand on theirs
  const w = Math.max(1, Number(map?.width) || 32), tiles = map?.tiles || [], h = Math.max(1, Number(map?.height) || Math.floor(tiles.length / w));
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : tiles[y * w + x];
  const heights = new Float32Array(w * h); let outcrops = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = tiles[y * w + x]; if (outdoorOutcrop(t) && outcrops < OUTDOOR.maxOutcrops) { heights[y * w + x] = outdoorOutcropHeight(t) + (relief ? Math.max(0, relief.top[y * w + x]) : 0); outcrops++; } }
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
  for (const o of trees) { const t0 = n; treeSolid(o); if (relief) { const dz = outdoorSurfaceZ(relief, Number(o.x) + .5, Number(o.y) + .72); if (dz) for (let v = t0; v < n; v++) V[v * OUTDOOR_FLOATS + 2] += dz; } }
  function treeSolid(o) { const T = OUTDOOR.trees[o.vegetationForm], cx = Number(o.x) + .5, cy = Number(o.y) + .72, hs = outdoorHash(Math.round(o.x * 4), Math.round(o.y * 4), 11), sc = .85 + .35 * hs, rot = hs * 6.283;
    const tint = .85 + .3 * outdoorHash(Math.round(o.x * 4), Math.round(o.y * 4), 13), cc = crown.map((v, i) => Math.min(1, v * tint * (i === 1 ? 1.04 : 1))), fc = frost > 0 ? cc.map((v) => v + (.9 - v) * frost * .55) : cc;
    const ring = (r, z, sides, ph = 0) => { const out = []; for (let i = 0; i < sides; i++) { const a = rot + ph + i / sides * 6.283; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); } return out; };
    const band = (A, B, col, mat) => { for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; n = pushQuad(V, n, A[i], A[j], B[j], B[i], col, mat); } };
    const capTop = (A, apex, col, mat) => { for (let i = 0; i < A.length; i++) n = pushTri(V, n, A[i], A[(i + 1) % A.length], apex, col, mat); };
    const capBot = (A, apex, col, mat) => { for (let i = 0; i < A.length; i++) n = pushTri(V, n, A[(i + 1) % A.length], A[i], apex, col, mat); };
    centre(cx, cy, T.trunk * sc * .5); if (T.trunk > 0) band(ring(T.trunkR * sc * 1.3, 0, 5), ring(T.trunkR * sc * .8, (T.trunk + T.lift * .5) * sc, 5), bark, 5);
    const r = T.r * sc, z = T.lift * sc, H = T.h * sc;
    // version 2 (2026-11-11): the crown is shaded within itself (OUTDOOR.treeShade: its underside and lower faces darker,
    // its top catching the light) and a round crown carries a second, smaller lobe to one side, so no two read as the same ball
    const Sh = OUTDOOR.treeShade, dk = cc.map((v) => v * Sh.under), lo = cc.map((v) => v * Sh.low), hi = fc.map((v) => Math.min(1, v * Sh.top));
    if (T.crown === 0) { // a spindle: three stacked cones, each overhanging the next, and a slim tip
      for (let k = 0; k < 3; k++) { const z0 = z + k * H * .3, r0 = r * (1 - k * .26), A = ring(r0, z0, 7, k * .4); centre(cx, cy, z0 + H * .12); capBot(A, [cx, cy, z0 + H * .04], dk, 4); capTop(A, [cx, cy, z0 + H * (k === 2 ? .5 : .42)], k === 2 ? hi : k === 1 ? cc : lo, 4); }
      { const z0 = z + H * .82, A = ring(r * .2, z0, 5, 1.1); centre(cx, cy, z0 + H * .1); capTop(A, [cx, cy, z0 + H * .3], hi, 4); }
    } else { // a round crown: rings of a faceted ellipsoid
      const rings = 4, sides = 7, layers = []; for (let k = 1; k < rings; k++) { const a = k / rings * Math.PI, wob = 1 + .12 * (outdoorHash(k, Math.round(o.x * 4), Math.round(o.y * 4)) - .5); layers.push(ring(r * Math.sin(a) * wob, z + H * .5 * (1 - Math.cos(a)), sides, k * .45)); }
      centre(cx, cy, z + H * .5); capBot(layers[0], [cx, cy, z], dk, 4); for (let k = 0; k < layers.length - 1; k++) band(layers[k], layers[k + 1], k === layers.length - 2 ? hi : k === 0 ? lo : cc, 4); capTop(layers[layers.length - 1], [cx, cy, z + H], hi, 4);
      { const la = rot + 2.1, lr = r * Sh.lobe, lx = cx + Math.cos(la) * r * .62, ly = cy + Math.sin(la) * r * .62, lz = z + H * .38; // the lobe
        const lring = (rr, zz, ph) => { const out = []; for (let i = 0; i < 5; i++) { const a = rot + ph + i / 5 * 6.283; out.push([lx + Math.cos(a) * rr, ly + Math.sin(a) * rr, zz]); } return out; };
        const A = lring(lr * .9, lz, 0), B = lring(lr * .75, lz + lr * 1.1, .6); centre(lx, ly, lz + lr * .6); capBot(A, [lx, ly, lz - lr * .45], dk, 4); band(A, B, cc, 4); capTop(B, [lx, ly, lz + lr * 1.55], hi, 4); } }
  }
  return { data: V.subarray(0, n * OUTDOOR_FLOATS), verts: n, outcrops, trees: trees.length };
}

// ---------------------------------------------------------------------------------------------- the heightfield
// How tall one of this tile's levels is drawn in Close View (OUTDOOR.terrain): a ground level, a great tree's, or a great
// building roof's own lift (the ordinary view's).
export function outdoorLevelHeight(t) { const T = OUTDOOR.terrain; return t?.canopy ? T.canopyLevel : t?.roofLift ? LIFT_PER_LEVEL * tileLiftScale(t) : T.level; }
export const outdoorPit = (t) => !!t && (t.chasm === true || OUTDOOR.pitKinds.test(String(t.kind || "")));
// A section's relief: each tile's top (in tiles of height), and each tile corner's height for the ramps. Cached per map and
// signature; pure. A pit's top is -pitDepth; water's is its bank's less waterDrop.
const RELIEFS = new WeakMap();
export function outdoorRelief(map) {
  if (!map || typeof map !== "object") return null; const sig = outdoorSignature(map), known = RELIEFS.get(map); if (known && known.sig === sig) return known;
  const w = Math.max(1, Number(map.width) || 32), tiles = map.tiles || [], h = Math.max(1, Number(map.height) || Math.floor(tiles.length / w)), T = OUTDOOR.terrain;
  const top = new Float32Array(w * h), ramp = new Uint8Array(w * h), corner = new Float32Array((w + 1) * (h + 1));
  for (let i = 0; i < w * h; i++) { const t = tiles[i], k = outdoorLevelHeight(t), e = Number(t?.elev) || 0;
    if (outdoorPit(t)) top[i] = -T.pitDepth; else if (t?.slope) { ramp[i] = 1; top[i] = (e - .5) * k; } else top[i] = e * k - (isWater(t) ? T.waterDrop : 0); }
  // a ramp's corners take the mean of the level tops round them, held between its foot and its head
  for (let cy = 0; cy <= h; cy++) for (let cx = 0; cx <= w; cx++) { let sum = 0, n = 0, lo = Infinity, hi = -Infinity;
    for (let j = -1; j <= 0; j++) for (let i = -1; i <= 0; i++) { const x = cx + i, y = cy + j; if (x < 0 || y < 0 || x >= w || y >= h) continue; const q = y * w + x;
      if (ramp[q]) { const t = tiles[q], k = outdoorLevelHeight(t), e = Number(t?.elev) || 0; lo = Math.min(lo, (e - 1) * k); hi = Math.max(hi, e * k); } else if (top[q] > -T.pitDepth + 1e-6) { sum += top[q]; n++; } }
    let z = n ? sum / n : (lo + hi) / 2; if (hi > -Infinity) z = Math.max(lo, Math.min(hi, n ? z : (lo + hi) / 2)); corner[cy * (w + 1) + cx] = Number.isFinite(z) ? z : 0; }
  const R = { sig, w, h, top, ramp, corner }; RELIEFS.set(map, R); return R;
}
// The ground's height under (x, y) for what stands there (0 over a pit: what crosses one flies or falls). Pure.
export function outdoorSurfaceZ(R, x, y) {
  if (!R) return 0; const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= R.w || ty >= R.h) return 0; const i = ty * R.w + tx;
  if (!R.ramp[i]) return R.top[i] < -1 ? 0 : Math.max(0, R.top[i]) + Math.min(0, R.top[i]);
  const fx = x - tx, fy = y - ty, W = R.w + 1, c = R.corner, a = c[ty * W + tx], b = c[ty * W + tx + 1], d = c[(ty + 1) * W + tx], e = c[(ty + 1) * W + tx + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
}
// The heightfield as triangles (OUTDOOR_FLOATS a vertex: position, normal, the tile's colour, kind: 0 a top, 1 a cliff
// face, 2 a pit's wall, 3 a pit's floor). Each tile's top, and a face down every edge where it stands above its neighbour
// (or the section's edge, down to the ground beyond). Pure.
// A great tree's branch or leaf pad: it floats, held by a limb from the trunk, with nothing under it. Pure.
export const outdoorFloating = (t) => !!t && t.canopy === true && t.kind !== "canopyTrunk" && !t.blocked && (Number(t.elev) || 0) > 0;
export function outdoorTerrainMesh(map, R = outdoorRelief(map)) {
  if (!R) return { data: new Float32Array(0), verts: 0 }; const { w, h, top, ramp, corner } = R, tiles = map.tiles || [], W = w + 1, Tr = OUTDOOR.terrain;
  if (w * h > Tr.maxTiles) return { data: new Float32Array(0), verts: 0 };
  const float = new Uint8Array(w * h); let floats = 0; for (let i = 0; i < w * h; i++) if (outdoorFloating(tiles[i])) { float[i] = 1; floats++; }
  const trunks = []; if (floats) for (let i = 0; i < w * h; i++) if (tiles[i]?.kind === "canopyTrunk") trunks.push(i);
  const V = new Float32Array((w * h * 30 + floats * 66) * OUTDOOR_FLOATS); let n = 0;
  const put = (p, nx, ny, nz, c, k) => { const o = n * OUTDOOR_FLOATS; V[o] = p[0]; V[o + 1] = p[1]; V[o + 2] = p[2]; V[o + 3] = nx; V[o + 4] = ny; V[o + 5] = nz; V[o + 6] = c[0]; V[o + 7] = c[1]; V[o + 8] = c[2]; V[o + 9] = k; n++; };
  const tri = (a, b, c, col, k) => { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } put(a, nx, ny, nz, col, k); put(b, nx, ny, nz, col, k); put(c, nx, ny, nz, col, k); };
  const zc = (i, x, y) => ramp[i] ? corner[y * W + x] : top[i];
  const SIDES = [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1], [-1, 0, 0, 1, 0, 0]]; // neighbour, then the edge's ends (counter-clockwise from above)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, t = tiles[i]; if (outdoorOutcrop(t)) continue; // an outcrop's own solid covers it
    const col = hex01(ATLAS_TILE_COLORS[t?.kind] || ATLAS_TILE_COLORS.blocked), pit = top[i] < -OUTDOOR.terrain.pitDepth + 1e-6;
    const a = [x, y, zc(i, x, y)], b = [x + 1, y, zc(i, x + 1, y)], c = [x + 1, y + 1, zc(i, x + 1, y + 1)], d = [x, y + 1, zc(i, x, y + 1)];
    tri(a, b, c, col, pit ? 3 : 0); tri(a, c, d, col, pit ? 3 : 0);
    const fl = float[i] === 1;
    if (fl) floatingParts(x, y, a, b, c, d, col);
    for (const [dx, dy, ax, ay, bx, by] of SIDES) { const X = x + dx, Y = y + dy, inside = X >= 0 && Y >= 0 && X < w && Y < h, j = Y * w + X;
      const za = zc(i, x + ax, y + ay), zb = zc(i, x + bx, y + by); let qa, qb; // the neighbour's height along the same edge
      if (!inside) { qa = qb = 0; } else if (outdoorOutcrop(tiles[j])) continue; else if (float[j]) { qa = qb = 0; } /* a branch beside: the face goes down to the ground behind it */ else { qa = zc(j, x + ax, y + ay); qb = zc(j, x + bx, y + by); }
      if (fl) { qa = Math.max(qa, za - Tr.deck); qb = Math.max(qb, zb - Tr.deck); } // a branch's edge is only its deck's thickness
      if (za <= qa + .005 && zb <= qb + .005) continue; const lowA = Math.min(qa, za), lowB = Math.min(qb, zb), k = Math.min(qa, qb) < -.5 ? 2 : 1, cc = inside && Math.min(qa, qb) < -.5 ? col : col;
      const P0 = [x + ax, y + ay, lowA], P1 = [x + bx, y + by, lowB], P2 = [x + bx, y + by, zb], P3 = [x + ax, y + ay, za];
      put(P0, dx, dy, 0, cc, k); put(P1, dx, dy, 0, cc, k); put(P2, dx, dy, 0, cc, k); put(P0, dx, dy, 0, cc, k); put(P2, dx, dy, 0, cc, k); put(P3, dx, dy, 0, cc, k); } }
  // a branch: its deck's underside, the shaded ground below it, and the limb that holds it, from the nearest trunk
  function floatingParts(x, y, a, b, c, d, col) {
    const dk = Tr.deck, bark = col.map((v) => v * .78), under = [a, b, c, d].map((p) => [p[0], p[1], p[2] - dk]);
    put(under[0], 0, 0, -1, bark, 1); put(under[2], 0, 0, -1, bark, 1); put(under[1], 0, 0, -1, bark, 1); put(under[0], 0, 0, -1, bark, 1); put(under[3], 0, 0, -1, bark, 1); put(under[2], 0, 0, -1, bark, 1);
    const g = [.32, .3, .24].map((v, k) => v * Tr.shade + (col[k] * .1)); put([x, y, 0], 0, 0, 1, g, 5); put([x + 1, y, 0], 0, 0, 1, g, 5); put([x + 1, y + 1, 0], 0, 0, 1, g, 5); put([x, y, 0], 0, 0, 1, g, 5); put([x + 1, y + 1, 0], 0, 0, 1, g, 5); put([x, y + 1, 0], 0, 0, 1, g, 5);
    let best = -1, bd = Infinity; for (const j of trunks) { const d2 = (j % w + .5 - x - .5) ** 2 + (Math.floor(j / w) + .5 - y - .5) ** 2; if (d2 < bd) { bd = d2; best = j; } }
    if (best < 0 || Math.sqrt(bd) > Tr.limbReach) return;
    const zt = (a[2] + b[2] + c[2] + d[2]) / 4 - dk, tip = [x + .5, y + .5, zt - .02], root = [best % w + .5, Math.floor(best / w) + .5, Math.max(.2, zt - Tr.limbRise)];
    limb(root, tip, Tr.limbRoot, Tr.limbTip, bark); }
  // a tapering square limb from p to q (half widths r0 and r1), its four sides
  function limb(p, q, r0, r1, col) {
    const ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], L = Math.hypot(ax, ay, az) || 1, fx = ax / L, fy = ay / L, fz = az / L;
    let ux = -fy, uy = fx, uz = 0; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul; if (ul < 1e-6) { ux = 1; uy = 0; }
    const vx = fy * uz - fz * uy, vy = fz * ux - fx * uz, vz = fx * uy - fy * ux; // up, across the limb
    const ring = (o, r) => [[o[0] + (ux + vx) * r, o[1] + (uy + vy) * r, o[2] + (uz + vz) * r], [o[0] + (-ux + vx) * r, o[1] + (-uy + vy) * r, o[2] + (-uz + vz) * r], [o[0] + (-ux - vx) * r, o[1] + (-uy - vy) * r, o[2] + (-uz - vz) * r], [o[0] + (ux - vx) * r, o[1] + (uy - vy) * r, o[2] + (uz - vz) * r]];
    const A = ring(p, r0), B = ring(q, r1), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, mz = (p[2] + q[2]) / 2;
    for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4, P = [A[k], A[k1], B[k1], B[k]]; let nx = (P[0][0] + P[2][0]) / 2 - mx, ny = (P[0][1] + P[2][1]) / 2 - my, nz = (P[0][2] + P[2][2]) / 2 - mz; const d = nx * fx + ny * fy + nz * fz; nx -= d * fx; ny -= d * fy; nz -= d * fz; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      put(P[0], nx, ny, nz, col, 1); put(P[1], nx, ny, nz, col, 1); put(P[2], nx, ny, nz, col, 1); put(P[0], nx, ny, nz, col, 1); put(P[2], nx, ny, nz, col, 1); put(P[3], nx, ny, nz, col, 1); } }
  return { data: V.subarray(0, n * OUTDOOR_FLOATS), verts: n };
}

// ---------------------------------------------------------------------------------------------- the props
// A prop the solids draw instead of its card: a kind with a recipe, standing in the world (not hidden, not a strange one
// waiting to be used, not carried). Pure.
export function outdoorPropObject(o) {
  if (!o || typeof o !== "object" || !OUTDOOR.props.kinds[o.kind] || o.strange || o.carried || o.hidden === true) return false;
  if (o.kind === "cache" && o.state === "hidden") return false;
  return Number.isFinite(Number(o.x)) && Number.isFinite(Number(o.y));
}
// What the props depend on: each one's kind, place and state (a cache opened, a rock broken). A number; nothing allocated.
export function outdoorPropSignature(map, seen = null) {
  let a = 0; const objs = map?.objects || [];
  for (let i = 0; i < objs.length; i++) { const o = objs[i]; if (!outdoorPropObject(o) || (seen && !seen(Math.floor(o.x + .5), Math.floor(o.y + .5)))) continue; const st = String(o.state || ""), op = OUTDOOR.props.opened.test(st) ? 1 : OUTDOOR.props.rubble.test(st) ? 2 : 0;
    a = (a + Math.imul(Math.round(o.x * 16) + 7, 73856093) + Math.imul(Math.round(o.y * 16) + 3, 19349663) + Math.imul(op + 1 + o.kind.length * 4, 83492791)) | 0; }
  return a >>> 0;
}
// an eight-cornered solid (bottom four counter-clockwise from above, then the top four over them): six faces
function hexa(V, n, P, col, mat, top = col) {
  let x = 0, y = 0, z = 0; for (const p of P) { x += p[0]; y += p[1]; z += p[2]; } centre(x / 8, y / 8, z / 8);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; n = pushQuad(V, n, P[i], P[j], P[j + 4], P[i + 4], col, mat); }
  n = pushQuad(V, n, P[4], P[5], P[6], P[7], top, mat);
  if (P[0][2] > .005 || P[1][2] > .005) n = pushQuad(V, n, P[3], P[2], P[1], P[0], col, mat); // a bottom only when it is off the ground
  return n;
}
// A frame for a prop: local (u along its front, v toward its back, w up) to the world, turned by `rot` about its foot.
const FRAME = { x: 0, y: 0, z: 0, c: 1, s: 0 };
const at3 = (u, v, w) => [FRAME.x + u * FRAME.c - v * FRAME.s, FRAME.y + u * FRAME.s + v * FRAME.c, FRAME.z + w];
// a box in the frame: centred at (u, v), from w0 up h; half widths a (along u) and b (along v); the top inset by `taper`
function pbox(V, n, u, v, w0, a, b, h, col, mat, taper = 0, top = col) {
  const ta = a * (1 - taper), tb = b * (1 - taper);
  return hexa(V, n, [at3(u - a, v - b, w0), at3(u + a, v - b, w0), at3(u + a, v + b, w0), at3(u - a, v + b, w0),
    at3(u - ta, v - tb, w0 + h), at3(u + ta, v - tb, w0 + h), at3(u + ta, v + tb, w0 + h), at3(u - ta, v + tb, w0 + h)], col, mat, top);
}
// a lumpy faceted stone: rings of `sides` points, each pushed in or out by the hash, round (u, v) in the frame
function lump(V, n, u, v, w0, r, h, sides, seed, col, mat, top = col) {
  const rings = [[.92, 0], [1, .38], [.7, .78]], pts = rings.map(([k, z], ri) => { const out = []; for (let i = 0; i < sides; i++) { const a = i / sides * 6.2832 + ri * .4, j = .78 + .4 * outdoorHash(seed, i, ri + 41);
    out.push(at3(u + Math.cos(a) * r * k * j, v + Math.sin(a) * r * k * j * .86, w0 + h * z * (ri ? .85 + .3 * outdoorHash(seed, i, ri + 53) : 1))); } return out; });
  const apex = at3(u + (outdoorHash(seed, 1, 61) - .5) * r * .4, v + (outdoorHash(seed, 2, 61) - .5) * r * .4, w0 + h);
  { const c = at3(u, v, w0 + h * .45); centre(c[0], c[1], c[2]); }
  for (let k = 0; k < 2; k++) for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; n = pushQuad(V, n, pts[k][i], pts[k][j], pts[k + 1][j], pts[k + 1][i], k ? top : col, mat); }
  for (let i = 0; i < sides; i++) n = pushTri(V, n, pts[2][i], pts[2][(i + 1) % sides], apex, top, mat);
  return n;
}
const PROP_RECIPES = {
  // a boulder of the kind's stone, lichen-pale on top (sealed); moved or broken: three stones in a little scatter
  boulder(V, n, o, C, k) { if (OUTDOOR.props.rubble.test(String(o.state || ""))) { for (let i = 0; i < 3; i++) n = lump(V, n, (outdoorHash(k, i, 3) - .5) * .6, (outdoorHash(k, i, 5) - .5) * .4, 0, .12 + .06 * outdoorHash(k, i, 7), .12 + .08 * outdoorHash(k, i, 9), 5, k + i, C[1], 0, C[0]); return n; }
    return lump(V, n, 0, 0, 0, .36 + .08 * outdoorHash(k, 1, 11), .44 + .16 * outdoorHash(k, 2, 13), 7, k, C[0], 0, C[2]); },
  // a strongbox: a body with iron bands and a gold hasp; the lid domed, or thrown back when opened
  chest(V, n, o, C, k) { const op = OUTDOOR.props.opened.test(String(o.state || "")), a = .3, b = .2, h = .26;
    n = pbox(V, n, 0, 0, 0, a, b, h, C[0], 7); n = pbox(V, n, -a * .62, 0, 0, .025, b + .012, h + .012, C[1], 8); n = pbox(V, n, a * .62, 0, 0, .025, b + .012, h + .012, C[1], 8);
    if (op) { n = hexa(V, n, [at3(-a, b, h), at3(a, b, h), at3(a, b + .04, h), at3(-a, b + .04, h), at3(-a, b - .02, h + .27), at3(a, b - .02, h + .27), at3(a, b + .1, h + .26), at3(-a, b + .1, h + .26)], C[0], 7);
      n = pbox(V, n, 0, 0, h - .03, a - .03, b - .03, .02, [.06, .05, .04], 7); } // the open lid leaning back, and the dark inside
    else { n = pbox(V, n, 0, 0, h, a + .01, b + .01, .07, C[0], 7, .18, C[0]); n = pbox(V, n, 0, -b - .012, h - .1, .045, .012, .12, C[2], 8); }
    return n; },
  // a supply crate: slats and a lid of rough planks, a bundle tied on top
  crate(V, n, o, C, k) { const op = OUTDOOR.props.opened.test(String(o.state || "")), a = .3, b = .26, h = .34;
    n = pbox(V, n, 0, 0, 0, a, b, h, C[0], 5); for (const w of [.05, h - .06]) n = pbox(V, n, 0, 0, w, a + .015, b + .015, .05, C[1], 5);
    for (const u of [-a, a]) for (const v of [-b, b]) n = pbox(V, n, u * .96, v * .96, 0, .03, .03, h + .01, C[1], 5);
    if (!op) n = pbox(V, n, .04, .02, h, .18, .1, .1, C[2], 7, .25); return n; },
  // a weapons cache: a long chest, steel fittings, a hilt laid across it
  armory(V, n, o, C, k) { const op = OUTDOOR.props.opened.test(String(o.state || "")), a = .38, b = .18, h = .24;
    n = pbox(V, n, 0, 0, 0, a, b, h, C[0], 5); n = pbox(V, n, 0, 0, h, a + .01, b + .01, .05, C[1], 5, .1);
    for (const u of [-a * .7, 0, a * .7]) n = pbox(V, n, u, 0, 0, .02, b + .012, h + .055, C[2], 8);
    if (!op) { n = pbox(V, n, .02, 0, h + .05, .3, .025, .02, C[2], 8); n = pbox(V, n, -.2, 0, h + .05, .02, .09, .03, C[1], 8); }
    return n; },
  // a shrine: a stepped plinth, a carved column, and its ring of light above
  shrine(V, n, o, C, k) { n = pbox(V, n, 0, 0, 0, .34, .3, .1, C[1], 1); n = pbox(V, n, 0, 0, .1, .24, .21, .08, C[1], 1, .1);
    n = pbox(V, n, 0, 0, .18, .07, .07, .44, C[0], 1, .2); n = pbox(V, n, 0, 0, .62, .1, .1, .05, C[0], 1);
    const R = .22, z = .9, seg = 8; for (let i = 0; i < seg; i++) { if (i === 6) continue; const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, t = .028;
      n = hexa(V, n, [at3(Math.cos(a0) * (R - t), -t, z + Math.sin(a0) * (R - t)), at3(Math.cos(a1) * (R - t), -t, z + Math.sin(a1) * (R - t)), at3(Math.cos(a1) * (R - t), t, z + Math.sin(a1) * (R - t)), at3(Math.cos(a0) * (R - t), t, z + Math.sin(a0) * (R - t)),
        at3(Math.cos(a0) * (R + t), -t, z + Math.sin(a0) * (R + t)), at3(Math.cos(a1) * (R + t), -t, z + Math.sin(a1) * (R + t)), at3(Math.cos(a1) * (R + t), t, z + Math.sin(a1) * (R + t)), at3(Math.cos(a0) * (R + t), t, z + Math.sin(a0) * (R + t))], C[2], 9); }
    return n; },
  // a waystone pylon: a pale shaft on a dark footing, a lit band near its top and a crown stone
  pylon(V, n, o, C, k) { n = pbox(V, n, 0, 0, 0, .3, .3, .14, C[1], 1, .15); n = pbox(V, n, 0, 0, .14, .09, .09, .78, C[0], 2, .25);
    n = pbox(V, n, 0, 0, .7, .085, .085, .07, C[2], 9); n = lump(V, n, 0, 0, .92, .12, .2, 5, k, C[0], 2); return n; },
  // a weathered standing stone, leaning a little, with a lighter face carved into it
  standingStone(V, n, o, C, k) { const lean = (outdoorHash(k, 3, 17) - .5) * .12;
    n = hexa(V, n, [at3(-.2, -.12, 0), at3(.2, -.12, 0), at3(.2, .12, 0), at3(-.2, .12, 0), at3(-.15 + lean, -.09, .95), at3(.13 + lean, -.09, .86), at3(.13 + lean, .09, .86), at3(-.15 + lean, .09, .95)], C[0], 0, C[2]);
    n = pbox(V, n, lean * .5, -.125, .45, .11, .006, .22, C[2], 0); n = lump(V, n, .22, .1, 0, .1, .1, 5, k, C[1], 0); return n; },
  // the Watcher's tomb or shrine: a pale sarcophagus on a dark plinth, its headstone carved with the eye, a halo over it
  // until it is opened (then the lid lies aside and the halo is gone)
  tomb(V, n, o, C, k) { const op = OUTDOOR.props.opened.test(String(o.state || ""));
    n = pbox(V, n, 0, 0, 0, .42, .3, .1, C[1], 1, .05); n = pbox(V, n, 0, .02, .1, .34, .22, .26, C[0], 1, .04);
    n = op ? pbox(V, n, .3, .05, .1, .3, .2, .05, C[0], 1, .05) : pbox(V, n, 0, .02, .36, .36, .24, .06, C[0], 1, .12);
    n = pbox(V, n, 0, .3, .1, .3, .05, .62, C[0], 1, .1); n = pbox(V, n, 0, .245, .5, .09, .008, .09, C[2], 9);
    if (!op) { const R = .3, z = 1.22, seg = 8; for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, t = .025;
      n = hexa(V, n, [at3(Math.cos(a0) * (R - t), Math.sin(a0) * (R - t), z - t), at3(Math.cos(a1) * (R - t), Math.sin(a1) * (R - t), z - t), at3(Math.cos(a1) * (R + t), Math.sin(a1) * (R + t), z - t), at3(Math.cos(a0) * (R + t), Math.sin(a0) * (R + t), z - t),
        at3(Math.cos(a0) * (R - t), Math.sin(a0) * (R - t), z + t), at3(Math.cos(a1) * (R - t), Math.sin(a1) * (R - t), z + t), at3(Math.cos(a1) * (R + t), Math.sin(a1) * (R + t), z + t), at3(Math.cos(a0) * (R + t), Math.sin(a0) * (R + t), z + t)], C[2], 9); } }
    return n; },
  // a way down: a stone portal, its threshold and the dark of the stair beyond
  portal(V, n, o, C, k) { n = pbox(V, n, -.36, 0, 0, .09, .14, .95, C[0], 1, .08); n = pbox(V, n, .36, 0, 0, .09, .14, .95, C[0], 1, .08);
    n = pbox(V, n, 0, 0, .95, .48, .17, .15, C[0], 1, .05); n = pbox(V, n, 0, 0, 1.1, .3, .12, .08, C[2], 1, .2);
    n = pbox(V, n, 0, .04, 0, .27, .1, .9, [.03, .03, .04], 7); n = pbox(V, n, 0, -.2, 0, .32, .08, .04, C[1], 1); return n; },
};
// The props of a section (or a floor) as solids, in the same vertex layout as outdoorMesh. zAt(x, y): the floor's height
// there (0 outdoors). Returns { data, verts, props, objects } (objects: the props drawn, for their shadows). Pure.
export function outdoorProps(map, zAt = null, seen = null) {
  const P = OUTDOOR.props, list = (map?.objects || []).filter((o) => outdoorPropObject(o) && (!seen || seen(Math.floor(o.x + .5), Math.floor(o.y + .5)))).slice(0, P.max);
  const V = new Float32Array(list.length * P.maxVerts * OUTDOOR_FLOATS); let n = 0, kept = 0; const objects = [];
  for (const o of list) { const K = P.kinds[o.kind], C = K.colors.map(hex01), k = (Math.round(o.x * 4) * 131 + Math.round(o.y * 4) * 7919) | 0, recipe = PROP_RECIPES[K.recipe];
    const x = Number(o.x) + .5, y = Number(o.y) + .62, rot = Math.PI + (outdoorHash(k, 5, 19) - .5) * .5; // the front faces the bottom of the map, as the ordinary view draws it
    FRAME.x = x; FRAME.y = y; FRAME.z = zAt ? Number(zAt(x, y)) || 0 : 0; FRAME.c = Math.cos(rot); FRAME.s = Math.sin(rot);
    const n0 = n; n = recipe(V, n, o, C, k); if (n - n0 > P.maxVerts) throw new Error(`prop ${o.kind} over its vertex bound`); kept++; objects.push(o); }
  return { data: V.subarray(0, n * OUTDOOR_FLOATS), verts: n, props: kept, objects };
}

// ---------------------------------------------------------------------------------------------- the buildings
// The houses of a section (shelters and hamlets: tiles whose `structure` is a shack's or a district's wall, inside or door,
// grouped by buildingId). Returns { data, verts, walls (vertices of walls, first), roofs: [{ id, start, count, x0, y0, x1, y1 }] }:
// the walls of every house first, then each house's roof as its own run, so a roof can be left out while the rest is drawn.
// Pure.
export function outdoorBuildings(map, R = null) { // R: the relief (each wall stands on its tile's level, a roof on its house's first)
  const B = OUTDOOR.buildings, w = Math.max(1, Number(map?.width) || 32), tiles = map?.tiles || [], h = Math.max(1, Number(map?.height) || Math.floor(tiles.length / w));
  const houses = new Map();
  for (let i = 0; i < w * h; i++) { const t = tiles[i]; if (!t?.buildingId || !B.structures.test(String(t.structure || ""))) continue; let H = houses.get(t.buildingId);
    if (!H) { if (houses.size >= B.max) continue; H = { id: t.buildingId, cells: [], x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, look: t.shelterFamily || t.districtStyle || "" }; houses.set(t.buildingId, H); }
    const x = i % w, y = Math.floor(i / w); H.cells.push(i); H.x0 = Math.min(H.x0, x); H.y0 = Math.min(H.y0, y); H.x1 = Math.max(H.x1, x + 1); H.y1 = Math.max(H.y1, y + 1); }
  if (!houses.size) return { data: new Float32Array(0), verts: 0, walls: 0, roofs: [] };
  const objs = new Map(); for (const o of map?.objects || []) if (o && houses.has(o.id)) objs.set(o.id, o);
  let cells = 0; for (const H of houses.values()) cells += H.cells.length; // the bound: a tile's walls and lintel (5 x 36), its roof (two quads) and four edge faces in two parts, a ridge a house
  const V = new Float32Array((cells * B.perTile + houses.size * 36) * OUTDOOR_FLOATS); let n = 0; const roofs = [];
  const lookOf = (H) => { const o = objs.get(H.id); return B.looks[o?.family] || B.looks[o?.districtStyle] || B.looks[H.look] || B.looks.other; };
  const inHouse = (H, x, y) => x >= 0 && y >= 0 && x < w && y < h && tiles[y * w + x]?.buildingId === H.id;
  const T = B.wall.t, Hw = B.wall.h, side = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };
  // the walls: a slab along each wall side, inside its tile; a lintel over a door
  for (const H of houses.values()) { const L = lookOf(H), wc = hex01(L.wall), tc = hex01(L.trim);
    for (const i of H.cells) { const t = tiles[i], x = i % w, y = Math.floor(i / w), w0 = n;
      const slab = (dx, dy, z0, z1, col, top) => { // the wall on side (dx, dy) of tile (x, y), from z0 to z1
        const xa = dx > 0 ? x + 1 - T : x, xb = dx < 0 ? x + T : x + 1, ya = dy > 0 ? y + 1 - T : y, yb = dy < 0 ? y + T : y + 1;
        n = hexa(V, n, [[xa, ya, z0], [xb, ya, z0], [xb, yb, z0], [xa, yb, z0], [xa, ya, z1], [xb, ya, z1], [xb, yb, z1], [xa, yb, z1]], col, L.mat, top); };
      for (const sd of t.wallSides || []) { const d = side[sd]; if (d) slab(d[0], d[1], 0, Hw, wc, tc); }
      if (t.doorSide && side[t.doorSide]) { const d = side[t.doorSide]; slab(d[0], d[1], B.wall.lintel, Hw, tc, tc); }
      const dz = R ? Math.max(0, R.top[i]) : 0; if (dz) for (let v = w0; v < n; v++) V[v * OUTDOOR_FLOATS + 2] += dz; }
    }
  const walls = n;
  // the roofs: one run a house. Gable: the height over (X, Y) falls from the ridge (the long axis' middle line) to the eaves.
  for (const H of houses.values()) { const L = lookOf(H), rc = hex01(L.roof), tc = hex01(L.trim), o = objs.get(H.id), start = n;
    const flat = o?.roofProfile === "flat" || o?.roofProfile === "stepped", alongX = H.x1 - H.x0 >= H.y1 - H.y0, half = (alongX ? H.y1 - H.y0 : H.x1 - H.x0) / 2, mid = alongX ? (H.y0 + H.y1) / 2 : (H.x0 + H.x1) / 2;
    const zr = (X, Y) => flat ? Hw + B.flat : Hw + Math.min(B.ridge, Math.max(0, half - Math.abs((alongX ? Y : X) - mid)) * B.pitch);
    const e = B.eave;
    for (const i of H.cells) { const x = i % w, y = Math.floor(i / w);
      // the roof over this tile, reaching `e` past its edges where the house ends (the eaves overhang)
      const ox0 = inHouse(H, x - 1, y) ? 0 : e, ox1 = inHouse(H, x + 1, y) ? 0 : e, oy0 = inHouse(H, x, y - 1) ? 0 : e, oy1 = inHouse(H, x, y + 1) ? 0 : e;
      const xa = x - ox0, xb = x + 1 + ox1, ya = y - oy0, yb = y + 1 + oy1, za = (X, Y) => zr(Math.min(Math.max(X, H.x0), H.x1), Math.min(Math.max(Y, H.y0), H.y1)) - (X < H.x0 || X > H.x1 || Y < H.y0 || Y > H.y1 ? e * B.pitch : 0);
      // a gable crossing this tile is split at the ridge so both slopes stay planar
      const r = mid, segs = []; if (!flat && (alongX ? (ya < r && yb > r) : (xa < r && xb > r))) { if (alongX) segs.push([xa, xb, ya, r], [xa, xb, r, yb]); else segs.push([xa, r, ya, yb], [r, xb, ya, yb]); } else segs.push([xa, xb, ya, yb]);
      for (const [p0, p1, q0, q1] of segs) { centre((p0 + p1) / 2, (q0 + q1) / 2, -1); n = pushQuad(V, n, [p0, q0, za(p0, q0)], [p1, q0, za(p1, q0)], [p1, q1, za(p1, q1)], [p0, q1, za(p0, q1)], rc, 7); }
      // the gable ends and fascia: where the house ends, a face from the wall's top up to the roof's edge
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { if (inHouse(H, x + dx, y + dy)) continue;
        const ax = dx > 0 ? x + 1 : x, bx = dx < 0 ? x : x + 1, ay = dy > 0 ? y + 1 : y, by = dy < 0 ? y : y + 1, A = dx !== 0 ? [ax, y] : [x, ay], Bp = dx !== 0 ? [ax, y + 1] : [x + 1, ay];
        const pts = [A, Bp]; if (!flat && (alongX ? (dx !== 0 && A[1] < r && Bp[1] > r) : (dy !== 0 && A[0] < r && Bp[0] > r))) pts.splice(1, 0, alongX ? [ax, r] : [r, ay]);
        centre(x + .5, y + .5, Hw * .5); for (let k = 0; k < pts.length - 1; k++) { const P0 = pts[k], P1 = pts[k + 1], z0 = zr(P0[0], P0[1]), z1 = zr(P1[0], P1[1]); if (z0 - Hw < .01 && z1 - Hw < .01) continue;
          const fc = flat ? tc : hex01(L.wall), a0 = [P0[0], P0[1], Hw], a1 = [P1[0], P1[1], Hw];
          n = z0 - Hw < .01 ? pushTri(V, n, a0, a1, [P1[0], P1[1], z1], fc, L.mat) : z1 - Hw < .01 ? pushTri(V, n, a0, a1, [P0[0], P0[1], z0], fc, L.mat) : pushQuad(V, n, a0, a1, [P1[0], P1[1], z1], [P0[0], P0[1], z0], fc, L.mat); } } }
    if (!flat) { const len = alongX ? [H.x0 - e, H.x1 + e] : [H.y0 - e, H.y1 + e], z = Hw + Math.min(B.ridge, half * B.pitch); // the ridge beam
      FRAME.x = alongX ? (len[0] + len[1]) / 2 : mid; FRAME.y = alongX ? mid : (len[0] + len[1]) / 2; FRAME.z = z - .03; FRAME.c = alongX ? 1 : 0; FRAME.s = alongX ? 0 : 1; n = pbox(V, n, 0, 0, 0, (len[1] - len[0]) / 2, .05, .08, tc, 5); }
    const dz = R ? Math.max(0, R.top[H.cells[0]]) : 0; if (dz) for (let v = start; v < n; v++) V[v * OUTDOOR_FLOATS + 2] += dz;
    roofs.push({ id: H.id, start, count: n - start, x0: H.x0, y0: H.y0, x1: H.x1, y1: H.y1 }); }
  return { data: V.subarray(0, n * OUTDOOR_FLOATS), verts: n, walls, roofs };
}

// The outdoor scene of a section for the GPU: the sky, the per-tile ground and the static solids, rebuilt only when its
// signature changes (a dig, a block, a felled tree). Cached per map.
const SCENES = new WeakMap();
export function outdoorScene(map, relief = false) { // relief: build the heightfield and stand the solids on it (the GPU can draw it)
  if (!map || typeof map !== "object") return null; const sig = outdoorSignature(map), psig = outdoorPropSignature(map), sky = outdoorSky(map); let sc = SCENES.get(map);
  if (sc && sc.sig === sig && sc.psig === psig && sc.sky === sky && sc.relief === relief) return sc;
  const same = sc && sc.sig === sig && sc.sky === sky && sc.relief === relief, R = relief ? outdoorRelief(map) : null, terrain = same ? sc.terrain : outdoorTerrainData(map), mesh = same ? sc.mesh : outdoorMesh(map, sky, R), houses = same ? sc.houses : outdoorBuildings(map, R);
  const props = outdoorProps(map, R ? (x, y) => outdoorSurfaceZ(R, x, y) : null), ground = same ? sc.ground : R ? outdoorTerrainMesh(map, R) : null;
  sc = { sig, psig, sky, relief, R, terrain, mesh, props, houses, ground, solids: joinSolids(mesh, props, houses), key: {} }; SCENES.set(map, sc); return sc; // key: a fresh object each rebuild (the GPU side uploads when it changes)
}
// outcrops, trees, props and houses in one buffer, the roofs last (one draw call, or one a run when a roof is left out).
// housesAt: where the houses begin in it (a roof's start is counted from there); roofStart: where the roofs begin.
function joinSolids(a, b, c) { const verts = a.verts + b.verts + c.verts, housesAt = a.verts + b.verts; if (verts === a.verts) return { data: a.data, verts, housesAt, roofStart: verts };
  const data = new Float32Array(verts * OUTDOOR_FLOATS); data.set(a.data, 0); data.set(b.data, a.verts * OUTDOOR_FLOATS); data.set(c.data, housesAt * OUTDOOR_FLOATS); return { data, verts, housesAt, roofStart: housesAt + c.walls }; }
// The props of an interior floor for the GPU (the same solids, on the floor's own heights), rebuilt only when one changes.
const PROP_SCENES = new WeakMap();
export function propScene(map, zAt = null, seen = null) { // seen: what the fog of war has shown (null: everything); an unseen prop is not built
  if (!map || typeof map !== "object") return null; const psig = outdoorPropSignature(map, seen); let sc = PROP_SCENES.get(map);
  if (sc && sc.psig === psig) return sc; const props = outdoorProps(map, zAt, seen);
  sc = { psig, props, solids: props, key: {} }; PROP_SCENES.set(map, sc); return sc;
}
