import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WALKER_ROUTE, beginWalkerRetreatSearch, advanceWalkerRetreatSearch, walkerGroundPositionOpen, activeDungeonEnemies, shouldSimulateEnemy } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createCombatant } from '../src/combat.ts';
import { echoEvent, tickEchoes, VOID_ECHO } from '../src/echoes.ts';
import { freshPackState, updatePackMonster, tickPackEffects, VOID } from '../src/monster-pack.ts';
import { worldBeastForDungeon, worldBeastFor, WORLD_BEAST_IDS, beginDungeonRetreat, retreatTarget, walkerReachableTiles, walkerRetreatDoors, worldBeastsLost, applyVoidScars } from '../src/world-beasts.ts';
function mapOf(w=40,h=32) { return { width:w,height:h,entry:{x:3,y:3},objects:[],enemySpawns:[],landscape:true,tiles:Array.from({length:w*h},(_,i)=>({x:i%w,y:Math.floor(i/w),kind:i%w===0||i%w===w-1||i<w||i>=w*(h-1)?'wall':'floor',blocked:i%w===0||i%w===w-1||i<w||i>=w*(h-1),elev:0})) }; }
function saveOf() { const s=freshSave();s.seed='VOID-INTEGRATION';s.level=12;s.perception.aperture=1e6;/* release 273: Aperture-tier gate */for(const id of WORLD_BEAST_IDS)if(id!=='voidWalker')s.worldBeasts[id].cooldown=999;return s; }
function fixture(map=mapOf(), x=20,y=18) { const e=createCombatant('voidWalker',x,y,true,[]);Object.assign(e,{id:'walker-integration',worldBeast:'voidWalker',aggro:false}); const save=saveOf();const g=Object.assign(Object.create(Game.prototype),{map,area:'dungeon',save,rx:5,ry:0,player:{x:3,y:3,hp:10000,invulnerableUntil:0},enemies:[e],projectiles:[],effects:[],packEffects:[],performanceStats:{pathfindingWork:0},areaId:()=> 'dungeon:VOID-INTEGRATION:g1:5:0:fixture',areaStateId:()=> 'dungeon:VOID-INTEGRATION:g1:5:0:fixture'});return {g,e}; }
function frames(g,n,dt=.05) { for(let i=0;i<n;i++){const w=g.packWorld(dt,(g.now=(g.now||0)+dt*1000));for(const e of activeDungeonEnemies(g.enemies,g.player,g.map))updatePackMonster(e,w);g.packEffects=tickPackEffects(g.packEffects,w);} }

