import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const profiles=['focus-forward','fan-release','outward-ring','raised-orb','form-rise','compression','orbit-gather','time-ward','crossed-ward','body-ward','dusk-split','dusk-swap','rift-fold','fighting-stance','weapon-imbue','power-draw','flow-forward','acceleration','orbit-launch','traversal-brace'];
function sample(profile,phase,heldProfile,reducedMotion=false,state=createHeroPoseState(asset),frame=createHeroFrame(asset)){
 const modern=heldProfile==='verge-cleaver',input={nowMs:1000+phase*360,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.1,heldProfile,handProfile:modern?'verge-cleaver':'pike',primaryCarryStage:modern?{kind:'cleaver-four',step:1}:undefined,action:{kind:'cast',profile:profile||'future-unknown-gesture',phase,durationMs:360},alpha:1,tint:[1,1,1],hitFlash:0};
 assert.ok(sampleCloseViewHero(asset,state,input,frame));return{state,frame};
}
test('known free-hand follow-through preserves primary grip throughout both handed carries and motion settings',()=>{
 for(const held of['cinder-pike','verge-cleaver'])for(const reduced of[false,true]){
  const idle=sample(null,0,held,reduced),socket='rightSocket'; // both swords are held in the displayed left hand (source rightSocket)
  for(const profile of profiles)for(const phase of[0,.02,.08,.25,.5,.75,.95,1]){
   const a=sample(profile,phase,held,reduced);assert.deepEqual(a.frame[socket],idle.frame[socket],`${held}/${profile}/${phase} held socket`);
   assert.ok(a.frame.positionsNormals.every(Number.isFinite));assert.equal(a.frame.vertexCount,asset.vertexCount);assert.equal(a.frame.indexCount,asset.indexCount);
   if(phase===0||phase===1){assert.deepEqual(a.frame.positionsNormals,idle.frame.positionsNormals);assert.deepEqual(a.frame.leftSocket,idle.frame.leftSocket);assert.deepEqual(a.frame.rightSocket,idle.frame.rightSocket);}
  }
 }
});
test('gesture recovery is stateless, reuses frame and solver buffers and leaves future profiles neutral',()=>{
 const state=createHeroPoseState(asset),frame=createHeroFrame(asset),buffers=Object.entries(state).filter(([,v])=>ArrayBuffer.isView(v)),positions=frame.positionsNormals;
 for(const profile of profiles){sample(profile,.8,'verge-cleaver',true,state,frame);sample(profile,.25,'verge-cleaver',true,state,frame);assert.deepEqual(frame.positionsNormals,sample(profile,.25,'verge-cleaver',true).frame.positionsNormals);assert.strictEqual(frame.positionsNormals,positions);for(const[k,v]of buffers)assert.strictEqual(state[k],v);}
 for(const held of['cinder-pike','verge-cleaver'])for(const phase of[0,.3,.8,1])assert.deepEqual(sample('future-unknown-gesture',phase,held).frame.positionsNormals,sample(null,0,held).frame.positionsNormals);
});
test('known gestures articulate the free shoulder and neck without touching held-arm ancestors',()=>{
 for(const held of['cinder-pike','verge-cleaver']){const a=sample('focus-forward',.5,held),b=sample(null,0,held),shoulder=13;/* free source-left shoulder: both weapons are left-handed */assert.notDeepEqual(a.state.pose.slice(shoulder*10,shoulder*10+10),b.state.pose.slice(shoulder*10,shoulder*10+10));assert.notDeepEqual(a.state.pose.slice(40,50),b.state.pose.slice(40,50));for(const n of[24,27,28,33])assert.deepEqual(a.state.pose.slice(n*10,n*10+10),b.state.pose.slice(n*10,n*10+10));}
});
