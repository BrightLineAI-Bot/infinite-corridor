// Release 383 (Tim, 2026-10-24): the robot stays up on cinder iron; Empowered mode burns more for damage, guard and flight;
// cinder iron smelts into spheres at the Forge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MECH, MECH_POWER, ensureMech, mechAbsorb, tickMech, fuelMax, mechEmpowered } from '../src/vehicle-gates.ts';
import { SMELT, smeltSphere } from '../src/items.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const ready = (iron = 10) => { const s = freshSave(); s.seed = 'MECH'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; s.materials.cinderIron = iron; return s; };
const up = (iron) => { const s = ready(iron), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.useConsumable('submersible', 0); return { s, g }; };

test('the button cycles robot → empowered → stowed; without iron it stows straight away', () => {
  const { s, g } = up(10); assert.ok(g.mechUp());
  g.useConsumable('submersible', 0); assert.equal(mechEmpowered(s), true); assert.equal(s.materials.cinderIron, 10 - MECH_POWER.burn, 'the first iron is spent at once');
  g.useConsumable('submersible', 0); assert.equal(g.mechUp(), false); assert.equal(s.mech.empowered, undefined);
  const b = up(0); b.g.useConsumable('submersible', 0); assert.equal(b.g.mechUp(), false, 'no iron: the second press stows');
});

test('empowered burns iron on a clock, then drops back to the plain robot', () => {
  const { s, g } = up(2); g.useConsumable('submersible', 0); assert.equal(s.materials.cinderIron, 1);
  tickMech(s, MECH_POWER.every - .1, true); assert.equal(s.materials.cinderIron, 1);
  tickMech(s, .2, true); assert.equal(s.materials.cinderIron, 0); assert.equal(mechEmpowered(s), true);
  assert.equal(tickMech(s, MECH_POWER.every, true), 'spent'); assert.equal(mechEmpowered(s), false); assert.ok(g.mechUp(), 'still in the robot');
});

test('empowered: a stronger guard and twice the boost, kept across a reload', () => {
  const s = freshSave(); s.materials.cinderIron = 0; s.mech = { built: true, active: true, plate: 50, empowered: true, burnIn: 5 }; ensureMech(s);
  const r = mechAbsorb(s, 10); assert.ok(Math.abs((50 - s.mech.plate) - 10 * (1 - MECH.guard - MECH_POWER.guard)) < 1e-9);
  assert.equal(fuelMax('robot', true), MECH.boost * MECH_POWER.boost);
  const { s: a, g } = up(5);
  const before = a.materials.cinderIron; g.useConsumable('submersible', 0); assert.equal(a.materials.cinderIron, before - 1);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(a))).mech.empowered, true, 'kept across a reload');
});

test('plating that gives out is re-forged from iron; with none it folds away', () => {
  const s = freshSave(); s.materials.cinderIron = MECH_POWER.replate; s.mech = { built: true, active: true, plate: 5 }; ensureMech(s); assert.equal(MECH_POWER.replate, 3, 'release 391: three cinder iron');
  const r = mechAbsorb(s, 20); assert.equal(r.stripped, true); assert.equal(s.mech.active, true); assert.equal(s.materials.cinderIron, 0);
  tickMech(s, MECH_POWER.replateDelay + .1, true); assert.equal(s.mech.plate, MECH.plate, 'release 599: re-forged after a delay');
  s.mech.plate = 5; const r2 = mechAbsorb(s, 20); assert.equal(r2.broke, true); assert.equal(s.mech.active, false); assert.equal(s.mech.cooldown, MECH.rebuild);
});

test('five cinder iron smelt into a weapon or an armor sphere', () => {
  const s = freshSave(); s.materials.cinderIron = SMELT.cost * 2 - 1;
  assert.equal(smeltSphere(s, 'weaponSphere').ok, true); assert.equal(s.materials.weaponSphere, (freshSave().materials.weaponSphere || 0) + 1);
  assert.equal(smeltSphere(s, 'armorSphere').ok, false); assert.equal(s.materials.cinderIron, SMELT.cost - 1);
  s.materials.cinderIron += 1; assert.equal(smeltSphere(s, 'armorSphere').ok, true); assert.equal(s.materials.cinderIron, 0);
});
