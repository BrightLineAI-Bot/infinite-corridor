// Journey starts and progression modes (docs/progression-design.md revision 3, Phase 2: sections 4.0 and 6). Pure rules and
// data; imports only random.ts so any module may read it (world.ts, landscape.ts, lore.ts and the rest).
//
// save.progression (additive at schema 14; normalised by ensureProgression from freshSave and migrateSave, unknown fields kept):
//   v      the record's shape (PROGRESSION_RECORD.v)
//   mode   0 Classic (today's rules) or 1 Exploration. A journey with no record is 0, and nothing about it changes.
//   table  the progression table version it reads (progression.ts PROGRESSION_TABLE_VERSION)
//   start  the start version it was created at: 0 for every journey from before, 1 for one created from now on. Never changes.
//   kept   ability ids (progression.ts row ids) held in either mode for good: the start's Aegis, and what a switch kept
//   log    the switches: { from, to, playSeconds, section }, newest last (at most PROGRESSION_RECORD.logMax)
//   kit    the starting choice, when one was made: { weapon, tool } (items.ts WEAPON_SCALING / TOOL_SCALING keys)
// Phase 2 stored, showed and switched the mode; Phase 3 (EXPLORATION below) gives Exploration its core kit and its own gates.
//
// Start version 1, the frame turn (section 4.0). Every journey created at start version 1 takes one seeded frame: a turn of
// k × 45° (k = 0..7), plain or mirrored, 16 frames in all (hash of `${seed}:start-frame:v1`). Every fixed direction the game
// had (the old towns, the Arcana homes, the Readings' quarters and their Torn Pages, the Far Sleep's edge, the Surveyor's
// statue line and the Viewport's first hunt) turns the section's coordinates into the journey's frame first, then asks the
// same question it always asked, so the stories keep their places relative to each other and every distance is unchanged.
// A journey at start version 0 has the identity frame: every answer is exactly what it was. The Refuge stays at 0,0.
import { hashSeed } from "./random.js?v=r1080-888123c078ea";

export const START_FRAME = Object.freeze({
  version: 1, // the start version that turns the frame
  frames: 16, // eight turns of 45°, each plain or mirrored
  stream: "start-frame:v1",
  // The versions the turned rules are known by beside the start version (they hold only on a start-1 journey's ground):
  regionVersion: 2, // lore.ts ARCANA_REGIONS: the homes turned (a start-1 journey's crossings pin region version 2)
  farSleepEdge: 2, // landscape.ts: the Far Sleep's edge turned (version 1 is the fixed diamond, |rx| + |ry| > 35)
  readings: 2, // lore.ts readingAt: the Readings' quarters and bands turned (version 1 is the fixed quarters)
});
// A frame: `turn` 45° steps counter-clockwise (north is up the Atlas, ry < 0), after a mirror east-for-west when `mirror`.
export const IDENTITY_FRAME = Object.freeze({ index: 0, turn: 0, mirror: false, identity: true });
const FRAMES = Object.freeze(Array.from({ length: START_FRAME.frames }, (_, i) => i ? Object.freeze({ index: i, turn: i % 8, mirror: i >= 8, identity: false }) : IDENTITY_FRAME));
export const frameByIndex = (i) => FRAMES[((Math.floor(Number(i)) || 0) % 16 + 16) % 16];
export function frameOf(seed, start = 0) {
  if (!(Number(start) >= START_FRAME.version)) return IDENTITY_FRAME;
  return FRAMES[hashSeed(`${seed}:${START_FRAME.stream}`) % START_FRAME.frames];
}
export const saveStart = (save) => { const v = Number(save?.progression?.start); return Number.isInteger(v) && v > 0 ? v : 0; };
export const saveFrame = (save) => frameOf(save?.seed, saveStart(save));

