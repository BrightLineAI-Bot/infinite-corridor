// The Pachycephalosaurus's Standard View body and ground art (Tim, 2026-11-27). Drawing only: nothing here changes combat state. It
// reads the pose contract pachy.ts sets (e.pachyPose, pachyForm, pachyShift, pachyAir, pachyDisguised, pachyFx) and never attack timing.
//
// The look (Tim): green over the top, gray beneath with a soft gray blend up into the green, the head and especially the domed crown
// yellow, ringed with gray knobs; a black stripe from the crown down the back to the tail tip; a gray snout and mouth. ARMOR: the same
// beast as a machine of itself, steel plating with seams and rivets over the hide, plated shins and feet, a visor band over the eye and a
// banded steel dome. FOSSIL: the same silhouette in old bone: vertebrae, ribs, a bare skull with its dome and knobs, embers for eyes.
// The rock disguise: a gray boulder, too round and too smooth, a pale yellowish cap on top ringed with gray knobs (the dome, if you look).
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). No gradients, no per-frame arrays.

const TAU = Math.PI * 2;
export const PACHY_ART = Object.freeze({
  // colours (spec)
  body: "#5f9a3c", bodyLight: "#7cb653", bodyDark: "#3f6e27", belly: "#8d9196", bellyLight: "#a9adb2", stripe: "#151515", outline: "#1d2a16",
  head: "#f2d23a", headLight: "#fbe77a", headDark: "#c9a51f", knob: "#8a8f94", knobDark: "#5e6368", snout: "#8d9196", mouth: "#4e5257", eye: "#1c1208", eyeShine: "#fff6c8", claw: "#e8e2cf",
  steel: "#8f9aa6", steelLight: "#c7d0d9", steelDark: "#4d5761", rivet: "#e2e8ee", seam: "#2a3038", visor: "#ff4d2e", gold: "#d8b12a",
  bone: "#e8dfc6", boneShade: "#c2b48f", boneDark: "#7d6f52", socket: "#2a1f14", ember: "#ff8a2a",
  rock: "#8a8780", rockLight: "#a9a69f", rockDark: "#5f5c56", rockCap: "#c9c08a", moss: "#6f8f4a",
  // shape, in body units (u: a tile times the actor's scale)
  hip: .66, crouchDrop: .2, thigh: .3, shin: .3, foot: .16, stride: .2, settle: 6, ease: 12, knobs: 9,
});
// How each contract pose shapes the body: pitch (+ nose up, about the hips), head (+ raises the head on its short neck), crouch, tuck
// (legs folded under in the air), kick (+ near leg thrust forward, - the far one), arms (forward reach of the little arms), dig (the
// dome pressed into the ground), tail (+ lifted).
export const PACHY_POSES = Object.freeze({
  idle: {}, walk: {},
  slamRaise: { pitch: .42, head: .55, crouch: .05, tail: -.2 },
  slam: { pitch: -.5, head: -.75, crouch: .35, tail: .4 },
  chargeReady: { pitch: -.32, head: -.45, crouch: .3, tail: .35 },
  charge: { pitch: -.28, head: -.5, crouch: .15, tail: .4 },
  bonk: { pitch: .2, head: .45, crouch: .2, tail: -.1, daze: 1 },
  domeLoad: { pitch: -.6, head: -.9, crouch: .4, dig: 1, tail: .5 },
  domeFlick: { pitch: .35, head: .7, crouch: .05, tail: -.1 },
  crouch: { crouch: 1, pitch: -.15, head: -.25, tail: .2 },
  air: { tuck: 1, pitch: .1, head: .15, tail: .1 },
  land: { crouch: .8, pitch: -.2, head: -.3, tail: .3 },
  kickL: { kick: 1, pitch: .45, head: .3, tuck: .3, tail: -.3 },
  kickR: { kick: -1, pitch: .45, head: .3, tuck: .3, tail: -.3 },
  butt: { pitch: -.25, head: -.55, crouch: .1, tail: .3 },
  clash: { pitch: -.3, head: -.6, crouch: .25, tail: .35 },
  boneStamp: { crouch: .6, pitch: -.1, head: -.2, tail: .2 },
  skullReady: { pitch: .15, head: .2, arms: 1, tail: 0 },
  skullThrow: { pitch: -.25, head: -.4, arms: .3, tail: .3 },
  burst: { pitch: .3, head: .6, crouch: .1, arms: .6, tail: -.2 },
  armorUp: { crouch: .3, pitch: .1, head: .3, arms: .5 },
  shed: { crouch: .4, pitch: .25, head: .5, daze: .6 },
  feed: { pitch: -.5, head: -.8, crouch: .25, tail: .3 },
  rock: { crouch: 1, tuck: 1, pitch: -.1, head: -.5 },
  dead: { crouch: 1, pitch: -.1, head: -.6, tuck: .5 },
});
const KEYS = ["pitch", "head", "crouch", "tuck", "kick", "arms", "dig", "tail", "daze"];
const MEMO = new WeakMap();
function memo(e) { let m = MEMO.get(e); if (!m) { m = { at: null, x: null, y: null, phase: 0, moving: 0, v: Object.fromEntries(KEYS.map((k) => [k, 0])), pose: "", since: 0 }; MEMO.set(e, m); } return m; }
export const pachyPoseName = (e) => e?.dead ? "dead" : e?.pachyDisguised ? "rock" : e?.pachyPose && PACHY_POSES[e.pachyPose] ? e.pachyPose : null;
// The form shown: flesh, armor (the plating closing over the shift) or fossil (the flesh falling away over the shed).
export function pachyLook(e) {
  const f = e?.pachyForm, k = Math.max(0, Math.min(1, Number(e?.pachyShift) || 0));
  if (f === "fossil") return { form: k >= .5 ? "fossil" : "flesh", k };
  if (f === "armor") return { form: k >= .35 ? "armor" : "flesh", k };
  return { form: "flesh", k: 0 };
}

