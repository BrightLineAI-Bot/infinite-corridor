// First-use hints (docs/progression-design.md revision 3, Phase 4: section 4A.2, 4A.5 and the budget, 4A.6). Pure: main.ts
// supplies the clock and whether the moment is calm, and draws the card. Every hint's text is a progression.ts row or subject
// (hintFor); this file decides only when, and keeps each subject to once per journey (save.hints.seen, journey-start.ts
// ensureHints). Nothing blocks input, nothing waits for an answer, nothing chains into a next step.
//
// Hints come from three places: a scan (hintScan) of what the journey now holds against what it has been shown (a new ability,
// a gate opening on Exploration, the first constellation point); an event main.ts notices (a foe Encumbered); and a lead heard
// for the first time (game.ts leadNotice). The first scan of a journey notes what it already holds as seen, without a word.
import { ensureHints, HINT_RECORD } from "./journey-start.js?v=r1049-ca0dae0906fa";
import { hintSubjectsHeld, hintFor } from "./progression.js?v=r1049-ca0dae0906fa";
import { pointsFree, pointsSpent } from "./constellation.js?v=r1049-ca0dae0906fa";

export const HINT_BUDGET = Object.freeze({
  onScreen: 1, // one card at once
  queueMax: 3, // others wait; past this the oldest is dropped (its how-to page stays readable)
  gapMs: 45000, // at least this long between hints
  windowMs: 600000, perWindow: 4, // at most 4 in any 10 minutes
  calmMs: 5000, // a queued hint waits for this much calm after a fight, a scene or a menu
  expireMs: 180000, // a hint queued longer than this is dropped, not shown late out of context
  showMs: 6000, // the card fades by itself after this
  settleMs: 3000, // "just after an area loads": a hint may show while moving this long after arriving
  checkEvery: 500, // main.ts steps the queue on the banner queue's cadence
  scanEvery: 2000, // and scans what the journey holds this often
});
// Options → Hints (per device, persistence.ts DEFAULT_SETTINGS.hints): "on" (default), "abilities" (no statuses), or "off".
export const HINT_MODES = Object.freeze([["on", "On"], ["abilities", "Only new abilities"], ["off", "Off"]]);
export const hintMode = (settings) => (["on", "abilities", "off"].includes(settings?.hints) ? settings.hints : "on");

export const hintSeen = (save, id) => Array.isArray(save?.hints?.seen) && save.hints.seen.includes(id);
const record = (save) => (save?.hints && Array.isArray(save.hints.seen) ? save.hints : ensureHints(save)); // normalised once, then kept
export function markHintSeen(save, id) { const h = record(save); if (!h.seen.includes(id)) { h.seen.push(id); if (h.seen.length > HINT_RECORD.seenMax) h.seen.splice(0, h.seen.length - HINT_RECORD.seenMax); } return h; }
const allowed = (hint, mode) => mode === "on" || (mode === "abilities" && (hint.kind === "ability" || hint.ability));

// The in-memory queue (one per page; a journey switch reloads the page).
export function hintQueue() { return { queue: [], shown: [], lastAt: -Infinity, busyAt: -Infinity, current: null }; }

// What the journey holds that it has not been shown: new subjects as hints. The first scan of a journey (save.hints.base 0)
// notes everything held as seen and offers nothing; so does a scan with hints off (turning them on never replays them).
export function hintScan(save, mode = "on") {
  const h = record(save), held = hintSubjectsHeld(save);
  if (pointsFree(save) + pointsSpent(save) > 0) held.push("point:constellation"); // a point has been earned
  const fresh = held.filter((id) => !h.seen.includes(id));
  if (!h.base || mode === "off") { for (const id of fresh) markHintSeen(save, id); if (fresh.includes("point:constellation")) markHintSeen(save, "dot:constellation"); h.base = 1; return []; }
  return fresh.map((id) => hintFor(save, id)).filter(Boolean);
}
// Offers one hint (from a scan, an event or a lead). Seen or already queued: nothing. Not allowed by the mode: noted seen, so
// it never comes back. A queue past its cap drops its oldest (noted seen). Returns whether it was queued.
export function offerHint(save, q, hint, now, mode = "on") {
  if (!hint?.id || hintSeen(save, hint.id) || q.queue.some((x) => x.id === hint.id) || q.current?.id === hint.id) return false;
  if (!allowed(hint, mode)) { markHintSeen(save, hint.id); return false; }
  q.queue.push({ ...hint, at: now });
  while (q.queue.length > HINT_BUDGET.queueMax) markHintSeen(save, q.queue.shift().id);
  return true;
}
// One step of the queue. `busy`: a fight (any foe aggroed or engaged, a boss or Listener arena, a Rite, a Pentagon trial, a fall),
// a scene or Glimpse, the Atlas, Journal or a menu open, Close View Look mode, dialogue. `moving`: the Wayfarer is moving.
// `arrivedAt`: when the area last loaded. Returns the hint to show now (marked seen), or null.
export function hintStep(save, q, now, { busy = false, moving = false, arrivedAt = -Infinity, mode = "on" } = {}) {
  const B = HINT_BUDGET;
  for (let i = q.queue.length - 1; i >= 0; i--) if (now - q.queue[i].at > B.expireMs) markHintSeen(save, q.queue.splice(i, 1)[0].id);
  if (q.current && now < q.current.until) return null;
  q.current = null;
  if (busy) { q.busyAt = now; return null; }
  if (!q.queue.length || mode === "off") return null;
  if (now - q.busyAt < B.calmMs) return null;
  if (moving && now - arrivedAt > B.settleMs) return null;
  if (now - q.lastAt < B.gapMs) return null;
  while (q.shown.length && now - q.shown[0] >= B.windowMs) q.shown.shift();
  if (q.shown.length >= B.perWindow) return null;
  const i = q.queue.findIndex((x) => allowed(x, mode)); if (i < 0) return null;
  const hint = q.queue.splice(i, 1)[0];
  markHintSeen(save, hint.id); q.lastAt = now; q.shown.push(now); q.current = { ...hint, until: now + B.showMs };
  return q.current;
}
// The card was dismissed (✕) or opened its how-to page: it goes now; it is already seen.
export function dismissHint(q) { q.current = null; }

// The Pack button's dot (the first free constellation point): from that point until the Arcanum is first opened after it.
export const packDot = (save, mode = "on") => mode !== "off" && pointsFree(save) > 0 && hintSeen(save, "point:constellation") && !hintSeen(save, "dot:constellation");
export const clearPackDot = (save) => markHintSeen(save, "dot:constellation");
