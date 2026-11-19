import test from "node:test";
import assert from "node:assert/strict";
import { freshSave, migrateSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/save-codec.ts";
import { ensureProductionTriceratops, stableMount, startRide, defaultMount, TRICERATOPS_RIDE } from "../src/beast-mounts.ts";
import { createLabFixture } from "../src/proving-ground-labs.ts";

const normal = save => save.mounts.stable.filter(m => m.beast === "triceratops" && m.variant === "normal");
const gift = save => ensureProductionTriceratops(save);
function fakeStorage() {
  const data = new Map(), ls = new Map(), ctl = { data, ls, failRead: false, failWrite: false, setItemCalls: 0, quota: Infinity };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction() {
    const tx = { pending: 0, error: null, settled: false };
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) tx.onerror?.(); else tx.oncomplete?.(); }, 0);
    const request = (fn, kind) => { const q = {}; tx.pending++; setTimeout(() => { try { if (kind === 'read' && ctl.failRead || kind === 'write' && ctl.failWrite) throw new Error(`fake ${kind} failure`); q.result = fn(); q.onsuccess?.(); } catch (e) { q.error = tx.error = e; q.onerror?.(); } tx.pending--; settle(); }, 0); return q; };
    tx.objectStore = () => ({
      get: (k) => request(() => structuredClone(data.get(k)), 'read'),
      put: (v, k) => request(() => { data.set(k, structuredClone(v)); }, 'write'),
      delete: (k) => request(() => { for (const key of keysIn(k)) data.delete(key); }, 'write'),
      getAllKeys: (r) => request(() => keysIn(r), 'read'),
      getAll: (r) => request(() => keysIn(r).map((k) => structuredClone(data.get(k))), 'read'),
    });
    return tx;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => { const q = {}; setTimeout(() => { q.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction }; q.onsuccess?.(); }, 0); return q; } };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ctl.setItemCalls++; if (String(v).length > ctl.quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}

let instance = 0;
const persistence = () => import(`../src/persistence.ts?freeTriceratops=${++instance}`);

test("the production grant supplies one permanent normal mount without a capture or automatic ride",()=>{
  const save=freshSave();gift(save);const m=normal(save)[0];assert.ok(m);assert.equal(normal(save).length,1);assert.equal(m.hp,TRICERATOPS_RIDE.health);assert.equal(m.recovery,null);assert.equal(save.mounts.riding,null);assert.equal(save.mounts.seq,0);assert.deepEqual(save.mounts.caught,{});assert.equal(save.mounts.standardTriceratopsGrant,1);
  const before=structuredClone(save.mounts);gift(save);assert.deepEqual(save.mounts,before);
  const restored=migrateSave(JSON.parse(JSON.stringify(save)));gift(restored);assert.deepEqual(restored.mounts,before);
  const caught=stableMount(restored,"triceratops").mount;assert.equal(caught.id,m.id);assert.equal(normal(restored).length,1);
});

test("existing mount identities, health, recovery, variant, capacity and selection survive the gift",()=>{
  const save=freshSave();for(const beast of ["briarStag","stalker","mountainTurtle"])stableMount(save,beast);
  assert.equal(save.mounts.stable.length,3); // all legacy capacity slots are occupied
  const silly=stableMount(save,"triceratops",{variant:"silly"}).mount;startRide(save,silly.id);
  const old=structuredClone(save.mounts),selected=defaultMount(save).id;gift(save);
  assert.deepEqual(save.mounts.stable.slice(1),old.stable);assert.deepEqual(save.mounts.caught,old.caught);assert.equal(save.mounts.seq,old.seq);assert.equal(save.mounts.riding,old.riding);assert.equal(save.mounts.last,old.last);assert.equal(defaultMount(save).id,selected);
  const owned=freshSave(),m=stableMount(owned,"triceratops").mount;m.hp=0;m.defeats=3;m.recovery={home:"2,3",progress:7,recent:["world:2,3"],opponentId:"hotel-owned",encounterStarted:true,encounterComplete:false,unknown:8};m.extra="kept";
  const before=structuredClone(owned.mounts);gift(owned);assert.deepEqual(owned.mounts.stable,before.stable);assert.equal(normal(owned)[0].id,m.id);assert.deepEqual(owned.mounts.caught,before.caught);
});

