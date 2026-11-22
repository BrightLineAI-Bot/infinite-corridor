// The Atlas at every scale (release 205; Tim, 2026-10-19: "I need to be able to zoom out way farther … a region view or
// a worldview … zoom to region … see more of the map at large"). Pure helpers for main.ts: the zoom range, framing a
// set of sections, and the places a player can jump to (the explored world, each region they have heard, and the
// towns, districts and Wayglasses inside it), plus the shared optional route-panel renderer.
import { secondWayfarerTarget } from "./second-wayfarer.js?v=r1054-eb0ad3dc56dc";
import { trailOfFollow, trailTarget } from "./thread-trails.js?v=r1054-eb0ad3dc56dc"; // 2026-11-21: a followed thread (the Washing at Sallowby)
import { nearestCrossing } from "./leads.js?v=r1054-eb0ad3dc56dc"; // Progression Phase 4: the Cairn Keeper's errand on an Exploration journey
import { exploring } from "./journey-start.js?v=r1054-eb0ad3dc56dc";
import { questOfFollow } from "./quests.js?v=r1054-eb0ad3dc56dc"; import { questTarget } from "./quest-places.js?v=r1054-eb0ad3dc56dc"; // progression Phase 7: a followed quest
import { READINGS, READING_ORDER, readingAt, readingKnown } from "./lore.js?v=r1054-eb0ad3dc56dc";
import { hamletSection, legacyMouthHamlet, hamletIdentity } from "./settlements.js?v=r1054-eb0ad3dc56dc";
import { PENTAGON, parsePentagonId, pentagonPlan, pentagonLinkKey } from "./pentagon.js?v=r1054-eb0ad3dc56dc";
import { dungeonPointDiscovered } from "./dungeon-framework.js?v=r1054-eb0ad3dc56dc";
import { labFogOf, labFogState } from "./labyrinths.js?v=r1054-eb0ad3dc56dc";
import { TALL_TOWERS } from "./tall-towers.js?v=r1054-eb0ad3dc56dc";

const DUNGEON_ROUTE_TAGS = { exit: "OUT", deepReturn: "RETURN", buildingStair: "STAIR", deepTransition: "PASSAGE", deepStair: "DEEP STAIR", annexStair: "DOWN", warpDais: "DAIS", deepPortal: "PORTAL", deepShortcut: "SHORTCUT", emberDoor: "EMBER DOOR", labGate: "DOOR" };
export const DUNGEON_DOOR_WAYPOINTS = { max: 3 };

// Door-navigation receipts use area-scoped IDs so repeated generator-local names
// (for example `building-exit`) cannot collide. Keep this pure: Atlas inspection
// must neither create navigation state nor repair a save as a side effect.
export const dungeonDoorId = (areaId, door) => { const id = String(typeof door === "string" ? door : door?.id); return id.startsWith(`${areaId}::`) ? id : `${areaId}::${id}`; };
export function dungeonDoorWaypointIds(save, areaId) {
  const raw = save?.dungeonDoorNavigation?.areas?.[areaId]?.waypointDoorIds;
  const out = [];
  for (const id of Array.isArray(raw) ? raw : []) if (typeof id === "string" && id.startsWith(`${areaId}::`) && !out.includes(id) && out.length < DUNGEON_DOOR_WAYPOINTS.max) out.push(id);
  return out;
}

function markDungeonDoors(save, areaId, doors, candidates = null) {
  const area = save?.dungeonDoorNavigation?.areas?.[areaId] || {}, visited = new Set(Array.isArray(area.visitedDoorIds) ? area.visitedDoorIds : []);
  const marks = dungeonDoorWaypointIds(save, areaId), byId = new Map(marks.map((id, i) => [id, i + 1]));
  const selectable = Array.isArray(candidates) ? new Set(candidates.map(d => dungeonDoorId(areaId, d))) : null;
  return doors.map((door) => {
    const doorId = dungeonDoorId(areaId, door), mark = byId.get(doorId) || null;
    return { ...door, doorId, areaId, selected: mark !== null, mark, visitMark: area.arrivalDoorId === doorId ? "arrival" : visited.has(doorId) ? "visited" : "known", selectable: !selectable || selectable.has(doorId) };
  });
}

// Shared pure model for the floor map, Compass and close-view door rendering.
// A route is disclosed by the same chunk/fog rules as the dungeon map. Secret
// objects and hidden state never leak merely because their object was generated.
export function discoveredDungeonDoors(save, map, { areaId = map?.id, previous = null, candidates = null } = {}) {
  if (!map || !areaId) return [];
  const visible = point => point && dungeonPointDiscovered(map, point) && labFogState(map, point.x, point.y) > 0;
  const pentagon = map.building?.pentagon && parsePentagonId(map.id);
  if (pentagon) return markDungeonDoors(save, areaId, pentagonDoorRows(save, map, previous).filter(door=>visible(door)&&pentagonDoorSeen(save,areaId,door)), candidates);
  const knownLevels = new Set(map.deepProgress?.discoveredLevelIds || save?.consequences?.dungeons?.[areaId]?.deep?.discoveredLevelIds || []), levels = map.levels || [];
  const synthetic = (Array.isArray(candidates) ? candidates : []).filter(o => o.synthetic && o.kind === "doorway");
  const doors = [...(map.objects || []), ...synthetic].filter(o => (DUNGEON_ROUTE_TAGS[o.kind] || o.kind === "doorway") && o.state !== "hidden" && !o.secretDoor && visible(o)).map(o => {
    const targetId = o.toLevelId || o.targetLevelId, targetLevel = knownLevels.has(targetId) && levels.find(q => q.id === targetId);
    const dir = o.dir || o.direction, direction = o.kind === "doorway" ? "DOOR" : dir === "up" ? "UP" : dir === "down" ? "DOWN" : dir === "door" ? "DOOR" : dir === "roof" || dir === "roofExit" ? "ROOF / OUT" : DUNGEON_ROUTE_TAGS[o.kind];
    return { id: o.id, x: o.x, y: o.y, kind: o.kind, direction, tag: direction, back: false, blocked: o.kind === "labGate" && o.state !== "open",
      target: targetId ? targetLevel?.name || "Unexplored level" : o.toId ? "Another chamber" : o.kind === "exit" || o.kind === "deepReturn" ? "Way out" : o.kind === "labGate" || o.kind === "doorway" ? "The other side" : "Route marker" };
  });
  return markDungeonDoors(save, areaId, doors, candidates);
}

