// Authorized new regressions for ground-only Walker routing and separate Crystal phasing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WALKER_ROUTE, walkerGroundSegmentOpen, walkerDungeonRoute, moveAxis,
  activeDungeonEnemies, Game, beginWalkerRetreatSearch, advanceWalkerRetreatSearch,
} from '../src/game.ts';
import { MONSTER_PACK, isDungeonRoamer } from '../src/monster-pack.ts';
import { WORLD_BEASTS, walkerRetreatDoors } from '../src/world-beasts.ts';

function mapOf(width = 28, height = 20) {
  return { width, height, landscape: true, entry: { x: 3, y: 4 }, objects: [],
    tiles: Array.from({ length: width * height }, (_, i) => ({
      x: i % width, y: Math.floor(i / width), kind: 'wall', blocked: true, elev: 0,
    })) };
}
function rect(map, x0, y0, x1, y1, fields = {}) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
    Object.assign(map.tiles[y * map.width + x], { kind: 'floor', blocked: false, ...fields });
  return map;
}
function rooms() {
  const map = mapOf();
  rect(map, 2, 3, 6, 7); rect(map, 6, 5, 20, 5); rect(map, 20, 5, 20, 15); rect(map, 18, 13, 25, 17);
  return map;
}
function actor(x = 3, y = 4) { return { id: 'walker-route-fixture', x, y }; }
function assertWalkable(e, map, route) {
  let from = { x: e.x, y: e.y };
  for (const to of route) {
    assert.ok(Math.abs(to.x - from.x) <= 1 && Math.abs(to.y - from.y) <= 1, 'no skipped corners or remote relocation');
    assert.ok(walkerGroundSegmentOpen(e, map, map.width, from, to), `unsafe edge ${JSON.stringify({ from, to })}`);
    assert.ok(walkerGroundSegmentOpen(e, map, map.width, to, from), 'return edge is traversable');
    from = to;
  }
}

test('Walker integration uses its own definition without inheriting Crystal phasing', () => {
  assert.ok(MONSTER_PACK.voidWalker);
  assert.ok(WORLD_BEASTS.voidWalker);
  assert.equal(isDungeonRoamer({ worldBeast: 'voidWalker' }, 'dungeon'), false);
  assert.equal(isDungeonRoamer({ worldBeast: 'psychicCrystal' }, 'dungeon'), true);
});

test('ground patrol traverses a bent corridor, deterministically and without clipping its corners', () => {
  const map = rooms(), e = actor(), options = { target: { x: 23, y: 15 } };
  const first = walkerDungeonRoute(e, map, map.width, options);
  assert.deepEqual(first, walkerDungeonRoute(e, map, map.width, options));
  assert.deepEqual(first.route.at(-1), options.target);
  assert.ok(first.route.length > 28);
  assertWalkable(e, map, first.route);
  assert.deepEqual(e, actor(), 'route planning never moves the actor');
});

test('idle patrol chooses a distant reachable destination and remembers recently visited rooms', () => {
  const map = rect(mapOf(40, 40), 1, 1, 38, 38), e = actor(18, 18);
  const first = walkerDungeonRoute(e, map, 40, { seq: 3 }), last = first.route.at(-1);
  assert.ok(Math.hypot(last.x - e.x, last.y - e.y) >= WALKER_ROUTE.distance);
  const second = walkerDungeonRoute(e, map, 40, { seq: 3, recent: [last] });
  assert.ok(Math.hypot(second.route.at(-1).x - last.x, second.route.at(-1).y - last.y) >= WALKER_ROUTE.distance);
  assertWalkable(e, map, second.route);
});

test('a disconnected room and a sealed entrance never produce a straight-line fallback', () => {
  const map = rooms(), e = actor(23, 15);
  Object.assign(map.tiles[10 * map.width + 20], { kind: 'wall', blocked: true });
  assert.deepEqual(walkerDungeonRoute(e, map, map.width, { target: map.entry }).route, []);
  const patrol = walkerDungeonRoute(e, map, map.width);
  assert.ok(patrol.route.length > 0);
  assert.ok(patrol.route.every(p => p.y > 10));
  assertWalkable(e, map, patrol.route);
});

test('fully blocked, single-cell and invalid actor locations end with an empty bounded plan', () => {
  const map = mapOf();
  assert.deepEqual(walkerDungeonRoute(actor(), map, map.width), { route: [], visited: 0, status: 'invalid' });
  rect(map, 3, 4, 3, 4);
  assert.deepEqual(walkerDungeonRoute(actor(), map, map.width), { route: [], visited: 1, status: 'no-path' });
  for (const e of [actor(NaN, 4), actor(-1, 4), actor(28, 4), actor(3, Infinity)])
    assert.deepEqual(walkerDungeonRoute(e, map, map.width), { route: [], visited: 0, status: 'invalid' });
});

