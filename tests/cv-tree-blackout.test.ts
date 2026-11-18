// CV_TREE_BLACKOUT (Tim, r975, Android phone on the low tier: "When you enter the Oculus in the same square as a great tree,
// then exit the Oculus... the top half of the screen of the tree doesn't load in. I was able to climb up there, it just didn't
// load. It was a black screen"). The standard view's cached ground image keeps a band above row 0 (`top`) that lifted tiles
// are drawn into. Close View's leave zoom changes the canvas transform, and a rebuild for a new scale alone measured no band,
// so the great tree's trunk, crown and upper branches were cut off the image until something else rebuilt it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render, rendererDiagnostics } from '../src/renderer.ts';
import { closeViewLeaving } from '../src/close-view.ts';

// A recording canvas: the root reports the transform scale the test sets (the leave zoom's), every offscreen canvas records
// its last setTransform and the root records each ground blit.
let scale = 1; const made: any[] = [];
class RecCanvas {
  width: number; height: number; ctx: any = null; lastSet: number[] | null = null; blits: any[] = [];
  constructor(w: number, h: number) { this.width = w; this.height = h; made.push(this); }
  getContext() { return this.ctx ||= recContext(this); }
}
function recContext(canvas: RecCanvas) {
  const state: Record<string, unknown> = {};
  const own: Record<string, unknown> = {
    canvas,
    getTransform: () => ({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 }),
    measureText: (t: string) => ({ width: 7 * String(t).length }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => null,
    setTransform: (...a: number[]) => { canvas.lastSet = a; },
    drawImage: (src: any, ...args: number[]) => { if (src instanceof RecCanvas && src.width > 600) canvas.blits.push({ src, args }); },
  };
  return new Proxy(own, { get: (t, p: string) => (p in t ? t[p] : p in state ? state[p] : () => {}), set: (_t, p: string, v) => { state[p] = v; return true; } });
}
function greatTreeGame() {
  // A section with a great tree (the seed and section the great-tree climb tests use).
  const s = freshSave(); s.seed = 'CORRIDOR-MUHAPQHU'; const g: any = new Game(s, 0); g.rx = 41; g.ry = 62; g.loadArea('overworld'); g.enemies = [];
  assert.ok(g.map.canopy?.top > 20, 'the section has a great tree');
  const c = g.map.canopy; g.player.x = c.x0 + c.size + 1; g.player.y = Math.max(1, c.y0 - 2); // beside the trunk, north of it
  g.presentation = { effectiveQuality: 'low', weather: false, reduceMotion: false };
  return g;
}
function withCanvas<T>(fn: (root: RecCanvas) => T): T {
  const prior = (globalThis as any).OffscreenCanvas; (globalThis as any).OffscreenCanvas = RecCanvas;
  try { return fn(new RecCanvas(475, 661)); } finally { if (prior === undefined) delete (globalThis as any).OffscreenCanvas; else (globalThis as any).OffscreenCanvas = prior; }
}
const frame = (root: RecCanvas, g: any, k: number, now: number) => { scale = k; root.blits.length = 0; render(root.getContext(), g, 475, 661, now); return root.blits.at(-1); };

test('cv-tree-blackout: a ground image rebuilt for a new scale alone keeps the headroom its lifted tiles need', () => withCanvas((root) => {
  const g = greatTreeGame();
  const first = frame(root, g, 1, 1000); assert.ok(first, 'the ground is drawn from its cached image');
  const image = first.src, fresh = { w: image.width, h: image.height, set: image.lastSet.slice() };
  assert.ok(fresh.set[5] > 0, 'the fresh image is translated down by the band above row 0');
  assert.ok(fresh.h > fresh.w, 'and is taller than the square section by that band');
  const builds = rendererDiagnostics().groundBuilds;
  // Close View's leave zoom (any transform change does the same: a rotated phone, a new quality tier)
  for (const k of [1.7, 1.35, 1.05]) {
    const zoomed = frame(root, g, k, 1000 + k * 100), set = zoomed.src.lastSet;
    assert.ok(Math.abs(set[5] / set[3] - fresh.set[5]) < 1e-6, `at scale ${k} the band is the same height in tile pixels`);
  }
  const back = frame(root, g, 1, 2000);
  assert.ok(rendererDiagnostics().groundBuilds > builds, 'a new scale did rebuild the image');
  assert.deepEqual({ w: back.src.width, h: back.src.height, set: back.src.lastSet }, fresh, 'after the round trip the image matches a fresh build');
  // and the blit still places canvas row 0 above the section, at -top: the trunk's top and the crown are on the screen again
  const top = fresh.set[5], [sx, sy, sw, sh, dx, dy] = back.args;
  assert.ok(sh > 0 && sw > 0 && dx >= 0, 'the blit copies a region');
  assert.equal(dy, sy - top, 'the blit draws the band above row 0');
}));

test('cv-tree-blackout: the scale is otherwise unchanged by the fix (no rebuild while nothing changes)', () => withCanvas((root) => {
  const g = greatTreeGame();
  frame(root, g, 1, 1000); const builds = rendererDiagnostics().groundBuilds;
  for (let i = 0; i < 5; i++) frame(root, g, 1, 1100 + i * 16);
  assert.equal(rendererDiagnostics().groundBuilds, builds, 'the same view reuses its ground image');
  assert.equal(closeViewLeaving(), false, 'outside Close View\'s leave blend the image follows the scale');
}));
