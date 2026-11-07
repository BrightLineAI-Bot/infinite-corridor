// Great Castles (Tim, 2026-11-03: "a large castle structure... as large as some of those chasms... that extends between a couple
// different tiles, and then traversing it requires you to go in and out of the building... some doors that you can only access
// from within the Courtyard... find the path to get to the Courtyard... cross the Courtyard to get to the stairs... to the
// treasure room or the boss room").
//
// A Great Castle stands on the corner where four sections meet: in each of them, the 10×10 corner beside that point holds a
// quarter of it. A quarter is an L of a wing (a building, floors inside) along its outer sides, a walled courtyard in the angle,
// and the curtain wall along the section's edges (so no quarter's courtyard opens into the next section). The keep stands in one
// courtyard. The quarters are joined only through the wings: a wing has an outer door onto the land, a courtyard door onto its
// own courtyard, and side doors that let you out in the next quarter's courtyard, in the next section. The way in is fixed:
// in at the gate quarter (diagonal to the keep), through its wing into a neighbour's courtyard, through that neighbour's wing
// into the keep's courtyard, up the keep to its lord and its treasure, and its gate lets you out at the front. The fourth quarter
// is a feint: its wing leads to its own sealed courtyard and back round. Everything is a hash of the seed and the corner, and a
// castle stands only where all four sections are new ground (`atlas.castleVersion`) and none of their lanes reaches the corner.
import { hashSeed } from "./random.js?v=r810-8ed20b74216b";
import { BUILDINGS, layFloor, layFloorV3, addInteriorTerrain, farthest, addHoles, guardianBeside, TOWER_SEAL, towerSealText, placeTowerKey, planTowerClimb } from "./great-buildings.js?v=r810-8ed20b74216b";

export const CASTLES = {
  version: 3, // 3 (Tim, 2026-11-06; great-buildings.ts TOWER_SEAL): the keep's door is sealed until the Keep Key, which lies on the
  // top floor of the wing between the gate's quarter and the keep's, held by a Key Warden; a share of keeps (with a roof) have a
  // climb up their face from the court to a lever on the top that unseals them, and then the keep's top and the climb are closed to
  // the air. Castles any of whose sections was pinned to 1 or 2 keep what they had.
  // 2 (release 746, Tim: "there should always be an exit to the roof"): the keep's top is a roof to stand on, `roof.elev`
  // up (a fatal drop; the glider or the drone's booster lets you down), reached by the roof exit from the Throne of the Keep once
  // its lord has fallen. A castle any of whose sections was first seen under version 1 keeps version 1 (`castleVersionOf`).
  roof: { elev: 5 },
  every: 3, chance: .45, minRing: 7, // anchor corners on a grid of `every` sections; this share of the eligible ones
  Q: 10, // a quarter's side, in tiles, at the corner of its section
  wingFloors: [2, 3], keepFloors: [3, 4],
  interior: { wing: [24, 16], keep: [22, 20] },
  courtyardGuards: 2,
  names: { castle: "Great Castle", wings: ["North-West Range", "North-East Range", "South-West Range", "South-East Range"], courts: ["North-West Court", "North-East Court", "South-West Court", "South-East Court"], keep: "Great Keep", top: "Throne of the Keep" },
  messages: {
    arrive: "A Great Castle stands on the corner of this land and the next: its walls run on into the sections beyond. Find the way through to its keep.",
    side: "You come out in another court of the castle, in another part of the land.",
  },
};

const mod = (a, n) => ((a % n) + n) % n;
// The castle corner a section could belong to, and its quarter (0 NW, 1 NE, 2 SW, 3 SE of the corner).
export function castleCorner(rx, ry) {
  const E = CASTLES.every, X = mod(rx, E) === 0 ? rx : mod(rx + 1, E) === 0 ? rx + 1 : null, Y = mod(ry, E) === 0 ? ry : mod(ry + 1, E) === 0 ? ry + 1 : null;
  if (X === null || Y === null) return null;
  return { X, Y, q: (ry === Y ? 2 : 0) + (rx === X ? 1 : 0) };
}
export const quarterSection = (X, Y, q) => ({ rx: q % 2 ? X : X - 1, ry: q >= 2 ? Y : Y - 1 });
// A quarter's local (u, v), (0, 0) its outer corner and (Q-1, Q-1) beside the castle's corner point, in its section's tiles.
export function quarterXY(q, u, v) { const Q = CASTLES.Q; return { x: q % 2 ? Q - 1 - u : 32 - Q + u, y: q >= 2 ? Q - 1 - v : 32 - Q + v }; }

