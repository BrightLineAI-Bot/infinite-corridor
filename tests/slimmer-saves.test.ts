// Slimmer saves (Tim, 2026-11-27): areas the Wayfarer has left are stored deflated in 256 bucket packs instead of one plain
// record each. Lossless (special values, key order, unknown fields), converted a few buckets per write, read back exactly,
// kept away from older builds by the marked main record, and a pack that cannot be read never lets the journey be
// written over. With IC_BIG_SAVE (a diagnostics or exported journey file) the whole flow also runs on a real large save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { packAreas, unpackAreas, areaBucket, PACKED_AREAS, PACKED_FROM, MAIN_SPLIT, MAIN_PARTS, validateJourney, journeyListing, journeySizeText } from '../src/persistence.ts';

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
  const data = new Map(), ls = new Map(), ctl = { data, ls, failOn: null, lie: false };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction(_store, mode) {
    const tx = { pending: 0, settled: false, error: null };
    // lie: the transaction commits, but the page hears an abort (its stall timer fired mid-commit)
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) { tx.onerror?.(); tx.onabort?.(); } else if (mode === 'readwrite' && ctl.lie) { ctl.lie = false; tx.error = new Error('reported failed, but committed'); tx.onabort?.(); } else tx.oncomplete?.(); }, 0);
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
  assert.equal([...Array(40).keys()].some((i) => areaBucket(`overworld:${i}:0:g1`) === areaBucket('overworld:99:0:g1')), false, 'the small area has a bucket of its own');
  assert.deepEqual(plainKeys(ctl), ['journey:1::area::overworld:99:0:g1'], 'every area is packed but the small one alone in its bucket');
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

// ---------------------------------------------------------------- the main-record split
const partKeys = (ctl, slot = 1, name = '') => [...ctl.data.keys()].filter((k) => k.startsWith(`journey:${slot}::part::${name}`));
// A journey whose six collections are large enough to split (areas small, so nothing is packed).
function bigMain(seed) {
  const s = freshSave(); s.seed = seed; s.session.areas = { 'overworld:1:0:g1': { enemies: [], objects: {} } }; s.atlas = {};
  for (let i = 0; i < 400; i++) { s.atlas[`${i},${-i}`] = { terrain: 'glass', sites: [{ kind: 'dungeon', x: i % 30, y: 3 }], color: '#435351' }; s.worldFlags[`rest:${i},0:shrine`] = i % 3 ? true : i; s.perception.awarded[`site:overworld:${i}:0:g1:landmark-${i}`] = true; }
  s.atlas['12'] = { terrain: 'numeric key' }; s.worldFlags.undef = undefined;
  s.consequences.dungeons = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`dungeon:${seed}:g1:${i}:2:d-${i}`, { discovered: true, visits: i % 4, guardianDefeated: i % 5 === 0, discovery: { schema: 1, levels: {} } }]));
  s.killLedger = { v: 1, areas: Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`overworld:${i}:2:g1`, { k: [`glassMite-${i}-1`, `veilMoth-${i}-2`] }])) };
  s.narrative.journal = Array.from({ length: 400 }, (_, i) => ({ recordId: `r${i}`, title: `Entry ${i}`, text: 'The beacon knew me before I arrived.' }));
  return migrateSave(s);
}
const later = (ms) => { const real = Date.now; let off = 0; Date.now = () => real() + off; return { step: () => { off += ms; }, done: () => { Date.now = real; } }; };
const sameJourney = (a, b) => exact({ ...a, updatedAt: 0 }, { ...b, updatedAt: 0 });

