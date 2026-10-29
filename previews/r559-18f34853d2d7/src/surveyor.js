// The Surveyor's Chain, part one (release 505; docs/narrative-bible.md section 6, thread 2: "Abel Corwin's lost chain-links
// lie in dungeons; each comes with a page of his notes. With all twelve links, the last dungeon's map turns out to be the
// overworld. The thread ends at his statue"; section 4: "He measures the Corridor with a chain and keeps finding it longer
// than yesterday... the measurements grow wrong in an orderly way").
//
// Some ordinary crossings in the middle and far bands (`minRing` sections or more from the Refuge, a seeded `chance` per
// crossing) hold one of Corwin's chain-links on the floor, away from the entry. Taking it gives the next link the Wayfarer has
// not found (so the notes read in order however the crossings fall) and its page of notes, kept in the Journal. A crossing
// gives at most one link. Part two (his statue at the edge of the Far Sleep, and the last map) is still to come.
// State: save.lore.surveyor = { links: [index...], where: { index: dungeonId } } (additive; ensureSurveyor). Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r559-18f34853d2d7";

export const SURVEYOR = { links: 12, chance: .14, minRing: 8, minFromEntry: 6 };
// His field notes, one per link, in the order they are found. Original writing for the game. The lengths of the same
// section grow by one more chain each time than the time before: 32, 33, 35, 38, 42, 47, 53, 60, 68, 77, 87, 98.
export const SURVEYOR_NOTES = [
  "Day the first. The section from the Refuge cairn to the black stone: thirty-two chains, near enough. I drove a peg at each end. Good ground. Honest ground.",
  "The same section, between the same pegs: thirty-three chains. I have a cold, and a cold makes a man count twice. I measured again. Thirty-three.",
  "Thirty-five. The pegs have not moved; I tied string between them. The chain is the chain: a hundred links, sixty-six feet, checked against my own boot. Something in between has grown.",
  "Thirty-eight. It grows by one more each time than the time before. I find I am relieved. A thing that grows in order can be written down.",
  "Forty-two. I have stopped calling it error. Error wanders. This walks.",
  "Forty-seven. A Wayfarer passed me at the black stone and asked what I was measuring. I said the distance. She asked: between what? I could not remember the first peg.",
  "Fifty-three. I lost a link in the last crossing. The chain is ninety-nine now, and I add one at the end of every length. The Corridor does not seem to mind. Neither, I find, do I.",
  "Sixty. I measured the crossing I slept in, to have one thing that would hold still. It did not. The rooms are longer at night.",
  "Sixty-eight. I have begun to leave the links behind me on purpose, one to a crossing, so that someone can measure me.",
  "Seventy-seven. My boots are the wrong size. I checked them against the chain, the chain against the boots, both against my hand. My hand is longer than it was.",
  "Eighty-seven. I have drawn every crossing I mapped onto one sheet, the way a surveyor should. The sheet is the shape of something. I will not write down what.",
  "Ninety-eight. The last link, and the last length. I measured the ground I came in by, the first section at the Refuge cairn, and found it exactly as long as everything I have measured since, put together. Lay the links end to end, whoever you are, and look at what they draw.",
];
export const SURVEYOR_LENGTHS = [32, 33, 35, 38, 42, 47, 53, 60, 68, 77, 87, 98];

export function ensureSurveyor(save) {
  const lore = (save.lore ||= {}), raw = lore.surveyor && typeof lore.surveyor === "object" ? lore.surveyor : {};
  const links = [...new Set((Array.isArray(raw.links) ? raw.links : []).map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < SURVEYOR.links))].sort((a, b) => a - b);
  const where = {}; for (const [k, v] of Object.entries(raw.where && typeof raw.where === "object" ? raw.where : {})) if (links.includes(Number(k)) && typeof v === "string") where[k] = v;
  lore.surveyor = { ...raw, links, where };
  return lore.surveyor;
}
export const surveyorFound = (save) => ensureSurveyor(save).links.length;
const nextLink = (s) => Array.from({ length: SURVEYOR.links }, (_, i) => i).find((i) => !s.links.includes(i));
const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
// Whether a crossing holds a link (before the Wayfarer takes it): ordinary crossings, `minRing` sections out or more.
export function surveyorCrossing(seed, dungeonId) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return false;
  if (Math.hypot(Number(m[1]), Number(m[2])) < SURVEYOR.minRing) return false;
  return (hashSeed(`${seed}:surveyor:v1:${dungeonId}`) % 10000) / 10000 < SURVEYOR.chance;
}
// Lays the crossing's link on open floor away from the entry. Returns the object or null.
export function addSurveyorLink(map, save, dungeonId) {
  if (!map?.tiles?.length || map.multiLevel || map.arena || map.underwater || map.objects?.some((o) => o.kind === "surveyorLink")) return null;
  if (!surveyorCrossing(save?.seed, dungeonId)) return null;
  const s = ensureSurveyor(save); if (Object.values(s.where).includes(dungeonId) || nextLink(s) === undefined) return null;
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= SURVEYOR.minFromEntry && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|void|Gate/i.test(String(t.kind)));
  if (!open.length) return null;
  const t = open[hashSeed(`${save.seed}:surveyor-at:v1:${dungeonId}`) % open.length];
  const o = { id: "surveyor-link", kind: "surveyorLink", name: "A link of surveyor's chain", x: t.x, y: t.y, state: "lying", actions: ["take"] };
  (map.objects ||= []).push(o); return o;
}
// Taking it: the next link and its page of notes. Returns { ok, index, message, note, total }.
export function takeSurveyorLink(save, o, dungeonId) {
  const s = ensureSurveyor(save), index = nextLink(s);
  if (o?.state === "taken" || index === undefined) return { ok: false, message: "Only the mark of a chain in the dust." };
  s.links = [...s.links, index].sort((a, b) => a - b); s.where[index] = String(dungeonId || ""); o.state = "taken"; o.actions = [];
  const total = s.links.length;
  return { ok: true, index, total, note: SURVEYOR_NOTES[index], message: `A brass chain-link, worn bright on one side, and a folded page in a cramped hand: "${SURVEYOR_NOTES[index]}" (Abel Corwin's chain: ${total} of ${SURVEYOR.links} links.)` };
}

