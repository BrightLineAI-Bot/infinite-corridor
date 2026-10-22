// Approved Crystal dungeon-domain patrol regressions: terrain and walls do not confine it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRYSTAL, isDungeonRoamer, dungeonPatrolRoute, updatePackMonster,
  resetPackRuntime,
} from '../src/monster-pack.ts';
import {
  Game, shouldSimulateEnemy, activeDungeonEnemies,
} from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { LETHAL_KINDS, liftAt } from '../src/landscape.ts';
import { crystalFlightLift, drawPackMonster, drawPackTelegraphs } from '../src/monster-render.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { hashSeed } from '../src/random.ts';
import {
  beginDungeonRetreat,
  WORLD_BEASTS, worldBeastForDungeon,
} from '../src/world-beasts.ts';

const IDLE = { state: { x: 0, y: 0 }, consume: () => false };
function mapOf(width = 32, height = width) {
  return {
    width, height, entry: { x: 3, y: 4 }, objects: [], enemySpawns: [],
    tiles: Array.from({ length: width * height }, (_, i) => ({
      x: i % width, y: Math.floor(i / width), kind: 'wall', blocked: true,
    })),
  };
}
function tile(map, x, y, kind = 'floor', blocked = false) {
  Object.assign(map.tiles[y * map.width + x], { kind, blocked });
}
function rect(map, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tile(map, x, y);
  return map;
}
function rooms() {
  const m = mapOf();
  rect(m, 3, 3, 8, 8);
  rect(m, 8, 6, 19, 6);
  rect(m, 19, 6, 19, 20);
  rect(m, 17, 18, 25, 25);
  return m;
}
function hall() {
  return rect(mapOf(32, 12), 2, 5, 28, 5);
}
function fixture(map = rooms(), { x = 4, y = 5, player = { x: 29, y: 29 }, dt = .05 } = {}) {
  const game = Object.assign(Object.create(Game.prototype), {
    save: freshSave(), area: 'dungeon', map,
    player: { ...player, hp: 1e6, facing: 'down' },
    enemies: [], projectiles: [], effects: [], packEffects: [],
    performanceStats: { pathfindingWork: 0 },
  });
  const e = createCombatant('psychicCrystal', x, y, true, []);
  Object.assign(e, {
    id: 'roaming-crystal', worldBeast: 'psychicCrystal', aggro: false,
    evasive: false, hp: 1234, maxHp: 3000, packAttacks: [], packBossAttacks: [],
  });
  game.enemies = [e];
  const w = game.packWorld(dt, 0), hurts = [], work = [];
  w.hurt = (...args) => { hurts.push(args); return true; };
  const countWork = w.roamWork;
  w.roamWork = (n) => { work.push(n); countWork(n); };
  return { game, map, w, e, hurts, work };
}
function advance(f, seconds, each = () => {}) {
  for (let i = 0; i < Math.ceil(seconds / f.w.dt - 1e-8); i++) {
    f.w.now += f.w.dt * 1000;
    updatePackMonster(f.e, f.w);
    each();
  }
}
function inside(map, e) {
  assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y));
  assert.ok(e.x >= 0 && e.x <= map.width - 1 && e.y >= 0 && e.y <= map.height - 1,
    `left dungeon bounds at ${e.x},${e.y}`);
}
function knownRoute(f, to) {
  f.e.pack.roam = { route: [{ ...to }], recent: [], seq: 1, wait: 0 };
  f.w.los = () => false;
}
function entryComponent(map) {
  // Independent check for the old regression fixtures, not a gameplay movement rule.
  const seen = new Set(), queue = [map.entry];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i], k = y * map.width + x, t = map.tiles[k];
    if (x < 0 || y < 0 || x >= map.width || y >= map.height || seen.has(k) || !t || t.blocked || LETHAL_KINDS.has(t.kind)) continue;
    seen.add(k);
    queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  return seen;
}
function realDungeon(site, active = null) {
  const save = freshSave(); save.seed = 'ROAM-REVIEW'; save.level = 8; save.perception.aperture = 1e6; // release 273: world beasts are met only from their Aperture tier
  const game = new Game(save, 0), id = `dungeon:ROAM-REVIEW:g1:5:5:site-${site}`;
  save.session.activeDungeonId = id; save.consequences.dungeons[id] = { layoutPool: 4, themePool: 2 }; // release 301: these sites were written against layout pool 4 and theme pool 2
  if (active) save.worldBeasts.psychicCrystal.active = { dungeon: id, ...active };
  game.loadArea('dungeon', false);
  return { save, game, id, e: game.enemies.find((q) => q.worldBeast === 'psychicCrystal') };
}
function completeRetreat(game, e) {
  game.tickWorldBeasts(.05);
  assert.ok(e.fleeTo?.home);
  const to = { x: e.fleeTo.x, y: e.fleeTo.y }, w = game.packWorld(.05, 0);
  assert.equal(game.map.tiles[to.y * game.map.width + to.x].kind, 'dungeonWater');
  for (let i = 0; i < 1200 && !e.fleeDone; i++) {
    w.now += 50; updatePackMonster(e, w); game.tickWorldBeasts(w.dt);
  }
  assert.equal(e.fleeDone, true, 'retreat finishes rather than hanging');
  assert.deepEqual({ x: e.x, y: e.y }, to);
  assert.equal(game.save.worldBeasts.psychicCrystal.active, null);
  assert.equal(game.save.worldBeasts.psychicCrystal.escaped, 1);
  assert.ok(!game.enemies.includes(e));
}

