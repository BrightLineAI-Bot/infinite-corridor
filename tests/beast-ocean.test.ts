// Owner-approved S8 ocean regressions. Production callbacks, persistence and update loops;
// these bounded fixtures do not claim a globally navigable sea route or a human/mobile playtest.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Game, WALKER_ROUTE, footprintOpen, footprintSailable, footprintHazard, moveAxis,
  walkerGroundPositionOpen, walkerCrossingMap, walkerSectionCrossings,
} from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { createCombatant } from '../src/combat.ts';
import { bergAt } from '../src/open-sea.ts';
import { MONSTER_PACK, VOID, freshPackState, updatePackMonster, tickPackEffects } from '../src/monster-pack.ts';
import {
  WORLD_BEAST_IDS, isMarineTile, marineTileOpen, worldBeastFor, retreatCrossed,
  worldBeastsLost, consumeVoidTerrain, applyVoidScars,
} from '../src/world-beasts.ts';

const MARINE_BEASTS = ['voidWalker', 'psychicCrystal', 'lightningGiant', 'mountainTurtle']; // release 257: the Giant crosses the sea on its cloud; release 261: the Turtle walks it on ice
const SIDES = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] };
const at = (map, x, y) => map.tiles[y * 32 + x];
const position = e => ({ x: e.x, y: e.y });
const vitals = e => ({ hp: e.hp, maxHp: e.maxHp, damage: e.damage });
const roundTrip = save => migrateSave(JSON.parse(JSON.stringify(save)));
function seaMap(kind = null) {
  return {
    width: 32, height: 32, entry: { x: 3, y: 3 }, landscape: true, objects: [], enemySpawns: [],
    tiles: Array.from({ length: 1024 }, (_, i) => ({
      x: i % 32, y: Math.floor(i / 32), kind: kind || (i % 3 ? 'ocean' : 'deepOcean'),
      blocked: true, elev: 0, detail: i % 4,
    })),
  };
}
function isolatedSave(seed = 'CROSSING-OCEAN') {
  const save = freshSave(); save.seed = seed; save.level = 12; save.perception.aperture = 1e6; // release 273: world beasts are met only from their Aperture tier
  for (const id of WORLD_BEAST_IDS) save.worldBeasts[id].cooldown = 9999;
  return save;
}
function adapterFixture(kind = 'voidWalker', map = seaMap()) {
  const save = isolatedSave(), game = Object.assign(Object.create(Game.prototype), {
    map, area: 'overworld', save, rx: 12, ry: 8,
    player: { x: 17, y: 12, hp: 100000, invulnerableUntil: 0 },
    enemies: [], projectiles: [], effects: [], packEffects: [], performanceStats: { pathfindingWork: 0 },
  });
  const actor = game.createEnemyFromSpawn({ kind, x: 12, y: 12, id: `ocean-${kind}`, worldBeast: kind, boss: true });
  actor.aggro = true; game.enemies = [actor];
  return { game, actor, save, map };
}
function stepPack(game, frame, dt = .05) {
  const world = game.packWorld(dt, (frame + 1) * dt * 1000);
  for (const actor of game.enemies) updatePackMonster(actor, world);
  game.packEffects = tickPackEffects(game.packEffects, world);
}
function assertEdgesEqual(actual, expected, label) {
  for (let n = 0; n < 32; n++) for (const [x, y] of [[0, n], [31, n], [n, 0], [n, 31]])
    assert.deepEqual(at(actual, x, y), at(expected, x, y), `${label}: ${x},${y}`);
}

test('marine classification is exactly ocean/deepOcean, with no obstacle or other-water expansion', () => {
  for (const kind of ['ocean', 'deepOcean']) {
    assert.equal(isMarineTile({ kind }), true);
    assert.equal(marineTileOpen({ kind, blocked: true }), true, 'generated water blocks walking, not its marine occupant');
    for (const fields of [{ structure: 'districtWall' }, { buildingId: 'house' }, { environment: 'canyon' }, { pit: true }])
      assert.equal(marineTileOpen({ kind, ...fields }), false);
  }
  for (const kind of ['lakeWater', 'river', 'swampWater', 'toxicWater', 'dungeonWater', 'shallows', 'floor', 'wall']) {
    assert.equal(isMarineTile({ kind }), false); assert.equal(marineTileOpen({ kind }), false);
  }
  assert.equal(isMarineTile(null), false);
});

for (const kind of MARINE_BEASTS) test(`${kind} can claim blocked ocean and deepOcean without duplicating the held beast`, () => {
  for (const terrain of ['ocean', 'deepOcean']) {
    const save = isolatedSave(`OCEAN-SPAWN-${kind}-${terrain}`), map = seaMap(terrain);
    save.worldBeasts[kind].cooldown = 0;
    let spawn, rx;
    for (rx = 5; rx < 505 && !spawn; rx++) spawn = worldBeastFor(save, map, rx, 7);
    assert.equal(spawn?.kind, kind, 'the ordinary deterministic chance can claim all-water ground');
    const held = save.worldBeasts[kind].active;
    const initial = structuredClone(spawn);
    for (let visit = 0; visit < 4; visit++) assert.deepEqual(worldBeastFor(save, map, held.rx, held.ry), initial);
    assert.equal(WORLD_BEAST_IDS.filter(id => save.worldBeasts[id].active?.rx === held.rx && save.worldBeasts[id].active?.ry === held.ry).length, 1);
    assert.equal(at(map, spawn.x, spawn.y).blocked, true);
    assert.equal(at(map, spawn.x, spawn.y).kind, terrain);
    const { game } = adapterFixture(kind, map), boat = structuredClone(game.save.boat);
    const actor = game.createEnemyFromSpawn(spawn);
    assert.equal(actor.marine, true); assert.equal(actor.flying, kind === 'psychicCrystal');
    assert.equal(actor.phases, false); assert.deepEqual(game.save.boat, boat);
    assert.equal(Object.hasOwn({ ...actor }, '_marineTraversal'), false, 'navigation permission is not persisted actor state');
  }
});

