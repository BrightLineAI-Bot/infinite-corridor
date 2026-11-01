// The Torn Pages (release 595; docs/narrative-bible.md section 6, thread 3, and section 7, step 6): "Each region's deepest
// crossing holds a page torn from the Reciter's Tome. The pages belong to a book with no title. When all are found, the Tome
// gains a last book: blank, except that it slowly fills with the Wayfarer's own Journal. The Corridor has begun to read you."
//
// One page for each Reading (lore.ts READINGS). Some ordinary crossings (`chance`, by seed, `minDepth` or more from the
// Refuge) hold a torn page; the page is always the one of the Reading the crossing lies in, so no page is ever stranded in one
// crossing (Tim, 2026-10-29: pieces "shouldn't just be trapped in specific dungeons"): any page crossing of that Reading offers
// it until it is found. A crossing where a page was found keeps it, read (save.lore.pages: { readingId: dungeonId }; additive,
// normalised here). Deeper crossings hold pages more often (`deepBonus` per band). Not listed among the Journal's Active quests
// (Tim, release 581); each page read is written in the Journal, and the Reciter's Tome keeps the book with no title (main.ts).
// All writing is original to the game. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r691-59f9af35d115";
import { READINGS, READING_ORDER, READING_BANDS, readingAt } from "./lore.js?v=r691-59f9af35d115";

export const TORN_PAGES = { chance: .06, deepBonus: .02, minDepth: 2, title: "A book with no title" };
// What each page says. A page never names the book it was torn from, nor the Reading's book.
export const PAGE_TEXT = {
  longCampaign: "…and the soldiers who came back said the road home was shorter than the road out, though it was the same road. Nobody argued. Whoever writes this has begun to suspect that roads are not measured in versts but in what you carry along them, and that",
  riverThatRemembers: "…the ferryman will not take a fare from anyone who has crossed before. He says the river keeps a list. Whoever writes this asked to see the list and was shown the river. It went on being a river. It took a long time to understand that this was the answer, and",
  transparentEye: "…stood in a bare field at evening and became, for a moment, nothing at all, only something that was seeing. Whoever writes this would like to report that it was frightening. It was not. It was like being forgiven by the weather, and then",
  yellowCity: "…counted the stairs again, and there was one more than the night before. Whoever writes this does not believe that stairs grow. Whoever writes this believes that something climbs them at night, and that each time it comes a little nearer to the door, and that the door",
  pathAlone: "…put down the sword and the hand still knew its shape. Whoever writes this has walked a long way to learn to want nothing, and has learned instead to want only this: one more morning with nothing to defend, a cold stream, a stone to sit on, and",
  threeBrothers: "…three of them at one table, and the fourth chair pulled out for someone who did not come. They talked across the empty place all night as though it could hear them. Whoever writes this sat in that chair once. It was warm. Someone had only just",
  bookOfImages: "…the leaves are letters, and the autumn reads them aloud one at a time as they fall. Whoever writes this has tried to catch one before it lands, to keep a single word, but each one turns in the air and lies down blank, and the tree goes on",
  underTheFloor: "…under the boards, in the narrow place, someone has been talking to himself for forty years, and the house has grown around his voice like a tree around a nail. Whoever writes this lifted one board and the talking stopped, and in the silence something",
  secondCampaign: "…years later the orchard was planted on the field, and the apples there are bitter, and the children eat them anyway. Whoever writes this walked between the rows and could not find where the trenches had been. That is what peace is. It forgets on purpose, so that",
  dreamlands: "…the stair goes down seventy steps to the shallow sleep and seven hundred more to the deep, and at the bottom there is a city of sunset that the dreamer built as a boy and forgot. Whoever writes this has reached the bottom. The city is real. It is waiting. It is reading",
};
export const PAGES_FINAL = "The last torn page fits against the others, and the edges meet. Together they make no sense, and then they do: every page was written by someone walking the Corridor, and every one breaks off just as it is about to describe the one who is reading it. At the back of the Reciter's Tome there is a new book now. Its pages are blank, except where they are slowly filling, in a hand very like yours, with everything you have done.";

const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
// The pages found, in Reading order.
export function pagesFound(save) { const p = save?.lore?.pages; return READING_ORDER.filter((id) => p && typeof p === "object" && typeof p[id] === "string"); }
// Which Reading's page lies in this crossing, or null.
export function pageIn(seed, dungeonId) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return null;
  const rx = Number(m[1]), ry = Number(m[2]), depth = Math.abs(rx) + Math.abs(ry); if (depth < TORN_PAGES.minDepth) return null;
  const band = depth > READING_BANDS.far ? 3 : depth > READING_BANDS.middle ? 2 : depth > READING_BANDS.campaign ? 1 : 0;
  return (hashSeed(`${seed}:torn-pages:v1:${dungeonId}`) % 10000) / 10000 < TORN_PAGES.chance + TORN_PAGES.deepBonus * band ? readingAt(rx, ry) : null;
}
// Normalises lore.pages ({ readingId: dungeonId }); absent stays absent.
export function ensurePageState(save) {
  const lore = (save.lore ||= {});
  if (lore.pages !== undefined) { const at = {}; for (const [id, where] of Object.entries(lore.pages && typeof lore.pages === "object" ? lore.pages : {})) if (READINGS[id] && typeof where === "string") at[id] = where; lore.pages = at; }
  return save;
}
// Lays the crossing's page on open floor away from the entry: unread while its Reading's page is missing, read where it was
// found, nothing in a page crossing whose page was found elsewhere. Returns the object or null.
export function addTornPage(map, save, dungeonId) {
  if (!map?.tiles?.length || map.multiLevel || map.arena || map.underwater || map.objects?.some((o) => o.kind === "tornPage")) return null;
  const reading = pageIn(save?.seed, dungeonId); if (!reading) return null;
  const where = save?.lore?.pages?.[reading]; if (where && where !== dungeonId) return null;
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && !t.chasm && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= 6 && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|canyon|void|Gate/i.test(String(t.kind)));
  if (!open.length) return null;
  const at = open[hashSeed(`${save.seed}:torn-pages-at:v1:${dungeonId}`) % open.length], read = !!where;
  const o = { id: `torn-page-${reading}`, kind: "tornPage", reading, name: read ? "A torn page, read" : "A torn page", x: at.x, y: at.y, dungeonId, state: read ? "read" : "waiting", actions: ["read"] };
  (map.objects ||= []).push(o); return o;
}
// Reading it. Returns { ok, first, done, message, text }.
export function readTornPage(save, o) {
  const text = PAGE_TEXT[o?.reading]; if (!text) return { ok: false, message: "The paper is blank." };
  save.lore ||= {}; ensurePageState(save); const pages = (save.lore.pages ||= {}), first = !pages[o.reading];
  if (first) pages[o.reading] = o.dungeonId || ""; o.state = "read"; o.name = "A torn page, read";
  const n = pagesFound(save).length, total = READING_ORDER.length, done = first && n >= total;
  return { ok: true, first, done, text, message: `A page torn from a book with no title. "${text}…" The page ends there.${first ? (done ? ` ${PAGES_FINAL}` : ` (${n} of ${total} pages.)`) : ""}` };
}
