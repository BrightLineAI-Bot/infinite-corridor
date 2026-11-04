// Release 735 (pre-publish review of 734): the localStorage mirror is never removed while the database is failing, since
// it may be the only readable copy; and a journey whose database read failed with no healthy mirror is blocked, never
// replaced by a fresh Wayfarer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';

const plain = (seed) => { const s = freshSave(); s.seed = seed; return JSON.parse(JSON.stringify(s)); };
function fakeStorage() {
  const data = new Map(), ls = new Map(), ctl = { data, ls, failRead: false, failWrite: false, quota: Infinity };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction() {
    const tx = { pending: 0, error: null, settled: false };
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) tx.onerror?.(); else tx.oncomplete?.(); }, 0);
    const request = (fn, kind) => { const q = {}; tx.pending++; setTimeout(() => { try { if (kind === 'read' && ctl.failRead || kind === 'write' && ctl.failWrite) throw new Error(`fake ${kind} failure`); q.result = fn(); q.onsuccess?.(); } catch (e) { q.error = tx.error = e; q.onerror?.(); } tx.pending--; settle(); }, 0); return q; };
    tx.objectStore = () => ({ get: (k) => request(() => structuredClone(data.get(k)), 'read'), put: (v, k) => request(() => { data.set(k, structuredClone(v)); }, 'write'), delete: (k) => request(() => { for (const key of keysIn(k)) data.delete(key); }, 'write'), getAllKeys: (r) => request(() => keysIn(r), 'read'), getAll: (r) => request(() => keysIn(r).map((k) => structuredClone(data.get(k))), 'read') });
    return tx;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => { const q = {}; setTimeout(() => { q.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction }; q.onsuccess?.(); }, 0); return q; } };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { if (String(v).length > ctl.quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}
let instance = 0;
const freshPersistence = () => import(`../src/persistence.ts?case735=${++instance}`);
const MIRROR = (slot) => `infinite-corridor:slot-mirror:${slot}`;

test('a large journey played from its mirror while the database is unreadable keeps that mirror', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  const big = { ...plain('ONLY-COPY'), level: 28, updatedAt: 5000 };
  big.session.areas = Object.fromEntries(Array.from({ length: P.MIRROR_BUDGET.areas + 30 }, (_, i) => [`overworld:${i}:0:g1`, { enemies: [], objects: {} }]));
  const stored = JSON.stringify(big); ctl.ls.set(MIRROR(1), stored); ctl.quota = stored.length - 1; // too big to rewrite
  P.setActiveSlot(1); ctl.failRead = true; ctl.failWrite = true;
  const loaded = await P.loadSave();
  assert.equal(loaded.seed, 'ONLY-COPY', 'the mirror plays');
  for (let i = 0; i < 3; i++) { await P.saveGame(loaded); await P.flushSaves().catch(() => {}); }
  assert.equal(ctl.ls.get(MIRROR(1)), stored, 'the only readable copy is still there');
  const again = await (await freshPersistence()).loadSave();
  assert.equal(again.seed, 'ONLY-COPY', 'a reload while the database is still unreadable plays it again');
});

test('the stale mirror is removed only once the database has the journey', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  const big = plain('BIG'); big.session.areas = Object.fromEntries(Array.from({ length: P.MIRROR_BUDGET.areas + 1 }, (_, i) => [`overworld:${i}:0:g1`, { enemies: [], objects: {} }]));
  ctl.ls.set(MIRROR(2), JSON.stringify({ ...plain('STALE'), updatedAt: 1 })); P.setActiveSlot(2);
  ctl.failWrite = true; await P.saveGame(big); await P.flushSaves().catch(() => {});
  assert.ok(ctl.ls.get(MIRROR(2)), 'kept while the database write fails');
  ctl.failWrite = false; const Q = await freshPersistence(); Q.setActiveSlot(2); await Q.saveGame(big); await Q.flushSaves();
  assert.equal(ctl.data.get('journey:2')?.seed, 'BIG'); assert.equal(ctl.ls.get(MIRROR(2)), undefined, 'removed after a successful write');
});

test('a database read failure with no healthy mirror blocks the slot instead of saving a fresh Wayfarer over it', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  const real = { ...plain('REAL'), level: 40, updatedAt: 9000 }; ctl.data.set('journey:1', structuredClone(real));
  P.setActiveSlot(1); ctl.failRead = true;
  const loaded = await P.loadSave();
  assert.notEqual(loaded.seed, 'REAL'); assert.match(P.saveBlocked(1), /could not be read/);
  ctl.failRead = false; loaded.level = 2; await P.saveGame(loaded); await P.flushSaves();
  assert.deepEqual(ctl.data.get('journey:1'), real, 'the real journey is untouched');
  assert.equal(ctl.data.has('recovery:1:1'), false);
  const reload = await (await freshPersistence()).loadSave();
  assert.equal(reload.seed, 'REAL', 'a reload once the database reads again plays the real journey');
});
