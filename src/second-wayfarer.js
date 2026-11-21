// The Second Wayfarer (docs/narrative-bible.md section 4, recurring character 4: "Someone dressed as you, always a section ahead.
// Seen at a distance; their footprints sometimes appear in dungeons. Never met until very late, if ever"; section 6, item 9).
//
// A trail told across one crossing and six sections of the overworld. In a crossing first entered from story version
// `storyVersion` on (threads.ts STORY_BUDGET; the crossing's history pins it), `minDepth` or more sections walked from the Refuge,
// where no thread piece lies (threads.ts threadIn), footprints in the dust go in ahead of you, at `footprintChance` by seed, until
// the trail is begun. Reading them begins it: the wall where they end names a section. There, far off at the edge of the section,
// someone dressed as you is walking away; where they stood they have left something, and a note naming the next section, a
// few sections farther out (`step`, `wander`). The sixth is the last. Each sighting's section is worked out once, from the seed
// and the section before, and kept in the save (save.lore.second.trail), so the trail never moves. The things left lie on open
// ground near the edge of the section toward the next (`edge`); a section with no open ground (open sea) passes its sighting
// on arrival. Found in order, never stranded: the trail asks for no particular crossing after the first, only sections.
//
// Who she is (never said outright): Wenna Callow, who sold lamp oil at Larrow Ford, bought a suit like the Wayfarer's
// second-hand, and from then on everyone she met thanked her for what the Wayfarer had done. She carried their thanks a section
// ahead, kept it, and set it down, and at the last section she is found dead, laid out beside the folded suit, under a note in blood
// in a hand that does not know what letters are (Tim, 2026-11-19): who wrote it is never said. All writing is original to the game. Pure rules: no DOM.
// Save: save.lore.second = { begun: dungeonId, trail: [{ rx, ry }], found: n, passed: [i], spot?: { i, x, y } } (additive, created when the
// trail begins; normalised by ensureSecondWayfarer, unknown fields kept).
import { hashSeed } from "./random.js?v=r1050-2ea30cdbc905";
import { regionVersionOf } from "./lore.js?v=r1050-2ea30cdbc905";
import { threadIn, storyVersionOf } from "./threads.js?v=r1050-2ea30cdbc905";

export const SECOND_WAYFARER = {
  storyVersion: 5,       // crossings pinned at this story version or later may hold the footprints (threads.ts STORY_BUDGET)
  footprintChance: .04,  // a crossing's chance of the footprints, where no thread piece lies, until the trail is begun
  minDepth: 12,          // sections walked (|rx| + |ry|) from the Refuge
  sightings: 6,
  step: { min: 3, max: 6 }, // how many sections farther each sighting lies
  wander: .7,            // radians either side of straight out from the Refuge
  edge: 4,               // the things left lie this many tiles in from the edge of the section, toward the next
  fromEntry: 6,          // the footprints end at least this far from a crossing's entry
  title: "The Second Wayfarer",
};

