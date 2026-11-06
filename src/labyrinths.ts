// Labyrinths (Tim, 2026-11-03: "I want the mazes to be pretty intense and interesting... you go through and you find yourself
// outside, in the same building, but a different section of the building, and then you go in... almost self-contained
// dungeons, but you move in and out of them through the doors... some of them pretty tricky to get to the end... when you get to
// the end... you can just hit the exit door and it'll take you to the front... platforms... jumping... multiple floors that
// aren't necessarily obvious... you might go down to a subcellar... an actual maze where there's only one right path... only
// one real end").
//
// A labyrinth is one closed building on the overworld with one door. Inside it is a maze of chambers, each an area of its own,
// joined by doors (the same level) and ladders (up to a loft, down to a cellar or a subcellar). The chambers are:
//   hall    rooms split by inner walls (great-buildings.ts's floor plan)
//   court   an open-air hedge maze: outside, but still inside the labyrinth
//   cellar  a stone maze under the ground (two levels down is a subcellar)
//   gaps    a gallery of platforms over a drop: jump the one-tile gaps; fall and you land in a cellar somewhere else
// The chambers form a tree, so there is one way through. The vault is the chamber farthest from the door, the one real end,
// with the labyrinth's guardian, its treasure and a door that lets you out at the front. Dead ends sometimes hold a cache.
// Everything is a hash of the seed and the section (`atlas.labVersion`, sections first seen from this release).
import { hashSeed, rng, byHash } from "./random.ts";
import { BUILDINGS, layFloor, farthest, guardianBeside } from "./great-buildings.ts";

export const LABYRINTHS = {
  version: 3, // 3 (room mazes, Tim 2026-11-06): on ground first seen from now on, ROOM_MAZES.share of labyrinths are room mazes (placeLabyrinth); sections pinned to 1 or 2 place exactly as before
  // 2 (release 746, Tim: "there should always be an exit to the roof"): the block's top is a roof to stand on, `roof.elev`
  // up (a fatal drop), reached only by the vault's roof exit once its guardian has fallen; sections pinned to 1 keep a closed block
  roof: { elev: 5 },
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
    // dungeon theme": each chamber is dressed in one of the two by its kind (`themes`, underlands.ts's Brass Engine and Mosaic
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

// A room maze (ROOM_MAZES) carries its generator version in its base: `labyrinth:<seed>:<rx>:<ry>:<style>~r<version>` (its floors
// `:f1`.. from the lowest); a base without it is a maze of chambers exactly as before (`rooms` 0).
const ID = /^labyrinth:(.+):(-?\d+):(-?\d+):(keep|apartment|hive|shell)(?:~r(\d+))?:f(\d+)$/;
export const isLabyrinthId = (id) => ID.test(String(id || ""));
export function parseLabyrinthId(id) { const m = String(id || "").match(ID); return m ? { seed: m[1], rx: Number(m[2]), ry: Number(m[3]), style: m[4], rooms: Number(m[5]) || 0, node: Number(m[6]) - 1, base: `labyrinth:${m[1]}:${m[2]}:${m[3]}:${m[4]}${m[5] ? `~r${m[5]}` : ""}` } : null; }
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
  const P = parseLabyrinthId(`${base}:f1`); if (!P || P.rooms) return null; // a room maze has its own plan (roomMazePlan)
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
  if (parseLabyrinthId(id)?.rooms) return generateRoomMazeFloor(seed, id); // a room maze's floor (its own generator version, in the id)
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
export function placeLabyrinth(map, seed, rx, ry, plan, exitsOpen, doorOk = null, V = 1) {
  if (!map?.tiles?.length || map.keep || map.castle || map.canopy || map.greatBuilding) return null;
  const L = LABYRINTHS, ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const between = (v, c) => Number.isFinite(c) && v >= Math.min(c, 16) - 1 && v <= Math.max(c, 16) + 1;
  const lane = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16) || (Math.abs(y - 16) <= 1 && (between(x, ex.north) || between(x, ex.south))) || (Math.abs(x - 16) <= 1 && (between(y, ex.west) || between(y, ex.east))) || (x >= 13 && x <= 19 && y >= 13 && y <= 19);
  const objAt = (x, y) => (map.objects || []).some((o) => !o.decor && !o.environmental && !CLEARS.has(o.kind) && Math.round(o.x) === x && Math.round(o.y) === y);
  const natural = (t) => !!t && !t.structure && !t.buildingId && !t.canopy && !t.keep && !t.greatBuilding && !WET.test(t.kind || "") && !(t.environment && t.environment !== "tree") && (t.elev || 0) <= 2;
  const ground = (x, y) => natural(map.tiles[I(x, y)]) && !lane(x, y) && !objAt(x, y), open = (x, y) => { const t = map.tiles[I(x, y)]; return natural(t) && !t.blocked && !t.slope && !(t.elev > 0) && !objAt(x, y); };
  const rooms = V >= 3 && labyrinthForm(seed, rx, ry) === "rooms"; // version 3: ROOM_MAZES.share of labyrinths are room mazes, the rest mazes of chambers as before
  const h = (k) => hashSeed(`${seed}:labyrinth-spot:${rx}:${ry}:${k}`), base = `labyrinth:${seed}:${rx}:${ry}:${plan.style}${rooms ? `~r${ROOM_MAZES.version}` : ""}`, S = L.styles[plan.style];
  let tries = 0, doorMiss = 0;
  for (const [W, H] of L.footprint) {
    const spots = []; for (let oy = 2; oy <= 30 - H; oy++) for (let ox = 2; ox <= 30 - W; ox++) spots.push([ox, oy]); spots.sort((a, b) => h(a) - h(b));
    for (const [ox, oy] of spots.slice(0, 240)) {
      let fits = true; for (let y = oy; y < oy + H && fits; y++) for (let x = ox; x < ox + W && fits; x++) fits = ground(x, y); if (!fits) continue;
      const south = oy + H / 2 < 16, dx = ox + (W >> 1), dy = south ? oy + H - 1 : oy, out = { x: dx, y: dy + (south ? 1 : -1) }; if (!open(out.x, out.y)) continue;
      const tiles = map.tiles.slice(), before = exitsOpen(map), cells = [], roof = V >= 2 && !!map.landscape, floors0 = 3 + h("floors") % 2, lift = (1 + floors0 * .5) / (L.roof.elev * .34); // landscape.ts LIFT_PER_LEVEL
      for (let y = oy; y < oy + H; y++) for (let x = ox; x < ox + W; x++) { cells.push({ x, y }); const i = I(x, y); map.tiles[i] = roof ? { ...map.tiles[i], x, y, kind: plan.style === "keep" ? "castleCourt" : "arcFloor", landscape: plan.style === "keep" ? "castle" : "arcology", blocked: false, slope: false, elev: L.roof.elev, roofLift: lift, structure: "buildingRoof", greatBuilding: true, environment: undefined, canopy: undefined } : { ...map.tiles[i], x, y, blocked: true, slope: false, elev: 0, greatBuilding: true, environment: undefined }; } // version 2: a roof to stand on
      const after = exitsOpen(map); if (!before.every((o, i) => !o || after[i])) { map.tiles = tiles; if (++tries >= 6) return null; continue; }
      if (doorOk && !doorOk(map, out)) { map.tiles = tiles; if (++doorMiss >= doorOk.tries) return null; continue; }
      const set = new Set(cells.map((c) => I(c.x, c.y))), id = `labyrinth-${rx}-${ry}`, floors = 3 + h("floors") % 2, faceH = 1 + floors * .5;
      map.objects = (map.objects || []).filter((o) => !set.has(I(Math.round(o.x), Math.round(o.y))));
      map.enemySpawns = (map.enemySpawns || []).filter((e) => !set.has(I(Math.round(e.x), Math.round(e.y))));
      const rec = { id, kind: "greatBuilding", v: 2, labyrinth: true, name: S.name, style: plan.style, x: dx, y: oy + H - 1, bounds: { x: ox, y: oy, w: W, h: H }, footprint: cells, blocks: [{ part: "b", cells, faceH, floors }], doors: [{ x: dx, y: dy, face: south ? "south" : "north" }], hatches: [], crumbled: [], grain: h("grain") % 97, state: "closed", actions: [] };
      map.objects.push(rec);
      map.objects.push({ id: `${id}-door`, kind: "dungeon", buildingDoor: true, labyrinthDoor: true, buildingDoors: { rx, ry, front: out, exits: {}, hatch: null, ...(roof ? { roofTop: true } : {}) }, dungeonId: `${base}:f${rooms ? roomFloorOf(ROOM_MAZES.entryLevel) : 1}`, dungeonType: "labyrinth", name: S.name, identity: rooms ? ROOM_MAZES.messages.identity : "one door in, one real end", x: out.x, y: out.y, state: "open", actions: ["enter"], landmark: true, lore: rooms ? `${S.name}: ${ROOM_MAZES.messages.lore}` : `${S.name}: a maze of halls, courts, cellars and galleries. One way through; the vault at its heart lets you out at the front.`, ...(rooms ? { roomMaze: ROOM_MAZES.version } : {}) });
      map.greatBuilding = { id, base, labyrinth: true, style: plan.style, version: V >= 2 ? V : 1, ...(roof ? { roofTop: true } : {}), ...(rooms ? { roomMaze: ROOM_MAZES.version } : {}) };
      return rec;
    }
  }
  return null;
}

