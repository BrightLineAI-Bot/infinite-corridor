// Slimmer saves (Tim, 2026-11-27): areas the Wayfarer has left are stored deflated in 256 bucket packs instead of one plain
// record each. Lossless (special values, key order, unknown fields), converted a few buckets per write, read back exactly,
// kept away from older builds by the marked main record, and a pack that cannot be read never lets the journey be
// written over. With IC_BIG_SAVE (a diagnostics or exported journey file) the whole flow also runs on a real large save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { packAreas, unpackAreas, areaBucket, PACKED_AREAS, PACKED_FROM, validateJourney, journeyListing } from '../src/persistence.ts';

// The same exactness the codec promises: key order, array length, Object.is on every leaf (undefined, NaN, -0 included).
function exact(a, b, path = '') {
  if (Object.is(a, b)) return null;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return path || '(root)';
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return `${path} keys`;
  for (const k of ka) { const d = exact(a[k], b[k], `${path}.${k}`); if (d) return d; }
  return null;
}

function fakeIdb() {
  const data = new Map(), ls = new Map(), ctl = { data, ls, failOn: null };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction() {
    const tx = { pending: 0, settled: false, error: null };
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) { tx.onerror?.(); tx.onabort?.(); } else tx.oncomplete?.(); }, 0);
    const request = (kind, key, fn) => { const q = {}; tx.pending++; setTimeout(() => { if (tx.settled) return; try { if (ctl.failOn?.(kind, key)) throw new Error(`fake ${kind} failure`); q.result = fn(); q.onsuccess?.(); } catch (e) { q.error = tx.error = e; q.onerror?.(); } tx.pending--; settle(); }, 0); return q; };
    tx.objectStore = () => ({
      get: (k) => request('get', k, () => structuredClone(data.get(k))),
      put: (v, k) => { const c = structuredClone(v); return request('put', k, () => { data.set(k, c); }); },
      delete: (k) => request('delete', k, () => { for (const key of keysIn(k)) data.delete(key); }),
      getAllKeys: (r) => request('getAllKeys', r, () => keysIn(r)),
      getAll: (r) => request('getAll', r, () => keysIn(r).map((k) => structuredClone(data.get(k)))),
    });
    tx.abort = () => { tx.settled = true; setTimeout(() => tx.onabort?.(), 0); };
    return tx;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => { const q = {}; setTimeout(() => { q.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, close() {}, transaction }; q.onsuccess?.(); }, 0); return q; } };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}
let instance = 0;
const freshPersistence = () => import(`../src/persistence.ts?slimmer-saves=${++instance}`);
const plainKeys = (ctl, slot = 1) => [...ctl.data.keys()].filter((k) => k.startsWith(`journey:${slot}::area::`));
const packKeys = (ctl, slot = 1) => [...ctl.data.keys()].filter((k) => k.startsWith(`journey:${slot}::pack::`));
// An area as snapshotArea stores it: objects carry phase and timer, usually undefined; foes carry many fields.
function bigArea(i) {
  const enemies = Array.from({ length: 6 }, (_, n) => ({ id: `ashling-${i}-${n}`, kind: 'ashling', x: 3.25 + n, y: 7.5, hp: n ? 12 : -0, maxHp: 30, damage: 4, dead: !n, rewarded: !n, eliteId: null, boss: false, traits: ['keen'], variantId: 'ashling:keen', threatRing: 3, xpMultiplier: 1.06, ai: { homeX: 3, homeY: 7, phase: 1.5, facing: 'down', mode: 'patrol', step: 0 }, futureField: { kept: [1, 2, { deep: true }] } }));
  const objects = Object.fromEntries(Array.from({ length: 8 }, (_, n) => [`env-tree-${i}-${n}`, { state: n % 3 ? 'standing' : 'felled', phase: undefined, timer: n === 2 ? 1.25 : undefined, hits: n === 1 ? { 'p:1': 1 } : {} }]));
  return { encounterVersion: 2, leftAt: 100 + i, enemies, objects, projectiles: [], effects: [], eliteHazards: [], unknownAreaField: { version: 99 } };
}
const journey = (seed, n = 40) => { const s = freshSave(); s.seed = seed; s.session.areas = Object.fromEntries(Array.from({ length: n }, (_, i) => [`overworld:${i}:0:g1`, bigArea(i)])); s.session.areas['overworld:99:0:g1'] = { enemies: [], objects: {} }; return migrateSave(s); };
async function settle(P, s, writes = 12) { for (let i = 0; i < writes; i++) { s.xp = (s.xp || 0) + 1; await P.saveGame(s); await P.flushSaves(); } }

