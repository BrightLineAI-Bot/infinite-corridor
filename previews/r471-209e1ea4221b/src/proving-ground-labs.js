import { Game } from "./game.js?v=r471-209e1ea4221b";
import { freshSave, migrateSave } from "./types.js?v=r471-209e1ea4221b";
import { generateRegion, generateDungeon, deepDungeonId, WAYGLASS_LATTICE_SIZE, wayglassLatticeAnchor } from "./world.js?v=r471-209e1ea4221b";
import { generateVariedDungeon, generateUnifiedDungeon, generateBespokeArena, ARENA_FAMILIES } from "./arenas.js?v=r471-209e1ea4221b";
import { DEEP_ARCHETYPE_IDS, deepV2Id, generateDeepV2Dungeon } from "./deep-dungeons.js?v=r471-209e1ea4221b";
import { applyDungeonDiscovery, dungeonDiscoveryReport, revealDungeonAt } from "./dungeon-framework.js?v=r471-209e1ea4221b";
import { createCombatant, CREATURE_FORMS, MELEE_PATTERNS } from "./combat.js?v=r471-209e1ea4221b";
import { varyDungeonLayout } from "./dungeon-variation.js?v=r471-209e1ea4221b";
import { ELITE_DEFINITIONS } from "./elites.js?v=r471-209e1ea4221b";
import { PACK_KINDS, isPackKind, MONSTER_PACK } from "./monster-pack.js?v=r471-209e1ea4221b";
import { BIOMES, biomeFor } from "./landscape.js?v=r471-209e1ea4221b";
import { GLYPH_IDS, RESONANCES, GLYPHS, ensureGlyphState, normalizeSockets } from "./glyphs.js?v=r471-209e1ea4221b";
import { ECHO_IDS, ensureEchoState } from "./echoes.js?v=r471-209e1ea4221b";
import { ensureConstellation } from "./constellation.js?v=r471-209e1ea4221b";
import { generateExpeditionDungeon, LAYOUTS, UNDER_THEMES } from "./underlands.js?v=r471-209e1ea4221b";
import { placeRelayNode, ensureRelayNetwork } from "./relay-network.js?v=r471-209e1ea4221b";
import { generateItem, ITEM_TIERS, APERTURE_SKILLS, APERTURE_BANDS, compareItemStats, upgradeEquipment, learnApertureSkill, apertureBand } from "./items.js?v=r471-209e1ea4221b";

export const DEFAULT_PROVING_SEED = "CINDER-VERGE-47";

function roundTripScratch(save) { return migrateSave(JSON.parse(JSON.stringify(save))); }

export const LABORATORIES = [
  { id: "shelters", label: "Shelter & Building Gallery", status: "implemented", description: "Production shelters, displacement devices, and architectural districts." },
  { id: "ordinary-dungeon", label: "Ordinary Dungeon Lab", status: "implemented", description: "Production v4 deterministic exploration topology, discovery, ecology, traps, guardians, and traversal." },
  { id: "forge", label: "Glyph Forge Lab", status: "implemented", description: "Every glyph in the pouch, three-socket relic weapons and a line of practice foes; one scenario per Resonance comes pre-socketed." },
  { id: "underlands", label: "Underlands & Relay Lab", status: "implemented", description: "Generator v5 crossings: six layout grammars, eleven bespoke underground environments with their weather, and a relay node ready to answer." },
  { id: "deep-dungeon", label: "Legacy & Deep Dungeon Lab", status: "implemented", description: "Production deep-v2 archetypes, objectives, levels, shortcuts, and finales." },
  { id: "threefold", label: "Threefold Dungeon Lab", status: "implemented", description: "The production three-wing sealed expedition and its wardens." },
  { id: "landscape", label: "Landscape Pack", status: "implemented", description: "Nearest production overland section of each landscape biome: mountains with stair trails, dune seas, coasts, alien wilds and castles." },
  { id: "test-tile", label: "Standard Test Tile", status: "implemented", description: "One fixed overworld section with water, a chasm, raised blocks with stairs, a building and a dungeon door, for trying creatures and interactions." },
  { id: "combat", label: "Monster & Elite Combat Arena", status: "implemented", description: "Pick an environment and a creature, then press Start test." },
  { id: "wayglass", label: "Wayglass, Checkpoint & Compass Lab", status: "implemented", description: "Production navigation, recovery, migration, Atlas, and dual-arrow fixtures." },
  { id: "environment", label: "Bespoke Environment & District Lab", status: "implemented", description: "Production districts, overworld landmarks, domains, and arena families." },
  { id: "hunts", label: "Hunt, Domain & Boss Arena Lab", status: "implemented", description: "Scratch Viewport lifecycle, creature, elite, and boss-arena fixtures." },
  { id: "inventory", label: "Inventory, Equipment & Reward Lab", status: "implemented", description: "Production item, tier, affix, capacity, vendor, and progression states." },
  { id: "magic", label: "Magic & Aperture Progression Lab", status: "implemented", description: "Aperture bands, learnable buffs, traversal safety, cooldowns, and renewal fixtures." },
  { id: "performance", label: "Performance & Stress Lab", status: "implemented", description: "Controlled production overworld and dungeon workload presets." },
  { id: "recovery", label: "Save, Death & Recovery Lab", status: "implemented", description: "Memory-only death, checkpoint, serialization, migration, and damaged-state fixtures." },
  { id: "scenes", label: "Narrative Scene Lab", status: "implemented", description: "Consequence-free production scene-state and ritual fixtures." },
  { id: "records", label: "Atlas, Journal, Bestiary & Symbols Lab", status: "implemented", description: "Dense Atlas, death marker, codex grouping, symbols, and place records." },
];

