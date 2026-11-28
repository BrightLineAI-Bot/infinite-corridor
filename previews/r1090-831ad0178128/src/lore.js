// The Readings (release 191; docs/narrative-bible.md). The overworld is divided into Readings: distance bands around
// Ember Refuge crossed with compass quarters. In each, people speak in the voice of one book already in the library
// (src/recitations.ts): the residue of human lives the Corridor still remembers. Each Reading holds a number of
// fragments (about 20, differing by Reading) listed in the Reciter's Tome; a Reading whose fragments are all found is
// mastered. Lines a player has heard are remembered (one bitset per voice), so nobody repeats a line until
// that voice is exhausted. Pure data and rules: no DOM, no randomness beyond the seeded `pick` passed in.
import { RECITATIONS } from "./recitations.js?v=r1090-831ad0178128";
import { hashSeed } from "./random.js?v=r1090-831ad0178128";
import { IDENTITY_FRAME, START_FRAME, activeFrame, frameFor, toFrame, turnBearing } from "./journey-start.js?v=r1090-831ad0178128";

export const LORE_VERSION = 1;
// Distance bands, in sections from the origin (|rx| + |ry|).
export const READING_BANDS = { campaign: 6, middle: 18, far: 35 };
// Each Reading: its name (a place name that never names the book: Tim, 2026-10-19), the book it speaks, its voices
// (reciter ids with the share of their lines that belong to this Reading; the Ash Orchards hear the later half of War
// and Peace, the Smoke Meadows the earlier) and how many fragments it holds of each kind. Sizes differ by Reading, about
// 20 on average: a thin book is quickly gathered, a deep one is not.
export const READINGS = {
  longCampaign: { name: "The Smoke Meadows", book: "War and Peace", voices: [["pierre", 0, .5], ["andrew", 0, .5], ["natasha", 0, .5], ["kutuzov", 0, 1], ["denisov", 0, 1], ["dolokhov", 0, 1]], pieces: { voice: 10, recite: 3, glimpse: 5, margin: 5, last: 1 } },
  riverThatRemembers: { name: "The Ferry Reaches", book: "Siddhartha", voices: [["siddhartha", 0, 1]], pieces: { voice: 7, recite: 3, glimpse: 4, margin: 3, last: 1 } },
  transparentEye: { name: "The Clear Country", book: "Nature and Self-Reliance", voices: [["nature", 0, 1], ["selfreliance", 0, 1]], pieces: { voice: 6, recite: 2, glimpse: 4, margin: 3, last: 1 } },
  yellowCity: { name: "The Fevered Stairs", book: "Crime and Punishment", voices: [["raskolnikov", 0, 1], ["porfiry", 0, 1], ["svidrigailov", 0, 1]], pieces: { voice: 9, recite: 3, glimpse: 4, margin: 5, last: 1 } },
  pathAlone: { name: "The Whetstone Hills", book: "Dokkōdō", voices: [["musashi", 0, 1]], pieces: { voice: 5, recite: 2, glimpse: 3, margin: 2, last: 1 } },
  threeBrothers: { name: "The Long Table", book: "The Brothers Karamazov", voices: [["alyosha", 0, 1], ["ivan", 0, 1], ["mitya", 0, 1]], pieces: { voice: 11, recite: 3, glimpse: 5, margin: 6, last: 1 } },
  bookOfImages: { name: "The Autumn Galleries", book: "The Book of Images", voices: [["rilke", 0, 1]], pieces: { voice: 7, recite: 2, glimpse: 4, margin: 3, last: 1 } },
  underTheFloor: { name: "The Low Rooms", book: "Notes from Underground and The Idiot", voices: [["underground", 0, 1], ["myshkin", 0, 1]], pieces: { voice: 8, recite: 3, glimpse: 4, margin: 5, last: 1 } },
  secondCampaign: { name: "The Ash Orchards", book: "War and Peace, years later", voices: [["pierre", .5, 1], ["natasha", .5, 1], ["andrew", .5, 1]], pieces: { voice: 8, recite: 3, glimpse: 4, margin: 3, last: 1 } },
  dreamlands: { name: "The Far Sleep", book: "The Randolph Carter Stories", voices: [["silverkey", 0, 1]], pieces: { voice: 14, recite: 4, glimpse: 8, margin: 6, last: 1 } },
};
export const READING_ORDER = ["longCampaign", "riverThatRemembers", "transparentEye", "yellowCity", "pathAlone", "threeBrothers", "bookOfImages", "underTheFloor", "secondCampaign", "dreamlands"];
const QUARTERS = { middle: { n: "riverThatRemembers", e: "transparentEye", s: "yellowCity", w: "pathAlone" }, far: { n: "threeBrothers", e: "bookOfImages", s: "underTheFloor", w: "secondCampaign" } };
// The fragments of every Reading: voices (passages anyone in the Reading may speak), recitations (the Reading's first
// reciter, from its opening line to its last), Glimpses, margins (in crossings) and the last fragment. Glimpses, margins
// and the last fragment arrive in later releases; their ids are fixed now so saved progress never shifts.
export const PIECE_KINDS = ["voice", "recite", "glimpse", "margin", "last"];
export function bookSize(readingId) { return Object.values(READINGS[readingId]?.pieces || {}).reduce((a, b) => a + b, 0); }

