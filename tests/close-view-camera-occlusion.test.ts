// Close View camera and occlusion (the release 926 play-through, 2026-11-13; presentation only):
// 1. the roof vanished under a Wayfarer jumping, drone-lifting or plunging from it (only the deck stood on was kept);
// 2. nothing between the camera and the Wayfarer faded but billboards (trees, rocks, terrain, big bodies hid the hero);
// 3. on high or narrow ground the camera went close and nearly straight down (CLOSE_VIEW.camera.limits);
// 4. at a section's edge the boom fell to about a tile (border rocks beside the crossing were walls to it);
// and (approved the same day) big threats are kept in frame (CLOSE_VIEW.camera.threat).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { createCombatant } from '../src/combat.ts';
import { OUTDOOR, outdoorScene, outdoorRoofTopAt } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewCamera, closeViewPan, closeViewShowing, closeViewProject, closeViewOccluder, closeViewOccluderAlpha, closeViewCreatureFade,
  closeViewSolidTops, closeViewThreatWant, closeViewHeroHeight, roofHidden, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { GLF, resetCloseViewGL } from '../src/close-view-gl.ts';

const C = CLOSE_VIEW.camera, Lm = C.limits, Oc = C.occlude, T = C.threat, DEG = Math.PI / 180;
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

test('the limits, the window and the threat framing are data', () => {
  assert.ok(Lm.minBoom >= 2 && Lm.minBoom <= 3, `about 2.5 tiles (${Lm.minBoom})`);
  assert.ok(Lm.maxPitch >= 55 && Lm.maxPitch <= 65, `about 60 degrees (${Lm.maxPitch})`);
  assert.ok(Oc.keep > 0 && Oc.keep < .5 && Oc.radius > Oc.eye && Oc.stop > 0 && Number.isInteger(Oc.samples) && Oc.samples <= 16, 'a bounded dithered cone');
  assert.ok(T.range >= 6 && T.range <= 10 && T.easeIn > 0 && T.easeOut > 0 && T.hold > 0 && T.pull > 0 && T.focal < 1 && T.focal > .6, 'eased, bounded');
  assert.ok(C.edgeFog > 0 && OUTDOOR.buildings.fade.above > 0);
});

test('a roof is kept while the Wayfarer is airborne at or above it, and hidden when they are inside or under it', () => {
  const s = freshSave(); s.seed = 'CINDER-VERGE-47'; const g: any = new Game(s, 0); g.rx = -6; g.ry = 0; g.loadArea('overworld', false);
  const sc: any = outdoorScene(g.map), r = sc.houses.roofs.find((q: any) => q.id.includes('hut')); assert.ok(r, 'a hut');
  const inner = g.map.tiles.find((t: any) => t.buildingId === r.id && /Interior/.test(t.structure)); assert.ok(inner);
  const px = inner.x + .5, py = inner.y + .5, top = outdoorRoofTopAt(r, px, py), far = r.y1 + 3;
  assert.ok(top > OUTDOOR.buildings.wall.h, `the roof's drawn top (${top.toFixed(2)})`);
  assert.equal(roofHidden(g.map, r, px, py, px, far), true, 'the footprint rule alone (no height): hidden, as before');
  assert.equal(roofHidden(g.map, r, px, py, px, far, 0, 3), true, 'inside, on the floor: hidden');
  assert.equal(roofHidden(g.map, r, px, py, px, far, top - 1, 3), true, 'under it (a jump inside): hidden');
  assert.equal(roofHidden(g.map, r, px, py, px, far, top, 3), false, 'standing on it: kept');
  assert.equal(roofHidden(g.map, r, px, py, px, far, top + 1.5, top + 4), false, 'jumping, lifted or plunging over it: kept');
  // the camera within the walls hides it only from under the roof
  assert.equal(roofHidden(g.map, r, r.x0 - 2, py, px, py, 0, 2), true, 'the eye inside the house');
  assert.equal(roofHidden(g.map, r, r.x0 - 2, py, px, py, 0, top + 2), false, 'the eye over the roof');
  // the Wayfarer's height: the drawn feet, or the game's own height in the air (a level is OUTDOOR.terrain.level tall)
  const L = OUTDOOR.terrain.level;
  assert.ok(Math.abs(closeViewHeroHeight({ skyAir: 2 }) - 2 * L) < 1e-9 && Math.abs(closeViewHeroHeight({ droneLift: { z: 3 } }) - 3 * L) < 1e-9);
  assert.ok(Math.abs(closeViewHeroHeight({ fall: { z: 2.5 }, glide: { z: 1 } }) - 2.5 * L) < 1e-9, 'a fall or plunge');
});