test('only the implemented dungeon world-beast Crystal opts into roaming', () => {
  assert.equal(isDungeonRoamer({ worldBeast: 'psychicCrystal', kind: 'psychicCrystal' }, 'dungeon'), true);
  assert.equal(isDungeonRoamer({ worldBeast: 'psychicCrystal', kind: 'psychicCrystal' }, 'overworld'), false);
  assert.equal(isDungeonRoamer({ kind: 'psychicCrystal' }, 'dungeon'), false, 'ordinary fixtures do not become persistent hunters');
  for (const kind of ['nanobotKnight', 'morphingBlob', 'voidWalker']) {
    assert.equal(isDungeonRoamer({ kind, worldBeast: kind }, 'dungeon'), false, kind);
  }
});


test('a distant idle Crystal remains in the capped active dungeon set, while ordinary distant foes sleep', () => {
  const f = fixture(), player = { x: 1, y: 1 };
  f.e.x = 90; f.e.y = 90;
  const crowded = Array.from({ length: 30 }, (_, i) => ({
    id: `near-${i}`, x: 2, y: 2, hp: 10, boss: i % 2 === 0, aggro: true, dead: false,
  }));
  assert.equal(shouldSimulateEnemy(f.e, player, 'dungeon'), true);
  assert.equal(shouldSimulateEnemy({ kind: 'ashling', x: 90, y: 90 }, player, 'dungeon'), false);
  for (const cap of [1, 3, 8]) {
    const live = activeDungeonEnemies([...crowded, f.e], player, { activeEnemyCap: cap });
    assert.equal(live.length, cap); assert.ok(live.includes(f.e));
  }
  f.e.dead = true;
  assert.ok(!activeDungeonEnemies([...crowded, f.e], player, { activeEnemyCap: 3 }).includes(f.e));
});


test('zero simulation time and a paused Game do not advance the route or position', () => {
  const f = fixture(); f.w.los = () => false;
  advance(f, .1);
  const before = JSON.stringify({ x: f.e.x, y: f.e.y, route: f.e.pack.roam });
  f.w.dt = 0;
  for (let i = 0; i < 10; i++) updatePackMonster(f.e, f.w);
  assert.equal(JSON.stringify({ x: f.e.x, y: f.e.y, route: f.e.pack.roam }), before);
  f.game.paused = true;
  const work = f.game.performanceStats.pathfindingWork;
  f.game.update(1, IDLE, 50000);
  assert.equal(JSON.stringify({ x: f.e.x, y: f.e.y, route: f.e.pack.roam }), before);
  assert.equal(f.game.performanceStats.pathfindingWork, work);
});


