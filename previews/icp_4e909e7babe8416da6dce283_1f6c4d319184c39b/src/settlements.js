// Hamlets (release 111): small procedural towns scattered through the wilds, pinned per atlas entry like the landscape.
// The world is split into HAMLET.cell × HAMLET.cell blocks of sections; each block nominates one section, and most
// nominated sections that have a flat, dry patch of ground grow a hamlet there. A section explored before release 109
// keeps no hamlet (its atlas entry carries no hamletVersion), so existing journeys only find hamlets in new ground.
import { hashSeed, rng, pick } from "./random.js?v=icp_4e909e7babe8416da6dce283_1f6c4d319184c39b";
import { LETHAL_KINDS } from "./landscape.js?v=icp_4e909e7babe8416da6dce283_1f6c4d319184c39b";

// Version 1 (release 111) built plain huts; version 2 (release 112) builds from the world's own shelter families and
// ruin-district styles. A section keeps the version its atlas entry was pinned to; placement and names are shared.
export const HAMLET_VERSION = 2;
export const HAMLET = { cell: 2, chance: 0.65, minDepth: 2, halfW: 7, halfH: 5, clearRadius: 10 };
// Kinds of settlement: how many huts, who lives there, and which buildings stand.
export const HAMLET_KINDS = {
  hamlet: { label: "Hamlet", huts: 2, villagers: 2, guards: 0, merchant: false, style: "timber", uses: ["cottage", "smokehouse"] },
  village: { label: "Village", huts: 3, villagers: 3, guards: 1, merchant: true, style: "masonry", uses: ["longhouse", "granary", "smithy"] },
  outpost: { label: "Outpost", huts: 2, villagers: 1, guards: 3, merchant: true, style: "fortress", uses: ["barracks", "watch-house"] },
  market: { label: "Market Town", huts: 3, villagers: 4, guards: 2, merchant: true, style: "city", uses: ["market hall", "inn", "counting-house"] },
};
const KIND_WEIGHTS = [["hamlet", 4], ["village", 3], ["outpost", 2], ["market", 1]];
const HUT_STYLES = { timber: ["cityFloor", "cityWall"], masonry: ["cloisterFloor", "cloisterWall"], fortress: ["cityFloor", "cityWall"], city: ["arcologyFloor", "arcologyWall"] };
const NAME_HEAD = ["Ash", "Cinder", "Glass", "Hollow", "Lantern", "Moss", "Thorn", "Wick", "Salt", "Ember", "Grey", "Brine", "Coil", "Still", "Hearth", "Rook"];
const NAME_TAIL = ["ford", "stead", "wick", "hold", "mere", "watch", "cross", "fall", "rest", "gate", "hollow", "barrow", "reach", "moor"];
const FOLK_NAMES = ["Odile", "Brann", "Hesk", "Marrow", "Pell", "Juno", "Tamsin", "Ruel", "Ivo", "Saffi", "Corin", "Dace", "Wren", "Ilsa", "Fenn", "Ottar"];
const FOLK_ROLES = ["Farmer", "Lamplighter", "Elder", "Weaver", "Cooper", "Herbalist", "Child", "Fisher", "Tinker"];
const FOLK_LINES = [
  "Ember Refuge isn't the only fire out here. Just the loudest.",
  "Mind the roads at dusk. The mites and the ashlings fight over them.",
  "We trade with the next town over when the Corridor lets the path stay put.",
  "Our wardens drove off a brute last week. It came back with friends.",
  "If you hear fighting past the ridge, let them tire each other out first.",
  "The Wayglass by the well keeps us found. Touch it, and you'll find us too.",
  "Watchers came down from the old towers again. The wardens met them at the ford.",
  "Rest a while. Nothing here wants to bite you.",
];
const GUARD_LINES = ["Keep your blade low inside the fence.", "We hold this ground. Help, or pass on.", "Saw a war-band of glass mites two sections out. Steer clear."];

function weighted(r, table) { const total = table.reduce((a, [, w]) => a + w, 0); let n = r() * total; for (const [k, w] of table) { if ((n -= w) < 0) return k; } return table[0][0]; }
const floorDiv = (a, b) => Math.floor(a / b);

// Which section of its block (if any) hosts a hamlet. Pure in (seed, rx, ry).
export function hamletSection(seed, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < HAMLET.minDepth) return false;
  const bx = floorDiv(rx, HAMLET.cell), by = floorDiv(ry, HAMLET.cell), r = rng(`${seed}:hamlet:v1:block:${bx}:${by}`);
  if (r() >= HAMLET.chance) return false;
  const n = Math.floor(r() * HAMLET.cell * HAMLET.cell), hx = bx * HAMLET.cell + (n % HAMLET.cell), hy = by * HAMLET.cell + Math.floor(n / HAMLET.cell);
  return hx === rx && hy === ry;
}
export function hamletIdentity(seed, rx, ry) {
  const r = rng(`${seed}:hamlet:v1:identity:${rx}:${ry}`), kind = weighted(r, KIND_WEIGHTS);
  return { id: `hamlet-${rx}-${ry}`, kind, name: pick(r, NAME_HEAD) + pick(r, NAME_TAIL) };
}