test('large collections are stored apart in buckets; the main record keeps null and counts; the journey reads back exactly', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = bigMain('SPLIT-MAIN'); await P.saveGame(s); await P.flushSaves();
  const main = ctl.data.get('journey:1');
  for (const { name, path } of MAIN_SPLIT.parts) { assert.equal(path.reduce((o, k) => o?.[k], main), null, name); assert.ok(partKeys(ctl, 1, name + '::').length > 0, name); }
  assert.equal(main.session[MAIN_PARTS].atlas.count, 401); assert.equal(main.session[MAIN_PARTS].journal.count, 400);
  assert.equal(main.version, PACKED_AREAS.storeVersion, 'a split main record carries the marker'); assert.ok(JSON.stringify(main).length < 20000, 'the main record is small');
  const back = await (await freshPersistence()).loadSave();
  assert.equal(sameJourney(back, migrateSave(structuredClone(s))), null);
  assert.ok('undef' in back.worldFlags && back.worldFlags.undef === undefined);
  assert.equal(exact(Object.keys(back.atlas), Object.keys(s.atlas)), null, 'key order, the numeric key first');
  const listed = (await (await freshPersistence()).listJourneySlots())[0]; assert.equal(listed.health, 'healthy'); assert.ok(listed.storedBytes < listed.bytes / 2, `stored ${listed.storedBytes} < journey ${listed.bytes}`);
  assert.match(journeySizeText(listed), /journey · .* stored/); assert.equal(journeySizeText({ bytes: 4096, storedBytes: 4096 }), '4 KB');
});

test('a whole write stores only the buckets whose entries changed; a key re-added in the middle keeps the order', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(), clock = later(SAVE_DELTA_MS + 1000); P.setActiveSlot(1);
  try {
    const s = bigMain('SPLIT-CHANGE'); await P.saveGame(s); await P.flushSaves();
    const before = new Map(partKeys(ctl).map((k) => [k, ctl.data.get(k)]));
    s.atlas['7,-7'].visited = 3; s.narrative.journal.push({ recordId: 'new', text: 'appended' }); delete s.worldFlags['rest:5,0:shrine'];
    clock.step(); await P.saveGame(s, { urgent: true }); await P.flushSaves(); assert.equal(ctl.data.has('journey:1::delta'), false, 'a whole write');
    const changed = partKeys(ctl).filter((k) => !before.has(k) || JSON.stringify(ctl.data.get(k)) !== JSON.stringify(before.get(k)));
    assert.equal(changed.length, 3, `one bucket each for the atlas entry, the journal's last chunk and the flag (${changed})`);
    assert.ok(changed.some((k) => k.endsWith(`journal::${Math.floor(400 / MAIN_SPLIT.chunk)}`)));
    assert.ok(changed.every((k) => ctl.data.get(k).plain), 'an urgent (hide) save stores its buckets plain');
    // A deleted key added again comes last, in the stored map as in the live one.
    s.worldFlags['rest:5,0:shrine'] = 'back'; const first = Object.keys(s.atlas)[1], v = s.atlas[first]; delete s.atlas[first];
    clock.step(); await P.saveGame(s); await P.flushSaves(); s.atlas[first] = v; clock.step(); await P.saveGame(s); await P.flushSaves();
    const back = await (await freshPersistence()).loadSave();
    assert.equal(exact(Object.keys(back.atlas), Object.keys(s.atlas)), null); assert.equal(exact(Object.keys(back.worldFlags), Object.keys(s.worldFlags)), null);
    assert.equal(sameJourney(back, migrateSave(structuredClone(s))), null);
  } finally { clock.done(); }
});
const SAVE_DELTA_MS = 120000;

test('a map stored in another key order is numbered again (an import over the slot), and reads back in that order', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = bigMain('SPLIT-ORDER'); await P.saveGame(s); await P.flushSaves();
  const shuffled = JSON.parse(JSON.stringify(s)); shuffled.atlas = Object.fromEntries(Object.entries(shuffled.atlas).reverse()); shuffled.worldFlags = Object.fromEntries(Object.entries(shuffled.worldFlags).reverse());
  await P.importJourney(1, JSON.stringify(shuffled), true);
  const back = await (await freshPersistence()).loadSave();
  assert.equal(exact(Object.keys(back.atlas), Object.keys(shuffled.atlas)), null); assert.equal(exact(Object.keys(back.worldFlags), Object.keys(shuffled.worldFlags)), null);
  assert.ok(partKeys(ctl).length > 0);
});

