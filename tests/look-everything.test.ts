import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';

// Look at everything (Tim, 2026-11-13: "it's the exploration / inspection world... We should be able to check everything and
// look at everything"): every captured draw can be Look mode's subject (creatures and world beasts framed by their size,
// trees, props, any other object, a drawn body), a tap in Look mode picks what is under it (or aims at the ground or a solid
// there) and never attacks, interacts or moves, and the pick in front reaches farther as the zoom closes. Drives the
// production camera without a GPU, as look-zoom.test.ts does.
const ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
  get: (o, k) => k in o ? o[k] : (...args) => { for (const v of args) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)}: ${v}`); },
  set: (o, k, v) => { o[k] = v; return true; },
});
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
const L = CV.CLOSE_VIEW.camera.look, W = 475, H = 661, DEG = Math.PI / 180;
let now = 900000;
let extras = [];
// The renderer's capture: the Wayfarer and the extra draws (an object, a creature or a body) become the frame's draws.
const drawOf = (o) => o.enemy ? { x: o.x, y: o.y, enemy: o.enemy, fn() {} } : o.aux ? { x: o.x, y: o.y, nativeAux: { source: o.aux, sample() { return null; } }, nativeHeight: o.height, fn() {} } : { x: o.x, y: o.y, object: o, fn() {} };
function base(g) { return () => { const player = { x: g.player.x, y: g.player.y, fn() {} }; CV.closeViewTake([...extras.map(drawOf), player], player); }; }
function frame(g, n = 1) { for (let i = 0; i < n; i++) { now += 16; assert.equal(CV.closeViewFrame(ctx, g, W, H, now, base(g)), true); CV.closeViewLookGuard(g); } }
// The heart's floor (27 x 19): row 8 is open from x 7 to x 20, a long hall to look down.
// `open`: the floor's inner walls taken away first (its border kept), a hall 25 x 17 to look across.
function fixture(x = 9, y = 8, scenario = 'heart', open = false) {
  const g = createLabFixture({ lab: 'close-view', scenario, now: 1000 }).game;
  g.enemies = []; g.save.closeViewAutoFollow = false; extras = [];
  if (open) { const w = g.map.width, h = g.map.tiles.length / w, floor = g.map.tiles.find((t) => !t.blocked).kind; for (const t of g.map.tiles) if (t.x > 0 && t.y > 0 && t.x < w - 1 && t.y < h - 1 && t.blocked) { t.blocked = false; t.kind = floor; } }
  g.player.x = x; g.player.y = y;
  CV.resetCloseViewCamera(); frame(g, 2);
  CV.closeViewPan(-CV.closeViewCamera().yaw / CV.CLOSE_VIEW.crescent.yaw, -CV.closeViewCamera().pitchUser / CV.CLOSE_VIEW.crescent.pitch, now - 10000); // look east
  frame(g, 60);
  return g;
}
const beast = (x, y, kind = 'crimsonTyrant', more = {}) => ({ x, y, enemy: { id: `look-${kind}-${x}`, kind, x, y, hp: 500, maxHp: 500, bodyRadius: 1.6, scale: 3, boss: true, ...more } });
const small = (x, y) => ({ x, y, enemy: { id: `look-rat-${x}`, kind: 'rat', x, y, hp: 5, maxHp: 5 } });
function clearLine(g, ax, ay, bx, by) { for (let j = 1; j <= 40; j++) assert.equal(CV.closeViewWallAt(g.map, ax + (bx - ax) * j / 40, ay + (by - ay) * j / 40), false, `clear line ${j}`); }
const flat = (c, s) => Math.hypot(c.x - s.focus[0], c.y - s.focus[1]);
function on(g) { CV.closeViewLookSet(g, true); frame(g, 2); assert.equal(CV.closeViewLookActive(), true); }
function off(g) { CV.closeViewLookSet(g, false, true); frame(g, 2); }
// the screen point of a world point in the last frame (the tap's own projection)
function screen(x, y, z) { const q = CV.closeViewProject(x, y, z); assert.ok(q, 'in view'); return q; }

test('the data: reach, framing and the tap are tables, bounded', () => {
  assert.ok(L.reachZoom > 0 && L.range + L.reachZoom <= 9, 'the pick reaches farther with the zoom, but not across the world');
  assert.ok(L.reachBig >= 1 && (L.range + L.reachZoom) * L.reachBig <= 12.5, 'a big subject at most about 12 tiles');
  assert.ok(L.standOff >= 6 && L.standOff <= 12 && L.fit > 0 && L.fitAt > 0 && L.fitAt < 1, 'a very big subject is stood off from, within the boom');
  assert.ok(Number.isInteger(L.cands) && L.cands >= 32 && L.cands <= 256, 'a fixed table for the tap');
  assert.ok(L.rayStep > 0 && L.rayFar / L.rayStep <= 600, 'a bounded ray');
  assert.ok(L.sceneryCone < L.cone && L.sceneryBias >= 1, 'scenery only nearly dead ahead, characters and creatures first');
  for (const k of ['hero', 'folk', 'creature', 'thing', 'tree', 'structure', 'scenery', 'body']) assert.ok(L[k].mid < L[k].face && L[k].near > 0, k);
});

test('a world beast is framed whole by its size, from farther away, then closer toward its head', () => {
  // the 'close' preset (the shortest boom): a giant a tile in front is too big for the normal eye's distance
  const g = fixture(6, 8, 'heart', true); g.save.closeViewPreset = 'close'; frame(g, 60); const px = g.player.x + .5, py = g.player.y + .75;
  const giant = (x, y) => beast(x, y, 'lightningGiant', { bodyRadius: 2.5, scale: 3 });
  extras = [giant(g.player.x + 1, g.player.y)]; on(g);
  CV.closeViewLookZoomTo(L.fitAt); frame(g, 160);
  let s = CV.closeViewLookState(); assert.equal(s.subject, 'creature'); assert.equal(s.key, extras[0].enemy);
  assert.ok(s.size >= 4, `its size is its own (${s.size})`); assert.ok(Math.abs(s.fit - Math.min(L.standOff, s.size * L.fit)) < 1e-9);
  const whole = CV.closeViewCamera(), wholeD = flat(whole, s), wholeZ = s.focus[2];
  assert.equal(CV.closeViewWallAt(g.map, whole.x, whole.y), false); clearLine(g, s.focus[0], s.focus[1], whole.x, whole.y);
  // the same spot with a rat: framed far nearer
  off(g); extras = [small(g.player.x + 1, g.player.y)]; on(g); CV.closeViewLookZoomTo(L.fitAt); frame(g, 160);
  const r = CV.closeViewLookState(); assert.equal(r.subject, 'creature'); const ratD = flat(CV.closeViewCamera(), r);
  assert.ok(wholeD > ratD + .8, `the beast is framed from farther away (${wholeD.toFixed(2)} vs ${ratD.toFixed(2)})`);
  assert.ok(wholeD >= Math.min(s.fit, L.standOff) * Math.cos(L.pitch * DEG) * .9, `backed off to frame it whole (${wholeD.toFixed(2)}, fit ${s.fit.toFixed(2)})`);
  const ratNear = (() => { CV.closeViewLookZoomTo(1); frame(g, 200); return flat(CV.closeViewCamera(), CV.closeViewLookState()); })();
  off(g); extras = [giant(g.player.x + 1, g.player.y)]; on(g);
  CV.closeViewLookZoomTo(1); frame(g, 200); s = CV.closeViewLookState(); const c = CV.closeViewCamera();
  assert.ok(s.focus[2] > wholeZ + 1, `closer pinches aim up toward the head (${wholeZ.toFixed(2)} -> ${s.focus[2].toFixed(2)})`);
  assert.ok(s.near >= s.size * L.nearShare - 1e-9, 'never nearer than its size allows');
  assert.ok(flat(c, s) > ratNear + .5, `at full zoom too the giant is seen from farther than a rat (${flat(c, s).toFixed(2)} vs ${ratNear.toFixed(2)})`);
  assert.ok(Math.abs(flat(c, s) - Math.min(s.near * Math.cos(L.pitch * DEG), flat(c, s))) < .05);
  assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false); clearLine(g, s.focus[0], s.focus[1], c.x, c.y);
  void px; void py;
});

test('the pick in front reaches farther as the zoom closes, and farther again for a big subject', () => {
  let g = fixture(4, 8, 'heart', true);
  extras = [small(g.player.x + 5.5, g.player.y)]; on(g); frame(g, 3);
  assert.equal(CV.closeViewLookState().subject, 'wayfarer', 'at the normal view a creature 5.5 tiles off is out of reach');
  CV.closeViewLookZoomTo(.5); frame(g, 2);
  assert.equal(CV.closeViewLookState().subject, 'creature', 'zooming in reaches it');
  off(g); extras = [small(g.player.x + 9.5, g.player.y)]; on(g); CV.closeViewLookZoomTo(1); frame(g, 3);
  assert.equal(CV.closeViewLookState().subject, 'wayfarer', 'a small one 9.5 tiles off stays out of reach even at full zoom');
  off(g); g = fixture(4, 8, 'heart', true); extras = [beast(g.player.x + 9.5, g.player.y)]; on(g); frame(g, 3);
  assert.equal(CV.closeViewLookState().subject, 'wayfarer', 'a world beast 9.5 tiles off: not at the normal view');
  CV.closeViewLookZoomTo(1); frame(g, 3);
  assert.equal(CV.closeViewLookState().subject, 'creature', 'a world beast 9.5 tiles off is pickable once zoomed in');
  frame(g, 200); const s = CV.closeViewLookState(), c = CV.closeViewCamera();
  assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false); clearLine(g, s.focus[0], s.focus[1], c.x, c.y);
  off(g);
});

test('trees, props, any other object and a drawn body can be the subject; scenery only nearly dead ahead', () => {
  const g = fixture(6, 8, 'heart', true); const y = g.player.y;
  const tree = { kind: 'tree', vegetationForm: 'canopy', state: 'standing', id: 'look-oak', x: g.player.x + 3, y };
  const chest = { kind: 'chest', id: 'look-chest', state: 'closed', x: g.player.x + 2, y };
  const stone = { kind: 'waystoneRelic', id: 'look-relic', x: g.player.x + 2.5, y };
  const drone = { kind: 'corridorDrone', id: 'look-drone' };
  // the pick in front: a prop beats the tree behind it; alone, the tree dead ahead is picked
  extras = [tree, chest]; on(g); frame(g, 3); assert.equal(CV.closeViewLookState().subject, 'thing'); assert.equal(CV.closeViewLookState().key, chest); off(g);
  extras = [tree]; on(g); frame(g, 3); assert.equal(CV.closeViewLookState().subject, 'tree'); off(g);
  // a tree off to the side (inside the cone a character would be picked in, outside the scenery's) is left for a tap
  extras = [{ ...tree, y: y + 1.2 }]; on(g); frame(g, 3); assert.equal(CV.closeViewLookState().subject, 'wayfarer', 'a tree to one side is not picked in front'); off(g);
  // every kind under a tap
  extras = [{ ...tree, x: g.player.x + 6, y: y - 2.2 }, { ...chest, x: g.player.x + 1.5, y: y - 2.2 }, { ...stone, x: g.player.x + 3, y: y + 3.5 }, { x: g.player.x + 2, y: y + 1.4, aux: drone, height: 2.1 }]; on(g); frame(g, 2);
  const want = [['tree', extras[0], 'Tree'], ['thing', extras[1], 'Chest'], ['scenery', extras[2], 'Waystone relic'], ['body', drone, 'Corridor drone']];
  for (const [subject, key, label] of want) {
    const o = extras.find((e) => e === key || e.aux === key), top = subject === 'tree' ? 1.2 : .3, q = screen(o.x + .5, o.y + .82, top);
    const r = CV.closeViewLookTap(g, W, H, q.sx, q.sy); assert.ok(r, subject); assert.equal(r.subject, subject); assert.equal(CV.closeViewLookState().key, key); assert.equal(r.label, label);
    assert.equal(CV.closeViewLookLabel(), label, `the name line: ${label}`); frame(g, 2);
  }
  // a tree is framed whole, then toward its crown
  const q = screen(extras[0].x + .5, extras[0].y + .82, 1); CV.closeViewLookTap(g, W, H, q.sx, q.sy); CV.closeViewLookZoomTo(.2); frame(g, 150);
  const lo = CV.closeViewLookState().focus[2]; CV.closeViewLookZoomTo(1); frame(g, 150); const hi = CV.closeViewLookState();
  assert.ok(hi.focus[2] > lo + .2, 'toward the crown'); assert.ok(hi.top > 1.5, `a tree's own height (${hi.top})`);
  const c = CV.closeViewCamera(); assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false);
  off(g);
});

