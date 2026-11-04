// Release 734: save and play safety fixes from the release-733 review (S1 unknown/future save versions, S2 the
// localStorage mirror and an unreadable IndexedDB, S4/S5 null entries that crashed new Game, S6/F2 broken checkpoints,
// F1 the Gravitant Bell's pull through walls).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave, validCheckpoint } from '../src/types.ts';
import { Game, footprintOpen } from '../src/game.ts';
import { validateJourney } from '../src/persistence.ts';

const plain = (seed = 'SAFE-734') => { const s = freshSave(); s.seed = seed; return JSON.parse(JSON.stringify(s)); };

// A small in-memory IndexedDB and localStorage, enough for persistence.ts. `ctl.failRead`/`ctl.failWrite` make requests fail.
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
const freshPersistence = () => import(`../src/persistence.ts?case=${++instance}`); // module state (blocks, caches) per test

test('S1: a journey with a missing, zero, null or future version is damaged, not reset to a fresh journey', () => {
  const s = plain(); s.level = 12;
  for (const version of [undefined, 0, null, 15, 'x']) {
    const raw = { ...s, version }; if (version === undefined) delete raw.version;
    assert.throws(() => migrateSave(structuredClone(raw)), /version/, `version ${version}`);
    const checked = validateJourney(raw);
    assert.equal(checked.health, 'damaged', `version ${version}`);
  }
  assert.match(validateJourney({ ...s, version: 15 }).error, /newer release/);
  for (const version of [1, 9, 13, 14, '14']) assert.equal(validateJourney({ ...s, version }).health, 'healthy', `version ${version}`);
  // Nothing of a journey in it: still a fresh save, as before.
  assert.equal(migrateSave(null).seed, freshSave().seed);
  assert.equal(migrateSave({}).level, 1);
});

test('S1: import refuses a future-version journey with a clear message, and the loader keeps the stored record', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  await assert.rejects(P.importJourney(1, JSON.stringify({ ...plain(), version: 15 })), /newer release/);
  assert.equal(ctl.data.size, 0);
  const future = { ...plain('FUTURE'), version: 15, level: 40 };
  ctl.data.set('journey:1', structuredClone(future));
  P.setActiveSlot(1);
  const loaded = await P.loadSave();
  assert.notEqual(loaded.seed, 'FUTURE');
  assert.match(P.saveBlocked(1), /newer release/);
  loaded.level = 2; await P.saveGame(loaded); await P.flushSaves();
  assert.deepEqual(ctl.data.get('journey:1'), future, 'the autosave never writes over the newer journey');
  assert.equal(ctl.ls.size <= 1, true); assert.equal(ctl.ls.get('infinite-corridor:slot-mirror:1'), undefined);
  const slots = await P.listJourneySlots();
  assert.equal(slots[0].health, 'damaged');
});

test('S2: a journey over the mirror budget is not mirrored, its stale mirror is removed, and a quota failure is not retried', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  P.setActiveSlot(2);
  const big = plain('BIG'); big.session.areas = Object.fromEntries(Array.from({ length: P.MIRROR_BUDGET.areas + 1 }, (_, i) => [`overworld:${i}:0:g1`, { enemies: [], objects: {} }]));
  ctl.ls.set('infinite-corridor:slot-mirror:2', JSON.stringify({ ...plain('STALE'), updatedAt: 1 }));
  const calls = ctl.setItemCalls;
  await P.saveGame(big); await P.flushSaves();
  assert.equal(ctl.setItemCalls, calls, 'no mirror write for an over-budget journey');
  assert.equal(ctl.ls.get('infinite-corridor:slot-mirror:2'), undefined, 'the stale mirror is gone');
  assert.equal(P.mirrorSkippedFor(2), 'size');
  // Quota: IndexedDB failing makes every save fall back to the mirror; a refused mirror is tried once, not every save.
  const Q = await freshPersistence(); Q.setActiveSlot(3); ctl.quota = 10; ctl.failWrite = true;
  const small = plain('SMALL'), before = ctl.setItemCalls;
  for (let i = 0; i < 3; i++) { await Q.saveGame(small); await Q.flushSaves().catch(() => {}); }
  assert.equal(ctl.setItemCalls - before, 1, 'one refused mirror write, then none (at most once a minute while the database fails)');
  assert.equal(Q.mirrorSkippedFor(3), null, 'release 735: a database failure never marks the mirror skipped or removes it');
});

test('S2: when IndexedDB cannot be read at load, the first write keeps the database record as a recovery snapshot', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  const newer = { ...plain('NEWER'), level: 30, updatedAt: 2000 }, older = { ...plain('NEWER'), level: 5, updatedAt: 1000 };
  ctl.data.set('journey:1', structuredClone(newer)); ctl.ls.set('infinite-corridor:slot-mirror:1', JSON.stringify(older));
  P.setActiveSlot(1); ctl.failRead = true;
  const loaded = await P.loadSave();
  assert.equal(loaded.level, 5, 'the mirror plays while the database cannot be read');
  ctl.failRead = false;
  await P.saveGame(loaded); await P.flushSaves();
  assert.equal(ctl.data.get('recovery:1:1')?.level, 30, 'the newer database journey is kept for Recover before it is replaced');
  assert.equal(ctl.data.get('journey:1').level, 5);
});

