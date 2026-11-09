import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTOR_CONTACT, actorContactBottom, actorContactContext, actorContactTop, materialVeilMoth, ordinaryContactEnemy } from '../src/actor-contact.ts';
import { Game, BRAWLER_GEAR, moveAxis, updateEnemyAI } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const floor = (width=24,height=16) => ({width,height,objects:[],enemySpawns:[],entry:{x:3,y:5},tiles:Array.from({length:width*height},(_,i)=>({x:i%width,y:Math.floor(i/width),kind:'flagFloor',blocked:false,elev:0}))});
const moth = (x=5,y=5,extra={}) => Object.assign(createCombatant('veilMoth',x,y),extra);
const harness = (e=moth()) => ({map:floor(),enemies:[e],player:{x:3,y:5,hp:100,isPlayer:true},save:{}});
const move = (g,e,dx,dy) => moveAxis(e,dx,dy,g.map,g.map.width,false,null,false,actorContactContext(g,e,dx,dy));
const gap = (g,e=g.enemies[0]) => Math.hypot(g.player.x-e.x,g.player.y-e.y);
const radius = e => ACTOR_CONTACT.playerRadius+enemyBodyRadius(e);
const input = (x,y,action='') => {let used=false;return{state:{x,y},consume:k=>k===action&&!used&&(used=true),held:()=>false}};
function actualGame(){const {game:g}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',seed:'VEIL-MOTH-CONTACT',now:1000});g.map=floor();g.enemies=[moth(5,5,{hitStun:1e6})];Object.assign(g.player,{x:3,y:5,hp:g.save.maxHp,invulnerableUntil:1e9});return g}

test('only the ordinary legacy Veil Moth enters material contact',()=>{
  const e=moth();assert.equal(e.scale,.82);assert.equal(e.bodyRadius,.38);assert.equal(e.range,4);assert.equal(e.instantStrike,true);assert.equal(e.flying,undefined);assert.equal(e.aloft,undefined);assert.equal(e.packKind,undefined);assert.equal(e.meleePatterns.length,0);assert.equal(materialVeilMoth(e),true);assert.equal(ordinaryContactEnemy(e),true);
  for(const patch of [{packKind:true},{aloft:true},{hopLift:.01},{poiseBreak:.1}])assert.equal(ordinaryContactEnemy(moth(5,5,patch)),false,JSON.stringify(patch));
  assert.equal(ordinaryContactEnemy(createCombatant('cinderWisp',5,5)),false,'the other legacy airborne exclusion is unchanged');
  for(const kind of ['vesperwing','gravitantBell'])assert.equal(ordinaryContactEnemy(createCombatant(kind,5,5)),true,`${kind} keeps its pre-pilot admission`);
});

test('authored Veil Moth occupied interval contains sampled native geometry at bounded scales',()=>{
  assert.deepEqual([actorContactBottom(moth()),actorContactTop(moth())],[.287,1.2136]);
  for(const scale of [.25,.82,.8692,.8856,1,4]){const e=moth(5,5,{scale});assert.equal(actorContactBottom(e),.35*scale);assert.equal(actorContactTop(e),1.48*scale);assert.ok(actorContactBottom(e)<=.358218*scale);assert.ok(actorContactTop(e)>=1.472015*scale)}
  const source=readFileSync(new URL('../src/actor-contact.ts',import.meta.url),'utf8');assert.doesNotMatch(source,/actor-presentation|renderer|close-view/);
});

test('player and reverse Veil Moth sweeps stop at the existing combined radius and permit old overlap escape',()=>{
  const g=harness(),e=g.enemies[0];move(g,g.player,8,0);assert.ok(Math.abs(gap(g)-radius(e))<1e-6);const px=g.player.x;move(g,e,-5,0);assert.equal(g.player.x,px);assert.ok(gap(g)>=radius(e)-1e-7);
  g.player.x=e.x;move(g,g.player,-2,0);assert.ok(g.player.x<3.5);move(g,g.player,4,0);assert.ok(gap(g)>=radius(e)-1e-7);
});

test('vertical intervals block at three levels and clear at four, including exact touch and carrier support',()=>{
  const e=moth(),g=harness(e);let support=1.02;g.actorContactPlatformSupport=(body)=>body===g.player?support:null;
  move(g,g.player,4,0);assert.ok(g.player.x<e.x,'three .34 levels still overlap the moth');
  for(const value of [1.36,actorContactTop(e)]){g.player.x=3;support=value;move(g,g.player,4,0);assert.ok(g.player.x>6,`support ${value} clears at/above the moth top`)}
  g.player.x=3;support=actorContactTop(e)-1e-6;move(g,g.player,4,0);assert.ok(g.player.x<e.x,'sub-touch overlap remains solid');
  g.player.x=3;support=actorContactTop(e);g.actorContactPlatformSupport=(body)=>body===g.player?support:null;move(g,e,-4,0);assert.ok(e.x<2,'reverse mover sees the same exact-touch clearance');
});

test('actual Game walking and dodge stop at a living Veil Moth without changing its instant strike contract',()=>{
  const outcomes=[];for(const action of ['','dodge']){const g=actualGame(),e=g.enemies[0],before={instant:e.instantStrike,range:e.range,damage:e.damage};for(let i=0;i<40;i++)g.update(.05,input(1,0,i===0?action:''),1000+i*50);assert.ok(Math.abs(gap(g)-radius(e))<1e-6);assert.deepEqual({instant:e.instantStrike,range:e.range,damage:e.damage},before);assert.equal(g.projectiles.length,0);outcomes.push([g.player.x,g.player.y,e.x,e.y])}assert.equal(outcomes.length,2);
});

test('actual ordinary AI uses reverse material contact without fabricating a flight or projectile branch',()=>{
  const g=actualGame(),e=g.enemies[0];delete e.hitStun;let attacks=0,shots=0;for(let i=0;i<300;i++){if(updateEnemyAI(e,g.player,g.map,g.map.width,.05,1000+i*50,false,()=>shots++,(s,dx,dy)=>g.moveGrounded(s,dx,dy)))attacks++}assert.ok(gap(g)>=radius(e)-1e-7);assert.ok(attacks>0);assert.equal(shots,0);assert.equal(e.flying,undefined);assert.equal(e.aloft,undefined);
});

test('Fists and Shadow Boxing consume the accepted endpoint while the moth remains unchanged',()=>{
  const g=actualGame(),e=g.enemies[0];g.save.equipment.primary={...BRAWLER_GEAR[0].item};e.x=3.9;g.lockTarget(e.id);g.fistPunch(2,1,1200,{x:1,y:0});assert.ok(gap(g)>=radius(e)-1e-7);const fist=g.effects.find(q=>q.kind==='iron-fist');assert.ok(fist);assert.equal(fist.x,g.player.x+1.2);
  const h=actualGame(),m=h.enemies[0];m.x=5;h.lockTarget(m.id);h.shadowBoxStep(2,1400);assert.ok(h.player.x<4);assert.ok(gap(h,m)>=radius(m)-1e-7);assert.equal(m.hp,m.maxHp);
});

test('death, pause/save and teleport-style exclusions stay outside the new stateless policy',()=>{
  const g=actualGame(),e=g.enemies[0];e.dead=true;e.hp=0;assert.equal(ordinaryContactEnemy(e),false);e.dead=false;e.hp=e.maxHp;e.hidden=true;assert.equal(ordinaryContactEnemy(e),false);e.hidden=false;e.phasing=true;assert.equal(ordinaryContactEnemy(e),false);
  e.phasing=false;g.setPaused(true,1500);const before={x:e.x,y:e.y,bottom:actorContactBottom(e),top:actorContactTop(e)},copy=JSON.parse(JSON.stringify(e)),snap=g.exportSnapshot(1500),restored=new Game(deserializeSave(serializeSave(snap)),5000);assert.deepEqual({x:e.x,y:e.y,bottom:actorContactBottom(e),top:actorContactTop(e)},before);assert.equal(actorContactBottom(copy),.287);assert.equal(actorContactTop(copy),1.2136);assert.equal('actorContact' in snap,false);assert.equal(restored.save.version,14);
});
