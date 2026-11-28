import { freshSave, migrateSave, unsupportedVersion, compactedAreas } from "./types.ts";
import { ensureProductionTriceratops } from "./beast-mounts.ts";
import { startJourney } from "./progression.ts";
import { setWayfarerBody } from "./journey-start.ts";

const DB = "infinite-corridor", STORE = "saves", SLOT_COUNT = 3;
const LEGACY_MIRROR = "infinite-corridor:active-v2", ACTIVE_SLOT = "infinite-corridor:active-slot-v1", SETTINGS = "infinite-corridor:settings-v1";
const mirrorKey = (slot) => `infinite-corridor:slot-mirror:${slot}`;
export const slotKey = (slot) => `journey:${Math.max(1, Math.min(SLOT_COUNT, Number(slot) || 1))}`;
let activeSlot = 1, writeQueue = Promise.resolve();

export const DEFAULT_SETTINGS = Object.freeze({damageNumbers:true,quality:"auto",safeMode:false,reduceMotion:false,weather:true,highContrast:false,uiScale:1,textScale:1,controlSensitivity:1,controlDeadzone:.08,controlSmoothing:30,masterVolume:.8,musicVolume:.7,effectsVolume:.8,soundtrack:"adaptive",backgroundMusic:false,diagnostics:false,familySafe:false,beastTries:true,provingGround:true,hints:"on"/* Progression Phase 4: Options → Hints (on, abilities, off) */});
export function normalizeSettings(raw = {}) { const q=["auto","low","balanced","full"].includes(raw.quality)?raw.quality:"auto",clamp=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));return{...DEFAULT_SETTINGS,...raw,quality:q,safeMode:!!raw.safeMode,reduceMotion:!!raw.reduceMotion,weather:raw.weather!==false,highContrast:!!raw.highContrast,diagnostics:!!raw.diagnostics,familySafe:!!raw.familySafe,beastTries:raw.beastTries!==false,provingGround:raw.provingGround!==false,/* release 791: Proving Ground access, on unless turned off */damageNumbers:raw.damageNumbers!==false,/* release 461 */uiScale:clamp(raw.uiScale,.85,1.3,1),textScale:clamp(raw.textScale,.9,1.35,1),controlSensitivity:clamp(raw.controlSensitivity,.7,1.8,1),controlDeadzone:clamp(raw.controlDeadzone,0,.3,.08),controlSmoothing:clamp(raw.controlSmoothing,10,60,30),masterVolume:clamp(raw.masterVolume,0,1,.8),musicVolume:clamp(raw.musicVolume,0,1,.7),effectsVolume:clamp(raw.effectsVolume,0,1,.8),soundtrack:raw.soundtrack==="calm"?"calm":"adaptive"/* 2026-11-14: Soundtrack, Adaptive or Calm only (no combat lift) */,backgroundMusic:raw.backgroundMusic===true/* 2026-11-19: Music in background (background-music.ts), off unless turned on */,hints:["on","abilities","off"].includes(raw.hints)?raw.hints:"on"}; }
// Reduce Motion follows the system's prefers-reduced-motion only where no choice is stored yet (2026-11-19, first-hour fixes):
// first settings on a device, or stored settings from before the option existed. A stored choice, on or off, always wins.
export function systemReducedMotion(env=globalThis){try{return!!env?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches}catch{return false}}
export function withMotionDefault(raw,env=globalThis){const r=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};return"reduceMotion"in r?r:{...r,reduceMotion:systemReducedMotion(env)}}
export function loadSettings(env=globalThis){let raw={};try{raw=JSON.parse(localStorage.getItem(SETTINGS)||"{}")}catch{}return normalizeSettings(withMotionDefault(raw,env))}
export function saveSettings(settings){const clean=normalizeSettings(settings);try{localStorage.setItem(SETTINGS,JSON.stringify(clean))}catch{}return clean}
export function effectiveQuality(settings,env={}){if(settings?.safeMode||settings?.quality==="low")return"low";if(settings?.quality&&settings.quality!=="auto")return settings.quality;const width=Number(env.width)||1280,height=Number(env.height)||800,memory=Number(env.deviceMemory)||4,cores=Number(env.hardwareConcurrency)||4;return Math.min(width,height)<500||memory<=3||cores<=3?"low":"balanced"}
export { serializeSave, deserializeSave } from "./save-codec.ts";
export function validateJourney(raw){try{if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Save is not an object");const save=migrateSave(structuredClone(raw));if(!save.seed||!save.position||!Number.isFinite(Number(save.level)))throw new Error("Required journey fields are missing");return{health:"healthy",save,error:null}}catch(error){return{health:"damaged",save:null,error:String(error?.message||error)}}}
export function journeyMetadata(raw,slot=1){if(!raw)return{slot,health:"empty",empty:true,name:`Journey ${slot}`,bytes:0};const checked=validateJourney(raw),source=checked.save||raw;let bytes=0;try{bytes=new Blob([JSON.stringify(raw)]).size}catch{}return{slot,health:checked.health,empty:false,error:checked.error,name:String(source.name||`Journey ${slot}`),seed:String(source.seed||"unknown"),level:Number(source.level)||1,location:source.position?.area==="dungeon"?"Dungeon":`${source.position?.rx||0}, ${source.position?.ry||0}`,updatedAt:Number(source.updatedAt)||0,explored:Object.keys(source.explored||{}).length,playSeconds:Math.max(0,Number(source.playSeconds)||0),bytes,storedBytes:bytes}}
// The Wayfarer tab's "Your journey" figures (release 387; Tim approved the suggestion "a short 'your journey so far' page in the
// Wayfarer tab"). Read only from what the save already keeps; returns [label, value] rows.
export function journeyStats(save){const n=(v)=>Math.max(0,Math.floor(Number(v)||0)),h=Math.max(0,Number(save?.playSeconds)||0)/3600,beasts=Object.values(save?.worldBeasts||{}).reduce((a,b)=>a+n(b?.slain),0),cleared=Object.values(save?.consequences?.dungeons||{}).filter((d)=>d?.resolved||d?.guardianDefeated).length,dug=Object.values(save?.digging?.dug||{}).reduce((a,l)=>a+(Array.isArray(l)?l.length:0),0);return[["Time played",`${h.toFixed(1)} h`],...(n(save?.theDeep?.record)?[["Deepest floor of the Deep",n(save.theDeep.record)]]:[]),/* release 677 */["Sections explored",n(Object.keys(save?.explored||{}).length)],["Dungeons cleared",cleared],["World bosses felled",beasts],["Listeners felled",n(save?.farArray?.listeners)],["Towns raised",n(save?.hometowns?.towns?.length)],["Blocks dug",dug]]}
// Perf spikes (Tim's r937 probe): every read and every autosave opened a new database connection (one more every 8 s, never
// closed), and the open's success handler ran the save's own work. The connection is opened once and kept; it is dropped
// (and opened again on the next call) when the browser closes it, another page asks to upgrade it, a call on it fails, or
// the page's indexedDB is a different one (tests swap it).
// Save hide fix (941 review): every call goes through dbCall, so any failure (an error, an abort, an exception, a closed
// connection) drops the cached connection and the next call opens a new one. A call on a connection that died without a
// `close` event (the transaction cannot even be created) is retried once on a fresh connection before it counts as failed.
// An open or a transaction that never answers is given up after SAVE_IO.stallMs (the transaction aborted, the connection
// dropped), so one hung call cannot stall the write queue: the failed autosave then forgets its delta base and the next
// write is whole and sweeps, as after any failure. An open that fails (even by throwing at once) is never kept.
export const SAVE_IO = { stallMs: 30000 }; // a generous bound; a slow phone's largest write takes a few seconds
let dbOpen=null,dbFactory=null;
function dropDb(which=dbOpen){if(!which||dbOpen!==which)return;dbOpen=null;dbFactory=null;which.then((db)=>{try{db.close?.()}catch{}},()=>{})}
function openDb(){if(dbOpen&&dbFactory===globalThis.indexedDB)return dbOpen;dbFactory=globalThis.indexedDB;const opening=dbOpen=new Promise((resolve,reject)=>{let done=false;const fail=(error)=>{if(done)return;done=true;clearTimeout(timer);reject(error)},timer=setTimeout(()=>fail(new Error("The journey store did not open in time.")),SAVE_IO.stallMs);try{const q=globalThis.indexedDB.open(DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};q.onsuccess=()=>{const db=q.result;if(done){try{db.close?.()}catch{}return}done=true;clearTimeout(timer);try{db.onclose=()=>{if(dbOpen===opening)dbOpen=null};db.onversionchange=()=>{if(dbOpen===opening)dbOpen=null;try{db.close()}catch{}}}catch{}resolve(db)};q.onerror=()=>fail(q.error)}catch(error){fail(error)}});opening.catch(()=>{if(dbOpen===opening){dbOpen=null;dbFactory=null}});return opening}
// One transaction: body(store, finish, fail) queues its requests; the call settles when the transaction completes (with
// what body passed to finish, if anything) or as soon as body calls finish or fail (a read answers at its request's success).
function txDone(tx,body){return new Promise((resolve,reject)=>{let done=false,result;const finish=(ok,value)=>{if(done)return;done=true;clearTimeout(timer);if(ok)resolve(value);else reject(value)},timer=setTimeout(()=>{try{tx.abort?.()}catch{}finish(false,new Error("The journey store stopped answering."))},SAVE_IO.stallMs);tx.oncomplete=()=>finish(true,result);tx.onerror=()=>finish(false,tx.error||new Error("The journey store failed."));tx.onabort=()=>finish(false,tx.error||new Error("The journey store aborted a write."));try{body(tx.objectStore(STORE),(value)=>finish(true,value),(error)=>finish(false,error))}catch(error){try{tx.abort?.()}catch{}finish(false,error)}})}
async function dbCall(mode,body){for(let attempt=0;;attempt++){const opening=openDb(),db=await opening;let tx;try{tx=db.transaction(STORE,mode)}catch(error){dropDb(opening);if(attempt===0)continue;throw error}try{return await txDone(tx,body)}catch(error){dropDb(opening);throw error}}}
function read(key){return dbCall("readonly",(store,finish,fail)=>{const q=store.get(key);q.onsuccess=()=>finish(q.result);q.onerror=()=>fail(q.error)})}
function write(key,value){return dbCall("readwrite",(store)=>{store.put(value,key)})}
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
  const { [AREA_SPLIT]: _listed, [MAIN_STAMP]: _stamp, [AREA_SIZES]: _sizes, [PACKED_FROM]: _from, [STORED_SIZE]: _stored, [MAIN_PARTS]: _parts, ...session } = main.session;
  return { ...main, session: { ...session, areas } };
}
// Slimmer saves (Tim, 2026-11-27: his 42-hour journey stores ~15 MB, 12 MB of it 1,825 area records, growing with every
// section, and each boot reads them all). Areas the Wayfarer has left are stored in packs: each area key falls in one of
// PACKED_AREAS.buckets buckets (areaBucket, pinned by the format), and a bucket's areas are kept together as their JSON,
// deflated by the browser's CompressionStream, in one record `${key}::pack::<bucket>`. Tim's areas: 10.9 MB of records
// become ~1.3 MB in 256 packs.
// Lossless by construction, not by trust: an area goes into a pack only when JSON can carry it exactly (plain objects and
// dense arrays; undefined, NaN, the infinities and -0 travel as a list of their paths), and a pack is written only when
// unpacking it gives back every area with the same keys in the same order and every value (Object.is). Anything else
// stays a plain record, as before. Reading unpacks, so the journey in memory, an export, a recovery copy and the mirror
// are exactly what they were.
// Which records hold an area: an area written by this save (it changed: the one the Wayfarer is in changes every save) is
// a plain record, as before (a cheap copy, no stream). A later write that finds it unchanged packs its bucket, up to
// `packsPerWrite` buckets a write, so a journey stored before this is packed over a few minutes of play, never in one
// long write. A plain record wins over a pack's copy of the same area (an area written plain after it was packed); a
// bucket packed again drops such copies. The save made as the page hides (urgent) packs nothing, so it is never held up.
// Older builds cannot read packs, so a main record whose journey has any is stored with `version` PACKED_AREAS.storeVersion
// (the journey's own under session[PACKED_FROM]): an older build lists and keeps it as "saved by a newer release" and
// never writes over it (release 734), where it would otherwise read those areas as missing. The schema stays 14: only
// the stored main record carries the marker, and reading takes it off. A pack this build cannot read (unknown format or
// codec, a failed checksum) fails the whole read, like a delta that cannot be read: the slot is blocked, never written over.
export const PACKED_AREAS = Object.freeze({ tag: "ic:areaPack", format: 1, codec: "deflate", buckets: 256, storeVersion: 1014, packsPerWrite: 8, minChars: 1024 });
export const PACKED_FROM = "packedFrom";
const packPrefix = (key) => `${key}::pack::`;
const packRange = (key) => IDBKeyRange.bound(packPrefix(key), packPrefix(key) + "￿");
// areaBucket(areaKey): FNV-1a of the key, modulo the bucket count (part of the format: never change it for format 1).
export function areaBucket(areaKey, n = PACKED_AREAS.buckets) { const t = String(areaKey); let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) % n; }
const bucketMemo = new Map(); // areaKey -> bucket (cleared when large; keys are strings, so this is only a memo)
const bucketOf = (k) => { let b = bucketMemo.get(k); if (b === undefined) { if (bucketMemo.size > 50000) bucketMemo.clear(); b = areaBucket(k); bucketMemo.set(k, b); } return b; };
const PACK_SPECIALS = Object.freeze([undefined, NaN, Infinity, -Infinity, -0]);
const specialCode = (v) => v === undefined ? 0 : typeof v !== "number" ? -1 : v !== v ? 1 : v === Infinity ? 2 : v === -Infinity ? 3 : v === 0 && 1 / v < 0 ? 4 : -1;
export const canPackAreas = () => typeof CompressionStream === "function" && typeof DecompressionStream === "function" && typeof Blob === "function" && typeof Response === "function";
// scanExact(v, path, specials, open): whether JSON (with the specials listed) carries v exactly; open holds the objects on
// the path (a cycle is refused). A key "__proto__" is refused (restoring a special under it would set a prototype).
function scanExact(v, path, specials, open) {
  const code = specialCode(v); if (code >= 0) { specials.push([path.slice(), code]); return true; }
  if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return true;
  if (typeof v !== "object" || open.has(v)) return false;
  open.add(v); let ok = true;
  if (Array.isArray(v)) { if (Object.keys(v).length !== v.length) ok = false; else for (let i = 0; ok && i < v.length; i++) { path.push(i); ok = scanExact(v[i], path, specials, open); path.pop(); } }
  else if (!plainProto(v) || own(v, "__proto__") || Object.getOwnPropertySymbols(v).length) ok = false;
  else for (const k of Object.keys(v)) { path.push(k); ok = scanExact(v[k], path, specials, open); path.pop(); if (!ok) break; }
  open.delete(v); return ok;
}
// sameExact(a, b): the same value, key order and leaves (Object.is), for what scanExact admits.
function sameExact(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!sameExact(a[i], b[i])) return false; return true; }
  const ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i] || !sameExact(a[ka[i]], b[ka[i]])) return false;
  return true;
}
const asNull = (_k, v) => specialCode(v) >= 0 ? null : v;
async function streamBytes(bytes, transform) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer()); }
export const isAreaPack = (r) => !!r && typeof r === "object" && !Array.isArray(r) && own(r, PACKED_AREAS.tag);
// unpackAreas(pack): Map areaKey -> area. Throws for a pack this build cannot read.
export async function unpackAreas(pack, P = PACKED_AREAS) {
  if (!isAreaPack(pack) || pack[P.tag] !== P.format || pack.codec !== P.codec || !(pack.data instanceof Uint8Array) || typeof DecompressionStream !== "function") throw new Error("Stored areas are in a form this build cannot read. They have been kept unchanged.");
  const { k, a, s } = JSON.parse(new TextDecoder().decode(await streamBytes(pack.data, new DecompressionStream(pack.codec))));
  if (!Array.isArray(k) || !Array.isArray(a) || !Array.isArray(s) || k.length !== a.length) throw new Error("A stored area pack is damaged. It has been kept unchanged.");
  for (const q of s) { const parent = q[0], value = PACK_SPECIALS[q[1]]; let o = a; for (let i = 0; i < parent.length; i++) o = o[parent[i]]; for (let i = 2; i < q.length; i++) o[q[i]] = value; }
  return new Map(k.map((key, i) => [String(key), a[i]]));
}
// packAreas(entries, seed): { pack, packed, refused }: the pack of the entries ([areaKey, area]) JSON carries exactly (null
// when none, or when unpacking it did not give every one back exactly: then all are refused).
export async function packAreas(entries, seed = "", P = PACKED_AREAS) {
  const keys = [], areas = [], specials = [], refused = [];
  if (!canPackAreas()) return { pack: null, packed: [], refused: entries.map(([k]) => k) };
  // specials travel grouped: [parent path, code, key, key...] for each run of one code under one parent
  for (const [k, area] of entries) { const sp = []; if (area && typeof area === "object" && !Array.isArray(area) && scanExact(area, [areas.length], sp, new Set())) { keys.push(k); areas.push(area); let last = null; for (const [path, code] of sp) { const key = path.pop(); if (last && last[1] === code && sameExact(last[0], path)) last.push(key); else specials.push(last = [path, code, key]); } } else refused.push(k); }
  if (!keys.length) return { pack: null, packed: [], refused };
  try {
    const pack = { [P.tag]: P.format, codec: P.codec, seed: String(seed ?? ""), data: await streamBytes(new TextEncoder().encode(JSON.stringify({ k: keys, a: areas, s: specials }, asNull)), new CompressionStream(P.codec)) };
    const back = await unpackAreas(pack, P);
    if (back.size === keys.length && keys.every((k, i) => sameExact(back.get(k), areas[i]))) return { pack, packed: keys, refused };
  } catch {}
  return { pack: null, packed: [], refused: entries.map(([k]) => k) };
}
// Main-record split (Tim, 2026-11-27: "write only what changed"). Between whole writes the main record is stored as a delta,
// but every SAVE_DELTA.everyMs it was written whole: 2.9 MB for Tim's journey, ~11 MB at ~5,000 sections, nearly all of it
// six ever-growing collections. When a collection holds at least `minEntries` entries (or held half that and was already
// split), a whole write stores it apart: a map's entries fall in `buckets` buckets by key (areaBucket) and a list's in
// chunks of `chunk`, each bucket one record `${key}::part::<name>::<bucket>` written only when one of its entries' copies
// changed (by identity: snapshotSave shares unchanged parts; a delta read back marks the buckets it edits in place). The
// main record keeps null in the collection's place and, under session[MAIN_PARTS], each split collection's entry count
// (and a map's next sequence number). A map entry carries its sequence number, so the map comes back in its key order;
// an order the numbers cannot express (a key re-added in the middle) numbers the whole map again.
// A bucket record is the area-pack codec over { e: [[key, seq, value], ...] } (deflated and checked exact), or that object
// plain where it cannot be packed. Reading puts every collection back before the delta is applied, so the journey, the
// listing, an export, the mirror and recovery copies are what they were; a bucket missing, unreadable, or not adding up
// to the stored count fails the whole read (the slot is blocked, never written over). A split main record carries the
// same PACKED_AREAS.storeVersion marker as packs, so older builds keep it as "saved by a newer release".
export const MAIN_SPLIT = Object.freeze({ buckets: 32, chunk: 128, minEntries: 256, parts: Object.freeze([
  Object.freeze({ name: "dungeons", path: Object.freeze(["consequences", "dungeons"]) }),
  Object.freeze({ name: "atlas", path: Object.freeze(["atlas"]) }),
  Object.freeze({ name: "kills", path: Object.freeze(["killLedger", "areas"]) }),
  Object.freeze({ name: "journal", path: Object.freeze(["narrative", "journal"]), list: true }),
  Object.freeze({ name: "awarded", path: Object.freeze(["perception", "awarded"]) }),
  Object.freeze({ name: "flags", path: Object.freeze(["worldFlags"]) }),
]) });
export const MAIN_PARTS = "mainParts", STORED_SIZE = "storedSize";
const partPrefix = (key) => `${key}::part::`;
const partRange = (key) => IDBKeyRange.bound(partPrefix(key), partPrefix(key) + "￿");
const partRecordKey = (key, name, b) => `${partPrefix(key)}${name}::${b}`;
const partMemo = new Map();
const partBucketOf = (k) => { let b = partMemo.get(k); if (b === undefined) { if (partMemo.size > 50000) partMemo.clear(); b = areaBucket(k, MAIN_SPLIT.buckets); partMemo.set(k, b); } return b; };
const getIn = (o, path) => { for (const k of path) { if (!o || typeof o !== "object") return undefined; o = o[k]; } return o; };
// withPath(o, path, v): o with v at path, copying (never editing) each object along it.
const withPath = (o, path, v) => path.length ? { ...o, [path[0]]: withPath(o?.[path[0]], path.slice(1), v) } : v;
const PART_TAG = "ic:partPack";
// What can be split: a plain map without the pack tag, or a dense plain array; how many entries (stops counting at `cap`).
function partCount(c, list, cap = Infinity) {
  if (list) return Array.isArray(c) && Object.getPrototypeOf(c) === Array.prototype && Object.keys(c).length === c.length ? c.length : -1;
  if (!isPlainObject(c)) return -1; let n = 0; for (const _k in c) if (++n >= cap) break; return n;
}
const partState = new Map(); // journey key -> Map name -> { next, seqOf, buckets: Map b -> { keys, refs, seqs }, sizes: Map b -> stored size, dirty: Set b }
const freshPart = () => ({ next: 0, seqOf: new Map(), buckets: new Map(), sizes: new Map(), dirty: new Set() });
function splitWanted(main, states) {
  const out = new Map();
  for (const P of MAIN_SPLIT.parts) { const c = getIn(main, P.path), was = !!states?.get(P.name)?.buckets.size, n = partCount(c, P.list, MAIN_SPLIT.minEntries); if (n >= MAIN_SPLIT.minEntries || (was && n >= MAIN_SPLIT.minEntries / 2)) out.set(P.name, c); }
  return out;
}
// planParts: each split collection's buckets now, which changed since they were stored, and the main record without them.
function planParts(main, wanted, states) {
  const plans = []; let core = main; const meta = {};
  for (const P of MAIN_SPLIT.parts) {
    if (!wanted.has(P.name)) continue;
    const c = wanted.get(P.name), st = states?.get(P.name) || freshPart(), now = new Map();
    let seqOf = st.seqOf, next = st.next, renumbered = false;
    if (P.list) { for (let i = 0; i < c.length; i++) { const b = Math.floor(i / MAIN_SPLIT.chunk); let e = now.get(b); if (!e) now.set(b, e = { keys: [], refs: [], seqs: [] }); e.keys.push(i); e.refs.push(c[i]); e.seqs.push(0); } }
    else {
      let last = -1, fresh = false; for (const k in c) { const q = seqOf.get(k); if (q === undefined) fresh = true; else if (fresh || q <= last) { renumbered = true; break; } else last = q; }
      if (renumbered) { seqOf = new Map(); next = 0; }
      const nextOf = new Map(); for (const k in c) { let q = seqOf.get(k); if (q === undefined) q = next++; nextOf.set(k, q); const b = partBucketOf(k); let e = now.get(b); if (!e) now.set(b, e = { keys: [], refs: [], seqs: [] }); e.keys.push(k); e.refs.push(c[k]); e.seqs.push(q); }
      seqOf = nextOf;
    }
    const changed = []; for (const [b, e] of now) { const was = st.buckets.get(b); if (renumbered || st.dirty.has(b) || !was || was.keys.length !== e.keys.length || e.keys.some((k, i) => k !== was.keys[i] || !Object.is(e.refs[i], was.refs[i]) || e.seqs[i] !== was.seqs[i])) changed.push(b); }
    plans.push({ P, now, changed, seqOf, next, sizes: new Map([...st.sizes].filter(([b]) => now.has(b))) });
    meta[P.name] = P.list ? { count: c.length } : { count: now.size ? [...now.values()].reduce((n, e) => n + e.keys.length, 0) : 0, next };
    core = withPath(core, P.path, null);
  }
  return { plans, core, meta };
}
async function partRecord(e, seed, urgent = false) { // an urgent (hide) save stores its buckets plain, so it is never held up
  const value = { e: e.keys.map((k, i) => [k, e.seqs[i], e.refs[i]]) }, { pack } = urgent ? { pack: null } : await packAreas([["e", value]], seed);
  return pack ? { [PART_TAG]: 1, pack } : { [PART_TAG]: 1, plain: value };
}
async function openPart(record) {
  if (!record || typeof record !== "object" || record[PART_TAG] !== 1) throw new Error("A stored part of this journey is in a form this build cannot read. It has been kept unchanged.");
  const value = record.pack ? (await unpackAreas(record.pack)).get("e") : record.plain;
  if (!value || !Array.isArray(value.e)) throw new Error("A stored part of this journey is damaged. It has been kept unchanged.");
  return value.e;
}
// Puts each split collection back into the main record read (records: Map partRecordKey -> record); returns the state the
// next whole write compares with. Throws when a collection does not add up.
async function assembleParts(key, main, records) {
  const meta = main.session[MAIN_PARTS], states = new Map(), seed = String(main.seed ?? "");
  for (const P of MAIN_SPLIT.parts) {
    const m = meta[P.name]; if (!m) continue;
    const pre = `${partPrefix(key)}${P.name}::`, mine = [...records].filter(([k]) => k.startsWith(pre)), st = freshPart();
    const opened = await Promise.all(mine.map(([, r]) => openPart(r)));
    const all = []; mine.forEach(([k, r], i) => { const b = Number(k.slice(pre.length)); st.sizes.set(b, r.pack ? r.pack.data.length : jsonLength(r.plain)); for (const q of opened[i]) all.push([q[0], q[1], q[2], b]); });
    if (all.length !== m.count) throw new Error(`A stored part of this journey (${P.name}) is incomplete. It has been kept unchanged.`);
    let c;
    if (P.list) { c = new Array(m.count); const seen = new Set(); for (const [i, , v] of all) { if (!Number.isInteger(i) || i < 0 || i >= m.count || seen.has(i)) throw new Error(`A stored part of this journey (${P.name}) is damaged. It has been kept unchanged.`); seen.add(i); c[i] = v; } }
    else { all.sort((a, b) => a[1] - b[1]); c = {}; for (const [k, q, v] of all) { if (own(c, k) || k === "__proto__") throw new Error(`A stored part of this journey (${P.name}) is damaged. It has been kept unchanged.`); c[k] = v; st.seqOf.set(k, q); } st.next = Number(m.next) || 0; }
    for (const [k, q, v, b] of all) { let e = st.buckets.get(b); if (!e) st.buckets.set(b, e = { keys: [], refs: [], seqs: [] }); e.keys.push(k); e.refs.push(v); e.seqs.push(q); }
    if (P.list) for (const e of st.buckets.values()) { const order = e.keys.map((_, i) => i).sort((x, y) => e.keys[x] - e.keys[y]); for (const f of ["keys", "refs", "seqs"]) e[f] = order.map((i) => e[f][i]); }
    const parent = getIn(main, P.path.slice(0, -1)); if (!parent || typeof parent !== "object") throw new Error(`A stored part of this journey (${P.name}) has no place. It has been kept unchanged.`);
    parent[P.path[P.path.length - 1]] = c; states.set(P.name, st);
  }
  delete main.session[MAIN_PARTS];
  return states;
}
// A delta read back edits entries in place (a set below an entry, an append to an entry's list): their buckets are written
// again by the next whole write.
function markDeltaParts(states, ops) {
  if (!states) return;
  for (const [path, kind] of ops) { if (!Array.isArray(path)) continue; for (const P of MAIN_SPLIT.parts) { const st = states.get(P.name), d = P.path.length; if (!st || path.length <= d || !P.path.every((k, i) => path[i] === k)) continue; if (path.length > d + 1 || kind === "add") st.dirty.add(P.list ? Math.floor(Number(path[d]) / MAIN_SPLIT.chunk) : partBucketOf(String(path[d]))); } }
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
    for (let i = 0; i < n; i++) { const x = v[i], c = x === null || typeof x !== "object" ? x : shareCopy(x, p && i < p.length ? p[i] : undefined); if (out) out[i] = c; else if (!Object.is(c, p[i])) { out = new Array(n); for (let j = 0; j < i; j++) out[j] = p[j]; out[i] = c; } }
    return out || p;
  }
  if (!plainProto(v)) return structuredClone(v); // nothing but plain objects and arrays is shared
  // Perf spikes (Tim's r937 probe: 20-30 ms autosave frames): the walk of an unchanged part allocates nothing (for...in, not
  // Object.keys, which made an array for every object of a journey's ~100k on every autosave). Same result as before:
  // the previous copy when every key and value matches, else a new object in v's key order sharing what did not change.
  const pc = prev && typeof prev === "object" ? keyCounts.get(prev) : undefined, p = pc === undefined ? null : prev; let out = p ? null : {}, n = 0;
  for (const k in v) { n++; const x = v[k], pk = p ? p[k] : undefined, had = pk !== undefined || (!!p && own(p, k)), c = x === null || typeof x !== "object" ? x : shareCopy(x, had ? pk : undefined); if (out) out[k] = c; else if (!had || !Object.is(c, pk)) { out = {}; for (const j in v) { if (j === k) break; out[j] = p[j]; } out[k] = c; } }
  if (!out) { if (pc === n) return p; out = {}; for (const k in v) out[k] = p[k]; } // the same values, but the copy held more keys
  keyCounts.set(out, n); return out;
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
  if (delta.stored && typeof delta.stored === "object") main.session[STORED_SIZE] = delta.stored;
  return true;
}
// What each journey key holds in the database now (areaKey -> the copy written), so an autosave knows what changed.
const storedAreas = new Map();
const storedSizes = new Map(); // journey key -> Map areaKey -> characters of its stored record
const recordKeys = new Map(); // journey key -> the area keys whose records it holds now (after this page's last write or read)
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
// A task of its own: the autosave's frame has already done the snapshot; this split, diff and the database's copy run after
// that frame (the open's success event did this when every write opened the database afresh).
// Save hide fix (941 review): a hidden page throttles that timer (about a second), and the OS may kill a backgrounded app
// in that window, so the save made as the page hides (saveGame(save, { urgent: true })), or any save while the page is
// hidden, is written at once; an urgent save also ends a wait already under way.
let hurry = null;
const nextTask = () => new Promise((resolve) => { const go = () => { clearTimeout(t); if (hurry === go) hurry = null; resolve(); }, t = setTimeout(go, 0); hurry = go; });
const urgentSnapshots = new WeakSet();
const writeNow = (value) => urgentSnapshots.has(value) || globalThis.document?.hidden === true;
// Slimmer saves: what this page knows of each journey's stored areas (from its last write or read): which areas a pack
// holds (areaKey -> bucket; every other listed area has a plain record), and whether the stored main record carries
// PACKED_AREAS.storeVersion. Area copies that could not be packed are not tried again while unchanged.
const packedIn = new Map(), gatedKeys = new Set(), unpackable = new WeakSet(), packSizes = new Map(), coreSizes = new Map();
// The buckets this write packs again (up to packsPerWrite, none for an urgent write): those holding an area stored plain
// that this write leaves as it is. Each takes every listed area of its bucket this write does not put (pre-publish review
// of 1085: a pack never leaves out an area another page may have packed there). A bucket is chosen only for an area of
// at least minChars of JSON; a bucket of small areas alone stays plain.
async function packBuckets(value, keys, putting, held, sizes, P = PACKED_AREAS) {
  const areas = value.session.areas, chosen = new Set(), packable = (k) => !putting.has(k) && !!areas[k] && typeof areas[k] === "object" && !unpackable.has(areas[k]);
  for (const k of keys) { if (chosen.size >= P.packsPerWrite) break; if (!held.has(k) && packable(k) && sizes.get(k) >= P.minChars) chosen.add(bucketOf(k)); }
  if (!chosen.size) return [];
  const members = new Map([...chosen].map((b) => [b, []]));
  for (const k of keys) { const list = members.get(bucketOf(k)); if (list && packable(k)) list.push([k, areas[k]]); }
  return Promise.all([...members].map(async ([bucket, entries]) => {
    const { pack, packed, refused } = await packAreas(entries, value.seed, P);
    for (const k of refused) unpackable.add(areas[k]);
    return { bucket, pack, packed };
  }));
}
// Pre-publish review of 1085 (blocker): what this page remembers of the store (storedAreas, packedIn, partState) can be
// wrong: a write that committed but was reported failed (the stall timer firing mid-commit), or another tab writing the
// same journey. So no write deletes a record on memory alone. A delta write deletes only plain records of areas no longer
// listed, or of areas it packs in the same transaction. A whole write's sweep reads the journey's keys and then keeps the
// store whole: a plain record goes only when its area is no longer listed or is packed in this transaction; a pack goes
// only when every listed area of its bucket keeps a plain record; a listed area found in neither is put again from the
// journey in memory; a part bucket the new main record needs and the store lacks is put (plain), and all of them are put
// again when the stored main record is not the one this page last wrote; any pack kept means the main record is put
// with the marker. A write reported failed forgets this page's memory of the journey, so the next write puts what it
// needs. Reads made for anything but loading never change this memory, and a read overlapped by a write is not adopted.
// Fourth review of 1085: two tabs can share a main stamp through a run of deltas, so the stamp alone cannot tell this page
// that another one wrote meanwhile (and packed a bucket with an area this page does not know). Every split write reads
// the record `${key}::writer` and puts a fresh page-unique id there in its own transaction; a load takes it in the same
// transaction as everything else. A delta write goes on past its plain puts only when the stored id is the one this page
// last wrote or read; otherwise it forgets and writes whole, and a whole write that finds another page's id or stamp
// puts every listed area that has no plain record and is in no pack it writes itself.
const writeEpoch = new Map(), lastStamps = new Map(), lastWriters = new Map(); // lastWriters: journey key -> the writer id this page last wrote or read (null: none stored)
const writerKey = (key) => `${key}::writer`, pageId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; let writerSeq = 0;
const bumpEpoch = (key) => writeEpoch.set(key, (writeEpoch.get(key) || 0) + 1);
function forgetStore(key) { for (const m of [storedAreas, storedSizes, journals, recordKeys, packedIn, partState, packSizes, coreSizes, lastStamps, lastWriters]) m.delete(key); gatedKeys.delete(key); }
const plainPart = (e) => ({ [PART_TAG]: 1, plain: { e: e.keys.map((k, i) => [k, e.seqs[i], e.refs[i]]) } });
async function writeJourney(key, value) {
  bumpEpoch(key); try { return await writeJourneyNow(key, value); } finally { bumpEpoch(key); }
}
async function writeJourneyNow(key, value, again = false) {
  await openDb(); const urgent = writeNow(value); if (!urgent) await nextTask(); const { main: splitMain, puts, keys } = splitSnapshot(value, storedAreas.get(key)), prefix = areaPrefix(key);
  const split = splitMain !== value, sizes = split ? sizesFor(key, value.session.areas, puts, keys) : null, live = new Set(keys);
  // Slimmer saves: where each listed area is stored after this write (a put is a plain record; a packed bucket holds its members).
  const putting = new Set(puts.map(([k]) => k)), held = new Map();
  if (split) for (const [k, b] of packedIn.get(key) || []) if (live.has(k) && !putting.has(k)) held.set(k, b);
  // A pack replaces its bucket's last one, so it is written only when it holds every area that one still held.
  const packs = split && !urgent && canPackAreas() ? (await packBuckets(value, keys, putting, held, sizes)).filter((q) => q.pack && [...held].every(([k, b]) => b !== q.bucket || q.packed.includes(k))) : [];
  const packedNow = new Set(); for (const q of packs) for (const k of q.packed) { held.set(k, q.bucket); packedNow.add(k); }
  const plainNow = new Set(keys.filter((k) => !held.has(k))), states = partState.get(key), wanted = split ? splitWanted(splitMain, states) : new Map(), gate = held.size > 0 || wanted.size > 0;
  const j = journals.get(key), now = Date.now();
  let ops = null, main = splitMain;
  if (split && j && sharedSnapshots.has(value) && sharedSnapshots.has(j.snapshot) && now - j.at < SAVE_DELTA.everyMs && (!gate || gatedKeys.has(key))) { // the first pack goes with a marked main record
    ops = new Map(j.ops); diffSnapshots(j.snapshot, value, [], ops);
    let w = 0; for (const op of ops.values()) w += op.w; if (w > SAVE_DELTA.weight) ops = null;
  }
  const stamp = ops ? j.stamp : `${now.toString(36)}-${(++stampSeq).toString(36)}`;
  if (split && !ops) Object.assign(main.session, { [MAIN_STAMP]: stamp, [AREA_SIZES]: Object.fromEntries(sizes) });
  // Main-record split: a whole write stores each split collection's changed buckets and leaves it out of the main record.
  let plan = null, partPuts = [];
  if (split && !ops && wanted.size) {
    plan = planParts(main, wanted, states); main = plan.core; main.session[MAIN_PARTS] = plan.meta;
    partPuts = (await Promise.all(plan.plans.flatMap((q) => q.changed.map(async (b) => [q, b, await partRecord(q.now.get(b), value.seed, urgent)])))).map(([q, b, r]) => { q.sizes.set(b, r.pack ? r.pack.data.length : jsonLength(r.plain)); return [partRecordKey(key, q.P.name, b), r]; });
  }
  // Stored size (what the journey takes in the database, compressed parts counted as stored), for the journey list.
  const packBytes = packSizes.get(key) || new Map(); for (const q of packs) packBytes.set(q.bucket, q.pack.data.length);
  const used = new Set(held.values()); for (const b of [...packBytes.keys()]) if (!used.has(b)) packBytes.delete(b);
  let partBytes = 0; if (plan) { for (const q of plan.plans) for (const n of q.sizes.values()) partBytes += n; } else if (ops && states) { for (const st of states.values()) for (const n of st.sizes.values()) partBytes += n; }
  let plainChars = 0; if (sizes) for (const k of plainNow) plainChars += Number(sizes.get(k)) || 0;
  let packTotal = 0; for (const n of packBytes.values()) packTotal += n;
  const deltaOps = ops ? [...ops.values()].map((q) => [q.path, q.kind, q.value]) : null, stored = { core: ops ? coreSizes.get(key) || 0 : 0, delta: deltaOps ? jsonLength(deltaOps) : 0, plain: plainChars, packs: packTotal, parts: partBytes };
  if (split && !ops) { stored.core = jsonLength(main); main.session[STORED_SIZE] = stored; }
  const marked = split && !ops ? { ...main, version: PACKED_AREAS.storeVersion, session: { ...main.session, [PACKED_FROM]: main.version } } : null;
  if (split && !ops && gate) main = marked;
  let queuedMs = 0, wrote = null, heldAfter = held, plainAfter = plainNow, gatedAfter = !!(split && gate), verified = true;
  const had0 = ops ? recordKeys.get(key) : null;
  try {
    await dbCall("readwrite", (store) => {
      // Second review of 1085 (blocker): a delta write builds on the stored main record this page last wrote. When it
      // packs or deletes anything, it reads that record first in the same transaction and goes on only when its stamp is
      // the one this page wrote and (to put packs) it carries the marker; otherwise it stops after the plain puts, which
      // are always safe, and the journey is written again whole (another tab, a rename or an import replaced the record).
      const t0 = performance.now(), dead = ops && had0 ? had0.filter((k) => !live.has(k)) : null, needsBase = !!ops && (packs.length > 0 || !had0 || dead.length > 0);
      const wq = split ? store.get(writerKey(key)) : null, prior = split && (!ops || needsBase) ? store.get(key) : null, writerId = `${pageId}-${++writerSeq}`;
      const mineStill = () => lastWriters.has(key) && (wq.result ?? null) === lastWriters.get(key);
      for (const [k, area] of puts) store.put(area, prefix + k);
      const rest = () => {
      if (split) { store.put(writerId, writerKey(key)); wrote = writerId; }
      for (const q of packs) store.put(q.pack, packPrefix(key) + q.bucket);
      for (const [k, r] of partPuts) store.put(r, k);
      if (ops) store.put({ base: stamp, areas: keys, sizes: Object.fromEntries(sizes), stored, ops: deltaOps }, deltaKey(key));
      else { store.put(main, key); store.delete(deltaKey(key)); }
      // Perf spikes: the stale area records are known from the last write (or the load) of this journey, so a delta write
      // deletes those no longer listed without reading back every area key (~1,700 in a mature journey, every 8 s); a full
      // write, or a journey this page has not written or read yet, still sweeps the store. Slimmer saves: an area now in a
      // pack loses its plain record the same way, and the sweep (one read of the journey's keys) also removes the packs
      // that hold nothing listed.
      const had = had0;
      if (had) { for (const k of had) if (!live.has(k)) store.delete(prefix + k); for (const k of packedNow) store.delete(prefix + k); }
      else {
        const pre = packPrefix(key), partPre = partPrefix(key), stale = store.getAllKeys(IDBKeyRange.bound(`${key}::`, `${key}::￿`));
        stale.onsuccess = () => {
          const plainThere = new Set(), packsThere = new Set(), partsThere = new Set();
          for (const k of stale.result) { const t = String(k); if (t.startsWith(prefix)) plainThere.add(t.slice(prefix.length)); else if (t.startsWith(pre)) packsThere.add(Number(t.slice(pre.length))); else if (t.startsWith(partPre)) partsThere.add(t); }
          const plainKept = new Set(putting), written = new Set(packs.map((q) => q.bucket));
          for (const k of plainThere) { if (!live.has(k) || packedNow.has(k)) store.delete(prefix + k); else plainKept.add(k); }
          const needed = new Set(); for (const k of keys) if (!plainKept.has(k)) needed.add(bucketOf(k));
          const foreignStore = !ops && (!mineStill() || !lastStamps.has(key) || prior?.result?.session?.[MAIN_STAMP] !== lastStamps.get(key)); let packKept = written.size > 0;
          for (const b of packsThere) { if (written.has(b) || needed.has(b)) packKept = true; else store.delete(pre + b); }
          for (const k of keys) { const b = bucketOf(k); if (!plainKept.has(k) && !written.has(b) && (foreignStore || !packsThere.has(b))) { const area = value.session.areas[k]; if (area !== undefined) { store.put(area, prefix + k); plainKept.add(k); } } } // found nowhere: put again
          heldAfter = new Map(); for (const k of keys) if (!plainKept.has(k)) heldAfter.set(k, bucketOf(k)); plainAfter = plainKept;
          if (!ops) {
            const want = new Map(), putNow = new Set(partPuts.map(([k]) => k)); if (plan) for (const q of plan.plans) for (const [b, e] of q.now) want.set(partRecordKey(key, q.P.name, b), e);
            for (const t of partsThere) if (!want.has(t)) store.delete(t);
            const foreign = foreignStore;
            for (const [t, e] of want) if (!putNow.has(t) && (foreign || !partsThere.has(t))) store.put(plainPart(e), t);
            if (packKept && !gatedAfter) { store.put(marked, key); gatedAfter = true; }
          }
        };
      }
      };
      if (needsBase) prior.onsuccess = () => { const m = prior.result; verified = mineStill() && !!m && lastStamps.has(key) && m.session?.[MAIN_STAMP] === lastStamps.get(key) && (!packs.length || m.version === PACKED_AREAS.storeVersion); if (verified) rest(); };
      else if (ops) wq.onsuccess = () => { verified = mineStill(); if (verified) rest(); };
      else rest();
      queuedMs = performance.now() - t0;
    });
  } catch (error) { forgetStore(key); throw error; } // dbCall dropped the connection; the next write stores the main record whole, puts every area it holds and sweeps (the write may have committed all the same)
  if (!verified) { forgetStore(key); if (!again) return writeJourneyNow(key, value, true); throw new Error("The journey was changed elsewhere while it was being saved; it will be saved whole next time."); }
  storedAreas.set(key, new Map(keys.map((k) => [k, value.session.areas[k]])));
  if (split) recordKeys.set(key, [...plainAfter]); else recordKeys.delete(key);
  if (split) packedIn.set(key, heldAfter); else packedIn.delete(key);
  if (split) lastWriters.set(key, wrote); else lastWriters.delete(key);
  if (!ops) { if (gatedAfter) gatedKeys.add(key); else gatedKeys.delete(key); lastStamps.set(key, stamp); } // a delta leaves the stored main record as it was
  if (!ops) partState.set(key, new Map(plan ? plan.plans.map((q) => [q.P.name, { next: q.next, seqOf: q.seqOf, buckets: q.now, sizes: q.sizes, dirty: new Set() }]) : []));
  packSizes.set(key, packBytes); if (!ops) coreSizes.set(key, stored.core);
  if (sizes) storedSizes.set(key, sizes); else storedSizes.delete(key);
  if (split) journals.set(key, { snapshot: value, stamp, ops: ops || new Map(), at: ops ? j.at : now }); else journals.delete(key);
  try { onWriteTiming?.({ ms: Math.round(queuedMs * 10) / 10, areas: puts.length, of: keys.length, delta: !!ops }); } catch {}
}
// The main record with its delta applied (areas still apart), or a record from before 555 as it is.
// A read of the delta that fails fails the whole read (readJourney throws, so loadSave treats the database as unreadable:
// the mirror if healthy, else the slot is blocked); a main record is never taken alone while its delta may hold newer play.
const readDeltas = new Map(); // journey key -> { stamp, ops } as last read: the base a loaded journey's next delta builds on
// readMainState(key): { main, info } -- the main record put together, and what a load would adopt of the store (the
// split parts' state, the marker, the delta read); nothing of this page's write memory changes here (review of 1085).
// The journey list reads the main record and, for a split one, reads it again with its delta and parts in one transaction.
async function readMainState(key) {
  const main = await read(key); if (!Array.isArray(main?.session?.[AREA_SPLIT])) return { main, info: null };
  if (!main.session[MAIN_PARTS]) return finishMain(key, main, await read(deltaKey(key)), new Map());
  const got = await readRecords(key, false); return finishMain(key, got.main, got.delta, got.parts);
}
// readRecords(key, areas): the main record, its delta and its parts (and, with areas, every plain area record and pack)
// in ONE transaction (third review of 1085: a reader that took the main record in one transaction and the areas in
// another could fall between a write's first packs and its marked main record, and lose those areas).
function readRecords(key, areas) {
  return dbCall("readonly", (store, finish, fail) => {
    const ranges = [["parts", partRange(key), partPrefix(key), String], ...(areas ? [["plain", areaRange(key), areaPrefix(key), String], ["packs", packRange(key), packPrefix(key), Number]] : [])];
    const m = store.get(key), d = store.get(deltaKey(key)), w = store.get(writerKey(key)), qs = ranges.map(([name, r, pre, cast]) => [name, store.getAllKeys(r), store.getAll(r), pre, cast]);
    const all = [m, d, w, ...qs.flatMap((q) => [q[1], q[2]])]; let left = all.length;
    for (const q of all) { q.onerror = () => fail(q.error); q.onsuccess = () => { if (--left) return; const out = { main: m.result, delta: d.result, writer: w.result ?? null }; for (const [name, ks, vs, pre, cast] of qs) out[name] = new Map((ks.result || []).map((k, i) => [cast(String(k).slice(name === "parts" ? 0 : pre.length)), vs.result[i]])); finish(out); }; }
  });
}
async function finishMain(key, main, delta, parts) {
  if (!Array.isArray(main?.session?.[AREA_SPLIT])) return { main, info: null };
  const states = main.session[MAIN_PARTS] ? await assembleParts(key, main, parts) : null;
  const core = Number(main.session[STORED_SIZE]?.core) || 0, stamp = main.session[MAIN_STAMP], applied = applyDelta(main, delta);
  if (applied && Array.isArray(delta.ops)) markDeltaParts(states, delta.ops);
  // Slimmer saves: the marker that keeps older builds off a journey with packed areas comes off here (one without the
  // journey's own version under it stays as it is, and so reads as damaged).
  const from = main.session[PACKED_FROM]; let gated = false;
  if (main.version === PACKED_AREAS.storeVersion && (typeof from === "number" || typeof from === "string")) { main.version = from; delete main.session[PACKED_FROM]; gated = true; }
  return { main, info: { states: states || new Map(), core, stamp, gated, delta: { stamp, ops: applied && Array.isArray(delta.ops) ? delta.ops : [] } } };
}
// The main record with its delta applied (areas still apart), or a record from before 555 as it is (the journey list).
async function readMain(key) { return (await readMainState(key)).main; }
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
// readJourney(key, adopt): the journey put back together. Only a load (adopt) takes what it read as this page's memory
// of the store, and only when no write of this journey overlapped the read (review of 1085).
async function readJourney(key, adopt = false) {
  const epoch = writeEpoch.get(key) || 0, got = await readRecords(key, true), { main, info } = await finishMain(key, got.main, got.delta, got.parts);
  if (!Array.isArray(main?.session?.[AREA_SPLIT])) { if (adopt && (writeEpoch.get(key) || 0) === epoch) { forgetStore(key); readDeltas.delete(key); } return main; }
  // Slimmer saves: main record, delta, parts, plain area records and packs all come from one transaction; a listed area
  // without a plain record is taken from its bucket's pack (a pack carrying another journey's seed is not this journey's),
  // and a pack that cannot be read fails the whole read. Packs holding nothing listed are left unread. A listed area found
  // nowhere is absent, as a missing area record always was (release 555).
  const records = got.plain, packs = got.packs;
  const plain = [...records.keys()], held = new Map(), seed = String(main.seed ?? ""), foreign = (p) => isAreaPack(p) && p.seed !== seed;
  // Sixth review of 1085 (blocker): an unmarked main record is not proof the packs are stale. An older build's page left
  // open on the journey writes it whole and unmarked after this build packed areas (and deleted their plain records), and
  // lists those areas still; they live only in the packs. So the packs are read whatever the marker says: a plain record
  // still wins, and a pack carrying another seed is never taken. A stale pack of the same seed cannot fill in: every
  // writer puts a plain record for an area it lists unless it believes one is stored, and only a write that packs an
  // area into a new pack of its bucket (in the same transaction) deletes a listed area's plain record. Areas taken from a
  // pack are held, so the next write is whole and marked again.
  const buckets = [...new Set(main.session[AREA_SPLIT].filter((k) => !records.has(k)).map(bucketOf))].filter((b) => packs.has(b) && !foreign(packs.get(b)));
  const opened = await Promise.all(buckets.map((b) => unpackAreas(packs.get(b))));
  for (let i = 0; i < buckets.length; i++) for (const [k, area] of opened[i]) if (!records.has(k) && bucketOf(k) === buckets[i]) { records.set(k, area); held.set(k, buckets[i]); }
  const adopted = adopt && (writeEpoch.get(key) || 0) === epoch;
  if (adopted) {
    forgetStore(key); recordKeys.set(key, plain); packedIn.set(key, held); packSizes.set(key, new Map(buckets.map((b) => [b, packs.get(b).data.length])));
    lastWriters.set(key, got.writer); partState.set(key, info.states); coreSizes.set(key, info.core); if (info.gated) gatedKeys.add(key); if (typeof info.stamp === "string") lastStamps.set(key, info.stamp); readDeltas.set(key, info.delta);
    const sizes = main.session[AREA_SIZES]; if (sizes && typeof sizes === "object") storedSizes.set(key, new Map(Object.entries(sizes).filter(([k, n]) => records.has(k) && Number.isFinite(n))));
  } else if (adopt) readDeltas.delete(key);
  const save = assembleSave(main, records); if (adopted) assembled.add(save); return save; // a save not adopted is written as new (every area put)
}
async function removeJourney(key) {
  try { await dbCall("readwrite", (store) => { store.delete(key); store.delete(deltaKey(key)); store.delete(writerKey(key)); store.delete(areaRange(key)); store.delete(packRange(key)); store.delete(partRange(key)); }); }
  finally { bumpEpoch(key); forgetStore(key); } // after a failure too: the next write is whole and sweeps
}
function remove(key){return dbCall("readwrite",(store)=>{store.delete(key)})}
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
export async function loadSave(){activeSlot=getActiveSlot();try{await migrateLegacy()}catch(error){console.warn("Legacy save migration failed",error)}let stored=null,dbFailed=false;try{stored=await readJourney(slotKey(activeSlot),true)}catch(error){dbFailed=true;console.warn("IndexedDB load failed",error)}const mirrored=mirrorRead(activeSlot),fromDb=stored?validateJourney(stored):{health:"empty",save:null},fromMirror=mirrored?validateJourney(mirrored):{health:"empty",save:null};
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
  // Progression Phase 2: an empty slot (the first journey on a device) starts a new journey: a random seed, start version 1 and
  // Exploration, with today's kit (it was always CINDER-VERGE-47 before).
  const chosen=choices.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]||namedFresh();
  // Release 555: a journey read from the database already has its areas stored there, so the first autosave need not write
  // them all again: each loaded area is its own stored copy until the game replaces it.
  if(chosen===fromDb.save&&assembled.has(stored)){primeStoredAreas(slotKey(activeSlot),chosen);primeJournal(slotKey(activeSlot),stored,chosen)}
  return ensureProductionTriceratops(chosen)}
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
// The Briar Stag fight stutter (Tim, 2026-11-22, r1050 probe: 37 saves in 277 s of a Briar Stag fight, each frame's persist
// phase 19-38 ms on his phone with a 17 MB journey): besides the 8 s autosave, every tap on the world (attack, act, build,
// Rift Step, Shadow Clone) and every resume saved at once. Each save walks the whole main record (snapshotSave), so in a
// fight those taps put a long frame every second or two. The autosave policy (main.ts):
// - calm play: every `every` seconds of play, as before; a save asked for by a tap or a resume (`pending`) comes `soon`
//   seconds after the last one, coalescing a burst of taps into one;
// - in a fight (a live foe within `fightReach` tiles hunting the Wayfarer), nothing until `fightEvery` seconds since the last
//   save, or the fight ends (the first calm frame then saves what is due).
// Exact resume is unchanged: the save made as the page hides (urgent) and the pause menu's save still happen at once, and
// every reward, purchase and menu choice is saved by its own call as before. A crash in a fight loses at most `fightEvery`
// seconds (a foe killed in them is still alive, its reward not yet paid, so nothing is paid twice).
export const AUTOSAVE = Object.freeze({ every: 8, soon: 1, fightEvery: 30, fightReach: 14 });
// since: seconds of play since the last save; pending: a save was asked for; fighting: called only when its answer matters.
export function autosaveDue(since, pending, fighting, A = AUTOSAVE) {
  if (!(since >= A.soon) || (!pending && !(since >= A.every))) return false;
  return fighting() ? since >= A.fightEvery : true;
}
// A live, hunting foe near the Wayfarer (a bounded scan of the area's creatures, made only when a save is due).
export function fightUnderway(game, A = AUTOSAVE) {
  const p = game?.player, list = game?.enemies; if (!p || !Array.isArray(list)) return false;
  for (let i = 0; i < list.length; i++) { const e = list[i]; if (e && !e.dead && e.aggro && !e.friendly && !(e.hp <= 0) && Math.hypot(e.x - p.x, e.y - p.y) <= A.fightReach) return true; }
  return false;
}
export function saveGame(save,options={}){const slot=getActiveSlot();if(writeBlocked.has(slot))return writeQueue=Promise.resolve();/* release 734 */ensureProductionTriceratops(save);const snapshot=snapshotSave(save);save.updatedAt=snapshot.updatedAt;if(options?.urgent){urgentSnapshots.add(snapshot);hurry?.()}/* save hide fix: written at once */writeQueue=coordinator.enqueue(slot,snapshot).then(()=>undefined,error=>{lastWriteError=error;console.warn("IndexedDB save failed",error)});return writeQueue}
// Save hide fix: a failed write is reported once (by lastWriteError), not again by the coordinator's rejected chain.
export async function flushSaves(){await Promise.all([writeQueue,coordinator.flush().catch(()=>{})]);if(lastWriteError){const error=lastWriteError;lastWriteError=null;throw error}}
export function createExclusiveOperation(){let busy=false;return{get busy(){return busy},async run(operation){if(busy)return{ok:false,busy:true};busy=true;try{return{ok:true,value:await operation()}}finally{busy=false}}}}
export async function commitNewJourneyTransition({activeSlot,targetSlot,targetEmpty,options,saveCurrent,flush=flushSaves,create=createJourney,activate=setActiveSlot}){if(activeSlot!==targetSlot||!targetEmpty)await saveCurrent();await flush();const created=await create(targetSlot,options);activate(targetSlot);return created}
// Perf pack (Tim's findings 8): listing the journeys (Options -> Journeys, Options -> System) read every slot whole and ran
// validateJourney (a structured clone and a migrate) and a JSON.stringify of it: about 1 s of CPU for Tim's slot, each time.
// A split journey is now listed from its main record (delta applied, areas not read) with a structural health check: a
// plain object of a supported version with a seed, a position and a level. Loading still validates it in full, and a
// slot that fails then is listed damaged (startFailed). Its size is the main record plus the stored areas' sizes.
export function journeyListing(main,slot=1){if(!Array.isArray(main?.session?.[AREA_SPLIT]))return journeyMetadata(main,slot);const unsupported=unsupportedVersion(main),missing=!main.seed||!main.position||!Number.isFinite(Number(main.level)),error=unsupported||(missing?"Required journey fields are missing":null),sizes=main.session[AREA_SIZES];let bytes=0;try{bytes=JSON.stringify({...main,session:{...main.session,[AREA_SPLIT]:null,[AREA_SIZES]:null,[STORED_SIZE]:null}}).length}catch{}if(sizes&&typeof sizes==="object")for(const n of Object.values(sizes))bytes+=Number(n)||0;const st=main.session[STORED_SIZE];let storedBytes=bytes;if(st&&typeof st==="object"){storedBytes=0;for(const n of Object.values(st))storedBytes+=Math.max(0,Number(n)||0)}/* slimmer saves: what the database holds (packs and parts compressed) */return{slot,health:error?"damaged":"healthy",empty:false,error,name:String(main.name||`Journey ${slot}`),seed:String(main.seed||"unknown"),level:Number(main.level)||1,location:main.position?.area==="dungeon"?"Dungeon":`${main.position?.rx||0}, ${main.position?.ry||0}`,updatedAt:Number(main.updatedAt)||0,explored:Object.keys(main.explored||{}).length,playSeconds:Math.max(0,Number(main.playSeconds)||0),bytes,storedBytes}}
export async function listJourneySlots(){try{await migrateLegacy()}catch{}const out=[];for(let slot=1;slot<=SLOT_COUNT;slot++){let raw=null;try{raw=await readMain(slotKey(slot))}catch{}if(!raw)raw=mirrorRead(slot);const meta=journeyListing(raw,slot);if(startFailed.has(slot)&&!meta.empty)Object.assign(meta,{health:"damaged",error:startFailed.get(slot)});/* release 734 (S4) */out.push(meta)}return out}
// A random seed for a new journey: the time and a random tail, so two journeys made together still differ.
export function randomSeed(){let tail="";try{const a=new Uint32Array(2);crypto.getRandomValues(a);tail=a[0].toString(36)+a[1].toString(36)}catch{tail=Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)}return`CORRIDOR-${Date.now().toString(36)}${tail.slice(0,6)}`.toUpperCase().slice(0,64)}
// A new journey (progression.ts startJourney): its name, its seed (typed, or random), and the creator's choices: the mode
// (Exploration unless Classic is chosen), the weapon and the tool. Every new journey is created at start version 1.
export function namedFresh(name,seed,choices={}){const save=ensureProductionTriceratops(freshSave());save.name=String(name||"Wayfarer").slice(0,40);save.seed=String(String(seed||"").trim()||randomSeed()).slice(0,64);setWayfarerBody(save,choices.body);/* the creator's body choice (journey-start.ts WAYFARER_BODY) */return startJourney(save,{mode:choices.mode,weapon:choices.weapon,tool:choices.tool})}
async function snapshotRecovery(slot,raw,checked=false){if(!raw||!checked&&validateJourney(raw).health!=="healthy")return;const previous=await read(`recovery:${slot}:1`);if(previous)await write(`recovery:${slot}:2`,previous);await write(`recovery:${slot}:1`,raw)}
export async function createJourney(slot,options={}){const current=await readJourney(slotKey(slot))||mirrorRead(slot);if(current&&!options.replace)throw new Error("That journey slot is occupied.");if(current)await snapshotRecovery(slot,current);const save=namedFresh(options.name,options.seed,options);replaced(slot);await writeJourney(slotKey(slot),save);mirrorWrite(slot,save);return journeyMetadata(save,slot)}
export async function renameJourney(slot,name){const raw=await readJourney(slotKey(slot)),valid=validateJourney(raw);if(valid.health!=="healthy")throw new Error("Only a healthy journey can be renamed.");valid.save.name=String(name||valid.save.name).slice(0,40);valid.save.updatedAt=Date.now();await writeJourney(slotKey(slot),valid.save);mirrorWrite(slot,valid.save);return journeyMetadata(valid.save,slot)}
export async function duplicateJourney(from,to){const source=await readJourney(slotKey(from)),target=await readJourney(slotKey(to)),valid=validateJourney(source);if(valid.health!=="healthy")throw new Error("Source journey is not healthy.");if(target)throw new Error("Destination slot is occupied.");const copy=ensureProductionTriceratops(structuredClone(valid.save));copy.name=`${copy.name} Copy`.slice(0,40);copy.updatedAt=Date.now();await writeJourney(slotKey(to),copy);mirrorWrite(to,copy);return journeyMetadata(copy,to)}
export async function deleteJourney(slot){const raw=await readJourney(slotKey(slot));await snapshotRecovery(slot,raw);replaced(slot);await removeJourney(slotKey(slot));try{localStorage.removeItem(mirrorKey(slot))}catch{}}
export async function exportJourney(slot){const raw=await readJourney(slotKey(slot));if(!raw)throw new Error("Journey slot is empty.");return JSON.stringify({format:"infinite-corridor-journey",formatVersion:1,slot,exportedAt:Date.now(),save:raw},null,2)}
export async function importJourney(slot,text,replace=false){const bundle=JSON.parse(text),raw=bundle?.format==="infinite-corridor-journey"?bundle.save:bundle&&typeof bundle==="object"&&bundle.save&&typeof bundle.save==="object"&&"release" in bundle?bundle.save:bundle;/* release 623 (system audit): a diagnostics file carries the journey under .save; anything without a seed and version is not a journey */if(!raw||typeof raw!=="object"||typeof raw.seed!=="string"||!Number.isFinite(Number(raw.version)))throw new Error("That file is not a journey.");const valid=validateJourney(raw);if(valid.health!=="healthy")throw new Error(valid.error||"Import is damaged.");const current=await readJourney(slotKey(slot));if(current&&!replace)throw new Error("Choose an empty slot or explicitly replace this journey.");if(current)await snapshotRecovery(slot,current);replaced(slot);ensureProductionTriceratops(valid.save);valid.save.updatedAt=Date.now();await writeJourney(slotKey(slot),valid.save);mirrorWrite(slot,valid.save);return journeyMetadata(valid.save,slot)}
export async function recoverJourney(slot){for(const index of[1,2]){const raw=await read(`recovery:${slot}:${index}`),valid=validateJourney(raw);if(valid.health==="healthy"){const damaged=await readJourney(slotKey(slot));if(damaged)await write(`damaged:${slot}:${Date.now()}`,damaged);replaced(slot);ensureProductionTriceratops(valid.save);valid.save.updatedAt=Date.now();await writeJourney(slotKey(slot),valid.save);mirrorWrite(slot,valid.save);return journeyMetadata(valid.save,slot)}}throw new Error("No healthy recovery snapshot is available.")}
// Slimmer saves: sizes as the journey list and Options -> System show them (the journey as JSON, and what storage holds).
export const sizeText=(n)=>{const v=Math.max(0,Number(n)||0);return v>=1048576?`${(v/1048576).toFixed(1)} MB`:`${Math.ceil(v/1024)} KB`};
export function journeySizeText(meta){const json=Number(meta?.bytes)||0,stored=Number(meta?.storedBytes??json)||0;return Math.abs(stored-json)<Math.max(1024,json*.05)?sizeText(json):`${sizeText(json)} journey · ${sizeText(stored)} stored`}
export async function storageReport(){const slots=await listJourneySlots();let estimate=null;try{estimate=await navigator.storage?.estimate?.()}catch{}return{slots,totalJourneyBytes:slots.reduce((n,q)=>n+q.bytes,0),totalStoredBytes:slots.reduce((n,q)=>n+(q.storedBytes??q.bytes),0),usage:estimate?.usage||null,quota:estimate?.quota||null}}
