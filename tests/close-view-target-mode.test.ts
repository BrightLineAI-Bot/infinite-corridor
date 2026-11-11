import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';

// Target mode (Tim, 2026-11-11): the Target button lights red while auto-targeting is on; the lock moves to the next foe
// by itself; locked, the stick strafes round the foe at a held distance; and movement is always relative to the view as it
// is now (a Target recenter no longer leaves the stick on the old view). Production camera and controls, no GPU.
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : () => {},
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
let now = 500000;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function frame(g, n = 1, before = () => {}) {
  for (let i = 0; i < n; i++) { now += 16; before(); assert.equal(CV.closeViewFrame(ctx, g, 390, 844, now, () => {}), true); }
}
function fixture() {
  const g = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = true;
  // a scratch lab floor: open a 13 x 13 square round the Wayfarer (inside the floor's border) so foes can stand anywhere round
  const w = g.map.width, h = Math.floor(g.map.tiles.length / w), floor = g.map.tiles[g.player.y * w + g.player.x];
  const cx = Math.max(7, Math.min(w - 8, g.player.x)), cy = Math.max(7, Math.min(h - 8, g.player.y));
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) g.map.tiles[y * w + x] = { ...floor, x, y, blocked: false };
  g.player.x = cx; g.player.y = cy; const best = { r: 6 };
  CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now - 10000);
  frame(g, 40);
  return { g, room: best.r };
}
function foe(g, id, dx, dy) {
  const e = { id, kind: 'hollowMarshal', x: g.player.x + dx, y: g.player.y + dy, hp: 50, maxHp: 50, scale: 1, dead: false };
  g.enemies.push(e); return e;
}
function controls(g, width = 390, height = 844) {
  const rect = { left: width - 190, top: height - 166, width: 178, height: 162 };
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
  const ui = CV.mountCloseViewControls(() => g, host); ui.sync();
  const tap = () => { const ev = { pointerId: 41, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} }; ui.lock.listeners.pointerdown[0](ev); ui.lock.listeners.pointerup[0](ev); ui.sync(); };
  return { ui, tap };
}
const update = (g, stick) => { const s = { ...stick }; CV.closeViewSteer(g, s, now); g.update(.016, { state: s, consume: () => false, held: () => false }, now); CV.closeViewUnsteer(s); };

test('the Target button lights red while target mode is on, with or without a foe to lock, and goes dark when tapped off', () => {
  const { g } = fixture(), { ui, tap } = controls(g), B = CV.CLOSE_VIEW.targetButton;
  assert.equal(CV.closeViewTargetMode(), false); assert.equal(ui.lock.attrs['data-target-mode'], 'off');
  tap(); assert.equal(CV.closeViewTargetMode(), true, 'a tap turns auto-targeting on even with nothing in sight');
  assert.equal(g.lockedTarget(), null); assert.equal(ui.lock.attrs['data-target-mode'], 'on'); assert.equal(ui.lock.style.color, B.on, 'lit red');
  assert.equal(ui.lock.attrs['aria-pressed'], 'true'); assert.match(g.message, /Auto-target on/);
  // a foe that comes into sight is locked without touching anything
  const e = foe(g, "arrives", 0, 3); frame(g, 20); ui.sync(); assert.equal(g.lockedTarget()?.id, e.id, 'auto-acquired');
  assert.equal(ui.lock.style.color, B.on, 'still red while locked in target mode');
  tap(); assert.equal(CV.closeViewTargetMode(), false); assert.equal(g.lockedTarget(), null, 'off releases the lock');
  assert.equal(ui.lock.attrs['data-target-mode'], 'off'); assert.equal(ui.lock.style.color, B.off); assert.equal(ui.lock.attrs['aria-pressed'], 'false');
  // a lock made by tapping a foe, without target mode, keeps the old warm tint, not red
  g.lockTarget(e.id); ui.sync(); assert.equal(ui.lock.style.color, B.locked); assert.equal(ui.lock.attrs['data-target-mode'], 'off');
  // ... and the button then turns target mode on keeping that lock
  tap(); assert.equal(CV.closeViewTargetMode(), true); assert.equal(g.lockedTarget()?.id, e.id); assert.equal(ui.lock.style.color, B.on);
  assert.equal(g.save.closeViewTargetMode, undefined, 'runtime only: nothing is written to the save');
});

