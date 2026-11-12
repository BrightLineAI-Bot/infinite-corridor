import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { interiorSurfaceHeight } from '../src/landscape.ts';
import * as CV from '../src/close-view.ts';
import { render } from '../src/renderer.ts';
import { outdoorRelief, outdoorSurfaceZ } from '../src/close-view-outdoor.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

// Tim, 2026-11-11: the Close View camera pulled back in every preset (wide the farthest), and a second targeting pass toward a
// reliable phone lock-on: one priority for every choice, attacks at the lock, a sticky lock through brief occlusion, smooth
// (acceleration limited) switches, a lock ring and a predictable swipe. Production camera and controls, no GPU.
let arcs = 0;
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), arc: () => { arcs++; }, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : () => {},
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
let now = 700000;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const C = CV.CLOSE_VIEW, L = C.lock, T = C.targetMode;
function frame(g, n = 1, w = 390, h = 844) { for (let i = 0; i < n; i++) { now += 16; assert.equal(CV.closeViewFrame(ctx, g, w, h, now, () => {}), true); } return CV.closeViewCamera(); }
// a scratch lab floor opened 13 x 13 round the Wayfarer, the camera put due east (yaw 0) and level
function fixture({ preset = 'standard', follow = true, w = 390, h = 844 } = {}) {
  const g = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = follow; g.save.closeViewPreset = preset;
  const mw = g.map.width, mh = Math.floor(g.map.tiles.length / mw), floor = g.map.tiles[g.player.y * mw + g.player.x];
  const cx = Math.max(7, Math.min(mw - 8, g.player.x)), cy = Math.max(7, Math.min(mh - 8, g.player.y));
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) g.map.tiles[y * mw + x] = { ...floor, x, y, blocked: false };
  g.player.x = cx; g.player.y = cy; g.player.hp = g.player.maxHp = 1e6;
  CV.resetCloseViewCamera(); frame(g, 2, w, h);
  CV.closeViewPan(-CV.closeViewCamera().yaw / C.crescent.yaw, -CV.closeViewCamera().pitchUser / C.crescent.pitch, now - 10000);
  frame(g, 40, w, h); return g;
}
const foe = (g, id, dx, dy, extra = {}) => { const e = { id, kind: 'hollowMarshal', x: g.player.x + dx, y: g.player.y + dy, hp: 1e5, maxHp: 1e5, scale: 1, dead: false, passiveBehavior: 'practice', ...extra }; g.enemies.push(e); return e; };
const wall = (g, dx, dy, on = true) => { const w = g.map.width, i = (g.player.y + dy) * w + g.player.x + dx; g.map.tiles[i] = { ...g.map.tiles[i], blocked: on }; };
const idle = (key = '') => { let used = false; return { state: { x: 0, y: 0 }, consume: (k) => !!key && k === key && !used && (used = true), held: () => false, reset() {} }; };
const step = (g, key = '') => { now += 16; g.update(.016, idle(key), now); CV.closeViewFrame(ctx, g, 390, 844, now, () => {}); };

test('every Close View preset sits farther back than before, the wide one farthest, under the walls\' tops', () => {
  const P = C.presets, before = { close: [2, 1.35], standard: [2.7, 1.6], wide: [3.4, 1.85] };
  for (const [id, [d, h]] of Object.entries(before)) {
    assert.ok(P[id].distance >= d + .5, `${id}: pulled back (${d} -> ${P[id].distance})`);
    assert.ok(P[id].height > h, `${id}: raised to see over the room (${h} -> ${P[id].height})`);
    assert.ok(P[id].height <= C.walls.height - C.camera.craneClear + 1e-9, `${id}: still under the walls' tops`);
    assert.ok(P[id].fogPush >= 0 && P[id].fogPush < P[id].distance - d + .01, `${id}: the fog moves out no further than the camera did`);
  }
  assert.ok(P.wide.distance > P.standard.distance && P.standard.distance > P.close.distance, 'wide is the farthest, close the nearest');
  assert.equal(P.wide.distance, 5, 'Tim, 2026-11-11: wide at 5 tiles'); assert.ok(Math.abs(P.wide.fogPush - (P.wide.distance - before.wide[0])) < 1e-9, 'its fog moves out as far as it did');
  assert.equal(C.defaultPreset, 'standard');
});

