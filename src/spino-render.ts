// The Spinosaurus's standard-view body (Tim, 2026-11-12: "The Hunter of Hunters"). Drawing only: nothing here changes combat
// state. It reads the pose contract the gameplay sets (the spino spec): e.spinoPose, spinoAir (tiles), spinoGrab ({ who, phase,
// t, x?, y? }), spinoDig (0..1), spinoFossil and spinoShed (0..1), and follows those flags; the attack's own phase (windup or
// strike) only times the anticipation inside a pose.
//
// The body is one bending spine from the tail tip to the back of the skull (a chain of segments whose angles every pose bends),
// skinned with an outline of varying depth: a heavy tail, a deep chest and belly, a tall sail of spines along the back, a long
// crocodile snout full of teeth, muscular clawed arms and digitigrade legs. In flesh it is light orange, mottled and striped in
// rust and orange with a paler belly; as a fossil the same chain carries vertebrae, a ribcage, bare sail spines, limb bones and
// a skull. spinoShed blends one into the other with chunks of hide falling away.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). `now` (ms) drives the gait.

const TAU = Math.PI * 2;
export const SPINO_ART = Object.freeze({
  // colours (spec): light-orange body, dark-orange sail, rust and orange mottles and stripes, a paler belly, fierce eyes
  body: "#f2a35e", bodyLight: "#f8c084", bodyDark: "#c9773a", outline: "#4a200c", belly: "#f6c48e",
  sail: "#c4561a", sailLight: "#df7330", sailDark: "#8a3410", sailSpine: "#6a260a",
  mottle: Object.freeze(["#a8481e", "#d9772e", "#e89a50"]), stripe: "#a8481e",
  mouth: "#4a0e0e", gum: "#9a2a26", tooth: "#fff6e6", claw: "#f4ead8", clawDark: "#5a3a2a",
  eye: "#ffc61a", eyeHot: "#ff5a10", pupil: "#160600", brow: "#6a260a",
  // the fossil: bone-white and pale grey with dark joints, embers in the sockets
  bone: "#ece6d6", boneShade: "#c4beb0", boneDark: "#8f897e", joint: "#3a3430", socket: "#181412", ember: "#ff7a2a",
  dirt: "#6a4a2c", dirtLight: "#9a7a52", rock: "#5e544a", bite: "#b0101a", biteDark: "#3a0408",
  // shape, in body units (u: a tile times the actor's scale)
  hipH: .84, hipX: -.14, thigh: .36, shin: .34, meta: .15, upperArm: .2, foreArm: .18,
  trunk: Object.freeze([.22, .22, .13]), neck: Object.freeze([.12, .12, .11]), tailSeg: .16, tailN: 7, headLen: .48,
  sailH: .52, sailN: 11, headScale: 1.18, headDepth: 1.25, digHinge: .2, ploughHinge: .1, stride: .26, runStride: .4, settle: 6, ease: 10, chew: 9, shake: 34,
});

// How each contract pose bends the body. pitch (+ rears up about the hips), crouch (hips down), neck (+ raised), head (+ nose
// up), reach (neck stretched forward), open (jaw), clawL / clawR (-1 cocked high .. 1 slashed down and through), arms (both
// raised, a threat), tailSide (+ swung to its left), tailUp (+ raised), lean (body thrown forward), stride (legs spread: a
// lunge), tuck (legs drawn up in the air), dig (snout down into the ground), chew, shake (tremble), swing (head flung to the
// side: + left), ribs (fossil: rib spears out), thrust (rib spears converge forward), flare (the sail spines fanned), dirt
// (earth thrown up at the snout), run (the run cycle). A pose with `pre` is a strike: `pre` is its anticipation (the attack's
// windup), the rest its blow (the strike phase).
export const SPINO_POSES = Object.freeze({
  idle: {}, walk: {},
  bite: { neck: -.2, head: -.22, reach: .85, open: .04, pitch: -.06, lean: .08, pre: { neck: .3, head: .25, reach: -.35, open: 1, crouch: .05 } },
  clawL: { clawL: 1, pitch: -.06, lean: .12, open: .5, neck: -.12, pre: { clawL: -1, pitch: .14, neck: .12, open: .4 } },
  clawR: { clawR: 1, pitch: -.06, lean: .12, open: .5, neck: -.12, pre: { clawR: -1, pitch: .14, neck: .12, open: .4 } },
  leap: { tuck: 1, pitch: .16, neck: .22, head: .1, open: .6, tailUp: .25, pre: { crouch: .32, pitch: -.12, neck: -.12, open: .3 } },
  headSlam: { low: .7, pitch: -.28, neck: -.75, head: -.5, crouch: .2, open: .2, lean: .1, pre: { pitch: .28, neck: .6, head: .45, open: .75 } },
  plough: { low: 1, pitch: -.24, neck: -.8, head: -.5, reach: .45, crouch: .24, open: .55, lean: .16, dirt: 1 },
  dig: { low: 1, pitch: -.3, neck: -.95, head: -.75, crouch: .26, open: .3, dig: 1, tailUp: .3 },
  fling: { pitch: .12, neck: .55, head: .5, open: .85, crouch: .05, dirt: .6, pre: { low: 1, pitch: -.3, neck: -.95, head: -.75, crouch: .26, open: .3, dig: 1, tailUp: .3 } },
  roarReady: { pitch: .14, crouch: .16, neck: -.12, head: -.12, open: .3, arms: .3, tailUp: .2 },
  roar: { pitch: .46, neck: .72, head: .55, open: 1, arms: .9, tailUp: -.12, shake: 1 },
  tailL: { tailSide: 1, pitch: -.08, neck: -.1, head: .1, pre: { tailSide: -.75, pitch: -.04, neck: .1 } },
  tailR: { tailSide: -1, pitch: -.08, neck: -.1, head: .1, pre: { tailSide: .75, pitch: -.04, neck: .1 } },
  run: { pitch: -.12, lean: .08, neck: -.15, head: .05, tailUp: .12, open: .3, run: 1 },
  lunge: { pitch: -.16, lean: .2, neck: -.2, reach: .75, open: .95, stride: 1, tailUp: .2 },
  landBite: { pitch: -.26, neck: -.5, head: -.3, reach: .5, crouch: .26, open: .04, lean: .1, pre: { tuck: .6, open: 1, neck: .22, pitch: .06 } },
  grabTrack: { crouch: .18, pitch: -.08, neck: -.06, head: .06, open: .45, tailUp: .25, arms: .2 },
  grabLunge: { pitch: -.18, lean: .25, neck: -.1, reach: 1, open: 1, stride: 1, arms: .6 },
  grabHold: { pitch: .2, neck: .66, head: .32, open: .62, chew: 1, arms: .4 },
  grabThrow: { pitch: .04, neck: .2, head: -.1, swing: 1, open: .95, pre: { pitch: .26, neck: .72, head: .5, swing: -1, open: .45 } },
  boneLaunch: { pitch: .3, neck: .5, head: .4, open: .9, arms: .7, flare: 1, pre: { crouch: .2, pitch: -.1, neck: -.1, flare: .4 } },
  ribsOut: { crouch: .12, pitch: .05, open: .6, ribs: 1, arms: .5 },
  ribsThrust: { crouch: .08, pitch: -.12, lean: .15, open: .8, ribs: 1, thrust: 1, neck: -.1, pre: { crouch: .12, pitch: .05, open: .6, ribs: 1, arms: .5 } },
  dazed: { pitch: -.12, crouch: .16, neck: -.55, head: -.35, open: .5, tailUp: -.3, arms: -.3 },
  death: { pitch: -.1, crouch: .3, neck: -.6, head: -.3, open: .6, tailUp: -.4, arms: -.4 },
});
export const SPINO_POSE_KEYS = Object.freeze(["pitch", "crouch", "neck", "head", "reach", "open", "clawL", "clawR", "arms", "tailSide", "tailUp", "lean", "stride", "tuck", "dig", "low", "chew", "shake", "swing", "ribs", "thrust", "flare", "dirt", "run"]);
const NK = SPINO_POSE_KEYS.length;
// The pose vectors as flat arrays (strike and anticipation), so a frame allocates nothing.
const vec = (o) => Float64Array.from(SPINO_POSE_KEYS.map((k) => Number(o?.[k]) || 0));
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(SPINO_POSES).map(([n, p]) => [n, Object.freeze({ hit: vec(p), pre: p.pre ? vec(p.pre) : null })])));
// How far into a strike: the attack's windup is the anticipation (0), its active and recover phases the blow (1); with no attack
// clock, the time since the pose began (`sinceMs`) plays it.
export function spinoStrike(e, sinceMs) {
  const ph = e?.pack?.phase;
  if (ph === "windup") return 0;
  if (ph === "active" || ph === "recover") return 1;
  const x = Math.max(0, Math.min(1, (Number(sinceMs) || 0) / 220)); return x * x * (3 - 2 * x);
}
// The pose a frame shows, into `out` (length SPINO_POSE_KEYS): the named pose (or idle), its anticipation blended by `strike`.
export function spinoPoseVector(name, strike, out) {
  const P = POSE_VEC[name] || POSE_VEC.idle;
  for (let i = 0; i < NK; i++) out[i] = P.pre ? P.pre[i] + (P.hit[i] - P.pre[i]) * strike : P.hit[i];
  return out;
}
export const spinoKey = (name) => SPINO_POSE_KEYS.indexOf(name);
// Fossil share: 0 flesh .. 1 bare bone. spinoFossil turns it on for good; spinoShed (0 → 1) plays the shedding.
export function spinoFossilShare(e) {
  if (!e?.spinoFossil) return 0;
  const sh = Number(e.spinoShed);
  return Number.isFinite(sh) ? Math.max(0, Math.min(1, sh)) : 1;
}