test('S4: a game that validates but throws at start marks its slot damaged and is never saved over', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  P.setActiveSlot(1); const s = plain('CRASH'); ctl.data.set('journey:1', structuredClone(s));
  const loaded = await P.loadSave(); assert.equal(loaded.seed, 'CRASH'); assert.equal(P.saveBlocked(1), null);
  P.markSlotDamaged(1, 'This journey could not start (boom).');
  loaded.level = 9; await P.saveGame(loaded); await P.flushSaves();
  assert.equal(ctl.data.get('journey:1').level, 1);
  assert.equal((await P.listJourneySlots())[0].health, 'damaged');
});

test('S4/S5: null or non-object entries in the pack, gear slots and area lists no longer crash new Game', () => {
  const s = plain('NULLS'), item = { id: 'kept', name: 'Kept Blade', slot: 'primary', power: 3, basePower: 3, upgradeRank: 0, property: 'steady' };
  s.inventory = [null, 7, item, 'x'];
  s.equipment = { ...s.equipment, secondary: 'broken', charm: null, armor: [1] };
  const key = 'overworld:0:0:g1'; s.session.areas[key] = { enemies: [null, 3, { id: 'nobody', dead: true }], objects: { a: null, b: { state: 'x' } }, projectiles: [null], effects: 'x', eliteHazards: [null] };
  const m = migrateSave(structuredClone(s));
  assert.deepEqual(m.inventory.map((q) => q.id), ['kept']);
  assert.equal(m.equipment.secondary, null); assert.equal(m.equipment.armor, null); assert.equal(m.equipment.primary.id, 'salvage-blade');
  const a = m.session.areas[key];
  assert.deepEqual(a.enemies, [{ id: 'nobody', dead: true }]); assert.deepEqual(a.objects, { b: { state: 'x' } }); assert.deepEqual(a.projectiles, []); assert.deepEqual(a.effects, []); assert.deepEqual(a.eliteHazards, []);
  assert.doesNotThrow(() => new Game(m, 0));
  // A sound area record is not copied.
  const ok = plain('OK'), area = { enemies: [{ id: 'e' }], objects: { o: { state: 'used' } } }; ok.session.areas[key] = area;
  assert.deepEqual(migrateSave(ok).session.areas[key], area);
});

test('S6/F2: broken checkpoints are dropped on migrate, and a death never respawns at a null position', () => {
  const s = plain('CP');
  s.checkpoints = { '0,0': s.checkpoints['0,0'], '3,4': { rx: 3, ry: 4, x: null, y: 2, name: 'bad' }, '5,5': { rx: 5, ry: 5, x: 10, y: 11, name: 'good' }, '6,6': { name: 'x' }, '7,7': null };
  s.activeCheckpoint = { rx: 3, ry: 4, x: NaN, y: 2, name: 'bad' };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(Object.keys(m.checkpoints).sort(), ['0,0', '5,5']);
  assert.equal(m.activeCheckpoint.name, 'Ember Refuge'); assert.ok(validCheckpoint(m.activeCheckpoint));
  for (const bad of [null, { name: 'x' }, { rx: 0, ry: 0, x: null, y: null }]) {
    assert.ok(validCheckpoint(migrateSave({ ...plain('CP2'), activeCheckpoint: bad }).activeCheckpoint));
    // At runtime too: a checkpoint broken after load does not throw or strand the Wayfarer.
    const g = new Game(migrateSave(plain('CP3')), 0); g.save.activeCheckpoint = bad;
    g.player.hp = 0; let t = 5000;
    assert.doesNotThrow(() => { for (let i = 0; i < 300 && (g.player.hp <= 0 || g.fallen); i++) { g.update(1 / 30, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, t); t += 33; } });
    assert.ok(Number.isFinite(g.player.x) && Number.isFinite(g.player.y), `respawn position for ${JSON.stringify(bad)}`);
    assert.equal(g.rx, 0); assert.equal(g.ry, 0);
  }
});

test('F1: the Gravitant Bell pull cannot drag the Wayfarer into a wall or over a pit', () => {
  for (const kind of ['wall', 'abyss']) {
    const s = freshSave(); s.seed = 'GRAV'; const g = new Game(s, 0); g.loadArea('dungeon');
    g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], landscape: null, tiles: Array.from({ length: 1024 }, (_, i) => { const x = i % 32, y = Math.floor(i / 32), k = x === 12 ? kind : 'ash'; return { x, y, kind: k, blocked: k === 'wall' }; }) };
    const bell = g.createEnemyFromSpawn({ id: 'bell', kind: 'gravitantBell', x: 15, y: 10, boss: true }); bell.aggro = true; bell.damage = 0; bell.eliteCooldown = 0; g.enemies = [bell];
    assert.ok(bell.eliteModules?.includes('gravity'));
    Object.assign(g.player, { x: 10.2, y: 10, hp: 60 }); let t = 1000, pulled = false;
    const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
    for (let i = 0; i < 240; i++) { t += 33.3; g.update(1 / 30, idle, t); if (g.player.x > 10.25) pulled = true; assert.ok(footprintOpen(g.map, 32, g.player.x, g.player.y), `${kind}: footprint open at x=${g.player.x.toFixed(2)}`); assert.ok(g.player.hp > 0 && !/Felled|swallow|falls/.test(g.message), `${kind}: not killed by the pull`); }
    assert.ok(pulled, `${kind}: the pull still moves the Wayfarer toward the Bell`);
    assert.ok(g.player.x < 12, `${kind}: stopped short of the column`);
  }
});
