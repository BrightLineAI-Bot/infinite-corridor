// Labyrinths (Tim, 2026-11-03: "I want the mazes to be pretty intense and interesting... you go through and you find yourself
// outside, in the same building, but a different section of the building, and then you go in... almost self-contained
// dungeons, but you move in and out of them through the doors... some of them pretty tricky to get to the end... when you get to
// the end... you can just hit the exit door and it'll take you to the front... platforms... jumping... multiple floors that
// aren't necessarily obvious... you might go down to a subcellar... an actual maze where there's only one right path... only
// one real end").
//
// A labyrinth is one closed building on the overworld with one door. Inside it is a maze of chambers, each an area of its own,
// joined by doors (the same level) and ladders (up to a loft, down to a cellar or a subcellar). The chambers are:
//   hall    rooms split by inner walls (great-buildings.js?v=r745-fc1f11266b00's floor plan)
//   court   an open-air hedge maze: outside, but still inside the labyrinth
//   cellar  a stone maze under the ground (two levels down is a subcellar)
//   gaps    a gallery of platforms over a drop: jump the one-tile gaps; fall and you land in a cellar somewhere else
// The chambers form a tree, so there is one way through. The vault is the chamber farthest from the door, the one real end,
// with the labyrinth's guardian, its treasure and a door that lets you out at the front. Dead ends sometimes hold a cache.
// Everything is a hash of the seed and the section (`atlas.labVersion`, sections first seen from this release).
import { hashSeed, rng, byHash } from "./random.js?v=r745-fc1f11266b00";
import { BUILDINGS, layFloor, farthest, guardianBeside } from "./great-buildings.js?v=r745-fc1f11266b00";

export const LABYRINTHS = {
  version: 1,
  chance: .06, minRing: 6,
  chambers: [14, 20], minPath: 9, // the way from the door to the vault passes through at least `minPath` chambers
  size: [27, 19], // odd, so the mazes have walls between cells
  levelChange: .38, levels: [-2, 2], // a passage changes level (a ladder) this often; -1 a cellar, -2 a subcellar, 1+ a loft
  gapsShare: .4, courtShare: .45, // above the ground, this share are galleries of gaps; on it, this share are courts
  island: 3, gap: 1, missing: .22, bridged: .2, edge: .25, // `edge`: a gap's lip: within this of solid ground you have not yet fallen // galleries: 3×3 platforms, 1-tile gaps; this share of platforms gone, of gaps bridged
  deadCache: .4, // share of dead ends with a cache
  // Tim: "mazes that would engage me without becoming... tiresome or tedious... they could be pretty long". Dead ends earn their
  // keep: up to `gates` sealed doors on the true path, each opened by a key lying at the end of a side branch before it; a
  // `shortcut` door deep along the path leads back to the first hall (barred from the hall's side until opened from the far
  // side); the mazes are `braid`ed (a share of their blind ends opened into loops).
  gates: [.35, .7], shortcut: .72, braid: .3,
  keys: { keep: ["Bronze Key", "Iron Key"], apartment: ["Blue Keycard", "Red Keycard"], hive: ["Spore Sigil", "Ichor Sigil"], shell: ["Ivory Key", "Coral Key"] },
  guards: [1, 3],
  footprint: [[11, 8], [10, 8], [10, 7], [9, 7]],
  styles: {
    keep: { name: "Labyrinth Keep", hall: "Hall", court: "Hedge Court", cellar: "Cellar", subcellar: "Subcellar", gaps: "Gallery of Gaps", vault: "Vault" },
    apartment: { name: "Arcology Maze", hall: "Hab Ward", court: "Sky Garden", cellar: "Service Level", subcellar: "Sub-basement", gaps: "Broken Atrium", vault: "Core Vault" },
    hive: { name: "Hive Labyrinth", hall: "Brood Hall", court: "Spore Garden", cellar: "Burrow", subcellar: "Deep Burrow", gaps: "Rift Gallery", vault: "Queen's Chamber" },
    // The Shell-Labyrinth (turtle-shell.ts): the maze inside a slain Mountain Turtle's shell. Never rolled on the overworld. Its
    // rooms are laid out as the Old Keep's (`building`); Tim (2026-11-04): "let's use the clockwork dungeon theme, and the mosaic
    // dungeon theme": each chamber is dressed in one of the two by its kind (`themes`, underlands.js?v=r745-fc1f11266b00's Brass Engine and Mosaic
    // Sanctum tiles, see SHELL_THEMES): the halls and galleries are clockwork, the courts, undercrofts and the vault mosaic.
    shell: { name: "The Shell-Labyrinth", hall: "Gear Hall", court: "Mosaic Court", cellar: "Mosaic Undercroft", subcellar: "Deep Undercroft", gaps: "Gallery of Gears", vault: "Heart of the Shell", building: "keep",
      themes: { hall: "clockwork", gaps: "clockwork", court: "mosaic", cellar: "mosaic", vault: "mosaic" } },
  },
  floors: { court: ["yardGrass", "hedgeWall"], cellar: ["cellarFloor", "cellarWall"] },
  // A chamber's dress (styles' `themes`): the floor and wall of an underlands.ts theme, drawn by landscape-render.ts. `quarter`:
  // the floor is a 2x2 motif (a buried gear, a rosette); `accent`: some walls show it (pipes by hash share, pillars on a 4-grid).
  // Only tiles' looks change: what blocks, what is a hole and what is a doorway stay exactly as laid.
  dress: {
    clockwork: { floor: "gratingFloor", wall: "brassWall", accent: "brassPipe", share: .2, quarter: true },
    mosaic: { floor: "templeMosaic", wall: "templeWall", accent: "templePillar", grid: 4, quarter: true },
  },
  messages: {
    arrive: "A labyrinth stands here: one door in, and somewhere deep inside, its one real end.",
    door: "You go through the door into",
    fall: "You fall through the gap, far down, into",
    vault: "the vault: the labyrinth's one real end",
    out: "The way out lets you out at the front of the labyrinth.",
  },
};