test('unrelated world beasts and their ordinary landing/LOS callbacks do not gain ocean permission', () => {
  const { game, map } = adapterFixture(), world = game.packWorld(.05, 0), boat = structuredClone(game.save.boat);
  assert.equal(world.open(15, 15), false); assert.equal(world.tileOpen(15.5, 15.5), false);
  assert.equal(footprintOpen(map, 32, 15, 15), false); assert.equal(footprintSailable(map, 32, 15, 15), true);
  assert.equal(world.marineOpen(15, 15), true); assert.equal(world.marineTileOpen(15.5, 15.5), true);
  assert.equal(world.los({ kind: 'tremorWorm', x: 10, y: 12 }, { x: 17, y: 12 }), false);
  for (const kind of WORLD_BEAST_IDS.filter(id => !MARINE_BEASTS.includes(id) && id !== "astralWorm")) {
    const save = isolatedSave(); save.worldBeasts[kind].active = { rx: 12, ry: 8, tries: 0 };
    assert.equal(worldBeastFor(save, map, 12, 8), null, `${kind} still needs its original terrain`);
  }
  const ordinary = createCombatant('morphingBlob', 12, 12, true, []), before = position(ordinary);
  assert.equal(world.move(ordinary, .5, 0), false); assert.deepEqual(position(ordinary), before);
  assert.deepEqual(game.save.boat, boat);
});

for (const kind of MARINE_BEASTS) test(`${kind} crosses marine water but respects real walls, overlays and footprint bounds`, () => {
  const { game, actor, map, save } = adapterFixture(kind), world = game.packWorld(.05, 0), boat = structuredClone(save.boat);
  assert.equal(world.move(actor, .5, 0), true); assert.equal(actor.marine, true);
  assert.equal(world.oceanAt(actor.x, actor.y), true); assert.equal(world.los(actor, game.player), true);
  for (const fields of [
    { kind: 'wall', blocked: true },
    { kind: 'ocean', structure: 'districtWall', buildingId: 'house', wallSides: ['west'] },
    { kind: 'deepOcean', buildingId: 'yard' }, { kind: 'ocean', pit: true },
  ]) {
    const original = structuredClone(at(map, 14, 12)); Object.assign(at(map, 14, 12), fields);
    actor.x = 13; actor.y = 12;
    world.move(actor, 1, 0, { phase: true });
    assert.ok(actor.x < 14, 'no overworld Crystal phasing and no Walker wall clipping');
    assert.equal(world.marineOpen(14, 12), false); assert.equal(world.marineProjectileOpen(14.5, 12.5), false);
    assert.equal(world.los({ ...actor, x: 13, y: 12.5 }, { x: 16, y: 12.5 }), false);
    map.tiles[12 * 32 + 14] = original;
  }
  actor.x = 31; actor.y = 31; world.move(actor, 1, 1);
  assert.ok(footprintOpen(map, 32, actor.x, actor.y, !!actor.flying, true), 'the entire moving footprint stays within the map');
  for (const p of [[NaN, 0], [-2, 0], [32, 12], [12, 32]]) {
    assert.equal(world.marineOpen(...p), false); assert.equal(world.oceanAt(...p), false);
  }
  assert.deepEqual(save.boat, boat);
});

test('Walker ocean teleport rejects walls, structures, other actors, player overlap and map edges', () => {
  const { game, actor, map } = adapterFixture();
  assert.equal(game.walkerSafeTeleport(actor, 15, 15), true); assert.equal(actor.marine, true);
  Object.assign(at(map, 13, 13), { kind: 'wall', blocked: true });
  Object.assign(at(map, 14, 14), { buildingId: 'floating-building' });
  game.enemies.push({ id: 'occupied', x: 16, y: 16 });
  for (const p of [[13, 13], [14, 14], [16, 16], [17, 12], [-1, 12], [32, 12], [12, Infinity]]) {
    const before = position(actor); assert.equal(game.walkerSafeTeleport(actor, ...p), false); assert.deepEqual(position(actor), before);
  }
  assert.equal(game.walkerSafeTeleport(actor, 20, 20), true);
});

test('Crystal dungeon phasing remains separate from its overworld marine flight', () => {
  const { game, actor, map } = adapterFixture('psychicCrystal');
  Object.assign(at(map, 13, 12), { kind: 'wall', blocked: true });
  const surface = game.packWorld(.05, 0); surface.move(actor, 1, 0, { phase: true }); assert.ok(actor.x < 13);
  actor.x = 12; actor.y = 12; game.area = 'dungeon';
  assert.equal(game.packWorld(.05, 0).move(actor, 1, 0), true); assert.equal(actor.x, 13); assert.equal(actor.marine, false);
  assert.equal(game.packWorld(.05, 0).oceanAt(15, 15), false);
});

