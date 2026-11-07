import test from 'node:test';
import assert from 'node:assert/strict';
import { MESH_FLOATS } from '../src/close-view-mesh.ts';
import { CLOSE_VIEW_FOUNDRY_KINDS, FOUNDRY_MODEL_KEYS, FOUNDRY_MODEL_METADATA, FOUNDRY_PALETTES, foundryPaletteIndex } from '../src/close-view-foundry-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, modelSupportsAttachments, writeCloseViewModel } from '../src/close-view-models.ts';

const triangles = {'foundry-quadruped':176,'foundry-floating':160,'foundry-segmented':192,'foundry-tentacled':184,'foundry-geometric':152,'foundry-biomechanical':204};
const actor = (kind, extra={}) => ({kind,x:0,y:0,z:0,yaw:0,phase:.73,pace:0,pose:'idle',amount:0,...extra});
function written(kind,extra={}){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,actor(kind,extra));return out.slice(0,end);}
function bounds(data){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=MODEL_FLOATS)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],data[i+k]);hi[k]=Math.max(hi[k],data[i+k]);}return{lo,hi,span:hi.map((q,i)=>q-lo[i])};}

test('Foundry body contract maps the six production morphology strings to bounded native recipes',()=>{
  assert.equal(MESH_FLOATS,9);assert.equal(MODEL_FLOATS,10);
  assert.deepEqual(Object.keys(FOUNDRY_MODEL_KEYS),['quadruped','floating','segmented','tentacled','geometric','biomechanical']);
  assert.deepEqual(CLOSE_VIEW_FOUNDRY_KINDS,Object.values(FOUNDRY_MODEL_KEYS));
  for(const kind of CLOSE_VIEW_FOUNDRY_KINDS){assert.equal(modelSupported(kind),true);assert.equal(modelTriangleCount(kind),triangles[kind]);assert.ok(modelTriangleCount(kind)<=232);assert.equal(modelSupportsAttachments(kind,3),true);const data=written(kind);assert.equal(data.length/MODEL_FLOATS/3,triangles[kind]);for(let i=0;i<data.length;i+=MODEL_FLOATS){for(let q=0;q<MODEL_FLOATS;q++)assert.ok(Number.isFinite(data[i+q]),`${kind} finite`);assert.ok(Math.abs(Math.hypot(data[i+3],data[i+4],data[i+5])-1)<1e-5,`${kind} unit normal`);}}
});

test('authored silhouettes remain morphologically distinct and expose stable local anchors',()=>{
  const q=bounds(written(FOUNDRY_MODEL_KEYS.quadruped)),f=bounds(written(FOUNDRY_MODEL_KEYS.floating)),s=bounds(written(FOUNDRY_MODEL_KEYS.segmented)),t=bounds(written(FOUNDRY_MODEL_KEYS.tentacled)),g=bounds(written(FOUNDRY_MODEL_KEYS.geometric)),b=bounds(written(FOUNDRY_MODEL_KEYS.biomechanical));
  assert.ok(q.span[0]>1.3&&q.hi[2]<1,'low long quadruped');assert.ok(f.lo[2]>-.05&&f.span[1]>.7,'hover mantle');assert.ok(s.span[0]>1.1&&s.hi[2]<.75,'linked floor segments');assert.ok(t.span[2]>1.2&&t.span[1]>.6,'hanging radial tendrils');assert.ok(g.lo[2]>.25&&g.span[1]>.75,'detached geometric plates');assert.ok(b.hi[2]>1.4&&b.span[2]>1.35,'upright biomechanical chassis');
  for(const body of Object.keys(FOUNDRY_MODEL_KEYS)){const m=FOUNDRY_MODEL_METADATA[body];assert.equal(m.key,FOUNDRY_MODEL_KEYS[body]);assert.ok(Number.isFinite(m.headZ)&&Number.isFinite(m.actionZ));assert.ok(m.headZ>m.actionZ);assert.equal(typeof m.phase,'string');}
});

test('each Foundry morphology has ambient locomotion and deliberate windup and strike articulation',()=>{
  for(const kind of CLOSE_VIEW_FOUNDRY_KINDS){const idle=written(kind),move=written(kind,{pace:1,phase:2.2}),windup=written(kind,{pose:'windup',amount:.8}),strike=written(kind,{pose:'attack',amount:.3});assert.notDeepEqual([...move],[...idle],`${kind} movement`);assert.notDeepEqual([...windup],[...idle],`${kind} windup`);assert.notDeepEqual([...strike],[...windup],`${kind} strike`);const reducedIdle=written(kind,{reduceMotion:true}),reducedWindup=written(kind,{reduceMotion:true,pose:'windup',amount:.8}),reducedStrike=written(kind,{reduceMotion:true,pose:'attack',amount:.3});assert.notDeepEqual([...reducedWindup],[...reducedIdle],`${kind} reduced-motion windup`);assert.notDeepEqual([...reducedStrike],[...reducedWindup],`${kind} reduced-motion strike`);}
});

test('all five production palette indices resolve finite authored colors with canonical invalid fallback',()=>{
  assert.equal(FOUNDRY_PALETTES.length,5);assert.equal(foundryPaletteIndex(null),0);assert.equal(foundryPaletteIndex(-1),0);assert.equal(foundryPaletteIndex(5),0);
  const samples=[];
  for(let palette=0;palette<5;palette++){assert.equal(foundryPaletteIndex(palette),palette);const data=written(FOUNDRY_MODEL_KEYS.biomechanical,{palette});const colors=new Set;for(let i=0;i<data.length;i+=MODEL_FLOATS){for(let q=6;q<10;q++)assert.ok(Number.isFinite(data[i+q]));colors.add(`${Math.round(data[i+6]*255)},${Math.round(data[i+7]*255)},${Math.round(data[i+8]*255)}`);}assert.equal(colors.size,3);samples.push([...colors].sort().join('|'));}
  assert.equal(new Set(samples).size,5);assert.deepEqual([...written(FOUNDRY_MODEL_KEYS.biomechanical,{palette:null})],[...written(FOUNDRY_MODEL_KEYS.biomechanical,{palette:99})]);
});

test('three world-space drone attachments fit every Foundry body without changing existing registry profiles',()=>{
  const attachments=[{x:4,y:5,z:6},{x:5,y:5,z:6},{x:6,y:5,z:6}];
  for(const kind of CLOSE_VIEW_FOUNDRY_KINDS){const data=written(kind,{attachments,alpha:.4,scale:1.2});assert.equal(data.length/MODEL_FLOATS/3,triangles[kind]+24);for(let i=0;i<data.length;i+=MODEL_FLOATS)assert.ok(Math.abs(data[i+9]-.4)<1e-6);}
  for(const kind of ['player','playerHammer','ashling','voidSentinel']){assert.equal(modelSupported(kind),true);assert.ok(written(kind).length>0);}
});
