// Creature stages (release 275; Tim, 2026-10-21): "all these creatures are aperture stage one... after you beat the
// listener you get access to stage 2, and you... go up to another 24... each time you beat the gate... unlock the different
// tier... maybe it'll be like two or three [Listeners] required for the next... stage"; "cap the strength of the stage one
// monsters... they'll be capped at... tier 13, until... you've beaten the listener maybe like 3 times and then... start
// increasing again to start matching your power level".
//
// Stage 1 is Aperture tiers 1–12; every creature in the game as of release 273 is Stage 1. The first Listener kill opens
// Stage 2 (tiers up to 24); each later stage takes `killsPerStage` more. Aperture stops growing at the last point of the
// current stage's top tier (a save already past it keeps what it has). Stage 1 world beasts (and the Questing Beast) match
// the Wayfarer until they reach tier `freezeTier`; their strength is then held at that moment's measure until the Wayfarer
// has felled the Listener `thawKills` times, when it catches up; from then on it catches up once per Listener kill (331).
// State: save.farArray.listeners (the Listener kills, far-array.ts) and save.beastCeiling (additive; set once, when frozen).
import { apertureTier, APERTURE_THRESHOLDS } from "./world.js?v=r375-5713421fb42c";

export const STAGES = { tiersPerStage: 12, firstKills: 1, killsPerStage: 2, freezeTier: 13, thawKills: 3 };

export const listenerKills = (save) => Math.max(0, Math.floor(Number(save?.farArray?.listeners) || 0));
// Stage 1 until the first Listener falls; then one stage more for every `killsPerStage` kills.
export function stageOf(save) {
  const k = listenerKills(save);
  return k < STAGES.firstKills ? 1 : 2 + Math.floor((k - STAGES.firstKills) / STAGES.killsPerStage);
}
export const tierCap = (save) => stageOf(save) * STAGES.tiersPerStage;
// The most Aperture the current stage allows: one short of the next stage's first tier.
export function apertureCeiling(save) {
  const next = APERTURE_THRESHOLDS[tierCap(save)];
  return Number.isFinite(next) ? next - 1 : Infinity;
}
// What an Aperture gain leaves: never past the stage's ceiling, never below what the save already holds.
export function cappedAperture(save, value) {
  const have = Math.max(0, Number(save?.perception?.aperture) || 0);
  return Math.max(have, Math.min(Math.max(0, Number(value) || 0), apertureCeiling(save)));
}

// The Stage 1 beasts' strength: `ref` is the live tuning reference (world-beasts.ts beastTuningReference). From
// `freezeTier` it is held at a measure taken once (save.beastCeiling). Release 331 (Tim, 2026-10-23: "when you get to
// infinite 3, they'll stop scaling with you... until you've beaten 3 listeners... every time you beat the listener... the
// world bosses will catch up to your strength... and they'll stay capped there until you beat the listener again"): from
// the `thawKills`-th Listener on, each Listener kill retakes the measure (beastCatchUp, at the kill; or, for a kill this
// save made before 331, at the next tuning), and the beasts hold there until the next kill. `kills` on the measure is the
// Listener count it was taken at (absent on measures taken before 331).
const FIELDS = ["level", "perHit", "maxHp", "guard"];
export function ensureBeastCeiling(save) {
  const c = save?.beastCeiling;
  if (c === undefined) return null;
  if (!c || typeof c !== "object" || !FIELDS.every((k) => Number.isFinite(Number(c[k])))) { delete save.beastCeiling; return null; }
  for (const k of FIELDS) c[k] = Number(c[k]);
  if (c.kills !== undefined) { if (Number.isFinite(Number(c.kills))) c.kills = Math.max(0, Math.floor(Number(c.kills))); else delete c.kills; }
  return c;
}
const measure = (ref, kills) => ({ ...Object.fromEntries(FIELDS.map((k) => [k, ref[k]])), kills });
export function stageOneBeastReference(save, ref) {
  if (apertureTier(save?.perception?.aperture || 0) < STAGES.freezeTier) return ref;
  const k = listenerKills(save); let c = ensureBeastCeiling(save);
  if (!c || (k >= STAGES.thawKills && (c.kills ?? -1) < k)) c = save.beastCeiling = measure(ref, k);
  return { ...ref, ...Object.fromEntries(FIELDS.map((f) => [f, Math.min(ref[f], c[f])])) };
}
// A Listener just fell (game.ts): from the `thawKills`-th kill, the beasts catch up to the Wayfarer as they stand now.
// `ref` is the unheld reference (world-beasts.ts liveBeastReference).
export function beastCatchUp(save, ref) {
  const k = listenerKills(save);
  if (apertureTier(save?.perception?.aperture || 0) < STAGES.freezeTier || k < STAGES.thawKills) return false;
  save.beastCeiling = measure(ref, k); return true;
}