export const SECOND_FOOTPRINTS = {
  read: (at) => `Footprints in the dust, going in ahead of you: the same tread as your boots, though the stride is a little shorter. They do not come back out. Where they end, someone has scratched on the wall at the height of a hand, the way travellers mark a section: ${at.rx}, ${at.ry}. Under it, smaller, as if added later: "Tell them I am not who they think."`,
  again: "Your own footprints now, over theirs. You can no longer tell which are which.",
};
// Seen on coming into a sighting's section, before its trace is read: one line for each sighting, in order.
export const SECOND_SIGHTINGS = [
  "Far off, at the edge of this section, someone dressed as you is walking away. Not hurrying. A rise of ground takes them, and when it clears there is no one.",
  "Someone in a suit like yours stands at the far edge of the section with a traveller, who keeps bowing. Then they go on, and the traveller looks your way, puzzled, as if he has counted you twice.",
  "You see them only for a moment, at the far edge: the same mask, the same green-grey cloth, a pack heavier than yours.",
  "At the far edge someone dressed as you sits on a stone, eating, the mask pushed up. They see you, pull it down, and go.",
  "They are at the edge of the section with a child, who is holding something out. They take it, touch the child's head, and go on. Once they look back: not at you, but past you, at the way you came.",
  "No one at the edge of the section. Only a thin line of smoke from a fire someone has just put out.",
];
// What was left at each sighting. `at` is the next section; the last names none.
export const SECOND_TRACES = [
  (at) => `A fire banked so it will keep till morning, the ashes still warm. On a flat stone beside it, half a honey cake in a clean cloth and a scrap of paper under a pebble: "From the woman at the mill, for the one in the mask who carried her husband out. That was not me. I ate half before I knew. The rest is yours." Scratched on the stone: ${at.rx}, ${at.ry}.`,
  (at) => `A blue ribbon, the kind a child wears to a fair, tied to a thorn at the height of your shoulder. A note is pinned through it: "A girl gave me this for the hound. I don't know about any hound. I said thank you anyway. You'll know what it was for." Under it, in the same hand: ${at.rx}, ${at.ry}.`,
  (at) => `A hollow in the grass where someone sat a long while, and a page from a small account book left in it, ruled for lamp oil: Larrow Ford, three pints; the Ferry, two pints. Then the columns change. "Thanked at the ford. Thanked at the crossroads. Given bread at the black stone. None of it mine." At the foot of the page: ${at.rx}, ${at.ry}.`,
  (at) => `A water skin, full, hung on a branch where you would see it. On the leather, in charcoal: "They think I'm you. It's the suit. I bought it off a peddler at Larrow, second-hand, and it fit. Since then nobody looks at my face. They look at the mask, and thank it. It is a strange thing, to be thanked for a life. I have started keeping it for you." Then: ${at.rx}, ${at.ry}.`,
  (at) => `A glove like your own, worn through at two fingers. Inside it, folded small: "A man at the crossroads wouldn't take my money for the bread. He said I'd paid already, a long time ago, in the deep crossings. I have never been in the deep crossings. I don't think anyone has, but you. Some mornings there are footprints round my fire that are not mine, bare, set down too far apart. I thought they were yours. But you wear boots, as I do." And: ${at.rx}, ${at.ry}.`,
  () => `She is lying on her back in the grass, very still: a woman past middle age in a plain brown dress, grey at the temples, her eyes closed. Someone has laid her out, or tried to; her hands are folded on her breast with the fingers laced the wrong way, like a thing copied from a picture. Beside her is a suit of green-grey cloth, folded, the mask laid on top of it face up, and on the mask a small bundle: a child's drawing of a figure in a mask, a wooden horse with one ear, a pressed flower, a button, a lock of grey hair tied with thread. Under the bundle, her last note, in her own hand: "All of it is yours. They gave it to the suit, and the suit was only ever yours. I'm going home to Larrow Ford to sell lamp oil under my own name. If anyone asks, I was never anyone. Wenna Callow." ${SECOND_HAND}`,
];
// The last writing, on the stone at her head (or, where the last sighting is passed at sea, on the boat): the note that ends the
// trail, and its closing line. Who wrote it is never said; it is no one already named in the game.
export const SECOND_LAST_WORDS = "NO ONE IS AHEAD OF YOU NOW";
export const SECOND_HAND = `On a flat stone at her head there is other writing, in blood, dried dark. The hand is wrong. The letters are large and square and pressed hard, each one built from short separate strokes, as if whoever made them had copied their shapes without knowing they were letters, or what a finger was for. The strokes shake, and the lines run uneven, and yet it is careful, almost beautiful, like a first try at something. It says: ${SECOND_LAST_WORDS}. Bare footprints, set down too far apart, lead away from her back the way you came.`;
export const SECOND_ENDING = `A lamp-oil seller from Larrow Ford bought a suit like yours off a peddler, second-hand, and from then on everyone she met thanked her for things you had done: bread at the black stone, a ribbon for a hound, half a honey cake for a man carried out of a crossing. Nobody looked past the mask. She carried their thanks a section ahead of you for a long way, kept it as well as she could, and set it down where you would find it. She meant to go home under her own name. Something walked the last sections behind her, nearer than you were. You leave her as you found her, with what she kept for you, and walk on. The writing goes with you, in that unpractised hand: ${SECOND_LAST_WORDS}.`;
// A sighting whose section has no open ground (open sea): it passes on arrival.
export const SECOND_PASSED = (at) => `Their footprints run down to the water's edge here and do not come up again. Out on the water, small and far, someone in a suit like yours is rowing. The boat turns toward ${at.rx}, ${at.ry}.`;
export const SECOND_PASSED_LAST = `Their footprints run down to the water's edge and do not come up again. Out on the water a small boat turns slowly with no one at the oars. Someone lies in the bottom of it, very still, green-grey cloth folded under her head and a lock of grey hair tied with thread in her hands. Along the near side of the boat, written large in something dark red, in a hand that shakes and does not seem to know what letters are, it says: ${SECOND_LAST_WORDS}.`;

