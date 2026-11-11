// Varied skies for the Close View overworld (Tim, 2026-11-11: "We can have sunset, we can have sunrise, we can have night sky,
// we can have clouds. We can have stormy, overcast."): the mood table (close-view-outdoor.ts OUTDOOR.moods), its deterministic
// choice per block of sections, every region sky under every mood, and the frame's sky uniforms through the real render
// transaction on a storage-aware stand-in GL (Reduced Motion holds the clouds and lightning still; the low tier keeps one
// layer of cloud noise and no bolt).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { CLOSE_VIEW_HOOKS, closeViewShowing, overworldCloseViewApplies, resetCloseViewCamera, setCloseViewCanvasFactory } from '../src/close-view.ts';
import { GLF, resetCloseViewGL } from '../src/close-view-gl.ts';
import { OUTDOOR, LIGHTNING, moodFor, outdoorLightning, outdoorMoodId, outdoorSky, outdoorSkyId, outdoorSkyMix, outdoorSignature } from '../src/close-view-outdoor.ts';

const MOODS = ['sunrise', 'day', 'sunset', 'night', 'overcast', 'storm'];
const SEED = 'CINDER-VERGE-47';
function section(rx: number, ry: number, seed = SEED) { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g.map as any; }
const rgbOk = (c: any) => Array.isArray(c) && c.length === 3 && c.every((v: number) => Number.isFinite(v) && v >= 0 && v <= 255);

test('the mood table is bounded and complete: six moods, every number in range', () => {
  assert.deepEqual(Object.keys(OUTDOOR.moods).sort(), [...MOODS].sort());
  for (const [id, m] of Object.entries(OUTDOOR.moods) as any) {
    for (const c of ['zenith', 'horizon', 'sun', 'cloud']) assert.ok(rgbOk(m[c]), `${id}.${c}`);
    assert.ok(m.weight > 0 && m.weight <= 100, `${id} weight`);
    for (const k of ['mix', 'sunMix', 'cloudDark', 'stars', 'moon', 'lightning', 'torch']) assert.ok(m[k] >= 0 && m[k] <= 1, `${id}.${k}`);
    assert.ok(m.light > 0 && m.light <= 1.2 && m.sunK > 0 && m.sunK <= 1.2, `${id} light`);
    assert.ok(m.clouds >= -1 && m.clouds <= 1, `${id} clouds`);
    assert.ok(m.sunAz === null || (m.sunAz >= 0 && m.sunAz < 360), `${id} azimuth`);
    assert.ok(m.sunEl === null || (m.sunEl > 0 && m.sunEl < 90), `${id} elevation: the light stays above the horizon`);
    assert.ok(m.ambient.length === 3 && m.ambient.every((v: number) => v > 0 && v <= 1.2), `${id} ambient`);
    assert.ok(m.grade.length === 4 && m.grade.every((v: number) => v > .8 && v < 1.2), `${id} grade`);
  }
  for (const [w, row] of Object.entries(OUTDOOR.moodWeather) as any) for (const [id, k] of Object.entries(row) as any) assert.ok(OUTDOOR.moods[id] && k >= 0, `${w}.${id}`);
  assert.equal(OUTDOOR.moods.day.mix, 0, 'by day the region sky is its own');
  assert.equal(OUTDOOR.moods.day.torch, OUTDOOR.torch, 'the carried light by day is unchanged');
  assert.equal(OUTDOOR.moods.night.moon, 1); assert.ok(OUTDOOR.moods.night.stars > .5 && OUTDOOR.moods.night.torch > OUTDOOR.torch, 'night: stars, the moon, a stronger torch');
  assert.ok(OUTDOOR.moods.storm.lightning > 0 && OUTDOOR.moods.storm.cloudDark > OUTDOOR.moods.overcast.cloudDark, 'a storm: darker clouds and lightning');
  assert.ok(Object.entries(OUTDOOR.moods).every(([id, m]: any) => id === 'storm' || m.lightning === 0), 'lightning only in a storm');
  const L = OUTDOOR.lightning; assert.ok(L.slot >= 1000 && L.chance > 0 && L.chance < 1 && L.flicker.length === 3 && L.lift >= 0 && L.lift < 1);
});