test('reset discards transient route state but retains location, health, identity, and cooldowns', () => {
  const f = fixture(); f.w.los = () => false; advance(f, 3);
  assert.ok(f.e.pack.roam);
  f.e.pack.cd.future = 4;
  const before = { x: f.e.x, y: f.e.y, hp: f.e.hp, maxHp: f.e.maxHp, id: f.e.id };
  resetPackRuntime(f.e);
  assert.equal(f.e.pack.roam, undefined);
  assert.deepEqual({ x: f.e.x, y: f.e.y, hp: f.e.hp, maxHp: f.e.maxHp, id: f.e.id }, before);
  assert.equal(f.e.pack.cd.future, 4);
  advance(f, .1);
  assert.ok(f.e.pack.roam?.route.length > 0, 'route is replanned, not restored');
});


test('domain routes are deterministic, do not mutate the map, and can target across disconnected rooms', () => {
  const f = fixture(), snapshot = JSON.stringify(f.map), start = { x: f.e.x, y: f.e.y };
  const destinations = [];
  for (let seq = 0; seq < 20; seq++) {
    const route = dungeonPatrolRoute(f.e, f.w, seq, []);
    assert.deepEqual(route, dungeonPatrolRoute(f.e, f.w, seq, []));
    assert.ok(route.length > 0);
    for (const p of route) inside(f.map, p);
    destinations.push(route.at(-1));
  }
  assert.ok(destinations.some((p) => p.x >= 17 && p.y >= 18), 'the distant room is part of the same patrol domain');
  assert.ok(new Set(destinations.map((p) => `${p.x},${p.y}`)).size > 3);
  assert.deepEqual({ x: f.e.x, y: f.e.y }, start);
  assert.equal(JSON.stringify(f.map), snapshot);
});

test('an unseen idle Crystal meaningfully explores its domain instead of floating in place', () => {
  const f = fixture(); f.w.los = () => false;
  const occupied = new Set(), start = { x: f.e.x, y: f.e.y };
  let far = 0;
  advance(f, 90, () => {
    inside(f.map, f.e); occupied.add(`${Math.round(f.e.x)},${Math.round(f.e.y)}`);
    far = Math.max(far, Math.hypot(f.e.x - start.x, f.e.y - start.y));
    assert.equal(f.e.aggro, false); assert.equal(f.e.pack.attack, null);
  });
  assert.ok(occupied.size > 20); assert.ok(far > 12);
  assert.equal(f.hurts.length, 0);
  assert.ok(f.work.length < 30, 'planning remains bounded and is not repeated each frame');
});

test('idle patrol phases straight through solid walls between rooms', () => {
  const f = fixture(); knownRoute(f, { x: 21, y: 21 });
  let wall = false, arrived = false;
  advance(f, 25, () => {
    inside(f.map, f.e);
    wall ||= !!f.map.tiles[Math.floor(f.e.y + .72) * f.map.width + Math.floor(f.e.x + .5)]?.blocked;
    arrived ||= Math.hypot(f.e.x - 21, f.e.y - 21) < .1;
  });
  assert.ok(wall, 'the direct path crosses solid dungeon walls');
  assert.ok(arrived, 'walls do not trap or reroute the patrol');
});

test('closed doors and obstacles added during travel do not confine the Crystal', () => {
  const m = hall(); tile(m, 14, 5, 'door', true);
  m.objects.push({ id: 'locked-door', kind: 'door', x: 14, y: 5, state: 'locked' });
  const f = fixture(m, { x: 4, y: 5 }); knownRoute(f, { x: 26, y: 5 });
  advance(f, 3);
  for (let x = 10; x <= 20; x++) tile(m, x, 5, x === 14 ? 'door' : 'wall', true);
  advance(f, 17, () => inside(m, f.e));
  assert.ok(f.e.x > 24, 'neither closed doors nor new blockers cancel travel');
  assert.equal(m.objects[0].state, 'locked', 'phasing does not unlock the player door');
});

