import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { stableMount, startRide, triceratopsHornPose, triceratopsDrillPose, TRICERATOPS_DRILL_POSE } from '../src/beast-mounts.ts';
import { drawMount } from '../src/beast-mounts-render.ts';
import { render } from '../src/renderer.ts';
import { drawRangedEffects, standardProjectile, standardProjectileColor, TRICERATOPS_HORN_VISUAL, triceratopsHornFrame, triceratopsHornVertices } from '../src/combat-visuals.ts';
import { CLOSE_VIEW_HOOKS, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewRenderDiagnostics } from '../src/close-view.ts';
import { closeViewGLStats, GLB, BOARD_FLOATS, DECAL_FLOATS, resetCloseViewGL } from '../src/close-view-gl.ts';

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

function fixture(reduce = false) {
  const g = createLabFixture({lab:'combat-assets',scenario:'cleaver-echo-inspection',now:100000}).game;
  g.presentation={effectiveQuality:'full',reduceMotion:reduce}; g.save.closeView=true;
  g.enemies=[]; g.effects=[]; g.glyphVisuals=[]; g.lastUpdateNow=100016;
  g.projectiles=[{id:'horn-shape',triceratopsHorn:true,x:g.player.x+.5,y:g.player.y+.45,dx:1,dy:0,life:1,age:.1,speed:12,path:'straight',damageType:'physical',damage:48,hits:{},pierce:0,glyphHost:'melee'}];
  return g;
}
function frame(h,g){
  h.log.length=0;let plan=null;
  const layer=(ctx,w,height,p)=>{plan=p;drawRangedEffects(ctx,g,w,height,p);};
  CLOSE_VIEW_HOOKS.groundLayers.push(layer);
  try { render(h.screen,g,390,844,g.lastUpdateNow); if(!closeViewShowing(g))drawRangedEffects(h.screen,g,390,844); }
  finally { CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(layer),1); }
  return plan;
}

test('horn silhouette follows flight heading, has fixed bounded geometry, and leaves physics untouched',()=>{
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[3,4],[0,0],[Infinity,NaN]]) {
    const shot={triceratopsHorn:true,dx,dy,path:'straight',damageType:'physical',life:2,age:.1,speed:12,damage:48,hits:{}};
    const before=structuredClone(shot),f=triceratopsHornFrame(shot),out=new Float32Array(36),vertices=triceratopsHornVertices(shot,10,20,3,out);
    assert.equal(vertices,out); assert.equal(vertices.length,36); assert.ok([...vertices].every(Number.isFinite));
    for(let i=0;i<36;i+=9){assert.ok(Math.abs(vertices[i]-(10+f.dx*f.tip))<1e-5);assert.ok(Math.abs(vertices[i+1]-(20+f.dy*f.tip))<1e-5);assert.equal(vertices[i+2],3);}
    for(let i=0;i<36;i+=3)assert.ok(Math.hypot(vertices[i]-10,vertices[i+1]-20,vertices[i+2]-3)<.35);
    assert.deepEqual(shot,before);assert.equal(standardProjectile(shot),true);assert.equal(standardProjectileColor(shot),TRICERATOPS_HORN_VISUAL.color);
  }
  assert.equal(standardProjectileColor({damageType:'physical'}),'#d6b276');
});

test('Standard batches a tapered horn and yields ownership to the projected renderer',()=>{
  const g=fixture(),log=[],ctx=context(log,'screen'),before=structuredClone(g.projectiles);
  drawRangedEffects(ctx,g,390,844);
  const shot=g.projectiles[0],f=triceratopsHornFrame(shot),s=33,x=195+(shot.x-g.player.x)*s,y=422+(shot.y-g.player.y)*s;
  assert.ok(log.some(q=>q[1]==='moveTo'&&Math.abs(q[2]-(x+f.dx*f.tip*s))<1e-6&&Math.abs(q[3]-y)<1e-6));
  assert.ok(log.some(q=>q[1]==='lineTo'&&Math.abs(q[2]-(x+f.base*s))<1e-6&&Math.abs(q[3]-(y+f.radius*s))<1e-6));
  assert.deepEqual(g.projectiles,before);
  log.length=0;drawRangedEffects(ctx,g,390,844,new Set(g.projectiles));
  assert.equal(log.some(q=>q[1]==='fillStyle'&&q[2]===TRICERATOPS_HORN_VISUAL.color),false);
});