test('the mood is chosen deterministically per block of sections, weighed by weather, and changes as you travel', () => {
  for (let i = 0; i < 200; i++) { const rx = (i * 7) % 41 - 20, ry = (i * 13) % 37 - 18;
    for (const w of [undefined, 'still', 'rain', 'snow', 'sunbreak']) assert.equal(moodFor(SEED, rx, ry, w), moodFor(SEED, rx, ry, w)); }
  const seen = new Set<string>(); for (let cx = -12; cx <= 12; cx++) for (let cy = -12; cy <= 12; cy++) seen.add(moodFor(SEED, cx * OUTDOOR.moodCell, cy * OUTDOOR.moodCell, 'still'));
  assert.deepEqual([...seen].sort(), [...MOODS].sort(), 'every mood is met somewhere');
  const c = OUTDOOR.moodCell; for (let bx = -4; bx <= 4; bx++) for (let by = -4; by <= 4; by++) { const m = moodFor(SEED, bx * c, by * c, 'still');
    for (let dx = 0; dx < c; dx++) for (let dy = 0; dy < c; dy++) assert.equal(moodFor(SEED, bx * c + dx, by * c + dy, 'still'), m, 'one mood over a block'); }
  for (let i = 0; i < 300; i++) { const rx = i % 30 - 15, ry = Math.floor(i / 30) * 3 - 15;
    assert.ok(['storm', 'overcast', 'night'].includes(moodFor(SEED, rx, ry, 'rain')), 'rain is never a clear sky');
    assert.ok(!['storm', 'overcast', 'night'].includes(moodFor(SEED, rx, ry, 'sunbreak')), 'a sunbreak is never grey'); }
  assert.notEqual(new Set(Array.from({ length: 10 }, (_, i) => moodFor('OTHER', i * c, 0, 'still'))).size, 1, 'another journey, other skies');
  // a section's mood: the same on every load, and choosing it changes nothing in the section
  for (const [rx, ry] of [[0, 0], [-1, -1], [5, -5], [-4, -4]]) {
    const a = section(rx, ry), b = section(rx, ry), before = JSON.stringify(a.tiles) + JSON.stringify(a.objects), sig = outdoorSignature(a);
    assert.equal(outdoorMoodId(a), outdoorMoodId(b)); assert.equal(outdoorMoodId(a), moodFor(a.seed, rx, ry, a.weather));
    assert.equal(outdoorSky(a).mood, outdoorMoodId(a)); assert.equal(outdoorSky(a), outdoorSky(a), 'cached: nothing rebuilt per frame');
    assert.equal(JSON.stringify(a.tiles) + JSON.stringify(a.objects), before); assert.equal(outdoorSignature(a), sig); }
  const sea = section(-2, 0), calm = outdoorSky(sea); sea.weather = 'rain'; const front = outdoorSky(sea);
  assert.ok(['storm', 'overcast', 'night'].includes(front.mood), 'a storm front over the sea turns the sky'); assert.notEqual(front, calm);
});

