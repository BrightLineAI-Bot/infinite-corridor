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
  stride: .14, settle: 6, ease: 10, strikeEase: 18,
  landMs: 380, lean: .12, tailBounce: .08, quietBounce: .05,
  // the face's squat beak (Tim, 2026-11-19: "its beak portion is still too long; it needs to be a little bit more squat"): in front of
  // `from` (head units, just ahead of the brow horns' roots) the snout is drawn `k` as long and, toward the beak, up to `deep` as deep
  // about the mouth line `mid`. Every form, both views (Close View reads it too); the brow horns are not moved.
  muzzle: Object.freeze({ from: .2, k: .82, deep: 1.12, mid: -.01, ramp: .12 }),
  // the ridden frill (Tim, 2026-11-19: the rider "mid-back, just behind / almost between the shoulder blades ... I just don't want him to
  // clip into the frill. If needed, make the frill not so large, or angle it a little"): `size` of the wild one's, set `fwd` forward on
  // the skull (head units; and `pull` x the head's pull back in the horn release, so it rides forward on the skull) and tipped forward (more upright) `tilt` radians, further by `follow` x how far the head comes up nose first
  // (`recoil` x the horn release's), so it never sweeps back into the rider. The ridden mount only (e.mountView); both views agree
  // (close-view-beast-triceratops.ts TRICERATOPS_RIG.riddenFrill).
  riddenFrill: Object.freeze({ size: .85, fwd: .04, pull: 1, tilt: .3, follow: 1.4, recoil: 3 }),
  whirlSpin: 34, whirl: Object.freeze({ bands: 3, steps: 30, turns: 2.2, front: .78, back: -.55, radius: .46, tip: .04, width: .035 }), // the drill's whirlwind (back: tiles past the tail tip)
});
// The standard view's legs (Tim, 2026-11-20: "The feet detach from the legs when he moves and walks, and the legs look like pillars
// instead of real Triceratops legs"): jointed legs, each drawn as one shape from the joint to the foot, driven by one pose per leg.
// cycle: body units travelled per gait cycle (x the form's leg); duty: the share of it a foot stays planted (it moves back exactly as
// fast as the body moves on, so it never slides); lift: the swinging foot's height (x leg); toeDrop / tuckToes: the toes hanging as
// the foot lifts or the legs fold (radians); soft: the share of its full length a leg reaches before the lower bone stretches (up to
// `stretch`); phase: each foot's place in the cycle (a four-beat walk: near hind, near fore, far hind, far fore); far: where the far
// legs sit. hind / fore (body units; x leg for the bones, x the form's leg and leg thickness for the foot, x legW for the widths):
// upper / lower bone, x: the foot's rest place ahead of the joint, top: how far the shape starts inside the body, w: [front, back]
// half widths at the joint, mid upper bone, knee or elbow, mid lower bone and ankle; foot: h (height), toe (ahead of the ankle), heel
// (behind it), nail (radius); nails: how many show.
export const TRI_LEGS = Object.freeze({
  cycle: .448, duty: .62, lift: .09, toeDrop: .5, tuckToes: .7, soft: .95, stretch: 1.12,
  phase: Object.freeze({ nearHind: 0, nearFore: .25, farHind: .5, farFore: .75 }),
  far: Object.freeze({ jointHind: .05, jointFore: .045, jointUp: .03, footHind: .06, footFore: .05, up: .03 }),
  hind: Object.freeze({ upper: .27, lower: .25, x: .03, top: .06, nails: 3,
    w: Object.freeze([[.17, .15], [.16, .13], [.1, .095], [.085, .08], [.076, .07]].map(Object.freeze)), foot: Object.freeze({ h: .065, toe: .135, heel: .08, nail: .022 }) }),
  fore: Object.freeze({ upper: .24, lower: .22, x: .02, top: .05, nails: 3,
    w: Object.freeze([[.12, .12], [.11, .115], [.08, .095], [.072, .066], [.064, .058]].map(Object.freeze)), foot: Object.freeze({ h: .058, toe: .115, heel: .07, nail: .02 }) }),
});
// The face's outline in head units before the squat muzzle (drawHead's H; Tim, 2026-11-19: "the tip of the beak is kind of hanging
// off; it's not connected"): the skull, the upper beak (a path: [x, y] a point, [cx, cy, x, y] a curve) whose hook curls down at the
// front, and the lower beak, tucked up under the upper beak with its point inside the hook, so the two meet with no gap (it opens with
// the jaw). Every form, both directions.
export const TRI_BEAK = Object.freeze({
  skull: Object.freeze([[-.06, .11], [.06, .15], [.18, .13], [.29, .085], [.35, .05], [.35, -.035], [.24, -.055], [.12, -.075], [.02, -.11], [-.05, -.12], [-.09, -.02]].map(Object.freeze)),
  upper: Object.freeze([[.3, .058], [.39, .058, .412, -.01], [.412, -.058, .385, -.072], [.382, -.05, .352, -.046], [.31, -.04], [.29, .015, .3, .07]].map(Object.freeze)),
  lower: Object.freeze([[.285, -.036], [.372, -.044], [.386, -.066], [.362, -.09], [.29, -.096]].map(Object.freeze)),
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
  rest: { crouch: 1, head: -.5, tuck: .85, open: .12, tailUp: -.1 }, // lying down, sick (the hatchling's mother at the Beast Hotel: e.resting)
  restWell: { crouch: 1, head: .08, tuck: .85, tailUp: .05 }, // lying down, well again, head up
});
// The hatchling's growth forms (hatchling.ts; Tim, 2026-11-19) on the same rig, by multipliers of the adult's proportions. baby: a real
// Triceratops scaled down and only mildly juvenile (a modestly bigger head, eyes a touch larger, a short squat beak, small horn nubs,
// a small frill set back off the skull) on a short chubby body and stubby legs; young: in his prime, a little bulkier with thick legs, the horns and frill more prominent. Any actor without
// `triForm` (the herds, the mount) keeps exactly the adult's numbers (TRI_FORM_ADULT).
// head: the head's scale; leg: leg bone lengths and the hip's height; legW: leg and haunch thickness; girth: body depth; length: the
// spine; frill: its size; brow / nose: horn length from its base; eye: the eye's size; cheek: a soft pink cheek (0 none); snout: the face
// in front of the eye shortened toward it (a round baby face, a small beak); jugal: the cheek horn's size; lift / nod: the head carried
// higher (body units) and nose up (radians) in the standard view (Close View: TRICERATOPS_RIG.formHeadLift).
export const TRI_FORM_ADULT = Object.freeze({ head: 1, leg: 1, legW: 1, girth: 1, length: 1, frill: 1, brow: 1, nose: 1, eye: 1, cheek: 0, snout: 1, jugal: 1, lift: 0, nod: 0 });
export const TRI_FORMS = Object.freeze({
  // Tim, 2026-11-19 (size pass) kept the body and size; face pass ("its eyes are too big ... It should look more like a Triceratops,
  // just smaller, just a little bit cuter"): a young animal, not a cartoon mascot. No pink cheek, near-adult eyes.
  baby: Object.freeze({ head: 1.25, leg: .74, legW: 1.35, girth: 1.22, length: .62, frill: .45, brow: .25, nose: .42, eye: 1.15, cheek: 0, snout: .68, jugal: .5, lift: .05, nod: .1 }),
  young: Object.freeze({ head: 1.06, leg: 1.04, legW: 1.22, girth: 1.08, length: 1, frill: 1.14, brow: 1.32, nose: 1.35, eye: 1.05, cheek: 0, snout: 1, jugal: 1, lift: 0, nod: 0 }),
});
export const triForm = (e) => TRI_FORMS[e?.triForm] || TRI_FORM_ADULT;
const scl = (v, c, k) => k === 1 ? v : c + (v - c) * k; // a horn point scaled about its base (exactly the adult's at 1)
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
  if (e?.resting) return e.resting === "well" ? "restWell" : "rest";
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
const LP = new Float64Array(9), LC = new Float64Array(20), LO = new Float64Array(20), LF = new Float64Array(14), OV = new Float64Array(TRI_KEYS.length);
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

