import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero } from '../src/close-view-hero.ts';
import { CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES } from '../src/close-view-player-forms.ts';
import { HERO_EQUIPMENT_MAX_TRIANGLES,MODEL_FLOATS,MODEL_MAX_VERTICES,modelTriangleCount,writeCloseViewHeroEquipment,writeCloseViewModel } from '../src/close-view-models.ts';
import { HERO_FRAGMENT_BODY } from '../src/close-view-hero-gl.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url)));
const raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const base={nowMs:100000,reducedMotion:false,x:3,y:4,groundZ:.2,liftZ:0,yaw:.4,height:1.68*.82,speed:0,gaitPhase:0,action:null,heldProfile:'emitter',alpha:.8,tint:[.72,1,.65],hitFlash:.25};

function sampled(extra={}){const state=createHeroPoseState(asset),frame=createHeroFrame(asset);assert.equal(sampleCloseViewHero(asset,state,{...base,...extra},frame),true);return{state,frame};}

test('powered armor uses the untouched adult body and resets every reusable-frame flag',()=>{
  const state=createHeroPoseState(asset),frame=createHeroFrame(asset);
  assert.equal(frame.suitPositionsNormals.length,124*3*6);assert.equal(frame.powerSuit,false);assert.equal(frame.suitVertexCount,0);
  assert.equal(sampleCloseViewHero(asset,state,{...base,powerSuit:false},frame),true);const body=Float32Array.from(frame.positionsNormals);
  assert.equal(sampleCloseViewHero(asset,state,{...base,powerSuit:true},frame),true);assert.deepEqual(frame.positionsNormals,body,'armor cannot modify the 3170-triangle source body');assert.equal(frame.powerSuit,true);assert.equal(frame.suitVertexCount,372);assert.ok(frame.suitPositionsNormals.every(Number.isFinite));
  assert.equal(sampleCloseViewHero(asset,state,{...base,powerSuit:false},frame),true);assert.equal(frame.powerSuit,false);assert.equal(frame.suitVertexCount,0,'normal/context restore cannot leak suit state');assert.deepEqual(frame.positionsNormals,body);
});

test('all accepted body phases keep the fitted armor skinned and bounded',()=>{
  const cases=[
    ['idle',{}],['walk',{speed:1.2,gaitPhase:1.1}],
    ['attack',{action:{kind:'melee',profile:'melee',phase:.25,durationMs:240}}],
    ['cast',{action:{kind:'cast',profile:'fan-release',phase:.5,durationMs:360}}],
    ['legacy-cast',{action:{kind:'cast',profile:'cast',phase:.5,durationMs:360}}],
    ['orrery-cast',{action:{kind:'cast',profile:'orrery-release',phase:.5,durationMs:240}}],
    ['hammerfall',{action:{kind:'melee',profile:'hammer',phase:.5,durationMs:570}}],
    ['hit',{action:{kind:'hit',profile:'hit',phase:.35,durationMs:200}}],
    ['dodge',{action:{kind:'dodge',profile:'dodge',phase:.45,durationMs:260,yaw:.4,moveX:1,moveY:0,poseMs:100000}}],
    ['boost',{liftZ:.22}],['knockdown',{action:{kind:'hit',profile:'knockdown',phase:.7,durationMs:1000}}],
  ];
  let idle;
  for(const [name,extra] of cases){const {frame}=sampled({powerSuit:true,...extra});assert.equal(frame.suitVertexCount,372,name);const a=frame.suitPositionsNormals;for(let i=0;i<a.length;i+=6){assert.ok(Number.isFinite(a[i])&&Number.isFinite(a[i+1])&&Number.isFinite(a[i+2]),name);assert.ok(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,name);}if(name==='idle')idle=Float32Array.from(a);else assert.notDeepEqual(a,idle,name+' follows the rig/world transform');}
});

test('armor and held gear share one atomic bounded equipment reservation',()=>{
  assert.equal(CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES,124);assert.equal(HERO_EQUIPMENT_MAX_TRIANGLES,220);
  const {frame}=sampled({powerSuit:true}),gear={profile:'emitter',rightSocket:frame.rightSocket,alpha:.8,tint:base.tint,hitFlash:.25};
  const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewHeroEquipment(out,0,gear,frame);assert.equal(end/MODEL_FLOATS/3,150);assert.ok(end/30<=220);assert.ok(out.slice(0,end).every(Number.isFinite));for(let i=9;i<124*3*MODEL_FLOATS;i+=MODEL_FLOATS)assert.ok(Math.abs(out[i]-.8)<1e-6,'armor alpha composes');const plain=new Float32Array(out.length),plainEnd=writeCloseViewHeroEquipment(plain,0,{...gear,tint:[1,1,1],hitFlash:0},frame);assert.equal(plainEnd,end);assert.notDeepEqual(Array.from(out.slice(6,124*3*MODEL_FLOATS)).filter((_,i)=>i%MODEL_FLOATS<3),Array.from(plain.slice(6,124*3*MODEL_FLOATS)).filter((_,i)=>i%MODEL_FLOATS<3),'real poison tint and hit flash compose on armor color');
  const short=new Float32Array(end-1);assert.equal(writeCloseViewHeroEquipment(short,0,gear,frame),0,'preflight is atomic');assert.ok(short.every(v=>v===0));
});

