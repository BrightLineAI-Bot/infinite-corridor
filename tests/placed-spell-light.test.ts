import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, updateEffects } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { SPELLS, APERTURE_BANDS } from '../src/items.ts';
import { nearestPlacedSpellLight, writePlacedSpellLight, CLOSE_VIEW_HOOKS, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';
import { interiorArchAt, INTERIOR_TRAVERSAL } from '../src/vehicle-gates.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { render } from '../src/renderer.ts';
import { GLF, closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
const ids=['cinder-dart','ember-ring','grave-sun','gravity-well','stillpoint'];
function arena(){const s=freshSave();s.seed='FIELDLIGHT';s.perception.aperture=APERTURE_BANDS[13].threshold;const g=new Game(s,0);g.enemies=[];g.lastUpdateNow=1000;g.map={...g.map,width:8,height:8,tiles:Array.from({length:64},()=>({kind:'ash',blocked:false})),objects:[]};Object.assign(g.player,{x:3,y:3});return g;}
const pick=(g,seen=null)=>nearestPlacedSpellLight(g.effects,g.map,g.player.x+.5,g.player.y+.45,10,seen);
const frame=()=>({lp:new Float32Array(32),lc:new Float32Array(32)});
test('actual Game five placed spells own light centers until their true expiry; selection is read-only',()=>{
 for(const id of ids){const g=arena();assert.equal(g.castSpell(id),true);const fx=g.effects.find(e=>e.kind===id),before=structuredClone(g.effects);assert.equal(pick(g),fx,id);const f=frame();assert.equal(writePlacedSpellLight(f,fx,g.map,0),true);assert.equal(f.lp[0],fx.x);assert.ok(Math.abs(f.lp[1]-fx.y)<1e-6);assert.ok(f.lp[2]>interiorSurfaceHeight(g.map,fx.x,fx.y));assert.ok(f.lc[3]>0&&f.lc[3]<=.65);assert.deepEqual(g.effects,before);
  g.effects=updateEffects(g.effects,[],SPELLS[id].lifetime+.01);assert.equal(pick(g),null,id+' expired');}
});
test('actual spell Echo waits through source delay, then lights independently; pause and JSON resume preserve lifetime',()=>{
 const g=arena();g.save.spellGlyphs['cinder-dart']=['echo',null];assert.equal(g.castSpell('cinder-dart'),true);const original=g.effects.find(e=>!e.echo),echo=g.effects.find(e=>e.echo);assert.ok(echo&&echo.delay>0);assert.equal(pick(g),original);
 g.effects=[echo];assert.equal(pick(g),null);g.effects=updateEffects(g.effects,[],echo.delay+.01);assert.equal(pick(g),echo);assert.equal(echo.life,SPELLS['cinder-dart'].lifetime);
 g.lastUpdateNow=1000;g.setPaused(true,1000);const before=structuredClone(g.effects);g.update(.1,{state:{x:0,y:0},consume:()=>false},90000);assert.deepEqual(g.effects,before);
 const saved=migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(90000)))),back=new Game(saved,200000);assert.ok(back.effects.some(e=>e.id===echo.id));const recovered=back.effects.find(e=>e.id===echo.id);assert.equal(recovered.life,echo.life);assert.equal(recovered.delay,echo.delay);
});
test('one allocation-free nearest-source scan rejects unknown, hostile, delayed, unseen, nonfloor and derivative states',()=>{
 const g=arena();g.castSpell('ember-ring');const fx=g.effects[0];
 for(const patch of [{kind:'future'},{glyphHost:'tool'},{glyphSpell:'orbit-volley'},{hostile:true},{brawler:true},{delay:.01},{delay:NaN},{life:0},{life:NaN},{pulse:0},{x:Infinity},{radius:-1}]){g.effects=[{...fx,...patch}];assert.equal(pick(g),null,JSON.stringify(patch));}
 g.effects=[fx];assert.equal(pick(g,()=>false),null);const index=Math.floor(fx.y)*8+Math.floor(fx.x),floor=g.map.tiles[index];
 for(const patch of [{blocked:true},{environment:'water'},{chasm:true},{kind:'lava'},{hole:true}]){g.map.tiles[index]={...floor,...patch};assert.equal(pick(g),null);}g.map.tiles[index]=floor;
 const far={...fx,x:6,y:6};g.effects=[far,fx];assert.equal(pick(g),fx);assert.equal(nearestPlacedSpellLight(g.effects,g.map,-100,-100,1),null);
 let reads=0;const sources=new Proxy(Array.from({length:2000},()=>fx),{get:(o,k)=>{if(typeof k==='string'&&/^\d+$/.test(k))reads++;return o[k];}});assert.equal(nearestPlacedSpellLight(sources,g.map,3.5,3.45,10),fx);assert.equal(reads,2000,'exactly one index read per existing effect, no sort/candidate array');
});
test('both physical arch orientations constrain elevated spell source below actual soffit',()=>{
 for(const orientation of ['ns','ew']){const g=arena();g.player.x=2;g.player.y=2;g.castSpell('ember-ring');const fx=g.effects[0];g.map.width=5;g.map.height=5;g.map.tiles=Array.from({length:25},()=>({kind:'floor',blocked:false}));for(const [x,y] of orientation==='ns'?[[1,2],[3,2]]:[[2,1],[2,3]])g.map.tiles[y*5+x]={kind:'wall',blocked:true};assert.equal(interiorArchAt(g.map,fx.x,fx.y),orientation);const f=frame();writePlacedSpellLight(f,fx,g.map,0);assert.ok(f.lp[2]<=interiorSurfaceHeight(g.map,fx.x,fx.y)+INTERIOR_TRAVERSAL.archClearance-.15);}
});
const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}
test('actual GL frame reserves one existing tier slot and preserves static ordering, bounded draws and recovery',()=>gpu(({screen,gl})=>{
 const {game:g}=createLabFixture({lab:'close-view',scenario:'keep',now:100000});g.enemies=[];g.save.perception.aperture=APERTURE_BANDS[13].threshold;g.lastUpdateNow=100000;g.effects=[];
 for(const [quality,cap] of [['low',3],['balanced',5],['full',8]]){
  g.presentation={effectiveQuality:quality,reduceMotion:true};resetCloseViewCamera();render(screen,g,390,844,100000);const original=Array.from(GLF.lp.slice(0,8)),baseline={calls:closeViewGLStats.drawCalls,cards:closeViewGLStats.boards,decals:closeViewGLStats.decals};
  g.save.magicSkills.cooldowns={};assert.equal(g.castSpell('ember-ring'),true);const fx=g.effects.at(-1),before=structuredClone(g.effects);render(screen,g,390,844,100000);
  assert.ok(GLF.nl<=cap);assert.equal(GLF.lp[(GLF.nl-1)*4],fx.x);assert.ok(Math.abs(GLF.lp[(GLF.nl-1)*4+1]-fx.y)<1e-6);assert.deepEqual(Array.from(GLF.lp.slice(0,8)),original);assert.ok(closeViewGLStats.drawCalls<=baseline.calls);assert.ok(closeViewGLStats.boards<=baseline.cards);assert.ok(closeViewGLStats.decals<=baseline.decals);assert.deepEqual(g.effects,before);
  g.setPaused(true,100000);const light=Array.from(GLF.lc.slice(0,GLF.nl*4));render(screen,g,390,844,190000);assert.deepEqual(Array.from(GLF.lc.slice(0,GLF.nl*4)),light);g.setPaused(false,190000);
  gl.isContextLost=()=>true;render(screen,g,390,844,190001);assert.deepEqual(g.effects,before);gl.isContextLost=()=>false;render(screen,g,390,844,190002);assert.ok(GLF.nl<=cap);assert.deepEqual(g.effects,before);g.effects=[];
 }
}));
