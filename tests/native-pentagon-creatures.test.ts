import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createCombatant } from '../src/combat.ts';
import { MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, packVariant, freshPackState, updatePackMonster, resetPackRuntime } from '../src/monster-pack.ts';
import { ACTOR_PRESENTATION, PACK_ACTION_FAMILIES, actorPresentation, nativeCreatureCoverage, packActionPresentation } from '../src/actor-presentation.ts';
import { modelSupportsAttachments, modelTriangleCount, MODEL_FLOATS } from '../src/close-view-models.ts';
import { render, drawNativeCreatureDecorations, drawNativeCreatureFloor } from '../src/renderer.ts';
import { hasNativePackEffects, drawNativePackEffects, drawPackTelegraphs } from '../src/monster-render.ts';
import { CLOSE_VIEW_HOOKS, closeViewMonsterAction, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { hauntPlan, hauntSpawns } from '../src/haunts.ts';
import { BOSS_KIT } from '../src/boss-kit.ts';
import { FRACTURE_WARDEN } from '../src/fractured.ts';

const kinds = ['weepingSaint','hangedChoir','graveLantern','mirrorShade','amalgam','gnawingMaw','cinderSeraph','lumenWraith','veilSpinner','riftLynx','sunderjaw','thunderhorn','siegeBeetle','gloomwisp','gloomgorge'];
const oldKinds = ['ashling','rootBrute','pallidCrawler','hollowMarshal','ashenHound','coilStalker'];
const capture = e => ({ enemy:e, nativeFloor(){}, nativeDecorations(){}, nativePackEffects(){} });
const action = e => packActionPresentation(e, ATTACK_MODULES);

test('all fifteen production bodies, prior six decorated bodies and production hybrid modules have explicit coverage', () => {
  for (const kind of [...kinds,...oldKinds]) {
    const e = Object.assign(createCombatant(kind,5,5,true), { fracRank:'rare', fracShaman:true, warded:true, affixes:['droneSwarm','volcanic'], poiseBreak:.4 });
    assert.equal(nativeCreatureCoverage(e,capture(e),{attachments:modelSupportsAttachments(kind,3)}),null,kind);
    assert.ok(modelTriangleCount(kind)+24<=256,kind);
    for (const id of [...(MONSTER_PACK[kind]?.attacks||[]),...(MONSTER_PACK[kind]?.bossAttacks||[])]) if (!ATTACK_MODULES[id].passive) assert.ok(PACK_ACTION_FAMILIES[id],`${kind}/${id}`);
    if (e.pack) { e.pack.attack='future-attack';e.pack.phase='windup';assert.equal(nativeCreatureCoverage(e,capture(e),{attachments:true}),'pack-action'); }
  }
  const donorIds = new Set(PACK_KINDS.filter(k=>!MONSTER_PACK[k].dungeonOnly&&!MONSTER_PACK[k].unique).flatMap(k=>MONSTER_PACK[k].attacks).filter(id=>!ATTACK_MODULES[id].passive&&!ATTACK_MODULES[id].tags.includes('illusion')&&!ATTACK_MODULES[id].tags.includes('summon')));
  for(const id of donorIds) assert.ok(PACK_ACTION_FAMILIES[id],`production hybrid ${id}`);
  for(const id of [...BOSS_KIT.pool,...FRACTURE_WARDEN.attacks]) assert.ok(PACK_ACTION_FAMILIES[id],`guardian/fracture module ${id}`);
  for(const kind of kinds) for(let i=0;i<50;i++){const v=packVariant(kind,`native-witness-${i}`);if(v.hybridAttack)assert.ok(PACK_ACTION_FAMILIES[v.hybridAttack]);}
});

function world(e,id) {
  const range=ATTACK_MODULES[id].range||[0,5],distance=(range[0]+range[1])*.5;
  const w={width:30,height:30,area:'dungeon',dt:.05,now:1000,player:{x:e.x+distance,y:e.y,hp:10000},playerVelocity:{x:0,y:0},playerFacing:{x:1,y:0},enemies:[e],effects:[],hurts:[],spawns:[],
    open:()=>true,tileOpen:()=>true,los:()=>true,move(a,dx,dy){a.x+=dx;a.y+=dy;return true;},hurt(a,n,o){w.hurts.push(o.source);return true;},addEffect(f){w.effects.push(f);},pull(){},confuse(){},curse(){},
    spawnIllusion(owner,x,y,i){const q=Object.assign(createCombatant(owner.kind,x,y),{id:owner.id+':clone'+i,illusion:true,summonedBy:owner.id});w.enemies.push(q);w.spawns.push(q);return q;},
    spawnMinion(owner,kind,x,y,i){const q=Object.assign(createCombatant(kind,x,y),{id:owner.id+':brood'+i,broodOf:owner.id});w.enemies.push(q);w.spawns.push(q);return q;}};
  e.aggro=true;e.pack=freshPackState();e.pack.gap=0;e.packAttacks=[id];e.packBossAttacks=[];
  if(id==='mirrorSwap')w.spawnIllusion(e,e.x+1,e.y,0);
  return w;
}
test('actual pack controllers drive own, boss and borrowed production modules without fallback', () => {
  const borrowed = PACK_KINDS.filter(k=>!MONSTER_PACK[k].dungeonOnly&&!MONSTER_PACK[k].unique).flatMap(k=>MONSTER_PACK[k].attacks).filter(id=>!ATTACK_MODULES[id].passive&&!ATTACK_MODULES[id].tags.includes('illusion')&&!ATTACK_MODULES[id].tags.includes('summon'));
  for(const kind of [...kinds,'pallidCrawler']) for(const id of [...new Set([...MONSTER_PACK[kind].attacks,...MONSTER_PACK[kind].bossAttacks,...BOSS_KIT.pool,...FRACTURE_WARDEN.attacks,...borrowed])].filter(id=>!ATTACK_MODULES[id].passive)) {
    const e=createCombatant(kind,10,10),w=world(e,id);let started=false,recovered=false,seen=new Set();
    for(let i=0;i<180;i++) {
      w.now+=50;updatePackMonster(e,w);
      if(e.pack.attack!==id){if(started)break;continue;} started=true;
      const snapshot=structuredClone(e),p=action(e);assert.ok(p,`${kind}/${id}/${e.pack.phase}`);assert.equal(p.family,PACK_ACTION_FAMILIES[id]);assert.ok(p.progress>=0&&p.progress<=1);seen.add(p.phase);
      assert.deepEqual(e,snapshot,'sampling never advances simulation');
      assert.equal(nativeCreatureCoverage(e,capture(e)),null,`${kind}/${id}/${p.phase} remains covered`);
      if(e.hidden)assert.equal(actorPresentation(e).alpha,0,'burrowing hides borrowed bodies too');
      const native=closeViewMonsterAction(e,kind,null,w.now);assert.deepEqual(native.aim,p.aim);
      if(p.phase==='recover'){recovered=true;assert.equal(p.contact,true);break;}
    }
    assert.ok(started&&recovered,`${kind}/${id} reaches real recovery (${[...seen]})`);
    if(id==='blinkStrike')assert.ok(seen.has('strike'),'teleport is followed by a second pre-hit countdown');
    if(id==='diveBomb')assert.ok(seen.has('track')&&seen.has('lock'));
    if(id==='burrowAmbush')assert.ok(seen.has('travel')&&seen.has('erupt'));
    if(id==='wispBewilder'||id==='gorgeHowl')assert.equal(w.effects.filter(f=>f.kind==='psyRing'&&f.haunt).length,1);
    if(id==='broodBirth')assert.equal(w.spawns.length,2);
    if(id==='mirrorClones')assert.equal(w.spawns.length,2);
    if(id==='spikeVolley')assert.equal(w.effects.filter(f=>f.kind==='mortar'&&f.spike).length,5);
  }
});

test('real Game guardian and Fracture Warden producers retain their modules, scale and native coverage',()=>{
  const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});
  for(const kind of [...kinds,'pallidCrawler'])for(const role of ['guardian','fracture']){
    const e=game.createEnemyFromSpawn({kind,id:`native-${kind}-${role}`,x:game.player.x+.5,y:game.player.y+.5,traits:[],...(role==='fracture'?{fracWarden:true,fracKey:'native-test'}:{dungeonRole:'objectiveGuardian'})});
    assert.equal(role==='fracture'?e.fracWarden:e.kitRole,role==='fracture'?true:'guardian');
    assert.equal(nativeCreatureCoverage(e,capture(e),{attachments:modelSupportsAttachments(kind,3)}),null,`${kind}/${role}`);
    for(const id of e.packAttacks)if(!ATTACK_MODULES[id].passive)assert.ok(PACK_ACTION_FAMILIES[id],`${kind}/${role}/${id}`);
    assert.equal(actorPresentation(e).scale,Math.max(.25,Math.min(4,e.scale)));
  }
});