const navigationDoorMemo = new WeakMap();
const navigationRoute = o => !!(DUNGEON_ROUTE_TAGS[o?.kind] || o?.kind === "pentShortcut");
function navigationInputsMatch(prior, map, areaId, state, fog, candidates, history) {
  if (!prior || prior.areaId !== areaId || prior.revealed !== map._dungeonRevealed || prior.revealedSize !== (map._dungeonRevealed?.size || 0) || prior.fogStamp !== (fog?.stamp || 0) || prior.arrival !== state.arrivalDoorId || prior.seen !== state.seenDoorIds || prior.visited !== state.visitedDoorIds || prior.waypoints !== state.waypointDoorIds || prior.labOpen !== history?.labOpen || prior.labKeys !== history?.labKeys || prior.pentBosses !== history?.pentBosses) return false;
  for (const p of prior.plates) if (p.tile.build !== p.build) return false;
  if (candidates !== prior.candidateSource) { const list = Array.isArray(candidates) ? candidates : [], oldCandidates = prior.candidates; if (list.length !== oldCandidates.length) return false;
    for (let i = 0; i < list.length; i++) { const a = list[i], b = oldCandidates[i]; if (a.id !== b.id || a.x !== b.x || a.y !== b.y || a.kind !== b.kind || !!a.synthetic !== b.synthetic) return false; } }
  let n = 0; for (const o of map.objects || []) if (navigationRoute(o)) { const b = prior.routes[n++]; if (!b || o !== b.object || o.id !== b.id || o.x !== b.x || o.y !== b.y || o.state !== b.state || !!o.secretDoor !== b.secret || o.unsealed !== b.unsealed || o.kind !== b.kind || o.toId !== b.toId) return false; }
  return n === prior.routes.length;
}
// Allocation-free on an unchanged frame. The key follows every input that can
// disclose or alter a door: dungeon chunks, labyrinth fog, object state, and
// the area's durable arrival/visited/waypoint receipts.
export function dungeonNavigationDoors(save, map, areaId = map?.id, candidates = null) {
  if (!map || !areaId || !(map.building?.labyrinth || map.building?.pentagon)) return [];
  const state = save?.dungeonDoorNavigation?.areas?.[areaId] || {}, fog = labFogOf(map), history = save?.consequences?.dungeons?.[map.building?.base ? `${map.building.base}:f1` : areaId];
  const prior = navigationDoorMemo.get(map); if (navigationInputsMatch(prior, map, areaId, state, fog, candidates, history)) return prior.value;
  const visited = new Set(Array.isArray(state.visitedDoorIds) ? state.visitedDoorIds : []), slots = new Map(dungeonDoorWaypointIds(save, areaId).map((id, i) => [id, i + 1]));
  const value = discoveredDungeonDoors(save, map, { areaId, candidates }).filter(door=>door.selectable).map(door => ({
    id: door.doorId, x: door.x, y: door.y, label: `${door.tag} · ${door.target}`,
    mark: state.arrivalDoorId === door.doorId ? "arrival" : visited.has(door.doorId) ? "visited" : "known",
    slot: slots.get(door.doorId) || null, kind: door.kind, blocked: !!door.blocked
  }));
  const candidateSnapshot = (Array.isArray(candidates) ? candidates : []).map(o => ({ id: o.id, x: o.x, y: o.y, kind: o.kind, synthetic: !!o.synthetic })), routes = [], plates = [];
  for (const o of map.objects || []) if (navigationRoute(o)) routes.push({ object: o, id: o.id, x: o.x, y: o.y, state: o.state, secret: !!o.secretDoor, unsealed: o.unsealed, kind: o.kind, toId: o.toId });
  for (const tile of map.tiles || []) if (tile.plate) plates.push({ tile, build: tile.build });
  navigationDoorMemo.set(map, { areaId, revealed: map._dungeonRevealed, revealedSize: map._dungeonRevealed?.size || 0, fogStamp: fog?.stamp || 0, arrival: state.arrivalDoorId, seen: state.seenDoorIds, visited: state.visitedDoorIds, waypoints: state.waypointDoorIds, labOpen: history?.labOpen, labKeys: history?.labKeys, pentBosses: history?.pentBosses, candidateSource: candidates, candidates: candidateSnapshot, routes, plates, value }); return value;
}

// The same floor and visibility contract as the Atlas, with no destination generation.
export function dungeonWayfinding(save, map, player, { current = true, areaId = map?.id, previous = null, candidates = null } = {}) {
  if (!map) return null;
  const pentagon = pentagonWayfinding(save, map, player, previous, candidates);
  if (pentagon) return { ...pentagon, position: current ? pentagon.position : null, arrival: current ? pentagon.arrival : null, arrivalLabel: "ARRIVAL", previous: current ? pentagon.previous : null };
  const visible = point => point && dungeonPointDiscovered(map, point) && labFogState(map, point.x, point.y) > 0;
  const doors = discoveredDungeonDoors(save, map, { areaId, previous, candidates });
  const saved = save?.session?.floorEntry, arrival = current && !map.multiLevel && saved?.id === areaId && visible(saved) ? { x: saved.x, y: saved.y } : null;
  return { doors, previous: null, arrival: arrival || (current && visible(map.entry) ? { x: map.entry.x, y: map.entry.y } : null), arrivalLabel: arrival ? "ARRIVAL" : "FLOOR ENTRY",
    position: current ? { x: Math.round(player.x), y: Math.round(player.y) } : null };
}

