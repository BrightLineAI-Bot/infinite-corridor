import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceDir=resolve(root,'docs/asset-sources/wayfarer-rogue'),expectedAssetDir=resolve(root,'assets/wayfarer'),tempRoot=resolve(tmpdir()),temporaryOutputs=[];
const makeOutput=()=>{const output=mkdtempSync(resolve(tempRoot,'wayfarer-converter-'));temporaryOutputs.push(output);return output;};
const generate=output=>spawnSync(process.execPath,[resolve(sourceDir,'convert.mjs'),'--out',output],{cwd:root,encoding:'utf8'});
const assetDir=makeOutput(),metaPath=resolve(assetDir,'rogue-v2.json'),binPath=resolve(assetDir,'rogue-v2.bin');
const sha=b=>createHash('sha256').update(b).digest('hex');
const readSource=name=>JSON.parse(gunzipSync(readFileSync(resolve(sourceDir,`${name}.gltf.gz`))).toString('utf8'));
const embedded=g=>Buffer.from(g.buffers[0].uri.split(',')[1],'base64');
const image=(g,b,i)=>{const v=g.bufferViews[g.images[i].bufferView];return b.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);};
const load=()=>({meta:JSON.parse(readFileSync(metaPath,'utf8')),bin:readFileSync(binPath)});
const typed=(meta,bin,key)=>{const a=meta.arrays[key],ctor=a.componentType==='f32'?Float32Array:a.componentType==='u16'?Uint16Array:Uint8Array;return new ctor(bin.buffer,bin.byteOffset+a.byteOffset,a.count);};

before(()=>{const result=generate(assetDir);assert.equal(result.status,0,result.stderr);});
after(()=>{for(const output of temporaryOutputs){const resolved=resolve(output);assert.equal(dirname(resolved),tempRoot,'Refusing to remove output outside the intended temporary root');assert.match(resolved.slice(tempRoot.length),/^[\\/]wayfarer-converter-/);rmSync(resolved,{recursive:true,force:true});}});

test('converter output has fixed geometry, topology and packed-array invariants',()=>{
  const {meta,bin}=load();
  assert.equal(meta.version,2);assert.equal(meta.vertexCount,3602);assert.equal(meta.indexCount,9510);assert.equal(meta.indexCount/3,3170);
  assert.equal(meta.derivatives.removedRogueHoodTriangles.length,144);assert.equal(meta.derivatives.collarSealIndexCount,18);assert.equal(meta.headAttachment.collarVertexIndices.length,6);
  assert.ok(meta.diagnostics.removedMinHeadInfluence>=.7946);assert.ok(meta.diagnostics.retainedMaxHeadInfluence<=.2281);
  assert.deepEqual(meta.diagnostics.collarBounds.min.map(x=>+x.toFixed(6)),[-.164792,1.958049,-.238973]);
  assert.deepEqual(meta.diagnostics.collarBounds.max.map(x=>+x.toFixed(6)),[.164792,1.997361,.114702]);
  assert.equal(meta.meshes.find(m=>m.name==='ClericHead').indexCount/3,1816);
  assert.deepEqual(meta.meshes.map(m=>m.node),[39,39,39,0,10,25,26,35,41,41]);
  for(const a of Object.values(meta.arrays))assert.equal(a.byteOffset%4,0);
  const ix=typed(meta,bin,'indices'),w=typed(meta,bin,'weights'),j=typed(meta,bin,'joints'),classes=typed(meta,bin,'paletteClasses');
  assert.ok([...ix].every(x=>x<meta.vertexCount));assert.ok([...j].every(Number.isFinite));
  assert.equal(new Set(ix).size,meta.vertexCount);
  const trianglesByClass=new Map();for(let i=0;i<ix.length;i+=3){const value=classes[ix[i]];assert.equal(classes[ix[i+1]],value);assert.equal(classes[ix[i+2]],value);trianglesByClass.set(value,(trianglesByClass.get(value)||0)+1);}
  assert.deepEqual(Object.fromEntries([...trianglesByClass].sort()),{'0':1816,'1':1070,'2':6,'3':274,'4':4});
  assert.equal(meta.diagnostics.protectedBodyTriangles,274);
  assert.deepEqual(meta.diagnostics.protectedRegionSourceNodes,[11,7,6,5,9,8,21,18,17,14,20,19]);
  for(const mesh of meta.meshes.slice(2,8))assert.ok(classes.subarray(mesh.firstVertex,mesh.firstVertex+mesh.vertexCount).every(value=>value===1));
  const head=meta.meshes.find(mesh=>mesh.name==='ClericHead'),headClasses=classes.subarray(head.firstVertex,head.firstVertex+head.vertexCount);assert.ok(headClasses.every(value=>value===0));
  const lenses=meta.meshes.find(mesh=>mesh.name==='ClericEyeLenses'),lensClasses=classes.subarray(lenses.firstVertex,lenses.firstVertex+lenses.vertexCount);assert.equal(lenses.vertexCount,8);assert.equal(lenses.indexCount,12);assert.ok(lensClasses.every(value=>value===4));
  assert.equal(meta.diagnostics.eyeLensTriangles,4);assert.deepEqual(meta.diagnostics.eyeLensCenters,[[-.1485,-.218,.515],[.1327,-.218,.515]]);assert.deepEqual(meta.diagnostics.eyeLensSize,[.14,.06]);assert.deepEqual(meta.diagnostics.eyeLensNormal,[0,0,1]);assert.deepEqual(meta.diagnostics.eyeLensUv,[.4985,.0447]);
  assert.equal(meta.diagnostics.eyeMaskMethod,'two head-local quads immediately behind the source mask apertures; original Cleric head remains class 0');
  for(let i=0;i<w.length;i+=4){const sum=w[i]+w[i+1]+w[i+2]+w[i+3];assert.ok(Number.isFinite(sum));assert.ok(sum===0||Math.abs(sum-1)<2e-4);}
  assert.equal(sha(bin),meta.binarySha256);
});

