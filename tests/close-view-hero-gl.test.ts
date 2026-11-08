import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero} from '../src/close-view-hero.ts';
import {closeViewGLReady,prepareCloseViewHeroGL,resetCloseViewGL,drawSceneGL,GLB,closeViewGLStats} from '../src/close-view-gl.ts';
import {HERO_FRAGMENT_BODY} from '../src/close-view-hero-gl.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),b=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=()=>decodeCloseViewHero(meta,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),[{width:1024,height:1024},{width:1024,height:1024}]);
class GL {
  calls=[];program=null;depth=null;write=false;lost=false;uploads=0;dynamic=[];listeners={};
  constructor(){let id=1;const constants=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!constants.has(k))constants.set(k,id++);return constants.get(k);}return()=>{};}});}
  createShader(type){return{type};}shaderSource(s,text){s.text=text;}getShaderParameter(){return true;}createProgram(){return{shaders:[],uniforms:{}};}attachShader(p,s){p.shaders.push(s);}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}
  getProgramParameter(p,k){if(k===this.ACTIVE_UNIFORMS){p.unames=[...new Set(p.shaders.flatMap(s=>[...s.text.matchAll(/uniform\s+(?:highp\s+)?\w+\s+(\w+)/g)].map(m=>m[1])))];return p.unames.length;}if(k===this.ACTIVE_ATTRIBUTES){p.anames=[...p.shaders.find(s=>s.type===this.VERTEX_SHADER).text.matchAll(/\bin\s+\w+\s+(\w+)/g)].map(m=>m[1]);return p.anames.length;}return true;}
  getActiveUniform(p,i){return{name:p.unames[i]};}getActiveAttrib(p,i){return{name:p.anames[i]};}getUniformLocation(p,n){return n;}getAttribLocation(p,n){return p.anames.indexOf(n);}getExtension(){return null;}getError(){return this.NO_ERROR;}isContextLost(){return this.lost;}
  useProgram(p){this.program=p;}uniform1f(k,v){this.program.uniforms[k]=v;}depthFunc(d){this.depth=d;}depthMask(v){this.write=v;}texSubImage3D(){this.uploads++;}bufferSubData(t,o,d){this.dynamic.push(d.byteLength);}
  drawArrays(t,o,n){this.record('arrays',n);}drawElements(t,n){this.record('elements',n);}record(mode,n){const source=this.program.shaders.map(s=>s.text).join(' ');this.calls.push({mode,n,depth:this.depth,write:this.write,pass:this.program.uniforms.u_pass,hero:source.includes('sampler2DArray'),model:source.includes('in float a_alpha')});}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=GL;const gl=new GL(),listeners={},canvas={width:10,height:10,getContext:()=>gl,addEventListener:(n,f)=>listeners[n]=f};resetCloseViewGL();GLB.nBoard=0;GLB.nDecal=0;GLB.nGlowStart=0;try{assert.equal(closeViewGLReady(()=>canvas),true);run(gl,listeners);}finally{resetCloseViewGL();if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}
const U={env(){},wall(){},arch(){},decal(){}};
function frame(a){const s=createHeroPoseState(a),f=createHeroFrame(a);sampleCloseViewHero(a,s,{nowMs:0,reducedMotion:true,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,action:null,alpha:1,tint:[1,1,1],hitFlash:0},f);return f;}
test('asset/texture readiness gates admission; two original layers upload once',()=>gpu(gl=>{
  const a=asset();a.images=[];assert.equal(prepareCloseViewHeroGL(a),false);assert.equal(gl.uploads,0);a.images=[{width:1024,height:1024},{width:1024,height:1024}];assert.equal(prepareCloseViewHeroGL(a),true);assert.equal(gl.uploads,2);assert.equal(prepareCloseViewHeroGL(a),true);assert.equal(gl.uploads,2);
}));
test('hero has exactly two indexed draws; all silhouettes precede all actor depth writes',()=>gpu(gl=>{
  const a=asset(),f=frame(a);assert.ok(prepareCloseViewHeroGL(a));drawSceneGL({width:16,height:16},U,new Float32Array(30),f);
  const actors=gl.calls.filter(c=>c.hero||c.model);assert.deepEqual(actors.map(c=>[c.hero,c.pass,c.write]),[[false,1,false],[true,1,false],[false,0,true],[true,0,true]]);
  assert.equal(actors[1].depth,gl.GREATER);assert.equal(actors[3].depth,gl.LEQUAL);assert.equal(actors.filter(c=>c.mode==='elements').length,2);assert.deepEqual(gl.dynamic,[a.vertexCount*24]);assert.equal(closeViewGLStats.heroTriangles,3170);
}));
test('missing or unready hero leaves ordinary model draws available',()=>gpu(gl=>{
  const a=asset(),f=frame(a);drawSceneGL({width:16,height:16},U,new Float32Array(30),f);assert.equal(gl.calls.filter(c=>c.hero).length,0);assert.equal(gl.calls.filter(c=>c.model).length,2);
}));
test('restored context reuploads hero resources and failure stays bounded',()=>gpu((gl,listeners)=>{
  const a=asset();assert.ok(prepareCloseViewHeroGL(a));listeners.webglcontextrestored();assert.equal(prepareCloseViewHeroGL(a),false);assert.ok(closeViewGLReady(()=>({width:10,height:10,getContext:()=>gl,addEventListener(){}})));assert.ok(prepareCloseViewHeroGL(a));assert.equal(gl.uploads,4);
  gl.lost=true;assert.equal(prepareCloseViewHeroGL(a),false);
}));
test('shader keeps source head, common coverage and painted material treatment explicit',()=>{
  assert.match(HERO_FRAGMENT_BODY,/v_layer==1 \|\| v_class==0/);assert.match(HERO_FRAGMENT_BODY,/u_alpha <=/);assert.match(HERO_FRAGMENT_BODY,/sampler2DArray/);assert.match(HERO_FRAGMENT_BODY,/lightsAt\(v_pos,normalize\(v_nrm\),0\.0/);
  assert.ok(HERO_FRAGMENT_BODY.indexOf('v_class==4')<HERO_FRAGMENT_BODY.indexOf('v_layer==1'));
  assert.match(HERO_FRAGMENT_BODY,/v_class==4 && dot\(v_nrm,u_eye-v_pos\)<=0\.0/);
});
