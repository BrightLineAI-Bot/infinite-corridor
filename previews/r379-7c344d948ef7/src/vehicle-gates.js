// Vehicle progression (release 315; Tim, 2026-10-22, with his answers: "Infinite II" and "Infinite III" are the Aperture bands
// of those names, tiers 12 and 13; the skiff and the Tidemantle stay early). "you can't dive until you get to infinite 2...
// those quests don't become available until infinite 2"; "you can't get the submersible until you're at infinite 2 and...
// you've beaten either the void Walker or... the listener"; "you can't go underwater with a submersible until... infinite
// tier 3, and... to unlock underwater travel... you have to have beaten the void Walker and... the listener at least once";
// "infinite tier 3 and beyond... after you've unlocked the second gate with the listener... take the submersible on land";
// "whenever you have unlocked the... fourth or fifth gate... a drone". Gates are the Listener kills (far-array.ts): the
// second gate is unlocked by the second kill. Pure rules; boats.ts, diving.ts and game.ts ask these.
import { apertureTier } from "./world.js?v=r379-7c344d948ef7";
import { listenerKills } from "./stages.js?v=r379-7c344d948ef7";

export const VEHICLE_GATES = { diveTier: 12, subTier: 12, underwaterTier: 13, mechTier: 13, mechListeners: 2, droneListeners: 4 };
const TIER_NAMES = { 12: "Infinite II", 13: "Infinite III" };
const tierOf = (save) => apertureTier(save?.perception?.aperture || 0);
const walkerSlain = (save) => (Number(save?.worldBeasts?.voidWalker?.slain) || 0) > 0;
const listenerSlain = (save) => listenerKills(save) > 0;

// Each returns { ok, why } — why names what is still missing.
export function diveGate(save) {
  const ok = tierOf(save) >= VEHICLE_GATES.diveTier;
  return { ok, why: ok ? "" : `Diving opens to you at the ${TIER_NAMES[VEHICLE_GATES.diveTier]} band of the Aperture.` };
}
export function subGate(save) {
  const tier = tierOf(save) >= VEHICLE_GATES.subTier, beaten = walkerSlain(save) || listenerSlain(save);
  return { ok: tier && beaten, why: tier && beaten ? "" : `A submersible needs the ${TIER_NAMES[VEHICLE_GATES.subTier]} band${tier ? "" : " (not yet reached)"} and the Void Walker or a Listener defeated${beaten ? "" : " (neither yet)"}.` };
}
export function underwaterGate(save) {
  const tier = tierOf(save) >= VEHICLE_GATES.underwaterTier, w = walkerSlain(save), l = listenerSlain(save), ok = tier && w && l;
  return { ok, why: ok ? "" : `Taking the submersible under needs the ${TIER_NAMES[VEHICLE_GATES.underwaterTier]} band${tier ? "" : " (not yet)"}, the Void Walker defeated${w ? "" : " (not yet)"} and a Listener defeated${l ? "" : " (not yet)"}.` };
}
export function mechGate(save) {
  const tier = tierOf(save) >= VEHICLE_GATES.mechTier, gates = listenerKills(save) >= VEHICLE_GATES.mechListeners, ok = tier && gates;
  return { ok, why: ok ? "" : `Walking the submersible ashore needs the ${TIER_NAMES[VEHICLE_GATES.mechTier]} band${tier ? "" : " (not yet)"} and the second Gate unlocked (${Math.min(listenerKills(save), VEHICLE_GATES.mechListeners)}/${VEHICLE_GATES.mechListeners} Listeners).` };
}
export function droneGate(save) {
  const ok = listenerKills(save) >= VEHICLE_GATES.droneListeners;
  return { ok, why: ok ? "" : `A drone answers once the fourth Gate is unlocked (${Math.min(listenerKills(save), VEHICLE_GATES.droneListeners)}/${VEHICLE_GATES.droneListeners} Listeners).` };
}