// Read-only Pentagon wayfinding. Chamber discovery is already durable in labSeen;
// never generate another chamber, infer visit order from it, or name an unseen room.
export function pentagonWayfinding(save, map, player, previous = null, candidates = null) {
  const B = map?.building, p = B?.pentagon && parsePentagonId(map.id);
  if (!p) return null;
  const plan = pentagonPlan(p.seed, p.cx, p.cy, p.V), history = save?.consequences?.dungeons?.[`${B.base}:f1`] || {};
  const seen = new Set((Array.isArray(history.labSeen) ? history.labSeen : []).filter(Number.isInteger));
  seen.add(p.n);
  const rooms = plan.nodes.filter(n => seen.has(n.n)).map(n => ({ id: `${p.base}:f${n.n + 1}`, name: n.name, current: n.n === p.n,
    floor: n.kind === "outer" ? "Outer ring" : n.kind === "heart" ? `Heart ${Number(n.id.slice(1)) + 1}` : "Inner ring" }));
  const known = new Map(rooms.map(n => [n.id, n])), prior = previous?.to === map.id && known.get(previous.from);
  const byNode = new Map(plan.nodes.filter(n => seen.has(n.n)).map(n => [n.id, known.get(`${p.base}:f${n.n + 1}`)]));
  const opened = new Set(history.labOpen || []), connections = [];
  // A known pair proves only a mapped connection, never which door was traversed.
  // Secret edges and optional parallel landings have no durable traversal receipt.
  for (const edge of plan.edges) {
    const from = byNode.get(edge.a), to = byNode.get(edge.b);
    if (!from || !to || edge.secret || (edge.shortcut && !opened.has(edge.shortcut))) continue;
    const heart = edge.a.startsWith("h") && edge.b.startsWith("h"), upper = heart && plan.nodes.find(n => n.id === edge.a);
    const sealed = edge.sigil && !(p.V >= 4 ? (history.pentOpened || []).includes(`e:${edge.a}-${edge.b}`) : history.pentSigil);
    const plate = edge.plate && !opened.has(`plate:${plan.nodes.find(n => n.id === edge.plate)?.n}`);
    const keeper = heart && upper?.boss && (p.V === 2 || p.V >= 4) && !(history.pentBosses || []).includes(upper.n);
    connections.push({ from: from.id, to: to.id, source: from.name, destination: to.name,
      kind: heart ? "Stair" : edge.shortcut ? "Opened door shortcut" : "Door", note: sealed ? "sigil sealed" : plate ? "pressure plate" : keeper ? "descent held by keeper" : "" });
  }
  for (const link of plan.links || []) {
    const from = byNode.get(link.near), to = byNode.get(link.deep);
    if (from && to && opened.has(pentagonLinkKey(link.id))) connections.push({ from: from.id, to: to.id, source: from.name, destination: to.name, kind: "Opened shortcut", note: "" });
  }
  const doorRows = pentagonDoorRows(save, map, previous, known);
  const doors = markDungeonDoors(save, map.id, candidates ? doorRows.filter(door=>pentagonDoorSeen(save,map.id,door)) : doorRows, candidates);
  const entry = save?.session?.floorEntry;
  const arrival = entry?.id === map.id && Number.isFinite(entry.x) && Number.isFinite(entry.y) ? { x: entry.x, y: entry.y } : null;
  return { rooms, connections, doors, previous: prior?.name || null, arrival, position: { x: Math.round(player.x), y: Math.round(player.y) } };
}

function pentagonDoorSeen(save,areaId,door){
  const nav=save?.dungeonDoorNavigation?.areas?.[areaId],id=dungeonDoorId(areaId,door);
  return !!(nav?.seenDoorIds?.includes(id)||nav?.visitedDoorIds?.includes(id)||nav?.arrivalDoorId===id);
}
function pentagonDoorRows(save, map, previous = null, knownRooms = null) {
  const B = map?.building, p = B?.pentagon && parsePentagonId(map.id);
  if (!p) return [];
  const plan = pentagonPlan(p.seed, p.cx, p.cy, p.V), history = save?.consequences?.dungeons?.[`${B.base}:f1`] || {};
  const seen = new Set((Array.isArray(history.labSeen) ? history.labSeen : []).filter(Number.isInteger)); seen.add(p.n);
  const known = knownRooms || new Map(plan.nodes.filter(n => seen.has(n.n)).map(n => [`${p.base}:f${n.n + 1}`, { id: `${p.base}:f${n.n + 1}`, name: n.name }]));
  const prior = previous?.to === map.id && known.get(previous.from);
  return (map.objects || []).filter(o => ["buildingStair", "exit", "pentShortcut"].includes(o.kind) && o.state !== "hidden" && (!o.secretDoor || known.has(o.toId))).map(o => {
    const destination = known.get(o.toId), back = !!prior && o.toId === prior.id;
    const blocked = !!((o.lock && !(history.labKeys || []).includes(o.lock)) || (o.barred && !(history.labOpen || []).includes(o.shortcutKey)) || (o.sigil && !o.unsealed) || (o.bossGate && !(history.pentBosses || []).includes(B.node)) || (o.plateLock && !(history.labOpen || []).includes(`plate:${B.node}`) && !map.tiles?.some(t => t.plate && t.build === "stone")) || (o.gate === "levers" && (history.pentLevers || []).length < PENTAGON.levers) || (o.kind === "pentShortcut" && o.end !== "deep" && !(history.labOpen || []).includes(pentagonLinkKey(o.link))));
    const direction = o.kind === "exit" ? "OUT" : o.kind === "pentShortcut" ? "SHORTCUT" : o.dir === "up" ? "UP" : o.dir === "down" ? "DOWN" : "DOOR";
    return { id: o.id, x: o.x, y: o.y, kind: o.kind, direction, back, blocked, target: destination?.name || (o.kind === "exit" ? "Outside" : "Unexplored"), tag: `${back ? "BACK · " : ""}${direction}${blocked ? " · LOCKED" : ""}` };
  });
}

