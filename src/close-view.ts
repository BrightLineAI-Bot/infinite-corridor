import { rangedWeapon } from './items.ts';
import { biomechanicalKeep } from "./close-view-room-routing.ts";
import { interiorCeilingHeight, interiorArchAt, INTERIOR_TRAVERSAL } from "./vehicle-gates.ts";
import { interiorTerrain, interiorSurfaceHeight, interiorSurfaceLevel, interiorTileLevel, interiorGeometryHeight, interiorTerrainSignature, legacyInteriorBuildLevel, LIFT_PER_LEVEL } from "./landscape.ts";
import { buildVisualRevision, hasStoneBuilds } from "./building.ts";
import { importedEmitterAppearance, ACTION_MOTION, ATTACK_VISUAL_PROFILES, TOOL_VISUAL_KINDS, attackVisualDeadline, normalizeAttackVisual, normalizeMeleeActionVisual, recordHeroPresentation, toolUseReleaseAge, primaryVisualStage, primaryCarryStage, cleaverCarryFrame, sampleCleaverChoreography } from "./action-motion.ts";
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelSupportsAttachments, writeCloseViewModel, writeCloseViewHeroEquipment, writeCloseViewHeroKit, HERO_SLOT_EXTRA_TRIANGLES, closeViewToolEmissionPoint, closeViewHeldMuzzlePoint } from "./close-view-models.ts";
import { loadCloseViewHero, getCloseViewHeroAsset, closeViewHeroAssetStatus, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from './close-view-hero.ts';
import { actorPresentation, actorModelKey, packActionPresentation, nativeCreatureCoverage, projectileVisualHeight, projectileVisualPoint, readProjectileVisualFlight, shotVisualHeight } from "./actor-presentation.ts";
import { playerFormPresentation, playerFormModelKey, cleaverHandRoles, ordinaryJumpPresentation, ordinaryFallPresentation, ordinaryDefeatPresentation, ordinaryLandingPresentation } from './close-view-player-presentation.ts';
import { HURT_VISUAL_MS, sampleCachePickupVisual, sampleConsumeVisual, sampleHurtVisual } from './consume-visual.ts';
import { fistCharge } from './brawler-spells.ts';
import { dronePos } from "./affixes.ts";
import { PENTAGON_BACKDROPS } from "./pentagon-halls.ts";
import { standardProjectile, standardProjectileColor } from "./combat-visuals.ts";
import { LUMEN_CARBINE, carbineCharged, carbineFill } from "./tool-forms.ts"; // the Lumen Carbine's beam and charge glow
import { ATTACK_MODULES, BOSS_PACE } from "./monster-pack.ts";
import { knockdownPose } from "./lightning-giant-render.ts";
import { dungeonPointDiscovered, dungeonTileVisibility } from "./dungeon-framework.ts";
import { holeDrops, labFogState, HOLE_DROPS } from "./labyrinths.ts";
import { muralPattern, PENTAGON_MURALS } from "./pentagon-halls.ts";
import { SIGIL_CELLS } from "./watcher.ts";
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible, BEAST_SLOT } from "./close-view-beasts.ts"; // release 891: world beasts' skinned bodies
import { closeViewGLReady, closeViewGLFrameReady, closeViewGLDiagnostics, noteCloseViewGLFrameAbort, resetCloseViewGL, prepareCloseViewHeroGL, prepareCloseViewBeastMesh, closeViewGLCanvas, closeViewGLStats, drawSceneGL, glMask, glGrit, glEnsure, glStaticWalls, glOutdoor, glProps, closeViewPropsAvailable, glRelief, closeViewReliefAvailable, closeViewOutdoorAvailable, closeViewMask, closeViewHazardCode, GLB, GLF, WALL_FLOATS, BOARD_FLOATS, DECAL_FLOATS } from "./close-view-gl.ts"; // version 4: the GPU scene
import { lanternReach } from "./spell-slots.ts"; // the Lantern lengthens the torch
import { OUTDOOR, outdoorScene, outdoorInsideHouse, outdoorTreeObject, outdoorPropObject, propScene, outdoorRelief, outdoorSurfaceZ, outdoorLightning, LIGHTNING, outdoorRoofZ } from "./close-view-outdoor.ts";
import { roofDeckAt, roofDeckById } from "./roof-decks.ts"; // roof decks: the Wayfarer on a roof, the roof kept, the tap on a roof
// The overworld's heightfield (OUTDOOR.terrain): while it is drawn, everything that stands on the ground (the Wayfarer, the
// creatures, their shadows, shots, the camera's floor) stands at its height; elsewhere the interiors' own heights, as before.
const RELIEF = { map: null, R: null };
const surfaceZ = (map, x, y) => map && map === RELIEF.map ? outdoorSurfaceZ(RELIEF.R, x, y) : interiorSurfaceHeight(map, x, y); // the open world's sky, ground and solids

// Close View (Tim, 2026-11-06: "a more intimate viewpoint for the character... when you get into the Pentagon, we feel like
// you're in Bloodborne... you're close in, walking through, instead of having this super high perspective... the camera's in
// the cavern with you... third person... more like exploring the Chalice Dungeons"). Phase 1, a prototype: a low third-person
// camera behind the Wayfarer, built on the existing 2D canvas renderer, for interiors only (the Pentagon, buildings, keeps),
// off unless chosen (Options → Controls; save.closeView, additive at schema 14). The overworld keeps its view.
//
// How a frame is drawn (renderCloseView):
// 1. The ordinary top-down renderer draws the floor of the area round the Wayfarer, with everything it lays on the ground
//    (tiles, telegraphs, hazards, effects, marks), into an offscreen "ground" canvas centred on the Wayfarer. Its actor list
//    (the sorted `draws` closures: creatures, objects, the Wayfarer) is captured instead of drawn (closeViewTake).
// 2. A torch-light falloff is painted over that ground texture (one cached radial gradient, the Wayfarer always at its centre).
// 3. The floor is laid on screen in perspective, "mode 7" style: horizontal bands, each an affine copy of the ground texture
//    exact at its middle row; bands are spaced in equal depth ratios, so each is equally accurate.
// 4. Walls (blocked tiles) are extruded blocks: one quad per exposed tile edge, cached per floor (wallGeometry), culled to the
//    view radius, the frustum and back faces, coloured from a precomputed fog/torch colour table (no per-frame strings).
// 5. Wall faces and actors are depth sorted together (painter's order). An actor is a billboard: its captured closure draws
//    the existing sprite into a scratch corner of the ground canvas at the billboard's own resolution, which is then copied
//    to its place on screen. Wall faces between the camera and the Wayfarer are cut to a faint ghost so the Wayfarer is never
//    hidden; the camera boom is also pulled in by walls behind the Wayfarer.
// 6. Distance fog (a cached vertical gradient over the floor) and a vignette close the view in.
//
// Higher-fidelity monster art plugs in at drawBillboard: today it replays the top-down sprite closure; a phase-2 creature
// would register a `closeViewArt(ctx, e, view)` drawer (see CLOSE_VIEW_HOOKS.art) that draws itself from the camera's angle.
//
// The Deep's own look in Close View (Tim, 2026-11-11, in THE DEEP · FLOOR 1: the standard view is "beautiful and
// picturesque" (a mossy floor, teal mushrooms, dark cracked stone, purple specks) and Close View showed the walls as "plain brown
// brick blocks... garish, low-res, obviously out of place"; "the dungeon themes need to extend to the Close View walls").
// One theme for each environment a Deep floor is laid in (the-deep.ts THE_DEEP.themes, underlands.ts UNDER_THEMES), its palette
// taken from that environment's standard-view tiles (landscape-render.ts), and `deepStone` for a floor with none.
// wall.kind 7 is the Deep's living rock (close-view-gl.ts): boulders split by cracks, moss (wall.dampRGB), glowing spots (glow)
// and spore flecks (deco2), by `cave`: [moss, glowing spots, flecks, glow strength, glowing cracks, boulder scale]; ceiling.kind
// 5 is that rock overhead. `arch.none`: no masonry arch over a cave's passages. `features`: a blocked tile of the environment
// (a glowcap, an ice spire, a crystal spire, a temple pillar...) stands as what it is instead of as a block of wall (`form`:
// cap, shard, column, knot, pipe, slab; pool: nothing, the floor shows it). `growth`: small glowing caps or shards at the foot
// of the wall under each of the theme's glowing lights (light hue 5: the theme's own `glow`, no flame or bracket). `ownWalls`:
// every wall tile takes the theme's material (a star hive's "hiveWall" tiles are not the compounds' chitin).
// Colours are 0..255. A theme is a hash-free function of the floor's environment: never stored, never per frame.
const frozen = (o) => { for (const v of Object.values(o)) if (v && typeof v === "object" && !Object.isFrozen(v)) frozen(v); return Object.freeze(o); };
const deepTheme = (label, t) => frozen({ label, ownWalls: true, arch: { spring: 1.8, radius: 0, band: .2, none: true }, pilaster: 0, plinth: [0, 0], cornice: [0, 0], vignette: .56, decor: {}, props: {}, ...t });
const caveWall = (rgb, mortar, moss, topFall = .32) => ({ kind: 7, rgb, mortar, stone: [.3, .7, .04, .8], damp: [0, 0], dampRGB: moss, topFall });
const caveFloor = (rgb) => ({ kind: 6, rgb, joint: rgb.map((v) => Math.round(v * .35)), rug: rgb, size: .6, wear: .25, wet: .25, sewer: false });
const caveCeiling = (rgb) => ({ kind: 5, rgb, bay: 2, rib: .1, dark: .8 });
const glowLights = (share, strength = 1.4) => ({ share, spacing: 4, reach: 3.8, strength, hue: 5, ghost: 0, candles: 0 });
export const CLOSE_VIEW_DEEP = frozen({
  version: 1,
  byEnv: { fungal: "deepFungal", chasm: "deepChasm", lavaBog: "deepLava", river: "deepRiver", frozen: "deepFrozen", boneCrypt: "deepCrypt", starHive: "deepStarHive", geode: "deepGeode", mosaic: "deepMosaic", rootwood: "deepRootwood", brass: "deepBrass" },
  none: "deepStone",
  // feature and growth sizes (tiles): a giant cap's stem and cap; a shard cluster's count, height and lean; a column's radius
  shapes: { cap: { stem: [.12, .09], height: [.9, 1.35], cap: [.46, .36, .12], capH: [.12, .16] }, shard: { n: 4, height: [.7, 1.5], r: [.1, .17], lean: .22 },
    column: { r: .34, sides: 8 }, knot: { r: [.3, .17], flares: 4 }, pipe: { r: .13, at: [.3, .66] }, slab: { half: [.38, .44], height: .72 },
    growth: { n: 3, cap: [.07, .13], height: [.12, .34], shard: [.18, .42] } },
  themes: {
    deepFungal: deepTheme("The Deep: a fungal hollow (mossy dark stone, glowing caps, drifting spores)", {
      wall: caveWall([52, 62, 50], [8, 11, 8], [64, 108, 70], .3), floor: caveFloor([42, 51, 38]), ceiling: caveCeiling([30, 38, 32]),
      light: { torch: [236, 220, 180], reach: 5.6, strength: 1.6, height: 1.15, ambient: [8, 12, 11], sources: glowLights(.14, 1.5) },
      fog: { rgb: [4, 8, 7], near: 2.6, far: 12.5, haze: [.1, .7], hazeRGB: [12, 26, 22] }, grade: [.95, 1.04, 1, 1.08], vignette: .55,
      deco1: [44, 76, 50], deco2: [196, 155, 232], glow: [111, 216, 184], cave: [.6, .1, .7, .9, 0, 1.5],
      features: { glowcap: { form: "cap", rgb: [111, 216, 184], stem: [215, 207, 184], under: [62, 156, 132], glow: .5 } },
      growth: { form: "cap", rgb: [111, 216, 184], stem: [200, 192, 170], under: [62, 156, 132], glow: .6 }, props: { rubble: .03 } }),
    deepChasm: deepTheme("The Deep: a chasm's ledges (grey-violet rock over the drop)", {
      wall: caveWall([64, 60, 70], [10, 9, 12], [86, 82, 96]), floor: caveFloor([63, 58, 64]), ceiling: caveCeiling([36, 34, 40]),
      light: { torch: [236, 214, 180], reach: 5.6, strength: 1.6, height: 1.15, ambient: [9, 9, 12], sources: glowLights(.06, 1.2) },
      fog: { rgb: [6, 6, 8], near: 2.6, far: 12, haze: [.09, .8], hazeRGB: [16, 15, 20] }, grade: [.97, .98, 1.04, 1.1],
      deco1: [50, 46, 56], deco2: [150, 140, 180], glow: [150, 140, 210], cave: [.12, .03, .25, .5, 0, 1.3],
      growth: { form: "shard", rgb: [150, 140, 210], glow: .5 }, props: { rubble: .07 } }),
    deepLava: deepTheme("The Deep: a lava bog (scorched rock with glowing seams)", {
      wall: caveWall([72, 60, 54], [26, 10, 4], [92, 86, 82]), floor: caveFloor([90, 81, 76]), ceiling: caveCeiling([40, 32, 28]),
      light: { torch: [255, 196, 140], reach: 5.6, strength: 1.6, height: 1.15, ambient: [12, 8, 6], sources: glowLights(.1, 1.5) },
      fog: { rgb: [10, 6, 4], near: 2.6, far: 12, haze: [.12, .6], hazeRGB: [26, 12, 6] }, grade: [1.06, .97, .9, 1.1],
      deco1: [60, 40, 30], deco2: [255, 138, 58], glow: [255, 120, 50], cave: [.2, .05, .4, .9, .8, 1.4],
      growth: { form: "shard", rgb: [255, 120, 50], glow: .7 }, props: { rubble: .06 } }),
    deepRiver: deepTheme("The Deep: an underground river (wet coursed stone, a green tide line)", {
      wall: { kind: 0, rgb: [56, 70, 72], mortar: [12, 16, 17], stone: [.3, .7, .05, .7], damp: [1, .8], dampRGB: [100, 160, 140], topFall: .32 },
      floor: { kind: 0, rgb: [60, 70, 72], joint: [15, 18, 19], rug: [40, 48, 50], size: .6, wear: .4, wet: .5, sewer: false }, ceiling: { kind: 0, rgb: [40, 50, 52], bay: 2, rib: .09, dark: .8 },
      arch: { spring: 1.72, radius: .5, band: .15 }, plinth: [.18, .06],
      light: { torch: [240, 214, 170], reach: 5.6, strength: 1.6, height: 1.15, ambient: [8, 11, 12], sources: { share: .08, spacing: 5, reach: 3.8, strength: 1.3, hue: 1, ghost: 0, candles: 0 } },
      fog: { rgb: [5, 8, 9], near: 2.6, far: 12, haze: [.12, .6], hazeRGB: [12, 20, 22] }, grade: [.94, 1, 1.04, 1.1],
      deco1: [40, 60, 56], deco2: [120, 170, 150], glow: [90, 220, 190], decor: { roots: .06 }, props: { rubble: .04, web: .25 } }),
    deepFrozen: deepTheme("The Deep: a frozen grotto (blue ice, frost on every ledge)", {
      wall: caveWall([112, 150, 178], [36, 62, 84], [214, 232, 246], .45), floor: caveFloor([180, 196, 210]), ceiling: caveCeiling([70, 92, 112]),
      light: { torch: [230, 236, 255], reach: 5.6, strength: 1.5, height: 1.15, ambient: [11, 13, 16], sources: glowLights(.08, 1.2) },
      fog: { rgb: [8, 11, 15], near: 2.8, far: 12.5, haze: [.1, .8], hazeRGB: [24, 30, 38] }, grade: [.94, 1, 1.08, 1.08],
      deco1: [90, 120, 150], deco2: [236, 248, 255], glow: [170, 220, 255], cave: [.4, .03, .5, .5, 0, 1.2],
      features: { iceSpire: { form: "shard", rgb: [196, 228, 246], glow: .25 } }, growth: { form: "shard", rgb: [190, 226, 250], glow: .4 } }),
    deepCrypt: deepTheme("The Deep: a bone crypt (old coursed stone, skull niches, sarcophagi)", {
      wall: { kind: 0, rgb: [72, 64, 56], mortar: [18, 15, 12], stone: [.27, .62, .05, .9], damp: [.7, .6], dampRGB: [120, 128, 116], topFall: .3 },
      floor: { kind: 0, rgb: [74, 66, 57], joint: [16, 14, 12], rug: [60, 30, 26], size: .58, wear: .6, wet: .2, sewer: false }, ceiling: { kind: 0, rgb: [52, 46, 40], bay: 2, rib: .09, dark: .85 },
      arch: { spring: 1.72, radius: .5, band: .15 }, pilaster: 4, plinth: [.2, .07], cornice: [.16, .08], vignette: .6,
      light: { torch: [255, 182, 124], reach: 5.4, strength: 1.7, height: 1.15, ambient: [10, 9, 10], sources: { share: .08, spacing: 5, reach: 4, strength: 1.5, hue: 0, ghost: .3, candles: .35 } },
      fog: { rgb: [6, 5, 5], near: 2.4, far: 11.5, haze: [.1, .7], hazeRGB: [16, 14, 13] }, grade: [1, .96, .9, 1.14],
      deco1: [60, 30, 26], deco2: [207, 195, 173], glow: [255, 150, 80], decor: { niche: .22, roots: .04 }, props: { bones: .1, urn: .05, coffin: .03, web: .45 },
      features: { sarcophagus: { form: "slab", rgb: [128, 116, 100] } } }),
    deepStarHive: deepTheme("The Deep: a star hive (violet alien rock, crystal spires, glowing pools)", {
      wall: caveWall([64, 46, 90], [16, 10, 26], [92, 62, 138], .3), floor: caveFloor([43, 29, 64]), ceiling: caveCeiling([38, 26, 54]),
      light: { torch: [226, 206, 255], reach: 5.6, strength: 1.6, height: 1.15, ambient: [10, 8, 14], sources: glowLights(.12, 1.4) },
      fog: { rgb: [7, 5, 10], near: 2.6, far: 12, haze: [.1, .7], hazeRGB: [20, 12, 30] }, grade: [.98, .94, 1.08, 1.1],
      deco1: [58, 40, 94], deco2: [95, 247, 209], glow: [192, 139, 255], cave: [.45, .08, .4, .85, 0, 1.6],
      features: { crystalSpire: { form: "shard", rgb: [192, 139, 255], glow: .55 }, alienPool: { form: "pool" } }, growth: { form: "shard", rgb: [192, 139, 255], glow: .6 } }),
    deepGeode: deepTheme("The Deep: a geode (dark rock studded with violet crystal)", {
      wall: caveWall([62, 56, 78], [12, 10, 18], [86, 74, 110]), floor: caveFloor([58, 51, 70]), ceiling: caveCeiling([40, 36, 52]),
      light: { torch: [230, 220, 255], reach: 5.6, strength: 1.6, height: 1.15, ambient: [9, 8, 13], sources: glowLights(.12, 1.4) },
      fog: { rgb: [6, 5, 9], near: 2.6, far: 12, haze: [.08, .8], hazeRGB: [16, 13, 24] }, grade: [.98, .95, 1.06, 1.1],
      deco1: [77, 58, 120], deco2: [183, 160, 232], glow: [154, 122, 208], cave: [.1, .16, .5, .95, 0, 1.4],
      features: { geodeCluster: { form: "shard", rgb: [180, 140, 240], glow: .55 } }, growth: { form: "shard", rgb: [180, 140, 240], glow: .6 } }),
    deepMosaic: deepTheme("The Deep: a buried temple (sandstone, a teal and gold frieze, pillars)", {
      wall: { kind: 0, rgb: [138, 122, 92], mortar: [44, 36, 24], stone: [.3, .75, .04, .5], damp: [.4, .35], dampRGB: [150, 150, 130], topFall: .45 },
      floor: { kind: 0, rgb: [120, 104, 80], joint: [40, 34, 24], rug: [47, 111, 115], size: .7, wear: .3, wet: .1, sewer: false }, ceiling: { kind: 0, rgb: [96, 86, 66], bay: 3, rib: .11, dark: .75 },
      arch: { spring: 1.72, radius: .5, band: .15 }, pilaster: 3, plinth: [.22, .07], cornice: [.18, .09], vignette: .5,
      light: { torch: [255, 200, 140], reach: 5.8, strength: 1.5, height: 1.15, ambient: [12, 11, 9], sources: { share: .1, spacing: 5, reach: 4.4, strength: 1.5, hue: 0, ghost: 0, candles: .2 } },
      fog: { rgb: [8, 7, 5], near: 2.8, far: 12.5, haze: [.07, .8], hazeRGB: [22, 19, 14] }, grade: [1.04, 1, .92, 1.08],
      deco1: [47, 111, 115], deco2: [226, 194, 106], glow: [255, 200, 120], decor: { banner: .1, niche: .03 }, props: { urn: .06, rubble: .03, web: .2 },
      features: { templePillar: { form: "column", rgb: [185, 171, 138] } } }),
    deepRootwood: deepTheme("The Deep: a root hollow (packed earth and great roots)", {
      wall: { kind: 1, rgb: [60, 44, 28], mortar: [20, 15, 10], stone: [.3, .7, .05, .9], damp: [.5, .4], dampRGB: [120, 150, 90], topFall: .3 },
      floor: caveFloor([59, 52, 36]), ceiling: { kind: 1, rgb: [50, 36, 24], bay: 1, rib: .1, dark: .8 },
      light: { torch: [255, 176, 110], reach: 5.4, strength: 1.6, height: 1.15, ambient: [9, 9, 7], sources: { share: .08, spacing: 5, reach: 3.8, strength: 1.4, hue: 1, ghost: 0, candles: .25 } },
      fog: { rgb: [6, 6, 4], near: 2.4, far: 11.5, haze: [.12, .6], hazeRGB: [16, 16, 10] }, grade: [1.04, 1, .86, 1.1],
      deco1: [60, 44, 28], deco2: [138, 164, 90], glow: [150, 230, 120], decor: { roots: .5 }, props: { rubble: .04, web: .4 },
      features: { rootKnot: { form: "knot", rgb: [110, 76, 44] } } }),
    deepBrass: deepTheme("The Deep: a brass works (riveted panels, pipes, failing lamps)", {
      wall: { kind: 3, rgb: [138, 106, 52], mortar: [42, 30, 14], stone: [.34, .8, .04, .4], damp: [.5, .4], dampRGB: [150, 140, 110], topFall: .4 },
      floor: { kind: 10, rgb: [110, 90, 56], joint: [30, 22, 10], rug: [70, 54, 26], size: .6, wear: .5, wet: .2, sewer: false }, ceiling: { kind: 3, rgb: [70, 56, 30], bay: 2, rib: .1, dark: .7 },
      arch: { spring: 2.05, radius: 0, band: .35 }, pilaster: 4, plinth: [.14, .05], cornice: [.12, .06],
      light: { torch: [255, 206, 150], reach: 5.6, strength: 1.5, height: 1.15, ambient: [11, 10, 8], sources: { share: .1, spacing: 5, reach: 4.2, strength: 1.4, hue: 3, ghost: 0, candles: 0 } },
      fog: { rgb: [7, 6, 4], near: 2.6, far: 12, haze: [.08, .8], hazeRGB: [20, 16, 10] }, grade: [1.04, 1, .9, 1.1],
      deco1: [70, 54, 26], deco2: [216, 184, 120], glow: [255, 190, 110], decor: { vent: .12 }, props: { rubble: .04, chain: .03, web: .15 },
      features: { brassPipe: { form: "pipe", rgb: [224, 188, 120] } } }),
    deepStone: deepTheme("The Deep: raw rock (cracked stone, a little moss, faint glow)", {
      wall: caveWall([68, 66, 62], [12, 11, 10], [58, 76, 60]), floor: caveFloor([64, 62, 58]), ceiling: caveCeiling([38, 36, 34]),
      light: { torch: [240, 214, 170], reach: 5.6, strength: 1.6, height: 1.15, ambient: [9, 10, 11], sources: glowLights(.06, 1.3) },
      fog: { rgb: [6, 7, 7], near: 2.6, far: 12, haze: [.08, .8], hazeRGB: [15, 17, 17] }, grade: [.98, 1, 1, 1.1],
      deco1: [50, 50, 46], deco2: [150, 140, 170], glow: [120, 200, 180], cave: [.28, .03, .25, .6, 0, 1.4],
      growth: { form: "cap", rgb: [120, 200, 180], stem: [180, 176, 160], under: [60, 120, 104], glow: .5 }, props: { rubble: .05 } }),
  },
});

// Every number is in CLOSE_VIEW. Distances are in tiles; angles in degrees.
export const CLOSE_VIEW = Object.freeze({
  version: 5, // 5 (2026-11-06, release 794): atmosphere: a theme per building kind (CLOSE_VIEW.themes), procedural stone, placed light, fog and haze, a camera that never looks through a wall; 4 (2026-11-06, release 793): the GPU scene (CLOSE_VIEW.gl; close-view-gl.ts): a floor that holds still, a ceiling, detailed walls, pits with depth, lava, smooth motion; 3 (2026-11-06, release 790): the walls' surface (CLOSE_VIEW.grit) and the bullseye lock; 2 (2026-11-06, Tim: "the walls kind of moved or weren't stable... a more stable view"): the stability pass
  camera: Object.freeze({
    minDistance: 1, // the boom's usual shortest... (a wall closer than this pulls it in further: the camera is never inside a wall)
    closest: .3, // ...and its absolute shortest
    crane: .75, // ...and for each tile it is pulled in, it rises this much (never above the walls' tops less `craneClear`), so
    craneClear: .2, // the Wayfarer stays a figure in the view, not a wall of cloth (was .25 before the 2026-11-11 height pass)
    nearFade: Object.freeze([1.6, .55]), // (version 5, the GPU scene: never fainter than atmosphere.nearFade) // nearer than this (camera depth), the Wayfarer is drawn this faint, so the way ahead shows
    center: .5, // the aim point's place on screen, as a share of the height from the top
    boomPad: .32, // the camera keeps this far off a wall
    boomStep: .2, // the boom is tested against walls in steps of this length
    // The boom's length, its shoulder and its height ride critically damped springs (no overshoot, no snap): `pullIn` is the
    // spring's rate (per second) while a wall pulls the boom in, `letOut` while it lets it out again. Version 1 eased the
    // pull-in at 30/s, so a wall probe flickering between hit and miss as the Wayfarer walked lurched the camera, and the
    // walls with it.
    pullIn: 12, letOut: 3,
    // version 4 (Tim: "it seems a little bit choppy... fluid, smooth framing, smooth motions"): the boom hangs from a follow
    // point that rides a critically damped spring of rate `follow` (per second) after the Wayfarer's feet, never more than
    // `followMax` tiles behind (a dodge or a knock-back is followed, not jumped to); `followSnap` tiles or more away (a fall, a
    // teleport) it is there at once
    follow: 16, followMax: .45, followSnap: 3,
    // version 5 (Tim: "where we're tearing through the walls"): the line from the Wayfarer's chest to the camera is kept clear
    // of walls (probed every `sightStep` tiles, `sightPad` tiles to either side): the boom's spring is pulled in to where that
    // line clears before any wall can come between. `hardPad`: nearer a wall than this the camera is never put (cut at once;
    // it sits under the spring's target, so it is seldom reached). Nothing is ever faded to show the Wayfarer.
    sightStep: .1, sightPad: .26, hardPad: .14,
    offsetGain: .25, offsetHold: .3, // lateral candidates must earn a useful, persistent clearance gain
    tightFocal: .72, // routed-room relief only: bounded widening when solid stone leaves a sub-minimum boom
    shoulderRecover: .25, // clear space must persist before an obstructed shoulder expands again
    shoulderCenter: .55, shoulderFull: .9, // center a compressed boom; regain the preset offset in open space
    // Keep the visible body in frame after collision shortens the boom. The 1.45-tile
    // bound encloses the Wayfarer's .82-scale, 1.68-tile hood, including its walking bob.
    framing: Object.freeze({ bodyHeight: 1.45, margin: .05, pitchMin: -1.2, pitchMax: 1.35 }),
    // Outdoors over the heightfield (2026-11-11): the line from the Wayfarer's chest to the camera must clear the ground behind
    // them. Rather than only cutting the boom where a ledge rises into that line, the crane first rises, up to `riseMax` tiles
    // over the preset's outdoorHeight, so the camera looks down over the ledge; only a ledge too tall and too close for that
    // shortens the boom, and then to the longest length the risen crane can see over. (Until 2026-11-12 the rise and the cut
    // were taken at once, from a line at the hips, and every section edge was a wall; see the calm pass below.)
    // `horizonRoom`: outdoors the crane is held low enough that the Wayfarer's feet and this many degrees of sky above the
    // horizon both fit the screen's height (outdoorCrane; it binds only in a short landscape view).
    // Calm (Tim, 2026-11-12: "the camera just zooms in so much on the player based on the terrain... at the edge of the
    // sections, the camera still zooms in, even though you can still see the player"). Over the heightfield only ground that
    // rises into the line from the Wayfarer's chest (`chest` tiles over their footing) to the camera moves it: ground below
    // that line (a step at their heels, the levels below a ledge) is no matter. The line is tested at `samples` fixed points
    // (with `clear` tiles of air over the ground). The crane first rises (up to `riseMax`), then the boom is shortened; both
    // ease: in at `riseRate` / `pullIn` (critically damped springs, per second), and out again at `letOut` only after the line
    // has wanted less for `hold` seconds, so ground flickering in and out of the line does not pump the view. `edgeOpen`: off
    // the section's edge is open ground for the camera (it was a wall, and the boom was cut at every section's edge).
    outdoor: Object.freeze({ riseMax: 2.2, horizonRoom: 4, minHeight: 1.2, // minHeight: never lower than this however short the view
      chest: 1.05, clear: .12, samples: 16, riseRate: 7, pullIn: 6, letOut: 2, hold: .4, edgeOpen: true }),
    // The camera's height follows the Wayfarer's footing (a ledge, a ramp, a fall) on a critically damped spring whose mean lag
    // is `tau` seconds (`reducedTau` with Reduced Motion), never more than `maxLag` tiles from it (a little over one level, so a
    // single level eases all the way and a long fall keeps them on screen); `snap` tiles or more away (a teleport, a new floor) it is there at once. Tim, 2026-11-12: "when you transition
    // between levels or elevations, sometimes it just does a cut that's too quick... disorienting... smooth that out more."
    // `deckLag` (roof decks, roof-decks.ts): while the Wayfarer stands on a roof deck, or hops over one, the lag may grow to this
    // instead, so landing on a tall gable from the bank beside it (its ridge is up to wall + ridge, 1.725 + 1.575 = 3.3 tiles,
    // over the house's ground; the bank is a level, 1.2, up) is eased all the way, never cut by the cap. It stays under `snap`.
    // `jumpTau` (the jump-up hitch, Tim 2026-11-12): through a jump and `jumpHold` ms after it the height follows on this shorter lag,
    // so a jump up onto a ledge has the camera arrive with the landing; with `tau` it was still a fifth of a tile short at the
    // touchdown and kept rising half a second after it, and on screen the Wayfarer sank after landing.
    vertical: Object.freeze({ tau: .32, reducedTau: .1, maxLag: 1.3, deckLag: 2.2, snap: 3, jumpTau: .1, jumpHold: 250 }),
    // A section crossing (Tim, 2026-11-12: "The camera does a weird change when you transition between sections. The camera
    // should just point straight ahead so the Wayfarer is facing the new section."). On arriving in the open overworld from
    // another map the view was chosen afresh: the yaw from the four-way facing, or, when the way ahead held a tree or a rock
    // within the boom and a tile, a sweep of eight headings that could turn it to look along the edge; and the crane, the
    // shoulder and the rig started from the indoor defaults and eased out, so the eye sank and slid sideways for a second.
    // `snap`: arriving in the open overworld from a map the camera was drawing (a crossing, Wayglass travel, a dungeon's exit)
    // the camera is put straight behind the Wayfarer, its springs (follow point, height anchor, terrain rise and pull-in, boom,
    // crane, shoulder, rig, lens) set to their targets on the first frame, the eight-way sweep skipped, any quick turn,
    // recentre or user tilt let go. `faceTravel`: a crossing (the next section along one axis, the Wayfarer within `edge`
    // tiles of the edge they came in by) looks along the crossing; other arrivals look the way the Wayfarer faces.
    crossing: Object.freeze({ snap: true, faceTravel: true, edge: 1.5 }),
  }),
  // The camera's framing, by preset (Options → Controls, next to the toggle; save.closeViewPreset). Tim's references (camera and
  // feel only): Bloodborne's tight, low over-the-shoulder view; Remnant: From the Ashes, a little further back and offset to
  // one side so the Wayfarer stays readable and the corridor ahead stays open; Elder Scrolls Online's smooth chase camera,
  // easing round turns with a comfortable field of view (CLOSE_VIEW.turn). `shoulder`: tiles the camera sits to the right of
  // the Wayfarer's line (they stand left of centre, the way ahead to their right). `fov`: horizontal degrees.
  presets: Object.freeze({
    // version 2: each a little higher (Tim: "a slight default height increase is fine if it helps you read the room"), still
    // under the walls' tops, so a room's floor and its edges read; the pitch follows from the height and the aim point
    // version 3 (Tim, 2026-11-11: "needs to be farther out, a little bit farther back... I'm in the wide view and it still needs
    // to be even farther back"; then wide at 5 tiles: "we can bring it back in if we need"): every preset pulled back and
    // raised (was close 2 / 1.35, standard 2.7 / 1.6, wide 3.4 / 1.85, distance / height), wide the farthest, still under the walls' tops less craneClear; the aim point moved further ahead
    // and lower so the pitch shows more of the floor beyond the Wayfarer, who stays framed low of centre. Walls still pull the
    // boom in (CLOSE_VIEW.camera), so tight corridors keep the old close framing. `fogPush`: tiles the depth fog is pushed out
    // with the longer boom, so the Wayfarer and the ground just past them are no foggier than at the old distance.
    // version 4 (Tim, 2026-11-11: "higher camera in general", after the overworld's levels became 1.2 tiles tall and a cliff at
    // the Wayfarer's back pulled the camera in to their shoulder): indoors each preset is raised toward the cap (was close 1.55,
    // standard 1.9, wide 2.15; the walls' tops less craneClear, 2.2, and the arch and hall caps still bound it). Outdoors (the
    // overworld, courts and roofs: no ceiling) the crane stands at `outdoorHeight`, high enough that a level or two of ledge
    // behind the Wayfarer is looked down over (CLOSE_VIEW.camera.outdoor) rather than cutting the boom. The look point is kept:
    // the pitch outdoors is about 20-24 degrees, so in portrait the horizon still sits in the upper third of the screen and the
    // Wayfarer's feet at about two thirds of the way down.
    // version 5 (Tim, 2026-11-12, the overworld: "could be moved out just a little bit more... maybe like another tile"): in
    // the open overworld (no building) the boom is `outdoorDistance`, a tile longer than `distance`; indoors, courts and roofs
    // keep `distance`.
    standard: Object.freeze({ label: "Standard", height: 2.05, outdoorHeight: 3, distance: 3.5, outdoorDistance: 4.5, lookAhead: 2.9, lookHeight: .35, shoulder: .42, fov: 72, fogPush: .8 }), // the blend: Remnant's offset and distance, ESO's field of view, Bloodborne's closeness
    close: Object.freeze({ label: "Close (tight, low)", height: 1.8, outdoorHeight: 2.6, distance: 2.6, outdoorDistance: 3.6, lookAhead: 2.2, lookHeight: .5, shoulder: .32, fov: 66, fogPush: .6 }), // Bloodborne
    wide: Object.freeze({ label: "Wide (further back)", height: 2.2, outdoorHeight: 3.4, distance: 5, outdoorDistance: 6, lookAhead: 3.4, lookHeight: .25, shoulder: .5, fov: 80, fogPush: 1.6 }), // Remnant / ESO
  }),
  defaultPreset: "standard",
  fov: Object.freeze({ verticalMax: 100 }), // the horizontal fov (by preset) or this vertical one, whichever is narrower, sets the focal length
  near: .2, // nothing nearer than this (camera depth) is drawn
  // Tim, 2026-11-06 ("the camera should function essentially similar to the camera in Elden Ring: for the most part you're
  // controlling it, but sometimes it just helps you get around walls or just follows you"). Three parts:
  // assist: unlocked, the view follows the way you travel, slowly: the travel heading is a low-passed walk direction (`headTau`
  // seconds; only once it is steady, `minHead` of a tile a second); the view's yaw rides a critically damped spring toward it
  // (`rate` per second, never faster than `maxRate` degrees a second); never within `deadband` degrees (no twitch from small
  // stick moves), never when walking toward the camera (more than `cone` degrees off), and only `delay` seconds after the
  // crescent was last touched, easing back in over `ramp` seconds. With save.closeViewAutoFollow off, it never follows.
  assist: Object.freeze({ delay: 1.2, ramp: 1.2, rate: 1.1, maxRate: 60, deadband: 6, cone: 100, headTau: .45, minHead: .35, reducedScale: .45 }),
  // lock: Elden Ring's lock-on (the button at the top of the crescent). A tap locks the best foe in front of the camera within
  // `range` tiles and `cone` degrees of the view, that the Wayfarer can see (no wall between): the lowest score of
  // wAngle x (angle off the view / cone) + wDist x (distance / range). While locked the view turns to keep it framed (a damped
  // spring at `rate`), the stick is target-relative (up walks at it, sideways circles it) and swings and shots aim at it (the
  // game's own lock). A swipe along the crescent of `switchSwipe` px moves the lock to the next foe that way, within
  // `switchCone` degrees. It breaks when the foe dies (then it moves to the best foe within `rehop` tiles of where it fell, if
  // any), goes beyond range + `slack`, or stays out of sight `lostSec` seconds.
  // Second targeting pass (Tim, 2026-11-11: "the targeting is still kind of weird... we need better targeting"): every locked
  // swing is acceleration limited: it gathers speed at most `accel` degrees a second squared and eases into its goal (a switch or a fall no longer snaps the view from rest to full speed in one frame). `reverse`: how
  // hard a swing already under way may be turned back the other way (degrees a second squared).
  lock: Object.freeze({ near: 1.5 /* nearby framing slows, but never stops */, range: 11, cone: 70, wAngle: .6, wDist: .4, rate: 4.5, maxRate: 120, nearScale: .35, fallbackRange: 6, fallbackCone: 100, switchSwipe: 26, switchCone: 120, rehop: 4.5, slack: 1.5, lostSec: 1.2, accel: 900, reverse: 1800 }),
  // Target mode (Tim, 2026-11-11: "he never has to move the camera to find enemies"): the Target button switches auto-targeting
  // on (the button lit red) and off. While on, every `scanSec` seconds (a bounded pass over the floor's foes; the wall line is
  // walked only for a foe that would beat the best so far) it locks the best foe in sight anywhere round the Wayfarer within the
  // lock's range, by wDist x (distance / range) + wAngle x (angle off the view / 180): the camera and the Wayfarer turn to it.
  // When the lock falls, breaks or is lost, it locks the next one. A foe that comes within `threatRange` tiles and `nearerBy`
  // tiles nearer than the locked one takes the lock, at most once every `switchHold` seconds (a manual swipe restarts that
  // wait). Locked in target mode the view holds the foe harder: spring `rate`, at most `maxRate` degrees a second.
  // Strafe (every lock): with the stick mostly sideways (its toward/away share under `strafeForward`) the Wayfarer circles at
  // the distance held when the strafe began: `strafeGain` x the radial error (tiles) is mixed in, at most `strafePull`.
  targetButton: Object.freeze({ on: "#ff2d2d", locked: "#ff8a78", off: "#ddd5c4", glow: "drop-shadow(0 0 6px #ff2d2dcc)" }), // the Target button's ink: target mode on (red), a tap lock alone, off
  // Second pass (2026-11-11): one priority for every choice (the first lock, the next after a fall, a better foe while
  // locked): score = wDist x (distance / range) + wAngle x (angle off the view / 180) - wClose x (how far inside threatRange)
  // - wAggro if it has noticed the Wayfarer - wWindup if it is winding up a blow; lowest wins. So a foe close in front comes
  // first, then one attacking, then the nearest. The first lock no longer prefers a far foe ahead and then flips to a near one
  // behind a second later. Locked, a foe takes the lock only if its score beats the locked one's by `switchMargin`, at most
  // once every switchHold; but a foe within `reach` tiles (a weapon's length) while the locked one is out of reach and
  // `nearerBy` tiles further takes it after only `reachHold` seconds, so the swing goes at the foe in your face (a swipe
  // choice keeps the full switchHold). In target mode the next foe after a fall is chosen by the same score, not by where the
  // old one fell. `markSec`: a new lock's ring closes in on the foe over this long, from `markScale` times its brackets.
  // `lostSec`: target mode's lock is sticky, held this long out of sight (the plain lock's lock.lostSec, 1.2, dropped a foe
  // that stepped behind a pillar), and while it is hidden the view coasts to a stop rather than halting dead.
  // `occludedAlpha`: the brackets' strength while the locked foe is briefly out of sight. `edge`: px inside the screen's edge
  // for the pointer to a locked foe off screen.
  targetMode: Object.freeze({ scanSec: .2, wDist: .55, wAngle: .3, wClose: .35, wAggro: .08, wWindup: .2, switchMargin: .1, reach: 2, reachHold: .25, threatRange: 3.5, nearerBy: 1.5, switchHold: .9, rate: 9, maxRate: 270, strafeForward: .35, strafeGain: 4, strafePull: .6, lostSec: 2.4, markSec: .4, markScale: 1.9, occludedAlpha: .38, edge: 26 }),
  // crescent: the pan rail, a thin arc round the outside of the action cluster, `gap` px beyond the cluster's half width, from
  // `from` degrees (screen angles: 0 is right, -90 up, 180 left) round over the top and down the left side to `to` degrees.
  // It is drawn `width` px wide at `idle` opacity (`active` while touched) and answers within `band` px of the arc; it sits
  // beneath the buttons, so where a button overlaps the band the button wins. Sliding along it turns the view, `yaw` radians per
  // px of arc (clockwise turns right); moving away from the cluster tilts it up a little (`radialPitch` x the pitch rate).
  // A double tap on it puts the view back behind the Wayfarer.
  // Version 3 (Tim: "the Bullseye lock should be ... off to the side of the screen, not in the center of the Crescent... I
  // don't want my camera maneuvering interrupted by the lock"): the lock button is off the arc, a bullseye (a `lockSize`
  // px touch target) at the screen's right edge (`lockEdge` px in), `lockGap` px above the top of the crescent's band. It locks only on a
  // tap that starts on it (a press and release on it within `tapMove` px); a drag on the crescent holds its own pointer, so
  // it never reaches the lock. And (the 787 review: the crescent ran over Spell B) each end of the arc is drawn back, in
  // `step` degree steps out from `mid`, to the last point whose band stays `clear` px off every other control in #actions
  // (the lock button too) and `edge` px inside the screen; never shorter than `minSpan` degrees each side of `mid`.
  crescent: Object.freeze({ gap: 24, band: 16, width: 7, from: -32, to: 162, idle: .22, active: .62, yaw: .012, radialPitch: .5, pitch: .0035, pitchRange: Object.freeze([-.22, .32]),
    doubleTapMs: 340, tapMs: 260, tapMove: 10, recentreRate: 7,
    lockSize: 52, lockTapMove: 18, lockEdge: 6, lockGap: 16, mid: -90, // a forgiving lock touch target, independent of camera-drag slop
    clear: 6, edge: 4, step: 2, minSpan: 24,
    // version 4 (Tim: "larger/higher sensitivity... your finger should be able to be positioned a little bit farther out from
    // the buttons and still swipe"): beyond the drawn arc the crescent also answers `reach` px further out (a second, wider band,
    // never drawn), along the part of the arc where that band keeps `clear` px off every other control and the lock, stays
    // `edge` px inside the screen and never comes left of `stickShare` of the screen's width (where the movement stick lives).
    // Turning: `gain` x `yaw` radians a px of the finger's own travel round the cluster, times up to 1 + `accel` for a fast
    // swipe (from `accelFrom` to `accelTo` px a second: slow moves stay precise, a flick turns far); the turn is eased in at
    // `smooth` per second over the next frames (the finger's events arrive unevenly; the view turns evenly), and whatever is
    // left is applied on release.
    reach: 46, stickShare: .5, gain: 1.35, accel: 1.1, accelFrom: 160, accelTo: 900, smooth: 24 }),
  // Drag-anywhere (version 4, Tim's call for release 793; the usual phone layout of third-person action games): the default
  // camera control (save.closeViewCamera "drag"; "crescent" keeps the pan crescent). A drag that starts on open screen right of
  // `side` of its width turns the view and keeps it until the finger lifts, over buttons too; a touch that starts on a button is
  // that button's; the left side stays the movement stick, so a thumb on each moves and looks at once. `yaw` radians and `pitch`
  // (of the tilt's range, as the crescent) a px of drag, times the player's sensitivity (save.closeViewSensitivity, from
  // `sensitivity` min to max, 1 by default) and up to 1 + `accel` for a fast swipe (`accelFrom` to `accelTo` px a second). A
  // press that hardly moves (`tapMove` px, `tapMs`) is still a tap on the world (aim, act). Eased like the crescent (`smooth`).
  drag: Object.freeze({ side: .5, yaw: .0087, pitch: .0035, accel: .8, accelFrom: 260, accelTo: 1600, tapMove: 10, tapMs: 300, smooth: 32, sensitivity: Object.freeze([.4, 2.5]) }),
  controls: Object.freeze(["drag", "crescent"]), defaultControl: "drag",
  // The quick turnaround (version 4, Tim: the quick 180 of survival horror): with the stick held back toward the camera (within
  // `stickCone` degrees of straight back, past `stickMin`), a camera drag swiping down the screen (at least `swipePx` px, at
  // `swipeSpeed` px a second or faster, no more than `slant` px across for each px down) swings the view round behind the
  // Wayfarer, who turns to face the new way: a critically damped swing of `seconds` (`reducedSeconds` with reduced motion),
  // ending in the standard view (the tilt let go) looking forward over their back. The walk is not touched: the stick's basis
  // stays latched for as long as it is held, so they keep walking the new way. At most one every `cooldown` seconds. Locked on,
  // it breaks the lock (`lock: "break"`): turning your back on a foe is choosing to leave it, and a lock that dragged the view
  // straight back round would undo the turn.
  quickTurn: Object.freeze({ seconds: .3, reducedSeconds: .1, stickCone: 40, stickMin: .45, swipePx: 44, swipeSpeed: 550, slant: .7, cooldown: .4, lock: "break" }),
  turn: Object.freeze({
    cone: 100, // walking toward the camera (more than this many degrees off the view) never swings it round
    reducedScale: .45, // with reduced motion the view turns this much slower
    moveEps: .0004, // squared tiles per frame below which the Wayfarer is standing still
  }),
  input: Object.freeze({ idle: .06 }), // stick magnitude below which a new gesture starts (the input basis re-latches to the view)
  // cutPad: a face this close (tiles) to the line from the camera to the Wayfarer is ghosted; it unghosts only beyond
  // cutPad x cutHold (hysteresis), and its alpha eases at cutFade per second, so walls never flicker in and out
  walls: Object.freeze({ height: 2.4, rubble: .8, cutAlpha: .22, cutPad: .35, cutHold: 1.7, cutFade: 6 }),
  // version 2: further and gentler, so boundaries stay readable; 64 colour levels (24 stepped visibly as a face's light changed)
  fog: Object.freeze({ near: 3.2, far: 12, color: Object.freeze([9, 9, 12]), levels: 64, gamma: 1 }),
  light: Object.freeze({
    radius: 6.2, // the torch's reach
    inner: .28, // full light out to this share of the reach
    ambient: .2, // what the darkness never quite hides (version 2: raised from .1, so the room's edges read)
    flicker: 0, flickerMs: 160, // the torch's breathing: version 2 stills it (it shifted every wall's light frame to frame)
    dreadShrink: .45, // a Pentagon floor's dread (0..1) shrinks the reach by up to this share
    warm: "rgba(255,168,92,0.09)", // the torch's warm cast round the Wayfarer
  }),
  actors: Object.freeze({ back: Object.freeze({ hood: "#79877b", seam: "#5d695f", rect: Object.freeze([-.14, -.71, .28, .18]) }), atlas: 1600 /* device pixels of atlas height below the ground texture; a sprite takes at most a third of it (version 5: the nearest, atmosphere.sprite.nearShare) */, cutAlpha: .4, halfWidth: 1.05, height: 2.35, below: .55, fade: .9, sprite: 1, maxSprite: 1.6 }), // sprite box in tiles (times the creature's scale)
  // Solid creatures (Tim, 2026-11-11: "the monsters are still pretty ephemeral and spectral... a little bit see-through. Make
  // them firm and concrete, so they come into view easily and stay in view"). A creature was faded by the distance fog across
  // the whole view (from `fog.near`, about 3 tiles from the camera) and eased in from nothing; the GPU drew that as a 4x4
  // screen-door dither, so anything a few tiles off showed the floor through it. Now a creature is fully solid in view, and
  // only in the last `edge` tiles before the fog's far end does it thin out, crisply, where it leaves the view. What makes a
  // creature see-through is its design alone: `spectral` kinds (by their presentation profile's `spectral` flag) and
  // designed states (phasing, a departing fade) keep their own opacity (actor-presentation.ts); `spectralAlpha` is the
  // standing opacity of a spectral kind (the GPU adds a cold rim light so it still reads).
  creatures: Object.freeze({ edge: 1.5, spectralAlpha: .8 }),
  shade: Object.freeze({ x: .7, y: 1 }), // faces across x (east/west) take less of the torch than faces across y
  // Boundaries (version 2, Tim: "you couldn't really figure out which was what, and what the boundaries of everything were"):
  // every wall face has a dark outline on its corners and foot, a lighter cap line along its top (the wall's top edge, its
  // cornice; the camera stays below the tops, so a cap is seen as this edge), and a darker baseboard band; the floor takes a
  // contact shadow along every wall's foot and a rim round holes, drops and lava (`edges`, built once a floor into a shadow
  // canvas, `px` pixels a tile). Billboards stand on a soft contact shadow.
  edges: Object.freeze({ seam: .6, outline: "rgba(6,5,8,0.85)", outlineWidth: 1.5, cap: .05, capLight: 1.45, base: .1, baseDark: .55, shadow: .32, shadowAlpha: .55, px: 22,
    hole: "rgba(0,0,0,0.6)", holeRim: "rgba(230,214,170,0.75)", lava: "rgba(255,120,40,0.85)", drop: "rgba(120,200,255,0.7)" }),
  contact: Object.freeze({ radius: .27, flat: .55, alpha: .38 }), // a creature's or the Wayfarer's shadow: radius (tiles x its scale), at most `flat` as deep as wide, its darkness
  // version 3 (2026-11-06, Tim: walls "smooth because of like future technology, that's just old"): `inlay` draws the faint
  // seams of the walls' panels (CLOSE_VIEW.grit.inlay, one stroke a face) in place of version 2's brick mortar; `detail` lays
  // the sparse grit textures (CLOSE_VIEW.grit) on faces nearer than `detailFar` camera-depth tiles, fading in from `detailNear`.
  quality: Object.freeze({
    low: Object.freeze({ sprite: .6, floorBands: 12, texScale: .75, radius: 6.5, fogGradient: false, warm: false, bands: 1, inlay: false, detail: false, detailNear: 0, detailFar: 0, ao: false, vignette: false, outline: true, edgeFills: false,
      gl: true, glScale: .75, mip: true, aniso: 2, ceiling: true, ceilingDetail: false, relief: false, lavaLight: false, lights: 3, motes: false, bump: false, cards: 10 }), // low: the edges as one stroke a face (no cap or baseboard fills), no seams, no grit
    balanced: Object.freeze({ sprite: .85, floorBands: 20, texScale: 1, radius: 8, fogGradient: true, warm: true, bands: 1, inlay: true, detail: true, detailNear: 4.5, detailFar: 7, ao: true, vignette: true, outline: true, edgeFills: true,
      gl: true, glScale: .8, mip: true, aniso: 4, ceiling: true, ceilingDetail: true, relief: true, lavaLight: true, lights: 5, motes: false, bump: true, cards: 20 }),
    full: Object.freeze({ sprite: 1, floorBands: 28, texScale: 1.25, radius: 9.5, fogGradient: true, warm: true, bands: 2, inlay: true, detail: true, detailNear: 6, detailFar: 9, ao: true, vignette: true, outline: true, edgeFills: true,
      gl: true, glScale: 1, mip: true, aniso: 8, ceiling: true, ceilingDetail: true, relief: true, lavaLight: true, lights: 8, motes: true, bump: true, cards: 28 }),
  }),
  // The walls' surface (version 3, Tim, 2026-11-06: "smooth because of like future technology, that's just old... maybe some
  // things grow on there... most of the time it's just clean because of the technology... some of it could be gritty, and
  // some of it could be falling apart... the forms and things that we're seeing are functional equivalents that our mind can
  // process, not necessarily the real thing"). Mostly seamless, ancient panels with a faint inlaid seam; here and there,
  // chosen once per wall face from its tile, its side and the floor (wallGeometry, never per frame), a texture over the face:
  // inlaid glyph traces, grime streaks, a crack, spalling, growth creeping up from the foot, pale filaments, exposed lattice
  // where a panel has fallen away, and rarely a panel that does not quite resolve (a slow faint shimmer, still with reduced
  // motion). Each texture is painted once into a small canvas (`size` px, `instances` of each, seeded) the first time a frame
  // wants detail; frames only copy them onto faces. Weights are out of their sum. Faces of a style not in `styles` (doors,
  // hedges, rubble) stay plain. `light`: a texture's strength follows its face's light to this power.
  grit: Object.freeze({
    version: 1, size: Object.freeze([64, 154]), instances: 2, salt: 0x6c1f3a, light: .7,
    styles: Object.freeze(["keepWall", "aptWall", "cellarWall", "hiveWall", "default"]),
    // the seam: a faint line round the room at `row` (a share of the height from the foot) and a panel joint every `joint`
    // tiles along a run, in the face's colour taken `mix` of the way toward `tint` and lit `lift` times the face
    inlay: Object.freeze({ row: .72, joint: 3, tint: Object.freeze([150, 205, 215]), mix: .25, lift: 1.12 }),
    variants: Object.freeze([
      Object.freeze({ id: "clean", weight: 52 }),
      Object.freeze({ id: "glyph", weight: 13, alpha: .8, traces: 3, color: "150,215,228", a: .2 }),
      Object.freeze({ id: "grime", weight: 11, alpha: .9, streaks: 9, color: "10,9,8", a: .36 }),
      Object.freeze({ id: "crack", weight: 6, alpha: 1, branches: 3, color: "6,6,8", a: .66, rim: "225,230,226", rimA: .16 }),
      Object.freeze({ id: "spall", weight: 5, alpha: 1, chips: 7, color: "12,11,10", a: .5, rim: "210,206,196", rimA: .2 }),
      Object.freeze({ id: "growth", weight: 6, alpha: .95, blobs: 60, reach: .55, color: "58,92,54", a: .45, tip: "120,160,96" }),
      Object.freeze({ id: "filament", weight: 3, alpha: .9, strands: 5, color: "196,232,214", a: .22 }),
      Object.freeze({ id: "lattice", weight: 3, alpha: 1, color: "4,4,6", a: .8, grid: "150,200,210", gridA: .28, cells: 7 }),
      Object.freeze({ id: "unresolved", weight: 1.5, alpha: .8, color: "200,226,240", a: .32, frames: 3, shimmer: .45, period: 6400 }),
    ]),
  }),
  // One material and one light for the whole place (version 3, Tim: "made more cohesive"): every wall style but the door is taken `unify`
  // of the way toward the shared `base` colour (the grey-blue of the floors' stone; the floor itself is left as drawn, so its
  // telegraphs keep their full colour), so walls and floor read as one built surface; the vault overhead closes in (`vault`: the dark's opacity at the screen's
  // top, clear by `vaultTo` of the way down to the aim point); inside corners take ambient occlusion, a soft shadow `ao.width`
  // of a face wide and `ao.alpha` deep at the corner. `vault` and `ao` are off on the low tier (quality.*.ao).
  material: Object.freeze({ base: Object.freeze([88, 90, 96]), unify: .42, vault: .5, vaultTo: .9,
    ao: Object.freeze({ width: .3, alpha: .5, px: 32 }) }),
  // How creatures read from the close camera (version 3, Tim: "monsters phasing in and out of view depending on where the
  // camera is... the way the monsters' attacks are"). `fade`: a creature's opacity eases toward what its light, fog and the
  // cut-away ask at this rate (per second), so nothing pops; it comes into sight from 0 (no longer: a creature's
  // opacity follows CLOSE_VIEW.creatures, and `fade` eases only how far a wall hides it). `ghost`: seen through a wall that
  // stands between it and the camera, it is drawn again over the wall at this opacity (eased the same way), never lost.
  // `windup`: a creature winding up an attack glows (`glowRGB`, pulsing every `pulseMs` between `glow` and `glowPeak`) with a
  // ring on the floor at its feet; `flash`: a creature just struck flashes light for its hit flash (game.ts's hitFlash,
  // `flashSec` long) at up to this opacity. All tiers: these are what a fight needs to read.
  // Version 4: the GPU scene (close-view-gl.ts; quality.*.gl, glScale (of the screen's own resolution), mip, aniso). Without
  // WebGL2 the 2D view of version 3 draws instead. `maskMs`: how often the hazard mask (one texel a tile) follows what the fog of
  // war has revealed. `ringWidth`: a wind-up ring's line, a share of its radius.
  gl: Object.freeze({ maskMs: 250, ringWidth: .14 }),
  // Delayed primary Echoes are short-lived geometry in the existing additive decal batch. `segments` is the
  // maximum curve subdivision; `cap` bounds admitted cues by quality (each cue has at most actual + memory).
  echoRibbon: Object.freeze({ segments: 7, cap: Object.freeze({ low: 3, balanced: 4, full: 6 }), height: Object.freeze([.72, .96]), width: Object.freeze({ thrust: .13, sweep: .1 }), actual: Object.freeze({ alpha: .88, color: 0xc9a7ff }), memory: Object.freeze({ alpha: .18, color: 0xd8c8ff }) }),
  // The ceiling (version 4, Tim: "there should be a ceiling... you should feel like you're enclosed"): a plane at the walls'
  // tops, the one material taken down to `dim`, with a seam round every tile, a beam every `beamEvery` tiles each way
  // (`beamHalf` tiles each side of its line, `beamDark` as bright, its edges lit `beamEdge`), lit from the torch below and faded
  // into the fog like the floor. Over open-air tiles (a yard, a roof) there is none: the dark sky. Low tier: plain, no beams.
  ceiling: Object.freeze({ dim: .5, beamEvery: 3, beamHalf: .16, beamDark: .6, beamEdge: .05 }),
  // Pits, holes and drops (version 4, Tim: "the holes and so on... look weird"): the view follows the ray down through the
  // hole's tiles to the first inner wall it meets (stone, strata every third of a tile, darkening `dark` a tile down) or its
  // bottom (`hole` tiles deep; a chasm `chasm` deep, with its far pale light); a lit lip, `lip` tiles wide, rims every drop on
  // the floor's side and the top of its inner walls. A safe drop's lip glows green near the Wayfarer, as the top-down view's rim
  // does (HOLE_DROPS.rim).
  pits: Object.freeze({ hole: 1.6, chasm: 7, dark: 1.5, lip: .07, stone: Object.freeze([66, 64, 66]), lipRGB: Object.freeze([176, 168, 150]), chasmRGB: Object.freeze([90, 140, 190]) }),
  // Lava: a slow moving surface (two layers of noise at `scale` a tile, flowing at `flow`; still with reduced motion), crust,
  // heat and bright veins, a cooler crust where it meets the floor, and its light thrown on the floor within about `reach`
  // tiles (balanced and full), `light` strong.
  lava: Object.freeze({ scale: 1.4, flow: .35, light: .55, reach: 2.6, crust: Object.freeze([40, 10, 6]), hot: Object.freeze([236, 92, 22]), vein: Object.freeze([255, 214, 120]) }),
  // The walls' relief (version 4, Tim: walls "look like they're just 3D render[ed]... more highly textured or more detailed"):
  // each tile of wall holds two recessed panels, below and above the inlaid seam, `inset` tiles in from their edges, `recess` as
  // bright, with bevels `bevel` tiles wide lit from above (dark under the top edge, light along the foot); each panel takes its
  // own shade within `vary`; a baseboard (edges.base of the height) with a lit lip, and a cornice (`cornice` of the height)
  // under the cap with a groove. `topFall`: the wall's top is this bright against its foot (the torch is at hand height).
  relief: Object.freeze({ inset: .07, bevel: .035, recess: .92, vary: .05, cornice: .05, outline: .55, topFall: .62 }),
  // Floor features drawn flat on the floor (version 4): marks in the ground, daises, and a ladder down through a hatch, which
  // version 3 stood up as cards.
  flat: Object.freeze({ kinds: Object.freeze(["wayfindingCue", "pentWaysign", "shelterHazard", "displacementTrap", "warpDais"]), stairDirs: Object.freeze(["down"]) }),
  // Atmosphere (version 5, release 794; Tim, 2026-11-06: "all the keeps, all the labyrinths and close views should be an
  // oppressive, dark, ancient structure... some can be lit up (e.g. keeps with royal family members, even those can be ghost
  // family members)... the Pentagon should really have the feel of a [gothic] chalice dungeon... stone sewers... root
  // cellars, dirt walls... even the well-lit rooms... were still kind of weird and detailed and structured, a little bit
  // oppressive... it seems like you're just in a room instead of in an environment or atmosphere"). Original work in that
  // spirit: a theme per place (closeViewTheme) sets the walls' material, the floor, the ceiling, the trim, the decorations and
  // props, the light (its colour, the ambient, the placed sources) and the air (fog, a low haze, a colour grade, a vignette).
  // Colours are 0..255. The Pentagon is a tomb and sewer (`rootCellarShare` of its floors, and every cellar, a root cellar);
  // keeps and castles are cold dressed stone (`livedInShare` of them lived in: warmer, tapestries, some lights burning with
  // ghost-light); hives are chitin and resin with a dim bioluminescence; arcologies are an old machine's failing panels.
  // Every choice is a hash of the building and its floor: never stored, never per frame.
  // wall.kind: 0 coursed stone, 1 packed dirt and timber, 2 chitin, 3 machine panels, 6 a starship's clean panels; stone: course height, block length,
  // bevel, roughness (tiles); damp: height of the wet foot (tiles) and how wet; topFall: how bright the wall's top stays.
  // floor.kind: the shader's floorMat for an ordinary floor (0 flagstones, 6 dirt, 7 resin, 10 plating; a rug, planks or
  // mosaic keep their own); size: a flagstone's course; sewer: a channel down the middle of passages.
  // ceiling.kind: 0 a ribbed vault (bays of `bay` tiles), 1 timber beams, 2 organic ribs, 3 conduits, 4 a starship's clean panels; dark: how far up into
  // the dark the vault's webs go. arch: an arch over each doorway (spring height, radius: 0 a flat lintel; band: voussoirs).
  // pilaster: one every this many tiles along a straight wall (0 none); plinth, cornice: height, depth (tiles).
  // light: the carried light (colour, reach, strength, height) and the ambient; sources: placed lights on `share` of the wall
  // faces, at least `spacing` tiles apart (`reach`, `strength`; `hue` 0 warm, 1 bioluminescent, 2 ghost-light, 3 a failing
  // lamp; `ghost`: the share burning with ghost-light; `candles`: the share of inside corners with candles on the floor).
  // fog: colour, near, far; haze: density a tile and height, its colour. grade: tint (rgb) and contrast. vignette.
  // deco1/deco2: cloth and its trim (banners, tapestries); glow: a hive's or machine's light in its walls.
  // decor: shares of wall faces with each decoration; props: shares of wall-side places with each prop.
  themes: Object.freeze({
    version: 1, salt: "close-view-theme", livedInShare: .16, rootCellarShare: .18,
    pentagon: Object.freeze({ label: "Pentagon: a tomb beneath the corridor",
      wall: Object.freeze({ kind: 0, rgb: Object.freeze([96, 90, 80]), mortar: Object.freeze([20, 18, 16]), stone: Object.freeze([.27, .62, .05, .9]), damp: Object.freeze([.85, .8]), dampRGB: Object.freeze([128, 140, 128]), topFall: .32 }),
      floor: Object.freeze({ kind: 0, rgb: Object.freeze([82, 76, 66]), joint: Object.freeze([16, 15, 13]), rug: Object.freeze([70, 22, 20]), size: .58, wear: .6, wet: .35, sewer: true, remap: Object.freeze({ 2: 0, 3: 1, 4: 0, 5: 0, 10: 0 }) }), // remap: the tomb's floors are stone (planks and tiles to flags, rugs to an old mosaic)
      ceiling: Object.freeze({ kind: 0, rgb: Object.freeze([70, 66, 60]), bay: 2, rib: .09, dark: .85 }),
      arch: Object.freeze({ spring: 1.72, radius: .5, band: .15 }), pilaster: 4, plinth: Object.freeze([.2, .07]), cornice: Object.freeze([.16, .08]),
      light: Object.freeze({ torch: Object.freeze([255, 182, 124]), reach: 5.4, strength: 1.7, height: 1.15, ambient: Object.freeze([10, 10, 12]),
        sources: Object.freeze({ share: .1, spacing: 5, reach: 4.2, strength: 1.5, hue: 0, ghost: 0, candles: .3 }) }),
      fog: Object.freeze({ rgb: Object.freeze([6, 6, 7]), near: 2.4, far: 11.5, haze: Object.freeze([.09, .7]), hazeRGB: Object.freeze([16, 15, 14]) }),
      grade: Object.freeze([1, .96, .9, 1.14]), vignette: .58, deco1: Object.freeze([70, 20, 18]), deco2: Object.freeze([150, 120, 70]), glow: Object.freeze([255, 150, 80]),
      decor: Object.freeze({ niche: .05, roots: .06, banner: .02 }), props: Object.freeze({ urn: .06, coffin: .035, bones: .07, rubble: .05, chain: .04, web: .5 }) }),
    rootCellar: Object.freeze({ label: "Pentagon: a root cellar",
      wall: Object.freeze({ kind: 1, rgb: Object.freeze([70, 52, 36]), mortar: Object.freeze([20, 15, 10]), stone: Object.freeze([.3, .7, .05, .9]), damp: Object.freeze([.6, .5]), dampRGB: Object.freeze([150, 146, 140]), topFall: .3 }),
      floor: Object.freeze({ kind: 6, rgb: Object.freeze([70, 54, 38]), joint: Object.freeze([20, 15, 10]), rug: Object.freeze([60, 30, 18]), size: .6, wear: .3, wet: .1, sewer: false, remap: Object.freeze({ 1: 0, 4: 0, 5: 0, 10: 0 }) }), // remap: in a root cellar, laid stone and tiles are packed dirt too
      ceiling: Object.freeze({ kind: 1, rgb: Object.freeze([50, 36, 24]), bay: 1, rib: .1, dark: .8 }),
      arch: Object.freeze({ spring: 1.8, radius: 0, band: .2 }), pilaster: 0, plinth: Object.freeze([0, 0]), cornice: Object.freeze([0, 0]),
      light: Object.freeze({ torch: Object.freeze([255, 160, 90]), reach: 5, strength: 1.7, height: 1.15, ambient: Object.freeze([9, 8, 7]),
        sources: Object.freeze({ share: .07, spacing: 6, reach: 3.6, strength: 1.4, hue: 0, ghost: 0, candles: .4 }) }),
      fog: Object.freeze({ rgb: Object.freeze([6, 5, 4]), near: 2.2, far: 10.5, haze: Object.freeze([.12, .6]), hazeRGB: Object.freeze([18, 14, 10]) }),
      grade: Object.freeze([1.08, .96, .82, 1.1]), vignette: .6, deco1: Object.freeze([60, 40, 22]), deco2: Object.freeze([120, 90, 50]), glow: Object.freeze([255, 150, 80]),
      decor: Object.freeze({ roots: .45 }), props: Object.freeze({ urn: .05, bones: .04, rubble: .07, web: .6 }) }),
    keep: Object.freeze({ label: "Keep: cold dressed stone",
      wall: Object.freeze({ kind: 0, rgb: Object.freeze([92, 94, 98]), mortar: Object.freeze([22, 22, 24]), stone: Object.freeze([.36, .85, .04, .45]), damp: Object.freeze([.5, .45]), dampRGB: Object.freeze([158, 168, 164]), topFall: .4 }),
      floor: Object.freeze({ kind: 0, rgb: Object.freeze([82, 82, 84]), joint: Object.freeze([18, 18, 20]), rug: Object.freeze([66, 20, 24]), size: .7, wear: .4, wet: .12, sewer: false }),
      ceiling: Object.freeze({ kind: 0, rgb: Object.freeze([66, 66, 70]), bay: 3, rib: .11, dark: .8 }),
      arch: Object.freeze({ spring: 1.72, radius: .5, band: .15 }), pilaster: 3, plinth: Object.freeze([.22, .07]), cornice: Object.freeze([.18, .09]),
      light: Object.freeze({ torch: Object.freeze([255, 188, 136]), reach: 5.6, strength: 1.45, height: 1.15, ambient: Object.freeze([10, 11, 14]),
        sources: Object.freeze({ share: .08, spacing: 5, reach: 4.4, strength: 1.4, hue: 0, ghost: 0, candles: .12 }) }),
      fog: Object.freeze({ rgb: Object.freeze([6, 7, 9]), near: 2.6, far: 12, haze: Object.freeze([.07, .8]), hazeRGB: Object.freeze([14, 16, 20]) }),
      grade: Object.freeze([.94, .98, 1.06, 1.12]), vignette: .62, deco1: Object.freeze([58, 22, 26]), deco2: Object.freeze([150, 128, 80]), glow: Object.freeze([150, 190, 230]),
      decor: Object.freeze({ banner: .07, slit: .3, niche: .02 }), props: Object.freeze({ urn: .03, rubble: .05, bones: .02, chain: .03, web: .4 }) }),
    livedIn: Object.freeze({ label: "Keep: lived in (a household of ghosts)",
      wall: Object.freeze({ kind: 0, rgb: Object.freeze([104, 96, 86]), mortar: Object.freeze([26, 22, 18]), stone: Object.freeze([.36, .85, .035, .35]), damp: Object.freeze([.35, .25]), dampRGB: Object.freeze([178, 178, 174]), topFall: .5 }),
      floor: Object.freeze({ kind: 0, rgb: Object.freeze([88, 80, 70]), joint: Object.freeze([22, 18, 14]), rug: Object.freeze([92, 24, 30]), size: .7, wear: .25, wet: .08, sewer: false }),
      ceiling: Object.freeze({ kind: 1, rgb: Object.freeze([60, 44, 30]), bay: 1, rib: .1, dark: .7 }),
      arch: Object.freeze({ spring: 1.72, radius: .5, band: .15 }), pilaster: 3, plinth: Object.freeze([.22, .07]), cornice: Object.freeze([.18, .09]),
      light: Object.freeze({ torch: Object.freeze([255, 184, 120]), reach: 5.8, strength: 1.65, height: 1.15, ambient: Object.freeze([14, 13, 14]),
        sources: Object.freeze({ share: .16, spacing: 3.5, reach: 4.8, strength: 1.5, hue: 0, ghost: .4, candles: .35 }) }),
      fog: Object.freeze({ rgb: Object.freeze([8, 8, 10]), near: 3, far: 13, haze: Object.freeze([.06, .9]), hazeRGB: Object.freeze([18, 18, 22]) }),
      grade: Object.freeze([1.02, .98, .96, 1.06]), vignette: .5, deco1: Object.freeze([96, 22, 30]), deco2: Object.freeze([176, 150, 92]), glow: Object.freeze([150, 190, 230]),
      decor: Object.freeze({ tapestry: .14, banner: .08, slit: .2 }), props: Object.freeze({ urn: .04, chain: .01, web: .2 }) }),
    hive: Object.freeze({ label: "Hive: chitin and resin",
      wall: Object.freeze({ kind: 2, rgb: Object.freeze([60, 44, 42]), mortar: Object.freeze([12, 8, 10]), stone: Object.freeze([.3, .6, .05, .6]), damp: Object.freeze([1.2, .7]), dampRGB: Object.freeze([140, 128, 128]), topFall: .3 }),
      floor: Object.freeze({ kind: 7, rgb: Object.freeze([46, 32, 34]), joint: Object.freeze([10, 6, 8]), rug: Object.freeze([50, 20, 24]), size: .6, wear: .2, wet: .6, sewer: false }),
      ceiling: Object.freeze({ kind: 2, rgb: Object.freeze([40, 28, 30]), bay: 2, rib: .1, dark: .85 }),
      arch: Object.freeze({ spring: 1.65, radius: .5, band: .2 }), pilaster: 0, plinth: Object.freeze([0, 0]), cornice: Object.freeze([0, 0]),
      light: Object.freeze({ torch: Object.freeze([236, 176, 128]), reach: 5, strength: 1.6, height: 1.15, ambient: Object.freeze([7, 8, 10]),
        sources: Object.freeze({ share: .12, spacing: 4, reach: 3.6, strength: 1.2, hue: 1, ghost: 0, candles: 0 }) }),
      fog: Object.freeze({ rgb: Object.freeze([5, 6, 7]), near: 2.2, far: 10.5, haze: Object.freeze([.12, .7]), hazeRGB: Object.freeze([10, 16, 16]) }),
      grade: Object.freeze([.92, 1.02, 1, 1.12]), vignette: .62, deco1: Object.freeze([40, 30, 30]), deco2: Object.freeze([80, 60, 50]), glow: Object.freeze([70, 230, 190]),
      decor: Object.freeze({ pods: .16 }), props: Object.freeze({ bones: .05, rubble: .03, web: .3 }) }),
    biomechanicalKeep: Object.freeze({ label: "Old Keep: ribbed metal and chitin",
      wall: Object.freeze({ kind: 2, rgb: Object.freeze([68, 72, 66]), mortar: Object.freeze([16, 18, 17]), stone: Object.freeze([.3, .65, .05, .6]), damp: Object.freeze([.8, .55]), dampRGB: Object.freeze([140, 145, 126]), topFall: .3 }),
      floor: Object.freeze({ kind: 10, rgb: Object.freeze([62, 65, 58]), joint: Object.freeze([15, 17, 16]), rug: Object.freeze([42, 43, 37]), size: .6, wear: .55, wet: .3, sewer: false, remap: Object.freeze({ 0:10, 1:10, 2:10, 3:10, 4:10, 5:10 }) }),
      ceiling: Object.freeze({ kind: 2, rgb: Object.freeze([48, 52, 47]), bay: 2, rib: .1, dark: .7 }),
      arch: Object.freeze({ spring: 1.9, radius: .45, band: .16 }), pilaster: 0, plinth: Object.freeze([.12, .04]), cornice: Object.freeze([.10, .04]),
      light: Object.freeze({ torch: Object.freeze([245, 190, 132]), reach: 5.4, strength: 1.7, height: 1.15, ambient: Object.freeze([12, 13, 12]),
        sources: Object.freeze({ share: .09, spacing: 5, reach: 4.2, strength: 1.5, hue: 3, ghost: 0, candles: 0 }) }),
      fog: Object.freeze({ rgb: Object.freeze([6, 8, 7]), near: 2.6, far: 12, haze: Object.freeze([.08, .7]), hazeRGB: Object.freeze([15, 18, 15]) }),
      grade: Object.freeze([.98, 1.02, .95, 1.1]), vignette: .5, deco1: Object.freeze([42, 46, 40]), deco2: Object.freeze([112, 110, 86]), glow: Object.freeze([170, 205, 140]),
      decor: Object.freeze({ vent: .07, roots: .05 }), props: Object.freeze({ rubble: .03, chain: .02, web: .15 }) }),
    // Seed realms (seed-realms.ts, Tim 2026-11-11: "more sci-fi, instead of like a dirty old asylum or laboratory"): the Drifting
    // Ship's own look. wall.kind 6: clean brushed composite panels with crisp seams, a light strip at head height and a kick strip
    // (close-view-gl.ts); its lights are strips (hue 4: cool, no flame, no bracket); no damp, grit, webs or rubble.
    starship: Object.freeze({ label: "Starship: clean composite panels and light strips",
      wall: Object.freeze({ kind: 6, rgb: Object.freeze([120, 130, 142]), mortar: Object.freeze([16, 20, 26]), stone: Object.freeze([.34, .8, .02, .2]), damp: Object.freeze([0, 0]), dampRGB: Object.freeze([150, 160, 170]), topFall: .55 }),
      floor: Object.freeze({ kind: 10, rgb: Object.freeze([78, 86, 96]), joint: Object.freeze([20, 24, 30]), rug: Object.freeze([40, 48, 60]), size: .6, wear: .1, wet: .35, sewer: false }),
      ceiling: Object.freeze({ kind: 4, rgb: Object.freeze([62, 70, 80]), bay: 3, rib: .08, dark: .5 }),
      arch: Object.freeze({ spring: 2.05, radius: 0, band: .2 }), pilaster: 0, plinth: Object.freeze([0, 0]), cornice: Object.freeze([0, 0]),
      light: Object.freeze({ torch: Object.freeze([205, 225, 255]), reach: 6, strength: 1.7, height: 1.15, ambient: Object.freeze([12, 14, 18]),
        sources: Object.freeze({ share: .14, spacing: 4, reach: 4.6, strength: 1.5, hue: 4, ghost: 0, candles: 0 }) }),
      fog: Object.freeze({ rgb: Object.freeze([4, 6, 10]), near: 3, far: 13, haze: Object.freeze([.04, .8]), hazeRGB: Object.freeze([10, 14, 22]) }),
      grade: Object.freeze([.94, 1, 1.08, 1.08]), vignette: .5, deco1: Object.freeze([40, 48, 60]), deco2: Object.freeze([120, 160, 200]), glow: Object.freeze([140, 210, 255]),
      decor: Object.freeze({}), props: Object.freeze({}) }),
    arcology: Object.freeze({ label: "Arcology: an old machine, failing",
      wall: Object.freeze({ kind: 3, rgb: Object.freeze([70, 76, 74]), mortar: Object.freeze([14, 15, 15]), stone: Object.freeze([.34, .8, .04, .4]), damp: Object.freeze([.6, .45]), dampRGB: Object.freeze([152, 158, 142]), topFall: .4 }),
      floor: Object.freeze({ kind: 10, rgb: Object.freeze([60, 64, 62]), joint: Object.freeze([12, 13, 13]), rug: Object.freeze([40, 40, 46]), size: .6, wear: .5, wet: .2, sewer: false }),
      ceiling: Object.freeze({ kind: 3, rgb: Object.freeze([46, 50, 50]), bay: 2, rib: .1, dark: .7 }),
      arch: Object.freeze({ spring: 2.05, radius: 0, band: .35 }), pilaster: 4, plinth: Object.freeze([.14, .05]), cornice: Object.freeze([.12, .06]),
      light: Object.freeze({ torch: Object.freeze([232, 196, 150]), reach: 5.4, strength: 1.6, height: 1.15, ambient: Object.freeze([9, 11, 11]),
        sources: Object.freeze({ share: .09, spacing: 5, reach: 4.2, strength: 1.3, hue: 3, ghost: .3, candles: 0 }) }),
      fog: Object.freeze({ rgb: Object.freeze([5, 7, 7]), near: 2.6, far: 12, haze: Object.freeze([.08, .8]), hazeRGB: Object.freeze([12, 16, 15]) }),
      grade: Object.freeze([.92, 1.02, .98, 1.1]), vignette: .56, deco1: Object.freeze([30, 34, 32]), deco2: Object.freeze([90, 96, 80]), glow: Object.freeze([150, 220, 160]),
      decor: Object.freeze({ vent: .1 }), props: Object.freeze({ rubble: .06, chain: .02, web: .25 }) }),
    ...CLOSE_VIEW_DEEP.themes, // 2026-11-11: the Deep (CLOSE_VIEW_DEEP)
  }),
  // The atmosphere's budget and feel (version 5). `lights`: placed sources lit a frame at most (the nearest in reach; per tier
  // in quality.*.lights); `flicker`: their gentle breathing (amount, period ms), held still with reduced motion; `flame`: a
  // source's drawn flame (half width, half height) and halo (radius), tiles; `motes`: dust drifting in the light of the
  // nearest `of` sources (`per` each; full tier only); `props`: at most `cards` card props (cobwebs, chains, bones) a frame (never within `nearCam` of the camera),
  // within `reach` tiles; `silhouette`: the Wayfarer's colour where a wall hides them (a creature's: `silhouetteFoe`), at
  // `silAlpha`; `sprite`: billboards at device resolution up to `cap` x CSS px, the nearest taking up to `nearShare` of the
  // atlas; `boardLight`: a creature card's light, floor and ceiling (so a foe in the dark still reads); `nearFade`: with the camera close, the Wayfarer is never fainter than this.
  atmosphere: Object.freeze({ lights: 8, flicker: Object.freeze([.12, 210]), flame: Object.freeze([.06, .12, .6]), motes: Object.freeze({ per: 9, of: 3, size: .022, alpha: .5, drift: .25 }),
    props: Object.freeze({ cards: 28, reach: 9, nearCam: 1.1 }), silhouette: Object.freeze([150, 200, 230]), silhouetteFoe: Object.freeze([220, 90, 70]), silAlpha: .7, sprite: Object.freeze({ cap: 3, nearShare: .55 }),
    boardLight: Object.freeze([.42, 1.25]), nearFade: .8 }),
  cues: Object.freeze({ fade: 7, ghost: .34, glowRGB: "255,96,64", glow: .32, glowPeak: .62, pulseMs: 150, ringWidth: 2.5, ringAlpha: .8, ring: .5, flash: .75, flashSec: .18, glowPx: 64 }),
  styles: Object.freeze({ // wall colours by tile kind (a face, and its darker second tone)
    keepWall: ["#6b6255", "#3a342c"], aptWall: ["#74787b", "#4a4e52"], cellarWall: ["#3a352e", "#1e1b17"], hiveWall: ["#5a3f66", "#2f2238"],
    hedgeWall: ["#2f552b", "#1d331b"], rubbleFloor: ["#4e463c", "#2e2922"], door: ["#3a2a1d", "#21170f"], default: ["#5a544c", "#2f2b26"], // door: a way out at the floor's edge
  }),
  // Between the two cameras (Tim's update, 2026-11-06: the Pentagon's open-air parts keep the top-down view; going back
  // inside, Close View takes over again): a short blend, never a hard cut, and an instant switch with reduced motion. Only one
  // view is ever drawn per frame; the view being left is a snapshot of its last frame (one canvas copy), faded out.
  // Entering: the camera comes down from over the Wayfarer's shoulder (`from`) to its place behind them. Leaving: the top-down
  // view starts zoomed in (`leaveZoom`) and settles. `settle`: on the same floor, a change of tile must hold this long first.
  blend: Object.freeze({ seconds: .42, fade: .65, leaveZoom: 1.7, settle: 120, gap: 500, fogShift: 1.6,
    from: Object.freeze({ height: 2.2, distance: 1.1, lookAhead: .5, lookHeight: 0 }) }),
  // Taps on creatures: a billboard answers a tap this many CSS pixels beyond its drawn body, the nearest body centre winning.
  pick: Object.freeze({ pad: 34, bodyWidth: .8, bodyTop: 1.25 }),
  // The aim mark: a chevron on the floor this far ahead of the Wayfarer, the way a swing or a shot will go.
  aim: Object.freeze({ ahead: 1.7, size: .17, color: "rgba(255,228,170,0.42)" }),
  groundTilePx: 44, // the renderer's tile size once its canvas is 12 tiles wide or more
  maxItems: 4096,
});

// Hooks the hosts fill in: a canvas factory (tests give a recording one), extra ground layers (main.ts's traps, aperture marks
// and ranged effects; the Proving Ground's ranged effects), drawn onto the ground texture after the renderer, and `art`, a map
// from creature kind to a phase-2 close-view drawer.
export const CLOSE_VIEW_HOOKS = { makeCanvas: null, groundLayers: [], art: Object.create(null), navigationDoors: null, gl: null }; // gl: false keeps the 2D view (the lab's ?cvGL=0)

// Save (additive, schema 14): save.closeView, true when the player has chosen Close View for interiors. Off by default.
// save.closeViewPreset: one of CLOSE_VIEW.presets' keys (the standard one unless chosen).
// save.closeViewAutoFollow: false when the player has turned the view's auto-follow off (it is on unless chosen off).
// save.closeViewCamera (version 4): "drag" (drag anywhere on the right, the default) or "crescent" (the pan crescent).
// save.closeViewSensitivity (version 4): the camera's turn rate, 1 unless chosen (CLOSE_VIEW.drag.sensitivity's range).
export function ensureCloseView(s) { if (s && typeof s === "object") { s.closeView = s.closeView === true; s.overworldCloseView = s.overworldCloseView === true; if (!Object.hasOwn(CLOSE_VIEW.presets, s.closeViewPreset)) s.closeViewPreset = CLOSE_VIEW.defaultPreset; s.closeViewAutoFollow = s.closeViewAutoFollow !== false;
  if (!CLOSE_VIEW.controls.includes(s.closeViewCamera)) s.closeViewCamera = CLOSE_VIEW.defaultControl;
  const k = Number(s.closeViewSensitivity), [lo, hi] = CLOSE_VIEW.drag.sensitivity; s.closeViewSensitivity = Number.isFinite(k) ? Math.max(lo, Math.min(hi, k)) : 1; } return s; }
export const closeViewControl = (g) => g?.save?.closeViewCamera === "crescent" ? "crescent" : "drag";
export const closeViewPreset = (g) => CLOSE_VIEW.presets[g?.save?.closeViewPreset] || CLOSE_VIEW.presets[CLOSE_VIEW.defaultPreset];
// Shared imported/native routing: supported v2 Cleaver actions never inherit
// the persisted v1 choreography frame, while old v1/v2 records keep it exactly.
export function closeViewMeleeVisualRoute(record, active = false) {
  const normalized=normalizeMeleeActionVisual(record?.meleeAction),meleeAction=active&&(normalized?.v===1||normalized?.v===2)?normalized:null;
  return {meleeAction,legacyCleaverFrame:normalized?.v===1&&normalized.kind==='verge-cleaver'&&record?.primaryMotion?.v===2};
}

const WALL_EXEMPT = /water|ocean|shallow|lava|river|canyon|abyss|chasm|void|pit|sky|star|cloud/i;
const STILLWORKS_AIR = Object.freeze({ near: 9, far: 22, ambient: [.32, .39, .50], fog: [.038, .051, .077], haze: [.14, .19, .27], hazeBand: [.08, .42] });
const WORLD_AIR = Object.freeze({ ambient: [.82, .86, .89], fog: [.19, .24, .28], haze: [.30, .36, .41], hazeBand: [.04, .25] });
const EMPTY_GEOMETRY = new Float32Array(0);
const OPEN_WORLD_GEOMETRY = Object.freeze({ faces: EMPTY_GEOMETRY, detail: EMPTY_GEOMETRY, detailInst: EMPTY_GEOMETRY, joint: EMPTY_GEOMETRY, C: 8, cw: 0, ch: 0 });
const OPEN_WORLD_STATIC = Object.freeze({ verts: 0, data: EMPTY_GEOMETRY, lights: EMPTY_GEOMETRY, flames: EMPTY_GEOMETRY, cards: EMPTY_GEOMETRY, nLights: 0, nFlames: 0, nCards: 0, inlay: new Float32Array(9) });
export const stillworksCloseView = map => !!(map?.pentArena && map.building?.arena && map.stillworks?.walkerCloseView);
// The Void Walker arena has its own open-air scene. Other finale maps and outdoor sections use the world camera.
export function interiorMap(map) {
  if (map?.stillworks) return stillworksCloseView(map);
  return !!map?.building && !map.building.finale && (!map.landscape || (interiorTerrain(map) && map.tiles?.length <= 4096 && map.width <= 64 && map.height <= 64)) && !map.skyCloud && !map.movers?.length && !map.canopy;
}
// An open-air tile inside an interior's map (a keep's yard, a labyrinth court): the ordinary view there.
const OPEN_AIR_KINDS = new Set(["yardGrass"]);
export function openAirAt(map, x, y) { const w = Math.max(1, Number(map?.width) || 32), t = map?.tiles?.[Math.floor(y + .75) * w + Math.floor(x + .5)]; return !!t && (t.courtyard === true || t.openAir === true || t.pentRoof === true || t.pentBalcony === true || OPEN_AIR_KINDS.has(t.kind)); }
// The place's theme (CLOSE_VIEW.themes, version 5): from what the floor is (its building's kind) and a hash of the building
// and the floor, so the same floor always looks the same. Returns the theme's id. Pure.
const themeRoll = (key, salt) => (strHash(`${CLOSE_VIEW.themes.salt}:${CLOSE_VIEW.themes.version}:${key}:${salt}`) % 10000) / 10000;
export function closeViewThemeId(b) {
  const T = CLOSE_VIEW.themes; if (!b || typeof b !== "object") return "keep"; const key = String(b.base || "");
  if (b.interiorVersion === 5 && b.style === "keep" && !b.pentagon && biomechanicalKeep(b.appearance)) return "biomechanicalKeep";
  if (b.pentagon) return b.kind === "cellar" || themeRoll(key, `root:${b.floor}:${b.node}`) < T.rootCellarShare ? "rootCellar" : "pentagon";
  if (b.style === "hive") return "hive";
  if (b.style === "apartment") return "arcology";
  return themeRoll(key, "lived") < T.livedInShare ? "livedIn" : "keep"; // keeps, castles, compounds' keeps, a keep's labyrinth, any other building
}
export const closeViewThemeLivedIn = (base) => themeRoll(String(base || ""), "lived") < CLOSE_VIEW.themes.livedInShare; // for the lab: which keeps are lived in
const THEME_OF = new WeakMap();
const SEED_REALM_THEMES = Object.freeze({ ship: "starship", husk: "rootCellar" }); // seed realms (seed-realms.ts): the ship's clean panels, the husk's mine timbers
// 2026-11-11: a floor of the Deep takes its environment's theme (CLOSE_VIEW_DEEP; `none` for a floor laid without one); another
// dungeon laid in one of those environments (a Proving Ground fixture) takes it too. Buildings keep theirs.
export function closeViewDeepThemeId(map) {
  const D = CLOSE_VIEW_DEEP, env = D.byEnv[map?.theme];
  if (Number(map?.deepFloor) > 0) return env || D.none;
  return !map?.building && env ? env : null;
}
const mapThemeId = (map) => SEED_REALM_THEMES[map?.seedRealm?.realm] || closeViewDeepThemeId(map) || closeViewThemeId(map?.building);
export function closeViewTheme(map) { let id = map && THEME_OF.get(map); if (!id) { id = mapThemeId(map); if (map && typeof map === "object") THEME_OF.set(map, id); } return { id, ...CLOSE_VIEW.themes[id] }; }
const themeOf = (map) => { let id = map && THEME_OF.get(map); if (!id) { id = mapThemeId(map); if (map && typeof map === "object") THEME_OF.set(map, id); } return CLOSE_VIEW.themes[id]; };
const indoorCloseViewMap = g => !!g?.player && g.area === "dungeon" && interiorMap(g.map);
const indoorCloseViewTile = g => indoorCloseViewMap(g) && !openAirAt(g.map, g.player.x, g.player.y);
// Where Close View may be used (Tim, 2026-11-11: "Close View is for closer exploration and souls-like combat when
// you want it"): the overworld, every building interior (keeps, castles, compounds, great buildings, hives, arcologies, the
// Pentagon and its arenas, a keep's Cube labyrinth), the Stillworks, seed realms, the Skylands (and a great tree's canopy),
// the Deep's endless descent (the Listener's Descent too), and the Proving Ground's scratch fixtures. Dive sites and grottoes,
// and ordinary dungeons and crossings (their annexes, the Threefold Deep, the Starfield Deep Annex, hunts and portals), are
// refused: there the Oculus answers with `occluded`, the same words show once as you walk in with Close View on
// (closeViewOccludedOnEntry), and both save switches are left exactly as they were, so Close View comes back on leaving.
export const CLOSE_VIEW_PLACES = Object.freeze({ version: 1, occluded: "The view is occluded.",
  allowed: Object.freeze({ overworld: true, keep: true, pentagon: true, cube: true, hive: true, arcology: true, stillworks: true, seedRealm: true, deep: true, sky: true, lab: true, underwater: false, crossing: false }) });
// What kind of place the Game stands in, for the table above. Pure.
export function closeViewPlace(g) {
  if (!g || g.area !== "dungeon") return "overworld";
  const m = g.map && typeof g.map === "object" ? g.map : {}, b = m.building && typeof m.building === "object" ? m.building : null;
  if (m.stillworks) return "stillworks";
  if (m.seedRealm) return "seedRealm";
  if (Number(m.deepFloor) > 0) return "deep"; // the-deep.ts: a floor of a Deep Shaft or the Listener's Descent
  if (b) return b.pentagon || m.pentArena ? "pentagon" : b.labyrinth ? "cube" : b.style === "hive" ? "hive" : b.style === "apartment" ? "arcology" : "keep";
  if (m.skyCloud || m.canopy) return "sky"; // Skylands, a great tree's canopy
  if (m.underwater) return "underwater"; // dive sites and grottoes (Tim, 2026-11-11: no Close View there)
  if (String(m.id || "").startsWith("proving:")) return "lab";
  return "crossing";
}
export const closeViewPlaceAllowed = (g) => CLOSE_VIEW_PLACES.allowed[closeViewPlace(g)] === true;
// On entering a place (Game.loadArea, once per entry): the HUD's words when Close View is on and this place refuses it, else null.
export const closeViewOccludedOnEntry = (g) => g?.area === "dungeon" && (g.save?.overworldCloseView === true || g.save?.closeView === true) && !closeViewPlaceAllowed(g) ? CLOSE_VIEW_PLACES.occluded : null;
export function overworldCloseViewApplies(g) {
  if (g?.save?.overworldCloseView !== true || !g.player || indoorCloseViewTile(g) || !closeViewPlaceAllowed(g)) return false;
  const map = g.map, count = map?.tiles?.length, width = Number(map?.width) || (g.area === "dungeon" ? 24 : 32);
  const height = Number(map?.height) || count / width;
  return Number.isSafeInteger(count) && count > 0 && count <= 16384
    && Number.isSafeInteger(width) && width > 0 && width <= 128
    && Number.isSafeInteger(height) && height > 0 && height <= 128 && width * height === count;
}
export function closeViewWanted(g) { return (g?.save?.closeView === true && indoorCloseViewMap(g)) || overworldCloseViewApplies(g); }
export function closeViewApplies(g) { return (g?.save?.closeView === true && indoorCloseViewTile(g)) || overworldCloseViewApplies(g); }
const openWorldScene = g => g.area !== "dungeon" || !!(g.map.skyCloud || g.map.canopy || g.map.underwater || g.map.stillworks)
  || openAirAt(g.map, g.player.x, g.player.y);

// ------------------------------------------------------------------------------------------------ state, all preallocated
const CAM = { rigActive: false, rigIndex: 0, rigPending: 0, rigHold: 0, rigOffset: 0, rigOffsetV: 0, shoulderRoom: 0, shoulderClearFor: 0, pausedAt: NaN, pausedTotal: 0, qtFrom: 0, qtTo: 0, qtT0: -1, qtDur: 0, qtAt: -1e9, fpx: NaN, fpy: NaN, fvx: 0, fvy: 0, yawV: 0, headX: 0, headY: 0, bodyYaw: NaN, bodyDesiredYaw: NaN, bodyTransient: false, bodyRevision: 0, targetRevision: 0, targetRecentre: false, lockId: null, lostFor: 0, targetMode: false, tmScan: 0, tmHeld: 0, tmManual: false, lockW: 0, lockWAt: -1e9, markId: null, markAt: -1e9, strafeR: NaN, strafeId: null, basisHold: false, basisFollow: false, distV: 0, crane: 1.6, craneV: 0, shoulderV: 0, turnHeld: 0, pitchUser: 0, panAt: -1e9, recentre: NaN, centeredRear: false, map: null, yaw: 0, inputYaw: 0, dist: 2.6, shoulder: 0, lastX: 0, lastY: 0, lastNow: 0, dt: 0, drawn: false, steered: false, sx: 0, sy: 0,
  focal: 1, focalV: 0,
  // the map the camera last chose a view for (its area and section), and a pending snap of every spring (CLOSE_VIEW.camera.crossing)
  area: "", secX: 0, secY: 0, snapNext: false,
  // the calm pass (CLOSE_VIEW.camera.outdoor and .vertical): the open overworld's map (its edges are open ground) and boom;
  // the eased height anchor; the terrain rise and the share of the boom the terrain keeps, with their let-out holds
  edgeMap: null, outdoorBoom: false, zA: NaN, zAV: 0, tRise: 0, tRiseV: 0, tRiseFor: 0, tKeep: 1, tKeepV: 0, tKeepFor: 0, shown: 2.6,
  // the last frame's projection (for taps): camera, basis, focal length, principal point, pitch
  cx: 0, cy: 0, fx: 0, fy: -1, rx: 1, ry: 0, F: 1, ppx: 0, ppy: 0, cosP: 1, sinP: 0, hc: 1, w: 0, h: 0, valid: false };
const GROUND = { atlasY: 0, canvas: null, ctx: null, W: 0, H: 0, ts: 1, torch: null, torchX: NaN, torchY: NaN, torchR: NaN, failed: false };
// cached screen gradients, each rebuilt only when the canvas or its size changes (keys are numbers: nothing is built per frame)
const SCREEN = { ctx: null, fog: null, fogEnd: 0, fogW: 0, fogH: 0, fogY: NaN, vignette: null, vigW: 0, vigH: 0, warm: null, warmW: 0, warmH: 0, vault: null, vaultH: 0, vaultY: NaN };
let capturing = false, captured = null, capturedPlayer = null, bareFloor = false, worldCapture = false;
let N = CLOSE_VIEW.maxItems;
let itemKind = new Int8Array(N), itemRef = new Int32Array(N), itemDepth = new Float32Array(N), order = new Int32Array(N);
let faceCorner = new Int8Array(N), faceXY = new Float32Array(N * 8), faceLevel = new Int16Array(N), faceAlpha = new Float32Array(N), faceStyle = new Int16Array(N), faceOrient = new Int8Array(N), faceLow = new Int8Array(N);
let faceGeo = new Int32Array(N), faceU0 = new Float32Array(N), faceU1 = new Float32Array(N); // the face's index in its floor's geometry, and the share of its width on screen (after the near-plane cut)
const boardFoe = []; // the creature each billboard is (or null), by item: what the art hook draws
let boardSX = new Int32Array(N), boardSY = new Int32Array(N), boardPW = new Int32Array(N), boardPH = new Int32Array(N), boardX = new Float32Array(N), boardY = new Float32Array(N), boardK = new Float32Array(N), boardB = new Float32Array(N), boardScale = new Float32Array(N);
let boardWX = new Float32Array(N), boardWY = new Float32Array(N), boardOcc = new Float32Array(N); // a billboard's foot in the world, and how much of it a wall hides from the camera (eased, 0..1)
function grow() { N *= 2; const re = (A, n) => { const b = new A.constructor(n); b.set(A); return b; };
  faceCorner = re(faceCorner, N); itemKind = re(itemKind, N); itemRef = re(itemRef, N); itemDepth = re(itemDepth, N); order = re(order, N); faceXY = re(faceXY, N * 8); faceLevel = re(faceLevel, N); faceAlpha = re(faceAlpha, N); faceStyle = re(faceStyle, N); faceOrient = re(faceOrient, N); faceLow = re(faceLow, N); faceGeo = re(faceGeo, N); faceU0 = re(faceU0, N); faceU1 = re(faceU1, N);
  boardSX = re(boardSX, N); boardSY = re(boardSY, N); boardPW = re(boardPW, N); boardPH = re(boardPH, N); boardX = re(boardX, N); boardY = re(boardY, N); boardK = re(boardK, N); boardB = re(boardB, N); boardScale = re(boardScale, N); boardWX = re(boardWX, N); boardWY = re(boardWY, N); boardOcc = re(boardOcc, N); }

// What the last frame cost (tests and the Proving Ground read it).
// Per-stage milliseconds of the last frame, while `on` (the diagnostic probe's switch, as renderer.ts's renderTimings).
export const closeViewTimings = { on: false, ground: 0, torch: 0, floor: 0, scene: 0, overlay: 0 };
export const closeViewStats = { rigProbes: 0, rigSamples: 0, sightCuts: 0, terrainPulls: 0, snapshots: 0, frames: 0, faces: 0, facesCut: 0, boards: 0, bands: 0, wallBuilds: 0, culled: 0, detailed: 0, gl: 0, flat: 0 };
// Last completed scene, not the most recent GPU attempt. Reuse existing fallback
// objects on commit; allocate detached display snapshots only when requested.
const RENDER_DIAGNOSTICS={activityValid:false,frame:0,backend:'none',player:'absent',actors:0,nativeActors:0,fallbacks:null};
const DIAGNOSTIC_FALLBACKS=new Set(['custom-art','body','capture','visibility','special-form','foundry-role','foundry-action','foundry-movement','morphology','pack-effects','pack-action','pack-phase','elite-action','decorations','affix','attachment-budget']);
// Visible-canvas owners may retire activity without touching camera/input state.
export function invalidateCloseViewDiagnostics(){RENDER_DIAGNOSTICS.activityValid=false;}
export function closeViewRenderDiagnostics(){
  const fallbacks={};for(const [reason,count] of Object.entries(RENDER_DIAGNOSTICS.fallbacks||{}))if(DIAGNOSTIC_FALLBACKS.has(reason)&&Number.isSafeInteger(count)&&count>0)fallbacks[reason]=Math.min(999,count);
  return {active:RENDER_DIAGNOSTICS.activityValid&&CAM.drawn,frame:RENDER_DIAGNOSTICS.frame,backend:RENDER_DIAGNOSTICS.backend,player:RENDER_DIAGNOSTICS.player,actors:RENDER_DIAGNOSTICS.actors,nativeActors:RENDER_DIAGNOSTICS.nativeActors,fallbacks,asset:closeViewHeroAssetStatus(),gpu:closeViewGLDiagnostics()};
}


// ------------------------------------------------------------------------------------------------ colours, built once
const STYLE_NAMES = Object.keys(CLOSE_VIEW.styles), STYLE_INDEX = Object.fromEntries(STYLE_NAMES.map((k, i) => [k, i]));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// A style's colour in the shared material (CLOSE_VIEW.material: `unify` of the way toward its `base`)
const material = (hex) => { const M = CLOSE_VIEW.material; return rgb(hex).map((v, i) => v + (M.base[i] - v) * M.unify); };
// FACE_LUT[style][orient][band][level] / INLAY_LUT[style][level]: rgb() strings, mixed toward the fog colour.
const L = CLOSE_VIEW.fog.levels, FOG = CLOSE_VIEW.fog.color;
const mix = (c, b) => `rgb(${Math.round(FOG[0] + (c[0] - FOG[0]) * b)},${Math.round(FOG[1] + (c[1] - FOG[1]) * b)},${Math.round(FOG[2] + (c[2] - FOG[2]) * b)})`;
const FACE_LUT = STYLE_NAMES.map((k) => { const c = (k === "door" ? rgb : material)(CLOSE_VIEW.styles[k][0]); return [CLOSE_VIEW.shade.x, CLOSE_VIEW.shade.y].map((sh) => [1, .72].map((band) => Array.from({ length: L }, (_, i) => mix(c, sh * band * i / (L - 1))))); });
const GRIT = CLOSE_VIEW.grit, INL = GRIT.inlay, GRIT_STYLE = new Uint8Array(STYLE_NAMES.length);
for (const k of GRIT.styles) if (k in STYLE_INDEX) GRIT_STYLE[STYLE_INDEX[k]] = 1;
const INLAY_LUT = STYLE_NAMES.map((k) => { const c = material(CLOSE_VIEW.styles[k][0]).map((v, i) => Math.min(255, (v + (INL.tint[i] - v) * INL.mix) * INL.lift)); return Array.from({ length: L }, (_, i) => mix(c, i / (L - 1))); });
const FOG_CSS = `rgb(${FOG[0]},${FOG[1]},${FOG[2]})`, fogA = (a) => `rgba(${FOG[0]},${FOG[1]},${FOG[2]},${a})`;

// ------------------------------------------------------------------------------------------------ wall geometry, per floor
// faces: [x0, y0, x1, y1, nx, ny, tileX, tileY, style, low] per exposed edge of a wall tile, bucketed in 8x8 chunks.
const wallCache = new WeakMap();
const isWall = (t) => !!t && t.blocked === true && !t.chasm && !t.doorway && !WALL_EXEMPT.test(String(t.kind || ""));
function blockedSignature(tiles) { let n = 0; for (let i = 0; i < tiles.length; i++) if (tiles[i]?.blocked) n += i + 1; return n; }
export function wallGeometry(map) {
  const tiles = map.tiles, w = Math.max(1, Number(map.width) || 32), h = Math.max(1, Number(map.height) || Math.floor(tiles.length / w)), now = Date.now();
  let geo = wallCache.get(map);
  const terrainSig = interiorTerrainSignature(map), buildRevision = buildVisualRevision(map);
  if (geo && geo.tiles === tiles && geo.terrainSig === terrainSig && geo.buildRevision === buildRevision && (now - geo.checked < 500 || (geo.checked = now, blockedSignature(tiles) === geo.sig))) return geo;
  closeViewStats.wallBuilds++;
  const list = [], at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : tiles[y * w + x]), solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || isWall(at(x, y));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = at(x, y); if (!isWall(t)) continue; const st = STYLE_INDEX[t.kind] ?? STYLE_INDEX.default, low = t.kind === "rubbleFloor" ? 1 : 0;
    if (!solid(x, y - 1)) list.push(x + 1, y, x, y, 0, -1, x, y, st, low); // north face, wound so its outward normal is on the left of (x0,y0)->(x1,y1)
    if (!solid(x, y + 1)) list.push(x, y + 1, x + 1, y + 1, 0, 1, x, y, st, low);
    if (!solid(x - 1, y)) list.push(x, y, x, y + 1, -1, 0, x, y, st, low);
    if (!solid(x + 1, y)) list.push(x + 1, y + 1, x + 1, y, 1, 0, x, y, st, low); }
  // An open tile at the floor's edge (a door out, a gap): a dark door face on its outer edge, so the view never looks out past
  // the floor's end into nothing (seen from inside, it is the faces of the walls beyond the map that close it)
  const door = STYLE_INDEX.door;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (isWall(at(x, y))) continue;
    if (y === 0) list.push(x, 0, x + 1, 0, 0, 1, x, y, door, 0); if (y === h - 1) list.push(x + 1, h, x, h, 0, -1, x, y, door, 0);
    if (x === 0) list.push(0, y + 1, 0, y, 1, 0, x, y, door, 0); if (x === w - 1) list.push(w, y, w, y + 1, -1, 0, x, y, door, 0); }
  const faces = Float32Array.from(list), n = faces.length / 10, C = 8, cw = Math.ceil(w / C), ch = Math.ceil(h / C), counts = new Int32Array(cw * ch + 1);
  const chunkOf = (i) => Math.min(ch - 1, Math.floor((faces[i * 10 + 1] + faces[i * 10 + 3]) / 2 / C)) * cw + Math.min(cw - 1, Math.floor((faces[i * 10] + faces[i * 10 + 2]) / 2 / C));
  for (let i = 0; i < n; i++) counts[chunkOf(i) + 1]++;
  for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
  const start = counts.slice(0, -1), fill = start.slice(), index = new Int32Array(n);
  for (let i = 0; i < n; i++) index[fill[chunkOf(i)]++] = i;
  // corner: bit 1 where a face's start is a corner (the wall turns, ends or a door is there), bit 2 its end. Along a straight run
  // of wall the faces meet flush and no edge is drawn between them; at a corner the outline marks where one wall stops.
  // ao (version 3): bit 1 where the face's start is an inside corner (the wall beside it comes out toward the room), bit 2 its
  // end: those corners take a soft shadow up the face (CLOSE_VIEW.material.ao)
  const corner = new Uint8Array(n), ao = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const o = i * 10, tx = faces[o + 6], ty = faces[o + 7], nx = faces[o + 4], ny = faces[o + 5], dx = Math.sign(faces[o + 2] - faces[o]), dy = Math.sign(faces[o + 3] - faces[o + 1]);
    if (faces[o + 8] === door) { corner[i] = 3; continue; }
    const goesOn = (sx, sy) => solid(tx + sx, ty + sy) && !solid(tx + sx + nx, ty + sy + ny) && !(tx + sx + nx < 0 || ty + sy + ny < 0 || tx + sx + nx >= w || ty + sy + ny >= h);
    corner[i] = (goesOn(-dx, -dy) ? 0 : 1) | (goesOn(dx, dy) ? 0 : 2);
    const inside = (sx, sy) => { const qx = tx + sx + nx, qy = ty + sy + ny; return qx >= 0 && qy >= 0 && qx < w && qy < h && solid(qx, qy); };
    if (!faces[o + 9]) ao[i] = (inside(-dx, -dy) ? 1 : 0) | (inside(dx, dy) ? 2 : 0); }
  geo = { terrainSig, buildRevision, tiles, w, h, faces, count: n, C, cw, ch, start, end: fill, index, sig: blockedSignature(tiles), checked: now, ghost: new Uint8Array(n), alpha: new Float32Array(n).fill(1), corner, ao, edges: null, ...wallDetail(map, faces, n) };
  wallCache.set(map, geo); return geo;
}

// ------------------------------------------------------------------------------------------------ the walls' surface (CLOSE_VIEW.grit)
// Chosen once per face when its floor's geometry is built: a pure function of the floor's name and size, the face's tile and
// its side, so a wall always shows the same surface (between frames, between visits, after a resume). detail[i]: the index
// of the face's variant in GRIT.variants (0, "clean", has no texture); inst[i]: which painted instance (low bits) and whether
// it is mirrored (bit 4); joint[i]: 1 when a panel joint falls at the face's start.
const hash32 = (a) => { a = Math.imul(a ^ (a >>> 16), 0x7feb352d); a = Math.imul(a ^ (a >>> 15), 0x846ca68b); return (a ^ (a >>> 16)) >>> 0; };
const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const GRIT_TOTAL = GRIT.variants.reduce((a, v) => a + v.weight, 0);
function wallDetail(map, faces, n) {
  const detail = new Uint8Array(n), inst = new Uint8Array(n), joint = new Uint8Array(n), floor = strHash(`${map?.name || ""}|${map?.width}|${map?.height}`) ^ GRIT.salt;
  for (let i = 0; i < n; i++) { const o = i * 10, st = faces[o + 8]; if (!GRIT_STYLE[st] || faces[o + 9]) continue; // doors, hedges and low rubble stay plain
    const tx = faces[o + 6], ty = faces[o + 7], nx = faces[o + 4], ny = faces[o + 5], side = nx > 0 ? 1 : nx < 0 ? 3 : ny > 0 ? 2 : 0;
    const h = hash32(floor ^ hash32((tx * 73856093) ^ (ty * 19349663) ^ (side * 83492791))), along = ny !== 0 ? tx : ty;
    joint[i] = ((along % INL.joint) + INL.joint) % INL.joint === 0 ? 1 : 0;
    let r = (h % 100000) / 100000 * GRIT_TOTAL, v = 0; while (v < GRIT.variants.length - 1 && r >= GRIT.variants[v].weight) { r -= GRIT.variants[v].weight; v++; }
    detail[i] = v; inst[i] = ((h >>> 20) % GRIT.instances) | ((h >>> 27) & 1 ? 16 : 0); }
  return { detail, detailInst: inst, joint };
}
// For tests and the lab report: the floor's per-face variant ids, in face order.
export function closeViewWallDetail(map) { const geo = wallGeometry(map); return Array.from(geo.detail, (v) => GRIT.variants[v].id); }
// The painted textures, GRIT_TEX[variant][instance]: built on the first frame that wants detail, then kept (a few hundred KB).
const GRIT_TEX = []; let gritFailed = false;
export const closeViewGritStats = { painted: 0 };
function gritTexture(v, k) {
  if (gritFailed) return null; const row = GRIT_TEX[v] || (GRIT_TEX[v] = []); if (row[k] !== undefined) return row[k];
  const c = makeCanvas(), x = c?.getContext?.("2d"); if (!x) { gritFailed = true; return null; }
  const [TW, TH] = GRIT.size; c.width = TW; c.height = TH; x.clearRect(0, 0, TW, TH);
  let a = (GRIT.salt ^ hash32(v * 977 + k * 131 + 7)) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const P = GRIT.variants[v], painter = GRIT_PAINT[P.id]; if (painter) painter(x, rnd, P, TW, TH);
  row[k] = c; closeViewGritStats.painted++; return c;
}
const rgba = (c, al) => `rgba(${c},${Math.max(0, Math.min(1, al)).toFixed(3)})`;
// One painter per variant: a few strokes and fills into the texture's canvas, from its own seeded random stream.
const GRIT_PAINT = {
  glyph(x, r, P, W, H) { // inlaid circuit traces: right-angled runs ending in a node, and a small glyph of three strokes
    x.lineCap = "square"; x.lineWidth = 1.2;
    for (let i = 0; i < P.traces; i++) { let px = Math.round(W * (.15 + r() * .7)), py = Math.round(H * (.25 + r() * .6)); x.strokeStyle = rgba(P.color, P.a * (.7 + r() * .5)); x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 4; s++) { if (s % 2) px = Math.round(Math.max(4, Math.min(W - 4, px + (r() - .5) * W * .6))); else py = Math.round(Math.max(6, py - H * (.06 + r() * .14))); x.lineTo(px, py); }
      x.stroke(); x.fillStyle = rgba(P.color, P.a * 1.6); x.beginPath(); x.arc(px, py, 1.8, 0, 6.2832); x.fill(); }
    const gx = W * (.3 + r() * .4), gy = H * (.12 + r() * .1); x.strokeStyle = rgba(P.color, P.a * 1.2); x.lineWidth = 1; x.beginPath();
    x.moveTo(gx - 5, gy); x.lineTo(gx + 5, gy); x.moveTo(gx, gy - 5); x.lineTo(gx + 4 * (r() - .5), gy + 6); x.moveTo(gx - 4, gy + 8); x.lineTo(gx + 4, gy + 4); x.stroke();
  },
  grime(x, r, P, W, H) { // streaks run down from the top, and the foot is dirtier
    for (let i = 0; i < P.streaks; i++) { const sx = r() * W, sw = 1 + r() * 3.5, len = H * (.18 + r() * .62), g = x.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, rgba(P.color, P.a * (.5 + r() * .5))); g.addColorStop(1, rgba(P.color, 0)); x.fillStyle = g; x.fillRect(sx, 0, sw, len); }
    const f = x.createLinearGradient(0, H, 0, H * .7); f.addColorStop(0, rgba(P.color, P.a * .8)); f.addColorStop(1, rgba(P.color, 0)); x.fillStyle = f; x.fillRect(0, H * .7, W, H * .3);
  },
  crack(x, r, P, W, H) { // a jagged crack down from the top with branches; a pale lip along one side catches the light
    const walk = (px, py, steps, dx) => { const pts = [[px, py]]; for (let s = 0; s < steps; s++) { px = Math.max(2, Math.min(W - 2, px + dx * 2 + (r() - .5) * 9)); py += H * (.03 + r() * .05); pts.push([px, py]); } return pts; };
    const main = walk(W * (.3 + r() * .4), 0, 12, r() - .5), lines = [main]; for (let b = 0; b < P.branches; b++) { const at = main[2 + Math.floor(r() * (main.length - 4))]; lines.push(walk(at[0], at[1], 3 + Math.floor(r() * 4), r() < .5 ? -1.5 : 1.5)); }
    for (const [pass, col, al, wd, off] of [[0, P.rim, P.rimA, 1, 1], [1, P.color, P.a, 1.6, 0]]) { x.strokeStyle = rgba(col, al); x.lineWidth = wd; x.beginPath(); for (const pts of lines) { x.moveTo(pts[0][0] + off, pts[0][1] + off * pass); for (const q of pts) x.lineTo(q[0] + off, q[1]); } x.stroke(); }
  },
  spall(x, r, P, W, H) { // a patch where the surface has flaked away from a corner, its aggregate showing, chips below
    const cx = r() < .5 ? W * .2 : W * .8, cy = r() < .6 ? H * (.08 + r() * .15) : H * (.6 + r() * .2), R = W * (.22 + r() * .14); x.beginPath();
    for (let i = 0; i < 11; i++) { const t = i / 11 * 6.2832, k = R * (.6 + r() * .55); x.lineTo(cx + Math.cos(t) * k, cy + Math.sin(t) * k * 1.3); } x.closePath();
    x.fillStyle = rgba(P.color, P.a); x.fill(); x.strokeStyle = rgba(P.rim, P.rimA); x.lineWidth = 1; x.stroke();
    x.fillStyle = rgba(P.rim, P.rimA * .9); for (let i = 0; i < 14; i++) x.fillRect(cx + (r() - .5) * R * 1.2, cy + (r() - .5) * R * 1.4, 1 + r() * 2, 1 + r() * 2);
    x.fillStyle = rgba(P.color, P.a * .8); for (let i = 0; i < P.chips; i++) x.fillRect(r() * W, H * (.86 + r() * .12), 1.5 + r() * 2.5, 1 + r() * 1.5);
  },
  growth(x, r, P, W, H) { // moss creeping up from the foot (thicker low down) and a few tendrils climbing past it
    for (let i = 0; i < P.blobs; i++) { const up = Math.pow(r(), 1.8) * P.reach, bx = r() * W, by = H * (1 - up), rad = (1.2 + r() * 3.6) * (1 - up / P.reach * .6);
      x.fillStyle = rgba(r() < .2 ? P.tip : P.color, P.a * (.6 + r() * .6)); x.beginPath(); x.arc(bx, by, rad, 0, 6.2832); x.fill(); }
    x.strokeStyle = rgba(P.color, P.a); x.lineWidth = 1.1; x.beginPath();
    for (let t = 0; t < 4; t++) { let px = r() * W, py = H * (1 - P.reach * .7); x.moveTo(px, py); for (let s = 0; s < 8; s++) { px += (r() - .5) * 6; py -= H * (.02 + r() * .03); x.lineTo(px, py); } } x.stroke();
  },
  filament(x, r, P, W, H) { // pale threads that wander across the panel and fork, each with a few beads
    x.lineWidth = .8;
    for (let i = 0; i < P.strands; i++) { let px = r() * W, py = r() * H, ang = r() * 6.2832; x.strokeStyle = rgba(P.color, P.a * (.6 + r() * .6)); x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 16; s++) { ang += (r() - .5) * .9; px += Math.cos(ang) * 5; py += Math.sin(ang) * 6; x.lineTo(px, py); } x.stroke();
      x.fillStyle = rgba(P.color, P.a * 1.8); x.beginPath(); x.arc(px, py, 1.3, 0, 6.2832); x.fill(); }
  },
  lattice(x, r, P, W, H) { // a panel fallen away: a dark recess with the structure's lattice behind, a lit lip along its lower edge
    const x0 = W * (.1 + r() * .2), y0 = H * (.18 + r() * .3), w = W * (.45 + r() * .3), h = H * (.22 + r() * .2), pts = [];
    for (let i = 0; i < 14; i++) { const t = i / 14, side = Math.floor(t * 4), u = t * 4 - side, j = () => (r() - .5) * 5; pts.push(side === 0 ? [x0 + w * u, y0 + j()] : side === 1 ? [x0 + w + j(), y0 + h * u] : side === 2 ? [x0 + w * (1 - u), y0 + h + j()] : [x0 + j(), y0 + h * (1 - u)]); }
    const path = () => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const q of pts) x.lineTo(q[0], q[1]); x.closePath(); };
    path(); x.fillStyle = rgba(P.color, P.a); x.fill(); x.save(); path(); x.clip(); x.strokeStyle = rgba(P.grid, P.gridA); x.lineWidth = 1; x.beginPath(); const step = w / P.cells;
    for (let k = -P.cells * 3; k <= P.cells * 3; k++) { x.moveTo(x0 + k * step, y0); x.lineTo(x0 + k * step + h, y0 + h); x.moveTo(x0 + k * step, y0 + h); x.lineTo(x0 + k * step + h, y0); } x.stroke(); x.restore();
    x.strokeStyle = rgba(P.grid, P.gridA * .9); x.lineWidth = 1.2; x.beginPath(); for (let i = 7; i <= 11; i++) { x.lineTo(pts[i % 14][0], pts[i % 14][1] + 1); } x.stroke();
  },
  unresolved(x, r, P, W, H) { // nested frames whose corners join the wrong frame: a shape the eye cannot settle
    const cx = W / 2, cy = H * (.4 + r() * .15); x.strokeStyle = rgba(P.color, P.a); x.lineWidth = 1;
    const fr = []; for (let i = 0; i < P.frames; i++) { const k = 1 - i * .28; fr.push([cx - W * .34 * k, cy - H * .24 * k, W * .68 * k, H * .48 * k]); x.strokeRect(...fr[i]); }
    x.beginPath(); for (let i = 0; i + 1 < fr.length; i++) { const a = fr[i], b = fr[i + 1]; x.moveTo(a[0], a[1]); x.lineTo(b[0] + b[2], b[1]); x.moveTo(a[0] + a[2], a[1] + a[3]); x.lineTo(b[0], b[1] + b[3]); } x.stroke();
    x.strokeStyle = rgba(P.color, P.a * .45); x.beginPath(); for (let k = 0; k < 9; k++) { const yy = cy - H * .24 + k * H * .06; x.moveTo(cx - W * .34, yy); x.lineTo(cx + W * .34, yy + (k % 2 ? 2 : -2)); } x.stroke();
  },
};
// A face's detail strength this frame: its light, its depth fade, and for an unresolved panel a slow breath (none with
// reduced motion: a still mid value). Exported for tests.
export function closeViewGritAlpha(v, level, depth, q, now = 0, reduce = false, phase = 0) {
  const P = GRIT.variants[v]; if (!P || !v || !q?.detail) return 0; const fade = depth <= q.detailNear ? 1 : depth >= q.detailFar ? 0 : 1 - (depth - q.detailNear) / (q.detailFar - q.detailNear);
  let a = (P.alpha ?? 1) * fade * Math.pow(Math.max(0, level) / (L - 1), GRIT.light);
  if (P.shimmer) a *= 1 - P.shimmer * (reduce ? .5 : .5 + .5 * Math.sin(now / P.period * 6.2832 + phase));
  return a;
}

// ------------------------------------------------------------------------------------------------ the camera
// One step of a critically damped spring of rate w (per second) for o[k] (its velocity in o[v]) toward target: exact for the
// step, so it is the same at 30 or 120 frames a second, and it never overshoots.
function spring(o, k, v, target, w, dt) { if (!(dt > 0)) { if (!Number.isFinite(o[k])) o[k] = target; return; } const y = o[k] - target, e = Math.exp(-w * dt), j = (o[v] + w * y) * dt; o[k] = target + (y + j) * e; o[v] = (o[v] - w * j) * e; }
const lerp = (a, b, t) => a + (b - a) * t, DEG = Math.PI / 180, wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const FACING_YAW = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
const footX = (p) => p.x + .5, footY = (p) => p.y + .75;
// Only on floor entry, choose a useful forward view with room for the actual camera rig.
// Later clearance changes never steer yaw or the movement basis.
function ensureCam(g) {
  cameraScene(g);
  if (CAM.map === g.map) return;
  // An arrival in the open overworld from a map the camera was drawing (CLOSE_VIEW.camera.crossing): read before the reset
  const X = CLOSE_VIEW.camera.crossing, arrival = !!X.snap && CAM.map !== null && CAM.valid && CAM.outdoorBoom, travel = arrival && X.faceTravel ? crossingYaw(g) : NaN;
  CAM.area = g.area; CAM.secX = g.rx; CAM.secY = g.ry; CAM.snapNext = arrival;
  if (arrival) { CAM.qtT0 = -1; CAM.recentre = NaN; CAM.pitchUser = 0; CAM.basisFollow = false; }
  CAM.focal = 1; CAM.focalV = 0;
  CAM.zA = NaN; CAM.zAV = CAM.tRise = CAM.tRiseV = CAM.tRiseFor = CAM.tKeepV = CAM.tKeepFor = 0; CAM.tKeep = 1;
  CAM.map = g.map; CAM.drawn = false; CAM.dist = CAM.shown = boomReach(g); CAM.shoulder = 0; CAM.distV = CAM.shoulderV = CAM.craneV = 0; CAM.crane = closeViewPreset(g).height; CAM.turnHeld = 0; CAM.yawV = 0; CAM.headX = CAM.headY = 0; CAM.bodyYaw = CAM.bodyDesiredYaw = FACING_YAW[g.player.facing] ?? NaN; CAM.bodyTransient = false; CAM.bodyRevision = CAM.targetRevision = 0; CAM.targetRecentre = false; CAM.lostFor = 0; CAM.lastX = g.player.x; CAM.lastY = g.player.y; CAM.lastNow = 0; CAM.fpx = CAM.fpy = NaN; CAM.fvx = CAM.fvy = 0; CAM.shoulderRoom = CAM.shoulderClearFor = 0; CAM.pausedAt = NaN;
  CAM.pausedTotal = Number(g.presentationPausedMs) || 0;
  const entry = g.map.entry, arena = stillworksCloseView(g.map) && entry && Math.hypot(g.player.x - entry.x, g.player.y - entry.y) <= 1.25 ? g.map.stillworks : null;
  if (Number.isFinite(travel)) CAM.bodyYaw = CAM.bodyDesiredYaw = travel;
  const facing = arena ? Math.atan2(arena.cy - footY(g.player), arena.cx - footX(g.player)) : Number.isFinite(travel) ? travel : FACING_YAW[g.player.facing] ?? -Math.PI / 2, open = (a) => { let t = 0; while (t < 12 && !wallAt(g.map, footX(g.player) + Math.cos(a) * (t + .5), footY(g.player) + Math.sin(a) * (t + .5))) t += .5; return t; };
  CAM.rigActive = false; CAM.rigIndex = CAM.rigPending = CAM.rigHold = CAM.rigOffset = CAM.rigOffsetV = 0; CAM.centeredRear = false; CAM.recentre = NaN;
  const preset = closeViewPreset(g), evaluate = (angle) => {
    const fx = Math.cos(angle), fy = Math.sin(angle), forward = Math.min(6, open(angle));
    let reach = boomLength(g, fx, fy), index = 0;
    reach *= sightClear(g.map, footX(g.player), footY(g.player), footX(g.player) - fx * reach, footY(g.player) - fy * reach, CLOSE_VIEW.camera.sightStep, CLOSE_VIEW.camera.sightPad);
    for (let i = 1; i < RIG_OFFSETS.length; i++) {
      const d = offsetReach(g, fx, fy, footX(g.player), footY(g.player), RIG_OFFSETS[i] * preset.shoulder);
      if (d > reach + CLOSE_VIEW.camera.offsetGain) { reach = d; index = i; }
    }
    return { score: forward * (.15 + reach / boomReach(g)), forward, reach, index };
  };
  let yaw = facing, best = evaluate(facing), fallback = best.reach >= CLOSE_VIEW.camera.minDistance ? { ...best, yaw: facing, facingDelta: 0 } : null;
  if (!arena && !arrival && (best.forward < boomReach(g) + 1 || best.reach < boomReach(g) * .55))
    for (let i = 0; i < 8; i++) {
      const a = wrap(i * Math.PI / 4), candidate = evaluate(a), facingDelta = Math.abs(wrap(a - facing));
      if (candidate.reach >= CLOSE_VIEW.camera.minDistance && (!fallback || candidate.score > fallback.score + .01 || (Math.abs(candidate.score - fallback.score) <= .01 && facingDelta < fallback.facingDelta))) fallback = { ...candidate, yaw: a, facingDelta };
      if (candidate.score > best.score + .01) { best = candidate; yaw = a; }
    }
  // Entry-only escape from a settled corner: if forward scoring chose a sub-tile
  // boom, use the best-scoring already-probed safe heading. Equivalent score keeps the
  // arrival facing. Ordinary frames never rerun this selection.
  if (best.reach < CLOSE_VIEW.camera.minDistance && fallback) { best = fallback; yaw = fallback.yaw; }
  CAM.rigIndex = CAM.rigPending = best.index; CAM.rigOffset = RIG_OFFSETS[best.index] * preset.shoulder;
  CAM.yaw = CAM.inputYaw = yaw;
}
// A section crossing (CLOSE_VIEW.camera.crossing): the overworld before and after, the next section along one axis, and the
// Wayfarer within `edge` tiles of the edge they came in by. Returns the travel's yaw (north, -y, is -pi/2), else NaN.
function crossingYaw(g) {
  const dx = g.rx - CAM.secX, dy = g.ry - CAM.secY, p = g.player, map = g.map, e = CLOSE_VIEW.camera.crossing.edge;
  if (g.area !== "overworld" || CAM.area !== "overworld" || !Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1 || !p || !map) return NaN;
  const w = Math.max(1, Number(map.width) || 32), h = Math.max(1, Math.floor(map.tiles.length / w));
  const at = dx > 0 ? p.x <= e : dx < 0 ? p.x + 1 >= w - e : dy > 0 ? p.y <= e : p.y + 1 >= h - e;
  return at ? Math.atan2(dy, dx) : NaN;
}
function wallAt(map, x, y) { const w = Math.max(1, Number(map.width) || 32), h = Math.max(1, Math.floor(map.tiles.length / w)), tx = Math.floor(x), ty = Math.floor(y); return tx < 0 || ty < 0 || tx >= w || ty >= h || isWall(map.tiles[ty * w + tx]); }
// The camera's own wall test: as wallAt, except that off an open overworld section's edge is open ground (the next section
// lies there; CLOSE_VIEW.camera.outdoor.edgeOpen), so the boom is not cut at the edge while the Wayfarer is plainly in view.
function camWall(map, x, y) {
  if (map === CAM.edgeMap) { const w = Math.max(1, Number(map.width) || 32), h = Math.max(1, Math.floor(map.tiles.length / w)); if (x < 0 || y < 0 || x >= w || y >= h) return false; }
  return wallAt(map, x, y);
}
// Is the camera in the open overworld (a section, no building)? Sets the boom and the open edges for this frame.
function cameraScene(g) {
  const open = g.area === "overworld" && !g.map?.building && overworldCloseViewApplies(g);
  CAM.outdoorBoom = open; CAM.edgeMap = open && CLOSE_VIEW.camera.outdoor.edgeOpen ? g.map : null;
}
// The preset's boom: a tile longer in the open overworld (CLOSE_VIEW.presets version 5, `outdoorDistance`).
function boomReach(g) { const P = closeViewPreset(g); return CAM.outdoorBoom && Number.isFinite(P.outdoorDistance) ? P.outdoorDistance : P.distance; }
function turnCamera(g, now) {
  // The Game lifecycle records elapsed pause time even if no camera/input callback ran during it.
  // Consume it once before the direct-paused fallback, so observed pauses cannot shift clocks twice.
  const pausedTotal = Number(g.presentationPausedMs) || 0, held = Math.max(0, pausedTotal - CAM.pausedTotal);
  CAM.pausedTotal = pausedTotal;
  if (held > 0) { CAM.panAt += held; CAM.qtAt += held; if (CAM.qtT0 >= 0) CAM.qtT0 += held; CAM.pausedAt = NaN; CAM.lastNow = now; }
  // Camera time stops with the game, including a pending quick turn and the manual-look grace period.
  // Keep the wall clock current so unpausing cannot fast-forward a spring or infer a burst of travel.
  if (g.paused) { if (!Number.isFinite(CAM.pausedAt)) CAM.pausedAt = CAM.lastNow || now; CAM.lastNow = now; CAM.dt = 0; return; }
  if (Number.isFinite(CAM.pausedAt)) { const held = Math.max(0, now - CAM.pausedAt); CAM.panAt += held; CAM.qtAt += held; if (CAM.qtT0 >= 0) CAM.qtT0 += held; CAM.pausedAt = NaN; CAM.lastNow = now; }
  const P = CLOSE_VIEW.crescent, p = g.player, dt = CAM.lastNow ? Math.max(0, Math.min(.1, (now - CAM.lastNow) / 1000)) : 0, dx = p.x - CAM.lastX, dy = p.y - CAM.lastY;
  CAM.lastNow = now; CAM.lastX = p.x; CAM.lastY = p.y; CAM.dt = dt;
  if (dt <= 0) return;
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), slow = reduce ? CLOSE_VIEW.assist.reducedScale : 1;
  // the travel heading, low-passed (a tile a second is 1)
  { const A = CLOSE_VIEW.assist, k = 1 - Math.exp(-dt / A.headTau); CAM.headX += (dx / dt - CAM.headX) * k; CAM.headY += (dy / dt - CAM.headY) * k; }
  if (CAM.qtT0 >= 0) { // the quick turnaround: a critically damped swing, then the view is the player's again
    const t = Math.max(0, (now - CAM.qtT0) / 1000), w = 5 / CAM.qtDur, k = t >= CAM.qtDur * 1.4 ? 1 : 1 - (1 + w * t) * Math.exp(-w * t);
    CAM.yaw = wrap(CAM.qtFrom + wrap(CAM.qtTo - CAM.qtFrom) * k); CAM.yawV = 0; CAM.pitchUser *= Math.exp(-12 * dt); if (k >= 1) { CAM.qtT0 = -1; CAM.yaw = CAM.qtTo; CAM.pitchUser = 0; } return; }
  const target = lockTick(g, dt);
  if (!CAM.targetRecentre && !Number.isFinite(CAM.recentre)) CAM.basisFollow = false; // the swing is over: latch where it ended
  if (CAM.targetRecentre) {
    const goal = Number.isFinite(CAM.bodyYaw) ? CAM.bodyYaw : CAM.recentre, diff = wrap(goal - CAM.yaw), step = Math.sign(diff) * Math.min(Math.abs(diff), P.recentreRate * dt);
    CAM.yaw = wrap(CAM.yaw + step); if (Math.hypot(CAM.sx, CAM.sy) < CLOSE_VIEW.input.idle) CAM.inputYaw = CAM.yaw;
    CAM.yawV = 0; CAM.pitchUser *= Math.exp(-6 * dt);
    const bodySettled = Number.isFinite(CAM.bodyDesiredYaw) && Math.abs(wrap(CAM.bodyYaw - CAM.bodyDesiredYaw)) < .01;
    if (CAM.bodyRevision > CAM.targetRevision && Math.abs(diff) < .01 && bodySettled && !CAM.bodyTransient) { CAM.targetRecentre = false; CAM.recentre = NaN; }
    return;
  }
  if (target) { // locked: the view swings to keep the foe framed beyond the Wayfarer
    // within `near` tiles the swing fades out, so a foe at arm's length (or slipping past) never whips the view round
    const L = CLOSE_VIEW.lock, d = Math.hypot(target.x - p.x, target.y - p.y), near = Math.max(L.nearScale, Math.min(1, (d - L.near * .5) / (L.near * .5)));
    if (d < .05) { CAM.yawV = 0; return; } // overlapping feet have no useful bearing; retain the lock without choosing an arbitrary yaw
    const T = CLOSE_VIEW.targetMode, rate = CAM.targetMode ? T.rate : L.rate, cap = CAM.targetMode ? T.maxRate : L.maxRate;
    CAM.recentre = NaN; lockSpring(Math.atan2(target.y - p.y, target.x - p.x), rate * slow * near, cap * DEG * slow, L.accel * DEG * slow, L.reverse * DEG * slow, dt, now); return; }
  if (CAM.lockId && CAM.lostFor > 0) { // keep the LOS grace, not knowledge of movement through a wall (target mode: the swing coasts to a stop)
    if (!CAM.targetMode) { CAM.yawV = 0; return; }
    const L = CLOSE_VIEW.lock, w0 = now - CAM.lockWAt <= 100 ? CAM.lockW : 0, w1 = Math.sign(w0) * Math.max(0, Math.abs(w0) - L.reverse * DEG * slow * dt);
    CAM.yaw = wrap(CAM.yaw + (w0 + w1) * .5 * dt); CAM.lockW = w1; CAM.lockWAt = now; CAM.yawV = 0; return; }
  if (Number.isFinite(CAM.recentre)) { // a double tap on the crescent: swing round behind the Wayfarer (the walk's basis turns with it)
    const diff = wrap(CAM.recentre - CAM.yaw), step = Math.sign(diff) * Math.min(Math.abs(diff), P.recentreRate * dt);
    CAM.yaw = wrap(CAM.yaw + step); CAM.inputYaw = wrap(CAM.inputYaw + step); CAM.yawV = 0; CAM.pitchUser *= Math.exp(-6 * dt); if (Math.abs(diff) < .01) CAM.recentre = NaN; return; }
  const A = CLOSE_VIEW.assist; if (g.save?.closeViewAutoFollow === false) { CAM.yawV = 0; return; } // the view moves only when the player moves it
  const since = (now - CAM.panAt) / 1000; if (since < A.delay) { CAM.yawV = 0; return; } // the crescent was touched lately: the view stays where it was put
  const speed = Math.hypot(CAM.headX, CAM.headY); if (speed < A.minHead) { CAM.yawV *= Math.exp(-4 * dt); return; } // no steady travel: nothing to follow
  const head = Math.atan2(CAM.headY, CAM.headX), diff = wrap(head - CAM.yaw);
  if (Math.abs(diff) > A.cone * DEG || Math.abs(diff) < A.deadband * DEG) { CAM.yawV *= Math.exp(-4 * dt); return; } // toward the camera, or near enough straight on
  const ease = CAM.panAt > -1e8 ? Math.min(1, (since - A.delay) / A.ramp) : 1;
  yawSpring(head, A.rate * slow * Math.max(.05, ease), A.maxRate * DEG * slow, dt);
}
// A locked swing (CLOSE_VIEW.lock.accel): the critically damped spring's step, its speed capped at `cap`, gathering speed at most
// `accel` (radians a second squared) and never faster than it could stop by the goal; a swing already under way is turned
// back at most `reverse`. CAM.lockW is the swing's speed last frame (stale after 100 ms: then it starts from rest).
function lockSpring(goal, w, cap, accel, reverse, dt, now) {
  const before = CAM.yaw, w0 = now - CAM.lockWAt <= 100 ? CAM.lockW : 0; yawSpring(goal, w, cap, dt);
  let v = wrap(CAM.yaw - before) / dt; const stop = Math.sqrt(2 * accel * Math.abs(wrap(goal - before)));
  if (Math.abs(v) > stop) v = Math.sign(v) * stop;
  if (w0 !== 0 && Math.sign(v) !== Math.sign(w0)) v = Math.sign(w0) * Math.max(0, Math.abs(w0) - reverse * dt) || Math.sign(v) * Math.min(Math.abs(v), accel * dt);
  else if (Math.abs(v) > Math.abs(w0) + accel * dt) v = Math.sign(v) * (Math.abs(w0) + accel * dt);
  CAM.yaw = wrap(before + v * dt); CAM.yawV = v; CAM.lockW = v; CAM.lockWAt = now;
}
// One step of the view's yaw toward `goal` on a critically damped spring (rate w), its speed capped at `cap` radians a second.
function yawSpring(goal, w, cap, dt) {
  const y = wrap(CAM.yaw - goal), e = Math.exp(-w * dt), j = (CAM.yawV + w * y) * dt; let ny = (y + j) * e; CAM.yawV = (CAM.yawV - w * j) * e;
  if (Math.abs(CAM.yawV) > cap) CAM.yawV = Math.sign(CAM.yawV) * cap; const step = wrap(ny - y); const lim = cap * dt; const st = Math.abs(step) > lim ? Math.sign(step) * lim : step;
  CAM.yaw = wrap(CAM.yaw + st);
}
// The crescent: swing the view (dx, px of arc: clockwise turns it right) and tilt it (dy: up looks up). The walk's basis turns
// with the view at once, as a gamepad's right stick does: turn the view round and push up, and you walk the new way.
export function closeViewPan(dx, dy, now = 0) {
  if (CAM.qtT0 >= 0) return; // the quick turnaround owns the view until it settles
  const P = CLOSE_VIEW.crescent, a = (Number(dx) || 0) * P.yaw; CAM.recentre = NaN; CAM.targetRecentre = false; CAM.centeredRear = false; CAM.yawV = 0;
  CAM.yaw = wrap(CAM.yaw + a); CAM.inputYaw = wrap(CAM.inputYaw + a);
  CAM.pitchUser = Math.max(P.pitchRange[0], Math.min(P.pitchRange[1], CAM.pitchUser + (Number(dy) || 0) * P.pitch)); CAM.panAt = now;
}
// A double tap on the crescent: the camera goes back behind the Wayfarer (the way they last faced or walked).
export function closeViewPlayerFacingYaw(g, now = 0, baseYaw = NaN, { phase = null, importedReady = null } = {}) {
  const p = g?.player, clock = g?.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now;
  if (!p) return CAM.yaw;
  const trackYaw = Number.isFinite(baseYaw) ? baseYaw : Number.isFinite(CAM.bodyYaw) ? CAM.bodyYaw : MODEL_STATE.tracks.get(p)?.yaw;
  if (p.stunnedUntil > clock) return Number.isFinite(trackYaw) ? trackYaw : FACING_YAW[p.facing] ?? CAM.yaw;
  if (p.dodgeUntil > clock && Number.isFinite(p.dodgeVisual?.facingYaw)) return p.dodgeVisual.facingYaw;
  if (g.fistCharge) { const d = g.fistCharge.direction; if (d && (d.x || d.y)) return Math.atan2(d.y, d.x); }
  const action = closeViewPlayerAction(g, clock), v = action.record;
  const toolYaw = closeViewToolFacingYaw(MODEL_STATE.tracks.get(p), action);
  if (Number.isFinite(toolYaw)) return toolYaw;
  if (action.active || action.legacy) {
    const d = v?.aim || g.pendingToolUse?.aim || p.meleeStrike, aimYaw = d && (d.x || d.y) ? Math.atan2(d.y, d.x) : Number.isFinite(trackYaw) ? trackYaw : FACING_YAW[p.facing] ?? CAM.yaw;
    const form = playerFormPresentation(g), importedForm = !form || form.kind === 'playerIronFists', imported = importedReady ?? (importedForm && !!MODEL_STATE.hero && !!getCloseViewHeroAsset()), profile = action.active ? v?.profile : null;
    const blendsEntry = profile === 'fist' || profile === 'hammer' || profile === 'melee' && ['cinder-pike','verge-cleaver'].includes(v?.weaponKind);
    if (imported && blendsEntry && Number.isFinite(v?.facingYaw)) {
      let amount = Number.isFinite(phase) ? phase : action.amount;
      if (!Number.isFinite(phase) && action.active && !v?.primaryStep && now - MODEL_STATE.lastMeleeHit < MODEL_TIMING.contactHoldMs)
        amount = 1 - Math.min(1, (action.until - MODEL_STATE.lastMeleeHit) / v.durationMs);
      const t = Math.min(1, amount / .08), blend = t * t * (3 - 2 * t); return wrap(v.facingYaw + wrap(aimYaw - v.facingYaw) * blend);
    }
    return aimYaw;
  }
  if (p.castUntil > clock) return Number.isFinite(trackYaw) ? trackYaw : FACING_YAW[p.facing] ?? CAM.yaw;
  const look = closeViewIdleLockAim(g, clock); if (look && (look.x || look.y)) return Math.atan2(look.y, look.x);
  if (Number.isFinite(trackYaw)) return trackYaw;
  const a = g.save?.lastAim; return a && (a.x || a.y) ? Math.atan2(a.y, a.x) : FACING_YAW[p.facing] ?? CAM.yaw;
}
export function closeViewRecentre(g, now = 0, { centered = false } = {}) {
  CAM.basisFollow = true; CAM.basisHold = false; // a held stick walks relative to the view through the whole swing
  CAM.centeredRear = !!centered; CAM.targetRecentre = !!centered; CAM.targetRevision = CAM.bodyRevision; CAM.recentre = centered ? closeViewPlayerFacingYaw(g, now) : (() => { const a = g?.save?.lastAim; return a && (a.x || a.y) ? Math.atan2(a.y, a.x) : FACING_YAW[g?.player?.facing] ?? CAM.yaw; })(); CAM.panAt = now;
  if (centered) { CAM.qtT0 = -1; CAM.yawV = 0; CAM.pitchUser = 0; }
}
// The quick turnaround (CLOSE_VIEW.quickTurn). Armed while the stick (as last read by closeViewSteer) is held clearly back,
// toward the camera. closeViewQuickTurn starts the swing: the view goes round to face the way the Wayfarer is being walked
// (straight back from the old view), they turn to face it, the tilt is let go; the walk's basis is left latched, so the held
// stick keeps them walking the same way throughout. Returns true when it started.
export function closeViewStickBack(sx = CAM.sx, sy = CAM.sy) { const Q = CLOSE_VIEW.quickTurn, m = Math.hypot(sx, sy); return m >= Q.stickMin && Math.abs(Math.atan2(sx, sy)) <= Q.stickCone * DEG; }
export function closeViewQuickTurn(g, now = 0) {
  const Q = CLOSE_VIEW.quickTurn; if (!g?.player || CAM.qtT0 >= 0 || now - CAM.qtAt < Q.cooldown * 1000) return false;
  if (g.lockedTarget?.()) { g.lockTarget(null); CAM.lockId = null; CAM.lostFor = 0; } // locked: the turn breaks the lock
  CAM.targetMode = false; // and leaves target mode: an auto-lock would swing the view straight back round
  CAM.basisFollow = false; CAM.basisHold = Math.hypot(CAM.sx, CAM.sy) >= CLOSE_VIEW.input.idle; // the held stick keeps walking the same way until it is let go
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), to = wrap(CAM.yaw + Math.PI);
  CAM.qtFrom = CAM.yaw; CAM.qtTo = to; CAM.qtT0 = now; CAM.qtAt = now; CAM.qtDur = reduce ? Q.reducedSeconds : Q.seconds; CAM.recentre = NaN; CAM.targetRecentre = false; CAM.centeredRear = false; CAM.yawV = 0; CAM.panAt = now + CAM.qtDur * 1000;
  const fx = Math.cos(to), fy = Math.sin(to); g.player.facing = Math.abs(fx) >= Math.abs(fy) ? (fx >= 0 ? "right" : "left") : (fy >= 0 ? "down" : "up");
  const a = g.save?.lastAim; if (a && typeof a === "object") { a.x = fx; a.y = fy; } else if (g.save) g.save.lastAim = { x: fx, y: fy };
  return true;
}
export const closeViewTurning = () => CAM.qtT0 >= 0;
// ------------------------------------------------------------------------------------------------ lock-on
// Can the Wayfarer see (x, y)? No wall tile on the straight line between (a tile walk in quarter-tile steps).
function sightTo(map, ax, ay, bx, by) { const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 4); for (let i = 1; i < n; i++) { const t = i / n; if (wallAt(map, ax + (bx - ax) * t, ay + (by - ay) * t)) return false; } return true; }
const lockable = (e) => !!e && !e.dead && !e.hidden && !e.ambient && !e.astralAllyOf && !e.untargetable && !e.gloomVeil;
// Prefer a visible, unobstructed foe in front; otherwise allow a nearby forward target just outside the viewport.
// Within each group, weigh angle and distance. Explicit rehop searches use their own center/cone without screen ranking.
function lockOnScreen(g, e) {
  if (!CAM.valid || CAM.map !== g.map) return false;
  const q = project(e.x + .5, e.y + .75, surfaceZ(g.map, e.x + .5, e.y + .75) + .7 * actorScale(e));
  return !!q && q.sx >= 0 && q.sx <= CAM.w && q.sy >= 0 && q.sy <= CAM.h;
}
export function closeViewLockCandidate(g, { yaw = CAM.yaw, cone = CLOSE_VIEW.lock.cone, range = CLOSE_VIEW.lock.range, ox = null, oy = null, skip = null, screen = true } = {}) {
  const L = CLOSE_VIEW.lock, p = g.player, px = footX(p), py = footY(p), cx = ox ?? px, cy = oy ?? py; let best = null, bestS = Infinity, bestVisible = false;
  for (const e of g.enemies || []) { if (!lockable(e) || e.id === skip) continue; const ex = e.x + .5, ey = e.y + .75, d = Math.hypot(ex - cx, ey - cy); if (d > range) continue;
    const a = Math.abs(wrap(Math.atan2(ey - py, ex - px) - yaw)) / DEG, visible = screen && lockOnScreen(g, e);
    if (a > (screen ? Math.max(cone, L.fallbackCone) : cone)) continue;
    if (screen && !visible && (a > L.fallbackCone || Math.hypot(ex - px, ey - py) > L.fallbackRange)) continue;
    if (!sightTo(g.map, px, py, ex, ey)) continue;
    const sc = L.wAngle * a / cone + L.wDist * d / range; if ((visible && !bestVisible) || (visible === bestVisible && sc < bestS)) { bestS = sc; best = e; bestVisible = visible; } }
  return best;
}
// The lock button: lock the best foe in front of the camera, or release the lock. Returns the foe locked, or null.
export function closeViewLockToggle(g) {
  if (!g) return null; if (g.lockedTarget?.()) { g.lockTarget(null); CAM.lockId = null; return null; }
  const e = closeViewLockCandidate(g); if (!e) { g.message = "Nothing to lock on to in view."; return null; }
  g.lockTarget(e.id); CAM.lockId = e.id; CAM.lostFor = 0; return e;
}
// The mounted Target command switches target mode (CLOSE_VIEW.targetMode) on or off, then requests an open-ground centered
// rear view. On: a lock already made (a tap on a foe) is kept, else the best foe in front of the camera (the existing
// pre-recenter acquisition), else the best one in sight anywhere round the Wayfarer. Off: the lock is released.
export function closeViewTargetActivate(g, now = 0) {
  if (!g || g.paused || !closeViewShowing(g)) return null;
  let target = null;
  if (CAM.targetMode) { CAM.targetMode = false; if (g.lockedTarget?.()) g.lockTarget(null); CAM.lockId = null; CAM.lostFor = 0; g.message = "Auto-target off."; }
  else {
    CAM.targetMode = true; CAM.tmScan = 0; CAM.tmHeld = 0; target = g.lockedTarget?.() || null;
    if (!lockable(target)) target = targetModeScan(g, null); // the same priority as every later choice (CLOSE_VIEW.targetMode)
    if (target) { g.lockTarget(target.id); CAM.lockId = target.id; CAM.lostFor = 0; CAM.tmManual = false; } else { CAM.lockId = null; g.message = "Auto-target on: no foe in sight yet."; }
  }
  closeViewRecentre(g, now, { centered: true }); return target;
}
export const closeViewTargetMode = () => CAM.targetMode; // is auto-targeting on (the Target button lit red)?
// Target mode's search: one pass over the floor's foes (bounded by the game's own actor caps), allocation free. TM_SCAN.best is
// the best foe in sight within the lock's range anywhere round the Wayfarer; TM_SCAN.near the nearest one in sight within
// threatRange. The wall line (sightTo) is walked only for a foe that would beat the best or nearest found so far. With reduced
// motion only foes within the lock's cone of the view are taken (the view is never swung round behind on its own).
const TM_SCAN = { best: null, bestS: Infinity, near: null, nearD: Infinity };
// A foe's target-mode priority (lower first; CLOSE_VIEW.targetMode): near, in front, close in, aware of the Wayfarer, winding up.
function targetScore(e, d, off) {
  const L = CLOSE_VIEW.lock, T = CLOSE_VIEW.targetMode;
  return T.wDist * d / L.range + T.wAngle * off / Math.PI - T.wClose * Math.max(0, 1 - d / T.threatRange) - (e.aggro ? T.wAggro : 0) - (foeWindingUp(e) ? T.wWindup : 0);
}
export function closeViewTargetScore(g, e) { const p = g.player, ex = e.x + .5, ey = e.y + .75; return targetScore(e, Math.hypot(ex - footX(p), ey - footY(p)), Math.abs(wrap(Math.atan2(ey - footY(p), ex - footX(p)) - CAM.yaw))); }
function targetModeScan(g, skip) {
  const L = CLOSE_VIEW.lock, T = CLOSE_VIEW.targetMode, p = g.player, px = footX(p), py = footY(p), reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode); let bestS = Infinity;
  TM_SCAN.best = TM_SCAN.near = null; TM_SCAN.nearD = TM_SCAN.bestS = Infinity;
  for (const e of g.enemies || []) { if (!lockable(e) || e.id === skip) continue; const ex = e.x + .5, ey = e.y + .75, d = Math.hypot(ex - px, ey - py); if (d > L.range) continue;
    const off = Math.abs(wrap(Math.atan2(ey - py, ex - px) - CAM.yaw)); if (reduce && off > L.cone * DEG) continue; // reduced motion: never an automatic swing round behind
    const sc = targetScore(e, d, off), beats = sc < bestS, nearer = d <= T.threatRange && d < TM_SCAN.nearD;
    if (!(beats || nearer) || !sightTo(g.map, px, py, ex, ey)) continue;
    if (beats) { bestS = sc; TM_SCAN.best = e; } if (nearer) { TM_SCAN.nearD = d; TM_SCAN.near = e; } }
  TM_SCAN.bestS = bestS; return TM_SCAN.best;
}
// A swipe along the crescent while locked: the next foe to the right (dir 1) or left (-1) of the locked one, as the camera sees them.
export function closeViewLockSwitch(g, dir) {
  const t = g?.lockedTarget?.(); if (!t) return null; const L = CLOSE_VIEW.lock, p = g.player, px = footX(p), py = footY(p), bt = Math.atan2(t.y + .75 - py, t.x + .5 - px); let best = null, bestA = Infinity, bestVisible = false;
  for (const e of g.enemies || []) { if (!lockable(e) || e.id === t.id) continue; const ex = e.x + .5, ey = e.y + .75; if (Math.hypot(ex - px, ey - py) > L.range) continue;
    const be = Math.atan2(ey - py, ex - px); if (Math.abs(wrap(be - CAM.yaw)) > L.switchCone * DEG) continue; const rel = wrap(be - bt) * Math.sign(dir || 1); if (rel <= 0) continue; if (!sightTo(g.map, px, py, ex, ey)) continue;
    const visible = lockOnScreen(g, e); if (!visible && Math.hypot(ex - px, ey - py) > L.fallbackRange) continue;
    if ((visible && !bestVisible) || (visible === bestVisible && rel < bestA)) { bestA = rel; best = e; bestVisible = visible; } }
  if (best) { g.lockTarget(best.id); CAM.lockId = best.id; CAM.lostFor = 0; CAM.tmHeld = 0; CAM.tmManual = true; } return best; // a chosen foe is not overridden at once by a nearer threat
}
// Each frame while locked: follow a lock made by a tap too; on the foe's fall move to the best foe near where it fell, or
// release; release beyond range + slack or after lostSec out of sight. Returns the locked foe, or null.
function takeLock(g, e) { g.lockTarget(e.id); CAM.lockId = e.id; CAM.lostFor = 0; CAM.tmHeld = 0; CAM.tmManual = false; return e; }
function lockTick(g, dt) {
  const had = CAM.lockId, t = lockKeep(g, dt); if (!CAM.targetMode) return t;
  if (had && !CAM.lockId) CAM.tmScan = 0; // the lock just fell or broke: look for the next foe this frame
  // target mode: lock the next foe once nothing is locked (and none is briefly out of sight), and let a much nearer threat
  // take the lock; at most one bounded search every scanSec
  const T = CLOSE_VIEW.targetMode, p = g.player; CAM.tmScan -= dt; CAM.tmHeld += dt;
  if (CAM.lockId && CAM.lostFor > 0) { // the locked foe is briefly out of sight: held (sticky), unless a foe in reach is at the Wayfarer
    if (CAM.tmScan > 0) return t; CAM.tmScan = T.scanSec; targetModeScan(g, CAM.lockId); return TM_SCAN.near && TM_SCAN.nearD <= T.reach ? takeLock(g, TM_SCAN.near) : t; }
  if (!t) { if (CAM.tmScan > 0) return null; CAM.tmScan = T.scanSec; const next = targetModeScan(g, null); return next ? takeLock(g, next) : null; }
  const hold = CAM.tmManual ? T.switchHold : Math.min(T.switchHold, T.reachHold);
  if (CAM.tmScan > 0 || CAM.tmHeld < hold) return t; CAM.tmScan = T.scanSec;
  targetModeScan(g, t.id); const n = TM_SCAN.near, d = Math.hypot(t.x + .5 - footX(p), t.y + .75 - footY(p));
  if (n && TM_SCAN.nearD <= T.reach && d > T.reach && TM_SCAN.nearD + T.nearerBy < d) return takeLock(g, n); // a foe in reach while the lock is not
  if (CAM.tmHeld >= T.switchHold && TM_SCAN.best && TM_SCAN.bestS + T.switchMargin < closeViewTargetScore(g, t)) return takeLock(g, TM_SCAN.best);
  return t;
}
function lockKeep(g, dt) {
  const L = CLOSE_VIEW.lock; let t = g.lockedTarget?.() || null;
  if (CAM.lockId && (!t || t.id !== CAM.lockId)) { const old = (g.enemies || []).find((e) => e.id === CAM.lockId);
    if (!t && old && old.dead && !CAM.targetMode) { const next = closeViewLockCandidate(g, { cone: 180, range: L.rehop, ox: old.x + .5, oy: old.y + .75, screen: false }); if (next) { g.lockTarget(next.id); t = next; } } }
  if (t && !lockable(t)) { g.lockTarget(null); CAM.lockId = null; CAM.lostFor = 0; return null; }
  CAM.lockId = t ? t.id : null; if (!t) { CAM.lostFor = 0; return null; }
  const p = g.player, px = footX(p), py = footY(p), ex = t.x + .5, ey = t.y + .75;
  if (Math.hypot(ex - px, ey - py) > L.range + L.slack) { g.lockTarget(null); CAM.lockId = null; return null; }
  CAM.lostFor = sightTo(g.map, px, py, ex, ey) ? 0 : CAM.lostFor + dt; if (CAM.lostFor > (CAM.targetMode ? CLOSE_VIEW.targetMode.lostSec : L.lostSec)) { g.lockTarget(null); CAM.lockId = null; CAM.lostFor = 0; return null; }
  return CAM.lostFor > 0 ? null : t;
}
const LOCK_LOOK = { x: 0, y: 0 }; // presentation scratch, never a saved or committed action direction
export function closeViewIdleLockAim(g, now) {
  const p = g?.player, clock = g?.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now;
  if (!p || p.attackUntil > clock || p.castUntil > clock || p.stunnedUntil > clock || g.fistCharge) return null;
  const t = g.lockedTarget?.(); if (!lockable(t) || !sightTo(g.map, footX(p), footY(p), t.x + .5, t.y + .75)) return null;
  LOCK_LOOK.x = t.x - p.x; LOCK_LOOK.y = t.y - p.y; return LOCK_LOOK;
}
// Version 5: how much of the line from (ax, ay) to (bx, by) is clear of walls, `pad` tiles to either side (sampled every
// `step` tiles): 1 all of it, else the share up to `pad` short of the first wall.
function sightClear(map, ax, ay, bx, by, step, pad) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); if (L < 1e-4) return 1; const nx = -dy / L * pad, ny = dx / L * pad, n = Math.ceil(L / step);
  for (let i = 1; i <= n; i++) { const t = i / n, x = ax + dx * t, y = ay + dy * t; if (camWall(map, x, y) || (t * L > .4 && (camWall(map, x + nx, y + ny) || camWall(map, x - nx, y - ny)))) return Math.max(0, (t * L - step - pad) / L); } // beside the feet themselves a wall the Wayfarer leans on is no matter
  return 1;
}
// The boom: from the Wayfarer's feet back along the view, stopped short of a wall.
function boomLength(g, fx, fy, ox = footX(g.player), oy = footY(g.player)) {
  const C = CLOSE_VIEW.camera, map = g.map, rx = -fy, ry = fx, hit = (x, y) => camWall(map, x, y);
  const D = boomReach(g); let reach = D;
  for (let t = C.boomStep / 2; t <= D + C.boomPad; t += C.boomStep / 2) { const x = ox - fx * t, y = oy - fy * t;
    if (hit(x, y) || hit(x + rx * C.boomPad, y + ry * C.boomPad) || hit(x - rx * C.boomPad, y - ry * C.boomPad)) { reach = Math.max(C.closest, t - C.boomPad); break; } }
  // never inside a wall: a boom the walls cut shorter than its usual shortest stays that short (the camera cranes up instead);
  // it used to be pushed back out to minDistance, through the wall behind, and the view then looked through that wall
  // and where even `closest` is in a wall (the Wayfarer's back to one), shorter still, right down to their shoulder
  while (reach > .03 && hit(ox - fx * reach, oy - fy * reach)) reach -= .03;
  return Math.max(.03, reach);
}

// A small fixed lateral rig search, before shortening. Each sample clears the full
// boom-pad square; the final padded feet-to-eye ray also has to clear the corner.
// No screen/body history enters this decision, so a stationary rig cannot pump.
const RIG_OFFSETS = [0, .5, -.5, 1, -1], RIG_REACH = new Float64Array(5);
function tightCornerFamily(g) {
  const b = g.map?.building;
  return !g.map?.hall?.tall && ((b?.interiorVersion === 5 && b.style === "keep" && !b.pentagon) || (b?.pentagon && b.V === 10));
}
function offsetReach(g, fx, fy, ax, ay, offset) {
  const C = CLOSE_VIEW.camera, D = boomReach(g), pad = C.boomPad, step = C.boomStep / 2;
  closeViewStats.rigProbes++;
  let reach = 0;
  for (let i = 0, n = Math.ceil((D - C.closest) / step); i <= n; i++) {
    const d = Math.min(D, C.closest + i * step), x = ax - fy * offset - fx * d, y = ay + fx * offset - fy * d;
    closeViewStats.rigSamples++;
    if (camWall(g.map, x - pad, y - pad) || camWall(g.map, x + pad, y - pad) || camWall(g.map, x - pad, y + pad) || camWall(g.map, x + pad, y + pad)) break;
    reach = d;
  }
  if (reach && sightClear(g.map, footX(g.player), footY(g.player), ax - fy * offset - fx * reach, ay + fx * offset - fy * reach, C.sightStep, C.sightPad) < 1) return 0;
  return reach;
}
function clearanceOffset(g, fx, fy, ax, ay, centered, dt, mix) {
  const C = CLOSE_VIEW.camera, shoulder = closeViewPreset(g).shoulder * mix;
  RIG_REACH[0] = centered;
  let best = 0;
  for (let i = 1; i < RIG_OFFSETS.length; i++) {
    RIG_REACH[i] = centered + C.offsetGain < boomReach(g) && shoulder > 0 ? offsetReach(g, fx, fy, ax, ay, RIG_OFFSETS[i] * shoulder) : 0;
    if (RIG_REACH[i] > RIG_REACH[best] + C.offsetGain) best = i;
  }
  // Retain the current side while it remains useful. A competing side needs both
  // a material gain and a continuous hold; lost clearance retracts immediately.
  if (CAM.rigIndex && RIG_REACH[CAM.rigIndex] > centered + .1 && RIG_REACH[best] < RIG_REACH[CAM.rigIndex] + C.offsetGain) best = CAM.rigIndex;
  if (dt > 0) {
    if (best !== CAM.rigPending) { CAM.rigPending = best; CAM.rigHold = 0; }
    else CAM.rigHold += dt;
    if (best === CAM.rigIndex || CAM.rigHold >= C.offsetHold || RIG_REACH[CAM.rigIndex] === 0) CAM.rigIndex = best;
    spring(CAM, "rigOffset", "rigOffsetV", RIG_OFFSETS[CAM.rigIndex] * shoulder, C.pullIn, dt);
  }
  // Validate the interpolated rig as well as its destination. Never extend into
  // an unsafe space between candidates; the existing centered rig is fallback.
  const d = Math.abs(CAM.rigOffset) > .001 ? offsetReach(g, fx, fy, ax, ay, CAM.rigOffset) : 0;
  // Once useful, retain this side through a safe recovery toward center. A tiny
  // gain crossing must not toggle the rendered eye between two lateral positions.
  CAM.rigActive = d > 0 && (CAM.rigActive || d > centered + .1);
  return CAM.rigActive ? d : 0;
}

// Turn a stick (or keys) into world movement, camera-relative: pushing up walks the way the view looks. The basis is latched
// for the gesture against the view's slow automatic chase (the assist turns toward where you already walk; a basis that
// followed it would bend the walk into a spiral), but follows every turn you or a command make: a pan turns it at once, and
// through a Target or double-tap recenter it follows the view frame by frame (Tim, 2026-11-11: a Target recenter kept the
// stick on the old view, so he kept walking the old way). Locked on, the basis is the bearing to the foe (up walks at it,
// sideways circles it at the distance held, CLOSE_VIEW.targetMode.strafe*). After a quick turnaround the held stick keeps the
// basis it had until it is let go (it keeps walking the same way). Returns true when it changed the state (restore it with
// closeViewUnsteer after Game.update, so the input's own smoothing never sees the turned vector).
export function closeViewSteer(g, state, now = NaN) {
  CAM.steered = false; if (!state || !closeViewApplies(g) || MODE.cur !== 1) return false;
  ensureCam(g);
  // main keeps sampling input during pause but skips rendering. Remember that pause here too, so the
  // first resumed render can preserve the camera's timers even when there were no paused frames.
  if (g.paused) { if (!Number.isFinite(CAM.pausedAt)) CAM.pausedAt = Number.isFinite(g.pauseStarted) ? g.pauseStarted : CAM.lastNow; CAM.dt = 0; return false; }
  const sx = Number(state.x) || 0, sy = Number(state.y) || 0, mag = Math.hypot(sx, sy), idle = mag < CLOSE_VIEW.input.idle;
  if (idle) CAM.basisHold = false; if (CAM.basisFollow && !CAM.basisHold) CAM.inputYaw = CAM.yaw;
  if (idle && !g.lockedTarget?.()) { CAM.inputYaw = CAM.yaw;
    // Neutral camera orbit never chooses an attack direction. Untargeted actions start
    // in front of the displayed body; Game still owns lock, auto aim and explicit taps.
    // Keep accepted action descriptors and their committed release direction in charge.
    const clock = Number.isFinite(now) && now >= 0 ? now : CAM.lastNow > 0 ? CAM.lastNow : NaN, p = g.player;
    // Without a current input/render clock, conservatively preserve restored action aim.
    const timedBusy = !Number.isFinite(clock) || p.actionVisualUntil > clock || p.attackUntil > clock ||
      p.castUntil > clock || p.dodgeUntil > clock || p.stunnedUntil > clock;
    if (!overworldCloseViewApplies(g) && !CAM.bodyTransient && !timedBusy && !g.fistCharge && !g.pendingToolUse && !g.pendingMeleeContact) {
      const yaw = Number.isFinite(CAM.bodyYaw) ? CAM.bodyYaw : FACING_YAW[p.facing];
      if (Number.isFinite(yaw)) {
        const a = g.save.lastAim, fx = Math.cos(yaw), fy = Math.sin(yaw);
        if (a && typeof a === "object") { a.x = fx; a.y = fy; } else g.save.lastAim = { x: fx, y: fy };
      }
    } }
  // locked: the stick is target-relative (up walks at the foe, sideways circles it)
  let pull = 0;
  { const t = CAM.lockId && g.lockedTarget?.(); if (lockable(t) && CAM.lostFor === 0) { const T = CLOSE_VIEW.targetMode, dx = t.x + .5 - footX(g.player), dy = t.y + .75 - footY(g.player), d = Math.hypot(dx, dy);
    CAM.inputYaw = Math.atan2(dy, dx);
    // strafe: mostly sideways, hold the distance the strafe began at (a straight sideways step drifts outward each frame)
    if (idle || d < .05 || Math.abs(sy) / mag > T.strafeForward || CAM.strafeId !== t.id || !Number.isFinite(CAM.strafeR)) { CAM.strafeR = d; CAM.strafeId = t.id; }
    else pull = Math.max(-T.strafePull, Math.min(T.strafePull, (d - CAM.strafeR) * T.strafeGain)) * Math.abs(sx) / mag; }
    else CAM.strafeId = null; }
  const fx = Math.cos(CAM.inputYaw), fy = Math.sin(CAM.inputYaw), rx = -fy, ry = fx;
  let wx = rx * sx - fx * sy, wy = ry * sx - fy * sy;
  if (pull) { wx += fx * pull * mag; wy += fy * pull * mag; const k = mag / Math.hypot(wx, wy); wx *= k; wy *= k; } // same speed, bent toward (or away from) the foe
  CAM.sx = sx; CAM.sy = sy; state.x = wx; state.y = wy; CAM.steered = true; return true;
}
export function closeViewUnsteer(state) { if (CAM.steered && state) { state.x = CAM.sx; state.y = CAM.sy; } CAM.steered = false; }
export function closeViewCamera() { return { yaw: CAM.yaw, inputYaw: CAM.inputYaw, distance: CAM.shown, anchorZ: CAM.zA, x: CAM.cx, y: CAM.cy, height: CAM.hc, shoulder: CAM.shoulder, rigOffset: CAM.rigOffset, pitch: Math.atan2(CAM.sinP, CAM.cosP), pitchUser: CAM.pitchUser, lockId: CAM.lockId, centeredRear: CAM.centeredRear, targetRecentre: CAM.targetRecentre, bodyYaw: CAM.bodyYaw, bodyDesiredYaw: CAM.bodyDesiredYaw, bodyTransient: CAM.bodyTransient, valid: CAM.valid, drawn: CAM.drawn }; }
export const closeViewWallAt = (map, x, y) => wallAt(map, x, y); // for tests: is (x, y) inside a wall (or off the floor)?
export function resetCloseViewCamera() { CAM.targetMode = false; CAM.basisHold = false; CAM.basisFollow = false; CAM.strafeR = NaN; CAM.strafeId = null; CAM.map = null; CAM.bodyYaw = CAM.bodyDesiredYaw = NaN; CAM.bodyTransient = false; CAM.targetRecentre = false; CAM.centeredRear = false; CAM.recentre = NaN; CAM.valid = false; CAM.drawn = false; }
globalThis.__closeViewCam = { get: () => closeViewCamera(), pan: (dx, dy) => closeViewPan(dx, dy, 0), reset: () => resetCloseViewCamera(), stats: closeViewStats }; // read by the browser harness and the lab's console (diagnostics only)
// Close View drew the last frame of this area: the host then leaves out its own top-down overlays (they were drawn onto the
// ground texture through CLOSE_VIEW_HOOKS.groundLayers).
export function closeViewShowing(g) { return CAM.drawn && CAM.map === g?.map && closeViewWanted(g); }

// ------------------------------------------------------------------------------------------------ choosing the camera, and the blend
// renderer.ts calls this first thing every frame. It decides which camera applies, eases between them, and returns true when
// it has drawn the frame (Close View, or a blend); false lets the ordinary view draw as it always has, at no extra cost.
const MODE = { cur: 0, wanted: false, failed: false, g: null, map: null, lastNow: -1e9, pend: 0, pendAt: 0, t0: 0, to: -1, snap: null, snapCtx: null, snapW: 0, snapH: 0, mix: 1 };
let bypass = false;
export const closeViewBlend = () => ({ mode: MODE.cur ? "close" : "ordinary", blending: MODE.to >= 0, mix: MODE.mix });
export function closeViewFrame(ctx, g, w, h, now, baseRender) {
  if (bypass || !g?.player) return false;
  const B = CLOSE_VIEW.blend, reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), same = MODE.g === g && now - MODE.lastNow < B.gap;
  const wanted = closeViewWanted(g); let want = closeViewApplies(g) ? 1 : 0;
  if (want !== MODE.cur && same && MODE.map === g.map && wanted && MODE.wanted) { // a threshold within one floor: it must hold a moment
    if (MODE.pend !== want || MODE.pendAt > now) { MODE.pend = want; MODE.pendAt = now; }
    if (now - MODE.pendAt < B.settle) want = MODE.cur; }
  const retrying = MODE.failed && same && MODE.map === g.map && overworldCloseViewApplies(g);
  if (want !== MODE.cur) { MODE.cur = want; MODE.to = -1;
    if (same && !reduce && !retrying && snapshot(ctx)) { MODE.to = want; MODE.t0 = now; } }
  MODE.g = g; MODE.map = g.map; MODE.lastNow = now; MODE.pend = MODE.cur; MODE.wanted = wanted;
  let k = 1; if (MODE.to >= 0) { k = Math.max(0, Math.min(1, (now - MODE.t0) / (B.seconds * 1000))); if (k >= 1) MODE.to = -1; }
  const e = k * k * (3 - 2 * k), blending = k < 1; MODE.mix = e;
  if (MODE.cur === 1) { const ok = renderCloseView(ctx, g, w, h, now, baseRender, e); MODE.failed = !ok; if (!ok) { MODE.cur = 0; MODE.to = -1; return false; } if (blending) overlaySnapshot(ctx, w, h, k); return true; }
  MODE.failed = false;
  CAM.drawn = false;
  if (!blending) return false;
  const z = 1 + (B.leaveZoom - 1) * (1 - e); ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.translate(-w / 2, -h / 2); bypass = true;
  try { baseRender(ctx, g, w, h, now); } finally { bypass = false; ctx.restore(); }
  overlaySnapshot(ctx, w, h, k); return true;
}
// The last frame drawn, which is still on the canvas as a new frame begins: one copy, only when a blend starts.
function snapshot(ctx) {
  const src = ctx?.canvas; if (!src || !(src.width > 0) || !(src.height > 0)) return false;
  if (!MODE.snap) { MODE.snap = makeCanvas(); MODE.snapCtx = MODE.snap?.getContext?.("2d") || null; }
  if (!MODE.snapCtx) return false;
  if (MODE.snap.width !== src.width || MODE.snap.height !== src.height) { MODE.snap.width = src.width; MODE.snap.height = src.height; }
  MODE.snapCtx.setTransform(1, 0, 0, 1, 0, 0); MODE.snapCtx.drawImage(src, 0, 0); MODE.snapW = src.width; MODE.snapH = src.height; closeViewStats.snapshots++; return true;
}
function overlaySnapshot(ctx, w, h, k) { const a = 1 - k / CLOSE_VIEW.blend.fade; if (a <= 0 || !MODE.snap) return; ctx.save(); ctx.globalAlpha = a; ctx.drawImage(MODE.snap, 0, 0, MODE.snapW, MODE.snapH, 0, 0, w, h); ctx.restore(); }

// The tap under a screen point, while Close View drew the last frame: a creature whose billboard is under the finger, else the
// floor point under it. null when Close View is not showing (the caller uses the top-down screenToWorld).
export function closeViewScreenToWorld(g, w, h, x, y) {
  if (!closeViewShowing(g) || !CAM.valid || Math.abs(CAM.w - w) > 1 || Math.abs(CAM.h - h) > 1) return null;
  // a creature: the tap within `pick.pad` px of its drawn body; of several, the one whose body centre is nearest the finger
  const K = CLOSE_VIEW.pick; let best = null, bestD = Infinity;
  for (const e of g.enemies || []) { if (e.dead || e.hidden || e.ambient || e.astralAllyOf) continue; const q = project(e.x + .5, e.y + .82, surfaceZ(g.map, e.x + .5, e.y + .75)); if (!q || (q.sx - CAM.ppx) * 0 !== 0) continue;
    const sc = actorScale(e), k = CAM.F / q.depth, hw = K.bodyWidth * .5 * sc * k + K.pad, top = q.sy - K.bodyTop * sc * k - K.pad, bottom = q.sy + K.pad * .6, cy = q.sy - K.bodyTop * .5 * sc * k;
    if (x < q.sx - hw || x > q.sx + hw || y < top || y > bottom) continue;
    const d = Math.hypot(x - q.sx, y - cy); if (d < bestD) { best = e; bestD = d; } }
  if (best) return { x: best.x + .5, y: best.y + .4, enemyId: best.id };
  if (interiorTerrain(g.map) || hasStoneBuilds(g.map)) return terrainFloorRay(g.map, x, y) || { x: footX(g.player), y: footY(g.player) };
  let a = (CAM.ppy - y) / CAM.F; const horizon = CAM.sinP / CAM.cosP; if (a > horizon - .02) a = horizon - .02;
  const v = Math.min(CLOSE_VIEW.fog.far, CAM.hc * (CAM.cosP + a * CAM.sinP) / (CAM.sinP - a * CAM.cosP)), depth = v * CAM.cosP + CAM.hc * CAM.sinP, u = (x - CAM.ppx) * depth / CAM.F;
  return { x: CAM.cx + CAM.rx * u + CAM.fx * v, y: CAM.cy + CAM.ry * u + CAM.fy * v };
}
const PROJ = { sx: 0, sy: 0, depth: 0 };
// Version 4, for tests: the GPU floor's own sum (close-view-gl.ts's ENV_FS), in JS. The world point on the floor (z 0) under a
// screen point of the last frame, or null above the horizon; exact, so project(closeViewFloorRay(x, y)) lands on (x, y).
export function closeViewFloorRay(x, y) {
  if (CAM.valid && (interiorTerrain(CAM.map) || hasStoneBuilds(CAM.map))) return terrainFloorRay(CAM.map, x, y);
  if (!CAM.valid) return null; const b = (x - CAM.ppx) / CAM.F, a = (CAM.ppy - y) / CAM.F, dz = -CAM.sinP + a * CAM.cosP; if (!(dz < -1e-6)) return null;
  const t = -CAM.hc / dz, dx = CAM.fx * (CAM.cosP + a * CAM.sinP) + CAM.rx * b, dy = CAM.fy * (CAM.cosP + a * CAM.sinP) + CAM.ry * b;
  return { x: CAM.cx + dx * t, y: CAM.cy + dy * t, depth: t };
}
// Bounded picking ray; binary refinement stays in the first intersected cell.
// It can hit an uphill floor above the horizon and never selects through a wall.
function terrainFloorRay(map, x, y) {
  const b=(x-CAM.ppx)/CAM.F, a=(CAM.ppy-y)/CAM.F;
  const dx=CAM.fx*(CAM.cosP+a*CAM.sinP)+CAM.rx*b, dy=CAM.fy*(CAM.cosP+a*CAM.sinP)+CAM.ry*b, dz=-CAM.sinP+a*CAM.cosP;
  const point=(t)=>({x:CAM.cx+dx*t,y:CAM.cy+dy*t,z:CAM.hc+dz*t});
  let previous=0;
  for(let i=1;i<=640;i++) {
    const t=i*.025, p=point(t); if(wallAt(map,p.x,p.y)) return null;
    if(p.z<=surfaceZ(map,p.x,p.y)) {
      let lo=previous,hi=t;
      for(let k=0;k<14;k++){const mid=(lo+hi)*.5,q=point(mid);if(q.z>surfaceZ(map,q.x,q.y))lo=mid;else hi=mid;}
      const q=point(hi); return {x:q.x,y:q.y,depth:hi};
    }
    previous=t;
  }
  return null;
}
// ------------------------------------------------------------------------------------------------ roof decks and the aimed Rift Step
// The roof deck the Wayfarer stands on (roof-decks.ts via Game.standingDeck), or null.
function ownRoofDeck(g) { const d = g?.area === "overworld" ? g.standingDeck?.() : null; return d ? roofDeckById(g.map, d.id) : null; }
// The drawn height of a roof deck's surface at (x, y), or -Infinity where there is none.
function deckSurfaceZ(map, x, y) { const d = roofDeckAt(map, x, y); return d ? outdoorRoofZ(d, x, y, map === RELIEF.map ? RELIEF.R : null) : -Infinity; }
// On a roof the feet stand on its drawn surface; a hop from a roof keeps them at least at the roof's height until it lands; off a
// roof (a hop that ends over the ground, or a step off its edge) the footing falls from there as off any ledge (presentLeap's
// gravity). Writes the frame's captured Wayfarer card's lift and jumpLift (a fresh object each frame), never the game.
const DECK_Z = { map: null, z: NaN };
const HERO_FEET = { z: NaN }; // the last frame's drawn feet height (renderCloseView), for tests
export const closeViewHeroFeetZ = () => HERO_FEET.z;
function deckFeetLift(g, d) {
  if (g?.area !== "overworld" || !d) { DECK_Z.map = null; return; } const p = g.player, fx = footX(p), fy = footY(p), own = ownRoofDeck(g), ground = surfaceZ(g.map, fx, fy);
  const hopping = !own && g.deckHop && g.skyAir != null, under = hopping ? roofDeckAt(g.map, fx, fy) : null, deck = own || (under && under.level <= g.skyAir + 1e-6 ? under : null);
  const R = g.map === RELIEF.map ? RELIEF.R : null, z = deck ? outdoorRoofZ(deck, fx, fy, R) : hopping && DECK_Z.map === g.map ? DECK_Z.z : NaN;
  if (Number.isFinite(z)) { DECK_Z.map = g.map; DECK_Z.z = z; if (z - ground > (Number(d.lift) || 0)) d.lift = z - ground;
    if (own) { if (LEAP.map === g.map) { LEAP.base = ground; LEAP.v = 0; } d.jumpLift = 0; } // standing on the roof: it is the footing (no leap's fall from the bank left under it)
    return; }
  if (DECK_Z.map === g.map && DECK_Z.z > ground && LEAP.map === g.map && !g.droneLift && !g.glide && !g.fall) { LEAP.base = Math.max(LEAP.base, DECK_Z.z); LEAP.v = 0; d.jumpLift = Math.max(Number(d.jumpLift) || 0, LEAP.base - ground - Math.max(0, Number(d.lift) || 0)); } // down off the roof: from its height
  DECK_Z.map = null;
}
// The point of the world under a screen point (its ground or a roof deck's surface), for the aimed Rift Step's tap: { x, y, z } or
// null. A bounded march (as terrainFloorRay: 640 steps, then 14 halvings), only on a tap; null through a wall or past the far end.
export function closeViewSurfacePick(g, w, h, x, y) {
  if (!closeViewShowing(g) || !CAM.valid || Math.abs(CAM.w - w) > 1 || Math.abs(CAM.h - h) > 1) return null;
  const map = g.map, b = (x - CAM.ppx) / CAM.F, a = (CAM.ppy - y) / CAM.F, dx = CAM.fx * (CAM.cosP + a * CAM.sinP) + CAM.rx * b, dy = CAM.fy * (CAM.cosP + a * CAM.sinP) + CAM.ry * b, dz = -CAM.sinP + a * CAM.cosP;
  const top = (X, Y) => Math.max(surfaceZ(map, X, Y), deckSurfaceZ(map, X, Y)), under = (t) => CAM.hc + dz * t <= top(CAM.cx + dx * t, CAM.cy + dy * t);
  let previous = 0;
  for (let i = 1; i <= 640; i++) { const t = i * .025, X = CAM.cx + dx * t, Y = CAM.cy + dy * t; if (wallAt(map, X, Y)) return null;
    if (under(t)) { let lo = previous, hi = t; for (let k = 0; k < 14; k++) { const mid = (lo + hi) * .5; if (under(mid)) hi = mid; else lo = mid; }
      const X1 = CAM.cx + dx * hi, Y1 = CAM.cy + dy * hi; return { x: X1, y: Y1, z: top(X1, Y1) }; }
    previous = t; }
  return null;
}
export const RIFT_RING = Object.freeze({ armed: "#b48cff", ok: "#c9a8ff", bad: "#ff5a5a", width: 2, points: 28, mark: .45 });
// A ring of radius r round (X, Y) at height Z, projected (no allocation: PROJ is reused).
function worldRing(ctx, X, Y, Z, r) { const n = RIFT_RING.points; let open = false; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = i / n * 6.2832, q = project(X + Math.cos(a) * r, Y + Math.sin(a) * r, Z); if (!q) { open = false; continue; } if (open) ctx.lineTo(q.sx, q.sy); else { ctx.moveTo(q.sx, q.sy); open = true; } }
  ctx.stroke(); }
// The aimed Rift Step (constellation.ts RIFT_AIM): while armed, its reach round the feet; after the tap, a ring on the point (red
// when the step was refused) that fades.
function riftAimRing(ctx, g) {
  const armed = !!g?.riftAimArmed?.(), m = g?.riftAimMark; if (!armed && !m) return; const p = g.player, C = RIFT_RING;
  ctx.save(); ctx.lineWidth = C.width;
  if (armed) { const fx = footX(p), fy = footY(p), z = surfaceZ(g.map, fx, fy) + Math.max(0, capturedPlayer?.lift || 0), r = Number(g.riftReach?.()) || 0;
    if (r > 0) { ctx.globalAlpha = .55; ctx.strokeStyle = C.armed; ctx.setLineDash?.([6, 6]); worldRing(ctx, fx, fy, z, r); ctx.setLineDash?.([]); } }
  if (m && m.life > 0) { const z = Number.isFinite(m.z) ? m.z : Math.max(surfaceZ(g.map, m.x, m.y), deckSurfaceZ(g.map, m.x, m.y)); ctx.globalAlpha = Math.max(0, Math.min(1, m.life / (m.max || 1))); ctx.strokeStyle = m.ok ? C.ok : C.bad; worldRing(ctx, m.x, m.y, z, C.mark); }
  ctx.restore();
}
export function closeViewProject(X, Y, Z = 0) { const q = CAM.valid ? project(X, Y, Z) : null; return q ? { sx: q.sx, sy: q.sy, depth: q.depth } : null; }
// Where world (0, 0) lies in the ground texture, in device pixels, for the Wayfarer at (px, py), a texture W CSS px wide at scale
// ts (as renderCloseView lays it): always whole pixels, so a world point always reads the same texel.
export function closeViewGroundOrigin(px, py, W, ts, s = CLOSE_VIEW.groundTilePx) { const Tx = Math.round(W / 2 - px * s), Ty = Math.round(W / 2 - py * s); return { x: Tx * ts + (Math.round(Tx * ts) - Tx * ts), y: Ty * ts + (Math.round(Ty * ts) - Ty * ts) }; }

function project(X, Y, Z) { const dx = X - CAM.cx, dy = Y - CAM.cy, u = dx * CAM.rx + dy * CAM.ry, v = dx * CAM.fx + dy * CAM.fy, dz = Z - CAM.hc, depth = v * CAM.cosP - dz * CAM.sinP; if (depth < CLOSE_VIEW.near) return null; const up = v * CAM.sinP + dz * CAM.cosP; PROJ.sx = CAM.ppx + CAM.F * u / depth; PROJ.sy = CAM.ppy - CAM.F * up / depth; PROJ.depth = depth; return PROJ; }
const actorScale = (e) => Math.max(1, Math.min(4, Number(e?.scale) || (e?.boss ? 1.45 : 1), (Number(e?.bodyRadius) || .4) * 2.2));

// ------------------------------------------------------------------------------------------------ the renderer's side
// renderer.ts calls closeViewCapturing() and closeViewTake() at two marked points; nothing else in it knows about Close View.
export const closeViewCapturing = () => capturing;
// Version 5: while the GPU scene captures the ground, the ordinary renderer leaves out the floor tiles (closeViewBareFloor):
// the ground texture holds only what lies on the floor (telegraphs, traps, marks), over the floor the shader builds.
export const closeViewBareFloor = () => capturing && bareFloor;
export const closeViewWorldCapture = () => capturing && worldCapture;
export const closeViewActorLift = (draw, native = false) => Math.max(draw?.climb ? -Infinity : 0, // climb: presentLeap's feet still rising onto a lip they crossed
  (draw?.lift || 0) + (draw?.jumpLift || 0) + (native ? draw?.nativeLift || 0 : 0));
export function closeViewTake(draws, playerDraw) { captured = draws; capturedPlayer = playerDraw; }

function makeCanvas() {
  if (CLOSE_VIEW_HOOKS.makeCanvas) return CLOSE_VIEW_HOOKS.makeCanvas();
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && document.createElement) return document.createElement("canvas");
  return null;
}
function groundCanvas(W, H, ts) {
  if (!GROUND.canvas && !GROUND.failed) { GROUND.canvas = makeCanvas(); GROUND.ctx = GROUND.canvas?.getContext?.("2d") || null; if (!GROUND.ctx) { GROUND.canvas = null; GROUND.failed = true; } }
  if (!GROUND.ctx) return null;
  const cw = Math.ceil(W * ts), chh = Math.ceil(H * ts) + CLOSE_VIEW.actors.atlas; // the texture, and below it the billboards' atlas
  if (GROUND.canvas.width !== cw || GROUND.canvas.height !== chh) { GROUND.canvas.width = cw; GROUND.canvas.height = chh; GROUND.torch = null; }
  GROUND.atlasY = Math.ceil(H * ts);
  GROUND.W = W; GROUND.H = H; GROUND.ts = ts; return GROUND.ctx;
}
export function setCloseViewCanvasFactory(factory) { CLOSE_VIEW_HOOKS.makeCanvas = factory || null; GROUND.canvas = null; GROUND.ctx = null; GROUND.failed = false; GROUND.torch = null; SCREEN.ctx = null; CUE.glow = CUE.ao = null; CUE.failed = false; GRIT_TEX.length = 0; gritFailed = false; }

function qualityOf(g) { const q = g.presentation?.effectiveQuality; return CLOSE_VIEW.quality[q] || CLOSE_VIEW.quality.balanced; }
// Far to near. Depths within 1/1000 of a tile are a tie, broken the same way every frame (a wall face before a billboard, then
// by face or draw index), so a face and a billboard at nearly one depth never swap from frame to frame (version 1 flickered).
const drawsBefore = (a, b) => { const d = itemDepth[a] - itemDepth[b]; if (d > 1e-3) return true; if (d < -1e-3) return false; if (itemKind[a] !== itemKind[b]) return itemKind[a] < itemKind[b]; return itemRef[a] < itemRef[b]; };
function insertionSortByDepth(n) { for (let i = 1; i < n; i++) { const o = order[i]; let j = i - 1; while (j >= 0 && drawsBefore(o, order[j])) { order[j + 1] = order[j]; j--; } order[j + 1] = o; } }

// Draw the frame in Close View. Returns false (nothing drawn) when there is no ground canvas to draw with; the renderer then
// draws its ordinary view.
// A failed GPU frame never commits its captured floor/actor ownership to the screen.
function abortCloseViewGLFrame() {
  noteCloseViewGLFrameAbort();
  captured = capturedPlayer = null; capturing = bareFloor = worldCapture = false; CAM.drawn = false;
  GLB.nBoard = GLB.nDecal = GLB.nGlowStart = 0;
  closeViewGLStats.echoRibbonPaths = closeViewGLStats.echoRibbonVertices = 0;
  resetCloseViewGL();
  return false;
}
export function renderCloseView(ctx, g, w, h, now, baseRender, mix = 1) {
  const Q = qualityOf(g), C = CLOSE_VIEW.camera, A = CLOSE_VIEW.actors, Wl = CLOSE_VIEW.walls, Fg = CLOSE_VIEW.fog, Lt = CLOSE_VIEW.light, p = g.player, E = CLOSE_VIEW.blend.from;
  const extended = overworldCloseViewApplies(g), flatWorld = extended && !interiorTerrain(g.map), outdoor = extended && openWorldScene(g);
  const plainWorld = outdoor && flatWorld && !g.map.building;
  cameraScene(g);
  const Cp = closeViewPreset(g), camH = lerp(E.height, outdoor && Number.isFinite(Cp.outdoorHeight) ? outdoorCrane(Cp, w, h) : Cp.height, mix), camD = lerp(E.distance, boomReach(g), mix), fogShift = (1 - mix) * CLOSE_VIEW.blend.fogShift + mix * (Number(Cp.fogPush) || 0) /* the longer boom pushes the fog out with it */, air = stillworksCloseView(g.map) ? STILLWORKS_AIR : Fg;
  const fogFar = flatWorld ? Q.radius + 2 : air.far + fogShift, fogNear = flatWorld ? fogFar * .65 : air.near + fogShift;
  const s = CLOSE_VIEW.groundTilePx, R = Q.radius, W = Math.max(12 * s, Math.ceil(2 * (R + 1) * s)), H = W, ts = Q.texScale;
  CAM.drawn = false; const gc = groundCanvas(W, H, ts); if (!gc) return false; const T = closeViewTimings, tm = T.on, t0 = tm ? performance.now() : 0;
  closeViewStats.rigProbes = closeViewStats.rigSamples = 0;
  ensureCam(g); turnCamera(g, now);
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode);
  // version 4: the GPU scene when it can be had (close-view-gl.ts); else the 2D view of version 3
  const useGL = Q.gl === true && CLOSE_VIEW_HOOKS.gl !== false && !!ctx.canvas && closeViewGLReady(makeCanvas); closeViewStats.gl = useGL ? 1 : 0;
  if (useGL && !closeViewGLFrameReady()) return abortCloseViewGLFrame();
  if (extended && !useGL) return false;
  // the heightfield outdoors: the open world's own scene, with the GPU able to draw it (else the flat ground, as before)
  const relief = useGL && outdoor && flatWorld && g.area === "overworld" && !g.map.building && closeViewReliefAvailable() && closeViewOutdoorAvailable();
  RELIEF.map = relief ? g.map : null; RELIEF.R = relief ? outdoorRelief(g.map) : null;
  if (useGL && !plainWorld) staticFor(g.map, wallGeometry(g.map), themeOf(g.map)); // arch clearance must exist before the first GPU camera frame
  if (interiorTerrain(g.map) && (!useGL || staticFor(g.map, wallGeometry(g.map), themeOf(g.map)).verts > 200000)) return false; // the ordinary view is the safe non-WebGL heightfield renderer
  if (!useGL && stillworksCloseView(g.map)) return false; // cover and upright gates need the depth buffer
  if (!useGL && g.map?.building && hasStoneBuilds(g.map)) return false; // a raised legacy block also needs real depth; use the established world-view fallback
  const shots = useGL ? selectProjectedShots(g, Q, reduce) : null;
  if (useGL && !shots) return false;
  // 1. the ground, drawn by the ordinary renderer into the texture, its actors captured.
  // Version 4: the texture is anchored to the world. The renderer puts world (0, 0) at a whole CSS pixel (Tx, Ty); at a
  // texture scale that is not whole (.75, 1.25) that point fell between device pixels, by a different fraction each step, and
  // the texture's crisp pixels were resampled differently each frame (the floor shimmered as you walked). (gox, goy) puts it on
  // a whole device pixel. The host's layers place themselves from the unrounded camera: they are moved by the rounding (dxL,
  // dyL), so a trap mark or a telegraph lies exactly where the floor under it is.
  const Tx = Math.round(W / 2 - p.x * s), Ty = Math.round(H / 2 - p.y * s), gox = Math.round(Tx * ts) - Tx * ts, goy = Math.round(Ty * ts) - Ty * ts, dxL = (Tx - (W / 2 - p.x * s)) * ts, dyL = (Ty - (H / 2 - p.y * s)) * ts;
  gc.setTransform(ts, 0, 0, ts, gox, goy); gc.imageSmoothingEnabled = false; captured = null; capturedPlayer = null; capturing = true; bareFloor = useGL && !flatWorld; worldCapture = flatWorld;
  try { baseRender(gc, g, W, H, now);
    if (useGL && flatWorld && themeOf(g.map)?.features) featureFloor(g, gc, s, ts, gox, goy, Tx, Ty, R); // 2026-11-11
    if (shots) {
      shots.now = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now;
      // Effect producers hand over exact source references and body-only closures. Even a cap-overflow body
      // keeps its captured sprite; suppression does not depend on guessing the later native admission result.
      const auxiliarySeen=glSeen(g.map);
      shots.captureActor = (spec) => {
        if (!spec?.source || !Number.isFinite(spec.x) || !Number.isFinite(spec.y) || typeof spec.draw !== 'function' || typeof spec.sample !== 'function') return false;
        if(auxiliarySeen&&!auxiliarySeen(spec.x,spec.y))return true;
        captured.push({ x:spec.x-.5,y:spec.y-.82,lift:spec.lift||0,nativeAux:spec,nativeHeight:spec.height||1.8,nativeEffects:!!spec.decorate,
          nativeDecorations:spec.decorate?()=>spec.decorate(gc,s):null,
          // A rejected native body still owns its residual label/effects on its sprite card.
          fn:()=>{spec.draw(gc,s);spec.decorate?.(gc,s);} });
        return true;
      };
    }
    for (const layer of CLOSE_VIEW_HOOKS.groundLayers) { gc.setTransform(ts, 0, 0, ts, gox + dxL, goy + dyL); layer(gc, W, H, shots); } } finally { capturing = worldCapture = false; }
  flatPass(g, captured, gc, s, ts, gox, goy, Tx, Ty);
  if (capturedPlayer && RELIEF.map === g.map) presentLeap(g, now, capturedPlayer); // the taller levels: a jump that reaches the ledge, a drop that falls
  if (capturedPlayer) deckFeetLift(g, capturedPlayer); // roof decks: on (or hopping over) a roof, the feet on its drawn surface
  HERO_FEET.z = capturedPlayer ? surfaceZ(g.map, footX(p), footY(p)) + closeViewActorLift(capturedPlayer) : NaN; // where the Wayfarer's feet are drawn (tests)
  const dread = Math.max(0, Math.min(1, Number(g.map?.building?.dread) || 0));
  const flick = reduce ? 1 : 1 + Lt.flicker * Math.sin(now / Lt.flickerMs) * Math.sin(now / (Lt.flickerMs * 2.7) + 1.3), lightR = Lt.radius * (1 - dread * Lt.dreadShrink) * flick * lanternReach(g.save, g.area); /* the Lantern (spell-slots.ts LANTERN.closeReach): lit in a dark place, the torch reaches further (both paths read lightR) */
  const t1 = tm ? performance.now() : 0;
  // the floor's boundaries (the shadow along every wall's foot, the rims of holes and lava), built once a floor, one copy a frame
  if (!useGL) { const geo0 = wallGeometry(g.map), ec = geo0.edges || (geo0.edges = edgeCanvas(g.map, geo0)); if (ec) { const k0 = s * ts / CLOSE_VIEW.edges.px; gc.save(); gc.imageSmoothingEnabled = true; gc.setTransform(k0, 0, 0, k0, Tx * ts + gox, Ty * ts + goy); gc.drawImage(ec, 0, 0); gc.restore(); gc.setTransform(ts, 0, 0, ts, gox, goy); } }
  aimChevron(gc, g, s, ts, W, H, gox, goy);
  // 2. torch falloff over the ground (the Wayfarer is always at the same texture point, so the gradient is built once). The
  // GPU scene lights the floor itself, per pixel.
  if (!useGL) { gc.setTransform(ts, 0, 0, ts, gox, goy);
  const fxp = Tx + footX(p) * s, fyp = Ty + footY(p) * s, base = Lt.radius * s;
  if (!GROUND.torch || GROUND.torchX !== fxp || GROUND.torchY !== fyp || GROUND.torchR !== base) { const gr = gc.createRadialGradient(fxp, fyp, 0, fxp, fyp, base); gr.addColorStop(0, fogA(0)); gr.addColorStop(Lt.inner, fogA(0)); gr.addColorStop(.75, fogA((1 - Lt.ambient) * .7)); gr.addColorStop(1, fogA(1 - Lt.ambient)); GROUND.torch = gr; GROUND.torchX = fxp; GROUND.torchY = fyp; GROUND.torchR = base; }
  const lk = lightR / Lt.radius; gc.translate(fxp, fyp); gc.scale(lk, lk); gc.translate(-fxp, -fyp); gc.fillStyle = GROUND.torch; gc.fillRect(fxp - W / lk, fyp - H / lk, 2 * W / lk, 2 * H / lk); gc.setTransform(ts, 0, 0, ts, gox, goy); }
  // the camera for this frame. Version 4: the boom hangs from the follow point (CLOSE_VIEW.camera.follow), not the feet
  const fx = Math.cos(CAM.yaw), fy = Math.sin(CAM.yaw), rx = -fy, ry = fx, dt = CAM.valid ? CAM.dt : 1; let followSnapped = false;
  { const tx = footX(p), ty = footY(p), off = Math.hypot(tx - CAM.fpx, ty - CAM.fpy);
    if (!Number.isFinite(off) || off > C.followSnap || !CAM.valid) { CAM.fpx = tx; CAM.fpy = ty; CAM.fvx = CAM.fvy = 0; followSnapped = true; }
    else if (CAM.dt > 0) { spring(CAM, "fpx", "fvx", tx, C.follow, CAM.dt); spring(CAM, "fpy", "fvy", ty, C.follow, CAM.dt); const ex = CAM.fpx - tx, ey = CAM.fpy - ty, el = Math.hypot(ex, ey); if (el > C.followMax) { CAM.fpx = tx + ex / el * C.followMax; CAM.fpy = ty + ey / el * C.followMax; } }
    if (camWall(g.map, CAM.fpx, CAM.fpy) || !sightTo(g.map, tx, ty, CAM.fpx, CAM.fpy)) { CAM.fpx = tx; CAM.fpy = ty; CAM.fvx = CAM.fvy = 0; } }
  const feetBoom = boomLength(g, fx, fy);
  const followShare = Math.max(0, Math.min(1, (feetBoom / camD - C.shoulderCenter) / (C.shoulderFull - C.shoulderCenter)));
  // At a short boom, sideways spring lag is effectively an extra shoulder: it can put the hood outside a
  // portrait viewport. Center that component with compression, retaining the longitudinal follow spring.
  const sideLag = ((CAM.fpx - footX(p)) * rx + (CAM.fpy - footY(p)) * ry) * (CAM.centeredRear ? 1 : 1 - followShare);
  let ax = CAM.fpx - rx * sideLag, ay = CAM.fpy - ry * sideLag;
  let want = Math.min(camD, boomLength(g, fx, fy, ax, ay), feetBoom + Math.hypot(ax - footX(p), ay - footY(p)));
  // Probe the requested centered rig, not last frame's shortened eye. Feedback from the latter alternated
  // between "clear" and "blocked" at stationary corners, repeatedly extending and cutting the boom.
  want *= sightClear(g.map, footX(p), footY(p), ax - fx * want, ay - fy * want, C.sightStep, C.sightPad);
  want = Math.max(.03, want);
  const offsetWant = clearanceOffset(g, fx, fy, ax, ay, want, dt, mix);
  if (offsetWant) { ax += rx * CAM.rigOffset; ay += ry * CAM.rigOffset; want = offsetWant; }
  // critically damped springs (stable at any frame rate, never overshooting); a boom that would leave the camera inside a
  // wall is cut at once, the only snap there is
  // an arrival in the open overworld (CLOSE_VIEW.camera.crossing): every spring starts at its target, so nothing eases in
  const snap = CAM.snapNext; if (snap) { CAM.dist = want; CAM.distV = 0; }
  spring(CAM, "dist", "distV", want, want < CAM.dist ? C.pullIn : C.letOut, dt); if (CAM.dist > want + .02 && camWall(g.map, ax - fx * CAM.dist, ay - fy * CAM.dist)) { CAM.dist = want; CAM.distV = 0; }
  { const craneTo = Math.min(Math.max(camH, Wl.height - C.craneClear), camH + Math.max(0, camD - CAM.dist) * C.crane); if (snap) { CAM.crane = craneTo; CAM.craneV = 0; }
    spring(CAM, "crane", "craneV", craneTo, C.letOut * 1.5, dt); }
  const craneUp = CAM.crane, baseF = Math.max((w / 2) / Math.tan(Cp.fov * DEG / 2), (h / 2) / Math.tan(CLOSE_VIEW.fov.verticalMax * DEG / 2));
  const focalRelief = tightCornerFamily(g) ? Math.max(0, Math.min(1, (C.minDistance - want) / C.minDistance)) : 0;
  if (snap) { CAM.focal = lerp(1, C.tightFocal, focalRelief); CAM.focalV = 0; }
  spring(CAM, "focal", "focalV", lerp(1, C.tightFocal, focalRelief), C.letOut * 1.5, dt);
  const F = baseF * CAM.focal;
  // the shoulder: the camera steps right of the boom's end, as far as the walls let it (eased like the boom)
  const bx = ax - fx * CAM.dist, by = ay - fy * CAM.dist, sh = CAM.centeredRear ? 0 : (offsetWant ? 0 : Cp.shoulder * mix) * Math.max(0, Math.min(1, (CAM.dist / camD - C.shoulderCenter) / (C.shoulderFull - C.shoulderCenter))); let room = sh;
  for (let t = C.boomStep / 2; t <= sh + C.boomPad; t += C.boomStep / 2) if (camWall(g.map, bx + rx * t, by + ry * t)) { room = Math.max(0, t - C.boomPad); break; }
  // An open endpoint alone does not clear a concave corner between the shoulder and the player.
  if (sightClear(g.map, footX(p), footY(p), bx + rx * room, by + ry * room, C.sightStep, C.sightPad) < 1) room = 0;
  if (snap) { CAM.shoulderRoom = CAM.shoulder = room; CAM.shoulderV = 0; }
  if (room <= CAM.shoulderRoom) { CAM.shoulderRoom = room; CAM.shoulderClearFor = 0; }
  else { CAM.shoulderClearFor += dt; if (CAM.shoulderClearFor >= C.shoulderRecover) CAM.shoulderRoom = room; }
  spring(CAM, "shoulder", "shoulderV", CAM.shoulderRoom, room < CAM.shoulder ? C.pullIn : C.letOut, dt);
  if (CAM.shoulder > room) { CAM.shoulder = room; CAM.shoulderV = 0; } // clearance takes precedence over recovery damping
  CAM.cx = bx + rx * CAM.shoulder; CAM.cy = by + ry * CAM.shoulder;
  // the hard rule under the springs: the camera is never inside a wall. If a spring still lags there (the view turning in a
  // narrow way), the shoulder goes and the boom shortens at once until it is clear.
  if (camWall(g.map, CAM.cx, CAM.cy)) { CAM.shoulder = CAM.shoulderV = 0; let d = CAM.dist; while (d > .03 && camWall(g.map, ax - fx * d, ay - fy * d)) d -= .03;
    CAM.dist = Math.max(.03, d); CAM.distV = 0; CAM.cx = ax - fx * CAM.dist; CAM.cy = ay - fy * CAM.dist; }
  // version 5: nothing stands between the camera and the Wayfarer. The spring aims at the shorter of the boom from the follow
  // point and from their feet; if a corner still cuts the line from their feet to the camera (the shoulder, a turn in a narrow
  // way), the camera is drawn in along that line at once, to where it clears by `hardPad`.
  { const tx = footX(p), ty = footY(p), k = sightClear(g.map, tx, ty, CAM.cx, CAM.cy, C.sightStep, C.hardPad);
    if (k < 1) { CAM.cx = tx + (CAM.cx - tx) * k; CAM.cy = ty + (CAM.cy - ty) * k; CAM.shoulder = CAM.shoulderV = 0; CAM.dist = Math.max(.03, Math.hypot(CAM.cx - ax, CAM.cy - ay)); CAM.distV = 0; closeViewStats.sightCuts++; }
  }
  const playerZ = RELIEF.map === g.map && LEAP.map === g.map ? LEAP.base + Math.max(0, capturedPlayer?.lift || 0) // over the heightfield the camera follows the Wayfarer's footing, not each jump's arc
    : surfaceZ(g.map, footX(p), footY(p)) + Math.max(0, (capturedPlayer?.lift || 0) + (capturedPlayer?.jumpLift || 0));
  // The calm pass (CLOSE_VIEW.camera.vertical): the camera's height rides an eased anchor after the footing, so a step up,
  // a ledge or a drop is followed, not cut to. The framing below still fits the Wayfarer's true height.
  { const V = C.vertical, leapClock = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now, leaping = RELIEF.map === g.map && !g.fall && DECK_Z.map !== g.map && leapClock < (g.jumpUntil || 0) + V.jumpHold, tau = reduce ? V.reducedTau : leaping ? Math.min(V.tau, V.jumpTau) : V.tau, lag = CAM.zA - playerZ;
    if (!CAM.valid || followSnapped || !Number.isFinite(lag) || Math.abs(lag) >= V.snap || !(tau > 0)) { CAM.zA = playerZ; CAM.zAV = 0; }
    else { spring(CAM, "zA", "zAV", playerZ, 2 / tau, dt); const d = CAM.zA - playerZ, cap = DECK_Z.map === g.map ? Math.max(V.maxLag, V.deckLag) : V.maxLag; if (Math.abs(d) > cap) { CAM.zA = playerZ + Math.sign(d) * cap; CAM.zAV = 0; } } } // on or over a roof deck (deckFeetLift): the roof's own lag
  const anchorZ = CAM.zA;
  // Sample the final eye, not the previous frame's position. Arches and the roof
  // remain solid even when a collision or a jump changes the camera in one frame.
  const cap = (x, y) => outdoor ? Infinity : (interiorTerrain(g.map) ? surfaceZ(g.map, x, y) : 0) + Math.min(hallHeight(g.map) - .15, archCapAt(g.map, x, y));
  let terrainCameraZ = Math.min(anchorZ + craneUp, cap(CAM.cx, CAM.cy));
  if (outdoor && RELIEF.map === g.map) { // over the heightfield (CLOSE_VIEW.camera.outdoor): only ground that blocks the chest moves the camera, and eased
    const O = C.outdoor, px = footX(p), py = footY(p), dx = CAM.cx - px, dy = CAM.cy - py, chestZ = playerZ + O.chest, base = terrainCameraZ, top = base + O.riseMax;
    let need = base, keep = 1;
    // A fixed handful of samples from the chest to the eye. Each sample's ground is held against the line where it passes the
    // sample before (`kk`), so a ledge whose near edge falls between two samples still counts from that edge.
    if (dx * dx + dy * dy > 1e-6) for (let i = 1; i <= O.samples; i++) {
      const k = i / O.samples, kk = (i === 1 ? .5 : i - 1) / O.samples, gz = surfaceZ(g.map, px + dx * k, py + dy * k) + O.clear, req = chestZ + (gz - chestZ) / kk; if (req > need) need = req;
      if (gz > chestZ) { const f = gz >= top ? kk : (top - chestZ) * kk / (gz - chestZ); if (f < keep) keep = f; } }
    const L0 = Math.hypot(dx, dy), rise = Math.max(0, Math.min(O.riseMax, need - base)); keep = Math.max(Math.min(1, C.closest / Math.max(1e-3, L0)), Math.min(1, keep));
    if (!CAM.valid || followSnapped) { CAM.tRise = rise; CAM.tKeep = keep; CAM.tRiseV = CAM.tKeepV = CAM.tRiseFor = CAM.tKeepFor = 0; }
    else {
      if (rise >= CAM.tRise) { CAM.tRiseFor = 0; spring(CAM, "tRise", "tRiseV", rise, O.riseRate, dt); }
      else if ((CAM.tRiseFor += dt) >= O.hold) spring(CAM, "tRise", "tRiseV", rise, O.letOut, dt);
      if (keep <= CAM.tKeep) { CAM.tKeepFor = 0; spring(CAM, "tKeep", "tKeepV", keep, O.pullIn, dt); }
      else if ((CAM.tKeepFor += dt) >= O.hold) spring(CAM, "tKeep", "tKeepV", keep, O.letOut, dt);
      CAM.tRise = Math.max(0, Math.min(O.riseMax, CAM.tRise)); CAM.tKeep = Math.max(0, Math.min(1, CAM.tKeep));
    }
    if (CAM.tKeep < 1) { CAM.cx = px + dx * CAM.tKeep; CAM.cy = py + dy * CAM.tKeep; closeViewStats.terrainPulls++; }
    terrainCameraZ = Math.max(surfaceZ(g.map, CAM.cx, CAM.cy) + O.clear, base + CAM.tRise); // the eye itself is never under the ground
    CAM.shown = CAM.tKeep < 1 ? Math.hypot(CAM.cx - ax, CAM.cy - ay) : CAM.dist;
  } else {
    if (interiorTerrain(g.map) || hasStoneBuilds(g.map)) { // the camera's line to the Wayfarer never dips under the ground
      const dx = CAM.cx - footX(p), dy = CAM.cy - footY(p), steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .08));
      for (let i = 1; i <= steps; i++) {
        const k = i / steps, x = footX(p) + dx * k, y = footY(p) + dy * k, z = playerZ + .6 + (terrainCameraZ - playerZ - .6) * k;
        if (z < surfaceZ(g.map, x, y) + .12 || z > cap(x, y)) {
          const keep = Math.max(0, (i - 1) / steps);
          CAM.cx = footX(p) + dx * keep; CAM.cy = footY(p) + dy * keep;
          CAM.dist = Math.hypot(CAM.cx - ax, CAM.cy - ay); CAM.distV = 0;
          terrainCameraZ = Math.min(anchorZ + craneUp, cap(CAM.cx, CAM.cy)); break;
        }
      }
      terrainCameraZ = Math.max(surfaceZ(g.map, CAM.cx, CAM.cy) + .12, terrainCameraZ);
    }
    CAM.shown = CAM.dist;
  }
  const eyeDX = footX(p) - CAM.cx, eyeDY = footY(p) - CAM.cy;
  const compression = Math.min(1, Math.hypot(eyeDX, eyeDY) / Math.max(.15, camD));
  const ahead = Math.max(.15, lerp(E.lookAhead, Cp.lookAhead, mix) * compression);
  const forward = Math.max(.03, eyeDX * fx + eyeDY * fy);
  const requestedPitch = Math.atan2(terrainCameraZ - anchorZ - lerp(E.lookHeight, Cp.lookHeight, mix), forward + ahead) + CAM.pitchUser * mix;
  // Use the same foot anchor as the visible model, slightly beyond the movement foot.
  const bodyForward = Math.max(.03, forward + .07 * fy);
  const framing = C.framing, margin = h * framing.margin, ppy0 = h * C.center;
  const footAngle = Math.atan2(terrainCameraZ - playerZ, bodyForward);
  const headAngle = Math.atan2(terrainCameraZ - playerZ - framing.bodyHeight, bodyForward);
  let lowPitch = Math.max(framing.pitchMin, footAngle - Math.atan2(h - margin - ppy0, F));
  let highPitch = Math.min(framing.pitchMax, headAngle + Math.atan2(ppy0 - margin, F));
  // A small shoulder still matters close to the near plane, especially in portrait.
  // depth = range*cos(angle-pitch); intersect the vertical fit with enough depth
  // to keep each endpoint inside the horizontal frame and outside the near plane.
  const side = eyeDX * rx + (eyeDY + .07) * ry;
  const minBodyDepth = Math.max(CLOSE_VIEW.near + .01, F * Math.abs(side) / (w * (.5 - framing.margin)));
  for (let end = 0; end < 2; end++) {
    const z = playerZ + end * framing.bodyHeight;
    const dz = terrainCameraZ - z, range = Math.hypot(bodyForward, dz);
    if (range < minBodyDepth) { highPitch = lowPitch - 1; break; }
    const angle = Math.atan2(dz, bodyForward), room = Math.acos(Math.min(1, minBodyDepth / range));
    lowPitch = Math.max(lowPitch, angle - room); highPitch = Math.min(highPitch, angle + room);
  }
  // A very short boom under a low arch may not fit the whole body. Centre its
  // angular span within the available lens and keep the camera on the clear side of the wall.
  const terrainPitch = lowPitch <= highPitch ? Math.max(lowPitch, Math.min(highPitch, requestedPitch))
    : Math.max(framing.pitchMin, Math.min(framing.pitchMax, (footAngle + headAngle) / 2));
  CAM.fx = fx; CAM.fy = fy; CAM.rx = rx; CAM.ry = ry; CAM.F = F; CAM.ppx = w / 2; CAM.ppy = h * C.center;
  CAM.cosP = Math.cos(terrainPitch); CAM.sinP = Math.sin(terrainPitch); CAM.hc = terrainCameraZ; CAM.w = w; CAM.h = h; CAM.valid = true; CAM.snapNext = false;
  const cosP = CAM.cosP, sinP = CAM.sinP, hc = CAM.hc, ppx = CAM.ppx, ppy = CAM.ppy;
  // the background: the dark beyond the light, and the vault above
  if (!useGL) { ctx.fillStyle = FOG_CSS; ctx.fillRect(0, 0, w, h); }
  const t2 = tm ? performance.now() : 0;
  // 3. the floor, in bands of equal depth ratio from the screen's foot to the fog's far edge
  const floorRow = (v) => ppy - F * (v * sinP - hc * cosP) / (v * cosP + hc * sinP), vOfRow = (y) => { const a = (ppy - y) / F; return hc * (cosP + a * sinP) / (sinP - a * cosP); };
  const vNear = vOfRow(h), vFar = fogFar, dNear = Math.max(CLOSE_VIEW.near, vNear * cosP + hc * sinP), dFar = vFar * cosP + hc * sinP, nb = Q.floorBands, img = GROUND.canvas, sts = s * ts;
  let yPrev = h; closeViewStats.bands = 0;
  if (!useGL) for (let i = 1; i <= nb; i++) {
    const d1 = dNear * Math.pow(dFar / dNear, i / nb), v1 = (d1 - hc * sinP) / cosP, y1 = Math.max(0, floorRow(v1)); if (y1 >= yPrev - .25) continue;
    // Version 2: the band's rows are mapped exactly at both its edges (the secant, not the tangent at its middle row), so the
    // floor is continuous across band seams and nothing crawls along them as the camera moves; its lateral scale is the one at
    // the geometric mean depth. And the texture is sampled smoothly (nearest-texel sampling of the magnified floor shimmered).
    // Version 3 (Tim: "it looks kind of shit... we need some visual passes"): version 2 gave a whole band one lateral scale,
    // so anything running into the view (a rug's edge, a telegraph, a tile line) stepped sideways at every band seam. Now each
    // band is two triangles, each mapped exactly at its three corners: the floor is continuous everywhere, with no steps.
    // The band's corners on screen (x 0 and w, rows y1 and yPrev) and in the ground texture:
    for (let c = 0; c < 4; c++) { const rowY = c < 2 ? y1 : yPrev, sx = c & 1 ? w : 0, vv = vOfRow(rowY), dd = vv * cosP + hc * sinP, uu = (sx - ppx) * dd / F, X = CAM.cx + rx * uu + fx * vv, Y = CAM.cy + ry * uu + fy * vv;
      BAND[c * 4] = sx; BAND[c * 4 + 1] = rowY; BAND[c * 4 + 2] = (X * s + Tx) * ts + gox; BAND[c * 4 + 3] = (Y * s + Ty) * ts + goy; }
    floorTriangle(ctx, img, 2, 3, 0); floorTriangle(ctx, img, 3, 1, 0); // (0, yPrev) (w, yPrev) (0, y1), then (w, yPrev) (w, y1) (0, y1)
    closeViewStats.bands++;
    yPrev = y1;
  }
  const yFar = floorRow(vFar);
  if (SCREEN.ctx !== ctx) { SCREEN.ctx = ctx; SCREEN.fog = SCREEN.vignette = SCREEN.warm = SCREEN.vault = null; }
  if (Q.fogGradient && !useGL) { const yk = Math.round(yFar); if (!SCREEN.fog || SCREEN.fogW !== w || SCREEN.fogH !== h || SCREEN.fogY !== yk) { const vFogNear = fogNear, yN = floorRow(vFogNear), gr = ctx.createLinearGradient(0, yFar, 0, Math.max(yFar + 1, yN)); gr.addColorStop(0, fogA(1)); gr.addColorStop(1, fogA(0)); SCREEN.fog = gr; SCREEN.fogEnd = Math.max(yFar + 1, yN); SCREEN.fogW = w; SCREEN.fogH = h; SCREEN.fogY = yk; }
    ctx.fillStyle = SCREEN.fog; ctx.fillRect(0, yFar - 1, w, Math.min(h, SCREEN.fogEnd) - yFar + 1); } // below the fog's near row it is clear: not filled
  const t3 = tm ? performance.now() : 0;
  // 4 and 5. walls and actors, depth sorted together
  // Walls are kept to the same reach as the floor: as far ahead of the camera as the floor is drawn (the fog's far edge). They
  // used to be kept within a radius of the Wayfarer instead, so a wall ahead and to the side could be dropped while the floor
  // beyond it (another room) was still drawn: one of the ways the view saw through walls.
  const geo = plainWorld ? OPEN_WORLD_GEOMETRY : wallGeometry(g.map), faces = geo.faces, H0 = Wl.height, ox = footX(p), oy = footY(p), reach = fogFar + 1, cutPad2 = Wl.cutPad * Wl.cutPad;
  let n = 0; closeViewStats.faces = 0; closeViewStats.facesCut = 0; closeViewStats.boards = 0; closeViewStats.culled = 0;
  const disc = !!g.map?.dungeonContract?.discoveryEnabled, minCx = Math.max(0, Math.floor((CAM.cx - reach) / geo.C)), maxCx = Math.min(geo.cw - 1, Math.floor((CAM.cx + reach) / geo.C)), minCy = Math.max(0, Math.floor((CAM.cy - reach) / geo.C)), maxCy = Math.min(geo.ch - 1, Math.floor((CAM.cy + reach) / geo.C));
  // the Wayfarer's place on screen, for the cut-away
  const pq = project(ox, oy, 0), pDepth = pq ? pq.depth : CAM.dist, pSx = pq ? pq.sx : ppx, pSy = pq ? pq.sy : ppy, pk = F / Math.max(.2, pDepth), pHalf = (Wl.cutPad + .4) * pk, pTop = pSy - 1.25 * pk;
  if (!useGL) for (let cy = minCy; cy <= maxCy; cy++) for (let cx = minCx; cx <= maxCx; cx++) { const ci = cy * geo.cw + cx; // version 5: the GPU scene draws its walls from a static buffer (no per-frame face work)
    for (let j = geo.start[ci]; j < geo.end[ci]; j++) { const fi = geo.index[j], o = fi * 10, x0 = faces[o], y0 = faces[o + 1], x1 = faces[o + 2], y1 = faces[o + 3], nx = faces[o + 4], ny = faces[o + 5];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; if (Math.min((x0 - CAM.cx) * fx + (y0 - CAM.cy) * fy, (x1 - CAM.cx) * fx + (y1 - CAM.cy) * fy) > reach) { closeViewStats.culled++; continue; } // beyond the floor's far edge
      if ((mx - CAM.cx) * nx + (my - CAM.cy) * ny >= 0) { closeViewStats.culled++; continue; } // its back is to the camera
      if (disc && dungeonTileVisibility(g.map, faces[o + 6], faces[o + 7]) === "unseen") continue;
      // clip the edge to the near plane, on whichever of its lines is nearer the camera (the top looking down, the foot looking up)
      const top = faces[o + 9] ? Wl.rubble : H0, dz = sinP >= 0 ? top - hc : -hc;
      let ax = x0, ay = y0, bx = x1, by = y1; const da = ((ax - CAM.cx) * fx + (ay - CAM.cy) * fy) * cosP - dz * sinP, db = ((bx - CAM.cx) * fx + (by - CAM.cy) * fy) * cosP - dz * sinP, nr = CLOSE_VIEW.near;
      if (da < nr && db < nr) { closeViewStats.culled++; continue; }
      let cornerBits = geo.corner[fi];
      let u0 = 0, u1 = 1; // the share of the face's width left after the cut (its grit texture is cut the same way, never squeezed)
      if (da < nr) { const t = (nr - da) / (db - da); ax += (bx - ax) * t; ay += (by - ay) * t; cornerBits &= 2; u0 = t; } else if (db < nr) { const t = (nr - db) / (da - db); bx += (ax - bx) * t; by += (ay - by) * t; cornerBits &= 1; u1 = 1 - t; }
      const q0 = project(ax, ay, 0); if (!q0) continue; const s0x = q0.sx, s0y = q0.sy, d0 = q0.depth; const q1 = project(bx, by, 0); if (!q1) continue; const s1x = q1.sx, s1y = q1.sy, d1 = q1.depth;
      const q2 = project(bx, by, top); if (!q2) continue; const s2x = q2.sx, s2y = q2.sy; const q3 = project(ax, ay, top); if (!q3) continue; const s3x = q3.sx, s3y = q3.sy;
      if (Math.max(s0x, s1x, s2x, s3x) < 0 || Math.min(s0x, s1x, s2x, s3x) > w || Math.max(s0y, s1y) < 0 || Math.min(s2y, s3y) > h) { closeViewStats.culled++; continue; }
      if (n >= N) grow();
      // each quad overlaps its neighbours by `seam` px along the wall's run, so a straight wall reads as one surface (the
      // antialiased seams between separately filled quads showed as hairlines that shimmered as the view moved)
      const sm = CLOSE_VIEW.edges.seam, bl = Math.hypot(s1x - s0x, s1y - s0y) || 1, tl = Math.hypot(s2x - s3x, s2y - s3y) || 1, bux = (s1x - s0x) / bl * sm, buy = (s1y - s0y) / bl * sm, tux = (s2x - s3x) / tl * sm, tuy = (s2y - s3y) / tl * sm;
      const fo = n * 8; faceXY[fo] = s0x - bux; faceXY[fo + 1] = s0y - buy; faceXY[fo + 2] = s1x + bux; faceXY[fo + 3] = s1y + buy; faceXY[fo + 4] = s2x + tux; faceXY[fo + 5] = s2y + tuy; faceXY[fo + 6] = s3x - tux; faceXY[fo + 7] = s3y - tuy;
      const dl = Math.hypot(mx - ox, my - oy) / lightR, depthMid = (d0 + d1) / 2, lit = (1 - Math.min(1, Math.max(0, (dl - Lt.inner) / (1 - Lt.inner)))) * (1 - Lt.ambient) + Lt.ambient, fog = Math.min(1, Math.max(0, (depthMid - fogNear) / (fogFar - fogNear)));
      faceLevel[n] = Math.round(Math.pow(Math.max(0, lit * (1 - fog)), Fg.gamma) * (L - 1)); faceStyle[n] = faces[o + 8]; faceOrient[n] = nx !== 0 ? 0 : 1; faceLow[n] = faces[o + 9]; faceGeo[n] = fi; faceU0[n] = u0; faceU1[n] = u1;
      // the cut-away: only a face across (or within cutPad of) the line from the camera to the Wayfarer. It used to be any face
      // nearer than the Wayfarer whose screen box overlapped theirs: close to a wall that ghosted whole runs of the walls
      // beside the camera, and the rooms behind them showed through.
      // Hysteresis: a face starts ghosting inside cutPad, stops only beyond cutPad x cutHold, and its alpha eases between
      // (version 1 switched on a single threshold every frame, so a wall at the edge flickered in and out).
      const sd = depthMid < pDepth + .05 ? segDist2(x0, y0, x1, y1, CAM.cx, CAM.cy, ox, oy) : Infinity, was = geo.ghost[fi] === 1, cut = was ? sd < cutPad2 * Wl.cutHold * Wl.cutHold : sd < cutPad2;
      geo.ghost[fi] = cut ? 1 : 0; const goal = cut ? Wl.cutAlpha : 1, ga = geo.alpha[fi], ea = ga + (goal - ga) * Math.min(1, Wl.cutFade * CAM.dt /* version 4: a repeat of the same instant changes nothing */); geo.alpha[fi] = ea;
      faceAlpha[n] = ea; faceCorner[n] = cornerBits; if (cut) closeViewStats.facesCut++;
      itemKind[n] = 0; itemRef[n] = fi; itemDepth[n] = depthMid; order[n] = n; n++; closeViewStats.faces++;
    } }
  const draws = captured || [];
  const meshTrees = useGL && plainWorld && g.area === "overworld" && closeViewOutdoorAvailable(); // standing trees are solids there (close-view-outdoor.ts), not cards
  const meshProps = useGL && (meshTrees || !(outdoor && flatWorld)) && closeViewPropsAvailable(); // and so are chests, caches, shrines, standing stones... (OUTDOOR.props)
  for (let i = 0; i < draws.length; i++) { const d = draws[i]; if (!Number.isFinite(d?.x) || typeof d.fn !== "function" || (i < FLAT.n && FLAT.mark[i]) || (meshTrees && outdoorTreeObject(d.object)) || (meshProps && !d.enemy && outdoorPropObject(d.object))) continue;
    const bxw = d.x + .5, byw = d.y + .82; if ((bxw - CAM.cx) * fx + (byw - CAM.cy) * fy > reach && d !== capturedPlayer) continue;
    const q = project(bxw, byw, surfaceZ(g.map, bxw, byw - .07) + (interiorTerrain(g.map) ? closeViewActorLift(d) : 0)); if (!q) continue; matched = null; const k = F / q.depth, sc = d === capturedPlayer ? 1 : scaleFor(g, d);
    if (q.sx + A.halfWidth * sc * k < 0 || q.sx - A.halfWidth * sc * k > w || q.sy - nativeBoardTop(d.enemy, sc, d.nativeHeight) * k > h || q.sy + A.below * k < 0) continue;
    if (n >= N) grow();
    const dl = Math.hypot(bxw - ox, byw - oy) / lightR, lit = (1 - Math.min(1, Math.max(0, (dl - Lt.inner) / (1 - Lt.inner)))) * (1 - Lt.ambient) + Lt.ambient, fog = Math.min(1, Math.max(0, (q.depth - fogNear) / (fogFar - fogNear)));
    boardX[n] = q.sx; boardY[n] = q.sy; boardK[n] = k; boardB[n] = d === capturedPlayer ? (q.depth < C.nearFade[0] ? C.nearFade[1] + (1 - C.nearFade[1]) * Math.max(0, (q.depth - .6) / (C.nearFade[0] - .6)) : 1) : closeViewActorEnvironmentAlpha(d, lit, d.enemy ? closeViewCreatureFog(q.depth, fogNear, fogFar) : fog, q.depth < pDepth - .05 && segDist2(bxw, byw, bxw, byw, CAM.cx, CAM.cy, ox, oy) < (.35 + .3 * sc) ** 2); boardScale[n] = sc; // version 3: to nothing at the fog's far edge, where it leaves the view (it was a tenth there, then gone)
    boardWX[n] = bxw; boardWY[n] = byw; boardOcc[n] = 0;
    boardFoe[n] = matched; itemKind[n] = 1; itemRef[n] = i; itemDepth[n] = q.depth - .01; order[n] = n; n++; closeViewStats.boards++; }
  occludeBillboards(n, faces, g.paused);
  insertionSortByDepth(n);
  const fallbackAction = closeViewPlayerAction(g, now), fallbackYaw = closeViewPlayerFacingYaw(g, now, FACING_YAW[p.facing] ?? CAM.yaw, { importedReady: false });
  CAM.bodyYaw = CAM.bodyDesiredYaw = fallbackYaw; CAM.bodyTransient = !!(fallbackAction.active || fallbackAction.legacy || p.dodgeUntil > now || p.castUntil > now || p.stunnedUntil > now || g.fistCharge || g.jumpUntil > now); CAM.bodyRevision++;
  const turnFacing = relativeFacing(p, closeViewIdleLockAim(g, now)), inlay = Q.inlay, bands = Q.bands, gdet = geo.detail, ginst = geo.detailInst, gjoint = geo.joint; closeViewStats.detailed = 0; spriteDpr = useGL ? Math.min(CLOSE_VIEW.atmosphere.sprite.cap, Math.max(1, Number(globalThis.devicePixelRatio) || 1)) * Math.max(.85, Q.sprite) : Math.max(.75, Math.min(2, Number(globalThis.devicePixelRatio) || 1) * Q.sprite); // version 5: the GPU scene draws cards at the screen's own resolution
  let models;
  try { models = useGL ? buildActorModels(g, draws, n, Q, now, reduce) : null; } catch (err) { if (useGL) return abortCloseViewGLFrame(); throw err; }
  const hasNativeModels = useGL && (models || MODEL_STATE.hero || MODEL_STATE.beasts.count);
  if (hasNativeModels) for (const it of MODEL_STATE.admitted) {
    const d = draws[itemRef[it]]; if (typeof d.nativeFloor !== 'function') continue;
    gc.save(); gc.setTransform(ts, 0, 0, ts, gox, goy); gc.translate(Tx, Ty);
    try { d.nativeFloor(g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now); } finally { gc.restore(); }
  }
  if (useGL && MODEL_STATE.beasts.count) { gc.save(); gc.setTransform(ts, 0, 0, ts, gox, goy); gc.translate(Tx, Ty); try { drawBeastShadows(gc, s); } finally { gc.restore(); } }
  let packed;
  try { packed = packBillboards(g, draws, n, s, turnFacing, hasNativeModels ? MODEL_STATE.admitted : null); } catch (err) { if (useGL) return abortCloseViewGLFrame(); throw err; }
  if (useGL) { if (!glScene(ctx, g, w, h, now, Q, n, draws, geo, reduce, lightR, fogNear, fogFar, Tx, Ty, gox, goy, s, ts, models, shots, flatWorld, outdoor)) return abortCloseViewGLFrame(); }
  else {
  for (let oi = 0; oi < n; oi++) { const it = order[oi];
    if (itemKind[it] === 0) { const fo = it * 8, st = faceStyle[it], lv = faceLevel[it], al = faceAlpha[it]; if (al < 1) ctx.globalAlpha = al;
      const x0 = faceXY[fo], y0 = faceXY[fo + 1], x1 = faceXY[fo + 2], y1 = faceXY[fo + 3], x2 = faceXY[fo + 4], y2 = faceXY[fo + 5], x3 = faceXY[fo + 6], y3 = faceXY[fo + 7], LUT = FACE_LUT[st][faceOrient[it]];
      if (bands > 1) { // the lower half holds the torchlight; the upper half falls into the dark
        const hx0 = (x0 + x3) / 2, hy0 = (y0 + y3) / 2, hx1 = (x1 + x2) / 2, hy1 = (y1 + y2) / 2;
        ctx.fillStyle = LUT[0][lv]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(hx1, hy1); ctx.lineTo(hx0, hy0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = LUT[1][lv]; ctx.beginPath(); ctx.moveTo(hx0, hy0); ctx.lineTo(hx1, hy1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = LUT[0][lv]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
      // the grit: this face's painted texture, if it has one and is near enough, laid over it (clipped to the face)
      const gi = faceGeo[it], gv = Q.detail && lv > 2 ? gdet[gi] : 0;
      if (gv) { const ga = closeViewGritAlpha(gv, lv, itemDepth[it], Q, now, reduce, gi * .37) * al, tex = ga > .02 ? gritTexture(gv, ginst[gi] & 15) : null;
        if (tex) { const TW = GRIT.size[0], TH = GRIT.size[1], u0 = faceU0[it], u1 = faceU1[it], sw = Math.max(1, (u1 - u0) * TW), flip = ginst[gi] & 16;
          // the face's quad, as its nearest parallelogram (its four corners' average axes): U along the face's run, V from top to foot
          const Ux = (x1 - x0 + x2 - x3) / 2, Uy = (y1 - y0 + y2 - y3) / 2, Vx = (x0 - x3 + x1 - x2) / 2, Vy = (y0 - y3 + y1 - y2) / 2, Ox = (x0 + x1 + x2 + x3) / 4 - Ux / 2 - Vx / 2, Oy = (y0 + y1 + y2 + y3) / 4 - Uy / 2 - Vy / 2;
          ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.clip(); ctx.globalAlpha = Math.min(1, ga);
          if (flip) ctx.transform(-Ux / sw, -Uy / sw, Vx / TH, Vy / TH, Ox + Ux, Oy + Uy); else ctx.transform(Ux / sw, Uy / sw, Vx / TH, Vy / TH, Ox, Oy);
          ctx.drawImage(tex, (flip ? 1 - u1 : u0) * TW, 0, sw, TH, 0, 0, sw, TH); ctx.restore(); closeViewStats.detailed++; } }
      // ambient occlusion up an inside corner (one copy of a cached gradient per corner, mapped onto the face's edge)
      if (Q.ao && geo.ao[gi]) { const bits = geo.ao[gi]; if ((bits & 1) && faceU0[it] === 0) aoCorner(ctx, x0, y0, x1, y1, x2, y2, x3, y3, false, lv); if ((bits & 2) && faceU1[it] === 1) aoCorner(ctx, x0, y0, x1, y1, x2, y2, x3, y3, true, lv); }
      // the panels' seams: a faint inlaid line round the room, and a joint every few tiles (one stroke)
      if (inlay && lv > 3 && GRIT_STYLE[st] && !faceLow[it]) { const q = INL.row; ctx.strokeStyle = INLAY_LUT[st][Math.min(L - 1, lv)]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + (x3 - x0) * q, y0 + (y3 - y0) * q); ctx.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q);
        if (gjoint[gi] && faceU0[it] === 0) { ctx.moveTo(x0 + (x3 - x0) * CLOSE_VIEW.edges.base, y0 + (y3 - y0) * CLOSE_VIEW.edges.base); ctx.lineTo(x3 + (x0 - x3) * CLOSE_VIEW.edges.cap * 2, y3 + (y0 - y3) * CLOSE_VIEW.edges.cap * 2); } ctx.stroke(); }
      if (Q.outline) { const E = CLOSE_VIEW.edges, cb = faceCorner[it], lb = Math.round(lv * E.baseDark), lc = Math.min(L - 1, Math.round(lv * E.capLight) + 3), LT = LUT[0];
        if (Q.edgeFills) { // the baseboard: the face's foot, darker, where it meets the floor
        ctx.fillStyle = LT[lb]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * E.base, y1 + (y2 - y1) * E.base); ctx.lineTo(x0 + (x3 - x0) * E.base, y0 + (y3 - y0) * E.base); ctx.closePath(); ctx.fill();
        // the cap: the wall's top edge, lighter, so where each wall ends reads against the dark above
        ctx.fillStyle = LT[lc]; ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x2, y2); ctx.lineTo(x2 + (x1 - x2) * E.cap, y2 + (y1 - y2) * E.cap); ctx.lineTo(x3 + (x0 - x3) * E.cap, y3 + (y0 - y3) * E.cap); ctx.closePath(); ctx.fill(); }
        // the outline: the foot, and each real corner (not the seams along a straight run); on low, the top edge too
        ctx.strokeStyle = E.outline; ctx.lineWidth = E.outlineWidth; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); if (!Q.edgeFills) { ctx.moveTo(x3, y3); ctx.lineTo(x2, y2); } if (cb & 2) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); } if (cb & 1) { ctx.moveTo(x0, y0); ctx.lineTo(x3, y3); } ctx.stroke(); }
      if (al < 1) ctx.globalAlpha = 1; }
    else if (packed) { if (boardPW[it] && (boardFoe[it] || draws[itemRef[it]] === capturedPlayer)) { // a creature or the Wayfarer stands on a soft shadow (objects carry their own)
        const Cs = CLOSE_VIEW.contact, k = boardK[it], rxs = Cs.radius * boardScale[it] * k, rys = Math.max(1, Math.min(rxs * Cs.flat, rxs * hc * k / F)); // the floor's foreshortening at that depth
        ctx.globalAlpha = Cs.alpha * Math.max(0, Math.min(1, boardB[it])); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(boardX[it], boardY[it] - rys * .35, rxs, rys, 0, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
        if (boardFoe[it] && foeWindingUp(boardFoe[it])) windupCue(ctx, it, rxs, rys, now, reduce); }
      drawBillboard(ctx, it); if (boardFoe[it]?.hitFlash > 0) hitFlashCue(ctx, it, boardFoe[it]); } }
  // creatures a wall hides from the camera: drawn again over the walls, faint (eased in and out, never popping)
  if (packed) for (let oi = 0; oi < n; oi++) { const it = order[oi]; if (itemKind[it] !== 1 || !boardFoe[it] || !(boardOcc[it] > .01)) continue;
    const b = boardB[it]; boardB[it] = CLOSE_VIEW.cues.ghost * boardOcc[it] * Math.min(1, b * 2); drawBillboard(ctx, it); boardB[it] = b; }
  if (Q.ao) vaultShade(ctx, w, h, ppy); }
  const t4 = tm ? performance.now() : 0;
  lockBrackets(ctx, g, now);
  riftAimRing(ctx, g); // RIFT_AIM: the armed step's reach and the tapped point
  // 6. the torch's warm cast and the vignette, both cached
  if (Q.warm && pq && !useGL) { if (!SCREEN.warm || SCREEN.warmW !== w || SCREEN.warmH !== h) { const r0 = Math.min(w, h) * .55, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r0); gr.addColorStop(0, Lt.warm); gr.addColorStop(1, "rgba(255,168,92,0)"); SCREEN.warm = gr; SCREEN.warmW = w; SCREEN.warmH = h; }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(pSx, pSy - .6 * pk); ctx.fillStyle = SCREEN.warm; const r0 = Math.min(w, h) * .55; ctx.fillRect(-r0, -r0, 2 * r0, 2 * r0); ctx.restore(); } // only the glow's own square
  if (Q.vignette && !useGL) { if (!SCREEN.vignette || SCREEN.vigW !== w || SCREEN.vigH !== h) { const gr = ctx.createRadialGradient(w / 2, h * .55, Math.min(w, h) * .3, w / 2, h * .55, Math.max(w, h) * .75); gr.addColorStop(0, fogA(0)); gr.addColorStop(1, fogA(.5)); SCREEN.vignette = gr; SCREEN.vigW = w; SCREEN.vigH = h; }
    ctx.fillStyle = SCREEN.vignette; ctx.fillRect(0, 0, w, h); }
  drawPlaceLabel(ctx, g, w, h);
  if (tm) { const t5 = performance.now(); T.ground = t1 - t0; T.torch = t2 - t1; T.floor = t3 - t2; T.scene = t4 - t3; T.overlay = t5 - t4; }
  RENDER_DIAGNOSTICS.activityValid=true;RENDER_DIAGNOSTICS.frame=closeViewStats.frames+1;RENDER_DIAGNOSTICS.backend=useGL?'webgl2':'2d';RENDER_DIAGNOSTICS.player=useGL?MODEL_STATE.playerRepresentation:capturedPlayer?'billboard':'absent';
  RENDER_DIAGNOSTICS.actors=useGL?closeViewGLStats.models:0;RENDER_DIAGNOSTICS.nativeActors=useGL?closeViewGLStats.models-(MODEL_STATE.hero?1:0):0;RENDER_DIAGNOSTICS.fallbacks=useGL?closeViewGLStats.modelFallbacks:null;
  captured = null; capturedPlayer = null; closeViewStats.frames++; CAM.drawn = true;
  return true;
}
// The floor band's four corners, [screen x, screen y, texture x, texture y] each (preallocated: no allocation per frame).
const BAND = new Float64Array(16);
// One floor triangle (three of BAND's corners): the ground texture mapped exactly at its corners (an affine map solved from
// the three pairs), clipped to the triangle grown by `FLOOR_GROW` px so neighbouring triangles overlap and no seam shows.
const FLOOR_GROW = 1.5;
function grownTo(ctx, q, mx, my) { const dx = BAND[q] - mx, dy = BAND[q + 1] - my, l = Math.hypot(dx, dy) || 1; ctx.lineTo(BAND[q] + dx / l * FLOOR_GROW, BAND[q + 1] + dy / l * FLOOR_GROW); }
function floorTriangle(ctx, img, i, j, k) {
  const a = i * 4, b = j * 4, c = k * 4, Sx0 = BAND[a], Sy0 = BAND[a + 1], Tx0 = BAND[a + 2], Ty0 = BAND[a + 3];
  const u1x = BAND[b + 2] - Tx0, u1y = BAND[b + 3] - Ty0, u2x = BAND[c + 2] - Tx0, u2y = BAND[c + 3] - Ty0, det = u1x * u2y - u2x * u1y; if (!(Math.abs(det) > 1e-9)) return;
  const s1x = BAND[b] - Sx0, s1y = BAND[b + 1] - Sy0, s2x = BAND[c] - Sx0, s2y = BAND[c + 1] - Sy0;
  const A = (s1x * u2y - s2x * u1y) / det, C = (s2x * u1x - s1x * u2x) / det, B = (s1y * u2y - s2y * u1y) / det, D = (s2y * u1x - s1y * u2x) / det, E = Sx0 - A * Tx0 - C * Ty0, Fq = Sy0 - B * Tx0 - D * Ty0;
  const mx = (Sx0 + BAND[b] + BAND[c]) / 3, my = (Sy0 + BAND[b + 1] + BAND[c + 1]) / 3;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.beginPath();
  grownTo(ctx, a, mx, my); grownTo(ctx, b, mx, my); grownTo(ctx, c, mx, my); ctx.closePath(); ctx.clip(); ctx.transform(A, B, C, D, E, Fq);
  // only the part of the texture this triangle shows (never into the billboards' atlas below the texture)
  const x0 = Math.max(0, Math.floor(Math.min(Tx0, BAND[b + 2], BAND[c + 2])) - 2), y0 = Math.max(0, Math.floor(Math.min(Ty0, BAND[b + 3], BAND[c + 3])) - 2);
  const x1 = Math.min(img.width, Math.ceil(Math.max(Tx0, BAND[b + 2], BAND[c + 2])) + 2), y1 = Math.min(GROUND.atlasY, Math.ceil(Math.max(Ty0, BAND[b + 3], BAND[c + 3])) + 2);
  if (x1 > x0 && y1 > y0) ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}
// The squared distance between segments a-b and c-d (0 when they cross). No closures: it runs per face per frame.
const orient = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
function segDist2(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = orient(cx, cy, dx, dy, ax, ay), d2 = orient(cx, cy, dx, dy, bx, by), d3 = orient(ax, ay, bx, by, cx, cy), d4 = orient(ax, ay, bx, by, dx, dy);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
  return Math.min(pointSeg2(ax, ay, cx, cy, dx, dy), pointSeg2(bx, by, cx, cy, dx, dy), pointSeg2(cx, cy, ax, ay, bx, by), pointSeg2(dx, dy, ax, ay, bx, by));
}
function pointSeg2(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy, t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0, ex = ax + vx * t - px, ey = ay + vy * t - py; return ex * ex + ey * ey; }
let spriteDpr = 1;

let matched = null; // the creature scaleFor last matched (or null): boardFoe keeps it for the art hook
// Environment visibility only: intrinsic capture/native alpha owns spectral and phase effects.
// Lighting belongs to the shader/art, so a nearby foe never becomes transparent in darkness
// or merely because it stands between the eye and the Wayfarer. Distant fog still retires it.
// A creature's share of the fog for its opacity: none until the last `creatures.edge` tiles of the view, then to 1 at its
// far end (never earlier than the fog's near edge). Its colour still takes the full fog in the shader.
export function closeViewCreatureFog(depth, fogNear, fogFar) {
  const far = Number.isFinite(fogFar) ? fogFar : CLOSE_VIEW.fog.far, from = Math.max(Number.isFinite(fogNear) ? fogNear : 0, far - CLOSE_VIEW.creatures.edge);
  if (!(depth > from)) return 0; return depth >= far ? 1 : (depth - from) / Math.max(1e-6, far - from);
}
// A creature's designed opacity in Close View (1 for every solid creature): its presentation state times the standing
// opacity of a spectral kind. Environment visibility (closeViewActorEnvironmentAlpha) multiplies this.
export function closeViewCreatureIntrinsicAlpha(foe) {
  const p = foe ? actorPresentation(foe) : null; if (!p) return 1;
  return Math.max(0, Math.min(1, (p.alpha ?? 1) * (p.spectral ? CLOSE_VIEW.creatures.spectralAlpha : 1)));
}
export function closeViewActorEnvironmentAlpha(capture, lit, fog, foreground = false) {
  const visibility = 1 - Math.max(0, Math.min(1, Number.isFinite(fog) ? fog : 0));
  if (capture?.enemy) return visibility;
  const alpha = Math.max(0, 1 - CLOSE_VIEW.actors.fade * (1 - lit)) * visibility;
  return foreground ? Math.min(alpha, CLOSE_VIEW.actors.cutAlpha) : alpha;
}
function scaleFor(g, d) { // the exact captured creature, including colocated illusions, supplies its sprite box
  matched = d.enemy || null;
  if (matched) return Math.min(CLOSE_VIEW.actors.maxSprite * 2.5, actorScale(matched));
  return d.nativeAux?.spriteScale || CLOSE_VIEW.actors.sprite;
}
// The Wayfarer's facing as the camera sees it: walking away from the camera shows their back ("up").
const FACING_VEC = Object.freeze({ up: Object.freeze([0, -1]), down: Object.freeze([0, 1]), left: Object.freeze([-1, 0]), right: Object.freeze([1, 0]) });
// A floor's boundary canvas, `edges.px` pixels a tile: a soft contact shadow on the floor along the foot of every wall, and a
// dark fill with a bright rim on holes and drops (gold), lava (orange) and chasms (pale blue), so walkable floor reads at a
// glance against wall and danger. Built once per floor's wall geometry (null without a canvas).
const HOLE = /hole|pit|abyss|void|chasm/i, LAVA = /lava|magma|cinder|ember/i;
function edgeCanvas(map, geo, hazards = true) { // hazards false: the walls' foot shadows only (the GPU scene draws its own drops and lava)
  const E = CLOSE_VIEW.edges, px = E.px, c = makeCanvas(), x = c?.getContext?.("2d"); if (!x) return null;
  c.width = Math.max(1, geo.w * px); c.height = Math.max(1, geo.h * px); x.setTransform(px, 0, 0, px, 0, 0);
  const f = geo.faces, sh = E.shadow;
  for (let i = 0; i < geo.count; i++) { const o = i * 10; if (f[o + 8] === STYLE_INDEX.door) continue; const x0 = Math.min(f[o], f[o + 2]), y0 = Math.min(f[o + 1], f[o + 3]), x1 = Math.max(f[o], f[o + 2]), y1 = Math.max(f[o + 1], f[o + 3]), nx = f[o + 4], ny = f[o + 5];
    const gx0 = nx > 0 ? x0 : nx < 0 ? x0 - sh : x0, gy0 = ny > 0 ? y0 : ny < 0 ? y0 - sh : y0, gw = nx ? sh : x1 - x0, gh = ny ? sh : y1 - y0;
    const gr = x.createLinearGradient(nx < 0 ? x0 : x0, ny < 0 ? y0 : y0, x0 + nx * sh, y0 + ny * sh); gr.addColorStop(0, `rgba(0,0,0,${E.shadowAlpha})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gr; x.fillRect(gx0, gy0, gw, gh); }
  const w = geo.w, h = geo.h, t = (tx, ty) => tx < 0 || ty < 0 || tx >= w || ty >= h ? null : map.tiles[ty * w + tx];
  const kindOf = (q) => !q ? 0 : q.chasm ? 3 : LAVA.test(String(q.kind || "")) ? 2 : HOLE.test(String(q.kind || "")) ? 1 : 0;
  if (hazards) for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) { const k = kindOf(t(tx, ty)); if (!k) continue;
    x.fillStyle = E.hole; if (k !== 2) x.fillRect(tx, ty, 1, 1);
    x.strokeStyle = k === 2 ? E.lava : k === 3 ? E.drop : E.holeRim; x.lineWidth = 2.5 / px; x.beginPath();
    for (const [dx, dy, ax, ay, bx, by] of HAZARD_EDGES) { const q = t(tx + dx, ty + dy); if (q && !isWall(q) && kindOf(q) !== k) { x.moveTo(tx + ax, ty + ay); x.lineTo(tx + bx, ty + by); } }
    x.stroke(); }
  return c;
}
const HAZARD_EDGES = Object.freeze([[0, -1, 0, 0, 1, 0], [0, 1, 0, 1, 1, 1], [-1, 0, 0, 0, 0, 1], [1, 0, 1, 0, 1, 1]].map(Object.freeze));
// The aim mark, on the floor: a chevron ahead of the Wayfarer the way a swing or a shot will go (the locked target's way, else
// the camera's when standing, else the walk's). Drawn into the ground texture, so it lies in perspective on the floor.
function aimChevron(gc, g, s, ts, W, H, gox = 0, goy = 0) {
  const M = CLOSE_VIEW.aim, p = g.player, t = g.lockedTarget?.(), a = t && !t.gloomVeil ? { x: t.x - p.x, y: t.y - p.y } : g.save?.lastAim; if (!a) return;
  const m = Math.hypot(a.x, a.y); if (!(m > 1e-6)) return; const ux = a.x / m, uy = a.y / m, Tx = Math.round(W / 2 - p.x * s), Ty = Math.round(H / 2 - p.y * s);
  const cx = Tx + (footX(p) + ux * M.ahead) * s, cy = Ty + (footY(p) + uy * M.ahead) * s, r = M.size * s;
  gc.setTransform(ts, 0, 0, ts, gox, goy); gc.fillStyle = M.color; gc.beginPath(); gc.moveTo(cx + ux * r, cy + uy * r); gc.lineTo(cx - ux * r * .6 - uy * r, cy - uy * r * .6 + ux * r); gc.lineTo(cx - ux * r * .15, cy - uy * r * .15); gc.lineTo(cx - ux * r * .6 + uy * r, cy - uy * r * .6 - ux * r); gc.closePath(); gc.fill();
}
// The locked target's brackets, round its billboard on the screen (combat-visuals draws them flat on the floor, under it).
// Second targeting pass: a new lock's ring closes in on it (CLOSE_VIEW.targetMode.markSec; with reduced motion a still ring that
// fades), the brackets stay, dimmed, while the foe is briefly out of sight, and a locked foe off screen gets a pointer at the edge.
function lockBrackets(ctx, g, now) {
  const t = g.lockedTarget?.(); if (!lockable(t) || t.gloomVeil) { CAM.markId = null; return; } const T = CLOSE_VIEW.targetMode, reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode);
  if (CAM.markId !== t.id) { CAM.markId = t.id; CAM.markAt = now; }
  const q = project(t.x + .5, t.y + .82, surfaceZ(g.map, t.x + .5, t.y + .75)), hidden = CAM.lostFor > 0;
  if (!q || q.sx < 0 || q.sx > CAM.w || q.sy < 0 || q.sy > CAM.h) { // off screen: a pointer at the edge, the way to turn
    const rel = wrap(Math.atan2(t.y + .75 - CAM.cy, t.x + .5 - CAM.cx) - CAM.yaw), ux = Math.sin(rel), uy = -Math.cos(rel), m = Math.max(Math.abs(ux) / (CAM.w / 2 - T.edge), Math.abs(uy) / (CAM.h / 2 - T.edge)) || 1;
    const ex = CAM.w / 2 + ux / m, ey = CAM.h / 2 + uy / m, a = Math.atan2(uy, ux), s = 11;
    ctx.save(); ctx.globalAlpha = hidden ? T.occludedAlpha : .9; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * s, ey + Math.sin(a) * s); ctx.lineTo(ex + Math.cos(a + 2.4) * s, ey + Math.sin(a + 2.4) * s); ctx.lineTo(ex + Math.cos(a - 2.4) * s, ey + Math.sin(a - 2.4) * s); ctx.closePath();
    ctx.fillStyle = "#ff6a5a"; ctx.fill(); ctx.strokeStyle = "#000a"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); return; }
  const k = CAM.F / q.depth, sc = actorScale(t), r = Math.min(Math.min(CAM.w, CAM.h) * .22, Math.max(.45, (Number(t.bodyRadius) || .4) + .2, sc * .4) * k), cx = q.sx, cy = q.sy - Math.min(.55 * sc * k, r * 1.1), e = r * .45; // never larger than a fifth of the screen, however near
  const mk = (now - CAM.markAt) / (T.markSec * 1000);
  if (mk >= 0 && mk < 1) { ctx.save(); ctx.globalAlpha = (1 - mk) * .9; ctx.strokeStyle = "#ff6a5a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r * (reduce ? 1.2 : 1 + (T.markScale - 1) * (1 - mk) * (1 - mk)), 0, 6.2832); ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.lineJoin = "round"; ctx.globalAlpha = hidden ? T.occludedAlpha : .8 + .2 * Math.sin(now / 200);
  ctx.beginPath(); for (let i = 0; i < 4; i++) { const sx = i === 0 || i === 3 ? -1 : 1, sy = i < 2 ? -1 : 1; ctx.moveTo(cx + sx * r, cy + sy * (r - e)); ctx.lineTo(cx + sx * r, cy + sy * r); ctx.lineTo(cx + sx * (r - e), cy + sy * r); }
  ctx.strokeStyle = "#0009"; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = "#ff6a5a"; ctx.lineWidth = 2.5; ctx.stroke(); if (hidden) { ctx.restore(); return; }
  // a pip over the foe (Elden Ring's lock dot): it is the one locked, at a glance
  const py = cy - r - Math.max(6, r * .25), pr = Math.max(4, r * .12); ctx.beginPath(); ctx.moveTo(cx, py - pr); ctx.lineTo(cx + pr, py); ctx.lineTo(cx, py + pr); ctx.lineTo(cx - pr, py); ctx.closePath();
  ctx.fillStyle = "#ff6a5a"; ctx.fill(); ctx.strokeStyle = "#000a"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}
function relativeFacing(p, aim = null) {
  const v = FACING_VEC[p.facing]; if (!v && !aim) return p.facing;
  const x = aim ? aim.x : v[0], y = aim ? aim.y : v[1];
  const fwd = x * CAM.fx + y * CAM.fy, side = x * CAM.rx + y * CAM.ry;
  return Math.abs(fwd) >= Math.abs(side) ? (fwd >= 0 ? "up" : "down") : side >= 0 ? "right" : "left";
}
// One billboard: the captured closure draws the existing sprite into the ground canvas's corner at the billboard's own scale
// (crisp, not a stretched copy), and that corner is copied to the screen. Phase 2's art (CLOSE_VIEW_HOOKS.art) would go here.
// Billboards: every actor in view is first drawn into its own place in a sprite atlas (shelf packed), each by its captured
// closure at the billboard's own resolution (crisp, not a stretched copy); then, in depth order among the walls, each place is
// copied to the screen. Drawing them all before copying any keeps the atlas from being flushed once per actor. Phase 2's
// higher-fidelity creature art (CLOSE_VIEW_HOOKS.art) would draw into the same place.
// The atlas is a band of the ground canvas below its texture (the captured closures can only draw into the canvas they were
// captured with), so the texture is copied once a frame when the atlas is first written, not once per actor.
const SPRITES = { used: 0 };
// The ordinary view writes names and titles beside its sprites (a villager's name and role, VIEWPORT, WRECK, SHIPWRIGHT).
// On a card the camera magnifies them many times and the card's edge cuts them, so a town filled the view with giant
// clipped words. While a thing's or a person's card is painted only a glyph or two is kept (a quest giver's "!" or "…"); longer
// text is not. A creature's card keeps its words (a pack's name, BLOCKED): they are part of the fight.
const CARD_TEXT = { fill: null, stroke: null, ctx: null, ownFill: false, ownStroke: false };
function cardFillText(t, x, y, m) { if (String(t).length <= 2) CARD_TEXT.fill.call(this, t, x, y, m); }
function cardStrokeText(t, x, y, m) { if (String(t).length <= 2) CARD_TEXT.stroke.call(this, t, x, y, m); }
function quietCardText(ac) { const own = Object.prototype.hasOwnProperty; CARD_TEXT.ctx = ac; CARD_TEXT.fill = ac.fillText; CARD_TEXT.stroke = ac.strokeText; CARD_TEXT.ownFill = own.call(ac, "fillText"); CARD_TEXT.ownStroke = own.call(ac, "strokeText");
  if (typeof CARD_TEXT.fill === "function") ac.fillText = cardFillText; if (typeof CARD_TEXT.stroke === "function") ac.strokeText = cardStrokeText; }
function restoreCardText() { const ac = CARD_TEXT.ctx; if (!ac) return; CARD_TEXT.ctx = null;
  if (CARD_TEXT.ownFill) ac.fillText = CARD_TEXT.fill; else delete ac.fillText; if (CARD_TEXT.ownStroke) ac.strokeText = CARD_TEXT.stroke; else delete ac.strokeText; }
function nativeBoardTop(foe, scale, height = 0) {
  const p = actorPresentation(foe);
  return Math.max(CLOSE_VIEW.actors.height * scale, height, p ? p.head + .95 * p.scale : 0);
}
function packBillboards(g, draws, n, s, facing, native = null) {
  const A = CLOSE_VIEW.actors, ac = GROUND.ctx; if (!ac) return false;
  const Y0 = GROUND.atlasY, AW = GROUND.canvas.width, AH = GROUND.canvas.height - Y0; let x = 0, y = 0, rowH = 0;
  ac.setTransform(1, 0, 0, 1, 0, 0); ac.clearRect(0, Y0, AW, AH);
  try {
  let first = true; for (let oi = n - 1; oi >= 0; oi--) { const it = order[oi]; if (itemKind[it] !== 1) continue; // nearest first: they get the room
    const d = draws[itemRef[it]], nativeBody = native?.has(it), foe = boardFoe[it];
    const residual = nativeBody && typeof d.nativeDecorations === 'function' && (d.nativeEffects || foe?.fracRank === 'rare' && foe.packName || foe?.fracWarden || foe?.warded || foe?.affixes?.length || foe?.poiseBreak > 0 || foe?.pack?.phase === 'stunned');
    if (nativeBody && !residual) { boardPW[it] = 0; continue; }
    const sc = boardScale[it], k = boardK[it], hw = A.halfWidth * sc, top = nativeBody ? nativeBoardTop(foe, sc, d.nativeHeight) : Math.max(A.height * sc,d.nativeHeight||0), bw = 2 * hw, bh = top + A.below;
    let q = k * spriteDpr / s; q = Math.min(q, (AW - 2) / (bw * s), (AH * (first && closeViewStats.gl ? CLOSE_VIEW.atmosphere.sprite.nearShare : 1 / 3)) / (bh * s)); first = false; // version 5: the nearest (the Wayfarer, mostly) may take more // a third of the atlas at most: room for every actor in view
    let pw = Math.ceil(bw * s * q), ph = Math.ceil(bh * s * q);
    if (x + pw > AW) { x = 0; y += rowH; rowH = 0; }
    if (y + ph > AH) { boardPW[it] = 0; continue; } // no room left this frame: the farthest go undrawn (never more than the atlas)
    boardSX[it] = x; boardSY[it] = Y0 + y; boardPW[it] = pw; boardPH[it] = ph;
    ac.save(); ac.beginPath(); ac.rect(x, Y0 + y, pw, ph); ac.clip();
    // Version 4 (Tim: "choppy"): the closures round their pixels to the world's pixel grid, so a creature drawn at its true
    // place jumped a whole world pixel at a time inside its card, which the close camera magnifies to two or three screen
    // pixels: every walker juddered. Now it is drawn at its place snapped to that grid (so its pixels never move inside the
    // card) and the card itself is laid at its true place on screen, smoothly.
    const p = g.player, wasFacing = p.facing, player = d === capturedPlayer, who = player ? p : boardFoe[it] || d.object, wx = who ? who.x : d.x, wy = who ? who.y : d.y, snx = Math.round(wx * s) / s, sny = Math.round(wy * s) / s;
    const sx0 = (snx + .5 - hw) * s, sy0 = (sny + .82 - top) * s; ac.setTransform(q, 0, 0, q, x - sx0 * q, Y0 + y - sy0 * q); // the closures draw in raw world pixels
    if (who) { who.x = snx; who.y = sny; } if (player) p.facing = facing;
    if (d.lift && !interiorTerrain(g.map)) ac.translate(0, -d.lift * s); if ((d.alpha ?? 1) < 1) ac.globalAlpha = d.alpha;
    const art = foe && CLOSE_VIEW_HOOKS.art[foe.kind]; // (boardFoe is written afresh for every item each frame)
    // phase 2: a creature with close-view art draws itself, from the camera's side (view: where it stands relative to the camera)
    if (!foe && !player && !residual && !d.nativeAux && d.object) quietCardText(ac); // a creature's status words (BLOCKED, a pack's name) stay; a place's or a person's name does not
    try { if (residual) d.nativeDecorations(); else if (art) { ac.setTransform(1, 0, 0, 1, x, Y0 + y); art(ac, foe, { width: pw, height: ph, scale: q * s, footX: hw * s * q, footY: top * s * q, yawToCamera: Math.atan2(CAM.cy - foe.y - .82, CAM.cx - foe.x - .5) }); } else d.fn(); if (player && !nativeBody && facing === "up") backOfHood(ac, p, s); } finally { restoreCardText(); ac.restore(); if (who) { who.x = wx; who.y = wy; } if (player) p.facing = wasFacing; }
    x += pw + 2; rowH = Math.max(rowH, ph + 2); }
  SPRITES.used = y + rowH; } finally { restoreCardText(); } return true;
}
// Version 3 (Tim: "monsters phasing in and out of view depending on where the camera is"). Version 2 sorted a billboard
// among the walls by its depth against each face's middle depth only, so a creature standing in front of a wall face that
// ran away from the camera was drawn before (under) it, then over it again as the view turned: it blinked in and out. Now,
// for every wall face its body overlaps on screen, a billboard is ordered by which side of the face it stands: in front of
// the face (the camera's side), it is drawn after it; behind it (the face stands between it and the camera), before it, and
// it is marked hidden. Its opacity, and how hidden it is, ease per creature (CLOSE_VIEW.cues.fade), so a creature walking
// round a corner fades to a ghost and back, and one coming into sight fades in. At most actors x faces in view (64 x 200).
const FOE_FADE = new WeakMap(); // creature -> { a: its eased opacity, o: how far a wall hides it, eased } (one small object a creature, kept with it)
function occludeBillboards(n, faces, paused = false) {
  const A = CLOSE_VIEW.actors, Cu = CLOSE_VIEW.cues, k = 1 - Math.exp(-Cu.fade * CAM.dt /* version 4: a repeat of the same instant changes nothing */);
  for (let j = 0; j < n; j++) { if (itemKind[j] !== 1) continue;
    const sc = boardScale[j], kk = boardK[j], hw = CLOSE_VIEW.pick.bodyWidth * .5 * sc * kk, bx0 = boardX[j] - hw, bx1 = boardX[j] + hw, by1 = boardY[j], by0 = by1 - A.height * .8 * sc * kk, wx = boardWX[j], wy = boardWY[j];
    let upper = Infinity, lower = -Infinity, occ = 0;
    for (let i = 0; i < n; i++) { if (itemKind[i] !== 0) continue; const fo = i * 8, X0 = faceXY[fo], X1 = faceXY[fo + 2], X2 = faceXY[fo + 4], X3 = faceXY[fo + 6], Y0 = faceXY[fo + 1], Y1 = faceXY[fo + 3], Y2 = faceXY[fo + 5], Y3 = faceXY[fo + 7];
      if (Math.max(X0, X1, X2, X3) < bx0 || Math.min(X0, X1, X2, X3) > bx1 || Math.max(Y0, Y1, Y2, Y3) < by0 || Math.min(Y0, Y1, Y2, Y3) > by1) continue;
      const o = faceGeo[i] * 10, side = (wx - faces[o]) * faces[o + 4] + (wy - faces[o + 1]) * faces[o + 5];
      if (side > 0) { if (itemDepth[i] < upper) upper = itemDepth[i]; } else { if (itemDepth[i] > lower) lower = itemDepth[i]; if (faceAlpha[i] > .5) occ = 1; } }
    let key = itemDepth[j]; if (key >= upper) key = upper - 2e-3; if (key <= lower) key = lower + 2e-3; itemDepth[j] = key; // a wall it is behind wins
    const foe = boardFoe[j]; boardOcc[j] = occ;
    if (foe && typeof foe === "object") { let st = FOE_FADE.get(foe);
      // A first paused render (including a restored scene) has no prior fade to freeze. Initialize
      // from current visibility, not zero forever; established fades and active-play fade-in are unchanged.
      // Solid creatures (CLOSE_VIEW.creatures): the opacity is what the view asks this frame, never eased from nothing (it
      // was, at cues.fade a second, so every creature swam into sight and lagged behind the fog). Only the wall's hiding eases.
      if (!st) { st = { o: occ }; FOE_FADE.set(foe, st); }
      st.o += (occ - st.o) * k; boardOcc[j] = st.o; } }
}
// Attack cues (CLOSE_VIEW.cues): winding up (its pattern's windup, or the plain telegraph), a creature glows and rings the floor.
const foeWindingUp = (e) => e.telegraph > 0 || e.pack?.phase === "windup" || e.gateAttack?.phase === "windup";
const CUE = { glow: null, ao: null, failed: false, ring: `rgb(${CLOSE_VIEW.cues.glowRGB})` };
function cueCanvases() {
  if (CUE.glow || CUE.failed) return; const Cu = CLOSE_VIEW.cues, M = CLOSE_VIEW.material.ao, g = makeCanvas(), gx = g?.getContext?.("2d"), a = makeCanvas(), ax = a?.getContext?.("2d"); if (!gx || !ax) { CUE.failed = true; return; }
  g.width = g.height = Cu.glowPx; const r = Cu.glowPx / 2, gr = gx.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, `rgba(${Cu.glowRGB},1)`); gr.addColorStop(.45, `rgba(${Cu.glowRGB},.45)`); gr.addColorStop(1, `rgba(${Cu.glowRGB},0)`); gx.fillStyle = gr; gx.fillRect(0, 0, Cu.glowPx, Cu.glowPx);
  a.width = M.px; a.height = 1; const ag = ax.createLinearGradient(0, 0, M.px, 0); ag.addColorStop(0, "rgba(0,0,0,1)"); ag.addColorStop(.4, "rgba(0,0,0,.45)"); ag.addColorStop(1, "rgba(0,0,0,0)"); ax.fillStyle = ag; ax.fillRect(0, 0, M.px, 1);
  CUE.glow = g; CUE.ao = a;
}
function windupCue(ctx, it, rxs, rys, now, reduce) {
  const Cu = CLOSE_VIEW.cues, A = CLOSE_VIEW.actors, b = Math.max(0, Math.min(1, boardB[it])), pulse = reduce ? .5 : .5 + .5 * Math.sin(now / Cu.pulseMs * 6.2832), sc = boardScale[it], k = boardK[it];
  ctx.save(); ctx.globalAlpha = Cu.ringAlpha * b; ctx.strokeStyle = CUE.ring; ctx.lineWidth = Cu.ringWidth; ctx.beginPath(); ctx.ellipse(boardX[it], boardY[it] - rys * .35, rxs * (1 + Cu.ring), rys * (1 + Cu.ring), 0, 0, 6.2832); ctx.stroke();
  cueCanvases(); if (CUE.glow) { const s = A.halfWidth * sc * k * 2.2; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (Cu.glow + (Cu.glowPeak - Cu.glow) * pulse) * b; ctx.drawImage(CUE.glow, boardX[it] - s / 2, boardY[it] - A.height * .45 * sc * k - s / 2, s, s); }
  ctx.restore();
}
function hitFlashCue(ctx, it, foe) { // the creature drawn again, added in light, for the length of its hit flash
  const Cu = CLOSE_VIEW.cues, b = boardB[it], a = Cu.flash * Math.min(1, foe.hitFlash / Cu.flashSec) * Math.max(0, Math.min(1, b)); if (!(a > .01)) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; boardB[it] = a; drawBillboard(ctx, it); boardB[it] = b; ctx.restore();
}
// Ambient occlusion up an inside corner: the cached gradient (dark at the corner) across `material.ao.width` of the face.
function aoCorner(ctx, x0, y0, x1, y1, x2, y2, x3, y3, end, lv) {
  cueCanvases(); if (!CUE.ao) return; const M = CLOSE_VIEW.material.ao, Wd = M.width, px = M.px;
  const Ux = (x1 - x0 + x2 - x3) / 2, Uy = (y1 - y0 + y2 - y3) / 2, Vx = (x0 - x3 + x1 - x2) / 2, Vy = (y0 - y3 + y1 - y2) / 2, Ox = (x0 + x1 + x2 + x3) / 4 - Ux / 2 - Vx / 2, Oy = (y0 + y1 + y2 + y3) / 4 - Uy / 2 - Vy / 2;
  ctx.save(); ctx.globalAlpha *= M.alpha * Math.min(1, .35 + lv / (L - 1));
  if (end) ctx.transform(-Ux * Wd / px, -Uy * Wd / px, Vx, Vy, Ox + Ux, Oy + Uy); else ctx.transform(Ux * Wd / px, Uy * Wd / px, Vx, Vy, Ox, Oy);
  ctx.drawImage(CUE.ao, 0, 0, px, 1, 0, 0, px, 1); ctx.restore();
}
// The vault: the dark overhead closing in from the screen's top (one cached gradient, rebuilt only when the aim row moves a pixel).
function vaultShade(ctx, w, h, ppy) {
  const M = CLOSE_VIEW.material, bottom = Math.max(1, Math.round(ppy * M.vaultTo));
  if (!SCREEN.vault || SCREEN.vaultH !== h || SCREEN.vaultY !== bottom) { const gr = ctx.createLinearGradient(0, 0, 0, bottom); gr.addColorStop(0, fogA(M.vault)); gr.addColorStop(1, fogA(0)); SCREEN.vault = gr; SCREEN.vaultH = h; SCREEN.vaultY = bottom; }
  ctx.fillStyle = SCREEN.vault; ctx.fillRect(0, 0, w, bottom);
}
function drawBillboard(ctx, it) {
  const pw = boardPW[it]; if (!pw) return; const A = CLOSE_VIEW.actors, sc = boardScale[it], k = boardK[it], hw = A.halfWidth * sc, top = A.height * sc, b = boardB[it];
  if (b < 1) ctx.globalAlpha = Math.max(0, b);
  ctx.drawImage(GROUND.canvas, boardSX[it], boardSY[it], pw, boardPH[it], boardX[it] - hw * k, boardY[it] - top * k, 2 * hw * k, (top + A.below) * k);
  if (b < 1) ctx.globalAlpha = 1;
}
// The Wayfarer's sprite has no back: seen from behind (walking away from the camera) its visor is hooded over. Phase 2's
// back-view art replaces this.
function backOfHood(c, p, s) { const B = CLOSE_VIEW.actors.back, k = (p.x + .5) * s, base = (p.y + .82) * s - (Math.floor(p.walkPhase || 0) % 2);
  c.fillStyle = B.hood; c.fillRect(Math.round(k + B.rect[0] * s), Math.round(base + B.rect[1] * s), Math.round(B.rect[2] * s), Math.round(B.rect[3] * s));
  c.fillStyle = B.seam; c.fillRect(Math.round(k - .015 * s), Math.round(base + B.rect[1] * s), Math.max(1, Math.round(.03 * s)), Math.round(.5 * s)); }
function drawPlaceLabel(ctx, g, w, h) { // as the ordinary view writes it: just beneath Map and Pack
  const label = String(g.map?.name || "").toUpperCase(); if (!label) return;
  ctx.font = "12px monospace"; const y = h - (g.labelInset ?? 122), x = g.labelX ?? 8, bw = Math.min(Math.max(150, ctx.measureText(label).width + 20), g.labelMaxWidth ?? Infinity);
  ctx.fillStyle = "#151411ee"; ctx.fillRect(x, y, bw, 24); ctx.fillStyle = "#cec7b6"; ctx.fillText(label, x + 8, y + 16, bw - 16);
}

// ------------------------------------------------------------------------------------------------ floor features drawn flat (version 4)
// A captured draw that is a floor feature (CLOSE_VIEW.flat: a mark in the ground, a dais, a ladder down through a hatch) is
// drawn into the ground texture, flat on the floor in perspective, instead of standing up as a card. FLAT.mark[i] is set for
// those draws (by index), so the billboard pass leaves them out. Preallocated; grown by doubling.
const FLAT = { mark: new Uint8Array(256), n: 0 }, FLAT_KINDS = new Set(CLOSE_VIEW.flat.kinds), FLAT_STAIRS = new Set(CLOSE_VIEW.flat.stairDirs);
const flatObject = (o) => !!o && (FLAT_KINDS.has(o.kind) || (o.kind === "buildingStair" && FLAT_STAIRS.has(o.dir)));
function flatPass(g, draws, gc, s, ts, gox, goy, Tx, Ty) {
  FLAT.n = 0; if (!draws || !draws.length) return; if (FLAT.mark.length < draws.length) { let m = FLAT.mark.length; while (m < draws.length) m *= 2; FLAT.mark = new Uint8Array(m); }
  const objs = g.map?.objects || []; FLAT.n = draws.length; let drawn = 0;
  for (let i = 0; i < draws.length; i++) { FLAT.mark[i] = 0; const d = draws[i]; if (d === capturedPlayer || !Number.isFinite(d?.x) || typeof d.fn !== "function") continue;
    let hit = null; for (let j = 0; j < objs.length; j++) { const o = objs[j]; if (o.x === d.x && o.y === d.y) { hit = o; break; } }
    if (d.enemy || d.nativeAux || !flatObject(hit)) continue;
    FLAT.mark[i] = 1; gc.save(); gc.setTransform(ts, 0, 0, ts, gox, goy); gc.translate(Tx, Ty); if ((d.alpha ?? 1) < 1) gc.globalAlpha = d.alpha; try { d.fn(); } finally { gc.restore(); } drawn++; }
  closeViewStats.flat = drawn;
}
export const closeViewFlatObject = flatObject; // for tests
// 2026-11-11: where a feature of the Deep stands as itself (CLOSE_VIEW_DEEP features: a giant cap, a crystal spire), the
// ground texture under it shows a neighbouring floor tile instead of the tile's own top-down art (a mushroom painted flat
// under the standing one). Within the view's reach only; one canvas copy a feature tile, nothing allocated.
const FEATURE_FLOOR_STEPS = [[0, 1], [0, -1], [-1, 0], [1, 0]];
function featureFloor(g, gc, s, ts, gox, goy, Tx, Ty, R) {
  const map = g.map, FT = themeOf(map).features, w = Math.max(1, Number(map.width) || 32), h = Math.floor(map.tiles.length / w), px = Math.floor(g.player.x), py = Math.floor(g.player.y), k = s * ts;
  gc.save(); gc.setTransform(1, 0, 0, 1, 0, 0); gc.imageSmoothingEnabled = false;
  const r = Math.ceil(R) + 1;
  for (let y = Math.max(0, py - r); y <= Math.min(h - 1, py + r); y++) for (let x = Math.max(0, px - r); x <= Math.min(w - 1, px + r); x++) {
    const f = FT[map.tiles[y * w + x]?.kind]; if (!f || f.form === "pool") continue;
    for (const [dx, dy] of FEATURE_FLOOR_STEPS) { const nx = x + dx, ny = y + dy, t = nx >= 0 && ny >= 0 && nx < w && ny < h ? map.tiles[ny * w + nx] : null; if (!t || t.blocked || closeViewHazardCode(t)) continue;
      gc.drawImage(GROUND.canvas, Math.round((Tx + nx * s) * ts + gox), Math.round((Ty + ny * s) * ts + goy), Math.round(k), Math.round(k), Math.round((Tx + x * s) * ts + gox), Math.round((Ty + y * s) * ts + goy), Math.round(k), Math.round(k)); break; } }
  gc.restore();
}

// Pure admission/geometry seam used by the GPU frame and focused regression tests. Echo ribbons are raised through
// the air; unlike the 2D fallback they never enter the floor overlay. The callback receives one depth-tested kind-11
// triangle vertex at a time: X, Y, absolute Z, local X/Y, alpha, packed RGB and trail flag.
export function closeViewEchoRibbons(g, map, quality = "balanced", reduce = false, emit = null) {
  if (typeof emit !== "function") return { paths: 0, vertices: 0 };
  const K = CLOSE_VIEW.echoRibbon, cap = K.cap[quality] || K.cap.balanced, list = (g?.glyphVisuals || []).filter(v => v?.kind === "primaryEcho" && Number(v.life) > 0 && Number(v.max) > 0).slice(-cap);
  let paths = 0, vertices = 0;
  const valid = q => q && [q.x,q.y,q.dx,q.dy,q.range].every(Number.isFinite) && q.range > 0 && Math.hypot(q.dx,q.dy) > 1e-4 && (q.shape === "thrust" || q.shape === "arc" || q.shape === "cone");
  const different = (m,q) => valid(m) && (Math.hypot(m.x-q.x,m.y-q.y)>.08 || Math.hypot(m.dx-q.dx,m.dy-q.dy)>.08 || m.shape!==q.shape || Math.abs(m.range-q.range)>.08 || (m.weaponKind==='verge-cleaver'&&(primaryVisualStage(m)?.kind==='cleaver-four'||m.primaryStep!==3)));
  const path = (q, memory, fade) => {
    if (!valid(q)) return;
    const d=Math.hypot(q.dx,q.dy),dx=q.dx/d,dy=q.dy/d,n=K.segments,shape=q.shape==='thrust'?'thrust':'sweep',half=(Number(q.arc)||100)*Math.PI/360;
    const stage=memory?primaryVisualStage(q):null,step=stage?.step||(memory&&q.primaryMotion==null?Math.max(1,Math.min(3,Number(q.primaryStep)||1)):0),offset=stage?.kind==='cleaver-four'?(stage.direction>0?-.28:.28):step===1?-.28:step===2?.28:0,angle=Math.atan2(dy,dx),start=angle-half+offset,end=angle+half+offset;
    const ground=Number.isFinite(q.support)?q.support*(RELIEF.map===map?OUTDOOR.terrain.level:LIFT_PER_LEVEL):surfaceZ(map,q.x,q.y), width=(shape==='thrust'?K.width.thrust:K.width.sweep)*(memory ? .7 : 1), spec=memory?K.memory:K.actual;
    const point = i => { const t=i/n,b=shape==='thrust'?angle:start+(end-start)*t,r=shape==='thrust'?.18+(q.range-.18)*t:q.range,x=q.x+Math.cos(b)*r,y=q.y+Math.sin(b)*r,z=ground+K.height[0]+(K.height[1]-K.height[0])*Math.sin(Math.PI*t),tx=shape==='thrust'?dx:-Math.sin(b),ty=shape==='thrust'?dy:Math.cos(b),w=width*(shape==='thrust'?(1-t*.82):(.72+.28*Math.sin(Math.PI*t))); return {x,y,z,nx:-ty*w,ny:tx*w}; };
    let a=point(0); for(let i=1;i<=n;i++){const b=point(i),alpha=Math.max(0,Math.min(1,fade))*spec.alpha; emit(a.x+a.nx,a.y+a.ny,a.z,-1,-1,alpha,spec.color,1);emit(b.x+b.nx,b.y+b.ny,b.z,1,-1,alpha,spec.color,1);emit(b.x-b.nx,b.y-b.ny,b.z,1,1,alpha,spec.color,1);emit(a.x+a.nx,a.y+a.ny,a.z,-1,-1,alpha,spec.color,1);emit(b.x-b.nx,b.y-b.ny,b.z,1,1,alpha,spec.color,1);emit(a.x-a.nx,a.y-a.ny,a.z,-1,1,alpha,spec.color,1);vertices+=6;a=b;} paths++;
  };
  for(const v of list){if(!valid(v.actual))continue;const fade=Math.max(0,Number(v.life)/Number(v.max));path(v.actual,false,fade);if(!reduce&&different(v.memory,v.actual))path(v.memory,true,fade);}
  return { paths, vertices };
}

// ------------------------------------------------------------------------------------------------ the GPU scene (versions 4 and 5)
// Version 5: the walls, their trim, the arches and the props of a floor are built once into a static buffer (buildStatic),
// with the floor's placed lights and card props; each frame picks the nearest lights, fills the cards, creatures and decals,
// sets the theme's numbers and draws; then copies the GPU canvas onto the screen in one drawImage.
const STYLE_RGB = STYLE_NAMES.map((k) => (k === "door" ? rgb : material)(CLOSE_VIEW.styles[k][0]).map((v) => v / 255));
const rgb01 = (a) => new Float32Array(a.map((v) => v / 255));
// a wall's material by its style (-1: the theme's own); and each material's colour where it is not the theme's own
const MAT_OF_STYLE = STYLE_NAMES.map((k) => ({ hiveWall: 2, aptWall: 3, cellarWall: 1, hedgeWall: 4, door: 5 })[k] ?? -1);
const MAT_RGB = [[92, 90, 86], [70, 52, 36], [60, 44, 42], [70, 76, 74], [30, 56, 28]].map((c) => c.map((v) => v / 255));
const THEME_GL = new Map(); // theme id -> its colours as 0..1 arrays (made once a theme)
function themeGL(th) {
  let t = THEME_GL.get(th); if (t) return t; const W = th.wall, Fl = th.floor, L = th.light;
  t = { wall: rgb01(W.rgb), mortar: rgb01(W.mortar), damp: rgb01(W.dampRGB), floor: rgb01(Fl.rgb), joint: rgb01(Fl.joint), rug: rgb01(Fl.rug), ceil: rgb01(th.ceiling.rgb), deco1: rgb01(th.deco1), deco2: rgb01(th.deco2), glow: rgb01(th.glow || [255, 150, 80]),
    torch: rgb01(L.torch), amb: rgb01(L.ambient), fog: rgb01(th.fog.rgb), haze: rgb01(th.fog.hazeRGB),
    caveA: Float32Array.from((th.cave || []).slice(0, 4).concat([0, 0, 0, 0]).slice(0, 4)), caveB: Float32Array.from([th.cave?.[4] || 0, th.cave?.[5] || 1.5, 0, 0]) }; // 2026-11-11: the Deep's living rock
  THEME_GL.set(th, t); return t;
}
const HUE_RGB = [[1, .62, .32], [.3, .95, .8], [.55, .72, 1], [1, .78, .42]]; // a placed light's colour by hue: warm, bioluminescent, ghost-light, a failing lamp (hue 5, 2026-11-11: the theme's own glow)
const SIGIL_COLORS = [[.22, .19, .3], [.65, .53, .82], [.92, .78, .99]];
const SIGIL_INLAY = Float32Array.from(SIGIL_COLORS.flat());
const NO_BACKDROP = { kind: 0, colors: new Float32Array(9) };
const UNI = (() => { const Pt = CLOSE_VIEW.pits, Lv = CLOSE_VIEW.lava, Cu = CLOSE_VIEW.cues, R = HOLE_DROPS.rim;
  const stone = rgb01(Pt.stone), lip = rgb01(Pt.lipRGB), chasm = rgb01(Pt.chasmRGB), safe = rgb01(R.rgb.split(",").map(Number)), lavaA = rgb01(Lv.crust), lavaB = rgb01(Lv.hot), lavaC = rgb01(Lv.vein);
  const gritA = new Float32Array(9), ring = rgb01(Cu.glowRGB.split(",").map(Number)); for (let i = 0; i < 9; i++) gritA[i] = GRIT.variants[i]?.alpha ?? 0;
  const un = GRIT.variants.find((v) => v.id === "unresolved") || { shimmer: 0, period: 1 };
  return { q: null, reduce: false, now: 0, safeOn: false, th: null, tg: null, hall: null, backdrop: NO_BACKDROP, inlay: SIGIL_INLAY,
    env(gl, U, F, lavaTiles) { const q = UNI.q, th = UNI.th, tg = UNI.tg, C = th.ceiling, Fl = th.floor;
      gl.uniform4f(U.u_ceil, F.ceilH, q.ceiling && !UNI.openArena ? 1 : 0, UNI.hall ? HALL_VIEW.ceilingBay : C.bay, q.ceilingDetail ? 1 : 0); gl.uniform3fv(U.u_ceilRGB, tg.ceil); gl.uniform4f(U.u_ceilK, C.kind, C.rib, C.dark, 0);
      gl.uniform4f(U.u_space, UNI.space ? 1 : 0, 1, q.relief ? 1 : 0, 0); // seed realms: the cosmos through the ship's glass
      gl.uniform4f(U.u_hall, UNI.backdrop.kind, UNI.hall?.open ? 1 : 0, UNI.openArena ? 2 : UNI.hall?.sky ? 1 : 0, HALL_VIEW.shaftDepth);
      gl.uniform3fv(U.u_backdrop, UNI.backdrop.colors);
      gl.uniform3fv(U.u_inlayColors, UNI.inlay);
      gl.uniform4f(U.u_pit, Pt.hole, Pt.chasm, Pt.dark, Pt.lip); gl.uniform3fv(U.u_stone, stone); gl.uniform3fv(U.u_lip, lip); gl.uniform3fv(U.u_safe, safe); gl.uniform3fv(U.u_chasm, chasm);
      const breath = UNI.reduce ? 1 : 1 - R.pulseDepth * (.5 + .5 * Math.sin(UNI.now / R.pulse * Math.PI * 2)); gl.uniform4f(U.u_safeP, R.near, R.full, R.alpha * breath, UNI.safeOn ? 1 : 0);
      gl.uniform4f(U.u_lava, Lv.scale, Lv.flow, Lv.light, q.lavaLight && lavaTiles > 0 ? 3 / Lv.reach : 0); gl.uniform3fv(U.u_lavaA, lavaA); gl.uniform3fv(U.u_lavaB, lavaB); gl.uniform3fv(U.u_lavaC, lavaC);
      gl.uniform4fv(U.u_cave, tg.caveA); gl.uniform4fv(U.u_caveB, tg.caveB); gl.uniform3fv(U.u_caveGlow, tg.glow); gl.uniform3fv(U.u_caveFleck, tg.deco2); // 2026-11-11
      gl.uniform4f(U.u_floorP, Fl.kind, Fl.size, Fl.wear, Fl.sewer ? 1 : 0); gl.uniform3fv(U.u_floorRGB, tg.floor); gl.uniform3fv(U.u_floorJ, tg.joint); gl.uniform3fv(U.u_rug, tg.rug); gl.uniform4f(U.u_floorQ, q.bump ? 1 : 0, Fl.wet, q.relief ? 1 : 0, UNI.worldCapture ? 1 : 0); },
    wall(gl, U, F) { const q = UNI.q, th = UNI.th, tg = UNI.tg, Wl = th.wall, A = th.arch;
      gl.uniform4f(U.u_detail, q.detail ? 1 : 0, q.detailNear, q.detailFar, GRIT.light); gl.uniform1fv(U.u_gritA, gritA); gl.uniform4f(U.u_shimmer, un.shimmer || 0, un.period || 1, UNI.reduce ? 1 : 0, GRIT.size[0] / (GRIT.size[0] * GRIT.instances * 9));
      gl.uniform4f(U.u_stoneP, Wl.stone[0], Wl.stone[1], q.relief ? Wl.stone[2] : Wl.stone[2] * .5, Wl.stone[3]); gl.uniform4f(U.u_wallP, Wl.damp[0], Wl.damp[1], q.bump ? 1 : 0, Wl.topFall);
      gl.uniform3fv(U.u_mortar, tg.mortar); gl.uniform3fv(U.u_damp, tg.damp); gl.uniform3fv(U.u_deco1, tg.deco1); gl.uniform3fv(U.u_deco2, tg.deco2); gl.uniform4f(U.u_arch, A.spring, A.radius, A.band, 0); gl.uniform3fv(U.u_glowRGB, tg.glow);
      gl.uniform4fv(U.u_cave, tg.caveA); gl.uniform4fv(U.u_caveB, tg.caveB); gl.uniform3fv(U.u_caveGlow, tg.glow); gl.uniform3fv(U.u_caveFleck, tg.deco2); }, // 2026-11-11
    arch(gl, U) { const A = UNI.th.arch; gl.uniform4f(U.u_arch, A.spring, A.radius, A.band, 0); },
    decal(gl, U) { gl.uniform3fv(U.u_ring, ring); gl.uniform3fv(U.u_glow, ring); if (UNI.tg) gl.uniform3fv(U.u_hue5, UNI.tg.glow); } }; })();
function gritAtlas() { // every variant's painted instances side by side, once
  const [TW, TH] = GRIT.size, c = makeCanvas(), x = c?.getContext?.("2d"); if (!x) return null; c.width = TW * GRIT.instances * 9; c.height = TH; x.clearRect(0, 0, c.width, c.height);
  for (let v = 1; v < Math.min(9, GRIT.variants.length); v++) for (let k = 0; k < GRIT.instances; k++) { const t = gritTexture(v, k); if (t) x.drawImage(t, (v * GRIT.instances + k) * TW, 0); }
  return c;
}
function glSeen(map) { // what the fog of war has shown (null: everything)
  const disc = !!map?.dungeonContract?.discoveryEnabled, lab = !!map?.building && labFogState(map, -1e6, -1e6) !== 2; if (!disc && !lab) return null;
  const fn = (x, y) => (!disc || dungeonTileVisibility(map, x, y) !== "unseen") && (!lab || labFogState(map, x - .5, y - .5) > 0);
  fn.wall = (x, y) => !disc || dungeonTileVisibility(map, x, y) !== "unseen"; // walls hide only where the discovery fog hides them (as the 2D view)
  return fn;
}
const SEEN = { map: null, fn: null };

// The floor's built things (version 5), made once a floor and theme (never per frame) from its wall geometry: a pure function of
// the floor (its tiles, objects, building and name), so they are the same between frames, visits and after a resume.
// data: the static wall buffer (close-view-gl.ts WALL_FLOATS a vertex); lights: LIGHT_FLOATS a light (x, y, z, reach, strength,
// hue, phase, kind: 0 on a wall, 1 candles); flames: FLAME_FLOATS a flame (x, y, z, size, hue, phase); cards: CARD_FLOATS a card
// prop (kind: 4 cobweb, 5 chain, 8 bones; x, y; then for a web the run's and the room's directions, for a chain its length, for
// bones a seed). Counts: closeViewStatic.
export const LIGHT_FLOATS = 8, FLAME_FLOATS = 6, CARD_FLOATS = 8;
const STATIC = new WeakMap();
const HALL_VIEW = Object.freeze({ minHeight: 6, maxHeight: 14, tierHeight: .65, shaftDepth: 24, ceilingBay: 4 });
const BACKDROPS = new Map(PENTAGON_BACKDROPS.map(({ id, palette }, i) => [
  id, { kind: i + 1, colors: Float32Array.from(palette.flatMap((hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255))) },
]));
// The preset's outdoor crane height, no higher than lets the Wayfarer's feet and the horizon (with `horizonRoom` degrees of sky)
// share the screen's height: in portrait the full outdoorHeight; in a short landscape view about the old height (the horizon
// matters more there than the extra height).
function outdoorCrane(Cp, w, h) {
  const C = CLOSE_VIEW.camera, F = Math.max((w / 2) / Math.tan(Cp.fov * DEG / 2), (h / 2) / Math.tan(CLOSE_VIEW.fov.verticalMax * DEG / 2));
  const span = 2 * Math.atan(h * (.5 - C.framing.margin) / F) - C.outdoor.horizonRoom * DEG;
  return Math.max(C.outdoor.minHeight, Math.min(Cp.outdoorHeight, (CAM.outdoorBoom && Number.isFinite(Cp.outdoorDistance) ? Cp.outdoorDistance : Cp.distance) * Math.tan(Math.max(.05, Math.min(1.4, span)))));
}
function hallHeight(map) {
  if (interiorTerrain(map)) return interiorCeilingHeight(map);
  const height = map.hall?.ceilingHeight;
  return map.hall?.tall && Number.isFinite(height)
    ? Math.max(HALL_VIEW.minHeight, Math.min(HALL_VIEW.maxHeight, height))
    : CLOSE_VIEW.walls.height;
}
export const closeViewStaticStats = { builds: 0 };
const STATIC_OUT = { a: new Float32Array(1 << 16), n: 0 }; // buildStatic's scratch vertex buffer, grown by doubling and kept between floors
function buildStatic(map, geo, th) {
  closeViewStaticStats.builds++;
  const out = STATIC_OUT, lights = [], flames = [], cards = [], w = geo.w, h = geo.h, tiles = map.tiles, Fc = geo.faces, H = hallHeight(map), RB = CLOSE_VIEW.walls.rubble, tg = themeGL(th), src = th.light.sources;
  const solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || isWall(tiles[y * w + x]);
  const busy = new Uint8Array(w * h); for (const o of map.objects || []) { const ox = Math.floor(Number(o.x) + .5), oy = Math.floor(Number(o.y) + .5); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = ox + i, y = oy + j; if (x >= 0 && y >= 0 && x < w && y < h && (i === 0 && j === 0 || o.kind === "buildingStair" || o.kind === "exit" || o.kind === "dungeon")) busy[y * w + x] = 1; } }
  const free = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !solid(x, y) && !busy[y * w + x] && !closeViewHazardCode(tiles[y * w + x]) && !tiles[y * w + x].doorway;
  const salt = strHash(`${map.building?.base || map.name || ""}:${map.building?.floor ?? ""}:${map.building?.node ?? ""}:${w}x${h}`);
  const rnd = (a, b, c, k) => hash32(salt ^ hash32((a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ (k * 2654435761))) / 4294967296;
  out.n = 0; const V = (X, Y, Z, along, u, z, top, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty, lift = true) => { let a = out.a, o = out.n; if (o + 20 > a.length) { const b = new Float32Array(a.length * 2); b.set(a); out.a = a = b; } a[o] = X; a[o + 1] = Y; a[o + 2] = Z + (lift ? interiorGeometryHeight(map, tx, ty, X, Y) : 0); a[o + 3] = along; a[o + 4] = u; a[o + 5] = z; a[o + 6] = top; a[o + 7] = nx; a[o + 8] = ny; a[o + 9] = part; a[o + 10] = mat; a[o + 11] = c[0]; a[o + 12] = c[1]; a[o + 13] = c[2]; a[o + 14] = deco; a[o + 15] = grit; a[o + 16] = bits; a[o + 17] = hsh; a[o + 18] = tx; a[o + 19] = ty; out.n = o + 20; }; // feel pass 1 (pre-warm): written straight into one reused Float32Array (the same float32 rounding Float32Array.from gave the array of pushes it replaces), not pushed into a growing array
  // a vertical quad from a to b, z0 to z1 (along a0 to a1 on the run; u 0 to 1 across)
  const quad = (ax, ay, bx, by, z0, z1, a0, a1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty) => {
    V(ax, ay, z0, a0, 0, z0, z1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty); V(bx, by, z0, a1, 1, z0, z1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty); V(bx, by, z1, a1, 1, z1, z1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty);
    V(ax, ay, z0, a0, 0, z0, z1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty); V(bx, by, z1, a1, 1, z1, z1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty); V(ax, ay, z1, a0, 0, z1, z1, nx, ny, part, mat, c, deco, grit, bits, hsh, tx, ty); };
  // a horizontal quad (corners in order) at height z
  const flat = (x0, y0, x1, y1, x2, y2, x3, y3, z, part, mat, c, hsh, tx, ty) => { const P = [[x0, y0, 0], [x1, y1, 1], [x2, y2, 1], [x0, y0, 0], [x2, y2, 1], [x3, y3, 0]]; for (const [X, Y, u] of P) V(X, Y, z, X + Y, u, z, z, 0, 0, part, mat, c, 0, 0, 0, hsh, tx, ty); };
  // a box (no bottom), axis-aligned, centred on (cx, cy)
  const box = (cx, cy, hx, hy, z0, z1, part, mat, c, hsh, tx, ty) => { const x0 = cx - hx, x1 = cx + hx, y0 = cy - hy, y1 = cy + hy;
    quad(x0, y0, x1, y0, z0, z1, x0, x1, 0, -1, part, mat, c, 0, 0, 0, hsh, tx, ty); quad(x1, y1, x0, y1, z0, z1, x1, x0, 0, 1, part, mat, c, 0, 0, 0, hsh, tx, ty);
    quad(x0, y1, x0, y0, z0, z1, y1, y0, -1, 0, part, mat, c, 0, 0, 0, hsh, tx, ty); quad(x1, y0, x1, y1, z0, z1, y0, y1, 1, 0, part, mat, c, 0, 0, 0, hsh, tx, ty); flat(x0, y0, x1, y0, x1, y1, x0, y1, z1, part, mat, c, hsh, tx, ty); };
  // The generated marks are the only source of Close View art placement.
  const inward = { north: [0, 1], east: [-1, 0], south: [0, -1], west: [1, 0] };
  const paint = (x, y, z, nx, ny, width, height) => {
    const horizontal = nx === 0 && ny === 0, part = horizontal && z > 1 ? 7.25 : 7;
    const point = (u, v, depth) => horizontal
      ? [x + u * width, y + v * height, z + depth]
      : [x + ny * u * width + nx * depth, y - nx * u * width + ny * depth, z - v * height];
    const stamp = (points, color, depth) => {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [X, Y, Z] = point(...points[i], depth);
        V(X, Y, Z, X + Y, 0, Z, Z, nx, ny, part, 0, color, 0, 0, 0, 0, Math.floor(X), Math.floor(Y));
      }
    };
    const rect = (u, v, a, b, color, depth = 0) => stamp([[u - a, v - b], [u + a, v - b], [u + a, v + b], [u - a, v + b]], color, depth);
    const path = (points, color, weight = .018) => {
      for (let i = 1; i < points.length; i++) {
        const [a, b] = points[i - 1], [c, d] = points[i], length = Math.hypot(c - a, d - b);
        if (!length) continue;
        const p = (b - d) * weight / length, q = (c - a) * weight / length;
        stamp([[a + p, b + q], [c + p, d + q], [c - p, d - q], [a - p, b - q]], color, horizontal ? -.013 : .013);
      }
    };
    return { rect, path };
  };
  const ceilingArt = [];
  const sigilColors = SIGIL_COLORS;
  let inlay = SIGIL_INLAY;
  const glyph = (surface, colors = sigilColors, depth = .012) => {
    for (const { dx, dy, part } of SIGIL_CELLS) {
      const color = colors[part === "pupil" ? 2 : part === "orbit" || part === "ring" ? 0 : 1];
      surface.rect(dx / 12, (dy - 1) / 16, .043, .033, color, depth);
    }
  };
  // One small floor inlay identifies the recurring junction room. It uses the existing
  // cached static pass (at most 24 vertices), follows the floor and never blocks a body.
  const landmark=map.building?.routing?.nodes?.find(n=>n.role==="landmark");
  if(landmark && free(landmark.x,landmark.y)) {
    const face=paint(landmark.x+.5,landmark.y+.5,.025,0,0,.8,.8), color=tg.wall.map(v=>Math.min(.7,v+.14));
    const grammar=map.building.routing.grammar;
    face.path(grammar==="offset-ring"?[[-.4,0],[0,-.4],[.4,0],[0,.4],[-.4,0]]:grammar==="paired-wings"?[[-.4,-.3],[0,0],[.4,-.3],[0,0],[0,.4]]:[[-.4,-.3],[0,-.3],[0,.4],[.4,.4]],color,.045);
  }
  for (const m of map.murals || []) {
    const art = PENTAGON_MURALS.find(({ id }) => id === m.muralId);
    if (!art) continue;
    const [ground, middle, bright] = art.palette.map((color) => rgb(color).map((v) => v / 255));
    const x = m.x + .5, y = m.y + .5;
    if (m.place === "floor") {
      inlay = Float32Array.from([...ground, ...middle, ...bright]);
      continue;
    }
    const ceiling = m.place === "ceiling", normal = inward[m.side];
    if (ceiling ? !map.hall || map.hall.open : !normal) continue;
    const [nx, ny] = normal || [0, 0], wallSpan = nx ? Math.min(y - 1, h - 1 - y) : Math.min(x - 1, w - 1 - x);
    const width = ceiling ? m.scale * .94 : Math.min(m.scale * .94, wallSpan * 2), height = ceiling ? width * .7 : 1.36;
    if (ceiling) ceilingArt.push([x - width / 2, y - height / 2, x + width / 2, y + height / 2]);
    const face = paint(x + nx * .52, y + ny * .52, ceiling ? H - .027 : 1.47, nx, ny, width, height);
    const depth = ceiling ? -.014 : .014;
    face.rect(0, 0, .5, .5, middle);
    face.rect(0, 0, .482, .47, ground, depth * .5);
    if (art.motif === "rule-figure") {
      const cols = 27, rows = ceiling ? 19 : 13, cells = muralPattern(art, cols, rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (cells[j][i]) {
        face.rect((i - (cols >> 1)) / 30, (j - (rows >> 1)) / (rows + 4), .015, .43 / (rows + 4), bright, depth);
      }
    } else if (art.motif === "constellation") {
      for (let i = 0; i < 88; i++) {
        const ring = art.id === "eightyEight", angle = i * (ring ? Math.PI / 44 : 2.39996323), reach = ring ? .39 + .02 * rnd(m.x, m.y, i, 82) : .42 * Math.sqrt((i + 1) / 88);
        const u = Math.cos(angle) * reach, v = Math.sin(angle) * reach;
        if (!ring && Math.abs(u + v * .45) < .08 && v > -.23) continue;
        const size = .005 + .007 * rnd(m.x, m.y, i, 83);
        face.rect(u, v, size, size, i % 3 ? bright : middle, depth);
      }
    } else if (art.id === "unclosingEye") {
      glyph(face, [middle, bright, bright], depth);
    } else if (art.motif === "mosaic") {
      // Opposed grains converge on a warmer seam through the stone.
      for (let i = -4; i <= 4; i++) {
        const v = i * .088;
        face.path([[-.43, v], [-.28, v + .036], [-.12, v - .035], [0, v]], middle);
        face.path([[.43, v], [.30, v - .03], [.12, v + .05], [0, v]], bright, .009);
      }
      face.path([[-.02, -.42], [.025, -.2], [-.013, .05], [.02, .19], [0, .42]], bright, .025);
    } else if (art.id === "measureThatGrew") {
      for (let i = 0; i < 9; i++) {
        const u = -.42 + i * .1, a = .023 + i * .003, b = .046 + i * .025;
        face.path([[u - a, .1], [u, .1 - b], [u + a, .1], [u, .1 + b], [u - a, .1]], bright, .009);
      }
    } else {
      // Friezes and reliefs share a register, but each scene has its own silhouettes.
      face.path([[-.43, .32], [.43, .32]], middle);
      const figures = {
        longMigration: [
          [[-.42,.27],[-.37,.02],[-.29,-.09],[-.22,.08],[-.17,.09],[-.21,.26],[-.42,.27]],
          [[-.17,.23],[-.11,.15],[-.04,.24],[.02,.16],[.08,.24]],
          [[.09,.29],[.15,.05],[.23,.02],[.25,-.13],[.20,-.27],[.25,-.22],[.27,-.32],[.29,-.15],[.23,.02],[.24,.29]],
          [[.35,.14],[.31,-.13],[.40,-.06],[.45,-.15],[.42,.13],[.40,-.06]],
        ],
        unbowedProcession: [
          [[-.44,.25],[-.38,.05],[-.31,.01],[-.26,.11],[-.30,.27]],
          [[-.21,.27],[-.16,-.17],[-.09,-.23],[-.03,-.07],[-.10,-.02],[-.07,.22]],
          [[.01,.29],[.08,-.06],[.16,-.15],[.21,-.06],[.15,.27]],
          [[.22,.15],[.29,-.21],[.36,.06],[.29,.24],[.22,.15]],
          [[.37,.32],[.37,-.33],[.44,-.33],[.44,.32]],
        ],
        tallHearth: [
          [[-.17,.3],[-.17,-.22],[0,-.35],[.17,-.22],[.17,.3]],
          [[-.07,.29],[-.1,.13],[0,-.06],[.09,.14],[.07,.29]],
          [[-.41,.26],[-.36,-.18],[-.28,-.15],[-.24,.08],[-.31,.27]],
          [[.25,.27],[.30,-.06],[.35,.02],[.38,.27]],
          [[.32,.08],[.4,.02],[.42,.14],[.34,.2],[.32,.08]],
        ],
        deepDiggers: [
          [[-.39,.29],[-.31,-.15],[-.25,-.22],[-.18,-.11],[-.22,.02],[-.09,-.18],[-.05,-.29]],
          [[-.11,-.31],[-.04,-.29],[.01,-.19]],
          [[.03,.29],[.12,-.13],[.19,-.20],[.23,-.04],[.36,-.19],[.36,-.31]],
          [[.30,-.32],[.39,-.3],[.42,-.19]],
          [[.25,.27],[.25,.1],[.41,.09],[.41,.27],[.25,.27]],
        ],
      }[art.id];
      if (figures) {
        for (const line of figures) face.path(line, bright);
      } else {
        const bells = art.id === "sevenBells", count = bells ? 7 : 6;
        for (let i = 0; i < count; i++) {
          const u = (i - (count - 1) / 2) * .13, v = bells ? -.14 + .07 * Math.cos(i * 2) : -.06;
          face.path([[u - .047, v + .17], [u - .026, v - .08], [u, v - .15], [u + .026, v - .08], [u + .047, v + .17], [u - .047, v + .17]], bright);
          if (bells || i !== 3) face.rect(u, v + .04, .018, .045, middle, depth);
          if (bells) face.path([[u, v + .17], [u, .19], [u * 1.12, .32]], middle);
        }
      }
    }
  }
  for (const s of map.sigils || []) {
    const x = s.x + .5, y = s.y + .5;
    if (s.kind === "inlay") continue; // the floor material reads these marks from the tile mask
    const sides = s.kind === "column" ? Object.values(inward) : [inward[s.side]];
    for (const normal of sides) {
      if (!normal) continue;
      const [nx, ny] = normal, banner = s.kind === "banner", lintel = s.kind === "lintel";
      const crown = th.arch.spring + th.arch.radius, lintelHeight = Math.min(.38, H - crown - .015);
      const face = paint(x + nx * .537, y + ny * .537, lintel ? crown + lintelHeight / 2 + .01 : 1.52, nx, ny, banner ? .97 : lintel ? .67 : .62, banner ? 1.46 : lintel ? lintelHeight : .83);
      const cloth = [.24, .075, .14], border = [.6, .42, .24];
      face.rect(0, 0, .5, .5, banner ? cloth : sigilColors[0].map((v) => v * .55));
      if (banner) {
        face.rect(0, -.49, .56, .017, border, .008);
        face.rect(-.46, 0, .012, .46, border, .008);
        face.rect(.46, 0, .012, .46, border, .008);
        face.rect(0, .46, .47, .012, border, .008);
      }
      glyph(face);
    }
  }
  const arch = new Uint8Array(w * h), capped = new Uint8Array(w * h), D = th.decor || {}, Pr = th.props || {}, PL = th.plinth, CO = th.cornice, PIL = th.pilaster;
  // 2026-11-11 (CLOSE_VIEW_DEEP): a tile that is one of the theme's features stands as itself, built once below (featured), and
  // the Deep's glowing lights grow a small cluster at the wall's foot (growths). Neither exists for any other theme.
  const FT = th.features || null, featureOf = (x, y) => (FT && x >= 0 && y >= 0 && x < w && y < h && FT[tiles[y * w + x]?.kind]) || null, featured = FT ? new Uint8Array(w * h) : null, growths = [];
  const featureCol = (rgb) => rgb.map((v) => v / 255);
  // a tapered n-sided post from (r0, z0) to (r1, z1), its top leaning by (lx, ly); cap 1: a top, 2: an underside. Its normals are
  // short (.6): the wall pass then never culls a face of it by its side (a tapered face is not one plane with the wall's normal).
  const frustum = (cx, cy, r0, r1, z0, z1, n, rot, col, deco, hsh, tx, ty, cap = 0, lx = 0, ly = 0) => {
    for (let k = 0; k < n; k++) { const a0 = rot + k * 2 * Math.PI / n, a1 = rot + (k + 1) * 2 * Math.PI / n, am = (a0 + a1) / 2, fx = Math.cos(am) * .6, fy = Math.sin(am) * .6;
      const P = [[cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z0, 0], [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, z0, 1], [cx + lx + Math.cos(a1) * r1, cy + ly + Math.sin(a1) * r1, z1, 1], [cx + lx + Math.cos(a0) * r1, cy + ly + Math.sin(a0) * r1, z1, 0]];
      for (const i of [0, 1, 2, 0, 2, 3]) { const [X, Y, Z, u] = P[i]; V(X, Y, Z, (k + u) * .35, u, Z, z1, fx, fy, 12, 0, col, deco, 0, 0, hsh, tx, ty); } }
    for (const [on, z, r, ox, oy, part] of [[cap & 1, z1, r1, lx, ly, 12], [cap & 2, z0, r0, 0, 0, 12.25]]) { if (!on || !(r > 0)) continue;
      for (let k = 1; k < n - 1; k++) for (const j of [0, k, k + 1]) { const a = rot + j * 2 * Math.PI / n, X = cx + ox + Math.cos(a) * r, Y = cy + oy + Math.sin(a) * r; V(X, Y, z, X + Y, .5, z, z, 0, 0, part, 0, col, deco, 0, 0, hsh, tx, ty); } } };
  const SH = CLOSE_VIEW_DEEP.shapes;
  // a giant cap (a glowcap); a cluster of crystal shards; a temple's column; a great root; brass pipes; a sarcophagus
  const buildFeature = (f, x, y) => { const hsh = (x * 31 + y * 17) % 997, r = (k) => rnd(x, y, 0, 60 + k), cx = x + .5, cy = y + .5, col = featureCol(f.rgb || [128, 128, 128]), glow = f.glow || 0;
    if (f.form === "cap") { const S = SH.cap, hh = S.height[0] + (S.height[1] - S.height[0]) * r(0), lean = (r(1) - .5) * .12, rot = r(2) * 6.283, ch = S.capH[0] + (S.capH[1] - S.capH[0]) * r(3), stem = featureCol(f.stem || f.rgb), under = featureCol(f.under || f.rgb);
      frustum(cx, cy, S.stem[0], S.stem[1], 0, hh, 7, rot, stem, glow * .15, hsh, x, y, 0, lean, lean * .5);
      frustum(cx + lean, cy + lean * .5, S.cap[0], S.cap[1], hh, hh + ch * .45, 9, rot, col, glow, hsh, x, y, 2);
      frustum(cx + lean, cy + lean * .5, S.cap[1], S.cap[2], hh + ch * .45, hh + ch, 9, rot, col, glow, hsh, x, y, 1);
      frustum(cx + lean, cy + lean * .5, S.cap[0] * .96, S.stem[1] * 1.2, hh - .005, hh + .02, 9, rot, under, glow * .5, hsh, x, y, 0); }
    else if (f.form === "shard") { const S = SH.shard; for (let k = 0; k < S.n; k++) { const a = r(10 + k) * 6.283, d = k ? .12 + r(20 + k) * .2 : 0, hh = (S.height[0] + (S.height[1] - S.height[0]) * r(30 + k)) * (k ? .7 : 1), rr = S.r[0] + (S.r[1] - S.r[0]) * r(40 + k), ox = Math.cos(a) * d, oy = Math.sin(a) * d;
        frustum(cx + ox, cy + oy, rr, rr * .55, 0, hh * .82, 5, a, col, glow, hsh, x, y, 0, ox * S.lean * 2, oy * S.lean * 2); frustum(cx + ox * (1 + S.lean * 2), cy + oy * (1 + S.lean * 2), rr * .55, 0, hh * .82, hh, 5, a, col, glow * 1.2, hsh, x, y, 0); } }
    else if (f.form === "column") { const S = SH.column; frustum(cx, cy, S.r * 1.25, S.r * 1.25, 0, .16, S.sides, 0, col, 0, hsh, x, y, 1); frustum(cx, cy, S.r, S.r * .94, .16, H - .2, S.sides, 0, col, 0, hsh, x, y, 0); frustum(cx, cy, S.r * 1.2, S.r * 1.3, H - .2, H, S.sides, 0, col, 0, hsh, x, y, 2); }
    else if (f.form === "knot") { const S = SH.knot, rot = r(0) * 6.283; frustum(cx, cy, S.r[0], S.r[1], 0, H * .55, 7, rot, col, 0, hsh, x, y, 0, (r(1) - .5) * .16, (r(2) - .5) * .16); frustum(cx + (r(1) - .5) * .16, cy + (r(2) - .5) * .16, S.r[1], S.r[0] * .9, H * .55, H, 7, rot, col, 0, hsh, x, y, 0);
      for (let k = 0; k < S.flares; k++) { const a = rot + k * 6.283 / S.flares + r(3 + k) * .5; frustum(cx + Math.cos(a) * .18, cy + Math.sin(a) * .18, .1, .04, 0, .32, 5, a, col, 0, hsh, x, y, 0, Math.cos(a) * .22, Math.sin(a) * .22); } }
    else if (f.form === "pipe") { const S = SH.pipe, v = ((x + y) & 1) === 0; for (const at of S.at) { const px = v ? x + at : cx, py = v ? cy : y + at; frustum(px, py, S.r, S.r, 0, H, 8, 0, col, .04, hsh, x, y, 0); for (const z of [.5, 1.5]) frustum(px, py, S.r * 1.25, S.r * 1.25, z, z + .08, 8, 0, col.map((c) => c * .55), 0, hsh, x, y, 3); } }
    else if (f.form === "slab") { const S = SH.slab, ax = (x + y) & 1 ? S.half[0] : S.half[1], ay = (x + y) & 1 ? S.half[1] : S.half[0]; box(cx, cy, ax, ay, 0, S.height, 7, 0, col, hsh, x, y); box(cx, cy, ax + .04, ay + .04, S.height, S.height + .1, 7, 0, col.map((c) => c * .85), hsh, x, y); } };
  // the theme's glowing growth at a wall's foot: small caps or shards (CLOSE_VIEW_DEEP.shapes.growth), never on a tile's centre line
  const buildGrowth = (gx, gy, nx, ny, k0, tx, ty) => { const G = th.growth, S = SH.growth, col = featureCol(G.rgb), stem = featureCol(G.stem || G.rgb), under = featureCol(G.under || G.rgb), hsh = (tx * 31 + ty * 17) % 997;
    for (let k = 0; k < S.n; k++) { const r = (j) => rnd(tx, ty, k0 + k, 70 + j), along = (r(0) - .5) * .5, out = .06 + r(1) * .16, X = gx + (ny !== 0 ? along : 0) + nx * out, Y = gy + (nx !== 0 ? along : 0) + ny * out, sz = 1 - k * .22;
      if (G.form === "cap") { const hh = (S.height[0] + (S.height[1] - S.height[0]) * r(2)) * sz, cr = (S.cap[0] + (S.cap[1] - S.cap[0]) * r(3)) * sz; frustum(X, Y, cr * .28, cr * .22, 0, hh, 5, 0, stem, G.glow * .2, hsh, tx, ty); frustum(X, Y, cr, cr * .35, hh, hh + cr * .55, 7, r(4) * 6.283, col, G.glow, hsh, tx, ty, 3); }
      else { const hh = (S.shard[0] + (S.shard[1] - S.shard[0]) * r(2)) * sz, rr = .035 + .03 * r(3); frustum(X, Y, rr, 0, 0, hh, 4, r(4) * 6.283, col, G.glow, hsh, tx, ty, 0, nx * .06 + (r(5) - .5) * .08, ny * .06 + (r(6) - .5) * .08); } } };
  const iron = [.09, .085, .08], wax = [.72, .66, .52], clay = [.36, .27, .2], wood = [.2, .13, .08];
  const stillworks = stillworksCloseView(map);
  const arenaStone = [.105, .12, .16], pillarStone = [.16, .19, .25], lattice = [.37, .56, .67];
  for (let i = 0; i < geo.count; i++) { const o = i * 10, x0 = Fc[o], y0 = Fc[o + 1], x1 = Fc[o + 2], y1 = Fc[o + 3], nx = Fc[o + 4], ny = Fc[o + 5], tx = Fc[o + 6], ty = Fc[o + 7], st = Fc[o + 8], tier = tiles[ty * w + tx]?.tier === true, low = Fc[o + 9] || tier;
    if (FT && featureOf(tx, ty)) { featured[ty * w + tx] = 1; continue; } // 2026-11-11: built as itself below
    const door = st === STYLE_INDEX.door, mat = door ? 5 : !th.ownWalls && MAT_OF_STYLE[st] >= 0 ? MAT_OF_STYLE[st] : th.wall.kind, col = door ? STYLE_RGB[st] : mat === th.wall.kind ? tg.wall : MAT_RGB[mat], top = tier ? HALL_VIEW.tierHeight : low ? RB : H;
    const a0 = ny !== 0 ? x0 : y0, a1 = ny !== 0 ? x1 : y1, grit = (geo.detail[i] || 0) * 4 + (geo.detailInst[i] & 15) * 2 + (geo.detailInst[i] & 16 ? 1 : 0), cb = geo.corner[i] & 3, ab = geo.ao[i] & 3, bits = cb + ab * 4, side = nx > 0 ? 1 : nx < 0 ? 3 : ny > 0 ? 2 : 0, hsh = ((tx * 73 + ty * 151 + side * 37) % 997 + 997) % 997;
    const dx = x1 - x0, dy = y1 - y0, fx = tx + nx, fy = ty + ny, front = free(fx, fy), exterior = tx - nx < 0 || ty - ny < 0 || tx - nx >= w || ty - ny >= h, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (stillworks) {
      const tile = tiles[ty * w + tx];
      const stone = tile.pillar || tile.monolith ? pillarStone : arenaStone;
      quad(x0, y0, x1, y1, 0, top, a0, a1, nx, ny, 0, 0, stone, 0, grit, bits, hsh, tx, ty);
      if (!capped[ty * w + tx]) {
        capped[ty * w + tx] = 1;
        flat(tx, ty, tx + 1, ty, tx + 1, ty + 1, tx, ty + 1, top, 1, 0, stone, hsh, tx, ty);
      }
      if (front && (tile.pillar || tile.monolith)) {
        const face = paint(mx + nx * .012, my + ny * .012, top * .52, nx, ny, .78, top * .8);
        if (tile.monolith) face.path([[0, -.47], [-.30, 0], [0, .47], [.30, 0], [0, -.47]], lattice);
        else for (const level of [-.32, 0, .32]) face.rect(0, level, .5, .012, lattice);
      }
      continue;
    }
    // the face's decoration, chosen once
    let deco = 0; if (!door && !low && mat !== 4) { const r = rnd(tx, ty, side, 9); let acc = 0; const pick = (k, share, code) => { if (!deco && share) { acc += share; if (r < acc) deco = code; } };
      if (exterior) pick("slit", D.slit, 3); pick("tapestry", D.tapestry, 2); pick("banner", D.banner, 1); pick("roots", D.roots, 4); pick("niche", D.niche, 6); pick("pods", D.pods, 7); pick("vent", D.vent, 8); }
    quad(x0, y0, x1, y1, 0, top, a0, a1, nx, ny, 0, mat, col, deco, grit, bits, hsh, tx, ty);
    if (low) { if (!capped[ty * w + tx]) { capped[ty * w + tx] = 1; flat(tx, ty, tx + 1, ty, tx + 1, ty + 1, tx, ty + 1, top, 1, mat, col, hsh, tx, ty); } continue; }
    if (door || mat === 4) continue;
    // the plinth and the cornice: real depth along the wall's foot and under its top; at an outside corner each runs on to meet the other
    const e0s = (cb & 1) && !(ab & 1), e1s = (cb & 2) && !(ab & 2);
    for (const [hgt, dep, atTop] of [[PL[0], PL[1], false], [CO[0], CO[1], true]]) { if (!(hgt > 0 && dep > 0)) continue;
      const e0 = e0s ? dep : 0, e1 = e1s ? dep : 0, sx = x0 - dx * e0, sy = y0 - dy * e0, ex = x1 + dx * e1, ey = y1 + dy * e1, z0 = atTop ? top - hgt : 0, z1 = atTop ? top : hgt;
      quad(sx + nx * dep, sy + ny * dep, ex + nx * dep, ey + ny * dep, z0, z1, a0 - e0 * Math.sign(a1 - a0), a1 + e1 * Math.sign(a1 - a0), nx, ny, 3, mat, col, 0, 0, 0, hsh, tx, ty);
      flat(sx, sy, ex, ey, ex + nx * dep, ey + ny * dep, sx + nx * dep, sy + ny * dep, atTop ? z0 : z1, atTop ? 3.25 : 3, mat, col, hsh, tx, ty); }
    // a pilaster where a straight wall reaches a joint every `pilaster` tiles
    if (PIL > 0 && !cb && (mat === 0 || mat === 3) && ((Math.round(Math.min(a0, a1)) % PIL) + PIL) % PIL === 0 && !(cb & 1)) { const pw = .17, pd = Math.max(.13, (PL[1] || 0) + .05), cx = dx < 0 || dy < 0 ? x1 : x0, cy = dx < 0 || dy < 0 ? y1 : y0, ux = Math.abs(dx), uy = Math.abs(dy);
      const lx = cx - ux * pw, ly = cy - uy * pw, rx2 = cx + ux * pw, ry2 = cy + uy * pw;
      quad(lx + nx * pd, ly + ny * pd, rx2 + nx * pd, ry2 + ny * pd, 0, H, 0, 1, nx, ny, 2, mat, col, 0, 0, 0, hsh, tx, ty);
      quad(lx, ly, lx + nx * pd, ly + ny * pd, 0, H, 0, 1, -ux, -uy, 2, mat, col, 0, 0, 0, hsh, tx, ty); quad(rx2 + nx * pd, ry2 + ny * pd, rx2, ry2, 0, H, 0, 1, ux, uy, 2, mat, col, 0, 0, 0, hsh, tx, ty); }
    if (!front) continue;
    // a placed light: a sconce on the wall (on a bracket), a pod in a hive's wall, a lamp in a machine's
    let lit = false;
    if (rnd(tx, ty, side, 1) < src.share && deco !== 3) { const lx = mx + nx * .2, ly = my + ny * .2; let ok = true; for (let k = 0; k < lights.length && ok; k += LIGHT_FLOATS) ok = Math.hypot(lights[k] - lx, lights[k + 1] - ly) >= src.spacing;
      if (ok) { const hue = rnd(tx, ty, side, 2) < src.ghost ? 2 : src.hue, lz = hue === 5 ? .42 : hue === 1 ? .7 + rnd(tx, ty, side, 3) * .6 : mat === 3 || mat === 6 ? 1.95 : 1.55; lights.push(lx, ly, lz, src.reach, src.strength, hue, rnd(tx, ty, side, 4) * 6.283, 0); lit = true;
        if (hue === 5 && th.growth) growths.push(mx, my, nx, ny, side, tx, ty); // 2026-11-11: the light is a cluster of glowing growth at the wall's foot
        if (hue !== 1 && hue < 4) { flames.push(lx, ly, lz + .1, 1, hue, rnd(tx, ty, side, 5) * 6.283); const bhx = ny !== 0 ? .035 : .1, bhy = ny !== 0 ? .1 : .035; box(mx + nx * .1, my + ny * .1, bhx, bhy, lz - .12, lz - .04, 6, 0, iron, hsh, fx, fy); box(lx, ly, .04, .04, lz - .04, lz + .02, 6, 0, iron, hsh, fx, fy); } } }
    // candles in an inside corner, on the floor
    if ((ab & 1) && src.candles > 0 && rnd(tx, ty, side, 6) < src.candles) { const ux = Math.sign(dx), uy = Math.sign(dy), cx = x0 + ux * .2 + nx * .2, cy = y0 + uy * .2 + ny * .2; let ok = true; for (let k = 0; k < lights.length && ok; k += LIGHT_FLOATS) ok = Math.hypot(lights[k] - cx, lights[k + 1] - cy) >= src.spacing * .5;
      if (ok) { lights.push(cx, cy, .35, src.reach * .7, src.strength * .7, 0, rnd(tx, ty, side, 7) * 6.283, 1);
        for (let k = 0; k < 3; k++) { const ox = cx + (rnd(tx, ty, k, 11) - .5) * .2, oy = cy + (rnd(tx, ty, k, 12) - .5) * .2, ch = .1 + rnd(tx, ty, k, 13) * .14; box(ox, oy, .022, .022, 0, ch, 8, 0, wax, hsh, fx, fy); flames.push(ox, oy, ch + .035, .45, 0, rnd(tx, ty, k, 14) * 6.283); } } }
    // props along the wall
    const along = (k) => (rnd(tx, ty, side, k) - .5) * .5, ux = Math.sign(dx), uy = Math.sign(dy);
    if (!lit && Pr.urn && rnd(tx, ty, side, 20) < Pr.urn) { const t = along(21), cx = mx + ux * t + nx * .2, cy = my + uy * t + ny * .2, hh = .26 + rnd(tx, ty, side, 22) * .14; box(cx, cy, .1, .1, 0, hh, 7, 0, clay, hsh, fx, fy); box(cx, cy, .065, .065, hh, hh + .06, 7, 0, clay, hsh, fx, fy); }
    else if (!lit && Pr.coffin && rnd(tx, ty, side, 23) < Pr.coffin) { const cx = mx + nx * .09, cy = my + ny * .09; box(cx, cy, ny !== 0 ? .25 : .08, ny !== 0 ? .08 : .25, 0, 1.55, 9, 0, wood, hsh, fx, fy); }
    if (Pr.rubble && rnd(tx, ty, side, 24) < Pr.rubble) for (let k = 0; k < 3; k++) { const t = along(25 + k), s2 = .05 + rnd(tx, ty, side, 28 + k) * .07, cx = mx + ux * t + nx * (.12 + rnd(tx, ty, side, 31 + k) * .25), cy = my + uy * t + ny * (.12 + rnd(tx, ty, side, 34 + k) * .25); box(cx, cy, s2, s2 * .8, 0, s2 * 1.2, 7, 0, col, hsh, fx, fy); }
    if (Pr.bones && rnd(tx, ty, side, 40) < Pr.bones) cards.push(8, mx + ux * along(41) + nx * .42, my + uy * along(41) + ny * .42, rnd(tx, ty, side, 42) * 97, 0, 0, 0, 0);
    if (Pr.chain && rnd(tx, ty, side, 43) < Pr.chain) cards.push(5, mx + ux * along(44) + nx * .32, my + uy * along(44) + ny * .32, .8 + rnd(tx, ty, side, 45) * .7, 0, 0, 0, 0);
    if ((ab & 1) && Pr.web && rnd(tx, ty, side, 46) < Pr.web) cards.push(4, x0, y0, ux, uy, nx, ny, .45 + rnd(tx, ty, side, 47) * .35);
  }
  // A low marker makes the optional landing legible while keeping the approach dim.
  const crawlLanding = map.closeViewCrawl?.landing;
  if (crawlLanding && free(crawlLanding.x, crawlLanding.y)) {
    const { x, y } = crawlLanding;
    const marker = paint(x + .5, y + .5, .025, 0, 0, .45, .45);
    marker.rect(0, 0, .3, .085, [.58, .43, .24]);
    lights.push(x + .5, y + .5, .42, 2, .7, src.hue, 0, 1);
  }
  // arches over doorways: a passage one tile wide through a wall between two rooms takes an arch at each end, with its soffit
  const A = th.arch, stoneMat = th.wall.kind === 1 ? 1 : th.wall.kind, acol = th.wall.kind === 1 ? wood : tg.wall, round = A.radius > .01;
  const roomy = (x, y, ew) => ew ? !solid(x - 1, y) || !solid(x + 1, y) : !solid(x, y - 1) || !solid(x, y + 1);
  for (let y = 0; !stillworks && !A.none && y < h; y++) for (let x = 0; x < w; x++) { if (solid(x, y) || closeViewHazardCode(tiles[y * w + x])) continue; // A.none (the Deep's caves): no masonry arches
    const direction = interiorTerrain(map) ? interiorArchAt(map, x, y) : null;
    const ns = interiorTerrain(map) ? direction === "ns"
      : solid(x - 1, y) && solid(x + 1, y) && !solid(x, y - 1) && !solid(x, y + 1) && roomy(x, y - 1, true) && roomy(x, y + 1, true);
    const ew = interiorTerrain(map) ? direction === "ew"
      : solid(x, y - 1) && solid(x, y + 1) && !solid(x - 1, y) && !solid(x + 1, y) && roomy(x - 1, y, false) && roomy(x + 1, y, false);
    if (!ns && !ew) continue; const hsh = (x * 31 + y * 17) % 997; arch[y * w + x] = 1;
    // the two faces (ends of the passage), each a quad from the spring to the top with the opening cut out in the shader
    const ends = ns ? [[x + 1, y, x, y, 0, -1], [x, y + 1, x + 1, y + 1, 0, 1]] : [[x, y, x, y + 1, -1, 0], [x + 1, y + 1, x + 1, y, 1, 0]];
    for (const [ax, ay, bx, by, nx, ny] of ends) quad(ax, ay, bx, by, A.spring, H, 0, 1, nx, ny, 4, stoneMat, acol, 0, 0, 0, hsh, x, y);
    // the soffit: the arch's underside through the wall's thickness (segments round the curve; a flat lintel's is one quad)
    const seg = round ? 9 : 1, P = (k, end) => { const th2 = Math.PI * (1 - k / seg), u = round ? .5 + .5 * Math.cos(th2) : k / seg, z = round ? A.spring + A.radius * Math.sin(th2) : A.spring, [ax, ay, bx, by] = ends[end]; return [ax + (bx - ax) * (end ? 1 - u : u), ay + (by - ay) * (end ? 1 - u : u), z, u]; };
    for (let k = 0; k < seg; k++) { const a = P(k, 0), b = P(k + 1, 0), c2 = P(k + 1, 1), d2 = P(k, 1);
      for (const q of [a, b, c2, a, c2, d2]) V(q[0], q[1], q[2], 0, q[3], q[2], H, 0, 0, 5, stoneMat, acol, 0, 0, 0, hsh, x, y); } }
  // Tile-sized beam sections use the same discovery mask as their ceiling plane. At a
  // crossing the short sections butt against the long one and share no bottom faces.
  // 2026-11-11: the features and growths (CLOSE_VIEW_DEEP), and the faces of the walls beside a feature (a wall face is only
  // made where a wall meets open floor, and a feature tile counts as wall in the shared geometry).
  if (FT) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!featured[y * w + x]) continue; const f = featureOf(x, y); buildFeature(f, x, y);
    for (const [nx, ny] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const X = x + nx, Y = y + ny; if (X < 0 || Y < 0 || X >= w || Y >= h || !isWall(tiles[Y * w + X]) || featureOf(X, Y)) continue;
      const ax = nx > 0 ? x + 1 : nx < 0 ? x : ny > 0 ? x + 1 : x, ay = ny > 0 ? y + 1 : ny < 0 ? y : nx > 0 ? y : y + 1, bx = nx > 0 ? x + 1 : nx < 0 ? x : ny > 0 ? x : x + 1, by = ny > 0 ? y + 1 : ny < 0 ? y : nx > 0 ? y + 1 : y;
      quad(ax, ay, bx, by, 0, H, ny !== 0 ? ax : ay, ny !== 0 ? bx : by, -nx, -ny, 0, th.wall.kind, tg.wall, 0, 0, 0, (X * 73 + Y * 151) % 997, X, Y); } }
  for (let i = 0; i < growths.length; i += 7) buildGrowth(growths[i], growths[i + 1], growths[i + 2], growths[i + 3], growths[i + 4] * 7, growths[i + 5], growths[i + 6]);
  if (!stillworks && !map.hall?.open && th.ceiling.kind !== 5) { // the Deep's rock overhead (kind 5) has no beams
    const { data: mask } = closeViewMask(map);
    const covered = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, flags = mask[i * 4];
      if ((flags & 5) !== 1 || tiles[i]?.blocked || arch[i] || tiles[i]?.doorway) continue;
      if (ceilingArt.some(([left, top, right, bottom]) => x < right && x + 1 > left && y < bottom && y + 1 > top)) continue;
      covered[i] = 1;
    }
    const { kind, bay, rib } = th.ceiling;
    const spacing = map.hall ? HALL_VIEW.ceilingBay : bay, half = rib;
    const beamZ = H - .105, color = tg.ceil.map((v) => v * 1.25);
    const hasRoof = (x, y) => x >= 0 && y >= 0 && x < w && y < h && covered[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!hasRoof(x, y)) continue;
      const acrossX = y % spacing === 0, acrossY = x % spacing === 0 && (kind === 0 || kind === 3);
      if (!acrossX && !acrossY) continue;
      const left = x + .5 - half, right = x + .5 + half, top = y + .5 - half, bottom = y + .5 + half;
      const side = (x0, y0, x1, y1, nx, ny) => quad(x0, y0, x1, y1, beamZ, H,
        ny ? x0 : y0, ny ? x1 : y1, nx, ny, 10, kind, color, 0, 0, 0, 0, x, y);
      const underside = (x0, y0, x1, y1) => flat(x0, y0, x1, y0, x1, y1, x0, y1, beamZ, 10.25, kind, color, 0, x, y);
      if (acrossX) {
        underside(x, top, x + 1, bottom);
        if (acrossY) {
          side(x, top, left, top, 0, -1);
          side(right, top, x + 1, top, 0, -1);
          side(x, bottom, left, bottom, 0, 1);
          side(right, bottom, x + 1, bottom, 0, 1);
        } else {
          side(x, top, x + 1, top, 0, -1);
          side(x, bottom, x + 1, bottom, 0, 1);
        }
        if (!hasRoof(x - 1, y)) side(x, top, x, bottom, -1, 0);
        if (!hasRoof(x + 1, y)) side(x + 1, top, x + 1, bottom, 1, 0);
      }
      if (acrossY) {
        const section = (start, end) => {
          underside(left, start, right, end);
          side(left, start, left, end, -1, 0);
          side(right, start, right, end, 1, 0);
        };
        if (acrossX) {
          section(y, top);
          section(bottom, y + 1);
        } else section(y, y + 1);
        if (!hasRoof(x, y - 1)) side(left, y, right, y, 0, -1);
        if (!hasRoof(x, y + 1)) side(left, y + 1, right, y + 1, 0, 1);
      }
    }
  }
  if (!interiorTerrain(map)) {
    // Runtime stone is a short support prism on the historical z=0 floor. It
    // must not lift the old ceiling, wall trim, arches, furniture or lights.
    for (const t of tiles) {
      const level = legacyInteriorBuildLevel(map, t); if (!level) continue;
      box(t.x + .5, t.y + .5, .5, .5, 0, level * LIFT_PER_LEVEL, 0, 0, MAT_RGB[0], 0, t.x, t.y);
    }
  }
  if (interiorTerrain(map)) {
    const mask = closeViewMask(map).data;
    const level = (t, x, y) => interiorTileLevel(t, x, y) * LIFT_PER_LEVEL;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = tiles[y * w + x]; if (!t || t.blocked) continue;
      const hazard = closeViewHazardCode(t), k = (y * w + x) * 4;
      // Pits have no supporting floor mesh. Their rims retain the existing hazard treatment.
      flat(x, y, x+1, y, x+1, y+1, x, y+1, 0, hazard && hazard !== 2 && hazard !== 4 ? 22 : 20, 0, tg.floor, 0, x, y);
      if (!map.hall?.open && (mask[k] & 5) === 1 && !arch[y*w+x])
        flat(x, y, x+1, y, x+1, y+1, x, y+1, H, 21, 0, tg.ceil, 0, x, y);
      const sides = [[x,y,x+1,y,0,-1],[x+1,y+1,x,y+1,0,1],[x,y+1,x,y,-1,0],[x+1,y,x+1,y+1,1,0]];
      for (const [ax,ay,bx,by,nx,ny] of sides) {
        const xx=x+nx, yy=y+ny;
        if(xx<0||yy<0||xx>=w||yy>=h) continue;
        const n=tiles[yy*w+xx]; if(!n || n.blocked) continue;
        const a=level(t,ax,ay), b=level(t,bx,by), na=level(n,ax,ay), nb=level(n,bx,by);
        if(a<=na+1e-6 && b<=nb+1e-6) continue;
        // Generated ramp strips have matching edge heights. A higher side exposes rock.
        for(const [X,Y,Z,u] of [[ax,ay,Math.min(a,na),0],[bx,by,Math.min(b,nb),1],[bx,by,b,1],[ax,ay,Math.min(a,na),0],[bx,by,b,1],[ax,ay,a,0]])
          V(X,Y,Z,X+Y,u,Z,Math.max(a,b),nx,ny,0,th.wall.kind,tg.wall,0,0,0,0,x,y,false);
        // Close the ceiling's matching vertical seam, so raised bays never leak into sky.
        if(!map.hall?.open && (mask[k]&5)===1 && (mask[(yy*w+xx)*4]&5)===1)
          for(const [X,Y,Z,u] of [[ax,ay,na+H,0],[bx,by,nb+H,1],[bx,by,b+H,1],[ax,ay,na+H,0],[bx,by,b+H,1],[ax,ay,a+H,0]])
            V(X,Y,Z,X+Y,u,Z,H,-nx,-ny,0,th.wall.kind,tg.wall,0,0,0,0,x,y,false);
      }
    }
    for(let i=0;i<lights.length;i+=LIGHT_FLOATS) lights[i+2]+=surfaceZ(map,lights[i],lights[i+1]);
    for(let i=0;i<flames.length;i+=FLAME_FLOATS) flames[i+2]+=surfaceZ(map,flames[i],flames[i+1]);
  }
  return { inlay, arch, archCap: th.arch.spring + Math.max(0, th.arch.radius) * .55 - .08, w, data: out.a.slice(0, out.n), lights: Float32Array.from(lights), flames: Float32Array.from(flames), cards: Float32Array.from(cards), nLights: lights.length / LIGHT_FLOATS, nFlames: flames.length / FLAME_FLOATS, nCards: cards.length / CARD_FLOATS, verts: out.n / WALL_FLOATS };
}
// How high the camera may be at (x, y): under (or by) a doorway's arch, below its soffit; elsewhere, anywhere.
function archCapAt(map, x, y) { const st = STATIC.get(wallGeometry(map));
  if (!st) { // no GPU scene built (the 2D view): the same doorway arches, from the floor itself, so the higher presets stay under them
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (interiorArchAt(map, x + i * .3, y + j * .3)) { const a = themeOf(map).arch; return a.spring + Math.max(0, a.radius) * .55 - .08; } return Infinity; }
  const w = st.w;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const tx = Math.floor(x + i * .3), ty = Math.floor(y + j * .3); if (tx >= 0 && ty >= 0 && tx < w && st.arch[ty * w + tx]) return st.archCap; } return Infinity; }
function staticFor(map, geo, th) { let st = STATIC.get(geo); if (!st || st.th !== th) { st = buildStatic(map, geo, th); st.th = th; STATIC.set(geo, st); } return st; }
// For tests and the lab: the floor's built things (counts, and the lights and props as plain lists).
// Standard-view parity (2026-11-11: "for everything that is native to Close View, make sure it shows well in the standard
// view as well"): Close View lights an interior with sconces and candles it places itself (buildStatic, from the floor alone).
// The ordinary view draws the same lights where they stand: each flame, a warm pool round it on the floor (a cached sprite a
// hue, added in light), a gentle flicker (still with reduced motion). Only interiors Close View can show, only what the fog
// of war has shown, only in view. CLOSE_VIEW_STD_LIGHTS: the pool's radius (tiles) and strength, a flame's size, how far a
// wall flame is drawn up the wall.
export const CLOSE_VIEW_STD_LIGHTS = Object.freeze({ pool: 1.6, alpha: .26, candleAlpha: .16, flame: .11, lift: .28, sprite: 64 });
const STD_LIGHT = { seenMap: null, seen: null, sprites: [], failed: false };
const STD_FLAME_CSS = HUE_RGB.map((c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 200)},${Math.round(c[2] * 150)})`);
function stdGlowSprite(hue) {
  let c = STD_LIGHT.sprites[hue]; if (c || STD_LIGHT.failed) return c || null; const N = CLOSE_VIEW_STD_LIGHTS.sprite;
  try { c = makeCanvas(); if (!c) { STD_LIGHT.failed = true; return null; } c.width = N; c.height = N; const x = c.getContext("2d"); const col = HUE_RGB[hue] || HUE_RGB[0], rgb = col.map((v) => Math.round(v * 255)).join(",");
    const gr = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.35, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, N, N); }
  catch { STD_LIGHT.failed = true; return null; } STD_LIGHT.sprites[hue] = c; return c;
}
export function drawCloseViewLightsStd(ctx, g, s, now, l, t, r, b) {
  const map = g?.map; if (!map || g.area !== "dungeon" || !interiorMap(map) || stillworksCloseView(map) || !Array.isArray(map.tiles)) return 0;
  let st; try { st = staticFor(map, wallGeometry(map), themeOf(map)); } catch { return 0; }
  if (STD_LIGHT.seenMap !== map) { STD_LIGHT.seenMap = map; STD_LIGHT.seen = glSeen(map); } const seen = STD_LIGHT.seen, S = CLOSE_VIEW_STD_LIGHTS;
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), At = CLOSE_VIEW.atmosphere, L = st.lights, Fl = st.flames; let drawn = 0;
  if (typeof ctx.drawImage !== "function" || typeof ctx.ellipse !== "function") return 0;
  const near = (x, y, pad) => x > l - pad && x < r + pad && y > t - pad && y < b + pad && (!seen || seen(Math.floor(x), Math.floor(y)));
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < st.nLights; i++) { const o = i * LIGHT_FLOATS, x = L[o], y = L[o + 1]; if (!near(x, y, S.pool)) continue; const hue = L[o + 5] | 0, sp = stdGlowSprite(hue); if (!sp) break;
    const fl = reduce ? 1 : 1 + At.flicker[0] * Math.sin(now / At.flicker[1] + L[o + 6]), R = S.pool * (L[o + 7] === 1 ? .75 : 1);
    ctx.globalAlpha = Math.max(0, Math.min(1, (L[o + 7] === 1 ? S.candleAlpha : S.alpha) * L[o + 4] * fl)); ctx.drawImage(sp, (x - R) * s, (y - R) * s, 2 * R * s, 2 * R * s); drawn++; }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  for (let i = 0; i < st.nFlames; i++) { const o = i * FLAME_FLOATS, x = Fl[o], y = Fl[o + 1]; if (!near(x, y, 1)) continue; const k = Fl[o + 3], up = Fl[o + 2] > 1 ? S.lift : .06;
    const wob = reduce ? 1 : 1 + .12 * Math.sin(now / 90 + Fl[o + 5]), fx = x * s, fy = (y - up) * s, fw = S.flame * k * s, fh = S.flame * 1.9 * k * wob * s;
    if (Fl[o + 2] > 1) { ctx.fillStyle = "#1c1814"; ctx.fillRect(fx - fw * .7, fy + fh * .1, fw * 1.4, fw * .6); } // the sconce's cup
    ctx.fillStyle = STD_FLAME_CSS[Fl[o + 4] | 0] || STD_FLAME_CSS[0]; ctx.beginPath(); ctx.ellipse(fx, fy - fh * .35, fw * .55, fh * .6, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#fff4d8"; ctx.beginPath(); ctx.ellipse(fx, fy - fh * .2, fw * .25, fh * .3, 0, 0, 6.2832); ctx.fill(); }
  ctx.restore(); return drawn;
}
export function closeViewStatic(map) { const geo = wallGeometry(map), st = staticFor(map, geo, themeOf(map)); return { theme: closeViewThemeId(map?.building), verts: st.verts, lights: st.nLights, flames: st.nFlames, cards: st.nCards, data: st.data, lightList: st.lights, cardList: st.cards }; }
// Feel pass 1 (pre-warm): a floor's walls (wallGeometry, then the static buffer) were built on the first Close View frame that
// drew it, in the same frame as the floor's own load: 15-126 ms of CPU on a desktop, several times that on a phone, at the one
// moment the player is moving through a door. closeViewPrewarmDue says the next Close View frame would build them; the host
// (main.ts) then holds the last frame on screen and builds them in a task of their own (prewarmCloseView), so the load and the
// build land in separate frames. The build is the very one the frame would have made (staticFor, cached per floor), so what is
// drawn is byte-identical. A frame that comes before the task has run builds as before.
export function closeViewPrewarmDue(g) {
  if (!g?.map?.tiles || !g.player || CLOSE_VIEW_HOOKS.gl === false || qualityOf(g).gl !== true || !closeViewApplies(g)) return false;
  const extended = overworldCloseViewApplies(g); if (extended && openWorldScene(g) && !interiorTerrain(g.map) && !g.map.building) return false; // renderCloseView's plainWorld: no static buffer
  const geo = wallCache.get(g.map), st = geo && geo.tiles === g.map.tiles ? STATIC.get(geo) : null;
  return !(st && st.th === themeOf(g.map));
}
export function prewarmCloseView(g) { if (!closeViewPrewarmDue(g)) return false; staticFor(g.map, wallGeometry(g.map), themeOf(g.map)); return true; }
// The GPU context and its programs, made ahead of the first Close View frame (the host calls it once, idle, with Close View on).
export function prewarmCloseViewGL() { if (CLOSE_VIEW_HOOKS.gl === false) return false; try { return closeViewGLReady(makeCanvas); } catch { return false; } }

// The light reaching a point, as one number (a creature's card, a prop's): the shader's falloff, from the carried light and the
// frame's placed lights.
const falloff = (d, R) => { const x = d / R, k = Math.max(0, 1 - x * x); return k * k / (1 + 2.5 * x * x); }; // as the shader's
const lumOf = (c) => (c[0] + c[1] + c[2]) / 3;
function lightLevel(F, X, Y, Z) { let l = lumOf(F.amb) + lumOf(F.torch) * F.torchP[1] * falloff(Math.hypot(X - F.px, Y - F.py, Z - F.torchP[2]), F.torchP[0]);
  for (let i = 0; i < F.nl; i++) l += (F.lc[i * 4] + F.lc[i * 4 + 1] + F.lc[i * 4 + 2]) / 3 * F.lc[i * 4 + 3] * falloff(Math.hypot(X - F.lp[i * 4], Y - F.lp[i * 4 + 1], Z - F.lp[i * 4 + 2]), F.lp[i * 4 + 3]); return l; }
const SHOT_DRAW = Object.freeze({ low: 12, balanced: 20, full: 28, maxRange: 14, beamRange: LUMEN_CARBINE.range + 2, beamTrail: LUMEN_CARBINE.range + 1, height: .66,
  minSize: .075, magicSize: .12, maxTrail: .9, trailSeconds: .058, trailAlpha: .46, headAlpha: .95 });
const CONTACT_GLINT = Object.freeze({ max: 8, height: .84, radius: .08, spread: .17, front: .28, alpha: .9, color: 0xffbd7e });
const PROJECTED_SHOTS = new Set();
const PROJECTED_ENTRIES = [];
const SHOT_COLORS = new Map();
const finite = Number.isFinite;
function validFire(p) { return !!p && p.fireBomb === true && p.path === "grenade" && p.glyphSpell === "fire-burst" && !p.hostile && !p.dead && !p.shadow && !p.echo && p.visualLaunch == null &&
  finite(p.x) && finite(p.y) && finite(p.dx) && finite(p.dy) && finite(p.age) && p.age >= 0 && finite(p.life) && p.life > 0 &&
  typeof p.id === "string" && p.id.length > 0 && p.id.length <= 160 && p.visualFlight == null; }
function validOrbit(g, f) { return !!f && f.visualLaunch == null && g.orbit?.flight === f && typeof g.areaId==='function' && g.orbit.where===`${g.area}:${g.areaId()}` && finite(f.x) && finite(f.y) && finite(f.tx) && finite(f.ty) &&
  finite(f.radius) && f.radius > 0 && f.radius <= 8 && (f.perfect === undefined || typeof f.perfect === "boolean") && f.visualFlight == null; }
export function selectProjectedShots(g, q, reduce = false) {
  PROJECTED_SHOTS.clear();
  PROJECTED_ENTRIES.length = 0;
  if (!closeViewGLFrameReady()) return null;
  const limit = q.glScale === 1 ? SHOT_DRAW.full : q.relief ? SHOT_DRAW.balanced : SHOT_DRAW.low;
  try { CLOSE_VIEW_HOOKS.reserve?.(limit * 12 + 12); glEnsure("decal", limit * 12 + 12); } catch { return null; }
  const admit = (kind, source, verts, geom = null) => { if (PROJECTED_ENTRIES.length >= limit) return false; PROJECTED_ENTRIES.push({ kind, source, verts, geom }); PROJECTED_SHOTS.add(source); return true; };
  for (const p of g.projectiles || []) {
    if (PROJECTED_SHOTS.size === limit) break;
    if (!p.dead && standardProjectile(p) && (p.path !== "grenade" || !!readProjectileVisualFlight(p.visualFlight)) &&
        Math.hypot(p.x - g.player.x, p.y - g.player.y) < (p.carbine === true ? SHOT_DRAW.beamRange : SHOT_DRAW.maxRange) &&
        dungeonPointDiscovered(g.map, p)) admit("projectile", p, reduce ? 6 : 12);
  }
  for (const p of g.projectiles || []) {
    if (PROJECTED_ENTRIES.length === limit) break;
    if (validFire(p) && Math.hypot(p.x-g.player.x,p.y-g.player.y)<SHOT_DRAW.maxRange && dungeonPointDiscovered(g.map,p)) {
      const z=surfaceZ(g.map,p.x,p.y)+SHOT_DRAW.height;if(!finite(z))continue;const geom={x:p.x,y:p.y,z,tail:null},d=Math.hypot(p.dx,p.dy),trailTime=Math.min(SHOT_DRAW.trailSeconds,p.age),length=Math.min(SHOT_DRAW.maxTrail,p.speed*trailTime);
      if(!reduce&&d>1e-4&&length>0){const x=p.x-p.dx*length/d,y=p.y-p.dy*length/d,tz=surfaceZ(g.map,x,y)+SHOT_DRAW.height;if(finite(x)&&finite(y)&&finite(tz)&&toolCueSegmentOpen(g.map,p.x,p.y,x,y))geom.tail={x,y,z:tz};}
      admit("fire",p,geom.tail?12:6,geom);
    }
  }
  const orbit=g.orbit?.flight;
  if(PROJECTED_ENTRIES.length<limit&&validOrbit(g,orbit)&&Math.hypot(orbit.x-g.player.x,orbit.y-g.player.y)<SHOT_DRAW.maxRange&&dungeonPointDiscovered(g.map,orbit)){const z=surfaceZ(g.map,orbit.x,orbit.y)+SHOT_DRAW.height;if(finite(z))admit("orbit",orbit,6,{x:orbit.x,y:orbit.y,z});}
  PROJECTED_SHOTS.entries = PROJECTED_ENTRIES;
  PROJECTED_SHOTS.orbit = PROJECTED_ENTRIES.some(e=>e.kind==="orbit") ? orbit : null;
  return PROJECTED_SHOTS;
}
// A Close View shot from the player's held tool leaves the drawn muzzle: the offset from its
// authoritative spawn point to this frame's posed muzzle is latched once, then eased out over
// `settle` seconds. Presentation only: position, collision, aim and saves are never touched.
export const CLOSE_VIEW_SHOT_MUZZLE = Object.freeze({ settle: .14, slots: 16, maxOffset: 1.2 });
const MUZZLE_SHOTS = { refs: new Array(CLOSE_VIEW_SHOT_MUZZLE.slots).fill(null), offset: new Float32Array(CLOSE_VIEW_SHOT_MUZZLE.slots * 3) };
const MUZZLE_OFF = new Float32Array(3);
export const closeViewMuzzleShot = (shot) => !!shot && !shot.hostile && !shot.dead && !shot.shadow && !shot.echo && !shot.returning && shot.glyphHost === 'tool' && shot.visualLaunch == null;
export function closeViewMuzzleWeight(age, settle = CLOSE_VIEW_SHOT_MUZZLE.settle) { const t = Math.max(0, Math.min(1, (Number(age) || 0) / settle)); return 1 - t * t * (3 - 2 * t); }
// Spawn-to-muzzle offset (out[0..2]) for a straight launch seen `age` seconds after spawn.
export function closeViewMuzzleOffset(out, shot, muzzle, support = 0) {
  const d = Math.hypot(shot?.dx, shot?.dy), age = Math.max(0, Number(shot?.age) || 0);
  if (!(d > 1e-6) || !finite(shot.speed) || !finite(shot.x) || !finite(shot.y)) return null;
  const back = shot.speed * age, sx = shot.x - shot.dx / d * back, sy = shot.y - shot.dy / d * back;
  out[0] = muzzle[0] - sx; out[1] = muzzle[1] - sy; out[2] = muzzle[2] - (support + shotVisualHeight(shot, 0));
  return finite(out[0] + out[1] + out[2]) && Math.hypot(out[0], out[1], out[2]) <= CLOSE_VIEW_SHOT_MUZZLE.maxOffset ? out : null;
}
// Returns the current ease weight (0 when the shot has no muzzle latch) and fills MUZZLE_OFF.
function shotMuzzleWeight(g, shot) {
  const S = CLOSE_VIEW_SHOT_MUZZLE, R = MUZZLE_SHOTS, age = Number(shot?.age);
  if (!(age >= 0 && age < S.settle) || !closeViewMuzzleShot(shot)) return 0;
  let slot = R.refs.indexOf(shot);
  if (slot < 0) {
    if (!MODEL_STATE.muzzleReady) return 0;
    for (let i = 0; i < S.slots; i++) { const q = R.refs[i]; if (!q || q.dead || !(q.age < S.settle)) { R.refs[i] = null; if (slot < 0) slot = i; } }
    if (slot < 0) return 0;
    const back = shot.speed * age, d = Math.hypot(shot.dx, shot.dy) || 1;
    if (!closeViewMuzzleOffset(MUZZLE_OFF, shot, MODEL_STATE.muzzle, surfaceZ(g.map, shot.x - shot.dx / d * back, shot.y - shot.dy / d * back))) return 0;
    R.refs[slot] = shot; R.offset[slot * 3] = MUZZLE_OFF[0]; R.offset[slot * 3 + 1] = MUZZLE_OFF[1]; R.offset[slot * 3 + 2] = MUZZLE_OFF[2];
  }
  MUZZLE_OFF[0] = R.offset[slot * 3]; MUZZLE_OFF[1] = R.offset[slot * 3 + 1]; MUZZLE_OFF[2] = R.offset[slot * 3 + 2];
  return closeViewMuzzleWeight(age, S.settle);
}
const MODEL_LIMIT = Object.freeze({ low: 8, balanced: 14, full: 20 });
// Tim, 2026-11-11, in the Deep: props drawn as solid models in the GPU scene (close-view-models.ts
// CLOSE_VIEW_PROP_MODELS), after the creatures and outside their cap: at most `cap` a frame, nearest first. Aperture crystals (the
// overlay's Veiled Inscription and Deep Lattice Relic, violet; the Unseen Crossing, cyan) float `hover` tiles up, bobbing `bob`
// tiles over `bobSec` seconds and turning once in `turnSec` (held still under Reduced Motion), sized by their tier (`scale`). The
// Oculus's dais is always the standard view's blue, turning once in `dais.turnSec`, opening and fading as its 2D mark does
// (`open`, `fade`: oculus.ts OCULUS). The Ember Door and the Deep Stair stand as lit stones. The nearest glowing prop also lights
// the place round it (`light`: reach, strength; `glow`: its colour), taking one of the placed-light slots.
export const CLOSE_VIEW_PROPS = Object.freeze({ version: 1, cap: 6,
  crystal: Object.freeze({ hover: .78, bob: .07, bobSec: 2.6, turnSec: 9, scale: Object.freeze([1, 1, 1.12, 1.3]) }),
  objects: Object.freeze({ apertureMemory: "apertureCrystal", apertureRelic: "apertureCrystal", apertureDoor: "apertureRift", emberDoor: "wayEmber", deepStair: "wayDeep" }),
  dais: Object.freeze({ turnSec: 4, open: .25, fade: .8 }),
  light: Object.freeze({ reach: 2.2, strength: .8, height: .7 }),
  glow: Object.freeze({ apertureCrystal: Object.freeze([.77, .55, 1]), apertureRift: Object.freeze([.5, .9, 1]), oculusDais: Object.freeze([.5, .9, 1]), wayEmber: Object.freeze([.95, .64, .36]), wayDeep: Object.freeze([1, .82, .35]) }) });
// A prop's pose this frame: how high it floats above the floor (lift), its turn (yaw) and its size (scale). Pure.
export function closeViewPropPose(kind, o, now, reduce = false) {
  const P = CLOSE_VIEW_PROPS, t = reduce ? 0 : (Number(now) || 0) / 1000, seed = (((Number(o?.x) || 0) * 7 + (Number(o?.y) || 0) * 13) % 17 + 17) % 17, TAU = Math.PI * 2;
  if (kind === "apertureCrystal" || kind === "apertureRift") { const C = P.crystal;
    return { lift: C.hover + (reduce ? 0 : C.bob * Math.sin((t / C.bobSec + seed / 17) * TAU)), yaw: seed / 17 * TAU + t / C.turnSec * TAU, scale: C.scale[Math.max(0, Math.min(3, Math.floor(Number(o?.visualTier) || 0)))] }; }
  if (kind === "oculusDais") return { lift: 0, yaw: t / P.dais.turnSec * TAU, scale: 1 };
  return { lift: 0, yaw: seed * Math.PI / 2, scale: 1 };
}
// Whether this frame's GPU scene draws the props as models: main.ts then leaves their flat marks off the floor texture.
export const closeViewDrawsProps = () => capturing && closeViewStats.gl === 1;
const MODEL_SHADOW = Object.freeze({ width: .28, length: .8, max: 1.5, alpha: .36 });
const MODEL_TIMING = Object.freeze({ deathMs: 430, attackMs: 260, toolMs: 180, hitSec: .18, contactHoldMs: 44, recoilTiles: .1, walkRadians: 5.4, castMs: ACTION_MOTION.castMs, turnRate: 12, strideSpeed: 4, windupMs: 450 });
const PLAYER_VISUAL_KIND = Object.freeze({
  melee: "player", fist: "playerUnarmed", emitter: "playerTool", hammer: "playerHammerStomp", sweep: "playerSweep",
  mirage: "playerMirage", "orrery-tap": "playerOrrery", "orrery-release": "playerOrrery",
});
function toolCuePointOpen(map,x,y){const w=Number(map?.width)||0,h=Number(map?.height)||0,ix=Math.floor(x),iy=Math.floor(y);if(!Number.isFinite(x)||!Number.isFinite(y)||ix<0||iy<0||ix>=w||iy>=h)return false;const tile=map.tiles?.[iy*w+ix];return !!tile&&!tile.blocked&&dungeonTileVisibility(map,x,y)!=='unseen';}
// Conservative short-segment supercover. At an exact corner both side cells are included; the bounded lane
// rejects geometry requiring more than eight cells rather than sampling past a wall.
export function closeViewCueSegmentOpen(map,ax,ay,bx,by){if(!toolCuePointOpen(map,ax,ay)||!toolCuePointOpen(map,bx,by))return false;const cells=[],add=(x,y)=>{if(cells.some(c=>c[0]===x&&c[1]===y))return true;if(cells.length===8)return false;cells.push([x,y]);return true;},boundary=(x,y)=>Math.abs(ay-by)<1e-10&&Math.abs(ay-Math.round(ay))<1e-10?add(x,y-1):Math.abs(ax-bx)<1e-10&&Math.abs(ax-Math.round(ax))<1e-10?add(x-1,y):true;let x=Math.floor(ax),y=Math.floor(ay),ex=Math.floor(bx),ey=Math.floor(by);const endpoint=(px,py)=>{const ix=Math.floor(px),iy=Math.floor(py);return add(ix,iy)&&(px!==ix||add(ix-1,iy))&&(py!==iy||add(ix,iy-1))&&(px!==ix||py!==iy||add(ix-1,iy-1));};if(!endpoint(ax,ay)||!endpoint(bx,by)||!boundary(x,y))return false;const dx=bx-ax,dy=by-ay,sx=Math.sign(dx),sy=Math.sign(dy),adx=Math.abs(dx),ady=Math.abs(dy);let tx=sx?((sx>0?x+1:x)-ax)/dx:Infinity,ty=sy?((sy>0?y+1:y)-ay)/dy:Infinity,ddx=sx?1/adx:Infinity,ddy=sy?1/ady:Infinity;while(x!==ex||y!==ey){if(Math.abs(tx-ty)<1e-10){if(!add(x+sx,y)||!add(x,y+sy))return false;x+=sx;y+=sy;tx+=ddx;ty+=ddy;}else if(tx<ty){x+=sx;tx+=ddx;}else{y+=sy;ty+=ddy;}if(!add(x,y)||!boundary(x,y))return false;}return cells.every(c=>toolCuePointOpen(map,c[0]+.5,c[1]+.5));}
const toolCueSegmentOpen=closeViewCueSegmentOpen;
const KNOWN_PLAYER_VISUAL = new Set(ATTACK_VISUAL_PROFILES);
const KNOWN_TOOL_VISUAL = new Set(TOOL_VISUAL_KINDS);
export const closeViewToolCueOwnsAction=(acceptedTool,inputAction,selectedAction)=>!!acceptedTool&&inputAction===selectedAction&&['ranged','melee','cast'].includes(selectedAction?.kind);
export function closeViewToolConnectorWithin(muzzle,head,aim){const dx=head.x-muzzle[0],dy=head.y-muzzle[1],dz=head.z-muzzle[2];return dx*(aim?.x||0)+dy*(aim?.y||0)>0&&Math.hypot(dx,dy,dz)<=.9;}
export function closeViewPrimaryWeaponKind(item) {
  return item?.id === 'primary-cinder-pike' || item?.name === 'Cinder Pike' ? 'cinder-pike'
    : item?.id === 'primary-verge-cleaver' || item?.name === 'Verge Cleaver' ? 'verge-cleaver' : 'salvage-blade';
}
const MODEL_STATE = {
  map: null, lastMeleeHit: -Infinity, admitted: new Set(), tracks: new Map(),
  vertices: new Float32Array(((MODEL_LIMIT.full + CLOSE_VIEW_PROPS.cap) * MODEL_MAX_VERTICES + HERO_SLOT_EXTRA_TRIANGLES * 3) * MODEL_FLOATS), glint: new Float32Array(7), glintOn: false, props: 0, // + props (2026-11-11) and the imported hero's suit reservation
  beasts: { count: 0, items: [], tracks: new Map() }, // release 891: skinned world-beast bodies this frame (close-view-beasts.ts)
  playerRepresentation: 'absent', hero: null, heroAsset: null, heroPose: null, heroFrame: null, heroRequested: false,
  heroInput: { tint: new Float32Array([1, 1, 1]), action: null },
  heroAction: { kind: '', profile: '', phase: 0, durationMs: 0, yaw: 0 },
  consumeCurrent:{area:'overworld',areaId:'',levelId:'root'},consumeSample:{active:false,kind:'',itemKind:'',phase:0,elapsedMs:0,remainingMs:0,durationMs:0},
  heroGear: { profile: '', leftSocket: null, rightSocket: null, vialSocket:null,drinkVial:false,vialWeight:0,alpha: 1, tint: null, hitFlash: 0 },
  cleaverTrail: { owner: null, samples: new Float64Array(21), count: 0, visible: false, alpha: 1 },
  toolEmission:new Float32Array(3),toolEmissionReady:false,toolRelease:null,toolAlpha:1,
  // The posed player's held-tool muzzle this frame (imported socket or native recipe point).
  muzzle:new Float32Array(3),muzzleReady:false,nativeMuzzle:new Float32Array(4),
  spellEmission:new Float32Array(3),spellEmissionReady:false,spellRelease:null,spellAlpha:1,
};

// Each sample is the rendered blade's inner and outer points plus its logical time.
// Three samples give at most two quads, with no extra rig samples or draw pass.
function sampleCleaverTrail(trail, owner, socket, now, alpha) {
  const axis = Math.hypot(socket[0], socket[1], socket[2]);
  if (!Number.isFinite(axis) || axis < 1e-6) return;
  const samples = trail.samples;
  if (trail.owner !== owner || (trail.count && now < samples[(trail.count - 1) * 7 + 6])) {
    trail.owner = owner;
    trail.count = 0;
  }
  trail.visible = true;
  trail.alpha = alpha;
  if (trail.count && now === samples[(trail.count - 1) * 7 + 6]) return;
  if (trail.count === 3) { samples.copyWithin(0, 7); trail.count--; }
  const index = trail.count++ * 7;
  for (let i = 0; i < 3; i++) {
    // The gear writer maps the recipe's +Z blade to the socket's +X axis.
    const direction = socket[i] / axis;
    samples[index + i] = socket[12 + i] + direction * .35;
    samples[index + 3 + i] = socket[12 + i] + direction * .87;
  }
  samples[index + 6] = now;
}
export function stillworksWalkerRigPose(map, walker) {
  if (!stillworksCloseView(map) || walker?.kind !== 'voidWalker' || walker.pentFinaleBeast !== 'voidWalker'
      || walker.worldBeast || walker.marine || walker.dead || !(walker.hp > 0) || walker.hidden || walker.gloomVeil
      || walker.untargetable || walker.voidDashing || walker.voidCharging || walker.voidTeleport > 0
      || walker.affixes?.length || walker.eliteWindup > 0 || walker.eliteActive > 0) return null;
  const pack = walker.pack;
  if (!pack?.attack) return !pack?.phase || pack.phase === 'idle' ? { gesture: 0, aim: null } : null;
  if (pack.attack !== 'voidHand' || !['windup', 'recover'].includes(pack.phase)
      || !Number.isFinite(pack.t) || pack.t < 0 || !Number.isSafeInteger(pack.seq) || pack.seq < 1) return null;
  const aim = pack.data?.aim;
  if (!Number.isFinite(aim?.x) || !Number.isFinite(aim?.y) || Math.hypot(aim.x, aim.y) < .01) return null;
  const action = ATTACK_MODULES.voidHand;
  const duration = pack.phase === 'windup' ? action.windup * (pack.paced ? BOSS_PACE.windup : 1) : action.recover;
  const remaining = Math.min(1, pack.t / duration);
  const blend = pack.phase === 'windup' ? 1 - remaining : remaining;
  return { gesture: blend * blend * (3 - 2 * blend), aim, phase: pack.phase, sequence: pack.seq };
}
export function closeViewMonsterAction(who, kind, windupDuration = null, now = 0, actionShape = null) {
  const pack = who.pack;
  const semantic = actorPresentation(who)?.action === 'pack' ? packActionPresentation(who, ATTACK_MODULES, BOSS_PACE.windup, now) : null;
  const legacyCrawler = kind === 'pallidCrawler' && ['bite', 'leapSlam'].includes(semantic?.action);
  if (semantic && !legacyCrawler) return {
    semantic, semanticPose: true, attack: semantic.active || semantic.contact, winding: semantic.winding,
    leapActive: semantic.airborne, packRecovery: semantic.contact, aim: semantic.aim,
    amount: semantic.progress, leapAmount: semantic.airborne ? semantic.progress : null,
    windupAmount: semantic.winding ? semantic.progress : null,
  };
  const ordinaryStrike = who.strike > 0;
  const leapActive = pack?.attack === "leapSlam" && pack.phase === "active";
  const packRecovery = kind === "pallidCrawler" && pack?.phase === "recover" &&
    (pack.attack === "bite" || pack.attack === "leapSlam");
  const winding = foeWindingUp(who);
  const strikeAim = Math.hypot(who.strikeGeometry?.dx || 0, who.strikeGeometry?.dy || 0) > .01
    ? who.strikeGeometry : who.attackAim;
  const aim = ordinaryStrike ? strikeAim
    : winding ? who.meleePhase?.aim || pack?.data?.aim || who.attackAim
    : packRecovery || pack?.phase === "strike" || pack?.phase === "active" ? pack?.data?.aim || who.attackAim
    : null;
  const attack = ordinaryStrike || packRecovery || pack?.phase === "strike" ||
    (pack?.phase === "active" && !leapActive) || who.gateAttack?.phase === "strike" || who.gateAttack?.phase === "active";
  let amount = null;
  if (ordinaryStrike) {
    const recovery = 1 - Math.min(1, who.strike * 1000 / ACTION_MOTION.monsterStrikeMs);
    amount = ACTION_MOTION.monsterContact + (1 - ACTION_MOTION.monsterContact) * recovery;
  } else if (packRecovery) {
    const recoveryDuration = ATTACK_MODULES[pack.attack].recover;
    const recovery = 1 - Math.min(1, Math.max(0, Number(pack.t) || 0) / recoveryDuration);
    amount = ACTION_MOTION.monsterContact + (1 - ACTION_MOTION.monsterContact) * recovery;
  }
  const leapAmount = leapActive
    ? 1 - Math.min(1, Math.max(0, Number(pack.t) || 0) / ATTACK_MODULES.leapSlam.active)
    : null;
  let windupAmount = null;
  if (winding && Number.isFinite(windupDuration) && windupDuration > 0 && who.telegraph > 0)
    windupAmount = 1 - Math.min(1, Math.max(0, who.telegraph) / windupDuration);
  if (actorPresentation(who)?.action === 'foundry') {
    const shape = winding ? actionShape : who.strikeGeometry?.kind;
    const melee = !!shape || !!who.meleePhase || who.range < 2.5;
    const family = shape === 'stab' ? 'stab' : shape === 'slam' ? 'slam' : melee ? 'sweep' : 'ranged';
    const phase = winding ? 'windup' : attack ? 'recover' : 'idle';
    return { attack, winding, aim, amount, windupAmount, semanticPose: winding || attack,
      semantic: { action: who.meleePhase?.id || who.foundryAttack || 'meleeSwipe', family, phase,
        progress: winding ? windupAmount ?? 0 : attack ? 1 - Math.min(1, who.strike * 1000 / ACTION_MOTION.monsterStrikeMs) : 0 } };
  }
  return { attack, winding, leapActive, packRecovery, aim, amount, leapAmount, windupAmount, semantic };
}
export function closeViewPlayerAction(g, now) {
  const player = g?.player;
  if (!player) return { active: false, legacy: false, record: null, profile: null, amount: 0, aim: null };
  const hasRecord = player.attackVisual != null;
  const record = hasRecord ? normalizeAttackVisual(player.attackVisual) : null;
  const until = attackVisualDeadline(player, record, { now, effects:g.effects, pendingToolUse:g.pendingToolUse });
  const cancelled = record?.presentationCancelled === true;
  const active = !!record && !cancelled && until > now;
  const legacy = !hasRecord && !cancelled && player.attackUntil > now;
  const amount = active ? 1 - Math.min(1, Math.max(0, until - now) / record.durationMs) : 0;
  return { active, legacy, record, until, profile: active ? record.profile : null, amount, aim: active ? record.aim || null : null };
}
// Renderer-only entry heading: accepted aim and release timing remain owned by Game.
// A new/reloaded track has no truthful entry pose, so it starts on the committed aim.
export function closeViewToolFacingYaw(track, action) {
  const v = action?.record, use = v?.toolUse, aim = v?.aim;
  if (!action?.active || !KNOWN_TOOL_VISUAL.has(v?.toolKind) || use?.v !== 1 ||
      (use.phase !== 'startup' && use.phase !== 'released') || !Number.isFinite(use.startupMs) || use.startupMs <= 0 ||
      !Number.isFinite(action.amount) || !Number.isFinite(v.durationMs) || v.durationMs <= 0 ||
      !aim || !Number.isFinite(aim.x) || !Number.isFinite(aim.y) || !Math.hypot(aim.x, aim.y)) return NaN;
  const goal = Math.atan2(aim.y, aim.x);
  if (!track || !Number.isFinite(track.yaw)) return goal;
  if (track.toolFacingId !== use.id) { track.toolFacingId = use.id; track.toolFacingEntry = track.yaw; }
  if (use.phase === 'released') return goal;
  const elapsed = Math.max(0, Math.min(v.durationMs, action.amount * v.durationMs));
  const t = Math.min(1, elapsed / use.startupMs), blend = t * t * (3 - 2 * t);
  return wrap(track.toolFacingEntry + wrap(goal - track.toolFacingEntry) * blend);
}
export function resolveCloseViewPlayerFacing(trackYaw, desiredYaw, { elapsed = 0, snap = false, stunned = false, overrideYaw = NaN, transient = false } = {}) {
  let displayedYaw = trackYaw;
  if (!stunned) displayedYaw = snap ? desiredYaw : wrap(trackYaw + wrap(desiredYaw - trackYaw) * (1 - Math.exp(-Math.max(0, elapsed) * MODEL_TIMING.turnRate)));
  if (Number.isFinite(overrideYaw)) displayedYaw = overrideYaw;
  return { desiredYaw: wrap(desiredYaw), displayedYaw: wrap(displayedYaw), transient: !!transient };
}
// Release 887: world beasts with a skinned Close View body (close-view-beasts.ts). Nearest first, up to BEAST_SLOT.maxBeasts;
// each admitted beast's billboard is suppressed (its floor effects and telegraphs stay where they are drawn now). A slain
// beast's track plays its death to the end from where it fell. Render-only: nothing here touches the game.
const BEAST_FADE = 2.4, BEAST_TARGET = { x: 0, y: 0 }, BEAST_ENV = { x: 0, y: 0, z: 0, scale: 1, now: 0, reduce: false, tier: 'full', target: BEAST_TARGET, dead: false };
function admitBeasts(g, draws, n, Q, now, reduce) {
  const B = MODEL_STATE.beasts, tier = Q.glScale === 1 ? 'full' : Q.relief ? 'balanced' : 'low';
  B.count = 0; if (B.map !== g.map) { B.map = g.map; B.tracks.clear(); }
  BEAST_TARGET.x = g.player.x; BEAST_TARGET.y = g.player.y;
  for (let oi = n - 1; oi >= 0 && B.count < BEAST_SLOT.maxBeasts; oi--) {
    const it = order[oi], foe = itemKind[it] === 1 ? boardFoe[it] : null;
    if (!foe || MODEL_STATE.admitted.has(it) || !closeViewBeastEligible(foe, g) || draws[itemRef[it]]?.enemy !== foe) continue;
    const spec = CLOSE_VIEW_BEASTS[foe.kind]; if (!prepareCloseViewBeastMesh(spec.mesh(tier, foe))) continue;
    let track = B.tracks.get(foe); if (!track) { track = spec.createTrack(); B.tracks.set(foe, track); }
    // the standard view's own scale (u = tile x scale), times the beast's Close View presentation factor
    BEAST_ENV.x = boardWX[it]; BEAST_ENV.y = boardWY[it]; BEAST_ENV.z = surfaceZ(g.map, foe.x + .5, foe.y + .75); BEAST_ENV.scale = Math.max(.6, Number(foe.scale) || 1) * (spec.scale || 1);
    BEAST_ENV.now = now; BEAST_ENV.reduce = reduce; BEAST_ENV.tier = tier; BEAST_ENV.dead = false;
    const frame = spec.sample(track, foe, BEAST_ENV); if (!frame) continue;
    // A beast stands solid through most of the distance fade ordinary creatures take (pass 3, 2026-11-11: a boss the height of
    // a house that thins at mid range loses its scale); it still fades out at the fog's edge.
    frame.alpha *= Math.max(0, Math.min(1, (boardB[it] ?? 1) * BEAST_FADE)); track.seen = now;
    B.items[B.count++] = frame; MODEL_STATE.admitted.add(it);
  }
  for (const [foe, track] of B.tracks) {
    if (track.seen === now) continue;
    if (foe.dead && B.count < BEAST_SLOT.maxBeasts && track.seen != null && now - track.seen < 4000) {
      const spec = CLOSE_VIEW_BEASTS[foe.kind]; BEAST_ENV.now = now; BEAST_ENV.reduce = reduce; BEAST_ENV.tier = tier; BEAST_ENV.dead = true;
      const frame = spec.mesh(tier, foe) && prepareCloseViewBeastMesh(spec.mesh(tier, foe)) ? spec.sample(track, foe, BEAST_ENV) : null;
      if (frame) { B.items[B.count++] = frame; continue; }
    }
    if (foe.dead || now - (track.seen ?? -Infinity) > 120) B.tracks.delete(foe);
  }
}
// Read-only, for tests and the lab: this frame's admitted beast frames and their render tracks.
export const closeViewBeasts = () => MODEL_STATE.beasts;
// A soft contact shadow under each admitted beast and a darker print under each planted foot, on the ground layer.
function drawBeastShadows(gc, s) {
  const B = MODEL_STATE.beasts;
  for (let i = 0; i < B.count; i++) {
    const f = B.items[i], k = Math.max(0, f.shadow) * f.alpha, r = .42 * f.scale * s;
    gc.fillStyle = `rgba(4,6,10,${(.42 * k).toFixed(3)})`; gc.beginPath(); gc.ellipse(f.x * s, f.y * s, r, r * .62, f.yaw, 0, Math.PI * 2); gc.fill();
  }
}
function buildActorModels(g, draws, n, Q, now, reduce) {
  now = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now;
  const state = MODEL_STATE, player = g.player, limit = Q.glScale === 1 ? MODEL_LIMIT.full : Q.relief ? MODEL_LIMIT.balanced : MODEL_LIMIT.low;
  const form = playerFormPresentation(g);
  const importedPlayer = !form || form.kind === 'playerIronFists' || form.kind === 'playerPowerSuit';
  state.admitted.clear();
  state.playerRepresentation=capturedPlayer?'billboard':'absent';state.hero = null;state.toolEmissionReady=false;state.toolRelease=null;state.spellEmissionReady=false;state.spellRelease=null;state.muzzleReady=false;
  state.cleaverTrail.visible = false;
  if (importedPlayer && !state.heroRequested && typeof globalThis.Image === 'function') {
    state.heroRequested = true;
    loadCloseViewHero().catch(() => null); // Existing model remains until data and GPU texture are ready.
  }
  closeViewGLStats.modelFallbacks = Object.create(null);
  if (state.map !== g.map) { state.map = g.map; state.tracks.clear(); state.lastMeleeHit = -Infinity; state.heroPose = null; state.cleaverTrail.count = 0; }
  if (!reduce && player.meleeUntil > now) {
    for (let it = 0; it < n; it++) {
      const foe = itemKind[it] === 1 && boardFoe[it], prior = foe && state.tracks.get(foe);
      if (prior && foe.hp < prior.hp && foe.recoil > 0) { state.lastMeleeHit = now; break; }
    }
  }
  let offset = 0, count = 0;
  const append = (actor) => {
    if (count >= limit) return false;
    const next = writeCloseViewModel(state.vertices, offset, actor);
    if (next === offset) return false;
    offset = next; count++;
    return true;
  };
  const admit = (it, who, kind) => {
    const d = draws[itemRef[it]], facing = FACING_VEC[who.ai?.facing || who.facing], pack = who.pack;
    const presentation = who === player ? null : actorPresentation(who);
    const walkerRig = kind === 'voidWalker' ? stillworksWalkerRigPose(g.map, who) : null;
    const monsterAction = who === player ? null : closeViewMonsterAction(who, kind, d.nativeWindup, now, d.nativeActionShape);
    const playerAction = who === player ? closeViewPlayerAction(g, now) : null;
    const toolFacingYaw = who === player ? closeViewToolFacingYaw(state.tracks.get(who), playerAction) : NaN;
    const visualRecord = playerAction?.record, visualAttack = !!playerAction?.active;
    const attack = !!playerAction?.legacy || visualAttack || who !== player && (who.attackUntil > now || !!monsterAction?.attack);
    const stunned = who === player && now < (player.stunnedUntil || 0);
    const watched = who.kind === 'weepingSaint' && who.watched && !who.pack?.attack;
    let track = state.tracks.get(who);
    if (!track) track = { x: who.x, y: who.y, yaw: facing ? Math.atan2(facing[1], facing[0]) : CAM.yaw,
      phase: Number.isFinite(who.walkPhase) ? who.walkPhase * Math.PI : 0, pace: 0, at: now,
      hitAt: -Infinity, hp: who.hp, deathAt: null, actor: null, winding: false, attacking: false };
    const dx = who.x - track.x, dy = who.y - track.y, dist = Math.hypot(dx, dy);
    const elapsed = Math.max(0, Math.min(.1, (now - track.at) / 1000));
    const visualProfile = visualAttack ? visualRecord.profile : null;
    const acceptedTool = visualAttack && KNOWN_TOOL_VISUAL.has(visualRecord?.toolKind) ? visualRecord.toolKind : null;
    const fisting = who === player && (visualProfile === 'fist' || playerAction?.legacy && !!g.fistsEquipped?.());
    const castRecord=who===player?player.castVisual:null;
    const cast = who === player && player.castUntil > now && (!castRecord||castRecord.cancelled!==true);
    const fallAir = who === player ? ordinaryFallPresentation(g, now, closeViewActorLift(d)) : null; // FALL: the falling pose (game.ts FALL.pose)
    const jump = who === player && g.jumpUntil > now || !!fallAir || !!monsterAction?.leapActive;
    const charge = who === player && !attack && !cast && !jump && g.fistCharge ? fistCharge(Math.max(0, now - g.fistCharge.start) / 1000) : null;
    const knownProfile = visualProfile && KNOWN_PLAYER_VISUAL.has(visualProfile);
    const tool = who === player && attack && (visualProfile ? visualProfile === "emitter" || !!acceptedTool : !(player.meleeUntil > now));
    const winding = !!monsterAction?.winding;
    const aim = charge != null ? g.fistCharge.direction || g.save.lastAim : who === player && attack ? visualRecord?.aim || (tool ? g.save.lastAim : player.meleeStrike) : cast ? castRecord?.aim||g.save.lastAim
      : who === player ? closeViewIdleLockAim(g, now) : monsterAction?.aim;
    const importedDodge=who===player&&importedPlayer&&now<(player.dodgeUntil||0),dodgeSeed=importedDodge?player.dodgeVisual:null,leavingImportedDodge=!importedDodge&&who===player&&track.dodgeUntil===player.dodgeUntil;
    let targetYaw = track.yaw;
    if (!stunned && dist > .005) targetYaw = Math.atan2(dy, dx);
    else if (!stunned && facing) targetYaw = Math.atan2(facing[1], facing[0]);
    const committedAim = walkerRig?.aim || aim;
    const ax = committedAim?.dx ?? committedAim?.x, ay = committedAim?.dy ?? committedAim?.y;
    if (!stunned && Math.hypot(ax || 0, ay || 0) > .01) targetYaw = Math.atan2(ay, ax);
    const yawDelta = Math.atan2(Math.sin(targetYaw - track.yaw), Math.cos(targetYaw - track.yaw));
    const turn = Math.max(-1, Math.min(1, yawDelta));
    if (who === player) {
      const resolved = resolveCloseViewPlayerFacing(track.yaw, targetYaw, { elapsed, snap: attack || charge != null || dist > 3, stunned, overrideYaw: importedDodge && Number.isFinite(dodgeSeed?.facingYaw) ? dodgeSeed.facingYaw : stunned ? NaN : toolFacingYaw, transient: stunned || attack || cast || jump || charge != null || importedDodge });
      targetYaw = resolved.desiredYaw; track.yaw = resolved.displayedYaw;
    } else if (!stunned && (attack || winding || walkerRig?.aim || charge != null || monsterAction?.leapActive || dist > 3)) track.yaw = targetYaw;
    else if (stunned) targetYaw = track.yaw;
    else track.yaw += yawDelta * (1 - Math.exp(-elapsed * MODEL_TIMING.turnRate));
    if(importedDodge&&Number.isFinite(dodgeSeed?.gaitPhase)){track.dodgeUntil=player.dodgeUntil;track.phase=dodgeSeed.gaitPhase;track.pace=Math.max(0,Math.min(1,(Number(dodgeSeed.speed)||0)/MODEL_TIMING.strideSpeed));}
    else if (!leavingImportedDodge&&!stunned && dist < 3) track.phase = (track.phase + dist * MODEL_TIMING.walkRadians) % (Math.PI * 2);
    const speed = !stunned && !watched && elapsed > 0 && dist < 3 ? Math.min(1, dist / elapsed / MODEL_TIMING.strideSpeed) : 0;
    // Presentation lean (+ accelerating, - stopping). Held between renders: a same-time re-render
    // (no elapsed time) cannot invent a stop, and an imported dodge keeps the lean it started from
    // (the roll clip blends over it), so accepted phase zero reproduces the previous pose exactly.
    if (!Number.isFinite(track.lean) || elapsed > 0 && !importedDodge && !leavingImportedDodge) track.lean = Math.max(-1, Math.min(1, (speed - track.pace) * 1.6));
    if (stunned || watched) track.pace = 0;
    else if(!importedDodge&&!leavingImportedDodge)track.pace += (speed - track.pace) * (1 - Math.exp(-elapsed * 14));
    if(leavingImportedDodge)track.dodgeUntil=null;
    if (who.hp < track.hp) track.hitAt = now;
    const hit = Math.max(0, Math.min(1, Math.max(who.hitFlash || 0, MODEL_TIMING.hitSec - (now - track.hitAt) / 1000) / MODEL_TIMING.hitSec));
    if (winding && !track.winding) track.windAt = now;
    if (attack && !track.attacking) track.attackAt = now;
    const defeat = who === player ? ordinaryDefeatPresentation(g, now) : null;
    const knock = stunned && !defeat ? knockdownPose(now - (player.stunnedAt || now), (player.stunnedUntil || now) - (player.stunnedAt || now), reduce) : null;
    const profilePose = fisting ? 'fist' : visualProfile?.startsWith("orrery-") ? "cast" : tool ? "tool" : "attack";
    const ordinary = who === player && (!form || form.kind === 'playerIronFists') && !g.save.boat?.aboard && !g.mountRide?.();
    let hurtPhase = null;
    if (ordinary && player.hurtVisual?.v === 1 && !defeat && !stunned && !attack && !cast && !jump &&
        charge == null && !(now < (player.dodgeUntil || 0))) {
      const logicalNow = (g.paused && finite(g.pauseStarted) ? g.pauseStarted : now) - (g.presentationPausedMs || 0);
      hurtPhase = sampleHurtVisual(player.hurtVisual, logicalNow, g.areaId(), String(g.map?.levelId || 'root'));
    }
    const bodyHit = ordinary ? hurtPhase !== null : hit > 0;
    let pose = defeat ? "death" : stunned ? "knockdown" : presentation?.stagger ? "idle" : bodyHit ? "hit" : monsterAction?.semanticPose ? 'semantic' : attack ? profilePose : charge != null ? 'fistCharge' : cast ? "cast" : winding ? "windup" : jump ? "jump" : track.pace > .01 ? "walk" : "idle";
    let drink=null;
    if (who === player && (!form || form.kind === 'playerIronFists') &&
        (pose === 'idle' || pose === 'walk') && player.consumeVisual?.v === 1 && !player.consumeVisual.cancelled) {
      const receipt = player.consumeVisual;
      const logicalNow = (g.paused && finite(g.pauseStarted) ? g.pauseStarted : now) - (g.presentationPausedMs || 0);
      if (logicalNow >= receipt.acceptedLogicalMs && logicalNow < receipt.acceptedLogicalMs + receipt.durationMs) {
        const current = state.consumeCurrent;
        current.area = g.area;
        current.areaId = g.areaId();
        current.levelId = String(g.map?.levelId || 'root');
        drink = sampleConsumeVisual(receipt, logicalNow, current, state.consumeSample);
        if (drink?.active) pose = 'drink';
      }
    }
    let pickupPhase=null;
    const interactionKind=who===player?player.cachePickupVisual?.cacheKind:null;
    const openingChest=interactionKind==='chest';
    const shovelProfile=interactionKind==='shovelDig'?'shovel-dig':interactionKind==='ironShovelDig'?'iron-shovel-dig':null;
    const placingStone=interactionKind==='stonePlace';
    if(ordinary&&(pose==='idle'||pose==='walk')&&player.cachePickupVisual?.v===1&&!(now<(player.dodgeUntil||0))){
      const logicalNow=(g.paused&&finite(g.pauseStarted)?g.pauseStarted:now)-(g.presentationPausedMs||0);
      pickupPhase=sampleCachePickupVisual(player.cachePickupVisual,logicalNow,g.areaId(),String(g.map?.levelId||'root'));
      if(pickupPhase!==null)pose=placingStone?'placeStone':shovelProfile?'shovelDig':openingChest?'openChest':'collect';
    }
    const meleeRoute=closeViewMeleeVisualRoute(visualRecord,visualAttack),meleeAction=meleeRoute.meleeAction;
    const poseTime = who === player && !meleeAction && !primaryVisualStage(visualRecord) && now - state.lastMeleeHit < MODEL_TIMING.contactHoldMs ? state.lastMeleeHit : now;
    let amount = 0;
    if (winding) amount = monsterAction?.windupAmount ?? Math.min(1, (now - track.windAt) / MODEL_TIMING.windupMs);
    if (attack) {
      if (visualAttack) amount = poseTime === now ? playerAction.amount : 1 - Math.min(1, (playerAction.until - poseTime) / visualRecord.durationMs);
      else if (monsterAction?.amount != null) amount = monsterAction.amount;
      else {
        const duration = tool ? MODEL_TIMING.toolMs : who === player ? ACTION_MOTION.meleeMs : MODEL_TIMING.attackMs;
        amount = who.attackUntil > poseTime ? 1 - Math.min(1, (who.attackUntil - poseTime) / duration) : Math.min(1, (poseTime - track.attackAt) / duration);
      }
    } else if (cast) amount = 1 - Math.min(1, (player.castUntil - now) / MODEL_TIMING.castMs);
    else if (jump) amount = monsterAction?.leapAmount != null
      ? monsterAction.leapAmount
      : 1 - Math.min(1, (g.jumpUntil - now) / (g.jumpDur || 420));
    if (hurtPhase !== null) amount = Math.sin(Math.PI * hurtPhase) * (reduce ? .65 : 1);
    else if (bodyHit) amount = hit;
    if(drink?.active)amount=drink.phase;
    if(pickupPhase!==null)amount=pickupPhase;
    if (charge != null && !bodyHit) amount = charge;
    if (stunned && !defeat) amount = Math.max(0, Math.min(1, -knock.angle / (Math.PI / 2)));
    if (defeat) amount = defeat.amount;
    const recoil = reduce || who === player ? 0 : MODEL_TIMING.recoilTiles * Math.min(1, (who.recoil || 0) / MODEL_TIMING.hitSec);
    const acceptedPrimary=visualProfile==='melee'&&['salvage-blade','cinder-pike','verge-cleaver'].includes(visualRecord?.weaponKind)?visualRecord.weaponKind:null,currentPrimary=closeViewPrimaryWeaponKind(g.save.equipment?.primary),primaryHeld=visualAttack&&visualProfile==='melee'?acceptedPrimary||'melee':currentPrimary;
    const held = visualAttack ? visualProfile==='melee'?primaryHeld:visualProfile==='hammer'?'':acceptedTool || (knownProfile ? visualProfile : 'fist') : g.save.activeWeaponSlot === 'secondary' && charge == null ? 'emitter' : form?.fists && !form.empowered ? 'fist' : primaryHeld;
    const primaryStage=who===player?primaryCarryStage(visualRecord,player.primaryCombo,visualAttack&&acceptedPrimary==='verge-cleaver'):null;
    let cleaverFrame=null;
    if(ordinary&&held==='verge-cleaver'&&now>=(player.dodgeUntil||0)&&(pose==='attack'||pose==='idle'||pose==='walk')){
      const logicalNow=(g.paused&&finite(g.pauseStarted)?g.pauseStarted:now)-(g.presentationPausedMs||0);
      cleaverFrame=meleeRoute.legacyCleaverFrame?sampleCleaverChoreography(visualRecord,logicalNow):null;
      if(!cleaverFrame&&meleeAction?.v!==2&&(!primaryStage||visualRecord?.cleaverChoreography?.retired===true))cleaverFrame=cleaverCarryFrame();
    }
    const activeKind = who===player&&held==='cinder-pike'?'playerCinderPike':who===player&&held==='verge-cleaver'?'playerVergeCleaver':visualAttack ? knownProfile ? PLAYER_VISUAL_KIND[visualProfile] : "playerUnarmed" : null;
    // Special native forms retain their existing tool recipe. Only the normal imported
    // stomp (and its normal native fallback) has empty held gear in this pass.
    const formKind = who === player && form ? playerFormModelKey(form, visualProfile==='hammer'?'hammer':held) : null;
    const actor = { kind: (pose==='shovelDig'?'playerShovel':formKind) || activeKind || (tool || (who === player && g.save.activeWeaponSlot === "secondary" && !attack && !cast) ? "playerTool" : presentation?.modelKey || kind),
      x: boardWX[it] - recoil * Math.cos(track.yaw), y: boardWY[it] - recoil * Math.sin(track.yaw), z: surfaceZ(g.map, who.x + .5, who.y + .75) + closeViewActorLift(d, true) + (presentation?.bodyLift || 0), yaw: track.yaw,
      phase: watched ? 0 : track.phase + ((presentation?.bodyLift > 0 || presentation?.action === 'pack' && ['hover', 'fly', 'phase'].includes(who.movement)) && !reduce ? now / 500 : 0), pace: track.pace, pose, amount, turn: stunned || watched ? 0 : turn, reduceMotion: reduce,
      scale: who === player && form ? form.scale : presentation?.scale ?? 1, stagger: presentation?.stagger || 0,
      primaryStep: visualRecord?.primaryStep, primaryMotion: visualRecord?.primaryMotion, primaryStage, meleeAction, cleaverFrame,
      jumpAir: who===player&&pose==='jump'?ordinaryJumpPresentation(g,now,d.jumpLift,d.jumpBaseMs):null,
      toolAction: who===player&&visualAttack&&acceptedTool&&visualRecord?.toolUse&&!stunned&&!bodyHit&&now>=(player.dodgeUntil||0)?visualRecord:null,
      fistStep: charge != null ? g.fistCharge.step || 1 : visualRecord?.fistStep,
      fistLead: charge != null ? (g.fistCharge.step > 1 ? g.fistCombo?.lead : g.save.fistOpeningHand === 'right' ? 'left' : 'right') : visualRecord?.fistLead,
      effectTime: now,
      walkerGesture: walkerRig?.gesture,
      palette: presentation?.palette,
      watched,
      action: presentation?.stagger ? null : monsterAction?.semantic?.action,
      actionFamily: presentation?.stagger ? null : monsterAction?.semantic?.family,
      actionPhase: presentation?.stagger ? 'stunned' : monsterAction?.semantic?.phase,
      actionProgress: monsterAction?.semantic?.progress || 0,
      alpha: Math.max(0, Math.min(1, (d.alpha ?? 1) * (who === player ? 1 : closeViewCreatureIntrinsicAlpha(who) * boardB[it]))),
      attachments: who.affixes?.includes('droneSwarm') ? Array.from({ length: 3 }, (_, i) => { const at = dronePos(who, i, now / 1000); return { ...at, z: surfaceZ(g.map, at.x, at.y) + projectileVisualHeight(who, 'drone'), color: 0xc8ff7a }; }) : null,
      poison: who === player && g.save.elites?.status?.poison > 0, muzzleOut: who === player ? state.nativeMuzzle : null };
    if (pose === 'jump' && !actor.jumpAir && fallAir) actor.jumpAir = fallAir; // FALL: the falling pose (the jump's hang, legs reaching down near the ground)
    if (who === player) { CAM.bodyYaw = actor.yaw; CAM.bodyDesiredYaw = targetYaw; CAM.bodyTransient = stunned || hit > 0 || attack || cast || jump || charge != null || importedDodge; }
    track.winding = winding;
    track.attacking = attack;
    let imported = false;
    if (who === player && importedPlayer && count < limit) {
      const asset = getCloseViewHeroAsset();
      if (asset && prepareCloseViewHeroGL(asset)) {
        if (state.heroAsset !== asset || !state.heroPose) {
          state.heroAsset = asset; state.heroPose = createHeroPoseState(asset); state.heroFrame = createHeroFrame(asset);
        }
        const input = state.heroInput, action = state.heroAction;
        input.nowMs = poseTime - (g.presentationPausedMs || 0); input.reducedMotion = reduce;
        input.x = actor.x; input.y = actor.y;
        input.groundZ = surfaceZ(g.map, who.x + .5, who.y + .75);
        input.liftZ = closeViewActorLift(d, true); input.yaw = actor.yaw;
        input.height = 1.68 * .82; input.speed = track.pace * MODEL_TIMING.strideSpeed; input.gaitPhase = track.phase;
        input.powerSuit = form?.kind === 'playerPowerSuit';
        input.wayfarerKit = !form || form.kind === 'playerIronFists' || form.kind === 'playerPowerSuit'; // the standard kit, or the suit's helmet and pack
        input.accel = ordinary ? track.lean : 0;
        input.turn = ordinary && (pose === 'idle' || pose === 'walk') ? turn : 0;
        input.hurtFront = NaN; input.hurtSide = NaN;
        if (ordinary && hurtPhase !== null) { // flinch away from the nearest live foe (presentation only)
          let best = 9, fx = 0, fy = 0; for (const e of g.enemies || []) { if (!(e?.hp > 0)) continue; const ex = e.x - who.x, ey = e.y - who.y, dd = ex * ex + ey * ey; if (dd < best && dd > 1e-6) { best = dd; fx = ex; fy = ey; } }
          if (best < 9) { const l = Math.sqrt(best), c = Math.cos(actor.yaw), sn = Math.sin(actor.yaw); input.hurtFront = (fx * c + fy * sn) / l; input.hurtSide = (-fx * sn + fy * c) / l; }
        }
        input.landing = ordinary && (pose === 'idle' || pose === 'walk') ? (ordinaryLandingPresentation(g, now) ?? NaN) : NaN; // touchdown absorb, only with no other action
        if (visualAttack && visualProfile === 'fist') { if (Number.isFinite(visualRecord?.fistSpeed)) input.speed = visualRecord.fistSpeed; if (Number.isFinite(visualRecord?.fistGaitPhase)) input.gaitPhase = visualRecord.fistGaitPhase; }
        // Empty gear retains Hammerfall carry; accepted tools retain their flattened base pose.
        input.heldProfile=visualProfile==='hammer'?(g.save.activeWeaponSlot==='secondary'?'emitter':currentPrimary):acceptedTool&&visualRecord?.toolMotion?.v===1?visualRecord.toolMotion.baseKind:held;
        input.primaryCarryStage=primaryStage;input.handProfile=held;input.cleaverFrame=cleaverFrame;
        input.alpha = actor.alpha; input.hitFlash = hit;
        input.tint[0] = actor.poison ? .72 : 1; input.tint[1] = 1; input.tint[2] = actor.poison ? .65 : 1;
        action.kind = ''; action.profile = acceptedTool || (visualProfile === 'melee' && ['cinder-pike','verge-cleaver'].includes(held) ? held : visualProfile || held); action.phase = amount; action.poseMs = undefined; action.primaryStep = visualRecord?.primaryStep; action.primaryMotion=visualRecord?.primaryMotion; action.fistStep = undefined; action.fistLead = undefined; action.fistCharge = undefined; action.toolKind=visualRecord?.toolKind;action.toolMotion=visualRecord?.toolMotion;action.toolUse=visualRecord?.toolUse;
        action.durationMs = visualRecord?.durationMs || (tool ? MODEL_TIMING.toolMs : ACTION_MOTION.meleeMs); action.yaw = actor.yaw;
        action.primaryStage = primaryStage; action.jumpAir = null;
        if (defeat) { action.kind = 'death'; action.profile = 'death'; action.phase = defeat.amount; action.durationMs = defeat.durationMs; }
        else if (stunned) { action.kind = 'hit'; action.profile = 'knockdown'; }
        else if (now < (player.dodgeUntil || 0)) {
          action.kind = 'dodge'; action.durationMs = 260;
          action.phase = 1 - Math.min(1, (player.dodgeUntil - now) / action.durationMs);
          const visual=player.dodgeVisual;if(Number.isFinite(visual?.facingYaw))action.yaw=visual.facingYaw;
          action.moveX=player.dodgeX||0;action.moveY=player.dodgeY||0;
          action.poseMs=Number.isFinite(visual?.poseMs)?visual.poseMs:input.nowMs;
          input.speed=Number.isFinite(visual?.speed)?visual.speed:visual?.moving?2.4:0;input.gaitPhase=Number.isFinite(visual?.gaitPhase)?visual.gaitPhase:0;
        } else if (bodyHit) {
          action.kind = 'hit';
          action.phase = hurtPhase ?? 1 - hit;
          if (ordinary) action.profile = 'hurt';
          action.durationMs = ordinary ? HURT_VISUAL_MS : MODEL_TIMING.hitSec * 1000;
        }
        else if (attack) { action.kind = visualProfile?.startsWith('orrery-') ? 'cast' : acceptedTool==='great-sweep' ? 'melee' : tool || visualProfile === 'mirage' ? 'ranged' : 'melee'; if (action.kind === 'melee' && (['cinder-pike','verge-cleaver'].includes(action.profile) || action.profile === 'fist' || action.profile === 'hammer')) { if (Number.isFinite(visualRecord?.poseMs)) action.poseMs = visualRecord.poseMs; if (action.profile === 'fist') { action.fistStep = visualRecord?.fistStep; action.fistLead = visualRecord?.fistLead; action.fistCharge = visualRecord?.fistCharge; } if (Number.isFinite(visualRecord?.facingYaw)) action.yaw=closeViewPlayerFacingYaw(g,now,actor.yaw,{phase:amount,importedReady:true}); } }
        else if (charge != null) { action.kind = 'melee'; action.profile = 'fistCharge'; action.phase = charge; action.poseMs=now-(g.presentationPausedMs||0); action.fistStep = g.fistCharge.step || 1; action.fistLead = actor.fistLead; action.fistCharge = charge; }
        else if (cast) { action.kind = 'cast'; action.profile=castRecord?.profile||'cast'; action.durationMs = castRecord?.durationMs||MODEL_TIMING.castMs; }
        else if (jump) { action.kind = 'jump'; action.durationMs = g.jumpDur || 420; action.jumpAir = ordinaryJumpPresentation(g, now, d.jumpLift, d.jumpBaseMs) ?? fallAir; }
        else if(drink?.active){action.kind='drink';action.profile=drink.itemKind;action.phase=drink.phase;action.durationMs=drink.durationMs;}
        else if(pickupPhase!==null){action.kind='interact';action.profile=placingStone?'stone-place':shovelProfile||(openingChest?'chest-open':'cache-pickup');action.phase=pickupPhase;action.durationMs=player.cachePickupVisual.durationMs;}
        action.meleeAction = action.kind === 'melee' && attack ? meleeAction : null;
        // Generic primaries retain their accepted logical breathing phase at both blend endpoints.
        if (action.kind === 'melee' && action.profile === 'melee' && Number.isFinite(visualRecord?.poseMs)) action.poseMs = visualRecord.poseMs;
        input.action = action.kind ? action : null;
        if (sampleCloseViewHero(asset, state.heroPose, input, state.heroFrame) && state.heroFrame.ready) {
          CAM.bodyYaw = action.yaw;
          const gear = state.heroGear;
          gear.profile = action.kind==='interact'&&shovelProfile?shovelProfile:form?.empowered && held === 'fist' ? '' : held==='emitter'?importedEmitterAppearance(visualRecord,visualAttack?null:rangedWeapon(g.save.equipment?.secondary),visualAttack):held; gear.primaryStage=primaryStage; gear.leftSocket = state.heroFrame.leftSocket; gear.rightSocket = state.heroFrame.rightSocket;
          gear.drinkVial=action.kind==='drink'&&!state.heroFrame.powerSuit;gear.vialWeight=gear.drinkVial?state.heroPose.weight:0;gear.vialSocket=state.heroFrame[cleaverHandRoles(held,primaryStage).free];
          gear.alpha = actor.alpha; gear.tint = input.tint; gear.hitFlash = hit;
          const equipped = writeCloseViewHeroEquipment(state.vertices, offset, gear, state.heroFrame);
          if (state.heroFrame.powerSuit && equipped === offset) return;
          if (!reduce && equipped > offset && action.kind === 'melee' && held === 'verge-cleaver' && meleeAction?.kind === 'verge-cleaver') {
            const sinceContact = amount * meleeAction.durationMs - meleeAction.contactMs;
            const grip = state.heroFrame[cleaverHandRoles(held, primaryStage).grip];
            if (grip && sinceContact >= -40 && sinceContact <= 100) {
              sampleCleaverTrail(state.cleaverTrail, player.attackVisual, grip, now, actor.alpha);
            }
          }
          offset = writeCloseViewHeroKit(state.vertices, equipped, gear, state.heroFrame);
          const right=state.heroFrame[cleaverHandRoles(held,primaryStage).grip],rx=right?.[12],ry=right?.[13],rz=right?.[14];
          if(actor.alpha>0&&closeViewHeldMuzzlePoint(state.muzzle,gear.profile,right))state.muzzleReady=true;
          // Only the final selected tool action owns its cue. The validated authored muzzles extend .611–.652 tiles from this bounded socket.
          // A hit still hides the transient muzzle cues even when the accepted tool owns the body pose.
          if(!hit&&closeViewToolCueOwnsAction(acceptedTool,input.action,action)&&Number.isFinite(rx)&&Number.isFinite(ry)&&Number.isFinite(rz)&&Math.hypot(rx-(who.x+.5),ry-(who.y+.45))<=.9&&closeViewToolEmissionPoint(state.toolEmission,acceptedTool,right)&&toolCueSegmentOpen(g.map,who.x+.5,who.y+.45,state.toolEmission[0],state.toolEmission[1])){state.toolEmissionReady=true;state.toolRelease=visualRecord;state.toolAlpha=actor.alpha;}
          const spellProfile=action.kind==='cast'&&cast&&['fan-release','orbit-launch'].includes(action.profile)?action.profile:null,left=state.heroFrame[cleaverHandRoles(held,primaryStage).free];
          const lx=left?.[12],ly=left?.[13],lz=left?.[14];
          if(spellProfile&&left?.length>=16&&finite(lx)&&finite(ly)&&finite(lz)&&actor.alpha>0&&Math.hypot(lx-(who.x+.5),ly-(who.y+.45))<=.9&&toolCueSegmentOpen(g.map,who.x+.5,who.y+.45,lx,ly)){
            const fire=spellProfile==='fan-release'&&castRecord?.spellKind==='fire-burst'&&castRecord?.variant==='cast'&&typeof castRecord.sourceId==='string'&&castRecord.sourceId.length<=160&&finite(castRecord.aim?.x)&&finite(castRecord.aim?.y);
            const orbit=spellProfile==='orbit-launch'&&castRecord?.spellKind==='orbit-volley'&&castRecord?.variant==='launch'&&validOrbit(g,g.orbit?.flight);
            if(fire||orbit){state.spellEmission[0]=lx;state.spellEmission[1]=ly;state.spellEmission[2]=lz;state.spellEmissionReady=true;state.spellRelease=castRecord;state.spellAlpha=actor.alpha;}
          }
          recordHeroPresentation(player,{gaitPhase:input.gaitPhase,speed:input.speed,yaw:actor.yaw,now:input.nowMs,x:who.x,y:who.y});
          state.hero = state.heroFrame; count++; imported = true;state.playerRepresentation='imported';
        }
      }
    }
    if (!imported && !append(actor)) return;
    if(who===player&&!imported){state.playerRepresentation='native';if(state.nativeMuzzle[3]===1&&actor.alpha>0){state.muzzle[0]=state.nativeMuzzle[0];state.muzzle[1]=state.nativeMuzzle[1];state.muzzle[2]=state.nativeMuzzle[2];state.muzzleReady=true;}}
    if (who === player) CAM.bodyRevision++;
    Object.assign(track, { x: who.x, y: who.y, at: now, hp: who.hp, actor });
    state.tracks.set(who, track);
    state.admitted.add(it);
  };
  for (let oi = n - 1; oi >= 0 && count < limit; oi--) {
    const it = order[oi];
    if (itemKind[it] === 1 && draws[itemRef[it]] === capturedPlayer) {
      admit(it, player, "player"); break;
    }
  }
  const admitAux = (it, d) => {
    const spec=d.nativeAux,a=spec.sample(now,reduce); if(!a||!modelSupported(a.kind))return;
    const x=Number.isFinite(a.x)?a.x:boardWX[it],y=Number.isFinite(a.y)?a.y:boardWY[it],source=spec.source;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    let track=state.tracks.get(source); if(!track)track={x,y,yaw:Number.isFinite(a.yaw)?a.yaw:CAM.yaw,phase:0,at:now};
    const dx=x-track.x,dy=y-track.y,dist=Math.hypot(dx,dy),elapsed=Math.max(0,Math.min(.1,(now-track.at)/1000));
    if(dist>.002&&dist<3){track.phase=(track.phase+dist*MODEL_TIMING.walkRadians)%(Math.PI*2);track.yaw=Math.atan2(dy,dx);}
    const pace=elapsed>0&&dist<3?Math.min(1,dist/elapsed/MODEL_TIMING.strideSpeed):0;
    const actor={x,y,z:surfaceZ(g.map,a.supportX??x,a.supportY??y)+(a.lift||0),yaw:Number.isFinite(a.yaw)?a.yaw:track.yaw,
      phase:track.phase,pace,amount:0,reduceMotion:reduce,effectTime:now,...a,pace:Number.isFinite(a.pace)?a.pace:pace,pose:a.pose||(pace>.01?'walk':'idle'),yaw:Number.isFinite(a.yaw)?a.yaw:track.yaw,
      z:surfaceZ(g.map,a.supportX??x,a.supportY??y)+(a.lift||0),alpha:Math.max(0,Math.min(1,(a.alpha??1)*boardB[it]))};
    if(!append(actor))return;Object.assign(track,{x,y,at:now,actor});state.tracks.set(source,track);state.admitted.add(it);
    closeViewGLStats.auxModels=(closeViewGLStats.auxModels||0)+1;closeViewGLStats.auxKinds[a.kind]=(closeViewGLStats.auxKinds[a.kind]||0)+1;
  };
  closeViewGLStats.auxModels=0;closeViewGLStats.auxKinds=Object.create(null);
  const locked = g.lockedTarget?.();
  // Admission is an effect/action coverage contract, not a growing kind whitelist.
  const canModel = (it, foe) => {
    if (itemKind[it] !== 1 || !foe) return false;
    const capture = draws[itemRef[it]];
    const reason = CLOSE_VIEW_HOOKS.art[foe.kind] ? 'custom-art'
      : foe.kind === 'voidWalker' ? (modelSupported('voidWalker') && stillworksWalkerRigPose(g.map, foe)
        && capture?.enemy === foe && typeof capture.nativePackEffects === 'function' ? null : 'walker-rig-fallback')
      : nativeCreatureCoverage(foe, draws[itemRef[it]], { mesh: modelSupported(actorModelKey(foe)), attachments: modelSupportsAttachments(actorModelKey(foe), 3) });
    if (reason) { closeViewGLStats.modelFallbacks[reason] = (closeViewGLStats.modelFallbacks[reason] || 0) + 1; return false; }
    return true;
  };
  if (locked) for (let oi = n - 1; oi >= 0; oi--) {
    const it = order[oi];
    if (boardFoe[it] === locked && canModel(it, locked)) { admit(it, locked, locked.kind); break; }
  }
  for (let oi = n - 1; oi >= 0 && count < limit; oi--) {
    const it = order[oi], foe = boardFoe[it];
    const d=draws[itemRef[it]];
    if(itemKind[it]===1&&d?.nativeAux)admitAux(it,d);
    else if (foe !== locked && canModel(it, foe)) admit(it, foe, foe.kind);
  }
  // 2026-11-11: the props (CLOSE_VIEW_PROPS), outside the creature cap; the Oculus's dais first, then the nearest objects.
  const PR = CLOSE_VIEW_PROPS; let props = 0; state.glintOn = false;
  const prop = (kind, X, Y, o, alpha = 1, grow = 1) => {
    if (props >= PR.cap) return false; const pose = closeViewPropPose(kind, o, now, reduce), Z = interiorSurfaceHeight(g.map, X, Y);
    const next = writeCloseViewModel(state.vertices, offset, { kind, x: X, y: Y, z: Z + pose.lift, yaw: pose.yaw, phase: 0, pace: 0, amount: 0, pose: 'idle', alpha, reduceMotion: reduce, scale: pose.scale * grow });
    if (next === offset) return false; offset = next; props++;
    const G = PR.glow[kind]; if (G && !state.glintOn) { const q = state.glint; q[0] = X; q[1] = Y; q[2] = Z + Math.max(pose.lift, PR.light.height); q[3] = G[0]; q[4] = G[1]; q[5] = G[2]; q[6] = alpha; state.glintOn = true; }
    return true; };
  const oc = g.oculus;
  if (oc && oc.map === g.map && Number.isFinite(oc.x) && Number.isFinite(oc.y)) { const D = PR.dais, age = (now - oc.born) / 1000, left = (oc.until - now) / 1000, alpha = Math.max(0, Math.min(1, left / D.fade)), grow = reduce ? 1 : Math.max(.25, Math.min(1, age / D.open));
    if (alpha > 0) prop('oculusDais', oc.x + .5, oc.y + .5, oc, alpha, grow); }
  for (let oi = n - 1; oi >= 0 && props < PR.cap; oi--) { const it = order[oi]; if (itemKind[it] !== 1 || state.admitted.has(it)) continue;
    const o = draws[itemRef[it]]?.object, kind = o && PR.objects[o.kind]; if (!kind || !Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) continue;
    if (prop(kind, Number(o.x) + .5, Number(o.y) + .5, o)) state.admitted.add(it); }
  state.props = closeViewGLStats.props = props;
  for (const [who, track] of state.tracks) {
    if (who.kind === 'voidWalker' && who.dead) { state.tracks.delete(who); continue; }
    if (who.dead && who.hp <= 0 && !who.noRewards) {
      track.deathAt ??= now;
      const amount = (now - track.deathAt) / MODEL_TIMING.deathMs;
      if (amount < 1 && !who.hidden && !who.gloomVeil) append({ ...track.actor, attachments: null, pose: "death", amount });
      else state.tracks.delete(who);
    } else if (now - track.at > 120 || who.dead) state.tracks.delete(who);
  }
  closeViewGLStats.models = count;
  admitBeasts(g, draws, n, Q, now, reduce);
  return offset ? state.vertices.subarray(0, offset) : null;
}
// Five canonical stationary spells only. Recipes are immutable module data;
// selecting one light is a single linear scan, with no candidate list or effect cache.
const PLACED_SPELL_LIGHT = Object.freeze({
  'cinder-dart':Object.freeze([1,.45,.18]),'ember-ring':Object.freeze([1,.45,.18]),
  'grave-sun':Object.freeze([.8,.58,1]),'gravity-well':Object.freeze([.75,.435,.68]),
  'stillpoint':Object.freeze([.81,.89,1]),
});
export function nearestPlacedSpellLight(effects, map, px, py, reach, seen = null) {
  if(!Array.isArray(effects)||!Number.isFinite(px)||!Number.isFinite(py)||!Number.isFinite(reach)||reach<0)return null;
  const width=map?.width||32;let best=null,bestDistance=Infinity;
  for(let i=0;i<effects.length;i++){
    const fx=effects[i];
    if(!fx||!Object.hasOwn(PLACED_SPELL_LIGHT,fx.kind)||fx.glyphHost!=='spell'||fx.glyphSpell!==fx.kind||fx.hostile||fx.brawler||
      !Number.isFinite(fx.x)||!Number.isFinite(fx.y)||!Number.isFinite(fx.radius)||fx.radius<=0||!Number.isFinite(fx.life)||fx.life<=0||
      !Number.isFinite(fx.pulse)||fx.pulse<=0||(fx.delay!==undefined&&(!Number.isFinite(fx.delay)||fx.delay>0)))continue;
    const x=Math.floor(fx.x),y=Math.floor(fx.y),tile=map?.tiles?.[y*width+x];
    if(x<0||x>=width||y<0||y>=(map?.height||Math.ceil((map?.tiles?.length||0)/width))||!tile||tile.blocked||tile.environment||tile.chasm||tile.hole||
      (seen&&!seen(x,y)))continue;
    const hazard=closeViewHazardCode(tile);if(hazard!==0&&hazard!==4)continue;
    const d=Math.hypot(fx.x-px,fx.y-py);
    if(d>reach+Math.min(4,fx.radius)||d>=bestDistance)continue;
    best=fx;bestDistance=d;
  }
  return best;
}
export function writePlacedSpellLight(frame, fx, map, slot) {
  if(!fx||!Object.hasOwn(PLACED_SPELL_LIGHT,fx.kind)||!Number.isInteger(slot)||slot<0||slot>=8)return false;
  const color=PLACED_SPELL_LIGHT[fx.kind],tile=map.tiles[Math.floor(fx.y)*(map.width||32)+Math.floor(fx.x)];
  const roof=interiorArchAt(map,fx.x,fx.y)||tile?.doorway?Math.min(interiorCeilingHeight(map),INTERIOR_TRAVERSAL.archClearance):interiorCeilingHeight(map);
  const ground=surfaceZ(map,fx.x,fx.y),roofZ=(interiorTerrain(map)?ground:0)+roof-.15;
  const o=slot*4;frame.lp[o]=fx.x;frame.lp[o+1]=fx.y;frame.lp[o+2]=Math.max(ground,Math.min(ground+.65,roofZ));
  frame.lp[o+3]=Math.min(4,Math.max(1,fx.radius));
  frame.lc[o]=color[0];frame.lc[o+1]=color[1];frame.lc[o+2]=color[2];
  // Fade through the final actual pulse interval, never a new wall-clock timer.
  frame.lc[o+3]=.65*Math.min(1,Math.max(0,fx.life/fx.pulse));return true;
}
const PICK = { idx: new Int32Array(8), d: new Float32Array(8) };
// Place each lantern at a doorway jamb. For a closed gate, put it on the
// first walkable approach so its flame does not sit inside the blocked tile.
export function closeViewCompassRotation(dx,dy,yaw=-Math.PI/2){
  return Math.round((Math.atan2(dy,dx)-yaw)*180/Math.PI);
}
// Tim (2026-11-11): in Close View the compass turns with the way the Wayfarer faces, not with the camera (ahead is the top of
// the dial); the standard view keeps it north-up, like the map.
// `rate`: how fast (per second) the dial eases toward a new facing; a change smaller than `deadband` degrees while the dial
// is at rest is ignored (so a body's small sway never makes it shimmer); once turning it settles to within `settle` degrees.
export const COMPASS_FACING = Object.freeze({ rate: 10, deadband: 4, settle: .5, maxStep: .1 });
// The Wayfarer's body yaw as Close View draws it, or NaN while an attack, cast, dodge or stagger turns the body for a moment
// (the compass then keeps the way they were going). Callers check closeViewShowing first.
export function closeViewBodyFacingYaw(){ return CAM.valid && !CAM.bodyTransient && Number.isFinite(CAM.bodyYaw) ? CAM.bodyYaw : NaN; }
// One HUD frame of the compass's facing frame. `frame` ({yaw, turning, ready}) is kept by the caller and changed in place;
// `target` is the facing yaw (radians, world: 0 east, -PI/2 north). Reduced motion snaps instead of easing. Returns frame.yaw.
export function compassFacingStep(frame, target, dt, reduce = false) {
  if (!Number.isFinite(target)) return frame.yaw;
  if (!frame.ready || !Number.isFinite(frame.yaw)) { frame.yaw = target; frame.turning = false; frame.ready = true; return frame.yaw; }
  const F = COMPASS_FACING, diff = wrap(target - frame.yaw), size = Math.abs(diff) / DEG;
  if (!frame.turning && size < F.deadband) return frame.yaw;
  if (reduce || size < F.settle) { frame.yaw = target; frame.turning = false; return frame.yaw; }
  frame.turning = true;
  frame.yaw = wrap(frame.yaw + diff * Math.min(1, F.rate * Math.min(F.maxStep, Math.max(0, Number(dt) || 0))));
  return frame.yaw;
}
export function closeViewDoorTorchPosition(map, door) {
  const w=map.width||32,h=map.height||Math.floor(map.tiles.length/w);
  const free=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&!map.tiles[y*w+x]?.blocked;
  const {x,y}=door, ew=free(x-1,y)&&free(x+1,y), ns=free(x,y-1)&&free(x,y+1);
  if(door.blocked){
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]])if(free(x+dx,y+dy))
      return {x:x+.5+dx*.65+dy*.28,y:y+.5+dy*.65-dx*.28};
  }
  return ew&&!ns?{x:x+.5,y:y+.82}:{x:x+.82,y:y+.5};
}
function nearbyDoorTorches(g,px,py,reach,seen,limit){
  const doors=CLOSE_VIEW_HOOKS.navigationDoors?.(g);
  if(!doors?.length||limit<=0)return [];
  const list=[];
  for(const door of doors){
    if(door.mark==="known"||seen&&!seen(door.x,door.y))continue;
    const p=closeViewDoorTorchPosition(g.map,door),dist=Math.hypot(p.x-px,p.y-py);
    if(dist>reach+1.8)continue;
    list.push({...p,dist,arrival:door.mark==="arrival"});
  }
  list.sort((a,b)=>a.dist-b.dist);
  return list.slice(0,limit);
}
// Which roofs to draw this frame (OUTDOOR.buildings): writes the solids' runs to draw whole into F.runs (nRuns 0: draw it all)
// and each roof part way through its fade into F.fades (start, count, opacity; nFades of them), drawn dithered on its own.
// A roof's opacity eases toward 0 while it is hidden (roofHidden) and back to 1 over OUTDOOR.buildings.fade.ms; a new scene
// or reduced motion sets it at once (a prop changing keeps the houses, and the fade). No allocation: ROOF_FADE's arrays are made once.
const ROOF_FADE = { key: null, at: 0, a: new Float32Array(32) };
function roofRuns(F, scene, map, px, py, cx, cy, now, reduce, keep = null) { // keep: the roof deck stood on (roof-decks.ts): never hidden, never faded
  const roofs = scene.houses.roofs, base = scene.solids.roofStart, at = scene.solids.housesAt, A = ROOF_FADE.a, fresh = ROOF_FADE.key !== scene.houses || reduce;
  const step = fresh ? 1 : Math.max(0, Math.min(250, now - ROOF_FADE.at)) / Math.max(1, OUTDOOR.buildings.fade.ms); ROOF_FADE.key = scene.houses; ROOF_FADE.at = now;
  let partial = 0, nf = 0;
  for (let i = 0; i < roofs.length && i < A.length; i++) { const goal = roofs[i].id !== keep && roofHidden(map, roofs[i], px, py, cx, cy) ? 0 : 1;
    A[i] = fresh || roofs[i].id === keep ? goal : goal > A[i] ? Math.min(goal, A[i] + step) : Math.max(goal, A[i] - step); if (A[i] < 1) partial |= 1 << i; }
  if (!partial) return; let k = 0, a = 0, end = base; F.runs[0] = 0;
  for (let i = 0; i < roofs.length && k < 15; i++) { const r = roofs[i], r0 = at + r.start, r1 = r0 + r.count; if (partial & (1 << i)) { if (end > a) { F.runs[k * 2] = a; F.runs[k * 2 + 1] = end - a; k++; } a = r1; end = a;
      if (A[i] > 0 && nf < 16) { F.fades[nf * 3] = r0; F.fades[nf * 3 + 1] = r.count; F.fades[nf * 3 + 2] = A[i]; nf++; } } else end = r1; }
  if (end > a && k < 16) { F.runs[k * 2] = a; F.runs[k * 2 + 1] = end - a; k++; }
  F.nRuns = Math.max(1, k); F.nFades = nf; if (!k) { F.runs[0] = 0; F.runs[1] = 0; } }
// A roof is hidden only while the Wayfarer's feet are inside its house (outdoorInsideHouse: past the doorway, not beside a
// wall), or while the camera itself is inside the house's walls. Tim, 2026-11-12: "the roofs don't disappear until you get
// inside of them". Walking up to it, standing at its wall or in its door, it stays; behind it the silhouette shows the Wayfarer.
export function roofHidden(map, r, px, py, cx, cy) {
  if (outdoorInsideHouse(map, r.id, px, py)) return true; // inside it
  return cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1 && outdoorInsideHouse(map, r.id, cx, cy); // the camera within its walls
}
export const closeViewRoofOpacity = (i) => ROOF_FADE.a[i]; // for tests
// The Wayfarer's leaps and drops over the overworld's taller levels (OUTDOOR.terrain version 3). Gameplay is unchanged: one
// jump a level, the tile under the feet decides the footing. What is drawn: the footing (`base`) rises toward the ledge the
// jump is carrying them onto (the ground where their motion will put them when the jump ends), so the arc clears the ledge
// before the feet cross onto it, never popping up; the arc itself is scaled from the ordinary jump's (JUMP.arc tiles at its
// peak) to `arcPeak` of a level; stepping or jumping off a ledge, the footing falls under `gravity` until it meets the
// ground. A difference of `snap` or less (a ramp's slope, a pebble of noise) is followed at once. Presentation only: it
// writes the frame's captured Wayfarer card's jumpLift (a fresh object each frame), never the game.
// The calm pass (Tim, 2026-11-12: "he jumps so much higher than the blocks... if there's a way we can make the jumps a little
// more realistic"): the arc rode on top of the rising footing, so a jump onto a level peaked a whole arc (.72 of a level) over
// the level's top, 1.72 levels over the ground it left. Now what the footing has already climbed this jump comes out of the
// arc, never below `apexMargin` of a level: the peak is at most the higher of the flat arc and the step plus that margin (a
// level and .15 for the tallest step one jump clears). Jump physics, reach and what can be climbed are unchanged.
// The jump-up hitch (Tim, 2026-11-12: "when you jump up onto something, the character's movement isn't steady or stable at the
// moment of landing... a weird little hitch"). Traced frame by frame at 60 and 30 Hz (tests/jump-landing-smooth.test.ts): the footing
// was eased toward the ledge by `base += (target - base) * min(1, dt * rise)` (a first-frame leap of a third of a level at 60 Hz and
// over half at 30 Hz), the target was the ground where the jump would end if the stick were held to its end (let go, or turned, and
// the footing stood a whole level over where the Wayfarer landed, then dropped it after the landing), and the drawn feet were held to
// `max(ground, ...)`, so a jump made against the ledge (the feet cross onto it on the jump's first frame) popped a whole level up in
// one frame. Now the footing rides a critically damped spring (rate `rise` per second, the same at any frame rate) toward the ground
// the jump reaches within `ahead` seconds (never past its end) and comes back down if that changes; the drawn feet follow it and are
// never snapped up (for a moment a jump that crosses the lip early climbs it, knees tucked, instead of popping). In the air under the
// fall model (game.ts FALL) the feet are drawn at the fall's height: they leave from the height they were drawn at (a roof is drawn
// taller than its levels) and meet the fall's own height by the landing.
export const CLOSE_VIEW_LEAP = Object.freeze({ arcFrom: .42, arcPeak: .72, apexMargin: .15, gravity: 28, snap: .18, rise: 20, ahead: 1, samples: 6, soft: .1, reset: 2.5 });
const tileElevAt = (map, x, y) => { const w = Math.max(1, Number(map?.width) || 32), t = map?.tiles?.[Math.floor(y) * w + Math.floor(x)]; return t ? Number(t.elev) || 0 : 0; }; // a level, by the tile (the feet's point)
const LEAP = { map: null, base: 0, from: 0, fromElev: 0, air: false, settle: false, z: 0, v: 0, bv: 0, t: NaN, x: NaN, y: NaN, vx: 0, vy: 0, fall: false, fOff: 0, fH: 1 };
// The arc over the footing: the ordinary jump's lift scaled to `arcPeak` of a level, less what the footing has already climbed this jump,
// never under `apexMargin` (the higher of the two, smoothly: a hard max put a kink in the rise).
function leapArc(K, L, lift, climbed) { const a = K.apexMargin * L, b = K.arcPeak * L - climbed, k = K.soft * L; return Math.min(1, lift / K.arcFrom) * (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2; }
export function presentLeap(g, now, d) {
  const K = CLOSE_VIEW_LEAP, p = g.player, fx = footX(p), fy = footY(p), ground = surfaceZ(g.map, fx, fy), clock = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now, L = OUTDOOR.terrain.level;
  const special = !!(g.droneLift || g.mechBoosting || g.glide || g.swimming || g.save?.boat?.aboard || g.mountRide?.() || g.skyAir != null && !g.fall && (g.deckHop || !(clock < (g.jumpUntil || 0))));
  if (LEAP.map !== g.map || !Number.isFinite(LEAP.x) || Math.hypot(fx - LEAP.x, fy - LEAP.y) > K.reset || special) { LEAP.base = LEAP.from = LEAP.z = ground; LEAP.air = LEAP.settle = false; LEAP.v = LEAP.bv = 0; LEAP.vx = LEAP.vy = 0; LEAP.t = clock; LEAP.fall = false; }
  const dt = Math.max(0, Math.min(.1, (clock - LEAP.t) / 1000));
  if (dt > 0) { const k = Math.min(1, dt * 12); LEAP.vx += ((fx - LEAP.x) / dt - LEAP.vx) * k; LEAP.vy += ((fy - LEAP.y) / dt - LEAP.vy) * k; }
  LEAP.map = g.map; LEAP.t = clock; LEAP.x = fx; LEAP.y = fy; if (special) return;
  const jumping = clock < (g.jumpUntil || 0), lift = Math.max(0, Number(d.jumpLift) || 0), f = g.fall && Number.isFinite(g.fall.z) ? g.fall : null; let arc = 0;
  if (f) { // FALL: the fall's height, from where the feet were drawn when it began
    const under = Math.floor(ground / L + 1e-6), air = Math.max(0, f.z - under);
    if (!LEAP.fall) { LEAP.fall = true; LEAP.fOff = (jumping || !Number.isFinite(HERO_FEET.z) ? LEAP.base : HERO_FEET.z) - f.z * L; LEAP.fH = Math.max(.25, air); } // from where the feet were drawn (a roof's drawn top)
    LEAP.base = f.z * L + LEAP.fOff * Math.max(0, Math.min(1, air / LEAP.fH));
    if (jumping) { arc = leapArc(K, L, lift, 0); LEAP.from = LEAP.base; } // a jump that holds its height over lower ground: its own arc
    LEAP.air = jumping; LEAP.v = Math.max(0, -(Number(f.vz) || 0) * L); LEAP.bv = 0;
    const z = Math.max(ground, LEAP.base + arc); d.lift = 0; d.jumpLift = Math.max(0, z - ground); LEAP.z = z; LEAP.settle = false; return z;
  }
  LEAP.fall = false;
  if (jumping && !LEAP.air) { LEAP.from = LEAP.base; LEAP.bv = 0; LEAP.fromElev = Math.max(Number.isFinite(g.jumpFrom) ? g.jumpFrom : tileElevAt(g.map, fx, fy), g.skyAir ?? -Infinity); } // the footing this jump left
  if (!jumping && LEAP.air && LEAP.z > Math.max(ground, LEAP.base) + 1e-6) { LEAP.base = LEAP.z; LEAP.v = 0; LEAP.settle = true; } // a jump ended early (a hop that lands on arrival): what was left of its arc settles under gravity, never cut
  LEAP.air = jumping;
  if (jumping) { const left = Math.max(0, ((g.jumpUntil || 0) - clock) / 1000), look = Math.min(left, K.ahead); let ahead = -Infinity;
    for (let i = 1; i <= K.samples; i++) { const k = look * i / K.samples, X = fx + LEAP.vx * k, Y = fy + LEAP.vy * k; if (tileElevAt(g.map, X, Y) <= LEAP.fromElev + 1) ahead = Math.max(ahead, surfaceZ(g.map, X, Y)); } // the highest footing on the way that one jump reaches (a level up; a branch tip is narrow)
    const target = Math.max(ground, g.skyAir != null ? LEAP.from : -Infinity, ahead); // a sky hop holds its platform's height over the gap
    if (g.skyAir != null) d.lift = 0; // a sky hop (a great tree's branches, a skyway): drawn here at the drawn height of the platform it left, not the flat view's
    if (dt > 0) spring(LEAP, "base", "bv", target, K.rise, dt); // toward the ledge it is carrying them onto, and back if not
    arc = leapArc(K, L, lift, Math.max(0, LEAP.base - LEAP.from)); }
  else if (ground >= LEAP.base || LEAP.base - ground <= K.snap && !LEAP.settle) { LEAP.base = ground; LEAP.v = 0; LEAP.bv = 0; LEAP.settle = false; } // on foot: stepped up (a ramp, a lift) on it at once; a pebble of noise followed
  else { LEAP.bv = 0; LEAP.v += K.gravity * dt; LEAP.base = Math.max(ground, LEAP.base - LEAP.v * dt); if (LEAP.base <= ground) LEAP.v = 0; } // off a ledge (a step too short to be a fall): a drop
  const z = jumping ? LEAP.base + arc : Math.max(ground, LEAP.base + arc); d.jumpLift = Math.max(0, z - ground - Math.max(0, Number(d.lift) || 0));
  LEAP.z = z; if (LEAP.base <= ground) LEAP.settle = false;
  if (z < ground) { d.lift = z - ground; d.climb = true; } // still rising onto a lip the feet crossed early: drawn under it a moment (the jump's arc pose climbing), never popped up
  return z;
}
export const closeViewLeap = () => ({ base: LEAP.base, from: LEAP.from, v: LEAP.v }); // for tests
const PROP_Z = { map: null }; // the floor whose props are being built (propZ reads its heights; no closure a frame)
const propZ = (x, y) => interiorSurfaceHeight(PROP_Z.map, x, y);
function glScene(ctx, g, w, h, now, Q, n, draws, geo, reduce, lightR, fogNear, fogFar, Tx, Ty, gox, goy, s, ts, models, shots, flatWorld, outdoor) {
  try {
  const A = CLOSE_VIEW.actors, Cu = CLOSE_VIEW.cues, Cs = CLOSE_VIEW.contact, Wl = CLOSE_VIEW.walls, Lt = CLOSE_VIEW.light, At = CLOSE_VIEW.atmosphere, F = GLF, p = g.player;
  const th = themeOf(g.map), tg = themeGL(th), st = geo === OPEN_WORLD_GEOMETRY ? OPEN_WORLD_STATIC : staticFor(g.map, geo, th); closeViewGLStats.theme = THEME_OF.get(g.map) || ""; const seen = (SEEN.map === g.map ? SEEN.fn : (SEEN.map = g.map, SEEN.fn = glSeen(g.map)));
  const scale = Math.max(.5, Math.min(4, (ctx.canvas?.width || w) / w)) * (Q.glScale || 1);
  F.w = w; F.h = h; F.devW = Math.max(1, Math.round(w * scale)); F.devH = Math.max(1, Math.round(h * scale));
  F.cx = CAM.cx; F.cy = CAM.cy; F.fx = CAM.fx; F.fy = CAM.fy; F.rx = CAM.rx; F.ry = CAM.ry; F.hc = CAM.hc; F.cosP = CAM.cosP; F.sinP = CAM.sinP; F.F = CAM.F; F.ppx = CAM.ppx; F.ppy = CAM.ppy;
  F.px = footX(p); F.py = footY(p);
  // the theme's light and air (the Pentagon's dread still shrinks the carried light, as before)
  const stillworks = stillworksCloseView(g.map);
  const air = stillworks ? STILLWORKS_AIR : outdoor ? WORLD_AIR : null;
  const Lth = th.light, Fo = th.fog, shrink = lightR / Lt.radius, fogK = fogNear - CLOSE_VIEW.fog.near;
  F.fogNear = air || flatWorld ? fogNear : Fo.near + fogK; F.fogFar = air || flatWorld ? fogFar : Fo.far + fogK; F.reach = F.fogFar + 2;
  F.fog.set(air?.fog || tg.fog); F.haze.set(air?.haze || tg.haze); F.fogP[0] = F.fogNear; F.fogP[1] = F.fogFar; F.fogP[2] = (air?.hazeBand || Fo.haze)[0]; F.fogP[3] = (air?.hazeBand || Fo.haze)[1];
  F.amb.set(air?.ambient || tg.amb); F.torch.set(tg.torch); F.torchP[0] = Lth.reach * shrink; F.torchP[1] = Lth.strength; F.torchP[2] = Lth.height + surfaceZ(g.map, footX(p), footY(p)); F.torchP[3] = .3;
  F.grade[0] = th.grade[0]; F.grade[1] = th.grade[1]; F.grade[2] = th.grade[2]; F.grade[3] = 1 / th.grade[3]; F.finish[0] = Q.vignette ? th.vignette : th.vignette * .6; F.finish[1] = .2; F.finish[2] = Q.relief ? 1 : 0; // finish: vignette, the haze's glow, fine detail (off on the low tier)
  { const S2 = At.silhouette, S3 = At.silhouetteFoe; F.sil[0] = S2[0] / 255; F.sil[1] = S2[1] / 255; F.sil[2] = S2[2] / 255; F.silFoe[0] = S3[0] / 255; F.silFoe[1] = S3[1] / 255; F.silFoe[2] = S3[2] / 255; }
  F.time = reduce ? 0 : now; F.gmapK = s * ts; F.gmapX = Tx * ts + gox; F.gmapY = Ty * ts + goy; F.atlasY = GROUND.atlasY; F.mip = Q.mip !== false; F.aniso = Q.aniso || 1; F.ceilH = hallHeight(g.map); F.terrain = interiorTerrain(g.map);
  UNI.hall = g.map.hall?.tall ? g.map.hall : null; UNI.space = g.map?.seedRealm?.realm === "ship";
  UNI.openArena = stillworks || outdoor;
  UNI.worldCapture = flatWorld;
  // the open world (close-view-outdoor.ts): its sky, sun and air, the ground's far field and its solids
  F.outdoor = 0; F.sunC.fill(0);
  const openWorld = outdoor && flatWorld && geo === OPEN_WORLD_GEOMETRY && g.area === "overworld" ? outdoorScene(g.map, RELIEF.map === g.map) : null;
  if (openWorld && glOutdoor(openWorld)) { const sk = openWorld.sky, view = OUTDOOR.view[g.presentation?.effectiveQuality] || OUTDOOR.view.balanced, half = GROUND.W / (2 * s), W2 = OUTDOOR.water, R2 = OUTDOOR.relief, D2 = OUTDOOR.detail;
    F.outdoor = 1; F.fogNear = view.near; F.fogFar = view.far; F.reach = F.fogFar + 2; F.fogP[0] = F.fogNear; F.fogP[1] = F.fogFar;
    F.fog.set(sk.horizon); F.haze.set(sk.haze); F.amb.set(sk.ambient); F.sun[0] = sk.sun[0]; F.sun[1] = sk.sun[1]; F.sun[2] = sk.sun[2]; F.sunC.set(sk.sunC); F.torchP[1] *= sk.torch ?? OUTDOOR.torch;
    F.grade[0] = sk.grade[0]; F.grade[1] = sk.grade[1]; F.grade[2] = sk.grade[2]; F.grade[3] = 1 / sk.grade[3]; F.finish[0] = Q.vignette ? OUTDOOR.vignette : OUTDOOR.vignette * .6;
    F.outdoorP[1] = half - OUTDOOR.blend.inner; F.outdoorP[2] = half - OUTDOOR.blend.outer; F.outdoorP[3] = Q.detail ? 1 : 0;
    F.skyZ[0] = sk.zenith[0]; F.skyZ[1] = sk.zenith[1]; F.skyZ[2] = sk.zenith[2]; F.skyZ[3] = sk.clouds; F.skyH[0] = sk.horizon[0]; F.skyH[1] = sk.horizon[1]; F.skyH[2] = sk.horizon[2]; F.skyH[3] = sk.ridgeH;
    F.ridge[0] = sk.ridge[0]; F.ridge[1] = sk.ridge[1]; F.ridge[2] = sk.ridge[2]; F.ridge[3] = sk.rough;
    F.outW[0] = W2.base; F.outW[1] = W2.glance; F.outW[2] = W2.ripple; F.outW[3] = W2.rippleAmp; F.outR[0] = R2.foot; F.outR[1] = R2.dark; F.outR[2] = R2.lip; F.outR[3] = R2.light;
    F.outD[0] = D2.amp; F.outD[1] = D2.near; F.outD[2] = D2.far; F.outD[3] = W2.glint;
    F.outX[0] = OUTDOOR.ground.art; F.outX[1] = W2.shore; F.outX[2] = Q.relief ? W2.foam : W2.foam * .6; F.outX[3] = g.map.movers?.length ? 1 : 0; // rafts are drawn on the water by the ordinary art: keep it there
    F.outY[0] = W2.deep; F.outY[1] = W2.shallow; F.outY[2] = W2.wander; F.outY[3] = Q.motes ? 1 : 0; // clouds in the water: the full tier only
    // the sky's mood: stars, the clouds' undersides, the moon, a distant flash (none with reduced motion) and the clouds' colour
    const flash = reduce ? 0 : outdoorLightning(now, sk.lightning || 0); F.mood[0] = sk.stars || 0; F.mood[1] = sk.cloudDark || 0; F.mood[2] = sk.moon || 0; F.mood[3] = flash;
    if (sk.cloud) { F.moodC[0] = sk.cloud[0]; F.moodC[1] = sk.cloud[1]; F.moodC[2] = sk.cloud[2]; } else F.moodC.fill(1); F.moodC[3] = flash > 0 ? LIGHTNING.az : 0;
    if (flash > 0) { const lift = 1 + OUTDOOR.lightning.lift * flash; F.amb[0] *= lift; F.amb[1] *= lift; F.amb[2] *= lift; } }
  // a house's roof fades out while the Wayfarer is inside it (or the camera is), and stays drawn while they are outside it
  F.relief = F.outdoor && openWorld.ground && glRelief(openWorld) ? 1 : 0;
  F.nRuns = 0; F.nFades = 0; if (F.outdoor && openWorld.houses.roofs.length) roofRuns(F, openWorld, g.map, F.px, F.py, CAM.cx, CAM.cy, now, reduce, ownRoofDeck(g)?.id ?? null);
  // indoors (and wherever the open world's scene is not drawn) the props alone, on the floor's own heights
  F.props = 0; if (!openWorld && !(outdoor && flatWorld)) { PROP_Z.map = g.map; const ps = propScene(g.map, propZ, seen); if (ps && ps.solids.verts > 0 && glProps(ps)) F.props = 1; }
  UNI.backdrop = BACKDROPS.get(stillworks ? "starVault" : UNI.hall?.backdrop) || NO_BACKDROP;
  UNI.inlay = st.inlay;
  UNI.q = Q; UNI.reduce = reduce; UNI.now = now; UNI.th = th; UNI.tg = tg; const drops = holeDrops(g.map); UNI.safeOn = !!drops;
  glMask(g.map, now, seen, drops, CLOSE_VIEW.gl.maskMs, th.floor.remap || null);
  if (Q.detail) glGrit(gritAtlas);
  glStaticWalls(st, () => st.data);
  // the placed lights: the nearest few to the Wayfarer that the fog of war has shown, each breathing gently (still with reduced motion)
  const K = Math.min(8, Q.lights ?? At.lights), L = st.lights, px = F.px, py = F.py;
  const spellLight=K>0?nearestPlacedSpellLight(g.effects,g.map,px,py,F.reach,seen):null;
  const torchLights=nearbyDoorTorches(g,px,py,F.reach,seen,Math.min(2,K-(spellLight?1:0)));
  const glintSlot=MODEL_STATE.glintOn&&models&&K>2?1:0; // 2026-11-11: one slot for the nearest glowing prop
  const staticLimit=K-(spellLight?1:0)-torchLights.length-glintSlot;let nk = 0;
  for (let i = 0; i < st.nLights; i++) { const o = i * LIGHT_FLOATS, d = Math.hypot(L[o] - px, L[o + 1] - py); if (d > F.reach + L[o + 3]) continue; if (seen && !seen(Math.floor(L[o]), Math.floor(L[o + 1]))) continue;
    if (nk < staticLimit) { PICK.idx[nk] = i; PICK.d[nk] = d; nk++; } else if(staticLimit>0) { let wi = 0; for (let j = 1; j < nk; j++) if (PICK.d[j] > PICK.d[wi]) wi = j; if (d < PICK.d[wi]) { PICK.idx[wi] = i; PICK.d[wi] = d; } } }
  for (let i = 1; i < nk; i++) { const di = PICK.d[i], ii = PICK.idx[i]; let j = i - 1; while (j >= 0 && PICK.d[j] > di) { PICK.d[j + 1] = PICK.d[j]; PICK.idx[j + 1] = PICK.idx[j]; j--; } PICK.d[j + 1] = di; PICK.idx[j + 1] = ii; } // nearest first (the shader's highlights take the first two)
  const famp = At.flicker[0], fper = At.flicker[1];
  for (let j = 0; j < nk; j++) { const o = PICK.idx[j] * LIGHT_FLOATS, hue = L[o + 5] === 5 ? tg.glow : HUE_RGB[L[o + 5]] || HUE_RGB[0], ph = L[o + 6], fail = L[o + 5] === 3;
    const fl = reduce ? 1 : 1 + famp * (fail ? 2.2 : 1) * (Math.sin(now / fper + ph) * .6 + Math.sin(now / (fper * .37) + ph * 2.1) * .4) - (fail && Math.sin(now / 1700 + ph * 3) > .93 ? .6 : 0);
    F.lp[j * 4] = L[o]; F.lp[j * 4 + 1] = L[o + 1]; F.lp[j * 4 + 2] = L[o + 2]; F.lp[j * 4 + 3] = L[o + 3]; F.lc[j * 4] = hue[0]; F.lc[j * 4 + 1] = hue[1]; F.lc[j * 4 + 2] = hue[2]; F.lc[j * 4 + 3] = L[o + 4] * Math.max(0, fl); }
  F.nl = nk;
  // Append after static lights: PICK, first-two highlights, halos and motes keep
  // their original static indices. No additional cards or rendering passes.
  if(spellLight&&writePlacedSpellLight(F,spellLight,g.map,nk))F.nl++;
  // 2026-11-11: the nearest glowing prop (a floating crystal, the Oculus's dais, a lit way stone) lights the place round it
  if(glintSlot&&F.nl<K){const q=MODEL_STATE.glint,i=F.nl++*4,L2=CLOSE_VIEW_PROPS.light;F.lp[i]=q[0];F.lp[i+1]=q[1];F.lp[i+2]=q[2];F.lp[i+3]=L2.reach;F.lc[i]=q[3];F.lc[i+1]=q[4];F.lc[i+2]=q[5];F.lc[i+3]=L2.strength*q[6];}
  for(const torch of torchLights){
    const i=F.nl++*4;
    F.lp[i]=torch.x;F.lp[i+1]=torch.y;F.lp[i+2]=surfaceZ(g.map,torch.x,torch.y)+.82;F.lp[i+3]=1.8;
    F.lc[i]=torch.arrival?.21:.55;F.lc[i+1]=torch.arrival?.65:.26;F.lc[i+2]=1;F.lc[i+3]=.68;
  }
  // billboards (far to near), and their floor decals
  let nb = 0; for (let i = 0; i < n; i++) if (itemKind[i] === 1) nb++;
  const B = glEnsure("board", nb * 6); let D = glEnsure("decal", (nb * 3 + 400) * 6); let bv = 0, dv = 0; const tw = GROUND.canvas.width, th2 = GROUND.canvas.height, RX = CAM.rx, RY = CAM.ry;
  const room = (verts) => { if ((dv + verts) * DECAL_FLOATS > D.length) D = glEnsure("decal", dv + verts + 600); };
  let boardBase = 0;
  const BV = (X, Y, Z, u, v, a, fl, gh, li) => { const b = bv * BOARD_FLOATS; B[b] = X; B[b + 1] = Y; B[b + 2] = Z + boardBase; B[b + 3] = u; B[b + 4] = v; B[b + 5] = a; B[b + 6] = fl; B[b + 7] = gh; B[b + 8] = li; bv++; };
  const DV = (X, Y, Z, lx, ly, kind, a, wd, li, absolute = false) => { const b = dv * DECAL_FLOATS; D[b] = X; D[b + 1] = Y; D[b + 2] = Z + (absolute ? 0 : surfaceZ(g.map, X, Y)); D[b + 3] = lx; D[b + 4] = ly; D[b + 5] = kind; D[b + 6] = a; D[b + 7] = wd; D[b + 8] = li; dv++; };
  const flatD = (X, Y, r, kind, a, wd, li = 1) => { room(6); DV(X - r, Y - r, .01, -1, -1, kind, a, wd, li); DV(X + r, Y - r, .01, 1, -1, kind, a, wd, li); DV(X + r, Y + r, .01, 1, 1, kind, a, wd, li); DV(X - r, Y - r, .01, -1, -1, kind, a, wd, li); DV(X + r, Y + r, .01, 1, 1, kind, a, wd, li); DV(X - r, Y + r, .01, -1, 1, kind, a, wd, li); };
  const shadow = (X, Y, sc, opacity = 1) => {
    let lx = px, ly = py, best = lightLevel(F, X, Y, .4);
    for (let i = 0; i < F.nl; i++) {
      const j = i * 4, distance = Math.hypot(X - F.lp[j], Y - F.lp[j + 1], F.lp[j + 2] - .4);
      const score = F.lc[j + 3] * falloff(distance, F.lp[j + 3]);
      if (score > best * .35) { best = score / .35; lx = F.lp[j]; ly = F.lp[j + 1]; }
    }
    const dx = X - lx, dy = Y - ly, distance = Math.hypot(dx, dy);
    if (distance < .12) return;
    const along = Math.min(MODEL_SHADOW.max, MODEL_SHADOW.length + distance * .12) * sc;
    const ux = dx / distance, uy = dy / distance, wx = -uy * MODEL_SHADOW.width * sc, wy = ux * MODEL_SHADOW.width * sc;
    const ax = X - ux * .12, ay = Y - uy * .12, bx = X + ux * along, by = Y + uy * along;
    const a = MODEL_SHADOW.alpha * opacity;
    room(6);
    DV(ax - wx, ay - wy, .008, -1, -1, 10, a, 0, 0);
    DV(bx - wx, by - wy, .008, 1, -1, 10, a, 0, 0);
    DV(bx + wx, by + wy, .008, 1, 1, 10, a, 0, 0);
    DV(ax - wx, ay - wy, .008, -1, -1, 10, a, 0, 0);
    DV(bx + wx, by + wy, .008, 1, 1, 10, a, 0, 0);
    DV(ax + wx, ay + wy, .008, -1, 1, 10, a, 0, 0);
  };
  const card = (X, Y, z0, z1, hw, kind, a, wd, li, absolute = false) => { room(6); const base = absolute ? 0 : surfaceZ(g.map, X, Y); z0 += base; z1 += base; const lx = X - RX * hw, ly = Y - RY * hw, qx = X + RX * hw, qy = Y + RY * hw; DV(lx, ly, z0, -1, -1, kind, a, wd, li, true); DV(qx, qy, z0, 1, -1, kind, a, wd, li, true); DV(qx, qy, z1, 1, 1, kind, a, wd, li, true); DV(lx, ly, z0, -1, -1, kind, a, wd, li, true); DV(qx, qy, z1, 1, 1, kind, a, wd, li, true); DV(lx, ly, z1, -1, 1, kind, a, wd, li, true); };
  const bl0 = At.boardLight[0], bl1 = At.boardLight[1];
  for (let oi = 0; oi < n; oi++) { const it = order[oi]; if (itemKind[it] !== 1 || (!boardPW[it] && !MODEL_STATE.admitted.has(it))) continue;
    const sc = boardScale[it], hw = A.halfWidth * sc, foe = boardFoe[it], top = MODEL_STATE.admitted.has(it) ? nativeBoardTop(foe, sc, draws[itemRef[it]].nativeHeight) : Math.max(A.height * sc,draws[itemRef[it]].nativeHeight||0), X = boardWX[it], Y = boardWY[it], isPlayer = draws[itemRef[it]] === capturedPlayer, b = Math.max(isPlayer ? At.nearFade : 0, Math.min(1, boardB[it])); // the Wayfarer never fainter than nearFade (nothing see-through)
    const draw = draws[itemRef[it]];
    boardBase = surfaceZ(g.map, draw.nativeSupportX??X, draw.nativeSupportY??(Y-.07))
      + (interiorTerrain(g.map) ? closeViewActorLift(draw, MODEL_STATE.admitted.has(it)) : 0);
    const u0 = boardSX[it] / tw, u1 = (boardSX[it] + boardPW[it]) / tw, v0 = boardSY[it] / th2, v1 = (boardSY[it] + boardPH[it]) / th2;
    const residual = MODEL_STATE.admitted.has(it);
    const statusAlpha = residual && foe ? closeViewCreatureIntrinsicAlpha(foe) : 1;
    const fl = !residual && foe && foe.hitFlash > 0 ? Cu.flash * Math.min(1, foe.hitFlash / Cu.flashSec) : 0, gh = residual ? 0 : isPlayer ? 1 + At.silAlpha : foe ? At.silAlpha * .7 * Math.min(1, b * 2) : 0, li = Math.max(bl0, Math.min(bl1, lightLevel(F, X, Y, .9 * sc) * 1.6));
    if (boardPW[it]) { const front=residual?(draw.nativePanelOffset||0):0,bx=X-CAM.fx*front,by=Y-CAM.fy*front, ax = draw.wallAligned ? Math.sign(RX) || 1 : RX, ay = draw.wallAligned ? 0 : RY, lx = bx - ax * hw, ly = by - ay * hw, rxp = bx + ax * hw, ryp = by + ay * hw, zb = -A.below;
    BV(lx, ly, zb, u0, v1, b, fl, gh, li); BV(rxp, ryp, zb, u1, v1, b, fl, gh, li); BV(rxp, ryp, top, u1, v0, b, fl, gh, li); BV(lx, ly, zb, u0, v1, b, fl, gh, li); BV(rxp, ryp, top, u1, v0, b, fl, gh, li); BV(lx, ly, top, u0, v0, b, fl, gh, li); }
    if (foe || isPlayer) { if (MODEL_STATE.admitted.has(it)) shadow(X, Y, sc, statusAlpha); const r = Cs.radius * sc; flatD(X, Y - .05, r * 1.15, 0, Cs.alpha * b * 1.6 * statusAlpha, 0);
      if (foe && foeWindingUp(foe)) flatD(X, Y - .05, r * (1 + Cu.ring) * 1.15, 1, Cu.ringAlpha * b * statusAlpha, CLOSE_VIEW.gl.ringWidth); } }
  GLB.nBoard = bv;
  // outdoors: a soft shadow under each standing tree near the Wayfarer, cast a little away from the sun
  if (F.outdoor) { const Ts = OUTDOOR.treeShadow; for (const o of g.map.objects || []) { if (!outdoorTreeObject(o)) continue; const X = Number(o.x) + .5 - F.sun[0] * .35, Y = Number(o.y) + .72 - F.sun[1] * .35;
    if (Math.hypot(X - px, Y - py) > F.reach) continue; flatD(X, Y, Ts.r * OUTDOOR.trees[o.vegetationForm].r / OUTDOOR.trees.canopy.r + .15, 0, Ts.alpha, 0); } }
  // a soft shadow under each prop drawn as a solid (OUTDOOR.props), a little away from the sun outdoors
  if (F.outdoor || F.props) { const Ps = OUTDOOR.props.shadow, list = (F.outdoor ? openWorld?.props : propScene(g.map, propZ, seen)?.props)?.objects; if (list) for (const o of list) {
    const X = Number(o.x) + .5 - (F.outdoor ? F.sun[0] * .2 : 0), Y = Number(o.y) + .62 - (F.outdoor ? F.sun[1] * .2 : 0); if (Math.hypot(X - px, Y - py) > F.reach) continue; flatD(X, Y, Ps.r, 0, Ps.alpha, 0); } }
  // card props near the Wayfarer: cobwebs, chains, bones (the nearest `cards`), and the spikes of traps that are up
  { const P = At.props, C2 = st.cards, cap = Q.cards ?? P.cards; let used = 0; const H0 = Wl.height;
    for (let i = 0; i < st.nCards && used < cap; i++) { const o = i * CARD_FLOATS, X = C2[o + 1], Y = C2[o + 2]; if (Math.hypot(X - px, Y - py) > P.reach || Math.hypot(X - CAM.cx, Y - CAM.cy) < P.nearCam) continue; // never a card right at the lens if (seen && !seen(Math.floor(X + (C2[o] === 4 ? C2[o + 5] * .5 : 0)), Math.floor(Y + (C2[o] === 4 ? C2[o + 6] * .5 : 0)))) continue; used++;
      const kind = C2[o];
      if (kind === 4) { const ux = C2[o + 3], uy = C2[o + 4], nx = C2[o + 5], ny = C2[o + 6], sz = C2[o + 7], cxp = X + (ux + nx) * .05, cyp = Y + (uy + ny) * .05, li = Math.max(.25, lightLevel(F, X, Y, H0 - .3));
        room(3); DV(cxp, cyp, H0 - sz * .75, -1, -1, 4, .75, 0, li); DV(X + ux * sz, Y + uy * sz, H0 - .02, 1, -1, 4, .75, 0, li); DV(X + nx * sz, Y + ny * sz, H0 - .02, -1, 1, 4, .75, 0, li); }
      else if (kind === 5) { const len = C2[o + 3]; card(X, Y, H0 - len, H0, .045, 5, 1, len, Math.max(.2, lightLevel(F, X, Y, H0 - len * .5))); }
      else if (kind === 8) flatD(X, Y, .3, 8, 1, C2[o + 3], Math.max(.2, lightLevel(F, X, Y, .05))); }
    for (const o of g.map.objects || []) { if (o.kind !== "trap" || o.gas || (o.trapType && o.trapType !== "spikes") || (o.phase !== "active" && o.phase !== "warning")) continue;
      const ox = Number(o.x), oy = Number(o.y); if (Math.hypot(ox + .5 - px, oy + .5 - py) > P.reach || (seen && !seen(Math.floor(ox), Math.floor(oy)))) continue; const hgt = o.phase === "active" ? .26 : .07, li = Math.max(.3, lightLevel(F, ox + .5, oy + .5, .1));
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) card(ox + .2 + i * .3, oy + .2 + j * .3, 0, hgt, .035, 7, 1, 0, li); } }
  GLB.nGlowStart = dv;
  // added in light: wind-up glows, the flames of the lights in reach, their halos, and dust drifting near them (full tier)
  if (g.playerFire?.left > 0) for (let oi = 0; oi < n; oi++) {
    const it = order[oi], draw = draws[itemRef[it]];
    if (itemKind[it] !== 1 || draw !== capturedPlayer || !MODEL_STATE.admitted.has(it)) continue;
    const X = boardWX[it], Y = boardWY[it], support = surfaceZ(g.map, X, Y - .07) + closeViewActorLift(draw, true);
    const statusNow = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now;
    const knocked = statusNow < (g.player.stunnedUntil || 0), form = playerFormPresentation(g), body = knocked ? .35 : form ? form.head * .52 : .72;
    for (let i = 0; i < 3; i++) {
      const phase = reduce ? i * 2.094 : statusNow / 150 + i * 2.094;
      const side = (i - 1) * .15 + (reduce ? 0 : Math.sin(phase) * .035);
      const height = .22 + i * .045 + (reduce ? 0 : Math.sin(phase * 1.7) * .025);
      card(X + CAM.rx * side, Y + CAM.ry * side, support + body - height * .45, support + body + height, .055, 3, .82, i & 1 ? 0xffae2a : 0xff5a1a, 1, true);
    }
    break;
  }
  for (let oi = 0; oi < n; oi++) { const it = order[oi]; const foe = boardFoe[it]; if (itemKind[it] !== 1 || (!boardPW[it] && !MODEL_STATE.admitted.has(it)) || !foe || !foeWindingUp(foe)) continue;
    const sc = boardScale[it], X = boardWX[it], Y = boardWY[it], b = Math.max(0, Math.min(1, boardB[it])) * (MODEL_STATE.admitted.has(it) ? closeViewCreatureIntrinsicAlpha(foe) : 1), pulse = reduce ? .5 : .5 + .5 * Math.sin(now / Cu.pulseMs * 6.2832), a = (Cu.glow + (Cu.glowPeak - Cu.glow) * pulse) * b, hs = A.halfWidth * sc * 1.1, zc = A.height * .45 * sc;
    room(6); DV(X - RX * hs, Y - RY * hs, zc - hs, -1, -1, 2, a, 0, 1); DV(X + RX * hs, Y + RY * hs, zc - hs, 1, -1, 2, a, 0, 1); DV(X + RX * hs, Y + RY * hs, zc + hs, 1, 1, 2, a, 0, 1);
    DV(X - RX * hs, Y - RY * hs, zc - hs, -1, -1, 2, a, 0, 1); DV(X + RX * hs, Y + RY * hs, zc + hs, 1, 1, 2, a, 0, 1); DV(X - RX * hs, Y - RY * hs, zc + hs, -1, 1, 2, a, 0, 1); }
  { const fw = At.flame[0], fh = At.flame[1], halo = At.flame[2], Fl = st.flames;
    for (let i = 0; i < st.nFlames; i++) { const o = i * FLAME_FLOATS, X = Fl[o], Y = Fl[o + 1]; if (Math.hypot(X - px, Y - py) > F.reach) continue; if (seen && !seen(Math.floor(X), Math.floor(Y))) continue;
      const k = Fl[o + 3], wob = reduce ? 1 : 1 + .12 * Math.sin(now / 90 + Fl[o + 5]) + .06 * Math.sin(now / 37 + Fl[o + 5] * 2); card(X, Y, Fl[o + 2] - fh * k * .5, Fl[o + 2] + fh * k * wob, fw * k, 3, 1, Fl[o + 4], 1, true); }
    for (let j = 0; j < nk; j++) { const o = PICK.idx[j] * LIGHT_FLOATS, r = halo * (L[o + 7] === 1 ? .7 : 1) * (L[o + 5] === 1 ? 1.6 : 1); card(L[o], L[o + 1], L[o + 2] - r, L[o + 2] + r, r, 9, .3 * Math.min(1.4, F.lc[j * 4 + 3]), L[o + 5], 1, true); }
    if (Q.motes) { const M = At.motes, t = reduce ? 0 : now / 1000; for (let j = 0; j < Math.min(nk, M.of); j++) { const o = PICK.idx[j] * LIGHT_FLOATS;
        for (let m = 0; m < M.per; m++) { const hx = hash32(PICK.idx[j] * 131 + m * 7) / 4294967296, hy = hash32(PICK.idx[j] * 337 + m * 11) / 4294967296, hz = hash32(PICK.idx[j] * 521 + m * 13) / 4294967296;
          const X = L[o] + (hx - .5) * 1.6 + Math.sin(t * M.drift + m) * .15, Y = L[o + 1] + (hy - .5) * 1.6 + Math.cos(t * M.drift * .8 + m * 1.7) * .15, Z = .4 + hz * 1.8 + Math.sin(t * M.drift * .5 + m * 2.3) * .2;
          card(X, Y, Z - M.size, Z + M.size, M.size, 6, M.alpha * (.4 + .6 * hz), L[o + 5], 1); } } } }
  // Contact glints share the existing additive batch, after the depth-tested actor draw.
  let impacts = 0;
  const impact = CONTACT_GLINT;
  if (!reduce) for (let oi = n - 1; oi >= 0 && impacts < impact.max; oi--) {
    const it = order[oi], foe = boardFoe[it];
    if (itemKind[it] !== 1 || !(foe?.hitFlash > 0) || (!boardPW[it] && !MODEL_STATE.admitted.has(it))) continue;
    const X = boardWX[it], Y = boardWY[it];
    if (!sightTo(g.map, CAM.cx, CAM.cy, X, Y)) continue;
    const a = Math.min(1, foe.hitFlash / MODEL_TIMING.hitSec) * (MODEL_STATE.admitted.has(it) ? closeViewCreatureIntrinsicAlpha(foe) : 1), scale = boardScale[it];
    const z = impact.height * scale, size = impact.radius + (1 - a) * impact.spread, front = impact.front * scale;
    card(X - CAM.fx * front, Y - CAM.fy * front, z - size, z + size, size, 11, a * impact.alpha, impact.color, 0);
    impacts++;
  }
  closeViewGLStats.impactGlints = impacts;
  const echo = closeViewEchoRibbons(g, g.map, g.presentation?.effectiveQuality || "balanced", reduce, (X,Y,Z,lx,ly,a,color,trail) => {
    room(1); DV(X,Y,Z,lx,ly,11,a,color,trail,true);
  });
  closeViewGLStats.echoRibbonPaths = echo.paths;
  closeViewGLStats.echoRibbonVertices = echo.vertices;
  const trail = MODEL_STATE.cleaverTrail;
  if (trail.visible && !reduce && trail.count > 1) {
    const sample = trail.samples;
    const logicalNow = g.paused && finite(g.pauseStarted) ? g.pauseStarted : now;
    const latest = (trail.count - 1) * 7;
    for (let start = 0; start < latest; start += 7) {
      const end = start + 7, age = logicalNow - sample[start + 6];
      if (age < 0 || age > 70) continue;
      if (Math.hypot(sample[start + 3] - sample[end + 3], sample[start + 4] - sample[end + 4], sample[start + 5] - sample[end + 5]) > .8) continue;
      if (!toolCueSegmentOpen(g.map, sample[start + 3], sample[start + 4], sample[end + 3], sample[end + 4])) continue;
      const alpha = trail.alpha * .36 * (1 - age / 70);
      room(6);
      const vertex = (i, x, y) => DV(sample[i], sample[i + 1], sample[i + 2], x, y, 11, alpha, 0xc8aa83, 1, true);
      vertex(start, -1, -1); vertex(end, 1, -1); vertex(end + 3, 1, 1);
      vertex(start, -1, -1); vertex(end + 3, 1, 1); vertex(start + 3, -1, 1);
    }
  }
  // Accepted release cue follows this frame's actual final socket. It never moves the shot.
  if(MODEL_STATE.toolEmissionReady&&MODEL_STATE.toolRelease){const release=MODEL_STATE.toolRelease,releaseNow=g.paused&&Number.isFinite(g.pauseStarted)?g.pauseStarted:now,elapsed=Math.max(0,release.durationMs-Math.max(0,(g.player.actionVisualUntil||0)-releaseNow)),age=toolUseReleaseAge(release,elapsed);
    if(age!==null&&age<=58){const a=(1-age/58)*(reduce?.42:.82)*MODEL_STATE.toolAlpha,r=.045;room(6);card(MODEL_STATE.toolEmission[0],MODEL_STATE.toolEmission[1],MODEL_STATE.toolEmission[2]-r,MODEL_STATE.toolEmission[2]+r,r,11,a,0xffc56b,0,true);}
    if(age!==null&&!reduce&&age<=120&&release.toolShotId){let shot=null;for(const q of shots||[])if(q.id===release.toolShotId&&!q.dead&&!q.returning&&!q.impact){shot=q;break;}if(shot&&!(shotMuzzleWeight(g,shot)>0)){const head=projectileVisualPoint(shot,surfaceZ(g.map,shot.x,shot.y));if(closeViewToolConnectorWithin(MODEL_STATE.toolEmission,head,release.aim)&&toolCueSegmentOpen(g.map,MODEL_STATE.toolEmission[0],MODEL_STATE.toolEmission[1],head.x,head.y)){const r=.014,a=.45*(1-age/120)*MODEL_STATE.toolAlpha;room(6);DV(MODEL_STATE.toolEmission[0],MODEL_STATE.toolEmission[1],MODEL_STATE.toolEmission[2]-r,-1,-1,11,a,0xffd38a,1,true);DV(head.x,head.y,head.z-r,1,-1,11,a,0xffd38a,1,true);DV(head.x,head.y,head.z+r,1,1,11,a,0xffd38a,1,true);DV(MODEL_STATE.toolEmission[0],MODEL_STATE.toolEmission[1],MODEL_STATE.toolEmission[2]-r,-1,-1,11,a,0xffd38a,1,true);DV(head.x,head.y,head.z+r,1,1,11,a,0xffd38a,1,true);DV(MODEL_STATE.toolEmission[0],MODEL_STATE.toolEmission[1],MODEL_STATE.toolEmission[2]+r,-1,1,11,a,0xffd38a,1,true);}}}
  }
  { const c = g.carbine?.charge; if (c && MODEL_STATE.muzzleReady && carbineCharged(c.held)) { const k = carbineFill(c.held), m = MODEL_STATE.muzzle, pulse = reduce ? 1 : 1 + .12 * Math.sin(now / 55), r = (.045 + .07 * k) * pulse;
    card(m[0], m[1], m[2] - r * 1.9, m[2] + r * 1.9, r * 1.9, 11, .3 + .3 * k, LUMEN_CARBINE.colors.glow, 0, true); card(m[0], m[1], m[2] - r * .7, m[2] + r * .7, r * .7, 11, .95, 0xeafcff, 0, true); } } // the Lumen Carbine's charge
  // Spells arbitrate the same single release lane after final-pose sampling. Fire may link only its
  // immutable accepted central source; Orbit deliberately has no connector.
  if(!MODEL_STATE.toolEmissionReady&&MODEL_STATE.spellEmissionReady&&MODEL_STATE.spellRelease){const release=MODEL_STATE.spellRelease,at=MODEL_STATE.spellEmission,releaseNow=g.paused&&finite(g.pauseStarted)?g.pauseStarted:now,duration=release.durationMs||MODEL_TIMING.castMs,age=Math.max(0,duration-Math.max(0,(g.player.castUntil||0)-releaseNow));
    if(age<=58){const a=(1-age/58)*(reduce?.42:.82)*MODEL_STATE.spellAlpha,r=.045;room(6);card(at[0],at[1],at[2]-r,at[2]+r,r,11,a,release.profile==='orbit-launch'?0xb48cff:0xff7a2a,0,true);}
    if(!reduce&&release.profile==='fan-release'&&age<=120){let shot=null;for(const e of shots?.entries||[])if(e.kind==='fire'&&e.source.id===release.sourceId){shot=e.source;break;}if(shot&&!shot.dead&&!shot.impact&&!shot.returning&&!shot.shadow&&!shot.echo){const X=shot.x,Y=shot.y,Z=surfaceZ(g.map,X,Y)+SHOT_DRAW.height,dx=X-at[0],dy=Y-at[1],dz=Z-at[2],forward=dx*release.aim.x+dy*release.aim.y;if(forward>0&&Math.hypot(dx,dy)<=.9&&Math.hypot(dx,dy,dz)<=.9&&toolCueSegmentOpen(g.map,at[0],at[1],X,Y)){const r=.014,a=.45*(1-age/120)*MODEL_STATE.spellAlpha;room(6);DV(at[0],at[1],at[2]-r,-1,-1,11,a,0xff9a4a,1,true);DV(X,Y,Z-r,1,-1,11,a,0xff9a4a,1,true);DV(X,Y,Z+r,1,1,11,a,0xff9a4a,1,true);DV(at[0],at[1],at[2]-r,-1,-1,11,a,0xff9a4a,1,true);DV(X,Y,Z+r,1,1,11,a,0xff9a4a,1,true);DV(at[0],at[1],at[2]+r,-1,1,11,a,0xff9a4a,1,true);}}}
  }
  // Project a latched launch offset, when present, into the same depth-tested flame batch. Physics stays untouched.
  for (const entry of shots?.entries || []) {
    const shot=entry.source;
    if(entry.kind==="orbit"){
      const X=entry.geom.x,Y=entry.geom.y,z=entry.geom.z,size=shot.radius>1.1?.32:.22,color=shot.perfect?0xffd86a:0xb48cff;
      room(6);card(X,Y,z-size,z+size,size,11,SHOT_DRAW.headAlpha,color,0,true);continue;
    }
    const fire=entry.kind==="fire",head=fire?entry.geom:projectileVisualPoint(shot,surfaceZ(g.map,shot.x,shot.y)),mw=fire?0:shotMuzzleWeight(g,shot),X=head.x+MUZZLE_OFF[0]*mw,Y=head.y+MUZZLE_OFF[1]*mw,z=head.z+MUZZLE_OFF[2]*mw,magic = shot.damageType === "magic";
    const size = fire?.2:(magic ? SHOT_DRAW.magicSize : SHOT_DRAW.minSize) * Math.max(.55, Math.min(2, shot.scale || 1));
    const hue = fire?"#ff7a2a":standardProjectileColor(shot);
    if (!SHOT_COLORS.has(hue)) SHOT_COLORS.set(hue, parseInt(hue.slice(1), 16));
    const color = SHOT_COLORS.get(hue);
    if (!reduce) {
      const d = Math.hypot(shot.dx, shot.dy);
      if (d > 1e-4) {
        const beam = !fire && shot.carbine === true && finite(shot.bx) && finite(shot.by); // the Lumen Carbine: a beam from where it left the muzzle
        const trailTime = beam ? Math.max(0, shot.age || 0) : Math.min(SHOT_DRAW.trailSeconds, Math.max(0, shot.age || 0));
        const length = beam ? Math.min(SHOT_DRAW.beamTrail, Math.hypot(shot.x - shot.bx, shot.y - shot.by)) : Math.min(SHOT_DRAW.maxTrail, Math.max(0, shot.speed || 0) * trailTime);
        const px=shot.x-shot.dx*length/d,py=shot.y-shot.dy*length/d;if(!fire||entry.geom.tail){const tail=fire?entry.geom.tail:projectileVisualPoint(shot,surfaceZ(g.map,px,py),px,py,Math.max(0,(shot.age||0)-trailTime)),tw=mw>0?closeViewMuzzleWeight((shot.age||0)-trailTime):0,tx=tail.x+MUZZLE_OFF[0]*tw,ty=tail.y+MUZZLE_OFF[1]*tw,tz=tail.z+MUZZLE_OFF[2]*tw,r = size * .75;
        room(6);
        DV(tx, ty, tz - r, -1, -1, 11, SHOT_DRAW.trailAlpha, color, 1, true);
        DV(X, Y, z - r, 1, -1, 11, SHOT_DRAW.trailAlpha, color, 1, true);
        DV(X, Y, z + r, 1, 1, 11, SHOT_DRAW.trailAlpha, color, 1, true);
        DV(tx, ty, tz - r, -1, -1, 11, SHOT_DRAW.trailAlpha, color, 1, true);
        DV(X, Y, z + r, 1, 1, 11, SHOT_DRAW.trailAlpha, color, 1, true);
        DV(tx, ty, tz + r, -1, 1, 11, SHOT_DRAW.trailAlpha, color, 1, true);}
      }
    }
    card(X, Y, z - size, z + size, size, 11, SHOT_DRAW.headAlpha, color, 0, true);
  }
  closeViewGLStats.projectedShots = shots?.entries?.length || 0;
  GLB.nDecal = dv;
  if (!drawSceneGL(GROUND.canvas, UNI, models, MODEL_STATE.hero, MODEL_STATE.beasts)) return false;
  ctx.save(); try { ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.drawImage(closeViewGLCanvas(), 0, 0, F.devW, F.devH, 0, 0, w, h); } finally { ctx.restore(); }
  return true;
  } catch { return false; }
}

// ------------------------------------------------------------------------------------------------ the crescent and the lock button
// mountCloseViewControls(getGame): the pan crescent round the action cluster (#actions .action-diamond) and the lock button at
// its top (CLOSE_VIEW.crescent), shown only while Close View is showing (call controls.sync() once a frame). The crescent is an
// SVG drawn beneath the action buttons, answering only on its stroke band, so a button always wins where they overlap; each
// press captures its own pointer, so the move stick (a drag on the canvas) and the buttons keep theirs: you move and pan at
// once. None of its events reach the canvas. Without an action cluster it mounts nothing.
export function mountCloseViewControls(getGame, host = globalThis) {
  const doc = host.document, actions = doc?.getElementById?.("actions"), cluster = actions?.querySelector?.(".action-diamond"); if (!cluster) return { sync() {}, svg: null, lock: null };
  const K = CLOSE_VIEW.crescent, NS = "http://www.w3.org/2000/svg", svg = doc.createElementNS(NS, "svg"), rail = doc.createElementNS(NS, "path"), hit = doc.createElementNS(NS, "path"), outer = doc.createElementNS(NS, "path"), lock = doc.createElement("button");
  svg.id = "closeViewCrescent"; svg.setAttribute("aria-hidden", "true"); Object.assign(svg.style, { position: "absolute", overflow: "visible", pointerEvents: "none", display: "none", zIndex: "0" });
  rail.setAttribute("fill", "none"); rail.setAttribute("stroke-linecap", "round"); rail.setAttribute("stroke", "#ddd5c4"); rail.setAttribute("stroke-opacity", String(K.idle)); rail.setAttribute("stroke-width", String(K.width)); rail.setAttribute("stroke-dasharray", "2 7");
  hit.setAttribute("fill", "none"); hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", String(K.band * 2)); hit.setAttribute("stroke-linecap", "round"); hit.style.pointerEvents = "stroke"; hit.style.touchAction = "none"; hit.style.cursor = "ew-resize";
  // version 4: `outer`, the wider band beyond the arc (never drawn), where it is clear of everything else
  outer.setAttribute("fill", "none"); outer.setAttribute("stroke", "transparent"); outer.setAttribute("stroke-width", String(K.reach)); outer.setAttribute("stroke-linecap", "butt"); outer.style.pointerEvents = "stroke"; outer.style.touchAction = "none"; outer.style.cursor = "ew-resize";
  svg.append(rail, hit, outer); actions.insertBefore(svg, cluster); // before the cluster: beneath its buttons
  lock.type = "button"; lock.id = "closeViewLock"; lock.className = "close-lock"; lock.setAttribute("aria-label", "Target and recenter behind the Wayfarer: auto-targets foe after foe while lit red; tap again to turn it off; swipe the camera left or right to switch"); lock.setAttribute("aria-pressed", "false"); lock.setAttribute("data-target-mode", "off");
  // version 3 (Tim): a bullseye, concentric rings and a centre dot; locked, the inner ring fills (styles.css .close-lock)
  lock.innerHTML = '<svg class="bullseye" viewBox="0 0 24 24" width="52%" height="52%" aria-hidden="true" style="pointer-events:none;position:relative"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><circle class="bull-ring" cx="12" cy="12" r="6.2" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>';
  Object.assign(lock.style, { position: "absolute", width: `${K.lockSize}px`, height: `${K.lockSize}px`, padding: "0", borderRadius: "50%", border: "0", background: "none", color: "#ddd5c4", display: "none", placeItems: "center", pointerEvents: "auto", touchAction: "manipulation", zIndex: "2" });
  cluster.after(lock);
  const movePad = doc.createElement("div");
  movePad.className = "close-move-pad";
  movePad.setAttribute("aria-hidden", "true");
  movePad.hidden = true;
  actions.insertBefore(movePad, cluster);
  const touchDevice = () => !!(host.navigator?.maxTouchPoints || host.matchMedia?.("(any-pointer: coarse)")?.matches);
  let moveId = null;
  const clearMovePad = () => { moveId = null; movePad.setAttribute("data-active", "false"); };
  let autoShown = false, cx = 0, cy = 0, R = 0, laidAt = -1e9, shown = false, locked = false, id = null, lastA = 0, lastR = 0, downAt = 0, moved = 0, lastTap = -1e9, swipe = 0, switched = false, lastMoveAt = 0, mode = "drag";
  const now = () => (host.performance || performance).now();
  // version 4: the turn is fed in, then eased onto the view by sync() (once a frame); a release applies what is left
  const PEND = { dx: 0, dy: 0, at: -1 };
  const flush = (t) => { if (PEND.dx || PEND.dy) closeViewPan(PEND.dx, PEND.dy, t); PEND.dx = PEND.dy = 0; };
  const sens = () => { const k = Number(getGame()?.save?.closeViewSensitivity); return Number.isFinite(k) && k > 0 ? k : 1; };
  const accelOf = (dist, ms, A, from, to) => { const v = ms > 0 ? dist / ms * 1000 : to; return 1 + A * Math.max(0, Math.min(1, (v - from) / (to - from))); };
  // Pan uses the player's sensitivity; a lock switch uses raw finger travel and fires once per captured gesture.
  const turn = (g, px, py, t, switchPx) => { if (g.lockedTarget?.()) { swipe += switchPx; if (!switched && Math.abs(swipe) >= CLOSE_VIEW.lock.switchSwipe) { closeViewLockSwitch(g, Math.sign(swipe)); switched = true; } CAM.panAt = t; return; } PEND.dx += px; PEND.dy += py; CAM.panAt = t; };
  // The lock button's screen rect: beside Tool in drag mode; outside the visible rail in crescent mode.
  const lockRect = (scx, scy, vw) => {
    const s = K.lockSize, right = Number.isFinite(vw) ? vw - K.lockEdge : scx + R + K.band;
    let top = scy - R - K.band - K.lockGap - s;
    if (mode === "drag") {
      // The hidden crescent need not push the default lock far above the thumb. Prefer the empty
      // upper-right cell beside Tool, then move up in a bounded search if another control occupies it.
      const bounds = cluster.getBoundingClientRect(), vh = host.innerHeight || 1e9;
      top = Math.max(K.edge, Math.min(vh - s - K.edge, bounds.top));
      const boxes = [];
      for (const el of actions.querySelectorAll?.("button, .nav-compass") || []) {
        if (el === lock || el.hidden || el.offsetParent === null) continue;
        const b = el.getBoundingClientRect(); if (b.width > 0 && b.height > 0) boxes.push(b);
      }
      for (let step = 0; step < 32; step++) {
        if (!boxes.some((b) => right > b.left - K.clear && right - s < b.right + K.clear && top + s > b.top - K.clear && top < b.bottom + K.clear)) break;
        top = Math.max(K.edge, top - 8);
      }
    }
    return { left: right - s, top, right, bottom: top + s };
  };
  // The arc's two ends (degrees, A0 > A1, drawn from A0 down over the top to A1): K.from and K.to, each drawn back until the
  // arc clears every other control in #actions (Spell A and B, Map, Pack, the lock button) and stays on the screen.
  const crescentSpan = () => { const A0 = K.from, A1 = K.to - 360, lockA = K.mid; if (!cluster.getBoundingClientRect) return [A0, A1];
    const c = cluster.getBoundingClientRect(), scx = c.left + c.width / 2, scy = c.top + c.height / 2, pad = K.band + K.clear, vw = host.innerWidth || 1e9, vh = host.innerHeight || 1e9, boxes = [lockRect(scx, scy, host.innerWidth)];
    for (const el of actions.querySelectorAll?.("button, .nav-compass") || []) { if (el === lock || cluster.contains?.(el) || el.hidden || el.offsetParent === null) continue; const b = el.getBoundingClientRect(); if (b.width > 0 && b.height > 0) boxes.push(b); }
    const clear = (deg) => { const x = scx + R * Math.cos(deg * DEG), y = scy + R * Math.sin(deg * DEG);
      if (x < K.edge + K.band || x > vw - K.edge - K.band || y > vh - K.edge) return false;
      for (const b of boxes) if (x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad) return false; return true; };
    const reach = (dir, limit, ok = clear) => { let a = lockA; while ((dir > 0 ? a + K.step <= limit : a - K.step >= limit) && ok(a + dir * K.step)) a += dir * K.step; return a; };
    const S0 = Math.max(lockA + K.minSpan, Math.min(A0, reach(1, A0))), S1 = Math.min(lockA - K.minSpan, Math.max(A1, reach(-1, A1)));
    // the outer band: where every point out to `reach` px beyond the arc is clear, on the screen, and right of the stick's side
    const clearOut = (deg) => { for (const k of [0, .5, 1]) { const r = R + K.band + K.reach * k, x = scx + r * Math.cos(deg * DEG), y = scy + r * Math.sin(deg * DEG);
        if (x < vw * K.stickShare || x < K.edge || x > vw - K.edge || y < K.edge || y > vh - K.edge) return false;
        for (const b of boxes) if (x > b.left - K.clear && x < b.right + K.clear && y > b.top - K.clear && y < b.bottom + K.clear) return false; } return true; };
    const O0 = clearOut(lockA) ? reach(1, S0, clearOut) : NaN, O1 = clearOut(lockA) ? reach(-1, S1, clearOut) : NaN;
    return [S0, S1, O0, O1]; };
  const layout = () => { const w = cluster.offsetWidth || 162, h = cluster.offsetHeight || w; R = w / 2 + K.gap; const S = 2 * (R + K.band + K.reach + 4);
    cx = cluster.offsetLeft + w / 2; cy = cluster.offsetTop + h / 2; Object.assign(svg.style, { left: `${cx - S / 2}px`, top: `${cy - S / 2}px`, width: `${S}px`, height: `${S}px` }); svg.setAttribute("viewBox", `${-S / 2} ${-S / 2} ${S} ${S}`);
    const [A0, A1, O0, O1] = crescentSpan(), arcPath = (r, b0, b1) => { const p0 = [r * Math.cos(b0 * DEG), r * Math.sin(b0 * DEG)], p1 = [r * Math.cos(b1 * DEG), r * Math.sin(b1 * DEG)]; return `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r} ${r} 0 ${b0 - b1 > 180 ? 1 : 0} 0 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`; };
    const d = arcPath(R, A0, A1); rail.setAttribute("d", d); hit.setAttribute("d", d); svg.setAttribute("data-span", `${A0} ${A1}`);
    if (Number.isFinite(O0) && O0 - O1 >= K.step) { outer.setAttribute("d", arcPath(R + K.band + K.reach / 2, O0, O1)); svg.setAttribute("data-outer", `${O0} ${O1}`); } else { outer.setAttribute("d", ""); svg.setAttribute("data-outer", ""); }
    { const c = cluster.getBoundingClientRect?.() || { left: cx - w / 2, top: cy - h / 2, width: w, height: h }, a = actions.getBoundingClientRect?.() || { left: 0, top: 0 }, L0 = lockRect(c.left + c.width / 2, c.top + c.height / 2, host.innerWidth);
      Object.assign(lock.style, { left: `${L0.left - a.left}px`, top: `${L0.top - a.top}px` }); } laidAt = now(); };
  const polar = (e) => { const b = svg.getBoundingClientRect(), x = e.clientX - (b.left + b.width / 2), y = e.clientY - (b.top + b.height / 2); return [Math.atan2(y, x), Math.hypot(x, y)]; };
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  // version 4: the finger's own travel round the cluster (at its own radius, never less than the arc's) turns the view, faster
  // for a quick swipe; both bands (the arc's and the wider one beyond it) answer the same way
  const down = (el) => (e) => { stop(e); if (id !== null) return; id = e.pointerId; [lastA, lastR] = polar(e); downAt = lastMoveAt = now(); CAM.panAt = downAt; moved = 0; swipe = 0; switched = false; el.setPointerCapture?.(id); rail.setAttribute("stroke-opacity", String(K.active)); rail.setAttribute("stroke-dasharray", ""); };
  const drag = (e) => { if (e.pointerId !== id) return; stop(e); const [a, r] = polar(e), da = wrap(a - lastA), dr = r - lastR, travel = da * Math.max(R, Math.min(r, R + K.band + K.reach)); lastA = a; lastR = r; moved += Math.abs(travel) + Math.abs(dr);
    const g = getGame(); if (!g) return; const t = now(), k = K.gain * sens() * accelOf(Math.abs(travel), t - lastMoveAt, K.accel, K.accelFrom, K.accelTo); lastMoveAt = t;
    turn(g, travel * k, -dr * K.radialPitch, t, travel); };
  const end = (e) => { if (e.pointerId !== id) return; stop(e); id = null; rail.setAttribute("stroke-opacity", String(K.idle)); rail.setAttribute("stroke-dasharray", "2 7"); const t = now(); flush(t);
    if (t - downAt < K.tapMs && moved < K.tapMove) { if (t - lastTap < K.doubleTapMs) { const g = getGame(); if (g) closeViewRecentre(g, t); lastTap = -1e9; } else lastTap = t; } else CAM.panAt = t; };
  for (const el of [hit, outer]) { el.addEventListener("pointerdown", down(el)); el.addEventListener("pointermove", drag); el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("lostpointercapture", (e) => { if (e.pointerId === id) end(e); }); }
  // Drag anywhere (CLOSE_VIEW.drag, the default control): a press on the open screen (the game canvas: a press on any button
  // never reaches it) outside the joystick turns the view until it lifts. The joystick owns only touches that start within
  // its visible circle. In crescent mode, other canvas touches can tap the world or slide without moving the Wayfarer.
  const canvas = doc.getElementById?.("game"), D = CLOSE_VIEW.drag, QT = CLOSE_VIEW.quickTurn; let dragId = null, dragX = 0, dragY = 0, dragAt = 0, dragMoved = 0, dragDown = 0, dragX0 = 0, dragY0 = 0, strokeX = 0, strokeY = 0, strokeAt = 0;
  // the quick turnaround: a stroke down the screen (it restarts whenever the finger goes up again), with the stick held back
  const stroke = (g, x, y, t, dy) => { if (dy < 0 || strokeAt < 0) { strokeX = x; strokeY = y; strokeAt = t; return false; }
    const down = y - strokeY, across = Math.abs(x - strokeX), ms = t - strokeAt;
    if (down >= QT.swipePx && across <= down * QT.slant && ms > 0 && down / ms * 1000 >= QT.swipeSpeed && closeViewStickBack() && closeViewQuickTurn(g, t)) { PEND.dx = PEND.dy = 0; strokeAt = -1; return true; }
    if (ms > 400) { strokeX = x; strokeY = y; strokeAt = t; } return false; };
  const dragging = (e) => e.pointerId === dragId;
  if (canvas?.addEventListener) {
    canvas.addEventListener("pointerdown", (e) => {
      if (!shown) return;
      const split = (host.innerWidth || canvas.clientWidth || 0) * D.side;
      if (e.pointerType === "touch") {
        const pad = movePad.getBoundingClientRect();
        const radius = Math.min(pad.width, pad.height) / 2;
        const inside = radius > 0 && Math.hypot(e.clientX - pad.left - pad.width / 2, e.clientY - pad.top - pad.height / 2) <= radius;
        if (inside && moveId === null) {
          moveId = e.pointerId;
          movePad.setAttribute("data-active", "true");
          return;
        }
        if (inside) { e.stopImmediatePropagation?.(); e.preventDefault?.(); return; }
      } else if (e.clientX < split || mode !== "drag") return;
      e.stopImmediatePropagation?.(); e.preventDefault?.();
      // A non-joystick touch never reaches movement, even when a camera gesture is already active.
      if (dragId !== null) return;
      dragId = e.pointerId; dragX = dragX0 = strokeX = e.clientX; dragY = dragY0 = strokeY = e.clientY; dragAt = dragDown = strokeAt = now(); if (mode === "drag") CAM.panAt = dragAt; dragMoved = 0; swipe = 0; switched = false; try { canvas.setPointerCapture?.(dragId); } catch { /* a synthetic pointer has nothing to capture */ } }, { capture: true });
    canvas.addEventListener("pointermove", (e) => { if (!dragging(e)) return; e.stopImmediatePropagation?.(); const dx = e.clientX - dragX, dy = e.clientY - dragY, t = now(); dragX = e.clientX; dragY = e.clientY; dragMoved = Math.max(dragMoved, Math.hypot(e.clientX - dragX0, e.clientY - dragY0));
      const g = getGame(); if (!g || mode !== "drag") return; const k = sens() * accelOf(Math.hypot(dx, dy), t - dragAt, D.accel, D.accelFrom, D.accelTo); dragAt = t;
      if (stroke(g, e.clientX, e.clientY, t, dy) || closeViewTurning()) return; // the turnaround owns the view while it swings
      turn(g, dx * k * D.yaw / K.yaw, dy * k * D.pitch / K.pitch, t, dx); }, { capture: true });
    const dragEnd = (e) => { if (!dragging(e)) return; e.stopImmediatePropagation?.(); dragId = null; const t = now(); flush(t);
      if (e.type === "pointerup" && dragMoved < D.tapMove && t - dragDown < D.tapMs && typeof CustomEvent === "function") canvas.dispatchEvent?.(new CustomEvent("worldtap", { detail: { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType } }));
      else CAM.panAt = t; };
    for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(t, (e) => {
      if (e.pointerId === moveId) clearMovePad();
      if (t === "lostpointercapture") { if (dragging(e)) { dragId = null; flush(now()); } }
      else dragEnd(e);
    }, { capture: true });
    host.addEventListener?.("blur", () => {
      clearMovePad();
      dragId = null;
      id = null;
      PEND.dx = PEND.dy = 0;
      rail.setAttribute("stroke-opacity", String(K.idle));
      rail.setAttribute("stroke-dasharray", "2 7");
    });
  }
  // the lock: a tap that starts on it (press, release within tapMove px); a pointer already panning the crescent never counts
  let lockId = null, lockX = 0, lockY = 0, lockMoved = false, lockPointerHandled = false;
  const activateLock = () => { const g = getGame(); if (g) { PEND.dx = PEND.dy = 0; closeViewTargetActivate(g, now()); } };
  lock.addEventListener("pointerdown", (e) => {
    stop(e); lockPointerHandled = true;
    if (e.pointerId === id || lockId !== null) return;
    lockId = e.pointerId; lockX = e.clientX; lockY = e.clientY; lockMoved = false; lock.setPointerCapture?.(lockId);
  });
  lock.addEventListener("pointermove", (e) => { if (e.pointerId === lockId && Math.hypot(e.clientX - lockX, e.clientY - lockY) > K.lockTapMove) lockMoved = true; });
  lock.addEventListener("pointerup", (e) => {
    if (e.pointerId !== lockId) return; stop(e); lockId = null;
    if (lockMoved || Math.hypot(e.clientX - lockX, e.clientY - lockY) > K.lockTapMove) return;
    activateLock();
  });
  for (const t of ["pointercancel", "lostpointercapture"]) lock.addEventListener(t, (e) => { if (e.pointerId === lockId) lockId = null; });
  // Keep native button activation, but do not let Space/Enter reach the game's
  // bubbling keyboard bindings. Preventing default here would suppress the click.
  for (const t of ["keydown", "keyup"]) lock.addEventListener(t, (e) => { if (e.key === " " || e.key === "Enter") e.stopPropagation(); });
  lock.addEventListener("click", (e) => {
    stop(e);
    // Pointer release already handled this gesture, including rejected drags and
    // cancellations. Native keyboard/AT and button.click() carry no pointer detail
    // (pointerId -1 or absent), and must remain independent semantic activations.
    const pointerClick = e.detail > 0 || (Number.isFinite(e.pointerId) && e.pointerId >= 0);
    if (lockId !== null || (pointerClick && lockPointerHandled)) return;
    activateLock();
  });
  for (const el of [hit, lock]) for (const t of ["click", "dblclick", "contextmenu"]) if (el !== lock || t !== "click") el.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); });
  host.addEventListener?.("resize", () => { laidAt = -1e9; }, { passive: true });
  return { svg, lock, layout, get dragging() { return dragId !== null; }, sync() { const g = getGame(), want = !!g && !g.paused && closeViewShowing(g), m = closeViewControl(g);
    if (want !== shown || m !== mode) { shown = want; mode = m; svg.style.display = want && mode === "crescent" ? "block" : "none"; lock.style.display = want ? "grid" : "none"; movePad.hidden = !want || !touchDevice(); if (!want) { id = null; dragId = null; PEND.dx = PEND.dy = 0; clearMovePad(); } else laidAt = -1e9; }
    if (!want) return; if (now() - laidAt > 1000) layout();
    { const t = now(), dt = PEND.at >= 0 ? Math.max(0, Math.min(.1, (t - PEND.at) / 1000)) : 1 / 60; PEND.at = t; // ease the fed turn onto the view
      if (id !== null || (mode === "drag" && dragId !== null)) { CAM.panAt = t; if (!g.lockedTarget?.()) CAM.yawV = 0; } // suppress unlocked assist, never erase the selected-target spring's velocity
      if (closeViewTurning()) PEND.dx = PEND.dy = 0;
      if (PEND.dx || PEND.dy) { const sm = mode === "drag" ? D.smooth : K.smooth, take = 1 - Math.exp(-sm * dt), ex = PEND.dx * take, ey = PEND.dy * take; PEND.dx -= ex; PEND.dy -= ey; if (Math.abs(PEND.dx) < .01) PEND.dx = 0; if (Math.abs(PEND.dy) < .01) PEND.dy = 0; closeViewPan(ex, ey, t); } }
    // the button's state: lit red while target mode is on (auto-targeting), the old warm tint for a lock made by a tap alone
    const on = !!g.lockedTarget?.(), auto = CAM.targetMode; if (on !== locked || auto !== autoShown) { locked = on; autoShown = auto; lock.setAttribute("aria-pressed", String(on || auto)); lock.setAttribute("data-target-mode", auto ? "on" : "off");
      lock.style.color = auto ? CLOSE_VIEW.targetButton.on : on ? CLOSE_VIEW.targetButton.locked : CLOSE_VIEW.targetButton.off; lock.style.filter = auto ? CLOSE_VIEW.targetButton.glow : "none"; } } };
}