for (const kind of MARINE_BEASTS) test(`real saved ocean ${kind} and aboard player resume exactly after pause and migration`, () => {
  const save = isolatedSave(); save.worldBeasts[kind].active = { rx: 8, ry: -20, tries: 1 };
  const game = new Game(save, 0); game.rx = 8; game.ry = -20; game.loadArea('overworld', false);
  const actor = game.enemies.find(e => e.worldBeast === kind);
  assert.ok(actor);
  const water = game.map.tiles.filter(t => isMarineTile(t) && footprintSailable(game.map, 32, t.x + .03, t.y + .02));
  assert.ok(water.length >= 2);
  Object.assign(game.player, { x: water[0].x + .03, y: water[0].y + .02 });
  Object.assign(actor, { x: water[1].x + .03, y: water[1].y + .02, hp: 123, damage: 37 });
  Object.assign(save.boat, { owned: true, aboard: true, hull: 43, moored: null, home: { rx: 8, ry: -20, x: water[0].x, y: water[0].y } });
  const playerAt = position(game.player), actorAt = position(actor), health = vitals(actor), boat = structuredClone(save.boat);
  game.setPaused(true, 1000); assert.deepEqual(position(game.player), playerAt); game.exportSnapshot(1000);
  const savedActor = save.session.areas[game.areaStateId()].enemies.find(e => e.id === actor.id);
  assert.equal(Object.hasOwn(savedActor, '_marineTraversal'), false);
  savedActor.marine = false; // stale presentation metadata cannot disable real ocean support on resume
  const resumed = new Game(roundTrip(save), 5000), restored = resumed.enemies.find(e => e.id === actor.id);
  assert.ok(restored); assert.deepEqual(position(restored), actorAt); assert.deepEqual(vitals(restored), health);
  assert.deepEqual(position(resumed.player), playerAt); assert.deepEqual(resumed.save.boat, boat);
  assert.equal(restored.marine, true); assert.equal(resumed.paused, true);
  assert.equal(resumed.enemies.filter(e => e.worldBeast === kind).length, 1, 'resume does not add a boat/duplicate boss actor');
});

test('all-ocean Supernova creates no floor, scar record, object change or player-boat mutation', () => {
  const { game, actor, map, save } = adapterFixture(), terrain = structuredClone(map.tiles), boat = structuredClone(save.boat);
  map.objects.push({ id: 'buoy', kind: 'checkpoint', x: 15, y: 15, state: 'quiet' });
  const objects = structuredClone(map.objects), world = game.packWorld(.05, 0);
  const result = world.consumeVoidTerrain(actor, { x: 16.13, y: 15.27 }, 7);
  assert.equal(result.ok, true); assert.equal(result.changed, 0); assert.equal(result.visualChanged, false);
  assert.equal(save.voidScars.areas[game.areaStateId()], undefined);
  assert.deepEqual(map.tiles, terrain); assert.deepEqual(map.objects, objects); assert.deepEqual(save.boat, boat);
});

test('coastal Supernova consumes land locally while preserving exact marine cells through repeated replay', () => {
  const map = seaMap(), save = isolatedSave(), key = 'overworld:12:8:g1';
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) Object.assign(at(map, x, y), { kind: x === 15 ? 'wall' : 'floor', blocked: x === 15 });
  Object.assign(at(map, 16, 15), { waterDepth: 'deep', current: { dx: .2, dy: .1 }, detail: 27 });
  map.objects.push({ id: 'coast-door', kind: 'dungeon', x: 14, y: 15, state: 'locked' });
  save.worldFlags.oceanRegression = 'unresolved';
  const base = structuredClone(map), objects = structuredClone(map.objects), flags = structuredClone(save.worldFlags), boat = structuredClone(save.boat);
  const result = consumeVoidTerrain(save, map, key, { x: 15.7, y: 15.6 }, 5.2);
  assert.equal(result.ok, true); assert.ok(result.changed > 0); assert.equal(at(map, 15, 15).kind, 'voidScar');
  assert.equal(footprintHazard(map, 32, 16, 15), at(base, 16, 15).kind);
  for (let i = 0; i < 1024; i++) if (isMarineTile(base.tiles[i])) assert.deepEqual(map.tiles[i], base.tiles[i]);
  assert.ok(save.voidScars.areas[key].cells.every(cell => { const [x, y] = cell.split(',').map(Number); return x < 16; }));
  for (let replay = 0; replay < 3; replay++) {
    const restored = structuredClone(base), migrated = roundTrip(save);
    assert.equal(applyVoidScars(migrated, restored, key).ok, true);
    assert.deepEqual(restored.tiles, map.tiles); assert.deepEqual(restored.objects, objects);
  }
  assert.deepEqual(save.worldFlags, flags); assert.deepEqual(save.boat, boat);
  // Historical/imported scar cells cannot turn a currently marine base tile into an artificial island either.
  const imported = roundTrip(save); imported.voidScars.areas[key].cells.push('16,15');
  const restored = structuredClone(base); assert.equal(applyVoidScars(imported, restored, key).ok, true);
  assert.deepEqual(at(restored, 16, 15), at(base, 16, 15));
});

