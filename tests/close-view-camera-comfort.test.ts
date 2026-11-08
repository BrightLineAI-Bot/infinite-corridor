import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';
import { createInput } from '../src/input.ts';

// Exercise the production camera and controls without a GPU or actor capture. Geometry/body projection
// and heightfields are additionally covered by close-view-framing and close-view-terrain-render.
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : (...args) => { for (const v of args) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)}: ${v}`); },
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
let now = 300000;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function frame(g, n = 1, before = () => {}) {
  for (let i = 0; i < n; i++) { now += 16; before(); assert.equal(CV.closeViewFrame(ctx, g, 390, 844, now, () => {}), true); }
}
function fixture(scenario = 'heart') {
  const g = createLabFixture({ lab: 'close-view', scenario, now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = true;
  if (scenario === 'heart') {
    // Use the widest existing square. Do not regenerate or alter any room tiles.
    let best = { x: g.player.x, y: g.player.y, r: -1 };
    for (const t of g.map.tiles) if (!t.blocked) {
      let r = 0;
      outer: for (; r < 6; r++) for (let y = t.y - r; y <= t.y + r; y++) for (let x = t.x - r; x <= t.x + r; x++) if (CV.closeViewWallAt(g.map, x + .5, y + .5)) break outer;
      if (r > best.r) best = { x: t.x, y: t.y, r };
    }
    g.player.x = best.x; g.player.y = best.y;
  }
  CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now - 10000);
  return g;
}
function clearEye(g) {
  const c = CV.closeViewCamera(), px = g.player.x + .5, py = g.player.y + .75;
  for (const k of ['x', 'y', 'yaw', 'distance', 'height', 'pitch', 'shoulder']) assert.ok(Number.isFinite(c[k]), k);
  for (let j = 1; j <= 40; j++) assert.equal(CV.closeViewWallAt(g.map, px + (c.x - px) * j / 40, py + (c.y - py) * j / 40), false, `clear eye ray ${j}`);
}

test('a stationary concave corner settles instead of pumping the boom or shoulder', () => {
  const g = fixture('cellar'); g.player.x = 11; g.player.y = 5; g.save.closeViewAutoFollow = false;
  assert.equal(CV.closeViewWallAt(g.map, 11.5, 5.75), false);
  CV.resetCloseViewCamera(); frame(g);
  CV.closeViewPan((Math.PI / 2 - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, now);
  const tiles = JSON.stringify(g.map.tiles), save = JSON.stringify(g.save), samples = [];
  frame(g, 350);
  frame(g, 100, () => { clearEye(g); samples.push(CV.closeViewCamera()); });
  for (const key of ['distance', 'shoulder', 'height', 'pitch']) {
    const values = samples.map((c) => c[key]);
    assert.ok(Math.max(...values) - Math.min(...values) < .005, `${key} settles; previously the boom ranged 1.386–2.642 tiles`);
  }
  assert.ok(samples.at(-1).distance > 2.6, 'a clear centered boom retains useful room context');
  assert.equal(samples.at(-1).shoulder, 0, 'the obstructed shoulder stays centered');
  assert.equal(JSON.stringify(g.map.tiles), tiles, 'camera does not change room geometry');
  assert.equal(JSON.stringify(g.save), save, 'camera state is runtime-only');
});

test('recenter and quick-turn clocks, boom and crane freeze through pause and resume without a jump', () => {
  const g = fixture(); frame(g, 40); g.save.lastAim = { x: 0, y: 1 }; CV.closeViewRecentre(g, now); frame(g, 2);
  g.paused = true; g.pauseStarted = now; const paused = CV.closeViewCamera(); frame(g, 160);
  assert.deepEqual(CV.closeViewCamera(), paused);
  g.paused = false; frame(g); assert.deepEqual(CV.closeViewCamera(), paused, 'resume has zero elapsed camera time');
  frame(g, 40); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - Math.PI / 2)) < .01);
  assert.equal(CV.closeViewQuickTurn(g, now), true); frame(g, 3);
  g.paused = true; g.pauseStarted = now; const turning = CV.closeViewCamera(); frame(g, 150);
  assert.deepEqual(CV.closeViewCamera(), turning); assert.equal(CV.closeViewTurning(), true);
  g.paused = false; frame(g); assert.deepEqual(CV.closeViewCamera(), turning);
  frame(g, 35); assert.equal(CV.closeViewTurning(), false);
  CV.closeViewRecentre(g, now); frame(g, 2);
  const unrendered = CV.closeViewCamera(); g.setPaused(true, now);
  const stick = { x: .5, y: -1 }; assert.equal(CV.closeViewSteer(g, stick), false);
  assert.deepEqual(stick, { x: .5, y: -1 }, 'paused input is untouched');
  now += 5000; g.setPaused(false, now); frame(g);
  assert.deepEqual(CV.closeViewCamera(), unrendered, 'main can skip every paused render without advancing recenter');
  frame(g, 40);
});

test('turning out of an alcove recovers distance smoothly, with clear geometry and no overshoot', () => {
  const g = fixture('cellar'); g.player.x = 11; g.player.y = 5; g.save.closeViewAutoFollow = false;
  CV.resetCloseViewCamera(); frame(g);
  CV.closeViewPan((-Math.PI / 2 - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, now); frame(g, 180);
  const compressed = CV.closeViewCamera().distance; assert.ok(compressed < .5);
  assert.equal(CV.closeViewCamera().shoulder, 0);
  CV.closeViewPan(Math.PI / CV.CLOSE_VIEW.crescent.yaw, 0, now);
  let prior = compressed, largest = 0;
  for (let i = 0; i < 300; i++) {
    frame(g); clearEye(g); const d = CV.closeViewCamera().distance;
    assert.ok(d >= prior - 1e-9, 'recovery does not repeatedly reverse');
    assert.ok(d <= CV.closeViewPreset(g).distance + 1e-9, 'never zooms past the saved preset');
    largest = Math.max(largest, d - prior); prior = d;
  }
  assert.ok(prior > 2.6 && largest < .06, `gradual recovery: ${largest} tile maximum frame step`);
});

test('Game pause lifecycle freezes camera clocks with zero paused render or input callbacks', () => {
  const g = fixture(); frame(g, 40); g.player.attackReadyAt = 0; g.primaryAttack(now);
  const action = JSON.stringify(g.player.attackVisual), attackUntil = g.player.attackUntil;
  assert.equal(CV.closeViewQuickTurn(g, now), true); frame(g, 3); const before = CV.closeViewCamera();
  g.setPaused(true, now); now += 5000; g.setPaused(false, now); // exactly the scene/background path: no camera callbacks
  frame(g); assert.deepEqual(CV.closeViewCamera(), before); assert.equal(CV.closeViewTurning(), true);
  assert.equal(g.player.attackUntil, attackUntil + 5000, 'ordinary action clocks retain their exact existing shift');
  assert.equal(JSON.stringify(g.player.attackVisual), action, 'accepted attack metadata is unchanged');
  assert.equal(JSON.stringify(g.exportSnapshot(now)).includes('presentationPausedMs'), false, 'the presentation accumulator is never saved');
  frame(g, 40); assert.equal(CV.closeViewTurning(), false);
  CV.closeViewPan(0, 0, now); const yaw = CV.closeViewCamera().yaw;
  g.setPaused(true, now); now += 5000; g.setPaused(false, now); frame(g);
  frame(g, 70, () => { g.player.x += Math.cos(yaw + .8) * .008; g.player.y += Math.sin(yaw + .8) * .008; });
  assert.equal(CV.closeViewCamera().yaw, yaw, 'a callback-free pause does not consume manual-look grace');
});

// Minimal DOM with the production pointer handlers; a still captured pointer must retain manual ownership.
function controls(g, width = 390, height = 844, realButtons = false) {
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
  const boxes = realButtons ? [[1.28, 0, 1, 1], [.16, 1.12, 1, 1], [1.28, 1.12, 1, 1], [2.4, 1.12, 1.1, 1.1], [1.28, 2.24, 1, 1], [0, 2.52, 1.16, .72], [2.4, 2.52, 1.16, .72]].map(([x,y,w,h]) => ({ left: rect.left+x*50, top:rect.top+y*50, right:rect.left+(x+w)*50, bottom:rect.top+(y+h)*50, width:w*50, height:h*50 })) : [];
  const buttons = boxes.map((b) => ({ getBoundingClientRect: () => b })); actions.querySelectorAll = () => buttons; cluster.contains = (el) => buttons.includes(el);
  const host = { document: { getElementById: (id) => id === 'actions' ? actions : id === 'game' ? canvas : null, createElement: make, createElementNS: make }, performance: { now: () => now }, innerWidth: width, innerHeight: height, addEventListener() {} };
  const ui = CV.mountCloseViewControls(() => g, host); ui.sync();
  const fire = (type, x = 300) => { for (const f of canvas.listeners[type] || []) f({ type, pointerId: 7, pointerType: 'touch', clientX: x, clientY: 300, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} }); };
  return { ui, fire, rect, boxes };
}

test('a held manual thumb suppresses follow; release respects its grace then resumes assisted chase', () => {
  const g = fixture(), { ui, fire } = controls(g); fire('pointerdown');
  const yaw = CV.closeViewCamera().yaw, move = () => { g.player.y += .008; ui.sync(); };
  frame(g, 210, move); assert.equal(CV.closeViewCamera().yaw, yaw, '3.36 seconds with the camera thumb held still');
  fire('pointerup'); frame(g, Math.ceil(CV.CLOSE_VIEW.assist.delay / .016) - 1, move);
  assert.equal(CV.closeViewCamera().yaw, yaw, 'manual grace begins at release');
  frame(g, 240, move); assert.ok(wrap(CV.closeViewCamera().yaw - yaw) > 1, 'sustained travel is followed after grace');
});

test('a sustained right-angle movement turn is followed without steering feedback, with reduced motion and opt-out retained', () => {
  const witness = (reduce = false, enabled = true) => {
    const g = fixture(); g.presentation = { reduceMotion: reduce }; g.save.closeViewAutoFollow = enabled;
    const stick = { x: 1, y: 0 }, yaw = CV.closeViewCamera().yaw; let prior = yaw, largest = 0, first = null;
    frame(g, 330, () => {
      assert.equal(CV.closeViewSteer(g, stick), true);
      const world = { x: stick.x, y: stick.y }; if (!first) first = world; else assert.deepEqual(world, first, 'held stick keeps its world direction');
      g.player.x += world.x * .008; g.player.y += world.y * .008; CV.closeViewUnsteer(stick);
      const next = CV.closeViewCamera().yaw; largest = Math.max(largest, Math.abs(wrap(next - prior))); prior = next;
    });
    assert.ok(largest <= CV.CLOSE_VIEW.assist.maxRate * Math.PI / 180 * .016 + 1e-9);
    assert.deepEqual(stick, { x: 1, y: 0 }); return wrap(CV.closeViewCamera().yaw - yaw);
  };
  const normal = witness(), reduced = witness(true), disabled = witness(false, false);
  assert.ok(normal > 75 * Math.PI / 180 && normal <= Math.PI / 2, `90-degree turn follows within 15 degrees: ${normal}`);
  assert.ok(reduced > 0 && reduced < normal, 'reduced motion follows more slowly');
  assert.equal(disabled, 0, 'saved auto-follow opt-out wins');
});

function foe(g, id, dx, dy) {
  const e = { id, kind: 'hollowMarshal', x: g.player.x + dx, y: g.player.y + dy, hp: 50, maxHp: 50, scale: 1, dead: false };
  g.enemies.push(e); return e;
}

test('lock acquisition favors visible foes, has a nearby forward fallback and excludes hidden or blocked targets', () => {
  const g = fixture(); g.player.x = 17; g.player.y = 3; CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, 0, now - 10000); frame(g, 120);
  const side = foe(g, 'side', 1, 4), center = foe(g, 'center', 3, 0);
  const q = CV.closeViewProject(side.x + .5, side.y + .75, .7);
  assert.ok(q && (q.sx < 0 || q.sx > 390), 'fallback witness is outside the portrait view');
  assert.equal(CV.closeViewLockCandidate(g)?.id, center.id);
  center.hidden = true; assert.equal(CV.closeViewLockCandidate(g)?.id, side.id, 'nearby forward foe can be acquired without exact camera alignment');
  for (const key of ['hidden', 'untargetable', 'gloomVeil', 'dead', 'ambient', 'astralAllyOf']) {
    side[key] = true; assert.equal(CV.closeViewLockCandidate(g), null, key); side[key] = false;
  }
  side.x = g.player.x - 2; side.y = g.player.y; assert.equal(CV.closeViewLockCandidate(g), null, 'no blind target behind the player');
  center.hidden = false;
  const index = Math.floor(g.player.y + .75) * g.map.width + Math.floor(g.player.x + 1.5), tile = g.map.tiles[index];
  g.map.tiles[index] = { ...tile, kind: 'keepWall', blocked: true };
  assert.equal(CV.closeViewLockCandidate(g), null, 'nearby fallback never sees through a wall');
  g.map.tiles[index] = tile;
});

test('lock follows at melee distance, releases ineligible foes and does not track through the LOS grace', () => {
  const g = fixture(); frame(g, 40); const e = foe(g, 'near', .4, .3); g.lockTarget(e.id);
  const initial = CV.closeViewCamera().yaw; let prior = initial;
  for (let i = 0; i < 90; i++) { frame(g); const yaw = CV.closeViewCamera().yaw; assert.ok(Math.abs(wrap(yaw - prior)) <= CV.CLOSE_VIEW.lock.maxRate * Math.PI / 180 * .016 + 1e-9); prior = yaw; }
  assert.ok(CV.closeViewCamera().yaw > initial + .2, 'a foe within .75 tile still receives camera follow');
  e.x = g.player.x; e.y = g.player.y; const overlap = CV.closeViewCamera().yaw; frame(g, 10);
  assert.equal(CV.closeViewCamera().yaw, overlap, 'overlapping feet do not invent an eastward bearing');
  e.hidden = true; frame(g); assert.equal(g.lockedTarget(), null, 'newly hidden releases immediately'); e.hidden = false;
  e.x = g.player.x + 2; e.y = g.player.y; g.lockTarget(e.id); frame(g, 90);
  const index = Math.floor(g.player.y + .75) * g.map.width + Math.floor(g.player.x + 1.5), tile = g.map.tiles[index];
  g.map.tiles[index] = { ...tile, kind: 'keepWall', blocked: true }; e.y += .3;
  const before = CV.closeViewCamera().yaw; frame(g, 30);
  assert.equal(CV.closeViewCamera().yaw, before); assert.equal(g.lockedTarget()?.id, e.id, 'brief obstruction keeps the selected id');
  assert.equal(CV.closeViewIdleLockAim(g, now), null, 'visual facing cannot track through the wall');
  frame(g, 60); assert.equal(g.lockedTarget(), null, 'persistent obstruction releases'); g.map.tiles[index] = tile;
});

test('holding the camera thumb while locked preserves the selected-target spring', () => {
  const measure = (held) => {
    const g = fixture(); frame(g, 40); const e = foe(g, 'held-lock', .4, .3); g.lockTarget(e.id);
    const { ui, fire } = controls(g); if (held) fire('pointerdown');
    frame(g, 180, () => ui.sync()); const yaw = CV.closeViewCamera().yaw;
    if (held) fire('pointerup'); assert.equal(g.lockedTarget()?.id, e.id); return yaw;
  };
  const free = measure(false), held = measure(true);
  assert.ok(Math.abs(free - Math.atan2(.3, .4)) < .06);
  assert.ok(Math.abs(held - free) < 1e-9, `held thumb must not erase lock velocity: ${held} versus ${free}`);
});

test('locked visual facing respects committed action aim and never rewrites gameplay facing or snapshots', () => {
  const g = fixture(), e = foe(g, 'face', 2, 1); g.lockTarget(e.id);
  assert.deepEqual(CV.closeViewIdleLockAim(g, now), { x: 2, y: 1 });
  g.player.attackReadyAt = 0; g.primaryAttack(now);
  assert.equal(CV.closeViewPlayerAction(g, now).active, true, 'real accepted attack produces its own facing');
  const saved = JSON.stringify(g.save), facing = g.player.facing;
  const accepted = JSON.stringify(g.player.attackVisual); assert.equal(CV.closeViewIdleLockAim(g, now), null);
  e.y += .4; assert.equal(CV.closeViewIdleLockAim(g, now), null, 'moving lock cannot redirect an in-flight action');
  assert.equal(JSON.stringify(g.player.attackVisual), accepted); g.player.attackUntil = 0;
  for (const timer of ['castUntil', 'stunnedUntil']) { g.player[timer] = now + 100; assert.equal(CV.closeViewIdleLockAim(g, now), null); g.player[timer] = 0; }
  g.fistCharge = { direction: { x: -1, y: 0 } }; assert.equal(CV.closeViewIdleLockAim(g, now), null); g.fistCharge = null;
  assert.equal(g.player.facing, facing); assert.equal(JSON.stringify(g.save), saved);
});

test('Target requests an exact open-ground rear center while preserving accepted aim and held movement basis', () => {
  const g = fixture(); frame(g, 40); const originalXY = [g.player.x, g.player.y];
  for (const [x, y] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    g.save.lastAim = { x, y }; CV.closeViewPan(37, 0, now); assert.equal(CV.closeViewTargetActivate(g, now), null);
    frame(g, 90, () => { const neutral = { x: 0, y: 0 }; CV.closeViewSteer(g, neutral); g.update(.016, { state: neutral, consume: () => false, held: () => false }, now); CV.closeViewUnsteer(neutral); });
    const c = CV.closeViewCamera(), yaw = Math.atan2(y, x), px = g.player.x + .5, py = g.player.y + .75, rx = -Math.sin(yaw), ry = Math.cos(yaw);
    assert.ok(Math.abs(wrap(c.yaw - yaw)) < .01); assert.ok(Math.abs((c.x - px) * rx + (c.y - py) * ry) < 1e-5, 'open-ground eye is centered laterally');
    assert.ok(Math.abs(c.shoulder) < 1e-6 && Math.abs(c.rigOffset) < 1e-6); assert.equal(c.centeredRear, true);
  }
  g.save.lastAim = { x: 1, y: 0 }; g.player.attackReadyAt = 0; g.primaryAttack(now); const accepted = structuredClone(g.player.attackVisual), saved = structuredClone(g.save.lastAim); assert.ok(accepted);
  CV.closeViewPan(45, 0, now); CV.closeViewTargetActivate(g, now); frame(g, 35);
  assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - Math.atan2(accepted.aim.y, accepted.aim.x))) < .01, 'committed accepted aim owns body-facing recenter');
  assert.deepEqual(g.player.attackVisual, accepted); assert.deepEqual(g.save.lastAim, saved); assert.deepEqual([g.player.x, g.player.y], originalXY);
  const stick = { x: 0, y: -1 }; assert.equal(CV.closeViewSteer(g, stick), true); const held = { ...stick }, inputYaw = CV.closeViewCamera().inputYaw;
  CV.closeViewTargetActivate(g, now); frame(g, 8); assert.equal(CV.closeViewCamera().inputYaw, inputYaw, 'held movement basis stays latched during recenter'); assert.deepEqual(stick, held); CV.closeViewUnsteer(stick);
  CV.closeViewPan(20, 0, now); assert.equal(CV.closeViewCamera().centeredRear, false, 'later manual orbit immediately exits centered rear');
});

test('shared facing distinguishes native fallback from the nonzero imported entry blend', () => {
  const g = fixture(); frame(g, 40); g.player.attackReadyAt = 0; g.save.lastAim = { x: 0, y: -1 }; g.primaryAttack(now);
  const v = g.player.attackVisual; assert.ok(v); Object.assign(v, { profile: 'melee', weaponKind: 'cinder-pike', facingYaw: 0, aim: { x: 0, y: -1 }, durationMs: 240 });
  const phase = .04, remaining = v.durationMs * (1 - phase); g.player.attackUntil = g.player.actionVisualUntil = now + remaining;
  const blend = Math.min(1, phase / .08), smooth = blend * blend * (3 - 2 * blend), expected = -Math.PI / 2 * smooth;
  assert.ok(Math.abs(wrap(CV.closeViewPlayerFacingYaw(g, now) + Math.PI / 2)) < 1e-9, 'native fallback retains the full accepted aim');
  assert.ok(Math.abs(wrap(CV.closeViewPlayerFacingYaw(g, now, 0, { phase, importedReady: true }) - expected)) < 1e-9, 'ready imported renderer includes the first-eight-percent blend');
  for (const profile of ['fist', 'hammer']) { v.profile = profile; assert.ok(Math.abs(wrap(CV.closeViewPlayerFacingYaw(g, now, 0, { phase, importedReady: true }) - expected)) < 1e-9, `${profile} retains its existing entry blend`); }
  v.profile = 'melee';
  CV.closeViewPan(35, 0, now); CV.closeViewTargetActivate(g, now); frame(g, 90); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw + Math.PI / 2)) < .01, 'Target follows the actually active native fallback');
  assert.deepEqual(v.aim, { x: 0, y: -1 }); assert.equal(v.facingYaw, 0);
});

test('centered Target keeps the existing obstruction escape and camera safety', () => {
  const g = fixture('cellar'); g.player.x = 11; g.player.y = 5; g.save.lastAim = { x: 0, y: -1 }; CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewTargetActivate(g, now); frame(g, 240); const c = CV.closeViewCamera(); assert.equal(c.centeredRear, true); clearEye(g);
  assert.ok(c.distance > 0 && c.distance <= CV.closeViewPreset(g).distance); assert.ok(Math.abs(c.rigOffset) <= CV.closeViewPreset(g).shoulder + 1e-9, 'bounded existing lateral rig is retained under obstruction');
});

test('Target acquires from the pre-recenter view, recenters on acquire and unlock, and rejects hidden input', () => {
  const g = fixture(); frame(g, 40); CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, 0, now); const e = foe(g, 'target-command', 2, 0); assert.equal(CV.closeViewLockCandidate(g)?.id, e.id);
  assert.equal(CV.closeViewTargetActivate(g, now)?.id, e.id); frame(g, 90); assert.equal(g.lockedTarget()?.id, e.id); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw)) < .01);
  g.save.lastAim = { x: 0, y: -1 }; assert.equal(CV.closeViewTargetActivate(g, now), null); frame(g, 90); assert.equal(g.lockedTarget(), null); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw + Math.PI / 2)) < .01, 'unlock activation still recenters');
  const before = CV.closeViewCamera(); g.paused = true; assert.equal(CV.closeViewTargetActivate(g, now), null); assert.deepEqual(CV.closeViewCamera(), before); g.paused = false;
  g.save.closeView = false; assert.equal(CV.closeViewTargetActivate(g, now), null); assert.equal(g.lockedTarget(), null, 'hidden controls cannot queue a Target command'); g.save.closeView = true;
  CV.resetCloseViewCamera(); frame(g, 2); g.presentation = { reduceMotion: true }; g.save.lastAim = { x: -1, y: 0 }; CV.closeViewTargetActivate(g, now); frame(g, 110); assert.ok(Math.abs(Math.abs(CV.closeViewCamera().yaw) - Math.PI) < .01, 'reduced motion retains exact centered destination');
});

test('one raw-distance switch per gesture is independent of camera sensitivity and acceleration', () => {
  for (const mode of ['drag', 'crescent']) for (const sensitivity of [.4, 2.5]) {
    const g = fixture(); frame(g, 40); g.save.closeViewSensitivity = sensitivity; g.save.closeViewCamera = mode;
    const mid = foe(g, 'mid', 2, 0), right = foe(g, 'right', 2, .6); foe(g, 'further', 2, 1.2); g.lockTarget(mid.id);
    const control = controls(g), { ui, rect } = control;
    const fire = mode === 'drag' ? control.fire : (type, px) => {
      const radius = rect.width / 2 + CV.CLOSE_VIEW.crescent.gap, angle = -Math.PI / 2 + (px - 260) / radius;
      for (const fn of ui.svg.children[1].listeners[type] || []) fn({ pointerId: 7, clientX: rect.left + rect.width / 2 + radius * Math.cos(angle), clientY: rect.top + rect.height / 2 + radius * Math.sin(angle), preventDefault() {}, stopPropagation() {} });
    };
    fire('pointerdown', 260);
    now += 1; fire('pointermove', 280); ui.sync(); assert.equal(g.lockedTarget()?.id, mid.id, '20 raw pixels is below threshold even at high sensitivity');
    now += 80; fire('pointermove', 290); ui.sync(); assert.equal(g.lockedTarget()?.id, right.id);
    now += 80; fire('pointermove', 380); ui.sync(); assert.equal(g.lockedTarget()?.id, right.id, 'long stroke does not cycle past the selected neighbor');
    fire('pointerup', 380); fire('pointerdown', 350); now += 80; fire('pointermove', 320); ui.sync();
    assert.equal(g.lockedTarget()?.id, mid.id, 'a fresh left gesture switches back'); fire('pointerup', 320);
  }
});

test('lock touch target is reachable, clear of buttons and accepts thumb drift in portrait, landscape and crescent layouts', () => {
  for (const [w, h] of [[390,844], [844,390]]) for (const mode of ['drag', 'crescent']) {
    const g = fixture(); g.save.closeViewCamera = mode; frame(g, 40); foe(g, 'tap', 2, 0);
    const { ui, rect, boxes } = controls(g, w, h, true), size = parseFloat(ui.lock.style.width), left = parseFloat(ui.lock.style.left), top = parseFloat(ui.lock.style.top);
    assert.ok(size >= 52 && left >= 0 && left + size <= w && top >= 0 && top + size <= h);
    for (const b of boxes) assert.ok(left + size <= b.left || left >= b.right || top + size <= b.top || top >= b.bottom, `${mode} lock clear of action at ${w}×${h}`);
    if (mode === 'drag') assert.ok(top >= rect.top - 8, 'default button uses the reachable upper-right cell');
    else assert.ok(top + size < rect.top, 'crescent option keeps its lock outside the rail');
    const event = (x) => ({ pointerId: 99, clientX: x, clientY: top + size / 2, preventDefault() {}, stopPropagation() {} });
    ui.lock.listeners.pointerdown[0](event(left + size / 2)); ui.lock.listeners.pointerup[0](event(left + size / 2 + 14));
    assert.equal(g.lockedTarget()?.id, 'tap', '14 px of thumb drift still activates lock');
  }
});


test('lock button accepts semantic activation and handles each pointer sequence at most once', () => {
  const g = fixture(); frame(g, 40); foe(g, 'semantic', 2, 0);
  const { ui } = controls(g), button = ui.lock, hostListeners = {};
  const input = createInput({ querySelector: () => ({}), querySelectorAll: () => [], addEventListener() {} }, {
    addEventListener(type, fn) { (hostListeners[type] ||= []).push(fn); },
  });
  const send = (type, values = {}) => {
    const e = { type, defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
    for (const fn of button.listeners[type] || []) fn(e);
    if (!e.stopped) for (const fn of hostListeners[type] || []) fn(e);
    if (type === 'keydown' || type === 'keyup') { assert.equal(e.stopped, true, 'activation key stays with the button'); assert.equal(e.defaultPrevented, false, 'native semantic click remains enabled'); }
    return e;
  };
  const locked = () => g.lockedTarget()?.id === 'semantic';
  assert.match(button.attrs['aria-label'], /Target and recenter/);
  const click = () => send('click', { detail: 0 }); // HTMLElement.click() / AT, no pointer provenance
  click(); assert.equal(locked(), true, 'programmatic and AT semantic click activates');
  // Native buttons produce a click for Enter and for Space release. Handlers must
  // consume that click once, without inventing a second keyboard activation.
  send('keydown', { key: 'Enter' }); send('click', { detail: 0, pointerId: -1 }); send('keyup', { key: 'Enter' });
  assert.equal(locked(), false, 'Enter semantic click releases exactly once');
  send('keydown', { key: ' ' }); send('keyup', { key: ' ' }); send('click', { detail: 0, pointerId: -1 });
  assert.equal(locked(), true, 'Space semantic click acquires exactly once'); click();
  input.update(); for (const action of ['attack', 'jump', 'dodge']) { assert.equal(input.held(action), false); assert.equal(input.consume(action), false, `keyboard lock never triggers global ${action}`); }
  const pointer = (type, x = 100, id = 99) => send(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 100 });
  pointer('pointerdown'); pointer('pointerup', 114);
  assert.equal(locked(), true, 'original 14px drift allowance');
  send('click', { detail: 1, pointerId: 99 }); assert.equal(locked(), true, 'compatibility click cannot undo pointer tap');
  click(); assert.equal(locked(), false, 'semantic activation remains usable immediately after a pointer tap');
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pointer('pointerdown'); pointer('pointermove', 130); pointer('pointermove', 100); pointer(ending);
    if (ending !== 'pointerup') pointer('pointerup');
    send('click', { detail: 1, pointerId: 99 });
    assert.equal(locked(), false, `${ending}: moved/cancelled capture cannot later click-toggle`);
    click(); assert.equal(locked(), true, `${ending}: no stale suppression of the next AT activation`); click();
  }
  pointer('pointerdown'); pointer('pointerdown', 100, 100); pointer('pointerup', 100, 100);
  send('click', { detail: 1, pointerId: 100 }); assert.equal(locked(), false, 'rejected second pointer cannot activate');
  pointer('pointerup'); send('click', { detail: 1, pointerId: 99 }); assert.equal(locked(), true, 'owning pointer still activates once');
});
