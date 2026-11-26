import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';

// Tim, 2026-11-26: "pinch-to-zoom stays free, but whenever I press the target / centre-camera button in Close View the camera
// returns to the default over-the-shoulder position (the right distance, lets you see everything)." The Target button now also
// puts the camera home (CLOSE_VIEW.targetHome): the release 1065 overShoulder preset, the Wayfarer's own distance back to the
// preset's (save.closeViewZoom 0), no tilt and Look mode off. Lock-on is unchanged. Production camera and controls, no GPU.
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
// Tim's camera: an old "standard" save kept by release 1065 because of its pinched distance, tilted, in Look mode.
function wanderedOff(g) {
  g.save.closeViewPreset = 'standard'; g.save.closeViewZoom = .7; frame(g, 60);
  CV.closeViewPan(0, 40, now); frame(g, 4);
  CV.closeViewLookSet(g, true); frame(g, 20);
  assert.notEqual(CV.closeViewCamera().pitchUser, 0, 'tilted'); assert.equal(CV.closeViewLookActive(), true);
}
const settled = (g) => { frame(g, 400); return CV.closeViewCamera(); };

test('the home is the release 1065 default: the overShoulder preset at its own distance', () => {
  assert.ok(Object.isFrozen(CV.CLOSE_VIEW.targetHome));
  assert.equal(CV.CLOSE_VIEW.targetHome.preset, CV.CLOSE_VIEW.defaultPreset); assert.equal(CV.CLOSE_VIEW.defaultPreset, 'overShoulder');
  assert.equal(CV.CLOSE_VIEW.targetHome.zoom, 0); assert.equal(CV.closeViewZoomOf(CV.CLOSE_VIEW.targetHome.zoom), 0);
});

test('a Target press brings the camera home whatever the pinch, tilt, Look mode or preset was, and the save keeps it', () => {
  const ref = fixture(); ref.save.closeViewPreset = 'overShoulder'; ref.save.closeViewZoom = 0; CV.closeViewRecentre(ref, now, { centered: true }); const home = settled(ref);
  const g = fixture(), { tap, saved } = controls(g); wanderedOff(g);
  const off = CV.closeViewCamera(); assert.ok(Math.abs(off.orbitRadius - home.orbitRadius) > .3, `pinched away from home (${off.orbitRadius} vs ${home.orbitRadius})`);
  tap();
  assert.equal(g.save.closeViewPreset, 'overShoulder'); assert.equal(g.save.closeViewZoom, 0); assert.equal(saved.n, 1, 'persisted once');
  assert.equal(CV.closeViewLookActive(), false, 'Look mode let go'); assert.equal(CV.closeViewCamera().pitchUser, 0, 'tilt cleared');
  const c = settled(g);
  assert.ok(Math.abs(c.orbitRadius - home.orbitRadius) < 1e-3, `distance home: ${c.orbitRadius} vs ${home.orbitRadius}`);
  assert.ok(Math.abs(c.elevation - home.elevation) < 1e-3, `pitch home: ${c.elevation} vs ${home.elevation}`);
  assert.ok(Math.abs(c.pitch - home.pitch) < 1e-3, `look pitch home: ${c.pitch} vs ${home.pitch}`);
  assert.equal(c.zoomScale, home.zoomScale); assert.equal(c.centeredRear, true);
  // a second press with the camera already home changes nothing in the save
  tap(); assert.equal(saved.n, 1, 'nothing new to persist'); assert.equal(g.save.closeViewZoom, 0);
});

test('the pinch stays free between presses: a new pinched distance holds until the next Target press', () => {
  const g = fixture(), { tap } = controls(g); tap(); frame(g, 60);
  CV.closeViewLookSet(g, true); frame(g, 4); CV.closeViewLookZoomTo(.5); assert.equal(g.save.closeViewZoom, .5, 'the pinch writes her distance');
  CV.closeViewLookSet(g, false); frame(g, 200); assert.equal(g.save.closeViewZoom, .5, 'kept after Look mode, no reset without a press');
  const pinched = CV.closeViewCamera().orbitRadius; tap(); const back = settled(g).orbitRadius;
  assert.equal(g.save.closeViewZoom, 0); assert.ok(back > pinched + .3, `the press pulls back out (${pinched} -> ${back})`);
});

test('lock-on still works: a press locks the foe in front and comes home; the next releases it and comes home again', () => {
  const g = fixture(), { tap } = controls(g); g.save.closeViewZoom = .8; g.save.closeViewPreset = 'close';
  const e = foe(g, 'home-foe', 2, 0); frame(g, 4);
  tap(); assert.equal(CV.closeViewTargetMode(), true); assert.equal(g.lockedTarget()?.id, e.id, 'locked'); assert.equal(g.save.closeViewZoom, 0); assert.equal(g.save.closeViewPreset, 'overShoulder');
  frame(g, 120); assert.equal(g.lockedTarget()?.id, e.id, 'the lock holds through the swing home');
  g.save.closeViewZoom = .6; tap(); assert.equal(CV.closeViewTargetMode(), false); assert.equal(g.lockedTarget(), null, 'released'); assert.equal(g.save.closeViewZoom, 0, 'and home again');
});

test('a paused or hidden Close View ignores the press and leaves the camera and save alone', () => {
  const g = fixture(); g.save.closeViewZoom = .4; g.save.closeViewPreset = 'wide';
  g.paused = true; assert.equal(CV.closeViewTargetActivate(g, now), null); assert.equal(g.save.closeViewZoom, .4); assert.equal(g.save.closeViewPreset, 'wide'); g.paused = false;
  g.save.closeView = false; assert.equal(CV.closeViewTargetActivate(g, now), null); assert.equal(g.save.closeViewZoom, .4); g.save.closeView = true;
  // the double tap on the crescent still only swings the view behind (it is not the Target button)
  CV.closeViewRecentre(g, now); assert.equal(g.save.closeViewZoom, .4); assert.equal(g.save.closeViewPreset, 'wide');
});