test('after a boot, entries a delta edited in place are written by the next whole write (nothing is lost)', async () => {
  const ctl = fakeIdb(), clock = later(SAVE_DELTA_MS + 1000);
  try {
    const P = await freshPersistence(); P.setActiveSlot(1); const s = bigMain('SPLIT-DELTA'); await P.saveGame(s); await P.flushSaves();
    s.atlas['9,-9'].sites[0].x = 99; s.killLedger.areas['overworld:4:2:g1'].k.push('late-kill'); s.narrative.journal[3].text = 'edited';
    await P.saveGame(s); await P.flushSaves(); assert.ok(ctl.data.has('journey:1::delta'), 'a delta write');
    const Q = await freshPersistence(), loaded = await Q.loadSave(); assert.equal(loaded.atlas['9,-9'].sites[0].x, 99);
    clock.step(); loaded.xp = 5; await Q.saveGame(loaded); await Q.flushSaves(); assert.equal(ctl.data.has('journey:1::delta'), false, 'a whole write after the boot');
    const back = await (await freshPersistence()).loadSave();
    assert.equal(back.atlas['9,-9'].sites[0].x, 99); assert.deepEqual(back.killLedger.areas['overworld:4:2:g1'].k.at(-1), 'late-kill'); assert.equal(back.narrative.journal[3].text, 'edited');
    assert.equal(sameJourney(back, migrateSave(structuredClone(loaded))), null);
  } finally { clock.done(); }
});

test('a collection that shrinks below half the threshold goes back into the main record and its buckets are removed', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(), clock = later(SAVE_DELTA_MS + 1000); P.setActiveSlot(1);
  try {
    const s = bigMain('SPLIT-SHRINK'); await P.saveGame(s); await P.flushSaves();
    s.worldFlags = { kept: 1 }; clock.step(); await P.saveGame(s); await P.flushSaves();
    assert.equal(partKeys(ctl, 1, 'flags::').length, 0); assert.deepEqual(ctl.data.get('journey:1').worldFlags, { kept: 1 });
    assert.equal(sameJourney(await (await freshPersistence()).loadSave(), migrateSave(structuredClone(s))), null);
  } finally { clock.done(); }
});

test('a missing, unreadable or foreign part blocks the slot and nothing is written; an older build sees a newer release', async () => {
  for (const spoil of [(ctl, k) => ctl.data.delete(k), (ctl, k) => ctl.data.set(k, { junk: true }), (ctl, k) => { const r = ctl.data.get(k); ctl.data.set(k, r.pack ? { ...r, pack: { ...r.pack, codec: 'zz' } } : { ...r, plain: { e: 'x' } }); }]) {
    const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
    const s = bigMain('SPLIT-BAD'); await P.saveGame(s); await P.flushSaves(); ctl.ls.clear();
    assert.match(journeyListing(structuredClone(ctl.data.get('journey:1')), 1).error, /newer release/);
    spoil(ctl, partKeys(ctl, 1, 'kills::')[0]);
    const before = new Map([...ctl.data].map(([k, v]) => [k, structuredClone(v)]));
    const Q = await freshPersistence(), loaded = await Q.loadSave(); assert.notEqual(loaded.seed, 'SPLIT-BAD'); assert.match(Q.saveBlocked(1), /could not be read/);
    await Q.saveGame(loaded); await Q.flushSaves().catch(() => {}); assert.deepEqual(new Map(ctl.data), before);
  }
});

test('export, import, the mirror and a recovery copy carry the whole split journey', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = bigMain('SPLIT-EXPORT'); await P.saveGame(s); await P.flushSaves();
  const want = JSON.parse(JSON.stringify(migrateSave(structuredClone(s))));
  const exported = JSON.parse(await P.exportJourney(1)).save; assert.deepEqual({ ...exported, updatedAt: 0 }, { ...want, updatedAt: 0 });
  assert.deepEqual({ ...JSON.parse(ctl.ls.get('infinite-corridor:slot-mirror:1')), updatedAt: 0 }, { ...want, updatedAt: 0 }, 'the mirror is whole');
  await P.importJourney(1, JSON.stringify(exported), true); assert.deepEqual(ctl.data.get('recovery:1:1').atlas, want.atlas, 'the recovery copy is whole');
  assert.equal(sameJourney(await (await freshPersistence()).loadSave(), migrateSave(structuredClone(exported))), null);
  await P.deleteJourney(1); assert.equal(partKeys(ctl).length, 0, 'parts go with the journey');
});