// Progression Phase 2 (readings version 2, journey-start.ts START_FRAME.readings): on a journey created at start version 1 the
// section is first turned into the journey's frame, so every quarter and band turns with it (and with them each Reading's Torn
// Page and fragments, which ask readingAt). `frame` defaults to the journey in play; on any other journey it is the identity.
export function readingAt(rx, ry, frame = activeFrame()) {
  const [x, y] = toFrame(frame, rx, ry), depth = Math.abs(x) + Math.abs(y);
  if (depth <= READING_BANDS.campaign) return "longCampaign";
  if (depth > READING_BANDS.far) return "dreamlands";
  const q = -y >= Math.abs(x) ? "n" : y >= Math.abs(x) ? "s" : x > 0 ? "e" : "w"; // north is up the Atlas (ry < 0)
  return QUARTERS[depth <= READING_BANDS.middle ? "middle" : "far"][q];
}
// A voice's line range within a Reading.
function voiceRange(id, from, to) { const n = RECITATIONS[id]?.length || 0; return [Math.floor(n * from), Math.max(Math.floor(n * from) + 1, Math.floor(n * to))]; }
// Every line a Reading's people may speak: [voice, index] pairs.
export function readingLines(readingId) {
  const out = [];
  for (const [id, from, to] of READINGS[readingId]?.voices || []) { const [a, b] = voiceRange(id, from, to); for (let i = a; i < b && i < (RECITATIONS[id]?.length || 0); i++) out.push([id, i]); }
  return out;
}
// The fixed pieces of a book. Voice pieces are spread evenly through the Reading's lines, taking voices in turn;
// recitation pieces are the first reciter's opening, middle and closing lines within its range.
const pieceCache = new Map();
export function bookPieces(readingId) {
  if (pieceCache.has(readingId)) return pieceCache.get(readingId);
  const r = READINGS[readingId], pieces = [];
  const ranges = r.voices.map(([id, from, to]) => [id, ...voiceRange(id, from, to)]);
  const n = r.pieces, [rid, ra, rb] = ranges[0];
  const recites = Array.from({ length: n.recite }, (_, i) => n.recite < 2 ? ra : ra + Math.round((rb - 1 - ra) * i / (n.recite - 1)));
  const taken = new Set(recites.map((l) => `${rid}:${l}`));
  // A voice piece that lands on a recitation piece (or another voice piece) moves to the next free line of its range.
  for (let i = 0; i < n.voice; i++) {
    const [id, a, b] = ranges[i % ranges.length], k = Math.floor(i / ranges.length), per = Math.ceil(n.voice / ranges.length);
    let at = Math.min(b - 1, a + Math.floor((b - a) * (k + .5) / per));
    for (let step = 0; taken.has(`${id}:${at}`) && step < b - a; step++) at = at + 1 < b ? at + 1 : a;
    taken.add(`${id}:${at}`); pieces.push({ id: `voice:${i}`, kind: "voice", voice: id, line: at });
  }
  recites.forEach((line, i) => pieces.push({ id: `recite:${i}`, kind: "recite", voice: rid, line }));
  for (let i = 0; i < n.glimpse; i++) pieces.push({ id: `glimpse:${i}`, kind: "glimpse" });
  for (let i = 0; i < n.margin; i++) pieces.push({ id: `margin:${i}`, kind: "margin" });
  for (let i = 0; i < n.last; i++) pieces.push({ id: `last:${i}`, kind: "last" });
  pieceCache.set(readingId, pieces);
  return pieces;
}

