import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../../..'),outDir=resolve(root,'assets/wayfarer');
const provenance=JSON.parse(readFileSync(resolve(here,'provenance.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const expect=(condition,message)=>{if(!condition)throw new Error(message);};

function source(name,archiveSha,rawSha){
  const archive=readFileSync(resolve(here,name));
  expect(sha(archive)===archiveSha,`${name} archive hash mismatch`);
  const raw=gunzipSync(archive);
  expect(sha(raw)===rawSha,`${name} upstream hash mismatch`);
  const gltf=JSON.parse(raw.toString('utf8'));
  expect(gltf.buffers.length===1&&gltf.buffers[0].uri.startsWith('data:'),`${name} must have one embedded buffer`);
  const buffer=Buffer.from(gltf.buffers[0].uri.split(',')[1],'base64');
  expect(buffer.length===gltf.buffers[0].byteLength,`${name} embedded buffer length mismatch`);
  return {gltf,buffer,rawBytes:raw.length,rawSha:sha(raw),archiveSha:sha(archive)};
}
const rogue=source(provenance.archiveFile,provenance.archiveSha256,provenance.sourceSha256);
const cleric=source(provenance.headSource.archiveFile,provenance.headSource.archiveSha256,provenance.headSource.sha256);

const components={5121:{bytes:1,Array:Uint8Array},5123:{bytes:2,Array:Uint16Array},5125:{bytes:4,Array:Uint32Array},5126:{bytes:4,Array:Float32Array}};
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessor(src,index){
  const a=src.gltf.accessors[index],view=src.gltf.bufferViews[a.bufferView],info=components[a.componentType],width=widths[a.type];
  expect(a&&!a.sparse&&view&&info&&width,`Unsupported accessor ${index}`);
  const stride=view.byteStride||info.bytes*width,start=(view.byteOffset||0)+(a.byteOffset||0),out=new info.Array(a.count*width);
  for(let i=0;i<a.count;i++)for(let q=0;q<width;q++){
    const offset=start+i*stride+q*info.bytes;
    out[i*width+q]=info.bytes===1?src.buffer.readUInt8(offset):info.bytes===2?src.buffer.readUInt16LE(offset):a.componentType===5125?src.buffer.readUInt32LE(offset):src.buffer.readFloatLE(offset);
  }
  return out;
}
function image(src,index){const im=src.gltf.images[index],v=src.gltf.bufferViews[im.bufferView];return src.buffer.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);}
function parents(nodes){const out=new Int16Array(nodes.length).fill(-1);nodes.forEach((n,i)=>(n.children||[]).forEach(c=>{expect(out[c]===-1,`Node ${c} has multiple parents`);out[c]=i;}));return out;}
const rogueParents=parents(rogue.gltf.nodes);

const positions=[],normals=[],uvs=[],joints=[],weights=[],indices=[],materialLayers=[],paletteClasses=[],meshes=[];
const paletteNames=['source','wayfarer-body','collar-seal','protected-body-skin-region','warm-amber-eyes'];
const copy=(target,values)=>{for(const value of values)target.push(value);};
function addMesh({src,meshIndex,node,skin,layer,palette,name,triangleFilter=null,trianglePalette=null}){
  const primitive=src.gltf.meshes[meshIndex].primitives[0],p=accessor(src,primitive.attributes.POSITION),n=accessor(src,primitive.attributes.NORMAL),uv=accessor(src,primitive.attributes.TEXCOORD_0),ix=accessor(src,primitive.indices);
  const j=skin>=0?accessor(src,primitive.attributes.JOINTS_0):new Uint16Array(p.length/3*4),w=skin>=0?accessor(src,primitive.attributes.WEIGHTS_0):new Float32Array(p.length/3*4);
  expect(p.length/3===n.length/3&&p.length/3===uv.length/2&&p.length/3===j.length/4&&p.length/3===w.length/4,`${name} attribute count mismatch`);
  const kept=[],removed=[];
  for(let t=0;t<ix.length/3;t++)(triangleFilter&&triangleFilter(t,ix,p)?removed:kept).push(t);
  const firstVertex=positions.length/3,firstIndex=indices.length;
  const sourceToGlobal=new Map(),splitToGlobal=new Map(),trianglePalettes=[];
  for(const t of kept){const triangleClass=trianglePalette?trianglePalette(t,ix,j,w):palette;trianglePalettes.push(triangleClass);for(let q=0;q<3;q++){const sourceVertex=ix[t*3+q],key=`${sourceVertex}:${triangleClass}`;let globalVertex=splitToGlobal.get(key);if(globalVertex===undefined){globalVertex=positions.length/3;splitToGlobal.set(key,globalVertex);if(!sourceToGlobal.has(sourceVertex))sourceToGlobal.set(sourceVertex,globalVertex);copy(positions,p.subarray(sourceVertex*3,sourceVertex*3+3));copy(normals,n.subarray(sourceVertex*3,sourceVertex*3+3));copy(uvs,uv.subarray(sourceVertex*2,sourceVertex*2+2));copy(joints,j.subarray(sourceVertex*4,sourceVertex*4+4));copy(weights,w.subarray(sourceVertex*4,sourceVertex*4+4));materialLayers.push(layer);paletteClasses.push(triangleClass);}indices.push(globalVertex);}}
  const vertexCount=positions.length/3-firstVertex;
  meshes.push({name,node,skin,firstVertex,vertexCount,firstIndex,indexCount:kept.length*3,materialLayer:layer,paletteClass:paletteNames[palette]});
  return {p,n,uv,j,w,ix,kept,removed,firstVertex,firstIndex,sourceToGlobal,trianglePalettes};
}

const protectedNodes=new Set([11,7,6,5,9,8,21,18,17,14,20,19]),protectedJoints=new Set(rogue.gltf.skins[0].joints.map((node,index)=>protectedNodes.has(node)?index:-1).filter(index=>index>=0));
expect(protectedJoints.size===protectedNodes.size,'One or more protected-region joints are absent from the Rogue skin');
const protectedTriangle=(t,ix,j,w)=>{for(let q=0;q<3;q++){const vertex=ix[t*3+q];let influence=0;for(let k=0;k<4;k++)if(protectedJoints.has(j[vertex*4+k]))influence+=w[vertex*4+k];if(influence<.5)return 1;}return 3;};
const body=addMesh({src:rogue,meshIndex:0,node:39,skin:0,layer:0,palette:1,name:'RogueBody',triangleFilter:(t,ix,p)=>Math.max(p[ix[t*3]*3+1],p[ix[t*3+1]*3+1],p[ix[t*3+2]*3+1])>2,trianglePalette:protectedTriangle});
expect(body.removed.length===144,`Expected 144 hood triangles, got ${body.removed.length}`);
const protectedBodyTriangles=body.trianglePalettes.filter(value=>value===3).length;
expect(protectedBodyTriangles>0,'Protected body joint mask selected no triangles');
const headJoint=rogue.gltf.skins[0].joints.indexOf(3);
expect(headJoint>=0,'Rogue Head node is missing from the skin joint list');
const triangleHeadInfluence=t=>{let maximum=0;for(let q=0;q<3;q++){const vertex=body.ix[t*3+q];for(let k=0;k<4;k++)if(body.j[vertex*4+k]===headJoint)maximum=Math.max(maximum,body.w[vertex*4+k]);}return maximum;};
const removedMinHeadInfluence=Math.min(...body.removed.map(triangleHeadInfluence)),retainedMaxHeadInfluence=Math.max(...body.kept.map(triangleHeadInfluence));
expect(removedMinHeadInfluence>=.7946,`Removed hood Head influence below contract: ${removedMinHeadInfluence}`);
expect(retainedMaxHeadInfluence<=.2281,`Retained body Head influence above contract: ${retainedMaxHeadInfluence}`);

const keyOf=(p,i)=>`${p[i*3].toFixed(6)},${p[i*3+1].toFixed(6)},${p[i*3+2].toFixed(6)}`;
const edgeCounts=new Map(),edgeVertices=new Map(),representative=new Map();
for(const t of body.kept){const tri=[body.ix[t*3],body.ix[t*3+1],body.ix[t*3+2]];for(let q=0;q<3;q++){const a=tri[q],b=tri[(q+1)%3],ka=keyOf(body.p,a),kb=keyOf(body.p,b),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;edgeCounts.set(key,(edgeCounts.get(key)||0)+1);edgeVertices.set(key,[ka,kb]);if(!representative.has(ka))representative.set(ka,a);if(!representative.has(kb))representative.set(kb,b);}}
const seamEdges=[...edgeCounts].filter(([key,count])=>count===1&&key.split('|').every(k=>{const y=Number(k.split(',')[1]);return y>=1.958&&y<=1.998;})).map(([key])=>edgeVertices.get(key));
expect(seamEdges.length===6,`Expected six collar boundary edges, got ${seamEdges.length}`);
const next=new Map();for(const [a,b] of seamEdges){if(!next.has(a))next.set(a,[]);if(!next.has(b))next.set(b,[]);next.get(a).push(b);next.get(b).push(a);}
expect(next.size===6&&[...next.values()].every(v=>v.length===2),'Collar boundary is not a six-edge loop');
const start=[...next.keys()].sort()[0],loopKeys=[start];let previous=null,current=start;
while(loopKeys.length<6){const choices=next.get(current).filter(v=>v!==previous);const chosen=loopKeys.length===1?choices.sort()[0]:choices[0];previous=current;current=chosen;loopKeys.push(current);}
expect(next.get(loopKeys[5]).includes(loopKeys[0]),'Collar loop does not close');
const loop=loopKeys.map(key=>representative.get(key));
const area=loop.reduce((s,a,i)=>{const b=loop[(i+1)%loop.length];return s+body.p[a*3]*body.p[b*3+2]-body.p[b*3]*body.p[a*3+2];},0);
if(area<0)loop.reverse();
const collarVertexIndices=loop.map(i=>body.sourceToGlobal.get(i)),sealFirstVertex=positions.length/3,center={p:[0,0,0],n:[0,0,0],uv:[0,0],w:new Map()};
for(const i of loop){for(let q=0;q<3;q++){center.p[q]+=body.p[i*3+q]/6;center.n[q]+=body.n[i*3+q]/6;}for(let q=0;q<2;q++)center.uv[q]+=body.uv[i*2+q]/6;for(let q=0;q<4;q++){const value=body.w[i*4+q];if(value)center.w.set(body.j[i*4+q],(center.w.get(body.j[i*4+q])||0)+value/6);}}
const influence=[...center.w].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=influence.reduce((s,x)=>s+x[1],0);while(influence.length<4)influence.push([0,0]);
for(const i of loop){copy(positions,body.p.subarray(i*3,i*3+3));copy(normals,body.n.subarray(i*3,i*3+3));copy(uvs,body.uv.subarray(i*2,i*2+2));copy(joints,body.j.subarray(i*4,i*4+4));copy(weights,body.w.subarray(i*4,i*4+4));materialLayers.push(0);paletteClasses.push(2);}
copy(positions,center.p);const nl=Math.hypot(...center.n)||1;copy(normals,center.n.map(x=>x/nl));copy(uvs,center.uv);copy(joints,influence.map(x=>x[0]));copy(weights,influence.map(x=>x[1]/sum));materialLayers.push(0);paletteClasses.push(2);
const collarSealFirstIndex=indices.length;for(let i=0;i<6;i++)indices.push(sealFirstVertex+i,sealFirstVertex+(i+1)%6,sealFirstVertex+6);
meshes.push({name:'CollarSeal',node:39,skin:0,firstVertex:sealFirstVertex,vertexCount:7,firstIndex:collarSealFirstIndex,indexCount:18,materialLayer:0,paletteClass:'collar-seal'});

for(const node of [0,10,25,26,35]){const sourceNode=rogue.gltf.nodes[node];addMesh({src:rogue,meshIndex:sourceNode.mesh,node,skin:-1,layer:0,palette:1,name:sourceNode.name});}
const head=addMesh({src:cleric,meshIndex:1,node:41,skin:-1,layer:1,palette:0,name:'ClericHead'});
expect(head.ix.length/3===1816&&head.p.length/3===2254,'Cleric head source counts mismatch');
const eyeLensFirstVertex=positions.length/3,eyeLensFirstIndex=indices.length,eyeUv=[.4985,.0447],eyeCenters=[[-.1485,-.218,.515],[.1327,-.218,.515]],eyeHalfWidth=.07,eyeHalfHeight=.03;
for(const [x,y,z] of eyeCenters)for(const [dx,dy] of [[-eyeHalfWidth,-eyeHalfHeight],[eyeHalfWidth,-eyeHalfHeight],[eyeHalfWidth,eyeHalfHeight],[-eyeHalfWidth,eyeHalfHeight]]){copy(positions,[x+dx,y+dy,z]);copy(normals,[0,0,1]);copy(uvs,eyeUv);copy(joints,[0,0,0,0]);copy(weights,[0,0,0,0]);materialLayers.push(1);paletteClasses.push(4);}
for(let eye=0;eye<2;eye++){const base=eyeLensFirstVertex+eye*4;indices.push(base,base+1,base+2,base,base+2,base+3);}
meshes.push({name:'ClericEyeLenses',node:41,skin:-1,firstVertex:eyeLensFirstVertex,vertexCount:8,firstIndex:eyeLensFirstIndex,indexCount:12,materialLayer:1,paletteClass:'warm-amber-eyes'});
expect(indices.length/3===3140,`Expected 3140 total triangles with eye lenses, got ${indices.length/3}`);
expect(positions.length/3<=65535&&Math.max(...indices)<positions.length/3,'Global indices are not legal u16');

for(let i=0;i<weights.length;i+=4){const total=weights[i]+weights[i+1]+weights[i+2]+weights[i+3];expect(Number.isFinite(total),`Non-finite weights at vertex ${i/4}`);if(total>0)expect(Math.abs(total-1)<2e-4,`Unnormalized weights at vertex ${i/4}: ${total}`);}

const nodes=rogue.gltf.nodes.map((n,i)=>({name:n.name||`node${i}`,parent:rogueParents[i],translation:n.translation||[0,0,0],rotation:n.rotation||[0,0,0,1],scale:n.scale||[1,1,1]}));
expect(nodes.length===41,'Expected 41 original Rogue nodes');
const clericHeadNode=cleric.gltf.nodes[1];nodes.push({name:'ClericHead',parent:3,translation:clericHeadNode.translation||[0,0,0],rotation:clericHeadNode.rotation||[0,0,0,1],scale:clericHeadNode.scale||[1,1,1]});

const packed=[],arrays={};let binaryLength=0;
function pack(key,typed,componentType){const bytes=Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength),padding=(4-binaryLength%4)%4;if(padding){packed.push(Buffer.alloc(padding));binaryLength+=padding;}arrays[key]={byteOffset:binaryLength,count:typed.length,componentType};packed.push(bytes);binaryLength+=bytes.length;}
pack('positions',Float32Array.from(positions),'f32');pack('normals',Float32Array.from(normals),'f32');pack('uvs',Float32Array.from(uvs),'f32');pack('joints',Uint16Array.from(joints),'u16');pack('weights',Float32Array.from(weights),'f32');pack('indices',Uint16Array.from(indices),'u16');pack('materialLayers',Uint8Array.from(materialLayers),'u8');pack('paletteClasses',Uint8Array.from(paletteClasses),'u8');
const inverseBind=accessor(rogue,rogue.gltf.skins[0].inverseBindMatrices);pack('inverseBindMatrices',Float32Array.from(inverseBind),'f32');
const clips=rogue.gltf.animations.map((animation,clipIndex)=>{let duration=0;const channels=animation.channels.map((channel,channelIndex)=>{const sampler=animation.samplers[channel.sampler],times=accessor(rogue,sampler.input),values=accessor(rogue,sampler.output),base=`clip${clipIndex}Channel${channelIndex}`;expect((sampler.interpolation||'LINEAR')==='LINEAR',`Non-LINEAR animation in ${animation.name}`);duration=Math.max(duration,...times);pack(`${base}Times`,Float32Array.from(times),'f32');pack(`${base}Values`,Float32Array.from(values),'f32');return {node:channel.target.node,path:channel.target.path,times:`${base}Times`,values:`${base}Values`,interpolation:'LINEAR'};});return {name:animation.name,duration,channels};});
expect(clips.length===12,'Expected 12 Rogue clips');
const footTranslationChannels=clips.flatMap(c=>c.channels.map(ch=>({clip:c.name,...ch}))).filter(ch=>ch.path==='translation'&&[4,5,14,24,34,36].includes(ch.node));
expect(footTranslationChannels.length>0,'Expected independent foot translation tracks');

const bodyTexture=image(rogue,0),headTexture=image(cleric,0);
expect(bodyTexture.length>24&&headTexture.length>24&&bodyTexture.readUInt32BE(16)===1024&&bodyTexture.readUInt32BE(20)===1024&&headTexture.readUInt32BE(16)===1024&&headTexture.readUInt32BE(20)===1024,'Expected original 1024-square PNG textures');
const binary=Buffer.concat(packed,binaryLength);mkdirSync(outDir,{recursive:true});
writeFileSync(resolve(outDir,'rogue-v2.bin'),binary);writeFileSync(resolve(outDir,'rogue-body.png'),bodyTexture);writeFileSync(resolve(outDir,'cleric-head.png'),headTexture);
const metadata={version:2,sources:[{id:'rogue',sha256:rogue.rawSha,license:'CC0-1.0'},{id:'cleric',sha256:cleric.rawSha,license:'CC0-1.0'}],binary:'rogue-v2.bin',binarySha256:sha(binary),textures:[{layer:0,file:'rogue-body.png',width:1024,height:1024,sha256:sha(bodyTexture)},{layer:1,file:'cleric-head.png',width:1024,height:1024,sha256:sha(headTexture)}],vertexCount:positions.length/3,indexCount:indices.length,arrays,nodes,skins:[{joints:rogue.gltf.skins[0].joints,inverseBindMatrices:'inverseBindMatrices'}],meshes,clips,sockets:{right:{node:16},left:{node:6}},reference:{clip:'Idle',time:0,headNode:3,bodyNode:33,rootNode:38},headAttachment:{node:41,parent:3,source:'cleric',sourceNode:1,defaultScale:.40,seatOverlap:.01,collarVertexIndices},derivatives:{removedRogueHoodTriangles:body.removed,collarSealFirstIndex,collarSealIndexCount:18},diagnostics:{bodyTriangles:indices.length/3,removedHoodTriangles:body.removed.length,removedMinHeadInfluence,retainedMaxHeadInfluence,protectedBodyTriangles,protectedRegionSourceNodes:[...protectedNodes],eyeLensTriangles:4,eyeLensCenters:eyeCenters,eyeLensSize:[eyeHalfWidth*2,eyeHalfHeight*2],eyeLensNormal:[0,0,1],eyeLensUv:eyeUv,eyeMaskMethod:'two head-local quads immediately behind the source mask apertures; original Cleric head remains class 0',collarBoundaryEdges:seamEdges.length,collarBounds:{min:[Math.min(...loop.map(i=>body.p[i*3])),Math.min(...loop.map(i=>body.p[i*3+1])),Math.min(...loop.map(i=>body.p[i*3+2]))],max:[Math.max(...loop.map(i=>body.p[i*3])),Math.max(...loop.map(i=>body.p[i*3+1])),Math.max(...loop.map(i=>body.p[i*3+2]))]},originalRogueNodes:41,sourceJoints:rogue.gltf.skins[0].joints.length,clips:clips.length,footTranslationChannels:footTranslationChannels.length,textureBytes:[bodyTexture.length,headTexture.length],archiveSha256:[rogue.archiveSha,cleric.archiveSha],rawSourceBytes:[rogue.rawBytes,cleric.rawBytes],paletteClassification:'Palette classes: source 0; wayfarer-body 1; collar-seal 2; protected-body-skin-region 3; warm-amber-eyes 4. Class 4 is two explicit aperture-backed lens quads; original source head and raster pixels are unchanged.'}};
writeFileSync(resolve(outDir,'rogue-v2.json'),`${JSON.stringify(metadata,null,2)}\n`);
console.log(JSON.stringify({vertexCount:metadata.vertexCount,indexCount:metadata.indexCount,triangles:metadata.indexCount/3,binaryBytes:binary.length,binarySha256:metadata.binarySha256,textures:metadata.textures,removedHoodTriangles:body.removed.length,collarBoundaryEdges:seamEdges.length,clips:clips.length}));
