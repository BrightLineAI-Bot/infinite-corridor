import test from 'node:test';
import assert from 'node:assert/strict';
import { drawBrawler, hammerfallPresentation } from '../src/brawler-spells.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
import { interiorArchAt, INTERIOR_TRAVERSAL } from '../src/vehicle-gates.ts';
const effect=(extra={})=>({kind:'hammerfall',brawler:true,x:3.25,y:4.75,delay:.32,life:.25,radius:1.5,pulseIndex:0,...extra});
const context=()=>{const calls=[];return {calls,ctx:new Proxy({setLineDash(){}},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>(o[k]=v,true)})};};
test('hammer descent is derived only from its own delay and pulse; Echo waits independently',()=>{
 const fx=effect(),before=structuredClone(fx),a=hammerfallPresentation(fx,{}),b=hammerfallPresentation({...fx,delay:.16},{}),c=hammerfallPresentation({...fx,delay:-.01},{});
 assert.ok(a.lift>b.lift&&b.lift>c.lift);assert.equal(c.lift,0);assert.equal(c.alpha,1);
 assert.equal(hammerfallPresentation({...fx,pulseIndex:1,life:.125},{}).alpha,.5);
 assert.equal(hammerfallPresentation({...fx,echo:true,delay:.54},{}).lift,a.lift);
 assert.equal(hammerfallPresentation({...fx,life:0},{}),null);assert.deepEqual(fx,before);
 assert.equal(a.x,fx.x);assert.equal(a.supportY,fx.y);
});
test('one immutable closed hammer model stays within the existing mesh budget and actual roof',()=>{
 assert.equal(modelTriangleCount('hammerfallConjuration'),60);
 for(const map of [{},{hall:{tall:true,ceilingHeight:9}}]){
  const p=hammerfallPresentation(effect(),map),out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);
  const n=writeCloseViewModel(out,0,{...p,z:p.lift,phase:0,amount:0,reduceMotion:true});assert.ok(n>0);assert.ok(out.slice(0,n).every(Number.isFinite));
  const zs=Array.from(out.slice(0,n)).filter((_,i)=>i%MODEL_FLOATS===2);assert.ok(Math.min(...zs)>=0);assert.ok(Math.max(...zs)<= (map.hall?8.85:2.25)+1e-5);
 }
});
test('capture keeps per-effect identity, warning and impact; rejected capture retains old hammer fallback',()=>{
 const a=effect(),b=effect({echo:true,delay:.54}),game={effects:[a,b],map:{},player:{}};
 const accepted=context(),records=[];drawBrawler(accepted.ctx,game,q=>[q.x*32,q.y*32],32,1,{captureActor:q=>(records.push(q),true)});
 assert.deepEqual(records.map(q=>q.source),[a,b]);assert.equal(accepted.calls.filter(q=>q[0]==='fillRect').length,0);assert.equal(accepted.calls.filter(q=>q[0]==='arc').length,2);
 const fallback=context();drawBrawler(fallback.ctx,game,q=>[q.x*32,q.y*32],32,1,{captureActor:()=>false});assert.equal(fallback.calls.filter(q=>q[0]==='fillRect').length,4);
 const old=context();drawBrawler(old.ctx,game,q=>[q.x*32,q.y*32],32,1);assert.deepEqual(fallback.calls,old.calls);
 a.delay=0;a.pulseIndex=1;const hit=context();drawBrawler(hit.ctx,{...game,effects:[a]},q=>[q.x*32,q.y*32],32,1,{captureActor:()=>true});assert.equal(hit.calls.filter(q=>q[0]==='arc').length,3);
});

import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}
test('actual frame admits effect mesh in the existing batch and keeps bounded overflow and GL recovery',()=>gpu(({screen,gl})=>{
 const {game:g}=createLabFixture({lab:'creature-assets',scenario:'corridor-golem',now:100000});g.golem=null;g.enemies=[];g.presentation={effectiveQuality:'low',reduceMotion:true};
 g.effects=Array.from({length:30},(_,i)=>effect({id:`hammer-${i}`,x:g.player.x+.7+(i%3)*.08,y:g.player.y+.8+(i%2)*.08,echo:i>0}));
 const before=structuredClone(g.effects),layer=(c,w,h,shots)=>drawRangedEffects(c,g,w,h,shots);CLOSE_VIEW_HOOKS.groundLayers.push(layer);
 try {resetCloseViewCamera();render(screen,g,390,844,100000);
  assert.ok(closeViewGLStats.auxKinds.hammerfallConjuration>0);assert.ok(closeViewGLStats.models<=8);assert.ok(closeViewGLStats.modelTriangles<=8*256);assert.ok(closeViewGLStats.drawCalls<=12);assert.deepEqual(g.effects,before);
  gl.isContextLost=()=>true;render(screen,g,390,844,100001);assert.deepEqual(g.effects,before);
  gl.isContextLost=()=>false;render(screen,g,390,844,100002);assert.ok(closeViewGLStats.auxKinds.hammerfallConjuration>0);assert.deepEqual(g.effects,before);
 } finally {CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(layer),1);}
}));

test('both physical arch orientations keep all 180 hammer vertices below the real clearance',()=>{
 for(const orientation of ['ns','ew']){
  const map={width:5,height:5,tiles:Array.from({length:25},()=>({kind:'floor',blocked:false}))};
  for(const [x,y] of orientation==='ns'?[[1,2],[3,2]]:[[2,1],[2,3]])map.tiles[y*5+x]={kind:'wall',blocked:true};
  assert.equal(interiorArchAt(map,2.5,2.5),orientation);
  const p=hammerfallPresentation(effect({x:2.5,y:2.5}),map),out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);
  const n=writeCloseViewModel(out,0,{...p,z:p.lift,phase:0,amount:0,reduceMotion:true});
  assert.equal(n/MODEL_FLOATS,180);const zs=Array.from(out.slice(0,n)).filter((_,i)=>i%MODEL_FLOATS===2);
  const cap=INTERIOR_TRAVERSAL.archClearance-.15;
  assert.ok(Math.min(...zs)>=0);assert.ok(Math.max(...zs)<=cap+1e-6);
  assert.ok(Math.abs(Math.max(...zs)-cap)<1e-6,orientation+' reaches bounded conjuration top');
 }
});
