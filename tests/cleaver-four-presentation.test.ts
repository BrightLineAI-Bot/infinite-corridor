import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCloseViewHero,createHeroPoseState,createHeroFrame,sampleCloseViewHero,loadCloseViewHero} from '../src/close-view-hero.ts';
import {writeCloseViewHeroGear,writeCloseViewModel,MODEL_FLOATS,modelTriangleCount} from '../src/close-view-models.ts';
import {cleaverHandRoles} from '../src/close-view-player-presentation.ts';
import {primaryCarryStage,primaryVisualStage} from '../src/action-motion.ts';
import {createLabFixture} from '../src/proving-ground-labs.ts';
import {CLOSE_VIEW_HOOKS,closeViewEchoRibbons,closeViewShowing,resetCloseViewCamera,setCloseViewCanvasFactory} from '../src/close-view.ts';
import {closeViewGLStats,GLB,DECAL_FLOATS,resetCloseViewGL} from '../src/close-view-gl.ts';
import {render} from '../src/renderer.ts';
import {drawRangedEffects} from '../src/combat-visuals.ts';
const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8')),bytes=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url)),asset=decodeCloseViewHero(meta,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const base={nowMs:1200,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0,heldProfile:'verge-cleaver'};
const stage=step=>({kind:'cleaver-four',step,direction:step%2?1:-1});
function sampled(step,p,extra={}){const state=createHeroPoseState(asset),frame=createHeroFrame(asset),input={...base,...extra,nowMs:1200+p*240,primaryCarryStage:stage(step),action:{kind:'melee',profile:'verge-cleaver',primaryMotion:{v:2,step},phase:p,durationMs:240,poseMs:1200,yaw:extra.yaw||0}};assert.equal(sampleCloseViewHero(asset,state,input,frame),true);return {state,frame,input};}
function gearOf(frame,primaryStage=stage(1)){const out=new Float32Array(7680),end=writeCloseViewHeroGear(out,0,{profile:'verge-cleaver',primaryStage,leftSocket:frame.leftSocket,rightSocket:frame.rightSocket});assert.ok(end>0);return out.slice(0,end);}
function tipOf(frame,gear){const m=frame.leftSocket,len=Math.hypot(m[0],m[1],m[2]);let best=-Infinity,index=0;for(let i=0;i<gear.length;i+=10){const d=[0,1,2].reduce((sum,k)=>sum+(gear[i+k]-m[12+k])*m[k]/len,0);if(d>best){best=d;index=i;}}return {point:Array.from(gear.slice(index,index+3)),index};}

test('actual imported and native Cleaver tips cut up/down/up/down with anatomical right carry',()=>{
  for(let step=1;step<=4;step++){
    const a=sampled(step,.12),b=sampled(step,.40),ga=gearOf(a.frame,stage(step)),gb=gearOf(b.frame,stage(step)),ta=tipOf(a.frame,ga),tb=tipOf(b.frame,gb),sign=step%2?1:-1;
    assert.ok((tb.point[2]-ta.point[2])*sign>1,'actual blade tip crosses vertically, not just a hit effect');
    const native=p=>{const out=new Float32Array(7680),end=writeCloseViewModel(out,0,{kind:'playerVergeCleaver',x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'attack',amount:p,primaryStage:stage(step)});return {out,end};},na=native(.12),nb=native(.4);
    assert.ok((nb.out[nb.end-gb.length+tb.index+2]-na.out[na.end-ga.length+ta.index+2])*sign>.5,'native fallback has the same signed cut');
    const carry=sampled(step,0);assert.ok(carry.frame.leftSocket[13]>.15,'rear screen-right is positive world lateral');assert.ok(-carry.frame.leftSocket[13]<-.15,'front screen-left is anatomical right');assert.ok(carry.state.primaryGripResidual<.01);
    assert.equal(na.end/30,modelTriangleCount('playerVergeCleaver'));
  }
});

