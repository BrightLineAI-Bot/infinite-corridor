// The view below (Tim, 2026-11-06): on a room maze's upper floor or roof, the void over a barrier shows, faintly, what lies under
// it (the ground floor's holes, lava, rubble, a walkway's planks between), so you look down on what you could not cross. Drawing
// only: a cached one-pixel-a-tile image, painted only for void tiles in sight (LAB_FOG), redrawn only when the sight changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render, rendererDiagnostics, drawRoomViewBelow } from '../src/renderer.ts';
import { ROOM_MAZES, ROOM_VIEW, roomMazePlan, roomViewBelow, roomFloorOf, generateRoomMazeFloor, labFogOf } from '../src/labyrinths.ts';

const STYLES = ['keep', 'apartment', 'hive'], baseOf = (i) => `labyrinth:W${i}:${i % 9 - 4}:${i % 5 - 2}:${STYLES[i % 3]}~r${ROOM_MAZES.version}`;
const floor = (base, L) => generateRoomMazeFloor(roomMazePlan(base).seed, `${base}:f${roomFloorOf(L)}`);

test('what the void shows: for every void tile over a barrier on an upper floor or the roof, the first thing beneath it; nothing on the ground or in the undercroft; the floors are untouched', () => {
  let lava = 0, planks = 0, pits = 0, rubble = 0, maxN = 0;
  for (let i = 0; i < 200; i++) { const base = baseOf(i), P = roomMazePlan(base);
    for (const L of [-1, 0]) assert.equal(roomViewBelow(floor(base, L)), null);
    for (const L of [1, 2]) { const m = floor(base, L), before = JSON.stringify(m.tiles), V = roomViewBelow(m); assert.equal(JSON.stringify(m.tiles), before, 'drawing only'); if (!V) continue; maxN = Math.max(maxN, V.n);
      const g = floor(base, 0), up = L === 2 ? floor(base, 1) : null;
      for (let k = 0; k < m.tiles.length; k++) { const code = V.codes[k], t = m.tiles[k], x = k % m.width, inBand = m.building.barriers.some((b) => x >= b.x0 && x <= b.x1);
        if (!code) { assert.ok(!(t.hole && inBand && !t.drop), 'every void tile over a barrier shows something'); continue; }
        assert.ok(t.hole && inBand, 'only void tiles over a barrier');
        const mid = up?.tiles[k], first = mid && !mid.hole ? mid : g.tiles[k], want = first.kind === 'lava' ? 2 : first.hole ? 1 : first.rubble ? 3 : first.bridge ? 4 : first.blocked ? 6 : 5;
        assert.equal(code, want); if (code === 2) lava++; if (code === 4) planks++; if (code === 1) pits++; if (code === 3) rubble++; } } }
  assert.ok(lava > 0 && planks > 0 && pits > 0 && rubble > 0, `lava ${lava}, planks ${planks}, pits ${pits}, rubble ${rubble}`);
  assert.ok(maxN <= 2 * 8 * 29, `void tiles a floor ≤ ${maxN}`);
});

