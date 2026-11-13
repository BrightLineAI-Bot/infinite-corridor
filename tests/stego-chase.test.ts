// The Wild Stegosaurus's chase (Tim, 2026-11-12: "it climbs inside buildings too... If the Wayfarer goes up to another level, it
// climbs up after them and keeps chasing... it follows the Wayfarer everywhere it can get to, including across levels and heights").
// monster-pack.ts stegoChase / STEGO.chase / STEGO.route; game.ts stegoRouteSearch, stegoRouteStep and the packWorld hooks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, footprintOpen, stegoRouteSearch, stegoRouteStep, NAV, navTick, navStats } from '../src/game.ts';
import { updatePackMonster, STEGO } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { elevationAt } from '../src/landscape.ts';
import { freshSave } from '../src/types.ts';

// A great building's floor with a stegosaurus room and the interior terrain's jump platform (heights 1, 2, then a 2x2 top at 3).
const FLOOR = 'building:ROOMS:48:2:apartment:4:f1';
function floorGame(id = FLOOR) {
  const s = freshSave(); s.seed = 'ROOMS'; const g = new Game(s, 0);
  s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false);
  const e = g.enemies.find((q) => q.kind === 'wildStego'); for (const q of g.enemies) if (q !== e) q.dead = true;
  Object.assign(g.player, { hp: 1e9, maxHp: 1e9 }); Object.assign(e, { aggro: true, packAttacks: [] });
  return { g, e, map: g.map, W: g.map.width };
}
// A plain interior floor (interior terrain v1) for routing: `f(x, y)` overrides a tile. The edge is wall.
function floorMap(W, H, f = () => null) {
  const tiles = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const edge = !x || !y || x === W - 1 || y === H - 1; tiles.push({ x, y, kind: edge ? 'arcWall' : 'arcFloor', blocked: edge, elev: 0, slope: false, ...(f(x, y) || {}) }); }
  return { id: 'stego-chase-test', width: W, height: H, tiles, objects: [], enemySpawns: [], building: { style: 'keep', floor: 1, floors: 2, base: 'stego-chase-test' }, landscape: { version: 0, biome: null, name: null, interior: true }, interiorTerrain: { version: 1, maxLevel: 5 } };
}
const wall = { kind: 'arcWall', blocked: true };
// The real game's hooks over a given floor: a building floor loaded, then its map swapped for `map`, one stego placed.
function onFloor(map, at, player) {
  const { g, e } = floorGame(); g.map = map; Object.assign(e, { x: at.x, y: at.y }); Object.assign(g.player, player);
  return { g, e };
}
function run(g, e, seconds, each = () => {}) {
  let now = 5000; for (let i = 0; i < seconds * 30; i++) { now += 1000 / 30; updatePackMonster(e, g.packWorld(1 / 30, now)); each(i); }
}
const level = (map, q) => elevationAt(map, map.width, q.x, q.y);

test('in a building, the Wayfarer on the jump platform\'s top: it climbs up after them, reaches them, and climbs down again after them', () => {
  const { g, e, map, W } = floorGame(), top = map.tiles.filter((t) => t.platformTop), first = map.tiles.find((t) => t.interiorPlatform && t.elev === 1);
  assert.equal(top.length, 4); assert.equal(top[0].elev, 3, 'three levels up: past what anything but the Wayfarer can walk or jump');
  Object.assign(g.player, { x: top[0].x, y: top[0].y }); Object.assign(e, { x: first.x - 5, y: first.y });
  assert.ok(footprintOpen(map, W, e.x, e.y) && level(map, e) === 0);
  let climbed = 0, poses = new Set(), reached = -1, dirs = 0;
  const hold = { x: top[0].x, y: top[0].y };
  run(g, e, 15, (i) => { Object.assign(g.player, hold); /* standing their ground up there (a buck would kick them off) */ climbed = Math.max(climbed, e.stegoClimb || 0); poses.add(e.stegoPose); if (e.stegoClimbDir) { dirs++; assert.ok(Number.isFinite(e.stegoClimbDir.x) && Number.isFinite(e.stegoClimbDir.y)); }
    if (!e.pack.stegoClimbing) assert.ok(footprintOpen(map, W, e.x, e.y), `on open floor between climbs (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`);
    if (reached < 0 && level(map, e) === 3 && Math.hypot(e.x - g.player.x, e.y - g.player.y) <= STEGO.chase.near + 1.5) reached = i / 30; });
  assert.ok(poses.has('climb') && climbed > .9 && dirs > 0, 'the climb pose, as the art draws it');
  assert.ok(reached >= 0 && reached < 12, `it reached the Wayfarer up there (${reached} s)`);
  assert.equal(level(map, e), 3); assert.equal(e.stegoClimb, 0, 'standing up there, not clinging');
  // the Wayfarer drops back to the floor and runs: it follows them down
  const away = map.tiles.find((t) => !t.blocked && !t.hole && !t.slope && (t.elev || 0) === 0 && Math.abs(t.x - first.x) + Math.abs(t.y - first.y) >= 6 && Math.abs(t.x - first.x) + Math.abs(t.y - first.y) <= 9 && footprintOpen(map, W, t.x, t.y));
  Object.assign(g.player, { x: away.x, y: away.y }); let down = -1;
  run(g, e, 15, (i) => { Object.assign(g.player, { x: away.x, y: away.y }); if (down < 0 && level(map, e) === 0 && Math.hypot(e.x - away.x, e.y - away.y) <= STEGO.chase.near + 1.5) down = i / 30; });
  assert.ok(down >= 0, `it came down after them (${e.x.toFixed(1)}, ${e.y.toFixed(1)} at level ${level(map, e)})`);
});