test('Walker appears in ordinary dry dungeons for young players without weakening Crystal water or depth gates',()=>{
 let found=null;const map=mapOf();for(let i=0;i<100&&!found;i++){const s=saveOf();found=worldBeastForDungeon(s,map,`dungeon:VOID-INTEGRATION:g1:5:0:room-${i}`);if(found)assert.ok(walkerReachableTiles(map).has(found.y*map.width+found.x));}
 assert.equal(found?.kind,'voidWalker');assert.equal(found.worldBeast,'voidWalker');assert.equal(found.dungeonRole,undefined);assert.equal(found.packGuardian,undefined);
 for(let i=0;i<40;i++){for(const id of [`dungeon:VOID-INTEGRATION:g1:2:2:room-${i}`,'dungeon:VOID-INTEGRATION:g1',`hunt-instance:${i}`,`arena:${i}`])assert.equal(worldBeastForDungeon(saveOf(),map,id),null);const young=saveOf();young.level=1;assert.deepEqual(worldBeastForDungeon(young,map,`dungeon:VOID-INTEGRATION:g1:5:0:room-${i}`),worldBeastForDungeon(saveOf(),map,`dungeon:VOID-INTEGRATION:g1:5:0:room-${i}`));}
});
test('Walker also participates in the normal overworld hunt and keeps its player-size boss model',()=>{
 const map=mapOf(32,32);for(const t of map.tiles)Object.assign(t,{kind:'floor',blocked:false}); // release 261: an overworld section has a way out (a walled box gives no retreat path)
 let found;for(let i=5;i<200&&!found;i++)found=worldBeastFor(saveOf(),map,i,0);
 assert.equal(found?.kind,'voidWalker');const {g}=fixture();const e=g.createEnemyFromSpawn(found,'overworld');assert.equal(e.scale,1);assert.equal(e.worldBeast,'voidWalker');assert.equal(e.phases,false);
});
test('sealed disconnected rooms cannot receive the dungeon spawn or a teleport',()=>{
 const map=mapOf();for(let y=0;y<map.height;y++)Object.assign(map.tiles[y*map.width+15],{kind:'sealedGate',blocked:true});
 const {g,e}=fixture(map,8,12),start={x:e.x,y:e.y};assert.equal(g.packWorld(.05,0).safeTeleport(e,20,12),false);assert.deepEqual({x:e.x,y:e.y},start);
 assert.equal(g.packWorld(.05,0).safeTeleport(e,10,12),true);
 for(let i=0;i<80;i++){const spawn=worldBeastForDungeon(saveOf(),map,`dungeon:VOID-INTEGRATION:g1:5:0:split-${i}`);if(spawn)assert.ok(spawn.x<15);}
});
test('teleports reject bounds, actors, player overlap and every hazardous footprint corner',()=>{
 const {g,e}=fixture();g.enemies.push({id:'other',x:12,y:12});
 for(const p of [[NaN,4],[-1,4],[40,4],[12,12],[3,3]])assert.equal(g.walkerSafeTeleport(e,...p),false);
 Object.assign(g.map.tiles[13*g.map.width+13],{kind:'lava',blocked:false});
 assert.equal(walkerGroundPositionOpen(g.map,g.map.width,12.4,12.2),false,'bottom-right corner overlaps lava even with safe center');assert.equal(g.walkerSafeTeleport(e,12.4,12.2),false);
 assert.equal(g.walkerSafeTeleport(e,16,12),true);
});
test('ordinary combat movement cannot use Crystal wall-phasing or cross unblocked hazards',()=>{
 const {g,e}=fixture(mapOf(),10,10);Object.assign(g.map.tiles[10*g.map.width+11],{blocked:true,kind:'wall'});g.packWorld(.05,0).move(e,1,0,{phase:true});assert.ok(e.x<11);
 e.x=10;Object.assign(g.map.tiles[10*g.map.width+11],{blocked:false,kind:'lava'});g.packWorld(.05,0).move(e,1,0);assert.ok(e.x<11);assert.ok(walkerGroundPositionOpen(g.map,g.map.width,e.x,e.y));
});
test('offscreen Walker patrol progresses through production scheduling without exceeding the actor budget',()=>{
 const {g,e}=fixture(mapOf(80,80),50,50),start={x:e.x,y:e.y};assert.equal(shouldSimulateEnemy(e,g.player,'dungeon'),true);
 g.enemies.push(...Array.from({length:40},(_,i)=>({id:`crowd-${i}`,x:4,y:4,aggro:true})));g.map.activeEnemyCap=12;
 assert.equal(activeDungeonEnemies(g.enemies,g.player,g.map).length,12);assert.ok(activeDungeonEnemies(g.enemies,g.player,g.map).includes(e));frames(g,160);assert.ok(Math.hypot(e.x-start.x,e.y-start.y)>5);assert.equal(e.aggro,false);
});
test('a long retreat advances a bounded frontier instead of retrying an unchanged 625-node search',()=>{
 const map=mapOf(100,100),{e}=fixture(map,90,90),search=beginWalkerRetreatSearch(e,map,100,map.entry);let result,rounds=0;
 do{result=advanceWalkerRetreatSearch(e,search);assert.ok(result.visited<=WALKER_ROUTE.nodes);rounds++;}while(result.status==='pending'&&rounds<30);
 assert.ok(rounds>1);assert.equal(result.status,'reached');assert.deepEqual(result.route.at(-1),map.entry);assert.ok(result.route.length>150);
});
test('normal entrance retreat walks without teleporting, remains invulnerable and resolves offscreen',()=>{
 const {g,e}=fixture(mapOf(),20,18);g.player={x:35,y:27,hp:10000};g.save.worldBeasts.voidWalker.active={dungeon:g.areaId(),tries:1};beginDungeonRetreat(g.save,'voidWalker',g.map);e.retreating=true;e.fleeTo=retreatTarget(g.save.worldBeasts.voidWalker.active.retreat,'voidWalker',g.map,0,0,{},e);
 let previous={x:e.x,y:e.y};for(let i=0;i<500&&!e.fleeDone;i++){frames(g,1);assert.ok(Math.hypot(e.x-previous.x,e.y-previous.y)<=.106);assert.equal(e.untargetable,true);previous={x:e.x,y:e.y};}
 assert.equal(e.fleeDone,true);assert.ok(Math.hypot(e.x-g.map.entry.x,e.y-g.map.entry.y)<.05);assert.equal(g.packEffects.length,0);
});
test('a disconnected retreat waits safely without a rift, fade or hidden escape, then retries an opened route',()=>{
 const map=mapOf();for(let y=0;y<map.height;y++)Object.assign(map.tiles[y*map.width+15],{kind:'wall',blocked:true});const {g,e}=fixture(map,22,12);e.retreating=true;e.fleeTo={...map.entry,home:true};
 const start={x:e.x,y:e.y};let teleports=0;g.walkerSafeTeleport=()=>{teleports++;return true;};
 frames(g,240);assert.deepEqual({x:e.x,y:e.y},start);assert.equal(e.voidTeleport,0);assert.equal(e.fleeDone,undefined);assert.equal(e.fleeFade,undefined);assert.equal(teleports,0);
 Object.assign(map.tiles[12*map.width+15],{kind:'floor',blocked:false});let previous=start;
 for(let i=0;i<650&&!e.fleeDone;i++){frames(g,1);assert.ok(Math.hypot(e.x-previous.x,e.y-previous.y)<=.106);previous={x:e.x,y:e.y};}
 assert.equal(e.fleeDone,true);assert.ok(Math.hypot(e.x-map.entry.x,e.y-map.entry.y)<1e-6);assert.equal(teleports,0);
});
test('route invalidation stops at a new obstruction and replans without clipping',()=>{
 const {g,e}=fixture(mapOf(),20,18),w=g.packWorld(.05,0);w.walkerPatrol(e,e.pack);const route=g._walkerRoutes.get(e).route;assert.ok(route.length);const target=route[0];Object.assign(g.map.tiles[target.y*g.map.width+target.x],{kind:'wall',blocked:true});const start={x:e.x,y:e.y};w.walkerPatrol(e,e.pack);assert.deepEqual({x:e.x,y:e.y},start);assert.deepEqual(g._walkerRoutes.get(e).route,[]);
});
test('Supernova reaches the production persistence callback only after the charge and keeps a fixed origin',()=>{
 const {g,e}=fixture(mapOf(50,50),23,23);g.player={x:25,y:25,hp:100000,invulnerableUntil:0};e.aggro=true;e.packAttacks=['voidSupernova'];e.packBossAttacks=[];e.pack=freshPackState();e.pack.gap=0;
 Object.assign(g.map.tiles[23*50+27],{kind:'wall',blocked:true});frames(g,1);assert.equal(Object.keys(g.save.voidScars.areas).length,0);e.packAttacks=[];
 frames(g,70);assert.ok(Object.keys(g.save.voidScars.areas).length);assert.equal(g.map.tiles[23*50+27].kind,'voidScar');const record=JSON.parse(JSON.stringify(g.save.voidScars));frames(g,100);assert.deepEqual(g.save.voidScars,record);assert.ok(g.packEffects.length<=48);
 const migrated=migrateSave(JSON.parse(JSON.stringify(g.save))),fresh=mapOf(50,50);Object.assign(fresh.tiles[23*50+27],{kind:'wall',blocked:true});assert.ok(applyVoidScars(migrated,fresh,g.areaStateId()).ok);assert.equal(fresh.tiles[23*50+27].kind,'voidScar');assert.equal(fresh.tiles[23*50+27].blocked,false);
});
test('Supernova intentionally consumes sealed terrain without completing quests and persists in either world',()=>{
 const {g,e}=fixture();Object.assign(g.map.tiles[18*40+22],{kind:'sealedGate',blocked:true,gateId:'final'});
 g.save.worldFlags.pendingQuest='unresolved';const questBefore=JSON.stringify(g.save.worldFlags);
 assert.equal(g.packWorld(.05,0).consumeVoidTerrain(e,e,7).ok,true);assert.equal(g.map.tiles[18*40+22].kind,'voidScar');assert.equal(JSON.stringify(g.save.worldFlags),questBefore);
 g.area='overworld';g.areaStateId=()=> 'overworld:5:0:g1';assert.equal(g.packWorld(.05,0).consumeVoidTerrain(e,e,7).ok,true);assert.ok(g.save.voidScars.areas['overworld:5:0:g1']);
});
test('dt zero cannot move patrol, retreat, teleports or active Supernova simulation',()=>{
 const {g,e}=fixture();e.retreating=true;e.fleeTo={...g.map.entry,home:true};const before=JSON.stringify(e);updatePackMonster(e,g.packWorld(0,100));assert.equal(JSON.stringify(e),before);
});

