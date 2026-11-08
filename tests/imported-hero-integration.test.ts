import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { Game } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';

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
  const fixture=(id,lab='creature-assets')=>{const {game:g}=createLabFixture({lab,scenario:id,now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:false};return g;};
  try {
    const g=fixture('ashenHound');resetCloseViewCamera();render(screen,g,390,844,100000);
    assert.equal(closeViewGLStats.heroTriangles,0,'working ordinary model before explicit asset load');
    const requested=[];globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});
    globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:','fixture must never access a network');requested.push(u.pathname);const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
    const asset=await loadCloseViewHero();assert.ok(asset);assert.equal(requested.length,4);
    const before=structuredClone({player:g.player,save:g.save,projectiles:g.projectiles});
    render(screen,g,390,844,100016);assert.equal(closeViewGLStats.heroTriangles,3170);assert.equal(closeViewGLStats.models,1);
    assert.ok(gl.uploads.at(-1).every(Number.isFinite));assert.equal(gl.uploads.at(-1).byteLength,asset.vertexCount*24);
    assert.deepEqual({player:g.player,save:g.save,projectiles:g.projectiles},before,'presentation cannot mutate gameplay');
    const walkG=fixture('ashenHound');resetCloseViewCamera();render(screen,walkG,390,844,100016);const walking={state:{x:1,y:0},consume:()=>false,held:()=>false};for(let step=1;step<=20;step++){const t=100016+step*16;walkG.update(.016,walking,t);render(screen,walkG,390,844,t);}
    const beforeDodge=gl.uploads.at(-1),dodgeAt=100336;walkG.update(0,{state:{x:1,y:0},consume:k=>k==='dodge',held:()=>false},dodgeAt);assert.equal(walkG.player.dodgeUntil,dodgeAt+260);render(screen,walkG,390,844,dodgeAt);assert.deepEqual(gl.uploads.at(-1),beforeDodge,'production renderer keeps the exact last walking pose at accepted phase zero');
    const pauseG=fixture('ashenHound');resetCloseViewCamera();render(screen,pauseG,390,844,100016);for(let step=1;step<=20;step++){const t=100016+step*16;pauseG.update(.016,{state:{x:.5,y:.5},consume:()=>false,held:()=>false},t);render(screen,pauseG,390,844,t);}const diagonal=gl.uploads.at(-1),cached=structuredClone(pauseG.player);pauseG.setPaused(true,100336);pauseG.setPaused(false,105336);pauseG.update(0,{state:{x:-1,y:0},consume:k=>k==='dodge',held:()=>false},105336);assert.ok(pauseG.player.dodgeVisual.speed>0&&pauseG.player.dodgeVisual.speed<2.4);assert.ok(pauseG.player.dodgeVisual.facingYaw>.4&&pauseG.player.dodgeVisual.facingYaw<1.1);render(screen,pauseG,390,844,105336);assert.deepEqual(gl.uploads.at(-1),diagonal,'callback-free pause keeps the visually current partial-speed diagonal pose for immediate dodge');assert.equal(cached.x,pauseG.player.x);assert.equal(cached.y,pauseG.player.y);
    for(const idleAt of [100400,101200,102400]){const idleG=fixture('ashenHound');resetCloseViewCamera();render(screen,idleG,390,844,idleAt);const idleBefore=gl.uploads.at(-1);idleG.update(0,{state:{x:1,y:0},consume:k=>k==='dodge',held:()=>false},idleAt);render(screen,idleG,390,844,idleAt);assert.deepEqual(gl.uploads.at(-1),idleBefore,`idle clock ${idleAt} stays exact at accepted phase zero`);idleG.update(0,{state:{x:0,y:0},consume:()=>false,held:()=>false},idleAt+260);render(screen,idleG,390,844,idleAt+260);const recovered=gl.uploads.at(-1),reference=fixture('ashenHound');resetCloseViewCamera();render(screen,reference,390,844,idleAt+260);assert.deepEqual(recovered,gl.uploads.at(-1),`idle clock ${idleAt} recovers to the matching logical time`);}
    const recoveryCase=(direction,label,pause=false)=>{const q=fixture('ashenHound'),start=103000; q.player.facing='right';resetCloseViewCamera();render(screen,q,390,844,start);q.update(0,{state:direction,consume:k=>k==='dodge',held:()=>false},start);render(screen,q,390,844,start);const calm={state:{x:0,y:0},consume:()=>false,held:()=>false};let shift=0;for(let dt=16;dt<=256;dt+=16){if(pause&&dt===144){q.setPaused(true,start+128);render(screen,q,390,844,start+2000);const held=gl.uploads.at(-1);render(screen,q,390,844,start+4000);assert.deepEqual(gl.uploads.at(-1),held,label+' pause freezes dodge facing');q.setPaused(false,start+5128);shift=5000;}q.update(.016,calm,start+shift+dt);render(screen,q,390,844,start+shift+dt);if(label==='backward'&&dt===128){const mid=gl.uploads.at(-1),saved=migrateSave(JSON.parse(JSON.stringify(q.exportSnapshot(start+128)))),back=new Game(saved,200000);back.enemies=[];back.presentation=q.presentation;resetCloseViewCamera();render(screen,back,390,844,200000);assert.deepEqual(gl.uploads.at(-1),mid,'backward dodge reload retains displayed facing and phase');resetCloseViewCamera();render(screen,q,390,844,start+128);}}let prior=gl.uploads.at(-1),px=q.player.x,py=q.player.y;q.update(.004,calm,start+shift+260);render(screen,q,390,844,start+shift+260);let after=gl.uploads.at(-1),max=0;for(let k=0;k<after.length;k+=6)max=Math.max(max,Math.hypot(after[k]-q.player.x-prior[k]+px,after[k+1]-q.player.y-prior[k+1]+py,after[k+2]-prior[k+2]));assert.ok(max<.12,`${label} expiry local jump ${max}`);let priorEase=Infinity;for(let step=1;step<=8;step++){prior=after;px=q.player.x;py=q.player.y;const t=start+shift+260+step*16;q.update(.016,calm,t);render(screen,q,390,844,t);after=gl.uploads.at(-1);max=0;for(let k=0;k<after.length;k+=6)max=Math.max(max,Math.hypot(after[k]-q.player.x-prior[k]+px,after[k+1]-q.player.y-prior[k+1]+py,after[k+2]-prior[k+2]));assert.ok(max<.18,`${label} eased recovery ${step}: ${max}`);assert.ok(max<=priorEase+.01,`${label} convergence ${step}: ${max}/${priorEase}`);priorEase=max;}};
    recoveryCase({x:-1,y:0},'backward');recoveryCase({x:0,y:1},'lateral',true);
    resetCloseViewCamera();render(screen,g,390,844,100016);
    g.setPaused(true,100016);render(screen,g,390,844,100032);const frozen=gl.uploads.at(-1);render(screen,g,390,844,110032);assert.deepEqual(gl.uploads.at(-1),frozen);
    g.setPaused(false,110032);render(screen,g,390,844,110032);assert.deepEqual(gl.uploads.at(-1),frozen,'actual callback-free Game resume keeps idle at its logical phase');
    for(const [item,kind] of [[{id:'primary-cinder-pike',name:'Cinder Pike',slot:'primary',power:5,property:'reach'},'cinder-pike'],[{id:'primary-verge-cleaver',name:'Verge Cleaver',slot:'primary',power:5,property:'impact'},'verge-cleaver']]){const q=fixture('blade-spark-ashling','combat-assets'),start=120000;q.save.equipment.primary=item;resetCloseViewCamera();render(screen,q,390,844,start);const ready=gl.uploads.at(-1);q.primaryAttack(start);assert.equal(q.player.attackVisual.weaponKind,kind);render(screen,q,390,844,start);assert.deepEqual(gl.uploads.at(-1),ready,`${kind} accepted phase zero keeps the ready body`);q.update(.24,{state:{x:0,y:0},consume:()=>false,held:()=>false},start+240);render(screen,q,390,844,start+240);const recovered=gl.uploads.at(-1),reference=fixture('blade-spark-ashling','combat-assets');reference.save.equipment.primary=item;resetCloseViewCamera();render(screen,reference,390,844,start+240);assert.deepEqual(recovered,gl.uploads.at(-1),`${kind} recovery returns to matching logical idle`);}
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
