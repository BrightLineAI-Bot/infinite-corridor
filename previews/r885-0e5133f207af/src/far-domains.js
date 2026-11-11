// The domains (release 723). Tim, 2026-11-03: "build some places... an arena... for the questing beast... past the 1000... If you
// kill him, you can get a quest to go to an arena... totally bespoke, like a whole section... huge crystals erupting from the
// ground... lava, it's like a hellscape... every once in a while, if you just go there and wait at his arena, he might come
// there... after a 1000 there should be some type of like domain arena for most of the world bosses."
//
// A domain is one section, built whole (`buildDomain` replaces the generated ground, objects and spawns), at the place
// far-realms.ts FAR_DOMAINS sets: found by wandering onto it (ground not seen before), or by the quest its beast's fall opens a
// thousand sections or more out. Its beast comes there: on the visit that completes the quest at once, and on any later visit
// after the Wayfarer has waited there a while (`wait`, hashed per visit), even if it is hunting somewhere else (it leaves that
// section for its own). The layouts are drawn from the seed and the domain's `version`, so the same domain stays the same.
//
// The Thornglass Caldera (the Questing Beast's): black basalt round a smooth fighting floor, ringed by crystals as tall as towers
// that have burst out of the rock, with a river of lava beyond them crossed by four causeways, one to each gate, and lava pools
// in the corners. Nothing lives there but its beast.
import { hashSeed } from "./random.js?v=r885-0e5133f207af";
import { FAR_DOMAINS } from "./far-realms.js?v=r885-0e5133f207af";
import { valueNoise } from "./landscape.js?v=r885-0e5133f207af";
import { DOMAIN_LOOKS, domainKinds } from "./domain-looks.js?v=r885-0e5133f207af";

export const THORNGLASS = {
  floor: 7, // radius of the smooth fighting floor
  crystals: { ring: [8.4, 10.2], count: [7, 9], size: [.9, 1.7], outer: 6, outerRing: [12.8, 15.5] },
  lava: { ring: [11.4, 12.5], river: .055, riverScale: 5.5, pools: .66, poolScale: 3.2, causeway: 1.6 },
  shards: 1.4, // shard-strewn ground this far round a crystal
};
export const DOMAIN_KINDS = { walk: ["thornBasalt", "thornFloor", "thornShards"], block: ["thornCrystal"] };

const idx = (x, y) => y * 32 + x;
function noise(seed, x, y) { const n = hashSeed(`${seed}:${Math.floor(x)}:${Math.floor(y)}`); return (n % 10007) / 10007; }

// Rebuilds the section as the domain `id`. Returns map.farDomain.
export function buildDomain(map, seed, rx, ry, id) {
  const D = FAR_DOMAINS[id]; if (!D || !map?.tiles?.length) return null;
  const key = `${seed}:domain:${id}:v${D.version}:${rx}:${ry}`;
  if (id === "questingBeast") buildThornglass(map, key); else buildArena(map, key, id); // 724: the world beasts' domains
  map.objects = []; map.enemySpawns = []; map.farDomain = id; map.weather = id === "questingBeast" ? "embers" : DOMAIN_LOOKS[id]?.weather || undefined; if (!map.weather) delete map.weather;
  map.landscape = { ...(map.landscape || {}), biome: "domain", name: D.name.replace(/^the /, "The ") };
  delete map.settlement; delete map.canopy; delete map.mushrooms; delete map.openSea; delete map.paletteRegion;
  return map.farDomain;
}