test('four cuts keep exact carry endpoints, source feet, normals and source buffers through gait and reduced motion',()=>{
  const immutable=Array.from(asset.arrays.positions);
  for(let step=1;step<=4;step++)for(const speed of [0,.6,2.4,4])for(const reducedMotion of [false,true])for(const p of [0,.12,.4,.72,1]){
    const q=sampled(step,p,{speed,gaitPhase:.7,reducedMotion}),s=createHeroPoseState(asset),f=createHeroFrame(asset);sampleCloseViewHero(asset,s,{...q.input,action:null},f);
    assert.deepEqual([...q.state.pose.slice(10,20),...q.state.pose.slice(360,370)],[...s.pose.slice(10,20),...s.pose.slice(360,370)],'source root-parented feet remain on their real support');
    assert.ok(q.state.primaryGripResidual<.01);assert.ok(Array.from(q.frame.positionsNormals).every(Number.isFinite));
    for(let i=3;i<q.frame.positionsNormals.length;i+=6)assert.ok(Math.abs(Math.hypot(...q.frame.positionsNormals.slice(i,i+3))-1)<1e-4);
    if(p===0||p===1){assert.deepEqual(q.frame.positionsNormals,f.positionsNormals);assert.deepEqual(q.frame.leftSocket,f.leftSocket);assert.deepEqual(q.frame.rightSocket,f.rightSocket);}
  }
  assert.deepEqual(Array.from(asset.arrays.positions),immutable);
});

test('legacy carry is retained and unknown motion stays inert rather than replaying a new cut',()=>{
  const s=createHeroPoseState(asset),f=createHeroFrame(asset),legacy={kind:'legacy',step:2};
  sampleCloseViewHero(asset,s,{...base,primaryCarryStage:legacy},f);assert.ok(f.rightSocket[13]<0);assert.ok(f.leftSocket[13]>0);
  const combo={weaponKind:'verge-cleaver',step:2};assert.deepEqual(primaryCarryStage({primaryStep:2},combo,false),legacy);
  const opaque=primaryVisualStage({primaryMotion:{v:9,future:1}}),a=createHeroFrame(asset),b=createHeroFrame(asset);
  for(const p of [.2,.7]){sampleCloseViewHero(asset,s,{...base,primaryCarryStage:opaque,action:{kind:'melee',profile:'verge-cleaver',primaryMotion:{v:9},phase:p}},a);sampleCloseViewHero(asset,s,{...base,heldProfile:null,action:{kind:'melee',profile:'verge-cleaver',primaryMotion:{v:9},phase:p}},b);assert.deepEqual(a.positionsNormals,b.positionsNormals);}
});

test('final held owner selects the same free spell arm as its actual weapon grip',()=>{
  for(const profile of ['verge-cleaver','rift-bombard','blunderbuss','lumen-spindle','','fist','hammer'])for(const provenance of [null,stage(4),{kind:'legacy',step:1},{kind:'opaque'}]){
    const roles=cleaverHandRoles(profile,provenance),right=['rift-bombard','blunderbuss','lumen-spindle','hammer'].includes(profile);assert.equal(roles.grip,right?'leftSocket':'rightSocket');assert.equal(roles.free,right?'rightSocket':'leftSocket');
    const s=createHeroPoseState(asset),a=createHeroFrame(asset),b=createHeroFrame(asset),i={...base,primaryCarryStage:provenance,handProfile:profile,heldProfile:profile==='verge-cleaver'||['rift-bombard','blunderbuss','lumen-spindle'].includes(profile)?'verge-cleaver':null};
    sampleCloseViewHero(asset,s,{...i,action:{kind:'cast',profile:'unknown',phase:.3,durationMs:360}},a);sampleCloseViewHero(asset,s,{...i,action:{kind:'cast',profile:'fan-release',phase:.3,durationMs:360}},b);
    assert.deepEqual(a[roles.grip],b[roles.grip],`${profile} weapon hand remains fixed`);assert.notDeepEqual(a[roles.free],b[roles.free],`${profile} free cast hand really moves`);
  }
});

test('30 and 60Hz paths remain continuous through entry, travel and recovery',()=>{
  for(const hz of [30,60])for(let step=1;step<=4;step++){let last=null;for(let n=0;n<=Math.ceil(.24*hz);n++){const q=sampled(step,Math.min(1,n/hz/.24),{speed:.6,gaitPhase:.7}),t=tipOf(q.frame,gearOf(q.frame,stage(step))).point;if(last)assert.ok(Math.hypot(...t.map((x,k)=>x-last[k]))<1.5);last=t;}}
});

// Storage-aware recording GL; these are submission tests, not GPU raster evidence.
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
function productionFrame(screen:any,g:any,now:number,log:any[]){let plan:any=null;const layer=(c:any,w:number,h:number,p:any)=>{plan=p;drawRangedEffects(c,g,w,h,p);};CLOSE_VIEW_HOOKS.groundLayers.push(layer);try{render(screen,g,390,844,now);if(!closeViewShowing(g))drawRangedEffects(screen,g,390,844);}finally{CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(layer),1);}return {showing:closeViewShowing(g),plan,copies:log.filter(q=>q[0]==='drawImage').length,arcs:log.filter(q=>q[0]==='arc').length};}