test('every region sky under every mood and weather is finite and in range, keeping the region tint', () => {
  for (const id of Object.keys(OUTDOOR.skies)) for (const mood of MOODS) for (const w of ['still', 'rain', 'snow', 'sunbreak']) {
    const s: any = outdoorSkyMix(id, mood, w), tag = `${id}/${mood}/${w}`;
    assert.equal(s.id, id); assert.equal(s.mood, mood);
    for (const c of ['zenith', 'horizon', 'haze', 'ridge', 'sunC', 'cloud', 'crown', 'bark']) assert.ok(s[c].length === 3 && s[c].every((v: number) => Number.isFinite(v) && v >= 0 && v <= 1.2), `${tag} ${c}`);
    assert.ok(s.ambient.every((v: number) => Number.isFinite(v) && v > 0 && v < 1.5), `${tag} ambient`);
    assert.ok(s.grade.every((v: number) => Number.isFinite(v) && v > .5 && v < 1.6), `${tag} grade`);
    assert.ok(Math.abs(Math.hypot(...s.sun) - 1) < 1e-9 && s.sun[2] > 0, `${tag}: the light is above the horizon`);
    for (const k of ['clouds', 'cloudDark', 'stars', 'moon', 'lightning', 'torch', 'ridgeH', 'rough', 'frost']) assert.ok(Number.isFinite(s[k]) && s[k] >= 0 && s[k] <= 1, `${tag} ${k}`);
    // the shader's sky over a fan of directions, in the same arithmetic (a reference model: gradient, sun or moon, stars, clouds, a flash)
    for (let el = 0; el <= 90; el += 15) for (let az = 0; az < 360; az += 45) for (const n of [0, .5, 1]) for (const flash of [0, 1]) {
      const d = [Math.cos(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180)];
      const sd = Math.max(0, d[0] * s.sun[0] + d[1] * s.sun[1] + d[2] * s.sun[2]), up = Math.max(0, Math.min(1, d[2]));
      const cover = Math.min(1, Math.max(0, (n + .12 - (1 - s.clouds * .7)) / Math.max(1e-6, (1.12 - s.clouds * .45) - (1 - s.clouds * .7))));
      for (let i = 0; i < 3; i++) {
        let c = s.horizon[i] + (s.zenith[i] - s.horizon[i]) * Math.sqrt(up) + s.sunC[i] * (.16 * sd ** 5 + .45 * sd ** 60 + 2 * (1 - s.moon));
        c += .9 * s.stars; const cc = (s.horizon[i] + (s.cloud[i] - s.horizon[i]) * .5) * (.82 + .3 * n) * (1 - s.cloudDark * (1 - n) * .85) + s.sunC[i] * .18 * sd ** 3;
        c = c + (cc - c) * cover * .85; c += .9 * flash * s.lightning * (.35 + 1.1 * cover);
        assert.ok(Number.isFinite(c) && c >= 0 && c < 6, `${tag} sky ${el}/${az}`); }
    }
  }
  for (const id of Object.keys(OUTDOOR.skies)) assert.deepEqual(outdoorSkyMix(id, 'day').zenith.map((v: number) => Math.round(v * 255)), [...OUTDOOR.skies[id].zenith], `${id}: the day sky is the region's own`);
  for (const mood of MOODS) { const a = outdoorSkyMix('wild', mood), b = outdoorSkyMix('cold', mood);
    assert.ok(Math.hypot(a.horizon[0] - b.horizon[0], a.horizon[1] - b.horizon[1], a.horizon[2] - b.horizon[2]) > .05, `${mood}: the mood blends with the region rather than replacing it`); }
  const chroma = (c: number[]) => Math.max(...c) - Math.min(...c);
  for (const id of ['wild', 'fen', 'waste', 'fire']) { const k = OUTDOOR.skies[id]; assert.ok(chroma(k.zenith) >= 60 || chroma(k.horizon) >= 60, `${id}: a vivid sky, not a dull grey`); }
  assert.ok(chroma(OUTDOOR.skies.wild.zenith) >= 100 && chroma(OUTDOOR.skies.wild.horizon) >= 100, 'the alien sky is vivid');
  assert.equal(outdoorSkyMix('nowhere', 'nowhen').id, 'waste'); assert.equal(outdoorSkyMix('nowhere', 'nowhen').mood, 'day');
});

test('distant lightning is a pure function of time: bounded flashes, no allocation, nothing without a storm', () => {
  let flashes = 0, frames = 0; for (let t = 0; t < 120000; t += 16) { const k = outdoorLightning(t, 1); frames++;
    assert.ok(k >= 0 && k <= 1 && Number.isFinite(LIGHTNING.az) && LIGHTNING.az >= 0 && LIGHTNING.az < Math.PI * 2); if (k > .5) flashes++;
    assert.equal(outdoorLightning(t, 1), k, 'the same time, the same flash'); assert.equal(outdoorLightning(t, 0), 0); }
  assert.ok(flashes > 0 && flashes / frames < .05, `flashes are brief and rare (${flashes} of ${frames} frames)`);
  assert.equal(outdoorLightning(NaN, 1), 0);
});

// ------------------------------------------------------------------------------------------- the frame, on a stand-in GL
class StandInGL {
  uploads: any[] = [];
  constructor() { let next = 1; const constants = new Map(); return new Proxy(this, { get: (o: any, k: any) => {
    if (k in o) return o[k];
    if (typeof k === 'string' && /^[A-Z][A-Z0-9_]+$/.test(k)) { if (!constants.has(k)) constants.set(k, next++); return constants.get(k); }
    return () => {}; } }); }
  isContextLost() { return false; } getError() { return (this as any).NO_ERROR; } getExtension() { return null; }
  createShader() { return {}; } getShaderParameter() { return true; } createProgram() { return {}; }
  getProgramParameter(_p: any, k: any) { return k === (this as any).ACTIVE_UNIFORMS || k === (this as any).ACTIVE_ATTRIBUTES ? 0 : true; }
  createBuffer() { return {}; } createVertexArray() { return {}; } createTexture() { return {}; }
  uniform4fv(_u: any, v: any) { this.uploads.push(Array.from(v)); }
}
function ctx2d() { return new Proxy({ canvas: null as any, globalAlpha: 1, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) },
  { get: (o: any, k: any) => k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } }); }
