// Tim, 2026-11-25: on the sky hop and the skyway in Close View "the player's body is drawn a few tiles above where their shots
// come from". Reproduced with the real Game and renderer: on a raised sky platform the body stands at the platform's drawn
// height, but a tool shot crossing the gap was drawn at the ground under it (3.6 tiles lower here) and a Quandrix hand too.
// CLOSE_VIEW_SKY_SHOTS: a shot or hand loosed up there keeps the footing it left from; on ordinary ground nothing changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { QUANDRIX_STAFF } from '../src/items.ts';
import { latestHand } from '../src/quandrix-staff.ts';
import { OUTDOOR, outdoorRelief, outdoorSurfaceZ } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW_HOOKS, CLOSE_VIEW_SKY_SHOTS, closeViewHeroFeetZ, closeViewShotSupport, closeViewShowing, closeViewSkyFooting, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { drawRangedEffects } from '../src/combat-visuals.ts';
import { projectileVisualPoint, shotVisualHeight } from '../src/actor-presentation.ts';

const L = OUTDOOR.terrain.level, W = 32, ELEV = 3;
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
const inp = (x: number, y: number, key: string | null = null) => { let k = key; return { state: { x, y }, consume: (a: string) => a === k ? (k = null, true) : false, held: () => false }; };
// An open-world section with a skyway laid on it: two sky platforms `ELEV` levels up with a three-tile gap between, ground at 0.
function skyway({ quandrix = false } = {}) {
  const s: any = freshSave(); s.seed = 'SKYSHOT'; s.maxHp = 100; if (quandrix) s.equipment.primary = { id: 'qs-sky', name: QUANDRIX_STAFF.name, slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [] };
  Object.assign(s.session, { area: 'overworld', rx: 6, ry: -5, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.player.hp = 100;
  for (let y = 9; y < 23; y++) for (let x = 5; x < 27; x++) { const t = g.map.tiles[y * W + x]; for (const k of ['skyPlatform', 'environment', 'canopy', 'slope']) delete t[k]; Object.assign(t, { kind: 'ash', blocked: false, elev: 0 }); }
  for (let y = 14; y < 18; y++) for (const x of [8, 9, 10, 11, 15, 16, 17, 18]) Object.assign(g.map.tiles[y * W + x], { kind: 'skyPlatform', elev: ELEV, skyPlatform: true });
  g.map.objects = (g.map.objects || []).filter((o: any) => !(o.x >= 4 && o.x < 28 && o.y >= 8 && o.y < 24));
  g.save.overworldCloseView = true; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: false };
  const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
  const frame = (x = 0, y = 0, key: string | null = null) => { T += 16; g.update(.016, inp(x, y, key), T); render(screen, g, 390, 844, T); };
  return { g, frame };
}
const drawn = (g: any, p: any) => projectileVisualPoint(p, closeViewShotSupport(g, p, p.x, p.y)).z;

test('a tool shot loosed on a sky platform crosses the gap at the body\'s height, not the ground\'s far below', () => withGPU(() => {
  const { g, frame } = skyway(); Object.assign(g.player, { x: 9.5, y: 15.25, facing: 'right', invulnerableUntil: 1e15 }); g.save.lastAim = { x: 1, y: 0 };
  for (let i = 0; i < 60; i++) frame(); assert.equal(closeViewShowing(g), true);
  const R = outdoorRelief(g.map), feet = closeViewHeroFeetZ(); assert.ok(Math.abs(feet - ELEV * L) < .05, `the body stands on the platform (${feet})`);
  assert.ok(Math.abs(closeViewSkyFooting(g) - feet) < .05, 'the skyway footing is the body\'s');
  frame(1, 0, 'tool'); const shot = g.projectiles.find((p: any) => !p.hostile); assert.ok(shot, 'a shot');
  let over = 0;
  for (let i = 0; i < 40 && !shot.dead; i++) { frame(); const ground = outdoorSurfaceZ(R, shot.x, shot.y), z = drawn(g, shot);
    assert.ok(Math.abs(z - (feet + shotVisualHeight(shot))) < .06, `the shot rides the platform's height at x ${shot.x.toFixed(2)} (${z.toFixed(2)})`);
    if (ground < feet - 1) over++; }
  assert.ok(over > 0, 'it crossed the gap, where the ground is far below');
}));

test('a shot loosed mid sky hop over the gap leaves from the hop\'s height; the body, the shot and its strike agree', () => withGPU(() => {
  const { g, frame } = skyway(); Object.assign(g.player, { x: 10.6, y: 15.25, facing: 'right', invulnerableUntil: 1e15 }); g.save.lastAim = { x: 1, y: 0 };
  for (let i = 0; i < 40; i++) frame();
  frame(1, 0, 'jump'); for (let i = 0; i < 10; i++) frame(1, 0);
  assert.ok(g.skyAir != null, 'a sky hop holds its height'); const R = outdoorRelief(g.map);
  frame(1, 0, 'tool'); const shot = g.projectiles.find((p: any) => !p.hostile); assert.ok(shot, 'a shot');
  frame(1, 0); const feet = closeViewHeroFeetZ(), z = drawn(g, shot), ground = outdoorSurfaceZ(R, shot.x, shot.y);
  assert.ok(ground < ELEV * L - 1, 'over the gap');
  assert.ok(z - shotVisualHeight(shot) >= ELEV * L - .05, `the shot keeps the platform's footing (${z.toFixed(2)})`);
  assert.ok(Math.abs(z - shotVisualHeight(shot) - feet) < 1.2, `and stays with the body (feet ${feet.toFixed(2)}, the hop's arc only between)`);
}));

test('a Quandrix hand cast on a sky platform drifts over the gap at the platform\'s height', () => withGPU(() => {
  const { g, frame } = skyway({ quandrix: true }); Object.assign(g.player, { x: 10.2, y: 15.25, facing: 'right', invulnerableUntil: 1e15 }); g.save.lastAim = { x: 1, y: 0 };
  const layer = (c: any, w: number, h: number, shots: any) => drawRangedEffects(c, g, w, h, shots); CLOSE_VIEW_HOOKS.groundLayers.push(layer); // the game's own floor layer (main.ts), which hands the hands over
  try {
    for (let i = 0; i < 40; i++) frame(); const feet = closeViewHeroFeetZ();
    frame(1, 0, 'attack'); const h = latestHand(g); assert.ok(h, 'a hand');
    for (let i = 0; i < 40 && h.on; i++) frame(); const R = outdoorRelief(g.map);
    assert.ok(outdoorSurfaceZ(R, h.x, h.y) < feet - 1, `the hand is over the gap (${h.x.toFixed(2)})`);
    assert.ok(Math.abs(closeViewShotSupport(g, h, h.x, h.y, h.seq) - feet) < .05, 'drawn from the platform\'s height');
  } finally { CLOSE_VIEW_HOOKS.groundLayers.splice(CLOSE_VIEW_HOOKS.groundLayers.indexOf(layer), 1); }
}));

test('on ordinary ground (and for foes\' shots) the support is the ground, as before; the record is bounded and presentation only', () => withGPU(() => {
  const { g, frame } = skyway(); Object.assign(g.player, { x: 21.5, y: 15.25, facing: 'left', invulnerableUntil: 1e15 }); g.save.lastAim = { x: -1, y: 0 };
  for (let i = 0; i < 40; i++) frame(); assert.ok(Number.isNaN(closeViewSkyFooting(g)), 'no skyway footing on the ground');
  frame(-1, 0, 'tool'); const shot = g.projectiles.find((p: any) => !p.hostile), R = outdoorRelief(g.map);
  for (let i = 0; i < 30 && !shot.dead; i++) { frame(); assert.equal(closeViewShotSupport(g, shot, shot.x, shot.y), outdoorSurfaceZ(R, shot.x, shot.y), 'the ground under it (it climbs the platform as before)'); }
  const foe = { hostile: true, x: 9.5, y: 15.5, age: 0 }; assert.equal(closeViewShotSupport(g, foe, 13, 15.5), outdoorSurfaceZ(R, 13, 15.5), 'a foe\'s shot is untouched');
  const before = JSON.stringify({ x: shot.x, y: shot.y, dx: shot.dx, dy: shot.dy, age: shot.age }); closeViewShotSupport(g, shot, shot.x, shot.y);
  assert.equal(JSON.stringify({ x: shot.x, y: shot.y, dx: shot.dx, dy: shot.dy, age: shot.age }), before, 'nothing in the game is written');
  assert.ok(CLOSE_VIEW_SKY_SHOTS.launchAge > 0 && CLOSE_VIEW_SKY_SHOTS.near > 0 && Object.isFrozen(CLOSE_VIEW_SKY_SHOTS));
}));
