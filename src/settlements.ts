// Hamlets (release 109): small procedural towns scattered through the wilds, pinned per atlas entry like the landscape.
// The world is split into HAMLET.cell × HAMLET.cell blocks of sections; each block nominates one section, and most
// nominated sections that have a flat, dry patch of ground grow a hamlet there. A section explored before release 109
// keeps no hamlet (its atlas entry carries no hamletVersion), so existing journeys only find hamlets in new ground.
import { hashSeed, rng, pick } from "./random.ts";
import { LETHAL_KINDS } from "./landscape.ts";

export const HAMLET_VERSION = 1;
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
  const bx = floorDiv(rx, HAMLET.cell), by = floorDiv(ry, HAMLET.cell), r = rng(`${seed}:hamlet:v${HAMLET_VERSION}:block:${bx}:${by}`);
  if (r() >= HAMLET.chance) return false;
  const n = Math.floor(r() * HAMLET.cell * HAMLET.cell), hx = bx * HAMLET.cell + (n % HAMLET.cell), hy = by * HAMLET.cell + Math.floor(n / HAMLET.cell);
  return hx === rx && hy === ry;
}
export function hamletIdentity(seed, rx, ry) {
  const r = rng(`${seed}:hamlet:v${HAMLET_VERSION}:identity:${rx}:${ry}`), kind = weighted(r, KIND_WEIGHTS);
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

// Mutates an overworld section map (after the landscape pass). Returns the settlement record or null.
export function applyHamlet(map, seed, rx, ry) {
  if (!map || map.settlement || map.hamlet || map.tiles?.length !== 1024 || !hamletSection(seed, rx, ry)) return null;
  const site = hamletSite(map);
  if (!site) return null;
  const ident = hamletIdentity(seed, rx, ry), def = HAMLET_KINDS[ident.kind], r = rng(`${seed}:hamlet:v${HAMLET_VERSION}:layout:${rx}:${ry}`);
  const { x: cx, y: cy } = site, [floor, wall] = HUT_STYLES[def.style];
  for (let y = cy - HAMLET.halfH; y <= cy + HAMLET.halfH; y++) for (let x = cx - HAMLET.halfW; x <= cx + HAMLET.halfW; x++) { const i = y * 32 + x; map.tiles[i] = { ...map.tiles[i], kind: "refuge", blocked: false }; }
  const hutSlots = [[cx - 7, cy - 5], [cx + 3, cy - 5], [cx - 2, cy - 5]];
  for (let i = 0; i < def.huts; i++) { const [x, y] = hutSlots[i]; buildHut(map, `${ident.id}-hut-${i}`, x, y, 5, 4, floor, wall, { name: `${ident.name} ${def.uses[i % def.uses.length]}`, districtStyle: def.style === "masonry" ? "cloister" : def.style === "city" ? "arcology" : def.style === "fortress" ? "fortress" : "city" }); }
  map.objects.push({ id: `beacon-${ident.id}`, kind: "checkpoint", name: `${ident.name} Wayglass`, x: cx, y: cy + 2, state: "quiet", actions: ["activate"], landmark: true, settlement: ident.id });
  const spots = [[cx - 4, cy + 1], [cx + 4, cy + 1], [cx - 2, cy + 4], [cx + 2, cy + 4], [cx - 5, cy + 3], [cx + 5, cy + 3]], used = new Set();
  const take = () => { for (const s of spots) { const k = s.join(","); if (!used.has(k)) { used.add(k); return s; } } return [cx, cy + 4]; };
  const folk = [...FOLK_NAMES].sort((a, b) => hashSeed(`${ident.id}:${a}`) - hashSeed(`${ident.id}:${b}`));
  if (def.merchant) { const [x, y] = take(); map.objects.push({ id: `${ident.id}-merchant`, kind: "shelterMerchant", name: `${folk.pop()} the Trader`, role: `${def.label} trader`, x, y, state: "calm", actions: ["speak", "trade"], settlement: ident.id }); }
  for (let i = 0; i < def.villagers; i++) { const [x, y] = take(); map.objects.push({ id: `${ident.id}-folk-${i}`, kind: "villager", name: folk.pop(), role: pick(r, FOLK_ROLES), line: pick(r, FOLK_LINES), x, y, state: "calm", actions: ["speak"], settlement: ident.id }); }
  for (let i = 0; i < def.guards; i++) { const x = i % 2 ? cx + HAMLET.halfW : cx - HAMLET.halfW, y = cy + 1 + Math.floor(i / 2) * 3; map.objects.push({ id: `${ident.id}-warden-${i}`, kind: "villager", guard: true, name: `Warden ${folk.pop()}`, role: "Warden", line: pick(r, GUARD_LINES), x, y, state: "calm", actions: ["speak"], settlement: ident.id }); }
  // Shift any small site the huts or residents now stand on to a free spot along the square's south edge.
  const taken = new Set(map.objects.filter((o) => o.settlement === ident.id).map((o) => `${o.x},${o.y}`)), free = [];
  for (let x = cx - HAMLET.halfW + 1; x < cx + HAMLET.halfW; x++) for (const y of [cy + HAMLET.halfH, cy - 1]) if (!taken.has(`${x},${y}`) && !map.tiles[y * 32 + x].buildingId) free.push([x, y]);
  for (const o of map.objects) if (MOVABLE.has(o.kind) && (map.tiles[o.y * 32 + o.x]?.buildingId || taken.has(`${o.x},${o.y}`))) { const at = free.find(([x, y]) => !map.objects.some((q) => q.x === x && q.y === y)); if (at) [o.x, o.y] = at; }
  map.enemySpawns = (map.enemySpawns || []).filter((e) => Math.hypot(e.x - cx, e.y - cy) > HAMLET.clearRadius);
  map.settlement = { id: ident.id, name: ident.name, kind: ident.kind, label: def.label, x: cx, y: cy, radius: HAMLET.clearRadius - 1, procedural: true };
  map.hamlet = HAMLET_VERSION;
  return map.settlement;
}
