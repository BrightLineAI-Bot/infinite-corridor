// Release 355 (Tim, 2026-10-23): three map marks the Wayfarer sets on the Atlas, in different colours; the compass ignores them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_MARKS, toggleMapMark, normalizeMapMarks, mapMarkAt } from '../src/atlas-view.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { wayfindingTargets } from '../src/world.ts';

test('up to three marks, each its own colour; marking a marked section clears it', () => {
  const s = freshSave(); assert.deepEqual(s.mapMarks, []);
  assert.ok(toggleMapMark(s, 3, 4).ok); assert.ok(toggleMapMark(s, -9, 2).ok); assert.ok(toggleMapMark(s, 40, -41).ok);
  assert.deepEqual(s.mapMarks.map((m) => m.color), [0, 1, 2]);
  assert.equal(toggleMapMark(s, 1, 1).ok, false, 'no fourth');
  assert.ok(toggleMapMark(s, -9, 2).ok); assert.equal(mapMarkAt(s, -9, 2), null);
  toggleMapMark(s, 1, 1); assert.equal(mapMarkAt(s, 1, 1).color, 1, 'the freed colour is reused');
  assert.equal(MAP_MARKS.colors.length, MAP_MARKS.max);
});

test('marks survive a save round trip; bad entries are dropped; old saves gain none', () => {
  const s = freshSave(); toggleMapMark(s, 5, 6);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).mapMarks, [{ rx: 5, ry: 6, color: 0 }]);
  assert.deepEqual(normalizeMapMarks([{ rx: 1.5, ry: 0 }, { rx: 2, ry: 2, color: 9 }, { rx: 2, ry: 2 }, 'x', { rx: 0, ry: 0, color: 0 }, { rx: 1, ry: 1 }, { rx: 3, ry: 3 }]),
    [{ rx: 2, ry: 2, color: 0 }, { rx: 0, ry: 0, color: 1 }, { rx: 1, ry: 1, color: 2 }]);
  const old = freshSave(); delete old.mapMarks; assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(old))).mapMarks, []);
});

test('the compass never steers to a mark', () => {
  const s = freshSave(); s.seed = 'MARK'; const before = JSON.stringify(wayfindingTargets(s.seed, 0, 0, 1, s));
  toggleMapMark(s, 1, 0); toggleMapMark(s, -3, 2);
  assert.equal(JSON.stringify(wayfindingTargets(s.seed, 0, 0, 1, s)), before);
  assert.equal(s.manualWaypoint, null);
});