const SHELTERS = [
  ["timber", "Timber shelter", DEFAULT_PROVING_SEED, 0, -1],
  ["masonry", "Masonry house", DEFAULT_PROVING_SEED, -2, -2],
  ["gatehouse", "Ruined gatehouse", DEFAULT_PROVING_SEED, 1, 1],
  ["cyber", "Cyber relay", DEFAULT_PROVING_SEED, 1, -4],
  ["alien", "Alien geometric shelter", DEFAULT_PROVING_SEED, 3, 2],
  ["biomechanical", "Biomechanical shelter", DEFAULT_PROVING_SEED, 2, -3],
  ["signaled-displacement", "Signaled displacement shelter", DEFAULT_PROVING_SEED, 3, -2],
  ["hidden-displacement", "Hidden displacement shelter", DEFAULT_PROVING_SEED, 3, 9],
  ["fortress-district", "Broken Citadel district", "architectural-texture", -7, -21],
  ["city-district", "Hollow Ward district", "architectural-texture", -18, -20],
  ["arcology-district", "Lumen Arcology district", "architectural-texture", 1, -20],
  ["cloister-district", "Thorn Cloister district", "architectural-texture", -7, -19],
].map(([id,label,seed,rx,ry])=>({id,label,seed,rx,ry}));

const ORDINARY = ["hollow", "cistern", "kiln"].map((id) => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} topology` }));
const FORGE = [{ id: "sandbox", label: "Sandbox: every glyph, empty sockets" }, { id: "echoes", label: "Echoes: every Creature Echo owned, none set" }, { id: "awakening", label: "Constellation + Awakening: Aperture 90, lumen dust, max-rank relics holding Wildfire" }, ...Object.entries(RESONANCES).map(([id, r]) => ({ id: `resonance-${id}`, label: `${r.name} (${GLYPHS[r.pair[0]].name} + ${GLYPHS[r.pair[1]].name})` }))];
const UNDERLANDS = [...LAYOUTS.map((id) => ({ id: `layout-${id}`, label: `${id[0].toUpperCase()}${id.slice(1)} layout` })), ...Object.entries(UNDER_THEMES).map(([id, t]) => ({ id: `theme-${id}`, label: `${t.name || id} environment` })), { id: "relay-node", label: "Relay node, guardian defeated" }];
const DEEP = [{id:"legacy-v1",label:"Legacy v1 Threefold expedition"},...DEEP_ARCHETYPE_IDS.map((id) => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} deep expedition` }))];
const CREATURES = [...Object.keys(CREATURE_FORMS).filter(id=>!MONSTER_PACK[id]?.prototypeOnly), ...Object.keys(ELITE_DEFINITIONS).filter((id)=>!Object.hasOwn(CREATURE_FORMS,id)),...Object.keys(MELEE_PATTERNS).map(id=>`pattern-${id}`),"pattern-elite-combination","pattern-wall-interruption","pattern-multiple-attackers",...PACK_KINDS.map(id=>`pack-boss-${id}`)].map((id)=>({id,label:id.replace(/([A-Z])/g," $1").replaceAll('-',' ').replace(/^./,c=>c.toUpperCase())}));
const WAYGLASS_SCENARIOS=["unactivated-wayglass","activated-wayglass","travel-pair","rest-point","activated-rest-point","broken-observatory","manual-waypoint","quest-guidance","hunt-guidance","dual-compass","death-marker","save-reconstruction","legacy-migration","drought-corpus"].map(id=>({id,label:id.replaceAll("-"," ").replace(/^./,c=>c.toUpperCase())}));
const ENVIRONMENTS=[...SHELTERS.filter(q=>q.id.endsWith("district")),...ARENA_FAMILIES.map(id=>({id:`arena-${id}`,label:`${id.replaceAll("-"," ")} arena`})),{id:"temporary-hunt-arena",label:"Temporary hunt arena"},{id:"persistent-arena",label:"Persistent arena entrance"},{id:"sentinel-domain",label:"Sentinel manufactory domain"},{id:"rootbound-domain",label:"Rootbound crown domain"}];
const HUNTS=["empty-viewport","tracking-hunt","located-hunt","completed-hunt","failed-hunt","elite-attributes","projectile-patterns","aggro-pursuit","guardian-boss","foundry-review","temporary-arena","persistent-arena"].map(id=>({id,label:id.replaceAll("-"," ").replace(/^./,c=>c.toUpperCase())}));
const INVENTORY=["comparison-arrows","mixed-comparison","empty-slot","weapon-upgrade","armor-upgrade","upgraded-equipment","insufficient-currency","insufficient-spheres","all-slots","tier-affixes","sorting-salvage","salvage-upgraded","ordinary-vendor","vela-stock","dungeon-broker","sold-stock","full-pack","progression-scaling"].map(id=>({id,label:id.replaceAll("-"," ").replace(/^./,c=>c.toUpperCase())}));
const MAGIC=[...Object.keys(APERTURE_SKILLS).flatMap(id=>Array.from({length:APERTURE_SKILLS[id].maxRank},(_,i)=>({id:`${id}-rank-${i+1}`,label:`${APERTURE_SKILLS[id].name} rank ${i+1}`}))),...['enlargement-wall','enlargement-reversion','speed-buff','extended-leap','aerial-water','aerial-pit','invalid-landing','buff-expiration','active-buff-save','band-dormant','band-stirring','band-open','band-resonant'].map(id=>({id,label:id.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase())}))];
const SIMPLE={performance:["overworld-baseline","overworld-stress","dungeon-baseline","projectile-stress"],recovery:["active-rest-point","active-wayglass","overworld-death","dungeon-death","serialized","legacy-migration","corrupted-state"],scenes:["idle","exceptional-arrival","deep-resolution","relay-transformation","aperture-ritual","interrupted"],records:["dense-atlas","all-symbols","navigation-symbols","death-marker","dungeon-map","journal-features","bestiary-groups","elite-vocabulary","creature-image","place-records"]};

