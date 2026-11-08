import { freshSave, migrateSave, unsupportedVersion, compactedAreas } from "./types.js?v=r822-1d2ba908e56c";

const DB = "infinite-corridor", STORE = "saves", SLOT_COUNT = 3;
const LEGACY_MIRROR = "infinite-corridor:active-v2", ACTIVE_SLOT = "infinite-corridor:active-slot-v1", SETTINGS = "infinite-corridor:settings-v1";
const mirrorKey = (slot) => `infinite-corridor:slot-mirror:${slot}`;
export const slotKey = (slot) => `journey:${Math.max(1, Math.min(SLOT_COUNT, Number(slot) || 1))}`;
let activeSlot = 1, writeQueue = Promise.resolve();

export const DEFAULT_SETTINGS = Object.freeze({damageNumbers:true,quality:"auto",safeMode:false,reduceMotion:false,weather:true,highContrast:false,uiScale:1,textScale:1,controlSensitivity:1,controlDeadzone:.08,controlSmoothing:30,masterVolume:.8,musicVolume:.7,effectsVolume:.8,diagnostics:false,familySafe:false,beastTries:true,provingGround:true});
export function normalizeSettings(raw = {}) { const q=["auto","low","balanced","full"].includes(raw.quality)?raw.quality:"auto",clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));return{...DEFAULT_SETTINGS,...raw,quality:q,safeMode:!!raw.safeMode,reduceMotion:!!raw.reduceMotion,weather:raw.weather!==false,highContrast:!!raw.highContrast,diagnostics:!!raw.diagnostics,familySafe:!!raw.familySafe,beastTries:raw.beastTries!==false,provingGround:raw.provingGround!==false,/* release 791: Proving Ground access, on unless turned off */damageNumbers:raw.damageNumbers!==false,/* release 461 */uiScale:clamp(raw.uiScale,.85,1.3,1),textScale:clamp(raw.textScale,.9,1.35,1),controlSensitivity:clamp(raw.controlSensitivity,.7,1.8,1),controlDeadzone:clamp(raw.controlDeadzone,0,.3,.08),controlSmoothing:clamp(raw.controlSmoothing,10,60,30),masterVolume:clamp(raw.masterVolume,0,1,.8),musicVolume:clamp(raw.musicVolume,0,1,.7),effectsVolume:clamp(raw.effectsVolume,0,1,.8)}; }
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
// Perf pack: bookkeeping a split main record carries in its session (assembleSave strips it again): the stamp a delta
// record names as its base, and each stored area's size in characters (for the journey list, without reading the areas).
export const MAIN_STAMP = "mainStamp", AREA_SIZES = "areaSizes";
const areaPrefix = (key) => `${key}::area::`;
const areaRange = (key) => IDBKeyRange.bound(areaPrefix(key), areaPrefix(key) + "￿");
const deltaKey = (key) => `${key}::delta`;
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
  const { [AREA_SPLIT]: _listed, [MAIN_STAMP]: _stamp, [AREA_SIZES]: _sizes, ...session } = main.session;
  return { ...main, session: { ...session, areas } };
}
// Perf pack (P3, Tim's findings 4): the autosave copied the 3.9 MB main record twice every 8 s, once in snapshotSave and
// once in IndexedDB's put (about 135 ms of CPU on this machine for Tim's save, 0.4-0.7 s on his phone).
// (1) snapshotSave shares structure: each part of the journey that is unchanged since the last snapshot of the same save
//     reuses its copy from then (the comparison walks the journey but allocates only for what changed). Copies are never
//     edited, so the shared parts stay exact.
// (2) writeJourney stores the main record whole at most every SAVE_DELTA.everyMs; between those writes it stores only a
//     small delta record (`${key}::delta`) of what changed since (set / delete / append per path, found by comparing two
//     shared snapshots by identity) next to the main record, in the same transaction as the changed areas. Reading applies
//     the delta when it names the main record's stamp. A build without this reads the main record alone: a journey at most
//     everyMs older, whole and consistent, so a rollback never sees a half-written journey.
export const SAVE_DELTA = Object.freeze({ everyMs: 120000, weight: 20000, countCap: 5000 });
const keyCounts = new WeakMap(); // a shared copy (never edited) -> its key count
const plainProto = (v) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function shareCopy(v, prev) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) {
    const n = v.length, p = Array.isArray(prev) ? prev : null; let out = p && p.length === n ? null : new Array(n);
    for (let i = 0; i < n; i++) { const c = shareCopy(v[i], p && i < p.length ? p[i] : undefined); if (out) out[i] = c; else if (!Object.is(c, p[i])) { out = new Array(n); for (let j = 0; j < i; j++) out[j] = p[j]; out[i] = c; } }
    return out || p;
  }
  if (!plainProto(v)) return structuredClone(v); // nothing but plain objects and arrays is shared
  const p = prev && typeof prev === "object" && keyCounts.has(prev) ? prev : null, keys = Object.keys(v); let out = p && keyCounts.get(p) === keys.length ? null : {};
  for (let i = 0; i < keys.length; i++) { const k = keys[i], had = !!p && own(p, k), c = shareCopy(v[k], had ? p[k] : undefined); if (out) out[k] = c; else if (!had || !Object.is(c, p[k])) { out = {}; for (let j = 0; j < i; j++) out[keys[j]] = p[keys[j]]; out[k] = c; } }
  if (!out) return p;
  keyCounts.set(out, keys.length); return out;
}
// The first copy of a save (no earlier one to share with) is the engine's structuredClone, then counted for later sharing.
function countKeys(v) { if (!v || typeof v !== "object") return; if (Array.isArray(v)) { for (const x of v) countKeys(x); return; } if (!plainProto(v) || keyCounts.has(v)) return; const keys = Object.keys(v); keyCounts.set(v, keys.length); for (const k of keys) countKeys(v[k]); }
function firstCopy(v) { const c = structuredClone(v); countKeys(c); return c; }
const sharedSnapshots = new WeakSet(); // snapshots built by snapshotSave (their unchanged parts are shared copies)
const mainCopies = new WeakMap(); // save -> the shared copy of its main record (areas left out) from its last snapshot
const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v) && plainProto(v);
function nodeCount(v, cap) { let n = 0; const walk = (x) => { if (n >= cap) return; n++; if (x && typeof x === "object") for (const k in x) { walk(x[k]); if (n >= cap) return; } }; walk(v); return n; }
const SEP = "\u0001";
function putOp(ops, path, kind, value = undefined, full = undefined) {
  const id = path.join(SEP), prior = ops.get(id);
  if (kind === "add" && prior) { if (prior.kind === "add") value = prior.value.concat(value); else { kind = "set"; value = full; } }
  if (kind !== "add" && (kind === "del" || (value && typeof value === "object"))) { const below = id + SEP; for (const k of ops.keys()) if (k.startsWith(below)) ops.delete(k); } // only to keep the delta small: ops apply in order, so a later set covers them anyway
  ops.delete(id); ops.set(id, { path, kind, value, w: kind === "del" ? 1 : nodeCount(value, SAVE_DELTA.countCap) });
}
function sameValue(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a)) { if (!Array.isArray(b) || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!sameValue(a[i], b[i])) return false; return true; }
  if (Array.isArray(b) || !isPlainObject(a) || !isPlainObject(b)) return false;
  const ka = Object.keys(a); if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!own(b, k) || !sameValue(a[k], b[k])) return false;
  return true;
}
function diffSnapshots(a, b, path, ops) {
  if (Object.is(a, b)) return;
  if (isPlainObject(a) && isPlainObject(b)) {
    const skip = path.length === 1 && path[0] === "session"; // the areas have their own records
    for (const k of Object.keys(b)) { if (skip && k === "areas") continue; if (!own(a, k)) putOp(ops, [...path, k], "set", b[k]); else diffSnapshots(a[k], b[k], [...path, k], ops); }
    for (const k of Object.keys(a)) if (!(skip && k === "areas") && !own(b, k)) putOp(ops, [...path, k], "del");
    return;
  }
  // Arrays: an unchanged one (by value: a base resumed after a boot shares nothing) is skipped; one that only grew appends.
  if (Array.isArray(a) && Array.isArray(b) && b.length >= a.length && a.every((x, i) => sameValue(x, b[i]))) { if (b.length > a.length) putOp(ops, path, "add", b.slice(a.length), b); return; }
  putOp(ops, path, "set", b);
}
function applyOps(root, ops) {
  for (const [path, kind, value] of ops) {
    let o = root; for (let i = 0; i < path.length - 1 && o; i++) { o = o[path[i]]; if (!o || typeof o !== "object") o = null; }
    if (!o) continue; // its parent is laid by a later op
    const k = path[path.length - 1];
    if (kind === "del") delete o[k]; else if (kind === "add") { if (Array.isArray(o[k])) for (const x of value) o[k].push(x); } else o[k] = value;
  }
}
function applyDelta(main, delta) {
  if (!delta || !main?.session || delta.base == null || delta.base !== main.session[MAIN_STAMP]) return false;
  applyOps(main, Array.isArray(delta.ops) ? delta.ops : []);
  if (Array.isArray(delta.areas)) main.session[AREA_SPLIT] = delta.areas;
  if (delta.sizes && typeof delta.sizes === "object") main.session[AREA_SIZES] = delta.sizes;
  return true;
}
// What each journey key holds in the database now (areaKey -> the copy written), so an autosave knows what changed.
const storedAreas = new Map();
const storedSizes = new Map(); // journey key -> Map areaKey -> characters of its stored record
const journals = new Map(); // journey key -> { snapshot, stamp, ops, at }: the last write and the delta since the main record
let stampSeq = 0;
const assembled = new WeakSet(); // journeys readJourney put back together from split records
let onWriteTiming = null; // release 555: the probe hears how long the database's copy took on the main thread
export function setWriteTimingListener(fn) { onWriteTiming = typeof fn === "function" ? fn : null; }
const jsonLength = (v) => { try { return JSON.stringify(v)?.length || 0; } catch { return 0; } };
function sizesFor(key, areas, puts, keys) {
  const known = storedSizes.get(key) || new Map(), out = new Map();
  for (const [k, area] of puts) out.set(k, jsonLength(area));
  for (const k of keys) if (!out.has(k)) out.set(k, known.has(k) ? known.get(k) : jsonLength(areas[k]));
  return out;
}
async function writeJourney(key, value) {
  const db = await openDb(), { main, puts, keys } = splitSnapshot(value, storedAreas.get(key)), prefix = areaPrefix(key);
  const split = main !== value, sizes = split ? sizesFor(key, value.session.areas, puts, keys) : null, j = journals.get(key), now = Date.now();
  let ops = null;
  if (split && j && sharedSnapshots.has(value) && sharedSnapshots.has(j.snapshot) && now - j.at < SAVE_DELTA.everyMs) {
    ops = new Map(j.ops); diffSnapshots(j.snapshot, value, [], ops);
    let w = 0; for (const op of ops.values()) w += op.w; if (w > SAVE_DELTA.weight) ops = null;
  }
  const stamp = ops ? j.stamp : `${now.toString(36)}-${(++stampSeq).toString(36)}`;
  if (split && !ops) Object.assign(main.session, { [MAIN_STAMP]: stamp, [AREA_SIZES]: Object.fromEntries(sizes) });
  let queuedMs = 0;
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE), t0 = performance.now();
      for (const [k, area] of puts) store.put(area, prefix + k);
      if (ops) store.put({ base: stamp, areas: keys, sizes: Object.fromEntries(sizes), ops: [...ops.values()].map((q) => [q.path, q.kind, q.value]) }, deltaKey(key));
      else { store.put(main, key); store.delete(deltaKey(key)); }
      queuedMs = performance.now() - t0;
      const live = new Set(keys), stale = store.getAllKeys(areaRange(key));
      stale.onsuccess = () => { for (const k of stale.result) if (!live.has(String(k).slice(prefix.length))) store.delete(k); };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } catch (error) { journals.delete(key); throw error; } // the next write stores the main record whole
  storedAreas.set(key, new Map(keys.map((k) => [k, value.session.areas[k]])));
  if (sizes) storedSizes.set(key, sizes); else storedSizes.delete(key);
  if (split) journals.set(key, { snapshot: value, stamp, ops: ops || new Map(), at: ops ? j.at : now }); else journals.delete(key);
  try { onWriteTiming?.({ ms: Math.round(queuedMs * 10) / 10, areas: puts.length, of: keys.length, delta: !!ops }); } catch {}
}
// The main record with its delta applied (areas still apart), or a record from before 555 as it is.
// A read of the delta that fails fails the whole read (readJourney throws, so loadSave treats the database as unreadable:
// the mirror if healthy, else the slot is blocked); a main record is never taken alone while its delta may hold newer play.
const readDeltas = new Map(); // journey key -> { stamp, ops } as last read: the base a loaded journey's next delta builds on
async function readMain(key) {
  const main = await read(key); if (!Array.isArray(main?.session?.[AREA_SPLIT])) { readDeltas.delete(key); return main; }
  const stamp = main.session[MAIN_STAMP], delta = await read(deltaKey(key)), applied = applyDelta(main, delta);
  readDeltas.set(key, { stamp, ops: applied && Array.isArray(delta.ops) ? delta.ops : [] });
  return main;
}
// Perf pack (follow-up): the first autosave after every boot wrote the 3.9 MB main record whole, because the delta's base
// was known only to the page that wrote it. A journey loaded from its split records now resumes that base: the stored main
// record as read (its delta applied, areas left out) stands as the last write, and the stored delta's ops are kept, so the
// first autosave writes a delta too. The base is the stored record itself, compared by value where it is not shared, so a
// difference made by migrateSave is written like any other change. A base older than SAVE_DELTA.everyMs writes whole.
function primeJournal(key, stored, save) {
  const d = readDeltas.get(key); readDeltas.delete(key);
  const at = typeof d?.stamp === "string" ? parseInt(d.stamp.split("-")[0], 36) : NaN;
  if (!Number.isFinite(at) || !stored?.session || typeof stored.session !== "object") return;
  const snapshot = { ...stored, session: { ...stored.session, areas: null } }, ops = new Map();
  for (const [path, kind, value] of d.ops) if (Array.isArray(path)) ops.set(path.join(SEP), { path, kind, value, w: kind === "del" ? 1 : nodeCount(value, SAVE_DELTA.countCap) });
  sharedSnapshots.add(snapshot); journals.set(key, { snapshot, stamp: d.stamp, ops, at });
  countKeys(snapshot); mainCopies.set(save, snapshot); // the first snapshot shares the stored parts that still match, by value
}
async function readJourney(key) {
  const main = await readMain(key); if (!Array.isArray(main?.session?.[AREA_SPLIT])) return main;
  const db = await openDb(), prefix = areaPrefix(key);
  const records = await new Promise((resolve, reject) => {
    const store = db.transaction(STORE).objectStore(STORE), ks = store.getAllKeys(areaRange(key)), vs = store.getAll(areaRange(key));
    vs.onsuccess = () => resolve(new Map((ks.result || []).map((k, i) => [String(k).slice(prefix.length), vs.result[i]]))); vs.onerror = () => reject(vs.error); ks.onerror = () => reject(ks.error);
  });
  const sizes = main.session[AREA_SIZES]; if (sizes && typeof sizes === "object") storedSizes.set(key, new Map(Object.entries(sizes).filter(([k, n]) => records.has(k) && Number.isFinite(n))));
  const save = assembleSave(main, records); assembled.add(save); return save;
}
async function removeJourney(key) {
  const db = await openDb();
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE); store.delete(key); store.delete(deltaKey(key)); store.delete(areaRange(key)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  storedAreas.delete(key); storedSizes.delete(key); journals.delete(key);
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
// Release 735 (pre-publish review of 734): the stale mirror is removed only after IndexedDB has the journey (`stored`).
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
async function migrateLegacy(){if(await read(slotKey(1)))return;/* perf pack: the main record answers whether slot 1 is taken */let legacy=await read("active");if(!legacy)try{const text=localStorage.getItem(LEGACY_MIRROR);legacy=text?JSON.parse(text):null}catch{}if(validateJourney(legacy).health==="healthy"){await writeJourney(slotKey(1),legacy);mirrorWrite(1,migrateSave(legacy))}}
export async function loadSave(){activeSlot=getActiveSlot();try{await migrateLegacy()}catch(error){console.warn("Legacy save migration failed",error)}let stored=null,dbFailed=false;try{stored=await readJourney(slotKey(activeSlot))}catch(error){dbFailed=true;console.warn("IndexedDB load failed",error)}const mirrored=mirrorRead(activeSlot),fromDb=stored?validateJourney(stored):{health:"empty",save:null},fromMirror=mirrored?validateJourney(mirrored):{health:"empty",save:null};
  // Release 734: a damaged database record is never replaced by this page. With a healthy mirror it is first kept under
  // damaged:<slot>:<time> (as Recover does) and the mirror plays; otherwise the slot is blocked and a fresh, unsaved journey
  // runs behind the Journeys screen. A damaged mirror with nothing healthy in the database blocks the slot too.
  if(dbFailed)unconfirmed.add(activeSlot);
  if(fromDb.health==="damaged"){let kept=false;if(fromMirror.health==="healthy")try{await write(`damaged:${activeSlot}:${Date.now()}`,stored);kept=true}catch(error){console.warn("Keeping the damaged journey failed",error)}if(!kept){writeBlocked.set(activeSlot,fromDb.error||"This journey is damaged.");return freshSave()}}
  else if(fromDb.health!=="healthy"&&fromMirror.health==="damaged"){writeBlocked.set(activeSlot,fromMirror.error||"This journey is damaged.");return freshSave()}
  const choices=[fromDb,fromMirror].filter(q=>q.health==="healthy").map(q=>q.save);
  // Release 735: when the database could not be read and there is no healthy mirror, the journey may still be there: the
  // slot is blocked (nothing is written) instead of a fresh Wayfarer being saved over it; a reload tries again.
  if(dbFailed&&!choices.length){writeBlocked.set(activeSlot,"This journey could not be read from storage just now. Nothing has been changed: reload the game to try again.");return freshSave()}
  const chosen=choices.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]||freshSave();
  // Release 555: a journey read from the database already has its areas stored there, so the first autosave need not write
  // them all again: each loaded area is its own stored copy until the game replaces it.
  if(chosen===fromDb.save&&assembled.has(stored)){primeStoredAreas(slotKey(activeSlot),chosen);primeJournal(slotKey(activeSlot),stored,chosen)}
  return chosen}
