// Perf spikes (Tim's r937 on-device probe, 2026-11-13): a 68 ms `update` on the frame of a section crossing, 20-30 ms
// autosave frames, and render frames whose three timed parts did not account for their cost. Each fix is checked by what
// it does (counts and equality), not by wall time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, sectionTerrain, clearSectionTerrainCache, sectionTerrainCacheStats, walkerTerrainSteps, CROSSING_WARM } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape } from '../src/landscape.ts';
import { render, renderTimings } from '../src/renderer.ts';
import { createProbe } from '../src/diagnostic-probe.ts';

const plain = (seed) => { const s = freshSave(); s.seed = seed; return JSON.parse(JSON.stringify(s)); };
const json = (v) => JSON.stringify(v);

// ---------------------------------------------------------------- the crossing
test('near an edge the next section is laid ahead, and the crossing copies it instead of generating it', () => {
  clearSectionTerrainCache();
  const s = plain('SPIKES-CROSS'); s.session.rx = 3; s.session.ry = 1;
  const g = new Game(s, 0);
  g.player.x = 16; g.player.y = 16;
  assert.deepEqual(g.crossingEdges(), [], 'mid-section: nothing to lay ahead');
  assert.equal(g.warmCrossingTerrain(), true);
  g.player.x = 32 - CROSSING_WARM.edge + .5; g.player.y = 16;
  assert.deepEqual(g.crossingEdges(), [[1, 0]]);
  const before = sectionTerrainCacheStats();
  assert.equal(g.warmCrossingTerrain(false), false, 'asking does not generate');
  assert.equal(sectionTerrainCacheStats().misses, before.misses);
  assert.equal(g.warmCrossingTerrain(), false, 'one section generated');
  assert.equal(sectionTerrainCacheStats().misses, before.misses + 1);
  assert.equal(g.warmCrossingTerrain(), true, 'and then nothing more to do');
  const ahead = sectionTerrainCacheStats();
  g.transitionSection(1, 0);
  assert.equal(`${g.rx},${g.ry}`, '4,1');
  assert.equal(sectionTerrainCacheStats().misses, ahead.misses, 'the crossing generated no terrain');
  assert.equal(sectionTerrainCacheStats().hits, ahead.hits + 1);
  // The section loaded from the laid-ahead terrain is the one a crossing without it loads.
  clearSectionTerrainCache();
  const t = plain('SPIKES-CROSS'); t.session.rx = 3; t.session.ry = 1;
  const h = new Game(t, 0); h.player.x = 32 - CROSSING_WARM.edge + .5; h.player.y = 16; h.transitionSection(1, 0);
  assert.equal(json(g.map.tiles), json(h.map.tiles));
  assert.equal(json(g.map.objects), json(h.map.objects));
  assert.equal(json(g.enemies.map((e) => [e.id, e.kind, e.x, e.y, e.hp])), json(h.enemies.map((e) => [e.id, e.kind, e.x, e.y, e.hp])));
  assert.equal(json(g.save.atlas['4,1']), json(h.save.atlas['4,1']));
});

test('a corner lays both sections ahead, one per call; no laying ahead indoors', () => {
  clearSectionTerrainCache();
  const s = plain('SPIKES-CORNER'); s.session.rx = -9; s.session.ry = 4;
  const g = new Game(s, 0); g.player.x = 1; g.player.y = 30;
  assert.deepEqual(g.crossingEdges(), [[-1, 0], [0, 1]]);
  const m0 = sectionTerrainCacheStats().misses;
  assert.equal(g.warmCrossingTerrain(), false); assert.equal(g.warmCrossingTerrain(), false); assert.equal(g.warmCrossingTerrain(), true);
  assert.equal(sectionTerrainCacheStats().misses, m0 + 2);
  g.area = 'dungeon'; assert.deepEqual(g.crossingEdges(), []); assert.equal(g.warmCrossingTerrain(), true);
});