// ---------------------------------------------------------------- the codec
test('a pack gives back every area exactly: undefined, NaN, the infinities and -0, key order and unknown fields', async () => {
  const odd = { b: 1, a: undefined, list: [undefined, NaN, Infinity, -Infinity, -0, 0, null, 'x'], nested: { z: -0, y: { q: undefined } }, '12': 'numeric key first', unknown: { anything: [true, false] } };
  const entries = [['one', bigArea(1)], ['odd', odd], ['empty', {}]];
  const { pack, packed, refused } = await packAreas(entries, 'SEED');
  assert.deepEqual(packed, ['one', 'odd', 'empty']); assert.deepEqual(refused, []);
  assert.equal(pack[PACKED_AREAS.tag], PACKED_AREAS.format); assert.equal(pack.codec, 'deflate'); assert.equal(pack.seed, 'SEED'); assert.ok(pack.data instanceof Uint8Array);
  const back = await unpackAreas(structuredClone(pack));
  for (const [k, area] of entries) assert.equal(exact(back.get(k), area), null, k);
  assert.ok(Object.is(back.get('odd').list[4], -0) && 'a' in back.get('odd') && back.get('odd').a === undefined);
  assert.ok(pack.data.length < JSON.stringify(entries).length / 3, 'deflated');
});

test('what JSON cannot carry exactly is refused (it stays a plain record); the rest of the bucket is still packed', async () => {
  const cyclic = { a: 1 }; cyclic.self = cyclic;
  const sparse = [1]; sparse[3] = 2; const extra = [1, 2]; extra.note = 'x';
  const bad = { date: { when: new Date(0) }, map: { m: new Map() }, typed: { t: new Uint8Array(2) }, sparse: { s: sparse }, extra: { e: extra }, cyclic, fn: { f() {} }, big: { n: 1n }, proto: JSON.parse('{"__proto__": {"x": 1}}'), sym: { [Symbol('s')]: 1 } };
  const { packed, refused } = await packAreas([['good', bigArea(2)], ...Object.entries(bad)], 'S');
  assert.deepEqual(packed, ['good']); assert.deepEqual(refused.sort(), Object.keys(bad).sort());
  const shared = { x: 1 }, { pack } = await packAreas([['aliased', { a: shared, b: shared }]], 'S');
  assert.deepEqual((await unpackAreas(pack)).get('aliased'), { a: { x: 1 }, b: { x: 1 } }, 'a shared object comes back as equal copies');
});

test('a pack this build cannot read throws (unknown format, unknown codec, damaged bytes); the bucket of a key is pinned', async () => {
  const { pack } = await packAreas([['a', bigArea(3)]], 'S');
  await assert.rejects(unpackAreas({ ...pack, [PACKED_AREAS.tag]: 2 }), /cannot read/);
  await assert.rejects(unpackAreas({ ...pack, codec: 'brotli' }), /cannot read/);
  const broken = pack.data.slice(); broken[Math.floor(broken.length / 2)] ^= 0xff; broken[broken.length - 1] ^= 0xff;
  await assert.rejects(unpackAreas({ ...pack, data: broken }));
  assert.deepEqual(['overworld:0:0:g1', 'overworld:1:0:g1', 'dungeon:X:g1:3:2:d', ''].map((k) => areaBucket(k)), [85, 56, 178, 197], 'format 1 buckets (FNV-1a mod 256) never change');
});