export function drawTriceratopsBody(ctx, q, now = 0) {
  const A = TRI_ART, { k, u, flip, e } = q, FM = triForm(e), reduce = !!e.reduceMotion, t = reduce ? 0 : now / 1000, M = memo(e, now);
  const air = Math.max(0, Number(e.mountAir) || 0), dead = !!e.dead || e.hp <= 0 && e.maxHp > 0;
  // movement: a gait phase from the distance travelled (the leap's lift taken back out of the ridden mount's drawn y)
  const x = Number(e.x) || 0, y = (Number(e.y) || 0) + air, dt = M.at == null ? 0 : Math.min(.1, Math.max(0, (now - M.at) / 1000)), moved = M.x == null ? 0 : Math.hypot(x - M.x, y - M.y);
  M.at = now; M.x = x; M.y = y;
  const LG = TRI_LEGS, cyc = LG.cycle * FM.leg, legK = (FM.leg + FM.legW) / 2; // the gait's cycle in body units (a tile is max(.6, scale) body units)
  if (dt > 0 && moved < 2) { M.phase = (M.phase + TAU * moved / (cyc * Math.max(.6, Number(e.scale) || 1))) % TAU; M.moving += ((moved / dt > .05 ? 1 : 0) - M.moving) * Math.min(1, dt * A.settle); }
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
  const gait = dead || e.resting ? 0 : M.moving * Math.max(0, 1 - V.tuck - V.frontLift); // the legs step whenever he travels (the charge runs), never while folded
  const bounce = triceratopsTailBounces(e) ? (reduce ? A.quietBounce : Math.sin(t * 20) * A.tailBounce) : 0;
  const wobble = reduce ? 0 : .02 * Math.sin(t * 1.3);

  // ---------------------------------------------------------------- the spine
  const L = A.length * FM.length / N, ih = Math.round(A.hipAt * N), is = Math.round(A.shoulderAt * N);
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
  const hipX = -.3, lift = A.hip * FM.leg - V.crouch * A.crouchDrop + (moving ? Math.abs(Math.sin(ph)) * .012 : 0) - (dead || e.resting ? .22 : 0) + Math.abs(bounce) * .35; // the sweep's bounce lifts the hindquarters with the tail
  for (let i = 0; i <= N; i++) { PX[i] += hipX; PY[i] += lift; PY[i] -= PZ[i] * .4; }
  for (let i = 0; i <= N; i++) { const a = Math.max(0, i - 1), c = Math.min(N, i + 1), tx = PX[c] - PX[a], ty = PY[c] - PY[a], l = Math.hypot(tx, ty) || 1; NX[i] = -ty / l; NY[i] = tx / l;
    const sN = i / N, depth = (1 + PZ[i] * .3) * FM.girth; DT[i] = table(THICK, sN, 1) * depth; VT[i] = table(THICK, sN, 2) * depth; }

  const lean = V.lean * A.lean * u, kx = k + flip * lean;
  ctx.save(); ctx.translate(kx, q.b); ctx.save(); ctx.scale(flip * u, u);
  const lw = Math.max(1 / u, .012), mv = (xx, yy) => ctx.moveTo(xx, -yy), ln = (xx, yy) => ctx.lineTo(xx, -yy), qc = (ax, ay, bx, by) => ctx.quadraticCurveTo(ax, -ay, bx, -by);
  // the ground shadow (a leap draws it smaller and lighter: the body is already lifted by the renderer)
  if (!e.noShadow) { const sh = Math.max(.45, 1 - air * .25), gy = air / Math.max(.6, Number(e.scale) || 1); ctx.fillStyle = `rgba(4,4,6,${(.42 * sh).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(-.04, gy, .8 * sh, .15 * sh, 0, 0, TAU); ctx.fill(); }

  // ---------------------------------------------------------------- legs (TRI_LEGS)
  // Each leg is one pose: the hip (or shoulder) joint, the ankle placed by the gait, the knee (or elbow) found from the two bones, and
  // the foot hung from the ankle. The outline is drawn as one shape from the joint down the front, round the foot and back up, so the
  // foot can never part from the leg.
  const legPose = (hind, near) => { // into LP: joint, knee, ankle (x, y), the foot's tilt, the bone lengths
    const S = hind ? LG.hind : LG.fore, i = hind ? ih : is, F = LG.far;
    const jx = PX[i] - NX[i] * VT[i] * .3 + (near ? 0 : (hind ? F.jointHind : F.jointFore)), jy = PY[i] - NY[i] * VT[i] * .3 + (near ? 0 : F.jointUp);
    const l1 = S.upper * FM.leg; let l2 = S.lower * FM.leg;
    // the gait: planted for `duty` of the cycle (moving back exactly as fast as the body moves on: no sliding), then lifted and swung forward
    const p = ((ph / TAU + LG.phase[(near ? "near" : "far") + (hind ? "Hind" : "Fore")]) % 1 + 1) % 1, D = LG.duty;
    let xr, sw = 0; if (p < D) xr = cyc * (D / 2 - p); else { const s = (p - D) / (1 - D); xr = cyc * (-D / 2 + D * smooth(s)); sw = Math.sin(Math.PI * s); }
    let fx = PX[i] + S.x + (near ? 0 : (hind ? F.footHind : F.footFore)) + xr * gait, fy = (near ? 0 : F.up) + S.foot.h * legK + LG.lift * FM.leg * sw * gait, fa = -LG.toeDrop * sw * gait;
    // folded (the leap, the drill, lying down) and the forefeet raised (the rear): the ankle drawn in toward the joint, the toes hanging
    const reach = (l1 + l2) * .9;
    if (V.tuck > .01) { const bx = hind ? .1 : -.06, by = -reach * .6, w = Math.min(1, V.tuck); fx += (jx + bx * cp - by * sp - fx) * w; fy += (jy + bx * sp + by * cp - fy) * w; fa -= LG.tuckToes * w; }
    if (!hind && V.frontLift > .01) { const bx = .14, by = -reach * .55, w = Math.min(1, V.frontLift); fx += (jx + bx * cp - by * sp - fx) * w; fy += (jy + bx * sp + by * cp - fy) * w; fa -= LG.tuckToes * w; }
    // two-bone reach: a lower bone that cannot quite reach stretches a little (the knee stays soft); beyond that the foot leaves the ground with the leg
    const dx = fx - jx, dy = fy - jy, raw = Math.hypot(dx, dy) || 1e-3, ux = dx / raw, uy = dy / raw;
    if (raw > (l1 + l2) * LG.soft) l2 = Math.min(l2 * LG.stretch, raw / LG.soft - l1);
    const d = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min(raw, (l1 + l2) * .999)), a = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), bend = hind ? 1 : -1; // the knee forward, the elbow back
    LP[0] = jx; LP[1] = jy; LP[2] = jx + ux * a - uy * h * bend; LP[3] = jy + uy * a + ux * h * bend; LP[4] = jx + ux * d; LP[5] = jy + uy * d; LP[6] = fa; LP[7] = l1; LP[8] = l2;
    return LP; };
  const drawLeg = (hind, near) => {
    const S = hind ? LG.hind : LG.fore, P = legPose(hind, near), jx = P[0], jy = P[1], kx2 = P[2], ky2 = P[3], ax = P[4], ay = P[5], fa = P[6];
    const tone = near ? A.body : A.bodyDark, light = near ? A.bodyLight : A.body, W = S.w, wk = FM.legW;
    // the bones' directions and their front normals (+x side for a leg hanging down); the knee's normal halfway between
    let u1x = kx2 - jx, u1y = ky2 - jy, l = Math.hypot(u1x, u1y) || 1; u1x /= l; u1y /= l;
    let u2x = ax - kx2, u2y = ay - ky2; l = Math.hypot(u2x, u2y) || 1; u2x /= l; u2y /= l;
    let nkx = -u1y - u2y, nky = u1x + u2x; l = Math.hypot(nkx, nky) || 1; nkx /= l; nky /= l;
    const top = S.top * legK; // the leg's top starts inside the body
    const C = LC; C[0] = jx - u1x * top; C[1] = jy - u1y * top; C[2] = -u1y; C[3] = u1x; C[4] = (jx + kx2) / 2; C[5] = (jy + ky2) / 2; C[6] = -u1y; C[7] = u1x;
    C[8] = kx2; C[9] = ky2; C[10] = nkx; C[11] = nky; C[12] = (kx2 + ax) / 2; C[13] = (ky2 + ay) / 2; C[14] = -u2y; C[15] = u2x; C[16] = ax; C[17] = ay; C[18] = -u2y; C[19] = u2x;
    for (let j = 0; j < 5; j++) { const x0 = C[j * 4], y0 = C[j * 4 + 1], nx = C[j * 4 + 2], ny = C[j * 4 + 3], f = W[j][0] * wk, b = W[j][1] * wk;
      LO[j * 4] = x0 + nx * f; LO[j * 4 + 1] = y0 + ny * f; LO[j * 4 + 2] = x0 - nx * b; LO[j * 4 + 3] = y0 - ny * b; }
    // the foot in its own frame at the ankle (x forward, y up), turned by its tilt
    const ft = S.foot, fh = ft.h * legK, toe = ft.toe * legK, heel = ft.heel * legK, cf = Math.cos(fa), sf = Math.sin(fa);
    const FT = LF, put = (j, lx, ly) => { FT[j * 2] = ax + lx * cf - ly * sf; FT[j * 2 + 1] = ay + lx * sf + ly * cf; };
    put(0, toe * .55, -fh * .12); put(1, toe, -fh * .45); put(2, toe * 1.02, -fh); put(3, toe * .8, -fh); put(4, -heel * .8, -fh); put(5, -heel * 1.05, -fh); put(6, -heel, -fh * .45);
    const path = (close) => { ctx.beginPath(); if (close) mv(LO[0], LO[1]); else mv(LO[4], LO[5]); // the outline starts below the haunch
      for (let j = 1; j < 4; j++) qc(LO[j * 4], LO[j * 4 + 1], (LO[j * 4] + LO[j * 4 + 4]) / 2, (LO[j * 4 + 1] + LO[j * 4 + 5]) / 2);
      ln(LO[16], LO[17]); qc(FT[0], FT[1], FT[2], FT[3]); qc(FT[4], FT[5], FT[6], FT[7]); ln(FT[8], FT[9]); qc(FT[10], FT[11], FT[12], FT[13]); qc((FT[12] + LO[18]) / 2 - u2x * fh * .1, (FT[13] + LO[19]) / 2 - u2y * fh * .1, LO[18], LO[19]);
      for (let j = 3; j > 0; j--) qc(LO[j * 4 + 2], LO[j * 4 + 3], (LO[j * 4 + 2] + LO[j * 4 - 2]) / 2, (LO[j * 4 + 3] + LO[j * 4 - 1]) / 2);
      if (close) { qc(C[0] - u1x * top, C[1] - u1y * top, LO[0], LO[1]); ctx.closePath(); } }; // a round top, inside the haunch
    // the haunch or shoulder: a solid rounded muscle where the leg meets the body, outlined only along its lower front, the thigh (or
    // upper arm) growing out of it; the markings (Tim, 2026-11-18), darker bands of his own yellow, curve across both
    const hr = (hind ? .19 : .14) * FM.legW, cx2 = jx + (hind ? .0 : .01), cy2 = jy - (hind ? .04 : .03);
    if (near) { const g2 = ctx.createLinearGradient(cx2, -(cy2 + hr), cx2, -(cy2 - hr)); g2.addColorStop(0, light); g2.addColorStop(1, tone);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(cx2, -cy2, hr, hr * 1.25, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(cx2, -cy2, hr, hr * 1.25, 0, .15, 1.9); ctx.stroke(); }
    const g = ctx.createLinearGradient(LO[4], -LO[5], LO[6], -LO[7]); g.addColorStop(0, light); g.addColorStop(.5, tone); g.addColorStop(1, near ? A.bodyDark : A.shade);
    path(true); ctx.fillStyle = g; ctx.fill();
    if (near) { ctx.save(); ctx.beginPath(); ctx.ellipse(cx2, -cy2, hr, hr * 1.25, 0, 0, TAU); ctx.clip(); ctx.fillStyle = A.mark; ctx.globalAlpha = .8;
      for (let i = 0; i < 3; i++) { const bx = cx2 - hr * .75 + i * hr * .62, w = hr * .2; ctx.beginPath(); ctx.moveTo(bx, -cy2 - hr * 1.3); ctx.quadraticCurveTo(bx + hr * .35, -cy2, bx + hr * .05, -cy2 + hr * 1.3); ctx.lineTo(bx + hr * .05 + w, -cy2 + hr * 1.3); ctx.quadraticCurveTo(bx + hr * .35 + w, -cy2, bx + w, -cy2 - hr * 1.3); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    // the foot's darker pad, and the outline down both sides and round the foot (never across the top, inside the body)
    ctx.fillStyle = near ? A.bodyDark : A.shade; ctx.globalAlpha = .55; ctx.beginPath(); mv(LO[16], LO[17]); qc(FT[0], FT[1], FT[2], FT[3]); qc(FT[4], FT[5], FT[6], FT[7]); ln(FT[8], FT[9]); qc(FT[10], FT[11], FT[12], FT[13]); ln(LO[18], LO[19]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    path(false); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
    // blunt pale toenails along the foot's front
    ctx.fillStyle = near ? A.toe : A.hornBase; const r = ft.nail * legK;
    for (let c = 0; c < S.nails; c++) { const lx = toe * (.98 - c * .3), ly = -fh + r * .9, nx = ax + lx * cf - ly * sf, ny = ay + lx * sf + ly * cf; ctx.beginPath(); ctx.ellipse(nx, -ny, r, r * .95, -fa, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
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
  drawHead(ctx, A, hx, FM.lift ? hy + FM.lift : hy, FM.nod ? ha + FM.nod : ha, V, e, t, reduce, dead, lw, poseName, FM);
  ctx.restore();
  // a charge's dust, and the stomp's ring at the forefeet
  const dashing = e.mountView && (e.mountHornPose?.phase === "dash" || e.mountHornPose?.phase === "bash" && triceratopsHornAmount(e.mountHornPose) > .3);
  if (!reduce && dashing) { ctx.fillStyle = "rgba(185,168,136,.42)"; for (let i = 0; i < 4; i++) { const f = (t * 2.6 + i / 4) % 1; ctx.beginPath(); ctx.arc(-flip * (.2 + f * .75) * u, -(.04 + f * .2) * u, (.05 + f * .1) * u, 0, TAU); ctx.fill(); } }
  if (land > .05) { ctx.fillStyle = `rgba(185,168,136,${(.5 * land).toFixed(3)})`; for (let i = 0; i < 6; i++) { const sx = (i - 2.5) * .26, f = 1 - land; ctx.beginPath(); ctx.arc(flip * (sx + Math.sign(sx) * f * .35) * u, -(.03 + f * .12) * u, (.06 + f * .08) * u, 0, TAU); ctx.fill(); } }
  // the Silly Goose's drill: no spin of the body (Tim, 2026-11-18); a whirlwind corkscrews round him tail first, tapering to a point
  // past the tail tip (the bit). Bands in front of him strong, behind him faint; Reduced Motion holds them still.
  if (poseName === "drill") drawWhirl(ctx, A, flip, u, PY[ih] + .02, PX[0], reduce ? 0 : t * A.whirlSpin);
  if (!reduce && poseName === "charge") { ctx.fillStyle = "rgba(185,168,136,.45)"; for (let i = 0; i < 4; i++) { const f = (t * 2.4 + i / 4) % 1; ctx.beginPath(); ctx.arc(-flip * (.4 + f * .7) * u, -(.05 + f * .18) * u, (.05 + f * .09) * u, 0, TAU); ctx.fill(); } }
  if (poseName === "stomp") { ctx.strokeStyle = "rgba(255,240,160,.7)"; ctx.lineWidth = Math.max(1.5, u * .03); const r = (reduce ? .5 : .35 + .3 * ((t * 3) % 1)) * u; ctx.beginPath(); ctx.ellipse(flip * .3 * u, 0, r, r * .3, 0, 0, TAU); ctx.stroke(); }
  if (e.pack?.attack === "heavySweep" && poseName === "sweep") { ctx.strokeStyle = "rgba(255,240,160,.65)"; ctx.lineWidth = Math.max(2, u * .045); ctx.beginPath(); ctx.arc(-flip * .55 * u, -(.48 * u) + bounce * u, u * .55, flip > 0 ? 2.6 : -.9, flip > 0 ? 4.2 : .55); ctx.stroke(); }
  ctx.restore();
}

// The head in its own frame at the base of the skull (hx, hy), turned to `ha`: the frill behind, the far brow horn, the skull and
// beak, the nose horn, the near brow horn and the eye.
function drawHead(ctx, A, hx, hy, ha, V, e, t, reduce, dead, lw, poseName, FM = TRI_FORM_ADULT) {
  const S = A.headScale * FM.head, c = Math.cos(ha) * S, sn = Math.sin(ha) * S, sk = FM.snout, MZ = A.muzzle;
  // HB: the head frame with the form's shorter face (the brow horns); H: the same with the squat muzzle (the skull, beak, jaw, nose horn)
  const HB = (x, y) => { if (sk !== 1 && x > .12) x = .12 + (x - .12) * sk; return [hx + x * c - y * sn, hy + x * sn + y * c]; };
  const H = (x, y) => { if (x > MZ.from) { const w = smooth((x - MZ.from) / MZ.ramp); y = MZ.mid + (y - MZ.mid) * (1 + (MZ.deep - 1) * w); x = MZ.from + (x - MZ.from) * MZ.k; } return HB(x, y); };
  const mv = (p) => ctx.moveTo(p[0], -p[1]), ln = (p) => ctx.lineTo(p[0], -p[1]), qc = (a, b) => ctx.quadraticCurveTo(a[0], -a[1], b[0], -b[1]);
  const shape = (pts) => { ctx.beginPath(); mv(H(pts[0][0], pts[0][1])); for (let i = 1; i < pts.length; i++) ln(H(pts[i][0], pts[i][1])); ctx.closePath(); };
  // the frill: a broad shield rising up and back from the skull, its rim scalloped with pale knobs, two dark spots inside
  const RF = e.mountView ? A.riddenFrill : null, hpz = RF ? Math.max(0, -(Number(e.mountHornPose?.pitch) || 0)) : 0, hpr = RF ? Math.max(0, -(Number(e.mountHornPose?.reach) || 0)) / S : 0; // the ridden frill (TRI_ART.riddenFrill)
  const fk0 = FM.frill, fc = RF ? H(-.03 + RF.fwd + RF.pull * hpr, .22) : fk0 < 1 ? H(-.03 - .12 * (1 - fk0), .22 * (.3 + .7 * fk0)) : H(-.03, .22 * (fk0 === 1 ? 1 : .55 + .45 * fk0)), fa = -(ha + 1.0) + (RF ? RF.tilt + RF.follow * (Math.max(0, V.pitch) + Math.max(0, V.head) * .65) + RF.recoil * hpz : 0), rx = .28 * FM.frill * (RF ? RF.size : 1), ry = .36 * FM.frill * (RF ? RF.size : 1);
  ctx.save(); ctx.translate(fc[0], -fc[1]); ctx.rotate(fa);
  ctx.fillStyle = A.knob; for (let i = 0; i < 11; i++) { const a = -Math.PI * .95 + i * Math.PI * 1.15 / 10, kx = Math.cos(a) * rx * 1.03, ky = Math.sin(a) * ry * 1.03; ctx.beginPath(); ctx.arc(kx, ky, FM.frill === 1 ? .03 : .03 * Math.sqrt(FM.frill), 0, TAU); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .6; ctx.stroke(); }
  const fg = ctx.createRadialGradient(0, .12, .02, 0, 0, ry); fg.addColorStop(0, A.frillInner); fg.addColorStop(.7, A.frill); fg.addColorStop(1, A.frillEdge);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,160,.55)"; ctx.lineWidth = .02; ctx.beginPath(); ctx.ellipse(0, 0, rx * .82, ry * .84, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  { const fk = FM.frill * (RF ? RF.size : 1); ctx.fillStyle = A.frillSpot; ctx.globalAlpha = .55; for (const [sx2, sy2] of [[-.08, -.12], [.09, -.1]]) { ctx.beginPath(); ctx.ellipse(sx2 * fk, sy2 * fk, .055 * fk, .08 * fk, sx2 * 2, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; } // the spots keep their place on a small frill
  ctx.restore();
  // the brow horns: long, curving forward and up out of the brow; the far one first, behind the skull, the near one over it
  const bk = FM.brow, bx0 = .165, by0 = .1, brow = (dx, dy, near) => { const b0 = HB(.13 + dx, .1 + dy), b1 = HB(.2 + dx, .095 + dy), mid = HB(scl(.3, bx0, bk) + dx, scl(.3, by0, bk) + dy), tip = HB(scl(.5, bx0, bk) + dx, scl(.4, by0, bk) + dy);
    ctx.beginPath(); mv(b0); qc(HB(scl(.2, bx0, bk) + dx, scl(.28, by0, bk) + dy), tip); qc(mid, b1); ctx.closePath();
    const g = ctx.createLinearGradient(b0[0], -b0[1], tip[0], -tip[1]); g.addColorStop(0, near ? A.hornBase : A.shade); g.addColorStop(.35, near ? A.horn : A.hornBase); g.addColorStop(1, near ? A.hornTip : A.horn);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); };
  brow(-.035, .03, false);
  // the lower jaw first (the skull and the upper beak overlap it), opening with the pose; the mouth's dark inside behind it
  const open = Math.max(0, Math.min(1, V.open + (dead ? .2 : 0))), jaw = open * .35;
  if (open > .05) { ctx.fillStyle = A.mouth; shape([[.1, -.05], [.36, -.055], [.34, -.07 - jaw * .5], [.12, -.1 - jaw * .2]]); ctx.fill(); }
  ctx.save(); const hinge = H(.06, -.08); ctx.translate(hinge[0], -hinge[1]); ctx.rotate(jaw); ctx.translate(-hinge[0], hinge[1]);
  shape([[.02, -.07], [.3, -.055], [.33, -.07], [.3, -.1], [.18, -.108], [.03, -.105]]); ctx.fillStyle = A.bodyDark; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.beginPath(); mv(H(.3, -.1)); qc(H(.18, -.112), H(.06, -.104)); ctx.stroke(); // only its lower edge: no line up the cheek
  // the lower beak (the predentary): a dark wedge tucked up under the upper beak, its point inside the hook (TRI_BEAK)
  shape(TRI_BEAK.lower); ctx.fillStyle = A.beak; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
  ctx.restore();
  // the skull: deep at the cheeks, the brow high behind the eye, the snout narrowing to the beak; a cheek horn at its back corner
  const skull = TRI_BEAK.skull;
  ctx.beginPath(); mv(H(...skull[0])); for (let i = 1; i <= skull.length; i++) { const a = skull[i - 1], b = skull[i % skull.length]; qc(H(...a), H((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)); } ctx.closePath();
  { const g0 = H(.15, .15), g1 = H(.15, -.12), g = ctx.createLinearGradient(g0[0], -g0[1], g1[0], -g1[1]); g.addColorStop(0, A.bodyLight); g.addColorStop(.55, A.body); g.addColorStop(1, A.bodyDark); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); }
  { const jk = FM.jugal; shape([[-.03, -.07], [scl(-.1, -.005, jk), scl(-.17, -.09, jk)], [.04, -.11]]); } ctx.fillStyle = A.hornBase; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
  // the upper beak: a big hooked parrot beak of dark keratin, curling down over the lower one, a pale cutting edge and a sheen on top
  ctx.beginPath(); for (const c of TRI_BEAK.upper) { if (c.length === 2) (c === TRI_BEAK.upper[0] ? mv : ln)(H(c[0], c[1])); else qc(H(c[0], c[1]), H(c[2], c[3])); } ctx.closePath();
  { const g0 = H(.35, .07), g1 = H(.38, -.08), g = ctx.createLinearGradient(g0[0], -g0[1], g1[0], -g1[1]); g.addColorStop(0, A.beakLight); g.addColorStop(.45, A.beak); g.addColorStop(1, A.outline); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,236,190,.55)"; ctx.lineWidth = lw * 1.1; ctx.lineCap = "round"; ctx.beginPath(); mv(H(.325, .044)); qc(H(.385, .042), H(.398, -.002)); ctx.stroke();
  ctx.strokeStyle = "rgba(255,236,190,.4)"; ctx.lineWidth = lw * .8; ctx.beginPath(); mv(H(.386, -.066)); qc(H(.38, -.052), H(.358, -.047)); ctx.stroke();
  // the mouth: a short, gentle line back from the beak's corner, content (the ridden Silly Goose's turns up a little at its end)
  { const silly = e.mountView && e.triceratopsDisposition === "silly"; ctx.strokeStyle = A.outline; ctx.lineWidth = lw * 1.2; ctx.lineCap = "round"; ctx.beginPath(); mv(H(.31, -.046)); qc(H(.25, -.058), H(.19, silly ? -.05 : -.056)); ctx.stroke(); ctx.lineCap = "butt"; }
  { const p = H(.275, .03); ctx.fillStyle = A.outline; ctx.beginPath(); ctx.ellipse(p[0], -p[1], .017, .01, -ha, 0, TAU); ctx.fill(); }
  // the Silly Goose, ridden, pokes out its tongue
  if (e.mountView && e.triceratopsDisposition === "silly" && !dead) { const wag = reduce ? 0 : .015 * Math.sin(t * 6); ctx.beginPath(); mv(H(.34, -.08)); qc(H(.4, -.085 + wag), H(.425, -.115 + wag)); qc(H(.4, -.135 + wag), H(.355, -.105)); ctx.closePath(); ctx.fillStyle = A.tongue; ctx.fill(); ctx.strokeStyle = A.mouth; ctx.lineWidth = lw * .7; ctx.stroke(); }
  // the nose horn: short and blunt
  { const nk = FM.nose, b0 = H(.225, .09), b1 = H(.29, .072), tip = H(scl(.31, .2575, nk), scl(.2, .081, nk)); ctx.beginPath(); mv(b0); qc(H(scl(.25, .2575, nk), scl(.17, .081, nk)), tip); qc(H(scl(.31, .2575, nk), scl(.13, .081, nk)), b1); ctx.closePath(); const g = ctx.createLinearGradient(b0[0], -b0[1], tip[0], -tip[1]); g.addColorStop(0, A.hornBase); g.addColorStop(1, A.hornTip); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke(); }
  brow(0, 0, true);
  // the Horn Shot: a glint on the tips as the wind-up aims them, then the release's flash and streaks off the tips
  const hp = e.mountView ? e.mountHornPose : null, hk = triceratopsHornAmount(hp);
  if (hk > 0 && hp.phase === "windup") { /* the release's flash is drawn with the shot itself, where it leaves the horns (combat-visuals.ts) */ const tp = HB(.5, .4), ta = Math.atan2(.4 - .3, .5 - .3) + ha, tx = tp[0], ty = -tp[1], r = hp.phase === "horn" ? .2 * hk : .06 + (reduce ? 0 : .02 * Math.sin(t * 30));
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 1.6); g.addColorStop(0, `rgba(255,252,230,${(.95 * hk).toFixed(3)})`); g.addColorStop(.4, `rgba(255,236,170,${(.6 * hk).toFixed(3)})`); g.addColorStop(1, "rgba(255,220,140,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r * 1.6, 0, TAU); ctx.fill();
    if (hp.phase === "horn") { ctx.strokeStyle = `rgba(255,246,210,${(.85 * hk).toFixed(3)})`; ctx.lineWidth = lw * 1.4; ctx.lineCap = "round"; for (const d of [-.25, 0, .25]) { const a = ta + d; ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * r * .5, ty - Math.sin(a) * r * .5); ctx.lineTo(tx + Math.cos(a) * r * 2.2, ty - Math.sin(a) * r * 2.2); ctx.stroke(); } ctx.lineCap = "butt"; } }
  // the eye: big, round and bright, a brow ridge over it; narrowed while it attacks, crossed out in death
  const ep = H(.12, .045), ex = ep[0], ey = -ep[1], angry = !!e.pack?.attack;
  if (dead) { ctx.strokeStyle = A.pupil; ctx.lineWidth = lw * 1.4; ctx.beginPath(); ctx.moveTo(ex - .02, ey - .02); ctx.lineTo(ex + .02, ey + .02); ctx.moveTo(ex - .02, ey + .02); ctx.lineTo(ex + .02, ey - .02); ctx.stroke(); return; }
  const ek = FM.eye;
  if (FM.cheek > 0) { const cp = H(.17, -.03); ctx.fillStyle = "rgba(255,140,150,.45)"; ctx.beginPath(); ctx.ellipse(cp[0], -cp[1], .045, .028, -ha, 0, TAU); ctx.fill(); } // the baby's soft pink cheek
  ctx.fillStyle = A.eye; ctx.beginPath(); ctx.ellipse(ex, ey, .036 * ek, .031 * ek, -ha, 0, TAU); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke();
  ctx.fillStyle = A.pupil; ctx.beginPath(); ctx.arc(ex + .008 * ek, ey + .002 * ek, .02 * ek, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex + .001 * ek, ey - .009 * ek, .007 * ek, 0, TAU); ctx.fill();
  if (ek > 1.3) { ctx.beginPath(); ctx.arc(ex + .014 * ek, ey + .008 * ek, .0035 * ek, 0, TAU); ctx.fill(); } // a second glint: big shiny baby eyes
  // the brow ridge over it: a soft arch while calm, drawn down over the eye while it attacks
  const rl = (ek - 1) * .035; // a big eye lifts the brow ridge over it
  if (angry) { const l0 = H(.075, .08 + rl), l1 = H(.17, .075 + rl); ctx.fillStyle = A.bodyDark; ctx.beginPath(); mv(H(.07, .095 + rl)); qc(H(.12, .11 + rl), H(.175, .085 + rl)); ln(l1); qc(H(.12, .05 + rl), l0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .8; ctx.stroke(); }
  else { ctx.strokeStyle = A.outline; ctx.lineWidth = lw * 1.2; ctx.lineCap = "round"; ctx.beginPath(); mv(H(.08, .085 + rl)); qc(H(.12, .105 + rl), H(.165, .085 + rl)); ctx.stroke(); ctx.lineCap = "butt"; }
  void poseName;
}

// The drill's whirlwind in body units at (0, 0) = the feet, y up drawn as -y: `bands` helices round the long axis at height cy, from
// `front` back to `back` past the tail tip (tx), each split into segments drawn bright where they pass in front of him.
function drawWhirl(ctx, A, flip, u, cy, tx, spin) {
  const W = A.whirl, end = tx + W.back; ctx.lineCap = "round";
  for (let k = 0; k < W.bands; k++) {
    let px = 0, py = 0;
    for (let i = 0; i <= W.steps; i++) {
      const f = i / W.steps, x = W.front + (end - W.front) * f, ang = spin + k * Math.PI * 2 / W.bands + f * W.turns * Math.PI * 2;
      const r = W.tip + (W.radius - W.tip) * Math.min(1, Math.max(0, (x - end) / (tx + .35 - end))), X = flip * x * u, Y = -(cy + Math.cos(ang) * r) * u;
      if (i) { const front = Math.sin(ang) > 0, a = (front ? .78 : .22) * (1 - f * .45); ctx.strokeStyle = `rgba(246,236,210,${a.toFixed(3)})`; ctx.lineWidth = Math.max(1.2, u * W.width * (front ? 1 : .6) * (1 - f * .5));
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(X, Y); ctx.stroke(); }
      px = X; py = Y;
    }
  }
  ctx.lineCap = "butt";
}
