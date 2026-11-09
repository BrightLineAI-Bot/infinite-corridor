import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MODEL_FLOATS,writeCloseViewModel,modelTriangleCount,modelSupportsAttachments} from '../src/close-view-models.ts';
const base={kind:'playerCinderPike',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,reduceMotion:true};
function mesh(extra={}){const o=new Float32Array(10000),n=writeCloseViewModel(o,0,{...base,...extra});assert.equal(n,240*30);return o.slice(0,n);}
const near=(a,b,e=1e-5)=>Math.abs(a-b)<e;
function center(o,triangles){const unique=new Map();for(const t of triangles)for(let v=0;v<3;v++){const p=Array.from(o.slice(t*30+v*10,t*30+v*10+3));unique.set(p.map(n=>Math.round(n*1e6)).join(','),p);}const ps=[...unique.values()];assert.equal(ps.length,4);return [0,1,2].map(k=>ps.reduce((n,p)=>n+p[k],0)/4);}
function grips(o){return [center(o,[158,159]),center(o,[212,213])];}
function shaft(o){const low=center(o,[222,224]),high=center(o,[223,225]),axis=high.map((v,k)=>v-low[k]),length=Math.hypot(...axis);return{low,axis:axis.map(v=>v/length),length};}

test('native Pike has the imported raised diagonal carry and two hands on its unchanged rigid shaft',()=>{
  const o=mesh(),[right,left]=grips(o),s=shaft(o),gap=left.map((v,k)=>v-right[k]);
  assert.ok(near(Math.hypot(...gap),.1834));assert.ok(near(Math.asin(s.axis[2]),.60));assert.ok(near(Math.atan2(s.axis[1],s.axis[0]),.60));
  assert.ok(near(s.length,1.32*.82));
  for(let k=0;k<3;k++){assert.ok(near(right[k],s.low[k]+s.axis[k]*.02*.82));assert.ok(near(left[k],right[k]+s.axis[k]*.1834));}
  assert.equal(modelTriangleCount('playerCinderPike'),240);assert.ok(modelSupportsAttachments('playerCinderPike',2));assert.equal(modelSupportsAttachments('playerCinderPike',3),false);
});

test('all three optional native thrusts return to one carry and retain grip constraints through gait and reduced motion',()=>{
  const distinct=[];
  for(const reduceMotion of [false,true])for(const pace of [0,.7,1])for(const phase of [0,1.2,3])for(const primaryStep of [1,2,3]){
    const extra={reduceMotion,pace,phase,primaryStep};
    assert.deepEqual(mesh({...extra,pose:'attack',amount:0}),mesh(extra));assert.deepEqual(mesh({...extra,pose:'attack',amount:1}),mesh(extra));
    for(const amount of [0,.04,.12,.3,.4,.7,1]){
      const o=mesh({...extra,pose:'attack',amount}),[a,b]=grips(o),s=shaft(o);assert.ok(near(Math.hypot(...b.map((v,k)=>v-a[k])),.1834));
      for(let k=0;k<3;k++){assert.ok(near(a[k],s.low[k]+s.axis[k]*.02*.82));assert.ok(near(b[k],a[k]+s.axis[k]*.1834));}
      for(let i=0;i<o.length;i+=MODEL_FLOATS){assert.ok(o.slice(i,i+10).every(Number.isFinite));assert.ok(near(Math.hypot(...o.slice(i+3,i+6)),1));assert.ok(Math.abs(o[i])<2&&Math.abs(o[i+1])<2&&o[i+2]>-.2&&o[i+2]<2);}
    }
    if(reduceMotion&&pace===0&&phase===0)distinct.push(mesh({...extra,pose:'attack',amount:.3}));
  }
  assert.notDeepEqual(distinct[0],distinct[1]);assert.notDeepEqual(distinct[1],distinct[2]);
  const frozen=mesh({pose:'attack',amount:.3});mesh({pose:'attack',amount:.7,primaryStep:3});assert.deepEqual(mesh({pose:'attack',amount:.3}),frozen,'scratch reuse cannot advance a paused pose');
});

test('native Pike keeps atomic admission and byte-identical existing interruption and unrelated model paths',()=>{
  const out=new Float32Array(240*30-1).fill(7);assert.equal(writeCloseViewModel(out,0,base),0);assert.ok(out.every(v=>v===7));
  // Nonjump hashes are from pre-Pike7cfea9bb. The jump hash explicitly records
  // the later authorized jump-only compatible knee baseline; all other paths stay unchanged.
  const cases=[['player','idle','9f2af8e3089022130547b4a2bc79402fd7873d444ec7b73429a9bae31a1bd577'],['playerVergeCleaver','attack','27cc68c49998dd915a68b24eeab49289f4fcf107b5ebda60e1f299170a7e5bf3'],['playerTool','idle','fc20688e672d98a305e5dedd7110e47d9223ea5659f19a6f612480d19ea03662'],['playerCinderPike','cast','ae43696f3e13c212f8999c75d0571989aa3c6d7043ad6590be8cc35ae7231d7f'],['playerCinderPike','hit','41138a7e51e40c2b7fdc7400a5b0f4e23a34322317fc4d0749249c97eccd08d0'],['playerCinderPike','jump','66043aedb2857b5e67853f329ebcb98546942f78655aba532b8cdde1860bb10f'],['playerCinderPike','knockdown','43927ff251ee30080958d36952a0be262b0e5def642dee80bedf755ada8ee0d7'],['playerCinderPike','death','298307531412b1a47134a9c23d46a2f88cc88b181ee02df55c126b1267ed6d91']];
  for(const [kind,pose,hash] of cases){const a=new Float32Array(10000),n=writeCloseViewModel(a,0,{...base,kind,pose,yaw:.3,phase:1.2,pace:.7,amount:.4,reduceMotion:false});assert.equal(createHash('sha256').update(new Uint8Array(a.buffer,0,n*4)).digest('hex'),hash,`${kind} ${pose}`);}
});
