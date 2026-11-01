// Astral Worm native Wayglass retreat. Previewing a route never loads the player's scene,
// pins a real history, discovers fog, activates a checkpoint or changes any other beast.
import { generateRegion, dungeonId } from './world.js?v=r666-364d65e9cbbd';
import { applyLandscape, applyDream, DREAM_VERSION, LANDSCAPE_VERSION } from './landscape.js?v=r666-364d65e9cbbd';
import { OPEN_SEA_VERSION } from './open-sea.js?v=r666-364d65e9cbbd';
import { applyHamlet, hamletSection, legacyMouthHamlet, HAMLET_VERSION } from './settlements.js?v=r666-364d65e9cbbd';
import { applyTrails, addTravelers, addReciter, addWanderer, wandererArrive, addElder } from './travelers.js?v=r666-364d65e9cbbd';
import { addSkirmish } from './skirmishes.js?v=r666-364d65e9cbbd';
import { ensureBoatState } from './boats.js?v=r666-364d65e9cbbd';
import { diveSite } from './diving.js?v=r666-364d65e9cbbd';
import { storySiteFor } from './story.js?v=r666-364d65e9cbbd';
import { arrayMouthAt } from './far-array.js?v=r666-364d65e9cbbd';
import { domainSectionAt, activeViewportHunt, huntTraceStage, resolveHuntDestination, ensureHuntInstance } from './foundry.js?v=r666-364d65e9cbbd';
import { hashSeed } from './random.js?v=r666-364d65e9cbbd';
import { populateDungeonTerrainHazards } from './arenas.js?v=r666-364d65e9cbbd';
import { applyTunnels, addDigSpot } from './digging.js?v=r666-364d65e9cbbd';
import { applyVoidScars } from './world-beasts.js?v=r666-364d65e9cbbd';
import { mouthsIn, placeMouth, linkedExit } from './linked-dungeons.js?v=r666-364d65e9cbbd';
import { installCompletionExit } from './dungeon-completion.js?v=r666-364d65e9cbbd';
import { createAstralWayglassSearch, stepAstralWayglassSearch, createAstralRetreatJourney, stepAstralRetreat, isAstralWayglass } from './astral-worm-retreat.js?v=r666-364d65e9cbbd';

export const ASTRAL_WORLD_RETREAT = Object.freeze({ version:1, maps:64, mapCells:65536, sceneCells:131072, generatedPerStep:1, segment:.125, retry:1, remoteRetry:2, topologyCells:128 });
const WATER = new Set(['ocean','deepOcean','lakeWater','river','dungeonWater','shallows','swampWater','mireWater','toxicWater']);
const AIRBORNE = new Set([...WATER,'canyon']);
const CLOSED = new Set(['closed','locked','sealed','dormant','hidden']);
const copy = value => JSON.parse(JSON.stringify(value));
const widthOf = map => Number(map?.width) || (map?.tiles?.length === 1024 ? 32 : 24);
const point = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
const samePoint = (a,b) => point(a) && point(b) && Math.abs(a.x-b.x)<1e-7 && Math.abs(a.y-b.y)<1e-7;
const nodeAt = (scene,x,y,extra={}) => ({key:`${scene.key}|${x},${y}`,sceneKey:scene.key,x,y,...extra});
function overworldScene(save,rx,ry) { const nativeKey=`overworld:${rx}:${ry}:g${save.worldGeneration}`;return {key:nativeKey,nativeKey,area:'overworld',rx,ry}; }
function dungeonScene(id,levelId,returnPoint,rx,ry) {
  const nativeKey=levelId && levelId!=='root' ? `${id}:level:${levelId}` : id;
  const mouth=returnPoint ? `${returnPoint.rx},${returnPoint.ry},${returnPoint.x},${returnPoint.y}` : 'unknown';
  return {key:`${nativeKey}@return:${mouth}`,nativeKey,area:'dungeon',dungeonId:id,levelId:levelId||null,returnPoint:returnPoint?{...returnPoint}:null,rx,ry};
}
export function astralRetreatScene(game) {
  return game.area==='dungeon' ? dungeonScene(game.areaId(),game.map?.multiLevel ? game.map.levelId || game.save.session.activeDungeonLevelId : null,game.save.session.dungeonReturn,game.rx,game.ry) : overworldScene(game.save,game.rx,game.ry);
}
export function astralRetreatSceneMatches(scene,game) {
  if(!scene || scene.area!==game.area)return false;
  return scene.area==='overworld' ? scene.rx===game.rx && scene.ry===game.ry : scene.dungeonId===game.areaId() && (scene.actualLevelId || scene.levelId || 'root') === (game.map?.levelId || 'root');
}