// Is there a castle on this corner? `sectionExits` and `isSettlement(rx, ry)` are the world's; `seen(rx, ry)` says a section was
// explored before castles (so the castle cannot stand).
export function castleAt(seed, X, Y, sectionExits, isSettlement, seen = () => false) {
  const C = CASTLES, Q = C.Q;
  if ((hashSeed(`${seed}:castle:v1:${X}:${Y}`) % 1000) / 1000 >= C.chance) return false;
  for (let q = 0; q < 4; q++) { const s = quarterSection(X, Y, q); if (Math.abs(s.rx) + Math.abs(s.ry) < C.minRing || seen(s.rx, s.ry) || isSettlement(s.rx, s.ry)) return false; }
  // the lanes across the four borders that meet at the corner must keep clear of it
  const nw = sectionExits(seed, X - 1, Y - 1), sw = sectionExits(seed, X - 1, Y), lim = 32 - Q - 2;
  if (nw.east > lim || sw.east < Q + 1 || nw.south > lim || sectionExits(seed, X, Y - 1).south < Q + 1) return false;
  return true;
}

// Which wing leads where (pure). k: the keep's quarter; a: the gate (diagonal to it); b: the way between; d: the feint.
export function castleTopology(seed, X, Y) {
  const h = (k) => hashSeed(`${seed}:castle:v1:${X}:${Y}:${k}`), C = CASTLES, k = h("keep") % 4, a = 3 - k, both = [0, 1, 2, 3].filter((q) => q !== a && q !== k), b = both[h("b") % 2], d = both.find((q) => q !== b);
  const wf = (q) => C.wingFloors[0] + h(`wf${q}`) % (C.wingFloors[1] - C.wingFloors[0] + 1), sideFloor = (q) => 1 + h(`sf${q}`) % wf(q);
  const wings = [0, 1, 2, 3].map((q) => ({ part: `w${q}`, q, floors: wf(q), outer: false, court: true, sides: [] }));
  wings[a].outer = true; wings[a].sides.push({ to: b, floor: sideFloor(a) }); // gate → the way between
  wings[b].sides.push({ to: k, floor: sideFloor(b) }); // the way between → the keep's court
  wings[d].outer = true; wings[d].sides.push({ to: a, floor: sideFloor(d) }); // the feint: round to the gate's court
  return { k, a, b, d, wings, keep: { part: "k", q: k, floors: C.keepFloors[0] + h("kf") % (C.keepFloors[1] - C.keepFloors[0] + 1) } };
}
const partBase = (seed, X, Y, p) => `castle:${seed}:${X}:${Y}:${p.part}:${p.floors}`;
// Version 3: the seal on the keep's door (pure). `wing`: the quarter whose wing holds the key (the way between); `climb`: whether
// the keep was rolled a climb to a lever (laid where the keep has a roof and its court has room). Null before version 3.
export function castleSeal(seed, X, Y, V = 1) {
  if (V < TOWER_SEAL.castle) return null; const T = castleTopology(seed, X, Y);
  return { key: TOWER_SEAL.key.id, name: TOWER_SEAL.key.names.castle, tower: CASTLES.names.keep, base: partBase(seed, X, Y, T.keep), wing: T.b, climb: (hashSeed(`${seed}:castle:v3:${X}:${Y}:seal-climb`) % 1000) / 1000 < TOWER_SEAL.climb.share };
}
const ID = /^castle:(.+):(-?\d+):(-?\d+):(w[0-3]|k):(\d+):f(\d+)$/;
export const isCastleId = (id) => ID.test(String(id || ""));
export function parseCastleId(id) { const m = String(id || "").match(ID); return m ? { seed: m[1], X: Number(m[2]), Y: Number(m[3]), part: m[4], floors: Number(m[5]), floor: Number(m[6]), base: `castle:${m[1]}:${m[2]}:${m[3]}:${m[4]}:${m[5]}` } : null; }