// ---------------------------------------------------------------- the turn
// Turns of 90° are exact; a 45° step multiplies integer sums by √½, so equal sums give equal answers on both sides of a line.
const C = Math.SQRT1_2;
// World section -> the journey's frame (real numbers): the coordinates today's fixed rules are asked with.
export function toFrame(frame, rx, ry) {
  let x = Number(rx) || 0, n = -(Number(ry) || 0);
  if (!frame || frame.identity) return [x, -n + 0];
  const q = frame.turn >> 1;
  if (frame.turn & 1) [x, n] = [(x + n) * C, (n - x) * C]; // 45° clockwise
  for (let i = 0; i < q; i++) [x, n] = [n, -x]; // 90° clockwise
  if (frame.mirror) x = -x;
  return [x + 0, -n + 0];
}
// The journey's frame -> world (real numbers): where a fixed place of today lies on this journey.
export function fromFrame(frame, cx, cy) {
  let x = Number(cx) || 0, n = -(Number(cy) || 0);
  if (!frame || frame.identity) return [x, -n + 0];
  if (frame.mirror) x = -x;
  for (let i = 0; i < frame.turn >> 1; i++) [x, n] = [-n, x]; // 90° counter-clockwise
  if (frame.turn & 1) [x, n] = [(x - n) * C, (x + n) * C]; // 45° counter-clockwise
  return [x + 0, -n + 0];
}
// A fixed section of today, turned onto the journey's grid (the nearest section to the turned point).
export function turnSection(frame, cx, cy) { const [x, y] = fromFrame(frame, cx, cy); return { rx: Math.round(x) + 0, ry: Math.round(y) + 0 }; }
// The same, at the same distance, falling back to the next bearing (the frame turned a further 45°, up to seven times) while
// `ok(rx, ry)` refuses the section; with every bearing refused, the frame's own section. The identity frame never moves.
export function placeTurned(frame, cx, cy, ok = () => true) {
  if (!frame || frame.identity) return { rx: cx, ry: cy };
  for (let k = 0; k < 8; k++) { const at = turnSection(FRAMES[(frame.mirror ? 8 : 0) + (frame.turn + k) % 8], cx, cy); if (ok(at.rx, at.ry)) return at; }
  return turnSection(frame, cx, cy);
}