// The robot ashore (release 317; Tim: "take the submersible... on land... walk around... boost over chasms... higher defenses...
// your jump can be longer... hold jump and... boost... fly a little bit... everything else about your character still
// works"). The same frame item: pressed ashore (with mechGate) the first time it is spent to build the robot; after that the
// button calls it up and stows it. While it is up: its own `plate` takes hits first, the Wayfarer keeps `guard` less damage,
// and holding Jump in the air burns `boost` seconds of thrust (refilled at `boostRecharge`/s on the ground) to fly over
// chasms, water and lava. Plating regrows at `plateRegen`/s while stowed; broken, it cannot be called for `rebuild` s.
// State: save.mech = { built, active, plate, fuel, cooldown } (additive).
export const MECH = { plate: 60, guard: .1, boost: 1.6, boostRecharge: 1, plateRegen: 3, rebuild: 20 };
export function ensureMech(save) {
  const m = save.mech && typeof save.mech === "object" ? save.mech : {}, mode = m.mode === "drone" ? "drone" : "robot", max = fuelMax(mode);
  save.mech = { built: m.built === true, active: m.built === true && m.active === true, plate: Math.max(0, Math.min(MECH.plate, Number.isFinite(Number(m.plate)) ? Number(m.plate) : MECH.plate)),
    fuel: Math.max(0, Math.min(max, Number.isFinite(Number(m.fuel)) ? Number(m.fuel) : max)), cooldown: Math.max(0, Number(m.cooldown) || 0),
    ...(m.mode !== undefined ? { mode, healCd: Math.max(0, Number(m.healCd) || 0), rocketCd: Math.max(0, Number(m.rocketCd) || 0) } : {}) };
  return save.mech;
}
// The drone (release 321; Tim: "whenever you have unlocked the... fourth or fifth gate, you can get a drone... it can attack for
// you... heal you on command... or... automatically... if you hold jump, it'll... grab you and you can... fly around... you can
// choose this version or the submersible version to deploy, and it can have like homing rockets"). From droneGate the frame
// can be set (Pack → Supplies) to call up the drone instead of the robot. While it flies beside the Wayfarer it fires a homing
// rocket at the nearest creature within `range` every `rocketEvery` s; it heals `heal` of their health when they press the
// frame's button while hurt, or by itself below `autoHealBelow`, then rests `healCooldown` s; held Jump in the air lets it
// carry them for up to `carry` s (refilled at `carryRecharge`/s on the ground). It takes no hits. State on save.mech:
// mode ("robot" | "drone"), healCd, rocketCd (additive).
export const DRONE = { range: 8, rocketEvery: 1.6, rocketDamage: 10, rocketSpeed: 7.5, rocketLife: 1.8, rocketTurn: 7, heal: .3, healCooldown: 30, autoHealBelow: .3, carry: 3, carryRecharge: 1 };
export function fuelMax(mode) { return mode === "drone" ? DRONE.carry : MECH.boost; }
export function setMechMode(save, mode) {
  const m = ensureMech(save), next = mode === "drone" ? "drone" : "robot";
  if (next === "drone" && !droneGate(save).ok) return { ok: false, message: droneGate(save).why };
  m.mode = next; m.healCd ??= 0; m.rocketCd ??= 0; m.active = false; m.fuel = Math.min(m.fuel, fuelMax(next));
  return { ok: true, message: next === "drone" ? "The frame will call up the drone." : "The frame will call up the robot." };
}
// A blow of `loss` to the Wayfarer in the robot: returns what they keep; the plating takes the rest. Breaking it stows it.
export function mechAbsorb(save, loss) {
  const m = ensureMech(save); if (!m.active || !(loss > 0)) return { kept: loss, broke: false };
  let kept = loss * (1 - MECH.guard); const take = Math.min(m.plate, kept); m.plate -= take; kept -= take;
  if (m.plate <= 0) { m.plate = 0; m.active = false; m.cooldown = MECH.rebuild; return { kept, broke: true }; }
  return { kept, broke: false };
}
export function tickMech(save, dt, grounded) {
  const m = save.mech; if (!m || !m.built || !(dt > 0)) return;
  m.cooldown = Math.max(0, (m.cooldown || 0) - dt);
  if (!m.active) m.plate = Math.min(MECH.plate, m.plate + MECH.plateRegen * dt);
  if (m.mode === "drone") { m.healCd = Math.max(0, (m.healCd || 0) - dt); m.rocketCd = Math.max(0, (m.rocketCd || 0) - dt); }
  if (grounded) m.fuel = Math.min(fuelMax(m.mode), m.fuel + (m.mode === "drone" ? DRONE.carryRecharge : MECH.boostRecharge) * dt);
}
