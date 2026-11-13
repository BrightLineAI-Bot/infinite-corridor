// Save hide fix (follow-up to release 941's autosave changes): the save made as the page hides is written at once; any
// failed database call drops the cached connection so the next call reopens; a call that never answers is given up; a
// failed write is reported by flushSaves once; an open that throws is not kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';

const plain = (seed) => { const s = freshSave(); s.seed = seed; s.session.areas = { 'overworld:1:0:g1': { enemies: [], objects: {} }, 'overworld:2:0:g1': { enemies: [], objects: { a: { state: 'open' } } } }; return JSON.parse(JSON.stringify(s)); };

// A fake IndexedDB with switches: a request kind that fails, a transaction that never answers, a connection the browser
// killed without a close event, an open that throws at once or never answers.
function fakeIdb() {
  const data = new Map(), ls = new Map();
  const ctl = { data, ls, opens: 0, closes: 0, txs: 0, aborts: 0, failOn: null, hangNext: 0, openThrows: 0, openHangs: 0, lastDb: null };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction(db) {
    const tx = { pending: 0, settled: false, error: null, hang: ctl.hangNext > 0 && !!ctl.hangNext-- };
    tx.abort = () => { if (tx.settled) return; tx.settled = true; ctl.aborts++; setTimeout(() => tx.onabort?.(), 0); };
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) { tx.onerror?.(); tx.onabort?.(); } else tx.oncomplete?.(); }, 0);
    const request = (kind, key, fn) => {
      const q = {}; if (tx.hang) return q;
      tx.pending++;
      setTimeout(() => {
        if (tx.settled) return;
        try { if (ctl.failOn?.(kind, key)) throw new Error(`fake ${kind} failure`); q.result = fn(); q.onsuccess?.(); }
        catch (e) { q.error = tx.error = e; q.onerror?.(); }
        tx.pending--; settle();
      }, 0);
      return q;
    };
    tx.objectStore = () => ({
      get: (k) => request('get', k, () => structuredClone(data.get(k))),
      put: (v, k) => { const c = structuredClone(v); return request('put', k, () => { data.set(k, c); }); },
      delete: (k) => request('delete', k, () => { for (const key of keysIn(k)) data.delete(key); }),
      getAllKeys: (r) => request('getAllKeys', r, () => keysIn(r)),
      getAll: (r) => request('getAll', r, () => keysIn(r).map((k) => structuredClone(data.get(k)))),
    });
    return tx;
  }
  function makeDb() {
    const db = { closed: false, dead: false, objectStoreNames: { contains: () => true }, createObjectStore() {},
      close() { if (!db.closed) { db.closed = true; ctl.closes++; } },
      transaction() { if (db.closed || db.dead) { const e = new Error('The database connection is closing.'); e.name = 'InvalidStateError'; throw e; } ctl.txs++; return transaction(db); } };
    return db;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => {
    ctl.opens++;
    if (ctl.openThrows > 0) { ctl.openThrows--; throw new Error('fake open threw'); }
    const q = {}; if (ctl.openHangs > 0) { ctl.openHangs--; return q; }
    setTimeout(() => { const db = makeDb(); ctl.lastDb = db; q.result = db; q.onsuccess?.(); }, 0); return q;
  } };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}
let instance = 0;
const freshPersistence = () => import(`../src/persistence.ts?save-hide-fix=${++instance}`);
const microtasks = async (n = 200) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
async function ready(seed) {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = plain(seed); await P.saveGame(s); await P.flushSaves(); // the connection is open and the slot confirmed
  return { ctl, P, s };
}

// ---------------------------------------------------------------- 1. the hide save is not deferred
test('an in-play autosave still waits a task before its write; the hide save (urgent) writes at once', async () => {
  const { ctl, P, s } = await ready('HIDE-URGENT');
  s.xp = 5; let tx0 = ctl.txs; P.saveGame(s); await microtasks();
  assert.equal(ctl.txs, tx0, 'a normal autosave has not started its transaction before the next task');
  await P.flushSaves(); assert.equal(ctl.txs, tx0 + 1);
  s.xp = 6; tx0 = ctl.txs; P.saveGame(s, { urgent: true }); await microtasks();
  assert.equal(ctl.txs, tx0 + 1, 'the hide save started its transaction without waiting for a timer');
  await P.flushSaves();
  const back = await (await freshPersistence()).loadSave(); assert.equal(back.xp, 6);
});

test('any save while the page is hidden is written at once', async () => {
  const { ctl, P, s } = await ready('HIDE-HIDDEN');
  globalThis.document = { hidden: true };
  try {
    s.xp = 9; const tx0 = ctl.txs; P.saveGame(s); await microtasks();
    assert.equal(ctl.txs, tx0 + 1, 'not deferred while hidden');
    await P.flushSaves();
  } finally { delete globalThis.document; }
});

test('a hide save ends the wait of an autosave already deferred, and both are written in order', async () => {
  const { ctl, P, s } = await ready('HIDE-HURRY');
  s.xp = 11; const tx0 = ctl.txs; P.saveGame(s); await microtasks();
  assert.equal(ctl.txs, tx0, 'the autosave is waiting for its task');
  s.xp = 12; P.saveGame(s, { urgent: true }); await microtasks();
  assert.equal(ctl.txs, tx0 + 1, 'the waiting autosave was written at once');
  await P.flushSaves(); assert.equal(ctl.txs, tx0 + 2);
  assert.equal((await (await freshPersistence()).loadSave()).xp, 12);
});

