// Underlands v1: dungeon generator 5. Wider layout variety (six grammars, varied room shapes, random orientation)
// and, in a share of dungeons, bespoke underground environments built on the Landscape Pack's tile and elevation
// technology: chasm canyons, lava bogs, underground rivers, frozen grottoes with falling snow, bone crypts and fungal
// hollows. It returns the same map contract as generator 4 (entry/exit, chest, trap, guardian spawn), so encounters,
// discovery, completion and the monster pack work unchanged. Histories pinned to generators 2-4 never see it.
import { rng, hashSeed } from "./random.js?v=icp_7735097479a04c2f8b0f6e26_c7cc908aedff552f";
import { annotateDungeon, DUNGEON_SIZE_PROFILES } from "./dungeon-framework.js?v=icp_7735097479a04c2f8b0f6e26_c7cc908aedff552f";
import { DUNGEON_LAYOUT_VERSION } from "./dungeon-variation.js?v=icp_7735097479a04c2f8b0f6e26_c7cc908aedff552f";
import { LANDSCAPE_VERSION, ensureReturnable, trappedTiles, addRamps } from "./landscape.js?v=icp_7735097479a04c2f8b0f6e26_c7cc908aedff552f";

export const DUNGEON_GENERATOR_V5 = 5;
export const LAYOUTS = ["spine", "hub", "ring", "cavern", "crypt", "descent"];
export const UNDER_THEMES = {
  chasm: { id: "chasm", name: "Sunless Chasm", weather: null, lore: "The floor gives way to a canyon with no bottom. Stairs cling to its walls." },
  lavaBog: { id: "lavaBog", name: "Lava Bog", weather: "embers", lore: "Molten pools breathe under a crust of ash. Sparks rise where no wind blows." },
  river: { id: "river", name: "Underground River", weather: "drip", lore: "A black river runs through the dark, crossed only by old bridges." },
  frozen: { id: "frozen", name: "Frozen Grotto", weather: "snow", lore: "Snow falls from a ceiling no one has seen. Is this a place, or somewhere else?" },
  boneCrypt: { id: "boneCrypt", name: "Bone Crypt", weather: null, lore: "Rows of sealed sarcophagi. Some lids are not quite closed." },
  fungal: { id: "fungal", name: "Fungal Hollow", weather: "spores", lore: "Glowing caps the size of trees. The air is thick with drifting spores." },
};
const THEME_IDS = Object.keys(UNDER_THEMES);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---------------------------------------------------------------- carving primitives (width-aware)
function makeGrid(w, h) { return new Uint8Array(w * h); }
function inside(w, h, x, y) { return x >= 1 && y >= 1 && x < w - 1 && y < h - 1; }
function carve(g, w, h, x, y) { if (inside(w, h, x, y)) g[y * w + x] = 1; }
function room(g, w, h, cx, cy, r, shape, rand) {
  const rx = r + (shape === "hall" ? 2 : 0), ry = r;
  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    const dx = x - cx, dy = y - cy;
    const keep = shape === "circle" ? dx * dx + dy * dy <= r * r + r
      : shape === "cross" ? (Math.abs(dx) <= 1 && Math.abs(dy) <= r) || (Math.abs(dy) <= 1 && Math.abs(dx) <= r)
      : shape === "octagon" ? Math.abs(dx) + Math.abs(dy) <= r * 1.5 && Math.abs(dx) <= r && Math.abs(dy) <= r
      : shape === "irregular" ? Math.abs(dx) <= r && Math.abs(dy) <= r && rand() > .12
      : Math.abs(dx) <= rx && Math.abs(dy) <= ry;
    if (keep) carve(g, w, h, x, y);
  }
}
function corridor(g, w, h, a, b, width = 1, bend = 0) {
  const path = [];
  const hFirst = bend % 2 === 0;
  const seg = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) path.push([Math.round(x0 + (x1 - x0) * k / (n || 1)), Math.round(y0 + (y1 - y0) * k / (n || 1))]); };
  if (hFirst) { seg(a.x, a.y, b.x, a.y); seg(b.x, a.y, b.x, b.y); } else { seg(a.x, a.y, a.x, b.y); seg(a.x, b.y, b.x, b.y); }
  for (const [x, y] of path) for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) carve(g, w, h, x + dx - (width >> 1), y + dy - (width >> 1));
}
function bfs(g, w, h, from) {
  const dist = new Int32Array(w * h).fill(-1), q = [from.y * w + from.x];
  if (!g[q[0]]) return dist;
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) { const c = q[i], x = c % w, y = Math.floor(c / w); for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * w + nx; if (inside(w, h, nx, ny) && g[n] && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } } }
  return dist;
}
const SHAPES = ["rect", "circle", "cross", "octagon", "irregular", "hall"];