test('segment validation immediately rejects extreme coordinates, long spans and invalid maps', () => {
  const map = rect(mapOf(8, 8), 0, 0, 7, 7), e = actor();
  assert.equal(walkerGroundSegmentOpen(e, map, 8, { x: -1e308, y: 4 }, { x: 1e308, y: 4 }), false);
  assert.equal(walkerGroundSegmentOpen(e, map, 8, { x: 2, y: 4 }, { x: 5, y: 4 }), false);
  assert.equal(walkerGroundSegmentOpen(e, null, 8, e, e), false);
  assert.equal(walkerGroundSegmentOpen(e, map, 0, e, e), false);
});

test('water, lava and chasms remain barriers even when a tile is mistakenly unblocked', () => {
  for (const kind of ['dungeonWater', 'river', 'lava', 'abyss', 'canyon', 'ocean', 'deepOcean']) {
    const map = rect(mapOf(14, 8), 1, 4, 12, 4), e = actor(2, 4);
    Object.assign(map.tiles[4 * map.width + 6], { kind, blocked: false });
    assert.deepEqual(walkerDungeonRoute(e, map, map.width, { target: { x: 10, y: 4 } }).route, [], kind);
  }
});

test('non-player elevation uses ramps, never a jump or a one-way drop', () => {
  const map = rect(mapOf(14, 8), 1, 4, 12, 4), e = actor(2, 4), target = { x: 10, y: 4 };
  rect(map, 6, 4, 12, 4, { elev: 1 });
  assert.deepEqual(walkerDungeonRoute(e, map, map.width, { target }).route, []);
  assert.deepEqual(walkerDungeonRoute(actor(10, 4), map, map.width, { target: e }).route, []);
  map.tiles[4 * map.width + 6].slope = true;
  const result = walkerDungeonRoute(e, map, map.width, { target });
  assert.deepEqual(result.route.at(-1), target); assertWalkable(e, map, result.route);
});

test('alternate ramp routes are explored when a direct edge reaches an inaccessible ledge first', () => {
  const map = rect(mapOf(12, 12), 2, 2, 8, 8), e = actor(3, 3), target = { x: 4, y: 3 };
  rect(map, 4, 2, 8, 8, { elev: 1 }); map.tiles[7 * 12 + 4].slope = true;
  const result = walkerDungeonRoute(e, map, 12, { target });
  assert.deepEqual(result.route.at(-1), target);
  assert.ok(result.route.some(p => p.y === 7)); assertWalkable(e, map, result.route);
});

test('flying, phasing and player-jumping flags cannot expand this ground-only route graph', () => {
  const map = rect(mapOf(14, 8), 1, 4, 12, 4), e = { ...actor(2, 4), flying: true, phases: true, isPlayer: true, jumping: true };
  rect(map, 6, 4, 12, 4, { elev: 1 });
  assert.deepEqual(walkerDungeonRoute(e, map, map.width, { target: { x: 10, y: 4 } }).route, []);
});

test('route invalidation is detected when a gate closes; replanning does not cross it', () => {
  const map = rooms(), e = actor(), target = { x: 23, y: 15 };
  const result = walkerDungeonRoute(e, map, map.width, { target });
  const index = result.route.findIndex(p => p.x === 12 && p.y === 5);
  assert.ok(index > 0);
  Object.assign(map.tiles[5 * map.width + 12], { kind: 'gate', blocked: true });
  assert.equal(walkerGroundSegmentOpen(e, map, map.width, result.route[index - 1], result.route[index]), false);
  assert.deepEqual(walkerDungeonRoute(e, map, map.width, { target }).route, []);
});

test('fractional saved positions join the reachable route without teleporting or mutating the save', () => {
  const map = rooms(), e = actor(3.3, 4.15), before = { ...e };
  const result = walkerDungeonRoute(e, map, map.width, { target: { x: 23, y: 15 } });
  assert.ok(result.route.length); assertWalkable(e, map, result.route); assert.deepEqual(e, before);
  const nearGrid = actor(3.0005, 4.15), short = walkerDungeonRoute(nearGrid, map, map.width, { target: { x: 5, y: 4 } });
  assert.deepEqual(short.route[0], { x: 3, y: 4.15 }, 'retain even a small required cardinal join');
  assertWalkable(nearGrid, map, short.route);
});

