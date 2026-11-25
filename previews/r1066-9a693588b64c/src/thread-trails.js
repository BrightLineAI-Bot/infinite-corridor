// Thread trails (2026-11-21, the daily narrative pass; docs/narrative-bible.md section 6 item 5, the Washing at Sallowby;
// docs/progression-design.md 4.3, "the compass leads without hand-holding"). A thread listed in threads.ts THREAD_TRAILS can be
// followed once begun: reading its first piece takes it up (game.ts chooses it for the compass, as the Second Wayfarer's footprints
// do), the Journal's Leads lists it with "Point compass here", and the compass points at the nearest crossing not yet entered that
// holds its next piece. That crossing is found from cheap hashes (quest-places.ts crossingAt; threads.ts threadIn at the story and
// region versions a first entry pins now; no section is built), searched once in a bounded window round the crossing where the
// last piece lay (then, with none there, round the middle of its home), and kept in the save, so the needle never moves while the
// Wayfarer walks. Only when the next piece is read, or the crossing pointed at is entered without it, is the next one searched
// for. With none in either window the compass points at the thread's home (lore.ts ARCANA_REGIONS), its nearest edge. Nothing here
// places a piece or changes a roll: what a crossing holds is threads.js?v=r1066-9a693588b64c's alone. Like threadIn, it reads a start-1 journey's frame
// only for the journey in play (journey-start.ts frameFor; main.ts and game.ts call it with the journey's Game made).
// Save: save.lore.trails = { threadId: { n, rx, ry, dungeon } | { n, none: true } } (created on first use; additive, normalised by
// threads.ts ensureThreadTrails with save.lore.threadGifts; unknown ids kept). Pure rules: no DOM.
import { THREADS, THREAD_TRAILS, STORY_BUDGET, threadIn, threadFound, storyVersionOf, threadHeld, threadDue, certainThread, settleThreadLot, threadRelicFloor } from "./threads.js?v=r1066-9a693588b64c";
import { secondFootprintsIn } from "./second-wayfarer.js?v=r1066-9a693588b64c";
import { ARCANA_REGIONS, arcanaHint, arcanaToward, regionVersionFor, regionVersionOf } from "./lore.js?v=r1066-9a693588b64c";
import { saveStart, saveFrame } from "./journey-start.js?v=r1066-9a693588b64c";
import { crossingAt } from "./quest-places.js?v=r1066-9a693588b64c";
import { dungeonId, regionSettled } from "./world.js?v=r1066-9a693588b64c";
import { openSeaQuick, farSleepSection } from "./landscape.js?v=r1066-9a693588b64c";
import { hamletSection } from "./settlements.js?v=r1066-9a693588b64c";
import { dreamHallRoll } from "./underlands.js?v=r1066-9a693588b64c";

export const TRAIL_IDS = Object.freeze(Object.keys(THREAD_TRAILS));
// The compass follow of a trail: { kind: "quest", id: "thread:<thread id>" } (types.ts normalizeCompassFollow), and back.
export const trailFollowId = (id) => `thread:${id}`;
export const trailOfFollow = (fid) => (typeof fid === "string" && fid.startsWith("thread:") && THREAD_TRAILS[fid.slice(7)] ? fid.slice(7) : null);