// Save: { v, heard: { voiceId: hex bitset }, pieces: { readingId: [pieceId] }, entered: { readingId: true },
// glimpses: { glimpseId: times seen }, elders: hex bitset of rule classes heard } (glimpses since release 193; ids
// are kept even if unknown to this build; elders since release 197).
export function ensureLore(s) {
  const l = s.lore && typeof s.lore === "object" ? s.lore : {}, heard = {}, pieces = {}, entered = {}, glimpses = {};
  for (const [id, hex] of Object.entries(l.heard || {})) if (Object.hasOwn(RECITATIONS, id) && typeof hex === "string" && /^[0-9a-f]*$/.test(hex)) heard[id] = hex;
  for (const [id, list] of Object.entries(l.pieces || {})) if (Object.hasOwn(READINGS, id) && Array.isArray(list)) { const known = new Set(bookPieces(id).map((p) => p.id)); pieces[id] = [...new Set(list.filter((p) => known.has(p)))]; }
  for (const id of Object.keys(l.entered || {})) if (Object.hasOwn(READINGS, id) && l.entered[id]) entered[id] = true;
  for (const [id, n] of Object.entries(l.glimpses || {})) if (Number(n) > 0) glimpses[id] = Math.floor(Number(n));
  const elders = typeof l.elders === "string" && /^[0-9a-f]{0,64}$/.test(l.elders) ? l.elders : "";
  s.lore = { ...l, v: LORE_VERSION, heard, pieces, entered, glimpses, elders };
  // The Pentagon's marks (pentagon.ts PENTAGON_LORE), once any is read: the ids read, and which chamber holds which.
  // Unknown ids are kept, as unknown fields are.
  if (l.inscriptions !== undefined) s.lore.inscriptions = [...new Set((Array.isArray(l.inscriptions) ? l.inscriptions : []).filter((id) => typeof id === "string"))];
  if (l.murals !== undefined) s.lore.murals = [...new Set((Array.isArray(l.murals) ? l.murals : []).filter((id) => typeof id === "string"))]; // release 795: the grand halls' murals read (pentagon-halls.ts); unknown ids kept
  if (l.hushed !== undefined) s.lore.hushed = typeof l.hushed === "string" && /^[0-9a-f]{0,16}$/.test(l.hushed) ? l.hushed : ""; // the hushed lines heard (WAYFARER_DREAD), once any is
  if (l.inscribedAt !== undefined) s.lore.inscribedAt = Object.fromEntries(Object.entries(l.inscribedAt && typeof l.inscribedAt === "object" ? l.inscribedAt : {}).filter(([, id]) => typeof id === "string"));
  return s;
}
function bitGet(hex, i) { const c = parseInt(hex[i >> 2] || "0", 16); return (c >> (i & 3)) & 1; }
function bitSet(hex, i) { const at = i >> 2, s = hex.padEnd(at + 1, "0"), c = parseInt(s[at], 16) | (1 << (i & 3)); return s.slice(0, at) + c.toString(16) + s.slice(at + 1); }
export function heardLine(save, voice, i) { return !!bitGet(save.lore?.heard?.[voice] || "", i); }
// Records a line as heard and credits any book piece it completes. Returns the newly found piece, if any.
// Recitation pieces count only when a reciter speaks them (`reciter: true`).
export function hearLine(save, voice, i, { reciter = false } = {}) {
  ensureLore(save); save.lore.heard[voice] = bitSet(save.lore.heard[voice] || "", i);
  for (const readingId of READING_ORDER) for (const p of bookPieces(readingId)) if (p.voice === voice && p.line === i && (p.kind === "voice" || (reciter && p.kind === "recite"))) { const list = save.lore.pieces[readingId] ||= []; if (!list.includes(p.id)) { list.push(p.id); return noteCompletion(save, readingId, p); } }
  return null;
}
// Completing a Reading (every fragment found) flashes "Recitation complete" (Tim, 2026-10-19). The flash is transient
// UI state, not saved: the game takes it with takeCompletedReading() on its next frame.
let completedReading = null;
function noteCompletion(save, readingId, piece) {
  const completed = (save.lore.pieces[readingId]?.length || 0) >= bookSize(readingId);
  if (completed) completedReading = readingId;
  return { readingId, piece, completed };
}
// Credits a fragment found some other way (a Glimpse, a margin). Returns { readingId, piece, completed } or null.
export function creditPiece(save, readingId, piece) {
  ensureLore(save); const list = save.lore.pieces[readingId] ||= [];
  if (!piece || list.includes(piece.id)) return null;
  list.push(piece.id); return noteCompletion(save, readingId, piece);
}
// Other collections (the Elder Wanderers) raise the same flash under their own id.
export function noteCompletionOf(id) { completedReading = id; }
export function takeCompletedReading() { const id = completedReading; completedReading = null; return id; }
export function bookProgress(save, readingId) { const found = save.lore?.pieces?.[readingId]?.length || 0, total = bookSize(readingId); return { found, total, mastered: found >= total }; }
// A Reading is unknown until someone in it speaks its book (Tim, 2026-10-19): walking in reveals nothing. Records the
// discovery and returns its name the first time, then null. (`entered` is the saved name for discovered.)
export function discoverReading(save, id) {
  ensureLore(save);
  if (!READINGS[id] || save.lore.entered[id]) return null;
  save.lore.entered[id] = true; return { id, name: READINGS[id].name };
}
export function readingKnown(save, id) { return !!save.lore?.entered?.[id]; }
// The next line someone in this Reading says: an unheard book piece some of the time (`pieceChance`), otherwise any
// unheard line of the Reading; once every line has been heard, any line. `rand` is a function returning [0, 1).
// Without `recitations`, the lines that are recitation pieces are left to the reciters.
export function nextReadingLine(save, readingId, rand, { pieceChance = .35, voices = null, recitations = false } = {}) {
  ensureLore(save);
  const allow = voices ? new Set(voices) : null, held = recitations ? new Set() : new Set(bookPieces(readingId).filter((p) => p.kind === "recite").map((p) => `${p.voice}:${p.line}`));
  const lines = readingLines(readingId).filter(([v, i]) => (!allow || allow.has(v)) && !held.has(`${v}:${i}`));
  if (!lines.length) return null;
  const pieces = bookPieces(readingId).filter((p) => p.kind === "voice" && (!allow || allow.has(p.voice)) && !held.has(`${p.voice}:${p.line}`) && !heardLine(save, p.voice, p.line));
  if (pieces.length && rand() < pieceChance) { const p = pieces[Math.floor(rand() * pieces.length)]; return { voice: p.voice, line: p.line, text: RECITATIONS[p.voice][p.line] }; }
  const fresh = lines.filter(([v, i]) => !heardLine(save, v, i)), pool = fresh.length ? fresh : lines, [voice, line] = pool[Math.floor(rand() * pool.length)];
  return { voice, line, text: RECITATIONS[voice][line] };
}