// Small sites that can be shifted aside to make room for the huts and the square.
const MOVABLE = new Set(["supplyCache", "weaponCache", "ruinMarker", "shrine"]);
function flatArea(map, cx, cy) {
  const e0 = map.tiles[cy * 32 + cx]?.elev || 0;
  for (let y = cy - HAMLET.halfH; y <= cy + HAMLET.halfH; y++) for (let x = cx - HAMLET.halfW; x <= cx + HAMLET.halfW; x++) {
    const t = map.tiles[y * 32 + x];
    if (!t || (t.blocked && !(t.kind === "blocked" && !t.landscape)) || t.environment || t.structure || t.buildingId || LETHAL_KINDS.has(t.kind) || t.kind === "shallows" || t.kind === "dock" || (t.elev || 0) !== e0) return false;
  }
  return !(map.objects || []).some((o) => !o.environmental && !MOVABLE.has(o.kind) && Math.abs(o.x - cx) <= HAMLET.halfW + 1 && Math.abs(o.y - cy) <= HAMLET.halfH + 1);
}
// The hamlet's centre: the nearest flat, open patch to the middle of the section, or null.
export function hamletSite(map) {
  const spots = [];
  for (let cy = 9; cy <= 22; cy++) for (let cx = 10; cx <= 21; cx++) spots.push([cx, cy]);
  spots.sort((a, b) => Math.hypot(a[0] - 16, a[1] - 16) - Math.hypot(b[0] - 16, b[1] - 16) || a[1] - b[1] || a[0] - b[0]);
  for (const [cx, cy] of spots) if (flatArea(map, cx, cy)) return { x: cx, y: cy };
  return null;
}

function buildHut(map, id, x0, y0, w, h, floor, wall, extra) {
  const cells = [], interior = [], doorX = x0 + Math.floor(w / 2), doorY = y0 + h - 1;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const sides = [];
    if (x === x0) sides.push("west"); if (x === x0 + w - 1) sides.push("east"); if (y === y0) sides.push("north"); if (y === y0 + h - 1) sides.push("south");
    const door = x === doorX && y === doorY, isWall = sides.length > 0 && !door, i = y * 32 + x;
    map.tiles[i] = { ...map.tiles[i], kind: isWall ? wall : floor, blocked: false, structure: door ? "districtDoor" : isWall ? "districtWall" : "districtInterior", buildingId: id, doorSide: door ? "south" : undefined, wallSides: isWall ? sides : [] };
    cells.push({ x, y }); if (!isWall) interior.push({ x, y });
  }
  const anchor = interior[Math.floor(interior.length / 2)] || cells[0];
  map.objects.push({ id, kind: "architecturalBuilding", x: anchor.x, y: anchor.y, state: "quiet", actions: [], bounds: { x: x0, y: y0, w, h }, door: { x: doorX, y: doorY, side: "south", width: 1 }, entrances: [{ x: doorX, y: doorY, side: "south" }], shape: "rect", footprint: cells, facadeHeight: 1, roofProfile: "gable", facadeRhythm: "paired", accent: "copper", signGlyph: 0, settlementBuilding: true, ...extra });
}