// ---------------------------------------------------------------- the store stays whole whatever a page remembers (review of 1085)
// 200 large areas and split collections, stored first by a build without packs (every area a plain record).
async function storedPlain(ctl, seed) {
  const s = bigMain(seed); s.session.areas = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`overworld:${i}:0:g1`, bigArea(i)]));
  const CS = globalThis.CompressionStream; globalThis.CompressionStream = undefined;
  try { const P0 = await freshPersistence(); P0.setActiveSlot(1); await P0.saveGame(s); await P0.flushSaves(); } finally { globalThis.CompressionStream = CS; }
  return s;
}
const quietly = async (fn) => { const w = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = w; } };
async function wholeBack(want) {
  const Q = await freshPersistence(); Q.setActiveSlot(1); const back = await Q.loadSave();
  assert.equal(Q.saveBlocked(1), null); assert.equal(Object.keys(back.session.areas).length, 200, 'every area');
  assert.equal(sameJourney({ ...back, xp: 0 }, { ...migrateSave(structuredClone(want)), xp: 0 }), null, 'the whole journey, every part');
}

test('a write that committed but was reported failed, then an urgent whole write: every area and part is still there', async () => {
  for (const urgent of [true, false]) {
    const ctl = fakeIdb(), clock = later(SAVE_DELTA_MS + 1000);
    try {
      await storedPlain(ctl, 'LIE');
      const P = await freshPersistence(); P.setActiveSlot(1); const s = await P.loadSave();
      s.xp = 1; await P.saveGame(s); await P.flushSaves(); // migrateSave compacted every area (a dead foe each), so this write puts them plain
      s.xp = 2; ctl.lie = true; await P.saveGame(s); await quietly(() => P.flushSaves().catch(() => {}));
      assert.ok(packKeys(ctl).length > 0 && plainKeys(ctl).length < 200, `that write packed buckets and committed (${packKeys(ctl).length} packs, ${plainKeys(ctl).length} plain)`);
      s.xp = 3; clock.step(); await P.saveGame(s, urgent ? { urgent: true } : {}); await P.flushSaves();
      await wholeBack(s);
    } finally { clock.done(); }
  }
});

test('two tabs on one journey: a tab that does not know the other packed areas never removes them', async () => {
  const ctl = fakeIdb(), clock = later(SAVE_DELTA_MS + 1000);
  try {
    await storedPlain(ctl, 'TABS');
    const A = await freshPersistence(), B = await freshPersistence(); A.setActiveSlot(1);
    const sa = await A.loadSave(), sb = await B.loadSave();
    for (let i = 0; i < 6; i++) { sa.xp = i + 1; await A.saveGame(sa); await A.flushSaves(); }
    assert.ok(packKeys(ctl).length >= 40, 'tab A packed');
    sb.xp = 1; await B.saveGame(sb); await B.flushSaves(); await wholeBack(sb);
    sb.xp = 2; clock.step(); await B.saveGame(sb, { urgent: true }); await B.flushSaves(); await wholeBack(sb);
    sa.xp = 9; clock.step(); await A.saveGame(sa); await A.flushSaves(); await wholeBack(sa);
    sb.xp = 3; clock.step(); await B.saveGame(sb); await B.flushSaves(); await wholeBack(sb);
  } finally { clock.done(); }
});