test('water, chasms, lava and abrupt terrain changes are traversable for dungeon flight', () => {
  for (const kind of ['dungeonWater', 'lava', 'abyss', 'canyon']) {
    for (const blocked of [true, false]) {
      const m = hall();
      for (let x = 10; x <= 15; x++) { tile(m, x, 5, kind, blocked); m.tiles[5 * m.width + x].elev = 6; }
      const f = fixture(m, { x: 4, y: 5 }); knownRoute(f, { x: 26, y: 5 });
      const hp = f.e.hp;
      advance(f, 20, () => inside(m, f.e));
      assert.ok(f.e.x > 24, `${kind}, blocked=${blocked}`);
      assert.equal(f.e.hp, hp); assert.ok(!f.e.dead); assert.equal(f.hurts.length, 0);
    }
  }
});

test('fractional positions inside water or a wall resume patrol without snapping to a floor anchor', () => {
  for (const kind of ['wall', 'dungeonWater']) {
    const m = mapOf(); tile(m, 4, 5, kind, true);
    const f = fixture(m, { x: 4.37, y: 5.11 }); knownRoute(f, { x: 21, y: 21 });
    const before = { x: f.e.x, y: f.e.y };
    advance(f, .05);
    const moved = Math.hypot(f.e.x - before.x, f.e.y - before.y);
    assert.ok(moved > 0 && moved < .2, 'no floor teleport when beginning movement');
    advance(f, 10, () => inside(m, f.e));
    assert.ok(Math.hypot(f.e.x - before.x, f.e.y - before.y) > 8);
  }
});

test('free movement remains bounded by the dungeon on every side, including large steps', () => {
  const f = fixture(mapOf(18, 11), { x: 4, y: 5 });
  for (const [dx, dy] of [[1e4, 0], [0, 1e4], [-1e4, 0], [0, -1e4], [1e4, 1e4], [-1e4, -1e4]]) {
    f.w.roamMove(f.e, dx, dy); inside(f.map, f.e);
    f.w.move(f.e, dx, dy); inside(f.map, f.e);
  }
});

test('phasing is confined to the dungeon world-beast Crystal and does not change ordinary collision', () => {
  const m = hall(); tile(m, 5, 5, 'wall', true);
  const f = fixture(m, { x: 4, y: 5 });
  const ordinary = createCombatant('ashling', 4, 5, false, []);
  f.w.move(ordinary, 1, 0); assert.ok(ordinary.x < 4.5, 'ordinary creatures cannot cross the wall');
  f.w.move(f.e, 1, 0); assert.equal(f.e.x, 5, 'Crystal combat movement also phases');
  f.game.area = 'overworld'; const outside = f.game.packWorld(.05, 0);
  f.e.x = 4; outside.move(f.e, 1, 0); assert.ok(f.e.x < 4.5, 'dungeon permission does not become global wall phasing');
});

test('recent destinations discourage repeating the same distant patrol endpoint', () => {
  const f = fixture(rect(mapOf(50), 1, 1, 48, 48));
  const first = dungeonPatrolRoute(f.e, f.w, 0, []), goal = first.at(-1);
  const next = dungeonPatrolRoute(f.e, f.w, 1, [goal]).at(-1);
  assert.ok(goal && next);
  assert.ok(Math.hypot(next.x - goal.x, next.y - goal.y) >= CRYSTAL.roamDistance);
});

