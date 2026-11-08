import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLabFixture, DEFAULT_PROVING_SEED, selectLabBuildMaterial, labReport } from '../src/proving-ground-labs.ts';
import { BUILD, breakBuild, buildOn, tickBuilds, buildRefusal, buildVisualRevision, hasStoneBuilds } from '../src/building.ts';
import { canStep, interiorSurfaceHeight, interiorGeometryHeight, elevationAt, liftAt, tileUnder, LIFT_PER_LEVEL } from '../src/landscape.ts';
import { Game, footprintOpen } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { closeViewStatic, closeViewStaticStats, wallGeometry, CLOSE_VIEW_HOOKS, closeViewStats, resetCloseViewCamera, setCloseViewCanvasFactory, closeViewProject, closeViewFloorRay, closeViewScreenToWorld } from '../src/close-view.ts';
import { closeViewGLStats, resetCloseViewGL, glMask } from '../src/close-view-gl.ts';
import { render } from '../src/renderer.ts';

const fixture = (version = 2, seed = DEFAULT_PROVING_SEED) => createLabFixture({ lab: 'close-view', scenario: version === 2 ? 'build-blocks-legacy' : 'build-blocks-current', seed, now: 1000 });
const build = (f, at = f.buildPractice.lane.one) => { const r = f.game.buildAt(at.x + .5, at.y + .5); assert.equal(r.ok, true, r.message); return f.game.map.tiles[at.y * f.game.map.width + at.x]; };
const digest = data => createHash('sha256').update(Buffer.from(data.buffer, data.byteOffset, data.byteLength)).digest('hex');
const input = (dx = 0, dy = 0, action = '') => { let used = false; return { state: { x: dx, y: dy }, consume: k => k === action && !used && (used = true), held: () => false }; };

test('legacy built stone emits a .34/.68 support prism without lifting old ceilings or decoration', () => {
  const f = fixture(), { game: g } = f, at = f.buildPractice.lane.one;
  const base = closeViewStatic(g.map), original = g.map.tiles[at.y * g.map.width + at.x];
  original.elev = 37; // old decorative values still do not become a global heightfield
  assert.equal(interiorSurfaceHeight(g.map, at.x + .5, at.y + .5), 0);
  assert.equal(elevationAt(g.map, g.map.width, at.x, at.y), 0);
  for (const level of [1, 2]) {
    build(f); const st = closeViewStatic(g.map), prism = st.data.slice(-30 * 20), z = [];
    for (let i = 2; i < prism.length; i += 20) z.push(prism[i]);
    assert.equal(st.verts, base.verts + 30); assert.ok(Math.abs(Math.max(...z) - level * LIFT_PER_LEVEL) < 1e-6); assert.equal(Math.min(...z), 0);
    assert.deepEqual(st.data.slice(0, base.data.length), base.data, 'all existing static geometry, including ceilings, stays exact');
    assert.equal(interiorSurfaceHeight(g.map, at.x + .5, at.y + .75), level * LIFT_PER_LEVEL);
    assert.equal(liftAt(g.map, g.map.width, at.x, at.y), level * LIFT_PER_LEVEL);
    assert.equal(elevationAt(g.map, g.map.width, at.x, at.y), level);
    assert.equal(interiorGeometryHeight(g.map, at.x, at.y, at.x + .5, at.y + .5), 0, 'no generic old decoration lift');
  }
  breakBuild(g, g.builds[1]); breakBuild(g, g.builds[0]);
  assert.equal(g.map.tiles[at.y * g.map.width + at.x], original); assert.equal(original.elev, 37);
  assert.equal(digest(closeViewStatic(g.map).data), digest(base.data));
});

test('legacy mutation invalidation is immediate, bounded and agrees with fresh geometry after break and expiry', () => {
  const f = fixture(), g = f.game; closeViewStatic(g.map); const start = closeViewStaticStats.builds;
  for (const op of [() => build(f), () => build(f), () => breakBuild(g, buildOn(g, f.buildPractice.lane.one.x, f.buildPractice.lane.one.y)), () => tickBuilds(g, 10)]) {
    const revision = buildVisualRevision(g.map); op(); assert.notEqual(buildVisualRevision(g.map), revision);
    const live = closeViewStatic(g.map); assert.deepEqual(live.data, closeViewStatic({ ...g.map }).data);
    const count = closeViewStaticStats.builds; for (let i = 0; i < 100; i++) assert.equal(closeViewStatic(g.map).data, live.data);
    assert.equal(closeViewStaticStats.builds, count, 'unchanged frames never rebake');
  }
  assert.equal(closeViewStaticStats.builds - start, 8, 'one live and one explicit fresh build per mutation');
  assert.equal(hasStoneBuilds(g.map), false);
});