test('target mode moves the lock to the next foe when it falls, wherever that foe is, and turns the camera to it', () => {
  const { g } = fixture(); const yaw0 = CV.closeViewCamera().yaw;
  // one ahead; the other behind the camera and far from where the first will fall (beyond the lock's own rehop)
  const ahead = foe(g, 'ahead', Math.round(Math.cos(yaw0) * 3), Math.round(Math.sin(yaw0) * 3));
  const behind = foe(g, 'behind', -Math.round(Math.cos(yaw0) * 3), -Math.round(Math.sin(yaw0) * 3));
  assert.ok(Math.hypot(ahead.x - behind.x, ahead.y - behind.y) > CV.CLOSE_VIEW.lock.rehop, 'beyond the plain lock\'s rehop');
  assert.equal(CV.closeViewTargetActivate(g, now)?.id, ahead.id, 'acquires the foe in front first');
  frame(g, 60); assert.equal(g.lockedTarget()?.id, ahead.id);
  ahead.dead = true; frame(g, 1); assert.equal(g.lockedTarget()?.id, behind.id, 'the next foe is locked the frame the first falls');
  frame(g, 120); const toBehind = Math.atan2(behind.y - g.player.y, behind.x - g.player.x);
  assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - toBehind)) < .1, `the camera swung round to it (${wrap(CV.closeViewCamera().yaw - toBehind).toFixed(3)})`);
  assert.ok(Math.abs(wrap(CV.closeViewPlayerFacingYaw(g, now) - toBehind)) < .15, 'the Wayfarer faces it too');
  behind.dead = true; frame(g, 2); assert.equal(g.lockedTarget(), null); assert.equal(CV.closeViewTargetMode(), true, 'mode stays on with no foe left');
  const late = foe(g, 'late', 2, 0); frame(g, Math.ceil(CV.CLOSE_VIEW.targetMode.scanSec / .016) + 1); assert.equal(g.lockedTarget()?.id, late.id, 'and locks the next one to appear');
  // without target mode the old lock keeps its old behaviour: released when nothing is near where the foe fell
  CV.closeViewTargetActivate(g, now); assert.equal(CV.closeViewTargetMode(), false);
  late.dead = true; const a = foe(g, 'a', 3, 0); foe(g, 'b', -3, 0); g.lockTarget(a.id); frame(g, 2); a.dead = true; frame(g, 30); assert.equal(g.lockedTarget(), null);
});

test('target mode switches to a much nearer threat, not to one barely nearer, and waits its hold after a switch', () => {
  const { g } = fixture(), T = CV.CLOSE_VIEW.targetMode, yaw0 = CV.closeViewCamera().yaw, at = (a, d) => [Math.cos(yaw0 + a) * d, Math.sin(yaw0 + a) * d];
  const far = foe(g, 'far', ...at(0, 5)); CV.closeViewTargetActivate(g, now); assert.equal(g.lockedTarget()?.id, far.id); frame(g, 90);
  const slight = foe(g, 'slight', ...at(1.2, 4.2)); frame(g, Math.ceil((T.switchHold + T.scanSec) / .016) + 2);
  assert.equal(g.lockedTarget()?.id, far.id, 'a foe barely nearer (or outside threat range) does not take the lock');
  slight.dead = true; const threat = foe(g, 'threat', ...at(-1.4, 1.6));
  frame(g, Math.ceil((T.switchHold + T.scanSec) / .016) + 2); assert.equal(g.lockedTarget()?.id, threat.id, 'a foe in the Wayfarer\'s face takes the lock');
  // a manual swipe choice is not overridden at once
  CV.closeViewLockSwitch(g, 1) || CV.closeViewLockSwitch(g, -1); const chosen = g.lockedTarget()?.id; assert.equal(chosen, far.id);
  frame(g, Math.floor(T.switchHold / .016) - 4); assert.equal(g.lockedTarget()?.id, far.id, 'the switch hold protects a manual choice');
  assert.ok(T.scanSec > 0 && T.switchHold > T.scanSec && T.nearerBy > 0, 'bounded, hysteretic scanning (data table)');
});