test('real dungeon snapshot/reload preserves Walker health, precise position, cooldowns and retreat hunt identity',()=>{
 const save=saveOf(),id='dungeon:VOID-INTEGRATION:g1:5:0:resume';save.session.activeDungeonId=id;save.worldBeasts.voidWalker.active={dungeon:id,tries:1};const g=new Game(save,0);g.loadArea('dungeon',false);
 const e=g.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(e);const connected=walkerReachableTiles(g.map),at=[...connected].map(k=>({x:k%g.map.width,y:Math.floor(k/g.map.width)})).find(p=>Math.hypot(p.x-g.map.entry.x,p.y-g.map.entry.y)>4&&walkerGroundPositionOpen(g.map,g.map.width,p.x+.03,p.y+.02));assert.ok(at);
 Object.assign(e,{x:at.x+.03,y:at.y+.02,hp:123,damage:37});e.pack.cd.voidSupernova=9;e.pack.attack='voidSupernova';e.voidDashing=true;beginDungeonRetreat(save,'voidWalker',g.map);e.retreating=true;e.fleeTo={...g.map.entry,home:true};g.exportSnapshot(0);
 const migrated=migrateSave(JSON.parse(JSON.stringify(save))),resumed=new Game(migrated,0);resumed.loadArea('dungeon',false);const r=resumed.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(r);assert.equal(r.id,e.id);assert.equal(r.hp,123);assert.equal(r.damage,37);assert.equal(r.x,e.x);assert.equal(r.y,e.y);assert.equal(r.pack.cd.voidSupernova,9);assert.equal(r.pack.attack,null);assert.equal(r.voidDashing,false);assert.equal(r.untargetable,true);assert.equal(resumed.packEffects.length,0);assert.equal(migrated.worldBeasts.voidWalker.active.tries,1);
});


