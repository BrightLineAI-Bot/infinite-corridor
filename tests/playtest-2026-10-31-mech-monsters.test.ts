// Audit-only tests pinned to r603 4a30ef33. No gameplay changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, footprintOpen, footprintHazard } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createCombatant, CREATURE_FORMS } from '../src/combat.ts';
import { PACK_KINDS, MONSTER_PACK } from '../src/monster-pack.ts';
import { ensureMech, mechAbsorb } from '../src/vehicle-gates.ts';
const input = (x=0,y=0,jump=false,held=false) => { let press=jump; return {state:{x,y},consume:(k)=>k==='jump'&&press?(press=false,true):false,held:(k)=>held&&k==='jump'}; };
function robot(iron=10) {const s=freshSave();s.seed='MECH';s.perception.aperture=3255;s.farArray={listeners:2};s.consumables.submersible=1;s.materials.cinderIron=iron;const g=new Game(s,0);g.enemies=[];assert.equal(g.useConsumable('submersible',0),true);return g;}
function advance(g,seconds,start=1000,controls=input()){for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05,controls,start+(i+1)*50);return start+Math.round(seconds/.05)*50;}

test('audit control: full snapshot roundtrip preserves exact mech fields, including fractional cooldown and replate delay',()=>{
 for(const state of [{built:true,active:true,plate:0,replateIn:17.125,cooldown:0,fuel:.375},{built:true,active:false,plate:9,cooldown:16.75,fuel:.625},{built:true,active:true,plate:33,cooldown:0,fuel:2.875,empowered:true,burnIn:12.375}]){
  const g=robot();g.save.mech={...state};ensureMech(g.save);const before=structuredClone(g.save.mech);const r=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(1000)))),0);assert.deepEqual(r.save.mech,before);
 }
});

test('audit regression: reload does not rearm an exhausted boost while Jump is continuously held',t=>{
 const g=robot(),hold=input(0,0,true,true);let now=advance(g,1.85,1000,hold);
 assert.equal(g.mechSpent,true);assert.ok(g.save.mech.fuel>0);assert.ok(now>g.jumpUntil,'already landed without releasing Jump');
 const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(now)))),0);resumed.enemies=[];
 assert.deepEqual(resumed.save.mech,g.save.mech,'durable fields are exact before advancing');
 const stillHeld=input(0,0,false,true);g.update(.05,stillHeld,now+50);resumed.update(.05,stillHeld,50);
 t.diagnostic(JSON.stringify({control:{boost:g.mechBoosting,fuel:g.save.mech.fuel,spent:g.mechSpent},resumed:{boost:resumed.mechBoosting,fuel:resumed.save.mech.fuel,spent:resumed.mechSpent}}));
 assert.equal(resumed.mechBoosting,g.mechBoosting,'reloading is not a new Jump press or release');
 assert.equal(resumed.save.mech.fuel,g.save.mech.fuel);
});

test('audit control: real Game ticks the bare-plating interval and no-iron rebuild cooldown at frame boundaries',()=>{
 const g=robot(3);g.save.mech.plate=4;const r=mechAbsorb(g.save,20);assert.equal(r.stripped,true);assert.equal(g.save.materials.cinderIron,0);
 advance(g,19.9);assert.equal(g.save.mech.plate,0);assert.ok(g.save.mech.replateIn>0);
 advance(g,.2,20900);assert.equal(g.save.mech.plate,60);assert.equal(g.save.mech.replateIn,undefined);
 g.save.mech.plate=4;assert.equal(mechAbsorb(g.save,20).broke,true);assert.equal(g.useConsumable('submersible',22000),false);advance(g,19.9,22000);assert.equal(g.useConsumable('submersible',41900),false);advance(g,.2,41900);assert.equal(g.useConsumable('submersible',42100),true);
});

test('audit control: empowered burns iron then returns to normal; folding cancels reforge intentionally',()=>{
 const g=robot(2);assert.equal(g.useConsumable('submersible',0),true);assert.equal(g.save.materials.cinderIron,1);advance(g,20.05);assert.equal(g.save.materials.cinderIron,0);assert.equal(g.save.mech.empowered,true);advance(g,20.05,21050);assert.equal(g.save.mech.empowered,undefined);assert.equal(g.mechUp(),true);
 g.save.materials.cinderIron=3;g.save.mech.plate=1;mechAbsorb(g.save,20);assert.equal(g.save.mech.replateIn,20);assert.equal(g.useConsumable('submersible',43000),true);advance(g,.05,43000);assert.equal(g.save.mech.active,false);assert.equal(g.save.mech.replateIn,undefined);
});