test('full Game.update moves the distant idle hunter, while pause freezes all patrol state', () => {
  const save = freshSave(); save.seed = 'LOCAL-ROAM-UPDATE'; save.level = 12;
  const game = new Game(save, 0), map = rooms();
  const id = `dungeon:${save.seed}:g1:8:3:roam-fixture`;
  save.session.activeDungeonId = id; save.worldBeasts.psychicCrystal.active = { dungeon: id, tries: 0 };
  const e = createCombatant('psychicCrystal', 4, 5, true, []);
  Object.assign(e, { id: 'roaming-crystal', worldBeast: 'psychicCrystal', aggro: false, evasive: false,
    hp: 1234, maxHp: 3000, packAttacks: [], packBossAttacks: [] });
  Object.assign(game, { area: 'dungeon', map, enemies: [e], projectiles: [], effects: [], packEffects: [] });
  Object.assign(game.player, { x: 24, y: 24, hp: 1e6 });
  const before = { x: e.x, y: e.y };
  for (let i = 0; i < 100; i++) { game.update(.05, IDLE, 1000 + i * 50); inside(map, e); }
  assert.ok(Math.hypot(e.x - before.x, e.y - before.y) > 2); assert.equal(e.aggro, false);
  const frozen = JSON.stringify({ x: e.x, y: e.y, pack: e.pack });
  game.paused = true;
  for (let i = 0; i < 100; i++) game.update(.05, IDLE, 6000 + i * 50);
  assert.equal(JSON.stringify({ x: e.x, y: e.y, pack: e.pack }), frozen);
});

test('site 59 can spawn in its historical disconnected room without an entrance-component restriction', () => {
  const { save, game, id, e } = realDungeon(59);
  assert.ok(e, 'the deterministic haunt still qualifies');
  const connected = entryComponent(game.map), old = 8 * game.map.width + 12;
  assert.equal(game.map.tiles[old].blocked, false); assert.equal(connected.has(old), false);
  assert.deepEqual([e.x, e.y], [12, 8], 'do not exclude a legitimate room just because walking cannot reach it');
  assert.equal(save.worldBeasts.psychicCrystal.active.dungeon, id);
});

test('site 73 reload keeps exact water and partial-overlap positions with health and hunt progress intact', () => {
  for (const bad of [{ x: 6.4528073291, y: 21.2812283716 }, { x: 6.676476509256248, y: 21.121464392663743 }]) {
    const { save, game, id, e } = realDungeon(73); assert.ok(e);
    Object.assign(e, { ...bad, hp: 321, damage: 37, aggro: false, evasive: false });
    e.pack.roam = { route: [{ x: 26, y: 22 }], recent: [], seq: 9, wait: 0 }; e.pack.cd.future = 4;
    Object.assign(save.worldBeasts.psychicCrystal.active, { tries: 2, patience: 88 });
    const expectedHunt = JSON.parse(JSON.stringify(save.worldBeasts.psychicCrystal.active)), maxHp = e.maxHp;
    game.snapshotArea();
    const migrated = migrateSave(JSON.parse(JSON.stringify(save))), resumed = new Game(migrated, 0);
    resumed.save.session.activeDungeonId = id; resumed.loadArea('dungeon', false);
    const restored = resumed.enemies.find((q) => q.id === e.id); assert.ok(restored);
    assert.deepEqual({ x: restored.x, y: restored.y }, bad, 'free flight never needs a floor-repair teleport');
    assert.deepEqual([restored.hp, restored.maxHp, restored.damage], [321, maxHp, 37]);
    assert.deepEqual(JSON.parse(JSON.stringify(migrated.worldBeasts.psychicCrystal.active)), expectedHunt);
    assert.equal(restored.pack.cd.future, 4); assert.equal(restored.pack.roam, undefined);
    restored.packAttacks = []; restored.packBossAttacks = [];
    const w = resumed.packWorld(.05, 0); w.los = () => false;
    for (let i = 0; i < 100; i++) { updatePackMonster(restored, w); inside(resumed.map, restored); }
    assert.ok(restored.pack.roam); assert.ok(Math.hypot(restored.x - bad.x, restored.y - bad.y) > 2);
  }
});

