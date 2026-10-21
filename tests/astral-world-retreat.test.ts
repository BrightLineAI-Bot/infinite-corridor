import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { generatePinnedDungeon, applyDeepDungeonProgress, Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape } from '../src/landscape.ts';
import { addReciter } from '../src/travelers.ts';
import { linkedExit } from '../src/linked-dungeons.ts';
import { installCompletionExit } from '../src/dungeon-completion.ts';
import { stepAstralWayglassSearch } from '../src/astral-worm-retreat.ts';
import { astralRetreatPositionOpen, astralRetreatSegmentOpen, astralRetreatScene, astralRetreatSceneMatches, beginAstralWorldRetreat, createAstralWorldGraph, tickAstralWorldRetreat, astralRetreatSpawn, previewAstralScene } from '../src/astral-world-retreat.ts';
const clone=x=>JSON.parse(JSON.stringify(x));
function map(width=32,height=32,{open=true,objects=[]}={}){return {width,height,objects:clone(objects),enemySpawns:[],tiles:Array.from({length:width*height},(_,i)=>({x:i%width,y:Math.floor(i/width),kind:open?'floor':'wall',blocked:!open}))};}
const wayglass=(id,x,y)=>({id,kind:'checkpoint',semanticRole:'wayglass',name:id,x,y,state:'quiet'});
function wall(m,x,y){m.tiles[y*m.width+x]={x,y,kind:'wall',blocked:true};}
function game(m,actor={x:5,y:5},extra={}){const save=freshSave();save.seed='astral-native-test';save.worldBeasts.astralWorm ||= {cycle:0,slain:0,escaped:0,cooldown:0};save.worldBeasts.astralWorm.active={rx:0,ry:0,tries:1};const e={id:'world-beast:astralWorm:0',kind:'astralWorm',worldBeast:'astralWorm',x:5,y:5,hp:91,maxHp:1400,damage:60,aggro:true,...actor};return {save,map:m,area:'overworld',rx:0,ry:0,enemies:[e],effects:[],areaId(){return this.area==='dungeon'?this.save.session.activeDungeonId:`overworld:${this.rx}:${this.ry}:g${this.save.worldGeneration}`;},...extra};}
function sealed(m){for(let i=0;i<m.width;i++){wall(m,i,0);wall(m,i,m.height-1);}for(let i=0;i<m.height;i++){wall(m,0,i);wall(m,m.width-1,i);}return m;}
function start(g,options={}){const e=g.enemies[0],s=beginAstralWorldRetreat(g,e),graph=createAstralWorldGraph(g,s,options);return {e,s,graph};}
function solve(s,graph,limit=1000){for(let i=0;i<limit&&s.search.status==='searching';i++)stepAstralWayglassSearch(s.search,graph);return s.search;}
function drive(g,count=1000,options={}){let r;for(let i=0;i<count;i++){r=tickAstralWorldRetreat(g,g.enemies[0],1/60,options);if(r.arrived||r.crossed)break;}return r;}
const nativeOptions={previewDungeon:(save,id,levelId)=>generatePinnedDungeon(save,id,{levelId}),applyDungeonProgress:(save,id,m)=>applyDeepDungeonProgress(save,id,m)};

