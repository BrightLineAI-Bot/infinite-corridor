// Tim (2026-11-27): Close View everywhere (the overworld, towns, buildings, keeps, castles, compounds and their rooms) except the
// dungeons you find in the world, which are always Standard View. One switch: save.closeView and save.overworldCloseView are read
// as one (close-view.ts closeViewOn), so a journey saved with either on (Tim's: indoor off, overworld on) has Close View indoors
// too. CLOSE_VIEW_PLACES version 2 refuses crossings, the Deep, labyrinths and dive sites; the camera changes at their doors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { deepDungeonId } from '../src/world.ts';
import { deepIdFor, deepShaft } from '../src/the-deep.ts';
import { OCULUS_HOOKS, oculusAvailable, pressOculusButton } from '../src/oculus.ts';

const W = 475, H = 661; // Tim's screen in CSS px
const proxy = (o: any) => new Proxy(o, { get: (t: any, k: any) => k in t ? t[k] : () => {}, set: (t: any, k: any, v: any) => { t[k] = v; return true; } });
const ctx2d = () => proxy({ canvas: null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) });
class StubGL {
  constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  getError() { return (this as any).NO_ERROR; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; }
  createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; }
}
// The GPU path, as on the phone. frame(g) draws one frame and says which camera it chose: 'C' Close View, 's' Standard View.
function withGPU(run: (frame: (g: any) => string) => void) {
  const prev = (globalThis as any).WebGL2RenderingContext; let made = 0, now = 500000; const ground = ctx2d();
  (globalThis as any).WebGL2RenderingContext = StubGL; CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); CV.resetCloseViewCamera();
  CV.setCloseViewCanvasFactory(() => { if (++made === 1) return { width: W, height: H, getContext: () => ground }; return { width: W, height: H, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? new StubGL() : ctx2d() }; });
  const screen = proxy({ canvas: { width: W, height: H }, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) });
  const frame = (g: any) => { now += 16; render(screen, g, W, H, now); const close = CV.closeViewBlend().mode === 'close'; assert.equal(CV.closeViewShowing(g), close && CV.closeViewCamera().drawn, 'what is shown is what was chosen'); return close ? 'C' : 's'; };
  try { run(frame); }
  finally { CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
const switches = (seq: string) => { let n = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) n++; return n; };
const tim = (s: any) => { s.closeView = false; s.overworldCloseView = true; s.closeViewPreset = 'close'; s.closeViewZoom = -.72; return s; }; // Tim's switches and camera
// The walkable tiles of a floor, nearest the Wayfarer first (a bounded flood: no more than `max`).
function walk(g: any, max = 160) {
  const m = g.map, w = m.width, h = Math.floor(m.tiles.length / w), sx = Math.floor(g.player.x + .5), sy = Math.floor(g.player.y + .75), seen = new Set([sy * w + sx]), out: number[][] = [], q = [[sx, sy]];
  while (q.length && out.length < max) { const [x, y] = q.shift()!; out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, i = Y * w + X; if (X < 1 || Y < 1 || X >= w - 1 || Y >= h - 1 || seen.has(i)) continue; seen.add(i); const t = m.tiles[i]; if (t && !t.blocked) q.push([X, Y]); } }
  return out;
}
// Walks the floor tile by tile (the camera's settle and dwell see a walk, not a teleport), returning the cameras chosen.
function walkFloor(g: any, frame: (g: any) => string) {
  let seq = ''; for (let i = 0; i < 20; i++) seq += frame(g);
  for (const [x, y] of walk(g)) { g.player.x = x; g.player.y = y; for (let k = 0; k < 3; k++) seq += frame(g); }
  return seq;
}

