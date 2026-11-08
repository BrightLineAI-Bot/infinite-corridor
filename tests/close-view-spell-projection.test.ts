import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { CLOSE_VIEW_HOOKS, closeViewCueSegmentOpen, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, GLB, DECAL_FLOATS, resetCloseViewGL } from '../src/close-view-gl.ts';
import { drawToolForms } from '../src/tool-forms.ts';
import { drawOrbit, ORBIT } from '../src/orbit-volley.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { loadCloseViewHero } from '../src/close-view-hero.ts';
import { projectileVisualPoint } from '../src/actor-presentation.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';

const context = (calls:any[]) => new Proxy({ canvas:{width:800,height:600}, globalAlpha:1 }, { get(o:any,k:any) { if (k in o) return o[k]; return (...a:any[]) => { calls.push([k,...a]); return k === 'createRadialGradient' ? { addColorStop(){} } : undefined; }; }, set(o:any,k:any,v:any){o[k]=v;return true;} });
const openMap = (w=6,h=6) => ({width:w,height:h,tiles:Array.from({length:w*h},()=>({blocked:false,seen:true,discovered:true}))});

test('exact source masks only the admitted Fire shell and Orbit flight body', () => {
  const fireA:any={id:'a',x:2,y:2,dx:1,dy:0,age:.02,fireBomb:true},fireB:any={...fireA,id:'b'};
  const flight:any={x:3,y:2,tx:4,ty:2,radius:ORBIT.radius,perfect:false};
  const game:any={lastUpdateNow:1000,presentation:{},effects:[],projectiles:[fireA,fireB],orbit:{flight}};
  const owned:any=new Set([fireA]);owned.orbit=flight;
  const masked:any[]=[];drawToolForms(context(masked),game,(q:any)=>[q.x*40,q.y*40],40,0,owned);drawOrbit(context(masked),game,(q:any)=>[q.x*40,q.y*40],40,0,owned);
  const ordinary:any[]=[];drawToolForms(context(ordinary),game,(q:any)=>[q.x*40,q.y*40],40,0,null);drawOrbit(context(ordinary),game,(q:any)=>[q.x*40,q.y*40],40,0,null);
  assert.ok(masked.filter(q=>q[0]==='arc').length<ordinary.filter(q=>q[0]==='arc').length,'one Fire and one Orbit body are exclusively owned');
  const equal:any[]=[];drawToolForms(context(equal),game,(q:any)=>[q.x*40,q.y*40],40,0,new Set([{...fireA}]));
  const fireOnlyOrdinary:any[]=[];drawToolForms(context(fireOnlyOrdinary),game,(q:any)=>[q.x*40,q.y*40],40,0,null);
  assert.equal(equal.filter(q=>q[0]==='arc').length,fireOnlyOrdinary.filter(q=>q[0]==='arc').length,'equal coordinates do not mask a distinct source reference');
});

test('bounded supercover rejects walls, corners, map wrap and over-eight-cell segments', () => {
  const map:any=openMap();
  assert.equal(closeViewCueSegmentOpen(map,.2,.2,2.8,.2),true);
  map.tiles[1].blocked=true;assert.equal(closeViewCueSegmentOpen(map,.2,.2,2.8,.2),false);
  map.tiles[1].blocked=false;map.tiles[1*6+0].blocked=true;assert.equal(closeViewCueSegmentOpen(map,.2,.2,1.8,1.8),false,'corner-touch side cell is covered');
  assert.equal(closeViewCueSegmentOpen(map,-.1,.2,.2,.2),false);
  assert.equal(closeViewCueSegmentOpen(openMap(20,2),.1,.2,10.1,.2),false);
  const edge:any=openMap();edge.tiles[0].blocked=true;assert.equal(closeViewCueSegmentOpen(edge,.2,1,2.8,1),false,'horizontal boundary covers the other row');
  const vertical:any=openMap();vertical.tiles[0].blocked=true;assert.equal(closeViewCueSegmentOpen(vertical,1,.2,1,2.8),false,'vertical boundary covers the other column');
});

