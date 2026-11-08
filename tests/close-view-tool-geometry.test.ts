import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_FLOATS, writeCloseViewHeroGear } from '../src/close-view-models.ts';

const profiles = ['rift-bombard','great-sweep','blunderbuss','lumen-spindle'];
const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
const translated = new Float32Array(identity); translated[12]=2.5; translated[13]=-1.25; translated[14]=.75;
const rotated = new Float32Array([0,1,0,0, -1,0,0,0, 0,0,1,0, 0,0,0,1]);

function write(profile, rightSocket=identity, size=96*3*MODEL_FLOATS, offset=0) {
  const out=new Float32Array(size+offset);
  const end=writeCloseViewHeroGear(out,offset,{profile,rightSocket,alpha:.65});
  return {out,end,vertices:(end-offset)/MODEL_FLOATS,triangles:(end-offset)/MODEL_FLOATS/3};
}

test('future tool recipes stay finite, bounded, opaque as requested, and have unit normals',()=>{
  const counts={};
  for(const profile of profiles){
    const {out,end,triangles}=write(profile);
    assert.ok(end>0,profile); assert.ok(triangles<=96,`${profile}: ${triangles} triangles`); counts[profile]=triangles;
    for(let i=0;i<end;i+=MODEL_FLOATS){
      assert.ok(out.slice(i,i+MODEL_FLOATS).every(Number.isFinite),profile);
      assert.ok(Math.abs(Math.hypot(out[i+3],out[i+4],out[i+5])-1)<1e-5,`${profile} normal`);
      assert.ok(Math.abs(out[i+9]-.65)<1e-6);
    }
  }
  assert.equal(new Set(Object.values(counts)).size,4,'each silhouette has an independently bounded recipe');
});

test('future tools follow socket translation and rotation without changing geometry',()=>{
  for(const profile of profiles){
    const a=write(profile),b=write(profile,translated),c=write(profile,rotated);
    assert.equal(a.end,b.end); assert.equal(a.end,c.end);
    for(let i=0;i<a.end;i+=MODEL_FLOATS){
      assert.ok(Math.abs((b.out[i]-a.out[i])-2.5)<1e-5);
      assert.ok(Math.abs((b.out[i+1]-a.out[i+1])+1.25)<1e-5);
      assert.ok(Math.abs((b.out[i+2]-a.out[i+2])-.75)<1e-5);
      assert.ok(Math.abs(c.out[i]+a.out[i+1])<1e-5);
      assert.ok(Math.abs(c.out[i+1]-a.out[i])<1e-5);
      assert.ok(Math.abs(c.out[i+2]-a.out[i+2])<1e-5);
    }
  }
});

test('future recipes refuse short buffers atomically and unknown profiles remain neutral',()=>{
  for(const profile of profiles){
    const full=write(profile),sentinel=new Float32Array(full.end-1).fill(7);
    assert.equal(writeCloseViewHeroGear(sentinel,0,{profile,rightSocket:identity}),0);
    assert.ok(sentinel.every(q=>q===7),`${profile} did not partially write`);
  }
  const out=new Float32Array(128).fill(3);
  for(const profile of ['future-tool','constructor','toString','']){
    assert.equal(writeCloseViewHeroGear(out,0,{profile,rightSocket:identity}),0);
    assert.ok(out.every(q=>q===3));
  }
});
