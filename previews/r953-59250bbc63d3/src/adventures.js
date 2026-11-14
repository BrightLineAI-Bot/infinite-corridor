// Overworld adventures (Tim, 2026-11-11: "Pentagons must be LARGE, MASSIVE... rare finds with really great rewards at the
// end"; "winding paths and rooms, NOT one hub room with 3–5 corridors each ending in a room. Many different ways to traverse
// the place: loops, interconnection, shortcuts that open back to the hub, layered routes, encouraging exploration";
// "self-contained worlds... built from deterministic components that can later be reused as building blocks for dungeons,
// arcologies and the Deep"; a Waystone hub that is "a respawn and rest point"; districts that may mix themes, "somewhat
// cohesive, but can be somewhat surprising"; the theme "RANDOM (seeded), not tied to the surrounding region"; every
// adventure "finishable in the standard view").
//
// This module holds the reusable parts, all pure and deterministic, with no knowledge of the Pentagon:
// - ADVENTURE_THEMES: a theme is a data row (standard-view tiles, palette, Close View hints, names, creatures);
// - ADVENTURE_AREAS: area templates (street, plaza, court, vista, gallery, undercroft, side, keep, waystone), each a size,
//   a guard count and the knobs of its floor plan;
// - ADVENTURE_LINKS: the connectors between areas (passage, stair, bridge, tunnel) and the one-way shortcut gates;
// - composeDistrict: a district's graph of areas, winding and looped, with layered routes, side areas and a vista;
// - layAdventureArea: an area's floor plan: plazas joined by winding paths with loops, every door reachable on foot;
// - adventureCycles / edgeDisjointRoutes / solveAdventurePlan: the proofs the tests (and later callers) use.
// The Pentagon's version 11 (pentagon.ts) is the first user: its districts, Waystone hub and themed chambers come from here.
import { hashSeed, rng, byHash } from "./random.js?v=r953-59250bbc63d3";

// Generation is version-pinned through the Pentagon version that uses it (pentagon.ts; atlas `pentVersion`). `live`: whether
// genuinely new Pentagons adopt it (game.ts recoverPentagonVersion); a Pentagon already pinned keeps its version either way.
export const ADVENTURE_PENTAGON = {
  version: 11, live: true,
  // Size classes: a Pentagon is "grand" or, rarely, "vast" (more rows a district, a second Waystone deep in).
  sizes: {
    grand: { weight: 70, rows: [3, 4], width: [1, 3], sides: [1, 2], waystones: 1 },
    vast: { weight: 30, rows: [4, 5], width: [2, 3], sides: [1, 3], waystones: 2 },
  },
  lateral: .55, diagonal: .35, // a district's chance of a side-to-side way within a row, and of a second way on to the next row
  upper: .75, lower: .6, // chances of a high gallery route and a low undercroft route (at least one is always laid)
  cross: .55, minCross: 2, // chance of a way across from one district into the next (beyond the ring); at least this many
  vistaRow: 1, // the row (from the front) a district's vista may stand on first
  trials: 3, // districts whose keep holds a trial's lord
  accent: { share: .4, max: 2 }, // districts given the accent theme instead of the primary (at most `max`)
  dread: { hub: .12, front: .3, perRow: .05, upper: -.04, lower: .08, max: .7 },
  waystone: {
    name: "The Waystone", deepName: "A Waystone, deep in",
    lore: "A standing stone, waist high, its face worn smooth by hands. It is warm, and it remembers whoever rests against it.",
    rest: "You rest against the Waystone. Your wounds close; if you fall within these walls, you will wake here.",
    again: "You rest against the Waystone again. Your wounds close.",
    woke: "Felled — you wake against the Waystone, its warmth at your back. Nothing carried was lost.",
    journal: "A Waystone in the Pentagon: rest against it, and a fall within these walls wakes you there.",
    notice: "WAYSTONE", detail: "rest point · you will wake here",
    heal: true, draughts: 2, // a rest fills health and stamina, and tops restorative draughts up to this many
    // Tim, 2026-11-11: "Dark Souls style": every rest brings the Pentagon's ordinary creatures back (never a boss, lord, keeper,
    // warden or the Regent, nor a trial chamber's; keys, levers, shortcuts and caches stay as they are). The base history counts
    // the rests (`advRespawn`); a chamber left before the latest rest is filled again when you next come in (game.ts loadArea).
    respawn: true, risen: "Behind you, in the halls you cleared, things stir and stand again.",
    // and in a vast Pentagon, travel between the Waystones you have rested at (`advWaystones` on the base history)
    travel: (name) => `Travel · ${name}`, travelled: (name) => `The stone's warmth pulls at you, and you stand against ${name}.`,
  },
  cache: { name: "A district cache", lore: "A chest left behind by whoever held this ward last." },
  hub: { size: [47, 43], name: "The Waystone Hall" },
  // Grand halls (pentagon-halls.ts: murals, sigils, backdrops) come back in v11 rebuilt for the camera (Tim, 2026-11-11): each
  // type laid larger (`size`), keeping only `columns` of its columns (a share, by hash) so the floor stays open; stands and shafts
  // as laid (a shaft is an open drop, which never stops the camera's boom).
  // The adventure creatures (adventure-creatures.ts, release 894): the share of a v11 chamber's ordinary guard slots given to its
  // theme's own creatures (by `creatures.module`; picked and placed by that module; scaled by Game.scaleToRegion).
  creatures: { share: .5 },
  // The Watcher's sigil worked into the floors as a large mosaic (Tim, 2026-11-11: "we can incorporate some of the Watcher's
  // sigils into the Pentagon mosaic floors"): the sigil of the tombs and shrines (watcher.ts SIGIL_CELLS, inlaySigil with its
  // tessera border), inlaid in every grand hall that has room (none already carries one), every district keep and a share of
  // the plazas and courts, tinted from the ward's theme light. Floor marks only (`tile.sigil`, `tile.sigilTint`): no collision,
  // no objects; drawn with the ground (renderer.ts sigilInlay, cached), and in Close View from its floor data.
  mosaics: { hall: 1, keep: 1, plaza: .5, court: .5, vista: .3, waystone: 1, margin: 0 }, // margin: clear tiles round the sigil's border
  halls: { size: { ballroom: [55, 41], arena: [51, 45], gallery: [59, 33], colonnade: [53, 41], pitGallery: [51, 43] }, columns: .25 },
  // The camera (Tim, 2026-11-11: "Rather than making the camera have less view in the Pentagon, we should make the Pentagon areas
  // wider so there's more view... The camera view is essential"): Close View's wide boom hangs `boom` tiles behind the Wayfarer and
  // keeps `pad` off a wall to either side (close-view.ts boomLength; drops do not stop it). A walkable tile is clear when it stands
  // on a walking line (a heading and its opposite, `headings` round) along which the whole boom fits behind the Wayfarer walking either
  // way. In the open templates (every one but the
  // `cramped` ones: an undercroft's maze and a side room, deliberate exceptions) at least `share` of the walkable tiles are clear,
  // and at least `least` in each template. (The last 5 tiles before any wall you walk away from always pull the boom in.)
  camera: { boom: 5, pad: .32, step: .1, headings: 16, share: .7, least: .6, cramped: ["undercroft", "side"] },
  maxArea: { w: 64, h: 64, tiles: 3100 }, // no area larger (phone budget)
};

