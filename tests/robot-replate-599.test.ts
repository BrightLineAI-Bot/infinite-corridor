// Release 599 (Tim, 2026-10-30, taking the recommendation): the robot re-plated the instant its plating broke, so with a large
// stock of cinder iron nothing could hurt the Wayfarer. Re-forging now takes MECH_POWER.replateDelay seconds, and until then
// blows reach the Wayfarer (softened only by the robot's guard).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { MECH, MECH_POWER, ensureMech, mechAbsorb, tickMech } from '../src/vehicle-gates.ts';

const robot = () => { const s = freshSave(); s.materials.cinderIron = 37667; s.mech = { built: true, active: true, plate: 4 }; ensureMech(s); return s; };

test('the plating gives out: iron is spent, and for the delay blows land on the Wayfarer', () => {
  const s = robot(), r = mechAbsorb(s, 20);
  assert.equal(r.stripped, true); assert.equal(s.mech.plate, 0); assert.equal(s.mech.replateIn, MECH_POWER.replateDelay); assert.equal(s.materials.cinderIron, 37667 - MECH_POWER.replate);
  const hit = mechAbsorb(s, 50); assert.equal(hit.bare, true); assert.ok(Math.abs(hit.kept - 50 * (1 - MECH.guard)) < 1e-9, 'only the guard softens it');
  assert.equal(s.materials.cinderIron, 37667 - MECH_POWER.replate, 'no second re-forge while bare');
  tickMech(s, MECH_POWER.replateDelay / 2, true); assert.equal(mechAbsorb(s, 10).bare, true, 'still bare halfway');
  assert.equal(tickMech(s, MECH_POWER.replateDelay / 2 + .01, true), 'replated'); assert.equal(s.mech.plate, MECH.plate); assert.equal(s.mech.replateIn, undefined);
  const after = mechAbsorb(s, 10); assert.equal(after.kept, 0, 'whole plating takes the blow again');
});

test('a bare robot is remembered through a save; a folded-away robot forgets it', () => {
  const s = robot(); mechAbsorb(s, 20); tickMech(s, 5, true);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(Math.abs(back.mech.replateIn - (MECH_POWER.replateDelay - 5)) < 1e-9);
  s.mech.active = false; tickMech(s, .1, true); assert.equal(s.mech.replateIn, undefined);
});
