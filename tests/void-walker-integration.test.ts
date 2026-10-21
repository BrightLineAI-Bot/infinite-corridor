import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WALKER_ROUTE, beginWalkerRetreatSearch, advanceWalkerRetreatSearch, walkerGroundPositionOpen, activeDungeonEnemies, shouldSimulateEnemy } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createCombatant } from '../src/combat.ts';
import { freshPackState, updatePackMonster, tickPackEffects, VOID } from '../src/monster-pack.ts';
import { worldBeastForDungeon, worldBeastFor, WORLD_BEAST_IDS, beginDungeonRetreat, retreatTarget, walkerReachableTiles, applyVoidScars } from '../src/world-beasts.ts';
function mapOf(w=40,h=32) { return { width:w,height:h,entry:{x:3,y:3},objects:[],enemySpawns:[],landscape:true,tiles:Array.from({length:w*h},(_,i)=>({x:i%w,y:Math.floor(i/w),kind:i%w===0||i%w===w-1||i<w||i>=w*(h-1)?'wall':'floor',blocked:i%w===0||i%w===w-1||i<w||i>=w*(h-1),elev:0})) }; }
function saveOf() { const s=freshSave();s.seed='VOID-INTEGRATION';s.level=12;for(const id of WORLD_BEAST_IDS)if(id!=='voidWalker')s.worldBeasts[id].cooldown=999;return s; }
function fixture(map=mapOf(), x=20,y=18) { const e=createCombatant('voidWalker',x,y,true,[]);Object.assign(e,{id:'walker-integration',worldBeast:'voidWalker',aggro:false}); const save=saveOf();const g=Object.assign(Object.create(Game.prototype),{map,area:'dungeon',save,rx:5,ry:0,player:{x:3,y:3,hp:10000,invulnerableUntil:0},enemies:[e],projectiles:[],effects:[],packEffects:[],performanceStats:{pathfindingWork:0},areaId:()=> 'dungeon:VOID-INTEGRATION:g1:5:0:fixture',areaStateId:()=> 'dungeon:VOID-INTEGRATION:g1:5:0:fixture'});return {g,e}; }
function frames(g,n,dt=.05) { for(let i=0;i<n;i++){const w=g.packWorld(dt,(g.now=(g.now||0)+dt*1000));for(const e of activeDungeonEnemies(g.enemies,g.player,g.map))updatePackMonster(e,w);g.packEffects=tickPackEffects(g.packEffects,w);} }

test('Walker appears in ordinary dry dungeons without weakening Crystal water, depth or level gates',()=>{
 let found=null;const map=mapOf();for(let i=0;i<100&&!found;i++){const s=saveOf();found=worldBeastForDungeon(s,map,`dungeon:VOID-INTEGRATION:g1:5:0:room-${i}`);if(found)assert.ok(walkerReachableTiles(map).has(found.y*map.width+found.x));}
 assert.equal(found?.kind,'voidWalker');assert.equal(found.worldBeast,'voidWalker');assert.equal(found.dungeonRole,undefined);assert.equal(found.packGuardian,undefined);
 for(let i=0;i<40;i++){for(const id of [`dungeon:VOID-INTEGRATION:g1:2:2:room-${i}`,'dungeon:VOID-INTEGRATION:g1',`hunt-instance:${i}`,`arena:${i}`])assert.equal(worldBeastForDungeon(saveOf(),map,id),null);const young=saveOf();young.level=7;assert.equal(worldBeastForDungeon(young,map,`dungeon:VOID-INTEGRATION:g1:5:0:room-${i}`),null);}
});
test('Walker also participates in the normal overworld hunt and keeps its player-size boss model',()=>{
 const map=mapOf(32,32);let found;for(let i=5;i<200&&!found;i++)found=worldBeastFor(saveOf(),map,i,0);
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
test('a disconnected retreat uses a visible safe entrance rift, not a through-wall walking fallback',()=>{
 const map=mapOf();for(let y=0;y<map.height;y++)Object.assign(map.tiles[y*map.width+15],{kind:'wall',blocked:true});const {g,e}=fixture(map,22,12);e.retreating=true;e.fleeTo={...map.entry,home:true};
 frames(g,3);assert.ok(e.x<15);assert.ok(Math.hypot(e.x-map.entry.x,e.y-map.entry.y)<=2.9);assert.ok(e.voidTeleport>0);frames(g,40);assert.equal(e.fleeDone,true);
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
test('terrain refuses unsafe progression atomically and overworld effects never persist dungeon scars',()=>{
 const {g,e}=fixture();const before=JSON.stringify(g.map.tiles);Object.assign(g.map.tiles[18*40+22],{kind:'sealedGate',blocked:true,gateId:'final'});const protectedBefore=JSON.stringify(g.map.tiles);
 assert.equal(g.packWorld(.05,0).consumeVoidTerrain(e,e,7).ok,false);assert.equal(JSON.stringify(g.map.tiles),protectedBefore);
 g.area='overworld';assert.equal(g.packWorld(.05,0).consumeVoidTerrain(e,e,7).reason,'overworld-visual-only');assert.equal(Object.keys(g.save.voidScars.areas).length,0);assert.notEqual(before,protectedBefore);
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