test('a tap picks the drawn thing under it; the Wayfarer returns her; a tapped subject is kept at any zoom', () => {
  const g = fixture(9, 8); const y = g.player.y;
  const villager = { kind: 'villager', id: 'look-odile', name: 'Odile', x: g.player.x + 2, y: y - .9 };
  const rat = small(g.player.x + 3, y + .9);
  extras = [villager, rat]; on(g); frame(g, 2);
  const save = JSON.stringify(g.save), pos = [g.player.x, g.player.y], hp = rat.enemy.hp;
  let q = screen(rat.x + .5, rat.y + .82, .4); let r = CV.closeViewLookTap(g, W, H, q.sx, q.sy);
  assert.equal(r.subject, 'creature'); assert.equal(CV.closeViewLookState().key, rat.enemy); assert.equal(CV.closeViewLookState().pinned, true);
  assert.equal(CV.closeViewLookState().want, L.tapZoom, 'a tap at the normal view comes in a little');
  frame(g, 30); CV.closeViewLookZoomTo(0); frame(g, 60);
  assert.equal(CV.closeViewLookState().key, rat.enemy, 'a tapped subject is kept even at the normal view (it is not re-picked in front)');
  q = screen(villager.x + .5, villager.y + .75, .8); r = CV.closeViewLookTap(g, W, H, q.sx, q.sy);
  assert.equal(r.subject, 'character'); assert.equal(r.label, 'Odile'); frame(g, 60);
  // re-tapping the Wayfarer returns to her (and she stays, chosen)
  q = screen(g.player.x + .5, g.player.y + .75, .7); r = CV.closeViewLookTap(g, W, H, q.sx, q.sy);
  assert.equal(r.subject, 'wayfarer'); assert.equal(CV.closeViewLookLabel(), '', 'no name line for the Wayfarer'); frame(g, 30);
  assert.equal(CV.closeViewLookState().subject, 'wayfarer'); assert.equal(CV.closeViewLookState().pinned, true);
  // nothing in the game moved: the tap is only a look
  assert.deepEqual([g.player.x, g.player.y], pos); assert.equal(rat.enemy.hp, hp); assert.equal(JSON.stringify(g.save), save, 'runtime only');
  // Look mode off: a tap is nothing to it
  off(g); assert.equal(CV.closeViewLookTap(g, W, H, q.sx, q.sy), null); assert.equal(CV.closeViewLookLabel(), '');
  // a view of another size (a resize since the frame) is not guessed at
  on(g); assert.equal(CV.closeViewLookTap(g, 300, 500, q.sx, q.sy), null); off(g);
});