// Same lower-body footprint as native flight: water/canyon gaps and unblocked floor
// hazards (including native volcanic lava) can be overflown. Solid overlays and blocked
// lava/abyss remain barriers; thin structural walls keep their exact footprint checks.
// A legal combat flight position must not become an inescapable retreat start.
export function astralRetreatPositionOpen(map,x,y) {
  if(!point({x,y}) || !Array.isArray(map?.tiles))return false;
  const width=widthOf(map),height=map.tiles.length/width,left=x+.24,right=x+.76,top=y+.5,bottom=y+.88;
  for(let ty=Math.floor(top);ty<=Math.floor(bottom-1e-6);ty++)for(let tx=Math.floor(left);tx<=Math.floor(right-1e-6);tx++){
    if(tx<0||ty<0||tx>=width||ty>=height)return false;
    const t=map.tiles[ty*width+tx];if(!t)return false;
    const water=AIRBORNE.has(t.kind)&&!t.structure&&!t.buildingId&&(!t.pit||t.kind==='canyon');
    if(t.blocked&&!water || AIRBORNE.has(t.kind)&&!water)return false;
    if(!['shackWall','districtWall'].includes(t.structure)||!t.wallSides?.length)continue;
    for(const side of t.wallSides){const b=side==='west'?[tx,tx+.22,ty,ty+1]:side==='east'?[tx+.78,tx+1,ty,ty+1]:side==='north'?[tx,tx+1,ty,ty+.22]:[tx,tx+1,ty+.78,ty+1];if(right>b[0]&&left<b[1]&&bottom>b[2]&&top<b[3])return false;}
  }
  return true;
}
export function astralRetreatSegmentOpen(map,from,to) {
  if(!point(from)||!point(to)||Math.abs(from.x-to.x)>1.000001||Math.abs(from.y-to.y)>1.000001)return false;
  if(Math.abs(from.x-to.x)>1e-7&&Math.abs(from.y-to.y)>1e-7)return false;
  const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/ASTRAL_WORLD_RETREAT.segment));
  for(let i=0;i<=steps;i++)if(!astralRetreatPositionOpen(map,from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps))return false;
  return true;
}

// Mouth placement excludes every pre-existing object, not just collision objects. Mirror
// native load ordering on this isolated map/save, without constructing combat actors,
// recording discoveries, granting rewards or changing the player's random stream.
function previewSurfaceSites(map,save,rx,ry,options) {
  const boat=ensureBoatState(save),moored=boat.moored;
  if(boat.owned&&!boat.aboard&&moored&&moored.rx===rx&&moored.ry===ry)map.objects.push({id:'skiff-moored',kind:'skiff',x:moored.x,y:moored.y});
  const dive=diveSite(map,save.seed,rx,ry);if(dive)map.objects.push(dive);
  const story=storySiteFor(save,rx,ry);
  if(story&&!map.objects.some(o=>o.id===story.id)){const t=map.tiles[story.y*32+story.x];if(!t?.blocked&&!t?.structure)map.objects.push(story);}
  const domain=(options.domainAt||domainSectionAt)(save,rx,ry);
  if(map.openSea&&(Object.values(save.viewport?.contracts||{}).some(q=>q.target?.rx===rx&&q.target?.ry===ry&&!['archived','completed'].includes(q.status))||domain)){
    map.huntersRaft=true;
    for(let y=14;y<=18;y++)for(let x=14;x<=18;x++){const i=y*32+x;map.tiles[i]={...map.tiles[i],kind:'dock',blocked:false,elev:0,landscape:'coast'};}
    map.objects.push({id:`hunters-raft-${rx}-${ry}`,kind:'ruinMarker',x:14,y:14});
  }
  const hunt=activeViewportHunt(save),open=map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>6&&t.x<27&&t.y>6&&t.y<27&&(!map.huntersRaft||(t.x>=14&&t.x<=18&&t.y>=14&&t.y<=18)));
  if(domain&&open.length){const at=open[hashSeed(domain.section.id+':marker')%open.length];map.objects.push({id:domain.section.id+':marker',kind:'ruinMarker',x:at.x,y:at.y});}
  const stage=huntTraceStage(hunt);
  if(stage>=0){if(hunt.target?.rx===rx&&hunt.target?.ry===ry&&open.length){const at=open[hashSeed(`${hunt.id}:trace:${stage}`)%open.length];map.objects.push({id:`hunt-trace:${hunt.id}:${stage}`,kind:'huntTrace',x:at.x,y:at.y});}}
  else if(hunt&&hunt.target?.rx===rx&&hunt.target?.ry===ry&&!['completed','archived'].includes(hunt.status)){
    hunt.status='target-located';const destination=resolveHuntDestination(save,hunt.id,map);
    if(destination?.kind==='temporary-arena'&&open.length){const at=open[hashSeed(`${hunt.id}:target`)%open.length],instance=ensureHuntInstance(save,hunt.id);map.objects.push({id:`instance-gate:${hunt.id}`,kind:instance?.completed?'huntScar':'huntInstance',x:at.x,y:at.y,instanceId:instance?.id});}
  }
  for(const q of Object.values(save.viewport?.contracts||{}))if(q.kind==='trial'&&q.status==='completed'&&q.target?.rx===rx&&q.target?.ry===ry){const instance=ensureHuntInstance(save,q.id);if(instance?.scar&&open.length&&!map.objects.some(o=>o.instanceId===instance.id)){const at=open[hashSeed(`${q.id}:target`)%open.length];map.objects.push({id:`instance-scar:${q.id}`,kind:'huntScar',x:at.x,y:at.y,instanceId:instance.id});}}
  if(rx===-5&&ry===3)map.objects.push({id:'knife-choir-portal',kind:'elitePortal',x:20,y:16});
}
function previewSurfaceOccupants(map,save,rx,ry) {
  // Skirmish presence suppresses native road walkers and dig spots. Its isolated
  // spawn descriptors are not needed by routing and never become real actors.
  const spawns=map.enemySpawns;addSkirmish(map,save.seed,rx,ry,save);map.enemySpawns=spawns;
  if(arrayMouthAt(save,rx,ry)&&!map.objects.some(o=>o.kind==='arrayMouth')){
    const spots=map.tiles.filter(t=>!t.blocked&&!t.structure&&!t.environment&&t.x>10&&t.x<22&&t.y>10&&t.y<22).sort((a,b)=>Math.hypot(a.x-16,a.y-16)-Math.hypot(b.x-16,b.y-16)),at=spots[0]||{x:16,y:16};
    map.objects.push({id:'array-mouth',kind:'arrayMouth',x:at.x,y:at.y});
  }
  addTravelers(map,save.seed,rx,ry);addReciter(map,save.seed,rx,ry,save,true);
  addWanderer(map,save,rx,ry);wandererArrive(save,map,rx,ry);addElder(map,save,rx,ry);addDigSpot(map,save,rx,ry);
}