test('a changed gate invalidates cached teleport connectivity before the next landing',()=>{
 const {g,e}=fixture(mapOf(),8,12);assert.equal(g.walkerSafeTeleport(e,20,12),true);e.x=8;e.y=12;
 for(let y=0;y<g.map.height;y++)Object.assign(g.map.tiles[y*g.map.width+15],{kind:'sealedGate',blocked:true});
 assert.equal(g.walkerSafeTeleport(e,20,12),false);assert.deepEqual({x:e.x,y:e.y},{x:8,y:12});
 for(let y=1;y<g.map.height-1;y++)Object.assign(g.map.tiles[y*g.map.width+15],{kind:'floor',blocked:false});
 assert.equal(g.walkerSafeTeleport(e,20,12),true);
});


test('a multi-level hunt stays on its original floor instead of spawning fresh-health copies',()=>{
 const save=saveOf(),id='dungeon:VOID-INTEGRATION:g1:5:0:levels',upper=mapOf(),lower=mapOf();upper.levelId='upper';lower.levelId='lower';
 save.worldBeasts.voidWalker.active={dungeon:id,tries:1};const first=worldBeastForDungeon(save,upper,id);assert.ok(first);assert.equal(save.worldBeasts.voidWalker.active.dungeonLevel,'upper');
 assert.equal(worldBeastForDungeon(save,lower,id),null);assert.equal(worldBeastForDungeon(save,upper,id).id,first.id);assert.equal(save.worldBeasts.voidWalker.active.tries,1);
 const round=migrateSave(JSON.parse(JSON.stringify(save)));assert.equal(worldBeastForDungeon(round,lower,id),null);
 beginDungeonRetreat(round,'voidWalker',upper);assert.equal(worldBeastForDungeon(round,lower,id),null);assert.equal(round.worldBeasts.voidWalker.active.dungeonLevel,'upper');assert.equal(round.worldBeasts.voidWalker.escaped,0);assert.ok(worldBeastForDungeon(round,upper,id)?.retreating);
});


test('real consumed-wall treasure glints stay removed after export, migration and dungeon reload',()=>{
 const save=saveOf();save.seed='VW-REVIEW-0';save.session.activeDungeonId='dungeon:VW-REVIEW-0:g1:5:0:review';save.session.area='dungeon';save.consequences.dungeons['dungeon:VW-REVIEW-0:g1:5:0:review']={layoutPool:4};/* release 301: written against layout pool 4 */for(const id of WORLD_BEAST_IDS)save.worldBeasts[id].cooldown=999;
 const game=new Game(save,0);game.loadArea('dungeon',false);const glints=game.map.wallGlints.map(q=>({...q}));
 const result=game.packWorld(.05,0).consumeVoidTerrain({}, {x:43,y:4},7);assert.equal(result.ok,true);const removed=glints.filter(q=>game.map.tiles[q.y*game.map.width+q.x].kind==='voidScar');assert.ok(removed.length>=3);
 assert.ok(removed.every(q=>!game.map.wallGlints.some(g=>g.x===q.x&&g.y===q.y)));
 const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(game.exportSnapshot(0)))),0);
 for(const q of removed){assert.equal(resumed.map.tiles[q.y*resumed.map.width+q.x].kind,'voidScar');assert.equal(resumed.map.wallGlints.some(g=>g.x===q.x&&g.y===q.y),false);}
});