test('it routes round a wall to reach the Wayfarer instead of stalling, and never climbs a building\'s walls', () => {
  // a wall across the room with a gap past its end (within the search's reach); the Wayfarer straight across it
  const map = floorMap(30, 30, (x, y) => x === 15 && y >= 1 && y <= 16 ? wall : null), { g, e } = onFloor(map, { x: 10, y: 8 }, { x: 20, y: 8 });
  let reached = -1, climbed = 0; const W = map.width;
  run(g, e, 25, (i) => { climbed = Math.max(climbed, e.stegoClimb || 0); assert.ok(footprintOpen(map, W, e.x, e.y), 'never in the wall'); if (reached < 0 && e.x > 15 && Math.hypot(e.x - 20, e.y - 8) <= STEGO.chase.near + 1.5) reached = i / 30; });
  assert.ok(reached >= 0, `round the wall to the Wayfarer (ended at ${e.x.toFixed(1)}, ${e.y.toFixed(1)})`);
  assert.equal(climbed, 0, 'inside, walls run to the ceiling: it goes round them');
  // with no way round at all, it waits on its side of the wall: no climbing through
  const shut = floorMap(30, 30, (x) => x === 15 ? wall : null), held = onFloor(shut, { x: 10, y: 8 }, { x: 20, y: 8 }); let most = 0;
  run(held.g, held.e, 8, () => { most = Math.max(most, held.e.x, held.e.stegoClimb || 0); });
  assert.ok(most < 14.5, `it stays on its side (${most})`);
});

test('the search: on foot round a short way, a climb up a face where there is none, over rock only where the area allows it', () => {
  const inside = (map) => (x, y, over) => !over && footprintOpen(map, map.width, x, y);
  // a ledge three levels up (a retaining face all the way across): a climb
  const ledge = floorMap(24, 24, (x) => x >= 12 ? { elev: 3 } : null), up = stegoRouteSearch(8, 10, 16, 10, ledge, 24, inside(ledge));
  assert.deepEqual(up, { x: 9, y: 10, climb: false }, 'it walks to the face first'); assert.deepEqual(stegoRouteSearch(11, 10, 16, 10, ledge, 24, inside(ledge)), { x: 12, y: 10, climb: true });
  assert.equal(stegoRouteSearch(11, 10, 16, 10, ledge, 24, () => false)?.climb ?? false, false, 'where it may not climb, no climb is offered');
  // a ramp at one end: a short way round on foot beats the climb, a long one does not
  const ramp = (gap) => floorMap(24, 24, (x, y) => y === gap && x >= 9 && x <= 11 ? { elev: x - 8, slope: true, rampDir: 'east' } : x >= 12 ? { elev: 3 } : null);
  assert.deepEqual(stegoRouteSearch(8, 10, 16, 10, ramp(11), 24, inside(ramp(11))), { x: 8, y: 11, climb: false }, 'a ramp a step aside: it walks to it');
  assert.deepEqual(stegoRouteSearch(8, 10, 16, 10, ramp(21), 24, inside(ramp(21))), { x: 9, y: 10, climb: false }, 'a ramp far off: it heads for the face');
  assert.deepEqual(stegoRouteSearch(11, 10, 16, 10, ramp(21), 24, inside(ramp(21))), { x: 12, y: 10, climb: true }, 'and climbs it');
  // rock between: inside it never goes over; in the open world (over allowed) it does when the way round is long
  const rock = floorMap(24, 24, (x, y) => x === 12 && y >= 1 && y <= 20 ? wall : null);
  const overOk = (map) => (x, y, over) => over ? !!map.tiles[Math.floor(y + .75) * map.width + Math.floor(x + .5)]?.blocked : footprintOpen(map, map.width, x, y);
  const inRoute = stegoRouteSearch(11, 10, 14, 10, rock, 24, inside(rock)), outRoute = stegoRouteSearch(11, 10, 14, 10, rock, 24, overOk(rock));
  assert.equal(inRoute.climb, false, 'inside: round on foot'); assert.deepEqual(outRoute, { x: 13, y: 10, climb: true }, 'outside: over the rock to the ground beyond');
  assert.equal(stegoRouteSearch(11, 2, 14, 2, floorMap(24, 24, (x, y) => x === 12 && y >= 4 ? wall : null), 24, overOk(rock)).climb, false, 'a step round the rock\'s end: on foot');
  // nothing to reach: null, never a step into a wall
  const sealed = floorMap(24, 24, (x) => x === 12 ? wall : null); assert.equal(stegoRouteSearch(11, 10, 16, 10, sealed, 24, inside(sealed)), null);
});