// A fresh copy is used because the existing pinned generator legitimately normalizes
// histories. The preview copy is never assigned back to the live save.
export function previewAstralScene(game,scene,options={}) {
  if(options.sceneMap)return options.sceneMap(scene);
  let save=options.previewSave || copy(game.save),map;
  // Each prospective link is private to this candidate scene, never another preview.
  if(scene.previewLinks){save=copy(save);save.linkedDungeons={...save.linkedDungeons,...copy(scene.previewLinks)};}
  if(scene.area==='overworld'){
    const {rx,ry}=scene,seen=save.atlas?.[`${rx},${ry}`],remembered=save.checkpoints?.[`${rx},${ry}`];
    map=generateRegion(save.seed,rx,ry,save.worldGeneration);
    applyLandscape(map,save.seed,rx,ry,{explored:!!seen&&!seen.landscapeVersion,version:seen?.landscapeVersion||LANDSCAPE_VERSION,openSea:!seen?OPEN_SEA_VERSION:seen.seaVersion||0,buoy:!remembered||remembered.name==='Lighthouse Buoy',hamlet:(!seen||!!seen.hamletVersion)&&(hamletSection(save.seed,rx,ry)||legacyMouthHamlet(save,rx,ry))});
    if(!seen||seen.dreamVersion)applyDream(map,save.seed,rx,ry,seen?.dreamVersion||DREAM_VERSION);if(!seen||seen.hamletVersion)applyHamlet(map,save.seed,rx,ry,seen?.hamletVersion||HAMLET_VERSION,false,legacyMouthHamlet(save,rx,ry));
    if(!seen||seen.travelVersion)applyTrails(map,save.seed,rx,ry);
    previewSurfaceSites(map,save,rx,ry,options);
    if(remembered&&(rx||ry)&&!map.objects.some(o=>o.kind==='checkpoint')){
      const x=Math.max(1,Math.min(30,Number.isFinite(remembered.x)?remembered.x:16)),y=Math.max(1,Math.min(30,Number.isFinite(remembered.y)?remembered.y:16));
      map.tiles[y*32+x]={...map.tiles[y*32+x],x,y,kind:map.dominant,blocked:false};
      map.objects.push({id:`remembered-wayglass-${rx}-${ry}`,kind:'checkpoint',semanticRole:'wayglass',name:remembered.name||'Remembered Wayglass',x,y,state:'active',remembered:true});
    }
    previewSurfaceOccupants(map,save,rx,ry);
    for(const id of mouthsIn(save,rx,ry))placeMouth(map,id);
  } else {
    if(typeof options.previewDungeon!=='function')return null;
    save.session.dungeonReturn=scene.returnPoint?{...scene.returnPoint}:null;
    map=options.previewDungeon(save,scene.dungeonId,scene.levelId||undefined);
    if(!map)return null;
    scene.actualLevelId=map.levelId||'root';scene.nativeKey=map.multiLevel?`${scene.dungeonId}:level:${map.levelId}`:scene.dungeonId;
    applyTunnels(map,save,scene.nativeKey);
    if(map.recipe==='cistern')for(const [x,y] of [[11,4],[12,4],[11,5],[12,5]]){const i=y*widthOf(map)+x,t=map.tiles[i];if(t&&!t.blocked)map.tiles[i]={...t,kind:'dungeonWater',blocked:true,waterDepth:'shallow'};}
    if(!map.arena&&!scene.dungeonId.startsWith('hunt-instance:')&&!scene.dungeonId.startsWith('elite-portal:')&&!scene.dungeonId.includes('aperture-annex'))populateDungeonTerrainHazards(map);
  }
  const snapshot=save.session?.areas?.[scene.nativeKey];
  for(const o of map.objects||[])if(snapshot?.objects?.[o.id])Object.assign(o,snapshot.objects[o.id]);
  for(const o of map.objects||[])if(o.kind==='tree'&&o.state==='fallen')for(const p of o.crossingTiles||[]){const i=p.y*widthOf(map)+p.x,t=map.tiles[i];if(t?.environment)map.tiles[i]={...t,kind:'logBridge',blocked:false,bridgeOver:t.environment};}
  if(scene.area==='dungeon'){
    options.applyDungeonProgress?.(save,scene.dungeonId,map);
    const history=save.consequences?.dungeons?.[scene.dungeonId];if(history)installCompletionExit(map,history);
  }
  applyVoidScars(save,map,scene.nativeKey);
  return map;
}