// ------------------------------------------------------------------------------------------------ per-beast render state
// Keyed by the beast's id (the renderer hands the painter a fresh copy of the actor every frame), bounded.
const STATES = new Map(), STATE_MAX = 12;
function stateOf(e, now) {
  const key = e.id ?? e;
  let st = STATES.get(key);
  if (!st) {
    st = { at: null, x: null, y: null, phase: 0, moving: 0, shown: new Float64Array(NK), target: new Float64Array(NK), pose: "", poseAt: now, deadAt: null, seen: now, init: false };
    STATES.set(key, st);
    if (STATES.size > STATE_MAX) STATES.delete(STATES.keys().next().value);
  }
  st.seen = now; return st;
}
export const spinoStateCount = () => STATES.size;

// ------------------------------------------------------------------------------------------------ geometry (body units, y up)
// The chain: tail tip ... hip ... shoulder ... neck end (the skull's hinge). Preallocated.
const CH_N = SPINO_ART.tailN + 1 + SPINO_ART.trunk.length + SPINO_ART.neck.length;
const CX = new Float64Array(CH_N), CY = new Float64Array(CH_N), TOP = new Float64Array(CH_N), BOT = new Float64Array(CH_N), NX = new Float64Array(CH_N), NY = new Float64Array(CH_N);
const HIP = SPINO_ART.tailN, SHOULDER = HIP + SPINO_ART.trunk.length, NECK_END = CH_N - 1;
// depth above and below the spine (u), tail tip to neck end
const DEPTH = (() => {
  const top = [], bot = [];
  for (let i = 0; i <= SPINO_ART.tailN; i++) { const f = i / SPINO_ART.tailN; top.push(.03 + .17 * Math.pow(f, .8)); bot.push(.022 + .15 * Math.pow(f, 1)); }
  top.push(.21, .2, .17); bot.push(.31, .3, .2);
  top.push(.13, .105, .085); bot.push(.14, .11, .09);
  return { top: Float64Array.from(top), bot: Float64Array.from(bot) };
})();
const V = new Float64Array(NK), K = Object.fromEntries(SPINO_POSE_KEYS.map((k, i) => [k, i]));

function buildChain(hx, hy, W, t, reduce, walk, phase) {
  const A = SPINO_ART;
  CX[HIP] = hx; CY[HIP] = hy;
  // forward: the trunk, then the neck
  let x = hx, y = hy;
  const trunkA = [.07, .0, -.18];
  for (let i = 0; i < A.trunk.length; i++) {
    const ang = trunkA[i] + W[K.pitch] - W[K.lean] * .1 * i;
    x += Math.cos(ang) * A.trunk[i]; y += Math.sin(ang) * A.trunk[i];
    CX[HIP + 1 + i] = x; CY[HIP + 1 + i] = y;
  }
  const neckA = [.95, .72, .45], bobN = reduce ? 0 : walk * .03 * Math.sin(phase * 2);
  for (let i = 0; i < A.neck.length; i++) {
    const ang = neckA[i] + W[K.pitch] * .9 + W[K.neck] * (.55 - .1 * i) - W[K.reach] * (.55 - .05 * i) + bobN;
    x += Math.cos(ang) * A.neck[i] * (1 + .35 * W[K.reach]); y += Math.sin(ang) * A.neck[i] * (1 + .35 * W[K.reach]);
    CX[SHOULDER + 1 + i] = x; CY[SHOULDER + 1 + i] = y;
  }
  // backward: the tail, its tip swaying (never still), lifted or dropped by the pose
  x = hx; y = hy;
  for (let i = 0; i < A.tailN; i++) {
    const wave = reduce ? 0 : Math.sin(t * 1.4 - i * .55) * .035 * (i + 1) * (1 - .6 * walk) + walk * .03 * Math.sin(phase - i * .4);
    const ang = Math.PI + W[K.pitch] * .8 + .2 - i * .055 - W[K.tailUp] * (.08 + .05 * i) + wave;
    const len = A.tailSeg * (1 - .45 * Math.abs(W[K.tailSide]) * (i / A.tailN));
    x += Math.cos(ang) * len; y += Math.sin(ang) * len;
    CX[HIP - 1 - i] = x; CY[HIP - 1 - i] = y;
  }
  // the outline's normals (pointing up off the spine) and its depth
  for (let i = 0; i < CH_N; i++) {
    const a = Math.max(0, i - 1), c = Math.min(CH_N - 1, i + 1), dx = CX[c] - CX[a], dy = CY[c] - CY[a], l = Math.hypot(dx, dy) || 1;
    NX[i] = -dy / l; NY[i] = dx / l; TOP[i] = DEPTH.top[i]; BOT[i] = DEPTH.bot[i];
  }
}

// a point along the chain at a fractional index, offset `o` along the normal (+ up)
function along(f, o, out) {
  const i = Math.max(0, Math.min(CH_N - 2, Math.floor(f))), q = Math.max(0, Math.min(1, f - i));
  out[0] = CX[i] + (CX[i + 1] - CX[i]) * q + (NX[i] + (NX[i + 1] - NX[i]) * q) * o;
  out[1] = CY[i] + (CY[i + 1] - CY[i]) * q + (NY[i] + (NY[i + 1] - NY[i]) * q) * o;
  return out;
}
const depthAt = (f, top) => { const D = top ? TOP : BOT, i = Math.max(0, Math.min(CH_N - 2, Math.floor(f))), q = Math.max(0, Math.min(1, f - i)); return D[i] + (D[i + 1] - D[i]) * q; };
const TMP = [0, 0], TMP2 = [0, 0], TMP3 = [0, 0];

// ------------------------------------------------------------------------------------------------ paint helpers
// A tapered limb as round-capped strokes along the points (an outline pass, then the fill): rounded joints, no seams. `bulge`
// swells the middle (a muscle).
function limb(ctx, pts, w0, w1, fill, stroke, lw, bulge = 0) {
  const n = pts.length / 2, steps = 6 * (n - 1);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const pass of stroke ? [0, 1] : [1]) {
    ctx.strokeStyle = pass ? fill : stroke;
    for (let j = 0; j < steps; j++) {
      const f0 = j / steps, f1 = (j + 1) / steps, at = (f, out) => { const g = f * (n - 1), i = Math.min(n - 2, Math.floor(g)), q = g - i; out[0] = pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * q; out[1] = pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * q; return out; };
      const fm = (f0 + f1) / 2, w = (w0 + (w1 - w0) * fm) * (1 + bulge * Math.sin(Math.PI * Math.min(1, fm * 1.4)));
      at(f0, LA); at(f1, LB); ctx.lineWidth = Math.max(1, w + (pass ? 0 : lw * 2)); ctx.beginPath(); ctx.moveTo(LA[0], LA[1]); ctx.lineTo(LB[0], LB[1]); ctx.stroke();
    }
  }
}
const LA = [0, 0], LB = [0, 0];
function claw(ctx, x, y, ang, len, w, fill, stroke, lw) {
  const c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
  ctx.beginPath(); ctx.moveTo(x + px * w, y + py * w);
  ctx.quadraticCurveTo(x + c * len * .6 + px * w * .8, y + s * len * .6 + py * w * .8, x + c * len - px * len * .25, y + s * len - py * len * .25);
  ctx.quadraticCurveTo(x + c * len * .5 - px * w * .2, y + s * len * .5 - py * w * .2, x - px * w, y - py * w); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
// 2D two-bone IK: the joint between H and T, bending toward `side` (+1: the joint forward of the line)
function ik(hx, hy, tx, ty, L1, L2, side, out) {
  let dx = tx - hx, dy = ty - hy; const raw = Math.hypot(dx, dy) || 1e-6, d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, raw));
  dx /= raw; dy /= raw; const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  out[0] = hx + dx * a + dy * h * side; out[1] = hy + dy * a - dx * h * side;
  return out;
}
// deterministic hash in [0, 1)
const hash = (i, j = 0) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };

// ------------------------------------------------------------------------------------------------ the body
export function drawSpino(ctx, q, now = 0) {
  const A = SPINO_ART, { k, u, flip, e } = q, s = q.s || u, reduce = !!e.reduceMotion, t = now / 1000, st = stateOf(e, now);
  // the gait: from how far it has travelled (tiles), the same as the other beasts
  const x0 = Number(e.x) || 0, y0 = Number(e.y) || 0, dt = st.at == null ? 0 : Math.min(.1, Math.max(0, (now - st.at) / 1000));
  const travelled = st.x == null ? 0 : Math.hypot(x0 - st.x, y0 - st.y);
  st.at = now; st.x = x0; st.y = y0;
  const pose0 = e.dead ? "death" : e.spinoPose || "idle";
  if (pose0 !== st.pose) { st.pose = pose0; st.poseAt = now; }
  if (e.dead && st.deadAt == null) st.deadAt = now; else if (!e.dead) st.deadAt = null;
  const W = spinoPoseVector(pose0, spinoStrike(e, reduce ? Infinity : now - st.poseAt), st.target);
  const stun = Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0 && !e.dead) { const D = POSE_VEC.dazed.hit; for (let i = 0; i < NK; i++) W[i] += (D[i] - W[i]) * stun; }
  const run = W[K.run] > .5;
  if (dt > 0 && travelled < 2) {
    const stride = (run ? A.runStride : A.stride) * 2 / .6;
    st.phase = (st.phase + TAU * travelled / Math.max(.05, stride * Math.max(.6, Number(e.scale) || 1))) % TAU;
    const target = travelled / dt > .25 ? 1 : 0; st.moving += (target - st.moving) * Math.min(1, dt * A.settle);
  }
  // ease the pose (reduced motion snaps to it)
  const ek = !st.init || reduce || !(dt > 0) ? 1 : Math.min(1, dt * A.ease * (e.spinoPose === "bite" || e.spinoPose?.startsWith("claw") ? 1.8 : 1));
  for (let i = 0; i < NK; i++) { st.shown[i] += (W[i] - st.shown[i]) * ek; V[i] = st.shown[i]; }
  st.init = true;
  const walk = reduce ? 0 : Math.max(st.moving * (e.pack?.attack && !run ? .3 : 1), run ? 1 : 0), phase = reduce ? 0 : st.phase + (run && st.moving < .3 ? t * 9 : 0);
  const fossil = spinoFossilShare(e), shedding = e.spinoFossil && fossil < 1;
  const dying = st.deadAt == null ? 0 : Math.min(1, (now - st.deadAt) / 1400);
  const air = Math.max(0, Number(e.spinoAir) || 0) * s, ground = q.b;
  const shake = !reduce && V[K.shake] > .05 ? Math.sin(t * A.shake) * .012 * V[K.shake] : 0;
  const chew = V[K.chew] > .05 ? (reduce ? .5 : .5 + .5 * Math.sin(t * A.chew)) * V[K.chew] : 0;
  V[K.open] = Math.max(0, V[K.open] - chew * .28);
  const bob = walk * Math.abs(Math.sin(phase)) * .03 * (run ? 1.8 : 1) + (reduce ? 0 : Math.sin(t * 1.6) * .006);
  const hx = A.hipX + V[K.lean] * .12, hy = A.hipH - V[K.crouch] * .2 - bob + V[K.tuck] * .06 - dying * .36;
  buildChain(hx, hy, V, t, reduce, walk, phase);
  // the snout to the ground (the plough drags its jaw along it, the dig buries it): the neck bows down to bring the hinge low
  const low = V[K.low], digK = V[K.dig] * Math.max(.4, Math.min(1, Number(e.spinoDig) || (V[K.dig] > .5 ? 1 : 0)));
  if (low > .02) { const want = (digK > .3 ? A.digHinge : A.ploughHinge) - CY[NECK_END], n0 = SHOULDER; if (want < 0) for (let j = n0 + 1; j < CH_N; j++) CY[j] += want * low * (j - n0) / (CH_N - 1 - n0); }
  // the head: its hinge at the neck's end, its angle from the pose
  const hgx = CX[NECK_END], hgy = CY[NECK_END] + shake;
  let headA = V[K.pitch] * .5 - .2 + V[K.head] + V[K.neck] * .25 - V[K.reach] * .1;
  if (low > .02) headA += ((digK > .3 ? -1.15 : -.2) - headA) * Math.min(1, low);
  const swing = V[K.swing];

  // ---- shadow (it shrinks as it climbs)
  const lift = Math.min(1, air / Math.max(1, u * 2));
  ctx.save();
  ctx.fillStyle = `rgba(14,8,4,${(.42 * (1 - lift * .55)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * 1.05 * (1 - lift * .4), u * .16 * (1 - lift * .4), 0, 0, TAU); ctx.fill();
  if (dying > 0) ctx.globalAlpha *= 1 - Math.max(0, (dying - .7) / .3) * .6;
  ctx.translate(k, ground - air); ctx.scale(flip, 1);
  if (dying > 0) { ctx.translate(0, 0); ctx.rotate(-dying * .18); }
  const lw = Math.max(1, u * .012);
  const X = (x) => x * u, Y = (y) => -y * u;
  // which arm and leg are on the viewer's side: facing right the right side shows, facing left the left
  const nearR = flip > 0;
  const env = { A, u, lw, X, Y, V, t, reduce, walk, phase, run, hgx, hgy, headA, swing, chew, e, st, dying, air, fossil };

  if (fossil < 1) {
    // ---- flesh (fading as it sheds)
    if (fossil > 0) drawBones(ctx, env, nearR);
    ctx.save(); if (fossil > 0) ctx.globalAlpha *= Math.pow(1 - fossil, .8);
    drawFlesh(ctx, env, nearR);
    ctx.restore();
    if (shedding) drawShedChunks(ctx, env, fossil);
  } else drawBones(ctx, env, nearR);

  // ---- effects at the snout: earth thrown up by the plough and the fling, the dig's mound, the roar
  drawSnoutEffects(ctx, env);
  // a hit flash lightens the body
  const hf = Math.max(0, Math.min(1, Number(e.hitFlash) || 0));
  if (hf > 0) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,236,210,${(.3 * hf).toFixed(3)})`; bodyPath(ctx, env); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  ctx.restore();
}