test('scarred dungeon revisits preserve one Aperture object per stable ID, original position and consumed state',()=>{
 const save=saveOf();save.seed='VW-REVIEW-0';save.session.activeDungeonId='dungeon:VW-REVIEW-0:g1:5:0:review';save.session.area='dungeon';save.consequences.dungeons['dungeon:VW-REVIEW-0:g1:5:0:review']={layoutPool:4};/* release 301: written against layout pool 4 */for(const id of WORLD_BEAST_IDS)save.worldBeasts[id].cooldown=999;
 const game=new Game(save,0),original=game.map.objects.filter(q=>q.id.startsWith('aperture-')).map(q=>({id:q.id,x:q.x,y:q.y}));assert.equal(original.length,3);
 game.map.objects.find(q=>q.id==='aperture-memory').state='read';game.map.objects.find(q=>q.id==='aperture-relic').state='taken';
 assert.equal(game.packWorld(.05,0).consumeVoidTerrain({}, {x:43,y:4},7).ok,true);
 for(let revisit=0;revisit<3;revisit++){
  game.loadArea('dungeon',true);
  assert.deepEqual(game.map.objects.filter(q=>q.id.startsWith('aperture-')).map(q=>({id:q.id,x:q.x,y:q.y})),original);
  assert.equal(game.map.objects.find(q=>q.id==='aperture-memory').state,'read');assert.equal(game.map.objects.find(q=>q.id==='aperture-relic').state,'taken');
 }
 const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(game.exportSnapshot(0)))),0);
 assert.deepEqual(resumed.map.objects.filter(q=>q.id.startsWith('aperture-')).map(q=>({id:q.id,x:q.x,y:q.y})),original);
 assert.equal(resumed.map.objects.find(q=>q.id==='aperture-relic').state,'taken');
});

test('Rift Upheaval retains its remaining warning and cooldown across real Game pause/resume',()=>{
 const save=saveOf();save.echoes={owned:{voidWalker:true},equipped:['voidWalker']};const game=new Game(save,0),blasts=[];
 game.enemies=[{id:'echo-target',x:game.player.x+1,y:game.player.y,hp:100}];game.glyphWorld=()=>({blast:(...args)=>blasts.push(args)});
 echoEvent(game,'dodge',1000);assert.equal(game.echoPatches.length,1);assert.equal(game.echoPatches[0].until,1500);
 game.setPaused(true,1100);game.setPaused(true,2000);game.setPaused(false,11100);game.setPaused(false,11110);
 assert.equal(game.echoPatches[0].until,11500);assert.equal(game.player.echoVoidReadyAt,1000+VOID_ECHO.cooldown+10000);
 tickEchoes(game,1/60,11100,{x:0,y:0});assert.equal(blasts.length,0);echoEvent(game,'dodge',11200);assert.equal(game.echoPatches.length,1);assert.equal(game.echoPatches[0].until,11500);
 tickEchoes(game,1/60,11499,{x:0,y:0});assert.equal(blasts.length,0);tickEchoes(game,1/60,11500,{x:0,y:0});assert.equal(blasts.length,1);
 echoEvent(game,'dodge',14999);assert.equal(game.echoPatches.length,0);echoEvent(game,'dodge',15000);assert.equal(game.echoPatches.length,1);
});


test('retreat takes the nearest reachable real door, not the entrance or an enticing blocked door',()=>{
 const map=mapOf(),{g,e}=fixture(map,20,18);map.objects=[{kind:'exit',state:'open',x:22,y:18},{kind:'exit',state:'open',x:20,y:22},{kind:'deepPortal',state:'open',x:20,y:19}];
 for(const [x,y] of [[21,18],[23,18],[22,17],[22,19]])Object.assign(map.tiles[y*map.width+x],{kind:'wall',blocked:true});
 e.retreating=true;e.fleeTo={...map.entry,home:true};frames(g,100);assert.equal(e.fleeDone,true);assert.deepEqual({x:e.x,y:e.y},{x:20,y:22});assert.equal(e.voidTeleport,0);
});

test('one-level retreat jumps visibly and continuously, while ramps need no jump and cliffs remain blocked',()=>{
 for(const slope of [false,true]){
  const map=mapOf(16,9);for(const t of map.tiles)Object.assign(t,{kind:'wall',blocked:true});
  for(let x=2;x<=12;x++)Object.assign(map.tiles[4*16+x],{kind:'floor',blocked:false,elev:x>=7?1:0,slope:slope&&x===7});
  map.objects=[{kind:'exit',state:'open',x:11,y:4}];const {g,e}=fixture(map,3,4);e.retreating=true;e.fleeTo={x:11,y:4,home:true};let jumped=false,previous=e.x;
  for(let i=0;i<180&&!e.fleeDone;i++){frames(g,1);jumped ||= e.jumping===true;assert.ok(e.x-previous<=.106);assert.ok(e.x>=previous);previous=e.x;assert.equal(e.voidTeleport,0);}
  assert.equal(e.fleeDone,true);assert.equal(jumped,!slope);assert.equal(e.hopLift,0);
 }
 const map=mapOf(16,9);for(const t of map.tiles)Object.assign(t,{kind:'wall',blocked:true});for(let x=2;x<=12;x++)Object.assign(map.tiles[4*16+x],{kind:'floor',blocked:false,elev:x>=7?2:0});
 map.objects=[{kind:'exit',state:'open',x:11,y:4}];const {g,e}=fixture(map,3,4);e.retreating=true;e.fleeTo={x:11,y:4,home:true};frames(g,100);assert.equal(e.x,3);assert.equal(e.fleeDone,undefined);
});

