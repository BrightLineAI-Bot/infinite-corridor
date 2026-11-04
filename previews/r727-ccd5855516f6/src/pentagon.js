// The Pentagon (Tim, 2026-11-04: "so large that you don't know where it's gonna go... when you're walking by, you're like,
// what is that... as large as the Houses of Parliament... the Pentagon... so many different corridors... a central Courtyard...
// intimidating and imposing... then you get to go inside... explore the abandoned building... inhabited by ghouls"; roads go
// round it; ghouls, its story in relics; keys, trial rooms and pressure plates).
//
// A Pentagon covers a 3×3 block of sections round its centre section. Seen from the land it is a five-sided wall of building
// that runs on from section to section. Inside its outer ring of building lie five ring courts, walled apart at the corners;
// inside them an inner ring of building; inside that the central court, and in it the Heart, whose way down leads to the vault.
// The rings' buildings are chambers (areas of their own, like a labyrinth's): ten round the outer ring, five round the inner,
// joined round each ring by doors (some fallen shut), and opening onto the courts by doors of their own. Two gates in the
// outer facade let you in. The way to the Heart passes a sealed door whose key lies elsewhere, a door held shut unless a block
// is built onto its pressure plate, and the Heart itself stays sealed until three trial chambers have been cleared of their
// ghouls. Relics in the chambers tell what happened to the Fivefold Court. Everything is a hash of the seed and the centre;
// a Pentagon stands only where all nine sections are new ground (`atlas.pentVersion`).
import { hashSeed, rng } from "./random.js?v=r727-ccd5855516f6";
import { BUILDINGS, layFloor, farthest } from "./great-buildings.js?v=r727-ccd5855516f6";
import { carveMaze } from "./labyrinths.js?v=r727-ccd5855516f6";

export const PENTAGON = {
  version: 1,
  every: 8, chance: .5, minRing: 10, // centre sections on a grid of `every`; this share of the eligible ones
  bands: { out: 36, outer: 29, court: 23, inner: 18, heart: 3 }, // pentagon "apothem" bands (tiles from the centre, along each face's normal)
  approach: 12, // tiles of paved way out from each gate
  wall: 1.3, // half-width of the walls between the ring courts, at the corners
  floors: { outer: 4, inner: 3, heart: 5, radial: 1 },
  size: [27, 19],
  guards: ["weepingSaint", "hangedChoir", "graveLantern", "pallidCrawler", "mirrorShade", "ashling"], ghouls: [2, 3], trialGuards: 5,
  regent: "hollowMarshal", trials: 3, broken: 3, // ring doors fallen shut (of the ten outer)
  name: "The Pentagon", court: "the Fivefold Court",
  relics: [
    "A tablet, its letters worn: “Five sat at the five faces, and none above the others. So the Court was made, and it was good.”",
    "Scratched into a door: “The Heart beneath the court was never to be opened. The Regent opened it.”",
    "A ledger, the last page torn: “Grain for the North Face: none. Grain for the South Face: none. Lamps for the Heart: forty.”",
    "On a cracked plinth: “They came up out of the Heart in the third winter, and they were the people we had lost.”",
    "A child’s chalk on a wall: five faces in a ring, and in the middle one face with no eyes.",
    "A bronze plaque, half melted: “By order of the Regent the five gates are shut. None leaves. None mourns.”",
    "A last note, folded small: “If you have come this far, do not wake her in the vault. Or wake her, and end it.”",
  ],
  names: { outer: "Outer Ring", inner: "Inner Ring", heart: ["The Heart", "The Under-Heart", "The Regent's Vault"], faces: ["North-East Face", "South-East Face", "South Face", "South-West Face", "North-West Face"] },
  messages: {
    arrive: "A wall of building runs on as far as you can see, its face turning at a great angle: the Pentagon.",
    sealed: "The Heart is sealed. Three trials remain to be cleared within the rings",
    plate: "The door will not hold open. Something heavy on the plate would hold it: build a block there.",
    rubble: "You take what stone the rubble gives",
    trial: "A trial chamber falls silent",
    relic: "A relic of the Fivefold Court",
  },
};