// ------------------------------------------------------------------------------------------------ themes
// `since`: the adventure Pentagon version a theme first appears in (null: written, not yet enabled). `tiles` are tile kinds the
// standard view already draws (renderer.ts PAL / paintBuildingTile) and Close View already shades (never one Close View counts as
// open air, close-view.ts OPEN_AIR_KINDS, such as a labyrinth court's yardGrass: these are indoors); `remap` turns the keep
// style's kinds (great-buildings.ts layFloorV3, pentagon-halls.ts) into the theme's for ring chambers and halls. `creatures`:
// `roster` existing kinds; `newcomers` [{ kind, since }]: the hook for creatures built for these worlds; a newcomer joins the
// roster only in adventure Pentagons of version `since` or later, so a Pentagon already generated keeps its guards. `module`: the
// theme's id in the adventure creatures module (adventure-creatures.ts ADVENTURE_CREATURES: tomb, verdantRuin, ashWaste), the
// key its creatures are wired by (their spawns go through Game.scaleToRegion); `adventureCreatureTheme` reads it.
const remap = (wall, under, a, b, c, low) => ({ keepWall: wall, cellarWall: under, mosaicFloor: a, flagFloor: b, carpetFloor: c, plankFloor: b, tileFloor: c, cellarFloor: low });
export const ADVENTURE_THEMES = {
  tomb: { name: "Tomb", since: 11, weight: 1,
    palette: { stone: "#4a443b", floor: "#5a5650", light: "#d8a85a", fog: "#14110e" },
    tiles: { wall: "keepWall", under: "cellarWall", path: "flagFloor", floor: ["mosaicFloor", "carpetFloor"], accent: "carpetFloor", low: "cellarFloor" },
    remap: remap("keepWall", "cellarWall", "mosaicFloor", "flagFloor", "carpetFloor", "cellarFloor"),
    cv: { fog: "#14110e", backdrop: "dimDome", kit: "tomb" },
    landmark: { name: "the Heart's well", lore: "Far below the terrace, the Heart's well opens in the central court: a ring of black stone that swallows the lamplight." },
    creatures: { module: "tomb", roster: ["weepingSaint", "hangedChoir", "graveLantern", "pallidCrawler", "mirrorShade", "ashling"], newcomers: [] },
    bosses: ["weepingSaint", "hangedChoir", "amalgam", "mirrorShade", "graveLantern", "pallidCrawler"],
    wards: ["The Ossuary Ward", "The Ward of Lamps", "The Mourners' Ward", "The Sepulchre Ward"],
    areas: { street: ["Lamp Row", "The Bier Walk", "Mourners' Lane", "The Long Nave"], plaza: ["The Reliquary Square", "The Plaza of Urns"], court: ["The Cloister of Saints", "The Quiet Court"],
      vista: ["The Mourners' Terrace", "The Overlook of Lamps"], gallery: ["The High Ambulatory", "The Choir Loft"], undercroft: ["The Charnel Undercroft", "The Bone Drains"],
      side: ["A Sealed Chantry", "An Ossuary Niche", "A Votive Cell"], keep: ["The Abbot's Hall", "The Sepulchre Keep"] } },
  verdant: { name: "Verdant Ruin", since: 11, weight: 1,
    palette: { stone: "#2c4a2a", floor: "#4f6a3a", light: "#c8b45a", fog: "#0e1a12" },
    tiles: { wall: "hedgeWall", under: "cisternWall", path: "cisternFloor", floor: ["flagFloor", "mosaicFloor"], accent: "mosaicFloor", low: "cellarFloor" },
    remap: remap("hedgeWall", "cisternWall", "mosaicFloor", "cisternFloor", "flagFloor", "cellarFloor"),
    cv: { fog: "#0e1a12", backdrop: "latticeSky", kit: "verdant" },
    landmark: { name: "the stepped ziggurat", lore: "Over the canopy, the stepped ziggurat at the Pentagon's heart catches the light on its sun disc: you could steer by it." },
    creatures: { module: "verdantRuin", roster: ["rootBrute", "groveMoth", "mossBlob", "coilStalker", "veilMoth"], newcomers: [] },
    bosses: ["veilSpinner", "thunderhorn", "siegeBeetle", "riftLynx", "sunderjaw"],
    wards: ["The Green Ward", "The Rootbound Ward", "The Ward of Falls", "The Sun-Disc Ward"],
    areas: { street: ["The Root Arcade", "The Vine Walk", "The Mossed Lane", "The Briar Run"], plaza: ["The Square of the Fig", "The Flooded Square"], court: ["The Fern Cloister", "The Overgrown Court"],
      vista: ["The Sun-Disc Overlook", "The Canopy Terrace"], gallery: ["The Canopy Walk", "The Root Bridge"], undercroft: ["The Drowned Roots", "The Green Cistern"],
      side: ["A Seed Vault", "A Root Hollow", "A Gardener's Shed"], keep: ["The Ziggurat Stair", "The Hall of Roots"] } },
  ash: { name: "Ash Waste", since: 11, weight: 1,
    palette: { stone: "#36231f", floor: "#594039", light: "#e8a060", fog: "#1a120c" },
    tiles: { wall: "fortressDeepWall", under: "kilnWall", path: "kilnFloor", floor: ["tileFloor", "plankFloor"], accent: "concreteFloor", low: "cellarFloor" },
    remap: remap("fortressDeepWall", "kilnWall", "concreteFloor", "kilnFloor", "plankFloor", "cellarFloor"),
    cv: { fog: "#1a120c", backdrop: "paleWell", kit: "ash" },
    landmark: { name: "the buried colossus", lore: "Past the drop, the skull of a buried colossus breaks the ash at the Pentagon's heart, its eye sockets full of dusk." },
    creatures: { module: "ashWaste", roster: ["ashling", "ashenHound", "cinderWisp", "glassMite", "emberBlob", "sparkWarden"], newcomers: [] },
    bosses: ["cinderSeraph", "lumenWraith", "sunderjaw", "gnawingMaw", "siegeBeetle"],
    wards: ["The Cinder Ward", "The Ward of Bones", "The Dune Ward", "The Rust Ward"],
    areas: { street: ["The Ash Road", "The Bone Arch Way", "The Rust Lane", "The Dune Cut"], plaza: ["The Square of Glass", "The Wreck Yard"], court: ["The Kiln Court", "The Bleached Court"],
      vista: ["The Colossus Overlook", "The Mesa Edge"], gallery: ["The Rib Walk", "The High Mesa Path"], undercroft: ["The Sunken Kilns", "The Ash Tunnels"],
      side: ["A Buried Cart", "A Bone Cache", "A Glassblower's Hut"], keep: ["The Skull Gate", "The Crucible Keep"] } },
  // Written for later releases (plan R7), not yet enabled: `since` null.
  city: { name: "Lamplit City", since: null, weight: 1, palette: { stone: "#3a3e42", floor: "#5b5d5e", light: "#e0a040", fog: "#101418" },
    tiles: { wall: "aptWall", under: "cellarWall", path: "tileFloor", floor: ["flagFloor", "concreteFloor"], accent: "carpetFloor", low: "cellarFloor" },
    remap: remap("aptWall", "cellarWall", "carpetFloor", "tileFloor", "flagFloor", "cellarFloor"), cv: { fog: "#101418", backdrop: "dimDome", kit: "city" },
    landmark: { name: "the cathedral spire", lore: "Over the gables, a cathedral spire and its clock." }, creatures: { module: "lamplitCity", roster: ["hangedChoir", "mirrorShade", "graveLantern"], newcomers: [] }, bosses: ["hangedChoir", "mirrorShade"],
    wards: ["The Cathedral Ward"], areas: { street: ["The Gaslit Street"], plaza: ["The Market"], court: ["The Close"], vista: ["The Belfry Ledge"], gallery: ["The Rooftops"], undercroft: ["The Canals"], side: ["A Shuttered Shop"], keep: ["The Clock Tower"] } },
  alien: { name: "Alien Capital", since: null, weight: 1, palette: { stone: "#3a2a44", floor: "#3d3046", light: "#70e0f0", fog: "#0c0814" },
    tiles: { wall: "hiveWall", under: "hiveWall", path: "chitinFloor", floor: ["crystalFloor", "fleshFloor"], accent: "crystalFloor", low: "fleshFloor" },
    remap: remap("hiveWall", "hiveWall", "crystalFloor", "chitinFloor", "fleshFloor", "fleshFloor"), cv: { fog: "#0c0814", backdrop: "starVault", kit: "alien" },
    landmark: { name: "the spire palace", lore: "A spire palace under twin moons." }, creatures: { module: "alienCapital", roster: ["glassMite", "veilMoth", "coilStalker", "cinderWisp"], newcomers: [] }, bosses: ["veilSpinner", "mirrorShade"],
    wards: ["The Membrane Ward"], areas: { street: ["The Ribbed Way"], plaza: ["The Pool of Glass"], court: ["The Hive Court"], vista: ["The Spire Balcony"], gallery: ["The Floating Walk"], undercroft: ["The Brood Tunnels"], side: ["A Sealed Pod"], keep: ["The Spire Hall"] } },
  frost: { name: "Frost Citadel", since: null, weight: 1, palette: { stone: "#25352f", floor: "#3a4a66", light: "#d0e8ff", fog: "#0a1018" },
    tiles: { wall: "cisternWall", under: "cellarWall", path: "tileFloor", floor: ["crystalFloor", "flagFloor"], accent: "crystalFloor", low: "cellarFloor" },
    remap: remap("cisternWall", "cellarWall", "crystalFloor", "tileFloor", "flagFloor", "cellarFloor"), cv: { fog: "#0a1018", backdrop: "paleWell", kit: "frost" },
    landmark: { name: "the castle across the lake", lore: "A castle across a frozen lake." }, creatures: { module: "frostCitadel", roster: ["ashenHound", "mirrorShade", "graveLantern"], newcomers: [] }, bosses: ["thunderhorn", "riftLynx"],
    wards: ["The Rime Ward"], areas: { street: ["The Wall Walk"], plaza: ["The Frozen Yard"], court: ["The Snow Court"], vista: ["The Lake Battlement"], gallery: ["The Ice Bridge"], undercroft: ["The Cold Cellars"], side: ["A Frozen Larder"], keep: ["The Rime Keep"] } },
  foundry: { name: "Ember Foundry", since: null, weight: 1, palette: { stone: "#36231f", floor: "#594039", light: "#ff8030", fog: "#180c06" },
    tiles: { wall: "kilnWall", under: "kilnWall", path: "plankFloor", floor: ["kilnFloor", "concreteFloor"], accent: "kilnFloor", low: "kilnFloor" },
    remap: remap("kilnWall", "kilnWall", "kilnFloor", "plankFloor", "concreteFloor", "kilnFloor"), cv: { fog: "#180c06", backdrop: "abyssalShaft", kit: "foundry" },
    landmark: { name: "the great crucible", lore: "The great crucible, glowing." }, creatures: { module: "emberFoundry", roster: ["ashling", "cinderWisp", "sparkWarden"], newcomers: [] }, bosses: ["cinderSeraph", "siegeBeetle"],
    wards: ["The Crucible Ward"], areas: { street: ["The Chain Way"], plaza: ["The Casting Floor"], court: ["The Slag Court"], vista: ["The Crane Ledge"], gallery: ["The Catwalks"], undercroft: ["The Flues"], side: ["A Tool Store"], keep: ["The Crucible"] } },
};
// The themes enabled in adventure Pentagon version V, in table order.
export const adventureThemes = (V) => Object.keys(ADVENTURE_THEMES).filter((k) => ADVENTURE_THEMES[k].since != null && ADVENTURE_THEMES[k].since <= V);
// A theme's guard kinds in adventure Pentagon version V: its roster, then each newcomer whose `since` has come.
export const adventureRoster = (theme, V) => { const T = ADVENTURE_THEMES[theme] || ADVENTURE_THEMES.tomb; return [...T.creatures.roster, ...T.creatures.newcomers.filter((c) => c.since != null && c.since <= V).map((c) => c.kind)]; };
// The id the adventure creatures module knows a theme by (null for a theme it does not cover yet).
export const adventureCreatureTheme = (theme) => ADVENTURE_THEMES[theme]?.creatures.module || null;
// A Pentagon's themes: a primary one and an accent, seeded (never from the region round it); `accent` districts take the
// accent theme, the rest the primary. Returns { primary, accent, districts: [theme per district] }.
export function adventureThemePick(key, V, n = 5) {
  const pool = adventureThemes(V), A = ADVENTURE_PENTAGON.accent, w = (k) => ADVENTURE_THEMES[k].weight;
  const total = pool.reduce((s, k) => s + w(k), 0); let roll = hashSeed(`${key}:adventure-theme:v1`) % Math.max(1, total * 100) / 100, primary = pool[0];
  for (const k of pool) { if (roll < w(k)) { primary = k; break; } roll -= w(k); }
  const rest = pool.filter((k) => k !== primary), accent = rest.length ? rest[hashSeed(`${key}:adventure-accent:v1`) % rest.length] : primary;
  const order = [...Array(n).keys()].sort(byHash((i) => `${key}:adventure-accent-district:${i}`)); let k = 0;
  const districts = Array(n).fill(primary); for (const i of order) { if (k >= A.max) break; if ((hashSeed(`${key}:adventure-accent-roll:${i}`) % 1000) / 1000 < A.share) { districts[i] = accent; k++; } }
  if (!k && n > 1) districts[order[0]] = accent; // always one surprise
  return { primary, accent, districts };
}

