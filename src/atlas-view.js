// The Atlas at every scale (release 205; Tim, 2026-10-19: "I need to be able to zoom out way farther … a region view or
// a worldview … zoom to region … see more of the map at large"). Pure helpers for main.ts: the zoom range, framing a
// set of sections, and the places a player can jump to (the explored world, each region they have heard, and the
// towns, districts and Wayglasses inside it), plus the shared optional route-panel renderer.
import { READINGS, READING_ORDER, readingAt, readingKnown } from "./lore.js?v=r946-4c6c4e323b38";
import { hamletSection, legacyMouthHamlet, hamletIdentity } from "./settlements.js?v=r946-4c6c4e323b38";
import { PENTAGON, parsePentagonId, pentagonPlan, pentagonLinkKey } from "./pentagon.js?v=r946-4c6c4e323b38";
import { dungeonPointDiscovered } from "./dungeon-framework.js?v=r946-4c6c4e323b38";
import { labFogOf, labFogState } from "./labyrinths.js?v=r946-4c6c4e323b38";

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
// have an objective, like if he gives you a quest... Otherwise you can just wander."). Pure: main.ts navigationTargets passes
// what it already has (the Journal pin, the compass pick, the far quest, the section's waymark objects) and draws what comes back.
// In order: a quest pinned in the Journal; the tracked hunt; a far quest; an objective the Wayfarer chose by tapping the compass;
// then a quest that sends them to a kind of place with no fixed section, by the section's own waymarks (COMPASS_QUEST_CUES). With
// none of these the compass has no needle: no nearest crossing, signal or landmark by default (releases 153-886 aimed at one).
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
export function compassGuidance(save, { area = "overworld", pin = null, pick = null, farQuest = null, cues = [] } = {}) {
  const hunt = save?.viewport?.contracts?.[save?.viewport?.activeHuntId];
  if (pin) return { area: "overworld", rx: pin.rx, ry: pin.ry, kind: "guidance", name: pin.name };
  if (hunt && COMPASS_HUNT_LIVE.includes(hunt.status) && Number.isInteger(hunt.target?.rx) && Number.isInteger(hunt.target?.ry)) return { area: "overworld", rx: hunt.target.rx, ry: hunt.target.ry, kind: "guidance", name: hunt.title || "Viewport guidance" };
  if (farQuest) return { area: "overworld", rx: farQuest.rx, ry: farQuest.ry, kind: "guidance", name: farQuest.name };
  if (area !== "overworld") return null;
  if (pick) return { area: "overworld", rx: pick.rx, ry: pick.ry, x: pick.x, y: pick.y, kind: "guidance", name: pick.name };
  const cue = compassQuestCue(compassQuest(save), cues);
  return cue ? { area: "overworld", rx: cue.targetRx, ry: cue.targetRy, kind: "guidance", name: cue.name || "Quest signal" } : null;
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
