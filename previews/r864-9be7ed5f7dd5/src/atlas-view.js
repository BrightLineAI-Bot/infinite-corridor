// The Atlas at every scale (release 205; Tim, 2026-10-19: "I need to be able to zoom out way farther … a region view or
// a worldview … zoom to region … see more of the map at large"). Pure helpers for main.ts: the zoom range, framing a
// set of sections, and the places a player can jump to (the explored world, each region they have heard, and the
// towns, districts and Wayglasses inside it), plus the shared optional route-panel renderer.
import { READINGS, READING_ORDER, readingAt, readingKnown } from "./lore.js?v=r864-9be7ed5f7dd5";
import { hamletSection, legacyMouthHamlet, hamletIdentity } from "./settlements.js?v=r864-9be7ed5f7dd5";
import { PENTAGON, parsePentagonId, pentagonPlan, pentagonLinkKey } from "./pentagon.js?v=r864-9be7ed5f7dd5";
import { dungeonPointDiscovered } from "./dungeon-framework.js?v=r864-9be7ed5f7dd5";
import { labFogState } from "./labyrinths.js?v=r864-9be7ed5f7dd5";

const DUNGEON_ROUTE_TAGS = { exit: "OUT", deepReturn: "RETURN", buildingStair: "STAIR", deepTransition: "PASSAGE", deepStair: "DEEP STAIR", annexStair: "DOWN", warpDais: "DAIS", deepPortal: "PORTAL", deepShortcut: "SHORTCUT", emberDoor: "EMBER DOOR" };

// The same floor and visibility contract as the Atlas, with no destination generation.
export function dungeonWayfinding(save, map, player, { current = true, areaId = map?.id, previous = null } = {}) {
  if (!map) return null;
  const pentagon = pentagonWayfinding(save, map, player, previous);
  if (pentagon) return { ...pentagon, position: current ? pentagon.position : null, arrival: current ? pentagon.arrival : null, arrivalLabel: "ARRIVAL", previous: current ? pentagon.previous : null };
  const visible = point => point && dungeonPointDiscovered(map, point) && labFogState(map, point.x, point.y) > 0;
  const knownLevels = new Set(map.deepProgress?.discoveredLevelIds || save?.consequences?.dungeons?.[areaId]?.deep?.discoveredLevelIds || []), levels = map.levels || [];
  const doors = (map.objects || []).filter(o => DUNGEON_ROUTE_TAGS[o.kind] && o.state !== "hidden" && !o.secretDoor && visible(o)).map(o => {
    const targetId = o.toLevelId || o.targetLevelId, targetLevel = knownLevels.has(targetId) && levels.find(q => q.id === targetId);
    const dir = o.dir || o.direction, direction = dir === "up" ? "UP" : dir === "down" ? "DOWN" : dir === "door" ? "DOOR" : dir === "roof" || dir === "roofExit" ? "ROOF / OUT" : DUNGEON_ROUTE_TAGS[o.kind];
    return { id: o.id, x: o.x, y: o.y, direction, tag: direction, back: false,
      target: targetId ? targetLevel?.name || "Unexplored level" : o.toId ? "Another chamber" : o.kind === "exit" || o.kind === "deepReturn" ? "Way out" : "Route marker" };
  });
  const saved = save?.session?.floorEntry, arrival = current && !map.multiLevel && saved?.id === areaId && visible(saved) ? { x: saved.x, y: saved.y } : null;
  return { doors, previous: null, arrival: arrival || (current && visible(map.entry) ? { x: map.entry.x, y: map.entry.y } : null), arrivalLabel: arrival ? "ARRIVAL" : "FLOOR ENTRY",
    position: current ? { x: Math.round(player.x), y: Math.round(player.y) } : null };
}

