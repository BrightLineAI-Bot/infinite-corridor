// Close View world refinement (2026-11-11, Tim: "a full, detailed visual refinement pass on all the assets in Close View...
// and for everything that is native to Close View, make sure it shows well in the standard view as well"). Rendering only:
// - the world's common standing things (rocks, chests, caches, shrines, waystones, standing stones, ways down) are solids,
//   built once a section or floor and rebuilt only when one of them changes (a chest opened, a rock broken);
// - houses (shelters, hamlets) stand up from their own tiles with walls, door lintels and roofs, each roof its own run so it
//   can be left out while the Wayfarer is inside, the camera is over it, or it stands between them;
// - the open ground keeps the ordinary art's features but not its tile lines; water has a curved shore, depth and foam;
// - the cards no longer carry the ordinary view's long names (a town filled the view with giant clipped words);
// - the standard view shows the sconces and candles Close View places in an interior.
// Generation is untouched: these read the map and never write it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { OUTDOOR, OUTDOOR_FLOATS, outdoorProps, outdoorPropObject, outdoorPropSignature, outdoorBuildings, outdoorScene, outdoorMesh, outdoorSky, propScene } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW_HOOKS, roofHidden, drawCloseViewLightsStd, closeViewStatic, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL, closeViewGLStats } from '../src/close-view-gl.ts';

function section(rx: number, ry: number) { const s = freshSave(); s.seed = 'CINDER-VERGE-47'; const g: any = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; }
const sha = (a: Float32Array) => createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
function checkSolids(data: Float32Array, verts: number, label: string, maxMat = 9) {
  assert.equal(data.length, verts * OUTDOOR_FLOATS, label); assert.equal(verts % 3, 0, `${label}: whole triangles`);
  for (let v = 0; v < verts; v++) { const o = v * OUTDOOR_FLOATS;
    assert.ok(Math.abs(Math.hypot(data[o + 3], data[o + 4], data[o + 5]) - 1) < 1e-4, `${label}: unit normal`);
    for (let k = 0; k < OUTDOOR_FLOATS; k++) assert.ok(Number.isFinite(data[o + k]), `${label}: finite`);
    assert.ok(data[o + 2] >= -1e-6, `${label}: nothing below the ground`); assert.ok(Number.isInteger(data[o + 9]) && data[o + 9] >= 0 && data[o + 9] <= maxMat, `${label}: material ${data[o + 9]}`); }
}