test('Close View renders twelve horn vertices at both motion settings and restores Standard on failure',()=>withGPU({},h=>{
  for(const reduce of [false,true]){
    const g=fixture(reduce),before=structuredClone(g.projectiles),plan=frame(h,g);
    assert.equal(closeViewShowing(g),true);assert.equal(plan.has(g.projectiles[0]),true);assert.equal(closeViewGLStats.projectedShots,1);
    const horn=[];
    for(let i=0;i<GLB.nDecal;i++){const at=i*DECAL_FLOATS;if(GLB.decal[at+5]===11&&GLB.decal[at+7]===parseInt(TRICERATOPS_HORN_VISUAL.color.slice(1),16))horn.push([...GLB.decal.slice(at,at+DECAL_FLOATS)]);}
    assert.equal(horn.length,12);assert.ok(horn.every(v=>v[3]===0&&v[4]===0));
    assert.ok(new Set(horn.map(v=>v[2])).size>=3,'horn has vertical thickness from side cameras');
    assert.deepEqual(g.projectiles,before);
    h.gl.fault='draw';frame(h,g);
    assert.equal(closeViewShowing(g),false);assert.equal(closeViewGLStats.projectedShots,0);
    assert.ok(h.log.some(q=>q[0]==='screen'&&q[1]==='fillStyle'&&q[2]===TRICERATOPS_HORN_VISUAL.color));
    assert.deepEqual(g.projectiles,before);
    h.gl.fault='';resetCloseViewGL();resetCloseViewCamera();
  }
}));


test('mounted head articulation leaves saddle and rider anchor fixed, mirrors and clears for other mounts',()=>{
  const log=[],ctx=context(log,'mount'),p={x:10,y:10,facing:'right',walkPhase:0},m={id:'trike',beast:'triceratops'};
  const idle={...drawMount(ctx,m,p,33,1000)},idleSaddle=log.filter(q=>q[1]==='fillRect'&&q[4]>20);
  log.length=0;
  const pose={phase:'bash',pitch:.1,reach:.16,lower:.025,x:1,y:0};
  assert.deepEqual({...drawMount(ctx,m,p,33,1000,0,false,pose)},idle);
  assert.ok(log.some(q=>q[1]==='rotate'&&q[2]===.1));
  assert.deepEqual(log.filter(q=>q[1]==='fillRect'&&q[4]>20),idleSaddle);
  log.length=0;drawMount(ctx,m,p,33,1000,0,false,pose,'left');
  assert.ok(log.some(q=>q[1]==='rotate'&&q[2]===-.1));
  log.length=0;drawMount(ctx,{id:'stag',beast:'briarStag'},p,33,1000,0,false,pose);
  assert.equal(log.some(q=>q[1]==='rotate'&&Math.abs(q[2])===.1),false);
});

