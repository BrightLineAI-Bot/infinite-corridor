// The Wardrobe (Pack → Wardrobe; Tim's cosmetics plan, step 1): a live preview of the Wayfarer alone, and a quick swap of the
// weapons, tools and armour you own. No skins yet; they come in a later step. Presentation only: nothing here changes the save
// except through the equip and preset functions main.ts hands in (the Gear tab's and the Arcanum's own).
//
// Close View preview: its own small WebGL2 canvas and context, with its own hero and gear programs (close-view-hero-gl.ts takes
// any context). It never touches the game's Close View context (close-view-gl.ts module state), its buffers or its textures.
// The pose is the game's own CPU pose (close-view-hero.ts sampleCloseViewHero) in its resting idle, holding the equipped weapon
// and tool as the game holds them (close-view-models.ts writeCloseViewHeroEquipment / writeCloseViewHeroKit, close-view-sweep-gear.ts
// writeCloseViewHeldTool). Drag or swipe sideways to turn the Wayfarer a full turn; the camera stays at about chest height,
// looking a little down. Drawn only while the tab is open (at most WARDROBE.fps, and only on a change under reduced motion, when
// the idle is held still); everything is released when the tab closes. Without WebGL2 (or the hero's data) the Standard View
// preview stands in: the Wayfarer's sprite through renderer.ts drawWayfarerSprite, which sets and restores the sprite globals.
import { getCloseViewHeroAsset, loadCloseViewHero, closeViewHeroBodyAsset, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from './close-view-hero.ts';
import { createHeroGL, prepareHeroGL, uploadHeroFrame, drawHeroGL, disposeHeroGL } from './close-view-hero-gl.ts';
import { MODEL_FLOATS, MODEL_MAX_VERTICES, HERO_SLOT_EXTRA_TRIANGLES, writeCloseViewHeroEquipment, writeCloseViewHeroKit } from './close-view-models.ts';
import { closeViewHeldToolKind, writeCloseViewHeldTool } from './close-view-sweep-gear.ts';
import { CLOSE_VIEW_HELD_GEAR, closeViewHeldHand } from './close-view-player-presentation.ts';
import { importedEmitterAppearance, cleaverCarryFrame } from './action-motion.ts';
import { primaryCarryKind, rangedWeapon, itemTier } from './items.ts';
import { wayfarerBody } from './journey-start.ts';
import { drawWayfarerSprite } from './renderer.ts';

export const WARDROBE = Object.freeze({
  // the camera: `distance` tiles in front of the Wayfarer, its eye at `eye` tiles, looking at `target` tiles up (a slight
  // downward angle); `lens` is the focal length as a share of the canvas height
  // The framing (wardrobeCamera): the body and its held gear fit inside the canvas less `margin` (a share of each half), over
  // a whole turn; `lens` is the closest it comes, so a bare-handed Wayfarer is never blown up; `bounds` is the extent assumed
  // before the first pose (the bare body's: radius, lowest and highest point, in tiles); `turnSamples` the angles checked.
  camera: Object.freeze({ distance: 3.4, eye: 1.18, target: .7, lens: 1.95, margin: .08, bounds: Object.freeze({ r: .45, z0: 0, z1: 1.42 }), turnSamples: 24, pad: 1.06 }),
  height: 1.68 * .82, // the Wayfarer's height in tiles, as Close View draws her (close-view.ts input.height)
  frontYaw: -Math.PI / 2, // the yaw that faces the camera
  turnPerPx: .0125, // radians a CSS pixel of drag
  keyStep: Math.PI / 12, // radians an arrow key
  fps: 30, // the idle's frame cap
  maxDpr: 2, // device pixels a CSS pixel, at most
  // lights, fixed to the viewer (the Wayfarer turns under them): a key from the front-left above, a cool fill, ambient
  key: Object.freeze([-.45, -.62, .64]), keyColor: Object.freeze([.62, .58, .52]),
  fill: Object.freeze([.7, -.3, .2]), fillColor: Object.freeze([.22, .25, .3]),
  ambient: Object.freeze([.8, .8, .82]),
  sprite: Object.freeze({ height: .72, width: .95 }), // the sprite's tile size, as a share of the canvas height and width (whichever is smaller), so the blade in hand fits
  modes: Object.freeze(['close', 'standard']),
  labels: Object.freeze({ close: 'Close View', standard: 'Standard View' }),
});
// The quick swap's groups (the slots shown, in order).
export const WARDROBE_SLOTS = Object.freeze([Object.freeze(['primary', 'Weapons']), Object.freeze(['secondary', 'Tools']), Object.freeze(['armor', 'Armour'])]);
// The pieces you own, by slot: the equipped one first, then the pack's, then the sling's (release 543). The other preset's kept
// pieces (release 541) are not listed: they are switched to with the preset, not equipped one by one.
// `slung`: the sling as sling.ts ensureSling normalises it (its indices are the ones equipFromSling takes).
export function wardrobeOwned(save, slung = save?.sling) {
  const pack = Array.isArray(save?.inventory) ? save.inventory : [], sling = Array.isArray(slung) ? slung : [];
  return WARDROBE_SLOTS.map(([slot, label]) => {
    const items = [], on = save?.equipment?.[slot];
    if (on && typeof on === 'object') items.push({ slot, item: on, source: 'equipped', index: -1 });
    pack.forEach((item, index) => { if (item && typeof item === 'object' && item.slot === slot) items.push({ slot, item, source: 'pack', index }); });
    sling.forEach((item, index) => { if (item && typeof item === 'object' && item.slot === slot) items.push({ slot, item, source: 'sling', index }); });
    return { slot, label, items };
  });
}
// Equips one entry through the shared functions main.ts hands in: `equip.carried(index)` (the Gear tab's Equip) and
// `equip.slung(index)` (the sling's Equip). The rules live there, not here. Returns what they return; false for the equipped piece.
export function wardrobeEquip(entry, equip) {
  if (entry?.source === 'pack') return equip.carried(entry.index);
  if (entry?.source === 'sling') return equip.slung(entry.index);
  return false;
}
const pieceName = (q) => q ? `${q.name} +${q.upgradeRank || 0}` : '';
// One short line a preset: what it holds. The active preset holds what is equipped; the other keeps its own weapon and tool
// (save.presetGear, release 541) or shares this preset's. Armour is shared by both (release 553).
export function wardrobePresetLines(save) {
  const active = save?.magicSkills?.preset || 0, kept = save?.presetGear?.[1 - active] || {}, eq = save?.equipment || {};
  return [0, 1].map((i) => {
    if (i === active) return `Preset ${i + 1} (in use): ${pieceName(eq.primary) || 'no weapon'} · ${pieceName(eq.secondary) || 'no tool'}`;
    const w = kept.primary ? pieceName(kept.primary) : `preset ${active + 1}'s weapon`, t = kept.secondary ? pieceName(kept.secondary) : `preset ${active + 1}'s tool`;
    return `Preset ${i + 1}: ${w} · ${t}`;
  });
}

// What the Wayfarer holds at rest, as close-view.ts works it out for the imported hero with no action under way: the weapon
// (or the Iron Fists) in the displayed left hand, the Great Sweep or the Aether Orrery in the right beside it; with the tool in
// hand (`tool`), the tool's emitter instead, unless the tool is one held beside the weapon. Pure.
export function wardrobeHeld(save, fists = false, tool = false) {
  const primary = primaryCarryKind(save?.equipment?.primary), rightTool = closeViewHeldToolKind(save);
  let held = tool ? 'emitter' : fists ? 'fist' : primary;
  const toolOwnsHeld = !!rightTool && held === 'emitter', base = toolOwnsHeld ? (fists ? 'fist' : primary) : held;
  const grip = Object.hasOwn(CLOSE_VIEW_HELD_GEAR, base) ? CLOSE_VIEW_HELD_GEAR[base].grip : base === 'fist' ? 'bilateral' : 'one';
  const offhand = rightTool && base && closeViewHeldHand(base) === 'left' ? rightTool : '';
  if (offhand) held = base;
  const profile = held === 'emitter' ? importedEmitterAppearance(null, rangedWeapon(save?.equipment?.secondary), false) : held;
  return { held, profile, offhand, single: !!offhand && grip !== 'one', carbine: held === 'emitter' && profile === 'carbine' };
}
// The gear stream's size: one actor slot and the hero's extra reservation (close-view.ts reserves the same for the hero).
export const WARDROBE_GEAR_FLOATS = (MODEL_MAX_VERTICES + HERO_SLOT_EXTRA_TRIANGLES * 3) * MODEL_FLOATS;
// The preview's pose state for one hero asset: preallocated once, reused every frame.
export function createWardrobePose(asset) {
  return { asset, pose: createHeroPoseState(asset), frame: createHeroFrame(asset), gearVertices: new Float32Array(WARDROBE_GEAR_FLOATS), gearFloats: 0,
    input: { nowMs: 0, reducedMotion: false, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: WARDROBE.height, speed: 0, gaitPhase: 0, swim: null, charge: 0, rushGrip: 0,
      powerSuit: false, wayfarerKit: true, accel: 0, turn: 0, hurtFront: NaN, hurtSide: NaN, landing: NaN, heldProfile: '', heldTool: null, primaryCarryStage: null, handProfile: '',
      cleaverFrame: null, artCharge: 0, alpha: 1, hitFlash: 0, tint: new Float32Array([1, 1, 1]), carbineHold: false, carbineRecoil: 0, action: null },
    gear: { profile: '', primaryStage: null, leftSocket: null, rightSocket: null, vialSocket: null, drinkVial: false, vialWeight: 0, alpha: 1, tint: null, hitFlash: 0, offhand: null, single: false, offhandSocket: null, clock: 0, still: false } };
}
// Poses the Wayfarer standing at the origin, turned `yaw`, at `nowMs` (the idle's clock; held still under reduced motion), and
// writes the held gear and the kit into `st.gearVertices` (`st.gearFloats` long). True when the frame is ready to draw.
export function poseWardrobe(st, save, { yaw = WARDROBE.frontYaw, nowMs = 0, reducedMotion = false, fists = false, tool = false } = {}) {
  const h = wardrobeHeld(save, fists, tool), I = st.input, G = st.gear, fr = st.frame;
  I.nowMs = nowMs; I.reducedMotion = reducedMotion; I.yaw = yaw; I.heldProfile = h.held; I.handProfile = h.held; I.heldTool = h.offhand || null;
  I.cleaverFrame = h.held === 'verge-cleaver' ? cleaverCarryFrame() : null; I.carbineHold = h.carbine;
  st.gearFloats = 0;
  if (!sampleCloseViewHero(st.asset, st.pose, I, fr) || !fr.ready) return false;
  G.profile = h.profile; G.leftSocket = fr.leftSocket; G.rightSocket = fr.rightSocket; G.tint = I.tint; G.offhand = h.offhand || null; G.single = h.single;
  G.offhandSocket = h.offhand ? fr.leftSocket /* source-left: the displayed right hand */ : null; G.clock = nowMs; G.still = reducedMotion;
  let o = writeCloseViewHeroEquipment(st.gearVertices, 0, G, fr);
  o = writeCloseViewHeroKit(st.gearVertices, o, G, fr);
  if (h.offhand) o = writeCloseViewHeldTool(st.gearVertices, o, G, st.gearVertices.length);
  st.gearFloats = o; st.heldKey = `${h.held}|${h.profile}|${h.offhand}`; return true;
}
// The extent of the posed Wayfarer and the held gear over a whole turn: the largest distance from the turning axis (the
// origin) and the lowest and highest point. A turn about the axis keeps all three, so the framing does not change with the angle.
export function wardrobeBounds(st, out = {}) {
  let r = 0, z0 = Infinity, z1 = -Infinity; const take = (a, n, stride) => { for (let i = 0; i < n; i += stride) { const x = a[i], y = a[i + 1], z = a[i + 2]; if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue; const d = Math.hypot(x, y); if (d > r) r = d; if (z < z0) z0 = z; if (z > z1) z1 = z; } };
  take(st.frame.positionsNormals, st.frame.vertexCount * 6, 6); take(st.gearVertices, st.gearFloats, MODEL_FLOATS);
  if (!(z1 > z0)) { const B = WARDROBE.camera.bounds; out.r = B.r; out.z0 = B.z0; out.z1 = B.z1; return out; }
  out.r = r * WARDROBE.camera.pad; out.z0 = Math.min(0, z0); out.z1 = z1; return out; // pad: the Orrery's spheres keep their own heading as she turns
}
// The camera's projection for close-view-gl.ts's `project()` convention (forward, right = (-fy, fx), pitch down positive).
// `bounds` (wardrobeBounds): the camera looks at the middle of the extent from the same slight downward angle, and the lens is
// the longest (at most C.lens) that keeps every point of the extent's cylinder, at any angle of the turn, inside the margin.
export function wardrobeCamera(w, h, out = {}, bounds = WARDROBE.camera.bounds) {
  const C = WARDROBE.camera, pitch = Math.atan2(C.eye - C.target, C.distance), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const r = Math.max(0, Number(bounds?.r) || 0), z0 = Number.isFinite(bounds?.z0) ? bounds.z0 : 0, z1 = Number.isFinite(bounds?.z1) ? bounds.z1 : C.bounds.z1;
  const target = (z0 + z1) / 2, eye = target + (C.eye - C.target), dist = Math.max(C.distance, r + 1), hx = w / 2 * (1 - C.margin), hy = h / 2 * (1 - C.margin);
  let F = C.lens * h;
  for (let i = 0; i < C.turnSamples; i++) { const a = i / C.turnSamples * Math.PI * 2, x = r * Math.cos(a), y = r * Math.sin(a), v = y + dist;
    for (const z of [z0, z1]) { const dz = z - eye, depth = v * cp - dz * sp, up = v * sp + dz * cp; if (depth <= .05) continue;
      if (Math.abs(x) > 1e-6) F = Math.min(F, hx * depth / Math.abs(x)); if (Math.abs(up) > 1e-6) F = Math.min(F, hy * depth / Math.abs(up)); } }
  out.cx = 0; out.cy = -dist; out.fx = 0; out.fy = 1; out.rx = -1; out.ry = 0; out.hc = eye; out.cosP = cp; out.sinP = sp;
  out.F = F; out.ppx = w / 2; out.ppy = h / 2; out.w = w; out.h = h; return out;
}

// ---------------------------------------------------------------------------------------------- the preview's own shaders
// The same projection as the game's Close View, and a plain studio light: no fog, haze or vignette.
const VS_COMMON = `#version 300 es
precision highp float;
uniform vec2 u_cam; uniform vec2 u_fwd; uniform vec2 u_right; uniform float u_hc; uniform float u_cosP; uniform float u_sinP; uniform float u_F; uniform vec2 u_pp; uniform vec2 u_size;
const float NEAR = 0.05; const float FAR = 32.0;
vec4 project(vec3 P, out float depth) {
  vec2 d = P.xy - u_cam; float u = dot(d, u_right), v = dot(d, u_fwd), dz = P.z - u_hc;
  depth = v * u_cosP - dz * u_sinP; float up = v * u_sinP + dz * u_cosP;
  float X = u_pp.x * depth + u_F * u, Y = u_pp.y * depth - u_F * up;
  return vec4(2.0 * X / u_size.x - depth, depth - 2.0 * Y / u_size.y, (depth * (FAR + NEAR) - 2.0 * FAR * NEAR) / (FAR - NEAR), depth);
}
`;
const FS_COMMON = `#version 300 es
precision highp float;
precision highp int;
uniform vec3 u_eye; uniform vec3 u_key; uniform vec3 u_keyC; uniform vec3 u_fill; uniform vec3 u_fillC; uniform vec3 u_amb;
void lightsAt(vec3 P, vec3 N, float shin, out vec3 dif, out vec3 spe) {
  dif = u_amb + u_keyC * clamp((dot(N, u_key) + .15) / 1.15, 0.0, 1.0) + u_fillC * clamp((dot(N, u_fill) + .3) / 1.3, 0.0, 1.0); spe = vec3(0.0);
  if (shin > 0.0) spe = u_keyC * pow(max(dot(reflect(-u_key, N), normalize(u_eye - P)), 0.0), shin);
}
vec3 atmos(vec3 c, vec3 P, float depth, vec3 lit) { return c; }
vec3 finish(vec3 c) { c = max(c, 0.0) * 1.18; return c / (1.0 + c * 0.12); }
out vec4 outColor;
`;
const GEAR_VS = VS_COMMON + `
in vec3 a_pos; in vec3 a_nrm; in vec3 a_col; in float a_alpha;
out vec3 v_pos; out vec3 v_nrm; out vec3 v_col; out float v_alpha;
void main() { float d; gl_Position = project(a_pos, d); v_pos = a_pos; v_nrm = a_nrm; v_col = a_col; v_alpha = a_alpha; }`;
const GEAR_FS = FS_COMMON + `
in vec3 v_pos; in vec3 v_nrm; in vec3 v_col; in float v_alpha;
void main() {
  if (v_alpha < .5) discard;
  vec3 N = normalize(v_nrm); if (!gl_FrontFacing) N = -N;
  vec3 dif, spe; lightsAt(v_pos, N, 14.0, dif, spe);
  outColor = vec4(finish(v_col * dif + spe * .35), 1.0);
}`;
function compile(gl, vs, fs) { // the shape close-view-hero-gl.ts expects: { p, U, A }
  const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error(log || 'shader'); } return sh; };
  const p = gl.createProgram(), a = mk(gl.VERTEX_SHADER, vs), b = mk(gl.FRAGMENT_SHADER, fs); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p); gl.deleteShader(a); gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(p); gl.deleteProgram(p); throw new Error(log || 'link'); }
  const U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); U[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
  const A = {}, m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < m; i++) { const info = gl.getActiveAttrib(p, i); A[info.name] = gl.getAttribLocation(p, info.name); }
  return { p, U, A };
}
// The preview's GL: its own context on its own canvas. Null without WebGL2 or when a program fails.
function createPreviewGL(canvas) {
  if (typeof WebGL2RenderingContext === 'undefined') return null;
  let gl = null;
  try { gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' }); } catch { gl = null; }
  if (!(gl instanceof WebGL2RenderingContext)) return null;
  const R = { gl, hero: null, gear: null, vao: null, vbo: null, asset: null, st: null, cam: {}, bounds: null, boundsKey: null, lost: false };
  try {
    R.hero = createHeroGL(gl, compile, VS_COMMON, FS_COMMON); R.gear = compile(gl, GEAR_VS, GEAR_FS);
    R.vbo = gl.createBuffer(); R.vao = gl.createVertexArray(); gl.bindVertexArray(R.vao); gl.bindBuffer(gl.ARRAY_BUFFER, R.vbo); gl.bufferData(gl.ARRAY_BUFFER, WARDROBE_GEAR_FLOATS * 4, gl.DYNAMIC_DRAW);
    let off = 0; for (const [name, size] of [['a_pos', 3], ['a_nrm', 3], ['a_col', 3], ['a_alpha', 1]]) { const k = R.gear.A[name]; if (k !== undefined && k >= 0) { gl.enableVertexAttribArray(k); gl.vertexAttribPointer(k, size, gl.FLOAT, false, MODEL_FLOATS * 4, off * 4); } off += size; }
    gl.bindVertexArray(null);
  } catch { disposePreviewGL(R); return null; }
  return R;
}
function disposePreviewGL(R) {
  if (!R?.gl) return; const gl = R.gl;
  try { if (!gl.isContextLost()) { disposeHeroGL(gl, R.hero, true); if (R.gear?.p) gl.deleteProgram(R.gear.p); if (R.vbo) gl.deleteBuffer(R.vbo); if (R.vao) gl.deleteVertexArray(R.vao); } } catch { /* the context is going anyway */ }
  try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* not offered */ }
  R.hero = R.gear = R.vbo = R.vao = R.asset = R.st = null; R.gl = null;
}
function drawPreviewGL(R, save, opts, w, h) {
  const gl = R.gl, source = getCloseViewHeroAsset(), asset = source && closeViewHeroBodyAsset(source, wayfarerBody(save));
  if (!asset || !R.hero || !prepareHeroGL(gl, R.hero, asset)) return false;
  if (R.st?.asset !== asset) { R.st = createWardrobePose(asset); R.boundsKey = null; }
  if (!poseWardrobe(R.st, save, opts) || !uploadHeroFrame(gl, R.hero, R.st.frame)) return false;
  const key = R.st.heldKey; // the extent is measured once a body and held gear, so the zoom holds still as it turns and breathes
  if (R.boundsKey !== key) { R.bounds = wardrobeBounds(R.st, R.bounds || {}); R.boundsKey = key; }
  const F = wardrobeCamera(w, h, R.cam, R.bounds), L = WARDROBE;
  const cam = (P) => { const u = P.U; gl.uniform2f(u.u_cam, F.cx, F.cy); gl.uniform2f(u.u_fwd, F.fx, F.fy); gl.uniform2f(u.u_right, F.rx, F.ry); gl.uniform1f(u.u_hc, F.hc); gl.uniform1f(u.u_cosP, F.cosP); gl.uniform1f(u.u_sinP, F.sinP); gl.uniform1f(u.u_F, F.F); gl.uniform2f(u.u_pp, F.ppx, F.ppy); gl.uniform2f(u.u_size, F.w, F.h); };
  const light = (P) => { const u = P.U; gl.uniform3f(u.u_eye, F.cx, F.cy, F.hc); gl.uniform3fv(u.u_key, L.key); gl.uniform3fv(u.u_keyC, L.keyColor); gl.uniform3fv(u.u_fill, L.fill); gl.uniform3fv(u.u_fillC, L.fillColor); gl.uniform3fv(u.u_amb, L.ambient); if (u.u_water) gl.uniform4f(u.u_water, 0, 0, 0, 0); };
  gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawHeroGL(gl, R.hero, R.st.frame, 0, cam, light, L.ambient);
  const n = R.st.gearFloats / MODEL_FLOATS;
  if (n > 0) { gl.useProgram(R.gear.p); cam(R.gear); light(R.gear); gl.bindVertexArray(R.vao); gl.bindBuffer(gl.ARRAY_BUFFER, R.vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, R.st.gearVertices, 0, R.st.gearFloats); gl.drawArrays(gl.TRIANGLES, 0, n); }
  gl.bindVertexArray(null); return true;
}
// The Standard View preview: the sprite, crisp, centred, standing on a soft shadow.
function drawPreviewSprite(ctx, save, w, h, tool) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
  const s = Math.max(8, Math.floor(Math.min(h * WARDROBE.sprite.height, w * WARDROBE.sprite.width))), base = Math.round(h * .5 + s * .36); // the sprite spans .76 s above its base to .04 s below
  ctx.fillStyle = '#05050466'; ctx.beginPath(); ctx.ellipse(w / 2, base + s * .02, s * .3, s * .07, 0, 0, Math.PI * 2); ctx.fill();
  drawWayfarerSprite(ctx, save, s, (w / 2 - s / 2) / s, (base - s * .82) / s, tool);
}

