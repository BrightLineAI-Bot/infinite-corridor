// The Readings (release 191; docs/narrative-bible.md). The overworld is divided into Readings: distance bands around
// Ember Refuge crossed with compass quarters. In each, people speak in the voice of one book already in the library
// (src/recitations.ts), and each Reading has a book of 20 pieces in the Reciter's Tome. A Reading whose pieces are all
// found is mastered. Lines a player has heard are remembered (one bitset per voice), so nobody repeats a line until
// that voice is exhausted. Pure data and rules: no DOM, no randomness beyond the seeded `pick` passed in.
import { RECITATIONS } from "./recitations.ts";

export const LORE_VERSION = 1;
// Distance bands, in sections from the origin (|rx| + |ry|).
export const READING_BANDS = { campaign: 6, middle: 18, far: 35 };
// Each Reading: its name, the book it speaks, and its voices (reciter ids with the share of their lines that belong to
// this Reading; the Second Campaign hears the later half of War and Peace, the Long Campaign the earlier).
export const READINGS = {
  longCampaign: { name: "The Long Campaign", book: "War and Peace", voices: [["pierre", 0, .5], ["andrew", 0, .5], ["natasha", 0, .5], ["kutuzov", 0, 1], ["denisov", 0, 1], ["dolokhov", 0, 1]] },
  riverThatRemembers: { name: "The River That Remembers", book: "Siddhartha", voices: [["siddhartha", 0, 1]] },
  transparentEye: { name: "The Transparent Eye", book: "Nature and Self-Reliance", voices: [["nature", 0, 1], ["selfreliance", 0, 1]] },
  yellowCity: { name: "The Yellow City", book: "Crime and Punishment", voices: [["raskolnikov", 0, 1], ["porfiry", 0, 1], ["svidrigailov", 0, 1]] },
  pathAlone: { name: "The Path Walked Alone", book: "Dokkōdō", voices: [["musashi", 0, 1]] },
  threeBrothers: { name: "The Monastery of Three Brothers", book: "The Brothers Karamazov", voices: [["alyosha", 0, 1], ["ivan", 0, 1], ["mitya", 0, 1]] },
  bookOfImages: { name: "The Book of Images", book: "The Book of Images", voices: [["rilke", 0, 1]] },
  underTheFloor: { name: "Under the Floor", book: "Notes from Underground and The Idiot", voices: [["underground", 0, 1], ["myshkin", 0, 1]] },
  secondCampaign: { name: "The Second Campaign", book: "War and Peace, years later", voices: [["pierre", .5, 1], ["natasha", .5, 1], ["andrew", .5, 1]] },
  dreamlands: { name: "The Dreamlands", book: "The Randolph Carter Stories", voices: [["silverkey", 0, 1]] },
};
export const READING_ORDER = ["longCampaign", "riverThatRemembers", "transparentEye", "yellowCity", "pathAlone", "threeBrothers", "bookOfImages", "underTheFloor", "secondCampaign", "dreamlands"];
const QUARTERS = { middle: { n: "riverThatRemembers", e: "transparentEye", s: "yellowCity", w: "pathAlone" }, far: { n: "threeBrothers", e: "bookOfImages", s: "underTheFloor", w: "secondCampaign" } };
// The 20 pieces of every book: 8 voices (passages anyone in the Reading may speak), 3 recitations (the Reading's first
// reciter: a beginning, a turning point and an ending), 4 Glimpses, 4 margins (in crossings) and the last page. Glimpses,
// margins and the last page arrive in later releases; their ids are fixed now so saved progress never shifts.
export const BOOK_PIECES = { voice: 8, recite: 3, glimpse: 4, margin: 4, last: 1 };
export const BOOK_SIZE = Object.values(BOOK_PIECES).reduce((a, b) => a + b, 0);

