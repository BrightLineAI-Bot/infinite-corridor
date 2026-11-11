// Close View beast rig (release 887; Tim, 2026-11-11: a Close View rework of every world beast "to the same standard we are
// giving the Wayfarer ... he should feel alive, like a real creature"). The ordinary native creature format is 256 triangles a
// body, re-written on the CPU every frame. A world beast needs more than that to read as a solid, convincing machine or
// animal at Close View's range, so beasts get their own slot:
//
// - A beast is a skinned mesh: built once (per beast kind and quality tier) from solid parts, each part bound to one bone
//   (or blended between two), uploaded once to static GPU buffers (close-view-beast-gl.ts). A frame uploads only the bones:
//   at most BEAST_SLOT.maxBones 3x4 matrices. Nothing is allocated per frame.
// - A pose is a pure function of the beast's actual game state (its pack attack, phase and clocks, movement, hits) and a
//   small render-only track (gait phase, planted feet, eased blends). The beast's own module (close-view-beast-giant.ts for
//   the Lightning Giant) authors the anatomy and the motion; this module holds what every beast shares: the mesh builder,
//   the bone hierarchy and its maths, two-bone IK, planted-foot gait and the phase curves that turn an attack clock into
//   anticipation, strike, follow-through and recovery.
// - Local axes (as every Close View model): +f forward, +r the creature's right, +u up; the world is (x, y, z) with the
//   ground at z = 0 and f = (cos yaw, sin yaw), r = (-sin yaw, cos yaw). Bone rotations are 3x3 matrices whose columns are
//   the bone's f, r, u axes in its parent's frame.
// Damage, reach, timing and targeting stay in monster-pack.ts: nothing here feeds back into the game.

export const BEAST_SLOT = Object.freeze({
  maxBeasts: 2, // Briar Stag and the Stalker may share a section; a third beast keeps its billboard
  maxBones: 40, // 120 vec4 vertex uniforms, well inside WebGL2's guaranteed 256
  triangles: Object.freeze({ full: 2400, balanced: 1500, low: 700 }),
  emitChannels: 4,
});

// ------------------------------------------------------------------------------------------------ the skeleton
// bones: [{ name, parent (name or null), at: [f, r, u] bind offset from the parent's origin }], parents first.
export function defineSkeleton(bones) {
  if (!Array.isArray(bones) || !bones.length || bones.length > BEAST_SLOT.maxBones) throw new Error('beast skeleton size');
  const index = Object.create(null), parent = new Int16Array(bones.length), bind = new Float32Array(bones.length * 3), bindWorld = new Float32Array(bones.length * 3);
  bones.forEach((b, i) => {
    if (index[b.name] !== undefined) throw new Error(`duplicate bone ${b.name}`);
    const p = b.parent == null ? -1 : index[b.parent];
    if (p === undefined || (b.parent != null && p < 0)) throw new Error(`bone ${b.name} before its parent`);
    index[b.name] = i; parent[i] = p;
    for (let k = 0; k < 3; k++) { bind[i * 3 + k] = b.at[k]; bindWorld[i * 3 + k] = b.at[k] + (p >= 0 ? bindWorld[p * 3 + k] : 0); }
  });
  return Object.freeze({ count: bones.length, names: Object.freeze(bones.map((b) => b.name)), index: Object.freeze(index), parent, bind, bindWorld });
}