const mod = (a, n) => ((a % n) + n) % n;
// The centre section of a Pentagon this section could belong to.
export function pentagonCentre(rx, ry) { const E = PENTAGON.every, cx = Math.round(rx / E) * E, cy = Math.round(ry / E) * E; return Math.abs(rx - cx) <= 1 && Math.abs(ry - cy) <= 1 ? { cx, cy } : null; }
export function pentagonAt(seed, cx, cy, ok) { const P = PENTAGON; if ((hashSeed(`${seed}:pentagon:v1:${cx}:${cy}`) % 1000) / 1000 >= P.chance) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const rx = cx + dx, ry = cy + dy; if (Math.abs(rx) + Math.abs(ry) < P.minRing || !ok(rx, ry)) return false; } return true; }
const toGlobal = (cx, cy, rx, ry, x, y) => ({ gx: (rx - cx + 1) * 32 + x, gy: (ry - cy + 1) * 32 + y });
const toLocal = (cx, cy, gx, gy) => ({ rx: cx - 1 + Math.floor(gx / 32), ry: cy - 1 + Math.floor(gy / 32), x: mod(gx, 32), y: mod(gy, 32) });

// The geometry: each face i of the pentagon (point up) has its outward normal at -54° + 72°·i.
const C0 = 48, NORM = [0, 1, 2, 3, 4].map((i) => { const a = (-54 + 72 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
const VERT = [0, 1, 2, 3, 4].map((i) => { const a = (-90 + 72 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }); // vertex i sits between faces i-1 and i
export function regionAt(gx, gy) {
  const B = PENTAGON.bands, dx = gx + .5 - C0, dy = gy + .5 - C0; let m = -1e9, face = 0;
  for (let i = 0; i < 5; i++) { const v = dx * NORM[i][0] + dy * NORM[i][1]; if (v > m) { m = v; face = i; } }
  if (m > B.out) return { kind: "outside", face, m };
  if (m > B.outer) { const t = dx * -NORM[face][1] + dy * NORM[face][0]; return { kind: "outer", face, half: t < 0 ? 0 : 1, m }; }
  if (m > B.court) { for (const [vx, vy] of VERT) { const along = dx * vx + dy * vy, across = Math.abs(dx * -vy + dy * vx); if (along > 0 && across < PENTAGON.wall) return { kind: "wall", face, m }; } return { kind: "court", face, m }; }
  if (m > B.inner) return { kind: "inner", face, m };
  if (Math.abs(dx) <= B.heart && Math.abs(dy) <= B.heart) return { kind: "heart", face, m };
  return { kind: "central", face, m };
}
// A point a distance `m` out along face i's normal, `t` along the face.
const facePoint = (i, m, t) => { const [nx, ny] = NORM[i]; return { gx: Math.floor(C0 + nx * m - ny * t), gy: Math.floor(C0 + ny * m + nx * t) }; };

// ------------------------------------------------------------------------------------------------ the maze of chambers
// Nodes: o0..o9 (outer ring, two a face), i0..i4 (inner ring), h0..h2 (the Heart down to the vault). World places: the land,
// the ring courts c0..c4, the central court.
const memo = new Map();
export function pentagonPlan(seed, cx, cy) {
  const key = `${seed}:${cx}:${cy}`; if (memo.has(key)) return memo.get(key);
  const P = PENTAGON, r = rng(`pentagon:${key}:plan`), B = P.bands, N = P.names, nodes = [], edges = [];
  const add = (id, kind, name, floorKind) => { const q = { id, kind, name, floorKind, ports: [], n: nodes.length }; nodes.push(q); return q; };
  for (let i = 0; i < 10; i++) add(`o${i}`, "outer", `${N.outer} · ${N.faces[i >> 1]}${i & 1 ? " (east)" : " (west)"}`, r() < .35 ? "cellar" : "hall");
  for (let i = 0; i < 5; i++) add(`i${i}`, "inner", `${N.inner} · ${N.faces[i]}`, r() < .3 ? "cellar" : "hall");
  for (let i = 0; i < 3; i++) add(`h${i}`, "heart", N.heart[i], i === 1 ? "cellar" : "hall");
  const node = (id) => nodes.find((q) => q.id === id), pass = (a, b, extra = {}) => edges.push({ a, b, ...extra });
  // round the outer ring (some doors fallen shut), round the inner, down the Heart
  const shut = new Set(); while (shut.size < P.broken) shut.add(Math.floor(r() * 10));
  for (let i = 0; i < 10; i++) if (!shut.has(i)) pass(`o${i}`, `o${(i + 1) % 10}`);
  for (let i = 0; i < 5; i++) if (r() < .6) pass(`i${i}`, `i${(i + 1) % 5}`);
  pass("h0", "h1"); pass("h1", "h2");
  // world doors: two gates in the outer facade; court doors from the outer ring and into the inner; the central court's doors
  const world = []; const gates = []; while (gates.length < 2) { const g = Math.floor(r() * 10); if (!gates.includes(g) && (gates.length === 0 || Math.abs(g - gates[0]) >= 3)) gates.push(g); }
  for (const g of gates) world.push({ node: `o${g}`, place: "land", key: `gate${g}` });
  for (let i = 0; i < 10; i++) if (r() < .55) world.push({ node: `o${i}`, place: `c${i >> 1}`, key: `court${i}` });
  for (let f = 0; f < 5; f++) { if (!world.some((w) => w.place === `c${f}`)) world.push({ node: `o${2 * f + (r() < .5 ? 0 : 1)}`, place: `c${f}`, key: `court${2 * f}x` }); if (r() < .7) world.push({ node: `i${f}`, place: `c${f}`, key: `ring${f}` }); }
  for (let f = 0; f < 5; f++) if (r() < .45) world.push({ node: `i${f}`, place: "central", key: `centre${f}` });
  if (!world.some((w) => w.place === "central")) world.push({ node: "i0", place: "central", key: "centre0" });
  world.push({ node: "h0", place: "central", key: "heart", sealed: "trials" });
  world.push({ node: "h2", place: "land", key: "vaultout", toGate: true }); // the vault's way out: to the first gate
  // solvability over places and chambers (ignoring locks), then the locks laid on the way
  const graph = () => { const adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
    for (const e of edges) if (!e.cut) link(e.a, e.b); for (const w of world) if (!w.toGate) link(w.node, w.place); return adj; };
  const reach = (from, skip = () => false) => { const adj = graph(), seen = new Set([from]), st = [from]; while (st.length) { const v = st.pop(); for (const u of adj.get(v) || []) if (!seen.has(u) && !skip(v, u)) { seen.add(u); st.push(u); } } return seen; };
  // make sure every chamber (and so the central court) can be reached: reopen a fallen ring door, or join the inner ring, as need be
  const lost = () => nodes.some((q) => q.kind !== "heart" && !reach("land").has(q.id));
  for (const i of [...shut].sort((a, b) => a - b)) if (lost()) pass(`o${i}`, `o${(i + 1) % 10}`);
  for (let i = 0; i < 5 && lost(); i++) if (!edges.some((e) => e.a === `i${i}` && e.b === `i${(i + 1) % 5}`)) pass(`i${i}`, `i${(i + 1) % 5}`);
  for (let f = 0; f < 5 && lost(); f++) if (!world.some((w) => w.node === `i${f}` && w.place === `c${f}`)) world.push({ node: `i${f}`, place: `c${f}`, key: `ring${f}` });
  // the key: on a door the way to the central court must pass if it can; the key in a chamber reachable without it
  const centralDoors = world.filter((w) => w.place === "central" && w.node.startsWith("i"));
  const lockW = centralDoors.length === 1 ? centralDoors[0] : centralDoors[Math.floor(r() * centralDoors.length)];
  const before = reach("land", (v, u) => (v === lockW.node && u === "central") || (u === lockW.node && v === "central")), keyRoom = [...before].filter((v) => /^[oi]\d/.test(v) && v !== lockW.node);
  const keyNode = keyRoom.length ? keyRoom[Math.floor(r() * keyRoom.length)] : null;
  if (keyNode) { lockW.lock = "key0"; node(keyNode).key = { id: "key0", name: "Regent's Key" }; }
  // the plate: on a ring door in a chamber reachable from the land
  const ring = edges.filter((e) => e.a.startsWith("o") && e.b.startsWith("o") && reach("land").has(e.a)); const plateE = ring.length ? ring[Math.floor(r() * ring.length)] : null;
  if (plateE) plateE.plate = plateE.a; // the plate stands in chamber `a`, by its door to `b`
  // three trial chambers (not the Heart), reachable from the land
  const can = [...reach("land")].filter((v) => /^[oi]\d/.test(v) && v !== keyNode); const trials = [];
  while (trials.length < Math.min(P.trials, can.length)) { const t = can[Math.floor(r() * can.length)]; if (!trials.includes(t)) trials.push(t); }
  for (const t of trials) node(t).trial = true;
  // relics, one a chamber in seven of them
  const relicRooms = nodes.filter((q) => q.kind !== "heart").sort(() => r() - .5).slice(0, P.relics.length); relicRooms.forEach((q, i) => (q.relic = i));
  // ports: each chamber's doors on its walls (world doors top and bottom, ring doors left and right, the Heart's ladders inside)
  const [W, H] = P.size;
  for (const q of nodes) { const used = new Set(), slot = (side, k) => { for (let j = 0; j < 30; j++) { const h = hashSeed(`${key}:port:${q.id}:${k}:${j}`), along = side === "top" || side === "bottom" ? W : H, p = 3 + 2 * (h % Math.floor((along - 6) / 2)), x = side === "left" ? 0 : side === "right" ? W - 1 : p, y = side === "top" ? 0 : side === "bottom" ? H - 1 : p, id = `${x},${y}`;
        if (!used.has(id)) { used.add(id); return { x, y, inner: { x: x === 0 ? 1 : x === W - 1 ? W - 2 : x, y: y === 0 ? 1 : y === H - 1 ? H - 2 : y } }; } } return null; };
    for (const e of edges) if (e.a === q.id || e.b === q.id) { const other = e.a === q.id ? e.b : e.a, heart = q.kind === "heart";
      const side = heart ? null : q.kind === other[0] + "" && false ? "left" : (other === `${q.id[0]}${(Number(q.id.slice(1)) + 1) % (q.kind === "outer" ? 10 : 5)}` ? "right" : "left");
      q.ports.push({ kind: "pass", to: other, edge: e, ...(heart ? (() => { const h = hashSeed(`${key}:ladder:${q.id}:${other}`); const x = 3 + 2 * (h % 10), y = 3 + 2 * ((h >>> 5) % 6); return { x, y, inner: { x, y } }; })() : slot(side, other)) }); }
    for (const w of world) if (w.node === q.id) q.ports.push({ kind: "world", world: w, ...slot(w.place === "land" || w.place.startsWith("c") && q.kind === "inner" ? "bottom" : "top", w.key) }); }
  // world positions of every world door (pure: from the geometry)
  const T = 9; // how far along a face from its middle a half's door stands
  for (const w of world) { const i = Number(w.node.slice(1)), f = w.node.startsWith("o") ? i >> 1 : w.node.startsWith("i") ? i : 0, t = w.node.startsWith("o") ? (i & 1 ? T : -T) : 0;
    if (w.key === "heart") { w.door = { gx: C0, gy: C0 + B.heart - 1 }; w.out = { gx: C0, gy: C0 + B.heart }; continue; }
    if (w.toGate) continue;
    const [mDoor, mOut] = w.place === "land" ? [B.out - .5, B.out + 1.2] : w.place === "central" ? [B.inner + .5, B.inner - 1.2] : w.node.startsWith("o") ? [B.outer + .5, B.outer - 1.2] : [B.court - .5, B.court + 1.2];
    w.door = facePoint(f, mDoor, t); w.out = facePoint(f, mOut, t); }
  const first = world.find((w) => w.place === "land" && !w.toGate); world.find((w) => w.toGate).out = first.out;
  const plan = { key, seed, cx, cy, nodes, edges, world, W, H, trials, keyNode, plateE, lockW, gate: first };
  if (memo.size > 8) memo.clear(); memo.set(key, plan); return plan;
}
const chamberId = (seed, cx, cy, q) => `pentagon:${seed}:${cx}:${cy}:f${q.n + 1}`;
const ID = /^pentagon:(.+):(-?\d+):(-?\d+):f(\d+)$/;
export const isPentagonId = (id) => ID.test(String(id || ""));
export function parsePentagonId(id) { const m = String(id || "").match(ID); return m ? { seed: m[1], cx: Number(m[2]), cy: Number(m[3]), n: Number(m[4]) - 1, base: `pentagon:${m[1]}:${m[2]}:${m[3]}` } : null; }

// ------------------------------------------------------------------------------------------------ a section of it, outside
const I = (x, y) => y * 32 + x;
export function placePentagonSection(map, seed, cx, cy, rx, ry) {
  if (!map?.tiles?.length || map.greatBuilding) return null;
  const P = PENTAGON, plan = pentagonPlan(seed, cx, cy), cells = { outer: [], inner: [], wall: [], heart: [] };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const { gx, gy } = toGlobal(cx, cy, rx, ry, x, y), R = regionAt(gx, gy), i = I(x, y);
    if (R.kind === "outside") continue;
    const t = map.tiles[i], built = R.kind !== "court" && R.kind !== "central";
    map.tiles[i] = { ...t, x, y, kind: built ? "castleWall" : "castleCourt", landscape: "castle", blocked: built, elev: 0, slope: false, environment: undefined, canopy: undefined, structure: undefined, greatBuilding: true, pentagon: R.kind, courtyard: !built || undefined };
    if (built) cells[R.kind].push({ x, y }); }
  // approaches before the gates (a short paved way out from each)
  // (each section paints the stretch that falls in it, so an approach runs on over a section's edge; it bridges canyon and rock)
  for (const w of plan.world) if (w.place === "land" && !w.toGate) { const [nx, ny] = NORM[Number(w.node.slice(1)) >> 1];
    for (let k = 0; k < P.approach; k += .5) for (const side of [-1, -.5, 0, .5, 1]) { const gx = Math.floor(w.out.gx + .5 + nx * k - ny * side), gy = Math.floor(w.out.gy + .5 + ny * k + nx * side), l = toLocal(cx, cy, gx, gy); if (l.rx !== rx || l.ry !== ry) continue; const i = I(l.x, l.y); if (map.tiles[i].greatBuilding) continue; map.tiles[i] = { ...map.tiles[i], kind: "castleCourt", landscape: "castle", blocked: false, elev: 0, slope: false, environment: undefined, structure: undefined, canopy: undefined, causeway: true }; } }
  const inP = (o) => { const t = map.tiles[I(Math.round(o.x), Math.round(o.y))]; return t?.greatBuilding || t?.causeway; };
  map.objects = (map.objects || []).filter((o) => !inP(o)); map.enemySpawns = (map.enemySpawns || []).filter((e) => !inP(e));
  // the doors that stand in this section
  const N = P.names, doors = [];
  for (const w of plan.world) { if (w.toGate) continue; const L = toLocal(cx, cy, w.out.gx, w.out.gy), D = toLocal(cx, cy, w.door.gx, w.door.gy); if (L.rx !== rx || L.ry !== ry) continue;
    const q = plan.nodes.find((n) => n.id === w.node), name = w.key === "heart" ? N.heart[0] : w.place === "land" ? `${P.name}: a gate` : q.name;
    map.objects.push({ id: `pent-${w.key}`, kind: "dungeon", buildingDoor: true, pentagonDoor: true, dungeonId: chamberId(seed, cx, cy, q), dungeonType: "pentagon", name, identity: w.place === "land" ? "one of the five-sided wall's two gates" : "a door into the rings", x: L.x, y: L.y, state: "open", actions: ["enter"], enterAt: w.key, ...(w.sealed ? { pentSeal: w.sealed } : {}), ...(w.place === "land" ? { landmark: true, lore: `${P.name}: a wall of building on five faces, round courts within courts. The Fivefold Court is long gone; something else keeps it now.` } : {}) });
    if (D.rx === rx && D.ry === ry) doors.push({ x: D.x, y: D.y, face: L.y > D.y ? "south" : L.y < D.y ? "north" : L.x > D.x ? "east" : "west" }); }
  // the courts are held
  const hh = (k) => hashSeed(`${seed}:pent-court:${cx}:${cy}:${rx}:${ry}:${k}`), court = map.tiles.filter((t) => t.courtyard && t.pentagon), kinds = P.guards;
  for (let i = 0; i < Math.min(3, Math.floor(court.length / 60)); i++) { const c = court[hh(`g${i}`) % court.length]; if (!map.objects.some((o) => Math.round(o.x) === c.x && Math.round(o.y) === c.y)) map.enemySpawns.push({ id: `pent-${rx}-${ry}-${i}`, kind: kinds[hh(`k${i}`) % kinds.length], x: c.x, y: c.y, courtyardGuard: true }); }
  const F = P.floors, blocks = [{ part: "outer", cells: cells.outer, faceH: 1 + F.outer * .55, floors: F.outer }, { part: "inner", cells: cells.inner, faceH: 1 + F.inner * .55, floors: F.inner }, { part: "wall", cells: cells.wall, faceH: 1.1, floors: 1, wall: true }, { part: "t", cells: cells.heart, faceH: 1 + F.heart * .5, floors: F.heart }].filter((b) => b.cells.length);
  if (!blocks.length && !doors.length) return null;
  const all = blocks.flatMap((b) => b.cells), xs = all.map((c) => c.x), ys = all.map((c) => c.y), bx = xs.length ? Math.min(...xs) : 0, by = ys.length ? Math.min(...ys) : 0;
  const rec = { id: `pentagon-${cx}-${cy}-${rx}-${ry}`, kind: "greatBuilding", v: 2, pentagon: true, big: true, name: P.name, style: "keep", x: 16, y: 31, bounds: { x: bx, y: by, w: xs.length ? Math.max(...xs) - bx + 1 : 1, h: ys.length ? Math.max(...ys) - by + 1 : 1 }, footprint: all, blocks, doors, hatches: [], crumbled: [], grain: hh("grain") % 97, state: "closed", actions: [] };
  map.objects.push(rec); map.greatBuilding = { id: rec.id, pentagon: true, cx, cy, version: P.version }; map.pentagon = { cx, cy };
  return rec;
}

// ------------------------------------------------------------------------------------------------ a chamber
export function generatePentagonChamber(seed, id) {
  const Pp = parsePentagonId(id); if (!Pp) return null; const plan = pentagonPlan(Pp.seed, Pp.cx, Pp.cy), q = plan.nodes[Pp.n]; if (!q) return null;
  const P = PENTAGON, S = BUILDINGS.styles.keep, { W, H } = plan, base = `${Pp.base}:${q.id}`, open = q.ports.map((p) => ({ x: p.x, y: p.y, inner: p.inner, wall: p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1 }));
  const plateSpot = plan.plateE && plan.plateE.plate === q.id ? q.ports.find((p) => p.edge === plan.plateE) : null;
  const arrive = open[0]?.inner || { x: W >> 1, y: H >> 1 };
  let grid, room = null, mat = null;
  if (q.floorKind === "cellar") grid = carveMaze(base, { n: q.n }, W, H, open);
  else { const F = layFloor(base, 1, W, H, S, arrive, open.flatMap((p) => [{ x: p.x, y: p.y, v: 2 }, { ...p.inner, v: 2 }])); grid = F.grid; room = F.room; mat = F.mat; }
  const tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, v = grid[k], cellar = q.floorKind === "cellar";
    if (v === 1 || v === 4) tiles.push({ x, y, kind: v === 4 ? "rubbleFloor" : cellar ? "cellarWall" : S.wall, blocked: true, detail: (x * 3 + y) % 4 });
    else tiles.push({ x, y, kind: cellar ? "cellarFloor" : room && room[k] >= 0 ? mat[room[k]] : S.hall, blocked: false, doorway: v === 2, detail: (x * 7 + y * 3) % 4 }); }
  const objects = [], exitsTo = {}, entries = {}, N = P.names;
  for (const p of q.ports) { if (p.kind === "world") { const w = p.world, oid = `building-exit-${w.key}`; entries[w.key] = { ...p.inner };
      const to = w.toGate ? plan.gate.out : w.out, L = toLocal(plan.cx, plan.cy, to.gx, to.gy);
      objects.push({ id: oid, kind: "exit", name: w.toGate ? "Way out · the outer gate" : w.place === "land" ? "Gate out" : w.place === "central" ? "Door · the central court" : `Door · ${N.faces[Number(w.place.slice(1))]} court`, x: p.x, y: p.y, state: "open", actions: ["exit"], ...(w.lock ? { lock: w.lock, lockName: "Regent's Key" } : {}) });
      exitsTo[oid] = { rx: L.rx, ry: L.ry, x: L.x, y: L.y }; continue; }
    const o = plan.nodes.find((n) => n.id === p.to), there = o.ports.find((pp) => pp.kind === "pass" && pp.to === q.id), heart = q.kind === "heart", dir = heart ? (o.n > q.n ? "down" : "up") : "door";
    objects.push({ id: `lab-pass-${o.n}`, kind: "buildingStair", name: `${dir === "door" ? "Door" : dir === "down" ? "Ladder down" : "Ladder up"} · ${o.name}`, x: p.x, y: p.y, state: "open", actions: [dir === "down" ? "descend" : "climb"], toId: chamberId(plan.seed, plan.cx, plan.cy, o), toX: there.inner.x, toY: there.inner.y, dir, labyrinth: true, ...(plateSpot && p === plateSpot ? { plateLock: true } : {}) }); }
  const h = (k) => hashSeed(`${id}:${k}`), taken = new Set(objects.map((o) => o.y * W + o.x)), ok = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.doorway && !taken.has(y * W + x); };
  const reach = new Set([arrive.y * W + arrive.x]), st = [arrive]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = tiles[k]; if (!t || t.blocked || reach.has(k)) continue; reach.add(k); st.push({ x, y }); } }
  const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ok(x, y) && reach.has(y * W + x) && Math.abs(x - arrive.x) + Math.abs(y - arrive.y) >= 5) cells.push({ x, y });
  cells.sort((a, b) => hashSeed(`${id}:c:${a.x},${a.y}`) - hashSeed(`${id}:c:${b.x},${b.y}`)); const take = () => { const c = cells.find((p) => !taken.has(p.y * W + p.x)); if (c) taken.add(c.y * W + c.x); return c; };
  // the pressure plate beside its door, and rubble to build with
  if (plateSpot) { const near = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].map(([dx, dy]) => ({ x: plateSpot.inner.x + dx, y: plateSpot.inner.y + dy })).find((c) => ok(c.x, c.y) && reach.has(c.y * W + c.x));
    if (near) { tiles[near.y * W + near.x] = { ...tiles[near.y * W + near.x], plate: true }; taken.add(near.y * W + near.x); }
    const rub = take(); if (rub) objects.push({ id: "pent-rubble", kind: "pentRubble", name: "Loose rubble", x: rub.x, y: rub.y, state: "open", actions: ["take"], lore: "Fallen masonry: enough sound stone for a block or two." }); }
  if (q.key) { const c = take(); if (c) objects.push({ id: `lab-${q.key.id}`, kind: "labKey", keyId: q.key.id, name: q.key.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: "The Regent's key, heavy and cold. A sealed door into the central court waits for it." }); }
  if (q.relic !== undefined) { const c = take(); if (c) objects.push({ id: `pent-relic-${q.relic}`, kind: "pentRelic", relic: q.relic, name: "A relic of the Fivefold Court", x: c.x, y: c.y, state: "waiting", actions: ["read"], lore: P.relics[q.relic] }); }
  const enemySpawns = [], ng = q.trial ? P.trialGuards : P.ghouls[0] + h("n") % (P.ghouls[1] - P.ghouls[0] + 1);
  for (let i = 0; i < ng; i++) { const c = take(); if (!c) break; enemySpawns.push({ id: `${id}:g${i}`, kind: P.guards[h(`k${i}`) % P.guards.length], x: c.x, y: c.y, buildingGuard: true }); }
  if (q.id === "h2") { const c = take(); if (c) objects.push({ id: "building-cache", kind: "chest", name: "The Regent's Hoard", x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache });
    const g = take(); if (g) enemySpawns.push({ id: `${id}:guardian`, kind: P.regent, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true }); }
  const depth = q.kind === "outer" ? 1 : q.kind === "inner" ? 2 : 3 + Number(q.id.slice(1));
  return { seed, id, recipe: "greatBuilding", name: `${P.name} · ${q.name}${q.trial ? " · a trial" : ""}`, identity: `${P.name}: ${q.name}`, danger: "ghouls", width: W, height: H, tiles, entry: { ...arrive }, exit: null, objects, enemySpawns,
    building: { base: Pp.base, style: "keep", floor: depth, floors: 5, labyrinth: true, pentagon: true, node: q.n, kind: q.floorKind, of: plan.nodes.length, keys: plan.keyNode ? [{ id: "key0", name: "Regent's Key" }] : [], trial: !!q.trial, trials: plan.trials.length, entries, exitsTo, vault: q.id === "h2", breachEntry: null, roofLadder: null, fallTo: null }, layoutVersion: 1, themePool: 0 };
}