// The Surveyor's Chain, part two (release 551; docs/narrative-bible.md section 6, thread 2: "With all twelve links, the last
// dungeon's map turns out to be the overworld. The thread ends at his statue"; section 4: "At the end he is found as a statue
// at the edge of the Far Sleep, measuring himself").
//
// With all twelve links, the crossings they came from are the map: the Atlas joins them, in the order the links were found,
// into one brass chain that runs on to the edge of the Far Sleep (`surveyorChainPath`). There, on the first section past
// FAR_SLEEP_DEPTH along the line from the Refuge through the crossing of the twelfth link, stands his statue
// (`surveyorStatueSection`, recorded once as save.lore.surveyor.statue so it never moves). Touching it closes the thread
// (`statueSeen`). Original writing for the game.
import { FAR_SLEEP_DEPTH } from "./landscape.js?v=r559-18f34853d2d7";

export const SURVEYOR_STATUE_LINES = [
  "A man in a surveyor's coat, kneeling, carved from the same pale stone as the Far Sleep's terraces. One end of a brass chain is pinned under his boot; the rest runs up along his arm to the hand that holds it, the way you hold a chain to read a length.",
  "Scratched into the plinth, in the cramped hand from the folded pages: \"Ninety-nine links. I have measured everything else. This is the last length: myself, from the boot to the hand. It is longer than it was this morning. Write it down.\"",
  "Someone has. Below it, in many other hands, a column of numbers runs down the stone and on into the grass, each one more than the last.",
];
export const surveyorComplete = (save) => ensureSurveyor(save).links.length >= SURVEYOR.links;
const sectionOf = (dungeonId) => { const m = ORDINARY.exec(String(dungeonId || "")); return m ? { rx: Number(m[1]), ry: Number(m[2]) } : null; };
// Where the statue stands: recorded the first time it is asked for once the chain is complete.
export function surveyorStatueSection(save) {
  const s = ensureSurveyor(save); if (s.links.length < SURVEYOR.links) return null;
  if (s.statue && Number.isInteger(s.statue.rx) && Number.isInteger(s.statue.ry)) return s.statue;
  let at = sectionOf(s.where[SURVEYOR.links - 1]) || [...s.links].reverse().map((i) => sectionOf(s.where[i])).find(Boolean);
  if (!at || (!at.rx && !at.ry)) { const h = hashSeed(`${save.seed}:surveyor-statue:v1`); at = { rx: h % 2 ? 1 : -1, ry: (h >>> 1) % 2 ? 1 : -1 }; }
  const depth = FAR_SLEEP_DEPTH + 1, d = Math.abs(at.rx) + Math.abs(at.ry), rx = Math.round(at.rx * depth / d), ry = (at.ry < 0 || (!at.ry && at.rx < 0) ? -1 : 1) * (depth - Math.abs(rx));
  s.statue = { rx, ry }; return s.statue;
}
// The chain on the Atlas: the crossings in link order, then the statue. Empty until all twelve are found.
export function surveyorChainPath(save) {
  if (!surveyorComplete(save)) return [];
  const s = ensureSurveyor(save), path = s.links.map((i) => sectionOf(s.where[i])).filter(Boolean), statue = surveyorStatueSection(save);
  return statue ? [...path, statue] : path;
}
// Raises the statue on its section of the overworld (open ground nearest the middle). Returns the object or null.
export function addSurveyorStatue(map, save, rx, ry) {
  const at = surveyorStatueSection(save); if (!at || at.rx !== rx || at.ry !== ry || !map?.tiles?.length || map.objects?.some((o) => o.kind === "surveyorStatue")) return null;
  const w = map.width || 32, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && !t.buildingId && t.x > 2 && t.y > 2 && t.x < w - 3 && t.y < w - 3 && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|void|shallows|dock/i.test(String(t.kind)));
  if (!open.length) return null;
  const t = open.sort((a, b) => Math.hypot(a.x - w / 2, a.y - w / 2) - Math.hypot(b.x - w / 2, b.y - w / 2))[0];
  const o = { id: "surveyor-statue", kind: "surveyorStatue", name: "Abel Corwin", x: t.x, y: t.y, state: ensureSurveyor(save).statueSeen ? "seen" : "standing", actions: ["inspect"], landmark: true };
  (map.objects ||= []).push(o); return o;
}
// Touching it. Returns { ok, first, message }.
export function visitSurveyorStatue(save, o) {
  const s = ensureSurveyor(save), first = !s.statueSeen; s.statueSeen = true; if (o) o.state = "seen";
  return { ok: true, first, message: SURVEYOR_STATUE_LINES.join(" ") };
}