test('one switch: either save field turns Close View on everywhere allowed; Tim\'s old save (indoor off) gains interiors, additively at schema 14', () => {
  assert.equal(CV.closeViewOn(freshSave()), false, 'a new journey: off');
  const raw: any = tim({ ...freshSave(), seed: 'EVERY-1', futureField: { keep: 7 } }), m: any = migrateSave(JSON.parse(JSON.stringify(raw)));
  assert.equal(m.version, 14); assert.equal(m.closeView, false); assert.equal(m.overworldCloseView, true, 'no field is rewritten'); assert.deepEqual(m.futureField, { keep: 7 }, 'unknown fields kept');
  assert.equal(CV.closeViewOn(m), true);
  const tiles = Array.from({ length: 144 }, (_, i) => ({ x: i % 12, y: Math.floor(i / 12), kind: 'flagFloor', blocked: i % 12 === 0 || i % 12 === 11 || i < 12 || i >= 132 }));
  const keep = { area: 'dungeon', map: { width: 12, height: 12, tiles, building: { style: 'keep', base: 'k', floor: 0 } }, player: { x: 5, y: 5 }, save: m };
  assert.equal(CV.closeViewApplies(keep), true, 'under a keep\'s roof with the indoor switch off: Close View');
  for (const b of [{ style: 'keep', castle: true }, { style: 'keep', compound: true }, { style: 'hive' }, { style: 'apartment' }, { pentagon: true }])
    assert.equal(CV.closeViewApplies({ ...keep, map: { ...keep.map, building: { ...b, base: 'b', floor: 0 } } }), true, JSON.stringify(b));
  const indoorOnly: any = migrateSave(JSON.parse(JSON.stringify({ ...freshSave(), closeView: true, overworldCloseView: false })));
  const out = { area: 'overworld', map: { width: 32, height: 32, tiles: Array.from({ length: 1024 }, () => ({ kind: 'grass' })) }, player: { x: 5, y: 5 }, save: indoorOnly };
  assert.equal(CV.closeViewApplies(out), true, 'an indoor-only save: Close View outside too');
  assert.equal(CV.closeViewApplies({ ...out, save: { closeView: false, overworldCloseView: false } }), false, 'both off: off');
});

test('the dungeons of the world are exactly crossings, the Deep, labyrinths and dive sites; everything else allows Close View', () => {
  const P = CV.CLOSE_VIEW_PLACES; assert.equal(P.version, 2); assert.ok(Object.isFrozen(P.allowed));
  assert.deepEqual(Object.keys(P.allowed).filter((k) => !P.allowed[k]).sort(), ['crossing', 'cube', 'deep', 'underwater']);
  assert.deepEqual(Object.keys(P.allowed).filter((k) => P.allowed[k]).sort(), ['arcology', 'hive', 'keep', 'lab', 'overworld', 'pentagon', 'seedRealm', 'sky', 'stillworks']);
  assert.equal(CV.CLOSE_VIEW_HOOKS.places, null, 'no override in play');
  // a real labyrinth floor (the Cube lab's) and a real floor of the Deep: Standard View with Close View on
  const cube: any = createLabFixture({ lab: 'close-view', scenario: 'cube-doors', now: 1000 }).game; tim(cube.save);
  assert.ok(cube.map.building?.labyrinth); assert.equal(CV.closeViewPlace(cube), 'cube'); assert.equal(CV.closeViewApplies(cube), false); assert.equal(CV.closeViewWanted(cube), false);
  assert.equal(cube.closeViewActionEligible(), false, 'no Close View action timing in a labyrinth');
  const s: any = tim(freshSave()); s.seed = 'DEEP-885'; const id = deepIdFor(s.seed, 9, 3); deepShaft(s, id).floor = 1;
  Object.assign(s.session, { area: 'overworld', rx: 9, ry: 3, x: 16, y: 16 }); Object.assign(s.position, { area: 'overworld', rx: 9, ry: 3, x: 16, y: 16 });
  const g: any = new Game(s, 100000); g.installSystems(); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 9, ry: 3, x: 16, y: 16 }; g.loadArea('dungeon', false);
  assert.ok(g.map.deepFloor > 0); assert.equal(CV.closeViewPlace(g), 'deep'); assert.equal(CV.closeViewApplies(g), false);
  OCULUS_HOOKS.gpu = () => true;
  try { assert.deepEqual(oculusAvailable(g), { ok: false, why: P.occluded }); assert.equal(pressOculusButton(g, 200000, () => true), false); assert.equal(CV.closeViewOn(s), true, 'the setting is kept for the way out'); }
  finally { OCULUS_HOOKS.gpu = null; }
});