// Compact topology is part of the retreat save, not a generated world history. Lazy
// decoding keeps a restored search's exact frontier/work schedule without rebuilding
// every preview scene or allocating every tile eagerly on the next active frame.
const AIRBORNE_NAMES=[...AIRBORNE,'lava','abyss'];
function packPreview(map) {
  const width=widthOf(map),codes=[];
  for(const t of map.tiles){
    const water=AIRBORNE.has(t?.kind)&&!t?.structure&&!t?.buildingId&&(!t?.pit||t.kind==='canyon');
    if(!t||t.blocked&&!water||AIRBORNE.has(t.kind)&&!water){codes.push(String.fromCharCode(32));continue;}
    const sides=['west','east','north','south'].reduce((n,side,i)=>n|(t.wallSides?.includes(side)?1<<i:0),0);
    const kind=AIRBORNE_NAMES.indexOf(t.kind)+1;
    const code=1|((['shackWall','districtWall'].includes(t.structure)?sides:0)<<1)|(kind<<5)|(t.blocked?512:0)|(t.structure?1024:0);
    codes.push(String.fromCharCode(32+code));
  }
  return {v:2,width,height:map.tiles.length/width,cells:codes.join(''),objects:copy((map.objects||[]).map(o=>isAstralWayglass(o)||['exit','deepTransition','dungeon'].includes(o.kind)?o:{id:o.id,kind:o.kind,x:o.x,y:o.y})),entry:map.entry?{...map.entry}:null,multiLevel:!!map.multiLevel,levelId:map.levelId||null,levelStableId:map.levelStableId||null};
}
function unpackPreview(p) {
  const tiles=new Array(p.cells.length),get=i=>{
    if(tiles[i])return tiles[i];const c=p.cells.charCodeAt(i)-32,sides=(c>>1)&15,kind=(c>>5)&15;
    return tiles[i]={x:i%p.width,y:Math.floor(i/p.width),kind:c&1?AIRBORNE_NAMES[kind-1]||'floor':'wall',blocked:!(c&1)||!!(c&512),...(c&1024?{structure:sides?'shackWall':'structure',...(sides?{wallSides:['west','east','north','south'].filter((_,j)=>sides&(1<<j))}:{})}:{})};
  };
  return {...p,objects:copy(p.objects),tiles:new Proxy(tiles,{get:(array,key)=>typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<array.length?get(Number(key)):Reflect.get(array,key)})};
}

