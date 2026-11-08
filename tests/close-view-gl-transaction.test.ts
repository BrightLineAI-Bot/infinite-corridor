import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects, standardProjectileColor } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, closeViewShowing, closeViewCapturing, closeViewBareFloor, closeViewCueSegmentOpen, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, GLB, DECAL_FLOATS, resetCloseViewGL } from '../src/close-view-gl.ts';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { projectileVisualPoint } from '../src/actor-presentation.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';

// No server/browser/transport: this exercises the actual render transaction with a storage-aware GL.
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
  bufferData(_target:any,data:any){if(data instanceof Float32Array&&data.length>6&&this.fault==='upload')throw new Error('buffer upload');}
  bufferSubData(){this.heroUploads++;if(this.fault==='hero')throw new Error('selected hero upload');}
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
function game(){
  const g:any=createLabFixture({lab:'combat-assets',scenario:'cleaver-echo-inspection',now:100000}).game;
  g.presentation={effectiveQuality:'full',reduceMotion:false};
  Object.assign(g.enemies[0],{fracRank:'rare',packName:'Transaction Native'});
  g.primaryAttack(100000,{x:1,y:0});g.tickGlyphs(.001,100250);
  assert.equal(g.glyphVisuals.filter((v:any)=>v.kind==='primaryEcho').length,1);
  const ready=Math.max(100250,g.player.attackReadyAt||0);assert.equal(g.fireSecondary(ready,{x:1,y:0}),true);assert.equal(g.projectiles.length,1);g.lastUpdateNow=ready+16;
  return g;
}
function frame(h:any,g:any){
  h.log.length=0;let floorPlan:any=null;const layer=(ctx:any,w:number,height:number,plan:any)=>{floorPlan=plan;drawRangedEffects(ctx,g,w,height,plan);};
  CLOSE_VIEW_HOOKS.groundLayers.push(layer);
  try{render(h.screen,g,390,844,g.lastUpdateNow);if(!closeViewShowing(g))drawRangedEffects(h.screen,g,390,844);}
  finally{CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(layer),1);}
  return {showing:closeViewShowing(g),floorPlan,copies:h.log.filter((q:any)=>q[0]==='screen'&&q[1]==='drawImage'&&h.canvases.includes(q[2])).length};
}
function assertFallback(h:any,g:any,result:any){
  assert.equal(result.showing,false);assert.equal(result.copies,0,'failed GL canvas is never presented');
  assert.equal(closeViewCapturing(),false);assert.equal(closeViewBareFloor(),false);
  assert.ok(h.log.some((q:any)=>q[0]==='screen'&&q[1]==='fillStyle'&&q[2]===standardProjectileColor(g.projectiles[0])),'ordinary projectile owner returns');
  assert.ok(h.log.some((q:any)=>q[0]==='screen'&&q[1]==='strokeStyle'&&q[2]==='#c9a7ff'),'Echo floor owner returns');
  assert.equal(h.log.filter((q:any)=>q[0]==='screen'&&q[1]==='fillText'&&q[2]==='Transaction Native').length,1,'native actor decoration returns once');
  assert.equal(closeViewGLStats.projectedShots,0);assert.equal(GLB.nDecal,0);
}

test('healthy frame exclusively owns ordinary shots and raised Echo while retaining native actors',()=>withGPU({},h=>{
  const g=game(),before=structuredClone({projectiles:g.projectiles,echo:g.glyphVisuals,enemies:g.enemies});
  const out=frame(h,g);assert.equal(out.showing,true);assert.equal(out.copies,1);assert.ok(out.floorPlan.has(g.projectiles[0]));
  assert.equal(closeViewGLStats.projectedShots,1);assert.ok(closeViewGLStats.echoRibbonVertices>0);assert.ok(closeViewGLStats.models>=2);
  assert.equal(h.log.some((q:any)=>q[0]==='ground'&&q[1]==='strokeStyle'&&q[2]==='#c9a7ff'),false,'no duplicate Echo floor stamp');
  assert.deepEqual({projectiles:g.projectiles,echo:g.glyphVisuals,enemies:g.enemies},before);
}));

test('critical null resources reject the frame before floor ownership capture',()=>{
  for(const nullKind of ['program','buffer','vao','texture'])withGPU({nullKind},h=>{const g=game(),out=frame(h,g);assertFallback(h,g,out);assert.equal(out.floorPlan,null,nullKind);});
});

