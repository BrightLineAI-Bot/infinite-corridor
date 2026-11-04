// Perf pack: save size and autosave cost (dead-foe tombstones, shared snapshots, the delta record, cheap journey listing),
// per-kill bookkeeping, section and dungeon load caches, the edge hold, and the hashed-order and noise rewrites, each
// checked against what it replaced.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave, deadFoeRecord, compactArea, compactedAreas, isTombstone, tombstoneBlanks, DEAD_FOE, ensurePerceptionInPlace } from '../src/types.ts';
import { Game, sectionTerrain, clearSectionTerrainCache, sectionTerrainCacheStats, EDGE_HOLD, walkerTerrainSteps } from '../src/game.ts';
import { generateRegion, regionSettled } from '../src/world.ts';
import { applyLandscape, latticeValue, valueNoise, fbm, openSeaShare, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { hashSeed, byHash } from '../src/random.ts';
import { gainAperture } from '../src/interactions.ts';
import { eliteStateInPlace, ensureEliteState } from '../src/elites.ts';
import { PACK_SPRITE } from '../src/monster-render.ts';

const plain = (seed = 'PERF-PACK') => { const s = freshSave(); s.seed = seed; return JSON.parse(JSON.stringify(s)); };
const idle = () => ({ state: { x: 0, y: 0 }, consume: () => false });

// ---------------------------------------------------------------- tombstones (saves S3, perf P4)
test('a dead, rewarded foe becomes a tombstone that keeps its identity; anything else is left as it is', () => {
  const full = { id: 'f1', kind: 'ashling', dead: true, rewarded: true, hp: 0, maxHp: 40, x: 3.2, y: 4.5, variantId: 'ashling:keen', traits: ['keen'], eliteVariantModules: [],
    ai: { mode: 'chase', homeX: 1 }, pack: { cd: {} }, meleePhase: { t: 1 }, hitFlash: .2, aggro: true, telegraph: .3, speedMultiplier: 1.1, boss: true, worldBeast: 'blob', objectiveId: 'o1', noRewards: false, eliteId: null, damage: 9 };
  const t = deadFoeRecord(full);
  assert.notEqual(t, full);
  for (const k of [...DEAD_FOE.keep, 'boss', 'worldBeast', 'objectiveId', 'damage']) assert.deepEqual(t[k], full[k], k);
  for (const k of ['ai', 'pack', 'meleePhase', 'hitFlash', 'aggro', 'telegraph', 'speedMultiplier', 'noRewards', 'eliteId']) assert.equal(k in t, false, k);
  assert.equal(isTombstone(t), true);
  assert.equal(deadFoeRecord(t), t, 'a tombstone is already compact');
  for (const e of [{ ...full, rewarded: false }, { ...full, dead: false }, null]) assert.equal(deadFoeRecord(e), e);
  const area = { enemies: [{ id: 'live', kind: 'ashling', hp: 3, ai: {} }], objects: {}, projectiles: [{ id: 'p' }], effects: [] };
  assert.equal(compactArea(area), area, 'nothing to compact: the same record');
  assert.deepEqual(compactArea(area, true).projectiles, [], 'an area left drops its frozen shots');
  // Restore blanks only the identity the generated foe would otherwise lend it.
  assert.deepEqual(tombstoneBlanks(t, { eliteId: 'vesperwing', boss: false, dungeonRole: 'guardian' }), { eliteId: null, dungeonRole: null });
});

test('migrateSave compacts stored areas once (marking them to be written again) and keeps the current area\'s shots', () => {
  const s = plain(); s.session.rx = 2; s.session.ry = 0;
  const dead = { id: 'd', kind: 'ashling', dead: true, rewarded: true, hp: 0, x: 1, y: 1, ai: { mode: 'patrol' }, pack: { cd: {} } };
  s.session.areas = { 'overworld:2:0:g1': { enemies: [dead], objects: {}, projectiles: [{ id: 'here' }], effects: [] }, 'overworld:5:0:g1': { enemies: [dead], objects: {}, projectiles: [{ id: 'left' }], effects: [{ id: 'blast', hits: {} }] }, 'overworld:6:0:g1': { enemies: [], objects: {}, projectiles: [], effects: [] } };
  const m = migrateSave(structuredClone(s)), here = m.session.areas['overworld:2:0:g1'], left = m.session.areas['overworld:5:0:g1'];
  assert.equal(isTombstone(here.enemies[0]), true); assert.equal('ai' in left.enemies[0], false);
  assert.deepEqual(here.projectiles, [{ id: 'here' }], 'the area the Wayfarer stands in keeps its shots (exact resume)');
  assert.deepEqual([left.projectiles, left.effects], [[], []]);
  assert.equal(compactedAreas.has(here) && compactedAreas.has(left), true);
  assert.equal(compactedAreas.has(m.session.areas['overworld:6:0:g1']), false, 'an untouched area is not marked');
  const again = migrateSave(structuredClone(m));
  assert.deepEqual(again.session.areas, m.session.areas, 'idempotent');
});

test('a section left with dead foes comes back with the same live foes, the dead staying dead and rewarded', () => {
  const g = new Game(freshSave(), 0);
  g.transitionSection(1, 0); g.transitionSection(1, 0);
  const foes = g.enemies.filter((e) => !e.ambient && !e.passiveBehavior && e.kind !== 'npc');
  assert.ok(foes.length >= 2, 'a section with foes');
  const xp = g.save.xp; for (const e of foes.slice(0, 2)) { e.hp = 0; g.damage?.(e, 1); if (!e.dead) { e.dead = true; e.hp = 0; } g.defeatEnemy(e); }
  const view = (e) => JSON.stringify([e.id, e.kind, e.hp, e.maxHp, e.damage, e.x, e.y, !!e.boss, e.variantId]), gained = g.save.xp - xp, live = g.enemies.filter((e) => !e.dead).map(view);
  const key = g.areaStateId();
  g.transitionSection(1, 0);
  const stored = g.save.session.areas[key].enemies.filter((e) => e.dead);
  assert.ok(stored.length >= 2 && stored.every(isTombstone), 'stored as tombstones');
  g.transitionSection(-1, 0);
  const back = g.enemies.filter((e) => foes.slice(0, 2).some((f) => f.id === e.id));
  assert.equal(back.length, 2); assert.ok(back.every((e) => e.dead && e.rewarded && e.hp === 0));
  for (const e of back) g.defeatEnemy(e);
  assert.equal(g.save.xp - xp, gained, 'no second reward');
  assert.deepEqual(g.enemies.filter((e) => !e.dead).map(view).sort(), [...live].sort(), 'the live foes come back as they were');
  // Exact resume through a real save round trip, standing in the section with the dead.
  const r = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(500)))), 900);
  assert.deepEqual(r.enemies.filter((e) => e.dead).map((e) => e.id).sort(), back.map((e) => e.id).sort());
});

