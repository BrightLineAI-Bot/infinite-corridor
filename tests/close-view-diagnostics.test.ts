import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {render} from '../src/renderer.ts';
import {closeViewRenderDiagnostics,CLOSE_VIEW_HOOKS,resetCloseViewCamera,setCloseViewCanvasFactory} from '../src/close-view.ts';
import {closeViewGLReady,closeViewGLDiagnostics,closeViewGLFrameReady,prepareCloseViewHeroGL,resetCloseViewGL,closeViewGLStats} from '../src/close-view-gl.ts';
import {loadCloseViewHero,decodeCloseViewHero} from '../src/close-view-hero.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),bytes=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const binary=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),asset=()=>decodeCloseViewHero(meta,binary,[{width:1024,height:1024},{width:1024,height:1024}]);
class GL{
  log=[];lost=false;fault='';heroFail=false;NO_ERROR=0;error=0;program=null;
  constructor(){let id=1;const constants=new Map();return new Proxy(this,{get:(o,k,receiver)=>{if(k in o){if(typeof o[k]==='function')return(...a)=>{o.log.push(k);return o[k].apply(receiver,a);};return o[k];}if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!constants.has(k))constants.set(k,id++);return constants.get(k);}return(...a)=>o.log.push(k);}});}
  createShader(){return{};}shaderSource(s,text){s.text=text;}getShaderParameter(s){return !(this.heroFail&&s.text?.includes('sampler2DArray'));}getShaderInfoLog(){return 'private-driver-log https://private.invalid/';}
  createProgram(){return{};}getProgramParameter(_p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}
  getExtension(){return null;}getError(){const error=this.error;this.error=0;return error;}isContextLost(){return this.lost;}
  texSubImage3D(){if(this.fault==='hero-upload')throw new Error('private upload details');}
  drawArrays(){if(this.fault==='draw')throw new Error('private draw details');}drawElements(){if(this.fault==='draw')throw new Error('private draw details');}
}
function context(){return new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
function gpu(run){const previous=globalThis.WebGL2RenderingContext,gl=new GL(),listeners={},screen=context();screen.canvas={width:390,height:844};globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>({width:390,height:844,addEventListener:(n,f)=>listeners[n]=f,getContext:k=>k==='webgl2'?gl:context()}));CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();resetCloseViewCamera();try{return run({gl,listeners,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();resetCloseViewCamera();setCloseViewCanvasFactory(null);if(previous===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=previous;}}
const game=()=>{const g=createLabFixture({lab:'combat-assets',scenario:'cleaver-echo-inspection',now:100000}).game;g.presentation={effectiveQuality:'full',reduceMotion:true};return g;};

test('diagnostic getters observe without initializing rendering, loading assets or exposing mutable renderer state',()=>{
  const previous=globalThis.fetch;let fetches=0;globalThis.fetch=()=>{fetches++;throw new Error('unexpected fetch');};
  try{resetCloseViewGL();const a=closeViewRenderDiagnostics();for(let i=0;i<10;i++){assert.deepEqual(closeViewRenderDiagnostics(),a);assert.deepEqual(closeViewGLDiagnostics(),a.gpu);}a.fallbacks.body=999;a.gpu.lastFailure='changed';assert.equal(closeViewRenderDiagnostics().fallbacks.body,undefined);assert.notEqual(closeViewGLDiagnostics().lastFailure,'changed');assert.equal(fetches,0);}finally{globalThis.fetch=previous;}
});

test('unavailable GPU and context-loss categories remain coarse historical observations across reset',()=>{
  const old=globalThis.WebGL2RenderingContext;delete globalThis.WebGL2RenderingContext;let contexts=0;try{resetCloseViewGL();assert.equal(closeViewGLReady(()=>{contexts++;}),false);assert.equal(contexts,0);assert.equal(closeViewGLDiagnostics().lastFailure,'no-webgl2');resetCloseViewGL();assert.equal(closeViewGLDiagnostics().lastFailure,'no-webgl2');}finally{if(old!==undefined)globalThis.WebGL2RenderingContext=old;}
  gpu(({gl,listeners})=>{assert.equal(closeViewGLReady(()=>({getContext:()=>null})),false);assert.equal(closeViewGLDiagnostics().lastFailure,'no-context');resetCloseViewGL();assert.equal(closeViewGLReady(()=>({getContext:()=>gl,addEventListener:(n,f)=>listeners[n]=f})),true);const before=gl.log.length;for(let i=0;i<10;i++)closeViewGLDiagnostics();assert.equal(gl.log.length,before,'getters issue no GL queries');listeners.webglcontextlost({preventDefault(){}});assert.equal(closeViewGLDiagnostics().lastFailure,'context-lost');assert.equal(closeViewGLDiagnostics().state,'context-lost');assert.equal(closeViewGLDiagnostics().heroState,'not-prepared');resetCloseViewGL();assert.equal(closeViewGLDiagnostics().state,'not-ready');assert.equal(closeViewGLDiagnostics().lastFailure,'context-lost');});
});

test('optional hero program and upload failures are distinguished without changing ordinary GPU readiness or retries',()=>{
  gpu(({gl})=>{gl.heroFail=true;assert.equal(closeViewGLReady(()=>({getContext:()=>gl})),true);assert.equal(closeViewGLFrameReady(),true);assert.equal(closeViewGLDiagnostics().heroState,'program-unavailable');assert.equal(closeViewGLDiagnostics().lastHeroFailure,'program-unavailable');assert.equal(JSON.stringify(closeViewGLDiagnostics()).includes('private'),false);});
  gpu(({gl})=>{assert.equal(closeViewGLReady(()=>({getContext:()=>gl})),true);const a=asset();gl.fault='hero-upload';assert.equal(prepareCloseViewHeroGL(a),false);assert.equal(closeViewGLDiagnostics().heroState,'upload-failed');assert.equal(closeViewGLDiagnostics().lastHeroFailure,'upload-failed');const calls=gl.log.filter(k=>k==='texSubImage3D').length;assert.equal(prepareCloseViewHeroGL(a),false);assert.equal(gl.log.filter(k=>k==='texSubImage3D').length,calls,'existing failed preparation is not retried');});
});

test('only a completed scene commits player/admission counters; aborted attempts and world view are labeled historical',()=>gpu(({gl,screen})=>{
  const g=game(),kind=g.enemies[0].kind;CLOSE_VIEW_HOOKS.art[kind]=()=>{};
  try{render(screen,g,390,844,100000);const first=closeViewRenderDiagnostics();assert.equal(first.active,true);assert.equal(first.backend,'webgl2');assert.equal(first.player,'native');assert.ok(first.nativeActors>0);assert.equal(first.nativeActors,first.actors);assert.ok(first.fallbacks['custom-art']>0);
    const counters={...first,fallbacks:{...first.fallbacks}};first.fallbacks['custom-art']=999;assert.notEqual(closeViewRenderDiagnostics().fallbacks['custom-art'],999);
    delete CLOSE_VIEW_HOOKS.art[kind];gl.fault='draw';render(screen,g,390,844,100016);const aborted=closeViewRenderDiagnostics();assert.equal(aborted.active,false);for(const k of ['frame','backend','player','actors','nativeActors','fallbacks'])assert.deepEqual(aborted[k],counters[k],k);assert.equal(aborted.gpu.lastFailure,'frame-error');
    gl.fault='';CLOSE_VIEW_HOOKS.gl=false;render(screen,g,390,844,100032);const flat=closeViewRenderDiagnostics();assert.equal(flat.backend,'2d');assert.equal(flat.player,'billboard');assert.equal(flat.actors,0);assert.deepEqual(flat.fallbacks,{});
    g.save.closeView=false;render(screen,g,390,844,100048);const world=closeViewRenderDiagnostics();assert.equal(world.active,false);assert.equal(world.frame,flat.frame);assert.equal(world.backend,'2d');
  }finally{delete CLOSE_VIEW_HOOKS.art[kind];}
}));

test('imported submission is counted separately and repeated diagnostic snapshots add no draw or upload work',async()=>{
  const previous={window:globalThis.window,fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap};let fetches=0;
  globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async u=>{fetches++;return{ok:true,json:async()=>meta,arrayBuffer:async()=>binary,blob:async()=>({})};};
  try{await loadCloseViewHero();assert.equal(fetches,4);gpu(({gl,screen})=>{const g=game();render(screen,g,390,844,100100);const d=closeViewRenderDiagnostics();assert.equal(d.asset,'ready');assert.equal(d.player,'imported');assert.equal(d.gpu.heroState,'ready');assert.equal(d.actors,d.nativeActors+1);const operations=gl.log.length,drawCalls=closeViewGLStats.drawCalls,uploads=closeViewGLStats.heroUploadBytes;for(let i=0;i<20;i++)assert.deepEqual(closeViewRenderDiagnostics(),d);assert.equal(gl.log.length,operations);assert.equal(closeViewGLStats.drawCalls,drawCalls);assert.equal(closeViewGLStats.heroUploadBytes,uploads);assert.equal(fetches,4);});}finally{for(const [k,v] of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});

test('the PG dialog renders six diagnostic rows only when opened, with inactive/history labels and text-safe output',async()=>{
  const source=fs.readFileSync(new URL('../src/proving-ground-mobile.ts',import.meta.url),'utf8'),start=source.indexOf('function renderDiagnosticsRows('),end=source.indexOf('document.querySelector("#pgDiagnosticsClose")'),snippet=source.slice(start,end),nodes=new Map(),listeners=new Map();let reads=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',children:[],addEventListener(n,f){listeners.set(`${id}:${n}`,f);},replaceChildren(...a){this.children=a;},showModal(){this.open=true;}});return nodes.get(id);};
  const snapshot={active:false,frame:7,backend:'webgl2',player:'native',actors:2,nativeActors:2,fallbacks:{body:1},asset:'unavailable',gpu:{state:'not-ready',lastFailure:'context-lost',heroState:'not-prepared',lastHeroFailure:'none'}};
  const deps={navigator:{},location:{search:'',pathname:'/previews/candidate/'},SAVE_VERSION:14,innerWidth:390,innerHeight:844,errorLog:[],storageNamespace:'scratch',dialog:node('dialog'),body:node('body'),document:{querySelector:node,createElement:()=>({textContent:''})},URLSearchParams,closeViewRenderDiagnostics(){reads++;return snapshot;}};
  const build=new Function('deps',`const {${Object.keys(deps).join(',')}}=deps;${snippet}`);build(deps);assert.equal(reads,0);await listeners.get('#pgDiagnosticsToggle:click')();assert.equal(reads,1);const rows=node('body').children;assert.equal(rows.length,34,'11 existing rows plus6 renderer rows');const text=rows.map(n=>n.textContent).join('\n');assert.match(text,/inactive; historical: webgl2/);assert.match(text,/last failure \(historical\): context-lost/);assert.match(text,/Hero asset\nunavailable/);assert.equal(node('dialog').open,true);assert.doesNotMatch(snippet,/setInterval|setTimeout|requestAnimationFrame|innerHTML/);
});
