import { dungeonTileVisibility } from "./dungeon-framework.ts";

// Close View (Tim, 2026-11-06: "a more intimate viewpoint for the character... when you get into the Pentagon, we feel like
// you're in Bloodborne... you're close in, walking through, instead of having this super high perspective... the camera's in
// the cavern with you... third person... more like exploring the Chalice Dungeons"). Phase 1, a prototype: a low third-person
// camera behind the Wayfarer, built on the existing 2D canvas renderer, for interiors only (the Pentagon, buildings, keeps),
// off unless chosen (Options → Controls; save.closeView, additive at schema 14). The overworld keeps its view.
//
// How a frame is drawn (renderCloseView):
// 1. The ordinary top-down renderer draws the floor of the area round the Wayfarer, with everything it lays on the ground
//    (tiles, telegraphs, hazards, effects, marks), into an offscreen "ground" canvas centred on the Wayfarer. Its actor list
//    (the sorted `draws` closures: creatures, objects, the Wayfarer) is captured instead of drawn (closeViewTake).
// 2. A torch-light falloff is painted over that ground texture (one cached radial gradient, the Wayfarer always at its centre).
// 3. The floor is laid on screen in perspective, "mode 7" style: horizontal bands, each an affine copy of the ground texture
//    exact at its middle row; bands are spaced in equal depth ratios, so each is equally accurate.
// 4. Walls (blocked tiles) are extruded blocks: one quad per exposed tile edge, cached per floor (wallGeometry), culled to the
//    view radius, the frustum and back faces, coloured from a precomputed fog/torch colour table (no per-frame strings).
// 5. Wall faces and actors are depth sorted together (painter's order). An actor is a billboard: its captured closure draws
//    the existing sprite into a scratch corner of the ground canvas at the billboard's own resolution, which is then copied
//    to its place on screen. Wall faces between the camera and the Wayfarer are cut to a faint ghost so the Wayfarer is never
//    hidden; the camera boom is also pulled in by walls behind the Wayfarer.
// 6. Distance fog (a cached vertical gradient over the floor) and a vignette close the view in.
//
// Higher-fidelity monster art plugs in at drawBillboard: today it replays the top-down sprite closure; a phase-2 creature
// would register a `closeViewArt(ctx, e, view)` drawer (see CLOSE_VIEW_HOOKS.art) that draws itself from the camera's angle.
//
// Every number is in CLOSE_VIEW. Distances are in tiles; angles in degrees.
export const CLOSE_VIEW = Object.freeze({
  version: 1,
  camera: Object.freeze({
    minDistance: 1, // the closest a wall behind can pull it in...
    crane: .75, // ...and for each tile it is pulled in, it rises this much (never above the walls' tops less `craneClear`), so
    craneClear: .25, // the Wayfarer stays a figure in the view, not a wall of cloth
    nearFade: Object.freeze([1.6, .55]), // nearer than this (camera depth), the Wayfarer is drawn this faint, so the way ahead shows
    center: .5, // the aim point's place on screen, as a share of the height from the top
    boomPad: .32, // the camera keeps this far off a wall
    boomStep: .2, // the boom is tested against walls in steps of this length
    pullIn: 30, // how fast the boom shortens (per second, exponential); it lengthens at `letOut`
    letOut: 3,
  }),
  // The camera's framing, by preset (Options → Controls, next to the toggle; save.closeViewPreset). Tim's references (camera and
  // feel only): Bloodborne's tight, low over-the-shoulder view; Remnant: From the Ashes, a little further back and offset to
  // one side so the Wayfarer stays readable and the corridor ahead stays open; Elder Scrolls Online's smooth chase camera,
  // easing round turns with a comfortable field of view (CLOSE_VIEW.turn). `shoulder`: tiles the camera sits to the right of
  // the Wayfarer's line (they stand left of centre, the way ahead to their right). `fov`: horizontal degrees.
  presets: Object.freeze({
    standard: Object.freeze({ label: "Standard", height: 1.35, distance: 2.6, lookAhead: 2.2, lookHeight: .5, shoulder: .42, fov: 72 }), // the blend: Remnant's offset and distance, ESO's field of view, Bloodborne's low height
    close: Object.freeze({ label: "Close (tight, low)", height: 1.15, distance: 1.95, lookAhead: 1.8, lookHeight: .6, shoulder: .32, fov: 66 }), // Bloodborne
    wide: Object.freeze({ label: "Wide (further back)", height: 1.65, distance: 3.4, lookAhead: 2.6, lookHeight: .45, shoulder: .55, fov: 80 }), // Remnant / ESO
  }),
  defaultPreset: "standard",
  fov: Object.freeze({ verticalMax: 100 }), // the horizontal fov (by preset) or this vertical one, whichever is narrower, sets the focal length
  near: .2, // nothing nearer than this (camera depth) is drawn
  turn: Object.freeze({
    speed: 2.6, // the view turns toward the way the Wayfarer walks (per second, exponential)...
    maxRate: 140, // ...but never faster than this (degrees per second)
    cone: 100, // only while the walk is within this many degrees of the view; walking toward the camera does not swing it round
    reducedScale: .45, // with reduced motion the view turns this much slower
    moveEps: .0004, // squared tiles per frame below which the Wayfarer is standing still
  }),
  input: Object.freeze({ idle: .06 }), // stick magnitude below which a new gesture starts (the input basis re-latches to the view)
  walls: Object.freeze({ height: 2.4, rubble: .8, cutAlpha: .2, cutPad: .35 }),
  fog: Object.freeze({ near: 2.4, far: 10.5, color: Object.freeze([7, 7, 9]), levels: 24, gamma: 1.15 }),
  light: Object.freeze({
    radius: 6.2, // the torch's reach
    inner: .28, // full light out to this share of the reach
    ambient: .1, // what the darkness never quite hides
    flicker: .035, flickerMs: 160, // the torch's breathing (off with reduced motion)
    dreadShrink: .45, // a Pentagon floor's dread (0..1) shrinks the reach by up to this share
    warm: "rgba(255,168,92,0.09)", // the torch's warm cast round the Wayfarer
  }),
  actors: Object.freeze({ back: Object.freeze({ hood: "#79877b", seam: "#5d695f", rect: Object.freeze([-.14, -.71, .28, .18]) }), atlas: 900 /* device pixels of atlas height below the ground texture */, cutAlpha: .4, halfWidth: 1.25, height: 2.6, below: .55, fade: .9, sprite: 1, maxSprite: 1.6 }), // sprite box in tiles (times the creature's scale)
  shade: Object.freeze({ x: .74, y: 1 }), // faces across x (east/west) take less of the torch than faces across y
  quality: Object.freeze({
    low: Object.freeze({ sprite: .6, floorBands: 14, texScale: .75, radius: 6.5, fogGradient: false, warm: false, bands: 1, mortar: false, vignette: false }),
    balanced: Object.freeze({ sprite: .85, floorBands: 26, texScale: 1, radius: 8, fogGradient: true, warm: true, bands: 1, mortar: false, vignette: true }),
    full: Object.freeze({ sprite: 1, floorBands: 32, texScale: 1.25, radius: 9.5, fogGradient: true, warm: true, bands: 2, mortar: true, vignette: true }),
  }),
  styles: Object.freeze({ // wall colours by tile kind (a face, and its mortar lines)
    keepWall: ["#6b6255", "#3a342c"], aptWall: ["#74787b", "#4a4e52"], cellarWall: ["#3a352e", "#1e1b17"], hiveWall: ["#5a3f66", "#2f2238"],
    hedgeWall: ["#2f552b", "#1d331b"], rubbleFloor: ["#4e463c", "#2e2922"], default: ["#5a544c", "#2f2b26"],
  }),
  // Between the two cameras (Tim's update, 2026-11-06: the Pentagon's open-air parts keep the top-down view; going back
  // inside, Close View takes over again): a short blend, never a hard cut, and an instant switch with reduced motion. Only one
  // view is ever drawn per frame; the view being left is a snapshot of its last frame (one canvas copy), faded out.
  // Entering: the camera comes down from over the Wayfarer's shoulder (`from`) to its place behind them. Leaving: the top-down
  // view starts zoomed in (`leaveZoom`) and settles. `settle`: on the same floor, a change of tile must hold this long first.
  blend: Object.freeze({ seconds: .42, fade: .65, leaveZoom: 1.7, settle: 120, gap: 500, fogShift: 1.6,
    from: Object.freeze({ height: 2.2, distance: 1.1, lookAhead: .5, lookHeight: 0 }) }),
  groundTilePx: 44, // the renderer's tile size once its canvas is 12 tiles wide or more
  maxItems: 4096,
});