function primeStoredAreas(key,save){const areas=save?.session?.areas;if(!areas||typeof areas!=="object")return;const known=new Map();for(const[k,area]of Object.entries(areas)){if(!area||typeof area!=="object"||compactedAreas.has(area))continue;/* perf pack: an area migrateSave compacted is written again */areaCopies.set(area,area);known.set(k,area)}storedAreas.set(key,known)}
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
export function snapshotSave(save,updatedAt=Date.now()){const areas=save?.session?.areas;if(!areas||typeof areas!=="object"||Array.isArray(areas))return structuredClone({...save,updatedAt});const prev=mainCopies.get(save),live={...save,updatedAt,session:{...save.session,areas:null}},main=prev?shareCopy(live,prev):firstCopy(live),copies={};/* perf pack: unchanged parts reuse their copies */mainCopies.set(save,main);for(const[key,area]of Object.entries(areas)){if(!area||typeof area!=="object"){copies[key]=structuredClone(area);continue}let copy=areaCopies.get(area);if(!copy){copy=structuredClone(area);areaCopies.set(area,copy)}copies[key]=copy}const snapshot={...main,session:{...main.session,areas:copies}};sharedSnapshots.add(snapshot);return snapshot}
export function saveGame(save){const slot=getActiveSlot();if(writeBlocked.has(slot))return writeQueue=Promise.resolve();/* release 734 */const snapshot=snapshotSave(save);save.updatedAt=snapshot.updatedAt;writeQueue=coordinator.enqueue(slot,snapshot).then(()=>undefined,error=>{lastWriteError=error;console.warn("IndexedDB save failed",error)});return writeQueue}
export async function flushSaves(){await Promise.all([writeQueue,coordinator.flush()]);if(lastWriteError){const error=lastWriteError;lastWriteError=null;throw error}}
export function createExclusiveOperation(){let busy=false;return{get busy(){return busy},async run(operation){if(busy)return{ok:false,busy:true};busy=true;try{return{ok:true,value:await operation()}}finally{busy=false}}}}
export async function commitNewJourneyTransition({activeSlot,targetSlot,targetEmpty,options,saveCurrent,flush=flushSaves,create=createJourney,activate=setActiveSlot}){if(activeSlot!==targetSlot||!targetEmpty)await saveCurrent();await flush();const created=await create(targetSlot,options);activate(targetSlot);return created}
// Perf pack (Tim's findings 8): listing the journeys (Options -> Journeys, Options -> System) read every slot whole and ran
// validateJourney (a structured clone and a migrate) and a JSON.stringify of it: about 1 s of CPU for Tim's slot, each time.
// A split journey is now listed from its main record (delta applied, areas not read) with a structural health check: a
// plain object of a supported version with a seed, a position and a level. Loading still validates it in full, and a
// slot that fails then is listed damaged (startFailed). Its size is the main record plus the stored areas' sizes.
export function journeyListing(main,slot=1){if(!Array.isArray(main?.session?.[AREA_SPLIT]))return journeyMetadata(main,slot);const unsupported=unsupportedVersion(main),missing=!main.seed||!main.position||!Number.isFinite(Number(main.level)),error=unsupported||(missing?"Required journey fields are missing":null),sizes=main.session[AREA_SIZES];let bytes=0;try{bytes=JSON.stringify({...main,session:{...main.session,[AREA_SPLIT]:null,[AREA_SIZES]:null}}).length}catch{}if(sizes&&typeof sizes==="object")for(const n of Object.values(sizes))bytes+=Number(n)||0;return{slot,health:error?"damaged":"healthy",empty:false,error,name:String(main.name||`Journey ${slot}`),seed:String(main.seed||"unknown"),level:Number(main.level)||1,location:main.position?.area==="dungeon"?"Dungeon":`${main.position?.rx||0}, ${main.position?.ry||0}`,updatedAt:Number(main.updatedAt)||0,explored:Object.keys(main.explored||{}).length,playSeconds:Math.max(0,Number(main.playSeconds)||0),bytes}}
export async function listJourneySlots(){try{await migrateLegacy()}catch{}const out=[];for(let slot=1;slot<=SLOT_COUNT;slot++){let raw=null;try{raw=await readMain(slotKey(slot))}catch{}if(!raw)raw=mirrorRead(slot);const meta=journeyListing(raw,slot);if(startFailed.has(slot)&&!meta.empty)Object.assign(meta,{health:"damaged",error:startFailed.get(slot)});/* release 734 (S4) */out.push(meta)}return out}
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
