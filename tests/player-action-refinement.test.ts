import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {CLOSE_VIEW_MELEE_TIMING} from '../src/action-motion.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),raw=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
// 2026-11-13: the fist entries (5-7, 12-14) are the training chain's contact poses; the Cleaver entries are unchanged.
const contactHashes=["159c6d4405db1f339ea742dc4b3719b86d336db56288a5c0739c824f513b5520","8fa959bde12cadd0cb50c1f42e412816edcf3668460fa7b01344041d755433d7","c943b2df5be2f8e12db208c0cb2bfe7d9a734ccd1710d6ba58a64355d7531b65","f81a02670f3b7f36be93b3b946dcaa4534d450d22c5b73e0d8fb4b5dea653d87","c4d57a80efce5658b6ee0dd9d2014c1ac68ce57cccba9c5ddd1c885e4816eefd","aa7fb998e72da9ed1f25dfe141ba7c825574acdfbf71fbc1da319250acd4603b","feab754c568a670399b43ae16eaf09ed5a0985999d0fc49d458de18351031702","7726e2996f6dae048e628e7873e2ed2f61013f75b5a19fc935d19f5e9a55d04b","38074c623fc3700577ebd15e6d1d0259e702ce060d43612291d8c87246962796","50f6a37e9ab19834a155a2fc6c6c2a1092300c0faf72b5d73fe6a15e97c27708","9c3b91cac9a90d7b6475aacab47824433a35bfa69fd364f31d2eb1e562981d92","0226b058882a0268932376288c62af4d8b6c4877816bd0194fd2711da67bc82b","396d22fcd9dda38131430b3f707050ae0a1213ddbe5065d9ee9061ba0bb45efd","d443922a228d383ecfc01201cf64301494b2e46561f306ea1f8cc20429f63c97"];
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
