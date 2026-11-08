import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, updateProjectiles } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, closeViewPlayerAction, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, GLB, DECAL_FLOATS, resetCloseViewGL } from '../src/close-view-gl.ts';
import { loadCloseViewHero, decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel, closeViewToolEmissionPoint } from '../src/close-view-models.ts';
import { TOOL_ACTION_TIMING, TOOL_USE_STARTUP_MS, sampleToolActionMotion } from '../src/action-motion.ts';

// Storage-aware production-renderer mock only. File-backed asset fetches below reject every network URL.
class TransactionGL {
  lost=false; error=0; fault=''; nullKind=''; created:any={program:0,buffer:0,vao:0,texture:0};
  allocated=new WeakSet(); boundTexture:any=null; unallocatedUpdates=0; heroUploads=0;
  constructor(){let next=1;const constants=new Map();return new Proxy(this,{get:(o:any,k:any)=>{
    if(k in o)return o[k];
    if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!constants.has(k))constants.set(k,next++);return constants.get(k);}
    return()=>{};
  }});}
  isContextLost(){return this.lost;}
  getError(){const error=this.error;this.error=0;return error||this.NO_ERROR;}
  getExtension(){return null;}
  createShader(){return{};}getShaderParameter(){return true;}
  resource(kind:string,index:number){this.created[kind]++;return this.nullKind===kind&&this.created[kind]===index?null:{};}
  createProgram(){return this.resource('program',1);}
  getProgramParameter(_p:any,k:any){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}
  createBuffer(){return this.resource('buffer',4);}
  createVertexArray(){return this.resource('vao',5);}
  createTexture(){return this.resource('texture',1);}
  bindTexture(_target:any,texture:any){this.boundTexture=texture;}
  texImage2D(){if(this.fault==='texture')throw new Error('texture upload');if(this.boundTexture)this.allocated.add(this.boundTexture);}
  texSubImage2D(){if(this.boundTexture&&!this.allocated.has(this.boundTexture)){this.unallocatedUpdates++;this.error=this.INVALID_OPERATION;}}
  bufferData(_target:any,data:any){if(data instanceof Float32Array)this.modelData=Float32Array.from(data);if(data instanceof Float32Array&&data.length>6&&this.fault==='upload')throw new Error('buffer upload');}
  bufferSubData(_target:any,_offset:any,data:any){if(data instanceof Float32Array)this.heroData=Float32Array.from(data);this.heroUploads++;if(this.fault==='hero')throw new Error('selected hero upload');}
  drawArrays(){if(this.fault==='draw')throw new Error('draw');if(this.fault==='loss')this.lost=true;if(this.fault==='error')this.error=this.INVALID_OPERATION;}
}
function context(log:any[],tag:string){return new Proxy({canvas:null as any,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{
  get:(o:any,k:any)=>k in o?o[k]:(...args:any[])=>log.push([tag,k,...args]),
  set:(o:any,k:any,v:any)=>{if(k==='fillStyle'||k==='strokeStyle')log.push([tag,k,v]);o[k]=v;return true;},
});}
function withGPU(options:any,run:(x:any)=>void){
  const previous=(globalThis as any).WebGL2RenderingContext,gl:any=new TransactionGL();Object.assign(gl,options);
  const log:any[]=[],screen:any=context(log,'screen'),canvases:any[]=[],ground:any={width:390,height:844,getContext:()=>context(log,'ground')};
  let made=0;screen.canvas={width:390,height:844};(globalThis as any).WebGL2RenderingContext=TransactionGL;
  setCloseViewCanvasFactory(()=>{if(++made===1)return ground;const canvas={width:390,height:844,addEventListener(){},getContext:(kind:string)=>{if(kind==='webgl2'){if(!canvases.includes(canvas))canvases.push(canvas);return gl;}return context(log,'atlas');}};return canvas;});
  CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();resetCloseViewCamera();
  try{run({gl,log,screen,canvases});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();resetCloseViewCamera();setCloseViewCanvasFactory(null);if(previous===undefined)delete (globalThis as any).WebGL2RenderingContext;else (globalThis as any).WebGL2RenderingContext=previous;}
}
const names:any={'rift-bombard':'Rift Bombard',blunderbuss:'Blunderbuss','lumen-spindle':'Lumen Spindle','great-sweep':'Great Sweep'};
const start=100000;
function game(kind:string){
  const g:any=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:start}).game;
  g.enemies=[];g.projectiles=[];g.effects=[];g.save.closeView=true;g.save.activeWeaponSlot='primary';g.presentation={effectiveQuality:'full',reduceMotion:false};
  g.save.equipment.secondary={id:'secondary-'+kind,name:names[kind],slot:'secondary',power:5};
  // Controlled open room, with explicit wall cases below; geometry is still authored production data.
  for(const tile of g.map.tiles){tile.blocked=false;tile.seen=true;tile.discovered=true;tile.environment=false;}
  return g;
}
function draw(h:any,g:any,now:number){g.lastUpdateNow=now;resetCloseViewCamera();render(h.screen,g,390,844,now);assert.equal(closeViewShowing(g),true);return {hero:h.gl.heroData&&Float32Array.from(h.gl.heroData),native:h.gl.modelData&&Float32Array.from(h.gl.modelData)};}
function cue(color:number){const points:number[][]=[];for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===color)points.push(Array.from(GLB.decal.slice(b,b+3)));}return points;}
const flashes=()=>cue(0xffc56b),links=()=>cue(0xffd38a);
async function loaded(run:()=>void){const keys=['window','fetch','createImageBitmap'],old=new Map(keys.map(k=>[k,(globalThis as any)[k]]));try{
  (globalThis as any).window={};(globalThis as any).createImageBitmap=async()=>({width:1024,height:1024});
  (globalThis as any).fetch=async(url:any)=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  assert.ok(await loadCloseViewHero());run();
}finally{for(const key of keys){if(old.get(key)===undefined)delete (globalThis as any)[key];else (globalThis as any)[key]=old.get(key);}}}
function travel(g:any,seconds:number){updateProjectiles(g.projectiles,[],g.map,g.map.width,0);updateProjectiles(g.projectiles,[],g.map,g.map.width,seconds);}

