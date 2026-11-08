// The Pentagon's grand halls (release 795; Tim, 2026-11-06: "In the Pentagons there can be larger open ballrooms — the
// Pentagon is so huge — huge open arenas and structures that we can just wander through and look up at. Various indications
// of the Watcher sigil in different places. Interesting skyboxes and interesting rooms, so as we explore in Close View we can
// look around and see cool, interesting things... use the lore as prompts and seeds to build different scenes, rooms,
// backdrops within the Pentagon: large galleries with interesting structures or lore connections; abstract, ethereal art;
// carvings or images of the world beasts or stories, including world bosses moving together... As you look up or around you
// see carvings of different aspects of the Corridor. The Elder Wanderers are probably a good place to integrate things.").
//
// From Pentagon version 8 (pentagon.ts PENTAGON.version, pinned per Pentagon on the atlas as `pentVersion`), a few of the
// fifteen ring chambers of a new Pentagon are grand halls: a ballroom, an arena, a vaulted gallery, a colonnaded hall or a
// pit-gallery with balconies round an open shaft. A hall is larger than a chamber (PENTAGON_HALLS.types[*].size, at most
// `maxTiles` tiles) but is still one area with the chamber's own doors, keys, lords and ghouls; only its floor plan differs.
// Every hall is tall (`hall.tall`), with a ceiling class (`ceiling`: vault, dome, high, open, skylit or shaft) and a backdrop
// (PENTAGON_BACKDROPS) for what is seen overhead or below. Its walls, ceiling and floor carry murals (PENTAGON_MURALS):
// original scenes seeded from the Corridor's own lore. The Watcher's sigil is carved over doors, hung as banners, cut on
// columns and inlaid in hall floors (`map.sigils`). Everything is data on the map for a later Close View pass to draw:
//   map.hall     { type, name, tall, ceiling, ceilingHeight, open, sky, backdrop, features: [{ kind, x, y }] }
//   map.backdrop the backdrop id (also on map.hall)
//   map.murals   [{ x, y, side, muralId, scale, place, w?, h? }]: side is the wall the mural is on ("north" | "south" |
//                "east" | "west": it faces into the hall), "ceiling" or "floor"; x, y its middle tile
//   map.sigils   [{ x, y, kind, side?, scale? }]: kind "lintel" (over a door), "banner" (hung on a wall), "column" (cut on
//                a column) or "inlay" (the full sigil in the floor: its tiles carry `sigil`, as watcher.ts lays it)
// Tiles of a hall carry `hall` (its type); columns `column`, arena stands `tier`, the shaft `hallVoid` (blocked: an open drop
// seen from the balconies, never walked), the floor round the shaft `balcony`, and a floor mural's tiles `inlay` (1 a groove,
// 2 a lit line). A mural is read with Act at the floor before it (a `pentMural` object): its title and caption, journalled
// once per mural (save.lore.murals, additive at schema 14, normalised in lore.ts ensureLore). Pure: hashes of the Pentagon
// and the chamber, nothing else. Older Pentagons never call in here, so they regenerate byte for byte.
import { hashSeed, byHash } from "./random.js?v=r842-ef8c3947abac";
import { SIGIL_BOUNDS, sigilFits, inlaySigil } from "./watcher.js?v=r842-ef8c3947abac";

