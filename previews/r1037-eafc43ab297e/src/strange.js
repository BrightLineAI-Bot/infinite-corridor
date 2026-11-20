// Strange things (release 215; Tim, 2026-10-19). Story beats live in rare, noticeably wrong versions of ordinary trees,
// shrubs and rocks, not in chopping every tree: "you don't have to tell me where they are … they should be pretty rare".
// A strange thing keeps its ordinary shape (and solidity) but shimmers, doubles and sheds pale motes (renderer.ts).
// Touching it always opens a Glimpse; afterwards it is ordinary. Nothing marks them on the Atlas. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r1037-eafc43ab297e";

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

// ------------------------------------------------------------------------------------------------ the bizarro pockets
// The bizarro world (Tim, 2026-11-15: "incredibly rare random overworld pockets... where everything is off"). About one section
// in BIZARRO.odds (past `minDepth` from Ember Refuge, never a town, hamlet or far domain) is a pocket, and only a section first
// seen under BIZARRO.version (Atlas `bizarroVersion`), so ground explored before never changes. Nothing of the ground is
// moved: the pocket's tiles, exits, bridges and heights are exactly those the section would have had. It is painted off (the
// ground cache washed once with `wash` by the "difference" blend: landscape-render.ts bizarroWash; the Atlas colour likewise),
// its creatures of the rounded kinds are drawn rounded (monster-render.ts drawsBizarro), and a few more of them wander there,
// set only on ground the Wayfarer can walk to. An Abyssal Seed often lies in one (`seeds.pocket`), and very rarely in any other
// new section (`seeds.world`). Pure rules: no DOM.
export const BIZARRO = {
  version: 1,
  odds: 400, minDepth: 4, // one section in `odds`
  wash: [118, 64, 150], // the colour the ground is differenced with (rgb)
  seeds: { pocket: .5, world: .0015 }, // the chance an Abyssal Seed lies in a pocket, and in any other new section
  creatures: { n: [3, 5], minFromMiddle: 4, kinds: [["ashling", 3], ["ashenHound", 3], ["glassMite", 3], ["coilStalker", 2], ["sparkWarden", 2], ["veilMoth", 2], ["cinderWisp", 2], ["mossGrazer", 2], ["lanternDoe", 1]] },
  ambient: { mossGrazer: "graze", lanternDoe: "follow" }, // the quiet ones wander as the ambient fauna do (world.ts addAmbientFauna)
  text: {
    arrive: "Something is wrong with the colours here. And with the creatures. And, a little, with you.",
    journal: "A stretch of the corridor where everything was slightly wrong: the ground the wrong colour, the creatures soft and rounded, as if drawn from a description. It did not follow me out.",
  },
};
const bizarroHash = (seed, what, rx, ry, v = BIZARRO.version) => hashSeed(`${seed}:bizarro:v${v}:${what}:${rx}:${ry}`);
// Is section (rx, ry) a bizarro pocket, under bizarro version `v` (0: a section seen before the pockets, never one)? Pure.
export function bizarroHere(seed, rx, ry, v = BIZARRO.version) {
  if (!v || Math.abs(rx) + Math.abs(ry) < BIZARRO.minDepth) return false;
  return bizarroHash(seed, "pocket", rx, ry, v) % BIZARRO.odds === 0;
}
// Does an Abyssal Seed lie in section (rx, ry)? `pocket`: the section is a bizarro pocket. Pure.
export function abyssalFindHere(seed, rx, ry, pocket) {
  return (bizarroHash(seed, "abyssal-find", rx, ry) % 100000) / 100000 < (pocket ? BIZARRO.seeds.pocket : BIZARRO.seeds.world);
}
// The pocket's own wanderers, on `open` (tiles the Wayfarer can walk to, in a fixed order): [{ kind, x, y, ... }]. Pure.
export function bizarroSpawns(seed, rx, ry, open) {
  const C = BIZARRO.creatures, out = [], pool = (open || []).filter((t) => Math.hypot(t.x - 16, t.y - 16) >= C.minFromMiddle);
  const total = C.kinds.reduce((a, [, w]) => a + w, 0), n = C.n[0] + bizarroHash(seed, "n", rx, ry) % (C.n[1] - C.n[0] + 1);
  for (let i = 0; i < n && pool.length; i++) {
    const t = pool.splice(bizarroHash(seed, `at${i}`, rx, ry) % pool.length, 1)[0]; let r = bizarroHash(seed, `kind${i}`, rx, ry) % total, kind = C.kinds[0][0];
    for (const [k, w] of C.kinds) { if (r < w) { kind = k; break; } r -= w; }
    const quiet = BIZARRO.ambient[kind];
    out.push({ id: `bizarro-${rx}-${ry}-${i}`, kind, x: t.x, y: t.y, traits: [], bizarroPocket: true, ...(quiet ? { ambient: true, passiveBehavior: quiet } : {}) });
  }
  return out;
}
// A colour (#rrggbb) as the pocket shows it: differenced with the wash, channel by channel.
export function bizarroTint(hex) {
  const n = parseInt(String(hex || "#000000").slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return "#" + c.map((v, i) => Math.abs(v - BIZARRO.wash[i]).toString(16).padStart(2, "0")).join("");
}
