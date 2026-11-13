// Look at everything outdoors (Tim, 2026-11-13): the tap in Look mode on the open world's real draws and solids. Harness as
// close-view-camera-occlusion.test.ts (the GPU stubbed; the real renderer).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { OUTDOOR, outdoorScene, outdoorRoofTopAt } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewCamera, closeViewPan, closeViewShowing, closeViewProject, closeViewSolidTops, resetCloseViewCamera, setCloseViewCanvasFactory,
  closeViewLookSet, closeViewLookActive, closeViewLookTap, closeViewLookState, closeViewLookZoomTo } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx2d() }; return { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
// The overworld test tile (32 x 32): its blocked tiles are low rocks (about a tile tall); rows 22-30 open level ground; the east
// edge open at rows 8-10. The camera turned to look along `yaw`; frames at 60 per second.
function scene(x: number, y: number, yaw: number, setup?: (g: any) => void) {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: true }; g.enemies = [];
  setup?.(g); g.player.x = x; g.player.y = y; let T0 = 50000; resetCloseViewCamera(); render(screen, g, 390, 844, T0 += 16); assert.equal(closeViewShowing(g), true);
  const turn = (to: number) => closeViewPan(wrap(to - closeViewCamera().yaw) / CLOSE_VIEW.crescent.yaw, -closeViewCamera().pitchUser / CLOSE_VIEW.crescent.pitch, T0 - 10000);
  turn(yaw);
  const frame = (n = 1) => { for (let i = 0; i < n; i++) render(screen, g, 390, 844, T0 += 16); return closeViewCamera(); };
  frame(200);
  return { g, frame, turn };
}


// The open world through the real renderer (the GPU stubbed): the tap meets real draws (trees, a dragon) and the outdoor solids
// (the test tile's rocks, a hamlet's house) that are no draw at all.
function on(s: any) { closeViewLookSet(s.g, true); s.frame(2); assert.equal(closeViewLookActive(), true); }
function tapAt(s: any, x: number, y: number, z: number) { const q = closeViewProject(x, y, z); assert.ok(q && q.sx > 0 && q.sx < 390 && q.sy > 0 && q.sy < 844, `on screen (${JSON.stringify(q)})`); return closeViewLookTap(s.g, 390, 844, q!.sx, q!.sy); }

test('outdoors: a real tree and a real dragon under a tap; the dragon framed by its size', () => withGPU(() => {
  const s = scene(10, 28.6, Math.PI);
  s.g.map.objects.push({ kind: 'tree', id: 'look-oak', x: 6, y: 27.4, state: 'standing', vegetationForm: 'canopy', scale: 1.2 }); s.frame(2); on(s);
  let r: any = tapAt(s, 6.5, 28.12, 1.6); assert.equal(r.subject, 'tree'); assert.equal(r.label, 'Tree');
  s.frame(2); assert.ok(closeViewLookState().top > 1.6, `the tree's height (${closeViewLookState().top})`);
  const foe: any = createCombatant('crimsonTyrant', 5, 29.2, true, []); Object.assign(foe, { id: 'look-dragon', hp: 1e6, maxHp: 1e6, aggro: false }); s.g.enemies.push(foe); s.frame(3);
  r = tapAt(s, foe.x + .5, foe.y + .82, 1.5); assert.equal(r.subject, 'creature'); assert.equal(closeViewLookState().key, foe);
  assert.ok(closeViewLookState().size >= 4, `a dragon's size (${closeViewLookState().size})`);
  closeViewLookZoomTo(1); s.frame(160); const st = closeViewLookState(), c = closeViewCamera();
  assert.ok(Math.hypot(c.x - st.focus[0], c.y - st.focus[1]) > 1, 'never pressed against its head');
  assert.ok(st.focus[2] > 2.5, `aimed toward its head (${st.focus[2].toFixed(2)})`);
  closeViewLookSet(s.g, false, true); s.frame(2);
}));

