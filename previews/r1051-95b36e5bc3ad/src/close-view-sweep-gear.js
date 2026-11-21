// Close View gear for the Great Sweep, the Aether Orrery and the Mirage of Blades (Tim, 2026-11-14). Presentation only:
// meshes baked once, and one bounded writer for the tool the Wayfarer holds in his right hand while his primary stays in his
// left (close-view.ts; close-view-hero.ts poses the arm).
//
// - The Great Sweep: "a long handle with a large broken greatsword blade. Most of the blade is broken off, leaving only a stub
//   just above the hilt, but it's big, like a giant's weapon." Held in the right hand whenever it is equipped.
// - The Aether Orrery: "His right hand is held out, palm up, and the Orrery floats just above it: a central orange ball; 2-3
//   small spheres suspended beside it: one light blue, one pale green, and optionally a third in white." The small spheres
//   turn slowly about the ball (a rotation of their few vertices as they are written; reduced motion holds them still).
// - Mirage of Blades: the three thrown blades as Standard View draws them (tool-forms.ts sweepBlade: a greatsword, a great
//   axe and a shuriken), the same outline, size (× MIRAGE.size) and colours, laid flat and spun about the vertical.
// No allocation per frame; every mesh is inside the triangle budgets the tests check.
import { MESH_FLOATS, prism, ellipsoid, part, block } from './close-view-mesh.js?v=r1051-95b36e5bc3ad';
import { rangedWeapon } from './items.js?v=r1051-95b36e5bc3ad';
import { MIRAGE, MIRAGE_BLADE_VIEW } from './tool-forms.js?v=r1051-95b36e5bc3ad';

