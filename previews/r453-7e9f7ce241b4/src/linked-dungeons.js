// Linked dungeons (release 217; Tim, 2026-10-19). Some dungeons have two mouths. Their guardian's door (the cleared
// expedition's exit) does not lead back to where you came in: it opens a second mouth in an unexplored section far
// away. The link is remembered, so either mouth enters the same dungeon and its guardian's door then leads to the
// other. The Atlas draws linked mouths joined. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r453-7e9f7ce241b4";
import { LETHAL_KINDS } from "./landscape.js?v=r453-7e9f7ce241b4";

// Balance: the share of dungeons that are linked, and how far the second mouth lies (sections, Chebyshev-ish).
export const LINKED = { version: 1, share: .3, distance: [7, 14] };

// Only ordinary world dungeons link (not hunts, portals, dives, displacement crossings), and only those with a second
// level (Tim: "when you go to the second level and you beat the Guardian"); game.ts checks the levels.
export function isLinkable(id) { return typeof id === "string" && id.startsWith("dungeon:"); }
export function isLinked(save, id) { return isLinkable(id) && (hashSeed(`${save?.seed}:linked:v${LINKED.version}:${id}`) % 1000) / 1000 < LINKED.share; }

// save.linkedDungeons: { dungeonId: { a: {rx, ry, x, y}, b: {rx, ry} } } (additive; normalised here).
export function ensureLinks(save) {
  const out = {}, num = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  for (const [id, l] of Object.entries(save.linkedDungeons || {})) {
    const a = l?.a, b = l?.b;
    if (!isLinkable(id) || num(a?.rx) === null || num(a?.ry) === null || num(b?.rx) === null || num(b?.ry) === null) continue;
    out[id] = { a: { rx: num(a.rx), ry: num(a.ry), x: num(a.x) ?? 16, y: num(a.y) ?? 16 }, b: { rx: num(b.rx), ry: num(b.ry) } };
  }
  save.linkedDungeons = out;
  return save;
}
// Where the second mouth opens: a seeded direction and distance from the first, stepping on outward past any
// section already explored (at most a dozen steps), and never onto Ember Refuge.
export function farMouth(save, id, from) {
  const h = hashSeed(`${save?.seed}:linked-mouth:v${LINKED.version}:${id}`), [lo, hi] = LINKED.distance;
  const angle = (h % 3600) / 3600 * Math.PI * 2, dist = lo + (h >>> 12) % (hi - lo + 1), dx = Math.cos(angle), dy = Math.sin(angle);
  for (let k = 0; k < 12; k++) {
    const d = dist + k * 2, rx = from.rx + Math.round(dx * d), ry = from.ry + Math.round(dy * d);
    if ((rx || ry) && !save.explored?.[`${rx},${ry}`]) return { rx, ry };
  }
  const d = dist + 24; return { rx: from.rx + Math.round(dx * d) || 1, ry: from.ry + Math.round(dy * d) };
}
// The guardian's door of dungeon `id`, entered from `entered` ({rx, ry, x, y}). Returns where it leads, or null when
// the dungeon is not linked (it then returns you to its entrance as before). Creates the link the first time.
export function linkedExit(save, id, entered) {
  if (!entered || !isLinked(save, id)) return null;
  ensureLinks(save);
  let link = save.linkedDungeons[id];
  if (!link) link = save.linkedDungeons[id] = { a: { rx: entered.rx, ry: entered.ry, x: entered.x ?? 16, y: entered.y ?? 16 }, b: farMouth(save, id, entered) };
  const fromB = entered.rx === link.b.rx && entered.ry === link.b.ry;
  return fromB ? { rx: link.a.rx, ry: link.a.ry, x: link.a.x, y: link.a.y, mouth: "a" } : { rx: link.b.rx, ry: link.b.ry, x: null, y: null, mouth: "b" };
}
// Second mouths standing in this section (each is an ordinary dungeon entrance carrying its dungeon's id).
export function mouthsIn(save, rx, ry) { return Object.entries(save.linkedDungeons || {}).filter(([, l]) => l.b.rx === rx && l.b.ry === ry).map(([id]) => id); }
// Open ground a mouth may stand on (the same test the road walkers use).
const open = (t) => !!t && !t.blocked && !t.structure && !LETHAL_KINDS.has(t.kind) && t.kind !== "shallows";
// Places a second mouth on open ground nearest the middle of the section (once: a restored section keeps its own).
// Returns the object, or null when the section has no open ground for it.
export function placeMouth(map, id) {
  const have = map.objects.find((o) => o.linked && o.dungeonId === id); if (have) return have;
  const taken = new Set(map.objects.map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const spots = (map.tiles || []).filter((t) => open(t) && t.x > 6 && t.y > 6 && t.x < 25 && t.y < 25 && !taken.has(`${t.x},${t.y}`)).sort((p, q) => Math.hypot(p.x - 16, p.y - 16) - Math.hypot(q.x - 16, q.y - 16) || p.y - q.y || p.x - q.x);
  const at = spots[0]; if (!at) return null;
  const o = { id: `linked-mouth-${hashSeed(id) % 1000000}`, kind: "dungeon", dungeonId: id, linked: true, x: at.x, y: at.y, state: "open", actions: ["enter", "bypass"], landmark: true, name: "The Other Mouth", identity: "linked crossing" };
  map.objects.push(o);
  return o;
}
// Every link whose two mouths are both on the Atlas: [{ id, a: {rx, ry}, b: {rx, ry} }].
export function linksKnown(save) {
  return Object.entries(save.linkedDungeons || {}).filter(([, l]) => save.explored?.[`${l.a.rx},${l.a.ry}`] && save.explored?.[`${l.b.rx},${l.b.ry}`]).map(([id, l]) => ({ id, a: { rx: l.a.rx, ry: l.a.ry }, b: { rx: l.b.rx, ry: l.b.ry } }));
}
