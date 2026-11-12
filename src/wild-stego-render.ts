// The Wild Stegosaurus's standard-view body (Tim, 2026-11-12, for his kid: "threatening for sure"). Drawing only: nothing here
// changes combat state. It reads the pose contract the gameplay sets (docs: the stego spec): e.stegoPose, stegoAir, stegoRoll,
// stegoSwim, stegoTail, stegoTree, stegoPlates, stegoClimb and stegoClimbDir, and follows those flags, never attack timing.
//
// The body is one bending spine, from the tail tip to the back of the skull, sampled at STEGO_ART.spine points. Every pose is a
// set of numbers (STEGO_POSES) that bend that spine (tail up or over, neck down to graze, the whole curl into the wheel), pitch it
// about the hips or shoulders (rear, buck, climb), and place the four feet. Two staggered rows of plates stand on its dorsal edge,
// four spikes on the tail, a small toothed beak and a yellow eye at the front.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). `now` (ms) drives the gait.

const TAU = Math.PI * 2;
export const STEGO_ART = Object.freeze({
  // colours (spec): mostly blue, light-blue plate stripes, dark-blue accents, a lighter belly, fierce yellow eyes
  body: "#2f6fd6", bodyLight: "#4f8ff0", bodyDark: "#163a7a", outline: "#0c2556", belly: "#6f9fe6", plate: "#2f6fd6", plateFar: "#24569f",
  plateStripe: "#a9dcff", spike: "#d8eeff", spikeBase: "#5d86c8", claw: "#e9f2ff", eye: "#ffd21f", eyeGlow: "#fff3a0", pupil: "#140a00",
  mouth: "#3a0c18", tooth: "#f4f8ff", flesh: "#c8455a", fleshDark: "#7a1c2c", bark: "#5a3d22", barkDark: "#3a2614", leaf: "#2f6b3a", leafDark: "#1d4a27", dirt: "#4a3a28",
  water: "#bfe6ff", waterDeep: "#163a7a", dust: "#b9a888",
  // shape, in body units (u: a tile times the actor's scale)
  spine: 32, length: 1.74, hipAt: .47, shoulderAt: .7, neckAt: .78, hip: .74, crouchDrop: .16,
  thigh: .34, shin: .33, upperArm: .25, foreArm: .24, foot: .045,
  plates: 8, plateMax: .38, plateLean: .24, plateFrom: .2, plateTo: .83, cutAt: .22, spikeLen: .34, headLen: .27,
  wheelCurl: .93, wheelHeight: .78, climbLift: .55, stride: .15, settle: 6, ease: 11, swimEase: 3,
});
// How each contract pose bends the body. pitch (+ nose up; about the hips, or the shoulders when nose down), head (+ raises the
// neck), reach (neck stretched forward), open (jaw), crouch, tailUp (+ curls up and over the back), tailSide (lateral swing, +
// to its left), tailReach (the slam: on over the back and down in front), curl (the wheel), frontLift (forefeet off the ground),
// clawNear / clawFar (a forepaw raked forward), kick (hind legs thrown back), tuck (legs folded under), flare (plates lit), tree
// (the angle of a wielded tree in the jaws, radians from the snout's line).
export const STEGO_POSES = Object.freeze({
  idle: {}, walk: {},
  graze: { head: -1.05, reach: .2, crouch: .06, pitch: -.04, open: .25 },
  biteReady: { head: .15, reach: -.3, open: .9, crouch: .14, pitch: -.04 },
  bite: { head: -.15, reach: .55, open: .05, pitch: -.1, crouch: .06 },
  tailReady: { tailSide: -.75, tailUp: .2, crouch: .06 },
  tailL: { tailSide: 1.05, tailUp: .12, head: .1 },
  tailR: { tailSide: -1.05, tailUp: .12, head: .1 },
  tailRaise: { tailUp: 1, tailReach: .45, pitch: -.05, head: -.2, crouch: .1 },
  tailSlam: { tailUp: 1, tailReach: 1, pitch: -.14, crouch: .24, head: -.35 },
  curl: { curl: .55, crouch: .12 }, roll: { curl: 1 }, uncurl: { curl: .3, crouch: .08 },
  launch: { crouch: .3, flare: 1, head: -.35, pitch: -.06, open: .5 },
  whip: { tailSide: 1.25, tailUp: .35, pitch: .04, head: .15, open: .4, flare: .4 },
  clawL: { clawFar: 1, pitch: .1, head: .1, open: .5 },
  clawR: { clawNear: 1, pitch: .1, head: .1, open: .5 },
  rear: { pitch: .78, frontLift: 1, head: .45, open: .7 },
  swipeL: { pitch: .64, frontLift: .6, clawFar: 1, head: .25, open: .85 },
  swipeR: { pitch: .64, frontLift: .6, clawNear: 1, head: .25, open: .85 },
  buck: { pitch: -.28, kick: 1, head: -.4, tailUp: .15 },
  crouch: { crouch: 1, pitch: -.06, head: -.25 },
  leap: { pitch: .22, tuck: 1, head: .2, open: .5, tailUp: .15 },
  land: { crouch: .75, pitch: -.12, head: -.3 },
  shake: { head: .35, reach: .1, tree: 1.6 },
  swingL: { head: .5, pitch: .12, tree: .95, open: .1 },
  swingR: { head: -.4, pitch: -.12, crouch: .22, tree: -.35, open: .1 },
  dive: { pitch: -.75, head: -.35, tuck: .4 },
  breach: { pitch: .6, head: .45, open: .8, tuck: .5 },
  climb: { pitch: 1.2, head: .35, tailUp: -.2, open: .2 },
  dazed: { head: -.55, crouch: .28, open: .35 },
  dead: { crouch: 1, head: -.6, open: .4, tuck: .7 },
});
const KEYS = ["pitch", "head", "reach", "open", "crouch", "tailUp", "tailSide", "tailReach", "curl", "frontLift", "clawNear", "clawFar", "kick", "tuck", "flare", "tree"];
// The spine's natural headings (radians, y up, tail to head) and its half thickness above and below (body units), by share s.
const HEADING = [[0, .34], [.2, .27], [.4, .15], [.47, .02], [.56, -.2], [.66, -.4], [.74, -.48], [.82, -.5], [.9, -.4], [1, -.32]];
const THICK = [[0, .022, .022], [.08, .038, .036], [.2, .06, .058], [.32, .1, .09], [.4, .16, .15], [.47, .25, .23], [.55, .27, .25], [.63, .24, .23], [.7, .19, .2], [.76, .13, .14], [.83, .085, .085], [.9, .07, .068], [.96, .072, .066], [1, .07, .06]];
function table(T, s, c) { if (s <= T[0][0]) return T[0][c]; for (let i = 1; i < T.length; i++) if (s <= T[i][0]) { const a = T[i - 1], b = T[i], f = (s - a[0]) / (b[0] - a[0]); return a[c] + (b[c] - a[c]) * f; } return T[T.length - 1][c]; }
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// Render-only memory per creature (the renderer hands paint a fresh copy of the foe each frame, so it is keyed by id), bounded.
const MEMO = new Map(), MEMO_MAX = 24;
function memo(e, now) {
  const id = e.id || "stego"; let m = MEMO.get(id);
  if (!m) { m = { phase: 0, moving: 0, at: null, x: null, y: null, roll: 0, v: Object.create(null), pose: "", since: now, sink: 0 }; MEMO.set(id, m); if (MEMO.size > MEMO_MAX) MEMO.delete(MEMO.keys().next().value); }
  return m;
}
// preallocated spine (positions y up, normals, thickness), reused every frame
const N = STEGO_ART.spine, PX = new Float64Array(N + 1), PY = new Float64Array(N + 1), PZ = new Float64Array(N + 1), TH = new Float64Array(N + 1), NX = new Float64Array(N + 1), NY = new Float64Array(N + 1), DT = new Float64Array(N + 1), VT = new Float64Array(N + 1);

