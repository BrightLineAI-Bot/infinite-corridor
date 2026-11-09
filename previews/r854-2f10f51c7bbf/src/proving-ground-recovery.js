// Candidate-only natural Lantern recovery. No production persistence imports,
// storage access, fetch or Game construction occurs until an explicit UI action.
import { unsupportedVersion } from './types.js?v=r854-2f10f51c7bbf';
export const RECOVERY_CONTEXT=Object.freeze({lab:'recovery',scenario:'natural-lantern-leap-reload',seed:'LANTERN-RELOAD',rx:7,ry:4,actorId:'pack-overworld:7:4:0'});
const FORMAT='ic-proving-ground-recovery',VERSION=1,STORE='checkpoint',KEY='natural-lantern-leap-reload';
const plain=q=>!!q&&typeof q==='object'&&!Array.isArray(q)&&(Object.getPrototypeOf(q)===Object.prototype||Object.getPrototypeOf(q)===null);
const SHA=/^[0-9a-f]{40}$/;
function validBinding(b){return plain(b)&&typeof b.proposalId==='string'&&typeof b.candidateCommit==='string'&&typeof b.candidateTree==='string'&&SHA.test(b.candidateCommit)&&SHA.test(b.candidateTree)&&/^r\d+-[0-9a-f]{12}$/.test(b.proposalId)&&b.proposalId.endsWith('-'+b.candidateCommit.slice(0,12));}
function sameBinding(a,b){return validBinding(a)&&validBinding(b)&&a.proposalId===b.proposalId&&a.candidateCommit===b.candidateCommit&&a.candidateTree===b.candidateTree;}
function validContext(c){return plain(c)&&Object.keys(RECOVERY_CONTEXT).every(k=>c[k]===RECOVERY_CONTEXT[k]);}
const result=(status,error)=>error?{status,error}:{status};
export function recoveryScope(binding,href){
  if(!validBinding(binding))throw new Error('Recovery requires a complete exact candidate identity.');
  let url;try{url=new URL(href);}catch{throw new Error('Recovery requires an absolute candidate page URL.');}
  const base=new URL('./',url);
  if(!['https:','http:'].includes(base.protocol)||url.username||url.password||!base.pathname.endsWith('/'+binding.proposalId+'/')||![base.pathname,base.pathname+'index.html'].includes(url.pathname))throw new Error('Recovery is available only inside its exact candidate preview.');
  return {db:`ic-preview-${binding.proposalId}-scratch:recovery:${binding.candidateTree}:${encodeURIComponent(base.origin+base.pathname)}`,store:STORE,key:KEY,binding:{...binding}};
}
function payloadStatus(text){
  if(typeof text!=='string'||!text.length)return result('damaged','Checkpoint has no canonical save text.');
  let save;try{save=JSON.parse(text);}catch{return result('damaged','Checkpoint save text is not valid JSON.');}
  if(!plain(save)||typeof save.seed!=='string'||!plain(save.session))return result('damaged','Checkpoint is not a journey snapshot.');
  const newer=unsupportedVersion(save);if(newer)return result('unsupported',newer);
  const s=save.session,c=RECOVERY_CONTEXT;
  if(save.seed!==c.seed||s.area!=='overworld'||s.rx!==c.rx||s.ry!==c.ry||s.paused!==true||!Number.isFinite(s.x)||!Number.isFinite(s.y))return result('mismatch','Checkpoint is not the paused natural Lantern section.');
  const enemies=s.areas?.[`overworld:${c.rx}:${c.ry}:g${save.worldGeneration}`]?.enemies;
  const actor=Array.isArray(enemies)?enemies.find(e=>e?.id===c.actorId):null;
  if(!actor||actor.kind!=='graveLantern'||actor.hybridAttack!=='leapSlam'||!Array.isArray(actor.packAttacks)||!actor.packAttacks.includes('leapSlam')||actor.pack?.attack!=='leapSlam'||actor.pack.phase!=='active'||actor.aloft!==true||!Number.isFinite(actor.hopLift)||!(actor.hopLift>0)||actor.dead||!(actor.hp>0))return result('mismatch','Checkpoint does not contain the natural Lantern in its live positive-lift leap.');
  return {status:'ready',save,actor};
}
function matchingWitness(w,save,actor){
  const c=RECOVERY_CONTEXT,s=save.session;
  return w.seed===c.seed&&w.rx===c.rx&&w.ry===c.ry&&w.areaStateId===`overworld:${c.rx}:${c.ry}:g${save.worldGeneration}`&&
    w.paused===true&&w.qualifies===true&&w.materialContact===false&&w.stableEnemyFootprint===true&&w.stablePlayerFootprint===true&&w.id===actor.id&&w.kind===actor.kind&&w.hybridAttack===actor.hybridAttack&&
    JSON.stringify(w.packAttacks)===JSON.stringify(actor.packAttacks)&&w.x===actor.x&&w.y===actor.y&&w.hp===actor.hp&&
    w.attack===actor.pack.attack&&w.phase===actor.pack.phase&&w.hopLift===actor.hopLift&&w.aloft===actor.aloft&&
    plain(w.player)&&w.player.x===s.x&&w.player.y===s.y&&w.player.hp===save.hp&&
    plain(w.cooldowns)&&Object.keys(w.cooldowns).length===Object.keys(actor.pack.cd||{}).length&&
    Object.keys(actor.pack.cd||{}).every(key=>w.cooldowns[key]===actor.pack.cd[key]);
}
export function inspectRecoveryEnvelope(record,{binding,context}={}){
  if(!validBinding(binding)||!validContext(context))return result('mismatch','Recovery expectation is not the exact supported candidate and natural scenario.');
  if(!plain(record))return result('damaged','Checkpoint envelope is not an object.');
  if(record.format!==FORMAT||record.version!==VERSION)return result('unsupported','Checkpoint envelope format/version is not supported; it was kept unchanged.');
  if(!sameBinding(record.binding,binding)||!validContext(record.context))return result('mismatch','Checkpoint belongs to a different candidate or scenario; it was kept unchanged.');
  if(!Number.isFinite(record.capturedAt)||record.capturedAt<0||!plain(record.preWitness))return result('damaged','Checkpoint witness metadata is damaged; it was kept unchanged.');
  const status=payloadStatus(record.saveText);if(status.status!=='ready')return status;
  if(!matchingWitness(record.preWitness,status.save,status.actor))return result('damaged','Checkpoint witness does not agree with its canonical snapshot; it was kept unchanged.');
  return {status:'ready',record};
}
export function createRecoveryEnvelope({binding,context,saveText,preWitness,capturedAt}={}){
  const record={format:FORMAT,version:VERSION,binding:structuredClone(binding),context:structuredClone(context),saveText,preWitness:structuredClone(preWitness),capturedAt};
  const checked=inspectRecoveryEnvelope(record,{binding,context});if(checked.status!=='ready')throw new Error(checked.error||'Invalid recovery checkpoint.');return record;
}
function openDb(scope,idb){
  if(!idb||typeof idb.open!=='function')return Promise.reject(new Error('IndexedDB is unavailable; no recovery checkpoint was stored.'));
  return new Promise((resolve,reject)=>{
    let settled=false,q;try{q=idb.open(scope.db,1);}catch(error){reject(error);return;}
    const fail=error=>{if(!settled){settled=true;reject(error||new Error('Recovery database could not open.'));}};
    q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE);};
    q.onerror=()=>fail(q.error);q.onblocked=()=>fail(new Error('Recovery database is blocked; close another candidate tab and retry.'));
    q.onsuccess=()=>{if(settled){q.result.close?.();return;}settled=true;resolve(q.result);};
  });
}
async function transact(options,idb,operation){
  const scope=recoveryScope(options?.binding,options?.href);
  const binding=structuredClone(options.binding),context=structuredClone(options.context);
  if(!validContext(context))throw new Error('Recovery is restricted to the exact natural Lantern scenario.');
  const db=await openDb(scope,idb);
  return new Promise((resolve,reject)=>{
    let tx,out,failed=null;
    const close=()=>db.close?.();
    try{
      tx=db.transaction(STORE,operation==='read'?'readonly':'readwrite');
      tx.oncomplete=()=>{close();if(failed)reject(failed);else resolve(out);};
      tx.onerror=tx.onabort=()=>{close();reject(failed||tx.error||new Error('Recovery transaction failed; the checkpoint was not committed.'));};
      // get() returns undefined both for absence and for a stored undefined.
      // Presence and value must be read under this same transaction's lock.
      const store=tx.objectStore(STORE),presence=store.count(KEY),q=store.get(KEY);
      let presentRead=false,valueRead=false,handled=false;
      const process=()=>{
        if(!presentRead||!valueRead||handled||failed)return;
        handled=true;
        try {
        if(presence.result!==0&&presence.result!==1)throw new Error('Recovery checkpoint presence could not be confirmed.');
        const checked=presence.result===0?result('empty'):inspectRecoveryEnvelope(q.result,{binding,context});
        if(operation==='read'){out=checked;return;}
        if(operation==='clear'){
          if(checked.status==='ready'){store.delete(KEY);out=result('cleared');}else out=checked;
          return;
        }
        // Read and conditional write share one transaction: never overwrite an
        // opaque, future, damaged or mismatched record after a separate preflight.
        if(checked.status!=='empty'&&checked.status!=='ready'){failed=new Error(checked.error||'Checkpoint cannot be replaced.');tx.abort();return;}
        store.put(options.record,KEY);out=result('stored');
        }catch(error){failed=error;try{tx.abort();}catch{close();reject(error);}}
      };
      presence.onerror=()=>{failed=presence.error||new Error('Recovery checkpoint presence could not be read.');};
      q.onerror=()=>{failed=q.error||new Error('Recovery checkpoint could not be read.');};
      presence.onsuccess=()=>{presentRead=true;process();};
      q.onsuccess=()=>{valueRead=true;process();};
    }catch(error){failed=error;if(tx){try{tx.abort();}catch{close();reject(error);}}else{close();reject(error);}}
  });
}
export const readRecoveryCheckpoint=(options,idb=globalThis.indexedDB)=>transact(options,idb,'read');
export function writeRecoveryCheckpoint(options,idb=globalThis.indexedDB){
  const checked=inspectRecoveryEnvelope(options?.record,options);if(checked.status!=='ready')return Promise.reject(new Error(checked.error||'A valid live checkpoint is required.'));
  // Copy before the asynchronous transaction so UI changes cannot alter identity
  // or payload between validation and IndexedDB's own structured clone.
  const copy={...options,binding:structuredClone(options.binding),context:structuredClone(options.context),record:structuredClone(options.record)};
  return transact(copy,idb,'write');
}
export const clearRecoveryCheckpoint=(options,idb=globalThis.indexedDB)=>transact(options,idb,'clear');
