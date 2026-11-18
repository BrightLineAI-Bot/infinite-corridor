// The Triceratops's standard-view body (Tim, 2026-11-18: "make him more Triceratops-like ... better legs and a better body, horn and
// everything", with the Wild Stegosaurus and the Spinosaurus as the bar). Drawing only: nothing here changes combat, timing or saves.
// A friendly, slightly goofy but solid ceratopsian: a heavy barrel body on four pillar legs with broad padded feet, a thick tapering
// tail, a big shield frill edged with knobs, two long brow horns, a short nose horn, a hooked beak and a round bright eye.
//
// It reads only the accepted fields: the pack attack and its phase (ramCharge, heavySweep, shockwave; e.pack), the disposition
// (the Silly Goose and Bad bounce the tail on the sweep), the ridden mount's neck pose (e.mountHornPose, from beast-mounts.ts
// triceratopsHornPose) and air (e.mountAir: the leap's lift, tucked legs and the landing stomp), movement (a gait phase from the
// distance travelled) and e.reduceMotion. The coat is the same for every disposition: "its nature is known by what it does".
// The ridden Silly Goose wears its own tack (beast-mounts-render.ts) and pokes its tongue out.
//
// Body units u (a tile times the actor's scale), feet at 0, y up, +x toward the head. q: the shared pack paint context
// { k, b, u, t, flip, state, e } (monster-render.ts paintPackMonster). `now` (ms) drives the gait. Nothing is allocated per frame
// beyond the bounded per-id memory below.

const TAU = Math.PI * 2;
export const TRI_ART = Object.freeze({
  // colours: the bright yellow hide of release 987, a warm darker back, a pale belly; an orange frill edged pale; ivory horns
  body: "#f2cf35", bodyLight: "#ffe680", bodyDark: "#d39f1c", mark: "#bf8510", shade: "#8a6418", outline: "#4a3410", belly: "#fff0a0", stripe: "#c98d17",
  frill: "#f6b83e", frillInner: "#e88a2c", frillSpot: "#a9501c", frillEdge: "#fff0a0", knob: "#fff6d6",
  horn: "#fff6dc", hornBase: "#d8bf86", hornTip: "#f4ead0", beak: "#5a3d14", beakLight: "#8a6418", eye: "#fffef4", pupil: "#241808",
  toe: "#fff3cf", pad: "#6b4a14", tongue: "#ff8ba0", mouth: "#7a2a1c",
  // shape: the spine from the tail tip (0) to the base of the skull (1)
  spine: 26, length: 1.42, hipAt: .42, shoulderAt: .73, hip: .6, crouchDrop: .14, headScale: 1.48,
  thigh: .27, shin: .24, upperArm: .22, foreArm: .2, foot: .05, stride: .14, settle: 6, ease: 10, strikeEase: 18,
  landMs: 380, lean: .12, tailBounce: .08, quietBounce: .05,
});
// How each pose bends the body. pitch (+ nose up; about the hips, or the shoulders nose down), head (+ raises the head), reach
// (head pushed forward), open (beak), crouch, tailUp (+ up), tailSide (lateral swing, + to its left), frontLift (forefeet off the
// ground: the rear before a stomp), tuck (legs folded: the leap), lean (thrown forward in the charge).
export const TRI_POSES = Object.freeze({
  idle: {}, walk: {},
  chargeReady: { head: -.55, crouch: .35, pitch: -.06, reach: -.08, tailUp: .15 },
  charge: { head: -.45, reach: .2, pitch: -.1, crouch: .12, lean: 1 },
  sweepReady: { tailSide: -.8, crouch: .12, head: .1, tailUp: .1 },
  sweep: { tailSide: 1, tailUp: .18, head: .15, open: .3 },
  rear: { frontLift: 1, pitch: .36, head: .32, open: .55, tailUp: -.1 },
  stomp: { crouch: .4, pitch: -.12, head: -.3 },
  hornHold: {}, // its brace is the horn overlay (TRI_HORN_BODY), on the accepted clock
  leap: { tuck: .85, pitch: .17, head: .22, tailUp: -.08, frontLift: .3 }, // springing up: nose high, forefeet drawn up
  fall: { tuck: .3, pitch: -.1, head: .28, tailUp: .25 }, // coming down: forefeet reaching for the ground, tail up for balance
  drill: { tuck: 1, pitch: 0, head: .1, tailUp: -.2 }, // the Silly Goose's tail drill: tucked tight, the tail stretched out behind as the bit
  land: { crouch: .45, pitch: -.06, head: -.2 },
  dazed: { head: -.5, crouch: .3, open: .3 },
  dead: { crouch: 1, head: -.6, tuck: .8, open: .3 },
});
export const TRI_KEYS = Object.freeze(["pitch", "head", "reach", "open", "crouch", "tailUp", "tailSide", "frontLift", "tuck", "lean"]);
// The ridden horn attacks' body (2026-11-18 pass 2: "a real wind-up ... a body brace, and a recoil on release"; the dash and bash "real
// head-down charges and shoves"). Added to the pose per unit of the accepted horn pose's own amount (beast-mounts.ts triceratopsHornPose:
// its pitch over the phase's largest), so it follows the gameplay clocks exactly and never eases behind them. The neck keeps the
// accepted pitch itself; these move the head further, the legs, the tail and (a little: the saddle and rider stay on their anchor) the
// body. hold/windup: braced back on the hind legs, head down and horns aimed; horn: the release's recoil; bash: the shove; dash: the charge.
export const TRI_HORN_BODY = Object.freeze({
  full: Object.freeze({ hold: .25, windup: .25, horn: .12, bash: .1, dash: .12 }),
  hold: Object.freeze({ crouch: .45, lean: -.35, head: -.32, tailUp: .3, open: .1 }),
  windup: Object.freeze({ crouch: .6, lean: -.45, head: -.45, tailUp: .4, open: .2 }),
  horn: Object.freeze({ lean: -.5, head: .12, crouch: .25, open: .45, tailUp: .3 }),
  bash: Object.freeze({ lean: .5, head: -.55, crouch: .3, tailUp: .45, reach: .35 }),
  dash: Object.freeze({ lean: .4, head: -.5, crouch: .25, tailUp: .35, open: .15 }),
});
// The overlay's amount for a horn pose (0..1), and its numbers into `out` (indexed as TRI_KEYS). No allocation.
export function triceratopsHornAmount(horn) {
  if (!horn || !TRI_HORN_BODY[horn.phase]) return 0;
  return Math.max(0, Math.min(1, Math.abs(Number(horn.pitch) || 0) / TRI_HORN_BODY.full[horn.phase]));
}
export function triceratopsHornOverlay(horn, out) {
  const k = triceratopsHornAmount(horn), B = k > 0 ? TRI_HORN_BODY[horn.phase] : null;
  for (let i = 0; i < TRI_KEYS.length; i++) out[i] = B ? (B[TRI_KEYS[i]] || 0) * k : 0;
  return out;
}
// The pose a Triceratops shows from its accepted state. `air`: the ridden leap's lift in tiles; `moving`: 0..1.
export function triceratopsPoseName(e, air = 0, moving = 0, rising = true) {
  if (e?.dead || e?.hp <= 0 && e?.maxHp > 0) return "dead";
  const a = e?.pack?.attack, wind = e?.pack?.phase === "windup";
  if (a === "ramCharge") return wind ? "chargeReady" : "charge";
  if (a === "heavySweep") return wind ? "sweepReady" : "sweep";
  if (a === "shockwave") return wind ? "rear" : "stomp";
  if (e?.mountDrill) return "drill";
  if (air > .05) return rising ? "leap" : "fall";
  const h = e?.mountHornPose?.phase; if (h === "hold" || h === "windup") return "hornHold";
  return moving > .3 ? "walk" : "idle";
}
// The Silly Goose and Bad swing the tail with a bounce (release 987); Good never sweeps.
export const triceratopsTailBounces = (e) => ["silly", "bad"].includes(e?.triceratopsDisposition) && e?.pack?.attack === "heavySweep" && e.pack.phase !== "windup";