test('a long offscreen retreat completes through production scheduling within each frame budget',()=>{
 const map=mapOf(100,100),{g,e}=fixture(map,90,90);e.retreating=true;e.fleeTo={...map.entry,home:true};map.activeEnemyCap=8;
 g.enemies.push(...Array.from({length:40},(_,i)=>({id:`nearby-${i}`,x:4,y:4,aggro:true})));
 let peak=0;for(let i=0;i<2400&&!e.fleeDone;i++){g.performanceStats.pathfindingWork=0;frames(g,1);peak=Math.max(peak,g.performanceStats.pathfindingWork);assert.ok(g.performanceStats.pathfindingWork<=WALKER_ROUTE.nodes);assert.equal(activeDungeonEnemies(g.enemies,g.player,map).length,8);}
 assert.ok(peak>0);assert.equal(e.fleeDone,true);assert.ok(Math.hypot(e.x-map.entry.x,e.y-map.entry.y)<1e-6);
});

test('door additions and terrain changes invalidate a pending or completed retreat route',()=>{
 const map=mapOf(100,100),{g,e}=fixture(map,90,90);e.retreating=true;e.fleeTo={...map.entry,home:true};frames(g,1);assert.ok(g._walkerRoutes.get(e).search);
 map.objects.push({kind:'exit',state:'open',x:92,y:90});frames(g,100);assert.equal(e.fleeDone,true);assert.equal(e.x,92);assert.equal(e.y,90);
 const second=fixture(mapOf(),20,18);second.e.retreating=true;second.e.fleeTo={...second.g.map.entry,home:true};for(let i=0;i<5&&!second.g._walkerRoutes?.get(second.e)?.route.length;i++)frames(second.g,1);const route=second.g._walkerRoutes.get(second.e).route;
 const to=route[0];Object.assign(second.g.map.tiles[to.y*second.g.map.width+to.x],{blocked:true,kind:'wall'});const before={x:second.e.x,y:second.e.y};frames(second.g,1);assert.deepEqual({x:second.e.x,y:second.e.y},before);assert.equal(second.e.fleeDone,undefined);
});

test('Supernova opening a wall lets a blocked retreat resume without changing any surviving wall',()=>{
 const map=mapOf();for(let y=0;y<map.height;y++)Object.assign(map.tiles[y*map.width+15],{kind:'wall',blocked:true});const {g,e}=fixture(map,22,12);e.retreating=true;e.fleeTo={...map.entry,home:true};frames(g,40);assert.equal(e.x,22);
 assert.ok(g.packWorld(.05,0).consumeVoidTerrain(e,{x:15,y:12},2).changed);assert.equal(map.tiles[2*map.width+15].blocked,true);
 frames(g,700);assert.equal(e.fleeDone,true);assert.equal(e.voidTeleport,0);assert.equal(map.tiles[2*map.width+15].blocked,true);
});

test('a multi-level landing without a physical door cannot hide an unfinished retreat',()=>{
 const map=mapOf();map.multiLevel=true;map.levelId='lower';map.objects=[{kind:'deepPortal',state:'open',x:22,y:18}];const {g,e}=fixture(map,20,18);
 g.save.worldBeasts.voidWalker.active={dungeon:g.areaId(),dungeonLevel:'lower',tries:1};beginDungeonRetreat(g.save,'voidWalker',map);e.retreating=true;e.fleeTo=retreatTarget(g.save.worldBeasts.voidWalker.active.retreat,'voidWalker',map,0,0,{},e);
 assert.deepEqual(walkerRetreatDoors(map),[]);frames(g,120);assert.equal(e.x,20);assert.equal(e.y,18);assert.equal(e.fleeDone,undefined);assert.equal(e.fleeFade,undefined);
 assert.deepEqual(worldBeastsLost(g.save,'overworld',0,0),[]);assert.equal(g.save.worldBeasts.voidWalker.active.dungeonLevel,'lower');assert.equal(g.save.worldBeasts.voidWalker.escaped,0);
});

