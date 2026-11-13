// The Mountain Turtle's shell (Tim, 2026-11-04: "when you kill the turtle you should be able to walk up into the hole — the
// gateway that's in his shell — and that should be a labyrinth dungeon inside there").
//
// When the Turtle falls on the overworld its great shell stays where it fell: a landmark of TURTLE_SHELL.footprint tiles,
// walked around, with the tomb door of its second terrace (the gateway) facing south onto open ground. Through the gateway
// is the Shell-Labyrinth, an ordinary labyrinth (labyrinths.ts, style `shell`) seeded by the kill, entered at the current
// interior version like any labyrinth first entered now. Its vault pays either a Tesseract glyph or Divine Viscera
// (`vault`), decided by the kill.
//
// Nothing here is generation: a shell is a small record in `save.turtleShells` (one per kill, from this release on), and
// loading its section lays the shell over the generated tiles at runtime. A section with no record is exactly as generated.
// One shell stands at a time (`keep`): the next Turtle's fall fades the old one (its labyrinth's state is dropped), and the next
// visit to where it lay says so.
import { hashSeed } from "./random.js?v=r948-c8651a95a1b1";
import { LABYRINTHS } from "./labyrinths.js?v=r948-c8651a95a1b1";
import { coherenceCore, coherenceHub, joinsCore, LETHAL_KINDS } from "./landscape.js?v=r948-c8651a95a1b1";

export const TURTLE_SHELL = {
  version: 1,
  beast: "mountainTurtle",
  keep: 1, remember: 6, // Tim (2026-11-04): one shell at a time, until the next Turtle falls; faded ones remembered for their message
  footprint: { half: 2, rows: 3 }, // 5 tiles wide (x - 2 .. x + 2), 3 deep (y - 2 .. y); the gateway is the tile below (x, y + 1)
  margin: 2, // never closer than this to a section's edge
  search: 400, // candidate spots tried, nearest the fall first
  shore: 12, preferPlaza: 6, // at sea: a shore's ground holds this many tiles; a spot joined to the plaza wins unless this much farther
  skirt: { kind: "beach", landscape: "coast" }, // in open sea with nowhere to rest, a ring of this ground round the shell
  style: "shell",
  vault: { tesseract: .5, viscera: 3 }, // its vault pays a Tesseract glyph this share of shells, else this much Divine Viscera
  sprite: { scale: 4.6, w: 1.6, h: .95, foot: .78, max: 4, dim: "rgba(26,24,22,.2)" }, // drawing (monster-render.ts drawTurtleShell)
  name: "The Mountain Turtle's Shell",
  gate: "The Shell-Labyrinth",
  messages: {
    rest: "Its great shell settles where it fell, still as a tomb. In its side, the gateway stands open.",
    skirt: "Its great shell settles into the sea, and the shallows heap up round it in a ring of sand. In its side, the gateway stands open.",
    none: "Its great shell sinks out of sight. There is nowhere here for it to rest.",
    fade: "The Mountain Turtle's shell that lay here is gone: worn back into the land, and the labyrinth inside it with it.",
    lore: "The Mountain Turtle's shell, empty and cold. The tomb door in its side opens on a maze: one way through, one real end.",
  },
};

const I = (x, y) => y * 32 + x;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const marine = (t) => !!t && (t.kind === "ocean" || t.kind === "deepOcean" || !!t.seaIce); // the Turtle's sea ice thaws: it is open sea
const FIXED = (t) => !!t && !!(t.structure || t.buildingId || t.greatBuilding || t.courtyard || t.keep || t.keepPart || t.canopy || t.mushroom || t.causeway || t.castle || t.landscape === "castle" || t.skyPlatform || t.kind === "skyBridge" || t.kind === "bridge" || t.kind === "logBridge" || t.kind === "dock" || t.kind === "voidScar" || t.pit || t.chasm || t.turtleShell || t.shellSkirt || t.seaIce || (t.environment && t.environment !== "tree"));

// The labyrinth behind a shell's gateway: its base id (labyrinths.ts ids, style `shell`), from the kill.
export const shellLabyrinthBase = (seed, cycle, rx, ry) => `labyrinth:${seed}~shell${cycle}:${rx}:${ry}:${TURTLE_SHELL.style}`;
export const shellId = (cycle) => `turtle-shell-${cycle}`;
// What its vault pays (pure): "tesseract" or "viscera".
export function shellVaultReward(base) { return (hashSeed(`${base}:vault:v1`) % 10000) / 10000 < TURTLE_SHELL.vault.tesseract ? "tesseract" : "viscera"; }
export const isShellLabyrinth = (base) => String(base || "").endsWith(`:${TURTLE_SHELL.style}`) && String(base).startsWith("labyrinth:");

