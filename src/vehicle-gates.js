// Vehicle progression (release 315; Tim, 2026-10-22, with his answers: "Infinite II" and "Infinite III" are the Aperture bands
// of those names, tiers 12 and 13; the skiff and the Tidemantle stay early). "you can't dive until you get to infinite 2...
// those quests don't become available until infinite 2"; "you can't get the submersible until you're at infinite 2 and...
// you've beaten either the void Walker or... the listener"; "you can't go underwater with a submersible until... infinite
// tier 3, and... to unlock underwater travel... you have to have beaten the void Walker and... the listener at least once";
// "infinite tier 3 and beyond... after you've unlocked the second gate with the listener... take the submersible on land";
// "whenever you have unlocked the... fourth or fifth gate... a drone". Gates are the Gate's climbs (far-array.ts; release 704:
// the Gate at tier g climbs after g more Listener kills, so the second Gate opens on the third kill). Pure rules; boats.ts, diving.ts and game.ts ask these.
import { apertureTier } from "./world.js?v=r755-c3a9aa62bf91";
import { listenerKills } from "./stages.js?v=r755-c3a9aa62bf91";

export const VEHICLE_GATES = { diveTier: 12, subTier: 12, underwaterTier: 13, mechTier: 13, mechGates: 2, droneGates: 4 }; // Gates opened (far-array.ts: the Gate at tier g climbs after g more Listener kills)
const TIER_NAMES = { 12: "Infinite II", 13: "Infinite III" };
const tierOf = (save) => apertureTier(save?.perception?.aperture || 0);
const walkerSlain = (save) => (Number(save?.worldBeasts?.voidWalker?.slain) || 0) > 0;
const listenerSlain = (save) => listenerKills(save) > 0;
const gatesOpened = (save) => Math.max(0, (Number(save?.farArray?.gate) || 1) - 1); // the Gate starts at tier 1; each climb opens one

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
  const tier = tierOf(save) >= VEHICLE_GATES.mechTier, gates = gatesOpened(save) >= VEHICLE_GATES.mechGates, ok = tier && gates;
  return { ok, why: ok ? "" : `Walking the submersible ashore needs the ${TIER_NAMES[VEHICLE_GATES.mechTier]} band${tier ? "" : " (not yet)"} and the second Gate unlocked (${Math.min(gatesOpened(save), VEHICLE_GATES.mechGates)}/${VEHICLE_GATES.mechGates} Gates opened).` };
}
export function droneGate(save) {
  const ok = gatesOpened(save) >= VEHICLE_GATES.droneGates;
  return { ok, why: ok ? "" : `A drone answers once the fourth Gate is unlocked (${Math.min(gatesOpened(save), VEHICLE_GATES.droneGates)}/${VEHICLE_GATES.droneGates} Gates opened).` };
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
export const MECH_POWER = { burn: 1, every: 20, damage: .25, guard: .15, boost: 2, replate: 3, replateDelay: 20 }; // release 391 (Tim: "when the plating breaks... three cinder iron"): replate was 1; 599: re-forging takes `replateDelay` seconds
// Wading through lava in the robot (release 475; Tim: "when I have power armor I can walk through the lava... the power armor
// doesn't take damage, but I take damage... I overheat... I can still die from walking in the lava, so there's still
// consequence"). While the robot is up (either mode), lava no longer swallows the Wayfarer: they walk on through it, and the
// heat takes `heat` of their maximum health every second, past the plating and every guard. Boosting over it costs nothing.
export const MECH_LAVA = { heat: .1 };
// The robot in water (release 507; Tim: "when I go into the water, I lose stamina, and I can't go between tiles... make sure
// that the submersible suit works very well"). The robot is the submersible frame walking: while it is up (either mode) it
// wades rivers, flooded halls and the sea, with or without the Tidemantle, at `speed`× the walking pace, costs no stamina,
// takes no bite from dungeon water, and crosses a section's edge anywhere the water runs on (like a skiff).
export const MECH_WATER = { speed: .9 };
// The robot in the Far Sleep's star-voids (release 509; Tim: "when you go through them, you should take damage as well
// similar to the lava, and you should die. If you stay in them for too long... it'll destroy your suit... beyond the corridor
// you don't have the necessary power or... permissions... to actually exist there. The suit gives you some protection from
// the... yawning void, but it's very little protection"). Only the robot can step into a star-void. There it loses `plate`
// plating a second (never re-forged from iron there) and the Wayfarer `heat` of their maximum health a second, past every
// guard. When the plating runs out in the void the robot is destroyed (a new frame must be forged) and the Wayfarer is lost.
export const MECH_VOID = { plate: 15, heat: .06 };
// One frame in a star-void. Returns { gone, torn }: gone when the robot is destroyed.
export function voidTick(save, dt) {
  const m = save.mech; if (!m?.active) return { gone: true, torn: false };
  m.plate = Math.max(0, (Number(m.plate) || 0) - MECH_VOID.plate * dt);
  if (m.plate > 0) return { gone: false, torn: false };
  m.active = false; m.built = false; m.plate = MECH.plate; delete m.empowered; delete m.burnIn; return { gone: true, torn: true };
}
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
    ...(m.empowered === true && m.built === true && m.active === true && mode === "robot" ? { empowered: true, burnIn: Math.max(0, Math.min(MECH_POWER.every, Number(m.burnIn) || 0)) } : {}),
    ...(m.built === true && m.active === true && Number(m.replateIn) > 0 ? { replateIn: Math.min(MECH_POWER.replateDelay, Number(m.replateIn)) } : {}) }; // release 599
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
// Release 647 (Tim, 2026-11-01: "you jump, and then you hit the jump button again, and you hold it... you boost all the way up to...
// 5... you'd have to feather it... fuel... if it drops you... you're gonna die... vertical traversal on the trees... don't need to
// change anything about how the drone works in the dungeon"): on the overworld the drone is a booster. Jump, then press Jump again
// in the air: while Jump is held its thrust (`thrust` levels/s², against `gravity`) lifts the Wayfarer, climbing at most `rise`
// levels a second and no higher than `max` levels above where the jump began (holding at the top hovers there, and the Wayfarer can
// move across), burning `burn` of its carry a second. Let go and they fall, gathering speed. A landing hurts by its speed, as a
// fall from the height that speed is worth (v²/2g): feathered down it is gentle; dropped from the top, or by a booster run dry,
// it is a fall of four levels or more, and death.
export const DRONE_LIFT = { thrust: 30, rise: 4, max: 5, gravity: 14, burn: 1, engage: "The drone grips your shoulders and its booster roars. Hold Jump to climb, feather it to hold, let go to fall.", empty: "The booster sputters out of lift!", none: "The drone has no lift left: land and let it recharge." };
// The drone fizzle (Tim, 2026-11-04: "If you try to fly the drone across some area of the Pentagon that would break the whole map, the
// drone just isn't able to fly there. You can start flying there, but your drone will explode or fizzle out, noticeably, so you
// know: something is wrong with the Corridor here; the rules are different here. Then you fall and die. The drone works wherever
// else you want."): the airspace of the closed blocks a structure's route runs through. A booster lift whose footprint crosses into
// one of these tiles fizzles (game.ts droneFizzle): sparks and a burst on the drone, the zone's message, the drone stowed and the
// lift ended, so the ordinary fall rule settles the landing (landscape.ts fallDamage: 1 level 0, 2 levels 15%, 3 levels 40% of
// maximum health, 4 or more fatal). `zones` are tried in order, each matching on tile fields (true: the field is set; a string:
// equal to it). A tile with an `allow` flag set is never a zone (for ledges, balconies and the like that a later layout makes
// flyable); a tile whose `optIn` field names a zone id is in that zone whatever else it is (for roofs a later layout makes walkable
// but that must not be flown over). Ordinary great-building, compound and labyrinth roofs and the castle keep's roof are open
// ground, not blocked, and are never zones; courts are open air too (the drone may lift you down into one from the keep's roof).
export const DRONE_FIZZLE = {
  allow: ["droneOk"], optIn: "droneZone",
  zones: [
    { id: "pentagon", match: { pentagon: true, blocked: true }, message: "The drone's lift fizzles out over the Pentagon's walls. The Corridor's rules are different here." },
    { id: "castle", match: { kind: "castleWall", landscape: "castle", greatBuilding: true, blocked: true }, message: "The drone's lift fizzles out over the Great Castle. The Corridor's rules are different here." },
  ],
  burst: 1.2, // seconds the sparks and the burst show
  sparks: 14,
};
const zoneById = (id) => DRONE_FIZZLE.zones.find((z) => z.id === id) || null;
// The zone a single tile belongs to, or null.
export function droneZoneOf(tile) {
  if (!tile) return null;
  if (DRONE_FIZZLE.allow.some((k) => tile[k])) return null;
  const opt = tile[DRONE_FIZZLE.optIn]; if (typeof opt === "string" && zoneById(opt)) return zoneById(opt);
  return DRONE_FIZZLE.zones.find((z) => Object.entries(z.match).every(([k, v]) => v === true ? !!tile[k] : tile[k] === v)) || null;
}
// The zone the Wayfarer's footprint at (x, y) reaches into (the same box footprintOpen tests), or null. Pure; no allocation.
export function droneForbiddenAt(map, width, x, y) {
  const tiles = map?.tiles; if (!tiles || !(width > 0)) return null;
  const height = tiles.length / width, x0 = Math.floor(x + .24), x1 = Math.floor(x + .76 - 1e-6), y0 = Math.floor(y + .5), y1 = Math.floor(y + .88 - 1e-6);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue; const z = droneZoneOf(tiles[ty * width + tx]); if (z) return z; }
  return null;
}
export function fuelMax(mode, empowered = false) { return mode === "drone" ? DRONE.carry : MECH.boost * (empowered ? MECH_POWER.boost : 1); }
export function setMechMode(save, mode) {
  const m = ensureMech(save), next = mode === "drone" ? "drone" : "robot";
  if (next === "drone" && !droneGate(save).ok) return { ok: false, message: droneGate(save).why };
  m.mode = next; m.healCd ??= 0; m.rocketCd ??= 0; m.active = false; delete m.empowered; delete m.burnIn; m.fuel = Math.min(m.fuel, fuelMax(next));
  return { ok: true, message: next === "drone" ? "The frame will call up the drone." : "The frame will call up the robot." };
}
// A blow of `loss` to the Wayfarer in the robot: returns what they keep; the plating takes the rest. Plating that gives out is
// re-forged from cinder iron when there is some (release 383: `replated`); otherwise the robot folds away (`broke`).
// Release 599 (Tim, 2026-10-30: the robot re-plated at once from a large stock of iron, so nothing could hurt him): re-forging
// takes `MECH_POWER.replateDelay` seconds (`replateIn`; the iron is spent when the plating gives out). Until it is done the
// robot stands bare: its guard still softens a blow, but no plating takes any of it. The plating returns in tickMech.
export function mechAbsorb(save, loss) {
  const m = ensureMech(save); if (!m.active || !(loss > 0)) return { kept: loss, broke: false };
  let kept = loss * (1 - MECH.guard - (m.empowered ? MECH_POWER.guard : 0));
  if (m.replateIn > 0) return { kept, broke: false, bare: true };
  const take = Math.min(m.plate, kept); m.plate -= take; kept -= take;
  if (m.plate <= 0) {
    if (ironOf(save) >= MECH_POWER.replate) { save.materials.cinderIron -= MECH_POWER.replate; m.plate = 0; m.replateIn = MECH_POWER.replateDelay; return { kept, broke: false, stripped: true }; }
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
  if (m.replateIn > 0 && m.active) { m.replateIn -= dt; if (m.replateIn <= 0) { delete m.replateIn; m.plate = MECH.plate; out ||= "replated"; } } else if (!m.active) delete m.replateIn; // release 599
  if (!m.active) m.plate = Math.min(MECH.plate, m.plate + MECH.plateRegen * dt);
  if (m.mode === "drone") { m.healCd = Math.max(0, (m.healCd || 0) - dt); m.rocketCd = Math.max(0, (m.rocketCd || 0) - dt); }
  if (grounded) m.fuel = Math.min(fuelMax(m.mode, m.empowered === true), m.fuel + (m.mode === "drone" ? DRONE.carryRecharge : MECH.boostRecharge) * dt);
  return out;
}
