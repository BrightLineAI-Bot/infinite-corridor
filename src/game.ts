import { rangedWeapon, primaryProfile, SPELLS, affixValue, itemScore, itemTier, ITEM_TIERS, upgradeEquipment, APERTURE_SKILLS, skillRank, apertureBand, APERTURE_BANDS, normalizeItemUpgrade } from "./items.ts";
import {
  generateRegion,
  generateDungeon,
  dungeonDescriptor,
  dungeonId,
  SECTION_SIZE,
  regionalThreat,
  perceptionOverlay,
  apertureTier,
  APERTURE_THRESHOLDS,
  apertureEncounterSpawns,
  perceived,
  sectionExits,
  wayfindingCues,
  structureOccupancy,
} from "./world.ts";

function applyFallenTreeCrossings(map) {
  for (const o of map?.objects || []) {
    if (o.kind !== "tree" || o.state !== "fallen" || !o.crossingTiles) continue;
    for (const p of o.crossingTiles) {
      const i = p.y * 32 + p.x, t = map.tiles[i];
      if (t?.environment) map.tiles[i] = { ...t, kind: "logBridge", blocked: false, bridgeOver: t.environment };
    }
  }
}
import { ensureSlots, slotted, pairingMods, slotReadiness } from "./spell-slots.ts";
import { generateGrotto, DIVE_GENERATOR, GROTTO } from "./grottoes.ts";
import { DIVE, diveSite, diveId, canDive, diveSiteHint, grantLens, buyRig, breathe, generateDiveSite } from "./diving.ts";
import { seaSpawns, seaCombatantFields, updateSeaCreature, SEA_CREATURES, SEA_HABITATS, leviathanTrophy, LEVIATHAN_TROPHY } from "./sea-creatures.ts";
import { WOOD, woodFor, addWood, buildSkiff, SAILABLE_DEEP, loseWood } from "./boats.ts";
import { aboard, sailable, BOAT, buySkiff, repairSkiff, repairCost, board, disembark, hullAbsorb, hullStrike, sailStep, steer, ensureBoatState } from "./boats.ts";
import { OPEN_SEA_VERSION, seaHazards, tickSeaHazards, bergAt, waveCrest, stormAt } from "./open-sea.ts";
import { canSwim, swimsThrough, tidemantleTrial, grantTidemantle, swimUpkeep, TIDEMANTLE, mireSpeed, rotTick, healthCeiling, clearRot, MIRE, ensureRot, rotCap } from "./water-traversal.ts";
import { createCombatant, dodge, playerAttack, enemyBodyRadius, MELEE_PATTERNS, enemyMeleeGeometry, pointInEnemyMelee } from "./combat.ts";
import {
  applyInteraction,
  validActions,
  recordNpcDamage,
  dungeonHistory,
  abandonDungeon,
  journalOnce,
  gainAperture,
  progressLead,
} from "./interactions.ts";
import { ensurePerception } from "./types.ts";
import { generateItem } from "./items.ts";
import { echoEvent, tickEchoes, echoDrop, pounceBonus, ECHOES } from "./echoes.ts";
import { riftStep, tickRiftCharges, skillDurationScale, extraReduction, strikeAmplifier, onConstellationDodge, onConstellationMelee, onConstellationKill, onSkillEnded, tickConstellation } from "./constellation.ts";
import { hostLoadout, glyphHit, glyphDamage, echoPlan, tickGlyphStatus, discoverResonances, glyphDrop, salvageDust, GLYPHS, RESONANCES } from "./glyphs.ts";
import { hashSeed } from "./random.ts";
import{ELITE_KINDS,eliteVariant,ensureEliteState,recordPortalPrey,completeElite,gravityPull,addEliteHazard,tickEliteHazards,tickEliteStatus,cleansePoison,applyPoison,applyStrongPoison}from'./elites.ts';
import{domainSectionAt,HUNT_FOUNDRY,huntTraceStage,admittedFoundrySpawn,refreshViewportBoard,generatedHuntSpawn,foundryCandidate,foundryEncounter,validateFoundryCandidate,activeViewportHunt,completeViewportHunt,recordViewportArrival,domainEncounterPlan,completeDomainBoss,manifestationMechanics,ensureHuntInstance,beginHuntInstance,abandonHuntInstance,completeHuntInstance,cleanupHuntInstance,recordPeoplePlace,resolveHuntDestination}from'./foundry.ts';
import{ensureCorridorSystems,storySiteFor,recordSectionVisit,recordCreatureEncounter,recordCreatureDefeat,recordRevelationLead}from'./story.ts';
import{generateVariedDungeon,generateUnifiedDungeon,generateBespokeArena,populateDungeonEncounters,DUNGEON_ACTIVE_CAP}from'./arenas.ts';
import{applyDungeonDiscovery,discoveryForLevel,dungeonChunkId,revealDungeonAt}from'./dungeon-framework.ts';
import{ensureSceneState,queueScene}from'./scenes.ts';
import { buildEnemyProjectilePattern, advanceEnemyProjectileBehaviors, enemyPatternWindup, tuneDungeonThreat } from "./enemy-patterns.ts";
import { varyDungeonLayout } from "./dungeon-variation.ts";
import { generateExpeditionDungeon, DUNGEON_GENERATOR_V5 } from "./underlands.ts";
import { relayNodeDecision, placeRelayNode, ensureRelayNetwork } from "./relay-network.ts";
import { applyLandscape, biomeFor, openSeaSection, canStep, LANDSCAPE_VERSION, DEEP_WATER, LETHAL_KINDS, elevationAt, fallDamage, tileUnder, nearestReturnable, canReturnTo, safeVoidScarTransition, liftAt } from "./landscape.ts";
import { GATE_REVENANT, tuneGatePredator, updateGatePredator, resetGateAttack, nanoScatters, glyphsReachSwarm, CRYSTAL, reflectShotStep, MONSTER_PACK, PACK_KINDS, MONSTER_PACK_VERSION, guardianKindFor, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime, packCombatantFields, populateOverworldPack, isDungeonRoamer, isDungeonHunter } from "./monster-pack.ts";
import { HAMLET_VERSION, applyHamlet, hamletSection } from "./settlements.ts";
import { addStrange, touchStrange } from "./strange.ts";
import { DIG, planDig, ensureShovel, dig, applyTunnels, wallGlints, addDigSpot, digSpot } from "./digging.ts";
import { linkedExit, mouthsIn, placeMouth } from "./linked-dungeons.ts";
import { TYRANT_HUNT, tyrantVisit, tickTyrantHunt, tyrantRisePoint, countTyrantRise } from "./tyrant-hunt.ts";
import { TRAVEL_VERSION, applyTrails, addTravelers, addReciter, addDungeonReciter, addElder, addDungeonElder, addWanderer, tickTravelers, wandererArrive, wandererKill } from "./travelers.ts";
import { WORLD_BEASTS, BEAST_HOMES, RETREAT, worldBeastFor, worldBeastTriesLeft, tuneWorldBeast, worldBeastSlain, worldBeastPlayerFell, worldBeastPatience, beginRetreat, beginDungeonRetreat, worldBeastForDungeon, retreatTarget, retreatPath, retreatCrossed, retreatEnded, worldBeastsLost, walkerReachableTiles, walkerRetreatDoors, applyVoidScars, consumeVoidTerrain } from "./world-beasts.ts";
import { QUESTING_BEAST, questingBeastFor, questingBeastTriesLeft, tuneQuestingBeast, questingBeastSlain, questingBeastPlayerFell } from "./questing-beast.ts";
import { arrayPylons, runName, FAR, LISTENER_FORMS, ensureFarArray, arrayMouthAt, beginArrayRun, isArrayRun, runBossSpawn, summonSpawn, scaleForGate, summonThresholds, listenerHides, guardianFelled, listenerFelled, piecesNeeded, boonTotals, tuneArrayBoss } from "./far-array.ts";
import { addSkirmish, skirmishFields, updateSkirmisher } from "./skirmishes.ts";
import { requiredBossId, registerDungeonBosses, recordDungeonBossDefeat, claimDungeonPayoff, installCompletionExit } from "./dungeon-completion.ts";
const remaining = (v, n) => Math.max(0, Number(v || 0) - n);
export const EQUIPMENT_CAPACITY = 60;
export function pinDungeonLayout(save, id) {
  const history = dungeonHistory(save, id);
  const visited = () => history.visits > 0 || Object.keys(save.session.areas || {}).some(key => key === id || key.startsWith(id + ':level:'));
  if (history.gatePredatorSpawnThreshold == null) history.gatePredatorSpawnThreshold = visited() || history.layoutVersion !== undefined ? GATE_REVENANT.legacySpawnPerThousand : GATE_REVENANT.spawnPerThousand;
  if (history.layoutVersion === undefined) history.layoutVersion = visited() ? 0 : 1;
  // Dungeon Monster Pack: only histories that have never been entered adopt the new population and guardians.
  if (history.monsterPack === undefined) history.monsterPack = visited() ? 0 : MONSTER_PACK_VERSION;
  // Relay Network: decided once, before the first visit; crossings entered before this release never gain a relay.
  relayNodeDecision(save, id, history, `dungeon:${save.seed}:g${save.worldGeneration}`);
  return history;
}
export function generatePinnedDungeon(save, id, options = {}) {
  const history = pinDungeonLayout(save, id), canonical = `dungeon:${save.seed}:g${save.worldGeneration}`;
  // Generator 5 (Underlands) only for histories never generated before; pinned histories keep their generator.
  const fresh = history.generatorVersion === undefined && id !== canonical && !save.session.areas[id];
  if (history.generatorVersion === undefined) history.generatorVersion = id === canonical || save.session.areas[id] ? 2 : DUNGEON_GENERATOR_V5;
  // Release 146: dungeons first generated from now on may use the automaton layout (pool 2) and threefold layout 2.
  if (fresh && history.layoutPool === undefined) history.layoutPool = 4; // release 148: the organic pattern catalogue (pool 3: release 147's)
  if (fresh && history.threefoldLayout === undefined && id.endsWith(':deep-v2:threefold')) history.threefoldLayout = 2;
  let map;
  // Dive generator pinned per history: 1 = the release-107 Sunken Reach, 2 = themed grottoes (release 108).
  if (id.startsWith('dive:')) map = (history.diveGenerator ?? 1) >= 2 ? generateGrotto(save.seed, id) : generateDiveSite(save.seed, id);
  else if (/^(arena:|hunt-arena:|hunt-instance:)/.test(id)) map = generateBespokeArena(save.seed,id,{kind:id.startsWith('arena:')?'persistent':'temporary',cleared:!!history.resolved});
  else if (!id.includes(':deep-v') && history.generatorVersion === DUNGEON_GENERATOR_V5) map = generateExpeditionDungeon(save.seed,id,history.dungeonRecipe || dungeonDescriptor(id).recipe,{...history.generationOptions,...options,layoutPool:history.layoutPool||1});
  else if (!id.includes(':deep-v') && history.generatorVersion === 4) map = generateUnifiedDungeon(save.seed,id,history.dungeonRecipe || dungeonDescriptor(id).recipe,{...history.generationOptions,...options});
  else if (!id.includes(':deep-v') && history.generatorVersion === 3) map = generateVariedDungeon(save.seed,id,dungeonDescriptor(id).recipe);
  else map = generateDungeon(save.seed,id,{...options,threefoldLayout:history.threefoldLayout||1});
  if (history.layoutVersion === 1 && !map.arena && !id.startsWith('displacement:') && !id.startsWith('elite-portal:') && !id.includes('aperture-annex')) varyDungeonLayout(map,save.seed,id);
  return map;
}
export function mapWidth(map, area = "overworld") { return Math.max(1, Number(map?.width) || (area === "dungeon" ? 24 : 32)); }
export function mapHeight(map, area = "overworld") { return Math.max(1, Number(map?.height) || Math.floor((map?.tiles?.length || mapWidth(map, area)) / mapWidth(map, area))); }
export function deepDungeonProgress(save, id) {
  const history = dungeonHistory(save, id);
  const p = history.deep ||= { version: 1, defeatedWingIds: [], defeatedFinalIds: [], gateOpened: false, completed: false, rewardClaimed: false, activeAnchor: null };
  p.completedObjectiveIds ||= []; p.activatedAnchorIds ||= []; p.openedShortcutIds ||= [];
  p.discoveredLevelIds ||= []; p.completedSceneIds ||= []; p.currentLevelId ||= null;
  p.story ||= { version: 1, storyId: null, started: false, completed: false, completedBeatIds: [], scenesWitnessed: [], rewardClaimed: false, carriedRelic: null };
  return p;
}
export function applyDeepDungeonProgress(save, id, map) {
  if (!map?.deepDungeon && map?.recipe !== "deep-v1") return null;
  const progress = deepDungeonProgress(save, id), defeated = new Set(progress.defeatedWingIds || []);
  progress.name = map.name; progress.archetype = map.archetype || "threefold"; progress.schemaVersion = map.schemaVersion || 1; progress.requiredObjectiveIds = (map.allObjectives || map.objectives || map.wings || []).map((q) => q.id); progress.zoneCount = Math.max(progress.zoneCount||0,map.zones?.length || 1);progress.currentLevelId=map.levelId||progress.currentLevelId;if(map.levelId&&!progress.discoveredLevelIds.includes(map.levelId))progress.discoveredLevelIds.push(map.levelId);
  for (const wing of map.wings || []) if (defeated.has(wing.id) && !progress.completedObjectiveIds.includes(wing.id)) progress.completedObjectiveIds.push(wing.id);
  const completed = new Set(progress.completedObjectiveIds || []), requirements = map.recipe === "deep-v1" ? (map.wings || []).map((wing) => wing.id) : map.finalGate?.requires || progress.requiredObjectiveIds || [];
  progress.gateOpened = progress.gateOpened || requirements.every((objectiveId) => completed.has(objectiveId) || defeated.has(objectiveId));
  map.deepProgress = progress;
  for (const o of map.objects || []) {
    if (o.kind === "deepReturn") Object.assign(o, defeated.has(o.wingId) ? { state: "active", actions: ["return"] } : { state: "dormant", actions: [] });
    if (o.kind === "deepAnchor") Object.assign(o, completed.has(o.unlockObjectiveId) ? { state: "active", actions: ["recover"] } : { state: "dormant", actions: [] });
    if (o.kind === "deepMechanism" && completed.has(o.objectiveId)) Object.assign(o, { state: "active", actions: ["inspect"] });
    if (o.kind === "storyTone" && progress.story.completedBeatIds.includes(o.beatId)) Object.assign(o, { state: "sounded", actions: [] });
    if (o.kind === "storyRelic" && progress.story.carriedRelic === o.id) Object.assign(o, { state: "claimed", actions: [] });
    if (o.kind === "storyGhost" && progress.story.completed) Object.assign(o, { state: "released", actions: [] });
    if (o.kind === "storyActor") Object.assign(o, progress.story.completed ? {state:"departed",actions:[]} : progress.story.started ? {state:"manifest",actions:["witness"]}:{state:"veiled",actions:["witness"]});
    if (o.kind === "storyScene" && progress.story.completedBeatIds.includes(o.beatId)) Object.assign(o,{state:"witnessed",actions:[]});
    if (o.kind === "deepShortcut") {const opened=progress.openedShortcutIds.includes(o.id),available=completed.has(o.unlockObjectiveId);Object.assign(o,opened?{state:"open",actions:["inspect"]}:available?{state:"revealed",actions:["open"]}:{state:"hidden",actions:["inspect"]});for(const p of o.cells||[])if(opened&&!map.tiles[p.y*map.width+p.x]?.voidScar)map.tiles[p.y*map.width+p.x]={...map.tiles[p.y*map.width+p.x],kind:map.floorKind||"deepFloor",blocked:false,routeId:o.id};}
    if (o.kind === "deepPortal") {const active=o.unlockOnCompletion?progress.completed:!o.unlockObjectiveId||completed.has(o.unlockObjectiveId);Object.assign(o,active?{state:"active",actions:["travel"]}:{state:"dormant",actions:["inspect"]});}
    if (o.kind === "sealedGate") Object.assign(o, progress.gateOpened ? { state: "open", blocked: false, actions: ["enter"] } : { state: "sealed", blocked: true, actions: ["inspect"] });
  }
  const width = mapWidth(map, "dungeon");
  for (const p of map.finalGateTiles || []) if (!map.tiles[p.y * width + p.x]?.voidScar) map.tiles[p.y * width + p.x] = { ...map.tiles[p.y * width + p.x], kind: progress.gateOpened ? map.floorKind||"deepFloor" : "sealedGate", blocked: !progress.gateOpened, gateId: map.finalGateId };
  return progress;
}
export function completeDeepStory(save, id, map) {
  const progress = deepDungeonProgress(save, id), story = progress.story, pack = map?.storyPackage;
  if (!pack || story.completed) return false;
  story.completed = true;
  if (!story.scenesWitnessed.includes("resolution")) story.scenesWitnessed.push("resolution");
  if (!story.rewardClaimed) {
    story.rewardClaimed = true;
    if (pack.reward?.aperture) gainAperture(save, pack.reward.aperture, `deep-story:${id}:${pack.id}`, `${pack.title} widened the Wayfarer's Aperture.`);
    if (pack.reward?.weaponSphere) save.materials.weaponSphere = (save.materials.weaponSphere || 0) + pack.reward.weaponSphere;
    if (pack.reward?.armorSphere) save.materials.armorSphere = (save.materials.armorSphere || 0) + pack.reward.armorSphere;
  }
  journalOnce(save, `deep-story-complete:${id}:${pack.id}`, `${pack.title} resolved within ${map.name}. Its final apparition passed beyond the Corridor.`, `${map.name} — ${pack.title}`);
  queueScene(save,"memorial-release",`${id}:${pack.id}`);
  return true;
}
export function enemyDefeatNotice(e, area = "overworld") {
  const exceptional = !!(e.defeatTitle || e.apertureEncounter || e.eliteId || e.dungeonRole || e.boss || ["hollowMarshal", "riftColossus", "gateRevenant"].includes(e.kind));
  if (!exceptional) return null;
  const name = e.eliteName || ({
    hollowMarshal: "Hollow Marshal",
    riftColossus: "Rift Colossus",
    gateRevenant: "Gate Revenant",
  }[e.kind]) || String(e.kind || "enemy").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  let title = "ENEMY FELLED";
  if (e.defeatTitle) title = e.defeatTitle;
  else if (e.kind === "gateRevenant") title = "REVENANT REPULSED";
  else if (e.kind === "riftColossus") title = "COLOSSUS FELLED";
  else if (e.kind === "hollowMarshal" || e.packGuardian) title = "GUARDIAN CLEARED";
  else if (e.eliteId) title = "ELITE SLAIN";
  else if (e.boss) title = "RIFT BOSS BROKEN";
  else if (e.apertureEncounter) title = "BREACH STILLED";
  const clearsCrossing = area === "dungeon" && (!e.dungeonRole||e.dungeonRole==="gateWarden") && (e.boss || e.kind === "hollowMarshal");
  return { title, detail: `${name}${clearsCrossing ? " · crossing cleared" : ""}`, kind: e.boss || e.eliteId ? "danger" : "discovery" };
}

function recordRelayChain(save, areaId) {
  const key = `relay-chain:${areaId}`;
  if (save.worldFlags[key]) return false;
  save.worldFlags[key] = true;
  const count = (save.worldFlags["relay-chain.count"] || 0) + 1;
  save.worldFlags["relay-chain.count"] = count;
  if (count < 5 || save.narrative.facts["relay.networkAnswered"]) return false;
  save.narrative.facts["relay.networkAnswered"] = true;
  queueScene(save,"relay-awakening",areaId);
  save.materials.lumenDust = (save.materials.lumenDust || 0) + 3;
  save.consumables.crossingSigil = (save.consumables.crossingSigil || 0) + 1;
  journalOnce(save, "relay-network-answered", "Five cleared crossings form a readable pattern. Restoring a relay opens its line: passage and connection improve, but hostile things can learn and pursue that route. Severing a relay closes the line permanently: its salvage can be recovered, but its connection and whatever it might have reached are lost. A far relay answers with a coordinate that does not belong to any charted section, leaving three lumen dust and a Crossing Sigil fused into the receiver.", "The Far Signal");
  return true;
}
const MILESTONE_GEAR = [
  [4, { id: "milestone-cinder-pike", name: "Cinder Pike", slot: "primary", power: 5, property: "reach" }],
  [8, { id: "milestone-needle-caster", name: "Needle Caster", slot: "secondary", power: 8, property: "quick" }],
];
export function grantMilestoneGear(save) {
  save.inventory ||= [];
  save.worldFlags ||= {};
  const awarded = [];
  for (const [level, item] of MILESTONE_GEAR) {
    const key = `milestone-gear:${level}`,
      owned = save.equipment?.[item.slot]?.name === item.name || save.inventory.some((q) => q.name === item.name);
    if (save.level < level || save.worldFlags[key]) continue;
    if (owned) save.worldFlags[key] = true;
    else if (save.inventory.length < EQUIPMENT_CAPACITY) {
      save.inventory.push({ ...item });
      save.worldFlags[key] = true;
      awarded.push(item.name);
    }
  }
  return awarded;
}
export function salvageInventoryItem(save, index) {
  const item = save.inventory?.[index];
  if (!item) return null;
  save.inventory.splice(index, 1);
  const iron = Math.max(1, ITEM_TIERS.indexOf(itemTier(item)) + 1);
  save.materials.cinderIron = (save.materials.cinderIron || 0) + iron;
  save.glyphDust = (save.glyphDust || 0) + salvageDust(item);
  for (const g of item.glyphs || []) if (g) save.glyphs[g] = (save.glyphs[g] || 0) + 1; // socketed glyphs come back
  return { item, iron };
}
export function storeInventoryItem(save, item) {
  save.inventory ||= [];
  if (save.inventory.length < EQUIPMENT_CAPACITY) {
    save.inventory.push(item);
    return { stored: true, salvaged: null };
  }
  let weakest = 0;
  for (let i = 1; i < save.inventory.length; i++)
    if (itemScore(save.inventory[i]) < itemScore(save.inventory[weakest])) weakest = i;
  if (itemScore(item) <= itemScore(save.inventory[weakest])) {
    const iron = Math.max(1, ITEM_TIERS.indexOf(itemTier(item)) + 1);
    save.materials.cinderIron = (save.materials.cinderIron || 0) + iron;
    save.glyphDust = (save.glyphDust || 0) + salvageDust(item);
    return { stored: false, salvaged: item, iron };
  }
  const salvaged = salvageInventoryItem(save, weakest);
  save.inventory.push(item);
  return { stored: true, salvaged: salvaged.item, iron: salvaged.iron };
}
// Aperture Resonance: the number of Aperture bands reached beyond Resonant (tier 3), and what each one grants.
export const APERTURE_RESONANCE = { hp: 6, melee: 2, magic: 2 };
export function apertureResonance(save) { return Math.max(0, apertureTier(save?.perception?.aperture || 0) - 3); }
// Release 140: a global multiplier on all monster damage (balance data, one place to tune).
export const ENEMY_DAMAGE_SCALE = 1.3;
export function characterStats(save) {
  const level = Math.max(1, Number(save.level) || 1),
    stats = save.stats || {},
    vigor = Math.max(1, Number(stats.Vigor) || 1),
    finesse = Math.max(1, Number(stats.Finesse) || 1),
    resolve = Math.max(1, Number(stats.Resolve) || 1),
    armorPower = Math.max(0, Number(save.equipment?.armor?.power) || 0),
    charmPower = Math.max(0, Number(save.equipment?.charm?.power) || 0),
    primary = save.equipment?.primary,
    secondary = save.equipment?.secondary,
    armor = save.equipment?.armor,
    charm = save.equipment?.charm,
    active=save.magicSkills?.active?.remaining>0?save.magicSkills.active:null,
    rank=active?skillRank(save,active.id):0,
    // Aperture Resonance (release 136): every Aperture band past Resonant strengthens the Wayfarer.
    resonance=apertureResonance(save),
    boons=boonTotals(save); // Far Gate boons (release 138)
  return {
    maxHp: 60 + (level - 1) * 6 + (vigor - 1) * 8 + resonance * APERTURE_RESONANCE.hp + boons.hp,
    maxStamina: 50 + (level - 1) + (finesse - 1) * 3 + boons.stamina,
    damageReduction: Math.min(
      0.45,
      (resolve - 1) * 0.02 + armorPower * 0.025 + charmPower * 0.01 +
        affixValue(armor, "ward") + affixValue(charm, "ward") + extraReduction(save) + pairingMods(save).guard + boons.guard,
    ),
    meleeBonus:
      Math.max(1, Number(stats.Might) || 1) * 2 +
      (Number(save.weaponLevel) || 0) * 3 +
      Math.floor((level - 1) * 0.6) +
      Math.floor((Number(primary?.power) || 0) * 0.7) +
      affixValue(primary, "attack")+(active?.id==='ember-form'?2+rank*2:0)+(active?.id==='force-channel'?rank*2:0) + resonance * APERTURE_RESONANCE.melee + boons.melee,
    magicBonus:
      Math.max(1, Number(stats.Focus) || 1) +
      Math.floor((level - 1) * 0.45) +
      Math.floor((Number(secondary?.power) || 0) * 0.55) +
      affixValue(secondary, "attack")+(active?.id==='force-channel'?rank*3:0) + resonance * APERTURE_RESONANCE.magic + boons.magic,
    attackReach: affixValue(primary, "reach") + affixValue(secondary, "reach") + affixValue(charm, "reach")+(active?.id==='ember-form'?.12+.06*rank:0),
    moveSpeed: affixValue(armor, "movement") + affixValue(charm, "movement")+(active?.id==='quickening'?.12+.08*rank:0)+pairingMods(save).speed+boons.speed,
    armorPower,
    charmPower,
  };
}
export function syncCharacterStats(save) {
  const oldHp = Math.max(0, Number(save.maxHp) || 60),
    oldStamina = Math.max(0, Number(save.maxStamina) || 50),
    derived = characterStats(save);
  save.maxHp = derived.maxHp;
  save.maxStamina = derived.maxStamina;
  const runtime = save.session?.playerRuntime;
  if (runtime) {
    runtime.hp = Math.min(
      derived.maxHp,
      Math.max(0, Number(runtime.hp) || 0) + Math.max(0, derived.maxHp - oldHp),
    );
    runtime.stamina = Math.min(
      derived.maxStamina,
      Math.max(0, Number(runtime.stamina) || 0) +
        Math.max(0, derived.maxStamina - oldStamina),
    );
  }
  if (Number.isFinite(save.hp))
    save.hp = Math.min(
      derived.maxHp,
      save.hp + Math.max(0, derived.maxHp - oldHp),
    );
  if (Number.isFinite(save.stamina))
    save.stamina = Math.min(
      derived.maxStamina,
      save.stamina + Math.max(0, derived.maxStamina - oldStamina),
    );
  return derived;
}
export function settleProgression(save) {
  save.level = Math.max(1, Math.floor(Number(save.level) || 1));
  save.xp = Math.max(0, Math.floor(Number(save.xp) || 0));
  save.nextXp = Math.max(1, Math.floor(Number(save.nextXp) || 30));
  save.statPoints = Math.max(0, Math.floor(Number(save.statPoints) || 0));
  let levels = 0;
  while (save.xp >= save.nextXp && levels < 100) {
    save.xp -= save.nextXp;
    save.level++;
    save.statPoints++;
    save.nextXp = Math.ceil(save.nextXp * 1.35 + 10);
    levels++;
  }
  grantMilestoneGear(save);
  syncCharacterStats(save);
  return levels;
}
export function awardExperience(save, amount) {
  save.xp = Math.max(
    0,
    (Number(save.xp) || 0) + Math.max(0, Math.floor(Number(amount) || 0)),
  );
  return settleProgression(save);
}
export function tileOpen(map, width, x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    height = map.tiles.length / width,
    tile = map.tiles[iy * width + ix];
  if (ix < 0 || iy < 0 || ix >= width || iy >= height || !tile || tile.blocked)
    return false;
  if (["shackWall", "districtWall"].includes(tile.structure) && tile.wallSides?.length) {
    const lx = x - ix,
      ly = y - iy,
      thickness = 0.22;
    if (
      (tile.wallSides.includes("west") && lx < thickness) ||
      (tile.wallSides.includes("east") && lx > 1 - thickness) ||
      (tile.wallSides.includes("north") && ly < thickness) ||
      (tile.wallSides.includes("south") && ly > 1 - thickness)
    )
      return false;
  }
  return true;
}
export function footprintOpen(map, width, x, y, allowLethalTerrain=false) {
  const left=x+.24,right=x+.76,top=y+.5,bottom=y+.88,height=map.tiles.length/width,overlaps=(a,b,c,d)=>right>a&&left<b&&bottom>c&&top<d;
  for(let ty=Math.floor(top);ty<=Math.floor(bottom-1e-6);ty++)for(let tx=Math.floor(left);tx<=Math.floor(right-1e-6);tx++){
    if(tx<0||ty<0||tx>=width||ty>=height)return false;
    const tile=map.tiles[ty*width+tx],lethal=allowLethalTerrain&&["canyon","river","dungeonWater",...DEEP_WATER].includes(tile?.kind);if(!tile||tile.blocked&&!lethal)return false;
    if(!["shackWall","districtWall"].includes(tile.structure)||!tile.wallSides?.length)continue;
    const thickness=.22;
    for(const side of tile.wallSides){
      const box=side==="west"?[tx,tx+thickness,ty,ty+1]:side==="east"?[tx+1-thickness,tx+1,ty,ty+1]:side==="north"?[tx,tx+1,ty,ty+thickness]:[tx,tx+1,ty+1-thickness,ty+1];
      if(overlaps(...box))return false;
    }
  }
  return true;
}
// The skiff's footprint fits when every tile under it is sailable water (boats.ts). Release 165: a tile that belongs to
// a shack or building (its walls, floor or yard carry `structure` or `buildingId`) blocks the skiff even when the ground
// under it is water, so boats no longer sail through walls.
export function footprintSailable(map,width,x,y){
  const left=x+.24,right=x+.76,top=y+.5,bottom=y+.88,height=map.tiles.length/width;
  for(let ty=Math.floor(top);ty<=Math.floor(bottom-1e-6);ty++)for(let tx=Math.floor(left);tx<=Math.floor(right-1e-6);tx++){const t=map.tiles[ty*width+tx];if(tx<0||ty<0||tx>=width||ty>=height||!sailable(t?.kind)||t.structure||t.buildingId)return false}
  return true;
}
export function footprintTouchesCanyon(map, width, x, y) {
  return [[.24,.5],[.76,.5],[.24,.88],[.76,.88]].some(([ox,oy]) => {
    const tx=Math.floor(x+ox),ty=Math.floor(y+oy);
    return map.tiles[ty*width+tx]?.kind === "canyon";
  });
}
export function footprintHazard(map,width,x,y){
  const tile=map.tiles[Math.floor(y+.72)*width+Math.floor(x+.5)];
  return ["canyon","river","dungeonWater","lava","abyss",...DEEP_WATER].includes(tile?.kind)?tile.kind:null;
}
export function footprintInsideStructure(map,width,x,y){
  if(structureOccupancy(map.tiles,width,x,y))return true;
  const points=[[x+.24,y+.5],[x+.76,y+.5],[x+.24,y+.88],[x+.76,y+.88]];
  return points.some(([px,py])=>{const t=map.tiles?.[Math.floor(py)*width+Math.floor(px)];return!t?.buildingId&&(t?.structure==='shackInterior'||t?.structure==='districtInterior')});
}
export function projectileTileOpen(map,width,x,y){
  const ix=Math.floor(x),iy=Math.floor(y),height=map.tiles.length/width,tile=map.tiles[iy*width+ix];
  if(ix<0||iy<0||ix>=width||iy>=height||!tile)return false;
  if(["canyon","river","dungeonWater",...DEEP_WATER].includes(tile.kind))return true;
  return tileOpen(map,width,x,y);
}
// A following predator must land inside the entered section, not beyond its edge.
export function placeGatePursuer(e, player, map, width) {
  if (footprintOpen(map, width, e.x, e.y) && hasLineOfSight(e, player, map, width)) return;
  const offsets = [[-1.2,0],[1.2,0],[0,-1.2],[0,1.2],[0,0]];
  for (const [dx,dy] of offsets) { const at={x:player.x+dx,y:player.y+dy}; if (footprintOpen(map,width,at.x,at.y) && hasLineOfSight(at,player,map,width)) { e.x=at.x; e.y=at.y; return; } }
  e.x=player.x; e.y=player.y; relocateIfStranded(e,map,width);
}
export function relocateIfStranded(entity, map, width) {
  if (!entity || footprintOpen(map, width, entity.x, entity.y)) return false;
  const height = Math.floor(map.tiles.length / width),
    sx = Math.floor(entity.x),
    sy = Math.floor(entity.y),
    limit = Math.max(width, height);
  for (let radius = 0; radius <= limit; radius++) {
    const minX = Math.max(0, sx - radius),
      maxX = Math.min(width - 1, sx + radius),
      minY = Math.max(0, sy - radius),
      maxY = Math.min(height - 1, sy + radius);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) !== radius) continue;
        if (!footprintOpen(map, width, x, y)) continue;
        entity.x = x;
        entity.y = y;
        return true;
      }
  }
  return false;
}
export function moveAxis(entity, dx, dy, map, width, allowLethalTerrain=false, onStep=null) {
  let moved = false,
    steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.16)),
    sx = dx / steps,
    sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx && footprintOpen(map, width, entity.x + sx, entity.y, allowLethalTerrain) && canStep(entity, map, width, entity.x, entity.y, entity.x + sx, entity.y)) {
      const fromX = entity.x;
      entity.x += sx;
      onStep?.(fromX, entity.y, entity.x, entity.y);
      moved = true;
    }
    if (sy && footprintOpen(map, width, entity.x, entity.y + sy, allowLethalTerrain) && canStep(entity, map, width, entity.x, entity.y, entity.x, entity.y + sy)) {
      const fromY = entity.y;
      entity.y += sy;
      onStep?.(entity.x, fromY, entity.x, entity.y);
      moved = true;
    }
  }
  return moved;
}
function boundedChaseStep(entity,player,map,width,radius=12){
  const sx=Math.round(entity.x),sy=Math.round(entity.y),gx=Math.round(player.x),gy=Math.round(player.y),start=`${sx},${sy}`,queue=[[sx,sy]],seen=new Set([start]),first=new Map([[start,null]]);let best=[sx,sy],bestDistance=Math.hypot(gx-sx,gy-sy);
  for(let index=0;index<queue.length&&index<625;index++){
    const [x,y]=queue[index],distance=Math.hypot(gx-x,gy-y);if(distance<bestDistance){best=[x,y];bestDistance=distance}if(x===gx&&y===gy){best=[x,y];break}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(seen.has(key)||Math.abs(nx-sx)>radius||Math.abs(ny-sy)>radius||!footprintOpen(map,width,nx,ny))continue;seen.add(key);queue.push([nx,ny]);first.set(key,first.get(`${x},${y}`)||[nx,ny])}
  }
  return first.get(`${best[0]},${best[1]}`)||null;
}