// Second review of 1085: another page stores the journey whole and unmarked (every area plain, its packs swept); this
// page still remembers "marked" and its next delta must not pack into a record older builds' rules then ignore.
async function smallStored(ctl, seed) {
  const s = freshSave(); s.seed = seed; s.session.areas = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`overworld:${i}:0:g1`, { ...bigArea(i), enemies: bigArea(i).enemies.map((e) => ({ ...e, dead: false, rewarded: false, hp: 9 })) }]));
  const CS = globalThis.CompressionStream; globalThis.CompressionStream = undefined;
  try { const P0 = await freshPersistence(); P0.setActiveSlot(1); await P0.saveGame(migrateSave(s)); await P0.flushSaves(); } finally { globalThis.CompressionStream = CS; }
}
async function allBack(n = 200) { const Q = await freshPersistence(); Q.setActiveSlot(1); const back = await Q.loadSave(); assert.equal(Q.saveBlocked(1), null); assert.equal(Object.keys(back.session.areas).length, n); return back; }
for (const how of ['rename', 'import', 'lie']) test(`another page stores the journey unmarked (${how}); this page's next deltas keep every area`, async () => {
  const ctl = fakeIdb(); await smallStored(ctl, `UNMARK-${how}`);
  const A = await freshPersistence(), B = await freshPersistence(); A.setActiveSlot(1); const sa = await A.loadSave(), sb = await B.loadSave();
  for (let i = 0; i < 3; i++) { sa.xp = i + 1; await A.saveGame(sa); await A.flushSaves(); }
  assert.ok(packKeys(ctl).length > 0 && ctl.data.get('journey:1').version === PACKED_AREAS.storeVersion);
  if (how === 'rename') await B.renameJourney(1, 'Renamed in B');
  else if (how === 'import') await B.importJourney(1, await B.exportJourney(1), true);
  else { sb.xp = 50; ctl.lie = true; await B.saveGame(sb); await quietly(() => B.flushSaves().catch(() => {})); sb.xp = 51; await B.saveGame(sb); await B.flushSaves(); }
  for (let i = 0; i < 4; i++) { sa.xp = 10 + i; await A.saveGame(sa, i === 3 ? { urgent: true } : {}); await A.flushSaves(); ctl.ls.clear(); await allBack(); }
  const back = await allBack(); assert.equal(back.xp, 13, 'this page\'s saves reached the store');
});

test('fuzz: two pages save, rename, import and fail at random; every area survives every step', async () => {
  for (const seed of [1, 2, 3]) {
    const ctl = fakeIdb(), clock = later(40000); await smallStored(ctl, `FUZZ-${seed}`);
    let r = seed * 7919; const rnd = (n) => (r = (r * 48271) % 2147483647) % n;
    try {
      const pages = [await freshPersistence(), await freshPersistence()]; pages[0].setActiveSlot(1);
      const saves = [await pages[0].loadSave(), await pages[1].loadSave()];
      for (let step = 0; step < 30; step++) {
        const p = rnd(2), P = pages[p], s = saves[p], what = rnd(10);
        if (what === 0) await P.renameJourney(1, `Fuzz ${step}`);
        else if (what === 1) await P.importJourney(1, await P.exportJourney(1), true);
        else if (what === 2) { saves[p] = await (pages[p] = await freshPersistence()).loadSave(); }
        else { s.xp = step; if (what === 3) s.session.areas[`overworld:${rnd(200)}:0:g1`] = { ...bigArea(step), leftAt: step }; if (what === 4) ctl.lie = true; if (rnd(4) === 0) clock.step(); await P.saveGame(s, what === 5 ? { urgent: true } : {}); await quietly(() => P.flushSaves().catch(() => {})); }
        ctl.ls.clear(); await allBack();
      }
    } finally { clock.done(); }
  }
});

// Third review of 1085: a reader held between its reads while the journey's FIRST packs are written. Transactions run
// one after another in the order they are made (as IndexedDB orders them on one store); readonly ones made from the
// `holdFrom`-th on wait for `release`.
function serialIdb() {
  const data = new Map(), ls = new Map(), ctl = { data, ls, ro: 0, holdFrom: Infinity, gate: Promise.resolve() };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r, keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  let chain = Promise.resolve();
  function transaction(_s, mode) {
    const tx = { reqs: [], settled: false }, n = mode === 'readonly' ? ++ctl.ro : 0, held = n >= ctl.holdFrom ? ctl.gate : null;
    const request = (fn) => { const q = { fn }; tx.reqs.push(q); return q; };
    tx.objectStore = () => ({ get: (k) => request(() => structuredClone(data.get(k))), put: (v, k) => { const c = structuredClone(v); return request(() => { data.set(k, c); }); }, delete: (k) => request(() => { for (const key of keysIn(k)) data.delete(key); }), getAllKeys: (r) => request(() => keysIn(r)), getAll: (r) => request(() => keysIn(r).map((k) => structuredClone(data.get(k)))) });
    tx.abort = () => { tx.settled = true; setImmediate(() => tx.onabort?.()); };
    const run = async () => { await new Promise((r) => setImmediate(r)); for (let i = 0; i < tx.reqs.length; i++) { if (tx.settled) return; const q = tx.reqs[i]; q.result = q.fn(); q.onsuccess?.(); await new Promise((r) => setImmediate(r)); } if (!tx.settled) { tx.settled = true; tx.oncomplete?.(); } };
    if (held) held.then(() => { chain = chain.then(run); }); else chain = chain.then(run);
    return tx;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => { const q = {}; setImmediate(() => { q.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, close() {}, transaction }; q.onsuccess?.(); }); return q; } };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}
