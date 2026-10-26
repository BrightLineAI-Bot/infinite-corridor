// Painted hands for the Glimpses (release 221; reworked in 223). Tim, 2026-10-19: the hands should be high-quality,
// artistic and lifelike, articulated and moving the way the snake does, never mannequin, robot or bad pixel art.
//
// How a hand is made:
// - Shape. Every part (forearm, palm, thumb, four fingers) is one closed outline built from its bones: fingers swell a
//   little at each joint and end in a rounded pad; the palm is a soft trapezoid whose knuckle line arches and drops
//   toward the little finger; the thumb rises from a fleshy mound by the wrist and is joined to the index by a web.
// - Paint. Each part is filled, shaded across its form (dark side, body, lit side), then brushed with short strokes
//   that follow its bones, all clipped to its own outline; parts in front cast a soft shadow on what lies behind.
//   Finally one continuous rim of light runs around the whole silhouette on the lit side.
// - Motion. Fingers bend in depth (a fist shows its knuckles) or, with `hook`, across the picture (a clawing grasp).
//   A curl travels from the index to the little finger, as the snake's body follows its head, and with `time` the
//   fingers keep a slight living sway. The hand is painted on a reused offscreen sheet at reduced scale and drawn back
//   up smoothly, which softens it into the painting.
import { TAU, clamp, lerp, seeded, mix, rgba, makeCanvas } from "./glimpse-paint.js?v=r451-25244261f01f";

// Proportions as fractions of the hand size `s` (wrist to knuckles is about .8 s). Fingers: index → little.
export const HAND = {
  fingers: [
    { x: -.29, y: .03, len: .9, wid: .2, delay: 0 }, { x: -.095, y: -.01, len: 1.0, wid: .205, delay: .07 },
    { x: .1, y: 0, len: .94, wid: .195, delay: .14 }, { x: .28, y: .07, len: .74, wid: .17, delay: .21 },
  ],
  phalanges: [.47, .29, .24], bends: [1.25, 1.55, 1.1], claw: [.25, 1.5, 1.3],
  converge: .07,           // fingers lean slightly toward the middle, as real ones do
  wristY: .82,
  thumb: { base: [-.27, .66], len: [.4, .33, .27], wid: [.3, .23, .2] },
  sway: { curl: .05, splay: .04, speed: 1.6 }, // the living sway with `time`
  sheetScale: .62,
  tiny: 40, // below this size (px) a hand skips the whole-silhouette light and shadow, which it is too small to show
};