// Hooks the hosts fill in: a canvas factory (tests give a recording one), extra ground layers (main.ts's traps, aperture marks
// and ranged effects; the Proving Ground's ranged effects), drawn onto the ground texture after the renderer, and `art`, a map
// from creature kind to a phase-2 close-view drawer.
export const CLOSE_VIEW_HOOKS = { makeCanvas: null, groundLayers: [], art: Object.create(null) };

// Save (additive, schema 14): save.closeView, true when the player has chosen Close View for interiors. Off by default.
// save.closeViewPreset: one of CLOSE_VIEW.presets' keys (the standard one unless chosen).
export function ensureCloseView(s) { if (s && typeof s === "object") { s.closeView = s.closeView === true; if (!Object.hasOwn(CLOSE_VIEW.presets, s.closeViewPreset)) s.closeViewPreset = CLOSE_VIEW.defaultPreset; } return s; }
export const closeViewPreset = (g) => CLOSE_VIEW.presets[g?.save?.closeViewPreset] || CLOSE_VIEW.presets[CLOSE_VIEW.defaultPreset];

const WALL_EXEMPT = /water|ocean|shallow|lava|river|canyon|abyss|chasm|void|pit|sky|star|cloud/i;
// An interior: a building's, a keep's or a Pentagon's floor. Not the Pentagon's finale (the walk among the stars) nor its
// arena: those are open to the sky. The Pentagon's courts, roof and balconies are tiles of its overworld section, so they keep
// the ordinary view without asking.
export function interiorMap(map) { return !!map?.building && !map.building.finale && !map.landscape && !map.stillworks && !map.skyCloud && !map.movers?.length && !map.canopy; }
// An open-air tile inside an interior's map (a keep's yard, a labyrinth court): the ordinary view there.
const OPEN_AIR_KINDS = new Set(["yardGrass"]);
export function openAirAt(map, x, y) { const w = Math.max(1, Number(map?.width) || 32), t = map?.tiles?.[Math.floor(y + .75) * w + Math.floor(x + .5)]; return !!t && (t.courtyard === true || t.openAir === true || t.pentRoof === true || t.pentBalcony === true || OPEN_AIR_KINDS.has(t.kind)); }
// Close View is chosen and this is an interior (the area as a whole).
export function closeViewWanted(g) { return g?.save?.closeView === true && g.area === "dungeon" && interiorMap(g.map) && !!g.player; }
// ...and the Wayfarer stands indoors in it: Close View's camera applies.
export function closeViewApplies(g) { return closeViewWanted(g) && !openAirAt(g.map, g.player.x, g.player.y); }

// ------------------------------------------------------------------------------------------------ state, all preallocated
const CAM = { map: null, yaw: 0, inputYaw: 0, dist: 2.6, shoulder: 0, lastX: 0, lastY: 0, lastNow: 0, dt: 0, drawn: false, steered: false, sx: 0, sy: 0,
  // the last frame's projection (for taps): camera, basis, focal length, principal point, pitch
  cx: 0, cy: 0, fx: 0, fy: -1, rx: 1, ry: 0, F: 1, ppx: 0, ppy: 0, cosP: 1, sinP: 0, hc: 1, w: 0, h: 0, valid: false };
const GROUND = { atlasY: 0, canvas: null, ctx: null, W: 0, H: 0, ts: 1, torch: null, torchX: NaN, torchY: NaN, torchR: NaN, failed: false };
// cached screen gradients, each rebuilt only when the canvas or its size changes (keys are numbers: nothing is built per frame)
const SCREEN = { ctx: null, fog: null, fogEnd: 0, fogW: 0, fogH: 0, fogY: NaN, vignette: null, vigW: 0, vigH: 0, warm: null, warmW: 0, warmH: 0 };
let capturing = false, captured = null, capturedPlayer = null;
let N = CLOSE_VIEW.maxItems;
let itemKind = new Int8Array(N), itemRef = new Int32Array(N), itemDepth = new Float32Array(N), order = new Int32Array(N);
let faceXY = new Float32Array(N * 8), faceLevel = new Int16Array(N), faceAlpha = new Float32Array(N), faceStyle = new Int16Array(N), faceOrient = new Int8Array(N), faceLow = new Int8Array(N);
const boardFoe = []; // the creature each billboard is (or null), by item: what the art hook draws
let boardSX = new Int32Array(N), boardSY = new Int32Array(N), boardPW = new Int32Array(N), boardPH = new Int32Array(N), boardX = new Float32Array(N), boardY = new Float32Array(N), boardK = new Float32Array(N), boardB = new Float32Array(N), boardScale = new Float32Array(N);
function grow() { N *= 2; const re = (A, n) => { const b = new A.constructor(n); b.set(A); return b; };
  itemKind = re(itemKind, N); itemRef = re(itemRef, N); itemDepth = re(itemDepth, N); order = re(order, N); faceXY = re(faceXY, N * 8); faceLevel = re(faceLevel, N); faceAlpha = re(faceAlpha, N); faceStyle = re(faceStyle, N); faceOrient = re(faceOrient, N); faceLow = re(faceLow, N);
  boardSX = re(boardSX, N); boardSY = re(boardSY, N); boardPW = re(boardPW, N); boardPH = re(boardPH, N); boardX = re(boardX, N); boardY = re(boardY, N); boardK = re(boardK, N); boardB = re(boardB, N); boardScale = re(boardScale, N); }

// What the last frame cost (tests and the Proving Ground read it).
// Per-stage milliseconds of the last frame, while `on` (the diagnostic probe's switch, as renderer.ts's renderTimings).
export const closeViewTimings = { on: false, ground: 0, torch: 0, floor: 0, scene: 0, overlay: 0 };
export const closeViewStats = { snapshots: 0, frames: 0, faces: 0, facesCut: 0, boards: 0, bands: 0, wallBuilds: 0, culled: 0 };