// ---------------------------------------------------------------- layout grammars
function layout(kind, g, w, h, rand, start, goal) {
  const rooms = [start, goal], shape = () => SHAPES[Math.floor(rand() * SHAPES.length)], size = () => 2 + Math.floor(rand() * 3);
  if (kind === "spine" || kind === "descent") {
    const n = kind === "descent" ? 7 + Math.floor(rand() * 4) : 6 + Math.floor(rand() * 4), pts = [start];
    for (let i = 1; i < n; i++) { const t = i / n, wob = kind === "descent" ? Math.sin(t * Math.PI * (2 + rand() * 2)) * .3 : (rand() - .5) * .45; pts.push({ x: Math.round(start.x + (goal.x - start.x) * t + wob * (goal.y - start.y)), y: Math.round(start.y + (goal.y - start.y) * t - wob * (goal.x - start.x)) }); }
    pts.push(goal);
    for (const p of pts) { p.x = Math.max(4, Math.min(w - 5, p.x)); p.y = Math.max(4, Math.min(h - 5, p.y)); }
    for (let i = 1; i < pts.length; i++) corridor(g, w, h, pts[i - 1], pts[i], kind === "descent" ? 3 : 1 + (rand() < .3 ? 1 : 0), i);
    for (const p of pts) if (kind === "spine" || rand() < .45) { room(g, w, h, p.x, p.y, size(), shape(), rand); rooms.push(p); }
    for (let i = 0; i < 3 + Math.floor(rand() * 3); i++) { const a = pts[1 + Math.floor(rand() * (pts.length - 2))], b = { x: Math.max(4, Math.min(w - 5, a.x + Math.round((rand() - .5) * 18))), y: Math.max(4, Math.min(h - 5, a.y + Math.round((rand() - .5) * 18))) }; corridor(g, w, h, a, b, 1, i); room(g, w, h, b.x, b.y, size(), shape(), rand); rooms.push(b); }
  } else if (kind === "hub") {
    const hub = { x: w >> 1, y: h >> 1 }, wings = 4 + Math.floor(rand() * 3);
    room(g, w, h, hub.x, hub.y, 5 + Math.floor(rand() * 3), rand() < .5 ? "circle" : "octagon", rand); rooms.push(hub);
    corridor(g, w, h, start, hub, 2, 0); corridor(g, w, h, hub, goal, 2, 1);
    for (let i = 0; i < wings; i++) { const a = i * Math.PI * 2 / wings + rand() * .4, r = Math.min(w, h) * (.3 + rand() * .12), p = { x: Math.round(hub.x + Math.cos(a) * r), y: Math.round(hub.y + Math.sin(a) * r) }; p.x = Math.max(4, Math.min(w - 5, p.x)); p.y = Math.max(4, Math.min(h - 5, p.y)); corridor(g, w, h, hub, p, 1, i); room(g, w, h, p.x, p.y, size(), shape(), rand); rooms.push(p); }
  } else if (kind === "ring") {
    const cx = w >> 1, cy = h >> 1, rx = (w >> 1) - 7, ry = (h >> 1) - 7;
    for (let a = 0; a < Math.PI * 2; a += .02) for (let b = -1; b <= 1; b++) carve(g, w, h, Math.round(cx + Math.cos(a) * (rx + b)), Math.round(cy + Math.sin(a) * (ry + b)));
    const near = (p) => { const a = Math.atan2((p.y - cy) / ry, (p.x - cx) / rx); return { x: Math.round(cx + Math.cos(a) * rx), y: Math.round(cy + Math.sin(a) * ry) }; };
    corridor(g, w, h, start, near(start), 2, 0); corridor(g, w, h, goal, near(goal), 2, 1);
    for (let i = 0; i < 4 + Math.floor(rand() * 3); i++) { const a = rand() * Math.PI * 2, p = { x: Math.round(cx + Math.cos(a) * rx * (rand() < .5 ? .45 : 1.25)), y: Math.round(cy + Math.sin(a) * ry * (rand() < .5 ? .45 : 1.25)) }; p.x = Math.max(4, Math.min(w - 5, p.x)); p.y = Math.max(4, Math.min(h - 5, p.y)); corridor(g, w, h, p, near(p), 1, i); room(g, w, h, p.x, p.y, size(), shape(), rand); rooms.push(p); }
    if (rand() < .6) { room(g, w, h, cx, cy, 3, "circle", rand); corridor(g, w, h, { x: cx, y: cy }, near({ x: cx + 1, y: cy }), 1, 0); rooms.push({ x: cx, y: cy }); } // inner sanctum
  } else if (kind === "cavern") {
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) g[y * w + x] = rand() < .55 ? 1 : 0;
    for (let it = 0; it < 5; it++) { const next = g.slice(); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[(y + dy) * w + x + dx]) n++; next[y * w + x] = n >= 5 ? 1 : 0; } g.set(next); }
    for (let x = 0; x < w; x++) { g[x] = 0; g[(h - 1) * w + x] = 0; } for (let y = 0; y < h; y++) { g[y * w] = 0; g[y * w + w - 1] = 0; }
    room(g, w, h, start.x, start.y, 2, "circle", rand); room(g, w, h, goal.x, goal.y, 3, "circle", rand);
  } else if (kind === "crypt") {
    const step = 6, ox = 3 + Math.floor(rand() * 3), oy = 3 + Math.floor(rand() * 3);
    for (let y = oy; y < h - 3; y += step) corridor(g, w, h, { x: 3, y }, { x: w - 4, y }, 1, 0);
    for (let x = ox; x < w - 3; x += step) if (rand() < .7) corridor(g, w, h, { x, y: 3 }, { x, y: h - 4 }, 1, 1);
    for (let y = oy + 3; y < h - 4; y += step) for (let x = ox + 3; x < w - 4; x += step) if (rand() < .55) { room(g, w, h, x, y, 1 + Math.floor(rand() * 2), rand() < .5 ? "rect" : "cross", rand); corridor(g, w, h, { x, y }, { x, y: y - 3 }, 1, 0); rooms.push({ x, y }); }
    corridor(g, w, h, start, goal, 3, 1); // the processional
  }
  room(g, w, h, start.x, start.y, 2, "rect", rand); room(g, w, h, goal.x, goal.y, 3, kind === "crypt" ? "hall" : "circle", rand);
  // guarantee the entry reaches the guardian
  let dist = bfs(g, w, h, start);
  if (dist[goal.y * w + goal.x] < 0) { corridor(g, w, h, start, goal, 2, 0); dist = bfs(g, w, h, start); }
  // drop islands the entry cannot reach
  for (let i = 0; i < w * h; i++) if (g[i] && dist[i] < 0) g[i] = 0;
  return { rooms: rooms.filter((r) => dist[r.y * w + r.x] >= 0), dist };
}