for (const attack of MONSTER_PACK.voidWalker.attacks) test(`production Game.update completes ocean ${attack} with legal actors and bounded effects`, () => {
  const save = isolatedSave(`OCEAN-FULL-${attack}`), game = new Game(save, 0), map = seaMap();
  save.maxHp = 10000;
  Object.assign(save.boat, { owned: true, aboard: true, hull: 60, home: { rx: 5, ry: 5, x: 16, y: 16 }, moored: null });
  const boat = structuredClone(save.boat), terrain = structuredClone(map.tiles);
  save.worldBeasts.voidWalker.active = { rx: 5, ry: 5, tries: 0 };
  Object.assign(game, { area: 'overworld', rx: 5, ry: 5, map, enemies: [], effects: [], packEffects: [], projectiles: [], paused: false, seaHazards: null, storm: null });
  Object.assign(game.player, { x: 16, y: 16, hp: 10000, invulnerableUntil: 0, dodgeUntil: 0 });
  const actor = game.createEnemyFromSpawn({ kind: 'voidWalker', x: 18, y: 18, id: `ocean-full-${attack}`, worldBeast: 'voidWalker', boss: true });
  // Low fixture damage keeps the real player's skiff afloat without replacing its ordinary hull-damage path.
  Object.assign(actor, { aggro: true, hp: 3000, maxHp: 3000, damage: 2, packAttacks: [attack], packBossAttacks: [] });
  actor.pack = freshPackState(); actor.pack.gap = 0; game.enemies = [actor];
  let began = false, peak = 0, now = 0, pauseChecked = false, hurt = 0;
  for (let frame = 0; frame < 360; frame++) {
    now += 50; const t = frame * .05;
    const input = { state: { x: 16 + Math.sin(t * .7) * 2.6 - game.player.x, y: 16 + Math.cos(t * .55) * 2.6 - game.player.y }, consume() { return false; } };
    const hp = game.player.hp; game.update(.05, input, now); hurt += Math.max(0, hp - game.player.hp);
    if (actor.pack.attack === attack) { began = true; actor.packAttacks = []; }
    peak = Math.max(peak, game.packEffects.length);
    assert.ok(peak <= 48); assert.equal(game.enemies.length, 1, 'the skiff and wraith effects are not new persistent actors');
    assert.ok([actor.x, actor.y, game.player.x, game.player.y, game.player.hp].every(Number.isFinite));
    assert.ok(walkerGroundPositionOpen(map, 32, actor.x, actor.y, true));
    assert.ok(footprintSailable(map, 32, game.player.x, game.player.y));
    assert.deepEqual({ ...save.boat, hull: 60 }, boat); assert.ok(save.boat.hull > 0 && save.boat.hull <= 60);
    if (attack === 'voidSupernova' && frame === 60) {
      const playerAt = position(game.player); game.setPaused(true, now); assert.deepEqual(position(game.player), playerAt);
      const frozen = structuredClone({ pack: actor.pack, effects: game.packEffects, actor: position(actor), player: position(game.player), hp: game.player.hp });
      for (let wait = 0; wait < 20; wait++) { now += 500; game.update(.05, input, now); }
      assert.deepEqual({ pack: actor.pack, effects: game.packEffects, actor: position(actor), player: position(game.player), hp: game.player.hp }, frozen);
      game.setPaused(false, now); pauseChecked = true;
    }
  }
  assert.equal(began, true); assert.equal(actor.pack.attack, null); assert.equal(game.packEffects.length, 0);
  assert.deepEqual(map.tiles, terrain); assert.equal(save.voidScars.areas[game.areaStateId()], undefined);
  if (attack === 'voidSupernova') { assert.ok(hurt > 0, 'marine Nova remains damaging'); assert.equal(pauseChecked, true); }
});

for (const side of Object.keys(SIDES)) test(`legal ${side} marine crossing preserves exact entry and wounded vitals through migration`, () => {
  const save = isolatedSave(), map = seaMap(), neighbor = seaMap(), pairs = walkerSectionCrossings(map, neighbor, side);
  assert.equal(pairs.length, 32); const chosen = pairs[11];
  Object.assign(at(neighbor, chosen.entry.x, chosen.entry.y), { structure: 'shackWall', buildingId: 'obstruction' });
  assert.equal(walkerSectionCrossings(map, neighbor, side).length, 31);
  delete at(neighbor, chosen.entry.x, chosen.entry.y).structure; delete at(neighbor, chosen.entry.x, chosen.entry.y).buildingId;
  save.worldBeasts.voidWalker.active = { rx: 9, ry: 5, tries: 1, retreat: { home: { rx: 20, ry: 5, found: true }, side: null, legs: 0 } };
  const health = { hp: 123, maxHp: 900, damage: 37 };
  retreatCrossed(save, 'voidWalker', side, chosen.entry, health);
  const migrated = roundTrip(save), active = migrated.worldBeasts.voidWalker.active;
  assert.equal(active.rx, 9 + SIDES[side][0]); assert.equal(active.ry, 5 + SIDES[side][1]); assert.equal(active.tries, 1);
  assert.deepEqual(active.retreat.entry, chosen.entry); assert.deepEqual(active.retreat.vitals, health);
  const spawn = worldBeastFor(migrated, neighbor, active.rx, active.ry), { game } = adapterFixture('voidWalker', neighbor);
  game.save = migrated; const actor = game.createEnemyFromSpawn(spawn);
  assert.deepEqual(position(actor), chosen.entry); assert.deepEqual(vitals(actor), health); assert.equal(actor.retreating, true);
  assert.equal(actor.untargetable, true); assert.equal(migrated.worldBeasts.voidWalker.escaped, 0);
  assert.deepEqual(worldBeastsLost(migrated, 'overworld', -100, -100), []);
  assert.ok(migrated.worldBeasts.voidWalker.active, 'unloaded sea retreat is paused, not counted as escape');
});