test('in open ground each preset settles at its full boom, with the Wayfarer low of centre and whole, in portrait and landscape', () => {
  for (const [w, h] of [[390, 844], [844, 390]]) for (const id of ['close', 'standard', 'wide']) {
    const g = fixture({ preset: id, follow: false, w, h }), c = frame(g, 120, w, h), p = g.player, z = interiorSurfaceHeight(g.map, p.x + .5, p.y + .75);
    assert.ok(Math.abs(c.distance - C.presets[id].distance) < .02, `${id} ${w}x${h}: full boom (${c.distance})`);
    const feet = CV.closeViewProject(p.x + .5, p.y + .82, z), head = CV.closeViewProject(p.x + .5, p.y + .82, z + C.camera.framing.bodyHeight);
    assert.ok(feet && head, 'both ends in front of the camera');
    assert.ok(feet.sy > h * .5 && feet.sy <= h * (h > w ? .7 : 1 - C.camera.framing.margin) + 1, `${id} ${w}x${h}: feet low of centre (${feet.sy.toFixed(0)} of ${h})`);
    assert.ok(head.sy > 0 && head.sy < feet.sy && Math.abs(feet.sx - w / 2) < w * .25, `${id} ${w}x${h}: the whole Wayfarer in frame, near the middle`);
    // the floor ahead: a point 4 tiles beyond the Wayfarer is on screen, above them
    const ahead = CV.closeViewProject(p.x + .5 + 4, p.y + .82, z); assert.ok(ahead && ahead.sy > 0 && ahead.sy < feet.sy, `${id}: ground ahead shows`);
    assert.ok(c.pitch > .1 && c.pitch < .6, `${id}: a gentle downward pitch (${c.pitch.toFixed(3)})`);
  }
});

test('a wall behind the Wayfarer still pulls the longer boom in, never into the wall, and it lets out again', () => {
  for (const id of ['standard', 'wide']) {
    const g = fixture({ preset: id, follow: false }); for (let dy = -6; dy <= 6; dy++) wall(g, -2, dy);
    const c = frame(g, 60), px = g.player.x + .5, py = g.player.y + .75;
    assert.ok(c.distance < 1.6, `${id}: pulled in (${c.distance})`);
    for (let i = 1; i <= 40; i++) assert.equal(CV.closeViewWallAt(g.map, px + (c.x - px) * i / 40, py + (c.y - py) * i / 40), false, 'clear feet-to-eye line');
    for (let dy = -6; dy <= 6; dy++) wall(g, -2, dy, false);
    let prev = c.distance, jump = 0; for (let i = 0; i < 240; i++) { const d = frame(g).distance; jump = Math.max(jump, Math.abs(d - prev)); prev = d; }
    assert.ok(Math.abs(prev - C.presets[id].distance) < .05, `${id}: let out again (${prev})`); assert.ok(jump < .1, `${id}: smoothly (${jump})`);
  }
});

test('target priority: close in front first, then a foe attacking, then the nearest; the first lock does not flip a moment later', () => {
  let g = fixture(); foe(g, 'far-ahead', 6, 0); foe(g, 'close-behind', -2, 1);
  assert.equal(CV.closeViewTargetActivate(g, now)?.id, 'close-behind', 'a foe at the Wayfarer\'s back beats a far one ahead');
  for (let i = 0; i < 180; i++) { frame(g); assert.equal(g.lockedTarget()?.id, 'close-behind', `frame ${i}: no flip`); }
  g = fixture(); foe(g, 'ahead', 3, 0); foe(g, 'behind', -2.5, 0);
  assert.equal(CV.closeViewTargetActivate(g, now)?.id, 'ahead', 'at much the same distance the one in front wins');
  for (let i = 0; i < 180; i++) { frame(g); assert.equal(g.lockedTarget()?.id, 'ahead', `frame ${i}: held`); }
  g = fixture(); foe(g, 'idle', 3, 2); foe(g, 'winding', 2, -3, { telegraph: .5 });
  assert.equal(CV.closeViewTargetActivate(g, now)?.id, 'winding', 'a foe winding up a blow comes before an idle one as near');
  g = fixture(); foe(g, 'unaware', 3, 1); foe(g, 'aware', 3, -1, { aggro: true });
  assert.equal(CV.closeViewTargetActivate(g, now)?.id, 'aware', 'a foe that has noticed the Wayfarer comes first');
  assert.ok(T.wClose > 0 && T.wWindup > T.wAggro && T.switchMargin > 0, 'the priority lives in the data table');
});

