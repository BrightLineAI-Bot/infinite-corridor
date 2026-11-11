import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { CLOSE_VIEW_HOOKS, closeViewStatic, closeViewStaticStats, closeViewPrewarmDue, prewarmCloseView } from '../src/close-view.ts';

// Feel pass 1 (pre-warm): a floor's Close View walls can be built in a task of their own, before the frame that draws them.
const SCENARIOS = ['outer', 'cellar', 'inner', 'heart', 'grand-hall', 'building', 'keep', 'hive', 'arcology', 'terrain-ramps'];
const bytes = (st) => Buffer.concat([st.data, st.lightList, st.cardList].map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength)));
const fixture = (scenario) => createLabFixture({ lab: 'close-view', scenario, now: 1000 }).game;

test('a pre-warmed floor holds exactly the walls a cold first frame builds', () => {
  for (const sc of SCENARIOS) {
    const warm = fixture(sc), cold = fixture(sc);
    assert.equal(warm.save.closeView, true, sc);
    assert.equal(closeViewPrewarmDue(warm), true, `${sc}: a fresh floor is due`);
    assert.equal(prewarmCloseView(warm), true, sc);
    assert.equal(closeViewPrewarmDue(warm), false, `${sc}: built once`);
    assert.equal(prewarmCloseView(warm), false, `${sc}: and never twice`);
    const builds = closeViewStaticStats.builds, a = closeViewStatic(warm.map);
    assert.equal(closeViewStaticStats.builds, builds, `${sc}: the frame finds the pre-warmed walls in the cache`);
    const b = closeViewStatic(cold.map);
    assert.ok(a.verts > 0, sc);
    assert.equal(a.verts, b.verts, sc); assert.equal(a.lights, b.lights, sc); assert.equal(a.flames, b.flames, sc); assert.equal(a.cards, b.cards, sc); assert.equal(a.theme, b.theme, sc);
    assert.ok(bytes(a).equals(bytes(b)), `${sc}: byte-identical vertex, light and card buffers`);
  }
});

test('the vertex buffer is a private copy: a later floor never writes into an earlier one', () => {
  const g1 = fixture('outer'), first = closeViewStatic(g1.map), copy = Buffer.from(bytes(first));
  for (const sc of ['inner', 'keep', 'hive']) closeViewStatic(fixture(sc).map);
  assert.ok(bytes(closeViewStatic(g1.map)).equals(copy));
  assert.equal(first.data.length, first.verts * 20, 'exactly the written vertices, no scratch tail');
});

test('pre-warm is due only where the next Close View frame would build walls', () => {
  const g = fixture('keep');
  g.save.closeView = false; assert.equal(closeViewPrewarmDue(g), false, 'Close View off');
  g.save.closeView = true; assert.equal(closeViewPrewarmDue(g), true);
  const gl = CLOSE_VIEW_HOOKS.gl; CLOSE_VIEW_HOOKS.gl = false;
  try { assert.equal(closeViewPrewarmDue(g), false, 'the 2D view (no GPU) builds no static buffer'); } finally { CLOSE_VIEW_HOOKS.gl = gl; }
  assert.equal(closeViewPrewarmDue({ ...g, player: null }), false);
  assert.equal(closeViewPrewarmDue(null), false);
});

test('the game holds one frame per new floor and builds its walls in a task of their own; GPU programs are made early', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /const holdForWalls = !viewportStage && game\.map !== prewarmHeld && closeViewPrewarmDue\(game\);/);
  assert.match(main, /if \(holdForWalls\) \{ const g0 = game; prewarmHeld = game\.map; setTimeout\(\(\) => \{ try \{ if \(g0 === game\) prewarmCloseView\(game\);/);
  assert.match(main, /if \(!holdForWalls\) measured\("render"/);
  assert.match(main, /if \(save\.closeView === true\) prewarmCloseViewGL\(\);/);
});