// A pose: local rotation (9: columns f, r, u), local translation offset (3), uniform scale (1) per bone, and the resolved
// world rotation (9, scale folded in) and position (3). Preallocated once per beast track.
export function createPose(skeleton) {
  const n = skeleton.count;
  const pose = { skeleton, rot: new Float64Array(n * 9), off: new Float64Array(n * 3), scl: new Float64Array(n), wr: new Float64Array(n * 9), wp: new Float64Array(n * 3),
    skin: new Float32Array(BEAST_SLOT.maxBones * 12) };
  resetPose(pose); return pose;
}
export function resetPose(pose) {
  const n = pose.skeleton.count;
  for (let i = 0; i < n; i++) { const r = pose.rot, o = i * 9; for (let k = 0; k < 9; k++) r[o + k] = k % 4 === 0 ? 1 : 0; pose.off[i * 3] = pose.off[i * 3 + 1] = pose.off[i * 3 + 2] = 0; pose.scl[i] = 1; }
}
// Local rotation from yaw (about u, turning f toward r), pitch (about r, +: f tips down) and roll (about f, +: r tips up).
export function setEuler(pose, i, yaw = 0, pitch = 0, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll), m = pose.rot, o = i * 9;
  // R = Rz(yaw) * Ry(pitch) * Rx(roll); stored by columns (f, r, u).
  m[o] = cy * cp; m[o + 1] = sy * cp; m[o + 2] = -sp;
  m[o + 3] = cy * sp * sr - sy * cr; m[o + 4] = sy * sp * sr + cy * cr; m[o + 5] = cp * sr;
  m[o + 6] = cy * sp * cr + sy * sr; m[o + 7] = sy * sp * cr - cy * sr; m[o + 8] = cp * cr;
}
export function setOffset(pose, i, f = 0, r = 0, u = 0) { pose.off[i * 3] = f; pose.off[i * 3 + 1] = r; pose.off[i * 3 + 2] = u; }
// Resolve bone i's world transform from its parent's (parents are resolved first: bones are stored parents first).
export function resolveBone(pose, i, rootX = 0, rootY = 0, rootZ = 0) {
  const sk = pose.skeleton, p = sk.parent[i], L = pose.rot, W = pose.wr, P = pose.wp, o = i * 9, s = pose.scl[i];
  const lx = sk.bind[i * 3] + pose.off[i * 3], ly = sk.bind[i * 3 + 1] + pose.off[i * 3 + 1], lz = sk.bind[i * 3 + 2] + pose.off[i * 3 + 2];
  if (p < 0) {
    for (let k = 0; k < 9; k++) W[o + k] = L[o + k] * s;
    P[i * 3] = rootX + lx; P[i * 3 + 1] = rootY + ly; P[i * 3 + 2] = rootZ + lz; return;
  }
  const q = p * 9;
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++)
    W[o + c * 3 + r] = (W[q + r] * L[o + c * 3] + W[q + 3 + r] * L[o + c * 3 + 1] + W[q + 6 + r] * L[o + c * 3 + 2]) * s;
  for (let r = 0; r < 3; r++) P[i * 3 + r] = P[p * 3 + r] + W[q + r] * lx + W[q + 3 + r] * ly + W[q + 6 + r] * lz;
}
export function resolveFrom(pose, first = 0, rootX = 0, rootY = 0, rootZ = 0) { for (let i = first; i < pose.skeleton.count; i++) resolveBone(pose, i, rootX, rootY, rootZ); }

