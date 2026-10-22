// Underlands v1: dungeon generator 5. Wider layout variety (six grammars, varied room shapes, random orientation)
// and, in a share of dungeons, bespoke underground environments built on the Landscape Pack's tile and elevation
// technology: chasm canyons, lava bogs, underground rivers, frozen grottoes with falling snow, bone crypts and fungal
// hollows. It returns the same map contract as generator 4 (entry/exit, chest, trap, guardian spawn), so encounters,
// discovery, completion and the monster pack work unchanged. Histories pinned to generators 2-4 never see it.
import { rng, hashSeed } from "./random.js?v=r309-525190e4e704";
import { annotateDungeon, DUNGEON_SIZE_PROFILES } from "./dungeon-framework.js?v=r309-525190e4e704";
import { DUNGEON_LAYOUT_VERSION } from "./dungeon-variation.js?v=r309-525190e4e704";
import { carvePattern, stitchPattern, PATTERN_CATALOG, ORGANIC_CATALOG } from "./pattern-dungeons.js?v=r309-525190e4e704";
import { LANDSCAPE_VERSION, ensureReturnable, trappedTiles, addRamps, valueNoise } from "./landscape.js?v=r309-525190e4e704";

export const DUNGEON_GENERATOR_V5 = 5;
export const LAYOUTS = ["spine", "hub", "ring", "cavern", "crypt", "descent"];
// Layout pool 2 (release 146): new dungeons may also be carved by a Wolfram elementary automaton. Histories created
// before it keep pool 1 (the six grammars above), so no existing dungeon changes.
export const LAYOUTS_V2 = [...LAYOUTS, "automaton", "automaton"];
// Layout pool 3 (release 147): the full pattern catalogue (pattern-dungeons.ts) in four of every ten new dungeons.
export const LAYOUTS_V3 = [...LAYOUTS, "pattern", "pattern", "pattern", "pattern"];
// Layout pool 4 (release 148): the same mix, but patterns come from the organic catalogue.
// Curated rules, each with a look: fractal halls grown from one seed cell, or chaotic and gliding warrens from a
// scattered first row. Rules with bit 0 set are left out (they only flicker on sparse ground).
export const AUTOMATON_RULES = [
  { rule: 90, seed: "single", name: "Sierpinski Halls" }, { rule: 18, seed: "single", name: "Sierpinski Halls" }, { rule: 126, seed: "single", name: "Lattice Halls" },
  { rule: 150, seed: "single", name: "Woven Halls" }, { rule: 22, seed: "single", name: "Branching Halls" }, { rule: 30, seed: "single", name: "Chaos Warrens" },
  { rule: 30, seed: "scatter", name: "Chaos Warrens" }, { rule: 110, seed: "scatter", name: "Glider Galleries" }, { rule: 54, seed: "scatter", name: "Glider Galleries" },
  { rule: 106, seed: "scatter", name: "Drift Galleries" }, { rule: 60, seed: "single", name: "Sierpinski Slant" }, { rule: 102, seed: "single", name: "Sierpinski Slant" },
];
export const UNDER_THEMES = {
  chasm: { id: "chasm", name: "Sunless Chasm", weather: null, lore: "The floor gives way to a canyon with no bottom. Stairs cling to its walls." },
  lavaBog: { id: "lavaBog", name: "Lava Bog", weather: "embers", lore: "Molten pools breathe under a crust of ash. Sparks rise where no wind blows." },
  river: { id: "river", name: "Underground River", weather: "drip", lore: "A black river runs through the dark, crossed only by old bridges." },
  frozen: { id: "frozen", name: "Frozen Grotto", weather: "snow", lore: "Snow falls from a ceiling no one has seen. Is this a place, or somewhere else?" },
  boneCrypt: { id: "boneCrypt", name: "Bone Crypt", weather: null, lore: "Rows of sealed sarcophagi. Some lids are not quite closed." },
  fungal: { id: "fungal", name: "Fungal Hollow", weather: "spores", lore: "Glowing caps the size of trees. The air is thick with drifting spores." },
  // Theme pool 2 (release 299, Tim: "I like... that fungal grotto dungeon... interesting floor... mushrooms... we can design
  // different dungeons to have different patterns like that. And different floors, it can be like alien"). Only dungeons
  // generated from now on draw from it (history.themePool, pinned in game.ts generatePinnedDungeon).
  starHive: { id: "starHive", name: "Starfall Hive", weather: "spores", lore: "Violet moss, still pools and crystal spires. Hexagonal platforms hum underfoot. Nothing here grew on this world." },
  geode: { id: "geode", name: "Geode Hollow", weather: "glints", lore: "The cave is the inside of a stone, split open. Amethyst grows from every face." },
  mosaic: { id: "mosaic", name: "Mosaic Sanctum", weather: "sunbreak", lore: "A temple floor of inlaid rosettes, columns in rows, still pools. Light comes from somewhere above." },
  rootwood: { id: "rootwood", name: "Rootbound Deep", weather: "drip", lore: "Roots as thick as towers have broken through the ceiling and knotted across the floor." },
  // Release 303: never drawn from a pool; a rare history is pinned to it (game.ts generatePinnedDungeon, MIRE_CRYPT).
  poisonCrypt: { id: "poisonCrypt", name: "Poison Crypt", weather: "spores", lore: "Sealed tombs sunk in a green mire. Something in the pools is all one thing, and it is gathering itself." },
  brass: { id: "brass", name: "Brass Engine", weather: "steam", lore: "Grated walkways over great buried gears. Pipes still breathe steam, though nothing has turned in an age." },
};
// Which themes a history may draw, and how often a crossing is themed at all (percent), by its pinned theme pool.
export const THEME_POOLS = {
  1: { ids: ["chasm", "lavaBog", "river", "frozen", "boneCrypt", "fungal"], chance: 45 },
  2: { ids: ["chasm", "lavaBog", "river", "frozen", "boneCrypt", "fungal", "starHive", "geode", "mosaic", "rootwood", "brass"], chance: 60 },
};
// Pool 3 (release 301, Tim: "the basic dungeon, like tiles and setup, should be the default... everything else... a little
// bit rare... the newer ones more rare, since they're a little bit more highly designed"): about 3 in 10 crossings are
// themed, and each of the five newer environments comes up half as often as each of the first six.
THEME_POOLS[3] = { ids: [...THEME_POOLS[1].ids, ...THEME_POOLS[1].ids, "starHive", "geode", "mosaic", "rootwood", "brass"], chance: 30 };
export const THEME_POOL_VERSION = 3;
// Layout pool 5 (release 301, Tim: "it's now actually surprising to get a short dungeon... we should have some short
// dungeons... just short boxy dungeons... a few rooms... a corridor or two. And that's it"). A share of new crossings are
// plain: a small box of a few rectangular rooms joined by corridors, never themed. The largest crossings may hold a pair
// of Watcher's daises that, once both are found, carry you between them (Tim: "a dais... that has that symbol on it").
export const PLAIN = { chance: 25, width: 26, height: 22, rooms: [3, 5] };
export const WARP = { chance: 50, minApart: 16 };
// The Poison Crypt (release 303, Tim: "a poison crypt... large sections of poison water and poison mire... poison jets... the
// blob... a smaller version... manifest from one of those poison pools... they all try and go back to the main blob... a
// larger... arena... a poison pool in the corner... the blob in this arena will have... half health"). A rare history
// (perThousand) is pinned to it. Seep pools spawn seeplings that crawl home to the Mire Heart (a half-strength Morphing Blob)
// and swell it; finding the Heart's lair stops the pools. Balance as data; the runtime is Game.tickMire.
export const MIRE_CRYPT = { perThousand: 20, version: 1, lairRadius: 6, patch: .66, pools: 5, poolSpacing: 7, jets: 3, jetDamage: 10,
  heartHp: .5, mergeHp: .06, seepEvery: 8, seepMax: 6, seepHp: 30, seepGrow: 40, seepGrowMax: 1, contact: 9, contactEvery: .8, poison: [4, 3] };
