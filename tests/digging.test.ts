import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { validActions, applyInteraction } from '../src/interactions.ts';
import { DIG, ensureDigging, ensureShovel, planDig, dig, applyTunnels, wallTreasure, wallGlints, canDigArea, addDigSpot, digSpot, spotHere, addStone } from '../src/digging.ts';
import { WOOD, addWood } from '../src/boats.ts';

// A 12×9 test dungeon: two rooms split by a wall 2 thick (x 5–6); a sealed room behind a sealed gate at (10,4).
function map() {
  const W = 12, H = 9, tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1, wall = edge || x === 5 || x === 6 || x === 9 || x === 10 && y !== 4;
    tiles.push({ x, y, kind: wall ? 'wall' : 'floor', blocked: wall });
  }
  tiles[4 * W + 10] = { x: 10, y: 4, kind: 'sealedGate', blocked: true };
  for (let y = 1; y < H - 1; y++) { tiles[y * W + 5] = { ...tiles[y * W + 5] }; }
  // A door at the bottom of the middle wall joins the two rooms, so both are reachable from either.
  tiles[7 * W + 5] = { x: 5, y: 7, kind: 'floor', blocked: false }; tiles[7 * W + 6] = { x: 6, y: 7, kind: 'floor', blocked: false };
  return { width: W, height: H, tiles, objects: [] };
}
const save = () => { const s = freshSave(); s.seed = 'DIG-TEST'; ensureDigging(s); return s; };

test('a shovel is lashed from wood and stone, and breaks after two blocks (release 263)', () => {
  const s = save();
  assert.equal(ensureShovel(s).ok, false);
  s.materials.wood = DIG.recipe.wood; s.materials.stone = DIG.recipe.stone;
  const c = ensureShovel(s); assert.equal(c.crafted, true); assert.equal(s.digging.shovel, DIG.shovelUses);
  assert.equal(s.materials.wood, 0); assert.equal(s.materials.stone, 0);
  assert.equal(ensureShovel(s).crafted, false, 'a shovel in hand is not crafted again');
  assert.equal(DIG.shovelUses, 2); assert.equal(DIG.reach, 3);
});

test('digging goes up to three blocks deep, breaks through only into floor you can already reach', () => {
  const s = save(), m = map(), key = 'dungeon:DIG-TEST:g1:1:1:gate';
  s.digging.shovel = 6;
  // From (4,3) facing right: (5,3) is wall, (6,3) is wall, (7,3) is floor in the other room (reachable by the door).
  let p = planDig(m, 4, 3, 'right', key); assert.equal(p.ok, true); assert.equal(p.through, false);
  dig(s, m, p, key); assert.equal(m.tiles[3 * 12 + 5].tunnel, true);
  p = planDig(m, 5, 3, 'right', key); assert.equal(p.ok, true); assert.equal(p.through, true);
  dig(s, m, p, key); assert.equal(s.digging.shovel, 4); assert.deepEqual(s.digging.dug[key], ['5,3', '6,3']);
  assert.equal(s.materials.stone, 2, 'each block gives a stone');
  // The map edge never.
  assert.equal(planDig(m, 1, 3, 'left', key).ok, false);
});

test('a shovel never opens a sealed side', () => {
  const s = save(), m = map(), key = 'dungeon:DIG-TEST:g1:2:2:gate';
  // Put unreachable floor at (11,…)? The edge is not floor, so make a sealed pocket: floor at (8,1) cut off by walls.
  for (let y = 1; y < 8; y++) for (let x = 7; x < 9; x++) m.tiles[y * 12 + x] = { x, y, kind: 'wall', blocked: true };
  m.tiles[1 * 12 + 8] = { x: 8, y: 1, kind: 'floor', blocked: false }; // a pocket nobody can reach
  s.digging.shovel = 6;
  m.tiles[1 * 12 + 7] = { x: 7, y: 1, kind: 'wall', blocked: true };
  // From (4,1) dig east: (5,1),(6,1) then (7,1) would touch the pocket at (8,1), which is not reachable: refused.
  dig(s, m, planDig(m, 4, 1, 'right', key), key); dig(s, m, planDig(m, 5, 1, 'right', key), key);
  const p = planDig(m, 6, 1, 'right', key); assert.equal(p.ok, false); assert.match(p.reason, /sealed/);
});

test('a tunnel reaches at most three blocks from open floor', () => {
  const s = save(), key = 'dungeon:DIG-TEST:g1:3:3:gate', W = 12, m = map();
  for (let x = 1; x < 11; x++) for (let y = 4; y < 8; y++) m.tiles[y * W + x] = { x, y, kind: 'wall', blocked: true };
  s.digging.shovel = 6; let y = 3;
  for (let k = 0; k < 3; k++) { const p = planDig(m, 2, y, 'down', key); assert.equal(p.ok, true, `block ${k + 1}`); dig(s, m, p, key); y++; }
  const p = planDig(m, 2, y, 'down', key); assert.equal(p.ok, false); assert.match(p.reason, /3 blocks/);
});