// --- geometry ----------------------------------------------------------------------------------------------------
// Joints of one finger in hand space: [x, y, width, depth]. Depth > 0 is behind the hand's plane.
function fingerJoints(f, s, curl, splay, o) {
  const bends = o.claw ? HAND.claw : HAND.bends, thin = o.thin || 1, long = o.long || 1, hook = o.hook || 0;
  let x = f.x * s, y = f.y * s, z = 0, phi = 0;
  const a = (f.x / .29) * (splay * .3 - HAND.converge * (1 - splay)), out = [[x, y, f.wid * s * thin, 0]];
  HAND.phalanges.forEach((p, j) => {
    phi += clamp(curl, 0, 1.15) * bends[j] - (j === 2 ? o.tipLift || 0 : 0);
    const len = f.len * long * p * s;
    if (hook) { const b = a + hook * phi * .9; x += Math.sin(b) * len; y -= Math.cos(b) * len; }
    else { x += Math.sin(a) * len * Math.cos(phi); y -= Math.cos(a) * len * Math.cos(phi); z += len * Math.sin(phi); }
    out.push([x, y, f.wid * s * thin * [.93, .85, .74][j], z]);
  });
  return out;
}
// Points along a joint chain (Catmull-Rom), each [x, y, width, depth] with a slight swell at the joints.
function along(joints, steps = 5) {
  const out = [], n = joints.length - 1;
  for (let i = 0; i < n; i++) {
    const p0 = joints[Math.max(0, i - 1)], p1 = joints[i], p2 = joints[i + 1], p3 = joints[Math.min(n, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const swell = 1 + (i > 0 ? .07 * Math.exp(-(t * t) / .02) : 0) - .04 * Math.sin(t * Math.PI);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), lerp(p1[2], p2[2], t) * swell, lerp(p1[3], p2[3], t)]);
    }
  }
  const e = joints[n]; out.push([e[0], e[1], e[2], e[3]]);
  return out;
}
// A closed outline around a chain of [x, y, width] points: smooth sides and a round end.
function outline(pts) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, h = pts[i][2] / 2;
    L.push([pts[i][0] + nx * h, pts[i][1] + ny * h]); R.push([pts[i][0] - nx * h, pts[i][1] - ny * h]);
  }
  const p = new Path2D(), e = pts[pts.length - 1];
  const curve = (list) => { for (let i = 1; i < list.length - 1; i++) p.quadraticCurveTo(list[i][0], list[i][1], (list[i][0] + list[i + 1][0]) / 2, (list[i][1] + list[i + 1][1]) / 2); p.lineTo(list[list.length - 1][0], list[list.length - 1][1]); };
  p.moveTo(L[0][0], L[0][1]); curve(L);
  let q = pts.length - 2; while (q > 0 && Math.hypot(e[0] - pts[q][0], e[1] - pts[q][1]) < e[2] * .5) q--; const pe = pts[Math.max(0, q)], ae = Math.atan2(e[1] - pe[1], e[0] - pe[0]);
  p.arc(e[0], e[1], e[2] / 2, ae + Math.PI / 2, ae - Math.PI / 2, true); // the rounded pad
  const Rr = R.slice().reverse(); p.lineTo(Rr[0][0], Rr[0][1]); curve(Rr);
  p.closePath();
  return p;
}
// A smooth closed shape through `pts` (the palm).
function blob(pts) {
  const p = new Path2D(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const c = pts[i], m = mid(c, pts[(i + 1) % n]); p.quadraticCurveTo(c[0], c[1], m[0], m[1]); }
  p.closePath(); return p;
}

// --- paint -------------------------------------------------------------------------------------------------------
// Fills a part in the skin's base colour and paints its form inside its own outline: a soft lit flank along its
// axis (x0, y0) → (x1, y1) and short strokes that follow it, lighter toward the light. `tone` darkens the part (for
// what is folded behind). The hand's large light and shadow are laid over the whole silhouette afterwards, so parts
// never meet at a seam.
function paintPart(g, path, axis, c, light, seed, tone = 0, strokes = 14) {
  const [ax, ay, bx, by, wd] = axis, dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  const toward = Math.sign(nx * light[0] + ny * light[1]) || 1;
  g.fillStyle = tone ? mix(c.base, c.shade, tone) : c.base; g.fill(path);
  g.save(); g.clip(path); g.lineCap = "round";
  g.strokeStyle = rgba(c.light, .22); g.lineWidth = wd * .28; g.beginPath(); g.moveTo(ax + nx * toward * wd * .2, ay + ny * toward * wd * .2); g.lineTo(bx + nx * toward * wd * .2, by + ny * toward * wd * .2); g.stroke(); // the lit flank
  const r = seeded(seed);
  for (let i = 0; i < strokes; i++) {
    const u = r(), off = (r() - .5) * wd * .9, px = ax + dx * u + nx * off, py = ay + dy * u + ny * off, side = clamp(.5 + toward * off / wd), l = d * (.06 + r() * .1);
    g.strokeStyle = rgba(mix(c.shade, c.light, side * .9 + .05), .1 + r() * .12); g.lineWidth = wd * (.06 + r() * .08);
    g.beginPath(); g.moveTo(px - dx / d * l, py - dy / d * l); g.lineTo(px + dx / d * l, py + dy / d * l); g.stroke();
  }
  g.restore();
}
// A part in front casts a soft shadow onto what is already painted beneath it.
function castShadow(g, path, light, s, c) { g.save(); g.translate(-light[0] * s * .035, -light[1] * s * .035); g.fillStyle = rgba(c.shade, .35); g.fill(path); g.restore(); }

