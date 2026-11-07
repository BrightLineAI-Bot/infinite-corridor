import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { render, nativeTraveler, drawNativeTravelerDetails, drawElder } from '../src/renderer.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { GOLEM, drawToolForms, drawOrrery, tickOrrery, orreryPress } from '../src/tool-forms.ts';
import { setMechMode, DRONE } from '../src/vehicle-gates.ts';
import { tickTravelers } from '../src/travelers.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, modelTriangleCount, writeCloseViewModel } from '../src/close-view-models.ts';
const positions=a=>Array.from(a).filter((_,i)=>i%MODEL_FLOATS<3);
function fixture(id){const {game:g}=createLabFixture({lab:'creature-assets',scenario:id,now:100000});g.enemies=[];g.presentation={effectiveQuality:'full',reduceMotion:true};return g;}
function layer(g,run){const fn=(c,w,h,shots)=>drawRangedEffects(c,g,w,h,shots);CLOSE_VIEW_HOOKS.groundLayers.push(fn);try{return run();}finally{CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(fn),1);}}
const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}



test('canonical actual summon, orb and NPC sources enter the same capped native batch',()=>gpu(({gl,screen})=>{
  for(const [id,key] of [['corridor-golem','corridorGolem'],['shadow-clone','playerShadow'],['aether-orrery','nativeOrb'],['dungeon-reciter','dungeonReciter'],['elder-wanderer','elderWanderer']]){const g=fixture(id);const npc=g.map.objects.find(o=>id==='dungeon-reciter'?o.reciter:id==='elder-wanderer'?o.elder:false);if(npc){npc.x=g.player.x+.6;npc.y=g.player.y+.6;}if(g.golem){g.golem.x=g.player.x+1;g.golem.y=g.player.y+.8;g.lastUpdateNow=g.golem.start+500;}const now=g.lastUpdateNow||100000,before=structuredClone({player:g.player,objects:g.map.objects,golem:g.golem,clone:g.shadowClone,shots:g.projectiles}),refs=[g.player,g.map,g.map.objects,g.golem,g.shadowClone,g.projectiles];resetCloseViewCamera();layer(g,()=>render(screen,g,390,844,now));assert.ok(Object.keys(closeViewGLStats.auxKinds).some(k=>k.startsWith(key)),`${id}: ${JSON.stringify(closeViewGLStats.auxKinds)}`);assert.ok(closeViewGLStats.models>=2);assert.ok(closeViewGLStats.models<=20);assert.ok(closeViewGLStats.modelTriangles<=256*closeViewGLStats.models);assert.ok(gl.uploads.at(-1).every(Number.isFinite));assert.deepEqual({player:g.player,objects:g.map.objects,golem:g.golem,clone:g.shadowClone,shots:g.projectiles},before);assert.deepEqual([g.player,g.map,g.map.objects,g.golem,g.shadowClone,g.projectiles],refs);}
}));

test('all real reciter looks keep their source palette and carried silhouette; Elders keep exact rule cells',()=>{
  const g=fixture('dungeon-reciter'),o=g.map.objects.find(o=>o.reciter),counts=[];
  for(const look of ['pilgrim','mercenary','minstrel','scholar','traveler','cartographer']){const p=nativeTraveler({...o,look},100000,true);assert.equal(p.kind,'dungeonReciter:'+look);assert.ok(modelTriangleCount(p.kind)<=256);counts.push(modelTriangleCount(p.kind));const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS);assert.ok(writeCloseViewModel(out,0,{x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,...p,pose:p.pose||'idle',pace:p.pace??0})>0);}
  assert.ok(new Set(counts).size>=4);assert.equal(nativeTraveler({...o,look:'future-custom'},0,true),null);assert.equal(nativeTraveler({...o,mount:'mossGrazer'},0,true),null);
  const elder=fixture('elder-wanderer').map.objects.find(o=>o.elder),before=structuredClone(elder),a=[],b=[];drawNativeTravelerDetails(ctx(a),elder,32,100000,true);drawNativeTravelerDetails(ctx(b),elder,32,120000,true);assert.deepEqual(a,b);assert.deepEqual(elder,before,'rule row cache is presentation-only');assert.ok(a.filter(x=>x[0]==='fillRect').length>5,'actual cellular cloth, not five substitute marks');assert.equal(a.filter(x=>x[0]==='ellipse').length,0,'no duplicate old head or legs');assert.notDeepEqual(nativeTraveler({...elder,rule:30},0,true).paletteMap,nativeTraveler({...elder,rule:90},0,true).paletteMap);
});

function captures(g,now){const out=[],shots=new Set();shots.now=now;shots.captureActor=q=>(out.push(q),true);drawRangedEffects(ctx(),g,390,844,shots);return out;}
function mesh(a){const out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),n=writeCloseViewModel(out,0,{x:0,y:0,z:0,yaw:0,phase:0,pace:0,pose:'idle',amount:0,reduceMotion:true,...a});assert.ok(n>0,a.kind);return out.slice(0,n);}