const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
const plain = (v) => !!v && typeof v === "object" && !Array.isArray(v);
// Whether a trail is taken up and not yet finished: at least one piece read, not every one.
export function trailBegun(save, id) { const T = THREADS[id], n = threadFound(save, id).length; return !!THREAD_TRAILS[id] && !!T && n > 0 && n < T.pieces.length; }
const entered = (save, id) => { const h = save?.consequences?.dungeons?.[id]; return !!(h && (h.generatorVersion !== undefined || (Number(h.visits) || 0) > 0)) || !!save?.session?.areas?.[id]; };
// The thread crossing `cid` would hold when entered: its pinned versions if it has them, else those a first entry pins now.
// From story version 7 a new crossing may hold a begun thread's piece for certain (threads.ts THREAD_CERTAIN): as it would decide
// if entered now, never where the Second Wayfarer's footprints lie.
function wouldHold(save, cid) {
  const h = save?.consequences?.dungeons?.[cid];
  if (h && h.storyVersion !== undefined) return threadHeld(save, cid);
  if (h && h.layoutVersion !== undefined) return null; // generated before: it keeps version 0, which holds no trail thread
  const v = STORY_BUDGET.version, r = regionVersionFor(false, ARCANA_REGIONS.live, saveStart(save)), natural = threadIn(save?.seed, cid, v, r), m = ORDINARY.exec(cid);
  if (!m || secondFootprintsIn(save?.seed, cid, v, r)) return natural;
  return certainThread(save, Number(m[1]), Number(m[2]), v, natural) || natural;
}
// Dresses a crossing's thread the first time it loads (game.ts, just before threads.ts addThreadRelic): from story version 7, the
// begun thread made certain there, if any, decided once and counted (threads.ts settleThreadLot). A map that takes no piece (a
// multi-level crossing, an arena) is not counted; nor is a crossing where the Second Wayfarer's footprints lie.
export function settleCrossingThread(map, save, cid) {
  if (!threadRelicFloor(map)) return null;
  return settleThreadLot(save, cid, secondFootprintsIn(save?.seed, cid, storyVersionOf(save, cid), regionVersionOf(save, cid)));
}
// The crossing the last piece was read in, as a section (the search's centre), or the Refuge.
function lastSection(save, id) { const list = threadFound(save, id), m = ORDINARY.exec(String(list[list.length - 1] || "")); return m ? { rx: Number(m[1]), ry: Number(m[2]) } : { rx: 0, ry: 0 }; }
// The nearest crossing not yet entered round (cx, cy) that holds thread `id` when entered, or null: { rx, ry, dungeon }. Never a
// town, a hamlet, an island (a boat would be asked for) or a Sleeper's Hall; never a crossing that might be a Poison Crypt.
export function nearestTrailCrossing(save, id, cx, cy, radius = THREAD_TRAILS[id]?.radius || 0) {
  const seed = save?.seed;
  const at = (x, y) => {
    const cid = crossingAt(save, x, y); if (!cid || wouldHold(save, cid) !== id) return null;
    if ((x === 0 && y === 0) || regionSettled(x, y, seed) || hamletSection(seed, x, y) || openSeaQuick(seed, x, y) || (farSleepSection(x, y) && dreamHallRoll(seed, cid))) return null;
    return { rx: x, ry: y, dungeon: cid };
  };
  for (let d = 0; d <= radius; d++) {
    let best = null, bestD = Infinity;
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const e = dx * dx + dy * dy; if (e >= bestD) continue;
      const p = at(cx + dx, cy + dy); if (p) { best = p; bestD = e; }
    }
    if (best) return best;
  }
  return null;
}
// The trail's place now: { rx, ry, dungeon } (the crossing holding the next piece), { rx, ry, home: true } (its home's nearest edge,
// with no crossing inside the window), or null (not begun, finished, or no home). Searched only when the record is stale (another
// piece read since, or the crossing pointed at entered), and the answer saved.
export function trailPlace(save, id) {
  if (!trailBegun(save, id)) return null;
  const n = threadFound(save, id).length, lore = save.lore, rec = plain(lore.trails) ? lore.trails[id] : null, due = threadDue(save, id);
  let t = plain(rec) && rec.n === n && !!rec.due === due && (rec.none === true || (typeof rec.dungeon === "string" && !entered(save, rec.dungeon))) ? rec : null; // `due`: the next crossing became certain (THREAD_CERTAIN)
  if (!t) {
    const c = lastSection(save, id), m = homeAt(save, id, "middle"), p = nearestTrailCrossing(save, id, c.rx, c.ry) || (m && nearestTrailCrossing(save, id, m.rx, m.ry)); // then round the middle of its home
    t = p ? { n, rx: p.rx, ry: p.ry, dungeon: p.dungeon } : { n, none: true }; if (due) t.due = true;
    lore.trails = { ...(plain(lore.trails) ? lore.trails : {}), [id]: t };
  }
  if (t.none !== true) return { rx: t.rx, ry: t.ry, dungeon: t.dungeon };
  const e = homeAt(save, id, "edge"); return e ? { ...e, home: true } : null;
}
// A section on a thread's home's centre line, in the journey's frame: its nearest edge, or the middle of its stretch; null with no home.
function homeAt(save, id, where) {
  const h = ARCANA_REGIONS.sets[id]; if (!h) return null;
  const a = (ARCANA_REGIONS.headings[arcanaToward(id, saveFrame(save))] * Math.PI) / 180, d = where === "edge" ? h.from : (h.from + h.to) / 2;
  return { rx: Math.round(Math.cos(a) * d) + 0, ry: Math.round(-Math.sin(a) * d) + 0 };
}
// The compass target of a followed trail (atlas-view.ts compassFollowTarget): its section, and the crossing's door when the
// Wayfarer stands in that section (`here`: { rx, ry, objects }).
export function trailTarget(save, id, here = null) {
  const p = trailPlace(save, id); if (!p) return null;
  const out = { area: "overworld", rx: p.rx, ry: p.ry, kind: "guidance", name: THREADS[id].title };
  if (p.dungeon && here && here.rx === p.rx && here.ry === p.ry && Array.isArray(here.objects)) {
    const gen = Number(save?.worldGeneration) || 1, door = here.objects.find((o) => o?.kind === "dungeon" && dungeonId(save?.seed, gen, p.rx, p.ry, o.id) === p.dungeon);
    if (door && Number.isFinite(door.x) && Number.isFinite(door.y)) { out.x = door.x; out.y = door.y; }
  }
  return out;
}
// The Journal's Leads rows (main.ts activeQuests): { id, title, detail, at, follow } for each trail begun and not finished.
export function trailLeads(save) {
  const out = [];
  for (const id of TRAIL_IDS) {
    if (!trailBegun(save, id)) continue;
    const T = THREADS[id], R = THREAD_TRAILS[id], n = threadFound(save, id).length, p = trailPlace(save, id);
    const where = p?.dungeon ? "The next lies in the crossing the compass can point to." : p?.home ? `The rest most likely lie ${arcanaHint(id, saveFrame(save))}.` : "The rest lie in crossings of the middle distance and farther.";
    const sure = threadDue(save, id) ? " The next new crossing of its stretch is sure to hold one." : "";
    out.push({ id, title: T.title, detail: `${R.lead}: ${n} of ${T.pieces.length} ${R.unit} found. ${where}${sure}`, at: p ? { rx: p.rx, ry: p.ry } : null, follow: { kind: "quest", id: trailFollowId(id) } });
  }
  return out;
}