// Read-only Pentagon wayfinding. Chamber discovery is already durable in labSeen;
// never generate another chamber, infer visit order from it, or name an unseen room.
export function pentagonWayfinding(save, map, player, previous = null) {
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
  const doors = (map.objects || []).filter(o => ["buildingStair", "exit", "pentShortcut"].includes(o.kind) && o.state !== "hidden" && (!o.secretDoor || known.has(o.toId))).map(o => {
    const destination = known.get(o.toId), back = !!prior && o.toId === prior.id;
    const blocked = !!((o.lock && !(history.labKeys || []).includes(o.lock)) || (o.barred && !(history.labOpen || []).includes(o.shortcutKey)) || (o.sigil && !o.unsealed) || (o.bossGate && !(history.pentBosses || []).includes(B.node)) || (o.plateLock && !(history.labOpen || []).includes(`plate:${B.node}`) && !map.tiles?.some(t => t.plate && t.build === "stone")) || (o.gate === "levers" && (history.pentLevers || []).length < PENTAGON.levers) || (o.kind === "pentShortcut" && o.end !== "deep" && !(history.labOpen || []).includes(pentagonLinkKey(o.link))));
    const direction = o.kind === "exit" ? "OUT" : o.kind === "pentShortcut" ? "SHORTCUT" : o.dir === "up" ? "UP" : o.dir === "down" ? "DOWN" : "DOOR";
    return { id: o.id, x: o.x, y: o.y, direction, back, blocked, target: destination?.name || (o.kind === "exit" ? "Outside" : "Unexplored"), tag: `${back ? "BACK · " : ""}${direction}${blocked ? " · LOCKED" : ""}` };
  });
  const entry = save?.session?.floorEntry;
  const arrival = entry?.id === map.id && Number.isFinite(entry.x) && Number.isFinite(entry.y) ? { x: entry.x, y: entry.y } : null;
  return { rooms, connections, doors, previous: prior?.name || null, arrival, position: { x: Math.round(player.x), y: Math.round(player.y) } };
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
export function renderDungeonWayfindingPanel(panel, view, map) {
  const doc = panel.ownerDocument; panel.classList.add("dungeon-wayfinding");
  panel.hidden=!view;panel.replaceChildren();if(!view)return;
  const heading=doc.createElement("p");heading.textContent=view.position?`You are here: ${map.name} · ${view.position.x}, ${view.position.y}. ${view.previous?`Previous chamber: ${view.previous}. BACK marks doors returning there.`:"Previous route unavailable."}`:`Inspecting ${map.levelName||map.name}. Your position and arrival are on the current floor.`;panel.append(heading);
  if(view.arrival){const entry=doc.createElement("p");entry.textContent=`${view.arrivalLabel}: ${view.arrival.x}, ${view.arrival.y}`;panel.append(entry)}
  const routes=doc.createElement("ul");routes.setAttribute("aria-label","Known floor routes");for(const [i,door] of view.doors.entries()){const row=doc.createElement("li");row.textContent=`${i+1}. ${door.tag} · ${door.back?"Return to":door.direction==="OUT"?"Leave for":"Onward to"} ${door.target} · ${door.x}, ${door.y}`;routes.append(row)}panel.append(routes);
  if(!view.rooms){const note=doc.createElement("p");note.textContent="Only discovered markers are listed. Doors and routes may still require a key, objective or mechanism.";panel.append(note);return}
  const known=doc.createElement("details"),summary=doc.createElement("summary");summary.textContent=`Discovered chambers (${view.rooms.length})`;known.append(summary);const list=doc.createElement("ul");for(const room of view.rooms){const row=doc.createElement("li");row.textContent=`${room.floor} · ${room.name}${room.current?" · YOU ARE HERE":""}`;list.append(row)}known.append(list);panel.append(known);
  const connections=doc.createElement("details"),connectionTitle=doc.createElement("summary");connectionTitle.textContent=`Mapped connections (${view.connections.length})`;connections.append(connectionTitle);const explanation=doc.createElement("p");explanation.textContent="Between discovered chambers. This is not a record of travel order; secret doors and unrecorded side routes are omitted.";connections.append(explanation);const edges=doc.createElement("ul");for(const edge of view.connections){const row=doc.createElement("li");row.textContent=`${edge.source} ↔ ${edge.destination} · ${edge.kind}${edge.note?` · ${edge.note}`:""}`;edges.append(row)}connections.append(edges);panel.append(connections);
}