// Void Walker ground navigation stays separate from Crystal phasing and from its explicit rift teleports.
export const WALKER_ROUTE = { nodes: 625, distance: 8, segment: .125, speed: 1.35, retry: 1, pause: .2, recent: 8, jumpLift: 1.4, jumpTime: .38 };
export function walkerGroundPositionOpen(map, width, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !map?.tiles || !Number.isInteger(width) || width < 1 || !footprintOpen(map, width, x, y)) return false;
  for (let ty = Math.floor(y + .5); ty <= Math.floor(y + .88 - 1e-6); ty++) for (let tx = Math.floor(x + .24); tx <= Math.floor(x + .76 - 1e-6); tx++)
    if (LETHAL_KINDS.has(map.tiles[ty * width + tx]?.kind)) return false;
  return true;
}
export function moveWalkerGround(entity, dx, dy, map, width) {
  if (![dx, dy].every(Number.isFinite) || Math.max(Math.abs(dx), Math.abs(dy)) > 4) return false;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / WALKER_ROUTE.segment)), sx = dx / n, sy = dy / n; let moved = false;
  for (let i = 0; i < n; i++) {
    if (sx && walkerGroundSegmentOpen(entity, map, width, entity, { x: entity.x + sx, y: entity.y })) { entity.x += sx; moved = true; }
    if (sy && walkerGroundSegmentOpen(entity, map, width, entity, { x: entity.x, y: entity.y + sy })) { entity.y += sy; moved = true; }
  }
  return moved;
}
export function walkerGroundSegmentOpen(entity, map, width, from, to, allowJump = false) {
  const height = Math.floor((map?.tiles?.length || 0) / width);
  if (!Number.isInteger(width) || width < 1 || !(height > 0)) return false;
  if (!Number.isFinite(from?.x) || !Number.isFinite(from?.y) || !Number.isFinite(to?.x) || !Number.isFinite(to?.y)) return false;
  if ([from, to].some(p => p.x < 0 || p.y < 0 || p.x > width - 1 || p.y > height - 1) ||
      Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1) return false;
  // Cardinal segments match moveAxis exactly. A diagonal fractional join could skip a non-ramp corner.
  if (Math.abs(to.x - from.x) > 1e-8 && Math.abs(to.y - from.y) > 1e-8) return false;
  const body = { isPlayer: allowJump, jumping: allowJump, flying: false, phases: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) / WALKER_ROUTE.segment));
  let last = from;
  for (let i = 0; i <= steps; i++) {
    const at = { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps };
    if (!walkerGroundPositionOpen(map, width, at.x, at.y)) return false;
    const a = tileUnder(map, width, last.x, last.y), b = tileUnder(map, width, at.x, at.y);
    // Retreat may jump one ordinary level, including a safe one-level descent. It never jumps a wall,
    // lethal floor, or a larger cliff. Genuine consumed terrain keeps its existing shared scar semantics.
    if (allowJump && map.landscape && a !== b && !safeVoidScarTransition(a, b) && Math.abs((b?.elev || 0) - (a?.elev || 0)) > 1) return false;
    if (!canStep(body, map, width, last.x, last.y, at.x, at.y) || !canStep(body, map, width, at.x, at.y, last.x, last.y)) return false;
    last = at;
  }
  return true;
}
export function walkerDungeonRoute(entity, map, width, { seq = 0, recent = [], target = null } = {}) {
  const empty = { route: [], visited: 0, status: "invalid" }, height = Math.floor((map?.tiles?.length || 0) / width);
  if (!(Number.isInteger(width) && width > 0 && height > 0) || !Number.isFinite(entity?.x) || !Number.isFinite(entity?.y) || entity.x < 0 || entity.y < 0 || entity.x > width - 1 || entity.y > height - 1) return empty;
  const starts = [...new Set([Math.floor(entity.x), Math.ceil(entity.x)])].flatMap(x =>
    [...new Set([Math.floor(entity.y), Math.ceil(entity.y)])].map(y => ({ x, y })));
  starts.sort((a, b) => Math.hypot(a.x - entity.x, a.y - entity.y) - Math.hypot(b.x - entity.x, b.y - entity.y));
  let start = null, join = [];
  for (const at of starts) {
    for (const via of [{ x: at.x, y: entity.y }, { x: entity.x, y: at.y }]) {
      if (!walkerGroundSegmentOpen(entity, map, width, entity, via) || !walkerGroundSegmentOpen(entity, map, width, via, at)) continue;
      start = at; join = Math.hypot(via.x - entity.x, via.y - entity.y) > 1e-8 ? [via] : []; break;
    }
    if (start) break;
  }
  if (!start) return empty;
  const queue = [start], parent = [-1], seen = new Set([`${start.x},${start.y}`]);
  let chosen = -1;
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    if (target && at.x === target.x && at.y === target.y) { chosen = i; break; }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      if (queue.length >= WALKER_ROUTE.nodes) break;
      const next = { x: at.x + dx, y: at.y + dy }, key = `${next.x},${next.y}`;
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height || seen.has(key)) continue;
      if (!walkerGroundSegmentOpen(entity, map, width, at, next)) continue;
      seen.add(key);
      queue.push(next); parent.push(i);
    }
  }
  if (!target) {
    const distance = at => Math.hypot(at.x - entity.x, at.y - entity.y), farthest = queue.reduce((d, at) => Math.max(d, distance(at)), 0);
    const candidates = queue.map((at, i) => ({ at, i })).filter(({ at }) => distance(at) >= Math.min(WALKER_ROUTE.distance, farthest) && distance(at) > .01);
    const fresh = candidates.filter(({ at }) => recent.every(p => Math.hypot(at.x - p.x, at.y - p.y) >= WALKER_ROUTE.distance));
    const pool = fresh.length ? fresh : candidates;
    if (pool.length) chosen = pool[hashSeed(`${entity.id}:walker-patrol:${seq}`) % pool.length].i;
  }
  // Budget exhaustion is not proof of disconnection. A future long-range retreat needs incremental search;
  // it must not repeatedly retry this unchanged bounded plan or substitute a straight line through blocked ground.
  if (chosen < 0) return { route: [], visited: queue.length, status: queue.length >= WALKER_ROUTE.nodes ? "budget" : "no-path" };
  const route = [];
  for (let i = chosen; i >= 0; i = parent[i]) route.push({ ...queue[i] });
  route.reverse();
  if (join.length && Math.hypot(join[0].x - route[0].x, join[0].y - route[0].y) > 1e-8) route.unshift(...join);
  if (Math.hypot(route[0].x - entity.x, route[0].y - entity.y) <= 1e-8) route.shift();
  return { route, visited: queue.length, status: target ? "reached" : "patrol" };
}
// Long retreats keep a Dijkstra frontier between frames. Multiple cardinal joins preserve fractional saved
// positions, and actual route length (not straight-line proximity) chooses the nearest reachable door.
function walkerHeapPush(heap, item) {
  heap.push(item); let i = heap.length - 1;
  while (i) { const p = (i - 1) >> 1; if (walkerHeapOrder(heap[p], item) <= 0) break; heap[i] = heap[p]; i = p; } heap[i] = item;
}
const walkerHeapOrder = (a, b) => a.cost - b.cost || a.y - b.y || a.x - b.x || a.index - b.index;
function walkerHeapPop(heap) {
  const first = heap[0], last = heap.pop(); if (!heap.length) return first;
  let i = 0; while (i * 2 + 1 < heap.length) { let n = i * 2 + 1; if (n + 1 < heap.length && walkerHeapOrder(heap[n + 1], heap[n]) < 0) n++;
    if (walkerHeapOrder(last, heap[n]) <= 0) break; heap[i] = heap[n]; i = n; } heap[i] = last; return first;
}
function walkerCardinalJoins(entity, map, width, from, to) {
  const joins = [];
  for (const via of [{ x: to.x, y: from.y }, { x: from.x, y: to.y }]) {
    if (!walkerGroundSegmentOpen(entity, map, width, from, via, true) || !walkerGroundSegmentOpen(entity, map, width, via, to, true)) continue;
    joins.push([via, to].filter((p, i, all) => Math.hypot(p.x - (i ? all[i - 1].x : from.x), p.y - (i ? all[i - 1].y : from.y)) > 1e-8));
  }
  return joins;
}
export function beginWalkerRetreatSearch(entity, map, width, targets) {
  const height = Math.floor((map?.tiles?.length || 0) / width);
  if (!Number.isInteger(width) || width < 1 || !height || width * height > 65536 || ![entity?.x, entity?.y].every(Number.isFinite)) return null;
  targets = (Array.isArray(targets) ? targets : [targets]).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x <= width - 1 && p.y <= height - 1)
    .map(p => ({ x: p.x, y: p.y })).sort((a, b) => a.y - b.y || a.x - b.x);
  if (!targets.length) return null;
  const corners = p => [...new Set([Math.floor(p.x), Math.ceil(p.x)])].flatMap(x => [...new Set([Math.floor(p.y), Math.ceil(p.y)])].map(y => ({ x, y })));
  const origin = { x: entity.x, y: entity.y }, directTargets = targets.map((target, order) => ({ target, order, cost: Math.abs(target.x - origin.x) + Math.abs(target.y - origin.y) }))
    .filter(({ target }) => ![origin.x, origin.y, target.x, target.y].every(Number.isInteger)).sort((a, b) => a.cost - b.cost || a.order - b.order);
  const state = { map, width, targets, origin, directTargets, directIndex: 0, directTrial: null, queue: [], heap: [], best: new Map(), goals: new Map(), solution: null };
  for (const [order, target] of targets.entries()) for (const at of corners(target)) {
    const tail = walkerCardinalJoins(entity, map, width, at, target)[0]; if (!tail) continue;
    const key = at.y * width + at.x, goals = state.goals.get(key) || [];
    goals.push({ target, tail, order, cost: Math.abs(target.x - at.x) + Math.abs(target.y - at.y) }); state.goals.set(key, goals);
  }
  for (const at of corners(entity)) {
    const join = walkerCardinalJoins(entity, map, width, entity, at)[0]; if (!join) continue;
    const cost = Math.abs(entity.x - at.x) + Math.abs(entity.y - at.y), index = state.queue.length, node = { ...at, cost, index, parent: -1, join };
    state.queue.push(node); state.best.set(at.y * width + at.x, index); walkerHeapPush(state.heap, node);
  }
  return state.heap.length || directTargets.length ? state : null;
}
export function advanceWalkerRetreatSearch(entity, state) {
  if (!state) return { status: "invalid", route: [], visited: 0 };
  const { map, width, queue, heap, best, goals } = state, height = Math.floor(map.tiles.length / width); let work = 0;
  const finish = () => {
    const { index, goal, directRoute } = state.solution, route = []; let root = index;
    if (directRoute) return { status: "reached", route: directRoute, target: goal.target, visited: work };
    for (let i = index; i >= 0; i = queue[i].parent) { root = i; if (queue[i].parent >= 0) route.push({ x: queue[i].x, y: queue[i].y }); }
    route.reverse(); return { status: "reached", route: [...queue[root].join, ...route, ...goal.tail], target: goal.target, visited: work };
  };
  // A fractional source/door may share a shorter legal row or column than either integer anchor.
  // Try both cardinal L joins, subdividing every span into <=1-tile collision-checked segments. These
  // checks share the same 625-work budget as graph expansions, including long direct joins. A direct
  // result is only an incumbent: a cheaper graph route can still beat it below.
  while (state.directIndex < state.directTargets.length && work < WALKER_ROUTE.nodes) {
    const candidate = state.directTargets[state.directIndex];
    if (state.solution && candidate.cost > state.solution.cost + 1e-8) { state.directIndex = state.directTargets.length; break; }
    let trial = state.directTrial;
    if (!trial) {
      work++;
      if (!walkerGroundSegmentOpen(entity, map, width, state.origin, state.origin, true)) { state.directIndex = state.directTargets.length; break; }
      trial = state.directTrial = { mode: 0, phase: 0, at: { ...state.origin }, route: [] };
    }
    const via = trial.mode ? { x: state.origin.x, y: candidate.target.y } : { x: candidate.target.x, y: state.origin.y }, to = trial.phase ? candidate.target : via;
    const dx = to.x - trial.at.x, dy = to.y - trial.at.y;
    if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) {
      if (!trial.phase) { trial.phase = 1; continue; }
      const old = state.solution;
      if (!old || candidate.cost < old.cost - 1e-8 || Math.abs(candidate.cost - old.cost) < 1e-8 && candidate.order < old.goal.order)
        state.solution = { goal: candidate, cost: candidate.cost, directRoute: trial.route };
      state.directTrial = null; state.directIndex++; continue;
    }
    if (work >= WALKER_ROUTE.nodes) break;
    const next = { x: trial.at.x + Math.sign(dx) * Math.min(1, Math.abs(dx)), y: trial.at.y + Math.sign(dy) * Math.min(1, Math.abs(dy)) }; work++;
    if (walkerGroundSegmentOpen(entity, map, width, trial.at, next, true)) { trial.route.push(next); trial.at = next; }
    else if (!trial.mode) state.directTrial = { mode: 1, phase: 0, at: { ...state.origin }, route: [] };
    else { state.directTrial = null; state.directIndex++; }
  }
  if (state.directIndex < state.directTargets.length) return { status: "pending", route: [], visited: work };
  while (heap.length && work < WALKER_ROUTE.nodes) {
    if (state.solution && heap[0].cost > state.solution.cost + 1e-8) return finish();
    const at = walkerHeapPop(heap); work++; const key = at.y * width + at.x;
    if (best.get(key) !== at.index) continue;
    for (const goal of goals.get(key) || []) {
      const cost = at.cost + goal.cost, old = state.solution;
      if (!old || cost < old.cost - 1e-8 || Math.abs(cost - old.cost) < 1e-8 && goal.order < old.goal.order) state.solution = { index: at.index, goal, cost };
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = { x: at.x + dx, y: at.y + dy }, k = next.y * width + next.x, cost = at.cost + 1;
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height || best.has(k) && queue[best.get(k)].cost <= cost + 1e-8 || !walkerGroundSegmentOpen(entity, map, width, at, next, true)) continue;
      const index = queue.length, node = { ...next, cost, index, parent: at.index }; queue.push(node); best.set(k, index); walkerHeapPush(heap, node);
    }
  }
  if (!heap.length && state.solution) return finish();
  return { status: heap.length ? "pending" : "no-path", route: [], visited: work };
}
// Compact terrain comparisons invalidate an incremental search as well as a finished path when a gate, ramp,
// scar or door changes. This does not run a second graph search or spend another node-expansion budget.
const walkerTerrainFlag = t => !t ? -1 : (t.blocked ? 1 : 0) | (LETHAL_KINDS.has(t.kind) ? 2 : 0) | (t.slope ? 4 : 0) | (t.voidScar ? 8 : 0) | (t.pit ? 16 : 0) |
  (t.kind === "void" || t.kind === "sealedGate" ? 32 : 0) | (["districtWall", "shackWall"].includes(t.structure) ? 64 | (t.wallSides || []).reduce((n, side) => n | ({ north: 128, east: 256, south: 512, west: 1024 }[side] || 0), 0) : 0);
