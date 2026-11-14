// A beast in your section is always in sight in Close View (Tim, 2026-11-14: "the world bosses should always be visible whenever
// they're in the same section as you... I was fighting the blob and it kept popping in and out of existence (maybe safe mode)").
// The Close View had kept every actor to the floor it draws (the tier's radius plus two tiles; safe mode forces the low tier,
// about 8.5 tiles): a beast past it was not captured, not drawn and, on its way out, thinned and fogged. Now a section beast
// (close-view-beasts.ts CLOSE_VIEW_BEAST_SIGHT) is captured and drawn anywhere in the section, solid, never more than
// `fog` fogged, with a cheaper mesh far off, ahead of every other body for the beast slot, and its wind-up ring drawn with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { render } from '../src/renderer.ts';
import { tuneWorldBeast } from '../src/world-beasts.ts';
import { CLOSE_VIEW_HOOKS, closeViewBeasts, closeViewCamera, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { CLOSE_VIEW_BEAST_SIGHT, closeViewSectionBeast, BEAST_SLOT } from '../src/close-view-beasts.ts';
import { GLB, DECAL_FLOATS, resetCloseViewGL } from '../src/close-view-gl.ts';
import { beastFragmentBody } from '../src/close-view-beast-gl.ts';
import { blobMesh } from '../src/close-view-beast-blob.ts';

class MockGL {
  program: any = null;
  constructor() { let n = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, n++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } createShader() { return {}; } createProgram() { return { shaders: [] }; } shaderSource(s: any, t: any) { s.text = t; } attachShader(p: any, s: any) { p.shaders.push(s); } useProgram(p: any) { this.program = p; }
  createBuffer() { return {}; } createTexture() { return {}; } createVertexArray() { return {}; } getShaderParameter() { return true; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } getExtension() { return null; }
}
const ctx2d = () => new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new MockGL(); (globalThis as any).WebGL2RenderingContext = MockGL;
  setCloseViewCanvasFactory(() => ({ width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }));
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} };
// The open world in Close View on the low tier (safe mode forces it), the Wayfarer mid-section, nothing else about.
function scene(safeMode: boolean) {
  const s: any = freshSave(); s.seed = 'BEAST-SIGHT'; s.maxHp = 100; s.level = 20;
  Object.assign(s.session, { area: 'overworld', rx: 3, ry: 2, x: 16, y: 16 }); s.overworldCloseView = true; s.closeViewPreset = 'standard'; s.closeViewAutoFollow = false;
  const g: any = new Game(s, 0); g.paused = false; s.session.paused = false; g.enemies = []; g.projectiles = []; g.player.hp = s.maxHp;
  for (const t of g.map.tiles) { t.blocked = false; t.environment = false; t.structure = null; }
  g.map.objects = [];
  g.presentation = { effectiveQuality: 'low', safeMode, reduceMotion: safeMode };
  return g;
}
// Frames with the world held still (only the camera settles); the foes are placed fresh each frame where `at` says.
function frames(g: any, n: number, place: () => void) {
  const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
  for (let i = 0; i < n; i++) { T += 16; place(); g.update(.016, still, T); place(); render(screen, g, 390, 844, T); }
}
// A point `d` tiles straight ahead of the camera from the Wayfarer, in tile coordinates (an actor stands at x + .5, y + .82).
function ahead(g: any, d: number, side = 0) { const c = closeViewCamera(), fx = Math.cos(c.yaw), fy = Math.sin(c.yaw), p = g.player;
  return { x: p.x + fx * d - fy * side, y: p.y + fy * d + fx * side }; }
const blob = (g: any, x: number, y: number) => { const e = tuneWorldBeast(createCombatant('morphingBlob', x, y, true, []), g.save, 'morphingBlob'); e.id = 'blob'; return e; };
const pin = (e: any, at: any) => Object.assign(e, { x: at.x, y: at.y, cooldown: 99, telegraph: e.telegraph, aggro: false, speedMultiplier: 1e-6, hitStun: 1 });
const drawn = (e: any) => closeViewBeasts().items.slice(0, closeViewBeasts().count).find((f: any) => f.mesh === blobMesh(f.tier));
// Wind-up rings (decal kind 1) the frame laid round a point.
function rings(x: number, y: number) { let n = 0; const D = GLB.decal;
  for (let v = 0; v < GLB.nDecal; v++) { const b = v * DECAL_FLOATS; if (D[b + 5] === 1 && Math.hypot(D[b] - x, D[b + 1] - y) < 3) n++; } return n; }