// the trunk-and-tail silhouette (a smooth curve through the offset points)
function bodyPath(ctx, env) {
  const { X, Y } = env;
  ctx.beginPath();
  const pt = (i, sgn, out) => { const d = sgn > 0 ? TOP[i] : -BOT[i]; out[0] = CX[i] + NX[i] * d; out[1] = CY[i] + NY[i] * d; return out; };
  pt(0, 1, TMP); ctx.moveTo(X(TMP[0]), Y(TMP[1]));
  for (let i = 1; i < CH_N; i++) { pt(i - 1, 1, TMP); pt(i, 1, TMP2); ctx.quadraticCurveTo(X(TMP[0]), Y(TMP[1]), X((TMP[0] + TMP2[0]) / 2), Y((TMP[1] + TMP2[1]) / 2)); }
  pt(CH_N - 1, 1, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); pt(CH_N - 1, -1, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1]));
  for (let i = CH_N - 2; i >= 0; i--) { pt(i + 1, -1, TMP); pt(i, -1, TMP2); ctx.quadraticCurveTo(X(TMP[0]), Y(TMP[1]), X((TMP[0] + TMP2[0]) / 2), Y((TMP[1] + TMP2[1]) / 2)); }
  pt(0, -1, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1]));
  ctx.closePath();
}
// the sail's spines: [base x, base y, tip x, tip y] per spine, along the back from behind the hips to the shoulders
const SAIL = new Float64Array(SPINO_ART.sailN * 4);
function sailSpines(env) {
  const { A, V } = env, n = A.sailN, f0 = HIP - 1.6, f1 = SHOULDER + .55;
  for (let i = 0; i < n; i++) {
    const q = i / (n - 1), f = f0 + (f1 - f0) * q;
    along(f, depthAt(f, true) * .8, TMP);
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, .06 + q * .94)), .85) * (1 - .18 * q) + .04, h = A.sailH * prof * (1 + .12 * V[K.flare]);
    const ii = Math.floor(f), nx = NX[ii], ny = NY[ii], back = -.22 + .12 * q - .25 * V[K.flare] * (q - .5);
    const c = Math.cos(back), sn = Math.sin(back), dx = nx * c - ny * sn, dy = nx * sn + ny * c;
    SAIL[i * 4] = TMP[0]; SAIL[i * 4 + 1] = TMP[1]; SAIL[i * 4 + 2] = TMP[0] + dx * h; SAIL[i * 4 + 3] = TMP[1] + dy * h;
  }
  return SAIL;
}

function drawLeg(ctx, env, side, near, fossil) {
  const { A, u, lw, X, Y, V, walk, phase, run } = env;
  // the hip joint and the foot: planted through the stride, lifted on the swing; spread wide in a lunge, drawn up in the air
  along(HIP + .15, -.04, TMP); const hx = TMP[0], hy = TMP[1];
  const ph = phase + (side > 0 ? 0 : Math.PI), stride = (run ? A.runStride : A.stride);
  const swing = Math.sin(ph) * walk * stride, lifted = Math.max(0, Math.cos(ph)) * walk * (run ? .16 : .09);
  let fx = hx + .06 + swing + (near ? .05 : -.1) + V[K.stride] * (near ? .32 : -.3), fy = lifted;
  if (V[K.tuck] > .02) { fx += V[K.tuck] * (near ? .12 : -.02); fy += V[K.tuck] * .32; }
  fy = Math.max(fy, 0) + (env.dying > 0 ? env.dying * .02 : 0);
  // ankle above and behind the foot (digitigrade), the knee forward
  const ax = fx - .1 - V[K.tuck] * .06, ay = fy + A.meta + V[K.tuck] * .04;
  const kn = ik(hx, hy, ax, ay, A.thigh, A.shin, 1, TMP2), kx = kn[0], ky = kn[1];
  const tone = near ? A.body : A.bodyDark;
  if (fossil) {
    const bone = near ? A.bone : A.boneShade;
    limb(ctx, [X(hx), Y(hy), X(kx), Y(ky)], u * .085, u * .06, bone, A.joint, lw * .8, .2);
    limb(ctx, [X(kx), Y(ky), X(ax), Y(ay)], u * .05, u * .04, bone, A.joint, lw * .8);
    limb(ctx, [X(ax), Y(ay), X(fx), Y(fy + .02)], u * .04, u * .03, bone, A.joint, lw * .8);
    for (const [jx, jy, r] of [[kx, ky, .028], [ax, ay, .022]]) { ctx.fillStyle = A.joint; ctx.beginPath(); ctx.arc(X(jx), Y(jy), u * r, 0, TAU); ctx.fill(); }
  } else {
    // a heavy drumstick of a thigh, a lean shin, the scaled foot
    limb(ctx, [X(kx), Y(ky), X(ax), Y(ay)], u * .12, u * .075, tone, A.outline, lw);
    // the thigh: a heavy muscled drumstick swelling out of the haunch and narrowing to the knee
    { const ang = Math.atan2(ky - hy, kx - hx), ca = Math.cos(ang), sa = Math.sin(ang), px = -sa, py = ca, L = Math.hypot(kx - hx, ky - hy);
      const P = (a, b) => [X(hx + ca * a * L + px * b), Y(hy + sa * a * L + py * b)];
      ctx.beginPath(); ctx.moveTo(...P(-.15, .2)); ctx.bezierCurveTo(...P(.35, .26), ...P(.8, .1), ...P(1.02, .045)); ctx.bezierCurveTo(...P(1.08, 0), ...P(1.06, -.05), ...P(.98, -.06));
      ctx.bezierCurveTo(...P(.7, -.12), ...P(.25, -.2), ...P(-.12, -.17)); ctx.closePath();
      const g = ctx.createLinearGradient(...P(.3, .2), ...P(.3, -.18)); g.addColorStop(0, near ? A.bodyLight : A.body); g.addColorStop(.6, tone); g.addColorStop(1, near ? A.bodyDark : A.sailDark);
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
      if (near) { ctx.strokeStyle = "rgba(120,50,16,.4)"; ctx.lineWidth = Math.max(1, u * .012); ctx.beginPath(); ctx.moveTo(...P(.1, .02)); ctx.quadraticCurveTo(...P(.5, -.04), ...P(.9, -.02)); ctx.stroke();
        ctx.fillStyle = "rgba(168,72,30,.55)"; for (let i = 0; i < 4; i++) { const [mx, my] = P(.2 + i * .18, .08 - (i % 2) * .09); ctx.beginPath(); ctx.ellipse(mx, my, u * .028, u * .018, ang, 0, TAU); ctx.fill(); } } }
    limb(ctx, [X(ax), Y(ay), X(fx), Y(fy + .03)], u * .065, u * .05, near ? A.bodyDark : A.sailDark, A.outline, lw);
    if (near) { ctx.strokeStyle = "rgba(90,40,14,.35)"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(X(hx - .05), Y(hy - .08)); ctx.quadraticCurveTo(X((hx + kx) / 2 - .06), Y((hy + ky) / 2), X(kx - .02), Y(ky + .03)); ctx.stroke(); }
  }
  // three toes with claws, splayed forward
  for (let i = 0; i < 3; i++) { const a = -.15 + (i - 1) * .22 - V[K.tuck] * .6; claw(ctx, X(fx - .01), Y(fy + .025), -a, u * (.12 - Math.abs(i - 1) * .02), u * .022, i === 1 ? A.claw : A.boneShade, A.clawDark, lw * .6); }
}

function drawArm(ctx, env, side, near, fossil) {
  const { A, u, lw, X, Y, V, t, reduce, walk, phase } = env;
  along(SHOULDER - .15, -BOT[SHOULDER] * .45, TMP); const sx = TMP[0], sy = TMP[1];
  const c = side > 0 ? V[K.clawR] : V[K.clawL], raise = V[K.arms];
  const sway = reduce ? 0 : walk * .12 * Math.sin(phase + (side > 0 ? 0 : Math.PI)) + .04 * Math.sin(t * 1.3 + side);
  // the upper arm hangs down and forward; cocked (-1) it is drawn up and back, slashed (1) thrown forward and down
  const ua = -1.25 + raise * .9 + sway + (c < 0 ? -c * 1.9 : -c * .2) + env.V[K.pitch] * .6, fa = ua + .75 + (c < 0 ? -c * .5 : c * -.9) + raise * .3;
  const ex = sx + Math.cos(ua) * A.upperArm, ey = sy + Math.sin(ua) * A.upperArm, wx = ex + Math.cos(fa) * A.foreArm, wy = ey + Math.sin(fa) * A.foreArm;
  const tone = near ? A.body : A.bodyDark;
  if (fossil) {
    const bone = near ? A.bone : A.boneShade;
    limb(ctx, [X(sx), Y(sy), X(ex), Y(ey)], u * .045, u * .035, bone, A.joint, lw * .8, .2);
    limb(ctx, [X(ex), Y(ey), X(wx), Y(wy)], u * .035, u * .03, bone, A.joint, lw * .8);
    ctx.fillStyle = A.joint; ctx.beginPath(); ctx.arc(X(ex), Y(ey), u * .02, 0, TAU); ctx.fill();
  } else {
    // muscular: a bulging upper arm and a thick forearm
    limb(ctx, [X(sx), Y(sy), X((sx + ex) / 2), Y((sy + ey) / 2), X(ex), Y(ey)], u * .15, u * .1, tone, A.outline, lw, .3);
    limb(ctx, [X(ex), Y(ey), X((ex + wx) / 2), Y((ey + wy) / 2), X(wx), Y(wy)], u * .1, u * .075, tone, A.outline, lw, .25);
  }
  // the hand: three big hooked claws, the first (the thumb) the longest
  const ha = fa - .5 - (c > 0 ? c * .5 : 0);
  for (let i = 0; i < 3; i++) claw(ctx, X(wx), Y(wy), -(ha - i * .32), u * (i === 0 ? .17 : .13), u * .024, A.claw, A.clawDark, lw * .6);
  // a slash leaves a bright arc behind the claws
  if (!reduce && c > .6 && !fossil) { ctx.strokeStyle = `rgba(255,236,210,${(.5 * (c - .6) / .4).toFixed(3)})`; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.arc(X(sx), Y(sy), u * (A.upperArm + A.foreArm + .12), .2, 1.6); ctx.stroke(); }
}