test('integrated bilateral fists and named tools preserve the fixed armor equipment budget atomically',()=>{
  const {frame}=sampled({powerSuit:true});
  for(const profile of ['fist','fistCharge','rift-bombard','great-sweep','blunderbuss','lumen-spindle','cinder-pike','verge-cleaver']){
    const gear={profile,rightSocket:frame.rightSocket,leftSocket:frame.leftSocket,alpha:1,tint:[1,1,1]},out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);
    const end=writeCloseViewHeroEquipment(out,0,gear,frame);assert.ok(end>124*3*MODEL_FLOATS,profile+' retains armor and gear');assert.ok(end/30<=220,profile+' keeps the existing budget');assert.ok(out.slice(0,end).every(Number.isFinite));
    const short=new Float32Array(end-1);assert.equal(writeCloseViewHeroEquipment(short,0,gear,frame),0,profile+' rejects one-float-short storage');assert.ok(short.every(v=>v===0),profile+' preflight cannot partly write armor');
  }
});

test('unknown cast recipes remain neutral on the powered suit while approved spell and stomp layers deform armor',()=>{
  const neutral=sampled({powerSuit:true,reducedMotion:true}).frame;
  for(const profile of ['mirage','future-spell']){
    const frame=sampled({powerSuit:true,reducedMotion:true,action:{kind:'cast',profile,phase:.5,durationMs:360}}).frame;
    assert.deepEqual(frame.positionsNormals,neutral.positionsNormals);assert.deepEqual(frame.suitPositionsNormals,neutral.suitPositionsNormals);
  }
  for(const action of [{kind:'cast',profile:'fan-release',phase:.5,durationMs:360},{kind:'melee',profile:'hammer',phase:.5,durationMs:570}]){
    const armored=sampled({powerSuit:true,action}).frame,normal=sampled({powerSuit:false,action}).frame;
    assert.deepEqual(armored.positionsNormals,normal.positionsNormals,'armor cannot change the integrated action body');assert.notDeepEqual(armored.suitPositionsNormals,neutral.suitPositionsNormals);assert.equal(armored.suitVertexCount,372);
  }
});

test('powered palette leaves source mask, hair and amber lenses ahead of its under-suit branch',()=>{
  const lens=HERO_FRAGMENT_BODY.indexOf('if (v_class==4)'),source=HERO_FRAGMENT_BODY.indexOf('if (v_layer==1 || v_class==0)'),suit=HERO_FRAGMENT_BODY.indexOf('if (u_powerSuit>.5)');assert.ok(lens>=0&&source>lens&&suit>source);assert.ok(HERO_FRAGMENT_BODY.includes(')).rgb)*u_tint'));assert.match(HERO_FRAGMENT_BODY,/mix\(c,vec3\(\.96,\.34,\.23\)/);
});

test('native readiness fallback is adult-height, continuous and remains legacy-gear compatible',()=>{
  assert.ok(modelTriangleCount('playerPowerSuit')<=230);assert.ok(modelTriangleCount('playerPowerSuit:emitter')<=256);
  const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,{kind:'playerPowerSuit',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,reduceMotion:true});let lo=Infinity,hi=-Infinity;for(let i=2;i<end;i+=MODEL_FLOATS){lo=Math.min(lo,out[i]);hi=Math.max(hi,out[i]);}assert.ok(lo<=.001);assert.ok(hi>=1.67*.82&&hi<=1.72*.82,`${lo}/${hi}`);
});

test('powered equipment failure contract keeps preflight atomic and guards cues before renderer admission',()=>{
  const source=fs.readFileSync(new URL('../src/close-view.ts',import.meta.url),'utf8');
  const write=source.indexOf('const equipped = writeCloseViewHeroEquipment'),fail=source.indexOf('if (state.heroFrame.powerSuit && equipped === offset) return;',write),right=source.indexOf('const right=state.heroFrame[cleaverHandRoles(held,primaryStage).grip]',fail),record=source.indexOf('recordHeroPresentation(player',right),admit=source.indexOf('state.hero = state.heroFrame; count++; imported = true;',record);
  assert.ok(write>=0&&write<fail&&fail<right&&right<record&&record<admit,'atomic armor reservation failure precedes both final-socket cue families and imported admission');
  const {frame}=sampled({powerSuit:true}),gear={profile:'great-sweep',rightSocket:frame.rightSocket,leftSocket:frame.leftSocket,alpha:1,tint:[1,1,1]},full=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewHeroEquipment(full,0,gear,frame),short=new Float32Array(end-1);
  assert.ok(end>0);assert.equal(writeCloseViewHeroEquipment(short,0,gear,frame),0);assert.ok(short.every(v=>v===0),'failed actual powered equipment preflight writes neither armor nor gear');
});
