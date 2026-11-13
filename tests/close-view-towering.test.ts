// Towering structures in Close View (Tim, 2026-11-13): "If you're in close view outside of a pentagon or a tower or like a
// keep... it just looks incredibly tall, so tall that you can't get to the top of it... And when you're on top of a
// pentagon or keep, and you're in close view... the height should be apparent. So maybe it can be like you're in the clouds,
// or the ground just looks very far away."
// OUTDOOR.towering draws the Pentagon, a Great Castle and a compound's central tower taller (their walls, roofs, parapets,
// balconies, stair and climbs alike), with masonry faces, battlements, haze with height and a cloud deck under a towering
// top. Presentation only: tiles, levels, collision and falls are never written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { LIFT_PER_LEVEL, fallDamage } from '../src/landscape.ts';
import { PENTAGON } from '../src/pentagon.ts';
import { OUTDOOR, TOWER_AIR, outdoorLevelHeight, outdoorRelief, outdoorScene, outdoorSurfaceZ, outdoorTowerAir, outdoorTowering } from '../src/close-view-outdoor.ts';
import { CLOSE_VIEW, CLOSE_VIEW_HOOKS, closeViewHeroFeetZ, closeViewShowing, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { GLF, resetCloseViewGL } from '../src/close-view-gl.ts';

const SEED = 'CINDER-VERGE-47', T = OUTDOOR.towering, W = 32;
// Seed CINDER-VERGE-47: a Pentagon centred on section (0, 24) (version 11, roofed); the section south of its centre holds the
// south face, its roof rows and land below it. A Castle Compound at (8, 8) has a climb up its tower; a Great Castle's keep
// quarter at (-10, 0).
const PENT = { rx: 0, ry: 25 }, CLIMB = { rx: 8, ry: 8 }, CASTLE = { rx: -10, ry: 0 };
function section(rx: number, ry: number) { const s: any = freshSave(); s.seed = SEED; s.maxHp = 1000; Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 }); const g: any = new Game(s, 0); g.enemies = []; return g; }
const HERO_HEIGHT = (() => { const src = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), m = /input\.height = ([\d.]+) \* ([\d.]+);/.exec(src); assert.ok(m, 'the hero height is set'); return Number(m![1]) * Number(m![2]); })();

test('the table: frozen, a scale over one for each structure, the climb, the battlements, the air and the clouds by tier', () => {
  assert.ok(Object.isFrozen(T) && Object.isFrozen(T.scale) && Object.isFrozen(T.clouds) && Object.isFrozen(T.clouds.tiers));
  for (const k of ['pentagon', 'castle', 'tower', 'keep']) assert.ok(T.scale[k] >= 1 && Number.isFinite(T.scale[k]), k);
  assert.ok(T.scale.pentagon >= 3, 'the Pentagon several times its ordinary facade');
  assert.ok(T.climbStep > OUTDOOR.terrain.level && T.climbStep < 2 * OUTDOOR.terrain.level, 'a climb ledge stays about one jump');
  assert.ok(T.merlon.max > 0 && T.merlon.max <= 160 && T.merlon.h < HERO_HEIGHT / 2, 'battlements below the Wayfarer\'s waist, bounded');
  assert.ok(T.drop.from > CLOSE_VIEW_HOOKS_CRANE() && T.drop.full > T.drop.from && T.drop.k > 0 && T.drop.k < 1);
  assert.equal(T.clouds.tiers.low, 0, 'the low tier keeps the haze alone'); assert.ok(T.clouds.tiers.balanced > 0 && T.clouds.tiers.full > 0);
  assert.ok(T.clouds.at > 0 && T.clouds.at < 1 && T.clouds.alpha <= 1);
});
// the camera's highest outdoor crane over the feet (CLOSE_VIEW presets): the drop haze starts under it, so the roof itself stays clear
function CLOSE_VIEW_HOOKS_CRANE() { return Math.max(...Object.values(CLOSE_VIEW.presets as any).map((p: any) => Number(p.outdoorHeight) || 0)); }

