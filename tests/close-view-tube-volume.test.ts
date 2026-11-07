import test from 'node:test';
import assert from 'node:assert/strict';
import { curvedTube, part, MESH_FLOATS } from '../src/close-view-mesh.ts';
import { CLOSE_VIEW_ARCOLOGY_MODELS } from '../src/close-view-arcology-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';

const near=(a,b,e=1e-7)=>Math.abs(a-b)<e;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const span=(points,axis)=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
function actor(kind){return{kind,x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,reduceMotion:true};}
function writtenPart(kind,start,count){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,actor(kind)),points=[];assert.ok(end>0);for(let i=start*3*MODEL_FLOATS;i<(start+count)*3*MODEL_FLOATS;i+=MODEL_FLOATS)points.push([out[i],out[i+1],out[i+2]]);return points;}
function restPoints(item){const points=[];for(let i=0;i<item.mesh.length;i+=MESH_FLOATS)points.push([item.mesh[i]+item.px,item.mesh[i+1],item.mesh[i+2]+item.pz]);return points;}

test('straight +X tubes preserve the established Y/Z ring orientation exactly',()=>{
  const shape=curvedTube([[0,0,0,.2],[1,0,0,.1]],4),angles=[.5,1.5,2.5,3.5].map(q=>q*Math.PI/2);
  for(let i=0;i<4;i++){
    const p=shape[i*2][0];
    assert.ok(near(p[0],0)&&near(p[1],Math.cos(angles[i])*.2)&&near(p[2],Math.sin(angles[i])*.2));
  }
  assert.equal(shape.length,8,'triangle count unchanged');
});

test('vertical and oblique rings are perpendicular volumes with stable outward winding',()=>{
  for(const points of [
    [[0,0,0,.2],[0,0,.5,.18],[0,0,1,.12]],
    [[0,0,0,.18],[.3,.2,.4,.16],[.55,.45,.75,.1]],
  ]){
    const sides=8,shape=curvedTube(points,sides);
    for(let r=0;r<points.length;r++){
      const center=points[r],prev=points[Math.max(0,r-1)],next=points[Math.min(points.length-1,r+1)],t=sub(next,prev),length=Math.hypot(...t),tangent=t.map(v=>v/length);
      const candidates=shape.flat().filter(p=>near(Math.hypot(...sub(p,center)),center[3],1e-6));
      const unique=[...new Map(candidates.map(p=>[p.map(v=>v.toFixed(8)).join('/'),p])).values()];
      assert.equal(unique.length,sides);
      for(const p of unique)assert.ok(Math.abs(dot(sub(p,center),tangent))<1e-6,'ring lies normal to path');
      assert.ok(span(unique,0)>.12&&span(unique,1)>.12,'ring has radial volume in world axes');
    }
    const baked=part(shape,0,0,0,1,1,1,0xffffff);
    for(let i=0;i<baked.mesh.length;i+=MESH_FLOATS){const n=[baked.mesh[i+3],baked.mesh[i+4],baked.mesh[i+5]];assert.ok(n.every(Number.isFinite));assert.ok(near(Math.hypot(...n),1,1e-5));}
  }
});

test('duplicate authored samples use valid neighbours without NaNs or zero normals',()=>{
  const shape=curvedTube([[0,0,0,.2],[0,0,0,.2],[0,0,.5,.15],[.1,0,.8,.08]],6),baked=part(shape,0,0,0,1,1,1,0xffffff);
  assert.equal(shape.length,24,'exact duplicate is collapsed without adding triangles');
  for(let i=0;i<baked.mesh.length;i+=MESH_FLOATS){assert.ok(Number.isFinite(baked.mesh[i]));assert.ok(Math.hypot(baked.mesh[i+3],baked.mesh[i+4],baked.mesh[i+5])>.999);}
});

test('actual roster legs and tendril own cross-section depth beyond their authored center paths',()=>{
  const actual=[
    ['Ashling lower leg',writtenPart('ashling',106,16),[0,-.133,.39],.075,.10],
    ['Root Brute lower leg',writtenPart('rootBrute',116,20),[-.045,-.209,.70],.11,.16],
    ['Ashen Hound foreleg',writtenPart('ashenHound',136,16),[.235,-.131,.43],.045,.06],
    ['Void Sentinel tendril',restPoints(CLOSE_VIEW_ARCOLOGY_MODELS.voidSentinel[3]),[Math.cos(-1.08)*.1-.04,Math.sin(-1.08)*.23,.66],.045,.05],
  ];
  for(const [name,points,center,radius,minDepth] of actual){
    const ring=[...new Map(points.filter(p=>near(Math.hypot(...sub(p,center)),radius,1e-5)).map(p=>[p.map(v=>v.toFixed(7)).join('/'),p])).values()];
    const depth=span(ring,0);assert.ok(depth>minDepth,`${name} independent ring X depth ${depth}`);
    assert.ok(span(points,1)>0&&span(points,2)>0,`${name} remains three-dimensional`);
  }
});