test('adjacent previews preserve pins/save state and match real loaded edges, including saved scars', () => {
  let marineEdges = 0;
  // Fixed representative sections and explicit old/current pins. No unbounded seed hunt in the test suite.
  for (const [rx, ry, pin] of [[8, -20, null], [9, -20, 3], [15, -18, 2], [22, -20, 0], [30, -19, 1]]) {
    const save = isolatedSave(); save.atlas ||= {};
    if (pin !== null) { save.atlas[`${rx},${ry}`] = pin ? { landscapeVersion: pin, seaVersion: 1, hamletVersion: 2, travelVersion: 1 } : { terrain: 'old-section' }; save.explored[`${rx},${ry}`] = true; }
    const key = `overworld:${rx}:${ry}:g${save.worldGeneration}`, base = walkerCrossingMap(save, rx, ry);
    const edge = base.tiles.find(t => t.x === 31 && !isMarineTile(t));
    if (edge) assert.equal(consumeVoidTerrain(save, base, key, { x: edge.x + .4, y: edge.y + .4 }, .5).ok, true);
    const object = base.objects[0];
    if (object) save.session.areas[key] = { enemies: [], objects: { [object.id]: { state: 'ocean-test-preserved', hits: { old: 2 } } }, projectiles: [], effects: [] };
    const before = structuredClone(save), preview = walkerCrossingMap(save, rx, ry);
    assert.deepEqual(save, before, 'no atlas/discovery/version/hunt/boat/object-state mutation during probing');
    const loaded = new Game(roundTrip(save), 0); loaded.rx = rx; loaded.ry = ry; loaded.loadArea('overworld', false);
    assertEdgesEqual(preview, loaded.map, `pinned ${pin} ${rx},${ry}`);
    if (object) assert.equal(preview.objects.find(o => o.id === object.id).state, 'ocean-test-preserved');
    marineEdges += preview.tiles.filter(t => (t.x === 0 || t.x === 31 || t.y === 0 || t.y === 31) && isMarineTile(t)).length;
  }
  assert.ok(marineEdges > 0, 'generated marine edges were actually exercised');
});

test('actual generated section sailing preserves wounded health and exact position across full Game reload', () => {
  const save = isolatedSave(), rx = 8, ry = -20;
  const source = walkerCrossingMap(save, rx, ry), neighbor = walkerCrossingMap(save, rx + 1, ry);
  const pair = walkerSectionCrossings(source, neighbor, 'east').find(p => walkerGroundPositionOpen(source, 32, 29, p.y, true) && walkerGroundPositionOpen(source, 32, 30, p.y, true));
  assert.ok(pair, 'the fixed generated fixture has a legal marine crossing');
  save.worldBeasts.voidWalker.active = { rx, ry, tries: 1, retreat: { home: { rx: rx + 1, ry, found: true }, side: null, legs: 0 } };
  let game = new Game(save, 0); game.rx = rx; game.ry = ry; game.loadArea('overworld', false);
  let actor = game.enemies.find(e => e.worldBeast === 'voidWalker'); assert.ok(actor);
  const health = { hp: 123, maxHp: 900, damage: 37 };
  Object.assign(actor, { x: 29, y: pair.y, ...health, retreating: true }); game.enemies = [actor];
  let steps = 0;
  for (; steps < 500 && game.enemies.includes(actor); steps++) {
    game.tickWorldBeasts(.05); if (!game.enemies.includes(actor)) break;
    const old = position(actor); game.performanceStats.pathfindingWork = 0;
    updatePackMonster(actor, game.packWorld(.05, steps * 50));
    assert.ok(Math.hypot(actor.x - old.x, actor.y - old.y) <= .106); assert.ok(game.performanceStats.pathfindingWork <= WALKER_ROUTE.nodes);
    assert.ok(walkerGroundPositionOpen(game.map, 32, actor.x, actor.y, true));
  }
  assert.ok(steps < 500); assert.equal(save.worldBeasts.voidWalker.escaped, 0);
  const entry = structuredClone(save.worldBeasts.voidWalker.active.retreat.entry);
  assert.deepEqual(entry, { x: 0, y: actor.y }); assert.equal(save.worldBeasts.voidWalker.active.rx, rx + 1);
  game.exportSnapshot(50000); game.rx = rx + 1; game.loadArea('overworld', false);
  actor = game.enemies.find(e => e.worldBeast === 'voidWalker'); assert.ok(actor);
  assert.deepEqual(position(actor), entry); assert.deepEqual(vitals(actor), health, 'fresh-section threat scaling must not heal a retreat');
  game.exportSnapshot(50000); game = new Game(roundTrip(save), 50000);
  actor = game.enemies.find(e => e.worldBeast === 'voidWalker'); assert.ok(actor);
  assert.deepEqual(position(actor), entry); assert.deepEqual(vitals(actor), health); assert.equal(game.save.worldBeasts.voidWalker.escaped, 0);
});