export function scenariosForLab(lab) {
  if (lab === "test-tile") return [{ id: "standard", label: "Standard test tile" }];
  if (lab === "shelters") return SHELTERS;
  if (lab === "ordinary-dungeon") return ORDINARY;
  if (lab === "forge") return FORGE;
  if (lab === "underlands") return UNDERLANDS;
  if (lab === "deep-dungeon") return DEEP;
  if (lab === "threefold") return [{ id: "threefold", label: "Threefold sealed expedition" }];
  if (lab === "landscape") return LANDSCAPE_SCENARIOS;
  if (lab === "combat") return CREATURES;
  if(lab==="wayglass")return WAYGLASS_SCENARIOS;
  if(lab==="environment")return ENVIRONMENTS;
  if(lab==="hunts")return HUNTS;
  if(lab==="inventory")return INVENTORY;
  if(lab==="magic")return MAGIC;
  if(SIMPLE[lab])return SIMPLE[lab].map(id=>({id,label:id.replaceAll("-"," ").replace(/^./,c=>c.toUpperCase())}));
  return [];
}

function scratchSave(seed) {
  const save = freshSave();
  save.name = "Proving Ground Wayfarer";
  save.seed = seed;
  save.checkpoints = {};
  save.explored = {};
  return save;
}

function gameForOverworld(seed, rx, ry, now) {
  const save = scratchSave(seed);
  Object.assign(save.session, { area: "overworld", rx, ry, x: 16, y: 16 });
  Object.assign(save.position, { area: "overworld", rx, ry, x: 16, y: 16 });
  save.explored[`${rx},${ry}`] = true;
  const game = new Game(save, now); game.installSystems();
  return { save, game };
}

function installMap(game, map, now) {
  game.area = "dungeon";
  game.map = map;
  game.enemies = map.enemySpawns.map(spawn => game.createEnemyFromSpawn(spawn,"dungeon"));
  game.projectiles = [];
  game.effects = [];
  game.eliteHazards = [];
  game.player.x = map.entry?.x ?? 4;
  game.player.y = map.entry?.y ?? 5;
  game.player.attackReadyAt = now;
  game.sync();
  return game;
}

function gameForMap(seed, id, map, now) {
  if (!map.arena && !id.startsWith('proving:combat:')) varyDungeonLayout(map,seed,id);
  const save = scratchSave(seed);
  Object.assign(save.session, { area: "dungeon", activeDungeonId: id, dungeonReturn: { rx: 0, ry: 0, x: 16, y: 16 }, x: map.entry?.x ?? 4, y: map.entry?.y ?? 5 });
  Object.assign(save.position, { area: "dungeon", rx: 0, ry: 0, x: map.entry?.x ?? 4, y: map.entry?.y ?? 5 });
  if(map.levelId)save.session.activeDungeonLevelId=map.levelId;
  save.consequences.dungeons[id] = { discovered: true, visits: 1, visitOpen: true, generatorVersion: map.generatorVersion || 3, layoutVersion: map.layoutVersion || 0, dungeonRecipe: map.recipe, generationOptions:{variant:map.variant,sizeProfile:map.sizeProfile}, resolved: false };
  const game = new Game(save, now); game.installSystems(); installMap(game,map,now);
  delete save.consequences.dungeons[id].combatClear;
  game.prepareDungeonCompletion();
  game.updateDungeonDiscovery(true);
  return { save, game };
}

function shelterFixture(scenario, seed, now) {
  const spec = SHELTERS.find((q)=>q.id===scenario) || SHELTERS[0];
  const actualSeed = String(spec.seed);
  const { save, game } = gameForOverworld(actualSeed, Number(spec.rx), Number(spec.ry), now);
  const structures = game.map.objects.filter((o)=>o.kind==="shack"||o.kind==="architecturalBuilding");
  const primary = structures[0];
  if (!primary) throw new Error(`Scenario ${spec.id} generated no production structure.`);
  const approach = primary.entranceApproaches?.[0] || primary.entrances?.[0] || primary.door;
  if (approach) { game.player.x=approach.x; game.player.y=approach.y; game.sync(); }
  return { lab:"shelters",scenario:spec.id,label:spec.label,seed:actualSeed,variant:0,save,game,primary,structures,production:true };
}

function ordinaryFixture(scenario, seed, variant, now, sizeProfile="standard") {
  const recipe = ORDINARY.some(q=>q.id===scenario)?scenario:"hollow", id=`proving:ordinary:${recipe}:${variant}`;
  const map=generateUnifiedDungeon(seed,id,recipe,{variant,sizeProfile});
  const base=gameForMap(seed,id,map,now);
  return {lab:"ordinary-dungeon",scenario:recipe,label:map.name,seed,variant,sizeProfile,production:true,...base};
}

function forgeFixture(scenario, seed, variant, now) {
  const spec = FORGE.find((q) => q.id === scenario) || FORGE[0], id = `proving:forge:${spec.id}:${variant}`, map = generateVariedDungeon(seed, id, "hollow");
  const entry = map.entry || { x: 4, y: 5 }, open = map.tiles.filter((t) => !t.blocked && !t.environment && Math.hypot(t.x - entry.x, t.y - entry.y) >= 2.5 && Math.hypot(t.x - entry.x, t.y - entry.y) <= 6).sort((a, b) => Math.hypot(a.x - entry.x, a.y - entry.y) - Math.hypot(b.x - entry.x, b.y - entry.y));
  map.enemySpawns = Array.from({ length: 5 }, (_, i) => { const at = open[Math.min(open.length - 1, i * 3)]; return { id: `${id}:dummy:${i}`, kind: i % 2 ? "rootBrute" : "ashling", x: at.x, y: at.y }; });
  map.name = `Glyph Forge · ${spec.label}`;
  const base = gameForMap(seed, id, map, now), save = base.save;
  for (const e of base.game.enemies) { e.maxHp *= 6; e.hp = e.maxHp; } // practice foes last long enough to read the effects
  ensureGlyphState(save);
  for (const g of GLYPH_IDS) { save.glyphs[g] = 3; save.glyphCodex.glyphs[g] = true; }
  save.equipment.primary = normalizeSockets({ id: "primary-verge-cleaver", name: "Verge Cleaver", slot: "primary", power: 6, property: "impact", tier: "relic", affixes: [] });
  save.equipment.secondary = normalizeSockets({ id: "secondary-needle-caster", name: "Needle Caster", slot: "secondary", power: 6, property: "quick", tier: "relic", affixes: [] });
  save.glyphDust = 30;
  ensureEchoState(save); if (spec.id === "echoes") for (const e of ECHO_IDS) save.echoes.owned[e] = true;
  if (spec.id === "awakening") { save.perception.aperture = 90; save.materials.lumenDust = 40; for (const slot of ["primary", "secondary"]) { const it = save.equipment[slot]; it.basePower = it.power; it.upgradeRank = 6; it.power += 6; it.glyphs = ["ignite", "chain", null]; } ensureConstellation(save); }
  const r = RESONANCES[spec.id.replace("resonance-", "")];
  if (r) { for (const slots of [save.equipment.primary.glyphs, save.equipment.secondary.glyphs]) { slots[0] = r.pair[0]; slots[1] = r.pair[1]; } save.spellGlyphs[save.equippedSpell || "ember-ring"] = [...r.pair]; for (const g of r.pair) save.glyphs[g] = Math.max(0, save.glyphs[g] - 3); }
  return { lab: "forge", scenario: spec.id, label: map.name, seed, variant, production: true, ...base, diagnostics: { resonance: r ? spec.id.slice(10) : null, sockets: { primary: save.equipment.primary.glyphs, tool: save.equipment.secondary.glyphs } } };
}