test('native Astral retreat selects physical minimum, not a nearer unreachable Wayglass or shrine',()=>{
  const m=sealed(map(16,12,{objects:[wayglass('unreachable',7,5),wayglass('reachable',2,9),{id:'shrine',kind:'shrine',x:5,y:6}]}));
  for(let y=1;y<11;y++)wall(m,6,y);const g=game(m),{s,graph}=start(g);solve(s,graph);
  assert.equal(s.search.status,'ready');assert.equal(s.search.goal.id,'reachable');assert.equal(s.search.distance,7);assert(s.search.route.every(n=>n.x<6));
});
test('native flight crosses water continuously but cannot phase through water-wall structures',()=>{
  const m=map(8,5);for(let x=1;x<7;x++)m.tiles[2*8+x]={x,y:2,kind:'deepOcean',blocked:true};
  assert(astralRetreatPositionOpen(m,3,2));assert(astralRetreatSegmentOpen(m,{x:2,y:2},{x:3,y:2}));
  m.tiles[2*8+3].structure='shackWall';m.tiles[2*8+3].wallSides=['west'];assert(!astralRetreatPositionOpen(m,3,2));
  assert(!astralRetreatSegmentOpen(m,{x:2,y:2},{x:4,y:2}));assert(!astralRetreatSegmentOpen(m,{x:1,y:1},{x:2,y:2}));
});
test('native source joins preserve fractional positions and never diagonally cut a corner',()=>{
  const m=sealed(map(12,12,{objects:[wayglass('goal',8,8)]})),g=game(m,{x:5.2,y:5.15}),{s,graph}=start(g);solve(s,graph);
  assert.equal(s.search.status,'ready');for(let i=1;i<s.search.route.length;i++){const a=s.search.route[i-1],b=s.search.route[i];assert(a.x===b.x||a.y===b.y);assert(astralRetreatSegmentOpen(m,a,b));}
});
test('native search generates at most one adjacent scene per incremental step and chooses across a real seam',()=>{
  const source=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',2,5)]}));for(let x=29;x<32;x++)source.tiles[5*32+x]={x,y:5,kind:'ocean',blocked:true};east.tiles[5*32]={x:0,y:5,kind:'ocean',blocked:true};let builds=0;
  const g=game(source,{x:30,y:5}),{s,graph}=start(g,{sceneMap:sc=>{builds++;return sc.rx===1&&sc.ry===0?east:sealed(map());}});
  for(let i=0;i<100&&s.search.status==='searching';i++){const before=builds;stepAstralWayglassSearch(s.search,graph);assert(builds-before<=1);assert(s.search.lastStepWork<=625);}
  assert.equal(s.search.goal.id,'east');assert.equal(s.search.distance,4);const seam=s.search.route.find(n=>n.transition?.kind==='section');assert(seam);assert.equal(seam.x,0);assert.equal(seam.y,5);
});
test('native cross-section retreat leaves exact wounded actor at the reached destination and waits unloaded',()=>{
  const source=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',2,5)]}));source.tiles[5*32+31]={x:31,y:5,kind:'ocean',blocked:true};east.tiles[5*32]={x:0,y:5,kind:'ocean',blocked:true};
  const g=game(source,{x:30,y:5}),opts={sceneMap:sc=>sc.rx===1?east:sealed(map())};start(g,opts);const r=drive(g,1000,opts),active=g.save.worldBeasts.astralWorm.active;
  assert(r.crossed);assert.equal(g.rx,0);assert.equal(g.enemies[0].x,31);assert(g.enemies[0].dead);assert.equal(active.rx,1);assert.equal(active.astralRetreat.actor.x,0);assert.equal(active.astralRetreat.actor.y,5);assert.equal(active.astralRetreat.actor.hp,91);
  const before=JSON.stringify(active.astralRetreat),carried=astralRetreatSpawn(active);tickAstralWorldRetreat(g,carried,1,opts);assert.equal(JSON.stringify(active.astralRetreat),before);
  g.rx=1;g.map=east;g.enemies=[carried];assert(astralRetreatSceneMatches(active.astralRetreat.scenes[active.astralRetreat.sceneKey],g));const done=drive(g,1000,opts);assert(done.arrived);assert.equal(carried.hp,91);assert.equal(carried.x,2);assert.equal(carried.y,5);
});
test('native retreat cannot cross a seam into an enclosed wall or fabricated physical transition',()=>{
  const source=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',2,5)]}));source.tiles[5*32+31]={x:31,y:5,kind:'floor',blocked:false};const g=game(source,{x:30,y:5}),{s,graph}=start(g,{sceneMap:()=>east});solve(s,graph);
  assert.equal(s.search.status,'no-route');assert.equal(s.journey,null);assert.equal(g.enemies[0].x,30);assert.equal(g.save.worldBeasts.astralWorm.escaped,0);
});
test('native dungeon route follows actual floor door and exit before surface Wayglass',()=>{
  const a=sealed(map(12,12,{objects:[{id:'down',kind:'deepTransition',x:6,y:5,toLevelId:'lower',toX:3,toY:3,state:'open'}]}));Object.assign(a,{multiLevel:true,levelId:'upper'});
  const b=sealed(map(12,12,{objects:[{id:'exit',kind:'exit',x:4,y:3,state:'open'}]}));Object.assign(b,{multiLevel:true,levelId:'lower'});
  const surface=sealed(map(32,32,{objects:[wayglass('surface',9,8)]})),g=game(a,{x:5,y:5},{area:'dungeon',rx:2,ry:3});g.save.session.activeDungeonId='dungeon:test:g1:2:3:door';g.save.session.activeDungeonLevelId='upper';g.save.session.dungeonReturn={rx:2,ry:3,x:8,y:8};Object.assign(g.save.worldBeasts.astralWorm.active,{dungeon:g.areaId(),dungeonLevel:'upper'});
  const options={sceneMap:sc=>sc.area==='overworld'?surface:b}, {s,graph}=start(g,options);solve(s,graph);assert.equal(s.search.goal.id,'surface');assert.deepEqual(s.search.route.filter(n=>n.transition).map(n=>n.transition.kind),['level','exit']);assert.equal(s.search.distance,5);
  let r=drive(g,1000,options);assert(r.crossed);assert.equal(g.save.worldBeasts.astralWorm.active.dungeonLevel,'lower');g.map=b;g.save.session.activeDungeonLevelId='lower';g.enemies=[astralRetreatSpawn(g.save.worldBeasts.astralWorm.active)];r=drive(g,1000,options);assert(r.crossed);assert.equal(g.save.worldBeasts.astralWorm.active.dungeon,undefined);assert.equal(g.rx,2);assert.equal(g.area,'dungeon');
});
test('native closed level doors and magical returns are not physical retreat shortcuts',()=>{
  const m=sealed(map(10,10,{objects:[{id:'locked',kind:'deepTransition',x:6,y:5,toLevelId:'lower',toX:3,toY:3,state:'sealed'},{id:'magic',kind:'deepPortal',x:4,y:5,targetLevelId:'lower',toX:3,toY:3,state:'active'}]}));m.levelId='upper';m.multiLevel=true;const g=game(m,{x:5,y:5},{area:'dungeon'});g.save.session.activeDungeonId='test';g.save.session.dungeonReturn={rx:0,ry:0,x:5,y:5};const {s,graph}=start(g,{sceneMap:()=>map(10,10,{objects:[wayglass('wrong',3,3)]})});solve(s,graph);assert.equal(s.search.status,'no-route');
});
test('native mount departure is deferred until rider has a safe landing without resetting either HP',()=>{
  const m=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',1,5)]}));m.tiles[5*32+31]={x:31,y:5,kind:'ocean',blocked:true};east.tiles[5*32]={x:0,y:5,kind:'ocean',blocked:true};let safe=false,calls=0;const g=game(m,{x:31,y:5}),options={sceneMap:()=>east,beforeCross:()=>{calls++;return safe;}};start(g,options);drive(g,30,options);assert(calls>0);assert(!g.enemies[0].dead);assert.equal(g.save.worldBeasts.astralWorm.active.rx,0);assert.equal(g.enemies[0].hp,91);safe=true;assert(drive(g,100,options).crossed);
});
test('native pause, unloaded frames and zero dt preserve exact serialized search and journey',()=>{
  const g=game(sealed(map(32,32,{objects:[wayglass('goal',20,20)]})));const {e,s}=start(g);tickAstralWorldRetreat(g,e,1/60,{budget:1});const before=JSON.stringify(s);
  for(const opts of [{paused:true},{},{unloaded:true}]){if(opts.unloaded)g.unloaded=true;tickAstralWorldRetreat(g,e,opts.paused?1:0,opts);g.unloaded=false;assert.equal(JSON.stringify(s),before);}
  g.paused=true;tickAstralWorldRetreat(g,e,10);assert.equal(JSON.stringify(s),before);g.paused=false;
  const restored=clone(g.save),g2={...g,save:restored,enemies:[clone(e)],map:clone(g.map)};tickAstralWorldRetreat(g,e,1/60,{budget:7});tickAstralWorldRetreat(g2,g2.enemies[0],1/60,{budget:7});assert.deepEqual(g2.save.worldBeasts.astralWorm.active.astralRetreat,s);
});
test('native preview respects existing version pins and never mutates live journey/fog/objects',()=>{
  const g=game(map());g.save.atlas ||= {};g.save.atlas['1,1']={terrain:'glass',landscapeVersion:1,hamletVersion:0,travelVersion:0,seaVersion:0};g.save.checkpoints['1,1']={rx:1,ry:1,x:6,y:6,name:'Remembered test'};const scene={key:'overworld:1:1:g1',nativeKey:`overworld:1:1:g${g.save.worldGeneration}`,area:'overworld',rx:1,ry:1};const before=JSON.stringify(g.save),preview=previewAstralScene(g,scene,nativeOptions);
  assert.equal(JSON.stringify(g.save),before);assert(preview.objects.some(o=>o.kind==='checkpoint'));const raw=generateRegion(g.save.seed,1,1,g.save.worldGeneration);applyLandscape(raw,g.save.seed,1,1,{explored:false,version:1,openSea:0,buoy:false,hamlet:false});for(let i=0;i<1024;i++)if(i!==6*32+6)assert.deepEqual(preview.tiles[i],raw.tiles[i]);
});
test('native dungeon preview preserves pinned history, exact saved door states and dig/scar overlay ordering',()=>{
  const g=game(map()),id='dungeon:astral-native-test:g1:5:3:buried';g.save.consequences.dungeons[id]={generatorVersion:2,layoutVersion:0,monsterPack:0,visits:2};g.save.session.areas[id]={objects:{'dungeon-exit':{state:'sealed'}},enemies:[],effects:[],projectiles:[]};const scene={key:`${id}@return:0,0,4,5`,nativeKey:id,area:'dungeon',dungeonId:id,levelId:null,returnPoint:{rx:0,ry:0,x:4,y:5},rx:5,ry:3},before=JSON.stringify(g.save),preview=previewAstralScene(g,scene,nativeOptions);assert.equal(JSON.stringify(g.save),before);assert.equal(preview.objects.find(o=>o.id==='dungeon-exit').state,'sealed');assert.equal(preview.tiles.length,576);
});
test('native dynamic barrier reopens a previously exhausted route without fallback',()=>{
  const m=sealed(map(12,12,{objects:[wayglass('goal',8,5)]}));for(let y=1;y<11;y++)wall(m,6,y);const g=game(m),{s}=start(g);drive(g,80);assert.equal(s.search.status,'no-route');assert.equal(g.enemies[0].x,5);m.tiles[5*12+6]={x:6,y:5,kind:'floor',blocked:false};const r=drive(g,500);assert(r.arrived);assert.equal(g.enemies[0].x,8);
});
test('native preview budget exhaustion retains an unresolved live retreat instead of false no-route',()=>{
  const g=game(map(),{x:31,y:31}),{s,graph}=start(g,{sceneMap:()=>map(257,256)});stepAstralWayglassSearch(s.search,graph);assert.equal(s.search.status,'budget-blocked');assert.match(s.search.reason,/budget/);assert.equal(s.journey,null);assert.equal(g.enemies[0].hp,91);assert.equal(g.save.worldBeasts.astralWorm.escaped,0);
});