test('props are bounded, deterministic solids in the kind\'s own palette; generation and the map are untouched', () => {
  let total = 0;
  for (const [rx, ry] of [[0, 0], [2, 0], [-3, -2], [0, -4], [-5, 0]]) {
    const g = section(rx, ry), before = JSON.stringify(g.map), a = outdoorProps(g.map), b = outdoorProps(g.map);
    assert.equal(JSON.stringify(g.map), before, 'building the props never writes the map');
    assert.equal(sha(a.data), sha(b.data), 'the same section builds the same props');
    checkSolids(a.data, a.verts, `props ${rx},${ry}`);
    const kinds = g.map.objects.filter(outdoorPropObject); assert.equal(a.props, Math.min(OUTDOOR.props.max, kinds.length));
    assert.ok(a.verts <= a.props * OUTDOOR.props.maxVerts, 'within the per-prop bound'); total += a.props;
  }
  assert.ok(total > 10, `props are common in the world (${total})`);
  for (const k of Object.values(OUTDOOR.props.kinds) as any[]) assert.ok(k.colors.length === 3 && k.colors.every((c: string) => /^#[0-9a-f]{6}$/i.test(c)));
});

test('every prop recipe, closed and opened, whole and broken, stays inside its vertex bound', () => {
  const map: any = { width: 8, height: 8, tiles: [], objects: [] };
  for (const kind of Object.keys(OUTDOOR.props.kinds)) for (const state of ['ready', 'closed', 'used', 'sealed', 'broken']) {
    map.objects = [{ kind, state, x: 3, y: 3 }]; const p = outdoorProps(map);
    assert.equal(p.props, 1, `${kind} ${state}`); assert.ok(p.verts > 0 && p.verts <= OUTDOOR.props.maxVerts, `${kind} ${state}: ${p.verts}`); checkSolids(p.data, p.verts, `${kind} ${state}`); }
  map.objects = [{ kind: 'chest', state: 'closed', x: 3, y: 3 }]; const shut = outdoorProps(map); map.objects[0].state = 'open'; const open = outdoorProps(map);
  assert.notEqual(sha(shut.data), sha(open.data), 'an opened chest shows its lid thrown back');
  map.objects = [{ kind: 'cache', state: 'hidden', x: 3, y: 3 }, { kind: 'chest', strange: true, x: 1, y: 1 }]; assert.equal(outdoorProps(map).props, 0, 'a hidden cache and a strange thing stay cards (or unseen)');
  // on an interior's raised floor the prop stands on it
  map.objects = [{ kind: 'chest', state: 'closed', x: 3, y: 3 }]; const raised = outdoorProps(map, () => .5);
  for (let v = 0; v < raised.verts; v++) assert.ok(raised.data[v * OUTDOOR_FLOATS + 2] >= .5 - 1e-6);
  // the fog of war: an unseen prop is not built
  assert.equal(propScene({ ...map }, null, () => false).props.props, 0);
});

test('the scene rebuilds props when one changes, and keeps the ground and its solids', () => {
  const g = section(0, -4), first = outdoorScene(g.map);
  assert.equal(outdoorScene(g.map), first, 'unchanged: nothing rebuilt');
  assert.equal(first.solids.verts, first.mesh.verts + first.props.verts + first.houses.verts);
  assert.equal(first.solids.roofStart, first.mesh.verts + first.props.verts + first.houses.walls, 'the roofs come last');
  const box = g.map.objects.find((o: any) => outdoorPropObject(o) && /cache|chest/i.test(o.kind)); assert.ok(box, 'a cache in the section');
  const sig = outdoorPropSignature(g.map), was = box.state; box.state = 'used';
  try { assert.notEqual(outdoorPropSignature(g.map), sig); const next = outdoorScene(g.map); assert.notEqual(next, first); assert.notEqual(next.key, first.key);
    assert.equal(next.mesh, first.mesh, 'the outcrops and trees are kept'); assert.equal(next.terrain, first.terrain, 'the ground is kept'); }
  finally { box.state = was; }
  // the outcrop and tree buffer itself keeps its release-872 bound and materials
  const m = outdoorMesh(g.map, outdoorSky(g.map)); checkSolids(m.data, m.verts, 'outcrops and trees', 6); assert.ok(m.verts <= m.outcrops * 72 + m.trees * 240);
});

test('houses stand up from their own tiles: walls on each wall side, a lintel over the door, a roof a run', () => {
  let houses = 0;
  for (const [rx, ry] of [[-6, 0], [-6, -3], [-5, -1], [-4, -2]]) {
    const g = section(rx, ry), before = JSON.stringify(g.map.tiles), b = outdoorBuildings(g.map), again = outdoorBuildings(g.map);
    assert.equal(JSON.stringify(g.map.tiles), before); assert.equal(sha(b.data), sha(again.data), 'deterministic');
    checkSolids(b.data, b.verts, `houses ${rx},${ry}`);
    const ids = new Set(g.map.tiles.filter((t: any) => t?.buildingId && OUTDOOR.buildings.structures.test(t.structure)).map((t: any) => t.buildingId));
    assert.equal(b.roofs.length, Math.min(OUTDOOR.buildings.max, ids.size), 'a roof for every house');
    let at = b.walls; for (const r of b.roofs) { assert.equal(r.start, at, 'roofs follow the walls, one after another'); assert.ok(r.count > 0); at += r.count; assert.ok(r.x1 > r.x0 && r.y1 > r.y0); }
    assert.equal(at, b.verts);
    // the walls stand on the wall sides: every wall vertex lies within a wall's thickness of a tile edge that has a wall
    for (let v = 0; v < b.walls; v++) { const z = b.data[v * OUTDOOR_FLOATS + 2]; assert.ok(z <= OUTDOOR.buildings.wall.h + 1e-6, 'walls no higher than the wall height'); }
    houses += b.roofs.length;
  }
  assert.ok(houses >= 6, `hamlets and shelters have houses (${houses})`);
  assert.equal(outdoorBuildings(section(0, 3).map).verts, 0, 'no houses, nothing built');
});

test('a roof is left out while the Wayfarer is inside, the camera is over it, or it stands between them', () => {
  const r = { x0: 10, y0: 10, x1: 14, y1: 13 };
  assert.equal(roofHidden(r, 12, 11.5, 12, 16), true, 'inside');
  assert.equal(roofHidden(r, 12, 15, 12, 12.9), true, 'the camera over it');
  assert.equal(roofHidden(r, 12, 9, 12, 15), true, 'between the camera and the Wayfarer');
  assert.equal(roofHidden(r, 12, 15, 12, 17.5), false, 'in front of it, looking at it');
  assert.equal(roofHidden(r, 4, 4, 4, 7), false, 'elsewhere');
});

// A WebGL2 stand-in that records the solids' draws (the GPU itself is not available here).
class RecordingGL {
  draws: number[][] = []; constructor() { let next = 1; const constants = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, next++); return constants.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; }
  createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } drawArrays(_m: any, first: number, count: number) { this.draws.push([first, count]); }
}
function ctx2d(log: any[]) { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : (...a: any[]) => log.push([k, ...a]), set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: (gl: any, log: any[]) => void) {
  const previous = (globalThis as any).WebGL2RenderingContext, gl: any = new RecordingGL(), log: any[] = []; let made = 0;
  (globalThis as any).WebGL2RenderingContext = RecordingGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx2d(log) }; const c: any = { width: 390, height: 844, addEventListener() {}, getContext: (kind: string) => kind === 'webgl2' ? gl : ctx2d(log) }; return c; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(gl, log); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (previous === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = previous; }
}