test('outdoors: a tap on a rock (a solid, no draw) frames the solid by its drawn height', () => withGPU(() => {
  const s = scene(6.5, 13.6, Math.PI / 2); on(s);
  const map = s.g.map, w = Number(map.width) || 32, sc: any = outdoorScene(map, true), tops: any = closeViewSolidTops(sc.solids, w, map.tiles.length / w); let solids = 0; assert.ok(tops);
  for (let i = 0; i < map.tiles.length; i++) { const t = map.tiles[i], tx = i % w, ty = Math.floor(i / w); if (!t.blocked || !(tops[i] > .3)) continue; const q = closeViewProject(tx + .5, ty + .5, tops[i] * .6); if (!q || q.sx < 20 || q.sx > 370 || q.sy < 40 || q.sy > 800 || q.depth > 9) continue;
    const r: any = closeViewLookTap(s.g, 390, 844, q.sx, q.sy); if (!r || r.hit !== 'solid') continue; solids++;
    const st = closeViewLookState(); assert.equal(st.subject, 'place'); assert.ok(st.top > .3, 'framed by its height'); assert.ok(r.label.length > 0);
    closeViewLookZoomTo(1); s.frame(60); const c = closeViewCamera(); assert.ok(st.focus.every(Number.isFinite)); assert.ok(c.height > 0);
    closeViewLookZoomTo(0); s.frame(40); if (solids >= 3) break; }
  assert.ok(solids >= 1, 'a rock in view is a subject under the tap');
  closeViewLookSet(s.g, false, true); s.frame(2);
}));

test('outdoors: a tap on a house frames the house (walls and roof), named', () => withGPU(() => {
  const sv = freshSave(); sv.seed = 'CINDER-VERGE-47'; const g: any = new Game(sv, 0); g.rx = -6; g.ry = 0; g.loadArea('overworld', false);
  const hs: any = outdoorScene(g.map, true), roof = hs.houses.roofs.find((q: any) => q.id.includes('hut')); assert.ok(roof, 'a hut');
  const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 };
  g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: true }; g.enemies = [];
  // stand south of the hut, looking north at it
  const cx = (roof.x0 + roof.x1) / 2, cy = roof.y1 + 3.2; let open: any = null;
  for (let d = 0; d < 6 && !open; d++) for (const dx of [0, -1, 1, -2, 2]) { const X = Math.floor(cx + dx), Y = Math.floor(cy + d), t = g.map.tiles[Y * (Number(g.map.width) || 32) + X]; if (t && !t.blocked && !t.buildingId) { open = { x: X, y: Y }; break; } }
  assert.ok(open, 'open ground south of the hut'); g.player.x = open.x; g.player.y = open.y;
  let T0 = 80000; resetCloseViewCamera(); render(screen, g, 390, 844, T0 += 16); assert.equal(closeViewShowing(g), true);
  closeViewPan(wrap(-Math.PI / 2 - closeViewCamera().yaw) / CLOSE_VIEW.crescent.yaw, -closeViewCamera().pitchUser / CLOSE_VIEW.crescent.pitch, T0 - 10000);
  const frame = (n = 1) => { for (let i = 0; i < n; i++) render(screen, g, 390, 844, T0 += 16); };
  frame(120); closeViewLookSet(g, true); frame(2);
  const top = outdoorRoofTopAt(roof, cx, (roof.y0 + roof.y1) / 2), q = closeViewProject(cx, roof.y1 - .2, top * .55); assert.ok(q, 'the hut in view');
  const r: any = closeViewLookTap(g, 390, 844, q!.sx, q!.sy); assert.ok(r); assert.equal(r.hit, "house", JSON.stringify(r));
  const st = closeViewLookState(); assert.equal(st.subject, 'place'); assert.ok(st.top > OUTDOOR.buildings.wall.h, `framed to its roof (${st.top.toFixed(2)})`); assert.ok(['House', 'Shelter'].includes(r.label), r.label);
  closeViewLookZoomTo(.2); frame(80); const lo = closeViewLookState().focus[2]; closeViewLookZoomTo(1); frame(80); assert.ok(closeViewLookState().focus[2] > lo + .3, 'closer pinches go up toward the roof');
  closeViewLookSet(g, false, true); frame(2); resetCloseViewCamera();
}));