export function plainCrossing(seed, id, layoutPool) { return layoutPool >= 5 && hashSeed(`${seed}:${id}:plain`) % 100 < PLAIN.chance; }
export function rollMireCrypt(seed, id, layoutPool) { return layoutPool >= 5 && !plainCrossing(seed, id, layoutPool) && hashSeed(`${seed}:mire-crypt:v${MIRE_CRYPT.version}:${id}`) % 1000 < MIRE_CRYPT.perThousand; }
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
function layout(kind, g, w, h, rand, start, goal, patternId = null, catalog = PATTERN_CATALOG) {
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
  } else if (kind === "automaton") {
    // Each automaton cell becomes a 3×2 block of floor, so diagonal neighbours touch and the pattern is walkable.
    // Time runs from the entry's side toward the guardian's side.
    const pick = AUTOMATON_RULES[Math.floor(rand() * AUTOMATON_RULES.length)], cw = Math.max(8, Math.floor((w - 4) / 2)), ch = Math.max(6, Math.floor((h - 4) / 2));
    let row = new Uint8Array(cw);
    if (pick.seed === "single") row[Math.floor(cw / 2) + Math.floor((rand() - .5) * cw * .3)] = 1; else for (let x = 0; x < cw; x++) row[x] = rand() < .22 ? 1 : 0;
    const flip = start.y > goal.y, cells = [];
    for (let y = 0; y < ch; y++) {
      cells.push(row);
      const next = new Uint8Array(cw);
      for (let x = 0; x < cw; x++) { const l = row[(x - 1 + cw) % cw], c = row[x], r = row[(x + 1) % cw]; next[x] = (pick.rule >> (l << 2 | c << 1 | r)) & 1; }
      row = next;
    }
    // Dense patterns (Rule 30, 110 from a scattered row) read better with the dead cells as halls.
    const live = cells.reduce((a, r) => a + r.reduce((b, v) => b + v, 0), 0) / (cw * ch), open = live > .45 ? 0 : 1;
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) if (cells[cy][cx] === open) {
      const ty = flip ? h - 3 - cy * 2 : 2 + cy * 2, tx = 2 + cx * 2;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) carve(g, w, h, tx + dx, flip ? ty - dy : ty + dy);
    }
    for (let i = 0; i < 3 + Math.floor(rand() * 3); i++) { const p = { x: 5 + Math.floor(rand() * (w - 10)), y: 5 + Math.floor(rand() * (h - 10)) }; room(g, w, h, p.x, p.y, 1 + Math.floor(rand() * 2), shape(), rand); rooms.push(p); }
    g.automaton = pick;
  } else if (kind === "pattern") {
    g.automaton = carvePattern(g, w, h, rand, start, goal, (x, y) => carve(g, w, h, x, y), catalog.find((p) => p.id === patternId), catalog);
    g.pattern = true;
    const floor = [...g.keys()].filter((i) => g[i]);
    for (let i = 0; i < 6 && floor.length; i++) { const c = floor[Math.floor(rand() * floor.length)]; rooms.push({ x: c % w, y: Math.floor(c / w) }); }
  } else if (kind === "rooms") { // release 301: a plain box of a few rooms, corridors between them
    const cols = 3, rows = 2, cells = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: Math.round((c + .5) * w / cols), y: Math.round((r + .5) * h / rows) });
    const n = PLAIN.rooms[0] + Math.floor(rand() * (PLAIN.rooms[1] - PLAIN.rooms[0] + 1)), picked = cells.filter((c) => Math.hypot(c.x - start.x, c.y - start.y) > 5 && Math.hypot(c.x - goal.x, c.y - goal.y) > 5).sort(() => rand() - .5).slice(0, Math.max(1, n - 2));
    picked.sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y));
    let prev = start; for (const p of picked) { room(g, w, h, p.x, p.y, 2 + Math.floor(rand() * 2), "rect", rand); corridor(g, w, h, prev, p, 1, Math.floor(rand() * 2)); rooms.push(p); prev = p; }
    corridor(g, w, h, prev, goal, 1, Math.floor(rand() * 2));
    if (picked.length > 2 && rand() < .5) corridor(g, w, h, picked[0], picked[picked.length - 1], 1, 1); // sometimes a loop
  } else if (kind === "crypt") {
    const step = 6, ox = 3 + Math.floor(rand() * 3), oy = 3 + Math.floor(rand() * 3);
    for (let y = oy; y < h - 3; y += step) corridor(g, w, h, { x: 3, y }, { x: w - 4, y }, 1, 0);
    for (let x = ox; x < w - 3; x += step) if (rand() < .7) corridor(g, w, h, { x, y: 3 }, { x, y: h - 4 }, 1, 1);
    for (let y = oy + 3; y < h - 4; y += step) for (let x = ox + 3; x < w - 4; x += step) if (rand() < .55) { room(g, w, h, x, y, 1 + Math.floor(rand() * 2), rand() < .5 ? "rect" : "cross", rand); corridor(g, w, h, { x, y }, { x, y: y - 3 }, 1, 0); rooms.push({ x, y }); }
    corridor(g, w, h, start, goal, 3, 1); // the processional
  }
  room(g, w, h, start.x, start.y, 2, "rect", rand); room(g, w, h, goal.x, goal.y, 3, kind === "crypt" ? "hall" : "circle", rand);
  if (g.pattern) stitchPattern(g, w, h, start);
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
  const plain = !options.layout && !options.theme && plainCrossing(seed, id, options.layoutPool);
  const rand = rng(`${seed}:expedition-v5:${id}:${recipe}:${sizeProfile}:v${variant}`), w0 = profile.width + Math.floor(rand() * 7) - 3, h0 = profile.height + Math.floor(rand() * 7) - 3;
  const w = plain ? PLAIN.width + (variant % 3) - 1 : w0, h = plain ? PLAIN.height + (variant % 3) - 1 : h0;
  const pool = options.layoutPool >= 3 ? LAYOUTS_V3 : options.layoutPool >= 2 ? LAYOUTS_V2 : LAYOUTS, grammar = plain || options.layout === "rooms" ? "rooms" : options.layout && pool.includes(options.layout) ? options.layout : pool[hashSeed(`${seed}:${id}:layout-v5`) % pool.length];
  const corner = hashSeed(`${seed}:${id}:orientation`) % 4, corners = [[4, h - 5], [w - 5, h - 5], [w - 5, 4], [4, 4]];
  const start = { x: corners[corner][0], y: corners[corner][1] }, goal = { x: corners[(corner + 2) % 4][0], y: corners[(corner + 2) % 4][1] };
  const g = makeGrid(w, h), { rooms, dist } = layout(grammar, g, w, h, rand, start, goal, options.pattern, options.layoutPool >= 4 ? ORGANIC_CATALOG : PATTERN_CATALOG);
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
  if (g.automaton) { map.automaton = { rule: g.automaton.rule, name: g.automaton.name, pattern: g.automaton.id || null }; map.name = `${g.automaton.name} · ${map.name}`; map.diagnostic.automatonRule = g.automaton.rule; }
  const themeRoll = hashSeed(`${seed}:${id}:under-theme`);
  const themes = THEME_POOLS[options.themePool] || THEME_POOLS[1];
  if (options.layoutPool >= 5 && !plain && sizeProfile === "extended" && hashSeed(`${seed}:${id}:warp`) % 100 < WARP.chance) placeWarpDaises(map, dist);
  const theme = options.theme && UNDER_THEMES[options.theme] ? options.theme : options.theme === "none" || grammar === "rooms" ? null : themeRoll % 100 < themes.chance ? themes.ids[Math.floor(themeRoll / 100) % themes.ids.length] : null;
  if (theme) applyUnderTheme(map, theme, rand);
  if (grammar === "rooms") { map.plain = true; map.diagnostic.plain = true; }
  return annotateDungeon(map, { generatorVersion: DUNGEON_GENERATOR_V5, sizeProfile: grammar === "rooms" ? "small" : sizeProfile });
}