test('Fire survives JSON while Orbit gather and flight remain intentionally absent', () => {
  const g:any=new Game(freshSave(77),1000);g.save.lastAim={x:1,y:0};g.lastUpdateNow=1000;
  assert.equal(g.castSpell('fire-burst'),true);const fire=g.projectiles.filter((p:any)=>p.fireBomb);assert.equal(fire.length,5);
  g.orbit={start:900,flight:{x:10.5,y:10.45,tx:14,y2:10.45,radius:ORBIT.radius,perfect:false,damage:1}};
  g.setPaused(true,1010);const back:any=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(1010)))),9000);
  assert.equal(back.projectiles.filter((p:any)=>p.fireBomb).length,5);assert.equal(back.orbit==null,true);
});

class ProjectionGL {
  allocated=new WeakSet();boundTexture:any=null;unallocatedUpdates=0;lost=false;error=0;failUpload=false;failHeroUpload=false;loseOnUpload=false;nullKind='';created:any={program:0,buffer:0,vao:0,texture:0};program:any=null;
  constructor(){let n=1;const constants=new Map();return new Proxy(this,{get:(o:any,k:any)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!constants.has(k))constants.set(k,n++);return constants.get(k);}return()=>{};}});}
  bindTexture(_t:any,v:any){this.boundTexture=v;}texImage2D(){if(this.boundTexture)this.allocated.add(this.boundTexture);}texSubImage2D(){if(this.boundTexture&&!this.allocated.has(this.boundTexture)){this.unallocatedUpdates++;this.error=this.INVALID_OPERATION;}}isContextLost(){return this.lost;}getError(){return this.error||this.NO_ERROR;}getExtension(){return null;}
  createShader(){return{};}shaderSource(s:any,text:string){s.text=text;}getShaderParameter(){return true;}
  createProgram(){this.created.program++;return this.nullKind==='program'&&this.created.program===1?null:{shaders:[]};}attachShader(p:any,s:any){p.shaders.push(s);}getProgramParameter(p:any,k:any){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}useProgram(p:any){this.program=p;}
  createBuffer(){this.created.buffer++;return this.nullKind==='buffer'&&this.created.buffer===4?null:{};}createVertexArray(){this.created.vao++;return this.nullKind==='vao'&&this.created.vao===5?null:{};}createTexture(){this.created.texture++;return this.nullKind==='texture'&&this.created.texture===1?null:{};}
  bufferData(_t:any,data:any){if(data instanceof Float32Array&&data.length>6){if(this.failUpload)throw new Error('mock upload');if(this.loseOnUpload)this.lost=true;}}
  bufferSubData(){if(this.failHeroUpload)throw new Error('mock hero upload');}
}
const gpuContext=(log:any[])=>new Proxy({canvas:null as any,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o:any,k:any)=>k in o?o[k]:(...a:any[])=>log.push([k,...a]),set:(o:any,k:any,v:any)=>(o[k]=v,true)});
function withProjectionGPU(options:any,run:(x:any)=>void){const old=(globalThis as any).WebGL2RenderingContext,gl:any=new ProjectionGL();Object.assign(gl,options);const log:any[]=[],screen:any=gpuContext(log),canvas:any={width:390,height:844,addEventListener(){},getContext:(k:string)=>k==='webgl2'?gl:gpuContext(log)},ground:any={width:390,height:844,getContext:()=>gpuContext(log)},screenCanvas:any={width:390,height:844};let made=0;screen.canvas=screenCanvas;(globalThis as any).WebGL2RenderingContext=ProjectionGL;setCloseViewCanvasFactory(()=>{made++;return made===1?ground:made===2?canvas:{width:390,height:844,addEventListener(){},getContext:(k:string)=>k==='webgl2'?gl:gpuContext(log)};});CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();resetCloseViewCamera();try{run({gl,log,screen,canvas});}finally{delete (CLOSE_VIEW_HOOKS as any).reserve;CLOSE_VIEW_HOOKS.groundLayers.length=0;CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete (globalThis as any).WebGL2RenderingContext;else (globalThis as any).WebGL2RenderingContext=old;}}
function spellGame(now=100000){const {game:g}:any=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now});g.enemies=[];g.projectiles=[];g.presentation={effectiveQuality:'full',reduceMotion:false};g.save.lastAim={x:1,y:0};g.lastUpdateNow=now;assert.equal(g.castSpell('fire-burst'),true);return g;}
function productionFrame(screen:any,g:any,now:number,log:any[]){let plan:any=null;const layer=(c:any,w:number,h:number,p:any)=>{plan=p;drawRangedEffects(c,g,w,h,p);};CLOSE_VIEW_HOOKS.groundLayers.push(layer);try{render(screen,g,390,844,now);if(!closeViewShowing(g))drawRangedEffects(screen,g,390,844);}finally{CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(layer),1);}return {showing:closeViewShowing(g),plan,copies:log.filter(q=>q[0]==='drawImage').length,arcs:log.filter(q=>q[0]==='arc').length};}