test('Close View holds through a great building\'s floor and a keep\'s, walked tile by tile with Tim\'s switches', () => withGPU((frame) => {
  for (const sc of ['building', 'keep', 'lived-in']) {
    const g: any = createLabFixture({ lab: 'close-view', scenario: sc, now: 1000 }).game; tim(g.save); g.enemies = []; g.presentation = { effectiveQuality: 'low' };
    assert.equal(CV.closeViewPlace(g), 'keep', sc);
    const seq = walkFloor(g, frame); assert.ok(seq.length > 200, `${sc}: walked`);
    assert.equal(seq.replace(/^s+/, '').includes('s'), false, `${sc}: Close View throughout (${switches(seq)} switches)`);
  }
}));

test('a dungeon is Standard View throughout, with one switch at its door each way, and Close View returns on the overworld', () => withGPU((frame) => {
  const s: any = tim(freshSave()); s.seed = 'DEEP-885'; const g: any = new Game(s, 100000); g.installSystems(); g.presentation = { effectiveQuality: 'low' }; g.enemies = [];
  let seq = ''; for (let i = 0; i < 30; i++) seq += frame(g); assert.equal(seq.at(-1), 'C', 'the overworld: Close View');
  const back = { rx: g.rx, ry: g.ry, x: g.player.x, y: g.player.y }; g.message = '';
  s.session.activeDungeonId = deepDungeonId(s.seed); s.session.dungeonReturn = { ...back }; g.loadArea('dungeon', false); g.enemies = [];
  assert.equal(CV.closeViewPlace(g), 'crossing', 'the Threefold Deep'); assert.equal(String(g.message).split(CV.CLOSE_VIEW_PLACES.occluded).length - 1, 1, 'said once at the door');
  const inside = walkFloor(g, frame); seq += inside;
  assert.equal(inside.includes('C'), false, `Standard View throughout the dungeon (${inside.length} frames)`);
  g.loadArea('overworld', false); g.enemies = []; for (let i = 0; i < 40; i++) seq += frame(g);
  assert.equal(seq.at(-1), 'C', 'Close View again outside'); assert.equal(switches(seq), 2, 'in and out: one switch each');
  assert.equal(CV.closeViewOn(s), true); assert.equal(s.closeView, false, 'the save is untouched'); assert.equal(s.overworldCloseView, true);
}));

test('Options has one Close View row that writes both fields; the Oculus turns both off', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), camera = main.slice(main.indexOf('if(category==="Camera")'), main.indexOf('if(category==="Controls")'));
  assert.equal((camera.match(/settingRow\("Close View \(this journey\)"/g) || []).length, 1);
  assert.doesNotMatch(camera, /settingRow\("Overworld Close View"|third-person camera indoors/, 'the second switch is gone');
  assert.match(camera, /cv\.checked=closeViewOn\(save\)/); assert.match(camera, /save\.closeView=save\.overworldCloseView=cv\.checked/);
  const tiles = Array.from({ length: 144 }, (_, i) => ({ x: i % 12, y: Math.floor(i / 12), kind: 'floor', blocked: i % 12 === 0 || i % 12 === 11 || i < 12 || i >= 132 }));
  const g: any = { area: 'dungeon', map: { width: 12, height: 12, tiles, building: { style: 'keep', base: 'k', floor: 0 } }, player: { x: 5, y: 5, facing: 'down' }, save: { closeView: false, overworldCloseView: true }, message: '' };
  OCULUS_HOOKS.gpu = () => true;
  try { assert.equal(oculusAvailable(g).to, 'top', 'Tim\'s save indoors: Close View shows, so the Oculus leads out of it');
    assert.equal(pressOculusButton(g, 100, () => true), true); assert.deepEqual(g.save, { closeView: false, overworldCloseView: false }); assert.equal(CV.closeViewApplies(g), false); }
  finally { OCULUS_HOOKS.gpu = null; }
});