// The compass points only at an objective (Tim, 2026-11-12: "I don't think the compass should point at anything unless you
// have an objective, like if he gives you a quest... Otherwise you can just wander."). Tim, 2026-11-19: the compass is sticky and
// points at exactly the one target the player last actively chose (save.guidance, written only by types.ts setCompassChoice): a
// pin (the Journal's "Point compass here", a quest row of the compass menu), a followed source (a hunt or quest accepted, or one of
// the player's own markers chosen in the menu; compassFollowTarget), or an objective chosen by tapping the compass or in the menu
// (a pick). Nothing else retargets it: no tracked hunt, far quest, waymark cue, nearer seed hunt or marker leads by itself. A
// chosen target that is finished or gone gives no needle until the next choice. Pure: main.ts navigationTargets passes what it
// already has (the pin, the follow, the pick's objective, the section's waymark objects, the hatchling's rescue).
export const COMPASS_HUNT_LIVE = Object.freeze(["accepted", "tracking", "target-located"]);
export const COMPASS_QUEST_CUES = Object.freeze({
  leads: Object.freeze(["crossing", "danger", "event"]), // the relay leads (Viewport tracking hunt): "follow the wayfinding marks toward the buried crossings", as since release 153
  errand: Object.freeze(["crossing"]),                    // the Cairn Keeper's errand: "go into any crossing"
});
// Which quest-without-a-section is open, if any: the relay leads first, then the Cairn Keeper's errand.
export function compassQuest(save) {
  const f = save?.narrative?.facts || {};
  if (f["leads.active"] && !f["leads.complete"]) return "leads";
  if (save?.arcana?.starter === "set" && !(save?.lore?.surveyor?.links || []).length) return "errand";
  return null;
}
// A waymark that leads to a crossing: a buried-crossing mark on ground seen before the guides, or a red mark that leads to a
// crossing (waymark guides, before any world beast wakes). An amber mark on guided ground leads to a skyway, not a crossing.
const crossingCue = (q) => q.guide ? !!q.crossing : q.signalKind === "crossing";
export function compassQuestCue(quest, cues) {
  const kinds = COMPASS_QUEST_CUES[quest]; if (!kinds) return null;
  const list = (cues || []).filter((q) => q?.kind === "wayfindingCue");
  if (quest === "errand") return list.find(crossingCue) || null;
  for (const kind of kinds) { const cue = list.find((q) => q.signalKind === kind); if (cue) return cue; }
  return null;
}
// Where a seed hunt (tall-towers.ts TALL_TOWERS.seedHunt) leads: in its own section the needle points at the seed itself, or at
// the door of the crossing it lies in. Since 2026-11-19 (Tim) only a hunt the player chose (a pick, seedHuntObjectives) leads it;
// the nearest live hunt is never followed by itself.
export function seedHuntGuidance(hunt, names = {}) {
  if (!hunt || hunt.state !== "active" || !Number.isInteger(hunt.rx) || !Number.isInteger(hunt.ry)) return null;
  const at = hunt.where === "crossing" ? hunt.door : (hunt.where === "ground" || hunt.where === "tree") ? hunt : null;
  return { area: "overworld", rx: hunt.rx, ry: hunt.ry, ...(at && Number.isInteger(at.x) && Number.isInteger(at.y) ? { x: at.x, y: at.y } : {}), kind: "guidance", name: `Seed hunt: ${names[hunt.kind] || "a seed"}` };
}
// Seed hunts in the compass's quest list (Tim, 2026-11-19: the seed hunt should be one of the quests the player cycles through
// by tapping the compass, so he can select it and have the compass point to it). Each live hunt (`hunts`, tall-towers.ts
// activeSeedHunts) is one entry, named by TALL_TOWERS.seedHunt.compassLabel, nearest first (then by tower id): a tracked entry is
// the compass's pick, so compassGuidance points at the hunt's section and, inside it, at the seed or at the door of its crossing
// (seedHuntGuidance's spot). Its pick key (`objectiveKey`) is the tower's, so it never stands in for another objective in the
// same section. Pure: a few objects per live hunt, built when main.ts rebuilds its objective list.
export const SEED_HUNT_PICK = "seed-hunt:";
export const objectiveKey = (o) => o?.kind === "seedHunt" ? `${SEED_HUNT_PICK}${o.tower}` : `${o?.rx},${o?.ry}`;
export function seedHuntObjectives(hunts, names = {}, rx = 0, ry = 0) {
  const out = [];
  for (const h of hunts || []) {
    const g = seedHuntGuidance(h, names); if (!g || typeof h.tower !== "string") continue;
    out.push({ kind: "seedHunt", tower: h.tower, rx: g.rx, ry: g.ry, ...(Number.isInteger(g.x) ? { x: g.x, y: g.y } : {}), name: TALL_TOWERS.seedHunt.compassLabel.replace("{seed}", names[h.kind] || "a seed") });
  }
  const far = (o) => Math.max(Math.abs(o.rx - rx), Math.abs(o.ry - ry));
  return out.sort((a, b) => far(a) - far(b) || (a.tower < b.tower ? -1 : a.tower > b.tower ? 1 : 0));
}
export function compassGuidance(save, { area = "overworld", pin = null, follow = null, pick = null, cues = [], rescue = null, here = null } = {}) {
  if (pin) return { area: "overworld", rx: pin.rx, ry: pin.ry, kind: "guidance", name: pin.name };
  if (follow) return compassFollowTarget(save, follow, { area, cues, rescue, here });
  if (area !== "overworld") return null;
  if (pick) return { area: "overworld", rx: pick.rx, ry: pick.ry, x: pick.x, y: pick.y, kind: "guidance", name: pick.name };
  return null;
}
// Where a followed source (save.guidance.follow) is now, or null when it is finished or gone. A hunt points at its target section
// while it is live (shown dormant indoors); a tracking hunt with no target yet follows the relay leads' waymarks, as since release
// 153. A far quest points at its centre while open; the rescue at its site; a quest with no fixed section at the section's
// waymarks (COMPASS_QUEST_CUES) while it is open; a marker at the Atlas waypoint or mark while it stands. Progression Phase 4
// (docs/progression-design.md 4.1): on an Exploration journey the Cairn Keeper's errand points at the nearest crossing instead
// from `here` ({ rx, ry, objects }: the Wayfarer's section and its loaded objects; leads.ts nearestCrossing); Classic keeps the waymarks.
export function compassFollowTarget(save, f, { area = "overworld", cues = [], rescue = null, here = null } = {}) {
  const at = (rx, ry, name, extra = {}) => ({ area: "overworld", rx, ry, ...extra, kind: "guidance", name });
  const ok = (o) => !!o && Number.isInteger(o.rx) && Number.isInteger(o.ry);
  const cue = (quest) => { if (area !== "overworld" || compassQuest(save) !== quest) return null; const c = compassQuestCue(quest, cues); return c ? at(c.targetRx, c.targetRy, c.name || "Quest signal") : null; };
  if (!f) return null;
  if (f.kind === "hunt") {
    const h = save?.viewport?.contracts?.[f.id];
    if (!h || !COMPASS_HUNT_LIVE.includes(h.status)) return null;
    return ok(h.target) ? at(h.target.rx, h.target.ry, h.title || "Viewport guidance") : h.kind === "tracking" ? cue("leads") : null;
  }
  if (f.kind === "far") { const q = save?.farQuests?.[f.id]; return q?.status === "open" && ok(q) ? at(q.rx, q.ry, f.name || "Far quest") : null; }
  if (f.kind === "rescue") return ok(rescue) ? { ...rescue } : null;
  if (f.kind === "quest" && questOfFollow(f.id)) return questTarget(save, questOfFollow(f.id)); // progression Phase 7: the step's place (the giver's section, a Starfield crossing)
  if (f.kind === "quest" && trailOfFollow(f.id)) return trailTarget(save, trailOfFollow(f.id), area === "overworld" ? here : null); // a followed thread: the crossing that holds its next piece
  if (f.kind === "quest") return f.id === "second" ? secondWayfarerTarget(save) : f.id === "errand" && here && area === "overworld" && compassQuest(save) === "errand" && exploring(save) ? nearestCrossing(save, here.rx | 0, here.ry | 0, here.objects) || cue(f.id) : cue(f.id); // the Second Wayfarer: the next sighting, and its trace once laid
  if (f.kind === "marker") {
    if (f.id === "waypoint") { const w = save?.manualWaypoint; return ok(w) && (w.area == null || w.area === "overworld") ? at(w.rx, w.ry, String(w.label || COMPASS_MENU.waypointName)) : null; }
    const color = Number(String(f.id).slice(5)), m = normalizeMapMarks(save?.mapMarks).find((q) => q.color === color);
    return m ? at(m.rx, m.ry, `${MAP_MARKS.names[m.color]} mark`) : null;
  }
  return null;
}