const ID = /^labyrinth:(.+):(-?\d+):(-?\d+):(keep|apartment|hive|shell):f(\d+)$/;
export const isLabyrinthId = (id) => ID.test(String(id || ""));
export function parseLabyrinthId(id) { const m = String(id || "").match(ID); return m ? { seed: m[1], rx: Number(m[2]), ry: Number(m[3]), style: m[4], node: Number(m[5]) - 1, base: `labyrinth:${m[1]}:${m[2]}:${m[3]}:${m[4]}` } : null; }
const nodeId = (base, n) => `${base}:f${n + 1}`;

export function labyrinthHere(seed, rx, ry, region) {
  if (Math.abs(rx) + Math.abs(ry) < LABYRINTHS.minRing) return null;
  if ((hashSeed(`${seed}:labyrinth:v1:${rx}:${ry}:roll`) % 10000) / 10000 >= LABYRINTHS.chance) return null;
  return { style: BUILDINGS.hiveRegions.includes(region?.type) ? "hive" : BUILDINGS.machine.includes(region?.type) ? "apartment" : "keep" };
}

// ------------------------------------------------------------------------------------------------ the maze of chambers
const memo = new Map();
// The chambers and the passages between them (pure). Node 0 is behind the door.
export function labyrinthPlan(base) {
  if (memo.has(base)) return memo.get(base);
  const P = parseLabyrinthId(`${base}:f1`); if (!P) return null;
  const L = LABYRINTHS, r = rng(`${base}:plan`), n = L.chambers[0] + Math.floor(r() * (L.chambers[1] - L.chambers[0] + 1));
  let nodes = null, end = 0, depth = [];
  for (let tryN = 0; tryN < 30; tryN++) { // a tree grown from the door, kept when its farthest chamber is far enough
    nodes = [{ n: 0, level: 0, parent: -1, kids: [] }];
    while (nodes.length < n) { // grow mostly from the newest chambers (long corridors), sometimes from an older one (a branch)
      const from = r() < .7 ? nodes[nodes.length - 1 - Math.floor(r() * Math.min(2, nodes.length))] : nodes[Math.floor(r() * nodes.length)];
      if (from.kids.length >= 3) continue;
      let level = from.level; if (r() < L.levelChange) level = Math.max(L.levels[0], Math.min(L.levels[1], level + (r() < .5 ? -1 : 1)));
      const q = { n: nodes.length, level, parent: from.n, kids: [] }; from.kids.push(q.n); nodes.push(q); }
    depth = nodes.map(() => 0); for (const q of nodes) if (q.parent >= 0) depth[q.n] = depth[q.parent] + 1;
    end = depth.indexOf(Math.max(...depth)); if (depth[end] + 1 >= L.minPath) break; }
  // what each chamber is
  for (const q of nodes) { const v = r();
    q.kind = q.n === end ? "hall" : q.level < 0 ? "cellar" : q.level > 0 ? (v < L.gapsShare ? "gaps" : "hall") : (v < L.courtShare ? "court" : "hall");
    if (q.n === 0) q.kind = "hall"; q.depth = depth[q.n]; q.vault = q.n === end; q.dead = q.n !== end && !q.kids.length; q.cache = q.dead && r() < L.deadCache; }
  // the true path; sealed doors on it, their keys at the ends of side branches that leave the path before them
  const path = []; for (let k = end; k >= 0; k = nodes[k].parent) path.unshift(k); const onPath = new Set(path), gates = [], claimed = new Set();
  const subtree = (root) => { const out = [root]; for (let i = 0; i < out.length; i++) out.push(...nodes[out[i]].kids); return out; };
  L.gates.forEach((frac, gi) => { const at = Math.floor(path.length * frac); if (at < 1 || at >= path.length - 1) return;
    const roots = nodes.filter((q) => !onPath.has(q.n) && q.parent >= 0 && onPath.has(q.parent) && path.indexOf(q.parent) <= at && !claimed.has(q.n));
    if (!roots.length) return; const root = roots[Math.floor(r() * roots.length)], branch = subtree(root.n), leaf = branch.map((n) => nodes[n]).reduce((a, b) => (b.depth > a.depth ? b : a));
    for (const n of branch) claimed.add(n); const key = { id: `key${gi}`, name: L.keys[P.style][gi] }; leaf.key = key; leaf.cache = false; gates.push({ from: path[at], to: path[at + 1], key }); });
  // the passages: a door on the same level, a ladder between levels (the way down, below a loft, may be a long fall)
  const edges = []; for (const q of nodes) if (q.parent >= 0) { const p = nodes[q.parent]; edges.push({ a: p.n, b: q.n, type: p.level === q.level ? "door" : "ladder" }); }
  for (const g of gates) { const e = edges.find((v) => (v.a === g.from && v.b === g.to) || (v.a === g.to && v.b === g.from)); if (e) e.lock = g.key; }
  { const deep = path[Math.floor(path.length * L.shortcut)]; if (deep && deep !== end && path.indexOf(deep) >= 3 && nodes[deep].kind !== "gaps") edges.push({ a: deep, b: 0, type: "door", shortcut: true }); } // back to the first hall
  for (const q of nodes) q.edges = edges.filter((e) => e.a === q.n || e.b === q.n);
  // where each passage stands in each of its two chambers
  const [W, H] = L.size;
  for (const q of nodes) { const used = new Set(q.n === 0 || q.vault ? [`${W >> 1},${H - 1}`, `${W >> 1},${H - 2}`] : []), sides = [0, 1, 2, 3];
    q.slots = new Map();
    q.edges.forEach((e, i) => { const other = e.a === q.n ? e.b : e.a; let spot = null;
      for (let k = 0; k < 40 && !spot; k++) { const h = hashSeed(`${base}:slot:${q.n}:${other}:${k}`);
        if (e.type === "door") { const side = sides[(h + i) % 4], along = side % 2 === 0 ? (W - 1) / 2 : (H - 1) / 2, pick = q.kind === "gaps" ? 2 + 4 * (h % Math.max(1, Math.floor((side % 2 === 0 ? W - 2 : H - 2) / 4))) : 1 + 2 * ((h >>> 3) % Math.max(1, Math.floor(along) - 1)) + 2;
          const x = side === 0 || side === 2 ? pick : side === 1 ? W - 1 : 0, y = side === 1 || side === 3 ? pick : side === 0 ? 0 : H - 1;
          if (x < 1 && y < 1) continue; const inner = { x: x === 0 ? 1 : x === W - 1 ? W - 2 : x, y: y === 0 ? 1 : y === H - 1 ? H - 2 : y };
          if (inner.x < 1 || inner.y < 1 || inner.x > W - 2 || inner.y > H - 2) continue; const k2 = `${x},${y}`; if (used.has(k2)) continue; used.add(k2); spot = { x, y, inner, wall: true }; }
        else { const x = q.kind === "gaps" ? 2 + 4 * (h % Math.floor((W - 2) / 4)) : 1 + 2 * (h % ((W - 1) / 2)), y = q.kind === "gaps" ? 2 + 4 * ((h >>> 5) % Math.floor((H - 2) / 4)) : 1 + 2 * ((h >>> 5) % ((H - 1) / 2)), k2 = `${x},${y}`;
          if (used.has(k2) || (x === W >> 1 && y === H >> 1)) continue; used.add(k2); spot = { x, y, inner: { x, y }, wall: false }; } }
      q.slots.set(other, spot); }); }
  // the front: node 0's door out, on its bottom wall; the vault's way out
  const front = { x: W >> 1, y: H - 1, inner: { x: W >> 1, y: H - 2 } };
  // a fall in a gallery lands in a cellar (the deepest the tree reaches nearest it), else the door's own chamber
  // how many sealed doors stand between the door and each chamber: a fall never carries you past one
  for (const q of nodes) q.region = q.parent < 0 ? 0 : nodes[q.parent].region + (edges.some((e) => e.lock && e.a === q.parent && e.b === q.n) ? 1 : 0);
  for (const q of nodes) if (q.kind === "gaps") { const lower = nodes.filter((o) => o.level < q.level && o.kind !== "gaps" && o.region <= q.region); q.fallTo = lower.length ? lower[hashSeed(`${base}:fall:${q.n}`) % lower.length].n : 0; }
  const plan = { base, ...P, W, H, nodes, edges, end, front, path, gates, S: L.styles[P.style] };
  if (memo.size > 24) memo.clear(); memo.set(base, plan); return plan;
}

