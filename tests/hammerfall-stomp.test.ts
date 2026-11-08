import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createLabFixture, scenariosForLab } from '../src/proving-ground-labs.ts';
import { closeViewPlayerAction, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero, loadCloseViewHero } from '../src/close-view-hero.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { render as baseRender } from '../src/renderer.ts';

const meta=JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json',import.meta.url),'utf8'));
const bin=fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin',import.meta.url));
const asset=decodeCloseViewHero(meta,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
const base={nowMs:1801,reducedMotion:false,x:0,y:0,groundZ:0,liftZ:0,yaw:0,height:1.3776,speed:0,gaitPhase:0};
const clone=x=>JSON.parse(JSON.stringify(x));
const calm={state:{x:0,y:0},consume:()=>false,held:()=>false};
const tool={...BRAWLER_GEAR.find(q=>q.item.name==='Hammerfall').item};
const primary=kind=>({id:kind,name:kind==='cinder-pike'?'Cinder Pike':'Verge Cleaver',slot:'primary',power:5,property:kind==='cinder-pike'?'reach':'impact'});
function fixture(kind='cinder-pike') {
  const {game:g}=createLabFixture({lab:'combat-assets',scenario:'blade-spark-ashling',now:100000});
  g.enemies=[];g.save.equipment.primary=primary(kind);g.save.equipment.secondary={...tool};
  g.presentation={effectiveQuality:'full',reduceMotion:false};return g;
}
function sample(phase,extra={}) {
  const s=createHeroPoseState(asset),f=createHeroFrame(asset),input={...base,...extra};
  input.action=phase==null?null:{kind:'melee',profile:'hammer',phase,durationMs:570,yaw:input.yaw};
  assert.ok(sampleCloseViewHero(asset,s,input,f));return {s,f};
}
function delta(a,b,stride=6) {let max=0;assert.equal(a.length,b.length);for(let i=0;i<a.length;i+=stride)max=Math.max(max,Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]));return max;}
const feet=[1,36].map(node=>{
  const out=[];
  for(const mesh of meta.meshes){if(mesh.skin<0)continue;const skin=asset.skins[mesh.skin];
    for(let v=mesh.firstVertex;v<mesh.firstVertex+mesh.vertexCount;v++){let w=0;for(let k=0;k<4;k++)if(skin.joints[asset.arrays.joints[v*4+k]]===node)w+=asset.arrays.weights[v*4+k];if(w>.5)out.push(v);}
  }return out;
});
const soles=f=>feet.map(vs=>Math.min(...vs.map(v=>f.positionsNormals[v*6+2])));
const point=(s,n)=>Array.from(s.global.slice(n*16+12,n*16+15));
function angle(s,a,e,w){const A=point(s,a),E=point(s,e),W=point(s,w),u=A.map((v,i)=>v-E[i]),v=W.map((q,i)=>q-E[i]);return Math.acos(u.reduce((n,q,i)=>n+q*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)))*180/Math.PI;}

test('Hammerfall entire deformed body approaches ordinary carry continuously at nonzero idle and gait phases',()=>{
  for(const heldProfile of ['', 'cinder-pike','verge-cleaver'])for(const speed of [0,.6,1.2,3.2])for(const gaitPhase of [0,1.3,2.1,4.9]){
    const extra={heldProfile,speed,gaitPhase},idle=sample(null,extra).f,p0=sample(0,extra).f,p1=sample(1,extra).f;
    assert.equal(delta(idle.positionsNormals,p0.positionsNormals),0,'p0 retains actual carry and breathing');
    assert.equal(delta(idle.positionsNormals,p1.positionsNormals),0,'p1 retains actual carry and breathing');
    assert.ok(delta(p0.positionsNormals,sample(1e-6,extra).f.positionsNormals)<2e-6,'whole-body entry epsilon');
    assert.ok(delta(p1.positionsNormals,sample(1-1e-6,extra).f.positionsNormals)<2e-6,'whole-body recovery epsilon');
    for(const ms of [160,240,400])assert.ok(delta(sample((ms-.001)/570,extra).f.positionsNormals,sample((ms+.001)/570,extra).f.positionsNormals)<.0001,'continuous internal layer boundary '+ms);
    assert.ok(delta(sample((320-.001)/570,extra).f.positionsNormals,sample(320/570,extra).f.positionsNormals)<.02,'only the final small sole clearance lands on the actual pulse');
  }
});