test('neck bridge exactly meets the collar and is pose-ready for Head3 skinning',()=>{
  const {meta,bin}=load(),positions=typed(meta,bin,'positions'),normals=typed(meta,bin,'normals'),uvs=typed(meta,bin,'uvs'),joints=typed(meta,bin,'joints'),weights=typed(meta,bin,'weights'),indices=typed(meta,bin,'indices'),classes=typed(meta,bin,'paletteClasses'),bridge=meta.meshes.find(mesh=>mesh.name==='NeckBridge'),lower=meta.derivatives.neckBridgeLowerRingVertexIndices;
  assert.deepEqual(meta.headAttachment.collarVertexIndices,[385,386,388,392,866,864]);assert.equal(meta.diagnostics.neckBridgeBottomSourceVertices.length,6);assert.equal(meta.diagnostics.neckBridgeTriangles,30);assert.equal(bridge.vertexCount,19);assert.equal(bridge.indexCount,90);assert.equal(meta.derivatives.neckBridgeFirstVertex,bridge.firstVertex);assert.deepEqual(lower,[bridge.firstVertex,bridge.firstVertex+1,bridge.firstVertex+2,bridge.firstVertex+3,bridge.firstVertex+4,bridge.firstVertex+5]);
  for(let i=0;i<6;i++){const bodyVertex=meta.headAttachment.collarVertexIndices[i],bridgeVertex=lower[i];assert.deepEqual([...positions.subarray(bridgeVertex*3,bridgeVertex*3+3)],[...positions.subarray(bodyVertex*3,bodyVertex*3+3)]);assert.deepEqual([...joints.subarray(bridgeVertex*4,bridgeVertex*4+4)],[...joints.subarray(bodyVertex*4,bodyVertex*4+4)]);assert.deepEqual([...weights.subarray(bridgeVertex*4,bridgeVertex*4+4)],[...weights.subarray(bodyVertex*4,bodyVertex*4+4)]);assert.ok(Number.isFinite(uvs[bridgeVertex*2])&&Number.isFinite(uvs[bridgeVertex*2+1]));}
  const headJoint=meta.diagnostics.neckBridgeHeadJoint;for(let vertex=bridge.firstVertex+6;vertex<bridge.firstVertex+bridge.vertexCount;vertex++){assert.deepEqual([...joints.subarray(vertex*4,vertex*4+4)],[headJoint,0,0,0]);assert.deepEqual([...weights.subarray(vertex*4,vertex*4+4)],[1,0,0,0]);assert.equal(classes[vertex],1);}
  assert.equal(meta.diagnostics.neckBridgeFabricSourceTriangle,284);assert.deepEqual(meta.diagnostics.neckBridgeFabricUv,[.3451729516,.5624372562]);for(let vertex=bridge.firstVertex;vertex<bridge.firstVertex+bridge.vertexCount;vertex++)assert.deepEqual([...uvs.subarray(vertex*2,vertex*2+2)].map(value=>+value.toFixed(7)),[.3451729,.5624372]);
  for(let offset=bridge.firstIndex;offset<bridge.firstIndex+bridge.indexCount;offset+=3){const a=indices[offset],b=indices[offset+1],c=indices[offset+2],ab=[positions[b*3]-positions[a*3],positions[b*3+1]-positions[a*3+1],positions[b*3+2]-positions[a*3+2]],ac=[positions[c*3]-positions[a*3],positions[c*3+1]-positions[a*3+1],positions[c*3+2]-positions[a*3+2]],area=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]);assert.ok(Number.isFinite(area)&&area>1e-6);}
  for(let vertex=bridge.firstVertex;vertex<bridge.firstVertex+bridge.vertexCount;vertex++)assert.ok(Number.isFinite(normals[vertex*3])&&Number.isFinite(normals[vertex*3+1])&&Number.isFinite(normals[vertex*3+2]));
  assert.deepEqual(meta.diagnostics.neckBridgeHeadLocalRings,{middle:{radius:.13,y:-.045,zCenter:-.075,zRadius:.14},top:{radius:.105,y:.08,zCenter:-.075,zRadius:.11}});
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
  const names=['rogue-v2.json','rogue-v2.bin','rogue-body.png','cleric-head.png'],second=makeOutput(),result=generate(second);
  assert.equal(result.status,0,result.stderr);for(const name of names){const firstBytes=readFileSync(resolve(assetDir,name)),secondBytes=readFileSync(resolve(second,name)),expectedBytes=readFileSync(resolve(expectedAssetDir,name));assert.deepEqual(secondBytes,firstBytes,`${name} differs across isolated generations`);if(name==='rogue-v2.json')assert.equal(firstBytes.toString('utf8'),expectedBytes.toString('utf8').replace(/\r\n/g,'\n'),`${name} differs from the checked-in artifact`);else assert.deepEqual(firstBytes,expectedBytes,`${name} differs from the checked-in artifact`);}
});