test('attacks go at the lock: a swing and a shot aim at the locked foe, and in target mode a foe in reach takes the lock so the swing lands', () => {
  let g = fixture(); const far = foe(g, 'far', 3, 2); foe(g, 'side', 0, -1.5); g.lockTarget(far.id); frame(g, 30);
  step(g, 'attack'); const want = Math.atan2(far.y - g.player.y, far.x - g.player.x), aim = g.save.lastAim;
  assert.ok(aim && Math.abs(wrap(Math.atan2(aim.y, aim.x) - want)) < .05, `the swing turned to the lock (${JSON.stringify(aim)})`);
  for (let i = 0; i < 30; i++) step(g);
  assert.ok(Math.abs(wrap(CV.closeViewPlayerFacingYaw(g, now) - want)) < .2, 'and the Wayfarer faces it');
  // target mode: locked on a foe across the room, another steps into reach: it takes the lock fast, and the swing hits it
  g = fixture(); const away = foe(g, 'away', 5, 0); CV.closeViewTargetActivate(g, now); assert.equal(g.lockedTarget()?.id, away.id); frame(g, 60);
  const close = foe(g, 'close', 1, 1); frame(g, Math.ceil((T.reachHold + T.scanSec) / .016) + 2);
  assert.equal(g.lockedTarget()?.id, close.id, `a foe in reach takes the lock within ${T.reachHold + T.scanSec}s`);
  const hp = close.hp; step(g, 'attack'); for (let i = 0; i < 40; i++) step(g);
  assert.ok(close.hp < hp, 'the swing lands on it'); assert.equal(away.hp, away.maxHp);
});

test('sticky target-mode lock: a foe briefly behind a pillar keeps the lock, dimmed; out of sight past lostSec it is released', () => {
  const g = fixture(), e = foe(g, 'p', 4, 0); CV.closeViewTargetActivate(g, now); assert.equal(g.lockedTarget()?.id, e.id); frame(g, 60); wall(g, 2, 0);
  frame(g, Math.floor(T.lostSec * .8 / .016)); assert.equal(g.lockedTarget()?.id, e.id, `held through ${(T.lostSec * .8).toFixed(1)}s out of sight`);
  assert.equal(CV.closeViewCamera().lockId, e.id); assert.ok(T.lostSec > L.lostSec, `stickier than the plain lock (${T.lostSec}s)`);
  wall(g, 2, 0, false); frame(g, 5); assert.equal(g.lockedTarget()?.id, e.id, 'and it is the same foe once it steps out');
  // a foe in reach is not ignored while the lock is hidden
  wall(g, 2, 0); frame(g, 10); const close = foe(g, 'close', -1, 1); frame(g, Math.ceil(T.scanSec / .016) + 2); assert.equal(g.lockedTarget()?.id, close.id, 'a foe in reach takes a hidden lock');
  close.dead = true; frame(g, 2); g.lockTarget(e.id); frame(g, Math.ceil((T.lostSec + .3) / .016)); assert.notEqual(g.lockedTarget()?.id, e.id, 'released once it stays hidden');
});

test('a switch swings the view smoothly: bounded speed, bounded acceleration, no snap from rest', () => {
  const g = fixture(); const a = foe(g, 'a', 3, 0); foe(g, 'b', -3, 1); CV.closeViewTargetActivate(g, now); frame(g, 90); a.dead = true;
  let prev = CV.closeViewCamera().yaw, v0 = 0, peak = 0, kick = 0;
  for (let i = 0; i < 150; i++) { const y = frame(g).yaw, v = wrap(y - prev) / .016; peak = Math.max(peak, Math.abs(v)); if (Math.abs(v) > Math.abs(v0)) kick = Math.max(kick, (Math.abs(v) - Math.abs(v0)) / .016); v0 = v; prev = y; }
  assert.equal(g.lockedTarget()?.id, 'b');
  assert.ok(peak <= T.maxRate * Math.PI / 180 + 1e-6, `speed bounded (${(peak * 180 / Math.PI).toFixed(0)} deg/s)`);
  assert.ok(kick <= L.accel * Math.PI / 180 * 1.01, `acceleration bounded (${(kick * 180 / Math.PI).toFixed(0)} deg/s^2)`);
  const to = Math.atan2(g.enemies[1].y - g.player.y, g.enemies[1].x - g.player.x);
  assert.ok(Math.abs(wrap(prev - to)) < .05, `and it arrives (${wrap(prev - to).toFixed(3)})`);
});