test('outdoors low rocks no longer cut the boom: never under the minimum, never steeper than the maximum pitch', () => withGPU(() => {
  // hugging the rock row at y 13 (x 4-11) and the rock column at x 4: the release 926 pillar and border cases
  const s = scene(6.5, 13.6, Math.PI / 2), P: any = CLOSE_VIEW.presets.standard;
  for (let i = 0; i < 8; i++) { s.turn(-Math.PI + i * Math.PI / 4); const c = s.frame(120);
    assert.ok(c.distance >= Lm.minBoom - .02, `yaw ${i * 45}: boom ${c.distance.toFixed(2)} >= ${Lm.minBoom}`);
    assert.ok(c.pitch <= Lm.maxPitch * DEG + 1e-6, `yaw ${i * 45}: pitch ${(c.pitch / DEG).toFixed(1)}`); }
  s.turn(-Math.PI / 2); const c = s.frame(120); // looking north: the rocks straight behind
  assert.ok(Math.abs(c.distance - P.outdoorDistance) < .05, `the full boom over the rocks (${c.distance.toFixed(2)})`);
  const tops = closeViewSolidTops((outdoorScene(s.g.map, true) as any).solids, 32, 32);
  assert.ok(tops[13 * 32 + 6] > 0 && tops[13 * 32 + 6] < c.height - Lm.solidPad, 'a drawn rock under the eye');
}));

test('no boom collapse at a section edge: walking out through the border rocks\' gap', () => withGPU(() => {
  const s = scene(28, 8.6, 1.47), seen: number[] = [];
  for (let i = 0; i < 40; i++) { s.g.player.x = Math.min(31.2, 28 + i * .09); const c = s.frame(3); seen.push(c.distance); }
  assert.ok(Math.min(...seen) >= Lm.minBoom - .02, `never under the minimum (${Math.min(...seen).toFixed(2)})`);
  assert.ok(Math.min(...seen) > CLOSE_VIEW.presets.standard.outdoorDistance - .05, 'the border rocks are under the eye: the full boom');
}));

test('a solid between the eye and the Wayfarer is inside the occluder window and fades; a creature, however big, stays solid', () => withGPU(() => {
  const s = scene(10, 28.6, Math.PI); let c = s.frame(); // the camera east of the Wayfarer, over open ground (row 29)
  assert.equal(closeViewOccluder().on, true); assert.equal(closeViewOccluder().solid, 0, 'nothing between');
  const mid = (k: number) => { const o: any = closeViewOccluder(); return [o.eye[0] + (o.body[0] - o.eye[0]) * k, o.eye[1] + (o.body[1] - o.eye[1]) * k, o.eye[2] + (o.body[2] - o.eye[2]) * k]; };
  const [mx, my, mz] = mid(.6); assert.ok(closeViewOccluderAlpha(mx, my, mz) <= Oc.keep + 1e-9, 'its core is cut to `keep`');
  assert.equal(closeViewOccluderAlpha(mx, my + 2, mz), 1, 'beside the cone: untouched');
  const [bx, by, bz] = mid(1.2); assert.equal(closeViewOccluderAlpha(bx, by, bz), 1, 'beyond the Wayfarer: untouched');
  assert.deepEqual([...GLF.occA.slice(0, 3)].map((v) => +v.toFixed(4)), [c.x, c.y, c.height].map((v) => +v.toFixed(4)), 'the GPU cone starts at the eye');
  // a tree between them (the play-through's case): the probe finds it, the cutting programs draw this frame
  s.g.map.objects.push({ kind: 'tree', id: 'occ-tree', x: 12, y: 29, state: 'standing', vegetationForm: 'canopy', scale: 1.25 }); c = s.frame(2);
  assert.equal(closeViewOccluder().solid, 1, 'the tree is in the window'); assert.equal(GLF.occSolid, 1);
  assert.ok(Math.abs(c.distance - CLOSE_VIEW.presets.standard.outdoorDistance) < .05, 'and the boom is not pulled in for it');
  s.g.map.objects.pop(); s.frame(2); assert.equal(closeViewOccluder().solid, 0, 'gone: the ordinary programs again');
  // a big body between (release 932, Tim: "I want the enemies to be as solid and real as possible"): never faded, at any moment
  assert.equal(Oc.creatureFade, false, 'the creature fade is off');
  const foe: any = createCombatant('crimsonTyrant', 11.5, 28.6, true, []); Object.assign(foe, { id: 'occ-dragon', hp: 1e6, maxHp: 1e6 }); s.g.enemies.push(foe);
  s.g.presentation.reduceMotion = false; for (let i = 0; i < 6; i++) { s.frame(10); assert.equal(closeViewCreatureFade(foe), 1, `the dragon stays opaque (frame ${i})`); }
  s.g.presentation.reduceMotion = true; s.frame(1); assert.equal(closeViewCreatureFade(foe), 1, 'with reduced motion too');
  foe.x = 5; foe.y = 26; s.frame(10); assert.equal(closeViewCreatureFade(foe), 1, 'and away from the window');
}));

