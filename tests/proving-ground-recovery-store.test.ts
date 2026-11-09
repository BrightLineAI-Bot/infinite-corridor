import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, footprintOpen } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import * as persistence from '../src/persistence.ts';
import { RECOVERY_CONTEXT, recoveryScope, createRecoveryEnvelope, inspectRecoveryEnvelope, readRecoveryCheckpoint, writeRecoveryCheckpoint, clearRecoveryCheckpoint } from '../src/proving-ground-recovery.ts';
const binding={proposalId:'r850-'+ '1'.repeat(12),candidateCommit:'1'.repeat(40),candidateTree:'2'.repeat(40)};
const href=`https://example.test/game/previews/${binding.proposalId}/?lab=recovery&scenario=natural-lantern-leap-reload&seed=LANTERN-RELOAD`;
const options={binding,context:RECOVERY_CONTEXT,href};
const idle={state:{x:0,y:0},consume:()=>false,held:()=>false};
function natural(){const save=freshSave();save.seed=RECOVERY_CONTEXT.seed;save.futureRecoveryCanary={kept:[1,2]};const game=new Game(save,0);game.rx=7;game.ry=4;game.loadArea('overworld',false);Object.assign(game.player,{x:10,y:20});let actor,now=0;for(let i=1;i<=100;i++){now=i*50;game.update(.05,idle,now);actor=game.enemies.find(e=>e.id===RECOVERY_CONTEXT.actorId);if(actor?.hopLift>0&&footprintOpen(game.map,game.map.width||32,actor.x,actor.y))break;}assert.ok(actor?.hopLift>0);assert.equal(actor.pack.attack,'leapSlam');assert.equal(actor.pack.phase,'active');game.setPaused(true,now);const saveText=serializeSave(game.exportSnapshot(now));const record=createRecoveryEnvelope({binding,context:RECOVERY_CONTEXT,saveText,preWitness:{seed:save.seed,rx:7,ry:4,areaStateId:game.areaStateId(),paused:true,qualifies:true,materialContact:false,stableEnemyFootprint:true,stablePlayerFootprint:true,id:actor.id,kind:actor.kind,hybridAttack:actor.hybridAttack,packAttacks:[...actor.packAttacks],x:actor.x,y:actor.y,hp:actor.hp,attack:actor.pack.attack,phase:actor.pack.phase,hopLift:actor.hopLift,aloft:actor.aloft,cooldowns:{...actor.pack.cd},player:{x:game.player.x,y:game.player.y,hp:game.player.hp},capturedAt:now,futureWitness:{kept:true}},capturedAt:now});return {game,actor,record,now};}
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
// Transactional fake: request success precedes commit; staged puts/deletes are
// applied only on tx completion. Abort and quota paths retain the prior record.
function storage(){
 const databases=new Map(),queues=new Map(),ctl={opened:[],closed:0,hold:false,failCommit:false,quota:false,blocked:false,releases:[],blockedSuccess:[],databases};
 function db(name){
  if(!databases.has(name))databases.set(name,new Map());if(!queues.has(name))queues.set(name,[]);const data=databases.get(name),queue=queues.get(name);
  return {objectStoreNames:{contains:()=>true},createObjectStore(){},close(){ctl.closed++;},transaction(_name,mode){
   const tx={pending:0,settled:false,error:null},staged=[],waiting=[];let started=false,finishing=false;
   const next=()=>{queue.shift();queue[0]?.();};
   const abort=error=>{if(tx.settled)return;tx.settled=true;tx.error=error||tx.error;setTimeout(()=>{tx.onabort?.();next();},0);};tx.abort=()=>abort();
   const settle=()=>{if(tx.pending||tx.settled||finishing)return;finishing=true;const complete=()=>{if(tx.settled)return;if(ctl.failCommit){abort(new Error('abort at commit'));return;}tx.settled=true;for(const f of staged)f();tx.oncomplete?.();next();};if(ctl.hold)ctl.releases.push(complete);else setTimeout(complete,0);};
   const request=fn=>{const q={};tx.pending++;const run=()=>setTimeout(()=>{if(tx.settled)return;try{q.result=fn();q.onsuccess?.();}catch(error){q.error=tx.error=error;q.onerror?.();abort(error);}tx.pending--;settle();},0);if(started)run();else waiting.push(run);return q;};
   const begin=()=>{started=true;for(const run of waiting)run();};queue.push(begin);if(queue.length===1)setTimeout(begin,0);
   tx.objectStore=()=>({get:key=>request(()=>structuredClone(data.get(key))),put:(value,key)=>{assert.equal(mode,'readwrite');const copy=structuredClone(value);return request(()=>{if(ctl.quota)throw new Error('quota exceeded');staged.push(()=>data.set(key,copy));});},delete:key=>{assert.equal(mode,'readwrite');return request(()=>staged.push(()=>data.delete(key)));}});return tx;
  }};
 }
 ctl.idb={open(name){ctl.opened.push(name);const q={};const success=()=>{q.result=db(name);q.onsuccess?.();};setTimeout(()=>{if(ctl.blocked){ctl.blockedSuccess.push(success);q.onblocked?.();return;}success();},0);return q;}};return ctl;
}