test('actual Game production renderer owns five Fire bodies once and keeps Game immutable',()=>withProjectionGPU({},({screen,log})=>{
  const g:any=spellGame();for(const p of g.projectiles)p.age=.02;const before=structuredClone({player:g.player,projectiles:g.projectiles,orbit:g.orbit});const out=productionFrame(screen,g,100016,log);
  assert.equal(out.showing,true);assert.equal(closeViewGLStats.projectedShots,5);assert.equal(g.projectiles.filter((p:any)=>p.fireBomb).length,5);
  const fireVerts=[];for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+5]===11&&GLB.decal[b+7]===0xff7a2a)fireVerts.push(i);}assert.equal(fireVerts.length,60,'five heads and five bounded trails share the additive stream');
  assert.deepEqual({player:g.player,projectiles:g.projectiles,orbit:g.orbit},before);
}));

test('critical null resources and CPU reservation failure leave ordinary Fire unmasked',()=>{
  for(const fault of ['program','buffer','vao','texture','reserve'])withProjectionGPU(fault==='reserve'?{}:{nullKind:fault},({screen,log})=>{const g:any=spellGame();if(fault==='reserve')(CLOSE_VIEW_HOOKS as any).reserve=()=>{throw new RangeError('reserve');};const out=productionFrame(screen,g,100016,log);assert.equal(out.showing,false,fault);assert.ok(out.arcs>=10,`${fault}: ordinary five-shell bodies remain`);assert.equal(closeViewGLStats.projectedShots??0,0,fault);});
});

test('upload exception and context loss after floor capture fall back before GL canvas copy',()=>{
  for(const fault of ['upload','loss'])withProjectionGPU(fault==='upload'?{failUpload:true}:{loseOnUpload:true},({screen,log,canvas})=>{const g:any=spellGame(),before=structuredClone(g.projectiles);const out=productionFrame(screen,g,100016,log);assert.equal(out.showing,false,fault);assert.ok(out.arcs>=10,`${fault}: ordinary fallback bodies`);assert.equal(log.some(q=>q[0]==='drawImage'&&q[1]===canvas),false,'actual failed GL canvas is never copied');assert.deepEqual(g.projectiles,before);assert.equal(closeViewGLStats.ready,false,'failed frame invalidates cached GPU readiness before any successful presentation');});
});

test('success then GL error then success reallocates fresh texture storage',()=>withProjectionGPU({},({gl,screen,log})=>{const g:any=spellGame();assert.equal(productionFrame(screen,g,100016,log).showing,true);gl.error=gl.INVALID_OPERATION;assert.equal(productionFrame(screen,g,100032,log).showing,false);gl.error=0;assert.equal(productionFrame(screen,g,100048,log).showing,true);assert.equal(gl.unallocatedUpdates,0,'new ground/mask textures receive storage before sub-image updates');}));