// ------------------------------------------------------------------------------------------------ area templates
// `size`: candidate [W, H] (hashed pick); `plazas`, `plaza` (radius range); `path` width range; `loops`: extra ways round
// between plazas beyond a spanning tree; `bend`: the share of ways with a jog; `guards`: creatures laid; `drop`: share of
// the far side given to an open drop (a vista's view); `rails`: drops along a gallery's walk; `low`: an undercroft's stone.
export const ADVENTURE_AREAS = {
  waystone: { size: [[47, 43]], plazas: [1, 2], plaza: [5, 6], centre: 10, path: [5, 5], loops: [1, 1], guards: [0, 0] },
  street: { size: [[53, 45], [57, 43], [51, 49]], plazas: [3, 4], plaza: [5, 7], path: [5, 6], loops: [1, 2], guards: [2, 4], bend: .7 },
  plaza: { size: [[55, 49], [57, 47]], plazas: [2, 3], plaza: [7, 9], path: [5, 6], loops: [1, 1], guards: [3, 4], bend: .5 },
  court: { size: [[51, 47]], plazas: [1, 2], plaza: [9, 11], path: [5, 5], loops: [0, 1], guards: [2, 3], bend: .5 },
  vista: { size: [[59, 51], [57, 53]], plazas: [2, 3], plaza: [6, 8], path: [5, 6], loops: [1, 1], guards: [1, 2], drop: .36, bend: .5 },
  gallery: { size: [[59, 33], [61, 31]], plazas: [3, 4], plaza: [4, 5], path: [5, 5], loops: [1, 1], guards: [2, 3], rails: .5, bend: .3 },
  undercroft: { size: [[45, 39], [47, 37]], plazas: [4, 6], plaza: [2, 4], path: [1, 2], loops: [2, 3], guards: [3, 4], low: true, bend: .8 }, // cramped by design
  side: { size: [[29, 25], [31, 23]], plazas: [1, 2], plaza: [3, 5], path: [2, 2], loops: [0, 0], guards: [1, 2], bend: .3 }, // cramped by design
  keep: { size: [[57, 51], [55, 53]], plazas: [2, 3], plaza: [9, 11], path: [6, 6], loops: [1, 1], guards: [2, 3], bend: .5 },
};