test("grant ids do not collide and a consumed grant never recreates or heals a mount",()=>{
  const save=freshSave(),legacy=stableMount(save,"briarStag").mount;legacy.id="mount-free-triceratops-v1";const selected=defaultMount(save).id;gift(save);assert.notEqual(normal(save)[0].id,legacy.id);assert.equal(defaultMount(save).id,selected);
  normal(save)[0].hp=27;gift(save);assert.equal(normal(save)[0].hp,27);
  save.mounts.stable=save.mounts.stable.filter(m=>m.beast!=="triceratops");gift(save);assert.equal(normal(save).length,0);
  save.mounts.standardTriceratopsGrant=2;gift(save);assert.equal(save.mounts.standardTriceratopsGrant,2);assert.equal(normal(save).length,0);
});

test("generic factories, codecs and Proving Ground fixtures do not receive production gifts",()=>{
  const plain=freshSave();plain.name="Production-looking name";
  for(const save of [plain,migrateSave(structuredClone(plain)),deserializeSave(serializeSave(plain))]){assert.equal(normal(save).length,0);assert.equal(save.mounts.standardTriceratopsGrant,undefined);}
  const capture=createLabFixture({lab:"triceratops-recovery",scenario:"triceratops-good",now:1000}).save;
  assert.equal(normal(capture).length,0);assert.equal(capture.mounts.standardTriceratopsGrant,undefined);
  const hotel=createLabFixture({lab:"triceratops-recovery",scenario:"triceratops-hotel",now:1000}).save;
  assert.equal(normal(hotel).length,1);assert.ok(normal(hotel)[0].recovery);assert.equal(hotel.mounts.standardTriceratopsGrant,undefined);
});

test("production creation and load grant once while validation and original storage remain untouched",async()=>{
  const ctl=fakeStorage(),P=await persistence(),old=freshSave();old.seed="OLD-GRANT";ctl.data.set("journey:1",structuredClone(old));
  assert.equal(normal(P.validateJourney(old).save).length,0);P.setActiveSlot(1);const loaded=await P.loadSave();assert.equal(normal(loaded).length,1);assert.deepEqual(ctl.data.get("journey:1"),old);
  await P.saveGame(loaded);await P.flushSaves();const again=await P.loadSave();assert.deepEqual(again.mounts,loaded.mounts);
  await P.createJourney(2,{name:"Fresh gift",seed:"NEW-GRANT"});P.setActiveSlot(2);const created=await P.loadSave();assert.equal(normal(created).length,0);assert.equal(created.mounts.hatchling.questJourney,true);assert.equal(created.mounts.riding,null);
  P.setActiveSlot(3);assert.equal(normal(await P.loadSave()).length,0,"empty production slot: a new journey does the rescue quest");
});

test("production import, duplication and recovery preserve an owned companion and leave backups unchanged",async()=>{
  const ctl=fakeStorage(),P=await persistence(),owned=freshSave(),m=stableMount(owned,"triceratops").mount;m.hp=31;m.defeats=2;
  const silly=stableMount(owned,"triceratops",{variant:"silly"}).mount;startRide(owned,silly.id);const before=structuredClone(owned);
  await P.importJourney(1,JSON.stringify(owned));P.setActiveSlot(1);const imported=await P.loadSave();assert.deepEqual(imported.mounts.stable,before.mounts.stable);assert.equal(imported.mounts.riding,silly.id);assert.equal(imported.mounts.standardTriceratopsGrant,1);assert.deepEqual(owned,before);
  await P.duplicateJourney(1,2);P.setActiveSlot(2);const copy=await P.loadSave();assert.deepEqual(copy.mounts,imported.mounts);
  const recovery=structuredClone(before);normal(recovery)[0].hp=0;normal(recovery)[0].defeats=3;normal(recovery)[0].recovery={home:"0,0",progress:4,recent:[],opponentId:"hotel-captured",encounterStarted:true,encounterComplete:false};ctl.data.set("recovery:3:1",structuredClone(recovery));
  await P.recoverJourney(3);P.setActiveSlot(3);const restored=await P.loadSave();assert.deepEqual(restored.mounts.stable,recovery.mounts.stable);assert.equal(restored.mounts.riding,silly.id);assert.equal(restored.mounts.standardTriceratopsGrant,1);assert.deepEqual(ctl.data.get("recovery:3:1"),recovery);
});
