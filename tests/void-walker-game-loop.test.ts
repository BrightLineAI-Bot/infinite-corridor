import assert from 'node:assert/strict';
import test from 'node:test';
import { Game, walkerGroundPositionOpen } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, freshPackState } from '../src/monster-pack.ts';
function scenario(area, attack) {
 const save=freshSave(); save.seed=`VOID-FULL-LOOP-${area}-${attack}`; save.level=12; save.maxHp=10000;
 const g=new Game(save,0),width=area==='dungeon'?40:32; save.maxHp=10000;
 const map={width,height:width,entry:{x:3,y:3},objects:[],enemySpawns:[],tiles:Array.from({length:width*width},(_,i)=>{const x=i%width,y=Math.floor(i/width),blocked=x===0||y===0||x===width-1||y===width-1;return{x,y,kind:blocked?'wall':'floor',blocked,elev:0}})};
 const id=`dungeon:${save.seed}:g1:5:5:full-loop`;save.session.activeDungeonId=id;
 save.worldBeasts.voidWalker.active=area==='dungeon'?{dungeon:id,tries:0}:{rx:5,ry:5,tries:0};
 Object.assign(g,{area,rx:5,ry:5,map,enemies:[],effects:[],packEffects:[],projectiles:[],paused:false,seaHazards:null,storm:null});
 Object.assign(g.player,{x:16,y:16,hp:10000,invulnerableUntil:0,dodgeUntil:0});
 const e=createCombatant('voidWalker',18,18,true,[]);Object.assign(e,{id:`full-loop-${attack}`,worldBeast:'voidWalker',aggro:true,hp:3000,maxHp:3000,damage:20,packAttacks:[attack],packBossAttacks:[]});e.pack=freshPackState();e.pack.gap=0;g.enemies=[e];
 let peak=0,began=false,damage=0,paused=false,now=0;
 for(let frame=0;frame<280;frame++){
  now+=50;const t=frame*.05,target={x:16+Math.sin(t*.7)*2.6,y:16+Math.cos(t*.55)*2.6},dx=target.x-g.player.x,dy=target.y-g.player.y;
  let dodged=false;const input={state:{x:dx,y:dy},consume(key){if(key==='dodge'&&!dodged&&frame%37===0){dodged=true;return true}return false}};
  const hp=g.player.hp;g.update(.05,input,now);damage+=Math.max(0,hp-g.player.hp);
  if(e.pack.attack===attack){began=true;e.packAttacks=[];}
  peak=Math.max(peak,g.packEffects.length);
  assert.ok(g.packEffects.length<=48);assert.ok(g.enemies.length<=1,JSON.stringify({area,attack,frame,enemies:g.enemies.map(q=>({kind:q.kind,id:q.id,owner:q.summonedBy})),position:[g.player.x,g.player.y],actualArea:g.area}));assert.ok([e.x,e.y,g.player.x,g.player.y,g.player.hp].every(Number.isFinite));
  assert.ok(walkerGroundPositionOpen(map,width,e.x,e.y),'ground creature remains legal');
  if(attack==='voidSupernova'&&frame===60){
   g.setPaused(true,now);const before=JSON.stringify({pack:e.pack,fx:g.packEffects,x:e.x,y:e.y,hp:g.player.hp});
   for(let p=0;p<20;p++){now+=500;g.update(.05,input,now);}
   assert.equal(JSON.stringify({pack:e.pack,fx:g.packEffects,x:e.x,y:e.y,hp:g.player.hp}),before);g.setPaused(false,now);paused=true;
  }
 }
 assert.ok(began,`${attack} began in ${area}`);assert.equal(e.pack.attack,null,`${attack} completes`);assert.equal(g.packEffects.length,0,'effects finish');
 if(attack==='voidSupernova'){assert.ok(map.tiles.some(t=>t.kind==='voidScar'));assert.ok(save.voidScars.areas[g.areaStateId()],`${area} aftermath persists`);}else assert.equal(Object.keys(save.voidScars.areas).length,0,'other attacks never change terrain');
 return{area,attack,began,peakEffects:peak,damage,paused,scarCells:map.tiles.filter(t=>t.kind==='voidScar').length};
}
// The attack is deliberately selected, but input, scheduling, damage, pause and cleanup
// run through the production Game loop rather than a parallel simulation.
for(const area of ['dungeon','overworld'])for(const attack of MONSTER_PACK.voidWalker.attacks)
 test(`production Game.update completes ${attack} in ${area} with bounded effects and scripted dodge input`,()=>scenario(area,attack));