function drawTailSwipe(ctx, env, near) {
  // a tail swipe sweeps round beside it: a pale arc of motion where the tail travels
  const { u, X, Y, V, reduce } = env, k = Math.abs(V[K.tailSide]); if (reduce || k < .5) return;
  ctx.strokeStyle = `rgba(255,230,200,${(.35 * (k - .5) * 2).toFixed(3)})`; ctx.lineWidth = Math.max(1, u * (near ? .05 : .03));
  ctx.beginPath(); ctx.ellipse(X(CX[HIP]), Y(CY[HIP] - .1), u * 1.15, u * .3, 0, Math.PI * .55, Math.PI * 1.25); ctx.stroke();
}

function drawFlesh(ctx, env, nearR) {
  const { A, u, lw, X, Y, V, t } = env;
  const swingNear = (V[K.tailSide] > 0) !== nearR;
  // far limbs first, darker
  drawArm(ctx, env, nearR ? -1 : 1, false, false);
  drawLeg(ctx, env, nearR ? -1 : 1, false, false);
  if (!swingNear) drawTailSwipe(ctx, env, false);
  // the sail: a membrane of dark orange between the spines, scalloped along its edge, darker between the spines
  const S = sailSpines(env), n = A.sailN;
  ctx.beginPath(); ctx.moveTo(X(S[0]), Y(S[1]));
  for (let i = 0; i < n; i++) ctx.lineTo(X(S[i * 4 + 2]), Y(S[i * 4 + 3]));
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(X(S[i * 4]), Y(S[i * 4 + 1]));
  ctx.closePath();
  {
    const g = ctx.createLinearGradient(0, Y(CY[HIP] + .1), 0, Y(CY[HIP] + A.sailH + .2)); g.addColorStop(0, A.sailDark); g.addColorStop(.45, A.sail); g.addColorStop(1, A.sailLight);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
  }
  // the scalloped edge: the membrane sags between each pair of spine tips
  ctx.fillStyle = A.sailDark;
  for (let i = 0; i < n - 1; i++) {
    const ax = S[i * 4 + 2], ay = S[i * 4 + 3], bx = S[i * 4 + 6], by = S[i * 4 + 7], mx = (ax + bx) / 2, my = (ay + by) / 2 - .045;
    ctx.beginPath(); ctx.moveTo(X(ax), Y(ay)); ctx.quadraticCurveTo(X(mx), Y(my), X(bx), Y(by)); ctx.lineTo(X(bx), Y(by + .02)); ctx.lineTo(X(ax), Y(ay + .02)); ctx.closePath(); ctx.globalAlpha *= 1; ctx.fill();
  }
  // stripes down the sail between the spines, and the spines themselves
  ctx.strokeStyle = "rgba(110,38,10,.45)"; ctx.lineWidth = Math.max(1, u * .016);
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(X(S[i * 4]), Y(S[i * 4 + 1])); ctx.lineTo(X(S[i * 4 + 2]), Y(S[i * 4 + 3])); ctx.stroke(); }
  ctx.fillStyle = A.sailSpine; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(X(S[i * 4 + 2]), Y(S[i * 4 + 3]), u * .014, 0, TAU); ctx.fill(); }
  // dark bands across the sail, low down (the mottled hide carries up into it)
  ctx.fillStyle = "rgba(120,40,10,.35)";
  for (let i = 1; i < n - 1; i += 2) { const bx = S[i * 4], by = S[i * 4 + 1], tx = S[i * 4 + 2], ty = S[i * 4 + 3]; ctx.beginPath(); ctx.ellipse(X(bx + (tx - bx) * .3), Y(by + (ty - by) * .3), u * .035, u * .07, -Math.atan2(ty - by, tx - bx) + Math.PI / 2, 0, TAU); ctx.fill(); }
  // the body: tail, trunk and neck in one outline
  bodyPath(ctx, env);
  {
    const g = ctx.createLinearGradient(0, Y(CY[HIP] + .25), 0, Y(CY[HIP] - .3)); g.addColorStop(0, A.bodyLight); g.addColorStop(.45, A.body); g.addColorStop(1, A.bodyDark);
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.save(); bodyPath(ctx, env); ctx.clip();
  // the paler belly: a band along the underside from the throat back under the tail
  ctx.fillStyle = A.belly; ctx.beginPath();
  for (let i = 2; i < CH_N; i++) { const o = -BOT[i] * .4; const px = CX[i] + NX[i] * o, py = CY[i] + NY[i] * o; if (i === 2) ctx.moveTo(X(px), Y(py)); else ctx.lineTo(X(px), Y(py)); }
  for (let i = CH_N - 1; i >= 2; i--) { const o = -BOT[i] * 1.2; ctx.lineTo(X(CX[i] + NX[i] * o), Y(CY[i] + NY[i] * o)); }
  ctx.closePath(); ctx.globalAlpha *= .85; ctx.fill(); ctx.globalAlpha /= .85;
  // stripes across the back and down the tail (rust), each a tapering wedge from the dorsal edge
  ctx.fillStyle = A.stripe;
  for (let j = 0; j < 13; j++) {
    const f = .6 + j * (NECK_END - 1.2) / 12, d = depthAt(f, true), w = .045 * (1 - j / 20);
    along(f - .12, d * 1.05, TMP); along(f + .12, d * 1.05, TMP2); along(f + .02, d - (d + depthAt(f, false)) * (.45 + .1 * hash(j, 1)), TMP3);
    ctx.globalAlpha *= .8; ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.lineTo(X(TMP2[0]), Y(TMP2[1])); ctx.lineTo(X(TMP3[0] + w), Y(TMP3[1])); ctx.lineTo(X(TMP3[0] - w), Y(TMP3[1])); ctx.closePath(); ctx.fill(); ctx.globalAlpha /= .8;
  }
  // mottles: blotches of rust, orange and amber over the flanks (fixed to the chain, so they move with it)
  for (let j = 0; j < 30; j++) {
    const f = .4 + hash(j, 2) * (NECK_END - .8), d0 = depthAt(f, true), d1 = depthAt(f, false), o = -d1 * .2 + (d0 + d1 * .2) * hash(j, 3) * .9;
    along(f, o, TMP); ctx.fillStyle = A.mottle[j % 3]; ctx.globalAlpha *= .75;
    const r = (.022 + .03 * hash(j, 4)) * Math.min(1, (d0 + d1) / .25 + .3);
    ctx.beginPath(); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * r * 1.5, u * r, hash(j, 5) * 2, 0, TAU); ctx.fill(); ctx.globalAlpha /= .75;
  }
  // light along the back, shadow along the belly's crease
  ctx.strokeStyle = "rgba(255,236,200,.22)"; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath();
  for (let i = 1; i < CH_N - 1; i++) { const o = TOP[i] * .7; const px = X(CX[i] + NX[i] * o), py = Y(CY[i] + NY[i] * o); if (i === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.stroke();
  ctx.restore();
  bodyPath(ctx, env); ctx.strokeStyle = A.outline; ctx.lineWidth = lw * 1.2; ctx.stroke();
  // a low crest of small spines down the tail
  ctx.fillStyle = A.sailDark;
  for (let i = 1; i < HIP - 1; i++) { const f = i + .5, d = depthAt(f, true); along(f, d * .9, TMP); along(f, d + .05 * (i / HIP), TMP2); along(f - .35, d * .9, TMP3);
    ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.lineTo(X(TMP2[0]), Y(TMP2[1])); ctx.lineTo(X(TMP3[0]), Y(TMP3[1])); ctx.closePath(); ctx.fill(); }
  if (swingNear) drawTailSwipe(ctx, env, true);
  drawHead(ctx, env, false);
  // near limbs over the body
  drawLeg(ctx, env, nearR ? 1 : -1, true, false);
  drawArm(ctx, env, nearR ? 1 : -1, true, false);
  void t;
}

// the skull and jaws (flesh or bone): local axes along the snout (x) and up from it (y), from the hinge
function drawHead(ctx, env, fossil) {
  const { A, u, lw, X, Y, V, hgx, hgy, headA, swing, t, reduce } = env;
  const open = Math.max(0, Math.min(1.1, V[K.open])), dig = V[K.dig];
  // foreshortened as it is flung to the side (the grab's throw)
  const len = 1 - .28 * Math.abs(swing), ca = Math.cos(headA), sa = Math.sin(headA);
  const hs = A.headScale, hd = A.headScale * A.headDepth, H = (lx, ly, out) => { out[0] = hgx + (ca * lx * len * hs - sa * ly * hd); out[1] = hgy + (sa * lx * len * hs + ca * ly * hd); return out; };
  const jawA = -open * .82, cj = Math.cos(jawA), sj = Math.sin(jawA), hingeX = -.01, hingeY = -.025;
  const J = (lx, ly, out) => { const dx = lx - hingeX, dy = ly - hingeY; return H(hingeX + dx * cj - dy * sj, hingeY + dx * sj + dy * cj, out); };
  const path = (fn, pts) => { ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { fn(pts[i], pts[i + 1], TMP); if (i) ctx.lineTo(X(TMP[0]), Y(TMP[1])); else ctx.moveTo(X(TMP[0]), Y(TMP[1])); } ctx.closePath(); };
  // the dig: the snout below the ground is hidden (a mound of earth drawn over it in drawSnoutEffects)
  ctx.save();
  if (dig > .05) { ctx.beginPath(); ctx.rect(-u * 4, Y(4), u * 8, Y(-.02 + (env.air / u)) - Y(4)); ctx.clip(); }
  // the mouth's dark inside, the tongue, then the lower jaw with its teeth
  const UPPER = [-.07, .03, -.04, .085, .06, .11, .12, .1, .17, .075, .27, .052, .38, .042, .43, .056, .47, .04, .475, .005, .44, -.012, .4, -.006, .35, -.016, .2, -.02, .05, -.03, -.03, -.035];
  const LOWER = [-.05, -.03, .05, -.032, .2, -.026, .34, -.024, .39, -.016, .43, -.02, .455, -.032, .44, -.055, .3, -.06, .14, -.068, .02, -.075, -.05, -.06];
  if (open > .05 && !fossil) { ctx.fillStyle = A.mouth; ctx.beginPath(); H(.0, -.03, TMP); ctx.moveTo(X(TMP[0]), Y(TMP[1])); H(.42, -.01, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); J(.42, -.02, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); ctx.closePath(); ctx.fill();
    if (!fossil) { ctx.fillStyle = A.gum; ctx.beginPath(); J(.02, -.04, TMP); ctx.moveTo(X(TMP[0]), Y(TMP[1])); J(.28, -.035, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); H(.12, -.03, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); ctx.closePath(); ctx.fill(); } }
  // teeth: conical, longest at the rosette of the snout's tip
  const tooth = (fn, lx, ly, dir, size) => { fn(lx - .008, ly, TMP); fn(lx + .008, ly, TMP2); fn(lx + .002, ly + dir * size, TMP3); ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.lineTo(X(TMP3[0]), Y(TMP3[1])); ctx.lineTo(X(TMP2[0]), Y(TMP2[1])); ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = A.tooth;
  for (let i = 0; i < 11; i++) { const lx = .06 + i * .037, big = lx > .38 ? 1.7 : lx > .3 && lx < .34 ? .6 : 1; tooth(J, lx, -.03 + (lx > .38 ? .01 : 0), 1, .022 * big); }
  // the lower jaw
  path(J, LOWER); ctx.fillStyle = fossil ? A.boneShade : A.bodyDark; ctx.fill(); ctx.strokeStyle = fossil ? A.joint : A.outline; ctx.lineWidth = lw; ctx.stroke();
  if (fossil) { ctx.fillStyle = A.socket; ctx.beginPath(); J(.1, -.05, TMP); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .03, u * .01, -headA - jawA, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = A.belly; ctx.globalAlpha *= .7; path(J, [.0, -.06, .3, -.052, .42, -.045, .3, -.064, .02, -.074]); ctx.fill(); ctx.globalAlpha /= .7; }
  // the upper teeth hang below the upper jaw
  ctx.fillStyle = A.tooth;
  for (let i = 0; i < 12; i++) { const lx = .05 + i * .036, big = lx > .4 ? 1.8 : lx > .33 && lx < .37 ? .5 : 1; tooth(H, lx, lx > .36 && lx < .43 ? -.01 : -.018, -1, .025 * big); }
  // the skull: long and low, a crest over the eyes, the snout's tip curling up into a rosette
  path(H, UPPER);
  if (fossil) { ctx.fillStyle = A.bone; ctx.fill(); ctx.strokeStyle = A.joint; ctx.lineWidth = lw; ctx.stroke(); }
  else {
    H(.2, .1, TMP); H(.2, -.03, TMP2); const g = ctx.createLinearGradient(X(TMP[0]), Y(TMP[1]), X(TMP2[0]), Y(TMP2[1])); g.addColorStop(0, A.bodyDark); g.addColorStop(.35, A.body); g.addColorStop(1, A.belly);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = lw; ctx.stroke();
    // rust spots along the snout, stripes over the crown
    ctx.fillStyle = A.stripe; for (let i = 0; i < 5; i++) { H(.06 + i * .07, .055 - i * .006, TMP); ctx.globalAlpha *= .7; ctx.beginPath(); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .016, u * .01, -headA, 0, TAU); ctx.fill(); ctx.globalAlpha /= .7; }
  }
  if (fossil) {
    // the skull's openings: the great eye socket (an ember deep in it), the window before it, the nostril
    ctx.fillStyle = A.socket; ctx.beginPath(); H(.12, .055, TMP); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .03, u * .026, -headA, 0, TAU); ctx.fill();
    ctx.beginPath(); H(.22, .04, TMP); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .045, u * .016, -headA, 0, TAU); ctx.fill();
    ctx.beginPath(); H(.36, .035, TMP); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .02, u * .008, -headA, 0, TAU); ctx.fill();
    const glow = reduce ? .85 : .7 + .3 * Math.sin(t * 5); ctx.fillStyle = A.ember; ctx.globalAlpha *= glow; ctx.beginPath(); H(.125, .055, TMP); ctx.arc(X(TMP[0]), Y(TMP[1]), u * .011, 0, TAU); ctx.fill(); ctx.globalAlpha /= glow;
    ctx.strokeStyle = A.boneDark; ctx.lineWidth = Math.max(1, lw * .7); ctx.beginPath(); H(.05, .1, TMP); ctx.moveTo(X(TMP[0]), Y(TMP[1])); H(.3, .05, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); ctx.stroke();
  } else {
    // the fierce eye: amber with a hot rim and a slit, under a heavy brow that slants down to the snout
    H(.12, .058, TMP); ctx.fillStyle = "rgba(255,140,30,.35)"; ctx.beginPath(); ctx.arc(X(TMP[0]), Y(TMP[1]), u * .04, 0, TAU); ctx.fill(); ctx.fillStyle = A.eyeHot; ctx.beginPath(); ctx.arc(X(TMP[0]), Y(TMP[1]), u * .025, 0, TAU); ctx.fill();
    ctx.fillStyle = A.eye; ctx.beginPath(); ctx.arc(X(TMP[0]), Y(TMP[1]), u * .02, 0, TAU); ctx.fill();
    ctx.fillStyle = A.pupil; ctx.beginPath(); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .006, u * .018, -headA, 0, TAU); ctx.fill();
    ctx.fillStyle = A.brow; ctx.beginPath(); H(.07, .09, TMP); ctx.moveTo(X(TMP[0]), Y(TMP[1])); H(.17, .07, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); H(.15, .058, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); H(.08, .074, TMP); ctx.lineTo(X(TMP[0]), Y(TMP[1])); ctx.closePath(); ctx.fill();
    ctx.fillStyle = A.outline; ctx.beginPath(); H(.37, .042, TMP); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * .014, u * .006, -headA, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---- the fossil: vertebrae, sail spines, ribcage, pelvis, limb bones and the skull (and its rib spears)
