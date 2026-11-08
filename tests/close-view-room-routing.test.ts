import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CLOSE_VIEW_ROOM_ROUTING, layCloseViewRooms } from '../src/close-view-room-routing.ts';
import { BUILDINGS, buildingPlan, generateBuildingFloor } from '../src/great-buildings.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { canStep } from '../src/landscape.ts';
import { createLabFixture, scenariosForLab } from '../src/proving-ground-labs.ts';
import { interiorMap, CLOSE_VIEW_HOOKS, closeViewStats, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL } from '../src/close-view-gl.ts';
import { render } from '../src/renderer.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function reach(map) {
  const W = map.width, H = map.height, start = map.entry.y * W + map.entry.x, seen = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy, n = ny * W + nx, t = map.tiles[n];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(n) || !t || t.blocked || t.hole || !canStep({ isPlayer: false }, map, W, x, y, nx, ny)) continue;
      seen.add(n); queue.push(n);
    }
  }
  return seen;
}
function assertUsesReachable(map) {
  const seen = reach(map);
  for (const object of map.objects) {
    if (!object.actions?.length) continue;
    const x = Math.round(object.x), y = Math.round(object.y);
    assert.ok(seen.has(y * map.width + x) || N4.some(([dx, dy]) => seen.has((y + dy) * map.width + x + dx)), `${map.id}: ${object.id} approach`);
    if (object.kind === 'buildingStair' && ['up', 'down'].includes(object.dir)) assert.ok(seen.has(y * map.width + x), `${map.id}: ${object.id} landing`);
  }
}
function act(game, object, action = object.actions[0]) {
  game.player.x = object.x; game.player.y = object.y;
  return game.interact(action, object.id);
}

test('routing is opt-in: current versions and every existing lab default stay unchanged', () => {
  assert.equal(BUILDINGS.interior.version, 4); assert.equal(PENTAGON.version, 9);
  assert.equal(scenariosForLab('close-view')[0].id, 'outer');
  assert.deepEqual([CLOSE_VIEW_ROOM_ROUTING.keepVersion, CLOSE_VIEW_ROOM_ROUTING.pentagonVersion], [5, 10]);
  for (const style of ['apartment', 'hive']) {
    const base = `building:ROUTING0:1:1:${style}:4`;
    assert.deepEqual(buildingPlan(base, 5).floors.map((f) => f.grid), buildingPlan(base, 4).floors.map((f) => f.grid));
  }
});

test('all v4 standalone styles keep their pre-experiment bytes including problematic seeds', () => {
  const hash = createHash('sha256');
  for (const seed of ['PIN', 'AUDIT0', 'DIG-AUDIT0', 'ROUTING0']) for (const style of ['keep', 'apartment', 'hive']) for (let floor = 1; floor <= 4; floor++) hash.update(JSON.stringify(generateBuildingFloor(seed, `building:${seed}:1:1:${style}:4:f${floor}`, 4)));
  assert.equal(hash.digest('hex'), 'dda3957c9a283aaad544e47fe9dd83d9c037640e37eb2a9f862d072a3df1e331');
});

test('room regions have bounded trees, loops and independent deterministic stages over 1000 seeds', () => {
  const seeds = ['AUDIT0', 'DIG-AUDIT0', ...Array.from({ length: 998 }, (_, i) => `ROUTING${i}`)];
  const hashes = new Map();
  for (const seed of seeds) {
    const floor = layCloseViewRooms(seed, 1, 44, 40, BUILDINGS.styles.keep, { x: 22, y: 38 }, [{ x: 22, y: 39, v: 2 }]);
    assert.ok(floor.leaves.length >= 5 && floor.leaves.length <= 7); assert.equal(floor.routing.edges.filter((e) => !e.loop).length, floor.leaves.length - 1);
    assert.ok(floor.routing.edges.length >= floor.leaves.length && floor.routing.edges.length <= floor.leaves.length + 1);
    const degree = new Array(floor.leaves.length).fill(0); for (const edge of floor.routing.edges) { degree[edge.a]++; degree[edge.b]++; }
    assert.ok(Math.max(...degree) >= 3, `${seed}: genuine branching region`);
    hashes.set(seed, digest(floor));
    const otherStyle = { ...BUILDINGS.styles.keep, rooms: ['flagFloor'] };
    assert.deepEqual(layCloseViewRooms(seed, 1, 44, 40, otherStyle, { x: 22, y: 38 }, [{ x: 22, y: 39, v: 2 }]).grid, floor.grid);
  }
  for (const seed of seeds.reverse()) assert.equal(digest(layCloseViewRooms(seed, 1, 44, 40, BUILDINGS.styles.keep, { x: 22, y: 38 }, [{ x: 22, y: 39, v: 2 }])), hashes.get(seed));
  assert.throws(() => layCloseViewRooms('X', 1, 1000, 1000, BUILDINGS.styles.keep, { x: 1, y: 1 }), RangeError);
});

