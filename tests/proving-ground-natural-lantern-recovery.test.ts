import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLabFixture,naturalLanternRecoveryFixture,naturalLanternRecoveryReady,naturalLanternRecoveryWitness,restoreNaturalLanternRecoveryFixture,scenariosForLab} from '../src/proving-ground-labs.ts';
import {serializeSave,deserializeSave} from '../src/save-codec.ts';
import {RECOVERY_CONTEXT,recoveryScope,createRecoveryEnvelope,inspectRecoveryEnvelope} from '../src/proving-ground-recovery.ts';
const binding={proposalId:'r850-'+ 'a'.repeat(12),candidateCommit:'a'.repeat(40),candidateTree:'b'.repeat(40)};
const href=`https://example.test/infinite-corridor/previews/${binding.proposalId}/?lab=recovery&scenario=natural-lantern-leap-reload&seed=LANTERN-RELOAD`;
const idle={state:{x:0,y:0},consume:()=>false,held:()=>false};
function natural(){
 const fixture=naturalLanternRecoveryFixture(1000),g=fixture.game,rejected=[];let now=1000;
 for(let i=0;i<100;i++){now+=50;g.update(.05,idle,now);const w=naturalLanternRecoveryWitness(g);if(w.hopLift>0&&!w.stableEnemyFootprint)rejected.push(w);if(naturalLanternRecoveryReady(g))return{fixture,g,now,rejected};}
 throw new Error('Natural AI did not produce the supported borrowed leap');
}
function recordOf(g,now){g.setPaused(true,now);const capturedAt=123456,before={...naturalLanternRecoveryWitness(g),capturedAt};return createRecoveryEnvelope({binding,context:RECOVERY_CONTEXT,saveText:serializeSave(g.exportSnapshot(now)),preWitness:before,capturedAt});}
test('public scenario keeps natural production kit and waits for an exact-resume legal airborne footprint',()=>{
 assert.ok(scenariosForLab('recovery').some(q=>q.id===RECOVERY_CONTEXT.scenario));
 const f=createLabFixture({lab:'recovery',scenario:RECOVERY_CONTEXT.scenario,seed:'not-the-witness',now:1000});assert.equal(f.seed,'LANTERN-RELOAD');assert.equal(f.game.rx,7);assert.equal(f.game.ry,4);
 const initial=f.game.enemies.find(e=>e.id===RECOVERY_CONTEXT.actorId);assert.deepEqual(initial.packAttacks,['stillnessCurse','sigilScatter','leapSlam']);assert.equal(initial.hybridAttack,'leapSlam');assert.equal(initial.pack.attack,null);
 const {g,now,rejected}=natural(),w=naturalLanternRecoveryWitness(g);
 assert.ok(rejected.length>0,'unsupported airborne ground is reported, never rounded or moved');assert.equal(now,2750);assert.equal(g.player.hp,60);assert.equal(w.hopLift>0,true);assert.equal(w.stableEnemyFootprint,true);assert.equal(w.stablePlayerFootprint,true);assert.equal(w.qualifies,true);
 assert.equal(w.x,11.28099083457619);assert.equal(w.y,20.113727758754788);
});
test('live paused Game snapshot reconstructs the same actor/player/cooldowns with cleared stale lift',()=>{
 const {g,now}=natural(),record=recordOf(g,now),before=record.preWitness;
 assert.equal(inspectRecoveryEnvelope(record,{binding,context:RECOVERY_CONTEXT}).status,'ready');
 const snapshot=JSON.parse(record.saveText),saved=snapshot.session.areas[before.areaStateId].enemies.find(e=>e.id===RECOVERY_CONTEXT.actorId);
 assert.equal(saved.hopLift,before.hopLift);assert.equal(saved.pack.attack,'leapSlam');assert.equal(saved.pack.phase,'active');
 const f=restoreNaturalLanternRecoveryFixture(deserializeSave(record.saveText),before,50000);
 assert.equal(f.game.paused,true);assert.equal(f.diagnostics.restoration.passed,true);
 assert.ok(Object.values(f.diagnostics.restoration.checks).every(Boolean));assert.equal(f.diagnostics.restoration.after.hopLift,0);assert.equal(f.diagnostics.restoration.after.materialContact,true);
 assert.deepEqual(f.diagnostics.restoration.after.cooldowns,before.cooldowns);
 assert.equal(g.enemies.find(e=>e.id===RECOVERY_CONTEXT.actorId).hopLift,before.hopLift,'export never resets the live paused leap');
});

