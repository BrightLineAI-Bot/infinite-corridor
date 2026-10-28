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
import { hashSeed } from "./random.js?v=r521-6e1f2ceeb0b6";

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