test('upload, draw, GL error and context loss restore all ordinary owners after capture',()=>{
  for(const fault of ['texture','upload','draw','error','loss'])withGPU({fault},h=>{
    const g=game(),before=structuredClone({projectiles:g.projectiles,echo:g.glyphVisuals,enemies:g.enemies}),out=frame(h,g);
    assert.ok(out.floorPlan?.has(g.projectiles[0]),`${fault}: failure occurs after masked capture`);assertFallback(h,g,out);
    assert.deepEqual({projectiles:g.projectiles,echo:g.glyphVisuals,enemies:g.enemies},before);
  });
});

test('success then upload/draw/context failure then success rebuilds texture storage and source ownership',()=>{
  for(const fault of ['texture','upload','draw','error','loss'])withGPU({},h=>{
    const g=game();assert.equal(frame(h,g).showing,true);h.gl.fault=fault;
    // Force the selected texture/static upload boundary to run again, without changing Game state.
    if(fault==='texture'||fault==='upload')resetCloseViewGL();
    assertFallback(h,g,frame(h,g));h.gl.fault='';h.gl.lost=false;h.gl.error=0;
    const recovered=frame(h,g);assert.equal(recovered.showing,true);assert.equal(recovered.copies,1);assert.equal(h.gl.unallocatedUpdates,0);
    assert.ok(recovered.floorPlan.has(g.projectiles[0]));assert.equal(closeViewGLStats.projectedShots,1);assert.ok(closeViewGLStats.echoRibbonVertices>0);
  });
});

test('asset-not-ready native fallback stays valid; admitted imported hero upload failure aborts and recovers',async()=>{
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,(globalThis as any)[n]]));
  (globalThis as any).window={};(globalThis as any).createImageBitmap=async()=>({width:1024,height:1024});
  (globalThis as any).fetch=async(url:any)=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  try{
    withGPU({},h=>{assert.equal(frame(h,game()).showing,true);assert.equal(h.gl.heroUploads,0,'no admitted imported frame before asset readiness');});
    assert.ok(await loadCloseViewHero());
    withGPU({},h=>{const g=game();assert.equal(frame(h,g).showing,true);assert.ok(h.gl.heroUploads>0);h.gl.fault='hero';assertFallback(h,g,frame(h,g));h.gl.fault='';assert.equal(frame(h,g).showing,true);assert.equal(h.gl.unallocatedUpdates,0);});
  }finally{for(const n of names){if(old.get(n)===undefined)delete (globalThis as any)[n];else (globalThis as any)[n]=old.get(n);}}
});

test('bounded tool supercover rejects corner, gridline, endpoint and rectangle hazards',()=>{
  const open=(width=6,height=6)=>({width,height,tiles:Array.from({length:width*height},()=>({blocked:false,seen:true,discovered:true}))});
  const map:any=open();assert.equal(closeViewCueSegmentOpen(map,.2,.2,2.8,.2),true);
  map.tiles[1].blocked=true;assert.equal(closeViewCueSegmentOpen(map,.9,.9,1.1,1.1),false,'corner-touch wall skipped by the old seven samples');
  map.tiles[1].blocked=false;map.tiles[0].blocked=true;
  assert.equal(closeViewCueSegmentOpen(map,.2,1,2.8,1),false,'horizontal gridline covers both rows');
  assert.equal(closeViewCueSegmentOpen(map,1,.2,1,2.8),false,'vertical gridline covers both columns');
  assert.equal(closeViewCueSegmentOpen(map,.2,.2,1.2,.2),false,'blocked start');
  assert.equal(closeViewCueSegmentOpen(map,1.2,.2,.2,.2),false,'blocked end');
  for(const blockedIndex of [0,1,6]){
    const corner:any=open();corner.tiles[blockedIndex].blocked=true;
    for(const [ax,ay,bx,by] of [[1,1,1.1,1.1],[1.1,1.1,1,1],[1,1,1,1]])assert.equal(closeViewCueSegmentOpen(corner,ax,ay,bx,by),false,'both endpoint directions and zero-length corner cover every touched cell');
  }
  assert.equal(closeViewCueSegmentOpen(open(),1,1,1,1),true,'an open zero-length corner remains valid');
  const clean:any=open();
  for(const [ax,ay,bx,by] of [[-.1,1,.2,1],[5.9,1,6.1,1],[1,-.1,1,.2],[1,5.9,1,6.1],[NaN,1,1,1]])assert.equal(closeViewCueSegmentOpen(clean,ax,ay,bx,by),false,'finite rectangle admission');
  delete clean.tiles[1];assert.equal(closeViewCueSegmentOpen(clean,.2,.2,2.8,.2),false,'unknown tile');
  const unseen:any=open();unseen.dungeonContract={discoveryEnabled:true};unseen._dungeonRevealed=new Set();
  assert.equal(closeViewCueSegmentOpen(unseen,.2,.2,.8,.8),false,'undiscovered endpoints cannot emit a cue');
  assert.equal(closeViewCueSegmentOpen(open(20,2),.1,.2,10.1,.2),false,'reject more than eight touched cells');
});