// ---------------------------------------------------------------- storage
test('areas left unchanged are packed a few buckets a write; the journey reads back exactly; the main record is marked', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = journey('PACK-FLOW'), want = structuredClone(s.session.areas);
  await P.saveGame(s); await P.flushSaves();
  assert.equal(plainKeys(ctl).length, 41, 'the first write is plain, as before'); assert.equal(packKeys(ctl).length, 0);
  assert.equal(ctl.data.get('journey:1').version, 14);
  s.xp = 1; await P.saveGame(s); await P.flushSaves();
  const after = packKeys(ctl).length; assert.ok(after > 0 && after <= PACKED_AREAS.packsPerWrite, `at most ${PACKED_AREAS.packsPerWrite} buckets a write (${after})`);
  const main = ctl.data.get('journey:1');
  assert.equal(main.version, PACKED_AREAS.storeVersion, 'the main record carries the marker with its first pack'); assert.equal(main.session[PACKED_FROM], 14);
  assert.equal(ctl.data.has('journey:1::delta'), false, 'that write was whole');
  await settle(P, s);
  assert.deepEqual(plainKeys(ctl), ['journey:1::area::overworld:99:0:g1'], 'every area is packed but the one too small to be worth it');
  const delta = ctl.data.get('journey:1::delta'); assert.ok(delta, 'later writes are deltas again');
  assert.equal(delta.ops.some(([path]) => path[0] === 'version' || path.includes(PACKED_FROM)), false, 'a delta never touches the marker');
  const Q = await freshPersistence(), back = await Q.loadSave();
  assert.equal(back.version, 14); assert.equal(PACKED_FROM in back.session, false);
  for (const k of Object.keys(want)) assert.equal(exact(back.session.areas[k], want[k]), null, k);
  assert.equal(exact(Object.keys(back.session.areas), Object.keys(want)), null, 'listed in the same order');
  const listed = (await Q.listJourneySlots())[0]; assert.equal(listed.health, 'healthy'); assert.equal(listed.name, s.name);
});

test('an area written again is plain and wins over its pack; the next write packs it again; a removed area is gone', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = journey('PACK-HOT'); await settle(P, s, 10);
  const k = 'overworld:5:0:g1', b = areaBucket(k);
  s.session.areas[k] = { ...bigArea(5), leftAt: 777 }; delete s.session.areas['overworld:6:0:g1'];
  await P.saveGame(s, { urgent: true }); await P.flushSaves();
  assert.ok(ctl.data.has(`journey:1::area::${k}`), 'written plain (an urgent write packs nothing)');
  assert.equal((await (await freshPersistence()).loadSave()).session.areas[k].leftAt, 777, 'the plain record wins over the pack copy');
  s.xp = 50; await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.data.has(`journey:1::area::${k}`), false, 'packed again by the next write'); assert.ok(ctl.data.has(`journey:1::pack::${b}`));
  const back = await (await freshPersistence()).loadSave();
  assert.equal(back.session.areas[k].leftAt, 777); assert.equal('overworld:6:0:g1' in back.session.areas, false);
  assert.equal(exact(back.session.areas, migrateSave(structuredClone(s)).session.areas), null);
});

test('a journey loaded from packs keeps packing where it left off and resumes its delta (the first write after a boot is not whole)', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = journey('PACK-BOOT'); await settle(P, s, 10);
  const main = structuredClone(ctl.data.get('journey:1')), packs = new Map(packKeys(ctl).map((k) => [k, ctl.data.get(k)]));
  const Q = await freshPersistence(), loaded = await Q.loadSave(); loaded.xp = 999; await Q.saveGame(loaded); await Q.flushSaves();
  assert.deepEqual(ctl.data.get('journey:1'), main, 'no whole main record after the boot');
  for (const [k, v] of packs) assert.deepEqual(ctl.data.get(k), v, 'no pack rewritten when nothing changed');
  assert.equal((await (await freshPersistence()).loadSave()).xp, 999);
});

test('an older build sees a journey with packs as saved by a newer release, so it never writes over it', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = journey('PACK-OLD'); await settle(P, s, 3);
  const stored = structuredClone(ctl.data.get('journey:1'));
  // What a build without packs does with the stored records: its journeyListing and validateJourney see the marker.
  const listed = journeyListing(stored, 1); assert.equal(listed.health, 'damaged'); assert.match(listed.error, /newer release/);
  const areas = Object.fromEntries(plainKeys(ctl).map((k) => [k.split('::area::')[1], ctl.data.get(k)]));
  const assembled = { ...stored, session: { ...stored.session, areas } }; delete assembled.session.areasSplit;
  const checked = validateJourney(assembled); assert.equal(checked.health, 'damaged'); assert.match(checked.error, /newer release/);
});