const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
const int = (v) => Number.isInteger(v) ? v : null;
const section = (o) => o && int(o.rx) !== null && int(o.ry) !== null ? { rx: o.rx, ry: o.ry } : null;

// Normalises save.lore.second when present (it is created only when the trail begins), in place. Unknown fields are kept. A trail
// cut short (every section in it counted, the sixth not reached) gains its next section again, from the seed.
export function ensureSecondWayfarer(save) {
  const lore = (save.lore ||= {}); if (lore.second === undefined) return save;
  const s = lore.second && typeof lore.second === "object" && !Array.isArray(lore.second) ? lore.second : (lore.second = {});
  s.trail = (Array.isArray(s.trail) ? s.trail : []).map(section).filter(Boolean).slice(0, SECOND_WAYFARER.sightings);
  s.found = Math.max(0, Math.min(s.trail.length, Math.floor(Number(s.found)) || 0));
  s.passed = [...new Set((Array.isArray(s.passed) ? s.passed : []).filter((i) => Number.isInteger(i) && i >= 0 && i < s.found))].sort((a, b) => a - b);
  s.begun = typeof s.begun === "string" ? s.begun : "";
  if (s.found && s.found === s.trail.length && s.found < SECOND_WAYFARER.sightings) s.trail.push(secondSightingAfter(save.seed, s.trail[s.found - 1], s.found));
  const sp = s.spot; if (sp && Number.isInteger(sp.i) && Number.isInteger(sp.x) && Number.isInteger(sp.y) && sp.i === s.found && s.found < s.trail.length) s.spot = { i: sp.i, x: sp.x, y: sp.y }; else delete s.spot;
  return save;
}
// The trail's state, normalised once (freshSave and migrateSave already have), or null before it is begun.
const state = (save) => { const s = save?.lore?.second; if (s && Array.isArray(s.trail) && Number.isInteger(s.found) && Array.isArray(s.passed)) return s; if (!save || s === undefined) return null; ensureSecondWayfarer(save); return save.lore.second; };
export const secondBegun = (save) => !!state(save)?.trail?.length;
export const secondFound = (save) => state(save)?.found || 0;
export const secondDone = (save) => secondFound(save) >= SECOND_WAYFARER.sightings;
// The section of the next sighting, or null (not begun, or done).
export function secondNext(save) { const s = state(save); return s && s.found < s.trail.length ? s.trail[s.found] : null; }