export const PENTAGON_HALLS = {
  since: 8, // the Pentagon version that first has halls
  count: [4, 6], // halls a Pentagon, of its fifteen ring chambers
  maxTiles: 1800, // no hall is larger than this (a chamber is 27 × 19 = 513)
  protect: 2, // tiles kept open round every door's inner tile and the way in
  muralsPerHall: 6, // the pool of murals dealt to each hall (it draws its wall, ceiling and floor murals from it)
  wallOrder: ["north", "east", "west", "south"], // walls a hall's murals go on, in turn
  muralSpacing: 7, bannerSpacing: 4, doorClear: 2, // tiles between murals on a wall; between banners and anything; from a door
  // ceiling classes: how high (levels, for Close View), whether it is open to the dark above, whether light comes down
  ceilings: {
    vault: { height: 6, open: false, sky: false }, dome: { height: 8, open: false, sky: false }, high: { height: 7, open: false, sky: false },
    open: { height: 12, open: true, sky: false }, skylit: { height: 9, open: false, sky: true }, shaft: { height: 14, open: true, sky: false },
  },
  // Sizes are [W, H] with the walls; murals [min, max] on the walls; banners [min, max]; `inlay` the floor's centrepiece:
  // "sigil" (the Watcher's, in full) or "mural" (a floor mural, `patch` tiles); features ([kind, count, needs a ceiling flag,
// else this kind]) are structures for Close View only.
  types: {
    ballroom: { since: 8, name: "Ballroom", size: [47, 33], ceilings: ["dome", "vault"], floor: "mosaicFloor", edge: "flagFloor",
      ring: { inset: 5, every: 4 }, murals: [3, 4], banners: [2, 4], inlay: "sigil", columnSigils: 2, features: [["chandelier", 3]] },
    arena: { since: 8, name: "Arena", size: [43, 35], ceilings: ["open", "skylit"], floor: "flagFloor", edge: "tileFloor",
      bowl: { margin: 6, band: 2, gate: 1 }, murals: [2, 3], banners: [3, 4], inlay: "sigil", columnSigils: 0, features: [["statue", 4]] },
    gallery: { since: 8, name: "Vaulted Gallery", size: [51, 23], ceilings: ["vault", "skylit"], floor: "flagFloor", edge: "mosaicFloor",
      piers: { aisle: 5, every: 4 }, murals: [4, 4], banners: [1, 2], inlay: "mural", patch: [13, 5], columnSigils: 2, features: [["skylight", 4, "sky", "lamp"]] },
    colonnade: { since: 8, name: "Colonnaded Hall", size: [45, 29], ceilings: ["high", "vault"], floor: "flagFloor", edge: "carpetFloor",
      grid: { margin: 4, every: 3 }, murals: [3, 3], banners: [2, 3], inlay: "mural", patch: [9, 7], columnSigils: 4, features: [["censer", 2]] },
    pitGallery: { since: 8, name: "Pit Gallery", size: [41, 33], ceilings: ["shaft", "open"], floor: "flagFloor", edge: "mosaicFloor",
      pit: { margin: [7, 7], bridge: 1 }, murals: [3, 4], banners: [2, 3], inlay: null, columnSigils: 0, features: [["chain", 4]] },
  },
  names: { hall: "a grand hall", mural: "A carving", ceiling: "Overhead", floor: "Inlaid in the floor", journal: "In the Pentagon's halls" },
  messages: { worn: "The carving is worn past reading." },
};

// What a hall's ceiling shows, beyond the stone or through it: for Close View to paint. `ceilings`: the classes it suits.
export const PENTAGON_BACKDROPS = [
  { id: "starVault", since: 8, name: "The Star Vault", ceilings: ["open", "dome", "skylit"], palette: ["#05060c", "#28305a", "#d8d4ff"],
    line: "Far above, no roof: a vault of slow stars, and between them darker shapes that are not clouds." },
  { id: "abyssalShaft", since: 8, name: "The Abyssal Shaft", ceilings: ["shaft", "open"], palette: ["#020203", "#1a1430", "#6e5aa8"],
    line: "The shaft goes up out of sight and down out of sight, and the faint lights in its walls are other balconies." },
  { id: "latticeSky", since: 8, name: "The Impossible Lattice", ceilings: ["open", "skylit", "high"], palette: ["#0a0c10", "#3a4a5a", "#c8e0f0"],
    line: "Overhead, a lattice of pale beams crosses itself at angles that should not close, and closes." },
  { id: "dimDome", since: 8, name: "The Dim Dome", ceilings: ["dome", "vault", "high"], palette: ["#0e0b08", "#3a2e22", "#b89a6a"],
    line: "A dome so wide its far side is weather: ribs of old gold going up into a dusk that never quite ends." },
  { id: "paleWell", since: 8, name: "The Pale Well", ceilings: ["skylit", "shaft", "vault"], palette: ["#101418", "#4a5a66", "#e8f0f4"],
    line: "Light comes down from very high, thin and white, as if through water, and never reaches the floor whole." },
];

