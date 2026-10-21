// The Lightning Giant (release 257, Tim 2026-10-21): a giant walking robot with an iron-and-copper club and Tesla coils
// on its shoulders, plus its lightning effects and the knocked-down Wayfarer. Native Canvas 2D, drawn by code.
const TAU = Math.PI * 2;

// Body proportions in body units (u = tile size x actor scale); club poses as angles from straight ahead (0),
// positive downward, for the club arm.
export const GIANT_ART = Object.freeze({
  height: 1.12, hipY: .5, shoulderY: .9, headY: 1.04, legGap: .26, thigh: .25, shin: .25, stride: .1, stepRate: 3.2,
  upperArm: .2, foreArm: .19, clubLength: .58, clubHead: .2,
  metal: "#6c7681", metalDark: "#3a424c", metalEdge: "#15191e", plate: "#8a95a1", copper: "#b8743c", copperDark: "#7a4a24",
  core: "#7fd6ff", coreHot: "#eafaff", haze: "#7fd6ff", crest: "#8e1c24", crestLight: "#c8434a",
  poses: { idle: 1.05, arcs: .15, point: 1.2, pointFire: 1.2, swingReady: -2.35, swingFore: .75, swingBack: 2.55, slamRaise: -1.75, slamDown: .95, raise: -1.57, menace: -1.95, chest: 1.15, chargeLow: 2.2, upswing: -1.05 },
  freeArm: { idle: 1.25, arcs: -.05, point: -.05, pointFire: -.1, raise: -1.45, slamRaise: -1.5, slamDown: 1.2, menace: -1.6, chest: 2.4, chargeLow: .4, upswing: .2 },
  ease: 14,
});

// A jagged lightning bolt between two points. The jitter reshuffles every `flicker` ms; `seed` keeps bolts distinct.
export function lightningBolt(ctx, x1, y1, x2, y2, { now = 0, seed = 0, segments = 8, jitter = .18, width = 2, color = "#7fd6ff", core = "#eafaff", flicker = 70, branch = true } = {}) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, frame = Math.floor(now / flicker);
  const r = (i) => { const v = Math.sin((seed + 1) * 12.9898 + (frame + 1) * 78.233 + i * 37.719) * 43758.5453; return (v - Math.floor(v)) - .5; };
  const pts = [[x1, y1]];
  for (let i = 1; i < segments; i++) { const f = i / segments, off = r(i) * jitter * len * Math.sin(f * Math.PI); pts.push([x1 + dx * f + nx * off, y1 + dy * f + ny * off]); }
  pts.push([x2, y2]);
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y); };
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha *= .35; ctx.strokeStyle = color; ctx.lineWidth = width * 3.2; path(); ctx.stroke();
  ctx.globalAlpha /= .35; ctx.strokeStyle = color; ctx.lineWidth = width * 1.5; path(); ctx.stroke();
  ctx.strokeStyle = core; ctx.lineWidth = Math.max(1, width * .6); path(); ctx.stroke();
  if (branch && segments > 4) { const i = 2 + Math.abs(Math.floor(r(99) * 10)) % (segments - 3), [bx, by] = pts[i], a = Math.atan2(dy, dx) + (r(98) > 0 ? .7 : -.7), bl = len * .22;
    ctx.globalAlpha *= .8; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, width * .7); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * bl * .5 + nx * r(97) * bl * .3, by + Math.sin(a) * bl * .5 + ny * r(97) * bl * .3); ctx.lineTo(bx + Math.cos(a) * bl, by + Math.sin(a) * bl); ctx.stroke(); }
  ctx.restore();
}

const smoothing = new WeakMap();
function eased(e, key, target, now, rate) {
  const st = smoothing.get(e) || {}; smoothing.set(e, st);
  const prev = st[key], dt = Math.min(.1, Math.max(0, (now - (st.at?.[key] ?? now)) / 1000));
  st.at = { ...(st.at || {}), [key]: now };
  if (!Number.isFinite(prev) || !(dt > 0)) { st[key] = target; return target; }
  st[key] = prev + (target - prev) * Math.min(1, dt * rate); return st[key];
}