test('it never climbs where the rules forbid: walls, holes, perches, the Wayfarer\'s builds, the map\'s edge; ordinary dungeons not at all', () => {
  const map = floorMap(24, 24, (x, y) => x === 12 && y === 5 ? { hole: true } : x === 12 && y === 7 ? { perch: true } : x === 12 && y === 9 ? { build: 'stone', buildLevel: 1 } : x === 6 ? wall : null);
  const { g } = onFloor(map, { x: 3, y: 3 }, { x: 18, y: 18 }), w = g.packWorld(1 / 30, 1000);
  assert.equal(typeof w.climbFree, 'function'); assert.equal(typeof w.stegoRoute, 'function');
  assert.equal(w.climbFree(10, 10), true, 'open floor');
  for (const [x, y, why] of [[6, 10, 'a wall'], [12, 5, 'a hole'], [12, 7, 'a perch'], [12, 9, 'a build'], [0, 10, 'the edge'], [23, 10, 'the edge']]) assert.equal(w.climbFree(x, y), false, why);
  // the Wayfarer on a perch above the floor: it does not climb onto it
  const perch = floorMap(20, 20, (x, y) => x === 12 && y === 10 ? { perch: true, elev: 2 } : null), p = onFloor(perch, { x: 6, y: 10 }, { x: 12, y: 10 }); let onIt = false;
  run(p.g, p.e, 8, () => { onIt ||= Math.round(p.e.x) === 12 && Math.round(p.e.y) === 10; }); assert.equal(onIt, false, 'a perch is the Wayfarer\'s');
  // an ordinary dungeon: no climbing (as before)
  const s = freshSave(); s.seed = 'ROOMS'; const d = new Game(s, 0); s.session.activeDungeonId = 'dungeon:ROOMS:g1:3:3:root'; s.session.dungeonReturn = { rx: d.rx, ry: d.ry, x: 16, y: 16 };
  try { d.loadArea('dungeon', false); } catch { return; }
  if (!d.map.building) assert.equal(d.packWorld(1 / 30, 1000).climbFree, null);
});

test('in the open world the climb keeps the Stalker\'s rule: never into a building, shelter or town', () => {
  const s = freshSave(); s.seed = 'STEGO-CHASE'; const g = new Game(s, 0), w = g.packWorld(1 / 30, 1000), W = g.map.width;
  let checked = 0; for (const t of g.map.tiles) { if (!t || t.x < 1 || t.y < 1 || t.x > W - 2) continue; if (g.stalkerBarred(t.x, t.y)) { assert.equal(w.climbFree(t.x, t.y), false); checked++; } }
  assert.ok(checked > 0, `barred ground checked (${checked})`);
});

test('bounded: way-round searches share the frame budget, and each expands at most NAV.nodes tiles', () => {
  const map = floorMap(40, 40, (x, y) => (x === 20 && y !== 35) || (y === 12 && x > 4 && x < 30) ? wall : null), climb = (x, y, over) => !over && footprintOpen(map, 40, x, y);
  navTick(); const crowd = Array.from({ length: 20 }, (_, i) => Object.assign(createCombatant('wildStego', 3 + (i % 10) * 1.5, 14 + Math.floor(i / 10) * 2, true, []), { id: `s${i}` }));
  for (const e of crowd) stegoRouteStep(e, { x: 30, y: 30 }, map, 40, climb);
  assert.ok(navStats().spent <= NAV.budget, `${navStats().spent} searches this frame`); assert.equal(navStats().asked, 20);
  for (const e of crowd) stegoRouteStep(e, { x: 30, y: 30 }, map, 40, climb);
  assert.ok(navStats().spent <= NAV.budget);
  navTick(); const t0 = performance.now(); for (let i = 0; i < 200; i++) stegoRouteSearch(3, 14, 30, 30, map, 40, climb); const ms = (performance.now() - t0) / 200;
  assert.ok(ms < 5, `one search ${ms.toFixed(3)} ms`);
});

test('determinism: the same climb and chase twice is the same', () => {
  const trace = () => { const { g, e, map } = floorGame(), top = map.tiles.find((t) => t.platformTop), first = map.tiles.find((t) => t.interiorPlatform && t.elev === 1);
    Object.assign(g.player, { x: top.x, y: top.y }); Object.assign(e, { x: first.x - 5, y: first.y }); const out = [];
    run(g, e, 12, (i) => { if (i === 180) Object.assign(g.player, { x: first.x - 4, y: first.y }); out.push(`${e.x.toFixed(4)},${e.y.toFixed(4)},${e.stegoPose},${(e.stegoClimb || 0).toFixed(3)}`); });
    return out.join('|'); };
  assert.equal(trace(), trace());
});