function withGPU(run: (gl: any, screen: any) => void) {
  const previous = (globalThis as any).WebGL2RenderingContext, gl: any = new StandInGL(), screen: any = ctx2d(), ground: any = { width: 390, height: 844, getContext: () => ctx2d() };
  let made = 0; screen.canvas = { width: 390, height: 844 }; (globalThis as any).WebGL2RenderingContext = StandInGL;
  setCloseViewCanvasFactory(() => { if (++made === 1) return ground; return { width: 390, height: 844, addEventListener() {}, getContext: (kind: string) => kind === 'webgl2' ? gl : ctx2d() }; });
  CLOSE_VIEW_HOOKS.gl = true; resetCloseViewGL(); resetCloseViewCamera();
  try { run(gl, screen); } finally { CLOSE_VIEW_HOOKS.gl = null; resetCloseViewGL(); resetCloseViewCamera(); setCloseViewCanvasFactory(null); if (previous === undefined) delete (globalThis as any).WebGL2RenderingContext; else (globalThis as any).WebGL2RenderingContext = previous; }
}
// the first nearby section of each mood (searched, not pinned: the table may be retuned)
const SPOTS: Record<string, [number, number]> = {};
function spot(mood: string) {
  if (SPOTS[mood]) return SPOTS[mood];
  for (let r = 0; r <= 9; r++) for (let rx = -r; rx <= r; rx++) for (let ry = -r; ry <= r; ry++) { if (Math.max(Math.abs(rx), Math.abs(ry)) !== r) continue;
    const m = section(rx, ry); const id = outdoorMoodId(m); if (!SPOTS[id]) SPOTS[id] = [rx, ry]; if (SPOTS[mood]) return SPOTS[mood]; }
  throw new Error(`no ${mood} section near the origin`);
}
function overworld(rx: number, ry: number, quality: string, reduceMotion: boolean, now: number) {
  const m = section(rx, ry), open = m.tiles.filter((t: any) => !t.blocked && !t.elev && !/water|ocean|shallow|lava|canyon|chasm|abyss|void|pit|river/i.test(t.kind)).sort((a: any, b: any) => Math.hypot(a.x - 16, a.y - 16) - Math.hypot(b.x - 16, b.y - 16));
  for (const t of open.slice(0, 40)) { // the first open ground out of doors (a town's floors are interiors)
    const save = freshSave(); save.seed = SEED; Object.assign(save.session, { area: 'overworld', rx, ry, x: t.x, y: t.y }); save.overworldCloseView = true;
    const g: any = new Game(migrateSave(JSON.parse(JSON.stringify(save))), now); g.lastUpdateNow = now; g.presentation = { effectiveQuality: quality, reduceMotion };
    if (overworldCloseViewApplies(g)) return g; }
  throw new Error(`no open ground out of doors at ${rx},${ry}`);
}
const finite = (a: ArrayLike<number>) => Array.from(a).every(Number.isFinite);
// a moment a storm flashes (found, not pinned)
let FLASH = 100000; while (outdoorLightning(FLASH, 1) < .5) FLASH += 16;

