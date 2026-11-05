// The great mushrooms (release 721, landscape version 17). Tim, 2026-11-03: "a biome with larger mushrooms... not comically large
// mushrooms, but just large mushrooms... the size of some of those like accent trees... Maybe you can hop on those a little bit...
// just do some light platforming on the mushrooms... those can start popping out over a thousand when you're at over a thousand
// squares, you know, straight line distance from 00."
//
// From landscape version 17, a section a thousand sections or more from Ember Refuge (straight line) whose ground is mostly a
// sporewood, a forest, a jungle or a swamp may grow a stand of great mushrooms (each region with its own `chance`):
// - a stand is a run of caps, each a round platform one level higher than the last (levels 1, 2, 3), touching the one before, so
//   the Wayfarer hops up them one level at a time; the first is reached from open ground, the last is the highest;
// - caps are drawn tall (`lift`): the highest stands about as tall as a tree, its pale stalk under a broad, spotted cap;
// - the highest cap of the first stand holds a small cache (a chest), the climb's reward; a cap is never more than three levels up,
//   so a fall off one hurts but never kills (landscape.ts fallDamage);
// - nothing spawns on a cap, the ground's trees and decor under a cap are cleared, and a stand that would wall any ground off from
//   the plaza is not grown (tried on the tiles, undone if it does).
// Bounded: at most `stands` stands, `tries` hashed spots, a few hundred tile checks each, once per section.
import { hashSeed } from "./random.js?v=r759-ce2cc625b7cc";

export const GREAT_MUSHROOMS = {
  version: 17, start: 1000,
  regions: { fungal: { chance: 1, ground: ["sporeLoam", "sporeBed"] }, forest: { chance: .35, ground: ["forestFloor", "bogGround"] }, jungle: { chance: .35, ground: ["jungleFloor", "jungleMire"] }, swamp: { chance: .3, ground: ["bogGround"] } },
  minTiles: 120, // a section needs this much of one region's ground to try
  stands: [1, 2], tries: 90,
  caps: [1.5, 2.3, 2.9], // radius of the caps at levels 1, 2 and 3
  lift: 1.8, rise: .8, // a cap's drawn height per level, as a multiple of an ordinary level (tileLiftScale); 722: low caps get `rise` levels more, so even the first stands on a stalk you can see
  hues: ["capCrimson", "capAmber", "capViolet"], // one hue per stand
  cache: "chest",
  name: "great mushrooms", text: "Mushrooms as tall as trees stand here, their caps broad enough to stand on.",
};
export const MUSHROOM_KINDS = GREAT_MUSHROOMS.hues;
export const isMushroomCap = (t) => !!t?.mushroom;
export const farEnoughForMushrooms = (rx, ry) => Math.hypot(rx, ry) >= GREAT_MUSHROOMS.start;

const idx = (x, y) => y * 32 + x;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

// The region with the most of its own ground in this section, if it has `minTiles` of it.
function mushroomRegion(map) {
  const G = GREAT_MUSHROOMS, n = {};
  for (const t of map.tiles) { const R = G.regions[t.landscape]; if (R && R.ground.includes(t.kind) && !t.blocked) n[t.landscape] = (n[t.landscape] || 0) + 1; }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  return best && best[1] >= G.minTiles ? best[0] : null;
}