test('actual named tools retain muzzle cues and yield to final hit, dodge and knockdown poses',async()=>{
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,(globalThis as any)[n]]));
  (globalThis as any).window={};(globalThis as any).createImageBitmap=async()=>({width:1024,height:1024});
  (globalThis as any).fetch=async(url:any)=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  const vertices=(color:number)=>{
    const points:number[][]=[];
    for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===color)points.push(Array.from(GLB.decal.slice(b,b+3)));}
    return points;
  };
  try{
    assert.ok(await loadCloseViewHero());
    for(const [kind,name,property] of [['rift-bombard','Rift Bombard','blast'],['blunderbuss','Blunderbuss','quick'],['lumen-spindle','Lumen Spindle','focus']])withGPU({},h=>{
      const g:any=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000}).game;
      // The lab starts beside a wall; keep the full authored barrel in the open lane.
      g.player.x+=.75;g.enemies=[];g.projectiles=[];g.presentation={effectiveQuality:'full',reduceMotion:false};
      g.save.equipment.secondary={id:`secondary-${kind}`,name,slot:'secondary',power:5,property};
      assert.equal(g.fireSecondary(100000,{x:1,y:0}),true,kind);g.lastUpdateNow=100016;
      const draw=()=>{resetCloseViewCamera();const out=frame(h,g);assert.equal(out.showing,true,kind+' keeps Close View');assert.equal(out.copies,1);};
      draw();const flash=vertices(0xffc56b);assert.equal(flash.length,6,kind+' accepted +16ms flash');
      const at=[0,1,2].map(k=>flash.reduce((sum,v)=>sum+v[k],0)/6),shot=g.projectiles.find((p:any)=>p.id===g.player.attackVisual.toolShotId);
      assert.ok(shot,kind+' retains its exact accepted source');
      shot.x=at[0]+.1;shot.y=at[1];draw();assert.equal(vertices(0xffd38a).length,6,kind+' nearby forward connector');
      const accepted=structuredClone(g.player.attackVisual),heads=closeViewGLStats.projectedShots;
      for(const [label,patch] of [['hit',{hitFlash:.18}],['dodge',{dodgeUntil:100276,dodgeX:1,dodgeY:0}],['knockdown',{stunnedAt:100000,stunnedUntil:101000}]] as const){
        const prior=Object.fromEntries(Object.keys(patch).map(k=>[k,g.player[k]]));Object.assign(g.player,patch);
        draw();assert.equal(vertices(0xffc56b).length,0,kind+' '+label+' suppresses flash');assert.equal(vertices(0xffd38a).length,0,kind+' '+label+' suppresses connector');
        assert.equal(closeViewGLStats.projectedShots,heads,'pose priority cannot delete live shots');assert.deepEqual(g.player.attackVisual,accepted,'renderer cannot cancel canonical metadata');
        Object.assign(g.player,prior);
      }
      shot.impact=true;draw();assert.equal(vertices(0xffd38a).length,0,kind+' impact');delete shot.impact;
      shot.returning=true;draw();assert.equal(vertices(0xffd38a).length,0,kind+' returning');delete shot.returning;
      shot.x=at[0]-.1;draw();assert.equal(vertices(0xffd38a).length,0,kind+' backward link');
      shot.x=at[0]+.899;
      const head=projectileVisualPoint(shot,interiorSurfaceHeight(g.map,shot.x,shot.y));
      assert.ok(Math.hypot(head.x-at[0],head.y-at[1])<.9&&Math.hypot(head.x-at[0],head.y-at[1],head.z-at[2])>.9,'full 3D witness passes the old XY bound');
      draw();assert.equal(vertices(0xffd38a).length,0,kind+' excessive 3D span');shot.x=at[0]+.1;
      const tile=g.map.tiles[Math.floor(shot.y)*g.map.width+Math.floor(shot.x)],blocked=tile.blocked;
      try{tile.blocked=true;draw();assert.equal(vertices(0xffd38a).length,0,kind+' blocked endpoint');}finally{tile.blocked=blocked;}
      g.setPaused(true,100016);g.lastUpdateNow=120000;draw();
      assert.equal(vertices(0xffc56b).length,6,kind+' paused flash');assert.equal(vertices(0xffd38a).length,6,kind+' paused positive connector');
    });
  }finally{for(const n of names){if(old.get(n)===undefined)delete (globalThis as any)[n];else (globalThis as any)[n]=old.get(n);}}
});
