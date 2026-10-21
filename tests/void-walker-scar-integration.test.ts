// Authorized new Walker regressions for the owner's persistent white/red aftermath clarification.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, applyDeepDungeonProgress, deepDungeonProgress, moveWalkerGround, tileOpen, projectileTileOpen, walkerGroundPositionOpen } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshPackState, updatePackMonster, tickPackEffects } from '../src/monster-pack.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { consumeVoidTerrain, applyVoidScars, WORLD_BEAST_IDS } from '../src/world-beasts.ts';
import { generateDeepV2Dungeon, deepV2Id } from '../src/deep-dungeons.ts';
import { canStep, canReturnTo, safeVoidScarTransition, fallDamage, liftAt } from '../src/landscape.ts';
import { applyDungeonDiscovery, dungeonTileVisibility } from '../src/dungeon-framework.ts';
const key='dungeon:VOID-SCAR-INTEGRATION:g1:5:5:room';
function grid(w=24,h=24){return {width:w,height:h,landscape:true,entry:{x:3,y:3},objects:[],enemySpawns:[],tiles:Array.from({length:w*h},(_,i)=>({x:i%w,y:Math.floor(i/w),kind:'floor',blocked:false,elev:0}))};}
function saveOf(){const save=freshSave();save.seed='VOID-SCAR-INTEGRATION';save.level=12;for(const id of WORLD_BEAST_IDS)save.worldBeasts[id].cooldown=999;return save;}
function gameOf(map=grid()){const save=saveOf(),game=new Game(save,0);Object.assign(game,{map,area:'dungeon',rx:5,ry:5,enemies:[],projectiles:[],effects:[],packEffects:[],paused:false,seaHazards:null,storm:null});save.session.activeDungeonId=key;Object.assign(game.player,{x:4.4,y:5,hp:100,invulnerableUntil:0,dodgeUntil:0});save.maxHp=100;return game;}

test('destroyed deep gate remains traversable through progress refresh without completing objectives',()=>{
 const save=saveOf(),id=deepV2Id(save.seed,1,5,5,'threefold'),map=generateDeepV2Dungeon(save.seed,id);applyDeepDungeonProgress(save,id,map);
 const progress=deepDungeonProgress(save,id),before=JSON.stringify(progress),gate={...map.finalGate},at=map.finalGateTiles[Math.floor(map.finalGateTiles.length/2)];
 assert.equal(consumeVoidTerrain(save,map,id,at,4).ok,true);assert.equal(JSON.stringify(progress),before);assert.equal(progress.gateOpened,false);assert.equal(progress.completed,false);
 applyDeepDungeonProgress(save,id,map);assert.equal(JSON.stringify(progress),before);assert.equal(map.finalGate.state,gate.state);
 for(const p of map.finalGateTiles){assert.equal(map.tiles[p.y*map.width+p.x].kind,'voidScar');assert.equal(tileOpen(map,map.width,p.x+.5,p.y+.5),true);assert.equal(projectileTileOpen(map,map.width,p.x+.5,p.y+.5),true);}
 const resumed=generateDeepV2Dungeon(save.seed,id);applyDeepDungeonProgress(save,id,resumed);assert.equal(applyVoidScars(migrateSave(JSON.parse(JSON.stringify(save))),resumed,id).ok,true);assert.equal(resumed.tiles[at.y*resumed.width+at.x].kind,'voidScar');
});

test('later shortcut completion preserves the scar instead of repainting its permanent floor',()=>{
 const save=saveOf(),id=deepV2Id(save.seed,1,5,5,'threefold'),map=generateDeepV2Dungeon(save.seed,id);applyDeepDungeonProgress(save,id,map);const shortcut=map.objects.find(o=>o.kind==='deepShortcut');assert.ok(shortcut);
 assert.equal(consumeVoidTerrain(save,map,id,shortcut,7).ok,true);const scarred=shortcut.cells.filter(p=>map.tiles[p.y*map.width+p.x].voidScar);assert.ok(scarred.length);
 deepDungeonProgress(save,id).openedShortcutIds.push(shortcut.id);applyDeepDungeonProgress(save,id,map);for(const p of scarred)assert.equal(map.tiles[p.y*map.width+p.x].kind,'voidScar');
});

