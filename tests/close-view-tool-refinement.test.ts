import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_FLOATS, writeCloseViewHeroGear } from '../src/close-view-models.ts';
import { closeViewHeldScale } from '../src/close-view-player-presentation.ts';
import { GREAT_SWEEP_HELD_TRIANGLES } from '../src/close-view-sweep-gear.ts';
const socket=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mesh(profile){const out=new Float32Array(96*3*MODEL_FLOATS);const end=writeCloseViewHeroGear(out,0,{profile,rightSocket:socket});return out.slice(0,end);}
const near=(a,b)=>Math.abs(a-b)<1e-6;
// Right-hand tools are drawn at their CLOSE_VIEW_HELD_GEAR scale on top of the .82 recipe conversion.
const KB=.82*closeViewHeldScale('blunderbuss'),KR=.82*closeViewHeldScale('rift-bombard'),KS=.82*closeViewHeldScale('lumen-spindle');

// 2026-11-14 (Tim: "a long handle with a large broken greatsword blade... only a stub just above the hilt, but it's big, like a
// giant's weapon"): replaces the forged broken outline this test pinned before (close-view-sweep-gear.ts HERO_GREAT_SWEEP).
test('Great Sweep: a long handle and a broad broken stub of a blade, nondegenerate, inside its budget',()=>{
  const out=mesh('great-sweep');assert.equal(out.length/30,GREAT_SWEEP_HELD_TRIANGLES);assert.ok(GREAT_SWEEP_HELD_TRIANGLES<=72);
  let lo=Infinity,hi=-Infinity,wide=0;
  for(let i=0;i<out.length;i+=30){
    const p=[0,10,20].map(k=>Array.from(out.slice(i+k,i+k+3)));
    const a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]);
    assert.ok(Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])>1e-8);
    for(const q of p){lo=Math.min(lo,q[0]);hi=Math.max(hi,q[0]);wide=Math.max(wide,Math.abs(q[2]));}
  }
  assert.ok(lo<-.25,'the handle runs on below the hand');assert.ok(hi>.9,'a long reach to the broken edge');assert.ok(wide>.2,'a broad blade');
});

test('Blunderbuss retains its muzzle plane with a recessed open bore within the equipment budget',()=>{
  const out=mesh('blunderbuss');assert.equal(out.length/30,92);assert.ok(92+60<=156);
  const verts=Array.from({length:out.length/10},(_,i)=>Array.from(out.slice(i*10,i*10+10)));
  const muzzle=(1.535-.79)*KB,front=verts.filter(p=>near(p[0],muzzle));
  assert.ok(front.length>0);assert.ok(verts.every(p=>p[0]<=muzzle+1e-6));
  assert.ok(front.every(p=>Math.hypot(p[1],p[2])>=.052*KB-1e-6),'muzzle has an unfilled bore');
  const cap=verts.filter(p=>near(p[6],0x11/255)&&near(p[7],0x15/255)&&near(p[8],0x1b/255));
  assert.equal(cap.length,12);assert.ok(cap.every(p=>near(p[0],(1.43-.79)*KB)),'dark bore terminates behind the muzzle');
});

test('Bombard is a grenade launcher with a lit bore on the muzzle face, its fixed reach and 96-triangle ceiling',()=>{
  const out=mesh('rift-bombard');assert.equal(out.length/30,96);assert.equal(96+60,156);
  const vertices=Array.from({length:out.length/10},(_,i)=>Array.from(out.slice(i*10,i*10+10)));
  // The blue-lit throat (RIFT_BOMBARD_COLOURS.glow, 0x5aa6ff) sits just inside the muzzle face; the drum faces share its colour.
  const lit=vertices.filter(p=>near(p[6],0x5a/255)&&near(p[7],0xa6/255)&&near(p[8],0xff/255));
  assert.equal(lit.filter(p=>p[0]>(1.5-.79)*KR).length,12);assert.equal(lit.length,36);
  assert.ok(near(Math.max(...vertices.map(p=>p[0])),.6519*closeViewHeldScale('rift-bombard')));
});

test('Spindle collars stay within its established head silhouette and emission reach',()=>{
  const out=mesh('lumen-spindle');assert.equal(out.length/30,78);assert.ok(78+60<=156);
  const vertices=Array.from({length:out.length/10},(_,i)=>Array.from(out.slice(i*10,i*10+10)));
  assert.ok(near(Math.max(...vertices.map(p=>p[0])),.6437*closeViewHeldScale('lumen-spindle')));
  assert.ok(near(Math.max(...vertices.map(p=>Math.abs(p[1]))),.05326056*closeViewHeldScale('lumen-spindle')));
  assert.ok(near(Math.max(...vertices.map(p=>Math.abs(p[2]))),.0615*closeViewHeldScale('lumen-spindle')));
  // New collars occupy the original shaft/head interval, never a displaced tip.
  for(const [start,end] of [[24,44],[56,76]]){
    const collar=vertices.slice(start*3,end*3);
    assert.equal(collar.length,60);
    assert.ok(collar.every(p=>p[0]>.43*KS/.82&&p[0]<.55*KS/.82));
  }
});

test('prepared Spark and Needle recipes are distinct, rigid, bounded and atomic without live routing',()=>{
  const counts={'spark-coil':56,'needle-caster':60},shapes=[];
  for(const [profile,count] of Object.entries(counts)){
    const out=mesh(profile);assert.equal(out.length/30,count);assert.ok(count<=72);assert.ok(count+60<=156);
    const transform=new Float32Array([0,1,0,0,-1,0,0,0,0,0,1,0,2,-3,4,1]);
    const moved=new Float32Array(out.length);assert.equal(writeCloseViewHeroGear(moved,0,{profile,rightSocket:transform}),out.length);
    for(let i=0;i<out.length;i+=10){
      assert.ok(Array.from(out.slice(i,i+10)).every(Number.isFinite));
      assert.ok(near(Math.hypot(...out.slice(i+3,i+6)),1));
      assert.ok(near(moved[i],2-out[i+1]));assert.ok(near(moved[i+1],-3+out[i]));assert.ok(near(moved[i+2],4+out[i+2]));
    }
    const short=new Float32Array(out.length-1).fill(7);
    assert.equal(writeCloseViewHeroGear(short,0,{profile,rightSocket:socket}),0);assert.ok(short.every(v=>v===7));
    shapes.push(Array.from(out));
  }
  assert.notDeepEqual(shapes[0],shapes[1]);
});