for (const how of ['load', 'export', 'duplicate']) test(`${how === "export" ? "an" : "a"} ${how} held between its reads across the first pack write gets every area`, async () => {
  const ctl = serialIdb(); await smallStored(ctl, `TORN-${how}`);
  const A = await freshPersistence(); A.setActiveSlot(1); const sa = await A.loadSave(), B = how === 'load' ? await freshPersistence() : A;
  let release; ctl.gate = new Promise((r) => { release = r; }); ctl.ro = 0; ctl.holdFrom = how === 'load' ? 3 : 2;
  const reading = how === 'load' ? B.loadSave() : how === 'export' ? B.exportJourney(1).then((t) => JSON.parse(t).save) : B.duplicateJourney(1, 2);
  await new Promise((r) => setTimeout(r, 30)); // the reader is under way
  sa.xp = 1; await A.saveGame(sa); await A.flushSaves();
  assert.ok(packKeys(ctl).length > 0 && ctl.data.get('journey:1').version === PACKED_AREAS.storeVersion, 'the first packs were written');
  ctl.holdFrom = Infinity; release(); const got = await reading;
  if (how === 'duplicate') { const Q = await freshPersistence(); Q.setActiveSlot(2); assert.equal(Object.keys((await Q.loadSave()).session.areas).length, 200); return; }
  assert.equal(Object.keys(got.session.areas).length, 200);
  if (how === 'load') { got.xp = 5; await B.saveGame(got); await B.flushSaves(); ctl.ls.clear(); await allBack(); }
});

// Fourth review of 1085: two tabs sharing the main stamp through deltas. B adds an area and packs its bucket; A, which
// never saw that area, packs the same bucket; B's later saves must still find (or put back) the area.
test('two tabs sharing a main stamp: an area one adds is never lost to the other packing its bucket', async () => {
  const ctl = fakeIdb(), clock = later(SAVE_DELTA_MS + 1000); await smallStored(ctl, 'SAMESTAMP');
  try {
    { const P0 = await freshPersistence(); P0.setActiveSlot(1); const s0 = await P0.loadSave(); for (let i = 0; i < 2; i++) { s0.xp = 1 + i; await P0.saveGame(s0); await P0.flushSaves(); } }
    const A = await freshPersistence(), B = await freshPersistence(); A.setActiveSlot(1); const sa = await A.loadSave(), sb = await B.loadSave(), X = 'overworld:5010:0:g1';
    sb.session.areas[X] = bigArea(777); sb.xp = 100; await B.saveGame(sb); await B.flushSaves();
    for (let n = 0; n < 30 && ctl.data.has(`journey:1::area::${X}`); n++) { sb.xp++; await B.saveGame(sb); await B.flushSaves(); }
    for (let i = 0; i < 6; i++) { sa.xp = 10 + i; await A.saveGame(sa); await A.flushSaves(); }
    const has = async () => { ctl.ls.clear(); const Q = await freshPersistence(); Q.setActiveSlot(1); const b = await Q.loadSave(); assert.equal(Q.saveBlocked(1), null); return X in b.session.areas; };
    sb.xp = 200; await B.saveGame(sb); await B.flushSaves(); assert.equal(await has(), true, 'after B saves again');
    clock.step(); sb.xp = 300; await B.saveGame(sb); await B.flushSaves(); assert.equal(await has(), true, 'after B\'s whole write');
    for (let i = 0; i < 5; i++) { sb.xp++; await B.saveGame(sb); await B.flushSaves(); } clock.step(); sb.xp++; await B.saveGame(sb); await B.flushSaves(); assert.equal(await has(), true, 'as B plays on');
  } finally { clock.done(); }
});

