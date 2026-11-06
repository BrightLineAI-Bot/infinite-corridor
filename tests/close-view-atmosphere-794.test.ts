// Close View, version 5 (release 794, Tim, 2026-11-06: "the look of the keep is more like a backrooms, instead of some kind of
// oppressive, dark, ancient structure... more detail and structure... we need more atmosphere... where we're tearing through
// the walls"): a theme per building kind, the floor's built things (walls with trim, pilasters, arches, lights, props) made
// once a floor, a floor material per tile in the mask, a camera that keeps its line to the Wayfarer clear, the bare floor
// capture, and the tiers' budgets. The GPU itself is not available here; what can be checked without it is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../src/renderer.ts';
import * as CV from '../src/close-view.ts';
import * as GL from '../src/close-view-gl.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const W = 390, H = 844;
function recorder() { return new Proxy({ canvas: null, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } }); }
CV.setCloseViewCanvasFactory(() => ({ width: 1, height: 1, getContext: () => recorder() }));
let T = 500000; const frame = (g, n = 1) => { for (let i = 0; i < n; i++) render(recorder(), g, W, H, (T += 16)); };
const lab = (scenario) => { CV.resetCloseViewCamera(); return createLabFixture({ lab: 'close-view', scenario, now: 1000 }).game; };
const THEMES = ['pentagon', 'rootCellar', 'keep', 'livedIn', 'hive', 'arcology'];

test('a theme per place: the Pentagon is a tomb (its cellars root cellars), hives chitin, arcologies an old machine, keeps cold stone (a few lived in); the same floor always the same', () => {
  const C = CV.CLOSE_VIEW.themes;
  assert.equal(CV.closeViewThemeId({ pentagon: true, base: 'p:1', kind: 'cellar', floor: 2, node: 3 }), 'rootCellar', 'a Pentagon cellar is a root cellar');
  assert.equal(CV.closeViewThemeId({ style: 'hive', base: 'h' }), 'hive'); assert.equal(CV.closeViewThemeId({ style: 'apartment', base: 'a' }), 'arcology');
  let pent = 0, root = 0, lived = 0; const N = 2000;
  for (let i = 0; i < N; i++) { const p = CV.closeViewThemeId({ pentagon: true, base: `pentagon:S:${i}`, kind: 'hall', floor: i % 7, node: i % 11 }); if (p === 'pentagon') pent++; else if (p === 'rootCellar') root++; else assert.fail(p);
    const k = CV.closeViewThemeId({ style: 'keep', base: `building:S:${i}:0:keep:3` }); assert.ok(k === 'keep' || k === 'livedIn', k); if (k === 'livedIn') lived++;
    assert.equal(CV.closeViewThemeId({ style: 'keep', base: `building:S:${i}:0:keep:3` }), k, 'pure'); assert.equal(CV.closeViewThemeLivedIn(`building:S:${i}:0:keep:3`), k === 'livedIn'); }
  assert.ok(Math.abs(root / N - C.rootCellarShare) < .04, `root cellars ${(root / N).toFixed(3)}`); assert.ok(pent > root * 2, 'the Pentagon is mostly the tomb');
  assert.ok(Math.abs(lived / N - C.livedInShare) < .04, `lived-in keeps ${(lived / N).toFixed(3)}`);
  assert.equal(CV.closeViewThemeId({ castle: true, style: 'keep', base: 'castle:x' }) === 'keep' || CV.closeViewThemeId({ castle: true, style: 'keep', base: 'castle:x' }) === 'livedIn', true, 'a castle keep');
  assert.equal(CV.closeViewThemeId(undefined), 'keep', 'anything else: the dark ancient default');
});