test('actual accepted Cleaver -> Fire submits its release cue at the resolved free left source socket',async()=>{
  const names=['window','fetch','createImageBitmap'],old=new Map(names.map(n=>[n,globalThis[n]]));globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const b=fs.readFileSync(new URL(url));return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};
  try{assert.ok(await loadCloseViewHero());withProjectionGPU({},({screen,log})=>{
    const {game:g}=createLabFixture({lab:'combat-assets',scenario:'cleaver-echo-inspection',now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:false};for(const t of g.map.tiles){t.blocked=false;t.environment=false;t.openAir=false;t.courtyard=false;}g.save.lastAim={x:1,y:0};g.player.facing='right';g.updateDungeonDiscovery(true);
    assert.notEqual(g.primaryAttack(100000),false);assert.deepEqual(g.player.attackVisual.primaryMotion,{v:2,step:1});g.lastUpdateNow=100300;assert.equal(g.castSpell('fire-burst'),true);const record=g.player.castVisual;
    const snapshot=structuredClone({player:g.player,projectiles:g.projectiles,combo:g.player.primaryCombo});productionFrame(screen,g,100316,log);assert.equal(closeViewShowing(g),true);
    const flash=[];for(let j=GLB.nGlowStart;j<GLB.nDecal;j++){const i=j*DECAL_FLOATS;if(GLB.decal[i+5]===11&&GLB.decal[i+7]===0xff7a2a)flash.push(Array.from(GLB.decal.slice(i,i+3)));}assert.equal(flash.length,36,'five canonical heads plus one actual free-hand flash');
    const center=[0,1,2].map(k=>flash.slice(0,6).reduce((v,p)=>v+p[k],0)/6),s=createHeroPoseState(asset),f=createHeroFrame(asset),carry=primaryCarryStage(g.player.attackVisual,g.player.primaryCombo,false);
    sampleCloseViewHero(asset,s,{...base,x:g.player.x+.5,y:g.player.y+.82,nowMs:100316,handProfile:'verge-cleaver',primaryCarryStage:carry,action:{kind:'cast',profile:record.profile,phase:16/record.durationMs,durationMs:record.durationMs,yaw:0}},f);
    assert.ok(Math.hypot(...center.map((v,k)=>v-f.leftSocket[12+k]))<1e-5,'renderer cue uses the same source-left free arm the spell solver moved');assert.ok(Math.hypot(...center.map((v,k)=>v-f.rightSocket[12+k]))>.1,'never borrows the occupied left-hand Cleaver grip');assert.deepEqual({player:g.player,projectiles:g.projectiles,combo:g.player.primaryCombo},snapshot);
  });}finally{for(const n of names){if(old.get(n)===undefined)delete globalThis[n];else globalThis[n]=old.get(n);}}
});


test('newer body owners suppress old Cleaver cuts without changing their own phase',()=>{
  for(const action of [{kind:'jump',phase:.4},{kind:'hit',phase:.3},{kind:'hit',profile:'knockdown',phase:.5},{kind:'dodge',phase:.3,moveX:1,moveY:0,poseMs:1200,durationMs:260},{kind:'melee',profile:'hammer',phase:.5,durationMs:570}]){
    const s=createHeroPoseState(asset),a=createHeroFrame(asset),b=createHeroFrame(asset),i={...base,primaryCarryStage:stage(4),handProfile:action.profile==='hammer'?'':'verge-cleaver'};
    sampleCloseViewHero(asset,s,{...i,action:{...action,primaryMotion:{v:2,step:1}}},a);sampleCloseViewHero(asset,s,{...i,action:{...action,primaryMotion:{v:2,step:4}}},b);assert.deepEqual(a.positionsNormals,b.positionsNormals);assert.deepEqual(a.leftSocket,b.leftSocket);
  }
});


test('old descriptor-free Echo memory retains its exact legacy step-one ribbon',()=>{
  const q={x:2,y:2,dx:1,dy:0,range:2,shape:'arc',support:0,weaponKind:'verge-cleaver'},collect=memory=>{const out=[];const receipt=closeViewEchoRibbons({glyphVisuals:[{kind:'primaryEcho',life:100,max:200,actual:q,memory}]},null,'balanced',false,(...v)=>out.push(v));assert.equal(receipt.paths,2);return out;};
  assert.deepEqual(collect({...q}),collect({...q,primaryStep:1}));
  assert.notDeepEqual(collect({...q,primaryMotion:{v:2,step:4}}),collect({...q,primaryMotion:{v:2,step:3}}));
});
