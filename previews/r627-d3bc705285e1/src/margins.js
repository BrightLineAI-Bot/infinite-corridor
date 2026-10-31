// Margins in crossings (release 455; docs/narrative-bible.md section 2, "Margins: inscriptions, objects or Glimpses inside
// the region's crossings", and section 7, step 6). "The dungeons are the margins: beneath the text and outside it."
//
// Some ordinary crossings (a seeded `chance` per crossing) hold a line of the Reading's book cut into the stone, with a
// note beside it in a reader's hand. Which margin of the Reading it is comes from the crossing's seed, so a crossing
// holds the same one until it is read (after that, an unread one of the same Reading). Reading it credits that Reading's margin fragment (lore.ts `margin:i`, ids fixed since
// release 191) and keeps it in the Journal. The passage is a public-domain line already in the library (recitations.ts),
// chosen per margin, never per crossing; the notes are original writing for the game. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r627-d3bc705285e1";
import { READINGS, readingAt, readingLines, bookPieces, creditPiece, ensureLore } from "./lore.js?v=r627-d3bc705285e1";
import { RECITATIONS } from "./recitations.js?v=r627-d3bc705285e1";

export const MARGINS = { chance: .2, minFromEntry: 5, maxPassage: 220 };
// The notes, one per margin fragment of each Reading (counts match READINGS[id].pieces.margin). Each is [the words that
// find its line in the Reading's own book, the note written beside that line].
export const MARGIN_NOTES = {
  longCampaign: [
    ["die, waiting", "A year, she says, and calls it impossible. I have waited longer than a year down here. It is possible. It is only awful."],
    ["A letter from", "Everyone in this book is waiting for a letter. I copied this one out so that someone, somewhere, would have one."],
    ["Patience and time", "Underlined twice, by two different pencils. Neither of us knew the other was reading."],
    ["going to the war", "Nobody in the book can answer her. I went anyway, and I cannot answer her either."],
    ["fire and water", "I copied this out by a fire that was mostly smoke. Forgive the hand. It was cold, and the line was warm."],
  ],
  riverThatRemembers: [
    ["something special to tell him", "The river says nothing here either. I listened until the stone was dry."],
    ["neither fasting, nor waiting", "He lost the fasting, the waiting and the thinking. I only ever had the waiting. I am not sure I have that now."],
    ["never came back", "Someone has crossed this out and written it again underneath, exactly the same."],
  ],
  transparentEye: [
    ["health of the eye", "There is no horizon down here. Beside the line, someone has scratched one in, very straight, all the way across the stone."],
    ["eye is the best composer", "Read this standing up. It does not work sitting down."],
    ["animal eye sees", "I saw only outlines down here for a long time. Then the colours came back, one at a time."],
  ],
  yellowCity: [
    ["Behind the door", "Count the steps to your own door. He did. I have too. There is always one more than last time."],
    ["alone, alone, alone", "Underlined so hard the pencil went through. Then, smaller, in another hand: \"You are not.\""],
    ["sick to death of you", "Fever makes everything yellow. I wrote this in a yellow room."],
    ["floors have been washed", "Someone has written a confession here and then scraped out the name."],
    ["Who is a murderer", "He did not mean it, and he did. Both are underlined."],
  ],
  pathAlone: [
    ["Think little of yourself", "Twenty-one rules. I kept four. The fifth kept me."],
    ["comfort for its own sake", "He never slept in the same place twice. I am trying. The Corridor helps."],
  ],
  threeBrothers: [
    ["you have forgiven him already", "I would forgive him. No one has asked me to."],
    ["how will all this horror end", "Three hands in this margin, arguing. One of them is very young."],
    ["Inquisitor does not believe", "Everyone is answerable for everyone, the elder said. Then who am I answerable for, down here?"],
    ["She is a child", "There are children in every chapter, and someone always has to say so. Here it was me."],
    ["Forgive me at parting", "Everyone in this house asks to be forgiven on the way out. I never had the chance to ask."],
    ["am I a murderer", "Under the line, small: \"He didn't. He wanted to. Is that the same?\""],
  ],
  bookOfImages: [
    ["step out of your room", "I did. I stepped out of my room, and the room did not wait for me."],
    ["last one before the distance", "Every image here is a window. I looked through one and someone looked back."],
    ["one black tree", "Autumn on every page. The leaves on this stone are carved, and they are still falling."],
  ],
  underTheFloor: [
    ["I am a sick man", "A sick man wrote this, and a sick man wrote this note. We have never met. We have the same handwriting."],
    ["from spite", "Spite, underlined. Then, much smaller: \"I am sorry.\""],
    ["genuinely touched and penitent", "He wept, and knew he was lying, and was not lying. I have done that. The stone has not."],
    ["twice two makes four", "And yet. The rest of the margin is only the words \"and yet\", over and over."],
    ["means the stone wall", "I have walked into this wall so often that it has my shape now."],
  ],
  secondCampaign: [
    ["To be a soldier", "Years later. The same names, older. I have read it twice, and I am older too."],
    ["a child in that house", "Whoever wrote this note was crying, and then, further down the page, was not."],
    ["if you only knew how happy I am", "Peace is the longer half. Nobody marks it. I have marked every page."],
  ],
  dreamlands: [
    ["flight of stone steps", "I counted the steps down into sleep. There was one more than the book said."],
    ["great silver key handed down", "The key is silver and very old. It opens nothing here. It opens here."],
    ["never dreamed of this", "Someone wrote: \"Wake up.\" Under it, in the same hand: \"Not yet.\""],
    ["much of the speech of cats", "A cat sat on this page while I read it. The cat was not from this world, or I was not."],
    ["sunset city", "I dreamed the city before I read of it. The book is wrong about the colour of the sunset."],
    ["seventh of October", "The hand in this margin changes as you read it. The date beside it does too."],
  ],
};
// The book's line a margin quotes: the first short line of the Reading holding the note's words (case aside), or, should
// the library change, a short line chosen by a fixed hash.
export function marginPassage(readingId, i) {
  const lines = readingLines(readingId).map(([v, n]) => RECITATIONS[v]?.[n] || "").filter((t) => t && t.length <= MARGINS.maxPassage);
  if (!lines.length) return "";
  const find = String(MARGIN_NOTES[readingId]?.[i]?.[0] || "").toLowerCase();
  return (find && lines.find((t) => t.toLowerCase().includes(find))) || lines[hashSeed(`margin-passage:v1:${readingId}:${i}`) % lines.length];
}
const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
// Which margin a crossing holds: { readingId, index } or null. Only ordinary crossings; any distance.
export function marginIn(seed, dungeonId) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return null;
  const readingId = readingAt(Number(m[1]), Number(m[2])), count = READINGS[readingId]?.pieces?.margin || 0; if (!count) return null;
  const h = hashSeed(`${seed}:margins:v1:${dungeonId}`);
  return (h % 10000) / 10000 < MARGINS.chance ? { readingId, index: (h >>> 11) % count } : null;
}
const pieceOf = (readingId, index) => bookPieces(readingId).find((p) => p.id === `margin:${index}`);
export const marginRead = (save, readingId, index) => !!save?.lore?.pieces?.[readingId]?.includes(`margin:${index}`);
// Cuts the crossing's margin into open floor away from the entry. Returns the object or null.
export function addMargin(map, save, dungeonId) {
  if (!map?.tiles?.length || map.multiLevel || map.arena || map.underwater || map.objects?.some((o) => o.kind === "marginNote")) return null;
  const at0 = marginIn(save?.seed, dungeonId); if (!at0) return null;
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= MARGINS.minFromEntry && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|void|Gate/i.test(String(t.kind)));
  if (!open.length) return null;
  // The crossing's own margin, unless it is already read and another of the Reading's is not: then the first unread one,
  // so every margin of a Reading can be found however the crossings fall.
  const count = READINGS[at0.readingId].pieces.margin, unread = Array.from({ length: count }, (_, i) => i).find((i) => !marginRead(save, at0.readingId, i));
  const index = marginRead(save, at0.readingId, at0.index) && unread !== undefined ? unread : at0.index;
  const t = open[hashSeed(`${save.seed}:margins-at:v1:${dungeonId}`) % open.length], read = marginRead(save, at0.readingId, index);
  const o = { id: `margin-${at0.readingId}-${index}`, kind: "marginNote", readingId: at0.readingId, margin: index, name: "Writing in the stone", x: t.x, y: t.y, state: read ? "read" : "unread", actions: ["read"] };
  (map.objects ||= []).push(o); return o;
}
// Reading it: the line and the note; the first time, the Reading's margin fragment. Returns { ok, message, first, credit }.
export function readMargin(save, o) {
  const note = MARGIN_NOTES[o?.readingId]?.[o?.margin]?.[1], passage = marginPassage(o?.readingId, o?.margin);
  if (!note) return { ok: false, message: "The stone is worn smooth here." };
  ensureLore(save); const first = !marginRead(save, o.readingId, o.margin), credit = first ? creditPiece(save, o.readingId, pieceOf(o.readingId, o.margin)) : null;
  o.state = "read";
  return { ok: true, first, credit, message: `Cut into the stone: “${passage}” Beside it, in a smaller hand: “${note}”` };
}