// q: the shared pack paint context { k, b, u, t, flip, e, s }. `now` (ms) drives easing and flicker only.
export function drawLightningGiant(ctx, q, now = 0) {
  const A = GIANT_ART, { k, u, t, flip, e } = q, s0 = e.pack, pose = e.giantPose || "idle", attacking = !!s0?.attack, ground = q.b, b = ground - Math.max(0, Number(e.giantAir) || 0) * (q.s || u);
  const charged = e.giantCharged > 0, still = attacking || e.giantCloud, reduce = !!e.reduceMotion;
  const walk = still || reduce ? 0 : t * A.stepRate;
  // Ground shadow and, when charged, the crackling haze around the whole body.
  const air = Math.max(0, Math.min(1, (ground - b) / Math.max(1, u))); // the shadow stays on the ground and shrinks while it leaps
  ctx.fillStyle = `rgba(6,8,12,${.45 * (1 - air * .5)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * .34 * (1 - air * .35), u * .09 * (1 - air * .35), 0, 0, TAU); ctx.fill();
  if (charged) {
    const g = ctx.createRadialGradient(k, b - u * .6, u * .1, k, b - u * .6, u * .85); g.addColorStop(0, "rgba(127,214,255,.32)"); g.addColorStop(1, "rgba(127,214,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, b - u * .6, u * .7, u * .82, 0, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(k, 0); ctx.scale(flip, 1);
  const bob = Math.abs(Math.sin(walk)) * u * .015, hipY = b - u * A.hipY - bob, shY = b - u * A.shoulderY - bob;
  const line = (pts, w, fill, edge = A.metalEdge) => { ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = edge; ctx.lineWidth = w + Math.max(2, u * .02); ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke(); };
  const poly = (pts, fill, edge = A.metalEdge) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, u * .012); ctx.stroke(); };
  // Legs: hip, a forward-bending knee and a heavy foot; the far leg is darker. Two-bone IK in the walk cycle.
  const leg = (side, phase, far) => {
    const swing = Math.sin(walk + phase), lift = Math.max(0, Math.cos(walk + phase)) * u * .05 * (still ? 0 : 1);
    const hx = side * u * A.legGap * .5, fx = hx + swing * u * A.stride, fy = b - lift, L1 = u * A.thigh, L2 = u * A.shin;
    const dx = fx - hx, dy = fy - hipY, d = Math.min(L1 + L2 - 1e-3, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const kx = hx + Math.cos(a - c) * L1, ky = hipY + Math.sin(a - c) * L1; // knee bends forward (+x)
    const tone = far ? A.metalDark : A.metal;
    line([hx, hipY, kx, ky], u * .17, tone); line([kx, ky, fx, fy - u * .06], u * .15, tone);
    line([kx + u * .02, ky + u * .03, fx + u * .02, fy - u * .1], u * .05, far ? "#2c333b" : A.plate, "rgba(0,0,0,0)"); // shin plate
    ctx.fillStyle = far ? "#2c333b" : A.plate; ctx.beginPath(); ctx.arc(kx, ky, u * .07, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = Math.max(1, u * .012); ctx.stroke();
    poly([fx - u * .1, fy, fx + u * .16, fy, fx + u * .13, fy - u * .09, fx - u * .08, fy - u * .11], far ? "#232a31" : A.metalDark);
  };
  // Arms: shoulder to elbow to hand, then the club along its pose angle.
  const arm = (shx, angle, far, club) => {
    const ua = angle * .55 + .35, ex = shx + Math.cos(ua) * u * A.upperArm, ey = shY + Math.sin(ua) * u * A.upperArm;
    const hx = ex + Math.cos(angle) * u * A.foreArm, hy = ey + Math.sin(angle) * u * A.foreArm, tone = far ? A.metalDark : A.metal;
    line([shx, shY, ex, ey], u * .15, tone); line([ex, ey, hx, hy], u * .14, tone);
    ctx.fillStyle = far ? "#2c333b" : A.plate; ctx.beginPath(); ctx.arc(ex, ey, u * .06, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = Math.max(1, u * .012); ctx.stroke();
    if (!club) { ctx.fillStyle = A.metalDark; ctx.beginPath(); ctx.arc(hx, hy, u * .07, 0, TAU); ctx.fill(); ctx.stroke(); return; }
    const cx = hx + Math.cos(angle) * u * A.clubLength, cy = hy + Math.sin(angle) * u * A.clubLength, nx = -Math.sin(angle), ny = Math.cos(angle), w = u * .045, W = u * .11;
    // Shaft, then a flared head banded in copper with a glowing cap.
    poly([hx + nx * w, hy + ny * w, cx - Math.cos(angle) * u * A.clubHead + nx * w, cy - Math.sin(angle) * u * A.clubHead + ny * w, cx - Math.cos(angle) * u * A.clubHead - nx * w, cy - Math.sin(angle) * u * A.clubHead - ny * w, hx - nx * w, hy - ny * w], "#4a3a2e");
    const h0x = cx - Math.cos(angle) * u * A.clubHead, h0y = cy - Math.sin(angle) * u * A.clubHead;
    poly([h0x + nx * w * 1.2, h0y + ny * w * 1.2, cx + nx * W, cy + ny * W, cx - nx * W, cy - ny * W, h0x - nx * w * 1.2, h0y - ny * w * 1.2], A.metalDark);
    for (const f of [.3, .62]) { const bx = h0x + (cx - h0x) * f, by = h0y + (cy - h0y) * f, ww = w * 1.2 + (W - w * 1.2) * f; line([bx + nx * ww, by + ny * ww, bx - nx * ww, by - ny * ww], u * .03, A.copper, A.copperDark); }
    ctx.fillStyle = charged || pose === "raise" ? A.coreHot : A.core; ctx.beginPath(); ctx.arc(cx, cy, u * .045, 0, TAU); ctx.fill();
    ctx.fillStyle = A.metalDark; ctx.beginPath(); ctx.arc(hx, hy, u * .075, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.stroke();
    q.clubTip = { x: k + flip * cx, y: cy };
  };
  const clubAngle = eased(e, "club", A.poses[pose] ?? A.poses.idle, now, A.ease) + (pose === "idle" && !reduce ? Math.sin(walk) * .08 : 0);
  const freeAngle = eased(e, "free", A.freeArm[pose] ?? A.freeArm.idle, now, A.ease) - (pose === "idle" && !reduce ? Math.sin(walk) * .1 : 0);
  leg(-1, Math.PI, true); arm(-u * .27, freeAngle, true, false);
  // Pelvis, torso plates, the glowing core and the shoulder coils.
  poly([-u * .22, hipY + u * .06, u * .22, hipY + u * .06, u * .19, hipY - u * .1, -u * .19, hipY - u * .1], A.metalDark);
  poly([-u * .3, shY - u * .04, u * .32, shY - u * .04, u * .22, hipY - u * .08, -u * .21, hipY - u * .08], A.metal);
  poly([-u * .22, shY + u * .03, u * .25, shY + u * .03, u * .17, shY + u * .22, -u * .16, shY + u * .22], A.plate);
  for (const yy of [.3, .36]) { ctx.strokeStyle = A.metalDark; ctx.lineWidth = Math.max(1, u * .012); ctx.beginPath(); ctx.moveTo(-u * .19, shY + u * yy); ctx.lineTo(u * .21, shY + u * yy); ctx.stroke(); } // belly ribs
  const pulse = pose === "chest" ? 1.4 : .55 + .45 * Math.sin(t * (charged ? 14 : 4));
  ctx.fillStyle = A.core; ctx.globalAlpha = .35 + .4 * pulse; ctx.beginPath(); ctx.arc(u * .03, shY + u * .13, u * .11, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = A.coreHot; ctx.beginPath(); ctx.arc(u * .03, shY + u * .13, u * .055, 0, TAU); ctx.fill();
  for (const sx of [-u * .25, u * .27]) {
    poly([sx - u * .12, shY + u * .08, sx + u * .12, shY + u * .08, sx + u * .09, shY - u * .06, sx - u * .09, shY - u * .06], A.metalDark);
    for (let i = 0; i < 4; i++) { const cy = shY - u * (.07 + i * .045); ctx.fillStyle = i % 2 ? A.copperDark : A.copper; ctx.beginPath(); ctx.ellipse(sx, cy, u * (.05 - i * .006), u * .018, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#c9d3dc"; ctx.beginPath(); ctx.ellipse(sx, shY - u * .26, u * .055, u * .025, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = Math.max(1, u * .01); ctx.stroke();
    if (!reduce && (charged || pose === "arcs" || Math.sin(t * 7 + sx) > .85)) lightningBolt(ctx, sx, shY - u * .26, sx + u * .12 * Math.sin(t * 9 + sx), shY - u * .42, { now, seed: Math.round(sx), segments: 4, width: Math.max(1, u * .012), branch: false });
  }
  // Head: a squared helm with a lit visor slit.
  const hy = b - u * A.headY - bob;
  poly([-u * .11, hy + u * .12, u * .13, hy + u * .12, u * .13, hy - u * .05, u * .08, hy - u * .1, -u * .09, hy - u * .1, -u * .12, hy - u * .04], A.metal);
  // Centurion crest: a crimson brush standing in a tall arc from brow to nape on a bronze ridge, its edge spiky with bristles.
  { const cx = -u * .005, cy = hy - u * .04, r1 = u * .1, r2 = u * .26, a0 = Math.PI * 1.08, a1 = Math.PI * 1.92, n = 16;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, r = r2 * (i % 2 ? .9 : 1) * (.82 + .18 * Math.sin(Math.PI * i / n)); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .95); }
    for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * .8); }
    ctx.closePath(); ctx.fillStyle = A.crest; ctx.fill(); ctx.strokeStyle = "#3a0c10"; ctx.lineWidth = Math.max(1, u * .01); ctx.stroke();
    ctx.strokeStyle = A.crestLight; ctx.lineWidth = Math.max(1, u * .007);
    for (let i = 1; i < n; i += 2) { const a = a0 + (a1 - a0) * i / n; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1 * 1.1, cy + Math.sin(a) * r1 * .9); ctx.lineTo(cx + Math.cos(a) * r2 * .8, cy + Math.sin(a) * r2 * .78); ctx.stroke(); }
    ctx.strokeStyle = A.copper; ctx.lineWidth = Math.max(1.5, u * .025); ctx.beginPath(); ctx.ellipse(cx, cy, r1, r1 * .8, 0, a0, a1); ctx.stroke(); }
  ctx.fillStyle = A.core; ctx.fillRect(u * .0, hy - u * .015, u * .12, u * .035); ctx.fillStyle = A.coreHot; ctx.fillRect(u * .03, hy - u * .005, u * .07, u * .014);
  leg(1, 0, false); arm(u * .29, clubAngle, false, true);
  ctx.restore();
  // Charged: bolts crawl over the silhouette.
  if (charged && !reduce) for (let i = 0; i < 3; i++) { const a = (t * 3 + i * 2.1) % TAU, r = u * .45; lightningBolt(ctx, k + Math.cos(a) * r * .6, b - u * .55 + Math.sin(a) * r, k + Math.cos(a + 1.2) * r * .6, b - u * .55 + Math.sin(a + 1.2) * r, { now, seed: i + 7, segments: 5, width: Math.max(1, u * .014), branch: false }); }
}

// The storm cloud that carries it away at its chasm (drawn under the body while `fleeFade` runs 1 -> 0).
export function drawGiantCloud(ctx, k, b, u, fade, t) {
  const rise = 1 - fade;
  ctx.save(); ctx.globalAlpha *= Math.min(1, .3 + rise * 1.5) * Math.max(.2, fade + .2);
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + t * .4, rx = u * (.18 + (i % 3) * .05), x = k + Math.cos(a) * u * .32, y = b + Math.sin(a) * u * .07 + u * .04;
    ctx.fillStyle = i % 2 ? "#3d4652" : "#59636f"; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .55, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#77818c"; ctx.beginPath(); ctx.ellipse(k, b - u * .02, u * .3, u * .1, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

export const GIANT_EFFECT_KINDS = new Set(["giantArc", "giantBolt", "giantShock", "giantSky", "giantStrike", "giantChest"]);
// f: a pack effect; s: tile size. Positions use the shared projection (x+.5, y+.62).
export function drawGiantEffect(ctx, f, s, now, { reduceMotion = false } = {}) {
  const P = (x, y) => ({ x: (x + .5) * s, y: (y + .62) * s }), at = P(f.x, f.y), r = (f.radius || 1) * s, life = Math.max(0, f.life ?? 0), total = f.total || .5;
  ctx.save();
  if (f.kind === "giantArc") {
    const u = s * Math.max(.6, Number(f.scale) || 2), from = { x: at.x, y: at.y + .2 * s - u * .75 }, to = P(f.tx ?? f.x, f.ty ?? f.y);
    const n = 4, reach = f.connected ? 1 : .55;
    for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * s * .12, end = { x: from.x + (to.x - from.x) * reach + ox, y: from.y + (to.y - .35 * s - from.y) * reach };
      lightningBolt(ctx, from.x + ox * .3, from.y, end.x, end.y, { now: reduceMotion ? 0 : now, seed: (f.seed || 0) * 10 + i, segments: 9, jitter: .16, width: Math.max(1.2, s * .05) }); }
    if (f.connected) { ctx.fillStyle = "rgba(234,250,255,.6)"; ctx.beginPath(); ctx.arc(to.x, to.y - .35 * s, s * .18, 0, TAU); ctx.fill(); }
  } else if (f.kind === "giantBolt") {
    const v = Math.hypot(f.vx || 0, f.vy || 1) || 1, tail = { x: at.x - (f.vx / v) * s * .9, y: at.y - (f.vy / v) * s * .9 - s * .2 };
    lightningBolt(ctx, tail.x, tail.y, at.x, at.y - s * .2, { now: reduceMotion ? 0 : now, seed: Math.round(f.x * 13 + f.y * 7), segments: 5, jitter: .25, width: Math.max(1.2, s * .06), branch: false });
  } else if (f.kind === "giantShock") {
    const k2 = 1 - life / total; ctx.globalAlpha = 1 - k2;
    lightningBolt(ctx, at.x, at.y - s * 4, at.x, at.y, { now, seed: 3, segments: 10, jitter: .08, width: Math.max(2, s * .08) });
    ctx.strokeStyle = "#eafaff"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.ellipse(at.x, at.y, r * (.5 + k2), r * (.5 + k2) * .45, 0, 0, TAU); ctx.stroke();
  } else if (f.kind === "giantSky") {
    if (f.arming > 0) { // the mark: a crackling ring that tightens until the bolt falls
      const prog = 1 - f.arming / (f.armTotal || 1); ctx.strokeStyle = "rgba(127,214,255,.85)"; ctx.lineWidth = Math.max(1, s * .04);
      ctx.beginPath(); ctx.ellipse(at.x, at.y, r, r * .45, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(127,214,255,${.12 + .25 * prog})`; ctx.beginPath(); ctx.ellipse(at.x, at.y, r * prog, r * prog * .45, 0, 0, TAU); ctx.fill();
    } else {
      const k2 = 1 - life / total; ctx.globalAlpha = 1 - k2 * k2;
      lightningBolt(ctx, at.x + s * .3, at.y - s * (f.storm ? 6 : 8), at.x, at.y, { now, seed: Math.round(f.x * 31 + f.y * 17), segments: 11, jitter: .07, width: Math.max(2, s * (f.storm ? .07 : .12)) });
      const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r * 1.3); g.addColorStop(0, "rgba(234,250,255,.85)"); g.addColorStop(1, "rgba(127,214,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(at.x, at.y, r * 1.3, r * .6, 0, 0, TAU); ctx.fill();
    }
  } else if (f.kind === "giantChest") { // a short, thick bolt fired from the chest core
    const u = s * Math.max(.6, Number(f.scale) || 2), from = { x: at.x, y: at.y + .2 * s - u * .77 }, to = P(f.tx ?? f.x, f.ty ?? f.y), k2 = 1 - life / total; ctx.globalAlpha = 1 - k2 * k2;
    for (let i = 0; i < 2; i++) lightningBolt(ctx, from.x, from.y, to.x, to.y - .4 * s, { now: reduceMotion ? 0 : now, seed: 40 + i, segments: 7, jitter: .1, width: Math.max(2, s * (i ? .06 : .13)) });
  } else if (f.kind === "giantStrike") {
    const k2 = 1 - life / total, u = s * Math.max(.6, Number(f.scale) || 2); ctx.globalAlpha = 1 - k2;
    lightningBolt(ctx, at.x + s * .2, at.y - s * 9, at.x + u * .25, at.y + .2 * s - u * 1.3, { now, seed: 11, segments: 12, jitter: .06, width: Math.max(2, s * .12) });
  }
  ctx.restore();
}

// The Wayfarer knocked flat by a shock: tips over, shakes, then gets back up. Returns the transform to apply around
// the player draw ({ angle, shake }) for the time since the shock (ms) and its length (ms).
export const GIANT_KNOCKDOWN = Object.freeze({ fall: 110, rise: 150, shake: 2.2, shakeRate: 40 });
export function knockdownPose(sinceMs, totalMs, reduceMotion = false) {
  const K = GIANT_KNOCKDOWN, left = totalMs - sinceMs;
  const down = sinceMs < K.fall ? sinceMs / K.fall : left < K.rise ? Math.max(0, left / K.rise) : 1;
  return { angle: -Math.PI / 2 * down, shake: reduceMotion ? 0 : Math.sin(sinceMs / K.shakeRate) * K.shake * (down > .5 ? 1 : 0) };
}
export function drawShockSparks(ctx, x, y, s, now) {
  for (let i = 0; i < 3; i++) { const a = now / 160 + i * 2.1; lightningBolt(ctx, x + Math.cos(a) * s * .25, y - s * .3 + Math.sin(a) * s * .1, x + Math.cos(a + .9) * s * .3, y - s * .45, { now, seed: i + 21, segments: 4, width: Math.max(1, s * .03), branch: false }); }
}
