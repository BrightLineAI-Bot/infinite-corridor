import { beginAstralWorldRetreat, tickAstralWorldRetreat, astralRetreatSpawn, astralRetreatSceneMatches } from "./astral-world-retreat.ts";
import { astralCompanionFor, reconcileAstralCompanions } from "./astral-encounters.ts";
import { mountAstralWalker, syncAstralMount, dismountAstralWalker, recordAstralRiderDamage, beginAstralBoarding, tickAstralBoarding, tickAstralRiderChoice, tickAstralFighterChoice } from "./astral-worm-mount.ts";
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
import { ensureSlots, slotted, pairingMods, slotReadiness, activeButton, slotTool, CASTABLES, availableCastables } from "./spell-slots.ts";
import { generateGrotto, DIVE_GENERATOR, GROTTO } from "./grottoes.ts";
import { beastCatchUp } from "./stages.ts";
import { POTIONS, potionToDrink, potionHeal, potionsReady, craftPotion } from "./potions.ts";
import { DUNGEON_LADDER, ladderTier, ladderRoll, crossingLadder, ladderGuardian, entranceKind } from "./dungeon-ladder.ts";
import { diveGate, subGate, underwaterGate, mechGate, droneGate, MECH, MECH_POWER, MECH_LAVA, MECH_WATER, MECH_VOID, DRONE, ensureMech, mechAbsorb, voidTick, tickMech, setEmpowered, mechEmpowered } from "./vehicle-gates.ts";
import { DIVE, diveSite, diveId, canDive, diveSiteHint, grantLens, buyRig, breathe, generateDiveSite } from "./diving.ts";
import { seaSpawns, seaCombatantFields, updateSeaCreature, SEA_CREATURES, SEA_HABITATS, leviathanTrophy, LEVIATHAN_TROPHY } from "./sea-creatures.ts";
import { WOOD, woodFor, addWood, buildSkiff, SAILABLE_DEEP } from "./boats.ts";
import { submersible, fitSubmersible, aboard, sailable, BOAT, canBuildSkiff, mendSkiff, buyHullShield, deployHullShield, tickHullShield, buySkiff, repairSkiff, repairCost, board, disembark, hullAbsorb, hullStrike, sailStep, steer, ensureBoatState, takeSpare } from "./boats.ts";
import { OPEN_SEA_VERSION, seaHazards, tickSeaHazards, bergAt, waveCrest, stormAt, novaFogCapable, novaFog, tickNovaFog } from "./open-sea.ts";
import { canSwim, swimsThrough, isSwimmableKind, tidemantleTrial, grantTidemantle, swimUpkeep, dungeonWaterToll, TIDEMANTLE, mireSpeed, rotTick, healthCeiling, clearRot, MIRE, ensureRot, rotCap } from "./water-traversal.ts";
import { createCombatant, dodge, enemyBodyRadius, MELEE_PATTERNS, enemyMeleeGeometry, pointInEnemyMelee } from "./combat.ts";
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
import { FIELD, FIELD_PASSIVES, fieldOn } from "./lattice-fields.ts";
import { ARC_WAVE, NANOKNIVES, GOLEM, CLUSTER, FIRE_BURST, knifeOffset } from "./tool-forms.ts";
import { DUNGEON_TRAPS, TRAP_DAMAGE_SHARE, trapShareScale, addNewTraps, tickNewTraps } from "./dungeon-traps.ts";
import { sectionAtlasColor } from "./atlas-colors.ts";
import { generateItem, BRAWLER_LOOT } from "./items.ts";
import { echoEvent, tickEchoes, echoDrop, pounceBonus, ECHOES } from "./echoes.ts";
import { riftStep, tickRiftCharges, skillDurationScale, extraReduction, strikeAmplifier, onConstellationDodge, onConstellationMelee, onConstellationKill, onSkillEnded, tickConstellation, altOn, ALT_PASSIVES } from "./constellation.ts";
import { activeMealBonus, eatMeal, tickMeal, mealName } from "./meals.ts";
import { RULES as MARGIN_RULES, MARGINALIA, EMBER_WAKE, RED_MARGIN, SECOND_WIND, SHADOW_STEP, HOURGLASS, INK_SHIELD, GILDED, marginBonus, marginRun, beginMarginRun, endMarginRun, runHas, wardenSpawns, wardenOffer, wardenPage, chooseMarginalia, pasteMarginalia, marginaliaOpen, marginCrossing, ensureMarginalia } from "./marginalia.ts";
import { giftResonances, hostLoadout, glyphHit, glyphDamage, echoPlan, tickGlyphStatus, discoverResonances, glyphDrop, salvageDust, GLYPHS, RESONANCES, resonanceInfo, armorGlyphBonus as armorGlyphBase, skillGlyphMods, normalizeSockets } from "./glyphs.ts";
import { hashSeed, rng } from "./random.ts";
import { placeBuild, buildSpot, tickBuilds, buildBetween, strikeBuild, buildOn, tapTarget, tallBuildAt } from "./building.ts";
import { WATCHER, placeWatcherOverworld, placeWatcherDungeon, dungeonFoldTarget } from "./watcher.ts";
import { refugeLands, plantRefugeLands, regrowSection, noteDiscovery, talkLine } from "./refuge-lands.ts";
import { HORDE, rollHorde, ensureHorde, hordeKill, hordeSpawnPoints } from "./revenant-horde.ts";
import{ELITE_KINDS,eliteVariant,ensureEliteState,recordPortalPrey,completeElite,gravityPull,addEliteHazard,tickEliteHazards,tickEliteStatus,cleansePoison,applyPoison,applyStrongPoison}from'./elites.ts';
import{domainSectionAt,HUNT_FOUNDRY,huntTraceStage,admittedFoundrySpawn,refreshViewportBoard,generatedHuntSpawn,foundryCandidate,foundryEncounter,validateFoundryCandidate,activeViewportHunt,completeViewportHunt,recordViewportArrival,domainEncounterPlan,completeDomainBoss,manifestationMechanics,ensureHuntInstance,beginHuntInstance,abandonHuntInstance,completeHuntInstance,cleanupHuntInstance,recordPeoplePlace,resolveHuntDestination}from'./foundry.ts';
import{ensureCorridorSystems,storySiteFor,recordSectionVisit,recordCreatureEncounter,recordCreatureDefeat,recordRevelationLead}from'./story.ts';
import{generateVariedDungeon,generateUnifiedDungeon,generateBespokeArena,populateDungeonEncounters,DUNGEON_ACTIVE_CAP}from'./arenas.ts';
import{applyDungeonDiscovery,discoveryForLevel,dungeonChunkId,revealDungeonAt}from'./dungeon-framework.ts';
import{ensureSceneState,queueScene}from'./scenes.ts';
import { buildEnemyProjectilePattern, advanceEnemyProjectileBehaviors, enemyPatternWindup, tuneDungeonThreat } from "./enemy-patterns.ts";
import { varyDungeonLayout } from "./dungeon-variation.ts";
import { generateExpeditionDungeon, DUNGEON_GENERATOR_V5, THEME_POOL_VERSION, MIRE_CRYPT, rollMireCrypt, DREAM_HALL, dreamHallRoll } from "./underlands.ts";
import { relayNodeDecision, placeRelayNode, ensureRelayNetwork } from "./relay-network.ts";
import { applyLandscape, applyDream, DREAM_VERSION, farSleepSection, biomeFor, openSeaSection, canStep, LANDSCAPE_VERSION, DEEP_WATER, LETHAL_KINDS, elevationAt, fallDamage, tileUnder, nearestReturnable, canReturnTo, safeVoidScarTransition, liftAt } from "./landscape.ts";
import { BOSS_PACE, bossPaced, staggerGovernor, windupHeld, GATE_REVENANT, GIANT, TURTLE, tuneGatePredator, updateGatePredator, resetGateAttack, nanoScatters, glyphsReachSwarm, CRYSTAL, reflectShotStep, MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, MONSTER_PACK_VERSION, guardianKindFor, GUARDIAN_POOL, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime, packCombatantFields, populateOverworldPack, isDungeonRoamer, isDungeonHunter } from "./monster-pack.ts";
import { HAMLET_VERSION, applyHamlet, hamletSection, legacyMouthHamlet } from "./settlements.ts";
import { addStrange, touchStrange } from "./strange.ts";
import { DIG, planDig, ensureShovel, ensureIronShovel, dig, applyTunnels, overworldDigKey, OVERWORLD_DIG, saveTier, wallGlints, addDigSpot, digSpot } from "./digging.ts";
import { linkedExit, mouthsIn, placeMouth } from "./linked-dungeons.ts";
import { TYRANT_HUNT, tyrantVisit, tickTyrantHunt, tyrantRisePoint, countTyrantRise } from "./tyrant-hunt.ts";
import { TRAVEL_VERSION, applyTrails, addTravelers, addReciter, addDungeonReciter, addElder, addDungeonElder, addWanderer, tickTravelers, wandererArrive, wandererKill } from "./travelers.ts";
import { beastProfileVitals, liveBeastReference, WORLD_BEASTS, BEAST_HOMES, RETREAT, PURSUIT, noteSectionVisit, BLOB_SPLIT, canPursue, pursued, pursuitSpawn, worldBeastFor, worldBeastTriesLeft, tuneWorldBeast, worldBeastSlain, worldBeastPlayerFell, worldBeastPatience, beginRetreat, beginDungeonRetreat, worldBeastForDungeon, retreatTarget, retreatPath, retreatCrossed, retreatEnded, worldBeastsLost, walkerReachableTiles, walkerRetreatDoors, applyVoidScars, consumeVoidTerrain, isMarineTile, marineTileOpen } from "./world-beasts.ts";
import { QUESTING_BEAST, questingBeastFor, questingBeastTriesLeft, tuneQuestingBeast, questingBeastSlain, questingBeastPlayerFell } from "./questing-beast.ts";
import { ensureLattice, grantCoordinates, latticeOpen } from "./transit-lattice.ts";
import { ensureHometowns, grantTowns, townAt, homeKey, homeCenter, homeName } from "./hometowns.ts";
import { generateListenerArena, isArenaRun, daisDue } from "./listener-arena.ts";
import { MIRROR_FORM, isMirror, tickMirrorListener, tickReflection } from "./listener-mirror.ts";
import { MORPH_FORM, isMorph, tickMorphListener, tickWorm } from "./listener-morph.ts";
import { swapPreset, stashForOtherPreset } from "./build-presets.ts";
import { SHADOW_CLONE, cloneOffset, clampPlacement, clonePosition, chargeDistance, tickSpellFields } from "./late-spells.ts";
import { BRAWLER, IRON_FISTS, BRAWLER_ECHO, fistCharge } from "./brawler-spells.ts"; // release 483; 489: Iron Fists
import { ORBIT, orbitLaunch } from "./orbit-volley.ts"; // release 487
import { arrayPylons, runName, FAR, LISTENER_FORMS, ensureFarArray, arrayMouthAt, beginArrayRun, isArrayRun, runBossSpawn, summonSpawn, scaleForGate, summonThresholds, listenerHides, guardianFelled, listenerFelled, beginListenerArena, piecesNeeded, boonTotals, tuneArrayBoss, silentMouthAt, relaysUntilReturn } from "./far-array.ts";
import { addSkirmish, skirmishFields, updateSkirmisher } from "./skirmishes.ts";
import { addIlse, meetIlse } from "./ilse.ts";
import { addBell, ringBell, BELL_GLIMPSES } from "./bells.ts";
import { addMargin, readMargin } from "./margins.ts";
import { addSurveyorLink, takeSurveyorLink, SURVEYOR, addSurveyorStatue, visitSurveyorStatue, surveyorStatueSection } from "./surveyor.ts"; // release 505; 551: part two
import { READINGS, readingKnown, bookProgress } from "./lore.ts";
import { requiredBossId, registerDungeonBosses, recordDungeonBossDefeat, claimDungeonPayoff, installCompletionExit } from "./dungeon-completion.ts";
const remaining = (v, n) => Math.max(0, Number(v || 0) - n);
export const RIFT_FLASH = .6; // release 519: seconds an instant Rift Step lights its button
export const EQUIPMENT_CAPACITY = 60;
export function pinDungeonLayout(save, id) {
  const history = dungeonHistory(save, id);
  const visited = () => history.visits > 0 || Object.keys(save.session.areas || {}).some(key => key === id || key.startsWith(id + ':level:'));
  if (history.gatePredatorSpawnThreshold == null) history.gatePredatorSpawnThreshold = visited() || history.layoutVersion !== undefined ? GATE_REVENANT.legacySpawnPerThousand : GATE_REVENANT.spawnPerThousand;
  if (history.layoutVersion === undefined) history.layoutVersion = visited() ? 0 : 1;
  // Dungeon Monster Pack: only histories that have never been entered adopt the new population and guardians.
  if (history.monsterPack === undefined) history.monsterPack = visited() ? 0 : MONSTER_PACK_VERSION;
  // Release 289: the Watcher's sigil and tombs only in dungeons first entered from now on.
  if (history.watcherVersion === undefined) history.watcherVersion = visited() ? 0 : WATCHER.version;
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
  if (fresh && history.layoutPool === undefined) history.layoutPool = 5; // release 301: plain short crossings and warp daises (4: release 148's organic patterns; 3: release 147's)
  if (fresh && history.themePool === undefined) history.themePool = THEME_POOL_VERSION;
  if (fresh && history.trapsVersion === undefined) history.trapsVersion = DUNGEON_TRAPS.version; // release 523: the sigil, lava and dart traps
  if (fresh && history.warpVersion === undefined) history.warpVersion = 2; // release 377: every large crossing has its daises // release 299: the new dungeon environments
  // Release 319 (dungeon-ladder.ts): a crossing first generated from now on records the Aperture tier it was found at, and
  // that tier decides its size, daises, environments, Poison Crypt, guardian, horde and Gate Revenant for good.
  const ordinary = fresh && id.startsWith('dungeon:') && !id.includes(':deep-v');
  if (ordinary && history.ladder === undefined) history.ladder = { version: DUNGEON_LADDER.version, tier: ladderTier(save) };
  const rungOf = (kind) => history.ladder ? ladderRoll(save.seed, id, kind, history.ladder.tier) : 'full';
  if (fresh && history.mire === undefined) { const rung = rollMireCrypt(save.seed, id, history.layoutPool) ? rungOf('poisonCrypt') : null; history.mire = rung ? { version: MIRE_CRYPT.version, merged: 0, found: false, ...(rung === 'taste' ? { taste: true } : {}) } : false; } // release 303: the Poison Crypt; 319: a taste is a small one
  if (ordinary && history.ladder && !rungOf('gatePredator')) history.gatePredatorSpawnThreshold = 0; // release 319
  if (fresh && history.threefoldLayout === undefined && id.endsWith(':deep-v2:threefold')) history.threefoldLayout = 2;
  // Release 351 (docs/narrative-bible.md section 7, step 4): a crossing first found in the Far Sleep is a Sleeper's Hall.
  if (ordinary && history.dream === undefined) { const at = id.match(/:g\d+:(-?\d+):(-?\d+):/); if (at && farSleepSection(Number(at[1]), Number(at[2]))) history.dream = dreamHallRoll(save.seed, id) ? DREAM_HALL.version : 0; } // release 435: a share of them, not every one (0 pins "ordinary")
  let map;
  // Dive generator pinned per history: 1 = the release-107 Sunken Reach, 2 = themed grottoes (release 108).
  if (isArenaRun(id)) map = generateListenerArena(save.seed, id); // release 375: the Listening Hall
  else if (id.startsWith('dive:')) map = (history.diveGenerator ?? 1) >= 2 ? generateGrotto(save.seed, id) : generateDiveSite(save.seed, id);
  else if (/^(arena:|hunt-arena:|hunt-instance:)/.test(id)) map = generateBespokeArena(save.seed,id,{kind:id.startsWith('arena:')?'persistent':'temporary',cleared:!!history.resolved});
  else if (!id.includes(':deep-v') && history.generatorVersion === DUNGEON_GENERATOR_V5) map = generateExpeditionDungeon(save.seed,id,history.dungeonRecipe || dungeonDescriptor(id).recipe,{...history.generationOptions,...options,layoutPool:history.layoutPool||1,themePool:history.themePool||1,...(history.mire?{theme:'poisonCrypt'}:history.dream?{theme:'dream'}:{}),...(history.mire?.taste?{sizeProfile:'compact'}:{}),...(history.ladder?{ladder:crossingLadder(save.seed,id,history.ladder.tier)}:{}),...(history.warpVersion>=2?{warpAlways:true}:{})});
  else if (!id.includes(':deep-v') && history.generatorVersion === 4) map = generateUnifiedDungeon(save.seed,id,history.dungeonRecipe || dungeonDescriptor(id).recipe,{...history.generationOptions,...options});
  else if (!id.includes(':deep-v') && history.generatorVersion === 3) map = generateVariedDungeon(save.seed,id,dungeonDescriptor(id).recipe);
  else map = generateDungeon(save.seed,id,{...options,threefoldLayout:history.threefoldLayout||1});
  if (history.layoutVersion === 1 && !map.arena && !id.startsWith('displacement:') && !id.startsWith('elite-portal:') && !id.includes('aperture-annex')) varyDungeonLayout(map,save.seed,id);
  if (history.watcherVersion && !id.startsWith('displacement:') && !id.startsWith('dive:') && !map.multiLevel) placeWatcherDungeon(map, map.width || Math.round(Math.sqrt(map.tiles.length)), save.seed, id); // release 289
  return map;
}
// Release 363: a fallen Listener pays its Gate in Transit Coordinates (its pieces + 1).
// Release 371: a fallen Listener raises a town near its Mouth.
function townNote(save) { ensureHometowns(save); const t = grantTowns(save)[0]; if (!t) return ""; journalOnce(save, `listener-town:${t.listener}`, `Where the Listener fell, people have come to live: ${t.name}, at ${t.rx}, ${t.ry}. Light its Wayglass and it can be home (Atlas).`, "The Far Gate"); return ` A town springs up near the Mouth: ${t.name} (${t.rx}, ${t.ry}).`; }
function latticeNote(save) { const before = save.lattice ? save.lattice.coordinates : 0; if (save.lattice) grantCoordinates(save); else ensureLattice(save); const n = save.lattice.coordinates - before; return n ? ` ${n} Transit Coordinates resolve in you (${save.lattice.coordinates} held${latticeOpen(save) ? "; spend them in the Arcanum's Transit Lattice" : ""}).` : ""; }
// Release 357: what the quiet Mouth tells the Wayfarer.
export function quietMouthNote(save) { const n = relaysUntilReturn(save); return n > 0 ? `Answer ${n} more relay${n === 1 ? "" : "s"} (restore or sever) and the line will say where it went.` : "The line has already said where it went: see the Journal's Far Gate."; }
export const DEATH_PAUSE = { seconds: 4, millSpeed: 1.1, millRadius: 3 }; // release 329: the pause after a world beast fells you
export const DIVE_ONWARD = { radius: 8, tries: 6 }; // release 311: how far the deep current looks for the next buoy
export const TOWN_AMENITY = { clear: 3, spacing: 2 }; // release 441: how far town services stand from the Wayglass and from each other
export const TARGET_LOCK = { range: 16, pick: 1.35, meleeSlack: 1.2, meleeReach: 5 }; // release 471: meleeReach, how far past the weapon a tapped lock still takes a swing (as before release 469) // release 347: a wider tap (was .75); 419: wider again (was 1.05)
// Release 343 (Tim: "the range for auto targeting, where it just targets the next closest enemy, needs to be increased"):
// with no locked target, a swing turns toward the nearest foe within its reach + `meleeExtra` tiles, and a tool shot toward
// the nearest within `rangedScale` × its range (the blow and the shot still travel only as far as before).
// Release 419 (Tim: "the automatic targeting of enemies isn't working very well... a little bit more sensitive and a little bit
// longer range"): farther again (meleeExtra was 3, rangedScale 1.6); reach is measured to a creature's edge (`autoAimBody`)
// so big ones are found sooner; foes roughly ahead of you win over ones a little nearer behind (`facingBias` tiles); and
// nothing that cannot be hit (hidden, untargetable, ambient, allies, people) draws the aim.
export const AUTO_AIM = { meleeExtra: 3, rangedScale: 2.2, facingBias: .75, spellScale: 1.6 }; // release 479: spellScale, how far past a spell's range auto target looks for a foe (the spell still lands within its range, toward it)
// release 469: meleeExtra 3 (was 5): auto aim reaches less far for a swing
// Release 499 (Tim: "if a dungeon will [spawn] in that tile, sometimes it can be spawned in a building. If there's a building
// in that tile, no other changes beyond that"): in a section first seen from this release on (atlas `indoorDungeonVersion`),
// when it holds both a dungeon entrance and a building, the entrance stands on the floor inside a building with `chance`,
// chosen by a fixed hash (the same every visit). Sections explored earlier keep their entrances where they were.
export const INDOOR_DUNGEON = { version: 1, chance: .5 };
export function placeDungeonIndoors(map, seed, rx, ry) {
  const d = map?.objects?.find((o) => o.kind === "dungeon"); if (!d || d.indoors) return d?.indoors ? d : null;
  const h = hashSeed(`${seed}:indoor-dungeon:v1:${rx}:${ry}`); if ((h % 1000) / 1000 >= INDOOR_DUNGEON.chance) return null;
  const taken = new Set(map.objects.filter((o) => o !== d).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const spots = map.tiles.filter((t) => (t.structure === "shackInterior" || t.structure === "districtInterior") && !t.blocked && !taken.has(`${t.x},${t.y}`) && footprintOpen(map, 32, t.x, t.y));
  if (!spots.length) return null;
  const t = spots[(h >>> 10) % spots.length]; Object.assign(d, { x: t.x, y: t.y, indoors: true }); return d;
}
export const DODGE_BURST = { chainRadius: .8 }; // release 481: a Chain armor glyph's second burst, as a share of the first burst's radius
export const AIM_MARK = { ms: 450 }; // release 469: how long the struck foe stays marked
export const autoAimBody = (e) => Math.max(0, Number(e.bodyRadius) || 0, ((Number(e.scale) || 1) - 1) * .5);
export const autoAimable = (e) => !e.dead && !e.hidden && !e.untargetable && !e.ambient && !e.astralAllyOf && e.kind !== "npc";
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
// Release 489/493: the brawler gear, given once each when the Wayfarer reaches Infinite III (where the brawler spells opened):
// the Iron Fists (a weapon), Hammerfall and Great Sweep (tools). An Iron Fists pair from release 489 (then a tool) becomes
// the weapon it is now: moved out of the Tool slot into the pack.
export const BRAWLER_GEAR = [
  { flag: "gear:iron-fists", item: { id: "primary-iron-fists", name: "Iron Fists", slot: "primary", power: 12, tier: "rare", property: "brawler" } },
  { flag: "gear:hammerfall", item: { id: "secondary-hammerfall", name: "Hammerfall", slot: "secondary", power: 12, tier: "rare", property: "brawler" } },
  { flag: "gear:great-sweep", item: { id: "secondary-great-sweep", name: "Great Sweep", slot: "secondary", power: 12, tier: "rare", property: "brawler" } },
];
export function grantBrawlerGear(save) {
  save.worldFlags ||= {}; save.inventory ||= []; save.equipment ||= {};
  const fixFists = (q) => { if (q?.name === "Iron Fists" && q.slot === "secondary") Object.assign(q, { slot: "primary", id: "primary-iron-fists" }); return q; };
  if (save.equipment.secondary?.name === "Iron Fists") { const q = fixFists(save.equipment.secondary); save.equipment.secondary = null; save.inventory.push(q); }
  save.inventory.forEach(fixFists);
  if (APERTURE_BANDS.indexOf(apertureBand(save.perception?.aperture || 0)) < 13) return [];
  const given = [];
  for (const { flag, item } of BRAWLER_GEAR) {
    if (save.worldFlags[flag]) continue;
    const owned = save.equipment[item.slot]?.name === item.name || save.inventory.some((q) => q?.name === item.name);
    if (!owned) { if (save.inventory.length >= EQUIPMENT_CAPACITY) continue; save.inventory.push(normalizeSockets({ ...item })); given.push(item.name); }
    save.worldFlags[flag] = true;
  }
  return given;
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
// Release 469 (Tim: "a select all in the gear menu... everything will be highlighted... click something, it'll become
// deselected... then salvage"): salvages the given carried items (by identity) at once. Returns { count, iron }.
export function salvageInventoryItems(save, items) {
  const pick = new Set(items || []); let count = 0, iron = 0;
  for (let i = (save.inventory || []).length - 1; i >= 0; i--) if (pick.has(save.inventory[i])) { const r = salvageInventoryItem(save, i); if (r) { count++; iron += r.iron; } }
  return { count, iron };
}
const isBrawlerGear = (item) => [...BRAWLER_LOOT.primary, ...BRAWLER_LOOT.secondary].some(([n, p]) => n === item?.name && p === item?.property);
// Release 545 (Tim: "first in first out... ranks it by [tier] first. So the most powerful ones don't get salvaged... leave the
// relic and higher quality... if they're all the same tier... salvage the first one that you got"): how much a full pack
// wants to keep a piece: its tier, then whether you have worked on it (upgraded, masterworked, an added socket). Within the
// same keep, the oldest (lowest index: the pack only appends) goes first.
const packKeep = (q) => ITEM_TIERS.indexOf(itemTier(q)) * 2 + ((Number(q?.upgradeRank) || 0) > 0 || q?.masterwork || q?.extraSockets ? 1 : 0);
export function packVictim(save, spareBrawler = false) {
  let at = -1;
  for (let i = 0; i < save.inventory.length; i++) if ((!spareBrawler || !isBrawlerGear(save.inventory[i])) && (at < 0 || packKeep(save.inventory[i]) < packKeep(save.inventory[at]))) at = i;
  return at < 0 ? 0 : at;
}
// `keep` (release 545): the piece is kept whatever it is (a purchase), and the pack's least-kept, oldest piece makes room.
export function storeInventoryItem(save, item, keep = false) {
  save.inventory ||= [];
  if (save.inventory.length < EQUIPMENT_CAPACITY) {
    save.inventory.push(item);
    return { stored: true, salvaged: null };
  }
  // Release 513: a full pack never salvages brawler gear you do not have (Iron Fists, Hammerfall, Great Sweep): it takes the
  // place of another piece instead.
  const fresh = isBrawlerGear(item) && !save.inventory.some((q) => q?.name === item.name) && !Object.values(save.equipment || {}).some((q) => q?.name === item.name);
  const weakest = packVictim(save, fresh);
  if (!fresh && !keep && packKeep(item) < packKeep(save.inventory[weakest])) { // release 545: a drop below everything you keep is salvaged; at the same keep the oldest goes instead
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
// Release 295: what a dodge costs (armor glyph Still lowers it).
// Release 383: the empowered robot adds MECH_POWER.damage to every blow, magic shot and spell, by the same path as the armor glyphs.
// Release 447 (meals.ts): a Refuge meal adds its bonus by the same path, while it lasts; release 459 (marginalia.ts): so do
// the marginalia of the crossing you are in.
const armorGlyphBonus = (save) => { const g = armorGlyphBase(save), b = mechEmpowered(save) ? { ...g, attackDamage: (g.attackDamage || 0) + MECH_POWER.damage, spellDamage: (g.spellDamage || 0) + MECH_POWER.damage } : g, run = save?.session?.marginRun; if (!save?.meal && !run) return b; const out = { ...b }, add = (bonus) => { for (const k of MEAL_STAT_FIELDS) if (bonus[k]) out[k] = (out[k] || 0) + bonus[k]; }; add(activeMealBonus(save)); if (run) add(marginBonus(save, save.session.activeDungeonId)); return out; };
export const DAMAGE_NUMBERS = { life: 900, rise: .9, cap: 48 }; // release 461
// Release 463 (Tim: "increase the enemies in the dungeons... 20% more health... 20% more damage... about twenty percent more
// monsters"): every dungeon foe built from a spawn (not world beasts, the Questing Beast, Far Array bosses or ambient
// creatures) gets `hp` and `damage`; and `count` more of the crossing's ordinary foes stand near the others, by seed, with
// stable ids (never added to a cleared crossing, an arena, a Far Array run or a hunt instance).
export const DUNGEON_BOOST = { hp: 1.2, damage: 1.2, count: .2, near: 3 };
const GUARDIAN_ROLES = ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"];
const MEAL_STAT_FIELDS = ["attackDamage", "spellDamage", "hp", "staminaRegen", "move", "attackSpeed", "spellCooldown", "defense", "dodgeCost", "reach"];
export const dodgeCost = (save) => Math.round(15 * (1 - armorGlyphBonus(save).dodgeCost) * 10) / 10;
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
    boons=boonTotals(save), // Far Gate boons (release 138)
    ag=armorGlyphBonus(save); // release 295: glyphs set in the armor
  return {
    maxHp: Math.round((60 + (level - 1) * 6 + (vigor - 1) * 8 + resonance * APERTURE_RESONANCE.hp + boons.hp) * (1 + ag.hp)),
    maxStamina: 50 + (level - 1) + (finesse - 1) * 3 + boons.stamina,
    damageReduction: Math.min(
      0.45,
      (resolve - 1) * 0.02 + armorPower * 0.025 + charmPower * 0.01 +
        affixValue(armor, "ward") + affixValue(charm, "ward") + extraReduction(save) + pairingMods(save).guard + boons.guard + ag.defense,
    ),
    meleeBonus: Math.round(( // release 335: armor Volatile now scales the whole melee hit (meleeHit), not this bonus
      Math.max(1, Number(stats.Might) || 1) * 2 +
      (Number(save.weaponLevel) || 0) * 3 +
      Math.floor((level - 1) * 0.6) +
      Math.floor((Number(primary?.power) || 0) * 0.7) +
      affixValue(primary, "attack")+(active?.id==='ember-form'?2+rank*2:0)+(active?.id==='force-channel'?rank*2:0) + resonance * APERTURE_RESONANCE.melee + boons.melee)),
    magicBonus: Math.round(( // release 335: armor Ignite now scales whole spells and magic shots
      Math.max(1, Number(stats.Focus) || 1) +
      Math.floor((level - 1) * 0.45) +
      Math.floor((Number(secondary?.power) || 0) * 0.55) +
      affixValue(secondary, "attack")+(active?.id==='force-channel'?rank*3:0) + resonance * APERTURE_RESONANCE.magic + boons.magic)),
    attackReach: affixValue(primary, "reach") + affixValue(secondary, "reach") + affixValue(charm, "reach")+(active?.id==='ember-form'?.12+.06*rank:0)+(ag.reach||0)/* release 461: Long Arm */,
    moveSpeed: affixValue(armor, "movement") + affixValue(charm, "movement")+(active?.id==='quickening'?.12+.08*rank:0)+pairingMods(save).speed+boons.speed+ag.move,
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
  grantBrawlerGear(save); // release 489; 493
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
export function footprintOpen(map, width, x, y, allowLethalTerrain=false, allowMarineTerrain=false, allowVoid=false) { /* release 509: allowVoid, the robot into the Far Sleep's star-voids (MECH_VOID) */
  const left=x+.24,right=x+.76,top=y+.5,bottom=y+.88,height=map.tiles.length/width,overlaps=(a,b,c,d)=>right>a&&left<b&&bottom>c&&top<d;
  for(let ty=Math.floor(top);ty<=Math.floor(bottom-1e-6);ty++)for(let tx=Math.floor(left);tx<=Math.floor(right-1e-6);tx++){
    if(tx<0||ty<0||tx>=width||ty>=height)return false;
    const tile=map.tiles[ty*width+tx],marine=allowMarineTerrain&&isMarineTile(tile),lethal=allowLethalTerrain&&["canyon","river","dungeonWater",...DEEP_WATER].includes(tile?.kind);
    if(!tile||marine&&!marineTileOpen(tile)||tile.blocked&&!lethal&&!marine&&!(allowVoid&&isDreamVoid(tile)))return false;
    if(tile.perch&&!allowLethalTerrain)return false; // release 265: a stone block is a perch only the Wayfarer (and fliers) may step onto
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
// Release 437: the nearest spot (tile corner, as entities stand) whose footprint is open, searching outward; null if none.
export function nearestOpenFootprint(map, width, at, limit = 12) {
  const sx = Math.round(at.x), sy = Math.round(at.y), height = Math.floor(map.tiles.length / width);
  for (let r = 0; r <= limit; r++) { let best = null; for (let y = sy - r; y <= sy + r; y++) for (let x = sx - r; x <= sx + r; x++) { if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) !== r || x < 0 || y < 0 || x >= width || y >= height || !footprintOpen(map, width, x, y, true)) continue; const d = Math.hypot(x - at.x, y - at.y); if (!best || d < best.d) best = { x, y, d }; } if (best) return { x: best.x, y: best.y }; }
  return null;
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
// Release 511: only the Far Sleep's own star-voids (landscape "dream"). A Sleeper's Hall uses starVoid as its walls
// (underlands.ts, landscape "underlands"): those stay walls, even to the robot.
const isDreamVoid = (tile) => tile?.kind === "starVoid" && tile.landscape === "dream";
// Release 509: whether any of the footprint is over a star-void (MECH_VOID).
export function footprintVoid(map, width, x, y) {
  const left = x + .24, right = x + .76, top = y + .5, bottom = y + .88;
  for (let ty = Math.floor(top); ty <= Math.floor(bottom - 1e-6); ty++) for (let tx = Math.floor(left); tx <= Math.floor(right - 1e-6); tx++) if (tx >= 0 && tx < width && isDreamVoid(map?.tiles?.[ty * width + tx])) return true;
  return false;
}
export function moveAxis(entity, dx, dy, map, width, allowLethalTerrain=false, onStep=null, allowMarineTerrain=false) {
  let moved = false,
    steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.16)),
    sx = dx / steps,
    sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    // Release 287: a two-high stack of blocks (or a wall) stops fliers too; only the Wayfarer climbs builds.
    const tall = (x, y) => allowLethalTerrain && !entity.isPlayer && tallBuildAt(map, width, x, y);
    if (sx && footprintOpen(map, width, entity.x + sx, entity.y, allowLethalTerrain, allowMarineTerrain, entity.isPlayer === true && entity.voidSuit === true) && !tall(entity.x + sx, entity.y) && canStep(entity, map, width, entity.x, entity.y, entity.x + sx, entity.y)) {
      const fromX = entity.x;
      entity.x += sx;
      onStep?.(fromX, entity.y, entity.x, entity.y);
      moved = true;
    }
    if (sy && footprintOpen(map, width, entity.x, entity.y + sy, allowLethalTerrain, allowMarineTerrain, entity.isPlayer === true && entity.voidSuit === true) && !tall(entity.x, entity.y + sy) && canStep(entity, map, width, entity.x, entity.y, entity.x, entity.y + sy)) {
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
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(seen.has(key)||Math.abs(nx-sx)>radius||Math.abs(ny-sy)>radius||!footprintOpen(map,width,nx,ny,false,entity._marineTraversal===true))continue;seen.add(key);queue.push([nx,ny]);first.set(key,first.get(`${x},${y}`)||[nx,ny])}
  }
  return first.get(`${best[0]},${best[1]}`)||null;
}

// Runtime navigation permission is derived from the current area/kind, never from player boat ownership or
// restored actor flags. The presentation flag is recomputed after movement and is not durable boat state.
function refreshMarineBeast(entity, map, width, area) {
  if (!["voidWalker", "psychicCrystal", "astralWorm", "astralMirage", "lightningGiant", "mountainTurtle"].includes(entity?.kind)) return false; // release 257: the Giant crosses the sea on its cloud; release 261: the Turtle walks it on ice
  const capable = area === "overworld";
  Object.defineProperty(entity, "_marineTraversal", { value: capable, writable: true, configurable: true, enumerable: false });
  entity.marine = capable && marineAt(map, width, entity.x, entity.y);
  return capable;
}
function marineAt(map, width, x, y) {
  const ix = Math.floor(x + .5), iy = Math.floor(y + .75), height = Math.floor((map?.tiles?.length || 0) / width);
  return [x, y].every(Number.isFinite) && ix >= 0 && iy >= 0 && ix < width && iy < height && isMarineTile(map.tiles[iy * width + ix]);
}
function marinePointOpen(map, width, x, y, projectile = false) {
  const ix = Math.floor(x), iy = Math.floor(y), height = Math.floor((map?.tiles?.length || 0) / width);
  if (![x, y].every(Number.isFinite) || ix < 0 || iy < 0 || ix >= width || iy >= height) return false;
  const tile = map.tiles[iy * width + ix];
  return isMarineTile(tile) ? marineTileOpen(tile) : (projectile ? projectileTileOpen : tileOpen)(map, width, x, y);
}
// Read-only terrain preview for one adjacent section boundary. No visits, discoveries, hunts or actors advance.
// Interior-only rafts/wayglass sites are irrelevant to edge legality. Pinned landscape, hamlets, trails, fallen
// crossings and durable scars match the corresponding production load before any boundary can be crossed.
export function walkerCrossingMap(save, rx, ry) {
  const map = generateRegion(save.seed, rx, ry, save.worldGeneration), seen = save.atlas?.[`${rx},${ry}`];
  applyLandscape(map, save.seed, rx, ry, { explored: !!seen && !seen.landscapeVersion, version: seen?.landscapeVersion || LANDSCAPE_VERSION,
    openSea: !seen ? OPEN_SEA_VERSION : seen.seaVersion || 0, buoy: !save.checkpoints?.[`${rx},${ry}`] || save.checkpoints[`${rx},${ry}`].name === "Lighthouse Buoy",
    hamlet: (!seen || !!seen.hamletVersion) && (hamletSection(save.seed, rx, ry) || legacyMouthHamlet(save, rx, ry)) });
  if (!seen || seen.dreamVersion) applyDream(map, save.seed, rx, ry, seen?.dreamVersion || DREAM_VERSION); // release 305: the Far Sleep
  if (!seen || seen.hamletVersion) applyHamlet(map, save.seed, rx, ry, seen?.hamletVersion || HAMLET_VERSION, false, legacyMouthHamlet(save, rx, ry));
  if (!seen || seen.travelVersion) applyTrails(map, save.seed, rx, ry);
  const key = `overworld:${rx}:${ry}:g${save.worldGeneration}`, saved = save.session?.areas?.[key];
  for (const o of map.objects || []) if (saved?.objects?.[o.id]) Object.assign(o, saved.objects[o.id]);
  applyFallenTreeCrossings(map);
  // Replay only this area's detached record, never normalize/mutate the live save while probing a neighbor.
  const row = save.voidScars?.areas?.[key], overlay = { voidScars: { ...save.voidScars, areas: row ? { [key]: structuredClone(row) } : {} } };
  applyVoidScars(overlay, map, key);
  return map;
}
// At most 32 marine edge pairs plus the old ordinary gate. Every landing keeps its exact cross-edge coordinate.
export function walkerSectionCrossings(map, neighbor, side, gate = null) {
  if (map?.tiles?.length !== 1024 || neighbor?.tiles?.length !== 1024 || !["north", "south", "east", "west"].includes(side)) return [];
  const pair = n => side === "east" ? [{ x: 31, y: n }, { x: 0, y: n }] : side === "west" ? [{ x: 0, y: n }, { x: 31, y: n }] :
    side === "south" ? [{ x: n, y: 31 }, { x: n, y: 0 }] : [{ x: n, y: 0 }, { x: n, y: 31 }];
  const out = [], values = [...new Set([...(gate ? [side === "east" || side === "west" ? gate.y : gate.x] : []), ...Array.from({ length: 32 }, (_, i) => i)])];
  for (const n of values) {
    const [at, entry] = pair(n), a = tileUnder(map, 32, at.x, at.y), b = tileUnder(neighbor, 32, entry.x, entry.y), ordinaryGate = gate && at.x === gate.x && at.y === gate.y;
    if (!(ordinaryGate || marineTileOpen(a) && marineTileOpen(b)) || !walkerGroundPositionOpen(map, 32, at.x, at.y, true) || !walkerGroundPositionOpen(neighbor, 32, entry.x, entry.y, true)) continue;
    if (!safeVoidScarTransition(a, b) && Math.abs((a?.elev || 0) - (b?.elev || 0)) > 1) continue;
    out.push({ ...at, entry });
  }
  return out;
}
// Void Walker ground navigation stays separate from Crystal phasing and from its explicit rift teleports.
export const WALKER_ROUTE = { nodes: 625, distance: 8, segment: .125, speed: 1.35, retry: 1, pause: .2, recent: 8, jumpLift: 1.4, jumpTime: .38 };
export function walkerGroundPositionOpen(map, width, x, y, allowMarineTerrain = false) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !map?.tiles || !Number.isInteger(width) || width < 1 || !footprintOpen(map, width, x, y, false, allowMarineTerrain)) return false;
  for (let ty = Math.floor(y + .5); ty <= Math.floor(y + .88 - 1e-6); ty++) for (let tx = Math.floor(x + .24); tx <= Math.floor(x + .76 - 1e-6); tx++)
    if (LETHAL_KINDS.has(map.tiles[ty * width + tx]?.kind) && !(allowMarineTerrain && marineTileOpen(map.tiles[ty * width + tx]))) return false;
  return true;
}
export function moveWalkerGround(entity, dx, dy, map, width, allowJump = false) {
  if (![dx, dy].every(Number.isFinite) || Math.max(Math.abs(dx), Math.abs(dy)) > 4) return false;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / WALKER_ROUTE.segment)), sx = dx / n, sy = dy / n; let moved = false;
  for (let i = 0; i < n; i++) {
    if (sx && walkerGroundSegmentOpen(entity, map, width, entity, { x: entity.x + sx, y: entity.y }, allowJump)) { entity.x += sx; moved = true; }
    if (sy && walkerGroundSegmentOpen(entity, map, width, entity, { x: entity.x, y: entity.y + sy }, allowJump)) { entity.y += sy; moved = true; }
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
    if (!walkerGroundPositionOpen(map, width, at.x, at.y, entity?._marineTraversal === true)) return false;
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
  (t.kind === "void" || t.kind === "sealedGate" ? 32 : 0) | (marineTileOpen(t) ? 2048 : 0) | (["districtWall", "shackWall"].includes(t.structure) ? 64 | (t.wallSides || []).reduce((n, side) => n | ({ north: 128, east: 256, south: 512, west: 1024 }[side] || 0), 0) : 0);
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
  onBuildHit = null,
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
    if (p.seekId && !p.hostile) { const t = enemies.find((e) => e.id === p.seekId && !e.dead); if (t) { const ax = t.x + .5 - p.x, ay = t.y + .5 - p.y, d = Math.hypot(ax, ay) || 1, k = Math.min(1, (p.seekTurn || 6) * dt); p.dx += (ax / d - p.dx) * k; p.dy += (ay / d - p.dy) * k; const n = Math.hypot(p.dx, p.dy) || 1; p.dx /= n; p.dy /= n; } } // release 321: the drone's rockets home
    const distance = p.speed * dt,
      steps = Math.max(1, Math.ceil(distance / 0.2)),
      step = distance / steps;
    for (let i = 0; i < steps && !p.dead; i++) {
      const next = mirrorWalls.length ? reflectShotStep(p, mirrorWalls, step) : { x: p.x + p.dx * step, y: p.y + p.dy * step };
      const nx = next.x, ny = next.y;
      // Release 265: a hostile shot entering a build (not the one the Wayfarer stands on) is absorbed by it.
      if (p.hostile && onBuildHit && map.tiles[Math.floor(ny) * width + Math.floor(nx)]?.build && !(player && Math.floor(nx) === Math.floor(player.x + .5) && Math.floor(ny) === Math.floor(player.y + .75))) { p.dead = true; p.impact = { x: p.x, y: p.y }; onBuildHit(Math.floor(nx), Math.floor(ny)); break; }
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
      let mountedPeerId = null;
      for (const e of enemies)
        if (
          !e.dead &&
          (!mountedPeerId || e.id === mountedPeerId) &&
          !e.untargetable &&
          !p.hits?.[e.id] &&
          Math.hypot(e.x + 0.5 - p.x, e.y + 0.45 - p.y) <
            0.1 + (p.grow || 0) + enemyBodyRadius(e)
        ) {
          alertEnemy(e);
          if (p.path === "grenade") {
            p.dead = true;
            p.impact = { x: p.x, y: p.y };
            onDetonate(p);
            break;
          }
          // Only the co-located Astral mounted counterpart may share this substep. Preserve the
          // existing one-actor-per-substep behavior for every unrelated piercing target.
          const peer = (e.kind === "astralWorm" || e.astralMount?.status === "mounted") ? enemies.find(q => q !== e && !q.dead && !q.untargetable && !p.hits?.[q.id] &&
            Math.hypot(q.x-e.x,q.y-e.y)<1e-6 && (e.astralMount?.status === "mounted" && e.astralMount.ownerId === q.id ||
              q.astralMount?.status === "mounted" && q.astralMount.ownerId === e.id)) : null;
          const dealt = damageFor(p, e), hpBefore = Math.max(0, e.hp);
          e.hp -= dealt;
          const actual = Math.max(0, hpBefore - Math.max(0, e.hp));
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
          onHit(p, e, dealt, actual);
          if (p.dead || mountedPeerId || !peer) break;
          mountedPeerId = peer.id;
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
// Release 469 (Tim: "the targeting seems a little bit long... I'll be moving past enemies and the targeting won't hit them... I
// don't know where it's aiming"): a foe already within the swing's reach (`core`) always comes before one auto aim would
// have to reach for, whichever way you face; among those, the nearer and the one ahead first. Returns { e, d } or null.
export function pickMeleeTarget(player, enemies, map, width, reach, core = reach) {
  const out = [];
  for (const e of enemies) {
    if (!autoAimable(e)) continue; // release 419
    const x = e.x + 0.5 - (player.x + 0.5),
      y = e.y + 0.45 - (player.y + 0.45),
      distance = Math.hypot(x, y);
    if (distance - autoAimBody(e) > reach) continue;
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
  const score = (q) => q.distance - autoAimBody(q.e) - q.alignment * AUTO_AIM.facingBias, inReach = (q) => q.distance - autoAimBody(q.e) <= core ? 0 : 1; // release 419: ahead of you counts; 469: in reach first
  out.sort(
    (a, b) =>
      inReach(a) - inReach(b) ||
      score(a) - score(b) ||
      b.alignment - a.alignment ||
      String(a.e.id).localeCompare(String(b.e.id)),
  );
  return out[0] ? { e: out[0].e, d: out[0].d } : null;
}
export function selectMeleeAim(player, enemies, map, width, reach, core = reach) { return pickMeleeTarget(player, enemies, map, width, reach, core)?.d || null; }
export function selectRangedAim(player, enemies, map, width, range = Infinity) {
  return enemies
    .filter(autoAimable) // release 419 (was: not dead, not ambient)
    .map((e) => ({
      e,
      distance: Math.max(0, Math.hypot(e.x + 0.5 - (player.x + 0.5), e.y + 0.45 - (player.y + 0.45)) - autoAimBody(e)),
    }))
    .filter((q) => q.distance <= range && hasLineOfSight(q.e, player, map, width, true))
    .sort((a, b) => a.distance - b.distance || String(a.e.id).localeCompare(String(b.e.id)))
    .map((q) => projectileDirection(q.e.x - player.x, q.e.y - player.y, player.facing))[0] || null;
}
export function updateTraps(objects, player, dt, jumping = false, maxHp = 0, level = 1) {
  for (const trap of objects.filter((o) => o.kind === "trap" && !o.newTrap /* release 523: tickNewTraps runs those */)) {
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
        player.hp -= Math.max(Number(trap.damage)||14, Math.round((Number(maxHp) || 0) * TRAP_DAMAGE_SHARE * trapShareScale(level))); // release 525: at least a share of maximum health; 557: growing with level
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
        const dealt = damageFor(fx, e), hpBefore = Math.max(0, e.hp);
        e.hp -= dealt;
        const actual = Math.max(0, hpBefore - Math.max(0, e.hp));
        e.hitFlash = 0.18;
        e.hitStun = Math.max(e.hitStun || 0, e.boss || e.eliteId ? 0.1 : 0.18);
        if (fx.stun) e.hitStun = Math.max(e.hitStun || 0, e.boss || e.eliteId ? fx.stun * .25 : fx.stun); // release 483: Hammerfall and a charged Iron Fist stagger
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          onDefeat(e);
        }
        onHit(fx, e, dealt, actual);
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
  if (prior && !stashForOtherPreset(save, item.slot, prior)) save.inventory.push(prior); // release 541: or it stays the other preset's
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
  save.currency -= price;
  const kept = storeInventoryItem(save, { ...item }, true); // release 545: a full pack makes room (its least-kept, oldest piece) rather than refusing
  shop.purchased[id] = true;
  return { ok: true, quantity: 1, message: `Purchased ${item.name}.${kept.salvaged ? ` Your pack was full: ${kept.salvaged.name} was salvaged for ${kept.iron} cinder iron.` : ""}` };
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
  save.currency -= price;
  const kept = storeInventoryItem(save, { ...item }, true); // release 545: a full pack makes room (its least-kept, oldest piece) rather than refusing
  shop.purchased[id] = true;
  return { ok: true, quantity: 1, message: `Purchased ${item.name}.${kept.salvaged ? ` Your pack was full: ${kept.salvaged.name} was salvaged for ${kept.iron} cinder iron.` : ""}` };
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
      available: game.player.stamina >= dodgeCost(game.save),
      cost: Math.round(dodgeCost(game.save)),
    },
    jump: { remaining: jump / 1000, duration: 0.52 },
    spell: slotReadiness(game.save, "a", spell),
    spell2: slotReadiness(game.save, "b", spell),
    potion: {
      remaining: 0,
      duration: 0,
      count: potionsReady(game.save) || game.save.consumables?.restorativeDraught || 0, // release 341: carried plus brewable of the chosen tier (else plain draughts)
      available:
        (potionsReady(game.save) || game.save.consumables?.restorativeDraught || 0) > 0 &&
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
export function hasLineOfSight(enemy, player, map, width, projectile=false, allowMarineTerrain=false) {
  const dx = player.x - enemy.x,
    dy = player.y - enemy.y,
    steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 4));
  for (let i = 1; i < steps; i++)
    if (
      !(allowMarineTerrain ? (m, w, x, y) => marinePointOpen(m, w, x, y, projectile) : projectile?projectileTileOpen:tileOpen)(
        map,
        width,
        enemy.x + (dx * i) / steps,
        enemy.y + (dy * i) / steps,
      )
    )
      return false;
  return true;
}
// Objects that do not keep Act from building a skiff at the water's edge (release 263).
export const SHORE_PASSIVE = ["tree", "rock"];
// Release 557 (Tim: "a lot of these weight glasses are on small little... areas... it activates the boat... or if there's
// someone nearby, it'll talk to them... prioritize the weight glass... a hard rule... there's like an area... around the
// way glass where... you can't make a boat"): within `reach` tiles of a Wayglass (any checkpoint, the Lighthouse Buoy too)
// or a relay, Act always answers the Wayglass first, and no skiff is built or boarded there by the shore rules, the robot's
// walk out to sea included. A skiff already moored there is still boarded by choosing it on the panel.
export const WAYGLASS_ZONE = { kinds: ["checkpoint", "relayNode", "relayTerminal"], reach: 2.5 }; // a person tapped in Act aim still answers (interactAt names them)
// Crossing Sigils (release 263; Tim, 2026-10-21: "it's great that they're rare... but they're too rare... when you kill
// these world bosses, and then when you also kill the [Gate Revenants], those will drop crossing sigils... the first
// guardian in a dungeon won't ever drop a crossing sigil. Only the second guardian... has a chance... ultra rare").
// `deepGuardian` is a percent chance, for a guardian on any level but the first of a multi-level dungeon. `threefold`
// (Tim: "when you do the threefold deep... a slightly greater chance") is the chance for any guardian of the Threefold Deep.
// `worldBeast` (Tim: "The first time you kill it, there's a hundred percent chance you'll get a sigil, and its echo. But
// each time [after], there's a twenty percent chance") is the percent chance after a beast's first spoils.
export const SIGIL_DROPS = { worldBeast: 20, gateRevenant: 1, deepGuardian: 3, threefold: 6 };
// A world beast's or the Questing Beast's first kill since release 263 gives its Sigil and Echo for certain. The record is
// save.worldBeasts[id].spoils / save.questingBeast.spoils (additive), so beasts slain before 263 count as new once.
export function takeFirstSpoils(save, e) {
  const q = e?.worldBeast ? save.worldBeasts?.[e.worldBeast] : e?.questingBeast ? save.questingBeast : null;
  if (!q || q.spoils || e.summonedBy || e.noRewards) return false;
  q.spoils = true; return true;
}
// A dungeon's own guardian (a world beast or Questing Beast haunting it is not one; they roam and have their own rules).
// Release 561 (Tim, 2026-10-29: "the guardians for the threefold deep are comically easy to kill"): the deep dungeons' wardens
// (objective guardians: the Threefold Deep's three, and the like) are ordinary creatures made bosses, and had a crossing
// guardian's ×1.35 health. Now they stand up as the bosses they are.
export const DEEP_WARDEN = { hp: 2.4, damage: 1.25, speed: 1.12, attackCooldownScale: .72, telegraphScale: .9 };
export const isDungeonGuardian = (e) => !!e && !e.worldBeast && !e.questingBeast && (!!e.boss || ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"].includes(e.dungeonRole));
export function sigilDrop(save, e, map, n, first = false) {
  if (!e || e.summonedBy || e.noRewards) return 0;
  if (e.worldBeast || e.questingBeast) return first || rng(`${save.seed}:sigil-drop:beast:v1:${e.id}:${n}`)() * 100 < SIGIL_DROPS.worldBeast ? 1 : 0;
  if (e.kind === "gateRevenant") return SIGIL_DROPS.gateRevenant;
  if (!isDungeonGuardian(e)) return 0;
  const levels = map?.multiLevel ? map.levels || [] : [], at = levels.findIndex((q) => q.id === map.levelId);
  const chance = map?.name === "The Threefold Deep" ? SIGIL_DROPS.threefold : at >= 1 ? SIGIL_DROPS.deepGuardian : 0;
  if (chance && rng(`${save.seed}:sigil-drop:v1:${e.id}:${n}`)() * 100 < chance) return 1;
  return 0;
}
// Release 263 (Tim: "In the second level of a dungeon... I spawn into like right next to The Guardian... I should not
// spawn next to The Guardian"): arriving on a level, the Wayfarer is moved along the walkable floor to the nearest spot at
// least `ARRIVAL.clear` tiles from every living guardian (unchanged when the arrival is already clear).
export const ARRIVAL = { clear: 8, search: 2000 };
export function clearArrival(map, width, at, enemies) {
  const guards = (enemies || []).filter((e) => !e.dead && isDungeonGuardian(e) && Math.hypot(e.x - at.x, e.y - at.y) < ARRIVAL.clear * 2);
  if (!guards.length) return null;
  // Walk the open floor from the arrival; only a guardian standing on that floor (not one sealed behind a gate or wall)
  // can reach the Wayfarer, so only those count.
  const height = Math.floor(map.tiles.length / width), sx = Math.round(at.x), sy = Math.round(at.y), seen = new Set([sy * width + sx]), queue = [[sx, sy]], open = [];
  for (let k = 0; k < queue.length && k < ARRIVAL.search; k++) {
    const [x, y] = queue[k];
    if (footprintOpen(map, width, x, y)) open.push([x, y]); else if (k) continue; // the arrival tile itself always expands
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, i = ny * width + nx; if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen.has(i)) continue; seen.add(i); queue.push([nx, ny]); }
  }
  const floor = new Set(open.map(([x, y]) => y * width + x)), near = (e) => [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]].some(([dx, dy]) => floor.has((Math.round(e.y) + dy) * width + Math.round(e.x) + dx));
  const threats = guards.filter(near), far = (x, y) => threats.every((e) => Math.hypot(e.x - x, e.y - y) >= ARRIVAL.clear);
  if (!threats.length || far(at.x, at.y)) return null;
  let best = null;
  for (const [x, y] of open) { if (far(x, y)) return { x, y }; const gap = Math.min(...threats.map((e) => Math.hypot(e.x - x, e.y - y))); if (!best || gap > best.gap) best = { x, y, gap }; }
  return best && { x: best.x, y: best.y }; // nowhere far enough: the farthest reachable spot
}
// Release 419 (Tim: "I keep getting spawned in... out of bound areas... when I get spawned into the second level of a dungeon,
// the dungeon will be just black... it spawns me right by The Guardian... a hard rule where you don't get... placed next
// to the guardian"). Every arrival on a dungeon floor (stairs, return lattices, entrances, recovery after a fall) lands on
// the floor the level's entry stands on, never in a pocket walled off from it (a sealed boss chamber, a void behind a wall:
// the old nearest-open-tile fallback could put you there), and, when `guardians` is set, never within ARRIVAL.clear tiles
// of a living guardian, whatever lies between. Returns the spot to move to, or null when the arrival is already sound.
export function settleDungeonArrival(map, width, at, enemies, guardians = true) {
  const height = Math.floor((map?.tiles?.length || 0) / width); if (!height) return null;
  const clampX = (x) => Math.max(0, Math.min(width - 1, Math.round(Number.isFinite(x) ? x : 0))), clampY = (y) => Math.max(0, Math.min(height - 1, Math.round(Number.isFinite(y) ? y : 0)));
  const ref = map.entry || map.hub || at, start = { x: clampX(ref.x), y: clampY(ref.y) };
  if (!footprintOpen(map, width, start.x, start.y)) relocateIfStranded(start, map, width);
  const seen = new Set([start.y * width + start.x]), queue = [[start.x, start.y]], floor = [];
  for (let k = 0; k < queue.length; k++) {
    const [x, y] = queue[k]; if (!footprintOpen(map, width, x, y)) continue; floor.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, i = ny * width + nx; if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen.has(i)) continue; seen.add(i); queue.push([nx, ny]); }
  }
  if (!floor.length) return null;
  const onFloor = new Set(floor.map(([x, y]) => y * width + x)), guards = guardians ? (enemies || []).filter((e) => !e.dead && (isDungeonGuardian(e) || isCrossingGuardian(e))) : [];
  const clear = (x, y) => guards.every((e) => Math.hypot(e.x - x, e.y - y) >= ARRIVAL.clear);
  const inside = Number.isFinite(at.x) && Number.isFinite(at.y) && at.x >= 0 && at.y >= 0 && at.x <= width - 1 && at.y <= height - 1;
  if (inside && footprintOpen(map, width, at.x, at.y) && onFloor.has(Math.round(at.y) * width + Math.round(at.x)) && clear(at.x, at.y)) return null;
  let best = null, wide = null;
  for (const [x, y] of floor) {
    const d = Math.hypot(x - (Number.isFinite(at.x) ? at.x : start.x), y - (Number.isFinite(at.y) ? at.y : start.y));
    if (clear(x, y)) { if (!best || d < best.d) best = { x, y, d }; }
    else { const gap = Math.min(...guards.map((e) => Math.hypot(e.x - x, e.y - y))); if (!wide || gap > wide.gap) wide = { x, y, gap }; }
  }
  const to = best || wide; return to && { x: to.x, y: to.y }; // nowhere clear enough: the farthest spot from every guardian
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
  staggerGovernor(e, dt); // release 377: bosses and elites cannot be stagger-locked
  // Release 561: a blow during a windup holds it (WINDUP_STAGGER.max s per attack at most); then the attack lands.
  if (e.hitStun > 0 && e.telegraph > 0 && !windupHeld(e, e.windupStagger ||= {}, dt)) { /* shrugged off: the windup runs on */ }
  else if (e.hitStun > 0) {
    if (!(e.telegraph > 0)) { e.meleePhase = null; e.threatRange = null; }
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
      e.windupStagger = null; // release 561: the next windup may be held again
      const pattern=e.meleePhase&&MELEE_PATTERNS[e.meleePhase.id], geometry=pattern?enemyMeleeGeometry(e):null;
      e.strikeGeometry = geometry;
      if(pattern?.dash){const aim=e.meleePhase.aim||projectileDirection(player.x-e.x,player.y-e.y),lateral=e.meleePhase.stage===1?{x:-aim.y,y:aim.x}:{x:0,y:0},distance=pattern.dash,dx=(aim.x+lateral.x*.65)*distance,dy=(aim.y+lateral.y*.65)*distance,steps=Math.ceil(Math.hypot(dx,dy)*5);for(let i=0;i<steps;i++)if(!moveAxis(e,dx/steps,dy/steps,map,width))break;if(pattern.stages===2&&e.meleePhase.stage===0){e.meleePhase.stage=1;e.telegraph=.42;e.threatRange=1.9;return false}}
      e.cooldown = (pattern?.recovery|| (e.kind==='voidSentinel'?.82:e.kind==='cinderWisp'?1.35:1.9))*(e.attackCooldownScale||1)*(bossPaced(e)?BOSS_PACE.cooldown:1); // release 421
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
    {const phase=(e.boss&&e.hp<=e.maxHp*.5) ? .82 : 1,ids=e.meleePatterns||[],id=e.tentacles&&e.range>=2.5&&toPlayer<=2.8?'longReach':e.range<2.5&&ids.length?ids[e.meleePatternIndex++%ids.length]:null,pattern=id&&MELEE_PATTERNS[id];e.telegraph = Math.max(.48,e.minimumAttackWindup||0,(pattern?.telegraph||enemyPatternWindup(e))*(e.telegraphScale||1)*phase)*(bossPaced(e)?BOSS_PACE.windup:1);/* release 421 */if(!pattern&&e.range>=2.5&&!e.instantStrike)e.telegraph=Math.max(e.telegraph,enemyPatternWindup(e));e.attackAim=projectileDirection(player.x-e.x,player.y-e.y);if(pattern){e.meleePhase={id,stage:0,aim:{...e.attackAim},target:{x:player.x,y:player.y}};e.threatRange=pattern.range}}
  return false;
}
export function shouldSimulateEnemy(e,player,area="overworld"){
  if(!e||e.dead)return false;
  if(area==="dungeon"){if(e.gatePredator||e.mireSeep)return true;/* release 303: seeplings crawl home from anywhere *//* release 271: a Revenant stalks and hunts from anywhere in the dungeon */if(e.worldBeast&&(e.aggro||isDungeonHunter(e,area)))return true;/* release 249: hunters patrol and finish their retreat even out of sight */const d=Math.hypot(e.x-player.x,e.y-player.y);return d<=(e.aggro?18:e.boss||e.eliteId?14:10)||e.telegraph>0||e.strike>0||e.eliteWindup>0||e.eliteActive>0}
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
// Release 445 (Tim: "the character needs to jump when you actually press the button, not like a second later"): a jump
// lasts JUMP.base ms plus JUMP.quickening per Quickening rank. The arc rises from the press itself, as fast as the
// plain leap's rise; Quickening's extra time is hang time at the top, and the robot's boost holds it there too. jumpLift
// gives the lift as a share of a tile (0..JUMP.arc).
export const JUMP = { base: 520, quickening: 140, arc: .42 };
export function jumpLift(g, now) {
  const until = g?.jumpUntil || 0; if (!(now < until)) return 0;
  if (g.mechBoosting) return JUMP.arc;
  const dur = Math.max(1, g.jumpDur || JUMP.base), start = Number.isFinite(g.jumpStart) && g.jumpStart <= now ? g.jumpStart : until - dur;
  const phase = Math.max(0, Math.min(.5, (now - start) / JUMP.base, (until - now) / JUMP.base));
  return Math.sin(phase * Math.PI) * JUMP.arc;
}
export class Game {
  constructor(save, now = 0) {
    this.save = save;
    this.performanceStats={totalDungeonEncounterRecords:0,activeEnemies:0,dormantEnemies:0,activeProjectiles:0,activeHazardsAndEffects:0,pathfindingWork:0,encounterActivations:0,peakActiveEnemies:0,updateBudgetViolations:0,ambientTicks:0};
    ensureEliteState(save);
    ensureCorridorSystems(save);
    { const given = grantBrawlerGear(save); if (given.length) this.message = `In your pack: ${given.join(", ")}. The Iron Fists are a weapon (Attack); Hammerfall and Great Sweep are tools.`; } if (giftResonances(save).length) this.glyphNotice = "Every resonance is now written in your codex (Glyphs)."; /* release 527 */ // release 489; 493
    if (!["attack", "tool", "act", "build"].includes(save.aimMode))
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
    this.jumpUntil = now + s.playerRuntime.jump; this.jumpStart = undefined;
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
          : this.meleeAimAt(profile.range, width); // release 469: a foe in reach first; the lock wins only within reach
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
      updateTraps(this.map.objects, this.player, dt, now < this.jumpUntil, this.save.maxHp, this.save.level);
      if (this.area === "dungeon") tickNewTraps(this.map.objects, { player: this.player, level: this.save.level, maxHp: this.save.maxHp, airborne: now < (this.jumpUntil || 0) || this.mechBoosting === true || (this.save.magicSkills?.active?.id === 'aerial-step' && this.save.magicSkills.active.remaining > 0) /* release 527 */, pull: (dx, dy) => moveAxis(this.player, dx, dy, this.map, mapWidth(this.map, this.area)), fall: () => { if (this.player.hp > 0 && now > (this.player.invulnerableUntil || 0)) { this.player.hp = 0; this.message = "The floor gives way, and the Wayfarer falls into the dark."; } }, now, projectiles: this.projectiles, effects: this.effects, seeds: (this.trapSeeds ||= []), open: (x, y) => { const w = mapWidth(this.map, this.area), q = this.map.tiles[Math.floor(y) * w + Math.floor(x)]; return !!q && !q.blocked && !(this.map.tiles.length && Math.floor(x) >= w); } }, dt); // release 523
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
      this.movingNow = n > 0.04; // release 365: a Shadow Clone falls in behind a moving Wayfarer
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
          this.map.entry,
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
          if (e.farArrayBoss || e.worldBeast === "voidWalker" && e.retreating) continue; // A crossing retreat carries its existing health; never rebirth/retune it on a fresh section.
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
            this.map.entry,
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
          if (e.farArrayBoss || e.worldBeast === "voidWalker" && e.retreating) continue; // A crossing retreat carries its existing health; never rebirth/retune it on a fresh section.
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
      this.applyBeastWounds();
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
        this.settleArrival(); // release 439
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
        this.player.x = this.map.entry?.x ?? 4;
        this.player.y = this.map.entry?.y ?? 5;
        this.settleArrival(); // release 439 (Tim: "it's still starting me in random places"): the annex's fixed landing could lie outside its floor
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
          this.map.entry,
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
    for(const e of this.enemies)this.syncAstralClone(e);
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
      enemies: this.enemies.filter((e) => !e.blobRemnant).map((e) => ({ ...e, ...(e.astralMount ? { astralMount: { ...e.astralMount } } : {}), ai: { ...ensureAI(e) } })), // release 259: the Blob's remnant is never saved
      objects,
      projectiles: this.projectiles.map((p) => ({ ...p })),
      effects: this.effects.map((f) => ({ ...f, hits: { ...f.hits } })),
      eliteHazards:this.eliteHazards.map(h=>({...h,hits:{...h.hits}})),
    };
  }
  // Release 419: lands the Wayfarer soundly on the dungeon floor after any arrival (settleDungeonArrival).
  settleArrival(guardians=true){if(this.area!=="dungeon"||!this.map?.tiles?.length)return false;const to=settleDungeonArrival(this.map,mapWidth(this.map,"dungeon"),this.player,this.enemies,guardians);if(to){this.player.x=to.x;this.player.y=to.y}this.updateDungeonDiscovery(true);return!!to}
  updateDungeonDiscovery(force=false){
    if(this.area!=="dungeon"||!this.map?.dungeonContract?.discoveryEnabled)return false;
    const chunk=dungeonChunkId(this.map,this.player.x,this.player.y);if(!force&&chunk===this._dungeonChunkId)return false;
    this._dungeonChunkId=chunk;const history=dungeonHistory(this.save,this.areaId()),prior=discoveryForLevel(history,this.map),next=revealDungeonAt(this.map,prior,this.player.x,this.player.y,0),changed=next.length!==prior.length||next.some((q,i)=>q!==prior[i]);
    if(changed)history.discovery.levels[this.map.levelStableId||this.map.levelId||"root"]=next;
    applyDungeonDiscovery(this.map,next,this.map._dungeonRevealMode||"normal");return changed;
  }
  loadArea(area, capture = true) {
    if (capture) this.snapshotArea();
    this.shadowClone = null; this.cloneAim = false; // release 365: a shadow stays in the place it was cast
    this.builds = []; // release 265: builds belong to the map they stand on
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
    if(area==="dungeon")addBell(this.map,this.save,this.areaId());/* release 431: the Seven Bells */if(area==="dungeon")addMargin(this.map,this.save,this.areaId());/* release 455: margins */if(area==="dungeon")addSurveyorLink(this.map,this.save,this.areaId());/* release 505: the Surveyor's Chain */if(area==="dungeon"){applyTunnels(this.map,this.save,this.areaStateId());this.map.wallGlints=wallGlints(this.map,this.save.seed,this.areaStateId(),this.save);} // release 225: dug tunnels and glinting walls
    if(area==="overworld"){const seen=this.save.atlas?.[`${this.rx},${this.ry}`];applyLandscape(this.map,this.save.seed,this.rx,this.ry,{explored:!!seen&&!seen.landscapeVersion,version:seen?.landscapeVersion||LANDSCAPE_VERSION,openSea:!seen?OPEN_SEA_VERSION:seen.seaVersion||0,buoy:!this.save.checkpoints?.[`${this.rx},${this.ry}`]||this.save.checkpoints[`${this.rx},${this.ry}`].name==="Lighthouse Buoy",hamlet:((!seen||!!seen.hamletVersion)&&(hamletSection(this.save.seed,this.rx,this.ry)||legacyMouthHamlet(this.save,this.rx,this.ry)||!!townAt(this.save,this.rx,this.ry)))||!!townAt(this.save,this.rx,this.ry)?.mouth});if(!seen||seen.dreamVersion)applyDream(this.map,this.save.seed,this.rx,this.ry,seen?.dreamVersion||DREAM_VERSION);if(!seen||seen.hamletVersion||townAt(this.save,this.rx,this.ry)?.mouth)applyHamlet(this.map,this.save.seed,this.rx,this.ry,seen?.hamletVersion||HAMLET_VERSION,!!townAt(this.save,this.rx,this.ry),legacyMouthHamlet(this.save,this.rx,this.ry));/* release 371: a town where a Listener fell; 373: around its Mouth, explored or not */if(!seen||seen.travelVersion)applyTrails(this.map,this.save.seed,this.rx,this.ry);this.seaHazards=this.map.openSea?seaHazards(this.save.seed,this.rx,this.ry,this.map):null;this.novaFog=null;this.seaIce=null;this.storm=null;this._stormCheck=0;const b=ensureBoatState(this.save),m=b.moored;if(b.owned&&!b.aboard&&m&&m.rx===this.rx&&m.ry===this.ry)this.map.objects.push({id:"skiff-moored",kind:"skiff",name:"Your skiff",lore:"Your skiff rides at its mooring.",x:m.x,y:m.y,state:"moored",actions:["board"]});this.placeSpareSkiff();const dive=diveSite(this.map,this.save.seed,this.rx,this.ry);if(dive)this.map.objects.push(dive)}
    if(area==="overworld"&&!this.map.settlement)applyTunnels(this.map,this.save,overworldDigKey(this.rx,this.ry),true); // release 423: tunnels dug in the open world
    if(area==="overworld"){const seen=this.save.atlas?.[`${this.rx},${this.ry}`];if(!seen||seen.watcherVersion)placeWatcherOverworld(this.map,mapWidth(this.map,area),this.save.seed,this.rx,this.ry);} // release 289: sections first seen from now on
    if(area==="overworld"||area==="dungeon")for(const o of this.map.objects||[])if(o.kind==="watcherTomb"&&this.save.worldFlags[`watcher-tomb:${o.id}`])o.state="opened";
    if(area==="dungeon")for(const o of this.map.objects||[])if(o.kind==="warpDais"&&this.save.worldFlags[`warp-dais:${this.areaId()}:${o.id}`])o.state="attuned"; // release 301
    if(area==="dungeon"&&this.map.arenaKind==="dive"&&this.map.lair&&!this.map.objects.some(o=>o.kind==="diveOnward")){const w=mapWidth(this.map,area),L=this.map.lair,spot=[[-3,0],[3,0],[-3,2],[3,2],[0,3],[-2,-2],[2,-2]].map(([dx,dy])=>({x:L.x+dx,y:L.y+dy})).find(q=>{const t=this.map.tiles[q.y*w+q.x];return t&&!t.blocked&&!this.map.objects.some(o=>o.x===q.x&&o.y===q.y)});if(spot)this.map.objects.push({id:`${this.areaId()}:onward`,kind:"diveOnward",name:"Deep current",x:spot.x,y:spot.y,state:"open",actions:["follow"]})} // release 311: a grotto's lair holds a current to the next buoy
    if(area==="overworld"){plantRefugeLands(this.map,this.rx,this.ry,this.refugeLandsWhere());for(const o of this.map.objects)if(o.talkKey)o.line=talkLine(o,this.refugeLandsWhere(),Number(this.save.worldFlags[o.talkKey])||0)} // release 265: the farm, the quarry and the farmer
    if(area==="dungeon"){const reader=addDungeonReciter(this.map,loadingId,this.save,mapWidth(this.map,area)),elder=addDungeonElder(this.map,loadingId,this.save,mapWidth(this.map,area));if(elder)this.message="Something tall and silent wanders these halls.";else if(reader)this.message=`${reader.name} wanders these halls, murmuring.`}
    if(area==="dungeon"&&isArrayRun(loadingId)&&ensureFarArray(this.save).activeRun?.id===loadingId){const run=this.save.farArray.activeRun,spawns=this.map.enemySpawns,multi=!!this.map.multiLevel,g=spawns.find(e=>e.dungeonRole==="finalBoss")||spawns.find(e=>e.dungeonRole==="gateWarden")||(multi?null:spawns.find(e=>e.boss)||spawns[spawns.length-1]);if(g){const boss=runBossSpawn(this.save,{x:g.x,y:g.y});if(boss){spawns.splice(spawns.indexOf(g),1);if(!spawns.some(e=>e.id===boss.id))spawns.push({...boss,objectiveId:g.objectiveId||null})}}if(!this.map.objects.some(o=>o.kind==="arrayPylon"))this.map.objects.push(...arrayPylons(this.map,`${loadingId}:${this.map.levelId||""}`,mapWidth(this.map,area)));this.map.name=runName(run,run.gate)}
    if(area==="dungeon"&&history?.relayNode){if(placeRelayNode(this.map,loadingId,this.save))ensureRelayNetwork(this.save).seen=true;}
    if(area==="dungeon"&&this.map.dungeonContract?.discoveryEnabled){const discovered=discoveryForLevel(history,this.map);applyDungeonDiscovery(this.map,discovered);this._dungeonChunkId=null;}
    if(area==='overworld'){
      const site=storySiteFor(this.save,this.rx,this.ry);if(site&&!this.map.objects.some(o=>o.id===site.id)){const open=this.map.tiles[site.y*32+site.x];if(!open?.blocked&&!open?.structure)this.map.objects.push(site)}
      const candidate=foundryEncounter(this.save.seed,this.rx,this.ry,this.save.worldGeneration);if(candidate&&validateFoundryCandidate(candidate).ok&&!this.save.worldFlags[`foundry-retired:${candidate.foundryId}`]){const open=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>4&&t.x<28&&t.y>4&&t.y<28);if(open.length){const at=open[hashSeed(candidate.foundryId)%open.length];candidate.x=at.x;candidate.y=at.y;this.map.enemySpawns.push(candidate)}}
      {const posted=refreshViewportBoard(this.save,this.rx,this.ry,{level:this.save.level,packKinds:PACK_KINDS.filter(k=>!MONSTER_PACK[k].unique&&!MONSTER_PACK[k].dungeonOnly).map(k=>({id:k,name:MONSTER_PACK[k].name})),avoid:(x,y)=>this.huntSiteAvoided(x,y)});if(posted.length)this.message=`Viewport: a new hunt is posted. ${posted[0].title}.`}
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
      // Release 467 (Codex audit F001): the cistern's pool is not laid where it would cut a guardian or an exit off from the
      // entry (it could seal a Mislaid Threshold's guardian away). Everywhere else it is laid as before.
      const w = mapWidth(this.map, area), cells = [[11, 4], [12, 4], [11, 5], [12, 5]].map(([x, y]) => y * w + x).filter((i) => this.map.tiles[i] && !this.map.tiles[i].blocked);
      const reach = (skip) => { const e = this.map.entry || { x: 4, y: 5 }, start = Math.round(e.y) * w + Math.round(e.x), seen = new Set([start]), q = [start], h = Math.floor(this.map.tiles.length / w); while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * w + nx; if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(j) || skip.has(j) || this.map.tiles[j]?.blocked) continue; seen.add(j); q.push(j); } } return seen; };
      const near = (seen, p) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (seen.has((Math.round(p.y) + dy) * w + Math.round(p.x) + dx)) return true; return false; };
      const vital = [...(this.map.enemySpawns || []).filter((q) => q.boss || GUARDIAN_ROLES.includes(q.dungeonRole)), ...(this.map.objects || []).filter((o) => o.kind === "exit")];
      const before = cells.length ? reach(new Set()) : null, after = cells.length ? reach(new Set(cells)) : null;
      if (cells.length && !vital.some((p) => near(before, p) && !near(after, p))) for (const i of cells) this.map.tiles[i] = { ...this.map.tiles[i], kind: "dungeonWater", blocked: true, waterDepth: "shallow" };
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
      if(guardian){history.guardianKind??=history.ladder?ladderGuardian(this.save.seed,packAreaId,history.ladder.tier,guardianKindFor(this.save.seed,packAreaId),GUARDIAN_POOL):guardianKindFor(this.save.seed,packAreaId);/* release 319 */guardian.kind=history.guardianKind;guardian.packGuardian=history.guardianKind!=="hollowMarshal"}
    }
    if(packAdopted&&this.map.encounterVersion&&this.map.monsterPack!==MONSTER_PACK_VERSION){this.map.enemySpawns=this.map.enemySpawns.filter(e=>!e.encounterSpawn);this.map.encounterVersion=0;this.map.encounterGroups=[]}
    if (area === "dungeon" && !this.map.deepDungeon && this.map.recipe !== "deep-v1" && !String(this.areaId()).includes("aperture-annex") && hashSeed(`${this.save.seed}:gate-predator:v1:${this.areaId()}`) % 1000 < (history.gatePredatorSpawnThreshold || GATE_REVENANT.legacySpawnPerThousand))
      this.map.enemySpawns.push({ kind: "gateRevenant", x: 18, y: 6, gatePredator: true });
    if(area==="dungeon"&&!this.map.arena&&!String(this.areaId()).startsWith("hunt-instance:")&&!String(this.areaId()).startsWith("elite-portal:")&&!String(this.areaId()).includes("aperture-annex"))populateDungeonEncounters(this.map,{deep:!!this.map.deepDungeon||this.map.recipe==="deep-v1",monsterPack:packAdopted});this.trapSeeds=[];if(area==="dungeon"&&!this.map.arena&&this.save.consequences?.dungeons?.[this.save.session.activeDungeonId]?.trapsVersion&&!this.map.objects?.some(o=>o.newTrap))addNewTraps(this.map,this.save.seed,this.areaId(),this.save.consequences.dungeons[this.save.session.activeDungeonId].trapsVersion);/* release 523: only crossings first generated from now on */
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
      const indoor = prior ? prior.indoorDungeonVersion : INDOOR_DUNGEON.version; if (indoor) placeDungeonIndoors(this.map, this.save.seed, this.rx, this.ry); // release 499: only sections first seen from now on
      if (this.map.dream && this.save.narrative?.facts && !this.save.narrative.facts["farSleep.entered"]) { this.save.narrative.facts["farSleep.entered"] = true; this.message = "The ground thins underfoot, and the night shows through. Somewhere, someone is dreaming this. Perhaps you."; } // release 305
      noteSectionVisit(this.save, key); // release 263: a section not among the last 8 different ones counts toward the buffer
      if (!prior) { atlas[key] = atlas[key] || {}; if (noteDiscovery(this.save)) this.message = "Word comes on the wind: around Ember Refuge, the groves and the quarry have grown back."; } // release 265: regrowth every 20 new sections
      // A section first seen now is pinned to the current landscape version; one explored earlier keeps none.
      atlas[key] = { terrain: this.map.dominant, ...(prior ? (prior.landscapeVersion ? { landscapeVersion: prior.landscapeVersion } : {}) : { landscapeVersion: LANDSCAPE_VERSION }),
        // Hamlets (release 111; version 2 at 112) follow the same rule: only sections first seen from now on can hold one.
        ...(prior ? (prior.hamletVersion ? { hamletVersion: prior.hamletVersion } : {}) : { hamletVersion: HAMLET_VERSION }),
        // Trails (release 115) likewise only appear in sections first seen from then on.
        ...(prior ? (prior.travelVersion ? { travelVersion: prior.travelVersion } : {}) : { travelVersion: TRAVEL_VERSION }),
        // Open seas (release 152): only sections first seen from now on run on across their borders.
        ...(prior ? (prior.seaVersion ? { seaVersion: prior.seaVersion } : {}) : { seaVersion: OPEN_SEA_VERSION }),
        // The Far Sleep's terrain (release 305) likewise: only sections first seen from now on.
        ...(prior ? (prior.dreamVersion ? { dreamVersion: prior.dreamVersion } : {}) : { dreamVersion: DREAM_VERSION }),
        // The Watcher's shrines and tombs (release 289) likewise.
        ...(prior ? (prior.watcherVersion ? { watcherVersion: prior.watcherVersion } : {}) : { watcherVersion: WATCHER.version }),
        ...(indoor ? { indoorDungeonVersion: indoor } : {}), // release 499: the dungeon entrance may stand inside a building
        color: sectionAtlasColor(this.map), // release 559: the Atlas shows the section as it really looks (atlas-colors.ts)
        ...(this.map.landscape?.biome ? { landscape: this.map.landscape.biome } : {}), sites: this.map.objects
        .filter((o) => ["diveSite","shipwright","checkpoint","dungeon","arenaEntrance","shrine","ruinMarker","shack","bossCue","architecturalDistrict","supplyCache","storyEcho","watcherTomb"].includes(o.kind)) // release 465: the Watcher's shrines
        .map((o) => ({ kind: o.kind, name: o.kind === "watcherTomb" ? (o.where === "shrine" ? "Watcher's Shrine" : "Watcher's Tomb") : o.name || (o.kind === "supplyCache" ? "Supply Cache" : o.kind), x: o.x, y: o.y })) };
    }
    if (area === "overworld") this.openWayglassApproach(); // release 467 (Codex audit F006)
    if(area==="overworld")populateOverworldPack(this.map,this.save.seed,this.rx,this.ry,{safe:settlementSanctuary(this.map,this.rx,this.ry,this.save)});
    if(area==="overworld"){const war=addSkirmish(this.map,this.save.seed,this.rx,this.ry,this.save);if(war)this.message=war.text;else if(this.map.settlement?.procedural)this.message=`${this.map.settlement.name} — a ${this.map.settlement.label.toLowerCase()} holds this ground.`}
    if(area==="overworld"&&arrayMouthAt(this.save,this.rx,this.ry)&&!this.map.objects.some(o=>o.kind==="arrayMouth")){const spots=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>10&&t.x<22&&t.y>10&&t.y<22).sort((a,b)=>Math.hypot(a.x-16,a.y-16)-Math.hypot(b.x-16,b.y-16));const at=spots[0]||{x:16,y:16};const quiet=ensureFarArray(this.save).quiet;this.map.objects.push({id:"array-mouth",kind:"arrayMouth",name:quiet?"The Quiet Mouth":"The Array Mouth",lore:quiet?"Nothing listens below it now, but the line still opens onto somewhere new each time.":"A ruined relay terminal, half sunk into ground no map has charted. Its line hums under your feet.",x:at.x,y:at.y,state:quiet?"quiet":"ready",actions:["enter"],landmark:true});this.message=quiet?`The Array Mouth is quiet: its runs go on, but the Listener is gone. ${quietMouthNote(this.save)}`:"The Array Mouth: the far end of the relay line."}
    if(area==="overworld"&&arrayMouthAt(this.save,this.rx,this.ry)&&daisDue(ensureFarArray(this.save))&&!this.map.objects.some(o=>o.kind==="listenerDais")){const m=this.map.objects.find(o=>o.kind==="arrayMouth"),w=mapWidth(this.map,area),free=(x,y)=>{const t=this.map.tiles[y*w+x];return t&&!t.blocked&&!t.structure&&!t.environment&&!this.map.objects.some(o=>Math.round(o.x)===x&&Math.round(o.y)===y)};let at=null;for(let r=2;r<6&&!at;r++)for(const[dx,dy]of[[0,r],[r,0],[-r,0],[0,-r],[r,r],[-r,r]])if(!at&&m&&free(Math.round(m.x)+dx,Math.round(m.y)+dy))at={x:Math.round(m.x)+dx,y:Math.round(m.y)+dy};if(at){this.map.objects.push({id:"listener-dais",kind:"listenerDais",name:"The Listener's Dais",lore:"The Gate is whole. The dais hums with the Listener's line: step on, and it carries you to the hall where it waits.",...at,state:"humming",actions:["enter"],landmark:true});this.message="The Gate is whole: a dais has risen beside the Mouth. It leads to the Listener."}} // release 375
    if(area==="overworld"&&silentMouthAt(this.save,this.rx,this.ry)&&!this.map.objects.some(o=>o.kind==="silentMouth")){const spots=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>10&&t.x<22&&t.y>10&&t.y<22).sort((a,b)=>Math.hypot(a.x-16,a.y-16)-Math.hypot(b.x-16,b.y-16));const at=spots[0]||{x:16,y:16};this.map.objects.push({id:"silent-mouth",kind:"silentMouth",name:"A Quiet Mouth",lore:"The Listener's old Mouth. Whatever waited here went deeper, but the line still opens onto somewhere new each time.",x:at.x,y:at.y,state:"quiet",actions:["enter"],landmark:true})} // release 357: an old Mouth stays; 361: still a door to a new run
    if(area==="overworld"&&townAt(this.save,this.rx,this.ry)?.mouth)this.raiseMouthTown(); // release 373 (after every Mouth, old ones too)
    if(area==="overworld"&&townAt(this.save,this.rx,this.ry))this.raiseTownAmenities(); // release 441
    if(area==="overworld")addSurveyorStatue(this.map,this.save,this.rx,this.ry); // release 551: Corwin's statue, once the chain is whole
    if(area==="overworld"){const band=addTravelers(this.map,this.save.seed,this.rx,this.ry),reader=addReciter(this.map,this.save.seed,this.rx,this.ry,this.save),quill=addWanderer(this.map,this.save,this.rx,this.ry),note=wandererArrive(this.save,this.map,this.rx,this.ry);const beast=questingBeastFor(this.save,this.map,this.rx,this.ry),elder=addElder(this.map,this.save,this.rx,this.ry),worldBeastFound=worldBeastFor(this.save,this.map,this.rx,this.ry),worldBeast=beast&&!worldBeastFound?.retreating?null:worldBeastFound;if(worldBeast){this.map.enemySpawns.push(worldBeast);const companion=astralCompanionFor(this.save,worldBeast,{rx:this.rx,ry:this.ry},this.map.enemySpawns.length);if(companion)this.map.enemySpawns.push(companion);const B=WORLD_BEASTS[worldBeast.worldBeast];this.message=worldBeast.retreating?`${B.name} is fleeing through here toward ${BEAST_HOMES[B.home].name}. It cannot be hurt now.`:`${B.arrive} ${worldBeastTriesLeft(this.save,worldBeast.worldBeast)} of ${B.tries} tries remain.`}/* release 241: a fleeing beast says so, and passes through the Questing Beast's ground too *//* release 235: world beasts */addStrange(this.map,this.save,this.rx,this.ry);/* release 215: a rare strange tree or stone */addDigSpot(this.map,this.save,this.rx,this.ry);/* release 225: a rare patch of disturbed earth */const ilse=addIlse(this.map,this.save,this.rx,this.ry,!!farSleepSection(this.rx,this.ry));/* release 415: Ilse the Lamplighter */for(const id of mouthsIn(this.save,this.rx,this.ry))placeMouth(this.map,id);/* release 217: second mouths of linked dungeons */if(beast){this.map.enemySpawns.push(beast);this.message=`The Questing Beast hunts here. ${questingBeastTriesLeft(this.save)} of ${QUESTING_BEAST.tries} tries remain.`}if(beast||worldBeast){}else if(ilse)this.message=ilse.stage===5?"A lamp burns in the meadow with no post beneath it.":"Someone is tending a lamp nearby.";else if(elder)this.message="Something tall and silent walks the road.";else if(note)this.message=note;else if(quill)this.message="A cartographer on a moss grazer is sketching the horizon.";else if(reader)this.message=`${reader.name} walks by, murmuring.`;else if(band&&!this.map.skirmish&&!this.map.settlement)this.message=`${band.title} on the road.`}
    this.activatedEncounterGroups=new Set;
    if(area==="dungeon"){const haunt=worldBeastForDungeon(this.save,this.map,this.areaId());if(haunt){this.map.enemySpawns.push(haunt);const companion=astralCompanionFor(this.save,haunt,{dungeon:this.areaId(),level:this.map.levelId||"root"},this.map.enemySpawns.length);if(companion)this.map.enemySpawns.push(companion);const B=WORLD_BEASTS[haunt.worldBeast];this.beastNote=haunt.retreating?`${B.name} is retreating ${haunt.worldBeast === "voidWalker" ? "toward the nearest reachable dungeon door" : haunt.worldBeast === "astralWorm" ? "toward the nearest reachable Wayglass" : "toward the water"}. It cannot be hurt now.`:`${B.arriveDungeon||B.arrive} ${worldBeastTriesLeft(this.save,haunt.worldBeast)} of ${B.tries} tries remain.`}} /* release 249: the Psychic Crystal haunts dungeons with water */
    if (area === "dungeon" && !this.map.enemySpawns.some((q) => q.extraSpawn)) for (const q of this.extraDungeonSpawns()) this.map.enemySpawns.push(q); // release 463: more foes
    if (area === "dungeon" && !this.map.enemySpawns.some((q) => q.marginWarden)) for (const w of wardenSpawns(this.save, this.map, this.areaId(), dungeonHistory(this.save, this.areaId()).wardensSlain || [])) this.map.enemySpawns.push(w); // release 459: Margin Wardens; 473: the slain stay slain
    if (area === "overworld") endMarginRun(this.save); // release 459: marginalia hold only inside the crossing
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
        if(area === "dungeon" && !merged.passiveBehavior && !merged.ambient && !merged.worldBeast && !merged.astralCompanionOf) tuneDungeonThreat(merged); // release 249: a world beast keeps its own tuning
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
      for(const saved of s.enemies||[])if((saved.gatePredator||saved.foundryId||saved.astralMountFixture)&&!saved.dead&&!this.enemies.some(e=>e.id===saved.id)){const restored={...saved,ai:{...saved.ai}};ensureAI(restored);if(restored.gatePredator){tuneGatePredator(restored,this.save,characterStats(this.save));resetGateAttack(restored, true)}this.enemies.push(restored)}
      for(const saved of s.enemies||[])if(saved.astralOwner&&!saved.dead&&this.enemies.length<32&&!this.enemies.some(e=>e.id===saved.id)){const owner=this.enemies.find(e=>e.id===saved.astralOwner&&!e.dead),clone=owner?.astral?.clones?.find(c=>c.id===saved.id&&c.hp>0);if(clone){const restored={...saved,hp:Math.min(saved.hp,clone.hp),noRewards:true,summonedBy:owner.id,ai:{...saved.ai}};delete restored.worldBeast;delete restored.questingBeast;ensureAI(restored);this.enemies.push(restored);}}
      for (const o of this.map.objects)
        if (s.objects?.[o.id]) Object.assign(o, s.objects[o.id]);
      applyFallenTreeCrossings(this.map);
      if (area === "overworld" && regrowSection(this.save, this.map, this.rx, this.ry, this.refugeLandsWhere())) this.message = "The felled trees and worked stone here have grown back."; // release 265
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
    const ar=this.save.worldBeasts?.astralWorm?.active?.astralRetreat;
    if(ar&&astralRetreatSceneMatches(ar.scenes?.[ar.sceneKey],this)){const carried=astralRetreatSpawn(this.save.worldBeasts.astralWorm.active);if(carried){const existing=this.enemies.find(e=>e.worldBeast==='astralWorm');if(existing)Object.assign(existing,carried);else this.enemies.push(carried);ensureAI(existing||carried);}}
    this._walkerRoutes = new WeakMap(); this._walkerLandingGraph = null;
    const areaWidth = mapWidth(this.map, area),
      playerRelocated = !(area === "overworld" && aboard(this.save) && footprintSailable(this.map, areaWidth, this.player.x, this.player.y)) && relocateIfStranded(this.player, this.map, areaWidth);
    if (area === "dungeon") { const to = settleDungeonArrival(this.map, areaWidth, this.player, this.enemies, false); if (to) { this.player.x = to.x; this.player.y = to.y; } } // release 419: a resumed or loaded floor never leaves you in a sealed pocket
    for (const e of this.enemies) {
      refreshMarineBeast(e, this.map, areaWidth, area);
      if (this.astralRiderHeld(e) || e.kind === "astralWorm" || e.kind === "astralMirage") {
        // Explicit fixture snapshots retain supported above-water positions exactly.
        continue;
      } else if (isDungeonRoamer(e, area)) {
        // Walls, water and isolated pockets are valid saved flight positions. Only repair invalid map bounds.
        e.x = Math.max(0, Math.min(areaWidth - 1, Number.isFinite(e.x) ? e.x : this.map.entry?.x ?? 4));
        e.y = Math.max(0, Math.min(mapHeight(this.map, area) - 1, Number.isFinite(e.y) ? e.y : this.map.entry?.y ?? 5));
        // Release 259: never left beyond the dungeon's edge; it comes back to the nearest place it may be.
        const ok = !e.retreating && this.roamerBounds(); if (ok && ok[Math.round(e.y) * areaWidth + Math.round(e.x)] !== 1) { let best = null, bd = Infinity; for (let i = 0; i < ok.length; i++) if (ok[i]) { const d = Math.hypot(i % areaWidth - e.x, Math.floor(i / areaWidth) - e.y); if (d < bd) { bd = d; best = i; } } if (best != null) { e.x = best % areaWidth; e.y = Math.floor(best / areaWidth); } }
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
      } else if (e._marineTraversal) {
        // A valid ocean/shore position is exact-resume state, including a disconnected unfinished retreat.
        const open = (x, y) => e.kind === "voidWalker" ? walkerGroundPositionOpen(this.map, areaWidth, x, y, true) : footprintOpen(this.map, areaWidth, x, y, !!e.flying, true);
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !open(e.x, e.y)) {
          const candidates = this.map.tiles.filter(t => open(t.x, t.y));
          candidates.sort((a, b) => Math.hypot(a.x - (Number.isFinite(e.x) ? e.x : 0), a.y - (Number.isFinite(e.y) ? e.y : 0)) - Math.hypot(b.x - (Number.isFinite(e.x) ? e.x : 0), b.y - (Number.isFinite(e.y) ? e.y : 0)));
          if (candidates.length) { e.x = candidates[0].x; e.y = candidates[0].y; }
        }
      } else if (!e.seaKind) relocateIfStranded(e, this.map, areaWidth);
      refreshMarineBeast(e, this.map, areaWidth, area);
    }
    if (playerRelocated)
      this.message =
        "The changed Corridor settles you onto the nearest stable ground. Your progress and carried items remain intact.";
    if (area === 'dungeon' && !this.map.arena && !this.save.session.activeDisplacement && !String(loadingId).startsWith('hunt-')) this.prepareDungeonCompletion();
    if (area === 'dungeon' && this.save.session.activeDisplacement) { const h = dungeonHistory(this.save, this.areaId()); if (!h.thresholdOpen) { const fell = this.enemies.find((e) => e.dead && !e.worldBeast && !e.questingBeast && (e.boss || isCrossingGuardian(e)) && (e.boss || !this.enemies.some((q) => !q.dead && isCrossingGuardian(q)))); if (fell) { h.thresholdOpen = true; h.thresholdDoor = { x: Math.round(fell.x), y: Math.round(fell.y) }; } } this.raiseThresholdDoor(); } // release 451: also for a guardian felled before this release
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
    this.hordeTimer = 0; if (area === "dungeon") this.applyHorde(); // release 269: a horde dungeon holds only its Revenants
    this.mireTimer = 0; this.mirePool = 0;
    if (area !== "dungeon" || this.clockArea !== "dungeon") this.dungeonClock = 0; this.clockArea = area; // release 271: Revenants hunt after GATE_REVENANT.huntAfter s in a dungeon
  }
  // Release 269: the Gate Revenant horde (revenant-horde.ts). In a horde dungeon every other creature is gone, and up to
  // HORDE.active Revenants stand at once, drawn from the dungeon's remaining count.
  hordeHere() { if (this.area !== "dungeon") return null; const id = this.save.session.activeDungeonId, h = id && this.save.consequences?.dungeons?.[id]; return h?.horde ? { id, history: h, horde: ensureHorde(h) } : null; }
  applyHorde() {
    const here = this.hordeHere(); if (!here) return;
    this.enemies = this.enemies.filter((e) => e.hordeOf === here.id && !e.dead); this.map.enemySpawns = [];
    // The Wayfarer is placed on map.entry only after loadArea, so the reachable floor is read from there (review note).
    const entry = this.map.entry || { x: 4, y: 5 }, p = this.player, was = { x: p.x, y: p.y }; Object.assign(p, { x: entry.x, y: entry.y });
    const reach = this.playerFloor(); Object.assign(p, was);
    this.hordePoints = hordeSpawnPoints(this.map, entry, 6, reach);
    while (this.enemies.length < Math.min(HORDE.active, here.horde.left)) if (!this.spawnHordeRevenant(here.id)) break;
  }
  spawnHordeRevenant(id) {
    const pts = this.hordePoints || [], p = this.player, at = [...pts].sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y)).find((q) => !this.enemies.some((e) => !e.dead && Math.hypot(e.x - q.x, e.y - q.y) < 2)) || pts[0];
    if (!at) return null;
    const e = this.createEnemyFromSpawn({ id: `horde-${id}-${(this.hordeSeq = (this.hordeSeq || 0) + 1)}`, kind: "gateRevenant", x: at.x, y: at.y, gatePredator: true });
    e.hordeOf = id; this.enemies.push(e); return e;
  }
  // Release 303: the Poison Crypt (underlands.ts MIRE_CRYPT). Until the Wayfarer finds the Heart's lair, the Heart holds
  // still in it and the seep pools send out seeplings, which grow while they crawl home and, if they get there, swell it.
  mireHere() { if (this.area !== "dungeon" || !this.map?.mireLair) return null; const id = this.save.session.activeDungeonId, h = id && this.save.consequences?.dungeons?.[id]; return h?.mire ? { id, history: h, state: h.mire } : null; }
  tickMire(dt, now) {
    const here = this.mireHere(); if (!here) return;
    const M = MIRE_CRYPT, st = here.state, lair = this.map.mireLair, p = this.player, heart = this.enemies.find((e) => e.mireHeart && !e.dead), es = ensureEliteState(this.save).status;
    if (!st.found && Math.hypot(p.x - lair.x, p.y - lair.y) <= lair.radius + 1) { st.found = true; this.message = "The mire heaves. The pools go still, and something vast gathers itself in the dark water."; }
    if (heart && !st.found) { heart.x = lair.x; heart.y = lair.y; heart.aggro = false; } // it waits in its lair until found
    const seeps = this.enemies.filter((e) => e.mireSeep && !e.dead);
    for (const e of this.enemies) if (e.mireSeep && e.merged && !e.mireCounted) { e.mireCounted = true; st.merged = (Number(st.merged) || 0) + 1; if (heart) { const add = Math.round(heart.maxHp * M.mergeHp); heart.maxHp += add; heart.hp = Math.min(heart.maxHp, heart.hp + add); } }
    for (const e of seeps) { // they grow as they crawl; touching one burns
      if (e.blobletOf) e.aggro = true; // their homing runs in the pack brain's active branch
      e.seepAge = (e.seepAge || 0) + dt; const g = 1 + Math.min(M.seepGrowMax, e.seepAge / M.seepGrow), base = e.seepBase || (e.seepBase = { hp: e.maxHp, scale: e.scale || 1 });
      const maxHp = Math.round(base.hp * g); if (maxHp > e.maxHp) { e.hp += maxHp - e.maxHp; e.maxHp = maxHp; } e.scale = base.scale * (.8 + .4 * g);
      if (Math.hypot(e.x - p.x, e.y - p.y) < .45 + .25 * g && now > (e.seepBiteAt || 0) && now > (p.invulnerableUntil || 0) && now >= (p.dodgeUntil || 0)) { e.seepBiteAt = now + M.contactEvery * 1000; p.hp -= Math.round(M.contact * g); p.invulnerableUntil = now + 350; applyPoison(es, M.poison[0], M.poison[1]); }
    }
    for (const t of this.map.objects) if (t.kind === "trap" && t.gas) { if (t.hits?.player && !t.gassed) { t.gassed = true; applyPoison(es, M.poison[0], M.poison[1]); } if (t.phase === "armed") t.gassed = false; } // the jets poison too
    if (st.found || !heart || !this.map.seepPools?.length || seeps.length >= M.seepMax) { this.mireTimer = 0; return; }
    this.mireTimer = (this.mireTimer || 0) + dt; if (this.mireTimer < M.seepEvery) return;
    this.mireTimer = 0; const pools = this.map.seepPools, q = pools[(this.mirePool = ((this.mirePool || 0) + 1)) % pools.length];
    const e = this.createEnemyFromSpawn({ id: `seep-${here.id}-${(this.seepSeq = (this.seepSeq || 0) + 1)}`, kind: "bloblet", x: q.x, y: q.y });
    Object.assign(e, { mireSeep: true, aggro: true, blobletOf: heart.id, bornAt: now, wanderAngle: (this.seepSeq * 2.4) % 6.28, maxHp: M.seepHp, hp: M.seepHp }); this.enemies.push(e);
    if (!st.seeped) { st.seeped = true; this.message = "A pool of the mire bubbles, and something crawls out of it toward the dark."; }
  }
  tickHorde(dt) {
    const here = this.hordeHere(); if (!here) return;
    const alive = this.enemies.filter((e) => e.hordeOf === here.id && !e.dead).length;
    if (alive >= Math.min(HORDE.active, here.horde.left)) { this.hordeTimer = 0; return; }
    this.hordeTimer = (this.hordeTimer || 0) + dt; if (this.hordeTimer < HORDE.respawn) return;
    this.hordeTimer = 0; if (this.spawnHordeRevenant(here.id)) this.message = "Another Gate Revenant tears through the crossing.";
  }
  recoverPosition() {
    // Match load-time exact resume: pausing aboard a valid skiff must not relocate its sailor onto land.
    if (this.area === "overworld" && aboard(this.save) && footprintSailable(this.map, mapWidth(this.map, this.area), this.player.x, this.player.y)) return false;
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
        "stunnedUntil",
        "stunnedAt",
        "shockAt",
        "echoVoidReadyAt",
      ])
        if (this.player[k]) this.player[k] += d;
      if (this.jumpUntil) this.jumpUntil += d;
      if (this.jumpStart) this.jumpStart += d;
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
  glyphLoadout(host, spellId = null) {
    const l = hostLoadout(this.save, host, spellId), fresh = discoverResonances(this.save, l);
    if (fresh.length) { const r = resonanceInfo(fresh[0]); this.glyphNotice = `${r.pair.length === 3 ? "Triad" : "Resonance"} discovered: ${r.name}. ${r.text}`; } // release 529: triads too
    return l;
  }
  // Release 481 (Tim: "the passive that leaves... an explosion every time I Dodge... does that get increased by... spell damage
  // increase... I would like to... increase the radius... if it hits one enemy, it explodes around that enemy"): the dodge
  // bursts (Ember Wake, Afterimage) now grow with spell damage: the flat magic bonus is added and the spell damage
  // multipliers (Pairing, armor glyphs, meals, marginalia, empowered robot) applied. Volatile in the armor widens them
  // (burstRadius); Chain in the armor makes the first foe a burst hits erupt again (burstChain of the damage,
  // DODGE_BURST.chainRadius of the radius). Returns the damage dealt per foe.
  dodgeBurst(x, y, radius, base, now = this.lastUpdateNow || 0) {
    const ag = armorGlyphBonus(this.save), amount = Math.max(1, Math.round((base + (Number(characterStats(this.save).magicBonus) || 0)) * (1 + pairingMods(this.save).spellDamage) * (1 + (ag.spellDamage || 0)))), r = radius * (1 + (ag.burstRadius || 0)), w = this.glyphWorld(now);
    const first = this.enemies.filter((e) => !e.dead && !e.untargetable && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= r + .2).sort((a, b) => Math.hypot(a.x + .5 - x, a.y + .45 - y) - Math.hypot(b.x + .5 - x, b.y + .45 - y))[0];
    w.blast(x, y, r, amount);
    if (first && ag.burstChain > 0) w.blast(first.x + .5, first.y + .45, r * DODGE_BURST.chainRadius, Math.max(1, Math.round(amount * ag.burstChain)));
    return amount;
  }
  elevationHere(x, y) { return elevationAt(this.map, mapWidth(this.map, this.area), x, y); }
  glyphWorld(now) {
    const game = this, p = this.player;
    return {
      now, enemies: this.enemies, maxHp: game.save.maxHp,
      damage(e, amount) { if (e.dead) return; alertEnemy(e); const before = Math.max(0,e.hp); e.hp -= Math.round(amount * strikeAmplifier(game.save)); game.astralPlayerHit(e, Math.max(0,before-Math.max(0,e.hp))); e.hitFlash = .18; if (e.hp <= 0) { e.dead = true; game.defeatEnemy(e); } },
      heal(amount) { game.glyphHealPool = (game.glyphHealPool || 0) + amount; const whole = Math.floor(game.glyphHealPool); if (whole > 0) { game.glyphHealPool -= whole; const before = p.hp; p.hp = Math.min(game.save.maxHp, p.hp + whole); if (p.hp > before) (game.glyphVisuals ||= []).push({ kind: "heal", x: p.x + .5, y: p.y - .1, amount: p.hp - before, life: .9, max: .9 }); } },
      stamina(amount) { p.stamina = Math.min(game.save.maxStamina, (p.stamina || 0) + amount); },
      blast(x, y, radius, amount) {
        (game.glyphVisuals ||= []).push({ kind: "burst", x, y, radius, life: .35, max: .35 });
        for (const e of game.enemies) if (!e.dead && !e.untargetable && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= radius + .2) this.damage(e, amount);
      },
      arc(from, to, color) { (game.glyphVisuals ||= []).push({ kind: "arc", x: from.x + .5, y: from.y + .45, tx: to.x + .5, ty: to.y + .45, color, life: .22, max: .22 }); },
      canStand(x, y) { const w = mapWidth(game.map, game.area); return footprintOpen(game.map, w, x, y) && !footprintHazard(game.map, w, x, y); },
      nudge(e, dx, dy) { if (game.astralRiderHeld(e)) return; const w = mapWidth(game.map, game.area); if (footprintOpen(game.map, w, e.x + dx, e.y + dy)) { e.x += dx; e.y += dy; } },
    };
  }
  tickGlyphs(dt, now) {
    const mountedHp = this.enemies.filter(e => e.astralOwner || e.astralMount?.status === "mounted").map(e => [e, Math.max(0,e.hp)]);
    tickGlyphStatus(this.enemies, dt, now, (e) => this.defeatEnemy(e));
    for (const [e, hp] of mountedHp) this.astralPlayerHit(e, Math.max(0,hp-Math.max(0,e.hp)));
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
    return this.travelToCheckpoint(this.save.checkpoints?.[homeKey(this.save)] ? homeKey(this.save) : "0,0"); // release 371: the chosen home
  }
  leaveDungeon(message = "You return to the dungeon entrance.") {
    const q = this.save.session.dungeonReturn || this.save.activeCheckpoint;
    if (!q) return false;
    const pursuers = this.enemies.filter((e) => e.gatePredator && e.aggro && !e.dead).slice(0, HORDE.active); // release 269: a horde's pursuers all follow
    for (const q of pursuers) q.dead = true;
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
    for (const [k, pursuer] of pursuers.entries()) {
      const e = { ...pursuer, id: `${pursuer.id}-breach-${this.rx}-${this.ry}`, dead: false, x: q.x + 1.2 + k * .8, y: q.y - .4 - k * .6, aggro: true, ai: { ...ensureAI(pursuer), homeX: q.x, homeY: q.y } };
      placeGatePursuer(e, this.player, this.map, mapWidth(this.map, this.area));
      resetGateAttack(e, true);
      this.enemies.push(e);
      message = pursuers.length > 1 ? `THE GATE REMAINS OPEN — ${pursuers.length} impossible things follow you into the Corridor.` : "THE GATE REMAINS OPEN — something impossible follows you into the Corridor.";
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
    p.hp = this.save.maxHp; // release 345 (Tim: "When you die, you don't lose anything"): carried wood is kept
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
      this.settleArrival(); // release 263: clear of guardians; 419: on the level's own floor
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
  // Release 259: once the crossing has held, each pursuing world beast comes over the edge behind the Wayfarer with its
  // wounds, unless this section is a settlement or another beast's ground already stands here; then it stays behind.
  worldBeastsFollow(hunters, fromArea, dx, dy) {
    for (const h of hunters) {
      if (this.map.settlement || this.enemies.some(e => (e.worldBeast || e.questingBeast) && !e.dead) || !canPursue(this.save, h.id, this.rx - dx, this.ry - dy, dx, dy)) continue;
      const spawn = pursuitSpawn(this.save, h.id, this.map, this.rx, this.ry, dx, dy); if (!spawn) continue;
      pursued(this.save, h.id, dx, dy);
      const e = this.createEnemyFromSpawn(spawn, "overworld"); if (h.maxHp > 0) { e.maxHp = h.maxHp; e.damage = h.damage; } e.hp = Math.max(1, Math.min(e.maxHp, Number(h.hp) || e.maxHp)); e.aggro = true; ensureAI(e).mode = "chase"; // the same creature, with its own vitals
      this.enemies.push(e);
      const left = this.save.session.areas[fromArea]; if (left?.enemies) this.save.session.areas[fromArea] = { ...left, enemies: left.enemies.filter(q => q.id !== h.actorId) }; // it is no longer back there (release 555: replaced, not edited, so the save sees the change)
      const B = WORLD_BEASTS[h.id], q = this.save.worldBeasts[h.id].active, more = (PURSUIT.limits[h.id] ?? PURSUIT.sections) - (q.chase || 0);
      this.message = `${B.name} follows you across.${more > 0 ? "" : " It will go no further."}`;
    }
  }
  // Release 353 (Tim: "it'll hunt you through different tiles, and you can run away and it can chase you. So it's health,
  // only resets when you die"): a world beast's wounds live on its hunt (save.worldBeasts[id].active.wounds, the share of
  // health it has left), so whichever way it is loaded again (left behind, followed, reloaded) it comes back as hurt as it
  // was. Only the end of the hunt clears them (release 427: a death no longer heals it).
  applyBeastWounds() {
    for (const e of this.enemies) {
      const f = Number(this.save.worldBeasts?.[e.worldBeast]?.active?.wounds);
      if (!e.worldBeast || e.dead || e.retreating || !(f > 0 && f < 1)) continue;
      e.hp = Math.min(e.hp, Math.max(1, Math.round(e.maxHp * f)));
    }
  }
  transitionSection(dx, dy) {
    const from = { rx: this.rx, ry: this.ry, x: this.player.x, y: this.player.y }, wade = this.wading();
    const pursuers=this.enemies.filter(e=>e.gatePredator&&e.aggro&&!e.dead).map(e=>({...e,ai:{...ensureAI(e)}}));
    // Release 259: a fighting world beast may follow the Wayfarer over the edge (world-beasts.ts PURSUIT).
    const fromArea = this.areaStateId(), hunters = this.enemies.filter(e => e.worldBeast && e.aggro && !e.dead && !e.retreating && !e.astralCompanionOf && canPursue(this.save, e.worldBeast, this.rx, this.ry, dx, dy)).map(e => ({ id: e.worldBeast, actorId: e.id, hp: e.hp, maxHp: e.maxHp, damage: e.damage }));
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
    // Release 507: the robot wading keeps its place along the edge when water or open ground meets it there.
    if (wade) { const p = this.player, at = dx ? { x: p.x, y: Math.max(.25, Math.min(30.75, from.y)) } : { x: Math.max(.25, Math.min(30.75, from.x)), y: p.y }, h = footprintHazard(this.map, 32, at.x, at.y); if (h ? this.swimsHere(h) : footprintOpen(this.map, 32, at.x, at.y)) { p.x = at.x; p.y = at.y; } }
    // Open seas (release 152): a skiff crosses wherever the water runs on; a walker cannot step out into open sea.
    if (aboard(this.save)) { if (!this.sailAcross(dx, dy, from)) return false; }
    else if (DEEP_WATER.includes(footprintHazard(this.map, 32, this.player.x, this.player.y)) && !canSwim(this.save) && !this.mechUp()) { this.returnFrom(from, "Open sea lies beyond. You need a boat to cross it."); return false; }
    this.worldBeastsFollow(hunters, fromArea, dx, dy);
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
  // Where the Viewport may not send a hunt (release 557: shared by new postings and hunts moved off explored ground).
  huntSiteAvoided(x, y) { return (x === 0 && y === 0) || hamletSection(this.save.seed, x, y) || this.seaBound(x, y) || (x === 4 && y === -2) || (x === -5 && y === 3); }
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
  // The nearest Wayglass or relay within WAYGLASS_ZONE.reach that can be used, or null.
  wayglassNear() {
    if (this.area !== "overworld") return null;
    let f = null, d = WAYGLASS_ZONE.reach;
    for (const o of this.map.objects || []) { if (!WAYGLASS_ZONE.kinds.includes(o.kind)) continue; const n = Math.hypot(o.x - this.player.x, o.y - this.player.y); if (n < d && validActions(o, this.save).length) { f = o; d = n; } }
    return f;
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
  // Release 289 (Tim: "they could also be teleportation traps... in a dungeon... or in a shack... teleporting you somewhere
  // in the map or... a new location"): a pristine Watcher's tomb, touched once, folds the Wayfarer away. Above ground it is
  // the shelter Folded Seam's displacement (a pocket crossing, then a section 8-14 away); below, a far corner of the dungeon.
  touchWatcherTomb(o){
    const key=`watcher-tomb:${o.id}`;if(this.save.worldFlags[key]||o.state==="opened"){this.message="The tomb's lid lies still. The eye is closed.";return{ok:false,message:this.message};}
    if(this.area==="overworld"){this.save.worldFlags[key]=true;o.state="opened";journalOnce(this.save,"watcher-tomb","A pristine tomb bore the Watcher's sigil, bright and haloed. Touched, it folded the corridor: the eye closed, and still it saw, and you were elsewhere.","The Watcher");this.startDisplacement(o,false);this.message="The eye in the lid opens. The corridor folds, and you are carried through it.";return{ok:true,message:this.message};}
    if(this.area==="dungeon"){const width=mapWidth(this.map,this.area),to=dungeonFoldTarget(this.playerFloor(),width,this.player,`${this.save.seed}:watcher-fold:v1:${o.id}`);if(!to){this.message="The sigil flickers, but there is nowhere here for it to carry you.";return{ok:false,message:this.message};}
      this.save.worldFlags[key]=true;o.state="opened";journalOnce(this.save,"watcher-tomb","A pristine tomb bore the Watcher's sigil, bright and haloed. Touched, it folded the corridor: the eye closed, and still it saw, and you were elsewhere.","The Watcher");
      this.player.x=to.x;this.player.y=to.y-.2;this.player.invulnerableUntil=Math.max(this.player.invulnerableUntil||0,(this.lastUpdateNow||0)+800);this.message="The eye in the lid opens. The halls fold, and you stand somewhere else in them.";this.sync();return{ok:true,message:this.message};}
    this.message="The sigil is still.";return{ok:false,message:this.message};
  }
  // Release 301 (Tim: "a teleportation system... you can't teleport to one place until you found the other... a dais that you
  // walk up to, that has that symbol on it"). The first touch attunes a dais; once both are attuned, either carries you to the other.
  useWarpDais(o){
    const flag=(id)=>`warp-dais:${this.areaId()}:${id}`,other=this.map.objects.find((q)=>q.id===o.pair);
    if(!this.save.worldFlags[flag(o.id)]){this.save.worldFlags[flag(o.id)]=true;o.state="attuned";
      this.message=other&&this.save.worldFlags[flag(other.id)]?"The sigil wakes, and far off its twin answers. Touch either dais to cross between them.":"The sigil on the dais wakes and looks for its twin. Somewhere in these halls there is another.";
      if(other&&this.save.worldFlags[flag(other.id)])journalOnce(this.save,"warp-dais","Two daises bearing the Watcher's sigil answered each other across a crossing. Stand on one and the halls fold to the other.","The Watcher");
      this.sync();return{ok:true,message:this.message};}
    if(!other||!this.save.worldFlags[flag(other.id)]){this.message="The sigil waits. Its twin has not been found.";return{ok:false,message:this.message};}
    const width=mapWidth(this.map,this.area),open=(x,y)=>{const t=this.map.tiles[y*width+x];return t&&!t.blocked&&!LETHAL_KINDS.has(t.kind)},spot=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>({x:other.x+dx,y:other.y+dy})).find((p)=>open(p.x,p.y))||{x:other.x,y:other.y};
    this.player.x=spot.x;this.player.y=spot.y-.2;this.player.invulnerableUntil=Math.max(this.player.invulnerableUntil||0,(this.lastUpdateNow||0)+800);
    (this.glyphVisuals||=[]).push({kind:"arc",x:o.x+.5,y:o.y+.45,tx:other.x+.5,ty:other.y+.45,color:"#d8c8ff",life:.4,max:.4});
    this.message="The eye opens. The halls fold, and you step off the other dais.";this.sync();return{ok:true,message:this.message};
  }
  startDisplacement(o,hidden=false){
    const key=`displacement-trigger:${this.rx},${this.ry}:${o.id}`;if(this.save.worldFlags[key])return false;this.save.worldFlags[key]=true;o.state='used';o.consumed=true;
    const h=hashSeed(this.save.seed+":displacement:"+this.rx+":"+this.ry+":"+o.id),distance=8+h%7,sign=h&1?1:-1,destination={rx:this.rx+(h&2?distance:Math.floor(distance/2))*sign,ry:this.ry+(h&2?Math.floor(distance/2):distance)*(h&4?1:-1)};
    this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDisplacement={id:"displacement:"+this.rx+":"+this.ry+":"+o.id,source:{...this.save.session.dungeonReturn},destination,hidden};this.save.session.activeDungeonId=this.save.session.activeDisplacement.id;const history=dungeonHistory(this.save,this.save.session.activeDungeonId);history.visits++;history.visitOpen=true;
    if(hidden){recordRevelationLead(this.save,'displacement',o.id);journalOnce(this.save,`hidden-displacement:${o.id}`,'A concealed Folded Seam displaced you only after you crossed fully inside a shelter. Triggered seams keep a faint scar; untouched shelters reveal nothing.','Shelter hazards');this.defeatNotice={title:'HIDDEN SEAM TRIGGERED',detail:'the shelter folds into an unknown crossing',kind:'discovery'}}
    this.loadArea("dungeon");this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;this.settleArrival();/* release 439 */this.message=hidden?'The floor opens without warning. Space folds around you.':'The threshold folds the room into somewhere else.';this.sync();return true;
  }
  interact(action, objectId = null) {
    this.sync();
    const o = objectId
      ? this.map.objects.find(
          (q) =>
            q.id === objectId &&
            Math.hypot(q.x - this.player.x, q.y - this.player.y) < 1.5,
        )
      : (this.wayglassNear() || this.nearestObject()); // release 557: the Wayglass first
    // Wood (release 119): with nothing else to act on, Act at deep water's edge builds a skiff from wood.
    if (!o && !objectId) { const d = this.digAhead(); if (d) return d; } // release 225: Act facing a dungeon wall digs
    if (!o && !objectId && this.shoreWater()) return this.buildSkiffHere();
    // Release 263 (Tim: "if I go to the edge of the water and hit action, I should be building a boat and getting on that
    // boat and moving"): at the water's edge a tree or rock beside you no longer takes the press when a skiff can be built.
    if (o && !objectId && SHORE_PASSIVE.includes(o.kind) && this.shoreWater() && canBuildSkiff(this.save)) return this.buildSkiffHere();
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
    // Release 361 (Tim: "I like the mouth being open as a random dungeon... it just gives you another dungeon each time"): a quiet
    // Mouth, and every old one, still opens a run; the Listener waits only at the current Mouth once it has moved.
    if(o.kind==='listeningStone')return{ok:true,message:this.message=o.lore}; // release 373
    if (o.cook && (!action || action === "speak")) { if (o.talkKey) { const n = (Number(this.save.worldFlags[o.talkKey]) || 0) + 1; this.save.worldFlags[o.talkKey] = n; o.line = talkLine(o, this.refugeLandsWhere(), n); } this.kitchenRequested = o.id; return { ok: true, kitchen: true, message: (this.message = `${o.name}${o.role ? ` (${o.role})` : ""}: “${o.line || "Sit down and eat."}”`) }; } // release 447: Act at a cook opens the kitchen
    if(o.kind==='townSmith'){this.smithyRequested=o.id;/* release 441: Act opens the forge (main.ts polls this, as for shops) */}if(o.kind==='townSmith')return{ok:true,smithy:true,message:this.message=`${o.name}: “Bring me what you carry. I can break it down, reforge it, cut it a socket, or make it a masterwork, as the Listeners fall.”`}; // release 395
    if(o.kind==='listenerDais'){ // release 375: to the Listening Hall
      const run=beginListenerArena(this.save,{rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y});if(!run)return{ok:false,message:this.message='The dais is still.'};
      this.save.session.dungeonReturn={...run.returnPoint};this.save.session.activeDungeonId=run.id;this.save.session.activeDungeonLevelId=null;pinDungeonLayout(this.save,run.id);const history=dungeonHistory(this.save,run.id);history.visits++;history.visitOpen=true;history.relayNode=false;
      this.loadArea('dungeon');this.player.x=this.map.entry.x;this.player.y=this.map.entry.y-1;this.settleArrival();/* release 439 */this.message="The dais folds the line shut behind you. The Listener's Hall: it is waiting.";this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==='arrayMouth'||o.kind==='silentMouth'){
      const run=beginArrayRun(this.save,{rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y},{noListener:o.kind==='silentMouth'});
      this.save.session.dungeonReturn={...run.returnPoint};this.save.session.activeDungeonId=run.id;this.save.session.activeDungeonLevelId=null;pinDungeonLayout(this.save,run.id);const preview=generatePinnedDungeon(this.save,run.id);if(preview.multiLevel)this.save.session.activeDungeonLevelId=preview.levels[0].id;const history=dungeonHistory(this.save,run.id);history.visits++;history.visitOpen=true;history.relayNode=false;
      this.loadArea('dungeon');this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;relocateIfStranded(this.player,this.map,mapWidth(this.map,'dungeon'));this.settleArrival();/* release 419 */this.message=run.listener?'The Gate stands whole. Somewhere below, the Listener waits.':this.save.farArray.quiet||o.kind==='silentMouth'?`The line pulls you under. The Listener is not here. ${quietMouthNote(this.save)}`:`The line pulls you under. Gate ${run.gate}: ${this.save.farArray.pieces}/${piecesNeeded(run.gate)} pieces.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==='huntInstance'){
      const instance=beginHuntInstance(this.save,o.huntId,{rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y});
      if(!instance)return{ok:false,message:this.message='The Held Aperture no longer admits a hunt.'};
      this.save.session.dungeonReturn={...instance.returnPoint};this.save.session.activeDungeonId=instance.id;const history=dungeonHistory(this.save,instance.id);history.visits++;history.visitOpen=true;this.loadArea('dungeon');this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;this.settleArrival();/* release 439 */this.message='Viewport closes the Held Aperture around the hunt. The exit remains behind you.';this.sync();return{ok:true,message:this.message};
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
      const progress=deepDungeonProgress(this.save,this.areaId());this.snapshotArea();this.save.session.activeDungeonLevelId=o.toLevelId;progress.currentLevelId=o.toLevelId;if(!progress.discoveredLevelIds.includes(o.toLevelId))progress.discoveredLevelIds.push(o.toLevelId);this.loadArea("dungeon",false);this.player.x=o.toX;this.player.y=o.toY;this.settleArrival();/* release 419 */this.projectiles=[];this.effects=[];this.message=`${this.map.levelName||o.toLevelId} reached.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==="deepShortcut"){
      const progress=deepDungeonProgress(this.save,this.areaId()),ready=progress.completedObjectiveIds.includes(o.unlockObjectiveId);if(!ready)return{ok:false,message:this.message=`${o.name} has no visible seam yet.`};if(!progress.openedShortcutIds.includes(o.id))progress.openedShortcutIds.push(o.id);applyDeepDungeonProgress(this.save,this.areaId(),this.map);this.defeatNotice={title:"SHORTCUT OPENED",detail:`${o.name} · a physical route returns toward the hub`,kind:"discovery"};this.message=`${o.name} opens. The concealed corridor now joins the explored floor.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==="deepPortal"){
      const progress=deepDungeonProgress(this.save,this.areaId()),ready=o.unlockOnCompletion?progress.completed:!o.unlockObjectiveId||progress.completedObjectiveIds.includes(o.unlockObjectiveId);if(!ready)return{ok:false,message:this.message=o.unlockOnCompletion?"The return lattice is silent while the final guardian lives.":"The return lattice has not awakened."};if(o.targetLevelId&&o.targetLevelId!==(this.map.levelId||"root")){this.snapshotArea();this.save.session.activeDungeonLevelId=o.targetLevelId;progress.currentLevelId=o.targetLevelId;if(!progress.discoveredLevelIds.includes(o.targetLevelId))progress.discoveredLevelIds.push(o.targetLevelId);this.loadArea("dungeon",false);}this.player.x=o.toX;this.player.y=o.toY;this.settleArrival();/* release 419 */this.projectiles=[];this.effects=[];this.message=o.unlockOnCompletion?"The final return lattice carries you back to the expedition hub.":"The return portal folds the cleared route back to the hub.";this.sync();return{ok:true,message:this.message};
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
      this.player.x = o.toX; this.player.y = o.toY; this.settleArrival(); /* release 419 */ this.projectiles = []; this.effects = []; this.traversal = null;
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
    if (o.kind === "diveSite" || o.kind === "diveExit" || o.kind === "diveOnward") return this.diveAction(o);
    // Diving (W5): the first island landmark inspected yields the Bathysal Lens.
    if (o.islandLandmark && grantLens(this.save, o.id)) {
      journalOnce(this.save, "bathysal-lens", "In the shrine's basin lay a Bathysal Lens: a disc of sea-glass that lets the eye see through deep water. With a dive rig from a Shipwright, the dive buoys can be followed down.", "The Bathysal Lens");
      this.message = `${o.name}: you find a Bathysal Lens. ${canDive(this.save) ? "With your rig, you can now dive at dive buoys." : "A Shipwright's dive rig would let you dive."}`;
      this.sync(); return { ok: true, message: this.message };
    }
    if (!action && ["npc", "dungeon", "shrine", "relayTerminal","relayNode","shelterMerchant","traveler","displacementDevice","elitePortal","viewport","townKeeper"].includes(o.kind)) {
      this.interactionRequested = o.id;
      return {
        ok: true,
        message: (this.message =
          (o.name || "Crossing") + " — choose an action."),
      };
    }
    // Release 215: touching a strange thing opens a Glimpse.
    if (o.kind === "digSpot" && (action || validActions(o, this.save)[0]) === "dig") { const c = ensureShovel(this.save); if (!c.ok) { this.message = c.message; return { ok: false, message: this.message }; } const r = digSpot(this.save, o, this.rx, this.ry); this.message = (c.crafted ? c.message + " " : "") + r.message; this.sync(); return r; }
    if (o.kind === "watcherTomb") return this.touchWatcherTomb(o); // release 289
    if (o.kind === "surveyorLink") { const r = takeSurveyorLink(this.save, o, this.areaId()); this.message = r.message; if (r.ok) journalOnce(this.save, `surveyor:${r.index}`, `Link ${r.total} of ${SURVEYOR.links}. "${r.note}"`, "The Surveyor's Chain"); if (r.ok && r.total >= SURVEYOR.links) { const at = surveyorStatueSection(this.save); this.message += ` On your Atlas the twelve crossings join into one chain, and it runs on to the edge of the Far Sleep, at ${at.rx}, ${at.ry}.`; journalOnce(this.save, "surveyor:map", `Laid end to end, the crossings where the links lay draw a chain across the Atlas. It runs on past the last of them to the edge of the Far Sleep, at ${at.rx}, ${at.ry}.`, "The Surveyor's Chain"); } this.sync(); return r; } // release 505; 551: the last map
    if (o.kind === "surveyorStatue") { const r = visitSurveyorStatue(this.save, o); this.message = r.message; if (r.first) journalOnce(this.save, "surveyor:statue", r.message, "The Surveyor's Chain"); this.sync(); return r; } // release 551
    if (o.kind === "marginNote") { const r = readMargin(this.save, o); this.message = r.message; if (r.ok) { const reading = READINGS[o.readingId], known = readingKnown(this.save, o.readingId), prog = bookProgress(this.save, o.readingId); if (r.first) { journalOnce(this.save, `margin:${o.readingId}:${o.margin}`, r.message, known ? `Margins · ${reading.name}` : "Margins"); this.message += known ? ` (A margin of ${reading.name}: ${prog.found} of ${prog.total} fragments.)` : " (A fragment of a book you have not heard yet.)"; } } this.sync(); return r; } // release 455
    if (o.kind === "crackedBell") { if (o.state === "rung") { this.message = `A rung bell. It hangs quiet, and a little warm.`; return { ok: true, message: this.message }; } const r = ringBell(this.save, o); this.message = r.message; if (r.first) { journalOnce(this.save, `bell:${o.bell}`, `A cracked bell rang for ${BELL_GLIMPSES[o.bell].who}. ${BELL_GLIMPSES[o.bell].lines.join(" ")}`, "The Seven Bells"); if (r.done) journalOnce(this.save, "bell:door", r.message.slice(r.message.indexOf("Seven figures")), "The Seven Bells"); } this.sync(); return r; } // release 431
    if (o.kind === "ilse") { const r = meetIlse(this.save, o); this.message = r.message; if (r.first) journalOnce(this.save, `ilse:${o.stage}`, `${o.name}: ${r.message}`, "Ilse, the Lamplighter"); return r; } // release 415
    if (o.kind === "warpDais") return this.useWarpDais(o); // release 301
    if (o.strange && (action || validActions(o, this.save)[0]) === "touch") { const r = touchStrange(this.save, o, this.rx, this.ry); this.message = r.message; if (r.ok) this.glimpseCue = "strange"; return r; }
    if ((action || validActions(o, this.save)[0]) === "enter" && entranceKind(o)) this.openEntrance(o); // release 319; 323: never sealed
    const chosen = action || validActions(o, this.save)[0],
      before = this.save.hp,
      r = applyInteraction(o, chosen, this.save, this.areaId(), this.area === "dungeon" ? { dungeonDepth: Math.max(0, (this.map?.multiLevel ? this.map.levels || [] : []).findIndex((q) => q.id === this.map.levelId)) } : {}); // release 287
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
    if (r.transition === "retrain") { syncCharacterStats(this.save); this.player.maxStamina = this.save.maxStamina; this.player.hp = Math.min(this.player.hp, this.save.maxHp); this.player.stamina = Math.min(this.player.stamina, this.save.maxStamina); this.sync(); } // release 347
    if (o.talkKey && chosen === "speak") { const n = (Number(this.save.worldFlags[o.talkKey]) || 0) + 1; this.save.worldFlags[o.talkKey] = n; o.line = talkLine(o, this.refugeLandsWhere(), n); } // release 265: the farmer and the quarry keeper have more to say each time
    if (o.kind === "tree" && chosen === "cut") { applyFallenTreeCrossings(this.map); const before = Number(this.save.materials?.wood) || 0, total = addWood(this.save, woodFor(o)), n = total - before; this.message = n > 0 ? `${this.message} +${n} wood (${total}${total >= WOOD.carry ? ", all you can carry" : ""}).` : `${this.message} You can carry no more wood (${WOOD.carry}).`; r.message = this.message; }
    if(r.transition==="elitePortal"){
      this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDungeonId=`elite-portal:${this.save.seed}:knife-choir`;const h=dungeonHistory(this.save,this.save.session.activeDungeonId);h.visits++;h.visitOpen=true;this.loadArea('dungeon');this.player.x=4;this.player.y=5;relocateIfStranded(this.player,this.map,mapWidth(this.map,'dungeon'));this.settleArrival();/* release 439 */
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
      const horde = rollHorde(this.save, this.save.session.activeDungeonId, h, h.ladder ? ladderRoll(this.save.seed, this.save.session.activeDungeonId, "horde", h.ladder.tier) : undefined); // release 269: decided on the first visit; 319: by the ladder
      h.visits++;
      h.visitOpen = true;
      this.loadArea("dungeon");
      if (horde?.left > 0) this.message = `The crossing is thick with Gate Revenants: ${horde.left} remain.`;
      this.player.x = this.map.entry?.x ?? 4;
      this.player.y = this.map.entry?.y ?? 5;
      relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); this.settleArrival(); // release 419
      if (marginaliaOpen(this.save) && marginCrossing(this.areaId())) { beginMarginRun(this.save, this.areaId()); if (ensureMarginalia(this.save).found.length) this.marginPasteRequested = true; } // release 459
    } else if (r.transition === "exit") {
      if(this.save.session.activeDisplacement){if(!this.thresholdOpen()){this.message="The Mislaid Threshold remains sealed while its guardian lives. Its guardian is marked on the dungeon map.";return{ok:false,message:this.message}}const d=this.save.session.activeDisplacement;this.snapshotArea();this.rx=d.destination.rx;this.ry=d.destination.ry;this.save.session.displacementJourney={source:d.source,destination:d.destination};this.save.session.activeDisplacement=null;this.save.session.activeDungeonId=null;this.loadArea("overworld",false);this.player.x=16;this.player.y=16;relocateIfStranded(this.player,this.map,mapWidth(this.map,'overworld'));this.message="The completed crossing releases you onto stable ground in a distant, uncharted Corridor. Find a physical Wayglass to restore travel."}else this.leaveDungeon("You emerge at the dungeon entrance.");
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
    else if (action === "buyShield") r = buyHullShield(s); // release 263
    else if (action === "board") {
      if (o.id === "skiff-spare") takeSpare(s); // release 261: the spare becomes the skiff in use
      const at = o.kind === "skiff" ? { x: o.x, y: o.y } : o.berth;
      if (!board(s, at)) r = { ok: false, message: b.owned ? "The skiff needs repair before it can sail." : "You own no skiff." };
      else {
        this.map.objects = this.map.objects.filter((q) => q.kind !== "skiff"); this.placeSpareSkiff();
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
    if (o.kind === "diveOnward") { // release 311: the deep current runs on to the next dive buoy
      { const gate = underwaterGate(s); if (!gate.ok) { this.message = `The current pulls toward somewhere far. ${gate.why}`; return { ok: false, message: this.message }; } } // release 315
      const to = this.onwardBuoy(); if (!to) { this.message = "The current turns back on itself here. Follow the line up."; return { ok: false, message: this.message }; }
      s.session.dungeonReturn = to; const ok = this.leaveDungeon("You ride the deep current and come up beside another buoy."); if (ok) { s.session.breath = DIVE.breath; this.sync(); } return { ok: !!ok, message: this.message };
    }
    // Release 315: rig and Lens dive from Infinite II; a submersible goes under from Infinite III with the Void Walker and a Listener beaten.
    const bySub = aboard(s) && submersible(s), gate = bySub ? underwaterGate(s) : diveGate(s);
    if (!gate.ok && !(bySub && canDive(s) && diveGate(s).ok)) { this.message = gate.why; return { ok: false, message: this.message }; }
    if (!canDive(s) && !bySub) { this.message = diveSiteHint(s) + " (A submersible can dive without them.)"; return { ok: false, message: this.message }; } // release 311
    s.session.dungeonReturn = { rx: this.rx, ry: this.ry, x: o.x, y: o.y - .2 };
    s.session.activeDungeonId = diveId(s.seed, this.rx, this.ry); s.session.activeDungeonLevelId = null;
    const h = dungeonHistory(s, s.session.activeDungeonId); h.diveGenerator ??= h.visits > 0 ? 1 : DIVE_GENERATOR; h.visits++; h.visitOpen = true;
    this.swimming = false; this.loadArea("dungeon");
    this.player.x = this.map.entry.x; this.player.y = this.map.entry.y - .2; s.session.breath = DIVE.breath;
    this.message = "You dive. Watch your air: air pockets refill it, the line leads back up."; this.sync();
    return { ok: true, message: this.message };
  }

  // Release 317: ashore the frame builds the robot once, then calls it up and stows it (vehicle-gates.ts MECH).
  toggleMech() {
    const m = ensureMech(this.save), c = this.save.consumables ||= {}, drone = m.mode === "drone";
    const gate = drone ? droneGate(this.save) : mechGate(this.save); if (!gate.ok) { this.message = gate.why; return false; } // release 321: the drone has its own gate
    if (drone && m.active) { const p = this.player, max = p.maxHp || this.save.maxHp; if (p.hp < max && !(m.healCd > 0)) return this.droneHeal("You call the drone down; it mends you."); } // release 321: on command
    if (!m.built) { if (!(c.submersible > 0)) { this.message = "Forge a submersible frame first (Pack → Supplies): ashore it becomes your robot."; return false; } c.submersible -= 1; m.built = true; m.plate = MECH.plate; }
    if (!drone && m.active && !m.empowered && (Number(this.save.materials?.cinderIron) || 0) >= MECH_POWER.burn) { this.message = setEmpowered(this.save, true).message; this.sync(); return true; } // release 383: robot → empowered → stowed
    if (m.active) { if (m.empowered) setEmpowered(this.save, false); m.active = false; this.message = drone ? "The drone docks into its frame." : "The robot folds away."; this.sync(); return true; }
    if (!drone && m.cooldown > 0) { this.message = `The robot's plating is still knitting: ${Math.ceil(m.cooldown)}s.`; return false; }
    m.active = true; this.droneAt = null; this.message = drone ? "The drone lifts off beside you. It fires on what comes near; hold Jump in the air and it carries you." : "The robot unfolds around you. Hold Jump in the air to boost."; this.sync(); return true;
  }
  droneUp() { const m = this.save.mech; return m?.active === true && m.mode === "drone" && !aboard(this.save); }
  droneHeal(message) {
    const m = this.save.mech, p = this.player, max = p.maxHp || this.save.maxHp, n = Math.round(max * DRONE.heal);
    p.hp = Math.min(max, p.hp + n); this.save.hp = p.hp; m.healCd = DRONE.healCooldown;
    this.droneHealFx = .9; // the renderer's green glow
    this.message = `${message} +${n} health. It can mend again in ${DRONE.healCooldown}s.`; return true;
  }
  // Release 321: the drone's turn each frame (after tickMech): follow, fire homing rockets, mend by itself when needed.
  tickDrone(dt, now) {
    const m = this.save.mech, p = this.player, carry = this.mechBoosting, want = carry ? { x: p.x, y: p.y - .9 } : { x: p.x + (p.facing === "left" ? .95 : -.95), y: p.y - .55 };
    const d = this.droneAt ||= { ...want }, k = Math.min(1, dt * (carry ? 20 : 6)); d.x += (want.x - d.x) * k; d.y += (want.y - d.y) * k;
    this.droneHealFx = Math.max(0, (this.droneHealFx || 0) - dt);
    const max = p.maxHp || this.save.maxHp; if (p.hp > 0 && p.hp < max * DRONE.autoHealBelow && !(m.healCd > 0)) this.droneHeal("The drone swoops in and mends you.");
    if (m.rocketCd > 0) return;
    let best = null, bd = DRONE.range; for (const e of this.enemies || []) { if (e.dead || e.hp <= 0 || e.hidden || e.ambient || e.astralAllyOf) continue; const r = Math.hypot(e.x - p.x, e.y - p.y); if (r < bd) { bd = r; best = e; } }
    if (!best) return;
    const ax = best.x + .5 - (d.x + .5), ay = best.y + .5 - (d.y + .45), n = Math.hypot(ax, ay) || 1;
    this.projectiles.push({ id: `drone-rocket-${now}`, x: d.x + .5, y: d.y + .45, dx: ax / n, dy: ay / n, speed: DRONE.rocketSpeed, life: DRONE.rocketLife, damage: DRONE.rocketDamage + (characterStats(this.save).magicBonus || 0), damageType: "physical", path: "straight", age: 0, hits: {}, seekId: best.id, seekTurn: DRONE.rocketTurn, droneRocket: true });
    m.rocketCd = DRONE.rocketEvery;
  }
  // Release 319 (dungeon-ladder.ts): a Threefold Deep, a deep archetype or a world-threat arena records, the first time it is
  // entered, the tier it was found at and whether it is a taste. Release 323 (Tim: "no dungeon should be sealed... you should
  // just be able to access all the dungeons... sometimes people will probably never come back to them"): every entrance
  // opens. One found below its kind's unlock tier opens as a taste (325: whole, with its creatures scaled down: tasteThreat).
  // Release 325 (Tim: "the threefold deeps should just open all the way... monsters that are scoped to the strength of the
  // character at that point"): in a deep or arena first entered below its kind's tier (a taste), every creature's health and
  // damage are scaled by DUNGEON_LADDER.tasteThreat for the tier it was entered at. 1 elsewhere.
  tasteThreat() {
    if (!(this.map?.deepDungeon || this.map?.recipe === "deep-v1" || this.map?.arena)) return 1;
    const id = this.save.session.activeDungeonId, h = id && this.save.consequences?.dungeons?.[id];
    if (h?.ladder?.rung !== "taste") return 1;
    const T = DUNGEON_LADDER.tasteThreat; return Math.min(1, T.base + T.perTier * (Number(h.ladder.tier) || 0));
  }
  openEntrance(o) {
    const kind = entranceKind(o), id = o.dungeonId || o.arenaId; if (!kind || !id) return;
    const h = dungeonHistory(this.save, id); if (h.visits > 0 || h.ladder) return;
    const tier = ladderTier(this.save), rung = ladderRoll(this.save.seed, id, kind, tier) || (tier >= (DUNGEON_LADDER.unlock[kind] ?? 0) ? "full" : "taste");
    h.ladder = { version: DUNGEON_LADDER.version, tier, rung };
  }
  // The recovery after a fall (moved here from update by release 329, unchanged): beasts reset for a fresh duel, the
  // Wayfarer wakes at the active checkpoint.
  resolveDeath(now, input, fellIntoHazard = false, terrainHazard = null) {
    const p = this.player;
    // Release 423 (Tim: "the world bosses... keep their health when you die... it only resets after they die"): a living beast's
    // wounds are kept, as a share of its health, on its hunt record; it comes back that hurt (BEAST_KEEPS_WOUNDS).
    for (const e of this.enemies) if (!e.dead && e.maxHp > 0 && (e.worldBeast || e.questingBeast)) { const q = e.worldBeast ? this.save.worldBeasts?.[e.worldBeast]?.active : this.save.questingBeast?.active; if (q) q.hpShare = Math.max(.01, Math.min(1, e.hp / e.maxHp)); }
    const beastNote = this.area === "overworld" ? questingBeastPlayerFell(this.save, this.rx, this.ry, this.enemies.some((e) => e.questingBeast && !e.dead)) : null;
    if (beastNote) journalOnce(this.save, `questing-beast-try:${this.save.questingBeast.cycle}:${this.save.questingBeast.active?.tries ?? "gone"}`, beastNote, "The Questing Beast");
    const worldNote = this.area === "overworld" || this.area === "dungeon" ? worldBeastPlayerFell(this.save, this.rx, this.ry, this.enemies.filter((e) => e.worldBeast && !e.dead).map((e) => e.worldBeast), this.area === "dungeon" ? this.areaId() : null, this.beastTries === false) : null; // release 235
    if (worldNote) journalOnce(this.save, `world-beast-try:${this.rx},${this.ry}:${JSON.stringify(this.save.worldBeasts)}`.slice(0, 160), worldNote, "World beasts");
    // Gate predators have no rematches: a player death ends their hunt, without rewards.
    for (const e of this.enemies) if (e.gatePredator && !e.dead) { e.dead = true; e.noRewards = true; resetGateAttack(e, true); }
    // A failed attempt calms the beast and starts a fresh per-fight clock. Release 427 (Tim: "his health reset when I died...
    // make sure that the health doesn't reset when you die for the world bosses"): it keeps every wound you gave it (the
    // release-353 rule that a death heals it is retired); only its own death resets it. Tries and rewards are unchanged.
    for (const e of this.enemies) if (!e.dead && (e.questingBeast || e.worldBeast)) {
      const state = e.questingBeast ? this.save.questingBeast : this.save.worldBeasts?.[e.worldBeast];
      if (!state?.active) { e.dead = true; e.noRewards = true; continue; }
      if (e.retreating || e.fleeTo) continue;
      if (e.worldBeast) { const f = e.hp / (e.maxHp || 1); if (f > 0 && f < 1) state.active.wounds = Math.round(f * 1e4) / 1e4; else delete state.active.wounds; }
      if (e.worldBeast && this.beastTries === false) { e.aggro = false; resetPackRuntime(e); continue; } // release 345: tries off: no try is spent and the clock carries on
      state.active.patience = 0; // A fresh duel gets a fresh per-fight clock, not fresh attempts.
      if (e.glyphBaseSpeed !== undefined) e.speedMultiplier = e.glyphBaseSpeed;
      delete e.glyphBaseSpeed; delete e.glyphBurn; delete e.glyphSlow;
      e.hitStun = 0; e.recoil = 0; e.hitFlash = 0;
      resetPackRuntime(e); e.aggro = false;
      if(e.kind === "astralWorm")delete e.astral;
    }
    for(const e of this.enemies)if(e.astralOwner){e.dead=true;e.noRewards=true;}
    reconcileAstralCompanions(this);this.syncAstralRiders();
    this.captureLastDeath(fellIntoHazard?terrainHazard:"combat");
    if (this.area === "dungeon") {if(String(this.save.session.activeDungeonId||'').startsWith('hunt-instance:'))abandonHuntInstance(this.save,this.save.session.activeDungeonId);abandonDungeon(this.save, this.areaId());}
    const c = this.save.activeCheckpoint;
    this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
    this.save.session.displacementJourney=null;
    const before = this.save.consumables.restorativeDraught || 0;
    if (before < 2) this.save.consumables.restorativeDraught = 2;
    clearRot(this.save);
    const woodLost = 0; // release 345: dying costs nothing, carried wood included
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
  // Release 329: the pause after a world beast fells the Wayfarer. No control; beasts wander near where they stood.
  tickFallen(dt, input, now) {
    for (const action of ["tool", "spell", "spell2", "dodge", "jump", "potion", "attack", "interact", "build", "preset"]) input.consume?.(action);
    const width = mapWidth(this.map, this.area);
    for (const e of this.enemies) {
      if (e.dead || !(e.worldBeast || e.questingBeast)) continue;
      e.aggro = false; e.millTurn = (e.millTurn || 0) - dt;
      if (e.millTurn <= 0) { e.millAngle = Math.random() * Math.PI * 2; e.millTurn = 1.1 + Math.random() * 1.2; }
      const home = e.millHome || (e.millHome = { x: e.x, y: e.y }), sp = DEATH_PAUSE.millSpeed * dt;
      let nx = e.x + Math.cos(e.millAngle) * sp, ny = e.y + Math.sin(e.millAngle) * sp;
      if (Math.hypot(nx - home.x, ny - home.y) > DEATH_PAUSE.millRadius || this.map.tiles[Math.floor(ny) * width + Math.floor(nx)]?.blocked && !this.map.tiles[Math.floor(e.y) * width + Math.floor(e.x)]?.blocked) { e.millAngle += Math.PI; nx = e.x; ny = e.y; }
      e.x = nx; e.y = ny; e.facing = Math.cos(e.millAngle) >= 0 ? "right" : "left"; e.walkPhase = (e.walkPhase || 0) + dt * 6;
    }
    this.projectiles = this.projectiles.filter((q) => !q.hostile);
    if (now >= this.fallen.until) { this.fallen = null; for (const e of this.enemies) { delete e.millHome; delete e.millAngle; delete e.millTurn; } this.player.stunnedUntil = 0; this.resolveDeath(now, input); this.save.hp = this.player.hp; this.save.stamina = this.player.stamina; Object.assign(this.save.position, { area: this.area, rx: this.rx, ry: this.ry, x: this.player.x, y: this.player.y }); }
  }
  mechUp() { return this.save.mech?.active === true && this.save.mech.mode !== "drone" && !aboard(this.save); }
  // Release 507: surface water carries the Wayfarer with the Tidemantle, or inside the robot (MECH_WATER).
  swimsHere(hazard) { return swimsThrough(this.save, hazard) || (!!hazard && this.mechUp() && isSwimmableKind(hazard)); }
  wading() { return this.swimming === true && this.mechUp(); }
  // Release 557 (Tim: "you have to leave the robot and then hit A to get the boat, and then... hit the robot button, then go
  // into the water version... we just need to have better like seamless transition from ground to water when you're in the
  // robot"): the robot is the submersible frame ashore, so walking it out onto open-world water the skiff sails takes the
  // skiff there as a submersible (boats.ts mechSub) and Dodge dives. Sailing onto land stands the robot up again (its
  // `active` never changed). Without a sound skiff it wades as before; dungeon water is not open-world water.
  robotPutsToSea(x, y, width, hazard) {
    const b = this.save.boat;
    if (this.area !== "overworld" || !this.mechUp() || !this.swimsHere(hazard) || !b?.owned || !(b.hull > 0) || !footprintSailable(this.map, width, x, y) || this.wayglassNear() || !board(this.save, { x, y })) return false;
    b.mechSub = true; this.map.objects = this.map.objects.filter((q) => q.kind !== "skiff"); this.placeSpareSkiff();
    Object.assign(this.player, { sailVx: 0, sailVy: 0 }); this.swimming = false;
    this.message = "The robot folds round the skiff and seals: a submersible. Dodge to dive; sail onto land and it stands up again.";
    return true;
  }
  // Release 311 (Tim: "these buoys... are connected... go to one buoy, and then go to another buoy... if you traverse the
  // dungeon"): the dive buoy the grotto's deep current carries you to — the nearest other buoy section, rings outward from
  // the one you dove at (dive:<seed>:<rx>:<ry>), found with the same rule diveSite uses. Returns a dungeonReturn place.
  onwardBuoy() {
    const m = /^dive:.+:(-?\d+):(-?\d+)$/.exec(String(this.save.session.activeDungeonId || "")); if (!m) return null;
    const ox = Number(m[1]), oy = Number(m[2]), seed = this.save.seed; let tries = 0;
    for (let r = 2; r <= DIVE_ONWARD.radius && tries < DIVE_ONWARD.tries; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || tries >= DIVE_ONWARD.tries) continue;
      const rx = ox + dx, ry = oy + dy; if (biomeFor(seed, rx, ry) !== "sea" || hashSeed(`${seed}:dive:site:${rx}:${ry}`) % DIVE.siteEvery !== 0) continue;
      tries++; const map = walkerCrossingMap(this.save, rx, ry), site = diveSite(map, seed, rx, ry);
      const spot = site || map.tiles.filter((t) => DEEP_WATER.includes(t.kind) && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29).sort((a, b) => Math.hypot(a.x - 16, a.y - 16) - Math.hypot(b.x - 16, b.y - 16))[0];
      if (spot) return { rx, ry, x: spot.x, y: spot.y - .2 };
    }
    return null;
  }
  // The nearest deep-water tile within reach where a skiff fits, while ashore in the overworld; null otherwise.
  // Release 225: the shovel. Facing a dungeon wall, Act digs one block (crafting a shovel first from wood and stone if
  // you carry none). Returns null when you are not facing diggable rock, so Act falls through to its other uses.
  digAhead() {
    const overworld = this.area === "overworld" && !aboard(this.save); // release 423: the shovel works in the open world too
    if ((this.area !== "dungeon" && !overworld) || !this.map?.tiles) return null;
    const p = this.player, w = mapWidth(this.map, this.area), px = Math.floor(p.x + .5), py = Math.floor(p.y + .75), key = overworld ? overworldDigKey(this.rx, this.ry) : this.areaStateId(), o = { overworld };
    // Release 411: forgiving aim: the tile ahead of the feet, else of the body's middle (a stone just above or below the
    // feet row was missed, and Act said "Nothing nearby responds").
    let plan = planDig(this.map, px, py, p.facing || "down", key, o);
    for (const ty of [Math.round(p.y + .4), Math.floor(p.y + .4)]) if (!plan.ok && !plan.reason && ty !== py) { const alt = planDig(this.map, px, ty, p.facing || "down", key, o); if (alt.ok || alt.reason) plan = alt; }
    if (overworld && plan.ok && saveTier(this.save) < OVERWORLD_DIG.tier) { this.message = "The open world will not yield to a shovel yet. It gives way from Infinite II."; return { ok: false, message: this.message }; } // release 425
    if (!plan.ok && plan.resists) { const hard = planDig(this.map, px, py, p.facing || "down", key, { iron: true }); for (const ty of [py, Math.round(p.y + .4), Math.floor(p.y + .4)]) { const h2 = planDig(this.map, px, ty, p.facing || "down", key, { iron: true }); if (h2.ok) { plan = { ...h2, hard: true }; break; } } if (!plan.ok && hard.ok) plan = { ...hard, hard: true }; } // release 379: the iron shovel; 411: a hard wall costs it 2
    if (plan.ok && !plan.iron && !(this.save.digging?.shovel > 0) && (this.save.digging?.iron > 0) && ((this.save.materials?.wood || 0) < DIG.recipe.wood || (this.save.materials?.stone || 0) < DIG.recipe.stone)) plan = { ...plan, iron: true }; // release 411: no standard shovel to hand, the iron one digs
    if (!plan.ok) { if (!plan.reason) return null; this.message = plan.reason; return { ok: false, message: this.message }; }
    const c = plan.iron ? ensureIronShovel(this.save) : ensureShovel(this.save); if (!c.ok) { this.message = c.message; return { ok: false, message: this.message }; }
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
  // Release 265: where the Refuge's farm and quarry lie (dry, open land near the Refuge; no hamlet).
  refugeLandsWhere() {
    const seed = this.save.seed;
    const home = homeCenter(this.save); // release 371: the farm and quarry belong to home
    return refugeLands(seed, (rx, ry) => !(rx === 0 && ry === 0) && !(rx === home.rx && ry === home.ry) && !townAt(this.save, rx, ry) && !["sea", "isles", "lake", "coast", "swamp", "blight", "castle"].includes(biomeFor(seed, rx, ry)?.id ?? biomeFor(seed, rx, ry)) && !hamletSection(seed, rx, ry) && !openSeaSection(seed, rx, ry), home);
  }
  // Release 267: build mode. A tap at world point (wx, wy) builds there (or BUILD.reach tiles out along the same line), a
  // fence turned across the line from the Wayfarer to the tap.
  buildAt(wx, wy) {
    const t = tapTarget(this.player, wx, wy), r = placeBuild(this, t.x, t.y, undefined, true, t.run);
    this.message = r.message; return r;
  }
  // Release 269: the skiff a Build press would patch: the one you're aboard, or yours moored within reach, while its
  // hull is not whole.
  mendTarget() {
    const b = this.save.boat; if (this.area !== "overworld" || !b?.owned || !(b.hull < BOAT.maxHull)) return null;
    if (aboard(this.save)) return { aboard: true, x: this.player.x, y: this.player.y };
    const o = (this.map?.objects || []).find((q) => q.id === "skiff-moored" && Math.hypot(q.x - this.player.x, q.y - this.player.y) < 1.6);
    return o ? { x: o.x, y: o.y } : null;
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
  // Release 261: the spare skiff, when it is moored in this section.
  placeSpareSkiff() {
    const sp = ensureBoatState(this.save).spare; this.map.objects = this.map.objects.filter((o) => o.id !== "skiff-spare");
    if (this.area === "overworld" && sp && sp.rx === this.rx && sp.ry === this.ry) this.map.objects.push({ id: "skiff-spare", kind: "skiff", name: "Your spare skiff", lore: "Your other skiff rides at its mooring.", x: sp.x, y: sp.y, state: "moored", actions: ["board"] });
  }
  buildSkiffHere() {
    if (this.wayglassNear()) { this.message = "Too near the Wayglass: no skiff is built here."; return { ok: false, message: this.message }; } // release 557
    const at = this.shoreWater();
    if (!at) { this.message = "Find deep water's edge to build a skiff."; return { ok: false, message: this.message }; }
    const r = buildSkiff(this.save, { rx: this.rx, ry: this.ry, x: at.x, y: at.y - .2 });
    if (r.ok) {
      const p = this.player, fx = at.x - p.x, fy = at.y - .2 - p.y, m = Math.hypot(fx, fy) || 1, push = BOAT.pushOff * 2.4 * BOAT.speed;
      this.map.objects = this.map.objects.filter((q) => q.kind !== "skiff"); this.placeSpareSkiff();
      Object.assign(p, { x: at.x, y: at.y - .2, sailVx: fx / m * push, sailVy: fy / m * push }); this.swimming = false; // release 263: it pushes off, away from the shore
    }
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
        deaths = this.save.worldFlags.deaths || 0, keptRun = wasDungeon ? this.save.session.marginRun : null; // release 459: a fall inside keeps the crossing's marginalia
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
        if (keptRun) this.save.session.marginRun = keptRun; // release 459
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
        this.settleArrival(); // release 263: clear of guardians; 419: on the level's own floor
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
  // Release 449 (Tim: "Crossing sigil is still not something I can use"): it carries you out of the dungeon and, when a
  // Wayglass is chosen (`key`), on across the corridor to it, as its description always said; with none, to the entrance.
  useCrossingSigil(key = null) {
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
    const left = this.leaveDungeon(
      "The Crossing Sigil tears a narrow path back to the dungeon entrance.",
    ), to = key && this.save.checkpoints?.[key];
    if (left && to && this.travelToCheckpoint(key)) this.message = `The Crossing Sigil tears a path out of the dungeon and across the corridor to ${to.name || "the Wayglass"}. ${c.crossingSigil} left.`;
    return left;
  }

  packHurt(source, amount, options = {}, now = performance.now()) {
    const p = this.player;
    if (source?.illusion || !(amount > 0) || now <= (p.invulnerableUntil || 0)) return false;
    if (options.jumpable && now < (this.jumpUntil || 0)) return false;
    { const b = source && buildBetween(this, source); if (b) { const melee = (ATTACK_MODULES[source.pack?.attack]?.tags || []).includes("melee"); strikeBuild(this, b, melee && !!(source.worldBeast || source.questingBeast)); return false; } } // release 265: a build takes the blow
    const veil = this.save.magicSkills?.active?.id === 'veil-guard' ? .12 + .08 * skillRank(this.save, 'veil-guard') : 0;
    if (bossPaced(source) && options.source !== "astralDrain") amount *= BOSS_PACE.damage; // release 421 (the Astral Worm's drain keeps its release-307 size: it is also its heal)
    p.hp -= Math.max(1, Math.ceil((this.guardRemaining > 0 ? amount * .65 : amount) * (1 - Math.min(.75, characterStats(this.save).damageReduction + veil))));
    p.invulnerableUntil = now + (options.beam ? 320 : 700);
    return true;
  }
  // Explicit prototype fixture entry only. Natural pairing stays disabled until reviewed integration.
  mountAstralFixture(owner, rider) {
    if (!this.enemies.includes(owner) || !this.enemies.includes(rider) || rider.astralAllyOf ||
        this.enemies.some(e => e !== rider && this.astralRiderHeld(e) && e.astralMount.ownerId === owner.id)) return false;
    const host = this.astralMountHost();
    host.canMount = (a,b) => hasLineOfSight(a,b,this.map,mapWidth(this.map,this.area));
    if (!mountAstralWalker(owner,rider,host)) return false;
    if(!owner.worldBeast){owner.astralMountFixture = true; rider.astralMountFixture = true;}
    return true;
  }
  // A rider still on a retreating Worm leaves with it (owner rule 2026-10-21): his hunt ends as an escape, no try lost.
  // Anyone not seated (boarding or landing) is set down first, as before.
  astralRiderLeavesWith(owner) {
    const host=this.astralMountHost();
    for(const rider of this.enemies) if(rider.astralMount?.ownerId===owner.id&&this.astralRiderHeld(rider)) {
      if(rider.astralMount.status==="mounted"&&!rider.dead){rider.dead=true;rider.noRewards=true;rider.astralMount={...rider.astralMount,status:"dismounted",reason:"left-with-owner"};
        const q=this.save.worldBeasts?.voidWalker;if(rider.worldBeast==="voidWalker"&&q?.active)retreatEnded(this.save,"voidWalker");}
      else dismountAstralWalker(rider,"owner-retreat",host);
    }
  }
  // Natural pairs board visibly: disk throw, pillar, phase out and in (see ASTRAL_BOARDING).
  boardAstralWalker(owner, rider) {
    if (!this.enemies.includes(owner) || !this.enemies.includes(rider) || rider.astralAllyOf ||
        this.enemies.some(e => e !== rider && this.astralRiderHeld(e) && e.astralMount.ownerId === owner.id)) return false;
    const host = this.astralMountHost();
    host.canMount = (a,b) => hasLineOfSight(a,b,this.map,mapWidth(this.map,this.area));
    return beginAstralBoarding(owner,rider,host);
  }
  astralRiderHeld(e) { return ["mounted", "landing", "boarding"].includes(e?.astralMount?.status); }
  astralLandingOpen(rider, at) {
    const width = mapWidth(this.map,this.area), height = mapHeight(this.map,this.area), {x,y} = at, marine=this.area==="overworld"&&!!rider.astralCompanionOf;
    if (![x,y].every(Number.isFinite) || x < 0 || y < 0 || x > width-1 || y > height-1 || !walkerGroundPositionOpen(this.map,width,x,y,marine)) return false;
    // Dismount is a short unobstructed descent, not a blink through a wall or across a cliff.
    if (Math.abs(elevationAt(this.map,width,rider.x,rider.y)-elevationAt(this.map,width,x,y))>1 ||
        !hasLineOfSight({x:rider.x+.5,y:rider.y+.7},{x:x+.5,y:y+.7},this.map,width,true,marine)) return false;
    const steps=Math.max(1,Math.ceil(Math.hypot(x-rider.x,y-rider.y)*4));
    for(let i=1;i<steps;i++) if(!footprintOpen(this.map,width,rider.x+(x-rider.x)*i/steps,rider.y+(y-rider.y)*i/steps,true,marine)) return false;
    if (this.area === "dungeon") {
      const connected = this.walkerLandingGraph();
      for (let ty=Math.floor(y+.5);ty<=Math.floor(y+.88-1e-6);ty++) for(let tx=Math.floor(x+.24);tx<=Math.floor(x+.76-1e-6);tx++) if(!connected.has(ty*width+tx)) return false;
    }
    return !this.enemies.some(e=>e!==rider&&!e.dead&&e.hp>0&&Math.hypot(e.x-x,e.y-y)<.65) && Math.hypot(this.player.x-x,this.player.y-y)>=.85;
  }
  astralMountHost() {
    return { alignment:"hostile", paused:this.paused, findOwner:id=>this.enemies.find(e=>e.id===id),
      canLand:(rider,at)=>this.astralLandingOpen(rider,at),
      findLanding:(rider)=>{
        // Bounded 9x9 local search. No shore guess or remote relocation if all candidates fail.
        const candidates=[];
        for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++) if(dx*dx+dy*dy<=16) candidates.push({x:rider.x+dx,y:rider.y+dy,d:dx*dx+dy*dy});
        candidates.sort((a,b)=>a.d-b.d);
        return candidates.find(at=>this.astralLandingOpen(rider,at)) || null;
      } };
  }
  astralPlayerFell() { return !this._astralDamagePending && this.player.hp<=0; }
  syncAstralClone(e) { if(!e?.astralOwner)return;const owner=this.enemies.find(q=>q.id===e.astralOwner),clone=owner?.astral?.clones?.find(q=>q.id===e.id);if(clone)clone.hp=Math.max(0,Math.min(clone.hp,e.dead?0:Number(e.hp)||0)); }
  astralPlayerHit(e, actual) { this.syncAstralClone(e);return recordAstralRiderDamage(e,actual,{playerInflicted:true},this.astralMountHost()); }
  syncAstralRiders() {
    if (this.paused) return;
    const host=this.astralMountHost();
    // Owner rule 2026-10-21: the player's death does not unseat a rider; he stays on through the rematch.
    for(const rider of this.enemies) if(rider.astralMount) syncAstralMount(rider,host);
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
  // Release 259 (Tim: the Psychic Crystal "went into... beyond the edge of the dungeon, so I couldn't see it... it stays
  // within the confines of the dungeon, even if there's black space"). Where a dungeon roamer may be: the dungeon's open
  // ground (every room, water and pit included; a room walking cannot reach stays valid, as approved for release 249), any
  // wall touching it, and an interior wall with open ground on both opposite sides within CRYSTAL.boundsSpan tiles (so it
  // still phases between rooms); never the solid black beyond the dungeon's edge. Rebuilt when the terrain changes (the
  // walker landing graph is rebuilt then too, so its identity is the cache key).
  roamerBounds() {
    const key = this.walkerLandingGraph(), map = this.map, tiles = map.tiles || [], width = mapWidth(map, this.area), height = mapHeight(map, this.area);
    if (this._roamerBounds?.key === key && this._roamerBounds.width === width) return this._roamerBounds.ok;
    const ok = new Uint8Array(width * height), floor = (x, y) => x >= 0 && y >= 0 && x < width && y < height && !!tiles[y * width + x] && !tiles[y * width + x].blocked, N = CRYSTAL.boundsSpan;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = floor(x + dx, y + dy);
      if (!near) { let l = false, r = false, u = false, d = false; for (let k = 1; k <= N; k++) { l ||= floor(x - k, y); r ||= floor(x + k, y); u ||= floor(x, y - k); d ||= floor(x, y + k); } near = l && r || u && d; }
      if (near) ok[y * width + x] = 1;
    }
    this._roamerBounds = { key, width, ok: ok.some((v) => v) ? ok : null }; return this._roamerBounds.ok;
  }
  // Release 259: the floor connected to the Wayfarer's own tile (4-way over open, non-lethal ground). Cached until the
  // terrain changes (the walker landing graph is rebuilt then) or the Wayfarer stands outside the cached area.
  playerFloor() {
    const key = this.walkerLandingGraph(), map = this.map, tiles = map.tiles || [], width = mapWidth(map, this.area), height = mapHeight(map, this.area);
    const p = this.player, px = Math.max(0, Math.min(width - 1, Math.floor(p.x + .5))), py = Math.max(0, Math.min(height - 1, Math.floor(p.y + .72))), start = py * width + px;
    const c = this._playerFloor; if (c?.key === key && c.width === width && c.cells.has(start)) return c.cells;
    const open = (t) => t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !["districtWall", "shackWall"].includes(t.structure), cells = new Set(), queue = open(tiles[start]) ? [start] : [];
    for (const k of queue) cells.add(k);
    for (let i = 0; i < queue.length; i++) { const k = queue[i], x = k % width, y = Math.floor(k / width);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * width + nx; if (nx < 0 || ny < 0 || nx >= width || ny >= height || cells.has(n) || !open(tiles[n])) continue; cells.add(n); queue.push(n); } }
    this.performanceStats && (this.performanceStats.pathfindingWork += cells.size);
    this._playerFloor = { key, width, cells: cells.size ? cells : key }; return this._playerFloor.cells;
  }
  roamerInBounds(e) { const ok = this.roamerBounds(), width = mapWidth(this.map, this.area); return !ok || ok[Math.round(e.y) * width + Math.round(e.x)] === 1; }
  walkerSafeTeleport(e, x, y) {
    if (this.astralRiderHeld(e)) return false;
    const map = this.map, width = mapWidth(map, this.area), height = mapHeight(map, this.area);
    const marine = refreshMarineBeast(e, map, width, this.area);
    if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x > width - 1 || y > height - 1 || !walkerGroundPositionOpen(map, width, x, y, marine)) return false;
    if (this.area === "dungeon") {
      const connected = this.walkerLandingGraph();
      for (let ty = Math.floor(y + .5); ty <= Math.floor(y + .88 - 1e-6); ty++) for (let tx = Math.floor(x + .24); tx <= Math.floor(x + .76 - 1e-6); tx++) if (!connected.has(ty * width + tx)) return false;
    }
    if (this.enemies.some(other => other !== e && !other.dead && Math.hypot(other.x - x, other.y - y) < .65)) return false;
    if (Math.hypot(this.player.x - x, this.player.y - y) < .85) return false;
    e.x = x; e.y = y; refreshMarineBeast(e, map, width, this.area); this._walkerRoutes?.delete(e); return true;
  }
  // An overworld Supernova near a section edge also scars the overlapping part of each adjacent section. The
  // neighbor is previewed read-only (as for Walker crossings) and its scar row is stored under its own key; it is
  // applied when that section next loads. Nothing there is visited, generated into history, or simulated.
  spillVoidTerrain(center, radius) {
    const width = mapWidth(this.map, this.area), height = mapHeight(this.map, this.area), out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      // Nearest point of the neighbor's rectangle, in this section's coordinates.
      const nx = Math.max(dx * width, Math.min((dx + 1) * width, center.x)), ny = Math.max(dy * height, Math.min((dy + 1) * height, center.y));
      if (Math.hypot(center.x - nx, center.y - ny) >= radius) continue;
      const rx = this.rx + dx, ry = this.ry + dy, neighbor = walkerCrossingMap(this.save, rx, ry);
      const result = consumeVoidTerrain(this.save, neighbor, `overworld:${rx}:${ry}:g${this.save.worldGeneration}`, { ...center, x: center.x - dx * width, y: center.y - dy * height }, radius, [], { spill: true });
      out.push({ rx, ry, result });
    }
    return out;
  }
  walkerExitTargets(e, route) {
    const width = mapWidth(this.map, this.area), gate = { x: Math.max(0, Math.min(width - 1, e.fleeTo.x)), y: Math.max(0, Math.min(mapHeight(this.map, this.area) - 1, e.fleeTo.y)) };
    if (this.area !== "overworld") return [gate];
    if (!(route.marineSection ??= this.map.tiles.some(isMarineTile))) {
      // Any open tile along the exit edge leaves the section, the clamped gate first; a single blocked
      // gate tile no longer strands the retreat.
      const height = mapHeight(this.map, this.area), side = e.fleeTo.side, edge = side === "east" ? n => ({ x: width - 1, y: n }) : side === "west" ? n => ({ x: 0, y: n }) :
        side === "south" ? n => ({ x: n, y: height - 1 }) : side === "north" ? n => ({ x: n, y: 0 }) : null;
      if (!edge) return [gate];
      const out = [gate];
      for (let n = 0; n < (side === "east" || side === "west" ? height : width); n++) { const p = edge(n); if ((p.x !== gate.x || p.y !== gate.y) && walkerGroundPositionOpen(this.map, width, p.x, p.y, e._marineTraversal)) out.push(p); }
      return out;
    }
    const side = e.fleeTo.side, dir = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[side];
    if (!dir) return [];
    const key = `${this.rx + dir[0]},${this.ry + dir[1]}`;
    if (route.crossingKey !== key) { route.crossingKey = key; route.crossingMap = walkerCrossingMap(this.save, this.rx + dir[0], this.ry + dir[1]); }
    return walkerSectionCrossings(this.map, route.crossingMap, side, gate);
  }
  walkWalkerRoute(e, s, dt, retreat = false) {
    if (this.astralRiderHeld(e)) return;
    if (!(dt > 0)) return;
    const width = mapWidth(this.map, this.area), routes = this._walkerRoutes ||= new WeakMap();
    refreshMarineBeast(e, this.map, width, this.area);
    let r = routes.get(e);
    if (!r || r.retreat !== retreat || r.map !== this.map) { r = { map: this.map, retreat, route: [], recent: [], seq: 0, wait: 0, topologyTime: 0 }; routes.set(e, r); }
    s.vel = { x: 0, y: 0 }; r.wait = Math.max(0, r.wait - dt);
    let targets;
    if (retreat) {
      e.untargetable = true;
      // Overworld sections retain their existing home/exit-leg policy; only a real dungeon mouth ends a
      // found-home leg. Outside targets clamp to the safe gate tile, never teleport across the boundary.
      targets = this.area === "dungeon" || e.fleeTo.home || e.fleeTo.nearestDoor ? walkerRetreatDoors(this.map, this.area) : this.walkerExitTargets(e, r);
      r.topologyTime -= dt;
      // At most one compact terrain scan per second. The very next movement edge is still checked every
      // frame, and Supernova's terrain callback invalidates all routes immediately.
      if (r.topologyTime <= 0) {
        const topology = walkerRetreatTopology(this.map, width, targets, r.topology);
        if (topology !== r.topology) { r.route = []; r.search = null; r.jump = null; r.wait = 0; delete e.fleeFade; e.hopLift = 0; e.jumping = false; }
        r.topology = topology; r.topologyTime = WALKER_ROUTE.retry;
      }
      if (e.fleeFade != null) {
        const atDoor = targets.some(p => Math.hypot(e.x - p.x, e.y - p.y) < .00001 && walkerGroundPositionOpen(this.map, width, p.x, p.y, e._marineTraversal));
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
        r.target = plan.target;
        const crossing = targets.find(p => p.x === plan.target.x && p.y === plan.target.y)?.entry;
        e.fleeTo = { ...e.fleeTo, ...plan.target, ...(crossing ? { crossingEntry: { ...crossing } } : {}) };
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
      const x = e.x, y = e.y;
      moveWalkerGround(e, dx / d * step, dy / d * step, this.map, width, retreat);
      refreshMarineBeast(e, this.map, width, this.area);
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
    const displacePlayer = (dx, dy) => {
      if (game.area !== "overworld" || !aboard(game.save)) return moveAxis(p, dx, dy, map, width, true);
      // A hostile force moves the occupied skiff, not an on-foot body. Sweep the same full water/iceberg
      // footprint as sailing; never leave a partly stranded hull for sail() to disembark over deep water.
      // Deliberate player-directed shore landing remains sail()'s job. On-foot forces are unchanged above.
      if (![dx, dy].every(Number.isFinite)) return false;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / .16)), sx = dx / steps, sy = dy / steps,
        open = (x, y) => footprintSailable(map, width, x, y) && !bergAt(game.seaHazards, x, y);
      let moved = false;
      for (let i = 0; i < steps; i++) {
        if (sx && open(p.x + sx, p.y)) { p.x += sx; moved = true; }
        if (sy && open(p.x, p.y + sy)) { p.y += sy; moved = true; }
      }
      return moved;
    };
    return {
      player: p, map, width, height, area: this.area, dt, now, enemies: this.enemies, sanctuary,
      playerVelocity: dt > 0 ? { x: (p.x - last.x) / dt, y: (p.y - last.y) / dt } : { x: 0, y: 0 },
      playerShots: this.projectiles, playerSwinging: now < (p.meleeUntil || 0), playerBlasts: this.effects.filter((fx) => !fx.hostile && fx.damage > 0), // release 187: the Questing Beast reads these to dodge (release 245: the Nanobot Knight reads spells too)
      playerFacing: ({ left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } })[p.facing] || { x: 0, y: 1 },
      pull(source, step, radius) { const ddx = source.x - p.x, ddy = source.y - p.y, dd = Math.hypot(ddx, ddy); if (!dd || dd > radius || now < (p.dodgeUntil || 0)) return false; displacePlayer(ddx / dd * Math.min(step, Math.max(0, dd - 1)), ddy / dd * Math.min(step, Math.max(0, dd - 1))); return true; },
      open: (x, y) => footprintOpen(map, width, x, y),
      bossPace: true, // release 421: bosses wind up longer and pause longer between attacks (monster-pack BOSS_PACE)
      tileOpen: (x, y) => tileOpen(map, width, x, y),
      shotBlocked: (x, y) => !tileOpen(map, width, x, y) || !!map.tiles[Math.floor(y) * width + Math.floor(x)]?.build, // release 421: walls and the Wayfarer's builds stop seekers
      projectileOpen: (x, y) => projectileTileOpen(map, width, x, y),
      marineOpen: (x, y) => [x, y].every(Number.isFinite) && x >= 0 && y >= 0 && x <= width - 1 && y <= height - 1 && footprintOpen(map, width, x, y, false, game.area === "overworld"),
      marineTileOpen: (x, y) => game.area === "overworld" ? marinePointOpen(map, width, x, y) : tileOpen(map, width, x, y),
      marineProjectileOpen: (x, y) => game.area === "overworld" ? marinePointOpen(map, width, x, y, true) : projectileTileOpen(map, width, x, y),
      oceanAt: (x, y) => game.area === "overworld" && marineAt(map, width, x, y),
      safeTeleport: (e, x, y) => game.walkerSafeTeleport(e, x, y),
      walkerPatrol: (e, s) => game.walkWalkerRoute(e, s, dt),
      walkerRetreat: (e, s) => game.walkWalkerRoute(e, s, dt, true),
      consumeVoidTerrain(e, center, radius) {
        // Match the native Supernova's continuous world-space disk, not rounded tile centers.
        const result = consumeVoidTerrain(game.save, map, game.areaStateId(), { x: center.x + .5, y: center.y + .62, visualLift: liftAt(map, width, center.x, center.y) }, radius, [p, ...game.enemies.filter(q => !q.dead)]);
        if (result.changed) { game._walkerLandingGraph = null; game._walkerRoutes = new WeakMap(); map.wallGlints = (map.wallGlints || []).filter(q => map.tiles[q.y * width + q.x]?.blocked); }
        if (game.area === "overworld" && result.ok !== false) game.spillVoidTerrain({ x: center.x + .5, y: center.y + .62, visualLift: liftAt(map, width, center.x, center.y) }, radius);
        if (game.area === "overworld" && novaFogCapable(map)) { const was = !!game.novaFog; game.novaFog = novaFog(game.novaFog, center.x + .5, center.y + .62, e.pack?.seq || 0); if (!was) game.message = "The Supernova boils the sea into fog."; } // release 257
        return result;
      },
      groundHeight: (x,y) => map.landscape ? liftAt(map,width,x,y) : 0,
      playerDeathFinal: () => game.astralPlayerFell(),
      deferAstralHeal: (owner,amount) => { if(amount>0&&(game._astralDrainCredits||=[]).length<32)game._astralDrainCredits.push({owner,amount}); },
      astralLos: (a,b) => hasLineOfSight(a,b,map,width,true,game.area === "overworld"),
      los: (a, b, projectile = false) => hasLineOfSight(a, b, map, width, projectile, game.area === "overworld" && ["voidWalker", "psychicCrystal", "lightningGiant", "mountainTurtle"].includes(a?.kind)),
      move(e, dx, dy, opts = {}) {
        if (game.astralRiderHeld(e)) return false;
        const marine = refreshMarineBeast(e, map, width, game.area);
        if (e.kind === "voidWalker") { const moved = moveWalkerGround(e, dx, dy, map, width); refreshMarineBeast(e, map, width, game.area); return moved; }
        if (e.kind === "psychicCrystal" && isDungeonRoamer(e, game.area) && !opts.phase && e.aggro) { /* release 437 (Tim: "the psychic crystal keeps staying in the squares where I can't attack him"): fighting you it never settles in rock. Out in the open with you in sight it walks (release 401); inside rock it keeps moving through (it cannot attack from there: monster-pack holds its attacks while e.inRock), and out of sight it still phases to reach you */ const inRock = !footprintOpen(map, width, e.x, e.y, true, marine); if (!inRock && hasLineOfSight(e, p, map, width)) { const moved = moveAxis(e, dx, dy, map, width, true, null, marine); e.inRock = false; refreshMarineBeast(e, map, width, game.area); return moved; } const nx = Math.max(0, Math.min(width - 1, e.x + dx)), ny = Math.max(0, Math.min(height - 1, e.y + dy)); if (game.builds?.length && tallBuildAt(map, width, nx, ny) && !tallBuildAt(map, width, e.x, e.y)) return false; const moved = nx !== e.x || ny !== e.y; e.x = nx; e.y = ny; e.inRock = !footprintOpen(map, width, e.x, e.y, true, marine); if (e.inRock && !moved) { const out = nearestOpenFootprint(map, width, e); if (out) { const d = Math.hypot(out.x - e.x, out.y - e.y) || 1, st = Math.min(d, .08); e.x += (out.x - e.x) / d * st; e.y += (out.y - e.y) / d * st; } } return moved || e.inRock; }
        if (isDungeonRoamer(e, game.area) || opts.phase && !["psychicCrystal", "lightningGiant", "mountainTurtle"].includes(e.kind)) { const nx = Math.max(0, Math.min(width - 1, e.x + dx)), ny = Math.max(0, Math.min(height - 1, e.y + dy)); if (game.builds?.length && tallBuildAt(map, width, nx, ny) && !tallBuildAt(map, width, e.x, e.y)) return false; /* release 287: it drifts through stone, not through the Wayfarer's builds */ const moved = nx !== e.x || ny !== e.y; e.x = nx; e.y = ny; return moved; }
        const moved = moveAxis(e, dx, dy, map, width, !!e.flying, null, marine); refreshMarineBeast(e, map, width, game.area); return moved;
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
      // Release 259: floor the Wayfarer can reach from where they stand, where the dungeon Crystal sets its goals.
      dungeonClock: game.dungeonClock || 0, // release 271: Gate Revenants stalk, then hunt
      walkable: game.area === "dungeon" ? (x, y) => { const k = Math.round(y) * width + Math.round(x); return x >= 0 && y >= 0 && x <= width - 1 && y <= height - 1 && game.playerFloor().has(k); } : null,
      roamWork: (n) => { game.performanceStats.pathfindingWork += n; },
      detour(e, speed) { if (game.astralRiderHeld(e)) return; const step = boundedChaseStep(e, p, map, width); if (step) { const px = step[0] - e.x, py = step[1] - e.y, m = Math.hypot(px, py) || 1; this.move(e, px / m * speed, py / m * speed); } },
      hurt: (source, amount, options) => !(sanctuary && Math.hypot(p.x - sanctuary.x, p.y - sanctuary.y) < sanctuary.radius) && game.packHurt(source, amount, options, now),
      grab(source) { if (now < (p.dodgeUntil || 0) || now <= (p.invulnerableUntil || 0)) return false; p.heldUntil = now + CRYSTAL.grabHold * 1000 + 100; p.heldBy = source.id; game.message = "It has you. Struggle: dodge, again and again!"; return true; }, // release 249
      held(source) { return now < (p.heldUntil || 0) && p.heldBy === source.id; },
      release(source) { if (p.heldBy === source.id) p.heldUntil = 0; },
      push(source, step, radius) { const ddx = p.x - source.x, ddy = p.y - source.y, dd = Math.hypot(ddx, ddy) || 1; if (dd > radius || now < (p.dodgeUntil || 0)) return false; displacePlayer(ddx / dd * step, ddy / dd * step); return true; }, // release 235: the Blob's jet
      poison(seconds, dps) { if (sanctuary && Math.hypot(p.x - sanctuary.x, p.y - sanctuary.y) < sanctuary.radius) return; if (now < (p.dodgeUntil || 0)) return; applyPoison(ensureEliteState(game.save).status, seconds, dps); },
      effects: () => game.packEffects || [],
      elevation: (x, y) => elevationAt(map, width, x, y), // release 235: high ground stays above the Blob
      // Release 257: the Lightning Giant's shock knocks the Wayfarer flat; dodge frames already blocked the hit itself.
      stun(seconds) { if (!(seconds > 0) || p.hp <= 0) return; if (!(now < (p.stunnedUntil || 0))) p.stunnedAt = now; p.stunnedUntil = Math.max(p.stunnedUntil || 0, now + seconds * 1000); game.message = "The shock knocks you flat!"; },
      // One landed lightning hit from the Lightning Giant: every GIANT.stunHits-th one knocks the Wayfarer down (Tim 2026-10-21).
      shockHit() { if (p.hp <= 0 || now < (p.stunnedUntil || 0)) return; p.shockCount = (p.shockCount || 0) + 1; p.shockAt = now; if (p.shockCount >= GIANT.stunHits) { p.shockCount = 0; this.stun(GIANT.stunTime); } },
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
  // Release 373: the town around a Mouth where a Listener fell: the Listening Stone beside the Mouth, and a delver who
  // trades what comes up out of it. Placed after the Mouth itself (loadArea), on open ground nearest it.
  raiseMouthTown() {
    const mouth = this.map.objects.find((o) => o.kind === "arrayMouth" || o.kind === "silentMouth"), t = townAt(this.save, this.rx, this.ry); if (!mouth || !t) return;
    const w = mapWidth(this.map, "overworld"), taken = (x, y) => this.map.objects.some((o) => Math.round(o.x) === x && Math.round(o.y) === y), open = (x, y) => { const q = this.map.tiles[y * w + x]; return q && !q.blocked && !q.structure && !q.environment && !taken(x, y); };
    const near = (dx, dy) => { for (let r = 0; r < 4; r++) for (const [ax, ay] of [[dx, dy], [dx + r, dy], [dx - r, dy], [dx, dy + r], [dx, dy - r]]) { const x = Math.round(mouth.x) + ax, y = Math.round(mouth.y) + ay; if (open(x, y)) return { x, y }; } return null; };
    const stone = !this.map.objects.some((o) => o.kind === "listeningStone") && near(-2, 0);
    if (stone) this.map.objects.push({ id: `listening-stone-${this.rx}-${this.ry}`, kind: "listeningStone", name: "The Listening Stone", lore: `Raised by the people of ${t.name} where the Listener fell. They say the line still hums in it, and that it listens back for whoever goes down into the Mouth.`, ...stone, state: "humming", actions: ["inspect"], landmark: true });
    const delver = !this.map.objects.some((o) => o.id === `mouth-delver-${this.rx}-${this.ry}`) && near(2, 0);
    if (delver) this.map.objects.push({ id: `mouth-delver-${this.rx}-${this.ry}`, kind: "shelterMerchant", name: "The Delvers' Exchange", role: `${t.name} delvers`, ...delver, state: "calm", actions: ["speak", "trade"], settlement: `hamlet-${this.rx}-${this.ry}` });
    const smith = !this.map.objects.some((o) => o.id === `town-smith-${this.rx}-${this.ry}`) && (this.townIndoorSpot() || this.townSpot(mouth)); // release 395: the town smith (smithy.ts); 441: clear of the Wayglass; 541: inside one of the town's buildings
    if (smith) this.map.objects.push({ id: `town-smith-${this.rx}-${this.ry}`, kind: "townSmith", name: `The ${t.name} Smith`, ...smith, state: "working", actions: ["smith"], settlement: `hamlet-${this.rx}-${this.ry}` });
  }
  // Release 441 (Tim: "there's no viewport, and I can't talk to any of the people... there should be... all the amenities of
  // the Ember Refuge at the new towns that spring up around the Listener's... Mouth"): every Listener town gets a Viewport
  // and a Town Keeper (Sela's forge and Aperture lens, Oren's retraining). Like the smith, they stand on open ground at least
  // TOWN_AMENITY.clear tiles from the Wayglass and TOWN_AMENITY.spacing from anything else.
  townSpot(origin) {
    const w = mapWidth(this.map, "overworld"), glass = this.map.objects.filter((o) => o.kind === "checkpoint"), objs = this.map.objects;
    const ok = (t) => !t.blocked && !t.structure && !t.environment && !t.buildingId && t.x > 2 && t.y > 2 && t.x < w - 3 && t.y < w - 3 && glass.every((g) => Math.hypot(g.x - t.x, g.y - t.y) >= TOWN_AMENITY.clear) && objs.every((o) => Math.hypot(o.x - t.x, o.y - t.y) >= TOWN_AMENITY.spacing);
    const best = this.map.tiles.filter(ok).sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y) || a.y - b.y || a.x - b.x)[0];
    return best ? { x: best.x, y: best.y } : null;
  }
  // Release 541 (Tim: "each... listener town should have... the forge master... Since each town spawns with a building, we
  // should just put the smithy inside one of those buildings"): a free floor tile inside the town's own buildings (the
  // hamlet's huts, in order), away from the door and a tile clear of anyone else. Null when there is none.
  townIndoorSpot() {
    const prefix = `hamlet-${this.rx}-${this.ry}-`, objs = this.map.objects;
    const tiles = this.map.tiles.filter((t) => String(t.buildingId || "").startsWith(prefix) && /Interior$/.test(t.structure || "") && !t.blocked && !t.environment);
    const ok = (t) => !this.map.tiles.some((q) => q.buildingId === t.buildingId && /Door$/.test(q.structure || "") && Math.abs(q.x - t.x) + Math.abs(q.y - t.y) <= 1) && objs.every((o) => Math.hypot(o.x - t.x, o.y - t.y) >= 1.5);
    const best = tiles.filter(ok).sort((a, b) => String(a.buildingId).localeCompare(String(b.buildingId)) || a.y - b.y || a.x - b.x)[0];
    return best ? { x: best.x, y: best.y } : null;
  }
  // Release 447: maximum health and stamina follow a meal as it starts and ends.
  refreshDerivedStats() { syncCharacterStats(this.save); this.player.maxStamina = this.save.maxStamina; this.player.hp = Math.min(this.player.hp, this.save.maxHp); this.player.stamina = Math.min(this.player.stamina, this.save.maxStamina); this.sync(); }
  // Release 447 (meals.ts): eat a meal of two ingredients at the cook `cookId`, who must stand near you.
  eatAt(cookId, a, b) {
    const o = this.map?.objects?.find((q) => q.id === cookId && q.cook); if (!o || Math.hypot(o.x - this.player.x, o.y - this.player.y) > 3) return { ok: false, message: (this.message = "Meals are eaten at a cook's table, in town.") };
    const before = this.save.maxHp, r = eatMeal(this.save, a, b, o.name); this.message = r.message; if (!r.ok) return r;
    this.refreshDerivedStats(); if (this.save.maxHp > before) this.player.hp = Math.min(this.save.maxHp, this.player.hp + this.save.maxHp - before); this.sync(); return r;
  }
  raiseTownAmenities() {
    const t = townAt(this.save, this.rx, this.ry); if (!t) return;
    const glass = this.map.objects.find((o) => o.kind === "checkpoint") || this.map.objects.find((o) => o.kind === "arrayMouth" || o.kind === "silentMouth") || { x: 16, y: 16 };
    const add = (id, make) => { if (this.map.objects.some((o) => o.id === id)) return; const at = this.townSpot(glass) || this.townIndoorSpot(); /* release 541: a small island leaves no open ground: indoors then */ if (at) this.map.objects.push({ id, ...make(), ...at, settlement: `hamlet-${this.rx}-${this.ry}` }); };
    add(`viewport-${this.rx}-${this.ry}`, () => ({ kind: "viewport", name: "Viewport", state: "idle", actions: ["inspect"] }));
    add(`town-keeper-${this.rx}-${this.ry}`, () => ({ kind: "townKeeper", name: `The ${t.name} Keeper`, role: "Forge and Aperture", state: "calm", actions: ["upgrade", "attune", "retrain"] }));
    if (!this.map.objects.some((o) => o.id === `town-smith-${this.rx}-${this.ry}`)) { const at = this.townIndoorSpot() || this.townSpot(glass); if (at) this.map.objects.push({ id: `town-smith-${this.rx}-${this.ry}`, kind: "townSmith", name: `The ${t.name} Smith`, ...at, state: "working", actions: ["smith"], settlement: `hamlet-${this.rx}-${this.ry}` }); } // release 541: every Listener town, Mouth or not, has its smith, indoors
    add(`town-cook-${this.rx}-${this.ry}`, () => ({ kind: "villager", name: `The ${t.name} Cook`, role: "Cook", line: "Sit. Pick two things from the pantry and I'll make you a meal.", state: "calm", actions: ["speak"], cook: true })); // release 447
  }
  // Release 369 (listener-mirror.ts): what the Listener's mirror form and its reflections may touch, built once a frame.
  mirrorWorld(dt, now) {
    if (this._mirrorWorld?.now === now) return this._mirrorWorld;
    const width = mapWidth(this.map, this.area), s = this.save, slot = (q) => slotted(s, q)?.kind === "spell";
    return (this._mirrorWorld = { now, dt, enemies: this.enemies, projectiles: this.projectiles, player: this.player,
      kit: { tool: !!rangedWeapon(s.equipment?.secondary), spell: slot("a") || slot("b") },
      open: (x, y) => { const t = this.map.tiles[Math.floor(y + .6) * width + Math.floor(x + .5)]; return !!t && !t.blocked && !t.environment; },
      spawn: (owner, x, y, i, f) => {
        const c = createCombatant("listener", x, y, false, []), hp = Math.max(1, Math.round(owner.maxHp * f.hpShare)), damage = Math.max(1, Math.round(owner.damage * MIRROR_FORM.cloneDamage)), scale = (owner.scale || 1) * MIRROR_FORM.cloneScale;
        Object.assign(c, { id: `${owner.id}:reflection:${Math.round(now)}:${i}`, mirrorClone: true, summonedBy: owner.id, noRewards: true, aggro: true, hp, maxHp: hp, damage, baseDamage: damage, scale, baseScale: scale, bodyRadius: (owner.bodyRadius || .5) * MIRROR_FORM.cloneScale, packAttacks: f.packAttacks, packBossAttacks: [], evasive: true, lifeUntil: f.lifeUntil, spread: f.spread, archer: f.archer, nextShot: now + 1200, seed: 1 + i * 7919, foundryName: "A Reflection of You" });
        ensureAI(c); this.enemies.push(c); return c;
      },
      hurt: (source, amount) => this.packHurt(source, amount, { source: "phalanx" }, now),
      hurtAs: (source, amount, o = {}) => this.packHurt(source, amount, { source: "morph", ...o }, now), // release 385
      spawnWorm: (owner, x, y, i, f) => { // release 385: a worm torn from the Morphling (listener-morph.ts)
        const c = createCombatant("listener", x, y, false, []), hp = Math.max(1, Math.round(owner.maxHp * f.hpShare)), W = MORPH_FORM.worms;
        Object.assign(c, { id: `${owner.id}:worm:${Math.round(now)}:${i}`, morphWorm: true, summonedBy: owner.id, noRewards: true, aggro: true, hp, maxHp: hp, damage: Math.max(1, Math.round(owner.damage * W.nip)), scale: W.scale, bodyRadius: .28, packAttacks: [], packBossAttacks: [], lifeUntil: f.lifeUntil, spread: f.spread, seed: 1 + i * 7919, foundryName: "A Worm of the Listener" });
        ensureAI(c); this.enemies.push(c); return c;
      },
      shock: (source, radius, damage) => addPackEffect(this.packEffects ||= [], { kind: "shock", owner: source.id, x: source.x, y: source.y, radius, arming: .35, life: .8, damage, jumpable: true }, now) });
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
    if (e.untargetable && !e.morph?.sunk && !this.enemies.some((q) => q.farArraySummon && !q.dead)) { e.untargetable = false; this.message = "With its callers gone, the Listener steps back into the light."; }
    return !!e.untargetable;
  }
  // Release 239: a world beast runs out of patience and retreats home, invulnerable and through everything; it leaves
  // each section by the gate toward home (the Wayfarer may follow) and, in the home section, goes into its home ground.
  // Release 261: the Mountain Turtle at sea freezes a floor of ice (TURTLE.seaIce). Open sea tiles become walkable
  // `seaIce` tiles (the original tile is kept and put back when it thaws). Batched every `tick` s so the ground cache
  // redraws at most that often. Transient: a section load clears it, and it is never saved.
  // Release 263: one patch at the end of each combo (once it has attacked and then made no attack for `settle` s), not a
  // trail; and a thaw does not wait for the Wayfarer: ice that melts under them drops them into the deep water.
  tickSeaIce(dt) {
    const I = TURTLE.seaIce; if (this.area !== "overworld") { this.seaIce = null; return; }
    const turtles = this.enemies.filter((e) => e.kind === "mountainTurtle" && !e.dead);
    if (!turtles.length && !this.seaIce?.tiles.size) return;
    const ice = (this.seaIce ||= { tiles: new Map(), clock: 0, next: 0, pending: [] }); ice.clock += dt;
    for (const e of turtles) {
      if (e.pack?.attack) { e.iceCombo = true; e.iceQuiet = 0; continue; }
      if (!e.iceCombo) continue;
      e.iceQuiet = (e.iceQuiet || 0) + dt; if (e.iceQuiet < I.settle) continue;
      e.iceCombo = false; e.iceQuiet = 0; (ice.pending ||= []).push({ x: e.x + .5, y: e.y + .7 });
    }
    if (ice.clock < ice.next) return; ice.next = ice.clock + I.tick;
    const map = this.map, tiles = map.tiles, width = mapWidth(map, this.area), height = mapHeight(map, this.area), R = I.radius;
    for (const { x: cx, y: cy } of ice.pending || []) {
      for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        if (x < 0 || y < 0 || x >= width || y >= height || Math.hypot(x + .5 - cx, y + .5 - cy) > R) continue;
        const i = y * width + x, t = tiles[i], held = ice.tiles.get(i);
        if (held) { held.until = ice.clock + I.life; continue; }
        if (!marineTileOpen(t)) continue;
        ice.tiles.set(i, { orig: t, until: ice.clock + I.life }); tiles[i] = { ...t, kind: "seaIce", blocked: false, seaIce: true };
      }
    }
    ice.pending = [];
    for (const [i, q] of ice.tiles) if (q.until <= ice.clock && tiles[i]?.seaIce) { tiles[i] = q.orig; ice.tiles.delete(i); }
  }
  // Release 259 (Tim: "when the blob retreats the whole mass doesn't retreat with it... a portion of it just detaches and
  // retreats home and just leaves the large mass... and then it'll just fade gracefully"; then "only if it's larger will it
  // shrink and leave a residue"). A Blob grown past its original size flees at that original size (its growth and merges
  // undone), and the extra mass stays as an inert remnant (no AI, no hits, no rewards, never saved) that lingers, then
  // fades away (BLOB_SPLIT). A Blob at its original size leaves whole.
  splitBlob(e) {
    const base = Number(e.blobBase?.scale) || 0; if (!base || !((Number(e.scale) || 0) > base * (1 + BLOB_SPLIT.grown))) return;
    const mass = this.createEnemyFromSpawn({ id: `${e.id}:remnant`, kind: e.kind, x: e.x, y: e.y, traits: [] }, this.area);
    Object.assign(mass, { blobRemnant: true, remnantLeft: BLOB_SPLIT.linger, untargetable: true, noRewards: true, aggro: false, scale: e.scale, facingX: e.facingX, hp: 1, maxHp: 1 });
    e.blobAge = 0; e.blobMerged = 0; e.scale = base; e.bodyRadius = e.blobBase.radius; // back to its original size: it regrows from blobBase each tick
    this.enemies.push(mass);
    this.message = "Part of the Blob tears away and flees. The rest of the mass slumps where it stood.";
  }
  tickWorldBeasts(dt) {
    if (this.beastNote) { this.message = this.beastNote; this.beastNote = null; }
    if (this.enemies.some((e) => e.remnantGone)) this.enemies = this.enemies.filter((e) => !e.remnantGone);
    let gone = null;
    for (const e of this.enemies) {
      if (!e.worldBeast || e.dead || !WORLD_BEASTS[e.worldBeast]) continue;
      const id = e.worldBeast, B = WORLD_BEASTS[id], q = this.save.worldBeasts?.[id]?.active;
      if (!q) continue;
      if (!e.retreating) { const f = e.hp / (e.maxHp || 1); if (f > 0 && f < 1) q.wounds = Math.round(f * 1e4) / 1e4; else delete q.wounds; } // release 353
      if(id==='astralWorm') {
        if(!e.retreating&&e.aggro&&worldBeastPatience(this.save,id,dt,e,this.beastTries===false)){beginAstralWorldRetreat(this,e);this.message=B.flee;reconcileAstralCompanions(this);this.syncAstralRiders();}
        if(q.astralRetreat){const result=tickAstralWorldRetreat(this,e,dt,{previewDungeon:(save,id,levelId)=>generatePinnedDungeon(save,id,{levelId}),applyDungeonProgress:(save,id,map)=>applyDeepDungeonProgress(save,id,map),domainAt:domainSectionAt,beforeCross:actor=>{this.astralRiderLeavesWith(actor);return !this.enemies.some(rider=>rider.astralMount?.ownerId===actor.id&&this.astralRiderHeld(rider));}});if(result.arrived){this.astralRiderLeavesWith(e);this.message=retreatEnded(this.save,id);e.dead=true;e.noRewards=true;reconcileAstralCompanions(this);}}
        continue;
      }
      if (!e.retreating && e.aggro && q.dungeon && worldBeastPatience(this.save, id, dt, e, this.beastTries === false)) { const r = beginDungeonRetreat(this.save, id, this.map); e.retreating = true; this.message = r.message; for (const m of this.enemies) if (m.summonedBy === e.id && !m.dead) { m.dead = true; m.noRewards = true; } journalOnce(this.save, `world-beast-flees:${id}:${this.save.worldBeasts[id].cycle}`, r.message, "World beasts"); }
      if (!e.retreating && e.aggro && !q.dungeon && this.area === "overworld" && worldBeastPatience(this.save, id, dt, e, this.beastTries === false)) {
        const seed = this.save.seed, gen = this.save.worldGeneration, r = beginRetreat(this.save, id, this.rx, this.ry, (x, y) => { let g = null; const region = () => (g ||= generateRegion(seed, x, y, gen)); return { get biome() { return biomeFor(seed, x, y); }, get dominant() { return region().dominant; }, get canyon() { return region().environment?.kind === "canyon"; }, get dungeon() { return (region().objects || []).some((o) => o.kind === "dungeon"); } }; }); // release 241: a section is generated only for homes that need it
        e.retreating = true; this.message = r.message;
        for (const m of this.enemies) if (m.summonedBy === e.id && !m.dead) { m.dead = true; m.noRewards = true; }
        if (id === "morphingBlob") this.splitBlob(e);
        journalOnce(this.save, `world-beast-flees:${id}:${this.save.worldBeasts[id].cycle}`, r.message, "World beasts");
      }
      if (e.retreating && !e.fleeTo && q.retreat) { const to = retreatTarget(q.retreat, id, this.map, this.rx, this.ry, q.dungeon ? {} : sectionExits(this.save.seed, this.rx, this.ry), e); Object.assign(e, { fleeTo: to, fleePath: id === "voidWalker" ? [] : retreatPath(this.map, e, to, B.retreatMoves, Number(this.map.width) || 32), fleeSpeed: RETREAT.speed, fleeFadeTime: RETREAT.fade, untargetable: true }); } // release 239: it finds its way round walls, over chasms, by bridges
      if (!e.fleeDone) continue;
      (gone ||= []).push(e);
      if (e.fleeTo.home) { const line = retreatEnded(this.save, id); this.message = line; journalOnce(this.save, `world-beast-home:${id}:${this.save.worldBeasts[id].cycle}`, line, "World beasts"); }
      else { retreatCrossed(this.save, id, e.fleeTo.side, id === "voidWalker" ? e.fleeTo.crossingEntry : null, e); this.message = `${B.name} flees ${e.fleeTo.side}, out of this section.${id === "voidWalker" ? " Its retreat continues there when you follow." : " Follow it, or it is gone."}`; }
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
      if(e.kind === "astralWorm")c.astralSeed=hashSeed(`${this.save.seed}:${c.id}:astral-v1`);
      if (e.packGuardian) c.packGuardian = true;
      if (e.skirmishId) Object.assign(c, skirmishFields(e));
      if (e.questingBeast) tuneQuestingBeast(c, this.save, characterStats(this.save));
      if (e.worldBeast) tuneWorldBeast(c, this.save, e.worldBeast, characterStats(this.save));
      if (e.worldBeast || e.questingBeast) { const share = Number((e.worldBeast ? this.save.worldBeasts?.[e.worldBeast]?.active : this.save.questingBeast?.active)?.hpShare); if (share > 0 && share < 1) c.hp = Math.max(1, Math.round(c.maxHp * share)); } // release 423: it keeps the wounds you gave it
      if(e.astralCompanionOf){if(e.astralRole==='ally'){tuneWorldBeast(c,this.save,'voidWalker',characterStats(this.save));delete c.worldBeast;}Object.assign(c,{astralCompanionOf:e.astralCompanionOf,astralRole:e.astralRole,astralAllyOf:e.astralAllyOf,noRewards:!!e.noRewards,astralMountWanted:!!e.astralMountWanted});} // release 235
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
        else if(c.dungeonRole==="objectiveGuardian"&&c.deepDungeon){({hp,damage,speed,attackCooldownScale,telegraphScale}=DEEP_WARDEN);c.staggerResistance=.5}/* release 561 */
        else if(c.dungeonRole==="gateWarden"||c.dungeonRole==="objectiveGuardian"){hp=1.35;damage=1.14;speed=1.1;attackCooldownScale=.78;telegraphScale=.92;c.staggerResistance=.5}
        else if(c.dungeonRole==="finalBoss"){hp=1.48;damage=1.2;speed=1.12;attackCooldownScale=.72;telegraphScale=.88;c.staggerResistance=.65}
        if(c.kind==="gateRevenant"){c.maxHp=360;c.hp=360;c.damage=22;c.range=5.5}
        c.maxHp=Math.round(c.maxHp*hp);c.hp=c.maxHp;c.damage=Math.max(1,Math.round(c.damage*damage));c.speedMultiplier*=speed;c.attackCooldownScale=attackCooldownScale;c.telegraphScale=telegraphScale;
      }
      if(area === "dungeon" && !c.passiveBehavior && !c.ambient && !c.astralCompanionOf && !c.worldBeast) tuneDungeonThreat(c);
      if(area === "dungeon" && !c.ambient && !c.astralCompanionOf && !c.worldBeast){const t=this.tasteThreat();if(t<1){c.maxHp=c.hp=Math.max(1,Math.round(c.maxHp*t));c.damage=Math.max(1,Math.round(c.damage*t));c.tasteScaled=t}} // release 325
      if (area === "dungeon" && !c.passiveBehavior && !c.ambient && !c.astralCompanionOf && !c.worldBeast && !c.questingBeast && !c.farArrayBoss && !e.gatePredator) { c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * DUNGEON_BOOST.hp)); c.damage = Math.max(1, Math.round(c.damage * DUNGEON_BOOST.damage)); } // release 463
      // Every monster hits harder (Tim, 2026-10-16). Foes tuned to the Wayfarer (the Questing Beast, Far Array bosses) are exempt.
      if(c.damage>0&&!c.questingBeast&&!c.worldBeast&&!c.astralCompanionOf&&!c.farArrayBoss)c.damage=Math.max(1,Math.round(c.damage*ENEMY_DAMAGE_SCALE));
      if (c.gatePredator) tuneGatePredator(c, this.save, characterStats(this.save));
      if (e.kind === "voidWalker" && e.retreating && e.retreatVitals) {
        const v = e.retreatVitals;
        if ([v.hp, v.maxHp, v.damage].every(Number.isFinite) && v.hp > 0 && v.maxHp >= v.hp && v.damage >= 0) Object.assign(c, { hp: v.hp, maxHp: v.maxHp, damage: v.damage });
      }
      if (e.mireHeart) { // release 303: the Poison Crypt's Heart is the Morphing Blob at half strength, swollen by each seepling that reached it
        const v = beastProfileVitals(WORLD_BEASTS.morphingBlob, this.save, characterStats(this.save)), merged = Math.max(0, Number(this.mireHere()?.state.merged) || 0), hp = Math.round(v.hp * MIRE_CRYPT.heartHp * (1 + merged * MIRE_CRYPT.mergeHp));
        Object.assign(c, { mireHeart: true, boss: true, hp, maxHp: hp, damage: v.damage, staggerResistance: WORLD_BEASTS.morphingBlob.staggerResistance, attackGap: WORLD_BEASTS.morphingBlob.attackGap });
      }
      if (e.marginWarden) { const W = MARGIN_RULES.warden, rev = tuneGatePredator(Object.assign(createCombatant("gateRevenant", 0, 0, false, []), { gatePredator: true }), this.save, characterStats(this.save)); Object.assign(c, { marginWarden: true, boss: false, foundryName: `Margin Warden · ${c.eliteName || c.kind}`, aggro: false }); c.maxHp = c.hp = Math.max(1, Math.round(rev.maxHp * W.revenantShare)); c.damage = Math.max(1, Math.round(rev.damage * W.revenantShare)); c.baseDamage = c.damage; c.scale = (c.scale || 1) * W.scale; c.baseScale = c.scale; } // release 459; 473: an elite at half a Gate Revenant
      ensureAI(c);
      refreshMarineBeast(c, this.map, mapWidth(this.map, area), area);
      return c;
  }
  // Release 451 (Tim: "I saw a shrine on the overworld and I clicked it. And it took me to this dungeon... When I killed the
  // guardian, he didn't spawn a door for me to leave... now I can't leave"): a Mislaid Threshold's crossing opened only its
  // entry exit, and only once every crossing guardian was dead, with no door and no word. Now felling its guardian (or the
  // crossing's boss) opens it for good (history.thresholdOpen) and raises a door where it fell; the entry exit opens too.
  // Release 461 (Tim: "a button in the options where we can toggle on or off damage numbers... how much they do to us and
  // how much we do to them"): each frame, a drop in a foe's health or the Wayfarer's becomes a rising number. Measured from
  // health itself, so every source counts; heals and new arrivals do not. Not saved; at most DAMAGE_NUMBERS.cap at once.
  trackDamageNumbers(now) {
    const D = DAMAGE_NUMBERS, list = (this.damageFloaters ||= []), add = (x, y, n, kind) => { if (n < 1) return; this._dnSeq = ((this._dnSeq || 0) + 1) % 5; list.push({ x, y: y - this._dnSeq * .12, text: String(Math.round(n)), kind, born: now, jitter: [0, .32, -.32, .16, -.16][this._dnSeq] }); };
    for (const e of this.enemies) { const hp = Math.max(0, Number(e.hp) || 0); if (e._dnHp !== undefined && hp < e._dnHp && !e.illusion) add(e.x + .5, e.y - .1, e._dnHp - hp, "dealt"); e._dnHp = hp; }
    const p = this.player, hp = Math.max(0, Number(p.hp) || 0); if (this._dnPlayer !== undefined && hp < this._dnPlayer && this._dnArea === this.areaId()) add(p.x + .5, p.y - .2, this._dnPlayer - hp, "taken"); this._dnPlayer = hp; this._dnArea = this.areaId();
    while (list.length && (now - list[0].born > D.life || list.length > D.cap)) list.shift();
  }
  // Release 463: the extra foes of a crossing (DUNGEON_BOOST.count of its ordinary ones), each on open floor near one of them.
  extraDungeonSpawns() {
    const id = String(this.areaId()), h = dungeonHistory(this.save, id), map = this.map;
    if (map.arena || isArrayRun(id) || id.startsWith("hunt-") || h.resolved || h.combatClear?.completed) return [];
    const base = (map.enemySpawns || []).filter((q) => !q.boss && !GUARDIAN_ROLES.includes(q.dungeonRole) && !q.worldBeast && !q.questingBeast && !q.marginWarden && !q.gatePredator && !q.ambient && !q.passiveBehavior && !q.objectiveId && !q.astralCompanionOf && !q.retreating && !q.farArraySummon);
    const n = Math.round(base.length * DUNGEON_BOOST.count), w = mapWidth(map, "dungeon"), out = [], taken = new Set(map.enemySpawns.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`));
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      const k = hashSeed(`${this.save.seed}:dungeon-boost:v1:${id}:${map.levelId || ""}:${i}`), b = base[k % base.length], r = DUNGEON_BOOST.near;
      const x = Math.round(b.x) + ((k >>> 8) % (r * 2 + 1)) - r, y = Math.round(b.y) + ((k >>> 14) % (r * 2 + 1)) - r;
      if (taken.has(`${x},${y}`) || !footprintOpen(map, w, x, y) || footprintHazard(map, w, x, y)) continue;
      taken.add(`${x},${y}`); out.push({ kind: b.kind, x, y, traits: b.traits, dungeonRole: b.dungeonRole || null, id: `${id}:extra:${out.length}`, extraSpawn: true });
    }
    return out;
  }
  // Release 467 (Codex audit F006: a Lattice Wayglass stood in a walled pocket no walk could reach). A Wayglass that cannot
  // be walked to from the section's largest open ground gets a straight path cleared to the nearest of it, at load.
  openWayglassApproach() {
    const map = this.map, w = mapWidth(map, "overworld"), h = Math.floor(map.tiles.length / w), glasses = (map.objects || []).filter((o) => o.kind === "checkpoint"); if (!glasses.length) return 0;
    const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && footprintOpen(map, w, x, y, true) && !footprintHazard(map, w, x, y), label = new Int32Array(w * h).fill(-1), sizes = [];
    for (let i = 0; i < w * h; i++) { if (label[i] >= 0 || !ok(i % w, (i / w) | 0)) continue; const c = sizes.length, q = [i]; label[i] = c; let n = 0; while (q.length) { const j = q.pop(); n++; const x = j % w, y = (j / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (y + dy) * w + x + dx; if (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h || label[k] >= 0 || !ok(x + dx, y + dy)) continue; label[k] = c; q.push(k); } } sizes.push(n); }
    if (!sizes.length) return 0; const main = sizes.indexOf(Math.max(...sizes)); let opened = 0;
    for (const o of glasses) {
      const gx = Math.round(o.x), gy = Math.round(o.y); let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const x = gx + dx, y = gy + dy; if (x >= 0 && y >= 0 && x < w && y < h && label[y * w + x] === main) { near = true; break; } }
      if (near) continue;
      let best = -1, bd = Infinity; for (let i = 0; i < w * h; i++) if (label[i] === main) { const d = Math.hypot(i % w - gx, ((i / w) | 0) - gy); if (d < bd) { bd = d; best = i; } }
      if (best < 0) continue; const tx = best % w, ty = (best / w) | 0, steps = Math.ceil(Math.max(Math.abs(tx - gx), Math.abs(ty - gy))), floor = map.tiles[gy * w + gx]?.kind || "ash";
      for (let k = 0; k <= steps; k++) for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = Math.round(gx + (tx - gx) * k / steps) + ox, y = Math.round(gy + (ty - gy) * k / steps) + oy, t = map.tiles[y * w + x]; if (t && (t.blocked || t.environment) && x < w && y < h) map.tiles[y * w + x] = { ...t, kind: floor, blocked: false, environment: undefined, structure: undefined, wayglassPath: true }; }
      opened++;
    }
    return opened;
  }
  // Release 461: Ink Shield. Health lost this frame (from `hpStart`) comes back, once every INK_SHIELD.seconds. The clock is
  // the run's own (not saved), so a reload finds the shield ready.
  applyInkShield(hpStart, now) {
    const p = this.player; if (!(p.hp < hpStart) || !(hpStart > 0) || this.area !== "dungeon" || now < (this._inkShieldAt || 0) || !runHas(this.save, this.areaId(), "inkShield")) return false;
    p.hp = hpStart; this._inkShieldAt = now + INK_SHIELD.seconds * 1000; (this.glyphVisuals ||= []).push({ kind: "burst", x: p.x + .5, y: p.y + .45, radius: .9, life: .3, max: .3 }); return true;
  }
  // Release 459 (marginalia.ts): what a fallen foe means for the crossing's marginalia.
  marginaliaOnKill(e) {
    const id = this.areaId(), run = marginRun(this.save, id), now = this.lastUpdateNow || 0;
    if (run && !e.summonedBy && !e.noRewards && runHas(this.save, id, "redMargin")) this.player.hp = Math.min(this.save.maxHp, this.player.hp + Math.max(1, Math.round(this.save.maxHp * RED_MARGIN.share)));
    if (run && (e.marginWarden || isDungeonGuardian(e)) && runHas(this.save, id, "quickInk")) { this.spellCooldownRemaining = 0; for (const k of Object.keys(this.save.magicSkills?.cooldowns || {})) this.save.magicSkills.cooldowns[k] = 0; }
    if (run && !e.summonedBy && !e.noRewards) { // release 461
      if (runHas(this.save, id, "hourglass")) { this.spellCooldownRemaining = Math.max(0, (this.spellCooldownRemaining || 0) - HOURGLASS.seconds); for (const k of Object.keys(this.save.magicSkills?.cooldowns || {})) this.save.magicSkills.cooldowns[k] = Math.max(0, this.save.magicSkills.cooldowns[k] - HOURGLASS.seconds); }
      if (runHas(this.save, id, "gildedMargin")) this.save.currency = (Number(this.save.currency) || 0) + GILDED.marks;
      if ((e.marginWarden || isDungeonGuardian(e)) && runHas(this.save, id, "smithsNote")) { const m = (this.save.materials ||= {}), k = hashSeed(`${id}:${e.id}:smith`) & 1 ? "armorSphere" : "weaponSphere"; m[k] = (Number(m[k]) || 0) + 1; this.glyphNotice = `Smith's Note: a ${k === "armorSphere" ? "armor" : "weapon"} sphere.`; }
      if (e.marginWarden && runHas(this.save, id, "sigilPage")) { const c = (this.save.consumables ||= {}); c.crossingSigil = (Number(c.crossingSigil) || 0) + 1; }
    }
    if (!e.marginWarden) return;
    const h = dungeonHistory(this.save, id); h.wardensSlain = [...new Set([...(h.wardensSlain || []), e.id])]; // release 473: once
    if (!run) beginMarginRun(this.save, id); const page = wardenPage(this.save, id, e.id), n = this.callReinforcements(now);
    this.defeatNotice = { title: "A MARGIN WARDEN FALLS", detail: `${page ? `${MARGINALIA[page].name}: ${MARGINALIA[page].text}` : "every page is already yours"}${n ? ` · ${n} reinforcements stir` : ""}`, kind: "danger" };
    this.message = page ? `Marginalia: ${MARGINALIA[page].name}. ${MARGINALIA[page].text}` : this.message;
  }
  // Release 459: the crossing answers a fallen warden with a few of its own kind, away from you, waking and hunting you.
  callReinforcements(now) {
    const R = MARGIN_RULES.reinforcements, live = this.enemies.filter((q) => !q.dead).length, n = Math.max(0, Math.min(R.count, R.liveCap - live)); if (!n) return 0;
    const kinds = [...new Set(this.map.enemySpawns.filter((q) => !q.boss && !q.dungeonRole && !q.worldBeast && !q.questingBeast && !q.marginWarden && q.kind !== "hollowMarshal").map((q) => q.kind))]; if (!kinds.length) return 0;
    const w = mapWidth(this.map, "dungeon"), p = this.player, spots = this.map.tiles.filter((t) => !t.blocked && !t.environment && Math.hypot(t.x - p.x, t.y - p.y) >= R.minFromPlayer && Math.hypot(t.x - p.x, t.y - p.y) <= R.minFromPlayer * 3 && footprintOpen(this.map, w, t.x, t.y) && !footprintHazard(this.map, w, t.x, t.y));
    let made = 0;
    for (let i = 0; i < n && spots.length; i++) { const h = hashSeed(`${this.areaId()}:reinforce:${Math.round(now)}:${i}`), t = spots.splice(h % spots.length, 1)[0], c = this.createEnemyFromSpawn({ kind: kinds[(h >>> 7) % kinds.length], x: t.x, y: t.y, id: `reinforcement-${Math.round(now)}-${i}` }, "dungeon"); c.aggro = true; c.reinforcement = true; this.enemies.push(c); made++; }
    return made;
  }
  chooseMarginaliaPage(id) { const r = chooseMarginalia(this.save, this.areaId(), id); this.message = r.message; this.marginOfferRequested = false; this.sync(); return r; }
  pasteMarginaliaPage(id) { const r = pasteMarginalia(this.save, this.areaId(), id); this.message = r.message; this.marginPasteRequested = false; this.sync(); return r; }
  thresholdOpen() { return !!dungeonHistory(this.save, this.areaId()).thresholdOpen || !this.enemies.some((e) => !e.dead && isCrossingGuardian(e)); }
  raiseThresholdDoor(at = null) {
    const h = dungeonHistory(this.save, this.areaId()); if (at) h.thresholdDoor = { x: Math.round(at.x), y: Math.round(at.y) };
    const p = h.thresholdOpen && h.thresholdDoor; if (!p || this.map.objects.some((o) => o.id === "threshold-door")) return null;
    const spot = nearestOpenFootprint(this.map, mapWidth(this.map, "dungeon"), p) || p, door = { id: "threshold-door", kind: "exit", name: "The Threshold Door", x: Math.round(spot.x), y: Math.round(spot.y), state: "open", actions: ["exit"] };
    this.map.objects.push(door); return door;
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
    this.syncAstralClone(e);
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
    if(e.viewportHuntId&&completeViewportHunt(this.save,e.viewportHuntId)){const hunt=this.save.viewport.contracts[e.viewportHuntId];journalOnce(this.save,`viewport-complete:${e.viewportHuntId}`,`${hunt.title} is complete. Viewport records the victory and releases its promised reward.`,hunt.title);recordViewportArrival(this.save,{id:`hunt:${e.viewportHuntId}`,title:hunt.title,text:'A consequential threat was defeated and entered the Refuge record.',kind:'hunt'});(this.questNotices||=[]).push({title:'QUEST COMPLETE',detail:`${hunt.title}${e.worldBoss?' · world threat broken':''} · return to Viewport for the enduring record`,kind:'quest'});/* release 559: queued, so another banner in the same moment never hides it */if(hunt.domain)this.save.worldFlags[`domain-cleared:${hunt.domain}`]=true}
    if (e.farArrayBoss && this.area === "dungeon" && isArrayRun(this.areaId())) { const listener = e.farArrayBoss === "listener", text = (listener ? listenerFelled(this.save) : guardianFelled(this.save)) + (listener ? latticeNote(this.save) + townNote(this.save) : ""); if (listener && beastCatchUp(this.save, liveBeastReference(this.save, characterStats(this.save)))) journalOnce(this.save, `beast-catch-up:${this.save.farArray.listeners}`, "With the Listener fallen, the great beasts of the Corridor rise to meet your strength.", "World beasts"); /* release 331 */ journalOnce(this.save, `far-array:${this.save.farArray.runs}`, text, "The Far Gate"); this.defeatNotice = { title: listener ? "THE LISTENER FALLS" : "A GATE PIECE LOCKS", detail: text, kind: "danger" }; this.message = text; }
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
      if (anchor) progress.activeAnchor = { id: anchor.id, x: anchor.x, y: anchor.y, ...(this.map.multiLevel ? { levelId: this.map.levelId || "root" } : {}), name: `${e.wingId} wing anchor` }; // release 419: on its own level
      const count = progress.defeatedWingIds.length;
      this.defeatNotice = { title: "WING GUARDIAN CLEARED", detail: `${e.wingId.toUpperCase()} WING · ${count}/${this.map.wings?.length || 3} seals broken${progress.gateOpened ? " · final gate opened" : ""}`, kind: "danger" };
      journalOnce(this.save, `deep-wing:${this.areaId()}:${e.wingId}`, `The ${e.wingId} wing guardian fell. Its return lattice now folds directly into the central chamber.${progress.gateOpened ? ` ${(this.map.wings?.length || 3) === 1 ? "The wing's seal is" : "All three seals are"} broken; the final chamber is open.` : ""}`, "The Threefold Deep");
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
    if(e.eliteId&&!e.marginWarden){const reward=completeElite(this.save,e.eliteId);/* release 473: a warden is not the elite's own hunt */if(reward){this.save.codex.elites||={};this.save.codex.elites[e.eliteId]={encountered:1,defeated:1,modules:[...(e.eliteModules||[])],variantId:e.variantId,habitat:this.areaId()};journalOnce(this.save,'elite-defeated:'+e.eliteId,`${e.eliteName} fell. Its observed aspects were ${(e.eliteModules||[]).join(', ')}. Reward: ${reward.marks} marks and one ${reward.material.replace('Sphere',' sphere')}.`,'Elite bestiary');}}
    if (this.area === 'dungeon') this.marginaliaOnKill(e); // release 459
    if (this.area === 'dungeon' && this.save.session.activeDisplacement && !e.worldBeast && !e.questingBeast && (e.boss || isCrossingGuardian(e))) { // release 451
      const h = dungeonHistory(this.save, this.areaId());
      if (!h.thresholdOpen && (e.boss || !this.enemies.some((q) => q !== e && !q.dead && isCrossingGuardian(q)))) {
        h.thresholdOpen = true; this.raiseThresholdDoor(e);
        this.defeatNotice = { title: "THE THRESHOLD OPENS", detail: "a door stands where its guardian fell · the way you came in is open too", kind: "discovery" };
        journalOnce(this.save, `threshold-door:${this.areaId()}`, "The Mislaid Threshold's guardian fell, and a door opened where it stood. Either it or the way in leads out, to stable ground far from where the seam took you.", "The Mislaid Threshold");
      }
    }
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
      levels = awardExperience(this.save, Math.round((e.seaKind ? SEA_CREATURES[e.seaKind].xp : e.boss ? 35 : 10) * Math.max(1, Number(e.xpMultiplier) || 1))); // release 399: harder (farther, deeper) foes give more
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
    const firstSpoils = takeFirstSpoils(this.save, e); // release 263: a world beast's first kill: its Sigil and Echo for certain
    const echo = echoDrop(this.save, e, e.boss || isCrossingGuardian(e) || !!e.worldBeast || !!e.questingBeast, this.save.dropCounter, firstSpoils), echoNote = echo ? `An Echo lingers: ${ECHOES[echo].name}. Set it in the Echoes screen (Pack).` : "";
    if (echo) this.glyphNotice = echoNote;
    if (e.hordeOf) { const r = hordeKill(this.save, dungeonHistory(this.save, e.hordeOf)); if (r) { this.glyphNotice = r.message; if (r.sigils) { const c = (this.save.consumables ||= {}); c.crossingSigil = (c.crossingSigil || 0) + r.sigils; } /* release 273: a Sigil at the end of each wave */ if (r.cleared) { this.defeatNotice = { title: "THE HORDE IS BROKEN", detail: r.message, kind: "danger" }; journalOnce(this.save, `horde-cleared:${e.hordeOf}`, r.message, "The Gate Revenant horde"); } } } // release 269
    if (!e.hordeOf) { const sigils = sigilDrop(this.save, e, this.map, this.save.dropCounter, firstSpoils); if (sigils) { const c = (this.save.consumables ||= {}); c.crossingSigil = (c.crossingSigil || 0) + sigils; this.glyphNotice = `A Crossing Sigil falls from ${e.packName || e.name || "the fallen"}.${echoNote ? " " + echoNote : ""}`; } } // release 263 (269: none from a horde Revenant)
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
    if (this.fistsEquipped()) { if (!echo) this.fistPress(now, _direction, this.attackAction || null); return []; } // release 493: the Iron Fists punch instead of swinging
    const glyphs = this.glyphLoadout("melee");
    if (!echo && now < (this.player.attackReadyAt || 0)) return [];
    if (!echo && now < (this.boxingUntil || 0)) this.shadowBoxStep(primaryProfile(this.save.equipment.primary).range * (1 + characterStats(this.save).attackReach) * glyphs.mods.range, now); // release 485
    if (!echo) this.player.attackReadyAt = now + 420 * glyphs.mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed);
    this.player.attackUntil = now + 240;
    this.player.meleeUntil = now + 240;
    const baseProfile = primaryProfile(this.save.equipment.primary),
      profile = { ...baseProfile, range: baseProfile.range * (1 + characterStats(this.save).attackReach) * glyphs.mods.range + (this.spellbladeOn(now) ? FIELD_PASSIVES.spellblade.reach : 0) /* release 515: Spellblade */, damage: baseProfile.damage * glyphs.mods.damage },
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
      const boxing = now < (this.boxingUntil || 0) ? BRAWLER["shadow-boxing"] : null, base = (profile.damage + characterStats(this.save).meleeBonus) * (1 + armorGlyphBonus(this.save).attackDamage) * (echo ? echo.share : 1) * pounce * (1 + (boxing?.damage || 0)) * (this.spellbladeOn(now) ? 1 + FIELD_PASSIVES.spellblade.damage : 1), /* release 515: Spellblade */ /* release 485: Shadow Boxing */ /* release 335: armor Volatile */ scattered = this.scatterCheck(e, true, glyphsReachSwarm(glyphs), now), dealt = scattered ? 0 : glyphDamage(glyphs, e, base, { echo: !!echo }, now); // release 245: plain steel scatters the Nanobot Knight
      const hpBefore = Math.max(0,e.hp);
      e.hp -= dealt;
      if (boxing && dealt > 0 && this.player.hp > 0) this.player.hp = Math.min(this.save.maxHp, this.player.hp + dealt * boxing.heal); // release 485: Shadow Boxing heals
      this.astralPlayerHit(e,Math.max(0,hpBefore-Math.max(0,e.hp)));
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
    if (!echo) this.cloneSwing(profile, { x: geometry.dx, y: geometry.dy }, now); // release 365: the Shadow Clone swings too
    // Awakened primary: every third swing releases a piercing crescent that carries the weapon's glyphs.
    if (!echo && this.save.equipment.primary?.awakened && (this.awakenSwings = (this.awakenSwings || 0) + 1) % 3 === 0)
      this.projectiles.push({ id: `crescent-${now}`, x: this.player.x + .5 + geometry.dx * .4, y: this.player.y + .45 + geometry.dy * .4, dx: geometry.dx, dy: geometry.dy, speed: 9, life: .55, damage: Math.max(1, Math.round((profile.damage + characterStats(this.save).meleeBonus) * (1 + armorGlyphBonus(this.save).attackDamage) * .7)), damageType: "physical", path: "straight", age: 0, hits: {}, pierce: 6, glyphHost: "melee", crescent: true /* release 341: armor Volatile, as on the swing */ });
    const plan = !echo && echoPlan(glyphs);
    if (plan) (this.glyphTimers ||= []).push({ at: now + plan.delay, kind: "strike", share: plan.share });
    this.reconcileConsequences();
    this.attackProfile = profile;
    return hits;
  }
  fireSecondary(now = 0, direction = null) {
    { const bt = rangedWeapon(this.save.equipment.secondary)?.brawlerTool; if (bt) return this.brawlerTool(bt, now, direction); } // release 493: a tap uses Hammerfall or Great Sweep
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
    this.player.attackReadyAt = now + 360 * glyphs.mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed);
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
        // Release 529 (Tim: "make the needle caster scale with your might... a projectile that scales with [might]"): a physical
        // shot (the Needle Caster) adds the melee bonus (Might) and armor's blow bonus; magic shots keep Focus and spell damage.
        (weapon.damage + (weapon.damageType === "physical" ? derived.meleeBonus : derived.magicBonus)) * (weapon.damageType === "magic" ? 1 + armorGlyphBonus(this.save).spellDamage : 1 + armorGlyphBonus(this.save).attackDamage) * // release 335: armor Ignite on magic shots only
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
    if (fieldOn(this.save, "charged-air") && this.spellRunning(now)) { const C = FIELD_PASSIVES["charged-air"]; shot.damage = Math.max(1, Math.round(shot.damage * (1 + C.damage))); shot.scale = C.scale; shot.grow = C.grow; if (shot.blastRadius) shot.blastRadius *= C.blast; } // release 515: Charged Air
    if (weapon.pellets) { // release 533 (tool-forms.ts): the Blunderbuss's three-pellet cone, or with Arc Wave one wide wave
      if (fieldOn(this.save, "arc-wave")) { shot.arcWave = true; shot.damage = Math.max(1, Math.round(shot.damage * ARC_WAVE.share)); shot.grow = (shot.grow || 0) + ARC_WAVE.grow; shot.pierce = (shot.pierce || 0) + ARC_WAVE.pierce; shot.speed = ARC_WAVE.speed; } // release 549: every pellet becomes a wave, along the same cone
      for (let i = 1; i < weapon.pellets; i++) { const a = (i % 2 ? 1 : -1) * weapon.spread * Math.ceil(i / 2), c = Math.cos(a), sn = Math.sin(a); this.projectiles.push({ ...shot, id: `${shot.id}-pellet${i}`, dx: shot.dx * c - shot.dy * sn, dy: shot.dx * sn + shot.dy * c, hits: {} }); }
    }
    if (this.shadowCloneActive(now) && !this.shadowClone.charging && !this.shadowClone.boxing /* release 503: the Shadow Boxing echo only swings */) { const at = clonePosition(this.player, this.shadowClone), cd = this.cloneAimFrom(at) || d; this.projectiles.push({ ...shot, id: `${shot.id}-shadow`, x: at.x + .5 + cd.x * .35, y: at.y + .45 + cd.y * .35, dx: cd.x, dy: cd.y, hits: {}, damage: Math.max(1, Math.round(shot.damage * SHADOW_CLONE.share)), glyphHost: null, shadow: true }); } // release 365; 387: at the locked target
    const plan = echoPlan(glyphs);
    echoEvent(this, "shot", now, { shot });
    if (this.save.equipment.secondary?.awakened) for (const a of [-.21, .21]) { const c = Math.cos(a), sn = Math.sin(a); this.projectiles.push({ ...shot, id: `${shot.id}-fan${a}`, dx: shot.dx * c - shot.dy * sn, dy: shot.dx * sn + shot.dy * c, hits: {}, damage: Math.max(1, Math.round(shot.damage * .5)) }); } // awakened tool: a three-shot fan
    if (plan) plan.copies.forEach((c, i) => (this.glyphTimers ||= []).push({ at: now + c.delay, kind: "shot", shot: { ...shot, id: shot.id + (i ? `-echo${i + 1}` : "-echo"), hits: {}, damage: Math.max(1, Math.round(shot.damage * c.share)), echo: true } })); // release 507: a third shot with two Echo glyphs
    return true;
  }
  // Spell slots A and B (release 115): each button casts whatever its slot holds. Release 309: or builds, or uses the item.
  castSlot(slot, now = this.lastUpdateNow || 0) {
    const t = slotTool(this.save, slot);
    if (t) return t.tool === "build" ? this.pressBuild(false) : this.useButtonItem(t.item, now);
    const c = slotted(this.save, slot);
    if (!c) { this.message = `Slot ${slot.toUpperCase()} is empty — fill it in the Arcanum.`; return false; }
    this.castAction = slot === "b" ? "spell2" : "spell"; try { return c.kind === "skill" ? this.activateApertureSkill(c.id) : this.castSpell(c.id); } finally { this.castAction = null; } // release 417: the button a held Shadow Clone listens to
  }
  castKey(key) {
    const c = CASTABLES[key]; if (!c || !availableCastables(this.save).includes(key)) { this.message = "Not learned yet."; return false; }
    return c.kind === "skill" ? this.activateApertureSkill(c.id) : this.castSpell(c.id);
  }
  // The Build action, from whichever button holds it (release 269 mend, 267 build mode, 265 walls and blocks).
  pressBuild(moving = false) {
    const p = this.player;
    if (this.mendTarget()) { this.message = mendSkiff(this.save).message; return true; }
    if (this.area === "overworld" && aboard(this.save)) { this.message = "Hold Build to raise a hull shield."; return false; }
    const at = buildSpot(p), r = placeBuild(this, at.x, at.y, undefined, moving); this.message = r.message; this.save.aimMode = "build"; this.save.toolMode = false; return r.ok; // the button also turns on build mode: taps build
  }
  useButtonItem(item, now = this.lastUpdateNow || 0) {
    if (!item) { this.message = `Preset ${(this.save.magicSkills.preset || 0) + 1}: choose its item in Pack → Supplies.`; return false; }
    // Release 507 (Tim: "something's broken with a submersible. I have it set on an item... I'm pressing it and nothing's
    // happening"): building the robot spends the frame, so the count reads 0 while the frame still calls the robot up. Ashore,
    // a built robot (or drone) answers the button whatever the count; toggleMech gives its own reasons when it cannot.
    if (!(item === "submersible" && !aboard(this.save) && this.save.mech?.built) && !((this.save.consumables?.[item] || 0) > 0)) { this.message = "None left."; return false; }
    return this.useConsumable(item, now);
  }
  castSpell(spellId = null) {
    if(!spellId&&this.save.magicSkills?.selected&&skillRank(this.save,this.save.magicSkills.selected)>0)return this.activateApertureSkill(this.save.magicSkills.selected);
    if (spellId && SPELLS[spellId]) this.save.equippedSpell = spellId; // the readied spell is the glyph host
    const spell = SPELLS[this.save.equippedSpell] || SPELLS["ember-ring"], cds = (this.save.magicSkills ||= {}).cooldowns ||= {}, key = `spell:${spell.id}`, remaining = spellId ? cds[key] || 0 : this.spellCooldownRemaining; // slots use per-spell cooldowns; the legacy call keeps its single one
    if (spell.id === "shadow-clone") return this.castShadowClone(spell, cds, key); // release 365
    if (spell.brawler) return this.castBrawler(spell, cds, key); // release 483
    if (spell.id === "orbit-volley") return this.castOrbitVolley(spell, cds, key); // release 487
    if (spell.id === "fire-burst") return this.castFireBurst(spell, cds, key); // release 547
    if (remaining > 0) {
      this.message = `${spell.name} recovers in ${Math.ceil(remaining)}s.`;
      return false;
    }
    let x = this.player.x + 0.5,
      y = this.player.y + 0.45;
    // Release 347: spells land on a locked target. Release 479 (Tim: "the spells... just get cast in some random direction, they
    // should just get cast at whatever enemy... I'm targeting... either it's auto target or... the enemy that I have... tab
    // targeted"): a tap left over from earlier no longer sends a spell off to where it was. Release 481 (Tim: "first lock then
    // enemy then tap"): a target you locked first; then auto target, the foe nearest you (and ahead) within
    // AUTO_AIM.spellScale × the spell's range; then a spot you tapped just now (while its reticle shows). With none of them,
    // the spell lands where you stand, as before.
    { const now = this.lastUpdateNow || 0, t = this.lockedTarget(); let foe = t && !t.untargetable && !t.hidden ? t : null;
      if (this.reticle && !(this.reticle.life > 0)) this.save.pendingAim = null; // the tap's reticle has faded: the aim is stale
      if (!foe) foe = pickMeleeTarget(this.player, this.enemies, this.map, mapWidth(this.map, this.area), spell.maxRange * AUTO_AIM.spellScale)?.e || null;
      if (foe) { this.save.pendingAim = { x: foe.x + .5, y: foe.y + .45 }; this.aimMark = { id: foe.id, until: now + AIM_MARK.ms }; } }
    if (this.save.pendingAim) {
      const dx = this.save.pendingAim.x - x,
        dy = this.save.pendingAim.y - y,
        m = Math.hypot(dx, dy),
        scale = m > spell.maxRange ? spell.maxRange / m : 1;
      x += dx * scale;
      y += dy * scale;
      this.save.pendingAim = null;
    }
    const glyphs = this.glyphLoadout("spell", spell.id), cast = {
      id: `spell-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`,
      kind: spell.id,
      x,
      y,
      life: spell.lifetime,
      radius: spell.radius * glyphs.mods.radius,
      pulse: spell.pulse,
      untilPulse: 0,
      damage: Math.max(1, Math.round((spell.damage + characterStats(this.save).magicBonus) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage))), // release 335: armor Ignite scales the whole spell
      pulseIndex: 0,
      hits: {},
      glyphHost: "spell",
      glyphSpell: spell.id,
    };
    this.effects.push(cast);
    const plan = echoPlan(glyphs);
    if (plan) this.effects.push({ ...cast, id: cast.id + "-echo", hits: {}, delay: spell.lifetime, damage: Math.max(1, Math.round(cast.damage * plan.share)), echo: true });
    const cooldown = spell.cooldown * glyphs.mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    cds[key] = cooldown; if (!spellId) this.spellCooldownRemaining = cooldown;
    echoEvent(this, "spell", this.lastUpdateNow || 0);
    this.message = `${spell.name} answers.`;
    return true;
  }
  // Release 547 (tool-forms.ts FIRE_BURST): a fan of cinder shells toward the lock, else the nearest foe in reach, else the way
  // you face; each bursts (the projectile detonation) where it lands or on the first foe it meets.
  castFireBurst(spell, cds, key, now = this.lastUpdateNow || 0) {
    if ((cds[key] || 0) > 0) { this.message = `${spell.name} recovers in ${Math.ceil(cds[key])}s.`; return false; }
    const p = this.player, cx = p.x + .5, cy = p.y + .45, t = this.lockedTarget(), foe = t && !t.untargetable && !t.hidden ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), spell.maxRange * AUTO_AIM.spellScale)?.e || null;
    const d = foe ? projectileDirection(foe.x + .5 - cx, foe.y + .45 - cy, p.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing), glyphs = this.glyphLoadout("spell", spell.id), F = FIRE_BURST;
    if (foe) this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    const damage = Math.max(1, Math.round((spell.damage + characterStats(this.save).magicBonus) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage)));
    for (let i = 0; i < F.count; i++) { const a = (F.count > 1 ? i / (F.count - 1) - .5 : 0) * F.spread, c = Math.cos(a), sn = Math.sin(a);
      this.projectiles.push({ id: `fire-burst-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, x: cx + d.x * .3, y: cy + d.y * .3, dx: d.x * c - d.y * sn, dy: d.x * sn + d.y * c, speed: F.speed, life: F.reach * glyphs.mods.range / F.speed, damage, damageType: "magic", path: "grenade", age: 0, hits: {}, blastRadius: spell.radius * glyphs.mods.radius, glyphHost: "spell", glyphSpell: spell.id, fireBomb: true }); }
    cds[key] = spell.cooldown * glyphs.mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    echoEvent(this, "spell", now); this.message = `${spell.name}!`;
    return true;
  }
  // Release 487 (orbit-volley.ts): the first press gathers the orbs, the second launches them; left alone they go by
  // themselves when the window closes. `this.orbit` is runtime only: { start, where, flight? }.
  castOrbitVolley(spell, cds, key, now = this.lastUpdateNow || 0) {
    const o = this.orbit;
    if (o && !o.flight) return this.launchOrbit(false, now);
    if (o?.flight) { this.message = "The volley is still in flight."; return false; }
    if ((cds[key] || 0) > 0) { this.message = `${spell.name} recovers in ${Math.ceil(cds[key])}s.`; return false; }
    this.orbit = { start: now, where: `${this.area}:${this.areaId()}` }; echoEvent(this, "spell", now);
    this.message = "Orbs gather round you. Press again to launch them: launch while they glow gold for a perfect volley.";
    return true;
  }
  launchOrbit(timedOut = false, now = this.lastUpdateNow || 0) {
    const o = this.orbit, spell = SPELLS["orbit-volley"]; if (!o || o.flight) return false;
    const held = (now - o.start) / 1000, L = orbitLaunch(held, timedOut), glyphs = this.glyphLoadout("spell", spell.id), p = this.player, cx = p.x + .5, cy = p.y + .45, cds = this.save.magicSkills.cooldowns;
    const power = (spell.damage + characterStats(this.save).magicBonus) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage);
    const t = this.lockedTarget(), foe = t && !t.untargetable && !t.hidden ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), ORBIT.reach)?.e, d = foe ? projectileDirection(foe.x - p.x, foe.y - p.y, p.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing);
    const at = foe ? { x: foe.x + .5, y: foe.y + .45 } : { x: cx + d.x * ORBIT.reach, y: cy + d.y * ORBIT.reach };
    if (foe) this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    o.flight = { x: cx, y: cy, tx: at.x, ty: at.y, radius: L.radius, perfect: L.perfect, damage: Math.max(1, Math.round(power * L.share)) };
    cds["spell:orbit-volley"] = spell.cooldown * glyphs.mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    this.message = timedOut ? "The orbs go on their own." : L.perfect ? "A perfect volley!" : "The volley flies.";
    return true;
  }
  tickOrbit(dt, now = this.lastUpdateNow || 0) {
    const o = this.orbit; if (!o) return;
    if (o.where !== `${this.area}:${this.areaId()}`) { this.orbit = null; return; } // a new area: the orbs scatter
    if (!o.flight) { if ((now - o.start) / 1000 >= ORBIT.window) this.launchOrbit(true, now); return; }
    const f = o.flight, w = mapWidth(this.map, this.area), blocked = (x, y) => { const tile = this.map.tiles[Math.floor(y) * w + Math.floor(x)]; return !tile || tile.blocked; };
    const near = () => this.enemies.find((e) => !e.dead && !e.untargetable && !e.hidden && Math.hypot(e.x + .5 - f.x, e.y + .45 - f.y) <= .6 + Math.max(0, enemyBodyRadius(e) - .38));
    const dist = Math.hypot(f.tx - f.x, f.ty - f.y), stepLen = ORBIT.speed * dt;
    if (!near() && dist > stepLen) { const nx = f.x + (f.tx - f.x) / dist * stepLen, ny = f.y + (f.ty - f.y) / dist * stepLen; if (!blocked(nx, ny)) { f.x = nx; f.y = ny; if (!near()) return; } }
    else if (!near()) { f.x = f.tx; f.y = f.ty; }
    const burst = { id: `spell-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind: "orbit-volley", x: f.x, y: f.y, life: .3, radius: f.radius, pulse: 99, untilPulse: 0, damage: f.damage, pulseIndex: 0, hits: {}, glyphHost: "spell", glyphSpell: "orbit-volley" };
    this.effects.push(burst);
    { const plan = echoPlan(this.glyphLoadout("spell", "orbit-volley")); if (plan) this.effects.push({ ...burst, id: burst.id + "-echo", hits: {}, delay: .2, damage: Math.max(1, Math.round(burst.damage * plan.share)), echo: true }); } // release 503: Echo bursts the ball again
    if (f.perfect) { const V = ORBIT.vortex; this.effects.push({ ...burst, id: burst.id + "-vortex", kind: "gravity-well", radius: V.radius, life: V.life, pulse: V.pulse, untilPulse: V.pulse, damage: Math.max(1, Math.round(f.damage * V.share)), hits: {} }); }
    this.orbit = null;
  }
  // Release 485: Shadow Boxing carries the Wayfarer to the foe before a swing when it is out of reach (the lock, else the
  // nearest within `stick` tiles past the reach), in quarter-tile steps that stop at walls and lethal ground.
  shadowBoxStep(reach, now = this.lastUpdateNow || 0) {
    const B = BRAWLER["shadow-boxing"], p = this.player, w = this.glyphWorld(now), t = this.lockedTarget(), foe = t && !t.untargetable && !t.hidden ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), reach + B.stick)?.e;
    if (!foe) return false;
    const gap = () => Math.hypot(foe.x - p.x, foe.y - p.y), stop = Math.max(.8, reach * .7);
    if (gap() <= reach * .9 || gap() > reach + B.stick + 1) return false;
    for (let i = 0; i < 40 && gap() > stop; i++) { const d = projectileDirection(foe.x - p.x, foe.y - p.y, p.facing), nx = p.x + d.x * .25, ny = p.y + d.y * .25; if (!w.canStand(nx, ny)) break; p.x = nx; p.y = ny; }
    p.meleeAim = projectileDirection(foe.x - p.x, foe.y - p.y, p.facing); this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    return true;
  }
  // Release 483 (brawler-spells.ts): a swing's damage before the target's own defences: the weapon, the melee bonus, the
  // melee glyph mods and every melee-damage multiplier (armor glyphs, meals, pages, the empowered robot).
  meleePower() { const glyphs = hostLoadout(this.save, "melee"); return (primaryProfile(this.save.equipment.primary).damage * glyphs.mods.damage + characterStats(this.save).meleeBonus) * (1 + armorGlyphBonus(this.save).attackDamage); }
  // Where a brawler spell goes: the swing's own aim (the lock, else auto aim within `reach`, else the way you face). Returns
  // { d: unit direction, foe }.
  brawlerAim(reach) {
    const w = mapWidth(this.map, this.area), t = this.lockedTarget(), locked = t && !t.untargetable && !t.hidden ? t : null, pick = locked ? null : pickMeleeTarget(this.player, this.enemies, this.map, w, reach), foe = locked || pick?.e || null;
    const d = foe ? projectileDirection(foe.x - this.player.x, foe.y - this.player.y, this.player.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, this.player.facing);
    if (foe) this.aimMark = { id: foe.id, until: (this.lastUpdateNow || 0) + AIM_MARK.ms };
    return { d, foe };
  }
  brawlerEffect(spell, x, y, damage, extra = {}) {
    const fx = { id: `spell-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind: spell.id, brawler: true, x, y, life: spell.lifetime, radius: spell.radius, pulse: spell.pulse, untilPulse: 0, damage: Math.max(1, Math.round(damage)), pulseIndex: 0, hits: {}, glyphHost: "spell", glyphSpell: spell.id, ...extra };
    this.effects.push(fx); return fx;
  }
  castBrawler(spell, cds, key, now = this.lastUpdateNow || 0) {
    if ((cds[key] || 0) > 0) { this.message = `${spell.name} recovers in ${Math.ceil(cds[key])}s.`; return false; }
    const B = BRAWLER[spell.id], p = this.player, cx = p.x + .5, cy = p.y + .45;
    cds[key] = spell.cooldown * this.glyphLoadout("spell", spell.id).mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    if (spell.id === "aegis") { this.aegisUntil = now + B.ms; echoEvent(this, "spell", now); this.message = "Aegis: every blow is turned aside."; return true; } // release 485
    if (spell.id === "shadow-boxing") { this.boxingUntil = now + B.seconds * 1000; echoEvent(this, "spell", now); this.message = "Shadow Boxing: your swings follow your foe."; if (echoPlan(this.glyphLoadout("spell", spell.id)) && !this.shadowCloneActive(now)) { const o = cloneOffset(null, this.save.lastAim, SHADOW_CLONE.near); this.shadowClone = { ox: o.x, oy: o.y, until: now + BRAWLER_ECHO.echoClone * 1000, boxing: true }; this.message += " An echo of you boxes beside you."; } return true; } // release 485; 503: Echo spawns a short melee clone
    return false;
  }
  // Release 493: Hammerfall and Great Sweep as tools (BRAWLER numbers). A tool's power: (Iron-Fists-style base + its power
  // × perPower + the melee bonus) × the tool glyph mods × every melee-damage multiplier.
  toolPower() { const item = this.save.equipment.secondary, glyphs = hostLoadout(this.save, "tool"); return (IRON_FISTS.base + Math.max(1, Number(item?.power) || 1) * IRON_FISTS.perPower + characterStats(this.save).meleeBonus) * glyphs.mods.damage * (1 + armorGlyphBonus(this.save).attackDamage); }
  brawlerTool(kind, now = this.lastUpdateNow || 0, direction = null) {
    if (kind === "great-sweep" && fieldOn(this.save, "nanoknives")) return this.nanoknivesPress(now); // release 533
    const B = BRAWLER[kind], p = this.player, boxing = now < (this.boxingUntil || 0) ? BRAWLER["shadow-boxing"] : null; if (!B || now < (this.toolReadyAt || 0)) return false;
    if (boxing && kind === "great-sweep") this.shadowBoxStep(B.radius * .6, now); // release 495: Shadow Boxing carries the sweep to the foe
    const cx = p.x + .5, cy = p.y + .45;
    this.toolReadyAt = now + B.cooldown * 1000 * this.glyphLoadout("tool").mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed);
    const fx = (x, y, extra = {}) => { const e = { id: `tool-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind, brawler: true, x, y, life: B.lifetime, radius: B.radius, pulse: 99, untilPulse: 0, damage: Math.max(1, Math.round(this.toolPower() * B.share * (1 + (boxing?.damage || 0)))), pulseIndex: 0, hits: {}, glyphHost: "tool", healShare: boxing?.heal || 0, ...extra }; /* release 495: boxing damage and heal */ this.effects.push(e); return e; };
    if (kind === "hammerfall") {
      const reach = B.reach + (boxing ? boxing.stick : 0); // release 495: with Shadow Boxing the hammer reaches farther
      let { d, foe } = this.brawlerAim(reach + 1); if (!foe && direction && Math.hypot(direction.x, direction.y) > .01) d = projectileDirection(direction.x, direction.y, p.facing);
      const fd = foe ? Math.hypot(foe.x + .5 - cx, foe.y + .45 - cy) : Infinity, at = fd <= reach + .5 ? { x: foe.x + .5, y: foe.y + .45 } : { x: cx + d.x * B.reach, y: cy + d.y * B.reach };
      fx(at.x, at.y, { delay: B.delay, stun: B.stun });
      if (fieldOn(this.save, "corridor-golem")) this.raiseGolem(at, now + B.delay * 1000); // release 535
    } else fx(cx, cy); // Great Sweep: all round you
    { const main = this.effects[this.effects.length - 1], plan = echoPlan(this.glyphLoadout("tool")); if (plan && main) plan.copies.forEach((c, i) => this.effects.push({ ...main, id: main.id + (i ? `-echo${i + 1}` : "-echo"), hits: {}, delay: (main.delay || 0) + BRAWLER_ECHO.toolGap * (i + 1), damage: Math.max(1, Math.round(main.damage * c.share)), echo: true })); } // release 503: Echo in the tool repeats the blow; 507: one more per Echo glyph, bang, bang, boom
    this.cloneSwing({ ...BRAWLER_ECHO.cloneArc, damage: primaryProfile(this.save.equipment.primary).damage }, projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing), now); // release 503: the Shadow Clone swings along
    p.attackUntil = now + 240; this.message = kind === "hammerfall" ? "Hammerfall!" : "Great Sweep!";
    return true;
  }
  // Release 533 (tool-forms.ts NANOKNIVES): the Great Sweep with Nanoknives. `knives` is runtime only.
  nanoknivesPress(now = this.lastUpdateNow || 0) {
    if (now < (this.toolReadyAt || 0)) return false;
    this.toolReadyAt = now + NANOKNIVES.cooldown * 1000 * this.glyphLoadout("tool").mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed);
    const thrown = this.launchKnives(now);
    this.knives = { start: now, count: NANOKNIVES.count, where: `${this.area}:${this.areaId()}` };
    this.player.attackUntil = now + 200; this.message = thrown ? "Nanoknives away!" : "Nanoknives rise.";
    return true;
  }
  knifeFoe(range = NANOKNIVES.range) { const t = this.lockedTarget(), p = this.player; return t && !t.untargetable && !t.hidden && Math.hypot(t.x - p.x, t.y - p.y) <= range ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), range)?.e || null; }
  launchKnives(now = this.lastUpdateNow || 0) {
    const k = this.knives; if (!k) return false; this.knives = null;
    const p = this.player, cx = p.x + .5, cy = p.y + .45, foe = this.knifeFoe(), K = NANOKNIVES, damage = Math.max(1, Math.round(this.toolPower() * K.share)), pierce = this.glyphLoadout("tool").mods.pierce;
    if (foe) this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    for (let i = 0; i < k.count; i++) {
      const o = knifeOffset(i, k.count, now / 1000), x = cx + o.x, y = cy + o.y, d = foe ? projectileDirection(foe.x + .5 - x, foe.y + .45 - y, p.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing);
      this.projectiles.push({ id: `knife-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, x, y, dx: d.x, dy: d.y, speed: K.speed, life: K.life, damage, damageType: "physical", path: "straight", age: 0, hits: {}, glyphHost: "tool", pierce, seekId: foe?.id || null, seekTurn: K.seekTurn, knife: true });
    }
    return true;
  }
  tickKnives(now = this.lastUpdateNow || 0) {
    const k = this.knives; if (!k) return;
    if (k.where !== `${this.area}:${this.areaId()}` || !fieldOn(this.save, "nanoknives") || rangedWeapon(this.save.equipment.secondary)?.brawlerTool !== "great-sweep") { this.knives = null; return; } // a new area or another tool: they scatter
    if (now - k.start >= NANOKNIVES.arm * 1000 && this.knifeFoe(NANOKNIVES.autoRange)) this.launchKnives(now); // release 539: a foe near: they go on their own; none: they wait
  }
  // Release 537 (tool-forms.ts CLUSTER): a bursting Bombard shell throws its bomblets (not hostile shells, not bomblets).
  clusterShell(shot) {
    if (shot.hostile || shot.bomblet || shot.glyphHost !== "tool" || !fieldOn(this.save, "cluster-shell")) return;
    const turn = (hashSeed(shot.id) / 4294967296) * Math.PI * 2; // release 539: a fresh line through the burst for every shell (from its id, so a replay matches)
    for (let i = 0; i < CLUSTER.count; i++) { const a = turn + i * Math.PI * 2 / CLUSTER.count, c = Math.cos(a), sn = Math.sin(a); // evenly round it: two at opposite ends
      const r = (shot.blastRadius || 2) * CLUSTER.radius; // release 539: it flies its own blast radius, so that blast's edge meets the first burst's centre
      this.projectiles.push({ id: `${shot.id}-cluster${i}`, x: shot.x, y: shot.y, dx: c, dy: sn, speed: CLUSTER.speed, life: r / CLUSTER.speed, damage: Math.max(1, Math.round(shot.damage * CLUSTER.share)), damageType: shot.damageType, path: "grenade", age: 0, hits: {}, blastRadius: r, glyphHost: "tool", bomblet: true }); }
  }
  // Release 539: what shortens a tool's cooldown (its glyphs, armor's attack speed); Wellspring Ground also runs it down faster.
  toolCooldownScale() { return this.glyphLoadout("tool").mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed); }
  // Release 535 (tool-forms.ts GOLEM): the Hammerfall's Corridor Golem. `golem` and `golemReadyAt` are runtime only.
  raiseGolem(at, start) {
    if (this.golem || start < (this.golemReadyAt || 0)) return false;
    this.golem = { x: at.x, y: at.y, start, nextAt: start + GOLEM.rise * 1000, punches: GOLEM.punches, targetId: null, sinkAt: null, face: 1, where: `${this.area}:${this.areaId()}` };
    this.golemReadyAt = start + GOLEM.cooldown * 1000 * this.toolCooldownScale(); return true; // release 539: shortened like the tool's own cooldown
  }
  golemFoe(g) {
    const live = (e) => e && !e.dead && !e.untargetable && !e.hidden && e.kind !== "npc" && Math.hypot(e.x + .5 - g.x, e.y + .45 - g.y) <= GOLEM.range;
    const held = this.enemies.find((e) => e.id === g.targetId); if (live(held)) return held;
    let best = null, bd = Infinity; for (const e of this.enemies) { if (!live(e)) continue; const d = Math.hypot(e.x + .5 - g.x, e.y + .45 - g.y); if (d < bd) { bd = d; best = e; } } return best;
  }
  tickGolem(now = this.lastUpdateNow || 0) {
    const g = this.golem; if (!g) return;
    if (g.where !== `${this.area}:${this.areaId()}`) { this.golem = null; return; } // a new area: it stays in the old floor
    if (g.sinkAt) { if (now - g.sinkAt >= GOLEM.sink * 1000) this.golem = null; return; }
    if (now < g.nextAt) return;
    const foe = g.punches > 0 ? this.golemFoe(g) : null; if (!foe) { g.sinkAt = now; return; } // blows spent or no one near: back into the floor
    const fx = foe.x + .5, fy = foe.y + .45, d = Math.hypot(fx - g.x, fy - g.y) || 1; // the dash: up to the foe, `reach` short
    g.x = fx - (fx - g.x) / d * Math.min(d, GOLEM.reach); g.y = fy - (fy - g.y) / d * Math.min(d, GOLEM.reach); g.face = fx >= g.x ? 1 : -1;
    this.effects.push({ id: `tool-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind: "golem-punch", x: fx, y: fy, life: .2, radius: GOLEM.radius, pulse: 99, untilPulse: 0, damage: Math.max(1, Math.round(this.toolPower() * GOLEM.share)), pulseIndex: 0, hits: {}, glyphHost: "tool", stun: GOLEM.stun });
    g.targetId = foe.id; g.punches--; g.punchAt = now; g.nextAt = now + GOLEM.gap * 1000;
  }
  // Release 489 (brawler-spells.ts IRON_FISTS): the Iron Fists tool. A press of Tool throws the next punch of the combo while
  // its window is open; the dash punch starts a combo and charges while the button (`action`) is held. A world tap (no
  // button to hold) throws it at once. `fistCombo` and `fistCharge` are runtime only.
  fistsEquipped() { return !!primaryProfile(this.save.equipment.primary)?.fist; } // release 493: the Iron Fists are a weapon
  fistPower() { const item = this.save.equipment.primary, glyphs = hostLoadout(this.save, "melee"); return (this.spellbladeOn() ? 1 + FIELD_PASSIVES.spellblade.damage : 1) /* release 515: Spellblade */ * (IRON_FISTS.base + Math.max(1, Number(item?.power) || 1) * IRON_FISTS.perPower + characterStats(this.save).meleeBonus) * glyphs.mods.damage * (1 + armorGlyphBonus(this.save).attackDamage); }
  fistPress(now = this.lastUpdateNow || 0, direction = null, action = null) {
    if (this.fistCharge || now < (this.fistRecoverUntil || 0)) return false;
    const c = this.fistCombo, live = c && now <= c.until && c.step < IRON_FISTS.punches.length;
    if (live) { const next = c.step + 1, P = IRON_FISTS.punches[next - 1]; if (action && P.echoes && hostLoadout(this.save, "melee").count("echo") >= P.echoes) { this.fistCharge = { action, start: now, direction, step: next }; return true; } return this.fistPunch(next, 0, now, direction); } // release 503: Echo glyphs let the jab and uppercut charge
    this.fistCombo = null;
    if (action) { this.fistCharge = { action, start: now, direction }; return true; }
    return this.fistPunch(1, 0, now, direction);
  }
  fistPunch(step, charge = 0, now = this.lastUpdateNow || 0, direction = null) {
    const F = IRON_FISTS, P = F.punches[step - 1], p = this.player, w = this.glyphWorld(now), reach = P.dash + (P.chargeDash || 0) + 1, boxing = now < (this.boxingUntil || 0) ? BRAWLER["shadow-boxing"] : null;
    let d = direction && Math.hypot(direction.x, direction.y) > .01 && !this.lockedTarget() ? projectileDirection(direction.x, direction.y, p.facing) : null, dist = P.dash;
    if (P.rush) { // release 491: the dash punch rushes to the targeted foe in range, else lands in place
      const rush = P.rush + (boxing ? boxing.stick : 0), t = this.lockedTarget(), locked = t && !t.untargetable && !t.hidden && Math.hypot(t.x - p.x, t.y - p.y) <= rush + 1 ? t : null, foe = locked || pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), rush)?.e;
      if (foe) { d = projectileDirection(foe.x - p.x, foe.y - p.y, p.facing); dist = Math.max(0, Math.hypot(foe.x - p.x, foe.y - p.y) - P.stop); this.aimMark = { id: foe.id, until: now + AIM_MARK.ms }; }
      else d ||= projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing);
    } else { if (boxing && !d) this.shadowBoxStep(P.radius + .4, now); d ||= this.brawlerAim(reach).d; } // release 493: boxing carries the jab and uppercut to the foe
    if (step === 1) p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, now + F.guardMs);
    for (let k = .25; k <= dist + 1e-6; k += .25) { const nx = p.x + d.x * .25, ny = p.y + d.y * .25; if (!w.canStand(nx, ny)) break; p.x = nx; p.y = ny; }
    const at = { x: p.x + .5 + d.x * .7, y: p.y + .45 + d.y * .7 }, landed = this.enemies.some((e) => !e.dead && !e.untargetable && !e.hidden && Math.hypot(e.x + .5 - at.x, e.y + .45 - at.y) <= P.radius + Math.max(0, enemyBodyRadius(e) - .38));
    const before = step === 1 ? [] : this.fistCombo?.landed || [], finisher = step === 3 && before[0] && before[1];
    this.effects.push({ id: `fist-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind: step === 3 ? "fist-uppercut" : "iron-fist", brawler: true, x: at.x, y: at.y, life: step === 3 ? .3 : .25, radius: P.radius, pulse: 99, untilPulse: 0, damage: Math.max(1, Math.round(this.fistPower() * (P.share + (P.chargeShare || 0) * charge) * (finisher ? F.finisher : 1) * (1 + (boxing?.damage || 0)))), pulseIndex: 0, hits: {}, glyphHost: "melee", healShare: boxing?.heal || 0, stun: finisher ? F.finisherStun : P.stun || .3 * charge, finisher: !!finisher });
    this.fistCombo = step >= F.punches.length ? null : { step, until: now + F.window * 1000, landed: [...before, landed] };
    if (step >= F.punches.length) this.fistRecoverUntil = now + F.recover * 1000;
    this.cloneSwing({ ...BRAWLER_ECHO.cloneArc, damage: primaryProfile(this.save.equipment.primary).damage }, d, now); // release 503: the Shadow Clone throws a plain arc swing with each punch
    p.attackUntil = now + 240; p.meleeUntil = now + 240;
    this.message = finisher ? "Uppercut! All three landed." : step === 1 ? (charge >= 1 ? "Dash punch, fully charged!" : "Dash punch.") : step === 2 ? "Jab." : "Uppercut.";
    return true;
  }
  // Release 365 (late-spells.ts): the Shadow Clone. A press deploys it; a press while it lasts carries you to it.
  shadowCloneActive(now = this.lastUpdateNow || 0) { return !!this.shadowClone && now < this.shadowClone.until; }
  // Release 515 (lattice-fields.ts): your own spells in play, and the lingering ones (fields) you stand in.
  ownSpellFx(lingering = false) { return (this.effects || []).filter((e) => e.glyphHost === "spell" && !e.hostile && !(e.delay > 0) && e.life > 0 && (!lingering || (e.radius > 0 && ((SPELLS[e.glyphSpell]?.lifetime || 0) >= FIELD.minLife || String(e.id).endsWith("-vortex"))))); }
  spellRunning(now = this.lastUpdateNow || 0) { return now < (this.aegisUntil || 0) || now < (this.boxingUntil || 0) || !!this.orbit || (this.shadowCloneActive(now) && !this.shadowClone.marginalia && !this.shadowClone.boxing) || this.ownSpellFx().length > 0; }
  inOwnField() { const p = this.player, x = p.x + .5, y = p.y + .45; return this.ownSpellFx(true).some((e) => Math.hypot(e.x - x, e.y - y) <= e.radius); }
  // Release 517 (Tim: "shadow Boxing... The spell button doesn't show the duration... similar to every other spell"): how
  // much of a cast spell's effect is left, 0..1, for the button's draining fill (as Aperture skills show theirs).
  spellBuffLeft(id, now = this.lastUpdateNow || 0) {
    const S = SPELLS[id]; if (!S) return 0;
    const left = (until, ms) => until > now && ms > 0 ? Math.min(1, (until - now) / ms) : 0;
    if (id === "shadow-boxing") return left(this.boxingUntil || 0, BRAWLER["shadow-boxing"].seconds * 1000);
    if (id === "aegis") return left(this.aegisUntil || 0, BRAWLER.aegis.ms);
    if (id === "shadow-clone") return this.shadowCloneActive(now) && !this.shadowClone.marginalia && !this.shadowClone.boxing ? left(this.shadowClone.until, S.lifetime * 1000) : 0;
    if (id === "orbit-volley" && this.orbit) return this.orbit.flight ? 1 : Math.max(0, 1 - (now - this.orbit.start) / 1000 / ORBIT.window); // release 519: the gathering window, then the flight
    const fx = this.ownSpellFx().filter((e) => e.glyphSpell === id && !e.echo && !String(e.id).endsWith("-vortex")); // release 519: every spell, quick ones too
    return fx.length && S.lifetime > 0 ? Math.min(1, Math.max(...fx.map((e) => e.life)) / S.lifetime) : 0;
  }
  // Release 519: an instant Rift Step (no glyphs riding after it) still lights its button for `RIFT_FLASH` s.
  riftFlashLeft(now = this.lastUpdateNow || 0) { const t = (now - (this.riftFlashAt ?? -Infinity)) / 1000; return t >= 0 && t < RIFT_FLASH ? 1 - t / RIFT_FLASH : 0; }
  spellbladeOn(now = this.lastUpdateNow || 0) { return fieldOn(this.save, "spellblade") && this.spellRunning(now); }
  castShadowClone(spell, cds, key, now = this.lastUpdateNow || 0) {
    if (this.shadowCloneActive(now) && !this.shadowClone.boxing) { // release 503: a Shadow Boxing echo is replaced, not stepped into
      if (this.shadowClone.charging) this.tickCloneCharge(false, now); // release 417
      const at = clonePosition(this.player, this.shadowClone), w = this.glyphWorld(now);
      if (!w.canStand(at.x, at.y)) { this.shadowClone.blockedUntil = now + SHADOW_CLONE.blockedFor * 1000; this.message = "Blocked: you cannot stand where your shadow is."; return false; }
      (this.glyphVisuals ||= []).push({ kind: "arc", x: this.player.x + .5, y: this.player.y + .45, tx: at.x + .5, ty: at.y + .45, color: "#7a5fc0", life: .3, max: .3 });
      this.player.x = at.x; this.player.y = at.y; this.player.invulnerableUntil = Math.max(this.player.invulnerableUntil || 0, now + 150);
      this.shadowClone = null; this.cloneAim = false; this.message = "You step into your shadow."; this.sync(); return true;
    }
    if ((cds[key] || 0) > 0) { this.message = `${spell.name} recovers in ${Math.ceil(cds[key])}s.`; return false; }
    const o = cloneOffset(this.movingNow ? this.player.lastMoveVector : null, this.save.lastAim, SHADOW_CLONE.near); // release 417: right next to you
    this.shadowClone = { ox: o.x, oy: o.y, until: now + spell.lifetime * 1000 }; this.cloneAim = false;
    if (this.castAction) this.shadowClone.charging = { action: this.castAction, start: now, dir: { x: o.x / SHADOW_CLONE.near, y: o.y / SHADOW_CLONE.near } };
    cds[key] = spell.cooldown * this.glyphLoadout("spell", spell.id).mods.cooldown /* release 467 (Codex audit I002): Heavy and Swift count */ * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    echoEvent(this, "spell", now);
    this.message = this.shadowClone.charging ? "Hold to send your shadow farther; let go to set it." : "Your shadow stands beside you. Cast again to step into it.";
    return true;
  }
  // Release 417: while the button that cast it is held, the shadow travels over the floor (behind you while you move, else on
  // its way out); letting go settles the clone where the shadow is. `held` is whether that button is still down.
  tickCloneCharge(held, now = this.lastUpdateNow || 0) {
    const c = this.shadowClone?.charging; if (!c) return;
    if (held) {
      if (this.movingNow && this.player.lastMoveVector) { const v = this.player.lastMoveVector, m = Math.hypot(v.x, v.y) || 1; c.dir = { x: -v.x / m, y: -v.y / m }; }
      const d = chargeDistance((now - c.start) / 1000); this.shadowClone.ox = c.dir.x * d; this.shadowClone.oy = c.dir.y * d; return;
    }
    delete this.shadowClone.charging; this.shadowClone.until += now - c.start; this.message = "Your shadow settles there. Cast again to step into it.";
  }
  // A tap while the clone waits to be set places it there (up to SHADOW_CLONE.placeRange away). True when it took the tap.
  placeShadowClone(x, y, now = this.lastUpdateNow || 0) {
    if (!this.cloneAim || !this.shadowCloneActive(now)) { this.cloneAim = false; return false; }
    const o = clampPlacement(x - (this.player.x + .5), y - (this.player.y + .45));
    Object.assign(this.shadowClone, { ox: o.x, oy: o.y }); this.cloneAim = false; this.message = "Your shadow settles there.";
    return true;
  }
  // Release 387: from the clone's place, the way to the locked target (null with none).
  cloneAimFrom(at) {
    const e = this.lockedTarget(); if (!e || e.untargetable || e.hidden) return null;
    const dx = e.x + .5 - (at.x + .5), dy = e.y + .45 - (at.y + .45), m = Math.hypot(dx, dy) || 1; return { x: dx / m, y: dy / m };
  }
  // The clone's copy of a swing: the same blow from where it stands, at `share` of the damage (release 387: toward the
  // locked target when there is one).
  cloneSwing(profile, dir, now) {
    if (!this.shadowCloneActive(now) || this.shadowClone.charging) return;
    const at = clonePosition(this.player, this.shadowClone), body = { ...this.player, x: at.x, y: at.y }; dir = this.cloneAimFrom(at) || dir;
    const hits = primaryAttackHits(body, this.enemies.filter((e) => !e.untargetable), this.map, mapWidth(this.map, this.area), profile, dir);
    for (const e of hits) { if (e.kind === "npc" || e.dead) continue; alertEnemy(e); e.hp -= Math.max(1, Math.round((profile.damage + characterStats(this.save).meleeBonus) * SHADOW_CLONE.share)); e.hitFlash = .18; if (e.hp <= 0 && !e.dead) { e.dead = true; this.defeatEnemy(e); } }
    this.shadowClone.swingUntil = now + 240; this.shadowClone.swingDir = { x: dir.x, y: dir.y };
  }
  // Release 309 (Tim: "we can click on a monster... and then that'll just be the targeting... our blasts and attacks and swings
  // will go towards the... monster that we clicked... until we click on another monster"; "rift step will still go in the
  // direction that you're pointing"). Tapping a creature locks it; while it lives and stays near, swings aim at it when it is
  // in reach and every tool shot and spell aims at it (save.lastAim follows it each frame). Tapping it again releases it.
  lockTarget(id) {
    // Release 347 (Tim: "the tap to targeting system... is inconsistent... when we tap on a target it kills them"): tapping
    // the locked creature again keeps the lock (a double tap mid-fight no longer drops it); it ends when the target falls or
    // is left behind, or with lockTarget(null).
    if (!id) { this.targetId = null; this.message = "Target released."; return null; }
    const e = this.enemies.find((q) => q.id === id && !q.dead); if (!e) return null;
    const fresh = this.targetId !== id; this.targetId = id; if (fresh) this.message = `Targeting ${e.name || e.kind}.`; return e;
  }
  lockedTarget() {
    if (!this.targetId) return null;
    const e = this.enemies.find((q) => q.id === this.targetId), p = this.player;
    if (!e || e.dead || e.noRewards && e.merged || Math.hypot(e.x - p.x, e.y - p.y) > TARGET_LOCK.range) { this.targetId = null; return null; }
    return e;
  }
  // Release 469: where a swing goes. Release 471 (Tim: "I like the lock targets... we can keep them the way it is... just
  // moving past targets, the auto lock... has been a little bit wonky"): a target you locked by tapping wins as far as it did
  // before release 469 (TARGET_LOCK.meleeReach past the weapon); without one, auto aim takes a foe within reach first, then
  // the nearest it can reach for. The foe chosen is marked briefly (aimMark) so you can see where the blow went.
  meleeAimAt(range, width) {
    const core = range + TARGET_LOCK.meleeSlack, now = this.lastUpdateNow || 0, mark = (e, d) => { if (e) this.aimMark = { id: e.id, until: now + AIM_MARK.ms }; return d; };
    const locked = this.lockedDirection(range + TARGET_LOCK.meleeReach); if (locked) return mark(this.lockedTarget(), locked);
    const pick = pickMeleeTarget(this.player, this.enemies, this.map, width, range + AUTO_AIM.meleeExtra, core);
    return pick ? mark(pick.e, pick.d) : null;
  }
  lockedDirection(within = Infinity) {
    const e = this.lockedTarget(); if (!e || e.untargetable || e.hidden) return null;
    const dx = e.x + .5 - (this.player.x + .5), dy = e.y + .45 - (this.player.y + .45);
    return Math.hypot(dx, dy) <= within ? projectileDirection(dx, dy, this.player.facing) : null;
  }
  // The creature under a world tap, if any (nearest whose body covers the point).
  enemyAt(x, y) {
    let best = null;
    for (const e of this.enemies) { if (e.dead || e.hidden || e.ambient || e.astralAllyOf) continue; const r = Math.max(TARGET_LOCK.pick, (Number(e.bodyRadius) || 0) + .6, (Number(e.scale) || 1) * .6), d = Math.hypot(x - (e.x + .5), y - (e.y + .4)); /* release 347: big creatures are easier to tap */ if (d <= r && (!best || d < best.d)) best = { e, d }; }
    return best?.e || null;
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
    const r = storeInventoryItem(this.save, item);
    if (r.stored && item.property === "brawler") this.glyphNotice ||= `${item.name} found: it is in your Pack.`; // release 513: say so
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
  activateApertureSkill(id=this.save.magicSkills?.selected){if(id==='rift-step'){const ok=riftStep(this,this.lastUpdateNow||0);if(ok)this.riftFlashAt=this.lastUpdateNow||0;return ok}/* release 519: a brief gold flash on the button */if(id==='aerial-step'&&altOn(this.save,'aerial-step')){this.message=`Aerial Step is set to its secondary form, ${ALT_PASSIVES['aerial-step'].name} (Arcanum).`;return false}/* release 359 */const skill=APERTURE_SKILLS[id],rank=skillRank(this.save,id),state=this.save.magicSkills;if(!skill||!rank){this.message='That Aperture skill has not been learned.';return false}if((state.cooldowns[id]||0)>0){this.message=`${skill.name} recovers in ${Math.ceil(state.cooldowns[id])}s.`;return false}state.active={id,rank,remaining:(skill.duration+Math.max(0,rank-1))*skillDurationScale(this.save,id)*(1+armorGlyphBonus(this.save).spellDuration)*skillGlyphMods(this.save,id).duration};state.active.duration=state.active.remaining;/* release 313: the button's buff bar */state.cooldowns[id]=skill.cooldown*(1-pairingMods(this.save).cooldown)*(1-armorGlyphBonus(this.save).spellCooldown)*skillGlyphMods(this.save,id).cooldown;if(id==='aerial-step')state.lastSafe={x:this.player.x,y:this.player.y,area:this.area,areaId:this.areaId()};this.message=`${skill.name} answers for ${state.active.remaining}s.`;this.sync();return true}
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
  // Release 341: the Potion button. A chosen High or Max Potion not carried is brewed from draughts first (only when it will
  // be drunk, so nothing is brewed at full health).
  drinkPotion(now = 0) {
    const id = potionToDrink(this.save), c = this.save.consumables || {};
    if (POTIONS[id]?.cost && !(c[id] > 0) && this.player.hp < this.save.maxHp) { const r = craftPotion(this.save, id); if (!r.ok) { this.message = r.message; return false; } }
    return this.useConsumable(id, now);
  }
  useConsumable(type, now = 0) {
    const c =
      this.save.consumables ||
      (this.save.consumables = {
        restorativeDraught: 0,
        ironbarkTonic: 0,
        lumenPhial: 0,
      });
    if (type === "submersible" && !aboard(this.save)) return this.toggleMech(); // release 317: ashore, the frame calls up the robot
    if (!(c[type] > 0)) {
      this.message = "That supply is exhausted.";
      return false;
    }
    if (type === "hullShield") { const r = deployHullShield(this.save); this.message = r.message; this.sync(); return r.ok; } // release 263
    if (type === "submersible") { const gate = subGate(this.save); if (!gate.ok) { this.message = gate.why; return false; } const r = fitSubmersible(this.save); this.message = r.message; this.sync(); return r.ok; } // release 311; 315: gated
    if (POTIONS[type]) { // release 339: the Restorative Draught, High Potion and Max Potion (potions.ts)
      if (this.player.hp >= this.save.maxHp) {
        this.message = "Health is already full.";
        return false;
      }
      const before = this.player.hp;
      this.player.hp = Math.min(this.save.maxHp, this.player.hp + potionHeal(type, this.save.maxHp));
      c[type]--;
      this.message = `${POTIONS[type].name} mends ${Math.round(this.player.hp - before)} health.`;
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
    this.save.playSeconds = (Number(this.save.playSeconds) || 0) + Math.max(0, Math.min(1, Number(dt) || 0)); // release 379: playtime (paused time is not counted)
    if (this.fallen) { this.tickFallen(dt, input, now); return; } // release 329
    reconcileAstralCompanions(this);
    this.syncAstralRiders();
    const p = this.player, hpStart = p.hp;
    this._astralDrainCredits=[];
    this.guardRemaining = Math.max(0, this.guardRemaining - dt);
    this.magicBuffRemaining = Math.max(0, this.magicBuffRemaining - dt);
    if (this.save.meal) { const name = mealName(this.save.meal.a, this.save.meal.b); if (tickMeal(this.save, dt)) { this.refreshDerivedStats(); this.message = `The ${name.toLowerCase()} has worn off. A cook in town can make you another.`; } } // release 447
    this.spellCooldownRemaining = Math.max(0, this.spellCooldownRemaining - dt);
    if (this.driftField && now >= this.driftField.at) { const f = this.effects.find((e) => e.id === this.driftField.id && e.life > 0); if (f) { f.x = this.player.x + .5; f.y = this.player.y + .45; } this.driftField = null; } // release 515: Drift Field settles where you land
    if (fieldOn(this.save, "wellspring") && this.inOwnField()) { const x = dt * FIELD_PASSIVES.wellspring.rate, cds = this.save.magicSkills?.cooldowns || {}; this.spellCooldownRemaining = Math.max(0, this.spellCooldownRemaining - x); for (const id of Object.keys(cds)) cds[id] = Math.max(0, cds[id] - x); if (this.player.attackReadyAt) this.player.attackReadyAt -= x * 1000; if (this.toolReadyAt) this.toolReadyAt -= x * 1000; if (this.golemReadyAt) this.golemReadyAt -= x * 1000; /* release 539: the golem's too */ } // release 515: Wellspring Ground
    const skillState=this.save.magicSkills;if(skillState){if(skillState.riftInfuse>0)skillState.riftInfuse=Math.max(0,skillState.riftInfuse-dt);/* release 297 */for(const id of Object.keys(skillState.cooldowns||{}))skillState.cooldowns[id]=Math.max(0,skillState.cooldowns[id]-dt);tickRiftCharges(this.save);if(skillState.active){skillState.active.remaining=Math.max(0,skillState.active.remaining-dt);if(skillState.active.remaining===0){const ended=skillState.active.id;skillState.active=null;onSkillEnded(this,ended,now);if(ended==='aerial-step'&&footprintHazard(this.map,mapWidth(this.map,this.area),this.player.x,this.player.y)&&!this.swimsHere(footprintHazard(this.map,mapWidth(this.map,this.area),this.player.x,this.player.y))){const safe=skillState.lastSafe;if(safe&&safe.area===this.area&&safe.areaId===this.areaId()){this.player.x=safe.x;this.player.y=safe.y}else relocateIfStranded(this.player,this.map,mapWidth(this.map,this.area));this.message='Aerial Step closes and returns you to stable ground.'}}}}
    if (this.reticle) this.reticle.life -= dt;
    let rawX = Number(input.state.x) || 0,
      rawY = Number(input.state.y) || 0,
      m = Math.hypot(rawX, rawY),
      scale = m > 1 ? 1 / m : 1,
      x = rawX * scale,
      y = rawY * scale;
    if (now < (p.heldUntil || 0)) { x = 0; y = 0; if (input.consume("dodge")) { p.heldUntil -= CRYSTAL.struggle * 1000; if (now >= p.heldUntil) this.message = "You tear free of its grip."; } } // release 249: held by the Psychic Crystal; dodge to struggle
    // Knocked down by a shock (release 257): no movement or actions until the Wayfarer gets back up.
    if (p.shockCount && now - (p.shockAt || 0) > GIANT.shockDecay * 1000) p.shockCount = 0; // the shock counter fades
    if (now < (p.stunnedUntil || 0)) { x = 0; y = 0; for (const action of ["tool", "spell", "spell2", "dodge", "jump", "potion", "attack", "interact"]) input.consume(action); }
    if (Math.hypot(x, y) > 0.15)
      this.save.lastAim = projectileDirection(x, y, p.facing);
    if (input.consume("tool")) {
      this.save.aimMode = "tool";
      this.save.toolMode = true;
      const bt = rangedWeapon(this.save.equipment.secondary)?.brawlerTool; if (bt) this.brawlerTool(bt, now); else { // release 493: Hammerfall and Great Sweep
      const weapon=rangedWeapon(this.save.equipment.secondary),width=mapWidth(this.map,this.area),
        aim=weapon&&(this.lockedDirection()||selectRangedAim(this.player,this.enemies,this.map,width,weapon.speed*weapon.lifetime*(1+characterStats(this.save).attackReach)*AUTO_AIM.rangedScale)); // release 343; 347: a locked target first
      this.fireSecondary(now, aim || this.save.lastAim);
    } }
    if (this.shadowClone?.charging) this.tickCloneCharge(!!input.held?.(this.shadowClone.charging.action), now); // release 417
    if (this.orbit) this.tickOrbit(dt, now); // release 487: Orbit Volley
    if (this.knives) this.tickKnives(now); // release 533: Nanoknives
    if (this.golem) this.tickGolem(now); // release 535: Corridor Golem
    if (this.fistCharge) { const held = (now - this.fistCharge.start) / 1000; if (!input.held?.(this.fistCharge.action) || held > IRON_FISTS.tapGrace + IRON_FISTS.chargeTime + 1) { const c = this.fistCharge; this.fistCharge = null; this.fistPunch(c.step || 1, fistCharge(held), now, c.direction); } } // release 483; 489; 493: the Iron Fists dash punch strikes when its button is let go
    if (input.consume("spell")) this.castSlot("a");
    if (input.consume("spell2")) this.castSlot("b");
    if (input.consume("dodge")) {
      const r = dodge(p, now, x, y, dodgeCost(this.save));
      if (!r.ok) this.message = "Not enough stamina to dodge.";
      else { echoEvent(this, "dodge", now); onConstellationDodge(this); if (fieldOn(this.save, "drift-field")) { const q = this.player, cx = q.x + .5, cy = q.y + .45, f = this.ownSpellFx(true).filter((e) => Math.hypot(e.x - cx, e.y - cy) <= FIELD_PASSIVES["drift-field"].reach).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]; if (f) this.driftField = { id: f.id, at: q.dodgeUntil || now }; } /* release 515: Drift Field */ if (this.area === "dungeon" && runHas(this.save, this.areaId(), "shadowStep") && !this.shadowCloneActive(now)) { const o = cloneOffset({ x: Number(x) || p.lastMoveVector?.x || 0, y: Number(y) || p.lastMoveVector?.y || 1 }, this.save.lastAim, SHADOW_STEP.behind); this.shadowClone = { ox: o.x, oy: o.y, until: now + SHADOW_STEP.seconds * 1000, marginalia: true }; } /* release 461: Shadow Step */ if (this.area === "dungeon" && runHas(this.save, this.areaId(), "emberWake")) this.dodgeBurst(p.x + .5, p.y + .45, EMBER_WAKE.radius, EMBER_WAKE.base + EMBER_WAKE.perLevel * (Number(this.save.level) || 1), now); /* release 459; 481: dodgeBurst */ if (this.area === "overworld" && aboard(this.save) && submersible(this.save)) { this.subDiveUntil = now + BOAT.sub.dive * 1000; p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, this.subDiveUntil); } } // release 311: aboard a submersible a dodge is a dive
    }
    if (input.consume("jump")) {
      if (now < this.jumpUntil) this.message = "Already airborne.";
      else { this.jumpDur = JUMP.base + skillRank(this.save,"quickening") * JUMP.quickening; this.jumpStart = now; this.jumpUntil = now + this.jumpDur; }
    }
    { const m = this.save.mech; this.mechBoosting = false; // release 317: in the robot, hold Jump in the air to boost
      if (!input.held?.("jump")) this.mechSpent = false; // release 319: an emptied boost needs Jump let go before it fires again
      if ((this.mechUp() || this.droneUp()) && !this.mechSpent && input.held?.("jump") && now < (this.jumpUntil || 0) + 60 && m.fuel > 0) { /* release 321: the drone carries the same way */ m.fuel = Math.max(0, m.fuel - dt); this.jumpUntil = Math.max(this.jumpUntil || 0, now + 140); this.mechBoosting = true; if (m.fuel <= 0) this.mechSpent = true; }
      if (m?.built && tickMech(this.save, dt, !(now < (this.jumpUntil || 0))) === "spent") this.message = "Out of cinder iron: the robot drops back to its plain stride."; /* release 383 */ if (this.droneUp()) this.tickDrone(dt, now); }
    if (input.consume("potion")) this.drinkPotion(now); // release 339: the chosen potion tier; 341: brewed when needed
    if (input.consume("preset")) { this.message = swapPreset(this.save).message; this.refreshDerivedStats(); } /* release 541: preset armor changes the maxima */ // release 261: swap spell presets 1 and 2; 393: with the whole build
    if (input.consume("build")) { // release 269: beside (or aboard) a damaged skiff, Build patches the hull instead
      const btn = activeButton(this.save); // release 291: a preset may make it an item button; release 309: or a spell
      if (btn.mode === "item") this.useButtonItem(btn.item, now);
      else if (btn.mode === "cast") { this.castAction = "build"; try { this.castKey(btn.key); } finally { this.castAction = null; } } // release 419: a held Build sends a Shadow Clone too
      else this.pressBuild(Math.hypot(x, y) > .15);
    }
    // Release 269 (Tim: "if you hold the build button while you're at sea, it will apply the hull shield"): held aboard.
    if (this.area === "overworld" && aboard(this.save) && (input.held?.("build") && activeButton(this.save).mode === "build" || ["spell", "spell2"].some((k, i) => input.held?.(k) && slotTool(this.save, i ? "b" : "a")?.tool === "build"))) { this.buildHold = (this.buildHold || 0) + dt; if (this.buildHold >= BOAT.mend.shieldHold && !this.buildHoldDone) { this.buildHoldDone = true; this.message = deployHullShield(this.save).message; } }
    else { this.buildHold = 0; this.buildHoldDone = false; } // release 265: raise a wood wall or stone block in front
    const dodging = now < (p.dodgeUntil || 0);
    if (dodging) {
      x = p.dodgeX;
      y = p.dodgeY;
    }
    const swimming = this.swimsHere(footprintHazard(this.map, mapWidth(this.map, this.area), p.x, p.y)), underfoot = this.map.landscape ? tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y)?.kind : null;
    const sailing = this.area === "overworld" && aboard(this.save);
    let speed = (dodging ? 4.8 : 2.4) * (1 + characterStats(this.save).moveSpeed) * (!dodging && now < (p.slowUntil || 0) ? (p.slowFactor || .5) : 1) * (this.map.underwater ? DIVE.speed : 1) * (sailing ? BOAT.speed : swimming ? (this.mechUp() ? MECH_WATER.speed : TIDEMANTLE.speed) : dodging ? 1 : mireSpeed(underfoot)),
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
    if ((sailing || (this.area === "overworld" && this.wading())) && (nx < 0 || ny < 0 || nx + .76 >= SECTION_SIZE - .02 || ny + .88 >= SECTION_SIZE - .02)) { /* release 507: the robot wading crosses anywhere, like a skiff */
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
    let terrainHazard=footprintHazard(this.map,width,nx,ny);const aerial=this.save.magicSkills?.active?.id==='aerial-step'&&this.save.magicSkills.active.remaining>0||this.mechBoosting===true;/* release 317: the robot's boost carries over hazards */
    // Pits, lava and deep water are lethal to walk into (operator, release 101: the r97 brink guard is removed; rims,
    // fog hatching and level marks keep them readable instead).
    // Release 102: the Tidemantle lets the Wayfarer swim on surface water (stage one of the water traversal plan).
    if(terrainHazard==="lava"&&this.mechUp())terrainHazard=null;/* release 475: the robot wades through lava; the heat is settled at the frame's end */
    if(sailing){terrainHazard=null;this.swimming=false}else if(this.robotPutsToSea(nx,ny,width,terrainHazard))terrainHazard=null;else if(this.swimsHere(terrainHazard)){this.swimKind=terrainHazard;if(!this.swimming){this.swimming=true;if(now>(this.swimMessageAt||0)){this.swimMessageAt=now+8000;this.message=this.mechUp()?"The robot seals and wades on through the water.":"The Tidemantle holds you up. Swimming drains stamina.";}}terrainHazard=null}else this.swimming=false;
    const fellIntoHazard=!!terrainHazard&&!aerial;
    if(fellIntoHazard){p.hp=0;this.message=terrainHazard==="lava"?"The caldera swallows the Wayfarer.":terrainHazard==="abyss"?"The Wayfarer falls into the sunless chasm.":DEEP_WATER.includes(terrainHazard)?"The deep water drags the Wayfarer under.":terrainHazard==="canyon"?"The ledge gives way beneath the Wayfarer.":"The water closes over the Wayfarer."}
    else if (sailing) this.sail(p, dx, dy, width, now);
    else {
      p.isPlayer = true; p.jumping = now < (this.jumpUntil || 0); p.voidSuit = this.mechUp() && this.area !== "dungeon"; /* 511: never through dungeon walls */ // release 509: only the robot steps into a star-void
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
      this.attackAction = "attack"; try { this.primaryAttack(now); } finally { this.attackAction = null; } // release 493: the Iron Fists charge while Attack is held
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
      (shot)=>{this.clusterShell(shot);return this.effects.push({id:"blast-"+shot.id,kind:shot.hostile?"enemy-blast":"rift-blast",x:shot.x,y:shot.y,life:.32,radius:shot.blastRadius||2,untilPulse:0,pulse:99,damage:shot.damage,hostile:!!shot.hostile,hits:{},...(!shot.hostile&&shot.glyphHost?{glyphHost:shot.glyphHost}:{})/* release 467 (Codex audit I001): the Bombard's blast keeps its tool glyphs, once per foe */,...(shot.glyphSpell?{glyphSpell:shot.glyphSpell}:{}),...(shot.fireBomb?{fireBurst:true}:{})/* release 547: Fire Burst's own glyphs and its flame */})},
      p,
      (shot)=>{
        const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;
        if(shot.jumpable&&now<this.jumpUntil)return;
        if(safe||now<=(p.invulnerableUntil||0))return;
        p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?shot.damage*.65:shot.damage)*(1-Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0)))));
        p.invulnerableUntil=now+700;
      },
      (shot, e) => (e.kind === "nanobotKnight" && this.scatterCheck(e, shot.damageType === "physical", !!shot.glyphHost && glyphsReachSwarm(this.glyphLoadout(shot.glyphHost)), now)) ? 0 : shot.glyphHost && e.kind !== "npc" ? glyphDamage(this.glyphLoadout(shot.glyphHost), e, shot.damage, { echo: !!shot.echo }, now) : shot.damage,
      (shot, e, dealt, actual) => { this.astralPlayerHit(e,actual); if (shot.glyphHost && e.kind !== "npc") glyphHit(this.glyphWorld(now), this.glyphLoadout(shot.glyphHost), e, dealt, { echo: !!shot.echo }); },
      (this.packEffects || []).filter(f => f.kind === "psyWall" && !(f.arming > 0)), // swept wall contact precedes actor collision at every substep
      (bx, by) => { const b = buildOn(this, bx, by); if (b) strikeBuild(this, b); }, // release 265: a build absorbs the shot
    );
    if(combatNpcTargets.length)this.syncNpcDamage("projectile");
    for(const fx of this.effects)if(fx.hostile&&!fx.hitPlayer&&Math.hypot(p.x+.5-fx.x,p.y+.52-fx.y)<=fx.radius){fx.hitPlayer=true;const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;if(!safe&&now>(p.invulnerableUntil||0)){p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?fx.damage*.65:fx.damage)*(1-Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0)))));p.invulnerableUntil=now+700}}
    if(this.effects.length)tickSpellFields(this.effects,this.enemies,this.projectiles,dt,now,(x,y)=>{const t=this.map.tiles[Math.floor(y+.6)*width+Math.floor(x+.5)];return !!t&&!t.blocked&&!t.environment});/* release 365: Gravity Well, Stillpoint */
    if(this.effects.length)this.effects = updateEffects(
      this.effects,
      [...this.enemies, ...combatNpcTargets],
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
      (fx, e) => fx.glyphHost && e.kind !== "npc" ? glyphDamage(this.glyphLoadout(fx.glyphHost, fx.glyphSpell), e, fx.damage, { echo: !!fx.echo }, now) : fx.damage, // release 335: a spell's pulses keep the glyphs it was cast with
      (fx, e, dealt, actual) => { this.astralPlayerHit(e,actual); if (fx.healShare && actual > 0 && this.player.hp > 0) this.player.hp = Math.min(this.save.maxHp, this.player.hp + actual * fx.healShare); /* release 493: Shadow Boxing heals from punches */ if (fx.glyphHost && e.kind !== "npc") glyphHit(this.glyphWorld(now), this.glyphLoadout(fx.glyphHost, fx.glyphSpell), e, dealt, { echo: !!fx.echo, origin: { x: fx.x, y: fx.y } }); },
    );
    for(const e of this.enemies)if(e.kind==="astralWorm"&&e.dead&&!e.rewarded)this.defeatEnemy(e);
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
    // Actor death decisions wait for the existing end-of-frame hull mitigation.
    this._astralDamagePending=true;
    if (this.area === "overworld" || this.area === "dungeon") this.tickWorldBeasts(dt); // release 239 (release 249: in dungeons too)
    if (this.area === "overworld" && (this._shoreCheck = (this._shoreCheck || 0) - dt) <= 0) { this._shoreCheck = .5; if ((this.save.materials?.wood || 0) >= WOOD.skiffCost && this.save.capabilities?.swim && !this.nearestObject() && !this.wayglassNear() && this.shoreWater() && now > (this.woodHintAt || 0)) { this.woodHintAt = now + 15000; this.message = `Act: build a skiff here (${WOOD.skiffCost} wood).`; } }
    // Release 283: dungeon water is deadly. Entered (or still swum) without stamina it drowns; otherwise it wounds quickly.
    if (this.swimming && !this.mechUp() && this.area === "dungeon" && !this.map.underwater) { /* release 507: not in the robot */ const toll = dungeonWaterToll(p, dt, this.save.maxHp); if (toll === Infinity) { p.hp = 0; this.message = "Out of stamina in the dark water: it drags you under."; } else if (toll > 0) { p.hp = Math.max(0, p.hp - toll); if (now > (this.swimMessageAt || 0)) { this.swimMessageAt = now + 4000; this.message = "The dungeon water bites: get out before your stamina gives."; } } }
    if (this.swimming && !this.mechUp() && p.hp > 0) { /* release 507: the robot costs no stamina in water */ const hurt = swimUpkeep(p, dt, this.swimKind, this.area === "overworld" && !!this.map.openSea); if (hurt > 0) { p.hp = Math.max(0, p.hp - hurt); if (now > (this.swimMessageAt || 0)) { this.swimMessageAt = now + 4000; this.message = "Exhausted in the water — reach the shore."; } } }
    else p.stamina = Math.min(p.maxStamina, p.stamina + (9 + pairingMods(this.save).stamina) * (1 + armorGlyphBonus(this.save).staminaRegen) * dt);
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
      if(e.farArrayBoss==="listener"&&!e.dead){if(isMirror(e))tickMirrorListener(e,this.mirrorWorld(dt,now));const morphing=isMorph(e)&&tickMorphListener(e,this.mirrorWorld(dt,now));/* release 385: the Morphling */if(this.updateListener(e,now)||morphing)continue}
      if(e.morphWorm&&!e.dead){this.performanceStats.activeEnemies++;if(tickWorm(e,this.mirrorWorld(dt,now)))continue} // release 369: the mirror form
      if(e.mirrorClone&&!e.dead){this.performanceStats.activeEnemies++;if(tickReflection(e,this.mirrorWorld(dt,now)))continue}
      if(e.skirmishId&&!e.skirmishProvoked){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&updateSkirmisher(e,this.enemies,this.map,dt,skirmishHooks))continue}
      // A retreating Walker is harmless and must traverse settlements normally. Sanctuary combat
      // displacement must neither relocate it nor freeze its retreat while the player rests inside.
      if(e.gatePredator){this.performanceStats.activeEnemies++;const ox=e.x,oy=e.y;if(!fellIntoHazard&&!e.dead)updateGatePredator(e,packWorld);if(this.area==="dungeon"&&!this.roamerInBounds(e)){e.x=ox;e.y=oy;e.gateWalkFor=GATE_REVENANT.walkAround}continue} // release 271: through walls, never into the black beyond (and, held at the edge, it walks around for a while)
      if(e.packKind&&e.astralMount?.status==="mounted"&&e.astralMount.ridingAway){this.performanceStats.activeEnemies++;continue} // rides the retreating Worm home
      if(e.packKind&&e.worldBeast==="voidWalker"&&!this.astralRiderHeld(e)&&!e.retreating){
        const q=this.save.worldBeasts?.voidWalker?.active;
        if(tickAstralFighterChoice(q,dt,n=>(hashSeed(`${this.save.seed}:${e.id}:astral-fighter:${n}`)%100000)/100000)){q.astralLeave=true;this.message="The Void Walker breaks off the fight and leaves.";}
      }
      if(e.packKind&&e.astralMount?.status==="mounted"&&!e.astralMountFixture){
        const choice=tickAstralRiderChoice(e,dt,n=>(hashSeed(`${this.save.seed}:${e.id}:astral-rider:${n}`)%100000)/100000,this.astralMountHost());
        if(choice!=="stay"){const q=this.save.worldBeasts?.voidWalker?.active;dismountAstralWalker(e,choice,this.astralMountHost());
          if(choice==="leave"&&q){q.astralLeave=true;this.message="The Void Walker leaps from the Astral Worm and leaves the fight.";}
          else this.message="The Void Walker leaps down from the Astral Worm to fight on foot.";}
      }
      if(e.blobRemnant){e.remnantLeft-=dt;e.fleeFade=Math.max(0,Math.min(1,e.remnantLeft/BLOB_SPLIT.fade));if(e.remnantLeft<=0)e.remnantGone=true;continue} // release 259: the Blob's left-behind mass fades
      if(e.packKind&&e.astralMount?.status==="boarding"){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&!e.dead)tickAstralBoarding(e,dt,this.astralMountHost());continue}
      if(e.packKind){refreshMarineBeast(e,this.map,width,this.area);this.performanceStats.activeEnemies++;const zone=this.astralRiderHeld(e)||e.kind==="voidWalker"&&(e.retreating||e.fleeTo)?null:packWorld.sanctuary;if(zone){enforceSanctuary(e,zone);if(Math.hypot(p.x-zone.x,p.y-zone.y)<zone.radius)continue}const roam=isDungeonRoamer(e,this.area)&&!e.retreating,ox=e.x,oy=e.y;if(!fellIntoHazard&&!e.dead)updatePackMonster(e,packWorld);if(roam&&!this.roamerInBounds(e)){e.x=ox;e.y=oy}if(zone)enforceSanctuary(e,zone);continue}
      if(e.seaKind){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&!e.dead)updateSeaCreature(e,seaWorld,dt);continue}
      if(e.encounterGroup&&!this.activatedEncounterGroups.has(e.encounterGroup)){this.activatedEncounterGroups.add(e.encounterGroup);this.performanceStats.encounterActivations++}
      let simulationDt=dt;
      if(e.ambient){e.ambientAccumulator=(e.ambientAccumulator||0)+dt;if(e.ambientAccumulator<.125){this.performanceStats.dormantEnemies++;continue}simulationDt=Math.min(.25,e.ambientAccumulator);e.ambientAccumulator=0;this.performanceStats.ambientTicks++}
      this.performanceStats.activeEnemies++;
      const pathRetryBefore=e.ai?.pathRetryAt||0;
      if (
        !fellIntoHazard&&
        !e.dead &&
        updateEnemyAI(e, p, this.map, width, simulationDt, now, /^(ashling|glassMite|sparkWarden|ashenHound|veilMoth|rootBrute|coilStalker|cinderWisp|hollowMarshal|riftColossus|voidSentinel)-/.test(e.id)?sanctuary:null,(shooter,aim)=>{const cap=this.area==="dungeon"?32:64,room=Math.max(0,cap-this.projectiles.length);if(room)this.projectiles.push(...enemyProjectilePattern(shooter,aim,now,{activeCount:this.projectiles.length,cap}).slice(0,room).map(q=>bossPaced(shooter)?{...q,damage:q.damage*BOSS_PACE.damage}:q))/* release 421 */}) &&
        now > (p.invulnerableUntil || 0) &&
        (!(now < this.jumpUntil) || e.kind === "sparkWarden") &&
        !((b) => b && strikeBuild(this, b))(buildBetween(this, e)) // release 265: a build between takes the blow
      ) {
        p.hp -= Math.max(
          1,
          Math.ceil(
            (this.guardRemaining > 0 ? e.damage * 0.65 : e.damage) * (bossPaced(e) ? BOSS_PACE.damage : 1) * /* release 421 */
              (1 - Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0))),
          ),
        );
        p.invulnerableUntil = now + 700;
      }
      if((e.ai?.pathRetryAt||0)!==pathRetryBefore)this.performanceStats.pathfindingWork++;
    }
    reconcileAstralCompanions(this);
    this.syncAstralRiders();
    if(seaSummons.length)this.enemies.push(...seaSummons);
    this.performanceStats.peakActiveEnemies=Math.max(this.performanceStats.peakActiveEnemies,this.performanceStats.activeEnemies);
    const volcano=this.area==="overworld"&&this.map.volcano;
    if(volcano&&Math.hypot(p.x-volcano.x,p.y-volcano.y)<12){this.volcanoClock=(this.volcanoClock||0)+dt;if(this.volcanoClock>=volcano.period){this.volcanoClock=0;this.volcanoSeq=(this.volcanoSeq||0)+1;const n=hashSeed(`${this.save.seed}:eruption:${this.rx}:${this.ry}:${this.volcanoSeq}`);for(let i=0;i<4;i++){const a=((n>>(i*5))%360)*Math.PI/180,r=i===0?0:1.2+((n>>(i*3))%30)/10;addPackEffect(this.packEffects||=[],{kind:"lavaBomb",owner:"volcano",x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,radius:1.05,arming:1.3+i*.2,damage:Math.ceil(this.save.maxHp*.18),jumpable:false,from:{x:volcano.x,y:volcano.y-1}},now)}this.message="The caldera erupts. Watch the burning circles."}}
    this.packEffects=tickPackEffects(this.packEffects||[],packWorld);this.performanceStats.activeHazardsAndEffects+=this.packEffects.length;this._packLastPlayer={x:p.x,y:p.y};this.syncAstralRiders();for(const e of this.enemies)if(e.kind==="astralWorm"&&e.dead&&!e.rewarded)this.defeatEnemy(e);reconcileAstralCompanions(this);
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
    if (this.novaFog) this.novaFog = this.area === "overworld" ? tickNovaFog(this.novaFog, dt, p) : null; // release 257: a Supernova's fog clears
    tickHullShield(this.save, dt); // release 263: a deployed hull shield wears off
    tickBuilds(this, dt, (e) => ATTACK_MODULES[e.pack?.attack]?.tags || []); // release 265: builds crumble; rushing world beasts break them
    this.tickHorde(dt); // release 269: the horde keeps coming
    this.tickMire(dt, now); // release 303
    { const aim = this.lockedDirection(); if (aim) { this.save.lastAim = aim; this.save.pendingAim = null; } } // release 309: aim follows a locked target
    if (this.area === "dungeon") this.dungeonClock = (this.dungeonClock || 0) + dt; // release 271
    this.tickSeaIce(dt); // release 261: the Mountain Turtle's ice floor freezes and thaws
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
      tickSeaHazards(this.seaHazards, dt, { player: p, storm: this.storm, aboard: onBoard, swimming: !!this.swimming, dodging: now < (p.dodgeUntil || 0) || now < (this.subDiveUntil || 0) || (onBoard && now < (this.jumpUntil || 0)), tiles: this.map.tiles,
        move: (mx, my) => { const nx = p.x + mx, ny = p.y + my, ok = aboard(this.save) ? footprintSailable(this.map, width, nx, ny) : footprintOpen(this.map, width, nx, ny, true); if (ok) { p.x = nx; p.y = ny; } return ok; },
        hurt: (n) => { p.hp = Math.max(0, p.hp - n); },
        hull: (n, why) => { if (hullStrike(this.save, n)) { p.sailVx = p.sailVy = 0; this.message = "The skiff breaks apart! Swim for it; the Shipwright will raise it at the dock."; } else this.message = { whirlpool: "The maelstrom's eye batters the hull.", wave: "The rogue wave swamps the skiff.", iceberg: "Ice grinds along the hull.", reef: "Coral scrapes the hull. Find deeper water." }[why]; },
        note: (m) => { this.message = m; } });
      const wave = this.seaHazards.wave;
      if (wave && (onBoard || this.swimming)) { const c = waveCrest(wave, this.seaHazards.clock); if (c.pos !== null && wave.warned !== c.cycle) { wave.warned = c.cycle; this.message = "A rogue wave sweeps across the sea. Burst through it (dodge) or brace!"; } }
      if (onBoard && this.seaHazards.whirlpools.some((v) => Math.hypot(v.x - p.x - .5, v.y - p.y - .7) < v.radius) && now > (this.whirlMessageAt || 0)) { this.whirlMessageAt = now + 9000; this.message = "A maelstrom has the skiff. Row hard for the rim!"; }
    }
    const astralRawLoss=Math.max(0,hpStart-p.hp);
    // Aboard, the hull takes its share of every hit; a hull at zero sinks the skiff (it returns to its home dock).
    if (this.area === "overworld" && aboard(this.save) && p.hp < hpStart) {
      const { kept, sunk } = hullAbsorb(this.save, hpStart - p.hp);
      p.hp = hpStart - kept;
      if (sunk) { p.sailVx = p.sailVy = 0; this.message = "The skiff founders and sinks! Swim for shore; the Shipwright will raise it at the dock."; }
    }
    if (this.mechUp() && p.hp < hpStart) { const r = mechAbsorb(this.save, hpStart - p.hp); p.hp = hpStart - r.kept; if (r.broke) this.message = `The robot's plating gives out and it folds away. It can be called again in ${MECH.rebuild}s.`; else if (r.replated) this.message = `The plating gives out; you re-forge it from ${MECH_POWER.replate} cinder iron.`; } // release 317; 383: re-forged from iron
    this._astralDamagePending=false;
    // Drain healing is settled only after the existing hull mitigation, never from intercepted damage.
    const drainCredits=this._astralDrainCredits||[],creditSum=drainCredits.reduce((n,c)=>n+c.amount,0),actualLoss=Math.max(0,hpStart-Math.max(0,p.hp));
    const creditScale=creditSum>0?Math.min(1,astralRawLoss>0?actualLoss/astralRawLoss:0,actualLoss/creditSum):0;
    for(const {owner,amount} of drainCredits)if(!owner.dead&&owner.hp>0){owner.hp=Math.min(owner.maxHp,owner.hp+amount*creditScale);if(owner.astral)owner.astral.hp=owner.hp;}
    this._astralDrainCredits=[];
    this.applyInkShield(hpStart, now); // release 461: Ink Shield
    // Release 485: Aegis turns every blow aside; Shadow Boxing takes `guard` off what gets through. A fall is not a blow.
    if (p.hp < hpStart && !fellIntoHazard) { if (now < (this.aegisUntil || 0)) p.hp = hpStart; else if (now < (this.boxingUntil || 0)) p.hp = hpStart - (hpStart - p.hp) * (1 - BRAWLER["shadow-boxing"].guard); }
    // Release 515: Sanctum, inside your own lingering spell: less damage, and a steady mend.
    if (fieldOn(this.save, "sanctum") && p.hp > 0 && this.inOwnField()) { const S = FIELD_PASSIVES.sanctum; if (p.hp < hpStart && !fellIntoHazard) p.hp = hpStart - (hpStart - p.hp) * (1 - S.guard); p.hp = Math.min(this.save.maxHp, p.hp + this.save.maxHp * S.mend * dt); }
    // Release 475: wading through lava in the robot cooks the Wayfarer inside it, past the plating, every guard and Ink Shield.
    if (this.mechUp() && !this.mechBoosting && p.hp > 0 && footprintHazard(this.map, mapWidth(this.map, this.area), p.x, p.y) === "lava") { p.hp = Math.max(0, p.hp - this.save.maxHp * MECH_LAVA.heat * dt); if (p.hp <= 0) this.message = "The lava's heat cooks the Wayfarer inside the robot."; else if (now > (this.lavaWadeMessageAt || 0)) { this.lavaWadeMessageAt = now + 6000; this.message = "The robot wades through the lava. The heat inside is unbearable: get out of it."; } }
    // Release 509: the Far Sleep's star-voids tear the robot apart (MECH_VOID); out of it, the night takes the Wayfarer.
    if (p.hp > 0 && footprintVoid(this.map, mapWidth(this.map, this.area), p.x, p.y)) { const r = this.mechUp() ? voidTick(this.save, dt) : { gone: true }; p.hp = Math.max(0, p.hp - this.save.maxHp * MECH_VOID.heat * dt);
      if (r.gone) { p.hp = 0; this.message = r.torn ? "The robot comes apart in the void, and the night beneath the dream takes the Wayfarer." : "The night beneath the dream takes the Wayfarer."; }
      else if (p.hp <= 0) this.message = "The void unmakes the Wayfarer inside the robot.";
      else if (now > (this.voidMessageAt || 0)) { this.voidMessageAt = now + 5000; this.message = `The robot holds in the void, barely: its plating is coming apart (${Math.ceil(this.save.mech.plate)}). Get out.`; } }
    if (this.damageNumbers) this.trackDamageNumbers(now); // release 461
    if (p.hp <= 0 && this.area === "dungeon" && !fellIntoHazard && runHas(this.save, this.areaId(), "secondWind") && !marginRun(this.save, this.areaId()).secondWind) { marginRun(this.save, this.areaId()).secondWind = true; p.hp = Math.max(1, Math.round(this.save.maxHp * SECOND_WIND.share)); p.invulnerableUntil = now + SECOND_WIND.guardMs; this.message = "Second Wind: the blow should have felled you. You are still standing."; this.defeatNotice = { title: "SECOND WIND", detail: "once in this crossing", kind: "discovery" }; } // release 459
    if (p.hp <= 0) {
      // Release 329 (Tim: "for world bosses... If they kill you, there should be like a... 4 second... pause... where you see
      // the boss just like moving around or milling around after you die. Just to give you like a second to like collect
      // yourself"): felled in a fight with a world beast or the Questing Beast, the Wayfarer lies fallen for DEATH_PAUSE
      // seconds while the beast calms and paces (tickFallen); then the usual recovery at the checkpoint (resolveDeath).
      // The played game turns it on (main.ts sets deathPause); headless simulations recover at once, as before.
      if (this.deathPause && !fellIntoHazard && !this.fallen && this.enemies.some((e) => !e.dead && (e.worldBeast || e.questingBeast))) {
        const until = now + DEATH_PAUSE.seconds * 1000, beast = this.enemies.find((e) => !e.dead && (e.worldBeast || e.questingBeast));
        this.fallen = { until }; p.hp = 0; p.stunnedAt = now; p.stunnedUntil = until; this.jumpUntil = 0;
        this.projectiles = this.projectiles.filter((q) => !q.hostile);
        for (const e of this.enemies) if (!e.dead && (e.worldBeast || e.questingBeast)) { e.aggro = false; e.millHome = { x: e.x, y: e.y }; e.millTurn = 0; }
        this.message = `Felled. ${beast?.name || "The beast"} paces over you...`;
      } else this.resolveDeath(now, input, fellIntoHazard, terrainHazard);
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