test('wood remains a full blocking wall, selected explicitly, and never becomes a stone step', () => {
  const f = fixture(), g = f.game, at = f.buildPractice.lane.one, before = wallGeometry(g.map);
  assert.equal(freshSave().build.kind, 'wood'); assert.ok(selectLabBuildMaterial(f, 'wood'));
  const t = build(f); assert.equal(t.blocked, true); assert.equal(t.build, 'wood');
  assert.notEqual(wallGeometry(g.map), before); assert.equal(hasStoneBuilds(g.map), false);
  assert.equal(footprintOpen(g.map, g.map.width, at.x, at.y, true), false);
  assert.equal(interiorSurfaceHeight(g.map, at.x + .5, at.y + .75), 0);
  const st = closeViewStatic(g.map), z = [];
  for (let i = 0; i < st.data.length; i += 20) if (st.data[i + 18] === at.x && st.data[i + 19] === at.y) z.push(st.data[i + 2]);
  assert.ok(Math.max(...z) >= 2.4 - 1e-6);
  assert.equal(selectLabBuildMaterial({ game: g }, 'stone'), false, 'lab selector cannot act on an unrelated fixture');
});

test('both real Game views require Jump for one block, reject two from ground, then reach two from one', () => {
  for (const version of [2, 4]) for (const closeView of [false, true]) {
    const f = fixture(version), g = f.game, lane = f.buildPractice.lane; g.save.closeView = closeView;
    const base = elevationAt(g.map, g.map.width, g.player.x, g.player.y); let now = 1000;
    build(f); build(f); build(f, lane.two); build(f, lane.two);
    for (let i = 0; i < 15; i++) g.update(.05, input(lane.dx, lane.dy, i === 0 ? 'jump' : ''), now += 50);
    assert.notEqual(tileUnder(g.map, g.map.width, g.player.x, g.player.y)?.build, 'stone', 'two-high cannot be climbed directly');
    breakBuild(g, buildOn(g, lane.one.x, lane.one.y));
    for (let i = 0; i < 10; i++) g.update(.05, input(lane.dx, lane.dy), now += 50);
    assert.equal(elevationAt(g.map, g.map.width, g.player.x, g.player.y), base, 'one-high needs Jump');
    for (let i = 0; i < 8; i++) g.update(.05, input(lane.dx, lane.dy, i === 0 ? 'jump' : ''), now += 50);
    assert.ok(elevationAt(g.map, g.map.width, g.player.x, g.player.y) >= base + 1);
    for (let i = 0; i < 12; i++) g.update(.05, input(), now += 50);
    for (let i = 0; i < 8; i++) g.update(.05, input(lane.dx, lane.dy, i === 0 ? 'jump' : ''), now += 50);
    assert.equal(elevationAt(g.map, g.map.width, g.player.x, g.player.y), base + 2, 'adjacent one-to-two step succeeds');
    assert.equal(g.enemies.length, 0);
  }
});

test('v4 block support keeps the existing elevated heightfield mesh and traversal rules', () => {
  const f = fixture(4), g = f.game, at = f.buildPractice.lane.one, base = g.map.tiles[at.y * g.map.width + at.x].elev || 0;
  build(f); const st = closeViewStatic(g.map), top = (base + 1) * LIFT_PER_LEVEL;
  assert.equal(interiorSurfaceHeight(g.map, at.x + .5, at.y + .5), top);
  const floorZ = []; for (let i = 0; i < st.data.length; i += 20) if (st.data[i + 9] === 20 && st.data[i + 18] === at.x && st.data[i + 19] === at.y) floorZ.push(st.data[i + 2]);
  assert.equal(floorZ.length, 6); assert.ok(floorZ.every(z => Math.abs(z - top) < 1e-6));
  assert.equal(g.map.interiorTerrain.version, 1);
});

