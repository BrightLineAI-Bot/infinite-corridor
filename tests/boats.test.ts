import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor, LANDSCAPE_VERSION, reachableFromPlaza } from '../src/landscape.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { Game, footprintSailable } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { validActions } from '../src/interactions.ts';
import { BOAT, ensureBoatState, buySkiff, hullAbsorb, repairCost, repairSkiff, sailable } from '../src/boats.ts';
import { grantTidemantle } from '../src/water-traversal.ts';
import { ensureEliteState } from '../src/elites.ts';
const ensureEliteStatus = (s) => ensureEliteState(s).status;

const SEED = 'LANDTEST';
const section = (rx, ry, version = LANDSCAPE_VERSION) => { const m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, { version }); return m; };
let dockCache = null;
function dockSection() {
  if (dockCache) return dockCache;
  for (let r = 2; r <= 30; r++) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) !== r || !['sea', 'coast', 'isles', 'lake'].includes(biomeFor(SEED, x, y))) continue;
    const m = section(x, y);
    if (m.objects.some((o) => o.kind === 'shipwright')) return (dockCache = { m, rx: x, ry: y });
  }
  throw new Error('no dock');
}
function rich(save) { grantTidemantle(save, 'test'); save.currency = 500; save.materials.cinderIron = 10; return save; }
function atDock() {
  const { rx, ry } = dockSection(), s = rich(Object.assign(freshSave(), { seed: SEED })), g = new Game(s, 0);
  g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const wright = g.map.objects.find((o) => o.kind === 'shipwright');
  g.player.x = wright.x; g.player.y = wright.y; g.enemies = [];
  return { s, g, wright };
}
const drive = (g, frames, x, y = 0, dt = 1 / 30) => { const input = { state: { x, y }, consume: () => false }; for (let i = 0; i < frames; i++) g.update(dt, input, 10000 + i * dt * 1000); };

test('landscape versions 1 and 2 stay byte-identical now that version 3 adds docks', () => {
  assert.equal(LANDSCAPE_VERSION, 13); // release 569: world regions; 573: forests and frostlands; 579: moonlands; versions 1 and 2 still byte for byte
  for (const [v, want] of [[1, '3b65d401100ea1a45f854b20f5b6d806a91c9053740f85bc72776c62f0da8dc2'], [2, '67471e143190befe0e70e2d75a99975acccfeaadfb68a685bfb9c49aecce542b']]) {
    const h = createHash('sha256');
    for (const seed of ['LANDTEST', 'CINDER-VERGE-47']) for (let ry = -6; ry <= 6; ry++) for (let rx = -6; rx <= 6; rx++) {
      const m = generateRegion(seed, rx, ry); applyLandscape(m, seed, rx, ry, { version: v });
      h.update(JSON.stringify([biomeFor(seed, rx, ry, v), m.tiles, m.objects, m.enemySpawns, m.landscape, m.weather]));
    }
    assert.equal(h.digest('hex'), want, `version ${v}`);
  }
});

test('docks: a Shipwright on reachable shore, a plank pier, and a berth on open water', () => {
  const { m, rx, ry } = dockSection(), o = m.objects.find((q) => q.kind === 'shipwright'), reach = reachableFromPlaza(m);
  assert.ok(reach[o.y * 32 + o.x], 'Shipwright reachable on foot');
  assert.ok(m.tiles.filter((t) => t.kind === 'dock').length === 2 && m.tiles.every((t) => t.kind !== 'dock' || !t.blocked), 'two walkable planks');
  assert.ok(sailable(m.tiles[o.berth.y * 32 + o.berth.x].kind), 'berth floats');
  assert.deepEqual(section(rx, ry).objects.find((q) => q.kind === 'shipwright'), o, 'deterministic');
  assert.equal(section(rx, ry, 2).objects.some((q) => q.kind === 'shipwright'), false, 'version 2 sections get no dock');
  let docks = 0, wet = 0;
  for (let ry2 = -20; ry2 <= 20; ry2++) for (let rx2 = -20; rx2 <= 20; rx2++) if (['sea', 'coast'].includes(biomeFor(SEED, rx2, ry2))) { wet++; if (section(rx2, ry2).objects.some((q) => q.kind === 'shipwright')) docks++; }
  assert.ok(docks >= 5 && docks < wet / 2, `${docks} docks in ${wet} coastal sections`);
});

