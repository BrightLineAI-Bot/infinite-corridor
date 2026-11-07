import test from 'node:test';
import assert from 'node:assert/strict';
import { MESH_FLOATS, ellipsoid, curvedTube, membrane, part } from '../src/close-view-mesh.ts';
import { CLOSE_VIEW_ARCOLOGY_KINDS } from '../src/close-view-arcology-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, modelSupportsAttachments, writeCloseViewModel } from '../src/close-view-models.ts';

const expectedTriangles = { glassMite: 168, sparkWarden: 196, cinderWisp: 140, veilMoth: 120, voidSentinel: 204 };
const actor = (kind, extra = {}) => ({ kind, x: 0, y: 0, z: 0, yaw: 0, phase: .7, pace: 0, pose: 'idle', amount: 0, ...extra });
function written(kind, extra = {}) {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS), end = writeCloseViewModel(out, 0, actor(kind, extra));
  return out.slice(0, end);
}
function bounds(data) {
  const lo = [Infinity,Infinity,Infinity], hi = [-Infinity,-Infinity,-Infinity];
  for (let i=0;i<data.length;i+=MODEL_FLOATS) for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],data[i+k]);hi[k]=Math.max(hi[k],data[i+k]);}
  return { lo, hi, span: hi.map((q,i)=>q-lo[i]) };
}

test('primitive builders keep raw RGB stride, finite unit normals and double-sided membranes', () => {
  assert.equal(MESH_FLOATS, 9); assert.equal(MODEL_FLOATS, 10);
  const shapes = [ellipsoid(8,3), curvedTube([[0,0,0,.2],[.2,0,.3,.15],[.4,0,.5,.02]],5), membrane([[0,0,0],[0,1,0],[1,1,0],[1,0,0]])];
  assert.ok(shapes.every((q)=>q.length>0)); assert.equal(shapes[2].length,4);
  for(const shape of shapes){const mesh=part(shape,0,0,0,1,1,1,0xffffff,0,0,0,0,true).mesh;assert.equal(mesh.length%MESH_FLOATS,0);for(let i=0;i<mesh.length;i+=MESH_FLOATS){for(let k=0;k<MESH_FLOATS;k++)assert.ok(Number.isFinite(mesh[i+k]));assert.ok(Math.abs(Math.hypot(mesh[i+3],mesh[i+4],mesh[i+5])-1)<1e-5);}}
});

test('the five authored bodies stay distinctive, bounded and leave the 24-triangle attachment reserve', () => {
  assert.deepEqual(CLOSE_VIEW_ARCOLOGY_KINDS, Object.keys(expectedTriangles));
  for(const kind of CLOSE_VIEW_ARCOLOGY_KINDS){assert.equal(modelSupported(kind),true);assert.equal(modelTriangleCount(kind),expectedTriangles[kind]);assert.ok(modelTriangleCount(kind)<=232);assert.equal(modelSupportsAttachments(kind,3),true);const data=written(kind,{alpha:.42});assert.equal(data.length/MODEL_FLOATS/3,expectedTriangles[kind]);for(let i=0;i<data.length;i+=MODEL_FLOATS){assert.ok(Math.abs(Math.hypot(data[i+3],data[i+4],data[i+5])-1)<1e-5,`${kind} normal`);assert.ok(Math.abs(data[i+9]-.42)<1e-6);}}
  const mite=bounds(written('glassMite')), warden=bounds(written('sparkWarden')), wisp=bounds(written('cinderWisp')), moth=bounds(written('veilMoth')), sentinel=bounds(written('voidSentinel'));
  assert.ok(mite.hi[2]<.65&&mite.span[1]>.8,'low wide mite with pointed legs');
  assert.ok(warden.hi[2]>1.55&&warden.span[2]>1.5,'grounded tall warden and staff');
  assert.ok(wisp.lo[2]>-.05&&wisp.span[2]>.8,'hovering flame-lobed wisp');
  assert.ok(moth.span[1]>1.4&&moth.span[1]>moth.span[2],'broad thin moth wings');
  assert.ok(sentinel.span[2]>1.2&&sentinel.span[1]>.6,'oval core with hanging tentacles');
});

test('movement, windup and strike poses animate authored rigid groups, including wings and tentacles', () => {
  for(const kind of CLOSE_VIEW_ARCOLOGY_KINDS){const idle=written(kind), moving=written(kind,{pace:1,phase:2.1}), windup=written(kind,{pose:'windup',amount:.8}), strike=written(kind,{pose:'attack',amount:.3});assert.notDeepEqual([...moving],[...idle],`${kind} locomotion`);assert.notDeepEqual([...windup],[...idle],`${kind} windup`);assert.notDeepEqual([...strike],[...windup],`${kind} strike`);}
  const wingIdle=bounds(written('veilMoth')), wingStrike=bounds(written('veilMoth',{pose:'attack',amount:.3}));assert.notDeepEqual(wingStrike.span,wingIdle.span);
  const tentacleIdle=written('voidSentinel'), tentacleMove=written('voidSentinel',{pace:1,phase:2.5});assert.notDeepEqual([...tentacleMove],[...tentacleIdle]);
});

test('compiled alpha, actor scale, stagger and world-space drone attachments obey the fixed budget', () => {
  const base=written('glassMite'), doubled=written('glassMite',{scale:2}), b=bounds(base), d=bounds(doubled);for(let i=0;i<3;i++)assert.ok(Math.abs(d.span[i]/b.span[i]-2)<1e-4);
  const stagger=bounds(written('glassMite',{stagger:1}));assert.ok(stagger.lo[2]<b.lo[2]);
  const attachments=[{x:4,y:5,z:6},{x:5,y:5,z:6},{x:6,y:5,z:6}], data=written('voidSentinel',{alpha:2,attachments});
  assert.equal(data.length/MODEL_FLOATS/3,228);for(let i=0;i<data.length;i+=MODEL_FLOATS)assert.equal(data[i+9],1);
  const tail=data.slice(modelTriangleCount('voidSentinel')*3*MODEL_FLOATS), q=bounds(tail);assert.ok(q.lo[0]>3.8&&q.hi[0]<6.2&&q.lo[2]>5.8,'attachments remain at world positions');
});

test('softened Wayfarer preserves every held profile and identifying hood, eyes and satchel colors', () => {
  const profiles=['player','wayfarer','playerTool','playerUnarmed','playerHammer','playerSweep','playerMirage','playerOrrery'];
  for(const kind of profiles){assert.equal(modelSupported(kind),true);assert.ok(modelTriangleCount(kind)<=256,`${kind}: ${modelTriangleCount(kind)}`);assert.ok(written(kind).length>0);}
  assert.ok(modelTriangleCount('playerUnarmed')<=230);assert.ok(modelTriangleCount('player')-modelTriangleCount('playerUnarmed')<=26);
  const data=written('player'), colors=[];for(let i=0;i<data.length;i+=MODEL_FLOATS)colors.push(data.slice(i+6,i+9).map((q)=>Math.round(q*255)).join(','));
  assert.ok(colors.includes('243,165,92'),'amber eyes');assert.ok(colors.includes('35,37,34'),'recessed face');assert.ok(colors.includes('103,83,59'),'satchel');
});