// ------------------------------------------------------------------------------------------------ the save record
const whole = (v) => Number.isInteger(v);
function cleanShell(r) {
  if (!r || typeof r !== "object") return null;
  if (!whole(r.cycle) || !whole(r.rx) || !whole(r.ry) || !whole(r.x) || !whole(r.y) || typeof r.lab !== "string" || !r.lab) return null;
  return { ...r, id: typeof r.id === "string" && r.id ? r.id : shellId(r.cycle), skirt: !!r.skirt };
}
// Normalised in freshSave and migrateSave (types.ts): additive at schema 14, unknown fields kept.
export function ensureTurtleShells(save) {
  const prev = save.turtleShells && typeof save.turtleShells === "object" && !Array.isArray(save.turtleShells) ? save.turtleShells : {};
  const list = (Array.isArray(prev.list) ? prev.list : []).map(cleanShell).filter(Boolean);
  const faded = (Array.isArray(prev.faded) ? prev.faded : []).filter((f) => f && whole(f.rx) && whole(f.ry)).map((f) => ({ ...f }));
  save.turtleShells = { ...prev, version: TURTLE_SHELL.version, list, faded };
  return save.turtleShells;
}
export const shellsAt = (save, rx, ry) => (save.turtleShells?.list || []).filter((r) => r.rx === rx && r.ry === ry);
// Record a new shell; the oldest past `keep` fade (returned, so the caller can drop their labyrinths' state).
export function addShell(save, rec) {
  const S = ensureTurtleShells(save); if (S.list.some((r) => r.id === rec.id)) return [];
  S.list.push(rec); const gone = [];
  while (S.list.length > TURTLE_SHELL.keep) { const old = S.list.shift(); gone.push(old); S.faded.push({ id: old.id, rx: old.rx, ry: old.ry, lab: old.lab }); }
  while (S.faded.length > TURTLE_SHELL.remember) S.faded.shift();
  for (const old of gone) dropLabyrinth(save, old.lab);
  return gone;
}
// A faded shell's labyrinth: its chambers' histories and snapshots go with it (it can never be entered again).
export function dropLabyrinth(save, base) {
  const pre = `${base}:f`, D = save.consequences?.dungeons || {}, A = save.session?.areas || {};
  for (const k of Object.keys(D)) if (k.startsWith(pre)) delete D[k];
  for (const k of Object.keys(A)) if (k.startsWith(pre)) delete A[k];
}
// The faded shells of this section: removed from the record, so their message is told once.
export function takeFaded(save, rx, ry) {
  const S = save.turtleShells; if (!S?.faded?.length) return [];
  const here = S.faded.filter((f) => f.rx === rx && f.ry === ry); if (here.length) S.faded = S.faded.filter((f) => !here.includes(f));
  return here;
}

// ------------------------------------------------------------------------------------------------ where it rests
export const shellCells = (x, y) => { const F = TURTLE_SHELL.footprint, out = []; for (let dy = -F.rows + 1; dy <= 0; dy++) for (let dx = -F.half; dx <= F.half; dx++) out.push({ x: x + dx, y: y + dy }); return out; };
const skirtCells = (x, y) => { const F = TURTLE_SHELL.footprint, out = []; for (let dy = -F.rows; dy <= 1; dy++) for (let dx = -F.half - 1; dx <= F.half + 1; dx++) if (dy === -F.rows || dy === 1 || Math.abs(dx) === F.half + 1) out.push({ x: x + dx, y: y + dy }); return out; };
// The exit lanes and the plaza (as labyrinths.ts placeLabyrinth keeps them clear).
function laneOrPlaza(map, x, y) {
  const ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1, between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  return (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 13 && x <= 19 && y >= 13 && y <= 19);
}
const occupied = (map) => { const s = new Set(); for (const o of map.objects || []) if (!o.decor && Number.isFinite(o.x) && Number.isFinite(o.y)) s.add(I(Math.round(o.x), Math.round(o.y))); return s; };
const standable = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !t.hole;
// The interactable spots of the section (doors, shrines, chests, ways in): those that join the core must still join it.
const spots = (map) => (map.objects || []).filter((o) => Array.isArray(o.actions) && o.actions.length && Number.isFinite(o.x) && Number.isFinite(o.y));