test('candidate keeps and all Pentagon chambers preserve walkable uses and semantic ports over 128 sites', () => {
  for (let i = 0; i < 128; i++) {
    const seed = ['AUDIT0', 'DIG-AUDIT0'][i] || `ROUTING${i}`, base = `building:${seed}:1:1:keep:4r`;
    for (let f = 1; f <= 4; f++) {
      const map = generateBuildingFloor(seed, `${base}:f${f}`, 5); assertUsesReachable(map);
      for (const stair of map.objects.filter((o) => o.toId)) {
        const there = generateBuildingFloor(seed, stair.toId, 5), counterpart = there.objects.find((o) => stair.counterpartId ? o.id === stair.counterpartId : o.toId === map.id && !o.routeId);
        assert.ok(counterpart); assert.deepEqual([counterpart.x, counterpart.y], [stair.toX, stair.toY]);
      }
      if (f === 4) assert.ok(map.objects.some((o) => o.dir === 'roof'), `${map.id}: roof retained`);
    }
    const old = pentagonPlan(seed, 8, -8, 9), plan = pentagonPlan(seed, 8, -8, 10);
    for (const key of ['nodes', 'edges', 'world', 'trials', 'keyNode', 'plateE', 'lockW', 'levers', 'links', 'ledges']) assert.deepEqual(plan[key], old[key], `${seed}: semantic ${key}`);
    for (const node of plan.nodes) {
      const map = generatePentagonChamber(seed, `${plan.base}:f${node.n + 1}`); assertUsesReachable(map);
      for (const port of node.ports) {
        const point = port.inner, tile = map.tiles[point.y * map.width + point.x];
        assert.ok(tile && !tile.blocked && !tile.hole && reach(map).has(point.y * map.width + point.x), `${map.id}: reserved ${port.to || port.world.key}`);
      }
    }
  }
});

test('scratch experiments use actual matched exteriors and survive exit, entry and fixture reconstruction', () => {
  for (const family of ['keep', 'pentagon']) {
    const options = { lab: 'close-view', seed: 'ROUTING0', now: 1000 };
    const baseline = createLabFixture({ ...options, scenario: `routing-${family}-baseline` });
    const fixture = createLabFixture({ ...options, scenario: `routing-${family}-candidate` }), { game } = fixture;
    assert.deepEqual(fixture.diagnostics.routing.outside, baseline.diagnostics.routing.outside);
    assert.ok(interiorMap(game.map)); assert.notEqual(digest(game.map.tiles), digest(baseline.game.map.tiles));
    const id = game.areaId(), signature = digest(game.map.tiles), exit = game.map.objects.find((o) => o.kind === 'exit' && (family === 'keep' || o.id === `building-exit-${fixture.diagnostics.routing.entranceId.slice(5)}`));
    assert.ok(exit); assert.ok(act(game, exit, 'exit').ok); assert.equal(game.area, 'overworld'); assert.equal(interiorMap(game.map), false);
    const door = game.map.objects.find((o) => o.id === fixture.diagnostics.routing.entranceId);
    assert.ok(door); assert.ok(act(game, door, 'enter').ok); assert.equal(game.areaId(), id); assert.equal(digest(game.map.tiles), signature);
    game.loadArea('dungeon', false); assert.equal(digest(game.map.tiles), signature);
    const rebuilt = createLabFixture({ ...options, scenario: fixture.scenario }); assert.equal(digest(rebuilt.game.map.tiles), signature);
    if (family === 'pentagon') assert.equal(game.pentagonVersion(0, 0), 9);
    const ordinary = freshSave(); assert.equal(Object.values(ordinary.consequences.dungeons).some((h) => h.interiorVersion === 5), false);
  }
});