test('blocked marine neighbor waits without teleport/fade and retries within the route budget when opened', () => {
  const { game, actor, map, save } = adapterFixture();
  save.worldBeasts.voidWalker.active = { rx: 12, ry: 8, tries: 1, retreat: { home: { rx: 13, ry: 8, found: true }, side: null, legs: 0 } };
  Object.assign(actor, { x: 20, y: 12, retreating: true, fleeTo: { x: 31.4, y: 15, side: 'east' } });
  game.walkerSafeTeleport = () => assert.fail('a retreat cannot teleport');
  game.packWorld(.05, 0).walkerRetreat(actor, actor.pack);
  // Inject a deterministic adjacent geometry fixture into the real cached planner; movement/search remain production code.
  const route = game._walkerRoutes.get(actor);
  route.crossingMap = { ...map, tiles: map.tiles.map(t => ({ ...t, kind: 'wall' })) };
  Object.assign(route, { route: [], search: null, wait: 0, topologyTime: 0 }); actor.x = 20; actor.y = 12;
  const start = position(actor);
  for (let frame = 0; frame < 200; frame++) stepPack(game, frame);
  assert.deepEqual(position(actor), start); assert.equal(actor.fleeDone, undefined); assert.equal(actor.fleeFade, undefined);
  assert.equal(save.worldBeasts.voidWalker.escaped, 0);
  Object.assign(at(route.crossingMap, 0, 12), { kind: 'ocean' });
  let steps = 0;
  for (; steps < 500 && !actor.fleeDone; steps++) {
    const old = position(actor); game.performanceStats.pathfindingWork = 0; stepPack(game, steps + 200);
    assert.ok(Math.hypot(actor.x - old.x, actor.y - old.y) <= .106); assert.ok(game.performanceStats.pathfindingWork <= WALKER_ROUTE.nodes);
  }
  assert.equal(actor.fleeDone, true); assert.deepEqual(position(actor), { x: 31, y: 12 });
  assert.deepEqual(actor.fleeTo.crossingEntry, { x: 0, y: 12 }); game.tickWorldBeasts(.05);
  assert.equal(save.worldBeasts.voidWalker.escaped, 0); assert.equal(save.worldBeasts.voidWalker.active.rx, 13);
});

test('reaching a sea edge without a dungeon door never completes the Walker retreat', () => {
  const { game, actor, map, save } = adapterFixture();
  save.worldBeasts.voidWalker.active = { rx: 12, ry: 8, tries: 1, retreat: { home: { rx: 12, ry: 8, found: false }, side: null, legs: 0 } };
  Object.assign(actor, { x: 31, y: 12, retreating: true });
  game.walkerSafeTeleport = () => assert.fail('no fallback teleport');
  for (let frame = 0; frame < 120; frame++) { game.tickWorldBeasts(.05); stepPack(game, frame); }
  assert.deepEqual(position(actor), { x: 31, y: 12 }); assert.equal(actor.fleeDone, undefined); assert.equal(actor.fleeFade, undefined);
  assert.equal(save.worldBeasts.voidWalker.escaped, 0); assert.ok(game.enemies.includes(actor));
  // Only an actual reachable mouth, not this boundary, allows finishing after normal traversal.
  Object.assign(at(map, 29, 12), { kind: 'floor', blocked: false });
  map.objects.push({ id: 'real-mouth', kind: 'dungeon', x: 29, y: 12, state: 'open' });
  for (let frame = 120; frame < 280 && game.enemies.includes(actor); frame++) {
    game.tickWorldBeasts(.05); if (!game.enemies.includes(actor)) break;
    const old = position(actor); stepPack(game, frame); assert.ok(Math.hypot(actor.x - old.x, actor.y - old.y) <= .106);
  }
  assert.deepEqual(position(actor), { x: 29, y: 12 }); assert.equal(game.enemies.includes(actor), false);
  assert.equal(save.worldBeasts.voidWalker.escaped, 1); assert.equal(save.worldBeasts.voidWalker.active, null);
});

const IDLE_INPUT = { state: { x: 0, y: 0 }, consume() { return false; } };
function coastalGame(side = 'west') {
  const save = isolatedSave(`FORCED-COAST-${side}`), game = new Game(save, 0), map = seaMap('ocean');
  for (const tile of map.tiles) {
    const land = side === 'west' ? tile.x < 16 : side === 'east' ? tile.x >= 16 : side === 'north' ? tile.y < 16 : tile.y >= 16;
    if (land) Object.assign(tile, { kind: 'floor', blocked: false });
  }
  save.maxHp = 200;
  Object.assign(save.boat, { owned: true, aboard: true, hull: 60, home: { rx: 5, ry: 5, x: 20, y: 20 }, moored: null });
  Object.assign(game, { area: 'overworld', rx: 5, ry: 5, map, enemies: [], effects: [], packEffects: [], projectiles: [], paused: false, seaHazards: null, storm: null });
  const start = { west: { x: 15.8, y: 15 }, east: { x: 15.2, y: 15 }, north: { x: 15, y: 15.54 }, south: { x: 15, y: 15.08 } }[side];
  Object.assign(game.player, { ...start, hp: 200, invulnerableUntil: 0, dodgeUntil: 0, sailVx: 0, sailVy: 0 });
  assert.ok(footprintSailable(map, 32, game.player.x, game.player.y));
  return { game, save, map, landward: SIDES[side] };
}