test('Hammerfall 30/60fps deformed soles stay grounded through partial walking and running, with clearance before the pulse',()=>{
  for(const hz of [30,60])for(const speed of [0,.6,1.2,3.2])for(const gaitPhase of [0,1.3,2.1,4.9]){
    // Source walking itself can penetrate slightly; the stomp may not introduce a deeper sole.
    for(let frame=0;frame<=Math.ceil(.570*hz);frame++){
      const ms=Math.min(570,frame*1000/hz),extra={speed,gaitPhase:gaitPhase+ms/1000*speed*5.4,nowMs:1801+ms};
      const ordinary=soles(sample(null,extra).f),actual=soles(sample(ms/570,extra).f);
      for(let side=0;side<2;side++)assert.ok(actual[side]>=Math.min(-.005,ordinary[side]-.005),`sole ${side}, ${hz}fps, speed ${speed}, gait ${gaitPhase}, ${ms}ms: ${actual[side]}`);
      if(ms>=320&&ms<=400)for(const z of actual)assert.ok(z>=-.003&&z<.008,`planted deformed sole ${z}`);
    }
    const extra={speed,gaitPhase},raised=soles(sample(160/570,extra).f),prep=soles(sample((320-.001)/570,extra).f);
    assert.ok(raised[1]>.20&&Math.abs(raised[0])<.008,'one leg raised, other sole supports');
    assert.ok(prep[1]>.008&&prep[1]<.02,'pending pulse is not already a planted foot');
  }
});

test('Hammerfall crosses closed hands at the chest then lowers them beside the body with bent elbows',()=>{
  const raised=sample(160/570),plant=sample(400/570),g=raised.s.global,center=(g[12*16+12]+g[22*16+12])/2;
  assert.ok(g[6*16+12]<center&&g[16*16+12]>center,'left and right grips cross the centerline');
  assert.ok(Math.abs(g[6*16+13]-g[16*16+13])<.08,'hands meet at chest height');
  assert.ok(Math.hypot(...point(raised.s,6).map((v,i)=>v-point(raised.s,16)[i]))<.22,'crossed fists remain together');
  for(const [shoulder,elbow,wrist] of [[12,11,7],[22,21,18]]){
    assert.ok(angle(plant.s,shoulder,elbow,wrist)>=75&&angle(plant.s,shoulder,elbow,wrist)<=130);
    assert.ok(point(plant.s,wrist)[1]>point(plant.s,30)[1],'hands remain above hips, never at the floor');
  }
  for(const node of [6,5,8,17,14,19]){const o=node*10+3;let dot=0;for(let k=0;k<4;k++)dot+=raised.s.pose[o+k]*raised.s.fistSource[o+k];assert.ok(Math.abs(Math.abs(dot)-1)<1e-6,'each finger uses its own closed Punch rotation');}
  for(const reducedMotion of [false,true]){const ready=sample(0,{reducedMotion}).f,crossed=sample(160/570,{reducedMotion}).f,planted=sample(400/570,{reducedMotion}).f;assert.ok(delta(ready.positionsNormals,crossed.positionsNormals)>.1);assert.ok(delta(crossed.positionsNormals,planted.positionsNormals)>.1,'reduced motion retains the stomp gesture');for(let i=3;i<planted.positionsNormals.length;i+=6)assert.ok(Math.abs(Math.hypot(planted.positionsNormals[i],planted.positionsNormals[i+1],planted.positionsNormals[i+2])-1)<1e-5);}
  assert.equal(asset.indexCount/3,3170);
});