test('actual Golem rise, resolved punch and sink own its native action; clone uses actual arc and charge states',()=>{
  const g=fixture('corridor-golem'),q=g.golem;let record=captures(g,q.start+10).find(x=>x.source===q);assert.ok(record);const rise=record.sample(q.start+10,true),up=record.sample(q.start+GOLEM.rise*1000,true);assert.ok(rise.lift<up.lift);assert.equal(up.lift,0);
  g.enemies=[createCombatant('ashling',q.x+.8,q.y)];g.tickGolem(q.nextAt);assert.ok(g.effects.some(e=>e.kind==='golem-punch'));const punch=record.sample(q.punchAt+50,true);assert.equal(punch.pose,'fist');assert.notDeepEqual(positions(mesh({...up,z:up.lift})),positions(mesh({...punch,z:punch.lift})));while(!q.sinkAt)g.tickGolem(q.nextAt);assert.ok(record.sample(q.sinkAt+200,true).lift<0);assert.equal(record.sample(q.sinkAt+GOLEM.sink*1000,true).alpha,0);
  const c=fixture('shadow-clone'),clone=c.shadowClone;c.primaryAttack(100010);record=captures(c,100050).find(x=>x.source===clone);assert.ok(record);assert.equal(record.sample(100050,true).pose,'attack');assert.deepEqual(record.sample(100050,true).yaw,Math.atan2(clone.swingDir.y,clone.swingDir.x));assert.ok(record.sample(clone.until-100,true).alpha<record.sample(100050,true).alpha);
  const charging=fixture('wayfarer-iron-fists');charging.lastUpdateNow=100000;charging.castAction='spell';assert.equal(charging.castSpell('shadow-clone'),true);assert.ok(charging.shadowClone.charging);assert.ok(!captures(charging,100010).some(x=>x.source===charging.shadowClone),'unreleased floor shadow never becomes a standing body');charging.tickCloneCharge(false,100100);assert.ok(captures(charging,100110).some(x=>x.source===charging.shadowClone));
});

test('pause freezes auxiliary native geometry; source runtime cancellation survives reload',()=>gpu(({gl,screen})=>{
  for(const id of ['corridor-golem','shadow-clone','aether-orrery','elder-wanderer']){const g=fixture(id);const o=g.map.objects.find(o=>o.elder);if(o){o.x=g.player.x+.4;o.y=g.player.y+.5;}const now=g.golem?g.golem.start+150:100150;g.lastUpdateNow=now;g.setPaused(true,now);resetCloseViewCamera();layer(g,()=>{render(screen,g,390,844,now+10);const a=positions(gl.uploads.at(-1));render(screen,g,390,844,now+90000);assert.deepEqual(positions(gl.uploads.at(-1)),a,id);});const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(now+90000)))),back=new Game(saved,200000);if(g.golem)assert.ok(back.golem==null);if(g.shadowClone)assert.ok(back.shadowClone==null);if(g.orrery)assert.ok(back.orrery==null);}
}));

test('actual drone activation separates its body and gauges without changing player or rocket coordinates',()=>gpu(({gl,screen})=>{
  const g=fixture('wayfarer-iron-fists');g.save.farArray={listeners:10,gate:5};g.save.consumables.submersible=1;assert.equal(setMechMode(g.save,'drone').ok,true);assert.equal(g.toggleMech(),true);g.enemies=[createCombatant('ashling',g.player.x+2,g.player.y)];g.tickDrone(.05,100000);assert.ok(g.droneAt);assert.ok(g.projectiles.some(q=>q.droneRocket));g.enemies=[];g.droneHealFx=1;const source=g.droneAt,shots=structuredClone(g.projectiles),mech=structuredClone(g.save.mech);resetCloseViewCamera();layer(g,()=>render(screen,g,390,844,100050));assert.equal(closeViewGLStats.auxKinds.corridorDrone,1);assert.equal(closeViewGLStats.models,2);assert.equal(closeViewGLStats.modelFallbacks['player-drone'],undefined);assert.deepEqual(g.projectiles,shots);assert.deepEqual(g.save.mech,mech);assert.equal(g.droneAt,source);assert.ok(closeViewGLStats.boards>=2,'player gauges and heal ring retained');
  g.mechBoosting=true;g.tickDrone(.05,100100);g.setPaused(true,100100);layer(g,()=>{render(screen,g,390,844,100150);const a=positions(gl.uploads.at(-1));render(screen,g,390,844,200000);assert.deepEqual(positions(gl.uploads.at(-1)),a);});assert.ok(gl.uploads.at(-1).every(Number.isFinite));assert.equal(closeViewGLStats.models,2);
}));

