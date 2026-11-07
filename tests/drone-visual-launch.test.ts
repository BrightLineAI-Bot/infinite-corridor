import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, jumpLift } from '../src/game.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { setMechMode } from '../src/vehicle-gates.ts';
import { interiorSurfaceHeight, interiorSurfaceLevel, LIFT_PER_LEVEL } from '../src/landscape.ts';
import { PLAYER_DRONE_VISUAL, playerDroneVisualAnchor, projectileLaunchMetadata, readProjectileVisualLaunch, projectileVisualPoint } from '../src/actor-presentation.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL, GLB, DECAL_FLOATS } from '../src/close-view-gl.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
const close=(a,b,label='')=>{for(const k of ['x','y','z'])assert.ok(Math.abs(a[k]-b[k])<1e-5,`${label}/${k}: ${a[k]} vs ${b[k]}`);};
function fixture(carry=false,quiet=true){const {game:g}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});g.presentation={effectiveQuality:'full',reduceMotion:quiet};g.save.farArray={listeners:10,gate:5};g.save.consumables.submersible=1;assert.equal(setMechMode(g.save,'drone').ok,true);assert.equal(g.toggleMech(),true);g.mechBoosting=carry;if(carry){g.jumpStart=99900;g.jumpDur=420;g.jumpUntil=100400;}g.enemies=[createCombatant('ashling',g.player.x+2,g.player.y)];g.tickDrone(.01,100000);return g;}
function anchor(g,now=100000){const p=g.player,lift=jumpLift(g,now)+(g.droneLift?Math.max(0,g.droneLift.z-interiorSurfaceLevel(g.map,p.x+.5,p.y+.75))*LIFT_PER_LEVEL:0);return playerDroneVisualAnchor(p,g.droneAt,{carrying:!!g.mechBoosting,lift,support:interiorSurfaceHeight(g.map,p.x+.5,p.y+.75),now,quiet:!!g.presentation.reduceMotion});}
const physical=q=>{const copy=structuredClone(q);delete copy.visualLaunch;return copy;};
const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}




test('actual normal and carrying producers latch the native rocket port without changing simulation fields',()=>{
  for(const carry of [false,true]){const g=fixture(carry),q=g.projectiles.find(q=>q.droneRocket),other=fixture(carry,false).projectiles.find(q=>q.droneRocket);assert.deepEqual(physical(q),physical(other),'presentation options cannot change hit XY, aim, damage, speed, life or targeting');assert.equal(q.x,g.droneAt.x+.5);assert.equal(q.y,g.droneAt.y+.45);const expected=anchor(g).muzzle;close(projectileVisualPoint(q,interiorSurfaceHeight(g.map,q.x,q.y)),expected,carry?'carry':'normal');assert.ok(readProjectileVisualLaunch(q.visualLaunch));const data=structuredClone(q.visualLaunch);g.player.x+=5;g.droneAt.y-=3;assert.deepEqual(q.visualLaunch,data,'owner movement cannot drag a flying rocket');close(projectileVisualPoint(q,interiorSurfaceHeight(g.map,q.x,q.y)),expected);}
});

test('finite launch offsets blend smoothly into the exact existing path using age only',()=>{
  const q={x:3,y:4,age:0,visualHeight:.66},support=2.5;q.visualLaunch=projectileLaunchMetadata(q,{x:3.5,y:5,z:4},support);close(projectileVisualPoint(q,support),{x:3.5,y:5,z:4});q.age=PLAYER_DRONE_VISUAL.settleSeconds/2;close(projectileVisualPoint(q,support),{x:3.25,y:4.5,z:3.58});q.age=PLAYER_DRONE_VISUAL.settleSeconds;close(projectileVisualPoint(q,support),{x:3,y:4,z:3.16});q.age=1;close(projectileVisualPoint(q,support),{x:3,y:4,z:3.16});
  for(const raw of [null,[],{v:2,dx:0,dy:0,dz:0},{v:1,dx:NaN,dy:0,dz:0},{v:1,dx:0,dy:Infinity,dz:0},{v:1,dx:0,dy:0,dz:65},{v:1,dx:'1',dy:0,dz:0}]){assert.equal(readProjectileVisualLaunch(raw),null);close(projectileVisualPoint({...q,age:0,visualLaunch:raw},support),{x:3,y:4,z:3.16});}
  const raw={v:1,dx:1,dy:2,dz:3,future:{kept:true}};assert.equal(readProjectileVisualLaunch(raw),raw);close(projectileVisualPoint({...q,age:NaN,visualLaunch:raw},support),{x:3,y:4,z:3.16});
});