// Two Watcher's daises far apart on the floor the entry reaches: one about a third of the way in, one deep. Each must be
// found (attuned) before either carries you to the other (Game.useWarpDais).
function placeWarpDaises(map, dist) {
  const w = map.width, taken = new Set(map.objects.map((o) => o.y * w + o.x)), maxD = Math.max(...dist);
  const guard = map.enemySpawns.find((e) => e.dungeonRole === "gateWarden"), clear = (i) => { const x = i % w, y = Math.floor(i / w); if (taken.has(i) || dist[i] < 0 || map.tiles[i].blocked) return false; if (guard && Math.hypot(x - guard.x, y - guard.y) < 5) return false; for (const [dx, dy] of N4) if (map.tiles[i + dy * w + dx]?.blocked) return false; return true; };
  const near = (frac) => { let best = -1; for (let i = 0; i < dist.length; i++) if (clear(i) && (best < 0 || Math.abs(dist[i] - maxD * frac) < Math.abs(dist[best] - maxD * frac))) best = i; return best; };
  const a = near(.3), b = near(.85);
  if (a < 0 || b < 0 || Math.hypot(a % w - b % w, Math.floor(a / w) - Math.floor(b / w)) < WARP.minApart) return;
  map.objects.push({ id: "warp-dais-a", kind: "warpDais", pair: "warp-dais-b", name: "Watcher's Dais", x: a % w, y: Math.floor(a / w), state: "dormant", actions: ["touch"] },
    { id: "warp-dais-b", kind: "warpDais", pair: "warp-dais-a", name: "Watcher's Dais", x: b % w, y: Math.floor(b / w), state: "dormant", actions: ["touch"] });
  map.warpDaises = true;
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
const DECOR = new Set(["glowcap", "sarcophagus", "iceSpire", "crystalSpire", "alienPool", "geodeCluster", "templePillar", "rootKnot", "brassPipe"]); // theme blockers a rescue route may clear

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
  const floorOf = { chasm: "chasmLedge", lavaBog: "ashSlope", river: "riverStone", frozen: "frostFloor", boneCrypt: "ossuary", fungal: "fungusFloor", starHive: "alienMoss", geode: "geodeFloor", mosaic: "templeMosaic", rootwood: "rootFloor", brass: "gratingFloor", poisonCrypt: "toxicBog" }[theme];
  const wallOf = { chasm: "chasmWall", lavaBog: "volcanicRim", river: "riverWall", frozen: "iceWall", boneCrypt: "cryptWall", fungal: "fungusWall", starHive: "hiveWall", geode: "geodeWall", mosaic: "templeWall", rootwood: "rootWall", brass: "brassWall", poisonCrypt: "cryptWall" }[theme];
  // Release 299: patterned floors span tiles. detail picks the tile's quarter of a 2x2 motif (a rosette, a buried gear).
  const quarter = (x, y) => (x & 1) + (y & 1) * 2, tiled = theme === "mosaic" || theme === "brass";
  for (let i = 0; i < T.length; i++) { const t = T[i]; if (t.blocked) set(i, { kind: wallOf }); else set(i, { kind: floorOf, elev: 0, ...(tiled ? { detail: quarter(t.x, t.y) } : {}) }); }
  for (let i = 0; i < T.length; i++) {
    const t = T[i]; if (t.blocked || keep.has(i)) continue;
    const x = t.x, y = t.y, n = noise(x, y, 3, "a"), m = noise(x + 7, y + 3, 2, "b");
    if (theme === "chasm") { if (n > .62) set(i, { kind: "abyss", environment: "abyss" }); else set(i, { elev: m > .55 ? 2 : m > .3 ? 1 : 0 }); }
    else if (theme === "lavaBog") { if (n > .7) set(i, { kind: "lava", environment: "lava", volcanic: true }); }
    else if (theme === "frozen") { if (n > .82) set(i, { kind: "iceSpire", blocked: true }); else set(i, { kind: m > .6 ? "snowPeak" : floorOf, elev: m > .72 ? 1 : 0 }); }
    else if (theme === "boneCrypt") { if (x % 3 === 0 && y % 2 === 0 && n > .35) set(i, { kind: "sarcophagus", blocked: true }); }
    else if (theme === "fungal") { if (n > .8) set(i, { kind: "glowcap", blocked: true }); }
    else if (theme === "starHive") { if (n > .84) set(i, { kind: "crystalSpire", blocked: true }); else if (n < .1) set(i, { kind: "alienPool", blocked: true }); else if (m > .66) set(i, { kind: "alienPlatform", elev: 1 }); }
    else if (theme === "geode") { if (n > .8) set(i, { kind: "geodeCluster", blocked: true }); }
    else if (theme === "mosaic") { if (x % 4 === 2 && y % 4 === 2) set(i, { kind: "templePillar", blocked: true }); else if (n > .86) set(i, { kind: "templePool", detail: t.detail }); }
    else if (theme === "rootwood") { const ridge = Math.abs(valueNoise(`${map.seed}:${map.id}:roots`, x / 4, y / 4) - .5); if (ridge < .07) set(i, { kind: "rootKnot", blocked: true }); }
    else if (theme === "poisonCrypt") { if (n > MIRE_CRYPT.patch) set(i, { kind: "toxicMire" }); }
    else if (theme === "brass") { if (n > .82 && (x + y) % 2 === 0) set(i, { kind: "brassPipe", blocked: true }); }
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
  if (theme === "chasm" || theme === "frozen" || theme === "starHive") {
    for (let pass = 0; pass < 30; pass++) {
      const seen = reachableInMap(map, map.entry); let changed = false;
      for (let i = 0; i < T.length; i++) { const t = T[i]; if (seen[i] || t.blocked || LETHAL.has(t.kind) || !(t.elev > 0)) continue; let best = -1; for (const [dx, dy] of N4) { const j = (t.y + dy) * w + t.x + dx, nb = T[j]; if (nb && seen[j] && !nb.blocked) best = Math.max(best, (nb.elev || 0) + 1); } if (best >= 0 && best < t.elev) { t.elev = best; changed = true; } }
      if (!changed) break;
    }
    for (const i of path) { const t = T[i]; if (!t || t.blocked) continue; const higher = N4.some(([dx, dy]) => { const nb = T[(t.y + dy) * w + t.x + dx]; return nb && !nb.blocked && (nb.elev || 0) > (t.elev || 0); }); if (higher || t.elev) T[i] = { ...t, slope: true, kind: theme === "chasm" ? "chasmStair" : t.kind }; }
  }
  if (theme === "poisonCrypt") mireCrypt(map, path, keep, set);
  unstrand(map);
  ensureReturnable(map, w, map.height, map.entry);
  addRamps(map, w, map.height, `${map.seed}:${map.id}`);
  map.theme = theme;
  map.landscape = { version: LANDSCAPE_VERSION, biome: `underlands:${theme}`, name: UNDER_THEMES[theme].name };
  if (UNDER_THEMES[theme].weather) map.weather = UNDER_THEMES[theme].weather;
  map.name = `${UNDER_THEMES[theme].name} · ${map.name}`;
  map.diagnostic = { ...map.diagnostic, theme };
}

// The Mire Heart's lair (a wide mire around the guardian's room, its causeway left dry), the seep pools the seeplings
// rise from, the gas jets along the way, and the Heart itself in place of the guardian.
function mireCrypt(map, path, keep, set) {
  const w = map.width, T = map.tiles, M = MIRE_CRYPT, heart = map.enemySpawns.find((e) => e.dungeonRole === "gateWarden");
  if (!heart) return;
  for (let i = 0; i < T.length; i++) { const t = T[i]; if (t.blocked || path.has(i) || Math.hypot(t.x - heart.x, t.y - heart.y) > M.lairRadius || Math.hypot(t.x - heart.x, t.y - heart.y) < 1.5) continue; set(i, { kind: "toxicMire" }); }
  Object.assign(heart, { kind: "morphingBlob", mireHeart: true });
  map.mireLair = { x: heart.x, y: heart.y, radius: M.lairRadius };
  const e = map.entry, pools = [], cands = T.filter((t) => t.kind === "toxicMire" && Math.hypot(t.x - heart.x, t.y - heart.y) > M.lairRadius + 2 && Math.hypot(t.x - e.x, t.y - e.y) > 6).sort((a, b) => Math.hypot(b.x - e.x, b.y - e.y) - Math.hypot(a.x - e.x, a.y - e.y));
  for (const t of cands) { if (pools.length >= M.pools) break; if (pools.every((q) => Math.hypot(q.x - t.x, q.y - t.y) >= M.poolSpacing)) pools.push({ x: t.x, y: t.y }); }
  for (const q of pools) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = (q.y + dy) * w + q.x + dx, t = T[i]; if (t && !t.blocked && !keep.has(i)) set(i, { kind: "toxicMire" }); }
  map.seepPools = pools;
  const route = [...path].map((i) => ({ x: i % w, y: Math.floor(i / w) })).filter((q) => Math.hypot(q.x - e.x, q.y - e.y) > 6 && Math.hypot(q.x - heart.x, q.y - heart.y) > M.lairRadius + 1);
  for (let k = 1; k <= M.jets && route.length; k++) {
    const q = route[Math.floor(route.length * k / (M.jets + 1))], dir = N4.find(([dx, dy]) => { const n = T[(q.y + dy) * w + q.x + dx]; return n && !n.blocked; }) || [1, 0];
    if (map.objects.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 2)) continue;
    map.objects.push({ id: `mire-jet-${k}`, kind: "trap", trapType: "fire", gas: true, x: q.x, y: q.y, dirX: dir[0], dirY: dir[1], range: 2.5, damage: M.jetDamage, phase: "armed", timer: 0, hits: {}, clue: "gas" });
  }
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