function underlandsFixture(scenario, seed, variant, now) {
  const spec = UNDERLANDS.find((q) => q.id === scenario) || UNDERLANDS[0], recipe = ["hollow", "cistern", "kiln"][variant % 3], id = `proving:underlands:${spec.id}:${variant}`;
  const options = spec.id.startsWith("layout-") ? { layout: spec.id.slice(7), theme: "none", variant } : spec.id.startsWith("theme-") ? { theme: spec.id.slice(6), variant } : { variant };
  const map = generateExpeditionDungeon(seed, id, recipe, options), base = gameForMap(seed, id, map, now);
  if (spec.id === "relay-node") { base.save.consequences.dungeons[id].guardianDefeated = true; if (placeRelayNode(map, id, base.save)) ensureRelayNetwork(base.save).seen = true; }
  return { lab: "underlands", scenario: spec.id, label: map.name, seed, variant, production: true, ...base, diagnostics: { layout: map.diagnostic.layoutGrammar, theme: map.theme || "none", weather: map.weather || "none", size: map.sizeProfile } };
}

function deepFixture(scenario, seed, variant, now, forceThreefold=false) {
  if(!forceThreefold&&scenario==="legacy-v1"){const id=deepDungeonId(seed,1,variant,-variant),map=generateDungeon(seed,id),base=gameForMap(seed,id,map,now);return{lab:"deep-dungeon",scenario,label:map.name,seed,variant,sizeProfile:"threefold",production:true,...base}}
  const archetype=forceThreefold?"threefold":DEEP_ARCHETYPE_IDS.includes(scenario)?scenario:"threefold";
  const id=deepV2Id(seed,1,variant,-variant,archetype),map=generateDeepV2Dungeon(seed,id);
  const base=gameForMap(seed,id,map,now);
  return {lab:forceThreefold?"threefold":"deep-dungeon",scenario:archetype,label:map.name,seed,variant,production:true,...base};
}