// ------------------------------------------------------------------------------------------------ connectors and gates
// Connectors name the door between two areas (the standard view draws every one as a door; Close View dressing later), and the
// shortcut gates are barred from the near (hub) side and opened from the far side (game.ts takeBuildingStair `shortcutOpens`).
export const ADVENTURE_LINKS = {
  passage: { name: "Way", across: "a way through" }, stair: { name: "Stair", across: "a stair between levels" },
  bridge: { name: "Bridge", across: "a bridge over the courts" }, tunnel: { name: "Tunnel", across: "a low tunnel" },
  shortcut: { kinds: ["gate", "door", "ladder"], notice: "A SHORTCUT OPENS", opens: "The way back to the Waystone opens, and stays open." },
};

// ------------------------------------------------------------------------------------------------ a district's graph
// A district is rows of areas from its front (row 0, where the ring joins it) to its keep (the last row, one area). Every area
// of a row joins the row before; some rows join side to side and some areas join two areas on; a high gallery and a low
// undercroft run past the rows as routes of their own, joined by stairs at both ends (layered ways round); side areas hang off
// the streets for those who look; one area is a vista. `gx`, `gy`: the area's place in the district (columns across, rows in),
// for drawing and for which wall a door stands on. Pure: a hash of `key` and `spec`.
// spec: { id (prefix), size (ADVENTURE_PENTAGON.sizes key), theme, vista? (default true) }
export function composeDistrict(key, spec) {
  const A = ADVENTURE_PENTAGON, S = A.sizes[spec.size] || A.sizes.grand, r = rng(`${key}:district:${spec.id}`), pickN = ([a, b]) => a + Math.floor(r() * (b - a + 1));
  const nodes = [], edges = [], id = (k) => `${spec.id}a${k}`, add = (template, row, col, extra = {}) => { const q = { id: id(nodes.length), template, row, col, gx: col, gy: row, ...extra }; nodes.push(q); return q; };
  const link = (a, b, via = "passage", extra = {}) => { if (a === b || edges.some((e) => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id))) return null; const e = { a: a.id, b: b.id, via, ...extra }; edges.push(e); return e; };
  const R = pickN(S.rows), rows = [];
  for (let row = 0; row < R; row++) { const w = row === R - 1 ? 1 : pickN(S.width), list = [];
    for (let c = 0; c < w; c++) list.push(add(row === R - 1 ? "keep" : row === 0 ? (r() < .7 ? "street" : "plaza") : ["street", "plaza", "court", "street"][Math.floor(r() * 4)], row, (c - (w - 1) / 2) * 2));
    rows.push(list); }
  const near = (q, list) => [...list].sort((a, b) => Math.abs(a.col - q.col) - Math.abs(b.col - q.col) || a.col - b.col);
  for (let row = 1; row < R; row++) { for (const q of rows[row]) { const n = near(q, rows[row - 1]); link(n[0], q); if (n[1] && r() < A.diagonal) link(n[1], q); }
    for (const q of rows[row - 1]) if (!edges.some((e) => e.a === q.id && nodes.find((o) => o.id === e.b).row === row)) link(q, near(q, rows[row])[0]); }
  for (let row = 0; row < R - 1; row++) for (let c = 1; c < rows[row].length; c++) if (r() < A.lateral) link(rows[row][c - 1], rows[row][c]);
  // the vista: an area of a middle row (or the front, in a short district) made a vista
  if (spec.vista !== false) { const mids = rows.slice(Math.min(A.vistaRow, R - 2), R - 1).flat(); const v = mids[Math.floor(r() * mids.length)]; if (v) v.template = "vista"; }
  // layered routes: a high gallery and a low undercroft past the rows, each joined by stairs at both ends
  const flank = Math.max(...nodes.map((q) => Math.abs(q.col))) + 2, routes = [];
  const wantUp = r() < A.upper, wantLow = r() < A.lower, kinds = wantUp || wantLow ? [...(wantUp ? ["upper"] : []), ...(wantLow ? ["lower"] : [])] : [r() < .5 ? "upper" : "lower"];
  for (const layer of kinds) { const from = rows[0][layer === "upper" ? 0 : rows[0].length - 1], to = R >= 3 ? rows[R - 2][layer === "upper" ? 0 : rows[R - 2].length - 1] : rows[R - 1][0];
    const len = Math.max(1, Math.min(2, (to.row - from.row))), chain = []; const side = layer === "upper" ? -1 : 1;
    for (let k = 0; k < len; k++) chain.push(add(layer === "upper" ? "gallery" : "undercroft", from.row + (k + 1) * (to.row - from.row) / (len + 1), side * flank, { layer }));
    link(from, chain[0], layer === "upper" ? "stair" : "tunnel"); for (let k = 1; k < chain.length; k++) link(chain[k - 1], chain[k], layer === "upper" ? "bridge" : "tunnel"); link(chain.at(-1), to, layer === "upper" ? "stair" : "tunnel");
    routes.push(chain.map((q) => q.id)); }
  // side areas: off the streets and plazas (never the keep), each a dead end that pays (a cache)
  const hosts = nodes.filter((q) => !q.layer && q.template !== "keep" && q.template !== "vista"); const ns = pickN(S.sides), sides = [];
  for (let k = 0; k < ns && hosts.length; k++) { const h = hosts[Math.floor(r() * hosts.length)], s = add("side", h.row + .5, h.col + (h.col >= 0 ? 1.4 : -1.4), { side: true }); link(h, s, "passage"); sides.push(s.id); }
  // the keep is never at the end of a single way: a second way in, from the row before or the end of a layered route
  const keep = rows[R - 1][0], into = () => edges.filter((e) => e.a === keep.id || e.b === keep.id).length;
  if (into() < 2) { const other = R >= 2 ? near(keep, rows[R - 2]).find((q) => !edges.some((e) => (e.a === q.id && e.b === keep.id) || (e.b === q.id && e.a === keep.id))) : null;
    if (other) link(other, keep); else { const chain = nodes.filter((q) => q.layer).at(-1); if (chain) link(chain, keep, chain.layer === "upper" ? "stair" : "tunnel"); } }
  // two ways with no door in common from either end of the front into the keep (so no single door is the only way on): where
  // there are not, a way along the front, a stair onto a layered route, a second way on, or a layered route's end into the keep
  const heads = routes.map((ids) => nodes.find((q) => q.id === ids[0])), tails = routes.map((ids) => nodes.find((q) => q.id === ids.at(-1)));
  for (const f of new Set([rows[0][0], rows[0].at(-1)])) { const fixes = [[f, rows[0][rows[0].indexOf(f) ? rows[0].indexOf(f) - 1 : 1]], ...heads.map((h) => [f, h, h.layer === "upper" ? "stair" : "tunnel"]), ...(R > 1 ? [[f, near(f, rows[1])[1]]] : []), ...tails.map((t) => [t, keep, t.layer === "upper" ? "stair" : "tunnel"])];
    for (const [a, b, via] of fixes) { if (edgeDisjointRoutes(edges, f.id, keep.id, 2) >= 2) break; if (a && b) link(a, b, via); } }
  // a district with no way round yet: join the front row's ends, or the gallery to the keep
  if (adventureCycles(nodes, edges) === 0) { const f = rows[0]; if (f.length > 1) link(f[0], f.at(-1)); else link(nodes.find((q) => q.layer) || rows[0][0], rows[R - 1][0], "stair"); }
  return { id: spec.id, nodes, edges, rows: rows.map((l) => l.map((q) => q.id)), front: rows[0].map((q) => q.id), deep: rows[R - 1][0].id, routes, sides, R };
}

