// Wonders worth the walk (release 674; Tim, 2026-11-01: "I haven't seen any tall trees or skyways, or chasm (Starfield)
// explorations"). The Atlas pins the nearest unexplored Sky Stair, great tree and Starfield crossing, and a traveller who has
// heard of one says which way it lies. Everything here is a hash of the seed and the section, read without building the
// section (a few thousand cheap checks, kept per section): a Sky Stair exactly as the game places it on new ground
// (placement 2); a great tree where the section's centre lies in a tree region and the version 14 roll grows one (a tree may
// still find no room, so the Atlas says "said to stand"); a Starfield crossing where the section's ordinary crossing would roll
// one on first entry. Only sections with no Atlas entry are named, so all of this is new ground (placement 2, landscape 14).
import { hashSeed, rng } from "./random.js?v=r674-bd46fb57220e";
import { dungeonId } from "./world.js?v=r674-bd46fb57220e";
import { sectionRegion, farSleepSection } from "./landscape.js?v=r674-bd46fb57220e";
import { skylandSection, SKY_PLACE } from "./skylands.js?v=r674-bd46fb57220e";
import { TREES_V14 } from "./trees.js?v=r674-bd46fb57220e";

export const WONDERS = {
  radius: 24, // sections searched round the Wayfarer (Manhattan)
  chasmChance: .2, // game.ts CHASM.chance (kept equal by a test; not imported, so this module stays free of the game)
  kinds: {
    skyway: { name: "a skyway", atlas: "Skyway (rumoured)", color: "#9fd8ff" },
    tree: { name: "a great tree", atlas: "Great tree (said to stand)", color: "#7fd36a" },
    starfield: { name: "a crossing that opens on stars", atlas: "Starfield crossing (rumoured)", color: "#c9a8ff" },
  },
};
export const WONDER_KINDS = Object.keys(WONDERS.kinds);

export function wonderAt(seed, rx, ry, kind, generation = 1) {
  if (rx === 0 && ry === 0) return false;
  if (kind === "skyway") return skylandSection(seed, rx, ry, SKY_PLACE.version);
  if (kind === "tree") { const type = sectionRegion(seed, rx, ry, 14).type, R = TREES_V14.regions[type]; return !!R && (hashSeed(`${seed}:canopy-grow:v2:${type}:${ry * 7919 + rx}`) % 1000) / 1000 < R.chance; }
  if (kind === "starfield") {
    if (farSleepSection(rx, ry)) return false; // a Far Sleep crossing may be a Sleeper's Hall instead
    const r = rng(`${seed}:dungeon-entrance:v1:g${generation}:${rx}:${ry}`); if (r() >= .28) return false; r(); // world.ts addDungeonLandmark: the roll, the spot, the id
    const id = dungeonId(seed, generation, rx, ry, `dungeon-g${generation}-${rx}-${ry}-${Math.floor(r() * 1e6)}`);
    return (hashSeed(`${seed}:chasm-crossing:v1:${id}`) % 1000) / 1000 < WONDERS.chasmChance;
  }
  return false;
}
const memo = new Map();
// The nearest unexplored section of each kind within `radius`, nearest first: [{ kind, rx, ry, d }].
export function nearestWonders(save, rx, ry) {
  const seed = save?.seed, gen = Number(save?.worldGeneration) || 1, atlas = save?.atlas || {}, key = `${seed}:${gen}:${rx}:${ry}:${Object.keys(atlas).length}`;
  if (memo.has(key)) return memo.get(key);
  const found = {};
  for (let d = 1; d <= WONDERS.radius && Object.keys(found).length < WONDER_KINDS.length; d++)
    for (let i = 0; i < 4 * d; i++) {
      const k = i % d, side = Math.floor(i / d), x = rx + [d - k, -k, -d + k, k][side], y = ry + [k, d - k, -k, -d + k][side];
      if (atlas[`${x},${y}`]) continue;
      for (const kind of WONDER_KINDS) if (!found[kind] && wonderAt(seed, x, y, kind, gen)) found[kind] = { kind, rx: x, ry: y, d };
    }
  const out = Object.values(found).sort((a, b) => a.d - b.d);
  if (memo.size > 64) memo.clear(); memo.set(key, out);
  return out;
}
export function compassWords(dx, dy) { const a = []; if (dy < 0) a.push("north"); if (dy > 0) a.push("south"); if (dx > 0) a.push("east"); if (dx < 0) a.push("west"); return a.join("-") || "here"; }
// What a traveller has heard: one wonder (chosen by `who`, so each traveller tells the same one), or null.
export function wonderRumour(save, rx, ry, who = "") {
  const list = nearestWonders(save, rx, ry); if (!list.length) return null;
  const w = list[hashSeed(`${save?.seed}:rumour:${who}`) % list.length], K = WONDERS.kinds[w.kind];
  return `They speak of ${K.name} ${compassWords(w.rx - rx, w.ry - ry)}, about ${w.d} section${w.d === 1 ? "" : "s"} off.`;
}