test('missing imported assets retain native startup and ordinary physical release ownership',()=>withGPU({},h=>{
  const g=game('rift-bombard');assert.equal(g.fireSecondary(start,{x:1,y:0}),true);assert.equal(g.player.attackVisual.toolUse.phase,'startup');
  draw(h,g,start+60);assert.equal(h.gl.heroUploads,0);assert.equal(flashes().length,0);assert.equal(g.projectiles.length,0);assert.ok(closeViewGLStats.models>0);
  const at=g.pendingToolUse.releaseAt;g.releasePendingToolUse(at);draw(h,g,at+16);assert.equal(h.gl.heroUploads,0);assert.equal(closeViewGLStats.projectedShots,1);assert.equal(flashes().length,0,'native fallback never borrows an unavailable imported hand');
}));

test('actual named releases flash at release+16, retain canonical heads and connect only once naturally forward',async()=>loaded(()=>{
  for(const kind of ['rift-bombard','blunderbuss','lumen-spindle'])withGPU({},h=>{
    const g=game(kind);assert.equal(g.fireSecondary(start,{x:1,y:0}),true);const startup=g.pendingToolUse.startupMs,releaseAt=g.pendingToolUse.releaseAt;
    const beginning=draw(h,g,start),raising=draw(h,g,start+startup*.6);assert.notDeepEqual(raising.hero,beginning.hero,kind+' visibly raises before emission');
    assert.equal(g.projectiles.length,0);assert.equal(flashes().length,0);draw(h,g,releaseAt-1);assert.equal(flashes().length,0);assert.equal(links().length,0);
    g.releasePendingToolUse(releaseAt);const shot=g.projectiles.find((q:any)=>q.id===g.player.attackVisual.toolShotId);assert.ok(shot);
    travel(g,.016);const before=structuredClone(g.projectiles);draw(h,g,releaseAt+16);assert.deepEqual(g.projectiles,before,'rendering never moves the real head');
    assert.equal(flashes().length,6,kind+' actual release flash');assert.equal(links().length,0,kind+' canonical first head remains behind fully raised muzzle');
    updateProjectiles(g.projectiles,[],g.map,g.map.width,.059);draw(h,g,releaseAt+75);assert.equal(links().length,6,kind+' actual unobstructed head eventually crosses the muzzle');assert.equal(flashes().length,0);
    assert.ok(GLB.nDecal<=GLB.decal.length/DECAL_FLOATS);
  });
}));

