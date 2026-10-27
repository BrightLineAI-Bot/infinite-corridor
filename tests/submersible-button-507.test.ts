// Release 507 (Tim, 2026-10-27): "Something's broken with a submersible. I have it set on an item... I'm pressing it and
// nothing's happening... make sure that the submersible suit works very well". Building the robot spends the frame (count 0),
// and the item button then answered "None left." It now drives the robot through its whole cycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { setPresetButton, assignPresetItem } from '../src/spell-slots.ts';

const ready = () => { const s = freshSave(); s.seed = 'SUB'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; return s; };
const pressBuild = (g, t) => { let used = false; g.update(.05, { state: { x: 0, y: 0 }, consume: (k) => k === 'build' && !used && (used = true), held: () => false }, t); };

test('the Build button as the submersible item: build, call up, empower, stow, call up again', () => {
  const s = ready(); s.materials = { ...(s.materials || {}), cinderIron: 5 }; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  setPresetButton(s, 0, 'item'); assignPresetItem(s, 0, 'submersible');
  let t = 1000; pressBuild(g, t); assert.ok(g.mechUp(), `built and up: ${g.message}`); assert.equal(s.consumables.submersible, 0, 'the frame is spent');
  t += 100; pressBuild(g, t); assert.equal(s.mech.empowered, true, `empowered: ${g.message}`);
  t += 100; pressBuild(g, t); assert.equal(g.mechUp(), false, `stowed: ${g.message}`);
  t += 100; pressBuild(g, t); assert.ok(g.mechUp(), `called up again with no frame left: ${g.message}`); assert.notEqual(g.message, 'None left.');
});

test('the button keeps calling the robot up after it is stowed', () => {
  const s = ready(); const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  g.useConsumable('submersible', 0); g.useConsumable('submersible', 0); assert.equal(g.mechUp(), false); assert.equal(s.consumables.submersible, 0);
  assert.equal(g.useButtonItem('submersible', 500), true); assert.ok(g.mechUp());
  assert.equal(g.useButtonItem('submersible', 600), true); assert.equal(g.mechUp(), false, 'stowed (no iron to empower)'); assert.equal(g.useButtonItem('submersible', 700), true); assert.ok(g.mechUp());
});

test('with no robot built and no frame, the button still says so', () => {
  const s = ready(); s.consumables.submersible = 0; const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld');
  assert.equal(g.useButtonItem('submersible', 100), false); assert.equal(g.message, 'None left.');
});