// The murals: original scenes, each seeded from the Corridor's own lore (`source` names where). Motifs: frieze (a long band
// of figures), relief (raised figures), mosaic (set stones), rule-figure (a computed pattern: `rule`), constellation (points
// of light). `palette` [ground, figure, light]. Captions are short and in the Corridor's voice: they offer, never explain.
// A new mural gets a new `since` (a later Pentagon version), so halls already generated keep theirs.
export const PENTAGON_MURALS = [
  { id: "longMigration", since: 8, title: "The Long Migration", motif: "relief", palette: ["#2a2520", "#8a7a5e", "#e0c890"], source: "world-beasts.ts WORLD_BEASTS",
    caption: "The great beasts walk one road together: a turtle bearing hills, a worm under the ground like a wake, a stag of thorns, a moth as wide as weather. None hunts another. The carving does not show where the road goes." },
  { id: "unbowedProcession", since: 8, title: "The Procession of the Unbowed", motif: "frieze", palette: ["#201818", "#9a4a3a", "#f0b070"], source: "world-beasts.ts WORLD_BEASTS (the Crimson Tyrant, the Lightning Giant, the Void Walker, the Psychic Crystal)",
    caption: "In single file the world's great hunters pass under one low door: the red tyrant, the giant of storms, the walker of the void, the crystal that thinks. Each has bent its head to fit. Something on the far side is taller." },
  { id: "eldersPass", since: 8, title: "The Elders Pass", motif: "rule-figure", rule: { ca: 110 }, palette: ["#14161a", "#6a8a9a", "#d0f0ff"], source: "elders.ts ELDERS (the Elder Wanderers)",
    caption: "Faceless figures walk across the stone, and behind each one a pattern unrolls row by row, a wake of reasoning. Under them, one line: they speak, and the floor remembers." },
  { id: "eightyEight", since: 8, title: "Eighty-Eight", motif: "constellation", palette: ["#06070c", "#3a4470", "#f0eaff"], source: "elders.ts ELDER_RULES (88 rule classes)",
    caption: "Eighty-eight small lights cut in a ring, no two the same shape. Someone has scratched a tally beside some of them, and not the others." },
  { id: "tallHearth", since: 8, title: "The Tall Hearth", motif: "relief", palette: ["#2a2016", "#a07850", "#f0d0a0"], source: "far-realms.ts FAR_REALM_INFO giantFolk; threads.ts tallSlates",
    caption: "A hearth with doors twice the height of a man, and round it the Tall Folk at rest, spears laid by. A child among them holds a book no bigger than her thumbnail, close to one eye." },
  { id: "deepDiggers", since: 8, title: "The Deep Diggers", motif: "frieze", palette: ["#1c1a16", "#7a6a50", "#c0e0d0"], source: "far-realms.ts FAR_REALM_INFO giants; narrative-bible.md section 1 (density)",
    caption: "Giants with picks cut into the wall of the world and carry out blocks of something that glows. Where they dug, the stone is thinner: you can almost see through it." },
  { id: "ironAndShell", since: 8, title: "The Iron and the Shell", motif: "mosaic", palette: ["#1a1a20", "#5a4868", "#b0a090"], source: "narrative-bible.md section 1 (the Pentagons: two forces meeting); great-buildings.ts hive; far-realms.ts FAR_CIVS storm",
    caption: "A city laid in two stones: one half plated iron, hammered; the other grown chitin, ridged. Neither built the other. Where they met, the seam became a street, and people walk it." },
  { id: "measureThatGrew", since: 8, title: "The Measure That Grew", motif: "frieze", palette: ["#1e1c18", "#8a7a50", "#e8d8a0"], source: "surveyor.ts SURVEYOR (Abel Corwin's chain)",
    caption: "A man pays out a chain along the wall. Each link is cut a little longer than the last, and by the far corner the links are as long as he is tall." },
  { id: "sevenBells", since: 8, title: "Seven Bells, Seven Roads", motif: "relief", palette: ["#1a1814", "#a08040", "#f8e0a0"], source: "bells.ts BELLS (the Seven Bells)",
    caption: "Seven bells hang over seven roads, and on each road someone has turned to listen. The founder's daughter stands where the roads begin, her hands still black from the mould." },
  { id: "whatAnswered", since: 8, title: "What Answered", motif: "constellation", palette: ["#040408", "#2a2050", "#c8b0ff"], source: "far-array.ts (the Listener); narrative-bible.md section 1",
    caption: "Stars, and among them a shape cut out of the stars: no outline, only where they are not. It is the shape of something leaning close to hear." },
  { id: "unclosingEye", since: 8, title: "The Eye That Does Not Close", motif: "mosaic", palette: ["#100e18", "#7a6ea8", "#e6e0ff"], source: "watcher.ts (the Watcher's sigil)",
    caption: "An eyelid, shut. Below it an eye, open. A stroke runs through both and on past the edge of the stone, and under them the tools for reaching it. The mosaic is unfinished at the edges, or it goes on." },
  { id: "theSieve", since: 8, title: "The Sieve", motif: "rule-figure", rule: { pascal: 2 }, palette: ["#101014", "#4a5a70", "#d8e8ff"], source: "landscape.ts RECKONING sieve (Pascal's triangle read mod 2)",
    caption: "Triangles inside triangles inside triangles, each made only by counting the two above it. Nobody drew the gaps. They arrived." },
  { id: "crossThatCrosses", since: 8, title: "The Cross That Keeps Crossing", motif: "rule-figure", rule: { cross: 3 }, palette: ["#14120e", "#7a6a40", "#f0e0a0"], source: "landscape.ts RECKONING cross (a Vicsek figure)",
    caption: "A cross, and at each of its ends and its middle a smaller cross, and so on down, until the stone is too coarse to say." },
  { id: "carpetOfHoles", since: 8, title: "The Carpet of Holes", motif: "rule-figure", rule: { carpet: 3 }, palette: ["#16100e", "#8a4a3a", "#f0c0a0"], source: "landscape.ts RECKONING carpet; pattern-dungeons.ts (Sierpinski carpets)",
    caption: "A square with its middle taken out, and every square left with its middle taken out. What remains is almost nothing, and it covers the whole wall." },
  { id: "ruleThirty", since: 8, title: "Rule Thirty", motif: "rule-figure", rule: { ca: 30 }, palette: ["#0e1012", "#5a6a6a", "#e0f0e8"], source: "pattern-dungeons.ts e30 (Chaos Warrens); elders.ts ruleRows",
    caption: "One lit stone at the top, a rule of eight cases, and below it a frieze that never repeats. The mason who cut it stopped, and did not know why it was right to stop there." },
  { id: "fiveSeats", since: 8, title: "Five Seats", motif: "relief", palette: ["#1a1616", "#7a6a6a", "#e0d0d0"], source: "pentagon.ts PENTAGON.relics (the Fivefold Court)",
    caption: "Five sit at five faces, none above the others. In the middle, a sixth seat no one carved a sitter for. Its stone is newer." },
  { id: "twoPages", since: 8, title: "Where Two Pages Meet", motif: "mosaic", palette: ["#121418", "#5a6a7a", "#f0c890"], source: "narrative-bible.md section 1 (a seam: two realities pressed together); pentagon.ts PENTAGON_LORE seam",
    caption: "Two grains of stone run toward each other and do not stop: they fold up into a ridge. Small pale things live along it, their faces pressed to the warmth." },
];
// Where each motif may go.
export const MURAL_PLACES = { frieze: ["wall"], relief: ["wall"], mosaic: ["wall", "floor", "ceiling"], "rule-figure": ["wall", "floor", "ceiling"], constellation: ["ceiling", "wall"] };
// How the Watcher's sigil shows in a Pentagon from version 8: over a share of an ordinary chamber's doors (every door of a hall).
export const PENTAGON_SIGILS = { since: 8, lintel: .35, hallLintel: 1 };

