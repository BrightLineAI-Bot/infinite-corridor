// The Atlas at every scale (release 205; Tim, 2026-10-19: "I need to be able to zoom out way farther … a region view or
// a worldview … zoom to region … see more of the map at large"). Pure helpers for main.ts: the zoom range, framing a
// set of sections, and the places a player can jump to (the explored world, each region they have heard, and the
// towns, districts and Wayglasses inside it). No DOM.
import { READINGS, READING_ORDER, readingAt, readingKnown } from "./lore.js?v=r672-2e666a91bc19";
import { hamletSection, legacyMouthHamlet, hamletIdentity } from "./settlements.js?v=r672-2e666a91bc19";

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