test('canonical codec is unchanged and production reexports identical functions; imports never open storage',async()=>{
 assert.equal(persistence.serializeSave,serializeSave);assert.equal(persistence.deserializeSave,deserializeSave);const save=freshSave();save.futureCodec={kept:true};const original=Date.now;try{Date.now=()=>123456;assert.equal(serializeSave(save),JSON.stringify({...save,updatedAt:123456}));assert.deepEqual(deserializeSave(serializeSave(save)).futureCodec,{kept:true});assert.equal(save.updatedAt===123456,false);}finally{Date.now=original;}
 assert.throws(()=>deserializeSave('{'));assert.throws(()=>deserializeSave(JSON.stringify({...save,version:999})),/newer release/);
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');let accesses=0;try{Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){accesses++;throw new Error('import attempted storage');}});await import('../src/save-codec.ts?noio');await import('../src/proving-ground-recovery.ts?noio');assert.equal(accesses,0);}finally{if(descriptor)Object.defineProperty(globalThis,'indexedDB',descriptor);else delete globalThis.indexedDB;}
});
test('real natural positive-lift Game snapshot survives durable storage and fresh canonical restoration',async()=>{
 const {game,actor,record,now}=natural(),ctl=storage(),scope=recoveryScope(binding,href);ctl.databases.set('infinite-corridor',new Map([['journey:1',{untouched:true}]]));
 assert.equal(inspectRecoveryEnvelope(record,options).status,'ready');assert.equal((await readRecoveryCheckpoint(options,ctl.idb)).status,'empty');assert.equal((await writeRecoveryCheckpoint({...options,record},ctl.idb)).status,'stored');
 const read=await readRecoveryCheckpoint(options,ctl.idb);assert.equal(read.status,'ready');assert.deepEqual(read.record,record);assert.equal((await readRecoveryCheckpoint(options,ctl.idb)).status,'ready','read is not consuming');
 const decoded=deserializeSave(read.record.saveText),back=new Game(decoded,now+50000);back.installSystems();const restored=back.enemies.find(e=>e.id===actor.id);assert.ok(back.paused);assert.equal(restored.hopLift,0);assert.equal(restored.aloft,false);assert.equal(restored.x,actor.x);assert.equal(restored.y,actor.y);assert.equal(restored.hp,actor.hp);assert.deepEqual(restored.pack.cd,actor.pack.cd);assert.deepEqual(back.save.futureRecoveryCanary,{kept:[1,2]});assert.equal(back.player.hp,game.player.hp);
 assert.deepEqual(ctl.databases.get('infinite-corridor').get('journey:1'),{untouched:true});assert.ok(ctl.opened.every(n=>n===scope.db));assert.equal((await clearRecoveryCheckpoint(options,ctl.idb)).status,'cleared');assert.equal((await readRecoveryCheckpoint(options,ctl.idb)).status,'empty');
});
test('write resolves after commit, copies validated input, and propagates abort/quota/blocked errors',async()=>{
 const {record}=natural(),ctl=storage(),scope=recoveryScope(binding,href);ctl.hold=true;let resolved=false;const source=structuredClone(record),pending=writeRecoveryCheckpoint({...options,record:source},ctl.idb).then(()=>resolved=true);source.saveText='mutated after call';for(let i=0;i<6;i++)await pause();assert.equal(resolved,false);assert.equal(ctl.databases.get(scope.db).size,0);ctl.hold=false;for(const finish of ctl.releases.splice(0))finish();await pending;assert.equal(resolved,true);assert.equal((await readRecoveryCheckpoint(options,ctl.idb)).record.saveText,record.saveText);
 const before=structuredClone([...ctl.databases.get(scope.db)]);ctl.failCommit=true;await assert.rejects(writeRecoveryCheckpoint({...options,record},ctl.idb),/abort/);assert.deepEqual([...ctl.databases.get(scope.db)],before);ctl.failCommit=false;ctl.quota=true;await assert.rejects(writeRecoveryCheckpoint({...options,record},ctl.idb),/quota/);assert.deepEqual([...ctl.databases.get(scope.db)],before);
 const blocked=storage();blocked.blocked=true;await assert.rejects(readRecoveryCheckpoint(options,blocked.idb),/blocked/);assert.equal(blocked.closed,0);for(const success of blocked.blockedSuccess.splice(0))success();assert.equal(blocked.closed,1,'a late success after blocked rejection closes its connection');await assert.rejects(readRecoveryCheckpoint(options,null),/unavailable/);
});
test('future, corrupt, mismatched or wrong-natural records are preserved on read, replacement and reset',async()=>{
 const {record}=natural(),ctl=storage(),scope=recoveryScope(binding,href);await readRecoveryCheckpoint(options,ctl.idb);const data=ctl.databases.get(scope.db);
 const futureSave=JSON.parse(record.saveText);futureSave.version=999;const wrongActor=JSON.parse(record.saveText);wrongActor.session.areas['overworld:7:4:g1'].enemies.find(e=>e.id===RECOVERY_CONTEXT.actorId).hopLift=0;
 for(const opaque of [{...record,version:2,future:{keep:true}},{...record,preWitness:{...record.preWitness,x:999}},{...record,preWitness:{...record.preWitness,player:{...record.preWitness.player,hp:999}}},{...record,preWitness:{...record.preWitness,cooldowns:{...record.preWitness.cooldowns,fake:1}}},{...record,saveText:'broken'},{...record,saveText:JSON.stringify(futureSave)},{...record,binding:{...binding,candidateTree:'3'.repeat(40)}},{...record,context:{...RECOVERY_CONTEXT,seed:'OTHER'}},{...record,saveText:JSON.stringify(wrongActor)}]){
  data.set(scope.key,structuredClone(opaque));const before=structuredClone(data.get(scope.key));const read=await readRecoveryCheckpoint(options,ctl.idb);assert.notEqual(read.status,'ready');await assert.rejects(writeRecoveryCheckpoint({...options,record},ctl.idb));const cleared=await clearRecoveryCheckpoint(options,ctl.idb);assert.notEqual(cleared.status,'cleared');assert.deepEqual(data.get(scope.key),before);
 }
 assert.throws(()=>createRecoveryEnvelope({...record,binding,context:RECOVERY_CONTEXT,saveText:JSON.stringify(wrongActor)}),/positive-lift/);
});
test('candidate/path/context mismatch fails before any database access or decode',async()=>{
 const ctl=storage();for(const other of [{...options,href:'https://example.test/game/proving-ground/'},{...options,binding:{...binding,candidateCommit:'4'.repeat(40)}},{...options,binding:{...binding,candidateTree:[binding.candidateTree]}},{...options,context:{...RECOVERY_CONTEXT,actorId:'other'}}])await assert.rejects(readRecoveryCheckpoint(other,ctl.idb));assert.equal(ctl.opened.length,0);
 assert.throws(()=>recoveryScope(binding,href.replace('/?','/other.html?')),/exact candidate/);const other={...binding,proposalId:'r851-'+'4'.repeat(12),candidateCommit:'4'.repeat(40)};assert.notEqual(recoveryScope(binding,href).db,recoveryScope(other,href.replace(binding.proposalId,other.proposalId)).db);
});

test('concurrent matching write/clear operations serialize and cannot erase opaque records',async()=>{
 const {record}=natural(),ctl=storage();
 const pair=await Promise.all([writeRecoveryCheckpoint({...options,record},ctl.idb),clearRecoveryCheckpoint(options,ctl.idb)]);assert.equal(pair[0].status,'stored');assert.equal(pair[1].status,'cleared');assert.equal((await readRecoveryCheckpoint(options,ctl.idb)).status,'empty');
 await writeRecoveryCheckpoint({...options,record},ctl.idb);const next=structuredClone(record);next.preWitness.futureConcurrent='retained';const both=await Promise.all([clearRecoveryCheckpoint(options,ctl.idb),writeRecoveryCheckpoint({...options,record:next},ctl.idb)]);assert.equal(both[0].status,'cleared');assert.equal(both[1].status,'stored');assert.equal((await readRecoveryCheckpoint(options,ctl.idb)).record.preWitness.futureConcurrent,'retained');
});
