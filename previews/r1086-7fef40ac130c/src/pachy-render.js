// The Pachycephalosaurus's Standard View body and ground art (Tim, 2026-11-27). Drawing only: nothing here changes combat state. It
// reads the pose contract pachy.ts sets (e.pachyPose, pachyForm, pachyShift, pachyAir, pachyDisguised, pachyFx) and never attack timing.
//
// The look (Tim): green over the top, gray beneath with a soft gray blend up into the green, the head and especially the domed crown
// yellow, ringed with gray knobs; a black stripe from the crown down the back to the tail tip; a gray snout and mouth. ARMOR: the same
// beast as a machine of itself, steel plating with seams and rivets over the hide, plated shins and feet, a visor band over the eye and a
// banded steel dome. FOSSIL: the same silhouette in old bone: vertebrae, ribs, a bare skull with its dome and knobs, embers for eyes.
// The rock disguise: a gray boulder, too round and too smooth, a pale yellowish cap on top ringed with gray knobs (the dome, if you look).
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). No gradients, no per-frame arrays.
import { PACHY } from "./pachy.js?v=r1086-7fef40ac130c"; // the daze's time (PACHY.daze.stars)

const TAU = Math.PI * 2;
export const PACHY_ART = Object.freeze({
  // colours (spec)
  body: "#5f9a3c", bodyLight: "#7cb653", bodyDark: "#3f6e27", belly: "#8d9196", bellyLight: "#a9adb2", stripe: "#151515", outline: "#1d2a16",
  head: "#f2d23a", headLight: "#fbe77a", headDark: "#c9a51f", knob: "#8a8f94", knobDark: "#5e6368", snout: "#8d9196", mouth: "#4e5257", eye: "#1c1208", eyeShine: "#fff6c8", claw: "#e8e2cf",
  steel: "#8f9aa6", steelLight: "#c7d0d9", steelDark: "#4d5761", rivet: "#e2e8ee", seam: "#2a3038", visor: "#ff4d2e", gold: "#d8b12a",
  bone: "#e8dfc6", boneShade: "#c2b48f", boneDark: "#7d6f52", socket: "#2a1f14", ember: "#ff8a2a",
  rock: "#8a8780", rockLight: "#a9a69f", rockDark: "#5f5c56", rockCap: "#c9c08a", moss: "#6f8f4a",
  // shape, in body units (u: a tile times the actor's scale)
  hip: .66, crouchDrop: .2, thigh: .3, shin: .3, foot: .16, stride: .2, settle: 6, ease: 12, knobs: 7, headScale: .86,
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
  drumRaise: { pitch: .3, head: .6, crouch: .3, tail: -.15 }, // Dome Drum: feet planted, the dome reared up...
  drum: { pitch: -.62, head: -.95, crouch: .5, tail: .5 }, // ...and knocked down on the ground, beat after beat
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
  const P = PACHY_POSES[name], V = M.v; for (const key of KEYS) { const want = P[key] || 0; V[key] = !(dt > 0) || reduce ? want : V[key] + (want - V[key]) * Math.min(1, dt * A.ease * (/kick|slam|butt|clash|charge|drum/.test(name) ? 2 : 1)); }
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
  // far leg and arm first, then one hide (tail, trunk and neck in a single outline), the near leg grown out of it, the arm, the head
  const hd = headFrame(R, V, pitch);
  leg(ctx, A, -1, ph, mv, V, hipH, R, form, true);
  if (form !== "fossil") arms(ctx, A, R, V, form, true);
  if (form === "fossil") { tail(ctx, A, R, V, t, form); body(ctx, A, R, form, breathe); } else hide(ctx, A, R, V, t, form, breathe, hd);
  leg(ctx, A, 1, ph, mv, V, hipH, R, form, false);
  arms(ctx, A, R, V, form, false);
  head(ctx, A, R, V, pitch, form, t, name, hd);
  if (e.pachyForm === "fossil" && look.k < 1 && !reduce) flakes(ctx, A, R, look.k, t); // the shed: hide falling away
  ctx.restore();
  return true;
}
const P2 = (ctx, p) => ctx.lineTo(p[0], p[1]);
// A reused point buffer for the one-outline hide (no per-frame arrays): push points, then trace them as one smooth closed curve.
const PB = new Float64Array(96); let pbN = 0;
const pb = (p) => { PB[pbN * 2] = p[0]; PB[pbN * 2 + 1] = p[1]; pbN++; };
function traceSmooth(ctx) { // a closed curve through the midpoints, each buffered point a control point
  const n = pbN, mx = (i) => (PB[(i % n) * 2] + PB[((i + 1) % n) * 2]) / 2, my = (i) => (PB[(i % n) * 2 + 1] + PB[((i + 1) % n) * 2 + 1]) / 2;
  ctx.beginPath(); ctx.moveTo(mx(0), my(0)); for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(PB[(i % n) * 2], PB[(i % n) * 2 + 1], mx(i), my(i)); ctx.closePath(); }
// The head's frame: the neck's root on the chest, the head's centre and its angle (the body's pitch plus the head's own).
const HF = { nx: 0, ny: 0, hx: 0, hy: 0, ha: 0, hc: 1, hs: 0 };
function headFrame(R, V, pitch) {
  const neck = R(.4, .08); HF.nx = neck[0]; HF.ny = neck[1]; HF.ha = pitch + V.head * .9 - .15; HF.hc = Math.cos(HF.ha); HF.hs = Math.sin(HF.ha);
  const na = pitch + .6 + V.head * .5; HF.hx = neck[0] + Math.cos(na) * .2; HF.hy = neck[1] - Math.sin(na) * .2; return HF; }
const HP = (hd, fx, fy) => { fx *= PACHY_ART.headScale; fy *= PACHY_ART.headScale; return [hd.hx + fx * hd.hc - fy * hd.hs, hd.hy - (fx * hd.hs + fy * hd.hc)]; };
// The tail's centre line [f, lift, half thickness] for this frame.
const TAILP = [[-.3, .06, .15], [-.55, .06, .105], [-.8, .05, .065], [-1.02, .05, .03], [-1.16, .05, .006]], TL = TAILP.map((q) => q.slice());
function tailLine(V, t) { const sw = Math.sin(t * 1.6) * .03, lift = V.tail * .25; for (let i = 0; i < TL.length; i++) { const w = [0, .4, .8, 1, 1.1][i]; TL[i][0] = TAILP[i][0]; TL[i][1] = TAILP[i][1] + lift * w + sw * [0, 1, 2, 3, 3.5][i]; TL[i][2] = TAILP[i][2]; } return TL; }
// The hide: the tail, the trunk and the neck as one shape with one outline, the gray belly blended up into the green inside it, the
// black stripe as one line from the tail tip up the neck to the crown. As armor: the same shape in steel, plated in overlapping bands.
function hide(ctx, A, R, V, t, form, breathe, hd) {
  const steel = form === "armor", L = tailLine(V, t);
  pbN = 0;
  pb(R(L[4][0], L[4][1]));
  for (let i = 3; i >= 1; i--) pb(R(L[i][0], L[i][1] + L[i][2]));
  pb(R(-.32, .2 + breathe)); pb(R(.04, .3 + breathe)); pb(R(.32, .25));
  pb(HP(hd, -.24, .06)); pb(HP(hd, -.1, .07)); // the nape, into the back of the skull
  pb(HP(hd, -.02, -.07)); pb(HP(hd, -.14, -.1)); // the throat
  pb(R(.48, -.07)); pb(R(.32, -.25 - breathe)); pb(R(.02, -.28 - breathe)); pb(R(-.28, -.15));
  for (let i = 1; i <= 3; i++) pb(R(L[i][0], L[i][1] - L[i][2] * (i === 1 ? .9 : 1)));
  ctx.fillStyle = steel ? A.steel : A.body; ctx.strokeStyle = steel ? A.seam : A.outline; ctx.lineWidth = .024; ctx.lineJoin = "round";
  traceSmooth(ctx); ctx.fill();
  ctx.save(); ctx.clip();
  // the belly: gray, blended up into the green in soft steps (the same steps along the tail, the throat and the chest)
  const steps = steel ? [[A.steelDark, .35, .0], [A.steelDark, .45, -.08]] : [[A.belly, .22, .04], [A.belly, .35, -.02], [A.belly, .55, -.08], [A.bellyLight, .35, -.15]];
  for (const [c, a, lift] of steps) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); let q = R(L[4][0], L[4][1] - .01); ctx.moveTo(q[0], q[1]);
    for (let i = 3; i >= 0; i--) P2(ctx, R(L[i][0], L[i][1] - L[i][2] * .35 + lift * .5)); P2(ctx, R(-.1, lift - .02)); P2(ctx, R(.25, lift - .02)); P2(ctx, R(.42, lift + .06)); P2(ctx, HP(hd, -.1, -.03 + lift * .5));
    P2(ctx, HP(hd, 0, -.4)); P2(ctx, R(.5, -.5)); P2(ctx, R(-1.3, -.5)); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (!steel) { // the yellow of the head blending down the nape into the green (no hard collar where the head meets the neck)
    ctx.fillStyle = A.head; for (const [a, f, r] of [[.25, -.3, .2], [.4, -.24, .14], [.6, -.18, .09]]) { ctx.globalAlpha = a; const c = HP(hd, f, .02); ctx.beginPath(); ctx.ellipse(c[0], c[1], r, r * .8, -hd.ha, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; }
  if (!steel) {
    ctx.fillStyle = A.bodyLight; ctx.globalAlpha = .4; let h = R(.02, .17); ctx.beginPath(); ctx.ellipse(h[0], h[1], .24, .05, 0, 0, TAU); ctx.fill(); h = R(-.5, .13 + L[1][1] - .06); ctx.beginPath(); ctx.ellipse(h[0], h[1], .16, .025, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = A.knob; ctx.globalAlpha = .4; for (const [f, g, r] of [[-.2, .06, .05], [.06, .1, .045], [.26, .04, .04], [-.48, .1, .035], [-.7, .07, .025]]) { const m = R(f, g); ctx.beginPath(); ctx.ellipse(m[0], m[1], r, r * .55, 0, 0, TAU); ctx.fill(); } // gray markings
    ctx.globalAlpha = 1;
  } else { // overlapping plates down the back and tail, their rear lips lit, rivets on each; the seam under them
    ctx.lineWidth = .02; for (const [f, h] of [[-.98, .06], [-.76, .09], [-.54, .13], [-.3, .2], [-.04, .27], [.22, .25], [.4, .2]]) {
      const i = f < -.3 ? (f < -.8 ? 2.6 : f < -.6 ? 2 : 1.2) : 0, base = f < -.3 ? L[Math.min(4, Math.round(i))][1] : 0, a = R(f, base + h), c = R(f + .02, base - h * .8);
      ctx.strokeStyle = A.seam; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      ctx.strokeStyle = A.steelLight; ctx.globalAlpha = .7; ctx.beginPath(); const a2 = R(f + .025, base + h * .95), c2 = R(f + .04, base); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = A.rivet; const rv = R(f + .05, base + h * .55); ctx.beginPath(); ctx.arc(rv[0], rv[1], .014, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = A.visor; ctx.lineWidth = .014; ctx.globalAlpha = .9; for (let j = 0; j < 3; j++) { const a = R(.3 + j * .04, .04 - j * .03), c = R(.36 + j * .04, .04 - j * .03); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); } ctx.globalAlpha = 1; // the glowing vents
    ctx.strokeStyle = A.steelLight; ctx.lineWidth = .03; ctx.beginPath(); let q = R(-.24, .15); ctx.moveTo(q[0], q[1]); P2(ctx, R(.06, .22)); P2(ctx, R(.28, .18)); ctx.stroke();
  }
  ctx.restore();
  traceSmooth(ctx); ctx.stroke();
  // the black stripe: one line from the tail tip along the back and up the nape to the crown (head() carries it over the dome)
  ctx.strokeStyle = A.stripe; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = steel ? .04 : .05;
  ctx.beginPath(); let q = R(L[4][0] + .02, L[4][1]); ctx.moveTo(q[0], q[1]); for (let i = 3; i >= 1; i--) P2(ctx, R(L[i][0], L[i][1] + L[i][2] * .8));
  for (const [f, g] of [[-.26, .19 + breathe], [.06, .26 + breathe], [.3, .215]]) P2(ctx, R(f, g)); P2(ctx, HP(hd, -.24, .045)); P2(ctx, HP(hd, -.12, .07)); ctx.stroke();
}
function body(ctx, A, R, form, breathe) { // the fossil's trunk: ribs and the column
  const top = [[-.34, .02], [-.18, .2 + breathe], [.08, .25 + breathe], [.32, .2], [.46, .1]];
  ctx.strokeStyle = A.boneShade; ctx.lineWidth = .035; ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) { const f = -.12 + i * .095, a = R(f, .2 - Math.abs(f - .1) * .25), c = R(f - .05, -.17 + Math.abs(f - .1) * .1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(...R(f + .07, 0), c[0], c[1]); ctx.stroke(); }
  ctx.strokeStyle = A.bone; ctx.lineWidth = .06; ctx.beginPath(); let p = R(top[0][0], top[0][1]); ctx.moveTo(p[0], p[1]); for (const q of top) P2(ctx, R(q[0], q[1] - .02)); ctx.stroke();
  ctx.fillStyle = A.bone; ctx.strokeStyle = A.bone; ctx.lineWidth = .022; for (let i = 0; i < 7; i++) { const f = -.3 + i * .12, h = .2 - Math.abs(f - .05) * .3, q = R(f, h); ctx.beginPath(); ctx.arc(q[0], q[1], .035, 0, TAU); ctx.fill(); const sp = R(f - .02, h + .08); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(sp[0], sp[1]); ctx.stroke(); } // vertebrae and their spines
  ctx.fillStyle = A.boneShade; const pv = R(-.08, 0); ctx.beginPath(); ctx.ellipse(pv[0], pv[1], .13, .09, 0, 0, TAU); ctx.fill();
  void form;
}
function tail(ctx, A, R, V, t) { // the fossil's tail: a run of vertebrae
  const L = tailLine(V, t);
  ctx.strokeStyle = A.boneShade; ctx.lineWidth = .025; ctx.beginPath(); let p0 = R(L[0][0], L[0][1]); ctx.moveTo(p0[0], p0[1]); for (const q of L) P2(ctx, R(q[0], q[1])); ctx.stroke();
  ctx.fillStyle = A.bone; for (let i = 0; i < 16; i++) { const s = i / 15, j = Math.min(3, Math.floor(s * 4)), a = L[j], c = L[j + 1], w = s * 4 - j, p = R(a[0] + (c[0] - a[0]) * w, a[1] + (c[1] - a[1]) * w); ctx.beginPath(); ctx.ellipse(p[0], p[1], .04 * (1 - s * .6), .05 * (1 - s * .6), 0, 0, TAU); ctx.fill(); }
}
function leg(ctx, A, side, ph, mv, V, hipH, R, form, far) {
  const swing = Math.sin(ph + (side < 0 ? Math.PI : 0)) * .22 * mv + (far ? -.09 : .03), liftF = Math.max(0, Math.cos(ph + (side < 0 ? Math.PI : 0))) * .08 * mv;
  const kick = V.kick * side, tuck = V.tuck;
  const hip = R(-.02, -.02);
  const fxS = hip[0] + swing + Math.max(0, kick) * .55 - Math.max(0, -kick) * .15, footY = -(liftF + tuck * .32 + Math.max(0, kick) * .32);
  const kx = (hip[0] + fxS) / 2 + .14 + tuck * .12 + Math.max(0, kick) * .1, ky = (hip[1] + footY) / 2 - .02 - tuck * .05, ankle = [fxS - .05, footY - .07];
  const bone = form === "fossil", steel = form === "armor", c = bone ? (far ? A.boneShade : A.bone) : steel ? (far ? A.steelDark : A.steel) : far ? A.bodyDark : A.body;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (bone) { ctx.strokeStyle = c; ctx.lineWidth = .06; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(kx, ky); ctx.stroke(); }
  else { // the thigh: a drumstick grown out of the hide (broad at the hip, no outline where it joins), the shin and foot below it
    const dx = kx - hip[0], dy = ky - hip[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(hip[0] + nx * .15 - dx / l * .08, hip[1] + ny * .15 - dy / l * .08);
    ctx.quadraticCurveTo(hip[0] + nx * .16 + dx * .55, hip[1] + ny * .16 + dy * .55, kx + nx * .05, ky + ny * .05); ctx.lineTo(kx - nx * .05, ky - ny * .05);
    ctx.quadraticCurveTo(hip[0] - nx * .15 + dx * .45, hip[1] - ny * .15 + dy * .45, hip[0] - nx * .13 - dx / l * .08, hip[1] - ny * .13 - dy / l * .08); ctx.closePath(); ctx.fill();
    if (!far) { ctx.save(); ctx.clip(); ctx.fillStyle = steel ? A.steelDark : A.belly; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(hip[0] - nx * .12 + dx * .5, hip[1] - ny * .12 + dy * .5, .1, .2, Math.atan2(dy, dx), 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = steel ? A.seam : A.outline; ctx.lineWidth = .022; ctx.beginPath(); ctx.moveTo(hip[0] + nx * .158 + dx * .3, hip[1] + ny * .158 + dy * .3); ctx.quadraticCurveTo(hip[0] + nx * .16 + dx * .55, hip[1] + ny * .16 + dy * .55, kx + nx * .05, ky + ny * .05); ctx.stroke(); }
  }
  ctx.strokeStyle = steel ? (far ? A.steelDark : A.steel) : c;
  ctx.lineWidth = bone ? .05 : .095; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ankle[0], ankle[1]); ctx.stroke(); // the shin
  ctx.strokeStyle = bone ? c : steel ? A.steelDark : far ? A.bodyDark : A.bodyDark; ctx.lineWidth = bone ? .04 : .065; ctx.beginPath(); ctx.moveTo(ankle[0], ankle[1]); ctx.lineTo(fxS + .12, footY); ctx.stroke(); // the foot
  if (steel) { // a shin guard and knee plate riveted onto the leg, the foot plated
    ctx.strokeStyle = A.steelDark; ctx.lineWidth = .11; ctx.beginPath(); ctx.moveTo(kx + (ankle[0] - kx) * .25, ky + (ankle[1] - ky) * .25); ctx.lineTo(kx + (ankle[0] - kx) * .85, ky + (ankle[1] - ky) * .85); ctx.stroke();
    ctx.fillStyle = A.steelLight; ctx.strokeStyle = A.seam; ctx.lineWidth = .014; ctx.beginPath(); ctx.ellipse(kx, ky, .06, .05, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = A.rivet; const m = [kx + (ankle[0] - kx) * .55, ky + (ankle[1] - ky) * .55]; ctx.beginPath(); ctx.arc(m[0] + .02, m[1], .013, 0, TAU); ctx.fill(); }
  if (bone) { ctx.fillStyle = A.boneShade; ctx.beginPath(); ctx.arc(kx, ky, .04, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = A.claw; ctx.lineWidth = .025; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(fxS + .1, footY - i * .015); ctx.lineTo(fxS + .17, footY + .01 - i * .02); ctx.stroke(); }
}
function arms(ctx, A, R, V, form, far) {
  const sh = R(far ? .34 : .36, far ? -.02 : -.05), reach = V.arms, el = [sh[0] + .06 + reach * .08, sh[1] + .1 - reach * .06], hand = [el[0] + .08 + reach * .06, el[1] - .02 - reach * .04];
  ctx.strokeStyle = form === "fossil" ? A.bone : form === "armor" ? (far ? A.steelDark : A.steel) : far ? A.bodyDark : A.body; ctx.lineWidth = form === "fossil" ? .03 : .055; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(el[0], el[1]); ctx.lineTo(hand[0], hand[1]); ctx.stroke();
  ctx.strokeStyle = A.claw; ctx.lineWidth = .016; ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(hand[0] + .04, hand[1] + .03); ctx.stroke();
}
function head(ctx, A, R, V, pitch, form, t, name, hd) {
  const H = (fx, fy) => HP(hd, fx, fy), ha = hd.ha, bone = form === "fossil", steel = form === "armor";
  if (bone) { ctx.strokeStyle = A.boneShade; ctx.lineCap = "round"; ctx.lineWidth = .03; ctx.beginPath(); ctx.moveTo(hd.nx, hd.ny); ctx.lineTo(hd.hx, hd.hy); ctx.stroke();
    ctx.fillStyle = A.bone; for (let i = 0; i < 4; i++) { const w = (i + .5) / 4; ctx.beginPath(); ctx.arc(hd.nx + (hd.hx - hd.nx) * w, hd.ny + (hd.hy - hd.ny) * w, .03, 0, TAU); ctx.fill(); } } // the neck's vertebrae
  const open = name === "burst" || name === "feed" ? .5 : name === "skullReady" ? .3 : 0;
  // the lower jaw: gray, the mouth's dark inside above it
  ctx.fillStyle = bone ? A.boneShade : steel ? A.steelDark : A.snout; ctx.strokeStyle = bone ? A.boneDark : steel ? A.seam : A.outline; ctx.lineWidth = .02;
  if (!bone && !steel) ctx.fillStyle = A.belly;
  ctx.beginPath(); let p = H(-.06, -.06); ctx.moveTo(p[0], p[1]); P2(ctx, H(.22, -.07 - open * .03)); ctx.quadraticCurveTo(...H(.2, -.1 - open * .12), ...H(.1, -.105 - open * .1)); ctx.quadraticCurveTo(...H(-.02, -.11 - open * .05), ...H(-.08, -.08)); ctx.closePath(); ctx.fill();
  ctx.beginPath(); p = H(.22, -.07 - open * .03); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(...H(.2, -.1 - open * .12), ...H(.1, -.105 - open * .1)); ctx.quadraticCurveTo(...H(-.02, -.11 - open * .05), ...H(-.08, -.08)); ctx.stroke();
  if (open) { ctx.fillStyle = A.mouth; ctx.beginPath(); p = H(.02, -.07); ctx.moveTo(p[0], p[1]); P2(ctx, H(.2, -.07)); P2(ctx, H(.18, -.07 - open * .12)); ctx.closePath(); ctx.fill(); }
  // the skull and its dome as one shape: the back of the skull, the great dome over the eye (tilted forward), the brow, the snout
  const skull = bone ? A.bone : steel ? A.steel : A.head;
  const outline = () => { ctx.beginPath(); p = H(-.13, -.06); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(...H(-.2, .06), ...H(-.15, .14)); ctx.quadraticCurveTo(...H(-.08, .29), ...H(.06, .25));
    ctx.bezierCurveTo(...H(.15, .22), ...H(.2, .09), ...H(.29, -.015)); ctx.quadraticCurveTo(...H(.25, -.07), ...H(.18, -.07)); P2(ctx, H(-.06, -.075)); ctx.closePath(); };
  outline(); ctx.fillStyle = skull; ctx.fill();
  ctx.save(); ctx.clip();
  if (!bone) { // the snout gray (the muzzle plate in steel), blended from the yellow; the dome lit on top, its rim darker
    ctx.fillStyle = steel ? A.steelDark : A.snout; for (const [a, f] of [[.3, .12], [.5, .15], [.75, .18], [1, .21]]) { ctx.globalAlpha = a; ctx.beginPath(); p = H(f, .3); ctx.moveTo(p[0], p[1]); P2(ctx, H(.4, .3)); P2(ctx, H(.4, -.3)); P2(ctx, H(f - .02, -.3)); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.fillStyle = steel ? A.steelLight : A.headLight; ctx.globalAlpha = .75; p = H(-.04, .21); ctx.beginPath(); ctx.ellipse(p[0], p[1], .09, .04, -ha - .25, 0, TAU); ctx.fill();
    ctx.globalAlpha = .3; ctx.fillStyle = steel ? A.steelDark : A.headDark; ctx.beginPath(); p = H(-.25, .1); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(...H(-.04, .17), ...H(.14, .1)); P2(ctx, H(.14, -.2)); P2(ctx, H(-.25, -.2)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  } else { ctx.fillStyle = A.boneShade; ctx.globalAlpha = .6; p = H(.03, .0); ctx.beginPath(); ctx.ellipse(p[0], p[1], .16, .045, -ha + .2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  // the outline over the crown, the brow and the snout only: the back of the skull flows into the neck with no collar line
  ctx.strokeStyle = bone ? A.boneDark : steel ? A.seam : A.headDark; ctx.lineWidth = .02; ctx.beginPath(); p = H(-.15, .14); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(...H(-.08, .29), ...H(.06, .25));
  ctx.bezierCurveTo(...H(.15, .22), ...H(.2, .09), ...H(.29, -.015)); ctx.quadraticCurveTo(...H(.25, -.07), ...H(.18, -.07)); P2(ctx, H(-.03, -.075)); ctx.stroke();
  if (steel) { ctx.strokeStyle = A.seam; ctx.lineWidth = .016; for (const f of [-.08, .03]) { ctx.beginPath(); ctx.moveTo(...H(f + .02, .06)); ctx.quadraticCurveTo(...H(f - .02, .18), ...H(f - .04, .26)); ctx.stroke(); } }
  // the black stripe over the crown of the dome to the brow
  if (!bone) { ctx.strokeStyle = A.stripe; ctx.lineWidth = .036; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(...H(-.13, .08)); ctx.quadraticCurveTo(...H(-.165, .16), ...H(-.08, .25)); ctx.quadraticCurveTo(...H(-.01, .275), ...H(.05, .245)); ctx.stroke(); }
  // the knobs ringing the dome's rim (larger round the back), a few down the snout (gray; rivets in the steel; bone on the fossil)
  ctx.fillStyle = bone ? A.boneShade : steel ? A.rivet : A.knob; ctx.strokeStyle = bone ? A.boneDark : steel ? A.seam : A.headDark; ctx.lineWidth = .008;
  for (let i = 0; i < A.knobs; i++) { const s = i / (A.knobs - 1), kp = H(-.165 + s * .22, .085 + Math.sin(s * Math.PI * .8) * .05); ctx.beginPath(); ctx.arc(kp[0], kp[1], .011 + (1 - s) * .012, 0, TAU); ctx.fill(); ctx.stroke(); } // round the back and side of the dome's rim
  for (let i = 0; i < 3; i++) { const kp = H(.16 + i * .035, .07 - i * .025); ctx.beginPath(); ctx.arc(kp[0], kp[1], .013, 0, TAU); ctx.fill(); }
  // the eye under the dome's brow (a visor band in the armor; embers in the fossil's socket)
  const ey = H(.07, .07);
  if (steel) { ctx.fillStyle = A.seam; ctx.beginPath(); ctx.ellipse(ey[0], ey[1], .06, .022, -ha, 0, TAU); ctx.fill(); ctx.fillStyle = A.visor; const g = ctx.globalAlpha; ctx.globalAlpha = g * (.85 + .15 * Math.sin(t * 6)); ctx.beginPath(); ctx.ellipse(ey[0], ey[1], .045, .012, -ha, 0, TAU); ctx.fill(); ctx.globalAlpha = g; }
  else if (bone) { ctx.fillStyle = A.socket; ctx.beginPath(); ctx.arc(ey[0], ey[1], .03, 0, TAU); ctx.fill(); ctx.fillStyle = A.ember; ctx.beginPath(); ctx.arc(ey[0], ey[1], .012, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = A.eye; ctx.beginPath(); ctx.arc(ey[0], ey[1], .021, 0, TAU); ctx.fill(); ctx.fillStyle = A.eyeShine; ctx.beginPath(); ctx.arc(ey[0] + .006, ey[1] - .007, .006, 0, TAU); ctx.fill(); }
  void R; void V; void pitch;
}
function flakes(ctx, A, R, k, t) { // the shed: pieces of green hide falling away from the bones
  ctx.fillStyle = A.body; for (let i = 0; i < 6; i++) { const f = -.3 + i * .14, fall = k * (.4 + (i % 3) * .2), p = R(f, .15 - fall); ctx.globalAlpha = Math.max(0, 1 - k); ctx.beginPath(); ctx.ellipse(p[0], p[1] + fall * .2, .07, .04, i + t, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// The rock disguise: a gray boulder, too round and too smooth, a pale yellowish cap on top ringed with gray knobs. It breathes, barely.
export function drawPachyRock(ctx, k, b, u, t = 0, reduce = false) {
  const A = PACHY_ART, br = reduce ? 0 : Math.sin(t * 1.3) * .012;
  ctx.save(); ctx.translate(k, b); ctx.scale(u, u);
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, -.01, .62, .13, 0, 0, TAU); ctx.fill();
  // one boulder, too round and too smooth, settled into the ground (its base hidden), the dome's cap set into its top
  const shape = () => { ctx.beginPath(); ctx.moveTo(-.58, -.02); ctx.bezierCurveTo(-.64, -.36 - br, -.34, -.6 - br, .02, -.6 - br); ctx.bezierCurveTo(.38, -.6 - br, .64, -.38 - br, .58, -.02); ctx.quadraticCurveTo(0, .05, -.58, -.02); ctx.closePath(); };
  shape(); ctx.fillStyle = A.rock; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = A.rockDark; for (const [a, y] of [[.18, -.32], [.22, -.2], [.28, -.1]]) { ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(.04, y + .3, .75, .3, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.rockLight; ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(-.24, -.4 - br, .2, .08, -.45, 0, TAU); ctx.fill();
  ctx.fillStyle = A.moss; ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(-.34, -.06, .16, .06, .2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(.36, -.04, .1, .04, -.2, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = A.rockCap; ctx.beginPath(); ctx.ellipse(.07, -.55 - br, .24, .09, 0, 0, TAU); ctx.fill(); // the dome, if you look
  ctx.fillStyle = A.headLight; ctx.globalAlpha = .35; ctx.beginPath(); ctx.ellipse(.03, -.58 - br, .12, .035, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  shape(); ctx.strokeStyle = A.rockDark; ctx.lineWidth = .028; ctx.stroke();
  ctx.fillStyle = A.knob; ctx.strokeStyle = A.knobDark; ctx.lineWidth = .008; for (let i = 0; i < 7; i++) { const a = Math.PI * (.08 + i / 6 * .84); ctx.beginPath(); ctx.arc(.07 + Math.cos(a) * .24, -.55 - br + Math.sin(a) * .085, .026, 0, TAU); ctx.fill(); ctx.stroke(); } // the knob ring, its front half
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- Dome Rush's Earth Golem on the Wayfarer (echoes.ts PACHY_ECHO)
// Draw-time only, over the Wayfarer's figure (renderer.ts draws the figure `scale` larger first): rocky plates on the shoulders, chest
// and fists with glowing amber seams, and under the feet a ring that drains with the time left (`left`, 1 to 0): the status cue.
// (cx, foot): the figure's centre line and feet in pixels; `s` pixels a tile. No allocation.
export const GOLEM_ART = Object.freeze({ seam: "#ffb347", ring: "rgba(255,179,71,.85)", ringBack: "rgba(40,30,20,.45)", height: .78,
  plates: Object.freeze([[-.25, .7, .19, .13, -.3], [.25, .7, .19, .13, .3], [0, .5, .22, .17, 0], [-.36, .4, .13, .12, -.2], [.36, .4, .13, .12, .2], [-.11, .13, .11, .08, 0], [.11, .13, .11, .08, 0]]) });
export function drawPachyGolem(ctx, cx, foot, s, scale = 1, left = 1, now = 0, reduce = false) {
  const A = PACHY_ART, G = GOLEM_ART, h = G.height * s * scale, t = reduce ? 0 : now / 1000, L = Math.max(0, Math.min(1, left));
  ctx.save();
  ctx.lineWidth = Math.max(2, s * .05); ctx.strokeStyle = G.ringBack; ctx.beginPath(); ctx.ellipse(cx, foot, s * .46 * scale, s * .16 * scale, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = G.ring; ctx.beginPath(); ctx.ellipse(cx, foot, s * .46 * scale, s * .16 * scale, 0, -Math.PI / 2, -Math.PI / 2 + TAU * L); ctx.stroke();
  for (let i = 0; i < G.plates.length; i++) { const [x, y, w, hh, rot] = G.plates[i], px = cx + x * h, py = foot - y * h + (reduce ? 0 : Math.sin(t * 3 + i) * h * .006);
    ctx.fillStyle = i % 2 ? A.rock : A.rockLight; ctx.strokeStyle = A.rockDark; ctx.lineWidth = Math.max(1, s * .025);
    ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = j / 6 * TAU + rot, r = 1 - (j % 2) * .18, qx = px + Math.cos(a) * w * h * r, qy = py + Math.sin(a) * hh * h * r; j ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = G.seam; ctx.globalAlpha = .75 + (reduce ? 0 : .25 * Math.sin(t * 6 + i)); ctx.lineWidth = Math.max(1, s * .018); ctx.beginPath(); ctx.moveTo(px - w * h * .5, py - hh * h * .1); ctx.lineTo(px, py + hh * h * .25); ctx.lineTo(px + w * h * .4, py - hh * h * .2); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- the daze on the Wayfarer (pachy.ts PACHY.daze)
// While she is dazed (p.dazedUntil, set by game.ts dazeHit), little stars circle over her head; they fade over the last `fade` of the
// time. She stays on her feet (no knockdown tip, unlike the Lightning Giant's shock). Reduced Motion: the stars hold still.
export const PACHY_DAZE_ART = Object.freeze({ count: 5, rx: .3, ry: .09, up: 1, size: .1, spin: 4.2, twinkle: 9, fade: .3, fill: "#ffe45c", edge: "#a8741a" });
// What is left of the daze's stars (1 to 0), or 0 when she is not dazed (never on a fallen Wayfarer).
export function pachyDazeLeft(p, now, total = PACHY.daze.stars * 1000) { const u = Number(p?.dazedUntil) || 0; if (!(now < u) || !(Number(p?.hp) > 0)) return 0; return Math.max(0, Math.min(1, (u - now) / total)); }
// (cx, foot): the figure's centre line and feet in pixels; `s` pixels a tile; `left` from pachyDazeLeft. No allocation.
export function drawPachyDazeStars(ctx, cx, foot, s, left, now = 0, reduce = false) {
  const Z = PACHY_DAZE_ART; if (!(left > 0)) return false;
  const t = reduce ? 0 : now / 1000, a = Math.min(1, left / Z.fade), cy = foot - Z.up * s, r = Math.max(2, Z.size * s);
  ctx.save(); ctx.lineWidth = Math.max(1, s * .012); ctx.strokeStyle = Z.edge; ctx.fillStyle = Z.fill;
  for (let i = 0; i < Z.count; i++) { const ang = t * Z.spin + i / Z.count * TAU, x = cx + Math.cos(ang) * Z.rx * s, y = cy + Math.sin(ang) * Z.ry * s, near = Math.sin(ang) > 0;
    ctx.globalAlpha = a * (near ? 1 : .6) * (reduce ? 1 : .8 + .2 * Math.sin(t * Z.twinkle + i * 1.7)); const rr = r * (near ? 1 : .75);
    ctx.beginPath(); for (let j = 0; j < 10; j++) { const b = -Math.PI / 2 + j * Math.PI / 5 + t * 2, k = j % 2 ? rr * .45 : rr; j ? ctx.lineTo(x + Math.cos(b) * k, y + Math.sin(b) * k) : ctx.moveTo(x + Math.cos(b) * k, y + Math.sin(b) * k); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
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
