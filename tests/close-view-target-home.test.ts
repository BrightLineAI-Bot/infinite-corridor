import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';

// Tim, 2026-11-26 (revised): "You just get to keep the camera, move it wherever you want; centre takes you to that angle at the
// distance you set." The pinch sets the Wayfarer's distance (save.closeViewZoom) and it stays. Every press of the Target button
// puts the camera back to the default angle (CLOSE_VIEW.targetHome): behind the Wayfarer, the preset's own height and pitch (tilt
// 0) and Look mode off, keeping the pinched distance and the preset chosen in Options. Lock-on is unchanged. Production camera
// and controls, no GPU.
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : () => {},
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
let now = 700000;
function frame(g, n = 1) { for (let i = 0; i < n; i++) { now += 16; assert.equal(CV.closeViewFrame(ctx, g, 390, 844, now, () => {}), true); } }
function fixture() {
  const g = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = true;
  const w = g.map.width, h = Math.floor(g.map.tiles.length / w), floor = g.map.tiles[g.player.y * w + g.player.x];
  const cx = Math.max(7, Math.min(w - 8, g.player.x)), cy = Math.max(7, Math.min(h - 8, g.player.y));
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) g.map.tiles[y * w + x] = { ...floor, x, y, blocked: false };
  g.player.x = cx; g.player.y = cy;
  CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now - 10000);
  frame(g, 40);
  return g;
}
function foe(g, id, dx, dy) { const e = { id, kind: 'hollowMarshal', x: g.player.x + dx, y: g.player.y + dy, hp: 50, maxHp: 50, scale: 1, dead: false }; g.enemies.push(e); return e; }
function controls(g) {
  const width = 390, height = 844, rect = { left: width - 190, top: height - 166, width: 178, height: 162 };
  const make = () => ({ children: [], style: {}, attrs: {}, listeners: {}, hidden: false,
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); },
    append(...els) { for (const el of els) { el.parent = this; this.children.push(el); } },
    insertBefore(el, before) { el.parent = this; this.children.splice(this.children.indexOf(before), 0, el); },
    after(el) { el.parent = this.parent; this.parent.children.push(el); },
    querySelector: () => cluster, querySelectorAll: () => [], setPointerCapture() {},
    getBoundingClientRect() { return this.className === 'close-move-pad' ? { left: 34, top: 454, width: 92, height: 92 } : rect; },
  });
  const actions = make(), cluster = make(), canvas = make();
  Object.assign(cluster, { offsetWidth: rect.width, offsetHeight: rect.height, offsetLeft: rect.left, offsetTop: rect.top }); actions.append(cluster);
  actions.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
  const host = { document: { getElementById: (id) => id === 'actions' ? actions : id === 'game' ? canvas : null, createElement: make, createElementNS: make }, performance: { now: () => now }, innerWidth: width, innerHeight: height, addEventListener() {} };
  const saved = { n: 0 }, ui = CV.mountCloseViewControls(() => g, host, { persist: () => { saved.n++; } }); ui.sync();
  const tap = () => { const ev = { pointerId: 43, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} }; ui.lock.listeners.pointerdown[0](ev); ui.lock.listeners.pointerup[0](ev); ui.sync(); };
  return { ui, tap, saved };
}
const settled = (g) => { frame(g, 400); return CV.closeViewCamera(); };
// A camera never moved: the same preset and distance, recentered behind.
function reference(preset, zoom) { const r = fixture(); r.save.closeViewPreset = preset; r.save.closeViewZoom = zoom; CV.closeViewRecentre(r, now, { centered: true }); return settled(r); }

test('the default angle: tilt 0 and Look off; nothing about distance or preset in the table', () => {
  assert.ok(Object.isFrozen(CV.CLOSE_VIEW.targetHome)); assert.deepEqual(CV.CLOSE_VIEW.targetHome, { tilt: 0, lookOff: true });
});