test('native arrival also waits for safe rider departure rather than orphaning a landing rider',()=>{
  const g=game(sealed(map(12,12,{objects:[wayglass('goal',5,5)]}))),{e}=start(g);let safe=false;
  const opts={beforeCross:(actor,target)=>{assert(target.arrival);return safe;}};const a=tickAstralWorldRetreat(g,e,.1,opts);assert.equal(a.status,'landing-blocked');assert(!a.arrived);assert(!e.dead);safe=true;assert(tickAstralWorldRetreat(g,e,.1,opts).arrived);
});
test('native retreat schema-14 migration preserves exact frontier, carried health and unknown fields',()=>{
  const g=game(sealed(map(32,32,{objects:[wayglass('goal',20,20)]}))),{e,s}=start(g);s.futureExtension={opaque:'keep'};tickAstralWorldRetreat(g,e,.1,{budget:9});const saved=clone(g.save),migrated=migrateSave(saved);assert.equal(migrated.version,14);assert.deepEqual(migrated.worldBeasts.astralWorm.active.astralRetreat,s);assert.equal(migrated.worldBeasts.astralWorm.active.tries,1);
});
test('real Game shared patience enters only native Wayglass retreat and escape is one-time/no bounty',()=>{
  const save=freshSave();save.seed='astral-real-game';save.worldBeasts.astralWorm.active={rx:8,ry:8,tries:1,patience:179.999};const g=new Game(save,0);g.rx=8;g.ry=8;g.loadArea('overworld');const e=g.enemies.find(e=>e.worldBeast==='astralWorm');assert(e);Object.assign(e,{x:5,y:5,hp:91,aggro:true});g.map=sealed(map(32,32,{objects:[wayglass('fixture-wayglass',6,5)]}));const currency=g.save.currency,xp=g.save.xp;
  g.tickWorldBeasts(.01);assert(e.retreating);assert(g.save.worldBeasts.astralWorm.active.astralRetreat);assert.equal(e.fleeTo,undefined);assert.equal(e.fleePath,undefined);
  for(let i=0;i<120&&!e.dead;i++)g.tickWorldBeasts(1/60);assert(e.dead);assert.equal(e.hp,91);assert(e.noRewards);assert.equal(e.x,6);assert.equal(g.save.worldBeasts.astralWorm.escaped,1);assert.equal(g.save.worldBeasts.astralWorm.active,null);assert.equal(g.save.currency,currency);assert.equal(g.save.xp,xp);for(let i=0;i<10;i++)g.tickWorldBeasts(.1);assert.equal(g.save.worldBeasts.astralWorm.escaped,1);
});
test('real Game load preserves retreat actor/frontier, and leaving/revisiting never awards escape or heals',()=>{
  const save=freshSave();save.seed='astral-real-game-reload';save.worldBeasts.astralWorm.active={rx:8,ry:8,tries:1};const g=new Game(save,0);g.rx=8;g.ry=8;g.loadArea('overworld');const e=g.enemies.find(e=>e.worldBeast==='astralWorm');assert(e);e.hp=91;const position={x:e.x,y:e.y};beginAstralWorldRetreat(g,e);tickAstralWorldRetreat(g,e,1/60,{...nativeOptions,budget:1});g.sync();g.snapshotArea();const expected=clone(g.save.worldBeasts.astralWorm.active.astralRetreat),resumed=new Game(migrateSave(clone(g.save)),0),loaded=resumed.enemies.filter(e=>e.worldBeast==='astralWorm'&&!e.dead);assert.equal(loaded.length,1);assert.equal(loaded[0].hp,91);assert.deepEqual({x:loaded[0].x,y:loaded[0].y},position);assert.deepEqual(resumed.save.worldBeasts.astralWorm.active.astralRetreat,expected);
  resumed.rx=9;resumed.loadArea('overworld');assert(!resumed.enemies.some(e=>e.worldBeast==='astralWorm'&&!e.dead));assert.equal(resumed.save.worldBeasts.astralWorm.escaped,0);resumed.rx=8;resumed.loadArea('overworld');const returned=resumed.enemies.filter(e=>e.worldBeast==='astralWorm'&&!e.dead);assert.equal(returned.length,1);assert.equal(returned[0].hp,91);assert.equal(returned[0].fleeTo,undefined);assert.deepEqual(resumed.save.worldBeasts.astralWorm.active.astralRetreat,expected);
});
test('real Game does not materialize a dungeon-retreating Astral Worm on the surface above it',()=>{
  const save=freshSave();save.seed='astral-real-dungeon';const g=new Game(save,0);g.rx=8;g.ry=8;g.save.session.activeDungeonId='dungeon:astral-real-dungeon:g1:8:8:buried';g.save.session.dungeonReturn={rx:8,ry:8,x:15,y:15};g.save.worldBeasts.astralWorm.active={dungeon:g.save.session.activeDungeonId,dungeonLevel:'root',rx:8,ry:8,tries:1};g.loadArea('dungeon');let e=g.enemies.find(e=>e.worldBeast==='astralWorm');assert(e);e.hp=91;beginAstralWorldRetreat(g,e);g.loadArea('overworld');assert.equal(g.enemies.filter(e=>e.worldBeast==='astralWorm'&&!e.dead).length,0);assert.equal(g.save.worldBeasts.astralWorm.escaped,0);assert(g.save.worldBeasts.astralWorm.active.astralRetreat);
});
test('real native surface previews match loaded generation without revealing additional maps',()=>{
  const save=freshSave();save.seed='native-preview';const g=new Game(save,0);for(const [rx,ry] of [[0,0],[1,1],[5,3],[8,8],[-5,3]]){g.rx=rx;g.ry=ry;g.loadArea('overworld');const before=JSON.stringify(g.save),scene=astralRetreatScene(g),preview=previewAstralScene(g,scene,nativeOptions);assert.equal(JSON.stringify(g.save),before);assert.deepEqual(preview.tiles,g.map.tiles);assert.deepEqual(preview.objects.filter(o=>o.kind==='checkpoint'),g.map.objects.filter(o=>o.kind==='checkpoint'));}
});