// Version 2 architecture: each building borrows one of the world's shelter families (drawn as a shack) or one of its
// ruin-district styles (drawn as a district building), with that family's shapes. Lots are 5x5, door on the south.
export const HAMLET_ARCHITECTURE = {
  shelters: {
    timber: { styles: ["pilgrim", "chapel", "workshop"], shapes: ["rect", "lshape", "cross"], roof: "gable" },
    masonry: { styles: ["stoneCottage", "shrineHouse"], shapes: ["rect", "lshape", "cross"], roof: "gable" },
    ruinedGatehouse: { styles: ["ruinedKeep", "gatehouse"], shapes: ["cross", "lshape"], roof: "stepped" },
    cyberRelay: { styles: ["neonKiosk", "relayBunker"], shapes: ["rect", "cross"], roof: "flat" },
    alienGeometric: { styles: ["prismVault", "orbitalPod"], shapes: ["diamond", "cross"], roof: "faceted" },
    biomechanical: { styles: ["ribNest", "carapace"], shapes: ["oval", "lshape"], roof: "carapace" },
  },
  districts: {
    city: { floor: "cityFloor", wall: "cityWall", shapes: ["rect", "lshape", "cross"], roofs: ["gable", "flat", "stepped", "spire"] },
    arcology: { floor: "arcologyFloor", wall: "arcologyWall", shapes: ["rect", "cross"], roofs: ["flat", "spire"] },
    cloister: { floor: "cloisterFloor", wall: "cloisterWall", shapes: ["cross", "lshape"], roofs: ["gable", "spire"] },
    fortress: { floor: "cityFloor", wall: "cityWall", shapes: ["rect", "lshape"], roofs: ["flat", "stepped"] },
  },
  // Which families each kind of town favours; a town mixes its picks building by building.
  byKind: {
    hamlet: ["timber", "timber", "masonry", "biomechanical", "city"],
    village: ["masonry", "timber", "cloister", "city", "alienGeometric"],
    outpost: ["fortress", "ruinedGatehouse", "masonry", "cyberRelay"],
    market: ["city", "arcology", "cyberRelay", "masonry", "cloister", "alienGeometric"],
  },
};
function inShape(shape, lx, ly, w, h) {
  if (shape === "lshape") return lx < 3 || ly >= h - 3;
  if (shape === "cross") return Math.abs(lx - (w - 1) / 2) < 2 || Math.abs(ly - (h - 1) / 2) < 2;
  if (shape === "diamond") return Math.abs(lx - (w - 1) / 2) / (w / 2) + Math.abs(ly - (h - 1) / 2) / (h / 2) <= 1.15 || ly >= h - 2;
  if (shape === "oval") return ((lx - (w - 1) / 2) / (w / 2)) ** 2 + ((ly - (h - 1) / 2) / (h / 2)) ** 2 <= 1.12 || ly >= h - 2;
  return true;
}
function buildMixed(map, r, id, x0, y0, kind, name) {
  const A = HAMLET_ARCHITECTURE, family = pick(r, A.byKind[kind] || A.byKind.hamlet);
  const shelter = A.shelters[family], district = A.districts[family], w = 5, h = 5, shape = pick(r, (shelter || district).shapes), mirror = r() < .5;
  const cells = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inShape(shape, mirror ? w - 1 - (x - x0) : x - x0, y - y0, w, h)) cells.push({ x, y });
  const set = new Set(cells.map((c) => `${c.x},${c.y}`)), door = { x: x0 + 2, y: y0 + h - 1, side: "south" }, interior = [];
  for (const c of cells) {
    const sides = [[1, 0, "east"], [-1, 0, "west"], [0, 1, "south"], [0, -1, "north"]].filter(([dx, dy]) => !set.has(`${c.x + dx},${c.y + dy}`)).map((q) => q[2]);
    const isDoor = c.x === door.x && c.y === door.y, isWall = sides.length > 0 && !isDoor, i = c.y * 32 + c.x, t = map.tiles[i];
    if (shelter) map.tiles[i] = { ...t, kind: "refuge", blocked: false, structure: isDoor ? "shackDoor" : isWall ? "shackWall" : "shackInterior", wallSides: isWall ? sides : [], buildingId: id, doorSide: isDoor ? "south" : undefined, shelterFamily: family, shelterTheme: "hamlet" };
    else map.tiles[i] = { ...t, kind: isWall ? district.wall : district.floor, blocked: false, structure: isDoor ? "districtDoor" : isWall ? "districtWall" : "districtInterior", districtStyle: family, buildingId: id, doorSide: isDoor ? "south" : undefined, wallSides: isWall ? sides : [] };
    if (!isWall) interior.push(c);
  }
  const anchor = interior[Math.floor(interior.length / 2)] || cells[0], common = { id, name, x: anchor.x, y: anchor.y, bounds: { x: x0, y: y0, w, h }, door: { ...door, width: 1 }, entrances: [door], shape, footprint: cells, settlementBuilding: true, architecture: family };
  if (shelter) map.objects.push({ ...common, kind: "shack", state: "quiet", actions: ["inspect"], environmental: true, schemaVersion: 2, family, theme: "hamlet", facadeStyle: pick(r, shelter.styles), roofProfile: shelter.roof, condition: "kept", signGlyph: Math.floor(r() * 6), incomplete: false });
  else map.objects.push({ ...common, kind: "architecturalBuilding", state: "quiet", actions: [], districtStyle: family, facadeHeight: 1 + Math.floor(r() * 2), roofProfile: pick(r, district.roofs), facadeRhythm: pick(r, ["paired", "narrow", "broad"]), accent: pick(r, ["copper", "ivory", "oxide", "violet"]), signGlyph: Math.floor(r() * 8), buildingUse: name });
}

