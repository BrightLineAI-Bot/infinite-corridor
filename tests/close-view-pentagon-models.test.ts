import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE_VIEW_PENTAGON_KINDS } from '../src/close-view-pentagon-models.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelSupported, modelTriangleCount, modelSupportsAttachments, writeCloseViewModel } from '../src/close-view-models.ts';

const triangles={weepingSaint:148,hangedChoir:204,graveLantern:160,mirrorShade:104,amalgam:192,gnawingMaw:168,cinderSeraph:232,lumenWraith:154,veilSpinner:202,riftLynx:192,sunderjaw:200,thunderhorn:176,siegeBeetle:220,gloomwisp:180,gloomgorge:220};
const actor=(kind,extra={})=>({kind,x:0,y:0,z:0,yaw:0,phase:.7,pace:0,pose:'idle',amount:0,...extra});
function written(kind,extra={}){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);const end=writeCloseViewModel(out,0,actor(kind,extra));return out.slice(0,end);}
function bounds(data){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=MODEL_FLOATS)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],data[i+k]);hi[k]=Math.max(hi[k],data[i+k]);}return{lo,hi,span:hi.map((v,i)=>v-lo[i])};}

test('all fifteen Pentagon bodies compile to finite bounded meshes with the drone reserve',()=>{
  assert.deepEqual(CLOSE_VIEW_PENTAGON_KINDS,Object.keys(triangles));
  for(const kind of CLOSE_VIEW_PENTAGON_KINDS){
    assert.equal(modelSupported(kind),true);assert.equal(modelTriangleCount(kind),triangles[kind]);assert.ok(triangles[kind]<=232);assert.equal(modelSupportsAttachments(kind,3),true);
    const data=written(kind,{alpha:.4});assert.equal(data.length/MODEL_FLOATS/3,triangles[kind]);
    for(let i=0;i<data.length;i+=MODEL_FLOATS){for(let k=0;k<MODEL_FLOATS;k++)assert.ok(Number.isFinite(data[i+k]),`${kind} finite`);assert.ok(Math.abs(Math.hypot(data[i+3],data[i+4],data[i+5])-1)<1e-5,`${kind} unit normal`);assert.ok(data[i+9]>0&&data[i+9]<=.40001);}
    const b=bounds(data);assert.ok(b.span.every(v=>v>.2&&v<3),`${kind} bounded dimensions ${b.span}`);
  }
});

test('source silhouettes retain their identifying spatial landmarks',()=>{
  const b=Object.fromEntries(CLOSE_VIEW_PENTAGON_KINDS.map(k=>[k,bounds(written(k))]));
  assert.ok(b.weepingSaint.span[2]>1.7&&b.weepingSaint.span[2]>b.weepingSaint.span[1]*2,'tall bowed saint');
  assert.ok(b.hangedChoir.lo[2]>.4&&b.hangedChoir.span[1]>1.2,'suspended three-wide choir');
  assert.ok(b.graveLantern.hi[2]>1.9&&b.graveLantern.lo[2]>.15,'chained floating cage');
  assert.ok(b.mirrorShade.span[0]<.3&&b.mirrorShade.span[1]>.9,'thin orbiting mirror planes');
  assert.ok(b.amalgam.span[1]>1.2&&b.amalgam.span[0]>.9,'many-limbed flesh mass');
  assert.ok(b.gnawingMaw.span[1]>.9&&b.gnawingMaw.span[2]>1,'radial masonry maw');
  assert.ok(b.cinderSeraph.span[1]>1.25&&b.cinderSeraph.hi[2]>1.5,'six-wing seraph and knife halo');
  assert.ok(b.lumenWraith.span[2]>1.7&&b.lumenWraith.lo[2]<.02,'hooded shroud with ribbons');
  assert.ok(b.veilSpinner.span[1]>1.3&&b.veilSpinner.hi[2]<.85,'low eight-legged spinner');
  assert.ok(b.riftLynx.span[0]>1.3&&b.riftLynx.span[1]<.4,'long feline and forked tail');
  assert.ok(b.sunderjaw.span[0]>1.2&&b.sunderjaw.span[2]<.8,'low segmented ring-maw');
  assert.ok(b.thunderhorn.span[0]>1.4&&b.thunderhorn.hi[0]>.85,'forward battering horns');
  assert.ok(b.siegeBeetle.span[0]>1.25&&b.siegeBeetle.hi[2]>1.15,'armoured beetle and dorsal mortar');
  assert.ok(b.gloomwisp.span[0]<.6&&b.gloomwisp.span[2]<1,'head-sized gas grin');
  assert.ok(b.gloomgorge.span[0]>1.1&&b.gloomgorge.span[1]>1.1,'squat broad hooked gorge');
  assert.equal(new Set(CLOSE_VIEW_PENTAGON_KINDS.map(k=>b[k].span.map(v=>v.toFixed(2)).join('/'))).size,15,'distinct model extents');
});