function drawBones(ctx, env, nearR) {
  const { A, u, lw, X, Y, V } = env;
  drawArm(ctx, env, nearR ? -1 : 1, false, true);
  drawLeg(ctx, env, nearR ? -1 : 1, false, true);
  // the sail: bare spines, knobbed at the tips, a ragged shred of dried membrane low between a few
  const S = sailSpines(env), n = A.sailN;
  for (let i = 0; i < n; i++) { limb(ctx, [X(S[i * 4]), Y(S[i * 4 + 1]), X(S[i * 4 + 2]), Y(S[i * 4 + 3])], u * .032, u * .012, A.bone, A.joint, lw * .7); ctx.fillStyle = A.boneShade; ctx.beginPath(); ctx.arc(X(S[i * 4 + 2]), Y(S[i * 4 + 3]), u * .012, 0, TAU); ctx.fill(); }
  // the ribcage: ribs hanging in arcs from the spine round to the belly line, with the belly ribs (gastralia) beneath
  const r0 = HIP + .25, r1 = SHOULDER - .05, nr = 8;
  for (let i = 0; i < nr; i++) {
    const f = r0 + (r1 - r0) * i / (nr - 1); along(f, 0, TMP); const d = depthAt(f, false) * (.75 + .3 * Math.sin(Math.PI * (i + .5) / nr));
    along(f - .6, -d * .5, TMP2); along(f - .3, -d, TMP3);
    ctx.strokeStyle = A.joint; ctx.lineWidth = u * .04; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.quadraticCurveTo(X(TMP2[0]), Y(TMP2[1]), X(TMP3[0]), Y(TMP3[1])); ctx.stroke();
    ctx.strokeStyle = i % 2 ? A.boneShade : A.bone; ctx.lineWidth = u * .026; ctx.stroke();
  }
  ctx.strokeStyle = A.boneShade; ctx.lineWidth = Math.max(1, u * .012);
  for (let i = 0; i < 7; i++) { const f = r0 + .2 + (r1 - r0) * i / 7; along(f, -depthAt(f, false) * .95, TMP); along(f + .25, -depthAt(f, false) * .9, TMP2); ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.lineTo(X(TMP2[0]), Y(TMP2[1])); ctx.stroke(); }
  // the spine: a vertebra at every link, the tail's shrinking to the tip, chevrons beneath the tail
  for (let i = 0; i < CH_N; i++) for (const half of [0, .5]) {
    const f = i + half; if (f > CH_N - 1) continue; along(f, 0, TMP); const r = Math.max(.012, Math.min(.05, (depthAt(f, true) + depthAt(f, false)) * .17));
    ctx.fillStyle = A.joint; ctx.beginPath(); ctx.arc(X(TMP[0]), Y(TMP[1]), u * (r + .008), 0, TAU); ctx.fill();
    ctx.fillStyle = half ? A.boneShade : A.bone; ctx.beginPath(); ctx.ellipse(X(TMP[0]), Y(TMP[1]), u * r * 1.2, u * r, 0, 0, TAU); ctx.fill();
    if (f < HIP && i > 0) { along(f, -depthAt(f, false) * .7, TMP2); ctx.strokeStyle = A.boneShade; ctx.lineWidth = Math.max(1, u * .012); ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.lineTo(X(TMP2[0] - .02), Y(TMP2[1])); ctx.stroke(); }
    if (f < HIP && i > 0) { along(f, depthAt(f, true) * .7, TMP2); ctx.strokeStyle = A.bone; ctx.beginPath(); ctx.moveTo(X(TMP[0]), Y(TMP[1])); ctx.lineTo(X(TMP2[0] - .02), Y(TMP2[1])); ctx.stroke(); }
  }
  // the pelvis: a blade over the hip, the pubis's boot reaching down and forward, the ischium back
  along(HIP + .1, .02, TMP);
  ctx.fillStyle = A.bone; ctx.strokeStyle = A.joint; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.ellipse(X(TMP[0]), Y(TMP[1] + .03), u * .15, u * .07, -V[K.pitch], 0, TAU); ctx.fill(); ctx.stroke();
  limb(ctx, [X(TMP[0] + .02), Y(TMP[1] - .02), X(TMP[0] + .1), Y(TMP[1] - .2)], u * .05, u * .03, A.boneShade, A.joint, lw * .8);
  limb(ctx, [X(TMP[0] - .04), Y(TMP[1] - .02), X(TMP[0] - .16), Y(TMP[1] - .16)], u * .045, u * .025, A.boneShade, A.joint, lw * .8);
  // the rib spears: out to the sides (seen end on in profile, a star of points round the ribcage), then thrust to a point ahead
  drawRibSpears(ctx, env);
  drawHead(ctx, env, true);
  drawLeg(ctx, env, nearR ? 1 : -1, true, true);
  drawArm(ctx, env, nearR ? 1 : -1, true, true);
}

