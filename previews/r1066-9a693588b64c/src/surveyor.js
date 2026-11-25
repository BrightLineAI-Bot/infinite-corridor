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
import { hashSeed } from "./random.js?v=r1066-9a693588b64c";
import { arcanaRate, regionVersionOf, regionFrame } from "./lore.js?v=r1066-9a693588b64c";

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
// Whether a crossing holds a link (before the Wayfarer takes it): ordinary crossings, `minRing` sections out or more. `region`
// is the crossing's region version (lore.ts ARCANA_REGIONS): from 1 the same roll is made against the chain's home rate
// (north-east, 18 to 45 out) or its stray rate elsewhere; 0, the default, is the rule every crossing pinned before keeps.
export function surveyorCrossing(seed, dungeonId, region = 0) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return false;
  const rx = Number(m[1]), ry = Number(m[2]); if (Math.hypot(rx, ry) < SURVEYOR.minRing) return false;
  return (hashSeed(`${seed}:surveyor:v1:${dungeonId}`) % 10000) / 10000 < (region >= 1 ? arcanaRate("surveyor", rx, ry, regionFrame(seed, region)) : SURVEYOR.chance);
}
// Lays the crossing's link on open floor away from the entry. Returns the object or null.
// 2026-11-19 (first-hour fixes): the link lies only where the Wayfarer can walk to it from the entry with the real step rules
// (surveyorReach: short of any sealed gate, never across lethal ground or a drop too high to climb). The spot the rule before
// chose (legacySpot) is kept wherever it is reachable, so a link already lying in a crossing stays where it was; only a link that
// could never be reached, or a crossing that held none (a deep or many-levelled crossing: on its entry level), gains a new spot.
export function addSurveyorLink(map, save, dungeonId) {
  if (!map?.tiles?.length || map.arena || map.underwater || map.objects?.some((o) => o.kind === "surveyorLink")) return null;
  if (map.multiLevel && map.levels?.length && map.levelId !== map.levels[0].id) return null; // a deep crossing: on its entry level only
  if (!surveyorCrossing(save?.seed, dungeonId, regionVersionOf(save, dungeonId)) && !starterLink(save, dungeonId)) return null; // 2026-11-11: or the Cairn Keeper's errand
  const s = ensureSurveyor(save); if (Object.values(s.where).includes(dungeonId) || nextLink(s) === undefined) return null;
  const t = surveyorSpot(map, save, dungeonId); if (!t) return null;
  const o = { id: "surveyor-link", kind: "surveyorLink", name: "A link of surveyor's chain", x: t.x, y: t.y, state: "lying", actions: ["take"] };
  (map.objects ||= []).push(o); return o;
}
const SPOT_SHUN = /water|lava|pit|void|Gate|Stair/i; // reachable ground only (surveyorReach already shuns lethal kinds); not on a stair or a gate
// Where the link lies: the earlier rule's spot if the Wayfarer can reach it, else a seeded spot among the reachable floor (away from
// the entry if it can be, plain floor before themed ground). Null where nothing reachable is fit to hold it.
export function surveyorSpot(map, save, dungeonId, legacyOk = true) {
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const reach = surveyorReach(map), ok = (t) => !!t && reach.has(t.y * w + t.x);
  const legacy = map.multiLevel || !legacyOk ? null : legacySpot(map, save, dungeonId, w, entry, taken); if (legacy && ok(legacy)) return legacy;
  const fit = map.tiles.filter((t) => ok(t) && !t.structure && t.x > 1 && t.y > 1 && t.x < w - 2 && !taken.has(`${t.x},${t.y}`) && !SPOT_SHUN.test(String(t.kind)));
  const far = (t) => Math.hypot(t.x - entry.x, t.y - entry.y) >= SURVEYOR.minFromEntry, near = (t) => Math.hypot(t.x - entry.x, t.y - entry.y) >= 2;
  const pool = [(t) => far(t) && !t.environment, far, (t) => near(t) && !t.environment, near].map((f) => fit.filter(f)).find((l) => l.length);
  return pool ? pool[hashSeed(`${save.seed}:surveyor-at:v2:${dungeonId}`) % pool.length] : null;
}
// After the rest of the floor is laid (game.ts loadArea: a cistern's pool can close a way after the link was placed), a lying link
// the Wayfarer can no longer walk to moves to a reachable spot. Returns the link if it moved, else null.
export function resettleSurveyorLink(map, save, dungeonId) {
  const o = map?.objects?.find((q) => q.kind === "surveyorLink" && q.state !== "taken"); if (!o || !map.tiles?.length) return null;
  const w = map.width || 24; if (surveyorReach(map).has(Math.round(o.y) * w + Math.round(o.x))) return null;
  map.objects = map.objects.filter((q) => q !== o); const t = surveyorSpot(map, save, dungeonId, false); map.objects.push(o);
  if (!t) return null; o.x = t.x; o.y = t.y; return o;
}
// The spot the rule before 2026-11-19 chose (kept unchanged so links already lying in crossings do not move).
function legacySpot(map, save, dungeonId, w, entry, taken) {
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= SURVEYOR.minFromEntry && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|void|Gate/i.test(String(t.kind)));
  return open.length ? open[hashSeed(`${save.seed}:surveyor-at:v1:${dungeonId}`) % open.length] : null;
}
// The floor the Wayfarer can walk to from the entry: open, not lethal or a pit, each step one the Wayfarer can take on foot (a jump
// of one level up, any drop that is not lethal). A set of tile indexes.
const WALKER = Object.freeze({ isPlayer: true, jumping: true });
export function surveyorReach(map) {
  const w = map.width || 24, h = Math.floor(map.tiles.length / w), out = new Set();
  const open = (t) => !!t && !t.blocked && !t.pit && !t.perch && !LETHAL_KINDS.has(t.kind);
  const e = map.entry || { x: 4, y: 5 }, ex = Math.round(Number(e.x)), ey = Math.round(Number(e.y)), q = [];
  for (const [dx, dy] of [[0, 0], [0, -1], [1, 0], [-1, 0], [0, 1]]) { const x = ex + dx, y = ey + dy; if (x >= 0 && y >= 0 && x < w && y < h && open(map.tiles[y * w + x])) { out.add(y * w + x); q.push(y * w + x); break; } }
  for (let i = 0; i < q.length; i++) {
    const k = q[i], x = k % w, y = (k - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || out.has(n) || !open(map.tiles[n]) || !canStep(WALKER, map, w, x, y, nx, ny)) continue;
      out.add(n); q.push(n);
    }
  }
  return out;
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
import { FAR_SLEEP_DEPTH, LETHAL_KINDS, canStep, farSleepSection } from "./landscape.js?v=r1066-9a693588b64c";
import { saveFrame, toFrame, turnSection } from "./journey-start.js?v=r1066-9a693588b64c";

