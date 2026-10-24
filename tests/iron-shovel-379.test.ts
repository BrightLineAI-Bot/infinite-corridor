import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { DIG, ensureDigging, ensureIronShovel, planDig, dig } from '../src/digging.ts';
import { journeyMetadata } from '../src/persistence.ts';

// Release 379 (Tim: "you should be able to make a shovel with cinder iron to break through the walls... one cinder iron and
// one wood"): the iron shovel digs rock the standard shovel refuses.
const W = 12, H = 9;
function sealedMap() { // the west room, a 3-thick wall (x 5–7), and a pocket of floor at (8,1) nobody can reach
  const tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const wall = x === 0 || y === 0 || x === W - 1 || y === H - 1 || x >= 5; tiles.push({ x, y, kind: wall ? 'wall' : 'floor', blocked: wall }); }
  tiles[1 * W + 8] = { x: 8, y: 1, kind: 'floor', blocked: false };
  return { width: W, height: H, tiles, objects: [] };
}
const save = () => { const s = freshSave(); s.seed = 'IRON-TEST'; ensureDigging(s); return s; };

test('the iron shovel costs one cinder iron and one wood, and is only forged when you have them', () => {
  const s = save();
  assert.deepEqual(DIG.iron.recipe, { cinderIron: 1, wood: 1 });
  const no = ensureIronShovel(s); assert.equal(no.ok, false); assert.match(no.message, /cinder iron/);
  s.materials.cinderIron = 1; s.materials.wood = 1;
  const c = ensureIronShovel(s); assert.equal(c.crafted, true); assert.equal(s.digging.iron, DIG.iron.uses);
  assert.equal(s.materials.cinderIron, 0); assert.equal(s.materials.wood, 0);
  assert.equal(ensureIronShovel(s).crafted, false);
});

test('rock that rings hollow resists the standard shovel and yields to the iron one', () => {
  const s = save(), m = sealedMap(), key = 'dungeon:IRON-TEST:g1:1:1:gate';
  s.digging.shovel = 6;
  dig(s, m, planDig(m, 4, 1, 'right', key), key); dig(s, m, planDig(m, 5, 1, 'right', key), key);
  const plain = planDig(m, 6, 1, 'right', key); assert.equal(plain.ok, false); assert.equal(plain.resists, true);
  const hard = planDig(m, 6, 1, 'right', key, { iron: true }); assert.equal(hard.ok, true); assert.equal(hard.iron, true); assert.equal(hard.through, true);
  s.digging.iron = 2; const r = dig(s, m, hard, key);
  assert.equal(r.ok, true); assert.equal(s.digging.iron, 1); assert.equal(s.digging.shovel, 4, 'the standard shovel is not worn');
  assert.equal(m.tiles[1 * W + 7].tunnel, true);
  dig(s, m, planDig(m, 4, 2, 'right', key, { iron: true }), key);
  assert.equal(s.digging.iron, undefined, 'a spent iron shovel leaves no field');
});

test('the iron shovel tunnels deeper than the standard one, and never the map edge', () => {
  const s = save(), m = sealedMap(), key = 'dungeon:IRON-TEST:g1:2:2:gate';
  m.tiles[1 * W + 8] = { x: 8, y: 1, kind: 'wall', blocked: true };
  s.digging.shovel = 6; s.digging.iron = 2;
  for (let x = 4; x < 7; x++) assert.equal(dig(s, m, planDig(m, x, 4, 'right', key), key).ok, true);
  const plain = planDig(m, 7, 4, 'right', key); assert.equal(plain.ok, false); assert.equal(plain.resists, true); assert.match(plain.reason, /too deep/);
  assert.equal(planDig(m, 7, 4, 'right', key, { iron: true }).ok, true);
  assert.equal(planDig(m, 1, 4, 'left', key, { iron: true }).ok, false, 'the edge never');
  assert.equal(planDig(m, 4, 4, 'right', 'far-array:IRON-TEST:arena1', { iron: true }).ok, false, 'temporary places never');
});

test('playtime is kept on the save, migrates additively and shows on the journey card', () => {
  const f = freshSave(); assert.equal(f.playSeconds, 0);
  const old = freshSave(); delete old.playSeconds; assert.equal(migrateSave(old).playSeconds, 0);
  const kept = freshSave(); kept.playSeconds = 7200; assert.equal(migrateSave(kept).playSeconds, 7200);
  const bad = freshSave(); bad.playSeconds = 'x'; assert.equal(migrateSave(bad).playSeconds, 0);
  const ironSave = freshSave(); ironSave.digging.iron = 9; assert.equal(migrateSave(ironSave).digging.iron, DIG.iron.uses);
  assert.equal(journeyMetadata({ ...kept, name: 'W' }, 1).playSeconds, 7200);
});
