// Relay Network v1: physical relay nodes in a share of crossings, continuing the Missing Crossing's lore.
//
// After a crossing's guardian falls, its Dormant Relay can be Restored (the line opens: a restorative draught, and
// the network hears you) or Severed (the line closes forever: lumen dust salvage). Either answer reveals the next
// fragment of the far transmission. When RELAY_TARGET relays have answered, the buried network answers back with a
// coordinate that belongs to no charted section (the same beat the hidden five-guardian chain already triggers).
//
// DRAFT NARRATIVE: the fragment texts below are placeholders written to fit the existing lore. The operator owns the
// relay story; rewrite FRAGMENTS freely. The mechanics never depend on their wording.
import { hashSeed } from "./random.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12";

export const RELAY_VERSION = 1;
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

const ELIGIBLE = (areaId) => !/^(hunt-instance:|hunt-arena:|elite-portal:|proving:|displacement:|arena:)/.test(areaId) && !areaId.includes(":deep-v") && !areaId.includes("aperture-annex");

export function ensureRelayNetwork(save) {
  const net = (save.relayNetwork ||= { version: RELAY_VERSION, nodes: {}, fragments: 0 });
  net.nodes ||= {}; net.fragments ||= 0;
  return net;
}

// Decided once per crossing history (first entry after this release); crossings entered earlier never gain a relay.
export function relayNodeDecision(save, areaId, history, storyId) {
  if (history.relayNode !== undefined) return history.relayNode;
  const visited = history.visits > 0 || Object.keys(save.session?.areas || {}).some((k) => k === areaId || k.startsWith(areaId + ":level:"));
  history.relayNode = !visited && areaId !== storyId && ELIGIBLE(areaId) && hashSeed(`${save.seed}:relay-node:v${RELAY_VERSION}:${areaId}`) % 100 < RELAY_SHARE;
  return history.relayNode;
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
    const c = hashSeed(`${save.seed}:relay-coordinate`), coordinate = { rx: (c % 2 ? 1 : -1) * (40 + c % 23), ry: ((c >>> 3) % 2 ? 1 : -1) * (40 + (c >>> 5) % 23) };
    net.coordinate = coordinate;
    add("relay-network-answered", "The Network Answers", `${RELAY_TARGET} relays have answered. The buried network answers back with a coordinate that belongs to no charted section: ${coordinate.rx}, ${coordinate.ry}.`);
  }
  const message = `${choice === "restore" ? "The relay wakes; its line opens toward the far Array. A restorative draught is left in its cradle." : "The relay goes dark for good. You salvage two lumen dust."} Network: ${answered}/${RELAY_TARGET}.${networkAnswered ? " The whole line answers at once — a coordinate burns into your journal." : ""}`;
  return { ok: true, message, answered, networkAnswered };
}

export function relayObjectiveSuffix(save) {
  const net = save.relayNetwork;
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