test('the faster region and field lookups give the same terrain as a fresh module, after heavy cache use', async () => {
  const fresh = await import('../src/landscape.ts?perf-spikes-fresh');
  const seed = 'SPIKES-GEN';
  // Push the region caches through many cells (past the size where they used to trim one by one).
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const m = generateRegion(seed, 400 + x * 3, -200 + y * 3, 1); applyLandscape(m, seed, 400 + x * 3, -200 + y * 3, walkerTerrainSteps(plain(seed), 400 + x * 3, -200 + y * 3).landscape); }
  for (const [rx, ry, v] of [[68, -61, undefined], [69, -63, 21], [-12, 30, 11], [5, 5, 4], [150, 90, 24]]) {
    const steps = walkerTerrainSteps(plain(seed), rx, ry).landscape, opts = v ? { ...steps, version: v } : steps;
    const a = generateRegion(seed, rx, ry, 1); applyLandscape(a, seed, rx, ry, opts);
    const b = generateRegion(seed, rx, ry, 1); fresh.applyLandscape(b, seed, rx, ry, opts);
    assert.equal(json(a), json(b), `${rx},${ry} v${v ?? 'current'}`);
  }
});

// ---------------------------------------------------------------- the autosave
function fakeStorage() {
  const data = new Map(), ctl = { data, opens: 0, reads: [] };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction() {
    const tx = { pending: 0, settled: false };
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; tx.oncomplete?.(); }, 0);
    const request = (fn) => { const q = {}; tx.pending++; setTimeout(() => { q.result = fn(); q.onsuccess?.(); tx.pending--; settle(); }, 0); return q; };
    tx.objectStore = () => ({
      get: (k) => request(() => { ctl.reads.push(k); return structuredClone(data.get(k)); }),
      put: (v, k) => { const c = structuredClone(v); return request(() => { data.set(k, c); }); },
      delete: (k) => request(() => { for (const key of keysIn(k)) data.delete(key); }),
      getAllKeys: (r) => request(() => { ctl.reads.push(`keys:${r?.lower}`); return keysIn(r); }),
      getAll: (r) => request(() => { ctl.reads.push(`all:${r?.lower}`); return keysIn(r).map((k) => structuredClone(data.get(k))); }),
    });
    return tx;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => { ctl.opens++; const q = {}; setTimeout(() => { q.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction }; q.onsuccess?.(); }, 0); return q; } };
  const ls = new Map(); globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}
let instance = 0;
const freshPersistence = () => import(`../src/persistence.ts?perf-spikes=${++instance}`);

test('autosaves keep one database connection and do not read every area key back each time', async () => {
  const ctl = fakeStorage(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = plain('SPIKES-SAVE'); s.session.areas = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`overworld:${i}:0:g1`, { enemies: [], objects: {} }]));
  await P.saveGame(s); await P.flushSaves();
  const sweeps = () => ctl.reads.filter((k) => String(k).startsWith('keys:')).length;
  assert.equal(sweeps(), 1, 'the first (whole) write sweeps the store');
  for (let i = 0; i < 5; i++) { s.xp = i + 1; s.session.areas[`overworld:${i}:0:g1`] = { enemies: [], objects: { [`o${i}`]: { state: 'open' } } }; await P.saveGame(s); await P.flushSaves(); }
  assert.ok(ctl.data.has('journey:1::delta'), 'these were delta writes');
  assert.equal(sweeps(), 1, 'a delta write reads no keys back');
  assert.equal(ctl.opens, 1, 'one connection for every write');
  // An area that is gone has its record deleted by a delta write too.
  delete s.session.areas['overworld:7:0:g1']; s.xp = 99; await P.saveGame(s); await P.flushSaves();
  assert.equal(ctl.data.has('journey:1::area::overworld:7:0:g1'), false);
  assert.equal(sweeps(), 1);
  const back = await (await freshPersistence()).loadSave();
  assert.equal(back.xp, 99); assert.deepEqual(Object.keys(back.session.areas).sort(), Object.keys(s.session.areas).sort());
  assert.deepEqual(back.session.areas['overworld:3:0:g1'], s.session.areas['overworld:3:0:g1']);
  // A different indexedDB (as a test or a reopened page has) is opened afresh.
  const other = fakeStorage(), Q = await freshPersistence(); Q.setActiveSlot(1); await Q.saveGame(s); await Q.flushSaves();
  assert.equal(other.opens, 1); assert.ok(other.data.has('journey:1'));
});

