import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {CLOSE_VIEW_MELEE_TIMING} from '../src/action-motion.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
// 2026-11-13: the fist entries (5-7, 12-14) are the training chain's contact poses; the Cleaver entries are unchanged.
// 2026-11-26 (HERO_STAND, the standing stance under the strikes' layers): re-taken; with the stance's share set to zero the
// previous hashes are reproduced byte for byte.
const contactHashes=["999f67fd39edd217c5d24372e78af296a64b371809034984c4b686364d54aac3","9ee79fe9454a107759880b73adb1ae00b240f11b551afbd5fa509cf5f85ee9a6","bd8f0d0bc604c82ffdfc4d714e1f9cf2671d7ef31bff58def713771f37cf0599","b4af2803bf9d9123b002d4129c9c2b2c3718d88539055798f16290f92a6b3995","0ccec4693825e7cbb54ca5867396a5b84a566a0effab8745a60ed6f0fb6e0345","73b6b6c3737d7b374564975f29d6b609644a1470a20e99e62188a20741111cb3","d8e6707091a12dcf59fd886e76cd2ff0d9bcac6e51cb90f64dcf7ad2f2e67503","2792ec85d6f0c7eb3d8961307cb63c06efcdcd0d677f65cca81f3d76ad835d4e","eaeecd72507d32e4d305b9dda13c471ad6f5f2ceebce06814b22cec3d773b4d9","79e6b6fbccf2f81644a2510bec82cf8b85f095f40ee678c8f527f6e3a9cf1075","138fe48ebee55324ffdbd719303f8c3cc02418ae8b318b8b6d308c909b0ac6dd","8bcf4318c13b5b68fa8cd3f8f6a5ccbfd05038f18786fc694e3d9360b08d3bc1","926f15a4050be15f78929d11590bc3d0c821d14878a58914019e6be2555b515d","bbf327e75aff43de1da381097027d90120c519af15c7b7c4b0d10e89a4ef8e0c"];
function action(i,phase){const move=i<=4?'cleaver':['dash','jab','uppercut'][i-5],timing=CLOSE_VIEW_MELEE_TIMING[move];return {kind:'melee',profile:i<=4?'verge-cleaver':'fist',phase,durationMs:timing.durationMs,poseMs:2000,primaryMotion:i<=4?{v:2,step:i}:undefined,fistStep:i-4,fistLead:'right',meleeAction:{v:1,kind:i<=4?'verge-cleaver':'iron-fists',move,...timing}};}
function sample(i,phase,reducedMotion=false,state=createHeroPoseState(asset)){const frame=createHeroFrame(asset);assert.ok(sampleCloseViewHero(asset,state,{nowMs:2000,reducedMotion,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.1,heldProfile:i<=4?'verge-cleaver':null,action:action(i,phase),alpha:1,tint:[1,1,1],hitFlash:0},frame));return {state,frame};}
function digest(frame){const hash=crypto.createHash('sha256');for(const a of [frame.positionsNormals,frame.leftSocket,frame.rightSocket])hash.update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));return hash.digest('hex');}
function delta(a,b){let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));return max;}

test('seven strikes preserve the exact left-hand Cleaver and r847 fist contact body and both grip sockets in full and reduced motion',()=>{
  let k=0;for(const reduced of [false,true])for(let i=1;i<=7;i++){const a=action(i,0),c=a.meleeAction.contactMs/a.durationMs;assert.equal(digest(sample(i,c,reduced).frame),contactHashes[k++]);}
});
test('counter-load and settling remain continuous at carry, contact and recovery boundaries',()=>{
  for(const reduced of [false,true])for(let i=1;i<=7;i++){const a=action(i,0),c=a.meleeAction.contactMs/a.durationMs;for(const phase of [0,c,1]){const at=sample(i,phase,reduced).frame;for(const side of [-1,1]){const q=Math.max(0,Math.min(1,phase+side*1e-6)),near=sample(i,q,reduced).frame;assert.ok(delta(at.positionsNormals,near.positionsNormals)<1e-4,`${i}/${phase}/${reduced} body continuous`);assert.ok(delta(at.leftSocket,near.leftSocket)<1e-4);assert.ok(delta(at.rightSocket,near.rightSocket)<1e-4);}}}
});
test('accepted poses are deterministic at shared 30/60fps phases and preserve fixed mesh budgets',()=>{
  for(const reduced of [false,true])for(let i=1;i<=7;i++){const a=action(i,0),state=createHeroPoseState(asset);for(let frame60=0;frame60<=60;frame60++){const phase=frame60/60,at60=sample(i,phase,reduced,state).frame;if(frame60%2===0){const at30=sample(i,(frame60/2)/30,reduced).frame;assert.equal(digest(at60),digest(at30));}assert.equal(at60.vertexCount,asset.vertexCount);assert.equal(at60.indexCount,asset.indexCount);assert.equal(at60.positionsNormals.length,asset.vertexCount*6);assert.ok(at60.positionsNormals.every(Number.isFinite));}}
});