const LANDSCAPE_SCENARIOS = [...Object.values(BIOMES).map((b) => ({ id: b.id, label: b.name })), { id: "volcano", label: "Erupting volcano" }, { id: "skybridge", label: "Sky bridge" }];
function landscapeFixture(scenario, seed, now) {
  const feature = scenario === "volcano" || scenario === "skybridge" ? scenario : null, biome = feature ? "mountains" : BIOMES[scenario] ? scenario : "mountains";
  for (let radius = 2; radius <= 40; radius++) for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== radius || biomeFor(seed, x, y) !== biome) continue;
    const base = gameForOverworld(seed, x, y, now), map = base.game.map;
    if (biome === "castle" && !map.castle) continue;
    if (feature === "volcano" && !map.volcano) continue;
    if (feature === "skybridge" && !map.skyBridges?.length) continue;
    if (!feature && biome !== "castle" && map.tiles.filter((t) => t.landscape === biome).length < (biome === "alien" ? 220 : 400)) continue; // the heart of the biome, not its fringe
    const summit = map.objects.find((o) => o.landscapeSummit), counts = {};
    for (const t of map.tiles) if (t.landscape) counts[t.kind] = (counts[t.kind] || 0) + 1;
    if (feature === "volcano") Object.assign(base.game.player, { x: map.volcano.x + 4, y: map.volcano.y + 4 });
    if (feature === "skybridge") { const b = map.skyBridges[0]; Object.assign(base.game.player, { x: b.from[0], y: b.from[1] }); }
    return { lab: "landscape", scenario: feature || biome, label: `${feature === "volcano" ? "Erupting volcano" : feature === "skybridge" ? "Sky bridge" : BIOMES[biome].name} at section ${x}, ${y}`, seed, variant: 0, production: true, ...base,
      diagnostics: { section: { rx: x, ry: y }, biome: map.landscape?.biome, summit: summit ? { name: summit.name, x: summit.x, y: summit.y } : null, castle: map.castle || null,
        slopes: map.tiles.filter((t) => t.slope).length, tiles: counts } };
  }
  throw new Error(`No ${biome} section within 40 sections of the origin for this seed`);
}
// Release 279 (Tim, 2026-10-22: "one area of testing that's just a tile... a standard tile, but it has... water, a chasm, and some
// elevated blocks in it as well as a building... and also a dungeon door... we can keep this in place"). The Timber shelter
// section (its shack is the building) with a pond, a canyon, a two-level plateau with stairs and a crossing stamped on.
// Built from production tile kinds, so movement, jumping, falls, drowning and entry behave as they do in play.
export const TEST_TILE = { seed: DEFAULT_PROVING_SEED, rx: 0, ry: -1, start: { x: 20, y: 10 }, crossing: { x: 27, y: 24 } };
export function stampTestTile(map) {
  const W = map.width || 32, at = (x, y) => y * W + x, clear = [];
  const put = (x, y, t) => { map.tiles[at(x, y)] = { x, y, detail: 0, ...t }; clear.push(`${x},${y}`); };
  for (let y = 3; y <= 6; y++) for (let x = 15; x <= 19; x++) put(x, y, { kind: "lakeWater", blocked: true, elev: 0, landscape: "lake" }); // the pond
  for (let y = 2; y <= 7; y++) for (let x = 24; x <= 29; x++) { // the plateau: a ring at 1, a core at 2
    const core = x >= 25 && x <= 28 && y >= 3 && y <= 6;
    put(x, y, { kind: "alpineGrass", blocked: false, elev: core ? 2 : 1, landscape: "mountains" });
  }
  put(24, 4, { kind: "mountainTrail", blocked: false, elev: 1, landscape: "mountains", slope: true }); // stairs up
  put(25, 4, { kind: "mountainTrail", blocked: false, elev: 2, landscape: "mountains", slope: true });
  for (let y = 16; y <= 17; y++) for (let x = 24; x <= 29; x++) put(x, y, { kind: "canyon", blocked: true, environment: "canyon" }); // the chasm
  const keep = new Set(clear); keep.add(`${TEST_TILE.crossing.x},${TEST_TILE.crossing.y}`);
  map.objects = map.objects.filter((o) => !keep.has(`${Math.round(o.x)},${Math.round(o.y)}`) && o.id !== "test-tile-crossing");
  map.objects.push({ id: "test-tile-crossing", kind: "dungeon", x: TEST_TILE.crossing.x, y: TEST_TILE.crossing.y, state: "open", actions: ["enter", "bypass"], landmark: true, name: "Test Crossing", identity: "sentinel den" });
  map.landscape = true; map.testTile = true; map.name = "Standard test tile";
  return map;
}
function testTileFixture(now) {
  const { save, game } = gameForOverworld(TEST_TILE.seed, TEST_TILE.rx, TEST_TILE.ry, now);
  stampTestTile(game.map); game.enemies = []; Object.assign(game.player, TEST_TILE.start); game.sync();
  return { lab: "test-tile", scenario: "standard", label: "Standard test tile", seed: TEST_TILE.seed, variant: 0, save, game, testTile: true, production: true };
}
// The environments a creature can be tried in (release 279: a dropdown instead of a typed seed).
export const COMBAT_ENVIRONMENTS = [
  { id: "test-tile", label: "Standard test tile" },
  ...["hollow", "cistern", "kiln"].map((r) => ({ id: `dungeon-${r}`, label: `Dungeon: ${r}` })),
  ...ARENA_FAMILIES.map((f) => ({ id: `arena-${f}`, label: `Arena: ${f.replaceAll("-", " ")}` })),
  ...Object.keys(BIOMES).map((b) => ({ id: `land-${b}`, label: `Overworld: ${b}` })),
];
function combatKind(scenario) {
  const packBoss = scenario.startsWith('pack-boss-') && isPackKind(scenario.slice(10)), patternScenario = scenario.startsWith('pattern-');
  return { packBoss, patternScenario, kind: packBoss ? scenario.slice(10) : patternScenario ? (scenario.includes('elite') ? 'hollowMarshal' : 'ashling') : CREATURES.some(q => q.id === scenario) ? scenario : "ashling" };
}
// An overworld environment (the test tile or a landscape section): the creature stands a few tiles from the Wayfarer.
function overworldCombat(scenario, variant, base, now) {
  const { packBoss, kind } = combatKind(scenario), { game } = base, W = game.map.width || 32, p = game.player;
  const open = game.map.tiles.filter((t) => !t.blocked && !t.structure && !t.slope && !(t.elev > 0) && t.x > 2 && t.y > 2 && t.x < W - 3 && t.y < 29 && Math.hypot(t.x - p.x, t.y - p.y) >= 4 && Math.hypot(t.x - p.x, t.y - p.y) <= 9);
  const count = packBoss ? 1 : scenario === 'pattern-multiple-attackers' ? 6 : 1 + Math.min(5, Math.max(0, variant % 6));
  game.enemies = Array.from({ length: Math.min(count, open.length) }, (_, i) => { const t = open[(i * 13 + variant) % open.length]; return game.createEnemyFromSpawn({ id: `proving:combat:${kind}:${variant}:${i}`, kind, x: t.x, y: t.y, boss: packBoss || !!ELITE_DEFINITIONS[kind], ...(kind === "gateRevenant" ? { gatePredator: true } : {}) }, "overworld"); });
  for (const e of game.enemies) e.aggro = true;
  game.sync();
  return { ...base, lab: "combat", scenario, label: `${kind} in ${base.label || game.map.name || "the overworld"}`, variant, diagnostics: { combatKind: kind, quantity: game.enemies.length } };
}
function combatFixture(scenario, seed, variant, now, environment = "dungeon-hollow") {
  const env = COMBAT_ENVIRONMENTS.some((q) => q.id === environment) ? environment : "dungeon-hollow";
  if (env === "test-tile") return { ...overworldCombat(scenario, variant, testTileFixture(now), now), environment: env, testTile: true };
  if (env.startsWith("land-")) return { ...overworldCombat(scenario, variant, landscapeFixture(env.slice(5), seed, now), now), environment: env };
  if (env.startsWith("arena-")) return { ...arenaCombat(scenario, seed, variant, now, env.slice(6)), environment: env };
  return { ...dungeonCombat(scenario, seed, variant, now, env.slice(8)), environment: env };
}
function arenaCombat(scenario, seed, variant, now, family) {
  const { kind } = combatKind(scenario), id = `proving:combat:${kind}:${variant}:arena`, map = generateBespokeArena(seed, id, { kind: "persistent", family });
  const open = map.tiles.filter((t) => !t.blocked && Math.hypot(t.x - (map.entry?.x ?? 4), t.y - (map.entry?.y ?? 5)) >= 4);
  map.enemySpawns = [{ id: `${id}:0`, kind, x: open[variant % open.length].x, y: open[variant % open.length].y, boss: !!ELITE_DEFINITIONS[kind] }];
  return { lab: "combat", scenario, label: `${kind} in the ${family.replaceAll("-", " ")} arena`, seed, variant, production: true, ...gameForMap(seed, id, map, now) };
}
function dungeonCombat(scenario, seed, variant, now, recipe = "hollow") {
  const {packBoss,patternScenario,kind}=combatKind(scenario),id=`proving:combat:${kind}:${variant}${recipe==="hollow"?"":`:${recipe}`}`,map=generateVariedDungeon(seed,id,recipe);
  const open=map.tiles.filter(t=>!t.blocked&&t.x>7&&t.x<23&&t.y>6&&t.y<19);
  const count=packBoss?1:scenario==='pattern-multiple-attackers'?6:1+Math.min(5,Math.max(0,variant%6));
  map.enemySpawns=Array.from({length:count},(_,index)=>({id:`${id}:${index}`,kind,x:open[(index*13+variant)%open.length].x,y:open[(index*13+variant)%open.length].y,boss:packBoss||!!ELITE_DEFINITIONS[kind]}));
  map.name=`${kind} combat arena`;map.diagnostic={...map.diagnostic,combatKind:kind,quantity:map.enemySpawns.length};
  const base=gameForMap(seed,id,map,now);if(patternScenario){const ids=scenario==='pattern-elite-combination'?['slam','lunge']:scenario==='pattern-multiple-attackers'||scenario==='pattern-wall-interruption'?['lunge']:scenario.replace('pattern-','').split('+');for(const e of base.game.enemies){e.meleePatterns=ids;e.range=0;e.cooldown=0}base.diagnostics={meleePatterns:ids,wallInterruption:scenario==='pattern-wall-interruption',attackPhase:base.game.enemies[0]?.meleePhase||null,activeEncounterCap:32}}
  return {lab:"combat",scenario,label:map.name,seed,variant,production:true,...base,diagnostics:base.diagnostics||null};
}

