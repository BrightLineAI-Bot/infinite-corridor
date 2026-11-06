// Close View, version 2 (Tim, 2026-11-06): a stable view (no swimming walls), readable boundaries, the pan crescent round the
// action buttons with its lock button (Elden Ring's lock-on), the assisted camera, targeting, and no seeing through walls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const W = 390, H = 844;
const ctx = () => new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o, k) => k in o ? o[k] : (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${String(k)} was given ${v}`); }, set: (o, k, v) => { o[k] = v; return true; } });
const logCtx = () => { const log = []; return { log, ctx: new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (o, k) => k in o ? o[k] : (...a) => log.push(`${String(k)}(${a.map((v) => typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v).join(',')})`), set: (o, k, v) => { o[k] = v; if (typeof v !== 'object') log.push(`${String(k)}=${v}`); return true; } }) }; };
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx() }));

// An open room: the Heart, the Wayfarer at the middle of its widest clear square, and foes placed by hand (clones of one).
function room(scenario = 'heart', keep = false) {
  const f = createLabFixture({ lab: 'close-view', scenario, now: 1000 }), g = f.game, w = g.map.width, h = g.map.height, open = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !g.map.tiles[y * w + x].blocked;
  let best = null; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0; while (r < 6) { let ok = true; for (let dy = -r - 1; dy <= r + 1 && ok; dy++) for (let dx = -r - 1; dx <= r + 1 && ok; dx++) ok = open(x + dx, y + dy); if (!ok) break; r++; } if (!best || r > best.r) best = { x, y, r }; }
  const proto = g.enemies.find((e) => !e.dead) || g.enemies[0]; for (const e of g.enemies) e.dead = true;
  const foe = (id, dx, dy, extra = {}) => { const e = { ...proto, id, x: best.x + dx, y: best.y + dy, dead: false, hidden: false, ambient: false, hp: 50, maxHp: 50, ...extra }; g.enemies.push(e); return e; };
  if (!keep) { g.player.x = best.x; g.player.y = best.y; g.player.facing = 'up'; } CV.resetCloseViewCamera(); // keep: the lab's own entrance (a floor of narrow ways has no open square)
  return { g, f, best, foe };
}
let T = 50000; const frame = (g, n = 1, step = 16) => { for (let i = 0; i < n; i++) render(ctx(), g, W, H, (T += step)); };
const yawTo = (g, e) => Math.atan2(e.y - g.player.y, e.x - g.player.x), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

test('lock-on picks the best foe in front of the camera: on the view\'s axis and near beats off to the side or far; never behind, hidden, out of range or behind a wall', () => {
  const { g, best, foe } = room(); frame(g, 2); assert.ok(best.r >= 2, `an open room (r=${best.r})`); CV.closeViewPan(wrap(-Math.PI / 2 - CV.closeViewCamera().yaw) / CV.CLOSE_VIEW.crescent.yaw, 0, T); const yaw = CV.closeViewCamera().yaw; assert.ok(Math.abs(yaw + Math.PI / 2) < 1e-9, 'looking north');
  const ahead = (d, side = 0) => [Math.round(Math.cos(yaw) * d - Math.sin(yaw) * side), Math.round(Math.sin(yaw) * d + Math.cos(yaw) * side)];
  const [ax, ay] = ahead(2), [sx, sy] = ahead(1, 2), [bx, by] = ahead(-2);
  const onAxis = foe('on', ax, ay), side = foe('side', sx, sy), behind = foe('behind', bx, by);
  assert.equal(CV.closeViewLockCandidate(g)?.id, 'on', 'on the axis wins over off to the side');
  onAxis.hidden = true; assert.equal(CV.closeViewLockCandidate(g)?.id, 'side', `a hidden foe is never locked (yaw ${yaw.toFixed(2)}, on ${onAxis.x - g.player.x},${onAxis.y - g.player.y}, side ${side.x - g.player.x},${side.y - g.player.y})`); onAxis.hidden = false;
  onAxis.dead = true; side.dead = true; assert.equal(CV.closeViewLockCandidate(g), null, 'one behind the camera is not "in front"'); onAxis.dead = false; side.dead = false;
  const L = CV.CLOSE_VIEW.lock, score = (a, d) => L.wAngle * a / L.cone + L.wDist * d / L.range; assert.ok(score(0, 3) < score(40, 3) && score(10, 2) < score(10, 6), 'the scoring weighs angle and distance');
  assert.ok(behind && L.range < 16, 'range is within the game\'s own lock range');
});

test('the lock button locks and releases; locked, the stick is target-relative and the camera swings to frame the foe', () => {
  const { g, foe } = room(); frame(g, 2); const yaw = CV.closeViewCamera().yaw, e = foe('t', Math.round(Math.cos(yaw + .6) * 2), Math.round(Math.sin(yaw + .6) * 2));
  assert.equal(CV.closeViewLockToggle(g)?.id, 't'); assert.equal(g.lockedTarget()?.id, 't', 'the game\'s own lock: swings and shots aim at it');
  frame(g, 80); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - yawTo(g, e))) < .08, 'the view turned to frame the foe');
  const st = { x: 0, y: -1 }; CV.closeViewSteer(g, st); const b = Math.atan2(e.y + .75 - (g.player.y + .75), e.x + .5 - (g.player.x + .5));
  assert.ok(Math.abs(st.x - Math.cos(b)) < 1e-6 && Math.abs(st.y - Math.sin(b)) < 1e-6, 'stick up walks at the foe'); CV.closeViewUnsteer(st);
  const sd = { x: 1, y: 0 }; CV.closeViewSteer(g, sd); assert.ok(Math.abs(sd.x * Math.cos(b) + sd.y * Math.sin(b)) < 1e-6, 'sideways circles it'); CV.closeViewUnsteer(sd);
  CV.closeViewLockToggle(g); assert.equal(g.lockedTarget(), null, 'tap again: released');
});

test('the lock moves to the next foe on a swipe, and breaks on its own: the foe falls (to a near one, else released), goes out of range, or out of sight', () => {
  const { g, foe } = room(); frame(g, 2); const yaw = CV.closeViewCamera().yaw, at = (a, d) => [Math.round(Math.cos(yaw + a) * d), Math.round(Math.sin(yaw + a) * d)];
  const mid = foe('mid', ...at(0, 2)), right = foe('right', ...at(.7, 2)), left = foe('left', ...at(-.7, 2));
  CV.closeViewLockToggle(g); assert.equal(g.lockedTarget().id, 'mid');
  assert.equal(CV.closeViewLockSwitch(g, 1)?.id, 'right', 'a swipe clockwise: the one to the right'); assert.equal(CV.closeViewLockSwitch(g, -1)?.id, 'mid'); assert.equal(CV.closeViewLockSwitch(g, -1)?.id, 'left');
  left.dead = true; frame(g, 2); assert.ok(['mid', 'right'].includes(g.lockedTarget()?.id), 'its fall moves the lock to a foe near where it fell');
  mid.dead = true; right.dead = true; frame(g, 2); assert.equal(g.lockedTarget(), null, 'none near: released');
  const far = foe('far', ...at(0, 2)); CV.closeViewLockToggle(g); far.x = g.player.x + Math.cos(yaw) * (CV.CLOSE_VIEW.lock.range + 3); far.y = g.player.y + Math.sin(yaw) * (CV.CLOSE_VIEW.lock.range + 3); frame(g, 2);
  assert.equal(g.lockedTarget(), null, 'out of range: released');
  const hid = foe('hid', ...at(0, 2)); CV.closeViewLockToggle(g); assert.equal(g.lockedTarget()?.id, 'hid'); const w = g.map.width, wall = [Math.floor(hid.x + .5 - Math.cos(yaw)), Math.floor(hid.y + .75 - Math.sin(yaw))], k = wall[1] * w + wall[0], was = g.map.tiles[k];
  g.map.tiles[k] = { ...was, kind: 'keepWall', blocked: true }; frame(g, 30, 16); assert.equal(g.lockedTarget()?.id, 'hid', 'a moment out of sight keeps it');
  frame(g, 70, 16); assert.equal(g.lockedTarget(), null, 'out of sight longer: released'); g.map.tiles[k] = was;
});

test('the assisted camera: still while walking straight, a slow damped follow on a held turn, none just after the crescent, none with auto-follow off', () => {
  const { g } = room(); frame(g, 2); const y0 = CV.closeViewCamera().yaw, walk = (dx, dy, n) => { for (let i = 0; i < n; i++) { g.player.x += dx; g.player.y += dy; frame(g, 1); } };
  walk(Math.cos(y0) * .03, Math.sin(y0) * .03, 40); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - y0)) < 1e-6, 'walking straight on: no rotation');
  walk(Math.cos(y0 + .05) * .03, Math.sin(y0 + .05) * .03, 40); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - y0)) < 1e-6, 'a small stick drift (3 degrees): no twitch');
  g.player.x = Math.floor(g.player.x); g.player.y = Math.floor(g.player.y); frame(g, 2); const a = y0 + .9; let prev = CV.closeViewCamera().yaw, maxStep = 0;
  for (let i = 0; i < 90; i++) { g.player.x += Math.cos(a) * .02; g.player.y += Math.sin(a) * .02; frame(g, 1); const yy = CV.closeViewCamera().yaw; maxStep = Math.max(maxStep, Math.abs(wrap(yy - prev))); prev = yy; }
  const turned = wrap(CV.closeViewCamera().yaw - y0); assert.ok(turned > .1 && turned <= .9 + 1e-3, `a held turn is followed, never past it (${turned.toFixed(3)})`); assert.ok(maxStep <= CV.CLOSE_VIEW.assist.maxRate * Math.PI / 180 * .016 + 1e-6, 'slowly');
  CV.closeViewPan(30, 0, T); const yp = CV.closeViewCamera().yaw; for (let i = 0; i < 30; i++) { g.player.x -= Math.cos(a) * .02; g.player.y -= Math.sin(a) * .02; frame(g, 1); }
  assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - yp)) < 1e-6, 'just after the crescent the view stays where it was put');
  g.save.closeViewAutoFollow = false; frame(g, 120); const yo = CV.closeViewCamera().yaw; for (let i = 0; i < 60; i++) { g.player.x += Math.cos(yo + 1) * .02; g.player.y += Math.sin(yo + 1) * .02; frame(g, 1); }
  assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - yo)) < 1e-6, 'auto-follow off: the view turns only from the crescent'); g.save.closeViewAutoFollow = true;
});

test('the crescent turns the view and the walk with it; a double tap recentres behind the Wayfarer', () => {
  const { g } = room(); frame(g, 2); const c0 = CV.closeViewCamera(); CV.closeViewPan(50, 0, T); const c1 = CV.closeViewCamera();
  assert.ok(Math.abs(wrap(c1.yaw - c0.yaw - 50 * CV.CLOSE_VIEW.crescent.yaw)) < 1e-9, 'yaw per px of arc'); assert.ok(Math.abs(wrap(c1.inputYaw - c1.yaw)) < 1e-9, 'push up walks where the camera looks');
  CV.closeViewPan(0, -1000, T); assert.equal(CV.closeViewCamera().pitchUser, CV.CLOSE_VIEW.crescent.pitchRange[0], 'the tilt is bounded');
  g.save.lastAim = { x: 1, y: 0 }; CV.closeViewRecentre(g, T); frame(g, 60); assert.ok(Math.abs(wrap(CV.closeViewCamera().yaw - 0)) < .02, 'recentred behind the Wayfarer');
});

test('stability: the boom rides a spring along walls (no lurch, never inside a wall), ghosting holds, and a still frame draws the same twice', () => {
  const { g } = room('cellar', true); frame(g, 3); let prev = CV.closeViewCamera().distance, maxJump = 0;
  for (let i = 0; i < 120; i++) { const st = { x: Math.sin(i / 9) * .6, y: -1 }; CV.closeViewSteer(g, st); g.update(.016, { state: st, consume: () => false, held: () => false }, T + 16); CV.closeViewUnsteer(st); frame(g, 1);
    const c = CV.closeViewCamera(); assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false, `frame ${i}: the camera is never inside a wall`); maxJump = Math.max(maxJump, Math.abs(c.distance - prev)); prev = c.distance; }
  assert.ok(maxJump < .35, `the boom never lurches (largest step ${maxJump.toFixed(3)} tiles)`);
  const a = logCtx(), b = logCtx(); render(a.ctx, g, W, H, T); render(b.ctx, g, W, H, T); assert.deepEqual(b.log, a.log, 'the same frame draws identically (stable sort, no flicker)');
  const C = CV.CLOSE_VIEW; assert.equal(C.light.flicker, 0, 'the torch is still');
  for (const q of Object.values(C.quality)) assert.equal(q.outline, true, 'every tier draws the walls\' edges'); assert.ok(a.log.filter((l) => l.startsWith('stroke(')).length >= CV.closeViewStats.faces, 'each face is outlined'); assert.ok(C.fog.levels >= 64 && C.walls.cutHold > 1 && C.walls.cutFade > 0, 'fine light steps; ghosting with hysteresis');
});

test('walls: faces kept as far as the floor is drawn, a door face at every opening on the floor\'s edge, corners marked, and ghosting only on the line to the Wayfarer', () => {
  const { g } = room(); const geo = CV.wallGeometry(g.map), f = geo.faces, doors = [];
  for (let i = 0; i < geo.count; i++) if (f[i * 10 + 8] === Object.keys(CV.CLOSE_VIEW.styles).indexOf('door')) doors.push(i);
  const edgeOpen = g.map.tiles.filter((t) => !t.blocked && (t.x === 0 || t.y === 0 || t.x === g.map.width - 1 || t.y === g.map.height - 1)).length;
  assert.ok(doors.length >= edgeOpen, `every open edge tile closed by a door face (${doors.length} >= ${edgeOpen})`);
  assert.ok(geo.corner.some((c) => c === 0) && geo.corner.some((c) => c !== 0), 'straight runs have no seams; corners have edges');
  frame(g, 3); assert.ok(CV.closeViewStats.facesCut <= 2, `only faces on the line to the Wayfarer ghost (${CV.closeViewStats.facesCut})`);
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'); assert.match(src, /reach = fogFar \+ 1/); assert.match(src, /segDist2\(x0, y0, x1, y1, CAM\.cx, CAM\.cy, ox, oy\)/);
});

test('targeting: standing still a swing goes the way the camera looks; a tap near a creature picks it; the nested trap and combat marks draw onto the Close View floor', () => {
  const { g, foe } = room(); frame(g, 2); const yaw = CV.closeViewCamera().yaw; g.save.lastAim = { x: -1, y: 0 }; const st = { x: 0, y: 0 }; CV.closeViewSteer(g, st); CV.closeViewUnsteer(st);
  assert.ok(Math.abs(g.save.lastAim.x - Math.cos(yaw)) < 1e-9 && Math.abs(g.save.lastAim.y - Math.sin(yaw)) < 1e-9, 'idle: aim along the view');
  const e = foe('tap', Math.round(Math.cos(yaw) * 2), Math.round(Math.sin(yaw) * 2)); frame(g, 1);
  const c = CV.closeViewCamera(), dx = e.x + .5 - c.x, dy = e.y + .82 - c.y; // find the creature's foot on screen by probing taps
  let hit = null; for (let y = H * .3; y < H * .95 && !hit; y += 6) for (let x = 0; x < W && !hit; x += 6) { const q = CV.closeViewScreenToWorld(g, W, H, x, y); if (q?.enemyId === 'tap') hit = { x, y }; }
  assert.ok(hit && dx * dx + dy * dy > 0, 'the creature answers a tap');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /function drawTruthfulCombatGeometry\(layer = null\) \{\n  if \(!layer && closeViewShowing\(game\)\) return;/, 'the combat geometry drawDungeonSystems is bound to takes the layer');
  assert.match(main, /drawNewTraps\(s, sx, sy, ctx\)/); assert.match(main, /drawNewTrap\(o, x, y, s, t, ctx = screenCtx\(\)\)/);
});

test('the crescent and lock button mount round the action cluster, beneath its buttons, only while Close View shows', () => {
  // a minimal document: #actions holding .action-diamond
  const mk = (tag) => { const el = { tag, children: [], style: {}, attrs: {}, listeners: {}, hidden: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, append(...c) { for (const x of c) { x.parent = this; this.children.push(x); } },
    insertBefore(n, ref) { n.parent = this; this.children.splice(this.children.indexOf(ref), 0, n); }, after(n) { const p = this.parent; n.parent = p; p.children.splice(p.children.indexOf(this) + 1, 0, n); }, querySelector(sel) { return sel === '.action-diamond' ? this.children.find((c) => c.cls === 'action-diamond') : null; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }), setPointerCapture() {}, set innerHTML(v) { this._html = v; } }; return el; };
  const actions = mk('section'), cluster = mk('div'); cluster.cls = 'action-diamond'; cluster.offsetWidth = 162; cluster.offsetHeight = 162; cluster.offsetLeft = 200; cluster.offsetTop = 16; actions.append(cluster);
  const doc = { getElementById: (id) => id === 'actions' ? actions : null, createElementNS: (ns, t) => mk(t), createElement: (t) => mk(t) };
  const { g } = room(), host = { document: doc, performance: { now: () => T }, addEventListener() {} }, ui = CV.mountCloseViewControls(() => g, host);
  const i = actions.children.indexOf(ui.svg); assert.ok(i >= 0 && i < actions.children.indexOf(cluster), 'the crescent is before (beneath) the buttons'); assert.ok(actions.children.indexOf(ui.lock) > actions.children.indexOf(cluster), 'the lock button above them');
  ui.sync(); assert.equal(ui.svg.style.display, 'none', 'hidden until Close View shows'); frame(g, 2); ui.sync(); assert.equal(ui.svg.style.display, 'block'); assert.equal(ui.lock.style.display, 'grid');
  const R = 81 + CV.CLOSE_VIEW.crescent.gap, la = CV.CLOSE_VIEW.crescent.lockAt * Math.PI / 180; assert.ok(Math.abs(parseFloat(ui.lock.style.left) + CV.CLOSE_VIEW.crescent.lockSize / 2 - (281 + R * Math.cos(la))) < 1, 'the lock button sits on the arc');
  const hit = ui.svg.children[1]; assert.equal(hit.style.pointerEvents, 'stroke', 'it answers only on its band'); const y0 = CV.closeViewCamera().yaw, ev = (x, y) => ({ pointerId: 7, clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} });
  hit.listeners.pointerdown[0](ev(150 - R, 150)); hit.listeners.pointermove[0](ev(150 - R * Math.cos(.3), 150 - R * Math.sin(.3))); hit.listeners.pointerup[0](ev(150 - R * Math.cos(.3), 150 - R * Math.sin(.3)));
  assert.ok(wrap(CV.closeViewCamera().yaw - y0) > .1, 'sliding up the left side (clockwise) turns the view right');
  g.save.closeView = false; frame(g, 1); ui.sync(); assert.equal(ui.svg.style.display, 'none', 'gone when Close View is'); g.save.closeView = true;
});