// ---------------------------------------------------------------- bearings and words
export const COMPASS = Object.freeze(["e", "ne", "n", "nw", "w", "sw", "s", "se"]); // 45° steps counter-clockwise from east
export const COMPASS_WORDS = Object.freeze({ n: "north", ne: "north-east", e: "east", se: "south-east", s: "south", sw: "south-west", w: "west", nw: "north-west" });
// A bearing of today (a COMPASS key) as it lies on this journey.
export function turnBearing(frame, key) {
  const i = COMPASS.indexOf(key); if (i < 0 || !frame || frame.identity) return key;
  return COMPASS[((((frame.mirror ? 4 - i : i) + frame.turn) % 8) + 8) % 8];
}
const NUMBER_WORDS = Object.freeze(["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]);
const numberWord = (n) => NUMBER_WORDS[n] || String(n);
// "five sections east and two north" for a section 5 east and 2 north of the Refuge (ry < 0 is north).
export function sectionWords(rx, ry) {
  const parts = [];
  if (rx) parts.push([Math.abs(rx), rx > 0 ? "east" : "west"]);
  if (ry) parts.push([Math.abs(ry), ry < 0 ? "north" : "south"]);
  if (!parts.length) return "at the Refuge";
  const [[n, way], second] = parts, first = `${numberWord(n)} section${n === 1 ? "" : "s"} ${way}`;
  return second ? `${first} and ${numberWord(second[0])} ${second[1]}` : first;
}

// ---------------------------------------------------------------- the journey in play
// Rules asked with a section alone (no seed or save to hand: readingAt, inArcanaHome, farSleepSection) read the frame of the
// journey in play, set when its Game is made (useJourneyFrame). Rules given a seed read it only for that journey's seed, so
// another seed (a test, the Proving Ground's laboratory seed) always gets the identity frame. One journey plays per page
// (switching journeys reloads the page).
let ACTIVE = { seed: undefined, frame: IDENTITY_FRAME };
export function useJourneyFrame(save) { ACTIVE = { seed: save?.seed, frame: saveFrame(save) }; return ACTIVE.frame; }
export const activeFrame = () => ACTIVE.frame;
export const activeSeed = () => ACTIVE.seed;
export const frameFor = (seed) => (seed !== undefined && seed === ACTIVE.seed ? ACTIVE.frame : IDENTITY_FRAME);

// ---------------------------------------------------------------- save.progression
export const PROGRESSION_MODES = Object.freeze([
  Object.freeze({ mode: 0, id: "v0", name: "Classic", text: "Today's rules: abilities open with levels, the Aperture and the Arcanum." }),
  Object.freeze({ mode: 1, id: "v1", name: "Exploration", text: "The new progression: a chosen start, a core kit from levelling, and the strange things out in the world." }),
]);
export const PROGRESSION_RECORD = Object.freeze({ v: 1, table: 1, logMax: 64, keptMax: 2048, newMode: 1, newStart: 1 });
const plain = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const wholeOr = (v, min, fallback) => { const n = Number(v); return Number.isInteger(n) && n >= min ? n : fallback; };
// Normalises save.progression. A save without one (every journey from before) gets Classic at start version 0.
export function ensureProgression(save) {
  if (!save || typeof save !== "object") return null;
  const raw = plain(save.progression) ? save.progression : {}, R = PROGRESSION_RECORD;
  const kept = [...new Set((Array.isArray(raw.kept) ? raw.kept : []).filter((id) => typeof id === "string" && id))].slice(0, R.keptMax);
  const log = (Array.isArray(raw.log) ? raw.log : []).filter(plain).slice(-R.logMax).map((q) => ({ ...q }));
  const p = { ...raw, v: R.v, mode: raw.mode === 1 ? 1 : 0, table: wholeOr(raw.table, 1, R.table), start: wholeOr(raw.start, 0, 0), kept, log };
  if (raw.kit !== undefined) { if (plain(raw.kit)) p.kit = { ...raw.kit }; else delete p.kit; }
  save.progression = p;
  return p;
}
export const progressionMode = (save) => (save?.progression?.mode === 1 ? 1 : 0);
// Phase 3, the core kit (docs/progression-design.md revision 3, sections 3.1-3.9 and 7 row 3; Tim, 2026-11-20). Exploration's own
// gates, as data. They hold only on a journey in Exploration that reads progression table `table` or later (exploring): a
// journey created from now on (startJourney), one switched to Exploration (switchProgression), or an Exploration journey from
// before this table, which first keeps everything today's rules had open (progression.ts adoptExploration). Classic never reads
// them. An id in save.progression.kept passes its gate for good, in either mode.
//   gates       ability row id (progression.ts) -> { level } (the Wayfarer's level) or { tier } (the Aperture band index): the
//               three later starter spells by level (Cinder Dart and Aegis are held from the start), and awakening at Sela's
//               forge and the hatchling's mother at the Beast Hotel from Infinite II (band 12).
//   aerialStep  Aerial Step is a discipline of its own: learned for `cost` constellation points once Aperture reaches `aperture`,
//               with no prerequisite (constellation.ts learnAerialStep). Its Motion capstone slot (the save id `aerial-step`)
//               is Long Quickening (`cap`), which has no secondary form; Rift Step keeps its gate (Aperture 18).
//   latticeFree the field passives that are the core kit's, free once the Transit Lattice opens (one each for the Warden, the
//               Gunner and the Spellblade). Every other Lattice pick stays open as today until its own route is built.
//   table       Phase 6 (milestones, the Reliquary and pity; world-routes.ts) moved it to 3: on table 3 Exploration also withholds
//               the abilities whose route is a milestone (c) or a reliquary (R) until they are earned. `coreTable` is Phase 3's
//               table: an Exploration journey on it keeps, on its first load under table 3, those of them today's rules had open
//               (progression.ts adoptExploration), so nothing it could use closes.
//               Phase 7 (quests and thread rewards; quests.ts) moved it to 4: on table 4 Exploration also withholds the quest (b)
//               and thread (d) abilities built then until they are earned. `worldTable` is Phase 6's table: an Exploration journey
//               on table 2 or 3 keeps, on its first load under table 4, those of the newly withheld abilities today's rules had open.
//               Phase 8 (the far, sea, sky and strange quests and the Viscera forms; quests.ts) moved it to 5: on table 5 Exploration
//               withholds every b, d and V ability. `storyTable` is Phase 7's: a journey on it keeps, on its first load under table
//               5, those of Phase 8's newly withheld abilities today's rules had open (progression.ts adoptExploration).
export const EXPLORATION = Object.freeze({
  table: 5,
  coreTable: 2,
  worldTable: 3,
  storyTable: 4,
  gates: Object.freeze({
    "spell:ember-ring": Object.freeze({ level: 3 }), "spell:fire-burst": Object.freeze({ level: 6 }), "spell:grave-sun": Object.freeze({ level: 10 }),
    "awakened:awakening": Object.freeze({ tier: 12 }), "companion:hatchling": Object.freeze({ tier: 12 }),
  }),
  aerialStep: Object.freeze({ aperture: 6, cost: 1, cap: Object.freeze({ name: "Long Quickening", text: "Quickening lasts 50% longer." }) }),
  latticeFree: Object.freeze(["field:sanctum", "field:charged-air", "field:spellblade"]),
});
export const exploring = (save) => progressionMode(save) === 1 && Number(save?.progression?.table) >= EXPLORATION.table;
export const modeInfo = (mode) => PROGRESSION_MODES[mode === 1 ? 1 : 0];
export const progressionKept = (save, id) => Array.isArray(save?.progression?.kept) && save.progression.kept.includes(id);

// ---------------------------------------------------------------- Phase 4: hints and leads (docs/progression-design.md 4.1-4.3, 4A)
// Two additive records at schema 14, normalised here from freshSave and migrateSave (unknown fields kept), in both modes:
//   save.hints  { v, base, seen }: `seen` the first-use hint subjects already shown, dropped or passed over (ids only; at most
//               HINT_RECORD.seenMax, newest kept), so each is shown once per journey; `base` is 1 once what the journey held
//               when hints began was noted as seen without a word (hints.ts hintScan), so an old journey is not flooded.
//   save.leads  { v, told, rumours, followedAt }: `told` the Refuge people who have said their first-journey line (by id);
//               `rumours` the hinted leads heard (leads.ts: { id, kind, text, by, rx?, ry?, name?, at }), at most
//               LEAD_RECORD.rumourMax; `followedAt` the sections explored when the compass last took a choice (4.3's dot).
export const HINT_RECORD = Object.freeze({ v: 1, seenMax: 2048 });
export const LEAD_RECORD = Object.freeze({ v: 1, rumourMax: 32, toldMax: 64 });
export function ensureHints(save) {
  if (!save || typeof save !== "object") return null;
  const raw = plain(save.hints) ? save.hints : {};
  const seen = [...new Set((Array.isArray(raw.seen) ? raw.seen : []).filter((id) => typeof id === "string" && id && id.length <= 200))].slice(-HINT_RECORD.seenMax);
  save.hints = { ...raw, v: HINT_RECORD.v, base: raw.base === 1 ? 1 : 0, seen };
  return save.hints;
}
export function ensureLeads(save) {
  if (!save || typeof save !== "object") return null;
  const raw = plain(save.leads) ? save.leads : {}, told = {};
  for (const [k, v] of Object.entries(plain(raw.told) ? raw.told : {}).slice(0, LEAD_RECORD.toldMax)) if (v === true && k.length <= 120) told[k] = true;
  const rumours = (Array.isArray(raw.rumours) ? raw.rumours : []).filter((q) => plain(q) && typeof q.id === "string" && q.id && typeof q.text === "string")
    .map((q) => { const o = { ...q }; if (!(Number.isInteger(o.rx) && Number.isInteger(o.ry))) { delete o.rx; delete o.ry; } return o; })
    .filter((q, i, all) => all.findIndex((o) => o.id === q.id) === i).slice(-LEAD_RECORD.rumourMax);
  save.leads = { ...raw, v: LEAD_RECORD.v, told, rumours, followedAt: wholeOr(raw.followedAt, 0, 0) };
  return save.leads;
}

// ---------------------------------------------------------------- Phase 6: milestones, the Reliquary and pity (world-routes.ts)
// One additive record at schema 14, normalised here from freshSave and migrateSave (unknown fields kept), in both modes:
//   save.feats  { v, counts, earned, reliquary, pity }
//     counts     milestone counters (world-routes.ts MILESTONES keys -> whole numbers, at most FEAT_RECORD.countMax)
//     earned     ability row id -> { route: "c" | "R" | "b" | "d" | "V", at (play seconds), from (what earned it), dust? (a consolation
//                paid) }; Phase 7 adds routes "b" (a quest) and "d" (a thread's ending); Phase 8 "V" (bought)
//     reliquary  { sites: { [site]: { kind, area, x, y, elev?, state: "waiting" | "opened", gave? } }, firsts: { [kind]: site } }:
//                the reliquaries laid (at most FEAT_RECORD.sitesMax; opened ones go first), and which site took each certain find
//     pity       { mark, owned, told }: the sections explored when an ability was last gained (or the last strong lead given),
//                the abilities held then, and how many strong leads have been given
export const FEAT_RECORD = Object.freeze({ v: 1, countMax: 1e7, sitesMax: 256, earnedMax: 256 });
const SITE_STATES = Object.freeze(["waiting", "opened"]);
const FEAT_ROUTES = Object.freeze(["c", "R", "b", "d", "V"]); // Phase 8: "V", bought with Divine Viscera
export function ensureFeats(save) {
  if (!save || typeof save !== "object") return null;
  const raw = plain(save.feats) ? save.feats : {}, R = FEAT_RECORD, counts = {}, earned = {}, sites = {}, firsts = {};
  for (const [k, v] of Object.entries(plain(raw.counts) ? raw.counts : {})) { const n = Math.floor(Number(v)); if (k.length <= 64 && Number.isFinite(n) && n > 0) counts[k] = Math.min(R.countMax, n); }
  for (const [k, v] of Object.entries(plain(raw.earned) ? raw.earned : {}).slice(0, R.earnedMax)) if (k && k.length <= 120 && plain(v) && FEAT_ROUTES.includes(v.route)) earned[k] = { ...v };
  const rel = plain(raw.reliquary) ? raw.reliquary : {};
  const list = Object.entries(plain(rel.sites) ? rel.sites : {}).filter(([k, v]) => k && k.length <= 300 && plain(v) && typeof v.area === "string" && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y)));
  const keep = [...list.filter(([, v]) => v.state !== "opened"), ...list.filter(([, v]) => v.state === "opened")].slice(0, R.sitesMax);
  for (const [k, v] of list) if (keep.some(([q]) => q === k)) sites[k] = { ...v, x: Number(v.x), y: Number(v.y), state: SITE_STATES.includes(v.state) ? v.state : "waiting" };
  for (const [k, v] of Object.entries(plain(rel.firsts) ? rel.firsts : {})) if (k.length <= 32 && typeof v === "string" && v) firsts[k] = v;
  const pr = plain(raw.pity) ? raw.pity : {};
  save.feats = { ...raw, v: R.v, counts, earned, reliquary: { ...rel, sites, firsts }, pity: { ...pr, mark: wholeOr(pr.mark, 0, 0), owned: wholeOr(pr.owned, 0, 0), told: wholeOr(pr.told, 0, 0) } };
  return save.feats;
}