// ---------------------------------------------------------------- 2. failures drop the connection
test('a failed read, area read or journey removal drops the connection; the next call opens a new one', async () => {
  const { ctl, P, s } = await ready('DROP');
  // A read (the main record) fails.
  ctl.failOn = (kind) => kind === 'get'; let opens = ctl.opens, closes = ctl.closes;
  await assert.rejects(P.exportJourney(1));
  assert.equal(ctl.closes, closes + 1, 'the failed connection was dropped');
  ctl.failOn = null; assert.ok(JSON.parse(await P.exportJourney(1)).save); assert.equal(ctl.opens, opens + 1, 'and reopened');
  // The area records' read fails (readJourney).
  ctl.failOn = (kind) => kind === 'getAll'; opens = ctl.opens; closes = ctl.closes;
  await assert.rejects(P.exportJourney(1)); assert.equal(ctl.closes, closes + 1);
  ctl.failOn = null; assert.ok(JSON.parse(await P.exportJourney(1)).save); assert.equal(ctl.opens, opens + 1);
  // Removing the journey fails: it is still there, and the next call reopens.
  ctl.failOn = (kind, key) => kind === 'delete' && key === 'journey:1'; opens = ctl.opens; closes = ctl.closes;
  await assert.rejects(P.deleteJourney(1)); assert.equal(ctl.closes, closes + 1);
  assert.ok(ctl.data.has('journey:1'), 'nothing was removed');
  ctl.failOn = null; await P.deleteJourney(1); assert.equal(ctl.opens, opens + 1);
  assert.equal(ctl.data.has('journey:1'), false); assert.ok(ctl.data.has('recovery:1:1'), 'a recovery copy was kept');
  // A write after the failed removal is whole and sweeps (no stale area records).
  s.xp = 3; await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.data.has('journey:1::delta'), false); assert.equal(ctl.data.get('journey:1').xp, 3);
});

test('a connection that died without a close event is replaced at once: the autosave on it does not fail', async () => {
  const { ctl, P, s } = await ready('DEAD');
  ctl.lastDb.dead = true; const opens = ctl.opens;
  s.xp = 21; await P.saveGame(s); await P.flushSaves(); // does not throw
  assert.equal(ctl.opens, opens + 1);
  assert.equal((await (await freshPersistence()).loadSave()).xp, 21);
});

// ---------------------------------------------------------------- 2b. a hung call cannot stall the queue
test('a transaction that never answers is aborted after the bound; the next write is whole and the queue moves on', async () => {
  const { ctl, P, s } = await ready('HUNG');
  P.SAVE_IO.stallMs = 60;
  s.xp = 30; await P.saveGame(s); await P.flushSaves(); // a delta write
  assert.ok(ctl.data.has('journey:1::delta'));
  ctl.hangNext = 1; const closes = ctl.closes, aborts = ctl.aborts;
  s.xp = 31; await P.saveGame(s);
  await assert.rejects(P.flushSaves(), /stopped answering/);
  assert.equal(ctl.aborts, aborts + 1, 'the hung transaction was aborted'); assert.equal(ctl.closes, closes + 1, 'its connection dropped');
  s.xp = 32; await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.data.has('journey:1::delta'), false, 'the next write is whole'); assert.equal(ctl.data.get('journey:1').xp, 32);
  assert.equal((await (await freshPersistence()).loadSave()).xp, 32);
});

test('an open that never answers is given up and the next call opens again', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1); P.SAVE_IO.stallMs = 60;
  ctl.openHangs = 1; const s = plain('OPEN-HANG');
  await P.saveGame(s); await assert.rejects(P.flushSaves(), /did not open/);
  await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.opens, 2); assert.ok(ctl.data.has('journey:1'));
});

// ---------------------------------------------------------------- 3. flushSaves reports a failure once
test('after one failed write flushSaves throws once, then is clear', async () => {
  const { ctl, P, s } = await ready('FLUSH-ONCE');
  ctl.failOn = (kind) => kind === 'put';
  s.xp = 40; await P.saveGame(s); ctl.failOn = null;
  await assert.rejects(P.flushSaves(), /fake put failure/);
  await P.flushSaves(); await P.flushSaves(); // no longer throws
  s.xp = 41; await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.data.get('journey:1').xp, 41);
});

// ---------------------------------------------------------------- 4. an open that throws is not kept
test('an open that throws at once is not cached: the next call opens again', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  ctl.openThrows = 1; const s = plain('OPEN-THROWS');
  await P.saveGame(s); await assert.rejects(P.flushSaves(), /fake open threw/);
  await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.opens, 2); assert.ok(ctl.data.has('journey:1'));
  // An indexedDB missing altogether fails the call, and is looked for again on the next.
  const idb = globalThis.indexedDB; globalThis.indexedDB = undefined;
  try { await assert.rejects(P.exportJourney(1)); } finally { globalThis.indexedDB = idb; }
  assert.ok(JSON.parse(await P.exportJourney(1)).save);
});
