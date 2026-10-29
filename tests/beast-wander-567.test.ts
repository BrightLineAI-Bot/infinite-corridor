// Release 567 (Tim, 2026-10-29: "I have never... seen the tremor worm yet"): a world beast that claimed a section the
// Wayfarer only passed through lets it go after BEAST_WANDER.after sections elsewhere; one that has been fought stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { walkerCrossingMap } from '../src/game.ts';
import { worldBeastFor, ensureWorldBeasts, BEAST_WANDER } from '../src/world-beasts.ts';

const visit = (s, rx, ry) => worldBeastFor(s, walkerCrossingMap(s, rx, ry), rx, ry);
test('an unfought beast moves on; a fought one keeps its ground', () => {
  const s = freshSave(); s.seed = 'WANDER'; s.perception.aperture = 10810; ensureWorldBeasts(s);
  s.worldBeasts.tremorWorm.active = { rx: 40, ry: 40, tries: 0 }; s.worldBeasts.morphingBlob.active = { rx: 41, ry: 40, tries: 1 };
  for (let i = 0; i < BEAST_WANDER.after - 1; i++) visit(s, 60 + i, -60);
  assert.ok(s.worldBeasts.tremorWorm.active, 'still holding before the count');
  const cycle = s.worldBeasts.tremorWorm.cycle; visit(s, 90, -60);
  assert.equal(s.worldBeasts.tremorWorm.active?.rx === 40, false, 'it let its section go'); assert.ok(s.worldBeasts.tremorWorm.cycle > cycle, 'a new roll');
  assert.deepEqual([s.worldBeasts.morphingBlob.active.rx, s.worldBeasts.morphingBlob.active.ry], [41, 40], 'a beast that has fought you waits');
});
test('returning to its section resets the count', () => {
  const s = freshSave(); s.seed = 'WANDER2'; s.perception.aperture = 10810; ensureWorldBeasts(s);
  s.worldBeasts.tremorWorm.active = { rx: 40, ry: 40, tries: 0 };
  for (let i = 0; i < BEAST_WANDER.after - 2; i++) visit(s, 60 + i, -60);
  visit(s, 40, 40); assert.equal(s.worldBeasts.tremorWorm.active.away, undefined);
  for (let i = 0; i < BEAST_WANDER.after - 2; i++) visit(s, 60 + i, -61);
  assert.deepEqual([s.worldBeasts.tremorWorm.active.rx, s.worldBeasts.tremorWorm.active.ry], [40, 40]);
});