test('unknown future launch descriptors remain on the ordinary floor path',()=>withProjectionGPU({},({screen,log})=>{const g:any=spellGame();for(const p of g.projectiles)p.visualLaunch={v:99,x:4};g.orbit={start:99900,where:`${g.area}:${g.areaId()}`,flight:{x:g.player.x+.5,y:g.player.y+.45,tx:g.player.x+4,ty:g.player.y+.45,radius:ORBIT.radius,perfect:false,damage:1,visualLaunch:{v:2}}};const out=productionFrame(screen,g,100016,log);assert.equal(closeViewGLStats.projectedShots,0);assert.ok(out.arcs>=12,'five Fire shells and Orbit ball retain ordinary owners');}));

test('shared caps preserve ordinary priority, then Fire, then exact Orbit reference',()=>withProjectionGPU({},({screen,log})=>{
  const g:any=spellGame();const fire=[...g.projectiles],ordinary=Array.from({length:28},(_,i)=>({id:`o${i}`,x:g.player.x+.5+i*.01,y:g.player.y+.6,dx:1,dy:0,age:.02,speed:2,life:1,damage:1,hostile:true}));g.projectiles=[...ordinary,...fire];g.orbit={start:99900,where:`${g.area}:${g.areaId()}`,flight:{x:g.player.x+.5,y:g.player.y+.45,tx:g.player.x+4,ty:g.player.y+.45,radius:ORBIT.radius,perfect:false,damage:1}};const out=productionFrame(screen,g,100016,log);assert.equal(closeViewGLStats.projectedShots,28);assert.deepEqual(out.plan.entries.map((e:any)=>e.source),ordinary,'the first 28 ordinary source references own every slot in array order');assert.ok(fire.every((p:any)=>!out.plan.has(p)));assert.notStrictEqual(out.plan.orbit,g.orbit.flight);assert.equal(GLB.nDecal<=28*12+12+400*6,true);
  const g2:any=spellGame(101000),fire2=[...g2.projectiles],ordinary2=Array.from({length:26},(_,i)=>({id:`m${i}`,x:g2.player.x+.5+i*.01,y:g2.player.y+.6,dx:1,dy:0,age:.02,speed:2,life:1,damage:1,hostile:true}));g2.projectiles=[...ordinary2,...fire2];g2.orbit={start:100900,where:`${g2.area}:${g2.areaId()}`,flight:{x:g2.player.x+.5,y:g2.player.y+.45,tx:g2.player.x+4,ty:g2.player.y+.45,radius:ORBIT.radius,perfect:false,damage:1}};resetCloseViewCamera();const mixed=productionFrame(screen,g2,101016,log);assert.deepEqual(mixed.plan.entries.slice(0,26).map((e:any)=>e.source),ordinary2);assert.deepEqual(mixed.plan.entries.slice(26).map((e:any)=>e.source),fire2.slice(0,2));assert.equal(mixed.plan.orbit,null);const floor:any[]=[];drawToolForms(context(floor),g2,(q:any)=>[q.x*40,q.y*40],40,0,mixed.plan);assert.equal(floor.filter(q=>q[0]==='arc').length,6,'three overflow Fire sources retain exactly their floor bodies while two own raised heads');
}));

test('actual quality caps are 12/20/28 and reduced motion retains heads without trails',()=>withProjectionGPU({},({screen,log})=>{
  for(const [quality,cap] of [['low',12],['balanced',20],['full',28]] as const){const g:any=spellGame();g.presentation.effectiveQuality=quality;g.projectiles=[...Array.from({length:40},(_,i)=>({id:`${quality}-${i}`,x:g.player.x+.5+i*.005,y:g.player.y+.6,dx:1,dy:0,age:.02,speed:2,life:1,damage:1,hostile:true})),...g.projectiles];resetCloseViewCamera();productionFrame(screen,g,100016,log);assert.equal(closeViewGLStats.projectedShots,cap,quality);}
  const g:any=spellGame();for(const p of g.projectiles)p.age=.02;g.presentation.reduceMotion=true;resetCloseViewCamera();productionFrame(screen,g,100016,log);let n=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+5]===11&&GLB.decal[b+7]===0xff7a2a)n++;}assert.equal(n,30,'five heads, no trails');
}));