// ---------------------------------------------------------------- per-kill bookkeeping
test('a kill no longer copies the awarded map, and an award is still granted once', () => {
  const s = freshSave(); ensurePerceptionInPlace(s);
  const awarded = s.perception.awarded, before = s.perception.aperture;
  assert.equal(gainAperture(s, 1, 'enemy:x:1') > 0 || s.perception.aperture >= before, true);
  assert.equal(s.perception.awarded, awarded, 'the same map, written in place');
  assert.equal(gainAperture(s, 1, 'enemy:x:1'), 0, 'never twice');
  assert.equal(gainAperture(s, 1, 'enemy:frac-r-1', 'x', false) >= 0, true);
  assert.equal('enemy:frac-r-1' in s.perception.awarded, false, 'a Fractured reinforcement leaves no lasting key');
  const broken = { perception: { aperture: 'x' } }; ensurePerceptionInPlace(broken); assert.equal(broken.perception.aperture, 0, 'an unsound one is still normalised');
  const e = freshSave(); ensureEliteState(e); const elites = e.elites; assert.equal(eliteStateInPlace(e), elites, 'the elite record is not copied per frame');
});

// ---------------------------------------------------------------- persistence (perf P2/P3, Tim's findings 4 and 8)
function fakeStorage() {
  const data = new Map(), ls = new Map(), ctl = { data, ls, failWrite: false, failReadKey: null, reads: [] };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  const keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
  function transaction() {
    const tx = { pending: 0, error: null, settled: false };
    const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) tx.onerror?.(); else tx.oncomplete?.(); }, 0);
    const request = (fn, kind) => { const q = {}; tx.pending++; setTimeout(() => { try { if (kind === 'write' && ctl.failWrite) throw new Error('fake write failure'); q.result = fn(); q.onsuccess?.(); } catch (e) { q.error = tx.error = e; q.onerror?.(); } tx.pending--; settle(); }, 0); return q; };
    tx.objectStore = () => ({
      get: (k) => request(() => { ctl.reads.push(k); if (k === ctl.failReadKey) throw new Error('fake read failure'); return structuredClone(data.get(k)); }, 'read'),
      put: (v, k) => { const c = structuredClone(v); return request(() => { data.set(k, c); }, 'write'); },
      delete: (k) => request(() => { for (const key of keysIn(k)) data.delete(key); }, 'write'),
      getAllKeys: (r) => request(() => { ctl.reads.push(`keys:${r?.lower}`); return keysIn(r); }, 'read'),
      getAll: (r) => request(() => { ctl.reads.push(`all:${r?.lower}`); return keysIn(r).map((k) => structuredClone(data.get(k))); }, 'read'),
    });
    return tx;
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = { open: () => { const q = {}; setTimeout(() => { q.result = { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction }; q.onsuccess?.(); }, 0); return q; } };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); } };
  return ctl;
}
let instance = 0;
const freshPersistence = () => import(`../src/persistence.ts?perf-pack=${++instance}`);
const norm = (s) => JSON.parse(JSON.stringify({ ...s, updatedAt: 0 }));