test('a fractional start cannot cut diagonally across a non-ramp elevation corner', () => {
  const map = rect(mapOf(8, 8), 0, 0, 7, 7, { elev: 1 }), e = actor(4.44, 2.264), target = { x: 5, y: 2 };
  map.tiles[3 * 8 + 4].elev = 0; map.tiles[2 * 8 + 5].slope = true;
  assert.equal(walkerGroundSegmentOpen(e, map, 8, e, target), false, 'diagonal shortcut is not the route graph');
  assert.deepEqual(walkerDungeonRoute(e, map, 8, { target }).route, [], 'isolated lower cell has no cardinal exit');
  map.tiles[3 * 8 + 5].slope = true; // A real connecting ramp makes a cardinal exit possible.
  const { route } = walkerDungeonRoute(e, map, 8, { target });
  assert.deepEqual(route.at(-1), target); assertWalkable(e, map, route);
  for (const at of route) {
    for (let i = 0; i < 100 && Math.hypot(at.x - e.x, at.y - e.y) > 1e-8; i++) {
      const dx = at.x - e.x, dy = at.y - e.y, d = Math.hypot(dx, dy), step = Math.min(d, .05);
      assert.ok(moveAxis(e, dx / d * step, dy / d * step, map, 8), 'every validated segment can actually move');
    }
    assert.ok(Math.hypot(at.x - e.x, at.y - e.y) < 1e-8, 'reaches each waypoint instead of looping');
  }
});

test('entrance route can be followed by production ground movement independently of the camera', () => {
  const map = rooms(), e = actor(23, 15), result = walkerDungeonRoute(e, map, map.width, { target: map.entry });
  assert.deepEqual(result.route.at(-1), map.entry);
  for (const target of result.route) {
    for (let i = 0; i < 60 && Math.hypot(target.x - e.x, target.y - e.y) > 1e-8; i++) {
      const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy), step = Math.min(d, .05);
      assert.ok(moveAxis(e, dx / d * step, dy / d * step, map, map.width));
    }
    assert.ok(Math.hypot(target.x - e.x, target.y - e.y) < 1e-8);
  }
  assert.ok(Math.hypot(e.x - map.entry.x, e.y - map.entry.y) < 1e-8);
});

test('planning work and actor counts remain bounded without changing active-roamer policy', () => {
  const map = rect(mapOf(128, 128), 0, 0, 127, 127), e = actor(64, 64);
  const result = walkerDungeonRoute(e, map, 128);
  assert.equal(result.visited, WALKER_ROUTE.nodes); assert.ok(result.route.length < WALKER_ROUTE.nodes);
  const distantEntrance = walkerDungeonRoute(e, map, 128, { target: { x: 3, y: 4 } });
  assert.equal(distantEntrance.status, 'budget', 'not misreported as an unreachable entrance; needs continued search before integration');
  assert.deepEqual(distantEntrance.route, [], 'never return an unlabelled partial retreat');
  const foes = Array.from({ length: 40 }, (_, i) => ({ id: `e${i}`, x: 64, y: 64, aggro: true }));
  assert.equal(activeDungeonEnemies(foes, e, { activeEnemyCap: 12 }).length, 12);
});

test('Crystal keeps its existing bounded dungeon phasing while a ground segment rejects the same wall', () => {
  const map = rooms(), crystal = { ...actor(6, 7), worldBeast: 'psychicCrystal' };
  const game = Object.assign(Object.create(Game.prototype), { map, area: 'dungeon', player: actor(), enemies: [], projectiles: [], effects: [] });
  assert.equal(walkerGroundSegmentOpen(crystal, map, map.width, crystal, { x: 7, y: 7 }), false);
  assert.equal(game.packWorld(.05, 0).move(crystal, 2, 0), true);
  assert.equal(crystal.x, 8);
});


function retreatPlan(e,map,targets){let result,state=beginWalkerRetreatSearch(e,map,map.width,targets),rounds=0;do{result=advanceWalkerRetreatSearch(e,state);assert.ok(result.visited<=WALKER_ROUTE.nodes);}while(result.status==='pending'&&++rounds<200);return result;}

test('nearest retreat means shortest reachable terrain path, not straight-line proximity',()=>{
 const map=rect(mapOf(18,16),1,1,16,14),e=actor(5,8),near={x:7,y:8},short={x:3,y:12};
 for(let y=3;y<14;y++)Object.assign(map.tiles[y*18+6],{blocked:true,kind:'wall'});
 const plan=retreatPlan(e,map,[near,short]);assert.equal(plan.status,'reached');assert.deepEqual(plan.target,short);assert.deepEqual(plan.route.at(-1),short);
 assertWalkable(e,map,plan.route);
});

test('equal-distance multiple doors use a deterministic coordinate tie break independent of object order',()=>{
 const map=rect(mapOf(18,16),1,1,16,14),e=actor(8,8),doors=[{x:11,y:8},{x:8,y:5},{x:5,y:8}];
 assert.deepEqual(retreatPlan(e,map,doors).target,{x:8,y:5});assert.deepEqual(retreatPlan(e,map,[...doors].reverse()),retreatPlan(e,map,doors));
});

