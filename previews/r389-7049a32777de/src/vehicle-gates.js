// Vehicle progression (release 315; Tim, 2026-10-22, with his answers: "Infinite II" and "Infinite III" are the Aperture bands
// of those names, tiers 12 and 13; the skiff and the Tidemantle stay early). "you can't dive until you get to infinite 2...
// those quests don't become available until infinite 2"; "you can't get the submersible until you're at infinite 2 and...
// you've beaten either the void Walker or... the listener"; "you can't go underwater with a submersible until... infinite
// tier 3, and... to unlock underwater travel... you have to have beaten the void Walker and... the listener at least once";
// "infinite tier 3 and beyond... after you've unlocked the second gate with the listener... take the submersible on land";
// "whenever you have unlocked the... fourth or fifth gate... a drone". Gates are the Listener kills (far-array.ts): the
// second gate is unlocked by the second kill. Pure rules; boats.ts, diving.ts and game.ts ask these.
import { apertureTier } from "./world.js?v=r389-7049a32777de";
import { listenerKills } from "./stages.js?v=r389-7049a32777de";

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
// Empowered mode and iron plating (release 383; Tim, 2026-10-24: "you can just autocraft with cinder iron... you'll just stay in
// the robot suit until your cinder iron... runs out, or until you toggle... off... when you're in the robot suit, there's
// like empowered mode... it burns more cinder iron... you get like a damage boost and a defense boost... and maybe like a
// longer flight time"). The frame's button cycles stowed → robot → empowered → stowed. Empowered burns `burn` cinder iron
// every `every` s (the first on switching it on) for `damage` more damage on every blow, magic shot and spell, `guard` more taken
// off each hit, and `boost`× the thrust; with no iron left it drops back to the plain robot. In either mode, plating that
// gives out is re-forged at once from `replate` cinder iron, so the robot stays up; with none, it folds away as before.
// State: save.mech.empowered, save.mech.burnIn (additive).
export const MECH_POWER = { burn: 1, every: 20, damage: .25, guard: .15, boost: 2, replate: 1 };
const ironOf = (save) => Math.max(0, Number(save?.materials?.cinderIron) || 0);
export const mechEmpowered = (save) => save?.mech?.active === true && save.mech.empowered === true && save.mech.mode !== "drone";
// Switches empowered mode on (spending the first iron) or off. Returns { ok, message }.
export function setEmpowered(save, on) {
  const m = save.mech && typeof save.mech === "object" ? save.mech : ensureMech(save); // keeps the caller's reference
  if (!on) { delete m.empowered; delete m.burnIn; m.fuel = Math.min(m.fuel, fuelMax(m.mode)); return { ok: true, message: "The robot settles back to its plain stride." }; }
  if (ironOf(save) < MECH_POWER.burn) return { ok: false, message: `Empowered mode burns cinder iron (${MECH_POWER.burn} every ${MECH_POWER.every}s); you carry none.` };
  save.materials.cinderIron -= MECH_POWER.burn; m.empowered = true; m.burnIn = MECH_POWER.every;
  return { ok: true, message: `Empowered: the robot burns cinder iron (${MECH_POWER.burn} every ${MECH_POWER.every}s) for harder blows, thicker plating and longer flight.` };
}
export function ensureMech(save) {
  const m = save.mech && typeof save.mech === "object" ? save.mech : {}, mode = m.mode === "drone" ? "drone" : "robot", max = fuelMax(mode);
  save.mech = { built: m.built === true, active: m.built === true && m.active === true, plate: Math.max(0, Math.min(MECH.plate, Number.isFinite(Number(m.plate)) ? Number(m.plate) : MECH.plate)),
    fuel: Math.max(0, Math.min(max, Number.isFinite(Number(m.fuel)) ? Number(m.fuel) : max)), cooldown: Math.max(0, Number(m.cooldown) || 0),
    ...(m.mode !== undefined ? { mode, healCd: Math.max(0, Number(m.healCd) || 0), rocketCd: Math.max(0, Number(m.rocketCd) || 0) } : {}),
    ...(m.empowered === true && m.built === true && m.active === true && mode === "robot" ? { empowered: true, burnIn: Math.max(0, Math.min(MECH_POWER.every, Number(m.burnIn) || 0)) } : {}) };
  if (save.mech.empowered) save.mech.fuel = Math.min(fuelMax(mode, true), Math.max(0, Number.isFinite(Number(m.fuel)) ? Number(m.fuel) : max));
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
export function fuelMax(mode, empowered = false) { return mode === "drone" ? DRONE.carry : MECH.boost * (empowered ? MECH_POWER.boost : 1); }
export function setMechMode(save, mode) {
  const m = ensureMech(save), next = mode === "drone" ? "drone" : "robot";
  if (next === "drone" && !droneGate(save).ok) return { ok: false, message: droneGate(save).why };
  m.mode = next; m.healCd ??= 0; m.rocketCd ??= 0; m.active = false; delete m.empowered; delete m.burnIn; m.fuel = Math.min(m.fuel, fuelMax(next));
  return { ok: true, message: next === "drone" ? "The frame will call up the drone." : "The frame will call up the robot." };
}
// A blow of `loss` to the Wayfarer in the robot: returns what they keep; the plating takes the rest. Plating that gives out is
// re-forged from cinder iron when there is some (release 383: `replated`); otherwise the robot folds away (`broke`).
export function mechAbsorb(save, loss) {
  const m = ensureMech(save); if (!m.active || !(loss > 0)) return { kept: loss, broke: false };
  let kept = loss * (1 - MECH.guard - (m.empowered ? MECH_POWER.guard : 0)); const take = Math.min(m.plate, kept); m.plate -= take; kept -= take;
  if (m.plate <= 0) {
    if (ironOf(save) >= MECH_POWER.replate) { save.materials.cinderIron -= MECH_POWER.replate; m.plate = MECH.plate; return { kept, broke: false, replated: true }; }
    m.plate = 0; m.active = false; delete m.empowered; delete m.burnIn; m.cooldown = MECH.rebuild; return { kept, broke: true };
  }
  return { kept, broke: false };
}
// Returns "spent" on the frame empowered mode runs out of iron (it drops back to the plain robot).
export function tickMech(save, dt, grounded) {
  const m = save.mech; if (!m || !m.built || !(dt > 0)) return;
  let out;
  if (m.empowered && m.active) { m.burnIn = (Number(m.burnIn) || 0) - dt; if (m.burnIn <= 0) { if (ironOf(save) >= MECH_POWER.burn) { save.materials.cinderIron -= MECH_POWER.burn; m.burnIn += MECH_POWER.every; } else { delete m.empowered; delete m.burnIn; m.fuel = Math.min(m.fuel, fuelMax(m.mode)); out = "spent"; } } }
  m.cooldown = Math.max(0, (m.cooldown || 0) - dt);
  if (!m.active) m.plate = Math.min(MECH.plate, m.plate + MECH.plateRegen * dt);
  if (m.mode === "drone") { m.healCd = Math.max(0, (m.healCd || 0) - dt); m.rocketCd = Math.max(0, (m.rocketCd || 0) - dt); }
  if (grounded) m.fuel = Math.min(fuelMax(m.mode, m.empowered === true), m.fuel + (m.mode === "drone" ? DRONE.carryRecharge : MECH.boostRecharge) * dt);
  return out;
}
