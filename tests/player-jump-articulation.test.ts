import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {ordinaryJumpPresentation} from '../src/close-view-player-presentation.ts';
import {Game,JUMP,jumpLift} from '../src/game.ts';
import {freshSave,migrateSave} from '../src/types.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
function press(rank=0){const save=freshSave();save.seed='JUMP-HANDOFF';const g=new Game(save,0);g.loadArea('overworld',false);g.enemies=[];save.magicSkills.learned={quickening:rank};let used=false;g.update(.016,{state:{x:0,y:0},consume:k=>k==='jump'&&!used&&(used=true),held:()=>false},1000);return g;}
function descriptor(g,now){return ordinaryJumpPresentation(g,now,jumpLift(g,g.paused?g.pauseStarted:now),JUMP.base);}
function sample(air,reducedMotion=false,extra={},state=createHeroPoseState(asset)){const frame=createHeroFrame(asset),duration=air?.durationMs||520,phase=air?air.elapsedMs/duration:.4;assert.ok(sampleCloseViewHero(asset,state,{nowMs:2000,reducedMotion,x:0,y:0,groundZ:0,liftZ:air?.lift||0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.1,action:{kind:'jump',phase,durationMs:duration,jumpAir:air},alpha:1,tint:[1,1,1],hitFlash:0,...extra},frame));return{state,frame};}
function ankleGap(state,left){const lower=left?29:31,o=lower*16,k=left?0:3,a=state.ankleLocal,g=state.global,x=a[k],y=a[k+1],z=a[k+2],foot=(left?1:36)*16;return Math.hypot(g[o]*x+g[o+4]*y+g[o+8]*z+g[o+12]-g[foot+12],g[o+1]*x+g[o+5]*y+g[o+9]*z+g[o+13]-g[foot+13],g[o+2]*x+g[o+6]*y+g[o+10]*z+g[o+14]-g[foot+14]);}
function maxDelta(a,b){let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));return d;}
test('ordinary takeoff acknowledges the accepted clock and true air draw-up keeps both feet connected',()=>{
  const g=press();for(const reduced of[false,true]){const early=descriptor(g,1030),a=sample(early,reduced),legacy=sample(null,reduced,{liftZ:early.lift,action:{kind:'jump',phase:early.elapsedMs/early.durationMs,durationMs:early.durationMs}});assert.ok(maxDelta(a.frame.positionsNormals,legacy.frame.positionsNormals)>.001,'takeoff has an immediate readable cue');
    for(const now of[1060,1120,1200,1260,1400]){const air=descriptor(g,now),s=sample(air,reduced);assert.equal(s.state.clip,'derived-ordinary-jump');for(const left of[true,false])assert.ok(ankleGap(s.state,left)<.005,'root-parented foot follows solved virtual ankle');assert.ok(s.frame.positionsNormals.every(Number.isFinite));assert.equal(s.frame.vertexCount,asset.vertexCount);assert.equal(s.frame.indexCount,asset.indexCount);}
    const air=descriptor(g,1260),folded=sample(air,reduced),flat=sample(null,reduced,{liftZ:air.lift,action:{kind:'jump',phase:air.elapsedMs/air.durationMs,durationMs:air.durationMs}});for(const foot of[1,36])assert.ok(folded.state.global[foot*16+13]>flat.state.global[foot*16+13]+.05,'air feet visibly draw up');
  }
});
test('ground endpoints, unknown metadata and newer accepted reactions retain their original pose',()=>{
  for(const elapsedMs of[0,520]){const air={v:1,elapsedMs,remainingMs:520-elapsedMs,durationMs:520,lift:0,rise:elapsedMs?1:0,fall:elapsedMs?1:0},a=sample(air),b=sample(null,false,{action:{kind:'jump',phase:elapsedMs/520,durationMs:520}});assert.deepEqual(a.frame.positionsNormals,b.frame.positionsNormals);assert.deepEqual(a.frame.leftSocket,b.frame.leftSocket);assert.deepEqual(a.frame.rightSocket,b.frame.rightSocket);}
  const g=press(),air=descriptor(g,1200);for(const bad of[{...air,v:2},{...air,rise:NaN},{...air,remainingMs:-1}]){const a=sample(bad),b=sample(null,false,{liftZ:air.lift,action:{kind:'jump',phase:air.elapsedMs/air.durationMs,durationMs:air.durationMs}});assert.deepEqual(a.frame.positionsNormals,b.frame.positionsNormals);}
  for(const kind of['hit','cast','death','dodge']){const action={kind,profile:kind==='cast'?'focus-forward':'melee',phase:.4,durationMs:360},a=sample(air,false,{action:{...action,jumpAir:air}}),b=sample(air,false,{action});assert.deepEqual(a.frame.positionsNormals,b.frame.positionsNormals);}
});
test('jump pose uses fixed physical rise/fall and hang clocks and never applies a second world lift',()=>{
  const a=press(),b=press(2);for(const elapsed of[60,120,200]){const x=sample(descriptor(a,1000+elapsed)),y=sample(descriptor(b,1000+elapsed));for(const n of[1,29,30,31,32,36])assert.deepEqual(x.state.pose.slice(n*10,n*10+10),y.state.pose.slice(n*10,n*10+10));}
  const g=press(2),air=descriptor(g,1300),x=sample(air),y=sample({...air,lift:air.lift+.2},false,{liftZ:air.lift});assert.deepEqual(x.frame.positionsNormals,y.frame.positionsNormals,'descriptor lift is not a second transform');const lifted=sample(air,false,{liftZ:air.lift+.2});for(let i=0;i<x.frame.positionsNormals.length;i+=6){assert.ok(Math.abs(lifted.frame.positionsNormals[i+2]-x.frame.positionsNormals[i+2]-.2)<1e-6);assert.equal(lifted.frame.positionsNormals[i],x.frame.positionsNormals[i]);}
  const before=[g.jumpStart,g.jumpUntil,g.jumpDur,g.player.x,g.player.y,g.player.hp];sample(air);assert.deepEqual([g.jumpStart,g.jumpUntil,g.jumpDur,g.player.x,g.player.y,g.player.hp],before);
});
test('same actual air phase survives pause, JSON reload and shared frame-rate sampling without pose history',()=>{
  const g=press(2);g.setPaused(true,1180);const air=descriptor(g,1180),saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(99999)))),back=new Game(saved,200000);assert.deepEqual(descriptor(back,200000),air);for(const reduced of[false,true])assert.deepEqual(sample(air,reduced).frame.positionsNormals,sample(descriptor(back,999999),reduced).frame.positionsNormals);
  const state=createHeroPoseState(asset);for(let frame=0;frame<31;frame++){const elapsed=frame/60*520,air={v:1,elapsedMs:elapsed,remainingMs:520-elapsed,durationMs:520,lift:.3,rise:Math.min(1,elapsed/260),fall:Math.max(0,1-(520-elapsed)/260)},a=sample(air,false,{},state),b=sample(air);assert.deepEqual(a.frame.positionsNormals,b.frame.positionsNormals);}
});
