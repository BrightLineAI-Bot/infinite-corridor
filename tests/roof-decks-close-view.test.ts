// Roof decks with Close View's taller houses and calmer camera (2026-11-12, release 915's merge of roof decks onto the
// Close View refinements): the Wayfarer's feet stand on the drawn (1.5x taller) roof, their own roof is never hidden or
// faded, the camera eases up onto a roof landed on from the bank beside it, and the drone cannot lift them through a roof
// from inside the house.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { structureOccupancy } from '../src/world.ts';
import { roofDeckById, roofDeckIndex } from '../src/roof-decks.ts';
import { DRONE, DRONE_LIFT, setMechMode } from '../src/vehicle-gates.ts';
import { OUTDOOR, OUTDOOR_FLOATS, outdoorBuildingHeights, outdoorRelief, outdoorRoofZ, outdoorScene, outdoorSurfaceZ } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewCamera, closeViewHeroFeetZ, closeViewRoofOpacity, closeViewShowing, resetCloseViewCamera, roofHidden, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { resetCloseViewGL } from '../src/close-view-gl.ts';

const SEED = 'ROOF', W = 32, L = OUTDOOR.terrain.level, V: any = CLOSE_VIEW.camera.vertical, D = outdoorBuildingHeights();
// Sections of seed ROOF (as tests/roof-decks.test.ts): a shelter's shack, a hamlet's huts, a ruin district.
const SECTIONS = [[-2, 0], [1, -4], [2, 3]], SHACK = { rx: -2, ry: 0, id: 'shack--2-0' }, HUTS = { rx: 1, ry: -4 };
function at(rx: number, ry: number, extra = (_s: any) => {}) {
  const s: any = freshSave(); s.seed = SEED; s.maxHp = 100; extra(s); Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.player.hp = g.save.maxHp; return { s, g };
}
const open = (g: any, x: number, y: number, elev: number) => Object.assign(g.map.tiles[y * W + x], { kind: 'ash', blocked: false, elev, slope: false, environment: undefined });
const stand = (g: any, x: number, y: number) => { g.player.x = x; g.player.y = y - .25; };
const feet = (g: any) => [g.player.x + .5, g.player.y + .75];
const inp = (x: number, y: number, jump = false, hold = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: (k: string) => k === 'jump' && hold }; };
// The deck's west wall cell on a row: `mid` the middle row (a gable's end at the ridge), else the first inner row (near an eave).
function westRow(d: any, mid = true) {
  const rows = new Map<number, number>(); for (const i of d.cells) { const x = i % W, y = Math.floor(i / W); if (!rows.has(y) || x < rows.get(y)!) rows.set(y, x); }
  const ys = [...rows.keys()].sort((a, b) => a - b), y = mid ? ys[Math.floor(ys.length / 2)] : ys[1]; return { y, x0: rows.get(y)! };
}

class StubGL { constructor() { let next = 1; const c = new Map(); return new Proxy(this, { get: (o: any, k: any) => { if (k in o) return o[k]; if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!c.has(k)) c.set(k, next++); return c.get(k); } return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; } createShader() { return {}; } getShaderParameter() { return true; }
  createProgram() { return {}; } getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; } createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; } }
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: () => void) {
  const prev = (globalThis as any).WebGL2RenderingContext, gl: any = new StubGL(); let made = 0; (globalThis as any).WebGL2RenderingContext = StubGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return { width: 390, height: 844, getContext: () => ctx2d() }; return { width: 390, height: 844, addEventListener() {}, getContext: (k: string) => k === 'webgl2' ? gl : ctx2d() }; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (prev === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = prev; }
}
// Close View over a ROOF section; each frame is a game update and a render, 60 a second.
function closeView(g: any, reduceMotion = false) {
  g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: 'low', reduceMotion };
  const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let T = 1000;
  const frame = (x = 0, y = 0, jump = false) => { T += 16; g.update(.016, inp(x, y, jump), T); render(screen, g, 390, 844, T); return closeViewCamera(); };
  return { frame, R: () => outdoorRelief(g.map) };
}
// The Wayfarer on the bank one level under the deck, two tiles west of its wall, hops east onto the roof and walks on a little.
function hopOn(mid: boolean, reduceMotion = false) {
  const { g } = at(SHACK.rx, SHACK.ry), d = roofDeckById(g.map, SHACK.id), { y, x0 } = westRow(d, mid), v = closeView(g, reduceMotion);
  for (let k = 1; k <= 4; k++) open(g, x0 - k, y, d.level - 1); stand(g, x0 - 2, y);
  for (let i = 0; i < 120; i++) v.frame(); assert.equal(closeViewShowing(g), true);
  const bank = closeViewCamera().anchorZ, seen: any[] = [];
  for (let i = 0; i < 200; i++) { const c = v.frame(i < 70 ? 1 : 0, 0, i === 20), [fx, fy] = feet(g); seen.push({ anchor: c.anchorZ, on: g.roofDeck?.id === d.id, feet: closeViewHeroFeetZ(), roof: outdoorRoofZ(d, fx, fy, v.R()), lag: c.anchorZ - closeViewHeroFeetZ() }); }
  return { g, d, bank, seen, v };
}