test('final imported left socket owns Fire flash and exact central connector only',async()=>{
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,(globalThis as any)[n]]));
  (globalThis as any).window={};(globalThis as any).createImageBitmap=async()=>({width:1024,height:1024});(globalThis as any).fetch=async(url:any)=>{const b=fs.readFileSync(new URL(url));return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  try{assert.ok(await loadCloseViewHero());withProjectionGPU({failHeroUpload:true},({screen,log,canvas})=>{const g:any=spellGame();const out=productionFrame(screen,g,100016,log);assert.equal(out.showing,false,'selected imported hero upload failure falls back whole-frame');assert.ok(out.arcs>=10);assert.equal(log.some(q=>q[0]==='drawImage'&&q[1]===canvas),false);});withProjectionGPU({},({screen,log})=>{const g:any=spellGame(),record=g.player.castVisual;resetCloseViewCamera();productionFrame(screen,g,100016,log);let flash=0,link=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xff7a2a)flash++;if(GLB.decal[b+7]===0xff9a4a)link++;}assert.equal(flash,36,'five heads plus one left-socket flash');assert.equal(link,6,'exact central accepted shell only');assert.ok(Array.from(GLB.decal.slice(0,GLB.nDecal*DECAL_FLOATS)).every(Number.isFinite),'non-origin socket geometry is finite');
    g.projectiles=g.projectiles.filter((p:any)=>p.id!==record.sourceId);resetCloseViewCamera();productionFrame(screen,g,100032,log);link=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xff9a4a)link++;}assert.equal(link,0,'missing center cannot borrow a side pellet');
    g.primaryAttack(100032);resetCloseViewCamera();productionFrame(screen,g,100048,log);flash=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xff7a2a)flash++;}assert.equal(flash,24,'final primary action cancels the stale Fire cue while four heads remain');
  });withProjectionGPU({},({screen,log})=>{const {game:g}:any=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:110000});g.enemies=[];g.projectiles=[];g.presentation={effectiveQuality:'full',reduceMotion:false};g.save.lastAim={x:1,y:0};g.lastUpdateNow=110000;assert.equal(g.castSpell('orbit-volley'),true);g.lastUpdateNow=110100;assert.equal(g.castSpell('orbit-volley'),true);assert.ok(g.orbit?.flight);resetCloseViewCamera();productionFrame(screen,g,110116,log);let violet=0,connector=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xb48cff)violet++;if(GLB.decal[b+7]===0xff9a4a)connector++;}assert.equal(violet,12,'one Orbit head and one left-socket flash');assert.equal(connector,0,'Orbit has no connector');assert.ok(Array.from(GLB.decal.slice(0,GLB.nDecal*DECAL_FLOATS)).every(Number.isFinite));
    g.setPaused(true,110116);resetCloseViewCamera();productionFrame(screen,g,120000,log);let paused=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xb48cff)paused++;}assert.equal(paused,12,'pause freezes Orbit cue and flight');const back:any=new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(110116)))),200000);back.enemies=[];back.presentation=g.presentation;resetCloseViewCamera();productionFrame(screen,back,200000,log);let phantom=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xb48cff)phantom++;}assert.equal(phantom,0,'restored launch descriptor creates neither ball nor flash');
    const auto:any=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:130000}).game;auto.enemies=[];auto.projectiles=[];auto.presentation={effectiveQuality:'full'};auto.save.lastAim={x:1,y:0};auto.lastUpdateNow=130000;assert.equal(auto.castSpell('orbit-volley'),true);const gatherVisual=auto.player.castVisual;auto.tickOrbit(0,133200);assert.ok(auto.orbit?.flight);assert.strictEqual(auto.player.castVisual,gatherVisual,'automatic launch does not restamp manual cue metadata');resetCloseViewCamera();productionFrame(screen,auto,133200,log);let automatic=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===0xb48cff)automatic++;}assert.equal(automatic,6,'automatic flight has a head and no hand flash');auto.primaryAttack(133201);resetCloseViewCamera();productionFrame(screen,auto,133202,log);assert.equal(closeViewGLStats.projectedShots,1,'newer action does not erase the live automatic ball');auto.orbit.flight.tx=auto.orbit.flight.x;auto.orbit.flight.ty=auto.orbit.flight.y;auto.tickOrbit(.001,133203);assert.equal(auto.orbit,null,'point-blank first tick pop removes source immediately');resetCloseViewCamera();productionFrame(screen,auto,133204,log);assert.equal(closeViewGLStats.projectedShots,0);
  });}finally{for(const n of names){if(old.get(n)===undefined)delete (globalThis as any)[n];else (globalThis as any)[n]=old.get(n);}}
});