test('fractional actor and completion-exit positions retain exact cardinal joins without snapping',()=>{
 const map=rect(mapOf(18,16),1,1,16,14),e=actor(8.37,8.16),target={x:11.24,y:9.33};
 const plan=retreatPlan(e,map,[target]);assert.deepEqual(plan.target,target);assert.deepEqual(plan.route.at(-1),target);assertWalkable(e,map,plan.route);assert.equal(e.x,8.37);
});

test('retreat jump permission is only one ordinary level in either direction and never clears lethal terrain',()=>{
 for(const delta of [-4,-2,-1,1,2,4]){
  const map=rect(mapOf(14,8),1,4,12,4,{elev:4}),e=actor(2,4),target={x:10,y:4};rect(map,6,4,12,4,{elev:4+delta});
  const plan=retreatPlan(e,map,target);assert.equal(plan.status,Math.abs(delta)===1?'reached':'no-path',`delta ${delta}`);
 }
 for(const kind of ['wall','sealedGate','dungeonWater','river','lava','abyss','canyon','ocean','deepOcean']){
  const map=rect(mapOf(14,8),1,4,12,4),e={...actor(2,4),phases:true,flying:true};Object.assign(map.tiles[4*14+6],{kind,blocked:kind==='wall'||kind==='sealedGate'});
  assert.equal(retreatPlan(e,map,{x:10,y:4}).status,'no-path',kind);
 }
});

test('retreat door representations include physical level passages but exclude portals and room doors',()=>{
 const map=mapOf();assert.deepEqual(walkerRetreatDoors(map),[map.entry]);
 map.objects=[{kind:'door',state:'open',x:5,y:4},{kind:'deepPortal',state:'open',x:6,y:4},{kind:'deepTransition',state:'open',x:7,y:4},{kind:'exit',state:'open',x:9,y:4},{kind:'exit',state:'locked',x:4,y:4}];
 assert.deepEqual(walkerRetreatDoors(map),[{x:7,y:4},{x:9,y:4}]);map.objects=map.objects.filter(o=>!['exit','deepTransition'].includes(o.kind));map.multiLevel=true;assert.deepEqual(walkerRetreatDoors(map),[]);
 map.objects=[{kind:'dungeon',state:'open',x:10,y:6},{kind:'exit',state:'open',x:4,y:4}];assert.deepEqual(walkerRetreatDoors(map,'overworld'),[{x:10,y:6}]);
});


test('fractional retreat doors compete by direct legal distance, including the door already occupied',()=>{
 const map=rect(mapOf(20,20),1,1,18,18);
 for(const [e,doors,expected] of [
  [actor(10.25,10),[{x:10.3,y:10},{x:10,y:10}],{x:10.3,y:10}],
  [actor(10.25,10.2),[{x:10.25,y:10.2},{x:10,y:10}],{x:10.25,y:10.2}],
  [actor(10.25,10.2),[{x:13.25,y:10.2},{x:10,y:13}],{x:13.25,y:10.2}],
 ]){
  const result=retreatPlan(e,map,doors);assert.equal(result.status,'reached');assert.deepEqual(result.target,expected);assertWalkable(e,map,result.route);
  if(e.x===expected.x&&e.y===expected.y)assert.deepEqual(result.route,[],'already at the actual door; never walk away');
 }
});

test('direct fractional joins cannot cut a wall corner and still compete with cheaper graph detours',()=>{
 const map=rect(mapOf(20,20),1,1,18,18),e=actor(10.25,10.2),near={x:13.25,y:10.2},alternate={x:10,y:13};
 Object.assign(map.tiles[10*20+12],{blocked:true,kind:'wall'});const plan=retreatPlan(e,map,[near,alternate]);assert.deepEqual(plan.target,alternate);assertWalkable(e,map,plan.route);
 const corner=rect(mapOf(10,10),1,1,8,8),start=actor(3.25,3.2),target={x:4.3,y:4.2};
 for(const [x,y] of [[4,3],[3,4]])Object.assign(corner.tiles[y*10+x],{blocked:true,kind:'wall'});
 const result=retreatPlan(start,corner,target);if(result.status==='reached')assertWalkable(start,corner,result.route);assert.ok(result.route.length===0||result.route.length>3,'never a diagonal shortcut');
});

test('long fractional direct checks share the route budget and never return before a nearer route competes',()=>{
 const map=rect(mapOf(128,128),1,1,126,126),e=actor(2.25,2.2),far={x:124.25,y:124.2},near={x:2,y:5};
 const result=retreatPlan(e,map,[far,near]);assert.deepEqual(result.target,near);assertWalkable(e,map,result.route);
 const aligned=retreatPlan(e,map,{x:124.25,y:2.2});assert.deepEqual(aligned.target,{x:124.25,y:2.2});assert.ok(aligned.route.length>=122);assertWalkable(e,map,aligned.route);
});