function walkerRetreatTopology(map, width, targets, old) {
  const tiles = map.tiles, doors = targets.map(p => `${p.x},${p.y}`).join(";");
  let changed = !old || old.width !== width || old.landscape !== !!map.landscape || old.doors !== doors || old.flags.length !== tiles.length;
  if (!changed) for (let i = 0; i < tiles.length; i++) if (old.flags[i] !== walkerTerrainFlag(tiles[i]) || old.heights[i] !== (Number(tiles[i]?.elev) || 0)) { changed = true; break; }
  return changed ? { width, landscape: !!map.landscape, doors, flags: Int16Array.from(tiles, walkerTerrainFlag), heights: Float64Array.from(tiles, t => Number(t?.elev) || 0) } : old;
}
export function projectileDirection(x, y, facing = "down") {
  const m = Math.hypot(x, y);
  if (m > 0.001) return { x: x / m, y: y / m };
  const [a, b] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[
    facing
  ] || [0, 1];
  return { x: a, y: b };
}
export function updateProjectiles(
  projectiles,
  enemies,
  map,
  width,
  dt,
  onDefeat = () => {},
  onDetonate = () => {},
  player = null,
  onPlayerHit = () => {},
  damageFor = (p) => p.damage,
  onHit = () => {},
  mirrorWalls = [],
) {
  for (const p of projectiles) {
    if (p.dead) continue;
    p.age = (Number(p.age) || 0) + dt;
    if (
      p.path === "boomerang" &&
      !p.returning &&
      p.age >= (Number(p.turnAfter) || p.life / 2)
    ) {
      p.returning = true;
      p.dx *= -1;
      p.dy *= -1;
    }
    const distance = p.speed * dt,
      steps = Math.max(1, Math.ceil(distance / 0.2)),
      step = distance / steps;
    for (let i = 0; i < steps && !p.dead; i++) {
      const next = mirrorWalls.length ? reflectShotStep(p, mirrorWalls, step) : { x: p.x + p.dx * step, y: p.y + p.dy * step };
      const nx = next.x, ny = next.y;
      if (!projectileTileOpen(map, width, nx, ny)) {
        if(p.path==="grenade"){p.dead=true;onDetonate(p);break}
        if (p.path === "boomerang" && !p.returning) {
          p.returning = true;
          p.dx *= -1;
          p.dy *= -1;
          continue;
        } else {
          p.dead = true;
          p.impact = { x: p.x, y: p.y };
          break;
        }
      }
      p.x = nx;
      p.y = ny;
      if(p.hostile&&player&&Math.hypot(player.x+.5-p.x,player.y+.52-p.y)<.46){
        p.dead=true;p.impact={x:p.x,y:p.y};onPlayerHit(p);break;
      }
      if(p.hostile)continue;
      for (const e of enemies)
        if (
          !e.dead &&
          !e.untargetable &&
          !p.hits?.[e.id] &&
          Math.hypot(e.x + 0.5 - p.x, e.y + 0.45 - p.y) <
            0.1 + enemyBodyRadius(e)
        ) {
          alertEnemy(e);
          if (p.path === "grenade") {
            p.dead = true;
            p.impact = { x: p.x, y: p.y };
            onDetonate(p);
            break;
          }
          const dealt = damageFor(p, e);
          e.hp -= dealt;
          if (dealt > 0) { // a scattered blow (release 245) neither flashes nor staggers
            e.hitFlash = 0.18;
            e.hitStun = Math.max(e.hitStun || 0, e.boss || e.eliteId ? 0.1 : 0.18);
          }
          if (p.path === "boomerang" || p.pierce > 0) {
            (p.hits ||= {})[e.id] = true;
            if (p.path !== "boomerang") p.pierce -= 1;
          } else p.dead = true;
          p.impact = { x: p.x, y: p.y };
          if (e.hp <= 0 && !e.dead) {
            e.dead = true;
            onDefeat(e);
          }
          onHit(p, e, dealt);
          break;
        }
    }
    p.life -= dt;
    if (!p.dead && p.life <= 0){p.dead=true;if(p.path==="grenade")onDetonate(p)}
  }
  return projectiles.filter((p) => !p.dead);
}
export function meleeAttackGeometry(player, profile, direction) {
  const d = projectileDirection(direction?.x, direction?.y, player.facing);
  return {
    kind: "sweep",
    x: player.x + 0.5,
    y: player.y + 0.45,
    dx: d.x,
    dy: d.y,
    range: profile.range,
    innerRadius: 0.72,
    arc: profile.arc,
    shape: profile.shape,
  };
}
export function primaryAttackHits(
  player,
  enemies,
  map,
  width,
  profile,
  direction,
) {
  const g = meleeAttackGeometry(player, profile, direction),
    half = (g.arc * Math.PI) / 360,
    hits = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const x = e.x + 0.5 - g.x,
      y = e.y + 0.45 - g.y,
      range = Math.hypot(x, y),
      dot = (x * g.dx + y * g.dy) / (range || 1),
      angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const contactRange = g.range + Math.max(0, enemyBodyRadius(e) - 0.38);
    if (range <= contactRange && (range <= g.innerRadius + Math.max(0, enemyBodyRadius(e) - 0.38) || angle <= half)) {
      let clear = true,
        steps = Math.ceil(range * 4);
      for (let i = 1; i < steps; i++)
        if (
          !tileOpen(map, width, g.x + (x * i) / steps, g.y + (y * i) / steps)
        ) {
          clear = false;
          break;
        }
      if (clear) hits.push(e);
    }
  }
  return hits;
}
export function selectMeleeAim(player, enemies, map, width, reach) {
  const out = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const x = e.x + 0.5 - (player.x + 0.5),
      y = e.y + 0.45 - (player.y + 0.45),
      distance = Math.hypot(x, y);
    if (distance > reach) continue;
    let clear = true,
      steps = Math.ceil(distance * 4);
    for (let i = 1; i < steps; i++)
      if (
        !tileOpen(
          map,
          width,
          player.x + 0.5 + (x * i) / steps,
          player.y + 0.45 + (y * i) / steps,
        )
      ) {
        clear = false;
        break;
      }
    if (clear) {
      const d = projectileDirection(x, y, player.facing),
        f = projectileDirection(0, 0, player.facing);
      out.push({ e, d, distance, alignment: d.x * f.x + d.y * f.y });
    }
  }
  out.sort(
    (a, b) =>
      a.distance - b.distance ||
      b.alignment - a.alignment ||
      String(a.e.id).localeCompare(String(b.e.id)),
  );
  return out[0]?.d || null;
}
export function selectRangedAim(player, enemies, map, width, range = Infinity) {
  return enemies
    .filter((e) => !e.dead && !e.ambient)
    .map((e) => ({
      e,
      distance: Math.hypot(e.x + 0.5 - (player.x + 0.5), e.y + 0.45 - (player.y + 0.45)),
    }))
    .filter((q) => q.distance <= range && hasLineOfSight(q.e, player, map, width, true))
    .sort((a, b) => a.distance - b.distance || String(a.e.id).localeCompare(String(b.e.id)))
    .map((q) => projectileDirection(q.e.x - player.x, q.e.y - player.y, player.facing))[0] || null;
}
export function updateTraps(objects, player, dt, jumping = false) {
  for (const trap of objects.filter((o) => o.kind === "trap")) {
    trap.hits = trap.hits || {};
    trap.timer = Math.max(0, Number(trap.timer) || 0);
    trap.loadGrace =
      trap.loadGrace === undefined ? 0.8 : Math.max(0, trap.loadGrace - dt);
    const near = Math.hypot(player.x - trap.x, player.y - trap.y) < (Number(trap.radius)||0.72);
    if (trap.phase === "armed" && near) {
      trap.phase = "warning";
      trap.timer = Number(trap.warningDuration)||0.7;
      trap.hits = {};
    } else if (trap.phase === "warning") {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.phase = "active";
        trap.timer = Number(trap.activeDuration)||0.35;
      }
    } else if (trap.phase === "active") {
      trap.timer -= dt;
      const rawDirX=Number(trap.dirX),rawDirY=Number(trap.dirY),hasDirection=Number.isFinite(rawDirX)&&Number.isFinite(rawDirY)&&(rawDirX!==0||rawDirY!==0),directionLength=hasDirection?Math.hypot(rawDirX,rawDirY):1,
        dirX=(hasDirection?rawDirX:1)/directionLength,dirY=(hasDirection?rawDirY:0)/directionLength,
        offsetX=player.x-trap.x,offsetY=player.y-trap.y,
        forward=offsetX*dirX+offsetY*dirY,side=Math.abs(offsetX*-dirY+offsetY*dirX),
        inFire=trap.trapType === "fire"&&side<0.55&&forward>=-1&&forward<=(Number(trap.range)||3);
      const inSpikes = trap.trapType === "spikes" && near;
      if (
        !jumping &&
        trap.loadGrace <= 0 &&
        !trap.hits.player &&
        (inFire || inSpikes)
      ) {
        trap.hits.player = true;
        player.hp -= Number(trap.damage)||14;
      }
      if (trap.timer <= 0) {
        trap.phase = "recovery";
        trap.timer = Number(trap.recoveryDuration)||1.6;
      }
    } else if (trap.phase === "recovery") {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.phase = "armed";
        trap.timer = 0;
      }
    }
  }
  return objects;
}
export function updateEffects(effects, enemies, dt, onDefeat = () => {}, damageFor = (fx) => fx.damage, onHit = () => {}) {
  for (const fx of effects) {
    if (fx.delay > 0) { fx.delay -= dt; continue; }
    fx.life -= dt;
    fx.untilPulse -= dt;
    if (fx.untilPulse <= 0) {
      fx.untilPulse += fx.pulse;
      fx.pulseIndex = (fx.pulseIndex || 0) + 1;
      if(fx.hostile)continue;
      for (const e of enemies) {
        if (
          e.dead || e.untargetable ||
          Math.hypot(e.x + 0.5 - fx.x, e.y + 0.45 - fx.y) >
            fx.radius + Math.max(0, enemyBodyRadius(e) - 0.38)
        )
          continue;
        const key = `${fx.pulseIndex}:${e.id}`;
        if (fx.hits[key]) continue;
        fx.hits[key] = true;
        alertEnemy(e);
        const dealt = damageFor(fx, e);
        e.hp -= dealt;
        e.hitFlash = 0.18;
        e.hitStun = Math.max(e.hitStun || 0, e.boss || e.eliteId ? 0.1 : 0.18);
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          onDefeat(e);
        }
        onHit(fx, e, dealt);
      }
    }
  }
  return effects.filter((f) => f.life > 0);
}
function vendorRotation(save) {
  return Math.floor(Math.max(0, Object.keys(save.explored || {}).length - 1) / 4);
}
function rotatingShop(save, vendorId, count = 2) {
  const rotation = vendorRotation(save), r = hashSeed(`${save.seed}:${vendorId}:stock:v2:${rotation}`);
  return {
    version: 2,
    rotation,
    limited: {
      ironbarkTonic: 1 + r % 3,
      lumenPhial: 1 + (r >>> 3) % 3,
      crossingSigil: (r >>> 6) % 3 ? 1 : 0,
    },
    purchased: {},
    equipment: Array.from({ length: count }, (_, i) =>
      generateItem(`${save.seed}:${vendorId}:stock:v2:${rotation}:${i}`, Math.max(2, save.level + (i % 2))),
    ),
  };
}
function refreshShop(save, vendorId, shop, count) {
  const rotation = vendorRotation(save);
  if (!shop) return rotatingShop(save, vendorId, count);
  if (shop.rotation === undefined) shop.rotation = rotation;
  return shop.rotation === rotation ? shop : rotatingShop(save, vendorId, count);
}
function dungeonShop(save,vendorId){const rotation=vendorRotation(save),prior=save.shops?.[vendorId];if(prior?.rotation===rotation&&prior.profile==="dungeon-relics")return prior;return{version:1,profile:"dungeon-relics",rotation,limited:{},purchased:{},equipment:Array.from({length:4},(_,i)=>generateItem(`${save.seed}:${vendorId}:relic-stock:v1:${rotation}:${i}`,Math.max(8,save.level+6+i%2)))}}
export function velaShop(save) {
  save.shop = refreshShop(save, "vendor-vela", save.shop, 3);
  if (save.shop.limited.crossingSigil === undefined)
    save.shop.limited.crossingSigil = 1;
  return save.shop;
}
export function equipInventoryItem(save, index) {
  const item = save.inventory[index];
  if (!item || !["primary", "secondary", "armor", "charm"].includes(item.slot))
    return false;
  const prior = save.equipment[item.slot] || null;
  save.equipment[item.slot] = { ...item };
  save.inventory.splice(index, 1);
  if (prior) save.inventory.push(prior);
  return true;
}
export function buyFromVela(save, id, quantity = 1) {
  if (
    save.worldFlags["vendor-vela:dead"] ||
    save.consequences?.npcs?.["vendor-vela"]?.status === "dead" ||
    save.consequences?.npcs?.["vendor-vela"]?.disposition === "hostile" ||
    save.consequences?.settlements?.["ember-refuge"]?.status === "fallen"
  )
    return { ok: false, message: "Vela’s supplies are no longer available." };
  const shop = velaShop(save),
    defs = { restorativeDraught: 3, ironbarkTonic: 8, lumenPhial: 9, crossingSigil: 30 };
  if (id in defs) {
    const unlimited = id === "restorativeDraught",
      available = unlimited ? 99 : shop.limited[id] || 0,
      cap = 99 - (save.consumables[id] || 0),
      qty = Math.max(
        0,
        Math.min(
          Math.floor(quantity),
          available,
          cap,
          Math.floor(save.currency / defs[id]),
        ),
      );
    if (!qty)
      return {
        ok: false,
        message:
          cap <= 0
            ? "Supply stack is full."
            : available <= 0
              ? "Out of stock."
              : "Not enough marks.",
      };
    save.currency -= qty * defs[id];
    save.consumables[id] = (save.consumables[id] || 0) + qty;
    if (!unlimited) shop.limited[id] -= qty;
    return { ok: true, quantity: qty, message: `Purchased ${qty} ${id}.` };
  }
  const index = shop.equipment.findIndex((i) => i.id === id);
  if (index < 0 || shop.purchased[id])
    return { ok: false, message: "Out of stock." };
  const item = shop.equipment[index],
    price = 12 + item.power * 4;
  if (save.currency < price) return { ok: false, message: "Not enough marks." };
  if (save.inventory.length >= EQUIPMENT_CAPACITY)
    return { ok: false, message: "Pack is full." };
  save.currency -= price;
  save.inventory.push({ ...item });
  shop.purchased[id] = true;
  return { ok: true, quantity: 1, message: `Purchased ${item.name}.` };
}
export function vendorShop(save, vendorId = "vendor-vela") {
  if (vendorId === "vendor-vela") return velaShop(save);
  save.shops ||= {};
  if (vendorId.startsWith("travelers:")) vendorId = "traveler-peddler"; // every wandering peddler shares one rotating stock
  if(vendorId.startsWith("dungeon-merchant:")||vendorId==="deep-v2-fortress-merchant")return save.shops[vendorId]=dungeonShop(save,vendorId);
  save.shops[vendorId] = refreshShop(save, vendorId, save.shops[vendorId], 2);
  return save.shops[vendorId];
}
export function buyFromVendor(save, vendorId, id, quantity = 1) {
  if (String(vendorId).startsWith("travelers:")) vendorId = "traveler-peddler";
  if (vendorId === "vendor-vela" && id !== "crossingSigil")
    return buyFromVela(save, id, quantity);
  const npc = save.consequences?.npcs?.[vendorId],
    settlement =
      vendorId === "vendor-iona"
        ? "glasshaven"
        : vendorId === "vendor-mora"
          ? "coilmarket"
          : vendorId.startsWith("shelter-surprise-")||vendorId.startsWith("dungeon-merchant:")||vendorId==="deep-v2-fortress-merchant" ? null : "ember-refuge";
  if (
    save.worldFlags[vendorId + ":dead"] ||
    npc?.status === "dead" ||
    npc?.disposition === "hostile" ||
    (settlement&&save.consequences?.settlements?.[settlement]?.status === "fallen")
  )
    return { ok: false, message: "This vendor is unavailable." };
  const shop = vendorShop(save, vendorId),
    defs = {
      restorativeDraught: 3,
      ironbarkTonic: 8,
      lumenPhial: 9,
      crossingSigil: 30,
    };
  if (id in defs) {
    const unlimited = id === "restorativeDraught",
      available = unlimited ? 99 : shop.limited[id] || 0,
      cap = 99 - (save.consumables[id] || 0),
      qty = Math.max(
        0,
        Math.min(
          Math.floor(quantity),
          available,
          cap,
          Math.floor(save.currency / defs[id]),
        ),
      );
    if (!qty)
      return {
        ok: false,
        message:
          cap <= 0
            ? "Supply stack is full."
            : available <= 0
              ? "Out of stock."
              : "Not enough marks.",
      };
    save.currency -= qty * defs[id];
    save.consumables[id] = (save.consumables[id] || 0) + qty;
    if (!unlimited) shop.limited[id] -= qty;
    return { ok: true, quantity: qty, message: `Purchased ${qty} ${id}.` };
  }
  const item = shop.equipment.find((i) => i.id === id);
  if (!item || shop.purchased[id])
    return { ok: false, message: "Out of stock." };
  const price = 12 + item.power * 4;
  if (save.currency < price) return { ok: false, message: "Not enough marks." };
  if (save.inventory.length >= EQUIPMENT_CAPACITY)
    return { ok: false, message: "Pack is full." };
  save.currency -= price;
  save.inventory.push({ ...item });
  shop.purchased[id] = true;
  return { ok: true, quantity: 1, message: `Purchased ${item.name}.` };
}
export function actionReadiness(game, now = 0) {
  const attack = Math.max(0, (game.player.attackReadyAt || 0) - now),
    jump = Math.max(0, (game.jumpUntil || 0) - now),
    spell = Math.max(0, game.spellCooldownRemaining || 0);
  return {
    attack: { remaining: attack / 1000, duration: 0.42 },
    tool: {
      remaining: attack / 1000,
      duration: 0.36,
      active: !!game.save.toolMode,
    },
    dodge: {
      remaining: 0,
      duration: 0,
      available: game.player.stamina >= 15,
      cost: 15,
    },
    jump: { remaining: jump / 1000, duration: 0.52 },
    spell: slotReadiness(game.save, "a", spell),
    spell2: slotReadiness(game.save, "b", spell),
    potion: {
      remaining: 0,
      duration: 0,
      count: game.save.consumables?.restorativeDraught || 0,
      available:
        (game.save.consumables?.restorativeDraught || 0) > 0 &&
        game.player.hp < game.save.maxHp,
    },
  };
}
export function enemyDangerRadius(enemy) {
  return Math.max(1.7, Math.max(0, Number(enemy?.threatRange??enemy?.range) || 0) + 0.5) +
    Math.max(0, enemyBodyRadius(enemy) - 0.38);
}
export function attackInRange(enemy, player) {
  return (
    Math.hypot(player.x - enemy.x, player.y - enemy.y) <
    enemyDangerRadius(enemy)
  );
}
export function hasLineOfSight(enemy, player, map, width, projectile=false) {
  const dx = player.x - enemy.x,
    dy = player.y - enemy.y,
    steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 4));
  for (let i = 1; i < steps; i++)
    if (
      !(projectile?projectileTileOpen:tileOpen)(
        map,
        width,
        enemy.x + (dx * i) / steps,
        enemy.y + (dy * i) / steps,
      )
    )
      return false;
  return true;
}
// The crossing guardian of an ordinary dungeon: the Hollow Marshal, or the pack creature that replaced it.
export function isCrossingGuardian(e) { return !!e && (!e.dungeonRole || e.dungeonRole === "gateWarden") && (e.kind === "hollowMarshal" || !!e.packGuardian); }
export function ensureAI(e) {
  if (!e.ai)
    e.ai = {
      homeX: e.x,
      homeY: e.y,
      phase: (hashSeed(e.id) % 628) / 100,
      facing: "down",
      mode: "patrol",
      step: 0,
    };
  if (!Number.isFinite(e.ai.phase)) e.ai.phase = 0;
  if ((e.telegraph || 0) < 0) e.telegraph = 0;
  return e.ai;
}
export function alertEnemy(e) {
  if (!e || e.dead || e.passiveBehavior) return false;
  e.aggro = true;
  ensureAI(e).mode = "chase";
  return true;
}
export function enemyProjectilePattern(shooter,aim,now=0,options={}) {
  return buildEnemyProjectilePattern(shooter,aim,now,options);
}
export function updateEnemyAI(e, player, map, width, dt, now, sanctuary=null,onRanged=()=>{}) {
  if(sanctuary){enforceSanctuary(e,sanctuary);if(Math.hypot(player.x-sanctuary.x,player.y-sanctuary.y)<sanctuary.radius){e.telegraph=0;return false}}
  const ai = ensureAI(e),
    toPlayer = Math.hypot(player.x - e.x, player.y - e.y),
    fromHome = Math.hypot(e.x - ai.homeX, e.y - ai.homeY);
  e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
  e.strike = Math.max(0, (e.strike || 0) - dt);
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
  e.recoil = Math.max(0, (e.recoil || 0) - dt);
  e.hitStun = Math.max(0, (e.hitStun || 0) - dt);
  if (e.hitStun > 0) {
    e.telegraph = 0;
    e.meleePhase = null;
    e.threatRange = null;
    ensureAI(e).mode = "stagger";
    return false;
  }
  if(e.passiveBehavior){
    if(e.passiveBehavior==="vanish"&&toPlayer<2.4){e.dead=true;e.vanished=true;return false}
    let tx,ty,speed=.16;
    if(e.passiveBehavior==="follow"&&toPlayer<6&&toPlayer>1.35){tx=player.x-e.x;ty=player.y-e.y;speed=.28}else{ai.phase=(ai.phase+dt/(e.passiveBehavior==="graze"?3.8:2.8))%(Math.PI*2);tx=Math.cos(ai.phase);ty=Math.sin(ai.phase*.73)}
    const m=Math.hypot(tx,ty)||1;moveAxis(e,tx/m*speed*dt,ty/m*speed*dt,map,width);ai.step=(ai.step+speed*dt)%2;return false;
  }
  if (e.telegraph > 0) {
    e.telegraph = Math.max(0, e.telegraph - dt);
    if (e.telegraph === 0) {
      const pattern=e.meleePhase&&MELEE_PATTERNS[e.meleePhase.id], geometry=pattern?enemyMeleeGeometry(e):null;
      e.strikeGeometry = geometry;
      if(pattern?.dash){const aim=e.meleePhase.aim||projectileDirection(player.x-e.x,player.y-e.y),lateral=e.meleePhase.stage===1?{x:-aim.y,y:aim.x}:{x:0,y:0},distance=pattern.dash,dx=(aim.x+lateral.x*.65)*distance,dy=(aim.y+lateral.y*.65)*distance,steps=Math.ceil(Math.hypot(dx,dy)*5);for(let i=0;i<steps;i++)if(!moveAxis(e,dx/steps,dy/steps,map,width))break;if(pattern.stages===2&&e.meleePhase.stage===0){e.meleePhase.stage=1;e.telegraph=.42;e.threatRange=1.9;return false}}
      e.cooldown = (pattern?.recovery|| (e.kind==='voidSentinel'?.82:e.kind==='cinderWisp'?1.35:1.9))*(e.attackCooldownScale||1);
      e.strike = 0.24;
      const ranged=!pattern&&e.range>=2.5&&!e.instantStrike,clear=(geometry?pointInEnemyMelee(geometry,player):attackInRange(e,player))&&hasLineOfSight(e,player,map,width,ranged)&&(!geometry||hasLineOfSight({x:geometry.x-.5,y:geometry.y-.45},player,map,width));
      if(clear&&ranged){onRanged(e,e.attackAim||projectileDirection(player.x-e.x,player.y-e.y));e.meleePhase=null;e.threatRange=null;return false}
      e.meleePhase=null;e.threatRange=null;return clear;
    }
    return false;
  }
  let tx,
    ty,
    speed = 0.42;
  if (toPlayer < 6 || e.aggro) {
    e.aggro=true;
    ai.mode = "chase";
    tx = player.x - e.x;
    ty = player.y - e.y;
    speed = 0.78;
  } else if (fromHome > 3.5) {
    ai.mode = "return";
    tx = ai.homeX - e.x;
    ty = ai.homeY - e.y;
    speed = 0.58;
  } else {
    ai.mode = "patrol";
    ai.phase = (ai.phase + dt / 1.9) % (Math.PI * 2);
    const angle = ai.phase;
    tx = Math.cos(angle);
    ty = Math.sin(angle * 0.83);
    speed = 0.3;
  }
  speed *= e.speedMultiplier || 1;
  if(ai.mode==="chase"&&ai.detourUntil>now&&Number.isFinite(ai.detourX)){const ddx=ai.detourX-e.x,ddy=ai.detourY-e.y;if(Math.hypot(ddx,ddy)<.14){ai.detourUntil=0}else{tx=ddx;ty=ddy}}
  if(ai.mode==="chase"&&!(ai.detourUntil>now)&&now>=(ai.pathRetryAt||0)&&!hasLineOfSight(e,player,map,width)){ai.pathRetryAt=now+350;const step=boundedChaseStep(e,player,map,width);if(step){ai.detourX=step[0];ai.detourY=step[1];ai.detourUntil=now+3000;tx=step[0]-e.x;ty=step[1]-e.y}}
  const m = Math.hypot(tx, ty) || 1;
  let dx = (tx / m) * speed * dt,
    dy = (ty / m) * speed * dt;
  if (Math.abs(tx) > Math.abs(ty)) ai.facing = tx < 0 ? "left" : "right";
  else ai.facing = ty < 0 ? "up" : "down";
  ai.step = (ai.step + Math.hypot(dx, dy)) % 2;
  if(!moveAxis(e, dx, dy, map, width)&&ai.mode==="chase"&&now>=(ai.pathRetryAt||0)){
    ai.pathRetryAt=now+350;
    const step=boundedChaseStep(e,player,map,width);
    if(step){ai.detourX=step[0];ai.detourY=step[1];ai.detourUntil=now+3000;const px=step[0]-e.x,py=step[1]-e.y,pm=Math.hypot(px,py)||1;moveAxis(e,px/pm*speed*dt,py/pm*speed*dt,map,width)}
  }
  if(sanctuary)enforceSanctuary(e,sanctuary);
  const patternStartRange=e.range<2.5&&e.meleePatterns?.length?Math.max(...e.meleePatterns.map(id=>MELEE_PATTERNS[id]?.range||0)):0;
  if (
    (attackInRange(e, player)||toPlayer<=patternStartRange+enemyBodyRadius(e)) &&
    e.cooldown <= 0 &&
    hasLineOfSight(e, player, map, width, e.range>=2.5&&!e.instantStrike)
  )
    {const phase=(e.boss&&e.hp<=e.maxHp*.5) ? .82 : 1,ids=e.meleePatterns||[],id=e.tentacles&&e.range>=2.5&&toPlayer<=2.8?'longReach':e.range<2.5&&ids.length?ids[e.meleePatternIndex++%ids.length]:null,pattern=id&&MELEE_PATTERNS[id];e.telegraph = Math.max(.48,e.minimumAttackWindup||0,(pattern?.telegraph||enemyPatternWindup(e))*(e.telegraphScale||1)*phase);if(!pattern&&e.range>=2.5&&!e.instantStrike)e.telegraph=Math.max(e.telegraph,enemyPatternWindup(e));e.attackAim=projectileDirection(player.x-e.x,player.y-e.y);if(pattern){e.meleePhase={id,stage:0,aim:{...e.attackAim},target:{x:player.x,y:player.y}};e.threatRange=pattern.range}}
  return false;
}
export function shouldSimulateEnemy(e,player,area="overworld"){
  if(!e||e.dead)return false;
  if(area==="dungeon"){if(e.worldBeast&&(e.aggro||isDungeonHunter(e,area)))return true;/* release 249: hunters patrol and finish their retreat even out of sight */const d=Math.hypot(e.x-player.x,e.y-player.y);return d<=(e.aggro?18:e.boss||e.eliteId?14:10)||e.telegraph>0||e.strike>0||e.eliteWindup>0||e.eliteActive>0}
  if(area!=="overworld")return true;
  if(e.aggro||e.boss||e.eliteId||e.worldBoss||e.gatePredator||e.telegraph>0||e.strike>0||e.eliteWindup>0||e.eliteActive>0||e.summonedBy)return true;
  return Math.hypot(e.x-player.x,e.y-player.y)<=10;
}
export function activeDungeonEnemies(enemies,player,map){
 const cap=Math.max(1,Number(map?.activeEnemyCap)||DUNGEON_ACTIVE_CAP[map?.encounterProfile]||DUNGEON_ACTIVE_CAP.normal);
 return enemies.filter(e=>shouldSimulateEnemy(e,player,"dungeon")).sort((a,b)=>Number(isDungeonHunter(b,"dungeon"))-Number(isDungeonHunter(a,"dungeon"))||Number(!!b.aggro)-Number(!!a.aggro)||Number(!!b.boss)-Number(!!a.boss)||Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y)||String(a.id).localeCompare(String(b.id))).slice(0,cap);
}
export function settlementSanctuary(map,rx,ry,save){if(!map||rx===0&&ry===0&&save?.consequences?.settlements?.['ember-refuge']?.status==='fallen')return null;if(map.settlement?.procedural)return{x:map.settlement.x,y:map.settlement.y,radius:map.settlement.radius};return map.settlement||rx===0&&ry===0?{x:16,y:16,radius:9}:null}
export function enforceSanctuary(e,z){if(!z)return false;const dx=e.x-z.x,dy=e.y-z.y,d=Math.hypot(dx,dy);if(d>=z.radius)return false;const m=d||1;e.x=z.x+(d?dx/m:1)*(z.radius+.5);e.y=z.y+(d?dy/m:0)*(z.radius+.5);const ai=ensureAI(e);ai.homeX=e.x;ai.homeY=e.y;e.telegraph=0;return true}
export class Game {
  constructor(save, now = 0) {
    this.save = save;
    this.performanceStats={totalDungeonEncounterRecords:0,activeEnemies:0,dormantEnemies:0,activeProjectiles:0,activeHazardsAndEffects:0,pathfindingWork:0,encounterActivations:0,peakActiveEnemies:0,updateBudgetViolations:0,ambientTicks:0};
    ensureEliteState(save);
    ensureCorridorSystems(save);
    if (!["attack", "tool", "act"].includes(save.aimMode))
      save.aimMode = save.toolMode ? "tool" : "attack";
    save.toolMode = save.aimMode === "tool";
    settleProgression(save);
    const s = save.session;
    this.area = s.area;
    this.rx = s.rx || 0;
    this.ry = s.ry || 0;
    this.player = {
      x: s.x,
      y: s.y,
      hp: s.playerRuntime.hp,
      stamina: s.playerRuntime.stamina,
      maxStamina: save.maxStamina,
      stats: save.stats,
      weaponLevel: save.weaponLevel,
      facing: s.playerRuntime.facing || "down",
      walkPhase: s.playerRuntime.walkPhase || 0,
      attackReadyAt: now + s.playerRuntime.attackCooldown,
      attackUntil: now + (s.playerRuntime.attackMotion || 0),
      meleeUntil: now + (s.playerRuntime.meleeMotion || 0),
      meleeStrike: s.playerRuntime.meleeStrike
        ? { ...s.playerRuntime.meleeStrike }
        : null,
      dodgeReadyAt: now + s.playerRuntime.dodgeCooldown,
      invulnerableUntil: now + s.playerRuntime.invulnerability,
      dodgeUntil: now + s.playerRuntime.dodgeMotion,
      dodgeX: s.playerRuntime.dodgeX || 0,
      dodgeY: s.playerRuntime.dodgeY || 0,
    };
    this.message = s.message;
    this.paused = !!s.paused;
    this.pauseStarted = this.paused ? now : null;
    this.jumpUntil = now + s.playerRuntime.jump;
    this.guardRemaining = Math.max(0, Number(s.playerRuntime.guard || 0));
    this.magicBuffRemaining = Math.max(0, Number(save.magicBuff || 0));
    this.spellCooldownRemaining = Math.max(0, Number(save.spellCooldown || 0));
    this.projectiles = [];
    this.effects = [];
    this.eliteHazards=[];
    this.packEffects=[];
    this.reticle = null;
    this.loadArea(this.area, false);
  }
  installSystems() {
    if (this._systemsInstalled) return;
    this._systemsInstalled = true;
    this.player.meleeAim = this.save.session.playerRuntime.meleeAim || null;
    this.traversal = this.save.session.playerRuntime.traversal || null;
    const attack = this.primaryAttack.bind(this);
    this.primaryStrike = attack; // the swing itself, without aim selection (Echo repeats call it)
    this.primaryAttack = (now, explicitDirection = null) => {
      if (now < (this.player.attackReadyAt || 0)) return [];
      const baseProfile = primaryProfile(this.save.equipment.primary),
        profile = { ...baseProfile, range: baseProfile.range * (1 + characterStats(this.save).attackReach) * this.glyphLoadout("melee").mods.range },
        width = mapWidth(this.map, this.area),
        d = explicitDirection
          ? projectileDirection(
              explicitDirection.x,
              explicitDirection.y,
              this.player.facing,
            )
          : selectMeleeAim(
              this.player,
              this.enemies,
              this.map,
              width,
              profile.range,
            );
      this.player.meleeAim =
        d ||
        projectileDirection(
          this.save.lastAim.x,
          this.save.lastAim.y,
          this.player.facing,
        );
      const pending = this.save.pendingAim,
        last = { ...this.save.lastAim };
      this.save.lastAim = this.player.meleeAim;
      const hits = attack(now, explicitDirection);
      this.save.lastAim = last;
      this.save.pendingAim = pending;
      for (const e of hits)
        if (
          e.kind === "hollowMarshal" &&
          this.areaId() ===
            dungeonId(this.save.seed, this.save.worldGeneration) &&
          e.dead &&
          !this.save.narrative.facts["crossing.marshal"]
        ) {
          this.save.narrative.facts["crossing.marshal"] = true;
          this.save.narrative.journal.push({
            recordId: "marshal-cancel",
            instanceKey: "record:marshal-cancel",
            title: "The Missing Crossing",
            text: "The Hollow Marshal fell guarding the cancellation mechanism.",
            provenance: "original",
          });
        }
      return hits;
    };
    const interact = this.interact.bind(this);
    this.interact = (action, objectId = null) => {
      const o = this.nearestObject();
      if (o?.kind === "vine" && (!action || action === "swing")) {
        const reverse =
            Math.hypot(this.player.x - o.toX, this.player.y - o.toY) < 2,
          startX = reverse ? o.toX : o.x,
          startY = reverse ? o.toY : o.y,
          endX = reverse ? o.x : o.toX,
          endY = reverse ? o.y : o.toY;
        this.traversal = { kind: "swing", startX, startY, endX, endY, t: 0 };
        this.message = "You catch the root-vine and swing across.";
        return { ok: true, message: this.message, transition: "swing" };
      }
      return interact(action, objectId);
    };
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      if (this.paused) return;
      if (this.traversal) {
        const q = this.traversal;
        q.t = Math.min(1, q.t + dt / 0.7);
        const k = q.t * q.t * (3 - 2 * q.t);
        this.player.x = q.startX + (q.endX - q.startX) * k;
        this.player.y = q.startY + (q.endY - q.startY) * k;
        if (q.t >= 1) this.traversal = null;
        return;
      }
      update(dt, input, now);
      updateTraps(this.map.objects, this.player, dt, now < this.jumpUntil);
      if (this.player.hp <= 0 || this.area !== "dungeon") this.traversal = null;
    };
  }
  installWeaponSystems() {
    if (this._weaponSystemsInstalled) return;
    this._weaponSystemsInstalled = true;
    const fire = this.fireSecondary.bind(this);
    this.fireSecondary = (now = 0, direction = null) => {
      if (!direction && !this._attackFiring) {
        this.save.aimMode = this.save.aimMode === "tool" ? null : "tool";
        this.save.toolMode = this.save.aimMode === "tool";
        this.message = this.save.toolMode
          ? "Tool aim active — tap while moving to fire."
          : "Tool aim stowed.";
        return false;
      }
      return fire(now, direction);
    };
    const attack = this.primaryAttack.bind(this);
    this.primaryAttack = (now = 0, direction = null) => {
      if (this.save.activeWeaponSlot === "secondary") {
        this._attackFiring = true;
        const fired = fire(now);
        this._attackFiring = false;
        return fired ? [] : [];
      }
      return attack(now, direction);
    };
    this.toggleAttackMode = () => {
      this.save.aimMode = this.save.aimMode === "attack" ? null : "attack";
      this.save.toolMode = false;
      this.message =
        this.save.aimMode === "attack"
          ? "Attack aim active — tap while moving to strike."
          : "Attack aim stowed.";
      return this.save.aimMode;
    };
  }
  installStorySystems() {
    if (this._storySystemsInstalled) return;
    this._storySystemsInstalled = true;
    const defeat = this.defeatEnemy.bind(this);
    this.defeatEnemy = (e) => {
      if (e.kind === "npc") return;
      if (isCrossingGuardian(e)) {
        const d = dungeonHistory(this.save, this.areaId());
        d.guardianDefeated = true;
        if (
          this.areaId() !== dungeonId(this.save.seed, this.save.worldGeneration) &&
          (!d.combatClear || d.combatClear.required.every(id=>id===e.id || d.combatClear.defeated.includes(id)))
        ) {
          d.resolved = true;
          journalOnce(
            this.save,
            "resolved:" + this.areaId(),
            "You cleared the guardian of this buried crossing. Its defeat is permanent.",
            "Crossings",
          );
        }
      }
      if (
        e.kind === "hollowMarshal" && (!e.dungeonRole||e.dungeonRole==="gateWarden") &&
        this.areaId() ===
          dungeonId(this.save.seed, this.save.worldGeneration) &&
        !this.save.narrative.facts["crossing.marshal"]
      ) {
        this.save.narrative.facts["crossing.marshal"] = true;
        this.save.narrative.journal.push({
          recordId: "marshal-cancel",
          instanceKey: "record:marshal-cancel",
          title: "The Missing Crossing",
          text: "The Hollow Marshal fell guarding the cancellation mechanism.",
          provenance: "original",
        });
      }
      return defeat(e);
    };
  }
  installTraversalSafety() {
    if (this._traversalSafetyInstalled) return;
    this._traversalSafetyInstalled = true;
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      if (this.player.hp <= 0) this.traversal = null;
      return update(dt, input, now);
    };
  }
  installMovementMemory() {
    if (this._movementMemoryInstalled) return;
    this._movementMemoryInstalled = true;
    const q = this.save.session.playerRuntime.lastMoveVector || { x: 0, y: 1 },
      m = Math.hypot(Number(q.x) || 0, Number(q.y) || 0) || 1;
    this.player.lastMoveVector = {
      x: (Number(q.x) || 0) / m,
      y: (Number(q.y) || 0) / m,
    };
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      const x = Number(input?.state?.x) || 0,
        y = Number(input?.state?.y) || 0,
        n = Math.hypot(x, y);
      if (n > 0.04) this.player.lastMoveVector = { x: x / n, y: y / n };
      return update(dt, input, now);
    };
  }
  installAperture() {
    if (this._apertureInstalled) return;
    this._apertureInstalled = true;
    ensurePerception(this.save);
    const decorate = () => {
      if (this.area !== "dungeon" || !this.map || !this.enemies) return;
      const annex = String(this.save.session.activeDungeonId).endsWith(
          ":aperture-annex",
        ),
        overlay = perceptionOverlay(
          this.save.seed,
          this.save.session.activeDungeonId,
          this.map.tiles,
          mapWidth(this.map, this.area),
        );
      this.map.objects.push(
        ...overlay.objects.filter((o) => !annex || o.kind !== "apertureDoor"),
      );
      const tier = Math.min(3, apertureTier(this.save.perception.aperture)); // the visual tint only knows three tiers
      for (const e of this.enemies)
        e.visualTier = Math.max(
          Number(e.visualTier) || 0,
          annex ? Math.max(2, tier) : tier,
        );
      const scaleFresh = () => {
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
          if (e.foundryValidated) continue;
          if (e.farArrayBoss) continue; // Far Array bosses are tuned to the Wayfarer instead
          e.threatRing = q.ring;
          e.maxHp = Math.round(e.maxHp * q.hpMultiplier);
          e.hp = e.maxHp;
          e.damage = Math.max(1, Math.round(e.damage * q.damageMultiplier));
          e.xpMultiplier = q.xpMultiplier;
        }
      };
      const currentId =
        this.area === "dungeon"
          ? this.save.session.activeDungeonId || ""
          : `overworld:${this.rx}:${this.ry}:g${this.save.worldGeneration}`;
      if (!this.save.session.areas[currentId]) scaleFresh();
    };
    decorate();
    const load = this.loadArea.bind(this);
    this.loadArea = (area, capture = true) => {
      const id =
          area === "dungeon"
            ? this.save.session.activeDungeonId || ""
            : `overworld:${this.rx}:${this.ry}:g${this.save.worldGeneration}`,
        levelId=area==="dungeon"?(this.save.session.activeDungeonLevelId||undefined):undefined,
        stateId=area==="dungeon"&&levelId?`${id}:level:${levelId}`:id,
        had = !!this.save.session.areas[stateId];
      load(area, capture);
      if (area === "dungeon") {
        const annex = String(this.save.session.activeDungeonId).endsWith(
            ":aperture-annex",
          ),
          overlay = perceptionOverlay(
            this.save.seed,
            this.save.session.activeDungeonId,
            this.map.tiles,
            mapWidth(this.map, this.area),
          );
        // Base loading already restores these stable IDs before terrain scars replay.
        // A scar changes the overlay's sampled open cells; never append relocated duplicates
        // or reset an inscription/relic that the player already consumed.
        this.map.objects.push(
          ...overlay.objects.filter((o) => (!annex || o.kind !== "apertureDoor") &&
            !this.map.objects.some((existing) => existing.id === o.id)),
        );
      }
      if (!had) {
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
          if (e.foundryValidated) continue;
          if (e.farArrayBoss) continue; // Far Array bosses are tuned to the Wayfarer instead
          e.threatRing = q.ring;
          e.maxHp = Math.round(e.maxHp * q.hpMultiplier);
          e.hp = e.maxHp;
          e.damage = Math.max(1, Math.round(e.damage * q.damageMultiplier));
          e.xpMultiplier = q.xpMultiplier;
        }
      }
      const tier = Math.min(3, apertureTier(this.save.perception.aperture)); // the visual tint only knows three tiers
      for (const e of this.enemies)
        e.visualTier = Math.max(
          Number(e.visualTier) || 0,
          String(this.save.session.activeDungeonId).endsWith(":aperture-annex")
            ? Math.max(2, tier)
            : tier,
        );
    };
    const transition = this.transitionSection.bind(this);
    this.transitionSection = (dx, dy) => {
      if (transition(dx, dy) === false) return false;
      if(Math.abs(this.rx)+Math.abs(this.ry)>=4)progressLead(this.save,'distance');
      const key = `section:${this.rx},${this.ry}`;
      if (this.rx || this.ry) {
        const gained = gainAperture(
          this.save,
          1,
          key,
          "Distance opens another fraction of your Aperture.",
        );
        if (gained) {
          const value = this.save.perception.aperture,
            tier = apertureTier(value),
            next = APERTURE_THRESHOLDS[tier],
            unlock = tier === 0 ? "hidden inscriptions" : tier === 1 ? "unseen annexes" : tier === 2 ? "deep relics" : `the ${APERTURE_BANDS[tier + 1]?.name || "next"} band and more Resonance`;
          this.message = next
            ? `New section understood. Aperture ${value}/${next} — ${unlock} draw nearer.`
            : `New section understood. Aperture ${value} — the Corridor is fully visible for now.`;
        }
      }
    };
    const interact = this.interact.bind(this);
    this.interact = (action, objectId = null) => {
      const target = objectId
        ? this.map.objects.find((o) => o.id === objectId)
        : this.nearestObject();
      if (
        target?.kind === "exit" &&
        String(this.save.session.activeDungeonId).endsWith(":aperture-annex") &&
        this.save.session.veilReturn
      ) {
        this.snapshotArea();
        const q = this.save.session.veilReturn;
        this.save.session.activeDungeonId = q.id;
        this.save.session.veilReturn = null;
        this.loadArea("dungeon", false);
        this.player.x = q.x;
        this.player.y = q.y;
        this.message =
          "You step back through the unseen crossing. The completed dungeon remains changed.";
        this.sync();
        return {
          ok: true,
          message: this.message,
          transition: "apertureReturn",
        };
      }
      const r = interact(action, objectId);
      if (r?.ok && target?.kind === "apertureRelic") {
        const key = "relic-stat:" + this.areaId();
        if (!this.save.perception.awarded[key]) {
          this.save.perception.awarded[key] = true;
          this.save.statPoints++;
          this.message = `${r.message} The relic leaves one permanent stat point.`;
          r.message = this.message;
        }
      }
      if (r?.transition === "apertureDoor") {
        const parent = this.save.session.activeDungeonId;
        this.snapshotArea();
        this.save.session.veilReturn = {
          id: parent,
          x: this.player.x,
          y: this.player.y,
        };
        this.save.session.activeDungeonId = parent + ":aperture-annex";
        dungeonHistory(this.save, this.save.session.activeDungeonId).visits++;
        this.loadArea("dungeon", false);
        this.player.x = 4;
        this.player.y = 5;
        this.save.perception.discoveries.doors++;
        this.message = "The annex resolves around you in impossible clarity.";
      }
      return r;
    };
    this.save.perception.passiveSeconds = 0;
  }
  installApertureRewards() {
    if (this._apertureRewardsInstalled) return;
    this._apertureRewardsInstalled = true;
    const defeat = this.defeatEnemy.bind(this);
    this.defeatEnemy = (e) => {
      const first = !e.rewarded,
        r = defeat(e);
      if (first && e.kind !== "npc" && !e.ambient) {
        const guardian = isCrossingGuardian(e);
        gainAperture(
          this.save,
          guardian ? 4 : 1,
          `${guardian ? "guardian" : "enemy"}:${this.areaId()}:${e.id}`,
          guardian
            ? "A guardian’s last perception joins yours."
            : "The defeated shape leaves a new pattern in your Aperture.",
        );
      }
      return r;
    };
  }
  areaId() {
    this.installSystems();
    this.installWeaponSystems();
    this.installStorySystems();
    this.installTraversalSafety();
    this.installMovementMemory();
    this.installDungeonDeath();
    this.installDungeonHistoryRepair();
    this.installAperture();
    this.installApertureRewards();
    if (
      this._apertureInstalled &&
      this.area === "dungeon" &&
      this.map &&
      !this.map.objects.some((o) => o.kind === "apertureMemory")
    ) {
      const annex = String(this.save.session.activeDungeonId).endsWith(
          ":aperture-annex",
        ),
        overlay = perceptionOverlay(
          this.save.seed,
          this.save.session.activeDungeonId,
          this.map.tiles,
          mapWidth(this.map, this.area),
        );
      this.map.objects.push(
        ...overlay.objects.filter((o) => !annex || o.kind !== "apertureDoor"),
      );
    }
    const g = this.save.worldGeneration;
    return this.area === "dungeon"
      ? this.save.session.activeDungeonId || `dungeon:${this.save.seed}:g${g}`
      : `overworld:${this.rx}:${this.ry}:g${g}`;
  }
  areaStateId(){const id=this.areaId();return this.area==="dungeon"&&this.map?.multiLevel&&this.save.session.activeDungeonLevelId?`${id}:level:${this.save.session.activeDungeonLevelId}`:id;}
  snapshotArea() {
    if (!this.map) return;
    const objects = {};
    for (const o of this.map.objects)
      objects[o.id] = {
        state: o.state,
        phase: o.phase,
        timer: o.timer,
        hits: { ...o.hits },
      };
    this.save.session.areas[this.areaStateId()] = {
      encounterVersion:this.map.encounterVersion||0,
      enemies: this.enemies.map((e) => ({ ...e, ai: { ...ensureAI(e) } })),
      objects,
      projectiles: this.projectiles.map((p) => ({ ...p })),
      effects: this.effects.map((f) => ({ ...f, hits: { ...f.hits } })),
      eliteHazards:this.eliteHazards.map(h=>({...h,hits:{...h.hits}})),
    };
  }
  updateDungeonDiscovery(force=false){
    if(this.area!=="dungeon"||!this.map?.dungeonContract?.discoveryEnabled)return false;
    const chunk=dungeonChunkId(this.map,this.player.x,this.player.y);if(!force&&chunk===this._dungeonChunkId)return false;
    this._dungeonChunkId=chunk;const history=dungeonHistory(this.save,this.areaId()),prior=discoveryForLevel(history,this.map),next=revealDungeonAt(this.map,prior,this.player.x,this.player.y,0),changed=next.length!==prior.length||next.some((q,i)=>q!==prior[i]);
    if(changed)history.discovery.levels[this.map.levelStableId||this.map.levelId||"root"]=next;
    applyDungeonDiscovery(this.map,next,this.map._dungeonRevealMode||"normal");return changed;
  }
  loadArea(area, capture = true) {
    if (capture) this.snapshotArea();
    this.area = area;
    const lostBeasts = worldBeastsLost(this.save, area, this.rx, this.ry, area === "dungeon" ? this.areaId() : null); // release 239: a retreating beast not followed is gone
    for (const id of lostBeasts) journalOnce(this.save, `world-beast-away:${id}:${this.save.worldBeasts[id].cycle}`, `${WORLD_BEASTS[id].name} got away to ${BEAST_HOMES[WORLD_BEASTS[id].home].name}.`, "World beasts");
    const loadingId=area==="dungeon"?this.areaId():null,history=loadingId?dungeonHistory(this.save,loadingId):null;
    this.map = area === "dungeon"
      ? generatePinnedDungeon(this.save, loadingId, {levelId:this.save.session.activeDungeonLevelId||undefined})
        : generateRegion(
            this.save.seed,
            this.rx,
            this.ry,
            this.save.worldGeneration,
          );
    if(area==="overworld")this.tyrantVisit=null; // release 233: entering a section (from anywhere, or after a death) starts a fresh Tyrant visit
    if(area==="dungeon"){applyTunnels(this.map,this.save,this.areaStateId());this.map.wallGlints=wallGlints(this.map,this.save.seed,this.areaStateId(),this.save);} // release 225: dug tunnels and glinting walls
    if(area==="overworld"){const seen=this.save.atlas?.[`${this.rx},${this.ry}`];applyLandscape(this.map,this.save.seed,this.rx,this.ry,{explored:!!seen&&!seen.landscapeVersion,version:seen?.landscapeVersion||LANDSCAPE_VERSION,openSea:!seen?OPEN_SEA_VERSION:seen.seaVersion||0,buoy:!this.save.checkpoints?.[`${this.rx},${this.ry}`]||this.save.checkpoints[`${this.rx},${this.ry}`].name==="Lighthouse Buoy",hamlet:(!seen||!!seen.hamletVersion)&&hamletSection(this.save.seed,this.rx,this.ry)});if(!seen||seen.hamletVersion)applyHamlet(this.map,this.save.seed,this.rx,this.ry,seen?.hamletVersion||HAMLET_VERSION);if(!seen||seen.travelVersion)applyTrails(this.map,this.save.seed,this.rx,this.ry);this.seaHazards=this.map.openSea?seaHazards(this.save.seed,this.rx,this.ry,this.map):null;this.storm=null;this._stormCheck=0;const b=ensureBoatState(this.save),m=b.moored;if(b.owned&&!b.aboard&&m&&m.rx===this.rx&&m.ry===this.ry)this.map.objects.push({id:"skiff-moored",kind:"skiff",name:"Your skiff",lore:"Your skiff rides at its mooring.",x:m.x,y:m.y,state:"moored",actions:["board"]});const dive=diveSite(this.map,this.save.seed,this.rx,this.ry);if(dive)this.map.objects.push(dive)}
    if(area==="dungeon"){const reader=addDungeonReciter(this.map,loadingId,this.save,mapWidth(this.map,area)),elder=addDungeonElder(this.map,loadingId,this.save,mapWidth(this.map,area));if(elder)this.message="Something tall and silent wanders these halls.";else if(reader)this.message=`${reader.name} wanders these halls, murmuring.`}
    if(area==="dungeon"&&isArrayRun(loadingId)&&ensureFarArray(this.save).activeRun?.id===loadingId){const run=this.save.farArray.activeRun,spawns=this.map.enemySpawns,multi=!!this.map.multiLevel,g=spawns.find(e=>e.dungeonRole==="finalBoss")||spawns.find(e=>e.dungeonRole==="gateWarden")||(multi?null:spawns.find(e=>e.boss)||spawns[spawns.length-1]);if(g){const boss=runBossSpawn(this.save,{x:g.x,y:g.y});if(boss){spawns.splice(spawns.indexOf(g),1);if(!spawns.some(e=>e.id===boss.id))spawns.push({...boss,objectiveId:g.objectiveId||null})}}if(!this.map.objects.some(o=>o.kind==="arrayPylon"))this.map.objects.push(...arrayPylons(this.map,`${loadingId}:${this.map.levelId||""}`,mapWidth(this.map,area)));this.map.name=runName(run,run.gate)}
    if(area==="dungeon"&&history?.relayNode){if(placeRelayNode(this.map,loadingId,this.save))ensureRelayNetwork(this.save).seen=true;}
    if(area==="dungeon"&&this.map.dungeonContract?.discoveryEnabled){const discovered=discoveryForLevel(history,this.map);applyDungeonDiscovery(this.map,discovered);this._dungeonChunkId=null;}
    if(area==='overworld'){
      const site=storySiteFor(this.save,this.rx,this.ry);if(site&&!this.map.objects.some(o=>o.id===site.id)){const open=this.map.tiles[site.y*32+site.x];if(!open?.blocked&&!open?.structure)this.map.objects.push(site)}
      const candidate=foundryEncounter(this.save.seed,this.rx,this.ry,this.save.worldGeneration);if(candidate&&validateFoundryCandidate(candidate).ok&&!this.save.worldFlags[`foundry-retired:${candidate.foundryId}`]){const open=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>4&&t.x<28&&t.y>4&&t.y<28);if(open.length){const at=open[hashSeed(candidate.foundryId)%open.length];candidate.x=at.x;candidate.y=at.y;this.map.enemySpawns.push(candidate)}}
      {const posted=refreshViewportBoard(this.save,this.rx,this.ry,{level:this.save.level,packKinds:PACK_KINDS.filter(k=>!MONSTER_PACK[k].unique&&!MONSTER_PACK[k].dungeonOnly).map(k=>({id:k,name:MONSTER_PACK[k].name})),avoid:(x,y)=>(x===0&&y===0)||hamletSection(this.save.seed,x,y)||this.seaBound(x,y)||(x===4&&y===-2)||(x===-5&&y===3)});if(posted.length)this.message=`Viewport: a new hunt is posted. ${posted[0].title}.`}
      {const spots=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>5&&t.x<27&&t.y>5&&t.y<27);if(spots.length&&!this.map.settlement&&Math.abs(this.rx)+Math.abs(this.ry)>=3){const wild=admittedFoundrySpawn(this.save,`${this.rx},${this.ry}`,'overworld',spots[hashSeed(`${this.save.seed}:admitted-at:${this.rx},${this.ry}`)%spots.length]);if(wild)this.map.enemySpawns.push(wild)}}
      // A hunt can still point into open sea (boards posted before release 162): raise a Hunter's Raft so the quarry and its marks
      // stand on one platform rather than scattered islets.
      if(this.map.openSea&&(Object.values(this.save.viewport?.contracts||{}).some(q=>q.target?.rx===this.rx&&q.target?.ry===this.ry&&!['archived','completed'].includes(q.status))||domainSectionAt(this.save,this.rx,this.ry))){this.map.huntersRaft=true;for(let y=14;y<=18;y++)for(let x=14;x<=18;x++){const i=y*32+x;this.map.tiles[i]={...this.map.tiles[i],kind:'dock',blocked:false,elev:0,landscape:'coast'}}this.map.objects.push({id:`hunters-raft-${this.rx}-${this.ry}`,kind:'ruinMarker',name:"Hunter's Raft",x:14,y:14,state:'quiet',actions:['inspect'],landmark:true})}
      const hunt=activeViewportHunt(this.save),open=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>6&&t.x<27&&t.y>6&&t.y<27&&(!this.map.huntersRaft||(t.x>=14&&t.x<=18&&t.y>=14&&t.y<=18)));
      const domain=domainEncounterPlan(this.save,this.rx,this.ry);
      if(domain&&open.length){const state=domain.state,section=domain.section;this.map.domain={id:state.id,family:domain.topology.family,name:domain.topology.name,role:section.role,state:state.transformed?'transformed':'active',manifestation:domain.manifestation,lifecycle:domain.contract.lifecycle};for(const spawn of domain.spawns){const at=open[hashSeed(spawn.id)%open.length];this.map.enemySpawns.push({...spawn,x:at.x,y:at.y})}const markerAt=open[hashSeed(section.id+':marker')%open.length];this.map.objects.push({id:section.id+':marker',kind:'ruinMarker',name:`${domain.topology.name} — ${section.role}`,x:markerAt.x,y:markerAt.y,state:state.transformed?'quiet':'active',actions:['inspect'],landmark:true,domainId:state.id});recordPeoplePlace(this.save,state.id,{type:'domain',name:domain.topology.name,sigil:domain.topology.family==='sentinel'?'gear':'root',summary:domain.topology.family==='sentinel'?'A multi-section production field whose assembly lines still answer a buried command.':'A migrating forest-machine gathered around a buried root heart.',facts:[`Discovered ${section.role} section.`,state.transformed?'Its ruling threat has fallen; remnants persist.':'Its ruling threat remains active.'],crossRefs:[domain.contract.title],outcome:state.transformed?'transformed':'unresolved',coordinates:{rx:this.rx,ry:this.ry}})}
      if(huntTraceStage(hunt)>=0){/* release 134: a tracking hunt's trace sections hold tracks to follow, not the creature */if(hunt.target?.rx===this.rx&&hunt.target?.ry===this.ry&&open.length){const stage=huntTraceStage(hunt),at=open[hashSeed(`${hunt.id}:trace:${stage}`)%open.length];this.map.objects.push({id:`hunt-trace:${hunt.id}:${stage}`,kind:'huntTrace',name:'Fresh tracks',x:at.x,y:at.y,state:'ready',actions:['inspect'],huntId:hunt.id,landmark:true});this.message=`Fresh tracks of the ${hunt.foundry?.name||'quarry'} cross this section.`}}
      else if(hunt&&hunt.target?.rx===this.rx&&hunt.target?.ry===this.ry&&!['completed','archived'].includes(hunt.status)){hunt.status='target-located';const destination=resolveHuntDestination(this.save,hunt.id,this.map);if(destination?.kind==='temporary-arena'&&open.length){const at=open[hashSeed(`${hunt.id}:target`)%open.length],instance=ensureHuntInstance(this.save,hunt.id);this.map.objects.push({id:`instance-gate:${hunt.id}`,kind:instance?.completed?'huntScar':'huntInstance',name:instance?.completed?'Manifestation Scar':'Held Aperture',x:at.x,y:at.y,state:instance?.completed?'spent':'ready',actions:instance?.completed?['inspect']:['enter'],huntId:hunt.id,instanceId:instance?.id,landmark:true})}else if(destination?.kind==='existing-dungeon'){const entrance=this.map.objects.find(o=>o.id===destination.entranceId);if(entrance){entrance.viewportHuntId=hunt.id;entrance.name=`${entrance.name} · ${hunt.title}`}}else if(destination?.kind==='ordinary-overworld'&&destination.site&&hunt.id!=='viewport-direct-vesperwing'){const at=destination.site;/* release 132: spawn the hunt's own creature (generated hunts carry it; fixed ones name it) instead of forcing a Root Brute */this.map.enemySpawns.push(hunt.generated?generatedHuntSpawn(hunt,at):{id:`viewport-target:${hunt.id}`,kind:hunt.targetKind||'latticeHunter',x:at.x,y:at.y,boss:true,traits:['vital','keen'],viewportHuntId:hunt.id,worldBoss:false})}}
      for(const q of Object.values(this.save.viewport?.contracts||{}))if(q.kind==='trial'&&q.status==='completed'&&q.target?.rx===this.rx&&q.target?.ry===this.ry){const instance=ensureHuntInstance(this.save,q.id);if(instance?.scar&&open.length&&!this.map.objects.some(o=>o.instanceId===instance.id)){const at=open[hashSeed(`${q.id}:target`)%open.length];this.map.objects.push({id:`instance-scar:${q.id}`,kind:'huntScar',name:'Manifestation Scar',x:at.x,y:at.y,state:'spent',actions:['inspect'],huntId:q.id,instanceId:instance.id,landmark:true})}}
      if(this.map.settlement){recordPeoplePlace(this.save,this.map.settlement.id,{type:'settlement',name:this.map.settlement.name||this.map.settlement.id,sigil:'settlement',summary:'A settled refuge maintained against the Corridor.',facts:[`Reached at ${this.rx},${this.ry}.`],crossRefs:['Viewport'],outcome:this.save.consequences.settlements[this.map.settlement.id]?.status||'standing',coordinates:{rx:this.rx,ry:this.ry}});for(const o of this.map.objects.filter(q=>q.kind==='npc'))recordPeoplePlace(this.save,o.id,{type:'person',name:o.name,role:o.role,sigil:'person',summary:`${o.role} of ${this.map.settlement.name||'this refuge'}.`,facts:[this.save.consequences.npcs[o.id]?.status==='dead'?'Recorded dead.':'Encountered alive.'],crossRefs:[this.map.settlement.name||this.map.settlement.id],outcome:this.save.consequences.npcs[o.id]?.status||'alive'})}
    }
    if(area==='dungeon'&&String(this.save.session.activeDungeonId||'').startsWith('hunt-instance:')){const id=this.save.session.activeDungeonId,instance=this.save.viewport.instances[id],hunt=this.save.viewport.contracts[instance?.contractId];this.map.recipe='hunt-instance';this.map.name=hunt?.title||'Held Aperture';this.map.huntInstanceId=id;this.map.enemySpawns=this.map.enemySpawns.filter(e=>e.kind!=='hollowMarshal');if(instance&&!instance.completed&&hunt?.generated){const at=this.map.objective||{x:18,y:11};this.map.enemySpawns.push({...generatedHuntSpawn(hunt,at,id),boss:true,worldBoss:true,huntInstanceId:id})}else if(instance&&!instance.completed){const c=foundryCandidate(this.save.seed,hunt.target.rx,hunt.target.ry,this.save.worldGeneration),at=this.map.objective||{x:18,y:11};Object.assign(c,{id:`${id}:boss`,foundryId:`${id}:boss`,foundryName:c.name,foundryRole:'boss',role:'boss',baseKind:'archiveBehemoth',kind:'archiveBehemoth',boss:true,x:at.x,y:at.y,viewportHuntId:hunt.id,worldBoss:true,huntInstanceId:id,foundryModules:[c.body,c.movement,c.attack,c.weakness,c.ecology]});this.map.enemySpawns.push(c)}}
    if(area==='dungeon'){const spots=this.map.tiles.filter(t=>!t.blocked&&t.x>3&&t.y>3),key=`${loadingId}:${this.map.levelStableId||this.map.levelId||''}`;if(spots.length){const wild=admittedFoundrySpawn(this.save,key,'dungeon',spots[hashSeed(`${key}:admitted-at`)%spots.length]);if(wild)this.map.enemySpawns.push(wild)}}
    if(area==='dungeon'&&this.save.session.viewportDungeonHuntId&&!String(this.save.session.activeDungeonId||'').startsWith('hunt-instance:')){const hunt=this.save.viewport.contracts[this.save.session.viewportDungeonHuntId];if(hunt&&!['completed','archived'].includes(hunt.status)){const open=this.map.tiles.filter(t=>!t.blocked&&t.x>5&&t.y>5),at=open[hashSeed(`${hunt.id}:${this.areaId()}:boss`)%open.length]||this.map.objective||this.map.entry;this.map.enemySpawns.push({id:`viewport-dungeon-target:${hunt.id}`,kind:hunt.targetKind||'latticeHunter',x:at.x,y:at.y,boss:true,traits:['vital','keen'],viewportHuntId:hunt.id,worldBoss:false})}}
    if (area === "dungeon" && this.map.recipe === "cistern") {
      for (const [x, y] of [[11, 4], [12, 4], [11, 5], [12, 5]]) {
        const i = y * mapWidth(this.map, area) + x, t = this.map.tiles[i];
        if (t && !t.blocked)
          this.map.tiles[i] = { ...t, kind: "dungeonWater", blocked: true, waterDepth: "shallow" };
      }
    }
    const eliteState=ensureEliteState(this.save),eliteDefeated=eliteState.defeated;
    if(area==='overworld'&&this.rx===5&&this.ry===-2&&!eliteDefeated.vesperwing){const direct=this.save.viewport?.contracts?.['viewport-direct-vesperwing'];this.map.enemySpawns.push({kind:'vesperwing',x:23,y:16,boss:true,elite:true,viewportHuntId:direct&&['accepted','target-located'].includes(direct.status)?direct.id:null});}
    if(area==='overworld'&&this.rx===-7&&this.ry===4&&!eliteDefeated.mireApostle)this.map.enemySpawns.push({kind:'mireApostle',x:22,y:22,boss:true,elite:true});
    if(area==='overworld'&&this.rx===-5&&this.ry===3){this.map.objects.push({id:'knife-choir-portal',kind:'elitePortal',name:'Cantor Threshold',x:20,y:16,state:eliteState.contracts.knifeChoir.state==='available'?'ready':'sealed',actions:['inspect','enter'],landmark:true});}
    if(area==='dungeon'&&String(this.areaId()).startsWith('elite-portal:')){this.map.enemySpawns=this.map.enemySpawns.filter(e=>e.kind!=='hollowMarshal');if(!eliteDefeated.knifeChoir)this.map.enemySpawns.push({kind:'knifeChoir',x:16,y:18,boss:true,elite:true});}
    else if(area==='dungeon'&&this.map.recipe==='cistern') {
      if(history.cisternGuardianChoice===undefined) {
        const saved=this.save.session.areas[this.areaStateId()]?.enemies || [];
        const historicalBell=saved.find(e=>e.boss&&e.kind==='gravitantBell');
        if(historicalBell)history.cisternGuardianSpawn={id:historicalBell.id,x:historicalBell.x,y:historicalBell.y};
        history.cisternGuardianChoice=saved.some(e=>e.boss&&e.kind==='gravitantBell')?'gravitantBell':saved.some(e=>e.boss&&e.kind==='hollowMarshal')?'hollowMarshal':!eliteDefeated.gravitantBell&&hashSeed(`${this.save.seed}:elite-guardian:${this.areaId()}`)%5===0?'gravitantBell':'hollowMarshal';
      }
      if(history.cisternGuardianChoice==='gravitantBell') {
        const guardian=this.map.enemySpawns.find(e=>e.kind==='hollowMarshal'&&e.boss);
        if(guardian)Object.assign(guardian,{kind:'gravitantBell',elite:true,...history.cisternGuardianSpawn});
      }
    }
    const packAreaId=String(this.areaId()),packAdopted=area==="dungeon"&&!!history?.monsterPack&&!this.map.arena&&!/^(hunt-instance:|elite-portal:|proving:combat:|displacement:)/.test(packAreaId)&&!packAreaId.includes("aperture-annex")&&packAreaId!==dungeonId(this.save.seed,this.save.worldGeneration);
    if(packAdopted&&!this.map.deepDungeon&&this.map.recipe!=="deep-v1"&&history.cisternGuardianChoice!=="gravitantBell"){
      const guardian=this.map.enemySpawns.find(e=>e.boss&&e.dungeonRole==="gateWarden"&&e.kind==="hollowMarshal");
      if(guardian){history.guardianKind??=guardianKindFor(this.save.seed,packAreaId);guardian.kind=history.guardianKind;guardian.packGuardian=history.guardianKind!=="hollowMarshal"}
    }
    if(packAdopted&&this.map.encounterVersion&&this.map.monsterPack!==MONSTER_PACK_VERSION){this.map.enemySpawns=this.map.enemySpawns.filter(e=>!e.encounterSpawn);this.map.encounterVersion=0;this.map.encounterGroups=[]}
    if (area === "dungeon" && !this.map.deepDungeon && this.map.recipe !== "deep-v1" && !String(this.areaId()).includes("aperture-annex") && hashSeed(`${this.save.seed}:gate-predator:v1:${this.areaId()}`) % 1000 < (history.gatePredatorSpawnThreshold || GATE_REVENANT.legacySpawnPerThousand))
      this.map.enemySpawns.push({ kind: "gateRevenant", x: 18, y: 6, gatePredator: true });
    if(area==="dungeon"&&!this.map.arena&&!String(this.areaId()).startsWith("hunt-instance:")&&!String(this.areaId()).startsWith("elite-portal:")&&!String(this.areaId()).includes("aperture-annex"))populateDungeonEncounters(this.map,{deep:!!this.map.deepDungeon||this.map.recipe==="deep-v1",monsterPack:packAdopted});
    if (area === "overworld" && (this.rx !== 0 || this.ry !== 0)) {
      const remembered = this.save.checkpoints?.[`${this.rx},${this.ry}`];
      if (remembered && !this.map.objects.some((o) => o.kind === "checkpoint")) {
        const x = Math.max(1, Math.min(30, Number.isFinite(remembered.x) ? remembered.x : 16)),
          y = Math.max(1, Math.min(30, Number.isFinite(remembered.y) ? remembered.y : 16));
        this.map.tiles[y * 32 + x] = { ...this.map.tiles[y * 32 + x], x, y, kind: this.map.dominant, blocked: false };
        this.map.objects.push({ id: `remembered-wayglass-${this.rx}-${this.ry}`, kind: "checkpoint", name: remembered.name || "Remembered Wayglass", x, y, state: "active", actions: ["activate"], landmark: true, remembered: true });
      }
    }
    if (area === "overworld") {
      const atlas = (this.save.atlas ||= {}), key = `${this.rx},${this.ry}`, prior = atlas[key];
      // A section first seen now is pinned to the current landscape version; one explored earlier keeps none.
      atlas[key] = { terrain: this.map.dominant, ...(prior ? (prior.landscapeVersion ? { landscapeVersion: prior.landscapeVersion } : {}) : { landscapeVersion: LANDSCAPE_VERSION }),
        // Hamlets (release 111; version 2 at 112) follow the same rule: only sections first seen from now on can hold one.
        ...(prior ? (prior.hamletVersion ? { hamletVersion: prior.hamletVersion } : {}) : { hamletVersion: HAMLET_VERSION }),
        // Trails (release 115) likewise only appear in sections first seen from then on.
        ...(prior ? (prior.travelVersion ? { travelVersion: prior.travelVersion } : {}) : { travelVersion: TRAVEL_VERSION }),
        // Open seas (release 152): only sections first seen from now on run on across their borders.
        ...(prior ? (prior.seaVersion ? { seaVersion: prior.seaVersion } : {}) : { seaVersion: OPEN_SEA_VERSION }),
        ...(this.map.landscape?.biome ? { landscape: this.map.landscape.biome } : {}), sites: this.map.objects
        .filter((o) => ["diveSite","shipwright","checkpoint","dungeon","arenaEntrance","shrine","ruinMarker","shack","bossCue","architecturalDistrict","supplyCache","storyEcho"].includes(o.kind))
        .map((o) => ({ kind: o.kind, name: o.name || (o.kind === "supplyCache" ? "Supply Cache" : o.kind), x: o.x, y: o.y })) };
    }
    if(area==="overworld")populateOverworldPack(this.map,this.save.seed,this.rx,this.ry,{safe:settlementSanctuary(this.map,this.rx,this.ry,this.save)});
    if(area==="overworld"){const war=addSkirmish(this.map,this.save.seed,this.rx,this.ry,this.save);if(war)this.message=war.text;else if(this.map.settlement?.procedural)this.message=`${this.map.settlement.name} — a ${this.map.settlement.label.toLowerCase()} holds this ground.`}
    if(area==="overworld"&&arrayMouthAt(this.save,this.rx,this.ry)&&!this.map.objects.some(o=>o.kind==="arrayMouth")){const spots=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>10&&t.x<22&&t.y>10&&t.y<22).sort((a,b)=>Math.hypot(a.x-16,a.y-16)-Math.hypot(b.x-16,b.y-16));const at=spots[0]||{x:16,y:16};this.map.objects.push({id:"array-mouth",kind:"arrayMouth",name:"The Array Mouth",lore:"A ruined relay terminal, half sunk into ground no map has charted. Its line hums under your feet.",x:at.x,y:at.y,state:"ready",actions:["enter"],landmark:true});this.message="The Array Mouth: the far end of the relay line."}
    if(area==="overworld"){const band=addTravelers(this.map,this.save.seed,this.rx,this.ry),reader=addReciter(this.map,this.save.seed,this.rx,this.ry,this.save),quill=addWanderer(this.map,this.save,this.rx,this.ry),note=wandererArrive(this.save,this.map,this.rx,this.ry);const beast=questingBeastFor(this.save,this.map,this.rx,this.ry),elder=addElder(this.map,this.save,this.rx,this.ry),worldBeastFound=worldBeastFor(this.save,this.map,this.rx,this.ry),worldBeast=beast&&!worldBeastFound?.retreating?null:worldBeastFound;if(worldBeast){this.map.enemySpawns.push(worldBeast);const B=WORLD_BEASTS[worldBeast.worldBeast];this.message=worldBeast.retreating?`${B.name} is fleeing through here toward ${BEAST_HOMES[B.home].name}. It cannot be hurt now.`:`${B.arrive} ${worldBeastTriesLeft(this.save,worldBeast.worldBeast)} of ${B.tries} tries remain.`}/* release 241: a fleeing beast says so, and passes through the Questing Beast's ground too *//* release 235: world beasts */addStrange(this.map,this.save,this.rx,this.ry);/* release 215: a rare strange tree or stone */addDigSpot(this.map,this.save,this.rx,this.ry);/* release 225: a rare patch of disturbed earth */for(const id of mouthsIn(this.save,this.rx,this.ry))placeMouth(this.map,id);/* release 217: second mouths of linked dungeons */if(beast){this.map.enemySpawns.push(beast);this.message=`The Questing Beast hunts here. ${questingBeastTriesLeft(this.save)} of ${QUESTING_BEAST.tries} tries remain.`}if(beast||worldBeast){}else if(elder)this.message="Something tall and silent walks the road.";else if(note)this.message=note;else if(quill)this.message="A cartographer on a moss grazer is sketching the horizon.";else if(reader)this.message=`${reader.name} walks by, murmuring.`;else if(band&&!this.map.skirmish&&!this.map.settlement)this.message=`${band.title} on the road.`}
    this.activatedEncounterGroups=new Set;
    if(area==="dungeon"){const haunt=worldBeastForDungeon(this.save,this.map,this.areaId());if(haunt){this.map.enemySpawns.push(haunt);const B=WORLD_BEASTS[haunt.worldBeast];this.beastNote=haunt.retreating?`${B.name} is retreating ${haunt.worldBeast === "voidWalker" ? "toward the nearest reachable dungeon door" : "toward the water"}. It cannot be hurt now.`:`${B.arriveDungeon||B.arrive} ${worldBeastTriesLeft(this.save,haunt.worldBeast)} of ${B.tries} tries remain.`}} /* release 249: the Psychic Crystal haunts dungeons with water */
    this.enemies = this.map.enemySpawns.map(e => this.createEnemyFromSpawn(e,area));
    // Far Array bosses are tuned to the Wayfarer last, over the depth and boss-form scaling (release 138).
    if(area==="dungeon"&&isArrayRun(loadingId))for(const e of this.enemies)if(e.farArrayBoss)tuneArrayBoss(e,this.save,characterStats(this.save),e.farArrayBoss);
    // Surface sea creatures (water world W3): deterministic per section, only in landscape version 2+ water.
    if(area==="overworld"||this.map.underwater)for(const q of area==="overworld"?seaSpawns(this.map,this.save.seed,this.rx,this.ry):(this.map.seaSpawns||[])){const c=createCombatant("ashling",q.x,q.y,false,[]);Object.assign(c,{id:q.id,kind:q.kind,variantId:`${q.kind}:common`,meleePatterns:[],tentacles:0},seaCombatantFields(q.kind));this.enemies.push(c)}
    const intrusions = this.map.deepDungeon || this.map.recipe === "deep-v1" ? [] : apertureEncounterSpawns(
      this.save.seed,
      this.areaId(),
      this.save.perception?.aperture || 0,
      this.map.tiles,
      mapWidth(this.map, area),
    );
    for (const e of intrusions) {
      const c = createCombatant(e.kind, e.x, e.y, false, e.traits || []),
        multiplier = Math.max(1, Number(e.threatMultiplier) || 1);
      Object.assign(c, {
        apertureEncounter: true,
        apertureTier: e.apertureTier,
        maxHp: Math.round(c.maxHp * multiplier),
        damage: Math.max(1, Math.round(c.damage * multiplier)),
        xpMultiplier: multiplier,
      });
      c.hp = c.maxHp;
      ensureAI(c);
      this.enemies.push(c);
    }
    this.projectiles = [];
    this.effects = [];
    this.eliteHazards=[];
    this.packEffects=[];
    if (
      area === "overworld" &&
      this.rx === 0 &&
      this.ry === 0 &&
      this.save.worldFlags.worldBossAwake &&
      !this.save.worldFlags.worldBossDead
    )
      this.enemies.push(createCombatant("riftColossus", 28, 27, true));
    const s = this.save.session.areas[this.areaStateId()];
    if (s) {
      const by = new Map((s.enemies || []).map((e) => [e.id, e]));
      this.enemies = this.enemies.map((e) => {
        const restored = by.get(e.id);
        if (!restored) return e;
        const merged = {
          ...e,
          ...restored,
          ai: { ...ensureAI(e), ...restored.ai },
        };
        if (restored.dungeonThreatTuningVersion === undefined) delete merged.dungeonThreatTuningVersion;
        if(area === "dungeon" && !merged.passiveBehavior && !merged.ambient && !merged.worldBeast) tuneDungeonThreat(merged); // release 249: a world beast keeps its own tuning
        ensureAI(merged);
        resetPackRuntime(merged);
        if ((merged.worldBeast || merged.questingBeast) && restored.beastTuningVersion == null) {
          const hp = merged.hp; if (merged.worldBeast) tuneWorldBeast(merged,this.save,merged.worldBeast,characterStats(this.save)); else tuneQuestingBeast(merged,this.save,characterStats(this.save));
          merged.hp = merged.dead ? 0 : Math.min(merged.maxHp, hp); // Ordinary reload never heals a wounded beast.
        }
        if (restored.gateTuningVersion == null) delete merged.gateTuningVersion;
        if (merged.gatePredator) { tuneGatePredator(merged, this.save, characterStats(this.save)); resetGateAttack(merged, true); }
        return merged;
      });
      for(const saved of s.enemies||[])if((saved.gatePredator||saved.foundryId)&&!saved.dead&&!this.enemies.some(e=>e.id===saved.id)){const restored={...saved,ai:{...saved.ai}};ensureAI(restored);if(restored.gatePredator){tuneGatePredator(restored,this.save,characterStats(this.save));resetGateAttack(restored, true)}this.enemies.push(restored)}
      for (const o of this.map.objects)
        if (s.objects?.[o.id]) Object.assign(o, s.objects[o.id]);
      applyFallenTreeCrossings(this.map);
      this.projectiles = (s.projectiles || []).map((p) => ({ ...p }));
      this.effects = (s.effects || []).map((f) => ({
        ...f,
        hits: { ...f.hits },
      }));
      this.eliteHazards=(s.eliteHazards||[]).map(h=>({...h,hits:{...h.hits}}));
      if(this.map.encounterVersion&&!s.encounterVersion){this.enemies=this.enemies.filter(e=>!e.encounterSpawn);this.map.encounterVersion=0}
    }
    if (area === "dungeon" && (this.map.deepDungeon || this.map.recipe === "deep-v1")) {
      const progress = applyDeepDungeonProgress(this.save, this.areaId(), this.map), defeated = new Set([...(progress.defeatedWingIds || []).map((wing) => `deep-v1-miniboss-${wing}`), ...(progress.defeatedFinalIds || [])]);
      this.enemies = this.enemies.filter((e) => !defeated.has(e.id) && !(e.objectiveId && progress.completedObjectiveIds.includes(e.objectiveId)));
    }
    // Persistent scars overlay pinned generation in either world, after saved objects
    // and quest progress are restored; they never complete those objectives themselves.
    applyVoidScars(this.save, this.map, this.areaStateId());
    if (area === "dungeon") {
      // Wall glints were generated before the persistent overlay. A consumed wall must not regain a
      // floating treasure marker when the dungeon is loaded again.
      this.map.wallGlints = (this.map.wallGlints || []).filter(q => this.map.tiles[q.y * mapWidth(this.map, area) + q.x]?.blocked);
    }
    this._walkerRoutes = new WeakMap(); this._walkerLandingGraph = null;
    const areaWidth = mapWidth(this.map, area),
      playerRelocated = !(area === "overworld" && aboard(this.save) && footprintSailable(this.map, areaWidth, this.player.x, this.player.y)) && relocateIfStranded(this.player, this.map, areaWidth);
    for (const e of this.enemies) {
      if (isDungeonRoamer(e, area)) {
        // Walls, water and isolated pockets are valid saved flight positions. Only repair invalid map bounds.
        e.x = Math.max(0, Math.min(areaWidth - 1, Number.isFinite(e.x) ? e.x : this.map.entry?.x ?? 4));
        e.y = Math.max(0, Math.min(mapHeight(this.map, area) - 1, Number.isFinite(e.y) ? e.y : this.map.entry?.y ?? 5));
      } else if (e.worldBeast === "voidWalker" && area === "dungeon") {
        if (e.retreating) e.untargetable = true;
        // A safe disconnected retreat position is unfinished work, not a corrupted save. Repair only
        // genuinely invalid ground/bounds; never relocate a valid retreat to manufacture an escape.
        const connected = this.walkerLandingGraph(), k = Math.round(e.y) * areaWidth + Math.round(e.x);
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || e.x < 0 || e.y < 0 || e.x > areaWidth - 1 || e.y > mapHeight(this.map, area) - 1 || (!e.retreating && !connected.has(k)) || !walkerGroundPositionOpen(this.map, areaWidth, e.x, e.y)) {
          const candidates = [...connected].map(k => ({ x: k % areaWidth, y: Math.floor(k / areaWidth) }));
          candidates.sort((a, b) => Math.hypot(a.x - (Number.isFinite(e.x) ? e.x : 0), a.y - (Number.isFinite(e.y) ? e.y : 0)) - Math.hypot(b.x - (Number.isFinite(e.x) ? e.x : 0), b.y - (Number.isFinite(e.y) ? e.y : 0)));
          if (candidates.length) Object.assign(e, candidates[0]);
        }
      } else if (!e.seaKind) relocateIfStranded(e, this.map, areaWidth);
    }
    if (playerRelocated)
      this.message =
        "The changed Corridor settles you onto the nearest stable ground. Your progress and carried items remain intact.";
    if (area === 'dungeon' && !this.map.arena && !this.save.session.activeDisplacement && !String(loadingId).startsWith('hunt-')) this.prepareDungeonCompletion();
    this.reconcileConsequences();
    const codex = (this.save.codex ||= { creatures: {}, places: {}, features: {} });
    codex.creatures ||= {};
    codex.places ||= {};
    codex.features ||= {};
    codex.variants ||= {};
    for (const e of this.enemies) {
      if(e.foundryId)continue;
      codex.creatures[e.kind] = true;
      codex.variants[e.variantId || `${e.kind}:common`] = { kind: e.kind, traits: [...(e.traits || []),...(e.eliteVariantModules||[])] };
    }
    codex.places[area === "dungeon" ? `dungeon:${this.map.recipe || "hollow"}` : `terrain:${this.map.dominant}`] = true;
    if (this.map.settlement) codex.places[`settlement:${this.map.settlement.id}`] = true;
    if (this.map.district) codex.places[`district:${this.map.district.style}`] = true;
    for (const o of this.map.objects)
      if (["shrine", "checkpoint", "ruinMarker", "dungeon", "shack", "architecturalDistrict", "tree", "rock", "relayTerminal", "trap", "vine", "bossCue"].includes(o.kind))
        codex.features[o.kind === "trap" ? `trap:${o.trapType}` : o.kind] = true;
    if (area === "overworld") {
      this.map.objects.push(
        ...wayfindingCues(
          this.save.seed,
          this.rx,
          this.ry,
          this.save.worldGeneration,
          this.save,
          this.map,
        ),
      );
      for (const o of this.map.objects)
        if (o.kind === "dungeon")
          dungeonHistory(
            this.save,
            dungeonId(
              this.save.seed,
              this.save.worldGeneration,
              this.rx,
              this.ry,
              o.id,
            ),
          );
    }
    if (area === "overworld")
      this.save.explored[`${this.rx},${this.ry}`] = true;recordSectionVisit(this.save,this.rx,this.ry,this.map);
  }
  recoverPosition() {
    const moved = relocateIfStranded(
      this.player,
      this.map,
      mapWidth(this.map, this.area),
    );
    if (moved) {
      this.message =
        "The Corridor settles you onto nearby stable ground. Your journey remains unchanged.";
      this.sync();
    }
    return moved;
  }
  setPaused(v, now = 0) {
    if (v && !this.paused) {
      this.pauseStarted = now;
      this.recoverPosition();
    }
    if (!v && this.paused && this.pauseStarted !== null) {
      const d = Math.max(0, now - this.pauseStarted);
      for (const k of [
        "attackReadyAt",
        "attackUntil",
        "meleeUntil",
        "dodgeReadyAt",
        "invulnerableUntil",
        "dodgeUntil",
        "heldUntil",
        "echoVoidReadyAt",
      ])
        if (this.player[k]) this.player[k] += d;
      if (this.jumpUntil) this.jumpUntil += d;
      for (const patch of this.echoPatches || [])
        if (patch.voidEcho && patch.until) patch.until += d;
    }
    this.paused = v;
    this.pauseStarted = v ? this.pauseStarted : null;
    this.save.session.paused = v;
  }
  exportSnapshot(now = 0) {
    const clock =
      this.paused && this.pauseStarted !== null ? this.pauseStarted : now;
    this.sync();
    this.snapshotArea();
    Object.assign(this.save.session, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: this.player.x,
      y: this.player.y,
      message: this.message,
      paused: this.paused,
      savedAt: Date.now(),
      playerRuntime: {
        hp: this.player.hp,
        stamina: this.player.stamina,
        facing: this.player.facing,
        walkPhase: this.player.walkPhase,
        attackCooldown: remaining(this.player.attackReadyAt, clock),
        attackMotion: remaining(this.player.attackUntil, clock),
        meleeMotion: remaining(this.player.meleeUntil, clock),
        meleeAim: this.player.meleeAim ? { ...this.player.meleeAim } : null,
        meleeStrike: this.player.meleeStrike
          ? { ...this.player.meleeStrike }
          : null,
        lastMoveVector: { ...this.player.lastMoveVector },
        dodgeCooldown: remaining(this.player.dodgeReadyAt, clock),
        invulnerability: remaining(this.player.invulnerableUntil, clock),
        dodgeMotion: remaining(this.player.dodgeUntil, clock),
        dodgeX: this.player.dodgeX,
        dodgeY: this.player.dodgeY,
        jump: remaining(this.jumpUntil, clock),
        guard: this.guardRemaining,
        traversal: this.traversal ? { ...this.traversal } : null,
      },
    });
    return this.save;
  }
  travelToCheckpoint(key = null) {
    const c = key ? this.save.checkpoints?.[key] : this.save.activeCheckpoint;
    if (!c) return false;
    if(this.save.session.displacementJourney){this.message="Wayglass travel cannot find you after the displacement. Reach a physical Wayglass—or die—to restore the line.";return false}
    if (this.area === "dungeon") {
      this.message =
        "Wayglass travel is sealed inside a dungeon. Reach an exit, die and restart at the entrance, or use a Crossing Sigil.";
      return false;
    }
    this.snapshotArea();
    this.rx = c.rx;
    this.ry = c.ry;
    this.loadArea("overworld", false);
    this.player.x = c.x;
    this.player.y = c.y;
    this.projectiles = [];
    this.effects = [];
    this.traversal = null;
    this.message = `Returned to ${c.name || "the active checkpoint"}. Nothing carried was lost.`;
    this.sync();
    return true;
  }
  returnToCheckpoint() {
    return this.travelToCheckpoint();
  }
  // ---------------------------------------------------------------- glyphs (release 98)
  glyphLoadout(host) {
    const l = hostLoadout(this.save, host), fresh = discoverResonances(this.save, l);
    if (fresh.length) this.glyphNotice = `Resonance discovered: ${RESONANCES[fresh[0]].name}. ${RESONANCES[fresh[0]].text}`;
    return l;
  }
  elevationHere(x, y) { return elevationAt(this.map, mapWidth(this.map, this.area), x, y); }
  glyphWorld(now) {
    const game = this, p = this.player;
    return {
      now, enemies: this.enemies,
      damage(e, amount) { if (e.dead) return; alertEnemy(e); e.hp -= Math.round(amount * strikeAmplifier(game.save)); e.hitFlash = .18; if (e.hp <= 0) { e.dead = true; game.defeatEnemy(e); } },
      heal(amount) { game.glyphHealPool = (game.glyphHealPool || 0) + amount; const whole = Math.floor(game.glyphHealPool); if (whole > 0) { game.glyphHealPool -= whole; const before = p.hp; p.hp = Math.min(game.save.maxHp, p.hp + whole); if (p.hp > before) (game.glyphVisuals ||= []).push({ kind: "heal", x: p.x + .5, y: p.y - .1, amount: p.hp - before, life: .9, max: .9 }); } },
      stamina(amount) { p.stamina = Math.min(game.save.maxStamina, (p.stamina || 0) + amount); },
      blast(x, y, radius, amount) {
        (game.glyphVisuals ||= []).push({ kind: "burst", x, y, radius, life: .35, max: .35 });
        for (const e of game.enemies) if (!e.dead && !e.untargetable && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= radius + .2) this.damage(e, amount);
      },
      arc(from, to, color) { (game.glyphVisuals ||= []).push({ kind: "arc", x: from.x + .5, y: from.y + .45, tx: to.x + .5, ty: to.y + .45, color, life: .22, max: .22 }); },
      canStand(x, y) { const w = mapWidth(game.map, game.area); return footprintOpen(game.map, w, x, y) && !footprintHazard(game.map, w, x, y); },
      nudge(e, dx, dy) { const w = mapWidth(game.map, game.area); if (footprintOpen(game.map, w, e.x + dx, e.y + dy)) { e.x += dx; e.y += dy; } },
    };
  }
  tickGlyphs(dt, now) {
    tickGlyphStatus(this.enemies, dt, now, (e) => this.defeatEnemy(e));
    const due = (this.glyphTimers ||= []).filter((t) => t.at <= now);
    this.glyphTimers = this.glyphTimers.filter((t) => t.at > now);
    for (const t of due) {
      if (t.kind === "strike" && this.primaryStrike) this.primaryStrike(now, null, { share: t.share });
      else if (t.kind === "shot") { const p = this.player; this.projectiles.push({ ...t.shot, x: p.x + .5 + t.shot.dx * .35, y: p.y + .45 + t.shot.dy * .35 }); }
    }
    this.glyphVisuals = (this.glyphVisuals || []).filter((v) => (v.life -= dt) > 0);
    if (this.glyphNotice) { this.message = this.glyphNotice; this.glyphNotice = null; }
  }
  // Edge feedback shared by the brink guard and the fatal-drop guard.
  brinkStop(kind, x, y, now, drop = 0) {
    const width = mapWidth(this.map, this.area);
    this.ledgeHint = { x: Math.floor(x + .5), y: Math.floor(y + .72), kind: "brink", until: now + 1500 };
    if (now > (this.brinkMessageAt || 0)) {
      this.brinkMessageAt = now + 4000;
      const what = kind === "lava" ? "lava" : kind === "abyss" ? "a bottomless chasm" : kind === "canyon" ? "a sheer drop" : kind === "drop" ? `a fatal ${drop}-level fall` : "deep water";
      this.message = `The edge stops you: ${what}. Dodge-roll to go over on purpose.`;
    }
    return width;
  }
  // Stuck? (Atlas button): dungeons return you to this level's entrance; the overworld moves you to the nearest
  // ground that can walk back to the section's plaza. Free, with a short cooldown; nothing is lost.
  unstick(now = performance.now()) {
    if (now < (this.unstickReadyAt || 0)) { this.message = `Catch your breath: Stuck? is ready in ${Math.ceil((this.unstickReadyAt - now) / 1000)} s.`; return false; }
    const p = this.player, width = mapWidth(this.map, this.area), height = mapHeight(this.map, this.area);
    let to = null;
    if (this.area === "dungeon") { const e = this.map.entry || this.map.objects?.find((o) => o.kind === "exit"); if (e) to = { x: e.x, y: e.y }; this.message = "You retrace your steps to this level's entrance."; }
    else {
      const plaza = { x: 16, y: 16 }, here = { x: Math.floor(p.x + .5), y: Math.floor(p.y + .72) };
      const free = this.map.landscape ? canReturnTo(this.map, width, height, plaza)[here.y * width + here.x] : 1;
      const near = this.map.landscape ? nearestReturnable(this.map, width, height, plaza, here) : null;
      to = free && near && near.d < 1 ? plaza : near || plaza;
      this.message = to === plaza ? "You find your way back to the heart of the section." : "You scramble out onto ground that leads somewhere.";
    }
    if (!to) { this.message = "There is nowhere safer to go."; return false; }
    p.x = to.x; p.y = to.y; this.traversal = null; this.jumpUntil = 0; this.ledgeHint = null;
    this.unstickReadyAt = now + 30000;
    if (this.area === "dungeon") this.updateDungeonDiscovery(true);
    this.sync();
    return true;
  }
  returnHome() {
    return this.travelToCheckpoint("0,0");
  }
  leaveDungeon(message = "You return to the dungeon entrance.") {
    const q = this.save.session.dungeonReturn || this.save.activeCheckpoint;
    if (!q) return false;
    const pursuer = this.enemies.find((e) => e.gatePredator && e.aggro && !e.dead);
    if (pursuer) pursuer.dead = true;
    const leavingId=this.save.session.activeDungeonId,isHuntInstance=String(leavingId||'').startsWith('hunt-instance:');
    abandonDungeon(this.save, this.areaId());
    if(isHuntInstance){const instance=this.save.viewport.instances[leavingId];if(instance&&!instance.completed)abandonHuntInstance(this.save,leavingId)}
    this.snapshotArea();
    this.save.session.activeDisplacement = null;
    this.save.session.viewportDungeonHuntId = null;
    this.rx = q.rx;
    this.ry = q.ry;
    this.loadArea("overworld", false);
    if(isHuntInstance&&this.save.viewport.instances[leavingId]?.completed)cleanupHuntInstance(this.save,leavingId);
    this.player.x = q.x;
    this.player.y = q.y;
    if (pursuer) {
      const e = { ...pursuer, id: `${pursuer.id}-breach-${this.rx}-${this.ry}`, dead: false, x: q.x + 1.2, y: q.y - .4, aggro: true, ai: { ...ensureAI(pursuer), homeX: q.x, homeY: q.y } };
      placeGatePursuer(e, this.player, this.map, mapWidth(this.map, this.area));
      resetGateAttack(e, true);
      this.enemies.push(e);
      message = "THE GATE REMAINS OPEN — something impossible follows you into the Corridor.";
    }
    this.projectiles = [];
    this.effects = [];
    this.traversal = null;
    this.message = message;
    this.sync();
    return true;
  }
  recoverFromDeath(now = 0, input = null) {
    const p = this.player,
      before = this.save.consumables.restorativeDraught || 0;
    this.captureLastDeath();
    this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
    this.save.session.displacementJourney = null;
    if (before < 2) this.save.consumables.restorativeDraught = 2;
    clearRot(this.save);
    loseWood(this.save);
    p.hp = this.save.maxHp;
    p.stamina = this.save.maxStamina;
    p.attackReadyAt =
      p.dodgeReadyAt =
      p.dodgeUntil =
      p.attackUntil =
      p.meleeUntil =
        0;
    p.meleeStrike = null;
    this.jumpUntil = 0;
    this.projectiles = [];
    this.effects = [];
    this.traversal = null;
    input?.reset?.();
    // A diver who runs out of air is hauled up the line to the buoy with fresh breath (W5).
    if (this.area === "dungeon" && this.map?.underwater && this.leaveDungeon("Out of air — the line hauls you, half-drowned, back to the surface. Nothing carried was lost.")) {
      this.save.session.breath = DIVE.breath; p.hp = this.save.maxHp; p.invulnerableUntil = now + 2000; return;
    }
    if (this.area === "dungeon") {
      const id = this.areaId(),
        deep = !!this.map?.deepDungeon || this.map?.recipe === "deep-v1",
        anchor = deep ? deepDungeonProgress(this.save, id).activeAnchor : null,
        stateId = this.map?.multiLevel&&anchor?.levelId?`${id}:level:${anchor.levelId}`:id,
        prior = this.save.session.areas[stateId],
        used = prior?.objects || {};
      if (!deep) delete this.save.session.areas[id];
      if(deep&&anchor?.levelId)this.save.session.activeDungeonLevelId=anchor.levelId;
      this.loadArea("dungeon", false);
      for (const o of this.map.objects)
        if (used[o.id]?.state === "used") o.state = "used";
      p.x = deep ? (anchor?.x ?? this.map.hub?.x ?? this.map.entry?.x ?? 4) : (this.map.entry?.x ?? 4);
      p.y = deep ? (anchor?.y ?? this.map.hub?.y ?? this.map.entry?.y ?? 5) : (this.map.entry?.y ?? 5);
      relocateIfStranded(p,this.map,mapWidth(this.map,"dungeon"));
      this.updateDungeonDiscovery(true);
      p.invulnerableUntil = now + 2000;
      this.message = deep ? `Felled — recovered at the central anchor of ${this.map.name}. Cleared wings, shortcuts, carried items, XP, and map progress remain.${before < 2 ? " Restorative draughts replenished to 2." : ""}` : `Felled — returned to the entrance of ${this.map.name}. The run begins again; your map and everything carried remain.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
    } else {
      const c = this.save.activeCheckpoint;
      this.rx = c.rx;
      this.ry = c.ry;
      this.loadArea("overworld");
      p.x = c.x;
      p.y = c.y;
      p.invulnerableUntil = now + 2000;
      this.message = `Felled — recovered at ${c.name || "checkpoint"}. No items, marks, equipment, or XP were lost. You are protected briefly.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
    }
    this.sync();
    return true;
  }
  captureLastDeath(cause="defeat"){
    const p=this.player,prior=this.save.lastDeath?.sequence||0,inside=this.area==="dungeon",ret=this.save.session.dungeonReturn||{},id=inside?this.areaId():null,temporary=inside&&String(id).startsWith("hunt-instance:");
    this.save.lastDeath={schema:1,sequence:prior+1,areaKind:inside?"dungeon":"overworld",rx:inside?(Number.isInteger(ret.rx)?ret.rx:this.rx):this.rx,ry:inside?(Number.isInteger(ret.ry)?ret.ry:this.ry):this.ry,x:p.x,y:p.y,dungeonId:id,instanceId:temporary?id:null,levelId:inside?(this.map?.levelId||this.save.session.activeDungeonLevelId||null):null,label:inside?`Inside ${this.map?.name||"a dungeon"}`:`Section ${this.rx}, ${this.ry}`,cause,valid:temporary?!this.save.viewport?.instances?.[id]?.collapsed:true};
    return this.save.lastDeath;
  }
  sync() {
    Object.assign(this.save.session, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: this.player.x,
      y: this.player.y,
    });
    Object.assign(this.save.position, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: this.player.x,
      y: this.player.y,
    });
    this.save.hp = this.player.hp;
    this.save.stamina = this.player.stamina;
    this.save.magicBuff = this.magicBuffRemaining;
    this.save.spellCooldown = this.spellCooldownRemaining;
  }
  transitionSection(dx, dy) {
    const from = { rx: this.rx, ry: this.ry, x: this.player.x, y: this.player.y };
    const pursuers=this.enemies.filter(e=>e.gatePredator&&e.aggro&&!e.dead).map(e=>({...e,ai:{...ensureAI(e)}}));
    for(const e of this.enemies)if(!e.gatePredator&&e.aggro&&!e.dead){e.aggro=false;ensureAI(e).mode="return"}
    for(const e of this.enemies)if(e.gatePredator&&e.aggro&&!e.dead)e.dead=true;
    this.snapshotArea();
    this.rx += dx;
    this.ry += dy;
    this.loadArea("overworld", false);
    const exits = sectionExits(this.save.seed, this.rx, this.ry);
    if (dx < 0) {
      this.player.x = 30.75;
      this.player.y = exits.east;
    }
    if (dx > 0) {
      this.player.x = 0.25;
      this.player.y = exits.west;
    }
    if (dy < 0) {
      this.player.y = 30.75;
      this.player.x = exits.south;
    }
    if (dy > 0) {
      this.player.y = 0.25;
      this.player.x = exits.north;
    }
    // Open seas (release 152): a skiff crosses wherever the water runs on; a walker cannot step out into open sea.
    if (aboard(this.save)) { if (!this.sailAcross(dx, dy, from)) return false; }
    else if (DEEP_WATER.includes(footprintHazard(this.map, 32, this.player.x, this.player.y)) && !canSwim(this.save)) { this.returnFrom(from, "Open sea lies beyond. You need a boat to cross it."); return false; }
    for(const pursuer of pursuers){const e={...pursuer,id:`${pursuer.id}-pursuit-${this.rx}-${this.ry}`,dead:false,aggro:true,x:this.player.x-dx*1.4,y:this.player.y-dy*1.4,ai:{...pursuer.ai,homeX:this.player.x,homeY:this.player.y}};placeGatePursuer(e,this.player,this.map,mapWidth(this.map,this.area));resetGateAttack(e, true);this.enemies.push(e)}
    if(pursuers.length)this.message="The Gate Revenant tears through the crossing behind you.";
    this.sync();
  }
  // Places the skiff on the new section's matching edge. Water there: sail on. Ground there: run aground and step
  // ashore (the skiff moors in the section it came from). Neither: turn back. Returns false when it turned back.
  sailAcross(dx, dy, from) {
    const p = this.player, map = this.map, x0 = dx < 0 ? 31.18 : dx > 0 ? .02 : from.x, y0 = dy < 0 ? 31.08 : dy > 0 ? .02 : from.y;
    const offsets = [0, .5, -.5, 1, -1, 1.5, -1.5, 2, -2, 3, -3, 4, -4], at = (k) => ({ x: x0 + (dy ? k : 0), y: y0 + (dx ? k : 0) });
    for (const k of offsets) { const q = at(k); if (footprintSailable(map, 32, q.x, q.y) && !bergAt(this.seaHazards, q.x, q.y)) { p.x = q.x; p.y = q.y; return true; } }
    for (const k of offsets) { const q = at(k); if (footprintOpen(map, 32, q.x, q.y) && !footprintHazard(map, 32, q.x, q.y)) {
      disembark(this.save, { rx: from.rx, ry: from.ry, x: Math.max(0, Math.min(31, Math.floor(from.x + .5))), y: Math.max(0, Math.min(31, Math.floor(from.y + .7))) });
      p.x = q.x; p.y = q.y; p.sailVx = p.sailVy = 0; this.message = "You run the skiff aground and wade ashore. It waits at the edge of the last section."; return true; } }
    this.returnFrom(from, "Rock and wall bar the way across. The skiff turns back.");
    return false;
  }
  leaveSkiff() {
    const p = this.player, width = 32, here = tileUnder(this.map, width, p.x, p.y);
    const moor = { rx: this.rx, ry: this.ry, x: here?.x ?? Math.round(p.x), y: here?.y ?? Math.round(p.y) };
    let shore = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const q = { x: p.x + dx, y: p.y + dy }; if (footprintOpen(this.map, width, q.x, q.y) && !footprintHazard(this.map, width, q.x, q.y)) { shore = q; break; } }
    if (!shore && !canSwim(this.save)) { this.message = "Nowhere to stand, and you cannot swim. Find a shore first."; return false; }
    disembark(this.save, moor); p.sailVx = p.sailVy = 0;
    this.map.objects = this.map.objects.filter((o) => o.id !== "skiff-moored");
    this.map.objects.push({ id: "skiff-moored", kind: "skiff", name: "Your skiff", lore: "Your skiff rides at its mooring.", x: moor.x, y: moor.y, state: "moored", actions: ["board"] });
    if (shore) { Object.assign(p, shore); this.message = "You step off the skiff. It waits at its mooring."; }
    else this.message = "You slip over the side. The skiff bobs beside you. The open sea tires a swimmer fast.";
  }
  // Release 160: new hunts are not posted into open sea (sections already explored keep whatever they were).
  seaBound(rx, ry) {
    // A hunt's target and the sections a territory spreads into (up to 3 east, 1 north and 2 south of it) stay ashore.
    const sea = (x, y) => { const seen = this.save.atlas?.[`${x},${y}`]; return (!seen || seen.seaVersion) && openSeaSection(this.save.seed, x, y); };
    for (let dy = -1; dy <= 2; dy++) for (let dx = 0; dx <= 3; dx++) if (sea(rx + dx, ry + dy)) return true;
    return false;
  }
  returnFrom(from, message) {
    this.rx = from.rx; this.ry = from.ry; this.loadArea("overworld", false);
    Object.assign(this.player, { x: from.x, y: from.y, sailVx: 0, sailVy: 0 }); this.message = message; this.sync();
  }
  nearestObject() {
    let f = null,
      d = 1.5;
    for (const o of this.map.objects) {
      const n = Math.hypot(o.x - this.player.x, o.y - this.player.y);
      if (n < d && (validActions(o, this.save).length || o.kind === "huntInstance" || o.kind === "huntScar")) {
        f = o;
        d = n;
      }
    }
    return f;
  }
  startDisplacement(o,hidden=false){
    const key=`displacement-trigger:${this.rx},${this.ry}:${o.id}`;if(this.save.worldFlags[key])return false;this.save.worldFlags[key]=true;o.state='used';o.consumed=true;
    const h=hashSeed(this.save.seed+":displacement:"+this.rx+":"+this.ry+":"+o.id),distance=8+h%7,sign=h&1?1:-1,destination={rx:this.rx+(h&2?distance:Math.floor(distance/2))*sign,ry:this.ry+(h&2?Math.floor(distance/2):distance)*(h&4?1:-1)};
    this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDisplacement={id:"displacement:"+this.rx+":"+this.ry+":"+o.id,source:{...this.save.session.dungeonReturn},destination,hidden};this.save.session.activeDungeonId=this.save.session.activeDisplacement.id;const history=dungeonHistory(this.save,this.save.session.activeDungeonId);history.visits++;history.visitOpen=true;
    if(hidden){recordRevelationLead(this.save,'displacement',o.id);journalOnce(this.save,`hidden-displacement:${o.id}`,'A concealed Folded Seam displaced you only after you crossed fully inside a shelter. Triggered seams keep a faint scar; untouched shelters reveal nothing.','Shelter hazards');this.defeatNotice={title:'HIDDEN SEAM TRIGGERED',detail:'the shelter folds into an unknown crossing',kind:'discovery'}}
    this.loadArea("dungeon");this.player.x=4;this.player.y=5;this.message=hidden?'The floor opens without warning. Space folds around you.':'The threshold folds the room into somewhere else.';this.sync();return true;
  }
  interact(action, objectId = null) {
    this.sync();
    const o = objectId
      ? this.map.objects.find(
          (q) =>
            q.id === objectId &&
            Math.hypot(q.x - this.player.x, q.y - this.player.y) < 1.5,
        )
      : this.nearestObject();
    // Wood (release 119): with nothing else to act on, Act at deep water's edge builds a skiff from wood.
    if (!o && !objectId) { const d = this.digAhead(); if (d) return d; } // release 225: Act facing a dungeon wall digs
    if (!o && !objectId && this.shoreWater()) return this.buildSkiffHere();
    if (!o)
      return {
        ok: false,
        message: (this.message = "Nothing nearby responds."),
      };
    if (o.completionExit) {
      if (!dungeonHistory(this.save,this.areaId()).combatClear?.completed) return {ok:false,message:this.message='The return remains sealed while a required guardian lives.'};
      // Release 217: a linked dungeon's guardian's door (past its second level) opens at its other mouth.
      const linkId = this.save.session.activeDungeonId, link = this.map?.multiLevel ? linkedExit(this.save, linkId, this.save.session.dungeonReturn) : null;
      if (link) this.save.session.dungeonReturn = { rx: link.rx, ry: link.ry, x: link.x ?? 16, y: link.y ?? 16 };
      const result = this.leaveDungeon(link ? (link.mouth === 'b' ? "The guardian's door opens somewhere else entirely: another mouth of the same crossing, far from where you went in." : "The guardian's door leads back to the crossing's first mouth.") : 'The cleared expedition returns you safely to its entrance.');
      if (result && link?.mouth === 'b') { const m = this.map.objects.find((o) => o.linked && o.dungeonId === linkId); if (m) { this.player.x = m.x; this.player.y = m.y + 1; } }
      if (result) { relocateIfStranded(this.player,this.map,mapWidth(this.map,'overworld')); this.player.invulnerableUntil = (this.lastUpdateNow || 0) + 2000; this.sync(); }
      return {ok:!!result,message:this.message};
    }
    if(o.kind==='huntScar'){this.message='The Held Aperture has collapsed into a stable scar. Viewport retains the completed record.';return{ok:true,message:this.message}}
    if(o.kind==='arrayMouth'){
      const run=beginArrayRun(this.save,{rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y});
      this.save.session.dungeonReturn={...run.returnPoint};this.save.session.activeDungeonId=run.id;this.save.session.activeDungeonLevelId=null;pinDungeonLayout(this.save,run.id);const preview=generatePinnedDungeon(this.save,run.id);if(preview.multiLevel)this.save.session.activeDungeonLevelId=preview.levels[0].id;const history=dungeonHistory(this.save,run.id);history.visits++;history.visitOpen=true;history.relayNode=false;
      this.loadArea('dungeon');this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;relocateIfStranded(this.player,this.map,mapWidth(this.map,'dungeon'));this.message=run.listener?'The Gate stands whole. Somewhere below, the Listener waits.':`The line pulls you under. Gate ${run.gate}: ${this.save.farArray.pieces}/${piecesNeeded(run.gate)} pieces.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==='huntInstance'){
      const instance=beginHuntInstance(this.save,o.huntId,{rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y});
      if(!instance)return{ok:false,message:this.message='The Held Aperture no longer admits a hunt.'};
      this.save.session.dungeonReturn={...instance.returnPoint};this.save.session.activeDungeonId=instance.id;const history=dungeonHistory(this.save,instance.id);history.visits++;history.visitOpen=true;this.loadArea('dungeon');this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;this.message='Viewport closes the Held Aperture around the hunt. The exit remains behind you.';this.sync();return{ok:true,message:this.message};
    }
    if (o.kind === "deepAnchor") {
      if (o.state !== "active") return { ok: false, message: (this.message = "The anchor has no path to remember yet.") };
      const progress = deepDungeonProgress(this.save, this.areaId());
      progress.activeAnchor = { id: o.id, x: o.x, y: o.y, levelId:this.map.levelId||"root",name: o.name || "deep anchor" };
      if (!progress.activatedAnchorIds.includes(o.id)) progress.activatedAnchorIds.push(o.id);
      this.message = `${o.name || "Deep anchor"} fixed as the expedition recovery point.`; this.sync(); return { ok: true, message: this.message };
    }
    // Release 151: a level's fixed landing point (toX/toY) can sit in a wall on some generated floors; every move to a
    // landing point now steps onto the nearest open ground, as loading an area and recovering after a fall already do.
    if(o.kind==="deepTransition"){
      const progress=deepDungeonProgress(this.save,this.areaId());this.snapshotArea();this.save.session.activeDungeonLevelId=o.toLevelId;progress.currentLevelId=o.toLevelId;if(!progress.discoveredLevelIds.includes(o.toLevelId))progress.discoveredLevelIds.push(o.toLevelId);this.loadArea("dungeon",false);this.player.x=o.toX;this.player.y=o.toY;relocateIfStranded(this.player,this.map,mapWidth(this.map,"dungeon"));this.projectiles=[];this.effects=[];this.message=`${this.map.levelName||o.toLevelId} reached.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==="deepShortcut"){
      const progress=deepDungeonProgress(this.save,this.areaId()),ready=progress.completedObjectiveIds.includes(o.unlockObjectiveId);if(!ready)return{ok:false,message:this.message=`${o.name} has no visible seam yet.`};if(!progress.openedShortcutIds.includes(o.id))progress.openedShortcutIds.push(o.id);applyDeepDungeonProgress(this.save,this.areaId(),this.map);this.defeatNotice={title:"SHORTCUT OPENED",detail:`${o.name} · a physical route returns toward the hub`,kind:"discovery"};this.message=`${o.name} opens. The concealed corridor now joins the explored floor.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==="deepPortal"){
      const progress=deepDungeonProgress(this.save,this.areaId()),ready=o.unlockOnCompletion?progress.completed:!o.unlockObjectiveId||progress.completedObjectiveIds.includes(o.unlockObjectiveId);if(!ready)return{ok:false,message:this.message=o.unlockOnCompletion?"The return lattice is silent while the final guardian lives.":"The return lattice has not awakened."};if(o.targetLevelId&&o.targetLevelId!==(this.map.levelId||"root")){this.snapshotArea();this.save.session.activeDungeonLevelId=o.targetLevelId;progress.currentLevelId=o.targetLevelId;if(!progress.discoveredLevelIds.includes(o.targetLevelId))progress.discoveredLevelIds.push(o.targetLevelId);this.loadArea("dungeon",false);}this.player.x=o.toX;this.player.y=o.toY;relocateIfStranded(this.player,this.map,mapWidth(this.map,"dungeon"));this.projectiles=[];this.effects=[];this.message=o.unlockOnCompletion?"The final return lattice carries you back to the expedition hub.":"The return portal folds the cleared route back to the hub.";this.sync();return{ok:true,message:this.message};
    }
    if (o.kind === "deepMechanism") {
      const progress = deepDungeonProgress(this.save, this.areaId());
      if (!progress.completedObjectiveIds.includes(o.objectiveId)) progress.completedObjectiveIds.push(o.objectiveId);
      applyDeepDungeonProgress(this.save, this.areaId(), this.map);
      this.defeatNotice = { title: "MECHANISM AWAKENED", detail: `${o.name} · expedition route altered`, kind: "discovery" };
      this.message = `${o.name} answers. Stone routes shift and the expedition can continue.`; this.sync(); return { ok: true, message: this.message };
    }
    if (["storyGhost", "storyRelic", "storyTone","storyActor","storyScene"].includes(o.kind)) {
      const progress = deepDungeonProgress(this.save, this.areaId()), story = progress.story, pack = this.map.storyPackage;
      if (!pack) return { ok: false, message: (this.message = "Only an old silence remains.") };
      story.storyId = pack.id; story.started = true;
      if (o.kind === "storyRelic") { story.carriedRelic = o.id; o.state = "claimed"; o.actions = []; if (!story.completedBeatIds.includes("find-relic")) story.completedBeatIds.push("find-relic"); this.message = "The lost nameplate is cold, but a waiting presence recognizes it."; }
      else if (o.kind === "storyTone") { o.state = "sounded"; o.actions = []; if (!story.completedBeatIds.includes(o.beatId)) story.completedBeatIds.push(o.beatId); const tones = story.completedBeatIds.filter((q) => q.startsWith("tone-")).length; this.message = `The ${tones === 1 ? "first" : tones === 2 ? "second" : "final"} tone releases a fragment of the drowned procession.`; if (tones >= 3) completeDeepStory(this.save, this.areaId(), this.map); }
      else if(o.kind==="storyScene"){o.state="witnessed";o.actions=[];if(!story.completedBeatIds.includes(o.beatId))story.completedBeatIds.push(o.beatId);if(!story.scenesWitnessed.includes(o.id))story.scenesWitnessed.push(o.id);this.message=o.scenePattern==="confrontation"?"Two scorched figures materialize, accuse one another, and vanish before either can strike.":"The chamber darkens. Ember footprints cross the wall and end at a door that no longer exists.";if(story.completedBeatIds.includes("first-echo")&&story.completedBeatIds.includes("second-echo"))completeDeepStory(this.save,this.areaId(),this.map);}
      else if(o.kind==="storyActor"){if(!story.completedBeatIds.includes("muster")){story.completedBeatIds.push("muster");story.started=true;o.state="manifest";this.message="A patrol captain and three pale wardens materialize, salute, and march toward the sealed works.";}else if(progress.completedObjectiveIds.length){if(!story.completedBeatIds.includes("witness"))story.completedBeatIds.push("witness");o.state="departed";o.actions=[];completeDeepStory(this.save,this.areaId(),this.map);this.message="The last patrol crosses the cleared chamber, lowers its weapons, and departs into quiet light.";}else this.message="The captain points toward the guardian holding the patrol inside its final watch.";}
      else if (pack.id === "lost-bearer-v1" && story.carriedRelic) { if (!story.completedBeatIds.includes("return-relic")) story.completedBeatIds.push("return-relic"); o.state = "released"; o.actions = []; completeDeepStory(this.save, this.areaId(), this.map); this.message = "The bearer remembers its name. Two apparitions reunite, then pass beyond the Corridor together."; }
      else if (pack.id === "bound-spirit-v1" && progress.completedObjectiveIds.length) { if (!story.completedBeatIds.includes("avenge")) story.completedBeatIds.push("avenge"); o.state = "released"; o.actions = []; completeDeepStory(this.save, this.areaId(), this.map); this.message = "The slain guardian's hold breaks. The shade bows once and becomes a trail of quiet light."; }
      else { if (!story.completedBeatIds.includes("meet")) story.completedBeatIds.push("meet"); this.message = pack.summary; }
      this.sync(); return { ok: true, message: this.message };
    }
    if (o.kind === "deepReturn") {
      if (o.state !== "active") return { ok: false, message: (this.message = "The return lattice is dormant. Its wing guardian still holds the seal.") };
      this.player.x = o.toX; this.player.y = o.toY; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); this.projectiles = []; this.effects = []; this.traversal = null;
      this.message = "The cleared wing folds back into the central chamber.";
      this.sync();
      return { ok: true, message: this.message };
    }
    if (o.kind === "sealedGate") {
      const progress = applyDeepDungeonProgress(this.save, this.areaId(), this.map), requirements = this.map.finalGate?.requires || (this.map.wings || []).map((wing) => wing.id), completed = new Set([...(progress?.completedObjectiveIds || []), ...(progress?.defeatedWingIds || [])]), remaining = requirements.filter((id) => !completed.has(id)).length;
      this.message = remaining ? `The final seal holds. ${remaining} wing guardian${remaining === 1 ? " remains" : "s remain"}.` : "The three seals are broken. The final chamber stands open.";
      return { ok: true, message: this.message };
    }
    if (o.kind === "shipwright" || o.kind === "skiff") return this.boatAction(o, action || (o.kind === "skiff" ? "board" : null));
    if (o.kind === "diveSite" || o.kind === "diveExit") return this.diveAction(o);
    // Diving (W5): the first island landmark inspected yields the Bathysal Lens.
    if (o.islandLandmark && grantLens(this.save, o.id)) {
      journalOnce(this.save, "bathysal-lens", "In the shrine's basin lay a Bathysal Lens: a disc of sea-glass that lets the eye see through deep water. With a dive rig from a Shipwright, the dive buoys can be followed down.", "The Bathysal Lens");
      this.message = `${o.name}: you find a Bathysal Lens. ${canDive(this.save) ? "With your rig, you can now dive at dive buoys." : "A Shipwright's dive rig would let you dive."}`;
      this.sync(); return { ok: true, message: this.message };
    }
    if (!action && ["npc", "dungeon", "shrine", "relayTerminal","relayNode","shelterMerchant","traveler","displacementDevice","elitePortal","viewport"].includes(o.kind)) {
      this.interactionRequested = o.id;
      return {
        ok: true,
        message: (this.message =
          (o.name || "Crossing") + " — choose an action."),
      };
    }
    // Release 215: touching a strange thing opens a Glimpse.
    if (o.kind === "digSpot" && (action || validActions(o, this.save)[0]) === "dig") { const c = ensureShovel(this.save); if (!c.ok) { this.message = c.message; return { ok: false, message: this.message }; } const r = digSpot(this.save, o, this.rx, this.ry); this.message = (c.crafted ? c.message + " " : "") + r.message; this.sync(); return r; }
    if (o.strange && (action || validActions(o, this.save)[0]) === "touch") { const r = touchStrange(this.save, o, this.rx, this.ry); this.message = r.message; if (r.ok) this.glimpseCue = "strange"; return r; }
    const chosen = action || validActions(o, this.save)[0],
      before = this.save.hp,
      r = applyInteraction(o, chosen, this.save, this.areaId());
    this.message = r.message;
    if (!r.ok) return r;
    if ((o.kind === "npc"||o.kind==="shelterMerchant"||o.kind==="traveler") && chosen === "trade") this.shopRequested = o.id;
    if (this.save.hp !== before)
      this.player.hp = Math.min(
        this.save.maxHp,
        this.player.hp + (this.save.hp - before),
      );
    if (o.kind === "tree" && chosen === "climb") {
      this.player.x = o.x + 2;
      this.player.y = o.y - 2;
    }
    // Release 193: moments that may open a Glimpse (main.ts reads the cue on the next frame).
    if ((o.kind === "ruinMarker" || o.kind === "shrine") && chosen === "inspect") this.glimpseCue = "touch";
    if (r.transition === "dungeon") this.glimpseCue = "crossing";
    if (o.kind === "tree" && chosen === "cut") { applyFallenTreeCrossings(this.map); const n = woodFor(o), total = addWood(this.save, n); this.message = `${this.message} +${n} wood (${total}).`; r.message = this.message; }
    if(r.transition==="elitePortal"){
      this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDungeonId=`elite-portal:${this.save.seed}:knife-choir`;const h=dungeonHistory(this.save,this.save.session.activeDungeonId);h.visits++;h.visitOpen=true;this.loadArea('dungeon');this.player.x=4;this.player.y=5;relocateIfStranded(this.player,this.map,mapWidth(this.map,'dungeon'));
    } else if(r.transition==="displacement"){
      this.startDisplacement(o,false);
    } else if (r.transition === "dungeon") {
      this.save.session.dungeonReturn = {
        rx: this.rx,
        ry: this.ry,
        x: this.player.x,
        y: this.player.y,
      };
      this.save.session.activeDungeonId = o.dungeonId || dungeonId(
        this.save.seed,
        this.save.worldGeneration,
        this.rx,
        this.ry,
        o.id,
      );
      this.save.session.viewportDungeonHuntId=o.viewportHuntId||null;
      this.save.session.activeDungeonLevelId=null;
      pinDungeonLayout(this.save,this.save.session.activeDungeonId);const preview=generatePinnedDungeon(this.save,this.save.session.activeDungeonId);if(preview.multiLevel)this.save.session.activeDungeonLevelId=preview.levels[0].id;
      const h = dungeonHistory(this.save, this.save.session.activeDungeonId);
      h.visits++;
      h.visitOpen = true;
      this.loadArea("dungeon");
      this.player.x = this.map.entry?.x ?? 4;
      this.player.y = this.map.entry?.y ?? 5;
      relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon"));
    } else if (r.transition === "exit") {
      if(this.save.session.activeDisplacement){if(this.enemies.some(e=>!e.dead&&isCrossingGuardian(e))){this.message="The Mislaid Threshold remains sealed while its guardian lives.";return{ok:false,message:this.message}}const d=this.save.session.activeDisplacement;this.snapshotArea();this.rx=d.destination.rx;this.ry=d.destination.ry;this.save.session.displacementJourney={source:d.source,destination:d.destination};this.save.session.activeDisplacement=null;this.save.session.activeDungeonId=null;this.loadArea("overworld",false);this.player.x=16;this.player.y=16;relocateIfStranded(this.player,this.map,mapWidth(this.map,'overworld'));this.message="The completed crossing releases you onto stable ground in a distant, uncharted Corridor. Find a physical Wayglass to restore travel."}else this.leaveDungeon("You emerge at the dungeon entrance.");
    } else if (r.transition === "checkpoint") {
      this.save.session.displacementJourney=null;
      if (clearRot(this.save)) this.message += " Resting here clears the blight rot.";
      this.save.activeCheckpoint = {
        rx: this.rx,
        ry: this.ry,
        x: o.x,
        y: o.y,
        name: o.name,
      };
      this.save.checkpoints[this.rx + "," + this.ry] =
        this.save.activeCheckpoint;
    } else if (r.transition === "chest")
      this.obtainDrop(o.rewardSource || "chest");
    this.reconcileConsequences();
    this.sync();
    return r;
  }

  // The Skiff (water world W2): the Shipwright sells, repairs and launches it; a moored skiff can be boarded directly.
  boatAction(o, action) {
    const s = this.save, b = ensureBoatState(s);
    if (!action) { this.interactionRequested = o.id; return { ok: true, message: (this.message = `${o.name} — choose an action.`) }; }
    let r;
    if (action === "speak") r = { ok: true, message: b.owned ? `Shipwright: “Your skiff's hull stands at ${Math.round(b.hull)}/${BOAT.maxHull}.${repairCost(s) ? ` Patching it costs ${repairCost(s)} marks.` : ""}”` : `Shipwright: “A skiff for ${BOAT.price.currency} marks and ${BOAT.price.cinderIron} cinder iron. Sail the seas, lakes and fens — not the blight.”` };
    else if (action === "buySkiff") r = buySkiff(s, { rx: this.rx, ry: this.ry, x: o.berth.x, y: o.berth.y });
    else if (action === "repair") r = repairSkiff(s);
    else if (action === "buyRig") r = buyRig(s);
    else if (action === "board") {
      const at = o.kind === "skiff" ? { x: o.x, y: o.y } : o.berth;
      if (!board(s, at)) r = { ok: false, message: b.owned ? "The skiff needs repair before it can sail." : "You own no skiff." };
      else {
        this.map.objects = this.map.objects.filter((q) => q.kind !== "skiff");
        Object.assign(this.player, { x: at.x, y: at.y, sailVx: 0, sailVy: 0 }); this.swimming = false;
        if (o.kind === "shipwright") b.home = { rx: this.rx, ry: this.ry, x: at.x, y: at.y };
        r = { ok: true, message: "Aboard the skiff. Sail onto land to step ashore." };
      }
    } else r = { ok: false, message: "Nothing happens." };
    this.message = r.message; this.sync(); return r;
  }

  // Diving (water world W5): a dive buoy loads the underwater scene; the surface line brings the diver back up to it.
  diveAction(o) {
    const s = this.save;
    if (o.kind === "diveExit") { const ok = this.leaveDungeon("You follow the line back to the surface."); if (ok) { s.session.breath = DIVE.breath; this.sync(); } return { ok: !!ok, message: this.message }; }
    if (!canDive(s)) { this.message = diveSiteHint(s); return { ok: false, message: this.message }; }
    s.session.dungeonReturn = { rx: this.rx, ry: this.ry, x: o.x, y: o.y - .2 };
    s.session.activeDungeonId = diveId(s.seed, this.rx, this.ry); s.session.activeDungeonLevelId = null;
    const h = dungeonHistory(s, s.session.activeDungeonId); h.diveGenerator ??= h.visits > 0 ? 1 : DIVE_GENERATOR; h.visits++; h.visitOpen = true;
    this.swimming = false; this.loadArea("dungeon");
    this.player.x = this.map.entry.x; this.player.y = this.map.entry.y - .2; s.session.breath = DIVE.breath;
    this.message = "You dive. Watch your air: air pockets refill it, the line leads back up."; this.sync();
    return { ok: true, message: this.message };
  }

  // The nearest deep-water tile within reach where a skiff fits, while ashore in the overworld; null otherwise.
  // Release 225: the shovel. Facing a dungeon wall, Act digs one block (crafting a shovel first from wood and stone if
  // you carry none). Returns null when you are not facing diggable rock, so Act falls through to its other uses.
  digAhead() {
    if (this.area !== "dungeon" || !this.map?.tiles) return null;
    const p = this.player, w = mapWidth(this.map, this.area), px = Math.floor(p.x + .5), py = Math.floor(p.y + .75), key = this.areaStateId();
    const plan = planDig(this.map, px, py, p.facing || "down", key);
    if (!plan.ok) { if (!plan.reason) return null; this.message = plan.reason; return { ok: false, message: this.message }; }
    const c = ensureShovel(this.save); if (!c.ok) { this.message = c.message; return { ok: false, message: this.message }; }
    const r = dig(this.save, this.map, plan, key);
    if (r.ok) { this.map.wallGlints = (this.map.wallGlints || []).filter((g) => g.x !== plan.x || g.y !== plan.y); }
    this.message = (c.crafted ? c.message + " " : "") + r.message; this.sync(); return r;
  }
  // Release 231: the Tyrant Mosasaur rises from the deep a few tiles away and hunts the Wayfarer. It is not saved: the
  // section's restore only merges saved state onto what the section spawns, so leaving the section ends the hunt.
  riseTyrant() {
    const at = tyrantRisePoint(this.map, Math.floor(this.player.x + .5), Math.floor(this.player.y + .75), Math.random);
    if (!at) return null; // no open ocean in range: the chance is not spent
    countTyrantRise(this.tyrantVisit);
    const c = createCombatant("ashling", at.x, at.y, false, []);
    Object.assign(c, { id: `tyrant-hunt-${this.rx}-${this.ry}-${this.tyrantVisit?.count || 0}-${Math.round(this.lastUpdateNow || 0)}`, kind: TYRANT_HUNT.kind, variantId: `${TYRANT_HUNT.kind}:common`, meleePatterns: [], tentacles: 0, hunting: true }, seaCombatantFields(TYRANT_HUNT.kind));
    this.enemies.push(c);
    this.message = "Something vast turns in the deep beneath you. The Tyrant Mosasaur has your scent.";
    return c;
  }
  shoreWater() {
    if (this.area !== "overworld" || aboard(this.save) || !this.map?.landscape) return null;
    const p = this.player, w = mapWidth(this.map, this.area), cx = p.x + .5, cy = p.y + .75; let best = null;
    for (let y = Math.floor(cy - 2); y <= Math.ceil(cy + 2); y++) for (let x = Math.floor(cx - 2); x <= Math.ceil(cx + 2); x++) {
      const t = this.map.tiles[y * w + x]; if (!t || !SAILABLE_DEEP.includes(t.kind) || !footprintSailable(this.map, w, x, y - .2)) continue;
      const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d <= WOOD.reach + .5 && (!best || d < best.d)) best = { x, y, d };
    }
    return best;
  }
  buildSkiffHere() {
    const at = this.shoreWater();
    if (!at) { this.message = "Find deep water's edge to build a skiff."; return { ok: false, message: this.message }; }
    const r = buildSkiff(this.save, { rx: this.rx, ry: this.ry, x: at.x, y: at.y - .2 });
    if (r.ok) { this.map.objects = this.map.objects.filter((q) => q.kind !== "skiff"); Object.assign(this.player, { x: at.x, y: at.y - .2, sailVx: 0, sailVy: 0 }); this.swimming = false; }
    this.message = r.message; this.sync(); return r;
  }

  interactAt(x, y) {
    const o = (this.map.objects || [])
      .filter((q) =>
        Math.hypot(q.x - x, q.y - y) < 0.9 &&
        Math.hypot(q.x - this.player.x, q.y - this.player.y) < 1.5 &&
        validActions(q, this.save).length,
      )
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (!o) {
      this.message = "Nothing within reach responds.";
      return { ok: false, message: this.message };
    }
    return this.interact(null, o.id);
  }

  reconcileConsequences() {
    for (const o of this.map.objects || [])
      if (o.kind === "npc") {
        const n = this.save.consequences.npcs[o.id];
        if (n) {
          o.hp = n.hp;
          o.maxHp = 36;
          o.dead = n.status === "dead";
          o.state = o.dead ? "dead" : n.disposition;
        }
      }
    if (
      this.area !== "overworld" ||
      this.rx !== 0 ||
      this.ry !== 0 ||
      this.save.consequences.settlements["ember-refuge"].status !== "fallen"
    )
      return;
    for (const t of this.map.tiles) if (t.kind === "refuge") t.kind = "ash";
    const saved = this.save.session.areas[this.areaId()]?.enemies || [];
    for (const [kind, x, y, id] of [
      ["ashling", 14, 16, "occupation-refuge-west"],
      ["glassMite", 18, 17, "occupation-refuge-east"],
    ])
      if (!this.enemies.some((e) => e.id === id)) {
        const prior = saved.find((e) => e.id === id),
          e = prior
            ? { ...prior, ai: { ...prior.ai } }
            : { ...createCombatant(kind, x, y), id };
        ensureAI(e);
        this.enemies.push(e);
      }
  }
  npcTargets() {
    return (this.map.objects || []).filter(
      (o) =>
        o.kind === "npc" &&
        this.save.consequences.npcs[o.id]?.status !== "dead",
    );
  }
  syncNpcDamage(cause) {
    for (const o of this.npcTargets()) {
      const prior = this.save.consequences.npcs[o.id];
      if (o.hp < prior.hp)
        recordNpcDamage(this.save, o, prior.hp - o.hp, cause, "collateral");
    }
    this.reconcileConsequences();
  }
  installDungeonDeath() {
    if (this._dungeonDeathInstalled) return;
    this._dungeonDeathInstalled = true;
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      const wasDungeon = this.area === "dungeon",
        id = wasDungeon
          ? this.save.session.activeDungeonId ||
            `dungeon:${this.save.seed}:g${this.save.worldGeneration}`
          : null,
        q =
          wasDungeon && this.save.session.dungeonReturn
            ? { ...this.save.session.dungeonReturn }
            : null,
        deaths = this.save.worldFlags.deaths || 0;
      update(dt, input, now);
      // A drowned diver is hauled up the line to the buoy instead of restarting below (W5).
      if (wasDungeon && (this.save.worldFlags.deaths || 0) > deaths && this.area !== "dungeon" && String(id).startsWith("dive:") && q) {
        this.rx = q.rx; this.ry = q.ry; this.loadArea("overworld", false); this.player.x = q.x; this.player.y = q.y;
        this.save.session.breath = DIVE.breath; this.save.session.activeDungeonId = null; this.save.session.dungeonReturn = null;
        this.message = "Out of air — the line hauls you, half-drowned, back to the surface. Nothing carried was lost.";
      } else if (
        wasDungeon &&
        (this.save.worldFlags.deaths || 0) > deaths &&
        this.area !== "dungeon"
      ) {
        this.save.session.activeDungeonId = id;
        this.save.session.dungeonReturn = q;
        const anchor = String(id).includes(":deep-v") ? deepDungeonProgress(this.save,id).activeAnchor:null;
        if(anchor?.levelId)this.save.session.activeDungeonLevelId=anchor.levelId;
        const stateId=this.save.session.activeDungeonLevelId?`${id}:level:${this.save.session.activeDungeonLevelId}`:id,claimed = this.save.session.areas[stateId]?.objects || {},
          deep = String(id).includes(":deep-v");
        if (!deep) {
          // Ordinary rooms reset, but a failed exceptional encounter retains its lifecycle record.
          // Gate tombstones prevent a new hunt; major actors already have full HP and spent attempts.
          const exceptional = (this.save.session.areas[stateId]?.enemies || []).filter(e => e.gatePredator || e.worldBeast || e.questingBeast);
          if (exceptional.length) this.save.session.areas[stateId] = { encounterVersion: this.save.session.areas[stateId]?.encounterVersion || 0, enemies: exceptional, objects: {}, projectiles: [], effects: [], eliteHazards: [] };
          else delete this.save.session.areas[stateId];
        }
        this.loadArea("dungeon", false);
        for (const o of this.map.objects)
          if (claimed[o.id]?.state === "used") o.state = "used";
        const recovery = deep ? deepDungeonProgress(this.save, id).activeAnchor : null;
        this.player.x = deep ? (recovery?.x ?? this.map.hub?.x ?? this.map.entry?.x ?? 4) : (this.map.entry?.x ?? 4);
        this.player.y = deep ? (recovery?.y ?? this.map.hub?.y ?? this.map.entry?.y ?? 5) : (this.map.entry?.y ?? 5);
        relocateIfStranded(this.player,this.map,mapWidth(this.map,"dungeon"));
        this.updateDungeonDiscovery(true);
        this.player.invulnerableUntil = now + 2000;
        this.projectiles = [];
        this.effects = [];
        this.traversal = null;
        this.message = deep ? `Felled — recovered at the central anchor of ${this.map.name}. Cleared wings, shortcuts, carried items, XP, and map progress remain.` : `Felled — returned to the entrance of ${this.map.name}. The run begins again; your map and everything carried remain.`;
        this.sync();
      }
    };
  }
  installDungeonHistoryRepair() {
    if (this._dungeonHistoryRepairInstalled) return;
    this._dungeonHistoryRepairInstalled = true;
    const update = this.update.bind(this);
    this.update = (dt, input, now) => {
      const id =
          this.area === "dungeon" ? this.save.session.activeDungeonId : null,
        h = id ? dungeonHistory(this.save, id) : null,
        abandoned = h?.abandoned || 0,
        deaths = this.save.worldFlags.deaths || 0;
      update(dt, input, now);
      if (id && (this.save.worldFlags.deaths || 0) > deaths) {
        h.abandoned = abandoned;
        h.visitOpen = true;
        this.save.narrative.journal = this.save.narrative.journal.filter(
          (j) => !String(j.recordId).startsWith("abandon:" + id + ":"),
        );
      }
    };
  }
  useCrossingSigil() {
    const c = this.save.consumables;
    if (!(c?.crossingSigil > 0)) {
      this.message = "No Crossing Sigil remains.";
      return false;
    }
    if (this.area !== "dungeon") {
      this.message = "The Crossing Sigil only answers inside a dungeon.";
      return false;
    }
    c.crossingSigil--;
    return this.leaveDungeon(
      "The Crossing Sigil tears a narrow path back to the dungeon entrance.",
    );
  }

  packHurt(source, amount, options = {}, now = performance.now()) {
    const p = this.player;
    if (source?.illusion || !(amount > 0) || now <= (p.invulnerableUntil || 0)) return false;
    if (options.jumpable && now < (this.jumpUntil || 0)) return false;
    const veil = this.save.magicSkills?.active?.id === 'veil-guard' ? .12 + .08 * skillRank(this.save, 'veil-guard') : 0;
    p.hp -= Math.max(1, Math.ceil((this.guardRemaining > 0 ? amount * .65 : amount) * (1 - Math.min(.75, characterStats(this.save).damageReduction + veil))));
    p.invulnerableUntil = now + (options.beam ? 320 : 700);
    return true;
  }
  walkerLandingGraph() {
    const map = this.map, tiles = map.tiles || [], width = mapWidth(map, this.area), entry = map.entry || {};
    const flag = t => !t || t.blocked || LETHAL_KINDS.has(t.kind) || ["districtWall", "shackWall"].includes(t.structure) ? 1 : t.slope ? 2 : 0;
    const old = this._walkerLandingGraph;
    let changed = old?.map !== map || old.width !== width || old.landscape !== !!map.landscape || old.entryX !== entry.x || old.entryY !== entry.y || old.flags.length !== tiles.length;
    // Gates and terrain can change in place. A stale connected-component cache must never permit a landing
    // behind a newly closed barrier. Comparing finite per-tile navigation flags is cheaper than rebuilding BFS.
    if (!changed) for (let i = 0; i < tiles.length; i++) if (old.flags[i] !== flag(tiles[i]) || old.heights[i] !== (Number(tiles[i]?.elev) || 0)) { changed = true; break; }
    if (changed) this._walkerLandingGraph = { map, width, landscape: !!map.landscape, entryX: entry.x, entryY: entry.y, flags: Uint8Array.from(tiles, flag), heights: Float64Array.from(tiles, t => Number(t?.elev) || 0), cells: walkerReachableTiles(map) };
    return this._walkerLandingGraph.cells;
  }
  walkerSafeTeleport(e, x, y) {
    const map = this.map, width = mapWidth(map, this.area), height = mapHeight(map, this.area);
    if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x > width - 1 || y > height - 1 || !walkerGroundPositionOpen(map, width, x, y)) return false;
    if (this.area === "dungeon") {
      const connected = this.walkerLandingGraph();
      for (let ty = Math.floor(y + .5); ty <= Math.floor(y + .88 - 1e-6); ty++) for (let tx = Math.floor(x + .24); tx <= Math.floor(x + .76 - 1e-6); tx++) if (!connected.has(ty * width + tx)) return false;
    }
    if (this.enemies.some(other => other !== e && !other.dead && Math.hypot(other.x - x, other.y - y) < .65)) return false;
    if (Math.hypot(this.player.x - x, this.player.y - y) < .85) return false;
    e.x = x; e.y = y; this._walkerRoutes?.delete(e); return true;
  }
  walkWalkerRoute(e, s, dt, retreat = false) {
    if (!(dt > 0)) return;
    const width = mapWidth(this.map, this.area), routes = this._walkerRoutes ||= new WeakMap();
    let r = routes.get(e);
    if (!r || r.retreat !== retreat || r.map !== this.map) { r = { map: this.map, retreat, route: [], recent: [], seq: 0, wait: 0, topologyTime: 0 }; routes.set(e, r); }
    s.vel = { x: 0, y: 0 }; r.wait = Math.max(0, r.wait - dt);
    let targets;
    if (retreat) {
      e.untargetable = true;
      // Overworld sections retain their existing home/exit-leg policy; only a real dungeon mouth ends a
      // found-home leg. Outside targets clamp to the safe gate tile, never teleport across the boundary.
      targets = this.area === "dungeon" || e.fleeTo.home || e.fleeTo.nearestDoor ? walkerRetreatDoors(this.map, this.area) : [{
        x: Math.max(0, Math.min(width - 1, e.fleeTo.x)), y: Math.max(0, Math.min(mapHeight(this.map, this.area) - 1, e.fleeTo.y)) }];
      r.topologyTime -= dt;
      // At most one compact terrain scan per second. The very next movement edge is still checked every
      // frame, and Supernova's terrain callback invalidates all routes immediately.
      if (r.topologyTime <= 0) {
        const topology = walkerRetreatTopology(this.map, width, targets, r.topology);
        if (topology !== r.topology) { r.route = []; r.search = null; r.jump = null; r.wait = 0; delete e.fleeFade; e.hopLift = 0; e.jumping = false; }
        r.topology = topology; r.topologyTime = WALKER_ROUTE.retry;
      }
      if (e.fleeFade != null) {
        const atDoor = targets.some(p => Math.hypot(e.x - p.x, e.y - p.y) < .00001 && walkerGroundPositionOpen(this.map, width, p.x, p.y));
        if (!atDoor) { delete e.fleeFade; r.route = []; r.search = null; }
        else { e.hopLift = 0; e.fleeFade = Math.max(0, e.fleeFade - dt / RETREAT.fade); if (!e.fleeFade) e.fleeDone = true; return; }
      }
    }
    if (r.wait > 0) return;
    const arrive = () => { e.hopLift = 0; e.jumping = false; if (e.fleeTo.home) e.fleeFade = 1; else e.fleeDone = true; };
    if (!r.route.length) {
      let plan;
      if (retreat) {
        r.search ||= beginWalkerRetreatSearch(e, this.map, width, targets);
        plan = advanceWalkerRetreatSearch(e, r.search);
      } else plan = walkerDungeonRoute(e, this.map, width, { seq: r.seq++, recent: r.recent });
      this.performanceStats.pathfindingWork += plan.visited;
      if (plan.status === "pending") return;
      r.search = null; r.route = plan.route;
      if (retreat && plan.status === "reached") {
        r.target = plan.target; e.fleeTo = { ...e.fleeTo, ...plan.target };
        if (!r.route.length) { arrive(); return; }
      }
      if (!r.route.length) { r.wait = WALKER_ROUTE.retry; return; } // no path means wait safely, never rift or despawn
      if (!retreat) { r.recent.push({ ...r.route.at(-1) }); r.recent = r.recent.slice(-WALKER_ROUTE.recent); }
    }
    const to = r.route[0];
    if (!walkerGroundSegmentOpen(e, this.map, width, e, to, retreat)) { r.route = []; r.search = null; r.jump = null; e.hopLift = 0; e.jumping = false; r.wait = WALKER_ROUTE.pause; return; }
    const dx = to.x - e.x, dy = to.y - e.y, d = Math.hypot(dx, dy), speed = retreat ? RETREAT.speed : WALKER_ROUTE.speed * (e.speedMultiplier || 1);
    if (retreat && !r.jump && !walkerGroundSegmentOpen(e, this.map, width, e, to)) r.jump = { from: { x: e.x, y: e.y }, to, distance: d };
    const jump = r.jump, step = Math.min(d, jump ? jump.distance * dt / Math.max(WALKER_ROUTE.jumpTime, jump.distance / speed) : speed * dt);
    if (d > 1e-8) {
      const x = e.x, y = e.y, body = retreat ? { ...e, isPlayer: true, jumping: true, flying: false, phases: false } : e;
      moveAxis(body, dx / d * step, dy / d * step, this.map, width); e.x = body.x; e.y = body.y;
      s.vel = { x: (e.x - x) / dt, y: (e.y - y) / dt }; if (Math.abs(dx) > .001) e.facingX = dx > 0 ? 1 : -1;
    }
    if (jump) {
      const progress = Math.min(1, Math.hypot(e.x - jump.from.x, e.y - jump.from.y) / jump.distance),
        fromLift = liftAt(this.map, width, jump.from.x, jump.from.y), toLift = liftAt(this.map, width, jump.to.x, jump.to.y);
      e.jumping = true;
      // Shared monster rendering subtracts hopLift * .2 tiles. Compensate the discrete terrain lift so
      // the body follows a continuous arc rather than snapping vertically when its feet cross the ledge.
      e.hopLift = Math.sin(progress * Math.PI) * WALKER_ROUTE.jumpLift + (fromLift + (toLift - fromLift) * progress - liftAt(this.map, width, e.x, e.y)) / .2;
    }
    if (Math.hypot(e.x - to.x, e.y - to.y) < 1e-6) {
      r.route.shift(); r.jump = null; e.hopLift = 0; e.jumping = false;
      if (!r.route.length) { if (retreat) arrive(); else r.wait = WALKER_ROUTE.pause; }
    }
  }
  packWorld(dt, now, sanctuary = null) {
    const map = this.map, width = mapWidth(map, this.area), height = mapHeight(map, this.area), p = this.player, last = this._packLastPlayer || p, game = this;
    return {
      player: p, map, width, height, area: this.area, dt, now, enemies: this.enemies, sanctuary,
      playerVelocity: dt > 0 ? { x: (p.x - last.x) / dt, y: (p.y - last.y) / dt } : { x: 0, y: 0 },
      playerShots: this.projectiles, playerSwinging: now < (p.meleeUntil || 0), playerBlasts: this.effects.filter((fx) => !fx.hostile && fx.damage > 0), // release 187: the Questing Beast reads these to dodge (release 245: the Nanobot Knight reads spells too)
      playerFacing: ({ left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } })[p.facing] || { x: 0, y: 1 },
      pull(source, step, radius) { const ddx = source.x - p.x, ddy = source.y - p.y, dd = Math.hypot(ddx, ddy); if (!dd || dd > radius || now < (p.dodgeUntil || 0)) return false; moveAxis(p, ddx / dd * Math.min(step, Math.max(0, dd - 1)), ddy / dd * Math.min(step, Math.max(0, dd - 1)), map, width, true); return true; },
      open: (x, y) => footprintOpen(map, width, x, y),
      tileOpen: (x, y) => tileOpen(map, width, x, y),
      projectileOpen: (x, y) => projectileTileOpen(map, width, x, y),
      safeTeleport: (e, x, y) => game.walkerSafeTeleport(e, x, y),
      walkerPatrol: (e, s) => game.walkWalkerRoute(e, s, dt),
      walkerRetreat: (e, s) => game.walkWalkerRoute(e, s, dt, true),
      consumeVoidTerrain(e, center, radius) {
        // Match the native Supernova's continuous world-space disk, not rounded tile centers.
        const result = consumeVoidTerrain(game.save, map, game.areaStateId(), { x: center.x + .5, y: center.y + .62, visualLift: liftAt(map, width, center.x, center.y) }, radius, [p, ...game.enemies.filter(q => !q.dead)]);
        if (result.changed) { game._walkerLandingGraph = null; game._walkerRoutes = new WeakMap(); map.wallGlints = (map.wallGlints || []).filter(q => map.tiles[q.y * width + q.x]?.blocked); }
        return result;
      },
      los: (a, b, projectile = false) => hasLineOfSight(a, b, map, width, projectile),
      move(e, dx, dy, opts = {}) {
        if (e.kind === "voidWalker") return moveWalkerGround(e, dx, dy, map, width);
        if (opts.phase || isDungeonRoamer(e, game.area)) { const nx = Math.max(0, Math.min(width - 1, e.x + dx)), ny = Math.max(0, Math.min(height - 1, e.y + dy)), moved = nx !== e.x || ny !== e.y; e.x = nx; e.y = ny; return moved; }
        return moveAxis(e, dx, dy, map, width, !!e.flying);
      },
      gateChase(e, step) {
        const ai = ensureAI(e), blockedSight = !hasLineOfSight(e, p, map, width);
        if (ai.gateStep && Math.hypot(ai.gateStep[0]-e.x,ai.gateStep[1]-e.y)<.08) ai.gateStep=null;
        if (blockedSight && !(ai.gatePathRetry > now)) { ai.gatePathRetry=now+350; ai.gateStep=boundedChaseStep(e,p,map,width); }
        const target=ai.gateStep?{x:ai.gateStep[0],y:ai.gateStep[1]}:p;
        const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);
        if (d<.01) return false;
        const travel=Math.min(step,d),moved=moveAxis(e,dx/d*travel,dy/d*travel,map,width);
        // Point LOS can clear a corner that the actor footprint cannot. Cache a bounded detour on collision too.
        if (!moved && !(ai.gatePathRetry>now)) { ai.gatePathRetry=now+350; ai.gateStep=boundedChaseStep(e,p,map,width); }
        return moved;
      },
      // The dungeon is the Crystal's domain: patrol and combat use the same bounded wall-phasing movement.
      roamMove(e, dx, dy) { return this.move(e, dx, dy); },
      roamWork: (n) => { game.performanceStats.pathfindingWork += n; },
      detour(e, speed) { const step = boundedChaseStep(e, p, map, width); if (step) { const px = step[0] - e.x, py = step[1] - e.y, m = Math.hypot(px, py) || 1; (e.kind === "voidWalker" ? moveWalkerGround : moveAxis)(e, px / m * speed, py / m * speed, map, width, !!e.flying); } },
      hurt: (source, amount, options) => !(sanctuary && Math.hypot(p.x - sanctuary.x, p.y - sanctuary.y) < sanctuary.radius) && game.packHurt(source, amount, options, now),
      grab(source) { if (now < (p.dodgeUntil || 0) || now <= (p.invulnerableUntil || 0)) return false; p.heldUntil = now + CRYSTAL.grabHold * 1000 + 100; p.heldBy = source.id; game.message = "It has you. Struggle: dodge, again and again!"; return true; }, // release 249
      held(source) { return now < (p.heldUntil || 0) && p.heldBy === source.id; },
      release(source) { if (p.heldBy === source.id) p.heldUntil = 0; },
      push(source, step, radius) { const ddx = p.x - source.x, ddy = p.y - source.y, dd = Math.hypot(ddx, ddy) || 1; if (dd > radius || now < (p.dodgeUntil || 0)) return false; moveAxis(p, ddx / dd * step, ddy / dd * step, map, width, true); return true; }, // release 235: the Blob's jet
      poison(seconds, dps) { if (sanctuary && Math.hypot(p.x - sanctuary.x, p.y - sanctuary.y) < sanctuary.radius) return; if (now < (p.dodgeUntil || 0)) return; applyPoison(ensureEliteState(game.save).status, seconds, dps); },
      effects: () => game.packEffects || [],
      elevation: (x, y) => elevationAt(map, width, x, y), // release 235: high ground stays above the Blob
      slow(factor, seconds) { p.slowFactor = Math.min(now < (p.slowUntil || 0) ? (p.slowFactor || 1) : 1, factor); p.slowUntil = Math.max(p.slowUntil || 0, now + seconds * 1000); },
      addEffect: (effect) => addPackEffect(game.packEffects ||= [], effect, now),
      spawnMinion(owner, kind, x, y, index) {
        const c = createCombatant(kind, x, y, false, []);
        Object.assign(c, { id: `${owner.id}:brood:${Math.round(now)}:${index}`, noRewards: true, summonedBy: owner.id, broodOf: owner.id, aggro: true });
        if (game.area === "dungeon") tuneDungeonThreat(c);
        ensureAI(c); game.enemies.push(c); return c;
      },
      spawnIllusion(owner, x, y, index) {
        const c = createCombatant(owner.kind, x, y, false, []);
        Object.assign(c, { id: `${owner.id}:illusion:${Math.round(now)}:${index}`, illusion: true, noRewards: true, summonedBy: owner.id, bornAt: now, hp: 1, maxHp: 1, aggro: true, scale: owner.scale, bodyRadius: owner.bodyRadius, packAttacks: (owner.packAttacks || []).filter((a) => !['mirrorClones', 'mirrorSwap'].includes(a)), packBossAttacks: [] });
        ensureAI(c); game.enemies.push(c); return c;
      },
    };
  }
  // The Listener's turn (release 138): call guardians in at its health thresholds, hide behind them from gate 3, and
  // (in its "both" form) change from mirror to walled at half health. Returns true while it is hidden (skip its AI).
  updateListener(e, now) {
    const f = ensureFarArray(this.save), gate = f.activeRun?.gate || f.gate, marks = summonThresholds(gate), ratio = e.hp / Math.max(1, e.maxHp);
    if ((e.summoned || 0) < marks.length && ratio <= marks[e.summoned || 0]) {
      const open = this.map.tiles.filter((t) => !t.blocked && Math.hypot(t.x - e.x, t.y - e.y) > 2 && Math.hypot(t.x - e.x, t.y - e.y) < 6), at = open[hashSeed(`${e.id}:summon:${e.summoned || 0}`) % Math.max(1, open.length)] || { x: e.x + 2, y: e.y };
      const c = this.createEnemyFromSpawn(summonSpawn(this.save, { x: at.x, y: at.y }, e.summoned || 0), "dungeon"); tuneArrayBoss(c, this.save, characterStats(this.save), "summon"); c.aggro = true; this.enemies.push(c); e.summoned = (e.summoned || 0) + 1;
      if (listenerHides(gate)) { e.untargetable = true; this.message = "The Listener calls something through the line and slips behind it."; } else this.message = "The Listener calls something through the line.";
    }
    if (e.listenerForm === "both" && e.listenerPhase === "open" && ratio <= .5) { const w = LISTENER_FORMS.walled; Object.assign(e, { listenerPhase: "walled", packAttacks: [...w.attacks], packBossAttacks: [...w.boss], foundryName: w.name }); this.message = "The Listener's face falls away. Behind it, walls."; }
    if (e.untargetable && !this.enemies.some((q) => q.farArraySummon && !q.dead)) { e.untargetable = false; this.message = "With its callers gone, the Listener steps back into the light."; }
    return !!e.untargetable;
  }
  // Release 239: a world beast runs out of patience and retreats home, invulnerable and through everything; it leaves
  // each section by the gate toward home (the Wayfarer may follow) and, in the home section, goes into its home ground.
  tickWorldBeasts(dt) {
    if (this.beastNote) { this.message = this.beastNote; this.beastNote = null; }
    let gone = null;
    for (const e of this.enemies) {
      if (!e.worldBeast || e.dead || !WORLD_BEASTS[e.worldBeast]) continue;
      const id = e.worldBeast, B = WORLD_BEASTS[id], q = this.save.worldBeasts?.[id]?.active;
      if (!q) continue;
      if (!e.retreating && e.aggro && q.dungeon && worldBeastPatience(this.save, id, dt)) { const r = beginDungeonRetreat(this.save, id, this.map); e.retreating = true; this.message = r.message; for (const m of this.enemies) if (m.summonedBy === e.id && !m.dead) { m.dead = true; m.noRewards = true; } journalOnce(this.save, `world-beast-flees:${id}:${this.save.worldBeasts[id].cycle}`, r.message, "World beasts"); }
      if (!e.retreating && e.aggro && !q.dungeon && this.area === "overworld" && worldBeastPatience(this.save, id, dt)) {
        const seed = this.save.seed, gen = this.save.worldGeneration, r = beginRetreat(this.save, id, this.rx, this.ry, (x, y) => { let g = null; const region = () => (g ||= generateRegion(seed, x, y, gen)); return { get biome() { return biomeFor(seed, x, y); }, get dominant() { return region().dominant; }, get canyon() { return region().environment?.kind === "canyon"; }, get dungeon() { return (region().objects || []).some((o) => o.kind === "dungeon"); } }; }); // release 241: a section is generated only for homes that need it
        e.retreating = true; this.message = r.message;
        for (const m of this.enemies) if (m.summonedBy === e.id && !m.dead) { m.dead = true; m.noRewards = true; }
        journalOnce(this.save, `world-beast-flees:${id}:${this.save.worldBeasts[id].cycle}`, r.message, "World beasts");
      }
      if (e.retreating && !e.fleeTo && q.retreat) { const to = retreatTarget(q.retreat, id, this.map, this.rx, this.ry, q.dungeon ? {} : sectionExits(this.save.seed, this.rx, this.ry), e); Object.assign(e, { fleeTo: to, fleePath: id === "voidWalker" ? [] : retreatPath(this.map, e, to, B.retreatMoves, Number(this.map.width) || 32), fleeSpeed: RETREAT.speed, fleeFadeTime: RETREAT.fade, untargetable: true }); } // release 239: it finds its way round walls, over chasms, by bridges
      if (!e.fleeDone) continue;
      (gone ||= []).push(e);
      if (e.fleeTo.home) { const line = retreatEnded(this.save, id); this.message = line; journalOnce(this.save, `world-beast-home:${id}:${this.save.worldBeasts[id].cycle}`, line, "World beasts"); }
      else { retreatCrossed(this.save, id, e.fleeTo.side); this.message = `${B.name} flees ${e.fleeTo.side}, out of this section. Follow it, or it is gone.`; }
    }
    if (gone) this.enemies = this.enemies.filter((e) => !gone.includes(e));
  }
  // Release 245: a plain physical blow scatters the Nanobot Knight into its swarm (no damage); elements, spells and a
  // weapon carrying the Echo glyph reach it. Returns true when the blow scatters.
  scatterCheck(e, physical, echoGlyph, now) {
    if (!nanoScatters(e, { physical, echoGlyph })) return false;
    e.scattered = .45;
    if (now > (this.scatterNoteAt || 0)) { this.scatterNoteAt = now + 9000; this.message = "It scatters into a swarm around your blow and reforms. Plain steel will not hurt it: use spells, magic, or a weapon carrying the Echo glyph or an elemental glyph (Ignite, Chain, Volatile)."; }
    return true;
  }
  createEnemyFromSpawn(e, area = this.area) {
      const c = createCombatant(e.kind, e.x, e.y, e.boss, e.traits || []);
      if (e.id) c.id = e.id;
      if (e.packGuardian) c.packGuardian = true;
      if (e.skirmishId) Object.assign(c, skirmishFields(e));
      if (e.questingBeast) tuneQuestingBeast(c, this.save, characterStats(this.save));
      if (e.worldBeast) tuneWorldBeast(c, this.save, e.worldBeast, characterStats(this.save)); // release 235
      if (e.retreating) Object.assign(c, { retreating: true, aggro: true, untargetable: true }); // release 239: fleeing through
      if (area === "dungeon" && isArrayRun(this.save.session.activeDungeonId)) {
        if (e.farArrayBoss === "listener") { const form = LISTENER_FORMS[e.listenerPhase] || LISTENER_FORMS.open; Object.assign(c, { farArrayBoss: "listener", listenerForm: e.listenerForm, listenerPhase: e.listenerPhase, packAttacks: [...form.attacks], packBossAttacks: [...form.boss], summoned: 0, foundryName: form.name }); }
        else if (e.farArrayBoss) c.farArrayBoss = e.farArrayBoss;
        if (e.farArraySummon) c.farArraySummon = true;
        scaleForGate(c, this.save, e.farArrayBoss ? "boss" : e.farArraySummon ? "summon" : "minion");
      }
      if(c.packKind){const boss=c.packBossAttacks?.length>0;Object.assign(c,packCombatantFields(c.kind,c.id,boss));if(!boss)c.packBossAttacks=[]}
      Object.assign(c, { dungeonRole: e.dungeonRole || null, encounterGroup:e.encounterGroup||null,encounterSpawn:!!e.encounterSpawn,objectiveId: e.objectiveId || null, wingId: e.wingId || null, arenaId: e.arenaId || null, deepDungeon: !!e.deepDungeon,viewportHuntId:e.viewportHuntId||null,worldBoss:!!e.worldBoss,domainReinforcement:!!e.domainReinforcement,noRewards:!!e.noRewards,domainId:e.domainId||null,domainFamily:e.domainFamily||null,domainRole:e.domainRole||null,domainBoss:!!e.domainBoss,domainLieutenant:!!e.domainLieutenant,domainManifestation:e.domainManifestation||0,rootboundRegeneration:!!e.rootboundRegeneration,rootGroundAttack:!!e.rootGroundAttack,huntInstanceId:e.huntInstanceId||null });
      if(e.domainManifestation){const mechanics=manifestationMechanics(e.domainFamily,e.domainManifestation);c.foundryAttack=mechanics.attack==='sweepingBeam'?'sweepingBeam':null;c.speedMultiplier*=mechanics.mobility;c.domainMechanics=mechanics}
      if(c.eliteId){const v=eliteVariant(this.save.seed,c.eliteId,this.areaId());c.variantId=v.variantId;c.eliteModules=[...v.modules];c.eliteVariantModules=[...v.variantModules];c.visualSeed=v.visualSeed;}
      Object.assign(c,{passiveBehavior:e.passiveBehavior||null,ambient:!!e.ambient,pursuesOutdoors:!!(e.shelterAmbush||e.districtResident),shelterAmbush:!!e.shelterAmbush});
      if(e.foundryId){const boss=e.foundryRole==='boss',melee=e.attack==='meleeSwipe';Object.assign(c,{id:e.foundryId,foundryId:e.foundryId,foundryName:e.foundryName,foundryRole:e.foundryRole,foundryModules:[...(e.foundryModules||[])],foundryAttack:e.attack,foundryMovement:e.movement,foundryWeakness:e.weakness,foundryBody:e.body,visualSeed:e.visualSeed,kind:e.kind,maxHp:boss?210:e.foundryRole==='passive'?22:52,hp:boss?210:e.foundryRole==='passive'?22:52,damage:boss?17:e.foundryRole==='passive'?0:10,range:e.foundryRole==='passive'?0:melee?1.25:boss?5.5:5,boss,ambient:e.foundryRole==='passive',scale:boss?1.95:e.foundryRole==='passive'?.92:1.18,bodyRadius:boss?.72:.46,segments:e.body==='segmented'?3:e.foundryRole==='passive'?2:1,tentacles:e.body==='tentacled'||e.body==='biomechanical'?(boss?6:3):0,speedMultiplier:e.movement==='hopping'?1.18:e.movement==='retreating'?.88:e.movement==='hovering'?1.08:1,foundryValidated:true})}
      // Release 132: a Viewport-posted Foundry lifeform is a hunt, not a stray: it scales with the Wayfarer's level.
      if((e.viewportHuntId||e.foundryAdmitted)&&e.foundryId&&e.foundryRole==='hostile'){const lv=Math.max(1,this.save.level||1);c.maxHp=c.hp=HUNT_FOUNDRY.hp+HUNT_FOUNDRY.hpPerLevel*lv;c.damage=Math.max(c.damage||0,HUNT_FOUNDRY.damage+Math.round(lv*HUNT_FOUNDRY.damagePerLevel))}
      if (e.gatePredator) Object.assign(c,{gatePredator:true,pursuesOutdoors:true,maxHp:260,hp:260,damage:22,range:5.5,scale:1.85,bodyRadius:.7,tentacles:8,speedMultiplier:1.12});
      if (e.apertureEncounter) {
        const multiplier = Math.max(1, Number(e.threatMultiplier) || 1);
        c.apertureEncounter = true;
        c.apertureTier = e.apertureTier;
        c.maxHp = Math.round(c.maxHp * multiplier);
        c.hp = c.maxHp;
        c.damage = Math.max(1, Math.round(c.damage * multiplier));
        c.xpMultiplier = multiplier;
      }
      if(area==="dungeon"&&!c.passiveBehavior&&!c.gatePredator){
        let hp=1.08,damage=1.04,speed=1,attackCooldownScale=.94,telegraphScale=1;
        if(c.dungeonRole==="hunter"){speed=1.16;attackCooldownScale=.88}
        else if(c.dungeonRole==="ranged"){speed=1.05;attackCooldownScale=.84}
        else if(c.dungeonRole==="blocker"){hp=1.22;speed=.94}
        else if(c.dungeonRole==="gateWarden"||c.dungeonRole==="objectiveGuardian"){hp=1.35;damage=1.14;speed=1.1;attackCooldownScale=.78;telegraphScale=.92;c.staggerResistance=.5}
        else if(c.dungeonRole==="finalBoss"){hp=1.48;damage=1.2;speed=1.12;attackCooldownScale=.72;telegraphScale=.88;c.staggerResistance=.65}
        if(c.kind==="gateRevenant"){c.maxHp=360;c.hp=360;c.damage=22;c.range=5.5}
        c.maxHp=Math.round(c.maxHp*hp);c.hp=c.maxHp;c.damage=Math.max(1,Math.round(c.damage*damage));c.speedMultiplier*=speed;c.attackCooldownScale=attackCooldownScale;c.telegraphScale=telegraphScale;
      }
      if(area === "dungeon" && !c.passiveBehavior && !c.ambient && !c.worldBeast) tuneDungeonThreat(c);
      // Every monster hits harder (Tim, 2026-10-16). Foes tuned to the Wayfarer (the Questing Beast, Far Array bosses) are exempt.
      if(c.damage>0&&!c.questingBeast&&!c.worldBeast&&!c.farArrayBoss)c.damage=Math.max(1,Math.round(c.damage*ENEMY_DAMAGE_SCALE));
      if (c.gatePredator) tuneGatePredator(c, this.save, characterStats(this.save));
      ensureAI(c);
      return c;
  }
  prepareDungeonCompletion() {
    const history = dungeonHistory(this.save,this.areaId()), maps = [this.map];
    if (this.map.multiLevel) for (const level of this.map.levels || []) if (level.id !== this.map.levelId)
      maps.push(generatePinnedDungeon(this.save,this.areaId(),{levelId:level.id}));
    const clear = registerDungeonBosses(history,maps);
    for (const [key,snapshot] of Object.entries(this.save.session.areas || {})) if (key === this.areaId() || key.startsWith(this.areaId()+':level:')) for (const e of snapshot.enemies || [])
      if (e.dead && clear.required.includes(e.id) && !clear.defeated.includes(e.id)) clear.defeated.push(e.id);
    const progress = history.deep;
    for (const id of [...(progress?.defeatedFinalIds || []),...(progress?.defeatedWingIds || []).map(id=>'deep-v1-miniboss-'+id)])
      if (clear.required.includes(id) && !clear.defeated.includes(id)) clear.defeated.push(id);
    for (const map of maps) for (const e of map.enemySpawns || []) if (e.objectiveId && progress?.completedObjectiveIds?.includes(e.objectiveId) && !clear.defeated.includes(requiredBossId(e))) clear.defeated.push(requiredBossId(e));
    clear.completed = clear.required.length > 0 && clear.required.every(id=>clear.defeated.includes(id));
    this.enemies = this.enemies.filter(e => !clear.required.includes(e.id) || !clear.defeated.includes(e.id));
    installCompletionExit(this.map,history);
    return clear;
  }
  defeatEnemy(e) {
    if (e.rewarded) return;
    if(e.noRewards){e.rewarded=true;return}
    if(e.arenaId&&this.map?.arena){const history=dungeonHistory(this.save,this.areaId());history.resolved=true;history.guardianDefeated=true;history.visitOpen=false;this.defeatNotice={title:'WORLD THREAT BROKEN',detail:`${this.map.name} · the persistent arena falls quiet`,kind:'danger'}}
    if(e.foundryId){
      recordCreatureDefeat(this.save,e);
      this.save.codex.foundry||={};
      this.save.codex.foundry[e.foundryId]={name:e.foundryName,kind:e.kind,role:e.foundryRole,modules:[...(e.foundryModules||[])],defeated:true};
      if(e.foundryRole!=='passive')recordRevelationLead(this.save,'hunt',e.foundryId);
    }
    const domainResult=e.domainBoss?completeDomainBoss(this.save,e):null;
    if(domainResult?.kind==='manifestation'){journalOnce(this.save,`domain-manifestation:${e.domainId}:${domainResult.tier}`,`${domainResult.state.name} manifested again through a higher Aperture. Its altered form was defeated and both upgrade spheres were recovered.`,domainResult.state.name);this.defeatNotice={title:'HIGHER FORM DISPERSED',detail:`${domainResult.state.name} · manifestation ${domainResult.tier}`,kind:'danger'}}
    if(e.huntInstanceId)completeHuntInstance(this.save,e.huntInstanceId);
    if(e.viewportHuntId&&completeViewportHunt(this.save,e.viewportHuntId)){const hunt=this.save.viewport.contracts[e.viewportHuntId];journalOnce(this.save,`viewport-complete:${e.viewportHuntId}`,`${hunt.title} is complete. Viewport records the victory and releases its promised reward.`,hunt.title);recordViewportArrival(this.save,{id:`hunt:${e.viewportHuntId}`,title:hunt.title,text:'A consequential threat was defeated and entered the Refuge record.',kind:'hunt'});this.defeatNotice={title:e.worldBoss?'WORLD THREAT BROKEN':'HUNT COMPLETE',detail:`${hunt.title} · return to Viewport for the enduring record`,kind:'danger'};if(hunt.domain)this.save.worldFlags[`domain-cleared:${hunt.domain}`]=true}
    if (e.farArrayBoss && this.area === "dungeon" && isArrayRun(this.areaId())) { const listener = e.farArrayBoss === "listener", text = listener ? listenerFelled(this.save) : guardianFelled(this.save); journalOnce(this.save, `far-array:${this.save.farArray.runs}`, text, "The Far Gate"); this.defeatNotice = { title: listener ? "THE LISTENER FALLS" : "A GATE PIECE LOCKS", detail: text, kind: "danger" }; this.message = text; }
    if (e.worldBeast && WORLD_BEASTS[e.worldBeast]) { const B = WORLD_BEASTS[e.worldBeast], won = worldBeastSlain(this.save, e.worldBeast); journalOnce(this.save, `world-beast-slain:${e.worldBeast}:${this.save.worldBeasts[e.worldBeast].slain}`, `You slew ${B.name} at ${this.rx},${this.ry}.`, B.name); this.defeatNotice = { title: `${B.name.toUpperCase()} FALLS`, detail: `+${won.marks} marks`, kind: "danger" }; this.message = won.message; } // release 235
    if (e.questingBeast) { const won = questingBeastSlain(this.save); journalOnce(this.save, `questing-beast-slain:${this.save.questingBeast.slain}`, `You slew the Questing Beast at ${this.rx},${this.ry}.`, "The Questing Beast"); this.defeatNotice = { title: "THE QUESTING BEAST FALLS", detail: `+${won.marks} marks`, kind: "danger" }; this.message = won.message; }
    if (!e.ambient && !e.noRewards) { const done = wandererKill(this.save); if (done) { this.message = done; journalOnce(this.save, `wanderer-done:${this.save.wanderer.stage}`, done, "Old Quillon"); } }
    if (e.ambient) {
      e.rewarded = true;
      this.message = e.kind === "hushling" ? "The hushling unthreads into violet motes." : "The quiet creature falls. Nothing in it was meant as loot.";
      return;
    }
    if(this.area==='dungeon') recordDungeonBossDefeat(dungeonHistory(this.save,this.areaId()),e);
    this.defeatNotice = enemyDefeatNotice(e, this.area);
    if (tidemantleTrial(this.area, this.map, e) && grantTidemantle(this.save, `${this.areaId()}:${e.id}`)) {
      this.defeatNotice = { ...this.defeatNotice, detail: `${this.defeatNotice?.detail || ""} · the Tidemantle is yours` };
      journalOnce(this.save, "tidemantle", "Beneath the fallen guardian lay a Tidemantle, a mantle of woven tide-glass. It keeps the Wayfarer afloat on rivers, flooded halls and open sea, though swimming tires fast and nothing below the surface opens to it.", "The Tidemantle");
      this.message = "Tidemantle earned: you can now swim on surface water.";
    }
    if (this.area === "dungeon" && this.map.deepDungeon && e.dungeonRole === "objectiveGuardian") {
      const progress = deepDungeonProgress(this.save, this.areaId());
      if (!progress.completedObjectiveIds.includes(e.objectiveId)) progress.completedObjectiveIds.push(e.objectiveId);
      applyDeepDungeonProgress(this.save, this.areaId(), this.map);
      const objective = this.map.objectives.find((q) => q.id === e.objectiveId), completed = progress.completedObjectiveIds.length, total = this.map.objectives.filter((q) => q.required).length;
      this.defeatNotice = { title: "EXPEDITION GUARDIAN CLEARED", detail: `${objective?.name || e.objectiveId} · ${completed}/${total} required objectives${progress.gateOpened ? " · final route opened" : ""}`, kind: "danger" };
      journalOnce(this.save, `deep-objective:${this.areaId()}:${e.objectiveId}`, `${objective?.name || "A deep guardian"} fell. A recovery anchor or route within ${this.map.name} has awakened.`, this.map.name);
    }
    if (this.area === "dungeon" && this.map.recipe === "deep-v1" && e.dungeonRole === "wingMiniboss") {
      const progress = deepDungeonProgress(this.save, this.areaId());
      if (!progress.defeatedWingIds.includes(e.wingId)) progress.defeatedWingIds.push(e.wingId);
      applyDeepDungeonProgress(this.save, this.areaId(), this.map);
      const anchor = this.map.objects.find((o) => o.kind === "deepReturn" && o.wingId === e.wingId);
      if (anchor) progress.activeAnchor = { id: anchor.id, x: anchor.x, y: anchor.y, name: `${e.wingId} wing anchor` };
      const count = progress.defeatedWingIds.length;
      this.defeatNotice = { title: "WING GUARDIAN CLEARED", detail: `${e.wingId.toUpperCase()} WING · ${count}/3 seals broken${progress.gateOpened ? " · final gate opened" : ""}`, kind: "danger" };
      journalOnce(this.save, `deep-wing:${this.areaId()}:${e.wingId}`, `The ${e.wingId} wing guardian fell. Its return lattice now folds directly into the central chamber.${progress.gateOpened ? " All three seals are broken; the final chamber is open." : ""}`, "The Threefold Deep");
    }
    if (this.area === "dungeon" && (this.map.deepDungeon || this.map.recipe === "deep-v1") && e.dungeonRole === "finalBoss") {
      const progress = deepDungeonProgress(this.save, this.areaId()), history = dungeonHistory(this.save, this.areaId());
      if (!progress.defeatedFinalIds.includes(e.id)) progress.defeatedFinalIds.push(e.id);
      const allDefeated = history.combatClear ? history.combatClear.completed : true;
      progress.completed = allDefeated;
      if(allDefeated) { history.resolved=true;history.guardianDefeated=true;history.visitOpen=false; }
      applyDeepDungeonProgress(this.save,this.areaId(),this.map);
      this.defeatNotice = {title:"DEEP GUARDIAN FELLED",detail:allDefeated?`${this.map.name.toUpperCase()} CLEARED`:'Final guardian defeated — remaining guardians still seal completion.',kind:"danger"};
    }
    if (isCrossingGuardian(e) && recordRelayChain(this.save, this.areaId()))
      this.defeatNotice.detail += " · the buried network answered";
    if(['ashling','glassMite'].includes(e.kind))recordPortalPrey(this.save,e.kind);
    if(e.eliteId){const reward=completeElite(this.save,e.eliteId);if(reward){this.save.codex.elites||={};this.save.codex.elites[e.eliteId]={encountered:1,defeated:1,modules:[...(e.eliteModules||[])],variantId:e.variantId,habitat:this.areaId()};journalOnce(this.save,'elite-defeated:'+e.eliteId,`${e.eliteName} fell. Its observed aspects were ${(e.eliteModules||[]).join(', ')}. Reward: ${reward.marks} marks and one ${reward.material.replace('Sphere',' sphere')}.`,'Elite bestiary');}}
    if (this.area === 'dungeon' && !this.map.arena && !this.save.session.activeDisplacement && !String(this.areaId()).startsWith('hunt-')) {
      const history = dungeonHistory(this.save,this.areaId());
      if (e.boss && history.combatClear?.completed) {
        history.guardianDefeated=true;history.visitOpen=false;
        if(this.areaId()!==dungeonId(this.save.seed,this.save.worldGeneration))history.resolved=true;
        if(this.map.deepDungeon || this.map.recipe==='deep-v1') {
          deepDungeonProgress(this.save,this.areaId()).completed=true;
          Object.assign(history,{resolved:true,guardianDefeated:true,visitOpen:false});
          applyDeepDungeonProgress(this.save,this.areaId(),this.map);
        }
        claimDungeonPayoff(this.save,history,!!this.map.deepDungeon || this.map.recipe === 'deep-v1');
        journalOnce(this.save,`expedition-cleared:${this.areaId()}`,`${this.map.name} is cleared. Every required guardian fell; the expedition cache yielded upgrade material, marks and a draught. The return lattice leads to the entrance.`,this.map.name);
        installCompletionExit(this.map,history,e);
        this.message = 'EXPEDITION CLEARED — reward secured. Interact with the Cleared Expedition Return to leave safely.';
        this.defeatNotice.detail += ' · completion reward · entrance return opened';
      }
    }
    if (e.seaKind && leviathanTrophy(this.save, e.seaKind)) {
      journalOnce(this.save, `leviathan:${e.seaKind}`, `The ${e.name} is felled. The sea is quieter for it.`, e.name);
      this.defeatNotice = { title: "LEVIATHAN FELLED", detail: `${e.name} · first trophy: ${LEVIATHAN_TROPHY.currency} marks and a weapon sphere`, kind: "danger" };
    }
    e.rewarded = true;
    const marks = e.boss ? 12 : e.apertureEncounter ? 6 : 1 + hashSeed(`${this.save.seed}:marks:${this.areaId()}:${e.id}`) % 3;
    this.save.currency += marks;
    const oldHp = this.save.maxHp,
      oldStamina = this.save.maxStamina,
      levels = awardExperience(this.save, e.seaKind ? SEA_CREATURES[e.seaKind].xp : e.boss ? 35 : 10);
    if (levels) {
      this.player.hp = Math.min(
        this.save.maxHp,
        this.player.hp + this.save.maxHp - oldHp,
      );
      this.player.stamina = Math.min(
        this.save.maxStamina,
        this.player.stamina + this.save.maxStamina - oldStamina,
      );
      this.player.maxStamina = this.save.maxStamina;
      this.message = `Level ${this.save.level} reached — health and stamina increased. ${this.save.statPoints} stat point${this.save.statPoints === 1 ? "" : "s"} available in Pack.`;
    }
    this.obtainDrop(e.kind);
    if (!e.summonedBy && !e.noRewards) { const g = glyphDrop(this.save, `${this.areaId()}:${e.id}`, this.save.dropCounter, e.boss || isCrossingGuardian(e)); if (g) this.glyphNotice = `${GLYPHS[g].name} glyph recovered.`; }
    echoEvent(this, "kill", this.lastUpdateNow || 0, { enemy: e });
    onConstellationKill(this);
    { const echo = echoDrop(this.save, e, e.boss || isCrossingGuardian(e), this.save.dropCounter); if (echo) this.glyphNotice = `An Echo lingers: ${ECHOES[echo].name}. Set it in the Echoes screen (Pack).`; }
    if (!levels) this.message = `Recovered ${marks} mark${marks === 1 ? "" : "s"} from the fallen creature.`;
    if(this.save.narrative.facts['leads.active']){this.save.worldFlags['lead.hunt.count']=(this.save.worldFlags['lead.hunt.count']||0)+1;if(this.save.worldFlags['lead.hunt.count']>=5)progressLead(this.save,'hunt');if(isCrossingGuardian(e))progressLead(this.save,'guardian')}
    const key = `drop:v1:${this.areaId()}:${e.id}`;
    if (!this.save.worldFlags[key]) {
      this.save.worldFlags[key] = true;
      const roll = hashSeed(`${this.save.seed}:${key}`) % 100 < 40;
      if (e.boss || roll || (this.save.worldFlags.flaskPity || 0) >= 2) {
        const n = e.boss ? 2 : 1;
        this.save.consumables.restorativeDraught += n;
        this.save.worldFlags.flaskPity = 0;
        this.message = `Recovered ${n} restorative draught${n > 1 ? "s" : ""}.`;
      } else
        this.save.worldFlags.flaskPity =
          (this.save.worldFlags.flaskPity || 0) + 1;
    }
  }
  primaryAttack(now = 0, _direction = null, echo = null) {
    const glyphs = this.glyphLoadout("melee");
    if (!echo && now < (this.player.attackReadyAt || 0)) return [];
    if (!echo) this.player.attackReadyAt = now + 420 * glyphs.mods.cooldown;
    this.player.attackUntil = now + 240;
    this.player.meleeUntil = now + 240;
    const baseProfile = primaryProfile(this.save.equipment.primary),
      profile = { ...baseProfile, range: baseProfile.range * (1 + characterStats(this.save).attackReach) * glyphs.mods.range, damage: baseProfile.damage * glyphs.mods.damage },
      geometry = meleeAttackGeometry(
        this.player,
        profile,
        this.player.meleeAim || this.save.lastAim,
      );
    this.player.meleeStrike = { ...geometry };
    const hits = primaryAttackHits(
      this.player,
      [...this.enemies.filter(e=>!e.untargetable), ...this.npcTargets()],
      this.map,
      mapWidth(this.map, this.area),
      profile,
      { x: geometry.dx, y: geometry.dy },
    );
    const pounce = echo || !hits.some((q) => q.kind !== "npc") ? 1 : pounceBonus(this, now);
    for (const e of hits) {
      if (e.kind === "npc") {
        recordNpcDamage(
          this.save,
          e,
          profile.damage + characterStats(this.save).meleeBonus,
          "melee",
          "collateral",
        );
        continue;
      }
      alertEnemy(e);
      const base = (profile.damage + characterStats(this.save).meleeBonus) * (echo ? echo.share : 1) * pounce, scattered = this.scatterCheck(e, true, glyphsReachSwarm(glyphs), now), dealt = scattered ? 0 : glyphDamage(glyphs, e, base, { echo: !!echo }, now); // release 245: plain steel scatters the Nanobot Knight
      e.hp -= dealt;
      e.hitFlash = scattered ? 0 : 0.18;
      e.recoil = scattered ? 0 : 0.2;
      if (!scattered) e.hitStun = Math.max(e.hitStun || 0, e.boss || e.eliteId ? 0.12 : 0.22);
      if (e.hp <= 0) {
        e.dead = true;
        this.defeatEnemy(e);
      }
      glyphHit(this.glyphWorld(now), glyphs, e, dealt, { echo: !!echo });
      onConstellationMelee(this, e, now);
    }
    // Awakened primary: every third swing releases a piercing crescent that carries the weapon's glyphs.
    if (!echo && this.save.equipment.primary?.awakened && (this.awakenSwings = (this.awakenSwings || 0) + 1) % 3 === 0)
      this.projectiles.push({ id: `crescent-${now}`, x: this.player.x + .5 + geometry.dx * .4, y: this.player.y + .45 + geometry.dy * .4, dx: geometry.dx, dy: geometry.dy, speed: 9, life: .55, damage: Math.max(1, Math.round((profile.damage + characterStats(this.save).meleeBonus) * .7)), damageType: "physical", path: "straight", age: 0, hits: {}, pierce: 6, glyphHost: "melee", crescent: true });
    const plan = !echo && echoPlan(glyphs);
    if (plan) (this.glyphTimers ||= []).push({ at: now + plan.delay, kind: "strike", share: plan.share });
    this.reconcileConsequences();
    this.attackProfile = profile;
    return hits;
  }
  fireSecondary(now = 0, direction = null) {
    if (this.projectiles.filter(p=>!p.dead).length >= (this.area==='dungeon'?32:64)) return false;
    const weapon = rangedWeapon(this.save.equipment.secondary), glyphs = this.glyphLoadout("tool");
    if (!weapon || now < (this.player.attackReadyAt || 0)) return false;
    let d, aimedDistance = null;
    if (this.save.pendingAim) {
      aimedDistance = Math.hypot(this.save.pendingAim.x-(this.player.x+.5),this.save.pendingAim.y-(this.player.y+.45));
      d = projectileDirection(
        this.save.pendingAim.x - (this.player.x + 0.5),
        this.save.pendingAim.y - (this.player.y + 0.45),
        this.player.facing,
      );
      this.save.pendingAim = null;
    } else
      d = projectileDirection(
        direction?.x ?? this.save.lastAim.x,
        direction?.y ?? this.save.lastAim.y,
        this.player.facing,
      );
    this.save.lastAim = d;
    this.player.attackReadyAt = now + 360 * glyphs.mods.cooldown;
    this.player.attackUntil = now + 180;
    this.player.meleeUntil = 0;
    this.player.meleeStrike = null;
    const derived=characterStats(this.save),reachMultiplier=1+derived.attackReach,projectileLifetime=weapon.lifetime*reachMultiplier;
    this.projectiles.push({
      id: `shot-${this.save.dropCounter}-${now}`,
      x: this.player.x + 0.5 + d.x * 0.35,
      y: this.player.y + 0.45 + d.y * 0.35,
      dx: d.x,
      dy: d.y,
      speed: weapon.speed,
      life: weapon.path==="grenade"&&aimedDistance!==null?Math.max(.08,Math.min(projectileLifetime,aimedDistance/weapon.speed)):projectileLifetime,
      damage: Math.round(
        (weapon.damage + derived.magicBonus) *
          (weapon.damageType === "magic" && this.magicBuffRemaining > 0
            ? 1.4
            : 1),
      ),
      damageType: weapon.damageType,
      path: weapon.path || "straight",
      age: 0,
      turnAfter: (weapon.turnAfter || weapon.lifetime / 2)*reachMultiplier,
      returning: false,
      hits: {},
      blastRadius: weapon.radius || 0,
      glyphHost: "tool",
      pierce: glyphs.mods.pierce,
    });
    const shot = this.projectiles[this.projectiles.length - 1];
    shot.damage = Math.max(1, Math.round(shot.damage * glyphs.mods.damage));
    const plan = echoPlan(glyphs);
    echoEvent(this, "shot", now, { shot });
    if (this.save.equipment.secondary?.awakened) for (const a of [-.21, .21]) { const c = Math.cos(a), sn = Math.sin(a); this.projectiles.push({ ...shot, id: `${shot.id}-fan${a}`, dx: shot.dx * c - shot.dy * sn, dy: shot.dx * sn + shot.dy * c, hits: {}, damage: Math.max(1, Math.round(shot.damage * .5)) }); } // awakened tool: a three-shot fan
    if (plan) (this.glyphTimers ||= []).push({ at: now + plan.delay, kind: "shot", shot: { ...shot, id: shot.id + "-echo", hits: {}, damage: Math.max(1, Math.round(shot.damage * plan.share)), echo: true } });
    return true;
  }
  // Spell slots A and B (release 115): each button casts whatever its slot holds.
  castSlot(slot) {
    const c = slotted(this.save, slot);
    if (!c) { this.message = `Slot ${slot.toUpperCase()} is empty — fill it in the Arcanum.`; return false; }
    return c.kind === "skill" ? this.activateApertureSkill(c.id) : this.castSpell(c.id);
  }
  castSpell(spellId = null) {
    if(!spellId&&this.save.magicSkills?.selected&&skillRank(this.save,this.save.magicSkills.selected)>0)return this.activateApertureSkill(this.save.magicSkills.selected);
    if (spellId && SPELLS[spellId]) this.save.equippedSpell = spellId; // the readied spell is the glyph host
    const spell = SPELLS[this.save.equippedSpell] || SPELLS["ember-ring"], cds = (this.save.magicSkills ||= {}).cooldowns ||= {}, key = `spell:${spell.id}`, remaining = spellId ? cds[key] || 0 : this.spellCooldownRemaining; // slots use per-spell cooldowns; the legacy call keeps its single one
    if (remaining > 0) {
      this.message = `${spell.name} recovers in ${Math.ceil(remaining)}s.`;
      return false;
    }
    let x = this.player.x + 0.5,
      y = this.player.y + 0.45;
    if (this.save.pendingAim) {
      const dx = this.save.pendingAim.x - x,
        dy = this.save.pendingAim.y - y,
        m = Math.hypot(dx, dy),
        scale = m > spell.maxRange ? spell.maxRange / m : 1;
      x += dx * scale;
      y += dy * scale;
      this.save.pendingAim = null;
    }
    const glyphs = this.glyphLoadout("spell"), cast = {
      id: `spell-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`,
      kind: spell.id,
      x,
      y,
      life: spell.lifetime,
      radius: spell.radius * glyphs.mods.radius,
      pulse: spell.pulse,
      untilPulse: 0,
      damage: Math.max(1, Math.round((spell.damage + characterStats(this.save).magicBonus) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage))),
      pulseIndex: 0,
      hits: {},
      glyphHost: "spell",
    };
    this.effects.push(cast);
    const plan = echoPlan(glyphs);
    if (plan) this.effects.push({ ...cast, id: cast.id + "-echo", hits: {}, delay: spell.lifetime, damage: Math.max(1, Math.round(cast.damage * plan.share)), echo: true });
    const cooldown = spell.cooldown * glyphs.mods.cooldown * (1 - pairingMods(this.save).cooldown);
    cds[key] = cooldown; if (!spellId) this.spellCooldownRemaining = cooldown;
    echoEvent(this, "spell", this.lastUpdateNow || 0);
    this.message = `${spell.name} answers.`;
    return true;
  }
  aimAt(x, y) {
    const d = projectileDirection(
      x - (this.player.x + 0.5),
      y - (this.player.y + 0.45),
      this.player.facing,
    );
    this.save.lastAim = d;
    this.save.pendingAim = { x, y };
    this.reticle = { x, y, life: 1.2 };
    this.message = "Aim fixed for the next Tool or Spell.";
    return true;
  }
  obtainDrop(src) {
    const n = this.save.dropCounter++;
    const item = generateItem(`${this.save.seed}:${src}:${n}`, this.save.level);
    storeInventoryItem(this.save, item);
    this.save.materials.cinderIron++;
  }
  upgrade() {
    if (this.save.materials.cinderIron < 3) {
      this.message = "Three Cinder Iron are required to reinforce a weapon.";
      return false;
    }
    if (this.save.weaponLevel >= 12) {
      this.message = "The current weapon reinforcement is complete.";
      return false;
    }
    this.save.materials.cinderIron -= 3;
    this.save.weaponLevel++;
    this.player.weaponLevel = this.save.weaponLevel;
    this.message = `Weapon reinforced to +${this.save.weaponLevel}.`;
    this.sync();
    return true;
  }
  useUpgradeSphere(kind){const key=kind==='armor'?'armorSphere':'weaponSphere';if(!(this.save.materials[key]>0))return false;this.save.materials[key]--;if(kind==='armor')this.save.equipment.armor.power=Math.min(8,(this.save.equipment.armor.power||0)+1);else{this.save.weaponLevel=Math.min(8,(this.save.weaponLevel||0)+1);this.player.weaponLevel=this.save.weaponLevel}this.message=`${kind==='armor'?'Armor':'Weapon'} sphere fused. The upgrade is permanent.`;this.sync();return true}
  upgradeEquipmentSlot(slot){const result=upgradeEquipment(this.save,slot);this.message=result.message;if(result.ok){syncCharacterStats(this.save);this.player.maxStamina=this.save.maxStamina;this.sync()}return result}
  activateApertureSkill(id=this.save.magicSkills?.selected){if(id==='rift-step')return riftStep(this,this.lastUpdateNow||0);const skill=APERTURE_SKILLS[id],rank=skillRank(this.save,id),state=this.save.magicSkills;if(!skill||!rank){this.message='That Aperture skill has not been learned.';return false}if((state.cooldowns[id]||0)>0){this.message=`${skill.name} recovers in ${Math.ceil(state.cooldowns[id])}s.`;return false}state.active={id,rank,remaining:(skill.duration+Math.max(0,rank-1))*skillDurationScale(this.save,id)};state.cooldowns[id]=skill.cooldown*(1-pairingMods(this.save).cooldown);if(id==='aerial-step')state.lastSafe={x:this.player.x,y:this.player.y,area:this.area,areaId:this.areaId()};this.message=`${skill.name} answers for ${state.active.remaining}s.`;this.sync();return true}
  allocate(s) {
    if (!this.save.statPoints || !Object.hasOwn(this.save.stats, s))
      return false;
    const oldHp = this.save.maxHp,
      oldStamina = this.save.maxStamina;
    this.save.stats[s]++;
    this.save.statPoints--;
    syncCharacterStats(this.save);
    this.player.hp = Math.min(
      this.save.maxHp,
      this.player.hp + this.save.maxHp - oldHp,
    );
    this.player.stamina = Math.min(
      this.save.maxStamina,
      this.player.stamina + this.save.maxStamina - oldStamina,
    );
    this.player.maxStamina = this.save.maxStamina;
    this.message = `${s} increased to ${this.save.stats[s]}.`;
    this.sync();
    return true;
  }
  useConsumable(type, now = 0) {
    const c =
      this.save.consumables ||
      (this.save.consumables = {
        restorativeDraught: 0,
        ironbarkTonic: 0,
        lumenPhial: 0,
      });
    if (!(c[type] > 0)) {
      this.message = "That supply is exhausted.";
      return false;
    }
    if (type === "restorativeDraught") {
      if (this.player.hp >= this.save.maxHp) {
        this.message = "Health is already full.";
        return false;
      }
      this.player.hp = Math.min(this.save.maxHp, this.player.hp + 30);
      c[type]--;
      this.message = "Restorative draught mends 30 health.";
      this.sync();
      return true;
    }
    if (type === "ironbarkTonic") {
      c[type]--;
      this.guardRemaining = 45;
      this.message = "Ironbark guard hardens you for 45 seconds.";
      return true;
    }
    if (type === "lumenPhial") {
      c[type]--;
      this.magicBuffRemaining = 45;
      this.save.magicBuff = 45;
      this.message = "Lumen surge empowers magic bolts for 45 seconds.";
      return true;
    }
    if(type==='clearrootAmpoule'){if(!cleansePoison(this.save)){this.message='No poison needs cleansing.';return false}this.message='Clearroot cools the venom and ends the poison.';return true}
    return false;
  }
  // One frame of sailing: the skiff moves over sailable water; pushing onto safe ground steps ashore and moors it.
  sail(p, dx, dy, width, now) {
    const open = (x, y) => footprintSailable(this.map, width, x, y) && !bergAt(this.seaHazards, x, y);
    // Ground ahead of the bow (half a tile on): a walkable, non-sailable tile the Wayfarer can stand on.
    const ashoreAt = (ax, ay) => { const t = tileUnder(this.map, width, p.x + Math.sign(ax) * .6, p.y + Math.sign(ay) * .6); if (!t || t.blocked || sailable(t.kind)) return null; const q = { x: t.x, y: t.y - .2 }; return footprintOpen(this.map, width, q.x, q.y) && !footprintHazard(this.map, width, q.x, q.y) ? q : null; };
    if (!open(p.x, p.y)) { // carried onto ground (a section edge or a resumed save): the crew returns the skiff to its dock
      disembark(this.save, ensureBoatState(this.save).home); p.sailVx = p.sailVy = 0;
      this.message = "You haul the skiff ashore; the Shipwright's crew rows it back to its dock."; return;
    }
    for (const [ax, ay] of [[dx, 0], [0, dy]]) {
      if (!ax && !ay) continue;
      const step = sailStep(open, () => ashoreAt(ax, ay), p.x + ax, p.y + ay);
      if (step === "sail") { p.x += ax; p.y += ay; }
      else if (step === "ashore") {
        const here = tileUnder(this.map, width, p.x, p.y), shore = ashoreAt(ax, ay);
        disembark(this.save, { rx: this.rx, ry: this.ry, x: here.x, y: here.y });
        this.map.objects.push({ id: "skiff-moored", kind: "skiff", name: "Your skiff", lore: "Your skiff rides at its mooring.", x: here.x, y: here.y, state: "moored", actions: ["board"] });
        Object.assign(p, shore); p.sailVx = p.sailVy = 0;
        if (now > (this.sailMessageAt || 0)) { this.sailMessageAt = now + 6000; this.message = "Ashore. The skiff waits at its mooring."; }
        return;
      } else { if (ax) p.sailVx = 0; if (ay) p.sailVy = 0; }
    }
  }

  update(dt, input, now) {
    this.lastUpdateNow = now;
    if (this.paused) return;
    const p = this.player, hpStart = p.hp;
    this.guardRemaining = Math.max(0, this.guardRemaining - dt);
    this.magicBuffRemaining = Math.max(0, this.magicBuffRemaining - dt);
    this.spellCooldownRemaining = Math.max(0, this.spellCooldownRemaining - dt);
    const skillState=this.save.magicSkills;if(skillState){for(const id of Object.keys(skillState.cooldowns||{}))skillState.cooldowns[id]=Math.max(0,skillState.cooldowns[id]-dt);tickRiftCharges(this.save);if(skillState.active){skillState.active.remaining=Math.max(0,skillState.active.remaining-dt);if(skillState.active.remaining===0){const ended=skillState.active.id;skillState.active=null;onSkillEnded(this,ended,now);if(ended==='aerial-step'&&footprintHazard(this.map,mapWidth(this.map,this.area),this.player.x,this.player.y)&&!swimsThrough(this.save,footprintHazard(this.map,mapWidth(this.map,this.area),this.player.x,this.player.y))){const safe=skillState.lastSafe;if(safe&&safe.area===this.area&&safe.areaId===this.areaId()){this.player.x=safe.x;this.player.y=safe.y}else relocateIfStranded(this.player,this.map,mapWidth(this.map,this.area));this.message='Aerial Step closes and returns you to stable ground.'}}}}
    if (this.reticle) this.reticle.life -= dt;
    let rawX = Number(input.state.x) || 0,
      rawY = Number(input.state.y) || 0,
      m = Math.hypot(rawX, rawY),
      scale = m > 1 ? 1 / m : 1,
      x = rawX * scale,
      y = rawY * scale;
    if (now < (p.heldUntil || 0)) { x = 0; y = 0; if (input.consume("dodge")) { p.heldUntil -= CRYSTAL.struggle * 1000; if (now >= p.heldUntil) this.message = "You tear free of its grip."; } } // release 249: held by the Psychic Crystal; dodge to struggle
    if (Math.hypot(x, y) > 0.15)
      this.save.lastAim = projectileDirection(x, y, p.facing);
    if (input.consume("tool")) {
      this.save.aimMode = "tool";
      this.save.toolMode = true;
      const weapon=rangedWeapon(this.save.equipment.secondary),width=mapWidth(this.map,this.area),
        aim=weapon&&selectRangedAim(this.player,this.enemies,this.map,width,weapon.speed*weapon.lifetime*(1+characterStats(this.save).attackReach));
      this.fireSecondary(now, aim || this.save.lastAim);
    }
    if (input.consume("spell")) this.castSlot("a");
    if (input.consume("spell2")) this.castSlot("b");
    if (input.consume("dodge")) {
      const r = dodge(p, now, x, y);
      if (!r.ok) this.message = "Not enough stamina to dodge.";
      else { echoEvent(this, "dodge", now); onConstellationDodge(this); }
    }
    if (input.consume("jump")) {
      if (now < this.jumpUntil) this.message = "Already airborne.";
      else this.jumpUntil = now + 520 + skillRank(this.save,"quickening") * 140;
    }
    if (input.consume("potion")) this.useConsumable("restorativeDraught", now);
    const dodging = now < (p.dodgeUntil || 0);
    if (dodging) {
      x = p.dodgeX;
      y = p.dodgeY;
    }
    const swimming = swimsThrough(this.save, footprintHazard(this.map, mapWidth(this.map, this.area), p.x, p.y)), underfoot = this.map.landscape ? tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y)?.kind : null;
    const sailing = this.area === "overworld" && aboard(this.save);
    let speed = (dodging ? 4.8 : 2.4) * (1 + characterStats(this.save).moveSpeed) * (!dodging && now < (p.slowUntil || 0) ? (p.slowFactor || .5) : 1) * (this.map.underwater ? DIVE.speed : 1) * (sailing ? BOAT.speed : swimming ? TIDEMANTLE.speed : dodging ? 1 : mireSpeed(underfoot)),
      dx = x * speed * dt,
      dy = y * speed * dt;
    // Sailing has momentum: velocity eases toward the stick; a dodge is an oar burst.
    if (sailing) { p.sailVx = dodging ? x * speed : steer(p.sailVx || 0, x * speed, dt); p.sailVy = dodging ? y * speed : steer(p.sailVy || 0, y * speed, dt); dx = p.sailVx * dt; dy = p.sailVy * dt; }
    let
      nx = p.x + dx,
      ny = p.y + dy;
    if (Math.abs(x) > 0.15 || Math.abs(y) > 0.15) {
      p.facing =
        Math.abs(x) > Math.abs(y)
          ? x < 0
            ? "left"
            : "right"
          : y < 0
            ? "up"
            : "down";
      p.walkPhase = (p.walkPhase + Math.hypot(dx, dy) * 4) % 2;
    }
    if (sailing && (nx < 0 || ny < 0 || nx + .76 >= SECTION_SIZE - .02 || ny + .88 >= SECTION_SIZE - .02)) {
      this.transitionSection(nx < 0 ? -1 : nx + .76 >= SECTION_SIZE - .02 ? 1 : 0, nx < 0 || nx + .76 >= SECTION_SIZE - .02 ? 0 : ny < 0 ? -1 : 1);
      return;
    }
    if (this.area === "overworld") {
      const exits = this.map.exits,
        near = (value, opening) => Math.abs(value - opening) <= 1.45,
        west = nx < 0 && near(p.y, exits.west),
        east = nx + 0.76 >= SECTION_SIZE - 0.02 && near(p.y, exits.east),
        north = ny < 0 && near(p.x, exits.north),
        south = ny + 0.88 >= SECTION_SIZE - 0.02 && near(p.x, exits.south);
      if (west) this.transitionSection(-1, 0);
      else if (east) this.transitionSection(1, 0);
      else if (north) this.transitionSection(0, -1);
      else if (south) this.transitionSection(0, 1);
      if (west || east || north || south) return;
    }
    if (
      this.area === "overworld" &&
      (nx < -1 || nx > SECTION_SIZE || ny < -1 || ny > SECTION_SIZE)
    ) {
      if (nx < 0) this.transitionSection(-1, 0);
      else if (nx >= SECTION_SIZE) this.transitionSection(1, 0);
      else if (ny < 0) this.transitionSection(0, -1);
      else this.transitionSection(0, 1);
      return;
    }
    const width = mapWidth(this.map, this.area);
    let terrainHazard=footprintHazard(this.map,width,nx,ny);const aerial=this.save.magicSkills?.active?.id==='aerial-step'&&this.save.magicSkills.active.remaining>0;
    // Pits, lava and deep water are lethal to walk into (operator, release 101: the r97 brink guard is removed; rims,
    // fog hatching and level marks keep them readable instead).
    // Release 102: the Tidemantle lets the Wayfarer swim on surface water (stage one of the water traversal plan).
    if(sailing){terrainHazard=null;this.swimming=false}else if(swimsThrough(this.save,terrainHazard)){this.swimKind=terrainHazard;if(!this.swimming){this.swimming=true;if(now>(this.swimMessageAt||0)){this.swimMessageAt=now+8000;this.message="The Tidemantle holds you up. Swimming drains stamina.";}}terrainHazard=null}else this.swimming=false;
    const fellIntoHazard=!!terrainHazard&&!aerial;
    if(fellIntoHazard){p.hp=0;this.message=terrainHazard==="lava"?"The caldera swallows the Wayfarer.":terrainHazard==="abyss"?"The Wayfarer falls into the sunless chasm.":DEEP_WATER.includes(terrainHazard)?"The deep water drags the Wayfarer under.":terrainHazard==="canyon"?"The ledge gives way beneath the Wayfarer.":"The water closes over the Wayfarer."}
    else if (sailing) this.sail(p, dx, dy, width, now);
    else {
      p.isPlayer = true; p.jumping = now < (this.jumpUntil || 0);
      const before = elevationAt(this.map, width, p.x, p.y), fromX = p.x, fromY = p.y;
      let fallStart = before, drop = 0, hurt = 0;
      const finishFall = (height) => {
        const distance = fallStart - height, damage = fallDamage(distance, this.save.maxHp);
        if (damage > 0) { hurt += damage; drop = Math.max(drop, distance); }
      };
      // Evaluate the actual X-then-Y substeps, not just frame endpoints: a diagonal can enter and
      // leave a scar in one frame. A safe scar edge ends one ordinary fall segment; it must not
      // erase a real ordinary cliff crossed before or after it. Non-scar movement keeps its net-drop rule.
      moveAxis(p, dx, dy, this.map, width, true, (ax, ay, bx, by) => {
        if (safeVoidScarTransition(tileUnder(this.map, width, ax, ay), tileUnder(this.map, width, bx, by))) {
          finishFall(elevationAt(this.map, width, ax, ay));
          fallStart = elevationAt(this.map, width, bx, by);
        }
      });
      finishFall(elevationAt(this.map, width, p.x, p.y));
      // Traversal cue: pushing against a ledge explains what it takes (operator ask 2026-10-14: climbing was confusing).
      if (this.map.landscape && Math.hypot(x, y) > .4 && Math.hypot(p.x - fromX, p.y - fromY) < Math.hypot(dx, dy) * .3) {
        const here = tileUnder(this.map, width, p.x, p.y), ahead = tileUnder(this.map, width, p.x + x * .6, p.y + y * .6), up = (ahead?.elev || 0) - (here?.elev || 0);
        if (ahead && here && !ahead.blocked && !ahead.slope && !here.slope && up >= 1) {
          this.ledgeHint = { x: ahead.x, y: ahead.y, kind: up === 1 ? "climb" : "tooHigh", until: now + 1500 };
          if (now > (this.ledgeMessageAt || 0)) { this.ledgeMessageAt = now + 5000; this.message = up === 1 ? "Ledge: press JUMP while moving to climb it." : `Too high to climb (${up} levels). Find stairs or a slope.`; }
        }
      }
      if (hurt === Infinity) { p.hp = 0; this.message = `The Wayfarer falls ${drop} levels.`; }
      else if (hurt > 0) { p.hp = Math.max(1, p.hp - hurt); p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, now + 400); this.message = `A hard landing: ${drop} levels down.`; }
    }
    if(!fellIntoHazard&&!terrainHazard&&aerial)this.save.magicSkills.lastSafe={x:p.x,y:p.y,area:this.area,areaId:this.areaId()};
    if(!fellIntoHazard&&this.area==="dungeon")this.updateDungeonDiscovery();
    if(!fellIntoHazard&&this.area==='overworld'){
      const insideId=structureOccupancy(this.map.tiles,width,p.x,p.y);
      if(insideId){const trap=this.map.objects.find(o=>o.kind==='displacementTrap'&&o.shelterId===insideId&&o.state!=='used'&&!this.save.worldFlags[`displacement-trigger:${this.rx},${this.ry}:${o.id}`]&&Math.hypot(o.x+.5-(p.x+.5),o.y+.5-(p.y+.7))<.55);if(trap){this.startDisplacement(trap,true);return}const hazard=this.map.objects.find(o=>o.kind==='shelterHazard'&&o.shelterId===insideId&&o.state==='armed'&&!this.save.worldFlags[`shelter-hazard:${this.rx},${this.ry}:${o.id}`]&&Math.hypot(o.x+.5-(p.x+.5),o.y+.5-(p.y+.7))<.6);if(hazard){const key=`shelter-hazard:${this.rx},${this.ry}:${hazard.id}`;this.save.worldFlags[key]=true;hazard.state='spent';p.hp=Math.max(1,p.hp-(hazard.damage||10));this.message=`${hazard.name} erupts. ${hazard.damage||10} damage — the mechanism falls quiet.`;if(hazard.hazardType==='toxicVent'){applyStrongPoison(ensureEliteState(this.save).status,this.save.maxHp);this.message=`${hazard.name} erupts. ${hazard.damage||10} damage and strong poison — a Clearroot Ampoule ends it.`}journalOnce(this.save,`shelter-hazard:${hazard.hazardType}`,`Shelters may conceal ${hazard.name.toLowerCase()} mechanisms. Their floor marks can be inspected, avoided, and remembered.`,'Shelter hazards');this.sync()}}
    }
    if(!fellIntoHazard){
      for(const e of this.enemies){
        if(!e.foundryId||e.dead||this.save.worldFlags[`foundry-observed:${e.foundryId}`]||Math.hypot(e.x-p.x,e.y-p.y)>5)continue;
        this.save.worldFlags[`foundry-observed:${e.foundryId}`]=true;
        this.save.codex.foundry||={};
        this.save.codex.foundry[e.foundryId]={name:e.foundryName,kind:e.kind,role:e.foundryRole,modules:[...(e.foundryModules||[])],defeated:false};
        recordCreatureEncounter(this.save,e);
        this.defeatNotice={title:'UNCLASSIFIED LIFEFORM',detail:`${e.foundryName} · ${e.foundryRole} · journal record added`,kind:e.foundryRole==='passive'?'discovery':'danger'};
      }
    }
    if (!fellIntoHazard&&input.consume("attack")) {
      this.save.aimMode = "attack";
      this.save.toolMode = false;
      this.primaryAttack(now);
    }
    // Hold Act for BOAT.leaveHold seconds while aboard to leave the skiff (release 158): step ashore if ground is beside
    // the hull, otherwise go over the side into the water, and the skiff stays moored where it floats.
    if (this.area === "overworld" && aboard(this.save) && input.held?.("interact")) {
      this.leaveHold = (this.leaveHold || 0) + dt;
      const left = Math.ceil(BOAT.leaveHold - this.leaveHold);
      if (this.leaveHold < 0) { /* refused: wait for the button to be released */ }
      else if (this.leaveHold < BOAT.leaveHold) { if (left !== this.leaveHoldShown) { this.leaveHoldShown = left; this.message = `Keep holding Act to leave the skiff… ${left}`; } }
      else { this.leaveHoldShown = null; this.leaveHold = this.leaveSkiff() === false ? -1e9 : 0; }
    } else { this.leaveHold = 0; this.leaveHoldShown = null; }
    if (!fellIntoHazard&&input.consume("interact")) {
      this.save.aimMode = "act";
      this.save.toolMode = false;
      this.interact();
    }
    const sanctuary=this.area==="overworld"?settlementSanctuary(this.map,this.rx,this.ry,this.save):null;
    if(this.area==="overworld"&&footprintInsideStructure(this.map,width,p.x,p.y)){
      const escaped=this.enemies.filter(e=>e.gatePredator&&!e.dead&&e.aggro);
      for(const e of escaped)e.dead=true;
      if(escaped.length)this.message="Walls close around you. The Gate Revenant loses the trail beyond the threshold.";
    }
    const combatNpcTargets=(this.projectiles.length||this.effects.length)?this.npcTargets():[];
    if(!fellIntoHazard&&this.projectiles.length)this.projectiles = advanceEnemyProjectileBehaviors(this.projectiles,p,dt,{cap:this.area==="dungeon"?32:64});
    if(!fellIntoHazard&&this.projectiles.length)this.projectiles = updateProjectiles(
      this.projectiles,
      [...this.enemies, ...combatNpcTargets],
      this.map,
      width,
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
      (shot)=>this.effects.push({id:"blast-"+shot.id,kind:shot.hostile?"enemy-blast":"rift-blast",x:shot.x,y:shot.y,life:.32,radius:shot.blastRadius||2,untilPulse:0,pulse:99,damage:shot.damage,hostile:!!shot.hostile,hits:{}}),
      p,
      (shot)=>{
        const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;
        if(shot.jumpable&&now<this.jumpUntil)return;
        if(safe||now<=(p.invulnerableUntil||0))return;
        p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?shot.damage*.65:shot.damage)*(1-Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0)))));
        p.invulnerableUntil=now+700;
      },
      (shot, e) => (e.kind === "nanobotKnight" && this.scatterCheck(e, shot.damageType === "physical", !!shot.glyphHost && glyphsReachSwarm(this.glyphLoadout(shot.glyphHost)), now)) ? 0 : shot.glyphHost && e.kind !== "npc" ? glyphDamage(this.glyphLoadout(shot.glyphHost), e, shot.damage, { echo: !!shot.echo }, now) : shot.damage,
      (shot, e, dealt) => { if (shot.glyphHost && e.kind !== "npc") glyphHit(this.glyphWorld(now), this.glyphLoadout(shot.glyphHost), e, dealt, { echo: !!shot.echo }); },
      (this.packEffects || []).filter(f => f.kind === "psyWall" && !(f.arming > 0)), // swept wall contact precedes actor collision at every substep
    );
    if(combatNpcTargets.length)this.syncNpcDamage("projectile");
    for(const fx of this.effects)if(fx.hostile&&!fx.hitPlayer&&Math.hypot(p.x+.5-fx.x,p.y+.52-fx.y)<=fx.radius){fx.hitPlayer=true;const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;if(!safe&&now>(p.invulnerableUntil||0)){p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?fx.damage*.65:fx.damage)*(1-Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0)))));p.invulnerableUntil=now+700}}
    if(this.effects.length)this.effects = updateEffects(
      this.effects,
      [...this.enemies, ...combatNpcTargets],
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
      (fx, e) => fx.glyphHost && e.kind !== "npc" ? glyphDamage(this.glyphLoadout(fx.glyphHost), e, fx.damage, { echo: !!fx.echo }, now) : fx.damage,
      (fx, e, dealt) => { if (fx.glyphHost && e.kind !== "npc") glyphHit(this.glyphWorld(now), this.glyphLoadout(fx.glyphHost), e, dealt, { echo: !!fx.echo, origin: { x: fx.x, y: fx.y } }); },
    );
    this.tickGlyphs(dt, now);
    tickEchoes(this, dt, now, { x, y });
    tickConstellation(this, dt, now);
    if(combatNpcTargets.length)this.syncNpcDamage("spell");
    if(this.enemies.some(e=>e.dead&&e.noRewards&&e.summonedBy))this.enemies=this.enemies.filter(e=>!(e.dead&&e.noRewards&&e.summonedBy));
    const activeEnemySet=new Set(this.area==="dungeon"?activeDungeonEnemies(this.enemies,p,this.map):this.enemies.filter(e=>shouldSimulateEnemy(e,p,this.area)));
    const eliteStatus=ensureEliteState(this.save).status;tickEliteStatus(eliteStatus,dt,n=>{if(now>(p.invulnerableUntil||0)){p.hp-=n;p.invulnerableUntil=now+350}});for(const h of this.eliteHazards)h.arming=Math.max(0,(h.arming||0)-dt);this.eliteHazards=tickEliteHazards(this.eliteHazards,dt);for(const h of this.eliteHazards)if(!(h.arming>0)&&Math.hypot(p.x-h.x,p.y-h.y)<=h.radius&&now>(h.nextHit||0)){p.hp-=h.damage;h.nextHit=now+1000;if(h.poison){const fresh=!(eliteStatus.poison>0);applyStrongPoison(eliteStatus,this.save.maxHp);if(fresh)this.message='The ooze burns. Strong poison — a Clearroot Ampoule ends it.'}}
    for(const e of this.enemies){if(e.dead||!e.eliteId||!activeEnemySet.has(e))continue;e.eliteCooldown=Math.max(0,(e.eliteCooldown||0)-dt);const distance=Math.hypot(e.x-p.x,e.y-p.y);if(e.eliteModules.includes('gravity')&&distance<6){if(e.eliteWindup>0){e.eliteWindup-=dt;if(e.eliteWindup<=0)e.eliteActive=1.15}else if(e.eliteActive>0){e.eliteActive-=dt;gravityPull(p,e,dt,1.65,6)}else if(e.eliteCooldown<=0){e.eliteWindup=1.1;e.eliteCooldown=7}}if(e.eliteModules.some(m=>m==='trail'||m==='oozePool')&&e.eliteCooldown<=0){addEliteHazard(this.eliteHazards,{id:`elite-hazard-${e.id}-${now}`,owner:e.id,kind:'ooze',x:e.x,y:e.y,life:6,radius:1.15,damage:4,poison:true,nextHit:0},8);e.eliteCooldown=3.5}if(e.eliteModules.includes('summon')&&e.eliteCooldown<=0){const adds=this.enemies.filter(q=>!q.dead&&q.summonedBy===e.id);if(adds.length<3&&this.enemies.filter(q=>!q.dead&&q.summonedBy).length<6){const add=createCombatant(e.kind==='knifeChoir'?'glassMite':'ashling',e.x+1,e.y,false,[]);add.id=`summon-${e.id}-${now}-${adds.length}`;add.summonedBy=e.id;add.noRewards=true;this.enemies.push(add)}e.eliteCooldown=8}}
    for(const e of this.enemies){if(e.dead||e.domainFamily!=='rootbound'||!activeEnemySet.has(e))continue;const previous=e.rootLastHp??e.hp;if(e.hp<previous)e.rootHealLock=3;e.rootLastHp=e.hp;e.rootHealLock=Math.max(0,(e.rootHealLock||0)-dt);if(e.rootboundRegeneration&&e.rootHealLock<=0&&e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+dt*(e.domainBoss?2.4:1.1));e.rootAttackCooldown=Math.max(0,(e.rootAttackCooldown||0)-dt);if(e.rootGroundAttack&&e.rootAttackCooldown<=0&&Math.hypot(e.x-p.x,e.y-p.y)<7){addEliteHazard(this.eliteHazards,{id:`root-eruption-${e.id}-${now}`,owner:e.id,kind:'root-eruption',x:p.x,y:p.y,life:2.4,arming:1.05,radius:e.domainManifestation?1.8:1.35,damage:e.domainBoss?10:6,nextHit:0},3);e.rootAttackCooldown=e.domainManifestation?4.5:6.5}}
    // Blight mire (landscape version 2): its murk lowers maximum health until the Wayfarer rests. Release 165: every
    // poisoned ground (MIRE.rotKinds) in any area; at the rot cap, lingering MIRE.poisonDelay seconds poisons.
    const underKind = tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y)?.kind;
    if (rotTick(this.save, underKind, dt) && now > (this.rotMessageAt || 0)) { this.rotMessageAt = now + 9000; this.message = underKind === "swampWater" || underKind === "mireWater" ? "The bog water rots you: maximum health falls until you rest." : "The blight rots you: maximum health falls until you rest."; }
    if (MIRE.rotKinds.includes(underKind) && ensureRot(this.save) >= rotCap(this.save)) {
      this.poisonSoak = (this.poisonSoak || 0) + dt;
      if (this.poisonSoak >= MIRE.poisonDelay) { const fresh = !(eliteStatus.poison > 0); applyPoison(eliteStatus, MIRE.poisonDuration, Math.max(MIRE.poisonMinDps, Math.round((Number(this.save.maxHp) || 0) * MIRE.poisonMaxHpFraction))); if (fresh) this.message = "The blight is in your blood: poisoned. Leave the bog, or drink a Clearroot Ampoule."; }
    } else this.poisonSoak = 0;
    if (p.hp > healthCeiling(this.save)) p.hp = healthCeiling(this.save);
    // Under water (W5): breath drains away from air pockets; at zero the diver drowns slowly.
    if (this.area === "dungeon" && this.map.underwater) {
      const pocket = this.map.objects.some((o) => o.kind === "airPocket" && Math.hypot(o.x - p.x, o.y - p.y) < DIVE.pocketRadius), hurt = breathe(this.save.session, dt, pocket);
      // Grotto currents (W6) push the diver back down the climb; swimming against them is slower but always possible.
      const flow = tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y)?.current;
      if (flow && now >= (p.dodgeUntil || 0)) { const nx = p.x + flow.dx * GROTTO.currentSpeed * dt, ny = p.y + flow.dy * GROTTO.currentSpeed * dt; if (footprintOpen(this.map, mapWidth(this.map, this.area), nx, ny)) { p.x = nx; p.y = ny; } }
      if (hurt > 0) { p.hp = Math.max(0, p.hp - hurt); if (now > (this.breathMessageAt || 0)) { this.breathMessageAt = now + 4000; this.message = "Out of air — reach an air pocket or the surface line!"; } }
    }
    // A hint when standing at deep water's edge with enough wood for a skiff (checked twice a second).
    if (this.area === "overworld") { // release 231: on ocean water, the Tyrant Mosasaur may come hunting
      const key = `${this.rx},${this.ry}`; if (this.tyrantVisit?.key !== key) this.tyrantVisit = tyrantVisit(this.rx, this.ry);
      const onOcean = TYRANT_HUNT.water.includes(tileUnder(this.map, 32, this.player.x, this.player.y)?.kind), present = this.enemies.some((e) => !e.dead && e.seaKind === TYRANT_HUNT.kind);
      if (tickTyrantHunt(this.tyrantVisit, dt, onOcean, present, Math.random)) this.riseTyrant();
    }
    if (this.area === "overworld" || this.area === "dungeon") this.tickWorldBeasts(dt); // release 239 (release 249: in dungeons too)
    if (this.area === "overworld" && (this._shoreCheck = (this._shoreCheck || 0) - dt) <= 0) { this._shoreCheck = .5; if ((this.save.materials?.wood || 0) >= WOOD.skiffCost && this.save.capabilities?.swim && !this.nearestObject() && this.shoreWater() && now > (this.woodHintAt || 0)) { this.woodHintAt = now + 15000; this.message = `Act: build a skiff here (${WOOD.skiffCost} wood).`; } }
    if (this.swimming) { const hurt = swimUpkeep(p, dt, this.swimKind, this.area === "overworld" && !!this.map.openSea); if (hurt > 0) { p.hp = Math.max(0, p.hp - hurt); if (now > (this.swimMessageAt || 0)) { this.swimMessageAt = now + 4000; this.message = "Exhausted in the water — reach the shore."; } } }
    else p.stamina = Math.min(p.maxStamina, p.stamina + (9 + pairingMods(this.save).stamina) * dt);
    this.performanceStats.totalDungeonEncounterRecords=this.area==="dungeon"?(this.map.encounterGroups||[]).length:0;this.performanceStats.activeEnemies=0;this.performanceStats.dormantEnemies=0;this.performanceStats.activeProjectiles=this.projectiles.length;this.performanceStats.activeHazardsAndEffects=this.eliteHazards.length+this.effects.length;this.performanceStats.pathfindingWork=0;this.performanceStats.ambientTicks=0;if(dt>1/30)this.performanceStats.updateBudgetViolations++;
    const packWorld=this.packWorld(dt,now,this.area==="overworld"?settlementSanctuary(this.map,this.rx,this.ry,this.save):null);
    // World adapter for sea creatures: habitat water under a footprint, a telegraphed hit, and the Bog Lurker's drag.
    const seaWorld={player:p,
      water:(hab,x,y)=>SEA_HABITATS[hab].includes(tileUnder(this.map,width,x,y)?.kind),
      hurt:(n,e)=>{if(now<=(p.invulnerableUntil||0))return;p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?n*.65:n)*(1-Math.min(.75,characterStats(this.save).damageReduction))));p.invulnerableUntil=now+700;e.recoil=.2},
      pull:(e,k)=>{const m=Math.hypot(e.x-p.x,e.y-p.y)||1,nx=p.x+(e.x-p.x)/m*Math.min(k,m),ny=p.y+(e.y-p.y)/m*Math.min(k,m);if(footprintOpen(this.map,width,nx,ny,true)){p.x=nx;p.y=ny}},
      // Leviathans (W4): krakens raise bounded tentacles (summoned, no rewards) and the Stormkraken inks the sea.
      tentacles:(o)=>this.enemies.filter(q=>!q.dead&&q.summonedBy===o.id).length+seaSummons.filter(q=>q.summonedBy===o.id).length,
      summon:(kind,x,y,o)=>{const c=createCombatant("ashling",x,y,false,[]);Object.assign(c,{id:`${o.id}:${kind}:${Math.round(now)}:${seaSummons.length}`,kind,variantId:`${kind}:common`,meleePatterns:[],tentacles:0,noRewards:true,summonedBy:o.id},seaCombatantFields(kind));seaSummons.push(c)},
      ownerDead:(e)=>!this.enemies.some(q=>q.id===e.summonedBy&&!q.dead),
      ink:(seconds)=>{this.inkUntil=now+seconds*1000;if(now>(this.inkMessageAt||0)){this.inkMessageAt=now+8000;this.message="Ink clouds the water — the Stormkraken hides in the dark."}}};
    tickTravelers(this.map,p,dt);
    const seaSummons=[];
    const skirmishHooks={settled:(side,survivors)=>{const war=this.map.skirmish;if(!war)return;this.save.worldFlags[war.id]=side;const winner=war[side],loser=war[side==="a"?"b":"a"];this.message=`The fighting ends: the ${winner.label} hold the field against the ${loser.label}.`;journalOnce(this.save,war.id,`At ${this.rx},${this.ry}, ${war.a.label} and ${war.b.label} fought; the ${winner.label} held the field.`,"Skirmishes")}};
    for (const e of this.enemies) {
      if(!activeEnemySet.has(e)){this.performanceStats.dormantEnemies++;continue}
      if(e.farArrayBoss==="listener"&&!e.dead){if(this.updateListener(e,now))continue}
      if(e.skirmishId&&!e.skirmishProvoked){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&updateSkirmisher(e,this.enemies,this.map,dt,skirmishHooks))continue}
      // A retreating Walker is harmless and must traverse settlements normally. Sanctuary combat
      // displacement must neither relocate it nor freeze its retreat while the player rests inside.
      if(e.gatePredator){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&!e.dead)updateGatePredator(e,packWorld);continue}
      if(e.packKind){this.performanceStats.activeEnemies++;const zone=e.kind==="voidWalker"&&(e.retreating||e.fleeTo)?null:packWorld.sanctuary;if(zone){enforceSanctuary(e,zone);if(Math.hypot(p.x-zone.x,p.y-zone.y)<zone.radius)continue}if(!fellIntoHazard&&!e.dead)updatePackMonster(e,packWorld);if(zone)enforceSanctuary(e,zone);continue}
      if(e.seaKind){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&!e.dead)updateSeaCreature(e,seaWorld,dt);continue}
      if(e.encounterGroup&&!this.activatedEncounterGroups.has(e.encounterGroup)){this.activatedEncounterGroups.add(e.encounterGroup);this.performanceStats.encounterActivations++}
      let simulationDt=dt;
      if(e.ambient){e.ambientAccumulator=(e.ambientAccumulator||0)+dt;if(e.ambientAccumulator<.125){this.performanceStats.dormantEnemies++;continue}simulationDt=Math.min(.25,e.ambientAccumulator);e.ambientAccumulator=0;this.performanceStats.ambientTicks++}
      this.performanceStats.activeEnemies++;
      const pathRetryBefore=e.ai?.pathRetryAt||0;
      if (
        !fellIntoHazard&&
        !e.dead &&
        updateEnemyAI(e, p, this.map, width, simulationDt, now, /^(ashling|glassMite|sparkWarden|ashenHound|veilMoth|rootBrute|coilStalker|cinderWisp|hollowMarshal|riftColossus|voidSentinel)-/.test(e.id)?sanctuary:null,(shooter,aim)=>{const cap=this.area==="dungeon"?32:64,room=Math.max(0,cap-this.projectiles.length);if(room)this.projectiles.push(...enemyProjectilePattern(shooter,aim,now,{activeCount:this.projectiles.length,cap}).slice(0,room))}) &&
        now > (p.invulnerableUntil || 0) &&
        (!(now < this.jumpUntil) || e.kind === "sparkWarden")
      ) {
        p.hp -= Math.max(
          1,
          Math.ceil(
            (this.guardRemaining > 0 ? e.damage * 0.65 : e.damage) *
              (1 - Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0))),
          ),
        );
        p.invulnerableUntil = now + 700;
      }
      if((e.ai?.pathRetryAt||0)!==pathRetryBefore)this.performanceStats.pathfindingWork++;
    }
    if(seaSummons.length)this.enemies.push(...seaSummons);
    this.performanceStats.peakActiveEnemies=Math.max(this.performanceStats.peakActiveEnemies,this.performanceStats.activeEnemies);
    const volcano=this.area==="overworld"&&this.map.volcano;
    if(volcano&&Math.hypot(p.x-volcano.x,p.y-volcano.y)<12){this.volcanoClock=(this.volcanoClock||0)+dt;if(this.volcanoClock>=volcano.period){this.volcanoClock=0;this.volcanoSeq=(this.volcanoSeq||0)+1;const n=hashSeed(`${this.save.seed}:eruption:${this.rx}:${this.ry}:${this.volcanoSeq}`);for(let i=0;i<4;i++){const a=((n>>(i*5))%360)*Math.PI/180,r=i===0?0:1.2+((n>>(i*3))%30)/10;addPackEffect(this.packEffects||=[],{kind:"lavaBomb",owner:"volcano",x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,radius:1.05,arming:1.3+i*.2,damage:Math.ceil(this.save.maxHp*.18),jumpable:false,from:{x:volcano.x,y:volcano.y-1}},now)}this.message="The caldera erupts. Watch the burning circles."}}
    this.packEffects=tickPackEffects(this.packEffects||[],packWorld);this.performanceStats.activeHazardsAndEffects+=this.packEffects.length;this._packLastPlayer={x:p.x,y:p.y};
    // A Lighthouse Buoy (release 156) keeps a line for the Wayfarer's skiff: whoever wakes or lands there without it
    // finds it tied alongside, so a rest point at sea is never a prison.
    if (this.area === "overworld" && this.map.openSea && ((this._buoyCheck = (this._buoyCheck || 0) - dt) <= 0)) {
      this._buoyCheck = .5;
      const buoy = this.map.objects.find((o) => o.seaBuoy), bs = ensureBoatState(this.save);
      if (buoy && bs.owned && !bs.aboard && Math.hypot(p.x - buoy.x, p.y - buoy.y) < 2.5 && !(bs.moored?.rx === this.rx && bs.moored?.ry === this.ry)) {
        const spot = [[2, 0], [-1, 0], [0, 2], [0, -1], [2, 1], [1, 2]].map(([dx, dy]) => ({ x: buoy.x + dx, y: buoy.y + dy })).find((q) => sailable(this.map.tiles[q.y * 32 + q.x]?.kind));
        if (spot) { disembark(this.save, { rx: this.rx, ry: this.ry, ...spot }); this.map.objects = this.map.objects.filter((o) => o.id !== "skiff-moored"); this.map.objects.push({ id: "skiff-moored", kind: "skiff", name: "Your skiff", lore: "Tied alongside the buoy.", x: spot.x, y: spot.y, state: "moored", actions: ["board"] }); this.message = "The buoy keeper's line holds your skiff alongside."; }
      }
    }
    // Open-sea hazards (release 152): whirlpools, rogue waves and drifting ice.
    if (this.area === "overworld" && this.seaHazards && p.hp > 0) {
      const onBoard = aboard(this.save);
      // Storm fronts (release 156) drift across many sections in real time; checked once a second.
      if ((this._stormCheck = (this._stormCheck || 0) - dt) <= 0) {
        this._stormCheck = 1; const was = !!this.storm; this.storm = stormAt(this.save.seed, this.rx, this.ry, Date.now() / 1000);
        if (this.storm && this.map.weather !== "rain") { this._calmWeather = this.map.weather || null; this.map.weather = "rain"; }
        if (!this.storm && was) this.map.weather = this._calmWeather || undefined;
        if (this.storm && !was) this.message = "A storm front rolls over the sea. Wind drives the skiff and the waves come faster.";
      }
      tickSeaHazards(this.seaHazards, dt, { player: p, storm: this.storm, aboard: onBoard, swimming: !!this.swimming, dodging: now < (p.dodgeUntil || 0) || (onBoard && now < (this.jumpUntil || 0)), tiles: this.map.tiles,
        move: (mx, my) => { const nx = p.x + mx, ny = p.y + my, ok = aboard(this.save) ? footprintSailable(this.map, width, nx, ny) : footprintOpen(this.map, width, nx, ny, true); if (ok) { p.x = nx; p.y = ny; } return ok; },
        hurt: (n) => { p.hp = Math.max(0, p.hp - n); },
        hull: (n, why) => { if (hullStrike(this.save, n)) { p.sailVx = p.sailVy = 0; this.message = "The skiff breaks apart! Swim for it; the Shipwright will raise it at the dock."; } else this.message = { whirlpool: "The maelstrom's eye batters the hull.", wave: "The rogue wave swamps the skiff.", iceberg: "Ice grinds along the hull.", reef: "Coral scrapes the hull. Find deeper water." }[why]; },
        note: (m) => { this.message = m; } });
      const wave = this.seaHazards.wave;
      if (wave && (onBoard || this.swimming)) { const c = waveCrest(wave, this.seaHazards.clock); if (c.pos !== null && wave.warned !== c.cycle) { wave.warned = c.cycle; this.message = "A rogue wave sweeps across the sea. Burst through it (dodge) or brace!"; } }
      if (onBoard && this.seaHazards.whirlpools.some((v) => Math.hypot(v.x - p.x - .5, v.y - p.y - .7) < v.radius) && now > (this.whirlMessageAt || 0)) { this.whirlMessageAt = now + 9000; this.message = "A maelstrom has the skiff. Row hard for the rim!"; }
    }
    // Aboard, the hull takes its share of every hit; a hull at zero sinks the skiff (it returns to its home dock).
    if (this.area === "overworld" && aboard(this.save) && p.hp < hpStart) {
      const { kept, sunk } = hullAbsorb(this.save, hpStart - p.hp);
      p.hp = hpStart - kept;
      if (sunk) { p.sailVx = p.sailVy = 0; this.message = "The skiff founders and sinks! Swim for shore; the Shipwright will raise it at the dock."; }
    }
    if (p.hp <= 0) {
      const beastNote = this.area === "overworld" ? questingBeastPlayerFell(this.save, this.rx, this.ry, this.enemies.some((e) => e.questingBeast && !e.dead)) : null;
      if (beastNote) journalOnce(this.save, `questing-beast-try:${this.save.questingBeast.cycle}:${this.save.questingBeast.active?.tries ?? "gone"}`, beastNote, "The Questing Beast");
      const worldNote = this.area === "overworld" || this.area === "dungeon" ? worldBeastPlayerFell(this.save, this.rx, this.ry, this.enemies.filter((e) => e.worldBeast && !e.dead).map((e) => e.worldBeast), this.area === "dungeon" ? this.areaId() : null) : null; // release 235
      if (worldNote) journalOnce(this.save, `world-beast-try:${this.rx},${this.ry}:${JSON.stringify(this.save.worldBeasts)}`.slice(0, 160), worldNote, "World beasts");
      // Gate predators have no rematches: a player death ends their hunt, without rewards.
      for (const e of this.enemies) if (e.gatePredator && !e.dead) { e.dead = true; e.noRewards = true; resetGateAttack(e, true); }
      // A failed attempt is a fresh duel, not damage banked across deaths. Preserve tries and rewards.
      for (const e of this.enemies) if (!e.dead && (e.questingBeast || e.worldBeast)) {
        const state = e.questingBeast ? this.save.questingBeast : this.save.worldBeasts?.[e.worldBeast];
        if (!state?.active) { e.dead = true; e.noRewards = true; continue; }
        if (e.retreating || e.fleeTo) continue;
        state.active.patience = 0; // A fresh duel gets a fresh per-fight clock, not fresh attempts.
        e.hp = e.maxHp;
        if (e.glyphBaseSpeed !== undefined) e.speedMultiplier = e.glyphBaseSpeed;
        delete e.glyphBaseSpeed; delete e.glyphBurn; delete e.glyphSlow;
        e.hitStun = 0; e.recoil = 0; e.hitFlash = 0;
        resetPackRuntime(e); e.aggro = false;
      }
      this.captureLastDeath(fellIntoHazard?terrainHazard:"combat");
      if (this.area === "dungeon") {if(String(this.save.session.activeDungeonId||'').startsWith('hunt-instance:'))abandonHuntInstance(this.save,this.save.session.activeDungeonId);abandonDungeon(this.save, this.areaId());}
      const c = this.save.activeCheckpoint;
      this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
      this.save.session.displacementJourney=null;
      const before = this.save.consumables.restorativeDraught || 0;
      if (before < 2) this.save.consumables.restorativeDraught = 2;
      clearRot(this.save);
      const woodLost = loseWood(this.save);
      p.hp = this.save.maxHp;
      p.stamina = this.save.maxStamina;
      p.attackReadyAt =
        p.dodgeReadyAt =
        p.dodgeUntil =
        p.attackUntil =
        p.meleeUntil =
          0;
      p.meleeStrike = null;
      this.jumpUntil = 0;
      this.projectiles = [];
      this.effects = [];
      this.eliteHazards=[];this.packEffects=[];Object.assign(ensureEliteState(this.save).status,{poison:0,poisonTick:0,stun:0,stunGuard:2});
      input.reset?.();
      this.snapshotArea(); // Capture the source coordinates BEFORE switching to the checkpoint.
      this.rx = c.rx;
      this.ry = c.ry;
      this.loadArea("overworld", false);
      p.x = c.x;
      p.y = c.y;
      p.invulnerableUntil = now + 2000;
      this.message = `${fellIntoHazard?(terrainHazard==="canyon"?"Lost to the canyon":"Lost beneath the water"):"Felled"} — recovered at ${c.name || "checkpoint"}. No items, marks, equipment, or XP were lost${woodLost ? `, but the ${woodLost} wood you carried is gone` : ""}. You are protected briefly.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
      if (beastNote) this.message = `${beastNote} ${this.message}`;
    }
    Object.assign(this.save.position, {
      area: this.area,
      rx: this.rx,
      ry: this.ry,
      x: p.x,
      y: p.y,
    });
    this.save.hp = p.hp;
    this.save.stamina = p.stamina;
    this.save.magicBuff = this.magicBuffRemaining;
    this.save.spellCooldown = this.spellCooldownRemaining;
  }
}
