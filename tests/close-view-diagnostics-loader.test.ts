import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),bytes=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const binary=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);let instance=0;
const fresh=()=>import(`../src/close-view-hero.ts?diagnostics-loader=${++instance}`);
async function globals(values,run){const previous=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));try{for(const[k,v]of Object.entries(values))Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});return await run();}finally{for(const[k,d]of previous)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
function responses(failure=''){
  const calls=[],images=[];
  return {calls,images,fetch:async(...args)=>{calls.push(args);const request=calls.length;
    if(failure==='network')throw new Error('private network path');
    if(failure==='metadata-http'&&request===1||failure==='binary-http'&&request===2||failure==='texture-http'&&request===3)return{ok:false};
    return{ok:true,json:async()=>{if(failure==='metadata-json')throw new Error('private JSON details');return failure==='asset-decode'?{...meta,version:999}:failure==='texture-layers'?{...meta,textures:meta.textures.map(t=>({...t,layer:1}))}:meta;},arrayBuffer:async()=>{if(failure==='binary-read')throw new Error('private binary details');return binary;},blob:async()=>({})};
  },createImageBitmap:async(blob,options)=>{images.push(options);if(failure==='image-decode')throw new Error('private decoder details');return{width:failure==='image-size'?512:1024,height:1024};}};
}

test('asset status reads do not request data; one pending promise stays deduplicated and successful requests remain unchanged',async()=>{
  const r=responses();let release;const gate=new Promise(resolve=>release=resolve),firstResponse=r.fetch;
  await globals({window:{},fetch:async(...args)=>{if(!r.calls.length)await gate;return firstResponse(...args);},createImageBitmap:r.createImageBitmap},async()=>{
    const h=await fresh();assert.equal(h.closeViewHeroAssetStatus(),'not-requested');assert.equal(h.getCloseViewHeroAsset(),null);assert.equal(r.calls.length,0);
    const a=h.loadCloseViewHero(),b=h.loadCloseViewHero();assert.equal(a,b);assert.equal(h.closeViewHeroAssetStatus(),'loading');for(let i=0;i<20;i++)assert.equal(h.closeViewHeroAssetStatus(),'loading');assert.equal(r.calls.length,0);
    release();const loaded=await a;assert.ok(loaded);assert.equal(h.closeViewHeroAssetStatus(),'ready');assert.equal(await h.loadCloseViewHero(),loaded);assert.equal(h.getCloseViewHeroAsset(),loaded);assert.equal(r.calls.length,4);assert.ok(r.calls.every(a=>a.length===1),'no new fetch options, retries or requests');
    assert.deepEqual(r.images,[{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'none'},{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'none'}]);
  });
});

test('every existing null/failure path becomes unavailable without changing promise caching or retry behavior',async()=>{
  for(const [failure,count]of [['network',1],['metadata-http',1],['metadata-json',1],['binary-http',2],['binary-read',2],['texture-http',3],['image-decode',3],['image-size',3],['asset-decode',4],['texture-layers',4]]){
    const r=responses(failure);await globals({window:{},fetch:r.fetch,createImageBitmap:r.createImageBitmap},async()=>{
      const h=await fresh(),pending=h.loadCloseViewHero();assert.equal(h.closeViewHeroAssetStatus(),'loading');assert.equal(await pending,null);assert.equal(h.closeViewHeroAssetStatus(),'unavailable',failure);assert.equal(h.getCloseViewHeroAsset(),null);assert.equal(h.loadCloseViewHero(),pending,'failed load keeps the original cached promise');assert.equal(await h.loadCloseViewHero(),null);for(let i=0;i<10;i++)assert.equal(h.closeViewHeroAssetStatus(),'unavailable');assert.equal(r.calls.length,count,failure);assert.equal(h.closeViewHeroAssetStatus().includes('private'),false);
    });
  }
});

test('server-side unsupported load remains inert and does not falsely claim a requested asset',async()=>{
  let requests=0;const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');delete globalThis.window;
  try{await globals({fetch:()=>{requests++;throw new Error('unexpected request');}},async()=>{const h=await fresh();assert.equal(await h.loadCloseViewHero(),null);assert.equal(h.closeViewHeroAssetStatus(),'not-requested');assert.equal(requests,0);});}finally{if(descriptor)Object.defineProperty(globalThis,'window',descriptor);}
});