// The section after `from`, sighting `k` (0-based): `step` sections on, near straight out from the Refuge, `wander` either side.
export function secondSightingAfter(seed, from, k) {
  const h = hashSeed(`${seed}:second-wayfarer:v1:${k}:${from.rx},${from.ry}`), W = SECOND_WAYFARER;
  const base = from.rx || from.ry ? Math.atan2(from.ry, from.rx) : (h % 628) / 100;
  const a = base + (((h >>> 8) % 1000) / 1000 * 2 - 1) * W.wander, d = W.step.min + ((h >>> 18) % (W.step.max - W.step.min + 1));
  let rx = from.rx + Math.round(Math.cos(a) * d), ry = from.ry + Math.round(Math.sin(a) * d);
  if (rx === from.rx && ry === from.ry) rx += Math.cos(a) < 0 ? -1 : 1;
  return { rx, ry };
}
// Whether a crossing holds the footprints (before the trail is begun): ordinary crossings `minDepth` or more out, pinned at story
// version `storyVersion` or later, where no thread piece lies, at `footprintChance` by seed.
export function secondFootprintsIn(seed, dungeonId, version = 0, region = 0) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m || version < SECOND_WAYFARER.storyVersion) return false;
  const rx = Number(m[1]), ry = Number(m[2]); if (Math.abs(rx) + Math.abs(ry) < SECOND_WAYFARER.minDepth) return false;
  if ((hashSeed(`${seed}:second-wayfarer:footprints:v1:${dungeonId}`) % 10000) / 10000 >= SECOND_WAYFARER.footprintChance) return false;
  return !threadIn(seed, dungeonId, version, region);
}
const OPEN_FLOOR = /water|lava|pit|chasm|canyon|void|Gate/i;
// Lays the footprints in a crossing: the crossing where the trail began (read), or, before it is begun, one that holds them.
export function addSecondFootprints(map, save, dungeonId) {
  if (!map?.tiles?.length || map.multiLevel || map.arena || map.underwater || map.objects?.some((o) => o.kind === "secondFootprints")) return null;
  const s = state(save), begunHere = !!s?.trail?.length && s.begun === dungeonId;
  if (!begunHere && (s?.trail?.length || !secondFootprintsIn(save?.seed, dungeonId, storyVersionOf(save, dungeonId), regionVersionOf(save, dungeonId)))) return null;
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && !t.chasm && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= SECOND_WAYFARER.fromEntry && !taken.has(`${t.x},${t.y}`) && !OPEN_FLOOR.test(String(t.kind)));
  if (!open.length) return null;
  const at = open[hashSeed(`${save.seed}:second-wayfarer-at:v1:${dungeonId}`) % open.length];
  const o = { id: "second-footprints", kind: "secondFootprints", name: begunHere ? "Footprints, followed" : "Footprints", x: at.x, y: at.y, dungeonId, state: begunHere ? "read" : "waiting", actions: ["read"] };
  (map.objects ||= []).push(o); return o;
}
// Reading them. The first time, the trail begins (the caller points the compass: types.ts setCompassChoice). Returns
// { ok, begun, message, next }.
export function readSecondFootprints(save, o) {
  if (o?.kind !== "secondFootprints") return { ok: false, message: "Nothing here to follow." };
  const s = state(save);
  if (s?.trail?.length) { if (o) { o.state = "read"; o.name = "Footprints, followed"; } return { ok: true, begun: false, message: SECOND_FOOTPRINTS.again }; }
  const m = ORDINARY.exec(String(o.dungeonId || "")); if (!m) return { ok: false, message: "Only dust." };
  const next = secondSightingAfter(save.seed, { rx: Number(m[1]), ry: Number(m[2]) }, 0);
  save.lore ||= {}; save.lore.second = { ...(save.lore.second && typeof save.lore.second === "object" ? save.lore.second : {}), begun: o.dungeonId, trail: [next], found: 0, passed: [] }; o.state = "read"; o.name = "Footprints, followed";
  return { ok: true, begun: true, next, message: SECOND_FOOTPRINTS.read(next) };
}
// Where a trace lies in its section: open ground nearest a point `edge` tiles in from the edge, toward the next sighting (or, for
// the last, straight on out). Overworld sections only; null when there is no open ground.
function traceSpot(map, from, toward) {
  const w = map.width || 32, E = SECOND_WAYFARER.edge, dx = toward.rx - from.rx, dy = toward.ry - from.ry, len = Math.hypot(dx, dy) || 1, c = (w - 1) / 2;
  const px = c + dx / len * (c - E), py = c + dy / len * (c - E), taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  let best = null, bd = Infinity;
  for (const t of map.tiles) {
    if (t.blocked || t.environment || t.structure || t.buildingId || t.x < 2 || t.y < 2 || t.x > w - 3 || t.y > w - 3 || taken.has(`${t.x},${t.y}`) || /water|lava|pit|chasm|canyon|void|shallows|dock|Wall|wall/.test(String(t.kind))) continue;
    const d = Math.hypot(t.x - px, t.y - py); if (d < bd) { bd = d; best = t; }
  }
  return best;
}
// Coming into a section of the trail on the overworld. Lays every trace read here (read), and the waiting one if this is the next
// sighting's section. Returns { object, sighting, passed } or null: `sighting` is the line seen at a distance as the waiting trace
// is laid (the first time it is laid on this visit); `passed` is set when the next sighting's section has no open ground, in which
// case it is counted on arrival (the caller writes the Journal, as for a trace read).
export function addSecondTrace(map, save, rx, ry) {
  const s = state(save); if (!s?.trail?.length || !map?.tiles?.length) return null;
  let object = null, sighting = null, passed = null;
  s.trail.forEach((at, i) => {
    if (at.rx !== rx || at.ry !== ry || i > s.found || map.objects?.some((o) => o.kind === "secondTrace" && o.index === i)) return;
    const toward = s.trail[i + 1] || { rx: at.rx * 2 || 1, ry: at.ry * 2 }, t = traceSpot(map, at, toward), waiting = i === s.found;
    if (!t) { if (waiting && !passed) passed = passSecondSighting(save, i); return; }
    const o = { id: `second-trace-${i}`, kind: "secondTrace", index: i, name: secondTraceName(i, waiting), x: t.x, y: t.y, state: waiting ? "waiting" : "read", actions: ["read"], landmark: waiting };
    (map.objects ||= []).push(o); if (waiting) { s.spot = { i, x: t.x, y: t.y }; object = o; sighting = SECOND_SIGHTINGS[i] || null; }
  });
  return object || passed ? { object, sighting, passed } : null;
}
// What a trace is called on the ground: the last is her, still in the grass (text only; 2026-11-19).
const secondTraceName = (i, waiting) => i >= SECOND_WAYFARER.sightings - 1 ? (waiting ? "Someone lying still" : "Wenna Callow") : waiting ? "Something left behind" : "What they left";
// Counts sighting `i` and works out the next. Returns { index, total, done, next }.
function advance(save, i) {
  const s = state(save); s.found = i + 1; delete s.spot;
  const done = s.found >= SECOND_WAYFARER.sightings;
  if (!done && s.trail.length <= s.found) s.trail.push(secondSightingAfter(save.seed, s.trail[i], s.found));
  return { index: i, total: s.found, done, next: done ? null : s.trail[s.found] };
}
function passSecondSighting(save, i) {
  const r = advance(save, i), s = state(save); s.passed = [...s.passed.filter((n) => n !== i), i]; const text = secondTraceText(save, i);
  return { ...r, first: true, passed: true, text, message: `${text}${r.done ? ` ${SECOND_ENDING}` : ` (${SECOND_WAYFARER.title}: ${r.total} of ${SECOND_WAYFARER.sightings}.)`}` };
}
// Reading what was left. Returns { ok, first, done, index, text, next, message }.
export function readSecondTrace(save, o) {
  const s = state(save); if (o?.kind !== "secondTrace" || !s?.trail?.length || !Number.isInteger(o.index) || o.index >= SECOND_WAYFARER.sightings) return { ok: false, message: "Nothing here to read." };
  const i = o.index;
  if (i < s.found) { const text = secondTraceText(save, i); return { ok: true, first: false, index: i, text, message: text }; }
  if (i !== s.found) return { ok: false, message: "Nothing here to read." };
  const r = advance(save, i), text = secondTraceText(save, i); o.state = "read"; o.name = secondTraceName(i, false); o.landmark = false;
  return { ok: true, first: true, done: r.done, index: i, next: r.next, text, message: `${text}${r.done ? ` ${SECOND_ENDING}` : ` (${SECOND_WAYFARER.title}: ${r.total} of ${SECOND_WAYFARER.sightings}.)`}` };
}
// The words of trace `i`, naming the section after it (as kept in the trail).
// A sighting passed on arrival (no open ground) reads as the water's edge instead.
export function secondTraceText(save, i) {
  const s = state(save), at = s?.trail?.[i + 1] || { rx: 0, ry: 0 };
  if (s?.passed?.includes(i)) return i >= SECOND_WAYFARER.sightings - 1 ? SECOND_PASSED_LAST : SECOND_PASSED(at);
  const f = SECOND_TRACES[i]; return f ? f(at) : "";
}
// Where the compass points while it follows this trail (types.ts save.guidance.follow { kind: "quest", id: "second" }): the next
// sighting's section, and inside it the waiting trace once it is laid. Null when not begun or done.
export function secondWayfarerTarget(save) {
  const s = state(save), at = secondNext(save); if (!at) return null;
  return { area: "overworld", rx: at.rx, ry: at.ry, ...(s.spot && s.spot.i === s.found ? { x: s.spot.x, y: s.spot.y } : {}), kind: "guidance", name: SECOND_WAYFARER.title };
}