test('cross-scene preview cache survives JSON with identical incremental search work and results',()=>{
  const source=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',20,5)]}));source.tiles[5*32+31]={x:31,y:5,kind:'ocean',blocked:true};east.tiles[5*32]={x:0,y:5,kind:'ocean',blocked:true};const g=game(source,{x:31,y:5}),options={sceneMap:sc=>sc.rx===1?east:sealed(map())},{s,graph}=start(g,options);
  stepAstralWayglassSearch(s.search,graph,{budget:5});assert(Object.keys(s.previews).length>0);const restored=clone(s),g2={...g,map:clone(source),save:clone(g.save)},graph2=createAstralWorldGraph(g2,restored,options);
  for(let i=0;i<1000&&s.search.status==='searching';i++){stepAstralWayglassSearch(s.search,graph,{budget:7});stepAstralWayglassSearch(restored.search,graph2,{budget:7});assert.deepEqual(restored.search,s.search);assert.deepEqual(restored.previews,s.previews);}
  assert.equal(s.search.status,'ready');assert.equal(s.search.goal.id,'east');
});
test('a saved cross-scene route revalidates destination terrain before physical departure',()=>{
  const source=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',2,5)]}));source.tiles[5*32+31]={x:31,y:5,kind:'ocean',blocked:true};east.tiles[5*32]={x:0,y:5,kind:'ocean',blocked:true};const g=game(source,{x:31,y:5}),options={sceneMap:sc=>sc.rx===1?east:sealed(map())},{s,graph}=start(g,options);solve(s,graph);assert.equal(s.search.status,'ready');g.save=clone(g.save);wall(east,0,5);const r=drive(g,100,options);assert(!r.crossed);assert(!g.enemies[0].dead);assert.equal(g.save.worldBeasts.astralWorm.active.rx,0);assert.equal(g.enemies[0].x,31);
});

