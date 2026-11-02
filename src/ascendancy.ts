// The Rite of Ascendancy. Tim, 2026-11-02: "there's like a Dias that looks like a sprouting tree... you can touch it, and
// then it'll say... begin rites of ascendency... all the wards and the enemies will start coming... the walls will be blocked
// off... you have to do the ascendancy the whole 5 minutes without dying... if [you] die, it resets and the fire from around
// the walls goes down and you can leave the tile... each [dais] only gives you 3 [tries]... if you complete the [rite], a great
// tree [rises] in that tile, and you get to climb up it and get some divine viscera, but there's no... divine [rite] or trial up
// there... just being in a tree, you can hop on down... sometimes there's a skyway up there... [to] another tree top".
//
// - A Sapling Dais stands in a few sections first seen from this release (`chance`, past `minRing`), never in a town.
// - Touch it to begin: fire rises along the section's edges (you cannot leave), and waves of the country's creatures come in
//   from just off the screen, more often as the rite goes on (`waves`), never past `waves.cap` of them alive. Survive
//   `duration` s and the rite is done.
// - Die and the rite fails: the fire goes down, its creatures go, and that was one of the dais's `tries`. With none left the
//   sapling withers for good.
// - Done: a great tree rises there (landscape.ts growRiteTree), the same each time you come back, with a Divine Viscera bloom
//   on its crown (`viscera`, once). Its door to the sky is kept only by a share of rites (`skyway`): a skyway to another tree.
// Save: additive at schema 14 (`save.ascendancy`: { ["rx,ry"]: { tries, done, bloom } }).
import { hashSeed } from "./random.ts";

export const ASCENDANCY = {
  version: 1,
  chance: .03, minRing: 4,
  duration: 300, // s
  tries: 3,
  grace: 4, // s before the first wave
  waves: { every: [24, 11], packs: [2, 4], pack: [3, 5], cap: 24, champion: .25, rare: .1, distance: [9, 13] }, // every: s between waves at the start → at the end
  fire: 1.2, // tiles: the edge band the fire burns in
  viscera: 3,
  skyway: .4,
  fallback: ["ashling", "glassMite", "ashenHound", "coilStalker", "rootBrute"],
  maxRecords: 128,
  name: "Sapling Dais",
  messages: {
    dais: "A sapling grows from a ring of old stone, its leaves faintly gold. Touch it to begin the Rite of Ascendancy: survive five minutes in this place, and something will rise here.",
    begin: "The Rite of Ascendancy begins. Fire rises round the edges of the land: survive until the sapling has grown.",
    noLeave: "The fire bars the way. Survive the rite.",
    failed: (left) => `The rite is broken. The fire sinks away.${left > 0 ? ` The sapling can bear ${left} more rite${left === 1 ? "" : "s"}.` : " The sapling withers."}`,
    withered: "A withered sapling in a ring of old stone. It will not grow again.",
    done: "The rite is done. The sapling rises into a great tree; something glows on its crown.",
    bloom: "A bloom of Divine Viscera hangs at the top of the tree.",
    gathered: (n) => `You gather ${n} Divine Viscera from the bloom.`,
  },
};

export const riteKey = (rx, ry) => `${rx},${ry}`;
export const saplingHere = (seed, rx, ry) => Math.abs(rx) + Math.abs(ry) >= ASCENDANCY.minRing && (hashSeed(`${seed}:sapling-dais:v1:${rx}:${ry}`) % 10000) / 10000 < ASCENDANCY.chance;
export const riteSkyway = (seed, rx, ry) => (hashSeed(`${seed}:rite-skyway:v1:${rx}:${ry}`) % 1000) / 1000 < ASCENDANCY.skyway;

export function ensureAscendancy(save) {
  const raw = save?.ascendancy, out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [k, r] of Object.entries(raw).slice(-ASCENDANCY.maxRecords)) {
    if (!/^-?\d+,-?\d+$/.test(k) || !r || typeof r !== "object") continue;
    out[k] = { tries: Math.max(0, Math.min(ASCENDANCY.tries, Math.floor(Number(r.tries) || 0))), done: r.done === true, bloom: r.bloom === true };
  }
  if (save) save.ascendancy = out;
  return save;
}
export function riteRecord(save, rx, ry) { const A = (save.ascendancy ||= {}); return (A[riteKey(rx, ry)] ||= { tries: 0, done: false, bloom: false }); }
export const triesLeft = (rec) => Math.max(0, ASCENDANCY.tries - (rec?.tries || 0));
// Seconds between waves `t` s into the rite: from `every[0]` at the start to `every[1]` at the end.
export function waveGap(t) { const [a, b] = ASCENDANCY.waves.every, k = Math.max(0, Math.min(1, t / ASCENDANCY.duration)); return a + (b - a) * k; }