test('every theme is oppressive and dark: low ambient, a dark fog, a carried light of bounded reach; materials and colours as data', () => {
  for (const id of THEMES) { const t = CV.CLOSE_VIEW.themes[id]; assert.ok(t, id);
    const amb = t.light.ambient.reduce((a, v) => a + v, 0) / 3, fog = t.fog.rgb.reduce((a, v) => a + v, 0) / 3; assert.ok(amb <= 16 && fog <= 12, `${id}: ambient ${amb}, fog ${fog}`);
    assert.ok(t.light.reach >= 4 && t.light.reach <= 7 && t.fog.far <= 14 && t.fog.near < t.fog.far, `${id}: the dark closes in`);
    assert.ok([0, 1, 2, 3].includes(t.wall.kind) && Number.isInteger(t.floor.kind) && [0, 1, 2, 3].includes(t.ceiling.kind), `${id}: materials`);
    for (const k of ['rgb', 'mortar', 'dampRGB']) assert.equal(t.wall[k].length, 3); assert.equal(t.wall.stone.length, 4); assert.equal(t.grade.length, 4);
    assert.ok(t.light.sources.share > 0 && t.light.sources.share <= .2 && t.light.sources.spacing >= 3, `${id}: light sources sparse`); }
  assert.notEqual(CV.CLOSE_VIEW.themes.hive.wall.kind, CV.CLOSE_VIEW.themes.keep.wall.kind, 'a hive is not stone'); assert.equal(CV.CLOSE_VIEW.themes.pentagon.floor.sewer, true, 'the tomb has its sewers');
  const hive = CV.CLOSE_VIEW.themes.hive.wall.rgb; assert.ok(!(hive[2] > hive[0] && hive[2] > 80), 'the hive is not smooth lavender');
});

test('the floor\'s built things: walls with plinths, cornices and pilasters, arches over doorways, placed lights spaced apart, props; built once a floor, the same every time', () => {
  for (const sc of ['keep', 'heart', 'hive', 'arcology']) {
    const g = lab(sc), st = CV.closeViewStatic(g.map), F = GL.WALL_FLOATS, n = st.data.length / F, parts = new Map();
    for (let i = 0; i < n; i++) { const p = Math.floor(st.data[i * F + 9]); parts.set(p, (parts.get(p) || 0) + 1); }
    assert.ok(st.verts > 0 && st.verts % 3 === 0 && st.verts < 200000, `${sc}: ${st.verts} vertices, whole triangles, bounded`);
    assert.ok(parts.get(0) > 0 && parts.get(4) > 0 && parts.get(5) > 0, `${sc}: walls, arches and their soffits (${[...parts]})`);
    if (sc === 'keep' || sc === 'heart') assert.ok(parts.get(2) > 0 && parts.get(3) > 0, `${sc}: pilasters, plinth and cornice`);
    assert.ok(st.lights > 0 && st.lights < 200, `${sc}: ${st.lights} lights`);
    const L = st.lightList, LF = CV.LIGHT_FLOATS, sp = CV.closeViewTheme(g.map).light.sources.spacing;
    for (let i = 0; i < st.lights; i++) for (let j = i + 1; j < st.lights; j++) { if (L[i * LF + 7] || L[j * LF + 7]) continue; assert.ok(Math.hypot(L[i * LF] - L[j * LF], L[i * LF + 1] - L[j * LF + 1]) >= sp - 1e-6, `${sc}: wall lights at least ${sp} apart`); }
    for (let i = 0; i < n; i++) for (let k = 0; k < F; k++) assert.ok(Number.isFinite(st.data[i * F + k]), 'finite');
    const again = CV.closeViewStatic(lab(sc).map); assert.equal(again.verts, st.verts); assert.deepEqual(Array.from(again.lightList), Array.from(L), `${sc}: the same floor builds the same`); assert.deepEqual(Array.from(again.cardList), Array.from(st.cardList));
  }
  const g = lab('keep'), a = CV.closeViewStaticStats.builds; CV.closeViewStatic(g.map); CV.closeViewStatic(g.map); assert.equal(CV.closeViewStaticStats.builds, a + 1, 'cached: built once a floor');
});

test('the mask carries each tile\'s floor material, a theme\'s remap and what the fog of war hides; the old codes are as they were', () => {
  const t = (kind, extra = {}) => ({ kind, blocked: false, ...extra });
  const map = { width: 6, height: 1, tiles: [t('flagFloor'), t('mosaicFloor'), t('plankFloor'), t('carpetFloor'), t('chitinFloor'), t('keepWall', { blocked: true })] };
  const m = GL.closeViewMask(map), mat = (i) => m.data[i * 4 + 2] >> 1;
  assert.deepEqual([0, 1, 2, 3, 4].map(mat), [0, 1, 2, 3, 7]); assert.equal(m.data[5 * 4 + 3], 1, 'a wall');
  const r = GL.closeViewMask(map, null, null, null, CV.CLOSE_VIEW.themes.pentagon.floor.remap); assert.deepEqual([0, 1, 2, 3].map((i) => r.data[i * 4 + 2] >> 1), [0, 1, 0, 1], 'the tomb: planks to flags, rugs to an old mosaic');
  const seen = (x) => x < 2; seen.wall = () => true; const f = GL.closeViewMask(map, seen);
  assert.deepEqual([0, 1, 2, 5].map((i) => f.data[i * 4] & 2), [0, 0, 2, 0], 'unseen floor is marked; walls hide only where discovery hides them');
});