// ------------------------------------------------------------------------------------------------ colours, built once
const STYLE_NAMES = Object.keys(CLOSE_VIEW.styles), STYLE_INDEX = Object.fromEntries(STYLE_NAMES.map((k, i) => [k, i]));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// FACE_LUT[style][orient][band][level] / MORTAR_LUT[style][level]: rgb() strings, mixed toward the fog colour.
const L = CLOSE_VIEW.fog.levels, FOG = CLOSE_VIEW.fog.color;
const mix = (c, b) => `rgb(${Math.round(FOG[0] + (c[0] - FOG[0]) * b)},${Math.round(FOG[1] + (c[1] - FOG[1]) * b)},${Math.round(FOG[2] + (c[2] - FOG[2]) * b)})`;
const FACE_LUT = STYLE_NAMES.map((k) => { const c = rgb(CLOSE_VIEW.styles[k][0]); return [CLOSE_VIEW.shade.x, CLOSE_VIEW.shade.y].map((sh) => [1, .72].map((band) => Array.from({ length: L }, (_, i) => mix(c, sh * band * i / (L - 1))))); });
const MORTAR_LUT = STYLE_NAMES.map((k) => { const c = rgb(CLOSE_VIEW.styles[k][1]); return Array.from({ length: L }, (_, i) => mix(c, i / (L - 1))); });
const FOG_CSS = `rgb(${FOG[0]},${FOG[1]},${FOG[2]})`, fogA = (a) => `rgba(${FOG[0]},${FOG[1]},${FOG[2]},${a})`;

// ------------------------------------------------------------------------------------------------ wall geometry, per floor
// faces: [x0, y0, x1, y1, nx, ny, tileX, tileY, style, low] per exposed edge of a wall tile, bucketed in 8x8 chunks.
const wallCache = new WeakMap();
const isWall = (t) => !!t && t.blocked === true && !t.chasm && !t.doorway && !WALL_EXEMPT.test(String(t.kind || ""));
function blockedSignature(tiles) { let n = 0; for (let i = 0; i < tiles.length; i++) if (tiles[i]?.blocked) n += i + 1; return n; }
export function wallGeometry(map) {
  const tiles = map.tiles, w = Math.max(1, Number(map.width) || 32), h = Math.max(1, Number(map.height) || Math.floor(tiles.length / w)), now = Date.now();
  let geo = wallCache.get(map);
  if (geo && geo.tiles === tiles && (now - geo.checked < 500 || (geo.checked = now, blockedSignature(tiles) === geo.sig))) return geo;
  closeViewStats.wallBuilds++;
  const list = [], at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : tiles[y * w + x]), solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || isWall(at(x, y));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = at(x, y); if (!isWall(t)) continue; const st = STYLE_INDEX[t.kind] ?? STYLE_INDEX.default, low = t.kind === "rubbleFloor" ? 1 : 0;
    if (!solid(x, y - 1)) list.push(x + 1, y, x, y, 0, -1, x, y, st, low); // north face, wound so its outward normal is on the left of (x0,y0)->(x1,y1)
    if (!solid(x, y + 1)) list.push(x, y + 1, x + 1, y + 1, 0, 1, x, y, st, low);
    if (!solid(x - 1, y)) list.push(x, y, x, y + 1, -1, 0, x, y, st, low);
    if (!solid(x + 1, y)) list.push(x + 1, y + 1, x + 1, y, 1, 0, x, y, st, low); }
  const faces = Float32Array.from(list), n = faces.length / 10, C = 8, cw = Math.ceil(w / C), ch = Math.ceil(h / C), counts = new Int32Array(cw * ch + 1);
  const chunkOf = (i) => Math.min(ch - 1, Math.floor((faces[i * 10 + 1] + faces[i * 10 + 3]) / 2 / C)) * cw + Math.min(cw - 1, Math.floor((faces[i * 10] + faces[i * 10 + 2]) / 2 / C));
  for (let i = 0; i < n; i++) counts[chunkOf(i) + 1]++;
  for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
  const start = counts.slice(0, -1), fill = start.slice(), index = new Int32Array(n);
  for (let i = 0; i < n; i++) index[fill[chunkOf(i)]++] = i;
  geo = { tiles, w, h, faces, count: n, C, cw, ch, start, end: fill, index, sig: blockedSignature(tiles), checked: now };
  wallCache.set(map, geo); return geo;
}

// ------------------------------------------------------------------------------------------------ the camera
const lerp = (a, b, t) => a + (b - a) * t, DEG = Math.PI / 180, wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const FACING_YAW = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
const footX = (p) => p.x + .5, footY = (p) => p.y + .75;
// On a new floor the view starts looking the way the Wayfarer faces, unless a wall is right there: then down the longest
// open line of the eight headings (so stepping through a door you look into the room, not at the door's frame).
function ensureCam(g) {
  if (CAM.map === g.map) return;
  CAM.map = g.map; CAM.drawn = false; CAM.dist = closeViewPreset(g).distance; CAM.shoulder = 0; CAM.lastX = g.player.x; CAM.lastY = g.player.y; CAM.lastNow = 0;
  const facing = FACING_YAW[g.player.facing] ?? -Math.PI / 2, open = (a) => { let t = 0; while (t < 12 && !wallAt(g.map, footX(g.player) + Math.cos(a) * (t + .5), footY(g.player) + Math.sin(a) * (t + .5))) t += .5; return t; };
  let yaw = facing, best = open(facing);
  if (best < closeViewPreset(g).distance + 1) for (let i = 0; i < 8; i++) { const a = wrap(i * Math.PI / 4), t = open(a); if (t > best + .01) { best = t; yaw = a; } }
  CAM.yaw = CAM.inputYaw = yaw;
}
function wallAt(map, x, y) { const w = Math.max(1, Number(map.width) || 32), h = Math.max(1, Math.floor(map.tiles.length / w)), tx = Math.floor(x), ty = Math.floor(y); return tx < 0 || ty < 0 || tx >= w || ty >= h || isWall(map.tiles[ty * w + tx]); }
function turnCamera(g, now) {
  const T = CLOSE_VIEW.turn, p = g.player, dt = CAM.lastNow ? Math.max(0, Math.min(.1, (now - CAM.lastNow) / 1000)) : 0, dx = p.x - CAM.lastX, dy = p.y - CAM.lastY;
  CAM.lastNow = now; CAM.lastX = p.x; CAM.lastY = p.y; CAM.dt = dt;
  if (dt <= 0 || dx * dx + dy * dy < T.moveEps) return;
  const diff = wrap(Math.atan2(dy, dx) - CAM.yaw); if (Math.abs(diff) > T.cone * DEG) return; // walking toward the camera: hold the view
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), k = (1 - Math.exp(-T.speed * dt)) * (reduce ? T.reducedScale : 1), cap = T.maxRate * DEG * dt * (reduce ? T.reducedScale : 1);
  CAM.yaw = wrap(CAM.yaw + Math.max(-cap, Math.min(cap, diff * k)));
}
// The boom: from the Wayfarer's feet back along the view, stopped short of a wall.
function boomLength(g, fx, fy) {
  const C = CLOSE_VIEW.camera, map = g.map, ox = footX(g.player), oy = footY(g.player), rx = -fy, ry = fx, hit = (x, y) => wallAt(map, x, y);
  const D = closeViewPreset(g).distance; let reach = D;
  for (let t = C.boomStep; t <= D + C.boomPad; t += C.boomStep) { const x = ox - fx * t, y = oy - fy * t;
    if (hit(x, y) || hit(x + rx * C.boomPad, y + ry * C.boomPad) || hit(x - rx * C.boomPad, y - ry * C.boomPad)) { reach = Math.max(C.minDistance, t - C.boomPad); break; } }
  return reach;
}