test('a tap on empty ground aims at that ground point; on a wall, at the wall; the eye never inside a wall', () => {
  for (const [scenario, x, y] of [['heart', 9, 8], ['cellar', 11, 5]]) {
    const g = fixture(x, y, scenario); on(g);
    let aimed = 0, grounds = 0, walls = 0;
    for (const fx of [.2, .5, .8]) for (const fy of [.25, .45, .62]) {
      const sx = W * fx, sy = H * fy, ground = CV.closeViewFloorRay(sx, sy);
      const r = CV.closeViewLookTap(g, W, H, sx, sy); if (!r) continue; aimed++;
      const s = CV.closeViewLookState();
      if (r.hit === 'ground' && ground) { grounds++; assert.ok(Math.hypot(s.at[0] - ground.x, s.at[1] - ground.y) < .3, `${scenario}: aims at the ground under the tap (${s.at[0].toFixed(2)},${s.at[1].toFixed(2)} vs ${ground.x.toFixed(2)},${ground.y.toFixed(2)})`); }
      if (r.hit === 'wall') { walls++; let near = false; for (const [ox, oy] of [[.15, 0], [-.15, 0], [0, .15], [0, -.15]]) near ||= CV.closeViewWallAt(g.map, s.at[0] + ox, s.at[1] + oy); assert.ok(near, `${scenario}: a wall tap aims at the wall's face`); assert.equal(CV.closeViewWallAt(g.map, s.at[0], s.at[1]), false, 'from its open side'); }
      if (r.subject === 'place') assert.ok(r.label.length > 0, 'a place has a name line');
      for (const z of [.4, 1]) { CV.closeViewLookZoomTo(z); frame(g, 50); const c = CV.closeViewCamera(), s = CV.closeViewLookState();
        assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false, `${scenario} ${fx},${fy} zoom ${z}: the eye is never in a wall`); clearLine(g, s.focus[0], s.focus[1], c.x, c.y); }
      CV.closeViewLookZoomTo(0); frame(g, 60);
    }
    assert.ok(aimed >= 6 && (scenario === 'cellar' || grounds >= 2), `${scenario}: most taps aim somewhere (${aimed}, ${grounds} on the ground, ${walls} on a wall)`);
    off(g);
  }
});

