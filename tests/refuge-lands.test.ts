// Release 265 (Tim, 2026-10-21): a farm and a quarry near Ember Refuge, a farmer who talks in riddles, and regrowth that
// widens around the Refuge as the Wayfarer explores.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { REGROW, REFUGE_LANDS, ensureRegrowth, noteDiscovery, ringFor, regrowSection, FARMER_LINES } from '../src/refuge-lands.ts';

const game = (seed = 'CINDER-VERGE-47') => { const s = freshSave(); s.seed = seed; return { s, g: new Game(s, 0) }; };
const visit = (g, rx, ry) => { if (g.map) g.snapshotArea(); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); };

test('regrowth state is additive; an older save counts from the sections it already holds', () => {
  assert.deepEqual(freshSave().regrowth, { epoch: 0, mark: 0, done: {} });
  const old = freshSave(); delete old.regrowth; old.atlas = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`${i},9`, { terrain: 'grass' }]));
  assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).regrowth.mark, 33);
  const s = freshSave(); s.regrowth = { epoch: '2', mark: -4, done: { '1,1': 2, bad: 1, '2,2': 'x' }, other: 1 }; ensureRegrowth(s);
  assert.deepEqual(s.regrowth, { epoch: 2, mark: 0, done: { '1,1': 2 }, other: 1 });
});

test('every 20 newly discovered sections is a regrowth, and the ring around the Refuge widens each time', () => {
  const s = freshSave(); s.atlas = {};
  let events = 0; for (let i = 0; i < 65; i++) { s.atlas[`${i},40`] = {}; if (noteDiscovery(s)) events++; }
  assert.equal(events, 3); assert.equal(s.regrowth.epoch, 3); assert.equal(REGROW.every, 20);
  assert.deepEqual([1, 2, 3, 9].map(ringFor), [1, 2, 3, REGROW.maxRadius]);
});

test('the farm and the quarry lie near the Refuge, apart, with big trees and a stone block\'s worth of rock; the farmer points the way', () => {
  const { s, g } = game(), where = g.refugeLandsWhere();
  assert.ok(where.farm && where.quarry); for (const q of [where.farm, where.quarry]) assert.ok(Math.max(Math.abs(q.rx), Math.abs(q.ry)) <= 2 && (q.rx || q.ry));
  assert.ok(Math.max(Math.abs(where.farm.rx - where.quarry.rx), Math.abs(where.farm.ry - where.quarry.ry)) > 1, 'not side by side');
  visit(g, where.farm.rx, where.farm.ry); const trees = g.map.objects.filter((o) => o.refugeFarm);
  assert.equal(trees.length, REFUGE_LANDS.farmTrees); assert.ok(trees.every((t) => t.kind === 'tree' && t.vegetationForm === 'canopy'));
  visit(g, where.quarry.rx, where.quarry.ry); const rocks = g.map.objects.filter((o) => o.refugeQuarry);
  assert.ok(rocks.length >= 10, 'enough to chip a stone block\'s worth'); const keeper = g.map.objects.find((o) => o.id === 'quarry-keeper'); assert.ok(keeper?.quarryTurtle); Object.assign(g.player, { x: keeper.x, y: keeper.y + .5 }); assert.match(g.interact('speak', keeper.id).message, /Shale/);
  visit(g, 0, 0); const farmer = g.map.objects.find((o) => o.refugeFarmer); assert.ok(farmer);
  const heard = new Set(); for (let k = 0; k < FARMER_LINES.length + 2; k++) { Object.assign(g.player, { x: farmer.x, y: farmer.y + .5 }); const r = g.interact('speak', farmer.id); heard.add(r.message); }
  assert.ok(heard.size > 3, 'the farmer has more than one thing to say'); assert.ok([...heard].some((m) => /quarry/.test(m)) && [...heard].some((m) => /orchard/.test(m)));
});

test('felled farm trees and worked quarry rocks come back at the next regrowth, the farm and quarry first; a log crossing stays down', () => {
  const { s, g } = game(), where = g.refugeLandsWhere();
  visit(g, where.farm.rx, where.farm.ry); s.materials.wood = 0;
  const tree = g.map.objects.find((o) => o.refugeFarm); Object.assign(g.player, { x: tree.x, y: tree.y + .5 }); assert.equal(g.interact('cut', tree.id).ok, true); assert.equal(tree.state, 'fallen');
  visit(g, 0, 0); visit(g, where.farm.rx, where.farm.ry); assert.equal(g.map.objects.find((o) => o.id === tree.id).state, 'fallen', 'stays felled until a regrowth');
  s.regrowth.epoch = 1; visit(g, 0, 0); visit(g, where.farm.rx, where.farm.ry);
  assert.equal(g.map.objects.find((o) => o.id === tree.id).state, 'standing', 'grown back');
  const map = { objects: [{ id: 'env-tree-x', kind: 'tree', environmental: true, state: 'fallen', crossingTiles: [{ x: 1, y: 1 }] }, { id: 'env-rock-x', kind: 'rock', environmental: true, state: 'sealed' }, { id: 'rock-1', kind: 'rock', state: 'moved' }] };
  const t = freshSave(); t.regrowth.epoch = 1; t.worldFlags['env-rock-x:chip'] = true;
  assert.equal(regrowSection(t, map, 1, 1, {}), 1); assert.equal(map.objects[0].state, 'fallen', 'a log crossing stays'); assert.equal(t.worldFlags['env-rock-x:chip'], undefined, 'the chipped rock is whole'); assert.equal(map.objects[2].state, 'moved', 'a story rock is not reset');
  assert.equal(regrowSection(t, map, 1, 1, {}), 0, 'once per regrowth'); assert.equal(regrowSection(t, { objects: [] }, 4, 4, {}), 0, 'outside the ring');
});
