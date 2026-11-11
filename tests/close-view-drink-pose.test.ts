import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sampleDrinkPose } from '../src/close-view-player-presentation.ts';
import { decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero } from '../src/close-view-hero.ts';
import { writeCloseViewModel,writeCloseViewHeroEquipment,MODEL_FLOATS,MODEL_MAX_VERTICES,HERO_DRINK_VIAL_TRIANGLES,HERO_EQUIPMENT_MAX_TRIANGLES } from '../src/close-view-models.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const file=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
const hero=(phase)=>{const out=createHeroFrame(asset),input={nowMs:12345,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:.7,gaitPhase:1.2,heldProfile:'melee',handProfile:'melee',action:phase==null?null:{kind:'drink',profile:'restorativeDraught',phase,durationMs:360},alpha:1,tint:[1,1,1],hitFlash:0};assert.ok(sampleCloseViewHero(asset,createHeroPoseState(asset),input,out));return out;};
const maxDelta=(a,b)=>a.reduce((m,v,i)=>Math.max(m,Math.abs(v-b[i])),0);

test('drink lift has exact neutral endpoints and a readable sip hold',()=>{
  const out={};
  assert.deepEqual(sampleDrinkPose(0,false,out),{weight:0,sip:0,arm:0,head:0});
  assert.equal(sampleDrinkPose(.5,false,out).weight,1);
  assert.ok(out.sip>.9);assert.equal(out.arm,1);
  assert.deepEqual(sampleDrinkPose(1,false,out),{weight:0,sip:0,arm:0,head:0});
});

test('reduced motion preserves timing and silhouette while bounding travel',()=>{
  const full={},reduced={};sampleDrinkPose(.5,false,full);sampleDrinkPose(.5,true,reduced);
  assert.equal(reduced.weight,full.weight);assert.equal(reduced.sip,full.sip);
  assert.ok(reduced.arm>0&&reduced.arm<full.arm);assert.ok(reduced.head>0&&reduced.head<full.head);
});

test('actual imported sockets and native vertices enter and leave continuously',()=>{
  const idle=hero(null),start=hero(0),near=hero(1e-6),mid=hero(.5),end=hero(1);
  assert.deepEqual(start.leftSocket,idle.leftSocket);assert.deepEqual(start.rightSocket,idle.rightSocket);assert.deepEqual(end.positionsNormals,idle.positionsNormals);
  assert.ok(maxDelta(near.leftSocket,idle.leftSocket)<1e-4);assert.ok(maxDelta(near.rightSocket,idle.rightSocket)<1e-4);
  assert.ok(mid.leftSocket[14]>idle.leftSocket[14]+.18,`free hand rises toward the face (${idle.leftSocket[14]} -> ${mid.leftSocket[14]})`);
  const native=(pose,amount)=>{const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),actor={kind:'player',x:0,y:0,z:0,yaw:0,phase:1.2,pace:.7,pose,amount,alpha:1};const n=writeCloseViewModel(out,0,actor);return out.slice(0,n);};
  const nIdle=native('walk',0),nStart=native('drink',0),nNear=native('drink',1e-6),nEnd=native('drink',1);
  assert.equal(maxDelta(nStart,nIdle),0);assert.equal(maxDelta(nEnd,nIdle),0);assert.ok(maxDelta(nNear,nIdle)<1e-4);
});

test('imported vial shares the bounded equipment stream and omits atomically when storage is short',()=>{
  assert.equal(HERO_DRINK_VIAL_TRIANGLES,24);assert.equal(HERO_EQUIPMENT_MAX_TRIANGLES,220);
  const frame=hero(.5),baseGear={profile:'melee',leftSocket:frame.leftSocket,rightSocket:frame.rightSocket,alpha:.8,tint:[1,1,1],hitFlash:0};
  const base=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),baseEnd=writeCloseViewHeroEquipment(base,0,baseGear,frame);
  const gear={...baseGear,drinkVial:true,vialWeight:1,vialSocket:frame.leftSocket},full=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);full.fill(7);
  const end=writeCloseViewHeroEquipment(full,0,gear,frame);assert.equal((end-baseEnd)/MODEL_FLOATS/3,HERO_DRINK_VIAL_TRIANGLES);assert.ok(end/MODEL_FLOATS/3<=HERO_EQUIPMENT_MAX_TRIANGLES);
  let near=Infinity;for(let i=baseEnd;i<end;i+=MODEL_FLOATS){near=Math.min(near,Math.hypot(full[i]-frame.leftSocket[12],full[i+1]-frame.leftSocket[13],full[i+2]-frame.leftSocket[14]));assert.ok(Math.abs(full[i+9]-.8)<1e-6);}assert.ok(near<.08,'vial remains visibly held at the resolved free hand');
  const short=new Float32Array(end-1);short.fill(7);const fallback=writeCloseViewHeroEquipment(short,0,gear,frame);assert.equal(fallback,baseEnd,'gear survives when only the optional vial lacks capacity');assert.deepEqual(short.slice(0,baseEnd),base.slice(0,baseEnd));assert.ok(short.slice(baseEnd).every(v=>v===7),'omitted vial leaves the remaining buffer untouched');
});