test('a new lock shows a closing ring; a swipe switches predictably, one foe at a time, without wrapping round', () => {
  const g = fixture(); const l = foe(g, 'left', 4, -2), m = foe(g, 'mid', 4, 0), r = foe(g, 'right', 4, 2); g.lockTarget(m.id); frame(g, 60);
  arcs = 0; frame(g, 10); const steady = arcs;
  assert.equal(CV.closeViewLockSwitch(g, 1)?.id, r.id); arcs = 0; frame(g, 10); assert.ok(arcs > steady, `the ring marks the new lock (${arcs} > ${steady})`);
  arcs = 0; frame(g, Math.ceil(T.markSec / .016) + 10); arcs = 0; frame(g, 10); assert.equal(arcs, steady, 'and goes once it has closed');
  assert.equal(CV.closeViewLockSwitch(g, 1), null, 'nothing further right: the lock stays'); assert.equal(g.lockedTarget()?.id, r.id);
  assert.equal(CV.closeViewLockSwitch(g, -1)?.id, m.id); assert.equal(CV.closeViewLockSwitch(g, -1)?.id, l.id); assert.equal(CV.closeViewLockSwitch(g, -1), null);
  assert.equal(g.lockedTarget()?.id, l.id);
});

test('locked, a dodge keeps the lock and the view keeps within its speed bound', () => {
  const g = fixture(); const e = foe(g, 'd', 2, 0); g.lockTarget(e.id); frame(g, 30); let prev = CV.closeViewCamera().yaw, peak = 0;
  for (let i = 0; i < 50; i++) { const s = { x: 1, y: 0 }; CV.closeViewSteer(g, s, now); now += 16; let used = false; g.update(.016, { state: s, consume: (k) => i === 0 && k === 'dodge' && !used && (used = true), held: () => false, reset() {} }, now); CV.closeViewUnsteer(s); const y = frame(g).yaw; peak = Math.max(peak, Math.abs(wrap(y - prev)) / .016); prev = y; }
  assert.equal(g.lockedTarget()?.id, e.id); assert.ok(peak <= L.maxRate * Math.PI / 180 + 1e-6, `bounded (${(peak * 180 / Math.PI).toFixed(0)} deg/s)`);
});

// Tim, 2026-11-11: "higher camera in general" (the overworld's levels are 1.2 tiles tall; with his back to a two-level cliff
// the camera pulled in to his shoulder). Indoors raised toward the cap; outdoors a much higher crane that rises further over a
// ledge behind rather than cutting the boom, with the horizon kept on screen.
test('every preset is higher: indoors toward the walls\' cap, outdoors clearly higher', () => {
  const P = C.presets, r889 = { close: 1.55, standard: 1.9, wide: 2.15 };
  for (const [id, h] of Object.entries(r889)) {
    assert.ok(P[id].height > h && P[id].height <= C.walls.height - C.camera.craneClear + 1e-9, `${id}: indoors ${h} -> ${P[id].height}, under the cap`);
    assert.ok(P[id].outdoorHeight >= P[id].height + .7, `${id}: outdoors ${P[id].outdoorHeight}`);
  }
  assert.ok(P.wide.outdoorHeight > P.standard.outdoorHeight && P.standard.outdoorHeight > P.close.outdoorHeight);
  assert.ok(C.camera.outdoor.riseMax >= 1.5 && C.camera.outdoor.horizonRoom > 0, 'the ledge rise and the horizon room are data');
});

class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
// The overworld's standard test tile over the (stub) GPU: its plateau rises one level at x 24 and two at x 25 (rows 3-6).
function overworld(run) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  CV.setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx }; return { width: 390, height: 844, addEventListener() {}, getContext: (k) => k === 'webgl2' ? gl : ctx }; });
  CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); CV.resetCloseViewCamera();
  try { run(); } finally { CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx })); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
function outside(id, x, y, yaw, w, h) {
  const g: any = createLabFixture({ lab: 'test-tile', scenario: '', now: 1000 }).game, screen: any = new Proxy({ canvas: { width: w, height: h } }, { get: (o, k) => k in o ? o[k] : (ctx as any)[k], set: (o, k, v) => { o[k] = v; return true; } });
  g.save.overworldCloseView = true; g.save.closeViewPreset = id; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion: true }; g.enemies = [];
  g.player.x = x; g.player.y = y; CV.resetCloseViewCamera(); render(screen, g, w, h, now += 16);
  CV.closeViewPan(wrap(yaw - CV.closeViewCamera().yaw) / C.crescent.yaw, -CV.closeViewCamera().pitchUser / C.crescent.pitch, now - 10000);
  const seen: any[] = []; for (let i = 0; i < 260; i++) { render(screen, g, w, h, now += 16); if (i >= 180) seen.push(CV.closeViewCamera()); }
  const c = CV.closeViewCamera(), z = outdoorSurfaceZ(outdoorRelief(g.map), x + .5, y + .75);
  return { g, c, z, seen, feet: CV.closeViewProject(x + .5, y + .82, z), head: CV.closeViewProject(x + .5, y + .82, z + C.camera.framing.bodyHeight),
    horizon: CV.closeViewProject(c.x + Math.cos(c.yaw) * 400, c.y + Math.sin(c.yaw) * 400, c.height) };
}