test('native multi-level preview uses the exact Game area key, not a twice-prefixed stable level ID',()=>{
  const g=game(map()),id='dungeon:deep-retreat:g1:8:8:buried:deep-v2:descent',levelId='pressure',nativeKey=`${id}:level:${levelId}`;g.save.seed='deep-retreat';const original=generatePinnedDungeon(g.save,id,{levelId});assert.equal(original.levelStableId,nativeKey);const door=original.objects.find(o=>o.kind==='deepTransition');assert(door);const wallTile=original.tiles.find(t=>t.blocked&&t.x>1&&t.y>1&&t.x<original.width-2&&t.y<original.height-2);assert(wallTile);
  g.save.session.areas[nativeKey]={objects:{[door.id]:{state:'sealed'}},enemies:[],effects:[],projectiles:[]};g.save.digging.dug[nativeKey]=[`${wallTile.x},${wallTile.y}`];const scene={key:`${nativeKey}@return:8,8,15,15`,nativeKey,area:'dungeon',dungeonId:id,levelId,returnPoint:{rx:8,ry:8,x:15,y:15},rx:8,ry:8},before=JSON.stringify(g.save),preview=previewAstralScene(g,scene,nativeOptions);assert.equal(scene.nativeKey,nativeKey);assert.equal(preview.objects.find(o=>o.id===door.id).state,'sealed');assert.equal(preview.tiles[wallTile.y*preview.width+wallTile.x].blocked,false);assert.equal(JSON.stringify(g.save),before);
});

