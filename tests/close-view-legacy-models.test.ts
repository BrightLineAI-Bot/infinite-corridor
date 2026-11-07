import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, modelSupportsAttachments, writeCloseViewModel } from '../src/close-view-models.ts';

const triangles={ashling:160,rootBrute:204,pallidCrawler:178,hollowMarshal:224,ashenHound:224,coilStalker:176};
const actor=(kind,extra={})=>({kind,x:0,y:0,z:0,yaw:0,phase:.7,pace:0,pose:'idle',amount:0,...extra});
function written(kind,extra={}){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,actor(kind,extra));return out.slice(0,end);}
function bounds(data){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=MODEL_FLOATS)for(let q=0;q<3;q++){lo[q]=Math.min(lo[q],data[i+q]);hi[q]=Math.max(hi[q],data[i+q]);}return{lo,hi,span:hi.map((v,i)=>v-lo[i])};}

test('the six legacy native bodies use bounded finite rounded meshes with the drone reserve',()=>{
  for(const [kind,count] of Object.entries(triangles)){assert.equal(modelTriangleCount(kind),count);assert.ok(count<=232);assert.equal(modelSupportsAttachments(kind,3),true);const data=written(kind);assert.equal(data.length/MODEL_FLOATS/3,count);for(let i=0;i<data.length;i+=MODEL_FLOATS){for(let q=0;q<MODEL_FLOATS;q++)assert.ok(Number.isFinite(data[i+q]),`${kind} finite`);assert.ok(Math.abs(Math.hypot(data[i+3],data[i+4],data[i+5])-1)<1e-5,`${kind} normal`);}}
});

test('legacy silhouette landmarks and established joints survive the rounded-body refinement',()=>{
  const b=Object.fromEntries(Object.keys(triangles).map(k=>[k,bounds(written(k))]));
  assert.ok(b.ashling.hi[2]>1.25&&b.ashling.span[1]>.6,'compact crowned ashling');
  assert.ok(b.rootBrute.hi[2]>1.7&&b.rootBrute.span[1]>1.1,'broad knotted brute');
  assert.ok(b.pallidCrawler.hi[2]<.75&&b.pallidCrawler.span[0]>1.1,'low long crawler');
  assert.ok(b.hollowMarshal.hi[2]>2.1&&b.hollowMarshal.span[2]>2,'tall crested marshal');
  assert.ok(b.ashenHound.span[0]>1.25&&b.ashenHound.hi[2]<.9,'low canine');
  assert.ok(b.coilStalker.span[0]>1&&b.coilStalker.hi[2]<1,'raised head and trailing coils');
  for(const kind of Object.keys(triangles)){const idle=written(kind),move=written(kind,{pace:1,phase:2.1}),wind=written(kind,{pose:'windup',amount:.8}),strike=written(kind,{pose:'attack',amount:.3});assert.notDeepEqual([...move],[...idle],`${kind} move`);assert.notDeepEqual([...wind],[...idle],`${kind} windup`);assert.notDeepEqual([...strike],[...wind],`${kind} strike`);}
});

test('legacy bodies retain alpha, scale and three world-space attachments',()=>{
  const attachments=[{x:4,y:5,z:6},{x:5,y:5,z:6},{x:6,y:5,z:6}];
  for(const [kind,count] of Object.entries(triangles)){const data=written(kind,{alpha:.35,scale:1.2,attachments});assert.equal(data.length/MODEL_FLOATS/3,count+24);for(let i=0;i<data.length;i+=MODEL_FLOATS)assert.ok(Math.abs(data[i+9]-.35)<1e-6);}
});