// Where everything stands, in each quarter's section (pure).
export function castleLayout(seed, X, Y) {
  const C = CASTLES, Q = C.Q, T = castleTopology(seed, X, Y), h = (k) => hashSeed(`${seed}:castle-spot:v1:${X}:${Y}:${k}`);
  const adjU = (q, r) => (q ^ r) === 1; // left-right neighbours share the u = Q-1 border; up-down ones the v = Q-1 border
  const quarters = [0, 1, 2, 3].map((q) => { const s = quarterSection(X, Y, q), P = (u, v) => quarterXY(q, u, v), W = T.wings[q], ow = h(`of${q}`) % 2, vv = 4 + h(`ov${q}`) % 3;
    return { q, ...s, P, outer: W.outer ? { door: ow ? P(0, vv) : P(vv, 0), out: ow ? P(-1, vv) : P(vv, -1), face: ow ? "u" : "v" } : null,
      court: { door: P(2, 6), inner: P(3, 6) }, // the wing's courtyard door and the court cell before it
      gates: {}, keep: q === T.k ? { cells: [], door: P(Q - 5, Q - 4), inner: P(Q - 6, Q - 4) } : null }; });
  // side gates: from wing q into court r's wall, the court cell before it the way in
  for (const W of T.wings) for (const sd of W.sides) { const r = sd.to, R = quarters[r], g = adjU(W.q, r) ? { wall: R.P(Q - 1, 5), inner: R.P(Q - 2, 5) } : { wall: R.P(5, Q - 1), inner: R.P(5, Q - 2) }; R.gates[W.q] = g; }
  for (let u = Q - 5; u <= Q - 3; u++) for (let v = Q - 5; v <= Q - 3; v++) quarters[T.k].keep.cells.push(quarters[T.k].P(u, v));
  return { X, Y, T, quarters };
}

