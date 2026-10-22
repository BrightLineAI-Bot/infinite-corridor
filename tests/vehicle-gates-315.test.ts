// Release 315 (Tim, 2026-10-22): diving from Infinite II (tier 12); the submersible from Infinite II with the Void Walker or a
// Listener beaten; under the sea by submersible from Infinite III (tier 13) with both beaten; ashore from Infinite III and
// the second Gate; the drone from the fourth Gate. The skiff and the Tidemantle stay early.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diveGate, subGate, underwaterGate, mechGate, droneGate, VEHICLE_GATES } from '../src/vehicle-gates.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { validActions } from '../src/interactions.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { BOAT, ensureBoatState, forgeSubmersible } from '../src/boats.ts';

const at = (band, extra = {}) => { const s = freshSave(); s.perception.aperture = APERTURE_BANDS.find((b) => b.name === band).threshold; return Object.assign(s, extra); };

test('the bands are the named ones', () => {
  assert.equal(APERTURE_BANDS[VEHICLE_GATES.diveTier].name, 'Infinite II'); assert.equal(APERTURE_BANDS[VEHICLE_GATES.underwaterTier].name, 'Infinite III');
});

test('each gate opens on its own conditions', () => {
  assert.equal(diveGate(at('Infinite')).ok, false); assert.equal(diveGate(at('Infinite II')).ok, true);
  assert.equal(subGate(at('Infinite II')).ok, false, 'nothing beaten yet');
  assert.equal(subGate(at('Infinite II', { worldBeasts: { voidWalker: { slain: 1 } } })).ok, true, 'the Walker is enough');
  assert.equal(subGate(at('Infinite II', { farArray: { listeners: 1 } })).ok, true, 'or a Listener');
  assert.equal(subGate(at('Infinite', { farArray: { listeners: 1 } })).ok, false, 'but not below Infinite II');
  const both = { worldBeasts: { voidWalker: { slain: 1 } }, farArray: { listeners: 1 } };
  assert.equal(underwaterGate(at('Infinite II', both)).ok, false); assert.equal(underwaterGate(at('Infinite III', { farArray: { listeners: 1 } })).ok, false, 'needs the Walker too');
  assert.equal(underwaterGate(at('Infinite III', both)).ok, true);
  assert.equal(mechGate(at('Infinite III', { farArray: { listeners: 1 } })).ok, false); assert.equal(mechGate(at('Infinite III', { farArray: { listeners: 2 } })).ok, true, 'the second Gate');
  assert.equal(droneGate(at('Infinite III', { farArray: { listeners: 3 } })).ok, false); assert.equal(droneGate(at('Dormant', { farArray: { listeners: 4 } })).ok, true);
  assert.match(subGate(at('Dormant')).why, /Infinite II/);
});

test('the Shipwright offers the rig and buoys offer a dive only from Infinite II; the frame fits only when unlocked', () => {
  const low = at('Infinite'), high = at('Infinite II');
  for (const s of [low, high]) { s.boat = { owned: true, aboard: true, hull: BOAT.maxHull }; ensureBoatState(s); s.capabilities = { dive: true }; }
  assert.ok(!validActions({ kind: 'shipwright', actions: ['speak'] }, low).includes('buyRig')); assert.ok(validActions({ kind: 'shipwright', actions: ['speak'] }, high).includes('buyRig') || high.worldFlags?.diveRig);
  assert.deepEqual(validActions({ kind: 'diveSite', actions: ['dive'] }, low), ['inspect']); assert.deepEqual(validActions({ kind: 'diveSite', actions: ['dive'] }, high), ['dive']);
  const g = new Game(high, 0); high.materials.cinderIron = 5; forgeSubmersible(high);
  assert.equal(g.useConsumable('submersible', 0), false, 'not yet unlocked'); assert.match(g.message, /Void Walker/);
  high.worldBeasts.voidWalker.slain = 1; assert.equal(g.useConsumable('submersible', 0), true); assert.equal(high.boat.sub, true);
});