test('keep candidate uses real stairs and roof, with the guardian gate intact', () => {
  const { game } = createLabFixture({ lab: 'close-view', scenario: 'routing-keep-candidate', seed: 'ROUTING0', now: 1000 });
  while (game.map.objects.some((o) => o.dir === 'up')) {
    const before = game.areaId(), up = game.map.objects.find((o) => o.dir === 'up'); assert.ok(act(game, up, 'climb').ok);
    const down = game.map.objects.find((o) => o.dir === 'down'); assert.equal(down.toId, before); assert.ok(act(game, down, 'descend').ok); assert.equal(game.areaId(), before);
    assert.ok(act(game, game.map.objects.find((o) => o.dir === 'up'), 'climb').ok);
  }
  const roof = game.map.objects.find((o) => o.dir === 'roofExit' || o.dir === 'roof'); assert.ok(roof);
  if (roof.dir === 'roofExit') assert.equal(act(game, roof, 'climb').ok, false, 'living guardian retains the roof gate');
  for (const enemy of [...game.enemies].filter((e) => String(e.id).endsWith(':guardian'))) game.defeatEnemy(enemy);
  assert.ok(act(game, roof, 'climb').ok); assert.equal(game.area, 'overworld');
  const tile = game.map.tiles[Math.floor(game.player.y + .75) * (game.map.width || 32) + Math.floor(game.player.x + .5)];
  assert.ok(tile?.structure === 'buildingRoof' || tile?.elev >= 5, 'returned onto actual exterior roof');
});

test('Pentagon candidate retains boss-gated descent and ordinary schema-14 future fields', () => {
  const fixture = createLabFixture({ lab: 'close-view', scenario: 'routing-pentagon-candidate', seed: 'ROUTING0', now: 1000 }), { game } = fixture;
  const { cx, cy } = fixture.diagnostics.routing.site, plan = pentagonPlan('ROUTING0', cx, cy, 10), heart = plan.nodes.find((n) => n.id === 'h0');
  game.save.session.activeDungeonId = `${plan.base}:f${heart.n + 1}`; game.loadArea('dungeon', false);
  const down = game.map.objects.find((o) => o.dir === 'down'); assert.ok(down.bossGate); assert.equal(act(game, down, 'descend').ok, false);
  const save = freshSave(); save.seed = 'PIN'; save.futureRoutingCanary = { kept: true }; save.session.futureRoutingCanary = 7;
  const original = new Game(save, 0), snapshot = original.exportSnapshot(), migrated = migrateSave({ ...snapshot, futureRoutingCanary: { kept: true } });
  assert.deepEqual(migrated.futureRoutingCanary, { kept: true }); assert.equal(migrated.session.futureRoutingCanary, 7); assert.equal(migrated.schemaVersion, save.schemaVersion);
});

test('both experimental interiors submit GPU geometry at low, balanced and full quality', () => {
  const context = () => new Proxy({ measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
  class MockGL {
    constructor() {
      let constant = 1; const constants = new Map();
      return new Proxy(this, { get: (o, k) => {
        if (k in o) return o[k];
        if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, constant++); return constants.get(k); }
        return () => {};
      } });
    }
    isContextLost() { return false; }
    createShader() { return {}; } createProgram() { return {}; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; }
    getShaderParameter() { return true; }
    getProgramParameter(program, parameter) { return parameter === this.ACTIVE_UNIFORMS || parameter === this.ACTIVE_ATTRIBUTES ? 0 : true; }
    getExtension() { return null; }
  }
  const previous = globalThis.WebGL2RenderingContext;
  globalThis.WebGL2RenderingContext = MockGL;
  const gl = new MockGL(), screen = context(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: (kind) => kind === 'webgl2' ? gl : context() }; screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try {
    for (const family of ['keep', 'pentagon', 'keep-biomechanical']) {
      const { game } = createLabFixture({ lab: 'close-view', scenario: `routing-${family}-candidate`, seed: 'ROUTING0', now: 1000 });
      for (const tier of ['low', 'balanced', 'full']) for (const reduceMotion of [false, true]) {
        game.presentation = { effectiveQuality: tier, reduceMotion }; resetCloseViewCamera();
        const before = closeViewGLStats.frames; render(screen, game, 390, 844, 1000);
        assert.ok(closeViewGLStats.frames > before, `${family}/${tier}: GPU frame submitted`); assert.equal(closeViewStats.gl, 1); assert.ok(closeViewGLStats.drawCalls > 0);
      }
    }
  } finally {
    CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null);
    if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous;
  }
});