// ------------------------------------------------------------------------------------------------ a quarter, on the overworld
const I = (x, y) => y * 32 + x;
// The version a castle stands at: the lowest pinned by any of its four sections already seen (all share one), else the current.
export function castleVersionOf(atlas, X, Y) { let v = CASTLES.version; for (let q = 0; q < 4; q++) { const s = quarterSection(X, Y, q), a = atlas?.[`${s.rx},${s.ry}`]; if (a?.castleVersion) v = Math.min(v, a.castleVersion); } return v; }
const LIFT = .34; // landscape.ts LIFT_PER_LEVEL
export function placeCastleQuarter(map, seed, X, Y, q, V = 1) {
  if (!map?.tiles?.length || map.greatBuilding) return null;
  const C = CASTLES, Q = C.Q, L = castleLayout(seed, X, Y), R = L.quarters[q], T = L.T, set = (x, y, p) => { const i = I(x, y); map.tiles[i] = { ...map.tiles[i], x, y, slope: false, elev: 0, environment: undefined, canopy: undefined, structure: undefined, ...p }; };
  const wing = [], wall = [], court = [], keepSet = new Set((R.keep?.cells || []).map((c) => I(c.x, c.y)));
  for (let v = 0; v < Q; v++) for (let u = 0; u < Q; u++) { const p = R.P(u, v);
    if (u === Q - 1 || v === Q - 1) { wall.push(p); set(p.x, p.y, { kind: "castleWall", landscape: "castle", blocked: true, greatBuilding: true }); }
    else if (u < 3 || v < 3) { wing.push(p); set(p.x, p.y, { kind: "castleWall", landscape: "castle", blocked: true, greatBuilding: true }); }
    else if (keepSet.has(I(p.x, p.y))) set(p.x, p.y, V >= 2 && map.landscape ? { kind: "castleCourt", landscape: "castle", blocked: false, elev: C.roof.elev, roofLift: (1 + T.keep.floors * .55) / (C.roof.elev * LIFT), structure: "buildingRoof", greatBuilding: true } : { kind: "castleWall", landscape: "castle", blocked: true, greatBuilding: true }); // version 2: the keep's roof
    else { court.push(p); set(p.x, p.y, { kind: "castleCourt", landscape: "castle", blocked: false, courtyard: true, greatBuilding: true }); } }
  // version 3: the keep's door wants the Keep Key; where it was rolled and the keep has a roof, a climb up its face to a lever
  const seal = R.keep ? castleSeal(seed, X, Y, V) : null, sealed = seal ? { towerSeal: { key: seal.key, name: seal.name, tower: seal.tower, base: seal.base } } : {};
  const climb = seal?.climb && V >= 2 && map.landscape ? planTowerClimb(map, R.keep.cells, court, [R.keep.inner, R.court.inner, ...Object.values(R.gates).map((g) => g.inner)], [R.keep.door], `${seed}:castle-climb:${X}:${Y}`) : null;
  if (climb) { for (const c of R.keep.cells) map.tiles[I(c.x, c.y)].towerAir = true;
    for (const c of climb.ledges) set(c.x, c.y, { kind: "battlement", landscape: "castle", blocked: false, elev: c.elev, courtyard: undefined, towerClimb: true, towerAir: true, greatBuilding: true }); }
  const yard = climb ? court.filter((c) => !climb.ledges.some((q) => q.x === c.x && q.y === c.y)) : court;
  // a causeway from the outer gate to the middle of the section (so the gate can always be walked to)
  if (R.outer) { let { x, y } = R.outer.out; for (let n = 0; n < 64 && !(Math.abs(x - 16) <= 2 && Math.abs(y - 16) <= 2); n++) { const t = map.tiles[I(x, y)]; if (!t?.greatBuilding) set(x, y, { kind: "castleCourt", landscape: "castle", blocked: false, causeway: true }); if (x !== 16) x += Math.sign(16 - x); else y += Math.sign(16 - y); } }
  const inR = (o) => { const x = Math.round(o.x), y = Math.round(o.y); return map.tiles[I(x, y)]?.greatBuilding || map.tiles[I(x, y)]?.causeway; };
  map.objects = (map.objects || []).filter((o) => !inR(o)); map.enemySpawns = (map.enemySpawns || []).filter((e) => !inR(e));
  const N = C.names, W = T.wings[q], wingBase = partBase(seed, X, Y, W), id = `castle-${X}-${Y}-${q}`, doors = [];
  const faceOf = (p, q2, inward) => { const dx = Math.sign(inward.x - p.x), dy = Math.sign(inward.y - p.y); return dy > 0 ? "south" : dy < 0 ? "north" : dx > 0 ? "east" : "west"; };
  if (R.outer) { map.objects.push({ id: `${id}-outer`, kind: "dungeon", buildingDoor: true, castleDoor: true, dungeonId: `${wingBase}:f1`, dungeonType: "castle", name: `${N.castle}: ${N.wings[q]}`, identity: "a gate of the Great Castle", ...R.outer.out, state: "open", actions: ["enter"], enterAt: "outer", landmark: true, lore: `${N.castle}. Its walls run on into the next sections; this gate opens into the ${N.wings[q]}.` }); doors.push({ ...R.outer.door, face: faceOf(R.outer.door, q, R.outer.out) }); }
  map.objects.push({ id: `${id}-court`, kind: "dungeon", buildingDoor: true, castleDoor: true, dungeonId: `${wingBase}:f1`, dungeonType: "castle", name: `${N.wings[q]} (courtyard door)`, ...R.court.inner, state: "open", actions: ["enter"], enterAt: "court" }); doors.push({ ...R.court.door, face: faceOf(R.court.door, q, R.court.inner) });
  for (const [from, g] of Object.entries(R.gates)) { const Wf = T.wings[Number(from)], sd = Wf.sides.find((s) => s.to === q);
    map.objects.push({ id: `${id}-gate-${from}`, kind: "dungeon", buildingDoor: true, castleDoor: true, dungeonId: `${partBase(seed, X, Y, Wf)}:f${sd.floor}`, dungeonType: "castle", name: `Door · ${N.wings[from]}`, ...g.inner, state: "open", actions: ["enter"], enterAt: `side${q}` }); doors.push({ ...g.wall, face: faceOf(g.wall, q, g.inner) }); }
  if (R.keep) { map.objects.push({ id: `${id}-keep`, kind: "dungeon", buildingDoor: true, castleDoor: true, dungeonId: `${partBase(seed, X, Y, T.keep)}:f1`, dungeonType: "castle", name: seal ? `${N.keep} (sealed: the ${seal.name})` : N.keep, identity: "its lord and its treasure at the top", ...R.keep.inner, state: "open", actions: ["enter"], enterAt: "court", landmark: true, ...(V >= 2 && map.landscape ? { buildingDoors: { ...quarterSection(X, Y, q), roofTop: true } } : {}), ...sealed }); /* version 2: the keep's roof, for its roof exit; 3: sealed */ doors.push({ ...R.keep.door, face: faceOf(R.keep.door, q, R.keep.inner) }); }
  if (climb) { const S = sealed.towerSeal; // version 3: the lever on the keep's top, and a sign at the climb's foot so it reads as meant
    map.objects.push({ id: `${id}-lever`, kind: "towerLever", towerSeal: S, name: `Lever · the ${N.keep}`, ...climb.lever, elev: C.roof.elev, state: "waiting", actions: ["pull"], lore: towerSealText(TOWER_SEAL.messages.climb, S) });
    map.objects.push({ id: `${id}-climb`, kind: "ruinMarker", towerClimbSign: true, name: `A climb up the ${N.keep}`, lore: towerSealText(TOWER_SEAL.messages.climb, S), ...climb.foot, state: "quiet", actions: ["inspect"] }); }
  const kinds = BUILDINGS.styles.keep.guards, hh = (k) => hashSeed(`${seed}:castle-guard:${X}:${Y}:${q}:${k}`), open = yard.filter((c) => !map.objects.some((o) => Math.round(o.x) === c.x && Math.round(o.y) === c.y));
  for (let i = 0; i < C.courtyardGuards && open.length; i++) { const c = open[hh(`g${i}`) % open.length]; if (!map.enemySpawns.some((e) => e.x === c.x && e.y === c.y)) map.enemySpawns.push({ id: `${id}-court-${i}`, kind: kinds[hh(`k${i}`) % kinds.length], x: c.x, y: c.y, courtyardGuard: true }); }
  const faceW = 1 + W.floors * .5, blocks = [{ part: "wing", cells: wing, faceH: faceW, floors: W.floors }, { part: "wall", cells: wall, faceH: .9, floors: 1, wall: true }];
  if (R.keep) blocks.push({ part: "t", cells: R.keep.cells, faceH: 1 + T.keep.floors * .55, floors: T.keep.floors });
  const xs = [...wing, ...wall].map((c) => c.x), ys = [...wing, ...wall].map((c) => c.y), bx = Math.min(...xs), by = Math.min(...ys);
  map.objects.push({ id, kind: "greatBuilding", v: 2, castle: true, name: N.castle, style: "keep", x: bx + (Q >> 1), y: by + Q - 1, bounds: { x: bx, y: by, w: Q, h: Q }, footprint: [...wing, ...wall, ...(R.keep?.cells || [])], blocks, doors, hatches: [], crumbled: [], grain: hh("grain") % 97, state: "closed", actions: [], ...(seal ? { sealed: true, ...(climb ? { climb: climb.ledges, lever: { ...climb.lever, state: "waiting" } } : {}) } : {}) });
  map.greatBuilding = { id, castle: true, X, Y, q, version: V, ...(seal ? { seal: { ...sealed.towerSeal, climb: !!climb } } : {}) };
  return map.objects[map.objects.length - 1];
}

