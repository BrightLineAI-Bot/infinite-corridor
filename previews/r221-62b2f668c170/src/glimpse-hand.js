// Painted hands for the Glimpses (release 221; Tim, 2026-10-19: "everything else is beautiful … the hands are no good
// … the way you made the snake … make the fingers something like that"). A hand is built the way the snake is: every
// bone is a tapering body with soft round ends, laid as overlapping strokes and then brushed over with dabs, so there
// is no outline anywhere. Fingers bend in depth: a curled finger folds away from the viewer and is foreshortened, and
// the parts that fold behind the hand are painted before it, so a fist reads as knuckles and a gripping hand as fingers
// closing. Canvas 2D only; deterministic per seed, so the brushwork does not shimmer between frames.
import { TAU, clamp, lerp, seeded, mix, rgba, makeCanvas } from "./glimpse-paint.js?v=r221-62b2f668c170";

// Bone proportions, as fractions of the hand size `s` (the back of the hand from wrist to knuckles is about .8 s).
export const HAND = {
  fingers: [ // index → little finger: knuckle position, length, width, how much it lags a curl
    { x: -.3, y: .02, len: .9, wid: .22, lag: 1 }, { x: -.1, y: -.01, len: 1.0, wid: .23, lag: 1.04 }, { x: .1, y: 0, len: .94, wid: .22, lag: 1.08 }, { x: .28, y: .05, len: .72, wid: .18, lag: 1.14 },
  ],
  phalanges: [.46, .3, .24], bends: [1.25, 1.6, 1.05], claw: [.25, 1.5, 1.3], wristY: .82, sheetScale: .6,
  thumb: { x: -.36, y: .5, len: [.42, .34], wid: .26 },
};

