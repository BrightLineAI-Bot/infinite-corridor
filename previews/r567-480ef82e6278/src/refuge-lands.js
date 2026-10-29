// The Refuge's lands (release 265; Tim, 2026-10-21): a farm and a quarry near Ember Refuge, a farmer in the Refuge who
// speaks in riddles and points the way, and regrowth: "the trees and the rocks around the town will just repopulate
// in a widening circle... the more you explore, the more area around the Ember Refuge gets populated... the quarry and
// the farm will be populated first". Stone is never sold; the quarry is where to go when it runs out.
//
// Every REGROW.every sections newly added to the atlas is one regrowth: felled trees stand again and worked rocks are
// whole again, first on the farm and in the quarry, then in every section within `ringFor(epoch)` sections of the
// Refuge (the ring widens by one each time, up to `maxRadius`). A section regrows when it is next loaded; trees felled
// across a gap as a log crossing stay down. Data and rules; game.ts calls in.
import { hashSeed } from "./random.js?v=r567-480ef82e6278";
import { LETHAL_KINDS } from "./landscape.js?v=r567-480ef82e6278";

export const REGROW = { every: 20, maxRadius: 5 };
export const REFUGE_LANDS = {
  near: [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1], [2, 0], [0, 2], [-2, 0], [0, -2]],
  farmTrees: 6,     // big trees (3 wood each)
  quarryRocks: 10,  // one stone each by chipping (release 275: breaking no longer adds more)
  spacing: 2,
};
export const ringFor = (epoch) => Math.min(REGROW.maxRadius, Math.max(0, epoch));

// save.regrowth = { epoch, mark, done: { "rx,ry": epoch } } (additive at schema 14). An older save starts counting
// from the sections it already holds.
export function ensureRegrowth(save) {
  const g = save.regrowth && typeof save.regrowth === "object" ? save.regrowth : {}, seen = Object.keys(save.atlas || {}).length;
  const done = {}; for (const [k, v] of Object.entries(g.done || {})) if (/^-?\d+,-?\d+$/.test(k) && Number.isInteger(v) && v >= 0) done[k] = v;
  save.regrowth = { ...g, epoch: Math.max(0, Math.floor(Number(g.epoch) || 0)), mark: Number.isFinite(Number(g.mark)) ? Math.max(0, Math.floor(Number(g.mark))) : seen, done };
  return save.regrowth;
}
// Called when a section is added to the atlas. Returns true when that brings a regrowth.
export function noteDiscovery(save) {
  const g = ensureRegrowth(save), seen = Object.keys(save.atlas || {}).length;
  if (seen - g.mark < REGROW.every) return false;
  g.epoch += 1; g.mark = seen; return true;
}

// The farm and the quarry: the first two suitable sections around the Refuge (seeded order), never side by side.
// `suitable(rx, ry)` says whether a section is dry, open land with no settlement.
const lands = new Map();
// Release 371: around the hometown (`center`, hometowns.ts) rather than always the Refuge; the Refuge keeps its own order.
export function refugeLands(seed, suitable, center = { rx: 0, ry: 0 }) {
  const id = `${seed}:${center.rx},${center.ry}`;
  if (lands.has(id)) return lands.get(id);
  const salt = center.rx || center.ry ? `:${center.rx},${center.ry}` : "";
  const order = REFUGE_LANDS.near.map((q, i) => [q, hashSeed(`${seed}:refuge-lands:v1${salt}:${i}`)]).sort((a, b) => a[1] - b[1]).map(([[x, y]]) => [x + center.rx, y + center.ry]);
  let farm = null, quarry = null;
  for (const [rx, ry] of order) {
    if (!suitable(rx, ry)) continue;
    if (!farm) farm = { rx, ry };
    else if (Math.max(Math.abs(rx - farm.rx), Math.abs(ry - farm.ry)) > 1) { quarry = { rx, ry }; break; }
  }
  const out = { farm, quarry, center: { ...center } }; lands.set(id, out); return out;
}
const same = (a, rx, ry) => !!a && a.rx === rx && a.ry === ry;
const DIR = (q) => q ? `${q.ry < 0 ? "north" : q.ry > 0 ? "south" : ""}${q.rx < 0 ? "west" : q.rx > 0 ? "east" : ""}` : "";
const AWAY = (q) => { const n = Math.max(Math.abs(q.rx), Math.abs(q.ry)); return `${n === 1 ? "one section" : `${n} sections`} ${DIR(q)}`; }; // from the Refuge