test('each mood renders through the real frame with finite sky uniforms on every tier', () => withGPU((gl, screen) => {
  for (const mood of MOODS) for (const quality of ['low', 'balanced', 'full']) {
    const [rx, ry] = spot(mood), g = overworld(rx, ry, quality, false, FLASH); gl.uploads.length = 0;
    render(screen, g, 390, 844, FLASH); const tag = `${mood}/${quality} at ${rx},${ry}`;
    assert.equal(closeViewShowing(g), true, tag); assert.equal(GLF.outdoor, 1, `${tag}: the open sky is drawn`);
    const sk: any = outdoorSky(g.map); assert.equal(sk.mood, mood);
    for (const k of ['skyZ', 'skyH', 'ridge', 'sunC', 'amb', 'grade', 'mood', 'moodC', 'fog', 'haze', 'torchP']) assert.ok(finite((GLF as any)[k]), `${tag} ${k}`);
    assert.ok(gl.uploads.every(finite), `${tag}: every vec4 uploaded is finite`);
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    assert.ok(near(GLF.mood[0], sk.stars) && near(GLF.mood[1], sk.cloudDark) && near(GLF.mood[2], sk.moon) && near(GLF.skyZ[3], sk.clouds), `${tag}: the mood's numbers reach the shader`);
    assert.ok([0, 1, 2].every((i) => near(GLF.moodC[i], sk.cloud[i])), `${tag}: the clouds' colour`); assert.equal(GLF.finish[2], quality === 'low' ? 0 : 1, `${tag}: the low tier takes the single-layer path`);
    if (mood === 'storm') assert.ok(GLF.mood[3] > .5, `${tag}: a distant flash`); else assert.equal(GLF.mood[3], 0, `${tag}: lightning only in a storm`);
    if (mood === 'night') assert.ok(GLF.torchP[1] > 0 && GLF.amb[2] > GLF.amb[0], `${tag}: a cool night, the torch carried`);
  }
}));

test('Reduced Motion holds the clouds, stars and lightning still', () => withGPU((_gl, screen) => {
  const [rx, ry] = spot('storm');
  for (const now of [FLASH, FLASH + 5000, FLASH + 123457]) { const g = overworld(rx, ry, 'full', true, now); render(screen, g, 390, 844, now);
    assert.equal(GLF.outdoor, 1); assert.equal(GLF.time, 0, 'the sky\'s clock is held'); assert.equal(GLF.mood[3], 0, 'no flash'); }
  const g = overworld(rx, ry, 'full', false, FLASH); render(screen, g, 390, 844, FLASH); assert.ok(GLF.mood[3] > 0 && GLF.time === FLASH, 'without it the storm flashes');
}));

test('the sky shader keeps a cheap low-tier path: one cloud noise layer, stars by one hash, the bolt only on detail tiers', () => {
  const src = fs.readFileSync(new URL('../src/close-view-gl.ts', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('vec3 outdoorSky(vec3 ray, bool full)'), src.indexOf('uint outdoorFlags(ivec2 T)'));
  assert.ok(body.length > 200, 'the sky function is present');
  assert.match(body, /u_finish\.z > 0\.5 \? fbm\(q \* 1\.5\) : vnoise\(q \* 1\.5\)/, 'clouds: fbm on detail tiers, one noise layer on low');
  assert.match(body, /u_finish\.z > 0\.5 && u_mood\.w > 0\.55/, 'the bolt is drawn on detail tiers only');
  const stars = body.slice(body.indexOf('// stars'), body.indexOf('// the moon'));
  assert.ok(stars.length > 0 && !/fbm|cells|for \(/.test(stars), 'stars: a hash a cell, no noise loops');
  assert.match(body, /u_time/, 'motion comes only from the frame clock (held at 0 with reduced motion)');
  assert.ok(!/u_time/.test(body.slice(body.indexOf('if (u_mood.w > 0.0)'), body.indexOf('if (u_skyH.w > 0.0)'))), 'the flash is the CPU\'s (0 with reduced motion), not the shader clock');
  assert.match(src, /uniform vec4 u_mood; uniform vec4 u_moodC;/);
  assert.match(src, /mood: new Float32Array\(4\), moodC: new Float32Array\(4\)/, 'the frame\'s mood numbers are preallocated');
});

test('the mood is presentation only: the save and the section are untouched by rendering', () => withGPU((_gl, screen) => {
  const [rx, ry] = spot('night'), g = overworld(rx, ry, 'balanced', false, 100000), save = JSON.stringify(g.save), map = JSON.stringify(g.map.tiles) + JSON.stringify(g.map.objects);
  render(screen, g, 390, 844, 100000); render(screen, g, 390, 844, 100016);
  assert.equal(JSON.stringify(g.save), save); assert.equal(JSON.stringify(g.map.tiles) + JSON.stringify(g.map.objects), map);
  assert.equal(outdoorSkyId(g.map), outdoorSky(g.map).id);
}));