const mural = (id) => PENTAGON_MURALS.find((m) => m.id === id) || null;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ------------------------------------------------------------------------------------------------ the plan: which chambers
// Sets `hall` ({ type, murals }), `W` and `H` on the ring chambers that are halls (version `V`, from PENTAGON_HALLS.since).
// The kinds are dealt round in a hashed order so a Pentagon holds as many different halls as it has; the murals are dealt
// out across its halls so no two halls of one Pentagon share one until the table runs out. Hashes only: the plan's own
// random stream is untouched.
export function assignPentagonHalls(key, nodes, V) {
  const T = PENTAGON_HALLS; if (!(V >= T.since)) return [];
  const ring = nodes.filter((q) => q.kind === "outer" || q.kind === "inner").sort(byHash((q) => `${key}:hall:${q.id}`));
  const n = Math.min(ring.length, T.count[0] + hashSeed(`${key}:halls`) % (T.count[1] - T.count[0] + 1));
  const kinds = Object.keys(T.types).filter((k) => T.types[k].since <= V).sort(byHash((k) => `${key}:hall-kind:${k}`));
  const pool = PENTAGON_MURALS.filter((m) => m.since <= V).map((m) => m.id).sort(byHash((id) => `${key}:murals:${id}`));
  const out = [];
  ring.slice(0, n).sort((a, b) => a.n - b.n).forEach((q, i) => { const type = kinds[i % kinds.length], [W, H] = T.types[type].size;
    const murals = []; for (let k = 0; k < T.muralsPerHall; k++) murals.push(pool[(i * T.muralsPerHall + k) % pool.length]);
    q.hall = { type, murals }; q.W = W; q.H = H; q.floorKind = "grand"; out.push(q); }); // "grand": neither a hall of rooms nor a cellar maze
  return out;
}