// Arcana regions (2026-11-11; Tim: "if you want to do the bell quest, go to the south-west quadrant, roughly 25 to 50 tiles
// out"; the Journal should say how many are found and where the rest likely are; "don't make it so restrictive the map feels
// less free"). Each story set told across crossings has a home: a compass sector around the Refuge (90 degrees centred on
// `toward`; a diagonal is a quadrant, a cardinal point the Reading quarter of lore.ts readingAt) and a stretch of distance
// (`from` to `to` sections out). Nothing is fenced: a set still turns up elsewhere, only rarely.
// Live from 2026-11-11 (Tim: the distance is straight-line from 0,0, the Refuge: rings around it, and the sectors of a ring
// hold different sets). The homes are measured straight-line (Math.hypot); the story bands, the Readings and the Torn Pages
// keep their own measure (sections walked). Nothing was pinned to version 1 before the switch, so this is still version 1.
//   - The Seven Bells and the Surveyor's Chain keep their own rolls: `home` per crossing in the home region, `stray` elsewhere
//     (from where they began: bells 3 out, the chain 8 out straight-line). The same seeded roll as before decides, so inside its
//     home a set holds every crossing it held before and more.
//   - A thread keeps its band and the story budget (threads.ts): exactly the same crossings hold a thread piece, at the same
//     density; only which thread a slot offers changes. A thread at home there weighs `homeWeight` times its usual share.
//   - The Torn Pages were already regional (each Reading's page lies in that Reading); their hint names where each missing
//     Reading lies. The far threads (band `beyond`) have no home: past 1000 the far realms are their region.
// A crossing is pinned to a region version the first time its dungeon history is pinned (game.ts pinDungeonLayout,
// `regionVersion`): one generated, visited or pinned before keeps version 0 and exactly what it offered. `live` gates the
// pin: while false no crossing is pinned to version 1 and every placement is exactly as before. Never edit a home now it is
// live; a new home is a new version.
export const ARCANA_REGIONS = {
  version: 1, live: true, homeWeight: 8,
  headings: { e: 0, ne: 45, n: 90, nw: 135, w: 180, sw: -135, s: -90, se: -45 },
  words: { n: "north", ne: "north-east", e: "east", se: "south-east", s: "south", sw: "south-west", w: "west", nw: "north-west" },
  sets: {
    bells: { toward: "sw", from: 25, to: 50, home: .2, stray: .02 },
    surveyor: { toward: "ne", from: 18, to: 45, home: .2, stray: .02 },
    lamplighter: { toward: "s", from: 3, to: 18 },
    letters: { toward: "w", from: 3, to: 12 },
    ferry: { toward: "n", from: 7, to: 18 }, // the Ferry Reaches
    choir: { toward: "e", from: 19, to: 35 }, // the Autumn Galleries
    clockmaker: { toward: "n", from: 19, to: 35 }, // the Long Table
    orchard: { toward: "w", from: 19, to: 35 }, // the Ash Orchards
    moth: { toward: "e", from: 36, to: 70 },
    library: { toward: "s", from: 36, to: 70 },
    cartographer: { toward: "n", from: 36, to: 150 },
    sleeper: { toward: "w", from: 36, to: 150 },
    beekeeper: { toward: "e", from: 3, to: 18 }, // the Clear Country's fields
    toolmaker: { toward: "w", from: 7, to: 24 }, // the Whetstone Hills
    tollKeys: { toward: "s", from: 19, to: 40 }, // the Low Rooms
    wellDigger: { toward: "n", from: 36, to: 80 },
    weaver: { toward: "w", from: 36, to: 80 },
    mirror: { toward: "e", from: 36, to: 80 },
    washing: { toward: "se", from: 12, to: 30 }, // the Washing at Sallowby (story version 6, 2026-11-21): between the Fevered Stairs and the Clear Country
    turves: { toward: "nw", from: 22, to: 48 }, // the Turves of Scarrow Moss (story version 8, 2026-11-26): between the Long Table and the Ash Orchards; to 48 straight-line so the whole home lies inside the far band (70 walked) even on the diagonal
  },
};
// Whether section (rx, ry) lies in set `id`'s home (false for a set with none).
// Region version 2 (journey-start.ts START_FRAME.regionVersion): on a journey created at start version 1 the section is first
// turned into the journey's frame, so every home turns together (the bells stay opposite the chain). `frame` defaults to the
// journey in play; the identity frame is the rule of every other journey.
export function inArcanaHome(id, rx, ry, frame = activeFrame()) {
  const h = ARCANA_REGIONS.sets[id], [x, y] = toFrame(frame, rx, ry), d = Math.hypot(x, y); // straight-line from the Refuge
  if (!h || d < h.from || d > h.to || !d) return false;
  const a = Math.atan2(-y, x) * 180 / Math.PI, off = Math.abs((((a - ARCANA_REGIONS.headings[h.toward]) % 360) + 540) % 360 - 180); // north is up the Atlas (ry < 0)
  return off <= 45 + 1e-9;
}
// The chance of a set with its own roll (bells, surveyor) in a crossing at (rx, ry) at region version 1.
export const arcanaRate = (id, rx, ry, frame = IDENTITY_FRAME) => { const h = ARCANA_REGIONS.sets[id]; return inArcanaHome(id, rx, ry, frame) ? h.home : h.stray; };
// The frame a crossing's region version asks with: the journey's (frameFor(seed)) from region version 2, else the identity.
export const regionFrame = (seed, region) => (Number(region) >= START_FRAME.regionVersion ? frameFor(seed) : IDENTITY_FRAME);
// A set's home bearing on this journey (its `toward`, turned by the frame).
export const arcanaToward = (id, frame = activeFrame()) => { const h = ARCANA_REGIONS.sets[id]; return h ? turnBearing(frame, h.toward) : null; };
// Where the rest of a set most likely lie, in words: "south-west of the Refuge, 25 to 50 sections out". Null with no home.
// The words read from the turned sector on a start-1 journey (`frame`, the journey in play by default).
export function arcanaHint(id, frame = activeFrame()) { const h = ARCANA_REGIONS.sets[id]; return h ? `${ARCANA_REGIONS.words[arcanaToward(id, frame)]} of the Refuge, ${h.from} to ${h.to} sections out` : null; }
// The region version a crossing's history takes the first time it is pinned: 0 for one generated, visited or pinned before
// (or while the regions are not live), else the current version: 1, or 2 on a journey created at start version 1 (`start`,
// save.progression.start: its homes are turned). Never changes once set.
export const regionVersionFor = (seenBefore, live = ARCANA_REGIONS.live, start = 0) => !seenBefore && live ? (Number(start) >= START_FRAME.version ? START_FRAME.regionVersion : ARCANA_REGIONS.version) : 0;
// A crossing's region version, as pinned (0 when missing).
export const regionVersionOf = (save, dungeonId) => { const v = Number(save?.consequences?.dungeons?.[dungeonId]?.regionVersion); return Number.isInteger(v) && v > 0 ? v : 0; };
// Where a Reading lies, as a region: its compass quarter (none for the Smoke Meadows and the Far Sleep, which ring the Refuge) and
// its stretch of distance. The Torn Pages' hint names these for the pages still missing.
export function readingRegion(id) {
  if (id === "longCampaign") return { toward: null, from: 0, to: READING_BANDS.campaign };
  if (id === "dreamlands") return { toward: null, from: READING_BANDS.far + 1, to: null };
  for (const [band, qs] of Object.entries(QUARTERS)) for (const [q, r] of Object.entries(qs)) if (r === id) return band === "middle" ? { toward: q, from: READING_BANDS.campaign + 1, to: READING_BANDS.middle } : { toward: q, from: READING_BANDS.middle + 1, to: READING_BANDS.far };
  return null;
}
export function readingRegionHint(id, frame = activeFrame()) {
  const r = readingRegion(id); if (!r) return null;
  if (!r.toward) return r.to === null ? `every way, ${r.from} sections out and more` : `every way, within ${r.to} sections of the Refuge`;
  return `${ARCANA_REGIONS.words[turnBearing(frame, r.toward)]}, ${r.from} to ${r.to} sections out`;
}

