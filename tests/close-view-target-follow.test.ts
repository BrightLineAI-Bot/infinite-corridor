import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';

// Target-mode follow and the spin loop (Tim, 2026-11-19). 1: with the Target button lit and nothing locked, the camera eases
// round behind the Wayfarer while he walks (CLOSE_VIEW.targetFollow), never while he stands, never while the player holds or
// has just turned the view. 2: pressing Target with the stick held sideways used to spin the Wayfarer and the camera round
// each other (about 1600 degrees in four seconds here) until the stick was let go: the recenter chased the body while the
// held stick's basis chased the view. Production camera, controls and Game.update, no GPU.
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : () => {},
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
let now = 700000;
const DEG = Math.PI / 180, DT = .016;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const yaw = () => CV.closeViewCamera().yaw;
function frame(g, n = 1, before = () => {}) {
  for (let i = 0; i < n; i++) { now += 16; before(); assert.equal(CV.closeViewFrame(ctx, g, 390, 844, now, () => {}), true); }
}
// A scratch Heart floor widened to an open 81 x 81 hall (border walls kept), so a straight walk of several seconds meets no wall.
function fixture({ reduce = false, autoFollow = true } = {}) {
  const g = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = autoFollow; if (reduce) g.presentation = { ...(g.presentation || {}), reduceMotion: true };
  const floor = g.map.tiles[g.player.y * g.map.width + g.player.x], wall = g.map.tiles.find((t) => t.blocked), w = 81, h = 81, tiles = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles.push(x && y && x < w - 1 && y < h - 1 ? { ...floor, x, y, blocked: false } : { ...wall, x, y });
  Object.assign(g.map, { width: w, height: h, tiles }); g.player.x = 40; g.player.y = 40; g.player.hp = g.player.maxHp = 1e6;
  CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-yaw() / CV.CLOSE_VIEW.crescent.yaw, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now - 10000);
  frame(g, 40); return g;
}
// One input tick as main.ts runs it: steer the stick through the camera, update the game, restore the raw stick.
const update = (g, stick) => { const s = { ...stick }; CV.closeViewSteer(g, s, now); g.update(DT, { state: s, consume: () => false, held: () => false }, now); CV.closeViewUnsteer(s); };
const step = (g, stick, n = 1, after = () => {}) => { for (let i = 0; i < n; i++) { update(g, stick); frame(g); after(); } };
const pos = (g) => ({ x: g.player.x, y: g.player.y });
const heading = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
// Walk `n` frames, recording the camera's turn and the walk's heading every `win` frames.
function walk(g, stick, n, win = 20) {
  let prev = yaw(), net = 0, abs = 0, at = pos(g); const heads = [], yaws = [];
  for (let i = 1; i <= n; i++) { step(g, stick); const y = yaw(), d = wrap(y - prev); net += d; abs += Math.abs(d); prev = y; yaws.push(y);
    if (i % win === 0) { const p = pos(g); if (Math.hypot(p.x - at.x, p.y - at.y) > .05) heads.push(heading(at, p)); at = p; } }
  return { net, abs, heads, yaws };
}
const foe = (g, id, dx, dy) => { const e = { id, kind: 'hollowMarshal', x: g.player.x + dx, y: g.player.y + dy, hp: 1e6, maxHp: 1e6, scale: 1, dead: false, passiveBehavior: 'practice' }; g.enemies.push(e); return e; };