// Turn a stick (or keys) into world movement: camera-relative, with the basis latched for the whole gesture. Pushing up walks
// the way the view looks; while the finger stays down the basis holds, so a turn of the view under a held stick never bends
// the walk; when the stick is let go the basis re-latches to the view. Returns true when it changed the state (restore it with
// closeViewUnsteer after Game.update, so the input's own smoothing never sees the turned vector).
export function closeViewSteer(g, state) {
  CAM.steered = false; if (!state || !closeViewApplies(g) || MODE.cur !== 1) return false;
  ensureCam(g);
  const sx = Number(state.x) || 0, sy = Number(state.y) || 0;
  if (Math.hypot(sx, sy) < CLOSE_VIEW.input.idle) CAM.inputYaw = CAM.yaw;
  const fx = Math.cos(CAM.inputYaw), fy = Math.sin(CAM.inputYaw), rx = -fy, ry = fx;
  CAM.sx = sx; CAM.sy = sy; state.x = rx * sx - fx * sy; state.y = ry * sx - fy * sy; CAM.steered = true; return true;
}
export function closeViewUnsteer(state) { if (CAM.steered && state) { state.x = CAM.sx; state.y = CAM.sy; } CAM.steered = false; }
export function closeViewCamera() { return { yaw: CAM.yaw, inputYaw: CAM.inputYaw, distance: CAM.dist, valid: CAM.valid, drawn: CAM.drawn }; }
export function resetCloseViewCamera() { CAM.map = null; CAM.valid = false; CAM.drawn = false; }
// Close View drew the last frame of this area: the host then leaves out its own top-down overlays (they were drawn onto the
// ground texture through CLOSE_VIEW_HOOKS.groundLayers).
export function closeViewShowing(g) { return CAM.drawn && CAM.map === g?.map && closeViewWanted(g); }

// ------------------------------------------------------------------------------------------------ choosing the camera, and the blend
// renderer.ts calls this first thing every frame. It decides which camera applies, eases between them, and returns true when
// it has drawn the frame (Close View, or a blend); false lets the ordinary view draw as it always has, at no extra cost.
const MODE = { cur: 0, wanted: false, g: null, map: null, lastNow: -1e9, pend: 0, pendAt: 0, t0: 0, to: -1, snap: null, snapCtx: null, snapW: 0, snapH: 0, mix: 1 };
let bypass = false;
export const closeViewBlend = () => ({ mode: MODE.cur ? "close" : "ordinary", blending: MODE.to >= 0, mix: MODE.mix });
export function closeViewFrame(ctx, g, w, h, now, baseRender) {
  if (bypass || !g?.player) return false;
  const B = CLOSE_VIEW.blend, reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), same = MODE.g === g && now - MODE.lastNow < B.gap;
  const wanted = closeViewWanted(g); let want = wanted && !openAirAt(g.map, g.player.x, g.player.y) ? 1 : 0;
  if (want !== MODE.cur && same && MODE.map === g.map && wanted && MODE.wanted) { // a threshold within one floor: it must hold a moment
    if (MODE.pend !== want || MODE.pendAt > now) { MODE.pend = want; MODE.pendAt = now; }
    if (now - MODE.pendAt < B.settle) want = MODE.cur; }
  if (want !== MODE.cur) { MODE.cur = want; MODE.to = -1;
    if (same && !reduce && snapshot(ctx)) { MODE.to = want; MODE.t0 = now; } }
  MODE.g = g; MODE.map = g.map; MODE.lastNow = now; MODE.pend = MODE.cur; MODE.wanted = wanted;
  let k = 1; if (MODE.to >= 0) { k = Math.max(0, Math.min(1, (now - MODE.t0) / (B.seconds * 1000))); if (k >= 1) MODE.to = -1; }
  const e = k * k * (3 - 2 * k), blending = k < 1; MODE.mix = e;
  if (MODE.cur === 1) { const ok = renderCloseView(ctx, g, w, h, now, baseRender, e); if (!ok) { MODE.cur = 0; return false; } if (blending) overlaySnapshot(ctx, w, h, k); return true; }
  CAM.drawn = false;
  if (!blending) return false;
  const z = 1 + (B.leaveZoom - 1) * (1 - e); ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.translate(-w / 2, -h / 2); bypass = true;
  try { baseRender(ctx, g, w, h, now); } finally { bypass = false; ctx.restore(); }
  overlaySnapshot(ctx, w, h, k); return true;
}
// The last frame drawn, which is still on the canvas as a new frame begins: one copy, only when a blend starts.
function snapshot(ctx) {
  const src = ctx?.canvas; if (!src || !(src.width > 0) || !(src.height > 0)) return false;
  if (!MODE.snap) { MODE.snap = makeCanvas(); MODE.snapCtx = MODE.snap?.getContext?.("2d") || null; }
  if (!MODE.snapCtx) return false;
  if (MODE.snap.width !== src.width || MODE.snap.height !== src.height) { MODE.snap.width = src.width; MODE.snap.height = src.height; }
  MODE.snapCtx.setTransform(1, 0, 0, 1, 0, 0); MODE.snapCtx.drawImage(src, 0, 0); MODE.snapW = src.width; MODE.snapH = src.height; closeViewStats.snapshots++; return true;
}
function overlaySnapshot(ctx, w, h, k) { const a = 1 - k / CLOSE_VIEW.blend.fade; if (a <= 0 || !MODE.snap) return; ctx.save(); ctx.globalAlpha = a; ctx.drawImage(MODE.snap, 0, 0, MODE.snapW, MODE.snapH, 0, 0, w, h); ctx.restore(); }

// The tap under a screen point, while Close View drew the last frame: a creature whose billboard is under the finger, else the
// floor point under it. null when Close View is not showing (the caller uses the top-down screenToWorld).
export function closeViewScreenToWorld(g, w, h, x, y) {
  if (!closeViewShowing(g) || !CAM.valid || Math.abs(CAM.w - w) > 1 || Math.abs(CAM.h - h) > 1) return null;
  const A = CLOSE_VIEW.actors; let best = null, bestD = Infinity;
  for (const e of g.enemies || []) { if (e.dead || e.hidden || e.ambient) continue; const q = project(e.x + .5, e.y + .82, 0); if (!q) continue; const sc = actorScale(e), k = CAM.F / q.depth;
    if (x >= q.sx - A.halfWidth * .55 * sc * k && x <= q.sx + A.halfWidth * .55 * sc * k && y >= q.sy - 1.15 * sc * k && y <= q.sy + .2 * k && q.depth < bestD) { best = e; bestD = q.depth; } }
  if (best) return { x: best.x + .5, y: best.y + .4 };
  let a = (CAM.ppy - y) / CAM.F; const horizon = CAM.sinP / CAM.cosP; if (a > horizon - .02) a = horizon - .02;
  const v = Math.min(CLOSE_VIEW.fog.far, CAM.hc * (CAM.cosP + a * CAM.sinP) / (CAM.sinP - a * CAM.cosP)), depth = v * CAM.cosP + CAM.hc * CAM.sinP, u = (x - CAM.ppx) * depth / CAM.F;
  return { x: CAM.cx + CAM.rx * u + CAM.fx * v, y: CAM.cy + CAM.ry * u + CAM.fy * v };
}
const PROJ = { sx: 0, sy: 0, depth: 0 };
function project(X, Y, Z) { const dx = X - CAM.cx, dy = Y - CAM.cy, u = dx * CAM.rx + dy * CAM.ry, v = dx * CAM.fx + dy * CAM.fy, dz = Z - CAM.hc, depth = v * CAM.cosP - dz * CAM.sinP; if (depth < CLOSE_VIEW.near) return null; const up = v * CAM.sinP + dz * CAM.cosP; PROJ.sx = CAM.ppx + CAM.F * u / depth; PROJ.sy = CAM.ppy - CAM.F * up / depth; PROJ.depth = depth; return PROJ; }
const actorScale = (e) => Math.max(1, Math.min(4, Number(e?.scale) || (e?.boss ? 1.45 : 1), (Number(e?.bodyRadius) || .4) * 2.2));

