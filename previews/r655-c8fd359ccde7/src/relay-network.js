// Relay Network v1: physical relay nodes in a share of crossings, continuing the Missing Crossing's lore.
//
// After a crossing's guardian falls, its Dormant Relay can be Restored (the line opens: a restorative draught, and
// the network hears you) or Severed (the line closes forever: lumen dust salvage). Either answer reveals the next
// fragment of the far transmission. When RELAY_TARGET relays have answered, the buried network answers back with a
// coordinate that belongs to no charted section (the same beat the hidden five-guardian chain already triggers).
//
// DRAFT NARRATIVE: the fragment texts below are placeholders written to fit the existing lore. The operator owns the
// relay story; rewrite FRAGMENTS freely. The mechanics never depend on their wording.
import { hashSeed } from "./random.js?v=r655-c8fd359ccde7";
import { listenerReturns } from "./far-array.js?v=r655-c8fd359ccde7";

export const RELAY_VERSION = 1;
// Relay placement v2 (release 142): Wolfram's Rule 110, a class IV ("complex") cellular automaton. Each row of sections
// (ry) is one generation; each column (rx) one cell. A crossing whose section cell is alive holds a relay, so the relays
// you find and answer trace the automaton's interlocking triangles and gliders (see relayEdge). Crossings decided earlier keep theirs.
export const RELAY_PATTERN = { rule: 110, width: 257, rows: 257, origin: 128 };
const patternCache = new Map();
function relayPattern(seed) {
  if (patternCache.has(seed)) return patternCache.get(seed);
  const { rule, width, rows } = RELAY_PATTERN, grid = new Uint8Array(width * rows);
  // A sparse, seeded first generation; Rule 110 grows its structures southward from it.
  for (let x = 0; x < width; x++) grid[x] = hashSeed(`${seed}:relay-pattern:${x}`) % 7 === 0 ? 1 : 0;
  for (let y = 1; y < rows; y++) for (let x = 0; x < width; x++) {
    const l = grid[(y - 1) * width + (x - 1 + width) % width], c = grid[(y - 1) * width + x], r = grid[(y - 1) * width + (x + 1) % width];
    grid[y * width + x] = (rule >> (l << 2 | c << 1 | r)) & 1;
  }
  patternCache.set(seed, grid); if (patternCache.size > 4) patternCache.delete(patternCache.keys().next().value);
  return grid;
}
// Patterns that encompass the core (release 144). Inside the 257-section core square, Rule 110 as before. Beyond it the
// world is tiled into REGION×REGION-section regions, each running its own elementary rule chosen by distance: first
// Rule 110's mirror relatives, then the fractal rules (90 = Sierpinski, 150, 54), then the chaotic and strange ones.
// A region's first row is the row just north of it (the core, or the region above), so each pattern grows out of the
// one before it. Regions are computed on first use and cached (bounded), so far travel stays cheap on a phone.
export const RELAY_REGIONS = { size: 64, top: -1024, cache: 48, tiers: [[0, [124, 110]], [400, [90, 150, 126, 22, 18]], [800, [30, 86, 106, 54]]] };
// (Rules that turn an empty neighbourhood on, e.g. 73 or 105, are left out: on sparse ground they only flicker in stripes.)
export const RULE_NAMES = { 110: "Rule 110", 124: "Rule 124 · mirrored 110", 90: "Rule 90 · Sierpinski", 150: "Rule 150", 126: "Rule 126", 22: "Rule 22", 18: "Rule 18", 30: "Rule 30 · chaos", 86: "Rule 86 · mirrored 30", 106: "Rule 106", 54: "Rule 54" };
const regionCache = new Map();
const inCore = (rx, ry) => Math.abs(rx) <= RELAY_PATTERN.origin && Math.abs(ry) <= RELAY_PATTERN.origin;
function coreCell(seed, rx, ry) { const { width, origin } = RELAY_PATTERN; return relayPattern(seed)[(ry + origin) * width + (rx + origin)] === 1; }
export function regionAt(rx, ry) { const S = RELAY_REGIONS.size; return { mx: Math.floor(rx / S), my: Math.floor((ry - RELAY_REGIONS.top) / S) }; }
export function regionRule(seed, mx, my) {
  const S = RELAY_REGIONS.size, cx = mx * S + S / 2, cy = RELAY_REGIONS.top + my * S + S / 2, d = Math.max(Math.abs(cx), Math.abs(cy));
  let pool = RELAY_REGIONS.tiers[0][1]; for (const [from, rules] of RELAY_REGIONS.tiers) if (d >= from) pool = rules;
  return pool[hashSeed(`${seed}:relay-region:${mx}:${my}`) % pool.length];
}
function regionGrid(seed, mx, my) {
  const key = `${seed}:${mx}:${my}`;
  if (regionCache.has(key)) { const g = regionCache.get(key); regionCache.delete(key); regionCache.set(key, g); return g; }
  const S = RELAY_REGIONS.size, x0 = mx * S, y0 = RELAY_REGIONS.top + my * S, rule = regionRule(seed, mx, my), grid = new Uint8Array(S * S);
  for (let x = 0; x < S; x++) { const ax = x0 + x, above = y0 - 1; grid[x] = my <= 0 ? (hashSeed(`${seed}:relay-region-seed:${ax}`) % 7 === 0 ? 1 : 0) : relayCell(seed, ax, above) ? 1 : 0; }
  // A starved or flooded inherited row is sprinkled afresh so the new pattern always has something to grow from.
  let live = 0; for (let x = 0; x < S; x++) live += grid[x];
  if (live < S * .04 || live > S * .96) for (let x = 0; x < S; x++) grid[x] = hashSeed(`${seed}:relay-region-seed:${x0 + x}:${my}`) % 7 === 0 ? 1 : 0;
  for (let y = 1; y < S; y++) for (let x = 0; x < S; x++) { const l = grid[(y - 1) * S + (x - 1 + S) % S], c = grid[(y - 1) * S + x], r = grid[(y - 1) * S + (x + 1) % S]; grid[y * S + x] = (rule >> (l << 2 | c << 1 | r)) & 1; }
  regionCache.set(key, grid); while (regionCache.size > RELAY_REGIONS.cache) regionCache.delete(regionCache.keys().next().value);
  return grid;
}
// Is the section (rx, ry) alive in the relay pattern?
export function relayCell(seed, rx, ry) {
  if (inCore(rx, ry)) return coreCell(seed, rx, ry);
  if (ry < RELAY_REGIONS.top) return false;
  const { mx, my } = regionAt(rx, ry), S = RELAY_REGIONS.size;
  return regionGrid(seed, mx, my)[(ry - RELAY_REGIONS.top - my * S) * S + (rx - mx * S)] === 1;
}
// The name of the pattern governing a section (for the Atlas overlay).
export function relayRuleAt(seed, rx, ry) { if (inCore(rx, ry)) return RULE_NAMES[110]; const { mx, my } = regionAt(rx, ry); return RULE_NAMES[regionRule(seed, mx, my)] || `Rule ${regionRule(seed, mx, my)}`; }
// Relays sit on the pattern's edges: alive cells whose northern neighbour is dead (about a fifth of sections), which
// trace the leading edges of Rule 110's triangles and gliders as long diagonal streaks.
export function relayEdge(seed, rx, ry) { return relayCell(seed, rx, ry) && !relayCell(seed, rx, ry - 1); }
// Release 559 (Tim: "the relays seemed to be too rare... I haven't seen a relay in a very long time... I wanna find the
// listener"): a crossing first entered from 559 holds a relay wherever its section is alive in the pattern (about half of
// sections), not only on the pattern's edges (about a fifth). Crossings decided before keep their answer
// (history.relayPattern 2 = edges, 3 = alive cells).
export const RELAY_PLACEMENT = { version: 3 };
export function relayHeld(seed, rx, ry, pattern = RELAY_PLACEMENT.version) { return pattern >= 3 ? relayCell(seed, rx, ry) : relayEdge(seed, rx, ry); }
// Section coordinates of an ordinary crossing id (dungeon:<seed>:g<n>:<rx>:<ry>:<object>), or null.
export function crossingSection(areaId) { const m = /^dungeon:[^:]+:g\d+:(-?\d+):(-?\d+):/.exec(String(areaId)); return m ? { rx: Number(m[1]), ry: Number(m[2]) } : null; }
export const RELAY_TARGET = 5;
export const RELAY_SHARE = 35; // percent of eligible crossings that hold a relay