test('overworld retreat preserves section crossing and uses the nearest reachable dungeon mouth at home',()=>{
 const {g,e}=fixture(mapOf(32,32),20,18);g.area='overworld';g.map.objects=[{kind:'dungeon',state:'open',x:24,y:18},{kind:'dungeon',state:'open',x:20,y:21}];
 e.retreating=true;e.fleeTo=retreatTarget({home:{rx:0,ry:0,found:true}},'voidWalker',g.map,0,0,{},e);frames(g,100);assert.equal(e.fleeDone,true);assert.deepEqual({x:e.x,y:e.y},{x:20,y:21});
 const crossing=fixture(mapOf(32,32),20,18);crossing.g.area='overworld';for(let x=29;x<32;x++)Object.assign(crossing.g.map.tiles[18*32+x],{kind:'floor',blocked:false});
 crossing.e.retreating=true;crossing.e.fleeTo={x:31.4,y:18,side:'east'};frames(crossing.g,180);assert.equal(crossing.e.fleeDone,true);assert.equal(crossing.e.fleeTo.side,'east');assert.equal(crossing.e.fleeFade,undefined);
});


test('unfinished overworld Walker leg survives area departure and reuses its saved actor ID',()=>{
 const save=saveOf(),map=mapOf(32,32);save.worldBeasts.voidWalker.active={rx:5,ry:0,tries:1,retreat:{home:{rx:5,ry:0,found:true},side:null,legs:0}};
 assert.deepEqual(worldBeastsLost(save,'overworld',6,0),[]);const spawn=worldBeastFor(save,map,5,0);assert.equal(spawn.id,`world-beast:voidWalker:${save.worldBeasts.voidWalker.cycle}`);assert.equal(spawn.retreating,true);assert.equal(save.worldBeasts.voidWalker.escaped,0);
});


test('arrival at a reachable inter-level dungeon doorway ends retreat without travelling between floors',()=>{
 const map=mapOf();map.multiLevel=true;map.levelId='lower';map.objects=[{kind:'deepTransition',state:'open',x:22,y:18,toLevelId:'upper',actions:['travel']},{kind:'exit',state:'open',x:30,y:18}];const {g,e}=fixture(map,20,18);
 e.retreating=true;e.fleeTo={...map.entry,home:true};frames(g,100);assert.equal(e.fleeDone,true);assert.deepEqual({x:e.x,y:e.y},{x:22,y:18});assert.equal(map.levelId,'lower');assert.equal(e.voidTeleport,0);
});


test('real reload preserves valid disconnected retreat ground and repairs only genuinely invalid saved coordinates',()=>{
 const save=saveOf();save.seed='RETREAT-RESUME-1';const id=`dungeon:${save.seed}:g1:5:0:resume`;save.session.activeDungeonId=id;save.worldBeasts.voidWalker.active={dungeon:id,tries:1};const game=new Game(save,0);game.loadArea('dungeon',false);
 const connected=walkerReachableTiles(game.map),at=game.map.tiles.find(t=>!connected.has(t.y*game.map.width+t.x)&&walkerGroundPositionOpen(game.map,game.map.width,t.x,t.y)),e=game.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(at);assert.ok(e);
 Object.assign(e,{x:at.x,y:at.y,hp:117,retreating:true});beginDungeonRetreat(save,'voidWalker',game.map);e.fleeTo=retreatTarget(save.worldBeasts.voidWalker.active.retreat,'voidWalker',game.map,0,0,{},e);game.exportSnapshot(0);
 const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(save))),0);resumed.loadArea('dungeon',false);const r=resumed.enemies.find(q=>q.worldBeast==='voidWalker');assert.equal(r.x,at.x);assert.equal(r.y,at.y);assert.equal(r.hp,117);assert.equal(r.retreating,true);assert.equal(resumed.save.worldBeasts.voidWalker.escaped,0);
 r.x=-5;resumed.exportSnapshot(0);const repaired=new Game(migrateSave(JSON.parse(JSON.stringify(resumed.save))),0);repaired.loadArea('dungeon',false);const fixed=repaired.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(fixed.x>=0);assert.ok(walkerGroundPositionOpen(repaired.map,repaired.map.width,fixed.x,fixed.y));assert.equal(fixed.hp,117);assert.equal(repaired.save.worldBeasts.voidWalker.escaped,0);
});

test('real overworld first-leg reload keeps exact retreat position, health and original actor identity',()=>{
 const save=saveOf();save.worldBeasts.voidWalker.active={rx:0,ry:0,tries:1};const game=new Game(save,0),e=game.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(e);
 Object.assign(e,{x:16.12,y:16.03,hp:113,retreating:true,fleeTo:{x:5,y:5,home:true,nearestDoor:true}});save.worldBeasts.voidWalker.active.retreat={home:{rx:0,ry:0,found:true},side:null,legs:0};game.exportSnapshot(0);
 const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(save))),0),r=resumed.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(r);assert.equal(r.id,e.id);assert.equal(r.x,e.x);assert.equal(r.y,e.y);assert.equal(r.hp,113);assert.equal(r.retreating,true);
});