test('snapshotSave still shares unchanged parts and matches a full copy when keys come, go or reorder', async () => {
  fakeStorage(); const P = await freshPersistence();
  const s = plain('SPIKES-SHARE'); s.worldFlags = { a: 1, b: { c: [1, 2, { d: 3 }] } }; s.session.areas = {};
  const norm = (v) => json({ ...v, updatedAt: 0 });
  const a = P.snapshotSave(s, 1), b = P.snapshotSave(s, 2);
  assert.equal(b.worldFlags, a.worldFlags, 'unchanged: the same copy'); assert.equal(b.atlas, a.atlas);
  delete s.worldFlags.a; const c = P.snapshotSave(s, 3);
  assert.deepEqual(c.worldFlags, { b: { c: [1, 2, { d: 3 }] } }); assert.equal(c.worldFlags.b, a.worldFlags.b, 'a key gone: the rest still shared');
  s.worldFlags = { b: s.worldFlags.b, a: 2 }; const d = P.snapshotSave(s, 4); assert.deepEqual(Object.keys(d.worldFlags), ['b', 'a']);
  s.worldFlags = { a: 2, b: s.worldFlags.b }; const e = P.snapshotSave(s, 5); assert.deepEqual(e.worldFlags, { a: 2, b: { c: [1, 2, { d: 3 }] } });
  s.worldFlags.constructor = 'x'; s.worldFlags.toString = 7; s.worldFlags.u = undefined; const f = P.snapshotSave(s, 6);
  assert.equal(f.worldFlags.constructor, 'x'); assert.equal(f.worldFlags.toString, 7); assert.ok(Object.hasOwn(f.worldFlags, 'u'));
  s.worldFlags.b.c[2].d = 4; const h = P.snapshotSave(s, 7);
  assert.equal(h.worldFlags.b.c[2].d, 4); assert.equal(f.worldFlags.b.c[2].d, 3, 'an earlier copy is never edited');
  assert.equal(norm(h), norm(structuredClone({ ...s, updatedAt: 7 })));
});

// ---------------------------------------------------------------- the probe sees every part of a render
function stubCtx() {
  const base = { canvas: { width: 360, height: 640 }, save() {}, restore() {}, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }) };
  return new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
}
test('a timed render resets every part first and reports the time before the ground', () => {
  const g = new Game(plain('SPIKES-RENDER'), 0); g.loadArea('overworld');
  Object.assign(renderTimings, { on: true, ground: 99, world: 99, overlay: 99, view: 99, groundImage: 99 });
  try { render(stubCtx(), g, 360, 640, 1000); } finally { renderTimings.on = false; }
  for (const k of ['ground', 'world', 'overlay', 'view', 'groundImage']) assert.ok(renderTimings[k] >= 0 && renderTimings[k] < 99, k);
  assert.ok(renderTimings.groundImage <= renderTimings.ground + 1e-9, 'the ground image is part of the ground');
});

test('the probe report carries the new render parts and the terrain a long frame generated', () => {
  let now = 0; const probe = createProbe(() => now); probe.start({});
  const parts = { ground: 2, world: 1, overlay: 1, groundImage: 1.5, view: .1, effects: .4, viewport: 0, other: 40 };
  for (let i = 0; i < 5; i++) { now += 16; probe.frame({ interval: i === 3 ? 70 : 16, phases: { render: 44.5 }, render: parts, terrain: i === 3 ? { hits: 0, misses: 1, warms: 0 } : { hits: 0, misses: 0, warms: 0 }, context: { area: 'overworld' } }); }
  const r = probe.stop(), b = r.buckets.overworld;
  for (const k of Object.keys(parts)) assert.ok(b.renderParts[k], k);
  assert.equal(b.renderParts.other.max, 40); assert.equal(b.terrainMisses, 1);
  const long = r.longFrames[0]; assert.equal(long.interval, 70); assert.deepEqual(long.terrain, { hits: 0, misses: 1, warms: 0 }); assert.equal(long.render.other, 40);
  assert.equal('terrain' in r.longFrames[1], false, 'a frame that generated nothing carries no terrain entry');
});
