import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { updateEnemyAI } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { foundryCandidate, foundryEncounter, validateFoundryCandidate, admittedFoundrySpawn, generatedHuntSpawn } from '../src/foundry.ts';
import { FOUNDRY_MODEL_KEYS, FOUNDRY_MODEL_METADATA, FOUNDRY_BASE_BODIES, FOUNDRY_ATTACKS, FOUNDRY_MOVEMENTS } from '../src/close-view-foundry-presentation.ts';
import { actorPresentation, actorModelKey, nativeCreatureCoverage, projectileVisualHeight } from '../src/actor-presentation.ts';
import { modelTriangleCount, modelSupportsAttachments, MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';
import { CLOSE_VIEW_FOUNDRY_VARIANTS } from '../src/close-view-foundry-models.ts';
import { buildEnemyProjectilePattern } from '../src/enemy-patterns.ts';
import { nativeWindupDuration, nativeActionShape, render, drawNativeCreatureDecorations } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, closeViewMonsterAction, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const bodies=Object.keys(FOUNDRY_MODEL_KEYS), roles=['hostile','boss','passive'];
const capture=e=>({enemy:e,nativeFloor(){},nativeDecorations(){}});
function candidate(body,role='hostile',attack='straightBolt',movement='stalking',palette=2){return {...foundryCandidate('native-foundry',11,7),id:`native-${body}-${role}-${attack}`,body,role,baseKind:role==='boss'?'archiveBehemoth':role==='passive'?'riftGrazer':'latticeHunter',attack:role==='passive'?'none':attack,movement,palette};}
function make(game,c){assert.equal(validateFoundryCandidate(c).ok,true);return game.createEnemyFromSpawn(generatedHuntSpawn({id:'native-hunt',foundry:c},{x:5,y:5}),'overworld');}
const sample=e=>closeViewMonsterAction(e,e.kind,nativeWindupDuration(e),1000,nativeActionShape(e));
const floor={width:20,tiles:Array.from({length:400},(_,i)=>({x:i%20,y:Math.floor(i/20),blocked:false})),objects:[]};
function vertices(e,act={}){const p=actorPresentation(e),out=new Float32Array(MODEL_MAX_VERTICES*MODEL_FLOATS),end=writeCloseViewModel(out,0,{kind:actorModelKey(e),x:0,y:0,z:p.bodyLift,yaw:0,phase:0,pace:0,pose:'semantic',amount:0,scale:p.scale,palette:p.palette,alpha:p.alpha,reduceMotion:true,...act});return out.slice(0,end);}

test('actual Foundry spawn routes cover six morphologies, all roles, palette indices and 3/6 appendage counts',()=>{
 const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});
 for(const body of bodies)for(const role of roles)for(let palette=0;palette<5;palette++){
  const c=candidate(body,role,'straightBolt','stalking',palette),e=make(game,c),p=actorPresentation(e),key=actorModelKey(e);
  assert.equal(p.body,body);assert.equal(p.candidate,true);assert.equal(p.palette,palette);assert.equal(nativeCreatureCoverage(e,capture(e),{mesh:true,attachments:modelSupportsAttachments(key,3)}),null);
  assert.ok(modelTriangleCount(key)+24<=256,key);assert.equal(projectileVisualHeight(e),(p.bodyLift/p.scale+FOUNDRY_MODEL_METADATA[body].actionZ)*p.scale);
  const data=vertices(e);assert.ok(data.length);assert.ok(data.every(Number.isFinite));
  if(['tentacled','biomechanical'].includes(body)){assert.ok(key.endsWith(role==='boss'?'-6':'-3'));const parts=CLOSE_VIEW_FOUNDRY_VARIANTS[key];assert.equal(parts.filter(p=>body==='tentacled'?p.swing>=52:p.swing>=75).length,e.tentacles);}
 }
 const c=candidate('tentacled','boss');game.save.viewport.bestiary={[c.id]:{candidate:c,mode:'dungeon'}};let spawn;for(let i=0;!spawn&&i<4096;i++)spawn=admittedFoundrySpawn(game.save,'native-'+i,'dungeon',{x:5,y:5});assert.ok(spawn);const admitted=game.createEnemyFromSpawn(spawn);assert.equal(nativeCreatureCoverage(admitted,capture(admitted)),null);
 let encounter;for(let i=0;!encounter&&i<4096;i++)encounter=foundryEncounter('native-encounter',i+6,7);assert.ok(encounter);const roaming=game.createEnemyFromSpawn(encounter);assert.equal(nativeCreatureCoverage(roaming,capture(roaming)),null);
 for(const kind of Object.keys(FOUNDRY_BASE_BODIES)){const e=game.createEnemyFromSpawn({kind,id:'base-'+kind,x:5,y:5});assert.equal(actorPresentation(e).candidate,false);assert.equal(nativeCreatureCoverage(e,capture(e)),null);}
});