const sheets = new Map(); // offscreen canvases by role and size, reused frame to frame
function sheet(role, w, h) {
  const k = `${role}:${w}x${h}`;
  if (!sheets.has(k)) { if (sheets.size > 24) sheets.clear(); sheets.set(k, makeCanvas(w, h)); }
  const c = sheets.get(k), g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, w, h); return c;
}

// Paints a hand. Options:
//   x, y      where the knuckles sit; angle turns the hand (0: fingers up the screen); mirror -1 for a left hand
//   s         size; curl 0 open … 1 fist; splay 0 … 1; palm true when the palm faces you (curled fingers come forward)
//   lengths   per-finger length factors (index → little), e.g. fingers worn away
//   claw      bend at the middle and end joints instead of the knuckles; long / thin scale the fingers
//   hook      1 or -1: the hand is seen three-quarter, so its fingers curl sideways across the picture, not into it
//   skin      { base, shade, light } colours; rim { color, a, width } light along the lit edge; light angle (radians, screen)
//   sleeve    { color, len } a cuff or sleeve below the wrist (else a bare forearm `arm` long)
//   thumb     "out" (open), "side" (along the index), "over" (across a grip); time (seconds) for the living sway
//   wave      false closes all fingers together; alpha overall opacity; seed keeps the brushwork steady
//   shadow    depth of the shadow side (default .7); lift how much the lit side is raised (default .32)
//   foreshorten  < 1 when the hand is seen from above or below, so its length is shortened toward you
//   soft      false paints at full scale, without softening
export function paintHand(ctx, o) {
  const s = Math.max(4, o.s), mirror = o.mirror || 1, alpha = o.alpha ?? 1, seed = o.seed || 1, T = o.time;
  const c = o.skin || { base: "#3a2a22", shade: "#140c0a", light: "#7a5a46" };
  const la = (o.light ?? -2.2) - (o.angle || 0), light = [Math.cos(la) * mirror, Math.sin(la)];
  const arm = o.sleeve ? o.sleeve.len : (o.arm || s * .7), W = Math.ceil(s * 3.4), top = Math.ceil(s * 1.45), H = Math.ceil(top + HAND.wristY * s + arm + s * .2);
  const tiny = s < HAND.tiny, k = o.soft === false || tiny ? 1 : HAND.sheetScale, sw = Math.ceil(W * k), shh = Math.ceil(H * k);
  const sh = sheet("hand", sw, shh), g = sh.getContext("2d");
  g.scale(k, k); g.translate(W / 2, top); g.scale(mirror, o.foreshorten || 1); // foreshorten < 1: the hand seen from above, its length shortened
  const curl0 = clamp(o.curl ?? 0), splay0 = o.splay ?? .4, last = HAND.fingers[3].delay;
  // The curl travels from the index to the little finger; with time, a slight sway keeps the fingers alive.
  const fingers = HAND.fingers.map((f, i) => {
    const wave = o.wave === false ? curl0 : clamp(curl0 * (1 + last * 1.5) - f.delay * 1.5);
    const live = T == null ? 0 : HAND.sway.curl * Math.sin(T * HAND.sway.speed + i * .9) * (1 - curl0 * .6);
    const sp = splay0 + (T == null ? 0 : HAND.sway.splay * Math.sin(T * HAND.sway.speed * .7 + i * 1.3));
    return along(fingerJoints({ ...f, len: f.len * (o.lengths?.[i] ?? 1) }, s, clamp(wave + live, 0, 1.1), sp, o));
  });
  // Each finger splits where it folds behind the hand's plane: that part is painted before the hand, the rest after.
  const behind = (p) => (o.palm ? p[3] < -s * .02 : p[3] > s * .14);
  const parts = fingers.map((chain) => { const cut = chain.findIndex(behind); return cut < 0 ? [[], chain] : [chain.slice(Math.max(0, cut - 1)), chain.slice(0, cut + 1)]; });
  // The thumb: from a fleshy mound by the wrist, three bones out; "side" lies along the index, "over" crosses a grip.
  const mode = o.thumb || (curl0 > .6 ? "side" : "out"), th = HAND.thumb;
  const thumbPts = (() => {
    const ang = mode === "over" ? -.6 : mode === "side" ? -1.55 : -2.2 + curl0 * .5, bend = mode === "over" ? .5 : mode === "side" ? .6 : .22 + curl0 * .4, tl = mode === "side" ? .78 : 1;
    const j0 = [th.base[0] * s, th.base[1] * s, th.wid[0] * s, 0], j1 = [j0[0] + Math.cos(ang) * th.len[0] * s, j0[1] + Math.sin(ang) * th.len[0] * s, th.wid[1] * s, 0];
    const L1 = th.len[1] * s * tl, L2 = th.len[2] * s * tl;
    const j2 = [j1[0] + Math.cos(ang + bend) * L1, j1[1] + Math.sin(ang + bend) * L1, th.wid[2] * s, 0], j3 = [j2[0] + Math.cos(ang + bend * 1.6) * L2, j2[1] + Math.sin(ang + bend * 1.6) * L2, th.wid[2] * s * .88, 0];
    return along([j0, j1, j2, j3], 4);
  })();
  const axisOf = (pts) => [pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][2]];
  // 1. The forearm or sleeve.
  const wY = HAND.wristY * s, sl = o.sleeve, armPts = [[s * .02, wY + arm, (sl ? .8 : .56) * s], [s * .015, wY + arm * .66, (sl ? .76 : .53) * s], [s * .01, wY + arm * .33, (sl ? .72 : .48) * s], [0, wY + s * .06, (sl ? .68 : .42) * s], [0, wY * .9, (sl ? .64 : .46) * s]];
  const armC = sl ? { base: sl.color, shade: mix(sl.color, "#000000", .6), light: mix(sl.color, sl.lightColor || "#ffffff", .2) } : c;
  paintPart(g, outline(armPts), [0, wY + arm, 0, wY * .9, s * .6], armC, light, seed + 1, 0, 18);
  // 2. Whatever is folded behind the hand, darker.
  parts.forEach(([back], i) => { if (back.length > 1) paintPart(g, outline(back), axisOf(back), c, light, seed + 10 + i, .35, 6); });
  const thumbPath = outline(thumbPts), thumbAxis = [...axisOf(thumbPts).slice(0, 4), th.wid[1] * s];
  // Seen from the back, the thumb rises from the side of the hand: it is painted first and the hand's edge covers its
  // root. Seen from the palm, or crossing a grip, it lies in front.
  const thumbFirst = !o.palm && mode !== "over";
  if (thumbFirst) paintPart(g, thumbPath, thumbAxis, c, light, seed + 5, mode === "side" ? .2 : 0, 12);
  // The web of skin from the thumb's first joint to the index knuckle, and the mound at the thumb's root.
  const tj = thumbPts[Math.min(thumbPts.length - 1, 4)], web = blob([[HAND.fingers[0].x * s - .02 * s, (HAND.fingers[0].y + .1) * s], [lerp(tj[0], thumbPts[0][0], .25), lerp(tj[1], thumbPts[0][1], .25)], [thumbPts[0][0] + .04 * s, thumbPts[0][1] + .08 * s], [-.12 * s, .5 * s]]);
  if (mode !== "over") paintPart(g, web, [0, wY, -.2 * s, .1 * s, s * .6], c, light, seed + 6, 0, 6);
  // 3. The palm (or back of the hand): a soft trapezoid, knuckle line arched and dropping to the little finger, the
  //    thumb's mound by the wrist and the web reaching toward the index.
  const kn = HAND.fingers.map((f) => [f.x * s, (f.y + .05) * s]);
  const palm = blob([[-.23 * s, wY + s * .02], [.21 * s, wY + s * .02], [.33 * s, .45 * s], [kn[3][0] + .07 * s, kn[3][1]], [kn[2][0], kn[2][1] - .07 * s], [kn[1][0], kn[1][1] - .08 * s], [kn[0][0] - .05 * s, kn[0][1] - .03 * s], [-.4 * s, .26 * s], [-.43 * s, .52 * s]]);
  paintPart(g, palm, [0, wY, 0, 0, s * .78], c, light, seed + 20, 0, 16);
  g.save(); g.clip(palm); g.lineCap = "round";
  if (!o.palm) for (const [x, y] of kn) { // knuckles and the faint fan of tendons on the back of the hand
    g.strokeStyle = rgba(c.light, .22); g.lineWidth = s * .05; g.beginPath(); g.moveTo(x - s * .05, y + s * .01); g.quadraticCurveTo(x, y - s * .02, x + s * .05, y + s * .01); g.stroke();
    g.strokeStyle = rgba(c.light, .07); g.lineWidth = s * .035; g.beginPath(); g.moveTo(x, y + s * .06); g.quadraticCurveTo(x * .7, wY * .55, x * .25, wY * .95); g.stroke();
  } else { const hg = g.createRadialGradient(s * .02, s * .34, 0, s * .02, s * .34, s * .3); hg.addColorStop(0, rgba(c.shade, .22)); hg.addColorStop(1, rgba(c.shade, 0)); g.fillStyle = hg; g.fillRect(-s, -s, 2 * s, 2 * s); } // the palm's hollow
  g.restore();
  // 4. The thumb (unless it crosses in front), then the fingers, little finger first; each casts a soft shadow.
  if (!thumbFirst && mode !== "over") { castShadow(g, thumbPath, light, s, c); paintPart(g, thumbPath, thumbAxis, c, light, seed + 5, 0, 12); }
  for (const i of [3, 2, 1, 0]) {
    const front = parts[i][1]; if (front.length < 2) continue;
    const p = outline(front); castShadow(g, p, light, s, c);
    paintPart(g, p, axisOf(front), c, light, seed + 30 + i, 0, 12);
    if (parts[i][0].length > 1) { // where the finger folds away from you: a rounded knuckle, lit on top
      const [x, y, w] = front[front.length - 1], kg = g.createRadialGradient(x + light[0] * w * .2, y + light[1] * w * .2, 0, x, y, w * .6);
      kg.addColorStop(0, mix(c.base, c.light, .55)); kg.addColorStop(.6, c.base); kg.addColorStop(1, mix(c.base, c.shade, .55));
      g.fillStyle = kg; g.beginPath(); g.ellipse(x, y, w * .54, w * .46, 0, 0, TAU); g.fill();
    }
    g.save(); g.clip(p);
    const tip = front[front.length - 1];
    if (!o.palm && tip[3] < s * .06 && front.length > 8) { // the nail, catching the light
      const prev = front[front.length - 4], a = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
      g.fillStyle = rgba(c.light, .28); g.beginPath(); g.ellipse(tip[0] - Math.cos(a) * tip[2] * .32, tip[1] - Math.sin(a) * tip[2] * .32, tip[2] * .34, tip[2] * .28, a, 0, TAU); g.fill();
    }
    for (let j = 5; j < front.length - 2; j += 5) { const [x, y, w] = front[j], q = front[j - 1], a = Math.atan2(y - q[1], x - q[0]); g.strokeStyle = rgba(c.shade, .22); g.lineWidth = w * .07; g.beginPath(); g.moveTo(x - Math.sin(a) * w * .3, y + Math.cos(a) * w * .3); g.lineTo(x + Math.sin(a) * w * .3, y - Math.cos(a) * w * .3); g.stroke(); } // joint creases
    g.restore();
  }
  if (mode === "over") { castShadow(g, thumbPath, light, s, c); paintPart(g, thumbPath, thumbAxis, c, light, seed + 5, 0, 12); }
  // 5. The hand's light and shadow, over the whole silhouette at once: the side away from the light falls into shadow
  //    (warm where it turns), the side toward it is lifted. Each band is the silhouette less itself shifted, softened.
  const band = (shift, color, alpha, soft) => {
    const t = sheet("band", sw, shh), tg = t.getContext("2d"), dd = s * k * shift;
    tg.drawImage(sh, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = color; tg.fillRect(0, 0, sw, shh);
    tg.globalCompositeOperation = "destination-out"; tg.drawImage(sh, Math.cos(la) * dd, Math.sin(la) * dd);
    const q = sheet("soft", Math.ceil(sw * soft), Math.ceil(shh * soft)), qg = q.getContext("2d"); qg.imageSmoothingEnabled = true; qg.drawImage(t, 0, 0, q.width, q.height);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.globalCompositeOperation = "source-atop"; g.imageSmoothingEnabled = true; g.drawImage(q, 0, 0, sw, shh); g.restore();
  };
  if (!tiny) {
  band(.16, mix(c.shade, c.warm || "#a03020", .25), o.shadow ?? .7, .35);   // the shadow side, broad and soft
  band(.07, c.shade, (o.shadow ?? .7) * .8, .5);                            // the darkest edge of it
  band(-.14, c.light, o.lift ?? .32, .35);                                  // the lit side, broad and soft
  }
  // 6. Brushwork over the whole hand, as in the painted backdrops: small strokes of its own colours, inside it only.
  { const r = seeded(seed + 77), n = Math.round(40 + s * .9); g.save(); g.globalCompositeOperation = "source-atop"; g.lineCap = "round";
    for (let i = 0; i < n; i++) { const x = (r() - .5) * s * 1.6, y = -s * 1.1 + r() * (wY + arm * .4 + s * 1.1), a = -Math.PI / 2 + (r() - .5) * 1.6, l = s * (.012 + r() * .02);
      g.strokeStyle = rgba([c.light, c.base, c.shade, c.warm || mix(c.shade, "#a03020", .35)][(r() * 4) | 0], .04 + r() * .05); g.lineWidth = s * (.03 + r() * .03);
      g.beginPath(); g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.restore(); }
  // 7. One rim of light around the whole silhouette on the lit side: the silhouette less itself shifted off the light.
  if (o.rim && o.rim.a > 0) {
    const rimS = sheet("rim", sw, shh), rg = rimS.getContext("2d"), d = s * k * (o.rim.width || .045); // the sheet is unturned, so its light is `la`
    rg.drawImage(sh, 0, 0); rg.globalCompositeOperation = "source-in"; rg.fillStyle = o.rim.color; rg.fillRect(0, 0, sw, shh);
    rg.globalCompositeOperation = "destination-out"; rg.drawImage(sh, -Math.cos(la) * d, -Math.sin(la) * d);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = clamp(o.rim.a); g.globalCompositeOperation = "source-atop"; g.drawImage(rimS, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  // The forearm's far end fades out rather than ending in a cut.
  { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const y0 = (top + wY + arm * .55) * k, fg = g.createLinearGradient(0, y0, 0, shh); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = fg; g.fillRect(0, y0, sw, shh - y0); g.restore(); }
  // Onto the scene, turned, drawn back up smoothly.
  ctx.save(); ctx.globalAlpha = (Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1) * alpha; ctx.translate(o.x, o.y); ctx.rotate(o.angle || 0);
  ctx.globalCompositeOperation = "source-over"; ctx.filter = "none"; // whatever the scene was blending with, a hand is painted over it
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sh, 0, 0, sw, shh, -W / 2, -top, sw / k, shh / k);
  ctx.restore();
}