export const FRAGMENTS = [
  "…carrier found. This is the Array at the far end of the line. If you can hear this, the crossings still remember their routes…",
  "…we built the relays to carry travellers between sections. Something began listening along the line, learning every way home…",
  "…every crossing you open teaches it a road. Every crossing you close teaches it a wall. It learns either way…",
  "…the Hollow Marshals were set to hold the terminals. They were never meant to hold them this long…",
  "…we are not in any section you have walked. We are under all of them. Follow the coordinate when the line is whole…",
  "…the corridor is not a road. It is a throat. Do not let it swallow the last open line…",
  "…signal steady. Coordinate holding. Come alone, Wayfarer. Come before it learns your name…",
];

const ELIGIBLE = (areaId) => !/^(far-array:|hunt-instance:|hunt-arena:|elite-portal:|proving:|displacement:|arena:|skyland:)/.test(areaId) && !areaId.includes(":deep-v") && !areaId.includes("aperture-annex");

export function relayCoordinate(save) { const c = hashSeed(`${save.seed}:relay-coordinate`); return { rx: (c % 2 ? 1 : -1) * (40 + c % 23), ry: ((c >>> 3) % 2 ? 1 : -1) * (40 + (c >>> 5) % 23) }; }
export function ensureRelayNetwork(save) {
  const net = (save.relayNetwork ||= { version: RELAY_VERSION, nodes: {}, fragments: 0 });
  net.nodes ||= {}; net.fragments ||= 0;
  // Release 136: the hidden five-guardian chain and the relay nodes share one "network answered" fact. Whichever came
  // first, the coordinate is now always recorded and journaled (before, the guardian chain left it unrecorded).
  if (save.narrative?.facts?.["relay.networkAnswered"] && !net.coordinate) {
    net.coordinate = relayCoordinate(save);
    const journal = save.narrative.journal;
    if (journal && !journal.some((j) => j.recordId === "relay-coordinate")) journal.push({ recordId: "relay-coordinate", instanceKey: "record:relay-coordinate", title: "The Far Coordinate", text: `The buried network's answer resolves into a place no map has charted: ${net.coordinate.rx}, ${net.coordinate.ry}.`, provenance: "original" });
  }
  return net;
}