// ---------------------------------------------------------------- the generator
export function generateExpeditionDungeon(seed, id, recipe = "hollow", options = {}) {
  const requested = String(options.sizeProfile || ""), sizeProfile = DUNGEON_SIZE_PROFILES[requested] ? requested : ["compact", "standard", "extended"][hashSeed(`${seed}:${id}:size`) % 3];
  const profile = DUNGEON_SIZE_PROFILES[sizeProfile], variant = Math.max(0, Math.floor(Number.isFinite(Number(options.variant)) && options.variant !== undefined ? Number(options.variant) : hashSeed(`${seed}:${id}:variant`) % 997));
  const rand = rng(`${seed}:expedition-v5:${id}:${recipe}:${sizeProfile}:v${variant}`), w = profile.width + Math.floor(rand() * 7) - 3, h = profile.height + Math.floor(rand() * 7) - 3;
  const grammar = options.layout && LAYOUTS.includes(options.layout) ? options.layout : LAYOUTS[hashSeed(`${seed}:${id}:layout-v5`) % LAYOUTS.length];
  const corner = hashSeed(`${seed}:${id}:orientation`) % 4, corners = [[4, h - 5], [w - 5, h - 5], [w - 5, 4], [4, 4]];
  const start = { x: corners[corner][0], y: corners[corner][1] }, goal = { x: corners[(corner + 2) % 4][0], y: corners[(corner + 2) % 4][1] };
  const g = makeGrid(w, h), { rooms, dist } = layout(grammar, g, w, h, rand, start, goal);
  const wallKind = `${recipe}Wall`, floorKind = `${recipe}Floor`, tiles = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles.push(g[y * w + x] ? { x, y, kind: floorKind, blocked: false, detail: (x * 7 + y * 3 + variant) % 4 } : { x, y, kind: wallKind, blocked: true, detail: (x + y + variant) % 4 });
  const guardianRoom = goal, chestCell = [...g.keys()].filter((i) => g[i] && dist[i] >= 0 && Math.hypot(i % w - goal.x, Math.floor(i / w) - goal.y) >= 2 && Math.hypot(i % w - goal.x, Math.floor(i / w) - goal.y) <= 4).sort((a, b) => Math.abs(Math.hypot(a % w - goal.x, Math.floor(a / w) - goal.y) - 2.2) - Math.abs(Math.hypot(b % w - goal.x, Math.floor(b / w) - goal.y) - 2.2))[0], chest = chestCell !== undefined ? { x: chestCell % w, y: Math.floor(chestCell / w) } : { x: goal.x, y: goal.y + 1 }, far = rooms.filter((r) => r !== start && r !== goal).sort((a, b) => dist[b.y * w + b.x] - dist[a.y * w + a.x]);
  const maxDist = Math.max(...dist), mid = [...g.keys()].find((i) => g[i] && dist[i] === Math.floor(maxDist / 2)), hazardAt = far[Math.floor(far.length / 2)] || (mid !== undefined ? { x: mid % w, y: Math.floor(mid / w) } : { x: start.x + 1, y: start.y });
  const objects = [{ id: "dungeon-exit", kind: "exit", x: start.x, y: start.y, state: "open", actions: ["exit"] }, { id: "dungeon-chest", kind: "chest", x: chest.x, y: chest.y, state: "closed", actions: ["open"], rewardSource: `${recipe}-cache` }];
  if (recipe === "kiln") objects.push({ id: "kiln-vent", kind: "trap", trapType: "fire", x: hazardAt.x, y: hazardAt.y, dirX: 1, dirY: 0, phase: "armed", timer: 0, hits: {}, clue: "scorch" });
  else objects.push({ id: `${recipe}-trap`, kind: "trap", trapType: "spikes", x: hazardAt.x, y: hazardAt.y, phase: "armed", timer: 0, hits: {}, clue: "seams" });
  for (const o of objects) { const t = tiles[o.y * w + o.x]; if (t?.blocked) tiles[o.y * w + o.x] = { ...t, kind: floorKind, blocked: false }; }
  const open = tiles.filter((q) => !q.blocked), at = (n) => open[Math.min(open.length - 1, Math.floor(n * open.length))];
  const map = {
    seed, id, recipe, name: { hollow: "Hollow Relay", cistern: "Root-Sunk Cistern", kiln: "Glass Kiln" }[recipe] || "Corridor Dungeon", identity: "deterministic exploration dungeon", danger: "measured",
    width: w, height: h, tiles, entry: start, exit: start, objects,
    enemySpawns: [{ id: `${id}:resident:0`, kind: "ashling", x: at(.25).x, y: at(.25).y }, { id: `${id}:resident:1`, kind: recipe === "kiln" ? "sparkWarden" : "rootBrute", x: at(.6).x, y: at(.6).y }, { id: `${id}:guardian`, kind: "hollowMarshal", x: guardianRoom.x, y: guardianRoom.y, boss: true, dungeonRole: "gateWarden" }],
    generatorVersion: DUNGEON_GENERATOR_V5, sizeProfile, variant, layoutVersion: DUNGEON_LAYOUT_VERSION,
    diagnostic: { family: recipe, layoutGrammar: grammar, orientation: corner, maskVariant: variant, sizeCategory: sizeProfile, rooms: rooms.length, visualIdentity: `${recipe}-masonry`, guardianPackage: "marshal" },
  };
  const themeRoll = hashSeed(`${seed}:${id}:under-theme`);
  const theme = options.theme && UNDER_THEMES[options.theme] ? options.theme : options.theme === "none" ? null : themeRoll % 100 < 45 ? THEME_IDS[Math.floor(themeRoll / 100) % THEME_IDS.length] : null;
  if (theme) applyUnderTheme(map, theme, rand);
  return annotateDungeon(map, { generatorVersion: DUNGEON_GENERATOR_V5, sizeProfile });
}