test('the table and who counts: world beasts, the Questing Beast and the Stalker itself, never its copies', () => {
  assert.ok(Object.isFrozen(CLOSE_VIEW_BEAST_SIGHT));
  assert.ok(CLOSE_VIEW_BEAST_SIGHT.pad >= 32, 'the capture pad spans a whole section');
  assert.ok(CLOSE_VIEW_BEAST_SIGHT.fog > 0 && CLOSE_VIEW_BEAST_SIGHT.fog < .5, 'a little air, never fogged out');
  assert.equal(closeViewSectionBeast({ worldBeast: 'morphingBlob' }), true);
  assert.equal(closeViewSectionBeast({ questingBeast: true }), true);
  assert.equal(closeViewSectionBeast({ stalker: true }), true);
  assert.equal(closeViewSectionBeast({ stalker: true, stalkerKin: true }), false);
  assert.equal(closeViewSectionBeast({ stalker: true, stalkerDecoy: true }), false);
  assert.equal(closeViewSectionBeast({ kind: 'briarStag' }), false, 'a roster kind that is not hunting you is an ordinary body');
  assert.equal(closeViewSectionBeast({ worldBeast: 'morphingBlob', dead: true }), false);
  assert.match(beastFragmentBody({ floor: .2, rimWarm: [0, 0, 0], rimCool: [0, 0, 0], glow: 1, fogLate: 1, emitFog: .5 }), /min\(f \* f \* \(3\.0 - 2\.0 \* f\), u_fogCap\)/, 'the body shader caps its fog');
});

for (const safeMode of [true, false]) test(`a world beast at the far side of the section stays drawn on the low tier (safe mode ${safeMode ? 'on' : 'off'})`, () => withGPU(() => {
  const g = scene(safeMode); frames(g, 6, () => {});
  assert.equal(closeViewShowing(g), true, 'Close View draws the open world');
  const at = ahead(g, 15), e = blob(g, at.x, at.y); g.enemies = [e];
  e.telegraph = .4; // winding up
  frames(g, 4, () => pin(e, at));
  assert.ok(Math.hypot(e.x - g.player.x, e.y - g.player.y) > 14, 'far beyond the low tier\'s floor (about 8.5 tiles)');
  const f = drawn(e); assert.ok(f, 'its body is drawn'); assert.equal(f.alpha, 1, 'solid, not distance-faded');
  assert.equal(f.fogCap, CLOSE_VIEW_BEAST_SIGHT.fog, 'fogged no more than the table allows');
  assert.equal(f.tier, 'low', 'far off: the low-tier mesh, never nothing');
  assert.ok(rings(e.x + .5, e.y + .82) > 0, 'its wind-up ring is drawn with it');
  // and every frame of a walk across the far half of the section: no pop-out
  for (let d = 9; d <= 21; d += 1.5) { const q = ahead(g, d, 2); frames(g, 2, () => pin(e, q)); assert.ok(drawn(e), `drawn at ${d} tiles`); }
}));

test('a section beast outranks nearer ordinary bodies for the beast slot when the slot is full', () => withGPU(() => {
  const g = scene(true); frames(g, 6, () => {});
  const far = ahead(g, 12), e = blob(g, far.x, far.y);
  // nearer, a roster kind that is not a section beast (a pen's stag, a far realm's moth): enough to fill the slot nearest first
  const near = Array.from({ length: BEAST_SLOT.maxBeasts + 1 }, (_, i) => Object.assign(createCombatant('morphingBlob', 0, 0, true, []), { id: `ordinary-${i}`, hp: 500, maxHp: 500 }));
  const spots = near.map((_, i) => ahead(g, 3 + i, i % 2 ? 1.5 : -1.5));
  g.enemies = [...near, e];
  frames(g, 4, () => { pin(e, far); near.forEach((q, i) => pin(q, spots[i])); });
  const B = closeViewBeasts(); assert.equal(B.count, BEAST_SLOT.maxBeasts, 'the slot is full');
  const tracks = [...B.tracks.keys()];
  assert.ok(tracks.includes(e) && drawn(e), 'the section beast holds a slot');
  assert.ok(B.items.slice(0, B.count).some((f: any) => f.fogCap === CLOSE_VIEW_BEAST_SIGHT.fog), 'and it is the kept one');
  assert.equal(B.items.slice(0, B.count).filter((f: any) => f.fogCap === 1).length, BEAST_SLOT.maxBeasts - 1, 'the rest go to the nearest ordinary bodies');
}));