function chasm(){const s=freshSave();s.seed='CH593';s.session.activeDungeonId='dungeon:CH593:g1:13:6:room';s.session.dungeonReturn={rx:3,ry:2,x:16,y:16};const g=new Game(s,0);g.loadArea('dungeon',false);g.enemies=[];return g;}
test('audit regression: ground Ashling must not walk alive onto a naturally generated star chasm',t=>{
 const g=chasm(),w=g.map.width;let pair=null;
 for(let y=2;y<g.map.height-2&&!pair;y++)for(let x=2;x<w-8&&!pair;x++)if(!g.map.tiles[y*w+x].chasm&&footprintOpen(g.map,w,x,y-.25))for(let gap=2;gap<=7;gap++){
  if(g.map.tiles[y*w+x+gap].chasm||!footprintOpen(g.map,w,x+gap,y-.25))continue;const between=Array.from({length:gap-1},(_,i)=>g.map.tiles[y*w+x+i+1]);if(between.some(q=>q.chasm)&&between.every(q=>!q.blocked)){pair={x,y,gap};break;}}
 assert.ok(pair);Object.assign(g.player,{x:pair.x+pair.gap,y:pair.y-.25,hp:10000});g.save.maxHp=10000;
 const e=createCombatant('ashling',pair.x,pair.y-.25);e.aggro=true;g.enemies=[e];let violation=null;
 for(let i=0;i<400;i++){g.update(.05,input(),1050+i*50);const q=g.map.tiles[Math.floor(e.y+.75)*w+Math.floor(e.x+.5)];if(q?.chasm&&!e.dead){violation={frame:i,x:e.x,y:e.y,tile:[q.x,q.y],hp:e.hp};break;}}
 t.diagnostic(JSON.stringify({pair,violation}));assert.equal(violation,null,'ground creature must keep off lethal chasm terrain');
});

function combatArena(){const g=robot();g.save.mech.active=false;g.area='dungeon';g.map={width:32,height:32,tiles:Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:'ash',blocked:i%32===0||i%32===31||i<32||i>=992})),objects:[],enemySpawns:[],exits:null,activeEnemyCap:64};Object.assign(g.player,{x:16,y:16,hp:10000,maxHp:10000});g.save.maxHp=10000;g.enemies=[];return g;}
test('audit control: Mirror Shade summoned illusions stay harmless through real Game updates',()=>{
 const g=combatArena(),owner=createCombatant('mirrorShade',19,16);owner.id='audit-shade';const world=g.packWorld(.05,1000);
 const clone=world.spawnIllusion(owner,17,16,0);assert.equal(clone.illusion,true);assert.equal(clone.noRewards,true);
 const before=g.player.hp;advance(g,5);assert.equal(g.player.hp,before,'clone attacks cannot damage player');assert.equal(g.packHurt(clone,999,{source:'audit'},10000),false);
});

test('audit control: the active robot stops at a naturally generated solid dungeon wall',()=>{
 const g=chasm();g.save.perception.aperture=3255;g.save.farArray={listeners:2};g.save.consumables.submersible=1;assert.equal(g.useConsumable('submersible',0),true);
 const w=g.map.width;const tile=g.map.tiles.find(q=>q.x>1&&q.x<w-2&&q.y>1&&q.y<g.map.height-2&&!q.blocked&&!q.chasm&&g.map.tiles[q.y*w+q.x+1]?.blocked);assert.ok(tile);
 Object.assign(g.player,{x:tile.x,y:tile.y-.25});advance(g,3,1000,input(1,0));assert.ok(g.player.x<tile.x+1,'never crosses the solid wall');assert.equal(g.save.worldFlags.deaths||0,0);assert.equal(g.mechUp(),true);
});

test('audit control: real loaded dungeon scales beyond ring 40 and snapshot reload does not scale it twice',()=>{
 const make=(rx)=>{const s=freshSave();s.seed='AUDIT-SCALE';s.session.activeDungeonId='dungeon:AUDIT-SCALE:g1:3:2:room';s.session.dungeonReturn={rx,ry:0,x:16,y:16};const g=new Game(s,0);g.rx=rx;g.ry=0;g.loadArea('dungeon',false);return g;};
 const near=make(0),far=make(100);let checked=0;
 for(const e of far.enemies){const base=near.enemies.find(q=>q.id===e.id);if(!base||e.foundryValidated||e.farArrayBoss||e.worldBeast)continue;assert.equal(e.maxHp,Math.round(base.maxHp*10),e.kind);assert.equal(e.threatRing,100);checked++;}assert.ok(checked>0);
 const hp=far.enemies.map(e=>[e.id,e.hp,e.maxHp]);const resumed=new Game(migrateSave(JSON.parse(JSON.stringify(far.exportSnapshot(1000)))),0);assert.deepEqual(resumed.enemies.map(e=>[e.id,e.hp,e.maxHp]),hp);
});