// ---------------------------------------------------------------- Phase 7: quests (quests.ts)
// One additive record at schema 14, normalised here from freshSave and migrateSave (unknown fields kept), in both modes:
//   save.quests  { v, open, threads }
//     open     quest id -> { state: "open" | "done", at (play seconds), steps: { [step]: play seconds }, places: [{ step, rx, ry,
//              dungeon?, relaxed? }] }: the quests opened (at most QUEST_RECORD.openMax) and the places their steps were given,
//              in order, never moved (QUEST_RECORD.placesMax each, the newest kept)
//     threads  ability id -> thread id: the seeded thread rewards' picks, saved the first time they are read
//     Phase 8 adds, on a quest's own entry and only once used (journey-start.ts keeps them sound, unknown fields kept): counts
//              { [step]: whole number }, window { step, at, n } (a time-limited step since its first), tokens [{ id, step, area, x,
//              y }] (things a kill left to collect, at most QUEST_RECORD.tokensMax), seq (the last token's number), giverAt { rx,
//              ry } (where its giver stands), and on a place `fixed`, `miss`, `used` and `flag`.
export const QUEST_RECORD = Object.freeze({ v: 1, openMax: 64, placesMax: 16, tokensMax: 16 });
const QUEST_STATES = Object.freeze(["open", "done"]);
export function ensureQuests(save) {
  if (!save || typeof save !== "object") return null;
  const raw = plain(save.quests) ? save.quests : {}, R = QUEST_RECORD, open = {}, threads = {};
  for (const [id, q] of Object.entries(plain(raw.open) ? raw.open : {}).slice(0, R.openMax)) {
    if (!id || id.length > 64 || !plain(q) || !QUEST_STATES.includes(q.state)) continue;
    const steps = {}; for (const [k, v] of Object.entries(plain(q.steps) ? q.steps : {})) { const n = Number(v); if (k.length <= 32 && Number.isFinite(n) && n >= 0) steps[k] = Math.floor(n); }
    const places = (Array.isArray(q.places) ? q.places : []).filter((p) => plain(p) && typeof p.step === "string" && (p.relaxed === true || (Number.isInteger(p.rx) && Number.isInteger(p.ry)))).map((p) => ({ ...p })).slice(-R.placesMax);
    const at = Number(q.at); open[id] = { ...q, at: Number.isFinite(at) && at >= 0 ? Math.floor(at) : 0, steps, places };
    // Phase 8's fields, normalised only where present (an entry without them stays as it was)
    if (q.counts !== undefined) { const counts = {}; for (const [k, v] of Object.entries(plain(q.counts) ? q.counts : {})) { const n = Math.floor(Number(v)); if (k.length <= 32 && Number.isFinite(n) && n > 0) counts[k] = Math.min(1e6, n); } open[id].counts = counts; }
    if (q.tokens !== undefined) open[id].tokens = (Array.isArray(q.tokens) ? q.tokens : []).filter((t) => plain(t) && typeof t.id === "string" && t.id.length <= 120 && typeof t.step === "string" && typeof t.area === "string" && Number.isFinite(Number(t.x)) && Number.isFinite(Number(t.y))).map((t) => ({ ...t, x: Math.round(Number(t.x)), y: Math.round(Number(t.y)) })).slice(-R.tokensMax);
    if (q.window !== undefined) { const w = q.window; if (plain(w) && typeof w.step === "string" && Number.isFinite(Number(w.at)) && Number.isInteger(w.n) && w.n >= 0) open[id].window = { ...w, at: Number(w.at) }; else delete open[id].window; }
    if (q.seq !== undefined) open[id].seq = wholeOr(q.seq, 0, 0);
    if (q.gifted !== undefined) open[id].gifted = q.gifted === true; // quest-places.ts questGift
    if (q.giverAt !== undefined) { if (plain(q.giverAt) && Number.isInteger(q.giverAt.rx) && Number.isInteger(q.giverAt.ry)) open[id].giverAt = { rx: q.giverAt.rx, ry: q.giverAt.ry }; else delete open[id].giverAt; }
  }
  for (const [k, v] of Object.entries(plain(raw.threads) ? raw.threads : {})) if (k.length <= 64 && typeof v === "string" && v && v.length <= 64) threads[k] = v;
  save.quests = { ...raw, v: R.v, open, threads };
  return save.quests;
}