// A tapering body through `pts` ([x, y, width]), painted as the snake is: a soft shadow edge, the body, a lit flank,
// then dabs along it. `light` is the unit direction the light comes from (screen space).
function paintBody(ctx, pts, c, light, rim, seed, alpha, flat = false) {
  if (pts.length < 2) return;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // Inner passes are opaque mixes, so overlapping segments never stack into beads at the joints.
  const pass = (color, a, grow, shift) => { ctx.strokeStyle = rgba(color, a * alpha); for (let i = 1; i < pts.length; i++) { const [x0, y0, w0] = pts[i - 1], [x1, y1, w1] = pts[i]; ctx.lineWidth = Math.max(.5, (w0 + w1) / 2 * grow); ctx.beginPath(); ctx.moveTo(x0 + light[0] * w0 * shift, y0 + light[1] * w0 * shift); ctx.lineTo(x1 + light[0] * w1 * shift, y1 + light[1] * w1 * shift); ctx.stroke(); } };
  if (!flat) pass(c.shade, .35, 1.08, 0); // a soft dark margin, so the body has an edge without a line
  pass(c.base, 1, 1, 0);
  pass(mix(c.base, c.shade, flat ? .15 : .35), 1, .55, -.22); // form shadow inside the body
  pass(mix(c.base, c.light, flat ? .2 : .4), 1, .42, .22); // the lit flank
  if (rim && rim.a > 0) pass(mix(mix(c.base, c.light, .4), rim.color, clamp(rim.a)), 1, .14, .42);
  // Hatching that follows the form, like the snake's scales: short strokes along the body, lighter toward the light.
  const r = seeded(seed);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x, y, wd] = pts[i], tx = x - x0, ty = y - y0, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, nx = -uy, ny = ux;
    const toward = Math.sign(nx * light[0] + ny * light[1]) || 1;
    for (let k = 0; k < (wd > 6 ? 2 : 1); k++) {
      const off = (r() - .5) * wd * .75, side = clamp(.5 + toward * off / wd), l = wd * (.25 + r() * .25), px = x + nx * off - ux * r() * tl, py = y + ny * off - uy * r() * tl;
      ctx.strokeStyle = rgba(mix(c.shade, c.light, side), (.18 + r() * .22) * alpha); ctx.lineWidth = wd * (.08 + r() * .08);
      ctx.beginPath(); ctx.moveTo(px - ux * l, py - uy * l); ctx.lineTo(px + ux * l, py + uy * l); ctx.stroke();
    }
  }
}
// Smooths a joint chain into a curve of points with widths, Catmull-Rom style.
function smoothChain(joints, steps = 3) {
  const out = [];
  for (let i = 0; i < joints.length - 1; i++) {
    const p0 = joints[Math.max(0, i - 1)], p1 = joints[i], p2 = joints[i + 1], p3 = joints[Math.min(joints.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), lerp(p1[2], p2[2], t), lerp(p1[3], p2[3], t)]);
    }
  }
  const e = joints[joints.length - 1]; out.push([e[0], e[1], e[2] * .92, e[3]]);
  return out;
}
// One finger's joints in hand space: [x, y, width, depth]. Depth > 0 is behind the hand's plane (the palm side when
// the back faces you). `curl` folds each joint by HAND.bends; `splay` fans the fingers out from the middle.
function fingerJoints(f, s, curl, splay, tipLift = 0, bends = HAND.bends, thin = 1, hook = 0) {
  let x = f.x * s, y = f.y * s, z = 0, phi = 0;
  const a = (f.x / .3) * splay * .28, out = [[x, y, f.wid * s * thin, 0]];
  HAND.phalanges.forEach((p, j) => {
    phi += clamp(curl * f.lag, 0, 1.15) * bends[j] - (j === 2 ? tipLift : 0);
    const len = f.len * p * s;
    if (hook) { const b = a + hook * phi; x += Math.sin(b) * len; y -= Math.cos(b) * len; } // seen three-quarter: the curl hooks in the picture plane
    else { x += Math.sin(a) * len * Math.cos(phi); y -= Math.cos(a) * len * Math.cos(phi); z += len * Math.sin(phi); }
    out.push([x, y, f.wid * s * thin * (1 - (j + 1) * .12), z]);
  });
  return out;
}
const sheets = new Map(); // offscreen canvases by size, reused frame to frame
function sheet(w, h) { const k = `${w}x${h}`; if (!sheets.has(k)) { if (sheets.size > 12) sheets.clear(); sheets.set(k, makeCanvas(w, h)); } const c = sheets.get(k), g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); return c; }
// Paints a hand. Options:
//   x, y      where the knuckles sit; angle turns the hand (0: fingers up the screen); mirror -1 for a left hand
//   s         size; curl 0 open … 1 fist; splay 0 … 1; palm true when the palm faces you (curled fingers come forward)
//   skin      { base, shade, light } colours; rim { color, a } light along one edge; light angle (radians, screen)
//   sleeve    { color, len } a cuff or sleeve below the wrist (else a bare forearm `arm` long); thumb "out" (open), "side" (along the index), "over" (on a grip)
//   claw      bend at the middle and end joints instead of the knuckles; long / thin scale the fingers
//   hook      1 or -1: the hand is seen three-quarter, so its fingers curl sideways across the picture, not into it
//   alpha     overall opacity; seed keeps the brushwork steady; soft false paints at full scale, without softening
export function paintHand(ctx, o) {
  const s = Math.max(4, o.s), curl = clamp(o.curl ?? 0), splay = o.splay ?? .4, mirror = o.mirror || 1, alpha = o.alpha ?? 1, seed = o.seed || 1;
  const c = o.skin || { base: "#3a2a22", shade: "#140c0a", light: "#7a5a46" };
  const la = (o.light ?? -2.2) - (o.angle || 0), light = [Math.cos(la) * mirror, Math.sin(la)];
  // The forearm or sleeve is painted straight onto the scene (it can be long); only the hand goes through the sheet.
  const arm = o.sleeve ? o.sleeve.len : (o.arm || s * .7), W = Math.ceil(s * 3.2), top = Math.ceil(s * 1.35), H = Math.ceil(top + HAND.wristY * s + s * .45);
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle || 0); ctx.scale(mirror, 1); ctx.globalAlpha = (Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1) * alpha;
  if (o.sleeve) { const sl = o.sleeve, sc = { base: sl.color, shade: mix(sl.color, "#000000", .55), light: mix(sl.color, sl.lightColor || "#ffffff", .22) }; paintBody(ctx, [[0, HAND.wristY * s * .9, s * .58], [s * .02, HAND.wristY * s + arm * .5, s * .7], [s * .05, HAND.wristY * s + arm, s * .78]], sc, light, o.rim && { color: o.rim.color, a: o.rim.a * .3 }, seed + 9, 1); }
  else paintBody(ctx, [[0, HAND.wristY * s * .95, s * .44], [0, HAND.wristY * s + arm, s * .52]], c, light, o.rim, seed + 9, 1);
  ctx.restore();
  // The hand is painted at reduced scale and drawn back up smoothly: that is its softening, and it is cheap.
  const k = o.soft === false ? 1 : HAND.sheetScale, sh = sheet(Math.ceil(W * k), Math.ceil(H * k)), g = sh.getContext("2d");
  g.scale(k, k); g.translate(W / 2, top); g.scale(mirror, 1);
  const fingers = HAND.fingers.map((f) => smoothChain(fingerJoints({ ...f, len: f.len * (o.long || 1) }, s, curl, splay, o.tipLift || 0, o.claw ? HAND.claw : HAND.bends, o.thin || 1, o.hook || 0)));
  const mode = o.thumb || (curl > .6 ? "side" : "out"), t = HAND.thumb;
  const thumbJ = (() => {
    const base = mode === "over" ? [-.3 * s, .34 * s, t.wid * s, 0] : [t.x * s, t.y * s, t.wid * s, 0], k = mode === "over" ? .78 : 1;
    const ang = mode === "over" ? -.75 : mode === "side" ? -1.72 : -2.15 + curl * .45, j1 = [base[0] + Math.cos(ang) * t.len[0] * s * k, base[1] + Math.sin(ang) * t.len[0] * s * k, t.wid * s * .88, 0];
    const a2 = ang + (mode === "over" ? .55 : .3 + curl * .5), j2 = [j1[0] + Math.cos(a2) * t.len[1] * s * k, j1[1] + Math.sin(a2) * t.len[1] * s * k, t.wid * s * .72, 0];
    return smoothChain([base, j1, j2]);
  })();
  // Paint in depth order: anything folded behind the hand's plane first, then the hand, then what is in front.
  const behind = (p) => (o.palm ? p[3] < -s * .02 : p[3] > s * .14);
  const parts = fingers.map((chain) => { const back = [], front = []; for (const p of chain) (behind(p) ? back : front).push(p); return [back, front]; });
  parts.forEach(([back], i) => paintBody(g, back, { ...c, base: mix(c.base, c.shade, .3) }, light, null, seed + 20 + i, 1));
  if (mode === "out" || mode === "side") paintBody(g, thumbJ, c, light, o.rim, seed + 50, 1);
  // The back of the hand (or the palm): broad over the knuckles, narrowing to the wrist.
  paintBody(g, [[0, HAND.wristY * s, s * .5], [0, HAND.wristY * s * .55, s * .7], [s * -.01, s * .16, s * .74]], c, light, null, seed + 40, 1);
  HAND.fingers.forEach((f, i) => paintBody(g, [[f.x * s * .35, HAND.wristY * s, s * .28], [f.x * s * .75, HAND.wristY * s * .5, s * .29], [f.x * s, f.y * s + s * .03, f.wid * s * 1.2]], c, light, i === 3 ? o.rim : null, seed + 30 + i, 1, true));
  paintBody(g, [[0, HAND.wristY * s * .92, s * .44], [0, s * .3, s * .56]], c, light, null, seed + 45, 1, true); // one mass over the bones
  if (o.palm) { g.fillStyle = rgba(c.shade, .1); g.beginPath(); g.ellipse(0, s * .34, s * .18, s * .22, .2, 0, TAU); g.fill(); } // the hollow of the palm
  parts.forEach(([, front], i) => {
    if (front.length < 2) return;
    paintBody(g, front, c, light, i === 0 || i === 3 ? o.rim : null, seed + 60 + i, 1);
    const tip = front[front.length - 1];
    if (!o.palm && tip[3] < s * .1 && curl < .5) { g.fillStyle = rgba(c.light, .18); g.beginPath(); g.ellipse(tip[0], tip[1] + tip[2] * .3, tip[2] * .26, tip[2] * .32, 0, 0, TAU); g.fill(); } // a nail
  });
  if (mode === "over") paintBody(g, thumbJ, c, light, o.rim, seed + 50, 1);
  // Onto the scene, turned and slightly softened, so the hand sits in the painting instead of on it.
  ctx.save(); ctx.globalAlpha = (Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1) * alpha; ctx.translate(o.x, o.y); ctx.rotate(o.angle || 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sh, 0, 0, Math.ceil(W * k), Math.ceil(H * k), -W / 2, -top, Math.ceil(W * k) / k, Math.ceil(H * k) / k);
  ctx.restore();
}