// ------------------------------------------------------------------------------------------------ a chamber
// Open cells (0), walls (1), holes (5), doorways (2). Mazes are carved on the odd cells; galleries are platforms over holes.
export function carveMaze(base, q, W, H, open) {
  const g = new Array(W * H).fill(1), r = rng(`${base}:maze:${q.n}`), at = (x, y) => y * W + x, stack = [[1, 1]]; g[at(1, 1)] = 0;
  while (stack.length) { const [x, y] = stack[stack.length - 1], nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && g[at(nx, ny)] === 1);
    if (!nb.length) { stack.pop(); continue; } const [nx, ny, dx, dy] = nb[Math.floor(r() * nb.length)]; g[at(x + dx / 2, y + dy / 2)] = 0; g[at(nx, ny)] = 0; stack.push([nx, ny]); }
  // braid: open a share of the blind ends into loops (fewer long walks back)
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) { const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => g[at(x + dx, y + dy)] === 1 && x + 2 * dx > 0 && y + 2 * dy > 0 && x + 2 * dx < W - 1 && y + 2 * dy < H - 1);
    if (walls.length === 3 && r() < LABYRINTHS.braid) { const [dx, dy] = walls[Math.floor(r() * walls.length)]; g[at(x + dx, y + dy)] = 0; } }
  for (const p of open) { g[at(p.x, p.y)] = p.wall ? 2 : 0; g[at(p.inner.x, p.inner.y)] = 0; }
  return g;
}
export function carveGaps(base, q, W, H, open, V = 1) {
  const L = LABYRINTHS, g = new Array(W * H).fill(5), r = rng(`${base}:gaps:${q.n}`), at = (x, y) => y * W + x, I = L.island + L.gap;
  for (let x = 0; x < W; x++) { g[at(x, 0)] = 1; g[at(x, H - 1)] = 1; } for (let y = 0; y < H; y++) { g[at(0, y)] = 1; g[at(W - 1, y)] = 1; }
  const cols = Math.floor((W - 2) / I), rows = Math.floor((H - 2) / I), keep = new Set();
  // Interior v2: a door on the bottom or right wall comes in past the last row or column of platforms; it keeps the platform
  // beside it (one gap's jump away) instead of a platform that does not exist (version 1 left it a one-tile island).
  const slot = (v, n) => V >= 2 ? Math.min(n - 1, v) : v;
  for (const p of open) keep.add(`${slot(Math.floor((p.inner.x - 1) / I), cols)},${slot(Math.floor((p.inner.y - 1) / I), rows)}`);
  const isl = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) isl.push({ i, j, on: keep.has(`${i},${j}`) || r() >= L.missing });
  const on = (i, j) => isl.find((o) => o.i === i && o.j === j)?.on;
  // every platform with a passage on it must be reachable by jumps from every other: restore missing platforms until so
  const joined = () => { const need = [...keep].map((k) => k.split(",").map(Number)); if (!need.length) return true; const seen = new Set([need[0].join()]), st = [need[0]];
    while (st.length) { const [i, j] = st.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj, k = `${a},${b}`; if (!seen.has(k) && on(a, b)) { seen.add(k); st.push([a, b]); } } }
    return need.every((p) => seen.has(p.join())); };
  for (const o of isl) if (!joined()) o.on = true; // in order: the first that mends it stays
  for (const o of isl) if (o.on) for (let y = 0; y < L.island; y++) for (let x = 0; x < L.island; x++) g[at(1 + o.i * I + x, 1 + o.j * I + y)] = 0;
  // some gaps between neighbouring platforms are bridged (no jump needed)
  for (const o of isl) if (o.on) for (const [di, dj] of [[1, 0], [0, 1]]) if (on(o.i + di, o.j + dj) && r() < L.bridged) { const mid = 1 + (L.island >> 1);
    if (di) g[at(1 + o.i * I + L.island, 1 + o.j * I + mid - 1)] = 0; else g[at(1 + o.i * I + mid - 1, 1 + o.j * I + L.island)] = 0; }
  for (const p of open) { g[at(p.x, p.y)] = p.wall ? 2 : 0; g[at(p.inner.x, p.inner.y)] = 0; }
  return g;
}