// ------------------------------------------------------------------------------------------------ holes that kill, holes that drop
// Tim (2026-11-05): "if you go through a hole in the floor, on most floors you should just die, and then respawn at the ladder,
// or wherever you entered that floor, because it's too punishing to traverse too many things... the holes are like chasms,
// which limit your movement... falling through every tile is too punishing. There should be some slight indication: the
// border should be green if you can go through a floor and it won't kill you, and you won't know the border is green until
// you get kind of close to it."
// Every interior with fall-through holes (a great building's, a compound part's or a castle part's floors above the first, and
// a labyrinth's galleries of gaps, the Shell-Labyrinth's included): a hole is a death that wakes you where you came onto that
// floor (game.ts `holeDeath`), unless it is one of the floor's few safe drops, which fall to the floor below as before. Which
// holes are safe is read from the floor as laid (no tile changes, so every interior keeps its layout): a floor's holes form
// groups (4-joined hole tiles; in a gallery, each missing platform, its 3×3 pit, is a group and the one-tile gaps between
// platforms are never safe), and `safeShare` of the groups, by hash, are safe drops; a floor of at least `minGroups` groups keeps
// `minSafe` (so a floor with many holes always has a way down to find, and one with a hole or two is mostly deadly). No floor's way
// through needs a hole: great-buildings.ts `addHoles` keeps every open cell reachable without one, and a gallery's platforms
// with passages are joined by jumps (tests/hole-drops.test.ts walks thousands of floors to hold this).
export const HOLE_DROPS = {
  version: 1, // in the hash: a later rule takes a new version
  safeShare: .2, minSafe: 1, minGroups: 3,
  // The green rim round a safe drop, drawn only within `near` tiles of the Wayfarer (fully from `full`): `width` a share of a tile
  // (`lowWidth` on the low quality tier); a slow breath of `pulseDepth` every `pulse` ms, none with reduced motion.
  rim: { near: 3.2, full: 1.6, rgb: "110,232,120", alpha: .85, width: .09, lowWidth: .06, pulse: 1600, pulseDepth: .22 },
  messages: {
    death: "The floor gives way and the dark below takes the Wayfarer.",
    woke: "You wake where you came onto this floor. Nothing was lost.",
    gallery: "jump the gaps · a fall is deadly; a green-rimmed pit drops you far below",
  },
};
// The safe drops of a building floor (a dungeon map with `building`): one byte a tile (1: a safe hole). Cached per map object
// (a WeakMap, so it goes with the map); null when the floor has no holes it can fall through.
const dropMemo = new WeakMap();
export function holeDrops(map) {
  if (!map?.building || !Array.isArray(map.tiles)) return null;
  if (dropMemo.has(map)) return dropMemo.get(map);
  const B = map.building, W = map.width, H = map.height || Math.floor(map.tiles.length / W), T = map.tiles, D = HOLE_DROPS;
  let out = null;
  if (B.roomMaze) { // a room maze: only its designed shafts (`drop`, over open ground below) are safe; every other hole, a void over a barrier included, is deadly
    for (let k = 0; k < W * H; k++) if (T[k]?.hole && T[k].drop) (out ||= new Uint8Array(W * H))[k] = 1; }
  else if (B.floor > 1 || B.fallTo) {
    const groups = [], hole = (k) => !!T[k]?.hole;
    if (B.labyrinth && B.kind === "gaps") { const L = LABYRINTHS, I = L.island + L.gap, cols = Math.floor((W - 2) / I), rows = Math.floor((H - 2) / I);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const cells = []; for (let y = 0; y < L.island; y++) for (let x = 0; x < L.island; x++) cells.push((1 + j * I + y) * W + 1 + i * I + x); if (cells.every(hole)) groups.push(cells); } }
    else { const seen = new Uint8Array(W * H);
      for (let k = 0; k < W * H; k++) { if (seen[k] || !hole(k)) continue; const cells = [k]; seen[k] = 1;
        for (let n = 0; n < cells.length; n++) { const c = cells[n], x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, q = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[q] || !hole(q)) continue; seen[q] = 1; cells.push(q); } }
        groups.push(cells); } }
    if (groups.length) { out = new Uint8Array(W * H);
      const ranked = groups.map((cells) => ({ cells, first: Math.min(...cells) })).map((g) => ({ ...g, h: hashSeed(`${map.id}:hole-drop:v${D.version}:${g.first}`) })).sort((a, b) => a.h - b.h || a.first - b.first);
      ranked.forEach((g, i) => { if ((i < D.minSafe && ranked.length >= D.minGroups) || (g.h % 1000) / 1000 < D.safeShare) for (const c of g.cells) out[c] = 1; }); }
  }
  dropMemo.set(map, out); return out;
}
export const safeDropAt = (map, x, y) => { const m = holeDrops(map); return !!m && x >= 0 && y >= 0 && x < map.width && m[y * map.width + x] === 1; };
// save.session.floorEntry ({ id, x, y }: where the Wayfarer came onto the building floor they are on) and
// save.session.holeDeath (the same, set by a fatal hole until the death resolves): additive, kept only when whole.
const entryOk = (q) => !!q && typeof q === "object" && typeof q.id === "string" && Number.isFinite(Number(q.x)) && Number.isFinite(Number(q.y));
export function ensureHoleSession(save) {
  const se = save?.session; if (!se || typeof se !== "object") return save;
  for (const k of ["floorEntry", "holeDeath"]) if (k in se) se[k] = entryOk(se[k]) ? { ...se[k], x: Number(se[k].x), y: Number(se[k].y) } : null;
  return save;
}