// Arriving at the compass's target (Tim, 2026-11-19: "WAYPOINT REACHED" for whatever the compass points at, once per arrival). The
// rule is the needle's: a target with no site position is reached on its section; a site within a section, and a dungeon door
// point, within `radius` tiles (the door needle's own .45). The banner fires once as the arrival starts; it re-arms when the
// Wayfarer leaves, the target changes, or the player chooses again (compassArrivalReset). The state is one small object reused
// every HUD frame (no per-frame allocation); `id` and the coordinates say which target was reached.
export const COMPASS_ARRIVAL = Object.freeze({ radius: .45, site: 1.5, banner: "WAYPOINT REACHED" }); // site: an overworld spot, measured in the open (the door radius is too tight there)
// An overworld target `g` (navigationTargets' guidance) reached by a Wayfarer at (px, py) in section (rx, ry) of `area`. A site
// is measured to the middle of its tile, as the needle aims.
export function compassTargetArrived(g, area, rx, ry, px, py) {
  if (!g || area !== g.area || g.rx !== rx || g.ry !== ry) return false;
  if (!Number.isFinite(g.x)) return true;
  return Math.hypot(g.x + .5 - px, g.y + .5 - py) < COMPASS_ARRIVAL.site;
}
export const compassArrivalState = () => ({ on: false, id: null, rx: NaN, ry: NaN, x: NaN, y: NaN });
export function compassArrivalReset(s) { s.on = false; return s; }
// One HUD frame: `on` whether the target is reached now. True only on the frame an arrival starts (show the banner then).
export function compassArrivalStep(s, on, id = null, rx = NaN, ry = NaN, x = NaN, y = NaN) {
  if (!on) { s.on = false; return false; }
  if (s.on && s.id === id && Object.is(s.rx, rx) && Object.is(s.ry, ry) && Object.is(s.x, x) && Object.is(s.y, y)) return false;
  s.on = true; s.id = id; s.rx = rx; s.ry = ry; s.x = x; s.y = y; return true;
}

