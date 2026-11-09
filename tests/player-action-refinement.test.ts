import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {CLOSE_VIEW_MELEE_TIMING} from '../src/action-motion.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const contactHashes=["1031c144d7cb96dd17aedf0c7b81d70f6eb1ab521b1d4eaa815019e53b68eac2","55089eb9f8066ac6bc826639aa5a5631b7efb5d3b9feeb5e5c2a619052734b1d","7bb2914c8d96184ff4b2e901ed9c9975a10ea8774a3a92a0e9351b58794c7896","6bc02eea00838544085a4a99bc2bb00c28500987c74b88ce4cc4689d48a9cccf","be2c00066f627d3d517eac9818294b319051c3b5e2686902cd95d621f9ec4fee","368f056fcc007937260609cfd65117a97c806987fb40299cba6b4e559eea96cc","674bf0969897f58dae5d643e70cda4f89718fdba2f6765f429a46b446ca814ec","a182b38baf70e51f01096610e0bdb742dd803d08056ecf008613085574b1aec1","b8716ffbdb9fefc0480582673291f704f13a0a7795bffd13a2918b4bc3702cf2","471c1f0beb6c99969705aa243d6ffaba29d18eccaf6e50023e01161e753ee644","2b581ffd4579605166eaf354a32d2c0f94915e3adce4a0ed01c834a70b657324","d96aa27e9aa562c2b87c7e95fd21d7695cecbc6486488c41a5b10dc77d46e748","0d68a2b8c1aca4c96d8e6cdcd7674cd73280a883176a2a35cc9ca416c299ba7e","7d32dc6d5751d6bd8fbf95f266f7195d7ffeecd525dc6e36276b51be61a2c974"];
function action(i,phase){const move=i<=4?'cleaver':['dash','jab','uppercut'][i-5],timing=CLOSE_VIEW_MELEE_TIMING[move];return {kind:'melee',profile:i<=4?'verge-cleaver':'fist',phase,durationMs:timing.durationMs,poseMs:2000,primaryMotion:i<=4?{v:2,step:i}:undefined,fistStep:i-4,fistLead:'right',meleeAction:{v:1,kind:i<=4?'verge-cleaver':'iron-fists',move,...timing}};}
function sample(i,phase,reducedMotion=false,state=createHeroPoseState(asset)){const frame=createHeroFrame(asset);assert.ok(sampleCloseViewHero(asset,state,{nowMs:2000,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.1,heldProfile:i<=4?'verge-cleaver':null,action:action(i,phase),alpha:1,tint:[1,1,1],hitFlash:0},frame));return {state,frame};}
function digest(frame){const hash=crypto.createHash('sha256');for(const a of [frame.positionsNormals,frame.leftSocket,frame.rightSocket])hash.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));return hash.digest('hex');}
function delta(a,b){let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));return max;}

test('seven strikes preserve the exact r847 contact body and both grip sockets in full and reduced motion',()=>{
  let k=0;for(const reduced of [false,true])for(let i=1;i<=7;i++){const a=action(i,0),c=a.meleeAction.contactMs/a.durationMs;assert.equal(digest(sample(i,c,reduced).frame),contactHashes[k++]);}
});
test('counter-load and settling remain continuous at carry, contact and recovery boundaries',()=>{
  for(const reduced of [false,true])for(let i=1;i<=7;i++){const a=action(i,0),c=a.meleeAction.contactMs/a.durationMs;for(const phase of [0,c,1]){const at=sample(i,phase,reduced).frame;for(const side of [-1,1]){const q=Math.max(0,Math.min(1,phase+side*1e-6)),near=sample(i,q,reduced).frame;assert.ok(delta(at.positionsNormals,near.positionsNormals)<1e-4,`${i}/${phase}/${reduced} body continuous`);assert.ok(delta(at.leftSocket,near.leftSocket)<1e-4);assert.ok(delta(at.rightSocket,near.rightSocket)<1e-4);}}}
});
test('accepted poses are deterministic at shared 30/60fps phases and preserve fixed mesh budgets',()=>{
  for(const reduced of [false,true])for(let i=1;i<=7;i++){const a=action(i,0),state=createHeroPoseState(asset);for(let frame60=0;frame60<=60;frame60++){const phase=frame60/60,at60=sample(i,phase,reduced,state).frame;if(frame60%2===0){const at30=sample(i,(frame60/2)/30,reduced).frame;assert.equal(digest(at60),digest(at30));}assert.equal(at60.vertexCount,asset.vertexCount);assert.equal(at60.indexCount,asset.indexCount);assert.equal(at60.positionsNormals.length,asset.vertexCount*6);assert.ok(at60.positionsNormals.every(Number.isFinite));}}
});