test('five physical records, separate stack lifetimes, ten active seconds and paused lifetime stay canonical', () => {
  const f = fixture(), g = f.game, lane = f.buildPractice.lane;
  build(f); g.update(2, input(), 3000); build(f); assert.deepEqual(g.builds.map(b => b.life), [8, 10]);
  g.setPaused(true, 3000); g.update(50, input(), 53000); assert.deepEqual(g.builds.map(b => b.life), [8, 10]);
  g.setPaused(false, 53000); tickBuilds(g, 8.1); assert.equal(g.builds.length, 1); assert.equal(g.map.tiles[lane.one.y * g.map.width + lane.one.x].buildLevel, 1);
  tickBuilds(g, 2); assert.equal(g.builds.length, 0); assert.equal(hasStoneBuilds(g.map), false);
  const points = [lane.one, lane.two, ...[0, 1, 2, 3].map(n => ({ x: lane.start.x + lane.dx * n - lane.dy, y: lane.start.y + lane.dy * n + lane.dx }))];
  for (const p of points) build(f, p);
  assert.equal(g.builds.length, BUILD.maxOut); assert.equal(g.map.tiles[lane.one.y * g.map.width + lane.one.x].build, undefined);
  assert.ok(closeViewStatic(g.map).verts - closeViewStatic({ ...g.map, tiles: g.map.tiles.map(t => t.buildOrig || t) }).verts <= 150);
});

test('production reload clears transient builds; fixture reconstruction restores only isolated starting material', () => {
  const f = fixture(), g = f.game; build(f); const snap = g.exportSnapshot(1000);
  snap.blockUnknown = { kept: true }; const restored = new Game(deserializeSave(serializeSave(snap)), 5000);
  assert.equal(restored.save.version, 14); assert.deepEqual(restored.save.blockUnknown, { kept: true }); assert.equal(restored.builds.length, 0); assert.equal(restored.map.tiles.some(t => t.build), false);
  g.loadArea('dungeon', false); assert.equal(g.builds.length, 0); assert.equal(g.enemies.length, 0); assert.equal(g.map.tiles.some(t => t.build), false);
  const reset = fixture(); assert.equal(reset.game.save.materials.stone, 100); assert.equal(reset.game.save.build.kind, 'stone'); assert.equal(reset.game.builds.length, 0);
  assert.equal(g.save.materials.stone, 95, 'reset never mutates an earlier scratch save');
});

test('build safety refusals and arbitrary unbuilt legacy elevations retain their old behavior', () => {
  const f = fixture(), g = f.game, p = f.buildPractice.lane.one, index = p.y * g.map.width + p.x, original = g.map.tiles[index];
  for (const patch of [{ slope: true }, { door: true }, { structure: 'tower' }, { blocked: true }, { kind: 'lava' }, { kind: 'canyon' }, { kind: 'dungeonWater' }]) {
    g.map.tiles[index] = { ...original, ...patch }; assert.ok(buildRefusal(g.map, p.x, p.y, 'stone', false)); assert.equal(g.buildAt(p.x + .5, p.y + .5).ok, false);
  }
  g.map.tiles[index] = { ...original, elev: 999 }; assert.equal(interiorSurfaceHeight(g.map, p.x + .5, p.y + .5), 0); assert.equal(liftAt(g.map, g.map.width, p.x, p.y), 0);
  assert.equal(canStep({ isPlayer: true }, g.map, g.map.width, g.player.x, g.player.y, p.x, p.y), true);
  assert.equal(g.save.materials.stone, 100); assert.equal(buildVisualRevision(g.map), 0);
});

test('several legacy themes and both quiet fixture seeds use the same production build path', () => {
  for (const seed of ['CONTACT-AUDIT', 'BLOCK-SECOND']) for (const version of [2, 4]) {
    const f = fixture(version, seed); build(f); const report = labReport(f);
    assert.equal(report.diagnostics.buildState.selected, 'stone'); assert.equal(report.diagnostics.buildState.records.length, 1);
    assert.equal(report.scratch, true); assert.equal(report.diagnostics.buildPractice.version, version);
  }
  for (const scenario of ['keep', 'hive', 'arcology', 'outer']) {
    const f = createLabFixture({ lab: 'close-view', scenario, seed: 'CONTACT-AUDIT' }), g = f.game; g.enemies = []; g.save.materials.stone = 20; g.save.build.kind = 'stone';
    const t = g.map.tiles.find(t => !t.blocked && !t.hole && !t.doorway && !buildRefusal(g.map, t.x, t.y, 'stone', false) && [-2, -1].every(dx => { const n = g.map.tiles[t.y * g.map.width + t.x + dx]; return n && !n.blocked && !n.hole; })); assert.ok(t);
    g.player.x = t.x - 2; g.player.y = t.y; const before = closeViewStatic(g.map); assert.equal(g.buildAt(t.x + .5, t.y + .5).ok, true);
    assert.equal(closeViewStatic(g.map).verts, before.verts + 30, scenario); assert.equal(interiorSurfaceHeight(g.map, t.x + .5, t.y + .5), .34);
  }
});