// ------------------------------------------------------------------------------------------------ burrowing a claimed room
// Tim (2026-11-05): "once you've killed the Rift [Warden] for a room in the labyrinth, you should be able to come back and
// burrow through the walls — probably wherever those shiny hidden-object walls or blocks are — to have some freedom of
// traversal". In a labyrinth chamber whose warden has fallen (the Fracture Warden that Fractured mode raises there; with the
// mode off, the chamber's own guards, every one), the walls that glint (digging.ts `wallGlints`: a block hiding something,
// showing on an open face) dig through even toward floor not yet walked (DIG_GATES' one rule lifted, for those blocks only).
// Everything else holds: the shovel is still needed and worn, the outer wall, doors and sealed rock still refuse, and what a
// block hides is found once (the dug block is recorded, as always). The claim is kept on the chamber's own history
// (`labQuelled`), so it lasts across reloads. Labyrinth chambers only (the Shell-Labyrinth's too); not the Pentagon's.
export const LAB_BURROW = {
  messages: {
    quelled: "The room's warden has fallen. Its glinting walls sound hollow now: a shovel will burrow through them.",
    burrow: "The glinting stone gives way to the shovel.",
  },
};

// ------------------------------------------------------------------------------------------------ room mazes
// Tim (2026-11-06): "what I actually wanted was mazes where you go between different rooms. There are choices between going up
// these stairs or down these stairs... some of it is a dead end. Or a room you couldn't get to before... maybe it'll take you to a
// shortcut, or maybe it'll take you to the roof, and then you can walk over the floor that was all holes, or all lava... It's kind
// of what we've done in the castle keeps"; and "you can also go down to sub floors... maybe there's a ladder that takes you down
// to a sub floor and you can walk around the obstacle, you have to take a ladder up in like the Northwest corner... a section of
// the floor that was too far for you to glide... use the levels, and as many different obstacles... natural paths".
//
// A room maze is one building of four floors stacked over the same footprint (each floor an area of its own, `:f1` the lowest):
// the undercroft (level -1), the ground floor (0, the front door), the upper floor (1) and the roof (2, open to the sky). Each
// floor is a grid of cells; a cell holds a room (its own small theme, floor and props) or solid stone, and rooms beside each other
// are joined by doorways and short corridors. One or two barrier columns cut the ground floor from wall to wall into segments: a
// field of holes, of lava, a chasm, a collapsed hall of rubble, or a wall whose one door is barred from the near side. Nothing on
// the ground crosses one (its stretch is wider than any jump: `band`, against `jump`). Each barrier has one crossing on another
// level: a walkway over the void on the upper floor, a beam over it on the roof (the upper floor's walkway broken, too far to
// jump), or a passage under it in the undercroft that comes up by a ladder in a far corner of the cut-off ground. Stairs only
// ever join floors within a segment, so the way to the vault (in the last segment, on the ground) weaves up and down between
// floors. Floors and rooms off the way are dead ends (a lookout on the roof, a cellar, a branch of rooms), some with a cache; a
// second stair in a segment makes a loop; a green-rimmed shaft drops from the upper floor to the ground beneath (one way, onto
// ground you can walk back from); a barred door opens from the far side and stays open (a shortcut back). Every stair is two-way.
// The way through is laid by construction and proved by tests/room-mazes.test.ts, a solver over the whole multi-floor graph.
export const ROOM_MAZES = {
  version: 1, // the generator, in the base id (`~r1`): a later algorithm takes a new one and this one stays as it is
  share: .5, // of labyrinths first placed at labyrinth version 3, this share are room mazes; the rest are mazes of chambers exactly as before (Tim, 2026-11-06: "maybe we can have both")
  cols: [5, 6], rows: [3, 4], cell: 6, wide: 8, // cells across and down; a cell's inside (tiles); a barrier column's inside
  room: [4, 6], // a room's side within its cell (a stair, drop, door or vault room is the whole cell)
  levels: [-1, 2], entryLevel: 0, // the undercroft, the ground (the front door), the upper floor, the roof
  twoBarriers: .55, // share with two barriers (three segments)
  band: 6, jump: 3, stub: 1, // a barrier's impassable stretch (tiles); the most hazard tiles any jump could clear; a broken walkway's stubs
  obstacles: { holes: 3, lava: 3, chasm: 2, rubble: 2, barred: 2 }, // weights, the ground floor's barrier
  crossings: { upper: 4, roof: 3, under: 4 }, // weights; two barriers never share a crossing
  keepRoom: .72, braid: .28, // a cell off the way keeps its room this often; a share of neighbouring rooms not joined are joined (loops)
  optional: { 1: .8, 2: .45, [-1]: .55 }, // a floor off the way in a segment (a dead end up or down) this often
  extraStair: .35, drops: [0, 2], // a second stair (a loop); safe drops from the upper floor to the ground
  guards: { share: .4, max: 6, roofMax: 3 }, // of a floor's rooms, guarded (one each), at most
  deadCache: .3, lookoutCache: .6, caches: 4, // a dead-end room's cache; a dead-end floor's; at most this many
  props: .3, // share of a room's edge tiles (never in line with a doorway) that hold a prop
  // Room themes (a floor and a prop; `u`: drawn from underlands.ts's tiles; `q`: a 2x2 motif) by level: the undercroft, the roof,
  // and the floors between by style.
  themes: {
    keep: [{ name: "Crypt", floor: "ossuary", prop: "sarcophagus", u: 1 }, { name: "Chapel", floor: "templeMosaic", prop: "templePillar", u: 1, q: 1 }, { name: "Solar", floor: "carpetFloor" },
      { name: "Guardroom", floor: "flagFloor", prop: "rubbleFloor" }, { name: "Storeroom", floor: "plankFloor", prop: "rubbleFloor" }, { name: "Cistern", floor: "templeMosaic", prop: "templePool", u: 1, q: 1 }],
    apartment: [{ name: "Engine Room", floor: "gratingFloor", prop: "brassPipe", u: 1, q: 1 }, { name: "Hab Unit", floor: "carpetFloor" }, { name: "Atrium Garden", floor: "tileFloor", prop: "glowcap", u: 1 },
      { name: "Collapsed Ward", floor: "concreteFloor", prop: "rubbleFloor" }, { name: "Crystal Lab", floor: "tileFloor", prop: "geodeCluster", u: 1 }],
    hive: [{ name: "Brood Chamber", floor: "fleshFloor", prop: "glowcap", u: 1 }, { name: "Geode Hollow", floor: "geodeFloor", prop: "geodeCluster", u: 1 }, { name: "Root Gallery", floor: "rootFloor", prop: "rootKnot", u: 1 },
      { name: "Chitin Hall", floor: "chitinFloor", prop: "rubbleFloor" }, { name: "Fungal Nest", floor: "fungusFloor", prop: "glowcap", u: 1 }],
    undercroft: [{ name: "Ossuary", floor: "ossuary", prop: "sarcophagus", u: 1 }, { name: "Root Cellar", floor: "rootFloor", prop: "rootKnot", u: 1 }, { name: "Cellar", floor: "cellarFloor", prop: "rubbleFloor" },
      { name: "Fungus Cellar", floor: "fungusFloor", prop: "glowcap", u: 1 }],
    roof: [{ name: "Roof Garden", floor: "yardGrass", prop: "hedgeWall" }, { name: "Leads", floor: "flagFloor", prop: "rubbleFloor" }, { name: "Lookout", floor: "plankFloor" }],
  },
  entryTheme: "Entrance Hall", vaultFloor: "mosaicFloor",
  floorNames: { [-1]: "Undercroft", 0: "Ground Floor", 1: "Upper Floor", 2: "Roof" },
  obstacleNames: { holes: "Hall of Holes", lava: "Lava Hall", chasm: "Chasm", rubble: "Collapsed Hall", barred: "Barred Hall" },
  messages: {
    identity: "one door in: rooms, stairs and floors",
    lore: "a maze of rooms over four floors. What the ground floor cannot cross, another floor can: climb over it, or go under it. The vault lets you out at the front.",
    hint: { [-1]: "the undercroft: some ways run under what the ground cannot cross", 0: "the ground floor: what it cannot cross, another floor can", 1: "the upper floor: look down on what you could not cross", 2: "the roof: open sky, a long way down" },
    barred: "Barred from the other side.",
    opens: "You draw the bolt. The door stands open both ways now.",
    open: "The door stands open.",
  },
};
export const roomFloorOf = (level) => level - ROOM_MAZES.levels[0] + 1; // the floor number (`:fN`) of a level
export const roomLevelOf = (f) => f - 1 + ROOM_MAZES.levels[0];
// Which form a labyrinth first placed at labyrinth version 3 takes (a hash of the seed and the section).
export function labyrinthForm(seed, rx, ry) { return (hashSeed(`${seed}:labyrinth:form:v1:${rx}:${ry}`) % 10000) / 10000 < ROOM_MAZES.share ? "rooms" : "chambers"; }