test('Supernova and scar replay never change dungeon discovery or reveal hidden entities',()=>{
 const map=grid(),save=saveOf();map.levelId='root';map.dungeonContract={discoveryEnabled:true};applyDungeonDiscovery(map,['root:0,0']);
 map.objects=[{id:'secret',kind:'cache',x:18,y:18,state:'hidden'}];map.enemySpawns=[{id:'unseen',kind:'ashling',x:18,y:18}];
 const reveal=map._dungeonRevealed,before=JSON.stringify({reveal:[...reveal],objects:map.objects,enemies:map.enemySpawns});assert.equal(dungeonTileVisibility(map,18,18),'unseen');
 assert.equal(consumeVoidTerrain(save,map,key,{x:16,y:16},5).ok,true);assert.equal(map._dungeonRevealed,reveal);assert.equal(JSON.stringify({reveal:[...reveal],objects:map.objects,enemies:map.enemySpawns}),before);assert.equal(dungeonTileVisibility(map,18,18),'unseen');
 applyVoidScars(save,map,key);assert.equal(map._dungeonRevealed,reveal);assert.equal(dungeonTileVisibility(map,18,18),'unseen');
});

test('actual overworld regeneration, revisit and JSON reload retain permanent scars without moving objects',()=>{
 const save=saveOf(),game=new Game(save,0);game.rx=5;game.ry=5;game.loadArea('overworld',false);const area=game.areaStateId(),objects=game.map.objects.map(o=>({id:o.id,x:o.x,y:o.y}));
 assert.equal(game.packWorld(.05,0).consumeVoidTerrain({}, {x:16,y:16},5).ok,true);const cells=[...save.voidScars.areas[area].cells],scars=cells.map(c=>{const[x,y]=c.split(',').map(Number);return {...game.map.tiles[y*32+x]};});assert.ok(cells.length>50);
 game.loadArea('overworld',true);assert.deepEqual(game.map.objects.map(o=>({id:o.id,x:o.x,y:o.y})),objects);for(const t of scars)assert.deepEqual(game.map.tiles[t.y*32+t.x],t);
 const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(game.exportSnapshot(0)))),0);assert.equal(resumed.areaStateId(),area);for(const t of scars)assert.deepEqual(resumed.map.tiles[t.y*32+t.x],t);
});

test('scar-only steep joins are safe for actual player motion and Walker routes in both directions',()=>{
 for(const direction of [-1,1]){
  const map=grid();for(const t of map.tiles)t.elev=t.x<5?5:0;for(let y=0;y<map.height;y++)Object.assign(map.tiles[y*map.width+5],{kind:'voidScar',voidScar:true});
  const game=gameOf(map);game.player.x=direction===1?4.4:4.6;const before=game.player.hp;game.update(.05,{state:{x:direction,y:0},consume:()=>false},1000);assert.equal(game.player.hp,before);assert.ok(direction*(game.player.x-(direction===1?4.4:4.6))>0);
  const e={id:'walker',x:direction===1?4.4:4.6,y:5};assert.equal(moveWalkerGround(e,direction*.2,0,map,map.width),true);assert.equal(walkerGroundPositionOpen(map,map.width,e.x,e.y),true);
  assert.equal(canStep({},map,map.width,4,5,5,5),true);assert.equal(canStep({},map,map.width,5,5,4,5),true);assert.equal(canReturnTo(map,map.width,map.height,{x:3,y:3})[6*map.width+6],1);
 }
});

test('scar safety never bypasses surviving walls or hazards and leaves ordinary lethal drops unchanged',()=>{
 const high={kind:'floor',blocked:false,elev:5},low={kind:'floor',blocked:false,elev:0},scar={...low,kind:'voidScar',voidScar:true};assert.equal(safeVoidScarTransition(high,scar),true);assert.equal(safeVoidScarTransition(high,low),false);assert.equal(fallDamage(5,100),Infinity);
 for(const bad of [{kind:'wall',blocked:true},{kind:'lava',blocked:false},{kind:'abyss',blocked:false},{kind:'floor',blocked:false,pit:true}])assert.equal(safeVoidScarTransition(scar,bad),false);
 const map=grid(),e={id:'walker',x:4,y:5};map.tiles[5*map.width+4]={...map.tiles[5*map.width+4],...scar};Object.assign(map.tiles[5*map.width+5],{kind:'wall',blocked:true});moveWalkerGround(e,1,0,map,map.width);assert.ok(e.x<5);
});