test('actual tool and Fire casts share one final-action release lane without losing live bodies',async()=>{
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,(globalThis as any)[n]]));
  (globalThis as any).window={};(globalThis as any).createImageBitmap=async()=>({width:1024,height:1024});
  (globalThis as any).fetch=async(url:any)=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  const count=(color:number)=>{let n=0;for(let i=GLB.nGlowStart;i<GLB.nDecal;i++)if(GLB.decal[i*DECAL_FLOATS+7]===color)n++;return n;};
  try{assert.ok(await loadCloseViewHero());withProjectionGPU({},({screen,log})=>{
    const g:any=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000}).game;
    g.player.x+=.75;g.enemies=[];g.projectiles=[];g.presentation={effectiveQuality:'full',reduceMotion:false};g.save.lastAim={x:1,y:0};
    g.save.equipment.secondary={id:'secondary-rift-bombard',name:'Rift Bombard',slot:'secondary',power:5,property:'blast'};
    const draw=(now:number)=>{resetCloseViewCamera();assert.equal(productionFrame(screen,g,now,log).showing,true);};
    assert.equal(g.fireSecondary(100000,{x:1,y:0}),true);draw(100016);assert.equal(count(0xffc56b),6,'accepted tool owns its positive flash');
    g.lastUpdateNow=100450;assert.equal(g.castSpell('fire-burst'),true);draw(100466);
    assert.equal(closeViewGLStats.projectedShots,6,'the older Bombard shell and five Fire sources all remain admitted');
    assert.equal(count(0xffc56b),0,'Fire owns the final pose instead of the old tool flash');assert.equal(count(0xffd38a),0,'old tool cannot borrow the spell hand');
    assert.equal(count(0xff7a2a),36,'five Fire heads plus exactly one positive left-hand flash');
    const accepted=structuredClone(g.player.castVisual),fire=g.projectiles.filter((p:any)=>p.fireBomb&&p.glyphSpell==='fire-burst');assert.equal(fire.length,5);
    assert.equal(g.fireSecondary(100466,{x:1,y:0}),true);draw(100482);
    assert.equal(closeViewGLStats.projectedShots,7,'new tool adds one canonical source without replacing either older family');
    assert.equal(count(0xffc56b),6,'new tool owns the sole positive release flash');assert.equal(count(0xff7a2a),30,'all five Fire heads survive without a stale hand flash');assert.equal(count(0xff9a4a),0,'cancelled Fire cannot retain a connector');
    assert.equal(g.player.castVisual.cancelled,true);assert.equal(g.player.castVisual.sourceId,accepted.sourceId);assert.ok(fire.every((p:any)=>g.projectiles.includes(p)),'drawing preserves the exact Fire source objects');
  });}finally{for(const n of names){if(old.get(n)===undefined)delete (globalThis as any)[n];else (globalThis as any)[n]=old.get(n);}}
});