test('Close View preserves the posed Triceratops composite and falls back without stealing rider facing',()=>withGPU({},h=>{
  const g=createLabFixture({lab:'triceratops-recovery',scenario:'triceratops-good',now:100000}).game;
  const m=stableMount(g.save,'triceratops').mount;startRide(g.save,m.id);
  g.enemies=[];g.effects=[];g.glyphVisuals=[];g.projectiles=[];g.save.closeView=true;g.save.overworldCloseView=true;
  g.presentation={effectiveQuality:'full'};g.player.facing='left';g.player.hp=100;g.lastUpdateNow=100700;
  g.triceratopsCharge={mount:m.id,start:100000,phase:'hold',x:1,y:0};
  const pose=triceratopsHornPose(g,m,g.lastUpdateNow),playerFacing=g.player.facing;
  frame(h,g);
  assert.equal(closeViewShowing(g),true);assert.equal(closeViewRenderDiagnostics().player,'billboard');
  assert.equal(g.player.facing,playerFacing);
  assert.ok(h.log.some(q=>q[0]==='ground'&&q[1]==='rotate'&&Math.abs(Math.abs(q[2])-pose.pitch)<1e-9),'composite paints the accepted neck pose');
  assert.ok(h.log.some(q=>q[0]==='ground'&&q[1]==='fillStyle'&&q[2]==='#6b3f22'),'saddle survives native admission');
  h.gl.fault='draw';frame(h,g);
  assert.equal(closeViewShowing(g),false);assert.equal(g.player.facing,playerFacing);
  assert.ok(h.log.some(q=>q[0]==='screen'&&q[1]==='rotate'&&Math.abs(Math.abs(q[2])-pose.pitch)<1e-9));
  h.gl.fault='';g.dismount();frame(h,g);
  assert.equal(closeViewShowing(g),true);
  assert.ok(closeViewRenderDiagnostics().nativeActors>0,'unmounted hero returns to ordinary native admission');
}));


test('Silly Goose rolls mount, saddle and rider together with below bounds and reduced-motion banking',()=>withGPU({},h=>{
  const g=createLabFixture({lab:'triceratops-recovery',scenario:'triceratops-silly',now:100000}).game;
  const m=stableMount(g.save,'triceratops',{triceratopsDisposition:'silly'}).mount;startRide(g.save,m.id);
  g.enemies=[];g.effects=[];g.glyphVisuals=[];g.projectiles=[];g.save.closeView=true;g.save.overworldCloseView=true;
  g.presentation={effectiveQuality:'full'};g.player.hp=g.save.maxHp;g.player.facing='right';g.save.lastAim={x:1,y:0};
  g.update(.01,{state:{x:0,y:0},consume:k=>k==='jump',held:()=>false},100000);g.lastUpdateNow=100195;
  const group=(tag,roll)=>{const at=h.log.findIndex(q=>q[0]===tag&&q[1]==='scale'&&q[2]===1&&Math.abs(q[3]-roll)<1e-9);assert.ok(at>=0,'accepted axial roll');let depth=0,end=at+1;for(;end<h.log.length;end++){const q=h.log[end];if(q[0]!==tag)continue;if(q[1]==='save')depth++;if(q[1]==='restore'){if(!depth)break;depth--;}}const drawn=h.log.slice(at,end);assert.ok(drawn.some(q=>q[1]==='fillStyle'&&q[2]==='#6b3f22'),'saddle inside transform');assert.ok(drawn.some(q=>q[1]==='fillStyle'&&q[2]==='#171817'),'rider inside transform');};
  const pose=triceratopsDrillPose(g,m,g.lastUpdateNow);assert.ok(pose.roll<0);frame(h,g);assert.equal(closeViewShowing(g),true);group('ground',pose.roll);
  assert.equal(closeViewRenderDiagnostics().player,'billboard');assert.equal(g.player.facing,'right');
  const bottoms=[];for(let i=0;i<GLB.nBoard;i++)bottoms.push(GLB.board[i*BOARD_FLOATS+2]);
  assert.ok(bottoms.some(z=>Math.abs(z+TRICERATOPS_DRILL_POSE.below)<1e-4),'GPU card retains the below-pivot composite');
  h.gl.fault='draw';frame(h,g);assert.equal(closeViewShowing(g),false);group('screen',pose.roll);
  h.gl.fault='';g.presentation.reduceMotion=true;const quiet=triceratopsDrillPose(g,m,g.lastUpdateNow,true);assert.equal(quiet.roll,1);assert.ok(Math.abs(quiet.bank)<.1);frame(h,g);assert.equal(closeViewShowing(g),true);group('ground',1);
}));
