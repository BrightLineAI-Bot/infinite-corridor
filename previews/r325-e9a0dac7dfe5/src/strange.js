// Strange things (release 215; Tim, 2026-10-19). Story beats live in rare, noticeably wrong versions of ordinary trees,
// shrubs and rocks, not in chopping every tree: "you don't have to tell me where they are … they should be pretty rare".
// A strange thing keeps its ordinary shape (and solidity) but shimmers, doubles and sheds pale motes (renderer.ts).
// Touching it always opens a Glimpse; afterwards it is ordinary. Nothing marks them on the Atlas. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r325-e9a0dac7dfe5";

// Balance: the share of overworld sections holding one strange thing, and how near the Refuge they can be.
export const STRANGE = { version: 1, chance: .035, minDepth: 1 };
const NAMES = { tree: "A strange tree", rock: "A strange stone" };
export const strangeKey = (rx, ry) => `strange:${rx},${ry}`;
export function strangeHere(save, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < STRANGE.minDepth) return false;
  return (hashSeed(`${save?.seed}:strange:v${STRANGE.version}:${rx}:${ry}`) % 10000) / 10000 < STRANGE.chance;
}
// Turns one of the section's own trees or rocks into a strange one. Returns it, or null.
export function addStrange(map, save, rx, ry) {
  if (!map || map.skirmish || map.settlement || map.tiles?.length !== 1024 || !strangeHere(save, rx, ry)) return null;
  const pool = (map.objects || []).filter((o) => (o.kind === "tree" && o.state === "standing") || (o.kind === "rock" && o.state !== "moved" && o.state !== "broken"));
  if (!pool.length) return null;
  const o = pool[hashSeed(`${save.seed}:strange-pick:${rx}:${ry}`) % pool.length], used = !!save.worldFlags?.[strangeKey(rx, ry)];
  Object.assign(o, { strange: true, strangeUsed: used, name: NAMES[o.kind], actions: used ? (o.actions || []) : ["touch"] });
  return o;
}
// Touching it: recorded once per section; the caller opens the Glimpse.
export function touchStrange(save, o, rx, ry) {
  if (!o?.strange || o.strangeUsed) return { ok: false, message: o?.kind === "rock" ? "It is only a stone now." : "It is only a tree now." };
  save.worldFlags ||= {}; save.worldFlags[strangeKey(rx, ry)] = true;
  o.strangeUsed = true; o.actions = o.kind === "tree" ? ["cut", "ignite"] : [];
  return { ok: true, message: o.kind === "rock" ? "The stone is warm, and then it is not." : "The bark gives under your hand like skin, and then it is bark." };
}