test('the deck\'s drawn surface is the tall roof the houses are built with (OUTDOOR.buildings.tall), nothing drawn over the feet', () => {
  let houses = 0;
  for (const [rx, ry] of SECTIONS) {
    const { g } = at(rx, ry), R = outdoorRelief(g.map), scene: any = outdoorScene(g.map, true), V8 = scene.solids.data, at0 = scene.solids.housesAt;
    for (const d of roofDeckIndex(g.map).decks) {
      const r = scene.houses.roofs.find((q: any) => q.id === d.id); assert.ok(r, `${d.id} has a drawn roof`);
      const base = Math.max(0, R.top[d.cells[0]] || 0), flat = d.roofProfile === 'flat' || d.roofProfile === 'stepped';
      // at the eave (a footprint corner) the roof is the tall wall's top; at the middle the tall ridge (or the flat slab)
      assert.ok(Math.abs(outdoorRoofZ(d, d.x0, d.y0, R) - base - (flat ? D.wall + D.flat : D.wall)) < 1e-9, `${d.id}: the eave at the tall wall's top`);
      const alongX = d.x1 - d.x0 >= d.y1 - d.y0, half = (alongX ? d.y1 - d.y0 : d.x1 - d.x0) / 2, top = base + D.wall + (flat ? D.flat : Math.min(D.ridge, half * D.pitch));
      assert.ok(Math.abs(outdoorRoofZ(d, (d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, R) - top) < 1e-9, `${d.id}: the ridge`);
      // every vertex of the drawn roof over the footprint is at or under the feet's surface there: the ridge beam's few hundredths at most
      let over = -Infinity, hit = 0;
      for (let v = at0 + r.start; v < at0 + r.start + r.count; v++) { const o = v * OUTDOOR_FLOATS, x = V8[o], y = V8[o + 1], z = V8[o + 2];
        if (x < d.x0 || x > d.x1 || y < d.y0 || y > d.y1) continue; const s = outdoorRoofZ(d, x, y, R); over = Math.max(over, z - s); if (Math.abs(z - s) < 1e-4) hit++; }
      assert.ok(over <= .06, `${d.id}: nothing over the surface but the ridge beam (${over.toFixed(3)})`); assert.ok(hit >= 4, `${d.id}: the roof's own corners lie on it (${hit})`);
      houses++;
    }
  }
  assert.ok(houses >= 6, `decks checked (${houses})`);
});

test('the heights, reported: game levels stay as they are; the feet stand on the drawn roof, whatever its height', () => {
  const { g } = at(SHACK.rx, SHACK.ry), d = roofDeckById(g.map, SHACK.id), R = outdoorRelief(g.map), ground = outdoorSurfaceZ(R, d.x0 + .5, d.y0 + .5);
  assert.equal(d.level - d.base, 2, 'a shack is a 2-level deck'); assert.equal(L, 1.2, 'a level is 1.2 tiles in Close View');
  const eave = outdoorRoofZ(d, d.x0, d.y0, R) - ground, ridge = outdoorRoofZ(d, (d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, R) - ground;
  assert.ok(Math.abs(eave - 1.725) < 1e-6 && Math.abs(ridge - 3.3) < 1e-6, `eave ${eave.toFixed(3)}, ridge ${ridge.toFixed(3)} against 2 levels = ${(2 * L).toFixed(2)}`);
  assert.ok(V.deckLag >= ridge - L - 1e-9 && V.deckLag < V.snap && V.deckLag > V.maxLag, 'the camera\'s roof lag covers the tallest step from a bank onto a ridge, and never reaches the snap');
});

for (const mid of [true, false]) test(`hopping onto a roof from the bank (${mid ? 'the gable end, at the ridge' : 'near an eave'}): the feet on the drawn roof, the camera eased up to it, never cut`, () => withGPU(() => {
  const { seen, bank } = hopOn(mid), landed = seen.findIndex((f) => f.on); assert.ok(landed > 0, 'on the roof');
  for (let i = landed; i < seen.length; i++) assert.ok(Math.abs(seen[i].feet - seen[i].roof) < 1e-6, `frame ${i}: the feet on the roof (${seen[i].feet.toFixed(3)} vs ${seen[i].roof.toFixed(3)})`);
  let prev = bank, most = 0; for (const f of seen) { most = Math.max(most, Math.abs(f.anchor - prev)); prev = f.anchor; }
  const step = seen[landed].roof - bank;
  assert.ok(most < .12, `eased, never cut: at most ${most.toFixed(3)} a frame for a ${step.toFixed(2)} step (before the merge's fix: one ${(step + L).toFixed(2)} snap)`);
  for (const f of seen) assert.ok(f.anchor <= f.feet + 1e-6 || !f.on, 'rises to it from below, no overshoot');
  assert.ok(Math.abs(seen[seen.length - 1].anchor - seen[seen.length - 1].feet) < .05, 'arrives');
  if (mid) assert.ok(step > V.maxLag, `the gable end is a step past the ordinary cap (${step.toFixed(2)} > ${V.maxLag})`);
}));

test('walking across a gable the feet follow its slope; the own roof is kept drawn whole, though the feet are over the inside', () => withGPU(() => {
  const { g, d, v } = hopOn(true), scene: any = outdoorScene(g.map, true), i = scene.houses.roofs.findIndex((r: any) => r.id === d.id), r = scene.houses.roofs[i];
  assert.ok(i >= 0); const [fx, fy] = feet(g); assert.equal(roofHidden(g.map, r, fx, fy, fx, fy), true, 'by the tall-houses rule alone it would be hidden');
  assert.equal(closeViewRoofOpacity(i), 1, 'kept');
  const zs: number[] = [], ys: number[] = []; for (let k = 0; k < 80; k++) { v.frame(0, k < 40 ? -1 : 1); ys.push(g.player.y); assert.equal(g.roofDeck?.id, d.id); const [x, y] = feet(g); assert.ok(Math.abs(closeViewHeroFeetZ() - outdoorRoofZ(d, x, y, v.R())) < 1e-6, 'on the slope'); zs.push(closeViewHeroFeetZ()); assert.equal(closeViewRoofOpacity(i), 1, 'never faded'); }
  assert.ok(Math.max(...zs) - Math.min(...zs) > .2, `the feet went down the slope and back (${Math.min(...zs).toFixed(2)}..${Math.max(...zs).toFixed(2)}, y ${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)})`);
}));

function drone(rx: number, ry: number) {
  const { s, g } = at(rx, ry, (s) => { s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; });
  setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; assert.ok(g.droneUp()); return { s, g };
}
const interior = (g: any, d: any) => d.cells.map((i: number) => ({ i, t: g.map.tiles[i] })).find((c: any) => c.t.structure.endsWith('Interior') && !c.t.wallSides?.length);
const doorOf = (g: any, d: any) => d.cells.map((i: number) => ({ i, t: g.map.tiles[i] })).find((c: any) => c.t.doorSide);

test('the drone will not lift the Wayfarer through a roof from inside a house; outside and on the roof it lifts as before', () => {
  for (const [rx, ry] of [[SHACK.rx, SHACK.ry], [HUTS.rx, HUTS.ry]]) for (const d0 of roofDeckIndex(at(rx, ry).g.map).decks.slice(0, 2)) {
    // inside: the jump that would start the booster is only a jump, and says why
    { const { g } = drone(rx, ry), d = roofDeckById(g.map, d0.id), c = interior(g, d); assert.ok(c, `${d.id} has an inner floor tile`);
      stand(g, c.i % W, Math.floor(c.i / W)); assert.equal(structureOccupancy(g.map.tiles, W, g.player.x, g.player.y), d.id, 'inside');
      let t = 1000; g.update(.05, inp(0, 0, true), t += 50); g.update(.05, inp(0, 0, true, true), t += 50);
      assert.equal(g.droneLift, null, `${d.id}: no lift under the roof`); assert.equal(g.message, DRONE_LIFT.roofed);
      for (let k = 0; k < 40; k++) g.update(.05, inp(0, 0, false, true), t += 50);
      assert.equal(g.roofDeck, null); assert.equal(structureOccupancy(g.map.tiles, W, g.player.x, g.player.y), d.id, 'still inside'); assert.equal(g.player.hp, g.save.maxHp); }
    // a lift carried in low through the doorway: held under the roof, under the walls' reach, however long Jump is held
    { const { g } = drone(rx, ry), d = roofDeckById(g.map, d0.id), c = doorOf(g, d); assert.ok(c, `${d.id} has a door`);
      stand(g, c.i % W, Math.floor(c.i / W)); g.droneLift = { base: d.base, z: d.base + .2, vz: 0 }; g.jumpUntil = 1100; g.skyAir = d.base;
      let t = 1000, top = -Infinity; const inward = { north: [0, 1], south: [0, -1], east: [-1, 0], west: [1, 0] }[c.t.doorSide as string]!;
      for (let k = 0; k < 60 && g.droneLift; k++) { g.update(.05, inp(k < 12 ? inward[0] : 0, k < 12 ? inward[1] : 0, false, true), t += 50); if (g.droneLift) top = Math.max(top, g.droneLift.z); }
      assert.ok(structureOccupancy(g.map.tiles, W, g.player.x, g.player.y) === d.id, `${d.id}: in through the door`);
      assert.ok(top <= d.base + DRONE_LIFT.roofHeadroom + 1e-9, `${d.id}: capped at ${top.toFixed(2)} (the floor ${d.base} + ${DRONE_LIFT.roofHeadroom})`);
      assert.ok(Math.floor(top + 1e-6) + 1 < d.level, 'under the walls\' reach: they still hold'); assert.equal(g.roofDeck, null, 'never through onto the roof'); }
    // on the roof itself the booster lifts as before
    { const { g } = drone(rx, ry), d = roofDeckById(g.map, d0.id), c = interior(g, d); stand(g, c.i % W, Math.floor(c.i / W)); g.setRoofDeck(d);
      let t = 1000; g.update(.05, inp(0, 0, true), t += 50); g.update(.05, inp(0, 0, true, true), t += 50);
      assert.ok(g.droneLift, `${d.id}: lifts from the roof`); assert.equal(g.message, DRONE_LIFT.engage);
      for (let k = 0; k < 10; k++) g.update(.05, inp(0, 0, false, true), t += 50); assert.ok(g.droneLift.z > d.level + .5, 'up from the roof'); }
  }
  // outside, beside the house, as before
  const { g } = drone(SHACK.rx, SHACK.ry), d = roofDeckById(g.map, SHACK.id), { y, x0 } = westRow(d); open(g, x0 - 1, y, d.base); open(g, x0 - 2, y, d.base); stand(g, x0 - 2, y);
  let t = 1000; g.update(.05, inp(0, 0, true), t += 50); g.update(.05, inp(0, 0, true, true), t += 50); assert.ok(g.droneLift, 'outside it lifts'); assert.equal(g.message, DRONE_LIFT.engage);
});
