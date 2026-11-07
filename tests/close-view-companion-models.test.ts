import test from 'node:test';
import assert from 'node:assert/strict';
import { MESH_FLOATS } from '../src/close-view-mesh.ts';
import { CLOSE_VIEW_COMPANION_KINDS,CLOSE_VIEW_COMPANION_METADATA,CLOSE_VIEW_COMPANION_MODELS } from '../src/close-view-companion-models.ts';

const expected={corridorGolem:176,dungeonReciter:156,elderWanderer:176};
function compiled(kind){return CLOSE_VIEW_COMPANION_MODELS[kind].flatMap(p=>[...p.mesh]);}
function restCompiled(kind){return CLOSE_VIEW_COMPANION_MODELS[kind].flatMap(p=>{const d=[...p.mesh];for(let i=0;i<d.length;i+=MESH_FLOATS){d[i]+=p.px;d[i+2]+=p.pz;}return d;});}
function bounds(data){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=MESH_FLOATS)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],data[i+k]);hi[k]=Math.max(hi[k],data[i+k]);}return{lo,hi,span:hi.map((v,i)=>v-lo[i])};}
const colors=data=>new Set(Array.from({length:data.length/MESH_FLOATS},(_,i)=>data.slice(i*MESH_FLOATS+6,i*MESH_FLOATS+9).map(v=>Math.round(v*255)).join(',')));
const partSpan=(part,axis)=>{const values=[];for(let i=axis;i<part.mesh.length;i+=MESH_FLOATS)values.push(part.mesh[i]+(axis===0?part.px:axis===2?part.pz:0));return Math.max(...values)-Math.min(...values);};

test('three source companion recipes are finite raw-9 meshes within the 232+24 actor cap',()=>{
  assert.deepEqual(CLOSE_VIEW_COMPANION_KINDS,Object.keys(expected));
  for(const kind of CLOSE_VIEW_COMPANION_KINDS){const data=compiled(kind),triangles=data.length/MESH_FLOATS/3;assert.equal(triangles,expected[kind]);assert.ok(triangles<=232);assert.ok(triangles+24<=256);for(let i=0;i<data.length;i+=MESH_FLOATS){for(let k=0;k<MESH_FLOATS;k++)assert.ok(Number.isFinite(data[i+k]),`${kind} finite`);assert.ok(Math.abs(Math.hypot(data[i+3],data[i+4],data[i+5])-1)<1e-5,`${kind} normal`);}}
});

test('source silhouettes retain the Golem punch, Reciter book/staff and Elder disc/stilts',()=>{
  const g=bounds(restCompiled('corridorGolem')),r=bounds(restCompiled('dungeonReciter')),e=bounds(restCompiled('elderWanderer'));
  assert.ok(g.span[1]>.9&&g.hi[2]>1.45&&g.span[2]<1.7,'squat broad stone Golem');
  assert.ok(r.hi[2]>1.5&&r.span[1]>.6&&r.span[2]>1.45,'hunched reader, open book and full staff');
  assert.ok(e.hi[2]>2.3&&e.span[2]>2.25&&e.span[2]>e.span[1]*2.5,'tall four-stilt Elder and floating disc');
  const gc=colors(compiled('corridorGolem')),rc=colors(compiled('dungeonReciter')),ec=colors(compiled('elderWanderer'));
  assert.ok(gc.has('255,210,63')&&gc.has('133,122,104'),'yellow sigil eyes and source stone');
  assert.ok(rc.has('95,111,146')&&rc.has('201,207,230')&&rc.has('140,125,100'),'scholar cloth, pale pages, road staff');
  assert.ok(ec.has('232,229,220')&&ec.has('155,118,200'),'faceless pale disc and reserved rule cells');
});

test('pure anchors and motion roles expose producer-owned contracts without timers or admission',()=>{
  assert.deepEqual(CLOSE_VIEW_COMPANION_METADATA.corridorGolem.motion.arms,[-2,2]);
  assert.equal(CLOSE_VIEW_COMPANION_METADATA.corridorGolem.motion.lifecycle,'producer-rise-sink');
  assert.deepEqual(CLOSE_VIEW_COMPANION_METADATA.dungeonReciter.held.book,[.37,0,.88]);
  assert.deepEqual(CLOSE_VIEW_COMPANION_METADATA.dungeonReciter.motion.legs,[-1,1]);
  assert.deepEqual(CLOSE_VIEW_COMPANION_METADATA.elderWanderer.motion.legs,[-1,-2,1,2]);
  assert.equal(CLOSE_VIEW_COMPANION_METADATA.elderWanderer.palette.ruleSlot,0x9b76c8);
  assert.equal(JSON.stringify(CLOSE_VIEW_COMPANION_METADATA).match(/(?:time|clock|until|duration)/gi),null);
});

test('each recipe owns substantive independently pivoted limbs or cloth',()=>{
  for(const kind of CLOSE_VIEW_COMPANION_KINDS){const parts=CLOSE_VIEW_COMPANION_MODELS[kind],groups=new Set(parts.map(p=>p.swing));assert.ok(groups.size>=3,`${kind} groups`);for(const p of parts){assert.ok(Number.isFinite(p.px)&&Number.isFinite(p.pz));}}
  assert.ok(CLOSE_VIEW_COMPANION_MODELS.corridorGolem.filter(p=>Math.abs(p.swing)===2).length>=4,'two arms and fists punch together');
  assert.ok(CLOSE_VIEW_COMPANION_MODELS.dungeonReciter.some(p=>p.swing===3),'robe cloth follows walk');
  assert.equal(CLOSE_VIEW_COMPANION_MODELS.elderWanderer.filter(p=>Math.abs(p.swing)===1||Math.abs(p.swing)===2).length,4,'four Elder stilt legs');
});

test('Reciter robe and Elder cloak own volumetric cross-sections independent of props and limbs',()=>{
  for(const [kind,minDepth] of [['dungeonReciter',.40],['elderWanderer',.48]]){
    const cloth=CLOSE_VIEW_COMPANION_MODELS[kind][0],x=partSpan(cloth,0),y=partSpan(cloth,1),z=partSpan(cloth,2);
    assert.ok(x>minDepth,`${kind} cloth depth ${x}`);assert.ok(y>minDepth,`${kind} cloth width ${y}`);
    assert.ok(x/y>.7,`${kind} non-flat side projection`);assert.ok(z>.7,`${kind} multiple profile heights`);
  }
});