test('tunnels survive leaving and reloading, and migration keeps them', () => {
  const s = save(), m = map(), key = 'dungeon:DIG-TEST:g1:1:1:gate';
  s.digging.shovel = 6; dig(s, m, planDig(m, 4, 3, 'right', key), key);
  const again = applyTunnels(map(), s, key); assert.equal(again.tiles[3 * 12 + 5].tunnel, true); assert.equal(again.tiles[3 * 12 + 5].blocked, false);
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.digging.dug[key], ['5,3']); assert.equal(back.digging.shovel, 5);
  const odd = migrateSave({ ...JSON.parse(JSON.stringify(s)), digging: { shovel: 99, dug: { [key]: ['5,3', 'nope', 5] }, spots: { 'x': true, '3,4': true } } });
  assert.equal(odd.digging.shovel, DIG.heldUses, 'a shovel from before 263 keeps up to its old six uses'); assert.deepEqual(odd.digging.dug[key], ['5,3']); assert.deepEqual(odd.digging.spots, { '3,4': true });
  assert.deepEqual(freshSave().digging, { shovel: 0, dug: {}, spots: {} }); assert.equal(freshSave().materials.stone, 0);
});

test('the shovel snaps on its last block', () => {
  const s = save(), m = map(), key = 'dungeon:DIG-TEST:g1:4:4:gate'; s.digging.shovel = 1;
  const r = dig(s, m, planDig(m, 4, 3, 'right', key), key); assert.equal(r.broke, true); assert.match(r.message, /snaps/); assert.equal(s.digging.shovel, 0);
  assert.equal(dig(s, m, planDig(m, 5, 3, 'right', key), key).ok, false);
});

test('walls hide treasure by seed and place; some glint; temporary places are never dug', () => {
  let n = 0, glint = 0;
  for (let i = 0; i < 4000; i++) { const f = wallTreasure('SEED', 'dungeon:SEED:g1:0:0:x', i % 60, Math.floor(i / 60)); if (f) { n++; if (f.glint) glint++; assert.ok(f.n >= 1 && f.label); } }
  assert.ok(Math.abs(n / 4000 - DIG.treasureChance) < .025, String(n)); assert.ok(glint > 0 && glint < n);
  assert.deepEqual(wallTreasure('SEED', 'k', 3, 4), wallTreasure('SEED', 'k', 3, 4));
  for (const id of ['hunt-instance:a', 'elite-portal:x', 'displacement:1', 'dive:1:2', 'far-array:run']) { assert.equal(canDigArea(id), false); assert.equal(planDig(map(), 4, 3, 'right', id).ok, false); }
  assert.equal(canDigArea('dungeon:x:g1'), true);
  const s = save(); assert.ok(Array.isArray(wallGlints(map(), s.seed, 'dungeon:x', s)));
});

test('anyone can chip a stone from a rock once; breaking one gives more', () => {
  const s = save(), rock = { id: 'rock-t', kind: 'rock', state: 'sealed', actions: ['move', 'break'], environmental: true };
  s.stats.Might = 1; assert.deepEqual(validActions(rock, s), ['chip']);
  assert.equal(applyInteraction(rock, 'chip', s).ok, true); assert.equal(s.materials.stone, DIG.stone.chip);
  assert.deepEqual(validActions(rock, s), []);
  s.stats.Might = 3; assert.deepEqual(validActions(rock, s), ['move', 'break']);
  applyInteraction(rock, 'break', s); assert.equal(s.materials.stone, Math.min(DIG.carryStone, DIG.stone.chip + DIG.stone.break), 'up to the carry limit (release 259)');
});

test('carry limits: 99 wood and 99 stone (release 261); a full pouch refuses a chip; an older save over the limit keeps it', () => {
  const s = save(); s.materials.stone = 0;
  assert.equal(DIG.carryStone, 99); assert.equal(WOOD.carry, 99);
  assert.equal(addStone(s, 500), DIG.carryStone); assert.equal(addStone(s, 1), DIG.carryStone);
  const rock = { id: 'rock-full', kind: 'rock', state: 'sealed', actions: ['move', 'break'], environmental: true }; s.stats.Might = 1;
  const r = applyInteraction(rock, 'chip', s); assert.equal(r.ok, false); assert.match(r.message, /no more stone/);
  assert.notEqual(s.worldFlags['rock-full:chip'], true, 'the rock keeps its stone for later');
  s.materials.wood = 0; assert.equal(addWood(s, 40), 40); assert.equal(addWood(s, 80), WOOD.carry);
  s.materials.wood = 150; assert.equal(addWood(s, 2), 150, 'never taken away'); s.materials.stone = 120; assert.equal(addStone(s, 1), 120);
  assert.deepEqual(DIG.recipe, { wood: 1, stone: 1 });
});

test('disturbed earth is rare, deterministic, dug once', () => {
  const s = save(); let found = null;
  for (let rx = -40; rx <= 40 && !found; rx++) for (let ry = -40; ry <= 40; ry++) if (spotHere(s, rx, ry)) { found = [rx, ry]; break; }
  assert.ok(found);
  const tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y, kind: 'ash', blocked: false });
  const m = { tiles, objects: [] }, o = addDigSpot(m, s, ...found); assert.equal(o.kind, 'digSpot');
  assert.equal(addDigSpot(m, s, ...found), o, 'placed once');
  assert.equal(digSpot(s, o, ...found).ok, false, 'no shovel');
  s.digging.shovel = 2; const r = digSpot(s, o, ...found); assert.equal(r.ok, true); assert.equal(s.digging.shovel, 1);
  assert.equal(digSpot(s, o, ...found).ok, false); assert.equal(addDigSpot({ tiles, objects: [] }, s, ...found), null, 'a dug patch is not placed again');
});