const FLOATS = 10; // close-view-models.ts MODEL_FLOATS (position, normal, RGB, alpha); a test pins the two together
// ---------------------------------------------------------------- the Great Sweep (held gear recipe space)
// The hero gear recipe: the grip at (.17, -.25, .79), the weapon along +Z, its width along Y and its thickness along X;
// writeCloseViewHeroGear's .82 brings it to the rig (so 1 recipe unit is .82 tiles). `handle` [z0, z1] runs from the
// pommel below the hand to the guard; `blade` is the broken stub: `width` (half), `base` (its foot, just over the guard),
// `top` the jagged broken edge as heights above the base at evenly spaced columns across the width, `thick` (half).
export const GREAT_SWEEP_FORM = Object.freeze({
  handle: Object.freeze([.42, 1.52]), handleRadius: .03, pommel: .055,
  guard: Object.freeze({ z: 1.55, half: .27, depth: .035, thick: .05 }),
  blade: Object.freeze({ base: 1.585, width: .29, thick: .045, top: Object.freeze([.24, .38, .22, .44, .30, .36]) }),
  colors: Object.freeze({ blade: 0x6b6d72, broken: 0xb9b5a6, guard: 0x8a6a3a, handle: 0x4a3626, pommel: 0x3a4246 }),
});
const X = .17, Y = -.25;
function sweepBlade() {
  const F = GREAT_SWEEP_FORM.blade, n = F.top.length, face = [], edge = [];
  const col = (i) => -F.width + 2 * F.width * i / (n - 1);
  const P = (i, top, side) => [X + side * F.thick, Y + col(i), F.base + (top ? F.top[i] : 0)];
  for (let i = 0; i + 1 < n; i++) for (const s of [1, -1]) {
    const a = P(i, false, s), b = P(i + 1, false, s), c = P(i + 1, true, s), d = P(i, true, s);
    face.push(s > 0 ? [a, b, c] : [a, c, b], s > 0 ? [a, c, d] : [a, d, c]);
  }
  for (let i = 0; i + 1 < n; i++) { const a = P(i, true, 1), b = P(i + 1, true, 1), c = P(i + 1, true, -1), d = P(i, true, -1); edge.push([a, d, c], [a, c, b]); } // the broken edge
  for (const [i, s] of [[0, -1], [n - 1, 1]]) { const a = P(i, false, 1), b = P(i, true, 1), c = P(i, true, -1), d = P(i, false, -1); edge.push(s < 0 ? [a, d, c] : [a, c, d], s < 0 ? [a, c, b] : [a, b, c]); } // the two outer edges
  return { face, edge };
}
const SB = sweepBlade();
// heldPart-like: part() keeps (x - px) in the mesh with px = x; the writer adds px back. 60 triangles.
export const HERO_GREAT_SWEEP = Object.freeze((() => {
  const F = GREAT_SWEEP_FORM, C = F.colors, h = F.handle, mid = (h[0] + h[1]) / 2;
  return [
    part(prism(4), X, Y, mid, F.handleRadius, F.handleRadius, (h[1] - h[0]) / 2, C.handle), // the long handle (12)
    part(prism(3, .4), X, Y, h[0] - F.pommel * .6, F.pommel, F.pommel, F.pommel * .7, C.pommel), // the pommel (8)
    block(X, Y, F.guard.z, F.guard.thick, F.guard.half, F.guard.depth, C.guard), // the guard (12)
    part(SB.face, 0, 0, 0, 1, 1, 1, C.blade), // the broken stub's flats (20)
    part(SB.edge, 0, 0, 0, 1, 1, 1, C.broken), // its broken edge and sides (14)
  ].map(Object.freeze);
})());
// ---------------------------------------------------------------- the Aether Orrery, floating over the open palm
// Tiles (world units). `lift` above the palm socket, `forward` out along the forearm's level heading; the small spheres sit
// `orbit` from the ball at `heights`, at angles `phases`, and turn `spin` rad/s (0 with reduced motion). Colours in `colors`.
export const ORRERY_HELD = Object.freeze({
  lift: .12, forward: .02, core: .06, moon: .03, orbit: .11, spin: .7,
  phases: Object.freeze([0, 2.2, 4.2]), heights: Object.freeze([.018, -.012, .03]),
  colors: Object.freeze({ core: 0xff8a2a, moons: Object.freeze([0x9fd4ff, 0xbdf0b4, 0xf4f3ee]) }),
});
const coreMesh = part(ellipsoid(6, 2), 0, 0, 0, ORRERY_HELD.core, ORRERY_HELD.core, ORRERY_HELD.core, ORRERY_HELD.colors.core).mesh, // 24
  moonMeshes = ORRERY_HELD.colors.moons.map((c) => part(ellipsoid(4, 1), 0, 0, 0, ORRERY_HELD.moon, ORRERY_HELD.moon, ORRERY_HELD.moon, c).mesh); // 8 each