function findNavigationRegion(seed,kind,index=0){const found=[];for(let radius=1;radius<=20;radius++)for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){if(Math.max(Math.abs(x),Math.abs(y))!==radius)continue;const map=generateRegion(seed,x,y,1),object=map.objects.find(o=>o.kind===kind);if(object&&!found.some(q=>q.rx===x&&q.ry===y)){found.push({rx:x,ry:y,map,object});if(found.length>index)return found[index]}}throw new Error(`No ${kind} fixture found`)}
function navigationFixture(scenario,seed,now){const kind=scenario.includes("rest-point")?"shrine":scenario==="broken-observatory"?"ruinMarker":"checkpoint",site=findNavigationRegion(seed,kind),{save,game}=gameForOverworld(seed,site.rx,site.ry,now);game.map=site.map;const object=game.map.objects.find(o=>o.id===site.object.id);game.player.x=object.x;game.player.y=object.y+1;
 const diagnostics={semanticRole:object.semanticRole,spriteIdentity:object.spriteIdentity,atlasIcon:object.atlasIcon,fastTravelEligible:object.fastTravelEligible,respawnEligible:object.respawnEligible,latticeSize:WAYGLASS_LATTICE_SIZE,latticeAnchor:wayglassLatticeAnchor(seed,site.rx,site.ry,1),migrationSource:null};
 if(["activated-wayglass","travel-pair","save-reconstruction"].includes(scenario)){object.state="active";save.checkpoints[`${site.rx},${site.ry}`]={rx:site.rx,ry:site.ry,x:object.x,y:object.y,name:object.name};save.activeCheckpoint=save.checkpoints[`${site.rx},${site.ry}`]}
 if(scenario==="travel-pair"){const second=findNavigationRegion(seed,"checkpoint",1);save.checkpoints[`${second.rx},${second.ry}`]={rx:second.rx,ry:second.ry,x:second.object.x,y:second.object.y,name:second.object.name};diagnostics.travelDestinations=Object.keys(save.checkpoints)}
 if(scenario==="activated-rest-point"){save.activeCheckpoint={rx:site.rx,ry:site.ry,x:object.x,y:object.y,name:object.name};save.worldFlags[`rest:${site.rx},${site.ry}:${object.id}`]=true}
 if(["manual-waypoint","dual-compass"].includes(scenario))save.manualWaypoint={kind:"section",area:"overworld",rx:site.rx+2,ry:site.ry+1,label:"Manual test waypoint"};
 if(["hunt-guidance","dual-compass"].includes(scenario)){save.viewport.activeHuntId="lab-hunt";save.viewport.contracts["lab-hunt"]={id:"lab-hunt",title:"Proving Hunt",status:"tracking",target:{rx:site.rx-3,ry:site.ry+2}}}
 if(scenario==="quest-guidance")save.narrative.facts["crossing.objective"]=true;
 if(scenario==="death-marker")save.lastDeath={schema:1,sequence:1,areaKind:"overworld",rx:site.rx,ry:site.ry,x:object.x+2,y:object.y,label:"Last death",valid:true};
 if(scenario==="save-reconstruction"){const restored=roundTripScratch(save);diagnostics.reconstructed={checkpointKeys:Object.keys(restored.checkpoints),activeCheckpoint:restored.activeCheckpoint}}
 if(scenario==="legacy-migration"){const migrated=migrateSave({version:9,seed,checkpoint:save.activeCheckpoint,checkpoints:save.checkpoints,waypoint:{rx:site.rx+1,ry:site.ry+1}});diagnostics.migrationSource="save-v9";diagnostics.migrated={checkpointKeys:Object.keys(migrated.checkpoints),manualWaypoint:migrated.manualWaypoint}}
 if(scenario==="drought-corpus"){let wayglasses=0,rests=0,maxDistance=0,points=[];for(let y=-30;y<=30;y++)for(let x=-30;x<=30;x++){const map=generateRegion(seed,x,y,1);if(map.objects.some(o=>o.kind==="checkpoint")){wayglasses++;points.push({x,y})}if(map.objects.some(o=>o.kind==="shrine"))rests++}for(let y=-25;y<=25;y++)for(let x=-25;x<=25;x++)maxDistance=Math.max(maxDistance,Math.min(...points.map(p=>Math.max(Math.abs(p.x-x),Math.abs(p.y-y)))));Object.assign(diagnostics,{corpusSections:3721,wayglasses,restPoints:rests,wayglassRate:wayglasses/3721,restRate:rests/3721,maxChebyshevDistance:maxDistance})}
 game.sync();return{lab:"wayglass",scenario,label:WAYGLASS_SCENARIOS.find(q=>q.id===scenario)?.label||scenario,seed,variant:0,save,game,primary:object,production:true,diagnostics};}