// Decided once per crossing history (first entry after this release); crossings entered earlier never gain a relay.
export function relayNodeDecision(save, areaId, history, storyId) {
  if (history.relayNode !== undefined) return history.relayNode;
  const visited = history.visits > 0 || Object.keys(save.session?.areas || {}).some((k) => k === areaId || k.startsWith(areaId + ":level:"));
  const at = crossingSection(areaId);
  history.relayNode = !visited && areaId !== storyId && ELIGIBLE(areaId) && (at ? relayHeld(save.seed, at.rx, at.ry) : hashSeed(`${save.seed}:relay-node:v${RELAY_VERSION}:${areaId}`) % 100 < RELAY_SHARE);
  if (at) history.relayPattern = RELAY_PLACEMENT.version;
  return history.relayNode;
}

// Release 559 (Tim: "if there's no relays in the area, then it shouldn't show up on the map as a relay, because it's
// confusing"): the explored sections that really hold a relay, for the Atlas: "answered" (restored or severed), or
// "dormant" (a crossing there holds one, or will when first entered). A section whose crossings were all decided without one,
// or entered before relays existed, holds none. Unexplored sections are never listed. Map of "rx,ry" -> state.
export function knownRelaySections(save) {
  const out = new Map(), decided = new Map();
  for (const [id, h] of Object.entries(save.consequences?.dungeons || {})) {
    const at = crossingSection(id); if (!at || !h) continue;
    const held = h.relayNode === true ? true : h.relayNode === false || h.visits > 0 ? false : null; if (held === null) continue;
    const k = `${at.rx},${at.ry}`; decided.set(k, decided.get(k) === true || held);
  }
  for (const id of Object.keys(save.relayNetwork?.nodes || {})) { const at = crossingSection(id); if (at) out.set(`${at.rx},${at.ry}`, "answered"); }
  for (const [k, rec] of Object.entries(save.atlas || {})) {
    if (out.has(k) || !save.explored?.[k] || !(rec?.sites || []).some((q) => q.kind === "dungeon")) continue;
    const [rx, ry] = k.split(",").map(Number); if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;
    if (decided.has(k) ? decided.get(k) : relayHeld(save.seed, rx, ry)) out.set(k, "dormant");
  }
  return out;
}
// Place the relay in the guardian's chamber: an open tile 2-5 tiles from the guardian, off the chest.
export function placeRelayNode(map, areaId, save) {
  if (map.objects.some((o) => o.kind === "relayNode")) return null;
  const guardian = (map.enemySpawns || []).find((e) => e.dungeonRole === "gateWarden") || (map.enemySpawns || []).find((e) => e.boss);
  if (!guardian) return null;
  const w = map.width, taken = new Set(map.objects.map((o) => `${o.x},${o.y}`));
  const spots = map.tiles.filter((t) => !t.blocked && !t.environment && !["abyss", "lava", "dungeonWater", "bridge"].includes(t.kind) && !t.slope && !taken.has(`${t.x},${t.y}`))
    .map((t) => ({ t, d: Math.hypot(t.x - guardian.x, t.y - guardian.y) })).filter((q) => q.d >= 2 && q.d <= 5)
    .sort((a, b) => Math.abs(a.d - 3) - Math.abs(b.d - 3) || hashSeed(`${areaId}:${a.t.x}:${a.t.y}`) - hashSeed(`${areaId}:${b.t.x}:${b.t.y}`));
  const spot = spots[0]?.t;
  if (!spot) return null;
  const answer = ensureRelayNetwork(save).nodes[areaId]?.choice || null;
  const node = { id: "relay-node", kind: "relayNode", name: answer === "restore" ? "Restored Relay" : answer === "sever" ? "Severed Relay" : "Dormant Relay", x: spot.x, y: spot.y, state: answer || "dormant", areaId, actions: ["inspect"] };
  map.objects.push(node);
  return node;
}