// Open tiles for a planting, spiralling out from the section's centre, `spacing` apart, clear of objects.
function plots(map, n) {
  const w = map.width || 32, h = Math.floor(map.tiles.length / w), taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), out = [];
  const ok = (x, y) => { const t = map.tiles[y * w + x]; return t && !t.blocked && !t.structure && !t.slope && !LETHAL_KINDS.has(t.kind) && !["river", "canyon", "dungeonWater", "shallows"].includes(t.kind) && !taken.has(`${x},${y}`); };
  for (let r = 2; r < 14 && out.length < n; r += REFUGE_LANDS.spacing) for (let a = 0; a < 24 && out.length < n; a++) {
    const x = Math.round(15 + Math.cos(a / 24 * Math.PI * 2) * r), y = Math.round(15 + Math.sin(a / 24 * Math.PI * 2) * r);
    if (x < 3 || y < 3 || x > w - 4 || y > h - 4 || !ok(x, y) || out.some((p) => Math.hypot(p.x - x, p.y - y) < REFUGE_LANDS.spacing)) continue;
    out.push({ x, y }); taken.add(`${x},${y}`);
  }
  return out;
}
// Adds the farm's trees, the quarry's rocks and the quarry sign to a freshly generated section map, and the farmer to
// the Refuge's. Stable ids, so saved state (felled, chipped) applies to them like any other object.
export function plantRefugeLands(map, rx, ry, where) {
  if (same(where.farm, rx, ry)) {
    for (const [k, p] of plots(map, REFUGE_LANDS.farmTrees).entries()) map.objects.push({ id: `farm-tree-${k}`, kind: "tree", x: p.x, y: p.y, state: "standing", actions: ["cut", "ignite"], environmental: true, vegetationForm: "canopy", refugeFarm: true });
    map.refugeFarm = true;
  }
  if (same(where.quarry, rx, ry)) {
    const spots = plots(map, REFUGE_LANDS.quarryRocks + 1), sign = spots.shift();
    for (const [k, p] of spots.entries()) map.objects.push({ id: `quarry-rock-${k}`, kind: "rock", x: p.x, y: p.y, state: "sealed", actions: ["move", "break"], environmental: true, refugeQuarry: true });
    // Tim: "The quarry operator can be a small stone turtle... very straightforward... looks kind of like the mountain
    // turtle, but... smaller... no ice on him... He could be wearing a hat."
    if (sign) map.objects.push({ id: "quarry-keeper", kind: "villager", name: "Shale", role: "Quarry Keeper", line: QUARRY_LINES[0], x: sign.x, y: sign.y, state: "calm", actions: ["speak"], quarryTurtle: true, talkKey: "quarry:talks" });
    map.refugeQuarry = true;
  }
  if (rx === 0 && ry === 0 && !(map.objects || []).some((o) => o.id === "refuge-farmer")) {
    map.objects.push({ id: "refuge-farmer", kind: "villager", name: "Hollis Dray", role: "Refuge Farmer", line: "", x: 12, y: 18, state: "calm", actions: ["speak"], settlement: "ember-refuge", refugeFarmer: true, cook: true, talkKey: "farmer:talks" }); // release 447: he cooks too (meals.ts)
  }
}
// The farmer's lines (Tim: "you're turning the corridor into fuel... cryptic, enigmatic things like that"), and the two
// that point the way.
export const FARMER_LINES = [
  "You're turning the Corridor into fuel, you know. Every plank you carry was a year of it standing still.",
  "You keep going out there, sun. Out and out. The Corridor keeps a ledger of footsteps.",
  "I don't plant them. I only stand where they come back.",
  "Cut what you need. It grows back toward whoever wanders farthest.",
  "Stone remembers being a mountain. Don't tell it otherwise.",
  "The more of the world you walk, the greener it gets around here. Funny, that. Or not funny at all.",
];
// The quarry keeper says it plainly.
export const QUARRY_LINES = [
  "This is the Refuge quarry. Chip a rock and you get a stone. Every rock gives one.",
  "When your stone runs out, come back here. The rocks grow back as you explore.",
  "Five stone makes a stone block. Four wood makes a wall. Neither lasts long, so build them when you need them.",
  "Nobody sells stone. This is where it comes from.",
];
// What a speaking villager with a `talkKey` says on its `n`th word.
export function talkLine(o, where, n) { return o.quarryTurtle ? QUARRY_LINES[Math.abs(n) % QUARRY_LINES.length] : farmerLine(null, where, n); }
export function farmerLine(save, where, n) {
  const guide = [where.farm && `My orchard's ${AWAY(where.farm)} of here. Big trees. Take what you need; they come back.`, where.quarry && `Stone? Nobody sells stone. There's a quarry ${AWAY(where.quarry)}. Chip it when yours runs out.`].filter(Boolean);
  const all = [...guide, ...FARMER_LINES];
  return all[Math.abs(n) % all.length];
}

// Regrowth on load: `map` holds this section's objects with their saved state applied. Returns the number of things
// restored, and records the section as regrown for this epoch.
export function regrowSection(save, map, rx, ry, where) {
  const g = ensureRegrowth(save), key = `${rx},${ry}`, epoch = g.epoch;
  if (!epoch || g.done[key] === epoch) return 0;
  const c = where.center || { rx: 0, ry: 0 }, lands = same(where.farm, rx, ry) || same(where.quarry, rx, ry), inRing = Math.max(Math.abs(rx - c.rx), Math.abs(ry - c.ry)) <= ringFor(epoch); // release 371: around home
  if (!lands && !inRing) return 0;
  let n = 0;
  for (const o of map.objects || []) {
    if (!o.environmental) continue;
    if (o.kind === "tree" && !o.crossingTiles?.length && (o.state === "fallen" || o.state === "charred")) { o.state = "standing"; n++; }
    else if (o.kind === "rock" && (o.state !== "sealed" || save.worldFlags?.[`${o.id}:chip`])) { o.state = "sealed"; n++; }
    else continue;
    for (const a of ["cut", "ignite", "chip", "break", "move"]) if (save.worldFlags) delete save.worldFlags[`${o.id}:${a}`];
  }
  g.done[key] = epoch;
  return n;
}