// ------------------------------------------------------------------------------------------------ proofs
// Independent ways round an undirected graph: E - V + C (0 for a tree or a forest).
export function adventureCycles(nodes, edges) {
  const ids = nodes.map((q) => q.id ?? q), parent = new Map(ids.map((v) => [v, v])), find = (v) => { while (parent.get(v) !== v) { parent.set(v, parent.get(parent.get(v))); v = parent.get(v); } return v; };
  let cycles = 0; for (const e of edges) { if (!parent.has(e.a) || !parent.has(e.b)) continue; const a = find(e.a), b = find(e.b); if (a === b) cycles++; else parent.set(a, b); }
  return cycles;
}
// How many routes with no door in common lead from `from` to `to` (undirected, unit capacities; capped at `cap`).
export function edgeDisjointRoutes(edges, from, to, cap = 4) {
  const cap2 = new Map(), key = (a, b) => `${a}>${b}`, adj = new Map(), addE = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); cap2.set(key(a, b), (cap2.get(key(a, b)) || 0) + 1); };
  for (const e of edges) { addE(e.a, e.b); addE(e.b, e.a); }
  let flow = 0;
  while (flow < cap) { const prev = new Map([[from, null]]), q = [from];
    for (let i = 0; i < q.length && !prev.has(to); i++) { const v = q[i]; for (const u of adj.get(v) || []) if (!prev.has(u) && cap2.get(key(v, u)) > 0) { prev.set(u, v); q.push(u); } }
    if (!prev.has(to)) break; for (let v = to; prev.get(v) !== null; v = prev.get(v)) { const u = prev.get(v); cap2.set(key(u, v), cap2.get(key(u, v)) - 1); cap2.set(key(v, u), (cap2.get(key(v, u)) || 0) + 1); } flow++; }
  return flow;
}
// The progression solver for a Pentagon-shaped plan ({ nodes, edges, world, trials, levers, nh }): walks from the land opening
// what can be opened, in rounds, until nothing more opens. Rules (as game.ts enforces them): a plain door or world door is open;
// a plate door opens from its plate's side; a shortcut opens from its far side, then both ways; a shard door wants its shard
// (taken where it lies); the central court's doors want every lever (each in its court); the Heart wants every trial chamber
// cleared; a keeper's ladder down wants its floor reached (the keeper fought); a sigil door wants the Regent's Seal (the vault
// reached); an exterior door opens from within; the vault leads out. Returns { reached: Set, order: [[id, round]], seal }.
export function solveAdventurePlan(plan, { noSigil = false } = {}) {
  const reached = new Set(["land"]), shards = new Set(), opened = new Set(); let seal = false, round = 0; const order = [];
  const node = new Map(plan.nodes.map((q) => [q.id, q])), vault = `h${plan.nh - 1}`;
  const can = (from, to, e, world) => {
    if (world) { const w = e;
      if (w.toGate) return from === w.node; if (w.exterior) return from === w.node || opened.has(w.exterior); if (w.sigil) return seal && !noSigil;
      if (w.gate === "levers") return (plan.levers || []).every((L) => reached.has(`c${L.f}`)); if (w.sealed === "trials") return (plan.trials || []).every((t) => reached.has(t)); if (w.lock) return shards.has(w.lock); return true; }
    if (e.sigil) return seal && !noSigil; if (e.secret) return shards.has(e.secret); if (e.shortcut) return from === e.far || opened.has(e.shortcut);
    if (e.plate) return from === e.plate || opened.has(`plate:${e.plate}`);
    const a = node.get(from), b = node.get(to); if (a?.kind === "heart" && b?.kind === "heart" && b.n > a.n && a.boss) return reached.has(from); return true; };
  for (let grew = true; grew; round++) { grew = false;
    const take = (id) => { if (reached.has(id)) return; reached.add(id); order.push([id, round]); grew = true; const q = node.get(id); if (q?.shard) shards.add(q.shard.id); if (id === vault) seal = true; };
    for (const e of plan.edges) for (const [f, t] of [[e.a, e.b], [e.b, e.a]]) if (reached.has(f) && !reached.has(t) && can(f, t, e, false)) { take(t); if (e.shortcut) opened.add(e.shortcut); if (e.plate) opened.add(`plate:${e.plate}`); }
    for (const w of plan.world) for (const [f, t] of [[w.place, w.node], [w.node, w.place]]) { if (w.toGate && f !== w.node) continue; if (reached.has(f) && !reached.has(t) && can(f, t, w, true)) { take(t); if (w.exterior) opened.add(w.exterior); } } }
  return { reached, order, seal };
}

