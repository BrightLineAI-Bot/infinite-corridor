// Release 555 (Tim's probe: ~80-100 ms freezes every 8 s, outside the game's frame work): the database copied the whole
// journey on every autosave. A journey is now stored as a main record plus one record per area; an autosave writes only
// the areas that changed. The probe also records the browser's long frames, the heap and every save write.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { splitSnapshot, assembleSave, snapshotSave, AREA_SPLIT } from '../src/persistence.ts';
import { createProbe } from '../src/diagnostic-probe.ts';

const journey = () => { const s = freshSave(); s.seed = 'SPLIT'; s.session.areas = { 'overworld:0:0:g1': { enemies: [{ id: 'a', hp: 3 }], objects: [] }, 'dungeon:x': { enemies: [], objects: [{ id: 'chest', state: 'open' }] } }; return s; };

test('split and put back together: the same journey; the main record carries no areas', () => {
  const s = journey(), { main, puts, keys } = splitSnapshot(s);
  assert.equal(main.session.areas, null); assert.deepEqual(main.session[AREA_SPLIT], keys); assert.equal(puts.length, 2);
  const back = assembleSave(main, new Map(puts));
  assert.deepEqual(back.session.areas, s.session.areas); assert.equal(AREA_SPLIT in back.session, false);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(back))).session.areas, s.session.areas);
});

test('an autosave writes only the areas whose copy changed, and a removed area drops out', () => {
  const s = journey(), first = snapshotSave(s), a = splitSnapshot(first);
  const known = new Map(a.keys.map((k) => [k, first.session.areas[k]]));
  const again = splitSnapshot(snapshotSave(s), known); assert.equal(again.puts.length, 0, 'nothing changed: no area written');
  s.session.areas['dungeon:x'] = { enemies: [], objects: [] }; delete s.session.areas['overworld:0:0:g1'];
  const changed = splitSnapshot(snapshotSave(s), known); assert.deepEqual(changed.puts.map(([k]) => k), ['dungeon:x']); assert.deepEqual(changed.keys, ['dungeon:x']);
});

test('a record from before 555 (areas inside) reads unchanged; a missing area record is simply absent', () => {
  const old = journey(); assert.equal(assembleSave(old), old);
  const { main } = splitSnapshot(journey()); assert.deepEqual(Object.keys(assembleSave(main, new Map([['dungeon:x', { enemies: [] }]])).session.areas), ['dungeon:x']);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(main))).session.areas, {}, 'an older release reading a split record gets empty areas, not a crash');
});

test('the probe reports the browser long frames, the save writes, and no heap where the browser gives none', () => {
  let now = 0; const p = createProbe(() => now); p.start({});
  p.frame({ interval: 16, phases: {}, context: { area: 'dungeon' } });
  p.loaf({ startTime: 500, duration: 90, blockingDuration: 40, renderStart: 560, styleAndLayoutStart: 570, scripts: [{ duration: 30, invoker: 'IDBRequest.onsuccess', invokerType: 'event-listener', sourceFunctionName: 'writeJourney', sourceURL: 'https://x/src/persistence.js?v=1' }] });
  p.loaf({ startTime: 600, duration: 20 }); // too short to keep
  p.save({ ms: 4.2, areas: 1, of: 300 });
  now = 1000; const r = p.stop();
  assert.equal(r.loafs.length, 1); assert.equal(r.loafs[0].render, 30); assert.equal(r.loafs[0].scripts[0].src, 'persistence.js');
  assert.deepEqual(r.saves, [{ t: 0, ms: 4.2, areas: 1, of: 300 }]); assert.equal(r.heap, null);
});
