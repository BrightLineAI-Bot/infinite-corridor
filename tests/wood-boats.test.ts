import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { WOOD, woodFor, addWood, buildSkiff, BOAT } from '../src/boats.ts';
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