test('fuzz: two tabs adding areas, urgent and whole writes, seeds 1-24: every listed area is present after every save', { timeout: 600000 }, async () => {
  for (let seed = 1; seed <= 24; seed++) {
    const ctl = fakeIdb(), clock = later(SAVE_DELTA_MS + 1000); await smallStored(ctl, `TABS-${seed}`);
    let r = seed * 2654435761 >>> 0; const rnd = () => ((r = Math.imul(r ^ (r >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
    try {
      const tabs = []; for (const name of ['A', 'B']) { const P = await freshPersistence(); P.setActiveSlot(1); tabs.push({ name, P, s: await P.loadSave(), n: 0 }); }
      for (let step = 0; step < 30; step++) {
        const t = tabs[rnd() < .5 ? 0 : 1], urgent = rnd() < .2, add = rnd() < .35; if (rnd() < .15) clock.step();
        t.s.xp = (t.s.xp || 0) + 1; if (add) { t.n++; t.s.session.areas[`overworld:${t.name === 'A' ? 1000 + t.n : 2000 + t.n}:0:g1`] = bigArea(t.n); }
        await t.P.saveGame(t.s, urgent ? { urgent: true } : {}); await quietly(() => t.P.flushSaves().catch(() => {}));
        ctl.ls.clear(); const Q = await freshPersistence(); Q.setActiveSlot(1); const back = await Q.loadSave(); assert.equal(Q.saveBlocked(1), null, `seed ${seed} step ${step}`);
        const main = ctl.data.get('journey:1'), delta = ctl.data.get('journey:1::delta'), listed = delta && delta.base === main.session.mainStamp ? delta.areas : main.session.areasSplit;
        const missing = listed.filter((k) => !(k in back.session.areas)); assert.deepEqual(missing, [], `seed ${seed} step ${step}: every listed area`);
      }
    } finally { clock.done(); }
  }
});

test('listing journeys or exporting during writes leaves the write memory alone', async () => {
  const ctl = fakeIdb(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = bigMain('LIST-WRITE'); s.session.areas = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`overworld:${i}:0:g1`, bigArea(i)]));
  await settle(P, s, 10); const main = structuredClone(ctl.data.get('journey:1'));
  for (let i = 0; i < 4; i++) { s.xp++; s.atlas[`x${i}`] = { terrain: 'new' }; const w = P.saveGame(s); const [listed] = await Promise.all([P.listJourneySlots(), P.exportJourney(1), w]); assert.equal(listed[0].health, 'healthy'); await P.flushSaves(); }
  assert.deepEqual(ctl.data.get('journey:1'), main, 'still deltas: the main record was not rewritten');
  const back = await (await freshPersistence()).loadSave(); assert.equal(sameJourney(back, migrateSave(structuredClone(s))), null);
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
  assert.equal(sameJourney(back, migrateSave(structuredClone(s))), null, 'the whole journey, main record included');
  const main = ctl.data.get('journey:1'); console.log(`# big save: main record ${(JSON.stringify(main).length / 1e6).toFixed(2)} MB; ${partKeys(ctl).length} part records ${(partKeys(ctl).reduce((n, k) => { const r = ctl.data.get(k); return n + (r.pack ? r.pack.data.length : JSON.stringify(r.plain).length); }, 0) / 1e6).toFixed(2)} MB`);
  const clock = later(SAVE_DELTA_MS + 1000); try { const Q = await freshPersistence(); Q.setActiveSlot(1); const again2 = await Q.loadSave(); again2.atlas['bench,1'] = { terrain: 'x' }; clock.step(); await Q.saveGame(again2); await Q.flushSaves(); assert.equal(ctl.data.has('journey:1::delta'), false);
    assert.equal(sameJourney(await (await freshPersistence()).loadSave(), migrateSave(structuredClone(again2))), null, 'after a whole write'); } finally { clock.done(); }
  const view = (q) => { const x = q.exportSnapshot(3000); return JSON.stringify({ ...x, updatedAt: 0, session: { ...x.session, savedAt: 0 } }); };
  assert.ok(view(new Game(back, 2000)) === view(new Game(migrateSave(structuredClone(s)), 2000)), 'the same game resumes');
});
