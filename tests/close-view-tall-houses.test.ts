// Close View's taller houses and their roofs (Tim, 2026-11-12, playing the overworld in Close View):
// - "The shacks are a little bit too short... the Wayfarer is just taller than the doors... maybe one point five times as
//   tall... they don't need to increase their physical dimensions left or right, just the vertical dimensions."
//   OUTDOOR.buildings.tall scales the walls, the door lintels and the roofs' rise; every footprint stays where it was.
// - "When you walk up to them, the roofs disappear... we need to make sure that the roofs don't disappear until you get
//   inside of them." A roof stays drawn while the Wayfarer is outside (beside a wall, in the doorway) and fades out over
//   OUTDOOR.buildings.fade.ms once they are inside.
// Presentation only: the map, its tiles and collision are never written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { OUTDOOR, OUTDOOR_FLOATS, outdoorBuildings, outdoorBuildingHeights, outdoorInsideHouse, outdoorScene } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW_HOOKS, closeViewCamera, roofHidden, closeViewRoofOpacity, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

function section(rx: number, ry: number) { const s = freshSave(); s.seed = 'CINDER-VERGE-47'; const g: any = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; }
const HOUSE_SECTIONS = [[-6, 0], [-6, -3], [-5, -1], [-4, -2]];
const B = OUTDOOR.buildings;
// The Wayfarer's drawn height in Close View, read from where the frame sets it (close-view.ts: input.height = a * b).
const HERO_HEIGHT = (() => { const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), m = /input\.height = ([\d.]+) \* ([\d.]+);/.exec(src); assert.ok(m, 'the hero height is set'); return Number(m![1]) * Number(m![2]); })();
const UNSCALED = Object.freeze({ wall: B.wall.h, lintel: B.wall.lintel, pitch: B.pitch, ridge: B.ridge, flat: B.flat });

test('the houses\' vertical extents scale by OUTDOOR.buildings.tall; their footprints do not move', () => {
  assert.ok(B.tall.wall >= 1.4 && B.tall.wall <= 1.6 && B.tall.roof >= 1.4 && B.tall.roof <= 1.6, 'about one and a half times as tall');
  const D = outdoorBuildingHeights();
  assert.ok(Math.abs(D.wall - B.wall.h * B.tall.wall) < 1e-9 && Math.abs(D.pitch - B.pitch * B.tall.roof) < 1e-9 && Math.abs(D.ridge - B.ridge * B.tall.roof) < 1e-9 && Math.abs(D.flat - B.flat * B.tall.roof) < 1e-9);
  assert.ok(D.lintel < D.wall, 'a lintel band stays over each door');
  let houses = 0;
  for (const [rx, ry] of HOUSE_SECTIONS) {
    const g = section(rx, ry), before = JSON.stringify(g.map.tiles), tall = outdoorBuildings(g.map), low = outdoorBuildings(g.map, null, UNSCALED);
    assert.equal(JSON.stringify(g.map.tiles), before, 'the map is untouched');
    assert.equal(tall.verts, low.verts, 'the same vertices'); assert.equal(tall.walls, low.walls); assert.deepEqual(tall.roofs, low.roofs, 'the same roofs and boxes');
    let wallTop = 0, wallTopLow = 0;
    for (let v = 0; v < tall.verts; v++) { const o = v * OUTDOOR_FLOATS;
      assert.equal(tall.data[o], low.data[o], 'x unchanged'); assert.equal(tall.data[o + 1], low.data[o + 1], 'y unchanged');
      if (v < tall.walls) { wallTop = Math.max(wallTop, tall.data[o + 2]); wallTopLow = Math.max(wallTopLow, low.data[o + 2]); } }
    assert.ok(Math.abs(wallTop - D.wall) < 1e-5 && Math.abs(wallTopLow - B.wall.h) < 1e-5, `walls ${wallTopLow} -> ${wallTop}`);
    for (const r of tall.roofs) { let top = 0, topLow = 0; for (let v = r.start; v < r.start + r.count; v++) { top = Math.max(top, tall.data[v * OUTDOOR_FLOATS + 2]); topLow = Math.max(topLow, low.data[v * OUTDOOR_FLOATS + 2]); }
      const riseLow = topLow - B.wall.h, rise = top - D.wall; assert.ok(rise > 0 && riseLow > 0);
      assert.ok(Math.abs(rise / riseLow - B.tall.roof) < .08, `the roof's rise scales (${riseLow.toFixed(3)} -> ${rise.toFixed(3)})`); // the ridge beam's own few hundredths stay
      assert.ok(Math.abs(top / topLow - B.tall.wall) < .08, `the house's whole height scales (${topLow.toFixed(3)} -> ${top.toFixed(3)})`); houses++; }
  }
  assert.ok(houses >= 6, `houses checked (${houses})`);
});