// Arcana unlocks (2026-11-11; Tim: "don't invent lots of new passives"; the Seven Bells give a bell toll, the Lamplighter's Round
// a bigger light radius; then, of tying the other sets to things now given freely: "leave them as free for now, we can come back
// to this later"). Nothing is locked anywhere: these are the two passives a journey earns, every journey (one from before
// included), by finishing their set. Each entry: `kind`, `name`, `from` (the set whose completion earns it), `text`. Earned ones
// are kept in save.arcana.unlocked. A `gated` flag a save may carry from a preview build is ignored.
export const ARCANA_UNLOCKS = {
  "passive:bell-toll": { kind: "passive", name: "Bell Toll", from: "bells", text: "A heavy blow tolls like a cracked bell: every foe near it reels." },
  "passive:lamplight": { kind: "passive", name: "Lamplighter's Light", from: "lamplighter", text: "Whatever light you see by reaches farther into the dark." },
};
// The new passives' numbers (Tim chose both): Bell Toll on a heavy blow (one that takes at least `share` of the foe's health,
// and at least `minDamage`), at most once every `cooldown` s, stuns foes within `radius` tiles (bosses and elites `bossShare` of
// it); Lamplighter's Light lengthens any light radius (the labyrinths' sight, a lantern's reach): radius * `mult` + `add`.
export const ARCANA_PASSIVES = {
  "bell-toll": { share: .2, minDamage: 12, cooldown: 4, radius: 2.4, stun: .5, bossShare: .25 },
  lamplight: { mult: 1, add: 2 },
};
const arcanaState = (save) => (save?.arcana && typeof save.arcana === "object" ? save.arcana : null);
// Whether the unlock has been earned on this journey.
export const arcanaHas = (save, id) => arcanaState(save)?.unlocked?.[id] === true;
// Any light radius, with Lamplighter's Light once earned (labyrinths' sight; the lantern may read it too).
export function lightRadius(save, base) { const L = ARCANA_PASSIVES.lamplight; return arcanaHas(save, "passive:lamplight") ? base * L.mult + L.add : base; }
// Normalises save.arcana (additive at schema 14; absent stays absent; unknown fields and unknown unlock ids are kept).
export function ensureArcanaState(save) {
  if (save.arcana === undefined) return save;
  const a = save.arcana && typeof save.arcana === "object" && !Array.isArray(save.arcana) ? save.arcana : {};
  const unlocked = Object.fromEntries(Object.entries(a.unlocked && typeof a.unlocked === "object" ? a.unlocked : {}).filter(([, v]) => v === true));
  save.arcana = { ...a, unlocked }; // an old `gated` flag is kept as it was, and read by nothing
  if (a.starter !== undefined && !["set", "done"].includes(a.starter)) delete save.arcana.starter;
  return save;
}