// A dependency-free recording canvas (as tests/labyrinth-fog.test.ts), so the offscreen image path runs.
class RecCanvas { width; height; calls = []; constructor(w, h) { this.width = w; this.height = h; } getContext() { return recContext(this); } }
function recContext(canvas) {
  if (canvas.ctx) return canvas.ctx; const calls = canvas.calls, state = {};
  const base = { canvas, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), measureText: (t) => ({ width: String(t).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
    clearRect(...a) { if (a[0] === 0 && a[1] === 0 && a[2] >= canvas.width && a[3] >= canvas.height) calls.length = 0; calls.push(['clearRect', ...a]); }, drawImage(src, ...a) { calls.push(['drawImage', src, ...a]); }, fillRect(...a) { calls.push(['fillRect', state.fillStyle, ...a]); } };
  return canvas.ctx = new Proxy(base, { get: (o, k) => k in o ? o[k] : k in state ? state[k] : () => calls.push([k]), set: (o, k, v) => { state[k] = v; return true; } });
}
const onUpper = () => { for (let i = 0; i < 400; i++) { const base = baseOf(i), P = roomMazePlan(base), b = P.barriers.find((q) => q.obstacle === 'lava' && q.crossing === 'upper'); if (!b) continue;
  const s = freshSave(); s.seed = P.seed; s.session.activeDungeonId = `${base}:f${roomFloorOf(1)}`; s.session.dungeonReturn = { rx: 7, ry: 7, x: 16, y: 16 }; const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = [];
  const W = g.map.width, k = g.map.tiles.findIndex((t, q) => t.bridge && (q % W) === P.xs[b.col] + 3); g.player.x = k % W; g.player.y = ((k / W) | 0) - .25; return { g, P }; } return null; };

test('drawn cheaply and only in sight: one copy of a cached image a frame, rebuilt only as the sight changes; only void tiles in sight painted; Close View skips it', () => {
  const at = onUpper(); assert.ok(at); const { g } = at, prior = globalThis.OffscreenCanvas; globalThis.OffscreenCanvas = RecCanvas;
  try {
    const screen = new RecCanvas(360, 640), ctx = screen.getContext(), V = roomViewBelow(g.map), d0 = rendererDiagnostics();
    for (let f = 0; f < 30; f++) { screen.calls.length = 0; render(ctx, g, 360, 640, 1000 + f * 16);
      const copies = screen.calls.filter((c) => c[0] === 'drawImage' && c[1]?.calls && c[4] === V.W && c[5] === V.H && c[1].calls.some((q) => q[0] === 'fillRect' && Object.values(ROOM_VIEW.colors).includes(q[1])));
      assert.equal(copies.length, 1, 'one copy of the view a frame'); }
    const d1 = rendererDiagnostics(); assert.equal(d1.roomViewDraws - (d0.roomViewDraws || 0), 30); assert.ok(d1.roomViewBuilds - (d0.roomViewBuilds || 0) <= 1, 'standing still: built once');
    const F = labFogOf(g.map), img = screen.calls.find((c) => c[0] === 'drawImage' && c[4] === V.W && c[1].calls.some((q) => q[1] === ROOM_VIEW.colors[2]))[1], fills = img.calls.filter((c) => c[0] === 'fillRect');
    const inSight = [...V.codes.keys()].filter((k) => V.codes[k] && F.sight[k]).length; assert.ok(inSight > 0 && inSight < V.n, `${inSight} of ${V.n} void tiles in sight`);
    assert.equal(fills.length, inSight, 'only the void tiles in sight are painted'); assert.ok(fills.every((c) => F.sight[c[3] * V.W + c[2]]));
    assert.ok(fills.some((c) => c[1] === ROOM_VIEW.colors[2]), 'the lava below shows');
    // Close View: the ground texture it captures leaves the view out, and the frame draws without error
    g.save.closeView = true; const b0 = rendererDiagnostics().roomViewDraws; render(ctx, g, 360, 640, 3000); render(ctx, g, 360, 640, 3016); assert.ok(rendererDiagnostics().roomViewDraws - b0 <= 2);
  } finally { globalThis.OffscreenCanvas = prior; }
  // without an offscreen canvas: the void tiles in view and in sight are filled straight onto the screen, bounded
  g.save.closeView = false; let fills = 0; const ctx2 = { save() {}, restore() {}, fillRect() { fills++; }, set fillStyle(v) {}, set globalAlpha(v) {} };
  assert.ok(drawRoomViewBelow(ctx2, g, 32, { l: 0, t: 0, r: g.map.width, b: g.map.height })); const n = rendererDiagnostics().roomViewTiles; assert.equal(n, fills); assert.ok(n > 0 && n <= roomViewBelow(g.map).n, `${n} fills`);
});