function buildThornglass(map, key) {
  const T = THORNGLASS, h = (k) => hashSeed(`${key}:${k}`), u = (k) => (h(k) % 100003) / 100003, ex = map.exits || {};
  const set = (t, kind, blocked = false, extra = {}) => { const { x, y } = t; for (const k of Object.keys(t)) delete t[k]; Object.assign(t, { x, y, kind, blocked, elev: 0, landscape: "thornglass", detail: h(`d${x},${y}`) % 97, ...extra }); };
  // the causeways: from the floor straight out to each gate, kept clear of lava and crystal
  const gates = [["north", ex.north, 0], ["south", ex.south, 31], ["west", 0, ex.west], ["east", 31, ex.east]].filter(([, a, b]) => Number.isFinite(a) && Number.isFinite(b));
  const road = (x, y) => gates.some(([side, gx, gy]) => side === "north" || side === "south" ? Math.abs(x - gx) <= T.lava.causeway && (side === "north" ? y <= 16 : y >= 16) : Math.abs(y - gy) <= T.lava.causeway && (side === "west" ? x <= 16 : x >= 16));
  const crystals = [], n = T.crystals.count[0] + h("n") % (T.crystals.count[1] - T.crystals.count[0] + 1), a0 = u("a0") * Math.PI * 2;
  for (let i = 0; i < n; i++) { const a = a0 + (i + u(`j${i}`) * .6) * Math.PI * 2 / n, r = T.crystals.ring[0] + u(`r${i}`) * (T.crystals.ring[1] - T.crystals.ring[0]); crystals.push({ x: 16 + Math.cos(a) * r, y: 16 + Math.sin(a) * r, s: T.crystals.size[0] + u(`s${i}`) * (T.crystals.size[1] - T.crystals.size[0]) }); }
  for (let i = 0; i < T.crystals.outer; i++) { const a = u(`oa${i}`) * Math.PI * 2, r = T.crystals.outerRing[0] + u(`or${i}`) * (T.crystals.outerRing[1] - T.crystals.outerRing[0]); crystals.push({ x: 16 + Math.cos(a) * r, y: 16 + Math.sin(a) * r, s: T.crystals.size[0] + u(`os${i}`) * .6 }); }
  for (const t of map.tiles) {
    const d = Math.hypot(t.x - 16, t.y - 16), wobble = (valueNoise(`${key}:w`, t.x / 4, t.y / 4) - .5) * 2, onRoad = road(t.x, t.y);
    let near = 99, ci = -1; crystals.forEach((c, i) => { const q = Math.hypot(t.x - c.x, t.y - c.y) - c.s; if (q < near) { near = q; ci = i; } });
    const river = d > 10 && Math.abs(valueNoise(`${key}:river`, t.x / T.lava.riverScale, t.y / T.lava.riverScale) - .5) < T.lava.river, pool = d > 13 && valueNoise(`${key}:pool`, t.x / T.lava.poolScale, t.y / T.lava.poolScale) > T.lava.pools;
    if (d < T.floor + wobble * .6) set(t, "thornFloor");
    else if (!onRoad && near <= 0 && t.x > 0 && t.y > 0 && t.x < 31 && t.y < 31) set(t, "thornCrystal", true, { crystal: 1 + (h(`hue${ci}`) % 3), cluster: ci });
    else if (!onRoad && ((d >= T.lava.ring[0] + wobble && d <= T.lava.ring[1] + wobble) || river || pool)) set(t, "lava", false, { volcanic: true });
    else if (near <= T.shards) set(t, "thornShards");
    else set(t, "thornBasalt");
  }
  // each cluster's tower: its front (southmost, then most central) tile carries the great crystal, drawn tall over the rest
  const front = new Map(); for (const t of map.tiles) if (t.kind === "thornCrystal") { const c = crystals[t.cluster], b = front.get(t.cluster); if (!b || t.y > b.y || (t.y === b.y && Math.abs(t.x - c.x) < Math.abs(b.x - c.x))) front.set(t.cluster, t); }
  for (const [i, t] of front) t.tower = +(2.2 + crystals[i].s * 1.6 + u(`tw${i}`) * 1.2).toFixed(2);
  // nothing cut off: any open tile the floor cannot reach becomes basalt bridged back along the shortest line to the floor
  for (let round = 0; round < 40; round++) {
    const seen = reach(map); let fixed = 0;
    for (const t of map.tiles) { if (seen[idx(t.x, t.y)] || t.blocked || t.kind === "lava") continue; let x = t.x, y = t.y, k = 0; // a 4-connected walk toward the floor
      while (!seen[idx(x, y)] && k++ < 64) { const c = map.tiles[idx(x, y)]; if (c.kind === "lava" || c.blocked) set(c, "thornBasalt"); if (Math.abs(16 - x) >= Math.abs(16 - y)) x += Math.sign(16 - x); else y += Math.sign(16 - y); }
      fixed++; break; } // one bridge a round, then reach is measured again
    if (!fixed) break;
  }
}

