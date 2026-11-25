// Tim, 2026-11-25 (with a screenshot of his dungeon framing: "behind the Wayfarer, slightly over the shoulder, looking forward
// along the corridor, with the character in the lower middle of the screen"): that framing is the default for dungeons and the
// open world, for players who never chose a camera. A saved choice is never overridden; reduced motion and quality tiers keep
// their own behaviour. Also the Journal's cleared crossings: only those that held a relay are listed; the rest fold to one line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import * as CV from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';
import { render } from '../src/renderer.ts';
import { JOURNAL_CROSSINGS, journalDisplayEntries, journalOnce } from '../src/interactions.ts';

const ctx: any = new Proxy({ canvas: null, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });

test('the default preset is the over-the-shoulder framing; the others are unchanged and still offered', () => {
  const P = CV.CLOSE_VIEW.presets, D = P[CV.CLOSE_VIEW.defaultPreset];
  assert.equal(CV.CLOSE_VIEW.defaultPreset, 'overShoulder');
  assert.deepEqual(Object.keys(P).sort(), ['close', 'overShoulder', 'standard', 'wide']);
  assert.equal(P.standard.orbitDistance, 2.3); assert.equal(P.standard.orbitHeight, 1.7); assert.equal(P.close.distance, 2.6); assert.equal(P.wide.outdoorDistance, 6); // the old presets, as they were
  for (const k of ['height', 'outdoorHeight', 'distance', 'outdoorDistance', 'orbitDistance', 'orbitHeight', 'lookAhead', 'lookHeight', 'shoulder', 'fov', 'fogPush']) assert.ok(Number.isFinite(D[k]), k);
  assert.equal(D.orbitDistance, D.outdoorDistance, 'the same framing indoors and out'); assert.equal(D.orbitHeight, D.outdoorHeight);
  assert.ok(D.shoulder > 0 && D.shoulder < P.standard.shoulder, 'slightly over the shoulder');
});

test('new journeys take it; a save that never chose a camera moves to it once; a chosen camera is never overridden', () => {
  const fresh: any = freshSave(); assert.equal(fresh.closeViewPreset, 'overShoulder'); assert.equal(fresh.closeViewDefaults, CV.CLOSE_VIEW.defaults.version);
  const legacy = (extra: any) => { const s: any = { ...freshSave(), ...extra }; delete s.closeViewDefaults; return s; };
  assert.equal(migrateSave(legacy({ closeViewPreset: 'standard' })).closeViewPreset, 'overShoulder', 'the old default, never chosen: the new default');
  assert.equal(migrateSave(legacy({ closeViewPreset: undefined })).closeViewPreset, 'overShoulder');
  for (const id of ['close', 'wide']) assert.equal(migrateSave(legacy({ closeViewPreset: id })).closeViewPreset, id, `${id}: a choice, kept`);
  assert.equal(migrateSave(legacy({ closeViewPreset: 'standard', closeViewZoom: -.4 })).closeViewPreset, 'standard', 'a pinched distance is a camera chosen: kept');
  const once: any = migrateSave(legacy({ closeViewPreset: 'standard' })); once.closeViewPreset = 'standard'; // then chosen again in Options
  assert.equal(migrateSave(once).closeViewPreset, 'standard', 'chosen after the move: kept on every later load');
  const keep: any = migrateSave(legacy({ closeViewPreset: 'standard', closeViewMystery: 7 })); assert.equal(keep.closeViewMystery, 7, 'unknown fields kept'); assert.equal(keep.version, 14);
  assert.equal(CV.ensureCloseView({ closeViewPreset: 'bogus' }).closeViewPreset, 'overShoulder');
});