test('the Shipwright sells a skiff only to a Tidemantle holder who can pay', () => {
  const dock = { rx: 3, ry: 4, x: 5, y: 6 };
  const poor = freshSave(); assert.equal(buySkiff(poor, dock).ok, false, 'no Tidemantle');
  grantTidemantle(poor, 'test'); assert.equal(buySkiff(poor, dock).ok, false, 'no money');
  const s = rich(freshSave()), r = buySkiff(s, dock); s.perception.aperture = 2231; // release 315: the rig is offered from Infinite II
  assert.ok(r.ok); assert.equal(s.currency, 500 - BOAT.price.currency); assert.equal(s.materials.cinderIron, 10 - BOAT.price.cinderIron);
  assert.deepEqual(s.boat.home, dock); assert.equal(s.boat.hull, BOAT.maxHull);
  assert.equal(buySkiff(s, dock).ok, false, 'one skiff');
  assert.deepEqual(validActions({ kind: 'shipwright', actions: ['speak'] }, s), ['board', 'buyShield', 'buyRig'], 'release 107: the Shipwright also sells a dive rig; release 263: and hull shields');
  assert.deepEqual(validActions({ kind: 'shipwright', actions: ['speak'] }, freshSave()), ['speak', 'buySkiff']);
});

test('in the real game: buy, board at the berth, sail faster than swimming without tiring, step ashore, board again', () => {
  const { s, g, wright } = atDock();
  assert.equal(g.interact('buySkiff', wright.id).ok, true);
  assert.equal(g.interact('board', wright.id).ok, true);
  assert.equal(s.boat.aboard, true); assert.deepEqual([g.player.x, g.player.y], [wright.berth.x, wright.berth.y]);
  const dir = [Math.sign(wright.berth.x - wright.x), Math.sign(wright.berth.y - wright.y)], start = { x: g.player.x, y: g.player.y }, stamina = g.player.stamina;
  drive(g, 20, dir[0], dir[1]);
  assert.ok(!s.worldFlags.deaths, 'deep water does not drown a sailor');
  assert.ok(Math.hypot(g.player.x - start.x, g.player.y - start.y) > 0.4, 'sailed away from the berth');
  assert.ok(g.player.stamina >= stamina, 'sailing does not drain stamina'); assert.equal(g.swimming, false);
  // sail back toward the shore until the skiff grounds and the Wayfarer steps off
  drive(g, 240, -dir[0], -dir[1]);
  assert.equal(s.boat.aboard, false, 'stepped ashore'); assert.ok(s.boat.moored);
  const skiff = g.map.objects.find((o) => o.kind === 'skiff'); assert.ok(skiff, 'moored skiff in the world');
  g.player.x = skiff.x; g.player.y = skiff.y - .4;
  assert.equal(g.interact(null, skiff.id).ok, true, 'board the moored skiff'); assert.equal(s.boat.aboard, true);
  assert.ok(!g.map.objects.some((o) => o.kind === 'skiff'));
});

test('sailing has momentum and the boat speed beats walking', () => {
  const { s, g, wright } = atDock(); g.interact('buySkiff', wright.id); g.interact('board', wright.id);
  const dir = [Math.sign(wright.berth.x - wright.x), Math.sign(wright.berth.y - wright.y)], x0 = g.player.x, y0 = g.player.y;
  drive(g, 1, dir[0], dir[1]);
  const first = Math.hypot(g.player.x - x0, g.player.y - y0);
  assert.ok(first < 2.4 * BOAT.speed / 30 * .5, 'starts slow (momentum)');
  assert.ok(Math.hypot(g.player.sailVx, g.player.sailVy) > 0);
});