test('a pack that cannot be read blocks the slot and nothing is written over the journey', async () => {
  for (const spoil of [(p) => ({ ...p, [PACKED_AREAS.tag]: 9 }), (p) => { const d = p.data.slice(); for (let i = 2; i < d.length; i += 7) d[i] ^= 0x5a; return { ...p, data: d }; }]) {
    const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
    const s = journey('PACK-BAD'); await settle(P, s, 3); ctl.ls.clear();
    const key = packKeys(ctl)[0]; ctl.data.set(key, spoil(ctl.data.get(key)));
    const before = new Map([...ctl.data].map(([k, v]) => [k, structuredClone(v)]));
    const Q = await freshPersistence(), loaded = await Q.loadSave();
    assert.notEqual(loaded.seed, 'PACK-BAD'); assert.match(Q.saveBlocked(1), /could not be read/);
    await Q.saveGame(loaded); await Q.flushSaves().catch(() => {});
    assert.deepEqual(new Map(ctl.data), before, 'every record is as it was');
    await assert.rejects(Q.exportJourney(1));
  }
});

test('without CompressionStream nothing is packed (as before); a stored pack then cannot be read and blocks', async () => {
  const ctl = fakeIdb(), CS = globalThis.CompressionStream, DS = globalThis.DecompressionStream;
  try {
    globalThis.CompressionStream = undefined;
    const P = await freshPersistence(); P.setActiveSlot(1); const s = journey('NO-STREAMS'); await settle(P, s, 4);
    assert.equal(packKeys(ctl).length, 0); assert.equal(ctl.data.get('journey:1').version, 14);
    globalThis.CompressionStream = CS; const s2 = journey('STREAMS'); P.setActiveSlot(2); await settle(P, s2, 4);
    assert.ok(packKeys(ctl, 2).length > 0);
    globalThis.DecompressionStream = undefined; P.setActiveSlot(2); ctl.ls.delete('infinite-corridor:slot-mirror:2'); // no mirror to play instead
    const Q = await freshPersistence(); await Q.loadSave(); assert.match(Q.saveBlocked(2), /could not be read/);
  } finally { globalThis.CompressionStream = CS; globalThis.DecompressionStream = DS; }
});

test('export, import, duplicate and delete carry the whole journey; the export is the same as from plain records', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = journey('PACK-EXPORT'); await P.saveGame(s); await P.flushSaves();
  const plainExport = JSON.parse(await P.exportJourney(1)).save;
  await settle(P, s, 8); assert.ok(packKeys(ctl).length > 0);
  const packedExport = JSON.parse(await P.exportJourney(1)).save;
  assert.deepEqual({ ...packedExport, updatedAt: 0, xp: 0 }, { ...plainExport, updatedAt: 0, xp: 0 });
  await P.importJourney(2, await P.exportJourney(1)); await P.duplicateJourney(1, 3);
  for (const slot of [2, 3]) { P.setActiveSlot(slot); const back = await (await freshPersistence()).loadSave(); assert.deepEqual(JSON.parse(JSON.stringify(back.session.areas)), JSON.parse(JSON.stringify(s.session.areas)), `slot ${slot}`); }
  P.setActiveSlot(1); await P.deleteJourney(1);
  assert.equal([...ctl.data.keys()].some((k) => k.startsWith('journey:1')), false, 'packs go with the journey'); assert.ok(ctl.data.has('recovery:1:1'));
  assert.equal(exact((await P.recoverJourney(1), (await (await freshPersistence()).loadSave()).session.areas), s.session.areas), null, 'the recovery copy is whole');
});

test('older journeys (a version-12 import, a record from before release 555 with its areas inside) are packed as they play', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const v12 = JSON.parse(JSON.stringify(journey('LEGACY-12'))); v12.version = 12; delete v12.dungeonDoorNavigation;
  await P.importJourney(1, JSON.stringify(v12)); const a = await P.loadSave(), wantA = structuredClone(a.session.areas); await settle(P, a, 8);
  assert.ok(packKeys(ctl).length > 0); assert.equal(exact((await (await freshPersistence()).loadSave()).session.areas, wantA), null);
  const old = JSON.parse(JSON.stringify(journey('BEFORE-555'))); ctl.data.set('journey:2', old); P.setActiveSlot(2);
  const Q = await freshPersistence(), b = await Q.loadSave(), wantB = structuredClone(b.session.areas); assert.equal(b.seed, 'BEFORE-555');
  await settle(Q, b, 8); assert.ok(packKeys(ctl, 2).length > 0, 'split and packed');
  assert.equal(exact((await (await freshPersistence()).loadSave()).session.areas, wantB), null);
});