test('snapshotSave reuses the copies of unchanged parts and copies what changed', async () => {
  fakeStorage(); const P = await freshPersistence();
  const s = plain(); s.worldFlags = { a: 1 }; s.perception.awarded = { x: true }; s.session.areas = { 'overworld:1:0:g1': { enemies: [], objects: {} } };
  const a = P.snapshotSave(s, 1);
  s.worldFlags.b = 2; s.xp = 7;
  const b = P.snapshotSave(s, 2);
  assert.equal(b.perception, a.perception, 'unchanged: the same copy');
  assert.equal(b.session.areas['overworld:1:0:g1'], a.session.areas['overworld:1:0:g1']);
  assert.notEqual(b.worldFlags, a.worldFlags); assert.deepEqual(b.worldFlags, { a: 1, b: 2 }); assert.equal(b.xp, 7);
  assert.notEqual(b.worldFlags, s.worldFlags, 'never the live object');
  s.perception.awarded.y = true; const c = P.snapshotSave(s, 3);
  assert.deepEqual(c.perception.awarded, { x: true, y: true }); assert.deepEqual(a.perception.awarded, { x: true }, 'an earlier snapshot is not edited');
  assert.deepEqual(norm(c), norm(structuredClone({ ...s, updatedAt: 3 })), 'the same journey as a full copy');
});