export function createAstralWorldGraph(game,state,options={}) {
  const cache=new Map(),live=state.scenes[state.sceneKey];if(astralRetreatSceneMatches(live,game))cache.set(live.key,game.map);
  state.previews ||= {};
  let built=0,cells=Object.values(state.previews).reduce((n,p)=>n+p.cells.length,0),previewSave=null;
  const generated=new Set();
  const graph={blockedReason:null,beginStep(){built=0;generated.clear();},getScene(scene,proposedLink=null){
    if(proposedLink&&JSON.stringify(scene.previewLinks?.[proposedLink.id])!==JSON.stringify(proposedLink.record)){
      (scene.previewLinks ||= {})[proposedLink.id]=copy(proposedLink.record);
      const existing=cache.get(scene.key)||state.previews[scene.key];
      if(!existing?.objects?.some(o=>o.linked&&o.dungeonId===proposedLink.id)){
        cache.delete(scene.key);generated.delete(scene.key);
        if(state.previews[scene.key]){cells-=state.previews[scene.key].cells.length;delete state.previews[scene.key];}
      }
    }
    if(cache.has(scene.key))return cache.get(scene.key);
    // Earlier prototype previews omitted occupancy, so they cannot certify linked mouths.
    if(state.previews[scene.key]?.v!==2&&state.previews[scene.key]){cells-=state.previews[scene.key].cells.length;delete state.previews[scene.key];}
    if(state.previews[scene.key]){const map=unpackPreview(state.previews[scene.key]);cache.set(scene.key,map);return map;}
    if(Object.keys(state.previews).length>=ASTRAL_WORLD_RETREAT.maps){graph.blockedReason='Native scene preview storage budget exhausted; reachability is unresolved';return null;}
    if(built>=ASTRAL_WORLD_RETREAT.generatedPerStep)return null;
    built++;if(!options.sceneMap)previewSave ||= copy(game.save);const map=previewAstralScene(game,scene,{...options,previewSave});
    if(!map?.tiles||map.tiles.length>ASTRAL_WORLD_RETREAT.mapCells){graph.blockedReason='A physical destination scene is unavailable or exceeds the supported preview budget';return null;}
    if(cells+map.tiles.length>ASTRAL_WORLD_RETREAT.sceneCells){graph.blockedReason='Native preview cell storage budget exhausted; reachability is unresolved';return null;}
    cells+=map.tiles.length;state.previews[scene.key]=packPreview(map);generated.add(scene.key);cache.set(scene.key,map);return map;
  },describe(node){const scene=state.scenes[node.sceneKey],map=scene&&graph.getScene(scene);if(!map)return null;const target=astralRetreatPositionOpen(map,node.x,node.y)&&(map.objects||[]).find(o=>isAstralWayglass(o)&&samePoint(o,node));return target?{...target,...node}:{...node,kind:'floor'};},neighbors(node){
    const scene=state.scenes[node.sceneKey],map=scene&&graph.getScene(scene);if(!map)return null;
    if(!astralRetreatPositionOpen(map,node.x,node.y))return [];
    const edges=[],width=widthOf(map),height=map.tiles.length/width;
    const addScene=s=>state.scenes[s.key] ||= s;
    const add=(dest,x,y,cost,transition)=>{const target=addScene(dest),other=graph.getScene(target);if(!other)return false;if(astralRetreatPositionOpen(other,x,y))edges.push({node:nodeAt(target,x,y,{transition}),cost});return true;};
    const integralX=Number.isInteger(node.x),integralY=Number.isInteger(node.y);
    const xs=integralX?(integralY?[node.x-1,node.x+1]:[]):[Math.floor(node.x),Math.ceil(node.x)];
    const ys=integralY?(integralX?[node.y-1,node.y+1]:[]):[Math.floor(node.y),Math.ceil(node.y)];
    for(const [x,y] of [...xs.map(x=>[x,node.y]),...ys.map(y=>[node.x,y])]){
      if(x>=0&&y>=0&&x<=width-1&&y<=height-1){if(astralRetreatSegmentOpen(map,node,{x,y}))edges.push({node:nodeAt(scene,x,y),cost:Math.hypot(x-node.x,y-node.y)});continue;}
      if(scene.area!=='overworld'||width!==32||height!==32)continue;
      const dx=x<0?-1:x>31?1:0,dy=y<0?-1:y>31?1:0,dest=overworldScene(game.save,scene.rx+dx,scene.ry+dy),tx=x<0?31:x>31?0:x,ty=y<0?31:y>31?0:y;
      if(!add(dest,tx,ty,1,{kind:'section',fromSceneKey:scene.key,fromX:node.x,fromY:node.y,dx,dy}))return null;
    }
    for(const door of map.objects||[]){
      if(!samePoint(door,node)||CLOSED.has(door.state))continue;
      if(scene.area==='dungeon'&&door.kind==='deepTransition'&&typeof door.toLevelId==='string'&&point({x:door.toX,y:door.toY})){
        if(!add(dungeonScene(scene.dungeonId,door.toLevelId,scene.returnPoint,scene.rx,scene.ry),door.toX,door.toY,1,{kind:'level',doorId:door.id,fromSceneKey:scene.key,fromX:node.x,fromY:node.y}))return null;
      } else if(scene.area==='dungeon'&&door.kind==='exit'&&scene.returnPoint){
        let exit={...scene.returnPoint},physicalLink=null,exitScene=null;
        if(door.completionExit){
          if(!game.save.consequences?.dungeons?.[scene.dungeonId]?.combatClear?.completed)continue;
          if(map.multiLevel){const preview=copy(game.save),link=linkedExit(preview,scene.dungeonId,scene.returnPoint);if(link){physicalLink={id:scene.dungeonId,record:copy(preview.linkedDungeons[scene.dungeonId]),mouth:link.mouth};exit={...link};const definition=overworldScene(preview,link.rx,link.ry),prospective=!game.save.linkedDungeons?.[scene.dungeonId];if(link.mouth==='b'&&(prospective||definition.key===live?.key&&!game.map.objects?.some(o=>o.linked&&o.dungeonId===scene.dungeonId)))definition.key+=`@linked:${scene.dungeonId}`;const dest=exitScene=addScene(definition),target=graph.getScene(dest,link.mouth==='b'&&prospective?{id:scene.dungeonId,record:preview.linkedDungeons[scene.dungeonId]}:null);if(!target)return null;if(link.mouth==='b'){const mouth=target.objects.find(o=>o.linked&&o.dungeonId===scene.dungeonId);if(!mouth)continue;exit.x=mouth.x;exit.y=mouth.y+1;}}}
        }
        if(!point(exit))continue;
        if(!add(exitScene||overworldScene(game.save,exit.rx,exit.ry),exit.x,exit.y,1,{kind:'exit',doorId:door.id,fromSceneKey:scene.key,fromX:node.x,fromY:node.y,...(physicalLink?{linkedExit:physicalLink}:{})}))return null;
      } else if(scene.area==='overworld'&&door.kind==='dungeon'&&typeof options.previewDungeon==='function'){
        const id=door.dungeonId||dungeonId(game.save.seed,game.save.worldGeneration,scene.rx,scene.ry,door.id),dest=addScene(dungeonScene(id,null,{rx:scene.rx,ry:scene.ry,x:door.x,y:door.y},scene.rx,scene.ry)),target=graph.getScene(dest);if(!target)return null;
        if(point(target.entry)&&astralRetreatPositionOpen(target,target.entry.x,target.entry.y))edges.push({node:nodeAt(dest,target.entry.x,target.entry.y,{transition:{kind:'entrance',doorId:door.id,fromSceneKey:scene.key,fromX:node.x,fromY:node.y}}),cost:1});
      }
    }
    return edges;
  },recheckRemote(sceneKey){
    const scene=state.scenes[sceneKey],prior=state.previews[sceneKey];if(!scene||!prior)return false;
    if(built>=ASTRAL_WORLD_RETREAT.generatedPerStep)return null;
    built++;const map=previewAstralScene(game,scene,options);
    if(!map?.tiles||map.tiles.length>ASTRAL_WORLD_RETREAT.mapCells)return false;
    const total=cells-prior.cells.length+map.tiles.length;if(total>ASTRAL_WORLD_RETREAT.sceneCells)return false;
    const next=packPreview(map),changed=JSON.stringify(next)!==JSON.stringify(prior);
    cells=total;state.previews[sceneKey]=next;cache.set(sceneKey,map);generated.add(sceneKey);return changed;
  },validateLanding(to){
    const scene=state.scenes[to.sceneKey];if(!scene)return false;
    const valid=map=>{if(!astralRetreatPositionOpen(map,to.x,to.y))return false;const link=to.transition?.linkedExit;if(link?.mouth!=='b')return true;const mouth=map.objects?.find(o=>o.linked&&o.dungeonId===link.id);return !!mouth&&samePoint(to,{x:mouth.x,y:mouth.y+1});};
    if(generated.has(scene.key))return valid(cache.get(scene.key));
    if(built>=ASTRAL_WORLD_RETREAT.generatedPerStep)return false;
    built++;const map=previewAstralScene(game,scene,options);
    if(!map?.tiles||map.tiles.length>ASTRAL_WORLD_RETREAT.mapCells)return false;
    const total=cells-(state.previews[scene.key]?.cells.length||0)+map.tiles.length;
    if(total>ASTRAL_WORLD_RETREAT.sceneCells)return false;cells=total;
    // Departure rechecks current native terrain, not merely a formerly valid saved preview.
    cache.set(scene.key,map);state.previews[scene.key]=packPreview(map);generated.add(scene.key);
    return valid(map);
  },validateTransition(from,to){
    const edges=graph.neighbors(from);return edges?.some(e=>e.node.key===to.key&&e.node.transition?.kind===to.transition?.kind&&e.node.transition?.doorId===to.transition?.doorId&&JSON.stringify(e.node.transition?.linkedExit)===JSON.stringify(to.transition?.linkedExit))===true;
  }};
  return graph;
}

