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
import { hashSeed } from "./random.js?v=r1040-9a67fad23d7b";

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
export const EXPLORATION = Object.freeze({
  table: 2,
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