// ------------------------------------------------------------------------------------------------ an area's floor plan
// Plazas joined by ways: a spanning tree over the plazas and the doors, then `loops` more ways between plazas, each an L or a Z
// square to the walls. A vista gives its far side to an open drop; a gallery's walk runs between drops.
// No columns and no round rims: open middles and straight walls are the camera's room. Every door is joined to the way in (any not
// yet reached is joined by a straight way at the end). Returns { grid (1 wall, 0 floor, 2 doorway, 5 drop), surf (0 path,
// 1 and 2 plaza floors, 3 accent, 4 low), centre, landmark, plazas }. Pure.
export function layAdventureArea(base, area, W, H, ports, arrive) {
  const T = ADVENTURE_AREAS[area] || ADVENTURE_AREAS.street, r = rng(`${base}:adventure-area:v1:${area}`), pickN = ([a, b]) => a + Math.floor(r() * (b - a + 1));
  const grid = new Array(W * H).fill(1), surf = new Uint8Array(W * H), at = (x, y) => y * W + x, inside = (x, y) => x >= 1 && y >= 1 && x <= W - 2 && y <= H - 2;
  const drop = new Uint8Array(W * H); let dropSide = null;
  if (T.drop) { const sides = ["top", "right", "left", "bottom"].sort(byHash((s) => `${base}:drop:${s}`)), busy = (s) => ports.filter((p) => (s === "top" && p.y === 0) || (s === "bottom" && p.y === H - 1) || (s === "left" && p.x === 0) || (s === "right" && p.x === W - 1)).length;
    dropSide = sides.sort((a, b) => busy(a) - busy(b))[0]; const d = Math.round((dropSide === "top" || dropSide === "bottom" ? H : W) * T.drop);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((dropSide === "top" && y < d) || (dropSide === "bottom" && y >= H - d) || (dropSide === "left" && x < d) || (dropSide === "right" && x >= W - d)) drop[at(x, y)] = 1;
    for (const p of ports) for (let k = -3; k <= 3; k++) for (let j = -3; j <= 3; j++) { const x = p.inner.x + k, y = p.inner.y + j; if (inside(x, y)) drop[at(x, y)] = 0; } } // a door never opens onto the drop
  const free = (x, y, rad) => { for (let j = -rad - 1; j <= rad + 1; j++) for (let k = -rad - 1; k <= rad + 1; k++) { const X = x + k, Y = y + j; if (X < 2 || Y < 2 || X > W - 3 || Y > H - 3 || drop[at(X, Y)]) return false; } return true; };
  const plazas = [];
  if (T.centre) plazas.push({ x: W >> 1, y: H >> 1, rad: T.centre, shape: 2, centre: true });
  const want = pickN(T.plazas) + plazas.length;
  for (let tries = 0; plazas.length < want && tries < 200; tries++) { const rad = pickN(T.plaza), x = 2 + rad + Math.floor(r() * Math.max(1, W - 4 - 2 * rad)), y = 2 + rad + Math.floor(r() * Math.max(1, H - 4 - 2 * rad));
    if (!free(x, y, rad) || plazas.some((p) => Math.max(Math.abs(p.x - x) - p.rad - rad, Math.abs(p.y - y) - p.rad - rad) < 3)) continue; plazas.push({ x, y, rad, shape: Math.floor(r() * 2) }); } // square or chamfered (a round rim leaves no straight line for the camera's boom)
  if (!plazas.length) plazas.push({ x: W >> 1, y: H >> 1, rad: 2, shape: 0 }); // a cramped map: one small plaza in the middle
  const carve = (x, y, s = 0) => { if (!inside(x, y) || drop[at(x, y)]) return; if (grid[at(x, y)] !== 2) grid[at(x, y)] = 0; if (!(surf[at(x, y)] > 0 && s === 0)) surf[at(x, y)] = s; };
  plazas.forEach((p, i) => { for (let y = p.y - p.rad; y <= p.y + p.rad; y++) for (let x = p.x - p.rad; x <= p.x + p.rad; x++) { const dx = x - p.x, dy = y - p.y;
    if (p.shape === 2 && dx * dx + dy * dy > (p.rad + .5) ** 2) continue; if (p.shape === 1 && Math.abs(dx) === p.rad && Math.abs(dy) === p.rad) continue;
    const ring = p.centre && Math.abs(Math.hypot(dx, dy) - (p.rad - 2)) < .6; carve(x, y, ring ? 3 : T.low ? 4 : 1 + (i & 1)); } });
  // the ways: a spanning tree (Prim) over plazas and doors, then loops between plazas
  const pts = [...plazas.map((p) => ({ x: p.x, y: p.y, plaza: true })), ...ports.map((p) => ({ x: p.inner.x, y: p.inner.y, door: true }))];
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2, inTree = new Set([0]), links = [];
  while (inTree.size < pts.length) { let best = null; for (const i of inTree) for (let j = 0; j < pts.length; j++) if (!inTree.has(j) && !(pts[i].door && pts[j].door) && (!best || d2(pts[i], pts[j]) < best.d)) best = { i, j, d: d2(pts[i], pts[j]) };
    if (!best) for (const i of inTree) for (let j = 0; j < pts.length; j++) if (!inTree.has(j) && (!best || d2(pts[i], pts[j]) < best.d)) best = { i, j, d: d2(pts[i], pts[j]) };
    inTree.add(best.j); links.push([best.i, best.j]); }
  const has = (i, j) => links.some(([a, b]) => (a === i && b === j) || (a === j && b === i)), cand = [];
  for (let i = 0; i < plazas.length; i++) for (let j = i + 1; j < plazas.length; j++) if (!has(i, j)) cand.push([i, j, d2(pts[i], pts[j])]);
  cand.sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]); for (const [i, j] of cand.slice(0, pickN(T.loops))) links.push([i, j]);
  // each way runs square to the walls, in long straight runs: an L, or a Z with a jog part way (straight runs are where the
  // camera's boom fits behind you: ADVENTURE_PENTAGON.camera); `bend`: the share of ways given a jog
  for (const [i, j] of links) { const a = pts[i], b = pts[j], w = pickN(T.path), clampX = (v) => Math.max(2, Math.min(W - 3, v)), clampY = (v) => Math.max(2, Math.min(H - 3, v));
    const across = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y), jog = r() < (T.bend ?? .5), f = .3 + .4 * r(), flip = r() < .5;
    let way = jog ? (across ? [a, { x: clampX(Math.round(a.x + (b.x - a.x) * f)), y: a.y }, { x: clampX(Math.round(a.x + (b.x - a.x) * f)), y: b.y }, b] : [a, { x: a.x, y: clampY(Math.round(a.y + (b.y - a.y) * f)) }, { x: b.x, y: clampY(Math.round(a.y + (b.y - a.y) * f)) }, b])
      : [a, flip ? { x: b.x, y: a.y } : { x: a.x, y: b.y }, b];
    if (way.some((q) => drop[at(q.x, q.y)])) way = [a, flip ? { x: a.x, y: b.y } : { x: b.x, y: a.y }, b]; // a corner out over the drop: the other L
    for (let k = 1; k < way.length; k++) { const p = way[k - 1], q = way[k], steps = Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y), 1);
      for (let s = 0; s <= steps; s++) { const x = Math.round(p.x + (q.x - p.x) * s / steps), y = Math.round(p.y + (q.y - p.y) * s / steps); for (let j = 0; j < w; j++) for (let k2 = 0; k2 < w; k2++) carve(x + k2 - (w >> 1), y + j - (w >> 1), T.low ? 4 : 0); } } }
  for (const p of ports) { grid[at(p.x, p.y)] = 2; if (inside(p.inner.x, p.inner.y)) { grid[at(p.inner.x, p.inner.y)] = 0; drop[at(p.inner.x, p.inner.y)] = 0; } }
  // every door and plaza joined to the way in
  const flood = () => { const seen = new Uint8Array(W * H), st = [at(arrive.x, arrive.y)]; seen[st[0]] = 1; while (st.length) { const k = st.pop(), x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const n = at(X, Y); if (!seen[n] && grid[n] !== 1) { seen[n] = 1; st.push(n); } } } return seen; };
  let seen = flood();
  for (const q of [...ports.map((p) => p.inner), ...plazas]) if (!seen[at(q.x, q.y)]) { let x = q.x, y = q.y; while (x !== arrive.x) { x += Math.sign(arrive.x - x); if (inside(x, y)) { grid[at(x, y)] = grid[at(x, y)] === 2 ? 2 : 0; drop[at(x, y)] = 0; } } while (y !== arrive.y) { y += Math.sign(arrive.y - y); if (inside(x, y)) { grid[at(x, y)] = grid[at(x, y)] === 2 ? 2 : 0; drop[at(x, y)] = 0; } } seen = flood(); }
  // drops: the vista's far side; the gallery's rails (wall beside the walk turned to an open drop)
  for (let k = 0; k < W * H; k++) if (drop[k] && grid[k] === 1) grid[k] = 5;
  if (T.rails) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = at(x, y); if (grid[k] !== 1) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[at(x + dx, y + dy)] === 0) && (hashSeed(`${base}:rail:${x},${y}`) % 1000) / 1000 < T.rails) grid[k] = 5; }
  // the centre (a Waystone's spot) and, in a vista, the plaza nearest the drop (where the view is)
  const C = plazas[0], dropD = (p) => dropSide === "top" ? p.y : dropSide === "bottom" ? H - p.y : dropSide === "left" ? p.x : dropSide === "right" ? W - p.x : 0;
  const landmark = dropSide ? [...plazas].sort((a, b) => dropD(a) - dropD(b))[0] : null;
  return { grid, surf, centre: { x: C.x, y: C.y }, landmark: landmark ? { x: landmark.x, y: landmark.y, side: dropSide } : null, plazas: plazas.map(({ x, y, rad }) => ({ x, y, rad })) };
}
// A template's size for one area (hashed among its candidates), held to ADVENTURE_PENTAGON.maxArea.
export function adventureAreaSize(key, area) {
  const T = ADVENTURE_AREAS[area] || ADVENTURE_AREAS.street, M = ADVENTURE_PENTAGON.maxArea, [W, H] = T.size[hashSeed(`${key}:area-size`) % T.size.length];
  return [Math.min(W, M.w), Math.min(H, M.h, Math.floor(M.tiles / Math.min(W, M.w)))];
}