// ------------------------------------------------------------------------------------------------ the renderer's side
// renderer.ts calls closeViewCapturing() and closeViewTake() at two marked points; nothing else in it knows about Close View.
export const closeViewCapturing = () => capturing;
export function closeViewTake(draws, playerDraw) { captured = draws; capturedPlayer = playerDraw; }

function makeCanvas() {
  if (CLOSE_VIEW_HOOKS.makeCanvas) return CLOSE_VIEW_HOOKS.makeCanvas();
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
  if (typeof document !== "undefined" && document.createElement) return document.createElement("canvas");
  return null;
}
function groundCanvas(W, H, ts) {
  if (!GROUND.canvas && !GROUND.failed) { GROUND.canvas = makeCanvas(); GROUND.ctx = GROUND.canvas?.getContext?.("2d") || null; if (!GROUND.ctx) { GROUND.canvas = null; GROUND.failed = true; } }
  if (!GROUND.ctx) return null;
  const cw = Math.ceil(W * ts), chh = Math.ceil(H * ts) + CLOSE_VIEW.actors.atlas; // the texture, and below it the billboards' atlas
  if (GROUND.canvas.width !== cw || GROUND.canvas.height !== chh) { GROUND.canvas.width = cw; GROUND.canvas.height = chh; GROUND.torch = null; }
  GROUND.atlasY = Math.ceil(H * ts);
  GROUND.W = W; GROUND.H = H; GROUND.ts = ts; return GROUND.ctx;
}
export function setCloseViewCanvasFactory(factory) { CLOSE_VIEW_HOOKS.makeCanvas = factory || null; GROUND.canvas = null; GROUND.ctx = null; GROUND.failed = false; GROUND.torch = null; SCREEN.ctx = null; }

function qualityOf(g) { const q = g.presentation?.effectiveQuality; return CLOSE_VIEW.quality[q] || CLOSE_VIEW.quality.balanced; }
function insertionSortByDepth(n) { for (let i = 1; i < n; i++) { const o = order[i], d = itemDepth[o]; let j = i - 1; while (j >= 0 && itemDepth[order[j]] < d) { order[j + 1] = order[j]; j--; } order[j + 1] = o; } }