function native(phase,pace=0,gait=0){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);const end=writeCloseViewModel(out,0,{kind:'playerHammerStomp',x:0,y:0,z:0,yaw:0,phase:gait,pace,pose:'attack',amount:phase,scale:1,alpha:1,turn:0,reduceMotion:false});return out.slice(0,end);}
test('native Hammerfall renders connected shared segment endpoints, level soles and bounded 254-triangle geometry',()=>{
  assert.equal(modelTriangleCount('playerHammerStomp'),254);
  for(const p of [0,.1,160/570,(320-.001)/570,320/570,400/570,.9,1]){
    const v=native(p,1,2.1);assert.equal(v.length,254*3*MODEL_FLOATS);assert.ok(v.every(Number.isFinite));
    // The last ten boxes are the actual rendered upper/lower limbs and fists, 36 vertices each.
    const start=v.length-10*36*MODEL_FLOATS;
    const endpoints=(part)=>{const o=start+part*36*MODEL_FLOATS,vertices=[];for(let i=o;i<o+36*MODEL_FLOATS;i+=MODEL_FLOATS)vertices.push(Array.from(v.slice(i,i+3)));
      // Unit-box +/- Z faces are the last twelve vertices; their centers are the bone ends.
      return [[24,25,26,30,31,32],[27,28,29,33,34,35]].map(indices=>[0,1,2].map(axis=>indices.reduce((n,k)=>n+vertices[k][axis],0)/6));};
    for(const side of [0,1])for(const pair of [[side*5,side*5+1],[side*5+2,side*5+3]]){
      const a=endpoints(pair[0]),b=endpoints(pair[1]);let nearest=Infinity;for(const x of a)for(const y of b)nearest=Math.min(nearest,Math.hypot(...x.map((q,i)=>q-y[i])));
      assert.ok(nearest<1e-6,'rendered segment ends share one knee/elbow, residual '+nearest);
    }
    // The two retained foot boxes precede the ten segments/fists, separated by the other eye.
    for(const [side,tri] of [[0,108],[1,122]]){const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(let i=tri*3*MODEL_FLOATS;i<(tri+12)*3*MODEL_FLOATS;i+=MODEL_FLOATS)for(let k=0;k<3;k++){low[k]=Math.min(low[k],v[i+k]);high[k]=Math.max(high[k],v[i+k]);}assert.ok(endpoints(side*5+1).some(q=>q.every((n,k)=>n>=low[k]-1e-6&&n<=high[k]+1e-6)),'rendered shin ends inside its actual foot');}
    for(let i=0;i<v.length;i+=MODEL_FLOATS){assert.ok(v[i+2]>=-.001,'native soles do not pierce the floor');assert.ok(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5);}
  }
  assert.ok(delta(native(0),native(1e-6),MODEL_FLOATS)<2e-6);
  assert.ok(delta(native(1),native(1-1e-6),MODEL_FLOATS)<2e-6);
});

const context=()=>new Proxy({canvas:null,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
class GL { uploads=[];constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}isContextLost(){return false;}createShader(){return{};}createProgram(){return{};}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}getError(){return this.NO_ERROR;}getUniformLocation(){return{};}getAttribLocation(){return 0;}bufferData(t,a,usage){if(usage===this.DYNAMIC_DRAW&&a instanceof Float32Array)this.modelData=Float32Array.from(a);}bufferSubData(t,o,a){this.uploads.push(Float32Array.from(a));}}