let lastMode = 'close', lastTool = null, lastYaw = 0; // kept while the game runs (not saved): the Wardrobe opens as it was left
// Builds the Wardrobe into `host`. `ctx`: { save, fists(), reduceMotion(), sling(), equip: { carried(i), slung(i) },
// swapPreset(), note(text) }. Returns { dispose() }; the preview also releases itself once its canvas leaves the page.
export function mountWardrobe(host, ctx) {
  const doc = host.ownerDocument, el = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, click) => { const b = el('button', '', label); b.type = 'button'; b.onclick = click; return b; };
  const save = ctx.save, win = doc.defaultView;
  const root = el('section', 'wardrobe'), stage = el('div', 'wardrobe-stage'), status = el('p', 'wardrobe-status'), views = el('div', 'wardrobe-views'), hands = el('div', 'wardrobe-hands');
  const presets = el('div', 'wardrobe-presets'), swap = el('div', 'wardrobe-swap');
  stage.setAttribute('aria-label', 'Wayfarer preview');
  root.append(stage, views, hands, status, presets, swap); host.append(root);
  let mode = WARDROBE.modes.includes(lastMode) ? lastMode : 'close', tool = lastTool ?? save?.activeWeaponSlot === 'secondary', yaw = lastYaw, canvas = null, R = null, c2d = null;
  let raf = 0, dirty = true, lastDraw = -Infinity, alive = true, failed = false, observer = null, devW = 0, devH = 0, drag = null;
  const reduce = () => !!ctx.reduceMotion?.();
  const size = () => { const r = canvas.getBoundingClientRect(), k = Math.min(WARDROBE.maxDpr, win?.devicePixelRatio || 1); devW = Math.max(1, Math.round(r.width * k)); devH = Math.max(1, Math.round(r.height * k)); if (canvas.width !== devW || canvas.height !== devH) { canvas.width = devW; canvas.height = devH; } dirty = true; };
  const releaseGL = () => { if (R) { disposePreviewGL(R); R = null; } };
  const setStatus = (t) => { status.textContent = t; };
  function draw(now) {
    if (!canvas) return;
    if (mode === 'standard') { drawPreviewSprite(c2d, save, devW, devH, tool); return; }
    if (!R || R.lost || !drawPreviewGL(R, save, { yaw: WARDROBE.frontYaw + yaw, nowMs: now, reducedMotion: reduce(), fists: !!ctx.fists?.(), tool }, devW, devH)) {
      if (R?.lost || !getCloseViewHeroAsset() && !loadingHero) fallBack('The Close View preview is not available here; showing the Standard View.');
    }
  }
  function loop(now) {
    raf = 0; if (!alive) return;
    if (!root.isConnected) { dispose(); return; } // the Pack moved on: nothing more is drawn
    if (dirty || mode === 'close' && !reduce() && now - lastDraw >= 1000 / WARDROBE.fps - 2) { dirty = false; lastDraw = now; draw(now); }
    raf = win.requestAnimationFrame(loop);
  }
  let loadingHero = false;
  function fallBack(why) { failed = true; releaseGL(); mode = 'standard'; build(); setStatus(why); }
  function build() { // the stage's canvas for the current mode (a canvas keeps one kind of context, so each mode has its own)
    releaseGL(); observer?.disconnect(); canvas?.remove(); c2d = null;
    canvas = el('canvas', `wardrobe-canvas wardrobe-${mode}`); canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', mode === 'close' ? 'The Wayfarer in Close View. Drag sideways or use the arrow keys to turn.' : 'The Wayfarer in Standard View.');
    stage.replaceChildren(canvas); size();
    if (mode === 'close') {
      R = createPreviewGL(canvas);
      if (!R) { fallBack('WebGL2 is not available here; showing the Standard View.'); return; }
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault?.(); if (R) R.lost = true; dirty = true; });
      setStatus('Drag sideways to turn the Wayfarer.');
      if (!getCloseViewHeroAsset()) { loadingHero = true; setStatus('Loading the Wayfarer…'); loadCloseViewHero().then((a) => { loadingHero = false; if (!alive || mode !== 'close') return; if (!a) fallBack('The Close View model is not available offline yet; showing the Standard View.'); else { setStatus('Drag sideways to turn the Wayfarer.'); dirty = true; } }); }
      canvas.onpointerdown = (e) => { drag = { id: e.pointerId, x: e.clientX }; try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ } };
      canvas.onpointermove = (e) => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x; drag.x = e.clientX; turn(dx * WARDROBE.turnPerPx); };
      canvas.onpointerup = canvas.onpointercancel = (e) => { if (drag?.id === e.pointerId) drag = null; };
      canvas.onkeydown = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); turn((e.key === 'ArrowLeft' ? -1 : 1) * WARDROBE.keyStep); } };
    } else {
      c2d = canvas.getContext('2d'); if (!failed) setStatus('The Wayfarer as Standard View draws them.');
    }
    if (typeof win.ResizeObserver === 'function') { observer = new win.ResizeObserver(() => { if (canvas) size(); }); observer.observe(canvas); }
    renderViews(); dirty = true;
  }
  function turn(d) { const T = Math.PI * 2; yaw = ((yaw + d) % T + T) % T; lastYaw = yaw; dirty = true; }
  function renderViews() {
    views.replaceChildren(...WARDROBE.modes.map((m) => { const b = btn(WARDROBE.labels[m], () => { if (mode === m) return; mode = m; lastMode = m; failed = false; build(); }); b.setAttribute('aria-pressed', String(mode === m)); if (m === 'close' && failed) b.title = 'Not available here'; return b; }));
    hands.hidden = mode !== 'close'; // the sprite holds one pose
    hands.replaceChildren(el('span', 'wardrobe-label', 'In hand'), ...[[false, 'Weapon'], [true, 'Tool']].map(([t, label]) => { const b = btn(label, () => { tool = t; lastTool = t; renderViews(); dirty = true; }); b.setAttribute('aria-pressed', String(tool === t)); return b; }));
  }
  function renderPresets() {
    const lines = wardrobePresetLines(save), active = save?.magicSkills?.preset || 0, row = el('div', 'wardrobe-preset-row');
    row.append(el('span', 'wardrobe-label', 'Preset'), ...[0, 1].map((i) => { const b = btn(`${i + 1}`, () => { if (active !== i) { const r = ctx.swapPreset(); ctx.note?.(r?.message || ''); refresh(); } }); b.setAttribute('aria-pressed', String(active === i)); b.setAttribute('aria-label', `Preset ${i + 1}`); return b; }));
    const list = el('ul', 'wardrobe-preset-lines'); for (const t of lines) list.append(el('li', '', t)); list.append(el('li', 'wardrobe-hint', 'Armour is shared by both presets.'));
    presets.replaceChildren(row, list);
  }
  function renderSwap() {
    const groups = wardrobeOwned(save, ctx.sling?.()); swap.replaceChildren();
    for (const g of groups) {
      const box = el('div', 'wardrobe-group'), h = el('h3', '', g.label), list = el('div', 'wardrobe-items'); box.dataset.slot = g.slot;
      if (!g.items.length) list.append(el('p', 'wardrobe-hint', 'Nothing carried.'));
      for (const entry of g.items) {
        const on = entry.source === 'equipped', b = btn('', () => { if (on) return; const r = wardrobeEquip(entry, ctx.equip); if (r === false || r?.ok === false) { ctx.note?.(r?.message || 'That cannot be equipped now.'); return; } if (r?.message) ctx.note?.(r.message); refresh(); });
        b.className = `wardrobe-item tier-${itemTier(entry.item)}`; b.dataset.source = entry.source; if (on) b.setAttribute('aria-current', 'true');
        b.append(el('strong', '', pieceName(entry.item)), el('small', '', on ? 'Equipped' : entry.source === 'sling' ? `${itemTier(entry.item)} · sling` : itemTier(entry.item)));
        list.append(b);
      }
      box.append(h, list); swap.append(box);
    }
  }
  function refresh() { renderPresets(); renderSwap(); dirty = true; }
  function dispose() { if (!alive) return; alive = false; if (raf) win.cancelAnimationFrame(raf); raf = 0; observer?.disconnect(); observer = null; releaseGL(); canvas = null; c2d = null; }
  build(); refresh();
  raf = win.requestAnimationFrame(loop);
  return { dispose, refresh, get mode() { return mode; }, get yaw() { return yaw; }, turnTo(a) { yaw = 0; turn(a); }, get alive() { return alive; } };
}