// Draw the frame in Close View. Returns false (nothing drawn) when there is no ground canvas to draw with; the renderer then
// draws its ordinary view.
export function renderCloseView(ctx, g, w, h, now, baseRender, mix = 1) {
  const Q = qualityOf(g), C = CLOSE_VIEW.camera, A = CLOSE_VIEW.actors, Wl = CLOSE_VIEW.walls, Fg = CLOSE_VIEW.fog, Lt = CLOSE_VIEW.light, p = g.player, E = CLOSE_VIEW.blend.from;
  const Cp = closeViewPreset(g), camH = lerp(E.height, Cp.height, mix), camD = lerp(E.distance, Cp.distance, mix), fogShift = (1 - mix) * CLOSE_VIEW.blend.fogShift, fogNear = Fg.near + fogShift, fogFar = Fg.far + fogShift;
  const s = CLOSE_VIEW.groundTilePx, R = Q.radius, W = Math.max(12 * s, Math.ceil(2 * (R + 1) * s)), H = W, ts = Q.texScale;
  CAM.drawn = false; const gc = groundCanvas(W, H, ts); if (!gc) return false; const T = closeViewTimings, tm = T.on, t0 = tm ? performance.now() : 0;
  ensureCam(g); turnCamera(g, now);
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode);
  // 1. the ground, drawn by the ordinary renderer into the texture, its actors captured
  gc.setTransform(ts, 0, 0, ts, 0, 0); gc.imageSmoothingEnabled = false; captured = null; capturedPlayer = null; capturing = true;
  try { baseRender(gc, g, W, H, now); for (const layer of CLOSE_VIEW_HOOKS.groundLayers) { gc.setTransform(ts, 0, 0, ts, 0, 0); layer(gc, W, H); } } finally { capturing = false; }
  const Tx = Math.round(W / 2 - p.x * s), Ty = Math.round(H / 2 - p.y * s), dread = Math.max(0, Math.min(1, Number(g.map?.building?.dread) || 0));
  const flick = reduce ? 1 : 1 + Lt.flicker * Math.sin(now / Lt.flickerMs) * Math.sin(now / (Lt.flickerMs * 2.7) + 1.3), lightR = Lt.radius * (1 - dread * Lt.dreadShrink) * flick;
  const t1 = tm ? performance.now() : 0;
  // 2. torch falloff over the ground (the Wayfarer is always at the same texture point, so the gradient is built once)
  gc.setTransform(ts, 0, 0, ts, 0, 0);
  const fxp = Tx + footX(p) * s, fyp = Ty + footY(p) * s, base = Lt.radius * s;
  if (!GROUND.torch || GROUND.torchX !== fxp || GROUND.torchY !== fyp || GROUND.torchR !== base) { const gr = gc.createRadialGradient(fxp, fyp, 0, fxp, fyp, base); gr.addColorStop(0, fogA(0)); gr.addColorStop(Lt.inner, fogA(0)); gr.addColorStop(.75, fogA((1 - Lt.ambient) * .7)); gr.addColorStop(1, fogA(1 - Lt.ambient)); GROUND.torch = gr; GROUND.torchX = fxp; GROUND.torchY = fyp; GROUND.torchR = base; }
  const lk = lightR / Lt.radius; gc.translate(fxp, fyp); gc.scale(lk, lk); gc.translate(-fxp, -fyp); gc.fillStyle = GROUND.torch; gc.fillRect(fxp - W / lk, fyp - H / lk, 2 * W / lk, 2 * H / lk); gc.setTransform(ts, 0, 0, ts, 0, 0);
  // the camera for this frame
  const fx = Math.cos(CAM.yaw), fy = Math.sin(CAM.yaw), rx = -fy, ry = fx, want = Math.min(camD, boomLength(g, fx, fy)), dt = CAM.valid ? CAM.dt : 1;
  CAM.dist = want < CAM.dist ? CAM.dist + (want - CAM.dist) * Math.min(1, 1 - Math.exp(-C.pullIn * dt)) : CAM.dist + (want - CAM.dist) * Math.min(1, 1 - Math.exp(-C.letOut * dt));
  const craneUp = Math.min(Math.max(camH, Wl.height - C.craneClear), camH + Math.max(0, camD - CAM.dist) * C.crane), pitch = Math.atan2(craneUp - lerp(E.lookHeight, Cp.lookHeight, mix), CAM.dist + lerp(E.lookAhead, Cp.lookAhead, mix)), F = Math.max((w / 2) / Math.tan(Cp.fov * DEG / 2), (h / 2) / Math.tan(CLOSE_VIEW.fov.verticalMax * DEG / 2));
  // the shoulder: the camera steps right of the boom's end, as far as the walls let it (eased like the boom)
  const bx = footX(p) - fx * CAM.dist, by = footY(p) - fy * CAM.dist, sh = Cp.shoulder * mix; let room = sh;
  for (let t = C.boomStep / 2; t <= sh + C.boomPad; t += C.boomStep / 2) if (wallAt(g.map, bx + rx * t, by + ry * t)) { room = Math.max(0, t - C.boomPad); break; }
  CAM.shoulder += (room - CAM.shoulder) * Math.min(1, 1 - Math.exp(-(room < CAM.shoulder ? C.pullIn : C.letOut) * dt));
  CAM.cx = bx + rx * CAM.shoulder; CAM.cy = by + ry * CAM.shoulder; CAM.fx = fx; CAM.fy = fy; CAM.rx = rx; CAM.ry = ry; CAM.F = F; CAM.ppx = w / 2; CAM.ppy = h * C.center;
  CAM.cosP = Math.cos(pitch); CAM.sinP = Math.sin(pitch); CAM.hc = craneUp; CAM.w = w; CAM.h = h; CAM.valid = true;
  const cosP = CAM.cosP, sinP = CAM.sinP, hc = CAM.hc, ppx = CAM.ppx, ppy = CAM.ppy;
  // the background: the dark beyond the light, and the vault above
  ctx.fillStyle = FOG_CSS; ctx.fillRect(0, 0, w, h);
  const t2 = tm ? performance.now() : 0;
  // 3. the floor, in bands of equal depth ratio from the screen's foot to the fog's far edge
  const floorRow = (v) => ppy - F * (v * sinP - hc * cosP) / (v * cosP + hc * sinP), vOfRow = (y) => { const a = (ppy - y) / F; return hc * (cosP + a * sinP) / (sinP - a * cosP); };
  const vNear = vOfRow(h), vFar = fogFar, dNear = Math.max(CLOSE_VIEW.near, vNear * cosP + hc * sinP), dFar = vFar * cosP + hc * sinP, nb = Q.floorBands, img = GROUND.canvas, sts = s * ts;
  let yPrev = h; closeViewStats.bands = 0;
  for (let i = 1; i <= nb; i++) {
    const d1 = dNear * Math.pow(dFar / dNear, i / nb), v1 = (d1 - hc * sinP) / cosP, y1 = Math.max(0, floorRow(v1)); if (y1 >= yPrev - .25) continue;
    const ym = (y1 + yPrev) / 2, vm = vOfRow(ym), dm = vm * cosP + hc * sinP, kx = F / dm, m = -F * hc / (dm * dm);
    // world -> screen for this band: sx = kx*(r.(P-C)) + ppx, sy = m*(f.(P-C) - vm) + ym; texture -> world: X = (tx/ts - Tx)/s
    const A1 = kx * rx, B1 = kx * ry, C1 = ppx - kx * (CAM.cx * rx + CAM.cy * ry), A2 = m * fx, B2 = m * fy, C2 = ym - m * vm - m * (CAM.cx * fx + CAM.cy * fy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, y1, w, yPrev - y1 + .75); ctx.clip();
    ctx.transform(A1 / sts, A2 / sts, B1 / sts, B2 / sts, C1 - (A1 * Tx + B1 * Ty) / s, C2 - (A2 * Tx + B2 * Ty) / s);
    // only the part of the texture this band shows: the bounding box of its four corners (screen x 0 and w, rows y1 and yPrev)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1t = -Infinity;
    for (let c = 0; c < 4; c++) { const rowY = c < 2 ? y1 : yPrev, sx = c & 1 ? w : 0, vv = vOfRow(rowY), dd = vv * cosP + hc * sinP, uu = (sx - ppx) * dd / F, X = CAM.cx + rx * uu + fx * vv, Y = CAM.cy + ry * uu + fy * vv, tx = (X * s + Tx) * ts, ty = (Y * s + Ty) * ts;
      if (tx < x0) x0 = tx; if (tx > x1) x1 = tx; if (ty < y0) y0 = ty; if (ty > y1t) y1t = ty; }
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(img.width, Math.ceil(x1) + 2); y1t = Math.min(GROUND.atlasY, Math.ceil(y1t) + 2); // never into the atlas below the texture
    if (x1 > x0 && y1t > y0) ctx.drawImage(img, x0, y0, x1 - x0, y1t - y0, x0, y0, x1 - x0, y1t - y0);
    ctx.restore(); closeViewStats.bands++;
    yPrev = y1;
  }
  const yFar = floorRow(vFar);
  if (SCREEN.ctx !== ctx) { SCREEN.ctx = ctx; SCREEN.fog = SCREEN.vignette = SCREEN.warm = null; }
  if (Q.fogGradient) { const yk = Math.round(yFar); if (!SCREEN.fog || SCREEN.fogW !== w || SCREEN.fogH !== h || SCREEN.fogY !== yk) { const vFogNear = fogNear, yN = floorRow(vFogNear), gr = ctx.createLinearGradient(0, yFar, 0, Math.max(yFar + 1, yN)); gr.addColorStop(0, fogA(1)); gr.addColorStop(1, fogA(0)); SCREEN.fog = gr; SCREEN.fogEnd = Math.max(yFar + 1, yN); SCREEN.fogW = w; SCREEN.fogH = h; SCREEN.fogY = yk; }
    ctx.fillStyle = SCREEN.fog; ctx.fillRect(0, yFar - 1, w, Math.min(h, SCREEN.fogEnd) - yFar + 1); } // below the fog's near row it is clear: not filled
  const t3 = tm ? performance.now() : 0;
  // 4 and 5. walls and actors, depth sorted together
  const geo = wallGeometry(g.map), faces = geo.faces, H0 = Wl.height, ox = footX(p), oy = footY(p), reach = Math.min(R, fogFar + 1);
  let n = 0; closeViewStats.faces = 0; closeViewStats.facesCut = 0; closeViewStats.boards = 0; closeViewStats.culled = 0;
  const disc = !!g.map?.dungeonContract?.discoveryEnabled, minCx = Math.max(0, Math.floor((Math.min(ox, CAM.cx) - reach) / geo.C)), maxCx = Math.min(geo.cw - 1, Math.floor((Math.max(ox, CAM.cx) + reach) / geo.C)), minCy = Math.max(0, Math.floor((Math.min(oy, CAM.cy) - reach) / geo.C)), maxCy = Math.min(geo.ch - 1, Math.floor((Math.max(oy, CAM.cy) + reach) / geo.C));
  // the Wayfarer's place on screen, for the cut-away
  const pq = project(ox, oy, 0), pDepth = pq ? pq.depth : CAM.dist, pSx = pq ? pq.sx : ppx, pSy = pq ? pq.sy : ppy, pk = F / Math.max(.2, pDepth), pHalf = (Wl.cutPad + .4) * pk, pTop = pSy - 1.25 * pk;
  for (let cy = minCy; cy <= maxCy; cy++) for (let cx = minCx; cx <= maxCx; cx++) { const ci = cy * geo.cw + cx;
    for (let j = geo.start[ci]; j < geo.end[ci]; j++) { const fi = geo.index[j], o = fi * 10, x0 = faces[o], y0 = faces[o + 1], x1 = faces[o + 2], y1 = faces[o + 3], nx = faces[o + 4], ny = faces[o + 5];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; if ((mx - ox) * (mx - ox) + (my - oy) * (my - oy) > reach * reach) { closeViewStats.culled++; continue; }
      if ((mx - CAM.cx) * nx + (my - CAM.cy) * ny >= 0) { closeViewStats.culled++; continue; } // its back is to the camera
      if (disc && dungeonTileVisibility(g.map, faces[o + 6], faces[o + 7]) === "unseen") continue;
      // clip the edge to the near plane (on its top line, the nearer to the camera with a downward pitch)
      const top = faces[o + 9] ? Wl.rubble : H0, dz = top - hc;
      let ax = x0, ay = y0, bx = x1, by = y1; const da = ((ax - CAM.cx) * fx + (ay - CAM.cy) * fy) * cosP - dz * sinP, db = ((bx - CAM.cx) * fx + (by - CAM.cy) * fy) * cosP - dz * sinP, nr = CLOSE_VIEW.near;
      if (da < nr && db < nr) { closeViewStats.culled++; continue; }
      if (da < nr) { const t = (nr - da) / (db - da); ax += (bx - ax) * t; ay += (by - ay) * t; } else if (db < nr) { const t = (nr - db) / (da - db); bx += (ax - bx) * t; by += (ay - by) * t; }
      const q0 = project(ax, ay, 0); if (!q0) continue; const s0x = q0.sx, s0y = q0.sy, d0 = q0.depth; const q1 = project(bx, by, 0); if (!q1) continue; const s1x = q1.sx, s1y = q1.sy, d1 = q1.depth;
      const q2 = project(bx, by, top); if (!q2) continue; const s2x = q2.sx, s2y = q2.sy; const q3 = project(ax, ay, top); if (!q3) continue; const s3x = q3.sx, s3y = q3.sy;
      if (Math.max(s0x, s1x, s2x, s3x) < 0 || Math.min(s0x, s1x, s2x, s3x) > w || Math.max(s0y, s1y) < 0 || Math.min(s2y, s3y) > h) { closeViewStats.culled++; continue; }
      if (n >= N) grow();
      const fo = n * 8; faceXY[fo] = s0x; faceXY[fo + 1] = s0y; faceXY[fo + 2] = s1x; faceXY[fo + 3] = s1y; faceXY[fo + 4] = s2x; faceXY[fo + 5] = s2y; faceXY[fo + 6] = s3x; faceXY[fo + 7] = s3y;
      const dl = Math.hypot(mx - ox, my - oy) / lightR, depthMid = (d0 + d1) / 2, lit = (1 - Math.min(1, Math.max(0, (dl - Lt.inner) / (1 - Lt.inner)))) * (1 - Lt.ambient) + Lt.ambient, fog = Math.min(1, Math.max(0, (depthMid - fogNear) / (fogFar - fogNear)));
      faceLevel[n] = Math.round(Math.pow(Math.max(0, lit * (1 - fog)), Fg.gamma) * (L - 1)); faceStyle[n] = faces[o + 8]; faceOrient[n] = nx !== 0 ? 0 : 1; faceLow[n] = faces[o + 9];
      // the cut-away: nearer than the Wayfarer and over them on screen
      const cut = depthMid < pDepth - .05 && Math.max(s0x, s1x, s2x, s3x) > pSx - pHalf && Math.min(s0x, s1x, s2x, s3x) < pSx + pHalf && Math.max(s0y, s1y) > pTop;
      faceAlpha[n] = cut ? Wl.cutAlpha : 1; if (cut) closeViewStats.facesCut++;
      itemKind[n] = 0; itemRef[n] = n; itemDepth[n] = depthMid; order[n] = n; n++; closeViewStats.faces++;
    } }
  const draws = captured || [];
  for (let i = 0; i < draws.length; i++) { const d = draws[i]; if (!Number.isFinite(d?.x) || typeof d.fn !== "function") continue;
    const bxw = d.x + .5, byw = d.y + .82; if ((bxw - ox) * (bxw - ox) + (byw - oy) * (byw - oy) > reach * reach && d !== capturedPlayer) continue;
    const q = project(bxw, byw, 0); if (!q) continue; matched = null; const k = F / q.depth, sc = d === capturedPlayer ? 1 : scaleFor(g, d);
    if (q.sx + A.halfWidth * sc * k < 0 || q.sx - A.halfWidth * sc * k > w || q.sy - A.height * sc * k > h || q.sy + A.below * k < 0) continue;
    if (n >= N) grow();
    const dl = Math.hypot(bxw - ox, byw - oy) / lightR, lit = (1 - Math.min(1, Math.max(0, (dl - Lt.inner) / (1 - Lt.inner)))) * (1 - Lt.ambient) + Lt.ambient, fog = Math.min(1, Math.max(0, (q.depth - fogNear) / (fogFar - fogNear)));
    boardX[n] = q.sx; boardY[n] = q.sy; boardK[n] = k; boardB[n] = d === capturedPlayer ? (q.depth < C.nearFade[0] ? C.nearFade[1] + (1 - C.nearFade[1]) * Math.max(0, (q.depth - .6) / (C.nearFade[0] - .6)) : 1) : Math.max(0, 1 - A.fade * (1 - lit * (1 - fog))); boardScale[n] = sc;
    if (d !== capturedPlayer && q.depth < pDepth - .05 && q.sx + A.halfWidth * .6 * sc * k > pSx - pHalf && q.sx - A.halfWidth * .6 * sc * k < pSx + pHalf) boardB[n] = Math.min(boardB[n], A.cutAlpha); // between the camera and the Wayfarer: a ghost
    boardFoe[n] = matched; itemKind[n] = 1; itemRef[n] = i; itemDepth[n] = q.depth - .01; order[n] = n; n++; closeViewStats.boards++; }
  insertionSortByDepth(n);
  const turnFacing = relativeFacing(p), mortar = Q.mortar, bands = Q.bands; spriteDpr = Math.max(.75, Math.min(2, Number(globalThis.devicePixelRatio) || 1) * Q.sprite);
  const packed = packBillboards(g, draws, n, s, turnFacing);
  for (let oi = 0; oi < n; oi++) { const it = order[oi];
    if (itemKind[it] === 0) { const fo = it * 8, st = faceStyle[it], lv = faceLevel[it], al = faceAlpha[it]; if (al < 1) ctx.globalAlpha = al;
      const x0 = faceXY[fo], y0 = faceXY[fo + 1], x1 = faceXY[fo + 2], y1 = faceXY[fo + 3], x2 = faceXY[fo + 4], y2 = faceXY[fo + 5], x3 = faceXY[fo + 6], y3 = faceXY[fo + 7], LUT = FACE_LUT[st][faceOrient[it]];
      if (bands > 1) { // the lower half holds the torchlight; the upper half falls into the dark
        const hx0 = (x0 + x3) / 2, hy0 = (y0 + y3) / 2, hx1 = (x1 + x2) / 2, hy1 = (y1 + y2) / 2;
        ctx.fillStyle = LUT[0][lv]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(hx1, hy1); ctx.lineTo(hx0, hy0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = LUT[1][lv]; ctx.beginPath(); ctx.moveTo(hx0, hy0); ctx.lineTo(hx1, hy1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = LUT[0][lv]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
      if (mortar && lv > 3 && !faceLow[it]) { ctx.strokeStyle = MORTAR_LUT[st][lv]; ctx.lineWidth = 1; ctx.beginPath(); for (let mi = 0; mi < MORTAR_ROWS.length; mi++) { const q = MORTAR_ROWS[mi]; ctx.moveTo(x0 + (x3 - x0) * q, y0 + (y3 - y0) * q); ctx.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q); } ctx.stroke(); }
      if (al < 1) ctx.globalAlpha = 1; }
    else if (packed) drawBillboard(ctx, it); }
  const t4 = tm ? performance.now() : 0;
  // 6. the torch's warm cast and the vignette, both cached
  if (Q.warm && pq) { if (!SCREEN.warm || SCREEN.warmW !== w || SCREEN.warmH !== h) { const r0 = Math.min(w, h) * .55, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r0); gr.addColorStop(0, Lt.warm); gr.addColorStop(1, "rgba(255,168,92,0)"); SCREEN.warm = gr; SCREEN.warmW = w; SCREEN.warmH = h; }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(pSx, pSy - .6 * pk); ctx.fillStyle = SCREEN.warm; const r0 = Math.min(w, h) * .55; ctx.fillRect(-r0, -r0, 2 * r0, 2 * r0); ctx.restore(); } // only the glow's own square
  if (Q.vignette) { if (!SCREEN.vignette || SCREEN.vigW !== w || SCREEN.vigH !== h) { const gr = ctx.createRadialGradient(w / 2, h * .55, Math.min(w, h) * .3, w / 2, h * .55, Math.max(w, h) * .75); gr.addColorStop(0, fogA(0)); gr.addColorStop(1, fogA(.85)); SCREEN.vignette = gr; SCREEN.vigW = w; SCREEN.vigH = h; }
    ctx.fillStyle = SCREEN.vignette; ctx.fillRect(0, 0, w, h); }
  drawPlaceLabel(ctx, g, w, h);
  if (tm) { const t5 = performance.now(); T.ground = t1 - t0; T.torch = t2 - t1; T.floor = t3 - t2; T.scene = t4 - t3; T.overlay = t5 - t4; }
  captured = null; capturedPlayer = null; closeViewStats.frames++; CAM.drawn = true;
  return true;
}
const MORTAR_ROWS = Object.freeze([.33, .66]);
let spriteDpr = 1;