test('the tap in Look mode never reaches the world: no attack, use, aim or walk', () => {
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /if \(tap && LOOK\.on\) \{[^\n]*closeViewLookTap\(g, r\.width, r\.height[^\n]*\n\s*else if \(tap && typeof CustomEvent === "function"\) canvas\.dispatchEvent/, 'the Close View controls send a Look-mode tap to the look, never as a worldtap');
  assert.match(src, /canvas\.addEventListener\("worldtap", \(e\) => \{ if \(!shown \|\| !LOOK\.on\) return; e\.stopImmediatePropagation\?\.\(\);[^\n]*\n[^\n]*closeViewLookTap\([^\n]*\{ capture: true \}\);/, 'any other worldtap (the joystick pad, a mouse) is caught first in Look mode and stopped before the game sees it');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), at = main.indexOf('canvas.addEventListener("worldtap"'), ctl = main.indexOf('mountCloseViewControls(');
  assert.ok(ctl > 0 && at > ctl, 'the Close View controls (and their capture listener) are mounted before the game registers its own worldtap listener');
  // and the controls themselves: a tap on the open screen in Look mode dispatches no worldtap
  const g = fixture(); const listeners = {}, canvas = { tagName: 'canvas', style: {}, addEventListener(t, f) { (listeners[t] ||= []).push(f); }, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }), dispatchEvent(ev) { if (ev.type === 'worldtap') taps++; } };
  let taps = 0; const fire = (t, ev) => { for (const f of listeners[t] || []) f({ type: t, pointerType: 'touch', preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...ev }); };
  const el = () => ({ style: {}, dataset: {}, setAttribute() {}, getAttribute() {}, append() {}, insertBefore() {}, after() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 300, top: 480, width: 162, height: 162, right: 462, bottom: 642 }), offsetWidth: 162, offsetHeight: 162, offsetLeft: 300, offsetTop: 480, classList: { add() {}, remove() {} }, contains: () => false });
  const actions = el(), cluster = el(); actions.querySelector = (s) => s === '.action-diamond' ? cluster : null;
  const doc = { getElementById: (id) => id === 'actions' ? actions : id === 'game' ? canvas : null, createElementNS: () => el(), createElement: () => { const e = el(); e.getBoundingClientRect = () => ({ left: 16, top: 520, width: 120, height: 120, right: 136, bottom: 640 }); return e; } };
  const host = { document: doc, innerWidth: W, innerHeight: H, performance: { now: () => now }, navigator: { maxTouchPoints: 5 }, addEventListener() {} };
  const controls = CV.mountCloseViewControls(() => g, host, {}); controls.sync(); frame(g, 2); controls.sync();
  const save = JSON.stringify(g.save), pos = [g.player.x, g.player.y];
  fire('pointerdown', { pointerId: 1, clientX: 300, clientY: 300 }); fire('pointerup', { pointerId: 1, clientX: 300, clientY: 300 });
  assert.equal(taps, 1, 'outside Look mode a tap is still the world’s');
  on(g); assert.equal(CV.closeViewLookState().pinned, false);
  fire('pointerdown', { pointerId: 2, clientX: W * .5, clientY: H * .3 }); fire('pointerup', { pointerId: 2, clientX: W * .5, clientY: H * .3 });
  assert.equal(taps, 1, 'in Look mode the tap is a look only'); assert.equal(CV.closeViewLookState().pinned, true, 'and it chose what to look at');
  // a worldtap from the input (a tap on the joystick's pad, a mouse click) is stopped in Look mode, looked at, never passed on
  let stopped = 0; CV.closeViewLookSet(g, false); on(g); assert.equal(CV.closeViewLookState().pinned, false);
  fire('worldtap', { detail: { clientX: W * .5, clientY: H * .3 }, stopImmediatePropagation() { stopped++; } });
  assert.equal(stopped, 1, 'stopped before the game’s listener'); assert.equal(CV.closeViewLookState().pinned, true, 'and used as a look');
  off(g); fire('worldtap', { detail: { clientX: W * .5, clientY: H * .3 }, stopImmediatePropagation() { stopped++; } }); assert.equal(stopped, 1, 'outside Look mode it passes');
  assert.deepEqual([g.player.x, g.player.y], pos); assert.equal(JSON.stringify(g.save), save);
  off(g);
});