// Exercise the verbatim UI controller and lifecycle functions with a minimal DOM.
// Storage transaction durability is covered by the adapter's separate IndexedDB tests.
const uiSource=readFileSync(new URL('../src/proving-ground.ts',import.meta.url),'utf8');
function controller(fixture,overrides={}){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,hidden:false,textContent:'',value:'',replaceChildren(){},append(){}});return nodes.get(id);};
 const listeners=new Map(),doc={hidden:false,createElement:()=>node('made'),addEventListener(name,fn){listeners.set(name,fn);}};
 const location={href,reload(){calls.reload++;}},calls={reload:0,write:0,read:0,clear:0,decode:0,resetInput:0,generate:0};let clock=fixture.game.lastUpdateNow??1000;
 const deps={RECOVERY_CONTEXT,recoveryScope,createRecoveryEnvelope,serializeSave,deserializeSave(text){calls.decode++;return deserializeSave(text);},naturalLanternRecoveryReady,naturalLanternRecoveryWitness,restoreNaturalLanternRecoveryFixture,
  query:new URL(href).searchParams,location,performance:{now:()=>clock},$:node,seedInput:node('#seedInput'),variantInput:node('#variantInput'),controls:node('#labControls'),launcher:node('#labLauncher'),scenarioSelect:node('#scenarioSelect'),teleportSelect:node('#teleportSelect'),journeyRecord:{save:{seed:'ordinary-scratch'}},LABORATORIES:[],document:doc,Option:function(label,value){return{label,value};},DEFAULT_PROVING_SEED:'CINDER-VERGE-47',
  input:{reset(){calls.resetInput++;}},fetch:async()=>({ok:true,json:async()=>binding}),
  readRecoveryCheckpoint:async()=>{calls.read++;return{status:'empty'};},writeRecoveryCheckpoint:async()=>{calls.write++;return{status:'stored'};},clearRecoveryCheckpoint:async()=>{calls.clear++;return{status:'cleared'};},
  invalidateInteraction(){},fillTeleports(){},updateDiagnostics(){},syncUrl(){},generate(){calls.generate++;},fixture,...overrides};
 const body=uiSource.slice(uiSource.indexOf('let recoveryEpoch='),uiSource.indexOf('const interactionLifecycle=')).replaceAll('export async function','async function').replaceAll('export function','function');
 const visibility=uiSource.slice(uiSource.indexOf('document.addEventListener("visibilitychange",')).split('\n')[0];
 const pauseHandler=uiSource.split('\n').find(line=>line.startsWith('$("#scenarioPause").onclick='));
 const lifecycle=['ready','renderLauncher','openJourney'].map(name=>uiSource.match(new RegExp('^function '+name+'\\(.*$','m'))[0]).join('\n');
 const keys=Object.keys(deps).filter(k=>k!=='fixture');
 const make=new Function('deps',`const {${keys.join(',')}}=deps;let fixture=deps.fixture,game=fixture.game,paused=false,last=0,selectedLab='recovery',teleportSignature='';${body}\n${lifecycle}\n${visibility}\n${pauseHandler}\nreturn{initializeRecovery,captureRecovery,observeRecovery,clearCandidateRecoveryForReset,releaseCandidateRecoveryReset,ready,renderLauncher,openJourney,resetRecoveryState,get:()=>({fixture,game,paused,recoveryArmed,recoveryBusy,recoveryRecord,recoveryStatus,recoveryNote,recoveryEpoch})};`);
 const api=make(deps);return{...api,nodes,node,calls,location,visibility(hidden){doc.hidden=hidden;listeners.get('visibilitychange')();},setClock:t=>{clock=t;}};
}
test('capture UI waits for durable completion and only the reload control reloads the page',async()=>{
 const n=natural();let finish,stored;const pending=new Promise(resolve=>{finish=resolve;});
 const ui=controller(n.fixture,{writeRecoveryCheckpoint:options=>{stored=options.record;return pending;}});
 await ui.initializeRecovery(false);assert.equal(ui.get().game.paused,true);assert.match(ui.node('#recoveryStatus').textContent,/initialized and paused/);
 // Initialization stays paused; a live already-qualified leap can be saved without resuming it.
 const saving=ui.captureRecovery(n.now);assert.equal(ui.get().game.paused,true);assert.equal(ui.get().recoveryBusy,true);assert.equal(ui.node('#recoveryReload').disabled,true);assert.equal(ui.calls.reload,0);
 await assert.rejects(ui.clearCandidateRecoveryForReset(),/Wait for the current recovery operation/);ui.releaseCandidateRecoveryReset(new Error('rejected overlapping reset'));assert.equal(ui.get().recoveryBusy,true,'a refused global reset cannot unlock an in-flight checkpoint write');
 assert.ok(stored.preWitness.hopLift>0);assert.equal(stored.preWitness.capturedAt,stored.capturedAt);
 finish({status:'stored'});await saving;
 assert.equal(ui.get().recoveryStatus,'ready');assert.equal(ui.node('#recoveryReload').disabled,false);assert.match(ui.node('#recoveryStatus').textContent,/No restoration or contact acceptance is claimed/);
 ui.node('#recoveryReload').onclick();assert.equal(ui.calls.reload,1);assert.equal(ui.calls.decode,0,'capture never reconstructs or pretends a page reload happened');
});
test('fresh page initialization validates identity before decode and restores paused through a new Game',async()=>{
 const n=natural(),record=recordOf(n.g,n.now);const ui=controller(naturalLanternRecoveryFixture(50000),{readRecoveryCheckpoint:async()=>({status:'ready',record})});ui.setClock(50000);
 const original=ui.get().game;await ui.initializeRecovery(true);
 assert.notEqual(ui.get().game,original);assert.equal(ui.calls.decode,1);assert.equal(ui.get().game.paused,true);assert.equal(ui.get().fixture.diagnostics.restoration.passed,true);
 assert.match(ui.node('#recoveryStatus').textContent,/resume and verify actual contact/);assert.match(ui.node('#recoveryStatus').textContent,/not a production database load/);
});
test('capture failure is visible and paused; unsupported records are not decoded, overwritten or reloaded',async()=>{
 const n=natural(),ui=controller(n.fixture,{writeRecoveryCheckpoint:async()=>{throw new Error('quota');}});await ui.initializeRecovery(false);await ui.captureRecovery(n.now);
 assert.equal(ui.get().game.paused,true);assert.equal(ui.get().recoveryRecord,null);assert.equal(ui.node('#recoveryReload').disabled,true);assert.match(ui.node('#recoveryStatus').textContent,/not confirmed.*quota/);ui.node('#recoveryReload').onclick();assert.equal(ui.calls.reload,0);
 for(const status of ['unsupported','damaged','mismatch']){const blocked=controller(naturalLanternRecoveryFixture(1000),{readRecoveryCheckpoint:async()=>({status,error:'preserved'})});await blocked.initializeRecovery(true);assert.equal(blocked.calls.decode,0);assert.equal(blocked.node('#recoveryCapture').disabled,true);assert.equal(blocked.get().game.paused,true);}
});
test('leaving recovery invalidates capture and re-enables ordinary scenario seed controls',async()=>{
 for(const method of ['ready','renderLauncher','openJourney']){
  const ui=controller(naturalLanternRecoveryFixture(1000));await ui.initializeRecovery(false);ui.node('#recoveryCapture').onclick();assert.equal(ui.get().recoveryArmed,true);
  const epoch=ui.get().recoveryEpoch;ui[method]();assert.ok(ui.get().recoveryEpoch>epoch);assert.equal(ui.get().recoveryArmed,false);assert.equal(ui.node('#recoveryControls').hidden,true);assert.equal(ui.node('#seedInput').disabled,false);assert.equal(ui.node('#variantInput').disabled,false);
 }
});
test('candidate global reset works from other labs and stops on opaque data; ordinary PG opens no recovery store',async()=>{
 const ui=controller(naturalLanternRecoveryFixture(1000));ui.location.href=href.replace('lab=recovery','lab=landscape');assert.equal((await ui.clearCandidateRecoveryForReset(ui.location.href)).status,'cleared');assert.equal(ui.calls.clear,1);
 const ordinary=controller(naturalLanternRecoveryFixture(1000));assert.equal((await ordinary.clearCandidateRecoveryForReset('https://example.test/infinite-corridor/proving-ground/')).status,'not-candidate');assert.equal(ordinary.calls.clear,0);
 const opaque=controller(naturalLanternRecoveryFixture(1000),{clearRecoveryCheckpoint:async()=>({status:'unsupported',error:'keep future'})});await assert.rejects(opaque.clearCandidateRecoveryForReset(),/keep future/);assert.equal(opaque.calls.reload,0);
});
test('global reset cancels the watch and holds the capture lock across identity/clear and later handoff work',async()=>{
 const n=natural();let count=0,finishIdentity,writes=0;
 const ui=controller(n.fixture,{fetch:()=>++count===1?Promise.resolve({ok:true,json:async()=>binding}):new Promise(resolve=>{finishIdentity=resolve;}),writeRecoveryCheckpoint:async()=>{writes++;return{status:'stored'};}});
 await ui.initializeRecovery(false);ui.node('#scenarioPause').onclick();assert.equal(ui.get().game.paused,false);ui.node('#recoveryCapture').onclick();assert.equal(ui.get().recoveryArmed,true);
 const epoch=ui.get().recoveryEpoch,reset=ui.clearCandidateRecoveryForReset();
 assert.equal(ui.get().recoveryArmed,false);assert.equal(ui.get().recoveryBusy,true);assert.ok(ui.get().recoveryEpoch>epoch);assert.equal(ui.get().game.paused,true);
 ui.observeRecovery(n.now);await ui.captureRecovery(n.now);assert.equal(writes,0);
 finishIdentity({ok:true,json:async()=>binding});await reset;
 assert.equal(ui.get().recoveryBusy,true,'successful clear keeps lock until the outer handler finishes handoff and reload');
 ui.node('#recoveryCapture').onclick();ui.observeRecovery(n.now);await ui.captureRecovery(n.now);assert.equal(writes,0);
 ui.releaseCandidateRecoveryReset(new Error('handoff could not finish'));
 assert.equal(ui.get().recoveryBusy,false);assert.equal(ui.get().game.paused,true);assert.match(ui.node('#recoveryStatus').textContent,/Reset stopped.*handoff could not finish/);
});
test('mobile Reset awaits checkpoint and handoff before clearing namespace keys or reloading',async()=>{
 const source=readFileSync(new URL('../src/proving-ground-mobile.ts',import.meta.url),'utf8'),body=source.slice(source.indexOf('async function resetScratchData()'),source.indexOf('// Release 195:'));
 function mobile(clear){const events=[],status={textContent:''},button={disabled:false,addEventListener(){}};const storage={length:1,key:()=> 'ic-preview-test-scratch:key',removeItem:()=>events.push('remove')};
 const reset=new Function('deps',`const{document,status,confirm,clearCandidateRecoveryForReset,releaseCandidateRecoveryReset,clearHandoff,location,localStorage,sessionStorage,storageNamespace}=deps;${body};return resetScratchData;`)({document:{querySelector:()=>button},status,confirm:()=>true,clearCandidateRecoveryForReset:clear||(async()=>{events.push('checkpoint');}),releaseCandidateRecoveryReset(){events.push('unlock');},clearHandoff:async()=>{events.push('handoff');},location:{href,reload:()=>events.push('reload')},localStorage:storage,sessionStorage:storage,storageNamespace:'ic-preview-test-scratch'});return{reset,events,status,button};}
 const good=mobile();await good.reset();assert.deepEqual(good.events,['checkpoint','handoff','remove','remove','reload']);
 const bad=mobile(async()=>{throw new Error('future checkpoint');});await bad.reset();assert.deepEqual(bad.events,['unlock']);assert.match(bad.status.textContent,/Reset stopped.*future checkpoint/);assert.equal(bad.button.disabled,false);
});