const runtimes=new WeakMap();
function rememberActor(state,actor,full=false) {
  if(full||!state.actor)state.actor=copy(actor);
  Object.assign(state.actor,{x:actor.x,y:actor.y,hp:actor.hp,maxHp:actor.maxHp,damage:actor.damage,dead:false,retreating:true,untargetable:true});
  delete state.actor.fleeTo;delete state.actor.fleePath;
}
export function astralRetreatSpawn(active) {
  const s=active?.astralRetreat;if(s?.v!==ASTRAL_WORLD_RETREAT.version||!s.actor||!s.scenes?.[s.sceneKey])return null;
  return {...copy(s.actor),dead:false,retreating:true,untargetable:true,astralRetreatLeg:s.legs||0};
}
export function beginAstralWorldRetreat(game,actor) {
  const active=game.save.worldBeasts?.astralWorm?.active;if(!active)return null;
  if(active.astralRetreat?.v===ASTRAL_WORLD_RETREAT.version)return active.astralRetreat;
  const scene=astralRetreatScene(game),state={v:ASTRAL_WORLD_RETREAT.version,sceneKey:scene.key,scenes:{[scene.key]:scene},legs:0,search:createAstralWayglassSearch(nodeAt(scene,actor.x,actor.y)),journey:null,blockedFor:0};
  // The generic cleaner may normalize this marker, but never owns the routing record.
  active.retreat={home:active.dungeon?{dungeon:active.dungeon,found:true}:{rx:game.rx,ry:game.ry,found:true},side:null,legs:0};
  active.astralRetreat=state;actor.retreating=true;actor.untargetable=true;delete actor.fleeTo;delete actor.fleePath;
  if(actor.astral){actor.astral.terminated=true;actor.astral.move=null;actor.astral.form='worm';actor.astral.clones=[];actor.astral.hazards=[];}
  for(const e of game.enemies||[])if(e.astralOwner===actor.id){e.dead=true;e.noRewards=true;}
  game.effects=(game.effects||[]).filter(e=>e.owner!==actor.id);
  rememberActor(state,actor,true);return state;
}
function restart(state,actor){const scene=state.scenes[state.sceneKey];state.search=createAstralWayglassSearch(nodeAt(scene,actor.x,actor.y));state.journey=null;state.blockedFor=0;state.previews={};state.scenes={[scene.key]:scene};state.remoteRetryElapsed=0;state.remoteRetryIndex=0;runtimes.delete(state);}
// Bounded rolling topology digest resumes in JSON alongside the search. Opening a door
// or changing a cell can unblock a waiting route without a wall-clock timer or teleport.
function changedTopology(state,map) {
  const scan=state.topology ||= {index:0,hash:2166136261,previous:null},tiles=map.tiles||[];
  const feed=s=>{for(let i=0;i<s.length;i++){scan.hash^=s.charCodeAt(i);scan.hash=Math.imul(scan.hash,16777619)>>>0;}};
  const end=Math.min(tiles.length,scan.index+ASTRAL_WORLD_RETREAT.topologyCells);
  for(;scan.index<end;scan.index++){const t=tiles[scan.index];feed(`${t?.kind},${!!t?.blocked},${t?.structure||''},${t?.buildingId||''},${t?.wallSides||''},${!!t?.pit};`);}
  if(scan.index<tiles.length)return false;
  feed((map.objects||[]).filter(o=>isAstralWayglass(o)||['exit','deepTransition','dungeon'].includes(o.kind)).map(o=>`${o.id}:${o.kind}:${o.state}:${o.x},${o.y}:${o.toLevelId}:${o.toX},${o.toY}`).join(';'));
  const changed=scan.previous!=null&&scan.hash!==scan.previous;scan.previous=scan.hash;scan.index=0;scan.hash=2166136261;return changed;
}