test('nothing stands between the camera and the Wayfarer: walking a narrow maze the line from their feet to the camera stays clear of walls, the camera never in one, the boom never lurching', () => {
  const g = lab('cellar'); frame(g, 3); let prev = CV.closeViewCamera().distance, maxJump = 0, blocked = 0, frames = 0;
  for (let i = 0; i < 160; i++) { const st = { x: Math.sin(i / 7) * .8, y: -1 }; CV.closeViewSteer(g, st); g.update(.016, { state: st, consume: () => false, held: () => false }, T + 16); CV.closeViewUnsteer(st); frame(g, 1);
    const c = CV.closeViewCamera(), fx = g.player.x + .5, fy = g.player.y + .75; assert.equal(CV.closeViewWallAt(g.map, c.x, c.y), false, `frame ${i}: never inside a wall`);
    for (let k = 1; k < 20; k++) { const t = k / 20; if (CV.closeViewWallAt(g.map, fx + (c.x - fx) * t, fy + (c.y - fy) * t)) { blocked++; break; } }
    maxJump = Math.max(maxJump, Math.abs(c.distance - prev)); prev = c.distance; frames++; }
  assert.equal(blocked, 0, `the line of sight was blocked on ${blocked} of ${frames} frames`); assert.ok(maxJump < .5, `largest boom step ${maxJump.toFixed(3)}`);
  const C = CV.CLOSE_VIEW.camera; assert.ok(C.hardPad < C.sightPad && C.sightStep > 0, 'the hard cut sits under the spring\'s aim');
  const gl = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  assert.ok(!/nGhostStart|cut-away walls/.test(gl), 'no translucent wall pass in the GPU scene'); assert.match(gl, /gl\.depthFunc\(gl\.GREATER\)/, 'a silhouette through a wall instead');
});

test('the bare floor: while the GPU scene captures, the renderer leaves the floor tiles to the shader; otherwise nothing changes', () => {
  assert.equal(CV.closeViewBareFloor(), false, 'outside a capture');
  const r = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.match(r, /const groundCached = !bareFloor && /); assert.match(r, /else if \(!bareFloor\) \{ for/);
  assert.equal((r.match(/CLOSE VIEW \(\d\/3\)/g) || []).length, 3, 'still the three hooks, plus the bare floor');
});

test('budgets by tier: at most 8 placed lights (fewer on low), motes on full only, no bump on low; cards capped; the lab has a floor for each theme', () => {
  const Q = CV.CLOSE_VIEW.quality, A = CV.CLOSE_VIEW.atmosphere;
  assert.ok(Q.low.lights < Q.balanced.lights && Q.balanced.lights <= Q.full.lights && Q.full.lights <= 8 && A.lights <= 8, 'lights capped');
  assert.equal(Q.low.motes, false); assert.equal(Q.balanced.motes, false); assert.equal(Q.full.motes, true); assert.equal(Q.low.bump, false); assert.equal(Q.full.bump, true);
  assert.ok(Q.low.cards < Q.full.cards && Q.full.cards <= A.props.cards, 'cards capped'); assert.ok(A.flicker[0] > 0 && A.flicker[0] < .3, 'a gentle flicker');
  const gl = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8'); assert.match(gl, /uniform vec4 u_lp\[8\]/); assert.match(gl, /if \(i >= u_nl\) break;/);
  for (const [sc, want] of [['keep', 'keep'], ['lived-in', 'livedIn'], ['hive', 'hive'], ['arcology', 'arcology'], ['cellar', 'rootCellar']]) { const g = lab(sc); assert.equal(CV.closeViewTheme(g.map).id, want, sc); assert.equal(CV.closeViewApplies(g), true, `${sc}: Close View applies`); frame(g, 2); }
  assert.ok(['pentagon', 'rootCellar'].includes(CV.closeViewTheme(lab('heart').map).id));
});
