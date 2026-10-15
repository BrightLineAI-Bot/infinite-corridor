// Water traversal, stage one (docs/design-decisions.md "Traversal horizon — water"): a quest-earned Tidemantle
// permits surface swimming on unbridged water. No submersion: lava, pits, chasms and canyons stay lethal, and
// swimming never opens anything below the surface. Data and pure rules; game.ts calls in from movement and defeat.

// Balance table. Swimming is slower, stops stamina regeneration and drains it; an exhausted swimmer takes damage.
export const TIDEMANTLE = {
  swimKinds: ["river", "dungeonWater", "ocean"],
  speed: 0.55,
  staminaDrainPerSecond: 3,
  exhaustedDamagePerSecond: 6,
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
export function swimUpkeep(player, dt) {
  const drain = TIDEMANTLE.staminaDrainPerSecond * dt;
  if ((player.stamina || 0) >= drain) { player.stamina -= drain; return 0; }
  player.stamina = 0;
  return TIDEMANTLE.exhaustedDamagePerSecond * dt;
}