test('beam facing, burrow concealment, aloft opacity and ram collision use authoritative fields', () => {
  const e=createCombatant('lumenWraith',5,5);e.pack={...freshPackState(),attack:'sweepBeam',phase:'active',t:.7,data:{total:1.4,angle:1},tele:{angle:.8}};
  assert.deepEqual(action(e).aim,{x:Math.cos(.8),y:Math.sin(.8)});assert.equal(action(e).progress,.5);
  const b=Object.assign(createCombatant('sunderjaw',5,5),{hidden:true});assert.equal(actorPresentation(b).alpha,0);assert.equal(nativeCreatureCoverage(b,capture(b)),null);
  const c=Object.assign(createCombatant('cinderSeraph',5,5),{aloft:true});assert.equal(actorPresentation(c).alpha,.35);assert.equal(actorPresentation(c).bodyLift,1.35*c.scale);
  const r=createCombatant('thunderhorn',10,10),w=world(r,'ramCharge');while(r.pack.phase!=='active'){w.now+=50;updatePackMonster(r,w);}w.move=()=>false;w.now+=50;updatePackMonster(r,w);
  assert.equal(r.pack.phase,'stunned');assert.equal(action(r).stunned,true);assert.ok(actorPresentation(r).stagger>0);
  const saved=structuredClone(e);assert.deepEqual(action(e),action(saved));resetPackRuntime(saved);assert.equal(action(saved),null,'load uses the existing producer reset, no new visual timer survives');
});