test('colocated exact source actors and orbital bodies share low/full caps with sprite overflow',()=>gpu(({gl,screen})=>{
  const g=fixture('aether-orrery');g.save.equipment.secondary={...g.save.equipment.secondary,tier:'relic',extraSockets:1,glyphs:['echo','echo']};g.orrery.halo=null;let now=100600;for(let i=0;i<35;i++,now+=600)g.fireSecondary(now,{x:0,y:1});assert.equal(g.orrery.halo.n,3);assert.ok(g.projectiles.length>=8);
  const elder=fixture('elder-wanderer').map.objects.find(o=>o.elder),reciter=fixture('dungeon-reciter').map.objects.find(o=>o.reciter);for(const o of [elder,reciter]){o.x=g.player.x+.2;o.y=g.player.y+.2;g.map.objects.push(o);}g.enemies=Array.from({length:15},(_,i)=>g.createEnemyFromSpawn({kind:'ashling',id:'aux-cap-'+i,x:g.player.x+.4,y:g.player.y+.4}));const refs=[elder,reciter,...g.orrery.halo.pts,...g.projectiles],before=structuredClone(refs);resetCloseViewCamera();
  for(const [tier,cap] of [['low',8],['full',20]]){g.presentation.effectiveQuality=tier;layer(g,()=>render(screen,g,390,844,now));assert.equal(closeViewGLStats.models,cap,tier);assert.ok(closeViewGLStats.modelTriangles<=cap*256);assert.ok(closeViewGLStats.boards>0,'overflow has captured sprite bodies');assert.ok(closeViewGLStats.drawCalls<=12);assert.ok(gl.uploads.at(-1).every(Number.isFinite));}
  assert.deepEqual(refs,before,'no coordinate search mutates colocated identities');
}));

test('capture suppresses only source bodies and keeps Golem, clone and Orrery residual effects',()=>{
  const g=fixture('corridor-golem');g.lastUpdateNow=g.golem.start+500;const old=[],floor=[],bodies=[];drawToolForms(ctx(old),g,q=>[q.x*32,q.y*32],32,0);drawToolForms(ctx(floor),g,q=>[q.x*32,q.y*32],32,0,{now:g.lastUpdateNow,captureActor:q=>(bodies.push(q),true)});assert.ok(old.some(x=>x[0]==='arcTo'));assert.ok(!floor.some(x=>x[0]==='arcTo'),'no duplicate flat Golem body');assert.ok(floor.some(x=>x[0]==='ellipse'),'source contact shadow remains');const fallback=[];bodies[0].draw(ctx(fallback),32);assert.ok(fallback.some(x=>x[0]==='arcTo'),'cap fallback retains original body');
  const c=fixture('shadow-clone');c.shadowClone.blockedUntil=100500;c.cloneAim=true;c.primaryAttack(100010);const records=[],log=[];const shots=new Set();shots.now=100050;shots.captureActor=q=>(records.push(q),true);drawRangedEffects(ctx(log),c,390,844,shots);assert.ok(!log.some(x=>x[0]==='quadraticCurveTo'),'no duplicate old cloak');assert.ok(log.some(x=>x[0]==='arc'),'actual aim/swing circles retained');const label=[];records.find(q=>q.source===c.shadowClone).decorate(ctx(label),32);assert.ok(label.some(x=>x[0]==='fillText'&&x[1]==='BLOCKED'));
  const o=fixture('aether-orrery'),raw=[],captured=[],native=[];drawOrrery(ctx(raw),o,q=>[q.x*32,q.y*32],32,0);drawOrrery(ctx(captured),o,q=>[q.x*32,q.y*32],32,0,{now:100000,captureActor:q=>(native.push(q),true)});assert.ok(native.length>=2);assert.equal(raw.filter(x=>x[0]==='arc').length-captured.filter(x=>x[0]==='arc').length,native.length*2,'only solid orb and core circles removed; halos stay');assert.ok(native.every(q=>q.source===o.orrery.halo.pts[0]||o.projectiles.includes(q.source)));
  const elder=fixture('elder-wanderer').map.objects.find(o=>o.elder),normal=[],detail=[];drawElder(ctx(normal),elder,32,100000);drawNativeTravelerDetails(ctx(detail),elder,32,100000,false);assert.equal(normal.filter(x=>x[0]==='fillRect').length,detail.filter(x=>x[0]==='fillRect').length,'exact source rule cells and halo retained');
});

test('colocated speakers keep independent native identities and actual listening state',()=>gpu(({screen})=>{
  const g=fixture('dungeon-reciter'),r=g.map.objects.find(o=>o.reciter),e=fixture('elder-wanderer').map.objects.find(o=>o.elder);g.map.objects.push(e);r.x=e.x=g.player.x+.4;r.y=e.y=g.player.y+.4;tickTravelers(g.map,g.player,.05);assert.equal(r.state,'listening');const before=structuredClone([r,e]);resetCloseViewCamera();layer(g,()=>render(screen,g,390,844,100100));assert.equal(closeViewGLStats.auxKinds['dungeonReciter:'+r.look],1);assert.equal(closeViewGLStats.auxKinds.elderWanderer,1);assert.equal(closeViewGLStats.models,3);assert.deepEqual([r,e],before);
}));