test('the Pentagon stands many times the Wayfarer\'s height and higher than any fatal fall drawn on open ground; levels unchanged', () => {
  const g = section(PENT.rx, PENT.ry), before = JSON.stringify(g.map.tiles), R = outdoorRelief(g.map), tw = R.tower;
  assert.equal(JSON.stringify(g.map.tiles), before, 'the map is untouched');
  const roof = g.map.tiles.findIndex((t: any) => t.pentRoof), t = g.map.tiles[roof];
  assert.ok(roof >= 0 && t.elev === PENTAGON.roof.elev, 'a roof tile at the roof\'s level');
  const ordinary = PENTAGON.roof.elev * LIFT_PER_LEVEL * t.roofLift, faceH = 1 + PENTAGON.floors.outer * .55;
  assert.ok(Math.abs(ordinary - faceH) < 1e-6, 'the ordinary roof is drawn at the outer ring\'s facade');
  assert.ok(Math.abs(R.top[roof] - faceH * T.scale.pentagon) < 1e-4, `the roof drawn at the facade times the scale (${R.top[roof]})`);
  assert.ok(R.top[roof] > 8 * HERO_HEIGHT, 'many times the Wayfarer');
  const fatal = [1, 2, 3, 4, 5, 6].find((n) => fallDamage(n, 100) >= 100) ?? 4;
  assert.ok(R.top[roof] > 2 * fatal * OUTDOOR.terrain.level, 'twice a fatal drop on open ground');
  // the inner ring, the curtain and the Heart: walls from the ground at their facade times the scale
  const rec = g.map.objects.find((o: any) => o.kind === 'greatBuilding' && o.pentagon);
  for (const b of rec.blocks) for (const c of b.cells) { const i = c.y * W + c.x, q = g.map.tiles[i]; if (q.blocked && !q.elev) assert.ok(Math.abs(tw.wall[i] - b.faceH * T.scale.pentagon) < 1e-4, `${b.part} wall`); }
  // the parapet stands on the drawn roof
  const par = g.map.tiles.findIndex((q: any) => q.pentParapet); if (par >= 0) assert.ok(Math.abs(R.top[par] - R.top[roof]) < 1e-4);
});

test('the stair and balconies scale with the roof: one level of the structure is one drawn level, so nothing breaks a step', () => {
  for (const [rx, ry] of [[1, 25], [0, 25], [-1, 25], [1, 24], [-1, 24], [0, 23], [1, 23], [-1, 23]]) {
    const g = section(rx, ry), R = outdoorRelief(g.map), k = (i: number) => R.tower.level[i];
    for (let i = 0; i < W * W; i++) { const q = g.map.tiles[i]; if (!(q.pentStair > 0 || q.pentBalcony)) continue;
      assert.ok(k(i) > 0, 'a ledge of the structure'); assert.ok(Math.abs(k(i) - LIFT_PER_LEVEL * q.roofLift * T.scale.pentagon) < 1e-6, 'the roof\'s own level');
      if (!q.slope) assert.ok(Math.abs(R.top[i] - q.elev * k(i)) < 1e-4); }
  }
});

test('an ordinary section is drawn exactly as before: no towering tiles, every level its own height', () => {
  for (const [rx, ry] of [[-6, 0], [2, 3], [5, -5]]) {
    const g = section(rx, ry), R = outdoorRelief(g.map); if (R.tower.any) continue;
    for (let i = 0; i < W * W; i++) { const q = g.map.tiles[i]; if (q.slope || /canyon|abyss|chasm/i.test(q.kind) || q.chasm) continue; const water = OUTDOOR.waterKinds.test(String(q.kind || ''));
      assert.ok(Math.abs(R.top[i] - ((q.elev || 0) * outdoorLevelHeight(q) - (water ? OUTDOOR.terrain.waterDrop : 0))) < 1e-5); }
    assert.equal(outdoorScene(g.map, true).mesh.merlons, 0, 'no battlements');
  }
});