test('real ordinary controllers drive Foundry melee, close-range tentacle stab and projectile fans',()=>{
 const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});
 for(const body of bodies)for(const attack of FOUNDRY_ATTACKS.filter(x=>x!=='none')){
  const e=make(game,candidate(body,'hostile',attack)),player={x:attack==='meleeSwipe'?6:9,y:5};e.aggro=true;e.cooldown=0;let now=1000,shots=[],started=false,finished=false;
  for(let i=0;i<150;i++){
   now+=20;updateEnemyAI(e,player,floor,20,.02,now,null,(owner,aim)=>{shots.push(...buildEnemyProjectilePattern(owner,aim,now));});
   const before=structuredClone(e),a=sample(e);assert.deepEqual(e,before,'presentation never advances producer state');
   if(e.telegraph>0){started=true;assert.equal(a.semantic.phase,'windup');assert.equal(a.semantic.family,attack==='meleeSwipe'?(nativeActionShape(e)==='stab'?'stab':nativeActionShape(e)==='slam'?'slam':'sweep'):'ranged');}
   if(e.strike>0){finished=true;assert.equal(a.semantic.phase,'recover');assert.equal(a.semantic.progress,0);assert.deepEqual(a.aim,e.strikeGeometry||e.attackAim);break;}
  }
  assert.ok(started&&finished,`${body}/${attack}`);
  const expected={meleeSwipe:0,straightBolt:1,threeShotCone:3,arcBurst:2,sweepingBeam:5}[attack];assert.equal(shots.length,expected,`${body}/${attack} shot count`);
  for(const shot of shots){assert.equal(shot.visualOwnerId,e.id);assert.equal(shot.visualHeight,projectileVisualHeight(e));assert.equal(shot.x,e.x+.5);assert.equal(shot.y,e.y+.42);assert.equal(shot.path,attack==='arcBurst'?'arc':'straight');}
  if(attack==='sweepingBeam')assert.ok(shots.every(s=>!s.beam),'the source is a fan, not a held beam');
  const wind=vertices(e,{actionFamily:attack==='meleeSwipe'?'sweep':'ranged',actionPhase:'windup',actionProgress:.85}),contact=vertices(e,{actionFamily:attack==='meleeSwipe'?'sweep':'ranged',actionPhase:'recover',actionProgress:0});assert.notDeepEqual(wind,contact,body);
 }
 for(const body of ['tentacled','biomechanical']){const e=make(game,candidate(body)),player={x:7,y:5};updateEnemyAI(e,player,floor,20,.02,1000);assert.equal(e.meleePhase.id,'longReach');assert.equal(sample(e).semantic.family,'stab');}
 for(const body of bodies){const e=make(game,candidate(body,'boss','meleeSwipe'));e.meleePatternIndex=1;updateEnemyAI(e,{x:6,y:5},floor,20,.02,1000);assert.equal(e.meleePhase.id,'slam');assert.equal(sample(e).semantic.family,'slam');e.telegraph=.01;updateEnemyAI(e,{x:6,y:5},floor,20,.02,1020);assert.equal(e.strikeGeometry.kind,'slam');assert.equal(sample(e).semantic.family,'slam');}
});

test('movement follows actual displacement and refusal leaves unknown custom bodies on the authored path',()=>{
 const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});
 for(const movement of FOUNDRY_MOVEMENTS){const e=make(game,candidate('quadruped','hostile','straightBolt',movement)),before={x:e.x,y:e.y};updateEnemyAI(e,{x:15,y:5},floor,20,.1,1000);assert.ok(Math.hypot(e.x-before.x,e.y-before.y)>0);assert.equal(e.hopLift,undefined,'movement name does not invent an airborne damage state');assert.equal(actorPresentation(e).bodyLift,0);}
 const e=make(game,candidate('quadruped'));e.foundryBody='future-shape';assert.equal(nativeCreatureCoverage(e,capture(e)),'body');e.foundryBody='quadruped';e.foundryAttack='future-attack';assert.equal(nativeCreatureCoverage(e,capture(e)),'foundry-action');e.foundryAttack='straightBolt';e.foundryMovement='future-move';assert.equal(nativeCreatureCoverage(e,capture(e)),'foundry-movement');
 e.foundryMovement='stalking';assert.equal(nativeCreatureCoverage(e,capture({...e})),'capture');e.hidden=true;assert.equal(nativeCreatureCoverage(e,capture(e)),'visibility');
});