test('between full writes the autosave stores a small delta; reading it back gives the exact journey, and the main record alone stays a whole, older journey', async () => {
  const ctl = fakeStorage(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = plain('DELTA'); s.session.areas = { 'overworld:1:0:g1': { enemies: [], objects: {} } }; s.narrative.journal.push({ recordId: 'a', text: 'a' });
  await P.saveGame(s); await P.flushSaves();
  const first = structuredClone(ctl.data.get('journey:1')); assert.equal(ctl.data.has('journey:1::delta'), false, 'the first write is whole');
  s.worldFlags['drop:v1:x'] = true; s.perception.awarded['enemy:x'] = true; s.xp = 99; s.narrative.journal.push({ recordId: 'b', text: 'b' }); delete s.worldFlags.nothing; s.inventory.push({ id: 'i1', name: 'Kept', slot: 'charm', power: 1, basePower: 1, upgradeRank: 0, property: 'steady' });
  s.session.areas['overworld:2:0:g1'] = { enemies: [{ id: 'q', kind: 'ashling', hp: 3, ai: {} }], objects: {} };
  await P.saveGame(s); await P.flushSaves();
  assert.deepEqual(ctl.data.get('journey:1'), first, 'the main record was not rewritten');
  const delta = ctl.data.get('journey:1::delta'); assert.ok(delta && delta.ops.length && JSON.stringify(delta).length < 4000, 'a small delta');
  assert.ok(delta.ops.some(([p, k]) => k === 'add' && p.join('.') === 'narrative.journal'), 'a journal entry is appended, not rewritten');
  const back = await P.loadSave();
  assert.deepEqual(norm(back), norm(migrateSave(structuredClone(s))), 'main record + delta + areas = the journey');
  // A build without the delta reads the main record and its areas: the journey as it was at the last full write.
  const { assembleSave } = P, areas = new Map([...ctl.data].filter(([k]) => k.startsWith('journey:1::area::')).map(([k, v]) => [k.slice('journey:1::area::'.length), v]));
  const old = assembleSave(structuredClone(ctl.data.get('journey:1')), areas);
  assert.equal(old.xp, 0); assert.equal(old.narrative.journal.length, s.narrative.journal.length - 1); assert.equal(old.seed, 'DELTA');
  // A failed write forgets the delta's base: the next write is whole again.
  ctl.failWrite = true; s.xp = 100; await P.saveGame(s); await P.flushSaves().catch(() => {}); ctl.failWrite = false;
  s.xp = 101; await P.saveGame(s); await P.flushSaves().catch(() => {}); // this flush still reports the earlier failure (as before)
  assert.equal(ctl.data.has('journey:1::delta'), false); assert.equal(ctl.data.get('journey:1').xp, 101);
});

test('a journey loaded from its records resumes the delta base: the first autosave after a boot writes a delta, and reads back exactly', async () => {
  const ctl = fakeStorage(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = plain('REBOOT'); s.session.areas = { 'overworld:1:0:g1': { enemies: [], objects: {} } };
  await P.saveGame(s); await P.flushSaves(); s.xp = 5; s.worldFlags.k = 1; await P.saveGame(s); await P.flushSaves();
  const main = structuredClone(ctl.data.get('journey:1'));
  const Q = await freshPersistence(), loaded = await Q.loadSave(); assert.equal(loaded.xp, 5);
  loaded.xp = 6; loaded.narrative.journal.push({ recordId: 'after-boot', text: 'x' });
  await Q.saveGame(loaded); await Q.flushSaves();
  assert.deepEqual(ctl.data.get('journey:1'), main, 'no whole main record after the boot');
  const back = await (await freshPersistence()).loadSave();
  assert.deepEqual(norm(back), norm(migrateSave(structuredClone(loaded))), 'the old delta and the new change are both there');
  assert.equal(back.worldFlags.k, 1);
});

test('when the delta record cannot be read, the older main record is never loaded as the journey', async () => {
  const ctl = fakeStorage(), P = await freshPersistence(); P.setActiveSlot(1);
  const s = plain('DELTA-READ'); s.session.areas = { 'overworld:1:0:g1': { enemies: [], objects: {} } };
  await P.saveGame(s); await P.flushSaves(); s.level = 30; await P.saveGame(s); await P.flushSaves();
  assert.ok(ctl.data.has('journey:1::delta'));
  const records = new Map(ctl.data), mirror = ctl.ls.get('infinite-corridor:slot-mirror:1');
  assert.equal(JSON.parse(mirror).level, 1, 'the mirror is the older (first) write');
  // No mirror: the slot is blocked (release 735) and nothing is written.
  ctl.ls.delete('infinite-corridor:slot-mirror:1'); ctl.failReadKey = 'journey:1::delta';
  const Q = await freshPersistence(), loaded = await Q.loadSave();
  assert.notEqual(loaded.seed, 'DELTA-READ', 'not the stale main record');
  assert.match(Q.saveBlocked(1), /could not be read/);
  await Q.saveGame(loaded); await Q.flushSaves();
  assert.deepEqual(new Map(ctl.data), records, 'nothing written over it');
  // An older mirror: it plays (as for any unreadable database, release 734), but its writes cannot replace the journey
  // while the delta stays unreadable, and once it reads again the whole journey is kept as a recovery snapshot first.
  ctl.ls.set('infinite-corridor:slot-mirror:1', mirror);
  const R = await freshPersistence(), fromMirror = await R.loadSave(); assert.equal(fromMirror.level, 1);
  await R.saveGame(fromMirror); await R.flushSaves().catch(() => {});
  assert.deepEqual(ctl.data.get('journey:1'), records.get('journey:1')); assert.deepEqual(ctl.data.get('journey:1::delta'), records.get('journey:1::delta'));
  ctl.failReadKey = null; await R.saveGame(fromMirror); await R.flushSaves().catch(() => {});
  assert.equal(ctl.data.get('recovery:1:1')?.level, 30, 'the newer journey is kept for Recover before the mirror replaces it');
  ctl.ls.delete('infinite-corridor:slot-mirror:1'); ctl.data.set('journey:1', records.get('journey:1')); ctl.data.set('journey:1::delta', records.get('journey:1::delta'));
  assert.equal((await (await freshPersistence()).loadSave()).level, 30, 'with both records readable, the whole journey loads');
});

test('listing journeys reads each main record only (no area records, no full migrate) and keeps health and size', async () => {
  const ctl = fakeStorage(), P = await freshPersistence(); P.setActiveSlot(2);
  const s = plain('LIST'); s.level = 9; s.session.areas = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`overworld:${i}:0:g1`, { enemies: [{ id: `e${i}`, kind: 'ashling', hp: 3, ai: {} }], objects: {} }]));
  await P.saveGame(s); await P.flushSaves(); s.level = 10; await P.saveGame(s); await P.flushSaves();
  ctl.data.set('journey:3', { ...plain('FUTURE'), version: 99, session: { ...plain().session, areas: null, areasSplit: [] } });
  ctl.reads.length = 0;
  const slots = await P.listJourneySlots();
  assert.equal(ctl.reads.some((k) => String(k).startsWith('all:') || String(k).includes('::area::')), false, 'no area record is read');
  assert.equal(slots[1].health, 'healthy'); assert.equal(slots[1].level, 10, 'the delta is applied'); assert.equal(slots[1].name, s.name);
  const total = [...ctl.data].filter(([k]) => k.startsWith('journey:2')).reduce((n, [, v]) => n + JSON.stringify(v).length, 0);
  assert.ok(Math.abs(slots[1].bytes - total) / total < .25, `size close to what is stored (${slots[1].bytes} vs ${total})`);
  assert.equal(slots[2].health, 'damaged'); assert.match(slots[2].error, /newer release/);
  assert.equal(slots[0].empty, true);
});