test('coastal forced pull cannot strand an aboard player and trigger idle disembark/drowning', () => {
  const { game, save } = coastalGame(), boat = structuredClone(save.boat);
  game.packWorld(.05, 100).pull({ x: 13, y: 15 }, .11, 4.3);
  const afterPull = { ...position(game.player), sailable: footprintSailable(game.map, 32, game.player.x, game.player.y) };
  game.update(.05, IDLE_INPUT, 150);
  const afterIdle = { ...position(game.player), aboard: save.boat.aboard, hull: save.boat.hull };
  game.update(.05, IDLE_INPUT, 200);
  assert.equal(afterPull.sailable, true, JSON.stringify({ afterPull, afterIdle, deaths: save.worldFlags.deaths || 0 }));
  assert.deepEqual(save.boat, boat); assert.equal(save.worldFlags.deaths || 0, 0);
  assert.equal(game.player.hp, 200); assert.ok(footprintSailable(game.map, 32, game.player.x, game.player.y));
});

// Start at the production active effect/attack boundary, rather than replacing the movement or damage callbacks.
function startCoastalForce(game, attack, source) {
  const crystal = attack.startsWith('psy'), actor = game.createEnemyFromSpawn({ kind: crystal ? 'psychicCrystal' : 'voidWalker', ...source, id: `coast-${attack}`, boss: true });
  Object.assign(actor, { aggro: true, hp: 3000, maxHp: 3000, damage: 10, packAttacks: [], packBossAttacks: [] });
  actor.pack = freshPackState(); actor.pack.gap = 999; game.enemies = [actor];
  if (crystal) Object.assign(actor.pack, { state: 'attack', attack, phase: attack === 'psyPush' ? 'windup' : 'active', t: attack === 'psyPush' ? .001 : 1.2, data: {}, hitOnce: false });
  else {
    actor.hitStun = 60; // hold the emitter still; its real independent effects continue ticking
    const effect = attack === 'voidHorizon'
      ? { kind: attack, radius: VOID.horizonRadius, coreRadius: VOID.horizonCore, life: VOID.horizonLife, pulsar: false, nextBite: 0 }
      : { kind: attack, radius: VOID.novaRadius, life: VOID.novaLife, total: VOID.novaLife, stage: 'charge', elapsed: 0, nextLocal: .25, nextAfter: VOID.novaCharge, waves: 2, wavesFired: 0, nextWave: VOID.novaCharge, eruptions: 0, seed: 1 };
    game.packWorld(.05, 0).addEffect({ ...effect, ...source, owner: actor.id, arming: 0, damage: 10 });
  }
  return actor;
}
function assertAfloat(game, before, label) {
  const { player: p, save } = game;
  assert.ok(footprintSailable(game.map, 32, p.x, p.y), `${label}: entire footprint remains sailable at ${p.x},${p.y}`);
  assert.equal(bergAt(game.seaHazards, p.x, p.y), false, `${label}: no iceberg penetration`);
  assert.deepEqual({ ...save.boat, hull: before.hull }, before, `${label}: no forced disembark, mooring or boat transfer`);
  assert.ok(save.boat.hull > 0 && save.boat.hull <= before.hull); assert.equal(save.worldFlags.deaths || 0, 0);
  assert.ok([p.x, p.y, p.hp, save.boat.hull].every(Number.isFinite));
}

for (const side of Object.keys(SIDES)) for (const attack of ['voidHorizon', 'voidNova', 'psyPull', 'psyPush'])
  test(`${attack} cannot force a sailing player across the ${side} coast during full Game.update`, () => {
    const { game, save, landward: [dx, dy] } = coastalGame(side), boat = structuredClone(save.boat), start = position(game.player);
    const direction = attack === 'psyPush' ? -1 : 1;
    startCoastalForce(game, attack, { x: start.x + dx * direction * 2.8, y: start.y + dy * direction * 2.8 });
    for (let frame = 0; frame < 12; frame++) { game.update(.05, IDLE_INPUT, 100 + frame * 50); assertAfloat(game, boat, `${attack}/${side}/${frame}`); }
    assert.ok(Math.hypot(game.player.x - start.x, game.player.y - start.y) < .06, 'the attempted force reaches the shore guard, not dry land');
    game.enemies = []; game.packEffects = [];
    for (let frame = 0; frame < 3; frame++) { game.update(.05, IDLE_INPUT, 1000 + frame * 50); assertAfloat(game, boat, 'subsequent idle frame'); }
    assert.equal(game.map.objects.some(o => o.id === 'skiff-moored'), false);
  });

for (const method of ['pull', 'push']) for (const blocker of ['island', 'building', 'iceberg'])
  test(`long-step marine ${method} sweeps against a thin ${blocker} instead of tunnelling`, () => {
    const { game, save } = coastalGame(), map = game.map = seaMap('ocean'), boat = structuredClone(save.boat);
    Object.assign(game.player, { x: 8, y: 15 });
    if (blocker === 'iceberg') game.seaHazards = { bergs: [{ x: 12.5, y: 15.7, radius: .35 }] };
    else Object.assign(at(map, 12, 15), blocker === 'island' ? { kind: 'floor', blocked: false } : { structure: 'shackWall', buildingId: 'sea-house' });
    assert.ok(footprintSailable(map, 32, 20, 15), 'the distant endpoint alone is legal; only a sweep detects the obstacle');
    game.packWorld(.05, 100)[method]({ x: method === 'pull' ? 22 : 2, y: 15 }, 12, 30);
    assert.ok(game.player.x > 8, 'legal water before the obstacle remains traversable');
    assert.ok(game.player.x < 12, `${blocker} cannot be crossed even when the far endpoint is water`);
    assertAfloat(game, boat, `${method}/${blocker}`);
  });