test('a door is taller than the Wayfarer, with room to spare', () => {
  const D = outdoorBuildingHeights();
  assert.ok(HERO_HEIGHT > 1.2 && HERO_HEIGHT < 2, `the Wayfarer stands ${HERO_HEIGHT}`);
  assert.ok(D.lintel >= HERO_HEIGHT * 1.1, `the door's lintel (${D.lintel}) clears the Wayfarer (${HERO_HEIGHT})`);
  assert.ok(B.wall.lintel < HERO_HEIGHT, 'it did not before');
  // the lintel slab really starts at that height over each door
  const g = section(-6, 0), b = outdoorBuildings(g.map), doors = g.map.tiles.filter((t: any) => t?.doorSide && B.structures.test(t.structure)); assert.ok(doors.length > 0);
  for (const t of doors) { let lowest = Infinity;
    for (let v = 0; v < b.walls; v++) { const o = v * OUTDOOR_FLOATS, x = b.data[o], y = b.data[o + 1]; if (x >= t.x - 1e-6 && x <= t.x + 1 + 1e-6 && y >= t.y - 1e-6 && y <= t.y + 1 + 1e-6 && b.data[o + 2] > .01) lowest = Math.min(lowest, b.data[o + 2]); }
    assert.ok(lowest <= D.lintel + 1e-5, 'a lintel over the door'); }
});

// a house tile's footing helpers
function hut() { const g = section(-6, 0), scene: any = outdoorScene(g.map), r = scene.houses.roofs.find((q: any) => q.id.includes('hut')); assert.ok(r, 'a hut');
  const door = g.map.tiles.find((t: any) => t.buildingId === r.id && /Door$/.test(t.structure) && t.doorSide === 'south'); assert.ok(door, 'its south door');
  const inner = g.map.tiles.find((t: any) => t.buildingId === r.id && /Interior/.test(t.structure)); assert.ok(inner, 'an inside tile');
  return { g, scene, r, door, inner }; }

test('the roof stays while the Wayfarer is beside a wall or in the doorway, and is hidden once they are inside', () => {
  const { g, r, door, inner } = hut(), m = g.map, camFar = (x: number, y: number) => [x, r.y1 + 3] as const; // the camera south of the house, outside it
  const check = (px: number, py: number, hidden: boolean, label: string) => { const [cx, cy] = camFar(px, py); assert.equal(roofHidden(m, r, px, py, cx, cy), hidden, label); };
  check(door.x + .5, door.y + 1.3, false, 'just outside the door');
  check(door.x + .5, door.y + .8, false, 'standing in the doorway');
  check(door.x + .5, door.y + 1 - B.fade.doorDepth + .05, false, 'on the threshold');
  check(door.x + .5, door.y + .2, true, 'through the door');
  check(inner.x + .5, inner.y + .5, true, 'inside');
  check(r.x0 - .1, (r.y0 + r.y1) / 2, false, 'against the west wall, outside');
  check((r.x0 + r.x1) / 2, r.y0 - .1, false, 'against the north wall, outside (the camera south of it, the house between)');
  check(r.x1 + .1, (r.y0 + r.y1) / 2, false, 'against the east wall, outside');
  // walking up to its back wall from the north, the camera north of them too: drawn
  assert.equal(roofHidden(m, r, (r.x0 + r.x1) / 2, r.y0 - .2, (r.x0 + r.x1) / 2, r.y0 - 3.7), false, 'walking up to the back wall');
  // the one exception: the camera itself within the walls (leaving the house facing out), else the view is from inside a closed box
  assert.equal(roofHidden(m, r, door.x + .5, door.y + 1.3, inner.x + .5, inner.y + .5), true, 'the camera inside');
  assert.equal(outdoorInsideHouse(m, r.id, inner.x + .5, inner.y + .5), true); assert.equal(outdoorInsideHouse(m, 'elsewhere', inner.x + .5, inner.y + .5), false);
  assert.ok(B.fade.ms > 0 && B.fade.ms <= 600, 'a short fade');
});