// ------------------------------------------------------------------------------------------------ the floor plan
// The hall's tiles (the chamber's shape: `{ x, y, kind, blocked, detail, doorway }`), for a hall of `type` W × H with doors
// `open` (each { x, y, inner }) and the way in `arrive`. Columns, stands and the shaft are laid only where they keep every
// floor tile joined to the way in (checked; a feature that would cut any off is not laid). Wall kind `wall`.
export function layPentagonHall(base, type, W, H, open, arrive, wall) {
  const T = PENTAGON_HALLS, D = T.types[type], g = new Uint8Array(W * H), FLOOR = 0, WALL = 1, COL = 3, VOID = 5, TIER = 6, I = (x, y) => y * W + x;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x === 0 || y === 0 || x === W - 1 || y === H - 1) g[I(x, y)] = WALL;
  const doors = new Set(open.filter((p) => p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1).map((p) => I(p.x, p.y)));
  const keep = new Uint8Array(W * H), R = T.protect; // kept open: round each door's inner tile, and the way in
  for (const c of [...open.map((p) => p.inner), arrive]) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = c.x + dx, y = c.y + dy; if (x > 0 && y > 0 && x < W - 1 && y < H - 1) keep[I(x, y)] = 1; }
  const set = (x, y, v) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && !keep[I(x, y)]) g[I(x, y)] = v; };
  const cx = W >> 1, cy = H >> 1;
  if (type === "ballroom") { const { inset, every } = D.ring; // a ring of columns round the dance floor
    for (let x = inset; x <= W - 1 - inset; x += every) { set(x, inset, COL); set(x, H - 1 - inset, COL); }
    for (let y = inset; y <= H - 1 - inset; y += every) { set(inset, y, COL); set(W - 1 - inset, y, COL); } }
  else if (type === "arena") { const { margin, band, gate } = D.bowl, rx = cx - margin, ry = cy - margin; // stands round a bowl, four gates
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const dx = x - cx, dy = y - cy, d = Math.hypot(dx / rx, dy / ry);
      if (d >= 1 && d < 1 + band / Math.min(rx, ry) && Math.abs(dx) > gate && Math.abs(dy) > gate) set(x, y, TIER); } }
  else if (type === "gallery") { const { aisle, every } = D.piers; // two rows of piers down the length: a nave and its aisles
    for (let x = 3; x <= W - 4; x += every) { set(x, aisle, COL); set(x, H - 1 - aisle, COL); } }
  else if (type === "colonnade") { const { margin, every } = D.grid; // a forest of columns
    for (let y = margin; y <= H - 1 - margin; y += every) for (let x = margin; x <= W - 1 - margin; x += every) set(x, y, COL); }
  else if (type === "pitGallery") { const [mx, my] = D.pit.margin, b = D.pit.bridge; // an open shaft, a balcony all round, two bridges across
    for (let y = my; y <= H - 1 - my; y++) for (let x = mx; x <= W - 1 - mx; x++) if (Math.abs(y - cy) > b && Math.abs(x - cx) > b) set(x, y, VOID); }
  // joined: every floor tile reached from the way in; where not, the nearest features are taken away until it is
  const flood = () => { const seen = new Uint8Array(W * H), st = [I(arrive.x, arrive.y)]; seen[st[0]] = 1; let n = 1;
    while (st.length) { const k = st.pop(), x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const X = x + dx, Y = y + dy, K = I(X, Y); if (X < 0 || Y < 0 || X >= W || Y >= H || seen[K] || (g[K] !== FLOOR && !doors.has(K))) continue; seen[K] = 1; n++; st.push(K); } }
    return seen; };
  for (let round = 0; round < W + H; round++) { const seen = flood(); let cut = false;
    for (let k = 0; k < W * H; k++) if (!seen[k] && (g[k] === FLOOR || doors.has(k))) { cut = true; break; }
    if (!cut) break;
    for (let k = 0; k < W * H; k++) if (g[k] === COL || g[k] === VOID || g[k] === TIER) { const x = k % W, y = (k / W) | 0; if (N4.some(([dx, dy]) => seen[I(x + dx, y + dy)])) g[k] = FLOOR; } }
  // the floors: the main floor in the middle, its edge round the walls
  const tiles = [], edgeAt = (x, y) => type === "arena" ? Math.hypot((x - cx) / (cx - D.bowl.margin), (y - cy) / (cy - D.bowl.margin)) >= 1 : x <= 2 || y <= 2 || x >= W - 3 || y >= H - 3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = I(x, y), v = g[k];
    if (doors.has(k)) { tiles.push({ x, y, kind: edgeAt(x, y) ? D.edge : D.floor, blocked: false, doorway: true, detail: (x * 7 + y * 3) % 4, hall: type }); continue; }
    if (v === WALL) tiles.push({ x, y, kind: wall, blocked: true, detail: (x * 3 + y) % 4 });
    else if (v === COL) tiles.push({ x, y, kind: wall, blocked: true, detail: (x * 3 + y) % 4, hall: type, column: true });
    else if (v === TIER) tiles.push({ x, y, kind: wall, blocked: true, detail: (x * 3 + y) % 4, hall: type, tier: true });
    else if (v === VOID) tiles.push({ x, y, kind: "hallVoid", blocked: true, detail: (x * 7 + y * 3) % 4, hall: type, hallVoid: true });
    else tiles.push({ x, y, kind: edgeAt(x, y) ? D.edge : D.floor, blocked: false, doorway: false, detail: (x * 7 + y * 3) % 4, hall: type }); }
  for (const t of tiles) if (!t.blocked && N4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]).some(([dx, dy]) => tiles[I(t.x + dx, t.y + dy)]?.hallVoid)) t.balcony = true; // the rail round the shaft
  return tiles;
}

