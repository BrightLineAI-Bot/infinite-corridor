import { freshSave, migrateSave } from "./types.js?v=r735-7051faeb03e6";

const DB = "infinite-corridor", STORE = "saves", SLOT_COUNT = 3;
const LEGACY_MIRROR = "infinite-corridor:active-v2", ACTIVE_SLOT = "infinite-corridor:active-slot-v1", SETTINGS = "infinite-corridor:settings-v1";
const mirrorKey = (slot) => `infinite-corridor:slot-mirror:${slot}`;
export const slotKey = (slot) => `journey:${Math.max(1, Math.min(SLOT_COUNT, Number(slot) || 1))}`;
let activeSlot = 1, writeQueue = Promise.resolve();

export const DEFAULT_SETTINGS = Object.freeze({damageNumbers:true,quality:"auto",safeMode:false,reduceMotion:false,weather:true,highContrast:false,uiScale:1,textScale:1,controlSensitivity:1,controlDeadzone:.08,controlSmoothing:30,masterVolume:.8,musicVolume:.7,effectsVolume:.8,diagnostics:false,familySafe:false,beastTries:true});
export function normalizeSettings(raw = {}) { const q=["auto","low","balanced","full"].includes(raw.quality)?raw.quality:"auto",clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));return{...DEFAULT_SETTINGS,...raw,quality:q,safeMode:!!raw.safeMode,reduceMotion:!!raw.reduceMotion,weather:raw.weather!==false,highContrast:!!raw.highContrast,diagnostics:!!raw.diagnostics,familySafe:!!raw.familySafe,beastTries:raw.beastTries!==false,damageNumbers:raw.damageNumbers!==false,/* release 461 */uiScale:clamp(raw.uiScale,.85,1.3,1),textScale:clamp(raw.textScale,.9,1.35,1),controlSensitivity:clamp(raw.controlSensitivity,.7,1.8,1),controlDeadzone:clamp(raw.controlDeadzone,0,.3,.08),controlSmoothing:clamp(raw.controlSmoothing,10,60,30),masterVolume:clamp(raw.masterVolume,0,1,.8),musicVolume:clamp(raw.musicVolume,0,1,.7),effectsVolume:clamp(raw.effectsVolume,0,1,.8)}; }
export function loadSettings(){try{return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS)||"{}"))}catch{return normalizeSettings()}}
export function saveSettings(settings){const clean=normalizeSettings(settings);try{localStorage.setItem(SETTINGS,JSON.stringify(clean))}catch{}return clean}
export function effectiveQuality(settings,env={}){if(settings?.safeMode||settings?.quality==="low")return"low";if(settings?.quality&&settings.quality!=="auto")return settings.quality;const width=Number(env.width)||1280,height=Number(env.height)||800,memory=Number(env.deviceMemory)||4,cores=Number(env.hardwareConcurrency)||4;return Math.min(width,height)<500||memory<=3||cores<=3?"low":"balanced"}
export function serializeSave(save){return JSON.stringify({...save,updatedAt:Date.now()})}
export function deserializeSave(text){return migrateSave(JSON.parse(text))}
export function validateJourney(raw){try{if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Save is not an object");const save=migrateSave(structuredClone(raw));if(!save.seed||!save.position||!Number.isFinite(Number(save.level)))throw new Error("Required journey fields are missing");return{health:"healthy",save,error:null}}catch(error){return{health:"damaged",save:null,error:String(error?.message||error)}}}
export function journeyMetadata(raw,slot=1){if(!raw)return{slot,health:"empty",empty:true,name:`Journey ${slot}`,bytes:0};const checked=validateJourney(raw),source=checked.save||raw;let bytes=0;try{bytes=new Blob([JSON.stringify(raw)]).size}catch{}return{slot,health:checked.health,empty:false,error:checked.error,name:String(source.name||`Journey ${slot}`),seed:String(source.seed||"unknown"),level:Number(source.level)||1,location:source.position?.area==="dungeon"?"Dungeon":`${source.position?.rx||0}, ${source.position?.ry||0}`,updatedAt:Number(source.updatedAt)||0,explored:Object.keys(source.explored||{}).length,playSeconds:Math.max(0,Number(source.playSeconds)||0),bytes}}
// The Wayfarer tab's "Your journey" figures (release 387; Tim approved the suggestion "a short 'your journey so far' page in the
// Wayfarer tab"). Read only from what the save already keeps; returns [label, value] rows.
export function journeyStats(save){const n=(v)=>Math.max(0,Math.floor(Number(v)||0)),h=Math.max(0,Number(save?.playSeconds)||0)/3600,beasts=Object.values(save?.worldBeasts||{}).reduce((a,b)=>a+n(b?.slain),0),cleared=Object.values(save?.consequences?.dungeons||{}).filter((d)=>d?.resolved||d?.guardianDefeated).length,dug=Object.values(save?.digging?.dug||{}).reduce((a,l)=>a+(Array.isArray(l)?l.length:0),0);return[["Time played",`${h.toFixed(1)} h`],...(n(save?.theDeep?.record)?[["Deepest floor of the Deep",n(save.theDeep.record)]]:[]),/* release 677 */["Sections explored",n(Object.keys(save?.explored||{}).length)],["Dungeons cleared",cleared],["World bosses felled",beasts],["Listeners felled",n(save?.farArray?.listeners)],["Towns raised",n(save?.hometowns?.towns?.length)],["Blocks dug",dug]]}
function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function read(key){const db=await openDb();return new Promise((resolve,reject)=>{const q=db.transaction(STORE).objectStore(STORE).get(key);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function write(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
// Release 555 (Tim's probe: a ~80-100 ms freeze every 8 s, outside the game's own frame work): IndexedDB copies whatever it
// is given, on the main thread, when the write is queued. The autosave handed it the whole journey, every area ever visited
// included, so the copy grew with the journey. A journey is now stored as its main record (session.areas left out, the
// area keys listed under session[AREA_SPLIT]) plus one record per area (`${key}::area::${areaKey}`), all in one
// transaction. An autosave writes the main record and only the areas whose stored copy changed since the last write (by
// identity: snapshotSave reuses an unchanged area's copy), and deletes the records of areas that are gone. Reading puts the
// journey back together; a record written before 555 (areas inside) still reads as it is and is split on its next write.
export const AREA_SPLIT = "areasSplit";
const areaPrefix = (key) => `${key}::area::`;
const areaRange = (key) => IDBKeyRange.bound(areaPrefix(key), areaPrefix(key) + "\uffff");
// splitSnapshot(snapshot, known): { main, puts: [[areaKey, area]], keys }. `known` maps areaKey to the copy last stored.
export function splitSnapshot(snapshot, known = null) {
  const areas = snapshot?.session?.areas;
  if (!areas || typeof areas !== "object" || Array.isArray(areas)) return { main: snapshot, puts: [], keys: [] };
  const keys = Object.keys(areas);
  return { main: { ...snapshot, session: { ...snapshot.session, areas: null, [AREA_SPLIT]: keys } }, puts: keys.filter((k) => !known || known.get(k) !== areas[k]).map((k) => [k, areas[k]]), keys };
}
// assembleSave(main, records): the journey with its areas back in place (records: Map areaKey -> area). A main record
// from before 555 is returned unchanged.
export function assembleSave(main, records = new Map()) {
  const listed = main?.session?.[AREA_SPLIT]; if (!Array.isArray(listed)) return main;
  const areas = {}; for (const k of listed) if (records.has(k)) areas[k] = records.get(k);
  const { [AREA_SPLIT]: _listed, ...session } = main.session;
  return { ...main, session: { ...session, areas } };
}
// What each journey key holds in the database now (areaKey -> the copy written), so an autosave knows what changed.
const storedAreas = new Map();
const assembled = new WeakSet(); // journeys readJourney put back together from split records
let onWriteTiming = null; // release 555: the probe hears how long the database's copy took on the main thread
export function setWriteTimingListener(fn) { onWriteTiming = typeof fn === "function" ? fn : null; }
async function writeJourney(key, value) {
  const db = await openDb(), { main, puts, keys } = splitSnapshot(value, storedAreas.get(key)), prefix = areaPrefix(key);
  let queuedMs = 0;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE), t0 = performance.now();
    for (const [k, area] of puts) store.put(area, prefix + k);
    store.put(main, key);
    queuedMs = performance.now() - t0;
    const live = new Set(keys), stale = store.getAllKeys(areaRange(key));
    stale.onsuccess = () => { for (const k of stale.result) if (!live.has(String(k).slice(prefix.length))) store.delete(k); };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
  storedAreas.set(key, new Map(keys.map((k) => [k, value.session.areas[k]])));
  try { onWriteTiming?.({ ms: Math.round(queuedMs * 10) / 10, areas: puts.length, of: keys.length }); } catch {}
}
async function readJourney(key) {
  const main = await read(key); if (!Array.isArray(main?.session?.[AREA_SPLIT])) return main;
  const db = await openDb(), prefix = areaPrefix(key);
  const records = await new Promise((resolve, reject) => {
    const store = db.transaction(STORE).objectStore(STORE), ks = store.getAllKeys(areaRange(key)), vs = store.getAll(areaRange(key));
    vs.onsuccess = () => resolve(new Map((ks.result || []).map((k, i) => [String(k).slice(prefix.length), vs.result[i]]))); vs.onerror = () => reject(vs.error); ks.onerror = () => reject(ks.error);
  });
  const save = assembleSave(main, records); assembled.add(save); return save;
}
async function removeJourney(key) {
  const db = await openDb();
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE); store.delete(key); store.delete(areaRange(key)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  storedAreas.delete(key);
}
async function remove(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
// Release 734 (S1): the mirror is returned as stored (not migrated), so a damaged or newer-version mirror reads as damaged,
// not as an empty slot that a fresh journey may be written over.
function mirrorRead(slot){try{const text=localStorage.getItem(mirrorKey(slot));return text?JSON.parse(text):null}catch{return null}}
// Release 734 (S2, perf P1): past about 5 M characters localStorage refuses the mirror (QuotaExceeded) after a 0.3–1 s
// stringify, every minute, and the stale mirror stayed behind for the loader to find. A journey over MIRROR_BUDGET (its
// area count checked first, so a large journey is never stringified just to be measured) or one refused for quota is
// not mirrored again by this page, and its stale mirror is removed. A new, imported or recovered journey is retried.
export const MIRROR_BUDGET=Object.freeze({chars:2e6,areas:120});
const mirrorSkipped=new Map();
// Release r735-7051faeb03e6 (pre-publish review of 734): the stale mirror is removed only after IndexedDB has the journey (`stored`).
// When the database write failed the mirror may be the only readable copy, so it is then refreshed if it fits, ignoring
// the budget, and otherwise left exactly as it is.
function mirrorWrite(slot,snapshot,stored=true){if(!stored){try{localStorage.setItem(mirrorKey(slot),JSON.stringify(snapshot));return true}catch(error){console.warn("Save mirror failed",error)}return false}if(mirrorSkipped.has(slot))return false;const areas=snapshot?.session?.areas,count=areas&&typeof areas==="object"?Object.keys(areas).length:0;let why="size";if(count<=MIRROR_BUDGET.areas){let text=null;try{text=JSON.stringify(snapshot)}catch{}if(text&&text.length<=MIRROR_BUDGET.chars)try{localStorage.setItem(mirrorKey(slot),text);return true}catch(error){why="quota";console.warn("Save mirror failed",error)}}mirrorSkipped.set(slot,why);try{localStorage.removeItem(mirrorKey(slot))}catch{}return false}
export const mirrorSkippedFor=(slot)=>mirrorSkipped.get(slot)||null;
// Release 734 (S1, S2, S4): slots this page must not write its in-memory journey to. A slot whose stored record is damaged
// (or a newer version), or whose journey threw in new Game, is blocked for the page's life: saveGame skips it, so the
// record stays as it is for Recover, Import, Delete or a newer build. A slot whose IndexedDB read failed at load is
// "unconfirmed": its first write reads the database again, keeps a healthy record there as a recovery snapshot before
// replacing it, and blocks the slot if that record is damaged. So a stale mirror loaded in place of an unreadable
// database never silently replaces newer progress.
const writeBlocked=new Map(),startFailed=new Map(),unconfirmed=new Set();
export function saveBlocked(slot=getActiveSlot()){return writeBlocked.get(slot)||null}
export function markSlotDamaged(slot,reason){const why=String(reason||"This journey is damaged.");writeBlocked.set(slot,why);startFailed.set(slot,why);return why}
const replaced=(slot)=>{startFailed.delete(slot);mirrorSkipped.delete(slot)};
export function getActiveSlot(){try{activeSlot=Math.max(1,Math.min(SLOT_COUNT,Number(localStorage.getItem(ACTIVE_SLOT))||activeSlot))}catch{}return activeSlot}
export function setActiveSlot(slot){activeSlot=Math.max(1,Math.min(SLOT_COUNT,Number(slot)||1));try{localStorage.setItem(ACTIVE_SLOT,String(activeSlot))}catch{}return activeSlot}
async function migrateLegacy(){if(await readJourney(slotKey(1)))return;let legacy=await read("active");if(!legacy)try{const text=localStorage.getItem(LEGACY_MIRROR);legacy=text?JSON.parse(text):null}catch{}if(validateJourney(legacy).health==="healthy"){await writeJourney(slotKey(1),legacy);mirrorWrite(1,migrateSave(legacy))}}
export async function loadSave(){activeSlot=getActiveSlot();try{await migrateLegacy()}catch(error){console.warn("Legacy save migration failed",error)}let stored=null,dbFailed=false;try{stored=await readJourney(slotKey(activeSlot))}catch(error){dbFailed=true;console.warn("IndexedDB load failed",error)}const mirrored=mirrorRead(activeSlot),fromDb=stored?validateJourney(stored):{health:"empty",save:null},fromMirror=mirrored?validateJourney(mirrored):{health:"empty",save:null};
  // Release 734: a damaged database record is never replaced by this page. With a healthy mirror it is first kept under
  // damaged:<slot>:<time> (as Recover does) and the mirror plays; otherwise the slot is blocked and a fresh, unsaved journey
  // runs behind the Journeys screen. A damaged mirror with nothing healthy in the database blocks the slot too.
  if(dbFailed)unconfirmed.add(activeSlot);
  if(fromDb.health==="damaged"){let kept=false;if(fromMirror.health==="healthy")try{await write(`damaged:${activeSlot}:${Date.now()}`,stored);kept=true}catch(error){console.warn("Keeping the damaged journey failed",error)}if(!kept){writeBlocked.set(activeSlot,fromDb.error||"This journey is damaged.");return freshSave()}}
  else if(fromDb.health!=="healthy"&&fromMirror.health==="damaged"){writeBlocked.set(activeSlot,fromMirror.error||"This journey is damaged.");return freshSave()}
  const choices=[fromDb,fromMirror].filter(q=>q.health==="healthy").map(q=>q.save);
  // Release r735-7051faeb03e6: when the database could not be read and there is no healthy mirror, the journey may still be there: the
  // slot is blocked (nothing is written) instead of a fresh Wayfarer being saved over it; a reload tries again.
  if(dbFailed&&!choices.length){writeBlocked.set(activeSlot,"This journey could not be read from storage just now. Nothing has been changed: reload the game to try again.");return freshSave()}
  const chosen=choices.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]||freshSave();
  // Release 555: a journey read from the database already has its areas stored there, so the first autosave need not write
  // them all again: each loaded area is its own stored copy until the game replaces it.
  if(chosen===fromDb.save&&assembled.has(stored))primeStoredAreas(slotKey(activeSlot),chosen);
  return chosen}
function primeStoredAreas(key,save){const areas=save?.session?.areas;if(!areas||typeof areas!=="object")return;const known=new Map();for(const[k,area]of Object.entries(areas)){if(!area||typeof area!=="object")continue;areaCopies.set(area,area);known.set(k,area)}storedAreas.set(key,known)}
export function createSlotWriteCoordinator(writer){let chain=Promise.resolve(),queued=new Map();return{enqueue(slot,snapshot){queued.set(slot,snapshot);chain=chain.catch(()=>{}).then(async()=>{const batch=[...queued];queued=new Map();for(const[key,value]of batch)await writer(key,value)});return chain},flush(){return chain}}}
// Release 519: the localStorage mirror (a fallback the loader uses only when it is newer than IndexedDB, or IndexedDB fails)
// is a synchronous stringify of the whole journey, the ~50 ms frame in Tim's probe. It is written at most every
// MIRROR_EVERY_MS per slot, and always when the IndexedDB write fails.
export const MIRROR_EVERY_MS=60000;const mirroredAt=new Map();
async function confirmSlot(slot){if(!unconfirmed.has(slot))return;const current=await readJourney(slotKey(slot));unconfirmed.delete(slot);if(!current)return;const checked=validateJourney(current);if(checked.health!=="healthy"){writeBlocked.set(slot,checked.error||"This journey is damaged.");console.warn(`Journey ${slot} is not saved: ${writeBlocked.get(slot)}`);return}await snapshotRecovery(slot,current,true)}
const coordinator=createSlotWriteCoordinator(async(slot,snapshot)=>{if(writeBlocked.has(slot))return;try{await confirmSlot(slot);if(writeBlocked.has(slot))return;await writeJourney(slotKey(slot),snapshot)}catch(error){if(!(Date.now()-(mirroredAt.get(slot)??-Infinity)<MIRROR_EVERY_MS)){mirrorWrite(slot,snapshot,false);mirroredAt.set(slot,Date.now())}/* release 735: at most once a minute while the database is failing */throw error}const now=Date.now();if(!(now-(mirroredAt.get(slot)??-Infinity)<MIRROR_EVERY_MS)){mirrorWrite(slot,snapshot);mirroredAt.set(slot,now)}});
let lastWriteError=null;
// Release 167: the autosave (every 8 s) deep-copied every area the journey had ever visited, so it grew into a 30-70 ms
// stall on a phone. An area's stored state is replaced, never edited, when the Wayfarer leaves or saves in it, so the copy
// of an unchanged area is reused from the previous save; only the rest of the save and changed areas are copied again.
const areaCopies=new WeakMap();
export function snapshotSave(save,updatedAt=Date.now()){const areas=save?.session?.areas;if(!areas||typeof areas!=="object"||Array.isArray(areas))return structuredClone({...save,updatedAt});const snapshot=structuredClone({...save,updatedAt,session:{...save.session,areas:null}}),copies={};for(const[key,area]of Object.entries(areas)){if(!area||typeof area!=="object"){copies[key]=structuredClone(area);continue}let copy=areaCopies.get(area);if(!copy){copy=structuredClone(area);areaCopies.set(area,copy)}copies[key]=copy}snapshot.session.areas=copies;return snapshot}
export function saveGame(save){const slot=getActiveSlot();if(writeBlocked.has(slot))return writeQueue=Promise.resolve();/* release 734 */const snapshot=snapshotSave(save);save.updatedAt=snapshot.updatedAt;writeQueue=coordinator.enqueue(slot,snapshot).then(()=>undefined,error=>{lastWriteError=error;console.warn("IndexedDB save failed",error)});return writeQueue}
export async function flushSaves(){await Promise.all([writeQueue,coordinator.flush()]);if(lastWriteError){const error=lastWriteError;lastWriteError=null;throw error}}
export function createExclusiveOperation(){let busy=false;return{get busy(){return busy},async run(operation){if(busy)return{ok:false,busy:true};busy=true;try{return{ok:true,value:await operation()}}finally{busy=false}}}}
export async function commitNewJourneyTransition({activeSlot,targetSlot,targetEmpty,options,saveCurrent,flush=flushSaves,create=createJourney,activate=setActiveSlot}){if(activeSlot!==targetSlot||!targetEmpty)await saveCurrent();await flush();const created=await create(targetSlot,options);activate(targetSlot);return created}
export async function listJourneySlots(){try{await migrateLegacy()}catch{}const out=[];for(let slot=1;slot<=SLOT_COUNT;slot++){let raw=null;try{raw=await readJourney(slotKey(slot))}catch{}if(!raw)raw=mirrorRead(slot);const meta=journeyMetadata(raw,slot);if(startFailed.has(slot)&&!meta.empty)Object.assign(meta,{health:"damaged",error:startFailed.get(slot)});/* release 734 (S4) */out.push(meta)}return out}
function namedFresh(name,seed){const save=freshSave();save.name=String(name||"Wayfarer").slice(0,40);save.seed=String(seed||`CORRIDOR-${Date.now().toString(36).toUpperCase()}`).slice(0,64);return save}
async function snapshotRecovery(slot,raw,checked=false){if(!raw||!checked&&validateJourney(raw).health!=="healthy")return;const previous=await read(`recovery:${slot}:1`);if(previous)await write(`recovery:${slot}:2`,previous);await write(`recovery:${slot}:1`,raw)}
export async function createJourney(slot,options={}){const current=await readJourney(slotKey(slot))||mirrorRead(slot);if(current&&!options.replace)throw new Error("That journey slot is occupied.");if(current)await snapshotRecovery(slot,current);const save=namedFresh(options.name,options.seed);replaced(slot);await writeJourney(slotKey(slot),save);mirrorWrite(slot,save);return journeyMetadata(save,slot)}
export async function renameJourney(slot,name){const raw=await readJourney(slotKey(slot)),valid=validateJourney(raw);if(valid.health!=="healthy")throw new Error("Only a healthy journey can be renamed.");valid.save.name=String(name||valid.save.name).slice(0,40);valid.save.updatedAt=Date.now();await writeJourney(slotKey(slot),valid.save);mirrorWrite(slot,valid.save);return journeyMetadata(valid.save,slot)}
export async function duplicateJourney(from,to){const source=await readJourney(slotKey(from)),target=await readJourney(slotKey(to)),valid=validateJourney(source);if(valid.health!=="healthy")throw new Error("Source journey is not healthy.");if(target)throw new Error("Destination slot is occupied.");const copy=structuredClone(valid.save);copy.name=`${copy.name} Copy`.slice(0,40);copy.updatedAt=Date.now();await writeJourney(slotKey(to),copy);mirrorWrite(to,copy);return journeyMetadata(copy,to)}
export async function deleteJourney(slot){const raw=await readJourney(slotKey(slot));await snapshotRecovery(slot,raw);replaced(slot);await removeJourney(slotKey(slot));try{localStorage.removeItem(mirrorKey(slot))}catch{}}
export async function exportJourney(slot){const raw=await readJourney(slotKey(slot));if(!raw)throw new Error("Journey slot is empty.");return JSON.stringify({format:"infinite-corridor-journey",formatVersion:1,slot,exportedAt:Date.now(),save:raw},null,2)}
export async function importJourney(slot,text,replace=false){const bundle=JSON.parse(text),raw=bundle?.format==="infinite-corridor-journey"?bundle.save:bundle&&typeof bundle==="object"&&bundle.save&&typeof bundle.save==="object"&&"release" in bundle?bundle.save:bundle;/* release 623 (system audit): a diagnostics file carries the journey under .save; anything without a seed and version is not a journey */if(!raw||typeof raw!=="object"||typeof raw.seed!=="string"||!Number.isFinite(Number(raw.version)))throw new Error("That file is not a journey.");const valid=validateJourney(raw);if(valid.health!=="healthy")throw new Error(valid.error||"Import is damaged.");const current=await readJourney(slotKey(slot));if(current&&!replace)throw new Error("Choose an empty slot or explicitly replace this journey.");if(current)await snapshotRecovery(slot,current);replaced(slot);valid.save.updatedAt=Date.now();await writeJourney(slotKey(slot),valid.save);mirrorWrite(slot,valid.save);return journeyMetadata(valid.save,slot)}
export async function recoverJourney(slot){for(const index of[1,2]){const raw=await read(`recovery:${slot}:${index}`),valid=validateJourney(raw);if(valid.health==="healthy"){const damaged=await readJourney(slotKey(slot));if(damaged)await write(`damaged:${slot}:${Date.now()}`,damaged);replaced(slot);valid.save.updatedAt=Date.now();await writeJourney(slotKey(slot),valid.save);mirrorWrite(slot,valid.save);return journeyMetadata(valid.save,slot)}}throw new Error("No healthy recovery snapshot is available.")}
export async function storageReport(){const slots=await listJourneySlots();let estimate=null;try{estimate=await navigator.storage?.estimate?.()}catch{}return{slots,totalJourneyBytes:slots.reduce((n,q)=>n+q.bytes,0),usage:estimate?.usage||null,quota:estimate?.quota||null}}
