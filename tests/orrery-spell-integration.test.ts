import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCloseViewHero, decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { tickOrrery } from '../src/tool-forms.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { Game } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
const context=()=>new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL {
  uploads=[];
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}
  bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}
}
test('Orrery and legacy cast profiles retain motion while unknown future profiles remain neutral',()=>{
  const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),b=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  for(const profile of ['cast','orrery-tap','orrery-release','future-cast']){
    const state=createHeroPoseState(asset),frames=[0,.5,1].map(phase=>{const frame=createHeroFrame(asset);sampleCloseViewHero(asset,state,{nowMs:0,reducedMotion:true,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,action:{kind:'cast',profile,phase,durationMs:360,yaw:0}},frame);return frame;});
    assert.deepEqual(frames[0].positionsNormals,frames[2].positionsNormals,profile+' returns to its entry');
    if(profile==='future-cast')assert.deepEqual(frames[0].positionsNormals,frames[1].positionsNormals);
    else assert.ok(Math.hypot(...[12,13,14].map(k=>frames[1].rightSocket[k]-frames[0].rightSocket[k]))>.1,profile+' moves the casting arm');
  }
});
test('real Orrery tap and release render through the production mask, resume, and yield to a newer spell',async()=>{
  const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(k=>[k,globalThis[k]])),gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;
  globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  const draw=(g,now)=>{const combat=g.player.attackUntil;try{g.player.attackUntil=0;render(screen,g,390,844,now);}finally{g.player.attackUntil=combat;}return gl.uploads.at(-1);};
  try{
    globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};await loadCloseViewHero();
    for(const release of [false,true]){
      const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-orrery-sentinel',now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:true};resetCloseViewCamera();assert.equal(g.fireSecondary(100000,{x:1,y:0},release?'tool':null),true);
      if(release){tickOrrery(g,.25,100010,true);tickOrrery(g,.01,100020,false);}
      const at=release?100100:100080;assert.equal(g.player.attackVisual.profile,release?'orrery-release':'orrery-tap');const active=draw(g,at);assert.equal(closeViewGLStats.heroTriangles,3170);
      g.player.attackVisual.presentationCancelled=true;assert.notDeepEqual(draw(g,at),active,'actual accepted Orrery body differs from frozen idle');delete g.player.attackVisual.presentationCancelled;
      g.setPaused(true,at);assert.deepEqual(draw(g,110000),active);const back=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(110000)))),200000);back.enemies=[];back.presentation=g.presentation;resetCloseViewCamera();assert.deepEqual(draw(back,200000),active,'paused accepted gesture survives JSON reload');
      back.setPaused(false,201000);back.lastUpdateNow=201001;assert.equal(back.castSpell('cinder-dart'),true);assert.equal(back.player.attackVisual.presentationCancelled,true);const cast=draw(back,201100);assert.notDeepEqual(cast,active,'new spell supersedes Orrery');
      back.player.castVisual.cancelled=true;assert.notDeepEqual(draw(back,201100),cast,'mapped spell also has actual visible motion');
    }
  }finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);}}
});