// The spine's natural headings (radians, y up, tail to head) and its half thickness above and below (body units), by share s.
const HEADING = [[0, .3], [.2, .22], [.35, .1], [.43, .03], [.55, -.04], [.65, -.1], [.74, -.16], [.85, -.26], [1, -.22]];
const THICK = [[0, .02, .02], [.1, .05, .042], [.2, .085, .072], [.3, .14, .12], [.38, .23, .21], [.45, .3, .3], [.55, .32, .33], [.63, .3, .32], [.71, .25, .28], [.79, .19, .21], [.87, .15, .15], [.94, .13, .12], [1, .12, .11]];
function table(T, s, c) { if (s <= T[0][0]) return T[0][c]; for (let i = 1; i < T.length; i++) if (s <= T[i][0]) { const a = T[i - 1], b = T[i], f = (s - a[0]) / (b[0] - a[0]); return a[c] + (b[c] - a[c]) * f; } return T[T.length - 1][c]; }

// Render-only memory per creature (the renderer paints a fresh copy each frame, so it is keyed by id), bounded.
const MEMO = new Map(), MEMO_MAX = 24;
export const triceratopsRenderMemorySize = () => MEMO.size;
function memo(e, now) {
  const id = e.id || "triceratops"; let m = MEMO.get(id);
  if (!m) { m = { phase: 0, moving: 0, at: null, x: null, y: null, v: Object.create(null), w: Object.create(null), air: 0, airV: 0, landAt: -Infinity }; MEMO.set(id, m); if (MEMO.size > MEMO_MAX) MEMO.delete(MEMO.keys().next().value); }
  return m;
}
const N = TRI_ART.spine, PX = new Float64Array(N + 1), PY = new Float64Array(N + 1), PZ = new Float64Array(N + 1), NX = new Float64Array(N + 1), NY = new Float64Array(N + 1), DT = new Float64Array(N + 1), VT = new Float64Array(N + 1);
const LEG = new Float64Array(14), LEGW = new Float64Array(7), OV = new Float64Array(TRI_KEYS.length);
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