export function readingAt(rx, ry) {
  const x = Number(rx) || 0, y = Number(ry) || 0, depth = Math.abs(x) + Math.abs(y);
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
  const [rid, ra, rb] = ranges[0], recites = [ra, Math.floor((ra + rb) / 2), rb - 1], taken = new Set(recites.map((l) => `${rid}:${l}`));
  // A voice piece that lands on a recitation piece (or another voice piece) moves to the next free line of its range.
  for (let i = 0; i < BOOK_PIECES.voice; i++) {
    const [id, a, b] = ranges[i % ranges.length], k = Math.floor(i / ranges.length), per = Math.ceil(BOOK_PIECES.voice / ranges.length);
    let at = Math.min(b - 1, a + Math.floor((b - a) * (k + .5) / per));
    for (let step = 0; taken.has(`${id}:${at}`) && step < b - a; step++) at = at + 1 < b ? at + 1 : a;
    taken.add(`${id}:${at}`); pieces.push({ id: `voice:${i}`, kind: "voice", voice: id, line: at });
  }
  recites.forEach((line, i) => pieces.push({ id: `recite:${i}`, kind: "recite", voice: rid, line }));
  for (let i = 0; i < BOOK_PIECES.glimpse; i++) pieces.push({ id: `glimpse:${i}`, kind: "glimpse" });
  for (let i = 0; i < BOOK_PIECES.margin; i++) pieces.push({ id: `margin:${i}`, kind: "margin" });
  pieces.push({ id: "last:0", kind: "last" });
  pieceCache.set(readingId, pieces);
  return pieces;
}

// Save: { v, heard: { voiceId: hex bitset }, pieces: { readingId: [pieceId] }, entered: { readingId: true } }.
export function ensureLore(s) {
  const l = s.lore && typeof s.lore === "object" ? s.lore : {}, heard = {}, pieces = {}, entered = {};
  for (const [id, hex] of Object.entries(l.heard || {})) if (RECITATIONS[id] && typeof hex === "string" && /^[0-9a-f]*$/.test(hex)) heard[id] = hex;
  for (const [id, list] of Object.entries(l.pieces || {})) if (READINGS[id] && Array.isArray(list)) { const known = new Set(bookPieces(id).map((p) => p.id)); pieces[id] = [...new Set(list.filter((p) => known.has(p)))]; }
  for (const id of Object.keys(l.entered || {})) if (READINGS[id] && l.entered[id]) entered[id] = true;
  s.lore = { ...l, v: LORE_VERSION, heard, pieces, entered };
  return s;
}
function bitGet(hex, i) { const c = parseInt(hex[i >> 2] || "0", 16); return (c >> (i & 3)) & 1; }
function bitSet(hex, i) { const at = i >> 2, s = hex.padEnd(at + 1, "0"), c = parseInt(s[at], 16) | (1 << (i & 3)); return s.slice(0, at) + c.toString(16) + s.slice(at + 1); }
export function heardLine(save, voice, i) { return !!bitGet(save.lore?.heard?.[voice] || "", i); }
// Records a line as heard and credits any book piece it completes. Returns the newly found piece, if any.
// Recitation pieces count only when a reciter speaks them (`reciter: true`).
export function hearLine(save, voice, i, { reciter = false } = {}) {
  ensureLore(save); save.lore.heard[voice] = bitSet(save.lore.heard[voice] || "", i);
  for (const readingId of READING_ORDER) for (const p of bookPieces(readingId)) if (p.voice === voice && p.line === i && (p.kind === "voice" || (reciter && p.kind === "recite"))) { const list = save.lore.pieces[readingId] ||= []; if (!list.includes(p.id)) { list.push(p.id); return { readingId, piece: p }; } }
  return null;
}
export function bookProgress(save, readingId) { const found = save.lore?.pieces?.[readingId]?.length || 0; return { found, total: BOOK_SIZE, mastered: found >= BOOK_SIZE }; }
// First entry into a Reading: returns its name once, then null.
export function enterReading(save, rx, ry) {
  ensureLore(save); const id = readingAt(rx, ry);
  if (save.lore.entered[id]) return null;
  save.lore.entered[id] = true; return { id, name: READINGS[id].name };
}
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
