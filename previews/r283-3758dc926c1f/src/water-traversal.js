// Water traversal, stage one (docs/design-decisions.md "Traversal horizon — water"): a quest-earned Tidemantle
// permits surface swimming on unbridged water. No submersion: lava, pits, chasms and canyons stay lethal, and
// swimming never opens anything below the surface. Data and pure rules; game.ts calls in from movement and defeat.

// Balance table. Swimming is slower, stops stamina regeneration and drains it; an exhausted swimmer takes damage.
export const TIDEMANTLE = {
  swimKinds: ["river", "dungeonWater", "ocean", "deepOcean", "lakeWater", "swampWater", "toxicWater"],
  speed: 0.55,
  staminaDrainPerSecond: 3,
  // Waterbodies (landscape version 2): the Tidemantle is a surface tool; open deep water tires twice as fast.
  drainMultiplier: { deepOcean: 2, swampWater: 0, toxicWater: 0 },
  // Release 185 (Tim, 2026-10-18): bog pools cost maximum health, not stamina. Swimming a swamp or blight pool no
  // longer tires the Wayfarer; it rots instead (MIRE.rotKinds), and at the rot cap lingering poisons as before.
  exhaustedDamagePerSecond: 6,
  // Release 164 (Tim, 2026-10-17: "3 seconds is fine"): in open sea a full 50-stamina bar lasts about 3 s, ocean or deep.
  openSeaPerSecond: 17,
  // Quest: fell the guardian of a drowned place. A dungeon counts when at least this many of its tiles are water.
  minWaterTiles: 6,
  questGuardianKinds: ["mireApostle"],
};

export function isSwimmableKind(kind) { return TIDEMANTLE.swimKinds.includes(kind); }

export function canSwim(save) { return save?.capabilities?.swim === true; }

// True when the hazard under the footprint is surface water the Wayfarer can swim on.
export function swimsThrough(save, hazard) { return !!hazard && canSwim(save) && isSwimmableKind(hazard); }

export function drownedPlace(map) {
  let n = 0;
  for (const t of map?.tiles || []) if (t && isSwimmableKind(t.kind) && ++n >= TIDEMANTLE.minWaterTiles) return true;
  return false;
}

// The Tidemantle quest: a guardian of a flooded dungeon, or a Saint of the Low Water anywhere.
export function tidemantleTrial(area, map, enemy) {
  if (!enemy || enemy.ambient || enemy.noRewards) return false;
  if (TIDEMANTLE.questGuardianKinds.includes(enemy.kind) && (enemy.eliteId || enemy.boss || enemy.objectiveId)) return true;
  const guardian = enemy.boss || enemy.packGuardian || enemy.kind === "hollowMarshal" || enemy.dungeonRole === "objectiveGuardian" || enemy.dungeonRole === "finalBoss";
  return area === "dungeon" && !!guardian && drownedPlace(map);
}

// One-time reward; returns true only the first time.
export function grantTidemantle(save, source) {
  save.capabilities ||= {};
  if (save.capabilities.swim === true) return false;
  save.capabilities.swim = true;
  save.worldFlags ||= {};
  save.worldFlags.tidemantle = String(source || "unknown");
  return true;
}

// Per-frame swim upkeep. Returns damage to apply (0 while stamina lasts).
export function swimUpkeep(player, dt, kind = null, openSea = false) {
  const drain = (openSea ? TIDEMANTLE.openSeaPerSecond : TIDEMANTLE.staminaDrainPerSecond * (TIDEMANTLE.drainMultiplier[kind] ?? 1)) * dt;
  if ((player.stamina || 0) >= drain) { player.stamina -= drain; return 0; }
  player.stamina = 0;
  return TIDEMANTLE.exhaustedDamagePerSecond * dt;
}

// Release r283-3758dc926c1f (Tim, 2026-10-22: "if you go into water in the dungeons... you just start taking health damage... a pretty
// rapid damage over time. And if you go into water when you have no stamina... while you're in a dungeon, you just die").
// Dungeon water (not the dive grottoes) costs `hpPerSecond` of maximum health each second, as plain damage (never the
// maximum itself), on top of the usual stamina drain. A swimmer whose stamina is below `drownBelow` drowns outright.
export const DUNGEON_WATER = { hpPerSecond: .05, drownBelow: 1 };
// Returns the damage to apply this frame (Infinity: drowned).
export function dungeonWaterToll(player, dt, maxHp) {
  if ((player.stamina || 0) < DUNGEON_WATER.drownBelow) return Infinity;
  return Math.max(0, Number(maxHp) || 0) * DUNGEON_WATER.hpPerSecond * dt;
}

// Swamps (landscape version 2). Mire is walkable but slow; the blight mire's murk rots the body: each second in it
// lowers maximum health (save.rot) until the Wayfarer rests at a Wayglass or rest point (or is recovered after a fall).
export const MIRE = {
  slow: { mireWater: .6, toxicMire: .6 },
  // The poisoned murk and water rot; blight bog ground (the dry land between them) stays safe. Release 165: in any area.
  rotKinds: ["toxicMire", "toxicWater", "mireWater", "swampWater"], // release 185 (Tim): ordinary swamp murk and pools rot too; bog ground stays safe
  rotPerSecond: 1.5,
  maxRotFraction: .5,
  // Once rot reaches its cap (maximum health at half), staying in the poison for poisonDelay seconds poisons the
  // Wayfarer: poisonDuration seconds (refreshed while still in it) losing a share of maximum health per second.
  poisonDelay: 5,
  poisonDuration: 10,
  poisonMaxHpFraction: .01,
  poisonMinDps: 2,
};
export function mireSpeed(kind) { return MIRE.slow[kind] || 1; }
export function ensureRot(save) { save.rot = Math.max(0, Number(save.rot) || 0); return save.rot; }
export function rotCap(save) { return Math.floor((Number(save?.maxHp) || 0) * MIRE.maxRotFraction); }
// Effective health ceiling while rotted.
export function healthCeiling(save) { return Math.max(1, (Number(save?.maxHp) || 0) - Math.floor(Number(save?.rot) || 0)); }
// Adds rot for `dt` seconds on `kind`; returns true when rot grew.
export function rotTick(save, kind, dt) {
  if (!MIRE.rotKinds.includes(kind)) return false;
  const before = ensureRot(save);
  save.rot = Math.min(rotCap(save), before + MIRE.rotPerSecond * dt);
  return save.rot > before;
}
// Resting clears the rot; returns how much was cleared.
export function clearRot(save) { const had = Math.floor(ensureRot(save)); save.rot = 0; return had; }
