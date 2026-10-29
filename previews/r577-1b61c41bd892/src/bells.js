// The Seven Bells (release 431; docs/narrative-bible.md section 6, thread 1, and section 7, step 6): "The Bell-founder's
// Daughter cast seven bells to call home the people the war took. They were scattered into seven crossings; each holds a
// cracked bell. Ringing a bell plays a short Glimpse of one lost person on a road, walking home. When the seventh rings,
// the final Glimpse plays: seven figures arrive at a door at dusk. The Daughter opens it, and none of them have faces. She
// lets them in anyway."
//
// A cracked bell hangs in some ordinary crossings of the Smoke Meadows and the middle band (`minDepth`–`maxDepth` from
// Ember Refuge, a seeded `chance` per crossing). Which of the seven it is comes from the crossing's seed, so a crossing
// always holds the same bell; one already rung hangs silent. Rung bells are remembered in save.lore.bells (the bells rung,
// as a string of digits; additive, normalised here). All writing is original to the game. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r577-1b61c41bd892";
import { READING_BANDS } from "./lore.js?v=r577-1b61c41bd892";

// Release r577-1b61c41bd892 (Tim: "they shouldn't just be trapped in specific dungeons... if I don't get the bell in one dungeon... it should
// just go to another dungeon... randomly... until I get them... unless there's a way to... note in this square... where the
// missing piece is... I just want to keep exploring"): a bell crossing (`chance`, by seed) may lie at any depth from `minDepth`
// out (`maxDepth` was the old limit), and it offers one of the bells not yet rung, chosen by its seed among them, so no bell
// can be stranded in one crossing. A crossing entered with a bell (or a Surveyor's link) left in it is noted in
// save.lore.leftBehind ({ "<kind>|<dungeonId>": { kind, rx, ry } }, kind "bell" or "link"; additive; ensureLeftBehind) and the Journal points to the nearest. A
// crossing where a bell was rung keeps that bell, rung (save.lore.bellAt: { bell: dungeonId }), so one crossing gives one bell.
export const BELLS = { count: 7, chance: .14, minDepth: 3, maxDepth: READING_BANDS.middle, leftBehind: 24 };
export const BELL_GLIMPSES = {
  1: { who: "a farrier", lines: ["A man in a leather apron walks a road through wet grass, a coat over one shoulder. He stops at every milestone to read it, as if the numbers might have changed while he was away."] },
  2: { who: "a girl with a drum", lines: ["A girl carries a drum with no sticks. She taps the skin with two fingers as she walks, keeping time for a column of people who are no longer behind her."] },
  3: { who: "a schoolmaster", lines: ["An old schoolmaster walks with a slate under his arm. He has written a list of names on it, and at each crossroads he rubs one out with his thumb and keeps going."] },
  4: { who: "a cook", lines: ["A cook walks with a pot tied to her pack. When the road climbs she sings to it under her breath, the way you would to something that might be listening."] },
  5: { who: "a young soldier", lines: ["A boy in half a uniform walks barefoot, his boots tied together and hung around his neck. He is saving them for the last mile, so that he arrives looking like someone."] },
  6: { who: "a ferrywoman", lines: ["A woman walks along a river with a pole across her shoulders, and no boat. Every so often she stops and pushes the pole into the bank, out of habit, and the river does not move."] },
  7: { who: "the bell-founder's apprentice", lines: ["A young man walks with a bell clapper wrapped in cloth, carrying it like something asleep. He is the last of them. Behind him the road is empty; ahead of him, a light in a window."] },
};
export const BELL_FINAL = "Seven figures come up a lane at dusk and stop at a door. The Bell-founder's Daughter opens it. None of them have faces. She looks at each in turn for a long moment, then stands aside and lets them in anyway, and closes the door on the cold.";