// ---------------------------------------------------------------- bespoke environments
export function reachableInMap(map, from) {
  const w = map.width, h = map.height, seen = new Uint8Array(w * h), q = [from.y * w + from.x];
  seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], a = map.tiles[c], x = c % w, y = Math.floor(c / w);
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, n = ny * w + nx, b = map.tiles[n]; if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[n] || !b || b.blocked || LETHAL.has(b.kind) || (b.elev || 0) - (a.elev || 0) > 1) continue; seen[n] = 1; q.push(n); }
  }
  return seen;
}
const LETHAL = new Set(["abyss", "lava", "dungeonWater"]);
const DECOR = new Set(["glowcap", "sarcophagus", "iceSpire"]); // theme blockers a rescue route may clear

function criticalPath(map) {
  const w = map.width, h = map.height, start = map.entry, goal = map.enemySpawns.find((e) => e.dungeonRole === "gateWarden") || map.entry;
  const prev = new Int32Array(w * h).fill(-1), seen = new Uint8Array(w * h), q = [start.y * w + start.x];
  seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const c = q[i]; if (c === goal.y * w + goal.x) break; const x = c % w, y = Math.floor(c / w); for (const [dx, dy] of N4) { const n = (y + dy) * w + x + dx; if (!map.tiles[n] || map.tiles[n].blocked || seen[n]) continue; seen[n] = 1; prev[n] = c; q.push(n); } }
  const path = new Set(); for (let c = goal.y * w + goal.x; c !== -1; c = prev[c]) path.add(c);
  return path;
}