// A section is `base × zoom` pixels across. Below `detail` the Atlas switches to its world view: one coloured cell per
// section from a cached image, with markers at a fixed size. `step` is the factor of one zoom press.
export const ATLAS_ZOOM = { base: 52, min: .02, max: 3.2, detail: .45, step: 1.35, placeZoom: 1.6 };
export const clampZoom = (z) => { const n = Number(z); return Number.isFinite(n) ? Math.max(ATLAS_ZOOM.min, Math.min(ATLAS_ZOOM.max, n)) : 1; };
export function sectionPixels(zoom) { return ATLAS_ZOOM.base * zoom; }
export function worldView(zoom) { return zoom < ATLAS_ZOOM.detail; }

export function exploredSections(save) {
  return Object.keys(save?.explored || {}).map((k) => k.split(",").map(Number)).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}
export function boundsOf(list) {
  if (!list.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of list) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  return { minX, minY, maxX, maxY };
}
// The centre and zoom that show `bounds` whole in a w × h view, with a section of margin.
export function frame(bounds, w, h) {
  if (!bounds) return null;
  const sw = bounds.maxX - bounds.minX + 3, sh = bounds.maxY - bounds.minY + 3;
  return { x: Math.round((bounds.minX + bounds.maxX) / 2), y: Math.round((bounds.minY + bounds.maxY) / 2), zoom: clampZoom(Math.min(w / sw, h / sh) / ATLAS_ZOOM.base) };
}
// How far an arrow press moves the view: a third of what is on screen, at least one section.
export function panStep(zoom, w) { return Math.max(1, Math.round(w / sectionPixels(zoom) / 3)); }

const PLACE_KINDS = { checkpoint: "Wayglass", architecturalDistrict: "District", watcherTomb: "Watcher's Shrine" }; // release 465: Watcher's shrines in Go to… // shelters are no longer listed (release 213)
// Everywhere worth jumping to, grouped by region. Regions not yet heard are grouped as "Elsewhere" and never named.
export function atlasPlaces(save) {
  const groups = new Map(), all = exploredSections(save);
  const groupFor = (rx, ry) => { const id = readingAt(rx, ry), known = readingKnown(save, id), key = known ? id : "elsewhere"; if (!groups.has(key)) groups.set(key, { id: key, name: known ? READINGS[id].name : "Elsewhere", sections: [], places: [] }); return groups.get(key); };
  for (const [rx, ry] of all) {
    const g = groupFor(rx, ry), record = save.atlas?.[`${rx},${ry}`];
    g.sections.push([rx, ry]);
    if (rx === 0 && ry === 0) g.places.push({ name: "Ember Refuge", kind: "refuge", rx, ry });
    if (record?.hamletVersion && (hamletSection(save.seed, rx, ry) || legacyMouthHamlet(save, rx, ry) || (save.hometowns?.towns || []).some((t) => t.rx === rx && t.ry === ry))) g.places.push({ name: hamletIdentity(save.seed, rx, ry).name, kind: "hamlet", rx, ry });
    for (const s of record?.sites || []) if (PLACE_KINDS[s.kind]) g.places.push({ name: s.name && s.name !== s.kind ? s.name : PLACE_KINDS[s.kind], kind: s.kind, rx, ry });
  }
  const order = [...READING_ORDER, "elsewhere"];
  return [...groups.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)).map((g) => ({ ...g, bounds: boundsOf(g.sections), places: g.places.sort((a, b) => a.name.localeCompare(b.name)) }));
}

// Map marks (release 355; Tim, 2026-10-23: "three... points of interest markers that you can just set on some place on
// the map. The compass won't navigate to them... whenever you open up the map... places can be highlighted... with a
// couple different colors"). save.mapMarks (additive): up to `max` sections, each with its own colour. Marking a marked
// section clears it. Only the Atlas draws them; navigation never reads them.
export const MAP_MARKS = { max: 3, colors: ["#ff7ab6", "#7dffa0", "#b48cff"], names: ["Rose", "Green", "Violet"] };
export function normalizeMapMarks(list) {
  const out = [], used = new Set();
  for (const m of Array.isArray(list) ? list : []) {
    const rx = Number(m?.rx), ry = Number(m?.ry), c = Number(m?.color);
    if (!Number.isInteger(rx) || !Number.isInteger(ry) || out.some((q) => q.rx === rx && q.ry === ry) || out.length >= MAP_MARKS.max) continue;
    const color = Number.isInteger(c) && c >= 0 && c < MAP_MARKS.colors.length && !used.has(c) ? c : MAP_MARKS.colors.findIndex((_, i) => !used.has(i));
    used.add(color); out.push({ rx, ry, color });
  }
  return out;
}
export const mapMarkAt = (save, rx, ry) => (save?.mapMarks || []).find((m) => m.rx === rx && m.ry === ry) || null;
export function toggleMapMark(save, rx, ry) {
  const marks = (save.mapMarks = normalizeMapMarks(save.mapMarks)), here = mapMarkAt(save, rx, ry);
  if (here) { save.mapMarks = marks.filter((m) => m !== here); return { ok: true, message: `${MAP_MARKS.names[here.color]} mark cleared.` }; }
  if (marks.length >= MAP_MARKS.max) return { ok: false, message: `All ${MAP_MARKS.max} marks are set. Select a marked section to clear one.` };
  const color = MAP_MARKS.colors.findIndex((_, i) => !marks.some((m) => m.color === i));
  marks.push({ rx, ry, color });
  return { ok: true, message: `${MAP_MARKS.names[color]} mark set on ${rx}, ${ry}.` };
}

