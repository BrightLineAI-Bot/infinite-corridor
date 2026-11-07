import test from 'node:test';
import assert from 'node:assert/strict';
import { verticalLoft } from '../src/close-view-mesh.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';

function actor(kind) { return { kind, x:0, y:0, z:0, yaw:0, phase:0, pace:0, pose:'idle', amount:0, reduceMotion:true }; }
function written(kind) { const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS); return out.slice(0,writeCloseViewModel(out,0,actor(kind))); }
function partPositions(data, triangleStart, triangleCount) {
  const points=[];
  for(let i=triangleStart*3*MODEL_FLOATS;i<(triangleStart+triangleCount)*3*MODEL_FLOATS;i+=MODEL_FLOATS) points.push([data[i],data[i+1],data[i+2]]);
  return points;
}
function span(points, axis) { const values=points.map(p=>p[axis]); return Math.max(...values)-Math.min(...values); }
function polygonArea(points) {
  const unique=[...new Map(points.map(([x,y])=>[`${x.toFixed(8)}/${y.toFixed(8)}`,[x,y]])).values()];
  const center=unique.reduce((q,p)=>[q[0]+p[0]/unique.length,q[1]+p[1]/unique.length],[0,0]);
  unique.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
  return Math.abs(unique.reduce((sum,p,i)=>sum+p[0]*unique[(i+1)%unique.length][1]-p[1]*unique[(i+1)%unique.length][0],0))/2;
}

test('vertical loft uses outward finite winding and volumetric XY rings at distinct heights',()=>{
  const faces=verticalLoft([[0,.18,0],[.04,.31,.45],[-.03,.22,.9]],8);
  assert.equal(faces.length,32);
  for(const face of faces){
    const [a,b,c]=face, u=b.map((v,i)=>v-a[i]), v=c.map((n,i)=>n-a[i]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    assert.ok(normal.every(Number.isFinite)); assert.ok(Math.hypot(...normal)>1e-5,'non-degenerate side normal');
    const center=face.reduce((q,p)=>[q[0]+p[0]/3,q[1]+p[1]/3,q[2]+p[2]/3],[0,0,0]);
    assert.ok(normal[0]*(center[0]-.02)+normal[1]*center[1]>0,'outward winding');
  }
  for(const z of [0,.45,.9]){
    const ring=faces.flat().filter(p=>Math.abs(p[2]-z)<1e-8).map(p=>[p[0],p[1]]);
    assert.ok(polygonArea(ring)>.08,`positive cross-section area at z=${z}`);
  }
  const all=faces.flat();
  assert.ok(span(all,0)>.55&&span(all,1)>.55,'side projection is a rounded volume, not a flat X slice');
});

test('actual upright body parts retain independently measurable torso and cloth depth',()=>{
  const wayfarer=partPositions(written('wayfarer'),0,36);
  const marshal=written('hollowMarshal'), marshalTorso=partPositions(marshal,0,36), marshalCape=partPositions(marshal,36,24);
  const saint=partPositions(written('weepingSaint'),0,36);
  const wraith=partPositions(written('lumenWraith'),0,42);
  for(const [name,points,minDepth] of [
    ['Wayfarer torso',wayfarer,.25],['Marshal torso',marshalTorso,.55],['Marshal cape',marshalCape,.48],
    ['Saint robe',saint,.45],['Wraith shroud',wraith,.55],
  ]){
    const x=span(points,0), y=span(points,1), z=span(points,2);
    assert.ok(x>minDepth,`${name} forward depth ${x}`);
    assert.ok(y>minDepth,`${name} lateral width ${y}`);
    assert.ok(x/y>.7,`${name} has a non-flat side projection (${x}/${y})`);
    assert.ok(z>.4,`${name} spans multiple authored heights`);
  }
});
