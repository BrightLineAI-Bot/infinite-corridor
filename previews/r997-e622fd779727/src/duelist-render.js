// The Gaunt in the standard view (duelists.ts). Original designs: a stick-thin body in ash-grey wraps, a dull crimson sash, chunky
// bone-wrapped hands, and a big charcoal cowl with nothing but dark inside it; the weapon always shown (a long sword, two knives, a
// polearm longer than the body). Each body is painted once per kind, pose, step, facing and drawn size into a small canvas (at
// t = 0) and stamped every frame, lifted by its hop (`hopLift`) over a plain ground shadow, so a screen of them costs a few drawImage
// calls; the cache is bounded (`max`). Plain paths only, no gradients. Without a DOM canvas (tests) a body is painted directly.
// Reduced motion holds the bob still.

const TAU = Math.PI * 2;
export const DUELIST_SPRITE = Object.freeze({
  box: Object.freeze({ gauntDuelist: [3, 2.2, 1.75], gauntCutthroat: [2.6, 2.1, 1.7], gauntLongarm: [3.6, 2.5, 1.9] }), // [width, height, feet] in body units
  max: 72, bob: Object.freeze([1.7, .025]), lift: .55, shadow: .32,
  // the body's measures (body units): hip and shoulder heights, the cowl's radius, limb and hand widths
  body: Object.freeze({ hip: .62, shoulder: 1.06, head: 1.24, cowl: .17, limb: .045, hand: .072, foot: .06 }),
  colors: Object.freeze({ wrap: "#9a948a", wrapDark: "#6f6a62", cowl: "#26262b", cowlEdge: "#3a3a41", void: "#08080a", sash: "#7a2a2a", sashDark: "#5a1e1f", hand: "#c9bfa8", steel: "#c8ccd4", edge: "#f2f4f8", wood: "#3b2e24", band: "#7a2a2a" }),
});
const sprites = new Map();
export const duelistSpriteCount = () => sprites.size;
export const clearDuelistSprites = () => sprites.clear();
const canMake = () => typeof document !== "undefined" && typeof document.createElement === "function";
// The pose a sprite is keyed by: in the air, a windup, a strike (and which cut), or standing / one of two walking steps.
export function duelistPose(e, state) {
  const s = e?.pack;
  if (e?.aloft || (Number(e?.hopLift) || 0) > .2) return "air";
  if (s?.attack && state === "windup") return `w:${s.attack}`;
  if (s?.attack) return `a:${s.attack}:${Math.max(0, (s.data?.cut || 0) - 1) % 3}:${s.phase === "recover" ? "r" : "s"}`;
  return `step${Math.floor(((Number(e?.x) || 0) + (Number(e?.y) || 0)) * 2.4) & 1}`;
}
function stamp(ctx, q, draw) {
  const e = q.e, box = DUELIST_SPRITE.box[e.kind] || DUELIST_SPRITE.box.gauntDuelist, lift = Math.max(0, Number(e.hopLift) || 0) * q.u * DUELIST_SPRITE.lift;
  ctx.fillStyle = `rgba(0,0,0,${(DUELIST_SPRITE.shadow / (1 + lift / q.u)).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(q.k, q.b, q.u * .3, q.u * .09, 0, 0, TAU); ctx.fill();
  const pose = duelistPose(e, q.state), r = { ...q, pose, b: q.b - lift };
  if (!canMake()) return draw(ctx, r);
  const u = Math.max(4, Math.round(q.u)), key = `${e.kind}:${pose}:${q.flip}:${u}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    sprite = document.createElement("canvas"); sprite.width = Math.ceil(u * box[0]); sprite.height = Math.ceil(u * box[1]);
    const g = sprite.getContext("2d"); if (!g) return draw(ctx, r);
    draw(g, { ...r, u, k: sprite.width / 2, b: u * box[2], t: 0 });
    sprites.set(key, sprite); if (sprites.size > DUELIST_SPRITE.max) sprites.delete(sprites.keys().next().value);
  }
  const scale = q.u / u, bob = e.reduceMotion || pose === "air" ? 0 : Math.sin(q.t * DUELIST_SPRITE.bob[0]) * q.u * DUELIST_SPRITE.bob[1];
  ctx.drawImage(sprite, q.k - sprite.width * scale / 2, r.b - u * box[2] * scale + bob, sprite.width * scale, sprite.height * scale);
}
function line(ctx, pts, w, color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
function blob(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

// The pose, as angles and offsets: lean (+ forward), crouch (hips down), the weapon arm's hand (forward, up) and the blade's angle
// (radians from forward, + up), the off arm's hand, and the legs' spread (a step, a lunge, tucked in the air).
const POSES = Object.freeze({
  stand: { lean: .04, crouch: 0, hand: [.2, .78], blade: -.55, off: [-.12, .74], legs: [.07, -.07], tuck: 0 },
  step0: { lean: .1, crouch: .01, hand: [.22, .8], blade: -.45, off: [-.16, .78], legs: [.16, -.12], tuck: 0 },
  step1: { lean: .1, crouch: .01, hand: [.2, .78], blade: -.5, off: [-.1, .76], legs: [-.1, .15], tuck: 0 },
  air: { lean: .16, crouch: -.04, hand: [.18, .9], blade: -.2, off: [-.18, .92], legs: [.12, -.06], tuck: .5 },
  load: { lean: -.08, crouch: .05, hand: [-.22, 1.12], blade: 2.2, off: [.14, .86], legs: [.18, -.16], tuck: 0 },
  cut0: { lean: .22, crouch: .07, hand: [.42, .86], blade: -.25, off: [-.18, .8], legs: [.26, -.2], tuck: 0 },
  cut1: { lean: .2, crouch: .06, hand: [.38, 1.02], blade: .55, off: [-.16, .82], legs: [.22, -.22], tuck: 0 },
  cut2: { lean: .26, crouch: .09, hand: [.44, .74], blade: -.75, off: [-.2, .78], legs: [.3, -.22], tuck: 0 },
  crouch: { lean: .3, crouch: .12, hand: [.08, .7], blade: -.9, off: [-.06, .7], legs: [.22, -.2], tuck: 0 },
  dart: { lean: .42, crouch: .1, hand: [.42, .74], blade: -.1, off: [.3, .8], legs: [.34, -.3], tuck: 0 },
  aim: { lean: -.04, crouch: .06, hand: [-.12, .88], blade: .04, off: [.18, .9], legs: [.2, -.18], tuck: 0 },
  thrust: { lean: .3, crouch: .08, hand: [.36, .86], blade: 0, off: [.58, .88], legs: [.34, -.24], tuck: 0 },
  wind: { lean: -.1, crouch: .1, hand: [-.26, .96], blade: 2.7, off: [-.02, .92], legs: [.2, -.2], tuck: 0 },
  swept: { lean: .18, crouch: .14, hand: [.34, .7], blade: -.35, off: [.12, .74], legs: [.28, -.24], tuck: 0 },
});
function poseOf(e, pose) {
  if (pose === "air") return POSES.air;
  if (pose.startsWith("step")) return POSES[pose] || POSES.stand;
  const a = pose.split(":"), id = a[1], cut = Number(a[2]) || 0;
  if (a[0] === "w") return id === "duelTwinCuts" ? POSES.crouch : id === "duelThrust" ? POSES.aim : id === "duelSweep" ? POSES.wind : POSES.load;
  if (id === "duelCombo") return POSES[`cut${cut}`] || POSES.cut0;
  if (id === "duelTwinCuts") return cut ? POSES.cut1 : POSES.dart;
  if (id === "duelThrust") return POSES.thrust;
  return POSES.swept;
}
// One Gaunt: legs, the thin body and its sash, the off arm, the cowl, the weapon arm and its weapon. f: facing (1 right, -1 left).
function drawGaunt(ctx, q, weapon) {
  const { k, b, u, flip: f } = q, B = DUELIST_SPRITE.body, C = DUELIST_SPRITE.colors, P = poseOf(q.e, q.pose), lw = Math.max(1.2, u * B.limb);
  const hipY = b - u * (B.hip - P.crouch), hipX = k + f * u * P.lean * .25, shX = hipX + f * u * P.lean * .5, shY = b - u * (B.shoulder - P.crouch), hx = shX + f * u * P.lean * .12, hy = b - u * (B.head - P.crouch);
  const legs = (side, dx, color) => { const fx = k + f * u * dx, kx = (hipX + fx) / 2 + f * u * (.05 + P.tuck * .12), ky = (hipY + b) / 2 - u * P.tuck * .12, fy = b - u * P.tuck * .22;
    line(ctx, [[hipX + side * u * .025, hipY], [kx, ky], [fx, fy]], lw, color); line(ctx, [[fx - f * u * .02, fy], [fx + f * u * B.foot * 1.2, fy]], lw * 1.3, C.cowl); };
  legs(-1, P.legs[1], C.wrapDark); // the far leg, darker
  legs(1, P.legs[0], C.wrap);
  // the body: a thin wrapped stick, a little wider at the ribs, the sash at the waist and its tail behind
  ctx.fillStyle = C.wrap; ctx.beginPath(); ctx.moveTo(hipX - u * .05, hipY); ctx.lineTo(shX - u * .075, shY); ctx.lineTo(shX + u * .075, shY); ctx.lineTo(hipX + u * .05, hipY); ctx.closePath(); ctx.fill();
  line(ctx, [[hipX - u * .03, hipY - u * .12], [shX - u * .03, shY + u * .1]], Math.max(1, lw * .4), C.wrapDark); // a wrap's seam
  ctx.fillStyle = C.sash; ctx.fillRect(hipX - u * .065, hipY - u * .07, u * .13, u * .06);
  ctx.fillStyle = C.sashDark; ctx.beginPath(); ctx.moveTo(hipX - f * u * .05, hipY - u * .05); ctx.lineTo(hipX - f * u * (.2 + P.lean * .3), hipY + u * .14); ctx.lineTo(hipX - f * u * (.12 + P.lean * .3), hipY + u * .16); ctx.lineTo(hipX - f * u * .02, hipY - u * .02); ctx.closePath(); ctx.fill();
  // the off arm (behind the body for a sword, out front for the second knife or the polearm's far hand)
  const arm = (hand, color) => { const tx = shX + f * u * hand[0], ty = b - u * (hand[1] - P.crouch), ex = (shX + tx) / 2 - f * u * .05, ey = (shY + ty) / 2 + u * .06; line(ctx, [[shX, shY + u * .02], [ex, ey], [tx, ty]], lw, color); return [tx, ty]; };
  const off = arm(P.off, C.wrapDark);
  if (weapon === "daggers") { knife(ctx, off[0], off[1], f, u, P.blade + .6, .28); blob(ctx, off[0], off[1], u * B.hand, C.hand); }
  else if (weapon !== "polearm") blob(ctx, off[0], off[1], u * B.hand * .9, C.hand);
  // the cowl: big and round, its tip falling back, a dark mouth of a hood with nothing inside it, and a lit rim
  const R = u * B.cowl;
  ctx.fillStyle = C.cowl; ctx.beginPath(); ctx.moveTo(hx - f * R * .9, hy + R * .2); ctx.quadraticCurveTo(hx - f * R * 1.9, hy - R * .1, hx - f * R * 1.6, hy + R * 1.2); ctx.lineTo(hx - f * R * .4, hy + R * .9); ctx.closePath(); ctx.fill();
  blob(ctx, hx, hy, R, C.cowl);
  ctx.fillStyle = C.cowlEdge; ctx.beginPath(); ctx.arc(hx, hy, R, -Math.PI * .9, -Math.PI * .25); ctx.lineTo(hx, hy); ctx.closePath(); ctx.globalAlpha *= .5; ctx.fill(); ctx.globalAlpha /= .5;
  ctx.fillStyle = C.void; ctx.beginPath(); ctx.ellipse(hx + f * R * .42, hy + R * .18, R * .48, R * .62, f * .15, 0, TAU); ctx.fill(); // no face: only dark
  ctx.fillStyle = C.cowl; ctx.fillRect(hx - R * .7, hy + R * .75, R * 1.4, R * .5); // the cowl's drape over the shoulders
  // the weapon arm and the weapon
  const hand = arm(P.hand, C.wrap);
  if (weapon === "sword") sword(ctx, hand[0], hand[1], f, u, P.blade);
  else if (weapon === "daggers") knife(ctx, hand[0], hand[1], f, u, P.blade, .3);
  else polearm(ctx, hand, off, f, u, P.blade);
  blob(ctx, hand[0], hand[1], u * B.hand, C.hand); line(ctx, [[hand[0] - u * .03, hand[1]], [hand[0] + u * .03, hand[1]]], Math.max(1, lw * .5), C.band);
}
function sword(ctx, x, y, f, u, a) {
  const C = DUELIST_SPRITE.colors, dx = Math.cos(a) * f, dy = -Math.sin(a), L = u * .72;
  line(ctx, [[x - dx * u * .1, y - dy * u * .1], [x, y]], Math.max(1.5, u * .04), C.wood); // the grip
  line(ctx, [[x - dy * f * u * .07, y + dx * f * u * .07], [x + dy * f * u * .07, y - dx * f * u * .07]], Math.max(1.2, u * .03), C.cowlEdge); // the guard
  ctx.fillStyle = C.steel; ctx.beginPath(); ctx.moveTo(x - dy * u * .028, y + dx * u * .028); ctx.lineTo(x + dx * L, y + dy * L); ctx.lineTo(x + dy * u * .028, y - dx * u * .028); ctx.closePath(); ctx.fill();
  line(ctx, [[x + dx * u * .05, y + dy * u * .05], [x + dx * L * .92, y + dy * L * .92]], Math.max(.8, u * .01), C.edge);
}
function knife(ctx, x, y, f, u, a, len) {
  const C = DUELIST_SPRITE.colors, dx = Math.cos(a) * f, dy = -Math.sin(a), L = u * len;
  ctx.fillStyle = C.steel; ctx.beginPath(); ctx.moveTo(x - dy * u * .025, y + dx * u * .025); ctx.lineTo(x + dx * L, y + dy * L); ctx.lineTo(x + dy * u * .02, y - dx * u * .02); ctx.closePath(); ctx.fill();
  line(ctx, [[x, y], [x + dx * L * .85, y + dy * L * .85]], Math.max(.8, u * .01), C.edge);
}
// The polearm: a long dark shaft through both hands, a glaive's blade at the front end, a butt spike behind.
function polearm(ctx, hand, off, f, u, a) {
  const C = DUELIST_SPRITE.colors, dx = Math.cos(a) * f, dy = -Math.sin(a), [x, y] = hand, front = u * 1.15, back = u * .55;
  line(ctx, [[x - dx * back, y - dy * back], [x + dx * front, y + dy * front]], Math.max(1.5, u * .035), C.wood);
  const tx = x + dx * front, ty = y + dy * front, L = u * .36, nx = -dy, ny = dx;
  ctx.fillStyle = C.steel; ctx.beginPath(); ctx.moveTo(tx - nx * u * .02, ty - ny * u * .02); ctx.quadraticCurveTo(tx + dx * L * .5 + nx * u * .1 * f, ty + dy * L * .5 + ny * u * .1 * f, tx + dx * L, ty + dy * L); ctx.lineTo(tx + nx * u * .03, ty + ny * u * .03); ctx.closePath(); ctx.fill();
  line(ctx, [[tx, ty], [tx + dx * L * .9, ty + dy * L * .9]], Math.max(.8, u * .01), C.edge);
  line(ctx, [[tx - dx * u * .02 - nx * u * .05, ty - dy * u * .02 - ny * u * .05], [tx - dx * u * .02 + nx * u * .05, ty - dy * u * .02 + ny * u * .05]], Math.max(1.2, u * .03), C.band); // the binding
  blob(ctx, off[0], off[1], u * DUELIST_SPRITE.body.hand, C.hand); // the far hand, on the shaft
}

export const DUELIST_BODIES = Object.freeze({
  gauntDuelist: (ctx, q) => stamp(ctx, q, (g, r) => drawGaunt(g, r, "sword")),
  gauntCutthroat: (ctx, q) => stamp(ctx, q, (g, r) => drawGaunt(g, r, "daggers")),
  gauntLongarm: (ctx, q) => stamp(ctx, q, (g, r) => drawGaunt(g, r, "polearm")),
});