test('actual masked renderer retains carry at Hammerfall acceptance and exact logical idle through pause and JSON reload',async()=>{
  const names=['window','fetch','createImageBitmap','WebGL2RenderingContext'],old=new Map(names.map(k=>[k,globalThis[k]]));
  const gl=new GL(),screen=context(),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:context()};screen.canvas=canvas;
  globalThis.WebGL2RenderingContext=GL;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();
  function draw(g,now){const canonical=g.player.attackUntil;try{g.player.attackUntil=0;baseRender(screen,g,390,844,now);}finally{g.player.attackUntil=canonical;}assert.equal(g.player.attackUntil,canonical);return gl.uploads.at(-1);}
  try{
    globalThis.window={};globalThis.createImageBitmap=async()=>({width:1024,height:1024});globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.protocol,'file:');const b=fs.readFileSync(u);return{ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),blob:async()=>new Blob([b])};};await loadCloseViewHero();
    for(const kind of ['cinder-pike','verge-cleaver'])for(const hz of [30,60])for(const movement of [0,.2]){
      const g=fixture(kind);resetCloseViewCamera();let now=100123;draw(g,now);
      for(let frame=0;frame<10;frame++){now+=1000/hz;g.update(1/hz,{...calm,state:{x:movement,y:0}},now);draw(g,now);}
      const ready=draw(g,now);g.update(0,{...calm,state:{x:movement,y:0},consume:k=>k==='tool'},now);assert.equal(g.player.attackVisual.profile,'hammer');
      assert.equal(delta(ready,draw(g,now)),0,`${kind}/${hz}/${movement} actual p0 carry`);
      assert.equal(closeViewGLStats.heroTriangles,3170);assert.equal(closeViewGLStats.modelTriangles,3170,'no held hammer or retained weapon gear');
      const fx=g.effects.find(e=>e.id===g.player.attackVisual.hammerEffectId);assert.ok(fx);
      let pulsed=false;
      for(let frame=1;frame<=Math.ceil(.8*hz);frame++){now+=1000/hz;g.update(1/hz,{...calm,state:{x:movement,y:0}},now);const a=closeViewPlayerAction(g,now);draw(g,now);if(fx.pulseIndex){pulsed=true;assert.ok(a.amount>=320/570||!a.active);break;}}
      assert.ok(pulsed,'existing original pulse executes');
    }
    for(const kind of ['cinder-pike','verge-cleaver'])for(const at of [0,90,400,569]){
      const g=fixture(kind);resetCloseViewCamera();const start=100123;draw(g,start);assert.equal(g.fireSecondary(start,{x:1,y:0}),true);
      const fx=g.effects.find(e=>e.id===g.player.attackVisual.hammerEffectId);
      // Effect-relative progress, including a lagged canonical deadline, is the source of truth.
      if(at<320)fx.delay=(320-at)/1000;else{fx.delay=0;fx.pulseIndex=1;fx.life=(570-at)/1000;}
      const now=start+at+2000;g.setPaused(true,now);const paused=draw(g,now+9000),save=migrateSave(clone(g.exportSnapshot(now+9000)));
      assert.equal(save.session.playerRuntime.heroPresentationTime,now);assert.equal(save.session.playerRuntime.actionVisualMotion,570-at);
      save.session.playerRuntime.futureIdleKey={kept:true};const back=new Game(save,1000);back.enemies=[];back.presentation=g.presentation;resetCloseViewCamera();
      assert.ok(back.presentationPausedMs<0,'earlier constructor clock may use a negative offset');
      assert.equal(delta(paused,draw(back,1000)),0,`${kind} exact paused body at ${at}ms`);
      back.setPaused(false,5000);assert.equal(delta(paused,draw(back,5000)),0,'unpause holds the same logical instant');
      assert.deepEqual(back.exportSnapshot(5000).session.playerRuntime.futureIdleKey,{kept:true});
      const resumedFx=back.effects.find(e=>e.id===back.player.attackVisual.hammerEffectId);resumedFx.delay=0;resumedFx.pulseIndex=1;resumedFx.life=0;
      const ended=draw(back,5001);assert.equal(closeViewPlayerAction(back,5001).active,false);back.player.attackVisual=null;assert.equal(delta(ended,draw(back,5001)),0,'effect expiry returns to the same live carry base');
    }
    for(const kind of ['cinder-pike','verge-cleaver']){
      const g=fixture(kind);g.save.activeWeaponSlot='secondary';resetCloseViewCamera();const now=101801,ready=draw(g,now);
      assert.equal(g.fireSecondary(now,{x:1,y:0}),true);assert.equal(delta(ready,draw(g,now)),0,'secondary-selected entry also preserves its ordinary base');
    }
    for(const kind of ['cinder-pike','verge-cleaver','fist']){
      const g=fixture(kind);if(kind==='fist')g.save.equipment.primary={...BRAWLER_GEAR[0].item};resetCloseViewCamera();const now=101801;draw(g,now);
      if(kind==='fist')assert.equal(g.fistPunch(1,0,now,{x:1,y:0}),true);else g.primaryAttack(now);
      g.setPaused(true,now+239.999);const paused=draw(g,now+5000),back=new Game(migrateSave(clone(g.exportSnapshot(now+5000))),2000);back.enemies=[];back.presentation=g.presentation;resetCloseViewCamera();
      assert.equal(delta(paused,draw(back,2000)),0,kind+' near-end nonzero-idle pose survives JSON');back.setPaused(false,3000);
      const ended=draw(back,3000.01);assert.equal(closeViewPlayerAction(back,3000.01).active,false);back.player.attackVisual=null;
      assert.equal(delta(ended,draw(back,3000.01)),0,kind+' published endpoint returns to its restored logical idle');
    }
  }finally{setCloseViewCanvasFactory(null);resetCloseViewGL();resetCloseViewCamera();for(const k of names){if(old.get(k)===undefined)delete globalThis[k];else globalThis[k]=old.get(k);}}
});

