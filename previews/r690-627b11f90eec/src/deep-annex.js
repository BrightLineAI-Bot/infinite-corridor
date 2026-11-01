// Deep annexes (release 675). Tim, 2026-11-01: ordinary crossings stay one or two floors deep, but "deep annexes" are a rare,
// named dungeon type ("so they can be skipped"), mostly Skylands and Starfield variants. "Starfield... the third level [is] a
// different biome... [and its exit] teleports [you] to a random place in the world."
//
// The Starfield Deep Annex: a Starfield crossing never entered before may be one (`chance`, hashed from the seed and its id). Its entrance
// says so before you go in. Each of its `floors` is a crossing of its own (ids `${base}:annex2`, `${base}:annex3`), so clearing,
// rewards and the return work as in any crossing: the first two are Starfield floors (the starfield carved through them), the
// third is another country entirely (`third`, one hashed environment). Each floor's guardian, once felled, opens the Annex
// Stair down beside the floor's Cleared Return (leave there and the annex waits); each floor is harder (`scale`). The third
// floor's return does not lead back: it lets you out at a random place in the world, `exit.near`–`exit.far` sections from
// where you went in (open sea refused, unexplored ground preferred).
// Save: additive at schema 14 (`history.deepAnnex` on each floor's dungeon history: { version, floor, base }).
import { hashSeed } from "./random.js?v=r690-627b11f90eec";

export const DEEP_ANNEX = {
  version: 1,
  chance: .25, // of the Starfield crossings never entered before (CHASM.chance .2 since release 672: about 5% of crossings)
  floors: 3,
  name: "Starfield Deep Annex",
  scale: { hp: [1, 1.3, 1.6], damage: [1, 1.15, 1.3] }, // per floor
  third: ["lavaBog", "frozen", "fungal", "geode", "rootwood", "boneCrypt", "river"], // the third floor's environment
  exit: { near: 10, far: 24, tries: 48 },
  messages: {
    entrance: "A Starfield Deep Annex opens here: three floors down through the stars, each harder than the last, and its far door lets you out somewhere else in the world.",
    enter: "STARFIELD DEEP ANNEX", enterDetail: "floor 1 of 3 · fell each floor's guardian to open the stair down",
    stair: "The Annex Stair opens where the guardian fell: down to floor",
    out: "The annex's far door lets you out somewhere else entirely",
  },
};

const FLOOR = /:annex([23])$/;
export const annexFloorOf = (id) => { const m = String(id || "").match(FLOOR); return m ? Number(m[1]) : 1; };
export const annexBaseOf = (id) => String(id || "").replace(FLOOR, "");
export const annexFloorId = (base, floor) => floor <= 1 ? base : `${base}:annex${floor}`;
// An ordinary overworld crossing (not the Refuge's own, a canopy door, a deep dungeon or an annex floor).
export const annexEligible = (id) => /^dungeon:[^:]+:g\d+:-?\d+:-?\d+:[^:]+$/.test(String(id || "")) && !/:canopy$/.test(id);
export const annexRoll = (seed, id) => (hashSeed(`${seed}:deep-annex:v1:${id}`) % 10000) / 10000 < DEEP_ANNEX.chance;

// The record a crossing never generated before takes: the first floor of an annex, a deeper floor, or false. `starfield`:
// whether the crossing rolls a Starfield (game.ts chasmRoll); only those may be annexes.
export function annexRecord(seed, id, starfield = true) {
  const floor = annexFloorOf(id);
  if (floor > 1) return { version: DEEP_ANNEX.version, floor, base: annexBaseOf(id) };
  return starfield && annexEligible(id) && annexRoll(seed, id) ? { version: DEEP_ANNEX.version, floor: 1, base: id } : false;
}
export const annexThird = (seed, base) => DEEP_ANNEX.third[hashSeed(`${seed}:deep-annex-third:v1:${base}`) % DEEP_ANNEX.third.length];
export const annexScale = (floor) => ({ hp: DEEP_ANNEX.scale.hp[floor - 1] || 1, damage: DEEP_ANNEX.scale.damage[floor - 1] || 1 });

// Where the third floor lets you out: a section `near`–`far` from (rx, ry), never open sea (`sea(rx, ry)`), unexplored first.
export function annexExit(seed, base, from, explored, sea) {
  const E = DEEP_ANNEX.exit; let fallback = null;
  for (let i = 0; i < E.tries; i++) {
    const h = hashSeed(`${seed}:deep-annex-exit:v1:${base}:${i}`), a = (h % 6283) / 1000, r = E.near + (h >>> 13) % (E.far - E.near + 1);
    const rx = Math.round((from?.rx || 0) + Math.cos(a) * r), ry = Math.round((from?.ry || 0) + Math.sin(a) * r);
    if (sea && sea(rx, ry)) continue;
    const spot = { rx, ry, x: 16, y: 16 };
    if (!explored?.[`${rx},${ry}`]) return spot; fallback ||= spot;
  }
  return fallback || { rx: (from?.rx || 0) + E.near, ry: from?.ry || 0, x: 16, y: 16 };
}