// ------------------------------------------------------------------------------------------------ inside a wing or the keep
const memo = new Map();
export function castlePartPlan(base, V = 1) {
  const key = V >= 2 ? `${base}|v${V}` : base; if (memo.has(key)) return memo.get(key);
  const P = parseCastleId(`${base}:f1`); if (!P) return null;
  const L = castleLayout(P.seed, P.X, P.Y), T = L.T, keep = P.part === "k", part = keep ? T.keep : T.wings[Number(P.part.slice(1))], S = BUILDINGS.styles.keep;
  const [W, H] = V >= 3 ? [44, 40] : keep ? CASTLES.interior.keep : CASTLES.interior.wing, h = (k) => hashSeed(`${base}:plan:${k}`), q = part.q, R = L.quarters[q], sec = quarterSection(P.X, P.Y, q);
  // the doors on each floor, each with where it lets you out (its section and tile)
  const doors = []; // { key, floor, x, y, inner, to: { rx, ry, x, y } }
  if (keep) doors.push({ key: "court", floor: 1, x: 3 + h("kd") % (W - 6), y: H - 1, to: { ...sec, ...R.keep.inner } });
  else { if (part.outer) doors.push({ key: "outer", floor: 1, x: 3 + h("od") % (W - 6), y: H - 1, to: { ...sec, ...R.outer.out } });
    doors.push({ key: "court", floor: 1, x: 3 + h("cd") % (W - 6), y: 0, to: { ...sec, ...R.court.inner } });
    part.sides.forEach((sd, i) => { const to = L.quarters[sd.to], g = to.gates[q]; doors.push({ key: `side${sd.to}`, floor: sd.floor, x: i % 2 ? W - 1 : 0, y: 3 + h(`sd${i}`) % (H - 6), to: { ...quarterSection(P.X, P.Y, sd.to), ...g.inner } }); }); }
  for (const d of doors) d.inner = { x: d.x === 0 ? 1 : d.x === W - 1 ? W - 2 : d.x, y: d.y === 0 ? 1 : d.y === H - 1 ? H - 2 : d.y };
  const floors = []; let arrive = (doors.find((d) => d.floor === 1) || doors[0]).inner;
  for (let f = 1; f <= part.floors; f++) { const here = doors.filter((d) => d.floor === f), keepOpen = here.flatMap((d) => [{ x: d.x, y: d.y, v: 2 }, { ...d.inner, v: 2 }]);
    const F = (V >= 3 ? layFloorV3 : layFloor)(base, f, W, H, S, arrive, keepOpen), top = f === part.floors, far = farthest(F, arrive, () => true), up = top ? null : far[h(`up${f}`) % Math.max(1, Math.ceil(far.length * .12))];
    floors.push({ ...F, floor: f, arrive, up, top, far }); if (up) arrive = up; }
  for (const F of floors) if (F.floor > 1) addHoles(base, F, floors[F.floor - 2], W, H, V);
  const plan = { base, ...P, part, keep, W, H, doors, floors, sec, gate: { ...quarterSection(P.X, P.Y, T.a), ...L.quarters[T.a].outer.out }, name: keep ? CASTLES.names.keep : CASTLES.names.wings[q] };
  if (memo.size > 40) memo.clear(); memo.set(key, plan); return plan;
}