export function relayNodeActions(o, save, history) {
  if (ensureRelayNetwork(save).nodes[o.areaId]) return ["inspect"];
  return history?.guardianDefeated ? ["restore", "sever", "inspect"] : ["inspect"];
}

export function answeredCount(save) { return Object.keys(ensureRelayNetwork(save).nodes).length; }

export function inspectRelayNode(o, save, history) {
  const prior = ensureRelayNetwork(save).nodes[o.areaId];
  if (prior) return `This relay is ${prior.choice === "restore" ? "restored; its line hums toward the far Array" : "severed; its line is dead"}. Network: ${answeredCount(save)} of ${RELAY_TARGET} relays answered.`;
  if (!history?.guardianDefeated) return "A dormant relay pulses faintly. The crossing's guardian still holds it.";
  return "The relay waits for an answer. Restore it to open its line, or sever it to close the line forever.";
}

// Returns { ok, message, answered, networkAnswered }.
export function commitRelayNode(save, o, choice, history, now = Date.now()) {
  const net = ensureRelayNetwork(save);
  if (!["restore", "sever"].includes(choice)) return { ok: false, message: "The relay does not understand that." };
  if (net.nodes[o.areaId]) return { ok: false, message: "This relay has already answered." };
  if (!history?.guardianDefeated) return { ok: false, message: "The guardian still holds this relay." };
  net.nodes[o.areaId] = { choice, at: now };
  if (choice === "restore") save.consumables.restorativeDraught = (save.consumables.restorativeDraught || 0) + 1;
  else save.materials.lumenDust = (save.materials.lumenDust || 0) + 2;
  o.state = choice; o.name = choice === "restore" ? "Restored Relay" : "Severed Relay";
  const answered = answeredCount(save), fragment = FRAGMENTS[Math.min(net.fragments, FRAGMENTS.length - 1)];
  net.fragments = Math.min(FRAGMENTS.length, net.fragments + 1);
  const journal = save.narrative.journal, add = (recordId, title, text) => { if (!journal.some((j) => j.recordId === recordId)) journal.push({ recordId, instanceKey: `record:${recordId}`, title, text, provenance: "original" }); };
  add(`relay-fragment-${answered}`, `Relay Network ${answered}/${RELAY_TARGET}`, `${choice === "restore" ? "I restored" : "I severed"} a relay. The far transmission continues: ${fragment}`);
  let networkAnswered = false;
  if (answered >= RELAY_TARGET && !save.narrative.facts["relay.networkAnswered"]) {
    save.narrative.facts["relay.networkAnswered"] = true; networkAnswered = true;
    const coordinate = relayCoordinate(save);
    net.coordinate = coordinate;
    add("relay-network-answered", "The Network Answers", `${RELAY_TARGET} relays have answered. The buried network answers back with a coordinate that belongs to no charted section: ${coordinate.rx}, ${coordinate.ry}.`);
  }
  // Release 357: enough relays since the last Listener fell, and the line says where it went.
  const moved = networkAnswered ? null : listenerReturns(save);
  if (moved) add(`listener-moved-${save.farArray.mouth}`, "The Listener Moved", `The line speaks again. What listened at the old Mouth has gone deeper; its new Mouth stands at ${moved.rx}, ${moved.ry}.`);
  const message = `${choice === "restore" ? "The relay wakes; its line opens toward the far Array. A restorative draught is left in its cradle." : "The relay goes dark for good. You salvage two lumen dust."} Network: ${answered}/${RELAY_TARGET}.${networkAnswered ? " The whole line answers at once — a coordinate burns into your journal." : ""}${moved ? ` The line speaks again: the Listener's new Mouth is at ${moved.rx}, ${moved.ry}.` : ""}`;
  return { ok: true, message, answered, networkAnswered };
}