const ctx=(log=[])=>new Proxy({canvas:null,globalAlpha:1,measureText:()=>({width:10}),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>{o[k]=v;return true;}});
class MockGL {
  uploads=[];program=null;
  constructor(){let n=1;const c=new Map();return new Proxy(this,{get:(o,k)=>{if(k in o)return o[k];if(typeof k==='string'&&/^[A-Z][A-Z0-9_]+$/.test(k)){if(!c.has(k))c.set(k,n++);return c.get(k);}return()=>{};}});}
  isContextLost(){return false;}createShader(){return{};}createProgram(){return{shaders:[]};}shaderSource(s,t){s.text=t;}attachShader(p,s){p.shaders.push(s);}useProgram(p){this.program=p;}createBuffer(){return{};}createTexture(){return{};}createVertexArray(){return{};}getShaderParameter(){return true;}getProgramParameter(p,k){return k===this.ACTIVE_UNIFORMS||k===this.ACTIVE_ATTRIBUTES?0:true;}getExtension(){return null;}
  bufferData(t,d){if(d instanceof Float32Array&&this.program?.shaders?.some(s=>s.text.includes('in float a_alpha')))this.uploads.push(Float32Array.from(d));}
}
function gpu(run){const old=globalThis.WebGL2RenderingContext;globalThis.WebGL2RenderingContext=MockGL;const gl=new MockGL(),log=[],screen=ctx(log),canvas={width:390,height:844,addEventListener(){},getContext:k=>k==='webgl2'?gl:ctx(log)};screen.canvas=canvas;setCloseViewCanvasFactory(()=>canvas);CLOSE_VIEW_HOOKS.gl=true;resetCloseViewGL();try{run({gl,log,screen});}finally{CLOSE_VIEW_HOOKS.gl=null;resetCloseViewGL();setCloseViewCanvasFactory(null);if(old===undefined)delete globalThis.WebGL2RenderingContext;else globalThis.WebGL2RenderingContext=old;}}