export const ORRERY_HELD_TRIANGLES = (coreMesh.length + moonMeshes.reduce((a, m) => a + m.length, 0)) / MESH_FLOATS / 3;
export const GREAT_SWEEP_HELD_TRIANGLES = HERO_GREAT_SWEEP.reduce((a, p) => a + p.mesh.length, 0) / MESH_FLOATS / 3;
// ---------------------------------------------------------------- Mirage of Blades: Standard View's three blades in 3D
// The outlines are tool-forms.ts sweepBlade's, in its units (× MIRAGE.size tiles): x along the blade, y across. `thick` is the
// half-thickness of each piece. Colours are the Standard View fills.
export const MIRAGE_BLADE_SHAPES = Object.freeze({
  greatsword: Object.freeze({ blade: Object.freeze([[.42, 0], [.06, -.06], [-.12, -.05], [-.12, .05], [.06, .06]]), guard: Object.freeze([-.16, -.12, .12]), grip: Object.freeze([-.28, -.16, .025]), pommel: Object.freeze([-.30, .03]), thick: .018,
    colors: Object.freeze({ blade: 0xe3e8ec, edge: 0x4d555e, hilt: 0x8a6a3a, gold: 0xffd23f }) }),
  greataxe: Object.freeze({ haft: Object.freeze([-.30, .22, .025]), head: Object.freeze([[.14, -.03], [.20, -.24], [.27, -.17], [.29, 0], [.27, .17], [.22, .24], [.14, .03]]), collar: Object.freeze([.10, .14, .03]), thick: .018,
    colors: Object.freeze({ head: 0xd9e0e6, edge: 0x4d555e, haft: 0x5a3d22, gold: 0xffd23f }) }),
  shuriken: Object.freeze({ outer: .26, inner: .07, hub: .045, thick: .014, colors: Object.freeze({ blade: 0xc9d1d8, edge: 0x4d555e, gold: 0xffd23f }) }),
});
export const MIRAGE_BLADE_KINDS = Object.freeze(['mirageSword', 'mirageAxe', 'mirageShuriken']); // SWEEP_BLADES order
// A flat polygon (x, y) extruded ±t about z = 0: the two flats (fans from the first point; the outlines are convex or star-
// shaped about it) and the rim. Model space: +X along the blade, +Y across, +Z up. Scaled by k.
function slab(poly, t, k, fanFrom = null) {
  let area = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area < 0) poly = [...poly].reverse(); // counter-clockwise, so the top flat faces up and the rim faces out
  const flats = [], rim = [], n = poly.length, c = fanFrom || poly[0], top = (p) => [p[0] * k, p[1] * k, t * k], bot = (p) => [p[0] * k, p[1] * k, -t * k];
  for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if (fanFrom || (i > 0 && i + 1 < n)) { flats.push([top(c), top(a), top(b)], [bot(c), bot(b), bot(a)]); } rim.push([top(a), bot(a), bot(b)], [top(a), bot(b), top(b)]); }
  return { flats, rim };
}
const rect = (x0, x1, half) => [[x0, -half], [x1, -half], [x1, half], [x0, half]];
function mirageModel(kind) {
  const S = MIRAGE_BLADE_SHAPES[kind], k = MIRAGE.size, C = S.colors, out = [];
  const add = (tris, color) => out.push(Object.freeze(part(tris, 0, 0, 0, 1, 1, 1, color)));
  if (kind === 'greatsword') {
    const b = slab(S.blade, S.thick, k); add(b.flats, C.blade); add(b.rim, C.edge);
    const g = slab(rect(S.guard[0], S.guard[1], S.guard[2]), S.thick * 1.6, k); add([...g.flats, ...g.rim], C.hilt);
    const h = slab(rect(S.grip[0], S.grip[1], S.grip[2]), S.grip[2], k); add([...h.flats, ...h.rim], C.hilt);
    out.push(Object.freeze(part(ellipsoid(4, 1), S.pommel[0] * k, 0, 0, S.pommel[1] * k, S.pommel[1] * k, S.pommel[1] * k, C.gold)));
  } else if (kind === 'greataxe') {
    const h = slab(rect(S.haft[0], S.haft[1], S.haft[2]), S.haft[2], k); add([...h.flats, ...h.rim], C.haft);
    const a = slab(S.head, S.thick, k, [.15, 0]); add(a.flats, C.head); add(a.rim, C.edge);
    const c = slab(rect(S.collar[0], S.collar[1], S.collar[2]), S.collar[2], k); add([...c.flats, ...c.rim], C.gold);
  } else {
    const star = []; for (let i = 0; i < 4; i++) { const r = i * Math.PI / 2; star.push([Math.cos(r) * S.outer, Math.sin(r) * S.outer], [Math.cos(r + Math.PI / 4) * S.inner, Math.sin(r + Math.PI / 4) * S.inner]); }
    const s = slab(star, S.thick, k, [0, 0]); add(s.flats, C.blade); add(s.rim, C.edge);
    out.push(Object.freeze(part(prism(6), 0, 0, 0, S.hub * k, S.hub * k, S.thick * 1.8 * k, C.gold)));
  }
  return Object.freeze(out);
}
export const MIRAGE_BLADE_MODELS = Object.freeze({ mirageSword: mirageModel('greatsword'), mirageAxe: mirageModel('greataxe'), mirageShuriken: mirageModel('shuriken') });
// ---------------------------------------------------------------- which tool the right hand holds
// 'great-sweep' or 'orrery' when that tool is equipped, else ''.
export function closeViewHeldToolKind(save) {
  const w = rangedWeapon(save?.equipment?.secondary);
  return w?.brawlerTool === 'great-sweep' ? 'great-sweep' : w?.orrery ? 'orrery' : '';
}
export const HELD_TOOL_TRIANGLES = Object.freeze({ 'great-sweep': GREAT_SWEEP_HELD_TRIANGLES, orrery: ORRERY_HELD_TRIANGLES });
// ---------------------------------------------------------------- the writer
// Writes the held tool after the hero's other equipment. `gear.offhand` names it; `gear.offhandSocket` is the hand's socket
// matrix (16 numbers); alpha, tint and hit flash as the other gear; `gear.clock` (ms) and `gear.still` (reduced motion) turn
// the Orrery's spheres. Writes nothing (returns `offset`) when it would pass `limit` (the end of the hero's reservation).
const finiteSocket = (m) => { if (!m || m.length !== 16) return false; for (let i = 0; i < 16; i++) if (!Number.isFinite(m[i])) return false; return true; };
function shade(out, o, r, g, b, gear) {
  const hit = Math.max(0, Math.min(1, Number(gear.hitFlash) || 0)), t = gear.tint, tr = Number.isFinite(t?.[0]) ? t[0] : 1, tg = Number.isFinite(t?.[1]) ? t[1] : 1, tb = Number.isFinite(t?.[2]) ? t[2] : 1;
  out[o] = r * tr * (1 - hit * .6) + .96 * hit * .6; out[o + 1] = g * tg * (1 - hit * .6) + .34 * hit * .6; out[o + 2] = b * tb * (1 - hit * .6) + .23 * hit * .6;
  out[o + 3] = Number.isFinite(gear.alpha) ? Math.max(0, Math.min(1, gear.alpha)) : 1;
}
export function writeCloseViewHeldTool(out, offset, gear, limit = out?.length ?? 0) {
  const kind = gear?.offhand, m = gear?.offhandSocket;
  if (!Object.hasOwn(HELD_TOOL_TRIANGLES, kind) || !finiteSocket(m) || !Number.isSafeInteger(offset) || offset < 0) return offset;
  const need = HELD_TOOL_TRIANGLES[kind] * 3 * FLOATS; if (offset + need > Math.min(out.length, limit)) return offset;
  const ax = Math.hypot(m[0], m[1], m[2]), ay = Math.hypot(m[4], m[5], m[6]), az = Math.hypot(m[8], m[9], m[10]); if (Math.min(ax, ay, az) < 1e-6) return offset;
  if (kind === 'great-sweep') { // the hero gear transform (close-view-models.ts writeCloseViewHeroGear), scale .82
    const k = .82;
    for (const p of HERO_GREAT_SWEEP) for (let i = 0; i < p.mesh.length; i += MESH_FLOATS) { const a = p.mesh;
      const x = (a[i + 2] + p.pz - .79) * k, y = -(a[i] + p.px - .17) * k, z = -(a[i + 1] + .25) * k;
      out[offset++] = m[12] + m[0] / ax * x + m[4] / ay * y + m[8] / az * z; out[offset++] = m[13] + m[1] / ax * x + m[5] / ay * y + m[9] / az * z; out[offset++] = m[14] + m[2] / ax * x + m[6] / ay * y + m[10] / az * z;
      const nx = a[i + 5], ny = -a[i + 3], nz = -a[i + 4]; let qx = m[0] / ax * nx + m[4] / ay * ny + m[8] / az * nz, qy = m[1] / ax * nx + m[5] / ay * ny + m[9] / az * nz, qz = m[2] / ax * nx + m[6] / ay * ny + m[10] / az * nz; const l = Math.hypot(qx, qy, qz) || 1;
      out[offset++] = qx / l; out[offset++] = qy / l; out[offset++] = qz / l; shade(out, offset, a[i + 6], a[i + 7], a[i + 8], gear); offset += 4; }
    return offset;
  }
  // The Orrery: world-up above the palm (world +z), a touch out along the hand's level heading; the ball and the spheres.
  const O = ORRERY_HELD, fx = m[0] / ax, fy = m[1] / ax, fl = Math.hypot(fx, fy) || 1, cx = m[12] + fx / fl * O.forward, cy = m[13] + fy / fl * O.forward, cz = m[14] + O.lift;
  const turn = gear.still ? 0 : (Number(gear.clock) || 0) / 1000 * O.spin;
  offset = putMesh(out, offset, coreMesh, cx, cy, cz, gear);
  for (let j = 0; j < moonMeshes.length; j++) { const a = O.phases[j] + turn; offset = putMesh(out, offset, moonMeshes[j], cx + Math.cos(a) * O.orbit, cy + Math.sin(a) * O.orbit, cz + O.heights[j], gear); }
  return offset;
}
function putMesh(out, offset, mesh, x, y, z, gear) {
  for (let i = 0; i < mesh.length; i += MESH_FLOATS) { out[offset++] = x + mesh[i]; out[offset++] = y + mesh[i + 1]; out[offset++] = z + mesh[i + 2]; out[offset++] = mesh[i + 3]; out[offset++] = mesh[i + 4]; out[offset++] = mesh[i + 5]; shade(out, offset, mesh[i + 6], mesh[i + 7], mesh[i + 8], gear); offset += 4; }
  return offset;
}

