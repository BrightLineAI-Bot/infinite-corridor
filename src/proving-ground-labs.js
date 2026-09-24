import { Game } from "./game.js?v=90";
import { freshSave } from "./types.js?v=90";
import { generateRegion } from "./world.js?v=90";
import { generateVariedDungeon } from "./arenas.js?v=90";
import { DEEP_ARCHETYPE_IDS, deepV2Id, generateDeepV2Dungeon } from "./deep-dungeons.js?v=90";
import { createCombatant, CREATURE_FORMS } from "./combat.js?v=90";
import { ELITE_DEFINITIONS } from "./elites.js?v=90";

export const DEFAULT_PROVING_SEED = "CINDER-VERGE-47";

export const LABORATORIES = [
  { id: "shelters", label: "Shelter & Building Gallery", status: "implemented", description: "Production shelters, displacement devices, and architectural districts." },
  { id: "ordinary-dungeon", label: "Ordinary Dungeon Lab", status: "implemented", description: "Production v3 dungeon topology, ecology, traps, guardians, and traversal." },
  { id: "deep-dungeon", label: "Legacy & Deep Dungeon Lab", status: "implemented", description: "Production deep-v2 archetypes, objectives, levels, shortcuts, and finales." },
  { id: "threefold", label: "Threefold Dungeon Lab", status: "implemented", description: "The production three-wing sealed expedition and its wardens." },
  { id: "combat", label: "Monster & Elite Combat Arena", status: "implemented", description: "Production combatants in a production dungeon arena." },
  { id: "wayglass", label: "Wayglass, Checkpoint & Compass Lab", status: "planned", description: "Planned isolated navigation and recovery laboratory." },
  { id: "environment", label: "Bespoke Environment & District Lab", status: "planned", description: "Planned environment and domain topology laboratory." },
  { id: "hunts", label: "Hunt, Domain & Boss Arena Lab", status: "planned", description: "Planned Viewport lifecycle laboratory." },
  { id: "inventory", label: "Inventory, Equipment & Reward Lab", status: "planned", description: "Planned item-generation and comparison laboratory." },
  { id: "performance", label: "Performance & Stress Lab", status: "planned", description: "Planned controlled frame-work presets." },
  { id: "recovery", label: "Save, Death & Recovery Lab", status: "planned", description: "Planned memory-only serialization laboratory." },
  { id: "scenes", label: "Narrative Scene Lab", status: "planned", description: "Planned consequence-free scene replay laboratory." },
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
const DEEP = DEEP_ARCHETYPE_IDS.map((id) => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} deep expedition` }));
const CREATURES = [...Object.keys(CREATURE_FORMS), ...Object.keys(ELITE_DEFINITIONS).filter((id)=>!Object.hasOwn(CREATURE_FORMS,id))].map((id)=>({id,label:id.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase())}));

export function scenariosForLab(lab) {
  if (lab === "shelters") return SHELTERS;
  if (lab === "ordinary-dungeon") return ORDINARY;
  if (lab === "deep-dungeon") return DEEP;
  if (lab === "threefold") return [{ id: "threefold", label: "Threefold sealed expedition" }];
  if (lab === "combat") return CREATURES;
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
  game.enemies = map.enemySpawns.map((spawn) => {
    const enemy = createCombatant(spawn.kind, spawn.x, spawn.y, spawn.boss, spawn.traits || []);
    Object.assign(enemy, spawn);
    return enemy;
  });
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
  const save = scratchSave(seed);
  Object.assign(save.session, { area: "dungeon", activeDungeonId: id, dungeonReturn: { rx: 0, ry: 0, x: 16, y: 16 }, x: map.entry?.x ?? 4, y: map.entry?.y ?? 5 });
  Object.assign(save.position, { area: "dungeon", rx: 0, ry: 0, x: map.entry?.x ?? 4, y: map.entry?.y ?? 5 });
  save.consequences.dungeons[id] = { discovered: true, visits: 1, visitOpen: true, generatorVersion: 3, resolved: false };
  const game = new Game(save, now); game.installSystems(); installMap(game,map,now);
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

function ordinaryFixture(scenario, seed, variant, now) {
  const recipe = ORDINARY.some(q=>q.id===scenario)?scenario:"hollow", id=`proving:ordinary:${recipe}:${variant}`;
  const map=generateVariedDungeon(seed,id,recipe);
  const base=gameForMap(seed,id,map,now);
  return {lab:"ordinary-dungeon",scenario:recipe,label:map.name,seed,variant,production:true,...base};
}

function deepFixture(scenario, seed, variant, now, forceThreefold=false) {
  const archetype=forceThreefold?"threefold":DEEP_ARCHETYPE_IDS.includes(scenario)?scenario:"threefold";
  const id=deepV2Id(seed,1,variant,-variant,archetype),map=generateDeepV2Dungeon(seed,id);
  const base=gameForMap(seed,id,map,now);
  return {lab:forceThreefold?"threefold":"deep-dungeon",scenario:archetype,label:map.name,seed,variant,production:true,...base};
}

function combatFixture(scenario, seed, variant, now) {
  const kind=CREATURES.some(q=>q.id===scenario)?scenario:"ashling",id=`proving:combat:${kind}:${variant}`,map=generateVariedDungeon(seed,id,"hollow");
  const open=map.tiles.filter(t=>!t.blocked&&t.x>7&&t.x<23&&t.y>6&&t.y<19);
  map.enemySpawns=Array.from({length:1+Math.min(5,Math.max(0,variant%6))},(_,index)=>({id:`${id}:${index}`,kind,x:open[(index*13+variant)%open.length].x,y:open[(index*13+variant)%open.length].y,boss:!!ELITE_DEFINITIONS[kind]}));
  map.name=`${kind} combat arena`;map.diagnostic={...map.diagnostic,combatKind:kind,quantity:map.enemySpawns.length};
  const base=gameForMap(seed,id,map,now);
  return {lab:"combat",scenario:kind,label:map.name,seed,variant,production:true,...base};
}

export function createLabFixture({lab="shelters",scenario="",seed=DEFAULT_PROVING_SEED,variant=0,now=0}={}) {
  const cleanSeed=String(seed||DEFAULT_PROVING_SEED).slice(0,80),cleanVariant=Math.max(0,Math.min(999,Number(variant)||0));
  if(lab==="shelters")return shelterFixture(scenario,cleanSeed,now);
  if(lab==="ordinary-dungeon")return ordinaryFixture(scenario,cleanSeed,cleanVariant,now);
  if(lab==="deep-dungeon")return deepFixture(scenario,cleanSeed,cleanVariant,now);
  if(lab==="threefold")return deepFixture("threefold",cleanSeed,cleanVariant,now,true);
  if(lab==="combat")return combatFixture(scenario,cleanSeed,cleanVariant,now);
  throw new Error(`Laboratory ${lab} is not implemented.`);
}

export function labReport(fixture) {
  const {game}=fixture,map=game.map,primary=fixture.primary;
  return {mode:"developer-proving-ground",lab:fixture.lab,scenario:fixture.scenario,label:fixture.label,seed:fixture.seed,variant:fixture.variant,production:fixture.production,area:game.area,identity:map.id||`${game.rx},${game.ry}`,recipe:map.recipe||map.district?.style||primary?.family||"overworld",topology:map.diagnostic||null,level:map.levelId||null,objectives:(map.objectives||[]).map(q=>({id:q.id,type:q.type,name:q.name})),structures:fixture.structures?.map(o=>({id:o.id,kind:o.kind,family:o.family,shape:o.shape,theme:o.theme,entrances:o.entrances?.length||0,interior:o.interior?.length||0,boundary:o.boundary?.length||0}))||[],interactables:map.objects.filter(o=>o.actions?.length).map(o=>({id:o.id,kind:o.kind,state:o.state,actions:o.actions})),enemies:{total:game.enemies.length,alive:game.enemies.filter(e=>!e.dead).length,kinds:[...new Set(game.enemies.map(e=>e.kind))]},player:{x:Number(game.player.x.toFixed(2)),y:Number(game.player.y.toFixed(2)),hp:game.player.hp},performance:{...game.performanceStats}};
}

export function teleportTargets(fixture) {
  const map=fixture.game.map,targets=[];
  if(map.entry)targets.push({id:"entry",label:"Entrance",x:map.entry.x,y:map.entry.y});
  if(map.hub)targets.push({id:"hub",label:"Hub",x:map.hub.x,y:map.hub.y});
  for(const q of map.objectives||[])targets.push({id:q.id,label:q.name||q.id,x:q.x,y:q.y});
  for(const e of map.enemySpawns||[])if(e.boss||["gateWarden","objectiveGuardian","finalBoss"].includes(e.dungeonRole))targets.push({id:e.id||e.kind,label:e.dungeonRole||e.kind,x:e.x,y:e.y});
  const exit=map.objects.find(o=>o.kind==="exit");if(exit)targets.push({id:exit.id,label:"Exit",x:exit.x,y:exit.y});
  return targets.filter(q=>Number.isFinite(q.x)&&Number.isFinite(q.y));
}