// ------------------------------------------------------------------------------------------------ a floor mural's pattern
// Is cell (i, j) of a floor mural lit? Computed from the mural's rule (a few digit reads or a precomputed row: no search).
function caRows(rule, w, h) { let row = new Uint8Array(w); row[w >> 1] = 1; const out = [row];
  for (let k = 1; k < h; k++) { const next = new Uint8Array(w); for (let i = 0; i < w; i++) next[i] = (rule >> ((row[(i + w - 1) % w] << 2) | (row[i] << 1) | row[(i + 1) % w])) & 1; out.push(next); row = next; }
  return out; }
export function muralPattern(m, w, h) {
  const R = m?.rule || {}, out = [], rows = R.ca !== undefined ? caRows(R.ca, w, h) : null, ox = w >> 1, oy = h >> 1;
  let digits = 1; while (3 ** digits < Math.max(w, h)) digits++; const mid = (3 ** digits - 1) / 2; // base-3 figures centred: the middle cell reads all 1s
  for (let j = 0; j < h; j++) { const line = []; for (let i = 0; i < w; i++) { let on;
    if (rows) on = !!rows[j][i];
    else if (R.pascal) on = ((i & j) === 0);
    else if (R.carpet || R.cross) { let a = i - ox + mid, b = j - oy + mid; on = true; for (let k = 0; k < digits; k++, a = Math.floor(a / 3), b = Math.floor(b / 3)) { const p = a % 3, q = b % 3; if (R.carpet ? p === 1 && q === 1 : !(p === 1 || q === 1)) on = false; } }
    else on = Math.max(Math.abs(i - ox), Math.abs(j - oy)) % 2 === 0; // rings
    line.push(on ? 1 : 0); } out.push(line); }
  return out;
}