test('production action families articulate owned joints through windup contact and recovery',()=>{
  const family={weepingSaint:'stab',hangedChoir:'howl',graveLantern:'curse',mirrorShade:'teleport',amalgam:'sweep',gnawingMaw:'inhale',cinderSeraph:'dive',lumenWraith:'beam',veilSpinner:'summon',riftLynx:'leap',sunderjaw:'bite',thunderhorn:'charge',siegeBeetle:'ranged',gloomwisp:'curse',gloomgorge:'sweep'};
  for(const kind of CLOSE_VIEW_PENTAGON_KINDS){
    const idle=written(kind),walk=written(kind,{pace:1,phase:2.2}),wind=written(kind,{actionFamily:family[kind],actionPhase:'windup',actionProgress:.8}),contact=written(kind,{actionFamily:family[kind],actionPhase:'recover',actionProgress:0}),recover=written(kind,{actionFamily:family[kind],actionPhase:'recover',actionProgress:.7});
    assert.notDeepEqual([...walk],[...idle],`${kind} locomotion/hover`);assert.notDeepEqual([...wind],[...idle],`${kind} windup`);assert.notDeepEqual([...contact],[...wind],`${kind} contact`);assert.notDeepEqual([...recover],[...contact],`${kind} recovery`);
  }
  assert.notDeepEqual([...written('sunderjaw',{actionFamily:'bite',actionPhase:'active',actionProgress:.5})],[...written('sunderjaw',{actionFamily:'charge',actionPhase:'active',actionProgress:.5})],'bite is not a charge oscillator');
  assert.notDeepEqual([...written('siegeBeetle',{actionFamily:'ranged',actionPhase:'strike',actionProgress:0})],[...written('siegeBeetle',{actionFamily:'summon',actionPhase:'strike',actionProgress:0})],'mortar recoil belongs to ranged release');
});

test('reduced motion freezes secondary flourish but preserves action joints and watched Saint stone stillness',()=>{
  const calm=written('lumenWraith',{phase:.4}),animated=written('lumenWraith',{phase:2.4}),reducedA=written('lumenWraith',{phase:.4,reduceMotion:true}),reducedB=written('lumenWraith',{phase:2.4,reduceMotion:true});
  assert.notDeepEqual([...calm],[...animated]);assert.deepEqual([...reducedA],[...reducedB]);
  const attack=written('lumenWraith',{reduceMotion:true,actionFamily:'beam',actionPhase:'windup',actionProgress:.8});assert.notDeepEqual([...attack],[...reducedA]);
  assert.deepEqual([...written('weepingSaint',{watched:true,phase:.2})],[...written('weepingSaint',{watched:true,phase:2.2})]);
});

test('own attack roles keep held phases and distinctive source articulation',()=>{
  const pose=(kind,actionFamily,actionPhase,actionProgress,action)=>written(kind,{pose:'semantic',action,actionFamily,actionPhase,actionProgress,reduceMotion:true});
  assert.notDeepEqual([...pose('weepingSaint','stab','windup',.8,'longStab')],[...pose('weepingSaint','sweep','windup',.8,'clawSweep')],'Saint stab and sweep move covered hands differently');
  assert.notDeepEqual([...pose('mirrorShade','stab','windup',.8,'longStab')],[...pose('mirrorShade','teleport','strike',.8,'blinkStrike')],'Shade stab and mirror transit differ');
  assert.notDeepEqual([...pose('hangedChoir','dive','active',.4,'diveBomb')],[...pose('hangedChoir','curse','active',.4,'sigilScatter')],'Choir dive and sigil posture differ');
  for(const [kind,family,action] of [['lumenWraith','beam','sweepBeam'],['thunderhorn','charge','ramCharge'],['gnawingMaw','inhale','devourPull']])
    assert.deepEqual([...pose(kind,family,'active',.1,action)],[...pose(kind,family,'active',.9,action)],`${kind} sustains active posture without an oscillator`);
});

test('borrowed ranged and spike-volley family braces every new body without a generic oscillator',()=>{
  for(const kind of CLOSE_VIEW_PENTAGON_KINDS){
    const idle=written(kind,{reduceMotion:true,pose:'semantic'}),wind=written(kind,{reduceMotion:true,pose:'semantic',action:'spikeVolley',actionFamily:'ranged',actionPhase:'windup',actionProgress:.8}),release=written(kind,{reduceMotion:true,pose:'semantic',action:'spikeVolley',actionFamily:'ranged',actionPhase:'recover',actionProgress:0});
    assert.notDeepEqual([...wind],[...idle],`${kind} ranged brace`);assert.notDeepEqual([...release],[...wind],`${kind} ranged release`);
  }
});

test('Pallid Crawler preserves legacy bite/leap but gives borrowed families distinct splayed-joint poses',()=>{
  const semantic=(family,phase='windup',progress=.8)=>written('pallidCrawler',{reduceMotion:true,pose:'semantic',actionFamily:family,actionPhase:phase,actionProgress:progress});
  const idle=written('pallidCrawler',{reduceMotion:true});
  for(const family of ['stab','sweep','charge','beam','ranged','curse','burrow','dive','teleport'])assert.notDeepEqual([...semantic(family)],[...idle],family);
  assert.notDeepEqual([...semantic('stab')],[...semantic('sweep')]);
  assert.notDeepEqual([...written('pallidCrawler',{pose:'windup',amount:.8})],[...written('pallidCrawler',{pose:'attack',amount:.3})],'legacy bite/leap pose path remains active');
});

test('scale is applied once and three world-space attachments retain the fixed 256-triangle cap',()=>{
  const one=bounds(written('hangedChoir')),two=bounds(written('hangedChoir',{scale:2}));for(let i=0;i<3;i++)assert.ok(Math.abs(two.span[i]/one.span[i]-2)<1e-4);
  const attachments=[{x:4,y:5,z:6},{x:5,y:5,z:6},{x:6,y:5,z:6}],data=written('hangedChoir',{scale:2,attachments});assert.equal(data.length/MODEL_FLOATS/3,228);
  const tail=data.slice(triangles.hangedChoir*3*MODEL_FLOATS),q=bounds(tail);assert.ok(q.lo[0]>3.8&&q.hi[0]<6.2&&q.lo[2]>5.8&&q.hi[2]<6.2,'attachment positions are not actor-scaled twice');
});