test('real Game legal canyon combat flight can retreat physically to the nearest Wayglass',()=>{
  const save=freshSave();save.seed='astral-canyon-egress';const g=new Game(save,0),m=sealed(map(12,12,{objects:[wayglass('nearest',7,5),wayglass('farther',3,8)]}));m.tiles[5*12+5]={x:5,y:5,kind:'canyon',blocked:true,pit:true,environment:'canyon'};g.map=m;g.save.worldBeasts.astralWorm.active={rx:0,ry:0,tries:1};const e={id:'canyon-worm',kind:'astralWorm',worldBeast:'astralWorm',x:4,y:5,hp:91,maxHp:1400,damage:60,aggro:true,flying:true};g.enemies=[e];assert(g.packWorld(.1,0).move(e,1,0));assert(Math.abs(e.x-5)<1e-7);assert(astralRetreatPositionOpen(m,e.x,e.y));beginAstralWorldRetreat(g,e);let r,prior={x:e.x,y:e.y};for(let i=0;i<300;i++){r=tickAstralWorldRetreat(g,e,1/60);assert(Math.hypot(e.x-prior.x,e.y-prior.y)<=2.8/60+1e-7);prior={x:e.x,y:e.y};if(r.arrived)break;}assert(r.arrived);assert.equal(r.target.id,'nearest');assert.equal(e.x,7);assert.equal(e.y,5);assert.equal(e.hp,91);
  for(const tile of [{kind:'canyon',blocked:true,structure:'shackWall',wallSides:['west']},{kind:'canyon',blocked:true,buildingId:'solid-overlay'},{kind:'lava',blocked:true},{kind:'abyss',blocked:true}]){m.tiles[5*12+5]={x:5,y:5,...tile};assert.equal(astralRetreatPositionOpen(m,5,5),false);}
});

test('compact saved topology retains canyon overflight rather than turning a legal gap into a wall',()=>{
  const source=sealed(map()),east=sealed(map(32,32,{objects:[wayglass('east',3,5)]}));source.tiles[5*32+31]={x:31,y:5,kind:'canyon',blocked:true};east.tiles[5*32]={x:0,y:5,kind:'canyon',blocked:true};east.tiles[5*32+1]={x:1,y:5,kind:'canyon',blocked:true};const g=game(source,{x:31,y:5}),options={sceneMap:sc=>sc.rx===1?east:sealed(map())},{s,graph}=start(g,options);stepAstralWayglassSearch(s.search,graph,{budget:1});const restored=clone(s),graph2=createAstralWorldGraph({...g,map:clone(source)},restored,options);solve(s,graph);solve(restored,graph2);assert.equal(s.search.status,'ready');assert.equal(s.search.goal.id,'east');assert.deepEqual(restored.search,s.search);
});

test('terminal remote no-route retries bounded previews after a changed remote passage and JSON reload',()=>{
  const source=map(32,32,{open:false}),east=map(32,32,{open:false,objects:[wayglass('east',2,5)]});const open=(m,x,y)=>m.tiles[y*32+x]={x,y,kind:'floor',blocked:false};for(const x of [30,31])open(source,x,5);for(const x of [0,2])open(east,x,5);let builds=0;const options={sceneMap:sc=>{builds++;return sc.rx===1?east:source;}},g=game(source,{x:30,y:5}),{s}=start(g,options);for(let i=0;i<100;i++)tickAstralWorldRetreat(g,g.enemies[0],1/60,options);assert.equal(s.search.status,'no-route');assert.equal(g.enemies[0].x,30);
  open(east,1,5);g.save=clone(g.save);g.map=clone(source);g.enemies=[astralRetreatSpawn(g.save.worldBeasts.astralWorm.active)];const state=g.save.worldBeasts.astralWorm.active.astralRetreat,before=JSON.stringify(state);g.paused=true;for(let i=0;i<300;i++)tickAstralWorldRetreat(g,g.enemies[0],1/60,options);assert.equal(JSON.stringify(state),before);g.paused=false;
  let r;for(let i=0;i<600;i++){const previous=builds;r=tickAstralWorldRetreat(g,g.enemies[0],1/60,options);assert(builds-previous<=1,'one fresh scene maximum per active tick');if(r.crossed)break;}assert(r.crossed);assert.equal(state.search.goal.id,'east');assert.equal(state.actor.x,0);assert.equal(state.actor.hp,91);assert.equal(g.save.worldBeasts.astralWorm.escaped,0);
});