const context2D = () => new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) });
class MockGL {
  constructor() { let n = 1; const constants = new Map(); return new Proxy(this, { get: (o, k) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, n++); return constants.get(k); } return () => {}; } }); }
  isContextLost() { return false; } createShader() { return {}; } createProgram() { return {}; } createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; }
  getShaderParameter() { return true; } getProgramParameter(p, k) { return k === this.ACTIVE_UNIFORMS || k === this.ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
}
test('the production Close View tap ray selects a visible stone top and stacks through Game.buildAt', () => {
  const previous = globalThis.WebGL2RenderingContext; globalThis.WebGL2RenderingContext = MockGL;
  const gl = new MockGL(), screen = context2D(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: kind => kind === 'webgl2' ? gl : context2D() }; screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try {
    for (const version of [2, 4]) {
      const f = fixture(version), g = f.game, at = f.buildPractice.lane.one; build(f); resetCloseViewCamera();
      for (let i = 0; i < 4; i++) render(screen, g, 390, 844, 90000 + i * 16);
      const top = interiorSurfaceHeight(g.map, at.x + .5, at.y + .5), projected = closeViewProject(at.x + .5, at.y + .5, top); assert.ok(projected);
      const picked = closeViewScreenToWorld(g, 390, 844, projected.sx, projected.sy); assert.ok(picked); assert.ok(Math.hypot(picked.x - at.x - .5, picked.y - at.y - .5) < .03, `v${version} selects the rendered top instead of the floor behind it`);
      const stacked = g.buildAt(picked.x, picked.y); assert.equal(stacked.ok, true, stacked.message); assert.equal(g.map.tiles[at.y * g.map.width + at.x].buildLevel, 2); assert.equal(g.save.materials.stone, 90);
    }
  } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); resetCloseViewCamera(); if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous; }
});
test('every quality tier and reduced motion submits legacy stone depth; picking and no-WebGL fallback remain usable', () => {
  const previous = globalThis.WebGL2RenderingContext; globalThis.WebGL2RenderingContext = MockGL;
  const gl = new MockGL(), screen = context2D(), canvas = { width: 390, height: 844, addEventListener() {}, getContext: kind => kind === 'webgl2' ? gl : context2D() }; screen.canvas = canvas;
  setCloseViewCanvasFactory(() => canvas); CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL();
  try {
    for (const quality of ['low', 'balanced', 'full']) for (const reduceMotion of [false, true]) {
      const f = fixture(), g = f.game; build(f); g.presentation = { effectiveQuality: quality, reduceMotion }; resetCloseViewCamera(); const frames = closeViewGLStats.frames;
      for (let i = 0; i < 4; i++) render(screen, g, 390, 844, 100000 + i * 16);
      assert.ok(closeViewGLStats.frames > frames); assert.equal(closeViewStats.gl, 1);
      const at = f.buildPractice.lane.one, q = closeViewProject(at.x + .5, at.y + .5, .34); assert.ok(q);
      const picked = closeViewFloorRay(q.sx, q.sy); assert.ok(picked); assert.ok(Math.hypot(picked.x - at.x - .5, picked.y - at.y - .5) < .03);
      assert.equal(g.builds[0].life, 10, 'render never advances active lifetime');
      glMask(g.map, 100100, null, null, 250); const masks = closeViewGLStats.maskBuilds;
      breakBuild(g, g.builds[0]); glMask(g.map, 100101, null, null, 250);
      assert.equal(closeViewGLStats.maskBuilds, masks + 1, 'build removal refreshes even an unthrottled fully-visible mask immediately');
      glMask(g.map, 100102, null, null, 250); assert.equal(closeViewGLStats.maskBuilds, masks + 1);
    }
    const f = fixture(); build(f); CLOSE_VIEW_HOOKS.gl = false; resetCloseViewCamera(); assert.doesNotThrow(() => render(screen, f.game, 390, 844, 200000));
  } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); setCloseViewCanvasFactory(null); if (previous === undefined) delete globalThis.WebGL2RenderingContext; else globalThis.WebGL2RenderingContext = previous; }
});