test('bounded: many draws fill a fixed table, and with Look mode off nothing is remembered', () => {
  const g = fixture(9, 8); extras = [];
  for (let i = 0; i < L.cands * 2; i++) extras.push({ kind: 'rock', id: `look-rock-${i}`, x: 7 + (i % 14), y: 8 + (i % 3) * .01 });
  on(g); frame(g, 3); assert.ok(['thing', 'wayfarer'].includes(CV.closeViewLookState().subject));
  const q = screen(g.player.x + .5, g.player.y + .75, .7); assert.ok(CV.closeViewLookTap(g, W, H, q.sx, q.sy));
  off(g); assert.equal(CV.closeViewLookTap(g, W, H, q.sx, q.sy), null);
  extras = [];
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), pick = src.slice(src.indexOf('function lookPick('), src.indexOf('// A tap\'s ray'));
  assert.match(pick, /LC\.n = 0;\n\s*if \(!LOOK\.on && LOOK\.s === 0\) return;/, 'the scan runs only while Look mode is on (or easing back)');
  assert.doesNotMatch(pick.replace(/lookHuman\([^)]*\)|lookNameOf\([^)]*\)/g, ''), /new |\[\]|\{ [a-z]+:/, 'the per-frame pick allocates nothing');
});

test('a hold with no click after it (cancelled, slid off, or long past) does not swallow the next compass Enter', () => {
  const h = CV.createLookHold();
  // the hold fires, then the press is cancelled: no click comes, and the next one (a keyboard Enter) is a tap
  h.down(1, 10, 10, 0); assert.equal(h.due(L.holdMs), true); h.hold(); assert.equal(h.pressing, true); h.drop(); h.cancel(); assert.equal(h.takeClick(), false, 'Enter after a cancelled hold is a tap');
  // the ordinary hold and release still swallows its own click
  h.down(2, 10, 10, 5000); assert.equal(h.due(5000 + L.holdMs), true); h.hold(); h.up(2, 5000 + L.holdMs + 50); assert.equal(h.takeClick(), true);
  // released, but the click never came (the finger slid off before lifting): dropped after swallowMs, so Enter is a tap
  h.down(3, 10, 10, 9000); h.due(9000 + L.holdMs); h.hold(); h.up(3, NaN); h.drop(); assert.equal(h.takeClick(), false);
  assert.ok(L.swallowMs >= 300 && L.swallowMs <= 1500, 'a short window: the click follows its release at once');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /for\(const t of\["pointerup","pointercancel","pointerleave","lostpointercapture"\]\)navCompass\.addEventListener\(t,e=>\{clearTimeout\(lookTimer\);if\(t==="pointercancel"\|\|t!=="pointerup"&&lookHold\.pressing\)lookHold\.drop\(\);/, 'a cancel, or leaving or losing the pointer mid-press, drops the flag');
  assert.match(main, /if\(t==="pointerup"\)\{clearTimeout\(lookSwallowTimer\);lookSwallowTimer=setTimeout\(\(\)=>lookHold\.drop\(\),CLOSE_VIEW\.camera\.look\.swallowMs\)\}/, 'and a release drops it after swallowMs');
});