// The bells rung, as a sorted string of digits ("" when none).
export function bellsRung(save) { return [...new Set(String(save?.lore?.bells || "").split("").filter((d) => BELL_GLIMPSES[d]))].sort().join(""); }
const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
// Which bell (1–7) hangs in this crossing, or 0. Only ordinary crossings `minDepth` or more from the Refuge hold one. `rung`
// (bellsRung) picks among the bells not yet rung; with all rung (or none given) it is the crossing's own bell.
export function bellIn(seed, dungeonId, rung = "") {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return 0;
  const depth = Math.abs(Number(m[1])) + Math.abs(Number(m[2])); if (depth < BELLS.minDepth) return 0;
  const h = hashSeed(`${seed}:seven-bells:v1:${dungeonId}`); if ((h % 10000) / 10000 >= BELLS.chance) return 0;
  const left = Array.from({ length: BELLS.count }, (_, i) => i + 1).filter((n) => !rung.includes(String(n)));
  return left.length ? left[(h >>> 9) % left.length] : 1 + ((h >>> 9) % BELLS.count);
}
// The crossing of an ordinary dungeon id as { rx, ry }, or null.
export function crossingAt(dungeonId) { const m = ORDINARY.exec(String(dungeonId || "")); return m ? { rx: Number(m[1]), ry: Number(m[2]) } : null; }
export function ensureLeftBehind(save, create = false) { // created when first needed, so a fresh lore block stays as it was
  const lore = (save.lore ||= {}), raw = lore.leftBehind && typeof lore.leftBehind === "object" && !Array.isArray(lore.leftBehind) ? lore.leftBehind : null, out = {};
  for (const [id, q] of Object.entries(raw || {})) if ((q?.kind === "bell" || q?.kind === "link") && Number.isInteger(q.rx) && Number.isInteger(q.ry)) out[id] = { kind: q.kind, rx: q.rx, ry: q.ry };
  if (raw || create) lore.leftBehind = out; else delete lore.leftBehind;
  if (lore.bellAt !== undefined) { const at = {}; for (const [n, id] of Object.entries(lore.bellAt && typeof lore.bellAt === "object" ? lore.bellAt : {})) if (BELL_GLIMPSES[n] && typeof id === "string") at[n] = id; lore.bellAt = at; }
  return out;
}
// Notes (`waiting`) or clears a `kind` ("bell" or "link") left in a crossing; keeps the latest `BELLS.leftBehind`.
export function noteLeftBehind(save, dungeonId, kind, waiting) {
  const list = ensureLeftBehind(save, true), at = crossingAt(dungeonId), key = `${kind}|${dungeonId}`; delete list[key];
  if (waiting && at) { list[key] = { kind, ...at }; const keys = Object.keys(list); for (const k of keys.slice(0, Math.max(0, keys.length - BELLS.leftBehind))) delete list[k]; }
}
// The nearest crossing to (rx, ry) where a `kind` was left behind, or null.
export function nearestLeftBehind(save, kind, rx, ry) {
  let best = null; for (const q of Object.values(save?.lore?.leftBehind || {})) if (q.kind === kind && (!best || Math.max(Math.abs(q.rx - rx), Math.abs(q.ry - ry)) < Math.max(Math.abs(best.rx - rx), Math.abs(best.ry - ry)))) best = q;
  return best;
}
// Hangs the crossing's bell on open floor away from the entry. Returns the object or null.
export function addBell(map, save, dungeonId) {
  if (!map?.tiles?.length || map.multiLevel || map.arena || map.underwater || map.objects?.some((o) => o.kind === "crackedBell")) return null;
  const done = Object.entries(save?.lore?.bellAt || {}).find(([, id]) => id === dungeonId), n = done ? Number(done[0]) : bellIn(save?.seed, dungeonId, bellsRung(save)); if (!n) return null; // a crossing that rang a bell keeps it
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= 6 && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|void|Gate/i.test(String(t.kind)));
  if (!open.length) return null;
  const at = open[hashSeed(`${save.seed}:seven-bells-at:v1:${dungeonId}`) % open.length], rung = bellsRung(save).includes(String(n));
  const o = { id: `bell-${n}-${hashSeed(dungeonId) % 100000}`, kind: "crackedBell", bell: n, name: rung ? "A rung bell" : "A cracked bell", x: at.x, y: at.y, dungeonId, state: rung ? "rung" : "waiting", actions: rung ? ["inspect"] : ["ring"] };
  (map.objects ||= []).push(o); return o;
}
// Ringing it: one lost person's road; the seventh brings them to the door. Returns { ok, message, first, done }.
export function ringBell(save, o) {
  const g = BELL_GLIMPSES[o?.bell]; if (!g) return { ok: false, message: "Nothing here rings." };
  save.lore ||= {}; const before = bellsRung(save), first = !before.includes(String(o.bell));
  if (!first) return { ok: true, first: false, message: `The bell for ${g.who} has already rung. It hangs quiet, and a little warm.` };
  save.lore.bells = bellsRung({ lore: { bells: before + o.bell } }); if (o.dungeonId) (save.lore.bellAt ||= {})[o.bell] = o.dungeonId; o.state = "rung"; o.name = "A rung bell"; o.actions = ["inspect"];
  const n = save.lore.bells.length, done = n >= BELLS.count;
  return { ok: true, first: true, done, message: `The cracked bell gives one low note, and for a moment you see ${g.who} on a road, walking home. ${g.lines.join(" ")}${done ? ` ${BELL_FINAL}` : ` (${n} of ${BELLS.count} bells rung.)`}` };
}