test('site 295 new and existing hunts use the whole dungeon, and its existing retreat still completes', () => {
  const { save, game, id } = realDungeon(295);
  const connected = entryComponent(game.map), width = game.map.width, entry = game.map.entry;
  assert.ok([...connected].every((k) => Math.hypot(k % width - entry.x, Math.floor(k / width) - entry.y) < 7));
  const cycle = Array.from({ length: 100 }, (_, i) => i).find((i) =>
    (hashSeed(`${save.seed}:world-beast-dungeon:psychicCrystal:v1:${i}:${id}`) % 1000) / 1000 < WORLD_BEASTS.psychicCrystal.dungeonChance);
  assert.notEqual(cycle, undefined); save.worldBeasts.psychicCrystal.cycle = cycle;
  game.loadArea('dungeon', false);
  let e = game.enemies.find((q) => q.worldBeast === 'psychicCrystal'); assert.ok(e, 'disconnected rooms are valid new-haunt ground');
  assert.ok(!connected.has(Math.floor(e.y + .72) * width + Math.floor(e.x + .5)));
  Object.assign(save.worldBeasts.psychicCrystal.active, { tries: 1, patience: 33 });
  e.hp = 321; game.snapshotArea(); game.loadArea('dungeon', false);
  e = game.enemies.find((q) => q.worldBeast === 'psychicCrystal'); assert.ok(e); assert.equal(e.hp, 321);
  assert.equal(save.worldBeasts.psychicCrystal.active.tries, 1);
  beginDungeonRetreat(save, 'psychicCrystal', game.map); game.loadArea('dungeon', false);
  e = game.enemies.find((q) => q.worldBeast === 'psychicCrystal'); assert.ok(e?.retreating);
  completeRetreat(game, e);
});

test('a sealed puddle still qualifies and retreat still crosses walls, reaches water, and ends the hunt', () => {
  const map = rect(mapOf(30, 18), 2, 2, 12, 12); tile(map, 21, 8, 'dungeonWater', true);
  let save, spawn, id;
  for (let i = 0; i < 100 && !spawn; i++) {
    save = freshSave(); save.seed = 'SEALED-POOL'; save.level = 8; save.perception.aperture = 1e6; // release 273: Aperture-tier gate
    id = `dungeon:SEALED-POOL:g1:5:5:site-${i}`; spawn = worldBeastForDungeon(save, map, id);
  }
  assert.ok(spawn);
  const f = fixture(map, { x: spawn.x, y: spawn.y }); f.game.save = save; f.e.id = spawn.id;
  knownRoute(f, { x: 3, y: 3 }); advance(f, 1); assert.ok(f.e.pack.roam);
  beginDungeonRetreat(save, 'psychicCrystal', map); f.e.retreating = true;
  assert.equal(WORLD_BEASTS.psychicCrystal.retreatMoves, 'through');
  completeRetreat(f.game, f.e);
  assert.equal(f.hurts.length, 0);
});
test('initial sight controls engagement, and a hidden engaged Crystal does not begin a fresh attack', () => {
  const m = rect(mapOf(16), 2, 2, 13, 13);
  for (let y = 1; y < 15; y++) tile(m, 7, y, 'wall', true);
  const f = fixture(m, { x: 5, y: 6, player: { x: 9, y: 6 } });
  f.e.packAttacks = ['psyOrbital']; f.e.pack.gap = 0;
  assert.equal(f.w.los(f.e, f.w.player), false);
  advance(f, .1);
  assert.equal(f.e.aggro, false); assert.equal(f.e.pack.attack, null);
  f.e.aggro = true; advance(f, .1);
  assert.equal(f.e.pack.attack, null); assert.equal(f.game.packEffects.length, 0);
  // Phasing can bring it into sight, at which point engagement is normal.
  f.e.x = 8; f.e.y = 6; f.e.aggro = false; f.e.pack.gap = 0;
  assert.equal(f.w.los(f.e, f.w.player), true); advance(f, .1);
  assert.equal(f.e.aggro, true); assert.equal(f.e.pack.attack, 'psyOrbital');
});