const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}


test('Foundry native submission preserves world references, palette, phase alpha, decorations and existing pass caps',()=>gpu(({gl,screen})=>{
 const {game}=createLabFixture({lab:'creature-assets',scenario:'foundry-floating',now:100000});game.presentation={effectiveQuality:'full',reduceMotion:true};resetCloseViewCamera();let now=100000,calls=0;
 for(const body of bodies)for(const role of roles){const e=make(game,candidate(body,role));Object.assign(e,{x:game.player.x+.6,y:game.player.y+.6,fracRank:'rare',packName:'Witness',fracShaman:true,warded:true,affixes:['droneSwarm'],poiseBreak:.3});game.enemies=[e];const before=structuredClone(e);
  for(let i=0;i<3;i++)render(screen,game,390,844,now+=16);assert.equal(closeViewGLStats.models,2,body+'/'+role);assert.deepEqual({...closeViewGLStats.modelFallbacks},{});assert.deepEqual(e,before,'capture restores exact simulation world references');assert.ok(closeViewGLStats.modelTriangles<=512);assert.ok(closeViewGLStats.boards>=1);assert.ok(gl.uploads.at(-1).every(Number.isFinite));if(!calls)calls=closeViewGLStats.drawCalls;else assert.ok(closeViewGLStats.drawCalls<=calls);
 }
 const e=game.enemies[0];e.phasing=true;game.paused=true;game.pauseStarted=now;render(screen,game,390,844,now+100);const a=gl.uploads.at(-1);render(screen,game,390,844,now+500);assert.deepEqual([...gl.uploads.at(-1)].filter((_,i)=>i%MODEL_FLOATS!==9),[...a].filter((_,i)=>i%MODEL_FLOATS!==9),'paused geometry and drone positions freeze; camera visibility fade may settle');assert.equal(actorPresentation(e).alpha,.45);assert.ok([...a].some((v,i)=>i%MODEL_FLOATS===9&&v>0&&v<=.45));
 e.hidden=true;render(screen,game,390,844,now+600);assert.ok(closeViewGLStats.modelFallbacks.visibility>0);
 game.paused=false;
 for(const [quality,cap] of [['low',8],['balanced',14],['full',20]]){game.presentation.effectiveQuality=quality;game.enemies=Array.from({length:25},(_,i)=>Object.assign(make(game,candidate(bodies[i%6],i%2?'hostile':'boss')),{id:'cap-'+i,x:game.player.x+.6+(i%5)*.05,y:game.player.y+.6,affixes:['droneSwarm']}));for(let i=0;i<3;i++)render(screen,game,390,844,now+=16);assert.equal(closeViewGLStats.models,cap,quality);assert.ok(closeViewGLStats.modelTriangles<=cap*256);}
}));

test('Foundry source clocks survive pause/reload samples and common decorations remain in their own layer',()=>{
 const {game}=createLabFixture({lab:'creature-assets',scenario:'foundry-tentacled',now:100000});const e=game.enemies[0];e.telegraph=.45;e.attackAim={x:1,y:0};assert.deepEqual(sample(e),sample(structuredClone(e)));const before=structuredClone(e),log=[];Object.assign(e,{warded:true,fracRank:'rare',packName:'Crown',affixes:['droneSwarm'],poiseBreak:.5});drawNativeCreatureDecorations(ctx(log),e,32,1000,{reduceMotion:true});assert.ok(log.some(x=>x[0]==='strokeText'&&x[1]==='Crown'));assert.equal(e.telegraph,before.telegraph);e.hidden=true;log.length=0;drawNativeCreatureDecorations(ctx(log),e,32,1000,{});assert.equal(log.length,0);
});

test('Foundry pure producer metadata and Game/renderer/Close View retain independent import orders',()=>{
 for(const name of ['actor-presentation.ts','game.ts','renderer.ts','close-view.ts']){const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`await import(${JSON.stringify(new URL('../src/'+name,import.meta.url).href)})`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
});