// Returns a small event for Game's ordinary message/journal/lifecycle handling. It never
// calls retreatEnded itself, changes the player's area, or simulates an unloaded Worm.
export function tickAstralWorldRetreat(game,actor,dt,options={}) {
  const active=game.save.worldBeasts?.astralWorm?.active,state=active?.astralRetreat;
  if(!state||actor.dead||!(dt>0)||options.paused||game.paused||game.unloaded)return {handled:!!state};
  const scene=state.scenes?.[state.sceneKey];if(!astralRetreatSceneMatches(scene,game))return {handled:true,unloaded:true};
  actor.retreating=true;actor.untargetable=true;delete actor.fleeTo;delete actor.fleePath;
  if(changedTopology(state,game.map))restart(state,actor);
  let runtime=runtimes.get(state);if(!runtime||runtime.map!==game.map){runtime={map:game.map,graph:createAstralWorldGraph(game,state,options)};runtimes.set(state,runtime);}
  const graph=runtime.graph;
  const searching=state.search.status==='searching';
  if(searching)stepAstralWayglassSearch(state.search,graph,{budget:options.budget});
  else graph.beginStep();
  if(state.search.status==='ready'&&!state.journey)state.journey=createAstralRetreatJourney(state.search);
  if(!state.journey){
    // A terminal result describes the saved graph, not all future terrain. Recheck one
    // remote preview per active-time interval so a newly opened remote door/bridge can
    // revive an exhausted route after reload. No simulation of the unloaded actor occurs.
    if(['no-route','budget-blocked'].includes(state.search.status)){
      const keys=Object.keys(state.previews||{}).filter(key=>key!==state.sceneKey).sort();
      if(keys.length){
        state.remoteRetryElapsed=(state.remoteRetryElapsed||0)+Math.min(dt,.25);
        if(state.remoteRetryElapsed>=ASTRAL_WORLD_RETREAT.remoteRetry){
          const index=(state.remoteRetryIndex||0)%keys.length,changed=graph.recheckRemote(keys[index]);
          if(changed!==null){state.remoteRetryElapsed=0;state.remoteRetryIndex=(index+1)%keys.length;if(changed)restart(state,actor);}
        }
      }
    }
    rememberActor(state,actor);return {handled:true,status:state.search.status,reason:state.search.reason};
  }
  let crossed=false;
  stepAstralRetreat(actor,state.journey,dt,{sceneKey:state.sceneKey,move:(e,dx,dy)=>{
    const to={x:e.x+dx,y:e.y+dy};if(!astralRetreatSegmentOpen(game.map,e,to))return false;
    if(options.move){const moved=options.move(e,dx,dy,game.map);return moved===true&&samePoint(e,to);}
    e.x=to.x;e.y=to.y;return true;
  },crossPhysicalTransition:(e,to,from)=>{
    if(!to.transition||!samePoint(e,from)||!astralRetreatSegmentOpen(game.map,e,from)||!graph.validateTransition(from,to)||!graph.validateLanding(to))return false;
    if(options.beforeCross?.(e,to)===false)return false;
    const dest=state.scenes[to.sceneKey];if(!dest)return false;
    // This exact native link was created only in the isolated candidate save and then
    // revalidated above. Publish just the selected record after every fallible gate;
    // never normalize unrelated links or commit speculative destination histories.
    const link=to.transition.linkedExit;
    if(link)(game.save.linkedDungeons ||= {})[link.id]=copy(link.record);
    rememberActor(state,e,true);Object.assign(state.actor,{x:to.x,y:to.y});
    state.sceneKey=to.sceneKey;state.legs++;
    if(dest.area==='dungeon'){active.dungeon=dest.dungeonId;active.dungeonLevel=dest.actualLevelId||dest.levelId||'root';active.rx=dest.rx;active.ry=dest.ry;}
    else {delete active.dungeon;delete active.dungeonLevel;active.rx=dest.rx;active.ry=dest.ry;}
    active.retreat.legs=state.legs;active.retreat.home=dest.area==='dungeon'?{dungeon:dest.dungeonId,found:true}:{rx:dest.rx,ry:dest.ry,found:true};
    e.dead=true;e.noRewards=true;e.astralRetreatDeparted=true;crossed=true;runtimes.delete(state);return true;
  }});
  if(crossed)return {handled:true,crossed:true,scene:state.scenes[state.sceneKey]};
  rememberActor(state,actor);
  if(state.journey.complete){
    // A changed/removed Wayglass never counts as arrival at a guessed destination.
    const target=state.journey.route.at(-1),actual=(game.map.objects||[]).find(o=>isAstralWayglass(o)&&samePoint(o,actor));
    if(actual&&target.sceneKey===state.sceneKey){
      if(options.beforeCross?.(actor,{...target,arrival:true})===false)return {handled:true,status:'landing-blocked'};
      return {handled:true,arrived:true,target:{id:actual.id,name:actual.name,x:actual.x,y:actual.y}};
    }
    restart(state,actor);return {handled:true,status:'searching'};
  }
  if(state.journey.blocked){state.blockedFor+=Math.min(dt,.25);if(state.blockedFor>=ASTRAL_WORLD_RETREAT.retry)restart(state,actor);}
  else state.blockedFor=0;
  return {handled:true,status:state.search.status};
}