test('late release rebases the pose and cue without an oversized duration; pause and JSON preserve the receipt',async()=>loaded(()=>withGPU({},h=>{
  const g=game('rift-bombard');assert.equal(g.fireSecondary(start,{x:1,y:0}),true);const due=g.pendingToolUse.releaseAt;
  const ready=draw(h,g,due),late=draw(h,g,start+600000);assert.deepEqual(late.hero,ready.hero,'a due but undispatched body holds the exact ready pose');assert.equal(flashes().length,0);assert.equal(g.projectiles.length,0);
  const releaseAt=start+600000;g.releasePendingToolUse(releaseAt);const fired=draw(h,g,releaseAt+16);assert.equal(flashes().length,6);assert.equal(g.player.attackVisual.durationMs,720);
  g.setPaused(true,releaseAt+16);assert.deepEqual(draw(h,g,releaseAt+10000).hero,fired.hero);assert.equal(flashes().length,6);
  const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(releaseAt+10000)))),back=new Game(saved,2000000);back.enemies=[];back.presentation=g.presentation;
  assert.deepEqual(draw(h,back,2000000).hero,fired.hero);assert.equal(flashes().length,6,'reload uses actual release age, not accepted wall age');
})));

test('final pose priority suppresses release cues and accepted melee cannot revive the old body',async()=>loaded(()=>{
  for(const kind of ['rift-bombard','blunderbuss','lumen-spindle'])withGPU({},h=>{
    const g=game(kind);assert.equal(g.fireSecondary(start,{x:1,y:0}),true);const at=g.pendingToolUse.releaseAt;g.releasePendingToolUse(at);const record=structuredClone(g.player.attackVisual);
    for(const patch of [{hitFlash:.18},{dodgeUntil:at+260,dodgeX:1,dodgeY:0},{stunnedAt:at,stunnedUntil:at+1000}]){
      const old=Object.fromEntries(Object.keys(patch).map(k=>[k,g.player[k]]));Object.assign(g.player,patch);draw(h,g,at+16);assert.equal(flashes().length,0);assert.equal(links().length,0);assert.deepEqual(g.player.attackVisual,record);Object.assign(g.player,old);
    }
    g.save.equipment.primary={id:'primary-iron-fists',name:'Iron Fists',slot:'primary',power:5,property:'brawler'};assert.equal(g.fistPunch(1,0,at+17,{x:1,y:0}),true);draw(h,g,at+18);assert.equal(flashes().length,0);assert.equal(g.player.attackVisual.profile,'fist');
    draw(h,g,at+500);assert.notEqual(g.player.attackVisual.toolUse?.id,record.toolUse.id,'expired newer melee never reinstalls the old use');
  });
}));

test('release wall exclusion, reduced motion, legacy immediate and opaque future association remain distinct',async()=>loaded(()=>withGPU({},h=>{
  const g=game('lumen-spindle');assert.equal(g.fireSecondary(start,{x:1,y:0}),true);const at=g.pendingToolUse.releaseAt;g.releasePendingToolUse(at);draw(h,g,at+16);
  const flash=flashes();assert.equal(flash.length,6);const center=[0,1].map(k=>flash.reduce((sum,p)=>sum+p[k],0)/6),tile=g.map.tiles[Math.floor(center[1])*g.map.width+Math.floor(center[0])],old=tile.blocked;
  tile.blocked=true;draw(h,g,at+16);assert.equal(flashes().length,0,'body-to-authored-muzzle segment rejects the wall');tile.blocked=old;
  g.presentation.reduceMotion=true;draw(h,g,at+16);assert.equal(flashes().length,6);assert.equal(links().length,0,'reduced motion does not add a beam');
  g.presentation.reduceMotion=false;g.player.attackVisual.toolUse={v:2,future:'opaque'};draw(h,g,at+16);assert.equal(flashes().length,0);assert.equal(links().length,0);
  const legacy=game('blunderbuss');legacy.save.closeView=false;assert.equal(legacy.fireSecondary(start,{x:1,y:0}),true);assert.equal(legacy.player.attackVisual.toolUse,undefined);legacy.save.closeView=true;draw(h,legacy,start+16);assert.equal(flashes().length,6,'old immediate record retains old accepted-age cue');
})));

test('point-blank canonical collisions never move a head to the raised barrel or draw a link through the wall',async()=>loaded(()=>{
  for(const kind of ['rift-bombard','blunderbuss','lumen-spindle'])withGPU({},h=>{
    const g=game(kind);g.player.x=1.1;g.player.y=2.55;g.map.tiles[3*g.map.width+2].blocked=true;
    assert.equal(g.fireSecondary(start,{x:1,y:0}),true);const at=g.pendingToolUse.releaseAt;g.releasePendingToolUse(at);const shot=g.projectiles.find((q:any)=>q.id===g.player.attackVisual.toolShotId);let detonated=false;
    updateProjectiles([shot],[],g.map,g.map.width,0);updateProjectiles([shot],[],g.map,g.map.width,.016,()=>{},()=>{detonated=true;});
    assert.ok(shot.dead||detonated||shot.returning,kind+' physical collision precedes the raised muzzle');const physical=structuredClone(shot);draw(h,g,at+16);assert.deepEqual(shot,physical);assert.equal(links().length,0);assert.equal(flashes().length,0,'authored muzzle is beyond this blocking wall');
  });
}));

