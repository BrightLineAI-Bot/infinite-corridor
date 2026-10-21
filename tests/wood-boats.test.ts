import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { WOOD, woodFor, addWood, buildSkiff, BOAT, disembark, takeSpare, ensureBoatState, mendSkiff, buyHullShield, deployHullShield, tickHullShield, hullAbsorb, hullStrike, shipwrightActions } from '../src/boats.ts';
import { grantTidemantle } from '../src/water-traversal.ts';

const SEED = 'LANDTEST';
function shore() {
  for (let r = 2; r <= 30; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || !['coast', 'sea', 'lake'].includes(biomeFor(SEED, x, y))) continue;
    const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = [];
    for (const t of g.map.tiles) { if (t.blocked || t.kind === 'dock' || t.x < 3 || t.y < 3 || t.x > 28 || t.y > 28) continue; g.player.x = t.x; g.player.y = t.y - .2; if (!g.nearestObject() && g.shoreWater()) return { s, g }; }
  }
  throw new Error('no shore');
}

test('trees give wood by size: shrub 1, spindle 2, big canopy 3', () => {
  assert.deepEqual(WOOD.byForm, { shrub: 1, spindle: 2, canopy: 3 }); assert.equal(WOOD.skiffCost, 3);
  assert.equal(woodFor({ vegetationForm: 'shrub' }), 1); assert.equal(woodFor({ vegetationForm: 'canopy' }), 3); assert.equal(woodFor({}), 2);
  const s = freshSave(); assert.equal(s.materials.wood, 0); assert.equal(addWood(s, 2), 2);
  const old = freshSave(); delete old.materials.wood; assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).materials.wood, 0);
  assert.equal(migrateSave({ ...freshSave(), materials: { ...freshSave().materials, wood: 5 } }).materials.wood, 5, 'wood survives reload');
});

test('felling a tree in the game adds its wood once', () => {
  let found = null;
  for (let ry = -6; ry <= 6 && !found; ry++) for (let rx = -6; rx <= 6 && !found; rx++) {
    const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
    const t = g.map.objects.find((o) => o.kind === 'tree' && o.state === 'standing' && o.actions?.includes('cut') && !o.crossingTiles);
    if (t) found = { s, g, t };
  }
  const { s, g, t } = found; g.player.x = t.x; g.player.y = t.y + .5;
  const r = g.interact('cut', t.id); assert.equal(r.ok, true);
  assert.equal(s.materials.wood, woodFor(t)); assert.match(g.message, /wood/);
  assert.equal(g.interact('cut', t.id).ok, false, 'a felled tree gives nothing more'); assert.equal(s.materials.wood, woodFor(t));
});

test('Act at deep water with 3 wood builds a skiff and boards it; without wood or the Tidemantle it does not', () => {
  const { s, g } = shore(), spot = { x: g.player.x, y: g.player.y };
  let r = g.interact(); assert.equal(r.ok, false); assert.match(r.message, /needs 3 wood|Tidemantle/);
  grantTidemantle(s, 't'); addWood(s, 2); r = g.interact(); assert.equal(r.ok, false); assert.match(r.message, /needs 3 wood \(you have 2\)/);
  addWood(s, 2); r = g.interact(); assert.equal(r.ok, true);
  assert.equal(s.boat.owned, true); assert.equal(s.boat.aboard, true); assert.equal(s.boat.hull, BOAT.maxHull); assert.equal(s.materials.wood, 1);
  assert.ok(Math.hypot(g.player.x - spot.x, g.player.y - spot.y) < 3, 'launched beside you'); assert.equal(g.shoreWater(), null, 'aboard: nothing more to build');
  const input = { state: { x: 0, y: 0 }, consume: () => false }; g.update(1 / 30, input, 9000); assert.equal(s.boat.aboard, true, 'afloat');
});

test('a new skiff replaces the old one and needs no Shipwright', () => {
  const s = freshSave(); grantTidemantle(s, 't'); addWood(s, 6);
  assert.equal(buildSkiff(s, { rx: 1, ry: 1, x: 2, y: 2 }).ok, true); s.boat.aboard = false; s.boat.hull = 5; s.boat.moored = { rx: 1, ry: 1, x: 2, y: 2 };
  assert.equal(buildSkiff(s, { rx: 4, ry: 4, x: 5, y: 5 }).ok, true);
  assert.equal(s.boat.hull, BOAT.maxHull); assert.deepEqual(s.boat.home, { rx: 4, ry: 4, x: 5, y: 5 }); assert.equal(s.boat.moored, null); assert.equal(s.materials.wood, 0);
});

