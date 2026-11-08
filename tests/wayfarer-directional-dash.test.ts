import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { normalizeDodgeVisual, recordHeroPresentation } from '../src/action-motion.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { Game } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
const base=(extra={})=>({nowMs:0,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,action:null,alpha:1,tint:[1,1,1],hitFlash:0,...extra});
function frame(input){const state=createHeroPoseState(asset),out=createHeroFrame(asset);assert.equal(sampleCloseViewHero(asset,state,input,out),true);return{state,out};}
const positions=f=>f.positionsNormals.filter((_,i)=>i%6<3);
const lowHigh=f=>{let low=Infinity,high=-Infinity;for(const v of asset.arrays.indices){const z=f.positionsNormals[v*6+2];low=Math.min(low,z);high=Math.max(high,z);}return{low,high};};

test('four-way quicksteps stay grounded, upright, continuous and return exactly to captured locomotion',()=>{
  const dirs=[[1,0,'forward'],[-1,0,'back'],[0,1,'right'],[0,-1,'left']];
  for(const speed of [0,2.4])for(const gaitPhase of [0,.8,2.7,5.4])for(const [x,y,label] of dirs){
    let prior=null,peak=Infinity;const start=frame(base({speed,gaitPhase}));
    for(let i=0;i<=24;i++){const phase=i/24,{state,out}=frame(base({speed,gaitPhase,action:{kind:'dodge',profile:'dodge',phase,durationMs:260,yaw:0,moveX:x,moveY:y}}));
      assert.equal(state.clip,`derived-quickstep-${label}`);assert.ok(out.positionsNormals.every(Number.isFinite));for(let k=3;k<out.positionsNormals.length;k+=6)assert.ok(Math.abs(Math.hypot(out.positionsNormals[k],out.positionsNormals[k+1],out.positionsNormals[k+2])-1)<1e-5);
      const {low,high}=lowHigh(out);assert.ok(low>=-.0121,`${label} boot ${low}`);peak=Math.min(peak,high);assert.ok(state.global[3*16+5]>.65,'head remains upright');
      if(prior){let max=0;for(let k=0;k<out.positionsNormals.length;k+=6)max=Math.max(max,Math.hypot(out.positionsNormals[k]-prior.positionsNormals[k],out.positionsNormals[k+1]-prior.positionsNormals[k+1],out.positionsNormals[k+2]-prior.positionsNormals[k+2]));assert.ok(max<.25,`${label} phase continuity ${max}`);}prior=out;
    }
    const end=frame(base({nowMs:260,speed,gaitPhase,action:{kind:'dodge',profile:'dodge',phase:1,durationMs:260,poseMs:0,yaw:0,moveX:x,moveY:y}})),recovered=frame(base({nowMs:260,speed,gaitPhase}));assert.deepEqual(end.out.positionsNormals,recovered.out.positionsNormals);assert.deepEqual(end.out.leftSocket,recovered.out.leftSocket);assert.deepEqual(end.out.rightSocket,recovered.out.rightSocket);
    const height=lowHigh(start.out).high;assert.ok(peak<=height*.90&&peak>=height*.75,`${label} crouch ${peak}/${height}`);
  }
});

test('ordinary gait stays pure Walk and the derived Run loop closes its source seam',()=>{
  assert.equal(frame(base({speed:2.4,gaitPhase:1})).state.clip,'Walk');
  const a=frame(base({speed:4,gaitPhase:0})),b=frame(base({speed:4,gaitPhase:Math.PI*2-1e-6}));assert.equal(a.state.clip,'Run');
  let seam=0;for(let i=0;i<a.out.positionsNormals.length;i+=6)seam=Math.max(seam,Math.hypot(a.out.positionsNormals[i]-b.out.positionsNormals[i],a.out.positionsNormals[i+1]-b.out.positionsNormals[i+1],a.out.positionsNormals[i+2]-b.out.positionsNormals[i+2]));assert.ok(seam<.002,`run seam ${seam}`);
});

test('accepted Game dodge captures facing without changing authoritative movement, timers or refusal state',()=>{
  const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});game.enemies=[];game.player.facing='left';game.player.stamina=50;const before={x:game.player.x,y:game.player.y,stamina:game.player.stamina};
  const input={state:{x:1,y:0},consume:k=>k==='dodge',held:()=>false};game.update(.01,input,100000);
  assert.equal(game.player.dodgeUntil,100260);assert.equal(game.player.invulnerableUntil,100420);assert.equal(game.player.dodgeX,1);assert.equal(game.player.dodgeY,0);assert.equal(game.player.dodgeVisual.facingYaw,Math.PI);assert.ok(game.player.x>before.x);assert.equal(game.player.y,before.y);assert.ok(game.player.stamina<before.stamina);
  const accepted=structuredClone(game.player.dodgeVisual),until=game.player.dodgeUntil;game.player.stamina=0;game.update(.01,input,100010);assert.deepEqual(game.player.dodgeVisual,accepted);assert.equal(game.player.dodgeUntil,until);assert.ok(game.player.stamina>=0&&game.player.stamina<1,'refusal only receives ordinary frame recovery');
});

test('accepted cache yaw is canonical and remains valid through serialized many-turn presentation',()=>{
  const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:300000});game.enemies=[];recordHeroPresentation(game.player,{gaitPhase:1.2,speed:.7,yaw:Math.PI*20+.43,now:300000,x:game.player.x,y:game.player.y});game.update(0,{state:{x:1,y:0},consume:k=>k==='dodge',held:()=>false},300000);
  assert.ok(Math.abs(game.player.dodgeVisual.facingYaw-.43)<1e-10);assert.equal(game.player.dodgeVisual.poseMs,300000);const saved=migrateSave(JSON.parse(JSON.stringify(game.exportSnapshot(300010))));assert.ok(saved.session.playerRuntime.dodgeVisual);assert.ok(Math.abs(saved.session.playerRuntime.dodgeVisual.facingYaw-.43)<1e-10);
});

test('dodge presentation metadata is future-safe, invalid-safe and stable through pause/reload',()=>{
  const future={later:['kept']},raw={facingYaw:.7,gaitPhase:2.2,moving:true,future};assert.deepEqual(normalizeDodgeVisual(raw),{...raw,speed:2.4});
  for(const bad of [[],{}, {facingYaw:Infinity,gaitPhase:0,moving:true},{facingYaw:0,gaitPhase:Infinity,moving:true},{facingYaw:0,gaitPhase:0,moving:'yes'},{facingYaw:0,gaitPhase:0,moving:true,poseMs:-1},{facingYaw:0,gaitPhase:0,moving:true,poseMs:Infinity}])assert.equal(normalizeDodgeVisual(bad),null);
  const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:200000});game.enemies=[];game.player.facing='up';game.update(.01,{state:{x:0,y:1},consume:k=>k==='dodge',held:()=>false},200000);game.player.dodgeVisual.future=future;game.setPaused(true,200080);
  const visual=structuredClone(game.player.dodgeVisual),saved=migrateSave(JSON.parse(JSON.stringify(game.exportSnapshot(900000)))),back=new Game(saved,1000000);assert.deepEqual(saved.session.playerRuntime.dodgeVisual,visual);assert.deepEqual(back.player.dodgeVisual,visual);assert.equal(back.player.dodgeUntil-back.pauseStarted,180);back.setPaused(false,1100000);assert.equal(back.player.dodgeUntil-1100000,180);
});