test('a saved position inside a dungeon wall is not teleported on load, and patrol state is replanned', () => {
  const { save, game, id, e } = realDungeon(59); assert.ok(e);
  const wall = game.map.tiles.find((t) => t.blocked && !LETHAL_KINDS.has(t.kind) && t.x > 2 && t.y > 2 && t.x < game.map.width - 2);
  assert.ok(wall);
  Object.assign(e, { x: wall.x + .1, y: wall.y + .1, hp: 456, aggro: false, evasive: false });
  e.pack.roam = { route: [{ x: 12, y: 8 }], recent: [], seq: 9, wait: 0 };
  const before = { x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp };
  game.snapshotArea();
  const resumed = new Game(migrateSave(JSON.parse(JSON.stringify(save))), 0);
  resumed.save.session.activeDungeonId = id; resumed.loadArea('dungeon', false);
  const restored = resumed.enemies.find((q) => q.id === e.id); assert.ok(restored);
  assert.deepEqual({ x: restored.x, y: restored.y, hp: restored.hp, maxHp: restored.maxHp }, before);
  assert.equal(restored.pack.roam, undefined);
  restored.packAttacks = []; restored.packBossAttacks = [];
  const w = resumed.packWorld(.05, 0); w.los = () => false;
  for (let i = 0; i < 5; i++) { updatePackMonster(restored, w); inside(resumed.map, restored); }
  assert.ok(restored.pack.roam);
});
test('new routes sample at most 625 cells over the whole domain rather than flooding every reachable node', () => {
  const f = fixture(mapOf(140, 100), { x: 4, y: 5 });
  rect(f.map, 110, 70, 135, 95);
  let calls = 0; const original = f.w.roamMove.bind(f.w);
  f.w.roamMove = (...args) => { calls++; return original(...args); };
  const route = dungeonPatrolRoute(f.e, f.w, 0, []);
  assert.equal(route.length, 1, 'free flight takes a direct destination, not a floor-search path');
  assert.ok(route[0].x >= 110 && route[0].y >= 70, 'distant open floor is considered even beyond any local flood');
  assert.ok(f.work.length > 0 && f.work.every((n) => n > 0 && n <= 625));
  assert.ok(calls <= 625, 'planning work does not hide an unbounded sweep in movement probes');
  const snapshot = JSON.stringify(f.map);
  advance(f, .1);
  assert.equal(JSON.stringify(f.map), snapshot, 'domain planning never regenerates or changes dungeon tiles');
});

test('a fully enclosed wall domain still offers a bounded fallback destination without a retry loop', () => {
  const f = fixture(mapOf(20, 15), { x: 3, y: 4 }); f.w.los = () => false;
  const route = dungeonPatrolRoute(f.e, f.w, 0, []);
  assert.equal(route.length, 1); inside(f.map, route[0]);
  advance(f, 10, () => inside(f.map, f.e));
  assert.ok(Math.hypot(f.e.x - 3, f.e.y - 4) > 2);
  assert.ok(f.work.length < 10, 'absence of floor is not a per-frame planning failure');
});
test('terrain-aware flight visibly rises before a cliff and settles after it without discontinuous height jumps', () => {
  const map = rect(mapOf(30, 12), 0, 0, 29, 11); map.landscape = true;
  for (const t of map.tiles) t.elev = t.x >= 10 && t.x <= 17 ? 6 : 0;
  const peak = liftAt(map, map.width, 13, 5);
  assert.ok(peak > 0);
  assert.equal(crystalFlightLift(map, map.width, 3, 5), 0);
  assert.ok(crystalFlightLift(map, map.width, 9, 5) > liftAt(map, map.width, 9, 5), 'the model rises before reaching high terrain');
  assert.ok(crystalFlightLift(map, map.width, 18, 5) > liftAt(map, map.width, 18, 5), 'descent continues after leaving the ledge');
  let previous = crystalFlightLift(map, map.width, 5, 5);
  for (let x = 5.01; x <= 23; x += .01) {
    const lift = crystalFlightLift(map, map.width, x, 5);
    assert.ok(Number.isFinite(lift));
    assert.ok(lift + 1e-9 >= liftAt(map, map.width, x, 5), 'the model never intersects the current raised terrain');
    assert.ok(Math.abs(lift - previous) < peak * .05, `flight height stepped abruptly at x=${x}`);
    previous = lift;
  }
  assert.ok(Math.abs(crystalFlightLift(map, map.width, 13, 5) - peak) < 1e-9);
  assert.equal(crystalFlightLift(map, map.width, 25, 5), 0);
  assert.equal(crystalFlightLift({ ...map, landscape: false }, map.width, 13, 5), 0);
});

