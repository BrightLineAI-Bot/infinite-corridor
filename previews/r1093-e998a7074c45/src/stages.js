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
import { apertureTier, APERTURE_THRESHOLDS } from "./world.js?v=r1093-e998a7074c45";

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
// Balance pack (Tim, 2026-11-04): damage reduction now climbs past its old 0.45 cap (game.ts DAMAGE_REDUCTION), and nothing
// tuned to hurt the Wayfarer may get easier for it. A held measure whose guard sat at the old cap therefore follows the
// Wayfarer's live reduction above it (beasts, the Questing Beast, the Stalker, the Gate Revenant and the Wardens made from
// it all read this), so what they deal after reduction is unchanged; below the old cap the hold is as before.
export const BEAST_GUARD_HOLD = { oldCap: .45 };
// The gear damage-reduction curve (game.ts reductionCurve reads it; kept here, a leaf every beast reference already imports,
// so the references clamp to the same ceiling without importing game.ts). Balance pack (Tim, 2026-11-04): linear to `soft`,
// then diminishing returns toward `cap` (x / (x + knee) of the room left). Defence pack (Tim, 2026-11-26): cap .75 → .80 and
// knee .6 → 1.0, a higher ceiling that is never reached (raw 3.1 still gives about .70; raw 6 .74; raw 12 .77).
export const DAMAGE_REDUCTION = { soft: .45, cap: .8, knee: 1 };
// A gear reduction as every reference and hit reads it: never below 0, never past DAMAGE_REDUCTION.cap.
export const reductionGuard = (r) => Math.max(0, Math.min(DAMAGE_REDUCTION.cap, Number(r) || 0));
// The Threat Sigil (Tim, 2026-11-26: "you can just make the whole world a threat"): an opt-in difficulty dial set at any
// Wayglass, steps 0 to `max`, 0 by default. Each step: foes deal `damage` more (game.ts damageTakenScale) and carry `health`
// more (Game.applyThreatSigil), for `loot` more gear drops (a second roll on its own seeded `stream`) and `aperture` more
// Aperture (interactions.ts gainAperture). It holds for the whole world while set and can be changed at any Wayglass;
// difficulty otherwise stays tied to distance, and Aperture never drives it. save.threatSigil { step, carry } (additive,
// normalised by ensureThreatSigil in freshSave and migrateSave; `carry` holds the part of an Aperture point not yet paid).
export const THREAT_SIGIL = Object.freeze({ max: 10, damage: .1, health: .15, loot: .1, aperture: .1, stream: "threat-sigil:loot:v1",
  messages: Object.freeze({ up: "The Threat Sigil burns brighter", down: "The Threat Sigil dims", top: "The Threat Sigil burns as bright as it can.", off: "The Threat Sigil is dark.", away: "The Threat Sigil is set at a Wayglass: stand beside one." }) });
export const threatStep = (save) => Math.max(0, Math.min(THREAT_SIGIL.max, Math.floor(Number(save?.threatSigil?.step) || 0)));
export function ensureThreatSigil(save) {
  const t = save.threatSigil && typeof save.threatSigil === "object" && !Array.isArray(save.threatSigil) ? save.threatSigil : (save.threatSigil = {});
  t.step = threatStep(save); const c = Number(t.carry); t.carry = Number.isFinite(c) && c > 0 ? Math.min(.999, c) : 0;
  return t;
}
export function stageOneBeastReference(save, ref) {
  if (apertureTier(save?.perception?.aperture || 0) < STAGES.freezeTier) return ref;
  const k = listenerKills(save); let c = ensureBeastCeiling(save);
  if (!c || (k >= STAGES.thawKills && (c.kills ?? -1) < k)) c = save.beastCeiling = measure(ref, k);
  const held = { ...ref, ...Object.fromEntries(FIELDS.map((f) => [f, Math.min(ref[f], c[f])])) }, live = Number(ref.guard) || 0;
  if (c.guard >= BEAST_GUARD_HOLD.oldCap && live > held.guard) held.guard = live;
  held.guard = reductionGuard(held.guard); // defence pack: the same ceiling as every hit (DAMAGE_REDUCTION.cap)
  return held;
}
// A Listener just fell (game.ts): from the `thawKills`-th kill, the beasts catch up to the Wayfarer as they stand now.
// `ref` is the unheld reference (world-beasts.ts liveBeastReference).
export function beastCatchUp(save, ref) {
  const k = listenerKills(save);
  if (apertureTier(save?.perception?.aperture || 0) < STAGES.freezeTier || k < STAGES.thawKills) return false;
  save.beastCeiling = measure(ref, k); return true;
}