// Grow the section's great mushrooms (called last in applyLandscape, version 17 and on). `reachable(map)` is the plaza's
// reachability (landscape.ts reachableFromPlaza). Returns map.mushrooms or null.
export function growMushrooms(map, seed, rx, ry, { reachable, version = GREAT_MUSHROOMS.version } = {}) {
  const G = GREAT_MUSHROOMS;
  if (version < G.version || !farEnoughForMushrooms(rx, ry) || map.canopy || map.settlement) return null;
  const region = mushroomRegion(map); if (!region) return null;
  const h = (k) => hashSeed(`${seed}:mushrooms:v1:${rx}:${ry}:${k}`);
  if ((h("grow") % 1000) / 1000 >= G.regions[region].chance) return null;
  const at = (x, y) => map.tiles[idx(x, y)], ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const exitLine = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  const cleared = (o) => o.environmental || o.forest || o.jungle; // trees and decor give way to a cap; nothing else does
  const held = new Set((map.objects || []).filter((o) => !cleared(o)).map((o) => idx(Math.round(o.x), Math.round(o.y))));
  const ground = (x, y) => { const t = x >= 2 && y >= 2 && x <= 29 && y <= 29 && at(x, y); return !!t && !t.blocked && !t.structure && !t.buildingId && !t.environment && !t.slope && !(t.elev > 0) && !t.canopy && !t.mushroom && !exitLine(x, y) && !(x >= 12 && x <= 20 && y >= 12 && y <= 20) && !held.has(idx(x, y)); };
  const want = G.stands[0] + h("stands") % (G.stands[1] - G.stands[0] + 1), stands = [];
  for (let t = 0; t < G.tries && stands.length < want; t++) {
    const cx = 2 + h(`x${t}`) % 28, cy = 2 + h(`y${t}`) % 28, [dx, dy] = DIRS[h(`d${t}`) % DIRS.length], levels = t < G.tries * .7 ? 3 : 2; // three caps where they fit, else two
    // The caps' centres, each touching the one before.
    const caps = []; let x = cx, y = cy;
    for (let l = 0; l < levels; l++) {
      if (l) { const gap = G.caps[l - 1] + G.caps[l] + .1, len = Math.hypot(dx, dy); x = Math.round(caps[l - 1].x + dx / len * gap); y = Math.round(caps[l - 1].y + dy / len * gap); }
      caps.push({ x, y, r: G.caps[l], elev: l + 1 });
    }
    const plan = new Map(); let fine = true;
    for (const c of caps) { const R = Math.ceil(c.r); for (let j = -R; j <= R && fine; j++) for (let i = -R; i <= R && fine; i++) { if (i * i + j * j > c.r * c.r) continue; const k = idx(c.x + i, c.y + j); if (!ground(c.x + i, c.y + j)) fine = false; else if ((plan.get(k)?.elev || 0) < c.elev) plan.set(k, { ...c, i, j }); } }
    if (!fine) continue;
    // Tried on the tiles: undone if it walls ground off or its top cannot be climbed to.
    const before = reachable(map), saved = new Map();
    for (const [k, c] of plan) { const t = map.tiles[k]; saved.set(k, { ...t }); Object.assign(t, { kind: G.hues[(h("hue") + stands.length) % G.hues.length], elev: c.elev, slope: false, blocked: false, mushroom: stands.length + 1, roofLift: G.lift * (1 + G.rise / c.elev), under: t.kind, capI: c.i, capJ: c.j, capR: c.r }); }
    const after = reachable(map), top = caps[caps.length - 1];
    let walled = !after[idx(top.x, top.y)];
    for (let k = 0; k < 1024 && !walled; k++) if (before[k] && !after[k] && !plan.has(k)) walled = true;
    if (walled) { for (const [k, t0] of saved) { const t = map.tiles[k]; for (const key of Object.keys(t)) delete t[key]; Object.assign(t, t0); } continue; }
    // The stalk is drawn under the front (southmost) tile of each cap's centre column.
    for (const c of caps) { let sy = c.y; while (plan.get(idx(c.x, sy + 1))?.elev === c.elev && plan.get(idx(c.x, sy + 1)).x === c.x && plan.get(idx(c.x, sy + 1)).y === c.y) sy++; const t = at(c.x, sy); if (t?.mushroom) t.stalk = c.elev; }
    for (const k of plan.keys()) held.add(k); // the next stand keeps its distance from this one's tiles
    for (const [k] of plan) for (const [ddx, ddy] of DIRS) held.add(k + ddy * 32 + ddx);
    stands.push({ caps: caps.map(({ x, y, r, elev }) => ({ x, y, r, elev })), tiles: [...plan.keys()] });
  }
  if (!stands.length) return null;
  const all = new Set(stands.flatMap((s) => s.tiles));
  map.objects = (map.objects || []).filter((o) => !(cleared(o) && all.has(idx(Math.round(o.x), Math.round(o.y)))));
  map.enemySpawns = (map.enemySpawns || []).filter((q) => !all.has(idx(Math.round(q.x), Math.round(q.y))));
  const top = stands[0].caps[stands[0].caps.length - 1];
  map.objects.push({ id: `mushroom-cache-${rx}-${ry}`, kind: "chest", name: "A cache on the great cap", x: top.x, y: top.y, state: "closed", actions: ["open"], rewardSource: G.cache });
  map.mushrooms = { region, stands: stands.map((s) => s.caps), top: top.elev };
  return map.mushrooms;
}
