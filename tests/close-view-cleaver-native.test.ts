import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_FLOATS, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';

const keys=['side','up','forward','yaw','pitch','twist','lean'];
const frame=(q:number[])=>Object.fromEntries(keys.map((k,i)=>[k,q[i]]));
const carry=[.10,-.79,.10,.20,-.70,0,0];
const ends=[[-.67,-.04,.46,-.85,.10,-.20,.06],[.81,-.04,.43,.86,.07,.24,.08],[-.55,-.68,.42,-.82,-.09,-.22,.12],[.57,-.68,.34,.92,-.08,.22,.07]];
function mesh(cleaverFrame?:any){
  const out=new Float32Array(10000),end=writeCloseViewModel(out,0,{kind:'playerVergeCleaver',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,reduceMotion:true,cleaverFrame});
  assert.equal(end,modelTriangleCount('playerVergeCleaver')*3*MODEL_FLOATS);return out.slice(0,end);
}
function weaponWitness(q:number[]){
  const out=mesh(frame(q)),start=modelTriangleCount('playerUnarmed')*3*MODEL_FLOATS,points=[] as number[][];
  for(let i=start;i<out.length;i+=MODEL_FLOATS){points.push([out[i],out[i+1],out[i+2]]);assert.ok(Math.abs(Math.hypot(out[i+3],out[i+4],out[i+5])-1)<1e-5);}
  const handle=points.slice(0,36);
  const center=handle.reduce((a,p)=>a.map((v,i)=>v+p[i]),[0,0,0]).map(v=>v/handle.length);
  const distance=p=>Math.hypot(...p.map((v,i)=>v-center[i]));
  const tip=points.slice(-6).reduce((a,p)=>distance(p)>distance(a)?p:a);
  return {center,tip};
}

test('shared right-handed frames keep the native Cleaver inside its existing mesh budget',()=>{
  assert.equal(modelTriangleCount('playerVergeCleaver'),254);
  for(const q of [carry,...ends])assert.ok(mesh(frame(q)).every(Number.isFinite));
});

test('native blade witnesses rise, cross level, fall, and cross level low with anatomical-left signs',()=>{
  const [c,a,b,d,e]=[carry,...ends].map(weaponWitness);
  assert.ok(a.tip[2]>c.tip[2]+.35,'first cut rises');
  assert.ok(Math.abs(b.tip[2]-a.tip[2])<.05,'second cut stays shoulder-level');
  assert.ok(d.tip[2]<b.tip[2]-.20,'third cut falls');
  assert.ok(Math.abs(e.tip[2]-d.tip[2])<.05,'fourth cut stays level low');
  assert.ok(c.center[1]<-.15,'native carry uses the same anatomical left as the imported rig');
  assert.ok(b.center[1]<a.center[1]-.35&&e.center[1]<d.center[1]-.20,'native and imported use the same lateral signs');
  assert.ok(Math.abs(b.tip[2]-b.center[2])<.14&&b.tip[0]>b.center[0]+.25,'the shoulder cut carries the blade forward near level');
});

test('missing or malformed shared frame retains the old native fallback byte-for-byte',()=>{
  const old=mesh(),bad=mesh({...frame(carry),yaw:NaN});assert.deepEqual(bad,old);
});