function environmentFixture(scenario,seed,variant,now){if(scenario.startsWith("arena-")||scenario.includes("arena")||scenario.includes("domain")){const family=scenario.startsWith("arena-")?scenario.slice(6):scenario.startsWith("rootbound")?"rootbound-crown":"sentinel-manufactory",id=`proving:environment:${scenario}:${variant}`,map=generateBespokeArena(seed,id,{kind:scenario.startsWith("temporary")?"temporary":"persistent",family});const base=gameForMap(seed,id,map,now);return{lab:"environment",scenario,label:map.name,seed,variant,production:true,diagnostics:{arenaFamily:map.arenaFamily,lifecycle:map.arenaKind,persistence:map.arenaKind==="persistent"},...base}}const spec=SHELTERS.find(q=>q.id===scenario)||SHELTERS.find(q=>q.id==="fortress-district"),base=shelterFixture(spec.id,seed,now);return{...base,lab:"environment",scenario,label:spec.label,diagnostics:{district:base.game.map.district,structureDiagnostics:base.game.map.structureDiagnostics}}}

function stateFixture(lab,scenario,seed,variant,now){const {save,game}=gameForOverworld(seed,0,0,now),diagnostics={state:scenario,scratch:true};if(lab==="hunts"){if(scenario!=="empty-viewport"){save.viewport.activeHuntId="lab-hunt";save.viewport.contracts["lab-hunt"]={id:"lab-hunt",title:"Diagnostic Hunt",status:scenario.includes("completed")?"completed":scenario.includes("failed")?"failed":scenario.includes("located")?"target-located":"tracking",target:{rx:3,ry:-2}}}Object.assign(diagnostics,{viewport:save.viewport,creatures:Object.keys(CREATURE_FORMS),elites:Object.keys(ELITE_DEFINITIONS)})}if(lab==="inventory"){save.inventory=Array.from({length:scenario==="full-pack"?60:12},(_,i)=>generateItem(`${seed}:lab-item:${scenario}:${i}`,1+i));const candidate=save.inventory[0];if(scenario==='empty-slot')save.equipment[candidate.slot]=null;if(scenario.includes('upgrade')){save.materials.weaponSphere=20;save.materials.armorSphere=20;const slot=scenario.startsWith('armor')?'armor':'primary';diagnostics.upgrade=upgradeEquipment(save,slot)}if(scenario==='insufficient-spheres')diagnostics.upgrade=upgradeEquipment(save,'primary');Object.assign(diagnostics,{comparison:compareItemStats(candidate,save.equipment[candidate.slot]),tiers:ITEM_TIERS,inventoryCount:save.inventory.length,equipment:save.equipment,currency:save.currency})}if(lab==="magic"){let value=36;const bandScenario=scenario.match(/^band-(.+)$/);if(bandScenario)value=APERTURE_BANDS.find(b=>b.id===bandScenario[1])?.threshold||0;save.perception.aperture=value;save.apertureBand=apertureBand(value).id;const skill=Object.values(APERTURE_SKILLS).find(q=>scenario.startsWith(q.id));if(skill){const rank=Number(scenario.match(/rank-(\d+)/)?.[1]||1);for(let i=0;i<rank;i++)learnApertureSkill(save,skill.id);save.magicSkills.selected=skill.id}if(scenario.startsWith('aerial-')){save.magicSkills.learned['aerial-step']=1;save.magicSkills.selected='aerial-step';game.activateApertureSkill('aerial-step')}Object.assign(diagnostics,{aperture:value,band:save.apertureBand,skill:save.magicSkills.selected,rank:save.magicSkills.selected?save.magicSkills.learned[save.magicSkills.selected]:0,active:save.magicSkills.active,cooldowns:save.magicSkills.cooldowns,skills:Object.keys(APERTURE_SKILLS)})}if(lab==="performance"){diagnostics.workload={enemySpawns:game.map.enemySpawns.length,objects:game.map.objects.length,tiles:game.map.tiles.length,preset:scenario}}if(lab==="recovery"){if(scenario.includes("death"))save.lastDeath={schema:1,sequence:1,areaKind:scenario.startsWith("dungeon")?"dungeon":"overworld",rx:0,ry:0,x:16,y:16,label:"Diagnostic death",valid:true};if(scenario==="serialized")diagnostics.roundTrip=roundTripScratch(save).version;if(scenario==="legacy-migration")diagnostics.migrated=migrateSave({version:9,seed,checkpoints:save.checkpoints}).version;if(scenario==="corrupted-state")diagnostics.recovered=migrateSave({version:13,seed,manualWaypoint:{rx:"bad"},checkpoints:null}).version}if(lab==="scenes"){save.scenes.pending=scenario==="idle"?[]:[{id:scenario,variant:variant%3,status:scenario==="interrupted"?"interrupted":"queued"}];diagnostics.scenes=save.scenes}if(lab==="records"){save.lastDeath={schema:1,sequence:1,areaKind:"overworld",rx:0,ry:0,x:18,y:18,label:"Diagnostic death",valid:true};save.codex.features[scenario]={encountered:1,name:scenario};Object.assign(diagnostics,{atlasSymbols:["checkpoint","shrine","ruinMarker","dungeon","lastDeath"],codex:save.codex})}game.sync();return{lab,scenario,label:scenario.replaceAll("-"," "),seed,variant,save,game,production:true,diagnostics}}

