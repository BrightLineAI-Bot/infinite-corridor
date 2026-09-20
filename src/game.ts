import { rangedWeapon, primaryProfile, SPELLS, affixValue, itemScore, itemTier, ITEM_TIERS } from "./items.ts";
import {
  generateRegion,
  generateDungeon,
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
import { createCombatant, dodge, playerAttack, enemyBodyRadius } from "./combat.ts";
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
import { hashSeed } from "./random.ts";
import{ELITE_KINDS,eliteVariant,ensureEliteState,recordPortalPrey,completeElite,gravityPull,addEliteHazard,tickEliteHazards,tickEliteStatus,cleansePoison}from'./elites.ts';
const remaining = (v, n) => Math.max(0, Number(v || 0) - n);
export const EQUIPMENT_CAPACITY = 60;
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
    if (o.kind === "deepShortcut") {const opened=progress.openedShortcutIds.includes(o.id),available=completed.has(o.unlockObjectiveId);Object.assign(o,opened?{state:"open",actions:["inspect"]}:available?{state:"revealed",actions:["open"]}:{state:"hidden",actions:["inspect"]});for(const p of o.cells||[])if(opened)map.tiles[p.y*map.width+p.x]={...map.tiles[p.y*map.width+p.x],kind:"deepFloor",blocked:false,routeId:o.id};}
    if (o.kind === "deepPortal") {const active=o.unlockOnCompletion?progress.completed:!o.unlockObjectiveId||completed.has(o.unlockObjectiveId);Object.assign(o,active?{state:"active",actions:["travel"]}:{state:"dormant",actions:["inspect"]});}
    if (o.kind === "sealedGate") Object.assign(o, progress.gateOpened ? { state: "open", blocked: false, actions: ["enter"] } : { state: "sealed", blocked: true, actions: ["inspect"] });
  }
  const width = mapWidth(map, "dungeon");
  for (const p of map.finalGateTiles || []) map.tiles[p.y * width + p.x] = { ...map.tiles[p.y * width + p.x], kind: progress.gateOpened ? "deepFloor" : "sealedGate", blocked: !progress.gateOpened, gateId: map.finalGateId };
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
  return true;
}
export function enemyDefeatNotice(e, area = "overworld") {
  const name = e.eliteName || ({
    hollowMarshal: "Hollow Marshal",
    riftColossus: "Rift Colossus",
    gateRevenant: "Gate Revenant",
  }[e.kind]) || String(e.kind || "enemy").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  let title = "ENEMY FELLED";
  if (e.defeatTitle) title = e.defeatTitle;
  else if (e.kind === "gateRevenant") title = "REVENANT REPULSED";
  else if (e.kind === "riftColossus") title = "COLOSSUS FELLED";
  else if (e.kind === "hollowMarshal") title = "GUARDIAN CLEARED";
  else if (e.eliteId) title = "ELITE SLAIN";
  else if (e.boss) title = "RIFT BOSS BROKEN";
  else if (e.apertureEncounter) title = "BREACH STILLED";
  const clearsCrossing = area === "dungeon" && !e.dungeonRole && (e.boss || e.kind === "hollowMarshal");
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
    return { stored: false, salvaged: item, iron };
  }
  const salvaged = salvageInventoryItem(save, weakest);
  save.inventory.push(item);
  return { stored: true, salvaged: salvaged.item, iron: salvaged.iron };
}
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
    charm = save.equipment?.charm;
  return {
    maxHp: 60 + (level - 1) * 6 + (vigor - 1) * 8,
    maxStamina: 50 + (level - 1) + (finesse - 1) * 3,
    damageReduction: Math.min(
      0.45,
      (resolve - 1) * 0.02 + armorPower * 0.025 + charmPower * 0.01 +
        affixValue(armor, "ward") + affixValue(charm, "ward"),
    ),
    meleeBonus:
      Math.max(1, Number(stats.Might) || 1) * 2 +
      (Number(save.weaponLevel) || 0) * 3 +
      Math.floor((level - 1) * 0.6) +
      Math.floor((Number(primary?.power) || 0) * 0.7) +
      affixValue(primary, "attack"),
    magicBonus:
      Math.max(1, Number(stats.Focus) || 1) +
      Math.floor((level - 1) * 0.45) +
      Math.floor((Number(secondary?.power) || 0) * 0.55) +
      affixValue(secondary, "attack"),
    attackReach: affixValue(primary, "reach") + affixValue(secondary, "reach") + affixValue(charm, "reach"),
    moveSpeed: affixValue(armor, "movement") + affixValue(charm, "movement"),
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
export function footprintOpen(map, width, x, y) {
  const left=x+.24,right=x+.76,top=y+.5,bottom=y+.88,height=map.tiles.length/width,overlaps=(a,b,c,d)=>right>a&&left<b&&bottom>c&&top<d;
  for(let ty=Math.floor(top);ty<=Math.floor(bottom-1e-6);ty++)for(let tx=Math.floor(left);tx<=Math.floor(right-1e-6);tx++){
    if(tx<0||ty<0||tx>=width||ty>=height)return false;
    const tile=map.tiles[ty*width+tx];if(!tile||tile.blocked)return false;
    if(!["shackWall","districtWall"].includes(tile.structure)||!tile.wallSides?.length)continue;
    const thickness=.22;
    for(const side of tile.wallSides){
      const box=side==="west"?[tx,tx+thickness,ty,ty+1]:side==="east"?[tx+1-thickness,tx+1,ty,ty+1]:side==="north"?[tx,tx+1,ty,ty+thickness]:[tx,tx+1,ty+1-thickness,ty+1];
      if(overlaps(...box))return false;
    }
  }
  return true;
}
export function footprintTouchesCanyon(map, width, x, y) {
  return [[.24,.5],[.76,.5],[.24,.88],[.76,.88]].some(([ox,oy]) => {
    const tx=Math.floor(x+ox),ty=Math.floor(y+oy);
    return map.tiles[ty*width+tx]?.kind === "canyon";
  });
}
export function footprintHazard(map,width,x,y){
  for(const [ox,oy] of [[.24,.5],[.76,.5],[.24,.88],[.76,.88]]){
    const tile=map.tiles[Math.floor(y+oy)*width+Math.floor(x+ox)];
    if(["canyon","river","dungeonWater"].includes(tile?.kind))return tile.kind;
  }
  return null;
}
export function footprintInsideStructure(map,width,x,y){
  for(const [ox,oy] of [[.24,.5],[.76,.5],[.24,.88],[.76,.88]]){
    const structure=map.tiles[Math.floor(y+oy)*width+Math.floor(x+ox)]?.structure;
    if(structure==='shackInterior'||String(structure||'').startsWith('district'))return true;
  }
  return false;
}
export function projectileTileOpen(map,width,x,y){
  const ix=Math.floor(x),iy=Math.floor(y),height=map.tiles.length/width,tile=map.tiles[iy*width+ix];
  if(ix<0||iy<0||ix>=width||iy>=height||!tile)return false;
  if(["canyon","river","dungeonWater"].includes(tile.kind))return true;
  return tileOpen(map,width,x,y);
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
export function moveAxis(entity, dx, dy, map, width) {
  let moved = false,
    steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.16)),
    sx = dx / steps,
    sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx && footprintOpen(map, width, entity.x + sx, entity.y)) {
      entity.x += sx;
      moved = true;
    }
    if (sy && footprintOpen(map, width, entity.x, entity.y + sy)) {
      entity.y += sy;
      moved = true;
    }
  }
  return moved;
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
      const nx = p.x + p.dx * step,
        ny = p.y + p.dy * step;
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
          p.path !== "grenade" &&
          !e.dead &&
          !p.hits?.[e.id] &&
          Math.hypot(e.x + 0.5 - p.x, e.y + 0.45 - p.y) <
            0.1 + enemyBodyRadius(e)
        ) {
          alertEnemy(e);
          e.hp -= p.damage;
          e.hitFlash = 0.18;
          if (p.path === "boomerang") {
            (p.hits ||= {})[e.id] = true;
          } else p.dead = true;
          p.impact = { x: p.x, y: p.y };
          if (e.hp <= 0 && !e.dead) {
            e.dead = true;
            onDefeat(e);
          }
          break;
        }
    }
    p.life -= dt;
    if (p.life <= 0){p.dead=true;if(p.path==="grenade")onDetonate(p)}
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
    const near = Math.hypot(player.x - trap.x, player.y - trap.y) < 0.72;
    if (trap.phase === "armed" && near) {
      trap.phase = "warning";
      trap.timer = 0.7;
      trap.hits = {};
    } else if (trap.phase === "warning") {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.phase = "active";
        trap.timer = 0.35;
      }
    } else if (trap.phase === "active") {
      trap.timer -= dt;
      const inFire =
        trap.trapType === "fire" &&
        Math.abs(player.y - trap.y) < 0.55 &&
        player.x >= trap.x - 1 &&
        player.x <= trap.x + 3;
      const inSpikes = trap.trapType === "spikes" && near;
      if (
        !jumping &&
        trap.loadGrace <= 0 &&
        !trap.hits.player &&
        (inFire || inSpikes)
      ) {
        trap.hits.player = true;
        player.hp -= 14;
      }
      if (trap.timer <= 0) {
        trap.phase = "recovery";
        trap.timer = 1.6;
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
export function updateEffects(effects, enemies, dt, onDefeat = () => {}) {
  for (const fx of effects) {
    fx.life -= dt;
    fx.untilPulse -= dt;
    if (fx.untilPulse <= 0) {
      fx.untilPulse += fx.pulse;
      fx.pulseIndex = (fx.pulseIndex || 0) + 1;
      if(fx.hostile)continue;
      for (const e of enemies) {
        if (
          e.dead ||
          Math.hypot(e.x + 0.5 - fx.x, e.y + 0.45 - fx.y) >
            fx.radius + Math.max(0, enemyBodyRadius(e) - 0.38)
        )
          continue;
        const key = `${fx.pulseIndex}:${e.id}`;
        if (fx.hits[key]) continue;
        fx.hits[key] = true;
        alertEnemy(e);
        e.hp -= fx.damage;
        e.hitFlash = 0.18;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          onDefeat(e);
        }
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
  save.shops[vendorId] = refreshShop(save, vendorId, save.shops[vendorId], 2);
  return save.shops[vendorId];
}
export function buyFromVendor(save, vendorId, id, quantity = 1) {
  if (vendorId === "vendor-vela" && id !== "crossingSigil")
    return buyFromVela(save, id, quantity);
  const npc = save.consequences?.npcs?.[vendorId],
    settlement =
      vendorId === "vendor-iona"
        ? "glasshaven"
        : vendorId === "vendor-mora"
          ? "coilmarket"
          : vendorId.startsWith("shelter-surprise-") ? null : "ember-refuge";
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
    spell: {
      remaining: spell,
      duration: (SPELLS[game.save.equippedSpell] || SPELLS["ember-ring"])
        .cooldown,
    },
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
  return Math.max(1.7, Math.max(0, Number(enemy?.range) || 0) + 0.5) +
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
export function enemyProjectilePattern(shooter,aim,now=0){
 const rotate=(v,a)=>({x:v.x*Math.cos(a)-v.y*Math.sin(a),y:v.x*Math.sin(a)+v.y*Math.cos(a)}),base={x:shooter.x+.5,y:shooter.y+.42,hostile:true,hits:{}},shot=(id,d,extra={})=>({...base,id:`enemy-shot-${shooter.id}-${now}-${id}`,dx:d.x,dy:d.y,speed:4.2,life:2.4,damage:shooter.damage,path:'straight',...extra});
 const sequence=(shooter.shotSequence=(shooter.shotSequence||0)+1);
 if(shooter.kind==='voidSentinel'){
  if(sequence%4===0)return[shot('blast',aim,{path:'grenade',speed:3.15,life:1.25,damage:Math.ceil(shooter.damage*.8),blastRadius:1.65})];
  return[-.13,0,.13].map((a,i)=>shot(`fan-${i}`,rotate(aim,a),{damage:Math.ceil(shooter.damage*.58),speed:4.8}));
 }
 if(shooter.kind==='cinderWisp')return[-.18,0,.18].map((a,i)=>shot(`cone-${i}`,rotate(aim,a),{damage:Math.ceil(shooter.damage*.62)}));
 if(shooter.kind==='sparkWarden'&&sequence%3===0)return[shot('arc',aim,{path:'arc',jumpable:true,speed:3.35,life:2.8,damage:Math.ceil(shooter.damage*1.15)})];
 if(shooter.kind==='coilStalker'&&sequence%3===0)return[-.11,.11].map((a,i)=>shot(`fork-${i}`,rotate(aim,a),{damage:Math.ceil(shooter.damage*.72)}));
 return[shot('single',aim)];
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
  if(e.passiveBehavior){
    if(e.passiveBehavior==="vanish"&&toPlayer<2.4){e.dead=true;e.vanished=true;return false}
    let tx,ty,speed=.16;
    if(e.passiveBehavior==="follow"&&toPlayer<6&&toPlayer>1.35){tx=player.x-e.x;ty=player.y-e.y;speed=.28}else{ai.phase=(ai.phase+dt/(e.passiveBehavior==="graze"?3.8:2.8))%(Math.PI*2);tx=Math.cos(ai.phase);ty=Math.sin(ai.phase*.73)}
    const m=Math.hypot(tx,ty)||1;moveAxis(e,tx/m*speed*dt,ty/m*speed*dt,map,width);ai.step=(ai.step+speed*dt)%2;return false;
  }
  if (e.telegraph > 0) {
    e.telegraph = Math.max(0, e.telegraph - dt);
    if (e.telegraph === 0) {
      e.cooldown = e.kind==='voidSentinel'?.82:e.kind==='cinderWisp'?1.35:1.9;
      e.strike = 0.24;
      const ranged=e.range>=2.5&&!e.instantStrike,clear=attackInRange(e,player)&&hasLineOfSight(e,player,map,width,ranged);
      if(clear&&ranged){onRanged(e,e.attackAim||projectileDirection(player.x-e.x,player.y-e.y));return false}
      return clear;
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
  const m = Math.hypot(tx, ty) || 1,
    dx = (tx / m) * speed * dt,
    dy = (ty / m) * speed * dt;
  if (Math.abs(tx) > Math.abs(ty)) ai.facing = tx < 0 ? "left" : "right";
  else ai.facing = ty < 0 ? "up" : "down";
  ai.step = (ai.step + Math.hypot(dx, dy)) % 2;
  moveAxis(e, dx, dy, map, width);
  if(sanctuary)enforceSanctuary(e,sanctuary);
  if (
    attackInRange(e, player) &&
    e.cooldown <= 0 &&
    hasLineOfSight(e, player, map, width, e.range>=2.5&&!e.instantStrike)
  )
    {e.telegraph = 0.9;e.attackAim=projectileDirection(player.x-e.x,player.y-e.y)}
  return false;
}
export function settlementSanctuary(map,rx,ry,save){if(!map||rx===0&&ry===0&&save?.consequences?.settlements?.['ember-refuge']?.status==='fallen')return null;return map.settlement||rx===0&&ry===0?{x:16,y:16,radius:9}:null}
export function enforceSanctuary(e,z){if(!z)return false;const dx=e.x-z.x,dy=e.y-z.y,d=Math.hypot(dx,dy);if(d>=z.radius)return false;const m=d||1;e.x=z.x+(d?dx/m:1)*(z.radius+.5);e.y=z.y+(d?dy/m:0)*(z.radius+.5);const ai=ensureAI(e);ai.homeX=e.x;ai.homeY=e.y;e.telegraph=0;return true}
export class Game {
  constructor(save, now = 0) {
    this.save = save;
    ensureEliteState(save);
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
    this.reticle = null;
    this.loadArea(this.area, false);
  }
  installSystems() {
    if (this._systemsInstalled) return;
    this._systemsInstalled = true;
    this.player.meleeAim = this.save.session.playerRuntime.meleeAim || null;
    this.traversal = this.save.session.playerRuntime.traversal || null;
    const attack = this.primaryAttack.bind(this);
    this.primaryAttack = (now, explicitDirection = null) => {
      if (now < (this.player.attackReadyAt || 0)) return [];
      const baseProfile = primaryProfile(this.save.equipment.primary),
        profile = { ...baseProfile, range: baseProfile.range * (1 + characterStats(this.save).attackReach) },
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
      if (e.kind === "hollowMarshal" && !e.dungeonRole) {
        const d = dungeonHistory(this.save, this.areaId());
        d.guardianDefeated = true;
        if (
          this.areaId() !== dungeonId(this.save.seed, this.save.worldGeneration)
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
        e.kind === "hollowMarshal" && !e.dungeonRole &&
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
      const tier = apertureTier(this.save.perception.aperture);
      for (const e of this.enemies)
        e.visualTier = Math.max(
          Number(e.visualTier) || 0,
          annex ? Math.max(2, tier) : tier,
        );
      const scaleFresh = () => {
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
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
        had = !!this.save.session.areas[id];
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
        this.map.objects.push(
          ...overlay.objects.filter((o) => !annex || o.kind !== "apertureDoor"),
        );
      }
      if (!had) {
        const q = regionalThreat(this.rx, this.ry);
        for (const e of this.enemies) {
          e.threatRing = q.ring;
          e.maxHp = Math.round(e.maxHp * q.hpMultiplier);
          e.hp = e.maxHp;
          e.damage = Math.max(1, Math.round(e.damage * q.damageMultiplier));
          e.xpMultiplier = q.xpMultiplier;
        }
      }
      const tier = apertureTier(this.save.perception.aperture);
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
      transition(dx, dy);
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
            unlock = tier === 0 ? "hidden inscriptions" : tier === 1 ? "unseen annexes" : "deep relics";
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
        const guardian = e.kind === "hollowMarshal" && !e.dungeonRole;
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
      enemies: this.enemies.map((e) => ({ ...e, ai: { ...ensureAI(e) } })),
      objects,
      projectiles: this.projectiles.map((p) => ({ ...p })),
      effects: this.effects.map((f) => ({ ...f, hits: { ...f.hits } })),
      eliteHazards:this.eliteHazards.map(h=>({...h,hits:{...h.hits}})),
    };
  }
  loadArea(area, capture = true) {
    if (capture) this.snapshotArea();
    this.area = area;
    this.map =
      area === "dungeon"
        ? generateDungeon(this.save.seed, this.areaId(),{levelId:this.save.session.activeDungeonLevelId||undefined})
        : generateRegion(
            this.save.seed,
            this.rx,
            this.ry,
            this.save.worldGeneration,
          );
    if (area === "dungeon" && this.map.recipe === "cistern") {
      for (const [x, y] of [[11, 4], [12, 4], [11, 5], [12, 5]]) {
        const i = y * mapWidth(this.map, area) + x, t = this.map.tiles[i];
        if (t && !t.blocked)
          this.map.tiles[i] = { ...t, kind: "dungeonWater", blocked: true, waterDepth: "shallow" };
      }
    }
    const eliteState=ensureEliteState(this.save),eliteDefeated=eliteState.defeated;
    if(area==='overworld'&&this.rx===5&&this.ry===-2&&!eliteDefeated.vesperwing)this.map.enemySpawns.push({kind:'vesperwing',x:23,y:16,boss:true,elite:true});
    if(area==='overworld'&&this.rx===-7&&this.ry===4&&!eliteDefeated.mireApostle)this.map.enemySpawns.push({kind:'mireApostle',x:22,y:22,boss:true,elite:true});
    if(area==='overworld'&&this.rx===-5&&this.ry===3){this.map.objects.push({id:'knife-choir-portal',kind:'elitePortal',name:'Cantor Threshold',x:20,y:16,state:eliteState.contracts.knifeChoir.state==='available'?'ready':'sealed',actions:['inspect','enter'],landmark:true});}
    if(area==='dungeon'&&String(this.areaId()).startsWith('elite-portal:')){this.map.enemySpawns=this.map.enemySpawns.filter(e=>e.kind!=='hollowMarshal');if(!eliteDefeated.knifeChoir)this.map.enemySpawns.push({kind:'knifeChoir',x:16,y:18,boss:true,elite:true});}
    else if(area==='dungeon'&&this.map.recipe==='cistern'&&!eliteDefeated.gravitantBell&&hashSeed(`${this.save.seed}:elite-guardian:${this.areaId()}`)%5===0){this.map.enemySpawns=this.map.enemySpawns.filter(e=>e.kind!=='hollowMarshal');this.map.enemySpawns.push({kind:'gravitantBell',x:16,y:18,boss:true,elite:true});}
    if (area === "dungeon" && !this.map.deepDungeon && this.map.recipe !== "deep-v1" && !String(this.areaId()).includes("aperture-annex") && hashSeed(`${this.save.seed}:gate-predator:v1:${this.areaId()}`) % 1000 < 12)
      this.map.enemySpawns.push({ kind: "gateRevenant", x: 18, y: 6, gatePredator: true });
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
      const atlas = (this.save.atlas ||= {}), key = `${this.rx},${this.ry}`;
      atlas[key] = { terrain: this.map.dominant, sites: this.map.objects
        .filter((o) => ["checkpoint","dungeon","shrine","ruinMarker","shack","bossCue","architecturalDistrict","supplyCache"].includes(o.kind))
        .map((o) => ({ kind: o.kind, name: o.name || (o.kind === "supplyCache" ? "Supply Cache" : o.kind), x: o.x, y: o.y })) };
    }
    this.enemies = this.map.enemySpawns.map((e) => {
      const c = createCombatant(e.kind, e.x, e.y, e.boss, e.traits || []);
      if (e.id) c.id = e.id;
      Object.assign(c, { dungeonRole: e.dungeonRole || null, objectiveId: e.objectiveId || null, wingId: e.wingId || null, arenaId: e.arenaId || null, deepDungeon: !!e.deepDungeon });
      if(c.eliteId){const v=eliteVariant(this.save.seed,c.eliteId,this.areaId());c.variantId=v.variantId;c.eliteModules=[...v.modules];c.eliteVariantModules=[...v.variantModules];c.visualSeed=v.visualSeed;}
      Object.assign(c,{passiveBehavior:e.passiveBehavior||null,ambient:!!e.ambient,pursuesOutdoors:!!(e.shelterAmbush||e.districtResident),shelterAmbush:!!e.shelterAmbush});
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
      ensureAI(c);
      return c;
    });
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
        ensureAI(merged);
        return merged;
      });
      for(const saved of s.enemies||[])if(saved.gatePredator&&!saved.dead&&!this.enemies.some(e=>e.id===saved.id)){const restored={...saved,ai:{...saved.ai}};ensureAI(restored);this.enemies.push(restored)}
      for (const o of this.map.objects)
        if (s.objects?.[o.id]) Object.assign(o, s.objects[o.id]);
      applyFallenTreeCrossings(this.map);
      this.projectiles = (s.projectiles || []).map((p) => ({ ...p }));
      this.effects = (s.effects || []).map((f) => ({
        ...f,
        hits: { ...f.hits },
      }));
      this.eliteHazards=(s.eliteHazards||[]).map(h=>({...h,hits:{...h.hits}}));
    }
    if (area === "dungeon" && (this.map.deepDungeon || this.map.recipe === "deep-v1")) {
      const progress = applyDeepDungeonProgress(this.save, this.areaId(), this.map), defeated = new Set([...(progress.defeatedWingIds || []).map((wing) => `deep-v1-miniboss-${wing}`), ...(progress.defeatedFinalIds || [])]);
      this.enemies = this.enemies.filter((e) => !defeated.has(e.id) && !(e.objectiveId && progress.completedObjectiveIds.includes(e.objectiveId)));
    }
    const areaWidth = mapWidth(this.map, area),
      playerRelocated = relocateIfStranded(this.player, this.map, areaWidth);
    for (const e of this.enemies) relocateIfStranded(e, this.map, areaWidth);
    if (playerRelocated)
      this.message =
        "The changed Corridor settles you onto the nearest stable ground. Your progress and carried items remain intact.";
    this.reconcileConsequences();
    const codex = (this.save.codex ||= { creatures: {}, places: {}, features: {} });
    codex.creatures ||= {};
    codex.places ||= {};
    codex.features ||= {};
    codex.variants ||= {};
    for (const e of this.enemies) {
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
      this.save.explored[`${this.rx},${this.ry}`] = true;
  }
  setPaused(v, now = 0) {
    if (v && !this.paused) this.pauseStarted = now;
    if (!v && this.paused && this.pauseStarted !== null) {
      const d = Math.max(0, now - this.pauseStarted);
      for (const k of [
        "attackReadyAt",
        "attackUntil",
        "meleeUntil",
        "dodgeReadyAt",
        "invulnerableUntil",
        "dodgeUntil",
      ])
        if (this.player[k]) this.player[k] += d;
      if (this.jumpUntil) this.jumpUntil += d;
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
  returnHome() {
    return this.travelToCheckpoint("0,0");
  }
  leaveDungeon(message = "You return to the dungeon entrance.") {
    const q = this.save.session.dungeonReturn || this.save.activeCheckpoint;
    if (!q) return false;
    const pursuer = this.enemies.find((e) => e.gatePredator && e.aggro && !e.dead);
    if (pursuer) pursuer.dead = true;
    abandonDungeon(this.save, this.areaId());
    this.snapshotArea();
    this.save.session.activeDisplacement = null;
    this.rx = q.rx;
    this.ry = q.ry;
    this.loadArea("overworld", false);
    this.player.x = q.x;
    this.player.y = q.y;
    if (pursuer) {
      const e = { ...pursuer, id: `${pursuer.id}-breach-${this.rx}-${this.ry}`, dead: false, x: q.x + 1.2, y: q.y - .4, aggro: true, ai: { ...ensureAI(pursuer), homeX: q.x, homeY: q.y } };
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
    this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
    this.save.session.displacementJourney = null;
    if (before < 2) this.save.consumables.restorativeDraught = 2;
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
      p.x = deep ? (anchor?.x ?? this.map.hub?.x ?? this.map.entry?.x ?? 4) : 4;
      p.y = deep ? (anchor?.y ?? this.map.hub?.y ?? this.map.entry?.y ?? 5) : 5;
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
    for(const pursuer of pursuers){const e={...pursuer,id:`${pursuer.id}-pursuit-${this.rx}-${this.ry}`,dead:false,aggro:true,x:this.player.x-dx*1.4,y:this.player.y-dy*1.4,ai:{...pursuer.ai,homeX:this.player.x,homeY:this.player.y}};this.enemies.push(e)}
    if(pursuers.length)this.message="The Gate Revenant tears through the crossing behind you.";
    this.sync();
  }
  nearestObject() {
    let f = null,
      d = 1.5;
    for (const o of this.map.objects) {
      const n = Math.hypot(o.x - this.player.x, o.y - this.player.y);
      if (n < d && validActions(o, this.save).length) {
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
    if(hidden){journalOnce(this.save,`hidden-displacement:${o.id}`,'A concealed Folded Seam displaced you only after you crossed fully inside a shelter. Triggered seams keep a faint scar; untouched shelters reveal nothing.','Shelter hazards');this.defeatNotice={title:'HIDDEN SEAM TRIGGERED',detail:'the shelter folds into an unknown crossing',kind:'discovery'}}
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
    if (!o)
      return {
        ok: false,
        message: (this.message = "Nothing nearby responds."),
      };
    if (o.kind === "deepAnchor") {
      if (o.state !== "active") return { ok: false, message: (this.message = "The anchor has no path to remember yet.") };
      const progress = deepDungeonProgress(this.save, this.areaId());
      progress.activeAnchor = { id: o.id, x: o.x, y: o.y, levelId:this.map.levelId||"root",name: o.name || "deep anchor" };
      if (!progress.activatedAnchorIds.includes(o.id)) progress.activatedAnchorIds.push(o.id);
      this.message = `${o.name || "Deep anchor"} fixed as the expedition recovery point.`; this.sync(); return { ok: true, message: this.message };
    }
    if(o.kind==="deepTransition"){
      const progress=deepDungeonProgress(this.save,this.areaId());this.snapshotArea();this.save.session.activeDungeonLevelId=o.toLevelId;progress.currentLevelId=o.toLevelId;if(!progress.discoveredLevelIds.includes(o.toLevelId))progress.discoveredLevelIds.push(o.toLevelId);this.loadArea("dungeon",false);this.player.x=o.toX;this.player.y=o.toY;this.projectiles=[];this.effects=[];this.message=`${this.map.levelName||o.toLevelId} reached.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==="deepShortcut"){
      const progress=deepDungeonProgress(this.save,this.areaId()),ready=progress.completedObjectiveIds.includes(o.unlockObjectiveId);if(!ready)return{ok:false,message:this.message=`${o.name} has no visible seam yet.`};if(!progress.openedShortcutIds.includes(o.id))progress.openedShortcutIds.push(o.id);applyDeepDungeonProgress(this.save,this.areaId(),this.map);this.defeatNotice={title:"SHORTCUT OPENED",detail:`${o.name} · a physical route returns toward the hub`,kind:"discovery"};this.message=`${o.name} opens. The concealed corridor now joins the explored floor.`;this.sync();return{ok:true,message:this.message};
    }
    if(o.kind==="deepPortal"){
      const progress=deepDungeonProgress(this.save,this.areaId()),ready=o.unlockOnCompletion?progress.completed:!o.unlockObjectiveId||progress.completedObjectiveIds.includes(o.unlockObjectiveId);if(!ready)return{ok:false,message:this.message=o.unlockOnCompletion?"The return lattice is silent while the final guardian lives.":"The return lattice has not awakened."};if(o.targetLevelId&&o.targetLevelId!==(this.map.levelId||"root")){this.snapshotArea();this.save.session.activeDungeonLevelId=o.targetLevelId;progress.currentLevelId=o.targetLevelId;if(!progress.discoveredLevelIds.includes(o.targetLevelId))progress.discoveredLevelIds.push(o.targetLevelId);this.loadArea("dungeon",false);}this.player.x=o.toX;this.player.y=o.toY;this.projectiles=[];this.effects=[];this.message=o.unlockOnCompletion?"The final return lattice carries you back to the expedition hub.":"The return portal folds the cleared route back to the hub.";this.sync();return{ok:true,message:this.message};
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
      this.player.x = o.toX; this.player.y = o.toY; this.projectiles = []; this.effects = []; this.traversal = null;
      this.message = "The cleared wing folds back into the central chamber.";
      this.sync();
      return { ok: true, message: this.message };
    }
    if (o.kind === "sealedGate") {
      const progress = applyDeepDungeonProgress(this.save, this.areaId(), this.map), requirements = this.map.finalGate?.requires || (this.map.wings || []).map((wing) => wing.id), completed = new Set([...(progress?.completedObjectiveIds || []), ...(progress?.defeatedWingIds || [])]), remaining = requirements.filter((id) => !completed.has(id)).length;
      this.message = remaining ? `The final seal holds. ${remaining} wing guardian${remaining === 1 ? " remains" : "s remain"}.` : "The three seals are broken. The final chamber stands open.";
      return { ok: true, message: this.message };
    }
    if (!action && ["npc", "dungeon", "relayTerminal","shelterMerchant","displacementDevice","elitePortal"].includes(o.kind)) {
      this.interactionRequested = o.id;
      return {
        ok: true,
        message: (this.message =
          (o.name || "Crossing") + " — choose an action."),
      };
    }
    const chosen = action || validActions(o, this.save)[0],
      before = this.save.hp,
      r = applyInteraction(o, chosen, this.save, this.areaId());
    this.message = r.message;
    if (!r.ok) return r;
    if ((o.kind === "npc"||o.kind==="shelterMerchant") && chosen === "trade") this.shopRequested = o.id;
    if (this.save.hp !== before)
      this.player.hp = Math.min(
        this.save.maxHp,
        this.player.hp + (this.save.hp - before),
      );
    if (o.kind === "tree" && chosen === "climb") {
      this.player.x = o.x + 2;
      this.player.y = o.y - 2;
    }
    if (o.kind === "tree" && chosen === "cut") applyFallenTreeCrossings(this.map);
    if(r.transition==="elitePortal"){
      this.save.session.dungeonReturn={rx:this.rx,ry:this.ry,x:this.player.x,y:this.player.y};this.save.session.activeDungeonId=`elite-portal:${this.save.seed}:knife-choir`;const h=dungeonHistory(this.save,this.save.session.activeDungeonId);h.visits++;h.visitOpen=true;this.loadArea('dungeon');this.player.x=4;this.player.y=5;
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
      this.save.session.activeDungeonLevelId=null;
      const preview=generateDungeon(this.save.seed,this.save.session.activeDungeonId);if(preview.multiLevel)this.save.session.activeDungeonLevelId=preview.levels[0].id;
      const h = dungeonHistory(this.save, this.save.session.activeDungeonId);
      h.visits++;
      h.visitOpen = true;
      this.loadArea("dungeon");
      this.player.x = this.map.entry?.x ?? 4;
      this.player.y = this.map.entry?.y ?? 5;
    } else if (r.transition === "exit") {
      if(this.save.session.activeDisplacement){if(this.enemies.some(e=>!e.dead&&e.kind==="hollowMarshal")){this.message="The Mislaid Threshold remains sealed while its guardian lives.";return{ok:false,message:this.message}}const d=this.save.session.activeDisplacement;this.snapshotArea();this.rx=d.destination.rx;this.ry=d.destination.ry;this.save.session.displacementJourney={source:d.source,destination:d.destination};this.save.session.activeDisplacement=null;this.save.session.activeDungeonId=null;this.loadArea("overworld",false);this.player.x=16;this.player.y=16;relocateIfStranded(this.player,this.map,mapWidth(this.map,'overworld'));this.message="The completed crossing releases you onto stable ground in a distant, uncharted Corridor. Find a physical Wayglass to restore travel."}else this.leaveDungeon("You emerge at the dungeon entrance.");
    } else if (r.transition === "checkpoint") {
      this.save.session.displacementJourney=null;
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
      if (
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
        if (!deep) delete this.save.session.areas[id];
        this.loadArea("dungeon", false);
        for (const o of this.map.objects)
          if (claimed[o.id]?.state === "used") o.state = "used";
        const recovery = deep ? deepDungeonProgress(this.save, id).activeAnchor : null;
        this.player.x = deep ? (recovery?.x ?? this.map.hub?.x ?? this.map.entry?.x ?? 4) : 4;
        this.player.y = deep ? (recovery?.y ?? this.map.hub?.y ?? this.map.entry?.y ?? 5) : 5;
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

  defeatEnemy(e) {
    if (e.rewarded) return;
    if(e.noRewards){e.rewarded=true;return}
    if (e.ambient) {
      e.rewarded = true;
      this.message = e.kind === "hushling" ? "The hushling unthreads into violet motes." : "The quiet creature falls. Nothing in it was meant as loot.";
      return;
    }
    this.defeatNotice = enemyDefeatNotice(e, this.area);
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
      progress.completed = true; history.resolved = true; history.guardianDefeated = true; history.visitOpen = false;
      applyDeepDungeonProgress(this.save,this.areaId(),this.map);
      if (!progress.rewardClaimed) {
        progress.rewardClaimed = true;
        this.save.materials.weaponSphere = (this.save.materials.weaponSphere || 0) + 1;
        this.save.materials.armorSphere = (this.save.materials.armorSphere || 0) + 1;
      }
      this.defeatNotice = { title: "DEEP GUARDIAN FELLED", detail: `${this.map.name.toUpperCase()} CLEARED · weapon sphere + armor sphere`, kind: "danger" };
      if(this.map.objects.some(o=>o.kind==="deepPortal"&&o.unlockOnCompletion))this.message="FINAL RETURN OPENED — the awakened lattice can return you to the expedition hub.";
      journalOnce(this.save, `deep-complete:${this.areaId()}`, `The required routes of ${this.map.name} were opened and its final guardian was defeated. The expedition yielded one weapon sphere and one armor sphere.`, `${this.map.name} — cleared`);
    }
    if (e.kind === "hollowMarshal" && !e.dungeonRole && recordRelayChain(this.save, this.areaId()))
      this.defeatNotice.detail += " · the buried network answered";
    if(['ashling','glassMite'].includes(e.kind))recordPortalPrey(this.save,e.kind);
    if(e.eliteId){const reward=completeElite(this.save,e.eliteId);if(reward){this.save.codex.elites||={};this.save.codex.elites[e.eliteId]={encountered:1,defeated:1,modules:[...(e.eliteModules||[])],variantId:e.variantId,habitat:this.areaId()};journalOnce(this.save,'elite-defeated:'+e.eliteId,`${e.eliteName} fell. Its observed aspects were ${(e.eliteModules||[]).join(', ')}. Reward: ${reward.marks} marks and one ${reward.material.replace('Sphere',' sphere')}.`,'Elite bestiary');}}
    e.rewarded = true;
    const marks = e.boss ? 12 : e.apertureEncounter ? 6 : 1 + hashSeed(`${this.save.seed}:marks:${this.areaId()}:${e.id}`) % 3;
    this.save.currency += marks;
    const oldHp = this.save.maxHp,
      oldStamina = this.save.maxStamina,
      levels = awardExperience(this.save, e.boss ? 35 : 10);
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
    if (!levels) this.message = `Recovered ${marks} mark${marks === 1 ? "" : "s"} from the fallen creature.`;
    if(this.save.narrative.facts['leads.active']){this.save.worldFlags['lead.hunt.count']=(this.save.worldFlags['lead.hunt.count']||0)+1;if(this.save.worldFlags['lead.hunt.count']>=5)progressLead(this.save,'hunt');if(e.kind==='hollowMarshal')progressLead(this.save,'guardian')}
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
  primaryAttack(now = 0) {
    if (now < (this.player.attackReadyAt || 0)) return [];
    this.player.attackReadyAt = now + 420;
    this.player.attackUntil = now + 240;
    this.player.meleeUntil = now + 240;
    const baseProfile = primaryProfile(this.save.equipment.primary),
      profile = { ...baseProfile, range: baseProfile.range * (1 + characterStats(this.save).attackReach) },
      geometry = meleeAttackGeometry(
        this.player,
        profile,
        this.player.meleeAim || this.save.lastAim,
      );
    this.player.meleeStrike = { ...geometry };
    const hits = primaryAttackHits(
      this.player,
      [...this.enemies, ...this.npcTargets()],
      this.map,
      mapWidth(this.map, this.area),
      profile,
      { x: geometry.dx, y: geometry.dy },
    );
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
      e.hp -= profile.damage + characterStats(this.save).meleeBonus;
      e.hitFlash = 0.18;
      e.recoil = 0.14;
      if (e.hp <= 0) {
        e.dead = true;
        this.defeatEnemy(e);
      }
    }
    this.reconcileConsequences();
    this.attackProfile = profile;
    return hits;
  }
  fireSecondary(now = 0, direction = null) {
    const weapon = rangedWeapon(this.save.equipment.secondary);
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
    this.player.attackReadyAt = now + 360;
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
    });
    return true;
  }
  castSpell() {
    const spell = SPELLS[this.save.equippedSpell] || SPELLS["ember-ring"];
    if (this.spellCooldownRemaining > 0) {
      this.message = `${spell.name} recovers in ${Math.ceil(this.spellCooldownRemaining)}s.`;
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
    this.effects.push({
      id: `spell-${(this.save.effectCounter = (this.save.effectCounter || 0) + 1)}`,
      kind: spell.id,
      x,
      y,
      life: spell.lifetime,
      radius: spell.radius,
      pulse: spell.pulse,
      untilPulse: 0,
      damage: spell.damage + characterStats(this.save).magicBonus,
      pulseIndex: 0,
      hits: {},
    });
    this.spellCooldownRemaining = spell.cooldown;
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
  update(dt, input, now) {
    if (this.paused) return;
    const p = this.player;
    this.guardRemaining = Math.max(0, this.guardRemaining - dt);
    this.magicBuffRemaining = Math.max(0, this.magicBuffRemaining - dt);
    this.spellCooldownRemaining = Math.max(0, this.spellCooldownRemaining - dt);
    if (this.reticle) this.reticle.life -= dt;
    let rawX = Number(input.state.x) || 0,
      rawY = Number(input.state.y) || 0,
      m = Math.hypot(rawX, rawY),
      scale = m > 1 ? 1 / m : 1,
      x = rawX * scale,
      y = rawY * scale;
    if (Math.hypot(x, y) > 0.15)
      this.save.lastAim = projectileDirection(x, y, p.facing);
    if (input.consume("tool")) {
      this.save.aimMode = "tool";
      this.save.toolMode = true;
      const weapon=rangedWeapon(this.save.equipment.secondary),width=mapWidth(this.map,this.area),
        aim=weapon&&selectRangedAim(this.player,this.enemies,this.map,width,weapon.speed*weapon.lifetime*(1+characterStats(this.save).attackReach));
      this.fireSecondary(now, aim || this.save.lastAim);
    }
    if (input.consume("spell")) this.castSpell();
    if (input.consume("dodge")) {
      const r = dodge(p, now, x, y);
      if (!r.ok) this.message = "Not enough stamina to dodge.";
    }
    if (input.consume("jump")) {
      if (now < this.jumpUntil) this.message = "Already airborne.";
      else this.jumpUntil = now + 520;
    }
    if (input.consume("potion")) this.useConsumable("restorativeDraught", now);
    const dodging = now < (p.dodgeUntil || 0);
    if (dodging) {
      x = p.dodgeX;
      y = p.dodgeY;
    }
    const speed = (dodging ? 4.8 : 2.4) * (1 + characterStats(this.save).moveSpeed),
      dx = x * speed * dt,
      dy = y * speed * dt,
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
    const terrainHazard=footprintHazard(this.map,width,nx,ny),fellIntoHazard=!!terrainHazard;
    if(fellIntoHazard){p.hp=0;this.message=terrainHazard==="canyon"?"The ledge gives way beneath the Wayfarer.":"The water closes over the Wayfarer."}
    else moveAxis(p, dx, dy, this.map, width);
    if(!fellIntoHazard&&this.area==='overworld'){
      const tile=this.map.tiles[Math.floor(p.y+.7)*width+Math.floor(p.x+.5)],inside=tile?.structure==='shackInterior';
      if(inside){const trap=this.map.objects.find(o=>o.kind==='displacementTrap'&&o.state!=='used'&&!this.save.worldFlags[`displacement-trigger:${this.rx},${this.ry}:${o.id}`]&&Math.hypot(o.x+.5-(p.x+.5),o.y+.5-(p.y+.7))<.55);if(trap){this.startDisplacement(trap,true);return}const hazard=this.map.objects.find(o=>o.kind==='shelterHazard'&&o.state==='armed'&&!this.save.worldFlags[`shelter-hazard:${this.rx},${this.ry}:${o.id}`]&&Math.hypot(o.x+.5-(p.x+.5),o.y+.5-(p.y+.7))<.6);if(hazard){const key=`shelter-hazard:${this.rx},${this.ry}:${hazard.id}`;this.save.worldFlags[key]=true;hazard.state='spent';p.hp=Math.max(1,p.hp-(hazard.damage||10));this.message=`${hazard.name} erupts. ${hazard.damage||10} damage — the mechanism falls quiet.`;journalOnce(this.save,`shelter-hazard:${hazard.hazardType}`,`Shelters may conceal ${hazard.name.toLowerCase()} mechanisms. Their floor marks can be inspected, avoided, and remembered.`,'Shelter hazards');this.sync()}}
    }
    if (!fellIntoHazard&&input.consume("attack")) {
      this.save.aimMode = "attack";
      this.save.toolMode = false;
      this.primaryAttack(now);
    }
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
    if(!fellIntoHazard)this.projectiles = updateProjectiles(
      this.projectiles,
      [...this.enemies, ...this.npcTargets()],
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
        p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?shot.damage*.65:shot.damage)*(1-characterStats(this.save).damageReduction)));
        p.invulnerableUntil=now+700;
      },
    );
    this.syncNpcDamage("projectile");
    for(const fx of this.effects)if(fx.hostile&&!fx.hitPlayer&&Math.hypot(p.x+.5-fx.x,p.y+.52-fx.y)<=fx.radius){fx.hitPlayer=true;const safe=sanctuary&&Math.hypot(p.x-sanctuary.x,p.y-sanctuary.y)<sanctuary.radius;if(!safe&&now>(p.invulnerableUntil||0)){p.hp-=Math.max(1,Math.ceil((this.guardRemaining>0?fx.damage*.65:fx.damage)*(1-characterStats(this.save).damageReduction)));p.invulnerableUntil=now+700}}
    this.effects = updateEffects(
      this.effects,
      [...this.enemies, ...this.npcTargets()],
      dt,
      (e) => {
        if (e.kind !== "npc") this.defeatEnemy(e);
      },
    );
    this.syncNpcDamage("spell");
    const eliteStatus=ensureEliteState(this.save).status;tickEliteStatus(eliteStatus,dt,n=>{if(now>(p.invulnerableUntil||0)){p.hp-=n;p.invulnerableUntil=now+350}});this.eliteHazards=tickEliteHazards(this.eliteHazards,dt);for(const h of this.eliteHazards)if(Math.hypot(p.x-h.x,p.y-h.y)<=h.radius&&now>(h.nextHit||0)){p.hp-=h.damage;h.nextHit=now+1000;if(h.poison)h.poison&&((eliteStatus.poison=Math.max(eliteStatus.poison,8)),eliteStatus.poisonTick=1)}
    for(const e of this.enemies){if(e.dead||!e.eliteId)continue;e.eliteCooldown=Math.max(0,(e.eliteCooldown||0)-dt);const distance=Math.hypot(e.x-p.x,e.y-p.y);if(e.eliteModules.includes('gravity')&&distance<6){if(e.eliteWindup>0){e.eliteWindup-=dt;if(e.eliteWindup<=0)e.eliteActive=1.15}else if(e.eliteActive>0){e.eliteActive-=dt;gravityPull(p,e,dt,1.65,6)}else if(e.eliteCooldown<=0){e.eliteWindup=1.1;e.eliteCooldown=7}}if(e.eliteModules.some(m=>m==='trail'||m==='oozePool')&&e.eliteCooldown<=0){addEliteHazard(this.eliteHazards,{id:`elite-hazard-${e.id}-${now}`,owner:e.id,kind:'ooze',x:e.x,y:e.y,life:6,radius:1.15,damage:4,poison:true,nextHit:0},8);e.eliteCooldown=3.5}if(e.eliteModules.includes('summon')&&e.eliteCooldown<=0){const adds=this.enemies.filter(q=>!q.dead&&q.summonedBy===e.id);if(adds.length<3){const add=createCombatant(e.kind==='knifeChoir'?'glassMite':'ashling',e.x+1,e.y,false,[]);add.id=`summon-${e.id}-${now}-${adds.length}`;add.summonedBy=e.id;add.noRewards=true;this.enemies.push(add)}e.eliteCooldown=8}}
    p.stamina = Math.min(p.maxStamina, p.stamina + 9 * dt);
    for (const e of this.enemies)
      if (
        !fellIntoHazard&&
        !e.dead &&
        updateEnemyAI(e, p, this.map, width, dt, now, /^(ashling|glassMite|sparkWarden|ashenHound|veilMoth|rootBrute|coilStalker|cinderWisp|hollowMarshal|riftColossus|voidSentinel)-/.test(e.id)?sanctuary:null,(shooter,aim)=>this.projectiles.push(...enemyProjectilePattern(shooter,aim,now))) &&
        now > (p.invulnerableUntil || 0) &&
        (!(now < this.jumpUntil) || e.kind === "sparkWarden")
      ) {
        p.hp -= Math.max(
          1,
          Math.ceil(
            (this.guardRemaining > 0 ? e.damage * 0.65 : e.damage) *
              (1 - characterStats(this.save).damageReduction),
          ),
        );
        p.invulnerableUntil = now + 700;
      }
    if (p.hp <= 0) {
      if (this.area === "dungeon") abandonDungeon(this.save, this.areaId());
      const c = this.save.activeCheckpoint;
      this.save.worldFlags.deaths = (this.save.worldFlags.deaths || 0) + 1;
      this.save.session.displacementJourney=null;
      const before = this.save.consumables.restorativeDraught || 0;
      if (before < 2) this.save.consumables.restorativeDraught = 2;
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
      this.eliteHazards=[];Object.assign(ensureEliteState(this.save).status,{poison:0,poisonTick:0,stun:0,stunGuard:2});
      input.reset?.();
      this.rx = c.rx;
      this.ry = c.ry;
      this.loadArea("overworld");
      p.x = c.x;
      p.y = c.y;
      p.invulnerableUntil = now + 2000;
      this.message = `${fellIntoHazard?(terrainHazard==="canyon"?"Lost to the canyon":"Lost beneath the water"):"Felled"} — recovered at ${c.name || "checkpoint"}. No items, marks, equipment, or XP were lost. You are protected briefly.${before < 2 ? " Restorative draughts replenished to 2." : ""}`;
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
