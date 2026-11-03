// The Rite of Ascendancy. Tim, 2026-11-02: "there's like a Dias that looks like a sprouting tree... you can touch it, and
// then it'll say... begin rites of ascendency... all the wards and the enemies will start coming... the walls will be blocked
// off... you have to do the ascendancy the whole 5 minutes without dying... if [you] die, it resets and the fire from around
// the walls goes down and you can leave the tile... each [dais] only gives you 3 [tries]... if you complete the [rite], a great
// tree [rises] in that tile, and you get to climb up it and get some divine viscera, but there's no... divine [rite] or trial up
// there... just being in a tree, you can hop on down... sometimes there's a skyway up there... [to] another tree top".
//
// - A Sapling Dais stands in a few sections first seen from this release (`chance`, past `minRing`), never in a town: one of the
//   strange trees (renderer.ts drawStrange: the pale ghost, the violet glow, the rising motes). Tim: "We have a weird tree that
//   has... purple glowing lights around it... When you see one of those that's glowing, it could be... an ascendancy".
// - Touch it to begin: fire rises along the section's edges (you cannot leave), and waves of the country's creatures come in
//   from just off the screen, more often as the rite goes on (`waves`), never past `waves.cap` of them alive. Survive
//   `duration` s and the rite is done. Its creatures ramp (`ramp`): the country's own at first, then hitting harder and harder.
// - Die and the rite fails: the fire goes down, its creatures go, and that was one of the tree's `tries`. With none left the
//   strange tree dies for good.
// - While it burns, the strange tree burns down; done, it is a heap of ashes. Touch them and a great tree rises from the ground
//   (landscape.ts growRiteTree; its platforms climb out of the earth over `rise` s, rubble falling), the same each time you come
//   back, with a Divine Viscera bloom on its crown (`viscera`, once) and its door to the sky (`skyway`): a skyway to another tree.
// Save: additive at schema 14 (`save.ascendancy`: { ["rx,ry"]: { tries, done, risen, bloom } }).
import { hashSeed } from "./random.js?v=r725-06eac3488773";

export const ASCENDANCY = {
  version: 1,
  chance: .03, minRing: 4,
  duration: 300, // s
  tries: 3,
  grace: 4, // s before the first wave
  waves: { every: [24, 11], packs: [2, 4], pack: [3, 5], cap: 30, champion: .25, rare: .1, distance: [9, 13], packsUp: 2, sizeUp: 2 }, // every: s between waves at the start → at the end; packsUp/sizeUp: more and bigger packs by the end
  // Tim (2026-11-02): "start from the level of the tile... then it'll quickly ramp up to your gear level. And then quickly exceed... by
  // the end of it... they hit... almost [like] world [bosses]... a reasonable amount of health... so you can still kill them pretty
  // quickly if you have a strong build". For the first `calm` of the rite its creatures are the country's own; after that each is
  // set to the Wayfarer: its blow a share of their health past their guard, rising `share` (world beasts strike .2–.24), its health
  // `hits` of the Wayfarer's own blows (× `rankHits` for a champion or a rare). Never weaker than it came.
  ramp: { calm: .12, share: [.04, .18], hits: [2, 7], rankHits: { champion: 1.8, rare: 3 }, nativeUp: 1.5 }, // nativeUp: their own blow grows too, by up to this share
  fire: 1.2, // tiles: the edge band the fire burns in
  viscera: 3,
  skyway: 1, // Tim: "you get to climb it and go to the skyway. And get divine viscera": every rite's tree keeps its door to the sky
  rise: 3.5, // s the great tree takes to rise from the ashes
  fallback: ["ashling", "glassMite", "ashenHound", "coilStalker", "rootBrute"],
  maxRecords: 128,
  name: "Strange Tree of the Rite",
  messages: {
    dais: "A strange tree, wrong at the edges, motes of violet light rising from it. Touch it to begin the Rite of Ascendancy: survive five minutes here, and something will rise.",
    begin: "The Rite of Ascendancy begins. The strange tree catches fire, and fire rises round the edges of the land: survive until it has burned down.",
    noLeave: "The fire bars the way. Survive the rite.",
    failed: (left) => `The rite is broken. The fire sinks away.${left > 0 ? ` The strange tree can bear ${left} more rite${left === 1 ? "" : "s"}.` : " The strange tree dies."}`,
    withered: "A strange tree gone grey and dead. Its rite will not come again.",
    done: "The rite is done. The strange tree has burned down to a heap of ashes, still warm. Touch them.",
    ashes: "A heap of warm ashes where the strange tree burned. The ground under it is soaked with the blood of the fallen.",
    rise: "Slaked with the blood of the fallen, the ground heaves: a great tree rises from the ashes. Climb it.",
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
    out[k] = { tries: Math.max(0, Math.min(ASCENDANCY.tries, Math.floor(Number(r.tries) || 0))), done: r.done === true, risen: r.risen === true, bloom: r.bloom === true };
  }
  if (save) save.ascendancy = out;
  return save;
}
export function riteRecord(save, rx, ry) { const A = (save.ascendancy ||= {}); return (A[riteKey(rx, ry)] ||= { tries: 0, done: false, risen: false, bloom: false }); }
export const triesLeft = (rec) => Math.max(0, ASCENDANCY.tries - (rec?.tries || 0));
// Seconds between waves `t` s into the rite: from `every[0]` at the start to `every[1]` at the end.
export function waveGap(t) { const [a, b] = ASCENDANCY.waves.every, k = Math.max(0, Math.min(1, t / ASCENDANCY.duration)); return a + (b - a) * k; }
// How hard the rite's creatures are `f` (0–1) into the rite: null while calm, else their blow (share of the Wayfarer's health)
// and their health in the Wayfarer's blows.
export function riteRamp(f) {
  const R = ASCENDANCY.ramp; if (f < R.calm) return null; const k = Math.min(1, (f - R.calm) / (1 - R.calm));
  return { k, share: R.share[0] + (R.share[1] - R.share[0]) * k, hits: R.hits[0] + (R.hits[1] - R.hits[0]) * k };
}