test('a sealed tower\'s climb: its ledges and roof share one level, never taller than climbStep, so each ledge is one jump', () => {
  const g = section(CLIMB.rx, CLIMB.ry), R = outdoorRelief(g.map), ledges = g.map.tiles.map((t: any, i: number) => t.towerClimb ? i : -1).filter((i: number) => i >= 0);
  assert.ok(ledges.length > 0, 'the compound has its climb');
  const k = R.tower.level[ledges[0]]; assert.ok(k > OUTDOOR.terrain.level - 1e-9 && k <= T.climbStep + 1e-6, `level ${k}`);
  for (const i of ledges) { assert.equal(R.tower.level[i], k); assert.ok(Math.abs(R.top[i] - g.map.tiles[i].elev * k) < 1e-4); }
  const rec = g.map.objects.find((o: any) => o.kind === 'greatBuilding' && o.compound), t = rec.blocks.find((b: any) => b.part === 't');
  for (const c of t.cells) { const i = c.y * W + c.x, q = g.map.tiles[i]; if (q.roofLift && !q.blocked) assert.ok(Math.abs(R.tower.level[i] - k) < 1e-6, 'the tower\'s roof on the climb\'s level'); }
  const ring = rec.blocks.find((b: any) => b.part !== 't'); for (const c of ring.cells) assert.equal(R.tower.level[c.y * W + c.x], 0, 'the ring is left as it is');
});

test('a Great Castle: its ranges and keep tower over the Wayfarer, the keep over its ranges', () => {
  const g = section(CASTLE.rx, CASTLE.ry), tw = outdoorTowering(g.map), rec = g.map.objects.find((o: any) => o.kind === 'greatBuilding' && o.castle);
  const tallest = (part: string) => { const b = rec.blocks.find((q: any) => q.part === part); let m = 0; for (const c of b.cells) m = Math.max(m, tw.top[c.y * W + c.x]); return m; };
  assert.ok(tallest('wing') > 4 * HERO_HEIGHT, 'the ranges'); assert.ok(tallest('t') > tallest('wing'), 'the keep stands over them');
});

// A GPU stand-in, as tests/roof-decks-close-view.test.ts: every frame is the real update and render.
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
const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function frames(g: any, n: number, quality = 'balanced', reduceMotion = false, t0 = 1000) {
  g.save.overworldCloseView = true; g.save.closeViewPreset = 'standard'; g.save.closeViewAutoFollow = false; g.presentation = { effectiveQuality: quality, reduceMotion };
  const screen: any = ctx2d(); screen.canvas = { width: 390, height: 844 }; let t = t0; for (let i = 0; i < n; i++) { t += 16; g.update(.016, still, t); render(screen, g, 390, 844, t); } return t;
}
// the Wayfarer on the roof's middle row, its south face a few tiles off
function onRoof(g: any) { const i = g.map.tiles.findIndex((t: any, k: number) => t.pentRoof && g.map.tiles[k + W]?.pentRoof && g.map.tiles[k - W]?.pentRoof && (k % W) > 4 && (k % W) < 27); g.player.x = i % W; g.player.y = Math.floor(i / W) - .75; g.player.facing = 'down'; return i; }

test('on the roof the Wayfarer\'s feet stand on the drawn roof, the air below is hazed and a cloud deck lies under them', () => {
  withGPU(() => {
    const g = section(PENT.rx, PENT.ry), i = onRoof(g); frames(g, 90);
    assert.equal(closeViewShowing(g), true); const R = outdoorRelief(g.map);
    assert.ok(Math.abs(closeViewHeroFeetZ() - R.top[i]) < 1e-3, `feet ${closeViewHeroFeetZ()} on the drawn roof ${R.top[i]}`);
    assert.ok(Math.abs(outdoorSurfaceZ(R, g.player.x + .5, g.player.y + .75) - R.top[i]) < 1e-6, 'creatures, items and shadows stand on the same surface');
    assert.ok(GLF.tower[0] > T.drop.k * .9, `the drop haze is on (${GLF.tower[0]})`); assert.ok(GLF.towerR[0] > 0, 'the rise haze is on in this section');
    assert.ok(GLF.deck[2] > 0 && GLF.deck[0] > 0 && GLF.deck[0] <= R.top[i] - T.clouds.clear + 1e-6, 'the cloud deck under the feet');
  });
});