test('native dungeon previews include Game load terrain hazards without spawning or mutating real encounters',()=>{
  for(let seed=0;seed<2;seed++){
    const save=freshSave();save.seed=`preview-fuzz-${seed}`;const id=`dungeon:${save.seed}:g${save.worldGeneration}:8:8:buried`,g=new Game(save,0);g.rx=g.ry=8;g.save.session.activeDungeonId=id;g.save.session.dungeonReturn={rx:8,ry:8,x:15,y:15};generatePinnedDungeon(g.save,id);g.loadArea('dungeon');const before=JSON.stringify(g.save),actors=JSON.stringify(g.enemies),preview=previewAstralScene(g,astralRetreatScene(g),nativeOptions),physical=m=>m.tiles.map(t=>[t.kind,t.blocked,t.structure,t.wallSides,t.pit]);assert.deepEqual(physical(preview),physical(g.map));assert.equal(preview.terrainHazardVersion,g.map.terrainHazardVersion);assert.equal(JSON.stringify(g.save),before);assert.equal(JSON.stringify(g.enemies),actors);
  }
});

test('real Game flight can physically leave native unblocked lava and abyss without changing blocked hazards',()=>{
  for(const kind of ['lava','abyss']){
    const save=freshSave();save.seed=`astral-${kind}-egress`;const g=new Game(save,0),m=sealed(map(12,12,{objects:[wayglass('goal',7,5)]}));m.tiles[5*12+5]={x:5,y:5,kind,blocked:false,environment:kind};g.map=m;g.save.worldBeasts.astralWorm.active={rx:0,ry:0,tries:1};const e={id:`${kind}-worm`,kind:'astralWorm',worldBeast:'astralWorm',x:4,y:5,hp:91,maxHp:1400,damage:60,aggro:true,flying:true};g.enemies=[e];assert(g.packWorld(.1,0).move(e,1,0));assert(astralRetreatPositionOpen(m,e.x,e.y));beginAstralWorldRetreat(g,e);let r,prior={x:e.x,y:e.y};for(let i=0;i<300;i++){r=tickAstralWorldRetreat(g,e,1/60);assert(Math.hypot(e.x-prior.x,e.y-prior.y)<=2.8/60+1e-7);prior={x:e.x,y:e.y};if(r.arrived)break;}assert(r.arrived);assert.equal(e.hp,91);assert.equal(e.x,7);m.tiles[5*12+5].blocked=true;assert.equal(astralRetreatPositionOpen(m,5,5),false);
  }
});