// ---------------------------------------------------------------- the body
export function drawPachy(ctx, q, now = 0) {
  const A = PACHY_ART, { k, u, flip, e } = q, reduce = !!e.reduceMotion, t = reduce ? 0 : now / 1000, M = memo(e);
  const x = Number(e.x) || 0, y = Number(e.y) || 0, dt = M.at == null ? 0 : Math.min(.1, Math.max(0, (now - M.at) / 1000)), moved = M.x == null ? 0 : Math.hypot(x - M.x, y - M.y);
  M.at = now; M.x = x; M.y = y;
  if (dt > 0 && moved < 2) { M.phase = (M.phase + TAU * moved / (2 * A.stride * Math.max(.6, Number(e.scale) || 1))) % TAU; M.moving += ((moved / dt > .05 ? 1 : 0) - M.moving) * Math.min(1, dt * A.settle); }
  if (reduce) M.moving = 0;
  const name = pachyPoseName(e) || (M.moving > .3 ? "walk" : "idle"); if (name !== M.pose) { M.pose = name; M.since = now; }
  const P = PACHY_POSES[name], V = M.v; for (const key of KEYS) { const want = P[key] || 0; V[key] = !(dt > 0) || reduce ? want : V[key] + (want - V[key]) * Math.min(1, dt * A.ease * (/kick|slam|butt|clash|charge/.test(name) ? 2 : 1)); }
  const look = pachyLook(e);
  if (name === "rock") return drawPachyRock(ctx, k, q.b, u, t, reduce);
  const air = Math.max(0, Number(e.pachyAir) || 0) * q.s, b = q.b - air, ph = M.phase, mv = name === "walk" ? M.moving : 0;
  ctx.save(); ctx.translate(k, b); ctx.scale(flip * u, u);
  // shadow (on the ground, under the lift)
  ctx.save(); ctx.scale(1, 1); ctx.globalAlpha *= Math.max(.25, .5 - air / q.s * .08); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, air / u, .62, .12, 0, 0, TAU); ctx.fill(); ctx.restore();
  const daze = V.daze && !reduce ? Math.sin(t * 7) * .06 * V.daze : 0, breathe = reduce ? 0 : Math.sin(t * 2.2) * .008;
  const hipH = A.hip - V.crouch * A.crouchDrop + Math.abs(Math.sin(ph)) * .02 * mv, pitch = V.pitch + daze;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  // body frame: origin at the hip, x forward, y up (screen y down: negate)
  const R = (fx, fy) => [fx * cp - fy * sp, -(hipH + fx * sp + fy * cp)];
  const form = look.form;
  // far leg first, then the tail, body, near leg, arms, head
  leg(ctx, A, -1, ph, mv, V, hipH, R, form, true);
  tail(ctx, A, R, V, t, form);
  body(ctx, A, R, form, breathe);
  leg(ctx, A, 1, ph, mv, V, hipH, R, form, false);
  arms(ctx, A, R, V, form);
  head(ctx, A, R, V, pitch, form, t, name);
  if (e.pachyForm === "fossil" && look.k < 1 && !reduce) flakes(ctx, A, R, look.k, t); // the shed: hide falling away
  ctx.restore();
  return true;
}
const P2 = (ctx, p) => ctx.lineTo(p[0], p[1]);
function body(ctx, A, R, form, breathe) {
  const bone = form === "fossil", steel = form === "armor";
  // the torso: a pear from the hips to the chest, the back arched
  const top = [[-.34, .02], [-.18, .2 + breathe], [.08, .25 + breathe], [.32, .2], [.46, .1]], under = [[.44, -.08], [.26, -.2 - breathe], [0, -.22 - breathe], [-.26, -.14], [-.36, -.04]];
  if (bone) {
    // ribs and the column
    ctx.strokeStyle = A.boneShade; ctx.lineWidth = .035; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) { const f = -.12 + i * .095, a = R(f, .2 - Math.abs(f - .1) * .25), c = R(f - .05, -.17 + Math.abs(f - .1) * .1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(...R(f + .07, 0), c[0], c[1]); ctx.stroke(); }
    ctx.strokeStyle = A.bone; ctx.lineWidth = .06; ctx.beginPath(); let p = R(top[0][0], top[0][1]); ctx.moveTo(p[0], p[1]); for (const q of top) P2(ctx, R(q[0], q[1] - .02)); ctx.stroke();
    ctx.fillStyle = A.bone; for (let i = 0; i < 7; i++) { const q = R(-.3 + i * .12, .2 - Math.abs(-.3 + i * .12 - .05) * .3); ctx.beginPath(); ctx.arc(q[0], q[1], .035, 0, TAU); ctx.fill(); }
    ctx.fillStyle = A.boneShade; const pv = R(-.08, 0); ctx.beginPath(); ctx.ellipse(pv[0], pv[1], .13, .09, 0, 0, TAU); ctx.fill();
    return;
  }
  ctx.fillStyle = steel ? A.steel : A.body; ctx.strokeStyle = steel ? A.seam : A.outline; ctx.lineWidth = .025;
  ctx.beginPath(); let p = R(top[0][0], top[0][1]); ctx.moveTo(p[0], p[1]); for (let i = 1; i < top.length; i++) P2(ctx, R(...top[i])); for (const q of under) P2(ctx, R(...q)); ctx.closePath(); ctx.fill(); ctx.stroke();
  // the belly: gray, with a soft blend (three bands of growing gray) up into the green
  ctx.save(); ctx.clip();
  const bands = steel ? [[A.steelDark, .5, -.02]] : [[A.belly, .28, .02], [A.belly, .5, -.04], [A.belly, 1, -.1]];
  for (const [c, a, lift] of bands) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); let s = R(-.4, lift); ctx.moveTo(s[0], s[1]); P2(ctx, R(0, lift - .05)); P2(ctx, R(.5, lift - .02)); P2(ctx, R(.5, -.4)); P2(ctx, R(-.4, -.4)); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (!steel) { ctx.fillStyle = A.bodyLight; ctx.globalAlpha = .45; const h = R(.02, .16); ctx.beginPath(); ctx.ellipse(h[0], h[1], .2, .05, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  if (!steel) { ctx.fillStyle = A.knob; ctx.globalAlpha = .5; for (const [f, g] of [[-.2, .05], [.05, .1], [.25, .03]]) { const m = R(f, g); ctx.beginPath(); ctx.ellipse(m[0], m[1], .05, .025, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; } // gray markings
  if (steel) { // the plating: seams across the trunk, rivets along them, a bright edge on top
    ctx.strokeStyle = A.seam; ctx.lineWidth = .02; for (const f of [-.2, .02, .24]) { ctx.beginPath(); let s = R(f, .3); ctx.moveTo(s[0], s[1]); P2(ctx, R(f + .04, -.3)); ctx.stroke(); }
    ctx.fillStyle = A.rivet; for (const f of [-.2, .02, .24]) for (const g of [.14, 0, -.12]) { const r = R(f + .02 - g * .07, g); ctx.beginPath(); ctx.arc(r[0], r[1], .018, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = A.steelLight; ctx.lineWidth = .03; ctx.beginPath(); let s = R(-.3, .06); ctx.moveTo(s[0], s[1]); for (const q of top.slice(1, 4)) P2(ctx, R(q[0], q[1] - .03)); ctx.stroke();
  }
  ctx.restore();
  // the black stripe along the back (into the tail and up to the crown: tail() and head() carry it on)
  ctx.strokeStyle = A.stripe; ctx.lineWidth = steel ? .05 : .06; ctx.lineCap = "round"; ctx.beginPath(); p = R(-.34, .03); ctx.moveTo(p[0], p[1]); for (let i = 1; i < top.length; i++) P2(ctx, R(top[i][0], top[i][1] - .015)); ctx.stroke();
}
function tail(ctx, A, R, V, t, form) {
  const sw = Math.sin(t * 1.6) * .03, lift = V.tail * .25, bone = form === "fossil", steel = form === "armor";
  const pts = [[-.3, .06, .14], [-.55, .06 + lift * .4 + sw, .1], [-.8, .05 + lift * .8 + sw * 2, .06], [-1.02, .05 + lift + sw * 3, .025], [-1.15, .05 + lift * 1.1 + sw * 3.5, .004]];
  if (bone) { ctx.fillStyle = A.bone; for (let i = 0; i < 9; i++) { const s = i / 8, j = Math.min(3, Math.floor(s * 4)), a = pts[j], c = pts[j + 1], w = s * 4 - j, p = R(a[0] + (c[0] - a[0]) * w, a[1] + (c[1] - a[1]) * w); ctx.beginPath(); ctx.arc(p[0], p[1], .045 * (1 - s * .7), 0, TAU); ctx.fill(); } return; }
  ctx.fillStyle = steel ? A.steel : A.body; ctx.strokeStyle = steel ? A.seam : A.outline; ctx.lineWidth = .022;
  ctx.beginPath(); let p = R(pts[0][0], pts[0][1] + pts[0][2]); ctx.moveTo(p[0], p[1]); for (const q of pts) P2(ctx, R(q[0], q[1] + q[2])); for (let i = pts.length - 1; i >= 0; i--) P2(ctx, R(pts[i][0], pts[i][1] - pts[i][2])); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = steel ? A.steelDark : A.belly; ctx.globalAlpha = .55; ctx.beginPath(); p = R(-.3, pts[0][1] - .02); ctx.moveTo(p[0], p[1]); for (const q of pts) P2(ctx, R(q[0], q[1] - q[2] * .2)); for (let i = pts.length - 1; i >= 0; i--) P2(ctx, R(pts[i][0], pts[i][1] - .3)); ctx.fill(); ctx.restore();
  if (steel) { ctx.strokeStyle = A.seam; ctx.lineWidth = .018; for (const j of [1, 2]) { const a = R(pts[j][0], pts[j][1] + pts[j][2]), c = R(pts[j][0], pts[j][1] - pts[j][2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); } }
  ctx.strokeStyle = A.stripe; ctx.lineWidth = .045; ctx.lineCap = "round"; ctx.beginPath(); p = R(pts[0][0], pts[0][1] + pts[0][2] * .85); ctx.moveTo(p[0], p[1]); for (const q of pts) P2(ctx, R(q[0], q[1] + q[2] * .7)); ctx.stroke();
}
function leg(ctx, A, side, ph, mv, V, hipH, R, form, far) {
  const swing = Math.sin(ph + (side < 0 ? Math.PI : 0)) * .22 * mv, liftF = Math.max(0, Math.cos(ph + (side < 0 ? Math.PI : 0))) * .08 * mv;
  const kick = V.kick * side, tuck = V.tuck;
  const hip = R(-.02, -.02);
  const fxS = hip[0] + swing + Math.max(0, kick) * .55 - Math.max(0, -kick) * .15, footY = -(liftF + tuck * .32 + Math.max(0, kick) * .32);
  const kx = (hip[0] + fxS) / 2 + .14 + tuck * .12 + Math.max(0, kick) * .1, ky = (hip[1] + footY) / 2 - .02 - tuck * .05, ankle = [fxS - .05, footY - .07];
  const bone = form === "fossil", steel = form === "armor", c = bone ? (far ? A.boneShade : A.bone) : steel ? (far ? A.steelDark : A.steel) : far ? A.bodyDark : A.body;
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = c;
  ctx.lineWidth = bone ? .06 : .17; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(kx, ky); ctx.stroke(); // the thigh
  ctx.lineWidth = bone ? .05 : .09; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ankle[0], ankle[1]); ctx.stroke(); // the shin
  ctx.lineWidth = bone ? .04 : .06; ctx.beginPath(); ctx.moveTo(ankle[0], ankle[1]); ctx.lineTo(fxS + .12, footY); ctx.stroke(); // the foot
  if (!bone && !steel) { ctx.strokeStyle = A.belly; ctx.globalAlpha *= .5; ctx.lineWidth = .06; ctx.beginPath(); ctx.moveTo(hip[0] + .02, hip[1] + .05); ctx.lineTo(kx - .02, ky + .02); ctx.stroke(); ctx.globalAlpha /= .5; }
  if (steel) { ctx.fillStyle = A.steelLight; ctx.strokeStyle = A.seam; ctx.lineWidth = .015; ctx.beginPath(); ctx.ellipse(kx, ky, .07, .06, 0, 0, TAU); ctx.fill(); ctx.stroke(); // knee cap
    ctx.fillStyle = A.steelDark; ctx.beginPath(); ctx.moveTo(ankle[0] - .04, ankle[1] - .03); ctx.lineTo(fxS + .16, footY - .02); ctx.lineTo(fxS + .16, footY + .015); ctx.lineTo(ankle[0] - .05, footY + .015); ctx.closePath(); ctx.fill(); } // the plated foot
  if (bone) { ctx.fillStyle = A.boneShade; ctx.beginPath(); ctx.arc(kx, ky, .04, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = A.claw; ctx.lineWidth = .025; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(fxS + .1, footY - i * .015); ctx.lineTo(fxS + .17, footY + .01 - i * .02); ctx.stroke(); }
}
function arms(ctx, A, R, V, form) {
  const sh = R(.36, -.04), reach = V.arms, el = [sh[0] + .06 + reach * .08, sh[1] + .1 - reach * .06], hand = [el[0] + .08 + reach * .06, el[1] - .02 - reach * .04];
  ctx.strokeStyle = form === "fossil" ? A.bone : form === "armor" ? A.steel : A.bodyDark; ctx.lineWidth = form === "fossil" ? .03 : .05; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(el[0], el[1]); ctx.lineTo(hand[0], hand[1]); ctx.stroke();
  ctx.strokeStyle = A.claw; ctx.lineWidth = .016; ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(hand[0] + .04, hand[1] + .03); ctx.stroke();
}
function head(ctx, A, R, V, pitch, form, t, name) {
  // a short thick neck up and forward from the chest; the head on it, its angle the body's pitch plus the head's own
  const neck = R(.42, .1), ha = pitch + V.head * .9 - .15, hc = Math.cos(ha), hs = Math.sin(ha), hx = neck[0] + Math.cos(pitch + .55 + V.head * .5) * .2, hy = neck[1] - Math.sin(pitch + .55 + V.head * .5) * .2;
  const H = (fx, fy) => [hx + fx * hc - fy * hs, hy - (fx * hs + fy * hc)];
  const bone = form === "fossil", steel = form === "armor";
  // the neck
  ctx.strokeStyle = bone ? A.bone : steel ? A.steel : A.body; ctx.lineCap = "round"; ctx.lineWidth = bone ? .05 : .17; ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(hx, hy); ctx.stroke();
  if (!bone) { ctx.strokeStyle = A.stripe; ctx.lineWidth = .05; const a = R(.44, .19); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(...H(-.08, .1)); ctx.stroke(); }
  // the snout and jaw: gray (as bone: the bare skull)
  const open = name === "burst" || name === "feed" ? .5 : name === "skullReady" ? .3 : 0;
  ctx.fillStyle = bone ? A.bone : steel ? A.steelDark : A.snout; ctx.strokeStyle = bone ? A.boneDark : steel ? A.seam : A.outline; ctx.lineWidth = .02;
  ctx.beginPath(); let p = H(-.02, .02); ctx.moveTo(p[0], p[1]); P2(ctx, H(.2, .02)); P2(ctx, H(.27, -.03)); P2(ctx, H(.22, -.07 - open * .02)); P2(ctx, H(.02, -.09)); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = bone ? A.boneShade : A.mouth; ctx.beginPath(); p = H(.02, -.09); ctx.moveTo(p[0], p[1]); P2(ctx, H(.22, -.07)); P2(ctx, H(.2, -.1 - open * .1)); P2(ctx, H(.02, -.12 - open * .05)); ctx.closePath(); ctx.fill();
  // the head itself (yellow), and the great dome above and behind the eye
  ctx.fillStyle = bone ? A.bone : steel ? A.steel : A.head; ctx.strokeStyle = bone ? A.boneDark : steel ? A.seam : A.headDark; ctx.lineWidth = .02;
  p = H(.02, 0); ctx.beginPath(); ctx.ellipse(p[0], p[1], .13, .1, -ha, 0, TAU); ctx.fill(); ctx.stroke();
  const d = H(-.02, .12); ctx.fillStyle = bone ? A.bone : steel ? A.steelLight : A.head; ctx.beginPath(); ctx.ellipse(d[0], d[1], .16, .14, -ha, Math.PI * .95, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (!bone && !steel) { ctx.fillStyle = A.headLight; ctx.globalAlpha *= .7; const g = H(-.05, .2); ctx.beginPath(); ctx.ellipse(g[0], g[1], .07, .035, -ha, 0, TAU); ctx.fill(); ctx.globalAlpha /= .7; }
  if (steel) { ctx.strokeStyle = A.seam; ctx.lineWidth = .016; for (const f of [-.07, .03]) { ctx.beginPath(); ctx.moveTo(...H(f, .03)); ctx.lineTo(...H(f - .02, .25)); ctx.stroke(); } }
  // the black stripe from the crown down the back of the head into the neck
  if (!bone) { ctx.strokeStyle = A.stripe; ctx.lineWidth = .04; ctx.beginPath(); ctx.moveTo(...H(0, .26)); ctx.quadraticCurveTo(...H(-.16, .22), ...H(-.14, .06)); ctx.stroke(); }
  // the knobs ringing the dome (gray; as bone, bone)
  ctx.fillStyle = bone ? A.boneShade : steel ? A.rivet : A.knob; ctx.strokeStyle = bone ? A.boneDark : A.knobDark; ctx.lineWidth = .01;
  for (let i = 0; i < A.knobs; i++) { const a = Math.PI * (1.05 + i / (A.knobs - 1) * .95), kp = [d[0] + Math.cos(a - ha) * .165, d[1] + Math.sin(a - ha) * .145 + .015]; ctx.beginPath(); ctx.arc(kp[0], kp[1], i % 2 ? .022 : .028, 0, TAU); ctx.fill(); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { const kp = H(.12 + i * .045, .05 - i * .01); ctx.beginPath(); ctx.arc(kp[0], kp[1], .016, 0, TAU); ctx.fill(); } // knobs down the snout
  // the eye (a visor band in the armor; embers in the fossil's socket)
  const ey = H(.06, .03);
  if (steel) { ctx.fillStyle = A.seam; ctx.beginPath(); ctx.ellipse(ey[0], ey[1], .06, .022, -ha, 0, TAU); ctx.fill(); ctx.fillStyle = A.visor; ctx.globalAlpha *= .85 + .15 * Math.sin(t * 6); ctx.beginPath(); ctx.ellipse(ey[0], ey[1], .045, .012, -ha, 0, TAU); ctx.fill(); ctx.globalAlpha = Math.min(1, ctx.globalAlpha / (.85 + .15 * Math.sin(t * 6))); }
  else if (bone) { ctx.fillStyle = A.socket; ctx.beginPath(); ctx.arc(ey[0], ey[1], .03, 0, TAU); ctx.fill(); ctx.fillStyle = A.ember; ctx.beginPath(); ctx.arc(ey[0], ey[1], .012, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = A.eye; ctx.beginPath(); ctx.arc(ey[0], ey[1], .02, 0, TAU); ctx.fill(); ctx.fillStyle = A.eyeShine; ctx.beginPath(); ctx.arc(ey[0] + .006, ey[1] - .007, .006, 0, TAU); ctx.fill(); }
}
function flakes(ctx, A, R, k, t) { // the shed: pieces of green hide falling away from the bones
  ctx.fillStyle = A.body; for (let i = 0; i < 6; i++) { const f = -.3 + i * .14, fall = k * (.4 + (i % 3) * .2), p = R(f, .15 - fall); ctx.globalAlpha = Math.max(0, 1 - k); ctx.beginPath(); ctx.ellipse(p[0], p[1] + fall * .2, .07, .04, i + t, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// The rock disguise: a gray boulder, too round and too smooth, a pale yellowish cap on top ringed with gray knobs. It breathes, barely.
export function drawPachyRock(ctx, k, b, u, t = 0, reduce = false) {
  const A = PACHY_ART, br = reduce ? 0 : Math.sin(t * 1.3) * .012;
  ctx.save(); ctx.translate(k, b); ctx.scale(u, u);
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 0, .6, .12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = A.rock; ctx.strokeStyle = A.rockDark; ctx.lineWidth = .03;
  ctx.beginPath(); ctx.moveTo(-.56, 0); ctx.bezierCurveTo(-.6, -.38 - br, -.3, -.62 - br, .02, -.62 - br); ctx.bezierCurveTo(.36, -.62 - br, .6, -.36 - br, .55, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = A.rockDark; ctx.globalAlpha = .5; ctx.beginPath(); ctx.ellipse(.05, -.08, .48, .1, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = A.rockLight; ctx.beginPath(); ctx.ellipse(-.2, -.38 - br, .14, .06, -.4, 0, TAU); ctx.fill();
  ctx.fillStyle = A.rockCap; ctx.strokeStyle = A.rockDark; ctx.beginPath(); ctx.ellipse(.06, -.56 - br, .22, .1, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke(); // the dome, if you look
  ctx.fillStyle = A.knob; for (let i = 0; i < 7; i++) { const a = Math.PI * (1 + i / 6); ctx.beginPath(); ctx.arc(.06 + Math.cos(a) * .25, -.55 - br + Math.sin(a) * .12 + .02, .028, 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.moss; ctx.globalAlpha = .6; ctx.beginPath(); ctx.ellipse(-.32, -.12, .12, .04, .3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- the ground: rocks in flight, skulls, bone spikes and rings
// `s` pixels a tile; drawn in the world's tile space (as apato-render.ts drawApatoGround). No allocation.
export function drawPachyGround(ctx, e, s, now = 0, { quiet = false } = {}) {
  const F = e?.pachyFx; if (!F) return false; const A = PACHY_ART, t = quiet ? 0 : now / 1000;
  ctx.save();
  for (const q of F.rocks) { if (!q.on) continue; const k = q.delay > 0 ? 0 : Math.min(1, q.t / (q.total || 1)), tx = (q.tx + .5) * s, ty = (q.ty + .6) * s;
    ctx.strokeStyle = "rgba(255,120,60,.8)"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.arc(tx, ty, .85 * s * (1 - k * .15), 0, TAU); ctx.stroke(); // its landing mark
    ctx.fillStyle = "rgba(255,120,60,.18)"; ctx.beginPath(); ctx.arc(tx, ty, .85 * s * k, 0, TAU); ctx.fill();
    if (q.delay > 0) continue; const x = (q.fx + (q.tx - q.fx) * k + .5) * s, y = (q.fy + (q.ty - q.fy) * k + .6) * s - Math.sin(Math.PI * k) * 3 * s;
    ctx.fillStyle = A.rock; ctx.strokeStyle = A.rockDark; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.ellipse(x, y, s * .2, s * .16, k * 6, 0, TAU); ctx.fill(); ctx.stroke(); }
  for (const q of F.skulls) { if (!q.on) continue; const x = (q.x + .5) * s, y = (q.y + .45) * s, a = Math.atan2(q.vy, q.vx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.sin(q.spin) * .3); ctx.fillStyle = A.bone; ctx.strokeStyle = A.boneDark; ctx.lineWidth = Math.max(1, s * .025);
    ctx.beginPath(); ctx.arc(-s * .04, 0, s * .2, Math.PI * .6, Math.PI * 1.4 + Math.PI * .6 + .6); ctx.lineTo(s * .24, s * .05); ctx.lineTo(s * .02, s * .12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = A.socket; ctx.beginPath(); ctx.arc(s * .06, -s * .02, s * .04, 0, TAU); ctx.fill(); ctx.fillStyle = A.ember; ctx.beginPath(); ctx.arc(s * .06, -s * .02, s * .015, 0, TAU); ctx.fill();
    ctx.fillStyle = A.boneShade; for (let i = 0; i < 5; i++) { const b2 = Math.PI * (.7 + i * .15); ctx.beginPath(); ctx.arc(-s * .04 + Math.cos(b2) * s * .2, Math.sin(b2) * s * .2, s * .03, 0, TAU); ctx.fill(); }
    ctx.restore(); }
  for (const q of F.bones) { if (!q.on) continue; const x = (q.x + .5) * s, y = (q.y + .65) * s;
    if (q.t < q.warn) { const k = q.t / q.warn; ctx.strokeStyle = `rgba(232,223,198,${(.4 + .5 * k).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.arc(x, y, .7 * s, 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(90,70,40,.35)"; ctx.beginPath(); ctx.ellipse(x, y, .7 * s * k, .3 * s * k, 0, 0, TAU); ctx.fill(); continue; }
    const up = Math.min(1, (q.t - q.warn) / .12) * (1 - Math.max(0, (q.t - q.warn - q.up + .2) / .2)); ctx.fillStyle = A.bone; ctx.strokeStyle = A.boneDark; ctx.lineWidth = Math.max(1, s * .025);
    for (const [dx, h] of [[-.18, .7], [0, 1], [.2, .6]]) { ctx.beginPath(); ctx.moveTo(x + (dx - .09) * s, y); ctx.lineTo(x + dx * s + Math.sin(t * 3) * 0, y - h * up * s * 1.1); ctx.lineTo(x + (dx + .09) * s, y); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  for (const q of F.waves) { if (!q.on) continue; const x = (q.x + .5) * s, y = (q.y + .6) * s, k = Math.min(1, q.t / (q.total || 1));
    ctx.strokeStyle = `rgba(214,190,140,${(.8 * (1 - k)).toFixed(3)})`; ctx.lineWidth = Math.max(2, s * .12 * (1 - k * .5)); ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, q.r * s), Math.max(1, q.r * s * .55), 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  return true;
}