test('pending identity or checkpoint reads never resume newer background or explicit pause intent',async()=>{
 const n=natural(),record=recordOf(n.g,n.now);
 for(const pendingAt of ['identity','storage'])for(const result of ['empty','ready'])for(const intent of ['hide','hide-return','explicit-pause']){
  let finish,pendingStarted=false;const waiting=new Promise(resolve=>{finish=resolve;});
  const loaded=result==='ready'?{status:'ready',record}:{status:'empty'};
  const ui=controller(naturalLanternRecoveryFixture(1000),{
   fetch:pendingAt==='identity'?()=>{pendingStarted=true;return waiting;}:async()=>({ok:true,json:async()=>binding}),
   readRecoveryCheckpoint:pendingAt==='storage'?()=>{pendingStarted=true;return waiting;}:async()=>loaded,
  });
  const initializing=ui.initializeRecovery(false);assert.equal(ui.get().game.paused,true);
  for(let i=0;i<20&&!pendingStarted;i++)await Promise.resolve();assert.equal(pendingStarted,true,`${pendingAt} operation actually began and remains unresolved`);
  // Exercise the actual public visibility/pause handlers while the awaited operation is pending.
  if(intent==='hide'||intent==='hide-return'){ui.visibility(true);if(intent==='hide-return')ui.visibility(false);}
  else{ui.node('#scenarioPause').onclick();ui.node('#scenarioPause').onclick();assert.equal(ui.get().game.paused,true);}
  finish(pendingAt==='identity'?{ok:true,json:async()=>binding}:loaded);await initializing;
  assert.equal(ui.get().game.paused,true,`${pendingAt}/${result}/${intent}: async initialization must not resume`);
  assert.equal(ui.get().paused,true);assert.equal(ui.node('#scenarioPause').disabled,false,'explicit Resume becomes available after the checks finish');
  ui.visibility(false);assert.equal(ui.get().game.paused,true,'returning to visibility still does not resume');
  ui.node('#recoveryCapture').onclick();assert.equal(ui.get().recoveryArmed,true,'operator can arm the watch before the first leap');
  ui.node('#scenarioPause').onclick();assert.equal(ui.get().game.paused,false,'only a new explicit Resume starts the fresh scenario');
 }
});