// A Mirage blade in Close View (close-view-models.ts writeCloseViewModel hands these kinds here): the blade spins in its own
// plane (`actor.yaw`, the gameplay spin) and that plane is tipped MIRAGE_BLADE_VIEW.tilt degrees up toward the camera
// (`actor.camYaw`, the camera's heading; flat when unknown), so its face reads from the low camera. A few multiplies per vertex.
export function writeMirageBladeModel(out, offset, actor) {
  const parts = MIRAGE_BLADE_MODELS[actor?.kind]; if (!parts || !Number.isSafeInteger(offset) || offset < 0) return offset;
  let n = 0; for (const p of parts) n += p.mesh.length / MESH_FLOATS; if (offset + n * FLOATS > out.length) return offset;
  const a = Number(actor.yaw) || 0, ca = Math.cos(a), sa = Math.sin(a), cam = Number(actor.camYaw), tilt = Number.isFinite(cam) ? MIRAGE_BLADE_VIEW.tilt * Math.PI / 180 : 0;
  const fx = Number.isFinite(cam) ? Math.cos(cam) : 1, fy = Number.isFinite(cam) ? Math.sin(cam) : 0, ct = Math.cos(tilt), st = Math.sin(tilt);
  const k = Number.isFinite(actor.scale) ? Math.max(.25, Math.min(4, actor.scale)) : 1, X = Number(actor.x) || 0, Y = Number(actor.y) || 0, Z = Number(actor.z) || 0;
  const alpha = Number.isFinite(actor.alpha) ? Math.max(0, Math.min(1, actor.alpha)) : 1;
  for (const p of parts) for (let i = 0; i < p.mesh.length; i += MESH_FLOATS) { const m = p.mesh;
    for (let pass = 0; pass < 2; pass++) { const o = pass ? 3 : 0, lx = m[i + o] + (pass ? 0 : p.px), ly = m[i + o + 1], lz = m[i + o + 2] + (pass ? 0 : p.pz);
      const x1 = lx * ca - ly * sa, y1 = lx * sa + ly * ca, pf = x1 * fx + y1 * fy, ps = -x1 * fy + y1 * fx, pf2 = pf * ct - lz * st, pz2 = pf * st + lz * ct;
      const wx = pf2 * fx - ps * fy, wy = pf2 * fy + ps * fx;
      if (pass) { out[offset++] = wx; out[offset++] = wy; out[offset++] = pz2; } else { out[offset++] = X + wx * k; out[offset++] = Y + wy * k; out[offset++] = Z + pz2 * k; } }
    out[offset++] = m[i + 6]; out[offset++] = m[i + 7]; out[offset++] = m[i + 8]; out[offset++] = alpha; }
  return offset;
}