test('at the Pentagon\'s foot: no drop haze or deck, the rise haze on; the low tier draws no cloud deck', () => {
  withGPU(() => {
    const g = section(PENT.rx, PENT.ry), foot = g.map.tiles.findIndex((t: any, k: number) => !t.greatBuilding && !t.blocked && !t.elev && g.map.tiles[k - W]?.pentRoof);
    assert.ok(foot >= 0); g.player.x = foot % W; g.player.y = Math.floor(foot / W) + 1.25; g.player.facing = 'up'; frames(g, 60);
    assert.equal(GLF.tower[0], 0); assert.equal(GLF.deck[2], 0); assert.ok(GLF.towerR[0] > 0);
  });
  withGPU(() => { const g = section(PENT.rx, PENT.ry); onRoof(g); frames(g, 90, 'low'); assert.ok(GLF.tower[0] > 0, 'the haze still shows'); assert.equal(GLF.deck[2], 0, 'no deck on the low tier'); });
});

test('reduced motion holds the cloud deck still; the air is computed into the frame\'s own arrays (nothing allocated)', () => {
  const g = section(PENT.rx, PENT.ry), R = outdoorRelief(g.map), i = onRoof(g), sky = outdoorScene(g.map, true).sky, x = g.player.x + .5, y = g.player.y + .75, z = R.top[i];
  const F: any = { fogNear: 10, fogFar: 24, fogP: new Float32Array(4), tower: new Float32Array(4), towerR: new Float32Array(4), towerC: new Float32Array(3), deck: new Float32Array(4), deckP: new Float32Array(4), deckC: new Float32Array(3), deckS: new Float32Array(3) }, arrays = Object.values(F);
  TOWER_AIR.map = null; outdoorTowerAir(F, g.map, R, x, y, z, sky, 1000, true); const a = F.deck[3]; outdoorTowerAir(F, g.map, R, x, y, z, sky, 61000, true);
  assert.equal(F.deck[3], a, 'still with reduced motion'); assert.equal(a, 0);
  outdoorTowerAir(F, g.map, R, x, y, z, sky, 1000, false); const b = F.deck[3]; outdoorTowerAir(F, g.map, R, x, y, z, sky, 61000, false); assert.notEqual(F.deck[3], b, 'it drifts otherwise');
  assert.ok(Object.values(F).every((v, i) => typeof v === 'number' || v === arrays[i]), 'the same arrays');
  // the strength eases in as the feet rise onto the top and out as they leave it
  TOWER_AIR.map = null; outdoorTowerAir(F, g.map, R, x, y, 0, sky, 0); assert.equal(F.tower[0], 0, 'at the foot');
  outdoorTowerAir(F, g.map, R, x, y, z, sky, 100); const mid = F.tower[0]; assert.ok(mid > 0 && mid < T.drop.k, `eased (${mid})`);
  for (let t = 200; t < 5000; t += 100) outdoorTowerAir(F, g.map, R, x, y, z, sky, t); assert.ok(Math.abs(F.tower[0] - T.drop.k) < 1e-3);
});

test('the phone budget: battlements bounded a section, the solids grow by at most their faces', () => {
  for (const [rx, ry] of [[0, 25], [1, 25], [0, 24], [CLIMB.rx, CLIMB.ry], [CASTLE.rx, CASTLE.ry]]) {
    const g = section(rx, ry), sc = outdoorScene(g.map, true);
    assert.ok(sc.mesh.merlons <= T.merlon.max, `${rx},${ry}: ${sc.mesh.merlons} merlons`);
    const plain = outdoorScene(section(-6, 0).map, true).mesh; assert.equal(plain.merlons, 0);
    assert.ok(sc.mesh.verts - sc.mesh.merlons * 30 >= 0, 'five faces (ten triangles) a merlon');
  }
});