let matched = null; // the creature scaleFor last matched (or null): boardFoe keeps it for the art hook
function scaleFor(g, d) { // the creature a captured draw is for (matched on its place), for its sprite box
  matched = null; for (const e of g.enemies || []) if (e.x === d.x && Math.abs(e.y - d.y) < .01) { matched = e; return Math.min(CLOSE_VIEW.actors.maxSprite * 2.5, actorScale(e)); }
  return CLOSE_VIEW.actors.sprite;
}
// The Wayfarer's facing as the camera sees it: walking away from the camera shows their back ("up").
const FACING_VEC = Object.freeze({ up: Object.freeze([0, -1]), down: Object.freeze([0, 1]), left: Object.freeze([-1, 0]), right: Object.freeze([1, 0]) });
function relativeFacing(p) {
  const v = FACING_VEC[p.facing]; if (!v) return p.facing;
  const fwd = v[0] * CAM.fx + v[1] * CAM.fy, side = v[0] * CAM.rx + v[1] * CAM.ry;
  return Math.abs(fwd) >= Math.abs(side) ? (fwd >= 0 ? "up" : "down") : side >= 0 ? "right" : "left";
}
// One billboard: the captured closure draws the existing sprite into the ground canvas's corner at the billboard's own scale
// (crisp, not a stretched copy), and that corner is copied to the screen. Phase 2's art (CLOSE_VIEW_HOOKS.art) would go here.
// Billboards: every actor in view is first drawn into its own place in a sprite atlas (shelf packed), each by its captured
// closure at the billboard's own resolution (crisp, not a stretched copy); then, in depth order among the walls, each place is
// copied to the screen. Drawing them all before copying any keeps the atlas from being flushed once per actor. Phase 2's
// higher-fidelity creature art (CLOSE_VIEW_HOOKS.art) would draw into the same place.
// The atlas is a band of the ground canvas below its texture (the captured closures can only draw into the canvas they were
// captured with), so the texture is copied once a frame when the atlas is first written, not once per actor.
const SPRITES = { used: 0 };
function packBillboards(g, draws, n, s, facing) {
  const A = CLOSE_VIEW.actors, ac = GROUND.ctx; if (!ac) return false;
  const Y0 = GROUND.atlasY, AW = GROUND.canvas.width, AH = GROUND.canvas.height - Y0; let x = 0, y = 0, rowH = 0;
  ac.setTransform(1, 0, 0, 1, 0, 0); ac.clearRect(0, Y0, AW, AH);
  for (let oi = n - 1; oi >= 0; oi--) { const it = order[oi]; if (itemKind[it] !== 1) continue; // nearest first: they get the room
    const d = draws[itemRef[it]], sc = boardScale[it], k = boardK[it], hw = A.halfWidth * sc, top = A.height * sc, bw = 2 * hw, bh = top + A.below;
    let q = k * spriteDpr / s; q = Math.min(q, (AW - 2) / (bw * s), (AH * .5) / (bh * s));
    let pw = Math.ceil(bw * s * q), ph = Math.ceil(bh * s * q);
    if (x + pw > AW) { x = 0; y += rowH; rowH = 0; }
    if (y + ph > AH) { boardPW[it] = 0; continue; } // no room left this frame: the farthest go undrawn (never more than the atlas)
    boardSX[it] = x; boardSY[it] = Y0 + y; boardPW[it] = pw; boardPH[it] = ph;
    ac.save(); ac.beginPath(); ac.rect(x, Y0 + y, pw, ph); ac.clip();
    const sx0 = (d.x + .5 - hw) * s, sy0 = (d.y + .82 - top) * s; ac.setTransform(q, 0, 0, q, x - sx0 * q, Y0 + y - sy0 * q); // the closures draw in raw world pixels
    const p = g.player, wasFacing = p.facing, player = d === capturedPlayer; if (player) p.facing = facing;
    if (d.lift) ac.translate(0, -d.lift * s); if ((d.alpha ?? 1) < 1) ac.globalAlpha = d.alpha;
    const foe = boardFoe[it], art = foe && CLOSE_VIEW_HOOKS.art[foe.kind]; boardFoe[it] = null;
    // phase 2: a creature with close-view art draws itself, from the camera's side (view: where it stands relative to the camera)
    try { if (art) { ac.setTransform(1, 0, 0, 1, x, Y0 + y); art(ac, foe, { width: pw, height: ph, scale: q * s, footX: hw * s * q, footY: top * s * q, yawToCamera: Math.atan2(CAM.cy - foe.y - .82, CAM.cx - foe.x - .5) }); } else d.fn(); if (player && facing === "up") backOfHood(ac, p, s); } finally { ac.restore(); if (player) p.facing = wasFacing; }
    x += pw + 2; rowH = Math.max(rowH, ph + 2); }
  SPRITES.used = y + rowH; return true;
}
function drawBillboard(ctx, it) {
  const pw = boardPW[it]; if (!pw) return; const A = CLOSE_VIEW.actors, sc = boardScale[it], k = boardK[it], hw = A.halfWidth * sc, top = A.height * sc, b = boardB[it];
  if (b < 1) ctx.globalAlpha = Math.max(0, b);
  ctx.drawImage(GROUND.canvas, boardSX[it], boardSY[it], pw, boardPH[it], boardX[it] - hw * k, boardY[it] - top * k, 2 * hw * k, (top + A.below) * k);
  if (b < 1) ctx.globalAlpha = 1;
}
// The Wayfarer's sprite has no back: seen from behind (walking away from the camera) its visor is hooded over. Phase 2's
// back-view art replaces this.
function backOfHood(c, p, s) { const B = CLOSE_VIEW.actors.back, k = (p.x + .5) * s, base = (p.y + .82) * s - (Math.floor(p.walkPhase || 0) % 2);
  c.fillStyle = B.hood; c.fillRect(Math.round(k + B.rect[0] * s), Math.round(base + B.rect[1] * s), Math.round(B.rect[2] * s), Math.round(B.rect[3] * s));
  c.fillStyle = B.seam; c.fillRect(Math.round(k - .015 * s), Math.round(base + B.rect[1] * s), Math.max(1, Math.round(.03 * s)), Math.round(.5 * s)); }
function drawPlaceLabel(ctx, g, w, h) { // as the ordinary view writes it: just beneath Map and Pack
  const label = String(g.map?.name || "").toUpperCase(); if (!label) return;
  ctx.font = "12px monospace"; const y = h - (g.labelInset ?? 122), x = g.labelX ?? 8, bw = Math.min(Math.max(150, ctx.measureText(label).width + 20), g.labelMaxWidth ?? Infinity);
  ctx.fillStyle = "#151411ee"; ctx.fillRect(x, y, bw, 24); ctx.fillStyle = "#cec7b6"; ctx.fillText(label, x + 8, y + 16, bw - 16);
}