function applyUnderTheme(map, theme, rand) {
  const w = map.width, h = map.height, T = map.tiles, path = criticalPath(map), keep = new Set(path);
  for (const o of [...map.objects, ...map.enemySpawns, map.entry]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) keep.add((o.y + dy) * w + o.x + dx);
  const noise = (x, y, f, salt) => { const n = hashSeed(`${map.seed}:${map.id}:under:${salt}:${Math.floor(x / f)}:${Math.floor(y / f)}`) % 1000; return n / 1000; };
  const set = (i, props) => { T[i] = { ...T[i], ...props, landscape: "underlands" }; };
  const floorOf = { chasm: "chasmLedge", lavaBog: "ashSlope", river: "riverStone", frozen: "frostFloor", boneCrypt: "ossuary", fungal: "fungusFloor" }[theme];
  const wallOf = { chasm: "chasmWall", lavaBog: "volcanicRim", river: "riverWall", frozen: "iceWall", boneCrypt: "cryptWall", fungal: "fungusWall" }[theme];
  for (let i = 0; i < T.length; i++) { const t = T[i]; if (t.blocked) set(i, { kind: wallOf }); else set(i, { kind: floorOf, elev: 0 }); }
  for (let i = 0; i < T.length; i++) {
    const t = T[i]; if (t.blocked || keep.has(i)) continue;
    const x = t.x, y = t.y, n = noise(x, y, 3, "a"), m = noise(x + 7, y + 3, 2, "b");
    if (theme === "chasm") { if (n > .62) set(i, { kind: "abyss", environment: "abyss" }); else set(i, { elev: m > .55 ? 2 : m > .3 ? 1 : 0 }); }
    else if (theme === "lavaBog") { if (n > .7) set(i, { kind: "lava", environment: "lava", volcanic: true }); }
    else if (theme === "frozen") { if (n > .82) set(i, { kind: "iceSpire", blocked: true }); else set(i, { kind: m > .6 ? "snowPeak" : floorOf, elev: m > .72 ? 1 : 0 }); }
    else if (theme === "boneCrypt") { if (x % 3 === 0 && y % 2 === 0 && n > .35) set(i, { kind: "sarcophagus", blocked: true }); }
    else if (theme === "fungal") { if (n > .8) set(i, { kind: "glowcap", blocked: true }); }
  }
  if (theme === "river") { // a channel crossing the dungeon, bridged where the path crosses it
    const vertical = rand() < .5, at = Math.floor((vertical ? w : h) * (.35 + rand() * .3));
    for (let k = 0; k < (vertical ? h : w); k++) for (let d = 0; d < 2; d++) {
      const x = vertical ? at + d + Math.round(Math.sin(k * .3) * 2) : k, y = vertical ? k : at + d + Math.round(Math.sin(k * .3) * 2), i = y * w + x;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 || T[i].blocked) continue;
      if (path.has(i) || keep.has(i)) set(i, { kind: "bridge", environment: undefined }); else set(i, { kind: "dungeonWater", environment: "river" });
    }
  }
  // elevation stays climbable from the entry; stairs where the critical path changes level
  if (theme === "chasm" || theme === "frozen") {
    for (let pass = 0; pass < 30; pass++) {
      const seen = reachableInMap(map, map.entry); let changed = false;
      for (let i = 0; i < T.length; i++) { const t = T[i]; if (seen[i] || t.blocked || LETHAL.has(t.kind) || !(t.elev > 0)) continue; let best = -1; for (const [dx, dy] of N4) { const j = (t.y + dy) * w + t.x + dx, nb = T[j]; if (nb && seen[j] && !nb.blocked) best = Math.max(best, (nb.elev || 0) + 1); } if (best >= 0 && best < t.elev) { t.elev = best; changed = true; } }
      if (!changed) break;
    }
    for (const i of path) { const t = T[i]; if (!t || t.blocked) continue; const higher = N4.some(([dx, dy]) => { const nb = T[(t.y + dy) * w + t.x + dx]; return nb && !nb.blocked && (nb.elev || 0) > (t.elev || 0); }); if (higher || t.elev) T[i] = { ...t, slope: true, kind: theme === "chasm" ? "chasmStair" : t.kind }; }
  }
  unstrand(map);
  ensureReturnable(map, w, map.height, map.entry);
  addRamps(map, w, map.height, `${map.seed}:${map.id}`);
  map.theme = theme;
  map.landscape = { version: LANDSCAPE_VERSION, biome: `underlands:${theme}`, name: UNDER_THEMES[theme].name };
  if (UNDER_THEMES[theme].weather) map.weather = UNDER_THEMES[theme].weather;
  map.name = `${UNDER_THEMES[theme].name} · ${map.name}`;
  map.diagnostic = { ...map.diagnostic, theme };
}