test('logical idle save metadata is additive, finite and independent of accepted mechanical clocks',()=>{
  for(const bad of [null,'100',{},[],true,-1,NaN,Infinity,1e12+1]){const s=freshSave();s.session.playerRuntime.heroPresentationTime=bad;s.session.playerRuntime.future={kept:7};const normalized=migrateSave(s);assert.equal(Object.hasOwn(normalized.session.playerRuntime,'heroPresentationTime'),false);const g=new Game(normalized,1234);assert.equal(g.presentationPausedMs,undefined);assert.deepEqual(normalized.session.playerRuntime.future,{kept:7});assert.equal(closeViewPlayerAction(g,1234).active,false);}
  const legacy=migrateSave(freshSave());assert.equal(Object.hasOwn(legacy.session.playerRuntime,'heroPresentationTime'),false);
  for(const logical of [0,1801,1e12]){const s=freshSave();s.session.playerRuntime.heroPresentationTime=logical;const g=new Game(migrateSave(s),100);assert.equal(g.presentationPausedMs,100-logical);assert.equal(g.exportSnapshot(100).session.playerRuntime.heroPresentationTime,logical);}
});

test('actual Hammerfall damage remains remote and effect-timed at 30/60/uneven frames; refusal, Echo and cleanup cannot replay the body',()=>{
  for(const direct of [false,true])for(const steps of [Array(45).fill(1/60),Array(24).fill(1/30),[.011,.047,.019,.083,.007,.061,.029,.052,.013,.041,.033,.024,.057,.016,.044,.071,.018,.039,.055,.022]]){
    const spec=scenariosForLab('combat-assets').find(s=>s.tool==='Hammerfall');
    const {game:g}=createLabFixture({lab:'combat-assets',scenario:spec.id,seed:'HAMMERFALL-QA',now:1000});
    const foe=g.enemies[0];foe.x=g.player.x+1;foe.y=g.player.y;foe.hp=foe.maxHp=10000;g.save.lastAim={x:1,y:0};
    g.save.equipment.secondary={...g.save.equipment.secondary,glyphs:['echo',null]};
    let now=1000,used=direct,pulse=false,record=null,origin=null;
    if(direct){assert.equal(g.fireSecondary(now,{x:1,y:0}),true);assert.equal(g.player.attackUntil,1240);}
    for(const dt of steps){now+=dt*1000;g.update(dt,{...calm,consume:k=>k==='tool'&&!used?(used=true):false},now);
      const fx=g.effects.find(e=>e.id===g.player.attackVisual?.hammerEffectId);assert.ok(fx);
      if(!record){record=clone(g.player.attackVisual);origin={x:fx.x,y:fx.y,radius:fx.radius};assert.ok(Math.hypot(fx.x-g.player.x,fx.y-g.player.y)>.5,'damage stays at resolved remote target');const deadline=g.player.actionVisualUntil;assert.equal(g.fireSecondary(now,{x:0,y:1}),false);assert.deepEqual(g.player.attackVisual,record);assert.equal(g.player.actionVisualUntil,deadline);}
      assert.deepEqual({x:fx.x,y:fx.y,radius:fx.radius},origin);assert.deepEqual(g.player.attackVisual,record);
      const action=closeViewPlayerAction(g,now);
      if(!fx.pulseIndex){assert.equal(foe.hp,10000);assert.ok(action.amount<320/570);}
      else{pulse=true;assert.equal(10000-foe.hp,98,'same single original pulse damage');assert.ok(action.amount>=320/570);for(const z of soles(sample(action.amount,{speed:1.2,gaitPhase:2.1}).f))assert.ok(Math.abs(z)<.008,'actual damage frame is planted');break;}
    }
    assert.ok(pulse);const echoes=g.effects.filter(e=>e.echo);assert.ok(echoes.length>0);g.effects=echoes;assert.equal(closeViewPlayerAction(g,now).active,false,'surviving Echo does not own or replay the body');
    const save=migrateSave(clone(g.exportSnapshot(now)));assert.equal(save.session.playerRuntime.actionVisualMotion,0);const back=new Game(save,200000);assert.equal(closeViewPlayerAction(back,200000).active,false);
    g.player.hp=0;g.update(0,calm,now+1);assert.equal(g.player.attackVisual,null);assert.equal(g.player.actionVisualUntil,0);
  }
});