// ---------------------------------------------------------------- the Wayfarer's body
// save.wayfarer (additive at schema 14; normalised by ensureWayfarerBody from freshSave and migrateSave, unknown fields
// kept): { body } is "male" (every journey from before, and the default) or "female". Presentation only: Close View
// (close-view-hero.ts closeViewHeroBodyAsset) and Standard View (renderer.ts) draw it; no rule, stat or generator reads it.
export const WAYFARER_BODY = Object.freeze({ bodies: Object.freeze(["male", "female"]), default: "male", labels: Object.freeze({ male: "Male", female: "Female" }) });
export const wayfarerBodyOf = (value) => WAYFARER_BODY.bodies.includes(value) ? value : WAYFARER_BODY.default;
export function ensureWayfarerBody(save, from = save) {
  if (!save || typeof save !== "object") return save;
  const prior = from?.wayfarer, record = prior && typeof prior === "object" && !Array.isArray(prior) ? prior : {};
  save.wayfarer = { ...record, body: wayfarerBodyOf(record.body) };
  return save;
}
export const wayfarerBody = (save) => wayfarerBodyOf(save?.wayfarer?.body);
export function setWayfarerBody(save, body) { ensureWayfarerBody(save); save.wayfarer.body = wayfarerBodyOf(body); return save.wayfarer.body; }
