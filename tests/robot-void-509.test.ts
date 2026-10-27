// Release 509 (Tim, 2026-10-27): the robot can go into the Far Sleep's star-voids, but "you should take damage as well
// similar to the lava, and you should die. If you stay in them for too long... it'll destroy your suit... it's very little
// protection". Only the robot steps in; there its plating goes (never re-forged) and the Wayfarer burns; staying kills.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { MECH_VOID, MECH } from '../src/vehicle-gates.ts';

function atVoid(suit = true) {
  const s = freshSave(); s.seed = 'SUB'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; s.materials = { ...(s.materials || {}), cinderIron: 50 };
  const g = new Game(s, 0); g.rx = 36; g.ry = 2; g.loadArea('overworld'); g.enemies = []; if (suit) g.useConsumable('submersible', 0);
  // a clean strip: meadow, then a wide star-void
  g.map.tiles = g.map.tiles.map((t) => ({ ...t, kind: t.x >= 14 ? 'starVoid' : 'sleepMeadow', blocked: t.x >= 14, landscape: 'dream', elev: 0, slope: false, structure: null, environment: null }));
  Object.assign(g.player, { x: 11, y: 10, hp: 100, maxHp: 100 }); s.maxHp = 100;
  return { s, g };
}
const move = (x) => ({ state: { x, y: 0 }, consume: () => false, held: () => false });

test('without the robot a star-void is still impassable', () => {
  const { g } = atVoid(false); let t = 1000; for (let i = 0; i < 60; i++) { t += 50; g.update(.05, move(1), t); }
  assert.ok(g.player.x < 13.3, `stopped at the edge (${g.player.x})`); assert.equal(g.player.hp, 100);
});

test('in the robot you can step into a star-void; it tears the plating and burns you, iron cannot re-forge it', () => {
  const { s, g } = atVoid(); let t = 1000; for (let i = 0; i < 30; i++) { t += 50; g.update(.05, move(1), t); }
  assert.ok(g.player.x > 14, `in the void (${g.player.x})`); assert.ok(s.mech.plate < MECH.plate, 'plating going'); assert.ok(g.player.hp < 100, 'burning'); assert.equal(s.materials.cinderIron, 50, 'no re-forging');
  for (let i = 0; i < 20; i++) { t += 50; g.update(.05, move(-1), t); }
  assert.ok(g.player.hp > 0 && g.mechUp(), 'a quick crossing survives');
});

test('staying in the void destroys the robot and the Wayfarer with it', () => {
  const { s, g } = atVoid(); let t = 1000, died = false;
  for (let i = 0; i < 40; i++) { t += 50; g.update(.05, move(1), t); }
  for (let i = 0; i < 200 && !died; i++) { t += 50; g.update(.05, move(0), t); if (g.player.hp <= 0 || g.fallen || /Felled|recovered/.test(g.message)) died = true; }
  assert.ok(died, `lost in the void: ${g.message}`); assert.equal(s.mech.built, false, 'the robot is destroyed: a new frame must be forged'); assert.equal(g.mechUp(), false);
  assert.ok(MECH.plate / MECH_VOID.plate < 8, 'it does not last long');
});

// Release 511 (pre-publish review): a Sleeper's Hall's walls are starVoid tiles too; they stay walls, even to the robot.
test('in a Sleeper\'s Hall the robot cannot walk into the starVoid walls', () => {
  const { s, g } = atVoid(); g.area = 'dungeon';
  g.map.tiles = g.map.tiles.map((t) => ({ ...t, landscape: t.x >= 14 ? 'underlands' : t.landscape }));
  let t = 1000; for (let i = 0; i < 60; i++) { t += 50; g.update(.05, move(1), t); }
  assert.ok(g.player.x < 13.3, `stopped at the wall (${g.player.x})`); assert.equal(s.mech.plate, 60); assert.ok(g.mechUp()); assert.equal(g.player.hp, 100);
});
test('an underlands starVoid wall in the overworld is not a dream void either', () => {
  const { g } = atVoid(); g.map.tiles = g.map.tiles.map((t) => ({ ...t, landscape: t.x >= 14 ? 'underlands' : t.landscape }));
  let t = 1000; for (let i = 0; i < 60; i++) { t += 50; g.update(.05, move(1), t); } assert.ok(g.player.x < 13.3);
});