// A shore a skiff can land on: the gateway's ground (walked, a level at a step) holds `shore` tiles and meets the open sea.
function landing(map, p) {
  const T = map.tiles, seen = new Uint8Array(1024), q = [I(p.x, p.y)]; seen[q[0]] = 1; let sea = false;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % 32, y = (i - x) / 32;
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = I(nx, ny); if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j]) continue; const t = T[j];
      if (marine(t)) { sea = true; continue; } if (!standable(t) || Math.abs((t.elev || 0) - (T[i].elev || 0)) > 1) continue; seen[j] = 1; q.push(j); } }
  return sea && q.length >= TURTLE_SHELL.shore;
}
// Where a shell fallen at `at` rests (pure; the map is left as it was): { x, y, skirt } or null.
//   on ground: the nearest spot whose footprint is plain open ground (any height, all one level, no lane, plaza, object or
//   structure), whose gateway tile is open ground joined to the plaza and back (landscape.ts coherence core) or, at sea, on a
//   shore a skiff can land on (taken only when it is `preferPlaza` tiles nearer than any joined spot), and which leaves
//   every exit that was open, open, and every door, shrine or cache that joined the core, joined;
//   at sea with no such spot: the nearest spot of open water clear of the lanes, ringed by a skirt of sand (a skiff lands on it).
export function placeTurtleShell(map, at, { player = null, exitsOpen = null, seed = "", cycle = 0 } = {}) {
  if (!map?.tiles || map.tiles.length !== 1024) return null;
  if (map.tiles.some((t) => t?.seaIce)) map = { ...map, tiles: map.tiles.map((t) => (t?.seaIce ? { ...t, kind: "ocean", blocked: true, seaIce: false } : t)) }; // judged as it will load: without the ice
  const F = TURTLE_SHELL.footprint, M = TURTLE_SHELL.margin, fx = Math.round(Number(at?.x) || 16), fy = Math.round(Number(at?.y) || 16);
  const pk = player ? I(Math.round(player.x), Math.round(player.y)) : -1, objs = occupied(map), T = map.tiles;
  const cands = []; for (let y = M + F.rows - 1; y <= 31 - M - 1; y++) for (let x = M + F.half; x <= 31 - M - F.half; x++) cands.push({ x, y, d: Math.hypot(x - fx, y - fy - .5) + (hashSeed(`${seed}:turtle-shell:${cycle}:${x},${y}`) % 997) / 1e5 });
  cands.sort((a, b) => a.d - b.d);
  const hub = coherenceHub(map), core0 = hub >= 0 ? coherenceCore(map, hub) : null, exits0 = exitsOpen ? exitsOpen(map) : null;
  const joined0 = core0 ? spots(map).filter((o) => joinsCore(map, o, core0)) : [];
  let tried = 0, A = null, B = null; // A: a gateway joined to the plaza; B: one on a shore a skiff can land on
  for (const c of cands) {
    if (tried >= TURTLE_SHELL.search || A || (B && c.d > B.d + TURTLE_SHELL.preferPlaza)) break;
    const cells = shellCells(c.x, c.y), front = T[I(c.x, c.y + 1)], lv = T[I(c.x, c.y)]?.elev || 0;
    if (!cells.every((p) => { const t = T[I(p.x, p.y)]; return standable(t) && !FIXED(t) && !t.slope && (t.elev || 0) === lv && !laneOrPlaza(map, p.x, p.y) && !objs.has(I(p.x, p.y)) && I(p.x, p.y) !== pk; })) continue;
    if (!standable(front) || FIXED(front) || objs.has(I(c.x, c.y + 1)) || Math.abs((front.elev || 0) - lv) > 1) continue;
    tried++;
    const keep = cells.map((p) => T[I(p.x, p.y)]); cells.forEach((p, i) => { T[I(p.x, p.y)] = { ...keep[i], blocked: true }; });
    try {
      const core = core0 ? coherenceCore(map, hub) : null, gate = { x: c.x, y: c.y + 1 };
      let ok = !core || (!!core[hub] && joined0.every((o) => joinsCore(map, o, core)) && (pk < 0 || !core0[pk] || !!core[pk]));
      if (ok && exits0) { const after = exitsOpen(map); ok = exits0.every((o, i) => !o || after[i]); }
      if (ok && core && joinsCore(map, gate, core)) A = c; else if (ok && !B && landing(map, gate)) B = c;
    } finally { cells.forEach((p, i) => { T[I(p.x, p.y)] = keep[i]; }); }
  }
  if (A || B) return { x: (A || B).x, y: (A || B).y, skirt: false };
  // open sea: a ring of sand round it, clear of the exit lanes (boats cross there) and the plaza
  for (const c of cands) {
    const cells = shellCells(c.x, c.y), ring = skirtCells(c.x, c.y), all = [...cells, ...ring];
    if (!all.every((p) => p.x >= 1 && p.y >= 1 && p.x <= 30 && p.y <= 30 && !laneOrPlaza(map, p.x, p.y) && !objs.has(I(p.x, p.y)) && I(p.x, p.y) !== pk)) continue;
    if (!all.every((p) => { const t = T[I(p.x, p.y)]; return t && !FIXED(t) && (marine(t) || (standable(t) && !(t.elev > 0))); })) continue;
    if (!cells.some((p) => marine(T[I(p.x, p.y)]))) continue; // it only heaps sand where it lies in the sea
    return { x: c.x, y: c.y, skirt: true };
  }
  return null;
}