export function createLabFixture({lab="shelters",scenario="",seed=DEFAULT_PROVING_SEED,variant=0,sizeProfile="standard",revealMode="normal",environment="dungeon-hollow",now=0}={}) {
  const cleanSeed=String(seed||DEFAULT_PROVING_SEED).slice(0,80),cleanVariant=Math.max(0,Math.min(999,Number(variant)||0));
  if(lab==="shelters")return shelterFixture(scenario,cleanSeed,now);
  if(lab==="test-tile")return testTileFixture(now);
  let fixture;
  if(lab==="ordinary-dungeon")fixture=ordinaryFixture(scenario,cleanSeed,cleanVariant,now,["compact","standard","extended"].includes(sizeProfile)?sizeProfile:"standard");
  else if(lab==="forge")fixture=forgeFixture(scenario,cleanSeed,cleanVariant,now);
  else if(lab==="underlands")fixture=underlandsFixture(scenario,cleanSeed,cleanVariant,now);
  else if(lab==="deep-dungeon")fixture=deepFixture(scenario,cleanSeed,cleanVariant,now);
  else if(lab==="threefold")fixture=deepFixture("threefold",cleanSeed,cleanVariant,now,true);
  else if(lab==="landscape")fixture=landscapeFixture(scenario,cleanSeed,now);
  else if(lab==="combat"){fixture=combatFixture(scenario,cleanSeed,cleanVariant,now,environment);if(fixture.game.area!=="dungeon")return fixture}
  else if(lab==="wayglass")return navigationFixture(WAYGLASS_SCENARIOS.some(q=>q.id===scenario)?scenario:"unactivated-wayglass",cleanSeed,now);
  else if(lab==="environment")return environmentFixture(scenario,cleanSeed,cleanVariant,now);
  else if(["hunts","inventory","magic","performance","recovery","scenes","records"].includes(lab))return stateFixture(lab,scenario||scenariosForLab(lab)[0]?.id,cleanSeed,cleanVariant,now);
  if(fixture){fixture.revealMode=["normal","explored","full"].includes(revealMode)?revealMode:"normal";const map=fixture.game.map,history=fixture.save.consequences.dungeons[fixture.game.areaId()],level=map.levelStableId||map.levelId||"root",prior=history?.discovery?.levels?.[level]||revealDungeonAt(map,[],map.entry?.x||4,map.entry?.y||5,0);applyDungeonDiscovery(map,prior,fixture.revealMode==="full"?"full":"normal");return fixture}
  throw new Error(`Laboratory ${lab} is not implemented.`);
}

export function labReport(fixture) {
  const {game}=fixture,map=game.map,primary=fixture.primary;
  return {mode:"developer-proving-ground",lab:fixture.lab,scenario:fixture.scenario,label:fixture.label,seed:fixture.seed,variant:fixture.variant,sizeProfile:fixture.sizeProfile||map.sizeProfile||null,revealMode:fixture.revealMode||"normal",production:fixture.production,scratch:true,area:game.area,identity:map.id||`${game.rx},${game.ry}`,recipe:map.recipe||map.district?.style||primary?.family||"overworld",diagnostics:fixture.diagnostics||null,topology:map.diagnostic||null,topologyHash:map.dungeonContract?.topologyHash||null,discovery:map.dungeonContract?dungeonDiscoveryReport(map):null,level:map.levelId||null,objectives:(map.objectives||[]).map(q=>({id:q.id,type:q.type,name:q.name})),structures:fixture.structures?.map(o=>({id:o.id,kind:o.kind,family:o.family,shape:o.shape,theme:o.theme,entrances:o.entrances?.length||0,interior:o.interior?.length||0,boundary:o.boundary?.length||0}))||[],hazards:map.objects.filter(o=>o.kind==="trap").map(o=>({id:o.id,type:o.trapType,x:o.x,y:o.y,direction:[o.dirX||0,o.dirY||0],warning:o.warningDuration||.7,damage:o.damage||14})),interactables:map.objects.filter(o=>o.actions?.length).map(o=>({id:o.id,kind:o.kind,state:o.state,actions:o.actions,semanticRole:o.semanticRole,spriteIdentity:o.spriteIdentity,atlasIcon:o.atlasIcon,fastTravelEligible:o.fastTravelEligible,respawnEligible:o.respawnEligible})),enemies:{total:game.enemies.length,alive:game.enemies.filter(e=>!e.dead).length,kinds:[...new Set(game.enemies.map(e=>e.kind))]},player:{x:Number(game.player.x.toFixed(2)),y:Number(game.player.y.toFixed(2)),hp:game.player.hp},performance:{...game.performanceStats}};
}

export function teleportTargets(fixture) {
  const map=fixture.game.map,targets=[];
  if(map.entry)targets.push({id:"entry",label:"Entrance",x:map.entry.x,y:map.entry.y});
  const foe=fixture.lab==="combat"&&fixture.game.enemies?.find(e=>!e.dead&&!e.ambient),near=foe&&map.tiles.find(t=>!t.blocked&&!t.environment&&!["canyon","river","dungeonWater","bridge"].includes(t.kind)&&Math.hypot(t.x-foe.x,t.y-foe.y)>=3&&Math.hypot(t.x-foe.x,t.y-foe.y)<=4.5);
  if(near)targets.push({id:"near-combatant",label:"Near the combatants",x:near.x,y:near.y});
  if(map.hub)targets.push({id:"hub",label:"Hub",x:map.hub.x,y:map.hub.y});
  for(const q of map.objectives||[])targets.push({id:q.id,label:q.name||q.id,x:q.x,y:q.y});
  for(const e of map.enemySpawns||[])if(e.boss||["gateWarden","objectiveGuardian","finalBoss"].includes(e.dungeonRole))targets.push({id:e.id||e.kind,label:e.dungeonRole||e.kind,x:e.x,y:e.y});
  const exit=map.objects.find(o=>o.kind==="exit");if(exit)targets.push({id:exit.id,label:"Exit",x:exit.x,y:exit.y});
  for(const o of map.objects||[])if(o.actions?.length&&!targets.some(q=>q.id===o.id))targets.push({id:o.id,label:o.name||o.semanticRole||o.kind,x:o.x,y:o.y});
  return targets.filter(q=>Number.isFinite(q.x)&&Number.isFinite(q.y));
}