// Release 724: the world beasts' domains, one plan in each one's dress (domain-looks.ts): a fighting floor, a ring of landmark
// clusters (each with a tower) and a few beyond, a hazard in a ring, rivers and pools beyond (or a sea past `sea`), causeways to
// the gates kept clear, strewn ground round the landmarks; then any open ground cut off from the floor is bridged back.
function buildArena(map, key, id) {
  const L = DOMAIN_LOOKS[id], K = domainKinds(id), F = L.features, Z = L.hazard, h = (k) => hashSeed(`${key}:${k}`), u = (k) => (h(k) % 100003) / 100003, ex = map.exits || {};
  const set = (t, kind, blocked = false, extra = {}) => { const { x, y } = t; for (const k of Object.keys(t)) delete t[k]; Object.assign(t, { x, y, kind, blocked, elev: 0, landscape: "arena", look: id, detail: h(`d${x},${y}`) % 97, ...extra }); };
  const gates = [["north", ex.north, 0], ["south", ex.south, 31], ["west", 0, ex.west], ["east", 31, ex.east]].filter(([, a, b]) => Number.isFinite(a) && Number.isFinite(b));
  const road = (x, y) => gates.some(([side, gx, gy]) => side === "north" || side === "south" ? Math.abs(x - gx) <= 1.6 && (side === "north" ? y <= 16 : y >= 16) : Math.abs(y - gy) <= 1.6 && (side === "west" ? x <= 16 : x >= 16));
  const marks = [], n = F.count[0] + h("n") % (F.count[1] - F.count[0] + 1), a0 = u("a0") * Math.PI * 2;
  for (let i = 0; i < n; i++) { const a = a0 + (i + u(`j${i}`) * .6) * Math.PI * 2 / n, r = F.ring[0] + u(`r${i}`) * (F.ring[1] - F.ring[0]); marks.push({ x: 16 + Math.cos(a) * r, y: 16 + Math.sin(a) * r, s: F.size[0] + u(`s${i}`) * (F.size[1] - F.size[0]) }); }
  for (let i = 0; i < F.outer; i++) { const a = u(`oa${i}`) * Math.PI * 2, r = F.outerRing[0] + u(`or${i}`) * (F.outerRing[1] - F.outerRing[0]); marks.push({ x: 16 + Math.cos(a) * r, y: 16 + Math.sin(a) * r, s: F.size[0] + u(`os${i}`) * (F.size[1] - F.size[0]) * .6 }); }
  const thicket = Z.kind === "thicket", hazard = (t) => thicket ? set(t, K.thicket, true) : set(t, Z.kind, false, Z.kind === "lava" ? { volcanic: true } : {});
  for (const t of map.tiles) {
    const d = Math.hypot(t.x - 16, t.y - 16), wobble = (valueNoise(`${key}:w`, t.x / 4, t.y / 4) - .5) * 2, onRoad = road(t.x, t.y);
    let near = 99, ci = -1; marks.forEach((c, i) => { const q = Math.hypot(t.x - c.x, t.y - c.y) - c.s; if (q < near) { near = q; ci = i; } });
    const ring = Z.ring && d >= Z.ring[0] + wobble && d <= Z.ring[1] + wobble, sea = Z.sea && d > Z.sea + wobble * 1.2;
    const river = Z.river > 0 && d > 10 && Math.abs(valueNoise(`${key}:river`, t.x / Z.riverScale, t.y / Z.riverScale) - .5) < Z.river, pool = d > 10.5 && valueNoise(`${key}:pool`, t.x / Z.poolScale, t.y / Z.poolScale) > Z.pools;
    if (d < L.floor + wobble * .6) set(t, K.floor);
    else if (!onRoad && near <= 0 && t.x > 0 && t.y > 0 && t.x < 31 && t.y < 31) set(t, K.feature, true, { hue: h(`hue${ci}`) % F.hues.length, cluster: ci });
    else if (!onRoad && (ring || sea || river || pool)) hazard(t);
    else if (near <= 1.4) set(t, K.scatter);
    else set(t, K.ground);
  }
  const front = new Map(); for (const t of map.tiles) if (t.kind === K.feature) { const c = marks[t.cluster], b = front.get(t.cluster); if (!b || t.y > b.y || (t.y === b.y && Math.abs(t.x - c.x) < Math.abs(b.x - c.x))) front.set(t.cluster, t); }
  for (const [i, t] of front) t.tower = +(F.tower[0] + u(`tw${i}`) * (F.tower[1] - F.tower[0])).toFixed(2);
  // cut off ground is joined back by the fewest hazard or landmark tiles (a breadth-first search from it to reached ground,
  // crossing open ground freely), so rings and hedges keep their shape
  const open = (t) => !t.blocked && !HAZARDS.has(t.kind);
  for (let round = 0; round < 400; round++) {
    const seen = reach(map), lost = map.tiles.find((t) => !seen[idx(t.x, t.y)] && open(t)); if (!lost) break;
    const cost = new Int32Array(1024).fill(1e9), from = new Int32Array(1024).fill(-1), q = [idx(lost.x, lost.y)]; cost[q[0]] = 0; let hit = -1; // 0-1 breadth-first: open ground costs nothing
    while (q.length) { const k = q.shift(); if (seen[k]) { hit = k; break; }
      const x = k % 32, y = (k / 32) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 31 || ny > 31) continue; const j = idx(nx, ny), w = open(map.tiles[j]) ? 0 : 1, nc = cost[k] + w; if (nc < cost[j]) { cost[j] = nc; from[j] = k; if (w) q.push(j); else q.unshift(j); } } }
    for (let k = hit; k >= 0; k = from[k]) { const c = map.tiles[k]; if (!open(c)) set(c, K.ground); }
  }
}
const HAZARDS = new Set(["lava", "abyss", "ocean", "deepOcean", "toxicWater"]);
function reach(map) {
  const seen = new Uint8Array(1024), q = [idx(16, 16)]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % 32, y = Math.floor(k / 32);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = idx(nx, ny), t = map.tiles[j]; if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || seen[j] || !t || t.blocked || HAZARDS.has(t.kind)) continue; seen[j] = 1; q.push(j); } }
  return seen;
}
export const domainReach = reach;

// How long the Wayfarer must wait in the domain this visit before its beast comes (seconds); 0 when it comes at once.
export function domainWait(seed, id, rx, ry, visit, atOnce = false) {
  if (atOnce) return 2; const W = FAR_DOMAINS[id].wait; return W[0] + (hashSeed(`${seed}:domain-wait:${id}:${rx}:${ry}:${visit}`) % 1000) / 1000 * (W[1] - W[0]);
}
// Where the beast comes in: a floor tile on the far side of the floor from the Wayfarer.
export function domainArrival(map, player) {
  const a = Math.atan2(16 - player.y, 16 - player.x), want = { x: 16 + Math.cos(a) * 5, y: 16 + Math.sin(a) * 5 };
  const open = map.tiles.filter((t) => (t.kind === "thornFloor" || /Floor$/.test(t.kind) && t.landscape === "arena") && !t.blocked);
  open.sort((p, q) => Math.hypot(p.x - want.x, p.y - want.y) - Math.hypot(q.x - want.x, q.y - want.y));
  return open[0] || { x: 16, y: 16 };
}
