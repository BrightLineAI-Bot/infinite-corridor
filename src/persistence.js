import{freshSave,migrateSave}from'./types.js?v=52';
const DB='infinite-corridor',STORE='saves';
const MIRROR='infinite-corridor:active-v2';let writeQueue=Promise.resolve(),queued=null;
export function serializeSave(save){return JSON.stringify({...save,updatedAt:Date.now()})}
export function deserializeSave(text){return migrateSave(JSON.parse(text))}
function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(STORE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
function mirrorRead(){try{const text=localStorage.getItem(MIRROR);return text?deserializeSave(text):null}catch{return null}}
function mirrorWrite(snapshot){try{localStorage.setItem(MIRROR,JSON.stringify(snapshot))}catch(e){console.warn('Save mirror failed',e)}}
export async function loadSave(){let stored=null;try{const db=await openDb();stored=await new Promise((resolve,reject)=>{const q=db.transaction(STORE).objectStore(STORE).get('active');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}catch(e){console.warn('IndexedDB load failed',e)}const mirror=mirrorRead(),choices=[stored&&migrateSave(stored),mirror].filter(Boolean);return choices.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]||freshSave()}
async function write(snapshot){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(snapshot,'active');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
export function saveGame(save){const snapshot=structuredClone({...save,updatedAt:Date.now()});save.updatedAt=snapshot.updatedAt;mirrorWrite(snapshot);queued=snapshot;writeQueue=writeQueue.catch(()=>{}).then(async()=>{while(queued){const next=queued;queued=null;try{await write(next)}catch(e){console.warn('IndexedDB save failed',e)}}});return writeQueue}
export function flushSaves(){return writeQueue}
