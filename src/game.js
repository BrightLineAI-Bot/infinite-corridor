import { playerDroneVisualAnchor, projectileLaunchMetadata } from './actor-presentation.js?v=r866-2a08d6b00273';
import { canopyGateDestination } from './trees.js?v=r866-2a08d6b00273';
import { ACTOR_CONTACT, actorContactContext } from "./actor-contact.js?v=r866-2a08d6b00273";
import { simpleToolAppearanceKind, ACTION_MOTION, CLOSE_VIEW_MELEE_TIMING, TOOL_ACTION_TIMING, TOOL_USE_STARTUP_MS, toolUseStartupMs, normalizeHammerfallStartup, normalizePendingMeleeContact, normalizePendingToolUse, sampleToolActionMotion, attackVisualDeadline, attackVisualRemaining, normalizeActionVisualMotion, normalizeAttackVisual, normalizeCastVisual, normalizeDodgeVisual, normalizePrimaryCombo, acceptCleaverChoreography, advancePrimaryCombo, recentHeroPresentation, stampAttackVisual, stampCastVisual, cancelCastVisual } from "./action-motion.js?v=r866-2a08d6b00273";
import { DEEP_PLACEMENT, isDeepV2Id } from "./deep-dungeons.js?v=r866-2a08d6b00273";
import { beginAstralWorldRetreat, tickAstralWorldRetreat, astralRetreatSpawn, astralRetreatSceneMatches } from "./astral-world-retreat.js?v=r866-2a08d6b00273";
import { astralCompanionFor, reconcileAstralCompanions } from "./astral-encounters.js?v=r866-2a08d6b00273";
import { mountAstralWalker, syncAstralMount, dismountAstralWalker, recordAstralRiderDamage, beginAstralBoarding, tickAstralBoarding, tickAstralRiderChoice, tickAstralFighterChoice } from "./astral-worm-mount.js?v=r866-2a08d6b00273";
import { rangedWeapon, primaryProfile, SPELLS, affixValue, itemScore, itemTier, ITEM_TIERS, upgradeEquipment, APERTURE_SKILLS, skillRank, apertureBand, APERTURE_BANDS, normalizeItemUpgrade } from "./items.js?v=r866-2a08d6b00273";
import {
  generateRegion,
  regionSettled,
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
} from "./world.js?v=r866-2a08d6b00273";

function applyFallenTreeCrossings(map) {
  for (const o of map?.objects || []) {
    if (o.kind !== "tree" || o.state !== "fallen" || !o.crossingTiles) continue;
    for (const p of o.crossingTiles) {
      const i = p.y * 32 + p.x, t = map.tiles[i];
      if (t?.environment) map.tiles[i] = { ...t, kind: "logBridge", blocked: false, bridgeOver: t.environment };
    }
  }
}
import { ensureSlots, slotted, pairingMods, slotReadiness, activeButton, slotTool, CASTABLES, availableCastables } from "./spell-slots.js?v=r866-2a08d6b00273";
import { generateGrotto, DIVE_GENERATOR, GROTTO } from "./grottoes.js?v=r866-2a08d6b00273";
import { beastCatchUp } from "./stages.js?v=r866-2a08d6b00273";
import { POTIONS, potionToDrink, potionHeal, potionsReady, craftPotion } from "./potions.js?v=r866-2a08d6b00273";
import { CACHE_PICKUP_VISUAL_MS, CHEST_OPEN_VISUAL_MS, SHOVEL_DIG_VISUAL_MS, STONE_PLACE_VISUAL_MS, CONSUME_VISUAL_MS, cancelCachePickupVisual, cancelConsumeVisual, normalizePersistentCachePickupVisual, normalizeConsumeVisual, normalizeHurtVisual, sampleCachePickupVisual, sampleConsumeVisual, sampleHurtVisual } from "./consume-visual.js?v=r866-2a08d6b00273";
import { DUNGEON_LADDER, ladderTier, ladderRoll, crossingLadder, ladderGuardian, entranceKind } from "./dungeon-ladder.js?v=r866-2a08d6b00273";
import { diveGate, subGate, underwaterGate, mechGate, droneGate, MECH, MECH_POWER, MECH_LAVA, MECH_WATER, MECH_VOID, DRONE, DRONE_LIFT, DRONE_FIZZLE, INTERIOR_TRAVERSAL, interiorCeilingHeight, interiorArchAt, droneForbiddenAt, GLIDER_FORBIDDEN, gliderForbiddenAt, TREE_GLIDE, treeGlideWindowAt, ensureMech, mechAbsorb, voidTick, tickMech, setEmpowered, mechEmpowered } from "./vehicle-gates.js?v=r866-2a08d6b00273";
import { DIVE, diveSite, diveId, canDive, diveSiteHint, grantLens, buyRig, breathe, generateDiveSite } from "./diving.js?v=r866-2a08d6b00273";
import { seaSpawns, seaCombatantFields, updateSeaCreature, SEA_CREATURES, SEA_HABITATS, leviathanTrophy, LEVIATHAN_TROPHY, isSeaKind } from "./sea-creatures.js?v=r866-2a08d6b00273";
import { WOOD, woodFor, addWood, buildSkiff, SAILABLE_DEEP } from "./boats.js?v=r866-2a08d6b00273";
import { submersible, fitSubmersible, aboard, sailable, BOAT, canBuildSkiff, mendSkiff, buyHullShield, deployHullShield, tickHullShield, buySkiff, repairSkiff, repairCost, board, disembark, skiffMooring, hullAbsorb, hullStrike, sailStep, steer, ensureBoatState, takeSpare } from "./boats.js?v=r866-2a08d6b00273";
import { OPEN_SEA_VERSION, seaHazards, tickSeaHazards, bergAt, waveCrest, stormAt, novaFogCapable, novaFog, tickNovaFog } from "./open-sea.js?v=r866-2a08d6b00273";
import { canSwim, swimsThrough, isSwimmableKind, tidemantleTrial, grantTidemantle, swimUpkeep, dungeonWaterToll, TIDEMANTLE, mireSpeed, rotTick, healthCeiling, clearRot, MIRE, ensureRot, rotCap } from "./water-traversal.js?v=r866-2a08d6b00273";
import { createCombatant, dodge, enemyBodyRadius, MELEE_PATTERNS, enemyMeleeGeometry, pointInEnemyMelee } from "./combat.js?v=r866-2a08d6b00273";
import {
  applyInteraction,
  validActions,
  recordNpcDamage,
  dungeonHistory,
  abandonDungeon,
  journalOnce,
  gainAperture,
  progressLead,
} from "./interactions.js?v=r866-2a08d6b00273";
import { ensurePerceptionInPlace, validCheckpoint, REFUGE_CHECKPOINT, deadFoeRecord, compactArea, isTombstone, tombstoneBlanks } from "./types.js?v=r866-2a08d6b00273";
import { FIELD, FIELD_PASSIVES, fieldOn } from "./lattice-fields.js?v=r866-2a08d6b00273";
import { ARC_WAVE, MIRAGE, GOLEM, CLUSTER, FIRE_BURST, SUNBURST, ORRERY, orreryPress, tickOrrery, orreryOnHit } from "./tool-forms.js?v=r866-2a08d6b00273"; // and the Aether Orrery (a magic tool)
import { FRACTURED, fracturedMode, densityPacks, packSpawns, applyFracturedRank, rankXp, FRACTURE_WARDEN, fractureKey, fractureRecord, fractureSealed, fractureNeed, fractureKill, wardenBody, wardenAttacks } from "./fractured.js?v=r866-2a08d6b00273";
import { tickAffixes, rollAffixes } from "./affixes.js?v=r866-2a08d6b00273";
import { stalkerCaught, stalkerTrapAttempt, STALKER, ensureStalker, stalkerUnlocked, stalkerTrack, stalkerWarning, stalkerNewSection, stalkerEngaged, stalkerLost, stalkerWaitAtDoor, stalkerDoorHere, stalkerPlayerFell, stalkerSlain, stalkerVitals, stalkerLair, stalkerEscaped, ambushSpots, updateStalker } from "./stalker.js?v=r866-2a08d6b00273"; // release 678: the Stalker
import { applyBossKit, tickBossKit } from "./boss-kit.js?v=r866-2a08d6b00273";
import { wonderRumour, wonderAt } from "./wonders.js?v=r866-2a08d6b00273";
import { DUNGEON_TRAPS, TRAP_DAMAGE_SHARE, trapShareScale, addNewTraps, tickNewTraps } from "./dungeon-traps.js?v=r866-2a08d6b00273";
import { sectionAtlasColor } from "./atlas-colors.js?v=r866-2a08d6b00273";
import { ensureSkylands } from "./skylands.js?v=r866-2a08d6b00273";
import { SKYLANDS, SKY_BASE, validSkySummitRoute, skylandAdmission, skyVitals, skyRoleOf, SKY_PLACE, SKY_ANNEX, VISCERA, DAIS, visceraOf, isDivineRun, takePact, visceraEarned, visceraScale, pactWords, skyAnnexStair, skyAnnexFloor, skyAnnexNext, isSkyland, skylandSection, skylandTierOf, skylandScale, skylandWave, beginSkyland, completeSkyland, skylandPlan, skylandModeOf, skylandHops, skylandHop, SKY_MODES, buildSkyway, buildSkyDiscs, discAt } from "./skylands.js?v=r866-2a08d6b00273";
import { generateItem, BRAWLER_LOOT } from "./items.js?v=r866-2a08d6b00273";
import { SMITHY } from "./smithy.js?v=r866-2a08d6b00273"; // release 607: one salvage table
import { echoEvent, tickEchoes, echoDrop, pounceBonus, ECHOES } from "./echoes.js?v=r866-2a08d6b00273";
import { riftStep, tickRiftCharges, skillDurationScale, extraReduction, strikeAmplifier, onConstellationDodge, onConstellationMelee, onConstellationKill, onSkillEnded, tickConstellation, altOn, ALT_PASSIVES } from "./constellation.js?v=r866-2a08d6b00273";
import { activeMealBonus, eatMeal, tickMeal, mealName } from "./meals.js?v=r866-2a08d6b00273";
import { RULES as MARGIN_RULES, MARGINALIA, EMBER_WAKE, RED_MARGIN, SECOND_WIND, SHADOW_STEP, HOURGLASS, INK_SHIELD, GILDED, marginBonus, marginRun, beginMarginRun, endMarginRun, runHas, wardenSpawns, wardenOffer, wardenPage, chooseMarginalia, pasteMarginalia, marginaliaOpen, marginCrossing, ensureMarginalia } from "./marginalia.js?v=r866-2a08d6b00273";
import { giftResonances, hostLoadout, glyphHit, glyphDamage, echoPlan, tickGlyphStatus, discoverResonances, glyphDrop, salvageDust, GLYPHS, RESONANCES, resonanceInfo, armorGlyphBonus as armorGlyphBase, skillGlyphMods, normalizeSockets } from "./glyphs.js?v=r866-2a08d6b00273";
import { hashSeed, rng, byHash } from "./random.js?v=r866-2a08d6b00273";
import { riderLiftOf, MOUNT_BEASTS, MOUNT_RIDE, mountIdFor, catchableActor, neverCaught, catchRefusal, catchRoll, stableMount, ridingMount, mountById, mountName, mountLifeText, startRide, stopRide, tickRide, noteRideSection, defaultMount, releaseMount, ensureMounts } from "./beast-mounts.js?v=r866-2a08d6b00273"; // release 748: penning catches, the stable and riding
import { ensureBuild, activeBuildKind, setBuildKind, placeBuild, buildSpot, tickBuilds, buildBetween, strikeBuild, buildOn, tapTarget, tallBuildAt, enclosureAt, enclosuresStanding, playerEnclosure, enclosureShields, breakBuild, ENCLOSURE } from "./building.js?v=r866-2a08d6b00273";
import { WATCHER, placeWatcherOverworld, placeWatcherDungeon, dungeonFoldTarget } from "./watcher.js?v=r866-2a08d6b00273";
import { refugeLands, plantRefugeLands, regrowSection, noteDiscovery, talkLine } from "./refuge-lands.js?v=r866-2a08d6b00273";
import { HORDE, rollHorde, ensureHorde, hordeKill, hordeSpawnPoints } from "./revenant-horde.js?v=r866-2a08d6b00273";
import{ELITE_KINDS,eliteVariant,ensureEliteState,eliteStateInPlace,recordPortalPrey,completeElite,gravityPull,addEliteHazard,tickEliteHazards,tickEliteStatus,cleansePoison,applyPoison,applyStrongPoison}from'./elites.js?v=r866-2a08d6b00273';
import{domainSectionAt,HUNT_FOUNDRY,huntTraceStage,admittedFoundrySpawn,refreshViewportBoard,generatedHuntSpawn,foundryCandidate,foundryEncounter,validateFoundryCandidate,activeViewportHunt,completeViewportHunt,recordViewportArrival,domainEncounterPlan,completeDomainBoss,manifestationMechanics,ensureHuntInstance,beginHuntInstance,abandonHuntInstance,completeHuntInstance,cleanupHuntInstance,recordPeoplePlace,resolveHuntDestination}from'./foundry.js?v=r866-2a08d6b00273';
import{ensureCorridorSystems,storySiteFor,recordSectionVisit,recordCreatureEncounter,recordCreatureDefeat,recordRevelationLead}from'./story.js?v=r866-2a08d6b00273';
import{generateVariedDungeon,generateUnifiedDungeon,generateBespokeArena,populateDungeonEncounters,DUNGEON_ACTIVE_CAP}from'./arenas.js?v=r866-2a08d6b00273';
import{applyDungeonDiscovery,discoveryForLevel,dungeonChunkId,revealDungeonAt}from'./dungeon-framework.js?v=r866-2a08d6b00273';
import{ensureSceneState,queueScene}from'./scenes.js?v=r866-2a08d6b00273';
import { buildEnemyProjectilePattern, advanceEnemyProjectileBehaviors, enemyPatternWindup, tuneDungeonThreat } from "./enemy-patterns.js?v=r866-2a08d6b00273";
import { varyDungeonLayout } from "./dungeon-variation.js?v=r866-2a08d6b00273";
import { generateExpeditionDungeon, DUNGEON_GENERATOR_V5, THEME_POOL_VERSION, MIRE_CRYPT, rollMireCrypt, DREAM_HALL, dreamHallRoll } from "./underlands.js?v=r866-2a08d6b00273";
import { relayNodeDecision, placeRelayNode, ensureRelayNetwork } from "./relay-network.js?v=r866-2a08d6b00273";
import { ASCENDANCY, RITE_LOCKDOWN, riteExit, saplingHere, riteRecord, triesLeft, riteSkyway, riteKey, waveGap, riteRamp } from "./ascendancy.js?v=r866-2a08d6b00273";
import { CANYON, canyonIdFor, isCanyonId, canyonHere, isClod, ensureCanyonHistory, generateCanyon, drillClod, settleClods, clodSecret } from "./canyon.js?v=r866-2a08d6b00273";
import { KEEPS, keepHere, buildKeep, ARCOLOGY, arcologyHere, buildArcology, exitsOpen } from "./keeps.js?v=r866-2a08d6b00273";
import { BUILDINGS, buildingHere, buildingHereV2, placeBuilding, placeBuildingV2, isBuildingId, generateBuildingFloor, buildingArrival, buildingScale, parseBuildingId, ROOF_EXIT, roofExitSpot, roofLanding, TOWER_SEAL, towerUnsealed, towerSealText } from "./great-buildings.js?v=r866-2a08d6b00273";
import { CLOSE_VIEW_ROOM_ROUTING, routingKeepAppearance, roomPaddingFootprint, applyRoomPadding } from "./close-view-room-routing.js?v=r866-2a08d6b00273";
import { COMPOUNDS, compoundHere, placeCompound, isCompoundId, generateCompoundFloor, parseCompoundId, compoundVersionOf } from "./compounds.js?v=r866-2a08d6b00273";
import { LABYRINTHS, labyrinthHere, placeLabyrinth, isLabyrinthId, generateLabyrinthChamber, parseLabyrinthId, HOLE_DROPS, safeDropAt, LAB_BURROW, ROOM_MAZES, openRoomGate, roomGateSide, labFogOn, labFogOf, labFogLook, labFogTile, labFogStore } from "./labyrinths.js?v=r866-2a08d6b00273";
import { TURTLE_SHELL, placeTurtleShell, applyTurtleShell, liftTurtleShell, addShell, shellsAt, takeFaded, shellId, shellLabyrinthBase, shellVaultReward, ensureTurtleShells } from "./turtle-shell.js?v=r866-2a08d6b00273"; // the Mountain Turtle's shell and its labyrinth
import { CASTLES, castleCorner, castleAt, placeCastleQuarter, isCastleId, generateCastleFloor, quarterSection, castleVersionOf, parseCastleId, castleTopology } from "./castles.js?v=r866-2a08d6b00273";
import { PENTAGON_ARENA, pentagonArenaId, isPentagonArenaId, parsePentagonArenaId, pentagonArenaPick, pentagonArenaRow, pentagonArenaRoster, pentagonArenaVitals, generatePentagonArena, pentagonArenaVersion } from "./pentagon-arena.js?v=r866-2a08d6b00273"; // the Pentagon's finale arena, the Stillworks
import { TESSERACTS, grantTesseract, ensureTesseracts, rerollTesseractLine, tesseractLine } from "./tesseracts.js?v=r866-2a08d6b00273";
import { PENTAGON, pentagonCentre, pentagonAt, placePentagonSection, isPentagonId, generatePentagonChamber, pentagonPlan, pentagonSeamOpen, PENTAGON_LORE, addPentagonInscription, readPentagonInscription, parsePentagonId, pentagonLinkEnds, pentagonLinkKey, isPentagonFinaleId, parsePentagonFinaleId, generatePentagonFinale, pentagonFinaleSpot, pentagonFinaleWall, pentagonFrontDoor, pentagonRoofAt, pentagonRoofSpots, PENTAGON_COMPLETE, payPentagonCompletion, pentagonsDue, pentagonCompleted, pentagonFellEarly, PENTAGON_FINDING, pentagonCatchment, pentagonCandidate, pentagonSigilRoll, pentagonSigilText, ensurePentagonFinding, pentagonHuntsOpen, pentagonHuntProbes, pentagonHeading, pentagonFarWords } from "./pentagon.js?v=r866-2a08d6b00273";
import { PENTAGON_HALLS, readPentagonMural, pentagonMuralsState } from "./pentagon-halls.js?v=r866-2a08d6b00273"; // release 795: the grand halls' murals
useRoof({ roofAt: pentagonRoofAt, roofSpots: pentagonRoofSpots }); // release 752: the roof dwellers live on the v7 Pentagon roof
import { THE_DEEP, ensureTheDeep, deepIdFor, isDeepId, deepShaft, shaftHere, startFloors, floorPlan, floorScale, floorAffixShare, guardianAffixes, lootBonus } from "./the-deep.js?v=r866-2a08d6b00273";
import { DEEP_ANNEX, annexRecord, annexFloorId, annexThird, annexScale, annexExit } from "./deep-annex.js?v=r866-2a08d6b00273";
import { trackSeason, noteSeasonDiscovery } from "./seasons.js?v=r866-2a08d6b00273";
import { growRiteTree, riteTreeFits, COHERENCE, bridgeLanes, cohereSection, joinToLand, joinsCore, coherenceCore, creatureSpot, creatureRegions, settleSpawns } from "./landscape.js?v=r866-2a08d6b00273";
import { GREAT_MUSHROOMS } from "./great-mushrooms.js?v=r866-2a08d6b00273";
import { interiorTerrain, interiorSurfaceLevel, interiorSurfaceHeight, LIFT_PER_LEVEL, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, REGIONS, farSleepSection, biomeFor, openSeaSection, canStep, LANDSCAPE_VERSION, DEEP_WATER, LETHAL_KINDS, elevationAt, fallDamage, tileUnder, nearestReturnable, canReturnTo, safeVoidScarTransition, liftAt, tileLiftScale, mendCanopy, HOT_SPRINGS, springMend } from "./landscape.js?v=r866-2a08d6b00273";
import { DRAGON, FRENZY, STAG, stagMireAt, BOSS_PACE, bossPaced, staggerGovernor, windupHeld, GATE_REVENANT, GIANT, TURTLE, tuneGatePredator, updateGatePredator, resetGateAttack, nanoScatters, glyphsReachSwarm, CRYSTAL, reflectShotStep, MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, MONSTER_PACK_VERSION, guardianKindFor, GUARDIAN_POOL, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime, packCombatantFields, populateOverworldPack, isDungeonRoamer, isDungeonHunter, gloomDarkEnd, isPackKind } from "./monster-pack.js?v=r866-2a08d6b00273";
import { HAMLET_VERSION, applyHamlet, hamletSection, legacyMouthHamlet } from "./settlements.js?v=r866-2a08d6b00273";
import { addStrange, touchStrange } from "./strange.js?v=r866-2a08d6b00273";
import { DIG, isInteriorArea, markWalked, planDig, validateDigPlan, ensureShovel, ensureIronShovel, dig, applyTunnels, overworldDigKey, OVERWORLD_DIG, saveTier, wallGlints, wallTreasure, addDigSpot, digSpot, addStone } from "./digging.js?v=r866-2a08d6b00273";
import { linkedExit, mouthsIn, placeMouth } from "./linked-dungeons.js?v=r866-2a08d6b00273";
import { TYRANT_HUNT, tyrantVisit, tickTyrantHunt, tyrantRisePoint, countTyrantRise } from "./tyrant-hunt.js?v=r866-2a08d6b00273";
import { TRAVEL_VERSION, applyTrails, addTravelers, addReciter, addDungeonReciter, addElder, addDungeonElder, addWanderer, tickTravelers, wandererArrive, wandererKill } from "./travelers.js?v=r866-2a08d6b00273";
import { dragonRecord, dragonCast, castTiles, applyDragonLava } from "./crimson-dragon.js?v=r866-2a08d6b00273";
import { FAR_REALMS, FAR_CIVS, FAR_FOLK, FAR_DOMAINS, isFolk, farRealmAt, giantify, farPocketAt, populatePocket, populateInk, openFarQuest, farDomainAt, farDomainCentre, farQuestInfo } from "./far-realms.js?v=r866-2a08d6b00273";
import { buildDomain, domainWait, domainArrival } from "./far-domains.js?v=r866-2a08d6b00273";
import { ROOF_DWELLERS, roofSpawns, roofTick, tuneDweller, useRoof } from "./roof-dwellers.js?v=r866-2a08d6b00273"; // the Pentagon roofs' dwellers
import { HAUNT, hauntPlan, hauntSpawns, hauntKnot, splitDelay, curseDef, rollCurses, layCurse, curseBlocking, expireCurses, cursesOut, cursesIn, GLOOM_FINALE, gloomFinaleSpawn, gloomVitals, gloomOrbSpots, gloomDarkLevel } from "./haunts.js?v=r866-2a08d6b00273";
import { beastUnlocked as beastOpenFor, beastRoamsAt, ensureWorldBeasts as ensureBeastsFor, beastProfileVitals, liveBeastReference, BEAST_PLAY, WORLD_BEASTS, BEAST_HOMES, BEAST_FOREST, CHRYSALIS, mothChrysalisFor, encounterMet, RETREAT, PURSUIT, retreatsUnderWay, replanRetreat, noteSectionVisit, BLOB_SPLIT, canPursue, pursued, pursuitSpawn, worldBeastFor, passingBeastFor, worldBeastTriesLeft, tuneWorldBeast, worldBeastSlain, worldBeastCaught, worldBeastPlayerFell, worldBeastPatience, beginRetreat, beginDungeonRetreat, worldBeastForDungeon, retreatTarget, retreatPath, retreatCrossed, retreatEnded, worldBeastsLost, walkerReachableTiles, walkerRetreatDoors, applyVoidScars, consumeVoidTerrain, isMarineTile, marineTileOpen } from "./world-beasts.js?v=r866-2a08d6b00273";
import { QUESTING_BEAST, questingBeastFor, questingBeastTriesLeft, tuneQuestingBeast, questingBeastSlain, questingBeastPlayerFell, ensureQuestingBeast } from "./questing-beast.js?v=r866-2a08d6b00273";
import { ensureLattice, grantCoordinates, latticeOpen } from "./transit-lattice.js?v=r866-2a08d6b00273";
import { ensureHometowns, grantTowns, townAt, homeKey, homeCenter, homeName } from "./hometowns.js?v=r866-2a08d6b00273";
import { generateListenerArena, isArenaRun, daisDue } from "./listener-arena.js?v=r866-2a08d6b00273";
import { MIRROR_FORM, isMirror, tickMirrorListener, tickReflection } from "./listener-mirror.js?v=r866-2a08d6b00273";
import { MORPH_FORM, isMorph, tickMorphListener, tickWorm } from "./listener-morph.js?v=r866-2a08d6b00273";
import { swapPreset, stashForOtherPreset } from "./build-presets.js?v=r866-2a08d6b00273";
import { SHADOW_CLONE, cloneOffset, clampPlacement, clonePosition, chargeDistance, tickSpellFields } from "./late-spells.js?v=r866-2a08d6b00273";
import { BRAWLER, IRON_FISTS, BRAWLER_ECHO, fistCharge, IMBUE, imbueAmount, imbueSpark, ESSENCE_WALK, essenceSpellCost, essenceExempt, essenceLockout } from "./brawler-spells.js?v=r866-2a08d6b00273"; // release 483; 489: Iron Fists; Imbue Weapon; Essence Walk
import { ORBIT, orbitLaunch } from "./orbit-volley.js?v=r866-2a08d6b00273"; // release 487
import { arrayPylons, runName, FAR, LISTENER_FORMS, ensureFarArray, arrayMouthAt, beginArrayRun, isArrayRun, runBossSpawn, summonSpawn, scaleForGate, summonThresholds, listenerHides, guardianFelled, listenerFelled, beginListenerArena, piecesNeeded, killsToClimb, piecesToUnlock, boonTotals, tuneArrayBoss, silentMouthAt, relaysUntilReturn, LISTENER_CYCLE } from "./far-array.js?v=r866-2a08d6b00273";
import { addSkirmish, skirmishFields, updateSkirmisher } from "./skirmishes.js?v=r866-2a08d6b00273";
import { addIlse, meetIlse } from "./ilse.js?v=r866-2a08d6b00273";
import { addBell, ringBell, BELL_GLIMPSES } from "./bells.js?v=r866-2a08d6b00273";
import { addTornPage, readTornPage, PAGES_FINAL } from "./torn-pages.js?v=r866-2a08d6b00273"; // release 595
import { addThreadRelic, readThreadRelic, storyVersionFor } from "./threads.js?v=r866-2a08d6b00273"; // release 627; the story budget (2026-11-05)
import { addMargin, readMargin } from "./margins.js?v=r866-2a08d6b00273";
import { addSurveyorLink, takeSurveyorLink, SURVEYOR, addSurveyorStatue, visitSurveyorStatue, surveyorStatueSection } from "./surveyor.js?v=r866-2a08d6b00273"; // release 505; 551: part two
import { READINGS, readingKnown, bookProgress } from "./lore.js?v=r866-2a08d6b00273";
import { requiredBossId, registerDungeonBosses, recordDungeonBossDefeat, claimDungeonPayoff, installCompletionExit } from "./dungeon-completion.js?v=r866-2a08d6b00273";
const remaining = (v, n) => Math.max(0, Number(v || 0) - n);
// Release 736 (full-game review F5/F6, C12/C13): every wall-clock timer (an absolute time on the update clock, in ms) the
// Wayfarer or the Game keeps, in one place. setPaused shifts all of them by the paused time, so nothing runs out while
// paused; the RESUME lists are also saved as time remaining (playerRuntime.clocks) and restored on reload (exact resume).
// Message throttles (…MessageAt, …HintAt) are left out on purpose: they only space out messages.
export const PLAYER_CLOCKS = ["castUntil", "attackReadyAt", "attackUntil", "actionVisualUntil", "primaryVisualUntil", "fistVisualUntil", "meleeUntil", "dodgeReadyAt", "invulnerableUntil", "dodgeUntil", "heldUntil", "stunnedUntil", "stunnedAt", "shockAt", "slowUntil", "confusedUntil", "echoVoidReadyAt", "echoPounceUntil", "echoWardReadyAt", "echoMirrorReadyAt"];
export const GAME_CLOCKS = ["jumpUntil", "jumpStart", "toolReadyAt", "golemReadyAt", "orreryLockUntil" /* the Aether Orrery overload */, "aegisUntil", "aegisLockUntil", "boxingUntil", "imbueUntil", "essenceUntil", "fistRecoverUntil", "inkUntil", "subDiveUntil", "unstickReadyAt", "_inkShieldAt", "lastCrownAt"];
// Timers inside runtime objects: { owner: [fields] } on the Game, and on the player.
export const GAME_NESTED_CLOCKS = { golem: ["start", "nextAt", "sinkAt"], orbit: ["start"], fistCharge: ["start"], shadowClone: ["until"], pendingToolUse:["acceptedAt","releaseAt"], aimMark: ["until"], rite: ["started", "until", "nextAt"], treeRise: ["start", "end", "nextRubble"], fracState: ["nextAt"], stalkFog: ["until"], ledgeHint: ["until"], fallen: ["until"], edgeHold: ["at"] /* perf pack P6 EDGE_HOLD: a wall-clock stamp */ };
export const PLAYER_NESTED_CLOCKS = { echoCharge: ["until"], echoMist: ["until"] };
// Timers inside lists of runtime objects on the player: { list: [fields] } (release 737: the haunt curses).
export const PLAYER_LIST_CLOCKS = { curses: ["until", "at"] };
// Saved as ms remaining and restored on reload (the other player timers above are saved by their own playerRuntime fields).
export const RESUME_PLAYER_CLOCKS = ["castUntil", "slowUntil", "confusedUntil", "heldUntil", "stunnedUntil", "echoVoidReadyAt", "echoPounceUntil", "echoWardReadyAt", "echoMirrorReadyAt"];
export const RESUME_GAME_CLOCKS = ["toolReadyAt", "golemReadyAt", "orreryLockUntil", "aegisUntil", "aegisLockUntil", "boxingUntil", "imbueUntil", "essenceUntil", "fistRecoverUntil", "inkUntil", "subDiveUntil", "_inkShieldAt"];
export function shiftClocks(game, d) {
  if (!(d > 0)) return;
  const p = game.player || {};
  for (const k of PLAYER_CLOCKS) if (p[k]) p[k] += d;
  for (const k of GAME_CLOCKS) if (game[k]) game[k] += d;
  for (const [o, ks] of Object.entries(GAME_NESTED_CLOCKS)) { const q = game[o]; if (q && typeof q === "object") for (const k of ks) if (typeof q[k] === "number" && q[k]) q[k] += d; }
  for (const [o, ks] of Object.entries(PLAYER_NESTED_CLOCKS)) { const q = p[o]; if (q && typeof q === "object") for (const k of ks) if (typeof q[k] === "number" && q[k]) q[k] += d; }
  for (const [o, ks] of Object.entries(PLAYER_LIST_CLOCKS)) for (const q of Array.isArray(p[o]) ? p[o] : []) if (q && typeof q === "object") for (const k of ks) if (typeof q[k] === "number" && q[k]) q[k] += d;
  for (const patch of game.echoPatches || []) if (patch.until) patch.until += d;
}
// Release 736 (review F3): stacked dodge-cost reductions (glyphs past the cap, Tesseracts, meals, a Fleet Hand margin) could
// take the cost below zero, so a dodge gave stamina back. It never costs less than DODGE_COST.min (at the glyph cap it is 6).
// Tim, 2026-11-05 ("I need infinite dodge"): `min` 0 (was 1.5): enough reduction makes a dodge free, never a refund.
export const DODGE_COST = { base: 15, min: 0 };
export const CAST_GESTURES=Object.freeze({
  'cinder-dart':'focus-forward','ember-ring':'outward-ring','grave-sun':'raised-orb','shadow-clone':'dusk-split','gravity-well':'compression','stillpoint':'time-ward',
  aegis:'crossed-ward','shadow-boxing':'fighting-stance','fire-burst':'fan-release','imbue-weapon':'weapon-imbue','essence-walk':'flow-forward','orbit-volley':'orbit-gather',
  'ember-form':'form-rise',quickening:'acceleration','veil-guard':'body-ward','force-channel':'power-draw','aerial-step':'traversal-brace','rift-step':'rift-fold',
});
export const RIFT_FLASH = .6; // release 519: seconds an instant Rift Step lights its button
export const EQUIPMENT_CAPACITY = 60;
// Release 571 (skylands.ts): the arena becomes a Skyland: its own boss waits for the last wave, the first wave is placed.
// Release 589: a run with a mode (skylands.ts SKY_MODES) follows its own plan, on a cloud island (map.skyCloud, renderer.ts).
function dressSkyland(map, id, save = null) {
  const boss = map.enemySpawns?.[0]?.kind || "hollowMarshal", tier = skylandTierOf(id), width = map.width || 36, open = map.tiles.filter((t) => !t.blocked && !t.environment && Math.hypot(t.x - map.entry.x, t.y - map.entry.y) > 5), mode = skylandModeOf(id);
  Object.assign(map, { skyland: true, skyTier: tier, skyBoss: boss, skyOpen: open.map((t) => ({ x: t.x, y: t.y })), name: mode ? `Skyland · ${SKY_MODES.names[mode]} · Ascension ${tier}` : `Skyland · Ascension ${tier}`, weather: "petals" });
  const pact = save ? dungeonHistory(save, id).skyPact || null : null; // release 682: the Divine Viscera offered for this challenge
  map.skyPlan = skylandPlan(id, save, boss, pact); if (pact) map.skyPact = { ...pact }; if (mode) Object.assign(map, { skyMode: mode, skyCloud: true, weather: "sunbreak" });
  map.enemySpawns = skylandWave(id, 0, map.skyOpen, map.objective || { x: width / 2, y: 11 }, boss, map.skyPlan);
}
// Release 593 (Tim, 2026-10-30: "the whole dungeon should just be made pretty much a chasm with just bridges... walkways and
// some larger platforms... if you step off, you die... maybe there's some walls"): a share (`CHASM.chance`) of ordinary
// crossings first generated from now on are chasm crossings (history.chasm pins it; never Poison Crypts or Sleeper's Halls).
// The generator's walls fall away into a sheer drop (canyon: lethal, as everywhere): its rooms are left as platforms and its
// corridors as walkways over the dark. A few walls stand (`keepWalls`, only ones beside a walkway) and the outer edge stays. No
// floor tile changes, so everything placed in the crossing stays where it was and as reachable as it was. Creatures do not
// step into the drop; the brink guard stops the Wayfarer at the edge, and a dodge-roll over it is a fall.
// Release 635 (Tim, 2026-11-01: "you should have a parachute... so that when you fall, you can kind of control your flight left and
// right better... descend more slowly... go to a high branch and then glide down... the only way you can glide is if you get up in
// a tall tree... float down pretty much as much as you want in any direction... if you jump off a tree and you're high enough you
// can glide into the next undiscovered tile"): the leaf glider, found on the landing of the first great tree climbed
// (save.glider, additive). It opens only on a fall of `minDrop` levels or more from a great tree. Gliding, the Wayfarer sinks
// `sink` levels a second and steers freely at up to `speed` tiles a second (eased by `steer`), over walls, trees and water, and on
// over the section's edge into the next. It ends only over open ground it can stand on; over water, walls or anything else it
// holds at `skim` levels until there is. Tall blocked things (a trunk) still stop it. Out of reach of blows while above `safe`.
export const GLIDE = { minDrop: 4, sink: 1.5, speed: 4.6, steer: 3.2, skim: .35, safe: 1.5, drop: 9, dropSpeed: 1.8, // 641: closed, a freefall: `drop` levels a second, `dropSpeed` of drift
  found: "Caught in the crown's highest fork: a glider of leaf and vine, light as a held breath. Leave the crown of a great tree and it will carry you down.",
  open: "The leaf glider opens. Steer where you will; Jump folds it again.", shut: "You fold the glider and drop like a stone.", falling: "Falling! Jump to open the glider.", skimming: "Nothing to land on below: the glider holds above it.", land: "You come down out of the sky.",
  noClimb: "The ground ahead stands higher than you fly: a glider only ever carries you down." }; // noClimb (Tim, 2026-11-05: "you should not be able to take the glider up"): a glide never gains height
// TREE_GLIDE.home: where a death after a glide from the crown wakes you: the crown tile nearest its middle that is neither the door nor the
// Crown Rest (so waking there does not open the door; the rest point is taken by wakeOnCrown itself), as a player position. Null without a crown.
export function crownSpot(map) {
  const top = map?.canopy?.top, tiles = map?.tiles; if (!top || !tiles) return null;
  const gate = (map.objects || []).find((o) => o.kind === "canopyGate"), rest = (map.objects || []).find((o) => o.kind === "crownRest");
  const c = map.canopy, own = (t) => !(c.size > 0) || (t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size); // the door tree's own crown (a canopy grove's other crowns may stand as high)
  const crown = tiles.filter((t) => t.kind === "canopyTrunk" && t.elev === top && own(t)); if (!crown.length) return null;
  const mx = crown.reduce((a, t) => a + t.x, 0) / crown.length, my = crown.reduce((a, t) => a + t.y, 0) / crown.length;
  const free = crown.filter((t) => !(gate && t.x === gate.x && t.y === gate.y) && !(rest && Math.hypot(t.x - rest.x, t.y - .2 - rest.y) <= .9)), pool = free.length ? free : crown; // .9: touchCrownRest's reach
  const t = pool.sort((a, b) => (Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my)) || (a.y - b.y) || (a.x - b.x))[0];
  return { x: t.x, y: t.y - .2 };
}
export const PASS_CLEAR = .25; // release 643: how far past a body a projectile must be before its next pass counts as a new hit
export const CANOPY_FALL_MS = 2500; // release 633: how long after leaving the great tree's crown a fall still opens the glider (637)
export const CHASM = { version: 1, chance: .2, /* release 672: was .12; rolled once, at a crossing's first entry, and kept */ keepWalls: .12, name: "Starfield" }; // release 613 (Tim: "the chasm dungeons... those are now called Starfield dungeons"): was "Chasm"
// Release 613 (Tim, 2026-10-31: "moving platforms... you can jump on them... take a ride like a conveyance... across a larger
// [chasm]... those moving platforms can be in the... Starfield dungeons"): rafts of stone glide to and fro over straight runs of
// the drop between two walkways (`span` tiles of drop), up to `count` per map at least `apart` tiles from each other, at `speed`
// tiles/s with a `rest` at each end. Their place is a function of save.playSeconds, so a reload finds them where they were. The
// Wayfarer standing on one rides it (carried with it) and does not fall; creatures do not ride. Pure data on map.movers.
export const STARFIELD_PLATFORMS = { count: 4, length: [6, 34], minHop: 8, tries: 40, speed: 1.6, rest: 1.2, half: .85, rise: 2, dip: -1.6, shares: { rise: .35, dip: .25 } };
// Release 615 (Tim, 2026-10-31: "the platforms don't have to move all in straight lines... 2 paces forward, then 2 paces to the left
// ... it could be non obvious where... the platform's going to take you... across a large section of dungeon... you could step
// off the platform at some point... they can pick you up and take you above the level... some... beneath the level... nonlinear
// paths"): a raft rides a track: the shortest way over the drop (4-neighbour, drop tiles only) from beside one walkway to beside
// another at least `minHop` tiles off, `length` tiles long, turning where the drop turns; tracks do not share drop tiles. Some
// tracks rise above the level (`rise` levels at their middle) and some sink beneath it (`dip`), back to the level at both ends.
function findPlatformSpans(map, seed, id) {
  const P = STARFIELD_PLATFORMS, w = map.width, h = map.height || Math.ceil(map.tiles.length / w), at = (x, y) => x >= 0 && y >= 0 && x < w && y < h ? map.tiles[y * w + x] : null;
  const floor = (t) => t && !t.blocked && !t.chasm, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], used = new Set(), out = [];
  const landings = map.tiles.filter((t) => floor(t) && N4.some(([dx, dy]) => at(t.x + dx, t.y + dy)?.chasm)).sort(byHash((a) => `${seed}:raft-landing:v2:${id}:${a.x},${a.y}`));
  for (let k = 0; k < Math.min(P.tries, landings.length) && out.length < P.count; k++) {
    const a = landings[k], start = N4.map(([dx, dy]) => at(a.x + dx, a.y + dy)).find((t) => t?.chasm && !used.has(t.y * w + t.x)); if (!start) continue;
    const prev = new Map([[start.y * w + start.x, -1]]), dist = new Map([[start.y * w + start.x, 1]]), q = [start]; let best = null;
    for (let i = 0; i < q.length; i++) { const t = q[i], d = dist.get(t.y * w + t.x); if (d > P.length[1]) continue;
      if (d >= P.length[0]) for (const [dx, dy] of N4) { const b = at(t.x + dx, t.y + dy); if (floor(b) && Math.abs(b.x - a.x) + Math.abs(b.y - a.y) >= P.minHop && (!best || d > best.d)) best = { t, d }; }
      for (const [dx, dy] of N4) { const n = at(t.x + dx, t.y + dy), key = n ? n.y * w + n.x : -1; if (!n?.chasm || used.has(key) || prev.has(key)) continue; prev.set(key, t.y * w + t.x); dist.set(key, d + 1); q.push(n); } }
    if (!best) continue;
    const cells = []; for (let key = best.t.y * w + best.t.x; key !== -1; key = prev.get(key)) cells.unshift({ x: key % w, y: Math.floor(key / w) });
    for (const c of cells) for (const [dx, dy] of [[0, 0], ...N4]) used.add((c.y + dy) * w + c.x + dx);
    const pts = cells.filter((c, i) => i === 0 || i === cells.length - 1 || (cells[i - 1].x !== cells[i + 1].x && cells[i - 1].y !== cells[i + 1].y)); // corners only
    const r = (hashSeed(`${seed}:raft-rise:v2:${id}:${k}`) % 1000) / 1000, amp = r < P.shares.rise ? P.rise : r < P.shares.rise + P.shares.dip ? P.dip : 0;
    out.push({ id: `raft-${out.length}`, pts, amp, phase: (hashSeed(`${seed}:raft-phase:v2:${id}:${k}`) % 1000) / 1000 });
  }
  return out;
}
// Where raft `m` is at play time `t`: its centre (tile units) and height `z` in levels (0 at the level): out along its track, rest,
// back, rest.
export function platformPos(m, t) {
  const P = STARFIELD_PLATFORMS, pts = m.pts || [{ x: m.ax, y: m.ay }, { x: m.bx, y: m.by }], seg = [], N = pts.length; let len = 0;
  for (let i = 1; i < N; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); len += d; }
  const go = Math.max(.001, len / P.speed), cycle = 2 * (go + P.rest), u = (((t / cycle) + (m.phase || 0)) % 1) * cycle;
  const f = len < .001 ? .5 : u < go ? u / go : u < go + P.rest ? 1 : u < 2 * go + P.rest ? 1 - (u - go - P.rest) / go : 0; // a raft with no run hovers at its height
  let d = f * len, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
  const a = pts[i], b = pts[Math.min(N - 1, i + 1)], k = seg[i] ? Math.min(1, d / seg[i]) : 0;
  return { x: a.x + (b.x - a.x) * k + .5, y: a.y + (b.y - a.y) * k + .5, z: (m.amp || 0) * Math.sin(Math.PI * f) };
}
// The raft under a Wayfarer at (x, y) at time t, or null.
export function platformUnder(map, x, y, t) {
  const fx = x + .5, fy = y + .72, H = STARFIELD_PLATFORMS.half;
  // Release 623 (the pre-publish review): only feet over the drop ride a raft; standing on a walkway beside a passing raft is
  // standing on the walkway (before, the raft dragged them along and stepping away from a sunk one was a fall into nothing).
  const w = map?.width || 32, under = map?.tiles?.[Math.floor(fy) * w + Math.floor(fx)]; if (!under?.chasm) return null;
  for (const m of map?.movers || []) { const c = platformPos(m, t); if (Math.abs(fx - c.x) <= H && Math.abs(fy - c.y) <= H) return m; }
  return null;
}
export const chasmRoll = (seed, id) => (hashSeed(`${seed}:chasm-crossing:v1:${id}`) % 1000) / 1000 < CHASM.chance;
function carveChasm(map, seed, id) {
  const w = map.width || Math.round(Math.sqrt(map.tiles.length)), h = map.height || Math.ceil(map.tiles.length / w), at = (x, y) => x >= 0 && y >= 0 && x < w && y < h ? map.tiles[y * w + x] : null;
  const walkway = (t) => t && !t.blocked && !t.chasm;
  let n = 0;
  for (const t of map.tiles) {
    if (!t.blocked || t.door || t.structure || t.buildingId || t.kind === "sealedGate" || !/wall$/i.test(String(t.kind)) || t.x <= 0 || t.y <= 0 || t.x >= w - 1 || t.y >= h - 1) continue;
    const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => walkway(at(t.x + dx, t.y + dy)));
    if (beside && (hashSeed(`${seed}:chasm-wall:v1:${id}:${t.x},${t.y}`) % 1000) / 1000 < CHASM.keepWalls) continue;
    Object.assign(t, { kind: "canyon", blocked: false, environment: "canyon", chasm: true }); n++;
  }
  Object.assign(map, { chasm: CHASM.version, name: map.name ? `${map.name} · ${CHASM.name}` : CHASM.name });
  map.movers = findPlatformSpans(map, seed, id); // release 613
  return n;
}
export function pinDungeonLayout(save, id) {
  const history = dungeonHistory(save, id);
  const visited = () => history.visits > 0 || Object.keys(save.session.areas || {}).some(key => key === id || key.startsWith(id + ':level:'));
  // The story budget (threads.ts STORY_BUDGET): a crossing generated, visited or pinned before it keeps the waves' thread (version 0).
  if (history.storyVersion === undefined) history.storyVersion = storyVersionFor(visited() || history.layoutVersion !== undefined || history.generatorVersion !== undefined);
  if (history.gatePredatorSpawnThreshold == null) history.gatePredatorSpawnThreshold = visited() || history.layoutVersion !== undefined ? GATE_REVENANT.legacySpawnPerThousand : GATE_REVENANT.spawnPerThousand;
  if (history.layoutVersion === undefined) history.layoutVersion = visited() ? 0 : 1;
  // Dungeon Monster Pack: only histories that have never been entered adopt the new population and guardians.
  if (history.monsterPack === undefined) history.monsterPack = visited() ? 0 : MONSTER_PACK_VERSION;
  // Release 289: the Watcher's sigil and tombs only in dungeons first entered from now on.
  if (history.watcherVersion === undefined) history.watcherVersion = visited() ? 0 : WATCHER.version;
  // Relay Network: decided once, before the first visit; crossings entered before this release never gain a relay.
  if ((isPentagonFinaleId(id) || isPentagonArenaId(id)) && history.relayNode === undefined) history.relayNode = false; // the Pentagon's finale (its arena and its walkway) holds no relay node, decided before the first visit pins one
  relayNodeDecision(save, id, history, `dungeon:${save.seed}:g${save.worldGeneration}`);
  return history;
}
// Release 677 (the-deep.ts): every floor of the Deep has an Ember Door where you arrive; only floor 1 keeps its free way out.
function dressDeepFloor(map, floor) {
  const w = map.width || Math.round(Math.sqrt(map.tiles.length)), exit = map.objects.find((o) => o.kind === "exit") || map.entry; if (!exit) return map;
  if (floor > 1) map.objects = map.objects.filter((o) => o.kind !== "exit");
  for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.round(exit.x) + dx, y = Math.round(exit.y) + dy, t = map.tiles[y * w + x];
    if ((dx || dy) && t && !t.blocked && !t.environment && !map.objects.some((o) => o.x === x && o.y === y) && !map.objects.some((o) => o.kind === "emberDoor")) map.objects.push({ id: "ember-door", kind: "emberDoor", name: "Ember Door", x, y, state: "open", actions: ["burn"] }); }
  return map;
}
// A labyrinth chamber as this journey left it: keys already taken are gone, sealed doors whose key you hold are open, a
// shortcut opened from the far side is open from the hall too (all kept on the labyrinth's first chamber's history).
function labyrinthState(save, map) {
  if (!map?.building?.labyrinth) return map; const L = dungeonHistory(save, `${map.building.base}:f1`), keys = L.labKeys || [], opened = L.labOpen || [];
  map.objects = map.objects.filter((o) => !(o.kind === "labKey" && keys.includes(o.keyId)));
  for (const o of map.objects) { if (o.lock && keys.includes(o.lock)) o.unlocked = true; if (o.barred && opened.includes(o.shortcutKey)) o.opened = true; if (o.kind === "pentRelic" && (L.pentRelics || []).includes(o.relic)) o.state = "read"; if (o.sigil && (o.sigilKey ? (L.pentOpened || []).includes(o.sigilKey) : L.pentSigil)) o.unsealed = true; }
  if (L.pentSigil) map.objects = map.objects.filter((o) => o.kind !== "pentSigil"); // the Pentagon's Fivefold Seal, once taken
  if (map.building.roomMaze) for (const o of map.objects) if (o.kind === "labGate" && opened.includes(o.gateKey)) openRoomGate(map, o); // a room maze's barred doors, once opened from the far side
  return map;
}
// TOWER_SEAL (great-buildings.ts): a compound or castle floor holding the tower's key, as this journey left it: once taken (kept on
// the tower's first floor's history, `labKeys`) the key is gone.
function towerKeyState(save, map) {
  const K = map?.building?.towerKey; if (!K) return map;
  const keys = save.consequences?.dungeons?.[`${K.base}:f1`]?.labKeys || []; map.objects = map.objects.filter((o) => !(o.kind === "labKey" && o.keyBase && keys.includes(o.keyId)));
  return map;
}
// Release 735: the interior version of a great building, compound, castle part or labyrinth, pinned per interior. Recorded on
// the history of the floor generated first; an interior any floor of which was generated before (by an earlier release) keeps
// version 1, so a building already explored is laid out exactly as it was. Read before `generatorVersion` is set for `id`.
function interiorVersion(save, id, history, fresh) {
  if (history.interiorVersion !== undefined) return history.interiorVersion;
  const prefix = id.replace(/:f\d+$/, ":f"), D = save.consequences.dungeons || {}, A = save.session.areas || {};
  const sibling = (key) => key !== id && key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length));
  let v = fresh ? BUILDINGS.interior.version : 1, explicitlyPinned = false;
  for (const [key, floor] of Object.entries(D)) {
    if (!sibling(key) || !floor) continue;
    if (floor.interiorVersion !== undefined) {
      v = floor.interiorVersion;
      explicitlyPinned = true;
      break;
    }
    if (floor.generatorVersion !== undefined) v = 1;
  }
  // A snapshot identifies legacy floors only when no explicit building pin exists.
  // Otherwise visiting floor one would downgrade every unseen sibling to version one.
  if (!explicitlyPinned && v !== 1 && Object.keys(A).some(sibling)) v = 1;
  history.interiorVersion = v; return v;
}

const INERT_KEEP_HISTORY = new Map([["discovered", false], ["bypassed", false], ["guardianDefeated", false], ["resolved", false], ["visitOpen", false], ["visits", 0], ["abandoned", 0]]);
const ROOM_PADDING_CANDIDATE = Symbol("roomPaddingCandidate");
const ROOM_PADDING_VERSION = 1;
const ROOM_PADDING_V1_REWARD_TIER = 39; // Highest Aperture band when padding v1 was introduced.
export function adoptRoutingKeep(save, map, rx, ry, prior) {
  const B = map?.greatBuilding, parsed = B?.base && parseBuildingId(`${B.base}:f1`);
  if (prior || B?.style !== "keep" || !parsed || parsed.seed !== save.seed || parsed.rx !== rx || parsed.ry !== ry || parsed.floors < 3 || parsed.floors > 4) return false;
  const D = save.consequences?.dungeons || {}, A = save.session?.areas || {}, base = B.base, f1 = `${base}:f1`, keys = Array.from({ length: parsed.floors }, (_, i) => `${base}:f${i + 1}`);
  if (A[`overworld:${rx}:${ry}:g${save.worldGeneration}`] || keys.some((id) => A[id] || String(save.session?.activeDungeonId || "") === id) || keys.slice(1).some((id) => D[id])) return false;
  const h = D[f1];
  if (h && (Object.getPrototypeOf(h) !== Object.prototype || Object.entries(h).some(([k, v]) => !INERT_KEEP_HISTORY.has(k) || INERT_KEEP_HISTORY.get(k) !== v))) return false;
  const sitePrefix = `building:${save.seed}:${rx}:${ry}:keep:`;
  const active = String(save.session?.activeDungeonId || "");
  const oldSite = save.explored?.[`${rx},${ry}`] || active.startsWith(sitePrefix) ||
    Object.keys(A).some(id => id.startsWith(sitePrefix)) || Object.keys(D).some(id => id !== f1 && id.startsWith(sitePrefix));
  const pin = oldSite ? {} : { roomPaddingVersion: ROOM_PADDING_VERSION };
  ((save.consequences ||= {}).dungeons ||= {})[f1] = { ...(h || {}), interiorVersion: 5, ...pin };
  return true;
}

function adoptPentagonRoomPadding(save, cx, cy, base) {
  const histories = save.consequences?.dungeons || {}, snapshots = save.session?.areas || {};
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const rx = cx + dx, ry = cy + dy, section = `${rx},${ry}`;
    if (save.atlas?.[section] || save.explored?.[section] || snapshots[`overworld:${rx}:${ry}:g${save.worldGeneration}`]) return;
  }
  const prefix = `pentagon:${save.seed}:${cx}:${cy}:`;
  const active = String(save.session?.activeDungeonId || "");
  if (active.startsWith(prefix) || Object.keys(snapshots).some(id => id.startsWith(prefix)) ||
      Object.keys(histories).some(id => id.startsWith(prefix))) return;
  ((save.consequences ||= {}).dungeons ||= {})[`${base}:f1`] = { roomPaddingVersion: ROOM_PADDING_VERSION };
}

function planPinnedRoomPadding(save, id, map) {
  const building = map?.building;
  if (!building || map.hall || building.vault) return;
  const history = save.consequences?.dungeons?.[`${building.base}:f1`];
  if (history?.roomPaddingVersion !== ROOM_PADDING_VERSION) return;
  const reserved = [map.entry, map.exit, ...map.objects, ...map.enemySpawns];
  const treasure = (x, y) => !!wallTreasure(save.seed, id, x, y, ROOM_PADDING_V1_REWARD_TIER);
  const footprint = roomPaddingFootprint(map, reserved, treasure);
  if (footprint) Object.defineProperty(map, ROOM_PADDING_CANDIDATE, { value: footprint, configurable: true });
}
export function applyRoutingKeepAppearance(save, map) {
  const B = map?.greatBuilding, h = B?.base && save.consequences?.dungeons?.[`${B.base}:f1`];
  if (B?.style !== "keep" || h?.interiorVersion !== 5) return null;
  const appearance = routingKeepAppearance(B.base, 5); if (!appearance) return null;
  B.appearance = appearance; const exterior = map.objects?.find((o) => o.kind === "greatBuilding" && o.id === B.id); if (exterior) exterior.appearance = appearance;
  return appearance;
}

export function recoverPentagonVersion(save, cx, cy) {
  const atlas = save.atlas || {}; let pinned = CLOSE_VIEW_ROOM_ROUTING.pentagonVersion, hasPin = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = atlas[`${cx + dx},${cy + dy}`]?.pentVersion; if (v) { hasPin = true; pinned = Math.min(pinned, Number.isInteger(v) && v >= 1 && v <= 10 ? v : 9); } }
  if (hasPin) return pinned;
  const candidates = [], D = save.consequences?.dungeons || {}, prefix = `pentagon:${save.seed}:${cx}:${cy}`; let malformedHistory = false;
  for (let V = 1; V <= 10; V++) { const base = `${prefix}${V >= 2 ? `:v${V}` : ""}`, key = `${base}:f1`; if (Object.prototype.hasOwnProperty.call(D, key)) { if (D[key] && Object.getPrototypeOf(D[key]) === Object.prototype) candidates.push(V); else malformedHistory = true; } }
  const active = String(save.session?.activeDungeonId || ""), p = parsePentagonId(active) || parsePentagonArenaId(active) || parsePentagonFinaleId(active);
  if (p && p.seed === save.seed && p.cx === cx && p.cy === cy && Number.isInteger(p.V) && p.V >= 1 && p.V <= 10 && p.base === `pentagon:${save.seed}:${cx}:${cy}${p.V >= 2 ? `:v${p.V}` : ""}`) candidates.push(p.V);
  const activeSite = active.startsWith(`${prefix}:`), malformed = activeSite && (!p || p.seed !== save.seed || p.cx !== cx || p.cy !== cy || !Number.isInteger(p.V) || p.V < 1 || p.V > 10 || p.base !== `${prefix}${p.V >= 2 ? `:v${p.V}` : ""}`);
  const versions = [...new Set(candidates)]; return !malformed && !malformedHistory && versions.length === 1 ? versions[0] : malformed || malformedHistory || versions.length ? PENTAGON.version : CLOSE_VIEW_ROOM_ROUTING.pentagonVersion;
}
export function generatePinnedDungeon(save, id, options = {}) {
  if (isPentagonFinaleId(id) || isPentagonArenaId(id)) { const h = dungeonHistory(save, id); if (h.relayNode === undefined) h.relayNode = false; } // the Pentagon's finale is a quiet place: no relay node (nor bells, pages, threads, margins or wanderers: loadArea)
  const history = pinDungeonLayout(save, id), canonical = `dungeon:${save.seed}:g${save.worldGeneration}`;
  // Generator 5 (Underlands) only for histories never generated before; pinned histories keep their generator.
  const fresh = history.generatorVersion === undefined && id !== canonical && !save.session.areas[id];
  const interior = isBuildingId(id) || isCompoundId(id) || isLabyrinthId(id) || isCastleId(id), iv = interior ? interiorVersion(save, id, history, fresh) : 1; // release 735
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
  if (fresh && history.deepAnnex === undefined) { history.deepAnnex = ordinary || /:annex[23]$/.test(id) ? annexRecord(save.seed, id, chasmRoll(save.seed, id)) : false; if (history.deepAnnex) history.dream = 0; if (history.deepAnnex?.floor === 3) history.generationOptions = { ...history.generationOptions, theme: annexThird(save.seed, history.deepAnnex.base) }; } // release 675: a Starfield Deep Annex floor
  if (fresh && history.mire === undefined) { const rung = !/:canopy$/.test(id) && !history.deepAnnex && rollMireCrypt(save.seed, id, history.layoutPool) ? rungOf('poisonCrypt') : null; history.mire = rung ? { version: MIRE_CRYPT.version, merged: 0, found: false, ...(rung === 'taste' ? { taste: true } : {}) } : false; } // release 303: the Poison Crypt; 319: a taste is a small one
  if (ordinary && history.ladder && !rungOf('gatePredator')) history.gatePredatorSpawnThreshold = 0; // release 319
  if (fresh && history.threefoldLayout === undefined && id.endsWith(':deep-v2:threefold')) history.threefoldLayout = 2;
  if (fresh && history.deepPlacement === undefined && isDeepV2Id(id)) history.deepPlacement = DEEP_PLACEMENT.version; // release 735: deep-v2 placements (deep-dungeons.ts)
  // Release 351 (docs/narrative-bible.md section 7, step 4): a crossing first found in the Far Sleep is a Sleeper's Hall.
  if (ordinary && history.dream === undefined) { const at = id.match(/:g\d+:(-?\d+):(-?\d+):/); if (at && farSleepSection(Number(at[1]), Number(at[2])) && !/:canopy$/.test(id) && !history.deepAnnex) history.dream = dreamHallRoll(save.seed, id) ? DREAM_HALL.version : 0; } // release 435: a share of them, not every one (0 pins "ordinary")
  if ((ordinary || history.deepAnnex) && history.chasm === undefined) history.chasm = /:canopy$/.test(id) || (history.deepAnnex && history.deepAnnex.floor < 3) || (!history.deepAnnex && !history.mire && !history.dream && chasmRoll(save.seed, id)) ? CHASM.version : 0; // release 593; 631: the canopy's crossing is always a Starfield
  let map;
  // Dive generator pinned per history: 1 = the release-107 Sunken Reach, 2 = themed grottoes (release 108).
  if (isArenaRun(id)) map = generateListenerArena(save.seed, id); // release 375: the Listening Hall
  else if (id.startsWith('dive:')) map = (history.diveGenerator ?? 1) >= 2 ? generateGrotto(save.seed, id) : generateDiveSite(save.seed, id);
  else if (/^(arena:|hunt-arena:|hunt-instance:|skyland:)/.test(id)) { map = generateBespokeArena(save.seed,id,{kind:id.startsWith('arena:')?'persistent':'temporary',cleared:!!history.resolved}); if (isSkyland(id)) dressSkyland(map, id, save); } // release 571: a Skyland is a temporary arena run in waves
  else if (isPentagonFinaleId(id)) { if (history.finaleFloor === undefined) history.finaleFloor = fresh ? PENTAGON.finale.floor : 1; map = generatePentagonFinale(save.seed, id, history.finaleFloor); history.gatePredatorSpawnThreshold = 0; } // the walkway's generator pinned (1: stars you cannot step onto; 2: a drop) // the Pentagon's finale: a walk among the stars (PENTAGON.finale)
  else if (isPentagonArenaId(id)) { map = pentagonArenaIn(save, id); history.gatePredatorSpawnThreshold = 0; } // the Pentagon's finale arena, before the walk (pentagon-arena.ts)
  else if (isPentagonId(id)) {
    const raw = generatePentagonChamber(save.seed, id);
    if (raw?.building?.V === CLOSE_VIEW_ROOM_ROUTING.pentagonVersion) planPinnedRoomPadding(save, id, raw);
    map = pentagonMuralsState(save, labyrinthState(save, raw));
    history.gatePredatorSpawnThreshold = 0;
  }
  else if (isBuildingId(id) || isCompoundId(id) || isLabyrinthId(id) || isCastleId(id)) {
    // Compounds and castles choose their tower keys from their own exterior versions.
    map = isCastleId(id) ? towerKeyState(save, generateCastleFloor(save.seed, id, iv, castleVersionOf(save.atlas, parseCastleId(id).X, parseCastleId(id).Y)))
      : isLabyrinthId(id) ? labyrinthState(save, generateLabyrinthChamber(save.seed, id, iv))
      : isCompoundId(id) ? towerKeyState(save, generateCompoundFloor(save.seed, id, iv, compoundVersionOf(save.atlas, parseCompoundId(id).rx, parseCompoundId(id).ry)))
      : generateBuildingFloor(save.seed, id, iv);
    if (isBuildingId(id) && map?.building?.style === "keep" && iv === CLOSE_VIEW_ROOM_ROUTING.keepVersion) planPinnedRoomPadding(save, id, map);
    history.gatePredatorSpawnThreshold = 0;
  }
  else if (isCanyonId(id)) { const c = ensureCanyonHistory(history); if (fresh && history.canyonGenerator === undefined) history.canyonGenerator = CANYON.generator; map = generateCanyon(save.seed, id, c.drilled, c.strained, history.canyonGenerator || 1); } // Canyon craters; release 735: generator 2 for craters first entered from now on
  else if (isDeepId(id)) { const floor = deepShaft(save, id).floor, plan = floorPlan(save.seed, id, floor); map = generateExpeditionDungeon(save.seed, plan.genId, plan.recipe, { layoutPool: 5, themePool: THEME_POOL_VERSION, theme: plan.theme || 'none', sizeProfile: 'standard' }); map.deepFloor = floor; map.name = `The Deep · Floor ${floor}`; dressDeepFloor(map, floor); } // release 677: a floor of the Deep
  else if (!id.includes(':deep-v') && history.generatorVersion === DUNGEON_GENERATOR_V5) map = generateExpeditionDungeon(save.seed,id,history.dungeonRecipe || dungeonDescriptor(id).recipe,{...history.generationOptions,...options,layoutPool:history.layoutPool||1,themePool:history.themePool||1,...(history.mire?{theme:'poisonCrypt'}:history.dream?{theme:'dream'}:{}),...(history.mire?.taste?{sizeProfile:'compact'}:{}),...(history.ladder?{ladder:crossingLadder(save.seed,id,history.ladder.tier)}:{}),...(history.warpVersion>=2?{warpAlways:true}:{})});
  else if (!id.includes(':deep-v') && history.generatorVersion === 4) map = generateUnifiedDungeon(save.seed,id,history.dungeonRecipe || dungeonDescriptor(id).recipe,{...history.generationOptions,...options});
  else if (!id.includes(':deep-v') && history.generatorVersion === 3) map = generateVariedDungeon(save.seed,id,dungeonDescriptor(id).recipe);
  else map = generateDungeon(save.seed,id,{...options,threefoldLayout:history.threefoldLayout||1,...(history.deepPlacement>=2?{deepPlacement:history.deepPlacement}:{})});
  if (history.layoutVersion === 1 && !map.arena && !id.startsWith('displacement:') && !id.startsWith('elite-portal:') && !id.includes('aperture-annex')) varyDungeonLayout(map,save.seed,id);
  if (history.watcherVersion && !id.startsWith('displacement:') && !id.startsWith('dive:') && !map.multiLevel) placeWatcherDungeon(map, map.width || Math.round(Math.sqrt(map.tiles.length)), save.seed, id); // release 289
  if (history.chasm && !map.arena) carveChasm(map, save.seed, `${id}:${options.levelId || "root"}`); // release 593
  if (history.deepAnnex) { const f = history.deepAnnex.floor; map.annexFloor = { floor: f, of: DEEP_ANNEX.floors }; map.annexName = `${DEEP_ANNEX.name} · Floor ${f}`; } // release 675
  if (isPentagonId(id) && map?.building?.pentagon) pentagonLinksIn(save, id, map); // the Pentagon's shortcut links (v6; laid over one begun before)
  if (isPentagonId(id) && map?.building?.pentagon && map.building.vault) pentagonFinaleIn(save, id, map); // the finale: the vault's opened wall, once the Regent has fallen
  if (isPentagonFinaleId(id) && map) pentagonWalkBackIn(save, map); // a walkway reached through the arena leads back to it
  if (interior) addRoofExit(save, id, map, history); // release 746: the vault's roof exit, laid over the floor (never into its tiles)
  return map;
}
// The Pentagon's shortcut links in a chamber (pentagon.ts pentagonLinkEnds): laid in from version 6; over a Pentagon begun
// before, laid over its floor as objects only (its tiles stay as they were), once its history records the overlay version
// (`pentLinks`, set the first time any chamber of it loads from now on). Placed last, after every dressing of the chamber,
// avoiding what the chamber was generated with (a key taken since still counts), so a spot never moves.
function pentagonLinksIn(save, id, map) {
  const Pp = parsePentagonId(id), plan = Pp && pentagonPlan(Pp.seed, Pp.cx, Pp.cy, Pp.V); if (!plan?.links?.length) return;
  const L = dungeonHistory(save, `${Pp.base}:f1`); if (L.pentLinks === undefined) L.pentLinks = PENTAGON.shortcuts.overlay; if (!L.pentLinks) return;
  const raw = generatePentagonChamber(save.seed, id), opened = L.labOpen || [];
  for (const o of pentagonLinkEnds(plan, { ...map, objects: [...(raw?.objects || []), ...(map.objects || [])], enemySpawns: [...(raw?.enemySpawns || []), ...(map.enemySpawns || [])] })) {
    if (opened.includes(pentagonLinkKey(o.link))) o.state = "open"; map.objects.push(o); }
}
// The Pentagon's finale (pentagon.ts PENTAGON.finale): once the Regent has fallen (`pentFinale` on the base floor's history),
// the vault's wall stands open onto the walkway among the stars. An object on the vault's outer wall, never a tile; its spot
// is found on the chamber as generated (with its link ends), so it is the same on every load and in every journey.
function pentagonFinaleIn(save, id, map, force = false) {
  if ((!force && !dungeonHistory(save, `${map.building.base}:f1`).pentFinale) || map.objects.some((o) => o.kind === "pentFinaleWall")) return null;
  const raw = generatePentagonChamber(save.seed, id), keep = map.objects.filter((o) => o.kind === "pentShortcut");
  const spot = pentagonFinaleSpot({ ...map, id, objects: [...(raw?.objects || []), ...keep], enemySpawns: [...(raw?.enemySpawns || [])] });
  if (!spot) return null; const o = pentagonFinaleWall(map.building.base, spot);
  if (dungeonHistory(save, `${map.building.base}:f1`).pentArena) Object.assign(o, { toId: pentagonArenaId(map.building.base), name: PENTAGON_ARENA.names.gateIn }); // the way leads through the arena first
  map.objects.push(o); return o;
}
// The Pentagon's finale arena (pentagon-arena.ts), from release 751: a Pentagon whose wall opens from now on records `pentArena` on
// its base floor's history and its wall leads here first; the beast is picked once and pinned (`pentArenaBeast`), and once it has
// fallen (`pentArenaWon`) it is not laid again and the seam stands open. A Pentagon whose walkway opened before keeps its way.
export function pentagonArenaBeast(save, base) {
  const H = dungeonHistory(save, `${base}:f1`), kept = pentagonArenaRow(H.pentArenaBeast);
  if (kept && pentagonArenaRoster(isPackKind).includes(kept)) return kept;
  const row = pentagonArenaPick(save.seed, base, isPackKind); if (row) H.pentArenaBeast = row.id; return row;
}
// The finale beast's vitals (pentagon-arena.ts pentagonArenaVitals): the world beast's, measured against the Wayfarer as they stand,
// times its row; `regional` is the beast ramp (ring 100 to 150), which takes over only where it is higher. No hunt, tries, retreat or
// pursuit: it is not the roaming beast (`worldBeast` is never set), only its kin, and it keeps to the Stillworks.
export function tunePentagonArenaBeast(c, id, save, stats, regional) {
  const row = pentagonArenaRow(id), v = row && pentagonArenaVitals(row, save, stats, regional); if (!v) return c;
  Object.assign(c, { pentFinaleBeast: id, boss: true, hp: v.hp, maxHp: v.hp, damage: v.damage, staggerResistance: v.staggerResistance, speedMultiplier: v.speed, attackGap: v.attackGap, attackCooldownScale: 1, telegraphScale: 1, evasive: true,
    threatRing: regional?.ring ?? 0, xpMultiplier: Math.max(1, Number(regional?.xpMultiplier) || 1), packName: row.name || (row.beast && WORLD_BEASTS[row.beast]?.name) || MONSTER_PACK[c.kind]?.name || c.packName, pentArenaTuning: PENTAGON_ARENA.version });
  delete c.worldBeast; delete c.minimumAttackWindup; return c;
}
function pentagonArenaIn(save, id) {
  const P = parsePentagonArenaId(id); if (!P) return null;
  const H = dungeonHistory(save, `${P.base}:f1`), beast = pentagonArenaBeast(save, P.base);
  const map = generatePentagonArena(save.seed, id, beast, pentagonArenaVersion(H.pentArena)); // the version its wall opened with (1: release 754's floor; 2: with the pillars)
  map.stillworks.walkerCloseView = beast?.id === "voidWalker";
  if (H.pentArenaWon) map.enemySpawns = [];
  return map;
}
function pentagonWalkBackIn(save, map) {
  const base = map.building?.base; if (!base || !dungeonHistory(save, `${base}:f1`).pentArena) return;
  const back = map.objects.find((o) => o.kind === "pentFinaleWall" && o.back); if (back) Object.assign(back, { toId: pentagonArenaId(base), name: PENTAGON_ARENA.names.walkBack, lore: PENTAGON_ARENA.messages.walkBack, toArena: true });
}
// Release 746 (Tim, 2026-11-04: "there should always be an exit to the roof"): which roof exit a vault floor has, if any.
// { part, rx, ry, roof } or null. Whether the building has a roof to come out on is recorded by the door you came in by
// (`buildingDoors.roofTop`, kept on the first floor's history as you enter; great buildings from version 3, castles and
// labyrinths from version 2, where the section has a landscape). A great building without one (ground explored before roofs)
// gets a back stair out by its front door (`roof` false). A roof hatch's ladder already is the roof exit (great buildings and
// towers with an `r`); a castle keep and a labyrinth vault without a roof keep their own way out and get nothing more.
export function roofExitPlan(save, id, map) {
  const B = map?.building; if (!B || B.pentagon || B.roof) return null;
  const top = !!save.consequences?.dungeons?.[`${B.base}:f1`]?.buildingDoors?.roofTop;
  if (B.labyrinth) { const P = parseLabyrinthId(id); return B.vault && P && top ? { part: "labyrinth", rx: P.rx, ry: P.ry, roof: true } : null; }
  if (B.floor < B.floors) return null;
  if (B.castle) { const P = parseCastleId(id); if (!P || P.part !== "k" || !top) return null; const s = quarterSection(P.X, P.Y, castleTopology(P.seed, P.X, P.Y).k); return { part: "keep", rx: s.rx, ry: s.ry, roof: true }; }
  if (B.compound) { const P = parseCompoundId(id); return P && P.part === "t" ? { part: "tower", rx: P.rx, ry: P.ry, roof: true } : null; } // a tower's top is always roof on the land
  const P = parseBuildingId(id); return P ? { part: "building", rx: P.rx, ry: P.ry, roof: top } : null;
}
function addRoofExit(save, id, map, history) {
  const R = roofExitPlan(save, id, map); if (!R || map.objects.some((o) => o.dir === "roofExit")) return;
  const at = map.building?.roofSpot || roofExitSpot(map); if (!at) return; // a room maze names its spot, in the vault's room
  const guarded = (map.enemySpawns || []).some((e) => e.buildingGuardian || String(e.id).endsWith(":guardian"));
  map.objects.push({ id: "roof-exit", kind: "buildingStair", dir: "roofExit", roofExit: R, name: R.roof ? ROOF_EXIT.names[R.part === "tower" ? "tower" : R.part === "keep" ? "keep" : "roof"] : ROOF_EXIT.names.door, x: at.x, y: at.y, state: "open", actions: ["climb"], ...(guarded && !history.roofExit ? { sealed: true } : {}) });
}
// Release 363: a fallen Listener pays its Gate in Transit Coordinates (its pieces + 1).
// Release 371: a fallen Listener raises a town near its Mouth.
function townNote(save) { const had = save.hometowns?.towns?.length ?? 0; if (save.hometowns) grantTowns(save); else ensureHometowns(save); const t = save.hometowns.towns.slice(had).find((q) => q.mouth) || null; if (!t) return ""; /* 2026-11-05: ensureHometowns grants first, so the old grantTowns(save)[0] after it never named the town */ journalOnce(save, `listener-town:${t.listener}`, `Where the Listener fell, people have come to live: ${t.name}, at ${t.rx}, ${t.ry}. Light its Wayglass and it can be home (Atlas).`, "The Far Gate"); return ` A town springs up near the Mouth: ${t.name} (${t.rx}, ${t.ry}).`; }
function latticeNote(save) { const before = save.lattice ? save.lattice.coordinates : 0; if (save.lattice) grantCoordinates(save); else ensureLattice(save); const n = save.lattice.coordinates - before; return n ? ` ${n} Transit Coordinates resolve in you (${save.lattice.coordinates} held${latticeOpen(save) ? "; spend them in the Arcanum's Transit Lattice" : ""}).` : ""; }
// Release 357: what the quiet Mouth tells the Wayfarer.
export function quietMouthNote(save) { const n = relaysUntilReturn(save), moves = ensureFarArray(save).moves, relays = `${n} more relay${n === 1 ? "" : "s"}`; return moves ? (n > 0 ? `Its Gate is unlocked. Answer ${relays} (restore or sever) and the line will give the next Mouth.` : "The line has already given the next Mouth: see the Journal's Far Gate.") : (n > 0 ? `The Mouth stays: answer ${relays} (restore or sever) and a Listener returns to it.` : "A Listener has entered the corridor: it waits at this Mouth."); } // LISTENER_CYCLE v2
export const DEATH_PAUSE = { seconds: 4, millSpeed: 1.1, millRadius: 3 }; // release 329: the pause after a world beast fells you
// Viewport Closed (Tim, 2026-11-04: "you should see them just kind of over your corpse as the world fades out"): with a great
// beast present, the beat of the fall lasts until black (Game.deathBeastBeat) and the beasts close in over the corpse,
// stopping `reach` tiles from it, at `approach` tiles a second, then pace there as in release 329.
export const DEATH_LOOM = { reach: 2.2, approach: 2.6 };
const deathBeast = (e) => !e.dead && !!(e.worldBeast || e.questingBeast || e.stalker);
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
// The Aether Orrery (tool-forms.ts), given once at the same Aperture band as the brawler gear (a pack with no room waits).
export function grantOrreryGear(save) {
  save.worldFlags ||= {}; save.inventory ||= []; save.equipment ||= {};
  const O = ORRERY, item = O.item;
  if (save.worldFlags[O.flag] || APERTURE_BANDS.indexOf(apertureBand(save.perception?.aperture || 0)) < O.band) return false;
  const owned = save.equipment.secondary?.name === item.name || save.inventory.some((q) => q?.name === item.name);
  if (!owned) { if (save.inventory.length >= EQUIPMENT_CAPACITY) return false; save.inventory.push(normalizeSockets({ ...item })); }
  save.worldFlags[O.flag] = true; return !owned;
}
// Release 607 (Tim, 2026-10-31: "I have like 43000 marks... maybe 100000 cinder iron... the economy of the game... is almost
// without consequence"; he took the recommendation): salvage pays SMITHY.salvage.iron by tier (1/1/2/2, was 1/2/3/4), and a
// piece salvaged only because the pack was full (`auto`) pays no iron at all, just its glyph dust. Kill and clear marks halve
// (ECONOMY.marks; dungeon-completion.ts CLEAR_MARKS).
export const ECONOMY = { autoSalvageIron: 0, marks: { boss: 6, aperture: 3, common: 1 } };
const salvageIron = (item) => SMITHY.salvage.iron[itemTier(item)] ?? 1;
export function salvageInventoryItem(save, index, auto = false) {
  const item = save.inventory?.[index];
  if (!item) return null;
  save.inventory.splice(index, 1);
  const iron = auto ? ECONOMY.autoSalvageIron : salvageIron(item);
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
    const iron = ECONOMY.autoSalvageIron; // release 607: a full pack's salvage pays no iron
    save.materials.cinderIron = (save.materials.cinderIron || 0) + iron;
    save.glyphDust = (save.glyphDust || 0) + salvageDust(item);
    return { stored: false, salvaged: item, iron };
  }
  const salvaged = salvageInventoryItem(save, weakest, true); // release 607: automatic
  save.inventory.push(item);
  return { stored: true, salvaged: salvaged.item, iron: salvaged.iron };
}
// Aperture Resonance: the number of Aperture bands reached beyond Resonant (tier 3), and what each one grants.
export const APERTURE_RESONANCE = { hp: 6, melee: 2, magic: 2 };
// Balance pack (Tim, 2026-11-04: "slightly less, -20%"): each Aperture relic attuned from now on leaves APERTURE_RELIC_STAT.points
// of a permanent stat point, not a whole one. The fraction is carried in save.perception.relicCarry (additive, normalised in
// ensurePerception) and whole points are paid as soon as they gather, in tenths so the sum never drifts. Points already given stay.
export const APERTURE_RELIC_STAT = { points: .8 };
export function relicStatGain(save) {
  const p = save.perception, tenths = Math.round((Math.max(0, Number(p.relicCarry) || 0) + APERTURE_RELIC_STAT.points) * 10), whole = Math.floor(tenths / 10);
  p.relicCarry = (tenths - whole * 10) / 10; save.statPoints = Math.max(0, Math.floor(Number(save.statPoints) || 0)) + whole; return whole;
}
export function apertureResonance(save) { return Math.max(0, apertureTier(save?.perception?.aperture || 0) - 3); }
// Release 140: a global multiplier on all monster damage (balance data, one place to tune).
export const ENEMY_DAMAGE_SCALE = 1.3;
// Balance pack (Tim, 2026-11-04). Data tables; the logic below only reads them.
// 1. World beasts, the Questing Beast and the Stalker are tuned to the Wayfarer, so regional threat comes in late: none below
//    `from`, a linear ramp (hp and damage multipliers from 1 to the full regional value) to `full`, the full value beyond.
export const BEAST_REGION_RAMP = { from: 100, full: 150 };
// 2. Ordinary foes (everything regionally scaled except the beasts and foes tuned to the Wayfarer) take more health and a bit
//    more damage past the early rings: [ring, hp ×, damage ×], linear between rows, flat past the last; none from `farStart`
//    (the far realms keep their own tuning). Applied with regional threat, to fresh spawns only.
export const ORDINARY_THREAT = { rows: [[15, 1, 1], [45, 1.4, 1.3], [100, 1.6, 1.7], [190, 1.7, 2]], farStart: FAR_REALMS.start };
// 3. Damage reduction: the old curve up to `soft`, then diminishing returns toward `cap` (x / (x + knee) of the room left).
export const DAMAGE_REDUCTION = { soft: .45, cap: .75, knee: .6 };
// 4. Spells: each hit is (spell base × base + magic bonus + focus × (Focus − 1)) × scale.
export const SPELL_POWER = { base: 1.5, focus: 1, scale: 1.15 };
// Presentation only: one bounded cue rides the existing glyph-visual stream. It never owns a hit or timer.
export const PRIMARY_ECHO_VISUAL = Object.freeze({ life:.28, cap:6, actualAlpha:.88, memoryAlpha:.18, thrustWidth:.13, sweepWidth:.10, sweepSegments:7 });
export function reductionCurve(raw) { const D = DAMAGE_REDUCTION, r = Math.max(0, Number(raw) || 0); if (r <= D.soft) return r; const x = r - D.soft; return D.soft + (D.cap - D.soft) * x / (x + D.knee); }
export function beastRegionalThreat(q) {
  const R = BEAST_REGION_RAMP, t = Math.max(0, Math.min(1, ((Number(q?.ring) || 0) - R.from) / (R.full - R.from))), lerp = (m) => t >= 1 ? m : 1 + ((Number(m) || 1) - 1) * t;
  return { ...q, hpMultiplier: lerp(q.hpMultiplier), damageMultiplier: lerp(q.damageMultiplier) };
}
export function ordinaryThreat(ring) {
  const T = ORDINARY_THREAT, r = Math.max(0, Number(ring) || 0), rows = T.rows; if (r >= T.farStart || r <= rows[0][0]) return { hp: 1, damage: 1 };
  for (let i = 1; i < rows.length; i++) { const [a, h0, d0] = rows[i - 1], [b, h1, d1] = rows[i]; if (r <= b) { const t = (r - a) / (b - a); return { hp: h0 + (h1 - h0) * t, damage: d0 + (d1 - d0) * t }; } }
  const last = rows[rows.length - 1]; return { hp: last[1], damage: last[2] };
}
// Foes tuned to the Wayfarer (or harmless) keep regional threat alone; every other foe is "ordinary" here, its guardians and
// elites included, so they stay proportionally above the trash around them.
export function wayfarerTuned(e) { return !!(e.worldBeast || e.questingBeast || e.stalker || e.gatePredator || e.fracWarden || e.marginWarden || e.mireHeart || e.farArrayBoss || e.farArraySummon || e.skyEcho || e.astralCompanionOf || e.mothChrysalis || e.ambient || e.passiveBehavior || e.passingBeast || e.gloomFinale); } // the Gloomvast (haunts.ts GLOOM_FINALE) is tuned to the Wayfarer
// The one regional scaling of a fresh foe (scaleFresh, and foes made later in the same ground). A beast keeps its share of health.
export function regionalScale(e, q) {
  if (e.pentFinaleBeast) { e.threatRing = q.ring; e.xpMultiplier = q.xpMultiplier; return e; } // the Stillworks' beast took its regional ramp when it was made (tunePentagonArenaBeast)
  const beast = !!(e.worldBeast || e.questingBeast || e.gloomFinale), m = beast ? beastRegionalThreat(q) : q, /* the Gloomvast takes regional threat as the beasts do (BEAST_REGION_RAMP) */ o = wayfarerTuned(e) ? { hp: 1, damage: 1 } : ordinaryThreat(q.ring);
  const share = beast && e.maxHp > 0 ? Math.max(0, Math.min(1, (Number(e.hp) || 0) / e.maxHp)) : 1;
  e.threatRing = q.ring;
  e.maxHp = Math.round(e.maxHp * m.hpMultiplier * o.hp);
  e.hp = share < 1 ? Math.max(1, Math.round(e.maxHp * share)) : e.maxHp; // C5: the Questing Beast keeps its wounds
  e.damage = Math.max(1, Math.round(e.damage * m.damageMultiplier * o.damage));
  e.xpMultiplier = q.xpMultiplier;
  return e;
}

// Release 295: what a dodge costs (armor glyph Still lowers it).
// Release 383: the empowered robot adds MECH_POWER.damage to every blow, magic shot and spell, by the same path as the armor glyphs.
// Release 447 (meals.ts): a Refuge meal adds its bonus by the same path, while it lasts; release 459 (marginalia.ts): so do
// the marginalia of the crossing you are in.
const armorGlyphBonus = (save) => { const g = armorGlyphBase(save), b = mechEmpowered(save) ? { ...g, attackDamage: (g.attackDamage || 0) + MECH_POWER.damage, spellDamage: (g.spellDamage || 0) + MECH_POWER.damage } : g, run = save?.session?.marginRun; if (!save?.meal && !run) return b; const out = { ...b }, add = (bonus) => { for (const k of MEAL_STAT_FIELDS) if (bonus[k]) out[k] = (out[k] || 0) + bonus[k]; }; add(activeMealBonus(save)); if (run) add(marginBonus(save, save.session.activeDungeonId)); return out; };
// Roll-3 Tesseract lines (tesseracts.ts): more damage from every blow (damageTaken), and a health cost that stops at
// TESSERACTS.harmFloor of maximum health (never kills; below the floor it costs nothing).
const hurtScale = (save) => 1 + (armorGlyphBonus(save).damageTaken || 0);
export function tesseractHarm(save, player, share) { if (!(share > 0) || !(player.hp > 0)) return 0; const max = save.maxHp || 60, floor = Math.ceil(max * TESSERACTS.harmFloor); if (player.hp <= floor) return 0; const n = Math.min(player.hp - floor, Math.max(1, Math.round(max * share))); player.hp -= n; return n; }
export const DAMAGE_NUMBERS = { life: 900, rise: .9, cap: 48 }; // release 461
// Release 463 (Tim: "increase the enemies in the dungeons... 20% more health... 20% more damage... about twenty percent more
// monsters"): every dungeon foe built from a spawn (not world beasts, the Questing Beast, Far Array bosses or ambient
// creatures) gets `hp` and `damage`; and `count` more of the crossing's ordinary foes stand near the others, by seed, with
// stable ids (never added to a cleared crossing, an arena, a Far Array run or a hunt instance).
export const DUNGEON_BOOST = { hp: 1.2, damage: 1.2, count: .2, near: 3 };
const WONDER_CUE = { pentagon: 14, labyrinth: 6 }; // release 729: how far (sections) the gold cue looked for a Pentagon (no longer: Pentagons have their own sigils, pentagon.ts PENTAGON_FINDING), a labyrinth
const GUARDIAN_ROLES = ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"];
export const SKY_TREE = { search: 6, loads: 4, chance: .55, annexSearch: 10, annexLoads: 8 }; // 678: the annex's last gate looks wider, unseen trees only // release 663: sky gates land on a great tree: rings searched round the drop, sections built at most, the trees' grow chance
export const SKY_SUMMIT = { version: 1, radius: 24, loads: 8 };
// Validate the built door tree, including its actual footing; a rumour alone is not a destination.
export function skySummitLanding(map) {
  const c = map?.canopy, gate = map?.objects?.find((o) => o.kind === "canopyGate" && o.dest === "cloud" && o.state === "open" && o.actions?.includes("enter"));
  if (!c?.top || !gate) return null;
  const crown = map.tiles.filter((t) => t.kind === "canopyTrunk" && !t.blocked && t.elev === c.top && t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size);
  if (!crown.some((t) => t.x === gate.x && t.y === gate.y)) return null;
  const t = crown.filter((t) => t.x !== gate.x || t.y !== gate.y).sort((a, b) => Math.hypot(a.x - gate.x, a.y - gate.y) - Math.hypot(b.x - gate.x, b.y - gate.y) || a.y - b.y || a.x - b.x)[0];
  return t ? { x: t.x, y: t.y - .2, gateId: gate.id } : null;
}
// Release 651: an ordinary creature, which Fractured mode copies into packs and brings back (never a guardian, boss, hunt,
// world beast or any one-time foe).
function fracturedOrdinary(q) { return !!q && !q.boss && !GUARDIAN_ROLES.includes(q.dungeonRole) && !q.worldBeast && !q.questingBeast && !q.eliteId && !q.objectiveId && !q.foundryId && !q.domainBoss && !q.domainManifestation && !q.wingId && !q.marginWarden && !q.gatePredator && !q.viewportHuntId && !q.huntInstanceId && !q.ambient && !q.passiveBehavior && !q.astralCompanionOf && !q.retreating && !q.passingBeast && !q.skirmishId && !q.farArrayBoss && !q.farArraySummon && !q.packGuardian && !q.apertureEncounter && !q.hordeOf && !q.skyEcho && !q.arenaId && q.kind !== "npc" && !q.mireHeart && !q.mireSeep; }
const MEAL_STAT_FIELDS = ["attackDamage", "spellDamage", "hp", "staminaRegen", "move", "attackSpeed", "spellCooldown", "defense", "dodgeCost", "reach"];
export const dodgeCost = (save) => Math.max(DODGE_COST.min, Math.round(DODGE_COST.base * (1 - armorGlyphBonus(save).dodgeCost) * 10) / 10);
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
    damageReduction: reductionCurve( // balance pack: diminishing returns past DAMAGE_REDUCTION.soft, toward its cap
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
  grantOrreryGear(save); // the Aether Orrery
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
  const sides = tile.encSides?.length ? tile.encSides : ["shackWall", "districtWall"].includes(tile.structure) ? tile.wallSides : null; // release 697: an enclosure's walls too
  if (sides?.length) {
    const lx = x - ix,
      ly = y - iy,
      thickness = 0.22;
    if (
      (sides.includes("west") && lx < thickness) ||
      (sides.includes("east") && lx > 1 - thickness) ||
      (sides.includes("north") && ly < thickness) ||
      (sides.includes("south") && ly > 1 - thickness)
    )
      return false;
  }
  return true;
}
export function footprintOpen(map, width, x, y, allowLethalTerrain=false, allowMarineTerrain=false, allowVoid=false, standOnLethal=false) { /* release 609: standOnLethal, where the Wayfarer may already stand (wading lava in the robot, over a drop mid-boost) */ /* release 509: allowVoid, the robot into the Far Sleep's star-voids (MECH_VOID) */
  const left=x+.24,right=x+.76,top=y+.5,bottom=y+.88,height=map.tiles.length/width,overlaps=(a,b,c,d)=>right>a&&left<b&&bottom>c&&top<d;
  for(let ty=Math.floor(top);ty<=Math.floor(bottom-1e-6);ty++)for(let tx=Math.floor(left);tx<=Math.floor(right-1e-6);tx++){
    if(tx<0||ty<0||tx>=width||ty>=height)return false;
    const tile=map.tiles[ty*width+tx],marine=allowMarineTerrain&&isMarineTile(tile),lethal=allowLethalTerrain&&["canyon","river","dungeonWater",...DEEP_WATER].includes(tile?.kind);
    if(!tile||marine&&!marineTileOpen(tile)||tile.blocked&&!lethal&&!marine&&!(allowVoid&&isDreamVoid(tile)))return false;
    if(!allowLethalTerrain&&!standOnLethal&&!tile.blocked&&!marine&&LETHAL_KINDS.has(tile.kind))return false; // release 609 (Codex play-test, issue 2): open lethal ground (a Starfield drop, lava, deep water) is no footing for anything that does not fall in on purpose
    if(tile.perch&&!allowLethalTerrain)return false; // release 265: a stone block is a perch only the Wayfarer (and fliers) may step onto
    const sides=tile.encSides?.length?tile.encSides:["shackWall","districtWall"].includes(tile.structure)?tile.wallSides:null; // release 696: an enclosure's walls, like a shack's
    if(!sides?.length)continue;
    const thickness=.22;
    for(const side of sides){
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
  if (!entity || footprintOpen(map, width, entity.x, entity.y, false, false, false, entity.isPlayer === true)) return false; // release 609: the Wayfarer on open lethal ground (wading lava in the robot) is not stranded; only creatures are kept off it
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
export function moveAxis(entity, dx, dy, map, width, allowLethalTerrain=false, onStep=null, allowMarineTerrain=false, contacts=null) {
  if (contacts) return moveAxisWithContacts(entity, dx, dy, map, width, allowLethalTerrain, onStep, allowMarineTerrain, contacts);
  if (entity?.riderShift) { const sh = entity.riderShift; entity.riderShift = 0; entity.y += sh; try { return moveAxis(entity, dx, dy, map, width, allowLethalTerrain, onStep, allowMarineTerrain); } finally { entity.y -= sh; entity.riderShift = sh; } } // release 748: a knock on a rider moves the mount's feet
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
function moveAxisWithContacts(entity, dx, dy, map, width, allowLethalTerrain, onStep, allowMarineTerrain, contacts) {
  if (![dx, dy, entity.x, entity.y].every(Number.isFinite)) return false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / ACTOR_CONTACT.step));
  const limit = Math.min(steps, ACTOR_CONTACT.maxSteps), sx = dx / steps, sy = dy / steps;
  if (limit < steps) contacts.budgetStops++;
  let moved = false;
  for (let i = 0; i < limit; i++) for (let axis = 0; axis < 2; axis++) {
    const ax = axis ? 0 : sx, ay = axis ? sy : 0; if (!ax && !ay) continue;
    const a = i / steps, b = (i + 1) / steps, before = contacts.phaseBefore, after = contacts.phaseAfter;
    before.x = axis ? b : a; before.y = a; before.t = axis ? b : a;
    after.x = b; after.y = axis ? b : a; after.t = b;
    const fraction = contacts.clip(entity.x, entity.y, ax, ay); if (!(fraction > 0)) continue;
    const x = entity.x + ax * fraction, y = entity.y + ay * fraction, exiting = contacts.canExit?.(x, y) === true;
    if (x === entity.x && y === entity.y) continue;
    if (!exiting && (!footprintOpen(map, width, x, y, allowLethalTerrain, allowMarineTerrain, entity.isPlayer === true && entity.voidSuit === true)
      || (allowLethalTerrain && !entity.isPlayer && tallBuildAt(map, width, x, y)) || !canStep(entity, map, width, entity.x, entity.y, x, y))) continue;
    const fromX = entity.x, fromY = entity.y;
    entity.x = x; entity.y = y; moved = true;
    if (contacts.record) { const n = contacts.count; contacts.trace[n] = fromX; contacts.trace[n + 1] = fromY; contacts.trace[n + 2] = x; contacts.trace[n + 3] = y; contacts.count += 4; }
    onStep?.(fromX, fromY, x, y);
  }
  return moved;
}
// Perf (Tim's probe, 2026-11-04: update() spikes of 50-125 ms in building interiors with many creatures): a creature that
// cannot step straight at the Wayfarer searches a bounded patch round itself for the first step of a way round. Pack creatures
// ask again on every frame they stay blocked (thin interior walls keep them blocked), and chasers whose retries fall due together
// all search in one frame; each search built strings, arrays and a Map per cell. Now the search runs over typed arrays (the same
// breadth-first order, the same answer), a creature's answer is kept while it, the Wayfarer and the map are where they were
// (NAV.keepFrames at most), and at most NAV.budget searches run in one frame: past that a creature keeps its last answer.
export const NAV = { radius: 12, nodes: 625, keepFrames: 30, budget: 6 };
let navFrame = 0, navSpent = 0, navAsked = 0, navStamp = 0, navSeen = new Int32Array(0), navFirst = new Int32Array(0), navQueue = new Int32Array(0);
const navKept = new WeakMap(), NAV_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function navTick() { navFrame++; navSpent = 0; navAsked = 0; } // once a frame (Game.packWorld); until the first, searches are not counted
export const navStats = () => ({ frame: navFrame, asked: navAsked, spent: navSpent }); // this frame: searches asked for, and run
export function boundedChaseStep(entity,player,map,width,radius=NAV.radius){
  navAsked++;
  const sx=Math.round(entity.x),sy=Math.round(entity.y),gx=Math.round(player.x),gy=Math.round(player.y),marine=entity._marineTraversal===true,kept=navKept.get(entity);
  if(kept&&kept.map===map&&kept.tiles===map.tiles&&kept.sx===sx&&kept.sy===sy&&kept.gx===gx&&kept.gy===gy&&kept.marine===marine&&kept.radius===radius&&navFrame-kept.frame<=NAV.keepFrames)return kept.step&&[kept.step[0],kept.step[1]];
  if(navFrame>0&&navSpent>=NAV.budget)return kept&&kept.map===map&&kept.step?[kept.step[0],kept.step[1]]:null; // this frame's searches are spent
  navSpent++;
  const step=chaseSearch(sx,sy,gx,gy,map,width,radius,marine);
  navKept.set(entity,{map,tiles:map.tiles,sx,sy,gx,gy,marine,radius,frame:navFrame,step});
  return step&&[step[0],step[1]];
}
// The search itself (exported for its test): breadth first from the creature's tile over open footprints within `radius`,
// NAV.nodes tiles at most; the first step towards the tile nearest the Wayfarer's (theirs, when reached), or null.
export function chaseSearch(sx,sy,gx,gy,map,width,radius=NAV.radius,marine=false){
  const side=2*radius+1,n=side*side;
  if(navSeen.length<n){navSeen=new Int32Array(n);navFirst=new Int32Array(n);navQueue=new Int32Array(n);navStamp=0}
  if(++navStamp>2e9){navSeen.fill(0);navStamp=1}
  const stamp=navStamp,start=radius+radius*side;
  navSeen[start]=stamp;navFirst[start]=-1;navQueue[0]=start;let tail=1,best=start,bestDistance=Math.hypot(gx-sx,gy-sy);
  for(let head=0;head<tail&&head<NAV.nodes;head++){
    const i=navQueue[head],x=sx-radius+i%side,y=sy-radius+((i/side)|0),distance=Math.hypot(gx-x,gy-y);if(distance<bestDistance){best=i;bestDistance=distance}if(x===gx&&y===gy){best=i;break}
    for(const d of NAV_DIRS){const nx=x+d[0],ny=y+d[1];if(Math.abs(nx-sx)>radius||Math.abs(ny-sy)>radius)continue;const j=(nx-sx+radius)+(ny-sy+radius)*side;if(navSeen[j]===stamp||!footprintOpen(map,width,nx,ny,false,marine))continue;navSeen[j]=stamp;navQueue[tail++]=j;navFirst[j]=navFirst[i]===-1?j:navFirst[i]}
  }
  if(best===start)return null;const f=navFirst[best];return [sx-radius+f%side,sy-radius+((f/side)|0)];
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
// Perf pack (perf P5/P7, worldgen WG-09, Tim's findings 9): every section load generated its terrain again (generateRegion,
// applyLandscape, the Far Sleep, hamlet and trails passes), even for the section just left, and so did each Void Walker
// crossing preview and Supernova spill. The terrain is a pure function of (seed, section, generation, the pinned versions and
// flags handed to each pass), so the last SECTION_TERRAIN.keep results are kept and handed out as copies: the same map.
export const SECTION_TERRAIN = Object.freeze({ keep: 12 }); // the section, its eight neighbours (Supernova spills) and the way back
// Perf pack (perf P6): a crossing lands 0.25 tile inside the new section (0.02 for a skiff), so stick jitter at an edge
// crossed back at once and loaded both sections again and again (14 ground rebuilds in 540 frames at sea). Just after a
// crossing, the edge just crossed does not take the Wayfarer back until they have been `depth` tiles inside it or `ms` have
// passed; for that moment it holds like the rest of the section's border. Arrival points and map generation are unchanged.
export const EDGE_HOLD = Object.freeze({ depth: .75, ms: 450 });
export const DUNGEON_LEVEL_KEEP = 24; // perf pack (D7): other levels' guardian lists kept per session
const terrainCache = new Map();
export function sectionTerrainCacheStats() { return { size: terrainCache.size, keep: SECTION_TERRAIN.keep, hits: terrainCache.hits || 0, misses: terrainCache.misses || 0 }; }
export function clearSectionTerrainCache() { terrainCache.clear(); terrainCache.hits = terrainCache.misses = 0; }
// steps: { landscape: applyLandscape options (coherence included), dream: Far Sleep version (0: none), hamlet: [version, town,
// legacyMouth] | null, trails: boolean, bridgeLanes: boolean }. Everything a pass reads is in the key, so a section pinned to
// another landscape, sea, hamlet, trail or coherence version never receives another's kept map.
export function sectionTerrain(seed, rx, ry, generation, steps) {
  const key = JSON.stringify([seed, rx, ry, generation, steps]), kept = terrainCache.get(key);
  if (kept) { terrainCache.delete(key); terrainCache.set(key, kept); terrainCache.hits = (terrainCache.hits || 0) + 1; return structuredClone(kept); }
  const map = generateRegion(seed, rx, ry, generation);
  applyLandscape(map, seed, rx, ry, steps.landscape);
  if (steps.dream) applyDream(map, seed, rx, ry, steps.dream);
  if (map.canopy) mendCanopy(map); // great-tree review: a tree the Far Sleep paved over (landscape versions 13 to 17) is no tree: its record and door go
  if (steps.hamlet) applyHamlet(map, seed, rx, ry, ...steps.hamlet);
  if (steps.trails) applyTrails(map, seed, rx, ry);
  if (steps.bridgeLanes) bridgeLanes(map); // world coherence (WG-01): the lanes' bridges
  terrainCache.set(key, structuredClone(map)); terrainCache.misses = (terrainCache.misses || 0) + 1;
  while (terrainCache.size > SECTION_TERRAIN.keep) terrainCache.delete(terrainCache.keys().next().value);
  return map;
}
export const terrainCached = (seed, rx, ry, generation, steps) => terrainCache.has(JSON.stringify([seed, rx, ry, generation, steps]));
// The terrain steps a Walker preview (walkerCrossingMap) runs for a section.
export function walkerTerrainSteps(save, rx, ry) {
  const seen = save.atlas?.[`${rx},${ry}`], coh = coherenceOf(seen);
  return { landscape: { coherence: coh, explored: !!seen && !seen.landscapeVersion, version: seen?.landscapeVersion || LANDSCAPE_VERSION,
    openSea: !seen ? OPEN_SEA_VERSION : seen.seaVersion || 0, buoy: !save.checkpoints?.[`${rx},${ry}`] || save.checkpoints[`${rx},${ry}`].name === "Lighthouse Buoy",
    hamlet: (!seen || !!seen.hamletVersion) && (hamletSection(save.seed, rx, ry) || legacyMouthHamlet(save, rx, ry)) },
    dream: !seen || seen.dreamVersion ? seen?.dreamVersion || DREAM_VERSION : 0,
    hamlet: !seen || seen.hamletVersion ? [seen?.hamletVersion || HAMLET_VERSION, false, legacyMouthHamlet(save, rx, ry)] : null,
    trails: !seen || !!seen.travelVersion, bridgeLanes: !!coh };
}
// World coherence (landscape.ts COHERENCE): the version a section keeps. Ground first seen from now on takes the current one;
// a section in the atlas keeps the one it was first seen with (none, for every section seen before it existed).
export function coherenceOf(seen) { return seen ? seen.coherenceVersion || 0 : COHERENCE.version; }
// The spots on new ground that must join its exits (cohereSection): the front doors of labyrinths, great buildings and
// compounds (not their courtyard doors, roof hatches or broken backs) and the summit cairns.
export function coherenceSpots(map) {
  return (map.objects || []).filter((o) => (o.kind === "dungeon" && o.buildingDoor && (o.labyrinthDoor || ((o.dungeonType === "greatBuilding" || o.dungeonType === "compound") && !o.roofHatch && !o.breachDoor && o.enterAt !== "court" && o.enterAt !== "roof"))) || (o.kind === "ruinMarker" && o.landscapeSummit) || (o.kind === "shack" && o.entrances?.length)).map((o) => o.kind === "shack" ? o.entrances[0] : { x: o.x, y: o.y });
}
// Spawns settleSpawns leaves where they stand: sea creatures, guards and residents of buildings, bosses and story creatures.
export const coherenceKeeps = (e) => !!(e.ambient || e.passiveBehavior || e.courtyardGuard || e.buildingGuard || e.buildingGuardian || e.shelterAmbush || e.districtResident || e.boss || e.elite || e.worldBeast || e.questingBeast || e.domainId || e.gatePredator || e.encounterSpawn || e.kind === "npc" || e.kind === "mireLeech" || isSeaKind(e.kind));
// WG-10: where a castle or a Pentagon was built over a great tree or a stand of great mushrooms, the tree or the stand goes
// whole (its flag, its cache and what stood on it), so no half tree, no capless cache and no journal note for caps that are gone.
export function dropOverwritten(map) {
  const T = map.tiles, built = (t) => !!(t.greatBuilding || t.causeway);
  if (map.mushrooms && T.some((t) => built(t) && t.mushroom)) {
    const gone = new Set();
    for (let i = 0; i < T.length; i++) { const t = T[i]; if (!t.mushroom) continue; gone.add(i); const q = built(t) ? { ...t } : { ...t, kind: t.under || map.dominant, elev: 0, slope: false, blocked: false }; for (const k of ["mushroom", "under", "capI", "capJ", "capR", "stalk", "roofLift"]) delete q[k]; T[i] = q; }
    map.objects = (map.objects || []).filter((o) => !(o.rewardSource && String(o.id).startsWith("mushroom-cache-")) && !gone.has(Math.round(o.y) * 32 + Math.round(o.x)));
    map.enemySpawns = (map.enemySpawns || []).filter((e) => !gone.has(Math.round(e.y) * 32 + Math.round(e.x)));
    delete map.mushrooms;
  }
  if (map.canopy && T.some((t) => built(t) && t.skyPlatform)) {
    const gone = new Set();
    for (let i = 0; i < T.length; i++) { const t = T[i]; if (!t.canopy) continue; gone.add(i); if (built(t)) { if (t.skyPlatform) T[i] = { ...t, skyPlatform: undefined, leaves: undefined, look: undefined }; continue; }
      const q = { ...t, kind: map.dominant, elev: 0, slope: false, blocked: false }; for (const k of ["canopy", "skyPlatform", "leaves", "look", "perch"]) delete q[k]; T[i] = q; }
    map.objects = (map.objects || []).filter((o) => o.kind !== "canopyGate" && !gone.has(Math.round(o.y) * 32 + Math.round(o.x)));
    map.enemySpawns = (map.enemySpawns || []).filter((e) => !gone.has(Math.round(e.y) * 32 + Math.round(e.x)));
    delete map.canopy;
  }
}
// Read-only terrain preview for one adjacent section boundary. No visits, discoveries, hunts or actors advance.
// Interior-only rafts/wayglass sites are irrelevant to edge legality. Pinned landscape, hamlets, trails, fallen
// crossings and durable scars match the corresponding production load before any boundary can be crossed.
export function walkerCrossingMap(save, rx, ry) {
  const map = sectionTerrain(save.seed, rx, ry, save.worldGeneration, walkerTerrainSteps(save, rx, ry)); // perf pack: the landscape, Far Sleep (release 305), hamlet and trails passes, kept
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
export function closeViewActionEligible(game){return !!game?.closeViewActionEligible?.();}
const PREPARED_SHOT_FIELDS=['dx','dy','speed','life','damage','damageType','path','turnAfter','returning','blastRadius','glyphHost','pierce','ricochet','sunburst','scale','grow','arcWave','visualFlight'];
function executablePreparedShot(raw){const out={};for(const k of PREPARED_SHOT_FIELDS)if(Object.hasOwn(raw||{},k))out[k]=k==='visualFlight'&&raw[k]?{...raw[k]}:raw[k];return out;}
const PREPARED_EFFECT_FIELDS=['kind','brawler','life','radius','pulse','damage','glyphHost','healShare','imbue'];
function executablePreparedEffect(raw){const out={};for(const k of PREPARED_EFFECT_FIELDS)if(Object.hasOwn(raw||{},k))out[k]=raw[k];return out;}
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
  onRicochet = null,
) {
  for (const p of projectiles) {
    if (p.dead) continue;
    const stepDt=p.toolUseNewborn===true?0:dt;
    p.age = (Number(p.age) || 0) + stepDt;
    if (
      p.path === "boomerang" &&
      !p.returning &&
      p.age >= (Number(p.turnAfter) || p.life / 2)
    ) {
      p.returning = true;
      p.dx *= -1;
      p.dy *= -1;
    }
    if (p.seekId && !p.hostile) { const t = enemies.find((e) => e.id === p.seekId && !e.dead); if (t) { const ax = t.x + .5 - p.x, ay = t.y + .5 - p.y, d = Math.hypot(ax, ay) || 1, k = Math.min(1, (p.seekTurn || 6) * stepDt); p.dx += (ax / d - p.dx) * k; p.dy += (ay / d - p.dy) * k; const n = Math.hypot(p.dx, p.dy) || 1; p.dx /= n; p.dy /= n; } } // release 321: the drone's rockets home
    const distance = p.speed * stepDt,
      steps = Math.max(1, Math.ceil(distance / 0.2)),
      step = distance / steps;
    for (let i = 0; i < steps && !p.dead; i++) {
      const next = mirrorWalls.length ? reflectShotStep(p, mirrorWalls, step) : { x: p.x + p.dx * step, y: p.y + p.dy * step };
      const nx = next.x, ny = next.y;
      // Release 265: a hostile shot entering a build (not the one the Wayfarer stands on) is absorbed by it.
      if (p.hostile && onBuildHit && map.tiles[Math.floor(ny) * width + Math.floor(nx)]?.build && !(player && Math.floor(nx) === Math.floor(player.x + .5) && Math.floor(ny) === Math.floor(player.y + .75))) { p.dead = true; p.impact = { x: p.x, y: p.y }; onBuildHit(Math.floor(nx), Math.floor(ny)); break; }
      if (!projectileTileOpen(map, width, nx, ny) && p.mirage) { if (!p.returning) { p.returning = true; p.backAt = p.age; p.hits = {}; } } // release 649: a mirage blade turns home at a wall and passes walls on its way back
      else if (!projectileTileOpen(map, width, nx, ny)) {
        if(p.path==="grenade"){p.dead=true;onDetonate(p);break}
        // Sunburst Ricochet (tool-forms.ts SUNBURST): a shot with ricochets left reflects off a wall inside the map (the map's
        // edge is a section seam, not a wall) and stays where it is this substep; `onRicochet` throws the shards.
        if (p.ricochet > 0 && !p.hostile && nx >= 0 && ny >= 0 && nx < width && ny < map.tiles.length / width) {
          const odx = p.dx, ody = p.dy, bx = !projectileTileOpen(map, width, nx, p.y), by = !projectileTileOpen(map, width, p.x, ny), both = !bx && !by;
          if (bx || both) p.dx = -p.dx;
          if (by || both) p.dy = -p.dy;
          p.ricochet -= 1; p.returning = true; // the ricochet is the shot's turn: it does not turn again later
          if (onRicochet) onRicochet(p, bx || both ? -Math.sign(odx) : 0, by || both ? -Math.sign(ody) : 0);
          continue;
        }
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
      // Release 643 (Tim: "if it passes through their body, and then it arcs back on its homing track, and it passes through their
      // body again... that should be three separate instances of damage"): a projectile that survives a hit forgets a body once it
      // has left it, so every separate pass through it is a new hit.
      if (p.hits && !p.shard) for (const id in p.hits) { const q = enemies.find((e) => e.id === id); if (!q || q.dead || Math.hypot(q.x + .5 - p.x, q.y + .45 - p.y) >= 0.1 + (p.grow || 0) + enemyBodyRadius(q) + PASS_CLEAR) delete p.hits[id]; }
      let mountedPeerId = null;
      for (const e of enemies)
        if (
          !e.dead &&
          (!mountedPeerId || e.id === mountedPeerId) &&
          !e.untargetable &&
          !p.hits?.[e.id] &&
          !(p.burst && (p.burst.hits[e.id] || 0) >= p.burst.cap) &&
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
          if (p.path === "boomerang" || p.pierce > 0 || p.knife) { // 643: thrown blades fly on through (649: Mirage of Blades)
            (p.hits ||= {})[e.id] = true;
            if (p.path !== "boomerang" && !p.knife) p.pierce -= 1;
          } else p.dead = true;
          if (p.burst) p.burst.hits[e.id] = (p.burst.hits[e.id] || 0) + 1; // Sunburst Ricochet: one burst's shards share a per-foe limit
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
    if(p.toolUseNewborn===true)delete p.toolUseNewborn;
    p.life -= stepDt;
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
    const stepDt=fx.toolUseNewborn===true?0:dt;if(fx.toolUseNewborn===true)delete fx.toolUseNewborn;
    if (fx.delay > 0) { fx.delay -= stepDt; continue; }
    fx.life -= stepDt;
    fx.untilPulse -= stepDt;
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
    spell: essenceReadiness(game, "a", slotReadiness(game.save, "a", spell)),
    spell2: essenceReadiness(game, "b", slotReadiness(game.save, "b", spell)),
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
// Essence Walk (brawler-spells.ts ESSENCE_WALK): while it runs, a slot whose spell is recovering reads as castable for its
// stamina cost (`essence`), unavailable when stamina is short, instead of counting its cooldown down.
export function essenceReadiness(game, slot, state) {
  if (!(state?.remaining > 0)) return state;
  const c = slotted(game.save, slot), cost = c?.kind === "spell" ? game.essenceCostFor?.(c.id) : null;
  return cost == null ? state : { ...state, remaining: 0, essence: cost, available: (game.player?.stamina || 0) >= cost };
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
// Tim (2026-11-04, after his roof report): a blow does not carry between very different heights. When the Wayfarer and a
// creature stand `levels` or more elevation levels apart (the Wayfarer on a great building's roof, five up; the creature on the
// ground), a body blow (bite, claw, swing, charge, leap; the creatures' melee) misses either way, the Wayfarer's swings
// included. Shots, beams, lobbed and area attacks still reach; and a creature that flies reaches, and is reached by, everything.
// A world beast counts by its movement (a flying one hits you on the roof; a walking one's jaws do not).
export const ELEVATION_REACH = {
  levels: 2, // this many levels apart, or more: body blows do not reach
  flyingMoves: ["hover", "fly", "phase"], // monster-pack MOVEMENT_MODES that fly
  flyingKinds: ["veilMoth", "cinderWisp", "vesperwing", "gravitantBell"], // the older creatures that fly
  bodyTags: ["melee", "charge", "leap"], // pack attack modules that land with the body
  bodySources: ["bite", "blobTouch", "wormEmerge", "wormGrab", "wormSwipe", "doomTail"], // body blows named outside the modules
};
export function fliesHigh(e) { const R = ELEVATION_REACH; return !!e && (e.flying === true || e.aloft === true || R.flyingMoves.includes(e.movement) || R.flyingKinds.includes(e.kind)); }
export function isBodyBlow(source) { if (typeof source !== "string") return false; const R = ELEVATION_REACH; return R.bodySources.includes(source) || (ATTACK_MODULES[source]?.tags || []).some((t) => R.bodyTags.includes(t)) && !(ATTACK_MODULES[source]?.tags || []).some((t) => t === "ranged" || t === "beam"); }
// Does a body blow carry between `a` and `b`? Levels default to the ground under each (sections without a landscape: always).
export function bodyBlowReaches(map, width, a, b, aLevel = null, bLevel = null) {
  if (!map?.landscape || !a || !b) return true;
  const la = aLevel ?? elevationAt(map, width, a.x, a.y), lb = bLevel ?? elevationAt(map, width, b.x, b.y);
  return Math.abs(la - lb) < ELEVATION_REACH.levels || fliesHigh(a) || fliesHigh(b);
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
export const REGION_BANNER = { again: 300, kinds: { wild: "Wild country", sea: "Open sea", mountains: "Mountains", desert: "Desert", alien: "Strange growth", swamp: "Fenland", lakes: "Lake country", isles: "Islands", dream: "The Far Sleep", ashfields: "Ashfields", glasslands: "Glasslands", emberlands: "Emberlands", forest: "Forest", frost: "Frostlands", lunar: "Moonlands", volcanic: "Firelands", pillars: "Pillar lands", fog: "Fog moors", jungle: "Jungle", biomech: "Carapace wastes", salt: "Salt marsh", crystal: "Crystal fields", fungal: "Sporewood", petrified: "Petrified wood", savanna: "Savanna", reef: "Reef flats", amber: "Amberwood", obsidian: "Obsidian fields", terraces: "Terrace springs", reckoning: "Reckoning fields" } }; // release 573; 579; 583
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
// Using one (Tim, 2026-11-05: "a crossing sigil should still get you out of a labyrinth or the Pentagon. If you can't teleport
// from where you are, a crossing sigil should still work, across all dungeons and realities... even if you're in a boss fight,
// even if you're in the Rite. If you use it, you leave... a crossing sigil is a sure-fire 'I'm out of here'"). Game.useCrossingSigil:
// anywhere the Wayfarer lives (not while felled or falling to a death), out of every interior to where its ordinary way out
// leads (Game.leaveDungeon: the entrance; a Mislaid Threshold aborts back to its source; a dive surfaces at its buoy), then on
// to a chosen Wayglass; in the open world, to the chosen or active Wayglass. A Rite burning here is broken (that attempt is
// spent; the strange tree keeps its others); a dungeon boss fight left unfinished starts again (the Stillworks as after a death).
// `guard`: ms of the arrival's invulnerability, as after a Return Ember.
export const CROSSING_SIGIL = {
  guard: 2000,
  messages: {
    none: "No Crossing Sigil remains.",
    tooLate: "Too late: the Crossing Sigil needs a living hand.",
    out: (where, left) => `The Crossing Sigil burns away and tears you out to ${where}. ${left} left.`,
    boss: "The fight you left behind will begin again.",
  },
};
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
  if (!footprintOpen(map, width, start.x, start.y, false, false, false, true)) relocateIfStranded(start, map, width); // release 609: the Wayfarer's arrival floor as before 609
  const seen = new Set([start.y * width + start.x]), queue = [[start.x, start.y]], floor = [];
  for (let k = 0; k < queue.length; k++) {
    const [x, y] = queue[k]; if (!footprintOpen(map, width, x, y, false, false, false, true)) continue; floor.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, i = ny * width + nx; if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen.has(i)) continue; seen.add(i); queue.push([nx, ny]); }
  }
  if (!floor.length) return null;
  const onFloor = new Set(floor.map(([x, y]) => y * width + x)), guards = guardians ? (enemies || []).filter((e) => !e.dead && (isDungeonGuardian(e) || isCrossingGuardian(e))) : [];
  const clear = (x, y) => guards.every((e) => Math.hypot(e.x - x, e.y - y) >= ARRIVAL.clear);
  const inside = Number.isFinite(at.x) && Number.isFinite(at.y) && at.x >= 0 && at.y >= 0 && at.x <= width - 1 && at.y <= height - 1;
  if (inside && footprintOpen(map, width, at.x, at.y, false, false, false, true) && onFloor.has(Math.round(at.y) * width + Math.round(at.x)) && clear(at.x, at.y)) return null;
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
export function updateEnemyAI(e, player, map, width, dt, now, sanctuary=null,onRanged=()=>{}, move=null) {
  const displace = move || ((subject, dx, dy) => moveAxis(subject, dx, dy, map, width));
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
  if(e.passiveBehavior==='practice'){
    ai.mode='idle';e.telegraph=0;e.strike=0;e.meleePhase=null;e.threatRange=null;return false;
  }
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
    const m=Math.hypot(tx,ty)||1;displace(e,tx/m*speed*dt,ty/m*speed*dt);ai.step=(ai.step+speed*dt)%2;return false;
  }
  if (e.telegraph > 0) {
    e.telegraph = Math.max(0, e.telegraph - dt);
    if (e.telegraph === 0) {
      e.windupStagger = null; // release 561: the next windup may be held again
      const pattern=e.meleePhase&&MELEE_PATTERNS[e.meleePhase.id], geometry=pattern?enemyMeleeGeometry(e):null;
      e.strikeGeometry = geometry;
      if(pattern?.dash){const aim=e.meleePhase.aim||projectileDirection(player.x-e.x,player.y-e.y),lateral=e.meleePhase.stage===1?{x:-aim.y,y:aim.x}:{x:0,y:0},distance=pattern.dash,dx=(aim.x+lateral.x*.65)*distance,dy=(aim.y+lateral.y*.65)*distance,steps=Math.ceil(Math.hypot(dx,dy)*5);for(let i=0;i<steps;i++)if(!displace(e,dx/steps,dy/steps))break;if(pattern.stages===2&&e.meleePhase.stage===0){e.meleePhase.stage=1;e.telegraph=.42;e.threatRange=1.9;return false}}
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
  if(!displace(e, dx, dy)&&ai.mode==="chase"&&now>=(ai.pathRetryAt||0)){
    ai.pathRetryAt=now+350;
    const step=boundedChaseStep(e,player,map,width);
    if(step){ai.detourX=step[0];ai.detourY=step[1];ai.detourUntil=now+3000;const px=step[0]-e.x,py=step[1]-e.y,pm=Math.hypot(px,py)||1;displace(e,px/pm*speed*dt,py/pm*speed*dt)}
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
  if(area==="dungeon"){if(e.gatePredator||e.mireSeep)return true;/* release 303: seeplings crawl home from anywhere *//* release 271: a Revenant stalks and hunts from anywhere in the dungeon */if(e.worldBeast&&(e.aggro||isDungeonHunter(e,area)))return true;if(e.pentFinaleBeast&&e.pentArenaAwake)return true;/* the Stillworks' finale beast, once awake, fights on wherever you run in its bounded arena: fleeing its Sunfall past the dungeon's sight range must not freeze it aloft and untargetable mid-attack *//* release 249: hunters patrol and finish their retreat even out of sight */const d=Math.hypot(e.x-player.x,e.y-player.y);return d<=(e.aggro?18:e.boss||e.eliteId?14:10)||e.telegraph>0||e.strike>0||e.eliteWindup>0||e.eliteActive>0}
  if(area!=="overworld")return true;
  if(e.aggro||e.boss||e.eliteId||e.worldBoss||e.gatePredator||e.telegraph>0||e.strike>0||e.eliteWindup>0||e.eliteActive>0||e.summonedBy)return true;
  return Math.hypot(e.x-player.x,e.y-player.y)<=10;
}
// Perf (2026-11-04): the order's keys are worked out once a creature, not twice a comparison (the same order: hunters, the
// woken, bosses, the nearest, then by id).
export function activeDungeonEnemies(enemies,player,map){
 const cap=Math.max(1,Number(map?.activeEnemyCap)||DUNGEON_ACTIVE_CAP[map?.encounterProfile]||DUNGEON_ACTIVE_CAP.normal),keyed=[];
 let orbs=null;for(const e of enemies){if(e.gloomOrbOf&&!e.dead){(orbs||=[]).push(e);continue}/* the Gloomvast's decoys always move (bounded by GLOOM_FINALE.darkness.cap) and take no place from the others */if(shouldSimulateEnemy(e,player,"dungeon"))keyed.push({e,h:Number(isDungeonHunter(e,"dungeon")),a:Number(!!e.aggro),b:Number(!!e.boss),d:Math.hypot(e.x-player.x,e.y-player.y)})}
 keyed.sort((a,b)=>b.h-a.h||b.a-a.a||b.b-a.b||a.d-b.d||String(a.e.id).localeCompare(String(b.e.id)));
 const out=new Array(Math.min(cap,keyed.length));for(let i=0;i<out.length;i++)out[i]=keyed[i].e;if(orbs)out.push(...orbs);return out;
}
export function settlementSanctuary(map,rx,ry,save){if(!map||map.farFolk==="monster"||rx===0&&ry===0&&save?.consequences?.settlements?.['ember-refuge']?.status==='fallen')return null;if(map.settlement?.procedural)return{x:map.settlement.x,y:map.settlement.y,radius:map.settlement.radius};return map.settlement||rx===0&&ry===0?{x:16,y:16,radius:9}:null}
export function enforceSanctuary(e,z){if(!z)return false;const dx=e.x-z.x,dy=e.y-z.y,d=Math.hypot(dx,dy);if(d>=z.radius)return false;const m=d||1;e.x=z.x+(d?dx/m:1)*(z.radius+.5);e.y=z.y+(d?dy/m:0)*(z.radius+.5);const ai=ensureAI(e);ai.homeX=e.x;ai.homeY=e.y;e.telegraph=0;return true}
// Release 445 (Tim: "the character needs to jump when you actually press the button, not like a second later"): a jump
// lasts JUMP.base ms plus JUMP.quickening per Quickening rank. The arc rises from the press itself, as fast as the
// plain leap's rise; Quickening's extra time is hang time at the top, and the robot's boost holds it there too. jumpLift
// gives the lift as a share of a tile (0..JUMP.arc).
export const JUMP = { base: 520, quickening: 140, arc: .42, sky: 1100, landOnArrival: true }; // landOnArrival (release 759): a sky hop ends on the first platform past the gap. // release 585: `sky`, a jump from a sky platform (one gap, easily). Great-tree review (Tim, 2026-11-05: "hard to jump"): 900 → 1100 ms: at 2.4 tiles a second a sky hop covers 2.64 tiles, so one gap tile is cleared from anywhere on the launching tile (2 tiles at worst) with .64 tiles (about a quarter second) to spare; it was .16
// Footing on a great tree's branches (Tim, 2026-11-05: "too hard to find your footing on the platforms"). On a canopy platform a
// dodge goes along one of the four axes (a branch is one tile wide: a diagonal dodge drifted off it), and a sky hop flies
// straight: while the Wayfarer is in the air over the gap only the stick's larger axis moves it, so a thumb's drift cannot carry
// it off the line between the twin tips. Aim off an edge and you still go off it.
export const TREE_FOOTING = { dodgeAxes: 4, straightHop: true, gapBelow: 1 }; // gapBelow: in the air this many levels or more under the launch height counts as over the gap
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
    { const given = grantBrawlerGear(save); if (given.length) this.message = `In your pack: ${given.join(", ")}. The Iron Fists are a weapon (Attack); Hammerfall and Great Sweep are tools.`; } if (grantOrreryGear(save)) this.message = ORRERY.messages.given; /* the Aether Orrery */ if (giftResonances(save).length) this.glyphNotice = "Every resonance is now written in your codex (Glyphs)."; /* release 527 */ // release 489; 493
    if (!["attack", "tool", "act", "build"].includes(save.aimMode))
      save.aimMode = save.toolMode ? "tool" : "attack";
    save.toolMode = save.aimMode === "tool";
    settleProgression(save);
    const s = save.session;
    this.area = s.area;
    this.rx = s.rx || 0;
    this.ry = s.ry || 0;
    if (Number.isFinite(s.playerRuntime.heroPresentationTime) && s.playerRuntime.heroPresentationTime >= 0 && s.playerRuntime.heroPresentationTime <= 1e12) this.presentationPausedMs = now - s.playerRuntime.heroPresentationTime;
    this.player = {
      isPlayer: true, // release 609: known as the Wayfarer from the first frame (relocateIfStranded)
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
      attackVisual: normalizeAttackVisual(s.playerRuntime.attackVisual, attackVisualRemaining(s.playerRuntime)),
      actionVisualUntil: Object.hasOwn(s.playerRuntime, 'actionVisualMotion') ? now + normalizeActionVisualMotion(s.playerRuntime.actionVisualMotion, s.playerRuntime.attackVisual) : undefined,
      castVisual: normalizeCastVisual(s.playerRuntime.castVisual, Number(s.playerRuntime.clocks?.castUntil)||0),
      primaryVisualUntil: s.playerRuntime.primaryVisualMotion == null ? undefined : now + (Number.isFinite(s.playerRuntime.primaryVisualMotion) ? Math.max(0, Math.min(ACTION_MOTION.meleeMs, s.playerRuntime.primaryVisualMotion)) : 0),
      fistVisualUntil: s.playerRuntime.fistVisualMotion == null ? undefined : now + (Number.isFinite(s.playerRuntime.fistVisualMotion) ? Math.max(0, Math.min(ACTION_MOTION.meleeMs, s.playerRuntime.fistVisualMotion)) : 0),
      primaryCombo: normalizePrimaryCombo(s.playerRuntime.primaryCombo),
      meleeUntil: now + (s.playerRuntime.meleeMotion || 0),
      meleeStrike: s.playerRuntime.meleeStrike
        ? { ...s.playerRuntime.meleeStrike }
        : null,
      dodgeReadyAt: now + s.playerRuntime.dodgeCooldown,
      invulnerableUntil: now + s.playerRuntime.invulnerability,
      dodgeUntil: now + s.playerRuntime.dodgeMotion,
      dodgeX: s.playerRuntime.dodgeX || 0,
      dodgeY: s.playerRuntime.dodgeY || 0,
      dodgeVisual: normalizeDodgeVisual(s.playerRuntime.dodgeVisual),
    };
    this.message = s.message;
    this.paused = !!s.paused;
    this.pauseStarted = this.paused ? now : null;
    this.jumpUntil = Number(s.playerRuntime.jump) > 0 ? now + s.playerRuntime.jump : -1e9; this.jumpStart = undefined; this.mechSpent = s.playerRuntime.mechSpent === true; // release 609 (Codex play-test, issue 5): a landed jump is not a jump that just ended, and an emptied boost stays emptied
    this.guardRemaining = Math.max(0, Number(s.playerRuntime.guard || 0));
    { const q = s.playerRuntime.glide; this.glide = q && s.area === "overworld" && [q.z, q.vx, q.vy].every((v) => Number.isFinite(Number(v))) ? { z: Math.max(GLIDE.skim, Number(q.z)), vx: Number(q.vx), vy: Number(q.vy), open: q.open !== false, ...(q.open === false && Number.isFinite(Number(q.fallFrom)) ? { fallFrom: Number(q.fallFrom) } : {}), told: false } : null; } // release 635
    this.magicBuffRemaining = Math.max(0, Number(save.magicBuff || 0));
    this.spellCooldownRemaining = Math.max(0, Number(save.spellCooldown || 0));
    this.projectiles = [];
    this.effects = [];
    this.eliteHazards=[];
    this.packEffects=[];
    this.reticle = null;
    this.restoreRuntime(s.playerRuntime, now); // release 736: before the area loads, so a Rite in progress keeps its dais and foes
    const savedCleaverCue = this.player.attackVisual?.cleaverChoreography;
    this.loadArea(this.area, false);
    if (savedCleaverCue && this.player.attackVisual) this.player.attackVisual.cleaverChoreography = savedCleaverCue;
    this.player.consumeVisual = normalizeConsumeVisual(s.playerRuntime.consumeVisual);
    this.player.cachePickupVisual = normalizePersistentCachePickupVisual(s.playerRuntime.cachePickupVisual);
    this.player.hurtVisual = normalizeHurtVisual(s.playerRuntime.hurtVisual);
    this.restorePendingToolUse(s.playerRuntime.pendingToolUse,now);
    this.restorePendingMeleeContact(s.playerRuntime.pendingMeleeContact,now);
    this.restoreHammerfallStartup(s.playerRuntime.hammerfallStartup);
    { const w = mapWidth(this.map, this.area), h = Math.floor((this.map?.tiles?.length || 0) / (w || 1)) || w, p = this.player; // release 736 (S9): a position far outside the map moved the Wayfarer a section on
      if (w > 0) { p.x = Math.max(-.24, Math.min(w - .76, Number.isFinite(p.x) ? p.x : 16)); p.y = Math.max(-.5, Math.min(h - .88, Number.isFinite(p.y) ? p.y : 16)); /* the footprint's own bounds (footprintOpen) */ } }

    { const q = s.playerRuntime.glideHome; this.glideHome = q && s.area === "overworld" && [q.rx, q.ry].every(Number.isInteger) && [q.x, q.y].every(Number.isFinite) ? { rx: q.rx, ry: q.ry, x: q.x, y: q.y } : null; } // TREE_GLIDE.home
    { const q = s.playerRuntime.crownFoot; this.crownFoot = q && s.area === "overworld" && [q.rx, q.ry].every(Number.isInteger) ? { rx: q.rx, ry: q.ry } : null; } // TREE_GLIDE.home.reached
    this.restoreJumpAir(s.playerRuntime.jumpAir, now); // a jump resumes at the height it left from
    this.restoreDroneLift(s.playerRuntime.droneLift, now); // release 647: after loading the area, which clears a lift
    for (const base of pentagonsDue(save)) this.payPentagonComplete(base); // a Pentagon completed before its completion paid a Tesseract: paid now, once
  }
  installSystems() {
    if (this._systemsInstalled) return;
    this._systemsInstalled = true;
    this.player.meleeAim = this.save.session.playerRuntime.meleeAim || null;
    this.traversal = this.save.session.playerRuntime.traversal || null;
    const attack = this.primaryAttack.bind(this);
    this.primaryStrike = attack; // the swing itself, without aim selection (Echo repeats call it)
    this.primaryAttack = (now, explicitDirection = null, committed = null) => {
      this.releasePendingToolUse(now);this.reconcileHammerfallStartup();if(this.toolUseBlocksPrimary())return[];
      if (!committed && now < (this.player.attackReadyAt || 0)) return [];
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
      const hits = attack(now, explicitDirection, committed);
      this.save.lastAim = last;
      this.save.pendingAim = pending;
      this.recordPrimaryConsequences(hits);
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
      const hpBeforeInstalledTraps=this.player.hp;
      updateTraps(this.map.objects, this.player, dt, now < this.jumpUntil, this.save.maxHp, this.save.level);
      if (this.area === "dungeon") tickNewTraps(this.map.objects, { player: this.player, level: this.save.level, maxHp: this.save.maxHp, airborne: now < (this.jumpUntil || 0) || this.mechBoosting === true || (this.save.magicSkills?.active?.id === 'aerial-step' && this.save.magicSkills.active.remaining > 0) /* release 527 */, pull: (dx, dy) => this.moveGrounded(this.player, dx, dy), fall: () => { if (this.player.hp > 0 && now > (this.player.invulnerableUntil || 0)) { this.player.hp = 0; this.message = "The floor gives way, and the Wayfarer falls into the dark."; } }, now, projectiles: this.projectiles, effects: this.effects, seeds: (this.trapSeeds ||= []), open: (x, y) => { const w = mapWidth(this.map, this.area), q = this.map.tiles[Math.floor(y) * w + Math.floor(x)]; return !!q && !q.blocked && !(this.map.tiles.length && Math.floor(x) >= w); } }, dt); // release 523
      if(this.player.hp<hpBeforeInstalledTraps)this.cancelConsumeVisual(this.player.hp<=0?'death':'hurt');
      if (this.player.hp <= 0 || this.area !== "dungeon") this.traversal = null;
    };
  }
  installWeaponSystems() {
    if (this._weaponSystemsInstalled) return;
    this._weaponSystemsInstalled = true;
    const fire = this.fireSecondary.bind(this);
    this.fireSecondary = (now = 0, direction = null, action = null) => { // action: the Aether Orrery charges while that button is held
      if (!direction && !this._attackFiring) {
        this.save.aimMode = this.save.aimMode === "tool" ? null : "tool";
        this.save.toolMode = this.save.aimMode === "tool";
        this.message = this.save.toolMode
          ? "Tool aim active — tap while moving to fire."
          : "Tool aim stowed.";
        return false;
      }
      return fire(now, direction, action);
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
    ensurePerceptionInPlace(this.save);
    const decorate = () => {
      if (this.area !== "dungeon" || !this.map || !this.enemies || this.map.building) return; // great buildings hold only what they lay
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
          regionalScale(e, q); // balance pack: beasts ramp in from ring 100; ordinary foes take ORDINARY_THREAT
        }
      };
      const currentId =
        this.area === "dungeon"
          ? this.save.session.activeDungeonId || ""
          : `overworld:${this.rx}:${this.ry}:g${this.save.worldGeneration}`;
      if (!this.save.session.areas[currentId] && !this.map?.skyland) scaleFresh(); // release 688: no regional threat in the sky (the Skylands scale from the Wayfarer)
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
      if (area === "dungeon" && !this.map?.building) {
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
      if (!had && !this.map?.skyland) { // release 688: no regional threat in the sky
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
          if (e.foundryValidated) continue;
          if (e.farArrayBoss || e.worldBeast === "voidWalker" && e.retreating) continue; // A crossing retreat carries its existing health; never rebirth/retune it on a fresh section.
          regionalScale(e, q); // balance pack: beasts ramp in from ring 100; ordinary foes take ORDINARY_THREAT
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
          const got = relicStatGain(this.save);
          this.message = got > 0 ? `${r.message} The relic leaves ${got > 1 ? `${got} permanent stat points` : "one permanent stat point"}.` : `${r.message} The relic's mark gathers toward a permanent stat point.`;
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
          !e.fracReinforcement, // perf pack: a Fractured reinforcement is never stored or restored, so it needs no lasting award key
        );
      }
      return r;
    };
  }
  recordPrimaryConsequences(hits=[]){
    for(const e of hits)if(e.kind==='hollowMarshal'&&this.areaId()===dungeonId(this.save.seed,this.save.worldGeneration)&&e.dead&&!this.save.narrative.facts['crossing.marshal']){
      this.save.narrative.facts['crossing.marshal']=true;
      this.save.narrative.journal.push({recordId:'marshal-cancel',instanceKey:'record:marshal-cancel',title:'The Missing Crossing',text:'The Hollow Marshal fell guarding the cancellation mechanism.',provenance:'original'});
    }
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
      !this.map.building &&
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
  // Release 573 (Tim: "when you generate a region, you can generate a name as well"): walking into another named region (ground
  // laid out from version 4 on, outside the heartland) shows its name, once per region every `REGION_BANNER.again` seconds.
  noteRegion(version){
    if(version<4||Math.hypot(this.rx+.5,this.ry+.5)<REGIONS.heartland)return null;
    const r=sectionRegion(this.save.seed,this.rx,this.ry,version),now=Date.now(),seen=(this.regionSeen||=new Map());if(r.id===this.regionId)return null;this.regionId=r.id;
    if(now-(seen.get(r.id)||-Infinity)<REGION_BANNER.again*1000)return null;seen.set(r.id,now);
    const name=regionName(this.save.seed,r),notice={title:name.replace(/^the /,"The ").toUpperCase(),detail:REGION_BANNER.kinds[r.type]||"Wild country",kind:"discovery"};(this.questNotices||=[]).push(notice);return notice;
  }
  // The terrain passes loadArea runs for the current section, with the versions its atlas entry pins (perf pack: the
  // sectionTerrain key; the same conditions loadArea applied each pass under before).
  sectionTerrainSteps(){const save=this.save,rx=this.rx,ry=this.ry,seen=save.atlas?.[`${rx},${ry}`],town=townAt(save,rx,ry),coh=coherenceOf(seen);
    return{landscape:{coherence:coh,explored:!!seen&&!seen.landscapeVersion,version:seen?.landscapeVersion||LANDSCAPE_VERSION,openSea:!seen?OPEN_SEA_VERSION:seen.seaVersion||0,buoy:!save.checkpoints?.[`${rx},${ry}`]||save.checkpoints[`${rx},${ry}`].name==="Lighthouse Buoy",hamlet:((!seen||!!seen.hamletVersion)&&(hamletSection(save.seed,rx,ry)||legacyMouthHamlet(save,rx,ry)||!!town))||!!town?.mouth},
      dream:!seen||seen.dreamVersion?seen?.dreamVersion||DREAM_VERSION:0,
      hamlet:!seen||seen.hamletVersion||town?.mouth?[seen?.hamletVersion||HAMLET_VERSION,!!town,legacyMouthHamlet(save,rx,ry)]:null,
      trails:!seen||!!seen.travelVersion,bridgeLanes:!!coh};}
  areaStateId(){const id=this.areaId();return this.area==="dungeon"&&this.map?.multiLevel&&this.save.session.activeDungeonLevelId?`${id}:level:${this.save.session.activeDungeonLevelId}`:id;}
  snapshotArea(leaving = true) {
    if (!this.map) return;
    if (leaving) this.endGloomDarks(); // the Gloomvast's Dark never follows you out, nor waits for you to come back (a save made in place keeps it: exportSnapshot)
    for(const e of this.enemies)this.syncAstralClone(e);
    const objects = {};
    for (const o of this.map.objects)
      if (!(o.forest && o.state === "standing")) objects[o.id] = { // release 573: a standing forest tree is as generated; only felled or burnt ones are kept
        state: o.state,
        phase: o.phase,
        timer: o.timer,
        hits: { ...o.hits },
      };
    this.save.session.areas[this.areaStateId()] = {
      encounterVersion:this.map.encounterVersion||0,
      leftAt: Number(this.save.playSeconds) || 0, // release 651: when it was last held, for Fractured mode's return
      enemies: this.enemies.filter((e) => !e.blobRemnant && !e.passingBeast && !e.fracReinforcement && !e.roofDweller && !e.gloomOrbOf /* the Gloomvast's decoys are laid again from its Dark; */ /* roof-dwellers.ts: made again from the plan; the slain are on the Pentagon's history */).map((e) => { const dead = deadFoeRecord(e); if (dead !== e) return dead; /* perf pack: a dead, rewarded foe is kept as a tombstone */ return ({ ...e, ...(e.astralMount ? { astralMount: { ...e.astralMount } } : {}), ai: { ...ensureAI(e) } }); }), // release 259: the Blob's remnant is never saved
      objects,
      projectiles: this.projectiles.map((p) => ({ ...p })),
      effects: this.effects.map((f) => ({ ...f, hits: { ...f.hits } })),
      eliteHazards:this.eliteHazards.map(h=>({...h,hits:{...h.hits}})),
    };
  }
  // Perf pack (dungeons D7): prepareDungeonCompletion generated every other level of a multi-level dungeon on every load and
  // level change (350-730 ms to enter a deep-v2 dungeon here, 430-490 ms per level change) only to read their guardians.
  // A level's spawns are kept for the session per dungeon, level and the history's pins (DUNGEON_LEVEL_KEEP entries);
  // the progress records that change in play (discovery, combat clear, visits, deep progress) are not part of the key.
  levelSpawns(history, levelId) {
    const id = this.areaId(), { discovery, combatClear, visits, visitOpen, abandoned, deep, labFog, ...pins } = history || {}, key = JSON.stringify([this.save.seed, id, levelId, pins]);
    const memo = this._levelSpawns ||= new Map(), kept = memo.get(key); if (kept) return kept;
    const map = generatePinnedDungeon(this.save, id, { levelId }), spawns = { enemySpawns: map.enemySpawns || [] };
    // Kept under the history as it is after this generation, so a history whose pins (interior, deep placement, canyon
    // generator...) a first generation has just laid, or that was reset, never finds another's spawns.
    const { discovery: _d, combatClear: _c, visits: _v, visitOpen: _o, abandoned: _a, deep: _p, labFog: _f, ...after } = history || {}, key2 = JSON.stringify([this.save.seed, id, levelId, after]);
    if (memo.size >= DUNGEON_LEVEL_KEEP) memo.delete(memo.keys().next().value);
    memo.set(key2, spawns); return spawns;
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
    this.pentagonPrevious = null; // presentation-only: never infer a route after another arrival or reload.
    if (this.player?.consumeVisual) this.cancelConsumeVisual('area-transition');
    this.retireCleaverChoreography();
    if (this.player?.cachePickupVisual?.v === 1) this.player.cachePickupVisual = null;
    if (this.player?.hurtVisual?.v === 1) this.player.hurtVisual = null;
    this.cancelPendingToolUse('area-transition');
    this.cancelPendingMeleeContact('area-transition');
    this.clearHammerfallStartup('area-transition');
    this.fistReleaseIntent=null;
    this.attackBufferUntil = 0;
    this.season = null; // release 679: set again below for a section of the woods
    this.endGloomDarks(); // the Gloomvast's Dark never follows you out, nor waits for you to come back (snapshotArea ends it too)
    if (capture) this.snapshotArea();
    if (area !== "overworld") { this.glide = null; this.glideHome = null; this.crownFoot = null; } // release 641 (the pre-publish review of 623→639): a glide never follows you indoors
    this.affixHazards = []; // release 657

    if (this.droneLift && interiorTerrain(this.map)) { this.skyAir=null; this.liftDrop=false; this.jumpUntil=-1e9; this.mechBoosting=false; }
    this.droneLift = null; // release 647: a booster lift never carries over a change of area or section
    this.shadowClone = null; this.cloneAim = false; // release 365: a shadow stays in the place it was cast
    this.builds = []; // release 265: builds belong to the map they stand on
    this.area = area;
    this.mountArea(); // release 748
    const lostBeasts = worldBeastsLost(this.save, area, this.rx, this.ry, area === "dungeon" ? this.areaId() : null); // release 239: a retreating beast not followed is gone
    for (const id of lostBeasts) journalOnce(this.save, `world-beast-away:${id}:${this.save.worldBeasts[id].cycle}`, `${WORLD_BEASTS[id].name} got away to ${BEAST_HOMES[WORLD_BEASTS[id].home].name}.`, "World beasts");
    if (area === "overworld") for (const r of retreatsUnderWay(this.save)) { const dx = r.rx - this.rx, dy = r.ry - this.ry; if (!dx && !dy) continue; const dir = `${dy < 0 ? "north" : dy > 0 ? "south" : ""}${dx && dy ? "-" : ""}${dx > 0 ? "east" : dx < 0 ? "west" : ""}`, far = Math.max(Math.abs(dx), Math.abs(dy)); (this.questNotices ||= []).push({ title: "FRESH TRACKS", detail: `${WORLD_BEASTS[r.id].name} · ${far} section${far > 1 ? "s" : ""} ${dir} · bound for ${BEAST_HOMES[WORLD_BEASTS[r.id].home].name}`, kind: "discovery" }); } // release 605: the trail of a retreat
    const loadingId=area==="dungeon"?this.areaId():null,history=loadingId?dungeonHistory(this.save,loadingId):null;
    this.map = area === "dungeon"
      ? generatePinnedDungeon(this.save, loadingId, {levelId:this.save.session.activeDungeonLevelId||undefined})
        : sectionTerrain(this.save.seed, this.rx, this.ry, this.save.worldGeneration, this.sectionTerrainSteps()); // perf pack: kept terrain (see sectionTerrain)
    if(area==="overworld")this.tyrantVisit=null; // release 233: entering a section (from anywhere, or after a death) starts a fresh Tyrant visit
    if(area==="dungeon"&&!this.map.pentFinale&&!this.map.pentArena)addBell(this.map,this.save,this.areaId());/* release 431: the Seven Bells */if(area==="dungeon"&&!this.map.pentFinale&&!this.map.pentArena)addTornPage(this.map,this.save,this.areaId());/* release 595: the Torn Pages */if(area==="dungeon"&&!this.map.pentFinale&&!this.map.pentArena)addThreadRelic(this.map,this.save,this.areaId());/* release 627: the threads */if(area==="dungeon"&&!this.map.pentFinale&&!this.map.pentArena)addMargin(this.map,this.save,this.areaId());/* release 455: margins */if(area==="dungeon")addPentagonInscription(this.map,this.save,this.areaId());/* the Pentagon's marks (PENTAGON_LORE) */if(area==="dungeon"&&!this.map.pentFinale&&!this.map.pentArena)addSurveyorLink(this.map,this.save,this.areaId());/* release 505: the Surveyor's Chain */if(area==="dungeon"){applyTunnels(this.map,this.save,this.areaStateId());this.map.wallGlints=wallGlints(this.map,this.save.seed,this.areaStateId(),this.save);} // release 225: dug tunnels and glinting walls
    if(area==="overworld"){const seen=this.save.atlas?.[`${this.rx},${this.ry}`];this._coherence=coherenceOf(seen);/* world coherence: new ground only (COHERENCE) *//* the landscape, Far Sleep, hamlet (release 371: a town where a Listener fell; 373: around its Mouth, explored or not) trails and lane-bridge (WG-01) passes ran in sectionTerrain */this.seaHazards=this.map.openSea?seaHazards(this.save.seed,this.rx,this.ry,this.map):null;this.novaFog=null;this.seaIce=null;this.skyAir=null;this.skyLevel=0;this.discAir=null;/* 585; 587 */this.storm=null;this._stormCheck=0;ensureBoatState(this.save);this.placeMooredSkiff();this.placeSpareSkiff();const dive=diveSite(this.map,this.save.seed,this.rx,this.ry);if(dive)this.map.objects.push(dive);{const dom=farDomainAt(this.save,this.rx,this.ry,!!seen);if(dom)buildDomain(this.map,this.save.seed,this.rx,this.ry,dom);}/* release 723: a domain is built whole */}
    if(area==="overworld"&&!this.map.settlement)applyTunnels(this.map,this.save,overworldDigKey(this.rx,this.ry),true); // release 423: tunnels dug in the open world
    if(area==="overworld"){const seen=this.save.atlas?.[`${this.rx},${this.ry}`];if(!seen||seen.watcherVersion)placeWatcherOverworld(this.map,mapWidth(this.map,area),this.save.seed,this.rx,this.ry);} // release 289: sections first seen from now on
    if(area==="overworld"||area==="dungeon")for(const o of this.map.objects||[])if(o.kind==="watcherTomb"&&this.save.worldFlags[`watcher-tomb:${o.id}`])o.state="opened";
    if(area==="dungeon")for(const o of this.map.objects||[])if(o.kind==="warpDais"&&this.save.worldFlags[`warp-dais:${this.areaId()}:${o.id}`])o.state="attuned"; // release 301
    if(area==="dungeon"&&this.map.arenaKind==="dive"&&this.map.lair&&!this.map.objects.some(o=>o.kind==="diveOnward")){const w=mapWidth(this.map,area),L=this.map.lair,spot=[[-3,0],[3,0],[-3,2],[3,2],[0,3],[-2,-2],[2,-2]].map(([dx,dy])=>({x:L.x+dx,y:L.y+dy})).find(q=>{const t=this.map.tiles[q.y*w+q.x];return t&&!t.blocked&&!this.map.objects.some(o=>o.x===q.x&&o.y===q.y)});if(spot)this.map.objects.push({id:`${this.areaId()}:onward`,kind:"diveOnward",name:"Deep current",x:spot.x,y:spot.y,state:"open",actions:["follow"]})} // release 311: a grotto's lair holds a current to the next buoy
    if(area==="overworld"){plantRefugeLands(this.map,this.rx,this.ry,this.refugeLandsWhere());for(const o of this.map.objects)if(o.talkKey)o.line=talkLine(o,this.refugeLandsWhere(),Number(this.save.worldFlags[o.talkKey])||0)} // release 265: the farm, the quarry and the farmer
    if(area==="dungeon"&&!this.map.pentFinale&&!this.map.pentArena){const reader=addDungeonReciter(this.map,loadingId,this.save,mapWidth(this.map,area)),elder=addDungeonElder(this.map,loadingId,this.save,mapWidth(this.map,area));if(elder)this.message="Something tall and silent wanders these halls.";else if(reader)this.message=`${reader.name} wanders these halls, murmuring.`}
    if(area==="dungeon"&&isArrayRun(loadingId)&&ensureFarArray(this.save).activeRun?.id===loadingId){const run=this.save.farArray.activeRun,spawns=this.map.enemySpawns,multi=!!this.map.multiLevel,g=spawns.find(e=>e.dungeonRole==="finalBoss")||spawns.find(e=>e.dungeonRole==="gateWarden")||(multi?null:spawns.find(e=>e.boss)||spawns[spawns.length-1]);if(g){const boss=runBossSpawn(this.save,{x:g.x,y:g.y});if(boss){spawns.splice(spawns.indexOf(g),1);if(!spawns.some(e=>e.id===boss.id))spawns.push({...boss,objectiveId:g.objectiveId||null})}}if(!this.map.objects.some(o=>o.kind==="arrayPylon"))this.map.objects.push(...arrayPylons(this.map,`${loadingId}:${this.map.levelId||""}`,mapWidth(this.map,area)));this.map.name=runName(run,run.gate)}
    if(area==="dungeon"&&history?.relayNode){if(placeRelayNode(this.map,loadingId,this.save))ensureRelayNetwork(this.save).seen=true;}
    if(area==="dungeon"&&this.map.dungeonContract?.discoveryEnabled){const discovered=discoveryForLevel(history,this.map);applyDungeonDiscovery(this.map,discovered);this._dungeonChunkId=null;}
    if(area==="dungeon"&&labFogOn(this.map))labFogOf(this.map,history?.labFog); // LAB_FOG: what this chamber has shown you before (the sight itself is worked out on the first frame, labFogTick)
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
    if (area === "dungeon" && !this.map.deepDungeon && !this.map.building && this.map.recipe !== "deep-v1" && !String(this.areaId()).includes("aperture-annex") && hashSeed(`${this.save.seed}:gate-predator:v1:${this.areaId()}`) % 1000 < (history.gatePredatorSpawnThreshold || GATE_REVENANT.legacySpawnPerThousand))
      this.map.enemySpawns.push({ kind: "gateRevenant", x: 18, y: 6, gatePredator: true });
    if(area==="dungeon"&&!this.map.arena&&!this.map.building&&!String(this.areaId()).startsWith("hunt-instance:")&&!String(this.areaId()).startsWith("elite-portal:")&&!String(this.areaId()).includes("aperture-annex"))populateDungeonEncounters(this.map,{deep:!!this.map.deepDungeon||this.map.recipe==="deep-v1",monsterPack:packAdopted});this.trapSeeds=[];if(area==="dungeon"&&!this.map.arena&&!this.map.building&&this.save.consequences?.dungeons?.[this.save.session.activeDungeonId]?.trapsVersion&&!this.map.objects?.some(o=>o.newTrap))addNewTraps(this.map,this.save.seed,this.areaId(),this.save.consequences.dungeons[this.save.session.activeDungeonId].trapsVersion);/* release 523: only crossings first generated from now on */
    if (area === "overworld" && (this.rx !== 0 || this.ry !== 0)) {
      const remembered = this.save.checkpoints?.[`${this.rx},${this.ry}`];
      if (remembered && !remembered.crown && !this.map.objects.some((o) => o.kind === "checkpoint")) { // release 672: a Crown Rest (669) is rebuilt on its crown, never a Wayglass on flattened ground
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
      this.noteRegion(prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION); // release 573
      { this.farRealm = farRealmAt(this.save.seed, this.rx, this.ry, prior ? prior.farVersion || 0 : FAR_REALMS.version); const R = this.farRealm, jid = R && `far-realm:${R.type}:${R.id}`; // release 714: the far realms
        if (R && !this.save.narrative.journal.some((j) => j.recordId === jid)) { journalOnce(this.save, jid, `${R.arrive} (${this.rx},${this.ry})`, R.name); if (!this.message) this.message = R.arrive; }
        const fv = prior ? prior.farVersion || 0 : FAR_REALMS.version, lv = prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION; this.farPocket = lv >= 5 ? farPocketAt(this.save.seed, this.rx, this.ry, fv, sectionRegion(this.save.seed, this.rx, this.ry, lv)) : null; // release 715: the pockets
        if (this.farPocket?.civ && this.save.farQuests?.[this.farPocket.id]?.status === "open") { this.save.farQuests[this.farPocket.id].status = "found"; (this.questNotices ||= []).push({ title: "QUEST COMPLETE", detail: FAR_CIVS[this.farPocket.id].found, kind: "discovery" }); } // release 716
        const K = this.farPocket, kid = K && `far-pocket:${K.type}:${K.id}`; if (K && !this.save.narrative.journal.some((j) => j.recordId === kid)) { journalOnce(this.save, kid, `${K.arrive} (${this.rx},${this.ry})`, K.name); if (!this.message) this.message = K.arrive; } }
      this.domainVisit = null; if (this.map.farDomain) { const id = this.map.farDomain, D = FAR_DOMAINS[id], fq = (this.save.farQuests ||= {}), rec = fq[id], atOnce = !rec || rec.status === "open"; // release 723: a domain
        if (!rec) fq[id] = { status: "found", rx: this.rx, ry: this.ry }; else if (rec.status === "open") { rec.status = "found"; (this.questNotices ||= []).push({ title: "QUEST COMPLETE", detail: D.found, kind: "discovery" }); }
        const first = !this.save.narrative.journal.some((j) => j.recordId === `far-domain:${id}`); journalOnce(this.save, `far-domain:${id}`, `${D.arrive} (${this.rx},${this.ry})`, D.name.replace(/^the /, "The ")); this.message = first ? D.arrive : D.waiting; // every far domain lies beyond the Doom Chaser's homeland line (world-beasts.ts BEAST_HOMELANDS), so the Black Pyre waits for him like any other
        this.domainMessage = this.message;
        this.domainVisit = { id, clock: 0, wait: domainWait(this.save.seed, id, this.rx, this.ry, Math.floor(Number(this.save.playSeconds) || 0), atOnce), done: false }; }
      if (this.map.mushrooms && !this._coherence && !this.save.narrative.journal.some((j) => j.recordId === "great-mushrooms")) { journalOnce(this.save, "great-mushrooms", `${GREAT_MUSHROOMS.text} (${this.rx},${this.ry})`, "The great mushrooms"); if (!this.message) this.message = GREAT_MUSHROOMS.text; } // release 721
      if (!prior) stalkerNewSection(this.save); // release 678: new sections count toward the Stalker's return
      this.markDeepAnnexes(); // release 675
      if ((prior ? prior.deepVersion : THE_DEEP.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain && shaftHere(this.save.seed, this.rx, this.ry)) this.placeDeepShaft(); // release 677
      if ((prior ? prior.canyonVersion : CANYON.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain && canyonHere(this.save.seed, this.rx, this.ry)) this.placeCrater(); // Canyon craters: only in sections first seen from now on
      if ((prior ? prior.ascendVersion : ASCENDANCY.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain && !this.map.canopy && saplingHere(this.save.seed, this.rx, this.ry)) this.placeSapling(); // the Rite of Ascendancy
      if ((prior ? prior.arcVersion : 0) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain) { const v = prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION; if (v >= 5 && arcologyHere(this.save.seed, this.rx, this.ry, sectionRegion(this.save.seed, this.rx, this.ry, v)) && buildArcology(this.map, this.save.seed, this.rx, this.ry) && !this.message) this.message = ARCOLOGY.messages.arrive; } // ruined arcologies: only in sections first seen from now on
      if ((prior ? prior.keepVersion : 0) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain && keepHere(this.save.seed, this.rx, this.ry) && buildKeep(this.map, this.save.seed, this.rx, this.ry) && !this.message) this.message = KEEPS.messages.arrive; // great keeps: only in sections first seen from now on
      if ((prior ? prior.pentVersion : PENTAGON.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain) { const c = pentagonCentre(this.rx, this.ry); if (c && this.pentagonHere(c.cx, c.cy) && placePentagonSection(this.map, this.save.seed, c.cx, c.cy, this.rx, this.ry, this.pentagonVersion(c.cx, c.cy))) { if (!prior && this.map.pentagon.V === CLOSE_VIEW_ROOM_ROUTING.pentagonVersion) adoptPentagonRoomPadding(this.save, c.cx, c.cy, this.map.pentagon.base); const H = dungeonHistory(this.save, `${this.map.pentagon.base}:f1`); for (const o of this.map.objects) { if (o.kind === "pentLever" && (H.pentLevers || []).includes(o.lever)) Object.assign(o, { state: "pulled", actions: [] }); if (o.sigil && (o.sigilKey ? (H.pentOpened || []).includes(o.sigilKey) : H.pentSigil)) o.unsealed = true; if (o.barred && o.pentagonDoor && (H.labOpen || []).includes(o.shortcutKey)) o.opened = true; } if (!this.message) this.message = PENTAGON.messages.arrive; } } // the Pentagon: nine sections, all new ground
      if ((prior ? prior.castleVersion : CASTLES.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain) { const c = castleCorner(this.rx, this.ry); if (c && this.castleHere(c.X, c.Y) && placeCastleQuarter(this.map, this.save.seed, c.X, c.Y, c.q, castleVersionOf(this.save.atlas, c.X, c.Y)) && !this.message) this.message = CASTLES.messages.arrive; } // Great Castles: a quarter in each of the four sections round a corner, all of them new ground
      if (this._coherence && (this.map.pentagon || this.map.greatBuilding?.castle)) dropOverwritten(this.map); // WG-10: a tree or a stand of caps a castle or a Pentagon built over goes whole
      if ((prior ? prior.labVersion : LABYRINTHS.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain) { const v = prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION, plan = labyrinthHere(this.save.seed, this.rx, this.ry, v >= 5 ? sectionRegion(this.save.seed, this.rx, this.ry, v) : null); if (plan && placeLabyrinth(this.map, this.save.seed, this.rx, this.ry, plan, exitsOpen, this.coherentDoor(), prior ? prior.labVersion : LABYRINTHS.version) && !this.message) this.message = LABYRINTHS.messages.arrive; } // labyrinths: only in sections first seen from now on
      if ((prior ? prior.compoundVersion : COMPOUNDS.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain) { const v = prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION, plan = compoundHere(this.save.seed, this.rx, this.ry, v >= 5 ? sectionRegion(this.save.seed, this.rx, this.ry, v) : null); if (plan && placeCompound(this.map, this.save.seed, this.rx, this.ry, plan, exitsOpen, this.coherentDoor(), prior ? prior.compoundVersion : COMPOUNDS.version) && !this.message) this.message = COMPOUNDS.messages.arrive; }
      if (this.map.greatBuilding?.seal) for (const o of this.map.objects) if (o.kind === "towerLever" && towerUnsealed(this.save, o.towerSeal)) this.leverOver(o); // TOWER_SEAL: a lever already pulled (or its tower's key taken) stays over // compounds: only in sections first seen from now on
      if ((prior ? prior.buildingVersion : BUILDINGS.version) && !this.map.settlement && !this.map.hamlet && !this.map.farDomain) { const v = prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION, bv = prior ? prior.buildingVersion : BUILDINGS.version, region = v >= 5 ? sectionRegion(this.save.seed, this.rx, this.ry, v) : null, plan = bv >= 2 ? buildingHereV2(this.save.seed, this.rx, this.ry, region) : buildingHere(this.save.seed, this.rx, this.ry, region); if (plan && (bv >= 2 ? placeBuildingV2 : placeBuilding)(this.map, this.save.seed, this.rx, this.ry, plan, exitsOpen, bv >= 2 ? this.coherentDoor() : null, bv)) { adoptRoutingKeep(this.save, this.map, this.rx, this.ry, prior); applyRoutingKeepAppearance(this.save, this.map); if (!this.message) this.message = BUILDINGS.messages.arrive; } } // version 1 (711) as it was; 2: shapes and hives // great buildings: only in sections first seen from now on (in place of the keeps and arcologies)
      if (this.map.mushrooms && this._coherence && !this.save.narrative.journal.some((j) => j.recordId === "great-mushrooms")) { journalOnce(this.save, "great-mushrooms", `${GREAT_MUSHROOMS.text} (${this.rx},${this.ry})`, "The great mushrooms"); if (!this.message) this.message = GREAT_MUSHROOMS.text; } // release 721; on new ground, after a castle or Pentagon may have taken the caps (WG-10)
      if (this._coherence && !this.map.farDomain) cohereSection(this.map, { spots: coherenceSpots(this.map) }); // WG-02/05/06/07: the exits, the plaza, the great doors and the cairns join; no pits
      if (this._coherence && this.map.pentagon) for (const o of this.map.objects) if (o.pentLand) o.joined = joinToLand(this.map, o); // the Pentagon v6: each side entrance stands on land joined to the section's exits
      if (this._coherence && this.map.pentagon?.stairFoot) this.map.pentagon.stairFoot.joined = joinToLand(this.map, this.map.pentagon.stairFoot); // the Pentagon v7: the outer stair's foot likewise
      { const v = prior ? prior.landscapeVersion || 0 : LANDSCAPE_VERSION, r = v >= 5 ? sectionRegion(this.save.seed, this.rx, this.ry, v) : null; if (!prior) noteSeasonDiscovery(this.save, r?.id); this.season = trackSeason(this.save, r); } // release 679: the woods' season
      if (!prior) { atlas[key] = atlas[key] || {}; if (noteDiscovery(this.save)) this.message = "Word comes on the wind: around Ember Refuge, the groves and the quarry have grown back."; } // release 265: regrowth every 20 new sections
      // A section first seen now is pinned to the current landscape version; one explored earlier keeps none.
      atlas[key] = { ...prior, /* release 736 (review S7): fields a newer release wrote are kept; the ones below are rebuilt */ terrain: this.map.dominant, ...(prior ? (prior.landscapeVersion ? { landscapeVersion: prior.landscapeVersion } : {}) : { landscapeVersion: LANDSCAPE_VERSION }),
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
        ...(prior ? (prior.skyVersion ? { skyVersion: prior.skyVersion } : {}) : { skyVersion: SKYLANDS.version }), // release 571: Sky Stairs only in sections first seen from now on
        ...(prior ? (prior.skyPlace ? { skyPlace: prior.skyPlace } : {}) : { skyPlace: SKY_PLACE.version }), // release 672: where Sky Stairs stand, pinned per section
        ...(prior ? {} : { skySummitVersion: SKY_SUMMIT.version }), // old tree doors retain their original routes
        ...(prior ? (prior.deepVersion ? { deepVersion: prior.deepVersion } : {}) : { deepVersion: THE_DEEP.version }),
        ...(prior ? (prior.keepVersion ? { keepVersion: prior.keepVersion } : {}) : {}), // great keeps: sections first seen from 683 until the great buildings
        ...(prior ? (prior.arcVersion ? { arcVersion: prior.arcVersion } : {}) : {}), // and the ruined arcologies (685)
        ...(prior ? (prior.buildingVersion ? { buildingVersion: prior.buildingVersion } : {}) : { buildingVersion: BUILDINGS.version }), // the great buildings take their place
        ...(prior ? (prior.farVersion ? { farVersion: prior.farVersion } : {}) : { farVersion: FAR_REALMS.version }), // release 714: the far realms, new ground only
        ...(prior ? (prior.compoundVersion ? { compoundVersion: prior.compoundVersion } : {}) : { compoundVersion: COMPOUNDS.version }), // and the compounds
        ...(prior ? (prior.labVersion ? { labVersion: prior.labVersion } : {}) : { labVersion: LABYRINTHS.version }), // and the labyrinths
        ...(prior ? (prior.castleVersion ? { castleVersion: prior.castleVersion } : {}) : { castleVersion: CASTLES.version }), // and the Great Castles
        ...(prior ? (prior.pentVersion ? { pentVersion: prior.pentVersion } : {}) : { pentVersion: this.map.pentagon?.V || 9 }), // and the Pentagons; placement stamps its actual namespace, while no placement preserves r843's literal fallback
        ...(prior ? (prior.sigilVersion ? { sigilVersion: prior.sigilVersion } : {}) : { sigilVersion: PENTAGON_FINDING.version }), // and the Pentagon sigils (objects only: ground seen before keeps its objects)
        ...(prior ? (prior.canyonVersion ? { canyonVersion: prior.canyonVersion } : {}) : { canyonVersion: CANYON.version }), // and the Canyon craters
        ...(prior ? (prior.ascendVersion ? { ascendVersion: prior.ascendVersion } : {}) : { ascendVersion: ASCENDANCY.version }), // and the Sapling Daises // release 677: Deep Shafts likewise
        ...(prior ? (prior.coherenceVersion ? { coherenceVersion: prior.coherenceVersion } : {}) : { coherenceVersion: COHERENCE.version }), // world coherence: lanes bridged, exits joined, no pits (landscape.ts COHERENCE)
        ...(indoor ? { indoorDungeonVersion: indoor } : {}), // release 499: the dungeon entrance may stand inside a building
        color: sectionAtlasColor(this.map), // release 559: the Atlas shows the section as it really looks (atlas-colors.ts)
        ...(this.map.landscape?.biome ? { landscape: this.map.landscape.biome } : {}), sites: this.map.objects
        .filter((o) => ["diveSite","shipwright","checkpoint","dungeon","arenaEntrance","shrine","ruinMarker","shack","bossCue","architecturalDistrict","supplyCache","storyEcho","watcherTomb","skyStair","deepShaft"].includes(o.kind)) // release 465: the Watcher's shrines
        .map((o) => ({ kind: o.kind, name: o.kind === "watcherTomb" ? (o.where === "shrine" ? "Watcher's Shrine" : "Watcher's Tomb") : o.name || (o.kind === "supplyCache" ? "Supply Cache" : o.kind), x: o.x, y: o.y })) };
    }
    if (area === "overworld") this.openWayglassApproach(); // release 467 (Codex audit F006)
    if(area==="overworld")populateOverworldPack(this.map,this.save.seed,this.rx,this.ry,{safe:settlementSanctuary(this.map,this.rx,this.ry,this.save),fits:this._coherence?creatureSpot(this.map,creatureRegions(this.map)):null});/* WG-08: new ground's extras stand where they can move */
    if(area==="overworld"&&this.farPocket)populatePocket(this.map,this.save.seed,this.rx,this.ry,this.farPocket); // release 715: a stag grove or a blob pocket
    if(area==="overworld"&&this.farRealm?.type==="ink")populateInk(this.map,this.save.seed,this.rx,this.ry); // release 719: the Ink Wastes
    if(area==="overworld"&&this._coherence&&!this.map.farDomain)settleSpawns(this.map,coherenceKeeps); // WG-08: a creature on a pad it cannot leave moves to ground it can (new ground only)
    if(area==="overworld"&&(this.farRealm?.type==="monsterFolk"||this.farRealm?.type==="giantFolk"))this.map.farFolk=this.farRealm.type==="monsterFolk"?"monster":"giant"; // release 720: the folk realms
    if(area==="overworld"){const war=addSkirmish(this.map,this.save.seed,this.rx,this.ry,this.save);if(war)this.message=war.text;else if(this.map.settlement?.procedural)this.message=`${this.map.settlement.name} — a ${this.map.settlement.label.toLowerCase()} holds this ground.`}
    if(area==="overworld"&&arrayMouthAt(this.save,this.rx,this.ry)&&!this.map.objects.some(o=>o.kind==="arrayMouth")){const spots=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>10&&t.x<22&&t.y>10&&t.y<22).sort((a,b)=>Math.hypot(a.x-16,a.y-16)-Math.hypot(b.x-16,b.y-16));const at=spots[0]||{x:16,y:16};const far=ensureFarArray(this.save),quiet=far.quiet,away=quiet&&!far.moves;this.map.objects.push({id:"array-mouth",kind:"arrayMouth",name:quiet&&!away?"The Quiet Mouth":"The Array Mouth",lore:away?"The Listener has left it for now. The line still opens onto somewhere new each time, and it will call a Listener back here.":quiet?"Nothing listens below it now, but the line still opens onto somewhere new each time.":"A ruined relay terminal, half sunk into ground no map has charted. Its line hums under your feet.",x:at.x,y:at.y,state:quiet?"quiet":"ready",actions:["enter"],landmark:true});this.message=away?`The Array Mouth: its runs go on, but the Listener is away. ${quietMouthNote(this.save)}`:quiet?`The Array Mouth is quiet: its runs go on, but the Listener is gone. ${quietMouthNote(this.save)}`:"The Array Mouth: the far end of the relay line."}
    if(area==="overworld"&&arrayMouthAt(this.save,this.rx,this.ry)&&daisDue(ensureFarArray(this.save))&&!this.map.objects.some(o=>o.kind==="listenerDais")){const m=this.map.objects.find(o=>o.kind==="arrayMouth"),w=mapWidth(this.map,area),free=(x,y)=>{const t=this.map.tiles[y*w+x];return t&&!t.blocked&&!t.structure&&!t.environment&&!this.map.objects.some(o=>Math.round(o.x)===x&&Math.round(o.y)===y)};let at=null;for(let r=2;r<6&&!at;r++)for(const[dx,dy]of[[0,r],[r,0],[-r,0],[0,-r],[r,r],[-r,r]])if(!at&&m&&free(Math.round(m.x)+dx,Math.round(m.y)+dy))at={x:Math.round(m.x)+dx,y:Math.round(m.y)+dy};if(at){this.map.objects.push({id:"listener-dais",kind:"listenerDais",name:"The Listener's Dais",lore:"The Gate is whole. The dais hums with the Listener's line: step on, and it carries you to the hall where it waits.",...at,state:"humming",actions:["enter"],landmark:true});this.message="The Gate is whole: a dais has risen beside the Mouth. It leads to the Listener."}} // release 375
    if(area==="overworld"&&silentMouthAt(this.save,this.rx,this.ry)&&!this.map.objects.some(o=>o.kind==="silentMouth")){const spots=this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>10&&t.x<22&&t.y>10&&t.y<22).sort((a,b)=>Math.hypot(a.x-16,a.y-16)-Math.hypot(b.x-16,b.y-16));const at=spots[0]||{x:16,y:16};this.map.objects.push({id:"silent-mouth",kind:"silentMouth",name:"A Quiet Mouth",lore:"The Listener's old Mouth. Whatever waited here went deeper, but the line still opens onto somewhere new each time.",x:at.x,y:at.y,state:"quiet",actions:["enter"],landmark:true})} // release 357: an old Mouth stays; 361: still a door to a new run
    if(area==="overworld"&&townAt(this.save,this.rx,this.ry)?.mouth)this.raiseMouthTown(); // release 373 (after every Mouth, old ones too)
    if(area==="overworld"&&townAt(this.save,this.rx,this.ry))this.raiseTownAmenities(); // release 441
    if(area==="overworld")addSurveyorStatue(this.map,this.save,this.rx,this.ry); // release 551: Corwin's statue, once the chain is whole
    if(area==="overworld"){const band=addTravelers(this.map,this.save.seed,this.rx,this.ry),reader=addReciter(this.map,this.save.seed,this.rx,this.ry,this.save),quill=addWanderer(this.map,this.save,this.rx,this.ry),note=wandererArrive(this.save,this.map,this.rx,this.ry);const beast=questingBeastFor(this.save,this.map,this.rx,this.ry),elder=addElder(this.map,this.save,this.rx,this.ry),worldBeastFound=worldBeastFor(this.save,this.map,this.rx,this.ry),worldBeast=beast&&!worldBeastFound?.retreating?null:worldBeastFound;if(worldBeast){this.map.enemySpawns.push(worldBeast);const companion=astralCompanionFor(this.save,worldBeast,{rx:this.rx,ry:this.ry},this.map.enemySpawns.length);if(companion)this.map.enemySpawns.push(companion);const B=WORLD_BEASTS[worldBeast.worldBeast];this.message=worldBeast.retreating?`${B.name} is fleeing through here toward ${BEAST_HOMES[B.home].name}. It cannot be hurt now.`:`${B.arrive} ${worldBeastTriesLeft(this.save,worldBeast.worldBeast)} of ${B.tries} tries remain.`}/* release 241: a fleeing beast says so, and passes through the Questing Beast's ground too *//* release 235: world beasts */if(!beast&&!worldBeast){const chrys=mothChrysalisFor(this.save,this.map,this.rx,this.ry);if(chrys){this.map.enemySpawns.push(chrys);this.message=CHRYSALIS.found}}/* release 708: the Ashen Moth's chrysalis on a great tree */addStrange(this.map,this.save,this.rx,this.ry);/* release 215: a rare strange tree or stone */addDigSpot(this.map,this.save,this.rx,this.ry);/* release 225: a rare patch of disturbed earth */const ilse=addIlse(this.map,this.save,this.rx,this.ry,!!farSleepSection(this.rx,this.ry));/* release 415: Ilse the Lamplighter */for(const id of mouthsIn(this.save,this.rx,this.ry))placeMouth(this.map,id);/* release 217: second mouths of linked dungeons */if(beast){this.map.enemySpawns.push(beast);this.message=`The Questing Beast hunts here. ${questingBeastTriesLeft(this.save)} of ${QUESTING_BEAST.tries} tries remain.`}{const seenSky=this.save.atlas?.[`${this.rx},${this.ry}`];if((!seenSky||seenSky.skyVersion)&&!this.map.settlement&&skylandSection(this.save.seed,this.rx,this.ry,seenSky?.skyPlace||1)&&!this.map.objects.some(o=>o.kind==='skyStair')){const skyV=seenSky?.skyVersion||SKYLANDS.version,disc=skyV>=3?buildSkyDiscs(this.map,this.save.seed,this.rx,this.ry):null,top=disc?{x:disc.x-.5,y:disc.y-.75,elev:disc.level,disc:true}:skyV===2?buildSkyway(this.map,this.save.seed,this.rx,this.ry):null;/* release 585: the skyway ascent; 587: floating discs */const spot=skyV>=2?top:this.map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&!t.buildingId&&t.x>8&&t.x<24&&t.y>8&&t.y<24&&!this.map.objects.some(o=>Math.hypot(o.x-t.x,o.y-t.y)<2)).sort((a,b)=>Math.hypot(a.x-16,a.y-15)-Math.hypot(b.x-16,b.y-15))[0];if(spot&&top)this.map.objects.push({id:`skyway-${this.rx}-${this.ry}`,kind:'skyStair',name:'Skyway',skyway:true,elev:top.elev,...(top.disc?{disc:true}:{}),lore:'At the top of the floating steps a door of pale stone stands in the open air, and behind it is sky.',x:spot.x,y:spot.y,state:'open',actions:['ascend:0']});else if(spot)this.map.objects.push({id:`sky-stair-${this.rx}-${this.ry}`,kind:'skyStair',name:'Sky Stair',lore:'A stair of pale stone climbs into the open air and stops. Above it, islands drift. The divine challenge is offered to anyone who climbs.',x:spot.x,y:spot.y,state:'open',actions:['ascend:0']});const annex=spot&&skyAnnexStair(this.save.seed,this.rx,this.ry,seenSky?.skyPlace||1),st=annex&&this.map.objects.find(o=>o.kind==='skyStair');if(st){Object.assign(st,{skyAnnex:true,name:`${st.name} · ${SKY_ANNEX.name}`,lore:SKY_ANNEX.messages.stair});this.message=SKY_ANNEX.messages.stair}/* release 678: the Skylands Deep Annex, named before you climb */const rec=spot&&this.save.atlas?.[`${this.rx},${this.ry}`];if(rec&&Array.isArray(rec.sites)&&!rec.sites.some(q=>q.kind==='skyStair'))rec.sites.push({kind:'skyStair',name:st?st.name:top?'Skyway':'Sky Stair',x:spot.x,y:spot.y})}}/* release 571: the Skylands */if(!beast&&!worldBeast){const passing=passingBeastFor(this.save,this.map,this.rx,this.ry,Object.keys(this.save.explored||{}).length);if(passing){this.map.enemySpawns.push(passing);this.passingNote=`Far off, ${WORLD_BEASTS[passing.passingBeast].name} moves through, bound for ${BEAST_HOMES[WORLD_BEASTS[passing.passingBeast].home].name}. It pays you no mind: it is only passing through, a sight, not a hunt you can follow.`}}/* release 569 */if(beast||worldBeast){}else if(ilse)this.message=ilse.stage===5?"A lamp burns in the meadow with no post beneath it.":"Someone is tending a lamp nearby.";else if(elder)this.message="Something tall and silent walks the road.";else if(note)this.message=note;else if(quill)this.message="A cartographer on a moss grazer is sketching the horizon.";else if(reader)this.message=`${reader.name} walks by, murmuring.`;else if(band&&!this.map.skirmish&&!this.map.settlement)this.message=`${band.title} on the road.`}
    this.activatedEncounterGroups=new Set;
    if(area==="dungeon"){const haunt=worldBeastForDungeon(this.save,this.map,this.areaId());if(haunt){this.map.enemySpawns.push(haunt);const companion=astralCompanionFor(this.save,haunt,{dungeon:this.areaId(),level:this.map.levelId||"root"},this.map.enemySpawns.length);if(companion)this.map.enemySpawns.push(companion);const B=WORLD_BEASTS[haunt.worldBeast];this.beastNote=haunt.retreating?`${B.name} is retreating ${haunt.worldBeast === "voidWalker" ? "toward the nearest reachable dungeon door" : haunt.worldBeast === "astralWorm" ? "toward the nearest reachable Wayglass" : "toward the water"}. It cannot be hurt now.`:`${B.arriveDungeon||B.arrive} ${worldBeastTriesLeft(this.save,haunt.worldBeast)} of ${B.tries} tries remain.`}} /* release 249: the Psychic Crystal haunts dungeons with water */
    if (area === "dungeon" && !this.map.enemySpawns.some((q) => q.extraSpawn)) for (const q of this.extraDungeonSpawns()) this.map.enemySpawns.push(q); // release 463: more foes
    if (area === "dungeon" && !this.map.enemySpawns.some((q) => q.marginWarden)) for (const w of wardenSpawns(this.save, this.map, this.areaId(), dungeonHistory(this.save, this.areaId()).wardensSlain || [])) this.map.enemySpawns.push(w); // release 459: Margin Wardens; 473: the slain stay slain
    if (area === "overworld") endMarginRun(this.save); // release 459: marginalia hold only inside the crossing
    { const here = this.fracturedHere(area); if (here && !this.map.enemySpawns.some((q) => q.fractured)) { const w = mapWidth(this.map, area), open = (x, y) => this.fracturedOpen(x, y, w); /* release 651: Fractured mode's packs */
      const base = this.map.enemySpawns.filter((q) => fracturedOrdinary(q)), tiles = base.length ? [] : this.map.tiles.filter((t, i) => i % 7 === 0 && open(t.x, t.y));
      this.map.enemySpawns.push(...densityPacks(this.save.seed, this.areaStateId(), here, base, tiles, open, this.map.enemySpawns.filter((q) => !q.ambient && !q.passiveBehavior && !q.retreating && !q.passingBeast && q.kind !== 'npc').length)); } }
    this.hauntGorged = false; { const hid = area === "dungeon" ? this.areaId() : `${this.rx},${this.ry}`, inside = area === "dungeon" && (isBuildingId(hid) || isCastleId(hid) || isPentagonId(hid)); // release 731: the haunts
      const plan = hauntPlan(this.save.seed, hid, { keep: area === "overworld" && !!(this.map.keep || this.map.greatBuilding?.castle), interior: inside, wild: area === "overworld" && !!(this.map.fogMoor || this.map.dream), depth: Math.abs(this.rx) + Math.abs(this.ry) });
      if (plan && !this.map.hauntPlaced) { this.map.hauntPlaced = true; const k = area === "overworld" && this.map.keep ? this.map.keep : null; this.map.enemySpawns.push(...hauntSpawns(this.map, mapWidth(this.map, area), this.save.seed, hid, plan, k && { x: k.x, y: k.y, w: k.w, h: k.h }, !k && this.map.greatBuilding?.castle ? (t) => !!(t.courtyard && t.greatBuilding) : null)); } } // release 735: a castle's courts, not the causeway outside its walls
    if (area === "overworld" && this.map.farDomain) { this.map.enemySpawns = this.map.enemySpawns.filter((e) => this.map.farDomain === "questingBeast" ? e.questingBeast : e.worldBeast === this.map.farDomain && !e.retreating); this.map.objects = (this.map.objects || []).filter((o) => o.domain); if (this.domainMessage) this.message = this.domainMessage; } this.domainMessage = null; // release 723: nothing lives in a domain but its beast
    this.enemies = this.map.enemySpawns.map(e => this.createEnemyFromSpawn(e,area));
    this.roofDwell = null; // roof-dwellers.ts: made below, once the section's objects are all laid
    if (area === "overworld" && this.map?.canopy?.top && !this.map.objects.some((o) => o.kind === "crownRest")) { // release 669: a rest point on every great tree's crown
      const top = this.map.canopy.top, gate = this.map.objects.find((o) => o.kind === "canopyGate"), c = this.map.canopy, crown = this.map.tiles.filter((t) => t.kind === "canopyTrunk" && t.elev === top && !(gate && t.x === gate.x && t.y === gate.y) && (!(c.size > 0) || (t.x >= c.x0 && t.x < c.x0 + c.size && t.y >= c.y0 && t.y < c.y0 + c.size))); // the door tree's own crown (a canopy grove's other crowns may stand as high)
      const t = crown.sort((a, b) => (a.y - b.y) || (a.x - b.x))[0]; if (t) this.map.objects.push({ id: `crown-rest-${this.rx}-${this.ry}`, kind: "crownRest", name: "Crown Rest", x: t.x, y: t.y, state: "open", actions: [] });
    }
    if (area === 'dungeon' && this.map.skyland) for (const e of this.enemies) this.scaleSkyFoe(e); // release 571
    if (area === 'overworld') { const areas = this.save.session?.areas || {}, hist = this.save.consequences?.dungeons || {}; for (const k of Object.keys(areas)) if (isSkyland(k)) delete areas[k]; for (const k of Object.keys(hist)) if (isSkyland(k)) delete hist[k]; } // release 571: a finished or abandoned Skyland run leaves nothing behind
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
    if (area === "overworld" && this.map.farDomain) { const own = this.map.farDomain; this.enemies = this.enemies.filter((e) => own === "questingBeast" ? e.questingBeast : e.worldBeast === own); } // release 724: sea creatures and Aperture intrusions stay out of a domain too
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
    { const into = this.areaStateId(), left = this._heldStateId, held = left && left !== into ? this.save.session.areas[left] : null, bare = held && compactArea(held, true); if (bare && bare !== held) this.save.session.areas[left] = bare; this._heldStateId = into; } // perf pack: shots frozen in flight in the area just left are dropped (replaced, not edited, for the save)
    const s = this.save.session.areas[this.areaStateId()];
    if (s) {
      const by = new Map((s.enemies || []).map((e) => [e.id, e]));
      const refill = !!this.fracturedHere(area) && Number.isFinite(Number(s.leftAt)) && (Number(this.save.playSeconds) || 0) - Number(s.leftAt) >= FRACTURED.repopulate; // release 651: away long enough, it fills up again
      this.enemies = this.enemies.map((e) => {
        const restored = by.get(e.id);
        if (!restored) return e.fractured ? this.scaleToRegion(e) : e; // balance pack (tim.md 1): a Fractured pack new to known ground
        if (refill && restored.dead && fracturedOrdinary(restored)) return this.scaleToRegion(e); // and a refill
        const merged = {
          ...e,
          ...(isTombstone(restored) ? tombstoneBlanks(restored, e) : null), // perf pack: a tombstone's empty identity stays empty
          ...restored,
          ai: { ...ensureAI(e), ...restored.ai },
        };
        if (restored.dungeonThreatTuningVersion === undefined) delete merged.dungeonThreatTuningVersion;
        if(area === "dungeon" && !merged.passiveBehavior && !merged.ambient && !merged.worldBeast && !merged.astralCompanionOf && !merged.pentFinaleBeast) tuneDungeonThreat(merged); // release 249: a world beast keeps its own tuning
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
      for(const saved of s.enemies||[])if(saved.gloomFinale&&!saved.dead&&!this.enemies.some(e=>e.id===saved.id)){const restored={...saved,ai:{...saved.ai}};ensureAI(restored);resetPackRuntime(restored);this.enemies.push(restored)} // the Gloomvast, spawned by its arena at run time (spawnGloomFinale), comes back as it was
      for(const saved of s.enemies||[])if((saved.gatePredator||saved.foundryId||saved.astralMountFixture||saved.riteFoe&&area==="overworld"&&this.rite?.key===riteKey(this.rx,this.ry)/* release 736 (F7): a Rite resumed keeps its foes */)&&!saved.dead&&!this.enemies.some(e=>e.id===saved.id)){const restored={...saved,ai:{...saved.ai}};ensureAI(restored);if(restored.gatePredator){tuneGatePredator(restored,this.save,characterStats(this.save));resetGateAttack(restored, true)}this.enemies.push(restored)}
      for(const saved of s.enemies||[])if(saved.astralOwner&&!saved.dead&&this.enemies.length<32&&!this.enemies.some(e=>e.id===saved.id)){const owner=this.enemies.find(e=>e.id===saved.astralOwner&&!e.dead),clone=owner?.astral?.clones?.find(c=>c.id===saved.id&&c.hp>0);if(clone){const restored={...saved,hp:Math.min(saved.hp,clone.hp),noRewards:true,summonedBy:owner.id,ai:{...saved.ai}};delete restored.worldBeast;delete restored.questingBeast;ensureAI(restored);this.enemies.push(restored);}}
      for (const o of this.map.objects)
        if (s.objects?.[o.id]) Object.assign(o, s.objects[o.id]);
      if (area === "overworld" && this.rite?.key !== riteKey(this.rx, this.ry)) for (const o of this.map.objects) if (o.kind === "saplingDais" && o.state === "burning") { // release 736 (review F7): no rite burns here now
        o.state = "open"; delete o.burn; const rec = riteRecord(this.save, this.rx, this.ry);
        // A rite lost without being broken (a journey saved mid-rite before rites were kept) gives its attempt back; one broken
        // by leaving the section or dying has its failure in the journal and stays spent.
        if (rec.tries > 0 && !this.save.narrative?.journal?.some((j) => j.recordId === `rite-failed:${riteKey(this.rx, this.ry)}:${rec.tries}`)) { rec.tries--; this.message = ASCENDANCY.messages.resumeRefund; (this.questNotices ||= []).push({ title: "THE RITE IS LOST", detail: "the journey closed mid-rite · the attempt is given back", kind: "discovery" }); journalOnce(this.save, `rite-refund:${riteKey(this.rx, this.ry)}:${rec.tries + 1}`, ASCENDANCY.messages.resumeRefund, "The Rite of Ascendancy"); }
      }
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
    if (area === "overworld") { applyDragonLava(this.save, this.map, this.rx, this.ry); this.dragonCatchUp(); } // release 709: the Crimson Tyrant's lava stays lava
    if (area === "overworld") this.layTurtleShells(); // a slain Mountain Turtle's shell, laid over the section from its record (turtle-shell.ts)
    if (area === "dungeon") {
      // Wall glints were generated before the persistent overlay. A consumed wall must not regain a
      // floating treasure marker when the dungeon is loaded again.
      this.map.wallGlints = (this.map.wallGlints || []).filter(q => this.map.tiles[q.y * mapWidth(this.map, area) + q.x]?.blocked);
      if (this.map.objects?.some((o) => o.dir === "roofExit") && !this.roofExitGuarded()) this.openRoofExit(); // release 746: the vault reached with no guardian standing
      if (this.map.pentFinale) this.refreshDais(); // the dais's choices, as this journey has used them
      if (this.map.building?.pentagon && this.map.building.vault && (!this.roofExitGuarded() || dungeonHistory(this.save, `${this.map.building.base}:f1`).regentGrade)) this.openPentagonFinale(); // the Pentagon's finale: the Regent fell (now, or in a journey before it: none stands, or v3+ recorded his fall), the wall stands open
      if (this.map.pentArena) this.pentagonArenaSync(); // the Stillworks: the seam as the history says
    }
    const ar=this.save.worldBeasts?.astralWorm?.active?.astralRetreat;
    if(ar&&astralRetreatSceneMatches(ar.scenes?.[ar.sceneKey],this)){const carried=astralRetreatSpawn(this.save.worldBeasts.astralWorm.active);if(carried){const existing=this.enemies.find(e=>e.worldBeast==='astralWorm');if(existing)Object.assign(existing,carried);else this.enemies.push(carried);ensureAI(existing||carried);}}
    if(area==="dungeon"&&this.map[ROOM_PADDING_CANDIDATE]){
      const candidate=this.map[ROOM_PADDING_CANDIDATE];
      delete this.map[ROOM_PADDING_CANDIDATE];
      applyRoomPadding(this.map,candidate);
    }
    this._walkerRoutes = new WeakMap(); this._walkerLandingGraph = null;
    const areaWidth = mapWidth(this.map, area),
      resumeLiftPosition = !capture && this.validInteriorLift(this.save.session.playerRuntime?.droneLift),
      playerRelocated = !resumeLiftPosition && !(area === "overworld" && aboard(this.save) && footprintSailable(this.map, areaWidth, this.player.x, this.player.y)) && relocateIfStranded(this.player, this.map, areaWidth);
    if (area === "dungeon" && !resumeLiftPosition) { const to = settleDungeonArrival(this.map, areaWidth, this.player, this.enemies, false); if (to) { this.player.x = to.x; this.player.y = to.y; } } // release 419: a resumed or loaded floor never leaves you in a sealed pocket
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
      { const w = this.wonderCue(); if (w) this.map.objects.push(w); } // release 729: a cue toward the nearest unexplored labyrinth (Pentagons: the sigil below)
      { const p = this.pentagonSigil(); if (p) this.map.objects.push(p); this.pentagonFindingArrive(); this._pentOfferAt = null; this._pentOfferWait = 0; } // Pentagon finding: a sigil toward the Pentagon whose catchment holds this section; hunts reached or done
      if (this.map.pentagon) this.roofDwell = { sleepers: this.roofSleepers(), told: false }; // roof-dwellers.ts: asleep, outside the enemy list, until the Wayfarer is on the roof
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
    const M = MIRE_CRYPT, st = here.state, lair = this.map.mireLair, p = this.player, heart = this.enemies.find((e) => e.mireHeart && !e.dead), es = eliteStateInPlace(this.save).status;
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
    if(this.droneLift && interiorTerrain(this.map) && footprintOpen(this.map,mapWidth(this.map,this.area),this.player.x,this.player.y,true))return false;
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
    if (v) { this.attackBufferUntil = 0; this.fistReleaseIntent=null; }
    if (v && !this.paused) {
      this.pauseStarted = now;
      this.recoverPosition();
      if (this.orrery) this.orrery.charge = null; // the Aether Orrery: a charge held into the pause is dropped, never released
    }
    if (!v && this.paused && this.pauseStarted !== null) {
      const pausedMs = Math.max(0, now - this.pauseStarted);
      shiftClocks(this, pausedMs); // release 736 (F5/C12): every timer, from the one list
      if(this.pendingMeleeContact?.v===1){this.pendingMeleeContact.acceptedAt+=pausedMs;this.pendingMeleeContact.releaseAt+=pausedMs;}
      // Runtime presentation clocks can observe a pause even when scenes/background suspension skip every render/input callback.
      // Its logical time is saved separately; this offset never joins the gameplay clock lists.
      this.presentationPausedMs = (this.presentationPausedMs || 0) + pausedMs;
    }
    this.paused = v;
    this.pauseStarted = v ? this.pauseStarted : null;
    this.save.session.paused = v;
  }
  exportSnapshot(now = 0) {
    const clock =
      this.paused && this.pauseStarted !== null ? this.pauseStarted : now;
    this.reconcileHammerfallStartup();
    this.sync();
    this.snapshotArea(false); // a save in place, not a leaving
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
        ...this.save.session.playerRuntime, // release 736 (S7): fields from a newer release are kept
        ...this.resumeRuntime(clock), // release 736 (F6/F7/S8, C13): statuses, timers, the rite and the skiff's way
        droneLift: this.droneLift && this.droneLiftAllowed() ? { ...this.droneLift, base: this.droneLift.base, z: this.droneLift.z, vz: this.droneLift.vz, ...(this.area === "dungeon" ? { area: "dungeon", areaId: this.areaId(), levelId: String(this.map.levelId || "root") } : {}) } : null, // release 647: a lift resumes in the air; schema-14 unknown fields survive while canonical values win
        glide: this.glide && this.area === "overworld" ? { z: this.glide.z, vx: this.glide.vx, vy: this.glide.vy, open: this.glide.open !== false, fallFrom: this.glide.fallFrom ?? null } : null, // release 635: a glide resumes in the air
        glideHome: this.glideHome && this.area === "overworld" ? { ...this.glideHome } : null, // TREE_GLIDE.home: the great tree a glide from its crown wakes you on
        crownFoot: this.crownFoot && this.area === "overworld" ? { rx: this.crownFoot.rx, ry: this.crownFoot.ry } : null, // TREE_GLIDE.home.reached: the great crown last stood on
        hp: this.player.hp,
        stamina: this.player.stamina,
        facing: this.player.facing,
        walkPhase: this.player.walkPhase,
        heroPresentationTime: Math.max(0, Math.min(1e12, clock - (this.presentationPausedMs || 0))),
        consumeVisual: normalizeConsumeVisual(this.player.consumeVisual),
        cachePickupVisual: normalizePersistentCachePickupVisual(this.player.cachePickupVisual),
        hurtVisual: normalizeHurtVisual(this.player.hurtVisual),
        attackCooldown: remaining(this.player.attackReadyAt, clock),
        attackMotion: remaining(this.player.attackUntil, clock),
        attackVisual: normalizeAttackVisual(this.player.attackVisual, remaining(attackVisualDeadline(this.player,this.player.attackVisual,{effects:this.effects,now:clock,pendingToolUse:this.pendingToolUse}), clock)),
        pendingToolUse:this.savedPendingToolUse(clock)??(Number.isInteger(this.save.session.playerRuntime.pendingToolUse?.v)&&this.save.session.playerRuntime.pendingToolUse.v>1?structuredClone(this.save.session.playerRuntime.pendingToolUse):null),
        pendingMeleeContact:this.savedPendingMeleeContact(clock)??(Number.isInteger(this.save.session.playerRuntime.pendingMeleeContact?.v)&&this.save.session.playerRuntime.pendingMeleeContact.v>1?structuredClone(this.save.session.playerRuntime.pendingMeleeContact):null),
        hammerfallStartup:this.savedHammerfallStartup(),
        ...(Number.isFinite(this.player.actionVisualUntil) ? { actionVisualMotion: remaining(attackVisualDeadline(this.player,this.player.attackVisual,{effects:this.effects,now:clock,pendingToolUse:this.pendingToolUse}), clock) } : {}),
        castVisual: normalizeCastVisual(this.player.castVisual, remaining(this.player.castUntil,clock)),
        ...(Number.isFinite(this.player.primaryVisualUntil) ? { primaryVisualMotion: remaining(this.player.primaryVisualUntil, clock) } : {}),
        ...(Number.isFinite(this.player.fistVisualUntil) ? { fistVisualMotion: remaining(this.player.fistVisualUntil, clock) } : {}),
        primaryCombo: normalizePrimaryCombo(this.player.primaryCombo),
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
        dodgeVisual: normalizeDodgeVisual(this.player.dodgeVisual),
        jump: remaining(this.jumpUntil, clock),
        mechSpent: this.mechSpent === true, // release 609
        guard: this.guardRemaining,
        traversal: this.traversal ? { ...this.traversal } : null,
      },
    });
    return this.save;
  }
  // Release 736 (review F6/F7/S8, C13): what exact resume needs beyond the timers above. Absolute times are stored as ms
  // remaining (from `clock`), burning and the frenzy as they stand (they count down by dt), a Rite in progress as its
  // elapsed and remaining time. Every key is written each save, so a status that has ended is cleared.
  resumeRuntime(clock) {
    const p = this.player, clocks = {}, R = this.rite, copy = (o) => o && typeof o === "object" ? JSON.parse(JSON.stringify(o)) : null;
    for (const k of RESUME_PLAYER_CLOCKS) { const v = remaining(p[k], clock); if (v > 0) clocks[k] = v; }
    for (const k of RESUME_GAME_CLOCKS) { const v = remaining(this[k], clock); if (v > 0) clocks[`game.${k}`] = v; }
    return {
      clocks,
      slowFactor: clocks.slowUntil ? p.slowFactor ?? null : null,
      heldBy: clocks.heldUntil ? p.heldBy ?? null : null,
      stunnedFor: clocks.stunnedUntil && Number.isFinite(p.stunnedAt) ? Math.max(0, clock - p.stunnedAt) : null,
      fire: copy(this.playerFire),
      frenzy: copy(this.frenzy),
      rite: R ? { key: R.key, at: { ...R.at }, elapsed: Math.max(0, clock - R.started), left: remaining(R.until, clock), next: remaining(R.nextAt, clock), n: R.n } : null,
      sailVx: Number(p.sailVx) || 0,
      sailVy: Number(p.sailVy) || 0,
      poisonSoak: Number(this.poisonSoak) || 0,
      raftZ: Number(this.raftZ) || 0,
      swimming: this.swimming === true,
      swimKind: this.swimming === true ? this.swimKind ?? null : null,
      fatalFallPending: this._fatalFallPending === true,
      // Exact resume of a jump in the air (found with TREE_GLIDE.home.reached): the height it left from and the sky-hop height it
      // holds; before, a jump off a great crown saved mid-air resumed at the ground's height and its fall (or freefall) was lost.
      jumpAir: clock < (this.jumpUntil || 0) && !this.droneLift ? { from: Number.isFinite(this.jumpFrom) ? this.jumpFrom : null, skyAir: Number.isFinite(this.skyAir) ? this.skyAir : null, scale: Number(this.skyAirScale) || null, dur: Number(this.jumpDur) || null, liftDrop: this.liftDrop === true, hopGap: this.skyHopGap === true } : null,
      curses: cursesOut(p.curses, clock), // release 737: the haunt curses, with what each has left (and the health FRAIL holds back)
    };
  }
  savedPendingToolUse(clock){const q=this.pendingToolUse;if(!q||q.v!==1)return null;const remainingMs=Math.max(0,Math.min(q.startupMs,q.releaseAt-clock)),elapsedMs=q.startupMs-remainingMs;return normalizePendingToolUse({...q,acceptedAt:undefined,releaseAt:undefined,elapsedMs,remainingMs});}
  restorePendingToolUse(raw,now){const q=normalizePendingToolUse(raw);if(!q||q.v!==1||q.area!==this.area||q.areaId!==this.areaId()||q.levelId!==String(this.map?.levelId||'root')||!(this.player.hp>0)){this.pendingToolUse=null;return false;}const{elapsedMs,remainingMs,...rest}=q;this.pendingToolUse={...rest,acceptedAt:now-elapsedMs,releaseAt:now+remainingMs};return true;}
  savedPendingMeleeContact(clock){const q=this.pendingMeleeContact;if(!q||q.v!==1)return null;const remainingMs=Math.max(0,Math.min(q.contactMs,q.releaseAt-clock)),elapsedMs=q.contactMs-remainingMs;return normalizePendingMeleeContact({...q,acceptedAt:undefined,releaseAt:undefined,elapsedMs,remainingMs});}
  restorePendingMeleeContact(raw,now){const q=normalizePendingMeleeContact(raw);if(!q||q.v!==1||q.area!==this.area||q.areaId!==this.areaId()||q.levelId!==String(this.map?.levelId||'root')||!(this.player.hp>0)){this.pendingMeleeContact=null;return false;}const{elapsedMs,remainingMs,...rest}=q;this.pendingMeleeContact={...rest,acceptedAt:now-elapsedMs,releaseAt:now+remainingMs};return true;}
  savedHammerfallStartup(){const q=this.hammerfallStartup;if(q?.v===1)return normalizeHammerfallStartup(q);const old=this.save.session.playerRuntime.hammerfallStartup;return Number.isInteger(old?.v)&&old.v>1?structuredClone(old):null;}
  restoreHammerfallStartup(raw){const q=normalizeHammerfallStartup(raw);this.hammerfallStartup=q?.v===1?q:null;if(this.hammerfallStartup&&this.resolveHammerfallStartup().status!=='pending')this.hammerfallStartup=null;if(this.hammerfallStartup&&this.pendingToolUse)this.cancelPendingToolUse('dual-startup-restore');return !!this.hammerfallStartup;}
  // Release 736 (review F8): lethal ground is judged where the Wayfarer ends up, not where the stick pointed. A step whose end
  // the Wayfarer cannot stand on (a blocked lava or abyss tile: walls stop them first) is tried out on a copy, and the
  // hazard is read where that copy stopped; ground the Wayfarer can enter (open lava, deep water, canyon) is unchanged.
  hazardWhereMoved(p, dx, dy, nx, ny, width, now) {
    const h = footprintHazard(this.map, width, nx, ny); if (!h || footprintOpen(this.map, width, nx, ny, true)) return h;
    const probe = { ...p, isPlayer: true, jumping: now < (this.jumpUntil || 0), voidSuit: this.mechUp() && this.area !== "dungeon" };
    moveAxis(probe, dx, dy, this.map, width, true);
    return footprintHazard(this.map, width, probe.x, probe.y);
  }
  actorContactPlatformSupport(body, x, y, ground, phase = null, carrier = null) {
    if (!body?.isPlayer) return null;
    if (body.jumping && Number.isFinite(this.discAir))
      return ground + this.discAir * LIFT_PER_LEVEL;
    if (this.skyLevel > 0 && discAt(this.map, x + .5, y + .75, { level: this.skyLevel }))
      return ground + this.skyLevel * LIFT_PER_LEVEL;
    if (carrier?.raft) {
      const px = Math.max(0, Math.min(1, Number(phase?.x) || 0)), py = Math.max(0, Math.min(1, Number(phase?.y) || 0)),
        pt = Math.max(0, Math.min(1, Number(phase?.t) || 0)), a = carrier.old, b = carrier.current,
        cx = a.x + (b.x - a.x) * px, cy = a.y + (b.y - a.y) * py,
        fx = x + .5, fy = y + .72, tile = this.map?.tiles?.[Math.floor(fy) * (this.map.width || 32) + Math.floor(fx)];
      if (tile?.chasm && Math.abs(fx - cx) <= STARFIELD_PLATFORMS.half && Math.abs(fy - cy) <= STARFIELD_PLATFORMS.half)
        return ground + (a.z + (b.z - a.z) * pt) * LIFT_PER_LEVEL;
    }
    const time = Number(this.save.playSeconds) || 0, raft = platformUnder(this.map, x, y, time);
    return raft ? ground + platformPos(raft, time).z * LIFT_PER_LEVEL : null;
  }
  // The shared ordinary-displacement adapter also serves pulls, knockback and enemy lunges.
  // Specialized boat/mount/world-beast controllers retain their explicit movement paths.
  moveGrounded(entity, dx, dy, allowLethalTerrain = false, onStep = null, allowMarineTerrain = false) {
    const contacts = actorContactContext(this, entity, dx, dy);
    if (contacts) contacts.record = false;
    return moveAxis(entity, dx, dy, this.map, mapWidth(this.map, this.area), allowLethalTerrain, onStep, allowMarineTerrain, contacts);
  }
  // Combat's quarter-tile steps already have their own endpoint canStand guard. Keep
  // their exact arithmetic when the swept segment clears bodies; only a real contact
  // enters the terrain/contact solver. Damage and action clocks stay with the caller.
  moveGuardedCombatStep(x, y) {
    const p = this.player, dx = x - p.x, dy = y - p.y, contacts = actorContactContext(this, p, dx, dy);
    if (!contacts || contacts.clip(p.x, p.y, dx, dy) === 1) { p.x = x; p.y = y; return true; }
    return moveAxis(p, dx, dy, this.map, mapWidth(this.map, this.area), false, null, false, contacts);
  }
  planGroundedPlayerMove(dx, dy, width, now, carrier = null) {
    const contacts = actorContactContext(this, this.player, dx, dy); if (!contacts) return null;
    const probe = contacts.probe, p = this.player, from = tileUnder(this.map, width, p.x, p.y), jumping = now < (this.jumpUntil || 0);
    // Simulation flags match the commit path, without mutating the player, lift or action clocks.
    probe.x = p.x; probe.y = p.y; probe.isPlayer = true; probe.jumping = jumping; probe.voidSuit = this.mechUp() && this.area !== "dungeon";
    const launch = jumping && (from?.skyPlatform || (interiorTerrain(this.map) && from?.interiorPlatform));
    probe.airElev = jumping ? (launch ? Math.max(this.skyAir ?? -1, from.elev || 0) : this.skyAir ?? undefined) : undefined;
    probe.airElevScale = launch ? tileLiftScale(from) : this.skyAirScale || 1;
    contacts.supportSubject = probe;
    contacts.carrier = carrier;
    contacts.record = true;
    // A valid section exit is an intent, not terrain beyond this map. Bodies before that exit
    // still clip its trace. The ordinary transition code consumes the accepted endpoint below.
    contacts.canExit = (x, y) => {
      if (this.area !== "overworld") return false;
      const exits = this.map.exits || {}, near = (v, opening) => Math.abs(v - opening) <= 1.45;
      const seam = (sx, sy) => !!this.map.pentagon && this.pentagonSeam(p, sx, sy);
      return (x < 0 && (near(p.y, exits.west) || seam(-1, 0)))
        || (x + .76 >= SECTION_SIZE - .02 && (near(p.y, exits.east) || seam(1, 0)))
        || (y < 0 && (near(p.x, exits.north) || seam(0, -1)))
        || (y + .88 >= SECTION_SIZE - .02 && (near(p.x, exits.south) || seam(0, 1)));
    };
    moveAxis(probe, dx, dy, this.map, width, true, null, false, contacts);
    contacts.record = false; contacts.canExit = null; contacts.carrier = null; contacts.endX = probe.x; contacts.endY = probe.y;
    return contacts;
  }
  // Release 736 (review F4/F8): the states that belong to where the Wayfarer was, cleared by a death and by Wayglass travel.
  clearCarriedStates() {
    this.cancelPendingToolUse('world-reset');
    this.clearHammerfallStartup('world-reset');
    this.fistReleaseIntent=null;
    const p = this.player;
    p.heldUntil = p.stunnedUntil = p.slowUntil = p.confusedUntil = 0; p.heldBy = null; p.slowFactor = 1;
    p.sailVx = p.sailVy = 0;
    this.glide = null; this.glideHome = null; this.crownFoot = null; this.droneLift = null; this.swimming = false; this.skyAir = null; this.ledgeHint = null; this.poisonSoak = 0;
    this.clearCurses(); // release 737: the haunt curses (FRAIL gives its health back)
    this.orrery = null; // the Aether Orrery's circling orbs and charge (its overload clock stays)
    this.endGloomDarks(); // the Gloomvast's Dark ends with a death or a journey by Wayglass
  }
  restoreRuntime(r, now) {
    if (!r || typeof r !== "object") return;
    const p = this.player, c = r.clocks && typeof r.clocks === "object" ? r.clocks : {}, ms = (v) => Number.isFinite(Number(v)) && Number(v) > 0 ? Math.min(Number(v), 864e5) : 0;
    for (const k of RESUME_PLAYER_CLOCKS) if (ms(c[k])) p[k] = now + ms(c[k]);
    for (const k of RESUME_GAME_CLOCKS) if (ms(c[`game.${k}`])) this[k] = now + ms(c[`game.${k}`]);
    p.curses = cursesIn(r.curses, now); // release 737
    if (p.slowUntil && Number(r.slowFactor) > 0) p.slowFactor = Math.min(1, Number(r.slowFactor));
    if (p.heldUntil && r.heldBy != null) p.heldBy = r.heldBy;
    if (p.stunnedUntil) p.stunnedAt = now - (Number.isFinite(Number(r.stunnedFor)) ? Math.max(0, Number(r.stunnedFor)) : 0);
    const f = r.fire; if (f && typeof f === "object" && [f.left, f.dps, f.tick].every((v) => Number.isFinite(Number(v))) && Number(f.left) > 0) this.playerFire = { ...f, left: Number(f.left), dps: Math.max(0, Number(f.dps)), tick: Number(f.tick) };
    if (r.frenzy && typeof r.frenzy === "object") this.frenzy = { ...r.frenzy };
    const q = r.rite; if (q && typeof q === "object" && typeof q.key === "string" && /^-?\d+,-?\d+$/.test(q.key) && [q.elapsed, q.left, q.next].every((v) => Number.isFinite(Number(v))) && Number(q.left) > 0 && q.at && [q.at.x, q.at.y].every(Number.isFinite))
      this.rite = { key: q.key, at: { x: q.at.x, y: q.at.y }, started: now - Math.max(0, Number(q.elapsed)), until: now + Number(q.left), nextAt: now + Math.max(0, Number(q.next)), n: Math.max(0, Math.floor(Number(q.n) || 0)) };
    for (const k of ["sailVx", "sailVy"]) if (Number.isFinite(Number(r[k]))) p[k] = Number(r[k]);
    if (Number.isFinite(Number(r.poisonSoak))) this.poisonSoak = Math.max(0, Number(r.poisonSoak));
    if (Number.isFinite(Number(r.raftZ))) this.raftZ = Number(r.raftZ);
    if (r.swimming === true) { this.swimming = true; if (typeof r.swimKind === "string") this.swimKind = r.swimKind; }
    if (r.fatalFallPending === true) this._fatalFallPending = true;
  }
  // The jump in the air as saved (resumeRuntime `jumpAir`), after the area loads (loadArea clears the sky-hop height).
  restoreJumpAir(j, now) {
    if (!j || typeof j !== "object" || !(this.jumpUntil > now)) return; const n = (v) => v != null && Number.isFinite(Number(v)) ? Number(v) : null;
    if (n(j.from) != null) this.jumpFrom = n(j.from); if (n(j.skyAir) != null) this.skyAir = n(j.skyAir); if (n(j.scale) > 0) this.skyAirScale = n(j.scale); if (n(j.dur) > 0) this.jumpDur = n(j.dur); this.liftDrop = j.liftDrop === true; this.skyHopGap = j.hopGap === true;
  }
  // Release 734 (S6/F2): where a death or Wayglass travel lands. A checkpoint with a null or NaN coordinate (a damaged save)
  // threw on every death or stranded the Wayfarer at x=null; the active one is repaired to the Ember Refuge instead.
  safeCheckpoint(c = this.save.activeCheckpoint) {
    if (validCheckpoint(c)) return c;
    const home = this.save.checkpoints?.["0,0"], fallback = validCheckpoint(home) ? home : { ...REFUGE_CHECKPOINT };
    if (c === this.save.activeCheckpoint) this.save.activeCheckpoint = fallback;
    return fallback;
  }
  travelToCheckpoint(key = null) {
    const chosen = key ? this.save.checkpoints?.[key] : this.save.activeCheckpoint;
    if (!chosen || (key && !validCheckpoint(chosen))) return false;
    const c = this.safeCheckpoint(chosen); // release 734
    if (this.rite) { this.message = ASCENDANCY.messages.sealed; return false; } // the Rite of Ascendancy seals Wayglass travel (and returnHome); a Crossing Sigil breaks the rite before it travels
    if(this.save.session.displacementJourney){this.message="Wayglass travel cannot find you after the displacement. Reach a physical Wayglass—or die—to restore the line, or use a Crossing Sigil.";return false}
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
    this.clearCarriedStates(); // release 736 (review F8): you arrive on your feet, not gliding, swimming or held
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
  // The Wayfarer's height in levels: the ground under them, or the drone's lift or a glide's height (ELEVATION_REACH).
  playerLevel() { if (this.droneLiftAllowed() && this.droneLift && Number.isFinite(this.droneLift.z)) return this.droneLift.z; if (this.area === "overworld" && this.glide && Number.isFinite(this.glide.z)) return this.glide.z; return this.elevationHere(this.player.x, this.player.y + (this.player.riderShift || 0)); } // release 748: a mounted rider stands where the mount's feet are
  bodyReach(e) { return bodyBlowReaches(this.map, mapWidth(this.map, this.area), e, this.player, null, this.playerLevel()); }
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
      nudge(e, dx, dy) { if (game.astralRiderHeld(e)) return; const w = mapWidth(game.map, game.area); if (footprintOpen(game.map, w, e.x + dx, e.y + dy)) {
        const contacts = actorContactContext(game, e, dx, dy);
        if (contacts) { contacts.record = false; moveAxis(e, dx, dy, game.map, w, false, null, false, contacts); }
        else { e.x += dx; e.y += dy; }
      } },
    };
  }
  tickGlyphs(dt, now) {
    const mountedHp = this.enemies.filter(e => e.astralOwner || e.astralMount?.status === "mounted").map(e => [e, Math.max(0,e.hp)]);
    tickGlyphStatus(this.enemies, dt, now, (e) => this.defeatEnemy(e));
    for (const [e, hp] of mountedHp) this.astralPlayerHit(e, Math.max(0,hp-Math.max(0,e.hp)));
    const due = (this.glyphTimers ||= []).filter((t) => t.at <= now);
    this.glyphTimers = this.glyphTimers.filter((t) => t.at > now);
    for (const t of due) {
      if (t.kind === "strike" && this.primaryStrike) {
        const priorStrike=this.player.meleeStrike;
        this.primaryStrike(now, null, { share: t.share });
        const g=this.player.meleeStrike,p=this.attackProfile;
        if(g!==priorStrike&&g&&p){const list=(this.glyphVisuals||=[]),first=list.findIndex(v=>v.kind==='primaryEcho');if(list.filter(v=>v.kind==='primaryEcho').length>=PRIMARY_ECHO_VISUAL.cap&&first>=0)list.splice(first,1);
          list.push({kind:'primaryEcho',life:PRIMARY_ECHO_VISUAL.life,max:PRIMARY_ECHO_VISUAL.life,actual:{x:g.x,y:g.y,dx:g.dx,dy:g.dy,range:p.range,arc:p.arc,shape:p.shape},memory:t.echoVisual||null});}
      }
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
  leaveDungeon(message = "You return to the dungeon entrance.", options = {}) {
    const q = this.save.session.dungeonReturn || this.save.activeCheckpoint;
    if (!q) return false;
    if (options.sigil) for (const e of this.enemies) if (e.gatePredator && e.aggro && !e.dead) { e.aggro = false; resetGateAttack(e, true); } // CROSSING_SIGIL: nothing follows a sigil out; they stay where you left them
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
      before = this.save.consumables.restorativeDraught || 0, home = this.area === "overworld" ? this.glideHome : null; // TREE_GLIDE.home
    this.glideHome = null;
    if (this.area !== "dungeon") stalkerPlayerFell(this.save); // release 678: it lets the fallen go
    stopRide(this.save); // release 748: death gets you down; the mount stays stabled with its time
    this.captureLastDeath();
    this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
    this.save.session.displacementJourney = null;
    if (before < 2) this.save.consumables.restorativeDraught = 2;
    clearRot(this.save); this.clearCarriedStates(); // release 737: this death clears what was carried too (the haunt curses, the turning-about)
    p.hp = this.save.maxHp; // release 345 (Tim: "When you die, you don't lose anything"): carried wood is kept
    p.stamina = this.save.maxStamina;
    p.attackReadyAt =
      p.dodgeReadyAt =
      p.dodgeUntil =
      p.castUntil =
      p.attackUntil =
      p.meleeUntil =
        0;
    p.meleeStrike = null;
    p.attackVisual = null;
    p.castVisual = null;
    p.primaryCombo = null; p.actionVisualUntil = 0; p.primaryVisualUntil = 0; p.fistVisualUntil = 0;
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
      const stars = this.fellStars ? "You stepped off the edge and fell away into the stars. " : ""; this.fellStars = false; // release 597
      this.message = stars + (deep ? `Felled — recovered at the central anchor of ${this.map.name}. Cleared wings, shortcuts, carried items, XP, and map progress remain.${before < 2 ? " Restorative draughts replenished to 2." : ""}` : `Felled — returned to the entrance of ${this.map.name}. The run begins again; your map and everything carried remain.${before < 2 ? " Restorative draughts replenished to 2." : ""}`);
    } else {
      const c = this.safeCheckpoint(); // release 734
      const crown = !!home && this.wakeOnCrown(home, now); // TREE_GLIDE.home
      if (!crown) {
      this.rx = c.rx;
      this.ry = c.ry;
      this.loadArea("overworld");
      p.x = c.x;
      p.y = c.y;
      }
      p.invulnerableUntil = now + 2000;
      this.message = `Felled — ${crown ? TREE_GLIDE.home.wake : `recovered at ${c.name || "checkpoint"}`}. No items, marks, equipment, or XP were lost. You are protected briefly.${crown && TREE_GLIDE.home.setsRest ? TREE_GLIDE.home.rest : ""}${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
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
  // The rite's fire at the edge (RITE_LOCKDOWN): the Wayfarer is set back `inset` tiles inside it when the ground there (and
  // half way to it) holds them on foot, or the water a skiff; otherwise they stay where they stood (a swimmer, glider, drone or
  // robot too); only one carried past the edge itself is brought back inside, onto safe ground. Never a section load. False.
  riteHoldEdge() {
    const p = this.player, w = mapWidth(this.map, "overworld"), S = SECTION_SIZE, I = RITE_LOCKDOWN.inset, sea = aboard(this.save);
    const loose = !sea && (this.swimming || !!this.glide || !!this.droneLift || this.mechUp());
    const holds = (x, y) => sea ? footprintSailable(this.map, w, x, y) : footprintOpen(this.map, w, x, y) && !footprintHazard(this.map, w, x, y);
    const bx = Math.max(I, Math.min(S - 1 - I, p.x)), by = Math.max(I, Math.min(S - 1 - I, p.y));
    if ((bx !== p.x || by !== p.y) && !loose && holds(bx, by) && holds((bx + p.x) / 2, (by + p.y) / 2)) { p.x = bx; p.y = by; }
    else if (!(p.x >= 0 && p.y >= 0 && p.x <= S - .78 && p.y <= S - .9)) { p.x = Math.max(.3, Math.min(S - 1.1, p.x)); p.y = Math.max(.3, Math.min(S - 1.1, p.y)); if (!loose && !holds(p.x, p.y)) this.landSafely(); }
    if (sea) { p.sailVx = 0; p.sailVy = 0; }
    this.message = ASCENDANCY.messages.noLeave; return false;
  }
  transitionSection(dx, dy) {
    if (this.rite && this.area === "overworld") return this.riteHoldEdge(); // the rite's fire bars every edge
    const from = { rx: this.rx, ry: this.ry, x: this.player.x, y: this.player.y }, wade = this.wading(), fromPent = !!this.map?.pentagon, fromCoherent = !!this._coherence;
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
    // The Pentagon (pentagon.ts): within its nine sections the Wayfarer crosses an edge where they stand, as one ground; and coming
    // to it from outside, a lane that would land inside its walls lands on the nearest open ground along that edge instead.
    if (this.map?.pentagon || fromPent) { const p = this.player, along = dx ? Math.max(.25, Math.min(30.75, from.y)) : Math.max(.25, Math.min(30.75, from.x)), at = (v) => dx ? { x: p.x, y: v } : { x: v, y: p.y }, okAt = (q) => footprintOpen(this.map, 32, q.x, q.y);
      if (okAt(at(along))) Object.assign(p, at(along)); else if (!okAt(p)) for (let k = 1; k < 31; k++) { const a = at(along - k), b = at(along + k); if (along - k >= .25 && okAt(a)) { Object.assign(p, a); break; } if (along + k <= 30.75 && okAt(b)) { Object.assign(p, b); break; } } }
    // Release 507: the robot wading keeps its place along the edge when water or open ground meets it there.
    if (wade) { const p = this.player, at = dx ? { x: p.x, y: Math.max(.25, Math.min(30.75, from.y)) } : { x: Math.max(.25, Math.min(30.75, from.x)), y: p.y }, h = footprintHazard(this.map, 32, at.x, at.y); if (h ? this.swimsHere(h) : footprintOpen(this.map, 32, at.x, at.y)) { p.x = at.x; p.y = at.y; } }
    // World coherence (WG-01): from new ground, whose lanes are always bridged, into a section seen before whose lane a river or
    // canyon still cuts at the edge: the Wayfarer lands on the nearest footing along that edge, or stays on this side.
    if (fromCoherent && !this._coherence && !wade && !aboard(this.save) && !this.glide && !this.mechUp() && ["river", "canyon"].includes(footprintHazard(this.map, 32, this.player.x, this.player.y))) {
      const p = this.player, at = (v) => dx ? { x: p.x, y: v } : { x: v, y: p.y }, base = dx ? p.y : p.x, ok = (q) => footprintOpen(this.map, 32, q.x, q.y) && !footprintHazard(this.map, 32, q.x, q.y); let got = null;
      for (let k = 1; k <= COHERENCE.nudge && !got; k++) for (const v of [base - k, base + k]) if (!got && v >= .25 && v <= 30.75 && ok(at(v))) got = at(v);
      if (got) Object.assign(p, got); else { this.returnFrom(from, COHERENCE.messages.noCrossing); return false; }
    }
    // Open seas (release 152): a skiff crosses wherever the water runs on; a walker cannot step out into open sea.
    if (aboard(this.save)) { if (!this.sailAcross(dx, dy, from)) return false; }
    else if (DEEP_WATER.includes(footprintHazard(this.map, 32, this.player.x, this.player.y)) && !canSwim(this.save) && !this.mechUp() && !this.glide /* release 635: a glider is in the air */) { this.returnFrom(from, "Open sea lies beyond. You need a boat to cross it."); return false; }
    this.worldBeastsFollow(hunters, fromArea, dx, dy);
    for(const pursuer of pursuers){const e={...pursuer,id:`${pursuer.id}-pursuit-${this.rx}-${this.ry}`,dead:false,aggro:true,x:this.player.x-dx*1.4,y:this.player.y-dy*1.4,ai:{...pursuer.ai,homeX:this.player.x,homeY:this.player.y}};placeGatePursuer(e,this.player,this.map,mapWidth(this.map,this.area));resetGateAttack(e, true);this.enemies.push(e)}
    if(pursuers.length)this.message="The Gate Revenant tears through the crossing behind you.";
    this.edgeHold = { dx: -dx, dy: -dy, at: this.lastUpdateNow || 0 }; // perf pack (P6)
    this.sync();
  }
  // Perf pack (P6): whether a crossing toward (dx, dy) is the held edge just crossed (see EDGE_HOLD). Clears the hold once the
  // Wayfarer is `depth` inside that edge or the time has passed.
  edgeHeld(dx, dy, now) {
    const h = this.edgeHold; if (!h) return false;
    const p = this.player, inside = h.dx < 0 ? p.x : h.dx > 0 ? SECTION_SIZE - (p.x + .76) : h.dy < 0 ? p.y : SECTION_SIZE - (p.y + .88);
    if (this.area !== "overworld" || inside > EDGE_HOLD.depth || now - h.at > EDGE_HOLD.ms || now < h.at) { this.edgeHold = null; return false; }
    return dx === h.dx && dy === h.dy;
  }
  // Places the skiff on the new section's matching edge. Water there: sail on. Ground there: run aground and step
  // ashore (the skiff moors in the section it came from). Neither: turn back. Returns false when it turned back.
  sailAcross(dx, dy, from) {
    const p = this.player, map = this.map, x0 = dx < 0 ? 31.18 : dx > 0 ? .02 : from.x, y0 = dy < 0 ? 31.08 : dy > 0 ? .02 : from.y;
    const offsets = [0, .5, -.5, 1, -1, 1.5, -1.5, 2, -2, 3, -3, 4, -4], at = (k) => ({ x: x0 + (dy ? k : 0), y: y0 + (dx ? k : 0) });
    for (const k of offsets) { const q = at(k); if (footprintSailable(map, 32, q.x, q.y) && !bergAt(this.seaHazards, q.x, q.y)) { p.x = q.x; p.y = q.y; return true; } }
    for (const k of offsets) { const q = at(k); if (footprintOpen(map, 32, q.x, q.y) && !footprintHazard(map, 32, q.x, q.y)) {
      const robot = !!ensureBoatState(this.save).mechSubFrom; disembark(this.save, { rx: from.rx, ry: from.ry, x: Math.max(0, Math.min(31, Math.floor(from.x + .5))), y: Math.max(0, Math.min(31, Math.floor(from.y + .7))) }); this.placeMooredSkiff();
      p.x = q.x; p.y = q.y; p.sailVx = p.sailVy = 0; this.message = robot ? "The robot unseals and stands up on the shore." : "You run the skiff aground and wade ashore. It waits at the edge of the last section."; return true; } }
    this.returnFrom(from, "Rock and wall bar the way across. The skiff turns back.");
    return false;
  }
  leaveSkiff() {
    const p = this.player, width = 32, here = tileUnder(this.map, width, p.x, p.y);
    const moor = { rx: this.rx, ry: this.ry, x: here?.x ?? Math.round(p.x), y: here?.y ?? Math.round(p.y) };
    let shore = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const q = { x: p.x + dx, y: p.y + dy }; if (footprintOpen(this.map, width, q.x, q.y) && !footprintHazard(this.map, width, q.x, q.y)) { shore = q; break; } }
    if (!shore && !canSwim(this.save)) { this.message = "Nowhere to stand, and you cannot swim. Find a shore first."; return false; }
    const robot = !!ensureBoatState(this.save).mechSubFrom; disembark(this.save, moor); p.sailVx = p.sailVy = 0; this.placeMooredSkiff();
    if (robot) { if (shore) Object.assign(p, shore); this.message = shore ? "The robot unseals and steps ashore." : "The robot unseals and wades in the water."; return; } // release 621
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
  // Release 571 (skylands.ts): a Skyland foe is made stronger by the run's Ascension, once.
  scaleSkyFoe(e) { if (e.skyScaled || e.ambient || e.passiveBehavior) return; const k = skylandScale(this.map.skyTier || 0), f = skyAnnexFloor(this.areaId()), v = visceraScale(this.map.skyPact || {}), a = f ? { hp: SKY_ANNEX.scale.hp[f - 1] * v.hp, damage: SKY_ANNEX.scale.damage[f - 1] * v.damage } : v; /* release 678: each annex floor harder; 682: the pact's might */ const base = skyVitals(e.skyRole, this.save, characterStats(this.save)); if (base) { const n = (e.skyEchoes || 1) - 1, S = SKY_MODES.echoShare, echo = e.skyRole === "echo"; e.maxHp = Math.max(1, Math.round(base.hp * (echo ? S.hp[n] : 1))); e.damage = Math.max(1, Math.round(base.damage * (echo ? S.damage[n] : 1))); } /* release 688: from the Wayfarer's level, by role */ e.maxHp = Math.max(1, Math.round(e.maxHp * k.hp * a.hp)); e.hp = e.maxHp; e.damage = Math.max(1, Math.round(e.damage * k.damage * a.damage)); e.skyScaled = true; }
  // Each frame in a Skyland: when every foe is down, the next wave comes after a breath; after the boss, the run is cleared.
  tickSkyland(dt) {
    const id = this.areaId(), h = dungeonHistory(this.save, id); if (h.resolved) return;
    if (h.skyHold) { const d = this.holdSkyChallenge(); if (d && Math.hypot(this.player.x - d.x, this.player.y - d.y) > DAIS.leave) this.beginSkyChallenge(); return; } // release 686: the first round waits on the dais
    if (this.enemies.some((e) => !e.dead && !e.ambient && !e.passiveBehavior && !e.summonedBy && e.kind !== "npc")) { this.skyGap = SKYLANDS.waveGap; return; }
    if ((this.skyGap = (this.skyGap ?? SKYLANDS.waveGap) - dt) > 0) return;
    h.skyWave = (h.skyWave || 0) + 1; this.skyGap = SKYLANDS.waveGap; const plan = this.map.skyPlan || SKYLANDS.waves; // release 589: the run's own plan
    if (h.skyWave < plan.length) {
      const spawns = skylandWave(id, h.skyWave, this.map.skyOpen || [], this.map.objective || { x: 18, y: 11 }, this.map.skyBoss, this.map.skyPlan);
      for (const sp of spawns) { const c = this.createEnemyFromSpawn(sp, "dungeon"); this.scaleSkyFoe(c); c.aggro = true; this.enemies.push(c); }
      const echoes = [...new Set(spawns.filter((q) => q.skyEcho).map((q) => WORLD_BEASTS[q.skyEcho].name))];
      this.message = echoes.length ? `The sky gathers itself into ${echoes.join(" and ")}${spawns.length > echoes.length ? ", and keepers beside" : ""}.` : plan[h.skyWave].boss ? (h.skyWave === plan.length - 1 ? "The sky darkens over the last island. Its keeper comes." : "Keepers step down out of the light.") : "More of them drop out of the open sky.";
      return;
    }
    h.resolved = true; h.visitOpen = false; const tier = this.map.skyTier || 0;
    if (skyAnnexNext(id) && isDivineRun(skyAnnexNext(id))) this.raiseVisceraAltar(); // release 682: before the annex's Divine Challenge
    if (skyAnnexNext(id)) { h.annexNext = skyAnnexNext(id); (this.questNotices ||= []).push({ title: `${SKY_ANNEX.name.toUpperCase()} · SKYWAY ${skyAnnexFloor(id)} OF 3 CLEARED`, detail: "the way down is now a stair of cloud to the next island · the reward waits at the top", kind: "quest" }); this.message = SKY_ANNEX.messages.next; this.sync(); return; } // release 678
    const won = completeSkyland(this.save, tier);
    if (isDivineRun(id)) { const sk = this.save.skylands, got = visceraEarned(h.skyPact || {}); sk.viscera = (Number(sk.viscera) || 0) + got; won.viscera = got; this.raiseVisceraAltar(); } // release 682
    if (skylandHops(id)) h.skyHop = true; // release 589: this run's way down is a cloud gate
    (this.questNotices ||= []).push({ title: "SKYLAND CLEARED", detail: `Ascension ${tier} · +${won.sigils} Ascension Sigil${won.sigils > 1 ? "s" : ""}, +${won.marks} marks${won.weaponSphere || won.armorSphere ? `, ${won.weaponSphere + won.armorSphere} spheres` : ""}${won.viscera ? `, +${won.viscera} ${VISCERA.name}` : ""}`, kind: "quest" });
    this.message = `The islands fall quiet. You hold ${this.save.skylands.sigils} Ascension Sigil${this.save.skylands.sigils === 1 ? "" : "s"}. ${h.skyHop ? "The way down has become a gate of cloud: it drops you far from where you climbed." : "Take the way back down at the stair's foot."}`;
    journalOnce(this.save, `skyland-best:${this.save.skylands.best}`, `You cleared a Skyland at Ascension ${tier}. Each climb repays its sigils; the higher stairs ask for more.`, "The Skylands"); this.sync();
  }
  // The nearest Wayglass or relay within WAYGLASS_ZONE.reach that can be used, or null.
  // `usable` false (the no-boat zone, release 569): any Wayglass or relay counts, activated or not.
  wayglassNear(usable = true) {
    if (this.area !== "overworld") return null;
    let f = null, d = WAYGLASS_ZONE.reach;
    for (const o of this.map.objects || []) { if (!WAYGLASS_ZONE.kinds.includes(o.kind)) continue; const n = Math.hypot(o.x - this.player.x, o.y - this.player.y); if (n < d && (!usable || validActions(o, this.save).length)) { f = o; d = n; } }
    return f;
  }
  // Roof report (Tim, 2026-11-04: a roof hatch "took several presses of Act"): on a great building's or compound's roof, what
  // Act reaches is measured from the tile under the feet (as movement reads it). Standing on the hatch or any of the 8 tiles round
  // it reaches it first; nothing down on the ground below the roof is reached from up there, and a hatch is not reached from below.
  reachOf(o) {
    const p = this.player, n = Math.hypot(o.x - p.x, o.y - p.y);
    if (this.area !== "overworld" || !this.map?.greatBuilding) return n;
    const W = mapWidth(this.map, this.area), fx = Math.floor(p.x + .5), fy = Math.floor(p.y + .75), roof = (x, y) => this.map.tiles[y * W + x]?.structure === "buildingRoof", up = roof(fx, fy);
    if (o.roofHatch) { if (!up) return Infinity; const c = Math.max(Math.abs(Math.round(o.x) - fx), Math.abs(Math.round(o.y) - fy)); return c <= 1 ? c * .25 : n; }
    return up && !roof(Math.round(o.x), Math.round(o.y)) ? Infinity : n;
  }
  nearestObject() {
    let f = null,
      d = 1.5;
    for (const o of this.map.objects) {
      const n = this.reachOf(o);
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
  // Release 686 (skylands.ts DAIS): a Divine Challenge entered holding viscera waits: its first round is held back and an Ascension
  // Dais stands by the entry. Offerings there go into the pact this challenge takes up when it begins (stepping off the dais, or
  // Begin): stronger, longer, lighter, other echoes. Idempotent (a reload mid-wait holds it again). Returns the dais.
  holdSkyChallenge() {
    let d = this.map.objects.find((o) => o.kind === "visceraAltar" && o.start); if (d) return d;
    const w0 = `${this.areaId()}:w0:`; this.enemies = this.enemies.filter((e) => !String(e.id || "").startsWith(w0)); this.map.enemySpawns = (this.map.enemySpawns || []).filter((q) => !String(q.id || "").startsWith(w0));
    const at = this.map.entry || { x: this.player.x, y: this.player.y + 1 }, w = mapWidth(this.map, "dungeon");
    const spot = this.map.tiles.filter((t) => !t.blocked && !t.environment && footprintOpen(this.map, w, t.x, t.y) && !this.map.objects.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < 1.5)).sort((a, b) => Math.abs(Math.hypot(a.x - at.x, a.y - (at.y - 2)) - 0) - Math.abs(Math.hypot(b.x - at.x, b.y - (at.y - 2)) - 0) || a.y - b.y || a.x - b.x)[0];
    d = { id: `ascension-dais-start-${this.areaId()}`, kind: "visceraAltar", start: true, name: DAIS.name, lore: `The Divine Challenge waits while you stand here. Offer ${VISCERA.name} to shape it: stronger, longer, lighter, or other echoes drawn. Step off the dais, or Begin, and it comes.`, x: spot?.x ?? at.x, y: spot?.y ?? at.y - 2, state: "open", actions: ["offer:might", "offer:round", "offer:reroll", "offer:lighten", "begin"] };
    this.map.objects.push(d); this.message = `An ${DAIS.name} stands before the Divine Challenge. You hold ${visceraOf(this.save)} ${VISCERA.name}: offer them here to shape this fight, then step off the dais or Begin.`;
    return d;
  }
  beginSkyChallenge() {
    const id = this.areaId(), h = dungeonHistory(this.save, id); if (!h.skyHold) return { ok: false, message: this.message };
    this.holdSkyChallenge(); h.skyHold = false; h.skyPact = takePact(this.save); const pact = h.skyPact; // the held first round goes, the pact's comes
    this.map.skyPlan = skylandPlan(id, this.save, this.map.skyBoss, pact); if (Object.keys(pact).length) this.map.skyPact = { ...pact }; else delete this.map.skyPact;
    for (const sp of skylandWave(id, 0, this.map.skyOpen || [], this.map.objective || { x: 18, y: 11 }, this.map.skyBoss, this.map.skyPlan)) { const c = this.createEnemyFromSpawn(sp, "dungeon"); this.scaleSkyFoe(c); c.aggro = true; this.enemies.push(c); }
    const d = this.map.objects.find((o) => o.kind === "visceraAltar" && o.start); if (d) { d.start = false; d.actions = d.actions.filter((a) => a !== "begin"); d.lore = `Offerings here now shape your next Divine Challenge.`; }
    this.message = `The Divine Challenge begins: ${pactWords(pact)}.`; this.skyGap = SKYLANDS.waveGap; this.sync();
    return { ok: true, message: this.message };
  }
  // Release 682 (skylands.ts VISCERA): the Ascension Dais, raised beside the way out of a cleared Divine Challenge (and at the top
  // of the annex's second skyway): offerings there shape the pact for the next Divine Challenge.
  raiseVisceraAltar() {
    if (!this.map || this.map.objects.some((o) => o.kind === "visceraAltar")) return null;
    const exit = this.map.objects.find((o) => o.kind === "exit") || this.map.entry || { x: 18, y: 26 }, w = mapWidth(this.map, "dungeon");
    const spot = this.map.tiles.filter((t) => !t.blocked && !t.environment && footprintOpen(this.map, w, t.x, t.y) && !this.map.objects.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < 1.5)).sort((a, b) => Math.abs(Math.hypot(a.x - exit.x, a.y - exit.y) - 2.5) - Math.abs(Math.hypot(b.x - exit.x, b.y - exit.y) - 2.5) || a.y - b.y || a.x - b.x)[0];
    if (!spot) return null;
    const o = { id: `viscera-altar-${this.areaId()}`, kind: "visceraAltar", name: "Ascension Dais", lore: `A pedestal of pale stone, warm to the touch. Offer ${VISCERA.name} here and your next Divine Challenge answers: stronger, longer, lighter, or with other echoes drawn. Pact: ${pactWords(this.save.skylands?.pact || {})}.`, x: spot.x, y: spot.y, state: "open", actions: ["offer:might", "offer:round", "offer:reroll", "offer:lighten"] };
    this.map.objects.push(o); return o;
  }
  // Release 678 (skylands.ts SKY_ANNEX): up from a cleared annex floor to the next. The stair's return is kept, so a death or the
  // way down still leads back to it; the Ascension carries on and no sigils are spent again.
  climbAnnex(id) {
    this.snapshotArea(); const was = this.areaId(); delete (this.save.session.areas || {})[was];
    this.save.session.activeDungeonId = id; this.save.session.activeDungeonLevelId = null;
    const h = dungeonHistory(this.save, id); h.gatePredatorSpawnThreshold = 0; h.skyWave = 0; h.visits++; h.visitOpen = true; if (isDivineRun(id)) { if (visceraOf(this.save) > 0) h.skyHold = true; else h.skyPact = takePact(this.save); } // release 682; 686
    this.loadArea("dungeon"); this.player.x = this.map.entry?.x ?? 18; this.player.y = (this.map.entry?.y ?? 27) - 1; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); this.settleArrival();
    const f = skyAnnexFloor(id); this.message = f === 3 ? `${SKY_ANNEX.name}, the last island: a Divine Challenge. Echoes of the beasts you have felled wait here.` : `${SKY_ANNEX.name}, skyway ${f} of 3. More wings in the clouds, and fiercer.`;
    (this.questNotices ||= []).push({ title: SKY_ANNEX.name.toUpperCase(), detail: f === 3 ? "3 of 3 · the Divine Challenge" : `skyway ${f} of 3`, kind: "quest" }); this.sync(); return { ok: true, message: this.message };
  }
  // Release 663 (Tim, 2026-11-01: "if you cross the skylands... it'll take you to the top of another tree that you haven't
  // discovered... far off... so you can either parachute down or you can hop down"): a sky gate drops the Wayfarer on the crown
  // of a great tree near where it would have dropped them, one never seen first, then the nearest. Cheap tests (the jungle region
  // and the tree's own grow roll) pick the candidates; at most `SKY_TREE.loads` sections are built to find one. None: the old drop.
  // Admission is bounded and isolated. Failed probes never discover sections, retire hunts,
  // alter snapshots or touch production storage. Only unseen destinations can extend this chain.
  planSkySummit() {
    const from = { rx: this.rx, ry: this.ry }, run = (this.save.skylands?.runs || 0) + 1;
    const target = skylandHop(`summit:v1:${this.save.seed}:${from.rx},${from.ry}:${run}`, from.rx, from.ry), candidates = [];
    for (let dy = -SKY_SUMMIT.radius; dy <= SKY_SUMMIT.radius; dy++) for (let dx = -SKY_SUMMIT.radius; dx <= SKY_SUMMIT.radius; dx++) {
      const rx = target.rx + dx, ry = target.ry + dy;
      if ((rx === from.rx && ry === from.ry) || this.save.atlas?.[`${rx},${ry}`] || canopyGateDestination(this.save.seed, rx, ry) !== "cloud" || !wonderAt(this.save.seed, rx, ry, "tree")) continue;
      candidates.push({ rx, ry, distance: dx * dx + dy * dy });
    }
    candidates.sort((a, b) => a.distance - b.distance || a.ry - b.ry || a.rx - b.rx);
    for (const to of candidates.slice(0, SKY_SUMMIT.loads)) {
      const copy = structuredClone(this.save);
      Object.assign(copy.session, { area: "overworld", rx: to.rx, ry: to.ry, x: 16, y: 16, activeDungeonId: null, activeDungeonLevelId: null });
      const probe = new Game(copy, this.lastUpdateNow || 0), landing = skySummitLanding(probe.map);
      if (landing) return { v: 1, from, to: { rx: to.rx, ry: to.ry }, ...landing, atlas: structuredClone(copy.atlas[`${to.rx},${to.ry}`]) };
    }
    return null;
  }
  finishSkySummit(route) {
    // Rebuild with the current world's pins before touching the live map, save or snapshots.
    // An admitted record is a plan, never authority to place the Wayfarer on unchecked ground.
    const origin = this.save.session.dungeonReturn;
    if (!validSkySummitRoute(route) || !origin || route.from.rx !== origin.rx || route.from.ry !== origin.ry) return this.retreatSkySummit();
    const key = `${route.to.rx},${route.to.ry}`, pins = this.save.atlas?.[key] || route.atlas;
    if (pins.skySummitVersion !== 1) return this.retreatSkySummit();
    const copy = structuredClone(this.save);
    (copy.atlas ||= {})[key] = structuredClone(pins);
    Object.assign(copy.session, { area: "overworld", rx: route.to.rx, ry: route.to.ry, x: 16, y: 16, activeDungeonId: null, activeDungeonLevelId: null });
    const probe = new Game(copy, this.lastUpdateNow || 0), landing = skySummitLanding(probe.map);
    if (!landing || landing.gateId !== route.gateId) return this.retreatSkySummit();
    this.snapshotArea();
    const fresh = !this.save.atlas[key];
    this.save.atlas[key] ||= structuredClone(pins);
    if (fresh) { noteDiscovery(this.save); noteSeasonDiscovery(this.save, sectionRegion(this.save.seed, route.to.rx, route.to.ry, pins.landscapeVersion).id); }
    this.rx = route.to.rx; this.ry = route.to.ry;
    this.save.session.activeDungeonId = null; this.save.session.activeDungeonLevelId = null;
    this.loadArea("overworld", false);
    Object.assign(this.player, { x: landing.x, y: landing.y });
    Object.assign(this, { skyAir: null, skyLevel: 0, discAir: null, projectiles: [], effects: [], traversal: null });
    this.lastCrownAt = this.lastUpdateNow || 0;
    this.message = "The cloud gate opens among the leaves of another great tree. A door of cloud waits on its crown.";
    this.sync(); return { ok: true, message: this.message };
  }
  retreatSkySummit() {
    const ok = this.leaveDungeon("The far crown has faded from the cloud. The door returns you to where you climbed.");
    if (ok) {
      const landing = skySummitLanding(this.map);
      if (landing) Object.assign(this.player, { x: landing.x, y: landing.y });
      else relocateIfStranded(this.player, this.map, mapWidth(this.map, "overworld"));
      Object.assign(this, { skyAir: null, skyLevel: 0, discAir: null });
      this.lastCrownAt = landing ? this.lastUpdateNow || 0 : 0;
      this.sync();
    }
    return { ok: !!ok, message: this.message };
  }
  treeCrownHop(id, from) {
    const seed = this.save.seed, target = skylandHop(id, from.rx, from.ry), cands = [], annex = skyAnnexFloor(id) === 3; // release 678
    const R = annex ? SKY_TREE.annexSearch : SKY_TREE.search; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = target.rx + dx, y = target.ry + dy;
      if (x === from.rx && y === from.ry) continue;
      const seen = this.save.atlas?.[`${x},${y}`], version = seen?.landscapeVersion || LANDSCAPE_VERSION; if (seen && !seen.landscapeVersion) continue;
      if (annex && seen) continue; // the annex lets you down only on a tree you have never found
      if (version >= 14 ? !wonderAt(seed, x, y, "tree") : version < 12 || sectionRegion(seed, x, y, version).type !== "jungle" || (hashSeed(`${seed}:canopy-grow:v1:${y * 7919 + x}`) % 1000) / 1000 >= SKY_TREE.chance) continue; // 678: version 14 ground by its own rules (wonders.ts)
      cands.push({ rx: x, ry: y, seen: !!seen, d: Math.hypot(x - target.rx, y - target.ry) });
    }
    cands.sort((a, b) => (a.seen - b.seen) || a.d - b.d);
    for (const c of cands.slice(0, annex ? SKY_TREE.annexLoads : SKY_TREE.loads)) {
      this.rx = c.rx; this.ry = c.ry; this.loadArea("overworld", false); const cn = this.map.canopy; if (!cn?.top) continue;
      const crown = this.map.tiles.filter((t) => t.kind === "canopyTrunk" && t.elev === cn.top); if (!crown.length) continue;
      const mid = crown.reduce((a, t) => a + t.x, 0) / crown.length, my = crown.reduce((a, t) => a + t.y, 0) / crown.length, spot = crown.sort((a, b) => Math.hypot(a.x - mid, a.y - my) - Math.hypot(b.x - mid, b.y - my))[0];
      this.player.x = spot.x; this.player.y = spot.y - .2; this.lastCrownAt = this.lastUpdateNow || 0; return true;
    }
    this.rx = from.rx; this.ry = from.ry; return false;
  }
  // Release 589 (skylands.ts skylandHop): a sky gate drops the Wayfarer onto ground far off. A section all sea is passed over.
  skyHop(id, message) {
    this.snapshotArea(); const from = { rx: this.rx, ry: this.ry };
    if (this.treeCrownHop(id, from)) { Object.assign(this, { skyAir: null, skyLevel: 0, discAir: null, projectiles: [], effects: [], traversal: null }); this.message = `${message} You come down through the leaves onto the crown of a great tree.`; this.sync(); return true; }
    for (let k = 0; k < 6; k++) {
      const to = skylandHop(k ? `${id}:${k}` : id, from.rx, from.ry); this.rx = to.rx; this.ry = to.ry; this.loadArea("overworld", false);
      this.player.x = 16; this.player.y = 16; relocateIfStranded(this.player, this.map, mapWidth(this.map, "overworld"));
      if (!isMarineTile(this.map.tiles?.[Math.floor(this.player.y) * 32 + Math.floor(this.player.x)])) break;
    }
    Object.assign(this, { skyAir: null, skyLevel: 0, discAir: null, projectiles: [], effects: [], traversal: null }); this.message = message; this.sync(); return true;
  }
  // A section description for choosing a retreat's home (world-beasts.ts beginRetreat): generated only when a home needs it.
  retreatProbe() { const seed = this.save.seed, gen = this.save.worldGeneration; return (x, y) => { let g = null; const region = () => (g ||= generateRegion(seed, x, y, gen)); return { get biome() { return biomeFor(seed, x, y); }, get dominant() { return region().dominant; }, get canyon() { return region().environment?.kind === "canyon"; }, get dungeon() { return (region().objects || []).some((o) => o.kind === "dungeon"); }, get forest() { return sectionRegion(seed, x, y, BEAST_FOREST.regions).type === "forest"; }, get firelands() { return BEAST_FOREST.fire.includes(sectionRegion(seed, x, y, BEAST_FOREST.regions).type); } }; }; } // release 241; 609: shared with replanRetreat; 705: the deep woods
  startDisplacement(o,hidden=false){
    const key=`displacement-trigger:${this.rx},${this.ry}:${o.id}`;if(this.save.worldFlags[key])return false;this.save.worldFlags[key]=true;o.state='used';o.consumed=true;
    const h=hashSeed(this.save.seed+":displacement:"+this.rx+":"+this.ry+":"+o.id),distance=8+h%7,sign=h&1?1:-1,destination={rx:this.rx+(h&2?distance:Math.floor(distance/2))*sign,ry:this.ry+(h&2?Math.floor(distance/2):distance)*(h&4?1:-1)};
    this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDisplacement={id:"displacement:"+this.rx+":"+this.ry+":"+o.id,source:{...this.save.session.dungeonReturn},destination,hidden};this.save.session.activeDungeonId=this.save.session.activeDisplacement.id;const history=dungeonHistory(this.save,this.save.session.activeDungeonId);history.visits++;history.visitOpen=true;
    if(hidden){recordRevelationLead(this.save,'displacement',o.id);journalOnce(this.save,`hidden-displacement:${o.id}`,'A concealed Folded Seam displaced you only after you crossed fully inside a shelter. Triggered seams keep a faint scar; untouched shelters reveal nothing.','Shelter hazards');this.defeatNotice={title:'HIDDEN SEAM TRIGGERED',detail:'the shelter folds into an unknown crossing',kind:'discovery'}}
    this.loadArea("dungeon");this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;this.settleArrival();/* release 439 */this.message=hidden?'The floor opens without warning. Space folds around you.':'The threshold folds the room into somewhere else.';this.sync();return true;
  }
  interact(action, objectId = null) {
    this.sync();
    // Release 641 (Tim: "if you're in open sea, you're swimming, I think you should be able to hit action and get the boat or deploy
    // the robot"): swimming in the open world with nothing nearby to use, Act brings your skiff to you, or else calls up the robot.
    if (!action && !objectId && this.area === "overworld" && this.swimming && !aboard(this.save)) { const r = this.callHelpAtSea(); if (r) return r; }
    const o = objectId
      ? this.map.objects.find(
          (q) =>
            q.id === objectId &&
            this.reachOf(q) < 1.5,
        )
      : (this.wayglassNear() || this.nearestObject()); // release 557: the Wayglass first
    // Wood (release 119): with nothing else to act on, Act at deep water's edge builds a skiff from wood.
    if (!o && !objectId) { const d = this.digAhead(); if (d) return d; } // release 225: Act facing a dungeon wall digs
    if (!o && !objectId && this.shoreWater()) return this.buildSkiffHere();
    // Release 263 (Tim: "if I go to the edge of the water and hit action, I should be building a boat and getting on that
    // boat and moving"): at the water's edge a tree or rock beside you no longer takes the press when a skiff can be built.
    if (o && !objectId && SHORE_PASSIVE.includes(o.kind) && this.shoreWater() && canBuildSkiff(this.save)) return this.buildSkiffHere();
    if (!o && !objectId && !action) { const r = this.actMount(); if (r) return r; } // release 748: call the mount, or get down
    if (!o)
      return {
        ok: false,
        message: (this.message = "Nothing nearby responds."),
      };
    if (this.rite && this.area === "overworld") { const why = riteExit(o, action || validActions(o, this.save)[0]); if (why) { this.message = why; return { ok: false, message: why, riteSealed: true }; } } // RITE_LOCKDOWN: no door, gate or fold off the rite's ground
    if (o.towerSeal && o.kind === "dungeon" && !towerUnsealed(this.save, o.towerSeal)) { this.message = towerSealText(o.roofHatch ? TOWER_SEAL.messages.hatch : TOWER_SEAL.messages.sealed, o.towerSeal); return { ok: false, message: this.message, sealed: true }; } // TOWER_SEAL: the central tower's ways in want its key (or its lever)
    if (o.kind === "towerLever") return this.pullTowerLever(o); // and the lever at the top of its climb
    if (!action && o.roofHatch && o.kind === "dungeon") action = "enter"; // roof report (2026-11-04): a roof hatch is a ladder down, taken at the first press like the ladder up to it (no crossing chooser)
    if (o.skyway && (o.disc ? this.skyLevel || 0 : elevationAt(this.map, mapWidth(this.map, this.area), this.player.x, this.player.y)) < (o.elev || 0)) return { ok: false, message: (this.message = "The skyway door hangs above you. Climb the floating platforms to reach it: jump from one to the next.") }; // release 585
    if (o.completionExit) {
      if (!dungeonHistory(this.save,this.areaId()).combatClear?.completed) return {ok:false,message:this.message='The return remains sealed while a required guardian lives.'};
      // Release 217: a linked dungeon's guardian's door (past its second level) opens at its other mouth.
      if (isDeepId(this.areaId())) return this.burnEmber(); // release 677: the Deep lets you go only for an ember
      const annexOut = this.annexOutward(); // release 675: the third floor lets you out somewhere else
      const linkId = this.save.session.activeDungeonId, link = this.map?.multiLevel ? linkedExit(this.save, linkId, this.save.session.dungeonReturn) : null;
      if (link) this.save.session.dungeonReturn = { rx: link.rx, ry: link.ry, x: link.x ?? 16, y: link.y ?? 16 };
      const result = this.leaveDungeon(link ? (link.mouth === 'b' ? "The guardian's door opens somewhere else entirely: another mouth of the same crossing, far from where you went in." : "The guardian's door leads back to the crossing's first mouth.") : 'The cleared expedition returns you safely to its entrance.');
      if (result && link?.mouth === 'b') { const m = this.map.objects.find((o) => o.linked && o.dungeonId === linkId); if (m) { this.player.x = m.x; this.player.y = m.y + 1; } }
      if (result) { relocateIfStranded(this.player,this.map,mapWidth(this.map,'overworld')); this.player.invulnerableUntil = (this.lastUpdateNow || 0) + 2000; if (annexOut) { this.message = `${DEEP_ANNEX.messages.out}: ${this.rx}, ${this.ry}.`; this.defeatNotice = { title: "THE ANNEX LETS YOU OUT", detail: `far from where you went in · ${this.rx}, ${this.ry}`, kind: "discovery" }; } this.sync(); }
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
      this.loadArea('dungeon');this.player.x=this.map.entry?.x??4;this.player.y=this.map.entry?.y??5;relocateIfStranded(this.player,this.map,mapWidth(this.map,'dungeon'));this.settleArrival();/* release 419 */this.message=run.listener?'The Listener waits somewhere below.':o.kind==='silentMouth'?'The line pulls you under. The Listener is not here: this Mouth is spent.':this.save.farArray.quiet?`The line pulls you under. The Listener is not here. ${quietMouthNote(this.save)}`:`The line pulls you under. Gate ${run.gate}: ${this.save.farArray.toNext||0}/${piecesToUnlock(run.gate)} pieces (a Listener felled, or a Gate Revenant horde broken, locks one). This run's guardian waits on its deepest floor. ${LISTENER_CYCLE.sealsCall?`Seals of the Listener's call: ${this.save.farArray.pieces}/${piecesNeeded(run.gate)}; fell the guardian to break one. `:""}${(this.save.farArray.listeners||0)>=1?"The Listener waits beyond the Listener's Dais beside the Mouth, not in these runs.":"The Listener waits in the next run."}`;this.message+=this.levelWays();this.sync();return{ok:true,message:this.message};/* release 659: say what the run holds and where the Listener is */
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
    if (o.kind === "divineWreck") return this.pullViscera(o); // Canyon craters
    if (o.kind === "saplingDais") return this.beginRite(o); // the Rite of Ascendancy
    if (o.kind === "visceraBloom") return this.gatherBloom(o);
    if (o.kind === "riteAshes") return this.riseFromAshes(o);
    if (o.kind === "annexStair") return this.descendAnnex(o); // release 675
    if (o.kind === "buildingStair") return this.takeBuildingStair(o); // great buildings
    if (o.kind === "pentShortcut") return this.pentagonShortcut(o); // the Pentagon's shortcut links (v6)
    if (o.kind === "pentFinaleWall") return this.pentagonFinaleWalk(o); // the finale's opened wall, either side
    if (o.kind === "pentDais") return this.pentagonDais(o, action); // and its dais: Transit, and its rerolls
    if (o.kind === "pentArenaGate") return this.pentagonArenaGate(o); // the Stillworks' gates (pentagon-arena.ts)
    if (o.kind === "labKey") return this.takeLabKey(o); // a labyrinth's key
    if (o.kind === "labGate") return this.roomMazeGate(o); // a room maze's barred door
    if (o.kind === "pentRubble") { const m = (this.save.materials ||= {}); m.stone = Math.max(Number(m.stone) || 0, 10); setBuildKind(this.save, "stone"); this.message = `${PENTAGON.messages.rubble}: you have ${m.stone} stone, and a block is ready to build.`; this.sync(); return { ok: true, message: this.message }; } // enough for a block on the plate
    if (o.kind === "pentRelic") { const H = dungeonHistory(this.save, `${this.map.building.base}:f1`); H.pentRelics = [...new Set([...(H.pentRelics || []), o.relic])]; o.state = "read"; this.message = `${o.lore} (${PENTAGON.messages.relic}: ${H.pentRelics.length} of ${PENTAGON.relics.length + (this.map.building.V >= 5 ? PENTAGON.sealedRelics.length : 0)})`; journalOnce(this.save, `pentagon-relic:${this.map.building.base}:${o.relic}`, o.lore, PENTAGON.name); this.sync(); return { ok: true, message: this.message }; }
    if (o.kind === "pentWaysign") return this.readPentagonSigil(o); // a Pentagon sigil on the ground (PENTAGON_FINDING)
    if (o.kind === "pentMural") { const r = readPentagonMural(this.save, o); this.message = r.message; if (r.first) journalOnce(this.save, `pentagon-mural:${o.muralId}`, r.text, PENTAGON_HALLS.names.journal); this.sync(); return r; } // release 795: a grand hall's mural: its title and caption, journalled once
    if (o.kind === "pentInscription") { const r = readPentagonInscription(this.save, o); this.message = r.message; if (r.first) { journalOnce(this.save, `pentagon-inscription:${o.inscription}`, r.text, PENTAGON_LORE.title); this.glimpseCue = "pentagon"; } this.sync(); return r; } // the marks in a wall: read, remembered, never counted
    if (o.kind === "pentLever") { if (o.state === "pulled") return { ok: false, message: (this.message = "The lever is already down.") }; const H = dungeonHistory(this.save, `${o.pentBase}:f1`); H.pentLevers = [...new Set([...(H.pentLevers || []), o.lever])]; Object.assign(o, { state: "pulled", actions: [] }); const n = H.pentLevers.length; this.message = n >= PENTAGON.levers ? PENTAGON.messages.leversDone : `${PENTAGON.messages.lever} (${n} of ${PENTAGON.levers}).`; this.defeatNotice = { title: n >= PENTAGON.levers ? "THE GREAT DOORS OPEN" : "A LEVER PULLED", detail: `${n} of ${PENTAGON.levers}`, kind: "discovery" }; this.sync(); return { ok: true, message: this.message }; } // the Pentagon's levers (v2)
    if (o.kind === "pentSigil") { const H = dungeonHistory(this.save, `${this.map.building.base}:f1`); H.pentSigil = true; this.map.objects = this.map.objects.filter((q) => q !== o); for (const q of this.map.objects) if (q.sigil) q.unsealed = true; this.message = PENTAGON.messages.seal; this.defeatNotice = { title: "THE FIVEFOLD SEAL", detail: "every sigil door opens to it", kind: "discovery" }; journalOnce(this.save, `pentagon-seal:${this.map.building.base}`, PENTAGON.messages.seal, PENTAGON.name); this.sync(); return { ok: true, message: this.message }; }
    if (o.sigil && (o.pentagonDoor || o.kind === "exit")) { const r = this.pentagonSigilDoor(o, o.pentBase || this.map?.building?.base); if (r) return r; } // a sigil door, outside or in
    if (o.pentagonDoor && o.barred && !(dungeonHistory(this.save, `${o.pentBase}:f1`).labOpen || []).includes(o.shortcutKey)) { this.message = PENTAGON.shortcuts.exterior.barred; return { ok: false, message: this.message }; } // v6: an exterior shortcut door, bolted from within
    if (o.kind === "exit" && o.shortcutOpens && this.map?.building?.pentagon) { const H = dungeonHistory(this.save, `${this.map.building.base}:f1`); if (!(H.labOpen || []).includes(o.shortcutOpens)) { H.labOpen = [...new Set([...(H.labOpen || []), o.shortcutOpens])]; journalOnce(this.save, `pentagon-shortcut:${this.map.building.base}:${o.shortcutOpens}`, PENTAGON.shortcuts.exterior.opens, PENTAGON.name); this.pentShortcutOpened = { message: PENTAGON.shortcuts.exterior.opens, door: o.shortcutOpens }; } } // v6: drawn from inside, it stays open
    if (o.kind === "exit" && o.gate === "levers" && this.map?.building) { const n = (dungeonHistory(this.save, `${this.map.building.base}:f1`).pentLevers || []).length; if (n < PENTAGON.levers) { this.message = `${PENTAGON.messages.gate}: ${n} of ${PENTAGON.levers}.`; return { ok: false, message: this.message }; } } // the inner ring's great doors
    if (o.pentSeal === "trials") { const base = o.dungeonId.replace(/:f\d+$/, ""), H = dungeonHistory(this.save, `${base}:f1`), done = (H.pentTrials || []).length, need = PENTAGON.trials; if (done < need) { this.message = `${PENTAGON.messages.sealed}: ${need - done} of ${need}.`; return { ok: false, message: this.message }; } } // the Heart opens when three trials are done
    if (o.kind === "exit" && o.lock && this.map?.building && !(dungeonHistory(this.save, `${this.map.building.base}:f1`).labKeys || []).includes(o.lock)) { this.message = `Sealed. It wants the ${o.lockName}.`; return { ok: false, message: this.message }; } // a key-sealed door out
    if (o.kind === "exit" && this.map?.building?.compound && !dungeonHistory(this.save, `${this.map.building.base}:f1`).buildingDoors?.exits?.[o.id] && dungeonHistory(this.save, `${this.map.building.base}:f1`).buildingDoors) { this.message = "This door is rubbled shut from outside."; return { ok: false, message: this.message }; } // a wing whose door could not open onto the land
    if (o.kind === "exit" && this.map?.building?.exitsTo?.[o.id]) { this.save.session.dungeonReturn = { ...this.map.building.exitsTo[o.id] }; } // a castle's doors let you out in their own section
    else if (o.kind === "exit" && this.map?.building) { const D = dungeonHistory(this.save, `${this.map.building.base}:f1`).buildingDoors, at = D && (D.exits?.[o.id] || (o.id === "building-breach" ? D.breach || D.front : D.front)); if (at) this.save.session.dungeonReturn = { rx: D.rx, ry: D.ry, x: at.x, y: at.y }; } // out by the door you take
    if (o.kind === "deepShaft") return this.enterDeep(o, action); // release 677
    if (o.kind === "deepStair") return this.descendDeep(o);
    if (o.kind === "emberDoor") return this.burnEmber();
    if(o.kind==="deepTransition"){
      const progress=deepDungeonProgress(this.save,this.areaId());this.snapshotArea();this.save.session.activeDungeonLevelId=o.toLevelId;progress.currentLevelId=o.toLevelId;if(!progress.discoveredLevelIds.includes(o.toLevelId))progress.discoveredLevelIds.push(o.toLevelId);this.loadArea("dungeon",false);this.player.x=o.toX;this.player.y=o.toY;this.settleArrival();/* release 419 */this.projectiles=[];this.effects=[];this.message=`${this.map.levelName||o.toLevelId} reached.${this.levelWays()}`;this.sync();return{ok:true,message:this.message};
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
    if (o.kind === "tornPage") { const r = readTornPage(this.save, o); this.message = r.message; if (r.first) { journalOnce(this.save, `torn-page:${o.reading}`, `A torn page: "${r.text}…"`, "The Torn Pages"); if (r.done) journalOnce(this.save, "torn-page:book", PAGES_FINAL, "The Torn Pages"); } this.sync(); return r; } // release 595
    if (o.kind === "threadRelic") { const r = readThreadRelic(this.save, o); this.message = r.message; if (r.first) { journalOnce(this.save, `thread:${o.thread}:${o.index}`, r.text, r.title); if (r.done) { journalOnce(this.save, `thread:${o.thread}:end`, r.ending, r.title); (this.questNotices ||= []).push({ title: "QUEST COMPLETE", detail: `${r.title} · the thread is whole`, kind: "quest" }); } } this.sync(); return r; } // release 627
    if (o.kind === "visceraAltar" && action === "begin") return this.beginSkyChallenge(); // release 686
    if (o.kind === "crackedBell") { if (o.state === "rung") { this.message = `A rung bell. It hangs quiet, and a little warm.`; return { ok: true, message: this.message }; } const r = ringBell(this.save, o); this.message = r.message; if (r.first) { journalOnce(this.save, `bell:${o.bell}`, `A cracked bell rang for ${BELL_GLIMPSES[o.bell].who}. ${BELL_GLIMPSES[o.bell].lines.join(" ")}`, "The Seven Bells"); if (r.done) journalOnce(this.save, "bell:door", r.message.slice(r.message.indexOf("Seven figures")), "The Seven Bells"); } this.sync(); return r; } // release 431
    if (o.kind === "ilse") { const r = meetIlse(this.save, o); this.message = r.message; if (r.first) journalOnce(this.save, `ilse:${o.stage}`, `${o.name}: ${r.message}`, "Ilse, the Lamplighter"); return r; } // release 415
    if (o.kind === "warpDais") return this.useWarpDais(o); // release 301
    if (o.strange && (action || validActions(o, this.save)[0]) === "touch") { const r = touchStrange(this.save, o, this.rx, this.ry); this.message = r.message; if (r.ok) this.glimpseCue = "strange"; return r; }
    if ((action || validActions(o, this.save)[0]) === "enter" && entranceKind(o)) this.openEntrance(o); // release 319; 323: never sealed
    if (o.kind === "chest" && o.id === "building-cache" && o.state === "closed" && this.regentHoldsHoard()) { this.message = PENTAGON.messages.hoardHeld; return { ok: false, message: this.message }; } // release 735
    const chosen = action || validActions(o, this.save)[0],
      before = this.save.hp,
      r = applyInteraction(o, chosen, this.save, this.areaId(), this.area === "dungeon" ? { dungeonDepth: Math.max(0, (this.map?.multiLevel ? this.map.levels || [] : []).findIndex((q) => q.id === this.map.levelId)) } : {}); // release 287
    this.message = r.message;
    if (!r.ok) return r;
    if (r.transition === "supply" && o.state === "used" && chosen === "collect" && (o.kind === "supplyCache" || o.kind === "weaponCache")) this.stampCachePickupVisual(o.kind);
    if (r.ok && o.kind === "traveler" && chosen === "speak" && !o.reciter && !o.wanderer && !o.rumourTold && this.area === "overworld") { const heard = wonderRumour(this.save, this.rx, this.ry, o.id || o.name); if (heard) { o.rumourTold = true; this.message = `${r.message} ${heard}`; } } // release 674: a traveller who has heard of a wonder says which way it lies (once)
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
    } else if(r.transition==="skyland"){ // release 571: climb a Sky Stair
      const admission = skylandAdmission(this.save, r.tier);
      if (!admission.ok) return { ...admission, message: (this.message = admission.message) };
      const summit = r.canopy && this.save.atlas?.[`${this.rx},${this.ry}`]?.skySummitVersion === 1;
      const summitRoute = summit ? this.planSkySummit() : null;
      if (summit && !summitRoute) return { ok: false, message: (this.message = "The cloud beyond the door is still. No other crown answers this crossing yet.") };
      const b=beginSkyland(this.save,{rx:this.rx,ry:this.ry},r.tier,r.mode);/* 631: the canopy's door is always a cloud hold */if(!b.ok){this.message=b.message;return{ok:false,message:b.message}}
      if(b.gate){this.skyHop(b.id,b.message);return{ok:true,message:this.message}}/* release 589: a sky gate */
      this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDungeonId=b.id;this.save.session.activeDungeonLevelId=null;
      const h=dungeonHistory(this.save,b.id);h.gatePredatorSpawnThreshold=0;h.skyWave=0;h.visits++;h.visitOpen=true;if(isDivineRun(b.id)){if(visceraOf(this.save)>0)h.skyHold=true;else h.skyPact=takePact(this.save)}/* release 682: the pact goes with the Divine Challenge; 686: holding viscera, it waits on the Ascension Dais */
      if (summitRoute) h.skySummitRoute = summitRoute;
      this.loadArea('dungeon');this.player.x=this.map.entry?.x??18;this.player.y=(this.map.entry?.y??27)-1;relocateIfStranded(this.player,this.map,mapWidth(this.map,'dungeon'));this.settleArrival();this.message=b.message;this.sync();return{ok:true,message:b.message};
    } else if(r.transition==="displacement"){
      this.startDisplacement(o,false);
    } else if (r.transition === "dungeon") {
      this.save.session.dungeonReturn = {
        rx: this.rx,
        ry: this.ry,
        x: this.player.x,
        y: this.player.y,
      };
      if (o.kind === "canopyGate") o.dungeonId = `dungeon:${this.save.seed}:g${this.save.worldGeneration}:${this.rx}:${this.ry}:canopy`; // release 631: the Starfield crossing high in the tree
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
      if (o.enterAt === "breach" && this.map.building?.breachEntry) { this.player.x = this.map.building.breachEntry.x; this.player.y = this.map.building.breachEntry.y; } // a great building's broken back
      if (o.enterAt && o.enterAt !== "roof" && o.enterAt !== "breach" && this.map.building?.entries?.[o.enterAt]) { this.player.x = this.map.building.entries[o.enterAt].x; this.player.y = this.map.building.entries[o.enterAt].y; } // a compound's doors each open onto their own spot
      if (o.enterAt === "roof" && this.map.building?.roofLadder) { const at = buildingArrival(this.map, this.map.building.roofLadder.x, this.map.building.roofLadder.y); this.player.x = at.x; this.player.y = at.y; } // down through its roof hatch
      if (o.buildingDoors && this.map.building) dungeonHistory(this.save, `${this.map.building.base}:f1`).buildingDoors = { ...o.buildingDoors }; // where each of its ways out lets you out
      if (o.buildingDoors && this.map.building?.roomMaze && this.map.building.vault) addRoofExit(this.save, this.areaId(), this.map, dungeonHistory(this.save, this.areaId())); // ROOM_MAZES: the vault stands on the floor the door opens onto, laid before its door was recorded
      if (this.map.building) this.defeatNotice = { title: this.map.name.toUpperCase(), detail: this.map.building.roomMaze ? `${this.map.building.vaultLine || this.map.building.hint} · ${this.labyrinthProgress()}` : this.map.building.labyrinth ? `one way through, one real end · ${this.labyrinthProgress()}` : `${this.map.building.floors} floors · find the ladder up · mind the floor`, kind: "danger" };
      relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); this.settleArrival(); // release 419
      if (marginaliaOpen(this.save) && marginCrossing(this.areaId())) { beginMarginRun(this.save, this.areaId()); if (ensureMarginalia(this.save).found.length) this.marginPasteRequested = true; } // release 459
    } else if (r.transition === "exit") {
      if (this.map?.skyland) {
        const h = dungeonHistory(this.save, this.areaId());
        if (h.skyHop && "skySummitRoute" in h) {
          return this.finishSkySummit(h.skySummitRoute);
        }
      }
      if(this.save.session.activeDisplacement){if(!this.thresholdOpen()){this.message="The Mislaid Threshold remains sealed while its guardian lives. Its guardian is marked on the dungeon map.";return{ok:false,message:this.message}}const d=this.save.session.activeDisplacement;this.snapshotArea();this.rx=d.destination.rx;this.ry=d.destination.ry;this.save.session.displacementJourney={source:d.source,destination:d.destination};this.save.session.activeDisplacement=null;this.save.session.activeDungeonId=null;this.loadArea("overworld",false);this.player.x=16;this.player.y=16;relocateIfStranded(this.player,this.map,mapWidth(this.map,'overworld'));this.message="The completed crossing releases you onto stable ground in a distant, uncharted Corridor. Find a physical Wayglass to restore travel."}else if(this.map?.skyland&&dungeonHistory(this.save,this.areaId()).annexNext){this.climbAnnex(dungeonHistory(this.save,this.areaId()).annexNext)}/* release 678: up to the annex's next island */else if(this.map?.skyland&&dungeonHistory(this.save,this.areaId()).skyHop){const id=this.areaId();this.leaveDungeon("");this.skyHop(id,skyAnnexFloor(id)===3?SKY_ANNEX.messages.top:"The cloud gate lets go of you. You fall a long way, and land far off.")}/* release 589 */else { const sc = this.pentShortcutOpened; this.pentShortcutOpened = null; this.leaveDungeon(sc ? sc.message : "You emerge at the dungeon entrance."); if (sc) { const d = this.map.objects.find((q) => q.pentagonDoor && q.shortcutKey === sc.door); if (d) { d.opened = true; this.shortcutBurst = { x: d.x, y: d.y, t0: null, life: PENTAGON.shortcuts.burst }; } this.defeatNotice = { title: PENTAGON.shortcuts.notice, detail: "a door in the outer wall, open from the land now", kind: "discovery", sound: "shortcut" }; } }
    } else if (r.transition === "checkpoint") {
      this.save.session.displacementJourney=null;
      if (clearRot(this.save)) this.message += " Resting here clears the blight rot."; this.curseRested(); // release 737
      this.save.activeCheckpoint = {
        rx: this.rx,
        ry: this.ry,
        x: o.x,
        y: o.y,
        name: o.name,
      };
      this.save.checkpoints[this.rx + "," + this.ry] =
        this.save.activeCheckpoint;
    } else if (r.transition === "chest") {
      this.obtainDrop(o.rewardSource || "chest");
      const B = this.map?.building; // Tesseract glyphs (release 729): a labyrinth's vault, the Pentagon's reliquaries and the Regent's hoard
      if (B && o.id === "building-cache" && B.vault && B.labyrinth && !B.pentagon && B.style === TURTLE_SHELL.style) this.payShellVault(B); // the Shell-Labyrinth: a Tesseract glyph or Divine Viscera
      else if (B && o.id === "building-cache" && B.vault && B.labyrinth && !B.pentagon) this.awardTesseract(`${B.base}:vault`, "labyrinth");
      else if (B?.pentagon && B.V >= 3 && o.reliquary) this.awardTesseract(`${B.base}:reliquary:${B.node}`, "reliquary");
      else if (B?.pentagon && B.V >= 5 && o.sealedVault) this.awardTesseract(`${B.base}:sealed:${B.node}`, "sealed");
      else if (B?.pentagon && B.V >= 3 && B.vault && o.id === "building-cache") this.awardTesseract(`${B.base}:hoard`, dungeonHistory(this.save, `${B.base}:f1`).regentGrade || "regent");
      this.stampCachePickupVisual("chest");
    }
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
      if (b.mechSub && b.mechSubFrom) { Object.assign(b, { moored: b.mechSubFrom, aboard: false, mechSub: false }); delete b.mechSubFrom; } // release 621: the robot at sea boards a skiff: its voyage ends
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
    if (!drone && m.active && !m.empowered && (Number(this.save.materials?.cinderIron) || 0) >= MECH_POWER.burn) { this.message = setEmpowered(this.save, true).message; this.cancelConsumeVisual('form-change'); this.sync(); return true; } // release 383: robot → empowered → stowed
    if (m.active && !drone && this.wading() && !canSwim(this.save)) { this.message = "No footing here: wade the robot ashore before folding it away."; return false; } // release 639
    if (m.active) { if (m.empowered) setEmpowered(this.save, false); m.active = false; if(!drone)this.cancelConsumeVisual('form-change'); this.message = drone ? "The drone docks into its frame." : "The robot folds away."; this.sync(); return true; }
    if (!drone && m.cooldown > 0) { this.message = `The robot's plating is still knitting: ${Math.ceil(m.cooldown)}s.`; return false; }
    m.active = true; if(!drone)this.cancelConsumeVisual('form-change'); this.droneAt = null; this.message = drone ? "The drone lifts off beside you. It fires on what comes near; hold Jump in the air and it carries you." : "The robot unfolds around you. Hold Jump in the air to boost."; this.sync(); return true;
  }
  // Release 621 (Tim: "you should be able to switch to the power armor version while you're on the water"): at sea the robot
  // button toggles Empowered mode (the power armor) and back; the robot is never stowed at sea (that would drop you in).
  // Release 639 (Tim: "I can't exit the robot or I'm not sure how... I hit the robot button and it doesn't take me out"): at sea
  // the button goes round as it does ashore: robot → power armor (with cinder iron) → folded away, leaving you in your skiff,
  // which then sails with you (it is no longer moored where it was).
  toggleSeaPower() {
    this.cancelConsumeVisual('form-change');
    const m = this.save.mech, b = this.save.boat;
    if (!m.empowered && (Number(this.save.materials?.cinderIron) || 0) >= MECH_POWER.burn) { setEmpowered(this.save, true); this.message = "The power armor lifts clear of the water on its thrusters. Dodge to dive; the robot button again folds it away."; this.sync(); return true; }
    if (m.empowered) setEmpowered(this.save, false);
    m.active = false; b.mechSub = false; delete b.mechSubFrom; this.placeMooredSkiff(); this.subDiveUntil = 0;
    this.message = "The robot folds away and you are sitting in your skiff. Sail it ashore, or hold Act to step off."; this.sync(); return true;
  }
  callHelpAtSea() {
    const b = this.save.boat, p = this.player;
    if (b?.owned && b.hull > 0 && board(this.save, { x: p.x, y: p.y })) { b.mechSub = false; delete b.mechSubFrom; this.placeMooredSkiff(); this.map.objects = this.map.objects.filter((o) => o.id !== "skiff-moored"); Object.assign(p, { sailVx: 0, sailVy: 0 }); this.swimming = false; this.message = "You haul yourself into your skiff; it was never far."; this.sync(); return { ok: true, message: this.message }; }
    if (this.save.mech?.built && !this.save.mech.active && this.save.mech.mode !== "drone") { const ok = this.toggleMech(); return { ok, message: this.message }; }
    return null;
  }
  // Release 635: one frame of the glide. Returns "crossed" when it carried the Wayfarer into the next section.
  glideStep(x, y, dt, now) {
    const G = GLIDE, p = this.player, g = this.glide, width = mapWidth(this.map, this.area);
    // Tim (2026-11-05): by a great tree north is up the tree on screen, so inside its window (vehicle-gates.ts TREE_GLIDE.window) a
    // glide cannot go north: the stick's north and the glide's own northward way are dropped. Never while it is held skimming.
    const lockN = !(g.pinned && TREE_GLIDE.window.skimFree) && treeGlideWindowAt(this.map, p.x, p.y); if (lockN && y < 0) y = 0;
    const sp = g.open === false ? G.dropSpeed : G.speed; g.vx += (x * sp - g.vx) * Math.min(1, G.steer * dt); g.vy += (y * sp - g.vy) * Math.min(1, G.steer * dt); if (lockN && g.vy < 0) g.vy = 0;
    if (Math.abs(x) > .15 || Math.abs(y) > .15) p.facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : (y < 0 ? "up" : "down");
    // A blocked tile no higher than the blocked one the glide already holds over is no wall to it (it skims on across a roof or a field
    // of rock to the edge, instead of hanging there for ever, which also keeps the tree window's skimFree escape open).
    const over = tileUnder(this.map, width, p.x, p.y), base = over?.blocked && !DEEP_WATER.includes(over.kind) ? (over.elev || 0) : -Infinity;
    const tall = (px, py) => { const t = tileUnder(this.map, width, px, py); return !!t && t.blocked && !DEEP_WATER.includes(t.kind) && (t.elev || 0) >= g.z - .5 && (t.elev || 0) > base; }; // release 672: deep water never walls a glide in
    const z0 = g.z, rises = (px, py) => elevationAt(this.map, width, px, py) > z0 + 1e-6; // Tim (2026-11-05): a glide never climbs: ground higher than it is a wall to it
    let nx = p.x + g.vx * dt, ny = p.y + g.vy * dt;
    // Tim (2026-11-05): "You should die if you're on a glider and you try to go over the Pentagon... You can't glide onto its roof or
    // anything like that": a glide whose footprint reaches any tile of a Pentagon (vehicle-gates.ts GLIDER_FORBIDDEN) ends in death.
    if (gliderForbiddenAt(this.map, width, p.x, p.y) || gliderForbiddenAt(this.map, width, nx, ny)) return this.glideForbidden(nx, ny);
    if (tall(nx, p.y) || rises(nx, p.y)) { nx = p.x; g.vx = 0; } if (tall(nx, ny) || rises(nx, ny)) { ny = p.y; g.vy = 0; }
    // Tim (2026-11-05): the glider is held off a Great Castle's walls (DRONE_FIZZLE's other zone) at any height, as off a wall taller
    // than it. Not where the glide already overlaps one (no hold that could pin it in the air).
    if (!droneForbiddenAt(this.map, width, p.x, p.y)) {
      let held = droneForbiddenAt(this.map, width, nx, p.y); if (held) { nx = p.x; g.vx = 0; }
      const z2 = droneForbiddenAt(this.map, width, nx, ny); if (z2) { ny = p.y; g.vy = 0; held ||= z2; }
      if (held?.glide && g.held !== held.id) { g.held = held.id; this.message = held.glide; journalOnce(this.save, `glide-held:${held.id}`, held.glide, "The glider"); }
    }
    g.z -= (g.open === false ? G.drop : G.sink) * dt; p.invulnerableUntil = g.z > G.safe ? Math.max(p.invulnerableUntil || 0, now + 120) : p.invulnerableUntil;
    let out = nx < -.2 ? [-1, 0] : nx > SECTION_SIZE - .8 ? [1, 0] : ny < -.2 ? [0, -1] : ny > SECTION_SIZE - .9 ? [0, 1] : null;
    // A stretch of seam this glide was already turned back from (below) stays a wall to it: no section load each frame.
    const sh = g.seamHold; if (out && sh && sh.rx === this.rx && sh.ry === this.ry && sh.dx === out[0] && sh.dy === out[1] && Math.abs((out[0] ? ny : nx) - sh.at) < 1.5) { if (out[0]) { nx = p.x; g.vx = 0; } else { ny = p.y; g.vy = 0; } out = null; }
    if (out) { const keep = out[0] ? ny : nx, was = `${this.rx},${this.ry}`, from = { rx: this.rx, ry: this.ry, x: p.x, y: p.y }; this.transitionSection(out[0], out[1]); if (this.area === "overworld" && `${this.rx},${this.ry}` !== was) { if (out[0]) { p.y = Math.max(.3, Math.min(30.7, keep)); p.x = out[0] < 0 ? 30.6 : .3; } else { p.x = Math.max(.3, Math.min(30.7, keep)); p.y = out[1] < 0 ? 30.6 : .3; }
        // Over the seam the ground is higher than the glide: it cannot climb onto it, so it stays this side (a Pentagon there is death, next frame).
        if (this.glide && !gliderForbiddenAt(this.map, width, p.x, p.y) && elevationAt(this.map, width, p.x, p.y) > z0 + 1e-6) { const z = this.glide; this.returnFrom(from, G.noClimb); this.glide = z; if (out[0]) z.vx = 0; else z.vy = 0; z.seamHold = { rx: from.rx, ry: from.ry, dx: out[0], dy: out[1], at: keep }; } }
      return "crossed"; }
    p.x = nx; p.y = ny; p.walkPhase = 0;
    const ground = elevationAt(this.map, width, p.x, p.y), here = tileUnder(this.map, width, p.x, p.y);
    if (g.z > ground + .05) { if (g.pinned && g.z > ground + G.skim + .01) g.pinned = false; return "flying"; }
    // Release 641 (Tim: "if you glide out over open sea... if you don't have the Tidemantle, you're just going to die"): it comes down
    // on water, lava or ground alike (the ordinary hazards then apply); only a wall or anything blocked holds it up.
    const hazard = footprintHazard(this.map, width, p.x, p.y), sea = !!here && DEEP_WATER.includes(here.kind), fit = (sea || !here?.blocked) && (footprintOpen(this.map, width, p.x, p.y) || !!hazard || sea); // release 672: blocked deep water too (it held the glide over it for ever)
    if (!fit) { g.z = Math.max(g.z, Math.min(z0, ground + G.skim)); g.pinned = true; if (!g.told) { g.told = true; this.message = G.skimming; } return "flying"; } // held above, never lifted (Tim, 2026-11-05)
    const fell = g.open === false ? Math.max(0, (g.fallFrom ?? g.z) - ground) : 0; this.glide = null; this.skyAir = null;
    if (fell > 1) { const hurt = fallDamage(Math.round(fell), this.save.maxHp); if (hurt === Infinity) { p.hp = 0; this._fatalFallPending = true; this.message = `The Wayfarer falls ${Math.round(fell)} levels.`; } else if (hurt > 0) { p.hp = Math.max(1, p.hp - hurt); this.message = `A hard landing: ${Math.round(fell)} levels down.`; } }
    else this.message = G.land; return "landed";
  }
  // Tim (2026-11-05): a glide over a Pentagon ends in death, as a fall does: the Wayfarer comes down where the glide had carried
  // them (inside this section), the message and a journal line (once) say why, and the ordinary death and recovery follow.
  glideForbidden(nx, ny) {
    const p = this.player, F = GLIDER_FORBIDDEN;
    if (nx >= -.2 && nx <= SECTION_SIZE - .8 && ny >= -.2 && ny <= SECTION_SIZE - .9) { p.x = nx; p.y = ny; }
    this.glide = null; this.skyAir = null; p.hp = 0; this._fatalFallPending = true; this.message = F.message;
    journalOnce(this.save, F.journal, F.message, "The glider"); return "landed";
  }
  // TREE_GLIDE.home (Tim, 2026-11-05): a glide launched at the height of this section's great-tree crown remembers the tree (its
  // section and the crown spot a death wakes you on); a glide begun anywhere lower remembers nothing. Runtime, saved for exact resume.
  // Decision 13 (TREE_GLIDE.home.reached): only when the last ground stood on was this section's great crown (`crownFoot`).
  treeGlideHome(launch) {
    const c = this.area === "overworld" ? this.map?.canopy : null; if (!c?.top || !(Number(launch) >= c.top - TREE_GLIDE.home.crownWithin)) return null;
    if (TREE_GLIDE.home.reached && !(this.crownFoot && this.crownFoot.rx === this.rx && this.crownFoot.ry === this.ry)) return null;
    const s = crownSpot(this.map); return s ? { rx: this.rx, ry: this.ry, x: s.x, y: s.y } : null;
  }
  // The death after such a glide: the tree's section is loaded (wherever the glide had carried you) and the Wayfarer stands on its
  // crown. False (nothing placed) when that section has no crown to stand on; the caller then uses the active rest point.
  wakeOnCrown(home, now) {
    this.rx = home.rx; this.ry = home.ry; this.loadArea("overworld", false);
    const c = this.map?.canopy, w = mapWidth(this.map, this.area), t = c?.top ? this.map.tiles[Math.floor(home.y + .75) * w + Math.floor(home.x + .5)] : null;
    const s = t && t.kind === "canopyTrunk" && t.elev === c.top ? { x: home.x, y: home.y } : crownSpot(this.map); if (!s) return false;
    this.player.x = s.x; this.player.y = s.y; this.lastCrownAt = now; this.crownFoot = { rx: this.rx, ry: this.ry };
    if (TREE_GLIDE.home.setsRest) { const o = this.map.objects.find((q) => q.kind === "crownRest" && !q.keepRest); if (o) this.takeCrownRest(o); } // Decision 14: the crown's Crown Rest, as if touched
    return true;
  }
  // Release 647: one frame of the drone's booster (DRONE_LIFT). `droneLift` is { base, z, vz } in levels. While it lasts the jump
  // lasts, and `skyAir` is its height, so the move rules carry the Wayfarer over lower ground and onto ground no more than a level
  // above them. It ends on landing (or when the drone is stowed): the jump ends at once and the landing is settled by the ordinary
  // fall rule as a drop of v²/2g levels (fallDamage).
  droneLiftAllowed() { return this.area === "overworld" || (this.area === "dungeon" && interiorTerrain(this.map)); }
  // Lowest local roof over the footprint. Walls still stop moveAxis; this only
  // keeps an airborne body from travelling sideways through a descending roof.
  interiorLiftCeiling(x = this.player.x, y = this.player.y) {
    if (this.area !== "dungeon" || !interiorTerrain(this.map)) return Infinity;
    const map = this.map, w = mapWidth(map, this.area), H = INTERIOR_TRAVERSAL;
    let ceiling = Infinity;
    for (const [ox, oy] of [[.24, .5], [.76, .5], [.24, .88], [.76, .88], [.5, .75]]) {
      const X = x + ox, Y = y + oy, t = map.tiles[Math.floor(Y) * w + Math.floor(X)];
      if (!t || t.blocked) continue;
      const arch = interiorArchAt(map, X, Y);
      const openAir = map.hall?.open || t.openAir || t.open || t.courtyard || t.pentRoof || t.pentBalcony || t.kind === "yardGrass";
      if (openAir && !arch) continue;
      // Passage geometry creates arches even without a doorway marker, including
      // open-air courtyards. Their soffits remain solid below an otherwise open sky.
      const roof = arch || t.doorway ? Math.min(interiorCeilingHeight(map), H.archClearance) : interiorCeilingHeight(map);
      ceiling = Math.min(ceiling, interiorSurfaceLevel(map, X, Y) + (roof - H.bodyClearance - H.ceilingPad) / LIFT_PER_LEVEL);
    }
    return ceiling;
  }
  validInteriorLift(q) {
    if (this.area !== "dungeon" || !interiorTerrain(this.map) || !q || q.area !== "dungeon"
      || q.areaId !== this.areaId() || q.levelId !== String(this.map.levelId || "root") || !this.droneUp()) return false;
    if (!["base", "z", "vz"].every(k => Number.isFinite(q[k]))
      || !footprintOpen(this.map, mapWidth(this.map, this.area), this.player.x, this.player.y, true)) return false;
    const ground = this.elevationHere(this.player.x, this.player.y), ceiling = this.interiorLiftCeiling();
    // Player-built stacks may stand above generated level five.
    const maxBase = this.map.tiles.reduce((n, t) => Math.max(n, Number(t?.elev) || 0), INTERIOR_TRAVERSAL.maxLevel);
    return q.base >= 0 && q.base <= maxBase && q.z >= ground - 1e-6 && q.z <= q.base + DRONE_LIFT.max + 1e-6
      && q.z <= ceiling + 1e-6 && q.vz <= DRONE_LIFT.rise && Math.abs(q.vz) <= 100;
  }
  restoreDroneLift(q, now) {
    this.droneLift = null;
    if (!q || !this.droneLiftAllowed() || !["base", "z", "vz"].every(k => Number.isFinite(Number(q[k])))) return false;
    const { area: _area, areaId: _areaId, levelId: _levelId, ...metadata } = q;
    const lift = { ...metadata, base: Number(q.base), z: Number(q.z), vz: Number(q.vz) };
    if (this.area === "dungeon") {
      if (!this.validInteriorLift(q)) return false;
      this.skyAir = lift.z;
      if (!(this.jumpUntil > now)) this.jumpUntil = now + 140;
    } else if (q.area === "dungeon") return false;
    this.droneLift = lift;
    return true;
  }
  droneLiftStep(dt, now, held) {
    const L = this.droneLift, D = DRONE_LIFT, m = this.save.mech, p = this.player;
    if (!this.droneLiftAllowed() || !this.droneUp() || !m) { this.endDroneLift(now); return; }
    const ground = elevationAt(this.map, mapWidth(this.map, this.area), p.x, p.y), top = Math.min(L.base + D.max, this.interiorLiftCeiling()), thrust = held && !this.mechSpent && m.fuel > 0;
    if (thrust) { m.fuel = Math.max(0, m.fuel - D.burn * dt); this.mechBoosting = true; if (m.fuel <= 0) { this.mechSpent = true; this.message = D.empty; } }
    L.vz = Math.min(D.rise, L.vz + ((thrust ? D.thrust : 0) - D.gravity) * dt); L.z += L.vz * dt;
    if (L.z >= top) { L.z = top; if (thrust || interiorTerrain(this.map)) L.vz = Math.min(0, L.vz); } // the top: it hovers there while Jump is held
    if (L.z <= ground) { if (L.vz < 0 && !thrust) { this.endDroneLift(now, ground); return; } L.z = ground; L.vz = Math.max(0, L.vz); }
    this.jumpUntil = Math.max(this.jumpUntil || 0, now + 140); this.skyAir = this.area === "dungeon" ? L.z : Math.floor(L.z + 1e-6);
  }
  endDroneLift(now, ground = null) {
    const L = this.droneLift; this.droneLift = null; if (!L) return;
    const g = ground ?? elevationAt(this.map, mapWidth(this.map, this.area), this.player.x, this.player.y), v = Math.min(0, L.vz), drop = v * v / (2 * DRONE_LIFT.gravity) + Math.max(0, L.z - g);
    this.skyAir = g + Math.floor(drop + 1e-6); this.jumpUntil = Math.min(this.jumpUntil || 0, now); this.liftDrop = true; // release 669: the landing it leads to is a fall, never a freefall
  }
  // The drone fizzle (Tim, 2026-11-04; vehicle-gates.ts DRONE_FIZZLE): a booster lift that crosses into the airspace of a closed
  // block a structure's route runs through (the Pentagon's walls, a Great Castle's wings and walls) fails there. Sparks and a burst
  // show on the drone (`droneFizzleFx`, drawn by renderer.ts for DRONE_FIZZLE.burst s), the zone's message says why, the drone is
  // stowed and the lift ends as when its fuel runs dry: the ordinary fall rule settles the landing (fallDamage; 4+ levels kill).
  droneFizzle(zone, now) {
    const L = this.droneLift, p = this.player, m = this.save.mech; if (!L) return false;
    const ground = elevationAt(this.map, mapWidth(this.map, this.area), p.x, p.y);
    this.droneFizzleFx = { x: p.x, y: p.y, levels: Math.max(0, L.z - ground), at: now, until: now + DRONE_FIZZLE.burst * 1000, zone: zone.id };
    this.endDroneLift(now, ground); this.mechBoosting = false; this.mechSpent = true;
    if (m) m.active = false; this.droneAt = null;
    this.message = zone.message; journalOnce(this.save, `drone-fizzle:${zone.id}`, zone.message, "The drone"); return true;
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
    const shot=this.projectiles[this.projectiles.length-1],support=interiorSurfaceHeight(this.map,p.x+.5,p.y+.75);
    const lift=jumpLift(this,now)+(this.droneLift&&interiorTerrain(this.map)?Math.max(0,this.droneLift.z-interiorSurfaceLevel(this.map,p.x+.5,p.y+.75))*LIFT_PER_LEVEL:0);
    const anchor=playerDroneVisualAnchor(p,d,{carrying:!!carry,lift,support,now,quiet:!!(this.presentation?.reduceMotion||this.presentation?.safeMode)});
    const visualLaunch=projectileLaunchMetadata(shot,anchor?.muzzle,interiorSurfaceHeight(this.map,shot.x,shot.y));
    if(visualLaunch)shot.visualLaunch=visualLaunch; // serializable visual offset only; every simulation field above is unchanged
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
    const p = this.player, home = this.area === "overworld" ? this.glideHome : null; this.glideHome = null; // TREE_GLIDE.home: read before the carried states clear
    // Release 423 (Tim: "the world bosses... keep their health when you die... it only resets after they die"): a living beast's
    // wounds are kept, as a share of its health, on its hunt record; it comes back that hurt (BEAST_KEEPS_WOUNDS).
    for (const e of this.enemies) if (!e.dead && e.maxHp > 0 && (e.worldBeast || e.questingBeast)) { const q = e.worldBeast ? this.save.worldBeasts?.[e.worldBeast]?.active : this.save.questingBeast?.active; if (q) q.hpShare = Math.max(.01, Math.min(1, e.hp / e.maxHp)); }
    const beastNote = this.area === "overworld" ? questingBeastPlayerFell(this.save, this.rx, this.ry, this.enemies.some((e) => e.questingBeast && !e.dead)) : null;
    if (beastNote) journalOnce(this.save, `questing-beast-try:${this.save.questingBeast.cycle}:${this.save.questingBeast.active?.tries ?? "gone"}`, beastNote, "The Questing Beast");
    if (this.dragonHere() && this.dragonClock().casts >= DRAGON.colonize.casts) { const q = this.save.worldBeasts.crimsonTyrant; q.active = null; q.escaped++; q.cycle++; q.cooldown = WORLD_BEASTS.crimsonTyrant.cooldownEscaped; journalOnce(this.save, `crimson-claimed:${this.rx},${this.ry}`, WORLD_BEASTS.crimsonTyrant.claimed, "World beasts"); this.message = WORLD_BEASTS.crimsonTyrant.claimed; } // release 709: fall on its claimed ground and it is done with you
    const worldNote = this.area === "overworld" || this.area === "dungeon" ? worldBeastPlayerFell(this.save, this.rx, this.ry, this.enemies.filter((e) => e.worldBeast && !e.dead).map((e) => e.worldBeast), this.area === "dungeon" ? this.areaId() : null, this.beastTries === false) : null; // release 235
    if (worldNote) journalOnce(this.save, `world-beast-try:${this.rx},${this.ry}:${JSON.stringify(this.save.worldBeasts)}`.slice(0, 160), worldNote, "World beasts");
    // Gate predators have no rematches: a player death ends their hunt, without rewards.
    for (const e of this.enemies) if (e.gatePredator && !e.dead) { e.dead = true; e.noRewards = true; resetGateAttack(e, true); }
    if (this.area === "dungeon" && this.map?.pentArena) this.resetPentagonArena(); // the Stillworks: a death resets the fight (pentagon-arena.ts)
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
    stopRide(this.save); // release 748: death gets you down; the mount stays stabled with its time
    this.captureLastDeath(fellIntoHazard?terrainHazard:this.save.session.holeDeath?"fall":"combat");
    const walk = this.area === "dungeon" && !!this.map?.pentFinale; // the Pentagon's finale: a fall from the walkway wakes you at its start (PENTAGON.finale)
    const hd = this.save.session.holeDeath; this.save.session.holeDeath = null;
    const hole = !walk && this.area === "dungeon" && this.map?.building && hd && hd.id === this.areaId() ? hd : null; // HOLE_DROPS: a fatal hole wakes you on that floor, where you came onto it
    if (this.area === "dungeon" && !walk && !hole) {if(String(this.save.session.activeDungeonId||'').startsWith('hunt-instance:'))abandonHuntInstance(this.save,this.save.session.activeDungeonId);abandonDungeon(this.save, this.areaId());}
    const c = this.safeCheckpoint(); // release 734 (F2): a null active checkpoint threw here on every frame
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
      p.castUntil =
      p.attackUntil =
      p.meleeUntil =
        0;
    p.meleeStrike = null;
    p.attackVisual = null;
    p.castVisual = null;
    p.primaryCombo = null; p.actionVisualUntil = 0; p.primaryVisualUntil = 0; p.fistVisualUntil = 0;
    this.jumpUntil = 0;
    this.projectiles = [];
    this.effects = [];
    this.eliteHazards=[];this.packEffects=[];Object.assign(eliteStateInPlace(this.save).status,{poison:0,poisonTick:0,stun:0,stunGuard:2});this.playerFire=null;this.frenzy=null;/* release 709: burning ends here too; 710: and the frenzy */ this.clearCarriedStates(); // release 736 (review F4): a grip, slow, confusion or stun, a glide or a swim never outlive a death
    input.reset?.();
    if (hole) { p.x = hole.x; p.y = hole.y; relocateIfStranded(p, this.map, mapWidth(this.map, "dungeon")); p.invulnerableUntil = now + 2000; this.fallen = null; for (const e of this.enemies) if (!e.dead) e.aggro = false; this.snapshotArea(); this.message = `${HOLE_DROPS.messages.woke}${before < 2 ? " Restorative draughts replenished to 2." : ""}`; this.sync(); return; } // the same floor; nothing lost (release 345)
    if (walk) { const e = this.map.entry || { x: 1, y: 7 }; p.x = e.x; p.y = e.y; p.invulnerableUntil = now + 2000; this.fallen = null; this.snapshotArea(); this.message = `${PENTAGON.finale.messages.fell}${before < 2 ? " Restorative draughts replenished to 2." : ""}`; return; } // the same floor, at the walkway's start, beside the doorway back
    this.snapshotArea(); // Capture the source coordinates BEFORE switching to the checkpoint.
    const crown = !!home && this.wakeOnCrown(home, now); // TREE_GLIDE.home: a glide from a great tree's crown wakes you back on that crown
    if (!crown) {
    this.rx = c.rx;
    this.ry = c.ry;
    this.loadArea("overworld", false);
    p.x = c.x;
    p.y = c.y;
    }
    p.invulnerableUntil = now + 2000;
    this.message = `${fellIntoHazard?(terrainHazard==="canyon"?"Lost to the canyon":"Lost beneath the water"):"Felled"} — ${crown ? TREE_GLIDE.home.wake : `recovered at ${c.name || "checkpoint"}`}. No items, marks, equipment, or XP were lost${woodLost ? `, but the ${woodLost} wood you carried is gone` : ""}. You are protected briefly.${crown && TREE_GLIDE.home.setsRest ? TREE_GLIDE.home.rest : ""}${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
    if (beastNote) this.message = `${beastNote} ${this.message}`;

  }
  // Release 329: the pause after a world beast fells the Wayfarer. No control; beasts wander near where they stood.
  tickFallen(dt, input, now) {
    for (const action of ["tool", "spell", "spell2", "dodge", "jump", "potion", "attack", "interact", "build", "preset"]) input.consume?.(action);
    const width = mapWidth(this.map, this.area);
    for (const e of this.enemies) {
      if (e.dead || !(e.worldBeast || e.questingBeast || (this.fallen.live && e.stalker))) continue;
      if (e.loomTo) { const dx = e.loomTo.x - e.x, dy = e.loomTo.y - e.y, d = Math.hypot(dx, dy), sp = DEATH_LOOM.approach * dt; // Viewport Closed: closing in over the corpse
        if (d > .05) { const nx = d <= sp ? e.loomTo.x : e.x + dx / d * sp, ny = d <= sp ? e.loomTo.y : e.y + dy / d * sp; if (this.map.tiles[Math.floor(ny) * width + Math.floor(nx)]?.blocked) e.loomTo = null; else { e.x = nx; e.y = ny; e.facing = dx >= 0 ? "right" : "left"; e.walkPhase = (e.walkPhase || 0) + dt * 6; e.aggro = false; continue; } }
        e.millHome = { x: e.x, y: e.y }; e.loomTo = null; }
      e.aggro = false; e.millTurn = (e.millTurn || 0) - dt;
      if (e.millTurn <= 0) { e.millAngle = Math.random() * Math.PI * 2; e.millTurn = 1.1 + Math.random() * 1.2; }
      const home = e.millHome || (e.millHome = { x: e.x, y: e.y }), sp = DEATH_PAUSE.millSpeed * dt;
      let nx = e.x + Math.cos(e.millAngle) * sp, ny = e.y + Math.sin(e.millAngle) * sp;
      if (Math.hypot(nx - home.x, ny - home.y) > DEATH_PAUSE.millRadius || this.map.tiles[Math.floor(ny) * width + Math.floor(nx)]?.blocked && !this.map.tiles[Math.floor(e.y) * width + Math.floor(e.x)]?.blocked) { e.millAngle += Math.PI; nx = e.x; ny = e.y; }
      e.x = nx; e.y = ny; e.facing = Math.cos(e.millAngle) >= 0 ? "right" : "left"; e.walkPhase = (e.walkPhase || 0) + dt * 6;
    }
    this.projectiles = this.projectiles.filter((q) => !q.hostile);
    if (now >= this.fallen.until) { const f = this.fallen; this.fallen = null; for (const e of this.enemies) { delete e.millHome; delete e.millAngle; delete e.millTurn; delete e.loomTo; } this.player.stunnedUntil = 0; this.resolveDeath(now, input, !!f.hazard, f.terrain ?? null); /* the Viewport Closed beat keeps a hazard death's cause */ this.save.hp = this.player.hp; this.save.stamina = this.player.stamina; Object.assign(this.save.position, { area: this.area, rx: this.rx, ry: this.ry, x: this.player.x, y: this.player.y }); }
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
    const from = b?.moored || b?.home || null; // release 621: where the skiff was, before board() clears it
    if (this.area !== "overworld" || !this.mechUp() || !this.swimsHere(hazard) || !b?.owned || !(b.hull > 0) || !footprintSailable(this.map, width, x, y) || this.wayglassNear(false) || !board(this.save, { x, y })) return false;
    b.mechSub = true; b.mechSubFrom = from; this.placeMooredSkiff(); this.placeSpareSkiff(); // release 621: the skiff stays where it was
    Object.assign(this.player, { sailVx: 0, sailVy: 0 }); this.swimming = false;
    this.message = "The robot seals itself: a submersible. Dodge to dive. The robot button: power armor, then out into your skiff. Sail onto land and it stands up again."; // release 639
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
  // DIG_GATES (digging.ts): the floor walked in the interior you are in (a labyrinth, the Pentagon, a castle, a great
  // building or a compound), for its dig rules. One byte a tile, made when the map changes, so it lasts while you are there;
  // null anywhere else. Marked each frame (markWalked: nine writes, no allocation).
  walkedHere() {
    if (this._walkedMap !== this.map) { this._walkedMap = this.map; this._walked = this.area === "dungeon" && this.map?.tiles && isInteriorArea(this.areaStateId()) ? new Uint8Array(this.map.tiles.length) : null; }
    return this._walked;
  }
  markWalked() { const w = this.walkedHere(); if (w) { const p = this.player; markWalked(w, this.map, Math.floor(p.x + .5), Math.floor(p.y + .75)); } }
  // Release 225: the shovel. Facing a dungeon wall, Act digs one block (crafting a shovel first from wood and stone if
  // you carry none). Returns null when you are not facing diggable rock, so Act falls through to its other uses.
  digAhead() {
    const overworld = this.area === "overworld" && !aboard(this.save); // release 423: the shovel works in the open world too
    if ((this.area !== "dungeon" && !overworld) || !this.map?.tiles) return null;
    this.markWalked(); // DIG_GATES: where you stand counts as walked
    const p = this.player, w = mapWidth(this.map, this.area), px = Math.floor(p.x + .5), py = Math.floor(p.y + .75), key = overworld ? overworldDigKey(this.rx, this.ry) : this.areaStateId(), walked = overworld ? null : this.walkedHere(), glints = !overworld && this.labQuelled() ? this.map.wallGlints || [] : null, burrow = glints?.length ? (x, y) => glints.some((g) => g.x === x && g.y === y) : null, o = { overworld, walked, burrow }; // LAB_BURROW: a claimed room's glinting walls
    // Release 411: forgiving aim: the tile ahead of the feet, else of the body's middle (a stone just above or below the
    // feet row was missed, and Act said "Nothing nearby responds").
    let plan = planDig(this.map, px, py, p.facing || "down", key, o);
    for (const ty of [Math.round(p.y + .4), Math.floor(p.y + .4)]) if (!plan.ok && (!plan.reason || plan.surfaceBlocked) && ty !== py) { const alt = planDig(this.map, px, ty, p.facing || "down", key, o); if (alt.ok || alt.reason && !plan.reason) plan = alt; }
    if (overworld && plan.ok && saveTier(this.save) < OVERWORLD_DIG.tier) { this.message = "The open world will not yield to a shovel yet. It gives way from Infinite II."; return { ok: false, message: this.message }; } // release 425
    if (!plan.ok && plan.resists) { const hard = planDig(this.map, px, py, p.facing || "down", key, { iron: true, walked }); for (const ty of [py, Math.round(p.y + .4), Math.floor(p.y + .4)]) { const h2 = planDig(this.map, px, ty, p.facing || "down", key, { iron: true, walked }); if (h2.ok) { plan = { ...h2, hard: true }; break; } } if (!plan.ok && hard.ok) plan = { ...hard, hard: true }; } // release 379: the iron shovel; 411: a hard wall costs it 2
    if (plan.ok && !plan.iron && !(this.save.digging?.shovel > 0) && (this.save.digging?.iron > 0) && ((this.save.materials?.wood || 0) < DIG.recipe.wood || (this.save.materials?.stone || 0) < DIG.recipe.stone)) plan = { ...plan, iron: true }; // release 411: no standard shovel to hand, the iron one digs
    if (!plan.ok) { if (!plan.reason) return null; this.message = plan.reason; return { ok: false, message: this.message }; }
    const preflight = validateDigPlan(this.save, this.map, plan, key); if (!preflight.ok) { this.message = preflight.message; return { ok: false, message: this.message }; }
    const c = plan.iron ? ensureIronShovel(this.save) : ensureShovel(this.save); if (!c.ok) { this.message = c.message; return { ok: false, message: this.message }; }
    const r = dig(this.save, this.map, plan, key);
    if (r.ok) { this.map.wallGlints = (this.map.wallGlints || []).filter((g) => g.x !== plan.x || g.y !== plan.y); this.stampShovelDigVisual(plan.iron ? "ironShovelDig" : "shovelDig"); }
    this.message = (c.crafted ? c.message + " " : "") + (r.ok && plan.burrow ? LAB_BURROW.messages.burrow + " " : "") + r.message; this.sync(); return r;
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
    if (this.cursed("tools")) return { ok: false, message: this.message }; // release 737: NO TOOLS
    const kind=activeBuildKind(this.save)||ensureBuild(this.save).build.kind,t = tapTarget(this.player, wx, wy), r = placeBuild(this, t.x, t.y, kind, true, t.run);
    if(r.ok&&kind==='stone')this.stampStonePlacementVisual();
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
  // The skiff at its mooring, when that is in this section (release 621: also while the robot is at sea on its own).
  placeMooredSkiff(lore = "Your skiff rides at its mooring.") {
    const m = skiffMooring(this.save); this.map.objects = this.map.objects.filter((o) => o.id !== "skiff-moored");
    if (this.area === "overworld" && m && m.rx === this.rx && m.ry === this.ry) this.map.objects.push({ id: "skiff-moored", kind: "skiff", name: "Your skiff", lore, x: m.x, y: m.y, state: "moored", actions: ["board"] });
  }
  // Release 261: the spare skiff, when it is moored in this section.
  placeSpareSkiff() {
    const sp = ensureBoatState(this.save).spare; this.map.objects = this.map.objects.filter((o) => o.id !== "skiff-spare");
    if (this.area === "overworld" && sp && sp.rx === this.rx && sp.ry === this.ry) this.map.objects.push({ id: "skiff-spare", kind: "skiff", name: "Your spare skiff", lore: "Your other skiff rides at its mooring.", x: sp.x, y: sp.y, state: "moored", actions: ["board"] });
  }
  buildSkiffHere() {
    if (this.wayglassNear(false)) { this.message = "Too near the Wayglass: no skiff is built here."; return { ok: false, message: this.message }; } // release 557
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
            ? { ...createCombatant(kind, x, y), id, ...(isTombstone(prior) ? tombstoneBlanks(prior, createCombatant(kind, x, y)) : null), ...prior, ai: { ...prior.ai } } // perf pack: a tombstone takes the rest from a fresh occupier
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
        const stars = this.fellStars ? "You stepped off the edge and fell away into the stars. " : ""; this.fellStars = false; // release 597
        this.message = stars + (deep ? `Felled — recovered at the central anchor of ${this.map.name}. Cleared wings, shortcuts, carried items, XP, and map progress remain.` : `Felled — returned to the entrance of ${this.map.name}. The run begins again; your map and everything carried remain.`);
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
  // CROSSING_SIGIL (Tim, 2026-11-05: "a sure-fire 'I'm out of here'"): it answers anywhere the Wayfarer is alive, inside or out.
  sigilBlocked() {
    const p = this.player;
    return !(p.hp > 0) || this.fallen || this._fatalFall || this._fatalFallPending || this.save.session?.holeDeath ? CROSSING_SIGIL.messages.tooLate : null;
  }
  useCrossingSigil(key = null) {
    const c = this.save.consumables, S = CROSSING_SIGIL;
    if (!(c?.crossingSigil > 0)) { this.message = S.messages.none; return false; }
    const blocked = this.sigilBlocked(); if (blocked) { this.message = blocked; return false; }
    const chosen = key && validCheckpoint(this.save.checkpoints?.[key]) ? key : null, notes = [];
    c.crossingSigil--;
    if (this.rite) { this.riteFailed(); notes.push(this.message); } // the Rite of Ascendancy: this attempt is lost, the strange tree stays
    this.save.session.displacementJourney = null; // a sigil finds you even where the Wayglass line cannot
    let where = null;
    if (this.area === "dungeon") {
      const name = this.map?.name, dive = String(this.areaId()).startsWith("dive:") || !!this.map?.underwater;
      if (this.calmBossFights()) notes.push(S.messages.boss);
      if (!validCheckpoint(this.save.session.dungeonReturn)) this.save.session.dungeonReturn = { ...this.safeCheckpoint() }; // a damaged way back: the active Wayglass
      this.canyonDrill = {};
      this.leaveDungeon("", { sigil: true });
      if (dive) this.save.session.breath = DIVE.breath; // surfaced at the buoy, as by the line
      else this.landSafely();
      where = dive ? "the surface, beside the dive buoy" : `the way into ${name || "the dungeon"}`;
    }
    if (chosen || !where) {
      const to = this.save.checkpoints?.[chosen] || this.safeCheckpoint();
      if (this.travelToCheckpoint(chosen)) { this.landSafely(); where = to.name || "the Wayglass"; }
      else if (!where) { c.crossingSigil++; return false; } // nothing moved (travelToCheckpoint said why): the sigil is kept
    }
    this.clearCarriedStates(); this.fallen = null; this.jumpUntil = 0; this.traversal = null;
    const p = this.player; p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, (this.lastUpdateNow || 0) + S.guard);
    this.message = [S.messages.out(where || "safe ground", c.crossingSigil), ...notes].join(" ");
    this.sync();
    return true;
  }
  // A crossing sigil's arrival in the open world: never inside a wall, on lava, in deep water or a chasm.
  landSafely() {
    if (this.area !== "overworld" || !this.map) return false;
    const p = this.player, w = mapWidth(this.map, "overworld"), h = Math.floor(this.map.tiles.length / w);
    const moved = relocateIfStranded(p, this.map, w);
    if (!footprintHazard(this.map, w, p.x, p.y) && footprintOpen(this.map, w, p.x, p.y)) return moved;
    const near = nearestReturnable(this.map, w, h, { x: 16, y: 16 }, { x: Math.floor(p.x + .5), y: Math.floor(p.y + .72) });
    if (near) { p.x = near.x; p.y = near.y; return true; }
    return moved;
  }
  // A crossing sigil out of a dungeon boss fight: the guardian is whole again and calm at home, its summons gone (the Stillworks
  // as after a death). Returns whether a fight was under way.
  calmBossFights() {
    if (this.area !== "dungeon") return false;
    let fought = false;
    if (this.map?.pentArena) { fought = this.enemies.some((e) => e.pentFinaleBeast && !e.dead && (e.pentArenaAwake || e.hp < e.maxHp)); this.resetPentagonArena(); }
    const ids = new Set();
    for (const e of this.enemies) {
      if (e.dead || e.pentFinaleBeast || e.summonedBy || !isDungeonGuardian(e) || !(e.aggro || e.hp < e.maxHp)) continue;
      ids.add(e.id); fought = true;
      e.hp = e.maxHp; resetPackRuntime(e); e.aggro = false; e.hitStun = 0; e.recoil = 0; e.hitFlash = 0; e.untargetable = false;
      if (e.glyphBaseSpeed !== undefined) e.speedMultiplier = e.glyphBaseSpeed; delete e.glyphBaseSpeed; delete e.glyphBurn; delete e.glyphSlow;
      const ai = ensureAI(e); ai.mode = "patrol"; if (Number.isFinite(ai.homeX) && Number.isFinite(ai.homeY)) { e.x = ai.homeX; e.y = ai.homeY; }
    }
    for (const e of this.enemies) if (!e.dead && (ids.has(e.summonedBy) || ids.has(e.astralOwner) || ids.has(e.kitAddOf))) { e.dead = true; e.noRewards = true; e.rewarded = true; }
    return fought;
  }

  packHurt(source, amount, options = {}, now = performance.now()) {
    const p = this.player;
    if (source?.illusion || !(amount > 0) || now <= (p.invulnerableUntil || 0) && !options.piercing) return false; // release 709: the Sunfall pierces a dodge
    if (options.jumpable && now < (this.jumpUntil || 0)) return false;
    if (source && isBodyBlow(options.source) && !this.bodyReach(source)) return false; // Tim (2026-11-04): a body blow does not carry five levels up or down (ELEVATION_REACH)
    if (source && enclosureShields(this, { x: source.x + .5, y: source.y + .6 })) return false; // release 696: the enclosure's walls turn it
    { const b = source && buildBetween(this, source); if (b) { const melee = (ATTACK_MODULES[source.pack?.attack]?.tags || []).includes("melee"); strikeBuild(this, b, melee && !!(source.worldBeast || source.questingBeast)); return false; } } // release 265: a build takes the blow
    const veil = this.save.magicSkills?.active?.id === 'veil-guard' ? .12 + .08 * skillRank(this.save, 'veil-guard') : 0;
    if (bossPaced(source) && options.source !== "astralDrain") amount *= BOSS_PACE.damage; // release 421 (the Astral Worm's drain keeps its release-307 size: it is also its heal)
    if (this.frenzy?.active) amount *= 1 + FRENZY.extra; // release 710: the frenzy takes more out of you
    p.hp -= Math.max(1, Math.ceil((this.guardRemaining > 0 ? amount * .65 : amount) * (1 - Math.min(.75, characterStats(this.save).damageReduction + veil)) * hurtScale(this.save)));
    if (options.source === "ramCharge" || options.source === "phaseCharge" ||
        options.source === "leapSlam" || options.source === "orb") this.noteHurtVisualImpact();
    p.invulnerableUntil = now + (options.beam ? 320 : 700);
    if (source?.kind === "doomChaser") this.frenzyHit(now); // release 710
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
  // Perf pack (perf P7): a Supernova near an edge previews each neighbour it reaches (walkerCrossingMap), which generated
  // that section's terrain inside the blast's frame (145-321 ms here, up to 1.9 s on a phone). While a Void Walker stands
  // in this section, idle time (main.ts) lays the neighbours' terrain into the sectionTerrain cache one at a time, so the
  // spill copies it instead. Returns true when there is nothing (more) to warm; `generate` false only asks.
  warmSpillTerrain(generate = true) {
    if (this.area !== "overworld" || !this.enemies?.some((e) => !e.dead && (e.kind === "voidWalker" || e.worldBeast === "voidWalker"))) return true;
    const seed = this.save.seed, gen = this.save.worldGeneration;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const rx = this.rx + dx, ry = this.ry + dy, steps = walkerTerrainSteps(this.save, rx, ry);
      if (!terrainCached(seed, rx, ry, gen, steps)) { if (generate) sectionTerrain(seed, rx, ry, gen, steps); return false; }
    }
    return true;
  }
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
    navTick(); // perf (2026-11-04): made once a frame, before the creatures move: this frame's way-round searches start again
    const map = this.map, width = mapWidth(map, this.area), height = mapHeight(map, this.area), p = this.player, last = this._packLastPlayer || p, game = this;
    const displacePlayer = (dx, dy) => {
      if (game.area !== "overworld" || !aboard(game.save)) return game.moveGrounded(p, dx, dy, true);
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
      feet: () => ({ x: p.x, y: p.y + (p.riderShift || 0) }), // release 748: on a mount, ground pools meet the mount's feet (monster-pack GROUND_EFFECTS)
      playerVelocity: dt > 0 ? { x: (p.x - last.x) / dt, y: (p.y - (p.riderShift || 0) - last.y) / dt } : { x: 0, y: 0 }, /* release 748: not the rider lift */
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
        if (map.pentArena) return { ok: false, reason: "arena", changed: 0, visualChanged: false, cells: [], protected: [], rejected: [] }; // the Stillworks' stone is never scarred: the Supernova burns, the floor stays
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
        const moved = game.moveGrounded(e, dx, dy, !!e.flying, null, marine); refreshMarineBeast(e, map, width, game.area); return moved;
      },
      gateChase(e, step) {
        const ai = ensureAI(e), blockedSight = !hasLineOfSight(e, p, map, width);
        if (ai.gateStep && Math.hypot(ai.gateStep[0]-e.x,ai.gateStep[1]-e.y)<.08) ai.gateStep=null;
        if (blockedSight && !(ai.gatePathRetry > now)) { ai.gatePathRetry=now+350; ai.gateStep=boundedChaseStep(e,p,map,width); }
        const target=ai.gateStep?{x:ai.gateStep[0],y:ai.gateStep[1]}:p;
        const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);
        if (d<.01) return false;
        const travel=Math.min(step,d),moved=game.moveGrounded(e,dx/d*travel,dy/d*travel);
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
      dragonDue: () => !map.pentArena && game.dragonDue(), /* the Stillworks is never claimed */ dragonLava: () => game.dragonLavaNow(), dragonLavaPreview: () => { const r = game.dragonClock(); return castTiles(map, game.save.seed, game.rx, game.ry, r.casts + 1); }, playerMaxHp: () => game.save.maxHp || p.maxHp || 100, // release 709
      frenzy: (n) => game.frenzyHit(now, n), // release 710: the Doom Chaser's roar
      // The Stillworks' cover (pentagon-arena.ts PENTAGON_ARENA.cover, arena version 2): a pillar or standing lattice between the beast
      // and the Wayfarer turns the Sunfall. Only in an arena that has the pillars; everywhere else the Sunfall is as it was.
      sunfallShaded: map.stillworks?.cover ? (e) => { const shade = !hasLineOfSight({ x: e.x + .5, y: e.y + .5 }, { x: p.x + .5, y: p.y + .7 }, map, width, true); if (shade) game.message = PENTAGON_ARENA.messages.shaded; return shade; } : null,
      confuse(seconds) { if (!(seconds > 0) || p.hp <= 0 || now < (p.dodgeUntil || 0)) return; if (!(now < (p.confusedUntil || 0))) game.message = HAUNT.text.confused; p.confusedUntil = Math.max(p.confusedUntil || 0, now + seconds * 1000); }, // release 731: the haunts turn you about
      curse: (source, n) => game.layHauntCurses(source, n, now), // release 737: a landed puff or howl lays haunt curses
      say: (text) => { if (text) game.message = text; }, // the Gloomvast's Dark and reveal (haunts.ts GLOOM_FINALE.text)
      gloomSpots: (c, n, key) => game.gloomSpots(c, n, key), spawnGloomOrb: (owner, x, y, tag, brain) => game.spawnGloomOrb(owner, x, y, tag, brain),
      ignite(seconds, dps) { if (now < (p.dodgeUntil || 0)) return; const f = game.playerFire, on = f && f.left > 0; if (on && f.dps > dps) return; game.playerFire = { left: on && f.dps === dps ? Math.max(f.left, seconds) : seconds, dps, tick: f?.tick ?? 1 }; }, // balance pack (C11): the stronger burn keeps its own time // release 708: set alight (the Briar Stag's burning trees)
      poison(seconds, dps) { if (sanctuary && Math.hypot(p.x - sanctuary.x, p.y - sanctuary.y) < sanctuary.radius) return; if (now < (p.dodgeUntil || 0)) return; applyPoison(eliteStateInPlace(game.save).status, seconds, dps); },
      effects: () => game.packEffects || [],
      elevation: (x, y) => elevationAt(map, width, x, y), // release 235: high ground stays above the Blob
      // Release 257: the Lightning Giant's shock knocks the Wayfarer flat; dodge frames already blocked the hit itself.
      stun(seconds) { if (!(seconds > 0) || p.hp <= 0) return; if (!(now < (p.stunnedUntil || 0))) p.stunnedAt = now; p.stunnedUntil = Math.max(p.stunnedUntil || 0, now + seconds * 1000); game.cancelPendingMeleeContact("knockdown"); game.cancelConsumeVisual('knockdown'); game.message = "The shock knocks you flat!"; },
      // One landed lightning hit from the Lightning Giant: every GIANT.stunHits-th one knocks the Wayfarer down (Tim 2026-10-21).
      shockHit() { if (p.hp <= 0 || now < (p.stunnedUntil || 0)) return; p.shockCount = (p.shockCount || 0) + 1; p.shockAt = now; if (p.shockCount >= GIANT.stunHits) { p.shockCount = 0; this.stun(GIANT.stunTime); } },
      slow(factor, seconds) { const on = now < (p.slowUntil || 0), cur = on ? (p.slowFactor || 1) : 1; if (on && cur < factor) return; p.slowUntil = on && cur === factor ? Math.max(p.slowUntil, now + seconds * 1000) : now + seconds * 1000; p.slowFactor = factor; }, // balance pack (C11): the stronger slow keeps its own time
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
    // Tim (2026-11-01, the Deep's plan): "the Listener's Mouth, once you've beaten that Mouth's Listener: its runs become the Array's own
    // endless descent". The Mouth where a Listener fell also opens the Deep (the-deep.ts), from floor 1 or any checkpoint reached.
    const descent = !this.map.objects.some((o) => o.kind === "deepShaft") && near(0, 2);
    if (descent) { const rec = deepShaft(this.save, deepIdFor(this.save.seed, this.rx, this.ry)); this.map.objects.push({ id: `mouth-deep-${this.rx}-${this.ry}`, kind: "deepShaft", name: THE_DEEP.mouthName, ...descent, state: "open", actions: startFloors(rec).map((f) => `descend:${f}`), lore: THE_DEEP.messages.mouth, landmark: true, mouthDeep: true }); }
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
  // Release 697: a second enclosure built across a pen's opening closes it; if the Stalker is inside, that is the try (stalker.ts).
  // Release 748 (Tim, 2026-11-04): a trap that holds now catches: the beast goes to the stable (catchBeast). The world beasts are
  // tried too (beast-mounts.ts: a pen big enough for them, the same odds of their health); four of them never can be.
  penClosed(pen, by) {
    const inside = this.enemies.filter((q) => !q.dead && !q.stalkerKin && !q.stalkerDecoy && (q.stalker || q.worldBeast || q.questingBeast) && enclosureAt(this, q.x + .5, q.y + .75) === pen);
    if (!inside.length) return "The pen is closed. Nothing is inside it.";
    // The answer says why a try failed. No try made (never penned, too small, out of reach): the closing pen comes down and its
    // materials come back (a too-small pen with it). A try that failed (Tim, 2026-11-04): the beast slips out, the pen breaks
    // and the materials of both pieces are lost; to try again both are built anew (building.ts placeEnclosure acts on `undo`).
    const e = inside.find(catchableActor) || inside[0], again = " The pen breaks, and the materials in both pieces are lost: build the enclosure and its closing piece again to try again.";
    if (e.stalker && catchableActor(e)) return stalkerTrapAttempt(e, pen, by.id) ? this.catchBeast(e, "stalker", pen) : { message: `The Stalker slips out before the pen can close on it.${again}`, undo: "crumble", also: [pen] };
    const why = catchRefusal(e, pen), id = mountIdFor(e);
    if (why && neverCaught(e)) return { message: `${why} The closing pen comes down, its materials returned.`, undo: "refund" };
    if (why && id && (Number(pen.size) || ENCLOSURE.size) < MOUNT_BEASTS[id].pen) return { message: `Too small: ${why} Both pens come down, their materials returned; build again near it and the pen is sized for it.`, undo: "refund", also: [pen] };
    if (why) return { message: `${why} No try was made: the closing pen comes down, its materials returned.`, undo: "refund" };
    if (!catchRoll(e, pen, by.id)) return { message: `${MOUNT_BEASTS[id].name} slips out before the pen can close on it.${again}`, undo: "crumble", also: [pen] };
    return this.catchBeast(e, id, pen);
  }
  // Caught: its hunt ends as a fall does, with nothing paid (Tim: "the only reward is being able to ride it"), and it goes to the
  // stable (the oldest let go past MOUNT_RIDE.cap). Returns the message.
  catchBeast(e, id, pen = null) {
    for (const q of this.enemies) if ((q.stalkerOf === e.id || q.summonedBy === e.id || q.astralOwner === e.id) && !q.dead) { q.dead = true; q.noRewards = true; }
    Object.assign(e, { dead: true, noRewards: true, rewarded: true, caught: true, stalkTrapped: 0 });
    if (id === "stalker") { stalkerCaught(this.save); if (this.stalkFog) this.stalkFog.until = 0; } else worldBeastCaught(this.save, id);
    this.enemies = this.enemies.filter((q) => q !== e); if (pen) pen.trapped = null;
    reconcileAstralCompanions(this); this.syncAstralRiders();
    const B = MOUNT_BEASTS[id], { released } = stableMount(this.save, id), n = this.save.mounts.stable.length, who = B.name.replace(/^The /, "the ");
    journalOnce(this.save, `beast-caught:${id}:${this.save.mounts.caught[id]}`, `You caught ${who} in a pen at ${this.rx},${this.ry}. It waits in your stable to be ridden.`, B.name);
    this.defeatNotice = { title: "CAUGHT", detail: `${B.name} · in your stable (${n}/${MOUNT_RIDE.cap})${released ? ` · ${mountName(released)} let go` : ""}`, kind: "discovery" };
    return `The pen closes on ${who}, and it is caught! It goes to your stable: press Act with nothing near, or Pack → Supplies → Stable, to ride it.${released ? ` Your stable holds ${MOUNT_RIDE.cap}: ${mountName(released).replace(/^The /, "the ")}, the oldest, is let go.` : ""}`;
  }
  // Release 748: a pen is built for the biggest catchable beast within MOUNT_RIDE.sense tiles (building.ts placeEnclosure).
  penSize() { const p = this.player; let n = ENCLOSURE.size; for (const e of this.enemies || []) if (catchableActor(e) && Math.hypot(e.x - p.x, e.y - p.y) <= MOUNT_RIDE.sense) n = Math.max(n, MOUNT_BEASTS[mountIdFor(e)].pen); return n; }
  // ---- Riding (release 748) ----
  mountRide() { return this.area === "overworld" && this.player?.hp > 0 ? ridingMount(this.save) : null; }
  // Release 748: while mounted, the hostile part of the frame sees the Wayfarer where the rider is drawn (`seat` tiles up); moveAxis
  // takes the lift off again, so a knock still moves the mount's feet. Terrain, water, mire and lethal ground stay at the feet.
  riderUp() { const p = this.player, m = this.mountRide(); if (!m || p.riderShift) return; const h = riderLiftOf(m); if (h > 0) { p.y -= h; p.riderShift = h; } }
  riderDown() { const p = this.player; if (p.riderShift) { p.y += p.riderShift; p.riderShift = 0; } }
  mountLeap(now) { return !!this.mountRide() && now < (this.jumpUntil || 0); } // airborne on a mount: chasms and water pass under
  mountBlock() {
    const p = this.player;
    if (this.area !== "overworld") return "Mounts cannot be ridden in here: call one in the open world.";
    if (!(p.hp > 0)) return "You cannot ride now.";
    if (aboard(this.save)) return "Step ashore first: a mount cannot ride in a skiff.";
    if (this.swimming) return "Get out of the water first.";
    if (this.mechUp() || this.droneUp()) return "Stow the robot or the drone first.";
    if (this.glide) return "Land first.";
    if (footprintInsideStructure(this.map, mapWidth(this.map, this.area), p.x, p.y)) return "There is no room for a mount indoors.";
    return null;
  }
  summonMount(id = null) {
    const m = id ? mountById(this.save, id) : defaultMount(this.save);
    if (!m) return { ok: false, message: (this.message = "Your stable is empty. Close a pen on a beast to catch one.") };
    const why = this.mountBlock(); if (why) return { ok: false, message: (this.message = why) };
    if (ridingMount(this.save)?.id === m.id) return { ok: true, message: (this.message = `You are already riding ${mountName(m).replace(/^The /, "the ")}.`) };
    startRide(this.save, m.id, null); this._mountHp = this.player.hp;
    const spent = noteRideSection(this.save, `${this.rx},${this.ry}`); if (spent) return { ok: false, message: (this.message = spent) };
    return { ok: true, message: (this.message = `${mountName(m)} answers your call, and you climb onto its back. ${mountLifeText(m)} left.`) };
  }
  dismount(message = null) {
    const m = stopRide(this.save); this._mountHp = null; if (!m) return { ok: false, message: this.message };
    return { ok: true, message: (this.message = message || `You climb down from ${mountName(m).replace(/^The /, "the ")}, and it is gone back to your stable. ${mountLifeText(m)} left.`) };
  }
  // Act with nothing near in the open world: get down, or call the mount ridden last.
  actMount() { if (this.area !== "overworld" || !ensureMounts(this.save).stable.length) return null; return ridingMount(this.save) ? this.dismount() : this.summonMount(); }
  releaseStabled(id) { const m = releaseMount(this.save, id); if (m) { if (!ridingMount(this.save)) this._mountHp = null; this.message = `You let ${mountName(m).replace(/^The /, "the ")} go. It is gone from your stable.`; } return m; }
  // Each frame: the ride runs down; a death, an indoor step, water, a skiff, the robot, the drone or the glider gets you down
  // first, and a heavy blow (MOUNT_RIDE.knockoff of maximum health in one frame) throws you off.
  tickMount(dt) {
    const m = ridingMount(this.save); if (!m) { this._mountHp = null; return; }
    const p = this.player, who = mountName(m).replace(/^The /, "the ");
    if (!(p.hp > 0)) { this.dismount(`You fall from ${who}. It waits in your stable.`); return; }
    const why = this.mountBlock(); if (why) { this.dismount(`You get down from ${who} first; it waits in your stable.`); return; }
    if (this._mountHp != null && this._mountHp - p.hp >= MOUNT_RIDE.knockoff * (this.save.maxHp || p.maxHp || 100)) { this.dismount(`The blow throws you from ${who}! It is gone back to your stable.`); return; }
    this._mountHp = p.hp;
    const spent = tickRide(this.save, dt); if (spent) { this._mountHp = null; this.message = spent; }
  }
  // On every area load: indoors it waits in the stable; each different overworld section ridden counts.
  mountArea() {
    const m = ridingMount(this.save); if (!m) return;
    if (this.area !== "overworld") { this.dismount(`${mountName(m)} cannot follow you in there: it waits in your stable.`); return; }
    const spent = noteRideSection(this.save, `${this.rx},${this.ry}`); if (spent) { this._mountHp = null; this.message = spent; }
  }
  // Release 678: the Stalker (stalker.ts). Ground it may stand on: open, not lethal, never inside a building, shelter or town.
  stalkerBarred(x, y) {
    if (this.area !== "overworld") return true;
    const width = mapWidth(this.map, this.area), z = settlementSanctuary(this.map, this.rx, this.ry, this.save);
    return footprintInsideStructure(this.map, width, x, y) || !!(z && Math.hypot(x - z.x, y - z.y) < z.radius + 1);
  }
  stalkerOpen(x, y) {
    const width = mapWidth(this.map, this.area), height = mapHeight(this.map, this.area);
    return [x, y].every(Number.isFinite) && x >= .5 && y >= .5 && x <= width - 1.5 && y <= height - 1.5 && (footprintOpen(this.map, width, x, y) && !footprintHazard(this.map, width, x, y) || this.stalkerWaterFooting(x, y)) && !this.stalkerBarred(x, y);
  }
  // Release 695 (Tim: "the stalker is just not affected by water... walks on water as if it's just land"): footing where every tile
  // under it is either water (river, lake, sea, swamp; never part of a building) or plain open ground.
  stalkerWaterFooting(x, y) {
    const width = mapWidth(this.map, this.area), map = this.map, height = map.tiles.length / width; let wet = false;
    for (let ty = Math.floor(y + .5); ty <= Math.floor(y + .88 - 1e-6); ty++) for (let tx = Math.floor(x + .24); tx <= Math.floor(x + .76 - 1e-6); tx++) {
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false; const t = map.tiles[ty * width + tx]; if (!t || t.structure || t.buildingId || t.perch) return false;
      if (t.kind === "river" || DEEP_WATER.includes(t.kind)) { wet = true; continue; }
      if (t.blocked || LETHAL_KINDS.has(t.kind)) return false;
    }
    return wet;
  }
  stalkerWorld(dt, now) {
    if (this._stalkW?.now === now && this._stalkW.dt === dt) return this._stalkW;
    const game = this, p = this.player, map = this.map, width = mapWidth(map, this.area), last = this._packLastPlayer || p;
    return (this._stalkW = {
      now, dt, player: p, sheltered: this.stalkerBarred(p.x, p.y), door: this._stalkOver?.rx === this.rx && this._stalkOver?.ry === this.ry ? this._stalkOver : null,
      playerVelocity: dt > 0 ? { x: (p.x - last.x) / dt, y: (p.y - (p.riderShift || 0) - last.y) / dt } : { x: 0, y: 0 }, /* release 748: not the rider lift */
      open: (x, y) => game.stalkerOpen(x, y),
      free: (x, y) => [x, y].every(Number.isFinite) && x >= .5 && y >= .5 && x <= width - 1.5 && y <= mapHeight(map, game.area) - 1.5 && !game.stalkerBarred(x, y), // the cat climbs over walls and up trees, never into a building, shelter or town
      shotBlocked: (x, y) => !projectileTileOpen(map, width, x, y),
      displace: (dx, dy) => [dx, dy].every(Number.isFinite) && moveAxis(p, dx, dy, map, width, true), // the gorilla's pull and knockback (a knock can carry the Wayfarer off a ledge)
      move(e, dx, dy) { if (!e.stalkerKin && !e.stalkerDecoy && (game.stalkerWaterFooting(e.x, e.y) || game.stalkerWaterFooting(e.x + dx, e.y + dy))) { /* on water it simply walks */ let moved = false; if (dx && game.stalkerOpen(e.x + dx, e.y)) { e.x += dx; moved = true; } if (dy && game.stalkerOpen(e.x, e.y + dy)) { e.y += dy; moved = true; } return moved; }
        const ox = e.x, oy = e.y, moved = moveAxis(e, dx, dy, map, width); if (moved && game.stalkerBarred(e.x, e.y)) { e.x = ox; e.y = oy; return false; } return moved; },
      elev: (x, y) => Number(map.tiles[Math.floor(y + .72) * width + Math.floor(x + .5)]?.elev) || 0,
      hurt: (e, amount) => game.packHurt(e, amount, {}, now),
      revealed: () => { game.message = "THE STALKER — it was waiting for you."; },
      // Release 696: the Enclosure trap.
      penBreak: (id) => { const b = (game.builds || []).find((q) => q.id === id); if (b) breakBuild(game, b); },
      penOut: (e) => game.stalkerBreaksOut(e), // release 699: it tears free and leaves, still on the Wayfarer's trail
      fogged: (e, time) => { // release 692: the sea's fog (Tim: "just use the fog from the sea fog"), banks round the Wayfarer, drawn by renderer.js?v=r866-2a08d6b00273's sea-fog code
        game.stalkFog = { until: now + time * 1000, level: game.stalkFog?.level || 0, fog: [0, 1, 2, 3, 4].map((i) => ({ x: p.x + Math.cos(i * 1.257) * (i ? 4.5 : 0), y: p.y + Math.sin(i * 1.257) * (i ? 3.5 : 0), radius: i ? 5 : 6, swirl: i * 1.1 })) };
        game.message = "A fog rolls in, and the Stalker is gone into it."; },
      // The mist's rot: a share of maximum health gone until the Wayfarer rests (a dodge passes through; rot past it all kills).
      rot: (e, share) => { if (now <= (p.invulnerableUntil || 0)) return false; ensureRot(game.save); game.save.rot += Math.max(1, Math.round((game.save.maxHp || 1) * share)); p.invulnerableUntil = now + 700;
        if (game.save.rot >= game.save.maxHp) p.hp = 0; else p.hp = Math.min(p.hp, healthCeiling(game.save));
        game.message = `The Stalker's mist rots you: maximum health ${Math.max(0, game.save.maxHp - Math.floor(game.save.rot))}/${game.save.maxHp} until you rest.`; return true; },
      ownerAlive: (q) => game.enemies.some((o) => o.id === q.stalkerOf && !o.dead),
      summon: (e, n) => game.spawnStalkerKin(e, n, false, e),
      decoys: (e, n, at) => game.spawnStalkerKin(e, n, true, at || e),
    });
  }
  // Small silver copies (the swarm, capped) or decoys that attack and fade; summons with no rewards that go when it falls.
  spawnStalkerKin(owner, n, decoy = false, at = owner) {
    const W = decoy ? STALKER.decoy : STALKER.swarm, alive = this.enemies.filter((q) => !q.dead && q.stalkerOf === owner.id && (decoy ? q.stalkerDecoy : q.stalkerKin)).length;
    const room = decoy ? n : Math.max(0, Math.min(n, STALKER.swarm.cap - alive)); let made = 0;
    for (let i = 0; i < 10 && made < room; i++) {
      const a = (i / 10) * Math.PI * 2 + (owner.stalkCycle || 0), x = at.x + Math.cos(a) * 1.3, y = at.y + Math.sin(a) * 1.3; if (!this.stalkerOpen(x, y)) continue;
      const c = createCombatant("ashenHound", x, y, false, []), seq = (this._stalkKinSeq = (this._stalkKinSeq || 0) + 1);
      Object.assign(c, { id: `${owner.id}:${decoy ? "decoy" : "kin"}:${seq}`, kind: "stalker", [decoy ? "stalkerDecoy" : "stalkerKin"]: true, stalkerOf: owner.id, summonedBy: owner.id, noRewards: true, aggro: true, boss: false, meleePatterns: [], range: 0,
        maxHp: decoy ? W.hp : Math.max(1, Math.round(owner.maxHp * W.hp)), damage: Math.max(1, Math.round(owner.damage * W.damage)), scale: STALKER.size * W.scale, bodyRadius: decoy ? .45 : .3, stalkForm: "cat", stalkLife: W.life, facingX: owner.facingX || 1 });
      c.hp = c.maxHp; ensureAI(c); this.enemies.push(c); made++;
    }
    return made;
  }
  // It comes out: behind the Wayfarer (where the marker pointed), or by the door it waited at.
  spawnStalker(at = null, fromDoor = false, now = 0) {
    const st = ensureStalker(this.save), p = this.player, width = mapWidth(this.map, this.area);
    let spot = null;
    if (at) { for (const [dx, dy] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2]]) if (this.stalkerOpen(at.x + dx, at.y + dy)) { spot = { x: at.x + dx, y: at.y + dy }; break; } }
    else { // release 691: it lies in wait ahead of the Wayfarer, on the highest open ground it can find (a tree, a ledge), and springs when they come close.
      const b = this._stalkBearing ?? Math.PI / 2, elev = (q) => Number(this.map.tiles[Math.floor(q.y + .72) * width + Math.floor(q.x + .5)]?.elev) || 0;
      const open = ambushSpots(this.save.seed, `${st.seq}:${st.kills}:${Math.floor(now / 500)}`, p, { x: Math.cos(b), y: Math.sin(b) }).filter((q) => this.stalkerOpen(q.x, q.y));
      spot = open.sort((q, r) => elev(r) - elev(q))[0] || null; }
    if (!spot) return null;
    const stats = characterStats(this.save), rev = tuneGatePredator(Object.assign(createCombatant("gateRevenant", 0, 0, false, []), { gatePredator: true }), this.save, stats);
    const beast = beastProfileVitals({ hitsToKill: 0, hpPerLevel: 0, damageShare: STALKER.vitals.damageShare }, this.save, stats), q = regionalThreat(this.rx, this.ry), v = stalkerVitals(rev.maxHp, beast.damage, beastRegionalThreat(q)); // balance pack: regional threat ramps in from BEAST_REGION_RAMP.from
    const key = `${this.save.seed}:stalker:${st.seq}:${st.kills}`, c = createCombatant("ashenHound", spot.x, spot.y, false, []);
    Object.assign(c, { id: `stalker-${st.seq}-${st.kills}`, kind: "stalker", stalker: true, boss: true, aggro: true, eliteName: "The Stalker", defeatTitle: "THE STALKER FALLS", maxHp: Math.max(v.hp, Number(st.active?.hp) || 0) /* balance pack: a stalk under way keeps the health it has */, hp: st.active?.hp || v.hp, damage: v.damage, baseDamage: v.damage,
      range: 0, meleePatterns: [], scale: STALKER.size, baseScale: STALKER.size, bodyRadius: .5, threatRing: q.ring, xpMultiplier: q.xpMultiplier * 2, staggerImmune: true,
      affixes: rollAffixes(key, STALKER.affixes[0] + (hashSeed(`${key}:affix-count`) % (STALKER.affixes[1] - STALKER.affixes[0] + 1))), stalkForm: at ? "cat" : hashSeed(`${key}:first`) % 2 ? "ape" : "cat" });
    // Release 695: how it comes for you, by turns: lying in wait ahead (lurk), running at you from across the section (run), in
    // the open then fogging (fog), stalking slowly then breaking into a run (creep), or flying in as the gorilla (fly).
    const style = at ? "door" : STALKER.approach.styles[(st.seq + st.kills) % STALKER.approach.styles.length], b = this._stalkBearing ?? Math.PI / 2;
    const far = (key, heading) => ambushSpots(this.save.seed, `${st.seq}:${st.kills}:${key}`, p, heading, STALKER.approach.far).find((q) => this.stalkerOpen(q.x, q.y));
    if (style === "lurk") Object.assign(c, { stalkLurk: { t: 0 }, hidden: true, untargetable: true, stalkHide: 1 }); // release 691: hidden until it springs
    else if (style === "fog") { const back = ambushSpots(this.save.seed, `${st.seq}:${st.kills}:fog`, p, { x: -Math.cos(b), y: -Math.sin(b) }).find((q) => this.stalkerOpen(q.x, q.y)); if (back) { c.x = back.x; c.y = back.y; } c.stalkFogPlan = true; }
    else if (style === "run" || style === "creep" || style === "fly") { const q = far(style, { x: Math.cos(b), y: Math.sin(b) }) || far(`${style}:b`, { x: -Math.cos(b), y: -Math.sin(b) }); if (q) { c.x = q.x; c.y = q.y; }
      if (style === "creep") c.stalkCreepIn = true;
      if (style === "fly") Object.assign(c, { stalkForm: "ape", stalkAct: { kind: "leapWarn", t: .3, total: .3, to: { x: p.x, y: p.y }, flyTime: STALKER.approach.flyTime } }); }
    c.stalkStyle = style;
    ensureAI(c); this.enemies.push(c); stalkerEngaged(this.save, c.hp);
    if (!fromDoor) this.message = ({ lurk: "The air goes very still. Something is watching you.", fog: "THE STALKER — it is coming for you.", run: "THE STALKER — it is running at you!", creep: "Something silver is stalking toward you.", fly: "THE STALKER — it comes flying in!" })[c.stalkStyle] || "THE STALKER.";
    return c;
  }
  tickStalker(dt, now) {
    const st = ensureStalker(this.save), p = this.player;
    if (this.enemies.some((e) => e.dead && (e.stalkerKin || e.stalkerDecoy || e.stalkerGone))) this.enemies = this.enemies.filter((e) => !(e.dead && (e.stalkerKin || e.stalkerDecoy || e.stalkerGone)));
    if (this.area !== "overworld") { this._stalkPrev = null; this.stalkFog = null; if (this.area === "dungeon" && st.active?.engaged && this._stalkOver) stalkerWaitAtDoor(this.save, this._stalkOver); return; }
    const key = `${this.rx},${this.ry}`, prev = this._stalkPrev, sheltered = this.stalkerBarred(p.x, p.y);
    this._stalkPrev = { key, x: p.x, y: p.y };
    if (!sheltered) this._stalkOver = { rx: this.rx, ry: this.ry, x: p.x, y: p.y };
    const actor = this.enemies.find((e) => e.stalker && !e.dead);
    if (this.stalkFog) { const f = this.stalkFog, want = actor && now < f.until ? 1 : 0; f.level += (want - f.level) * Math.min(1, dt * 1.5); for (const b of f.fog) b.swirl += dt * .12; if (!want && f.level < .02) this.stalkFog = null; } // release 692: it closes in as the sea fog does, and lifts
    if (actor) { if (st.active) st.active.hp = actor.hp; return; }
    if (st.active?.door) {
      if (stalkerDoorHere(this.save, this.rx, this.ry) && p.hp > 0 && this.spawnStalker(st.active.door, true, now)) { this.message = "The Stalker was waiting by the door."; return; }
      stalkerLost(this.save);
    } else if (st.active?.engaged) stalkerLost(this.save);
    // Ground covered on foot (a dodge, the drone's booster and the glider too); never a skiff, a swim or a jump between places.
    const moved = prev && prev.key === key && !aboard(this.save) && !this.swimming ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;
    if (moved > 0 && moved <= STALKER.hunt.step) { const back = Math.atan2(prev.y - p.y, prev.x - p.x), b = this._stalkBearing ?? back, d = Math.atan2(Math.sin(back - b), Math.cos(back - b)); this._stalkBearing = b + d * Math.min(1, moved * .08); }
    const unlocked = stalkerUnlocked(this.save, apertureTier(this.save.perception?.aperture || 0)), r = stalkerTrack(this.save, moved, unlocked);
    if (r.warn) this.message = r.warn;
    const free = !sheltered && p.hp > 0 && !this.swimming && !aboard(this.save) && !this.map.openSea;
    if (r.ready && free) { this.spawnStalker(null, false, now); return; }
    // Release 699: its lair trails the Wayfarer; walking into that section finds it.
    const lair = stalkerLair(this.save, this.rx, this.ry, unlocked);
    if (lair && lair.rx === this.rx && lair.ry === this.ry && free && this.spawnStalker(null, false, now)) this.message = `You have found the Stalker. ${this.message}`;
  }
  // Release 699: out of a held pen it tears free and is gone, wounds and all; the hunt drops back and its lair goes back out.
  stalkerBreaksOut(e) {
    for (const q of this.enemies) if (q.stalkerOf === e.id && !q.dead) { q.dead = true; q.noRewards = true; }
    Object.assign(e, { dead: true, noRewards: true, stalkerGone: true }); stalkerEscaped(this.save, e.hp); if (this.stalkFog) this.stalkFog.until = 0;
    this.message = "The Stalker tears the enclosure apart and is gone. It is still on your trail.";
  }
  // Release 699: the section its lair is in while it hunts (the Atlas pins it), or null.
  stalkerLairPin() {
    const st = ensureStalker(this.save); if (!st.lair || st.quiet != null || this.enemies.some((e) => e.stalker && !e.dead)) return null;
    return { rx: st.lair.rx, ry: st.lair.ry };
  }
  // The silver marker at the screen edge: which way it is, and how close (renderer.ts).
  stalkerMarker() {
    if (this.area !== "overworld") return null;
    const p = this.player, actor = this.enemies.find((e) => e.stalker && !e.dead);
    if (actor && (actor.stalkLurk || actor.stalkVeil > 0)) return null; // release 692: hidden or in its fog, nothing points to it
    if (actor) return Math.hypot(actor.x - p.x, actor.y - p.y) < 7 ? null : { angle: Math.atan2(actor.y - p.y, actor.x - p.x), strength: 1, stage: 3, text: "The Stalker" };
    const w = stalkerWarning(this.save), lair = this.stalkerLairPin();
    if (lair) { // release 699: it points to the lair, a real place, and says how many sections off it is
      const S = STALKER.lairSection, dx = (lair.rx - this.rx) * S + S / 2 - (p.x + .5), dy = (lair.ry - this.ry) * S + S / 2 - (p.y + .5), n = Math.max(Math.abs(lair.rx - this.rx), Math.abs(lair.ry - this.ry));
      if (!n) return null;
      return { angle: Math.atan2(dy, dx), strength: Math.max(.35, w?.fraction || 0), stage: w?.stage || 1, text: `${w?.text || "The Stalker's trail."} ${n} section${n === 1 ? "" : "s"} off.` };
    }
    if (!w) return null;
    return { angle: this._stalkBearing ?? Math.PI / 2, strength: w.fraction, stage: w.stage, text: w.text };
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
      if (!e.retreating && e.aggro && !q.dungeon && !q.cornered && this.area === "overworld" && worldBeastPatience(this.save, id, dt, e, this.beastTries === false)) {
        const seed = this.save.seed, gen = this.save.worldGeneration, r = beginRetreat(this.save, id, this.rx, this.ry, this.retreatProbe()); // release 241: a section is generated only for homes that need it
        e.retreating = true; this.message = r.message;
        for (const m of this.enemies) if (m.summonedBy === e.id && !m.dead) { m.dead = true; m.noRewards = true; }
        if (id === "morphingBlob") this.splitBlob(e);
        journalOnce(this.save, `world-beast-flees:${id}:${this.save.worldBeasts[id].cycle}`, r.message, "World beasts");
      }
      if (e.retreating && !e.fleeTo && q.retreat && !q.dungeon) { const t0 = retreatTarget(q.retreat, id, this.map, this.rx, this.ry, sectionExits(this.save.seed, this.rx, this.ry), e); if (t0.noGround) { const r = replanRetreat(this.save, id, this.rx, this.ry, this.retreatProbe()); this.message = r.message; } } // release 609 (Codex play-test, issue 3): a home with none of its ground is no home: it looks further
      if (e.retreating && !e.fleeTo && q.retreat) { const to = retreatTarget(q.retreat, id, this.map, this.rx, this.ry, q.dungeon ? {} : sectionExits(this.save.seed, this.rx, this.ry), e); Object.assign(e, { standsAtHome: !q.dungeon && id !== "voidWalker" && !!to?.home, /* release 653: followed home, it fights */ fleeTo: to, fleePath: id === "voidWalker" ? [] : retreatPath(this.map, e, to, B.retreatMoves, Number(this.map.width) || 32), fleeSpeed: RETREAT.speed, fleeFadeTime: RETREAT.fade, untargetable: true }); } // release 239: it finds its way round walls, over chasms, by bridges
      if (!e.fleeDone) continue;
      if (e.fleeTo.home && e.standsAtHome) { // release 653: run to ground at home, it turns and fights to the end here, its wounds kept
        Object.assign(e, { retreating: false, untargetable: false, hidden: false, fleeTo: null, fleePath: null, fleeDone: false, fleeFade: null, standsAtHome: false, aggro: true, cornered: true });
        q.retreat = null; q.cornered = true; q.rx = this.rx; q.ry = this.ry; this.message = `${B.name} turns at bay on its home ground. It will not run again.`; journalOnce(this.save, `world-beast-bay:${id}:${this.save.worldBeasts[id].cycle}`, this.message, "World beasts"); continue;
      }
      (gone ||= []).push(e);
      if (e.fleeTo.home) { const line = retreatEnded(this.save, id); this.message = line; journalOnce(this.save, `world-beast-home:${id}:${this.save.worldBeasts[id].cycle}`, line, "World beasts"); }
      else { retreatCrossed(this.save, id, e.fleeTo.side, id === "voidWalker" ? e.fleeTo.crossingEntry : null, e); this.message = `${B.name} flees ${e.fleeTo.side}, out of this section.${id === "voidWalker" ? " Its retreat continues there when you follow." : " Follow it home and it will have to fight."}`; }
    }
    if (gone) this.enemies = this.enemies.filter((e) => !gone.includes(e));
    if (this.enemies.some((e) => e.passingBeast && e.fleeDone)) this.enemies = this.enemies.filter((e) => !(e.passingBeast && e.fleeDone)); // release 569: across and gone
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
      if (e.mothChrysalis) { c.mothChrysalis = true; c.maxHp = c.hp = Math.max(40, Math.round(liveBeastReference(this.save, characterStats(this.save)).perHit * CHRYSALIS.hits)); c.damage = 0; c.aggro = true; } // release 708
      if (e.skyEcho && WORLD_BEASTS[e.skyEcho]) { tuneWorldBeast(c, this.save, e.skyEcho, characterStats(this.save)); delete c.worldBeast; const n = Math.max(1, Math.min(3, e.skyEchoes || 1)) - 1, S = SKY_MODES.echoShare; c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * S.hp[n])); c.damage = Math.max(1, Math.round(c.damage * S.damage[n])); c.skyEcho = e.skyEcho; } // release 589: an echo, not the beast
      if (e.dungeonRole === "skyland") Object.assign(c, { skyRole: skyRoleOf(e), skyEchoes: Math.max(1, Math.min(3, e.skyEchoes || 1)) }); // release 688: set from the Wayfarer's level in scaleSkyFoe
      if (e.worldBeast || e.questingBeast) { const share = Number((e.worldBeast ? this.save.worldBeasts?.[e.worldBeast]?.active : this.save.questingBeast?.active)?.hpShare); if (share > 0 && share < 1) c.hp = Math.max(1, Math.round(c.maxHp * share)); } // release 423: it keeps the wounds you gave it
      if(e.astralCompanionOf){if(e.astralRole==='ally'){tuneWorldBeast(c,this.save,'voidWalker',characterStats(this.save));delete c.worldBeast;}Object.assign(c,{astralCompanionOf:e.astralCompanionOf,astralRole:e.astralRole,astralAllyOf:e.astralAllyOf,noRewards:!!e.noRewards,astralMountWanted:!!e.astralMountWanted});} // release 235
      if (e.retreating) Object.assign(c, { retreating: true, aggro: true, untargetable: true }); // release 239: fleeing through
      if (area === "overworld" && this.farRealm?.type === "giants") giantify(c); // release 714: the Giants' Reach
      if (area === "overworld" && this.farRealm?.type === "ink" && !c.worldBeast && !c.questingBeast && !c.boss && !c.ambient && !c.stalker) c.farInk = true; // release 719: ink-black
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
      if (e.passingBeast) Object.assign(c, { passingBeast: e.passingBeast, retreating: true, aggro: true, untargetable: true, ambient: true, noRewards: true, fleeTo: { ...e.fleeTo }, fleePath: (e.fleePath || []).map((q) => ({ ...q })), fleeSpeed: e.fleeSpeed }); // release 569: a world beast passing through
      if(e.foundryId){const boss=e.foundryRole==='boss',melee=e.attack==='meleeSwipe';Object.assign(c,{id:e.foundryId,foundryId:e.foundryId,foundryName:e.foundryName,foundryRole:e.foundryRole,foundryModules:[...(e.foundryModules||[])],foundryAttack:e.attack,foundryMovement:e.movement,foundryWeakness:e.weakness,foundryBody:e.body,foundryPalette:Number.isInteger(e.palette)&&e.palette>=0&&e.palette<5?e.palette:null,visualSeed:e.visualSeed,kind:e.kind,maxHp:boss?210:e.foundryRole==='passive'?22:52,hp:boss?210:e.foundryRole==='passive'?22:52,damage:boss?17:e.foundryRole==='passive'?0:10,range:e.foundryRole==='passive'?0:melee?1.25:boss?5.5:5,boss,ambient:e.foundryRole==='passive',scale:boss?1.95:e.foundryRole==='passive'?.92:1.18,bodyRadius:boss?.72:.46,segments:e.body==='segmented'?3:e.foundryRole==='passive'?2:1,tentacles:e.body==='tentacled'||e.body==='biomechanical'?(boss?6:3):0,speedMultiplier:e.movement==='hopping'?1.18:e.movement==='retreating'?.88:e.movement==='hovering'?1.08:1,foundryValidated:true})}
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
      if(area==="dungeon"&&!c.passiveBehavior&&!c.gatePredator&&!e.pentFinaleBeast){ // the Stillworks' beast is tuned as a finale below
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
      if(area === "dungeon" && !c.passiveBehavior && !c.ambient && !c.astralCompanionOf && !e.pentFinaleBeast && !c.worldBeast) tuneDungeonThreat(c);
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
      if (e.fractured) applyFracturedRank(c, e, this.save.seed); // release 651
      if (e.fracWarden) { // release 666: half a Gate Revenant for this Wayfarer, grown huge, a mixed moveset, two affixes, aggressive
        const W = FRACTURE_WARDEN, rev = tuneGatePredator(Object.assign(createCombatant("gateRevenant", 0, 0, false, []), { gatePredator: true }), this.save, characterStats(this.save));
        Object.assign(c, { fracWarden: true, fracKey: e.fracKey, fractured: true, packName: "Fracture Warden", aggro: true, attackGap: W.attackGap, attackCooldownScale: W.cooldownScale, staggerResistance: W.staggerResistance, brain: "duelist", evasive: true });
        c.maxHp = c.hp = Math.max(1, Math.round(rev.maxHp * W.revenantShare)); c.damage = Math.max(1, Math.round(rev.damage * (W.damageShare ?? W.revenantShare))); c.baseDamage = c.damage;
        c.scale = (c.scale || 1) * W.scale; c.baseScale = c.scale; c.bodyRadius = (c.bodyRadius || .38) * W.scale; c.speedMultiplier = (c.speedMultiplier || 1) * W.speed;
        if (c.packKind) { c.packAttacks = wardenAttacks(this.save.seed, e.fracKey || c.id); c.packBossAttacks = []; }
        c.affixes = rollAffixes(`${this.save.seed}:fracture-warden:${c.id}`, W.affixes);
      }
      if (GUARDIAN_ROLES.includes(c.dungeonRole) && !c.affixes && !c.farArrayBoss && !String(this.save.session?.activeDungeonId || '').startsWith('far-array:')) c.affixes = rollAffixes(`${this.save.seed}:guardian:${c.id}`, 1); // release 657: every crossing guardian carries an affix
      if (!e.fracWardenAdd && !e.fracReinforcement && !e.kitAddOf) applyBossKit(c, this.save.seed, (k) => !!MONSTER_PACK[k]); // release 668: guardians and elites fight like boss moments
      if (area === "dungeon" && this.map?.deepFloor && !c.deepScaled) { const f = this.map.deepFloor, k = floorScale(f); c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * k.hp)); c.damage = Math.max(1, Math.round(c.damage * k.damage)); if (c.baseDamage) c.baseDamage = c.damage; c.deepScaled = true; // release 677: harder each floor
        if (GUARDIAN_ROLES.includes(c.dungeonRole)) c.affixes = rollAffixes(`${this.save.seed}:deep:${f}:${c.id}`, guardianAffixes(f)); else if (!c.affixes && !c.ambient && (hashSeed(`${this.save.seed}:deep-affix:${f}:${c.id}`) % 1000) / 1000 < floorAffixShare(f)) c.affixes = rollAffixes(`${this.save.seed}:deep:${f}:${c.id}`, 1); }
      if (area === "dungeon" && this.map?.annexFloor?.floor > 1 && !c.annexScaled) { const k = annexScale(this.map.annexFloor.floor); c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * k.hp)); c.damage = Math.max(1, Math.round(c.damage * k.damage)); if (c.baseDamage) c.baseDamage = c.damage; c.annexScaled = true; } // release 675: each annex floor is harder
      if (area === "dungeon" && this.map?.building && e.buildingGuard && !c.buildingScaled) { const k = buildingScale(this.map.building.floor), G = BUILDINGS.creatures.guardian; c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * k.hp * (e.buildingGuardian ? G.hp : 1))); c.damage = Math.max(1, Math.round(c.damage * k.damage * (e.buildingGuardian ? G.damage : 1))); if (c.baseDamage) c.baseDamage = c.damage; if (e.buildingGuardian) { c.packName = e.keyKeeper ? TOWER_SEAL.keeper.name : `${this.map.building.style === "keep" ? "Keep" : "Arcology"} Guardian`; /* TOWER_SEAL: the tower key's warden */ c.affixes = rollAffixes(`${this.save.seed}:building-guardian:${c.id}`, G.affixes); } if (e.pentBoss) { const B = e.pentBoss, g = e.buildingGuardian ? G : { hp: 1, damage: 1 }; c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp / g.hp * B.hp)); c.damage = Math.max(1, Math.round(c.damage / g.damage * B.damage)); if (c.baseDamage) c.baseDamage = c.damage; c.packName = B.name; c.pentBoss = true; c.affixes = rollAffixes(`${this.save.seed}:pentagon-boss:${c.id}`, B.affixes); } c.buildingScaled = true; c.buildingGuard = true; } // great buildings: each floor up is harder; the top floor's guardian most of all
      if (e.pentFinaleBeast) tunePentagonArenaBeast(c, e.pentFinaleBeast, this.save, characterStats(this.save), beastRegionalThreat(regionalThreat(this.rx, this.ry))); // the Stillworks' finale beast (pentagon-arena.ts)
      if (e.gloomFinale) this.tuneGloomFinale(c, e.gloomFinale); // the Gloomvast: last, so nothing above changes its tuning
      else if (e.kind === GLOOM_FINALE.kind) this.gloomInit(c); // a Gloomvast an arena tuned itself (the Stillworks' roster): its vitals kept, its kit and Dark made ready
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
      maps.push(this.levelSpawns(history, level.id));
    const clear = registerDungeonBosses(history,maps);
    for (const [key,snapshot] of Object.entries(this.save.session.areas || {})) if (key === this.areaId() || key.startsWith(this.areaId()+':level:')) for (const e of snapshot.enemies || [])
      if (e.dead && clear.required.includes(e.id) && !clear.defeated.includes(e.id)) clear.defeated.push(e.id);
    const progress = history.deep;
    for (const id of [...(progress?.defeatedFinalIds || []),...(progress?.defeatedWingIds || []).map(id=>'deep-v1-miniboss-'+id)])
      if (clear.required.includes(id) && !clear.defeated.includes(id)) clear.defeated.push(id);
    for (const map of maps) for (const e of map.enemySpawns || []) if (e.objectiveId && progress?.completedObjectiveIds?.includes(e.objectiveId) && !clear.defeated.includes(requiredBossId(e))) clear.defeated.push(requiredBossId(e));
    clear.completed = clear.required.length > 0 && clear.required.every(id=>clear.defeated.includes(id));
    this.enemies = this.enemies.filter(e => !clear.required.includes(e.id) || !clear.defeated.includes(e.id));
    installCompletionExit(this.map,history); this.placeAnnexStair(history); this.placeDeepStair(history); // release 675; 677
    return clear;
  }
  // Balance pack (tim.md findings 1 and 2): a foe made after its ground loaded (a Fractured wave, a Warden's call, a refill, a
  // new density pack in known ground, a haunt's split or its Gloomgorge) takes the regional scaling a fresh load gives, once.
  scaleToRegion(e) { if (!e || e.threatRing != null || this.map?.skyland) return e; return regionalScale(e, regionalThreat(this.rx, this.ry)); }
  // Release 709: the Crimson Tyrant's claim. Its clock runs in seconds of play while its hunt holds this section, here or not.
  dragonHere() { const q = this.save.worldBeasts?.crimsonTyrant?.active; return !!q && !q.retreat && !q.dungeon && q.rx === this.rx && q.ry === this.ry && this.area === "overworld"; }
  dragonClock() { const r = dragonRecord(this.save, this.rx, this.ry); if (r.nextAt == null) r.nextAt = (Number(this.save.playSeconds) || 0) + DRAGON.colonize.first; return r; }
  dragonCatchUp() { if (!this.dragonHere()) return; const r = this.dragonClock(), now = Number(this.save.playSeconds) || 0; let n = 0;
    while (r.casts < DRAGON.colonize.casts && r.nextAt <= now) { dragonCast(this.save, this.map, this.save.seed, this.rx, this.ry); r.nextAt += DRAGON.colonize.every; n++; }
    if (n) this.message = `While you were away the Crimson Tyrant claimed more of this ground: ${r.casts} of ${DRAGON.colonize.casts}.`; }
  dragonDue() { if (!this.dragonHere()) return false; const r = this.dragonClock(); return r.casts < DRAGON.colonize.casts && (Number(this.save.playSeconds) || 0) >= r.nextAt; }
  dragonLavaNow() { const r = this.dragonClock(), tiles = dragonCast(this.save, this.map, this.save.seed, this.rx, this.ry); r.nextAt = (Number(this.save.playSeconds) || 0) + DRAGON.colonize.every;
    this.message = r.casts >= DRAGON.colonize.casts ? "The last of the floor turns to lava. The Crimson Tyrant has claimed this ground." : `The ground breaks into lava. The Crimson Tyrant has claimed ${r.casts} of ${DRAGON.colonize.casts} parts of it.`; return tiles; }
  // Release 720: the folk realms (FAR_FOLK). The Hollow Kin turn and come in waves; the Tall Country's folk throw spears at monsters.
  // Release 731: the haunts (haunts.ts). A placed Gloomwisp that is hunting splits now and then, `split.max` times (children
  // neither split nor give a reward), up to the area's cap; and once a visit, enough wisps close together pour into a Gloomgorge.
  // Release 737: the haunt curses (HAUNT.curses). Laid by a landed puff or howl (not through a dodge); which ones is hashed from
  // the haunt and how many times it has landed. FRAIL holds back a share of maximum health the way the Stalker's mist does
  // (save.rot) and gives it back when it wears off, is replaced, or the Wayfarer dies.
  layHauntCurses(source, n, now = this.lastUpdateNow || 0) {
    const p = this.player; if (!(n > 0) || p.hp <= 0 || now < (p.dodgeUntil || 0)) return [];
    const list = (p.curses ||= []), hit = source ? (source.hauntHits = (source.hauntHits || 0) + 1) : 0, laid = [];
    for (const id of rollCurses(`${source?.id || "haunt"}:${hit}`, n)) {
      const r = layCurse(list, id, now); if (!r) continue; laid.push(r.curse);
      if (r.dropped) this.curseRelease(r.dropped);
      const def = curseDef(id);
      if (r.fresh && def.maxHp > 0) { ensureRot(this.save); const max = Number(this.save.maxHp) || 1, room = Math.max(0, max - 1 - Math.floor(this.save.rot)), take = Math.min(room, Math.max(1, Math.round(max * def.maxHp)));
        r.curse.rot = take; this.save.rot += take; p.hp = Math.min(p.hp, healthCeiling(this.save)); }
    }
    if (laid.length) this.message = (this.message === HAUNT.text.confused ? `${this.message} ` : "") + laid.map((c) => curseDef(c.id).text).join(" ");
    return laid;
  }
  curseRelease(c) { if (c?.rot > 0) { ensureRot(this.save); this.save.rot = Math.max(0, this.save.rot - c.rot); c.rot = 0; } }
  curseTick(now) { const list = this.player.curses; if (!list?.length) return; for (const c of expireCurses(list, now)) this.curseRelease(c); }
  // Resting (clearRot) already gave the health back. Death and Wayglass travel clear the curses (clearCarriedStates).
  curseRested() { for (const c of this.player.curses || []) c.rot = 0; }
  clearCurses() { for (const c of this.player.curses || []) this.curseRelease(c); this.player.curses = []; }
  // True (with a brief message) when a haunt curse forbids `action` now: "shoot", "attack", "jump", "dodge", "tools", "spells", "items".
  cursed(action, now = this.lastUpdateNow || 0) {
    const c = curseBlocking(this.player.curses, action, now); if (!c) return false;
    const n = this._curseNag; if (!n || n.id !== c.id || now - n.at >= HAUNT.curse.nag * 1000 || now < n.at) { this._curseNag = { id: c.id, at: now }; this.message = curseDef(c.id).text; }
    this.curseFlash = { id: c.id, at: now }; return true;
  }
  // The Pentagon roofs' dwellers (roof-dwellers.ts): made for this section of the Pentagon from its id, regionally scaled (the one
  // helper) and tuned to the Wayfarer, and kept asleep outside the enemy list.
  roofSleepers() {
    const P = this.map?.pentagon; if (!P?.base) return [];
    const slain = this.save.consequences?.dungeons?.[`${P.base}:f1`]?.roofSlain || [], ref = liveBeastReference(this.save, characterStats(this.save));
    return roofSpawns(this.map, P, this.rx, this.ry, slain).map((q) => { const c = tuneDweller(this.scaleToRegion(this.createEnemyFromSpawn(q, "overworld")), ref); return Object.assign(c, { roofDweller: true, roofBase: q.roofBase, roofHome: { ...q.roofHome }, aggro: false }); });
  }
  roofStep(dt) {
    if (!this.roofDwell || this.area !== "overworld" || !(dt > 0)) return null;
    const r = roofTick({ map: this.map, player: this.player, enemies: this.enemies, roof: this.roofDwell }, dt); if (!r) return null;
    if (r.woke.length) { const codex = (this.save.codex ||= { creatures: {}, places: {}, features: {} }); codex.creatures ||= {}; for (const e of r.woke) codex.creatures[e.kind] = true; if (!this.roofDwell.told) { this.roofDwell.told = true; this.message = ROOF_DWELLERS.text.wake; } }
    return r;
  }
  hauntTick(dt, now) {
    const wisps = this.enemies.filter((e) => e.kind === "gloomwisp" && !e.dead && e.hp > 0); if (!wisps.length) return;
    this._hauntCheck = (this._hauntCheck || 0) - dt;
    for (const w of wisps) { if (!w.aggro || w.hauntChild || (w.splits || 0) >= HAUNT.split.max) continue; w.splitIn = (w.splitIn ?? splitDelay(w.id, w.splits || 0)) - dt;
      if (w.splitIn <= 0 && wisps.length < HAUNT.split.cap) { w.splits = (w.splits || 0) + 1; w.splitIn = splitDelay(w.id, w.splits); const a = ((hashSeed(`${w.id}:${w.splits}`) % 628) / 100), R = HAUNT.split.range;
        const c = this.scaleToRegion(this.createEnemyFromSpawn({ id: `${w.id}:s${w.splits}`, kind: "gloomwisp", x: w.x + Math.cos(a) * R, y: w.y + Math.sin(a) * R, traits: [] })); Object.assign(c, { aggro: true, noRewards: true, hauntChild: true }); this.enemies.push(c); wisps.push(c); } }
    if (this._hauntCheck > 0) return; this._hauntCheck = HAUNT.merge.check;
    if (this.hauntGorged || this.enemies.some((e) => e.kind === "gloomgorge" && !e.dead)) return; // one per visit
    const knot = hauntKnot(wisps); if (!knot) return;
    for (const w of knot.wisps) { w.dead = true; w.hp = 0; w.noRewards = true; w.merged = true; }
    const g = this.scaleToRegion(this.createEnemyFromSpawn({ id: `${knot.wisps[0].id}:gorge:${Math.round(now)}`, kind: "gloomgorge", x: knot.x, y: knot.y, traits: [] })), pooled = knot.wisps.reduce((n, w) => n + Math.max(0, Number(w.maxHp) || 0), 0);
    if (pooled > g.maxHp) g.maxHp = g.hp = Math.round(pooled); /* balance pack (tim.md 2): at least the wisps it swallowed */ g.aggro = true; this.enemies.push(g); this.hauntGorged = true;
    this.message = HAUNT.text.merge; return g;
  }
  // The Gloomvast (haunts.ts GLOOM_FINALE; the Pentagon finale's haunt). Tuned to the Wayfarer as they stand (the live
  // reference with their real level and health, not the Stage 1 hold or the beasts' starter floors): health and damage from GLOOM_FINALE.vitals, scaled by the arena's `hpScale` and
  // `damageScale`. Its kit is its own: no hybrid attack, no guardian kit, no affixes.
  tuneGloomFinale(c, o = {}) {
    const V = GLOOM_FINALE.vitals, def = MONSTER_PACK[GLOOM_FINALE.kind], stats = characterStats(this.save), live = liveBeastReference(this.save, stats);
    const v = gloomVitals({ ...live, level: Math.max(1, Number(this.save.level) || 1), maxHp: Math.max(1, Number(this.save.maxHp) || stats.maxHp || 60) }, o); // the Wayfarer as they are: their own level and health, not the beasts' starter floors
    Object.assign(c, { gloomFinale: { v: GLOOM_FINALE.version, name: o.name || null, hpScale: o.hpScale || 1, damageScale: o.damageScale || 1 }, hp: v.hp, maxHp: v.hp, damage: v.damage, baseDamage: v.damage,
      staggerResistance: V.staggerResistance, attackGap: V.attackGap, attackCooldownScale: V.cooldown, speedMultiplier: V.speed, packName: o.name || def.name });
    return this.gloomInit(c);
  }
  // Its body, kit and Dark state, for any Gloomvast however its vitals were set (tuneGloomFinale, or an arena's own tuning such as
  // the Stillworks' tunePentagonArenaBeast, whose health, damage and ring are kept). It never springs aside (`evasive`): the Dark is its evasion.
  gloomInit(c) {
    const V = GLOOM_FINALE.vitals, def = MONSTER_PACK[GLOOM_FINALE.kind];
    Object.assign(c, { boss: true, scale: V.scale, baseScale: V.scale, bodyRadius: .38 + (V.scale - 1) * .3, telegraphScale: 1, evasive: false,
      hybridAttack: null, hybridDonor: null, packAttacks: [...def.attacks], packBossAttacks: [], kitMoves: [],
      gloomSeed: hashSeed(`${this.save.seed}:${c.id}:gloom-v1`), gloomDarks: 0, gloomDark: null, gloomVeil: false, gloomGap: 0, gloomFade: 0, gloomReel: 0 });
    delete c.kitRole; delete c.affixes; delete c.eliteId; return c;
  }
  // Spawns the Gloomvast at (x, y) now, for an arena that calls it up at run time (an arena that lays its foes on the map puts
  // gloomFinaleSpawn(id, x, y, opts) in map.enemySpawns instead). Regionally scaled once, aggressive at once. Returns it.
  spawnGloomFinale(x, y, opts = {}) {
    const id = opts.id || `${this.areaId()}:gloomvast`, have = this.enemies.find((e) => e.id === id && !e.dead); if (have) return have;
    const c = this.scaleToRegion(this.createEnemyFromSpawn(gloomFinaleSpawn(id, x, y, opts)));
    if (opts.aggro !== false) c.aggro = true; this.enemies.push(c); ((this.save.codex ||= {}).creatures ||= {})[GLOOM_FINALE.kind] = true; return c;
  }
  gloomSpots(c, n, key) { return gloomOrbSpots(this.map, mapWidth(this.map, this.area), c, n, `${this.save.seed}:${key}`); }
  // One decoy of the Gloomvast's Dark: a cold light with its health (so no blow bursts it), a share of its damage, its body
  // size (so it is struck as easily), its regional ring (scaled once, through it), no reward. At most darkness.cap alive.
  spawnGloomOrb(owner, x, y, tag, brain) {
    const D = GLOOM_FINALE.darkness; if (!owner || this.enemies.filter((q) => !q.dead && q.gloomOrbOf === owner.id).length >= D.cap) return null;
    const c = createCombatant(GLOOM_FINALE.orbKind, x, y, false, []), hp = Math.max(1, Math.round((Number(owner.maxHp) || 1) * D.decoyHp));
    Object.assign(c, { id: `${owner.id}:shade:${tag}`, gloomOrbOf: owner.id, summonedBy: owner.id, noRewards: true, aggro: true, gloomVeil: true, hp, maxHp: hp, gloomHp: hp, damage: Math.max(1, Math.round((Number(owner.damage) || 1) * D.decoyDamage)), brain: brain || "orbit", bodyRadius: owner.bodyRadius, threatRing: owner.threatRing ?? 0, xpMultiplier: 0 });
    ensureAI(c); this.enemies.push(c); return c;
  }
  // A light pack world for ending a Dark outside the creatures' own update.
  gloomWorld(now = this.lastUpdateNow || 0) { return { enemies: this.enemies, player: this.player, dt: 0, now, addEffect: (f) => addPackEffect(this.packEffects ||= [], f, now), say: (m) => { if (m) this.message = m; } }; }
  // Every frame: a fallen Gloomvast's Dark ends at once; decoys whose Dark is over (or whose Gloomvast is gone) go.
  gloomTick(now) {
    let spent = false;
    for (const e of this.enemies) {
      if (e.kind === GLOOM_FINALE.kind && e.gloomDark && (e.dead || !(e.hp > 0))) gloomDarkEnd(e, this.gloomWorld(now), false);
      if (e.gloomOrbOf && !e.dead && !this.enemies.some((q) => q.id === e.gloomOrbOf && !q.dead && q.gloomDark)) { e.dead = true; e.noRewards = e.rewarded = true; }
      if (e.gloomOrbOf && e.dead) spent = true;
    }
    if (spent) this.enemies = this.enemies.filter((e) => !(e.gloomOrbOf && e.dead));
  }
  // A decoy keeps only `decoyTake` of each blow that landed since the last frame (at least 1), whatever struck it.
  gloomMend() {
    const take = GLOOM_FINALE.darkness.decoyTake;
    for (const q of this.enemies) { if (!q.gloomOrbOf || q.dead) continue; const was = Number.isFinite(q.gloomHp) ? q.gloomHp : q.hp, lost = was - q.hp; if (lost > 0) q.hp = Math.max(1, was - Math.max(1, Math.round(lost * take))); q.gloomHp = q.hp; }
  }
  // Ends every Dark here at once (the Wayfarer leaves, dies or travels): no decoys stay, the dark does not linger.
  endGloomDarks() {
    if (!this.enemies?.some((e) => e.kind === GLOOM_FINALE.kind && (e.gloomDark || e.gloomFade > 0 || e.gloomVeil))) return;
    const w = this.gloomWorld();
    for (const e of this.enemies) if (e.kind === GLOOM_FINALE.kind) { if (e.pack?.attack === "vastDark") { e.pack.attack = null; e.pack.phase = null; e.pack.tele = null; e.pack.state = "move"; } gloomDarkEnd(e, w, false); e.gloomFade = 0; }
    this.enemies = this.enemies.filter((e) => !e.gloomOrbOf);
  }
  // What the renderer darkens: { level 0..1, light } for the darkest Gloomvast here, or null. Never while the Wayfarer lies fallen.
  gloomDarkness() {
    if (this.fallen || !(this.player?.hp > 0)) return null; let level = 0;
    for (const e of this.enemies || []) if (e.kind === GLOOM_FINALE.kind) level = Math.max(level, gloomDarkLevel(e));
    if (!(level > 0)) return null; const o = (this._gloomDarkOut ||= { level: 0, light: GLOOM_FINALE.darkness.light }); o.level = level; return o; // one object, reused each frame
  }
  // Release 723: in a domain, its beast comes once the Wayfarer has waited there long enough this visit (at once on the visit that
  // completes the quest). A Questing Beast hunting elsewhere leaves that section for its own; one already here is just fought.
  domainTick(dt) {
    const v = this.domainVisit; if (!v || v.done || this.area !== "overworld" || !this.map?.farDomain) return;
    if (this.enemies.some((e) => (v.id === "questingBeast" ? e.questingBeast : e.worldBeast === v.id) && !e.dead)) { v.done = true; return; }
    v.clock += dt; if (v.clock < v.wait) return;
    v.done = true; return this.summonDomainBeast();
  }
  summonDomainBeast() {
    const id = this.map?.farDomain; if (!id) return null;
    if (id !== "questingBeast") { // release 724: a world beast comes home: its hunt (if any) moves here, its tries kept
      const B = WORLD_BEASTS[id]; if (!B || !beastOpenFor(this.save, id) || !beastRoamsAt(id, this.rx, this.ry)) return null; /* BEAST_HOMELANDS: never inside a homeland line (the domains all lie beyond it) */ ensureBeastsFor(this.save, false); const q = this.save.worldBeasts[id];
      q.active = { rx: this.rx, ry: this.ry, tries: q.active?.tries || 0, ...(q.active?.hpShare ? { hpShare: q.active.hpShare } : {}) }; q.cooldown = 0; const at = domainArrival(this.map, this.player);
      const e = this.createEnemyFromSpawn({ id: `world-beast:${id}:${q.cycle}`, kind: B.kind, x: at.x, y: at.y, boss: true, worldBeast: id, traits: [] }, "overworld"); e.aggro = true;
      this.enemies.push(e); this.message = FAR_DOMAINS[id].comes; return e;
    }
    ensureQuestingBeast(this.save); const q = this.save.questingBeast;
    if (q.active && (q.active.rx !== this.rx || q.active.ry !== this.ry)) { q.active.rx = this.rx; q.active.ry = this.ry; } else if (!q.active) q.active = { rx: this.rx, ry: this.ry, tries: 0 };
    q.cooldown = 0; const at = domainArrival(this.map, this.player);
    const e = this.createEnemyFromSpawn({ id: `questing-beast:${q.cycle}`, kind: "questingBeast", x: at.x, y: at.y, boss: true, questingBeast: true, traits: [] }, "overworld"); e.aggro = true;
    this.enemies.push(e); this.message = FAR_DOMAINS.questingBeast.comes; return e;
  }
  folkTick(dt, now) {
    const kind = this.area === "overworld" && this.map?.farFolk; if (!kind) return; const F = FAR_FOLK, p = this.player, st = (this.folkState ||= { map: null });
    if (st.map !== this.map) Object.assign(st, { map: this.map, turned: false, wave: 0, mine: [], at: 0, done: false });
    const folk = (this.map.objects || []).filter(isFolk);
    if (kind === "monster") {
      const spawn = (x, y, i) => { const c = this.createEnemyFromSpawn({ id: `hollow-kin:${this.rx}:${this.ry}:${st.wave}:${i}`, kind: F.kinds[hashSeed(`${this.save.seed}:hollow:${this.rx}:${this.ry}:${st.wave}:${i}`) % F.kinds.length], x, y, packOverworld: true }); c.aggro = true; this.enemies.push(c); st.mine.push(c); };
      if (!st.turned) { if (!folk.some((o) => Math.hypot(o.x - p.x, o.y - p.y) <= F.reveal)) return;
        st.turned = true; st.wave = 1; st.at = now; folk.forEach((o, i) => spawn(o.x, o.y, i)); this.map.objects = this.map.objects.filter((o) => !isFolk(o)); this.map.travelers = null; this.message = F.turn; return; }
      if (st.done) return; const left = st.mine.filter((e) => !e.dead).length;
      if (left < F.next && now - st.at >= F.gap * 1000) { if (st.wave >= F.waves) { if (!left) { st.done = true; this.message = F.done; } return; }
        st.wave++; st.at = now; const w = mapWidth(this.map, this.area), edge = (this.map.tiles || []).filter((t) => !t.blocked && (t.x === 2 || t.y === 2 || t.x === w - 3 || t.y === 29) && footprintOpen(this.map, w, t.x, t.y));
        for (let i = 0; i < F.waveSize && edge.length; i++) { const t = edge[hashSeed(`${this.save.seed}:hollow-edge:${this.rx}:${this.ry}:${st.wave}:${i}`) % edge.length]; spawn(t.x, t.y, i); } this.message = F.wave; }
      return; }
    // the Tall Country: spears at whatever hostile thing comes near its folk
    const W = this.glyphWorld(now);
    for (const o of folk) { o.folkGiant = true; o.spearAt ??= now + (hashSeed(o.id || `${o.x},${o.y}`) % 1000);
      if (now < o.spearAt) continue; o.spearAt = now + F.spear.every * 1000;
      const foe = this.enemies.filter((e) => !e.dead && !e.untargetable && !e.ambient && !e.noRewards && Math.hypot(e.x - o.x, e.y - o.y) <= F.spear.range).sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))[0];
      if (!foe) continue; W.arc({ x: o.x, y: o.y - 1 }, foe, "#efe2b8"); W.damage(foe, Math.max(F.spear.min, Math.round((foe.maxHp || 40) * F.spear.share))); }
  }
  // Release 714: the Briar Stag and the Stalker, when they meet, forget the Wayfarer and play (BEAST_PLAY).
  beastPlay(dt, now) {
    const P = BEAST_PLAY, s = (this.beastPlayState ||= { until: 0, next: 0, a: 0 }), stag = this.enemies.find((q) => q.kind === "briarStag" && !q.dead && !q.retreating), cat = this.enemies.find((q) => q.stalker && !q.dead);
    const stop = () => { s.until = 0; for (const q of this.enemies) q.playing = false; }; // every one: a stag that turned to retreat mid-play is no longer `stag` here (release 719 fix)
    if (!stag || !cat || this.area !== "overworld") { if (s.until) stop(); return; }
    if (s.until && now >= s.until) { stop(); s.next = now + P.gap * 1000; this.message = P.end; return; }
    if (!s.until) { if (now < s.next || Math.hypot(stag.x - cat.x, stag.y - cat.y) > P.range) return;
      s.until = now + P.time * 1000; s.cx = (stag.x + cat.x) / 2; s.cy = (stag.y + cat.y) / 2; s.a = Math.atan2(stag.y - s.cy, stag.x - s.cx); this.message = P.start;
      for (const q of [stag, cat]) { q.playing = true; if (q.pack) Object.assign(q.pack, { attack: null, phase: null, tele: null, state: "move", data: null }); q.stagPose = null; q.untargetable = false; q.aloft = false; } }
    s.a += dt * P.spin; const w = mapWidth(this.map, this.area);
    [[stag, 0], [cat, Math.PI]].forEach(([q, off]) => { const tx = s.cx + Math.cos(s.a + off) * P.radius, ty = s.cy + Math.sin(s.a + off) * P.radius * .7, dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy), st = Math.min(d, P.speed * dt);
      if (d > .01) { moveAxis(q, dx / d * st, 0, this.map, w); moveAxis(q, 0, dy / d * st, this.map, w); } q.facingX = (q === stag ? cat : stag).x >= q.x ? 1 : -1; q.hopLift = Math.abs(Math.sin(s.a * 2 + off)) * .6; });
    stag.stagPose = Math.sin(s.a * 1.5) > .6 ? "lower" : null;
  }
  // Release 710: the Doom Chaser's frenzy (FRENZY). Its hits build it; once it holds, land FRENZY.cure blows on it or it bursts.
  frenzyHit(now, n = 1) {
    if (this.player.hp <= 0) return; const f = (this.frenzy ||= { build: 0, active: false });
    if (f.active) return; f.build += n; f.forget = FRENZY.forget;
    if (f.build >= FRENZY.build) { Object.assign(f, { active: true, left: FRENZY.time, cure: 0 }); this.message = `The frenzy takes hold! Land ${FRENZY.cure} blows on the Doom Chaser to throw it off.`; }
  }
  frenzyBlow(e) { const f = this.frenzy; if (f?.active && e?.kind === "doomChaser" && !e.dead) f.cure = (f.cure || 0) + 1; }
  frenzyTick(dt) {
    const f = this.frenzy; if (!f) return; const d = this.enemies.find((q) => q.kind === "doomChaser" && !q.dead), p = this.player;
    if (!f.active) { f.forget -= dt; if (f.forget <= 0 || !d) this.frenzy = null; return; }
    if (!d || p.hp <= 0) { this.frenzy = null; return; }
    f.left -= dt; // balance pack (C10): only the Wayfarer's own blows count toward the cure (frenzyBlow), not any drop in health
    if (f.cure >= FRENZY.cure) { this.frenzy = null; this.message = "You throw the frenzy off."; return; }
    if (f.left <= 0) { this.frenzy = null; p.hp = Math.max(0, p.hp - Math.max(1, Math.ceil((this.save.maxHp || p.maxHp || 100) * FRENZY.burst * (1 - Math.min(.75, characterStats(this.save).damageReduction)) * hurtScale(this.save)))); this.message = "The frenzy bursts inside you!"; }
  }
  // Release 708: the chrysalis falls and the Ashen Moth hatches where it hung; its hunt starts in this section.
  hatchMoth(e) {
    const q = this.save.worldBeasts?.ashenMoth; if (!q || q.active) return null;
    q.active = { rx: this.rx, ry: this.ry, tries: 0 }; encounterMet(this.save);
    const m = this.createEnemyFromSpawn({ id: `world-beast:ashenMoth:${q.cycle}`, kind: "ashenMoth", x: e.x, y: e.y, boss: true, worldBeast: "ashenMoth", traits: [] });
    m.aggro = true; this.enemies.push(m); this.message = CHRYSALIS.hatch;
    (this.questNotices ||= []).push({ title: "THE ASHEN MOTH", detail: `hatched · ${WORLD_BEASTS.ashenMoth.tries} tries`, kind: "discovery" });
    return m;
  }
  // Up in a great tree, the Moth only harries the Wayfarer; on the ground it fights with everything (release 708).
  mothHarass() {
    const m = this.enemies.find((q) => q.kind === "ashenMoth" && !q.dead); if (!m) return;
    const w = mapWidth(this.map, this.area), t = this.area === "overworld" && this.map?.canopy ? tileUnder(this.map, w, this.player.x, this.player.y) : null, up = !!(t?.canopy && t.elev > 0);
    if (!m.mothFullKit) m.mothFullKit = [...(m.packAttacks || MONSTER_PACK.ashenMoth.attacks)]; if (up !== !!m.mothHarassing) { m.packAttacks = up ? m.mothFullKit.filter((id) => CHRYSALIS.harass.includes(id)) : [...m.mothFullKit]; m.mothHarassing = up; }
  }
  defeatEnemy(e) {
    this.syncAstralClone(e);
    if (e.rewarded) return;
    if (!e.summonedBy && !e.illusion && !e.astralCompanionOf) { const kh = armorGlyphBonus(this.save).killHeal; if (kh > 0) this.player.hp = Math.min(this.save.maxHp || this.player.hp, this.player.hp + Math.max(1, Math.round((this.save.maxHp || 60) * kh))); } // a Tesseract glyph: health back on a kill
    if (e.pentBoss && this.area === "dungeon" && this.map?.building?.pentagon && this.map.building.V >= 3) this.pentagonChampionDown(e); // the Pentagon's champions and the Regent (v3)
    if (this.area === "dungeon" && String(e.id).endsWith(":guardian") && this.map?.objects?.some((o) => o.dir === "roofExit")) this.openRoofExit(true); // release 746: the vault's guardian falls, its roof exit opens
    if (this.area === "dungeon" && String(e.id).endsWith(":guardian") && !e.illusion && !e.summonedBy && this.map?.building?.pentagon && this.map.building.vault) this.openPentagonFinale(); // the Regent falls: the vault's wall opens (PENTAGON.finale)
    if (e.pentFinaleBeast && this.area === "dungeon" && this.map?.pentArena && !e.summonedBy && !e.illusion && !e.noRewards) this.pentagonArenaWon(e); // the Stillworks' beast falls: the seam opens (pentagon-arena.ts)
    if (e.roofDweller && e.roofBase) { const H = dungeonHistory(this.save, `${e.roofBase}:f1`); H.roofSlain = [...new Set([...(H.roofSlain || []), e.id])]; } // a roof dweller slain stays slain
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
    if (e.farArrayBoss && this.area === "dungeon" && isArrayRun(this.areaId())) { const listener = e.farArrayBoss === "listener", text = (listener ? listenerFelled(this.save) : guardianFelled(this.save)) + (listener ? latticeNote(this.save) + townNote(this.save) : ""); if (listener && beastCatchUp(this.save, liveBeastReference(this.save, characterStats(this.save)))) journalOnce(this.save, `beast-catch-up:${this.save.farArray.listeners}`, "With the Listener fallen, the great beasts of the Corridor rise to meet your strength.", "World beasts"); /* release 331 */ journalOnce(this.save, `far-array:${this.save.farArray.runs}`, text, "The Far Gate"); this.defeatNotice = { title: listener ? "THE LISTENER FALLS" : LISTENER_CYCLE.sealsCall ? "A SEAL BREAKS" : "THE GUARDIAN FALLS", detail: text, kind: "danger" }; this.message = text; }
    if (e.mothChrysalis) this.hatchMoth(e); // release 708
    if (e.worldBeast === TURTLE_SHELL.beast && this.save.worldBeasts?.[e.worldBeast]) this._shellCycle = this.save.worldBeasts[e.worldBeast].cycle; // the kill's cycle, before the fall advances it
    if (e.worldBeast && WORLD_BEASTS[e.worldBeast]) { const B = WORLD_BEASTS[e.worldBeast], won = worldBeastSlain(this.save, e.worldBeast); journalOnce(this.save, `world-beast-slain:${e.worldBeast}:${this.save.worldBeasts[e.worldBeast].slain}`, `You slew ${B.name} at ${this.rx},${this.ry}.`, B.name); this.defeatNotice = { title: "ARCHFIEND SLAIN", detail: `${B.name} · +${won.marks} marks`, kind: "danger" }; this.message = won.message; if (e.worldBeast === TURTLE_SHELL.beast) this.restTurtleShell(e, this._shellCycle); } // release 235
    if (e.worldBeast) { const civ = openFarQuest(this.save, e.worldBeast, this.rx, this.ry); if (civ) { const C = farQuestInfo(civ); journalOnce(this.save, `far-quest:${civ}`, C.quest, C.name); (this.questNotices ||= []).push({ title: C.name.toUpperCase(), detail: "a new quest · follow your compass", kind: "discovery" }); } } // release 716
    if (e.stalker) { const won = stalkerSlain(this.save); if (ECHOES.stalker && this.save.echoes?.owned && !this.save.echoes.owned.stalker) { this.save.echoes.owned.stalker = true; won.echo = "stalker"; } /* release 699: Stalker's Mist */ for (let i = 0; i < STALKER.reward.drops; i++) this.obtainDrop("stalker"); for (const q of this.enemies) if (q.stalkerOf === e.id && !q.dead) { q.dead = true; q.noRewards = true; } journalOnce(this.save, `stalker-slain:${this.save.stalker.kills}`, `You killed the Stalker at ${this.rx},${this.ry}. It will hunt again, in time.`, "The Stalker"); this._stalkerWon = won; } // release 678
    if (e.questingBeast) { const won = questingBeastSlain(this.save); journalOnce(this.save, `questing-beast-slain:${this.save.questingBeast.slain}`, `You slew the Questing Beast at ${this.rx},${this.ry}.`, "The Questing Beast"); this.defeatNotice = { title: "ARCHFIEND SLAIN", detail: `The Questing Beast · +${won.marks} marks`, kind: "danger" }; this.message = won.message; const dom = openFarQuest(this.save, "questingBeast", this.rx, this.ry); if (dom) { const D = FAR_DOMAINS[dom]; journalOnce(this.save, `far-quest:${dom}`, D.quest, D.name.replace(/^the /, "The ")); (this.questNotices ||= []).push({ title: D.name.toUpperCase(), detail: "a new quest · follow your compass", kind: "discovery" }); } } // 723: far out, it opens the quest to its domain
    if (!e.ambient && !e.noRewards) { const done = wandererKill(this.save); if (done) { this.message = done; journalOnce(this.save, `wanderer-done:${this.save.wanderer.stage}`, done, "Old Quillon"); } }
    if (e.ambient) {
      e.rewarded = true;
      this.message = e.kind === "hushling" ? "The hushling unthreads into violet motes." : "The quiet creature falls. Nothing in it was meant as loot.";
      return;
    }
    if(this.area==='dungeon') recordDungeonBossDefeat(dungeonHistory(this.save,this.areaId()),e);
    if (!((e.worldBeast && WORLD_BEASTS[e.worldBeast]) || e.questingBeast || (e.pentFinaleBeast && this.map?.pentArena))) this.defeatNotice = enemyDefeatNotice(e, this.area); // a world boss keeps its own notice (Tim: "it should say archfiend slain")
    if (e.stalker && this._stalkerWon) { const won = this._stalkerWon; this._stalkerWon = null; this.defeatNotice = { title: "THE STALKER FALLS", detail: `+${won.marks} marks · a ${won.sphere === "weaponSphere" ? "weapon" : "armor"} sphere · it will hunt again after ${won.quiet} new sections${won.echo ? ` · an Echo: ${ECHOES[won.echo].name}` : ""}`, kind: "danger" }; } // release 678
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
        const deepFirst = this.map.deepFloor ? this.deepFloorCleared() : true; // release 677: the Deep pays its cache only the first time a floor is cleared
        if (deepFirst || !THE_DEEP.payoffOnce) claimDungeonPayoff(this.save,history,!!this.map.deepDungeon || this.map.recipe === 'deep-v1');
        journalOnce(this.save,`expedition-cleared:${this.areaId()}`,`${this.map.name} is cleared. Every required guardian fell; the expedition cache yielded upgrade material, marks and a draught. The return lattice leads to the entrance.`,this.map.name);
        installCompletionExit(this.map,history,e); if (this.placeAnnexStair(history)) this.annexStairNote = true; // release 675
        this.message = 'EXPEDITION CLEARED — reward secured. Interact with the Cleared Expedition Return to leave safely.';
        if (this.annexStairNote) { this.annexStairNote = false; const st = this.map.objects.find((o) => o.kind === 'annexStair'); if (st) { this.message = `${DEEP_ANNEX.messages.stair} ${st.floor} of ${DEEP_ANNEX.floors}. Or take the Cleared Return to leave; the annex waits.`; this.defeatNotice = { title: 'THE ANNEX STAIR OPENS', detail: `down to floor ${st.floor} of ${DEEP_ANNEX.floors} · or leave by the Cleared Return`, kind: 'discovery' }; } } // release 675
        this.defeatNotice.detail += ' · completion reward · entrance return opened';
      }
    }
    if (e.seaKind && leviathanTrophy(this.save, e.seaKind)) {
      journalOnce(this.save, `leviathan:${e.seaKind}`, `The ${e.name} is felled. The sea is quieter for it.`, e.name);
      this.defeatNotice = { title: "LEVIATHAN FELLED", detail: `${e.name} · first trophy: ${LEVIATHAN_TROPHY.currency} marks and a weapon sphere`, kind: "danger" };
    }
    e.rewarded = true;
    const fracture = this.fractureOnKill(e); // release 666
    const quelled = this.area === "dungeon" && this.labQuellOnKill(e); // LAB_BURROW: a labyrinth room's warden falls
    const marks = e.boss ? ECONOMY.marks.boss : e.apertureEncounter ? ECONOMY.marks.aperture : ECONOMY.marks.common; // release 607: was 12 / 6 / 1-3
    this.save.currency += marks;
    const oldHp = this.save.maxHp,
      oldStamina = this.save.maxStamina,
      levels = awardExperience(this.save, Math.round((e.seaKind ? SEA_CREATURES[e.seaKind].xp : e.boss ? 35 : 10) * Math.max(1, Number(e.xpMultiplier) || 1) * rankXp(e))); // 651: champions and rares give more // release 399: harder (farther, deeper) foes give more
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
    if (!e.fracReinforcement || hashSeed(`${this.save.seed}:frac-drop:${this.save.dropCounter}:${e.id}`) % 100 < FRACTURED.trashDrop * 100) this.obtainDrop(e.kind); // release 651: a reinforcement seldom drops
    if (e.fracRank) for (let i = 0; i < (e.fracRank === "rare" ? 2 : 1); i++) this.obtainDrop(e.kind); // champions and rares drop more
    if (!e.summonedBy && !e.noRewards) { const g = glyphDrop(this.save, `${this.areaId()}:${e.id}`, this.save.dropCounter, e.boss || isCrossingGuardian(e)); if (g) this.glyphNotice = `${GLYPHS[g].name} glyph recovered.`; }
    echoEvent(this, "kill", this.lastUpdateNow || 0, { enemy: e });
    onConstellationKill(this);
    const firstSpoils = takeFirstSpoils(this.save, e); // release 263: a world beast's first kill: its Sigil and Echo for certain
    const echo = echoDrop(this.save, e, e.boss || isCrossingGuardian(e) || !!e.worldBeast || !!e.questingBeast, this.save.dropCounter, firstSpoils), echoNote = echo ? `An Echo lingers: ${ECHOES[echo].name}. Set it in the Echoes screen (Pack).` : "";
    if (echo) this.glyphNotice = echoNote;
    if (e.hordeOf) { const r = hordeKill(this.save, dungeonHistory(this.save, e.hordeOf)); if (r) { this.glyphNotice = r.message; if (r.sigils) { const c = (this.save.consumables ||= {}); c.crossingSigil = (c.crossingSigil || 0) + r.sigils; } /* release 273: a Sigil at the end of each wave */ if (r.cleared) { if (r.unlocked) r.message += latticeNote(this.save) + townNote(this.save); /* 2026-11-05: a horde's piece can unlock the Gate */ this.glyphNotice = r.message; this.defeatNotice = { title: "THE HORDE IS BROKEN", detail: r.message, kind: "danger" }; journalOnce(this.save, `horde-cleared:${e.hordeOf}`, r.message, "The Gate Revenant horde"); } } } // release 269
    if (!e.hordeOf) { const sigils = sigilDrop(this.save, e, this.map, this.save.dropCounter, firstSpoils); if (sigils) { const c = (this.save.consumables ||= {}); c.crossingSigil = (c.crossingSigil || 0) + sigils; this.glyphNotice = `A Crossing Sigil falls from ${e.packName || e.name || "the fallen"}.${echoNote ? " " + echoNote : ""}`; } } // release 263 (269: none from a horde Revenant)
    if (!levels) this.message = `Recovered ${marks} mark${marks === 1 ? "" : "s"} from the fallen creature.`;
    if (fracture) { if (fracture.title) this.defeatNotice = { title: fracture.title, detail: fracture.detail, kind: "discovery" }; this.message = fracture.message; } // release 666
    if(this.save.narrative.facts['leads.active']){this.save.worldFlags['lead.hunt.count']=(this.save.worldFlags['lead.hunt.count']||0)+1;if(this.save.worldFlags['lead.hunt.count']>=5)progressLead(this.save,'hunt');if(isCrossingGuardian(e))progressLead(this.save,'guardian')}
    const key = `drop:v1:${this.areaId()}:${e.id}`;
    if (!e.fracReinforcement && !this.save.worldFlags[key]) { // release 651: reinforcements leave no lasting flag
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
    if (quelled) this.message = `${this.message ? this.message + " " : ""}${LAB_BURROW.messages.quelled}`;
  }
  // Release 696: nothing is swung, shot or cast from inside an enclosure (Tim: "you can't attack out of it").
  penned(now = 0) { if (this.area !== "overworld" || !playerEnclosure(this)) return false; if (now > (this.penNoticeAt || 0)) { this.penNoticeAt = now + 2500; this.message = "No room to fight in the enclosure: dodge out of its open side (items still work)."; } return true; }
  closeViewActionEligible() {
    const m=this.map,b=m?.building,p=this.player,interior=!!b&&!b.finale&&(!m.landscape||(interiorTerrain(m)&&m.tiles?.length<=4096&&m.width<=64&&m.height<=64))&&!m.stillworks&&!m.skyCloud&&!m.movers?.length&&!m.canopy;
    if(this.save.closeView!==true||this.area!=="dungeon"||!interior||!p||!(p.hp>0))return false;
    const w=Math.max(1,Number(m.width)||32),t=m.tiles?.[Math.floor(p.y+.75)*w+Math.floor(p.x+.5)];return !(t&&(t.courtyard===true||t.openAir===true||t.pentRoof===true||t.pentBalcony===true||t.kind==="yardGrass"));
  }
  closeViewAttackBufferEligible(now = 0) {
    return this.closeViewActionEligible() && !this.fistsEquipped() && this.save.activeWeaponSlot !== "secondary"
      && !this.cursed("attack", now) && !this.penned(now);
  }
  ordinaryCloseViewBody() {
    const active = this.save.magicSkills?.active;
    return this.closeViewActionEligible() && !this.mechUp() && !this.mountRide() && !aboard(this.save)
      && !(active?.id === 'ember-form' && active.remaining > 0);
  }
  noteHurtVisualImpact() {
    if (this._hurtVisualWitness === false && this.ordinaryCloseViewBody()) this._hurtVisualWitness = true;
  }
  resolveHammerfallStartup(observedOriginal=null){
    const q=this.hammerfallStartup;if(!q||q.v!==1)return{status:'none',effect:null};
    if(!(this.player?.hp>0)||q.area!==this.area||q.areaId!==this.areaId()||q.levelId!==String(this.map?.levelId||'root'))return{status:'ended',effect:null};
    const observed=observedOriginal===this._hammerfallObserved&&observedOriginal?.id===q.effectId,effect=observed?observedOriginal:(this.effects||[]).find(e=>e?.id===q.effectId),valid=effect?.id===q.effectId&&effect.kind==='hammerfall'&&effect.brawler===true&&effect.glyphHost==='tool'&&!effect.echo&&!effect.hostile&&Number.isFinite(effect.delay)&&effect.delay<=BRAWLER.hammerfall.delay&&Number.isFinite(effect.life)&&(observed&&effect.pulseIndex>0||effect.life>=0&&effect.life<=BRAWLER.hammerfall.lifetime)&&effect.pulse===99&&Number.isInteger(effect.pulseIndex)&&effect.pulseIndex>=0;
    if(!valid)return{status:'ended',effect:null};
    return{status:effect.pulseIndex>0?'released':'pending',effect};
  }
  reconcileHammerfallStartup(observedOriginal=null){const q=this.hammerfallStartup;if(!q||q.v!==1)return{released:false,ended:false};const r=this.resolveHammerfallStartup(observedOriginal);if(r.status==='pending')return{released:false,ended:false};this.hammerfallStartup=null;if(r.status==='released')return{released:true,ended:false};this.clearAttackBuffer();this.fistReleaseIntent=null;return{released:false,ended:true};}
  clearHammerfallStartup(_reason='cancelled'){if(!this.hammerfallStartup)return false;this.hammerfallStartup=null;this.clearAttackBuffer?.();this.fistReleaseIntent=null;return true;}
  startupGuardWait(now=0){if(this.pendingMeleeContact?.v===1)return Math.max(0,this.pendingMeleeContact.releaseAt-now);if(this.pendingToolUse?.v===1)return Math.max(0,this.pendingToolUse.releaseAt-now);const r=this.resolveHammerfallStartup();return r.status==='pending'?Math.max(0,(Number(r.effect.delay)||0)*1000):Infinity;}
  toolUseBlocksPrimary(){return this.pendingMeleeContact?.v===1&&!this._toolInputUpdate||this.pendingToolUse?.v===1||this.resolveHammerfallStartup().status==='pending';}
  cancelPendingToolUse(_reason='cancelled'){const q=this.pendingToolUse;if(!q)return false;this.pendingToolUse=null;const v=this.player?.attackVisual;if(v?.toolUse?.v===1&&v.toolUse.id===q.id){v.toolUse={...v.toolUse,phase:'cancelled'};delete v.toolUse.releaseOffsetMs;v.presentationCancelled=true;}return true;}
  releasePendingToolUse(now=this.lastUpdateNow||0){
    const q=this.pendingToolUse;if(!q||q.v!==1||now<q.releaseAt)return{released:false,cancelled:false};
    if(this.paused)return{released:false,cancelled:false};
    if(!(this.player?.hp>0)||q.area!==this.area||q.areaId!==this.areaId()||q.levelId!==String(this.map?.levelId||'root')){this.cancelPendingToolUse('invalid-owner');return{released:false,cancelled:true};}
    this.pendingToolUse=null;const cap=this.area==='dungeon'?32:64;
    if(q.payload.family==='shot'&&this.projectiles.filter(p=>!p.dead&&!p.shard).length>=cap){const v=this.player?.attackVisual;if(v?.toolUse?.v===1&&v.toolUse.id===q.id){v.toolUse={...v.toolUse,phase:'cancelled'};delete v.toolUse.releaseOffsetMs;v.presentationCancelled=true;}return{released:false,cancelled:true};}
    let base=null;
    if(q.payload.family==='shot'){
      const members=Array.isArray(q.payload.members)?q.payload.members:[q.payload.shot];
      const originX=this.player.x+.5+q.aim.x*.35,originY=this.player.y+.45+q.aim.y*.35;
      for(let i=0;i<members.length;i++){const src=executablePreparedShot(members[i]),p={...src,id:i?`${q.id}-child-${i}`:`${q.id}-base`,x:originX,y:originY,hits:{},age:0,toolUseNewborn:true};this.projectiles.push(p);if(!i)base=p;}
      for(const e of q.payload.echoCopies||[])(this.glyphTimers||=[]).push({at:now+e.delayMs,kind:'shot',shot:{...executablePreparedShot(q.payload.shot),id:`${q.id}-echo-${e.index||1}`,hits:{},damage:Math.max(1,Math.round(q.payload.shot.damage*e.share)),echo:true}});
      if(q.payload.cloneEligible&&this.shadowCloneActive(now)&&!this.shadowClone.charging&&!this.shadowClone.boxing){const at=clonePosition(this.player,this.shadowClone),d=this.cloneAimFrom(at)||q.aim;this.projectiles.push({...executablePreparedShot(q.payload.shot),id:`${q.id}-shadow`,x:at.x+.5+d.x*.35,y:at.y+.45+d.y*.35,dx:d.x,dy:d.y,hits:{},age:0,damage:Math.max(1,Math.round(q.payload.shot.damage*SHADOW_CLONE.share)),glyphHost:null,shadow:true,toolUseNewborn:true});}
      echoEvent(this,'shot',now,{shot:base});
    }else{
      const e=executablePreparedEffect(q.payload.effect),fx={...e,id:`${q.id}-effect`,x:this.player.x+.5,y:this.player.y+.45,hits:{},pulseIndex:0,untilPulse:0,toolUseNewborn:true};this.effects.push(fx);base=fx;
      for(const c of q.payload.echoCopies||[])this.effects.push({...fx,id:`${q.id}-echo-${c.index||1}`,hits:{},delay:c.delayMs/1000,damage:Math.max(1,Math.round(fx.damage*c.share)),imbue:(fx.imbue||0)*c.share,echo:true,toolUseNewborn:true});
      if(q.payload.cloneEligible&&q.payload.cloneProfile&&this.shadowCloneActive(now))this.cloneSwing({shape:'arc',range:1.75,arc:160,damage:(Number(q.payload.cloneProfile.damage)||1)-characterStats(this.save).meleeBonus},q.aim,now);
    }
    const v=this.player.attackVisual;if(v?.toolUse?.v===1&&v.toolUse.id===q.id&&v.toolUse.phase==='startup'&&!v.presentationCancelled){v.toolUse={...v.toolUse,phase:'released',releaseOffsetMs:q.startupMs};if(base&&q.payload.family==='shot')v.toolShotId=base.id;this.player.actionVisualUntil=now+(v.durationMs-q.startupMs);}
    return{released:true,cancelled:false};
  }
  cancelPendingMeleeContact(_reason='cancelled'){const q=this.pendingMeleeContact;if(!q)return false;this.pendingMeleeContact=null;if(q.payload?.kind==='fist'&&this.fistCombo?.step===q.payload.step&&Array.isArray(this.fistCombo.landed)&&this.fistCombo.landed.length)this.fistCombo.landed[this.fistCombo.landed.length-1]=false;const v=this.player?.attackVisual;if(v?.meleeAction?.v===1)v.presentationCancelled=true;return true;}
  releasePendingMeleeContact(now=this.lastUpdateNow||0){
    const q=this.pendingMeleeContact;if(!q||q.v!==1||now<q.releaseAt||this.paused)return{released:false,cancelled:false};
    if(!(this.player?.hp>0)||q.area!==this.area||q.areaId!==this.areaId()||q.levelId!==String(this.map?.levelId||'root')){this.cancelPendingMeleeContact('invalid-owner');return{released:false,cancelled:true};}
    if(now<(this.player.stunnedUntil||0)){this.cancelPendingMeleeContact('knockdown');return{released:false,cancelled:true};}
    const primary=this.save.equipment.primary,compatible=q.action.kind==='verge-cleaver'?(primary?.id==='primary-verge-cleaver'||primary?.name==='Verge Cleaver'):this.fistsEquipped();
    if(!compatible){this.cancelPendingMeleeContact('equipment-switch');return{released:false,cancelled:true};}
    this.pendingMeleeContact=null;
    const visual=this.player.attackVisual;
    if(visual?.meleeAction?.v===1&&!visual.presentationCancelled&&visual.meleeAction.kind===q.action.kind){
      this.player.actionVisualUntil=now+(visual.durationMs-q.contactMs);
      const cue=visual.cleaverChoreography;
      if(q.payload.kind==='cleaver'&&cue?.v===1&&!cue.retired)
        visual.cleaverChoreography={...cue,contactLogicalMs:this.consumeLogicalNow(now)};
    }
    if(q.payload.kind==='cleaver'){
      const hits=this.primaryStrike(now,q.aim,{committed:q.payload});
      this.recordPrimaryConsequences(hits);
      return{released:true,cancelled:false,hits};
    }
    if(q.payload.kind==='fist'){const src=q.payload.effect,at={x:this.player.x+.5+q.aim.x*.7,y:this.player.y+.45+q.aim.y*.7},fx={...src,x:at.x,y:at.y,hits:{},pulseIndex:0,untilPulse:0,toolUseNewborn:true},landed=this.enemies.some(e=>!e.dead&&!e.untargetable&&!e.hidden&&Math.hypot(e.x+.5-at.x,e.y+.45-at.y)<=fx.radius+Math.max(0,enemyBodyRadius(e)-.38));this.effects.push(fx);if(this.fistCombo?.step===q.payload.step&&Array.isArray(this.fistCombo.landed))this.fistCombo.landed[this.fistCombo.landed.length-1]=landed;if(q.payload.cloneEligible)this.cloneSwing({...BRAWLER_ECHO.cloneArc,damage:Number(q.payload.cloneDamage)||1},q.aim,now);return{released:true,cancelled:false};}
    return{released:false,cancelled:true};
  }
  clearAttackBuffer() { this.attackBufferUntil = 0; this.attackBufferToolUse=false; }
  tickAttackBuffer(now = 0, input = null) {
    if (!(this.attackBufferUntil > 0)) return false;
    const eligible=this.attackBufferToolUse?(this.closeViewActionEligible()&&this.save.activeWeaponSlot!=='secondary'&&!this.cursed('attack',now)&&!this.penned(now)):this.closeViewAttackBufferEligible(now);
    if (now > this.attackBufferUntil || !eligible) { this.clearAttackBuffer(); return false; }
    if(this.toolUseBlocksPrimary())return false;
    if (now < (this.player.attackReadyAt || 0)) return false;
    if(this.fistsEquipped()&&(this.fistCharge||now<(this.fistRecoverUntil||0)))return false;
    const bufferedToolTap=this.attackBufferToolUse,held=bufferedToolTap&&this.fistsEquipped()&&input?.held?.('attack');
    const bufferedFist=this.fistsEquipped();this.clearAttackBuffer();this.attackAction=bufferedToolTap&&bufferedFist?(held?'attack':null):"attack";this._fistInputUpdate=bufferedFist;try{this.primaryAttack(now);}finally{this._fistInputUpdate=false;this.attackAction=null;}return true;
  }
  primaryAttack(now = 0, _direction = null, echo = null) {
    const committed=echo?.committed||null,isEcho=!!echo&&!committed;
    if(!echo){this.releasePendingToolUse(now);this.releasePendingMeleeContact(now);this.reconcileHammerfallStartup();if(this.toolUseBlocksPrimary()||this.pendingMeleeContact?.v===1)return[];}
    if (this.penned(now)) return [];
    if (!echo && this.cursed("attack", now)) return []; // release 737: NO ATTACK (the Iron Fists too)
    if (!committed&&this.fistsEquipped()) { if (!echo) this.fistPress(now, _direction, this.attackAction || null); return []; } // release 493: the Iron Fists punch instead of swinging
    const glyphs = this.glyphLoadout("melee");
    if (!echo && now < (this.player.attackReadyAt || 0)) return [];
    if (!echo && now < (this.boxingUntil || 0)) this.shadowBoxStep(primaryProfile(this.save.equipment.primary).range * (1 + characterStats(this.save).attackReach) * glyphs.mods.range, now); // release 485
    const acceptedCooldown=420*glyphs.mods.cooldown*(1-armorGlyphBonus(this.save).attackSpeed);
    if (!echo) { this.player.attackReadyAt = now + acceptedCooldown; this.cancelConsumeVisual('attack'); }
    if (!echo) tesseractHarm(this.save, this.player, armorGlyphBonus(this.save).selfHarm); // a Tesseract glyph's cost: each swing bites back (never below TESSERACTS.harmFloor)
    this.player.attackUntil = now + ACTION_MOTION.meleeMs;
    this.player.meleeUntil = now + ACTION_MOTION.meleeMs;
    const baseProfile = primaryProfile(this.save.equipment.primary),
      profile = committed?.profile||{ ...baseProfile, range: baseProfile.range * (1 + characterStats(this.save).attackReach) * glyphs.mods.range + (this.spellbladeOn(now) ? FIELD_PASSIVES.spellblade.reach : 0) /* release 515: Spellblade */, damage: baseProfile.damage * glyphs.mods.damage },
      geometry = meleeAttackGeometry(
        this.player,
        profile,
        this.player.meleeAim || this.save.lastAim,
      );
    this.player.meleeStrike = { ...geometry };
    const priorAttackVisual = this.player.attackVisual;
    const attackVisual = !echo && stampAttackVisual(this.player, "melee", ACTION_MOTION.meleeMs, { x: geometry.dx, y: geometry.dy });
    if (attackVisual) {
      const primary = this.save.equipment.primary;
      attackVisual.weaponKind = primary?.id === "primary-cinder-pike" || primary?.name === "Cinder Pike" ? "cinder-pike"
        : primary?.id === "primary-verge-cleaver" || primary?.name === "Verge Cleaver" ? "verge-cleaver" : "salvage-blade";
      const logicalNow = now - (this.presentationPausedMs || 0);
      const primaryStep = attackVisual.weaponKind === 'verge-cleaver'
        ? advancePrimaryCombo(this.player, attackVisual.weaponKind, logicalNow)
        : advancePrimaryCombo(this.player, attackVisual.weaponKind);
      if (primaryStep) {
        if (attackVisual.weaponKind === 'verge-cleaver') attackVisual.primaryMotion = { v: 2, step: primaryStep };
        else attackVisual.primaryStep = primaryStep;
      }
      const prior = recentHeroPresentation(this.player, logicalNow, this.player.x, this.player.y);
      attackVisual.poseMs = prior?.now ?? Math.max(0, logicalNow);
      if (prior) attackVisual.facingYaw = Math.atan2(Math.sin(prior.yaw), Math.cos(prior.yaw));
    }
    const cleaverAccepted=!echo&&this.attackAction==='attack'&&attackVisual?.weaponKind==='verge-cleaver'&&this.closeViewActionEligible();
    if (cleaverAccepted && this.ordinaryCloseViewBody()) {
      attackVisual.cleaverChoreography = acceptCleaverChoreography(priorAttackVisual, this.consumeLogicalNow(now));
    }
    if(cleaverAccepted){const T=CLOSE_VIEW_MELEE_TIMING.cleaver,contactMs=Math.max(1,Math.min(T.contactMs,acceptedCooldown)),id=`melee-${(this.save.effectCounter=(this.save.effectCounter||0)+1)}`,stats=characterStats(this.save),armor=armorGlyphBonus(this.save),boxing=now<(this.boxingUntil||0)?BRAWLER['shadow-boxing']:null;attackVisual.durationMs=T.durationMs;attackVisual.meleeAction={v:1,kind:'verge-cleaver',move:'cleaver',contactMs,durationMs:T.durationMs};this.player.actionVisualUntil=now+T.durationMs;this.pendingMeleeContact={v:1,id,action:{...attackVisual.meleeAction},area:this.area,areaId:this.areaId(),levelId:String(this.map?.levelId||'root'),acceptedAt:now,releaseAt:now+contactMs,contactMs,aim:{x:geometry.dx,y:geometry.dy},payload:{kind:'cleaver',profile:structuredClone(profile),meleeBonus:stats.meleeBonus,attackDamage:armor.attackDamage,imbue:this.imbueBonus(now),spellblade:this.spellbladeOn(now),boxing:boxing?structuredClone(boxing):null,awakened:this.save.equipment.primary?.awakened===true,primaryMotion:structuredClone(attackVisual.primaryMotion),support:this.playerLevel()}};return[];}
    const hits = primaryAttackHits(
      this.player,
      [...this.enemies.filter(e=>!e.untargetable&&this.bodyReach(e)), ...this.npcTargets()], // Tim (2026-11-04): the Wayfarer's swing does not reach a creature far below or above (ELEVATION_REACH)
      this.map,
      mapWidth(this.map, this.area),
      profile,
      { x: geometry.dx, y: geometry.dy },
    );
    const pounce = isEcho || !hits.some((q) => q.kind !== "npc") ? 1 : pounceBonus(this, now);
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
      const boxing = committed?committed.boxing:(now < (this.boxingUntil || 0) ? BRAWLER["shadow-boxing"] : null), base = (profile.damage + (committed?Number(committed.meleeBonus)||0:characterStats(this.save).meleeBonus)) * (1 + (committed?Number(committed.attackDamage)||0:armorGlyphBonus(this.save).attackDamage)) * (isEcho ? echo.share : 1) * pounce * (1 + (boxing?.damage || 0)) * ((committed?committed.spellblade:this.spellbladeOn(now)) ? 1 + FIELD_PASSIVES.spellblade.damage : 1), /* release 515: Spellblade */ /* release 485: Shadow Boxing */ /* release 335: armor Volatile */ scattered = this.scatterCheck(e, true, glyphsReachSwarm(glyphs), now), dealt = scattered ? 0 : glyphDamage(glyphs, e, base, { echo: isEcho }, now); // release 245: plain steel scatters the Nanobot Knight
      const imbued = scattered ? 0 : Math.round((committed?Number(committed.imbue)||0:this.imbueBonus(now)) * (isEcho ? echo.share : 1)), hpBefore = Math.max(0,e.hp); // Imbue Weapon: the magic share of the hit
      e.hp -= dealt + imbued;
      if (imbued > 0) imbueSpark(this, e.x + .5, e.y + .45, now);
      if (!isEcho) this.frenzyBlow(e); // balance pack (C10): a swing is a blow
      if (boxing && dealt > 0 && this.player.hp > 0) this.player.hp = Math.min(this.save.maxHp, this.player.hp + dealt * boxing.heal); // release 485: Shadow Boxing heals
      this.astralPlayerHit(e,Math.max(0,hpBefore-Math.max(0,e.hp)));
      if (dealt > 0) this.tesseractHitHeal("melee", now); // a Tesseract's health on a melee hit
      e.hitFlash = scattered ? 0 : 0.18;
      e.recoil = scattered ? 0 : 0.2;
      if (!scattered) e.hitStun = Math.max(e.hitStun || 0, e.boss || e.eliteId ? 0.12 : 0.22);
      if (e.hp <= 0) {
        e.dead = true;
        this.defeatEnemy(e);
      }
      glyphHit(this.glyphWorld(now), glyphs, e, dealt, { echo: isEcho });
      onConstellationMelee(this, e, now);
    }
    if (!isEcho) this.cloneSwing(profile, { x: geometry.dx, y: geometry.dy }, now); // release 365: the Shadow Clone swings too
    // Awakened primary: every third swing releases a piercing crescent that carries the weapon's glyphs.
    if (!isEcho && (committed?committed.awakened:this.save.equipment.primary?.awakened) && (this.awakenSwings = (this.awakenSwings || 0) + 1) % 3 === 0)
      this.projectiles.push({ id: `crescent-${now}`, x: this.player.x + .5 + geometry.dx * .4, y: this.player.y + .45 + geometry.dy * .4, dx: geometry.dx, dy: geometry.dy, speed: 9, life: .55, damage: Math.max(1, Math.round((profile.damage + (committed?committed.meleeBonus:characterStats(this.save).meleeBonus)) * (1 + (committed?committed.attackDamage:armorGlyphBonus(this.save).attackDamage)) * .7)), damageType: "physical", path: "straight", age: 0, hits: {}, pierce: 6, glyphHost: "melee", crescent: true /* release 341: armor Volatile, as on the swing */ });
    const plan = !isEcho && echoPlan(glyphs);
    if (plan) {
      const memory=committed?{x:geometry.x,y:geometry.y,dx:geometry.dx,dy:geometry.dy,range:profile.range,arc:profile.arc,shape:profile.shape,weaponKind:'verge-cleaver',primaryMotion:structuredClone(committed.primaryMotion),support:committed.support}:attackVisual&&['cinder-pike','verge-cleaver'].includes(attackVisual.weaponKind)?{x:geometry.x,y:geometry.y,dx:geometry.dx,dy:geometry.dy,range:profile.range,arc:profile.arc,shape:profile.shape,weaponKind:attackVisual.weaponKind,...(attackVisual.primaryMotion?{primaryMotion:structuredClone(attackVisual.primaryMotion)}:{primaryStep:attackVisual.primaryStep||1}),support:this.playerLevel()}:null;
      (this.glyphTimers ||= []).push({ at: now + plan.delay, kind: "strike", share: plan.share, echoVisual:memory });
    }
    this.reconcileConsequences();
    this.attackProfile = profile;
    return hits;
  }
  fireSecondary(now = 0, direction = null, action = null) {
    if(!this._toolInputUpdate)this.releasePendingToolUse(now);this.reconcileHammerfallStartup();if(this.toolUseBlocksPrimary())return false;
    if (this.penned(now)) return false;
    { const bt = rangedWeapon(this.save.equipment.secondary)?.brawlerTool; if (bt) return this.brawlerTool(bt, now, direction); } // release 493: a tap uses Hammerfall or Great Sweep
    if (this.cursed("shoot", now)) return false; // release 737: NO SHOOT
    if (this.isOrrery()) { const accepted=orreryPress(this, now, direction, action); if(accepted)this.cancelConsumeVisual('tool'); return accepted; } // tool-forms.ts: the Aether Orrery's own tap, halo and charge
    if (this.projectiles.filter(p=>!p.dead&&!p.shard/* Sunburst shards have their own cap (SUNBURST.maxLive) */).length >= (this.area==='dungeon'?32:64)) return false;
    const weapon = rangedWeapon(this.save.equipment.secondary), glyphs = this.glyphLoadout("tool");
    if (!weapon || now < (this.player.attackReadyAt || 0)) return false;
    const acceptedToolKind = weapon.name === "Rift Bombard" ? "rift-bombard" : weapon.name === "Blunderbuss" ? "blunderbuss" : weapon.name === "Lumen Spindle" ? "lumen-spindle" : null;
    if(acceptedToolKind&&this.closeViewActionEligible()){const c=Number(this.save.toolUseCounter);if(!Number.isSafeInteger(c)||c<0||c>=Number.MAX_SAFE_INTEGER)return false;}
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
    const toolKind = acceptedToolKind;
    const delayed=!!toolKind&&this.closeViewActionEligible(),effectiveCooldown=360*glyphs.mods.cooldown*(1-armorGlyphBonus(this.save).attackSpeed),startupMs=delayed?toolUseStartupMs(toolKind,effectiveCooldown):null;
    if(delayed&&startupMs==null)return false;
    const preparedProjectiles=delayed?[]:this.projectiles;
    const priorTool=normalizeAttackVisual(this.player.attackVisual),priorDeadline=attackVisualDeadline(this.player,priorTool);
    const priorPose=toolKind&&priorTool?.toolKind===toolKind&&priorTool.toolMotion?.v===1&&!priorTool.presentationCancelled&&priorDeadline>now
      ?sampleToolActionMotion(priorTool,priorTool.durationMs-(priorDeadline-now)):null;
    this.cancelConsumeVisual(this._attackFiring ? 'attack' : 'tool');
    this.player.attackReadyAt = now + effectiveCooldown;
    this.player.attackUntil = now + ACTION_MOTION.toolMs;
    const visualMs=TOOL_ACTION_TIMING[toolKind]?.durationMs||ACTION_MOTION.toolMs;
    const toolVisual = stampAttackVisual(this.player, "emitter", visualMs, d);
    const appearanceKind=simpleToolAppearanceKind(weapon);
    if(toolVisual&&appearanceKind)toolVisual.toolAppearance={v:1,kind:appearanceKind};
    if (toolVisual && toolKind) { const primary=this.save.equipment.primary?.id,baseKind=priorPose?priorTool.toolMotion.baseKind:primary==='primary-cinder-pike'?'cinder-pike':primary==='primary-verge-cleaver'?'verge-cleaver':'salvage-blade';toolVisual.toolKind = toolKind;toolVisual.toolMotion={v:1,entry:priorPose?[priorPose.yaw,priorPose.side,priorPose.up,priorPose.forward,priorPose.weight]:[0,0,0,0,0],direction:1,baseKind};this.player.actionVisualUntil=now+visualMs; }
    this.player.meleeUntil = 0;
    this.player.meleeStrike = null;
    const derived=characterStats(this.save),reachMultiplier=1+derived.attackReach,projectileLifetime=weapon.lifetime*reachMultiplier;
    preparedProjectiles.push({
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
    const shot = preparedProjectiles[preparedProjectiles.length - 1];
    if(toolVisual&&toolKind){toolVisual.toolShotId=shot.id;if(toolKind==='rift-bombard')shot.visualFlight={v:1,duration:shot.life};}
    shot.damage = Math.max(1, Math.round(shot.damage * glyphs.mods.damage));
    if (weapon.path === "boomerang" && weapon.name === "Lumen Spindle" && fieldOn(this.save, "lumen-sunburst")) { shot.ricochet = SUNBURST.ricochets; shot.sunburst = true; } // Sunburst Ricochet: copies below (fan, Echo, clone) ricochet too
    if (fieldOn(this.save, "charged-air") && this.spellRunning(now)) { const C = FIELD_PASSIVES["charged-air"]; shot.damage = Math.max(1, Math.round(shot.damage * (1 + C.damage))); shot.scale = C.scale; shot.grow = C.grow; if (shot.blastRadius) shot.blastRadius *= C.blast; } // release 515: Charged Air
    if (weapon.pellets) { // release 533 (tool-forms.ts): the Blunderbuss's three-pellet cone, or with Arc Wave one wide wave
      if (fieldOn(this.save, "arc-wave")) { shot.arcWave = true; shot.damage = Math.max(1, Math.round(shot.damage * ARC_WAVE.share)); shot.grow = (shot.grow || 0) + ARC_WAVE.grow; shot.pierce = (shot.pierce || 0) + ARC_WAVE.pierce; shot.speed = ARC_WAVE.speed; } // release 549: every pellet becomes a wave, along the same cone
      for (let i = 1; i < weapon.pellets; i++) { const a = (i % 2 ? 1 : -1) * weapon.spread * Math.ceil(i / 2), c = Math.cos(a), sn = Math.sin(a); preparedProjectiles.push({ ...shot, id: `${shot.id}-pellet${i}`, dx: shot.dx * c - shot.dy * sn, dy: shot.dx * sn + shot.dy * c, hits: {} }); }
    }
    const cloneEligible=this.shadowCloneActive(now)&&!this.shadowClone.charging&&!this.shadowClone.boxing;
    if (!delayed&&cloneEligible /* release 503: the Shadow Boxing echo only swings */) { const at = clonePosition(this.player, this.shadowClone), cd = this.cloneAimFrom(at) || d; preparedProjectiles.push({ ...shot, id: `${shot.id}-shadow`, x: at.x + .5 + cd.x * .35, y: at.y + .45 + cd.y * .35, dx: cd.x, dy: cd.y, hits: {}, damage: Math.max(1, Math.round(shot.damage * SHADOW_CLONE.share)), glyphHost: null, shadow: true }); } // release 365; 387: at the locked target
    const plan = echoPlan(glyphs);
    if(!delayed)echoEvent(this, "shot", now, { shot });
    if (this.save.equipment.secondary?.awakened) for (const a of [-.21, .21]) { const c = Math.cos(a), sn = Math.sin(a); preparedProjectiles.push({ ...shot, id: `${shot.id}-fan${a}`, dx: shot.dx * c - shot.dy * sn, dy: shot.dx * sn + shot.dy * c, hits: {}, damage: Math.max(1, Math.round(shot.damage * .5)) }); } // awakened tool: a three-shot fan
    if (!delayed&&plan) plan.copies.forEach((c, i) => (this.glyphTimers ||= []).push({ at: now + c.delay, kind: "shot", shot: { ...shot, id: shot.id + (i ? `-echo${i + 1}` : "-echo"), hits: {}, damage: Math.max(1, Math.round(shot.damage * c.share)), echo: true } })); // release 507: a third shot with two Echo glyphs
    if(delayed){
      const counter=Number(this.save.toolUseCounter);if(!Number.isSafeInteger(counter)||counter<0||counter>=Number.MAX_SAFE_INTEGER)return false;
      const id=`tool-use-${counter+1}`,members=preparedProjectiles.map(p=>{const{x,y,id:_id,hits,age,toolUseNewborn,...rest}=p;return{...rest};}),echoCopies=(plan?.copies||[]).map((c,i)=>({delayMs:c.delay,share:c.share,index:i+1}));
      this.save.toolUseCounter=counter+1;delete toolVisual.toolShotId;toolVisual.toolUse={v:1,id,startupMs,phase:'startup'};
      this.pendingToolUse={v:1,id,toolKind,area:this.area,areaId:this.areaId(),levelId:String(this.map?.levelId||'root'),acceptedAt:now,releaseAt:now+startupMs,startupMs,aim:{...d},payload:{v:1,family:'shot',shot:{...members[0]},members,pellets:Math.max(0,(weapon.pellets||1)-1),spread:Number(weapon.spread)||0,awakenedFan:!!this.save.equipment.secondary?.awakened,echoCopies,cloneEligible}};
    }
    return true;
  }
  // Sunburst Ricochet (tool-forms.ts SUNBURST): a Spindle shot that has just reflected off a wall whose outward face is
  // (nx, ny) breaks into a fan of shards. Bounded by SUNBURST.maxLive shards alive at once; returns how many were thrown.
  sunburst(shot, nx, ny) {
    if (!shot?.sunburst || shot.hostile) return 0;
    let live = 0; for (const p of this.projectiles) if (p.shard && !p.dead) live++;
    const S = SUNBURST, n = Math.min(S.shards, S.maxLive - live); if (n <= 0) return 0;
    const m = Math.hypot(nx, ny) || 1, base = Math.atan2(ny / m, nx / m), damage = Math.max(1, Math.round((Number(shot.damage) || 0) * S.share)), burst = { hits: {}, cap: S.perEnemy };
    for (let i = 0; i < n; i++) {
      const a = base + S.spread * ((i + .5) / n - .5);
      this.projectiles.push({ id: `${shot.id}-shard${shot.ricochet}-${i}`, x: shot.x + (nx / m) * S.lift, y: shot.y + (ny / m) * S.lift, dx: Math.cos(a), dy: Math.sin(a), speed: S.speed, life: S.life, damage, damageType: shot.damageType || "magic", path: "straight", age: 0, hits: {}, pierce: S.pierce, shard: true, burst, glyphHost: null, ...(shot.toolUseNewborn ? { toolUseNewborn: true } : {}) });
    }
    return n;
  }
  // Spell slots A and B (release 115): each button casts whatever its slot holds. Release 309: or builds, or uses the item.
  castSlot(slot, now = this.lastUpdateNow || 0) {
    const t = slotTool(this.save, slot);
    if (t) return t.tool === "build" ? this.pressBuild(false) : this.useButtonItem(t.item, now);
    const c = slotted(this.save, slot);
    if (!c) { this.message = `Slot ${slot.toUpperCase()} is empty — fill it in the Arcanum.`; return false; }
    if (c.kind !== "skill" && this.penned(now)) return false; // release 697 (Tim: "you should be able to use items" in a pen): only spells are refused there
    this.castAction = slot === "b" ? "spell2" : "spell"; try { return this.castCost(c.kind === "skill" ? this.activateApertureSkill(c.id) : this.castSpell(c.id)); } finally { this.castAction = null; } // release 417: the button a held Shadow Clone listens to
  }
  // A Tesseract's castHarm: health lost with each cast that answers (never below TESSERACTS.harmFloor). Returns the cast's result.
  castCost(ok) { if (ok) tesseractHarm(this.save, this.player, armorGlyphBonus(this.save).castHarm); return ok; }
  // A Tesseract's health on hit (meleeHeal on a melee hit, spellHeal on a magic one, hitHeal on either): a share of maximum health
  // per landed hit, at most TESSERACTS.hitHealCap of it in any one second (`hitHealSec`, not saved), whatever lands.
  tesseractHitHeal(kind, now = this.lastUpdateNow || 0) {
    const p = this.player; if (!(p.hp > 0) || !this.save.tesseracts?.slots?.some(Boolean)) return 0; const ag = armorGlyphBonus(this.save), share = (ag.hitHeal || 0) + ((kind === "spell" ? ag.spellHeal : ag.meleeHeal) || 0); if (!(share > 0)) return 0;
    const max = this.save.maxHp || 60, sec = Math.floor(now / 1000); if (this.hitHealSec !== sec) { this.hitHealSec = sec; this.hitHealGiven = 0; }
    const n = Math.min(max * share, max * TESSERACTS.hitHealCap - this.hitHealGiven, max - p.hp); if (!(n > 0)) return 0; p.hp += n; this.hitHealGiven += n; return n;
  }
  castKey(key) {
    const c = CASTABLES[key]; if (!c || !availableCastables(this.save).includes(key)) { this.message = "Not learned yet."; return false; }
    if (c.kind !== "skill" && this.penned(this.lastUpdateNow || 0)) return false; // release 697
    return this.castCost(c.kind === "skill" ? this.activateApertureSkill(c.id) : this.castSpell(c.id));
  }
  // The Build action, from whichever button holds it (release 269 mend, 267 build mode, 265 walls and blocks).
  pressBuild(moving = false) {
    const p = this.player;
    if (this.cursed("tools")) return false; // release 737: NO TOOLS (Build)
    if (this.mendTarget()) { this.message = mendSkiff(this.save).message; return true; }
    if (this.area === "overworld" && aboard(this.save)) { this.message = "Hold Build to raise a hull shield."; return false; }
    const kind=activeBuildKind(this.save)||ensureBuild(this.save).build.kind,at = buildSpot(p), r = placeBuild(this, at.x, at.y, kind, moving); if(r.ok&&kind==='stone')this.stampStonePlacementVisual();this.message = r.message; this.save.aimMode = "build"; this.save.toolMode = false; return r.ok; // the button also turns on build mode: taps build
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
    const id=spellId&&SPELLS[spellId]?spellId:(this.save.equippedSpell||'ember-ring'),priorVisual=this.player.castVisual,before={effects:this.effects.length,shots:this.projectiles.length,clone:!!this.shadowCloneActive(this.lastUpdateNow||0),orbit:!!this.orbit&&!this.orbit.flight,x:this.player.x,y:this.player.y};
    const result = this.castSpellEffect(spellId);
    if (result) { const now=this.lastUpdateNow||0;this.player.castUntil=now+ACTION_MOTION.castMs;this.cancelConsumeVisual('cast');this.cancelAttackPresentation(now);if(this.player.castVisual===priorVisual)this.recordCastVisual(id,before); }
    return result;
  }
  recordCastVisual(spellKind,before={},variant='cast',accepted=null){
    const p=this.player;let origin=accepted?.origin||{x:(before.x??p.x)+.5,y:(before.y??p.y)+.45},target=accepted?.target||null,aim=accepted?.aim||null;
    const shot=this.projectiles[before.shots],fx=this.effects[before.effects];
    if(!target){if(shot)target={x:shot.x,y:shot.y};else if(fx)target={x:fx.x,y:fx.y};else if(spellKind==='orbit-volley'&&before.orbit&&this.orbit?.flight){origin={x:this.orbit.flight.x,y:this.orbit.flight.y};target={x:this.orbit.flight.tx,y:this.orbit.flight.ty};}else if(spellKind==='rift-step')target={x:p.x+.5,y:p.y+.45};}
    if(!aim){if(shot&&Math.hypot(shot.dx||0,shot.dy||0)>.001)aim={x:shot.dx,y:shot.dy};else if(target&&Math.hypot(target.x-origin.x,target.y-origin.y)>.001)aim={x:target.x-origin.x,y:target.y-origin.y};else aim=projectileDirection(this.save.lastAim?.x||0,this.save.lastAim?.y||0,p.facing);}
    if(spellKind==='shadow-clone'&&variant==='cast')variant=before.clone?'swap':'create';else if(spellKind==='orbit-volley')variant=before.orbit?'launch':'gather';
    let profile=CAST_GESTURES[spellKind]||'neutral-cast';if(spellKind==='shadow-clone'&&variant==='swap')profile='dusk-swap';if(spellKind==='orbit-volley'&&variant==='launch')profile='orbit-launch';
    return stampCastVisual(p,{spellKind,variant,profile,aim,origin,...(target?{target}:{}),...(accepted?.sourceId?{sourceId:accepted.sourceId}:{}),...(Number.isFinite(accepted?.sourceUntil)?{sourceUntil:accepted.sourceUntil}:{})});
  }
  castSpellEffect(spellId = null) {
    if (this.cursed("spells")) return false; // release 737: NO SPELLS
    if(!spellId&&this.save.magicSkills?.selected&&skillRank(this.save,this.save.magicSkills.selected)>0)return this.activateApertureSkill(this.save.magicSkills.selected);
    if (spellId && SPELLS[spellId]) this.save.equippedSpell = spellId; // the readied spell is the glyph host
    const spell = SPELLS[this.save.equippedSpell] || SPELLS["ember-ring"], cds = (this.save.magicSkills ||= {}).cooldowns ||= {}, key = `spell:${spell.id}`, remaining = spellId ? cds[key] || 0 : this.spellCooldownRemaining; // slots use per-spell cooldowns; the legacy call keeps its single one
    if (remaining > 0 && this.essenceCostFor(spell.id) != null && !this.followUpPress(spell)) return this.essenceCast(spell, cds, key, spellId, remaining); // Essence Walk (2026-11-05)
    if (remaining > 0 && this.essenceLocked(spell.id) && (this.lastUpdateNow || 0) < (this.essenceUntil || 0)) { this.message = `${spell.name} is locked: your stamina ran out. It recovers in ${Math.ceil(remaining)}s.`; return false; }
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
      damage: Math.max(1, Math.round(this.spellPower(spell) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage))), // release 335: armor Ignite scales the whole spell
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
  // Balance pack (C7): a spell's power before its glyph, Pairing and armor multipliers (SPELL_POWER): Focus counts beyond the
  // flat magic bonus, so a Focus build casts about as hard as a Might build swings.
  spellPower(spell) { const S = SPELL_POWER, focus = Math.max(1, Number(this.save.stats?.Focus) || 1); return ((Number(spell.damage) || 0) * S.base + (Number(characterStats(this.save).magicBonus) || 0) + S.focus * (focus - 1)) * S.scale; }
  // Release 547 (tool-forms.ts FIRE_BURST): a fan of cinder shells toward the lock, else the nearest foe in reach, else the way
  // you face; each bursts (the projectile detonation) where it lands or on the first foe it meets.
  castFireBurst(spell, cds, key, now = this.lastUpdateNow || 0) {
    if ((cds[key] || 0) > 0) { this.message = `${spell.name} recovers in ${Math.ceil(cds[key])}s.`; return false; }
    const p = this.player, cx = p.x + .5, cy = p.y + .45, t = this.lockedTarget(), foe = t && !t.untargetable && !t.hidden ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), spell.maxRange * AUTO_AIM.spellScale)?.e || null;
    const d = foe ? projectileDirection(foe.x + .5 - cx, foe.y + .45 - cy, p.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing), glyphs = this.glyphLoadout("spell", spell.id), F = FIRE_BURST;
    if (foe) this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    const damage = Math.max(1, Math.round(this.spellPower(spell) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage)));
    let centerShell=null;
    for (let i = 0; i < F.count; i++) { const a = (F.count > 1 ? i / (F.count - 1) - .5 : 0) * F.spread, c = Math.cos(a), sn = Math.sin(a);
      this.projectiles.push({ id: `fire-burst-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, x: cx + d.x * .3, y: cy + d.y * .3, dx: d.x * c - d.y * sn, dy: d.x * sn + d.y * c, speed: F.speed, life: F.reach * glyphs.mods.range / F.speed, damage, damageType: "magic", path: "grenade", age: 0, hits: {}, blastRadius: spell.radius * glyphs.mods.radius, glyphHost: "spell", glyphSpell: spell.id, fireBomb: true }); }
    centerShell=this.projectiles[this.projectiles.length-Math.ceil(F.count/2)];
    cds[key] = spell.cooldown * glyphs.mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    this.recordCastVisual(spell.id,{},'cast',{origin:{x:centerShell.x,y:centerShell.y},target:{x:centerShell.x,y:centerShell.y},aim:d,sourceId:centerShell.id});
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
    const power = this.spellPower(spell) * glyphs.mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage);
    const t = this.lockedTarget(), foe = t && !t.untargetable && !t.hidden ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), ORBIT.reach)?.e, d = foe ? projectileDirection(foe.x - p.x, foe.y - p.y, p.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing);
    const at = foe ? { x: foe.x + .5, y: foe.y + .45 } : { x: cx + d.x * ORBIT.reach, y: cy + d.y * ORBIT.reach };
    if (foe) this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    o.flight = { x: cx, y: cy, tx: at.x, ty: at.y, radius: L.radius, perfect: L.perfect, damage: Math.max(1, Math.round(power * L.share)) };
    if (!o.essence) cds["spell:orbit-volley"] = spell.cooldown * glyphs.mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown); // Essence Walk: orbs gathered for stamina leave the cooldown running as it was
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
    for (let i = 0; i < 40 && gap() > stop; i++) { const d = projectileDirection(foe.x - p.x, foe.y - p.y, p.facing), nx = p.x + d.x * .25, ny = p.y + d.y * .25; if (!w.canStand(nx, ny) || !this.moveGuardedCombatStep(nx, ny)) break; }
    p.meleeAim = projectileDirection(foe.x - p.x, foe.y - p.y, p.facing); this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    return true;
  }
  // Release 483 (brawler-spells.ts): a swing's damage before the target's own defences: the weapon, the melee bonus, the
  // melee glyph mods and every melee-damage multiplier (armor glyphs, meals, pages, the empowered robot).
  // Imbue Weapon (brawler-spells.ts IMBUE): the magic damage each melee hit adds while it runs, else 0. Focus alone (with the
  // magic bonus once Focus is in), the Imbue spell's own glyph damage mod and the spell-damage multipliers (armor glyphs,
  // meals, pages, the empowered robot); no melee multiplier touches it.
  imbueBonus(now = this.lastUpdateNow || 0) {
    if (!(now < (this.imbueUntil || 0))) return 0;
    const n = imbueAmount(this.save.stats?.Focus, characterStats(this.save).magicBonus) * this.glyphLoadout("spell", "imbue-weapon").mods.damage * (1 + armorGlyphBonus(this.save).spellDamage);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
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
    if (spell.essence) { this.essenceUntil = now + ESSENCE_WALK.seconds * 1000; echoEvent(this, "spell", now); this.message = "Essence Walk: your spells need not wait; recovering ones cost stamina."; return true; } // Essence Walk (2026-11-05): a recast refreshes the window, never stacks
    if (spell.id === "imbue-weapon") { this.imbueUntil = now + IMBUE.seconds * 1000; echoEvent(this, "spell", now); const n = Math.round(this.imbueBonus(now)); this.message = n > 0 ? `Imbue Weapon: your melee hits carry ${n} magic damage.` : "Imbue Weapon: with no Focus put in, your weapon carries no magic."; return true; } // Imbue Weapon (2026-11-04)
    if (spell.id === "aegis") { this.aegisUntil = now + B.ms; echoEvent(this, "spell", now); this.message = "Aegis: every blow is turned aside."; return true; } // release 485
    if (spell.id === "shadow-boxing") { this.boxingUntil = now + B.seconds * 1000; echoEvent(this, "spell", now); this.message = "Shadow Boxing: your swings follow your foe."; if (echoPlan(this.glyphLoadout("spell", spell.id)) && !this.shadowCloneActive(now)) { const o = cloneOffset(null, this.save.lastAim, SHADOW_CLONE.near); this.shadowClone = { ox: o.x, oy: o.y, until: now + BRAWLER_ECHO.echoClone * 1000, boxing: true }; this.message += " An echo of you boxes beside you."; } return true; } // release 485; 503: Echo spawns a short melee clone
    return false;
  }
  // The Aether Orrery (tool-forms.ts): its power is spell power (Focus and magic bonus, SPELL_POWER) for ORRERY.base, times the
  // tool's glyph damage and the Pairing's and armor's spell damage. orreryStrike lands one of its pulses or contact hits on a
  // foe (glyph damage; glyph procs and the frenzy blow only when `full`).
  isOrrery() { return !!rangedWeapon(this.save.equipment?.secondary)?.orrery; }
  orreryWhere() { return `${this.area}:${this.areaId()}`; }
  orreryPower() { return this.spellPower({ damage: ORRERY.base }) * hostLoadout(this.save, "tool").mods.damage * (1 + pairingMods(this.save).spellDamage) * (1 + armorGlyphBonus(this.save).spellDamage); }
  bodyRadius(e) { return enemyBodyRadius(e); }
  orreryStrike(e, amount, now = this.lastUpdateNow || 0, full = false) {
    if (!e || e.dead || e.untargetable || e.hidden || e.kind === "npc") return 0;
    const l = this.glyphLoadout("tool"); if (e.kind === "nanobotKnight" && this.scatterCheck(e, false, glyphsReachSwarm(l), now)) return 0;
    alertEnemy(e); const before = Math.max(0, e.hp), dealt = glyphDamage(l, e, amount, {}, now); e.hp -= dealt; e.hitFlash = .12;
    this.astralPlayerHit(e, Math.max(0, before - Math.max(0, e.hp)));
    if (full) { this.frenzyBlow(e); glyphHit(this.glyphWorld(now), l, e, dealt, {}); }
    if (e.hp <= 0 && !e.dead) { e.dead = true; this.defeatEnemy(e); }
    return dealt;
  }
  // Release 493: Hammerfall and Great Sweep as tools (BRAWLER numbers). A tool's power: (Iron-Fists-style base + its power
  // × perPower + the melee bonus) × the tool glyph mods × every melee-damage multiplier.
  toolPower() { const item = this.save.equipment.secondary, glyphs = hostLoadout(this.save, "tool"); return (IRON_FISTS.base + Math.max(1, Number(item?.power) || 1) * IRON_FISTS.perPower + characterStats(this.save).meleeBonus) * glyphs.mods.damage * (1 + armorGlyphBonus(this.save).attackDamage); }
  brawlerTool(kind, now = this.lastUpdateNow || 0, direction = null) {
    if(!this._toolInputUpdate)this.releasePendingToolUse(now);this.reconcileHammerfallStartup();if(this.toolUseBlocksPrimary())return false;
    if (this.cursed("tools", now)) return false; // release 737: NO TOOLS (Hammerfall, Great Sweep, Mirage of Blades)
    if (kind === 'great-sweep' && fieldOn(this.save, 'nanoknives')) { const accepted=this.mirageThrow(now); if(accepted)this.cancelConsumeVisual('tool'); return accepted; } // release 533; 649: Mirage of Blades
    const B = BRAWLER[kind], p = this.player, boxing = now < (this.boxingUntil || 0) ? BRAWLER["shadow-boxing"] : null; if (!B || now < (this.toolReadyAt || 0)) return false;
    if(kind==='great-sweep'&&this.closeViewActionEligible()){const counter=Number(this.save.toolUseCounter),effective=B.cooldown*1000*this.glyphLoadout('tool').mods.cooldown*(1-armorGlyphBonus(this.save).attackSpeed);if(toolUseStartupMs(kind,effective)==null||!Number.isSafeInteger(counter)||counter<0||counter>=Number.MAX_SAFE_INTEGER)return false;}
    const priorTool=normalizeAttackVisual(p.attackVisual),priorDeadline=attackVisualDeadline(p,priorTool),continuing=priorTool?.toolKind==='great-sweep'&&priorTool.toolMotion?.v===1&&!priorTool.presentationCancelled&&priorDeadline>now,sweepDirection=continuing?-(priorTool.toolMotion.direction||1):1;
    const priorPose=kind==='great-sweep'&&continuing?sampleToolActionMotion(priorTool,priorTool.durationMs-(priorDeadline-now)):null;
    if (boxing && kind === "great-sweep") this.shadowBoxStep(B.radius * .6, now); // release 495: Shadow Boxing carries the sweep to the foe
    const cx = p.x + .5, cy = p.y + .45;
    this.toolReadyAt = now + B.cooldown * 1000 * this.glyphLoadout("tool").mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed);
    // Release 569 (Tim: "spell blade works for both. But charged air only works for the great sweep"): while a spell runs,
    // Spellblade strengthens Hammerfall and the Great Sweep (more damage; the hammer reaches and the sweep spreads farther),
    // and Charged Air the Great Sweep alone (more damage, a wider sweep).
    const blade = this.spellbladeOn(now), air = kind === "great-sweep" && fieldOn(this.save, "charged-air") && this.spellRunning(now), SB = FIELD_PASSIVES.spellblade, CA = FIELD_PASSIVES["charged-air"];
    const fieldMult = (blade ? 1 + SB.damage : 1) * (air ? 1 + CA.damage : 1), fieldGrow = (kind === "great-sweep" && blade ? 1 + SB.reach / B.radius : 1) * (air ? CA.blast : 1);
    if(kind==='great-sweep'&&this.closeViewActionEligible()){
      const effectiveCooldown=B.cooldown*1000*this.glyphLoadout('tool').mods.cooldown*(1-armorGlyphBonus(this.save).attackSpeed),startupMs=toolUseStartupMs(kind,effectiveCooldown),counter=Number(this.save.toolUseCounter);if(startupMs==null||!Number.isSafeInteger(counter)||counter<0||counter>=Number.MAX_SAFE_INTEGER)return false;
      const id=`tool-use-${counter+1}`,plan=echoPlan(this.glyphLoadout('tool')),effect={kind,brawler:true,life:B.lifetime,radius:B.radius*fieldGrow,pulse:99,damage:Math.max(1,Math.round(this.toolPower()*B.share*(1+(boxing?.damage||0))*fieldMult)),glyphHost:'tool',healShare:boxing?.heal||0,imbue:this.imbueBonus(now)},echoCopies=(plan?.copies||[]).map((c,i)=>({delayMs:BRAWLER_ECHO.toolGap*1000*(i+1),share:c.share,index:i+1}));
      this.save.toolUseCounter=counter+1;p.attackUntil=now+240;const toolVisual=stampAttackVisual(p,'sweep',TOOL_ACTION_TIMING[kind].durationMs,null);if(!toolVisual)return false;const primary=this.save.equipment.primary?.id,baseKind=priorPose?priorTool.toolMotion.baseKind:primary==='primary-cinder-pike'?'cinder-pike':primary==='primary-verge-cleaver'?'verge-cleaver':'salvage-blade';toolVisual.toolKind=kind;toolVisual.toolMotion={v:1,entry:priorPose?[priorPose.yaw,priorPose.side,priorPose.up,priorPose.forward,priorPose.weight]:[0,0,0,0,0],direction:sweepDirection,baseKind};toolVisual.toolUse={v:1,id,startupMs,phase:'startup'};p.actionVisualUntil=now+toolVisual.durationMs;
      this.pendingToolUse={v:1,id,toolKind:kind,area:this.area,areaId:this.areaId(),levelId:String(this.map?.levelId||'root'),acceptedAt:now,releaseAt:now+startupMs,startupMs,aim:projectileDirection(this.save.lastAim?.x||0,this.save.lastAim?.y||0,p.facing),payload:{v:1,family:'sweep',effect,pellets:0,spread:0,awakenedFan:false,echoCopies,cloneEligible:this.shadowCloneActive(now)&&!this.shadowClone.charging,cloneProfile:{...BRAWLER_ECHO.cloneArc,damage:primaryProfile(this.save.equipment.primary).damage+characterStats(this.save).meleeBonus}}};this.message='Great Sweep!';this.cancelConsumeVisual('tool');return true;
    }
    let visualAim = null;
    const fx = (x, y, extra = {}) => { const e = { id: `tool-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind, brawler: true, x, y, life: B.lifetime, radius: B.radius, pulse: 99, untilPulse: 0, damage: Math.max(1, Math.round(this.toolPower() * B.share * (1 + (boxing?.damage || 0)) * fieldMult)), pulseIndex: 0, hits: {}, glyphHost: "tool", healShare: boxing?.heal || 0, imbue: this.imbueBonus(now), ...extra }; if (fieldGrow !== 1) e.radius *= fieldGrow; /* release 495: boxing damage and heal; 569: Spellblade and Charged Air */ this.effects.push(e); return e; };
    let main;
    if (kind === "hammerfall") {
      const reach = B.reach + (boxing ? boxing.stick : 0) + (blade ? SB.reach : 0); // release 495: with Shadow Boxing the hammer reaches farther; 569: Spellblade too
      let { d, foe } = this.brawlerAim(reach + 1); if (!foe && direction && Math.hypot(direction.x, direction.y) > .01) d = projectileDirection(direction.x, direction.y, p.facing);
      const fd = foe ? Math.hypot(foe.x + .5 - cx, foe.y + .45 - cy) : Infinity, at = fd <= reach + .5 ? { x: foe.x + .5, y: foe.y + .45 } : { x: cx + d.x * B.reach, y: cy + d.y * B.reach };
      visualAim = d;
      main = fx(at.x, at.y, { delay: B.delay, stun: B.stun });
      if (fieldOn(this.save, "corridor-golem")) this.raiseGolem(at, now + B.delay * 1000); // release 535
    } else main = fx(cx, cy); // Great Sweep: all round you
    { const plan = echoPlan(this.glyphLoadout("tool")); if (plan && main) plan.copies.forEach((c, i) => this.effects.push({ ...main, id: main.id + (i ? `-echo${i + 1}` : "-echo"), hits: {}, delay: (main.delay || 0) + BRAWLER_ECHO.toolGap * (i + 1), damage: Math.max(1, Math.round(main.damage * c.share)), imbue: (main.imbue || 0) * c.share, echo: true })); } // release 503: Echo in the tool repeats the blow; 507: one more per Echo glyph, bang, bang, boom
    this.cloneSwing({ ...BRAWLER_ECHO.cloneArc, damage: primaryProfile(this.save.equipment.primary).damage }, projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing), now); // release 503: the Shadow Clone swings along
    p.attackUntil = now + 240;
    const hammerDurationMs=B.delay*1000+B.lifetime*1000;
    const visualMs=kind==='great-sweep'?TOOL_ACTION_TIMING['great-sweep'].durationMs:hammerDurationMs;
    const toolVisual = stampAttackVisual(p, kind === "hammerfall" ? "hammer" : "sweep", visualMs, visualAim);
    if (toolVisual && kind === "hammerfall") { Object.assign(toolVisual, { hammerEffectId: main.id, hammerDelayMs: B.delay * 1000, hammerRecoveryMs: B.lifetime * 1000 }); p.actionVisualUntil = now + hammerDurationMs; const logicalNow = now - (this.presentationPausedMs || 0), prior = recentHeroPresentation(p, logicalNow, p.x, p.y); if (prior) toolVisual.facingYaw = Math.atan2(Math.sin(prior.yaw), Math.cos(prior.yaw)); }
    if(kind==='hammerfall'&&this.closeViewActionEligible())this.hammerfallStartup={v:1,effectId:main.id,area:this.area,areaId:this.areaId(),levelId:String(this.map?.levelId||'root')};
    if (toolVisual && kind === "great-sweep") { const primary=this.save.equipment.primary?.id,baseKind=priorPose?priorTool.toolMotion.baseKind:primary==='primary-cinder-pike'?'cinder-pike':primary==='primary-verge-cleaver'?'verge-cleaver':'salvage-blade';toolVisual.toolKind = "great-sweep";toolVisual.toolMotion={v:1,entry:priorPose?[priorPose.yaw,priorPose.side,priorPose.up,priorPose.forward,priorPose.weight]:[0,0,0,0,0],direction:sweepDirection,baseKind};p.actionVisualUntil=now+visualMs; }
    this.cancelConsumeVisual('tool');
    this.message = kind === "hammerfall" ? "Hammerfall!" : "Great Sweep!";
    return true;
  }
  // The healing hot springs (landscape.ts HOT_SPRINGS; Tim, 2026-11-05). Called once a frame from update, after every blow of the
  // frame has landed and been guarded (`hurt`: health fell this frame). One state object for the journey's play, mutated in place
  // (no per-frame allocation); its clocks run on the frame's dt only, so paused or backgrounded time never counts.
  springFoeNear() {
    const H = HOT_SPRINGS, p = this.player;
    for (const e of this.enemies) {
      if (e.dead || e.ambient || e.passiveBehavior || e.retreating || e.passingBeast || e.playing || e.astralCompanionOf || e.astralAllyOf || e.blobRemnant || e.kind === "npc" || (e.skirmishId && !e.skirmishProvoked)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= (e.aggro ? H.aggroNear : H.foeNear)) return true;
    }
    return false;
  }
  tickHotSprings(dt, hurt, now) {
    const H = HOT_SPRINGS, p = this.player, step = Math.max(0, Math.min(H.step, Number(dt) || 0));
    const S = this.springSoak || (this.springSoak = { calm: 0, away: H.visitGap, told: false, scanIn: 0, foes: false, wisp: 0 });
    S.calm = hurt || !(p.hp > 0) ? 0 : S.calm + step;
    if (this.area !== "overworld" || !this.map?.terraces || !(p.hp > 0)) { S.away = H.visitGap; S.told = false; return false; }
    const t = tileUnder(this.map, 32, p.x, p.y);
    const soaking = !!t && t.landscape === "terraces" && H.kinds.includes(t.kind) && !(now < (this.jumpUntil || 0)) && !this.glide && !this.droneLift && this.skyAir == null && !this.swimming && !this.mechUp() && !this.mountRide() && !aboard(this.save);
    if (!soaking) { S.away += step; if (S.away >= H.visitGap) S.told = false; return false; }
    S.away = 0;
    const ceiling = healthCeiling(this.save), maxHp = Number(this.save.maxHp) || 0;
    if (p.hp >= Math.min(maxHp, ceiling)) return false;
    if ((S.scanIn -= step) <= 0) { S.scanIn = H.scan; S.foes = this.springFoeNear(); }
    if (S.foes || S.calm < H.calm) return false;
    p.hp = springMend(p.hp, maxHp, ceiling, step);
    if (!S.told) { S.told = true; this.message = H.message; }
    if ((S.wisp -= step) <= 0) { S.wisp = H.wisp; (this.glyphVisuals ||= []).push({ kind: "steam", x: p.x + .5, y: p.y + .35, life: H.wispLife, max: H.wispLife }); }
    return true;
  }
  // Release 669 (Tim, 2026-11-01: "there's rest points at the top of great trees... you have to reach the top platform... touch it
  // to activate it... if you die... you come back to the top of that great tree"): stepping on the Crown Rest makes it the rest
  // point you wake at, and keeps it among your rest points.
  touchCrownRest() {
    const o = this.map.objects.find((q) => q.kind === "crownRest"), p = this.player; if (!o || Math.hypot(p.x - o.x, p.y - o.y) > .9) return false;
    { const w = mapWidth(this.map, this.area), at = this.map.tiles[o.y * w + o.x], under = tileUnder(this.map, w, p.x, p.y); if (at && under && (under.elev || 0) !== (at.elev || 0)) return false; } // only on the crown itself (TREE_GLIDE): not from the ground or a branch just beside it
    return this.takeCrownRest(o);
  }
  // A Crown (or Keep) Rest becomes the active rest point and is kept among the rest points. False when it already was. Also used by
  // wakeOnCrown (TREE_GLIDE.home.setsRest, Decision 14), whose own wake message then follows.
  takeCrownRest(o) {
    const c = this.save.activeCheckpoint; if (c && c.rx === this.rx && c.ry === this.ry && c.x === o.x && c.y === o.y) return false;
    this.save.activeCheckpoint = { rx: this.rx, ry: this.ry, x: o.x, y: o.y, name: o.keepRest ? "Keep Rest" : "Crown Rest", crown: true }; (this.save.checkpoints ||= {})[`${this.rx},${this.ry}`] = this.save.activeCheckpoint;
    this.message = o.keepRest ? "The keep's crown is yours: you will wake here if you fall." : "The crown hums under your feet: the great tree will hold you here if you fall."; return true;
  }
  // Release 659 (Tim: "I'm trapped in the listener's dungeon. There's no exit"): on a multi-level floor, which way the passages
  // up and down (or the way out) lie from where the Wayfarer stands, as compass words.
  levelWays() {
    if (this.area !== "dungeon" || !this.map?.multiLevel) return ""; const p = this.player, dir = (o) => { const dx = o.x - p.x, dy = o.y - p.y, a = []; if (dy < -2) a.push("north"); if (dy > 2) a.push("south"); if (dx > 2) a.push("east"); if (dx < -2) a.push("west"); return a.join("-") || "here"; };
    const out = this.map.objects.find((o) => o.kind === "exit"), up = this.map.objects.find((o) => o.kind === "deepTransition" && /:up$/.test(o.id)), down = this.map.objects.find((o) => o.kind === "deepTransition" && /:down$/.test(o.id));
    return [out ? ` Way out: ${dir(out)}.` : up ? ` Way up: ${dir(up)}.` : "", down ? ` Way down: ${dir(down)}.` : ""].join("");
  }
  // Release 651 (fractured.ts): Fractured mode. The mode, if it holds here: not in towns, hamlets, home, the Refuge lands, the
  // starting section, Skylands, arenas, Array runs, hunts, horde or elite-portal dungeons, or a dungeon already cleared.
  fracturedHere(area = this.area) {
    const mode = fracturedMode(this.save); if (!mode || !this.map) return null;
    if (fractureSealed(this.save, fractureKey(area, this.areaStateId()))) return null; // release 666: a Warden felled here sealed it
    if (area === "overworld") {
      const home = homeCenter(this.save), lands = this.refugeLandsWhere() || {}, at = (q) => q && q.rx === this.rx && q.ry === this.ry;
      if (this.map.settlement || this.map.hamlet || (this.rx === 0 && this.ry === 0) || at(home) || at(lands.farm) || at(lands.quarry) || townAt(this.save, this.rx, this.ry)) return null;
      return mode;
    }
    if (area !== "dungeon") return null;
    const id = String(this.areaId() || ""), h = this.save.consequences?.dungeons?.[id];
    if (this.map.arena || isArrayRun(id) || isSkyland(id) || id.startsWith("hunt-") || id.startsWith("elite-portal:") || h?.horde || h?.resolved || h?.guardianDefeated || h?.combatClear?.completed) return null;
    return mode;
  }
  fracturedOpen(x, y, w = mapWidth(this.map, this.area)) { const p = this.player; return footprintOpen(this.map, w, x, y) && !footprintHazard(this.map, w, x, y) && !(this.map.tiles[y * w + x]?.canopy) && Math.hypot(x - p.x, y - p.y) >= 4; }
  // Release 675 (deep-annex.ts): a crossing never entered that is a Starfield Deep Annex says so on its entrance.
  markDeepAnnexes() {
    let found = false;
    for (const o of this.map?.objects || []) { if (o.kind !== "dungeon" || o.dungeonType) continue;
      const id = o.dungeonId || dungeonId(this.save.seed, this.save.worldGeneration, this.rx, this.ry, o.id), h = this.save.consequences?.dungeons?.[id];
      const annex = h && h.generatorVersion !== undefined ? h.deepAnnex?.floor === 1 : !this.save.session.areas?.[id] && !!annexRecord(this.save.seed, id, chasmRoll(this.save.seed, id));
      if (annex) { o.deepAnnex = true; o.name = DEEP_ANNEX.name; o.identity = "three floors down; its far door lets you out elsewhere"; found = true; } }
    if (found && !this.message) this.message = DEEP_ANNEX.messages.entrance;
    return found;
  }
  // A cleared annex floor (not the last) opens the stair down beside its Cleared Return.
  placeAnnexStair(history) {
    const A = history?.deepAnnex; if (!A || A.floor >= DEEP_ANNEX.floors || !history.combatClear?.completed || this.area !== "dungeon") return null;
    if (this.map.objects.some((o) => o.kind === "annexStair")) return null;
    const exit = this.map.objects.find((o) => o.id === "expedition-fast-exit") || this.map.entry; if (!exit) return null;
    const w = mapWidth(this.map, this.area); let at = null;
    for (let r = 1; r <= 5 && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r && !at; dx++) { const x = Math.round(exit.x) + dx, y = Math.round(exit.y) + dy; if ((dx || dy) && footprintOpen(this.map, w, x, y) && !this.map.objects.some((o) => Math.round(o.x) === x && Math.round(o.y) === y)) at = { x, y }; }
    if (!at) return null;
    const stair = { id: "annex-stair", kind: "annexStair", name: `Annex Stair · down to floor ${A.floor + 1}`, x: at.x, y: at.y, state: "open", actions: ["descend"], toId: annexFloorId(A.base, A.floor + 1), floor: A.floor + 1 };
    this.map.objects.push(stair); return stair;
  }
  // Great buildings (great-buildings.ts): a stair up or down to the next floor, each floor an area of its own.
  goBuildingFloor(toId, x, y) {
    const from = this.map?.building?.pentagon ? this.areaId() : null;
    const prev = dungeonHistory(this.save, this.areaId()); prev.visitOpen = false; this.snapshotArea();
    this.save.session.activeDungeonId = toId; this.save.session.activeDungeonLevelId = null; pinDungeonLayout(this.save, toId);
    const h = dungeonHistory(this.save, toId); h.visits++; h.visitOpen = true;
    this.loadArea("dungeon", false); const at = buildingArrival(this.map, x, y); this.player.x = at.x; this.player.y = at.y;
    relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); this.settleArrival(); this.projectiles = [];
    this.pentagonPrevious = from && this.map?.building?.pentagon ? { from, to: toId } : null;
  }
  // Is a Great Castle on this corner for this journey? Its four sections must be new ground (none explored before castles).
  castleHere(X, Y) {
    const atlas = this.save.atlas || {}, seed = this.save.seed, gen = this.save.worldGeneration, memo = this.settleMemo();
    const settled = (rx, ry) => { const k = `${rx},${ry}`; if (!memo.has(k)) memo.set(k, regionSettled(rx, ry) || hamletSection(seed, rx, ry) || openSeaSection(seed, rx, ry)); return memo.get(k); }; // no castle where a town, a hamlet or the open sea stands
    const inPent = (rx, ry) => { const c = pentagonCentre(rx, ry); return !!c && this.pentagonHere(c.cx, c.cy); }; // a Pentagon's sections hold no castle
    const fresh = this.coherentGround([0, 1, 2, 3].map((q) => quarterSection(X, Y, q))); // WG-04: on ground all new, a far domain's arena holds no castle
    return castleAt(seed, X, Y, sectionExits, (rx, ry) => settled(rx, ry) || inPent(rx, ry) || (fresh && this.domainCentreAt(rx, ry)), (rx, ry) => { const a = atlas[`${rx},${ry}`]; return !!a && !a.castleVersion; });
  }
  // WG-11: the settled-section memo shared by castleHere, pentagonHere and wonderTarget, bounded (COHERENCE.memo keys).
  settleMemo() { const memo = (this._castleSettle ||= new Map()); if (memo.size > COHERENCE.memo) memo.clear(); return memo; }
  // World coherence for a group of sections (a castle's four, a Pentagon's nine): every one of them unseen, or first seen
  // under world coherence. Then the group follows its rules; else (any seen before) it stands as it always did.
  coherentGround(cells) { const atlas = this.save.atlas || {}; return cells.every(({ rx, ry }) => !!coherenceOf(atlas[`${rx},${ry}`])); }
  domainCentreAt(rx, ry) { return Object.keys(FAR_DOMAINS).some((id) => { const c = farDomainCentre(this.save.seed, id); return c.rx === rx && c.ry === ry; }); }
  // Release 729 (Tim: "hunting for them is going to be pretty important... we already have the indicators on the ground that
  // point to different things... we can use them to point to these labyrinths and superstructures"): one more ground cue, gold,
  // toward the nearest Pentagon (its centre, within WONDER_CUE.pentagon sections) or labyrinth (within WONDER_CUE.labyrinth) that
  // stands on ground not yet explored. Memoised per section.
  wonderCue() {
    if (this.map?.settlement || this.map?.greatBuilding?.pentagon) return null; const key = `${this.rx},${this.ry}`, memo = (this._wonderMemo ||= new Map());
    if (!memo.has(key)) { if (memo.size > 64) memo.clear(); memo.set(key, this.wonderTarget()); } const t = memo.get(key); if (!t) return null;
    const spot = [[15, 16], [18, 14], [12, 17], [16, 12], [20, 17]].find(([x, y]) => !this.map.tiles[y * 32 + x]?.blocked && !this.map.objects.some((o) => Math.round(o.x) === x && Math.round(o.y) === y)); if (!spot) return null;
    return { id: "waymark-wonder", kind: "wayfindingCue", signalKind: "wonder", x: spot[0], y: spot[1], dirX: Math.sign(t.rx - this.rx), dirY: Math.sign(t.ry - this.ry), targetRx: t.rx, targetRy: t.ry, name: t.name, state: "quiet", actions: [] };
  }
  // Pentagon finding (2026-11-05): on ground first seen from now on (atlas `sigilVersion`), the gold cue points only to labyrinths. Pentagons have their own sigils (pentagonSigil),
  // which point at the Pentagon whose catchment holds the section (pentagon.ts PENTAGON_FINDING); before, the nearer labyrinth
  // won nearly every section and a Pentagon farther than 14 sections (Manhattan) was never pointed to.
  // A section first seen before the sigils (no `sigilVersion` atlas pin) keeps the release 729 cue exactly as it was, Pentagons
  // and all, so the objects of explored ground do not change.
  wonderTarget() {
    const atlas = this.save.atlas || {}, seed = this.save.seed, W = WONDER_CUE, out = [];
    if (!atlas[`${this.rx},${this.ry}`]?.sigilVersion) { const d = (x, y) => Math.abs(x - this.rx) + Math.abs(y - this.ry), E = PENTAGON.every;
      for (let cy = Math.floor((this.ry - W.pentagon) / E) * E; cy <= this.ry + W.pentagon; cy += E) for (let cx = Math.floor((this.rx - W.pentagon) / E) * E; cx <= this.rx + W.pentagon; cx += E) {
        if (atlas[`${cx},${cy}`] || d(cx, cy) > W.pentagon || d(cx, cy) <= 1) continue; if (this.pentagonHere(cx, cy)) out.push({ rx: cx, ry: cy, name: PENTAGON.name, d: d(cx, cy) }); } }
    const memo = this.settleMemo(), settled = (rx, ry) => { const k = `${rx},${ry}`; if (!memo.has(k)) memo.set(k, regionSettled(rx, ry) || hamletSection(seed, rx, ry) || openSeaSection(seed, rx, ry)); return memo.get(k); };
    for (let r = 2; r <= W.labyrinth; r++) for (let oy = -r; oy <= r; oy++) for (const ox of [r - Math.abs(oy), Math.abs(oy) - r]) { const rx = this.rx + ox, ry = this.ry + oy; if (atlas[`${rx},${ry}`] || !labyrinthHere(seed, rx, ry, null)) continue;
      const c = pentagonCentre(rx, ry); if (c && this.pentagonHere(c.cx, c.cy)) continue; const k = castleCorner(rx, ry); if (k && this.castleHere(k.X, k.Y)) continue; if (settled(rx, ry)) continue; out.push({ rx, ry, name: "a labyrinth", d: r }); }
    return out.sort((a, b) => a.d - b.d)[0] || null;
  }
  // ---------------------------------------------------------------------------------------- finding a Pentagon (PENTAGON_FINDING)
  // The full test (pentagonHere), remembered per centre section (bounded; a new game starts afresh). The cheap exclusions over a
  // Pentagon's nine sections (a town, a hamlet) run first, in pentagonCandidate, so the costly open-sea test is asked rarely.
  pentagonReal(cx, cy) { const memo = (this._pentReal ||= new Map()), k = `${cx},${cy}`; if (memo.has(k)) return memo.get(k); if (memo.size >= PENTAGON_FINDING.memo) memo.clear(); const v = this.pentagonHere(cx, cy); memo.set(k, v); return v; }
  pentagonCheap() { const seed = this.save.seed; return (rx, ry) => regionSettled(rx, ry) || hamletSection(seed, rx, ry); }
  pentagonBase(cx, cy) { const V = this.pentagonVersion(cx, cy); return `pentagon:${this.save.seed}:${cx}:${cy}${V >= 2 ? `:v${V}` : ""}`; }
  // Is the Pentagon at (cx, cy) complete (its finale won, or its Regent fallen before the Stillworks)? Reads the history; never makes one.
  pentagonDone(cx, cy) { const base = this.pentagonBase(cx, cy), H = this.save.consequences?.dungeons?.[`${base}:f1`]; return !!H && (!!H.pentComplete || pentagonCompleted(H) || pentagonFellEarly(this.save, base)); }
  // The Pentagon whose catchment holds section (rx, ry): the nearest not yet complete within PENTAGON_FINDING.reach, or null.
  pentagonCatchmentAt(rx = this.rx, ry = this.ry, opts = {}) {
    return pentagonCatchment(this.save.seed, rx, ry, { real: (cx, cy) => this.pentagonReal(cx, cy), cheap: this.pentagonCheap(), skip: (cx, cy) => this.pentagonDone(cx, cy) || (opts.skip ? opts.skip(cx, cy) : false), reach: opts.reach });
  }
  inPentagonBlock(rx, ry, cx, cy) { return Math.abs(rx - cx) <= 1 && Math.abs(ry - cy) <= 1; }
  // A Pentagon sigil on this section, or null: on ground first seen with the sigils (atlas `sigilVersion`), on `sigil.chance` of a
  // catchment's sections (pentagonSigilRoll), never in a town, a hamlet, a far domain or
  // in a Pentagon's own nine sections, cut on the first clear ground of `sigil.spots` (not blocked, lethal, deep water or a slope,
  // nothing standing within a tile). Its arrow (dirX, dirY) runs from the sigil to the middle of the Pentagon's centre section.
  pentagonSigil() {
    const F = PENTAGON_FINDING, map = this.map; if (this.area !== "overworld" || !map?.tiles || map.settlement || map.hamlet || map.farDomain || map.pentagon || map.greatBuilding?.pentagon) return null;
    if (!this.save.atlas?.[`${this.rx},${this.ry}`]?.sigilVersion) return null; // only on ground first seen with the sigils (explored ground keeps its objects)
    if (!pentagonSigilRoll(this.save.seed, this.rx, this.ry)) return null;
    const own = pentagonCentre(this.rx, this.ry); if (own && this.pentagonReal(own.cx, own.cy)) return null;
    const t = this.pentagonCatchmentAt(); if (!t) return null;
    const clear = (x, y) => { const q = map.tiles[y * 32 + x]; return !!q && !q.blocked && !q.slope && !q.perch && !LETHAL_KINDS.has(q.kind) && !q.pit && !q.voidScar && !map.objects.some((o) => Math.abs(o.x - x) < 1.5 && Math.abs(o.y - y) < 1.5); };
    const spot = F.sigil.spots.find(([x, y]) => clear(x, y)); if (!spot) return null;
    const [x, y] = spot, dx = (t.cx - this.rx) * 32 + 16 - (x + .5), dy = (t.cy - this.ry) * 32 + 16 - (y + .5);
    return { id: "pentagon-sigil", kind: "pentWaysign", name: F.name, x, y, dirX: dx, dirY: dy, targetRx: t.cx, targetRy: t.cy, state: "quiet", actions: ["read"] };
  }
  // Once a section has settled: the catchments of the neighbouring sections a sigil may stand on, so the next crossing's sigil
  // finds its Pentagon's full test already remembered (pentagonReal). At most eight bounded searches, nearly all remembered.
  warmPentagonCatchments() {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && pentagonSigilRoll(this.save.seed, this.rx + dx, this.ry + dy)) this.pentagonCatchmentAt(this.rx + dx, this.ry + dy);
  }
  // Reading a sigil: where it points and how far, in words only (Tim, 2026-11-05: "it shouldn't set your compass to it"). The
  // compass, the Atlas and the guidance are left alone; the save remembers the line (pentagonFinding.follow) only so that reaching
  // that Pentagon can say so.
  readPentagonSigil(o) {
    const F = PENTAGON_FINDING, s = ensurePentagonFinding(this.save).pentagonFinding, cx = o.targetRx, cy = o.targetRy;
    s.follow = { cx, cy, rx: this.rx, ry: this.ry }; s.read += 1; o.state = "read";
    this.message = pentagonSigilText(this.rx, this.ry, cx, cy);
    journalOnce(this.save, `pentagon-sigil:${cx}:${cy}`, F.messages.sigilJournal(pentagonHeading(cx - this.rx, cy - this.ry), pentagonFarWords(Math.round(Math.hypot(cx - this.rx, cy - this.ry)))), PENTAGON.name);
    this.sync();
    return { ok: true, message: this.message };
  }
  // Each overworld arrival: a followed sigil's Pentagon reached (or completed) lets the compass go; a hunt's Pentagon reached is
  // found, and complete is done (its notice, and the next hunt is looked for). Cheap: a few comparisons and history reads.
  pentagonFindingArrive() {
    const F = PENTAGON_FINDING, M = F.messages, s = ensurePentagonFinding(this.save).pentagonFinding, note = (title, detail) => (this.questNotices ||= []).push({ title, detail, kind: "discovery" });
    if (s.follow && (this.inPentagonBlock(this.rx, this.ry, s.follow.cx, s.follow.cy) || this.pentagonDone(s.follow.cx, s.follow.cy))) { if (!this.pentagonDone(s.follow.cx, s.follow.cy)) note(M.arrived, M.arrivedDetail); s.follow = null; }
    for (const h of s.hunts) { if (h.status === "done") continue;
      if (this.pentagonDone(h.cx, h.cy)) { h.status = "done"; h.doneAt = Object.keys(this.save.explored || {}).length; note(M.huntDone, M.huntDoneDetail); journalOnce(this.save, `pentagon-hunt-done:${h.id}`, `The Pentagon hunt is complete: the Pentagon at ${h.cx}, ${h.cy}.`, PENTAGON.name); continue; }
      if (h.status === "open" && this.inPentagonBlock(this.rx, this.ry, h.cx, h.cy)) { h.status = "found"; note(M.huntFound, `${PENTAGON.name} at ${h.cx}, ${h.cy}`); } }
    ensurePentagonFinding(this.save);
  }
  // Lays out the next Pentagon hunt while fewer than `hunts.offer` are open: one search a call (game.update calls it once per
  // section, after the arrival has settled), round the probes of pentagonHuntProbes, each the nearest Pentagon not yet complete
  // and not already hunted, at least `spread`/2 in bearing from every open hunt. Returns the hunt, or null.
  offerPentagonHunt() {
    const F = PENTAGON_FINDING, H = F.hunts, s = ensurePentagonFinding(this.save).pentagonFinding, open = pentagonHuntsOpen(this.save); if (open.length >= H.offer || this.area !== "overworld") return null;
    const taken = new Set(open.map((q) => `${q.cx},${q.cy}`)), bear = (cx, cy) => Math.atan2(cy - this.ry, cx - this.rx), apart = (a, b) => Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    for (const p of pentagonHuntProbes(this.save.seed, s.n, this.rx, this.ry, open)) {
      const t = this.pentagonCatchmentAt(p.rx, p.ry, { skip: (cx, cy) => taken.has(`${cx},${cy}`) || this.inPentagonBlock(this.rx, this.ry, cx, cy) }); if (!t) continue;
      if (open.some((q) => apart(bear(q.cx, q.cy), bear(t.cx, t.cy)) < H.spread / 2)) continue;
      const hunt = { id: `pentagon-hunt-${s.n + 1}`, n: s.n + 1, cx: t.cx, cy: t.cy, status: "open", from: { rx: this.rx, ry: this.ry } }; s.n += 1; s.hunts.push(hunt);
      journalOnce(this.save, `pentagon-hunt:${hunt.id}`, F.messages.huntJournal(pentagonHeading(t.cx - this.rx, t.cy - this.ry), pentagonFarWords(Math.round(Math.hypot(t.cx - this.rx, t.cy - this.ry)))), PENTAGON.name); // a quiet Journal line, no banner (Tim, 2026-11-05)
      return hunt; }
    s.n += 1; return null; // nothing there this time: the next call looks along other bearings
  }
  // The Pentagon v3: a deep keeper gives a Tesseract glyph; the Regent's fall decides his hoard's grade (Sovereign when every
  // champion fell first). Champions: the lords of the trial halls and the Heart's keepers, as recorded in pentBosses.
  // A sigil door: shut without the Seal; in v2 and v3 the Seal opens them all at once; from v4 each one opens when you use it with
  // the Seal in hand (that use opens it and no more: use it again to go through). Returns a refusal or an opening, or null to pass.
  pentagonSigilDoor(o, base) {
    const H = dungeonHistory(this.save, `${base}:f1`);
    if (!H.pentSigil) { this.message = o.sigilKey ? PENTAGON.messages.sigilV4 : PENTAGON.messages.sigil; return { ok: false, message: this.message }; }
    if (!o.sigilKey || (H.pentOpened || []).includes(o.sigilKey)) return null;
    H.pentOpened = [...(H.pentOpened || []), o.sigilKey]; o.unsealed = true; this.message = PENTAGON.messages.sigilOpens; this.sync(); return { ok: true, message: this.message };
  }
  // Release 735: the Regent's Hoard (Pentagon v3+) stays shut while the Regent lives, so opening it first can never forfeit the
  // Sovereign grade. Only a living Regent holds it: once she has fallen (regentGrade), or where none stands, it opens as before.
  regentHoldsHoard() {
    const B = this.map?.building; if (this.area !== "dungeon" || !B?.pentagon || !(B.V >= 3) || !B.vault) return false;
    if (dungeonHistory(this.save, `${B.base}:f1`).regentGrade) return false;
    return (this.enemies || []).some((e) => e.pentBoss && String(e.id).endsWith(":guardian") && !e.dead && e.hp > 0); // the Regent's spawn id (pentagon.ts)
  }
  pentagonChampionDown(e) {
    const B = this.map.building, H = dungeonHistory(this.save, `${B.base}:f1`);
    if (B.vault && B.V >= 4 && !H.pentSigil) { H.pentSigil = true; journalOnce(this.save, `pentagon-seal:${B.base}`, PENTAGON.messages.sealV4, PENTAGON.name); this.defeatNotice = { title: "THE FIVEFOLD SEAL", detail: "the Regent's; it opens the sigil doors you go back to", kind: "discovery" }; }
    if (B.vault) { const down = new Set([...(H.pentBosses || [])]).size; H.regentGrade = down >= (B.champions || 8) ? "sovereign" : "regent"; this.message = (H.regentGrade === "sovereign" ? "The Regent falls, the last of the Fivefold Court's champions. Her hoard glows." : "The Regent falls.") + (B.V >= 4 ? ` ${PENTAGON.messages.sealV4}` : ""); return; }
    if (B.heartFloor >= PENTAGON.deepGlyphFrom && B.boss) this.awardTesseract(`${B.base}:keeper:${B.node}`, "deep", B.heartFloor - PENTAGON.deepGlyphFrom);
  }
  // The Mountain Turtle's shell (turtle-shell.ts). Its fall on the overworld leaves the shell where it fell, recorded in the
  // save; past kills have none. Each load of the section lays the recorded shells over the generated ground.
  restTurtleShell(e, cycle) {
    this._shellCycle = null; if (this.area !== "overworld" || !Number.isInteger(cycle) || !this.map) return null;
    const at = placeTurtleShell(this.map, e, { player: this.player, exitsOpen, seed: this.save.seed, cycle });
    if (!at) { this.message = `${this.message ? this.message + " " : ""}${TURTLE_SHELL.messages.none}`; return null; }
    const rec = { id: shellId(cycle), cycle, slain: this.save.worldBeasts[TURTLE_SHELL.beast]?.slain || 0, rx: this.rx, ry: this.ry, x: at.x, y: at.y, skirt: at.skirt, lab: shellLabyrinthBase(this.save.seed, cycle, this.rx, this.ry), at: Math.round(Number(this.save.playSeconds) || 0) };
    for (const old of addShell(this.save, rec)) if (old.rx === this.rx && old.ry === this.ry && liftTurtleShell(this.map, old.id)) this.save.turtleShells.faded = this.save.turtleShells.faded.filter((f) => f.id !== old.id); // the old shell, here, crumbles as you watch
    applyTurtleShell(this.map, rec);
    if (this.seaIce?.tiles?.size) for (const i of [...this.seaIce.tiles.keys()]) if (!this.map.tiles[i]?.seaIce) this.seaIce.tiles.delete(i); // sand where its ice was: nothing left to thaw there
    for (const q of this.enemies) if (!q.dead && q !== e && !q.flying && !q.seaKind) relocateIfStranded(q, this.map, 32);
    const text = at.skirt ? TURTLE_SHELL.messages.skirt : TURTLE_SHELL.messages.rest; this.message = `${this.message ? this.message + " " : ""}${text}`;
    journalOnce(this.save, `turtle-shell:${rec.id}`, `${text} (${this.rx}, ${this.ry})`, WORLD_BEASTS[TURTLE_SHELL.beast].name);
    (this.questNotices ||= []).push({ title: "THE SHELL-LABYRINTH", detail: "a gateway in the Turtle's shell · Act to enter", kind: "discovery" });
    return rec;
  }
  layTurtleShells() {
    if (!this.save.turtleShells) ensureTurtleShells(this.save);
    for (const f of takeFaded(this.save, this.rx, this.ry)) { this.message = TURTLE_SHELL.messages.fade; journalOnce(this.save, `turtle-shell-faded:${f.id}`, `${TURTLE_SHELL.messages.fade} (${this.rx}, ${this.ry})`, WORLD_BEASTS[TURTLE_SHELL.beast].name); }
    for (const r of shellsAt(this.save, this.rx, this.ry)) applyTurtleShell(this.map, r);
  }
  // The Shell-Labyrinth's vault pays once: a Tesseract glyph or Divine Viscera, as the kill decided (TURTLE_SHELL.vault).
  payShellVault(B) {
    const H = dungeonHistory(this.save, `${B.base}:f1`); if (H.shellVault) return null;
    H.shellVault = shellVaultReward(B.base);
    if (H.shellVault === "tesseract") return this.awardTesseract(`${B.base}:vault`, "labyrinth");
    ensureSkylands(this.save); const n = TURTLE_SHELL.vault.viscera; this.save.skylands.viscera = (Number(this.save.skylands.viscera) || 0) + n;
    this.defeatNotice = { title: "DIVINE VISCERA", detail: `+${n} · from the heart of the shell · spend it in the Skylands' Divine Challenge`, kind: "discovery" };
    this.message = `${this.message ? this.message + " " : ""}In the heart of the shell: ${n} Divine Viscera.`; journalOnce(this.save, `shell-viscera:${B.base}`, `${n} Divine Viscera, from the heart of the Mountain Turtle's shell.`, TURTLE_SHELL.gate);
    return { viscera: n };
  }
  awardTesseract(source, grade, floor = 0) { const g = grantTesseract(this.save, source, grade, floor, this.map?.name || ""); if (!g) return null; const K = TESSERACTS.kinds[g.kind];
    this.message = `${this.message ? this.message + " " : ""}A Tesseract glyph: ${g.name}. Set it in Glyphs.`; this.defeatNotice = { title: "A TESSERACT GLYPH", detail: `${K.sigil} ${g.name}`, kind: "discovery" }; journalOnce(this.save, `tesseract:${source}`, `${g.name}, from ${g.from || "the deep"}.`, "Tesseract glyphs"); return g; }
  // Which Pentagon stands here: the version pinned by the first of its sections you saw (each section seen records the version
  // of its day; a Pentagon begun under release 727 stays the 727 one).
  // WG-03: is the Wayfarer at p standing on open court that runs on over this Pentagon's seam (dx, dy), into the same Pentagon?
  // Both sides of the seam under their footprint must be court (pentagon.ts pentagonSeamOpen); elsewhere only the lane crosses.
  pentagonSeam(p, dx, dy) {
    const P = this.map?.pentagon; if (!P || this.area !== "overworld") return false; const nrx = this.rx + dx, nry = this.ry + dy;
    if (this.domainCentreAt(nrx, nry)) return false;
    const [a, b] = dx ? [Math.floor(p.y + .5), Math.floor(p.y + .88 - 1e-6)] : [Math.floor(p.x + .24), Math.floor(p.x + .76 - 1e-6)];
    return pentagonSeamOpen(P.cx, P.cy, this.rx, this.ry, dx, dy, a, b, !!P.roof); // v7: and along its roof
  }
  // WG-05: on new ground (world coherence) a great building's door must join the section's exits, or the spot is passed over.
  coherentDoor() { return this._coherence ? Object.assign((map, at) => joinsCore(map, at), { tries: COHERENCE.doorTries }) : null; }
  pentagonVersion(cx, cy) { return recoverPentagonVersion(this.save, cx, cy); }
  pentagonHere(cx, cy) {
    const atlas = this.save.atlas || {}, seed = this.save.seed, gen = this.save.worldGeneration, memo = this.settleMemo();
    const settled = (rx, ry) => { const k = `${rx},${ry}`; if (!memo.has(k)) memo.set(k, regionSettled(rx, ry) || hamletSection(seed, rx, ry) || openSeaSection(seed, rx, ry)); return memo.get(k); };
    const cells = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cells.push({ rx: cx + dx, ry: cy + dy });
    const fresh = this.coherentGround(cells); // WG-04: on ground all new, a far domain's arena holds no Pentagon (one begun before stays whole)
    return pentagonAt(seed, cx, cy, (rx, ry) => { const a = atlas[`${rx},${ry}`]; return !settled(rx, ry) && !(a && !a.pentVersion) && !(fresh && this.domainCentreAt(rx, ry)); });
  }
  // A labyrinth's progress: chambers found (of all), keys held (of all).
  labyrinthProgress() { const B = this.map?.building; if (!B?.labyrinth) return ""; const H = dungeonHistory(this.save, `${B.base}:f1`); const seen = (H.labSeen ||= []); if (!seen.includes(B.node)) seen.push(B.node);
    const links = B.pentagon && H.pentLinks ? pentagonPlan(...(() => { const p = parsePentagonId(this.areaId()); return p ? [p.seed, p.cx, p.cy, p.V] : [this.save.seed, 0, 0, 1]; })()).links || [] : [], open = links.filter((l) => (H.labOpen || []).includes(pentagonLinkKey(l.id))).length;
    if (B.roomMaze) return `${seen.length} of ${B.of} floors found${B.keys?.length ? ` · keys ${(H.labKeys || []).length} of ${B.keys.length}` : ""}`; // a room maze: its floors (generator 2: its keys)
    return `${seen.length} of ${B.of} chambers found${B.keys?.length ? ` · keys ${(H.labKeys || []).length} of ${B.keys.length}` : ""}${links.length ? ` · shortcuts ${open} of ${links.length}` : ""}`; }
  // The Pentagon's shortcut links (pentagon.ts PENTAGON.shortcuts): shut from the near side ("barred from the other side");
  // the first use from the deep side opens it for good (history labOpen `link:<id>`) and carries you through; once open it
  // carries you either way. Arrival beside the other end.
  pentagonShortcut(o) {
    const S = PENTAGON.shortcuts, K = S.kinds[o.linkKind] || S.kinds.door, base = this.map.building.base, H = dungeonHistory(this.save, `${base}:f1`), key = pentagonLinkKey(o.link);
    const open = (H.labOpen || []).includes(key); if (!open && o.end !== "deep") { this.message = K.barred; return { ok: false, message: this.message }; }
    if (!open) { H.labOpen = [...new Set([...(H.labOpen || []), key])]; journalOnce(this.save, `pentagon-shortcut:${base}:${key}`, `${K.opens} (${o.name})`, PENTAGON.name); }
    this.goBuildingFloor(o.toId, o.x, o.y); const there = this.map.objects.find((q) => q.kind === "pentShortcut" && q.link === o.link), where = this.map.name.split(" · ")[1] || "the other side";
    if (there) { there.state = "open"; const at = buildingArrival(this.map, there.x, there.y); this.player.x = at.x; this.player.y = at.y; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); if (!open) this.shortcutBurst = { x: there.x, y: there.y, t0: null, life: S.burst }; }
    this.message = open ? `${K.ride} to ${where}.` : K.opens;
    this.defeatNotice = open ? { title: this.map.name.toUpperCase(), detail: this.labyrinthProgress(), kind: "danger" } : { title: S.notice, detail: `${where} · ${this.labyrinthProgress()}`, kind: "discovery", sound: "shortcut" };
    this.sync(); return { ok: true, message: this.message };
  }
  // The Pentagon's finale (pentagon.ts PENTAGON.finale). The Regent down, the vault's wall opens for good: recorded on the base
  // floor's history (`pentFinale`), shown once with a notice and a burst (the first time the vault loads with the Regent gone,
  // for a Pentagon finished before), and laid over the vault from then on (pentagonFinaleIn). Returns the opening, or null.
  openPentagonFinale() {
    const B = this.map?.building; if (!B?.pentagon || !B.vault) return null;
    const F = PENTAGON.finale, H = dungeonHistory(this.save, `${B.base}:f1`), was = !!H.pentFinale; let o = this.map.objects.find((q) => q.kind === "pentFinaleWall");
    if (!was && H.pentArena === undefined) H.pentArena = PENTAGON_ARENA.version; // from release 751 the opened wall leads to the Stillworks first (pentagon-arena.ts); a walkway opened before keeps its way
    this.payPentagonComplete(B.base); // a walkway Pentagon (its Regent fell before the Stillworks) is complete; paid once if not yet. After `pentArena`, so a Regent falling now is never taken for one fallen before release 750 (pentagon.ts pentagonFellEarly)
    if (was && o) return o;
    if (!o) o = pentagonFinaleIn(this.save, this.areaId(), this.map, true); if (!o) return null;
    H.pentFinale = F.version; journalOnce(this.save, `pentagon-finale:${B.base}`, F.messages.opens, PENTAGON.name);
    this.shortcutBurst = { x: o.x, y: o.y, t0: null, life: F.burst }; (this.questNotices ||= []).push({ title: F.notice, detail: F.detail, kind: "discovery" });
    this.message = `${this.message ? this.message + " " : ""}${F.messages.opens}`; return o;
  }
  // Through the opened wall onto the walkway, or back from it into the vault, beside the wall.
  pentagonFinaleWalk(o) {
    const F = PENTAGON.finale;
    if (isPentagonArenaId(o.toId)) return o.back ? this.pentagonArenaBack(o) : this.pentagonArenaEnter(o); // the way runs through the Stillworks (pentagon-arena.ts)
    if (o.back) { this.goBuildingFloor(o.toId, o.x, o.y); const w = this.map.objects.find((q) => q.kind === "pentFinaleWall");
      if (w) { this.player.x = w.inner.x; this.player.y = w.inner.y; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); }
      this.message = F.messages.back; this.sync(); return { ok: true, message: this.message }; }
    this.goBuildingFloor(o.toId, 1, 1); const e = this.map.entry; if (e) { this.player.x = e.x; this.player.y = e.y; }
    journalOnce(this.save, `pentagon-finale-walk:${this.map.building?.base}`, F.messages.walk, PENTAGON.name);
    this.message = F.messages.walk; this.defeatNotice = { title: F.names.floor.toUpperCase(), detail: "a walkway among the stars · a dais at its end", kind: "discovery" };
    this.sync(); return { ok: true, message: this.message };
  }
  // The Pentagon's finale arena, the Stillworks (pentagon-arena.ts). In through the vault's opened wall, at its back gate.
  pentagonArenaEnter(o) {
    const A = PENTAGON_ARENA; this.goBuildingFloor(o.toId, 1, 1); const back = this.map.objects.find((q) => q.kind === "pentArenaGate" && q.to === "vault");
    if (back) { this.player.x = back.inner.x; this.player.y = back.inner.y; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); }
    const H = dungeonHistory(this.save, `${this.map.building?.base}:f1`); journalOnce(this.save, `pentagon-arena:${this.map.building?.base}`, A.messages.enter, PENTAGON.name);
    const beast = this.enemies.find((e) => e.pentFinaleBeast && !e.dead);
    this.message = H.pentArenaWon || !beast ? A.messages.opens : A.messages.enter;
    this.defeatNotice = { title: A.notice, detail: beast ? `${beast.packName || "something"} waits at its heart` : "the seam stands open", kind: "danger" };
    this.sync(); return { ok: true, message: this.message };
  }
  // Back from the walkway into the Stillworks, by its seam.
  pentagonArenaBack(o) {
    this.goBuildingFloor(o.toId, 1, 1); const on = this.map.objects.find((q) => q.kind === "pentArenaGate" && q.to === "walk");
    if (on) { this.player.x = on.inner.x; this.player.y = on.inner.y; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); }
    this.message = PENTAGON_ARENA.messages.walkBack; this.sync(); return { ok: true, message: this.message };
  }
  // Its two gates: back to the vault (always open), and the seam on to the walkway (sealed until the beast falls).
  pentagonArenaGate(o) {
    const A = PENTAGON_ARENA, base = this.map.building?.base, H = dungeonHistory(this.save, `${base}:f1`);
    if (o.to === "vault") { this.goBuildingFloor(o.toId, 1, 1); const w = this.map.objects.find((q) => q.kind === "pentFinaleWall");
      if (w) { this.player.x = w.inner.x; this.player.y = w.inner.y; relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); }
      this.message = A.messages.back; this.sync(); return { ok: true, message: this.message }; }
    if (!H.pentArenaWon) { this.message = A.messages.sealed; return { ok: false, message: this.message }; }
    return this.pentagonFinaleWalk({ toId: o.toId }); // on to the walkway among the stars, as before
  }
  // The seam's state follows the history (a snapshot taken before the beast fell must not shut it again); a fallen beast stays down.
  pentagonArenaSync() {
    const H = dungeonHistory(this.save, `${this.map.building?.base}:f1`), A = PENTAGON_ARENA;
    for (const o of this.map.objects) if (o.kind === "pentArenaGate" && o.to === "walk") Object.assign(o, H.pentArenaWon ? { state: "open", name: A.names.onOpen, lore: A.messages.opens } : { state: "sealed", name: A.names.on, lore: A.messages.sealed });
    if (H.pentArenaWon) for (const e of this.enemies) if (e.pentFinaleBeast && !e.dead) { e.dead = true; e.noRewards = true; e.rewarded = true; } // it pays once
  }
  // Each frame in the Stillworks: the beast sleeps at the heart until the Wayfarer comes near (PENTAGON_ARENA.wake) or strikes it.
  tickPentagonArena() {
    const p = this.player, A = PENTAGON_ARENA;
    for (const e of this.enemies) { if (e.dead || !e.pentFinaleBeast) continue;
      if (!e.pentArenaAwake && (e.hp < e.maxHp || Math.hypot(e.x - p.x, e.y - p.y) <= A.wake)) { e.pentArenaAwake = true; e.aggro = true; this.message = A.messages.wake; (this.questNotices ||= []).push({ title: String(e.packName || "the finale").toUpperCase(), detail: "the Pentagon's finale", kind: "danger" }); }
      else if (!e.pentArenaAwake) e.aggro = false; }
  }
  // A death in the Stillworks (resolveDeath, before the area is kept): the beast is whole again, asleep at the heart, its summons gone,
  // as a boss is after a death; nothing it did to the floor lasts (its pools and fires are runtime only).
  resetPentagonArena() {
    const spawn = (this.map.enemySpawns || []).find((q) => q.pentFinaleBeast), ids = new Set();
    for (const e of this.enemies) if (e.pentFinaleBeast && !e.dead) { ids.add(e.id);
      e.hp = e.maxHp; resetPackRuntime(e); e.aggro = false; e.pentArenaAwake = false; e.hitStun = 0; e.recoil = 0; e.hitFlash = 0; e.voidTeleport = 0; e.untargetable = false;
      if (e.glyphBaseSpeed !== undefined) e.speedMultiplier = e.glyphBaseSpeed; delete e.glyphBaseSpeed; delete e.glyphBurn; delete e.glyphSlow; delete e.astral;
      if (spawn) { e.x = spawn.x; e.y = spawn.y; } }
    for (const e of this.enemies) if (!e.dead && (ids.has(e.summonedBy) || ids.has(e.astralOwner) || ids.has(e.kitAddOf))) { e.dead = true; e.noRewards = true; e.rewarded = true; }
  }
  // The finale beast falls: once, the seam opens and the bounty is paid (its usual drops follow in defeatEnemy).
  pentagonArenaWon(e) {
    const A = PENTAGON_ARENA, base = this.map.building?.base, H = dungeonHistory(this.save, `${base}:f1`); if (H.pentArenaWon) return false;
    H.pentArenaWon = true; const marks = A.bounty.marks + A.bounty.perLevel * (Number(this.save.level) || 1); this.save.currency = (Number(this.save.currency) || 0) + marks;
    this.pentagonArenaSync(); const on = this.map.objects.find((q) => q.kind === "pentArenaGate" && q.to === "walk");
    if (on) this.shortcutBurst = { x: on.x, y: on.y, t0: null, life: PENTAGON.finale.burst };
    const name = e.packName || "The finale beast";
    journalOnce(this.save, `pentagon-arena-won:${base}`, `${name} fell in the Stillworks. ${A.messages.opens}`, PENTAGON.name);
    (this.questNotices ||= []).push({ title: A.openNotice, detail: "beyond it, a walkway among the stars", kind: "discovery" });
    this.defeatNotice = { title: A.wonNotice, detail: `${name} · +${marks} marks`, kind: "danger" }; this.message = A.messages.opens;
    this.payPentagonComplete(base); return true; // the Pentagon is complete: its Tesseract (pentagon.ts PENTAGON_COMPLETE)
  }
  // The completion's Tesseract (pentagon.ts PENTAGON_COMPLETE), once a Pentagon: with the journal line, the message and a notice.
  payPentagonComplete(base) {
    const g = payPentagonCompletion(this.save, base); if (!g) return null; const C = PENTAGON_COMPLETE, K = TESSERACTS.kinds[g.kind];
    journalOnce(this.save, `pentagon-complete:${base}`, `${C.journal} ${g.name}.`, PENTAGON.name); journalOnce(this.save, `tesseract:${base}:complete`, `${g.name}, from ${g.from}.`, "Tesseract glyphs");
    this.message = `${this.message ? this.message + " " : ""}A Tesseract glyph for the Pentagon's completion: ${g.name}. Set it in Glyphs.`;
    (this.questNotices ||= []).push({ title: C.notice, detail: `${K?.sigil || ""} ${g.name}`.trim(), kind: "discovery" }); return g;
  }
  // The dais (PENTAGON.finale.reroll): per Pentagon, one free reroll of a line on a Tesseract glyph you carry, then one more for
  // Divine Viscera; then only Transit. Act opens its choices while a reroll is left (a pick list: a glyph, then its line);
  // otherwise Act is Transit. The count is kept on the base floor's history (`pentRerolls`). Each reroll is a hash of the seed,
  // the Pentagon, the reroll's index, the glyph and the line (tesseracts.ts rerollTesseractLine): reloading never changes it.
  daisRerolls() { const P = parsePentagonFinaleId(this.areaId()), R = PENTAGON.finale.reroll; if (!P) return { P: null, used: 0, left: 0 }; const H = dungeonHistory(this.save, `${P.base}:f1`), used = Math.max(0, Math.floor(Number(H.pentRerolls) || 0)); return { P, H, used, left: Math.max(0, R.free + R.paid - used), paid: used >= R.free }; }
  daisGlyphs() { ensureTesseracts(this.save); const T = this.save.tesseracts, set = T.slots.filter(Boolean); return [...T.owned].sort((a, b) => (set.includes(b.uid) ? 1 : 0) - (set.includes(a.uid) ? 1 : 0) || Number(b.uid.slice(1)) - Number(a.uid.slice(1))).slice(0, PENTAGON.finale.reroll.list); }
  refreshDais(o = this.map?.objects?.find((q) => q.kind === "pentDais")) {
    if (!o) return null; const F = PENTAGON.finale, R = F.reroll, r = this.daisRerolls(), glyphs = r.left ? this.daisGlyphs() : [], cost = r.paid ? ` (${R.viscera} Divine Viscera)` : " (free)", labels = { transit: "Transit" };
    let actions = ["transit"]; const g = o.pick && glyphs.find((q) => q.uid === o.pick); if (!g) o.pick = null;
    if (g) { actions = [...g.lines.map((l, i) => { const a = `reroll:${g.uid}:${i}`; labels[a] = `Cut again: ${tesseractLine(l)}${cost}`; return a; }), "pick:", "transit"]; labels["pick:"] = "Choose another glyph"; }
    else for (const q of glyphs) { const a = `pick:${q.uid}`; labels[a] = `Reroll a line of ${q.name}${cost}`; actions.push(a); }
    o.actions = actions; o.actionLabels = labels;
    o.lore = `${F.messages.dais} ${r.left ? `${r.left} reroll${r.left > 1 ? "s" : ""} of a Tesseract glyph's line left here: ${r.paid ? `this one for ${R.viscera} Divine Viscera` : `the first free, the next for ${R.viscera} Divine Viscera`}.` : F.messages.rerollsDone}`;
    return o;
  }
  pentagonDais(o, action) {
    const F = PENTAGON.finale, R = F.reroll, r = this.daisRerolls(), done = (message, ok = true) => { this.refreshDais(o); this.message = message; this.sync(); return { ok, message }; };
    if (!action || action === "transit") { if (!action && r.left && this.daisGlyphs().length) { this.refreshDais(o); this.interactionRequested = o.id; return { ok: true, message: (this.message = F.messages.reroll) }; } return this.pentagonTransit(o); }
    if (action.startsWith("pick:")) { o.pick = action.slice(5) || null; return done(o.pick ? F.messages.reroll : F.messages.reroll); }
    const m = /^reroll:(t\d+):(\d+)$/.exec(action); if (!m) return done("That action is not available.", false);
    if (!r.left) return done(F.messages.rerollsDone, false);
    ensureTesseracts(this.save); const g = this.save.tesseracts.owned.find((q) => q.uid === m[1]), i = Number(m[2]); if (!g?.lines?.[i]) return done(F.messages.noTesseract, false);
    if (r.paid) { ensureSkylands(this.save); const have = Number(this.save.skylands.viscera) || 0; if (have < R.viscera) return done(`${F.messages.needViscera}: ${R.viscera} (you have ${have}).`, false); this.save.skylands.viscera = have - R.viscera; }
    const line = rerollTesseractLine(this.save.seed, `${r.P.base}:reroll${r.used}:${g.uid}:${i}`, g, i); if (!line) return done(F.messages.rerollsDone, false);
    const before = tesseractLine(g.lines[i]); g.lines[i] = line; r.H.pentRerolls = r.used + 1; o.pick = null;
    journalOnce(this.save, `pentagon-dais-reroll:${r.P.base}:${r.used}`, `${F.messages.rerolled} (${g.name}): ${before} became ${tesseractLine(line)}.`, PENTAGON.name);
    this.defeatNotice = { title: "THE DAIS CUTS AGAIN", detail: `${g.name} · ${tesseractLine(line)}`, kind: "discovery" };
    return done(`${F.messages.rerolled}: ${before} becomes ${tesseractLine(line)}.${r.paid ? ` (${R.viscera} Divine Viscera spent.)` : ""}`);
  }
  // The dais: Transit, to the Pentagon's front door (its first gate, outside) and nowhere else.
  pentagonTransit(o) {
    const F = PENTAGON.finale, P = parsePentagonFinaleId(this.areaId()); if (!P) { this.message = "The dais is still."; return { ok: false, message: this.message }; }
    const door = pentagonFrontDoor(pentagonPlan(P.seed, P.cx, P.cy, P.V)), h = dungeonHistory(this.save, this.areaId()); h.visitOpen = false; // a walk, not a crossing left unexplored
    this.save.session.dungeonReturn = { ...door };
    if (!this.leaveDungeon(F.messages.arrive)) return { ok: false, message: this.message };
    relocateIfStranded(this.player, this.map, mapWidth(this.map, "overworld"));
    journalOnce(this.save, `pentagon-finale-transit:${P.base}`, F.messages.arrive, PENTAGON.name);
    this.shortcutBurst = { x: this.player.x, y: this.player.y, t0: null, life: F.burst }; this.defeatNotice = { title: "TRANSIT", detail: "the Pentagon's front door", kind: "discovery", sound: "shortcut" };
    this.sync(); return { ok: true, message: this.message };
  }
  // TOWER_SEAL: the lever at the top of a sealed tower's climb. Reached only from the top ledge or the tower's top (never from the
  // court below it). Pulling it records the tower's key (as taking the key does), so every way in opens for good.
  leverOver(o) { o.state = "pulled"; for (const r of this.map.objects) if (r.kind === "greatBuilding" && r.lever && r.lever.x === o.x && r.lever.y === o.y) r.lever.state = "pulled"; } // the lever object and its drawing on the tower's top
  pullTowerLever(o) {
    const S = o.towerSeal; if (towerUnsealed(this.save, S)) { this.leverOver(o); this.message = towerSealText(TOWER_SEAL.messages.pulled, S); return { ok: true, message: this.message }; }
    if (this.playerLevel() < (o.elev || 0) - 1) { this.message = towerSealText(TOWER_SEAL.messages.reach, S); return { ok: false, message: this.message }; }
    const H = dungeonHistory(this.save, `${S.base}:f1`); H.labKeys = [...new Set([...(H.labKeys || []), S.key])]; this.leverOver(o);
    this.message = towerSealText(TOWER_SEAL.messages.lever, S); this.defeatNotice = { title: "THE TOWER UNSEALS", detail: S.tower, kind: "discovery", sound: "shortcut" };
    journalOnce(this.save, `tower-lever:${S.base}`, this.message, S.tower); this.sync(); return { ok: true, message: this.message };
  }
  takeLabKey(o) { if (o.keyBase) return this.takeTowerKey(o); const H = dungeonHistory(this.save, `${this.map.building.base}:f1`); H.labKeys = [...new Set([...(H.labKeys || []), o.keyId])]; this.map.objects = this.map.objects.filter((q) => q !== o);
    for (const q of this.map.objects) if (q.lock === o.keyId) q.unlocked = true;
    this.message = `You take the ${o.name}. Somewhere along the way, a sealed door will open for it. (${this.labyrinthProgress()})`; this.sync(); return { ok: true, message: this.message }; }
  // TOWER_SEAL: the tower's key, taken in the maze. Kept on the tower's first floor's history, never lost and never paid twice.
  takeTowerKey(o) { const S = o.towerSeal || { key: o.keyId, name: o.name, base: o.keyBase }, H = dungeonHistory(this.save, `${o.keyBase}:f1`); H.labKeys = [...new Set([...(H.labKeys || []), o.keyId])]; this.map.objects = this.map.objects.filter((q) => q !== o);
    this.message = towerSealText(TOWER_SEAL.messages.key, S); this.defeatNotice = { title: o.name.toUpperCase(), detail: `the ${S.tower || "tower"} will open for it`, kind: "discovery" }; journalOnce(this.save, `tower-key:${o.keyBase}`, this.message, S.tower || "The tower"); this.sync(); return { ok: true, message: this.message }; }
  // ROOM_MAZES: a barred door. From the far side the bolt draws and it stays open for good (`labOpen`, the gate's key, on the
  // first floor's history); from the near side it will not give.
  roomMazeGate(o) {
    const H = dungeonHistory(this.save, `${this.map.building.base}:f1`), open = (H.labOpen || []).includes(o.gateKey);
    if (open) { this.message = ROOM_MAZES.messages.open; return { ok: true, message: this.message }; }
    if (roomGateSide(o, this.player.x) !== "far") { this.message = ROOM_MAZES.messages.barred; return { ok: false, message: this.message }; }
    H.labOpen = [...new Set([...(H.labOpen || []), o.gateKey])]; openRoomGate(this.map, o); this.message = ROOM_MAZES.messages.opens;
    this.defeatNotice = { title: "SHORTCUT", detail: `${this.map.name.split(" · ")[1] || "the door"} · ${this.labyrinthProgress()}`, kind: "discovery", sound: "shortcut" }; this.sync(); return { ok: true, message: this.message };
  }
  takeBuildingStair(o) {
    if (o.dir === "roofExit") return this.takeRoofExit(o); // release 746
    if (o.dir === "roof") { // up through the hatch, onto the roof: high ground on the section itself
      const D = dungeonHistory(this.save, `${this.map.building.base}:f1`).buildingDoors; if (!D?.hatch) { this.message = "The hatch is rubbled shut."; return { ok: false, message: this.message }; }
      this.save.session.dungeonReturn = { rx: D.rx, ry: D.ry, x: D.hatch.x, y: D.hatch.y }; this.leaveDungeon(BUILDINGS.messages.roof); this.sync(); return { ok: true, message: this.message };
    }
    if (o.labyrinth) { const H = dungeonHistory(this.save, `${this.map.building.base}:f1`);
      if (o.lock && !(H.labKeys || []).includes(o.lock)) { this.message = `Sealed. It wants the ${o.lockName}.`; return { ok: false, message: this.message }; }
      if (o.barred && !(H.labOpen || []).includes(o.shortcutKey)) { this.message = "Barred from the other side."; return { ok: false, message: this.message }; }
      if (o.sigil) { const r = this.pentagonSigilDoor(o, this.map.building.base); if (r) return r; } // the Pentagon's sigil doors
      if (o.bossGate && !(H.pentBosses || []).includes(this.map.building.node)) { const k = this.enemies.find((e) => e.pentBoss && !e.dead); this.message = `${PENTAGON.messages.bossGate}${k ? `: ${k.packName}` : ""}.`; return { ok: false, message: this.message }; }
      if (o.plateLock && !(H.labOpen || []).includes(`plate:${this.map.building.node}`)) { if (!this.map.tiles.some((t) => t.plate && t.build === "stone")) { this.message = PENTAGON.messages.plate; return { ok: false, message: this.message }; } H.labOpen = [...new Set([...(H.labOpen || []), `plate:${this.map.building.node}`])]; } // the Pentagon's pressure plate: a block on it holds the door, and once through it stays wedged open
      if (o.shortcutOpens) { H.labOpen = [...new Set([...(H.labOpen || []), o.shortcutOpens])]; } // opened from the far side: open from the hall now too
      this.goBuildingFloor(o.toId, o.toX, o.toY); const B = this.map.building, where = this.map.name.split(" · ")[1] || "the next chamber";
      this.defeatNotice = { title: this.map.name.toUpperCase(), detail: `${B.roomMaze ? B.hint : B.vault ? LABYRINTHS.messages.vault : B.kind === "gaps" ? HOLE_DROPS.messages.gallery : B.kind === "court" ? "out under the sky, still inside" : "find the way on"} · ${this.labyrinthProgress()}`, kind: "danger" };
      this.message = `${o.dir === "door" ? LABYRINTHS.messages.door : o.dir === "up" ? BUILDINGS.messages.climb : BUILDINGS.messages.descend} ${where}.`; this.sync(); return { ok: true, message: this.message }; }
    this.goBuildingFloor(o.toId, o.toX, o.toY); const B = this.map.building, top = B.floor >= B.floors;
    this.defeatNotice = { title: this.map.name.toUpperCase(), detail: top ? BUILDINGS.messages.top : `floor ${B.floor} of ${B.floors}`, kind: "danger" };
    this.message = `${o.dir === "up" ? BUILDINGS.messages.climb : BUILDINGS.messages.descend} ${this.map.name.split(" · ")[1] || `floor ${B.floor}`}.`; this.sync(); return { ok: true, message: this.message };
  }
  // Release 746: the vault's roof exit. Open once the vault's guardian has fallen (or where none stands), for good: kept on the
  // vault floor's history (`roofExit`). It lets you out onto the building's roof on its own section (`roofLanding`), or, where
  // the building has no roof to stand on, by its front door.
  roofExitGuarded() { return (this.enemies || []).some((e) => String(e.id).endsWith(":guardian") && !e.dead && e.hp > 0); }
  openRoofExit(tell = false) {
    const h = dungeonHistory(this.save, this.areaId()), o = this.map?.objects?.find((q) => q.dir === "roofExit"); if (!o) return false;
    const was = !!h.roofExit; h.roofExit = true; o.sealed = false; if (tell && !was) this.message = `${this.message ? this.message + " " : ""}${ROOF_EXIT.messages.opens}`; return true;
  }
  takeRoofExit(o) {
    const h = dungeonHistory(this.save, this.areaId());
    if (!h.roofExit && this.roofExitGuarded()) { this.message = ROOF_EXIT.messages.sealed; return { ok: false, message: this.message }; }
    this.openRoofExit(false);
    const R = o.roofExit, B = this.map.building, D = dungeonHistory(this.save, `${B.base}:f1`).buildingDoors;
    const door = D && D.rx === R.rx && D.ry === R.ry && D.front ? D.front : null;
    this.save.session.dungeonReturn = { rx: R.rx, ry: R.ry, x: door ? door.x : 16, y: door ? door.y : 16 };
    if (!this.leaveDungeon(ROOF_EXIT.messages.door)) return { ok: false, message: this.message };
    const land = R.roof ? roofLanding(this.map, R.part) : null;
    if (land) { this.player.x = land.x; this.player.y = land.y; this.message = ROOF_EXIT.messages.roof; }
    else if (!door) { const d = this.map.objects.find((q) => q.kind === "dungeon" && q.buildingDoor && !q.roofHatch && !q.breachDoor && String(q.dungeonId || "").startsWith(`${B.base}:`)); if (d) { this.player.x = d.x; this.player.y = d.y; } }
    this.sync(); return { ok: true, message: this.message };
  }
  // Standing in a hole (not mid-jump) drops you to the floor below, onto the same spot, hurt.
  buildingFall() {
    const B = this.map.building, w = this.map.width, px = Math.floor(this.player.x + .5), py = Math.floor(this.player.y + .5), t = this.map.tiles[py * w + px];
    if (!t?.hole || (B.floor <= 1 && !B.fallTo)) return false;
    if (this.player.hp <= 0 || this.save.session.holeDeath || this.mechBoosting === true || (this.save.magicSkills?.active?.id === "aerial-step" && this.save.magicSkills.active.remaining > 0)) return false; // carried over it (the robot's boost, Aerial Step), as over any drop
    if (B.labyrinth) { const fx = this.player.x + .5 - px, fy = this.player.y + .5 - py, E = LABYRINTHS.edge, lip = (dx, dy) => { const n = this.map.tiles[(py + dy) * w + px + dx]; return n && !n.blocked && !n.hole; }; if ((fx < E && lip(-1, 0)) || (fx > 1 - E && lip(1, 0)) || (fy < E && lip(0, -1)) || (fy > 1 - E && lip(0, 1))) return false; } // a gallery's lip: a running jump has room
    if (!safeDropAt(this.map, px, py)) return this.holeDeath(); // HOLE_DROPS: most holes are a death; only a floor's few safe drops (a green rim, close up) fall through
    const below = B.fallTo ? B.fallTo.id : this.areaId().replace(/:f\d+$/, `:f${B.floor - 1}`), hurt = Math.max(1, Math.round(this.save.maxHp * BUILDINGS.fall)), to = B.fallTo ? { x: B.fallTo.x, y: B.fallTo.y } : { x: px, y: py }; // a labyrinth's gallery drops you into a cellar somewhere else
    this.goBuildingFloor(below, to.x, to.y); { const t2 = this.map.tiles[to.y * this.map.width + to.x]; if (t2 && !t2.hole && !t2.blocked) { this.player.x = to.x; this.player.y = to.y; } } relocateIfStranded(this.player, this.map, mapWidth(this.map, "dungeon")); // release 735: landing on a hole below, you land beside it (goBuildingFloor's step-off) rather than dropping straight through a second floor
    this.player.hp = Math.max(1, this.player.hp - hurt);
    this.message = B.fallTo ? `${LABYRINTHS.messages.fall} ${this.map.name.split(" · ")[1] || "the dark"} (−${hurt}).` : `${BUILDINGS.messages.fall} ${this.map.name.split(" · ")[1] || `floor ${B.floor - 1}`} (−${hurt}).`; this.sync(); return true;
  }
  // LAB_FOG (labyrinths.ts): in a labyrinth chamber, the sight round the Wayfarer, worked out again only on a new tile, and what
  // has been seen stored on the chamber's history once it grows (so it lasts through a save, a reload and an exact resume).
  labFogTick() {
    if (!labFogOn(this.map)) return; const h = dungeonHistory(this.save, this.areaId()), t = labFogTile(this.player);
    labFogLook(this.map, t.x, t.y, h.labFog); labFogStore(this.map, h);
  }
  // HOLE_DROPS (labyrinths.ts): where the Wayfarer came onto this building floor (`save.session.floorEntry`), noted on the first
  // frame on a floor, however they came: a door, a ladder, a hatch, a safe drop or a reload.
  noteFloorEntry() {
    const se = this.save.session, id = this.areaId(); if (se.floorEntry?.id === id) return;
    const p = this.player, w = this.map.width, x = Math.round(p.x), y = Math.round(p.y), t = this.map.tiles[y * w + x], e = this.map.entry || { x: w >> 1, y: (this.map.height || 2) >> 1 };
    se.floorEntry = t && !t.blocked && !t.hole ? { id, x, y } : { id, x: e.x, y: e.y };
  }
  // A step into a hole that is not a safe drop: a death (ordinary bookkeeping in resolveDeath), waking on this same floor where
  // the Wayfarer came onto it. `save.session.holeDeath` holds the place until the death resolves (it survives a reload).
  holeDeath() {
    this.noteFloorEntry(); const e = this.save.session.floorEntry;
    this.save.session.holeDeath = { id: e.id, x: e.x, y: e.y };
    this.player.hp = 0; this._fatalFallPending = true; this.message = HOLE_DROPS.messages.death; return true;
  }
  // Labyrinth chambers (LAB_BURROW): has this chamber's warden fallen? The Fracture Warden's seal, or (Fractured mode off) no
  // living guard of the chamber's own. Kept on the chamber's history once true.
  labQuelled() {
    const id = this.areaId(); if (this.area !== "dungeon" || !isLabyrinthId(id) || !this.map?.building?.labyrinth) return false;
    const h = dungeonHistory(this.save, id); if (h.labQuelled) return true;
    const sealed = fractureSealed(this.save, fractureKey("dungeon", this.areaStateId())), guards = !fracturedMode(this.save) && !this.enemies.some((e) => e.buildingGuard && !e.dead && !e.rewarded);
    if (sealed || guards) h.labQuelled = true; return !!h.labQuelled;
  }
  labQuellOnKill(e) {
    const id = this.areaId(); if (!isLabyrinthId(id) || !this.map?.building?.labyrinth || dungeonHistory(this.save, id).labQuelled) return;
    if (!(e.fracWarden || (e.buildingGuard && !fracturedMode(this.save)))) return;
    if (!e.fracWarden && this.enemies.some((q) => q !== e && q.buildingGuard && !q.dead && !q.rewarded)) return;
    dungeonHistory(this.save, id).labQuelled = true; return !!this.map.wallGlints?.length; // told at the end of defeatEnemy, after its other lines
  }
  descendAnnex(o) {
    const prev = dungeonHistory(this.save, this.areaId()); prev.visitOpen = false; this.snapshotArea();
    this.save.session.activeDungeonId = o.toId; this.save.session.activeDungeonLevelId = null; pinDungeonLayout(this.save, o.toId);
    const h = dungeonHistory(this.save, o.toId); h.visits++; h.visitOpen = true;
    this.loadArea("dungeon", false); this.settleArrival(); this.projectiles = [];
    this.defeatNotice = { title: `${DEEP_ANNEX.messages.enter} · FLOOR ${o.floor}`, detail: o.floor >= DEEP_ANNEX.floors ? "the last floor · another country · its far door lets you out somewhere else" : "fell its guardian to open the stair down", kind: "danger" };
    this.message = `You go down the Annex Stair to floor ${o.floor} of ${DEEP_ANNEX.floors}.`; this.sync(); return { ok: true, message: this.message };
  }
  // The last floor's Cleared Return: set the way out to a random place in the world. True when it did.
  annexOutward() {
    const A = dungeonHistory(this.save, this.areaId()).deepAnnex; if (!A || A.floor < DEEP_ANNEX.floors) return false;
    this.save.session.dungeonReturn = annexExit(this.save.seed, A.base, this.save.session.dungeonReturn, this.save.explored, (x, y) => openSeaSection(this.save.seed, x, y));
    journalOnce(this.save, `deep-annex:${A.base}`, `You went three floors down a Starfield Deep Annex, and its far door let you out at ${this.save.session.dungeonReturn.rx}, ${this.save.session.dungeonReturn.ry}.`, "Crossings");
    return true;
  }
  // The Rite of Ascendancy (ascendancy.ts). The Sapling Dais where it is still to be done; the withered sapling when its tries
  // are spent; the great tree, with its bloom, where it is done.
  placeSapling() {
    if (this.map.objects.some((o) => o.kind === "saplingDais")) return null;
    const w = mapWidth(this.map, "overworld"), rec = this.save.ascendancy?.[riteKey(this.rx, this.ry)], id = `sapling-dais-${this.rx}-${this.ry}`; let at = null;
    for (let r = 3; r <= 10 && !at; r++) for (let k = 0; k < 16 && !at; k++) { const a = k / 16 * Math.PI * 2 + .5, x = Math.round(16 + Math.cos(a) * r), y = Math.round(16 + Math.sin(a) * r), t = this.map.tiles[y * w + x];
      if (t && !t.blocked && !t.structure && !t.environment && !t.buildingId && !t.canopy && !(t.elev > 0) && !t.landscape?.startsWith?.("sea") && footprintOpen(this.map, w, x, y) && !this.map.objects.some((o) => Math.hypot(o.x - x, o.y - y) < 2)) at = { x, y }; }
    if (!at) return null;
    if (rec?.done && rec.risen) return this.raiseRiteTree(at);
    if (rec?.done) { const a = { id: `rite-ashes-${this.rx}-${this.ry}`, kind: "riteAshes", name: "Ashes of the Rite", ...at, state: "warm", actions: ["touch"], landmark: true, lore: ASCENDANCY.messages.ashes }; this.map.objects.push(a); return a; }
    if (!rec && !riteTreeFits(this.map, this.save.seed, this.rx, this.ry)) return null; // only where its tree would have room
    const o = triesLeft(rec) <= 0 ? { id, kind: "ruinMarker", name: "Dead Strange Tree", lore: ASCENDANCY.messages.withered, ...at, state: "quiet", actions: ["inspect"] }
      : { id, kind: "saplingDais", name: ASCENDANCY.name, ...at, scale: 1.5, state: this.rite?.key === riteKey(this.rx, this.ry) ? "burning" : "open", actions: ["begin"], landmark: true, lore: ASCENDANCY.messages.dais };
    this.map.objects.push(o); if (o.kind === "saplingDais" && !this.message) this.message = ASCENDANCY.messages.dais; return o;
  }
  beginRite(o) {
    const key = riteKey(this.rx, this.ry), rec = riteRecord(this.save, this.rx, this.ry);
    if (this.rite) return { ok: false, message: (this.message = "The rite is already burning.") };
    if (rec.done || triesLeft(rec) <= 0) return { ok: false, message: (this.message = ASCENDANCY.messages.withered) };
    const now = this.lastUpdateNow || 0; rec.tries++; o.state = "burning";
    this.rite = { key, at: { x: o.x, y: o.y }, started: now, until: now + ASCENDANCY.duration * 1000, nextAt: now + ASCENDANCY.grace * 1000, n: 0 };
    this.defeatNotice = { title: "THE RITE OF ASCENDANCY", detail: `survive ${Math.round(ASCENDANCY.duration / 60)} minutes · attempt ${rec.tries} of ${ASCENDANCY.tries}`, kind: "danger" };
    this.message = ASCENDANCY.messages.begin; this.sync(); return { ok: true, message: this.message };
  }
  // One frame of the rite: waves come in from just off the screen, closer together as it goes on; at the end, the tree.
  riteTick(dt, now) {
    const R = this.rite, A = ASCENDANCY, W = A.waves; if (!R) return null;
    if (this.area !== "overworld" || riteKey(this.rx, this.ry) !== R.key) return this.riteFailed();
    if (now >= R.until) return this.riteDone();
    const f = (now - R.started) / (ASCENDANCY.duration * 1000), dais = this.map.objects.find((o) => o.kind === "saplingDais"); if (dais) dais.burn = Math.min(1, f); // the strange tree burns down as the rite goes on
    if (now < R.nextAt) return;
    const alive = this.enemies.filter((e) => e.riteFoe && !e.dead).length, p = this.player, w = mapWidth(this.map, "overworld");
    R.n++; R.nextAt = now + waveGap((now - R.started) / 1000) * 1000;
    if (alive >= W.cap) return;
    const kinds = [...new Set(this.enemies.filter((e) => !e.dead && !e.ambient && !e.passiveBehavior && !e.worldBeast && !e.questingBeast && !e.stalker && e.kind !== "npc" && (e.fractured || fracturedOrdinary(e) || e.riteFoe)).map((e) => e.kind))];
    const h = hashSeed(`${this.save.seed}:rite-wave:${R.key}:${R.n}`), packs = W.packs[0] + h % (W.packs[1] - W.packs[0] + 1) + Math.round(W.packsUp * f); let left = W.cap - alive;
    const ramp = riteRamp(f), stats = characterStats(this.save), guard = Math.max(0, Math.min(.75, Number(stats.damageReduction) || 0)), perHit = liveBeastReference(this.save, stats).perHit;
    for (let k = 0; k < packs && left >= 2; k++) {
      const hk = hashSeed(`${this.save.seed}:rite-wave:${R.key}:${R.n}:p${k}`), base = (h >>> 4) % 628 / 100 + k * 6.283 / packs; let at = null;
      for (let i = 0; i < 24 && !at; i++) { const a = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .3, r = W.distance[0] + ((hk >>> 12) + i * 7) % (W.distance[1] - W.distance[0] + 1), x = Math.round(p.x + Math.cos(a) * r), y = Math.round(p.y + Math.sin(a) * r); if (x > 1 && y > 1 && x < w - 2 && y < w - 2 && this.fracturedOpen(x, y, w)) at = { x, y }; }
      if (!at) continue;
      const roll = ((hk >>> 9) % 1000) / 1000, rank = roll < W.rare ? "rare" : roll < W.champion ? "champion" : null, size = Math.min(left, W.pack[0] + hk % (W.pack[1] - W.pack[0] + 1) + Math.round(W.sizeUp * f));
      for (const q of packSpawns(`${this.save.seed}:rite-wave:${R.key}:${R.n}:p${k}`, kinds.length ? kinds : A.fallback, at.x, at.y, size, rank, (x, y) => this.fracturedOpen(x, y, w), `rite-${R.n}-${k}`, { riteFoe: true }).slice(0, left)) {
        const c = this.createEnemyFromSpawn(q, "overworld"); c.aggro = true; c.riteFoe = true;
        if (ramp) { const hp = Math.round(perHit * ramp.hits * (A.ramp.rankHits[c.fracRank || q.fracRank] || 1)); c.maxHp = c.hp = Math.max(c.maxHp || 1, hp); c.damage = Math.max(Math.round((c.damage || 1) * (1 + A.ramp.nativeUp * ramp.k)), Math.round((Number(this.save.maxHp) || 60) * ramp.share / (1 - guard))); c.baseDamage = c.damage; } // the rite's ramp (ASCENDANCY.ramp)
        this.enemies.push(c); left--; }
    }
    const t = Math.ceil((R.until - now) / 1000); this.message = `The rite's creatures come. ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} left.`;
  }
  riteEnd() { const R = this.rite; this.rite = null; this.enemies = this.enemies.filter((e) => !e.riteFoe || e.dead); for (const o of this.map?.objects || []) if (o.kind === "saplingDais") { o.state = "open"; delete o.burn; } return R; }
  riteFailed() {
    const R = this.riteEnd(); if (!R) return null; const [rx, ry] = R.key.split(",").map(Number), left = triesLeft(riteRecord(this.save, rx, ry));
    this.defeatNotice = { title: "THE RITE IS BROKEN", detail: left > 0 ? `${left} attempt${left === 1 ? "" : "s"} left at this tree` : "the strange tree dies", kind: "danger" };
    this.message = ASCENDANCY.messages.failed(left); journalOnce(this.save, `rite-failed:${R.key}:${3 - left}`, ASCENDANCY.messages.failed(left), "The Rite of Ascendancy"); return R;
  }
  riteDone() {
    const R = this.riteEnd(); if (!R) return null; const rec = riteRecord(this.save, this.rx, this.ry); rec.done = true;
    this.map.objects = this.map.objects.filter((o) => o.kind !== "saplingDais"); this.placeSapling(); // the ashes, where the strange tree stood
    this.defeatNotice = { title: "ASCENDANCY", detail: "the strange tree has burned to ashes · touch them", kind: "discovery" };
    journalOnce(this.save, `rite-done:${R.key}`, `You survived the Rite of Ascendancy at ${R.key}. The strange tree burned to ashes.`, "The Rite of Ascendancy");
    this.message = ASCENDANCY.messages.done; this.sync(); return R;
  }
  // The tree the rite raised (the same each time), its door to the sky kept only by a share of rites, and the bloom on its crown.
  raiseRiteTree(at) {
    const tree = growRiteTree(this.map, this.save.seed, this.rx, this.ry), rec = riteRecord(this.save, this.rx, this.ry);
    if (tree && !riteSkyway(this.save.seed, this.rx, this.ry)) this.map.objects = this.map.objects.filter((o) => o.id !== `canopy-gate-${this.rx}-${this.ry}`);
    if (rec.bloom || this.map.objects.some((o) => o.kind === "visceraBloom")) return tree;
    let spot = at;
    if (tree) { const crown = this.map.tiles.filter((t) => t.kind === "canopyTrunk" && t.elev === tree.top && !this.map.objects.some((o) => Math.round(o.x) === t.x && Math.round(o.y) === t.y)).sort((a, b) => (a.y - b.y) || (a.x - b.x)); if (crown[0]) spot = { x: crown[0].x, y: crown[0].y }; }
    this.map.objects.push({ id: `viscera-bloom-${this.rx}-${this.ry}`, kind: "visceraBloom", name: "Bloom of Divine Viscera", x: spot.x, y: spot.y, state: "open", actions: ["gather"], lore: ASCENDANCY.messages.bloom });
    return tree;
  }
  // Touch the ashes: the screen flashes, the Wayfarer is set clear of where the tree will stand, and the great tree rises out of the
  // ground over ASCENDANCY.rise s (its platforms climbing level by level, rubble falling) before it can be climbed.
  riseFromAshes(o) {
    const rec = riteRecord(this.save, this.rx, this.ry); if (!rec.done || rec.risen) return { ok: false, message: (this.message = ASCENDANCY.messages.ashes) };
    rec.risen = true; this.map.objects = this.map.objects.filter((q) => q !== o);
    const tree = this.raiseRiteTree({ x: o.x, y: o.y }), now = this.lastUpdateNow || 0, w = mapWidth(this.map, "overworld"), p = this.player;
    if (tree) {
      const tiles = []; this.map.tiles.forEach((t, i) => { if (t.canopy) { tiles.push([i, t.elev || 0]); t.elev = 0; } });
      const trees = [this.map.canopy, ...(this.map.canopy.trees || [])].filter(Boolean), tops = trees.map((c) => c.top); for (const c of trees) c.top = 0;
      this.treeRise = { start: now, end: now + ASCENDANCY.rise * 1000, tiles, trees, tops, nextRubble: now };
      if (this.map.tiles[Math.floor(p.y + .6) * w + Math.floor(p.x + .4)]?.canopy) { let best = null; for (const t of this.map.tiles) { if (t.canopy || t.blocked || !footprintOpen(this.map, w, t.x, t.y)) continue; const d = Math.hypot(t.x - p.x, t.y - p.y); if (!best || d < best.d) best = { x: t.x, y: t.y, d }; } if (best) { p.x = best.x; p.y = best.y; } } // set clear of the rising wood
    }
    (this.effects ||= []).push({ id: `rite-flash-${now}`, kind: "riteFlash", x: p.x, y: p.y, life: 1.1, maxLife: 1.1, damage: 0, radius: 0, pulse: 99, untilPulse: 99 });
    this.cameraShake = Math.max(this.cameraShake || 0, .8);
    this.defeatNotice = { title: "A GREAT TREE RISES", detail: "Divine Viscera on its crown · a door to the sky", kind: "discovery" };
    journalOnce(this.save, `rite-risen:${riteKey(this.rx, this.ry)}`, ASCENDANCY.messages.rise, "The Rite of Ascendancy");
    this.message = ASCENDANCY.messages.rise; this.sync(); return { ok: true, message: this.message };
  }
  // One frame of the rising tree: every platform at its share of its height, rubble falling round the trunk.
  tickTreeRise(now) {
    const T = this.treeRise, k = Math.max(0, Math.min(1, (now - T.start) / (T.end - T.start))), ease = 1 - (1 - k) ** 3;
    for (const [i, e] of T.tiles) { const t = this.map.tiles[i]; if (t) t.elev = k >= 1 ? e : Math.round(e * ease); }
    T.trees.forEach((c, j) => { c.top = k >= 1 ? T.tops[j] : Math.round(T.tops[j] * ease); });
    if (k < 1 && now >= T.nextRubble) { T.nextRubble = now + 70; const c = T.trees[0], h = hashSeed(`rite-rubble:${Math.round(now)}`); (this.effects ||= []).push({ id: `rite-rubble-${now}`, kind: "riteRubble", x: c.x0 + (h % 1000) / 1000 * (c.size + 4) - 2, y: c.y0 + ((h >>> 10) % 1000) / 1000 * (c.size + 4) - 2, h: 1.5 + ((h >>> 20) % 100) / 30, life: .7, maxLife: .7, damage: 0, radius: 0, pulse: 99, untilPulse: 99 }); this.cameraShake = Math.max(this.cameraShake || 0, .25); }
    if (k >= 1) this.treeRise = null;
  }
  gatherBloom(o) {
    const rec = riteRecord(this.save, this.rx, this.ry); if (rec.bloom) return { ok: false, message: (this.message = "The bloom is spent.") };
    rec.bloom = true; this.map.objects = this.map.objects.filter((q) => q !== o);
    ensureSkylands(this.save); this.save.skylands.viscera = (Number(this.save.skylands.viscera) || 0) + ASCENDANCY.viscera;
    this.defeatNotice = { title: "DIVINE VISCERA", detail: `+${ASCENDANCY.viscera} · spend it in the Skylands' Divine Challenge`, kind: "discovery" };
    this.message = ASCENDANCY.messages.gathered(ASCENDANCY.viscera); this.sync(); return { ok: true, message: this.message };
  }
  // Release 677 (the-deep.ts): a Deep Shaft in a section first seen from now on; it offers floor 1 and each checkpoint reached.
  placeDeepShaft() {
    if (this.map.objects.some((o) => o.kind === "deepShaft")) return null;
    const w = mapWidth(this.map, "overworld"), rec = deepShaft(this.save, deepIdFor(this.save.seed, this.rx, this.ry)); let at = null;
    for (let r = 3; r <= 10 && !at; r++) for (let k = 0; k < 16 && !at; k++) { const a = k / 16 * Math.PI * 2, x = Math.round(16 + Math.cos(a) * r), y = Math.round(16 + Math.sin(a) * r), t = this.map.tiles[y * w + x];
      if (t && !t.blocked && !t.structure && !t.environment && !t.buildingId && !t.landscape?.startsWith?.("sea") && footprintOpen(this.map, w, x, y) && !this.map.objects.some((o) => Math.hypot(o.x - x, o.y - y) < 2)) at = { x, y }; }
    if (!at) return null;
    const o = { id: `deep-shaft-${this.rx}-${this.ry}`, kind: "deepShaft", name: THE_DEEP.name, x: at.x, y: at.y, state: "open", actions: startFloors(rec).map((f) => `descend:${f}`), lore: THE_DEEP.messages.shaft, landmark: true };
    this.map.objects.push(o); if (!this.message) this.message = THE_DEEP.messages.shaft; return o;
  }
  resetDeepFloor(id) { delete this.save.consequences.dungeons[id]; for (const k of Object.keys(this.save.session.areas || {})) if (k === id || k.startsWith(`${id}:`)) delete this.save.session.areas[k]; }
  enterDeep(o, chosen) {
    const id = deepIdFor(this.save.seed, this.rx, this.ry), rec = deepShaft(this.save, id), want = Number(String(chosen || "").split(":")[1]) || 1, floor = startFloors(rec).includes(want) ? want : 1;
    rec.floor = floor; this.resetDeepFloor(id);
    this.save.session.dungeonReturn = { rx: this.rx, ry: this.ry, x: o.x, y: o.y + 1 }; this.save.session.activeDungeonId = id; this.save.session.activeDungeonLevelId = null;
    pinDungeonLayout(this.save, id); const h = dungeonHistory(this.save, id); h.visits++; h.visitOpen = true; h.gatePredatorSpawnThreshold = 0;
    this.loadArea("dungeon"); this.settleArrival();
    this.defeatNotice = { title: `THE DEEP · FLOOR ${floor}`, detail: floor > 1 ? "no way back up but a Return Ember · fell the guardian to go deeper" : "fell the guardian to go deeper · burn a Return Ember to come back up", kind: "danger" };
    this.message = `You climb down into the Deep${floor > 1 ? ` and on to floor ${floor}` : ""}.`; this.sync(); return { ok: true, message: this.message };
  }
  descendDeep(o) {
    const id = this.areaId(), rec = deepShaft(this.save, id); rec.floor = (this.map.deepFloor || rec.floor) + 1; this.resetDeepFloor(id);
    pinDungeonLayout(this.save, id); const h = dungeonHistory(this.save, id); h.visits++; h.visitOpen = true; h.gatePredatorSpawnThreshold = 0;
    this.loadArea("dungeon", false); this.settleArrival(); this.projectiles = [];
    this.defeatNotice = { title: `THE DEEP · FLOOR ${rec.floor}`, detail: rec.floor % THE_DEEP.checkpointEvery === 0 ? "a checkpoint: you may start here next time" : `deepest ${Math.max(rec.best, rec.floor - 1)} · ${this.save.theDeep.embers} Return Ember${this.save.theDeep.embers === 1 ? "" : "s"}`, kind: "danger" };
    this.message = `You go down the Deep Stair to floor ${rec.floor}.`; this.sync(); return { ok: true, message: this.message };
  }
  // A floor of the Deep cleared: the record, an ember, the stair. Returns whether this floor was cleared for the first time.
  deepFloorCleared() {
    const id = this.areaId(), rec = deepShaft(this.save, id), f = this.map.deepFloor, first = f > rec.best, D = this.save.theDeep;
    rec.best = Math.max(rec.best, f); D.embers += THE_DEEP.emberPerClear;
    if (f > D.record) { D.record = f; if (f === 1 || f % THE_DEEP.checkpointEvery === 0) journalOnce(this.save, `the-deep-record:${f}`, `You reached floor ${f} of the Deep, the deepest you have been.${f % THE_DEEP.checkpointEvery === 0 ? " A checkpoint: its shaft will let you start there." : ""}`, "The Deep"); }
    this.placeDeepStair(dungeonHistory(this.save, id));
    this.defeatNotice = { title: `FLOOR ${f} CLEARED`, detail: `a Return Ember (${D.embers} held) · the Deep Stair opens${first ? " · a new deepest floor" : ""}`, kind: "discovery" };
    return first;
  }
  placeDeepStair(history) {
    if (this.area !== "dungeon" || !this.map?.deepFloor || !history?.combatClear?.completed || this.map.objects.some((o) => o.kind === "deepStair")) return null;
    const exit = this.map.objects.find((o) => o.id === "expedition-fast-exit") || this.map.entry; if (!exit) return null;
    const w = mapWidth(this.map, this.area); let at = null;
    for (let r = 1; r <= 5 && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r && !at; dx++) { const x = Math.round(exit.x) + dx, y = Math.round(exit.y) + dy; if ((dx || dy) && footprintOpen(this.map, w, x, y) && !this.map.objects.some((o) => Math.round(o.x) === x && Math.round(o.y) === y)) at = { x, y }; }
    if (!at) return null;
    const stair = { id: "deep-stair", kind: "deepStair", name: `Deep Stair · down to floor ${this.map.deepFloor + 1}`, x: at.x, y: at.y, state: "open", actions: ["descend"] };
    this.map.objects.push(stair); return stair;
  }
  burnEmber() {
    const D = ensureTheDeep(this.save).theDeep; if (D.embers < 1) return { ok: false, message: (this.message = THE_DEEP.messages.noEmber) };
    D.embers--; const result = this.leaveDungeon(THE_DEEP.messages.ember);
    if (result) { relocateIfStranded(this.player, this.map, mapWidth(this.map, "overworld")); this.player.invulnerableUntil = (this.lastUpdateNow || 0) + 2000; this.sync(); }
    return { ok: !!result, message: this.message };
  }
  // Canyon craters (canyon.ts). The entrance on the overworld; sealed for good once it collapsed (no shine, no way in).
  placeCrater() {
    const id = canyonIdFor(this.save.seed, this.rx, this.ry), h = this.save.consequences?.dungeons?.[id], sealed = !!h?.canyon?.sealed, w = mapWidth(this.map, "overworld"); let at = null;
    for (let r = 4; r <= 11 && !at; r++) for (let k = 0; k < 16 && !at; k++) { const a = k / 16 * Math.PI * 2 + 1, x = Math.round(16 + Math.cos(a) * r), y = Math.round(16 + Math.sin(a) * r), t = this.map.tiles[y * w + x];
      if (t && !t.blocked && !t.structure && !t.environment && !t.buildingId && !t.keep && footprintOpen(this.map, w, x, y) && !this.map.objects.some((o) => Math.hypot(o.x - x, o.y - y) < 2)) at = { x, y }; }
    if (!at) return null;
    const o = sealed ? { id: `canyon-crater-${this.rx}-${this.ry}`, kind: "ruinMarker", name: "Collapsed Crater", lore: "The crater has fallen in on itself. Whatever lay at its bottom is buried for good.", x: at.x, y: at.y, state: "quiet", actions: ["inspect"] }
      : { id: `canyon-crater-${this.rx}-${this.ry}`, kind: "dungeon", dungeonId: id, dungeonType: "canyon", name: CANYON.name, identity: "a crater where something divine fell", x: at.x, y: at.y, state: "open", actions: ["enter", "bypass"], landmark: true, lore: CANYON.messages.entrance };
    this.map.objects.push(o); if (!sealed && !this.message) this.message = CANYON.messages.entrance; return o;
  }
  // Pushing into a clod drills it; strain settles on the rest. Breaking a red clod caves in.
  drillAhead(x, y, dt, now) {
    const st = (this.canyonDrill ||= {});
    if (Math.hypot(x, y) < .4) return null;
    const p = this.player, w = mapWidth(this.map, this.area), cx = p.x + .5 + Math.sign(Math.round(x * 1.4)) * .7, cy = p.y + .6 + Math.sign(Math.round(y * 1.4)) * .7, t = this.map.tiles[Math.floor(cy) * w + Math.floor(cx)];
    if (!isClod(t) || Math.hypot(t.x + .5 - (p.x + .5), t.y + .5 - (p.y + .6)) > 1.6) { this.drillTile = null; return null; }
    if (!this.mechUp()) { this.drillTile = null; if (now >= (this.drillHintAt || 0)) { this.drillHintAt = now + 4000; this.message = CANYON.messages.needRobot; } return null; } // the robot's auger only
    const h = ensureCanyonHistory(dungeonHistory(this.save, this.areaId())), r = drillClod(t, st, dt); this.drillTile = { x: t.x, y: t.y, progress: st[`${t.x},${t.y}`]?.progress || 0, strain: st[`${t.x},${t.y}`]?.strain || 0, need: CANYON.clod.hp[t.kind] || 1 };
    if (r.climbed) { h.strained.push(t.y * w + t.x); this.message = r.climbed === CANYON.kinds.red ? CANYON.messages.yellowToRed : CANYON.messages.toYellow; }
    if (r.broke) { h.drilled.push(t.y * w + t.x); if (h.drilled.length > CANYON.maxDrilled) h.drilled.shift(); this.drillTile = null; if (r.caveIn) this.caveIn(t, h, now); else this.clodOpened(t); }
    return r;
  }
  // A drilled-open clod may hide a golem (it bursts out at you) or a find. Each clod is drilled once, so each pays once.
  clodOpened(t) {
    const secret = clodSecret(this.save.seed, this.areaId(), t.x, t.y); if (!secret) return null;
    if (secret === "golem") {
      const c = this.createEnemyFromSpawn({ id: `${this.areaId()}:clod:${t.x}:${t.y}`, kind: "earthGolem", x: t.x, y: t.y }, "dungeon");
      c.aggro = true; ensureAI(c); this.enemies.push(c); this.cameraShake = Math.max(this.cameraShake || 0, .35); this.message = CANYON.messages.golem; return c;
    }
    const m = (this.save.materials ||= {});
    if (secret.id === "stone") addStone(this.save, secret.n); else m[secret.id] = (Number(m[secret.id]) || 0) + secret.n;
    this.message = CANYON.messages.find(secret.n, secret.name); this.sync?.(); return secret;
  }
  // Each frame in a crater: strain settles; a collapsed crater lets nobody back in (after the death it caused, you are put out).
  canyonTick(dt, now) {
    settleClods(this.canyonDrill ||= {}, dt);
    if (this.player.hp > 0 && dungeonHistory(this.save, this.areaId()).canyon?.sealed) { this.canyonDrill = {}; this.leaveDungeon(CANYON.messages.collapse); }
  }
  caveIn(t, h, now) {
    const p = this.player, C = CANYON.caveIn; h.caveIns++;
    if (now >= (p.invulnerableUntil || 0)) p.hp -= Math.max(1, Math.round(this.save.maxHp * C.damage));
    this.cameraShake = Math.max(this.cameraShake || 0, .6); (this.fx ||= []).push?.({ kind: "caveIn", x: t.x + .5, y: t.y + .5, life: .8, maxLife: .8 });
    if (h.caveIns >= C.limit) { h.sealed = true; journalOnce(this.save, `canyon-collapse:${this.areaId?.()}`, CANYON.messages.collapse, "Canyon Craters"); p.hp = 0; this.message = CANYON.messages.collapse; this.defeatNotice = { title: "THE CRATER COLLAPSES", detail: "sealed for good", kind: "danger" }; return true; } // the third cave-in kills, and the crater is gone
    this.defeatNotice = { title: "CAVE-IN", detail: `${h.caveIns} of ${C.limit} · one more and the crater may collapse`, kind: "danger" }; this.message = CANYON.messages.caveIn(h.caveIns, C.limit); return false;
  }
  pullViscera(o) {
    const h = ensureCanyonHistory(dungeonHistory(this.save, this.areaId())); if (h.pulled || o.state === "pulled") return { ok: false, message: (this.message = "The wreck is empty now: only fossil and dust.") };
    h.pulled = true; o.state = "pulled"; o.actions = []; const hist = dungeonHistory(this.save, this.areaId()); hist.resolved = true; hist.guardianDefeated = true;
    ensureSkylands(this.save); this.save.skylands.viscera = (Number(this.save.skylands.viscera) || 0) + CANYON.viscera;
    this.defeatNotice = { title: "DIVINE VISCERA", detail: `+${CANYON.viscera} · spend it in the Skylands' Divine Challenge`, kind: "discovery" };
    journalOnce(this.save, `canyon-wreck:${this.areaId()}`, CANYON.messages.pulled(CANYON.viscera), "Canyon Craters");
    this.message = CANYON.messages.pulled(CANYON.viscera); this.sync(); return { ok: true, message: this.message };
  }
  // One frame of Fractured mode (release 671): after a doorway's grace a wave of several packs comes in from just out of sight
  // on different sides; once it is all down the next waits `rest` s, and one left standing is joined by the next after `press`
  // s; never past `cap` wave creatures alive nor `hardCap` in all. Runtime only (`fracState`), reset with the area.
  tickFractured(now) {
    if (this.enemies.some((e) => e.fracReinforcement && e.dead)) { for (const e of this.enemies) if (e.fracReinforcement && e.dead) e.fracGoneAt ??= now; this.enemies = this.enemies.filter((e) => !(e.fracReinforcement && e.dead && now - e.fracGoneAt > FRACTURED.corpse * 1000)); } // the 659 review: fallen reinforcements are cleared away
    const mode = this.fracturedHere(); if (!mode) { this.fracState = null; return; }
    const key = `${this.area}:${this.areaStateId()}`, F = FRACTURED, p = this.player;
    let st = this.fracState; if (!st || st.key !== key) st = this.fracState = { key, nextAt: now + F.grace * 1000, n: 0, wave: false };
    const hostile = this.enemies.filter((e) => !e.dead && !e.ambient && !e.passiveBehavior && !e.retreating && !e.astralAllyOf && e.kind !== "npc");
    const brought = hostile.filter((e) => e.fracReinforcement && !e.fracWardenAdd).length;
    const P = F.pace, pace = Math.max(0, Math.min(P.max, this.fracPace || 0));
    if (st.wave && brought === 0) { // the wave is broken: a rest, shorter the faster you broke it (the pace)
      const took = (now - (st.waveAt || now)) / 1000, next = took <= P.fast ? Math.min(P.max, pace + 1) : took >= P.slow ? Math.max(0, pace - 1) : pace; this.fracPace = next;
      st.wave = false; st.nextAt = now + mode.rest * P.rest[next] * 1000; this.message = next > pace ? F.messages.quicken(next) : next < pace ? F.messages.ease(next) : F.messages.lull;
    }
    if (this.tickFractureWarden(now, mode, key, st, hostile)) return; // release 666: the meter's Warden and its calls
    if (now < st.nextAt) return;
    const room = Math.min(mode.cap + P.cap * pace - brought, mode.hardCap - hostile.length); if (room < mode.pack[0]) { st.nextAt = now + 2000; return; }
    st.n++; const elite = st.n % mode.surgeEvery === 0, h = hashSeed(`${this.save.seed}:frac-wave:${key}:${st.n}`);
    const w = mapWidth(this.map, this.area), [d0, d1] = F.spawnDistance, kinds = [...new Set(this.enemies.filter((e) => e.fractured || fracturedOrdinary(e)).map((e) => e.kind))].filter((k) => k !== "npc");
    const packs = mode.packs[0] + h % (mode.packs[1] - mode.packs[0] + 1) + P.packs * pace; let left = room, came = 0, rare = false;
    for (let k = 0; k < packs && left >= 2; k++) {
      const hk = hashSeed(`${this.save.seed}:frac-wave:${key}:${st.n}:p${k}`), base = (h >>> 4) % 628 / 100 + k * 6.283 / packs; // packs spread round the Wayfarer
      let at = null; for (let i = 0; i < 24 && !at; i++) { const a = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .3, r = d0 + ((hk >>> 12) + i * 7) % (d1 - d0 + 1), x = Math.round(p.x + Math.cos(a) * r), y = Math.round(p.y + Math.sin(a) * r); if (x > 0 && y > 0 && x < w - 1 && y < (this.map.height || w) - 1 && this.fracturedOpen(x, y, w)) at = { x, y }; }
      if (!at) continue;
      const size = Math.min(left, mode.pack[0] + hk % (mode.pack[1] - mode.pack[0] + 1) + (elite ? mode.surge : 0) + Math.floor(P.size * pace)), roll = ((hk >>> 9) % 1000) / 1000;
      const rank = elite ? (roll < .35 ? "rare" : "champion") : roll < mode.rare * .5 ? "rare" : roll < mode.champion ? "champion" : null; rare ||= rank === "rare";
      const pack = packSpawns(`${this.save.seed}:frac-wave:${key}:${st.n}:p${k}`, kinds.length ? kinds : F.fallback, at.x, at.y, size, rank, (x, y) => this.fracturedOpen(x, y, w), `frac-r-${(this.fracSeq = (this.fracSeq || 0) + 1)}`, { fracReinforcement: true });
      for (const q of pack.slice(0, left)) { const c = this.scaleToRegion(this.createEnemyFromSpawn(q)); c.aggro = true; this.enemies.push(c); left--; came++; } // never past the room (657: a shaman counts)
    }
    st.nextAt = now + (came ? mode.press * P.press[pace] : 2) * 1000; // a wave left standing is joined by the next
    if (came) { if (!st.wave) st.waveAt = now; st.wave = true; this.message = elite ? F.messages.elite : rare ? F.messages.rare : F.messages.wave; }
  }
  // Release 666 (fractured.ts FRACTURE_WARDEN): with the meter full and no Warden up, one steps through just off the Wayfarer
  // (after the doorway's grace); while it lives, ordinary waves wait and it calls packs of the area's creatures round itself
  // every few seconds, never past its own cap. Returns true while the Warden owns the area's pace.
  tickFractureWarden(now, mode, key, st, hostile) {
    const W = FRACTURE_WARDEN, rec = this.save.fractureSeals?.[key];
    if (!rec || rec.sealed || rec.kills < fractureNeed(mode)) return false;
    const warden = this.enemies.find((e) => e.fracWarden && !e.dead), p = this.player, w = mapWidth(this.map, this.area);
    if (!warden) {
      if (now < (st.wardenAt ??= now + 2500) || this.enemies.some((e) => e.fracWarden && e.dead && !e.rewarded)) return true;
      const h = hashSeed(`${this.save.seed}:fracture-warden:${key}:${st.tries = (st.tries || 0) + 1}`), [d0, d1] = W.spawnDistance;
      let at = null; for (let i = 0; i < 24 && !at; i++) { const a = ((h >>> 4) + i * 2.399) % 6.283, r = d0 + ((h >>> 12) + i * 3) % (d1 - d0 + 1), x = Math.round(p.x + Math.cos(a) * r), y = Math.round(p.y + Math.sin(a) * r); if (x > 0 && y > 0 && x < w - 1 && y < (this.map.height || w) - 1 && this.fracturedOpen(x, y, w)) at = { x, y }; }
      if (!at) { st.wardenAt = now + 500; return true; }
      const kinds = [...new Set(this.enemies.filter((e) => e.fractured || fracturedOrdinary(e)).map((e) => e.kind))], body = wardenBody(this.save.seed, key, kinds, (k) => !!MONSTER_PACK[k] && !MONSTER_PACK[k].unique && !MONSTER_PACK[k].minion && !MONSTER_PACK[k].prototypeOnly);
      const c = this.createEnemyFromSpawn({ id: `frac-warden-${hashSeed(key)}-${st.tries}`, kind: body, x: at.x, y: at.y, traits: [], fracWarden: true, fracKey: key });
      c.aggro = true; this.enemies.push(c); st.wardenCall = now + W.adds.first * 1000; st.calls = 0;
      this.message = W.messages.tear; this.defeatNotice = { title: "A FRACTURE WARDEN", detail: `${MONSTER_PACK[body]?.name || body} · it calls more through the fracture`, kind: "danger" };
      return true;
    }
    const adds = this.enemies.filter((e) => !e.dead && e.fracWardenAdd).length;
    if (now >= (st.wardenCall || 0) && adds < W.adds.cap) {
      const h = hashSeed(`${this.save.seed}:fracture-call:${key}:${st.calls = (st.calls || 0) + 1}`), [lo, hi] = W.adds.size, size = Math.min(W.adds.cap - adds, lo + h % (hi - lo + 1));
      st.wardenCall = now + (W.adds.every[0] + (h >>> 5) % (W.adds.every[1] - W.adds.every[0] + 1)) * 1000;
      const kinds = [...new Set(this.enemies.filter((e) => !e.fracWarden && (e.fractured || fracturedOrdinary(e))).map((e) => e.kind))].filter((k) => k !== "npc");
      const rank = st.calls % W.adds.championEvery === 0 ? "champion" : null;
      const pack = packSpawns(`${this.save.seed}:fracture-call:${key}:${st.calls}`, kinds.length ? kinds : FRACTURED.fallback, warden.x, warden.y, size, rank, (x, y) => this.fracturedOpen(x, y, w), `frac-wa-${(this.fracSeq = (this.fracSeq || 0) + 1)}`, { fracReinforcement: true, fracWardenAdd: true });
      for (const q of pack.filter((q) => !q.fracShaman).slice(0, size)) { const e = this.scaleToRegion(this.createEnemyFromSpawn(q)); Object.assign(e, { aggro: true, fracWardenAdd: true }); this.enemies.push(e); }
      if (pack.length) this.message = W.messages.call;
    }
    return true;
  }
  // Release 668 (boss-kit.ts): a guardian or elite calls `n` of the area's ordinary creatures round itself. They are summons
  // (no rewards; they go when it falls), tuned for the area like any spawn. Returns how many came.
  spawnKitAdds(e, n, now) {
    const w = mapWidth(this.map, this.area), kinds = [...new Set(this.enemies.filter((q) => fracturedOrdinary(q) && !q.summonedBy && !q.ambient && !q.passiveBehavior && q.kind !== "npc").map((q) => q.kind))], pool = kinds.length ? kinds : FRACTURED.fallback;
    let made = 0; const h = hashSeed(`${this.save.seed}:kit-adds:${e.id}:${e.kitCalls || 0}`);
    for (let i = 0; i < 16 && made < n; i++) {
      const a = ((h >>> 3) % 628) / 100 + i * 2.399, r = 1.5 + ((h >>> 9) + i) % 2, x = Math.round(e.x + Math.cos(a) * r), y = Math.round(e.y + Math.sin(a) * r);
      if (x < 1 || y < 1 || x >= w - 1 || y >= (this.map.height || w) - 1 || !footprintOpen(this.map, w, x, y) || footprintHazard(this.map, w, x, y) || this.enemies.some((q) => !q.dead && Math.round(q.x) === x && Math.round(q.y) === y)) continue;
      const c = this.createEnemyFromSpawn({ id: `kit-${e.id}-${e.kitCalls || 0}-${made}`, kind: pool[(h >>> (made * 3 % 24)) % pool.length], x, y, traits: [], kitAddOf: e.id });
      Object.assign(c, { summonedBy: e.id, kitAddOf: e.id, noRewards: true, aggro: true }); this.enemies.push(c); made++;
    }
    if (made) this.message = `${e.packName || e.foundryName || "The guardian"} calls for help.`;
    return made;
  }
  // Release 666: the HUD's fracture meter, while Fractured mode holds here: kills of need, and the Warden when it is up.
  fractureMeter() {
    const mode = this.fracturedHere(); if (!mode) return null;
    const rec = this.save.fractureSeals?.[fractureKey(this.area, this.areaStateId())], warden = this.enemies.find((e) => e.fracWarden && !e.dead) || null;
    return { kills: Math.min(fractureNeed(mode), Number(rec?.kills) || 0), need: fractureNeed(mode), warden };
  }
  // Release 666: a kill in a Fractured area fills the meter; the Warden's fall seals the area and drops its cache.
  fractureOnKill(e) {
    if (e.fracWarden) {
      const W = FRACTURE_WARDEN, key = e.fracKey || fractureKey(this.area, this.areaStateId()), rec = fractureRecord(this.save, key);
      rec.sealed = true; this.fracState = null;
      for (const q of this.enemies) if (!q.dead && q.fracWardenAdd) { q.dead = true; q.noRewards = true; q.rewarded = true; } // its called packs go with it
      for (let i = 0; i < W.cache.items; i++) this.obtainDrop(`fracture-cache:${e.kind}`);
      this.save.currency += W.cache.marks; this.save.consumables.restorativeDraught = (Number(this.save.consumables.restorativeDraught) || 0) + W.cache.draughts;
      return { title: "THE FRACTURE IS SEALED", detail: `Fracture Warden felled · cache: ${W.cache.items} items, ${W.cache.marks} marks, a draught · this ground is safe`, message: W.messages.sealed };
    }
    if (e.fracWardenAdd || e.summonedBy || e.ambient || e.astralAllyOf || e.passiveBehavior) return null;
    const mode = this.fracturedHere(); if (!mode) return null;
    const key = fractureKey(this.area, this.areaStateId());
    if (this.enemies.some((q) => q.fracWarden && !q.dead)) return null;
    if (fractureKill(this.save, key, mode, e)) return { message: "The fracture strains. Something is coming through." };
    return null;
  }
  // Release 649 (tool-forms.ts MIRAGE): the Great Sweep with Mirage of Blades throws a spinning great blade (more with Echo),
  // out to its reach and home again to the Wayfarer. Runtime only: the blades are projectiles.
  mirageThrow(now = this.lastUpdateNow || 0) {
    if (now < (this.toolReadyAt || 0)) return false;
    const M = MIRAGE, p = this.player, glyphs = this.glyphLoadout("tool"), cx = p.x + .5, cy = p.y + .45, foe = this.mirageFoe();
    this.toolReadyAt = now + M.cooldown * 1000 * glyphs.mods.cooldown * (1 - armorGlyphBonus(this.save).attackSpeed);
    const d = foe ? projectileDirection(foe.x + .5 - cx, foe.y + .45 - cy, p.facing) : projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing);
    if (foe) this.aimMark = { id: foe.id, until: now + AIM_MARK.ms };
    const air = fieldOn(this.save, "charged-air") && this.spellRunning(now), CA = FIELD_PASSIVES["charged-air"], base = this.toolPower() * M.share * (air ? 1 + CA.damage : 1);
    const plan = echoPlan(glyphs), shares = [1, ...(plan ? plan.copies.map((c) => c.share) : [])].slice(0, M.max);
    shares.forEach((share, i) => {
      const live = this.projectiles.filter((q) => q.mirage && !q.dead);
      if (live.length >= M.max) live.sort((a, b) => (b.returning ? 1 : 0) - (a.returning ? 1 : 0) || a.born - b.born)[0].dead = true; // the oldest on its way home goes
      const a = i ? (i % 2 ? 1 : -1) * M.spread * Math.ceil(i / 2) : 0, c = Math.cos(a), sn = Math.sin(a), blade = (this.mirageTurn = ((this.mirageTurn || 0) + 1) % 3);
      this.projectiles.push({ id: `mirage-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, x: cx, y: cy, dx: d.x * c - d.y * sn, dy: d.x * sn + d.y * c, speed: M.speed, life: M.out / M.speed + M.back + 1, outFor: M.out / M.speed, damage: Math.max(1, Math.round(base * share * glyphs.mods.damage)), damageType: "physical", path: "straight", age: 0, hits: {}, glyphHost: "tool", pierce: 0, knife: true, mirage: true, blade: (blade + 2) % 3, born: now + i, grow: M.grow + (air ? CA.grow * 2 : 0), ...(air ? { scale: CA.scale } : {}), ...(i ? { echo: true } : {}) });
    });
    p.attackUntil = now + 200; stampAttackVisual(p, "mirage", 200, d); this.message = "Mirage of Blades!";
    return true;
  }
  mirageFoe(range = MIRAGE.range) { const t = this.lockedTarget(), p = this.player; return t && !t.untargetable && !t.hidden && Math.hypot(t.x - p.x, t.y - p.y) <= range ? t : pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), range)?.e || null; }
  // One frame of the mirage blades: out for `outFor` s, then home on the Wayfarer until caught or `back` s have passed.
  tickMirage(dt) {
    const M = MIRAGE, p = this.player, px = p.x + .5, py = p.y + .45;
    for (const q of this.projectiles) {
      if (!q.mirage || q.dead) continue;
      if (!q.returning && q.age >= q.outFor) { q.returning = true; q.backAt = q.age; q.hits = {}; } // a fresh cut on the way in
      if (!q.returning) continue;
      const ax = px - q.x, ay = py - q.y, dist = Math.hypot(ax, ay);
      if (dist < M.catch || q.age - (q.backAt ?? q.age) >= M.back) { q.dead = true; continue; }
      let turn = Math.atan2(ay, ax) - Math.atan2(q.dy, q.dx); turn = Math.atan2(Math.sin(turn), Math.cos(turn)); // it turns (an arc), never snaps round
      const a = Math.atan2(q.dy, q.dx) + Math.max(-M.seekTurn * dt, Math.min(M.seekTurn * dt, turn)); q.dx = Math.cos(a); q.dy = Math.sin(a); q.speed = M.backSpeed;
    }
  }
  // Release 537 (tool-forms.ts CLUSTER): a bursting Bombard shell throws its bomblets (not hostile shells, not bomblets).
  clusterShell(shot) {
    if (shot.hostile || shot.bomblet || shot.glyphHost !== "tool" || !fieldOn(this.save, "cluster-shell")) return;
    const turn = (hashSeed(shot.id) / 4294967296) * Math.PI * 2; // release 539: a fresh line through the burst for every shell (from its id, so a replay matches)
    for (let i = 0; i < CLUSTER.count; i++) { const a = turn + i * Math.PI * 2 / CLUSTER.count, c = Math.cos(a), sn = Math.sin(a); // evenly round it: two at opposite ends
      const r = (shot.blastRadius || 2) * CLUSTER.radius; // release 539: it flies its own blast radius, so that blast's edge meets the first burst's centre
      this.projectiles.push({ id: `${shot.id}-cluster${i}`, x: shot.x, y: shot.y, dx: c, dy: sn, speed: CLUSTER.speed, life: r / CLUSTER.speed, damage: Math.max(1, Math.round(shot.damage * CLUSTER.share)), damageType: shot.damageType, path: "grenade", age: 0, hits: {}, blastRadius: r, glyphHost: "tool", bomblet: true, ...(shot.toolUseNewborn ? { toolUseNewborn: true } : {}) }); }
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
    if(!this._fistInputUpdate)this.releasePendingToolUse(now);this.reconcileHammerfallStartup();if(this.toolUseBlocksPrimary())return false;
    if (this.fistCharge || now < (this.fistRecoverUntil || 0)) return false;
    const c = this.fistCombo, live = c && now <= c.until && c.step < IRON_FISTS.punches.length;
    if (live) { const next = c.step + 1, P = IRON_FISTS.punches[next - 1]; if (action && P.echoes && hostLoadout(this.save, "melee").count("echo") >= P.echoes) { this.fistCharge = { action, start: now, direction, step: next };this.cancelConsumeVisual('charge');if(this.player.attackVisual?.hammerEffectId)this.cancelAttackPresentation(now); return true; } return this.fistPunch(next, 0, now, direction); } // release 503: Echo glyphs let the jab and uppercut charge
    this.fistCombo = null;
    if (action) { this.fistCharge = { action, start: now, direction };this.cancelConsumeVisual('charge');if(this.player.attackVisual?.hammerEffectId)this.cancelAttackPresentation(now); return true; }
    return this.fistPunch(1, 0, now, direction);
  }
  fistPunch(step, charge = 0, now = this.lastUpdateNow || 0, direction = null) {
    if(!this._fistInputUpdate)this.releasePendingToolUse(now);this.reconcileHammerfallStartup();if(this.toolUseBlocksPrimary())return false;
    if (this.cursed("attack", now)) { this.fistCombo = null; return false; } // release 737: a charged punch let go under NO ATTACK
    const F = IRON_FISTS, P = F.punches[step - 1], p = this.player, w = this.glyphWorld(now), reach = P.dash + (P.chargeDash || 0) + 1, boxing = now < (this.boxingUntil || 0) ? BRAWLER["shadow-boxing"] : null;
    const logicalNow = now - (this.presentationPausedMs || 0), prior = recentHeroPresentation(p, logicalNow, p.x, p.y);
    const fistLead = step === 1 ? (this.save.fistOpeningHand === 'right' ? 'left' : 'right') : this.fistCombo?.lead || this.save.fistOpeningHand || 'right';
    let d = direction && Math.hypot(direction.x, direction.y) > .01 && !this.lockedTarget() ? projectileDirection(direction.x, direction.y, p.facing) : null, dist = P.dash;
    if (P.rush) { // release 491: the dash punch rushes to the targeted foe in range, else lands in place
      const rush = P.rush + (boxing ? boxing.stick : 0), t = this.lockedTarget(), locked = t && !t.untargetable && !t.hidden && Math.hypot(t.x - p.x, t.y - p.y) <= rush + 1 ? t : null, foe = locked || pickMeleeTarget(p, this.enemies, this.map, mapWidth(this.map, this.area), rush)?.e;
      if (foe) { d = projectileDirection(foe.x - p.x, foe.y - p.y, p.facing); dist = Math.max(0, Math.hypot(foe.x - p.x, foe.y - p.y) - P.stop); this.aimMark = { id: foe.id, until: now + AIM_MARK.ms }; }
      else d ||= projectileDirection(this.save.lastAim?.x || 0, this.save.lastAim?.y || 0, p.facing);
    } else { if (boxing && !d) this.shadowBoxStep(P.radius + .4, now); d ||= this.brawlerAim(reach).d; } // release 493: boxing carries the jab and uppercut to the foe
    if (step === 1) p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, now + F.guardMs);
    for (let k = .25; k <= dist + 1e-6; k += .25) { const nx = p.x + d.x * .25, ny = p.y + d.y * .25; if (!w.canStand(nx, ny) || !this.moveGuardedCombatStep(nx, ny)) break; }
    const at = { x: p.x + .5 + d.x * .7, y: p.y + .45 + d.y * .7 }, landed = this.enemies.some((e) => !e.dead && !e.untargetable && !e.hidden && Math.hypot(e.x + .5 - at.x, e.y + .45 - at.y) <= P.radius + Math.max(0, enemyBodyRadius(e) - .38));
    const before = step === 1 ? [] : this.fistCombo?.landed || [], finisher = step === 3 && before[0] && before[1];
    const effect={ id: `fist-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`, kind: step === 3 ? "fist-uppercut" : "iron-fist", brawler: true, x: at.x, y: at.y, life: step === 3 ? .3 : .25, radius: P.radius, pulse: 99, untilPulse: 0, damage: Math.max(1, Math.round(this.fistPower() * (P.share + (P.chargeShare || 0) * charge) * (finisher ? F.finisher : 1) * (1 + (boxing?.damage || 0)))), pulseIndex: 0, hits: {}, glyphHost: "melee", healShare: boxing?.heal || 0, imbue: this.imbueBonus(now), stun: finisher ? F.finisherStun : P.stun || .3 * charge, finisher: !!finisher };
    const delayed=this.closeViewActionEligible()&&(this.attackAction==='attack'||this._fistInputUpdate===true);
    if(!delayed)this.effects.push(effect);
    if (step === 1) this.save.fistOpeningHand = fistLead;
    this.fistCombo = step >= F.punches.length ? null : { step, until: now + F.window * 1000, landed: [...before, delayed ? false : landed], lead: fistLead };
    if (step >= F.punches.length) this.fistRecoverUntil = now + F.recover * 1000;
    if(!delayed)this.cloneSwing({ ...BRAWLER_ECHO.cloneArc, damage: primaryProfile(this.save.equipment.primary).damage }, d, now); // release 503: the Shadow Clone throws a plain arc swing with each punch
    this.cancelConsumeVisual('attack');
    p.attackUntil = now + 240; p.meleeUntil = now + 240; p.fistVisualUntil = now + ACTION_MOTION.meleeMs; const visual = stampAttackVisual(p, "fist", 240, d); if (visual) { visual.fistStep = step; visual.fistLead = fistLead; visual.fistCharge = Math.max(0, Math.min(1, Number(charge) || 0)); visual.poseMs = prior?.now ?? Math.max(0, logicalNow); visual.fistGaitPhase = prior?.gaitPhase ?? (Number(p.walkPhase) || 0) * Math.PI; visual.fistSpeed = prior?.speed ?? 0; visual.facingYaw = prior ? Math.atan2(Math.sin(prior.yaw), Math.cos(prior.yaw)) : Math.atan2(d.y, d.x); }
    if(delayed){const move=step===1?'dash':step===2?'jab':'uppercut',T=CLOSE_VIEW_MELEE_TIMING[move],contactMs=T.contactMs,id=`melee-${effect.id}`;if(visual){visual.durationMs=T.durationMs;visual.meleeAction={v:1,kind:'iron-fists',move,contactMs,durationMs:T.durationMs};p.actionVisualUntil=now+T.durationMs;}this.pendingMeleeContact={v:1,id,action:{v:1,kind:'iron-fists',move,contactMs,durationMs:T.durationMs},area:this.area,areaId:this.areaId(),levelId:String(this.map?.levelId||'root'),acceptedAt:now,releaseAt:now+contactMs,contactMs,aim:{...d},payload:{kind:'fist',effect:structuredClone(effect),step,landedBefore:[...before],cloneDamage:primaryProfile(this.save.equipment.primary).damage,cloneEligible:this.shadowCloneActive(now)}};}
    this.message = finisher ? "Uppercut! All three landed." : step === 1 ? (charge >= 1 ? "Dash punch, fully charged!" : "Dash punch.") : step === 2 ? "Jab." : "Uppercut.";
    return true;
  }
  cancelAttackPresentation(now = this.lastUpdateNow || 0) {
    this.cancelPendingMeleeContact('presentation-interrupted');
    const p = this.player, record = normalizeAttackVisual(p?.attackVisual);
    if (record && attackVisualDeadline(p, record,{effects:this.effects,now,pendingToolUse:this.pendingToolUse}) > now) p.attackVisual.presentationCancelled = true;
  }
  cancelFistPresentation(now = this.lastUpdateNow || 0) {
    if (this.player?.attackVisual?.profile === 'fist') this.cancelAttackPresentation(now);
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
    if (id === "imbue-weapon") return left(this.imbueUntil || 0, IMBUE.seconds * 1000);
    if (id === "essence-walk") return left(this.essenceUntil || 0, ESSENCE_WALK.seconds * 1000);
    if (id === "shadow-clone") return this.shadowCloneActive(now) && !this.shadowClone.marginalia && !this.shadowClone.boxing ? left(this.shadowClone.until, S.lifetime * 1000) : 0;
    if (id === "orbit-volley" && this.orbit) return this.orbit.flight ? 1 : Math.max(0, 1 - (now - this.orbit.start) / 1000 / ORBIT.window); // release 519: the gathering window, then the flight
    const fx = this.ownSpellFx().filter((e) => e.glyphSpell === id && !e.echo && !String(e.id).endsWith("-vortex")); // release 519: every spell, quick ones too
    return fx.length && S.lifetime > 0 ? Math.min(1, Math.max(...fx.map((e) => e.life)) / S.lifetime) : 0;
  }
  // Release 519: an instant Rift Step (no glyphs riding after it) still lights its button for `RIFT_FLASH` s.
  riftFlashLeft(now = this.lastUpdateNow || 0) { const t = (now - (this.riftFlashAt ?? -Infinity)) / 1000; return t >= 0 && t < RIFT_FLASH ? 1 - t / RIFT_FLASH : 0; }
  spellbladeOn(now = this.lastUpdateNow || 0) { return fieldOn(this.save, "spellblade") && this.spellRunning(now); }
  // A spell's cooldown in seconds as it would start now: its glyphs, the Pairing and the armor/meal/page reductions (each capped).
  spellCooldownFor(spell) { const n = (Number(spell?.cooldown) || 0) * this.glyphLoadout("spell", spell.id).mods.cooldown * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown); return Number.isFinite(n) ? Math.max(0, n) : 0; }
  // Essence Walk (brawler-spells.ts ESSENCE_WALK): the stamina spell `id` costs while it recovers, or null when Essence Walk is
  // not running, does not apply to it (ESSENCE_WALK.exempt), or the spell is locked out (an Aegis spent down to empty).
  essencePrice(id) { const sp = SPELLS[id]; return sp ? essenceSpellCost(id, this.spellCooldownFor(sp)) : null; }
  essenceLocked(id, now = this.lastUpdateNow || 0) { return essenceLockout(id) && id === "aegis" && now < (this.aegisLockUntil || 0) && (this.save.magicSkills?.cooldowns?.[`spell:${id}`] || 0) > 0; }
  essenceCostFor(id, now = this.lastUpdateNow || 0) { return SPELLS[id] && now < (this.essenceUntil || 0) && !essenceExempt(id) && !this.essenceLocked(id, now) ? this.essencePrice(id) : null; }
  // A press that does not need the spell to have recovered (stepping into your Shadow Clone; launching gathered orbs, or
  // pressing while they fly): Essence Walk leaves it alone and it costs nothing.
  followUpPress(spell, now = this.lastUpdateNow || 0) { return (spell.id === "shadow-clone" && this.shadowCloneActive(now) && !this.shadowClone.boxing) || (spell.id === "orbit-volley" && !!this.orbit); }
  // Casts a recovering spell for stamina under Essence Walk: the spell's own cast runs as if it were ready, then its cooldown
  // goes back to what was left of it (the cast neither starts nor shortens it), and the stamina is spent only if it cast.
  essenceCast(spell, cds, key, spellId, remaining, now = this.lastUpdateNow || 0) {
    const cost = this.essencePrice(spell.id), p = this.player;
    if (!((p.stamina || 0) >= cost)) { this.message = `Essence Walk: ${spell.name} needs ${cost} stamina (you have ${Math.floor(p.stamina || 0)}).`; return false; }
    const legacy = this.spellCooldownRemaining; cds[key] = 0; if (!spellId) this.spellCooldownRemaining = 0;
    let ok = false;
    try { ok = !!this.castSpell(spellId ? spell.id : null); }
    finally { cds[key] = remaining; this.spellCooldownRemaining = legacy; }
    if (!ok) return false;
    if (spell.id === "orbit-volley" && this.orbit && !this.orbit.flight) this.orbit.essence = true; // its launch leaves the cooldown alone
    p.stamina = Math.max(0, p.stamina - cost);
    this.message = `${this.message} (Essence Walk: ${cost} stamina.)`;
    // ESSENCE_WALK.lockout: spent down too far for another, it is locked for its whole cooldown, Essence Walk or not.
    if (essenceLockout(spell.id) && spell.id === "aegis" && p.stamina < cost) { const full = this.spellCooldownFor(spell); cds[key] = Math.max(cds[key] || 0, full); this.aegisLockUntil = now + full * 1000; this.message += ` Your stamina is spent: ${spell.name} is locked for ${Math.ceil(full)}s.`; }
    return true;
  }
  castShadowClone(spell, cds, key, now = this.lastUpdateNow || 0) {
    if (this.shadowCloneActive(now) && !this.shadowClone.boxing) { // release 503: a Shadow Boxing echo is replaced, not stepped into
      if (this.shadowClone.charging) this.tickCloneCharge(false, now); // release 417
      const origin={x:this.player.x+.5,y:this.player.y+.45},sourceUntil=this.shadowClone.until,at = clonePosition(this.player, this.shadowClone), w = this.glyphWorld(now);
      if (!w.canStand(at.x, at.y)) { this.shadowClone.blockedUntil = now + SHADOW_CLONE.blockedFor * 1000; this.message = "Blocked: you cannot stand where your shadow is."; return false; }
      (this.glyphVisuals ||= []).push({ kind: "arc", x: this.player.x + .5, y: this.player.y + .45, tx: at.x + .5, ty: at.y + .45, color: "#7a5fc0", life: .3, max: .3 });
      this.player.x = at.x; this.player.y = at.y; this.player.invulnerableUntil = Math.max(this.player.invulnerableUntil || 0, now + 150);
      this.recordCastVisual(spell.id,{},'swap',{origin,target:{x:at.x+.5,y:at.y+.45},aim:{x:at.x+.5-origin.x,y:at.y+.45-origin.y},sourceUntil});
      this.shadowClone = null; this.cloneAim = false; this.message = "You step into your shadow."; this.sync(); return true;
    }
    if ((cds[key] || 0) > 0) { this.message = `${spell.name} recovers in ${Math.ceil(cds[key])}s.`; return false; }
    const o = cloneOffset(this.movingNow ? this.player.lastMoveVector : null, this.save.lastAim, SHADOW_CLONE.near); // release 417: right next to you
    this.shadowClone = { ox: o.x, oy: o.y, until: now + spell.lifetime * 1000 }; this.cloneAim = false;
    if (this.castAction) this.shadowClone.charging = { action: this.castAction, start: now, dir: { x: o.x / SHADOW_CLONE.near, y: o.y / SHADOW_CLONE.near } };
    cds[key] = spell.cooldown * this.glyphLoadout("spell", spell.id).mods.cooldown /* release 467 (Codex audit I002): Heavy and Swift count */ * (1 - pairingMods(this.save).cooldown) * (1 - armorGlyphBonus(this.save).spellCooldown);
    {const origin={x:this.player.x+.5,y:this.player.y+.45},at=clonePosition(this.player,this.shadowClone);this.recordCastVisual(spell.id,{},'create',{origin,target:{x:at.x+.5,y:at.y+.45},aim:{x:at.x+.5-origin.x,y:at.y+.45-origin.y},sourceUntil:this.shadowClone.until});}
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
      const d = chargeDistance((now - c.start) / 1000); this.shadowClone.ox = c.dir.x * d; this.shadowClone.oy = c.dir.y * d;
      const v=this.player.castVisual;if(v?.spellKind==='shadow-clone'&&v.variant==='create'&&v.sourceUntil===this.shadowClone.until){const at=clonePosition(this.player,this.shadowClone),target={x:at.x+.5,y:at.y+.45},dx=target.x-v.origin.x,dy=target.y-v.origin.y,m=Math.hypot(dx,dy)||1;this.player.castVisual={...v,target,aim:{...v.aim,x:dx/m,y:dy/m}};}return;
    }
    {const v=this.player.castVisual;if(v?.spellKind==='shadow-clone'&&v.variant==='create'&&v.sourceUntil===this.shadowClone.until){const at=clonePosition(this.player,this.shadowClone),target={x:at.x+.5,y:at.y+.45},dx=target.x-v.origin.x,dy=target.y-v.origin.y,m=Math.hypot(dx,dy)||1;this.player.castVisual={...v,target,aim:{...v.aim,x:dx/m,y:dy/m}};}}
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
    const deep = this.area === "dungeon" && this.map?.deepFloor ? lootBonus(this.map.deepFloor, deepShaft(this.save, this.areaId()).best) : 0; // release 677: deeper loot, only near your deepest floor
    const item = generateItem(`${this.save.seed}:${src}:${n}`, this.save.level + deep);
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
  useUpgradeSphere(kind){const key=kind==='armor'?'armorSphere':'weaponSphere',armor=kind==='armor'?this.save.equipment.armor:null,cap=armor?8:12,now=armor?(armor.power||0):(this.save.weaponLevel||0);if(!(this.save.materials[key]>0)||(kind==='armor'&&!armor))return false;if(now>=cap){this.message=`The ${armor?'armor':'weapon'} is already past what a sphere can add.`;return false}/* release 736 (review F12): a sphere never lowers gear (it capped a +12 weapon at +8) and is kept when it cannot help */this.save.materials[key]--;if(armor)armor.power=now+1;else{this.save.weaponLevel=now+1;this.player.weaponLevel=this.save.weaponLevel}this.message=`${kind==='armor'?'Armor':'Weapon'} sphere fused. The upgrade is permanent.`;this.sync();return true}
  upgradeEquipmentSlot(slot){const result=upgradeEquipment(this.save,slot);this.message=result.message;if(result.ok){syncCharacterStats(this.save);this.player.maxStamina=this.save.maxStamina;this.sync()}return result}
  activateApertureSkill(id = this.save.magicSkills?.selected) {
    const before={x:this.player.x,y:this.player.y,shots:this.projectiles.length,effects:this.effects.length};
    const result = this.activateApertureSkillEffect(id);
    if (result) { const now=this.lastUpdateNow||0;this.player.castUntil=now+ACTION_MOTION.castMs;this.cancelConsumeVisual('cast');this.cancelAttackPresentation(now);this.recordCastVisual(id,before,'activate'); }
    return result;
  }
  activateApertureSkillEffect(id=this.save.magicSkills?.selected){if(this.cursed('spells'))return false;/* release 737: NO SPELLS (Aperture skills too) */if(id==='rift-step'){const ok=riftStep(this,this.lastUpdateNow||0);if(ok)this.riftFlashAt=this.lastUpdateNow||0;return ok}/* release 519: a brief gold flash on the button */if(id==='aerial-step'&&altOn(this.save,'aerial-step')){this.message=`Aerial Step is set to its secondary form, ${ALT_PASSIVES['aerial-step'].name} (Arcanum).`;return false}/* release 359 */const skill=APERTURE_SKILLS[id],rank=skillRank(this.save,id),state=this.save.magicSkills;if(!skill||!rank){this.message='That Aperture skill has not been learned.';return false}if((state.cooldowns[id]||0)>0){this.message=`${skill.name} recovers in ${Math.ceil(state.cooldowns[id])}s.`;return false}state.active={id,rank,remaining:(skill.duration+Math.max(0,rank-1))*skillDurationScale(this.save,id)*(1+armorGlyphBonus(this.save).spellDuration)*skillGlyphMods(this.save,id).duration};state.active.duration=state.active.remaining;/* release 313: the button's buff bar */state.cooldowns[id]=skill.cooldown*(1-pairingMods(this.save).cooldown)*(1-armorGlyphBonus(this.save).spellCooldown)*skillGlyphMods(this.save,id).cooldown;if(id==='aerial-step')state.lastSafe={x:this.player.x,y:this.player.y,area:this.area,areaId:this.areaId()};this.message=`${skill.name} answers for ${state.active.remaining}s.`;this.sync();return true}
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
  consumeLogicalNow(now = this.lastUpdateNow || 0) { return Math.max(0, Math.min(1e12, (this.paused ? this.pauseStarted : now) - (this.presentationPausedMs || 0))); }
  cancelConsumeVisual(reason) {
    this.player.consumeVisual = cancelConsumeVisual(this.player.consumeVisual, reason);
    this.player.cachePickupVisual = cancelCachePickupVisual(this.player.cachePickupVisual, reason);
    if (reason === 'dodge' || reason === 'jump' || reason === 'cast' || reason === 'tool' ||
        reason === 'form-change' || reason === 'equipment-switch' || reason === 'death' || reason === 'knockdown')
      this.retireCleaverChoreography();
  }
  retireCleaverChoreography() {
    const attack = this.player?.attackVisual, cue = attack?.cleaverChoreography;
    if (cue?.v === 1 && !cue.retired) attack.cleaverChoreography = { ...cue, retired: true };
  }
  stampCachePickupVisual(cacheKind, now = this.lastUpdateNow || 0) {
    const p=this.player;
    if (!this.ordinaryCloseViewBody() || this.fallen || this.swimming || (Number.isSafeInteger(p.cachePickupVisual?.v) && p.cachePickupVisual.v > 1)) return;
    const acceptedNow = now > 0 ? now : this.lastUpdateNow > 0 ? this.lastUpdateNow : performance.now();
    const logicalNow=this.consumeLogicalNow(acceptedNow), visualNow=this.paused?this.pauseStarted:acceptedNow, areaId=this.areaId(), levelId=String(this.map?.levelId||'root');
    const busy=visualNow<(this.jumpUntil||0)||visualNow<(p.actionVisualUntil||0)||visualNow<(p.attackUntil||0)||visualNow<(p.castUntil||0)||
      visualNow<(p.dodgeUntil||0)||visualNow<(p.stunnedUntil||0)||visualNow<(p.heldUntil||0)||!!this.fistCharge||!!this.pendingToolUse||!!this.pendingMeleeContact||
      sampleHurtVisual(p.hurtVisual,logicalNow,areaId,levelId)!==null||
      !!sampleConsumeVisual(p.consumeVisual,logicalNow,{area:this.area,areaId,levelId},{})?.active;
    const durationMs=cacheKind === 'chest' ? CHEST_OPEN_VISUAL_MS : cacheKind === 'shovelDig' || cacheKind === 'ironShovelDig' ? SHOVEL_DIG_VISUAL_MS : cacheKind === 'stonePlace' ? STONE_PLACE_VISUAL_MS : CACHE_PICKUP_VISUAL_MS;
    p.cachePickupVisual = { v: 1, kind: 'cachePickup', cacheKind, acceptedLogicalMs: logicalNow, durationMs, areaId, levelId, cancelled: busy, ...(busy?{cancelReason:'busy'}:{}) };
    if (!busy) this.retireCleaverChoreography();
  }
  stampShovelDigVisual(cacheKind, now = this.lastUpdateNow || 0) {
    const logicalNow=this.consumeLogicalNow(now),areaId=this.areaId(),levelId=String(this.map?.levelId||'root');
    // A second immediate dig still changes the world, but cannot steal the body from
    // the first accepted reach. This prevents rapid Act presses from restarting it.
    if(sampleCachePickupVisual(this.player.cachePickupVisual,logicalNow,areaId,levelId)!==null)return false;
    this.stampCachePickupVisual(cacheKind,now);return true;
  }
  stampStonePlacementVisual(now = this.lastUpdateNow || 0) {
    const logicalNow=this.consumeLogicalNow(now),areaId=this.areaId(),levelId=String(this.map?.levelId||'root');
    if(sampleCachePickupVisual(this.player.cachePickupVisual,logicalNow,areaId,levelId)!==null)return false;
    this.stampCachePickupVisual('stonePlace',now);return this.player.cachePickupVisual?.cancelled!==true;
  }
  stampConsumeVisual(itemKind, now) {
    if (Number.isSafeInteger(this.player.consumeVisual?.v) && this.player.consumeVisual.v > 1) return;
    const acceptedNow=now>0?now:this.lastUpdateNow>0?this.lastUpdateNow:performance.now();
    this.player.consumeVisual = { v:1, kind:'drink', itemKind, acceptedLogicalMs:this.consumeLogicalNow(acceptedNow), durationMs:CONSUME_VISUAL_MS, area:this.area, areaId:this.areaId(), levelId:String(this.map?.levelId || 'root'), cancelled:false };
    this._consumeVisualAcceptedHp=this.player.hp;
    const p=this.player,busy=acceptedNow<(this.jumpUntil||0)||this.mechUp()||this.swimming||acceptedNow<(p.actionVisualUntil||0)||acceptedNow<(p.attackUntil||0)||acceptedNow<(p.castUntil||0)||acceptedNow<(p.dodgeUntil||0)||acceptedNow<(p.stunnedUntil||0)||acceptedNow<(p.heldUntil||0)||!!this.fistCharge||!!this.pendingToolUse||!!this.pendingMeleeContact;
    if(busy)this.cancelConsumeVisual('busy');
    else this.retireCleaverChoreography();
  }
  useConsumable(type, now = 0) {
    if (this.cursed("items", now || this.lastUpdateNow || 0)) return false; // release 737: NO ITEMS (potions too)
    const c =
      this.save.consumables ||
      (this.save.consumables = {
        restorativeDraught: 0,
        ironbarkTonic: 0,
        lumenPhial: 0,
      });
    if (type === "submersible" && !aboard(this.save)) return this.toggleMech(); // release 317: ashore, the frame calls up the robot
    if (type === "submersible" && this.save.boat?.mechSub && this.save.mech?.active) return this.toggleSeaPower(); // release 621
    if (type === "submersible" && this.save.boat?.mechSub) { this.message = "The robot's plating gave out: it carries you as a plain submersible until you reach land."; return false; } // release 623
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
      this.player.cachePickupVisual = cancelCachePickupVisual(this.player.cachePickupVisual, 'drink');
      this.stampConsumeVisual(type, now);
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
        const robot = !!ensureBoatState(this.save).mechSubFrom; disembark(this.save, { rx: this.rx, ry: this.ry, x: here.x, y: here.y }); this.placeMooredSkiff();
        Object.assign(p, shore); p.sailVx = p.sailVy = 0;
        if (robot) this.message = "The robot unseals and stands up on the shore."; // release 621: no skiff left behind
        else if (now > (this.sailMessageAt || 0)) { this.sailMessageAt = now + 6000; this.message = "Ashore. The skiff waits at its mooring."; }
        return;
      } else { if (ax) p.sailVx = 0; if (ay) p.sailVy = 0; }
    }
  }

  update(dt, input, now) {
    if (this.passingNote) { this.message = this.passingNote; this.passingNote = null; } // release 569: said after the section's other notes
    if (this.area === "dungeon" && this.map?.skyland) this.tickSkyland(dt); // release 571
    this.lastUpdateNow = now;
    this._hurtVisualWitness = null;
    if (this.paused) return;
    if (this.area === "overworld" && this._pentOfferAt !== `${this.rx},${this.ry}` && (this._pentOfferWait = (this._pentOfferWait || 0) + Math.max(0, Number(dt) || 0)) >= PENTAGON_FINDING.hunts.settle) { this._pentOfferAt = `${this.rx},${this.ry}`; this._pentOfferWait = 0; this.warmPentagonCatchments(); this.offerPentagonHunt(); } // Pentagon finding: once a section has settled (never per frame), warm the catchments the next crossing may ask about and look for a hunt
    this.save.playSeconds = (Number(this.save.playSeconds) || 0) + Math.max(0, Math.min(1, Number(dt) || 0)); // release 379: playtime (paused time is not counted)
    if (this.fallen) { if (this.player.hurtVisual?.v === 1) this.player.hurtVisual = null; this.tickFallen(dt, input, now); return; } // release 329
    reconcileAstralCompanions(this);
    this.syncAstralRiders();
    const p = this.player, hpStart = p.hp;
    if (this.ordinaryCloseViewBody()) this._hurtVisualWitness = false;
    this._consumeVisualAcceptedHp = null;
    this.markWalked(); // DIG_GATES: the floor walked in an interior
    this.riderDown(); this.tickMount(dt); // release 748 (riderDown: never carry a rider lift over a frame)
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
    if (now < (p.heldUntil || 0)) { x = 0; y = 0; if (input.consume("dodge")) { this.clearAttackBuffer(); p.heldUntil -= CRYSTAL.struggle * 1000; if (now >= p.heldUntil) this.message = "You tear free of its grip."; } } // release 249: held by the Psychic Crystal; dodge to struggle
    // Knocked down by a shock (release 257): no movement or actions until the Wayfarer gets back up.
    if (p.shockCount && now - (p.shockAt || 0) > GIANT.shockDecay * 1000) p.shockCount = 0; // the shock counter fades
    if (now < (p.stunnedUntil || 0)) { x = 0; y = 0; this.clearAttackBuffer(); for (const action of ["tool", "spell", "spell2", "dodge", "jump", "potion", "attack", "interact"]) input.consume(action); }
    if (p.hp <= 0) this.clearAttackBuffer();
    if (Math.hypot(x, y) > 0.15)
      this.save.lastAim = projectileDirection(x, y, p.facing);
    if (input.consume("tool")) {
      this._toolInputUpdate=true;
      this.clearAttackBuffer();
      this.save.aimMode = "tool";
      this.save.toolMode = true;
      let toolAccepted=false;const bt = rangedWeapon(this.save.equipment.secondary)?.brawlerTool; if (bt) toolAccepted=this.brawlerTool(bt, now); else { // release 493: Hammerfall and Great Sweep
      const weapon=rangedWeapon(this.save.equipment.secondary),width=mapWidth(this.map,this.area),
        aim=weapon&&(this.lockedDirection()||selectRangedAim(this.player,this.enemies,this.map,width,weapon.speed*weapon.lifetime*(1+characterStats(this.save).attackReach)*AUTO_AIM.rangedScale)); // release 343; 347: a locked target first
      toolAccepted=this.fireSecondary(now, aim || this.save.lastAim, "tool"); // the Aether Orrery charges while Tool is held
    } if(toolAccepted)this.cancelPendingMeleeContact('tool'); }this._toolInputUpdate=false;
    if (this.shadowClone?.charging) this.tickCloneCharge(!!input.held?.(this.shadowClone.charging.action), now); // release 417
    if (this.orbit) this.tickOrbit(dt, now); // release 487: Orbit Volley
    this.tickMirage(dt); // release 649: Mirage of Blades
    tickOrrery(this, dt, now, !!input.held?.(this.orrery?.charge?.action || "tool")); // the Aether Orrery: its shots, halo and charge
    if (this.area === "overworld" && (this.map?.canopy || this.map?.keep)) this.touchCrownRest(); // a great tree's crown, or a keep's
    if (this.area === "dungeon" && this.map?.canyon) this.canyonTick(dt, now); // Canyon craters
    if (this.area === "dungeon" && this.map?.building) { this.noteFloorEntry(); this.labFogTick(); if (now >= this.jumpUntil) this.buildingFall(); } // great buildings: a step into a hole drops you a floor (a safe drop) or is a death (HOLE_DROPS)
    if (this.area === "dungeon" && this.map?.building?.boss && this.enemies.some((e) => e.buildingGuard) && !this.enemies.some((e) => e.pentBoss && !e.dead)) { const B = this.map.building, H = dungeonHistory(this.save, `${B.base}:f1`); if (!(H.pentBosses || []).includes(B.node)) { const name = this.enemies.find((e) => e.pentBoss)?.packName || "Its keeper"; H.pentBosses = [...(H.pentBosses || []), B.node]; this.message = `${name} ${PENTAGON.messages.bossDown}.`; this.defeatNotice = { title: String(name).toUpperCase(), detail: "falls", kind: "discovery" }; } } // the Pentagon's lords and keepers (v2)
    if (this.area === "dungeon" && this.map?.building?.trial && this.enemies.some((e) => e.buildingGuard) && this.enemies.every((e) => !e.buildingGuard || e.dead)) { const B = this.map.building, H = dungeonHistory(this.save, `${B.base}:f1`); if (!(H.pentTrials || []).includes(B.node)) { H.pentTrials = [...(H.pentTrials || []), B.node]; const n = H.pentTrials.length; this.message = `${PENTAGON.messages.trial} (${n} of ${B.trials}).${n >= B.trials ? " Somewhere at the centre, the Heart unseals." : ""}`; this.defeatNotice = { title: "A TRIAL CLEARED", detail: `${n} of ${B.trials}`, kind: "discovery" }; } } // the Pentagon's trials
    if (this.rite) this.riteTick(dt, now); // the Rite of Ascendancy
    if (this.treeRise) { if (this.area === "overworld") this.tickTreeRise(now); else this.treeRise = null; }
    this.tickFractured(now); // release 651: Fractured mode
    if (this.area === "overworld") this.mothHarass(); // release 708
    this.frenzyTick(dt); // release 710
    this.beastPlay(dt, now); // release 714
    this.folkTick(dt, now); // release 720: the folk realms
    this.domainTick(dt); // release 723: a domain's beast comes home
    this.hauntTick(dt, now); // release 731: the haunts split and pour together
    this.roofStep(dt); // the Pentagon roofs' dwellers wake, pursue and go back to sleep
    this.curseTick(now); // release 737: haunt curses wear off
    this.gloomTick(now); // the Gloomvast: a fallen one's Dark ends, spent decoys go
    if (this.affixHazards?.length || this.enemies.some((e) => !e.dead && (e.affixes || e.auraBy || e.wardBy))) { const p = this.player, es = eliteStateInPlace(this.save).status; // release 657: affixes, auras, shamans
      tickAffixes(this, dt, now, (n) => { if (p.hp <= 0 || now < (p.invulnerableUntil || 0) || now < (p.dodgeUntil || 0)) return; p.hp -= Math.max(1, Math.ceil(n * (1 - Math.min(.75, characterStats(this.save).damageReduction)) * hurtScale(this.save))); p.invulnerableUntil = now + 350; }, (d, dps) => { if (now >= (p.dodgeUntil || 0)) applyPoison(es, d, dps); }); }
    if (this.playerFire) { const f = this.playerFire, p = this.player; f.left -= dt; f.tick -= dt; if (f.tick <= 0 && f.left > -dt && p.hp > 0) { f.tick += 1; p.hp = Math.max(0, p.hp - Math.max(1, Math.ceil(f.dps * (1 - Math.min(.75, characterStats(this.save).damageReduction)) * hurtScale(this.save)))); } if (f.left <= 0 || this.swimming) this.playerFire = null; } // release 708: burning (water puts it out)
    if (this.enemies.some((e) => e.kitRole && !e.dead) || this.enemies.some((e) => e.kitAddOf && !e.dead)) tickBossKit(this, dt, now, (e, n) => this.spawnKitAdds(e, n, now)); // release 668
    if (this.golem) this.tickGolem(now); // release 535: Corridor Golem
    if (this.fistCharge) { const held = (now - this.fistCharge.start) / 1000; if (!input.held?.(this.fistCharge.action) || held > IRON_FISTS.tapGrace + IRON_FISTS.chargeTime + 1) { const c = this.fistCharge,wait=this.startupGuardWait(now),waiting=Number.isFinite(wait)&&wait<=ACTION_MOTION.attackBufferMs;this.fistCharge=null;if(waiting)this.fistReleaseIntent={step:c.step||1,charge:fistCharge(held),direction:c.direction,expiresAt:now+ACTION_MOTION.attackBufferMs};else{this._fistInputUpdate=true;try{this.fistPunch(c.step||1,fistCharge(held),now,c.direction);}finally{this._fistInputUpdate=false;}} } } // release 483; 489; 493: the Iron Fists dash punch strikes when its button is let go
    if (input.consume("spell")) { this.clearAttackBuffer(); this.castSlot("a"); }
    if (input.consume("spell2")) { this.clearAttackBuffer(); this.castSlot("b"); }
    const dodgePressed = input.consume("dodge"); if (dodgePressed) this.clearAttackBuffer();
    if (dodgePressed && !this.cursed("dodge", now)) { // release 737: NO DODGE
      const lockedForDodge = this.lockedTarget?.(), lockDx = lockedForDodge && !lockedForDodge.dead && !lockedForDodge.hidden && !lockedForDodge.untargetable ? lockedForDodge.x - p.x : 0, lockDy = lockedForDodge && !lockedForDodge.dead && !lockedForDodge.hidden && !lockedForDodge.untargetable ? lockedForDodge.y - p.y : 0;
      const cardinal = p.facing === "right" ? 0 : p.facing === "down" ? Math.PI / 2 : p.facing === "left" ? Math.PI : -Math.PI / 2;
      const facingYaw = Math.hypot(lockDx, lockDy) > .01 ? Math.atan2(lockDy, lockDx) : cardinal;
      const mired = stagMireAt(this.packEffects, p.x, p.y), r = dodge(p, now, x, y, dodgeCost(this.save) * (mired ? STAG.mire.dodgeCost : 1)); if (r.ok) { this.cancelPendingMeleeContact('dodge'); p.dodgeMired = mired; tesseractHarm(this.save, p, armorGlyphBonus(this.save).dodgeHarm); /* a Tesseract's cost: health per dodge */ } // release 708: the Briar Stag's mire
      if (r.ok && TREE_FOOTING.dodgeAxes === 4 && this.area === "overworld" && this.map?.canopy && !this.droneLift && (this.skyAir != null || tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y)?.canopy)) { // great-tree footing: on a branch a dodge goes along an axis
        const ax = Math.abs(p.dodgeX) >= Math.abs(p.dodgeY); p.dodgeX = ax ? Math.sign(p.dodgeX) || 1 : 0; p.dodgeY = ax ? 0 : Math.sign(p.dodgeY) || 1; p.lastMoveVector = { x: p.dodgeX, y: p.dodgeY };
      }
      if (r.ok) { const logicalNow=now-(this.presentationPausedMs||0),prior=recentHeroPresentation(p,logicalNow,p.x,p.y),canonicalYaw=(yaw)=>Math.atan2(Math.sin(yaw),Math.cos(yaw));p.dodgeVisual = prior ? { facingYaw: canonicalYaw(prior.yaw), gaitPhase: prior.gaitPhase, moving: prior.speed > .01, speed: prior.speed, poseMs: prior.now } : { facingYaw: canonicalYaw(facingYaw), gaitPhase: (Number(p.walkPhase) || 0) * Math.PI, moving: Math.hypot(Number(x) || 0, Number(y) || 0) > .15, speed: Math.hypot(Number(x) || 0, Number(y) || 0) > .15 ? 2.4 : 0, poseMs: Math.max(0,logicalNow) }; }
      if (!r.ok && mired) { if (now >= (p.invulnerableUntil || 0)) { p.hp = Math.max(0, p.hp - Math.max(1, Math.ceil((this.save.maxHp || p.maxHp || 100) * STAG.mire.exhaustedShare))); p.invulnerableUntil = now + 200; } this.message = "The mire drags at you, and you have nothing left to pull free with."; } // release 708 (Tim: "if you dodge while you have zero stamina in the mire, then you take damage")
      else if (!r.ok) this.message = "Not enough stamina to dodge.";
      else { this.cancelConsumeVisual('dodge'); echoEvent(this, "dodge", now); onConstellationDodge(this); if (fieldOn(this.save, "drift-field")) { const q = this.player, cx = q.x + .5, cy = q.y + .45, f = this.ownSpellFx(true).filter((e) => Math.hypot(e.x - cx, e.y - cy) <= FIELD_PASSIVES["drift-field"].reach).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]; if (f) this.driftField = { id: f.id, at: q.dodgeUntil || now }; } /* release 515: Drift Field */ if (this.area === "dungeon" && runHas(this.save, this.areaId(), "shadowStep") && !this.shadowCloneActive(now)) { const o = cloneOffset({ x: Number(x) || p.lastMoveVector?.x || 0, y: Number(y) || p.lastMoveVector?.y || 1 }, this.save.lastAim, SHADOW_STEP.behind); this.shadowClone = { ox: o.x, oy: o.y, until: now + SHADOW_STEP.seconds * 1000, marginalia: true }; } /* release 461: Shadow Step */ if (this.area === "dungeon" && runHas(this.save, this.areaId(), "emberWake")) this.dodgeBurst(p.x + .5, p.y + .45, EMBER_WAKE.radius, EMBER_WAKE.base + EMBER_WAKE.perLevel * (Number(this.save.level) || 1), now); /* release 459; 481: dodgeBurst */ if (this.area === "overworld" && aboard(this.save) && submersible(this.save)) { this.subDiveUntil = now + BOAT.sub.dive * 1000; p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, this.subDiveUntil); } } // release 311: aboard a submersible a dodge is a dive
    }
    if (input.consume("jump")) {
      // Release 641 (Tim: "you should be able to deploy, and I guess stow, the glider in the air by hitting the jump button"):
      // falling or gliding, Jump opens or folds the glider; mid-jump, high enough over what is below, it opens one.
      const width0 = mapWidth(this.map, this.area), below = elevationAt(this.map, width0, this.player.x, this.player.y), high = Math.max(this.skyAir ?? 0, this.jumpFrom ?? 0);
      if (this.glide && this.area === "overworld") { const g = this.glide; g.open = !g.open; if (!g.open) g.fallFrom = g.z; this.message = g.open ? GLIDE.open : GLIDE.shut; }
      else if (now < this.jumpUntil && this.save.glider && this.area === "overworld" && !this.mechUp() && !this.droneUp() && high - below >= GLIDE.minDrop) { this.glide = { z: high, vx: 0, vy: 0, open: true, told: false }; this.glideHome = this.treeGlideHome(high); this.skyAir = null; this.message = GLIDE.open; }
      else if (now < this.jumpUntil && this.droneLiftAllowed() && this.droneUp() && !this.droneLift) { const m = this.save.mech; if (!(m.fuel > 0)) this.message = DRONE_LIFT.none; else { const z = Math.max(high, below); this.droneLift = { base: Math.max(this.jumpFrom ?? below, below), z, vz: 0 }; this.mechSpent = false; this.message = DRONE_LIFT.engage; } } // release 647: the drone's booster
      else if (now < this.jumpUntil) { if (!this.droneLift) this.message = "Already airborne."; }
      else if (this.cursed("jump", now)) { /* release 737: NO JUMP (the glider and the booster still answer in the air) */ }
      else {
        this.jumpFrom = elevationAt(this.map, width0, p.x, p.y);
        const highPlatform = this.area === "overworld" && (this.skyLevel > 0 || tileUnder(this.map, width0, p.x, p.y)?.skyPlatform);
        this.jumpDur = (highPlatform ? JUMP.sky : JUMP.base) + skillRank(this.save, "quickening") * JUMP.quickening;
        const mount = this.mountRide();
        if (mount) this.jumpDur *= MOUNT_BEASTS[mount.beast].jump;
        this.jumpStart = now;
        this.jumpUntil = now + this.jumpDur;
        this.cancelConsumeVisual('jump');
        this.cancelAttackPresentation(now);
        cancelCastVisual(p);
      }
    }
    { const m = this.save.mech; this.mechBoosting = false; // release 317: in the robot, hold Jump in the air to boost
      if (!input.held?.("jump")) this.mechSpent = false; // release 319: an emptied boost needs Jump let go before it fires again
      if (this.droneLift) this.droneLiftStep(dt, now, input.held?.("jump") === true); // release 647
      else if ((this.mechUp() || (this.droneUp() && !this.droneLiftAllowed())) && !this.mechSpent && input.held?.("jump") && now < (this.jumpUntil || 0) + 60 && m.fuel > 0) { /* release 647: on the overworld the drone lifts instead (droneLiftStep) */ /* release 321: the drone carries the same way */ m.fuel = Math.max(0, m.fuel - dt); this.jumpUntil = Math.max(this.jumpUntil || 0, now + 140); this.mechBoosting = true; if (m.fuel <= 0) this.mechSpent = true; }
      const ticked = m?.built ? tickMech(this.save, dt, !(now < (this.jumpUntil || 0))) : null; if (ticked === "spent") this.message = "Out of cinder iron: the robot drops back to its plain stride."; else if (ticked === "replated") this.message = "The robot's plating is whole again."; /* release 383 */ if (this.droneUp()) this.tickDrone(dt, now); }
    if (input.consume("potion")) this.drinkPotion(now); // release 339: the chosen potion tier; 341: brewed when needed
    if (input.consume("preset")) { this.cancelPendingMeleeContact('equipment-switch'); this.cancelConsumeVisual('equipment-switch'); this.message = swapPreset(this.save).message; this.refreshDerivedStats(); } /* release 541: preset armor changes the maxima */ // release 261: swap spell presets 1 and 2; 393: with the whole build
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
    if (!dodging && now < (p.confusedUntil || 0)) { x = -x; y = -y; } // release 731: confused by a haunt, forward is back
    this.stagMireMoving = dodging || Math.hypot(x, y) > .15; // release 708
    if (dodging) {
      x = p.dodgeX;
      y = p.dodgeY;
    }
    if (TREE_FOOTING.straightHop && this.area === "overworld" && this.map?.canopy && !this.droneLift && this.skyAir != null && now < (this.jumpUntil || 0)) { // release 759: never under the drone's booster (it flies where the stick points) // great-tree footing: a sky hop flies straight over the gap
      const u = tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y);
      if (u && !u.canopy && (u.elev || 0) <= this.skyAir - TREE_FOOTING.gapBelow) { if (Math.abs(x) >= Math.abs(y)) y = 0; else x = 0; }
    }
    const swimming = this.swimsHere(footprintHazard(this.map, mapWidth(this.map, this.area), p.x, p.y)), underfoot = this.map.landscape ? tileUnder(this.map, mapWidth(this.map, this.area), p.x, p.y)?.kind : null;
    const sailing = this.area === "overworld" && aboard(this.save);
    let speed = (dodging ? 4.8 : 2.4) * (1 + characterStats(this.save).moveSpeed) * (!dodging && now < (p.slowUntil || 0) ? (p.slowFactor || .5) : 1) * (this.map.underwater ? DIVE.speed : 1) * (sailing ? BOAT.speed : swimming ? (this.mechUp() ? MECH_WATER.speed : TIDEMANTLE.speed) : dodging ? (p.dodgeMired ? STAG.mire.dodgeSpeed : 1) : mireSpeed(underfoot)) * (!dodging && !sailing && !swimming && this.mountRide() ? MOUNT_BEASTS[this.mountRide().beast].speed : 1), // release 748: riding (dodges unchanged)
      dx = x * speed * dt,
      dy = y * speed * dt;
    // Sailing has momentum: velocity eases toward the stick; a dodge is an oar burst.
    if (sailing) { p.sailVx = dodging ? x * speed : steer(p.sailVx || 0, x * speed, dt); p.sailVy = dodging ? y * speed : steer(p.sailVy || 0, y * speed, dt); dx = p.sailVx * dt; dy = p.sailVy * dt; }
    const ps = Number(this.save.playSeconds) || 0, raft = this.map?.movers?.length ? platformUnder(this.map, p.x, p.y, ps - dt) : null,
      carrier = raft ? { raft, old: platformPos(raft, ps - dt), current: platformPos(raft, ps) } : null,
      carried = carrier ? { x: carrier.current.x - carrier.old.x, y: carrier.current.y - carrier.old.y } : { x: 0, y: 0 }; // release 613: a raft carries whoever stands on it
    dx += carried.x; dy += carried.y;
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
    // Release 635: gliding down from a great tree moves the Wayfarer itself; the step below then sees no movement and no ground.
    const gliding = !!this.glide && this.area === "overworld";
    if (gliding) { if (this.glideStep(x, y, dt, now) === "crossed") return; nx = p.x; ny = p.y; dx = 0; dy = 0; }
    { const h = this.edgeHold; if (h && this.edgeHeld(h.dx, h.dy, now)) { if (h.dx < 0) nx = Math.max(nx, 0); else if (h.dx > 0) nx = Math.min(nx, SECTION_SIZE - .78 - 1e-3); else if (h.dy < 0) ny = Math.max(ny, 0); else ny = Math.min(ny, SECTION_SIZE - .9 - 1e-3); } } // perf pack (P6): the edge just crossed holds for a moment
    const groundedMotion = !sailing && !gliding ? this.planGroundedPlayerMove(nx - p.x, ny - p.y, mapWidth(this.map, this.area), now, carrier) : null;
    if (groundedMotion) { nx = groundedMotion.endX; ny = groundedMotion.endY; }
    if ((sailing || (this.area === "overworld" && this.wading())) && (nx < 0 || ny < 0 || nx + .76 >= SECTION_SIZE - .02 || ny + .88 >= SECTION_SIZE - .02)) { /* release 507: the robot wading crosses anywhere, like a skiff */
      this.transitionSection(nx < 0 ? -1 : nx + .76 >= SECTION_SIZE - .02 ? 1 : 0, nx < 0 || nx + .76 >= SECTION_SIZE - .02 ? 0 : ny < 0 ? -1 : 1);
      return;
    }
    if (this.area === "overworld") {
      const exits = this.map.exits,
        near = (value, opening) => Math.abs(value - opening) <= 1.45,
        seam = (sx, sy) => !!this.map.pentagon && this.pentagonSeam(p, sx, sy), // WG-03: a Pentagon's courts cross its seams where you stand
        west = nx < 0 && (near(p.y, exits.west) || seam(-1, 0)),
        east = nx + 0.76 >= SECTION_SIZE - 0.02 && (near(p.y, exits.east) || seam(1, 0)),
        north = ny < 0 && (near(p.x, exits.north) || seam(0, -1)),
        south = ny + 0.88 >= SECTION_SIZE - 0.02 && (near(p.x, exits.south) || seam(0, 1));
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
    if (this.droneLift && this.area === "overworld") { const zone = droneForbiddenAt(this.map, width, nx, ny); if (zone) this.droneFizzle(zone, now); } // the drone fizzle: the lift ends here, and the step below lands it
    let terrainHazard=gliding||this.mountLeap(now)?null:this.hazardWhereMoved(p,dx,dy,nx,ny,width,now);/* release 748: a mount's leap carries over the chasm; where it lands is checked */const raftNow=this.map?.movers?.length?platformUnder(this.map,nx,ny,ps):null,raftWasZ=raft?platformPos(raft,ps-dt).z:0;this.raftZ=raftNow?platformPos(raftNow,ps).z:0;if(terrainHazard&&raftNow)terrainHazard=null;/* release 613: on a raft over the drop */
    // Release 615: stepping off a raft below the level is a step into nothing; off one above it, a fall by its height.
    if(raft&&!raftNow&&raftWasZ< -.5){terrainHazard=terrainHazard||"abyss";this.message="Below the level there is nothing to step onto.";}
    else if(raft&&!raftNow&&raftWasZ>.5&&!terrainHazard){const hurt=fallDamage(Math.round(raftWasZ),this.save.maxHp);if(hurt===Infinity){p.hp=0;this._fatalFallPending=true;}else if(hurt>0){p.hp=Math.max(0,p.hp-hurt);this.message=`You drop ${Math.round(raftWasZ)} level${Math.round(raftWasZ)>1?"s":""} off the raft.`;}}const aerial=this.save.magicSkills?.active?.id==='aerial-step'&&this.save.magicSkills.active.remaining>0||this.mechBoosting===true||(this.area==='dungeon'&&interiorTerrain(this.map)&&!!this.droneLift);/* release 317: the robot's boost carries over hazards */
    // Pits, lava and deep water are lethal to walk into (operator, release 101: the r97 brink guard is removed; rims,
    // fog hatching and level marks keep them readable instead).
    // Release 102: the Tidemantle lets the Wayfarer swim on surface water (stage one of the water traversal plan).
    if(terrainHazard==="lava"&&this.mechUp())terrainHazard=null;/* release 475: the robot wades through lava; the heat is settled at the frame's end */
    if(terrainHazard==="lava"&&this.mountRide())terrainHazard=null;/* mounted lava (Tim, 2026-11-04): "if you go into lava, it's not an instant kill, it's like a two-second kill"; the burn is settled at the frame's end (MOUNT_RIDE.lavaSeconds) */
    if(sailing){terrainHazard=null;this.swimming=false}else if(this.robotPutsToSea(nx,ny,width,terrainHazard))terrainHazard=null;else if(this.swimsHere(terrainHazard)){this.swimKind=terrainHazard;if(!this.swimming){this.swimming=true;if(now>(this.swimMessageAt||0)){this.swimMessageAt=now+8000;this.message=this.mechUp()?"The robot seals and wades on through the water.":"The Tidemantle holds you up. Swimming drains stamina.";}}terrainHazard=null}else this.swimming=false;
    const fellIntoHazard=!!terrainHazard&&!aerial;if(fellIntoHazard&&this.area==="dungeon"&&this.map?.building?.roomMaze&&!this.save.session.holeDeath){this.noteFloorEntry();const e=this.save.session.floorEntry;this.save.session.holeDeath={id:e.id,x:e.x,y:e.y};}/* ROOM_MAZES: lava in a room maze wakes you where you came onto the floor, as a hole does */this._fatalFall=!!this._fatalFallPending;this._fatalFallPending=false;/* release 609; 615: a raft drop */
    if (this.glideHome && !gliding && !this.glide && p.hp > 0 && !fellIntoHazard && !this._fatalFall) this.glideHome = null; // TREE_GLIDE.home: the first frame stood on (or swum in) alive after a glide from the crown ends it
    if(fellIntoHazard){p.hp=0;this.message=terrainHazard==="lava"?"The caldera swallows the Wayfarer.":terrainHazard==="abyss"?"The Wayfarer falls into the sunless chasm.":DEEP_WATER.includes(terrainHazard)?"The deep water drags the Wayfarer under.":terrainHazard==="canyon"?(tileUnder(this.map,width,nx,ny)?.chasm?(this.fellStars=true,"The Wayfarer steps off the edge and falls away into the stars."):"The ledge gives way beneath the Wayfarer."):"The water closes over the Wayfarer."}
    else if (sailing) this.sail(p, dx, dy, width, now);
    else {
      p.isPlayer = true; p.jumping = now < (this.jumpUntil || 0); p.voidSuit = this.mechUp() && this.area !== "dungeon"; /* 511: never through dungeon walls */ // release 509: only the robot steps into a star-void
      const before = elevationAt(this.map, width, p.x, p.y), fromX = p.x, fromY = p.y;
      // Release 585 (the skyway climb): a jump from a sky platform keeps its height over the gap below until it ends, so the
      // next platform (one level up at most) can be reached; a jump that ends over the gap falls from that height.
      const skyFrom = tileUnder(this.map, width, p.x, p.y);
      if (skyFrom?.kind === "canopyTrunk") this.lastCrownAt = now; // release 637: the glider opens only from the crown
      if (skyFrom?.kind === "canopyTrunk" && !this.save.glider) { this.save.glider = true; this.message = GLIDE.found; journalOnce(this.save, "glider:found", GLIDE.found, "The Great Trees"); } // release 635
      if (p.jumping && (skyFrom?.skyPlatform || (interiorTerrain(this.map) && skyFrom?.interiorPlatform))) { this.skyAir = Math.max(this.skyAir ?? -1, skyFrom.elev || 0); this.skyAirScale = tileLiftScale(skyFrom); } // skyAirScale: the launching platform's drawn scale, so the hop is drawn at its height over the gap (renderer.ts)
      p.airElev = p.jumping && this.skyAir != null ? this.skyAir : undefined;
      let fallStart = this.skyAir != null ? Math.max(before, this.skyAir) : before, drop = 0, hurt = 0;
      const finishFall = (height) => {
        const raw0 = fallStart - height; if (this.save.glider && !this.glide && raw0 >= GLIDE.minDrop && this.area === "overworld" && !this.mechUp() && !this.liftDrop) { /* release 669: a long fall is a freefall with the drone out too (the drone has Jump in a jump; the glider in a freefall); a drop off your own booster is a fall */ this.glide = { z: fallStart, vx: 0, vy: 0, open: false, fallFrom: fallStart, told: false }; this.glideHome = this.treeGlideHome(fallStart); this.message = GLIDE.falling; return; } // release 641: a long fall is a freefall: Jump opens the glider // release 635: the glider opens
        const distance = raw0, damage = fallDamage(distance, this.save.maxHp); // release 637: off the great tree a fall is a fall
        if (damage > 0) { hurt += damage; drop = Math.max(drop, distance); }
      };
      // Evaluate the actual X-then-Y substeps, not just frame endpoints: a diagonal can enter and
      // leave a scar in one frame. A safe scar edge ends one ordinary fall segment; it must not
      // erase a real ordinary cliff crossed before or after it. Non-scar movement keeps its net-drop rule.
      const movedStep = (ax, ay, bx, by) => {
        if (this.droneLift && interiorTerrain(this.map) && Math.max(this.droneLift.z,elevationAt(this.map,width,bx,by)) > this.interiorLiftCeiling(bx,by) + 1e-6) { p.x=ax; p.y=ay; this.droneLift.vz=Math.min(0,this.droneLift.vz); return; }
        if (safeVoidScarTransition(tileUnder(this.map, width, ax, ay), tileUnder(this.map, width, bx, by))) {
          finishFall(elevationAt(this.map, width, ax, ay));
          fallStart = elevationAt(this.map, width, bx, by);
        }
      };
      if (groundedMotion) {
        for (let i = 0; i < groundedMotion.count; i += 4) {
          const trace = groundedMotion.trace;
          p.x = trace[i + 2]; p.y = trace[i + 3];
          movedStep(trace[i], trace[i + 1], trace[i + 2], trace[i + 3]);
        }
      } else moveAxis(p, dx, dy, this.map, width, true, movedStep);
      if (this.area === "dungeon" && this.map.canyon) this.drillAhead(x, y, dt, now); // Canyon craters: push into a clod to drill it
      const landed = elevationAt(this.map, width, p.x, p.y);
      if(interiorTerrain(this.map) && this.droneLift) {
        const L=this.droneLift;
        if(landed>L.z && landed<=L.z+1+1e-6) { L.z=landed; L.vz=Math.max(0,L.vz); this.skyAir=landed; }
      }
      if(interiorTerrain(this.map) && JUMP.landOnArrival && p.jumping && this.skyAir!=null && !this.droneLift && !this.mechBoosting) {
        const u=tileUnder(this.map,width,p.x,p.y);
        if(!u?.interiorPlatform && landed<this.skyAir-1e-6)this.skyHopGap=true;
        else if(this.skyHopGap && u?.interiorPlatform && landed>=this.skyAir && landed<=this.skyAir+1) {this.jumpUntil=now;p.jumping=false;}
      }
      // Release 759 (pre-publish review of 758): a sky hop lands on the first footing past the gap, at its height or one level up, so a stick
      // held to the end of the hop no longer carries the Wayfarer past the platform it reached (the longer JUMP.sky stays for soft thumbs).
      if (JUMP.landOnArrival && p.jumping && this.skyAir != null && this.area === "overworld" && !this.droneLift && !this.glide && !this.mechBoosting) {
        const u = tileUnder(this.map, width, p.x, p.y);
        if (u && !u.skyPlatform && landed <= this.skyAir - TREE_FOOTING.gapBelow) this.skyHopGap = true;
        else if (this.skyHopGap && u?.skyPlatform && landed >= this.skyAir && landed <= this.skyAir + 1) { this.jumpUntil = now; p.jumping = false; }
      }
      if (!p.jumping) this.skyHopGap = false;
      if (p.jumping && this.skyAir != null && landed < this.skyAir) hurt = 0; // still in the air over a skyway gap
      else finishFall(landed);
      // TREE_GLIDE.home.reached (Decision 13): is the ground stood on this section's great crown? (a grove's lesser crown is not)
      // Read once the frame's fall is settled, on the ground only: a jump or lift in the air, or a freefall begun this frame, keeps
      // the footing it left from. Allocated only when it changes.
      if (!p.jumping && !this.glide && !this.droneLift) { const u = tileUnder(this.map, width, p.x, p.y), top = this.area === "overworld" && u?.kind === "canopyTrunk" && this.map.canopy?.top && u.elev === this.map.canopy.top, f = this.crownFoot;
        if (!top) this.crownFoot = null; else if (!f || f.rx !== this.rx || f.ry !== this.ry) this.crownFoot = { rx: this.rx, ry: this.ry }; }
      if (!p.jumping) { this.skyAir = null; this.liftDrop = false; } p.airElev = undefined;
      // Traversal cue: pushing against a ledge explains what it takes (operator ask 2026-10-14: climbing was confusing).
      if (!gliding && this.map.landscape && Math.hypot(x, y) > .4 && Math.hypot(p.x - fromX, p.y - fromY) < Math.hypot(dx, dy) * .3) {
        const here = tileUnder(this.map, width, p.x, p.y), ahead = tileUnder(this.map, width, p.x + x * .6, p.y + y * .6), up = (ahead?.elev || 0) - (here?.elev || 0);
        if (ahead && here && !ahead.blocked && !ahead.slope && !here.slope && up >= 1) {
          this.ledgeHint = { x: ahead.x, y: ahead.y, kind: up === 1 ? "climb" : "tooHigh", until: now + 1500 };
          if (now > (this.ledgeMessageAt || 0)) { this.ledgeMessageAt = now + 5000; this.message = up === 1 ? "Ledge: press JUMP while moving to climb it." : `Too high to climb (${up} levels). Find stairs or a slope.`; }
        }
      }
      if (this.map.skyDiscs) { // release 587: the floating discs of a skyway, a layer above the ground
        const fx = p.x + .5, fy = p.y + .75, from = this.skyLevel || 0;
        if (p.jumping) { this.discAir = Math.max(this.discAir ?? -1, from); // release 759: a disc hop lands on the first disc past the gap (JUMP.landOnArrival)
          if (JUMP.landOnArrival && !this.droneLift && !this.glide && !this.mechBoosting) { const at = discAt(this.map, fx, fy, { maxLevel: this.discAir + 1 }); if (!(at && at.level >= this.discAir)) this.discHopGap = true; else if (this.discHopGap) { this.jumpUntil = now; p.jumping = false; } }
        }
        if (!p.jumping) { this.discHopGap = false;
          const landed = this.discAir != null, launch = landed ? this.discAir : from; this.discAir = null;
          const d = landed ? discAt(this.map, fx, fy, { maxLevel: launch + 1 }) : from > 0 ? (discAt(this.map, fx, fy, { level: from }) || discAt(this.map, fx, fy, { below: from })) : null;
          const to = d ? d.level : 0, fell = launch - to; this.skyLevel = to;
          if (fell > 0) { const damage = fallDamage(fell, this.save.maxHp); if (damage > 0) { hurt = hurt === Infinity ? hurt : hurt + damage; drop = Math.max(drop, fell); } }
        }
      }
      const fizzled = this.droneFizzleFx?.at === now ? `${this.message} ` : ""; // the drone fizzle's why stays in front of the fall
      if (hurt === Infinity) { p.hp = 0; this._fatalFall = true; this.message = `${fizzled}The Wayfarer falls ${drop} levels.`; }
      else if (hurt > 0) { p.hp = Math.max(1, p.hp - hurt); p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, now + 400); this.message = `${fizzled}A hard landing: ${drop} levels down.`; }
    }
    if(!fellIntoHazard&&!terrainHazard&&aerial)this.save.magicSkills.lastSafe={x:p.x,y:p.y,area:this.area,areaId:this.areaId()};
    if(!fellIntoHazard&&this.area==="dungeon")this.updateDungeonDiscovery();
    const hpBeforeShelterHazard=p.hp;
    if(!fellIntoHazard&&this.area==='overworld'){
      const insideId=structureOccupancy(this.map.tiles,width,p.x,p.y);
      if(insideId){const trap=!this.rite&&/* RITE_LOCKDOWN: a hidden Folded Seam stays shut while a rite burns */this.map.objects.find(o=>o.kind==='displacementTrap'&&o.shelterId===insideId&&o.state!=='used'&&!this.save.worldFlags[`displacement-trigger:${this.rx},${this.ry}:${o.id}`]&&Math.hypot(o.x+.5-(p.x+.5),o.y+.5-(p.y+.7))<.55);if(trap){this.startDisplacement(trap,true);return}const hazard=this.map.objects.find(o=>o.kind==='shelterHazard'&&o.shelterId===insideId&&o.state==='armed'&&!this.save.worldFlags[`shelter-hazard:${this.rx},${this.ry}:${o.id}`]&&Math.hypot(o.x+.5-(p.x+.5),o.y+.5-(p.y+.7))<.6);if(hazard){const key=`shelter-hazard:${this.rx},${this.ry}:${hazard.id}`;this.save.worldFlags[key]=true;hazard.state='spent';p.hp=Math.max(1,p.hp-(hazard.damage||10));this.message=`${hazard.name} erupts. ${hazard.damage||10} damage — the mechanism falls quiet.`;if(hazard.hazardType==='toxicVent'){applyStrongPoison(eliteStateInPlace(this.save).status,this.save.maxHp);this.message=`${hazard.name} erupts. ${hazard.damage||10} damage and strong poison — a Clearroot Ampoule ends it.`}journalOnce(this.save,`shelter-hazard:${hazard.hazardType}`,`Shelters may conceal ${hazard.name.toLowerCase()} mechanisms. Their floor marks can be inspected, avoided, and remembered.`,'Shelter hazards');this.sync()}}
    }
    if(p.hp<hpBeforeShelterHazard)this.cancelConsumeVisual('hurt');
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
    if(p.hp<=0){this.cancelConsumeVisual('death');this.cancelPendingToolUse('death');this.cancelPendingMeleeContact('death');this.clearHammerfallStartup('death');}else{this.reconcileHammerfallStartup();this.releasePendingToolUse(now);this.releasePendingMeleeContact(now);}
    if(!this.toolUseBlocksPrimary()&&this.fistReleaseIntent){const intent=this.fistReleaseIntent;this.fistReleaseIntent=null;if(p.hp>0&&now<=intent.expiresAt&&this.fistsEquipped()&&!this.cursed('attack',now)&&!this.penned(now)){this._fistInputUpdate=true;try{this.fistPunch(intent.step,intent.charge,now,intent.direction);}finally{this._fistInputUpdate=false;}}}
    this.tickAttackBuffer(now,input);
    if (!fellIntoHazard&&input.consume("attack")) {
      this.save.aimMode = "attack";
      this.save.toolMode = false;
      const ready = this.player.attackReadyAt || 0,guardWait=this.startupGuardWait(now),startupWait=Number.isFinite(guardWait)?Math.max(now+guardWait,ready,this.fistsEquipped()?this.fistRecoverUntil||0:0)-now:Infinity, canStartupBuffer=startupWait>=0&&startupWait<=ACTION_MOTION.attackBufferMs&&this.closeViewActionEligible()&&this.save.activeWeaponSlot!=='secondary'&&!this.cursed('attack',now)&&!this.penned(now),canBuffer = this.closeViewAttackBufferEligible(now);
      if(canStartupBuffer){this.attackBufferUntil=now+ACTION_MOTION.attackBufferMs;this.attackBufferToolUse=true;}
      else if (canBuffer && now < ready && ready - now <= ACTION_MOTION.attackBufferMs) this.attackBufferUntil = now + ACTION_MOTION.attackBufferMs;
      else { this.clearAttackBuffer(); this.attackAction = "attack"; try { this.primaryAttack(now); } finally { this.attackAction = null; } } // release 493: the Iron Fists charge while Attack is held
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
    this.riderUp(); // release 748: hostile shots, blasts and auras meet the rider where drawn
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
      (shot)=>{this.clusterShell(shot);return this.effects.push({id:"blast-"+shot.id,kind:shot.hostile?"enemy-blast":"rift-blast",x:shot.x,y:shot.y,life:.32,radius:shot.blastRadius||2,untilPulse:0,pulse:99,damage:shot.damage,hostile:!!shot.hostile,hits:{},...(!shot.hostile&&shot.glyphHost?{glyphHost:shot.glyphHost}:{})/* release 467 (Codex audit I001): the Bombard's blast keeps its tool glyphs, once per foe */,...(shot.toolUseNewborn?{toolUseNewborn:true}:{}),...(shot.glyphSpell?{glyphSpell:shot.glyphSpell}:{}),...(shot.fireBomb?{fireBurst:true}:{})/* release 547: Fire Burst's own glyphs and its flame */})},
      p,
      (shot)=>{
        const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;
        if(shot.jumpable&&now<this.jumpUntil)return;
        if(safe||now<=(p.invulnerableUntil||0))return;
        if(enclosureShields(this,{x:shot.x-(Number(shot.dx)||0)*.8,y:shot.y-(Number(shot.dy)||0)*.8}))return; // release 696: the enclosure's walls stop it
        p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?shot.damage*.65:shot.damage)*(1-Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0)))*hurtScale(this.save)));
        if (shot.hostile) this.noteHurtVisualImpact();
        p.invulnerableUntil=now+700;
      },
      (shot, e) => (e.kind === "nanobotKnight" && this.scatterCheck(e, shot.damageType === "physical", !!shot.glyphHost && glyphsReachSwarm(this.glyphLoadout(shot.glyphHost)), now)) ? 0 : shot.glyphHost && e.kind !== "npc" ? glyphDamage(this.glyphLoadout(shot.glyphHost), e, shot.damage, { echo: !!shot.echo }, now) : shot.damage,
      (shot, e, dealt, actual) => { this.astralPlayerHit(e,actual); if (shot.orrery) orreryOnHit(this, shot, e, now); /* the Aether Orrery's combos */ if (!shot.hostile && !shot.echo && !shot.shard && !shot.minor) this.frenzyBlow(e); /* balance pack (C10): a tool shot is a blow (its sunburst shards are not more blows) */ if (shot.glyphHost && e.kind !== "npc") { glyphHit(this.glyphWorld(now), this.glyphLoadout(shot.glyphHost), e, dealt, { echo: !!shot.echo }); if (actual > 0) this.tesseractHitHeal(shot.glyphHost === "spell" || shot.damageType === "magic" ? "spell" : "melee", now); } },
      (this.packEffects || []).filter(f => f.kind === "psyWall" && !(f.arming > 0)), // swept wall contact precedes actor collision at every substep
      (bx, by) => { const b = buildOn(this, bx, by); if (b) strikeBuild(this, b); }, // release 265: a build absorbs the shot
      (shot, nx, ny) => this.sunburst(shot, nx, ny), // Sunburst Ricochet
    );
    if(combatNpcTargets.length)this.syncNpcDamage("projectile");
    for(const fx of this.effects)if(fx.hostile&&!fx.hitPlayer&&Math.hypot(p.x+.5-fx.x,p.y+.52-fx.y)<=fx.radius){fx.hitPlayer=true;const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;if(!safe&&now>(p.invulnerableUntil||0)){p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?fx.damage*.65:fx.damage)*(1-Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0)))*hurtScale(this.save)));this.noteHurtVisualImpact();p.invulnerableUntil=now+700}}
    const hammerState=this.resolveHammerfallStartup(),hammerObserved=hammerState.status==='pending'?hammerState.effect:null;this._hammerfallObserved=hammerObserved;
    if(this.effects.length)tickSpellFields(this.effects,this.enemies,this.projectiles,dt,now,(x,y)=>{const t=this.map.tiles[Math.floor(y+.6)*width+Math.floor(x+.5)];return !!t&&!t.blocked&&!t.environment});/* release 365: Gravity Well, Stillpoint */
    if(this.effects.length)this.effects = updateEffects(
      this.effects,
      [...this.enemies, ...combatNpcTargets],
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
      (fx, e) => (fx.glyphHost && e.kind !== "npc" ? glyphDamage(this.glyphLoadout(fx.glyphHost, fx.glyphSpell), e, fx.damage, { echo: !!fx.echo }, now) : fx.damage) + (fx.imbue > 0 && e.kind !== "npc" ? (imbueSpark(this, e.x + .5, e.y + .45, now), Math.round(fx.imbue)) : 0), // release 335: a spell's pulses keep the glyphs it was cast with; Imbue Weapon: a punch's or tool blow's magic share
      (fx, e, dealt, actual) => { this.astralPlayerHit(e,actual); if (fx.brawler && !fx.echo) this.frenzyBlow(e); /* balance pack (C10): so is a punch */ if (fx.healShare && actual > 0 && this.player.hp > 0) this.player.hp = Math.min(this.save.maxHp, this.player.hp + actual * fx.healShare); /* release 493: Shadow Boxing heals from punches */ if (fx.glyphHost && e.kind !== "npc") { glyphHit(this.glyphWorld(now), this.glyphLoadout(fx.glyphHost, fx.glyphSpell), e, dealt, { echo: !!fx.echo, origin: { x: fx.x, y: fx.y } }); if (actual > 0) this.tesseractHitHeal(fx.glyphHost === "spell" || fx.damageType === "magic" ? "spell" : "melee", now); } },
    );
    const hammerTransition=this.reconcileHammerfallStartup(hammerObserved);this._hammerfallObserved=null;
    if(hammerTransition.released&&p.hp>0&&!this.paused){let accepted=false;if(this.fistReleaseIntent){const intent=this.fistReleaseIntent;this.fistReleaseIntent=null;if(now<=intent.expiresAt&&this.fistsEquipped()&&!this.cursed('attack',now)&&!this.penned(now)){this._fistInputUpdate=true;try{accepted=this.fistPunch(intent.step,intent.charge,now,intent.direction)===true;}finally{this._fistInputUpdate=false;}}}if(!accepted)this.tickAttackBuffer(now,input);}
    for(const e of this.enemies)if(e.kind==="astralWorm"&&e.dead&&!e.rewarded)this.defeatEnemy(e);
    this.tickGlyphs(dt, now);
    tickEchoes(this, dt, now, { x, y });
    tickConstellation(this, dt, now);
    if(combatNpcTargets.length)this.syncNpcDamage("spell");
    if(this.enemies.some(e=>e.dead&&e.noRewards&&e.summonedBy))this.enemies=this.enemies.filter(e=>!(e.dead&&e.noRewards&&e.summonedBy));
    const activeEnemySet=new Set(this.area==="dungeon"?activeDungeonEnemies(this.enemies,p,this.map):this.enemies.filter(e=>shouldSimulateEnemy(e,p,this.area)));
    this.riderDown(); // the ground under the mount from here: elite trails, ooze pools and root eruptions lie at the mount's feet, as on foot (a hazard skip at the rider's drawn height, fixed 2026-11-04)
    const eliteStatus=eliteStateInPlace(this.save).status;tickEliteStatus(eliteStatus,dt,n=>{if(now>(p.invulnerableUntil||0)){p.hp-=n;p.invulnerableUntil=now+350}});for(const h of this.eliteHazards)h.arming=Math.max(0,(h.arming||0)-dt);this.eliteHazards=tickEliteHazards(this.eliteHazards,dt);for(const h of this.eliteHazards)if(!(h.arming>0)&&Math.hypot(p.x-h.x,p.y-h.y)<=h.radius&&now>(h.nextHit||0)){p.hp-=h.damage;h.nextHit=now+1000;if(h.poison){const fresh=!(eliteStatus.poison>0);applyStrongPoison(eliteStatus,this.save.maxHp);if(fresh)this.message='The ooze burns. Strong poison — a Clearroot Ampoule ends it.'}}
    for(const e of this.enemies){if(e.dead||!e.eliteId||!activeEnemySet.has(e))continue;e.eliteCooldown=Math.max(0,(e.eliteCooldown||0)-dt);const distance=Math.hypot(e.x-p.x,e.y-p.y);if(e.eliteModules.includes('gravity')&&distance<6){if(e.eliteWindup>0){e.eliteWindup-=dt;if(e.eliteWindup<=0)e.eliteActive=1.15}else if(e.eliteActive>0){e.eliteActive-=dt;gravityPull(p,e,dt,1.65,6,(dx,dy)=>this.moveGrounded(p,dx,dy))/* release 734 (F1): through the collision mover */}else if(e.eliteCooldown<=0){e.eliteWindup=1.1;e.eliteCooldown=7}}if(e.eliteModules.some(m=>m==='trail'||m==='oozePool')&&e.eliteCooldown<=0){addEliteHazard(this.eliteHazards,{id:`elite-hazard-${e.id}-${now}`,owner:e.id,kind:'ooze',x:e.x,y:e.y,life:6,radius:1.15,damage:4,poison:true,nextHit:0},8);e.eliteCooldown=3.5}if(e.eliteModules.includes('summon')&&e.eliteCooldown<=0){const adds=this.enemies.filter(q=>!q.dead&&q.summonedBy===e.id);if(adds.length<3&&this.enemies.filter(q=>!q.dead&&q.summonedBy).length<6){const add=createCombatant(e.kind==='knifeChoir'?'glassMite':'ashling',e.x+1,e.y,false,[]);add.id=`summon-${e.id}-${now}-${adds.length}`;add.summonedBy=e.id;add.noRewards=true;this.enemies.push(add)}e.eliteCooldown=8}}
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
    if (this.area === "dungeon" && this.map?.pentArena) this.tickPentagonArena(dt); // the Stillworks' beast wakes
    this.tickStalker(dt, now); // release 678
    if (this.area === "overworld" && (this._shoreCheck = (this._shoreCheck || 0) - dt) <= 0) { this._shoreCheck = .5; if ((this.save.materials?.wood || 0) >= WOOD.skiffCost && this.save.capabilities?.swim && !this.nearestObject() && !this.wayglassNear(false) && this.shoreWater() && now > (this.woodHintAt || 0)) { this.woodHintAt = now + 15000; this.message = `Act: build a skiff here (${WOOD.skiffCost} wood).`; } }
    // Release 283: dungeon water is deadly. Entered (or still swum) without stamina it drowns; otherwise it wounds quickly.
    if (this.swimming && !this.mechUp() && this.area === "dungeon" && !this.map.underwater) { /* release 507: not in the robot */ const toll = dungeonWaterToll(p, dt, this.save.maxHp); if (toll === Infinity) { p.hp = 0; this.message = "Out of stamina in the dark water: it drags you under."; } else if (toll > 0) { p.hp = Math.max(0, p.hp - toll); if (now > (this.swimMessageAt || 0)) { this.swimMessageAt = now + 4000; this.message = "The dungeon water bites: get out before your stamina gives."; } } }
    if (this.swimming && !this.mechUp() && p.hp > 0) { /* release 507: the robot costs no stamina in water */ const hurt = swimUpkeep(p, dt, this.swimKind, this.area === "overworld" && !!this.map.openSea); this.swimHurtDue = hurt > 0 ? (this.swimHurtDue || 0) + hurt : 0; /* release 736 (review F14): whole points, like burning */ if (hurt > 0) { const whole = Math.floor(this.swimHurtDue); this.swimHurtDue -= whole; p.hp = Math.max(0, p.hp - whole); if (now > (this.swimMessageAt || 0)) { this.swimMessageAt = now + 4000; this.message = "Exhausted in the water — reach the shore."; } } }
    else if (this.stagMireMoving && stagMireAt(this.packEffects, p.x, p.y)) p.stamina = Math.max(0, p.stamina - (p.maxStamina || this.save.maxStamina) * STAG.mire.drain * dt); // release 708: moving on the mire drains stamina; standing still it comes back
    else { const ag = armorGlyphBonus(this.save), drain = ag.staminaDrain > 0 && this.stagMireMoving ? (p.maxStamina || this.save.maxStamina) * ag.staminaDrain : 0; /* a Tesseract's cost: stamina drained while you move */ p.stamina = Math.min(p.maxStamina, p.stamina + (9 + pairingMods(this.save).stamina) * (1 + ag.staminaRegen) * dt - drain * dt); if (drain) p.stamina = Math.max(0, p.stamina); }
    this.performanceStats.totalDungeonEncounterRecords=this.area==="dungeon"?(this.map.encounterGroups||[]).length:0;this.performanceStats.activeEnemies=0;this.performanceStats.dormantEnemies=0;this.performanceStats.activeProjectiles=this.projectiles.length;this.performanceStats.activeHazardsAndEffects=this.eliteHazards.length+this.effects.length;this.performanceStats.pathfindingWork=0;this.performanceStats.ambientTicks=0;if(dt>1/30)this.performanceStats.updateBudgetViolations++;
    const packWorld=this.packWorld(dt,now,this.area==="overworld"?settlementSanctuary(this.map,this.rx,this.ry,this.save):null);
    // World adapter for sea creatures: habitat water under a footprint, a telegraphed hit, and the Bog Lurker's drag.
    const seaWorld={player:p,
      water:(hab,x,y)=>SEA_HABITATS[hab].includes(tileUnder(this.map,width,x,y)?.kind),
      hurt:(n,e)=>{if(now<=(p.invulnerableUntil||0))return;p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?n*.65:n)*(1-Math.min(.75,characterStats(this.save).damageReduction))*hurtScale(this.save)));p.invulnerableUntil=now+700;e.recoil=.2},
      pull:(e,k)=>{const m=Math.hypot(e.x-p.x,e.y-p.y)||1,nx=p.x+(e.x-p.x)/m*Math.min(k,m),ny=p.y+(e.y-p.y)/m*Math.min(k,m);if(footprintOpen(this.map,width,nx,ny,true)){p.x=nx;p.y=ny}},
      // Leviathans (W4): krakens raise bounded tentacles (summoned, no rewards) and the Stormkraken inks the sea.
      tentacles:(o)=>this.enemies.filter(q=>!q.dead&&q.summonedBy===o.id).length+seaSummons.filter(q=>q.summonedBy===o.id).length,
      summon:(kind,x,y,o)=>{const c=createCombatant("ashling",x,y,false,[]);Object.assign(c,{id:`${o.id}:${kind}:${Math.round(now)}:${seaSummons.length}`,kind,variantId:`${kind}:common`,meleePatterns:[],tentacles:0,noRewards:true,summonedBy:o.id},seaCombatantFields(kind));seaSummons.push(c)},
      ownerDead:(e)=>!this.enemies.some(q=>q.id===e.summonedBy&&!q.dead),
      ink:(seconds)=>{this.inkUntil=now+seconds*1000;if(now>(this.inkMessageAt||0)){this.inkMessageAt=now+8000;this.message="Ink clouds the water — the Stormkraken hides in the dark."}}};
    tickTravelers(this.map,p,dt);
    const seaSummons=[];
    this.riderUp(); // release 748: creatures aim at, strike and blast the rider where drawn
    const skirmishHooks={settled:(side,survivors)=>{const war=this.map.skirmish;if(!war)return;this.save.worldFlags[war.id]=side;const winner=war[side],loser=war[side==="a"?"b":"a"];this.message=`The fighting ends: the ${winner.label} hold the field against the ${loser.label}.`;journalOnce(this.save,war.id,`At ${this.rx},${this.ry}, ${war.a.label} and ${war.b.label} fought; the ${winner.label} held the field.`,"Skirmishes")}};
    for (const e of this.enemies) {
      if(!activeEnemySet.has(e)){this.performanceStats.dormantEnemies++;continue}
      if(e.farArrayBoss==="listener"&&!e.dead){if(isMirror(e))tickMirrorListener(e,this.mirrorWorld(dt,now));const morphing=isMorph(e)&&tickMorphListener(e,this.mirrorWorld(dt,now));/* release 385: the Morphling */if(this.updateListener(e,now)||morphing)continue}
      if(e.morphWorm&&!e.dead){this.performanceStats.activeEnemies++;if(tickWorm(e,this.mirrorWorld(dt,now)))continue} // release 369: the mirror form
      if(e.mirrorClone&&!e.dead){this.performanceStats.activeEnemies++;if(tickReflection(e,this.mirrorWorld(dt,now)))continue}
      if(e.skirmishId&&!e.skirmishProvoked){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&updateSkirmisher(e,this.enemies,this.map,dt,skirmishHooks))continue}
      // A retreating Walker is harmless and must traverse settlements normally. Sanctuary combat
      // displacement must neither relocate it nor freeze its retreat while the player rests inside.
      if(e.playing&&!e.dead){this.performanceStats.activeEnemies++;continue} // release 714: the Stag and the Stalker at play
      if(e.pentFinaleBeast&&!e.pentArenaAwake&&!e.dead){this.performanceStats.dormantEnemies++;continue} // the Stillworks' beast sleeps at the heart until it wakes (tickPentagonArena)
      if(e.stalker||e.stalkerKin||e.stalkerDecoy){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&!e.dead)updateStalker(e,this.stalkerWorld(dt,now));continue} // release 678
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
      if(e.packKind){refreshMarineBeast(e,this.map,width,this.area);this.performanceStats.activeEnemies++;const zone=this.astralRiderHeld(e)||e.retreating||e.fleeTo||e.passingBeast?null:packWorld.sanctuary/* release 609 (Codex play-test, issue 4): any harmless retreating or passing beast walks through a sanctuary, not only the Walker */;if(zone){enforceSanctuary(e,zone);if(Math.hypot(p.x-zone.x,p.y-zone.y)<zone.radius)continue}const roam=isDungeonRoamer(e,this.area)&&!e.retreating,ox=e.x,oy=e.y;if(!fellIntoHazard&&!e.dead)updatePackMonster(e,packWorld);if(roam&&!this.roamerInBounds(e)){e.x=ox;e.y=oy}if(zone)enforceSanctuary(e,zone);continue}
      if(e.seaKind){this.performanceStats.activeEnemies++;if(!fellIntoHazard&&!e.dead)updateSeaCreature(e,seaWorld,dt);continue}
      if(e.encounterGroup&&!this.activatedEncounterGroups.has(e.encounterGroup)){this.activatedEncounterGroups.add(e.encounterGroup);this.performanceStats.encounterActivations++}
      let simulationDt=dt;
      if(e.ambient){e.ambientAccumulator=(e.ambientAccumulator||0)+dt;if(e.ambientAccumulator<.125){this.performanceStats.dormantEnemies++;continue}simulationDt=Math.min(.25,e.ambientAccumulator);e.ambientAccumulator=0;this.performanceStats.ambientTicks++}
      this.performanceStats.activeEnemies++;
      const pathRetryBefore=e.ai?.pathRetryAt||0;
      if (
        !fellIntoHazard&&
        !e.dead &&
        updateEnemyAI(e, p, this.map, width, simulationDt, now, /^(ashling|glassMite|sparkWarden|ashenHound|veilMoth|rootBrute|coilStalker|cinderWisp|hollowMarshal|riftColossus|voidSentinel)-/.test(e.id)?sanctuary:null,(shooter,aim)=>{const cap=this.area==="dungeon"?32:64,room=Math.max(0,cap-this.projectiles.length);if(room)this.projectiles.push(...enemyProjectilePattern(shooter,aim,now,{activeCount:this.projectiles.length,cap}).slice(0,room).map(q=>bossPaced(shooter)?{...q,damage:q.damage*BOSS_PACE.damage}:q))/* release 421 */}, (subject, dx, dy) => this.moveGrounded(subject, dx, dy)) &&
        now > (p.invulnerableUntil || 0) &&
        (!(now < this.jumpUntil) || e.kind === "sparkWarden" || !!this.mountRide()) && // Tim (2026-11-05): a mount's leap dodges nothing (on foot a jump still clears these blows; jumpable ground attacks pass under either)
        this.bodyReach(e) && // Tim (2026-11-04): a ground creature's blow does not reach the Wayfarer on a roof (ELEVATION_REACH)
        !((b) => b && strikeBuild(this, b))(buildBetween(this, e)) && // release 265: a build between takes the blow
        !enclosureShields(this, { x: e.x + .5, y: e.y + .6 }) // release 696: the enclosure's walls turn it
      ) {
        p.hp -= Math.max(
          1,
          Math.ceil(
            (this.guardRemaining > 0 ? e.damage * 0.65 : e.damage) * (bossPaced(e) ? BOSS_PACE.damage : 1) * /* release 421 */
              (1 - Math.min(.75,characterStats(this.save).damageReduction+(this.save.magicSkills?.active?.id==='veil-guard'?.12+.08*skillRank(this.save,'veil-guard'):0))) * hurtScale(this.save), // a Tesseract's damageTaken
          ),
        );
        this.noteHurtVisualImpact();
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
    this.packEffects=tickPackEffects(this.packEffects||[],packWorld);this.riderDown();/* release 748 */this.performanceStats.activeHazardsAndEffects+=this.packEffects.length;this._packLastPlayer={x:p.x,y:p.y};this.syncAstralRiders();for(const e of this.enemies)if(e.kind==="astralWorm"&&e.dead&&!e.rewarded)this.defeatEnemy(e);reconcileAstralCompanions(this);
    // A Lighthouse Buoy (release 156) keeps a line for the Wayfarer's skiff: whoever wakes or lands there without it
    // finds it tied alongside, so a rest point at sea is never a prison.
    if (this.area === "overworld" && this.map.openSea && ((this._buoyCheck = (this._buoyCheck || 0) - dt) <= 0)) {
      this._buoyCheck = .5;
      const buoy = this.map.objects.find((o) => o.seaBuoy), bs = ensureBoatState(this.save);
      if (buoy && bs.owned && !bs.aboard && Math.hypot(p.x - buoy.x, p.y - buoy.y) < 2.5 && !(bs.moored?.rx === this.rx && bs.moored?.ry === this.ry)) {
        const spot = [[2, 0], [-1, 0], [0, 2], [0, -1], [2, 1], [1, 2]].map(([dx, dy]) => ({ x: buoy.x + dx, y: buoy.y + dy })).find((q) => sailable(this.map.tiles[q.y * 32 + q.x]?.kind));
        if (spot) { const robot = !!ensureBoatState(this.save).mechSubFrom; disembark(this.save, { rx: this.rx, ry: this.ry, ...spot }); this.placeMooredSkiff(robot ? undefined : "Tied alongside the buoy."); if (!robot) this.message = "The buoy keeper's line holds your skiff alongside."; }
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
    if (this.mechUp() && p.hp < hpStart) { const r = mechAbsorb(this.save, hpStart - p.hp); p.hp = hpStart - r.kept; if (r.broke) this.message = `The robot's plating gives out and it folds away. It can be called again in ${MECH.rebuild}s.`; else if (r.stripped) this.message = `The plating gives out. Re-forging it from ${MECH_POWER.replate} cinder iron takes ${MECH_POWER.replateDelay}s: until then, blows reach you.`; } // release 599: re-forging takes time // release 317; 383: re-forged from iron
    this._astralDamagePending=false;
    // Drain healing is settled only after the existing hull mitigation, never from intercepted damage.
    const drainCredits=this._astralDrainCredits||[],creditSum=drainCredits.reduce((n,c)=>n+c.amount,0),actualLoss=Math.max(0,hpStart-Math.max(0,p.hp));
    const creditScale=creditSum>0?Math.min(1,astralRawLoss>0?actualLoss/astralRawLoss:0,actualLoss/creditSum):0;
    for(const {owner,amount} of drainCredits)if(!owner.dead&&owner.hp>0){owner.hp=Math.min(owner.maxHp,owner.hp+amount*creditScale);if(owner.astral)owner.astral.hp=owner.hp;}
    this._astralDrainCredits=[];
    this.applyInkShield(hpStart, now); // release 461: Ink Shield
    // Release 485: Aegis turns every blow aside; Shadow Boxing takes `guard` off what gets through. A fall is not a blow.
    if (p.hp < hpStart && !fellIntoHazard) { if (now < (this.aegisUntil || 0)) p.hp = hpStart; else if (now < (this.boxingUntil || 0)) p.hp = hpStart - (hpStart - p.hp) * (1 - BRAWLER["shadow-boxing"].guard); }
    if (p.hp < hpStart || p.hp < (this._consumeVisualAcceptedHp ?? -Infinity)) this.cancelConsumeVisual('hurt');
    // Release 515: Sanctum, inside your own lingering spell: less damage, and a steady mend.
    if (fieldOn(this.save, "sanctum") && p.hp > 0 && this.inOwnField()) { const S = FIELD_PASSIVES.sanctum; if (p.hp < hpStart && !fellIntoHazard) p.hp = hpStart - (hpStart - p.hp) * (1 - S.guard); p.hp = Math.min(this.save.maxHp, p.hp + this.save.maxHp * S.mend * dt); }
    this.tickHotSprings(dt, p.hp < hpStart || !!fellIntoHazard, now); // the healing hot springs (HOT_SPRINGS): after every blow and guard of the frame
    const hurtVisualAccepted = !!this._hurtVisualWitness && p.hp > 0 && p.hp < hpStart && !fellIntoHazard && !this.fallen && !(now < (p.stunnedUntil || 0));
    this._hurtVisualWitness = null;
    const hpBeforeBypassHazards = p.hp;
    // Release 475: wading through lava in the robot cooks the Wayfarer inside it, past the plating, every guard and Ink Shield.
    if (this.mechUp() && !this.mechBoosting && p.hp > 0 && footprintHazard(this.map, mapWidth(this.map, this.area), p.x, p.y) === "lava") { p.hp = Math.max(0, p.hp - this.save.maxHp * MECH_LAVA.heat * dt); if (p.hp <= 0) this.message = "The lava's heat cooks the Wayfarer inside the robot."; else if (now > (this.lavaWadeMessageAt || 0)) { this.lavaWadeMessageAt = now + 6000; this.message = "The robot wades through the lava. The heat inside is unbearable: get out of it."; } }
    // Mounted lava (Tim, 2026-11-04: "The mounts shouldn't give you any extra defense... The only defense they give you: if you go
    // into lava, it's not an instant kill, it's like a two-second kill"): standing in lava on a mount burns MOUNT_RIDE.lavaSeconds'
    // worth of maximum health a second, past every guard, plating and Ink Shield, so a ride out is still possible; mid-leap over it
    // nothing burns. On foot lava is still instant death (above).
    if (this.mountRide() && !this.mountLeap(now) && p.hp > 0 && footprintHazard(this.map, mapWidth(this.map, this.area), p.x, p.y) === "lava") { p.hp = Math.max(0, p.hp - this.save.maxHp / MOUNT_RIDE.lavaSeconds * dt); if (p.hp <= 0) this.message = MOUNT_RIDE.lavaDeath; else if (now > (this.lavaWadeMessageAt || 0)) { this.lavaWadeMessageAt = now + 6000; this.message = MOUNT_RIDE.lavaWade; } }
    // Release 509: the Far Sleep's star-voids tear the robot apart (MECH_VOID); out of it, the night takes the Wayfarer.
    if (p.hp > 0 && footprintVoid(this.map, mapWidth(this.map, this.area), p.x, p.y)) { const r = this.mechUp() ? voidTick(this.save, dt) : { gone: true }; p.hp = Math.max(0, p.hp - this.save.maxHp * MECH_VOID.heat * dt);
      if (r.gone) { p.hp = 0; this.message = r.torn ? "The robot comes apart in the void, and the night beneath the dream takes the Wayfarer." : "The night beneath the dream takes the Wayfarer."; }
      else if (p.hp <= 0) this.message = "The void unmakes the Wayfarer inside the robot.";
      else if (now > (this.voidMessageAt || 0)) { this.voidMessageAt = now + 5000; this.message = `The robot holds in the void, barely: its plating is coming apart (${Math.ceil(this.save.mech.plate)}). Get out.`; } }
    // Release 609 (Codex play-test, issue 1): a fatal fall or a step into a lethal drop stays fatal; the robot's plating, a hull,
    // Ink Shield or any guard settled above must not turn it back into an ordinary blow.
    if (fellIntoHazard || this._fatalFall) p.hp = 0;
    if (p.hp < hpBeforeBypassHazards) this.cancelConsumeVisual('hurt');
    this.gloomMend(); // the Gloomvast's decoys keep only GLOOM_FINALE.darkness.decoyTake of each blow (before the damage numbers read health)
    if (this.damageNumbers) this.trackDamageNumbers(now); // release 461
    if (p.hp <= 0 && this.area === "dungeon" && !fellIntoHazard && !this.save.session.holeDeath && runHas(this.save, this.areaId(), "secondWind") && !marginRun(this.save, this.areaId()).secondWind) { marginRun(this.save, this.areaId()).secondWind = true; p.hp = Math.max(1, Math.round(this.save.maxHp * SECOND_WIND.share)); p.invulnerableUntil = now + SECOND_WIND.guardMs; this.message = "Second Wind: the blow should have felled you. You are still standing."; this.defeatNotice = { title: "SECOND WIND", detail: "once in this crossing", kind: "discovery" }; } // release 459
    if (hurtVisualAccepted && p.hp < hpStart && this.ordinaryCloseViewBody() && !(p.hurtVisual?.v > 1)) {
      const acceptedLogicalMs = this.consumeLogicalNow(now), areaId = this.areaId(), levelId = String(this.map?.levelId || 'root');
      if (sampleHurtVisual(p.hurtVisual, acceptedLogicalMs, areaId, levelId) === null) {
        p.hurtVisual = { v: 1, kind: 'hurt', acceptedLogicalMs, areaId, levelId };
        if (now >= (p.actionVisualUntil || 0) && now >= (p.attackUntil || 0)) this.retireCleaverChoreography();
      }
    }
    if ((p.hp <= 0 || now < (p.stunnedUntil || 0)) && p.hurtVisual?.v === 1) p.hurtVisual = null;
    if (p.hp <= 0 && this.rite) this.riteFailed(); // the Rite of Ascendancy: a death breaks it
    if (p.hp <= 0) {
      this.cancelConsumeVisual('death');
      // Release 329 (Tim: "for world bosses... If they kill you, there should be like a... 4 second... pause... where you see
      // the boss just like moving around or milling around after you die. Just to give you like a second to like collect
      // yourself"): felled in a fight with a world beast or the Questing Beast, the Wayfarer lies fallen for DEATH_PAUSE
      // seconds while the beast calms and paces (tickFallen); then the usual recovery at the checkpoint (resolveDeath).
      // The played game turns it on (main.ts sets deathPause); headless simulations recover at once, as before.
      // Viewport Closed (Tim, 2026-11-04): the played game sets deathBeat (combat-visuals.ts VIEWPORT_CLOSED.fall). Every death,
      // of any kind, then holds for that short live beat of the fall (no control, nothing more can hurt) before the same
      // recovery runs once; what the player sees after it is presentation (main.ts). The world-beast pause above is unused then.
      if (this.deathBeat > 0 && !this.fallen) {
        // With a world beast, the Questing Beast or the Stalker present the world stays live, the beast looming over the corpse,
        // until black (deathBeastBeat); the recovery then runs once, there. Other deaths hold only the short beat.
        const live = this.deathBeastBeat > 0 && this.enemies.some(deathBeast), until = now + (live ? this.deathBeastBeat : this.deathBeat) * 1000;
        this.fallen = { until, beat: true, live, hazard: !!fellIntoHazard, terrain: terrainHazard ?? null }; p.hp = 0;
        if (live) for (const e of this.enemies) if (deathBeast(e)) { e.aggro = false; e.millTurn = 0; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
          if (d > DEATH_LOOM.reach) e.loomTo = { x: e.x + dx / d * (d - DEATH_LOOM.reach), y: e.y + dy / d * (d - DEATH_LOOM.reach) }; else e.millHome = { x: e.x, y: e.y }; } p.stunnedAt = now; p.stunnedUntil = until + 1000; this.jumpUntil = 0; // stunnedUntil past the beat: the pose stays down
        this.projectiles = this.projectiles.filter((q) => !q.hostile);
      } else if (this.deathPause && !fellIntoHazard && !this.fallen && this.enemies.some((e) => !e.dead && (e.worldBeast || e.questingBeast))) {
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