const rmMemo = new Map();
const cellsOf = (cols, R) => cols.flatMap((c) => Array.from({ length: R }, (_, row) => ({ c, row })));
// The plan (pure): the grid, the barriers and their crossings, which rooms stand on which floor, how they are joined, the stairs,
// the drops, the entry, the vault and the caches. Null for a base that is not a room maze.
export function roomMazePlan(base) {
  if (rmMemo.has(base)) return rmMemo.get(base);
  const P = parseLabyrinthId(`${base}:f1`); if (!P || !P.rooms) return null;
  const M = ROOM_MAZES, r = rng(`${base}:rooms`), span = ([a, b]) => a + Math.floor(r() * (b - a + 1));
  const pickW = (w) => { const ks = Object.keys(w), tot = ks.reduce((a, k) => a + w[k], 0); let v = r() * tot; for (const k of ks) { v -= w[k]; if (v < 0) return k; } return ks[ks.length - 1]; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const C = span(M.cols), R = span(M.rows), two = r() < M.twoBarriers;
  let bcols; if (!two) bcols = [1 + Math.floor(r() * (C - 2))]; else { const b1 = 1 + Math.floor(r() * (C - 4)); bcols = [b1, b1 + 2 + Math.floor(r() * (C - 3 - b1))]; }
  const wi = [], xs = []; { let x = 1; for (let c = 0; c < C; c++) { wi[c] = bcols.includes(c) ? M.wide : M.cell; xs[c] = x; x += wi[c] + 1; } }
  const W = xs[C - 1] + wi[C - 1] + 1, H = 1 + R * (M.cell + 1), ys = Array.from({ length: R }, (_, j) => 1 + j * (M.cell + 1));
  const segCols = [[]]; for (let c = 0; c < C; c++) { if (bcols.includes(c)) segCols.push([]); else segCols[segCols.length - 1].push(c); }
  const last = segCols.length - 1, rows = () => Math.floor(r() * R);
  const usedX = []; const barriers = bcols.map((col, i) => { const w = { ...M.crossings }; for (const u of usedX) if (Object.keys(w).length > 1) delete w[u];
    const crossing = pickW(w); usedX.push(crossing); return { i, col, obstacle: pickW(M.obstacles), crossing, level: crossing === "upper" ? 1 : crossing === "roof" ? 2 : -1, links: {} }; });
  // zones: the rooms of one floor in one segment, joined among themselves
  const zones = new Map(), zk = (L, k) => `${L}:${k}`, need = (L, k) => { if (!zones.has(zk(L, k))) zones.set(zk(L, k), { L, k, req: new Set(), full: new Set() }); return zones.get(zk(L, k)); };
  const req = (L, k, c, row, full = false) => { const z = need(L, k); z.req.add(`${c},${row}`); if (full) z.full.add(`${c},${row}`); };
  for (let k = 0; k <= last; k++) need(0, k);
  const stairs = [];
  for (const b of barriers) { const k0 = b.i, k1 = b.i + 1;
    if (b.crossing === "upper") { need(1, k0); need(1, k1); stairs.push({ lo: 0, k: k0 }, { lo: 0, k: k1 }); }
    else if (b.crossing === "roof") { for (const L of [1, 2]) { need(L, k0); need(L, k1); } stairs.push({ lo: 0, k: k0 }, { lo: 1, k: k0 }, { lo: 1, k: k1 }, { lo: 0, k: k1 }); }
    else { need(-1, k0); need(-1, k1); const far = segCols[k1][segCols[k1].length - 1]; stairs.push({ lo: -1, k: k1, corner: { c: far, row: r() < .5 ? 0 : R - 1 } }, { lo: -1, k: k0 }); } }
  // floors off the way: dead ends up (the upper floor, then the roof) and down (the undercroft)
  for (let k = 0; k <= last; k++) for (const L of [1, 2, -1]) { if (zones.has(zk(L, k)) || (L === 2 && !zones.has(zk(1, k))) || r() >= M.optional[L]) continue; need(L, k).dead = true; stairs.push({ lo: L === -1 ? -1 : L - 1, k }); }
  { const seen = new Set(), extra = []; for (const s of stairs) { const key = `${s.lo}:${s.k}`; if (seen.has(key)) continue; seen.add(key); if (r() < M.extraStair) extra.push({ lo: s.lo, k: s.k, extra: true }); } stairs.push(...extra); }
  // the entry: a room on the ground floor's bottom row in the first segment, its door in the outer wall
  const entry = { c: segCols[0][Math.floor(r() * segCols[0].length)], row: R - 1 }; req(0, 0, entry.c, entry.row, true);
  // stairs: a stair up stands at a cell's slot A on the floor below, its stair down at slot B on the floor above (both whole rooms)
  const slots = new Set(), slotKey = (L, c, row, s) => `${L}:${c},${row}:${s}`;
  stairs.sort((a, b) => (b.corner ? 1 : 0) - (a.corner ? 1 : 0) || (a.extra ? 1 : 0) - (b.extra ? 1 : 0) || (zones.get(zk(a.lo, a.k))?.dead || zones.get(zk(a.lo + 1, a.k))?.dead ? 1 : 0) - (zones.get(zk(b.lo, b.k))?.dead || zones.get(zk(b.lo + 1, b.k))?.dead ? 1 : 0));
  const placed = [];
  for (const s of stairs) { const optionalStair = s.extra || zones.get(zk(s.lo + 1, s.k))?.dead || zones.get(zk(s.lo, s.k))?.dead;
    if (!zones.has(zk(s.lo, s.k)) || !zones.has(zk(s.lo + 1, s.k))) continue; // a dead-end floor already dropped (below)
    const cells = s.corner ? [s.corner, { c: s.corner.c, row: R - 1 - s.corner.row }, ...shuffle(cellsOf(segCols[s.k], R))] : shuffle(cellsOf(segCols[s.k], R));
    const ok = (p) => !slots.has(slotKey(s.lo, p.c, p.row, "A")) && !slots.has(slotKey(s.lo + 1, p.c, p.row, "B")) && !placed.some((q) => q.lo === s.lo && q.k === s.k && q.c === p.c && q.row === p.row);
    const at = cells.find(ok);
    if (!at) { if (!optionalStair) throw new Error(`room maze ${base}: no cell for a stair`);
      for (const L of [s.lo, s.lo + 1]) { const z = zones.get(zk(L, s.k)); if (z?.dead && !placed.some((q) => q.k === s.k && (q.lo === L || q.lo + 1 === L))) zones.delete(zk(L, s.k)); } continue; }
    slots.add(slotKey(s.lo, at.c, at.row, "A")); slots.add(slotKey(s.lo + 1, at.c, at.row, "B")); req(s.lo, s.k, at.c, at.row, true); req(s.lo + 1, s.k, at.c, at.row, true); placed.push({ lo: s.lo, k: s.k, c: at.c, row: at.row, ...(s.extra ? { extra: true } : {}), ...(s.corner ? { corner: true } : {}) }); }
  // a dead-end floor whose stair found no cell is not built
  for (const [key, z] of zones) if (z.dead && !placed.some((s) => s.k === z.k && (s.lo === z.L || s.lo + 1 === z.L))) zones.delete(key);
  // the links of each barrier on each floor: the near and far rooms that open onto its band, gallery or passage
  for (const b of barriers) { const k0 = b.i, k1 = b.i + 1;
    for (const L of [-1, 0, 1, 2]) { const near = zones.has(zk(L, k0)), far = zones.has(zk(L, k1)), lk = {};
      if (L === -1) { if (b.crossing !== "under") continue; lk.walk = rows(); lk.near = lk.far = lk.walk; }
      else if (L === 0) { lk.near = rows(); lk.far = rows(); if (b.obstacle === "barred") lk.gate = 1 + Math.floor(r() * (H - 2)); if (b.obstacle === "chasm") lk.stub = rows(); }
      else { if (!near && !far) continue; if (b.level === L) { lk.walk = rows(); lk.near = lk.far = lk.walk; } else { if (near) lk.near = rows(); if (far) lk.far = rows(); if (near && far) lk.stub = rows(); } }
      if (lk.near !== undefined && near) req(L, k0, b.col - 1, lk.near); else delete lk.near;
      if (lk.far !== undefined && far) req(L, k1, b.col + 1, lk.far); else delete lk.far;
      b.links[L] = lk; } }
  // safe drops: a shaft in an upper-floor room over a ground room of the same segment
  const drops = [], nd = span(M.drops);
  for (const k of shuffle([...Array(last + 1).keys()])) { if (drops.length >= nd || !zones.has(zk(1, k))) continue;
    const p = shuffle(cellsOf(segCols[k], R))[0]; drops.push({ k, c: p.c, row: p.row }); req(1, k, p.c, p.row, true); req(0, k, p.c, p.row, true); }
  // each zone's rooms: a random spanning tree over its segment's cells, pruned of rooms off the way, then braided
  for (const z of zones.values()) { const cells = cellsOf(segCols[z.k], R).map((p) => `${p.c},${p.row}`), adj = new Map(cells.map((k) => [k, new Set()]));
    const nb = (k) => { const [c, row] = k.split(",").map(Number); return [[c + 1, row], [c - 1, row], [c, row + 1], [c, row - 1]].map(([a, b]) => `${a},${b}`).filter((q) => adj.has(q)); };
    const start = [...z.req][0] || cells[0], seen = new Set([start]), stack = [start];
    while (stack.length) { const k = stack[stack.length - 1], open = nb(k).filter((q) => !seen.has(q)); if (!open.length) { stack.pop(); continue; } const q = open[Math.floor(r() * open.length)]; adj.get(k).add(q); adj.get(q).add(k); seen.add(q); stack.push(q); }
    for (let pass = 0; pass < 3; pass++) for (const k of shuffle([...adj.keys()])) { if (z.req.has(k) || adj.get(k).size !== 1 || r() < M.keepRoom) continue; const [o] = adj.get(k); adj.get(o).delete(k); adj.delete(k); }
    for (const k of adj.keys()) for (const q of nb(k)) if (k < q && !adj.get(k).has(q) && r() < M.braid) { adj.get(k).add(q); adj.get(q).add(k); }
    z.adj = adj; }
  // the vault: the ground room of the last segment farthest from where its stairs come in (a whole room, off the stairs if it can be)
  const zl = zones.get(zk(0, last)), into = placed.filter((s) => s.k === last && (s.lo === 0 || s.lo === -1)).map((s) => ({ c: s.c, row: s.row }));
  const busy = (c, row) => placed.some((s) => s.c === c && s.row === row && (s.lo === 0 || s.lo + 1 === 0)) || drops.some((d) => d.c === c && d.row === row) || (last === 0 && c === entry.c && row === entry.row);
  const vaultCands = [...zl.adj.keys()].map((k) => { const [c, row] = k.split(",").map(Number); return { c, row, d: into.length ? Math.min(...into.map((p) => Math.abs(p.c - c) + Math.abs(p.row - row))) : 0, busy: busy(c, row) }; })
    .sort((a, b) => (a.busy ? 1 : 0) - (b.busy ? 1 : 0) || b.d - a.d || hashSeed(`${base}:v:${a.c},${a.row}`) - hashSeed(`${base}:v:${b.c},${b.row}`));
  const vault = { c: vaultCands[0].c, row: vaultCands[0].row }; zl.full.add(`${vault.c},${vault.row}`);
  // the rooms: a rect within each cell, a theme, and a cache for some dead ends
  const T = M.themes, styleThemes = T[P.style] || T.keep; let caches = 0;
  for (const z of zones.values()) { z.rooms = new Map();
    for (const key of z.adj.keys()) { const [c, row] = key.split(",").map(Number), full = z.full.has(key), w = full ? wi[c] : span(M.room), h = full ? M.cell : span(M.room);
      const x0 = xs[c] + Math.floor(r() * (wi[c] - w + 1)), y0 = ys[row] + Math.floor(r() * (M.cell - h + 1)), pool = z.L === -1 ? T.undercroft : z.L === 2 ? T.roof : styleThemes;
      const isEntry = z.L === 0 && z.k === 0 && c === entry.c && row === entry.row, isVault = z.L === 0 && z.k === last && c === vault.c && row === vault.row;
      const theme = pool[hashSeed(`${base}:theme:${z.L}:${key}`) % pool.length], stairsHere = placed.some((s) => s.c === c && s.row === row && (s.lo === z.L || s.lo + 1 === z.L));
      const linkHere = barriers.some((b) => { const lk = b.links[z.L]; return lk && ((lk.near === row && c === b.col - 1) || (lk.far === row && c === b.col + 1)); });
      const dead = !isEntry && !isVault && !stairsHere && !linkHere && z.adj.get(key).size <= 1, cache = dead && caches < M.caches && r() < (z.dead ? M.lookoutCache : M.deadCache);
      if (cache) caches++;
      z.rooms.set(key, { c, row, x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, cx: xs[c] + (wi[c] >> 1), cy: ys[row] + (M.cell >> 1), theme: isEntry ? { name: M.entryTheme } : isVault ? { name: LABYRINTHS.styles[P.style].vault, floor: M.vaultFloor } : theme, entry: isEntry, vault: isVault, dead, cache }); } }
  const plan = { base, ...P, W, H, C, R, xs, ys, wi, bcols, segCols, barriers, zones, stairs: placed, drops, entry, vault, last, front: { x: xs[entry.c] + (wi[entry.c] >> 1), y: H - 1 }, S: LABYRINTHS.styles[P.style] };
  if (rmMemo.size > 24) rmMemo.clear(); rmMemo.set(base, plan); return plan;
}

// One floor of a room maze: a dungeon map like a labyrinth chamber's (`building.labyrinth`, `building.roomMaze`).
// Grid: 0 floor, 1 wall, 2 doorway, 3 prop, 4 rubble, 5 hole (deadly), 6 lava (deadly), 7 a barred door, 8 a walkway, 9 a safe drop.
export function generateRoomMazeFloor(seed, id) {
  const Pid = parseLabyrinthId(id), plan = Pid && roomMazePlan(Pid.base); if (!plan) return null;
  const f = Pid.node + 1, L = roomLevelOf(f); if (L < ROOM_MAZES.levels[0] || L > ROOM_MAZES.levels[1]) return null;
  const M = ROOM_MAZES, { W, H, xs, ys, wi, barriers, zones } = plan, g = new Uint8Array(W * H).fill(1), at = (x, y) => y * W + x, set = (x, y, v) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[at(x, y)] = v; };
  const S = BUILDINGS.styles[plan.S.building || Pid.style] || BUILDINGS.styles.keep, floorKey = new Map();
  const zonesHere = [...zones.values()].filter((z) => z.L === L), rooms = zonesHere.flatMap((z) => [...z.rooms.values()]), roomAt = (c, row) => rooms.find((q) => q.c === c && q.row === row);
  const corridor = (x0, y0, x1, y1) => { const pts = []; if (y0 === y1) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) pts.push([x, y0]); else for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) pts.push([x0, y]);
    if (!pts.length) return; for (const [x, y] of pts) if (g[at(x, y)] === 1) set(x, y, 0); const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; if (g[at(ax, ay)] === 0) set(ax, ay, 2); if (g[at(bx, by)] === 0) set(bx, by, 2); };
  for (const q of rooms) for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) { set(x, y, 0); floorKey.set(at(x, y), q); }
  for (const z of zonesHere) for (const [k, nb] of z.adj) for (const o of nb) { if (k > o) continue; const a = z.rooms.get(k), b = z.rooms.get(o);
    if (a.row === b.row) { const [l, rr] = a.c < b.c ? [a, b] : [b, a]; corridor(l.x1 + 1, l.cy, rr.x0 - 1, l.cy); } else { const [t, u] = a.row < b.row ? [a, b] : [b, a]; corridor(t.cx, t.y1 + 1, t.cx, u.y0 - 1); } }
  // the barrier columns: the ground floor's band, the galleries over it, the passage under it
  const cyOf = (row) => ys[row] + (M.cell >> 1);
  for (const b of barriers) { const lk = b.links[L]; if (!lk) continue; const bx = xs[b.col], bw = wi[b.col], nearR = lk.near !== undefined ? roomAt(b.col - 1, lk.near) : null, farR = lk.far !== undefined ? roomAt(b.col + 1, lk.far) : null;
    if (L === -1) { const y = cyOf(lk.walk); for (let x = bx - 1; x <= bx + bw; x++) set(x, y, 0); for (let yy = y - 1; yy <= y + 1; yy++) for (let x = bx + 2; x <= bx + bw - 3; x++) set(x, yy, 0); corridor(nearR.x1 + 1, y, bx - 1, y); corridor(bx + bw, y, farR.x0 - 1, y); continue; }
    const nearBank = L === 0 || !!nearR, farBank = L === 0 || !!farR;
    for (let y = 1; y < H - 1; y++) { if (nearBank) set(bx, y, 0); if (farBank) set(bx + bw - 1, y, 0);
      for (let x = bx + 1; x < bx + bw - 1; x++) set(x, y, L > 0 ? 5 : b.obstacle === "lava" ? 6 : b.obstacle === "rubble" ? 4 : b.obstacle === "barred" ? 0 : 5); }
    if (L === 0 && b.obstacle === "barred") { const mx = bx + (bw >> 1); for (let y = 1; y < H - 1; y++) set(mx, y, 1); set(mx, lk.gate, 7); }
    if (lk.walk !== undefined) for (let x = bx + 1; x < bx + bw - 1; x++) set(x, cyOf(lk.walk), 8);
    if (lk.stub !== undefined) { const y = cyOf(lk.stub); for (let s = 1; s <= M.stub; s++) { if (nearBank) set(bx + s, y, 8); if (farBank) set(bx + bw - 1 - s, y, 8); } }
    if (nearR) corridor(nearR.x1 + 1, cyOf(lk.near), bx - 1, cyOf(lk.near)); if (farR) corridor(bx + bw, cyOf(lk.far), farR.x0 - 1, cyOf(lk.far)); }
  // the front door, the drops
  if (L === 0) g[at(plan.front.x, plan.front.y)] = 2;
  const slotA = (c, row) => ({ x: xs[c] + 1, y: ys[row] + 1 }), slotB = (c, row) => ({ x: xs[c] + wi[c] - 2, y: ys[row] + M.cell - 2 }), slotD = (c, row) => ({ x: xs[c] + wi[c] - 2, y: ys[row] + 1 });
  if (L === 1) for (const d of plan.drops) { const p = slotD(d.c, d.row); g[at(p.x, p.y)] = 9; }
  // objects: stairs, the doors out, the barred doors, the vault, caches
  const objects = [], fid = (lv) => `${plan.base}:f${roomFloorOf(lv)}`, FN = M.floorNames, ladder = (lo) => lo === -1;
  plan.stairs.forEach((s, i) => { const a = slotA(s.c, s.row), b = slotB(s.c, s.row);
    if (s.lo === L) objects.push({ id: `lab-stair-${i}-up`, kind: "buildingStair", name: `${ladder(s.lo) ? "Ladder up" : "Stair up"} · ${FN[s.lo + 1]}`, x: a.x, y: a.y, state: "open", actions: ["climb"], toId: fid(s.lo + 1), toX: b.x, toY: b.y, dir: "up", labyrinth: true });
    if (s.lo + 1 === L) objects.push({ id: `lab-stair-${i}-down`, kind: "buildingStair", name: `${ladder(s.lo) ? "Ladder down" : "Stair down"} · ${FN[s.lo]}`, x: b.x, y: b.y, state: "open", actions: ["descend"], toId: fid(s.lo), toX: a.x, toY: a.y, dir: "down", labyrinth: true }); });
  if (L === 0) { objects.push({ id: "building-exit", kind: "exit", name: "Door out", x: plan.front.x, y: plan.front.y, state: "open", actions: ["exit"] });
    for (const b of barriers) { if (b.obstacle !== "barred") continue; const x = xs[b.col] + (wi[b.col] >> 1); objects.push({ id: `lab-gate-${b.i}`, kind: "labGate", name: "Barred door", x, y: b.links[0].gate, state: "shut", actions: ["open"], gateKey: `gate:${b.i}`, farX: x + 1, labyrinth: true }); } }
  // props on a room's edge tiles: never in line with a doorway, never beside an object
  const r = rng(`${id}:props`), dressOf = (q) => q?.theme?.floor ? q.theme : null;
  for (const q of rooms) { const D = dressOf(q); if (!D?.prop || q.x1 - q.x0 < 2 || q.y1 - q.y0 < 2) continue;
    for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) { const edge = x === q.x0 || x === q.x1 || y === q.y0 || y === q.y1; if (!edge || x === q.cx || y === q.cy) continue;
      if (g[at(x, y)] !== 0 || objects.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) <= 1) || r() >= M.props) continue; g[at(x, y)] = 3; }
    // a corner the props have walled in is filled too (a prop), so every floor tile of the room is walkable from its middle
    const inRoom = (x, y) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1, seen = new Set([at(q.cx, q.cy)]), st = [[q.cx, q.cy]];
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = at(nx, ny); if (inRoom(nx, ny) && !seen.has(k) && (g[k] === 0 || g[k] === 2)) { seen.add(k); st.push([nx, ny]); } } }
    for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) if (g[at(x, y)] === 0 && !seen.has(at(x, y))) g[at(x, y)] = 3; }
  // tiles
  const wallKind = L === -1 ? LABYRINTHS.floors.cellar[1] : S.wall, passKind = L === -1 ? LABYRINTHS.floors.cellar[0] : L === 2 ? "flagFloor" : S.hall, tiles = new Array(W * H), sky = L === 2 ? { open: true } : {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = at(x, y), v = g[k], D = dressOf(floorKey.get(k)), detail = (x * 7 + y * 3) % 4, wd = (x * 3 + y) % 4;
    if (v === 1) tiles[k] = { x, y, kind: wallKind, blocked: true, detail: wd };
    else if (v === 3) tiles[k] = { x, y, kind: D.prop, blocked: true, prop: true, detail: wd, ...(D.u ? { landscape: "underlands" } : {}), ...(D.prop === "rubbleFloor" ? { rubble: true } : {}) };
    else if (v === 4) tiles[k] = { x, y, kind: "rubbleFloor", blocked: true, rubble: true, detail: wd };
    else if (v === 5 || v === 9) tiles[k] = { x, y, kind: "floorHole", blocked: false, hole: true, detail: k % 4, ...(v === 9 ? { drop: true } : {}), ...sky };
    else if (v === 6) tiles[k] = { x, y, kind: "lava", environment: "lava", volcanic: true, landscape: "underlands", blocked: false, detail };
    else if (v === 7) tiles[k] = { x, y, kind: wallKind, blocked: true, door: true, gate: true, detail: wd };
    else if (v === 8) tiles[k] = { x, y, kind: "plankFloor", blocked: false, bridge: true, detail, ...sky };
    else tiles[k] = { x, y, kind: D ? D.floor : passKind, blocked: false, detail: D?.q ? (x & 1) + (y & 1) * 2 : detail, ...(v === 2 ? { doorway: true } : {}), ...(D?.u ? { landscape: "underlands" } : {}), ...sky }; }
  // creatures: a share of the floor's rooms hold a guard (never the entry nor the vault); the vault its guardian by its treasure
  const taken = new Set(objects.map((o) => at(o.x, o.y))), free = (x, y) => { const t = tiles[at(x, y)]; return !!t && !t.blocked && !t.hole && !t.environment && !t.doorway && !t.bridge && !taken.has(at(x, y)); };
  const spotIn = (q, key) => { const c = []; for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++) if (free(x, y)) c.push({ x, y }); c.sort(byHash((p) => `${id}:${key}:${p.x},${p.y}`)); return c[0] || null; };
  const enemySpawns = [], G = M.guards, order = rooms.filter((q) => !q.entry && !q.vault).sort(byHash((q) => `${id}:guard:${q.c},${q.row}`)), ng = Math.min(L === 2 ? G.roofMax : G.max, Math.round(order.length * G.share));
  for (const q of order.slice(0, ng)) { const p = spotIn(q, "g"); if (!p) continue; taken.add(at(p.x, p.y)); enemySpawns.push({ id: `${id}:g${enemySpawns.length}`, kind: S.guards[hashSeed(`${id}:k${enemySpawns.length}`) % S.guards.length], x: p.x, y: p.y, buildingGuard: true }); }
  let roofSpot = null;
  for (const q of rooms) {
    if (q.vault) { const c = spotIn(q, "vault") || { x: q.cx, y: q.cy }; objects.push({ id: "building-cache", kind: "chest", name: `${plan.S.vault} Treasure`, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(at(c.x, c.y));
      const gd = guardianBeside(tiles, W, c, (x, y) => free(x, y), 2, c); if (gd) { taken.add(at(gd.x, gd.y)); enemySpawns.push({ id: `${id}:guardian`, kind: S.guardian, x: gd.x, y: gd.y, buildingGuard: true, buildingGuardian: true }); }
      const out = spotIn(q, "out"); if (out) { objects.push({ id: "building-exit-vault", kind: "exit", name: "Way out · the front", x: out.x, y: out.y, state: "open", actions: ["exit"] }); taken.add(at(out.x, out.y)); }
      roofSpot = spotIn(q, "roof"); if (roofSpot) taken.add(at(roofSpot.x, roofSpot.y)); }
    else if (q.cache) { const c = spotIn(q, "cache"); if (c) { objects.push({ id: `lab-cache-${L}-${q.c}-${q.row}`, kind: "chest", name: L === 2 ? "Lookout Cache" : "Forgotten Cache", x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(at(c.x, c.y)); } } }
  const first = L === 0 ? null : objects.find((o) => o.kind === "buildingStair"), entry = L === 0 ? { x: plan.front.x, y: plan.front.y - 1 } : first ? stepOffTile(tiles, W, first) : { x: W >> 1, y: H >> 1 };
  const floorName = FN[L], name = `${plan.S.name} · ${floorName}`, F = roomFloorOf(M.levels[1]);
  return { seed, id, recipe: "greatBuilding", name, identity: `${plan.S.name}: ${floorName}`, danger: L === 0 ? "what the ground cannot cross" : L === 2 ? "a long fall" : "a maze of rooms", width: W, height: H, tiles, entry, exit: null, objects, enemySpawns,
    building: { keys: [], base: plan.base, style: Pid.style, roomMaze: plan.rooms, level: L, floor: f, floors: F, roof: false, labyrinth: true, node: f - 1, kind: L === -1 ? "undercroft" : L === 2 ? "roof" : "rooms", vault: L === 0, depth: f - 1, of: F,
      fallTo: null, entries: {}, breachEntry: null, roofLadder: null, open: L === 2, roofSpot, hint: M.messages.hint[L],
      rooms: rooms.map((q) => ({ x0: q.x0, y0: q.y0, x1: q.x1, y1: q.y1, name: q.theme.name, ...(q.vault ? { vault: true } : {}), ...(q.entry ? { entry: true } : {}) })),
      barriers: barriers.map((b) => ({ x0: xs[b.col], x1: xs[b.col] + wi[b.col] - 1, obstacle: b.obstacle, name: M.obstacleNames[b.obstacle], crossing: b.crossing })) }, layoutVersion: 1, themePool: 0 };
}
const stepOffTile = (tiles, W, p) => { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const t = tiles[(p.y + dy) * W + p.x + dx]; if (t && !t.blocked && !t.hole && !t.environment) return { x: p.x + dx, y: p.y + dy }; } return { x: p.x, y: p.y }; };
// A barred door opened from the far side (`labOpen` holds its gateKey): its tile becomes a doorway (a new tile object, so the
// cached ground redraws) and its object stands open.
export function openRoomGate(map, o) {
  if (!map?.tiles || !o) return; const W = map.width, k = o.y * W + o.x, t = map.tiles[k];
  if (t?.gate) map.tiles[k] = { x: o.x, y: o.y, kind: BUILDINGS.styles[map.building?.style]?.hall || "flagFloor", blocked: false, doorway: true, opened: true, detail: t.detail };
  o.state = "open"; o.name = "Open door";
}
// A barred door: from its far side (east of it) the bolt draws and it stays open; from the near side it will not give.
export const roomGateSide = (o, px) => (px > o.x ? "far" : "near");