test('native port, shot head and historical trail share the same absolute height on elevated lifted terrain',()=>gpu(({gl,screen})=>{
  for(const carry of [false,true]){const g=fixture(carry),p=g.player;for(const tile of g.map.tiles)tile.elev=2;g.droneLift={z:3,base:2,vz:0};g.save.mech.rocketCd=0;g.projectiles=[];g.tickDrone(.01,100000);g.enemies=[];const q=g.projectiles[0],muzzle=anchor(g).muzzle;resetCloseViewCamera();render(screen,g,390,844,100000);assert.equal(closeViewGLStats.auxKinds.corridorDrone,1);
    const data=gl.uploads.at(-1),port={x:0,y:0,z:0};let n=0;for(let i=0;i<data.length;i+=10)if(Math.abs(data[i+6]-0xe0/255)<1e-5&&Math.abs(data[i+7]-0x62/255)<1e-5&&Math.abs(data[i+8]-0x3c/255)<1e-5){port.x+=data[i];port.y+=data[i+1];port.z+=data[i+2];n++;}assert.ok(n>0);for(const k of ['x','y','z'])port[k]/=n;close(port,muzzle,'actual compiled orange launcher');
    let points=[];for(let i=0;i<GLB.nDecal;i++)if(GLB.decal[i*9+5]===11)points.push(Array.from(GLB.decal.slice(i*9,i*9+3)));assert.equal(points.length,6);close({x:points.reduce((a,b)=>a+b[0],0)/6,y:points.reduce((a,b)=>a+b[1],0)/6,z:points.reduce((a,b)=>a+b[2],0)/6},muzzle,'head at birth');
    g.presentation.reduceMotion=false;q.age=.08;q.x+=q.dx*q.speed*.08;q.y+=q.dy*q.speed*.08;const before=structuredClone(q);render(screen,g,390,844,100080);points=[];for(let i=0;i<GLB.nDecal;i++)if(GLB.decal[i*9+5]===11)points.push(Array.from(GLB.decal.slice(i*9,i*9+3)));assert.equal(points.length,12);const trailTime=.058,len=Math.min(.9,q.speed*trailTime),d=Math.hypot(q.dx,q.dy),tx=q.x-q.dx*len/d,ty=q.y-q.dy*len/d,head=projectileVisualPoint(q,interiorSurfaceHeight(g.map,q.x,q.y)),tail=projectileVisualPoint(q,interiorSurfaceHeight(g.map,tx,ty),tx,ty,q.age-trailTime);close({x:points[1][0],y:points[1][1],z:(points[1][2]+points[2][2])/2},head,'trail head');close({x:points[0][0],y:points[0][1],z:(points[0][2]+points[5][2])/2},tail,'historical tail');assert.deepEqual(q,before);
  }
}));

test('split schema-14 save, reload and pause retain the latched offset and existing projectile age',()=>{
  const g=fixture(true),q=g.projectiles[0];q.age=.04;q.visualLaunch.future={preserved:true};g.setPaused(true,100040);const expected=projectileVisualPoint(q,interiorSurfaceHeight(g.map,q.x,q.y)),{main,puts}=splitSnapshot(snapshotSave(g.exportSnapshot(900000))),verified=validateJourney(assembleSave(structuredClone(main),new Map(structuredClone(puts))));assert.equal(verified.health,'healthy');assert.equal(verified.save.version,14);const back=new Game(verified.save,1000000),loaded=back.projectiles.find(p=>p.droneRocket);assert.ok(loaded);assert.deepEqual(loaded,q);close(projectileVisualPoint(loaded,interiorSurfaceHeight(back.map,loaded.x,loaded.y)),expected);back.setPaused(false,1100000);assert.equal(loaded.age,.04);assert.deepEqual(loaded.visualLaunch,q.visualLaunch);
});