test('exact resume: a played journey saved into packs comes back as the same game', async () => {
  fakeIdb(); const P = await freshPersistence(); P.setActiveSlot(1);
  const g = new Game(freshSave(), 0);
  for (const [dx, dy] of [[1, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) g.transitionSection(dx, dy);
  const save = g.exportSnapshot(1000);
  assert.ok(Object.values(save.session.areas).some((a) => Object.values(a.objects || {}).some((o) => 'phase' in o && o.phase === undefined)), 'real areas carry undefined fields');
  await settle(P, save, 6);
  const back = await (await freshPersistence()).loadSave();
  assert.equal(exact(back.session.areas, save.session.areas), null);
  const a = new Game(migrateSave(structuredClone(save)), 2000), b = new Game(back, 2000);
  const view = (q) => { const x = q.exportSnapshot(3000); return JSON.stringify({ ...x, updatedAt: 0, session: { ...x.session, savedAt: 0 } }); };
  assert.ok(view(b) === view(a), 'the same game resumes');
});

// ---------------------------------------------------------------- a real large journey (IC_BIG_SAVE)
const BIG = process.env.IC_BIG_SAVE || '';
test('a real large journey: packed losslessly, read back area by area, exported and imported, resumed as the same game', { skip: !BIG || !existsSync(BIG) ? 'set IC_BIG_SAVE to a diagnostics or exported journey file' : false, timeout: 600000 }, async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const text = readFileSync(BIG, 'utf8'), file = JSON.parse(text), original = migrateSave(structuredClone(file.save || file));
  await P.importJourney(1, text);
  const s = await P.loadSave(), want = structuredClone(s.session.areas), keys = Object.keys(want);
  const plainBytes = plainKeys(ctl).reduce((n, k) => n + JSON.stringify(ctl.data.get(k)).length, 0);
  let t = performance.now(); await settle(P, s, Math.ceil(PACKED_AREAS.buckets / PACKED_AREAS.packsPerWrite) + 2); const convertMs = performance.now() - t;
  const packBytes = packKeys(ctl).reduce((n, k) => n + ctl.data.get(k).data.length, 0), left = plainKeys(ctl);
  t = performance.now(); const back = await (await freshPersistence()).loadSave(); const loadMs = performance.now() - t;
  console.log(`# big save: ${keys.length} areas; plain ${(plainBytes / 1e6).toFixed(2)} MB -> ${packKeys(ctl).length} packs ${(packBytes / 1e6).toFixed(2)} MB + ${left.length} small plain records; conversion ${Math.round(convertMs)} ms over ${Math.ceil(PACKED_AREAS.buckets / PACKED_AREAS.packsPerWrite) + 2} writes; load ${Math.round(loadMs)} ms`);
  assert.ok(packBytes < plainBytes * .3, 'well under a third of the plain records');
  for (const k of keys) { assert.equal(exact(back.session.areas[k], want[k]), null, k); assert.equal(JSON.stringify(back.session.areas[k]), JSON.stringify(original.session.areas[k]), k); }
  const exported = JSON.parse(await P.exportJourney(1)).save;
  for (const k of keys) assert.equal(JSON.stringify(exported.session.areas[k]), JSON.stringify(original.session.areas[k]), `export ${k}`);
  await P.importJourney(2, JSON.stringify({ format: 'infinite-corridor-journey', formatVersion: 1, save: exported })); P.setActiveSlot(2);
  const again = await (await freshPersistence()).loadSave();
  for (const k of keys) assert.equal(JSON.stringify(again.session.areas[k]), JSON.stringify(original.session.areas[k]), `reimport ${k}`);
  const view = (q) => { const x = q.exportSnapshot(3000); return JSON.stringify({ ...x, updatedAt: 0, session: { ...x.session, savedAt: 0 } }); };
  assert.ok(view(new Game(back, 2000)) === view(new Game(migrateSave(structuredClone(s)), 2000)), 'the same game resumes');
});