export const SURVEYOR_STATUE_LINES = [
  "A man in a surveyor's coat, kneeling, carved from the same pale stone as the Far Sleep's terraces. One end of a brass chain is pinned under his boot; the rest runs up along his arm to the hand that holds it, the way you hold a chain to read a length.",
  "Scratched into the plinth, in the cramped hand from the folded pages: \"Ninety-nine links. I have measured everything else. This is the last length: myself, from the boot to the hand. It is longer than it was this morning. Write it down.\"",
  "Someone has. Below it, in many other hands, a column of numbers runs down the stone and on into the grass, each one more than the last.",
];
export const surveyorComplete = (save) => ensureSurveyor(save).links.length >= SURVEYOR.links;
// The section a link's crossing opens from: any crossing the errand's first link can lie in (2026-11-19: the Refuge's own is 0, 0).
const SECTION_OF = /^dungeon:.+:g\d+(?::(-?\d+):(-?\d+):(?:deep-v2:)?[^:]+)?$/;
const sectionOf = (dungeonId) => { const m = SECTION_OF.exec(String(dungeonId || "")); return m ? { rx: Number(m[1] || 0), ry: Number(m[2] || 0) } : null; };
// Where the statue stands: recorded the first time it is asked for once the chain is complete.
export function surveyorStatueSection(save) {
  const s = ensureSurveyor(save); if (s.links.length < SURVEYOR.links) return null;
  if (s.statue && Number.isInteger(s.statue.rx) && Number.isInteger(s.statue.ry)) return s.statue;
  let at = sectionOf(s.where[SURVEYOR.links - 1]) || [...s.links].reverse().map((i) => sectionOf(s.where[i])).find(Boolean);
  const frame = saveFrame(save);
  if (!frame.identity) { s.statue = turnedStatue(save, at, frame); return s.statue; }
  if (!at || (!at.rx && !at.ry)) { const h = hashSeed(`${save.seed}:surveyor-statue:v1`); at = { rx: h % 2 ? 1 : -1, ry: (h >>> 1) % 2 ? 1 : -1 }; }
  const depth = FAR_SLEEP_DEPTH + 1, d = Math.abs(at.rx) + Math.abs(at.ry), rx = Math.round(at.rx * depth / d), ry = (at.ry < 0 || (!at.ry && at.rx < 0) ? -1 : 1) * (depth - Math.abs(rx));
  s.statue = { rx, ry }; return s.statue;
}
// Progression Phase 2: on a journey created at start version 1 (journey-start.ts) the same rule is asked in the journey's frame:
// the last link's bearing is turned into the frame (with no link bearing, the seeded diagonal is a diagonal of the frame), the
// statue's section on the fixed diamond is found there, and turned back onto the journey's grid. A section the rounding leaves
// on the near side of the turned edge steps one section further out along the line (bounded), so the statue always stands on
// the Far Sleep's turned edge.
function turnedStatue(save, at, frame) {
  let [x, y] = at && (at.rx || at.ry) ? toFrame(frame, at.rx, at.ry) : [0, 0];
  if (!x && !y) { const h = hashSeed(`${save.seed}:surveyor-statue:v1`); x = h % 2 ? 1 : -1; y = (h >>> 1) % 2 ? 1 : -1; }
  const depth = FAR_SLEEP_DEPTH + 1, d = Math.abs(x) + Math.abs(y);
  for (let k = 0; k < 8; k++) {
    const cx = x * (depth + k) / d, cy = y * (depth + k) / d, t = turnSection(frame, cx, cy);
    if (farSleepSection(t.rx, t.ry, frame)) return t;
  }
  return turnSection(frame, x * (depth + 8) / d, y * (depth + 8) / d);
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

// The Cairn Keeper (2026-11-11; Tim: a first quest from the Refuge: "you meet someone who sets you on a thread, the first
// dungeon gives the first item... and the Journal guidance leads on"). At Ember Refuge, beside the cairn where Abel Corwin
// drove his first peg, an old woman keeps the stones. Speaking with her sets the errand (save.arcana.starter = "set"): the first
// crossing entered after it (the Refuge's own included, 2026-11-19) holds the chain's first link, wherever it lies, while no link is found. She unlocks nothing
// (Tim, 2026-11-11: what was free stays free for now); once the link is taken her next words point the way the rest went (the
// chain's home). On every journey she stands there; on one that has found a link she only talks.
export const CAIRN_KEEPER = { id: "cairn-keeper", name: "Maud Fennick", role: "Cairn Keeper", near: { x: 4, y: 9 } };
export const CAIRN_LINES = {
  first: [
    "\"That cairn is where Abel Corwin drove his first peg. He measured from here to the black stone, and every day it was longer, and he never once said he was wrong.\"",
    "\"He went out with a chain of a hundred links and dropped them one to a crossing, so somebody could measure him. Go into the first crossing you come to. One will be lying there. Don't bring it back to me. Keep it.\"",
  ],
  waiting: "\"The first crossing you go into. It'll be on the floor, worn bright on one side, where his thumb was.\"",
  after: (where) => `"So it was there. The rest went the way he did: ${where}. He never came back for them. You might."`,
  // Exploration (docs/progression-design.md 4.1, Phase 4): her errand said plainly, with no riddle first; and, while it waits,
  // where the compass leads. Classic keeps the lines above.
  plain: {
    first: "\"Levels'll make you sturdier, and Sela will teach you what the Refuge knows. Everything strange is out there: in the crossings, in what people dropped, in places nobody's walked. Go into the first crossing you find. There'll be a piece of chain on the floor. Keep it.\"",
    waiting: "\"The first crossing you go into. Your compass points to the nearest one. The link will be on the floor. Keep it.\"",
  },
  idle: [
    "\"I count the stones every morning. There's always the same number. I count them anyway.\"",
    "\"People ask what the cairn marks. The start, I tell them. Of what, they say. Of measuring.\"",
    "\"Everything out there is a little longer than it was. Walk it anyway. Legs don't know.\"",
  ],
};
// Stands her at the Refuge (section 0,0), by the cairn at its west edge: open ground nearest `near` (off the first screen, so
// the Refuge as it is first seen is unchanged). Returns the object or null.
export function addCairnKeeper(map, rx, ry) {
  if (rx !== 0 || ry !== 0 || !map?.tiles?.length || map.objects?.some((o) => o.id === CAIRN_KEEPER.id)) return null;
  const w = map.width || 32, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), N = CAIRN_KEEPER.near;
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.buildingId && t.x > 2 && t.y > 2 && t.x < w - 3 && t.y < w - 3 && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|canyon|void|shallows|dock|Wall|wall/.test(String(t.kind)) && !/Wall|Door/.test(String(t.structure || "")));
  if (!open.length) return null;
  const t = open.reduce((a, b) => (Math.hypot(b.x - N.x, b.y - N.y) < Math.hypot(a.x - N.x, a.y - N.y) ? b : a));
  const o = { id: CAIRN_KEEPER.id, kind: "villager", name: CAIRN_KEEPER.name, role: CAIRN_KEEPER.role, line: "", x: t.x, y: t.y, state: "calm", actions: ["speak"], settlement: "ember-refuge", cairnKeeper: true };
  (map.objects ||= []).push(o); return o;
}
// Speaking with her. `where` is the chain's home in words. Returns { ok, message, started }.
// `plain` (an Exploration journey): the errand in plain words (CAIRN_LINES.plain). An idle line is marked `idle` (a rumour may
// take its place, leads.ts).
export function speakCairnKeeper(save, o, where = "out past the black stone", { plain = false } = {}) {
  const a = (save.arcana && typeof save.arcana === "object" ? save.arcana : (save.arcana = {})), found = ensureSurveyor(save).links.length;
  if (!found && a.starter !== "set") { a.starter = "set"; if (o) o.line = plain ? CAIRN_LINES.plain.first : CAIRN_LINES.first[1]; return { ok: true, started: true, message: plain ? CAIRN_LINES.plain.first : CAIRN_LINES.first.join(" ") }; }
  if (!found) return { ok: true, message: plain ? CAIRN_LINES.plain.waiting : CAIRN_LINES.waiting };
  if (a.starter === "set") { a.starter = "done"; return { ok: true, message: CAIRN_LINES.after(where) }; }
  a.talks = (Math.floor(Number(a.talks)) || 0) + 1;
  return a.talks % 2 ? { ok: true, message: CAIRN_LINES.after(where) } : { ok: true, idle: true, message: CAIRN_LINES.idle[Math.floor(a.talks / 2) % CAIRN_LINES.idle.length] };
}
// The errand's first link: while it is set and no link is found, any crossing entered from the land holds one: an ordinary
// crossing, a deep one (deep-v1, deep-v2:<archetype>), a canopy crossing, and (2026-11-19) the Refuge's own crossing
// (`dungeon:<seed>:g<n>`), the first one most Wayfarers come to; Maud's "the first crossing you come to" meant it too.
export const starterCrossing = (dungeonId) => SECTION_OF.test(String(dungeonId || ""));
const starterLink = (save, dungeonId) => save?.arcana?.starter === "set" && starterCrossing(dungeonId) && !ensureSurveyor(save).links.length;