test('a big aggroed threat within range widens the view, eased in and out, keeping the limits', () => withGPU(() => {
  const s = scene(14, 26, Math.PI), P: any = CLOSE_VIEW.presets.standard, base = s.frame(), foe: any = createCombatant('lightningGiant', 9.5, 25.25, true, []);
  Object.assign(foe, { id: 'threat-giant', hp: 1e6, maxHp: 1e6, aggro: false }); s.g.enemies.push(foe);
  assert.equal(closeViewThreatWant(s.g), 0, 'not aggroed: nothing asked'); assert.ok(Math.abs(s.frame(30).distance - base.distance) < 1e-6);
  const small: any = createCombatant('stalker', 10, 26, true, []); Object.assign(small, { aggro: true }); s.g.enemies.push(small);
  assert.equal(closeViewThreatWant(s.g), 0, 'a small creature asks nothing'); s.g.enemies.pop();
  foe.aggro = true; assert.ok(closeViewThreatWant(s.g) > .8, `the Giant asks (${closeViewThreatWant(s.g).toFixed(2)})`);
  const d: number[] = []; let c: any; for (let i = 0; i < 180; i++) { c = s.frame(); d.push(c.distance); assert.ok(c.distance >= Lm.minBoom - .02 && c.pitch <= Lm.maxPitch * DEG + 1e-6, 'the limits hold'); }
  assert.ok(d[0] - base.distance < .15, `eased in, not cut (${(d[0] - base.distance).toFixed(3)})`);
  for (let i = 1; i < d.length; i++) assert.ok(Math.abs(d[i] - d[i - 1]) < .1, `smooth (${i})`);
  assert.ok(c.distance > P.outdoorDistance + T.pull * .7, `pulled back (${c.distance.toFixed(2)})`);
  const head = closeViewProject(foe.x + .5, foe.y + .75, foe.scale * T.headPerScale), feet = closeViewProject(14.5, 26.75, 0);
  assert.ok(head && head.sy >= 0 && head.sy <= 844 && head.sx >= 0 && head.sx <= 390, `the Giant's head on screen (${JSON.stringify(head)})`);
  assert.ok(feet && feet.sy >= 0 && feet.sy <= 844, 'and the Wayfarer');
  foe.aggro = false; const held = s.frame(Math.floor(T.hold / .016) - 3).distance; assert.ok(held >= c.distance - .02, `held a moment (${c.distance.toFixed(2)} -> ${held.toFixed(2)})`);
  const out: number[] = []; for (let i = 0; i < 600; i++) out.push(s.frame().distance);
  const peak = Math.max(...out); for (let i = 1; i < out.length; i++) assert.ok(out[i] <= peak + 1e-6 && Math.abs(out[i - 1] - out[i]) < .1, `eased out (${i})`);
  assert.ok(out[out.length - 1] < peak - T.pull * .7, 'drawn back in');
  assert.ok(Math.abs(out[out.length - 1] - base.distance) < .05, 'back to the ordinary boom');
}));

test('the camera faces the new section on a crossing still', () => {
  assert.equal(C.crossing.faceTravel, true); // tests/close-view-section-heading.test.ts drives the crossing itself
});

test('no per-frame allocation in the new paths', () => withGPU(() => {
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), body = (name: string) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); let d = 0, j = src.indexOf('{', i); const a = j; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(a, j + 1); };
  for (const f of ['camWall', 'minBoomReach', 'closeViewOccluderAlpha', 'occluderProbe', 'creatureOccluded', 'closeViewThreatWant', 'threatFrame', 'framingFit', 'heroHeight', 'roofHidden']) {
    const b = body(f); assert.ok(!/\bnew\s|=>|\[\s*\]|\.map\(|\.filter\(|\.slice\(|\{\s*[A-Za-z_$]+\s*:/.test(b), `${f} allocates nothing`); }
  const out = readFileSync(new URL('../src/close-view-outdoor.ts', import.meta.url), 'utf8'), i = out.indexOf('export function outdoorRoofTopAt('), b = out.slice(i, out.indexOf('\n}', i));
  assert.ok(!/\bnew\s|=>|\[\s*\]/.test(b), 'outdoorRoofTopAt allocates nothing');
  const gl = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.match(gl, /occA: new Float32Array\(4\), occB: new Float32Array\(4\), occC: new Float32Array\(4\)/, 'the cone\'s uniforms are preallocated');
  // the solids' tops are built once a scene, then reused
  const s = scene(10, 26, Math.PI), sc: any = outdoorScene(s.g.map, true), a = closeViewSolidTops(sc.solids, 32, 32); s.frame(30);
  assert.equal(closeViewSolidTops((outdoorScene(s.g.map, true) as any).solids, 32, 32), a, 'cached with the scene');
}));