// Lay a recorded shell over a loaded section (idempotent): its footprint blocked, a skirt of sand if it has one, decor under
// it cleared, and its two objects: the shell (drawn) and the gateway (a labyrinth door: Act to enter).
export function applyTurtleShell(map, rec) {
  if (!map?.tiles || map.tiles.length !== 1024 || (map.objects || []).some((o) => o.id === rec.id)) return false;
  const T = map.tiles, K = TURTLE_SHELL.skirt, cells = shellCells(rec.x, rec.y), set = new Set(cells.map((p) => I(p.x, p.y)));
  const under = ((map._shellUnder ||= {})[rec.id] = []); for (const p of [...cells, ...(rec.skirt ? skirtCells(rec.x, rec.y) : [])]) { const i = I(p.x, p.y); if (T[i]) under.push([i, T[i]]); } // the ground it covers, for liftTurtleShell
  for (const p of cells) { const i = I(p.x, p.y), t = T[i]; if (!t) continue; T[i] = { ...t, ...(rec.skirt ? { kind: K.kind, landscape: K.landscape, elev: 0, slope: false } : {}), blocked: true, seaIce: undefined, turtleShell: rec.id }; }
  if (rec.skirt) for (const p of skirtCells(rec.x, rec.y)) { const i = I(p.x, p.y), t = T[i]; if (t && marine(t)) T[i] = { ...t, kind: K.kind, landscape: K.landscape, blocked: false, elev: 0, slope: false, seaIce: undefined, shellSkirt: rec.id }; }
  map.objects = (map.objects || []).filter((o) => !(o.decor && set.has(I(Math.round(o.x), Math.round(o.y)))));
  const F = TURTLE_SHELL.footprint, front = { x: rec.x, y: rec.y + 1 };
  map.objects.push({ id: rec.id, kind: "turtleShell", name: TURTLE_SHELL.name, x: rec.x, y: rec.y, bounds: { x: rec.x - F.half, y: rec.y - F.rows + 1, w: F.half * 2 + 1, h: F.rows }, footprint: cells, state: "still", actions: [], landmark: true, lore: TURTLE_SHELL.messages.lore });
  map.objects.push({ id: `${rec.id}-gate`, kind: "dungeon", buildingDoor: true, shellGate: true, buildingDoors: { rx: rec.rx, ry: rec.ry, front, exits: {}, hatch: null }, dungeonId: `${rec.lab}:f1`, dungeonType: "labyrinth", name: TURTLE_SHELL.gate, identity: "the gateway in the Mountain Turtle's shell", x: front.x, y: front.y, state: "open", actions: ["enter"], landmark: true, lore: `${TURTLE_SHELL.gate}: ${LABYRINTHS.messages.arrive.replace(/^A labyrinth stands here: /, "")}` });
  return true;
}
// A shell fading while its section is loaded (the next Turtle fell here): its ground and objects as they were before it lay.
export function liftTurtleShell(map, id) {
  const under = map?._shellUnder?.[id]; if (!under) return false;
  for (const [i, t] of under) if (map.tiles[i]?.turtleShell === id || map.tiles[i]?.shellSkirt === id) map.tiles[i] = t;
  map.objects = (map.objects || []).filter((o) => o.id !== id && o.id !== `${id}-gate`); delete map._shellUnder[id]; return true;
}