test('the hull shares damage; at zero the skiff sinks and returns to its home dock', () => {
  const s = rich(freshSave()); buySkiff(s, { rx: 1, ry: 2, x: 3, y: 4 }); s.boat.aboard = true;
  assert.deepEqual(hullAbsorb(s, 20), { kept: 10, sunk: false }); assert.equal(s.boat.hull, BOAT.maxHull - 10);
  s.boat.hull = 4; const r = hullAbsorb(s, 20);
  assert.equal(r.sunk, true); assert.equal(r.kept, 16); assert.equal(s.boat.aboard, false);
  assert.equal(s.boat.hull, Math.round(BOAT.maxHull * BOAT.sunkHull)); assert.deepEqual(s.boat.moored, s.boat.home);
  assert.equal(repairCost(s), Math.ceil((BOAT.maxHull - s.boat.hull) * BOAT.repairCostPerPoint));
  const before = s.currency; assert.ok(repairSkiff(s).ok); assert.equal(s.boat.hull, BOAT.maxHull); assert.ok(s.currency < before);
  assert.equal(repairSkiff(s).ok, false, 'nothing to repair');
});

test('a skiff carried onto ground is hauled ashore and returned to its dock; damage aboard hits the hull in the game loop', () => {
  const { s, g, wright } = atDock(); g.interact('buySkiff', wright.id); g.interact('board', wright.id);
  const hull = s.boat.hull, hp = g.player.hp;
  Object.assign(ensureEliteStatus(s), { poison: 4, poisonTick: 0 }); // poison ticks inside the game loop
  drive(g, 60, 0, 0);
  assert.equal(s.boat.aboard, true); assert.ok(s.boat.hull < hull, 'hull took a share'); assert.ok(hull - s.boat.hull <= hp - g.player.hp + 1e-9, 'shared, not doubled');
  const dry = g.map.tiles.find((t) => !t.blocked && !sailable(t.kind) && !['dock'].includes(t.kind) && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29);
  g.player.x = dry.x; g.player.y = dry.y - .2; drive(g, 1, 0, 0);
  assert.equal(s.boat.aboard, false); assert.deepEqual(s.boat.moored, s.boat.home);
});

test('boat state is additive at schema 14 and survives reload', () => {
  const s = freshSave(); assert.deepEqual({ owned: s.boat.owned, aboard: s.boat.aboard, hull: s.boat.hull }, { owned: false, aboard: false, hull: BOAT.maxHull });
  const old = freshSave(); delete old.boat; assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).boat.owned, false);
  const kept = migrateSave({ ...freshSave(), boat: { owned: true, aboard: true, hull: 33, home: { rx: 1, ry: 1, x: 2, y: 2 }, extra: 'keep' } });
  assert.equal(kept.boat.hull, 33); assert.equal(kept.boat.aboard, true); assert.equal(kept.boat.extra, 'keep'); assert.equal(kept.version, 14);
  assert.equal(ensureBoatState({ boat: { owned: false, aboard: true } }).aboard, false, 'cannot be aboard a skiff you do not own');
});

test('dock planks render and the skiff footprint check matches sailable water', () => {
  const grad = { addColorStop() {} }, ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  const tiles = Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), elev: 0, kind: i % 32 < 10 ? 'ocean' : 'beach' }));
  assert.equal(drawLandscapeTile(ctx, { x: 3, y: 3, kind: 'dock', elev: 0, landscape: 'coast', detail: 2 }, 3, 3, 32, tiles, 32), true);
  const map = { tiles };
  assert.equal(footprintSailable(map, 32, 4, 4), true); assert.equal(footprintSailable(map, 32, 9.5, 4), false); assert.equal(footprintSailable(map, 32, 14, 4), false);
});