test('Target pressed with the stick held (no foe): the walk stays straight and the camera makes one bounded swing behind it, no loop', () => {
  for (const reduce of [false, true]) for (const stick of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: .7, y: -.7 }, { x: -.6, y: -.8 }]) {
    const g = fixture({ reduce }), y0 = yaw(), label = `stick (${stick.x}, ${stick.y})${reduce ? ' reduced motion' : ''}`;
    let a = pos(g); step(g, stick, 30); const h0 = heading(a, pos(g)); // the way he walks before the press
    assert.equal(CV.closeViewTargetActivate(g, now), null); assert.equal(CV.closeViewTargetMode(), true);
    const r = walk(g, stick, 250);
    for (const h of r.heads) assert.ok(Math.abs(wrap(h - h0)) < 2 * DEG, `${label}: the walk holds its line (${(wrap(h - h0) / DEG).toFixed(1)} deg off)`);
    assert.ok(Math.abs(wrap(yaw() - h0)) < 3 * DEG, `${label}: the camera settles behind him (${(wrap(yaw() - h0) / DEG).toFixed(1)} deg off)`);
    const swing = Math.abs(wrap(h0 - y0));
    assert.ok(r.abs <= swing + 5 * DEG, `${label}: one swing, no spin (${(r.abs / DEG).toFixed(0)} deg turned for a ${(swing / DEG).toFixed(0)} deg offset)`);
    assert.ok(r.abs - Math.abs(r.net) < 1 * DEG, `${label}: no oscillation (${((r.abs - Math.abs(r.net)) / DEG).toFixed(2)} deg back and forth)`);
    const late = r.yaws.slice(-60); assert.ok(Math.max(...late.map((v) => Math.abs(wrap(v - late[0])))) < 1 * DEG, `${label}: and stays put`);
    CV.closeViewTargetActivate(g, now); // off again
  }
});

test('Target pressed with the stick held and a foe in sight: the lock frames it, the camera turns only as the strafe circles, never a loop', () => {
  for (const [stick, at] of [[{ x: 1, y: 0 }, [0, 4]], [{ x: -1, y: 0 }, [3, -3]], [{ x: -.9, y: -.25 }, [4, 1]]]) {
    const g = fixture(), e = foe(g, 'post', ...at), label = `stick (${stick.x}, ${stick.y}) foe (${at})`;
    step(g, stick, 30); assert.equal(CV.closeViewTargetActivate(g, now)?.id, e.id, `${label}: locked`);
    const bearing = () => Math.atan2(e.y + .75 - (g.player.y + .75), e.x + .5 - (g.player.x + .5));
    let swept = 0, prevB = bearing(), prevY = yaw(), turned = 0, framed = 0;
    for (let i = 0; i < 250; i++) { step(g, stick); const b = bearing(), y = yaw(); swept += Math.abs(wrap(b - prevB)); turned += Math.abs(wrap(y - prevY)); prevB = b; prevY = y;
      if (i >= 120) framed = Math.max(framed, Math.abs(wrap(y - b))); }
    assert.equal(g.lockedTarget()?.id, e.id, `${label}: the lock holds`);
    assert.ok(framed < 30 * DEG, `${label}: the foe stays framed ahead (${(framed / DEG).toFixed(0)} deg off at most)`);
    assert.ok(turned <= swept + 200 * DEG, `${label}: the camera turns with the circle, not round and round (${(turned / DEG).toFixed(0)} deg turned, bearing swept ${(swept / DEG).toFixed(0)})`);
    assert.ok(turned < 500 * DEG, `${label}: bounded (${(turned / DEG).toFixed(0)} deg)`);
  }
});