test('outdoors the camera stands high with the horizon in view; in a short landscape view it keeps the horizon', () => overworld(() => {
  for (const id of ['close', 'standard', 'wide']) {
    const o = outside(id, 19, 10, Math.PI, 390, 844);
    assert.ok(Math.abs(o.c.distance - C.presets[id].outdoorDistance) < .02, `${id}: full boom (${o.c.distance.toFixed(2)})`); assert.ok(Math.abs(o.c.height - o.z - C.presets[id].outdoorHeight) < .02, `${id}: at its outdoor height (${(o.c.height - o.z).toFixed(2)})`);
    assert.ok(o.feet.sy > 844 * .55 && o.feet.sy < 844 * .72 && o.head.sy > 844 * .4, `${id}: the Wayfarer low of centre (${o.feet.sy.toFixed(0)})`);
    assert.ok(o.horizon && o.horizon.sy > 844 * .2 && o.horizon.sy < 844 * .45, `${id}: the horizon in the upper part of the screen (${o.horizon?.sy.toFixed(0)})`);
    for (const ahead of [2, 4, 8]) { const q = CV.closeViewProject(19.5 - ahead, 10.82, o.z + .7); assert.ok(q && q.sy > 0 && q.sy < o.feet.sy && q.sx > 0 && q.sx < 390, `${id}: a foe ${ahead} tiles ahead is framed above the Wayfarer for the lock`); }
    const l = outside(id, 19, 10, Math.PI, 844, 390);
    assert.ok(l.horizon && l.horizon.sy >= 0, `${id} landscape: some sky (${l.horizon?.sy.toFixed(0)})`); assert.ok(l.feet.sy <= 390 * (1 - C.camera.framing.margin) + 1, `${id} landscape: feet in frame`);
  }
}));

test('with its back to a two-level cliff the camera rises and looks down over it instead of pulling in, and holds still', () => overworld(() => {
  for (const id of ['close', 'standard', 'wide']) {
    const o = outside(id, 23, 4, Math.PI, 390, 844), P = C.presets[id];
    assert.ok(o.c.distance > P.outdoorDistance - .15, `${id}: the full boom (or within the fixed samples' margin) (${o.c.distance.toFixed(2)})`);
    assert.ok(o.c.height - o.z > P.outdoorHeight + .2 && o.c.height - o.z <= P.outdoorHeight + C.camera.outdoor.riseMax + .03, `${id}: risen over the ledge (${(o.c.height - o.z).toFixed(2)})`);
    const R = outdoorRelief(o.g.map), px = 23.5, py = 4.75; // the line from the chest to the camera clears the ground
    for (let i = 1; i <= 50; i++) { const k = i / 50, ch = C.camera.outdoor.chest; assert.ok(o.z + ch + (o.c.height - o.z - ch) * k >= outdoorSurfaceZ(R, px + (o.c.x - px) * k, py + (o.c.y - py) * k) + .1, `${id}: clear at ${k}`); }
    assert.ok(o.feet.sy > 844 * .55 && o.feet.sy < 844 * .75 && o.horizon.sy > 0, `${id}: framed, and the horizon still shows`);
    const d = o.seen.map((c) => c.distance), hh = o.seen.map((c) => c.height); assert.ok(Math.max(...d) - Math.min(...d) < .01 && Math.max(...hh) - Math.min(...hh) < .01, `${id}: no pumping`);
  }
  // too tall and too close for the rise alone: the boom shortens only as far as it must
  const t = outside('wide', 23.3, 4, Math.PI, 390, 844); assert.ok(t.c.distance > 4 && t.c.height - t.z <= C.presets.wide.outdoorHeight + C.camera.outdoor.riseMax + .03, `tight: ${t.c.distance.toFixed(2)}`);
}));
