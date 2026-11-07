import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';

const context = () => new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL {
  uploads=[];
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}
  bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}
}
test('actual renderer gates imported normal player on readiness, preserves forms and freezes paused poses',async()=>{
  const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(n=>[n,globalThis[n]]));
  const gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;
  globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  const fixture=id=>{const {game:g}=createLabFixture({lab:'creature-assets',scenario:id,now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:false};return g;};
  try {
    const g=fixture('ashenHound');resetCloseViewCamera();render(screen,g,390,844,100000);
    assert.equal(closeViewGLStats.heroTriangles,0,'working ordinary model before explicit asset load');
    const requested=[];globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});
    globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:','fixture must never access a network');requested.push(u.pathname);const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
    const asset=await loadCloseViewHero();assert.ok(asset);assert.equal(requested.length,4);
    const before=structuredClone({player:g.player,save:g.save,projectiles:g.projectiles});
    render(screen,g,390,844,100016);assert.equal(closeViewGLStats.heroTriangles,3136);assert.equal(closeViewGLStats.models,1);
    assert.ok(gl.uploads.at(-1).every(Number.isFinite));assert.equal(gl.uploads.at(-1).byteLength,asset.vertexCount*24);
    assert.deepEqual({player:g.player,save:g.save,projectiles:g.projectiles},before,'presentation cannot mutate gameplay');
    g.setPaused(true,100016);render(screen,g,390,844,100032);const frozen=gl.uploads.at(-1);render(screen,g,390,844,110032);assert.deepEqual(gl.uploads.at(-1),frozen);
    g.setPaused(false,110032);render(screen,g,390,844,110032);assert.deepEqual(gl.uploads.at(-1),frozen,'actual callback-free Game resume keeps idle at its logical phase');
    g.primaryAttack(110040);assert.ok(g.player.attackUntil>110046,'actual accepted action is active');render(screen,g,390,844,110046);
    const active=gl.uploads.at(-1),remaining=g.player.attackUntil-110046;
    g.setPaused(true,110046);g.setPaused(false,115046);render(screen,g,390,844,115046);
    assert.equal(g.player.attackUntil-115046,remaining);assert.deepEqual(gl.uploads.at(-1),active,'real Game pause shift preserves partial accepted-action geometry');
    for(const id of ['wayfarer-iron-fists','wayfarer-active-robot','wayfarer-empowered-suit','wayfarer-ember-form']){
      const form=fixture(id);resetCloseViewCamera();render(screen,form,390,844,100000);assert.equal(closeViewGLStats.heroTriangles,0,id+' keeps actual native special form');
    }
    assert.equal(requested.length,4,'all subsequent frames reuse the one loaded asset');
  } finally {CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);}}
});