// the rib spears' geometry (body units) for a frame: [anchor x, y, tip x, y] per spear
export const SPINO_SPEARS = Object.freeze({ count: 6, out: .72, thrust: 1.2, tipY: .62, width: .045 });
const SPEAR = new Float64Array(SPINO_SPEARS.count * 4);
function ribSpears(V) {
  const n = SPINO_SPEARS.count, out = V[K.ribs], th = V[K.thrust];
  for (let i = 0; i < n; i++) {
    const f = HIP + .4 + (SHOULDER - HIP - .6) * (i % 3) / 2, up = i < 3 ? 1 : -1;
    along(f, up > 0 ? .02 : -depthAt(f, false) * .55, TMP);
    // out: radiating up-and-back or down-and-forward; thrust: every one aimed at one point ahead of the chest
    const oa = up > 0 ? 1.15 + .25 * (i % 3) : -.75 - .25 * (i % 3), ox = TMP[0] + Math.cos(oa) * SPINO_SPEARS.out * out, oy = TMP[1] + Math.sin(oa) * SPINO_SPEARS.out * out;
    along(SHOULDER, 0, TMP2); const px = TMP2[0] + SPINO_SPEARS.thrust, py = SPINO_SPEARS.tipY + (CY[HIP] - SPINO_ART.hipH) * .5;
    SPEAR[i * 4] = TMP[0]; SPEAR[i * 4 + 1] = TMP[1]; SPEAR[i * 4 + 2] = ox + (px - ox) * th; SPEAR[i * 4 + 3] = oy + (py - oy) * th;
  }
  return SPEAR;
}
function drawRibSpears(ctx, env) {
  const { A, u, lw, X, Y, V } = env; if (V[K.ribs] < .03) return;
  const S = ribSpears(V);
  for (let i = 0; i < SPINO_SPEARS.count; i++) {
    const ax = S[i * 4], ay = S[i * 4 + 1], tx = S[i * 4 + 2], ty = S[i * 4 + 3], l = Math.hypot(tx - ax, ty - ay) || 1, nx = -(ty - ay) / l, ny = (tx - ax) / l, w = SPINO_SPEARS.width;
    ctx.beginPath(); ctx.moveTo(X(ax + nx * w), Y(ay + ny * w)); ctx.lineTo(X(tx), Y(ty)); ctx.lineTo(X(ax - nx * w), Y(ay - ny * w)); ctx.closePath();
    ctx.fillStyle = i % 2 ? A.boneShade : A.bone; ctx.fill(); ctx.strokeStyle = A.joint; ctx.lineWidth = lw * .8; ctx.stroke();
    // barbs along each spear
    for (const q of [.45, .7]) { const bx = ax + (tx - ax) * q, by = ay + (ty - ay) * q; ctx.beginPath(); ctx.moveTo(X(bx), Y(by)); ctx.lineTo(X(bx - (tx - ax) / l * .06 + nx * .04), Y(by - (ty - ay) / l * .06 + ny * .04)); ctx.strokeStyle = A.bone; ctx.lineWidth = Math.max(1, u * .01); ctx.stroke(); }
  }
}