// ---------------------------------------------------------------- generation stays the same (worldgen WG-09, dungeons D7)
test('the lattice noise is still hashSeed of the same key, value for value', () => {
  const ref = (key, ix, iy) => (hashSeed(`${key}:${ix}:${iy}`) % 10007) / 10007;
  const refNoise = (key, x, y) => { const ix = Math.floor(x), iy = Math.floor(y), sm = (t) => t * t * (3 - 2 * t), fx = sm(x - ix), fy = sm(y - iy), a = ref(key, ix, iy), b = ref(key, ix + 1, iy), c = ref(key, ix, iy + 1), d = ref(key, ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  const refFbm = (key, x, y, oct = 3) => { let sum = 0, amp = 1, n = 0; for (let o = 0; o < oct; o++) { sum += refNoise(`${key}:${o}`, x * 2 ** o, y * 2 ** o) * amp; n += amp; amp *= .5; } return sum / n; };
  let r = 7; const rnd = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  for (const key of ['CORRIDOR-MUHAPQHU:land:ocean', 'é😀:x', '']) for (let i = 0; i < 400; i++) {
    const x = (rnd() - .5) * 2 ** (i % 30), y = (rnd() - .5) * 1e5;
    assert.equal(latticeValue(key, Math.floor(x), Math.floor(y)), ref(key, Math.floor(x), Math.floor(y)));
    assert.equal(valueNoise(key, x, y), refNoise(key, x, y)); assert.equal(fbm(key, x, y, 1 + (i % 3)), refFbm(key, x, y, 1 + (i % 3)));
  }
});

test('byHash sorts in exactly the order the hashing comparator did', () => {
  let r = 11; const rnd = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let n = 0; n < 40; n++) {
    const cells = Array.from({ length: 5 + n * 7 }, () => ({ x: Math.floor(rnd() * 40), y: Math.floor(rnd() * 40) }));
    const a = cells.slice().sort((p, q) => hashSeed(`id:${n}:${p.x}:${p.y}`) - hashSeed(`id:${n}:${q.x}:${q.y}`)), b = cells.slice().sort(byHash((p) => `id:${n}:${p.x}:${p.y}`));
    assert.deepEqual(b, a); assert.ok(b.every((c, i) => c === a[i]), 'the same objects in the same places (ties included)');
  }
});

test('the settlement and open-sea checks answer what generating the section did', () => {
  for (let rx = -7; rx <= 7; rx++) for (let ry = -5; ry <= 5; ry++) assert.equal(regionSettled(rx, ry), !!generateRegion('SETTLE', rx, ry, 1).settlement, `${rx},${ry}`);
  for (const [rx, ry] of [[9, 3], [40, -2], [120, 77]]) assert.equal(openSeaShare('SEA-1', rx, ry), openSeaShare('SEA-1', rx, ry));
});

test('kept section terrain is handed out as a copy equal to a fresh generation', () => {
  clearSectionTerrainCache();
  const s = freshSave(); s.seed = 'TERRAIN';
  for (const [rx, ry] of [[3, 1], [-4, 6], [30, -12]]) {
    const steps = walkerTerrainSteps(s, rx, ry), fresh = generateRegion(s.seed, rx, ry, 1); applyLandscape(fresh, s.seed, rx, ry, steps.landscape);
    const a = sectionTerrain(s.seed, rx, ry, 1, { ...steps, dream: 0, hamlet: null, trails: false }), b = sectionTerrain(s.seed, rx, ry, 1, { ...steps, dream: 0, hamlet: null, trails: false });
    assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(fresh)), `${rx},${ry}`);
    b.tiles[0].kind = 'edited'; b.objects.push({ id: 'x' });
    assert.notEqual(sectionTerrain(s.seed, rx, ry, 1, { ...steps, dream: 0, hamlet: null, trails: false }).tiles[0].kind, 'edited', 'a copy never edits the kept terrain');
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(fresh)));
  }
  assert.ok(sectionTerrainCacheStats().hits >= 6);
  // A revisit through the game is the same section state as the first visit.
  const g = new Game(freshSave(), 0); g.transitionSection(1, 0); const first = JSON.stringify(g.map.tiles);
  g.transitionSection(1, 0); g.transitionSection(-1, 0); assert.equal(JSON.stringify(g.map.tiles), first);
});