const retreatInput={state:{x:0,y:0},consume:()=>false};
function sanctuaryRetreat(){
 const save=saveOf();save.seed='RETREAT-SANCTUARY';for(const id of WORLD_BEAST_IDS)save.worldBeasts[id].cooldown=999;
 save.worldBeasts.voidWalker.active={rx:0,ry:0,tries:1,retreat:{home:{rx:1,ry:0,found:true},side:'west',legs:1}};
 const g=new Game(save,0),e=g.enemies.find(q=>q.worldBeast==='voidWalker');assert.ok(e);g.enemies=[e];return{g,e};
}
test('production Game.update keeps a harmless Walker retreat moving while the player rests inside sanctuary',()=>{
 const {g,e}=sanctuaryRetreat(),start={x:e.x,y:e.y};assert.equal(g.player.x,16);assert.equal(g.player.y,16);let work=0,previous=start;
 for(let i=1;i<=60;i++){g.update(.05,retreatInput,i*50);work+=g.performanceStats.pathfindingWork;assert.ok(Math.hypot(e.x-previous.x,e.y-previous.y)<=.106);previous={x:e.x,y:e.y};}
 assert.ok(work>0);assert.ok(Math.hypot(e.x-start.x,e.y-start.y)>1);assert.equal(e.voidTeleport,0);
});
test('production Game.update never uses sanctuary relocation for a retreating Walker inside its perimeter',()=>{
 const {g,e}=sanctuaryRetreat();Object.assign(e,{x:16,y:16});Object.assign(g.player,{x:3,y:3});assert.ok(walkerGroundPositionOpen(g.map,32,e.x,e.y));
 g.update(.05,retreatInput,50);assert.ok(Math.hypot(e.x-16,e.y-16)<=.106);assert.equal(e.voidTeleport,0);assert.ok(walkerGroundPositionOpen(g.map,32,e.x,e.y));
 // Combat keeps the established sanctuary restriction; only harmless retreat is exempted.
 e.retreating=false;delete e.fleeTo;delete g.save.worldBeasts.voidWalker.active.retreat;g.update(.05,retreatInput,100);assert.ok(Math.hypot(e.x-16,e.y-16)>=9);
});
test('production Game.update cannot finish an overworld fallback without a real dungeon mouth, even from an old center-target save',()=>{
 const save=saveOf();save.seed='RETREAT-MISSING-MOUTH';const g=new Game(save,0),map=mapOf(32,32),e=createCombatant('voidWalker',15,15,true,[]);
 Object.assign(g,{area:'overworld',rx:6,ry:0,map,enemies:[e],effects:[],packEffects:[],projectiles:[],paused:false,seaHazards:null,storm:null});Object.assign(g.player,{x:3,y:3});
 Object.assign(e,{id:'retreat-no-mouth',worldBeast:'voidWalker',retreating:true,fleeTo:{x:15.5,y:15.5,home:true}});
 save.worldBeasts.voidWalker.active={rx:6,ry:0,tries:1,retreat:{home:{rx:6,ry:0,found:false},side:null,legs:0}};
 const target=retreatTarget(save.worldBeasts.voidWalker.active.retreat,'voidWalker',map,6,0,{},e);assert.equal(target.nearestDoor,true);
 for(let i=1;i<=120;i++)g.update(.05,retreatInput,i*50);
 assert.deepEqual({x:e.x,y:e.y},{x:15,y:15});assert.equal(e.fleeFade,undefined);assert.equal(e.fleeDone,undefined);assert.equal(save.worldBeasts.voidWalker.escaped,0);assert.ok(g.enemies.includes(e));
 map.objects.push({id:'new-mouth',kind:'dungeon',state:'open',x:17,y:15,actions:['enter']});
 for(let i=121;i<=240&&g.enemies.includes(e);i++)g.update(.05,retreatInput,i*50);
 assert.equal(g.enemies.includes(e),false);assert.deepEqual({x:e.x,y:e.y},{x:17,y:15});assert.equal(save.worldBeasts.voidWalker.escaped,1);
});


test('production retreat stays at an occupied fractional completion doorway instead of walking to a grid anchor',()=>{
 const {g,e}=fixture(mapOf(),10.25,10.2);g.map.objects=[{kind:'exit',state:'open',completionExit:true,x:e.x,y:e.y},{kind:'exit',state:'open',x:10,y:10}];e.retreating=true;e.fleeTo={...g.map.entry,home:true};
 frames(g,1);assert.deepEqual({x:e.x,y:e.y},{x:10.25,y:10.2});assert.equal(e.fleeFade,1);frames(g,35);assert.equal(e.fleeDone,true);assert.deepEqual({x:e.x,y:e.y},{x:10.25,y:10.2});
});