// The Wayfarer as the thing the Corridor fears (Tim, 2026-11-15; docs/narrative-bible.md section 1). An undercurrent, never the
// theme: most things still fight, most people treat the Wayfarer as anyone else, and nothing here explains itself. Three seams:
//   speech   now and then a traveller, a reciter or a hamlet's folk lowers their voice and speaks of a figure who keeps coming back
//            (HUSHED_LINES). Each speaker at most once, a share of meetings (`speech`), the roll hashed from the seed, the speaker's
//            id and how often they have been spoken to; no line repeats until all are heard (save.lore.hushed, a bitset).
//   glimpse  a rare Glimpse ("The Shutter", glimpses.ts, place "returning") seen through the eyes of one of the Corridor's own,
//            watching the road at night as a figure walks out of the Wayglass. Offered on entering a crossing, once the Wayfarer
//            has died `glimpse.deaths` times, at `glimpse.chance` (hashed per crossing); seen once.
//   cower    a few lesser creatures (`cower.kinds`: the chance each one that notices the Wayfarer has of cowering) hesitate or
//            flee for a moment instead of closing in, likelier as the Wayfarer grows (`cower.levels`). Never rats (`cower.never`),
//            never bosses, elites, world beasts, guardians or anything enemy-behaviour.ts does not count as ordinary; at most one
//            at a time on the board and then none for `cower.cooldown` s, so no pack ever empties; struck, it fights.
// Version-pinned like everything that changes what a place offers: a section first seen from now on carries `wayfarerDreadVersion` on its
// Atlas entry, a crossing first entered from now on on its history (game.ts); ground explored before keeps none, and there nobody
// hushes, no creature cowers and the Glimpse is not offered.
export const WAYFARER_DREAD = {
  version: 1,
  speech: { traveler: .02, reciter: .016, villager: .024 }, // Tim 2026-11-19: "even less, maybe 2%" (was .05/.04/.06, same proportions)
  glimpse: { id: "theShutter", deaths: 3, chance: .1 },
  cower: {
    // kind: [chance on noticing, at full strength; "flee" | "hesitate"]
    kinds: {
      pallidCrawler: [.08, "flee"], gloomwisp: [.07, "flee"], ashling: [.05, "hesitate"], glassMite: [.05, "flee"], slateRook: [.04, "flee"],
      shardling: [.05, "hesitate"], cinderWisp: [.05, "flee"], veilMoth: [.05, "flee"], groveMoth: [.05, "flee"], crystalCrab: [.04, "hesitate"],
      ashenHound: [.03, "hesitate"],
    },
    // [from level, multiplier]: the last row at or below the Wayfarer's level applies
    levels: [[1, .3], [10, .55], [20, .8], [35, 1], [50, 1.25]],
    never: /(^rat|Rat)/, // rats are never afraid
    time: { flee: [1.4, 2.4], hesitate: [.8, 1.4] },
    speed: { flee: 1.15, hesitate: .3 }, // tiles a second, away from the Wayfarer
    far: 7, // a fleeing creature stops this far off
    cooldown: 25, // seconds after one cowers before another may
  },
};
// Original lines: quiet, in no one book's voice, of a figure the speaker does not see is standing in front of them.
export const HUSHED_LINES = [
  "Keep your voice down. There is one who walks back out of the dark. Every time.",
  "Don't say its name. It hasn't got one. That's the trouble.",
  "They buried it at the ford. By morning the Wayglass was lit again.",
  "We bar the door when the Wayglass hums at night. Someone always comes out of it.",
  "The hounds won't go past the cairn now. Something came through that they remember.",
  "No one walks out of the deep crossings. Except the one. Over and over.",
  "If you meet the one who comes back, be civil. The things that weren't are not here.",
  "The little ones under the stones go still when it passes. So do I.",
  "Some say it's a saint. Some say the other thing. It paid for its bread.",
  "My grandmother said there is one thing in the Corridor no one ever wrote down. It walks.",
  "They say the great beasts fell, out past the far towns. They say it was only one, walking.",
  "It came through here once, with its face covered. The birds were quiet for a week.",
  "Hush. It might be near. Forgive me. You've a kind face, what I can see of it.",
  "Everything out there is afraid of something. I keep wondering what it's afraid of.",
];
export const HUSHED_WARDEN_LINES = [
  "We hold this gate against everything that walks. Nearly everything.",
  "Captain says if the masked one comes, open the gate and stand aside. So we would.",
];
const dreadLevel = (level) => { let m = 0; for (const [from, k] of WAYFARER_DREAD.cower.levels) if ((Number(level) || 1) >= from) m = k; return m; };
// Is the dread live at this place: the version pinned on its Atlas entry or its crossing's history (0 or missing: not).
export const dreadLive = (version) => Number(version) >= WAYFARER_DREAD.version;
// Who may hush: travellers (not the wandering cartographer or the Elders), reciters, and a hamlet's folk and wardens. Named people
// (the cook, the farmer, the quarry keeper, the cairn keeper, Ilse) keep their own words.
export function hushedSpeaker(o) {
  if (!o || o.hushed) return null;
  if (o.kind === "traveler") return o.elder || o.wanderer ? null : o.reciter ? "reciter" : "traveler";
  if (o.kind === "villager" && !o.talkKey && !o.cook && !o.cairnKeeper && String(o.settlement || "").startsWith("hamlet-")) return "villager";
  return null;
}
// Whether this speaker hushes the `n`th time they are spoken to (hashed from the seed and their id: the same journey, place and
// speaker always answer the same way). False where the dread is not live.
export function hushesNow(seed, o, n, version) {
  const role = hushedSpeaker(o);
  if (!role || !dreadLive(version)) return false;
  return (hashSeed(`${seed}:hushed:v${WAYFARER_DREAD.version}:${o.id || o.name}:${n}`) % 10000) / 10000 < WAYFARER_DREAD.speech[role];
}
// The hushed line: an unheard one first (a hashed choice), recorded in save.lore.hushed; once all are heard, any. Wardens have their own.
export function hushedLine(save, o, n) {
  ensureLore(save);
  if (o.guard) return HUSHED_WARDEN_LINES[hashSeed(`${save.seed}:hushed-warden:${o.id}`) % HUSHED_WARDEN_LINES.length];
  const heard = save.lore.hushed || "", fresh = [];
  for (let i = 0; i < HUSHED_LINES.length; i++) if (!bitGet(heard, i)) fresh.push(i);
  const pool = fresh.length ? fresh : HUSHED_LINES.map((_, i) => i), at = pool[hashSeed(`${save.seed}:hushed-line:${o.id || o.name}:${n}`) % pool.length];
  save.lore.hushed = bitSet(heard, at);
  return HUSHED_LINES[at];
}
// A speaker's hushed speech, or null when they speak as usual this time. Each hushes at most once (`o.hushed`).
export function hushedSpeech(save, o, version) {
  if (!hushedSpeaker(o)) return null;
  const n = (Number(o.hushTalk) || 0) + 1; o.hushTalk = n;
  if (!hushesNow(save.seed, o, n, version)) return null;
  o.hushed = true;
  const line = hushedLine(save, o, n);
  if (o.reciter) return `${o.name} breaks off, and says more quietly: “${line}”`;
  return `${o.name}${o.role ? ` (${o.role})` : ""}, lowering their voice: “${line}”`;
}
// The chance a creature that has just noticed the Wayfarer cowers instead (0 for nearly everything). `ordinary` is whether
// enemy-behaviour.ts counts it as an ordinary creature (bosses, elites, world beasts, guardians and the like are not).
export function cowerChance(e, level, ordinary = true) {
  const C = WAYFARER_DREAD.cower;
  if (!e || !ordinary || e.dead || C.never.test(String(e.kind || ""))) return 0;
  if (e.boss || e.eliteId || e.elite || e.worldBeast || e.questingBeast || e.dungeonRole || e.packGuardian || e.gatePredator || e.marginWarden || e.pentBoss || e.farArrayBoss || e.buildingGuardian) return 0;
  const row = C.kinds[e.kind];
  return row ? row[0] * dreadLevel(level) : 0;
}
// Whether this creature cowers (hashed from its id: the same creature always chooses the same), and how: null, or { mode, time }.
export function cowerRoll(e, level, ordinary = true) {
  const p = cowerChance(e, level, ordinary);
  if (!(p > 0) || (hashSeed(`${e.id}:dread:v${WAYFARER_DREAD.version}`) % 10000) / 10000 >= p) return null;
  const mode = WAYFARER_DREAD.cower.kinds[e.kind][1], [lo, hi] = WAYFARER_DREAD.cower.time[mode];
  return { mode, time: lo + (hashSeed(`${e.id}:dread-time`) % 1000) / 1000 * (hi - lo) };
}
// Whether entering a crossing here offers the Glimpse of the one who keeps returning (hashed per crossing and the deaths so far).
export function dreadGlimpseOffered(seed, crossingId, deaths, version) {
  const G = WAYFARER_DREAD.glimpse;
  if (!dreadLive(version) || !((Number(deaths) || 0) >= G.deaths)) return false;
  return (hashSeed(`${seed}:dread-glimpse:v${WAYFARER_DREAD.version}:${crossingId}:${deaths}`) % 10000) / 10000 < G.chance;
}