export function generateCastleFloor(seed, id, V = 1, CV = 1) { // `V`: the interior version pinned for the castle part (great-buildings.ts BUILDINGS.interior); `CV`: the castle's own version (castleVersionOf)
  const P = parseCastleId(id), plan = P && castlePartPlan(P.base, V); if (!plan) return null;
  const S = BUILDINGS.styles.keep, F = plan.floors[P.floor - 1], { W, H } = plan, tiles = [], holes = new Set((F.holes || []).map(([x, y]) => y * W + x));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, g = F.grid[k], rm = F.room[k];
    const nb = rm >= 0 ? rm : [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => F.room[(y + dy) * W + x + dx]).find((v) => v >= 0);
    if (holes.has(k)) tiles.push({ x, y, kind: "floorHole", blocked: false, hole: true, detail: k % 4 });
    else if (g === 1) tiles.push({ x, y, kind: S.wall, blocked: true, detail: (x * 3 + y) % 4 });
    else if (g === 4) tiles.push({ x, y, kind: "rubbleFloor", blocked: true, rubble: true, detail: k % 4 });
    else tiles.push({ x, y, kind: nb !== undefined && nb >= 0 ? F.mat[nb] : S.hall, blocked: false, doorway: g === 2, detail: (x * 7 + y * 3) % 4 }); }
  const N = CASTLES.names, top = P.floor === P.floors, objects = [], enemySpawns = [], entries = {}, exitsTo = {};
  const name = `${plan.name} · ${plan.keep && top ? N.top : P.floor === 1 ? "Ground Floor" : `Floor ${P.floor}`}`;
  for (const d of plan.doors) { entries[d.key] = { ...d.inner }; if (d.floor !== P.floor) continue; const oid = `building-exit-${d.key}`;
    objects.push({ id: oid, kind: "exit", name: d.key === "outer" ? "Gate out" : d.key === "court" ? (plan.keep ? "Door to the court" : "Courtyard door") : `Door · ${N.courts[Number(d.key.slice(4))]}`, x: d.x, y: d.y, state: "open", actions: ["exit"] }); exitsTo[oid] = d.to; }
  if (P.floor > 1) objects.push({ id: "building-stair-down", kind: "buildingStair", name: `Ladder down · ${P.floor === 2 ? "Ground Floor" : `Floor ${P.floor - 1}`}`, x: F.arrive.x, y: F.arrive.y, state: "open", actions: ["descend"], toId: `${P.base}:f${P.floor - 1}`, toX: F.arrive.x, toY: F.arrive.y, dir: "down" });
  if (F.up) objects.push({ id: "building-stair-up", kind: "buildingStair", name: `Ladder up · ${plan.keep && P.floor + 1 === P.floors ? N.top : `Floor ${P.floor + 1}`}`, x: F.up.x, y: F.up.y, state: "open", actions: ["climb"], toId: `${P.base}:f${P.floor + 1}`, toX: F.up.x, toY: F.up.y, dir: "up" });
  const C = BUILDINGS.creatures, h = (k) => hashSeed(`${P.base}:f${P.floor}:${k}`), taken = new Set(objects.map((o) => o.y * W + o.x)), free = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.hole && !t.doorway && !taken.has(y * W + x); };
  const spots = F.far.filter((p) => p.d >= C.far && free(p.x, p.y)), used = new Set(), n = (plan.keep ? 3 : 2) + h("n") % 2;
  for (const p of spots) { if (enemySpawns.length >= n) break; const rm = F.room[p.y * W + p.x]; if (used.has(rm)) continue; used.add(rm); taken.add(p.y * W + p.x); enemySpawns.push({ id: `${id}:g${enemySpawns.length}`, kind: S.guards[h(`k${enemySpawns.length}`) % S.guards.length], x: p.x, y: p.y, buildingGuard: true }); }
  if (plan.keep && top) { const c = spots.find((p) => !taken.has(p.y * W + p.x)) || F.far[0];
    if (c) { objects.push({ id: "building-cache", kind: "chest", name: "Treasure of the Keep", x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); taken.add(c.y * W + c.x);
      const g = guardianBeside(tiles, W, c, free, V, F.arrive); if (g) enemySpawns.push({ id: `${id}:guardian`, kind: S.guardian, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true }); }
    const way = F.far.find((p) => free(p.x, p.y) && Math.hypot(p.x - (c?.x ?? 0), p.y - (c?.y ?? 0)) > 4) || F.far[F.far.length - 1];
    objects.push({ id: "building-exit-gate", kind: "exit", name: "Way out · the castle gate", x: way.x, y: way.y, state: "open", actions: ["exit"] }); exitsTo["building-exit-gate"] = plan.gate; }
  const entry = P.floor === 1 ? { ...(plan.doors.find((d) => d.floor === 1)?.inner || F.arrive) } : { ...F.arrive };
  // version 3: the Keep Key on the top floor of the wing between the gate's quarter and the keep's, held by a Key Warden
  const seal = !plan.keep && top ? castleSeal(P.seed, P.X, P.Y, CV) : null, sealKey = seal && plan.part.q === seal.wing ? placeTowerKey(objects, enemySpawns, tiles, W, F, free, seal, id, S.guardian, V, entry) : null;
  return addInteriorTerrain({ seed, id, recipe: "greatBuilding", name, identity: `${N.castle}: the ${plan.name}`, danger: "a castle's halls", width: W, height: H, tiles, entry, exit: null, objects, enemySpawns,
    building: { base: P.base, style: "keep", floor: P.floor, floors: P.floors, castle: true, ...(V >= 2 ? { interiorVersion: V } : {}), part: P.part, entries, exitsTo, breachEntry: null, roofLadder: null, ...(sealKey ? { towerKey: { base: seal.base, key: seal.key } } : {}) }, layoutVersion: 1, themePool: 0 }, P.base, V);
}