class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
// Settles the camera on `lab` with `preset` (the open world through the GPU path, as it runs there) and measures the framing.
function framed(lab: any, preset = 'overShoulder', w = 624, h = 868, reduceMotion = false) {
  const gpu = lab.lab === 'test-tile', prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0;
  if (gpu) { (globalThis as any).WebGL2RenderingContext = StubGL; CV.CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); CV.setCloseViewCanvasFactory(() => { if (++made === 1) return { width: w, height: h, getContext: () => ctx }; return { width: w, height: h, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx }; }); }
  else CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => ctx }));
  try {
    const g: any = createLabFixture(lab).game; g.enemies = []; g.save.closeViewPreset = preset; g.save.closeViewAutoFollow = false; g.save.overworldCloseView = true; if (reduceMotion) g.presentation = { ...(g.presentation || {}), reduceMotion: true };
    let best = { x: g.player.x, y: g.player.y, r: -1 };
    if (lab.scenario === 'heart') for (const t of g.map.tiles) if (!t.blocked) { let r = 0; outer: for (; r < 6; r++) for (let y = t.y - r; y <= t.y + r; y++) for (let x = t.x - r; x <= t.x + r; x++) if (CV.closeViewWallAt(g.map, x + .5, y + .5)) break outer; if (r > best.r) best = { x: t.x, y: t.y, r }; }
    if (gpu) { best.x = 16; best.y = 26; } g.player.x = best.x; g.player.y = best.y; CV.resetCloseViewCamera(); let now = 300000;
    if (gpu) g.presentation = { effectiveQuality: 'low', reduceMotion };
    const screen: any = new Proxy({ canvas: { width: w, height: h }, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
    for (let i = 0; i < 200; i++) { now += 16; if (gpu) render(screen, g, w, h, now); else assert.equal(CV.closeViewFrame(ctx, g, w, h, now, () => {}), true); }
    assert.equal(CV.closeViewShowing(g), true, 'Close View shows');
    const c = CV.closeViewCamera(), fx = g.player.x + .5, fy = g.player.y + .75, z = c.anchorZ;
    const feet = CV.closeViewProject(fx, fy, z)!, head = CV.closeViewProject(fx, fy, z + 1.38)!, far = CV.closeViewProject(fx + Math.cos(c.yaw) * 30, fy + Math.sin(c.yaw) * 30, z);
    return { feet: feet.sy / h, head: head.sy / h, x: feet.sx / w, far: far ? far.sy / h : NaN, pitch: c.pitch * 180 / Math.PI, elevation: c.elevation * 180 / Math.PI };
  } finally { CV.resetCloseViewCamera(); CV.setCloseViewCanvasFactory(null); if (gpu) { CV.CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; } }
}

test('in a dungeon: behind and above, the Wayfarer in the lower middle, the way ahead open to the top of the screen', () => {
  const f = framed({ lab: 'close-view', scenario: 'heart', now: 1000 }), s = framed({ lab: 'close-view', scenario: 'heart', now: 1000 }, 'standard');
  assert.ok(f.feet > .6 && f.feet < .72, `feet at ${f.feet.toFixed(2)} of the height`);
  assert.ok(f.head > .48 && f.head < .58, `head just under the middle (${f.head.toFixed(2)})`);
  assert.ok(f.x > .4 && f.x < .5, `a little left of centre: the camera over the right shoulder (${f.x.toFixed(2)})`);
  assert.ok(f.far < .3, `the corridor's far end in the top of the screen (${f.far.toFixed(2)})`);
  assert.ok(f.elevation > 40 && f.elevation < 50 && f.pitch > 30 && f.pitch < 40, `looking down the way ahead (${f.elevation.toFixed(1)}°, pitch ${f.pitch.toFixed(1)}°)`);
  assert.ok(s.elevation < 25 && s.far > .35, 'standard is unchanged (low, the horizon near the middle)');
  const r = framed({ lab: 'close-view', scenario: 'heart', now: 1000 }, 'overShoulder', 624, 868, true);
  assert.ok(Math.abs(r.feet - f.feet) < .02 && Math.abs(r.elevation - f.elevation) < .5, 'reduced motion settles on the same framing');
});

test('in the open world: the same framing (the overworld no longer gets its own farther boom)', () => {
  const o = framed({ lab: 'test-tile', scenario: '', now: 1000 });
  assert.ok(o.elevation > 38 && o.elevation < 52, `elevation ${o.elevation.toFixed(1)}°`);
  assert.ok(o.feet > .55 && o.feet < .75, `feet at ${o.feet.toFixed(2)}`);
});

test('the Journal lists cleared crossings that held a relay; the rest fold into one count line; the records are kept', () => {
  const s: any = freshSave(); s.consequences.dungeons = {};
  const ids = ['dungeon:S:g1:1:2:a', 'dungeon:S:g1:3:4:b', 'dungeon:S:g1:5:6:c', 'dungeon:S:g1:7:8:d'];
  journalOnce(s, 'early', 'An earlier entry.', 'Discovery');
  ids.forEach((id, i) => { s.consequences.dungeons[id] = { resolved: true, visits: 1, abandoned: 0, relayNode: i === 1 }; journalOnce(s, `resolved:${id}`, 'You cleared the guardian of this buried crossing. Its defeat is permanent.', 'Crossings'); });
  journalOnce(s, 'deep-annex:x', 'You went three floors down a Starfield Deep Annex.', 'Crossings');
  const before = JSON.stringify(s.narrative.journal), shown = journalDisplayEntries(s);
  assert.equal(JSON.stringify(s.narrative.journal), before, 'display only: the save is untouched');
  assert.equal(s.narrative.journal.filter((j: any) => j.recordId.startsWith('resolved:')).length, 4, 'every record kept');
  const ids2 = shown.map((j: any) => j.recordId);
  assert.ok(ids2.includes(`resolved:${ids[1]}`), 'the relay crossing is listed');
  for (const i of [0, 2, 3]) assert.ok(!ids2.includes(`resolved:${ids[i]}`), 'the others are folded');
  const fold = shown.find((j: any) => j.recordId === JOURNAL_CROSSINGS.foldedId); assert.ok(fold); assert.equal(fold.folded, 3); assert.equal(fold.title, 'Crossings'); assert.match(fold.text, /3/);
  assert.equal(ids2.indexOf(JOURNAL_CROSSINGS.foldedId), ids2.indexOf('early') + 1, 'the count line stands where the first folded entry stood');
  assert.ok(ids2.includes('deep-annex:x') && ids2.includes('early') && ids2.includes('crossing-beacon'), 'other entries untouched');
  const none: any = freshSave(); assert.deepEqual(journalDisplayEntries(none).map((j: any) => j.recordId), none.narrative.journal.map((j: any) => j.recordId), 'no crossings: no count line');
});