function crystalDrawing(e, now = 1000) {
  const ellipses = [], stack = []; let tx = 0, ty = 0;
  const ctx = new Proxy({
    globalAlpha: 1,
    save() { stack.push([tx, ty]); }, restore() { [tx, ty] = stack.pop(); },
    translate(x, y) { tx += x; ty += y; },
    ellipse(x, y, ...args) { ellipses.push([x + tx, y + ty, ...args]); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
  }, { get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; } });
  assert.equal(drawPackMonster(ctx, e, 32, now), true);
  return ellipses;
}

test('flight elevation raises the Crystal body and aura while its shadow remains on the ground; reduced motion removes idle bob', () => {
  const e = createCombatant('psychicCrystal', 10, 10, false, []);
  e.id = 'height-check'; e.reduceMotion = true;
  const flat = crystalDrawing({ ...e, flightLiftDelta: 0 });
  const raised = crystalDrawing({ ...e, flightLiftDelta: 1.25 });
  assert.ok(flat.length > 1); assert.equal(raised.length, flat.length);
  assert.deepEqual(raised[0], flat[0], 'the ground shadow does not float with the body');
  for (let i = 1; i < flat.length; i++) {
    assert.ok(Math.abs(flat[i][1] - raised[i][1] - 1.25 * 32) < 1e-8, 'body/aura use the terrain delta exactly once');
  }
  const later = crystalDrawing({ ...e, flightLiftDelta: 1.25 }, 1600);
  assert.deepEqual(later.map((p) => p[1]), raised.map((p) => p[1]), 'reduced motion retains elevation without oscillating vertically');
});
test('an engaged Crystal phases toward an unseen player instead of remaining trapped in its room', () => {
  const map = rect(mapOf(30, 15), 1, 1, 28, 13);
  for (let y = 0; y < map.height; y++) for (let x = 10; x <= 12; x++) tile(map, x, y, 'wall', true);
  const f = fixture(map, { x: 4, y: 6, player: { x: 20, y: 6 } }); f.e.aggro = true;
  assert.equal(f.w.los(f.e, f.w.player), false);
  let crossedWall = false, sawPlayer = false;
  advance(f, 20, () => {
    inside(map, f.e);
    crossedWall ||= f.e.x >= 10 && f.e.x < 12;
    sawPlayer ||= f.w.los(f.e, f.w.player);
  });
  assert.ok(crossedWall && sawPlayer, 'pursuit passes through the barrier into the player room');
  assert.equal(f.hurts.length, 0, 'the attackless pursuit fixture cannot damage through walls');
});

test('Crystal tether follows the raised body while its target marker stays on target terrain', () => {
  const e = createCombatant('psychicCrystal', 10, 10, false, []);
  e.pack.tele = { type: 'tether', x: 14, y: 11, holding: false };
  const capture = (heights) => {
    const moves = [], curves = [], ellipses = [];
    const ctx = new Proxy({
      moveTo(...args) { moves.push(args); }, quadraticCurveTo(...args) { curves.push(args); },
      ellipse(...args) { ellipses.push(args); },
      createRadialGradient() { return { addColorStop() {} }; },
    }, { get(target, key) { return key in target ? target[key] : () => {}; },
      set(target, key, value) { target[key] = value; return true; } });
    drawPackTelegraphs(ctx, [e], 32, 1000, () => true, heights);
    return { moves, curves, ellipses };
  };
  const flat = capture({}), raised = capture({ body: () => 2, ground: () => .5 });
  assert.equal(flat.moves.length, 1); assert.equal(flat.curves.length, 1); assert.equal(flat.ellipses.length, 1);
  assert.equal(flat.moves[0][1] - raised.moves[0][1], 2 * 32, 'source uses flight height');
  assert.equal(flat.curves[0][3] - raised.curves[0][3], .5 * 32, 'tether endpoint uses target ground height');
  assert.equal(flat.ellipses[0][1] - raised.ellipses[0][1], .5 * 32, 'target marker is not lifted to the Crystal');
});