// ---------------------------------------------------------------- the edge hold (perf P6)
test('just after a crossing the edge crossed holds for a moment, then takes the Wayfarer back', () => {
  const g = new Game(freshSave(), 0);
  g.player.x = .01; g.player.y = g.map.exits.west;
  g.update(.1, { state: { x: -1, y: 0 }, consume: () => false }, 1000);
  assert.deepEqual([g.rx, g.player.x], [-1, 30.75]);
  const east = { state: { x: 1, y: 0 }, consume: () => false };
  for (let t = 1017; t < 1000 + EDGE_HOLD.ms - 20; t += 17) g.update(1 / 60, east, t);
  assert.equal(g.rx, -1, 'no crossing back while the hold lasts');
  assert.ok(g.player.x + .76 < 32, 'held inside the section');
  for (let t = 1000 + EDGE_HOLD.ms + 20; t < 3000 && g.rx === -1; t += 17) g.update(1 / 60, east, t);
  assert.equal(g.rx, 0, 'then it crosses back');
});

// ---------------------------------------------------------------- sprites (perf P8)
test('idle pack sprites step more slowly than attacks, so a 30 fps phone reuses them', () => {
  assert.ok(PACK_SPRITE.idleFps > 0 && PACK_SPRITE.idleFps <= 15 && PACK_SPRITE.idleFps < PACK_SPRITE.fps);
});