test('production dashes and radial particles cross consumed walls but stop at surviving outside walls',()=>{
 const map=grid();for(let y=0;y<map.height;y++)for(const x of [7,10])Object.assign(map.tiles[y*map.width+x],{kind:'wall',blocked:true});
 const game=gameOf(map);game.player.x=3;game.player.y=3;const e=createCombatant('voidWalker',5,12,true,[]);Object.assign(e,{id:'scar-dash',worldBeast:'voidWalker',aggro:true});game.enemies=[e];
 assert.equal(game.packWorld(.05,0).consumeVoidTerrain(e,{x:6,y:12},2).ok,true);assert.equal(map.tiles[12*map.width+7].kind,'voidScar');assert.equal(map.tiles[12*map.width+10].blocked,true);
 e.pack=freshPackState();Object.assign(e.pack,{attack:'voidSupernova',phase:'active',state:'attack',t:10,data:{dashes:6,dash:{stage:'run',left:.4,dir:{x:1,y:0},target:{x:13,y:12},trail:{x:5,y:12},trailT:0,hit:false}}});
 for(let i=0;i<9;i++)updatePackMonster(e,game.packWorld(.05,i*50));assert.ok(e.x>7);assert.ok(e.x<10);assert.ok(game.packEffects.some(f=>f.kind==='voidAfterimage'));
 const particle={id:'scar-particle',owner:e.id,kind:'voidParticle',x:5,y:12,vx:10,vy:0,life:2,arming:0,radius:.15,damage:10};game.packEffects=[particle];
 for(let i=0;i<25&&game.packEffects.length;i++)game.packEffects=tickPackEffects(game.packEffects,game.packWorld(.05,i*50));assert.ok(particle.x>7);assert.ok(particle.x<10);assert.equal(game.packEffects.length,0);
});


test('production cast persists the exact Nova circle and its original raised-ground projection',()=>{
 const map=grid();for(const t of map.tiles)t.elev=3;const game=gameOf(map),center={x:10.2,y:10.3},visualLift=liftAt(map,map.width,center.x,center.y);
 assert.equal(game.packWorld(.05,0).consumeVoidTerrain({},center,3.25).ok,true);const disk=game.save.voidScars.areas[key].circles[0];assert.deepEqual(disk,{x:center.x+.5,y:center.y+.62,radius:3.25,visualLift});
 const restored=grid();assert.equal(applyVoidScars(migrateSave(JSON.parse(JSON.stringify(game.save))),restored,key).ok,true);assert.deepEqual(restored._voidScarCircles,[disk]);
});


test('diagonal player substeps through a scar corner do not invent an ordinary lethal fall',()=>{
 const map=grid();map.tiles[5*map.width+4].elev=5;const game=gameOf(map);
 consumeVoidTerrain(game.save,map,key,{x:10.5,y:.5},7);
 assert.equal(map.tiles[5*map.width+5].voidScar,true);assert.equal(map.tiles[5*map.width+4].voidScar,undefined);assert.equal(map.tiles[6*map.width+5].voidScar,undefined);
 Object.assign(game.player,{x:4.49,y:5.24});game.update(.05,{state:{x:1,y:1},consume:()=>false},1000);
 assert.equal(game.save.worldFlags.deaths||0,0);assert.equal(game.player.hp,100);assert.equal(game.area,'dungeon');assert.ok(game.player.x>4.5&&game.player.y>5.25);
});

test('diagonal departure from a scar does not protect a later ordinary five-level cliff',()=>{
 const map=grid();for(const x of [4,5])map.tiles[6*map.width+x].elev=5;const game=gameOf(map);
 consumeVoidTerrain(game.save,map,key,{x:.5,y:.5},7);
 assert.equal(map.tiles[6*map.width+4].voidScar,true);assert.equal(map.tiles[6*map.width+5].voidScar,undefined);assert.equal(map.tiles[7*map.width+5].voidScar,undefined);
 Object.assign(game.player,{x:4.49,y:6.24});game.update(.05,{state:{x:1,y:1},consume:()=>false},1000);
 assert.equal(game.save.worldFlags.deaths,1);assert.ok(Math.abs(game.player.x-4.49)>.2||Math.abs(game.player.y-6.24)>.2);
});