test('native fallback and imported poses use phase data without changing geometry or interpreting future motion',()=>{
  const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),b=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  for(const kind of Object.keys(names)){
    const durationMs=TOOL_ACTION_TIMING[kind].durationMs,startupMs=TOOL_USE_STARTUP_MS[kind],record:any={profile:kind==='great-sweep'?'sweep':'emitter',toolKind:kind,durationMs,toolMotion:{v:1,entry:[0,0,0,0,0],direction:1,baseKind:'cinder-pike'},toolUse:{v:1,id:'pose-test',startupMs,phase:'startup'}};
    const model=(elapsed:number)=>{const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),n=writeCloseViewModel(out,0,{kind:kind==='great-sweep'?'playerSweep':'playerTool',x:0,y:0,z:0,yaw:0,phase:1.2,pace:.35,pose:kind==='great-sweep'?'attack':'tool',amount:elapsed/durationMs,toolAction:record,reduceMotion:false});assert.ok(n>0);return out.slice(0,n);};
    const cold=model(0),ready=model(startupMs);assert.equal(cold.length,ready.length);assert.notDeepEqual(cold,ready);assert.ok(ready.every(Number.isFinite));
    const sample=(elapsed:number)=>{const state=createHeroPoseState(asset),frame=createHeroFrame(asset);assert.ok(sampleCloseViewHero(asset,state,{nowMs:1801,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:1.2,gaitPhase:1.2,heldProfile:'cinder-pike',action:{...record,kind:kind==='great-sweep'?'melee':'ranged',profile:kind,phase:elapsed/durationMs,yaw:0}},frame));return Array.from(frame.rightSocket);};
    const before=sample(startupMs);record.toolUse={...record.toolUse,phase:'released',releaseOffsetMs:startupMs};assert.deepEqual(sample(startupMs),before,'release receipt itself does not snap the socket');assert.notDeepEqual(sample(startupMs+30),before,kind+' release has visible response');
    record.toolUse={v:2,future:true};record.toolMotion={v:2,future:true};assert.ok(sample(100).every(Number.isFinite));assert.equal(sampleToolActionMotion(record,100),null);
  }
});

test('normal and accelerated startup have no recoil; release response, repeated entry and recovery remain continuous',()=>{
  for(const kind of Object.keys(names))for(const scale of [1,.25]){
    const durationMs=TOOL_ACTION_TIMING[kind].durationMs,startupMs=TOOL_USE_STARTUP_MS[kind]*scale,record:any={toolKind:kind,durationMs,toolMotion:{v:1,entry:[0,0,0,0,0],direction:1,baseKind:'cinder-pike'},toolUse:{v:1,id:'phase-contract',startupMs,phase:'startup'}};
    const mid=sampleToolActionMotion(record,startupMs*.5),ready=sampleToolActionMotion(record,startupMs);assert.ok(mid.weight>0&&mid.weight<ready.weight);assert.equal(ready.weight,1);
    if(kind!=='great-sweep'){
      const up=kind==='lumen-spindle'?.18:kind==='rift-bombard'?-.13:-.08;
      assert.ok(Math.abs(mid.up-up*mid.weight)<1e-8,kind+' no pre-release recoil');
    }else assert.ok(ready.yaw<0,'Sweep winds back before contact');
    record.toolUse={...record.toolUse,phase:'released',releaseOffsetMs:startupMs};assert.deepEqual(sampleToolActionMotion(record,startupMs),ready);
    const kicked=sampleToolActionMotion(record,startupMs+30);assert.notDeepEqual(kicked,ready);assert.equal(sampleToolActionMotion(record,durationMs).weight,0,kind+' completes the same bounded total duration');
    const previous=sampleToolActionMotion(record,startupMs+70),next={...record,toolUse:{...record.toolUse,phase:'startup'},toolMotion:{...record.toolMotion,entry:[previous.yaw,previous.side,previous.up,previous.forward,previous.weight]}};delete next.toolUse.releaseOffsetMs;
    assert.deepEqual(sampleToolActionMotion(next,0),previous,kind+' repeated acceptance keeps all five flattened controls');
  }
});