test('movement is relative to the current camera after a Target toggle recenters it, every frame of the swing', () => {
  const { g } = fixture();
  // the Wayfarer faces one way, the camera is panned well off it
  g.player.facing = 'right'; frame(g, 90); const body = CV.closeViewPlayerFacingYaw(g, now);
  CV.closeViewPan(1.6 / CV.CLOSE_VIEW.crescent.yaw, 0, now); frame(g, 2); const oldYaw = CV.closeViewCamera().yaw;
  assert.ok(Math.abs(wrap(oldYaw - body)) > 1.2, 'camera starts well off the body');
  const stick = { x: 0, y: -1 }; CV.closeViewSteer(g, stick, now); assert.ok(Math.abs(wrap(Math.atan2(stick.y, stick.x) - oldYaw)) < 1e-9, 'up walks where the view looks'); CV.closeViewUnsteer(stick);
  assert.equal(CV.closeViewTargetActivate(g, now), null); // no foe: target mode on, the view recenters behind the Wayfarer
  let swung = 0;
  for (let i = 0; i < 90; i++) {
    frame(g, 1); const yaw = CV.closeViewCamera().yaw;
    for (const [sx, sy, rel] of [[0, -1, 0], [1, 0, Math.PI / 2], [0, 1, Math.PI], [-1, 0, -Math.PI / 2]]) {
      const s = { x: sx, y: sy }; CV.closeViewSteer(g, s, now);
      assert.ok(Math.abs(wrap(Math.atan2(s.y, s.x) - (yaw + rel))) < 1e-9, `frame ${i}: stick (${sx}, ${sy}) follows the current view`); CV.closeViewUnsteer(s);
    }
    swung = Math.max(swung, Math.abs(wrap(yaw - oldYaw)));
  }
  assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - body)) < .02, 'the view settled behind the Wayfarer');
  assert.ok(swung > 1.2, 'the view really turned');
  const up = { x: 0, y: -1 }; CV.closeViewSteer(g, up, now); assert.ok(Math.abs(wrap(Math.atan2(up.y, up.x) - body)) < .02, 'a held "up" now walks the way the Wayfarer faces, not the old view'); CV.closeViewUnsteer(up);
});

test('locked, a sideways stick strafes round the foe and keeps its distance; toward and away change it', () => {
  const { g, room } = fixture(); assert.ok(room >= 4, `room for a circle (${room})`);
  const e = foe(g, 'post', 2.5, 0); Object.assign(e, { hp: 1e6, maxHp: 1e6, passiveBehavior: 'practice' }); g.player.hp = g.player.maxHp = 1e6;
  g.lockTarget(e.id); frame(g, 30); assert.equal(g.lockedTarget()?.id, e.id);
  const dist = () => Math.hypot(e.x + .5 - (g.player.x + .5), e.y + .75 - (g.player.y + .75)), bearing = () => Math.atan2(g.player.y + .75 - (e.y + .75), g.player.x + .5 - (e.x + .5));
  const d0 = dist(), b0 = bearing(); let lo = d0, hi = d0, swept = 0, prev = b0;
  for (let i = 0; i < 150; i++) { update(g, { x: 1, y: 0 }); frame(g); const b = bearing(); swept += wrap(b - prev); prev = b; lo = Math.min(lo, dist()); hi = Math.max(hi, dist()); }
  assert.ok(Math.abs(swept) > .8, `it circles (${swept.toFixed(2)} rad)`);
  assert.ok(hi - d0 < .12 && d0 - lo < .12, `the distance holds (${d0.toFixed(3)}: ${lo.toFixed(3)}..${hi.toFixed(3)})`);
  assert.equal(g.lockedTarget()?.id, e.id);
  const before = dist(); for (let i = 0; i < 20; i++) { update(g, { x: 0, y: -1 }); frame(g); } assert.ok(dist() < before - .3, 'up walks in');
  const mid = dist(); for (let i = 0; i < 20; i++) { update(g, { x: 0, y: 1 }); frame(g); } assert.ok(dist() > mid + .3, 'down backs away');
  const d1 = dist(); for (let i = 0; i < 60; i++) { update(g, { x: -1, y: 0 }); frame(g); } assert.ok(Math.abs(dist() - d1) < .12, 'the other way holds the new distance');
});
