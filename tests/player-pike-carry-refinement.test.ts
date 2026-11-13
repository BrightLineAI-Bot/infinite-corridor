import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {createCombatant} from '../src/combat.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
function sample(step=0,phase=0,reducedMotion=false,speed=0,nowMs=2000){const state=createHeroPoseState(asset),frame=createHeroFrame(asset);assert.ok(sampleCloseViewHero(asset,state,{nowMs,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed,gaitPhase:1.1,heldProfile:'cinder-pike',action:step?{kind:'melee',profile:'cinder-pike',primaryStep:step,phase,durationMs:240,poseMs:2000}:null,alpha:1,tint:[1,1,1],hitFlash:0},frame));return{state,frame};}
function shaft(frame){const m=frame.rightSocket,len=Math.hypot(m[0],m[1],m[2]),axis=[m[0]/len,m[1]/len,m[2]/len],v=[12,13,14].map(k=>frame.leftSocket[k]-m[k]),along=v.reduce((s,x,k)=>s+x*axis[k],0);return{up:Math.asin(axis[2])*180/Math.PI,bearing:Math.atan2(axis[1],axis[0])*180/Math.PI,separation:along,error:Math.sqrt(Math.max(0,v.reduce((s,x)=>s+x*x,0)-along*along))};}
test('Pike carry raises the point diagonally across the torso with two separated hand contacts',()=>{
  for(const reduced of[false,true])for(const speed of[0,1.2]){const a=sample(0,0,reduced,speed),q=shaft(a.frame);assert.ok(q.up>30&&q.up<40);assert.ok(Math.abs(q.bearing)>30&&Math.abs(q.bearing)<40);assert.ok(q.separation>.17&&q.separation<.20);assert.ok(q.error<1e-5);assert.ok(a.state.primaryGripResidual<1e-5);}
});
// 2026-11-13 (Tim: the Pike combo is three thrusts from a lunge stance, "one foot forward, one back"): the feet now open into a
// lunge during each thrust (they were held still before) and close again at both ends of it.
const stride=(state)=>state.global[1*16+14]-state.global[36*16+14]; // Foot.L ahead of Foot.R along source +Z (forward)
test('three thrust poses lower the shared shaft from a lunge and return to one common carry',()=>{
  for(const reduced of[false,true])for(const speed of[0,1.2])for(const step of[1,2,3]){for(const phase of[0,.12,.3,.55,1]){const idle=sample(0,0,reduced,speed,2000+phase*240),a=sample(step,phase,reduced,speed),q=shaft(a.frame);assert.ok(q.error<1e-5);assert.ok(a.state.primaryGripResidual<1e-5);assert.ok(a.frame.positionsNormals.every(Number.isFinite));if(phase===.3){assert.ok(Math.abs(q.up)<6,'thrust is lowered, not a repeated raised carry');assert.ok(stride(a.state)-stride(idle.state)>.15,'a lunge: one foot forward, one back');}if(phase===0||phase===1){for(const n of[1,36])assert.deepEqual(a.state.pose.slice(n*10,n*10+10),idle.state.pose.slice(n*10,n*10+10));assert.deepEqual(a.frame.leftSocket,idle.frame.leftSocket);assert.deepEqual(a.frame.rightSocket,idle.frame.rightSocket);}}}
});
test('one, two or three accepted Pike presses retain immediate single contact with no automatic burst',()=>{
  for(const count of[1,2,3]){const g=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000}).game;g.save.equipment.primary={id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5};g.save.closeView=true;const foe=Object.assign(createCombatant('rootBrute',g.player.x+1,g.player.y),{hp:10000,maxHp:10000,hitStun:1e6});g.enemies=[foe];let hp=foe.hp;for(let i=0;i<count;i++){g.primaryAttack(100000+i*420,{x:1,y:0});assert.equal(g.player.primaryCombo.step,i+1);assert.ok(foe.hp<hp,'contact resolves in accepted call');assert.equal(g.pendingMeleeContact,null);hp=foe.hp;}const stage=g.player.primaryCombo.step;g.update(.016,{state:{x:0,y:0},consume:()=>false,held:()=>false},100000+(count-1)*420+16);assert.equal(g.player.primaryCombo.step,stage);assert.equal(foe.hp,hp,'idle update cannot invent a fourth input or another hit');}
});
