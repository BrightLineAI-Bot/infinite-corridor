// Close View (Tim, 2026-11-06): a low third-person camera behind the Wayfarer inside the Pentagon, great buildings and keeps,
// off unless chosen; the overworld and the Pentagon's open-air parts keep the ordinary view, with a short blend between.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, SAVE_VERSION } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import { LABORATORIES, scenariosForLab, createLabFixture, labReport, findLabPentagon } from '../src/proving-ground-labs.ts';

const DRAW = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText', 'clearRect']);
// A recording 2D context: counts draw calls, logs every call (rounded), and refuses a non-finite number.
function recorder(canvas = null) {
  const r = { draws: 0, calls: 0, log: [], keep: false };
  r.ctx = new Proxy({ canvas, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
    get: (o, k) => k in o ? o[k] : (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${String(k)} was given ${v}`); r.calls++; if (DRAW.has(k)) r.draws++; if (r.keep) r.log.push(`${String(k)}(${a.map((v) => typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v === 'string' ? v : typeof v).join(',')})`); },
    set: (o, k, v) => { o[k] = v; if (r.keep && typeof v !== 'object') r.log.push(`${String(k)}=${v}`); return true; } });
  r.reset = () => { r.draws = 0; r.calls = 0; r.log = []; };
  return r;
}
const ground = recorder();
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ground.ctx }));
const W = 390, H = 844;
const fixtures = new Map();
const lab = (scenario) => { if (!fixtures.has(scenario)) fixtures.set(scenario, createLabFixture({ lab: 'close-view', scenario, now: 1000 })); return fixtures.get(scenario); };
const SCENARIOS = ['outer', 'cellar', 'inner', 'heart', 'vault', 'building'];

test('Close View is off by default; the save normalises it and its camera preset (additive at schema 14)', () => {
  const s = freshSave(); assert.equal(s.closeView, false); assert.equal(s.closeViewPreset, CV.CLOSE_VIEW.defaultPreset); assert.equal(SAVE_VERSION, 14);
  for (const [v, want] of [[true, true], ['yes', false], [1, false], [null, false], [undefined, false]]) { const raw = { ...freshSave(), closeView: v, keepMe: 7 }; if (v === undefined) delete raw.closeView; const m = migrateSave(JSON.parse(JSON.stringify(raw))); assert.equal(m.closeView, want, String(v)); assert.equal(m.keepMe, 7, 'unknown fields kept'); assert.equal(m.version, 14); }
  for (const id of Object.keys(CV.CLOSE_VIEW.presets)) assert.equal(migrateSave({ ...freshSave(), closeViewPreset: id }).closeViewPreset, id);
  assert.equal(migrateSave({ ...freshSave(), closeViewPreset: 'bogus' }).closeViewPreset, CV.CLOSE_VIEW.defaultPreset);
  const g = new Game(freshSave(), 0); assert.equal(CV.closeViewWanted(g), false, 'a fresh journey never sees it');
});

test('the overworld, a Pentagon court included, renders exactly as before with Close View on', () => {
  const s = freshSave(); s.seed = 'CINDER-VERGE-47'; const g = new Game(s, 0), c = findLabPentagon(s.seed);
  for (const [rx, ry] of [[0, 0], [c.cx, c.cy]]) { g.rx = rx; g.ry = ry; g.loadArea('overworld', false);
    const once = (on) => { g.save.closeView = on; const r = recorder(); r.keep = true; render(r.ctx, g, W, H, 5000); return r.log; };
    once(false); const off = once(false), on = once(true), off2 = once(false);
    assert.deepEqual(off2, off, 'the ordinary view is deterministic'); assert.deepEqual(on, off, `section ${rx},${ry}: identical with Close View on`);
    assert.equal(CV.closeViewApplies(g), false); assert.equal(CV.closeViewShowing(g), false); }
});

test('Pentagon floors and a great building floor render in Close View at every quality, without throwing', () => {
  for (const sc of SCENARIOS) { const { game: g, save } = lab(sc); assert.equal(save.closeView, true); assert.equal(g.area, 'dungeon'); assert.ok(g.map.building, sc);
    for (const q of ['low', 'balanced', 'full']) { g.presentation = { effectiveQuality: q }; const before = CV.closeViewStats.frames, r = recorder();
      render(r.ctx, g, W, H, 2000); render(r.ctx, g, W, H, 2016);
      assert.equal(CV.closeViewStats.frames, before + 2, `${sc}/${q}: Close View drew`); assert.ok(CV.closeViewShowing(g));
      assert.ok(CV.closeViewStats.boards >= 1, `${sc}/${q}: the Wayfarer is a billboard`); assert.ok(CV.closeViewStats.faces + CV.closeViewStats.culled > 0, `${sc}/${q}: walls considered`);
      assert.equal(CV.closeViewStats.bands <= CV.CLOSE_VIEW.quality[q].floorBands, true); } }
});

test('draw cost: Close View stays bounded and below the ordinary interior view; wall geometry is cached per floor', () => {
  const bound = { low: 160, balanced: 280, full: 400 }; // version 2: + the walls' outline (one stroke a face; on balanced and full, a cap and a baseboard fill too)
  for (const sc of SCENARIOS) { const { game: g } = lab(sc);
    for (const q of ['low', 'balanced', 'full']) { g.presentation = { effectiveQuality: q };
      g.save.closeView = false; const a = recorder(); render(a.ctx, g, W, H, 3000);
      g.save.closeView = true; render(recorder().ctx, g, W, H, 3016); const builds = CV.closeViewStats.wallBuilds, b = recorder(); render(b.ctx, g, W, H, 3032);
      assert.ok(b.draws <= bound[q], `${sc}/${q}: ${b.draws} screen draw calls (bound ${bound[q]})`); assert.ok(b.draws < a.draws, `${sc}/${q}: ${b.draws} < ordinary ${a.draws}`);
      assert.ok(CV.closeViewStats.faces <= 200 && CV.closeViewStats.boards <= 64, `${sc}/${q}: bounded scene`); assert.equal(CV.closeViewStats.wallBuilds, builds, 'no rebuild on a steady floor'); }
    g.presentation = {}; }
  const low = CV.CLOSE_VIEW.quality.low, full = CV.CLOSE_VIEW.quality.full; assert.ok(low.floorBands < full.floorBands && low.radius < full.radius && !low.fogGradient && low.bands <= full.bands, 'the low tier is cheaper');
});

test('exact resume with Close View on: the setting, the floor and the Wayfarer come back as they were, and draw again', () => {
  const f = createLabFixture({ lab: 'close-view', scenario: 'heart', now: 1000 }), g = f.game; g.save.closeViewPreset = 'wide';
  const input = { state: { x: 0, y: -1 }, consume: () => false, held: () => false }; let t = 1000; render(recorder().ctx, g, W, H, t);
  for (let i = 0; i < 30; i++) { t += 16; CV.closeViewSteer(g, input.state); g.update(.016, input, t); CV.closeViewUnsteer(input.state); render(recorder().ctx, g, W, H, t); }
  assert.deepEqual(input.state, { x: 0, y: -1 }, 'the stick is handed back untouched');
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t))), back = new Game(snap, t + 5000);
  assert.equal(back.save.closeView, true); assert.equal(back.save.closeViewPreset, 'wide'); assert.equal(back.areaId(), g.areaId()); assert.equal(back.player.x, g.player.x); assert.equal(back.player.y, g.player.y);
  const before = CV.closeViewStats.frames; render(recorder().ctx, back, W, H, t + 5000); assert.equal(CV.closeViewStats.frames, before + 1, 'the resumed journey draws in Close View');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(g.save))).closeView, true);
});

test('Proving Ground isolation: the Close View lab runs on scratch state only and touches no storage', () => {
  assert.ok(LABORATORIES.some((q) => q.id === 'close-view' && q.status === 'implemented'));
  const ids = scenariosForLab('close-view').map((q) => q.id); for (const id of SCENARIOS) assert.ok(ids.includes(id), id);
  const f = lab('outer'), report = labReport(f); assert.equal(report.scratch, true); assert.equal(f.save.name, 'Proving Ground Wayfarer'); assert.equal(f.save.closeView, true);
  assert.equal(freshSave().closeView, false, 'a production journey is untouched');
  const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'); for (const k of ['localStorage', 'sessionStorage', 'indexedDB', 'caches.', 'serviceWorker', 'persistence']) assert.ok(!src.includes(k), `close-view.ts never uses ${k}`);
  const labs = readFileSync(new URL('../src/proving-ground-labs.ts', import.meta.url), 'utf8'), body = labs.slice(labs.indexOf('function closeViewFixture'), labs.indexOf('function gameForOverworld'));
  assert.match(body, /scratchSave\(seed\)/); assert.ok(!/saveGame|localStorage|loadSave/.test(body), 'the lab fixture never reads or writes a journey');
  const renderer = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.equal((renderer.match(/CLOSE VIEW \(\d\/3\)/g) || []).length, 3, 'three small hooks in renderer.ts');
});

test('open air keeps the ordinary view: the overworld, the finale walk among the stars, and yard tiles inside a floor', () => {
  const { game: g } = lab('building'); assert.equal(CV.closeViewApplies(g), true);
  assert.equal(CV.interiorMap({ ...g.map, building: { ...g.map.building, finale: true } }), false, 'the Pentagon finale is open to the sky');
  const w = g.map.width, at = Math.floor(g.player.y + .75) * w + Math.floor(g.player.x + .5), was = g.map.tiles[at];
  g.map.tiles[at] = { ...was, kind: 'yardGrass' }; assert.equal(CV.openAirAt(g.map, g.player.x, g.player.y), true); assert.equal(CV.closeViewApplies(g), false);
  g.map.tiles[at] = { ...was, courtyard: true }; assert.equal(CV.closeViewApplies(g), false); g.map.tiles[at] = was; assert.equal(CV.closeViewApplies(g), true);
});

test('between the cameras: a short blend from a one-copy snapshot, never both views; instant with reduced motion', () => {
  const f = createLabFixture({ lab: 'close-view', scenario: 'cellar', now: 1000 }), g = f.game, canvas = { width: 780, height: 1688 }, id = g.areaId(), back = g.save.session.dungeonReturn, at = { x: g.player.x, y: g.player.y };
  const frame = (t) => { const r = recorder(canvas); render(r.ctx, g, W, H, t); return r; };
  const outside = () => { g.rx = back.rx; g.ry = back.ry; g.loadArea('overworld', false); g.player.x = 16; g.player.y = 16; assert.equal(g.area, 'overworld'); };
  const inside = () => { g.save.session.activeDungeonId = id; g.loadArea('dungeon', false); g.player.x = at.x; g.player.y = at.y; assert.equal(g.area, 'dungeon'); };
  let t = 1000; for (let i = 0; i < 3; i++) frame(t += 16); assert.equal(CV.closeViewBlend().mode, 'close');
  outside(); g.save.closeView = false; const plain = recorder(canvas); render(plain.ctx, g, W, H, t += 16); g.save.closeView = true; // the ordinary view's cost out here
  inside(); for (let i = 0; i < 40; i++) frame(t += 16); assert.equal(CV.closeViewBlend().blending, false);
  outside(); const snaps = CV.closeViewStats.snapshots, first = frame(t += 16);
  assert.equal(CV.closeViewBlend().blending, true, 'leaving starts a blend'); assert.equal(CV.closeViewStats.snapshots, snaps + 1, 'one snapshot copy');
  assert.ok(first.draws <= plain.draws + 4, `the leaving frame costs the ordinary view and a copy or two (${first.draws} vs ${plain.draws})`);
  const ms = CV.CLOSE_VIEW.blend.seconds * 1000; let frames = 1; while (CV.closeViewBlend().blending && frames < 200) { frame(t += 16); frames++; }
  assert.ok(frames <= Math.ceil(ms / 16) + 2, `short: ${frames} frames`); assert.equal(CV.closeViewBlend().blending, false); assert.equal(CV.closeViewShowing(g), false);
  // back inside: the camera comes down behind the Wayfarer, drawing Close View only
  inside(); const enter = frame(t += 16);
  assert.equal(CV.closeViewBlend().blending, true); assert.ok(CV.closeViewBlend().mix < .2); assert.ok(enter.draws < plain.draws, `entering draws Close View, not both (${enter.draws})`);
  // reduced motion: an instant switch
  for (let i = 0; i < 40; i++) frame(t += 16); g.presentation = { reduceMotion: true }; outside(); frame(t += 16);
  assert.equal(CV.closeViewBlend().blending, false); assert.equal(CV.closeViewBlend().mode, 'ordinary');
});

test('movement follows the view: camera-relative, its basis latched for the whole gesture', () => {
  const { game: g } = lab('inner'); CV.resetCloseViewCamera(); render(recorder().ctx, g, W, H, 9000);
  const yaw = CV.closeViewCamera().yaw, st = { x: 0, y: -1 };
  CV.closeViewSteer(g, { x: 0, y: 0 }); // an idle frame latches the basis to the view
  assert.ok(CV.closeViewSteer(g, st)); assert.ok(Math.abs(st.x - Math.cos(yaw)) < 1e-9 && Math.abs(st.y - Math.sin(yaw)) < 1e-9, 'stick up walks the way the view looks');
  CV.closeViewUnsteer(st); assert.deepEqual(st, { x: 0, y: -1 });
  const right = { x: 1, y: 0 }; CV.closeViewSteer(g, right); assert.ok(Math.abs(right.x + Math.sin(yaw)) < 1e-9 && Math.abs(right.y - Math.cos(yaw)) < 1e-9, 'stick right walks to the view\'s right'); CV.closeViewUnsteer(right);
  g.save.closeView = false; const off = { x: .3, y: .4 }; assert.equal(CV.closeViewSteer(g, off), false); assert.deepEqual(off, { x: .3, y: .4 }, 'off: untouched'); g.save.closeView = true;
});

test('phase 2 plugs in here: a creature with close-view art draws itself in its billboard', () => {
  const { game: g } = lab('cellar'), seen = []; let t = 20000;
  CV.resetCloseViewCamera(); render(recorder().ctx, g, W, H, t += 16);
  const foe = g.enemies[0], yaw = CV.closeViewCamera().yaw; assert.ok(foe, 'the fixture has a creature');
  foe.x = g.player.x + Math.cos(yaw) * 1.25; foe.y = g.player.y + Math.sin(yaw) * 1.25;
  assert.ok((foe.x - g.player.x) * Math.cos(yaw) + (foe.y - g.player.y) * Math.sin(yaw) > 1, 'the creature fixture is ahead of the initialized camera');
  for (const e of g.enemies) CV.CLOSE_VIEW_HOOKS.art[e.kind] = (ctx, foe, view) => seen.push({ id: foe.id, view });
  try { for (let i = 0; i < 3; i++) render(recorder().ctx, g, W, H, t += 16); } finally { for (const e of g.enemies) delete CV.CLOSE_VIEW_HOOKS.art[e.kind]; }
  assert.ok(CV.closeViewStats.boards > 1, 'creatures in view'); assert.ok(seen.length >= 1, 'the art hook drew a creature in view');
  for (const q of seen) assert.ok(q.view.width > 0 && q.view.height > 0 && Number.isFinite(q.view.yawToCamera));
});

test('a tap in Close View lands on the floor ahead of the camera', () => {
  const { game: g } = lab('heart'); render(recorder().ctx, g, W, H, 12000);
  const q = CV.closeViewScreenToWorld(g, W, H, W / 2, H * .8), yaw = CV.closeViewCamera().yaw;
  assert.ok(q && Number.isFinite(q.x) && Number.isFinite(q.y)); const fx = Math.cos(yaw), fy = Math.sin(yaw), px = g.player.x + .5, py = g.player.y + .75;
  assert.ok((q.x - px) * fx + (q.y - py) * fy > -3, 'in front of (or just behind) the Wayfarer, never far behind the camera');
  assert.equal(CV.closeViewScreenToWorld(g, W + 100, H, 10, 10), null, 'not for another canvas size');
});