// A WebGL2 stand-in that records the solids' draws (the GPU itself is not available here).
class RecordingGL {
  draws: number[][] = []; constructor() { let next = 1; const constants = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, next++); return constants.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; }
  createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } drawArrays(_m: any, first: number, count: number) { this.draws.push([first, count]); }
}
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: (gl: any) => void) {
  const previous = (globalThis as any).WebGL2RenderingContext, gl: any = new RecordingGL(); let made = 0;
  (globalThis as any).WebGL2RenderingContext = RecordingGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx2d() }; return { width: 390, height: 844, addEventListener() {}, getContext: (kind: string) => kind === 'webgl2' ? gl : ctx2d() }; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(gl); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (previous === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = previous; }
}

test('in a GPU frame the roof is drawn whole at the door, fades out inside and back in outside', () => withGPU((gl) => {
  const { g, scene, r, door, inner } = hut(); g.save.overworldCloseView = true; g.presentation = { effectiveQuality: 'balanced', reduceMotion: false }; g.enemies = [];
  const i = scene.houses.roofs.indexOf(r), r0 = scene.solids.housesAt + r.start, r1 = r0 + r.count, total = scene.solids.verts;
  const screen = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 90000;
  const frames = (n: number) => { for (let k = 0; k < n; k++) { gl.draws.length = 0; render(screen, g, 390, 844, (T += 16)); } };
  const covers = () => gl.draws.some((d: number[]) => d[0] < r1 && d[0] + d[1] > r0), whole = () => gl.draws.some((d: number[]) => d[0] <= r0 && d[0] + d[1] >= r1 && d[1] > r.count) /* within a run of the solids */, own = () => gl.draws.some((d: number[]) => d[0] === r0 && d[1] === r.count);
  // in the doorway facing in (feet on the door tile, short of the threshold): every solid in one call, the roof with them
  g.player.x = door.x; g.player.y = door.y; g.player.facing = 'up'; frames(3); assert.equal(closeViewShowing(g), true); assert.ok(closeViewCamera().y > r.y1, 'facing the house, the camera behind them outside it');
  assert.equal(closeViewRoofOpacity(i), 1); assert.ok(gl.draws.some((d: number[]) => d[0] === 0 && d[1] === total), 'the whole buffer in one call');
  // inside: a few frames in, the roof is part way faded and drawn on its own (dithered); after the fade it is left out
  g.player.x = inner.x; g.player.y = inner.y - .2; frames(4); const mid = closeViewRoofOpacity(i);
  assert.ok(mid > 0 && mid < 1, `fading (${mid})`); assert.ok(own() && !whole(), 'drawn on its own while it fades');
  frames(Math.ceil(B.fade.ms / 16) + 2); assert.equal(closeViewRoofOpacity(i), 0); assert.ok(!covers(), 'left out once faded');
  assert.ok(gl.draws.some((d: number[]) => d[0] === 0 && d[1] >= scene.solids.housesAt), 'the rest is still drawn');
  // back out through the door: it fades back in, then is drawn whole
  g.player.x = door.x; g.player.y = door.y + 1; frames(3); const back = closeViewRoofOpacity(i); assert.ok(back > 0 && back < 1, `fading in (${back})`);
  frames(Math.ceil(B.fade.ms / 16) + 2); assert.equal(closeViewRoofOpacity(i), 1); assert.ok(whole(), 'drawn whole again');
  // reduced motion: no fade, at once
  g.presentation.reduceMotion = true; g.player.x = inner.x; g.player.y = inner.y - .2; frames(1); assert.equal(closeViewRoofOpacity(i), 0); assert.ok(!covers());
}));