// ------------------------------------------------------------------------------------------------ dressing: murals, sigils
const side = (W, H, x, y) => (y === 0 ? "north" : y === H - 1 ? "south" : x === 0 ? "west" : x === W - 1 ? "east" : null);
const inward = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };
// The hall's record, murals, sigils and backdrop (and the objects you read the murals by), laid on the chamber `c` as it is
// generated (its tiles, objects and creatures already placed). `q` the plan's node; `base` its Pentagon. Adds to
// `c.objects`, changes only `sigil` and `inlay` marks on tiles. Returns { hall, backdrop, murals, sigils }.
export function dressPentagonHall(c, base, q, V) {
  const T = PENTAGON_HALLS, D = T.types[q.hall.type], { W, H, tiles, objects } = c, key = `${base}:${q.id}`, h = (k) => hashSeed(`${key}:${k}`), at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : tiles[y * W + x]);
  const taken = new Set([...objects, ...c.enemySpawns].map((o) => Math.round(o.y) * W + Math.round(o.x)));
  const doorList = q.ports.filter((p) => side(W, H, p.x, p.y)), nearDoor = (x, y, r) => doorList.some((p) => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= r);
  const ceilingId = D.ceilings[h("ceiling") % D.ceilings.length], C = T.ceilings[ceilingId];
  const drops = PENTAGON_BACKDROPS.filter((b) => b.since <= V && b.ceilings.includes(ceilingId)), backdrop = drops.length ? drops[h("backdrop") % drops.length].id : null;
  const murals = [], sigils = [], used = new Set(), fits = (m, want) => m && m.since <= V && !used.has(m.id) && MURAL_PLACES[m.motif].includes(want);
  const place = (want) => { // from the hall's own pool first; else (a ceiling or floor with no mural of its kind dealt) any that fits, by hash
    const m = q.hall.murals.map(mural).find((m) => fits(m, want)) || [...PENTAGON_MURALS].sort(byHash((m) => `${key}:spare:${want}:${m.id}`)).find((m) => fits(m, want));
    if (m) used.add(m.id); return m || null; };
  const free = (x, y) => { const t = at(x, y); return t && !t.blocked && !t.doorway && !t.plate && !taken.has(y * W + x); };
  const readAt = (m, x, y, where, name) => { taken.add(y * W + x); objects.push({ id: `pent-mural-${murals.length}`, kind: "pentMural", muralId: m.id, place: where, name: `${name} · ${m.title}`, x, y, state: "waiting", actions: ["read"], lore: m.caption }); };
  // the ceiling: one scene over the middle of the hall, read from the nearest open floor below it
  { const m = place("ceiling"); if (m) { const mx = W >> 1, my = H >> 1, spots = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (free(x, y)) spots.push({ x, y, d: Math.hypot(x - mx, y - my) });
      spots.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x); const s = spots.find((p) => p.d >= 2) || spots[0];
      if (s) { readAt(m, s.x, s.y, "ceiling", T.names.ceiling); murals.push({ x: mx, y: my, side: "ceiling", muralId: m.id, scale: Math.floor(Math.min(W, H) / 2) - 2, place: "ceiling" }); } } }
  // the floor: the Watcher's sigil in full, or a floor mural inlaid in lit and dark lines
  if (D.inlay === "sigil") { const mx = W >> 1, my = (H >> 1) - 1, ok = (t) => !!t && !t.blocked && !t.doorway && !t.plate;
    const spot = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => ({ x: mx + dx, y: my + dy })).find((p) => sigilFits(c, W, p.x, p.y, ok, -1));
    if (spot) { inlaySigil(c, W, spot.x, spot.y); sigils.push({ x: spot.x, y: spot.y, kind: "inlay", scale: SIGIL_BOUNDS.maxY - SIGIL_BOUNDS.minY + 1 }); } }
  else if (D.inlay === "mural") { const m = place("floor"); if (m) { const [pw, ph] = D.patch, x0 = (W >> 1) - (pw >> 1), y0 = (H >> 1) - (ph >> 1), P = muralPattern(m, pw, ph); let laid = 0;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) { const t = at(x0 + i, y0 + j); if (!t || t.blocked || t.doorway || t.sigil) continue; tiles[(y0 + j) * W + x0 + i] = { ...t, inlay: P[j][i] ? 2 : 1 }; laid++; }
      const s = [[pw >> 1, ph + 1], [pw >> 1, -2], [-2, ph >> 1], [pw + 1, ph >> 1]].map(([i, j]) => ({ x: x0 + i, y: y0 + j })).find((p) => free(p.x, p.y));
      if (laid && s) { readAt(m, s.x, s.y, "floor", T.names.floor); murals.push({ x: x0 + (pw >> 1), y: y0 + (ph >> 1), side: "floor", muralId: m.id, scale: pw, w: pw, h: ph, place: "floor" }); } else used.delete(m.id); } }
  // the walls: murals in turn round them, spaced, clear of the doors, each read from the floor before it
  const wallCells = (s) => { const out = []; if (s === "north" || s === "south") { const y = s === "north" ? 0 : H - 1; for (let x = 2; x <= W - 3; x++) out.push({ x, y }); } else { const x = s === "west" ? 0 : W - 1; for (let y = 2; y <= H - 3; y++) out.push({ x, y }); } return out; };
  const marks = []; // wall tiles carrying a mural or banner
  const wantM = D.murals[0] + h("murals") % (D.murals[1] - D.murals[0] + 1);
  for (let k = 0, tries = 0; murals.filter((m) => m.place === "wall").length < wantM && tries < T.wallOrder.length * 3; tries++, k++) {
    const s = T.wallOrder[k % T.wallOrder.length], [ix, iy] = inward[s], m = place("wall"); if (!m) break;
    const cand = wallCells(s).filter(({ x, y }) => free(x + ix, y + iy) && !nearDoor(x, y, T.doorClear) && marks.every((o) => Math.hypot(o.x - x, o.y - y) >= T.muralSpacing)).sort(byHash((p) => `${key}:mural-at:${p.x},${p.y}`));
    if (!cand.length) { used.delete(m.id); continue; }
    const p = cand[0], scale = m.motif === "frieze" ? 5 : 3; marks.push(p); readAt(m, p.x + ix, p.y + iy, "wall", T.names.mural); murals.push({ x: p.x, y: p.y, side: s, muralId: m.id, scale, place: "wall" }); }
  // the Watcher's sigil: over every door of a hall, hung as banners, cut on columns
  for (const p of doorList) sigils.push({ x: p.x, y: p.y, kind: "lintel", side: side(W, H, p.x, p.y) });
  const wantB = D.banners[0] + h("banners") % (D.banners[1] - D.banners[0] + 1);
  for (let k = 0, n = 0; n < wantB && k < T.wallOrder.length * 2; k++) { const s = T.wallOrder[k % 3], [ix, iy] = inward[s];
    const cand = wallCells(s).filter(({ x, y }) => { const t = at(x + ix, y + iy); return t && !t.blocked && !nearDoor(x, y, T.doorClear) && marks.every((o) => Math.hypot(o.x - x, o.y - y) >= T.bannerSpacing); }).sort(byHash((p) => `${key}:banner:${p.x},${p.y}`));
    if (!cand.length) continue; marks.push(cand[0]); sigils.push({ x: cand[0].x, y: cand[0].y, kind: "banner", side: s }); n++; }
  const cols = tiles.filter((t) => t.column).sort(byHash((t) => `${key}:column-sigil:${t.x},${t.y}`)).slice(0, D.columnSigils);
  for (const t of cols) sigils.push({ x: t.x, y: t.y, kind: "column" });
  // structures for Close View: chandeliers, statues, skylights, censers, chains, on open floor (or the stands) of the hall
  const features = []; for (const [want, n, need, instead] of D.features) { const kind = need && !C[need] ? instead : want; /* a skylight only under a skylit ceiling */ const spots = tiles.filter((t) => kind === "statue" ? t.tier : kind === "chain" ? t.hallVoid : !t.blocked && !t.doorway).sort(byHash((t) => `${key}:feature:${kind}:${t.x},${t.y}`));
    for (const t of spots) { if (features.filter((f) => f.kind === kind).length >= n) break; if (features.every((f) => Math.hypot(f.x - t.x, f.y - t.y) >= 6)) features.push({ kind, x: t.x, y: t.y }); } }
  const hall = { type: q.hall.type, name: D.name, tall: true, ceiling: ceilingId, ceilingHeight: C.height, open: C.open, sky: C.sky, backdrop, features };
  return { hall, backdrop, murals, sigils };
}
// An ordinary chamber of a version 8 Pentagon: the Watcher's sigil over a share of its doors. Returns the sigils.
export function pentagonChamberSigils(base, q, W, H, V) {
  if (!(V >= PENTAGON_SIGILS.since)) return [];
  return q.ports.filter((p) => side(W, H, p.x, p.y) && (hashSeed(`${base}:${q.id}:lintel:${p.x},${p.y}`) % 1000) / 1000 < PENTAGON_SIGILS.lintel).map((p) => ({ x: p.x, y: p.y, kind: "lintel", side: side(W, H, p.x, p.y) }));
}

// ------------------------------------------------------------------------------------------------ reading a mural
const readList = (save) => (Array.isArray(save?.lore?.murals) ? save.lore.murals : []);
// Reading a mural: its title and caption; the first time, remembered (save.lore.murals). Returns { ok, first, title, text, message }.
export function readPentagonMural(save, o) {
  const m = mural(o?.muralId); if (!m) return { ok: false, message: PENTAGON_HALLS.messages.worn };
  const lore = (save.lore ||= {}), list = Array.isArray(lore.murals) ? lore.murals : (lore.murals = []), first = !list.includes(m.id);
  if (first) list.push(m.id); o.state = "read";
  const text = `${m.title}. ${m.caption}`; return { ok: true, first, title: m.title, text, message: text };
}
// A chamber's murals as this journey left them: those already read show as read.
export function pentagonMuralsState(save, map) { const read = new Set(readList(save)); for (const o of map?.objects || []) if (o.kind === "pentMural" && read.has(o.muralId)) o.state = "read"; return map; }
export const pentagonMuralsRead = (save) => { const read = new Set(readList(save)); return PENTAGON_MURALS.filter((m) => read.has(m.id)); };