// Shared by the production Atlas and the scratch-only Proving Ground witness.
export function renderDungeonWayfindingPanel(panel, view, map, { onToggleDoor = null } = {}) {
  const doc = panel.ownerDocument; panel.classList.add("dungeon-wayfinding");
  panel.hidden=!view;panel.replaceChildren();if(!view)return;
  const heading=doc.createElement("p");heading.textContent=view.position?`You are here: ${map.name} · ${view.position.x}, ${view.position.y}. ${view.previous?`Previous chamber: ${view.previous}. BACK marks doors returning there.`:"Previous route unavailable."}`:`Inspecting ${map.levelName||map.name}. Your position and arrival are on the current floor.`;panel.append(heading);
  if(view.arrival){const entry=doc.createElement("p");entry.textContent=`${view.arrivalLabel}: ${view.arrival.x}, ${view.arrival.y}`;panel.append(entry)}
  const routes=doc.createElement("ul");routes.setAttribute("aria-label","Known floor routes");const selected=view.doors.filter(d=>d.selected).length;for(const [i,door] of view.doors.entries()){const row=doc.createElement("li"),text=doc.createElement("span"),receipt=door.visitMark==="arrival"?"ARRIVAL · ":door.visitMark==="visited"?"TRAVERSED · ":"";row.className="dungeon-door-row";row.setAttribute("data-door-id",door.doorId||"");text.textContent=`${i+1}. ${door.mark?`MARK ${door.mark} · `:""}${receipt}${door.tag} · ${door.back?"Return to":door.direction==="OUT"?"Leave for":"Onward to"} ${door.target} · ${door.x}, ${door.y}`;row.append(text);if(onToggleDoor&&door.doorId&&door.selectable!==false){const button=doc.createElement("button");button.type="button";button.className="dungeon-door-waypoint";button.textContent=door.selected?"Remove":"Add";button.setAttribute("aria-pressed",door.selected?"true":"false");button.setAttribute("aria-label",`${door.selected?"Remove":"Add"} waypoint for ${door.tag} at ${door.x}, ${door.y}`);button.disabled=!door.selected&&selected>=DUNGEON_DOOR_WAYPOINTS.max;button.onclick=()=>onToggleDoor(door,!door.selected);row.append(button)}routes.append(row)}panel.append(routes);
  if(!view.rooms){const note=doc.createElement("p");note.textContent="Only discovered markers are listed. Doors and routes may still require a key, objective or mechanism.";panel.append(note);return}
  const known=doc.createElement("details"),summary=doc.createElement("summary");summary.textContent=`Discovered chambers (${view.rooms.length})`;known.append(summary);const list=doc.createElement("ul");for(const room of view.rooms){const row=doc.createElement("li");row.textContent=`${room.floor} · ${room.name}${room.current?" · YOU ARE HERE":""}`;list.append(row)}known.append(list);panel.append(known);
  const connections=doc.createElement("details"),connectionTitle=doc.createElement("summary");connectionTitle.textContent=`Mapped connections (${view.connections.length})`;connections.append(connectionTitle);const explanation=doc.createElement("p");explanation.textContent="Between discovered chambers. This is not a record of travel order; secret doors and unrecorded side routes are omitted.";connections.append(explanation);const edges=doc.createElement("ul");for(const edge of view.connections){const row=doc.createElement("li");row.textContent=`${edge.source} ↔ ${edge.destination} · ${edge.kind}${edge.note?` · ${edge.note}`:""}`;edges.append(row)}connections.append(edges);panel.append(connections);
}