// the shed: pieces of hide tear away from the body and fall, tumbling, fading as they hit the ground
export const SPINO_SHED = Object.freeze({ chunks: 14, fall: 1.1, spin: 4 });
function drawShedChunks(ctx, env, shed) {
  const { A, u, lw, X, Y } = env, n = SPINO_SHED.chunks;
  for (let i = 0; i < n; i++) {
    const start = hash(i, 7) * .55, k = Math.max(0, Math.min(1, (shed - start) / .45)); if (k <= 0 || k >= 1) continue;
    const f = 1 + hash(i, 8) * (NECK_END - 2), o = (hash(i, 9) - .3) * depthAt(f, true) * 1.4; along(f, o, TMP);
    const drop = k * k * SPINO_SHED.fall * (TMP[1] + .2), drift = (hash(i, 10) - .5) * .3 * k, rot = (hash(i, 11) - .5) * SPINO_SHED.spin * k, r = .05 + .05 * hash(i, 12);
    const cx = TMP[0] + drift, cy = Math.max(r * .4, TMP[1] - drop);
    ctx.save(); ctx.translate(X(cx), Y(cy)); ctx.rotate(rot); ctx.globalAlpha *= 1 - Math.max(0, (k - .75) / .25);
    ctx.fillStyle = i % 3 === 0 ? A.mottle[0] : i % 3 === 1 ? A.body : A.sail; ctx.strokeStyle = A.outline; ctx.lineWidth = lw * .7;
    ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = j / 6 * TAU, rr = u * r * (.7 + .5 * hash(i, 20 + j)); if (j) ctx.lineTo(Math.cos(a) * rr * 1.3, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr * 1.3, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8a1a14"; ctx.beginPath(); ctx.ellipse(0, u * r * .2, u * r * .6, u * r * .3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawSnoutEffects(ctx, env) {
  const { A, u, X, Y, V, t, reduce, hgx, hgy, headA, e } = env;
  const tipX = hgx + Math.cos(headA) * .46 * A.headScale, tipY = hgy + Math.sin(headA) * .46 * A.headScale;
  // the dig: a mound of earth round the buried snout
  const dig = V[K.dig] * Math.max(.4, Math.min(1, Number(e.spinoDig) || (V[K.dig] > .5 ? 1 : 0)));
  if (dig > .05) {
    const mx = Math.max(hgx + .05, tipX), g = ctx.createRadialGradient(X(mx), Y(.02), u * .02, X(mx), Y(0), u * .3); g.addColorStop(0, A.dirtLight); g.addColorStop(1, A.dirt);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X(mx), Y(0), u * .3 * dig, u * .12 * dig, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = A.rock; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(X(mx - .2 + i * .1), Y(.03 + .04 * hash(i, 30)), u * (.015 + .015 * hash(i, 31)), 0, TAU); ctx.fill(); }
  }
  // earth and rocks thrown up ahead of the snout (the plough's furrow, the fling)
  const dirt = V[K.dirt];
  if (dirt > .1 && !reduce) {
    for (let i = 0; i < 12; i++) {
      const life = (t * 1.6 + hash(i, 40)) % 1, sx = Math.max(tipX, hgx) + .05, vx = .5 + .8 * hash(i, 41), vy = .6 + .9 * hash(i, 42);
      const px = sx + vx * life * (V[K.pitch] > 0 ? 1.2 : .7), py = Math.max(0, .02 + vy * life - 1.6 * life * life);
      ctx.save(); ctx.fillStyle = i % 3 ? A.dirt : A.rock; ctx.globalAlpha *= dirt * (1 - life); ctx.beginPath(); ctx.arc(X(px), Y(py), u * (.014 + .02 * hash(i, 43)), 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  // the roar: rings rolling out of the open jaws
  if (V[K.shake] > .3 && V[K.open] > .6 && !reduce) {
    ctx.strokeStyle = "rgba(255,226,190,.5)";
    for (let i = 0; i < 3; i++) { const ph = (t * 1.8 + i / 3) % 1; ctx.save(); ctx.globalAlpha *= 1 - ph; ctx.lineWidth = Math.max(1, u * .03 * (1 - ph)); ctx.beginPath(); ctx.arc(X(tipX), Y(tipY), u * (.12 + ph * .9), headA * -1 - .9, headA * -1 + .9); ctx.stroke(); ctx.restore(); }
  }
}

// ------------------------------------------------------------------------------------------------ marks and overlays
// The grab's tracking reticle (a bite mark: two arcs of tooth points closing on the target), drawn on the floor where the
// gameplay holds it (spinoGrab.x, y in tiles; else the grabbed creature's own position). `k` (0..1) is how close the lunge is.
export const SPINO_BITE_MARK = Object.freeze({ radius: .9, teeth: 8, color: "255,40,60", overlayTeeth: 11, overlayAlpha: .6, overlayVignette: .45 });
// one jaw's row of teeth along an arc bulging away from the centre (side -1 the upper jaw, 1 the lower), pointing inward
function biteRow(ctx, cx, cy, rx, ry, gap, side, n, len, w, fill, blood) {
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : .5, a = Math.PI * (.1 + .8 * f), px = cx - Math.cos(a) * rx, py = cy + side * (gap + Math.sin(a) * ry), tl = len * (.6 + .4 * Math.sin(Math.PI * f) + (f > .85 || f < .15 ? .35 : 0));
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(px - w, py); ctx.lineTo(px + w, py); ctx.lineTo(px, py - side * tl); ctx.closePath(); ctx.fill();
    if (blood) { ctx.fillStyle = blood; ctx.beginPath(); ctx.arc(px, py - side * tl * .8, w * .55, 0, TAU); ctx.fill(); }
  }
}
export function drawSpinoBiteMark(ctx, x, y, s, now, k = 0, reduce = false) {
  const M = SPINO_BITE_MARK, R = M.radius * s, t = now / 1000, pulse = reduce ? 1 : .8 + .2 * Math.sin(t * 9), close = Math.max(0, Math.min(1, k));
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .62);
  // the target ring, and the two jaws' rows of teeth closing on it as the lunge nears
  ctx.strokeStyle = `rgba(${M.color},${(.6 * pulse).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, s * .05); ctx.setLineDash([s * .16, s * .09]);
  ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  const gap = R * (.34 - .26 * close);
  for (const side of [-1, 1]) {
    ctx.strokeStyle = `rgba(${M.color},${(.45 * pulse).toFixed(3)})`; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (.08 + .84 * i / 12), px = -Math.cos(a) * R * .95, py = side * (gap + Math.sin(a) * R * .4); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    biteRow(ctx, 0, 0, R * .95, R * .4, gap, side, M.teeth, R * .34, R * .07, `rgba(${M.color},${(.85 * pulse).toFixed(3)})`, null);
  }
  ctx.restore();
}
// The big bite mark over the screen when a bite lands (`k` 1 fresh .. 0 gone): a red-dark edge, and the two jaws' crescents of
// punctures across the view, each with a bead of blood.
export function drawSpinoBiteOverlay(ctx, w, h, k, reduce = false) {
  const M = SPINO_BITE_MARK, a = Math.max(0, Math.min(1, Number(k) || 0)); if (!(a > 0)) return false;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .5;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, R * .55, cx, cy, Math.max(w, h) * .75); g.addColorStop(0, "rgba(110,0,8,0)"); g.addColorStop(1, `rgba(110,0,8,${(M.overlayVignette * a).toFixed(3)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // the jaws still closing a little as it fades in (held still under reduced motion)
  const gap = R * (reduce ? .3 : .3 + .12 * (a - .5));
  for (const side of [-1, 1]) biteRow(ctx, cx, cy, Math.min(w * .42, R * 1.5), R * .38, gap, side, M.overlayTeeth, R * .3, R * .05, `rgba(30,0,4,${(M.overlayAlpha * a).toFixed(3)})`, `rgba(190,8,22,${(.75 * a).toFixed(3)})`);
  ctx.restore();
  return true;
}
// The floor marks a Spinosaurus owns in the standard view: its grab's reticle on its prey. `enemies` resolves an enemy's id.
export function drawSpinoMarks(ctx, e, s, now, enemies = [], lift = 0, reduce = false) {
  const G = e?.spinoGrab; if (!G || G.phase !== "track") return false;
  let x = Number(G.x), y = Number(G.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) { const prey = G.who && G.who !== "player" ? enemies.find((o) => o.id === G.who) : null; if (!prey) return false; x = prey.x; y = prey.y; }
  drawSpinoBiteMark(ctx, (x + .5) * s, (y + .62 - lift) * s, s, now, Math.max(0, Math.min(1, Number(G.k) || 0)), reduce);
  return true;
}