export function drawWildStego(ctx, q, now = 0) {
  const A = STEGO_ART, { k, u, flip, e } = q, s0 = q.s || u, reduce = !!e.reduceMotion, t = reduce ? 0 : now / 1000, b = q.b;
  const M = memo(e, now), dead = !!e.dead || e.hp <= 0 && e.maxHp > 0;
  // movement: a gait phase from the distance actually travelled
  const x = Number(e.x) || 0, y = Number(e.y) || 0, dt = M.at == null ? 0 : Math.min(.1, Math.max(0, (now - M.at) / 1000)), moved = M.x == null ? 0 : Math.hypot(x - M.x, y - M.y);
  M.at = now; M.x = x; M.y = y;
  if (dt > 0 && moved < 2) { M.phase = (M.phase + TAU * moved / (2 * A.stride * 1.6 * Math.max(.6, Number(e.scale) || 1))) % TAU; M.moving += ((moved / dt > .05 ? 1 : 0) - M.moving) * Math.min(1, dt * A.settle); }
  if (reduce) M.moving = 0;
  const poseName = dead ? "dead" : e.stegoPose && STEGO_POSES[e.stegoPose] ? e.stegoPose : M.moving > .3 ? "walk" : "idle";
  if (poseName !== M.pose) { M.pose = poseName; M.since = now; }
  const since = (now - M.since) / 1000, P0 = STEGO_POSES[poseName], stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  // eased pose values (snappier for the bites and claws)
  const rate = /bite|claw|swipe|tail[LR]|whip|buck|Slam/.test(poseName) ? A.ease * 2 : A.ease, V = M.v;
  for (const key of KEYS) { let target = P0[key] || 0; if (stun) target += ((STEGO_POSES.dazed[key] || 0) - target) * stun; const prev = V[key]; V[key] = !Number.isFinite(prev) || !(dt > 0) || reduce ? target : prev + (target - prev) * Math.min(1, dt * rate); }
  const roll = Math.max(0, Math.min(1, Number(e.stegoRoll) || 0)), curl = Math.max(V.curl, roll), air = Math.max(0, Number(e.stegoAir) || 0) / Math.max(.6, Number(e.scale) || 1), swim = Number(e.stegoSwim) || 0;
  const climb = Math.max(0, Math.min(1, Number(e.stegoClimb) || 0)), cut = e.stegoTail === "cut", plates = Number.isFinite(Number(e.stegoPlates)) && e.stegoPlates != null ? Math.max(0, Math.min(1, Number(e.stegoPlates))) : 1;
  const tree = e.stegoTree && (e.stegoTree.phase === "pull" || e.stegoTree.phase === "swing") ? e.stegoTree : null;
  const moving = e.stegoPose && poseName !== "walk" ? 0 : M.moving, ph = M.phase;
  // the climb: facing along its climbing direction, the body pitched up the wall
  let pitch = V.pitch, climbFlip = flip;
  if (climb > 0 || poseName === "climb") { const d = e.stegoClimbDir; if (d && Math.abs(d.x) > .2) climbFlip = d.x < 0 ? -1 : 1; pitch = V.pitch * Math.max(climb, poseName === "climb" ? .6 : 0) + (d && Math.abs(d.y) > Math.abs(d.x) ? .3 * climb : 0); }
  const shake = poseName === "shake" && !reduce ? Math.sin(t * 26) * .35 : 0, chew = poseName === "graze" && !reduce ? .25 * Math.max(0, Math.sin(t * 7)) : 0;
  // a fresh bite snaps the jaw shut, a fresh claw rakes
  const snap = /bite/.test(poseName) && poseName === "bite" ? Math.max(0, 1 - since * 6) : 0;
  const swimSink = (swim === 1 && air < .03 && poseName !== "breach") || poseName === "dive" ? 1 : 0; M.sink += (swimSink - M.sink) * (reduce || !(dt > 0) ? 1 : Math.min(1, dt * A.swimEase));
  const sink = M.sink;

  // ---------------------------------------------------------------- the spine
  const L = A.length / N, ih = Math.round(A.hipAt * N), is = Math.round(A.shoulderAt * N), cs = cut ? Math.round(A.cutAt * N) : 0;
  const headingAt = (i) => { const s = i / N; let a = table(HEADING, s, 1);
    if (s < A.hipAt) { const w = (A.hipAt - s) / A.hipAt; a += -V.tailUp * 2 * smooth(w * 1.7) - V.tailReach * 1.3 * w ** 1.2 - (climb > 0 || poseName === "climb" ? 0 : Math.max(0, pitch) * .85 * Math.min(1, w * 4)) + (V.kick ? -V.kick * .2 * w : 0) + (reduce || curl > .5 ? 0 : .05 * Math.sin(t * 1.7 + s * 4) * w); }
    if (s > A.neckAt) { const w = (s - A.neckAt) / (1 - A.neckAt); a += (V.head + shake) * .95 * w; }
    const c = -TAU * A.wheelCurl * (s - .5); return a + (c - a) * smooth(curl); };
  PX[ih] = 0; PY[ih] = 0; PZ[ih] = 0;
  for (let i = ih; i < N; i++) { const a = (headingAt(i) + headingAt(i + 1)) / 2, l = L * (i / N > A.neckAt ? 1 + V.reach * .9 * (1 - curl) : 1); PX[i + 1] = PX[i] + Math.cos(a) * l; PY[i + 1] = PY[i] + Math.sin(a) * l; PZ[i + 1] = 0; }
  for (let i = ih; i > 0; i--) { const a = (headingAt(i) + headingAt(i - 1)) / 2, l = L * (1 + V.tailReach * .12); PX[i - 1] = PX[i] - Math.cos(a) * l; PY[i - 1] = PY[i] - Math.sin(a) * l; PZ[i - 1] = 0; }
  // the tail's lateral swing (to its left: away from the viewer when it faces right): a rotation about the hips' upright axis,
  // stronger toward the tip, foreshortened and shifted on screen by its depth
  if (Math.abs(V.tailSide) > 1e-3 && curl < .9) for (let i = 0; i < ih; i++) { const w = ((ih - i) / ih) ** .75, ang = V.tailSide * .85 * w * (1 - curl), dx = PX[i], c = Math.cos(ang), sn = Math.sin(ang); PX[i] = dx * c; PZ[i] = dx * sn; }
  // pose: pitch about the hips (nose up) or the shoulders (nose down), then lift into place
  const pvx = pitch >= 0 ? PX[ih] : PX[is], pvy = pitch >= 0 ? PY[ih] : PY[is], cp = Math.cos(pitch), sp = Math.sin(pitch);
  for (let i = 0; i <= N; i++) { const dx = PX[i] - pvx, dy = PY[i] - pvy; PX[i] = pvx + dx * cp - dy * sp; PY[i] = pvy + dx * sp + dy * cp; }
  let cx = 0, cy = 0; for (let i = 0; i <= N; i++) { cx += PX[i] / (N + 1); cy += PY[i] / (N + 1); }
  const lift = A.hip - V.crouch * A.crouchDrop + air + climb * A.climbLift, cw = smooth(curl);
  // the hips' natural spot is the anchor (a nose-down pose turned about the shoulders keeps them where they stand); curled, the wheel's centre
  const offX = -cx * cw, offY = lift * (1 - cw) - cy * cw + (A.wheelHeight + air) * cw - sink * (A.hip + .22);
  M.roll += (reduce ? 0 : (moved / Math.max(.2, .5 * (Number(e.scale) || 1)) + dt * 2.2) * roll); const spin = -M.roll * cw;
  const cS = Math.cos(spin), sS = Math.sin(spin), ox = cx + offX, oy = cy + offY;
  for (let i = 0; i <= N; i++) { PX[i] += offX; PY[i] += offY; if (cw > 0) { const dx = PX[i] - ox, dy = PY[i] - oy; PX[i] = ox + dx * cS - dy * sS; PY[i] = oy + dx * sS + dy * cS; } PY[i] -= PZ[i] * .4; }
  for (let i = 0; i <= N; i++) { const a = Math.max(0, i - 1), c = Math.min(N, i + 1), tx = PX[c] - PX[a], ty = PY[c] - PY[a], l = Math.hypot(tx, ty) || 1; NX[i] = -ty / l; NY[i] = tx / l; TH[i] = Math.atan2(ty, tx);
    const sN = i / N, depth = 1 + PZ[i] * .3; DT[i] = table(THICK, sN, 1) * depth; VT[i] = table(THICK, sN, 2) * depth * (1 - .45 * cw); }

  ctx.save(); ctx.translate(k, b); ctx.scale(climbFlip * u, u);
  const lw = Math.max(1 / u, .012), mv = (xx, yy) => ctx.moveTo(xx, -yy), ln = (xx, yy) => ctx.lineTo(xx, -yy), qc = (ax, ay, bx, by) => ctx.quadraticCurveTo(ax, -ay, bx, -by);
  // ---------------------------------------------------------------- ground: shadow, water
  const groundY = 0, hAir = air + climb * A.climbLift;
  if (swim !== 1 && sink < .5) { const sh = Math.max(.3, 1 - hAir * .35); ctx.fillStyle = `rgba(6,10,24,${(.38 * sh).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(-.05, 0, .72 * sh, .13 * sh, 0, 0, TAU); ctx.fill(); }
  if (swim > 0 || sink > 0) { // ripples round it on the water
    ctx.strokeStyle = "rgba(191,230,255,.55)"; ctx.lineWidth = lw * 1.2;
    for (let r = 0; r < 3; r++) { const f = reduce ? r / 3 : (t * .6 + r / 3) % 1; ctx.globalAlpha = .7 * (1 - f); ctx.beginPath(); ctx.ellipse(-.05, 0, .55 + f * .6, (.55 + f * .6) * .22, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // under the water: a dark shape gliding below the surface, the plates cutting through above it
  if (sink > .05) {
    ctx.save(); ctx.globalAlpha = .34 * sink; ctx.fillStyle = A.waterDeep; ctx.beginPath();
    for (let i = cs; i <= N; i++) { const d = table(THICK, i / N, 1) * .55; i === cs ? mv(PX[i], -.16 + d) : ln(PX[i], -.16 + d); }
    for (let i = N; i >= cs; i--) ln(PX[i], -.16 - table(THICK, i / N, 2) * .45); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-3, -4, 6, 4 + .002); ctx.clip();
  }
  // ---------------------------------------------------------------- legs
  const legs = curl < .85 && sink < .95;
  const legAt = (hind, near) => { // joint, foot target, lengths
    const i = hind ? ih : is, jx = PX[i] - NX[i] * VT[i] * .35 + (near ? 0 : (hind ? .05 : .04)), jy = PY[i] - NY[i] * VT[i] * .35 + (near ? 0 : .025);
    const l1 = (hind ? A.thigh : A.upperArm) * (1 - .55 * cw), l2 = (hind ? A.shin : A.foreArm) * (1 - .55 * cw);
    const off = (hind ? 0 : Math.PI) + (near ? 0 : Math.PI * .5), swing = Math.sin(ph + off) * moving, up = Math.max(0, Math.cos(ph + off)) * moving;
    let fx = (hind ? PX[ih] - .02 : PX[is] + .03) + (near ? 0 : (hind ? .06 : .05)) + swing * A.stride, fy = groundY + A.foot + up * .09 + (near ? 0 : .025);
    if (climb > 0 || poseName === "climb") fy = Math.max(fy, 0) + climb * A.climbLift;
    // body-frame targets for feet off the ground, turned with the body
    const rot = (bx, by) => [jx + bx * cp - by * sp, jy + bx * sp + by * cp];
    const blend = (tx, ty, w) => { fx += (tx - fx) * w; fy += (ty - fy) * w; };
    const reach = (l1 + l2) * .92, hang = air > .15 || (sink > .3 && swim !== 2);
    if (hang) { const [tx, ty] = rot(hind ? -.06 : .08, -reach); blend(tx, ty, 1); }
    if (!hind) { const lifted = Math.max(V.frontLift, near ? V.clawNear : V.clawFar); if (lifted > .01) { const c = near ? V.clawNear : V.clawFar, [tx, ty] = rot(.16 + .24 * c, -.24 + .42 * c); blend(tx, ty, Math.min(1, lifted)); } }
    if (hind && V.kick > .01) { const [tx, ty] = rot(-.48, -.2 + (near ? 0 : .06)); blend(tx, ty, V.kick); }
    if (V.tuck > .01) { const [tx, ty] = rot(hind ? .12 : -.08, -reach * .55); blend(tx, ty, V.tuck); }
    if (climb > 0 || poseName === "climb") { const c = Math.max(climb, .6), alt = reduce ? 0 : Math.sin(t * 4.2 + (hind ? Math.PI : 0) + (near ? 0 : Math.PI)) * .08, [tx, ty] = rot((hind ? -.02 : .06) + alt, -reach * .86); blend(tx, ty, c); }
    if (cw > .01) blend(ox, oy, cw);
    return { jx, jy, fx, fy, l1, l2 };
  };
  const limb = (pts, w0, w1, tone) => { ctx.fillStyle = tone; ctx.beginPath(); const n = pts.length / 2, side = [];
    for (let i = 0; i < n; i++) { const xx = pts[i * 2], yy = pts[i * 2 + 1], px = pts[Math.max(0, i - 1) * 2], py = pts[Math.max(0, i - 1) * 2 + 1], qx = pts[Math.min(n - 1, i + 1) * 2], qy = pts[Math.min(n - 1, i + 1) * 2 + 1], dx = qx - px, dy = qy - py, l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (n - 1)) / 2; side.push([xx - dy / l * w, yy + dx / l * w, xx + dy / l * w, yy - dx / l * w]); }
    mv(side[0][0], side[0][1]); for (const p of side) ln(p[0], p[1]); for (let i = side.length - 1; i >= 0; i--) ln(side[i][2], side[i][3]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke(); };
  const drawLeg = (hind, near) => {
    const { jx, jy, fx, fy, l1, l2 } = legAt(hind, near), dx = fx - jx, dy = fy - jy, d = Math.min(l1 + l2 - 1e-4, Math.max(1e-3, Math.hypot(dx, dy))), ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
    const a = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), bend = hind ? 1 : -1;
    const kx = jx + ux * a - uy * h * bend, ky = jy + uy * a + ux * h * bend, ex = jx + ux * d, ey = jy + uy * d;
    const tone = near ? A.body : A.bodyDark;
    limb([jx, jy, (jx + kx) / 2 + (hind ? .015 : 0), (jy + ky) / 2, kx, ky, (kx + ex) / 2, (ky + ey) / 2, ex, ey], hind ? .27 : .2, hind ? .13 : .11, tone);
    if (near) { ctx.fillStyle = "rgba(169,220,255,.18)"; ctx.beginPath(); ctx.ellipse(jx + (kx - jx) * .35, -(jy + (ky - jy) * .35), .05, .08, 0, 0, TAU); ctx.fill(); }
    // the foot: a broad pad with three hooked claws, raked forward when it strikes and dug into the wall when it climbs
    const fa = Math.max(V.clawNear, V.clawFar, V.frontLift) > .3 && !hind ? .9 * Math.max(near ? V.clawNear : V.clawFar, V.frontLift * .6) : climb > 0 ? pitch * .8 : 0;
    ctx.save(); ctx.translate(ex, -ey); ctx.rotate(-fa);
    ctx.fillStyle = near ? A.bodyDark : A.outline; ctx.beginPath(); ctx.ellipse(.01, 0, .065, .035, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = A.claw; for (let c = 0; c < 3; c++) { const cx2 = .03 + c * .022; ctx.beginPath(); ctx.moveTo(cx2 - .012, -.015 + c * .004); ctx.quadraticCurveTo(cx2 + .03, -.02, cx2 + .034, .03); ctx.lineTo(cx2 + .002, .008); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    return { ex, ey };
  };
  // far legs behind the body
  if (legs) { drawLeg(true, false); drawLeg(false, false); }
  // ---------------------------------------------------------------- plates and spikes
  const plateAt = (sN, far) => { const fi = sN * N, i = Math.min(N - 1, Math.floor(fi)), f = fi - i, X = PX[i] + (PX[i + 1] - PX[i]) * f, Y = PY[i] + (PY[i + 1] - PY[i]) * f, nx = NX[i] + (NX[i + 1] - NX[i]) * f, ny = NY[i] + (NY[i + 1] - NY[i]) * f, d = DT[i] + (DT[i + 1] - DT[i]) * f;
    return [X + nx * d * .78 + (far ? .015 : 0), Y + ny * d * .78 + (far ? .022 : 0), Math.atan2(ny, nx)]; };
  const plate = (sN, idx, far) => {
    if (sN < (cut ? A.cutAt + .02 : 0)) return;
    const prof = Math.max(.22, Math.sin(Math.PI * (sN - .14) / .78) ** .9), h = A.plateMax * prof * (.12 + .88 * plates) * (far ? .94 : 1), w = h * .78;
    const [X, Y, na] = plateAt(sN, far), sway = reduce ? 0 : (climb > 0 || poseName === "climb" ? .14 : .03) * Math.sin(t * 3 + idx * .7) + (sink > .5 ? .04 * Math.sin(t * 2 + idx) : 0);
    const ang = na + A.plateLean + sway; ctx.save(); ctx.translate(X, -Y); ctx.rotate(-(ang - Math.PI / 2));
    // plate frame: x along the back (forward), y up the plate (screen up is -y)
    const path = () => { ctx.beginPath(); ctx.moveTo(-w * .42, 0); ctx.quadraticCurveTo(-w * .78, -h * .58, -w * .16, -h); ctx.quadraticCurveTo(w * .62, -h * .5, w * .42, 0); ctx.closePath(); };
    const g = ctx.createLinearGradient(0, 0, 0, -h); g.addColorStop(0, far ? A.bodyDark : A.plate); g.addColorStop(1, far ? A.plateFar : A.bodyLight); path(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(); ctx.clip(); ctx.strokeStyle = A.plateStripe; ctx.globalAlpha = far ? .45 : .9; ctx.lineWidth = Math.max(1 / u, h * .07);
    for (const r of [.78, .5]) { ctx.beginPath(); ctx.moveTo(-w * .42 * r - w * .05, -h * (1 - r) * .2); ctx.quadraticCurveTo(-w * .78 * r, -h * .58 * r, -w * .16 * r - w * .02, -h * r * .95); ctx.quadraticCurveTo(w * .62 * r, -h * .5 * r, w * .42 * r + w * .05, -h * (1 - r) * .2); ctx.stroke(); }
    ctx.restore();
    if (V.flare > .05) { ctx.globalAlpha = V.flare * (reduce ? .6 : .45 + .3 * Math.sin(t * 20 + idx)); ctx.fillStyle = A.plateStripe; path(); ctx.fill(); ctx.globalAlpha = 1; }
    path(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .9; ctx.stroke();
    ctx.restore();
  };
  const NP = A.plates, sp0 = A.plateFrom, sp1 = A.plateTo, gap = (sp1 - sp0) / (NP - 1);
  for (let i = 0; i < NP - 1; i++) plate(sp0 + gap * (i + .5), i, true);
  const spike = (i, rise, len, far) => { // a tail spike off the tail near its tip, swept back and up (the thagomizer)
    const tx = PX[i + 1] - PX[i], ty = PY[i + 1] - PY[i], l = Math.hypot(tx, ty) || 1, bx = -tx / l, by = -ty / l, nx = NX[i], ny = NY[i];
    const dx = bx * Math.cos(rise) + nx * Math.sin(rise), dy = by * Math.cos(rise) + ny * Math.sin(rise), X = PX[i] + nx * DT[i] * .4, Y = PY[i] + ny * DT[i] * .4 + (far ? .02 : -.02), sl = len * (1 + PZ[i] * .3);
    const px = -dy, py = dx, wd = .042;
    ctx.fillStyle = far ? A.spikeBase : A.spike; ctx.beginPath(); mv(X + px * wd, Y + py * wd); ln(X + dx * sl, Y + dy * sl); ln(X - px * wd, Y - py * wd); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
    if (!far) { ctx.strokeStyle = A.plateStripe; ctx.lineWidth = lw; ctx.beginPath(); mv(X + dx * sl * .25, Y + dy * sl * .25); ln(X + dx * sl * .8, Y + dy * sl * .8); ctx.stroke(); }
    if (poseName === "whip" || V.flare > .3) { ctx.fillStyle = `rgba(169,220,255,${reduce ? .5 : .35 + .25 * Math.sin(t * 30)})`; ctx.beginPath(); ctx.arc(X + dx * sl, -(Y + dy * sl), .05, 0, TAU); ctx.fill(); }
  };
  if (!cut) { spike(1, 1.05, A.spikeLen * .9, true); spike(3, .85, A.spikeLen, true); }
  // ---------------------------------------------------------------- the body
  const bodyPath = () => { ctx.beginPath();
    const from = cs; mv(PX[from] + NX[from] * DT[from], PY[from] + NY[from] * DT[from]);
    for (let i = from + 1; i <= N; i++) { const ax = PX[i - 1] + NX[i - 1] * DT[i - 1], ay = PY[i - 1] + NY[i - 1] * DT[i - 1], bx2 = PX[i] + NX[i] * DT[i], by2 = PY[i] + NY[i] * DT[i]; qc(ax, ay, (ax + bx2) / 2, (ay + by2) / 2); }
    ln(PX[N] + NX[N] * DT[N], PY[N] + NY[N] * DT[N]); ln(PX[N] - NX[N] * VT[N], PY[N] - NY[N] * VT[N]);
    for (let i = N - 1; i >= from; i--) { const ax = PX[i + 1] - NX[i + 1] * VT[i + 1], ay = PY[i + 1] - NY[i + 1] * VT[i + 1], bx2 = PX[i] - NX[i] * VT[i], by2 = PY[i] - NY[i] * VT[i]; qc(ax, ay, (ax + bx2) / 2, (ay + by2) / 2); }
    ln(PX[from] - NX[from] * VT[from], PY[from] - NY[from] * VT[from]); ctx.closePath(); };
  const top = Math.max(PY[ih] + DT[ih], PY[is] + DT[is]), bot = Math.min(PY[ih] - VT[ih], PY[is] - VT[is]), grad = ctx.createLinearGradient(0, -top, 0, -bot);
  grad.addColorStop(0, A.bodyLight); grad.addColorStop(.45, A.body); grad.addColorStop(1, A.bodyDark);
  if (cw > .7) { let r = 0; for (let i = 0; i <= N; i++) r += Math.hypot(PX[i] - ox, PY[i] - oy) / (N + 1); ctx.fillStyle = A.bodyDark; ctx.globalAlpha = smooth((cw - .7) / .25); ctx.beginPath(); ctx.arc(ox, -oy, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  bodyPath(); ctx.fillStyle = grad; ctx.fill();
  ctx.save(); bodyPath(); ctx.clip();
  // the lighter belly along the underside
  ctx.fillStyle = A.belly; ctx.globalAlpha = .85; ctx.beginPath();
  for (let i = cs; i <= N; i++) { const xx = PX[i] - NX[i] * VT[i] * .3, yy = PY[i] - NY[i] * VT[i] * .3; i === cs ? mv(xx, yy) : ln(xx, yy); }
  for (let i = N; i >= cs; i--) ln(PX[i] - NX[i] * VT[i] * 1.2, PY[i] - NY[i] * VT[i] * 1.2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  // dark-blue stripes across the back and flanks, tapering down the sides
  ctx.fillStyle = A.bodyDark; ctx.globalAlpha = .78;
  for (let i = Math.max(cs + 1, 3); i < N - 3; i += 2) { const d = DT[i], w = .022 + d * .12, tx = -NY[i], ty = NX[i];
    ctx.beginPath(); mv(PX[i] + NX[i] * d * 1.1 - tx * w, PY[i] + NY[i] * d * 1.1 - ty * w); ln(PX[i] + NX[i] * d * 1.1 + tx * w, PY[i] + NY[i] * d * 1.1 + ty * w); ln(PX[i] - NX[i] * d * .25 + tx * w * .2, PY[i] - NY[i] * d * .25 + ty * w * .2); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
  // light along the back
  ctx.strokeStyle = "rgba(169,220,255,.22)"; ctx.lineWidth = .03; ctx.beginPath(); for (let i = cs + 1; i < N; i++) { const xx = PX[i] + NX[i] * DT[i] * .7, yy = PY[i] + NY[i] * DT[i] * .7; i === cs + 1 ? mv(xx, yy) : ln(xx, yy); } ctx.stroke();
  ctx.restore();
  bodyPath(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
  // the cut tail: a raw stump
  if (cut) { const X = PX[cs], Y = PY[cs], r = (DT[cs] + VT[cs]) / 2; ctx.fillStyle = A.flesh; ctx.beginPath(); ctx.ellipse(X - .005, -(Y + (DT[cs] - VT[cs]) / 2), r * .45, r * .95, -TH[cs], 0, TAU); ctx.fill(); ctx.strokeStyle = A.fleshDark; ctx.lineWidth = lw; ctx.stroke(); ctx.fillStyle = A.tooth; ctx.beginPath(); ctx.arc(X - .005, -(Y + (DT[cs] - VT[cs]) / 2), r * .18, 0, TAU); ctx.fill(); }
  // ---------------------------------------------------------------- the head
  { const X = PX[N], Y = PY[N], ha = TH[N] + V.head * .25, c = Math.cos(ha), sn = Math.sin(ha), H = (hx, hy) => [X + hx * c - hy * sn, Y + hx * sn + hy * c];
    const open = Math.max(0, Math.min(1, V.open * (1 - snap) + chew + (dead ? .2 : 0))), ja = -open * .62, jc = Math.cos(ja), js = Math.sin(ja), hingeX = .02, hingeY = -.02;
    const J = (hx, hy) => { const dx = hx - hingeX, dy = hy - hingeY; return H(hingeX + dx * jc - dy * js, hingeY + dx * js + dy * jc); };
    const poly = (f, pts) => { ctx.beginPath(); pts.forEach(([a, b2], i) => { const [px, py] = f(a, b2); i ? ln(px, py) : mv(px, py); }); ctx.closePath(); };
    // the mouth's inside, then the lower jaw with its teeth
    if (open > .05) { const pts = [H(.03, -.025), H(.245, -.02), J(.23, -.05), J(.03, -.045)]; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ln(px, py) : mv(px, py))); ctx.closePath(); ctx.fillStyle = A.mouth; ctx.fill(); }
    ctx.fillStyle = A.tooth; for (let i = 0; i < 6; i++) { const tx = .07 + i * .028; poly(J, [[tx, -.04], [tx + .016, -.04], [tx + .008, -.018]]); ctx.fill(); }
    poly(J, [[-.01, -.02], [.06, -.035], [.17, -.036], [.235, -.03], [.22, -.06], [.12, -.075], [.03, -.07]]); ctx.fillStyle = A.bodyDark; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
    // a wielded tree, held crosswise in the jaws: roots and earth behind, a tall thin crown out in front
    if (tree) { const ta = (V.tree || 1) + (poseName === "shake" && !reduce ? Math.sin(t * 26) * .35 : 0), [gx, gy] = H(.14, -.035), ca = ha + ta, dx = Math.cos(ca), dy = Math.sin(ca), Lt = 1.35;
      ctx.strokeStyle = A.barkDark; ctx.lineWidth = .028; ctx.beginPath(); for (let r = 0; r < 4; r++) { const ra = ca + Math.PI + (r - 1.5) * .45; mv(gx, gy); ln(gx + Math.cos(ra) * .14, gy + Math.sin(ra) * .14); } ctx.stroke();
      ctx.fillStyle = A.dirt; ctx.beginPath(); ctx.ellipse(gx - dx * .06, -(gy - dy * .06), .07, .05, -ca, 0, TAU); ctx.fill();
      const px = -dy, py = dx; ctx.fillStyle = A.bark; ctx.beginPath(); mv(gx + px * .035, gy + py * .035); ln(gx + dx * Lt + px * .012, gy + dy * Lt + py * .012); ln(gx + dx * Lt - px * .012, gy + dy * Lt - py * .012); ln(gx - px * .035, gy - py * .035); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.barkDark; ctx.lineWidth = lw; ctx.stroke();
      for (let l = 0; l < 4; l++) { const at = .45 + l * .2, w = .22 - l * .045, cxl = gx + dx * Lt * at, cyl = gy + dy * Lt * at; ctx.fillStyle = l % 2 ? A.leafDark : A.leaf; ctx.beginPath(); mv(cxl + px * w, cyl + py * w); ln(cxl + dx * .3, cyl + dy * .3); ln(cxl - px * w, cyl - py * w); ctx.closePath(); ctx.fill(); }
    }
    // the skull: small and low, a beak tipped dark, teeth along the upper jaw, a fierce yellow eye under a heavy brow
    poly(H, [[-.03, .055], [.04, .085], [.12, .072], [.2, .035], [.262, .002], [.245, -.022], [.17, -.03], [.06, -.03], [-.03, -.045]]);
    const hg = ctx.createLinearGradient(...[H(0, .09), H(0, -.05)].flatMap(([a, b2]) => [a, -b2])); hg.addColorStop(0, A.bodyLight); hg.addColorStop(1, A.body); ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
    poly(H, [[.2, .035], [.262, .002], [.245, -.022], [.2, -.026], [.185, .01]]); ctx.fillStyle = A.bodyDark; ctx.fill();
    ctx.fillStyle = A.tooth; for (let i = 0; i < 5; i++) { const tx = .075 + i * .028; poly(H, [[tx, -.028], [tx + .016, -.028], [tx + .008, -.05]]); ctx.fill(); }
    ctx.fillStyle = A.bodyDark; for (const [a, b2, r] of [[.0, .04, .02], [.035, .01, .016]]) { const [px, py] = H(a, b2); ctx.beginPath(); ctx.arc(px, -py, r, 0, TAU); ctx.fill(); }
    const [ex, ey] = H(.095, .032), angry = !dead && !!e.pack?.attack;
    if (dead) { ctx.strokeStyle = A.pupil; ctx.lineWidth = lw * 1.4; ctx.beginPath(); mv(ex - .018, ey - .018); ln(ex + .018, ey + .018); mv(ex - .018, ey + .018); ln(ex + .018, ey - .018); ctx.stroke(); }
    else { if (angry || stun) { ctx.fillStyle = "rgba(255,230,90,.35)"; ctx.beginPath(); ctx.arc(ex, -ey, .045, 0, TAU); ctx.fill(); }
      ctx.fillStyle = A.eye; ctx.beginPath(); ctx.ellipse(ex, -ey, .024, .019, -ha, 0, TAU); ctx.fill(); ctx.fillStyle = A.pupil; ctx.beginPath(); ctx.ellipse(ex + .004, -ey, .006, .016, -ha, 0, TAU); ctx.fill();
      ctx.fillStyle = A.eyeGlow; ctx.beginPath(); ctx.arc(ex - .008, -ey - .007, .005, 0, TAU); ctx.fill(); }
    const [b0x, b0y] = H(.055, .068), [b1x, b1y] = H(.135, .036); ctx.strokeStyle = A.outline; ctx.lineWidth = .02; ctx.lineCap = "round"; ctx.beginPath(); mv(b0x, b0y); ln(b1x, b1y); ctx.stroke(); ctx.lineCap = "butt";
    if (poseName === "graze" && !reduce) { const [gx, gy] = J(.23, -.04); ctx.strokeStyle = A.leaf; ctx.lineWidth = lw * 1.3; ctx.beginPath(); for (let i = 0; i < 4; i++) { mv(gx, gy); ln(gx + .03 + i * .015, gy - .06 + Math.sin(t * 7 + i) * .01); } ctx.stroke(); }
  }
  // near plates over the back, the near spikes, then the near legs
  for (let i = 0; i < NP; i++) plate(sp0 + gap * i, i + 20, false);
  if (V.tailUp > .45 && curl < .3) { // a tail raised over the back passes in front of the near plates
    const end = ih - 2; ctx.beginPath(); mv(PX[cs] + NX[cs] * DT[cs], PY[cs] + NY[cs] * DT[cs]);
    for (let i = cs + 1; i <= end; i++) ln(PX[i] + NX[i] * DT[i], PY[i] + NY[i] * DT[i]);
    for (let i = end; i >= cs; i--) ln(PX[i] - NX[i] * VT[i], PY[i] - NY[i] * VT[i]); ctx.closePath(); ctx.fillStyle = A.body; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = A.bodyDark; ctx.globalAlpha = .7; for (let i = cs + 1; i < end; i += 2) { ctx.beginPath(); ctx.arc(PX[i] + NX[i] * DT[i] * .3, -(PY[i] + NY[i] * DT[i] * .3), DT[i] * .35, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    if (!cut) { spike(1, 1.05, A.spikeLen * .9, true); spike(3, .85, A.spikeLen, true); } }
  if (!cut) { spike(0, .95, A.spikeLen, false); spike(2, .72, A.spikeLen * 1.05, false); }
  const feet = [];
  if (legs) { feet.push(drawLeg(true, true)); feet.push(drawLeg(false, true)); }
  // ---------------------------------------------------------------- effects drawn with the body
  if (!reduce && legs) for (const [near, c] of [[true, V.clawNear], [false, V.clawFar]]) if (c > .55 && /claw|swipe/.test(poseName)) { // the rake's trail
    const f = feet[1] && near ? feet[1] : { ex: PX[is] + .3, ey: PY[is] + .05 }; ctx.strokeStyle = `rgba(233,242,255,${(.55 * c).toFixed(3)})`; ctx.lineWidth = .016;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(f.ex - .1, -(f.ey - .05 - i * .03), .2 + i * .02, -1.1, .35); ctx.stroke(); } }
  if (poseName === "whip" && !cut) { const X = PX[0], Y = PY[0]; ctx.strokeStyle = "rgba(169,220,255,.75)"; ctx.lineWidth = .05; ctx.beginPath(); ctx.arc(PX[ih], -PY[ih], Math.hypot(X - PX[ih], Y - PY[ih]), Math.atan2(-(Y - PY[ih]), X - PX[ih]) - .9, Math.atan2(-(Y - PY[ih]), X - PX[ih]) + .2); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = .016; ctx.stroke(); }
  if (poseName === "launch" && !reduce) for (let i = 0; i < NP; i += 2) { const [X, Y] = plateAt(sp0 + gap * i, false), f = (t * 1.4 + i * .17) % 1, py = Y + .25 + f * 1.4, h = .16;
    ctx.globalAlpha = 1 - f; ctx.strokeStyle = "rgba(169,220,255,.6)"; ctx.lineWidth = .025; ctx.beginPath(); mv(X, py - .05); ln(X, py - .35); ctx.stroke();
    ctx.fillStyle = A.plate; ctx.beginPath(); mv(X - h * .3, py); ln(X, py + h); ln(X + h * .3, py); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.plateStripe; ctx.lineWidth = lw; ctx.stroke(); ctx.globalAlpha = 1; }
  if (roll > .3 && !reduce && hAir < .2) { for (let i = 0; i < 5; i++) { const f = (t * 1.8 + i / 5) % 1; ctx.fillStyle = `rgba(185,168,136,${(.45 * (1 - f) * roll).toFixed(3)})`; ctx.beginPath(); ctx.arc(-.3 - f * .7, -(.04 + f * .22), .06 + f * .1, 0, TAU); ctx.fill(); } }
  if ((climb > 0 || poseName === "climb") && !reduce) { ctx.fillStyle = "rgba(120,110,100,.8)"; for (let i = 0; i < 4; i++) { const f = (t * 1.5 + i / 4) % 1; ctx.fillRect(.2 - i * .12, -(climb * .9 - f * .8), .02, .02); } }
  if (swim === 2 && !reduce) for (const f of feet) { ctx.strokeStyle = "rgba(191,230,255,.6)"; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(f.ex, 0, .1 + ((t * 1.3) % 1) * .1, .03, 0, 0, TAU); ctx.stroke(); }
  if (poseName === "breach" && !reduce) { ctx.fillStyle = "rgba(191,230,255,.7)"; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI, f = (t * 1.6 + i * .17) % 1; ctx.beginPath(); ctx.arc(Math.cos(a) * (.3 + f * .5), -(Math.sin(a) * (.1 + f * .4)), .025, 0, TAU); ctx.fill(); } }
  if (sink > .05) { ctx.restore(); // the waterline: foam where the plates cut the surface
    ctx.strokeStyle = "rgba(220,242,255,.8)"; ctx.lineWidth = lw * 1.4; for (let i = 0; i < NP; i++) { const [X] = plateAt(sp0 + gap * i, false), w = .1 + .05 * Math.sin(i + (reduce ? 0 : t * 3)); ctx.beginPath(); ctx.ellipse(X, 0, w, w * .28, 0, Math.PI * 1.05, Math.PI * 1.95, true); ctx.stroke(); }
    ctx.strokeStyle = "rgba(191,230,255,.4)"; ctx.beginPath(); mv(PX[cs] - .1, 0); ln(PX[cs] - .9, .12); mv(PX[cs] - .1, 0); ln(PX[cs] - .9, -.12); ctx.stroke(); }
  ctx.restore();
}