for (const attack of ['voidHorizon', 'voidNova', 'psyPull', 'psyPush'])
  test(`${attack} coastal force is frozen by pause and resisted while dodging`, () => {
    const { game, save, landward: [dx, dy] } = coastalGame(), start = position(game.player), boat = structuredClone(save.boat);
    const direction = attack === 'psyPush' ? -1 : 1;
    const actor = startCoastalForce(game, attack, { x: start.x + dx * direction * 2.8, y: start.y + dy * direction * 2.8 });
    game.setPaused(true, 100);
    const frozen = structuredClone({ player: position(game.player), hp: game.player.hp, boat: save.boat, pack: actor.pack, effects: game.packEffects });
    for (let frame = 0; frame < 4; frame++) game.update(.05, IDLE_INPUT, 500 + frame * 50);
    assert.deepEqual({ player: position(game.player), hp: game.player.hp, boat: save.boat, pack: actor.pack, effects: game.packEffects }, frozen);
    game.setPaused(false, 1000);
    Object.assign(game.player, { dodgeUntil: 2000, dodgeX: 0, dodgeY: 0 });
    for (let frame = 0; frame < 6; frame++) { game.update(.05, IDLE_INPUT, 1050 + frame * 50); assert.deepEqual(position(game.player), start); assertAfloat(game, boat, attack); }
  });

for (const attack of ['voidHorizon', 'voidNova', 'psyPull', 'psyPush'])
  test(`${attack} still damages the sailor and real hull on open water`, () => {
    const { game, save } = coastalGame(); game.map = seaMap('ocean'); Object.assign(game.player, { x: 16, y: 15 });
    const boat = structuredClone(save.boat), actor = startCoastalForce(game, attack, { x: 17.05, y: 15 });
    if (attack === 'voidNova') Object.assign(game.packEffects[0], { x: game.player.x, y: game.player.y, elapsed: VOID.novaCharge });
    for (let frame = 0; frame < 12; frame++) { game.update(.05, IDLE_INPUT, 100 + frame * 50); assertAfloat(game, boat, attack); }
    assert.ok(game.player.hp < 200, 'navigation safety must not grant combat invulnerability');
    assert.ok(save.boat.hull < 60, 'ordinary hull absorption is still exercised'); assert.equal(actor.dead, false);
  });

for (const method of ['pull', 'push']) test(`on-foot ${method} retains ordinary land/wall/hazard movement instead of marine rules`, () => {
  const { game, save } = coastalGame(), map = game.map = seaMap('ocean'); save.boat.aboard = false;
  for (const tile of map.tiles) Object.assign(tile, { kind: 'floor', blocked: false });
  const boat = structuredClone(save.boat), source = { x: method === 'pull' ? 20 : 2, y: 15 };
  for (const terrain of ['floor', 'wall', 'ocean']) {
    Object.assign(game.player, { x: 10, y: 15, dodgeUntil: 0 }); Object.assign(at(map, 11, 15), { kind: terrain, blocked: terrain !== 'floor' });
    const expected = { x: 10, y: 15 }; moveAxis(expected, 1, 0, map, 32, true);
    game.packWorld(.05, 100)[method](source, 1, 30);
    assert.deepEqual(position(game.player), expected, `${terrain} keeps the original allow-lethal movement semantics`);
    assert.deepEqual(save.boat, boat);
  }
  const start = position(game.player); game.player.dodgeUntil = 500;
  assert.equal(game.packWorld(.05, 100)[method](source, 1, 30), false); assert.deepEqual(position(game.player), start);
});

for (const method of ['pull', 'push']) test(`unobstructed marine ${method} retains its force and does not alter skiff momentum or ownership`, () => {
  const { game, save } = coastalGame(); game.map = seaMap('ocean');
  Object.assign(game.player, { x: 16, y: 15, sailVx: .7, sailVy: -.3 });
  const boat = structuredClone(save.boat), source = method === 'pull' ? { x: 20, y: 19 } : { x: 12, y: 11 };
  game.packWorld(.05, 100)[method](source, .5, 10);
  assert.ok(Math.abs(game.player.x - (16 + .5 / Math.SQRT2)) < 1e-10);
  assert.ok(Math.abs(game.player.y - (15 + .5 / Math.SQRT2)) < 1e-10);
  assert.deepEqual({ x: game.player.sailVx, y: game.player.sailVy }, { x: .7, y: -.3 });
  assert.deepEqual(save.boat, boat); assertAfloat(game, boat, method);
});

test('deliberate player-directed coastal landing still disembarks and moors normally', () => {
  const { game, save } = coastalGame(), home = structuredClone(save.boat.home);
  const towardShore = { state: { x: -1, y: 0 }, consume() { return false; } };
  for (let frame = 0; frame < 8 && save.boat.aboard; frame++) game.update(.05, towardShore, 100 + frame * 50);
  assert.equal(save.boat.aboard, false); assert.equal(save.boat.owned, true); assert.equal(save.boat.hull, 60);
  assert.deepEqual(save.boat.home, home); assert.deepEqual(save.boat.moored, { rx: 5, ry: 5, x: 16, y: 15 });
  assert.ok(game.map.objects.some(o => o.id === 'skiff-moored'));
  game.update(.05, IDLE_INPUT, 1000);
  assert.equal(game.player.hp, 200); assert.equal(save.worldFlags.deaths || 0, 0);
  assert.ok(footprintOpen(game.map, 32, game.player.x, game.player.y));
  assert.equal(footprintHazard(game.map, 32, game.player.x, game.player.y), null);
});