// The parent's world scale (rotation columns carry it).
function parentScale(pose, i) { const p = pose.skeleton.parent[i]; if (p < 0) return 1; const W = pose.wr, q = p * 9; return Math.hypot(W[q], W[q + 1], W[q + 2]) || 1; }
// Set bone i's local rotation so that its world axes become the given orthonormal world columns (f, r, u).
const AXIS = new Float64Array(9);
export function setWorldAxes(pose, i, fx, fy, fz, rx, ry, rz, ux, uy, uz) {
  const p = pose.skeleton.parent[i], L = pose.rot, o = i * 9;
  AXIS[0] = fx; AXIS[1] = fy; AXIS[2] = fz; AXIS[3] = rx; AXIS[4] = ry; AXIS[5] = rz; AXIS[6] = ux; AXIS[7] = uy; AXIS[8] = uz;
  if (p < 0) { for (let k = 0; k < 9; k++) L[o + k] = AXIS[k]; return; }
  const W = pose.wr, q = p * 9, s = parentScale(pose, i);
  // local = unitParentRot^T * world: the parent's columns carry its scale s, so W^T * world is s times too large. The child
  // then inherits the scale again when it is resolved (its world axes are the given directions times the inherited scale).
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++)
    L[o + c * 3 + r] = (W[q + r * 3] * AXIS[c * 3] + W[q + r * 3 + 1] * AXIS[c * 3 + 1] + W[q + r * 3 + 2] * AXIS[c * 3 + 2]) / s;
}
// Point bone i's local axis (0: +f, 1: +r, 2: +u; negative: -axis-1, e.g. -3 is -u) along a world direction, with a hint
// for a second axis (the f axis, or u when aiming f). Orthonormalised; degenerate hints fall back to world up/forward.
export function aimWorld(pose, i, axis, dx, dy, dz, hx, hy, hz) {
  let l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  const sign = axis < 0 ? -1 : 1, a = axis < 0 ? -axis - 1 : axis;
  dx *= sign; dy *= sign; dz *= sign;
  // second axis: the hint with the aimed component removed
  let d = hx * dx + hy * dy + hz * dz, sx = hx - d * dx, sy = hy - d * dy, sz = hz - d * dz; l = Math.hypot(sx, sy, sz);
  if (l < 1e-5) { const alt = Math.abs(dz) < .9 ? [0, 0, 1] : [1, 0, 0]; d = alt[0] * dx + alt[1] * dy + alt[2] * dz; sx = alt[0] - d * dx; sy = alt[1] - d * dy; sz = alt[2] - d * dz; l = Math.hypot(sx, sy, sz); }
  sx /= l; sy /= l; sz /= l;
  // third = cross; the frame stays right-handed: f x r = u
  if (a === 2) { // aim u, s is f, r = u x f
    setWorldAxes(pose, i, sx, sy, sz, dy * sz - dz * sy, dz * sx - dx * sz, dx * sy - dy * sx, dx, dy, dz);
  } else if (a === 0) { // aim f, s is u, r = u x f
    setWorldAxes(pose, i, dx, dy, dz, sy * dz - sz * dy, sz * dx - sx * dz, sx * dy - sy * dx, sx, sy, sz);
  } else { // aim r, s is f, u = f x r
    setWorldAxes(pose, i, sx, sy, sz, dx, dy, dz, sy * dz - sz * dy, sz * dx - sx * dz, sx * dy - sy * dx);
  }
}
// The skinning matrices for the GPU: rows of world rotation | translation, with the bind position folded out
// (vertices are stored in bind space: bone origin at its bind world position, unrotated).
export function writeSkin(pose) {
  const sk = pose.skeleton, W = pose.wr, P = pose.wp, B = sk.bindWorld, out = pose.skin;
  for (let i = 0; i < sk.count; i++) {
    const o = i * 9, s = i * 12, bx = B[i * 3], by = B[i * 3 + 1], bz = B[i * 3 + 2];
    for (let r = 0; r < 3; r++) {
      const m0 = W[o + r], m1 = W[o + 3 + r], m2 = W[o + 6 + r];
      out[s + r * 4] = m0; out[s + r * 4 + 1] = m1; out[s + r * 4 + 2] = m2; out[s + r * 4 + 3] = P[i * 3 + r] - (m0 * bx + m1 * by + m2 * bz);
    }
  }
  return out;
}
// A bone's world position (tests and effect anchors).
export function boneWorld(pose, name, out = [0, 0, 0]) { const i = pose.skeleton.index[name]; out[0] = pose.wp[i * 3]; out[1] = pose.wp[i * 3 + 1]; out[2] = pose.wp[i * 3 + 2]; return out; }
// A point in bone-local coordinates (relative to the bone's origin, in its own axes) to world.
export function boneLocalToWorld(pose, name, f, r, u, out = [0, 0, 0]) {
  const i = pose.skeleton.index[name], W = pose.wr, o = i * 9, P = pose.wp;
  for (let k = 0; k < 3; k++) out[k] = P[i * 3 + k] + W[o + k] * f + W[o + 3 + k] * r + W[o + 6 + k] * u;
  return out;
}

// ------------------------------------------------------------------------------------------------ two-bone IK
// Hip (or shoulder) at H, target T (world). Bends in the plane of the limb and `pole` (the knee/elbow points toward it).
// Writes the joint position into J and returns the reach fraction used (1: fully extended).
export function solveTwoBone(H, T, L1, L2, pole, J) {
  let dx = T[0] - H[0], dy = T[1] - H[1], dz = T[2] - H[2]; const raw = Math.hypot(dx, dy, dz) || 1e-6;
  const d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, raw)); dx /= raw; dy /= raw; dz /= raw;
  const a = (L1 * L1 + d * d - L2 * L2) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let px = pole[0], py = pole[1], pz = pole[2]; const k = px * dx + py * dy + pz * dz; px -= k * dx; py -= k * dy; pz -= k * dz;
  let pl = Math.hypot(px, py, pz); if (pl < 1e-6) { px = 0; py = 0; pz = 1; const k2 = dz; px -= k2 * dx; py -= k2 * dy; pz -= k2 * dz; pl = Math.hypot(px, py, pz) || 1; }
  px /= pl; py /= pl; pz /= pl;
  J[0] = H[0] + dx * a + px * h; J[1] = H[1] + dy * a + py * h; J[2] = H[2] + dz * a + pz * h;
  return d / (L1 + L2);
}