// Anything the entry cannot reach (cut off by a river, chasm or lava) gets a bridged route.
function unstrand(map) {
  const w = map.width, h = map.height, T = map.tiles;
  for (const o of [...map.objects, ...map.enemySpawns]) {
    const seen = reachableInMap(map, map.entry), oi = o.y * w + o.x;
    if (seen[oi]) continue;
    const prev = new Int32Array(w * h).fill(-2), q = [oi]; prev[oi] = -1; let hit = -1;
    for (let i = 0; i < q.length && hit < 0; i++) { const c = q[i], x = c % w, y = Math.floor(c / w); for (const [dx, dy] of N4) { const n = (y + dy) * w + x + dx; if (!T[n] || prev[n] !== -2 || (T[n].blocked && !LETHAL.has(T[n].kind) && !DECOR.has(T[n].kind))) continue; prev[n] = c; if (seen[n]) { hit = n; break; } q.push(n); } }
    for (let c = hit; c >= 0; c = prev[c]) { if (c === hit) continue; const t = T[c]; if (LETHAL.has(t.kind)) T[c] = { ...t, kind: t.kind === "lava" ? "ashSlope" : "bridge", environment: undefined, blocked: false }; else if (DECOR.has(t.kind)) T[c] = { ...t, kind: T.find((q) => !q.blocked && !LETHAL.has(q.kind))?.kind || t.kind, blocked: false }; T[c] = { ...T[c], elev: 0, slope: false }; }
  }
  // leftover pockets nothing can reach become wall, so later spawns never land out of reach
  const seen = reachableInMap(map, map.entry), wall = T.find((q) => q.blocked && q.landscape === "underlands")?.kind;
  for (let i = 0; i < T.length; i++) if (!seen[i] && !T[i].blocked && !LETHAL.has(T[i].kind)) T[i] = { ...T[i], blocked: true, kind: wall || T[i].kind, elev: 0, slope: false };
}