test('dying drops the wood you carry, and nothing else', () => {
  const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.loadArea('overworld'); addWood(s, 4);
  const spheres = s.materials.weaponSphere, iron = s.materials.cinderIron;
  g.player.hp = 0; g.update(1 / 30, { state: { x: 0, y: 0 }, consume: () => false, reset() {} }, 1000);
  assert.equal(s.worldFlags.deaths, 1); assert.equal(s.materials.wood, 0); assert.match(g.message, /4 wood you carried is gone/);
  assert.equal(s.materials.weaponSphere, spheres); assert.equal(s.materials.cinderIron, iron);
});

test('release 261: up to two skiffs: a new one turns the moored one into the spare, an older spare is gone, and boarding the spare swaps them', () => {
  const s = freshSave(); s.capabilities = { ...(s.capabilities || {}), swim: true }; s.materials.wood = 99;
  const at = (rx, x) => ({ rx, ry: 0, x, y: 5 });
  assert.equal(buildSkiff(s, at(1, 4)).ok, true); disembark(s, at(1, 4)); s.boat.hull = 30;
  assert.equal(buildSkiff(s, at(2, 6)).ok, true); assert.deepEqual(s.boat.spare, { ...at(1, 4), hull: 30 }, 'the first skiff waits as the spare, its hull kept');
  assert.equal(s.boat.aboard, true); assert.equal(s.boat.hull, BOAT.maxHull);
  disembark(s, at(2, 6)); assert.equal(buildSkiff(s, at(3, 8)).ok, true);
  assert.deepEqual(s.boat.spare, { ...at(2, 6), hull: BOAT.maxHull }, 'two at a time: the oldest is gone'); disembark(s, at(3, 8));
  assert.equal(takeSpare(s), true); assert.deepEqual(s.boat.moored, at(2, 6)); assert.deepEqual(s.boat.spare, { ...at(3, 8), hull: BOAT.maxHull }, 'boarding the spare swaps them');
  const again = JSON.parse(JSON.stringify(s)); ensureBoatState(again); assert.deepEqual(again.boat.spare, s.boat.spare, 'kept across a reload');
  const old = freshSave(); delete old.boat.spare; ensureBoatState(old); assert.equal(old.boat.spare, null, 'additive');
});

test('release 261 in play: Act at the water builds a second skiff; the first waits as the spare in its section and can be boarded', () => {
  const { s, g } = shore(); s.capabilities = { ...(s.capabilities || {}), swim: true }; s.materials.wood = 9;
  const first = { x: g.player.x, y: g.player.y };
  assert.equal(g.buildSkiffHere().ok, true); const where = { rx: g.rx, ry: g.ry, x: g.player.x, y: g.player.y };
  disembark(s, where); g.player.x = first.x; g.player.y = first.y; g.map.objects = g.map.objects.filter((o) => o.kind !== 'skiff');
  assert.equal(g.buildSkiffHere().ok, true, 'a second skiff, though the first is moored nearby');
  assert.deepEqual({ rx: s.boat.spare.rx, ry: s.boat.spare.ry }, { rx: g.rx, ry: g.ry });
  const spare = g.map.objects.find((o) => o.id === 'skiff-spare'); assert.ok(spare, 'the first skiff waits as the spare');
  disembark(s, { rx: g.rx, ry: g.ry, x: g.player.x, y: g.player.y });
  const r = g.boatAction(spare, 'board'); assert.equal(r.ok, true); assert.equal(s.boat.aboard, true);
  assert.ok(s.boat.spare && g.map.objects.some((o) => o.id === 'skiff-spare'), 'the other is now the spare');
});

test('release 263: Act at the water\'s edge builds and boards a skiff even beside a tree, and it pushes off', () => {
  const { s, g } = shore(); grantTidemantle(s, 't'); addWood(s, WOOD.skiffCost);
  g.map.objects.push({ id: 'shore-tree', kind: 'tree', state: 'standing', x: g.player.x + .4, y: g.player.y, actions: ['cut'], vegetationForm: 'spindle' });
  assert.equal(g.nearestObject()?.id, 'shore-tree');
  const r = g.interact(); assert.equal(r.ok, true, r.message); assert.equal(s.boat.aboard, true);
  assert.ok(Math.hypot(g.player.sailVx, g.player.sailVy) > 0, 'moving off the shore');
  const t = shore(); t.g.map.objects.push({ id: 'shore-tree', kind: 'tree', state: 'standing', x: t.g.player.x + .4, y: t.g.player.y, actions: ['cut'], vegetationForm: 'spindle' });
  assert.match(t.g.interact().message, /wood|fell|cut|tree/i, 'without the means to build, the tree still answers'); assert.equal(t.s.boat.aboard, false);
});