// Mutates an overworld section map (after the landscape pass). Returns the settlement record or null.
export function applyHamlet(map, seed, rx, ry, version = HAMLET_VERSION) {
  if (!map || map.settlement || map.hamlet || map.tiles?.length !== 1024 || !hamletSection(seed, rx, ry)) return null;
  const site = hamletSite(map);
  if (!site) return null;
  const ident = hamletIdentity(seed, rx, ry), def = HAMLET_KINDS[ident.kind], r = rng(`${seed}:hamlet:v${version}:layout:${rx}:${ry}`);
  const { x: cx, y: cy } = site, [floor, wall] = HUT_STYLES[def.style];
  for (let y = cy - HAMLET.halfH; y <= cy + HAMLET.halfH; y++) for (let x = cx - HAMLET.halfW; x <= cx + HAMLET.halfW; x++) { const i = y * 32 + x; map.tiles[i] = { ...map.tiles[i], kind: "refuge", blocked: false }; }
  const hutSlots = [[cx - 7, cy - 5], [cx + 3, cy - 5], [cx - 2, cy - 5]];
  if (version >= 2) for (let i = 0; i < def.huts; i++) { const [x, y] = hutSlots[i]; buildMixed(map, r, `${ident.id}-hut-${i}`, x, y, ident.kind, `${ident.name} ${def.uses[i % def.uses.length]}`); }
  else for (let i = 0; i < def.huts; i++) { const [x, y] = hutSlots[i]; buildHut(map, `${ident.id}-hut-${i}`, x, y, 5, 4, floor, wall, { name: `${ident.name} ${def.uses[i % def.uses.length]}`, districtStyle: def.style === "masonry" ? "cloister" : def.style === "city" ? "arcology" : def.style === "fortress" ? "fortress" : "city" }); }
  map.objects.push({ id: `beacon-${ident.id}`, kind: "checkpoint", name: `${ident.name} Wayglass`, x: cx, y: cy + 2, state: "quiet", actions: ["activate"], landmark: true, settlement: ident.id });
  const spots = [[cx - 4, cy + 1], [cx + 4, cy + 1], [cx - 2, cy + 4], [cx + 2, cy + 4], [cx - 5, cy + 3], [cx + 5, cy + 3]], used = new Set();
  const take = () => { for (const s of spots) { const k = s.join(","); if (!used.has(k)) { used.add(k); return s; } } return [cx, cy + 4]; };
  const folk = [...FOLK_NAMES].sort((a, b) => hashSeed(`${ident.id}:${a}`) - hashSeed(`${ident.id}:${b}`));
  if (def.merchant) { const [x, y] = take(); map.objects.push({ id: `${ident.id}-merchant`, kind: "shelterMerchant", name: `${folk.pop()} the Trader`, role: `${def.label} trader`, x, y, state: "calm", actions: ["speak", "trade"], settlement: ident.id }); }
  for (let i = 0; i < def.villagers; i++) { const [x, y] = take(); map.objects.push({ id: `${ident.id}-folk-${i}`, kind: "villager", name: folk.pop(), role: pick(r, FOLK_ROLES), line: pick(r, FOLK_LINES), x, y, state: "calm", actions: ["speak"], settlement: ident.id }); }
  for (let i = 0; i < def.guards; i++) { const x = i % 2 ? cx + HAMLET.halfW : cx - HAMLET.halfW, y = cy + 1 + Math.floor(i / 2) * 3; map.objects.push({ id: `${ident.id}-warden-${i}`, kind: "villager", guard: true, name: `Warden ${folk.pop()}`, role: "Warden", line: pick(r, GUARD_LINES), x, y, state: "calm", actions: ["speak"], settlement: ident.id }); }
  // Shift any small site the huts or residents now stand on to a free spot along the square's south edge.
  const taken = new Set(map.objects.filter((o) => o.settlement === ident.id).map((o) => `${o.x},${o.y}`)), free = [];
  for (let x = cx - HAMLET.halfW + 1; x < cx + HAMLET.halfW; x++) for (const y of [cy + HAMLET.halfH, version >= 2 ? cy : cy - 1]) if (!taken.has(`${x},${y}`) && !map.tiles[y * 32 + x].buildingId) free.push([x, y]);
  for (const o of map.objects) if (MOVABLE.has(o.kind) && (map.tiles[o.y * 32 + o.x]?.buildingId || taken.has(`${o.x},${o.y}`))) { const at = free.find(([x, y]) => !map.objects.some((q) => q.x === x && q.y === y)); if (at) [o.x, o.y] = at; }
  map.enemySpawns = (map.enemySpawns || []).filter((e) => Math.hypot(e.x - cx, e.y - cy) > HAMLET.clearRadius);
  map.settlement = { id: ident.id, name: ident.name, kind: ident.kind, label: def.label, x: cx, y: cy, radius: HAMLET.clearRadius - 1, procedural: true };
  map.hamlet = version;
  return map.settlement;
}