// ------------------------------------------------------------------------------------------------ curves
export const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const easeIn = (x) => { x = clamp01(x); return x * x * x; };
export const easeOut = (x) => { x = clamp01(x); const y = 1 - x; return 1 - y * y * y; };
export const mix = (a, b, t) => a + (b - a) * t;
export const span = (x, a, b) => clamp01((x - a) / (b - a)); // 0 before a, 1 after b
// A committed strike across one clock: anticipation (pull away, `load` share), a fast travel that reaches contact exactly at
// `contact`, follow-through past contact (`over` beyond 1) settling back to 1 by `settle`. Returns -antic..1+over.
export function strikeCurve(x, contact, { load = .55, antic = .25, over = .18, settle = 1 } = {}) {
  x = clamp01(x);
  if (x < contact * load) return -antic * smooth(x / (contact * load));
  if (x < contact) { const t = (x - contact * load) / (contact * (1 - load)); return -antic + (1 + antic) * easeIn(t) ** .7; }
  if (x < settle) { const t = (x - contact) / Math.max(1e-6, settle - contact); return 1 + over * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (1 - t); }
  return 1;
}
// A damped kick at time x seconds after an impulse (1 at 0, oscillating down to 0).
export const kick = (x, freq = 9, damp = 7) => !(x >= 0 && x < 30) ? 0 : Math.exp(-damp * x) * Math.cos(freq * x);
// A deterministic, smooth, bounded noise from a time (seconds) and a seed (for breathing variety and crackle).
export function wobble(t, seed = 0) { return .5 * Math.sin(t * 1.7 + seed * 1.3) + .3 * Math.sin(t * 2.9 + seed * 2.1) + .2 * Math.sin(t * 4.7 + seed * .7); }

// ------------------------------------------------------------------------------------------------ planted-foot gait
// Feet are held where they were planted while the body passes over them, then swing in an arc to the next plant ahead
// (body position + forward x stride share). Driven by the distance the beast actually travelled, so a planted foot never
// slides. `feet` is a preallocated Float64Array of n x 8: plant x, y; lift-off x, y; target x, y; phase offset; planted.
export function createGait(feet) {
  const n = feet.length;
  return { n, phase: 0, moving: 0, x: NaN, y: NaN, at: NaN, yaw: 0, offsets: Float64Array.from(feet.map((f) => f.phase)),
    side: Float64Array.from(feet.map((f) => f.side)), fore: Float64Array.from(feet.map((f) => f.fore || 0)),
    state: new Float64Array(n * 8), out: new Float64Array(n * 4) /* x, y, lift (0..1), planted */ };
}
// stride: body travel per full cycle (both feet once); stance: share of the cycle a foot is down.
export function stepGait(G, x, y, yaw, nowMs, { stride = 1, stance = .6, settle = 4, still = false, snapDistance = 2 } = {}) {
  const dt = Number.isFinite(G.at) ? Math.min(.1, Math.max(0, (nowMs - G.at) / 1000)) : 0;
  const jump = !Number.isFinite(G.x) || Math.hypot(x - G.x, y - G.y) > snapDistance;
  const travelled = jump ? 0 : Math.hypot(x - G.x, y - G.y);
  if (!still && !jump) G.phase = (G.phase + travelled / Math.max(1e-3, stride)) % 1;
  const speed = dt > 0 ? travelled / dt : 0, target = !still && speed > .05 ? 1 : 0;
  if (dt > 0) G.moving += (target - G.moving) * Math.min(1, dt * settle);
  G.x = x; G.y = y; G.at = nowMs; G.yaw = yaw;
  const cf = Math.cos(yaw), sf = Math.sin(yaw), reach = stride * stance * .5;
  for (let k = 0; k < G.n; k++) {
    const s = G.state, o = k * 8, side = G.side[k], fore = G.fore[k];
    const homeX = x + cf * fore - sf * side, homeY = y + sf * fore + cf * side; // the foot's rest spot under the hip
    const p = (((G.phase + G.offsets[k]) % 1) + 1) % 1, planted = p < stance;
    if (jump || !Number.isFinite(s[o])) { s[o] = homeX; s[o + 1] = homeY; s[o + 7] = 1; }
    let fx, fy, lift = 0;
    if (G.moving < .02 || still) {
      // standing: feet settle home (a small shuffle when the body turned or drifted)
      const k2 = dt > 0 ? Math.min(1, dt * 6) : 0; s[o] += (homeX - s[o]) * k2; s[o + 1] += (homeY - s[o + 1]) * k2; fx = s[o]; fy = s[o + 1]; s[o + 7] = 1;
    } else if (planted) {
      if (s[o + 7] !== 1) { s[o] = s[o + 4]; s[o + 1] = s[o + 5]; s[o + 7] = 1; } // touchdown: plant where the swing was heading
      fx = s[o]; fy = s[o + 1];
    } else {
      if (s[o + 7] === 1) { s[o + 2] = s[o]; s[o + 3] = s[o + 1]; s[o + 7] = 0; } // lift-off
      const q = (p - stance) / (1 - stance), e = smooth(q);
      // land ahead of the hip by the stance half-length, along the current heading
      s[o + 4] = homeX + cf * reach * G.moving; s[o + 5] = homeY + sf * reach * G.moving;
      fx = mix(s[o + 2], s[o + 4], e); fy = mix(s[o + 3], s[o + 5], e); lift = Math.sin(Math.PI * q);
    }
    G.out[k * 4] = fx; G.out[k * 4 + 1] = fy; G.out[k * 4 + 2] = lift * G.moving; G.out[k * 4 + 3] = planted || G.moving < .02 ? 1 : 0;
  }
  return G;
}