test('the target-mode follow eases round behind the walk only while he moves, gently, without overshoot', () => {
  const F = CV.CLOSE_VIEW.targetFollow;
  assert.ok(F.delay > 0 && F.ramp > 0 && F.rate > 0 && F.maxRate > 0 && F.maxRate <= 90 && F.cone < 180 && F.minHead > 0 && F.reducedScale > 0 && F.reducedScale < 1, 'tuning lives in the data table');
  const witness = (reduce, autoFollow = true) => {
    const g = fixture({ reduce, autoFollow }); CV.closeViewTargetActivate(g, now); step(g, { x: 0, y: 0 }, 60); // idle press: the camera settles behind his body
    CV.closeViewPan(70 * DEG / CV.CLOSE_VIEW.crescent.yaw, 0, now - 10000); frame(g, 2); // the player has put the view 70 degrees off, a while ago
    const put = yaw(); step(g, { x: 0, y: 0 }, 200); assert.equal(yaw(), put, 'standing still: the view stays where it was put');
    // stick right: he walks 90 degrees off the view; the view follows round behind him
    let a = pos(g); step(g, { x: 1, y: 0 }, 20); const h0 = heading(a, pos(g)), cap = F.maxRate * DEG * (reduce ? F.reducedScale : 1) * DT;
    let largest = 0, prev = yaw(), crossed = false; const errs = [];
    for (let i = 0; i < 330; i++) { step(g, { x: 1, y: 0 }); const y = yaw(); largest = Math.max(largest, Math.abs(wrap(y - prev))); prev = y; const err = wrap(h0 - y); errs.push(err); if (err < -F.deadband * DEG) crossed = true; }
    assert.ok(largest <= cap + 1e-9, `never faster than maxRate (${(largest / DT / DEG).toFixed(1)} deg/s)`);
    assert.equal(crossed, false, 'no overshoot past his heading');
    a = pos(g); step(g, { x: 1, y: 0 }, 20); assert.ok(Math.abs(wrap(heading(a, pos(g)) - h0)) < 2 * DEG, 'the walk itself never bent');
    // he stops: after the travel heading's own fade, the view holds still
    step(g, { x: 0, y: 0 }, 60); const held = yaw(); step(g, { x: 0, y: 0 }, 120); assert.ok(Math.abs(wrap(yaw() - held)) < .2 * DEG, 'idle: no follow');
    return { first: Math.abs(errs[59]), last: Math.abs(errs[errs.length - 1]) };
  };
  const normal = witness(false), reduced = witness(true), optOut = witness(false, false);
  assert.ok(normal.last < 3 * DEG, `it settles behind him (${(normal.last / DEG).toFixed(1)} deg off)`);
  assert.ok(reduced.last < 8 * DEG && reduced.first > normal.first, `reduced motion: gentler, still settles (${(reduced.first / DEG).toFixed(1)} vs ${(normal.first / DEG).toFixed(1)} deg after a second)`);
  assert.ok(optOut.last < 3 * DEG, 'the lit Target button follows even with the general auto-follow option off');
  // without target mode, that option off still means the view never moves on its own (unchanged)
  const g = fixture({ autoFollow: false }), y0 = yaw(); step(g, { x: 1, y: 0 }, 250); assert.equal(yaw(), y0, 'target mode off, auto-follow off: no follow');
});

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
  const fire = (type) => { for (const f of canvas.listeners[type] || []) f({ type, pointerId: 9, pointerType: 'touch', clientX: 300, clientY: 300, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} }); };
  return { ui, fire };
}

test('the follow never fights the player: none while the view is held or in Look mode, and it waits its delay after a turn', () => {
  const F = CV.CLOSE_VIEW.targetFollow, g = fixture(), { ui, fire } = controls(g), sync = () => ui.sync();
  CV.closeViewTargetActivate(g, now); step(g, { x: 0, y: 0 }, 60, sync);
  fire('pointerdown'); const held = yaw(); step(g, { x: 1, y: 0 }, 200, sync); assert.equal(yaw(), held, 'a camera thumb held still keeps the view while he walks off sideways');
  fire('pointerup'); step(g, { x: 1, y: 0 }, Math.floor(F.delay / DT) - 2, sync); assert.equal(yaw(), held, 'the delay after the player\'s own control');
  step(g, { x: 1, y: 0 }, 200, sync); assert.ok(Math.abs(wrap(yaw() - held)) > 45 * DEG, 'then it follows him round');
  // Look mode: the view is the player's
  step(g, { x: 0, y: 0 }, 120, sync); CV.closeViewPan(80 * DEG / CV.CLOSE_VIEW.crescent.yaw, 0, now - 10000);
  assert.equal(CV.closeViewLookSet(g, true), true); const look = yaw(); step(g, { x: 1, y: 0 }, 150, sync); assert.equal(yaw(), look, 'no follow in Look mode');
  CV.closeViewLookSet(g, false, true);
});