export function relayObjectiveSuffix(save) {
  const net = save.narrative?.facts?.["relay.networkAnswered"] ? ensureRelayNetwork(save) : save.relayNetwork;
  if (!net || save.narrative?.facts?.["relay.networkAnswered"]) return net?.coordinate ? ` · The network answered: ${net.coordinate.rx}, ${net.coordinate.ry}` : "";
  const n = Object.keys(net.nodes || {}).length;
  return n || net.seen ? ` · Relays ${n}/${RELAY_TARGET}` : "";
}

// A relay pylon: dormant red pulse, restored cyan beam, severed dark.
export function drawRelayNode(ctx, o, s, now) {
  const k = (o.x + .5) * s, b = (o.y + .85) * s, t = now / 1000, state = o.state || "dormant";
  ctx.save();
  ctx.fillStyle = "#05050699"; ctx.beginPath(); ctx.ellipse(k, b, s * .34, s * .1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a3f46"; ctx.fillRect(k - s * .26, b - s * .14, s * .52, s * .12); // plinth
  const mast = ctx.createLinearGradient(k - s * .06, 0, k + s * .06, 0); mast.addColorStop(0, "#8d96a0"); mast.addColorStop(1, "#3c434b");
  ctx.fillStyle = mast; ctx.fillRect(k - s * .06, b - s * 1.05, s * .12, s * .92);
  ctx.strokeStyle = "#5e6670"; ctx.lineWidth = Math.max(1, s * .03); for (let i = 0; i < 3; i++) { const y = b - s * (.35 + i * .25); ctx.beginPath(); ctx.moveTo(k - s * .2, y); ctx.lineTo(k + s * .2, y); ctx.stroke(); } // cross arms
  const color = state === "restore" ? "#7fe7ff" : state === "sever" ? "#2a2a2a" : "#ff5a5a", pulse = state === "sever" ? 0 : .5 + .5 * Math.sin(t * (state === "restore" ? 2 : 4));
  if (state !== "sever") { const g = ctx.createRadialGradient(k, b - s * 1.08, 0, k, b - s * 1.08, s * .5); g.addColorStop(0, color + "cc"); g.addColorStop(1, color + "00"); ctx.fillStyle = g; ctx.globalAlpha = .4 + pulse * .6; ctx.beginPath(); ctx.arc(k, b - s * 1.08, s * .5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(k, b - s * 1.08, s * .08, 0, Math.PI * 2); ctx.fill();
  if (state === "restore") { ctx.strokeStyle = "#7fe7ff55"; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.moveTo(k, b - s * 1.1); ctx.lineTo(k, b - s * 3.5); ctx.stroke(); } // the line, open
  ctx.restore();
}
