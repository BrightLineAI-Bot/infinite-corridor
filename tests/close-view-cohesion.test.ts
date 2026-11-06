// Close View, version 3 (release 790, Tim, 2026-11-06): one material for the walls (mostly clean ancient panels, sparse
// deterministic wear), a continuous floor, creatures that never pop as the camera moves, attack cues, and the bullseye lock
// moved off the crescent to the screen's edge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const W = 390, H = 844;
const DRAW = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText', 'clearRect']);
function recorder() {
  const r = { draws: 0, images: 0, log: [] };
  r.ctx = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
    get: (o, k) => k in o ? o[k] : (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${String(k)} was given ${v}`); if (DRAW.has(k)) r.draws++; if (k === 'drawImage') r.images++; r.log.push(String(k)); },
    set: (o, k, v) => { o[k] = v; return true; } });
  return r;
}
const ground = recorder(); let made = 0;
CV.setCloseViewCanvasFactory(() => { made++; return { width: 1, height: 1, getContext: () => ground.ctx }; });
const lab = (scenario) => createLabFixture({ lab: 'close-view', scenario, now: 1000 });
let T = 80000;

test('the walls\' surface is chosen once per face from its place: the same floor gives the same wear, and most faces are clean', () => {
  const a = lab('cellar').game.map, b = lab('cellar').game.map;
  const da = CV.closeViewWallDetail(a), db = CV.closeViewWallDetail(b); assert.ok(da.length > 50); assert.deepEqual(da, db, 'the same floor, the same surface');
  assert.deepEqual(CV.closeViewWallDetail(a), da, 'stable across calls (cached per floor)');
  const counts = {}; for (const v of da) counts[v] = (counts[v] || 0) + 1; const clean = (counts.clean || 0) / da.length;
  assert.ok(clean > .4, `mostly clean panels (${(clean * 100).toFixed(0)}%)`); assert.ok(Object.keys(counts).length >= 4, `some variety: ${JSON.stringify(counts)}`);
  const ids = CV.CLOSE_VIEW.grit.variants.map((v) => v.id); for (const id of ['clean', 'grime', 'crack', 'growth', 'lattice', 'unresolved']) assert.ok(ids.includes(id), id);
});

test('grit strength: depth fades it out, the low tier has none, and the unresolved panel is still with reduced motion', () => {
  const Q = CV.CLOSE_VIEW.quality, V = CV.CLOSE_VIEW.grit.variants, un = V.findIndex((v) => v.id === 'unresolved'), crack = V.findIndex((v) => v.id === 'crack'), L = CV.CLOSE_VIEW.fog.levels - 1;
  assert.equal(CV.closeViewGritAlpha(crack, L, 1, Q.low), 0, 'low: no grit'); assert.equal(CV.closeViewGritAlpha(0, L, 1, Q.full), 0, 'clean: no texture');
  assert.ok(CV.closeViewGritAlpha(crack, L, 1, Q.balanced) > CV.closeViewGritAlpha(crack, L, 6, Q.balanced)); assert.equal(CV.closeViewGritAlpha(crack, L, Q.balanced.detailFar + .1, Q.balanced), 0);
  const still = [0, 1234, 5000, 9999].map((t) => CV.closeViewGritAlpha(un, L, 1, Q.full, t, true)); assert.ok(still.every((v) => v === still[0]), 'reduced motion: no shimmer');
  const moving = [0, 1600, 3200].map((t) => CV.closeViewGritAlpha(un, L, 1, Q.full, t, false)); assert.ok(new Set(moving.map((v) => v.toFixed(4))).size > 1, 'otherwise a slow breath');
  assert.ok(Q.low.floorBands < Q.full.floorBands && !Q.low.inlay && !Q.low.ao && Q.full.ao, 'the low tier is cheaper');
});

test('textures are painted once, never per frame, and frames stay within the draw budget at every tier', () => {
  const { game: g } = lab('building'); const bound = { low: 160, balanced: 280, full: 400 };
  for (const q of ['low', 'balanced', 'full']) { g.presentation = { effectiveQuality: q }; render(recorder().ctx, g, W, H, T += 16); render(recorder().ctx, g, W, H, T += 16);
    const before = CV.closeViewGritStats.painted, made0 = made, r = recorder(); render(r.ctx, g, W, H, T += 16);
    assert.equal(CV.closeViewGritStats.painted, before, `${q}: nothing painted on a steady frame`); assert.equal(made, made0, `${q}: no canvas made on a steady frame`);
    assert.ok(r.draws <= bound[q], `${q}: ${r.draws} draws`); if (q === 'low') assert.equal(CV.closeViewStats.detailed, 0, 'low: no grit drawn'); }
  assert.ok(CV.closeViewGritStats.painted <= CV.CLOSE_VIEW.grit.variants.length * CV.CLOSE_VIEW.grit.instances, 'a bounded set of textures');
});

test('the floor is drawn as triangles mapped exactly at their corners (no steps at band seams)', () => {
  const { game: g } = lab('heart'); g.presentation = { effectiveQuality: 'balanced' }; render(recorder().ctx, g, W, H, T += 16); const r = recorder(); render(r.ctx, g, W, H, T += 16);
  assert.ok(CV.closeViewStats.bands > 4 && CV.closeViewStats.bands <= CV.CLOSE_VIEW.quality.balanced.floorBands);
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'); assert.match(src, /floorTriangle\(ctx, img, 2, 3, 0\); floorTriangle\(ctx, img, 3, 1, 0\);/);
});

// An open room with one foe (as close-view-controls.test.ts builds it).
function room() {
  const f = lab('heart'), g = f.game, w = g.map.width, h = g.map.height, open = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !g.map.tiles[y * w + x].blocked;
  let best = null; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0; while (r < 5) { let ok = true; for (let dy = -r - 1; dy <= r + 1 && ok; dy++) for (let dx = -r - 1; dx <= r + 1 && ok; dx++) ok = open(x + dx, y + dy); if (!ok) break; r++; } if (!best || r > best.r) best = { x, y, r }; }
  const proto = g.enemies.find((e) => !e.dead) || g.enemies[0]; for (const e of g.enemies) e.dead = true;
  g.player.x = best.x; g.player.y = best.y; g.player.facing = 'up'; CV.resetCloseViewCamera();
  const foe = (id, dx, dy) => { const e = { ...proto, id, x: best.x + dx, y: best.y + dy, dead: false, hidden: false, ambient: false, hp: 50, maxHp: 50, telegraph: 0, hitFlash: 0, pack: null }; g.enemies.push(e); return e; };
  return { g, foe };
}

test('a creature in view fades in and then holds steady as the camera turns: no frame where it blinks out', () => {
  const { g, foe } = room(); render(recorder().ctx, g, W, H, T += 16); const yaw = CV.closeViewCamera().yaw;
  foe('steady', Math.round(Math.cos(yaw) * 2), Math.round(Math.sin(yaw) * 2));
  const images = []; for (let i = 0; i < 40; i++) { if (i > 10) CV.closeViewPan(3, 0, T); const r = recorder(); render(r.ctx, g, W, H, T += 16); images.push(CV.closeViewStats.boards); }
  assert.ok(images.slice(5).every((n) => n >= 2), `the Wayfarer and the creature stay billboards (${images.join(',')})`);
});

test('winding up, a creature glows and rings the floor; struck, it flashes', () => {
  const { g, foe } = room(); render(recorder().ctx, g, W, H, T += 16); const yaw = CV.closeViewCamera().yaw, e = foe('cue', Math.round(Math.cos(yaw) * 2), Math.round(Math.sin(yaw) * 2));
  for (let i = 0; i < 20; i++) render(recorder().ctx, g, W, H, T += 16);
  const calm = recorder(); render(calm.ctx, g, W, H, T += 16);
  e.telegraph = .4; const wind = recorder(); render(wind.ctx, g, W, H, T += 16);
  e.telegraph = 0; e.hitFlash = .18; const hit = recorder(); render(hit.ctx, g, W, H, T += 16);
  assert.ok(wind.log.filter((k) => k === 'ellipse').length > calm.log.filter((k) => k === 'ellipse').length, 'a ring at its feet');
  assert.ok(wind.images > calm.images, 'a glow'); assert.ok(hit.images > calm.images, 'a flash');
});

test('the lock: a tap that starts on it locks; a drag never does; the crescent keeps clear of it and of Spell B', () => {
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /lock\.addEventListener\("pointerup"/, 'the lock fires on release'); assert.ok(!/lock\.addEventListener\("pointerdown", \(e\) => \{ stop\(e\); const g = getGame\(\); if \(g\) closeViewLockToggle/.test(src), 'never on the press alone');
  const K = CV.CLOSE_VIEW.crescent; assert.ok(K.lockSize >= 44 && K.clear > 0 && K.minSpan > 0);
  const html = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'); assert.match(html, /class="bullseye"/); assert.match(html, /class="bull-ring"/);
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8'); assert.match(css, /\.close-lock\[aria-pressed="true"\] \.bull-ring \{ fill-opacity/);
});

test('the lock button, in a mounted page: a tap on it toggles; a press that slides off does not; a crescent drag over it does not', () => {
  const mk = (tag) => { const el = { tag, children: [], style: {}, attrs: {}, listeners: {}, hidden: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, append(...c) { for (const x of c) { x.parent = this; this.children.push(x); } },
    insertBefore(n, ref) { n.parent = this; this.children.splice(this.children.indexOf(ref), 0, n); }, after(n) { const p = this.parent; n.parent = p; p.children.splice(p.children.indexOf(this) + 1, 0, n); }, querySelector(sel) { return sel === '.action-diamond' ? this.children.find((c) => c.cls === 'action-diamond') : null; },
    getBoundingClientRect: () => ({ left: 190, top: 500, width: 162, height: 162 }), setPointerCapture() {}, set innerHTML(v) { this._html = v; } }; return el; };
  const actions = mk('section'), cluster = mk('div'); cluster.cls = 'action-diamond'; cluster.offsetWidth = 162; cluster.offsetHeight = 162; cluster.offsetLeft = 190; cluster.offsetTop = 500; actions.append(cluster); actions.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 740 });
  const doc = { getElementById: (id) => id === 'actions' ? actions : null, createElementNS: (ns, t) => mk(t), createElement: (t) => mk(t) };
  const { g } = room(); let toggles = 0; const was = g.lockTarget.bind(g); g.lockTarget = (id) => { toggles++; return was(id); };
  const host = { document: doc, performance: { now: () => T }, addEventListener() {}, innerWidth: 360, innerHeight: 740 }, ui = CV.mountCloseViewControls(() => g, host);
  render(recorder().ctx, g, W, H, T += 16); ui.sync(); const K = CV.CLOSE_VIEW.crescent;
  const lx = parseFloat(ui.lock.style.left), ly = parseFloat(ui.lock.style.top); assert.equal(lx + K.lockSize, 360 - K.lockEdge, 'at the screen\'s right edge');
  const R = 81 + K.gap, nearest = Math.hypot(Math.max(0, lx - 271, 271 - (lx + K.lockSize)), Math.max(0, ly - 581, 581 - (ly + K.lockSize))); assert.ok(nearest > R + K.band, `off the crescent's band (${nearest.toFixed(0)})`);
  const ev = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} }), L = ui.lock.listeners, cx = lx + 23, cy = ly + 23;
  g.message = ''; L.pointerdown[0](ev(1, cx, cy)); assert.equal(g.message, '', 'nothing on the press'); L.pointerup[0](ev(1, cx + 2, cy)); assert.ok(g.message || toggles, 'the tap locks (or says there is nothing to lock)');
  g.message = ''; toggles = 0; L.pointerdown[0](ev(2, cx, cy)); L.pointerup[0](ev(2, cx + 40, cy)); assert.ok(!g.message && !toggles, 'a press that slides off is not a tap');
  const hit = ui.svg.children[1]; hit.listeners.pointerdown[0](ev(3, 271 - R, 581)); L.pointerdown[0](ev(3, cx, cy)); L.pointerup[0](ev(3, cx, cy)); assert.ok(!g.message && !toggles, 'a crescent drag never reaches the lock');
  const span = ui.svg.getAttribute('data-span').split(' ').map(Number); assert.ok(span[0] > span[1] && span[0] - span[1] >= 2 * K.minSpan, `a usable arc (${span})`);
});