export function drawTriceratopsBody(ctx, q, now = 0) {
  const A = TRI_ART, { k, u, flip, e } = q, reduce = !!e.reduceMotion, t = reduce ? 0 : now / 1000, M = memo(e, now);
  const air = Math.max(0, Number(e.mountAir) || 0), dead = !!e.dead || e.hp <= 0 && e.maxHp > 0;
  // movement: a gait phase from the distance travelled (the leap's lift taken back out of the ridden mount's drawn y)
  const x = Number(e.x) || 0, y = (Number(e.y) || 0) + air, dt = M.at == null ? 0 : Math.min(.1, Math.max(0, (now - M.at) / 1000)), moved = M.x == null ? 0 : Math.hypot(x - M.x, y - M.y);
  M.at = now; M.x = x; M.y = y;
  if (dt > 0 && moved < 2) { M.phase = (M.phase + TAU * moved / (2 * A.stride * 1.6 * Math.max(.6, Number(e.scale) || 1))) % TAU; M.moving += ((moved / dt > .05 ? 1 : 0) - M.moving) * Math.min(1, dt * A.settle); }
  if (reduce) M.moving = 0;
  if (dt > 0) M.airV = (air - M.air) / dt;
  if (M.air > .05 && air <= .05) M.landAt = now; M.air = air;
  const poseName = triceratopsPoseName(e, air, M.moving, M.airV >= 0), stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  const land = poseName === "idle" || poseName === "walk" ? Math.max(0, 1 - (now - M.landAt) / A.landMs) : 0;
  const P0 = TRI_POSES[poseName], rate = /charge|sweep|stomp|rear|leap|fall|drill/.test(poseName) ? A.strikeEase : A.ease, E = M.v, V = M.w;
  for (const key of TRI_KEYS) { let target = P0[key] || 0; if (land) target += ((TRI_POSES.land[key] || 0) - target) * land; if (stun) target += ((TRI_POSES.dazed[key] || 0) - target) * stun;
    const prev = E[key]; E[key] = !Number.isFinite(prev) || !(dt > 0) || reduce ? target : prev + (target - prev) * Math.min(1, dt * rate); }
  // the ridden horn attack's body, straight from the accepted horn pose (no easing: locked to the gameplay clock)
  triceratopsHornOverlay(e.mountView ? e.mountHornPose : null, OV); for (let i = 0; i < TRI_KEYS.length; i++) V[TRI_KEYS[i]] = E[TRI_KEYS[i]] + OV[i];
  const moving = /^(idle|walk)$/.test(poseName) ? M.moving : 0, ph = M.phase, pitch = V.pitch;
  const bounce = triceratopsTailBounces(e) ? (reduce ? A.quietBounce : Math.sin(t * 20) * A.tailBounce) : 0;
  const wobble = reduce ? 0 : .02 * Math.sin(t * 1.3);

  // ---------------------------------------------------------------- the spine
  const L = A.length / N, ih = Math.round(A.hipAt * N), is = Math.round(A.shoulderAt * N);
  const headingAt = (i) => { const s = i / N; let a = table(HEADING, s, 1);
    if (s < A.hipAt) { const w = (A.hipAt - s) / A.hipAt; a += -V.tailUp * 1.4 * smooth(w * 1.6) - Math.max(0, pitch) * .85 * Math.min(1, w * 4) - bounce * 2 * w + (reduce ? 0 : .06 * Math.sin(t * 1.6 + s * 4) * w); }
    if (s > .86) a += (V.head * .5 + wobble) * (s - .86) / .14;
    return a; };
  PX[ih] = 0; PY[ih] = 0; PZ[ih] = 0;
  for (let i = ih; i < N; i++) { const a = (headingAt(i) + headingAt(i + 1)) / 2, l = L * (i / N > .86 ? 1 + V.reach * .8 : 1); PX[i + 1] = PX[i] + Math.cos(a) * l; PY[i + 1] = PY[i] + Math.sin(a) * l; PZ[i + 1] = 0; }
  for (let i = ih; i > 0; i--) { const a = (headingAt(i) + headingAt(i - 1)) / 2; PX[i - 1] = PX[i] - Math.cos(a) * L; PY[i - 1] = PY[i] - Math.sin(a) * L; PZ[i - 1] = 0; }
  // the tail's lateral swing: a rotation about the hips' upright axis, stronger toward the tip, foreshortened by its depth
  if (Math.abs(V.tailSide) > 1e-3) for (let i = 0; i < ih; i++) { const w = ((ih - i) / ih) ** .7, ang = V.tailSide * .95 * w, c = Math.cos(ang), sn = Math.sin(ang), dx = PX[i]; PX[i] = dx * c; PZ[i] = dx * sn; }
  // pitch about the hips (nose up) or the shoulders (nose down), then the hips set at their height
  const pvx = pitch >= 0 ? PX[ih] : PX[is], pvy = pitch >= 0 ? PY[ih] : PY[is], cp = Math.cos(pitch), sp = Math.sin(pitch);
  for (let i = 0; i <= N; i++) { const dx = PX[i] - pvx, dy = PY[i] - pvy; PX[i] = pvx + dx * cp - dy * sp; PY[i] = pvy + dx * sp + dy * cp; }
  const hipX = -.3, lift = A.hip - V.crouch * A.crouchDrop + (moving ? Math.abs(Math.sin(ph)) * .012 : 0) - (dead ? .22 : 0) + Math.abs(bounce) * .35; // the sweep's bounce lifts the hindquarters with the tail
  for (let i = 0; i <= N; i++) { PX[i] += hipX; PY[i] += lift; PY[i] -= PZ[i] * .4; }
  for (let i = 0; i <= N; i++) { const a = Math.max(0, i - 1), c = Math.min(N, i + 1), tx = PX[c] - PX[a], ty = PY[c] - PY[a], l = Math.hypot(tx, ty) || 1; NX[i] = -ty / l; NY[i] = tx / l;
    const sN = i / N, depth = 1 + PZ[i] * .3; DT[i] = table(THICK, sN, 1) * depth; VT[i] = table(THICK, sN, 2) * depth; }

  const lean = V.lean * A.lean * u, kx = k + flip * lean;
  ctx.save(); ctx.translate(kx, q.b); ctx.save(); ctx.scale(flip * u, u);
  const lw = Math.max(1 / u, .012), mv = (xx, yy) => ctx.moveTo(xx, -yy), ln = (xx, yy) => ctx.lineTo(xx, -yy), qc = (ax, ay, bx, by) => ctx.quadraticCurveTo(ax, -ay, bx, -by);
  // the ground shadow (a leap draws it smaller and lighter: the body is already lifted by the renderer)
  if (!e.noShadow) { const sh = Math.max(.45, 1 - air * .25), gy = air / Math.max(.6, Number(e.scale) || 1); ctx.fillStyle = `rgba(4,4,6,${(.42 * sh).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(-.04, gy, .8 * sh, .15 * sh, 0, 0, TAU); ctx.fill(); }

  // ---------------------------------------------------------------- legs
  const legAt = (hind, near) => { // hip/shoulder joint, foot target, bone lengths
    const i = hind ? ih : is, jx = PX[i] - NX[i] * VT[i] * .3 + (near ? 0 : (hind ? .05 : .045)), jy = PY[i] - NY[i] * VT[i] * .3 + (near ? 0 : .03);
    const l1 = hind ? A.thigh : A.upperArm, l2 = hind ? A.shin : A.foreArm;
    const off = (hind ? 0 : Math.PI) + (near ? 0 : Math.PI * .5), swing = Math.sin(ph + off) * moving, up = Math.max(0, Math.cos(ph + off)) * moving;
    let fx = (hind ? PX[ih] + .03 : PX[is] + .02) + (near ? 0 : (hind ? .06 : .05)) + swing * A.stride, fy = A.foot + up * .08 + (near ? 0 : .03);
    const rot = (bx, by) => [jx + bx * cp - by * sp, jy + bx * sp + by * cp], blend = (tx, ty, w) => { fx += (tx - fx) * w; fy += (ty - fy) * w; };
    const reach = (l1 + l2) * .9;
    if (V.tuck > .01) { const [tx, ty] = rot(hind ? .1 : -.06, -reach * .6); blend(tx, ty, V.tuck); }
    if (!hind && V.frontLift > .01) { const [tx, ty] = rot(.14, -reach * .55); blend(tx, ty, V.frontLift); }
    return { jx, jy, fx, fy, l1, l2 };
  };
  const limb = (pts, widths, tone, light) => { // a solid tapering limb through the points with a lit front edge
    const n = pts.length / 2, side = [];
    for (let i = 0; i < n; i++) { const xx = pts[i * 2], yy = pts[i * 2 + 1], a = Math.max(0, i - 1), c = Math.min(n - 1, i + 1), dx = pts[c * 2] - pts[a * 2], dy = pts[c * 2 + 1] - pts[a * 2 + 1], l = Math.hypot(dx, dy) || 1, w = widths[i] / 2; side.push([xx - dy / l * w, yy + dx / l * w, xx + dy / l * w, yy - dx / l * w]); }
    ctx.beginPath(); mv(side[0][0], side[0][1]); for (let i = 1; i < n; i++) qc(side[i - 1][0], side[i - 1][1], (side[i - 1][0] + side[i][0]) / 2, (side[i - 1][1] + side[i][1]) / 2); ln(side[n - 1][0], side[n - 1][1]);
    ln(side[n - 1][2], side[n - 1][3]); for (let i = n - 2; i >= 0; i--) qc(side[i + 1][2], side[i + 1][3], (side[i + 1][2] + side[i][2]) / 2, (side[i + 1][3] + side[i][3]) / 2); ln(side[0][2], side[0][3]); ctx.closePath();
    const g = ctx.createLinearGradient(side[1][2], -side[1][3], side[1][0], -side[1][1]); g.addColorStop(0, light); g.addColorStop(.55, tone); g.addColorStop(1, A.shade);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; // the outline down both sides and round the foot end, never across the top where it meets the body
    ctx.beginPath(); mv(side[1][0], side[1][1]); for (let i = 2; i < n; i++) ln(side[i][0], side[i][1]); ln(side[n - 1][2], side[n - 1][3]); for (let i = n - 2; i >= 1; i--) ln(side[i][2], side[i][3]); ctx.stroke(); };
  const drawLeg = (hind, near) => {
    const { jx, jy, fx, fy, l1, l2 } = legAt(hind, near), dx = fx - jx, dy = fy - jy, raw = Math.hypot(dx, dy) || 1e-3, d = Math.min(l1 + l2 - 1e-4, Math.max(1e-3, raw)), ux = dx / raw, uy = dy / raw;
    const a = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), bend = hind ? 1 : -1;
    const kx2 = jx + ux * a - uy * h * bend, ky2 = jy + uy * a + ux * h * bend, ex = jx + ux * d, ey = jy + uy * d;
    const tone = near ? A.body : A.bodyDark, light = near ? A.bodyLight : A.body;
    // pillar legs: a heavy thigh (or upper arm) bulging into the body, a thick straight shin down to the foot
    // the haunch or shoulder: a solid rounded mass where the leg meets the body, outlined only along its lower front
    if (near) { const hr = hind ? .19 : .14, cx2 = jx + (hind ? .0 : .01), cy2 = jy - (hind ? .04 : .03), g = ctx.createLinearGradient(cx2, -(cy2 + hr), cx2, -(cy2 - hr)); g.addColorStop(0, light); g.addColorStop(1, tone);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx2, -cy2, hr, hr * 1.25, 0, 0, TAU); ctx.fill();
      // the markings (Tim, 2026-11-18): darker bands of his own yellow curving across the haunch or the shoulder
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx2, -cy2, hr, hr * 1.25, 0, 0, TAU); ctx.clip(); ctx.fillStyle = A.mark; ctx.globalAlpha = .8;
      for (let i = 0; i < 3; i++) { const bx = cx2 - hr * .75 + i * hr * .62, w = hr * .2; ctx.beginPath(); ctx.moveTo(bx, -cy2 - hr * 1.3); ctx.quadraticCurveTo(bx + hr * .35, -cy2, bx + hr * .05, -cy2 + hr * 1.3); ctx.lineTo(bx + hr * .05 + w, -cy2 + hr * 1.3); ctx.quadraticCurveTo(bx + hr * .35 + w, -cy2, bx + w, -cy2 - hr * 1.3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(cx2, -cy2, hr, hr * 1.25, 0, .15, 1.9); ctx.stroke(); }
    // pillar legs: thick all the way down to a broad foot
    { const cx3 = 2 * kx2 - (jx + ex) / 2, cy3 = 2 * ky2 - (jy + ey) / 2, W = hind ? [.27, .24, .21, .19, .18, .185, .2] : [.21, .195, .175, .16, .155, .16, .17]; // a smooth column through the knee
      for (let i = 0; i < 7; i++) { const f = i / 6, g1 = (1 - f) * (1 - f), g2 = 2 * f * (1 - f), g3 = f * f; LEG[i * 2] = g1 * jx + g2 * cx3 + g3 * ex; LEG[i * 2 + 1] = g1 * jy + g2 * cy3 + g3 * (ey + .01); LEGW[i] = W[i]; }
      limb(LEG, LEGW, tone, light); }
    // the foot: a broad round pad, three blunt pale toenails at its front
    ctx.fillStyle = near ? A.bodyDark : A.shade; ctx.beginPath(); ctx.moveTo(ex - (hind ? .11 : .095), 0); ctx.quadraticCurveTo(ex - .1, -.07, ex, -.075); ctx.quadraticCurveTo(ex + .1, -.07, ex + (hind ? .12 : .105), 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = near ? A.toe : A.hornBase; for (let c = 0; c < 3; c++) { const tx = ex + .02 + c * .035; ctx.beginPath(); ctx.ellipse(tx, -.018, .02, .02, 0, Math.PI, TAU); ctx.lineTo(tx + .02, 0); ctx.lineTo(tx - .02, 0); ctx.fill(); }
    return { ex, ey };
  };
  drawLeg(true, false); drawLeg(false, false);

  // ---------------------------------------------------------------- the body
  const bodyPath = () => { ctx.beginPath(); mv(PX[0] + NX[0] * DT[0], PY[0] + NY[0] * DT[0]);
    for (let i = 1; i <= N; i++) { const ax = PX[i - 1] + NX[i - 1] * DT[i - 1], ay = PY[i - 1] + NY[i - 1] * DT[i - 1], bx2 = PX[i] + NX[i] * DT[i], by2 = PY[i] + NY[i] * DT[i]; qc(ax, ay, (ax + bx2) / 2, (ay + by2) / 2); }
    ln(PX[N] + NX[N] * DT[N], PY[N] + NY[N] * DT[N]); ln(PX[N] - NX[N] * VT[N], PY[N] - NY[N] * VT[N]);
    for (let i = N - 1; i >= 0; i--) { const ax = PX[i + 1] - NX[i + 1] * VT[i + 1], ay = PY[i + 1] - NY[i + 1] * VT[i + 1], bx2 = PX[i] - NX[i] * VT[i], by2 = PY[i] - NY[i] * VT[i]; qc(ax, ay, (ax + bx2) / 2, (ay + by2) / 2); }
    ctx.closePath(); };
  const top = PY[ih] + DT[ih], bot = PY[ih] - VT[ih], grad = ctx.createLinearGradient(0, -top, 0, -bot);
  grad.addColorStop(0, A.bodyLight); grad.addColorStop(.35, A.body); grad.addColorStop(.8, A.bodyDark); grad.addColorStop(1, A.shade);
  bodyPath(); ctx.fillStyle = grad; ctx.fill();
  ctx.save(); bodyPath(); ctx.clip();
  // the pale belly along the underside
  ctx.fillStyle = A.belly; ctx.globalAlpha = .75; ctx.beginPath();
  for (let i = 4; i <= N; i++) { const xx = PX[i] - NX[i] * VT[i] * .45, yy = PY[i] - NY[i] * VT[i] * .45; i === 4 ? mv(xx, yy) : ln(xx, yy); }
  for (let i = N; i >= 4; i--) ln(PX[i] - NX[i] * VT[i] * 1.2, PY[i] - NY[i] * VT[i] * 1.2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  // warm darker bands across the back, tapering down the flanks
  ctx.fillStyle = A.stripe; ctx.globalAlpha = .5;
  for (let i = 3; i < N - 3; i += 2) { const d = DT[i], w = .016 + d * .1, tx = -NY[i], ty = NX[i];
    ctx.beginPath(); mv(PX[i] + NX[i] * d * 1.1 - tx * w, PY[i] + NY[i] * d * 1.1 - ty * w); ln(PX[i] + NX[i] * d * 1.1 + tx * w, PY[i] + NY[i] * d * 1.1 + ty * w); ln(PX[i] + NX[i] * d * .35 + tx * w * .2, PY[i] + NY[i] * d * .35 + ty * w * .2); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
  // round scale spots on the flank, and the light along the back
  ctx.fillStyle = "rgba(255,240,160,.35)"; for (const [sN, f, r] of [[.5, .25, .035], [.56, .55, .028], [.62, .2, .03], [.48, .6, .024], [.68, .45, .025]]) { const i = Math.round(sN * N); ctx.beginPath(); ctx.arc(PX[i] + NX[i] * DT[i] * f, -(PY[i] + NY[i] * DT[i] * f), r, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = "rgba(255,248,200,.45)"; ctx.lineWidth = .028; ctx.beginPath(); for (let i = 3; i < N - 1; i++) { const xx = PX[i] + NX[i] * DT[i] * .72, yy = PY[i] + NY[i] * DT[i] * .72; i === 3 ? mv(xx, yy) : ln(xx, yy); } ctx.stroke();
  ctx.restore();
  bodyPath(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
  // the near legs over the flank
  drawLeg(true, true); drawLeg(false, true);
  ctx.restore(); // back to (kx, b), unscaled

  // ---------------------------------------------------------------- the head (the neck pivot articulates the ridden pose)
  const hx = PX[N], hy = PY[N], ha = Math.atan2(PY[N] - PY[N - 2], PX[N] - PX[N - 2]) + V.head * .55, horn = e.mountView && e.mountHornPose;
  ctx.save();
  if (horn) { const nx = flip * (PX[is] + .1) * u, ny = -(PY[is] + .05) * u; ctx.translate(nx + flip * horn.reach * u, ny + horn.lower * u); ctx.rotate(flip * horn.pitch); ctx.translate(-nx, -ny); }
  ctx.scale(flip * u, u);
  drawHead(ctx, A, hx, hy, ha, V, e, t, reduce, dead, lw, poseName);
  ctx.restore();
  // a charge's dust, and the stomp's ring at the forefeet
  const dashing = e.mountView && (e.mountHornPose?.phase === "dash" || e.mountHornPose?.phase === "bash" && triceratopsHornAmount(e.mountHornPose) > .3);
  if (!reduce && dashing) { ctx.fillStyle = "rgba(185,168,136,.42)"; for (let i = 0; i < 4; i++) { const f = (t * 2.6 + i / 4) % 1; ctx.beginPath(); ctx.arc(-flip * (.2 + f * .75) * u, -(.04 + f * .2) * u, (.05 + f * .1) * u, 0, TAU); ctx.fill(); } }
  if (land > .05) { ctx.fillStyle = `rgba(185,168,136,${(.5 * land).toFixed(3)})`; for (let i = 0; i < 6; i++) { const sx = (i - 2.5) * .26, f = 1 - land; ctx.beginPath(); ctx.arc(flip * (sx + Math.sign(sx) * f * .35) * u, -(.03 + f * .12) * u, (.06 + f * .08) * u, 0, TAU); ctx.fill(); } }
  if (poseName === "drill") { const tx = PX[0], ty = PY[0], spin = reduce ? 0 : t * 22; ctx.lineCap = "round"; ctx.lineWidth = Math.max(1.5, u * .022);
    for (let i = 0; i < 5; i++) { const f = i / 5, x0 = flip * (tx + .1 + f * .55) * u, r = (.05 + f * .18) * u, a = spin + i * 1.3; ctx.strokeStyle = `rgba(255,248,214,${(.75 * (1 - f)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(flip * (tx - .1 - f * .5) * u, -ty * u, r * .45, r, 0, a, a + 2.4); ctx.stroke(); void x0; }
    ctx.lineCap = "butt"; }
  if (!reduce && poseName === "charge") { ctx.fillStyle = "rgba(185,168,136,.45)"; for (let i = 0; i < 4; i++) { const f = (t * 2.4 + i / 4) % 1; ctx.beginPath(); ctx.arc(-flip * (.4 + f * .7) * u, -(.05 + f * .18) * u, (.05 + f * .09) * u, 0, TAU); ctx.fill(); } }
  if (poseName === "stomp") { ctx.strokeStyle = "rgba(255,240,160,.7)"; ctx.lineWidth = Math.max(1.5, u * .03); const r = (reduce ? .5 : .35 + .3 * ((t * 3) % 1)) * u; ctx.beginPath(); ctx.ellipse(flip * .3 * u, 0, r, r * .3, 0, 0, TAU); ctx.stroke(); }
  if (e.pack?.attack === "heavySweep" && poseName === "sweep") { ctx.strokeStyle = "rgba(255,240,160,.65)"; ctx.lineWidth = Math.max(2, u * .045); ctx.beginPath(); ctx.arc(-flip * .55 * u, -(.48 * u) + bounce * u, u * .55, flip > 0 ? 2.6 : -.9, flip > 0 ? 4.2 : .55); ctx.stroke(); }
  ctx.restore();
}

// The head in its own frame at the base of the skull (hx, hy), turned to `ha`: the frill behind, the far brow horn, the skull and
// beak, the nose horn, the near brow horn and the eye.
function drawHead(ctx, A, hx, hy, ha, V, e, t, reduce, dead, lw, poseName) {
  const S = A.headScale, c = Math.cos(ha) * S, sn = Math.sin(ha) * S, H = (x, y) => [hx + x * c - y * sn, hy + x * sn + y * c];
  const mv = (p) => ctx.moveTo(p[0], -p[1]), ln = (p) => ctx.lineTo(p[0], -p[1]), qc = (a, b) => ctx.quadraticCurveTo(a[0], -a[1], b[0], -b[1]);
  const shape = (pts) => { ctx.beginPath(); mv(H(pts[0][0], pts[0][1])); for (let i = 1; i < pts.length; i++) ln(H(pts[i][0], pts[i][1])); ctx.closePath(); };
  // the frill: a broad shield rising up and back from the skull, its rim scalloped with pale knobs, two dark spots inside
  const fc = H(-.03, .22), fa = -(ha + 1.0), rx = .28, ry = .36;
  ctx.save(); ctx.translate(fc[0], -fc[1]); ctx.rotate(fa);
  ctx.fillStyle = A.knob; for (let i = 0; i < 11; i++) { const a = -Math.PI * .95 + i * Math.PI * 1.15 / 10, kx = Math.cos(a) * rx * 1.03, ky = Math.sin(a) * ry * 1.03; ctx.beginPath(); ctx.arc(kx, ky, .03, 0, TAU); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .6; ctx.stroke(); }
  const fg = ctx.createRadialGradient(0, .12, .02, 0, 0, ry); fg.addColorStop(0, A.frillInner); fg.addColorStop(.7, A.frill); fg.addColorStop(1, A.frillEdge);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,160,.55)"; ctx.lineWidth = .02; ctx.beginPath(); ctx.ellipse(0, 0, rx * .82, ry * .84, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.fillStyle = A.frillSpot; ctx.globalAlpha = .55; for (const [sx2, sy2] of [[-.08, -.12], [.09, -.1]]) { ctx.beginPath(); ctx.ellipse(sx2, sy2, .055, .08, sx2 * 2, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.restore();
  // the brow horns: long, curving forward and up out of the brow; the far one first, behind the skull, the near one over it
  const brow = (dx, dy, near) => { const b0 = H(.13 + dx, .1 + dy), b1 = H(.2 + dx, .095 + dy), mid = H(.3 + dx, .3 + dy), tip = H(.5 + dx, .4 + dy);
    ctx.beginPath(); mv(b0); qc(H(.2 + dx, .28 + dy), tip); qc(mid, b1); ctx.closePath();
    const g = ctx.createLinearGradient(b0[0], -b0[1], tip[0], -tip[1]); g.addColorStop(0, near ? A.hornBase : A.shade); g.addColorStop(.35, near ? A.horn : A.hornBase); g.addColorStop(1, near ? A.hornTip : A.horn);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); };
  brow(-.035, .03, false);
  // the lower jaw first (the skull and the upper beak overlap it), opening with the pose; the mouth's dark inside behind it
  const open = Math.max(0, Math.min(1, V.open + (dead ? .2 : 0))), jaw = open * .35;
  if (open > .05) { ctx.fillStyle = A.mouth; shape([[.1, -.05], [.36, -.055], [.34, -.07 - jaw * .5], [.12, -.1 - jaw * .2]]); ctx.fill(); }
  ctx.save(); const hinge = H(.06, -.08); ctx.translate(hinge[0], -hinge[1]); ctx.rotate(jaw); ctx.translate(-hinge[0], hinge[1]);
  shape([[.02, -.07], [.3, -.055], [.33, -.07], [.3, -.1], [.18, -.108], [.03, -.105]]); ctx.fillStyle = A.bodyDark; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.beginPath(); mv(H(.3, -.1)); qc(H(.18, -.112), H(.06, -.104)); ctx.stroke(); // only its lower edge: no line up the cheek
  // the lower beak (the predentary): a dark wedge that meets the hook
  shape([[.29, -.052], [.365, -.062], [.343, -.092], [.29, -.094]]); ctx.fillStyle = A.beak; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
  ctx.restore();
  // the skull: deep at the cheeks, the brow high behind the eye, the snout narrowing to the beak; a cheek horn at its back corner
  const skull = [[-.06, .11], [.06, .15], [.18, .13], [.29, .085], [.35, .05], [.35, -.035], [.24, -.055], [.12, -.075], [.02, -.11], [-.05, -.12], [-.09, -.02]];
  ctx.beginPath(); mv(H(...skull[0])); for (let i = 1; i <= skull.length; i++) { const a = skull[i - 1], b = skull[i % skull.length]; qc(H(...a), H((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)); } ctx.closePath();
  { const g0 = H(.15, .15), g1 = H(.15, -.12), g = ctx.createLinearGradient(g0[0], -g0[1], g1[0], -g1[1]); g.addColorStop(0, A.bodyLight); g.addColorStop(.55, A.body); g.addColorStop(1, A.bodyDark); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); }
  shape([[-.03, -.07], [-.1, -.17], [.04, -.11]]); ctx.fillStyle = A.hornBase; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
  // the upper beak: a big hooked parrot beak of dark keratin, curling down over the lower one, a pale cutting edge and a sheen on top
  ctx.beginPath(); mv(H(.3, .058)); qc(H(.39, .058), H(.412, -.01)); qc(H(.412, -.058), H(.385, -.072)); qc(H(.382, -.05), H(.352, -.046)); ln(H(.31, -.04)); qc(H(.29, .015), H(.3, .07)); ctx.closePath();
  { const g0 = H(.35, .07), g1 = H(.38, -.08), g = ctx.createLinearGradient(g0[0], -g0[1], g1[0], -g1[1]); g.addColorStop(0, A.beakLight); g.addColorStop(.45, A.beak); g.addColorStop(1, A.outline); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,236,190,.55)"; ctx.lineWidth = lw * 1.1; ctx.lineCap = "round"; ctx.beginPath(); mv(H(.325, .044)); qc(H(.385, .042), H(.398, -.002)); ctx.stroke();
  ctx.strokeStyle = "rgba(255,236,190,.4)"; ctx.lineWidth = lw * .8; ctx.beginPath(); mv(H(.386, -.066)); qc(H(.38, -.052), H(.358, -.047)); ctx.stroke();
  // the mouth: a short, gentle line back from the beak's corner, content (the ridden Silly Goose's turns up a little at its end)
  { const silly = e.mountView && e.triceratopsDisposition === "silly"; ctx.strokeStyle = A.outline; ctx.lineWidth = lw * 1.2; ctx.lineCap = "round"; ctx.beginPath(); mv(H(.31, -.046)); qc(H(.25, -.058), H(.19, silly ? -.05 : -.056)); ctx.stroke(); ctx.lineCap = "butt"; }
  { const p = H(.275, .03); ctx.fillStyle = A.outline; ctx.beginPath(); ctx.ellipse(p[0], -p[1], .017, .01, -ha, 0, TAU); ctx.fill(); }
  // the Silly Goose, ridden, pokes out its tongue
  if (e.mountView && e.triceratopsDisposition === "silly" && !dead) { const wag = reduce ? 0 : .015 * Math.sin(t * 6); ctx.beginPath(); mv(H(.34, -.08)); qc(H(.4, -.085 + wag), H(.425, -.115 + wag)); qc(H(.4, -.135 + wag), H(.355, -.105)); ctx.closePath(); ctx.fillStyle = A.tongue; ctx.fill(); ctx.strokeStyle = A.mouth; ctx.lineWidth = lw * .7; ctx.stroke(); }
  // the nose horn: short and blunt
  { const b0 = H(.225, .09), b1 = H(.29, .072), tip = H(.31, .2); ctx.beginPath(); mv(b0); qc(H(.25, .17), tip); qc(H(.31, .13), b1); ctx.closePath(); const g = ctx.createLinearGradient(b0[0], -b0[1], tip[0], -tip[1]); g.addColorStop(0, A.hornBase); g.addColorStop(1, A.hornTip); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); }
  brow(0, 0, true);
  // the Horn Shot: a glint on the tips as the wind-up aims them, then the release's flash and streaks off the tips
  const hp = e.mountView ? e.mountHornPose : null, hk = triceratopsHornAmount(hp);
  if (hk > 0 && hp.phase === "windup") { /* the release's flash is drawn with the shot itself, where it leaves the horns (combat-visuals.ts) */ const tp = H(.5, .4), ta = Math.atan2(.4 - .3, .5 - .3) + ha, tx = tp[0], ty = -tp[1], r = hp.phase === "horn" ? .2 * hk : .06 + (reduce ? 0 : .02 * Math.sin(t * 30));
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 1.6); g.addColorStop(0, `rgba(255,252,230,${(.95 * hk).toFixed(3)})`); g.addColorStop(.4, `rgba(255,236,170,${(.6 * hk).toFixed(3)})`); g.addColorStop(1, "rgba(255,220,140,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r * 1.6, 0, TAU); ctx.fill();
    if (hp.phase === "horn") { ctx.strokeStyle = `rgba(255,246,210,${(.85 * hk).toFixed(3)})`; ctx.lineWidth = lw * 1.4; ctx.lineCap = "round"; for (const d of [-.25, 0, .25]) { const a = ta + d; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * r * .5, ty - Math.sin(a) * r * .5); ctx.lineTo(tx + Math.cos(a) * r * 2.2, ty - Math.sin(a) * r * 2.2); ctx.stroke(); } ctx.lineCap = "butt"; } }
  // the eye: big, round and bright, a brow ridge over it; narrowed while it attacks, crossed out in death
  const ep = H(.12, .045), ex = ep[0], ey = -ep[1], angry = !!e.pack?.attack;
  if (dead) { ctx.strokeStyle = A.pupil; ctx.lineWidth = lw * 1.4; ctx.beginPath(); ctx.moveTo(ex - .02, ey - .02); ctx.lineTo(ex + .02, ey + .02); ctx.moveTo(ex - .02, ey + .02); ctx.lineTo(ex + .02, ey - .02); ctx.stroke(); return; }
  ctx.fillStyle = A.eye; ctx.beginPath(); ctx.ellipse(ex, ey, .036, .031, -ha, 0, TAU); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
  ctx.fillStyle = A.pupil; ctx.beginPath(); ctx.arc(ex + .008, ey + .002, .02, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex + .001, ey - .009, .007, 0, TAU); ctx.fill();
  // the brow ridge over it: a soft arch while calm, drawn down over the eye while it attacks
  if (angry) { const l0 = H(.075, .08), l1 = H(.17, .075); ctx.fillStyle = A.bodyDark; ctx.beginPath(); mv(H(.07, .095)); qc(H(.12, .11), H(.175, .085)); ln(l1); qc(H(.12, .05), l0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke(); }
  else { ctx.strokeStyle = A.outline; ctx.lineWidth = lw * 1.2; ctx.lineCap = "round"; ctx.beginPath(); mv(H(.08, .085)); qc(H(.12, .105), H(.165, .085)); ctx.stroke(); ctx.lineCap = "butt"; }
  void poseName;
}
