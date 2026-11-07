import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/renderer.ts';
import { jumpLift } from '../src/game.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { interiorArchAt } from '../src/vehicle-gates.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, writeCloseViewModel } from '../src/close-view-models.ts';
import * as CV from '../src/close-view.ts';

function recorder() {
  return new Proxy({ canvas: null, measureText: () => ({ width: 10 }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
    get: (o, k) => k in o ? o[k] : (...args) => {
      for (const v of args) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} receives finite coordinates`);
    }, set: (o, k, v) => (o[k] = v, true),
  });
}
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: recorder }));
const bodyHeight = CV.CLOSE_VIEW.camera.framing.bodyHeight;
function fixture(scenario, preset = 'standard') {
  const g = createLabFixture({ lab: 'close-view', scenario, seed: 'CINDER-VERGE-47', now: 1000 }).game;
  g.save.closeViewPreset = preset; g.enemies = [];
  g.map.objects = g.map.objects.filter(o => o.kind !== 'trap');
  CV.resetCloseViewCamera();
  CV.closeViewPan(0, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, 1000);
  // The same static scene supplies arch clearance in the GPU path; a real GPU is
  // unnecessary for checking its camera projection and collision coordinates.
  CV.closeViewStatic(g.map);
  return { g, now: 1000 };
}
function frame(f, w, h, { move = false, jump = false } = {}) {
  const state = { x: 0, y: move ? -1 : 0 }, pending = new Set(jump ? ['jump'] : []);
  CV.closeViewSteer(f.g, state);
  f.g.update(1 / 60, { state, consume: k => pending.delete(k), held: () => false }, f.now += 1000 / 60);
  CV.closeViewUnsteer(state);
  render(recorder(), f.g, w, h, f.now);
}
function body(f) {
  const p = f.g.player, z = jumpLift(f.g, f.now);
  return { foot: CV.closeViewProject(p.x + .5, p.y + .82, z), head: CV.closeViewProject(p.x + .5, p.y + .82, z + bodyHeight) };
}
function safeEye(f) {
  const g = f.g, c = CV.closeViewCamera(), px = g.player.x + .5, py = g.player.y + .75;
  for (const key of ['x', 'y', 'height', 'pitch', 'distance']) assert.ok(Number.isFinite(c[key]), key);
  assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false, 'eye is outside solid stone');
  for (let i = 1; i < 20; i++) assert.equal(CV.closeViewWallAt(g.map, px + (c.x - px) * i / 20, py + (c.y - py) * i / 20), false, 'opaque wall never separates eye and player');
  const arch = CV.closeViewTheme(g.map).arch;
  let cap = CV.CLOSE_VIEW.walls.height - .15;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (interiorArchAt(g.map, c.x + i * .3, c.y + j * .3)) cap = Math.min(cap, arch.spring + arch.radius * .55 - .08);
  assert.ok(c.height <= cap + 1e-8, `eye ${c.height} stays below roof/arch ${cap}`);
}
function contained(f, w, h, label) {
  safeEye(f);
  for (const [part, q] of Object.entries(body(f))) {
    assert.ok(q, `${label}: ${part} is beyond the near plane`);
    assert.ok(q.sx >= 0 && q.sx <= w && q.sy >= 0 && q.sy <= h, `${label}: ${part} at ${JSON.stringify(q)} in ${w}x${h}`);
  }
}
function fitsVertically(f, w, h) {
  const c = CV.closeViewCamera(), p = f.g.player, z = jumpLift(f.g, f.now), preset = CV.CLOSE_VIEW.presets[f.g.save.closeViewPreset];
  const v = (p.x + .5 - c.x) * Math.cos(c.yaw) + (p.y + .82 - c.y) * Math.sin(c.yaw);
  const span = Math.atan2(c.height - z, v) - Math.atan2(c.height - z - bodyHeight, v);
  const F = Math.max(w / 2 / Math.tan(preset.fov * Math.PI / 360), h / 2 / Math.tan(CV.CLOSE_VIEW.fov.verticalMax * Math.PI / 360));
  return v > 0 && span <= 2 * Math.atan(h / 2 / F);
}

test('the framing bound contains the existing hood through idle, walking and jumping poses without changing model scale', () => {
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
  for (const pose of ['idle', 'walk', 'jump']) for (let i = 0; i <= 20; i++) {
    const n = writeCloseViewModel(out, 0, { kind: 'player', x: 0, y: 0, z: 0, yaw: 0, phase: i / 20 * Math.PI * 2,
      pace: pose === 'walk' ? 1 : 0, pose, amount: i / 20 });
    assert.ok(n > 0);
    for (let k = 2; k < n; k += MODEL_FLOATS) assert.ok(out[k] <= bodyHeight, `${pose}: vertex ${out[k]} below body framing bound`);
  }
});

for (const [w, h] of [[714, 668], [390, 844]]) for (const scenario of ['hive', 'arcology']) {
  test(`${scenario}: entry, compressed orbit and jump stay in frame at ${w}x${h}`, () => {
    for (const preset of ['standard', 'close', 'wide']) {
      const f = fixture(scenario, preset);
      for (let i = 0; i < 50; i++) frame(f, w, h);
      contained(f, w, h, `${preset} entry`);
      for (let i = 0; i < 60; i++) frame(f, w, h, { move: true });
      CV.closeViewPan(-170 * CV.CLOSE_VIEW.drag.yaw / CV.CLOSE_VIEW.crescent.yaw, 40, f.now);
      for (let i = 0; i < 50; i++) {
        frame(f, w, h); safeEye(f);
        // An instantaneous turn can cut the boom before the crane rises. Check
        // every physically feasible frame, not just the settled pose.
        if (fitsVertically(f, w, h)) contained(f, w, h, `${preset} orbit frame ${i}`);
      }
      contained(f, w, h, `${preset} orbit`);
      if (scenario === 'hive') {
        assert.ok(CV.closeViewCamera().distance < .6, 'the regression exercises a wall-compressed boom');
        assert.ok(CV.closeViewCamera().shoulder < .12, 'the compressed boom does not retain a full-width shoulder');
      }
      frame(f, w, h, { jump: true });
      for (let i = 0; i < 7; i++) frame(f, w, h);
      assert.ok(jumpLift(f.g, f.now) > .1, 'ordinary Game.update jump is airborne');
      contained(f, w, h, `${preset} jump at 120ms`);
      for (let i = 0; i < 40; i++) {
        frame(f, w, h);
        // Portrait has room for the full arc here. Near its peak the old residual
        // shoulder put the head outside the left edge despite a valid vertical fit.
        if (w === 390) contained(f, w, h, `${preset} jump/landing frame ${i}`);
        else safeEye(f); // the lower landscape viewport can be physically too short under an arch
      }
      contained(f, w, h, `${preset} landed`);
    }
  });
}

test('an impossible full-body fit below a low arch centers the angular span while keeping solid geometry and finite projection', () => {
  const f = fixture('cellar'), g = f.g, w = 714, h = 668;
  // A one-tile-wide north/south arch, with the player looking west: the wall
  // confines the boom to .3 tiles while the real jump brings the hood above the eye.
  g.map = { ...g.map, width: 9, height: 9, objects: [], tiles: Array.from({ length: 81 }, (_, i) => {
    const x = i % 9, y = Math.floor(i / 9), open = (x === 4 && y > 0 && y < 8) || ((y === 3 || y === 5) && x >= 3 && x <= 5);
    return { x, y, kind: open ? 'flagFloor' : 'keepWall', blocked: !open };
  }) };
  g.player.x = 4; g.player.y = 3.75;
  CV.resetCloseViewCamera(); CV.closeViewStatic(g.map);
  for (let i = 0; i < 30; i++) frame(f, w, h);
  CV.closeViewPan((Math.PI - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, f.now);
  for (let i = 0; i < 50; i++) frame(f, w, h);
  frame(f, w, h, { jump: true });
  for (let i = 0; i < 15; i++) frame(f, w, h);
  safeEye(f);
  const c = CV.closeViewCamera(), p = g.player, z = jumpLift(g, f.now);
  const v = (p.x + .5 - c.x) * Math.cos(c.yaw) + (p.y + .82 - c.y) * Math.sin(c.yaw);
  const footAngle = Math.atan2(c.height - z, v), headAngle = Math.atan2(c.height - z - bodyHeight, v);
  const F = (w / 2) / Math.tan(CV.CLOSE_VIEW.presets.standard.fov * Math.PI / 360);
  assert.ok(footAngle - headAngle > 2 * Math.atan((h / 2) / F), 'the physical body angle exceeds the viewport');
  assert.ok(Math.abs(c.pitch - (footAngle + headAngle) / 2) < 1e-6, 'unavoidable crop is centered rather than aimed at the distant wall');
  const mid = CV.closeViewProject(p.x + .5, p.y + .82, z + bodyHeight / 2);
  assert.ok(mid && Number.isFinite(mid.sx) && Number.isFinite(mid.sy), 'body center remains finite and in front of the eye');
  assert.equal(CV.CLOSE_VIEW.presets.standard.fov, 72, 'no FOV widening');
});