// ------------------------------------------------------------------------------------------------ the mesh builder
// Parts are authored in a bone's local frame (f, r, u; relative to the bone origin) and stored in bind space. Each
// primitive takes `at` (centre), optional axes `F`, `R`, `U` (local directions, default the bone's) and `emit` (0: lit
// surface, 1..4: the beast's emissive channels, whose brightness and fade the pose drives each frame).
export function meshBuilder(skeleton, detail = 1) {
  const pos = [], nrm = [], col = [], skin = [], idx = [];
  let bone = 0, emit = 0, color = [1, 1, 1];
  const B = { detail, triangles: 0, skeleton };
  B.bone = (name) => { const i = skeleton.index[name]; if (i === undefined) throw new Error(`no bone ${name}`); bone = i; return B; };
  B.color = (hex, e = 0) => { color = [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; emit = e; return B; };
  const vert = (x, y, z, nx, ny, nz) => {
    const bx = skeleton.bindWorld[bone * 3], by = skeleton.bindWorld[bone * 3 + 1], bz = skeleton.bindWorld[bone * 3 + 2], l = Math.hypot(nx, ny, nz) || 1;
    pos.push(x + bx, y + by, z + bz); nrm.push(nx / l, ny / l, nz / l); col.push(color[0], color[1], color[2]); skin.push(bone, emit);
    return pos.length / 3 - 1;
  };
  B.vertex = vert;
  B.tri = (a, b, c) => { idx.push(a, b, c); B.triangles++; };
  // A flat polygon (points as [x,y,z] in bone-local), its normal from the winding (counter-clockwise seen from outside).
  B.poly = (pts, flip = false) => {
    const a = pts[0], b = pts[1], c = pts[2];
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    const base = pts.map((p) => vert(p[0], p[1], p[2], nx, ny, nz));
    for (let i = 1; i < base.length - 1; i++) flip ? B.tri(base[0], base[i + 1], base[i]) : B.tri(base[0], base[i], base[i + 1]);
  };
  // Orientation helper: a point p = at + F*a + R*b + U*c.
  const frame = (o = {}) => {
    const at = o.at || [0, 0, 0], F = norm3(o.F || [1, 0, 0]), U0 = o.U || [0, 0, 1];
    let U = sub3(U0, scale3(F, dot3(U0, F))); if (Math.hypot(...U) < 1e-6) U = Math.abs(F[2]) < .9 ? [0, 0, 1] : [1, 0, 0]; U = norm3(sub3(U, scale3(F, dot3(U, F))));
    const R = cross3(U, F); // f x r = u  =>  r = u x f
    return (a, b, c) => [at[0] + F[0] * a + R[0] * b + U[0] * c, at[1] + F[1] * a + R[1] * b + U[1] * c, at[2] + F[2] * a + R[2] * b + U[2] * c];
  };
  B.frame = frame;
  // A bevelled box: half extents (hf, hr, hu) along the frame axes, with every edge chamfered by `bevel` (flat facets).
  // `taper` narrows the top face (r and f) by a share; `skew` slides the top face forward.
  B.box = (o) => {
    const P = frame(o), hf = o.size[0], hr = o.size[1], hu = o.size[2], bv = Math.min(o.bevel ?? .12, .45) * Math.min(hf, hr, hu), tp = 1 - (o.taper || 0), sk = o.skew || 0;
    if (detail < .9 || bv <= 0) { // plain box (chamfered edges only at full detail)
      const c = (sf, sr, su) => P(sf * hf * (su > 0 ? tp : 1) + (su > 0 ? sk : 0), sr * hr * (su > 0 ? tp : 1), su * hu);
      const q = (a, b, cc, d) => B.poly([a, b, cc, d]);
      q(c(1, -1, -1), c(1, 1, -1), c(1, 1, 1), c(1, -1, 1)); q(c(-1, 1, -1), c(-1, -1, -1), c(-1, -1, 1), c(-1, 1, 1));
      q(c(-1, 1, -1), c(-1, 1, 1), c(1, 1, 1), c(1, 1, -1)); q(c(-1, -1, 1), c(-1, -1, -1), c(1, -1, -1), c(1, -1, 1));
      q(c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)); q(c(-1, -1, -1), c(-1, 1, -1), c(1, 1, -1), c(1, -1, -1));
      return B;
    }
    // chamfered box: 24 corner points (each corner split three ways), 6 faces, 12 edge bevels, 8 corner triangles
    const g = (sf, sr, su, af, ar, au) => { const t = su > 0 ? tp : 1; return P((sf * hf - af * sf * bv) * t + (su > 0 ? sk : 0), (sr * hr - ar * sr * bv) * t, su * hu - au * su * bv); };
    const S = [-1, 1];
    for (const sf of S) B.poly(sf > 0 ? [g(1, -1, -1, 0, 1, 1), g(1, 1, -1, 0, 1, 1), g(1, 1, 1, 0, 1, 1), g(1, -1, 1, 0, 1, 1)] : [g(-1, 1, -1, 0, 1, 1), g(-1, -1, -1, 0, 1, 1), g(-1, -1, 1, 0, 1, 1), g(-1, 1, 1, 0, 1, 1)]);
    for (const sr of S) B.poly(sr > 0 ? [g(-1, 1, -1, 1, 0, 1), g(-1, 1, 1, 1, 0, 1), g(1, 1, 1, 1, 0, 1), g(1, 1, -1, 1, 0, 1)] : [g(-1, -1, 1, 1, 0, 1), g(-1, -1, -1, 1, 0, 1), g(1, -1, -1, 1, 0, 1), g(1, -1, 1, 1, 0, 1)]);
    for (const su of S) B.poly(su > 0 ? [g(-1, -1, 1, 1, 1, 0), g(1, -1, 1, 1, 1, 0), g(1, 1, 1, 1, 1, 0), g(-1, 1, 1, 1, 1, 0)] : [g(-1, -1, -1, 1, 1, 0), g(-1, 1, -1, 1, 1, 0), g(1, 1, -1, 1, 1, 0), g(1, -1, -1, 1, 1, 0)]);
    const quad = (a, b, c, d) => { const n = faceNormal(a, b, c), ctr = centroid(a, b, c, d), out = sub3(ctr, P(0, 0, 0)); B.poly(dot3(n, out) >= 0 ? [a, b, c, d] : [d, c, b, a]); };
    const tri3 = (a, b, c) => { const n = faceNormal(a, b, c), ctr = centroid(a, b, c), out = sub3(ctr, P(0, 0, 0)); B.poly(dot3(n, out) >= 0 ? [a, b, c] : [c, b, a]); };
    for (const sr of S) for (const su of S) quad(g(-1, sr, su, 1, 0, 1), g(1, sr, su, 1, 0, 1), g(1, sr, su, 1, 1, 0), g(-1, sr, su, 1, 1, 0)); // edges along f
    for (const sf of S) for (const su of S) quad(g(sf, -1, su, 0, 1, 1), g(sf, 1, su, 0, 1, 1), g(sf, 1, su, 1, 1, 0), g(sf, -1, su, 1, 1, 0)); // edges along r
    for (const sf of S) for (const sr of S) quad(g(sf, sr, -1, 0, 1, 1), g(sf, sr, 1, 0, 1, 1), g(sf, sr, 1, 1, 0, 1), g(sf, sr, -1, 1, 0, 1)); // edges along u
    for (const sf of S) for (const sr of S) for (const su of S) tri3(g(sf, sr, su, 0, 1, 1), g(sf, sr, su, 1, 0, 1), g(sf, sr, su, 1, 1, 0));
    return B;
  };
  // A lathe about the frame's F axis: rings [[along, radius], ...] (radius 0 closes an end), `seg` sides (scaled by detail),
  // `rs` scales the R radius (ellipses), `smooth` shares normals around (round), else flat facets.
  B.lathe = (o) => {
    const P = frame(o), rings = o.rings, seg = Math.max(o.minSeg || 4, Math.round((o.seg || 10) * (detail >= 1 ? 1 : detail >= .6 ? .68 : .5))), rs = o.rs ?? 1, us = o.us ?? 1, smoothN = o.smooth !== false;
    const ringPts = rings.map(([a, r]) => { const pts = []; for (let k = 0; k < seg; k++) { const t = (k / seg) * Math.PI * 2 + (o.phase || 0); pts.push(P(a, Math.cos(t) * r * rs, Math.sin(t) * r * us)); } return pts; });
    const centre = P(rings.reduce((s, q) => s + q[0], 0) / rings.length, 0, 0);
    for (let i = 0; i < rings.length - 1; i++) {
      const A = ringPts[i], C = ringPts[i + 1], ra = rings[i][1], rc = rings[i + 1][1];
      if (smoothN) {
        // per-vertex normals: radial, tilted by the profile slope
        const da = rings[i + 1][0] - rings[i][0], dr = rc - ra, len = Math.hypot(da, dr) || 1, tilt = -dr / len, radial = da / len;
        const vA = [], vC = [];
        for (let k = 0; k < seg; k++) {
          const t = (k / seg) * Math.PI * 2 + (o.phase || 0), d = sub3(P(0, Math.cos(t) * rs, Math.sin(t) * us), P(0, 0, 0)), ax = sub3(P(1, 0, 0), P(0, 0, 0));
          const n = add3(scale3(norm3(d), radial), scale3(norm3(ax), tilt));
          vA.push(vert(...A[k], ...n)); vC.push(vert(...C[k], ...n));
        }
        for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg;
          if (ra > 1e-6) B.tri(vA[k], vC[k], vA[k2]); if (rc > 1e-6) B.tri(vA[k2], vC[k], vC[k2]); }
      } else {
        for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg;
          const pts = ra > 1e-6 && rc > 1e-6 ? [A[k], C[k], C[k2], A[k2]] : ra > 1e-6 ? [A[k], C[k], A[k2]] : [A[k], C[k], C[k2]];
          const n = faceNormal(pts[0], pts[1], pts[2]); const out = sub3(centroid(...pts), centre); B.poly(dot3(n, out) >= 0 ? pts : pts.slice().reverse()); }
      }
    }
    // caps
    const capEnd = (i, sign) => { if (rings[i][1] <= 1e-6) return; const pts = sign > 0 ? ringPts[i].slice().reverse() : ringPts[i].slice(); const n = faceNormal(pts[0], pts[1], pts[2]), axisDir = sub3(P(sign, 0, 0), P(0, 0, 0)); B.poly(dot3(n, axisDir) >= 0 ? pts : pts.reverse()); };
    if (o.caps !== false) { capEnd(0, -1); capEnd(rings.length - 1, 1); }
    return B;
  };
  // A sphere/ellipsoid along the frame's F axis: radius (f, r, u).
  B.ellipsoid = (o) => { const n = Math.max(3, Math.round((o.rings || 5) * (detail >= 1 ? 1 : .7))), rings = []; for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + Math.PI * i / n; rings.push([Math.sin(t) * o.radius[0], Math.cos(t) * 1]); }
    return B.lathe({ seg: 8, ...o, rings: rings.map(([a, r], i) => [a, i === 0 || i === n ? 0 : r]), rs: o.radius[1], us: o.radius[2], smooth: o.smooth !== false, caps: false }); };
  // An extruded flat profile: points [[a, b], ...] in the frame's (F, U) plane (counter-clockwise), thickness along R.
  B.slab = (o) => {
    const P = frame(o), h = o.thick / 2, pts = o.points, bv = detail >= .6 ? (o.bevel || 0) : 0, n = pts.length;
    let cx = 0, cy = 0; for (const [a, b] of pts) { cx += a / n; cy += b / n; }
    const inset = (k) => { const [a, b] = pts[k]; const dx = a - cx, dy = b - cy, l = Math.hypot(dx, dy) || 1; return [a - dx / l * bv, b - dy / l * bv]; };
    const front = pts.map((_, k) => { const [a, b] = bv ? inset(k) : pts[k]; return P(a, h, b); }), back = pts.map((_, k) => { const [a, b] = bv ? inset(k) : pts[k]; return P(a, -h, b); });
    const midF = pts.map(([a, b]) => P(a, h - bv, b)), midB = pts.map(([a, b]) => P(a, -h + bv, b));
    const orient = (poly, outward) => { const nrm2 = faceNormal(poly[0], poly[1], poly[2]); B.poly(dot3(nrm2, outward) >= 0 ? poly : poly.slice().reverse()); };
    const Rdir = sub3(P(0, 1, 0), P(0, 0, 0));
    orient(front, Rdir); orient(back.slice(), scale3(Rdir, -1));
    const cen = P(cx, 0, cy);
    for (let k = 0; k < n; k++) { const k2 = (k + 1) % n;
      if (bv) { orient([front[k], midF[k], midF[k2], front[k2]], sub3(centroid(front[k], front[k2]), cen)); orient([midB[k], back[k], back[k2], midB[k2]], sub3(centroid(back[k], back[k2]), cen)); orient([midF[k], midB[k], midB[k2], midF[k2]], sub3(centroid(midF[k], midF[k2]), cen)); }
      else orient([front[k], back[k], back[k2], front[k2]], sub3(centroid(front[k], front[k2]), cen)); }
    return B;
  };
  // A zig-zag lightning strip (emissive): two thin crossed ribbons through the points, so it reads from any side.
  B.bolt = (o) => {
    const P = frame(o), pts = o.points, w = o.width || .02;
    for (const [ar, au] of [[1, 0], [0, 1]]) for (let k = 0; k < pts.length - 1; k++) {
      const [a0, b0, c0] = pts[k], [a1, b1, c1] = pts[k + 1];
      const p0 = P(a0, b0 + ar * w, c0 + au * w), p1 = P(a0, b0 - ar * w, c0 - au * w), p2 = P(a1, b1 - ar * w, c1 - au * w), p3 = P(a1, b1 + ar * w, c1 + au * w);
      B.poly([p0, p1, p2, p3]);
    }
    return B;
  };
  // Everything added after mark() is an optional section (a storm cloud, say): drawn only when the pose asks for it.
  let marked = -1; B.mark = () => { marked = idx.length; return B; };
  B.done = () => {
    const vc = pos.length / 3; if (vc > 65535) throw new Error('beast mesh vertices');
    const core = marked < 0 ? idx.length : marked;
    return Object.freeze({ positions: Float32Array.from(pos), normals: Float32Array.from(nrm), colors: Float32Array.from(col), skin: Float32Array.from(skin),
      indices: Uint16Array.from(idx), vertexCount: vc, triangles: B.triangles, coreIndices: core, coreTriangles: core / 3, detail });
  };
  return B;
}
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function norm3(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function faceNormal(a, b, c) { return cross3(sub3(b, a), sub3(c, a)); }
function centroid(...p) { const o = [0, 0, 0]; for (const q of p) { o[0] += q[0] / p.length; o[1] += q[1] / p.length; o[2] += q[2] / p.length; } return o; }

// The tier a quality setting draws (close-view.ts Q): full, balanced or low.
export function beastTier(Q) { return Q?.glScale === 1 ? 'full' : Q?.relief ? 'balanced' : 'low'; }
export const TIER_DETAIL = Object.freeze({ full: 1, balanced: .7, low: .4 });