test('all three authored tool muzzles flash and forward connectors obey full 3D bounds',async()=>{
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,(globalThis as any)[n]]));
  (globalThis as any).window={};(globalThis as any).createImageBitmap=async()=>({width:1024,height:1024});
  (globalThis as any).fetch=async(url:any)=>{const b=fs.readFileSync(new URL(url));return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  const vertices=(color:number)=>{const points:number[][]=[];for(let i=GLB.nGlowStart;i<GLB.nDecal;i++){const b=i*DECAL_FLOATS;if(GLB.decal[b+7]===color)points.push(Array.from(GLB.decal.slice(b,b+3)));}return points;};
  try{
    assert.ok(await loadCloseViewHero());
    for(const [kind,name,property] of [['rift-bombard','Rift Bombard','blast'],['blunderbuss','Blunderbuss','quick'],['lumen-spindle','Lumen Spindle','focus']])withProjectionGPU({},({screen,log})=>{
      const g:any=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000}).game;
      // This lab starts beside a wall: move within its open lane so the authored barrel is unobstructed.
      g.player.x+=.75;g.enemies=[];g.projectiles=[];g.presentation={effectiveQuality:'full',reduceMotion:false};
      g.save.equipment.secondary={id:`secondary-${kind}`,name,slot:'secondary',power:5,property};g.lastUpdateNow=100000;
      assert.equal(g.fireSecondary(100000,{x:1,y:0}),true,kind);
      const draw=(now=100016)=>{resetCloseViewCamera();assert.equal(productionFrame(screen,g,now,log).showing,true,kind);};
      draw();const flash=vertices(0xffc56b);assert.equal(flash.length,6,`${kind}: normal accepted +16ms muzzle flash`);
      const at=[0,1,2].map(axis=>flash.reduce((sum,p)=>sum+p[axis],0)/6),shot=g.projectiles.find((p:any)=>p.id===g.player.attackVisual.toolShotId);
      assert.ok(shot,`${kind}: exact accepted source`);
      // Move only this test source along its accepted forward ray; canonical production geometry stays untouched.
      shot.x=at[0]+.1;shot.y=at[1];draw();assert.equal(vertices(0xffd38a).length,6,`${kind}: nearby forward head connects`);
      shot.x=at[0]+.899;
      const head=projectileVisualPoint(shot,interiorSurfaceHeight(g.map,shot.x,shot.y)),xy=Math.hypot(head.x-at[0],head.y-at[1]),span=Math.hypot(head.x-at[0],head.y-at[1],head.z-at[2]);
      assert.ok(xy<.9&&span>.9,`${kind}: witness passes XY but exceeds full 3D (${xy}, ${span})`);
      assert.equal(closeViewCueSegmentOpen(g.map,at[0],at[1],head.x,head.y),true,'the witness is clear and discovered');
      draw();assert.equal(vertices(0xffd38a).length,0,`${kind}: excessive vertical-inclusive span rejects connector`);
      shot.x=at[0]+.1;shot.impact=true;draw();assert.equal(vertices(0xffd38a).length,0,`${kind}: impact cannot link`);delete shot.impact;
      const tile=g.map.tiles[Math.floor(shot.y)*g.map.width+Math.floor(shot.x)],blocked=tile.blocked;
      try{tile.blocked=true;draw();assert.equal(vertices(0xffd38a).length,0,`${kind}: blocked segment cannot link`);}finally{tile.blocked=blocked;}
      g.setPaused(true,100016);draw(120000);assert.equal(vertices(0xffc56b).length,6,`${kind}: paused flash retains logical age`);assert.equal(vertices(0xffd38a).length,6,`${kind}: paused positive connector stays bounded`);
    });
  }finally{for(const n of names){if(old.get(n)===undefined)delete (globalThis as any)[n];else (globalThis as any)[n]=old.get(n);}}
});