// `V`: the interior version pinned for the labyrinth (great-buildings.ts BUILDINGS.interior; 1 by default, as first released).
export function generateLabyrinthChamber(seed, id, V = 1) {
  const P = parseLabyrinthId(id), plan = P && labyrinthPlan(P.base); if (!plan) return null;
  const q = plan.nodes[P.node]; if (!q) return null;
  const L = LABYRINTHS, S = BUILDINGS.styles[L.styles[P.style].building || P.style], { W, H } = plan, open = [...q.slots.values()]; if (q.n === 0 || q.vault) open.push({ ...plan.front, wall: true });
  let grid, room = null, mat = null, far = null;
  const arrive = open[0]?.inner || { x: W >> 1, y: H >> 1 };
  if (q.kind === "court" || q.kind === "cellar") grid = carveMaze(P.base, q, W, H, open);
  else if (q.kind === "gaps") grid = carveGaps(P.base, q, W, H, open, V);
  else { const F = layFloor(P.base, 100 + q.n, W, H, S, arrive, open.flatMap((p) => [{ x: p.x, y: p.y, v: 2 }, { ...p.inner, v: 2 }])); grid = F.grid; room = F.room; mat = F.mat; far = farthest(F, arrive, () => true); }
  const [courtFloor, courtWall] = L.floors.court, [cellFloor, cellWall] = L.floors.cellar, tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, v = grid[k];
    const wallKind = q.kind === "court" ? courtWall : q.kind === "cellar" ? cellWall : S.wall, floorKind = q.kind === "court" ? courtFloor : q.kind === "cellar" ? cellFloor : q.kind === "gaps" ? S.hall : (room && room[k] >= 0 ? mat[room[k]] : S.hall);
    if (v === 5) tiles.push({ x, y, kind: "floorHole", blocked: false, hole: true, detail: k % 4 });
    else if (v === 1 || v === 4) tiles.push({ x, y, kind: v === 4 ? "rubbleFloor" : wallKind, blocked: true, rubble: v === 4 || undefined, detail: (x * 3 + y) % 4 });
    else tiles.push({ x, y, kind: floorKind, blocked: false, doorway: v === 2, detail: (x * 7 + y * 3) % 4, ...(q.kind === "court" ? { open: true } : {}) }); }
  // a style's dress (the Shell-Labyrinth's clockwork and mosaic): looks only
  const theme = plan.S.themes ? plan.S.themes[q.vault ? "vault" : q.kind] : null;
  if (theme) { const D = L.dress[theme];
    for (const t of tiles) { if (t.hole) continue; const quarter = D.quarter ? { detail: (t.x & 1) + (t.y & 1) * 2 } : {};
      if (t.blocked) { const accent = D.grid ? t.x % D.grid === 2 && t.y % D.grid === 2 : (hashSeed(`${id}:dress:${t.x},${t.y}`) % 1000) / 1000 < D.share; Object.assign(t, { kind: accent && t.x > 0 && t.y > 0 && t.x < W - 1 && t.y < H - 1 ? D.accent : D.wall, landscape: "underlands", ...(D.grid ? quarter : {}) }); }
      else Object.assign(t, { kind: D.floor, landscape: "underlands", ...quarter }); } }
  // passages
  const objects = [], name = `${plan.S.name} · ${q.vault ? plan.S.vault : q.kind === "cellar" && q.level <= -2 ? plan.S.subcellar : plan.S[q.kind]}`;
  for (const [other, spot] of q.slots) { const o = plan.nodes[other], there = o.slots.get(q.n), e = q.edges.find((v) => v.a === other || v.b === other), oname = o.vault ? plan.S.vault : o.kind === "cellar" && o.level <= -2 ? plan.S.subcellar : plan.S[o.kind];
    const dir = e.type === "door" ? "door" : o.level > q.level ? "up" : "down";
    const lock = e.lock && e.a === q.n && e.b === other ? e.lock : e.lock && e.b === q.n && e.a === other && plan.path.indexOf(q.n) < plan.path.indexOf(other) ? e.lock : null; // sealed from the near side of the true path
    const barred = e.shortcut && q.n === 0, short = e.shortcut && q.n !== 0;
    objects.push({ id: `lab-pass-${other}`, kind: "buildingStair", name: `${short ? "Door · back to the entrance" : barred ? "Barred door" : dir === "door" ? "Door" : dir === "up" ? "Ladder up" : "Ladder down"}${short || barred ? "" : ` · ${oname}`}${lock ? ` (sealed: the ${lock.name})` : ""}`, x: spot.x, y: spot.y, state: "open", actions: [dir === "down" ? "descend" : "climb"], toId: nodeId(P.base, other), toX: there.inner.x, toY: there.inner.y, dir, labyrinth: true, ...(lock ? { lock: lock.id, lockName: lock.name } : {}), ...(barred ? { barred: true, shortcutKey: `${other}` } : {}), ...(short ? { shortcutOpens: `${q.n}` } : {}) }); }
  if (q.n === 0) objects.push({ id: "building-exit", kind: "exit", name: "Door out", x: plan.front.x, y: plan.front.y, state: "open", actions: ["exit"] });
  const C = BUILDINGS.creatures, h = (k) => hashSeed(`${id}:${k}`), taken = new Set(objects.map((o) => o.y * W + o.x));
  const free = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole && !t.doorway && !taken.has(y * W + x) && Math.abs(x - arrive.x) + Math.abs(y - arrive.y) >= C.far; };
  // what can be reached from where you come in (a gallery's gaps jumped): creatures and caches stand only there
  const reach = new Set([arrive.y * W + arrive.x]), st = [arrive], ok = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole; };
  while (st.length) { const p = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let x = p.x + dx, y = p.y + dy; const t = tiles[y * W + x]; if (!t || t.blocked) continue; if (t.hole) { x += dx; y += dy; if (!ok(x, y)) continue; } const k = y * W + x; if (!reach.has(k)) { reach.add(k); st.push({ x, y }); } } }
  const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (free(x, y) && reach.has(y * W + x)) cells.push({ x, y }); cells.sort(byHash((a) => `${id}:c:${a.x},${a.y}`));
  const enemySpawns = [], ng = L.guards[0] + h("n") % (L.guards[1] - L.guards[0] + 1);
  for (const c of cells.slice(0, q.n === 0 ? 1 : ng)) { taken.add(c.y * W + c.x); enemySpawns.push({ id: `${id}:g${enemySpawns.length}`, kind: S.guards[h(`k${enemySpawns.length}`) % S.guards.length], x: c.x, y: c.y, buildingGuard: true }); }
  if (q.vault) { const spot = (far && far[0]) || cells.find((c) => !taken.has(c.y * W + c.x)) || { x: W >> 1, y: 2 };
    objects.push({ id: "building-cache", kind: "chest", name: `${plan.S.vault} Treasure`, x: spot.x, y: spot.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(spot.y * W + spot.x);
    const g = guardianBeside(tiles, W, spot, (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole && !taken.has(y * W + x); }, V, arrive);
    if (g) enemySpawns.push({ id: `${id}:guardian`, kind: S.guardian, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true });
    objects.push({ id: "building-exit", kind: "exit", name: "Way out · the front", x: plan.front.x, y: plan.front.y, state: "open", actions: ["exit"] }); }
  else if (q.cache) { const c = cells.find((p) => !taken.has(p.y * W + p.x)); if (c) objects.push({ id: "building-cache", kind: "chest", name: "Forgotten Cache", x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); }
  // interior v2: a key is never lost; with no free cell far enough from the way in, it lies on the nearest reachable floor
  const nearKey = () => { const k = [...reach].filter((i) => { const t = tiles[i]; return t && !t.blocked && !t.hole && !t.doorway && !taken.has(i) && i !== arrive.y * W + arrive.x; }).sort(byHash((a) => `${id}:k:${a}`))[0]; return k === undefined ? { ...arrive } : { x: k % W, y: (k / W) | 0 }; };
  if (q.key) { const c = [...cells].reverse().find((p) => !taken.has(p.y * W + p.x)) || cells[0] || (V >= 2 ? nearKey() : null); if (c) { objects.push({ id: `lab-${q.key.id}`, kind: "labKey", keyId: q.key.id, name: q.key.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: `The ${q.key.name}. Somewhere along the way, a sealed door waits for it.` }); taken.add(c.y * W + c.x); } }
  const fall = q.kind === "gaps" ? plan.nodes[q.fallTo] : null, fallAt = fall ? (fall.slots.values().next().value?.inner || { x: W >> 1, y: H >> 1 }) : null;
  return { seed, id, recipe: "greatBuilding", name, identity: `${plan.S.name}: ${name.split(" · ")[1]}`, danger: q.kind === "gaps" ? "a long fall" : "a maze", width: W, height: H, tiles, entry: q.n === 0 ? { ...plan.front.inner } : { ...arrive }, exit: null, objects, enemySpawns,
    ...(theme ? { dress: theme } : {}), building: { keys: plan.gates.map((g) => g.key), base: P.base, style: P.style, ...(V >= 2 ? { interiorVersion: V } : {}), floor: 1 + Math.floor(q.depth / 3), floors: 1 + Math.floor(Math.max(...plan.nodes.map((o) => o.depth)) / 3), roof: false, labyrinth: true, node: q.n, kind: q.kind, vault: q.vault, depth: q.depth, of: plan.nodes.length, fallTo: fall ? { id: nodeId(P.base, fall.n), x: fallAt.x, y: fallAt.y } : null, entries: {}, breachEntry: null, roofLadder: null, open: q.kind === "court" }, layoutVersion: 1, themePool: 0 };
}

// ------------------------------------------------------------------------------------------------ outside, on the overworld
const I = (x, y) => y * 32 + x, WET = /ocean|Ocean|lake|Lake|swamp|Swamp|toxic|Toxic|water|Water|lava|abyss|river|canyon|mire|Mire|shallows|pool|Pool/;
const CLEARS = new Set(["tree", "treeShrub", "treeSpindle", "rock", "wayfindingCue"]);
// `doorOk(map, at)` (world coherence 1, new ground only): the door must join the land the exits join (landscape.ts joinsCore);
// a spot whose door stands in a closed pocket is passed over (WG-05). Without it, placement is as it always was.
export function placeLabyrinth(map, seed, rx, ry, plan, exitsOpen, doorOk = null) {
  if (!map?.tiles?.length || map.keep || map.castle || map.canopy || map.greatBuilding) return null;
  const L = LABYRINTHS, ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 13 && x <= 19 && y >= 13 && y <= 19);
  const objAt = (x, y) => (map.objects || []).some((o) => !o.decor && !o.environmental && !CLEARS.has(o.kind) && Math.round(o.x) === x && Math.round(o.y) === y);
  const natural = (t) => !!t && !t.structure && !t.buildingId && !t.canopy && !t.keep && !t.greatBuilding && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && (t.elev || 0) <= 2;
  const ground = (x, y) => natural(map.tiles[I(x, y)]) && !lane(x, y) && !objAt(x, y), open = (x, y) => { const t = map.tiles[I(x, y)]; return natural(t) && !t.blocked && !t.slope && !(t.elev > 0) && !objAt(x, y); };
  const h = (k) => hashSeed(`${seed}:labyrinth-spot:${rx}:${ry}:${k}`), base = `labyrinth:${seed}:${rx}:${ry}:${plan.style}`, S = L.styles[plan.style];
  let tries = 0, doorMiss = 0;
  for (const [W, H] of L.footprint) {
    const spots = []; for (let oy = 2; oy <= 30 - H; oy++) for (let ox = 2; ox <= 30 - W; ox++) spots.push([ox, oy]); spots.sort((a, b) => h(a) - h(b));
    for (const [ox, oy] of spots.slice(0, 240)) {
      let fits = true; for (let y = oy; y < oy + H && fits; y++) for (let x = ox; x < ox + W && fits; x++) fits = ground(x, y); if (!fits) continue;
      const south = oy + H / 2 < 16, dx = ox + (W >> 1), dy = south ? oy + H - 1 : oy, out = { x: dx, y: dy + (south ? 1 : -1) }; if (!open(out.x, out.y)) continue;
      const tiles = map.tiles.slice(), before = exitsOpen(map), cells = [];
      for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) { cells.push({ x, y }); const i = I(x, y); map.tiles[i] = { ...map.tiles[i], x, y, blocked: true, slope: false, elev: 0, greatBuilding: true, environment: undefined }; }
      const after = exitsOpen(map); if (!before.every((o, i) => !o || after[i])) { map.tiles = tiles; if (++tries >= 6) return null; continue; }
      if (doorOk && !doorOk(map, out)) { map.tiles = tiles; if (++doorMiss >= doorOk.tries) return null; continue; }
      const set = new Set(cells.map((c) => I(c.x, c.y))), id = `labyrinth-${rx}-${ry}`, floors = 3 + h("floors") % 2, faceH = 1 + floors * .5;
      map.objects = (map.objects || []).filter((o) => !set.has(I(Math.round(o.x), Math.round(o.y))));
      map.enemySpawns = (map.enemySpawns || []).filter((e) => !set.has(I(Math.round(e.x), Math.round(e.y))));
      const rec = { id, kind: "greatBuilding", v: 2, labyrinth: true, name: S.name, style: plan.style, x: dx, y: oy + H - 1, bounds: { x: ox, y: oy, w: W, h: H }, footprint: cells, blocks: [{ part: "b", cells, faceH, floors }], doors: [{ x: dx, y: dy, face: south ? "south" : "north" }], hatches: [], crumbled: [], grain: h("grain") % 97, state: "closed", actions: [] };
      map.objects.push(rec);
      map.objects.push({ id: `${id}-door`, kind: "dungeon", buildingDoor: true, labyrinthDoor: true, buildingDoors: { rx, ry, front: out, exits: {}, hatch: null }, dungeonId: `${base}:f1`, dungeonType: "labyrinth", name: S.name, identity: "one door in, one real end", x: out.x, y: out.y, state: "open", actions: ["enter"], landmark: true, lore: `${S.name}: a maze of halls, courts, cellars and galleries. One way through; the vault at its heart lets you out at the front.` });
      map.greatBuilding = { id, base, labyrinth: true, style: plan.style, version: L.version };
      return rec;
    }
  }
  return null;
}