test('in a GPU frame the house the Wayfarer stands in is drawn without its roof, and long names never reach a card', () => withGPU((gl, log) => {
  const g = section(-6, 0); g.save.overworldCloseView = true; g.presentation = { effectiveQuality: 'balanced', reduceMotion: false };
  const scene = outdoorScene(g.map), hut = scene.houses.roofs.find((r: any) => r.id.includes('hut')); assert.ok(hut);
  const screen = ctx2d([]); screen.canvas = { width: 390, height: 844 };
  // outside, well away: the whole buffer in one call
  g.player.x = 16; g.player.y = 24; g.enemies = []; let T = 50000;
  for (let i = 0; i < 3; i++) render(screen, g, 390, 844, (T += 16)); assert.equal(closeViewShowing(g), true);
  const total = scene.solids.verts; assert.ok(gl.draws.some((d: number[]) => d[0] === 0 && d[1] === total), 'the solids in one call');
  // inside the hut: no draw covers its roof's run
  const cell = g.map.tiles.find((t: any) => t.buildingId === hut.id && /Interior/.test(t.structure)); g.player.x = cell.x; g.player.y = cell.y - .2;
  gl.draws.length = 0; for (let i = 0; i < 3; i++) render(screen, g, 390, 844, (T += 16));
  const r0 = scene.solids.housesAt + hut.start, r1 = r0 + hut.count;
  assert.ok(!gl.draws.some((d: number[]) => d[0] < r1 && d[0] + d[1] > r0), 'its roof is left out');
  assert.ok(gl.draws.some((d: number[]) => d[0] === 0 && d[1] >= scene.solids.housesAt), 'the rest is still drawn');
  assert.ok(gl.draws.some((d: number[]) => d[0] === r1 || (r1 === total)), 'and what follows it');
  // the town's names (villagers', the shelter's) were never written onto a card
  const names = g.map.objects.filter((o: any) => o.name && o.name.length > 2).map((o: any) => o.name);
  assert.ok(!log.some((q: any[]) => q[0] === 'fillText' && names.includes(q[1])), 'no long names painted on cards');
  assert.ok(closeViewGLStats.outdoorVerts >= scene.solids.verts - 0);
}));

test('an interior\'s props are solids on its floor; the standard view shows the sconces and candles Close View places', () => withGPU((gl) => {
  const g: any = createLabFixture({ lab: 'close-view', scenario: 'chest-opening', now: 1000 }).game; g.presentation = { effectiveQuality: 'balanced', reduceMotion: true };
  const screen = ctx2d([]); screen.canvas = { width: 390, height: 844 }; let T = 60000;
  for (let i = 0; i < 3; i++) render(screen, g, 390, 844, (T += 16)); assert.equal(closeViewShowing(g), true);
  assert.ok((closeViewGLStats as any).propBuilds >= 1 && closeViewGLStats.outdoorVerts > 0, 'the chest is built as a solid');
  // the standard view: the same lights, drawn where they stand
  const st = closeViewStatic(g.map); assert.ok(st.lights > 0); const log: any[] = [], c = ctx2d(log);
  const drawn = drawCloseViewLightsStd(c, g, 44, 1000, -1, -1, g.map.width + 1, g.map.height + 1);
  assert.ok(drawn > 0 && drawn <= st.lights, `${drawn} pools of light`); assert.ok(log.filter((q) => q[0] === 'ellipse').length > 0, 'and their flames');
  const ow = section(0, 0); assert.equal(drawCloseViewLightsStd(c, ow, 44, 1000, 0, 0, 32, 32), 0, 'nothing outdoors');
}));

test('the shaders carry the shore, the softened ground and the props\' materials; tiers and reduced motion as before', () => {
  const src = readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  for (const k of ['float waterField(', 'uniform vec4 u_outX;', 'uniform vec4 u_outY;', 'if (m > 6.5)']) assert.ok(src.includes(k), k);
  const cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.ok(/F\.outX\[2\] = Q\.relief \? W2\.foam : W2\.foam \* \.6/.test(cv), 'the low tier keeps less foam'); assert.ok(/F\.outY\[3\] = Q\.motes \? 1 : 0/.test(cv), 'reflected clouds on the full tier only');
  for (const k of ['wander', 'shore', 'foam', 'deep', 'shallow']) assert.ok(Number.isFinite((OUTDOOR.water as any)[k]), k);
  assert.ok(OUTDOOR.ground.art > 0 && OUTDOOR.ground.art <= 1);
});