// The compass's quick menu (Tim, 2026-11-19: "holding the compass opens a quick compass menu... listing everything the compass
// can point at"; then "purely a quick chooser: pick which of your existing quests/objectives (or existing map markers) the
// compass points you toward. It must not create or place new markers. Keep it fast: open, tap one, done"). Pure: main.ts
// gathers what the compass can already point at and this groups it into rows. Each row's `choose` says how main.ts points the
// compass, by the mechanisms it already has: "pin" (save.guidance.pin, as the Journal's "Point compass here"), "pick"
// (save.guidance.pick, the tap cycle's choice), "door" (the dungeon tap cycle's door point) or "none" (let the compass go, as the
// cycle's last tap). The marks (save.mapMarks) and the waypoint (save.manualWaypoint) are only read: never added, moved or cleared.
// 2026-11-19 (Tim: the compass is sticky; markers are opt-in): a row may also choose "follow" (types.ts save.guidance.follow): a
// quest that carries a followed source (a hunt, far quest, the rescue, a quest that follows waymarks) and each of your markers,
// which the needle then follows only because it was chosen here. The followed row is exactly the choice, never a guess.
export const COMPASS_MENU = Object.freeze({
  title: "Point the compass",
  groups: Object.freeze({ quests: "Quests", seedHunts: "Seed hunts", nearby: "Nearby objectives", markers: "Your markers", doors: "Door points" }),
  order: Object.freeze(["quests", "seedHunts", "nearby", "markers", "doors"]),
  waypointName: "Your waypoint",
  waymarksHint: "follows the waymarks",
});
export function compassHeadingWords(dx, dy) {
  if (!dx && !dy) return "here";
  return `${dy < 0 ? "north" : dy > 0 ? "south" : ""}${dy && dx ? "-" : ""}${dx < 0 ? "west" : dx > 0 ? "east" : ""}`;
}
// "3 sections north-east" or "this section": the cheap hint each overworld row carries.
export function compassSectionHint(rx, ry, hereRx, hereRy) {
  const dx = rx - hereRx, dy = ry - hereRy, away = Math.max(Math.abs(dx), Math.abs(dy));
  return away ? `${away} section${away === 1 ? "" : "s"} ${compassHeadingWords(dx, dy)}` : "this section";
}
const sectionOk = (o) => !!o && Number.isInteger(o.rx) && Number.isInteger(o.ry);
// opts: area ("overworld" | "dungeon" | other), here {rx, ry, x, y}, quests [{title, at:{rx,ry}|null, follow?}] (main.ts activeQuests),
// objectives [{kind, rx, ry, name, tag?}] (the tap cycle's list, seed hunts first), waypoint (save.manualWaypoint), marks
// (save.mapMarks), doors [{id, slot, label, x, y}] (the dungeon tap cycle's points), and what the needle follows now: pin
// (save.guidance.pin), follow (save.guidance.follow), pickKey (the tap cycle's pick), doorPick (the dungeon pick). Returns { groups: [{ id, title, rows: [{ id, label, hint, tag, color, current, choose }] }],
// count, clearable }. At most one row is `current`. Built only when the menu opens (never per frame).
export function compassMenuModel({ area = "overworld", here = {}, quests = [], objectives = [], waypoint = null, marks = [], doors = [], pin = null, follow = null, pickKey = null, doorPick = null } = {}) {
  const groups = Object.fromEntries(COMPASS_MENU.order.map((id) => [id, []]));
  const hint = (o) => compassSectionHint(o.rx, o.ry, here.rx | 0, here.ry | 0);
  if (area === "dungeon") {
    const list = (doors || []).filter((d) => d && d.id != null);
    const live = list.find((d) => d.id === doorPick) || list[0] || null; // as the dungeon compass points (main.ts pointDungeonCompass)
    for (const d of list) {
      const dx = Number(d.x) - Number(here.x), dy = Number(d.y) - Number(here.y), far = Math.hypot(dx, dy);
      const words = compassHeadingWords(Math.abs(dx) < .5 ? 0 : Math.sign(dx), Math.abs(dy) < .5 ? 0 : Math.sign(dy));
      groups.doors.push({ id: `door:${d.id}`, label: `Door point ${d.slot}: ${d.label}`, hint: !Number.isFinite(far) ? "" : far < .45 ? "here" : `${Math.max(1, Math.round(far))} paces ${words}`, tag: "", current: d === live, choose: { kind: "door", id: d.id } });
    }
  } else if (area === "overworld") {
    for (const q of quests || []) {
      const f = q?.follow && typeof q.follow === "object" && q.follow.kind ? q.follow : null;
      if (f) groups.quests.push({ id: `follow:${f.kind}:${f.id ?? ""}`, label: String(q.title), hint: sectionOk(q.at) ? hint(q.at) : COMPASS_MENU.waymarksHint, tag: "", ...(sectionOk(q.at) ? { rx: q.at.rx, ry: q.at.ry } : {}), choose: { kind: "follow", follow: f, name: String(q.title) } });
      else if (sectionOk(q?.at)) groups.quests.push({ id: `quest:${q.title}:${q.at.rx},${q.at.ry}`, label: String(q.title), hint: hint(q.at), tag: "", rx: q.at.rx, ry: q.at.ry, choose: { kind: "pin", rx: q.at.rx, ry: q.at.ry, name: String(q.title) } });
    }
    for (const o of objectives || []) {
      if (!sectionOk(o)) continue;
      const key = objectiveKey(o), row = { id: `pick:${key}`, label: String(o.name), hint: hint(o), tag: o.kind === "seedHunt" ? "" : String(o.tag || ""), rx: o.rx, ry: o.ry, key, choose: { kind: "pick", key, rx: o.rx, ry: o.ry, name: String(o.name) } };
      (o.kind === "seedHunt" ? groups.seedHunts : groups.nearby).push(row);
    }
    if (sectionOk(waypoint) && (waypoint.area == null || waypoint.area === "overworld")) { const name = String(waypoint.label || COMPASS_MENU.waypointName); groups.markers.push({ id: "waypoint", label: name, hint: hint(waypoint), tag: "Waypoint", color: "#5fe7ee", rx: waypoint.rx, ry: waypoint.ry, choose: { kind: "follow", follow: { kind: "marker", id: "waypoint" }, name } }); }
    for (const m of normalizeMapMarks(marks)) { const name = `${MAP_MARKS.names[m.color]} mark`; groups.markers.push({ id: `mark:${m.color}`, label: name, hint: hint(m), tag: `Section ${m.rx}, ${m.ry}`, color: MAP_MARKS.colors[m.color], rx: m.rx, ry: m.ry, choose: { kind: "follow", follow: { kind: "marker", id: `mark:${m.color}` }, name } }); }
    // the one row the needle follows now, exactly the choice: a pin (by section and name, then by section alone), else the
    // followed source, else the tap cycle's pick. Nothing is highlighted for a needle the player did not choose.
    const all = COMPASS_MENU.order.flatMap((id) => groups[id]), at = (r, t) => r.rx === t.rx && r.ry === t.ry;
    const live = sectionOk(pin) ? (all.find((r) => r.choose.kind === "pin" && at(r, pin) && r.choose.name === pin.name) || all.find((r) => r.choose.kind === "pin" && at(r, pin)))
      : follow?.kind ? all.find((r) => r.choose.kind === "follow" && r.choose.follow.kind === follow.kind && (r.choose.follow.id ?? null) === (follow.id ?? null))
      : pickKey != null ? all.find((r) => r.key === pickKey) : null;
    for (const r of all) r.current = r === live;
  }
  const out = COMPASS_MENU.order.filter((id) => groups[id].length).map((id) => ({ id, title: COMPASS_MENU.groups[id], rows: groups[id] }));
  return { groups: out, count: out.reduce((n, g) => n + g.rows.length, 0), clearable: area === "overworld" && (sectionOk(pin) || !!follow?.kind || pickKey != null) };
}