test('each production body and its decorated boss submits native geometry with residual FX, no new passes',()=>gpu(({gl,screen})=>{
  const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});game.presentation={effectiveQuality:'full',reduceMotion:true};resetCloseViewCamera();let now=100000;let calls=0;
  for(const kind of [...kinds,...oldKinds]){
    const e=Object.assign(createCombatant(kind,game.player.x+.5,game.player.y+.5,true),{fracRank:'rare',affixes:['droneSwarm'],warded:true});game.enemies=[e];
    for(let i=0;i<4;i++)render(screen,game,390,844,now+=16);
    assert.equal(closeViewGLStats.models,2,kind);assert.deepEqual({...closeViewGLStats.modelFallbacks},{},kind);assert.ok(closeViewGLStats.boards>=1,`${kind} retains labels and effects`);
    assert.ok(closeViewGLStats.modelTriangles<=512);const data=gl.uploads.at(-1);assert.ok(data.every(Number.isFinite));
    if(!calls)calls=closeViewGLStats.drawCalls;else assert.ok(closeViewGLStats.drawCalls<=calls,kind);
  }
  const e=Object.assign(createCombatant('cinderSeraph',game.player.x+.5,game.player.y+.5),{aloft:true,phasing:true});game.enemies=[e];game.paused=true;game.pauseStarted=now;
  render(screen,game,390,844,now+100);const a=gl.uploads.at(-1);render(screen,game,390,844,now+300);const b=gl.uploads.at(-1);
  assert.equal(closeViewGLStats.models,2,'the first paused actor is admitted alongside the player');
  assert.deepEqual(a,b,'paused geometry and opacity are frozen, including a newly admitted actor');
  assert.ok(Array.from(b).some((v,i)=>i%MODEL_FLOATS===9&&v>0&&v<=.45), `paused model opacity: ${[...new Set(Array.from(b).filter((_,i)=>i%MODEL_FLOATS===9))]}; models: ${closeViewGLStats.models}`);
}));

test('authored pack FX remain separate from bodies and pink telegraphs, including hidden mounds',()=>{
  for(const kind of kinds){const e=Object.assign(createCombatant(kind,5,5,true),{aggro:true}),log=[];drawNativeCreatureDecorations(ctx(log),e,32,1000,{reduceMotion:true});assert.ok(log.length,kind);}
  const e=createCombatant('graveLantern',5,5);e.pack.stillT=.8;let log=[];drawNativePackEffects(ctx(log),e,32,1000,{reduceMotion:true},actorPresentation(e));assert.ok(log.some(r=>r[0]==='arc'&&r[4]===-Math.PI/2),'curse ring survives body suppression');
  const mound=Object.assign(createCombatant('sunderjaw',5,5),{hidden:true});log=[];drawNativeCreatureFloor(ctx(log),{presentation:{reduceMotion:true}},mound,32,1000);assert.equal(log.filter(r=>r[0]==='fillRect').length,6);log=[];drawNativeCreatureDecorations(ctx(log),mound,32,1000,{});assert.equal(log.length,0);
  const beam=createCombatant('lumenWraith',5,5);beam.pack.tele={type:'beam',angle:0,length:5,charging:false};beam.pack.phase='active';beam.pack.attack='sweepBeam';log=[];drawPackTelegraphs(ctx(log),[beam],32,1000);assert.ok(log.some(r=>r[0]==='lineTo'),'original authoritative beam producer remains active');
});

test('interior haunt placement, real Game split and merge retain native admission',()=>{
  const {game}=createLabFixture({lab:'close-view',scenario:'terrain-ramps',now:100000});let plan=null;for(let i=0;!plan&&i<100;i++)plan=hauntPlan('native-'+i,'building:test:0',{interior:true});assert.ok(plan);
  const spawns=hauntSpawns(game.map,game.map.width,game.save.seed,'building:test:0',plan);assert.ok(spawns.length);
  const placed=game.createEnemyFromSpawn(spawns[0]);assert.equal(placed.kind,'gloomwisp');assert.equal(nativeCreatureCoverage(placed,capture(placed)),null);
  Object.assign(placed,{aggro:true,splitIn:0,x:game.player.x+.5,y:game.player.y+.5});game.enemies=[placed];game.hauntGorged=false;game.hauntTick(.1,100000);assert.equal(game.enemies.length,2);assert.ok(game.enemies[1].hauntChild);
  while(game.enemies.length<5)game.enemies.push(game.createEnemyFromSpawn({kind:'gloomwisp',id:'merge-'+game.enemies.length,x:placed.x,y:placed.y,traits:[]}));
  game._hauntCheck=0;const gorge=game.hauntTick(.1,100100);assert.equal(gorge.kind,'gloomgorge');assert.equal(nativeCreatureCoverage(gorge,capture(gorge)),null);assert.equal(game.enemies.filter(e=>e.kind==='gloomwisp'&&e.merged&&e.noRewards&&e.dead).length,5);
});

test('render, Game and Close View keep independent import order',()=>{for(const name of ['game.ts','renderer.ts','close-view.ts']){const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`await import(${JSON.stringify(new URL('../src/'+name,import.meta.url).href)})`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}});