for (const preset of ['overShoulder', 'standard']) test(`a Target press returns to the default angle at the pinched distance (${preset})`, () => {
  const g = fixture(), { tap, saved } = controls(g); g.save.closeViewPreset = preset;
  const home = reference(preset, .7), plain = reference(preset, 0);
  // Tim's camera: pinched in, tilted, in Look mode
  CV.resetCloseViewCamera(); frame(g, 2); g.save.closeViewZoom = .7; CV.closeViewPan(0, 40, now); CV.closeViewLookSet(g, true); frame(g, 60); assert.notEqual(CV.closeViewCamera().pitchUser, 0);
  tap();
  assert.equal(g.save.closeViewZoom, .7, 'the pinch is his'); assert.equal(g.save.closeViewPreset, preset, 'the Options preset is his'); assert.equal(saved.n, 0, 'nothing in the save changed');
  assert.equal(CV.closeViewLookActive(), false, 'Look mode let go'); assert.equal(CV.closeViewCamera().pitchUser, 0, 'tilt cleared');
  const c = settled(g);
  assert.ok(Math.abs(c.orbitRadius - home.orbitRadius) < 1e-3, `the pinched distance: ${c.orbitRadius} vs ${home.orbitRadius}`);
  assert.ok(Math.abs(c.orbitRadius - plain.orbitRadius) > .3, 'not the unpinched distance');
  assert.ok(Math.abs(c.elevation - home.elevation) < 1e-3 && Math.abs(c.elevation - plain.elevation) < 1e-3, `the default angle: ${c.elevation} vs ${home.elevation}`);
  assert.ok(Math.abs(c.pitch - home.pitch) < 1e-3, `look pitch: ${c.pitch} vs ${home.pitch}`); assert.equal(c.centeredRear, true);
  assert.ok(Math.abs(Math.atan2(Math.sin(c.yaw - c.bodyYaw), Math.cos(c.yaw - c.bodyYaw))) < .01, 'behind the Wayfarer');
});

test('the pinch stays free: outside Look mode the camera keeps the new distance, and a press keeps it too', () => {
  const g = fixture(), { tap } = controls(g); tap(); frame(g, 60);
  CV.closeViewLookSet(g, true); frame(g, 4); CV.closeViewLookZoomTo(.5); assert.equal(g.save.closeViewZoom, .5, 'the pinch writes her distance');
  CV.closeViewLookSet(g, false); frame(g, 200); assert.equal(g.save.closeViewZoom, .5, 'kept after Look mode');
  const pinched = CV.closeViewCamera().orbitRadius; tap(); const after = settled(g).orbitRadius;
  assert.equal(g.save.closeViewZoom, .5); assert.ok(Math.abs(after - pinched) < 1e-3, `the press keeps the distance (${pinched} -> ${after})`);
});

test('lock-on still works: a press locks the foe in front at the default angle; the next releases it', () => {
  const g = fixture(), { tap } = controls(g); g.save.closeViewZoom = .8; CV.closeViewPan(0, 30, now);
  const e = foe(g, 'home-foe', 2, 0); frame(g, 4);
  tap(); assert.equal(CV.closeViewTargetMode(), true); assert.equal(g.lockedTarget()?.id, e.id, 'locked'); assert.equal(CV.closeViewCamera().pitchUser, 0); assert.equal(g.save.closeViewZoom, .8);
  frame(g, 120); assert.equal(g.lockedTarget()?.id, e.id, 'the lock holds through the swing');
  CV.closeViewPan(0, 30, now); tap(); assert.equal(CV.closeViewTargetMode(), false); assert.equal(g.lockedTarget(), null, 'released'); assert.equal(CV.closeViewCamera().pitchUser, 0, 'and the angle again');
});

test('a paused or hidden Close View ignores the press', () => {
  const g = fixture(); CV.closeViewPan(0, 30, now); const tilt = CV.closeViewCamera().pitchUser; assert.notEqual(tilt, 0);
  g.paused = true; assert.equal(CV.closeViewTargetActivate(g, now), null); assert.equal(CV.closeViewCamera().pitchUser, tilt); g.paused = false;
  g.save.closeView = false; assert.equal(CV.closeViewTargetActivate(g, now), null); assert.equal(CV.closeViewCamera().pitchUser, tilt); g.save.closeView = true;
});
