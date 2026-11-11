// Release 875 (Tim, 2026-11-11): "you can either have the robot... as a suit or as a drone... they should be... either, or you
// can have one or the other" (the two together would be far too strong), and "the dais should appear just in front of where
// the character's facing".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen, mapWidth } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/save-codec.ts';
import { UTILITY, ensureSlots, presetUtility, setPresetUtility, togglePreset, activeUtility } from '../src/spell-slots.ts';
import { oculusAhead, oculusSpot } from '../src/oculus.ts';

const once = (action) => { let used = false; return { state: { x: 0, y: 0 }, consume: (k) => k === action && !used && (used = true), held: () => false }; };
function frameSave(seed) {
  const r = freshSave(); r.seed = seed; r.perception.aperture = 3255; r.farArray = { listeners: 6, gate: 5 }; r.consumables.submersible = 1;
  const h = new Game(r, 0); h.rx = 3; h.ry = 3; h.loadArea('overworld'); h.enemies = []; return { r, h };
}

test('Robot and Drone are separate utility choices; a release-874 "frame" becomes the form the frame was set to', () => {
  assert.ok(UTILITY.choices.includes('robot') && UTILITY.choices.includes('drone')); assert.ok(!UTILITY.choices.includes('frame'));
  for (const [mode, want] of [['drone', 'drone'], ['robot', 'robot'], [undefined, 'robot']]) {
    const s = freshSave(); ensureSlots(s); const old = JSON.parse(JSON.stringify(s));
    old.magicSkills.presets[1].utility = 'frame'; if (mode) old.mech = { mode };
    const m = migrateSave(old); assert.equal(presetUtility(m, 1), want, `frame set to ${mode} → ${want}`); assert.equal(presetUtility(m, 0), 'build');
  }
  const s = freshSave(); ensureSlots(s); setPresetUtility(s, 0, 'robot'); setPresetUtility(s, 1, 'drone');
  const back = deserializeSave(serializeSave(s)); assert.equal(activeUtility(back), 'robot'); togglePreset(back); assert.equal(activeUtility(back), 'drone');
});

test('either one or the other: the Drone button puts the robot away and turns the frame; only one form is ever out', () => {
  const { r, h } = frameSave('UTIL-875'); setPresetUtility(r, 0, 'robot'); setPresetUtility(r, 1, 'drone');
  let t = 1000; h.update(.05, once('utility'), t); assert.ok(h.mechUp(), `robot up: ${h.message}`); assert.equal(h.droneUp(), false);
  togglePreset(r); assert.equal(activeUtility(r), 'drone');
  t += 100; h.update(.05, once('utility'), t); assert.equal(h.mechUp(), false, 'the robot is put away'); assert.equal(h.droneUp(), false); assert.equal(r.mech.mode, 'drone'); assert.match(h.message, /folds away/);
  t += 100; h.update(.05, once('utility'), t); assert.ok(h.droneUp(), `the drone lifts off: ${h.message}`); assert.equal(h.mechUp(), false, 'never both');
  togglePreset(r); t += 100; h.update(.05, once('utility'), t); assert.equal(h.droneUp(), false, 'the drone docks'); assert.equal(r.mech.mode, 'robot');
  t += 100; h.update(.05, once('utility'), t); assert.ok(h.mechUp(), 'the robot again'); assert.equal(h.droneUp(), false);
  // with nothing out, one press turns the frame and calls the form up
  t += 100; h.update(.05, once('utility'), t); assert.equal(h.mechUp(), false, 'stowed (no cinder iron, so no power armor)');
  togglePreset(r); t += 100; h.update(.05, once('utility'), t); assert.ok(h.droneUp(), `one press: ${h.message}`);
});

test('the Drone choice still needs the fourth Gate; the press says so', () => {
  const { r, h } = frameSave('UTIL-875G'); r.farArray = { listeners: 3, gate: 3 }; setPresetUtility(r, 0, 'drone');
  h.update(.05, once('utility'), 1000); assert.equal(h.droneUp(), false); assert.equal(h.mechUp(), false); assert.match(h.message, /fourth Gate/);
});

test('the Oculus dais opens just ahead of where the Wayfarer faces, diagonals included', () => {
  const at = (p) => ({ x: Math.floor(p.x + .5), y: Math.floor(p.y + .75) }), p = { x: 10, y: 10, facing: 'right', lastMoveVector: { x: .7, y: -.7 } }, me = at(p);
  assert.deepEqual(oculusAhead(p), { x: me.x + 1, y: me.y - 1 }, 'walking up-right: up-right');
  assert.deepEqual(oculusAhead({ ...p, lastMoveVector: { x: 1, y: .1 } }), { x: me.x + 1, y: me.y }, 'walking right: right');
  assert.deepEqual(oculusAhead({ ...p, facing: 'left' }), { x: me.x - 1, y: me.y }, 'turned since (facing left): the facing wins');
  assert.deepEqual(oculusAhead({ ...p, lastMoveVector: null }), { x: me.x + 1, y: me.y }, 'no heading: the facing');
  const { h } = frameSave('UTIL-875D'), W = mapWidth(h.map, h.area), open = (x, y) => footprintOpen(h.map, W, x, y), spot = oculusSpot(h.player, open);
  assert.ok(spot, 'a spot near the start'); assert.ok(Math.max(Math.abs(spot.x - at(h.player).x), Math.abs(spot.y - at(h.player).y)) <= 4);
});
