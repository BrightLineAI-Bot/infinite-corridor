import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceDir=resolve(root,'docs/asset-sources/wayfarer-rogue'),assetDir=resolve(root,'assets/wayfarer');
const metaPath=resolve(assetDir,'rogue-v2.json'),binPath=resolve(assetDir,'rogue-v2.bin');
const sha=b=>createHash('sha256').update(b).digest('hex');
const readSource=name=>JSON.parse(gunzipSync(readFileSync(resolve(sourceDir,`${name}.gltf.gz`))).toString('utf8'));
const embedded=g=>Buffer.from(g.buffers[0].uri.split(',')[1],'base64');
const image=(g,b,i)=>{const v=g.bufferViews[g.images[i].bufferView];return b.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);};
const load=()=>({meta:JSON.parse(readFileSync(metaPath,'utf8')),bin:readFileSync(binPath)});
const typed=(meta,bin,key)=>{const a=meta.arrays[key],ctor=a.componentType==='f32'?Float32Array:a.componentType==='u16'?Uint16Array:Uint8Array;return new ctor(bin.buffer,bin.byteOffset+a.byteOffset,a.count);};

test('converter output has fixed geometry, topology and packed-array invariants',()=>{
  const {meta,bin}=load();
  assert.equal(meta.version,2);assert.equal(meta.vertexCount,3575);assert.equal(meta.indexCount,9408);assert.equal(meta.indexCount/3,3136);
  assert.equal(meta.derivatives.removedRogueHoodTriangles.length,144);assert.equal(meta.derivatives.collarSealIndexCount,18);assert.equal(meta.headAttachment.collarVertexIndices.length,6);
  assert.ok(meta.diagnostics.removedMinHeadInfluence>=.7946);assert.ok(meta.diagnostics.retainedMaxHeadInfluence<=.2281);
  assert.deepEqual(meta.diagnostics.collarBounds.min.map(x=>+x.toFixed(6)),[-.164792,1.958049,-.238973]);
  assert.deepEqual(meta.diagnostics.collarBounds.max.map(x=>+x.toFixed(6)),[.164792,1.997361,.114702]);
  assert.equal(meta.meshes.find(m=>m.name==='ClericHead').indexCount/3,1816);
  assert.deepEqual(meta.meshes.map(m=>m.node),[39,39,0,10,25,26,35,41]);
  for(const a of Object.values(meta.arrays))assert.equal(a.byteOffset%4,0);
  const ix=typed(meta,bin,'indices'),w=typed(meta,bin,'weights'),j=typed(meta,bin,'joints'),classes=typed(meta,bin,'paletteClasses');
  assert.ok([...ix].every(x=>x<meta.vertexCount));assert.ok([...j].every(Number.isFinite));
  assert.equal(new Set(ix).size,meta.vertexCount);
  const trianglesByClass=new Map();for(let i=0;i<ix.length;i+=3){const value=classes[ix[i]];assert.equal(classes[ix[i+1]],value);assert.equal(classes[ix[i+2]],value);trianglesByClass.set(value,(trianglesByClass.get(value)||0)+1);}
  assert.deepEqual(Object.fromEntries([...trianglesByClass].sort()),{'0':1816,'1':1040,'2':6,'3':274});
  assert.equal(meta.diagnostics.protectedBodyTriangles,274);
  assert.deepEqual(meta.diagnostics.protectedRegionSourceNodes,[11,7,6,5,9,8,21,18,17,14,20,19]);
  for(const mesh of meta.meshes.slice(2,7))assert.ok(classes.subarray(mesh.firstVertex,mesh.firstVertex+mesh.vertexCount).every(value=>value===1));
  const head=meta.meshes.find(mesh=>mesh.name==='ClericHead');assert.ok(classes.subarray(head.firstVertex,head.firstVertex+head.vertexCount).every(value=>value===0));
  for(let i=0;i<w.length;i+=4){const sum=w[i]+w[i+1]+w[i+2]+w[i+3];assert.ok(Number.isFinite(sum));assert.ok(sum===0||Math.abs(sum-1)<2e-4);}
  assert.equal(sha(bin),meta.binarySha256);
});

test('source hierarchy, complete clips and independent foot translations are retained',()=>{
  const rogue=readSource('Rogue'),cleric=readSource('Cleric'),{meta}=load(),parents=new Int16Array(rogue.nodes.length).fill(-1);
  rogue.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parents[c]=i));
  assert.equal(meta.nodes.length,42);assert.equal(meta.skins[0].joints.length,32);
  for(let i=0;i<41;i++){assert.equal(meta.nodes[i].parent,parents[i]);assert.deepEqual(meta.nodes[i].translation,rogue.nodes[i].translation||[0,0,0]);assert.deepEqual(meta.nodes[i].rotation,rogue.nodes[i].rotation||[0,0,0,1]);assert.deepEqual(meta.nodes[i].scale,rogue.nodes[i].scale||[1,1,1]);}
  assert.deepEqual(meta.nodes[41],{name:'ClericHead',parent:3,translation:cleric.nodes[1].translation,rotation:cleric.nodes[1].rotation,scale:[1,1,1]});
  assert.equal(meta.clips.length,12);assert.deepEqual(meta.clips.map(c=>c.name),rogue.animations.map(a=>a.name));
  for(let i=0;i<12;i++){assert.equal(meta.clips[i].channels.length,rogue.animations[i].channels.length);assert.ok(meta.clips[i].channels.every(c=>c.interpolation==='LINEAR'));}
  const footTranslations=meta.clips.flatMap(c=>c.channels).filter(c=>c.path==='translation'&&[4,5,14,24,34,36].includes(c.node));
  assert.equal(footTranslations.length,72);
});

test('original source textures and provenance hashes are byte exact',()=>{
  const provenance=JSON.parse(readFileSync(resolve(sourceDir,'provenance.json'),'utf8')),rogueRaw=gunzipSync(readFileSync(resolve(sourceDir,'Rogue.gltf.gz'))),clericRaw=gunzipSync(readFileSync(resolve(sourceDir,'Cleric.gltf.gz'))),rogue=JSON.parse(rogueRaw),cleric=JSON.parse(clericRaw),{meta}=load();
  assert.equal(sha(rogueRaw),provenance.sourceSha256);assert.equal(sha(clericRaw),provenance.headSource.sha256);
  assert.deepEqual(readFileSync(resolve(assetDir,'rogue-body.png')),image(rogue,embedded(rogue),0));
  assert.deepEqual(readFileSync(resolve(assetDir,'cleric-head.png')),image(cleric,embedded(cleric),0));
  assert.deepEqual(meta.textures.map(t=>t.sha256),['540694206878779aa43f8f17524062e88bea35d2bb666b3f2081d23079a081d3','f17f9208cb86fd98db429bf8a1a0edc97c713a8357a44a392e562047bc0fe913']);
});

test('regeneration is deterministic and offline',()=>{
  const names=['rogue-v2.json','rogue-v2.bin','rogue-body.png','cleric-head.png'],before=names.map(n=>sha(readFileSync(resolve(assetDir,n))));
  const result=spawnSync(process.execPath,[resolve(sourceDir,'convert.mjs')],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.deepEqual(names.map(n=>sha(readFileSync(resolve(assetDir,n)))),before);
});