// Which walking headings (`headings` of them, evenly round) at each walkable tile leave room for the whole camera boom behind the
// Wayfarer (as close-view.ts boomLength probes it: along the line back from the tile's middle and `pad` to either side; open drops
// do not count as walls), a bit each; a tile is clear when some walking line (a heading and its opposite) has room both ways.
// Returns { clear, walkable, share, counts: Uint16Array }. Pure; for tests and tuning, never per frame.
const CAMERA_OPEN = /void|chasm|pit|abyss|sky|star|water|lava|canyon/i;
export function adventureCameraClearance(map, C = ADVENTURE_PENTAGON.camera) {
  const W = map.width, H = map.height, T = map.tiles, K = C.headings, half = K >> 1, wall = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; const t = T[ty * W + tx]; return !!t && t.blocked === true && !t.chasm && !t.doorway && !CAMERA_OPEN.test(String(t.kind || "")); };
  const dirs = Array.from({ length: K }, (_, d) => [Math.cos(d * 2 * Math.PI / K), Math.sin(d * 2 * Math.PI / K)]);
  const counts = new Uint16Array(W * H); let walkable = 0, clear = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = T[y * W + x]; if (!t || t.blocked) continue; walkable++; const ox = x + .5, oy = y + .5; let n = 0;
    for (let d = 0; d < K; d++) { const [fx, fy] = dirs[d], rx = -fy, ry = fx; let ok = true; for (let s = C.step / 2; s <= C.boom + C.pad && ok; s += C.step) { const px = ox - fx * s, py = oy - fy * s; if (wall(px, py) || wall(px + rx * C.pad, py + ry * C.pad) || wall(px - rx * C.pad, py - ry * C.pad)) ok = false; } if (ok) n |= 1 << d; }
    counts[y * W + x] = n; let line = false; for (let d = 0; d < half && !line; d++) line = !!(n & (1 << d)) && !!(n & (1 << (d + half))); if (line) clear++; }
  return { clear, walkable, share: walkable ? clear / walkable : 1, counts };
}