function linkedFortress({persisted=false,movedTraveler=false}={}) {
  const save=freshSave();save.seed='mouth-preview-84';
  const id='dungeon:mouth-preview-84:g1:17:3:buried:deep-v2:fortress',entry={rx:17,ry:3,x:15,y:15},proposal=clone(save);
  assert.deepEqual(linkedExit(proposal,id,entry),{rx:8,ry:8,x:null,y:null,mouth:'b'});
  if(persisted)save.linkedDungeons=clone(proposal.linkedDungeons);
  save.checkpoints['8,8']={rx:8,ry:8,x:15,y:18,name:'Native linked Wayglass'};
  const g=new Game(save,0);g.rx=17;g.ry=3;g.save.session.activeDungeonId=id;g.save.session.dungeonReturn=entry;g.loadArea('dungeon');
  g.save.consequences.dungeons[id].combatClear.completed=true;const door=installCompletionExit(g.map,g.save.consequences.dungeons[id]);
  const e={id:'linked-worm',kind:'astralWorm',worldBeast:'astralWorm',x:door.x,y:door.y,hp:91,maxHp:1400,damage:60,aggro:true};g.enemies=[e];g.save.worldBeasts.astralWorm.active={dungeon:id,dungeonLevel:g.map.levelId,rx:17,ry:3,tries:1};
  if(movedTraveler){const isolated=clone(g.save);linkedExit(isolated,id,entry);const surface=previewAstralScene({...g,save:isolated},{key:'overworld:8:8:g1',nativeKey:'overworld:8:8:g1',area:'overworld',rx:8,ry:8}),wick=surface.objects.find(o=>o.kind==='traveler'&&o.x===16&&o.y===16);assert(wick);g.save.session.areas['overworld:8:8:g1']={objects:{[wick.id]:{x:20,y:20}},enemies:[],effects:[],projectiles:[]};}
  return {g,e,id,entry,door,record:proposal.linkedDungeons[id]};
}
test('native linked-mouth preview reserves initial travelers without consuming live random numbers',()=>{
  const {g,id}=linkedFortress({persisted:true});g.rx=g.ry=8;g.loadArea('overworld');const mouth=g.map.objects.find(o=>o.linked&&o.dungeonId===id);assert.deepEqual([mouth.x,mouth.y],[15,16]);assert(g.map.objects.some(o=>o.kind==='traveler'&&o.x===16&&o.y===16));const before=JSON.stringify(g.save),actors=JSON.stringify(g.enemies),random=Math.random;let preview;
  try{Math.random=()=>{throw new Error('preview consumed live RNG');};preview=previewAstralScene(g,astralRetreatScene(g),nativeOptions);}finally{Math.random=random;}
  const predicted=preview.objects.find(o=>o.linked&&o.dungeonId===id);assert.deepEqual([predicted.x,predicted.y],[mouth.x,mouth.y]);assert.deepEqual(preview.objects.filter(o=>o.kind==='traveler').map(o=>[o.id,o.x,o.y]),g.map.objects.filter(o=>o.kind==='traveler').map(o=>[o.id,o.x,o.y]));assert.equal(JSON.stringify(g.save),before);assert.equal(JSON.stringify(g.enemies),actors);
});
test('prospective linked completion preserves pre-snapshot mouth placement, JSON cache and atomic physical link commit',()=>{
  const {g,e,id,record}=linkedFortress({movedTraveler:true}),{s,graph}=start(g,nativeOptions),beforeLinks=JSON.stringify(g.save.linkedDungeons);solve(s,graph);assert.equal(s.search.status,'ready');assert.equal(JSON.stringify(g.save.linkedDungeons),beforeLinks);const exit=s.search.route.find(n=>n.transition?.kind==='exit');assert(exit);assert.deepEqual([exit.x,exit.y],[15,17]);
  const packed=s.previews[exit.sceneKey];assert.equal(packed.v,2);assert(packed.objects.some(o=>o.kind==='traveler'&&o.x===20&&o.y===20));assert(packed.objects.some(o=>o.linked&&o.x===15&&o.y===16));const restored=clone(g.save);g.save=restored;g.enemies=[astralRetreatSpawn(restored.worldBeasts.astralWorm.active)];const state=restored.worldBeasts.astralWorm.active.astralRetreat;
  assert(!drive(g,60,{...nativeOptions,beforeCross:()=>false}).crossed);assert.equal(JSON.stringify(g.save.linkedDungeons),beforeLinks);assert(!g.enemies[0].dead);assert.equal(g.save.atlas['8,8'],undefined);
  const crossed=drive(g,300,nativeOptions);assert(crossed.crossed);assert.deepEqual(g.save.linkedDungeons[id],record);assert.deepEqual(Object.keys(g.save.linkedDungeons),[id]);assert.equal(g.save.atlas['8,8'],undefined);assert.equal(state.actor.hp,91);assert.deepEqual([state.actor.x,state.actor.y],[15,17]);
  const loaded=new Game(migrateSave(clone(g.save)),0);loaded.rx=loaded.ry=8;loaded.loadArea('overworld');const mouth=loaded.map.objects.find(o=>o.linked&&o.dungeonId===id),carried=loaded.enemies.filter(o=>o.worldBeast==='astralWorm'&&!o.dead);assert(mouth);assert.deepEqual([mouth.x,mouth.y+1],[15,17]);assert.equal(carried.length,1);assert.deepEqual([carried[0].x,carried[0].y,carried[0].hp],[15,17,91]);assert(drive(loaded,300,nativeOptions).arrived);
});

test('preview reciter occupancy matches native placement while leaving the live random stream untouched',()=>{
  const save=freshSave();save.seed='preview-reciter-19';const native=map(),preview=map(),who=addReciter(native,save.seed,8,8,save);assert(who);const random=Math.random;let predicted;
  try{Math.random=()=>{throw new Error('preview consumed live RNG');};predicted=addReciter(preview,save.seed,8,8,clone(save),true);}finally{Math.random=random;}
  assert(predicted);assert.deepEqual([predicted.id,predicted.x,predicted.y],[who.id,who.x,who.y]);assert.deepEqual(preview.reciterWalk,native.reciterWalk);
});
test('a changed native mouth position blocks stale completion departure without publishing any link',()=>{
  const {g,e,id}=linkedFortress(),{s,graph}=start(g,nativeOptions);solve(s,graph);assert.equal(s.search.status,'ready');const exit=s.search.route.find(n=>n.transition?.kind==='exit');assert.deepEqual([exit.x,exit.y],[15,17]);g.save.boat={owned:true,aboard:false,hull:100,moored:{rx:8,ry:8,x:15,y:16}};
  const result=tickAstralWorldRetreat(g,e,1/60,nativeOptions);assert(!result.crossed);assert(!e.dead);assert.equal(g.save.linkedDungeons[id],undefined);assert.equal(g.save.worldBeasts.astralWorm.active.dungeon,id);assert.equal(e.hp,91);
});