test('release 263: hull shields are bought from the Shipwright and deployed aboard; the hull takes no damage for 3 minutes', () => {
  const s = freshSave(); s.currency = 100; ensureBoatState(s);
  assert.equal(buyHullShield(s).ok, false, 'no skiff, no shield');
  Object.assign(s.boat, { owned: true, aboard: false, hull: BOAT.maxHull });
  assert.ok(shipwrightActions(s).includes('buyShield'));
  assert.equal(buyHullShield(s).ok, true); assert.equal(s.consumables.hullShield, 1); assert.equal(s.currency, 100 - BOAT.shield.price);
  assert.equal(deployHullShield(s).ok, false, 'only aboard'); s.boat.aboard = true;
  assert.equal(deployHullShield(s).ok, true); assert.equal(s.consumables.hullShield, 0); assert.equal(s.boat.shield, BOAT.shield.seconds);
  const r = hullAbsorb(s, 20); assert.equal(s.boat.hull, BOAT.maxHull, 'the hull is untouched'); assert.equal(r.kept, (20 - 20 * BOAT.hullShare) * (1 - BOAT.shield.guard), 'the Wayfarer keeps only their share, 5% less (release 269)'); assert.equal(BOAT.shield.guard, .05);
  assert.equal(hullStrike(s, 50), false); assert.equal(s.boat.hull, BOAT.maxHull);
  tickHullShield(s, BOAT.shield.seconds - 1); assert.ok(s.boat.shield > 0); tickHullShield(s, 2); assert.equal(s.boat.shield, 0);
  hullAbsorb(s, 20); assert.ok(s.boat.hull < BOAT.maxHull, 'unshielded again');
  const m = migrateSave(JSON.parse(JSON.stringify({ ...s, boat: { ...s.boat, shield: 'x' }, consumables: { ...s.consumables, hullShield: -2 } })));
  assert.equal(m.boat.shield, 0); assert.equal(deployHullShield(m).ok, false, 'a bad count is none');
  const g = new Game(Object.assign(freshSave(), { seed: SEED }), 0); g.save.boat = { owned: true, aboard: true, hull: 30 }; ensureBoatState(g.save); g.save.consumables.hullShield = 1;
  assert.equal(g.useConsumable('hullShield', 0), true); assert.equal(g.save.boat.shield, BOAT.shield.seconds);
});

test('release 269: Build patches a damaged skiff, a wood for half the hull, beside it or aboard; held at sea it raises a hull shield', () => {
  const s = freshSave(); s.materials.wood = 3; Object.assign(ensureBoatState(s), { owned: true, aboard: true, hull: 10 });
  assert.equal(mendSkiff(s).ok, true); assert.equal(s.boat.hull, 10 + BOAT.maxHull / 2); assert.equal(s.materials.wood, 2);
  assert.equal(mendSkiff(s).ok, true); assert.equal(s.boat.hull, BOAT.maxHull, 'two woods: whole'); assert.equal(s.materials.wood, 1);
  assert.equal(mendSkiff(s).ok, false, 'nothing charged on a sound hull'); assert.equal(s.materials.wood, 1);
  const g = new Game(Object.assign(freshSave(), { seed: SEED }), 0); g.area = 'overworld'; g.map = { width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'grass', blocked: false })), objects: [] };
  Object.assign(ensureBoatState(g.save), { owned: true, aboard: false, hull: 20, moored: { rx: 0, ry: 0, x: 11, y: 10 } }); g.save.materials.wood = 5;
  g.map.objects.push({ id: 'skiff-moored', kind: 'skiff', x: 11, y: 10, actions: ['board'] }); Object.assign(g.player, { x: 10, y: 10, facing: 'right' });
  assert.ok(g.mendTarget(), 'beside the moored skiff');
  let pressed = false; g.update(.05, { state: { x: 0, y: 0 }, consume: (a) => a === 'build' && !pressed && (pressed = true), held: () => false }, 1000);
  assert.equal(g.save.boat.hull, 20 + BOAT.maxHull / 2, 'Build patched it rather than building'); assert.equal(g.builds?.length || 0, 0);
  g.map.tiles = g.map.tiles.map((t) => ({ ...t, kind: 'ocean', blocked: true })); g.map.objects = []; g.save.boat.aboard = true; g.save.boat.hull = BOAT.maxHull; g.save.consumables.hullShield = 1;
  for (let t = 0; t < 1; t += .1) g.update(.1, { state: { x: 0, y: 0 }, consume: () => false, held: (a) => a === 'build' }, 2000 + t * 1000);
  assert.ok(g.save.boat.shield > BOAT.shield.seconds - 1, 'holding Build raised the shield'); assert.equal(g.save.consumables.hullShield, 0);
});
