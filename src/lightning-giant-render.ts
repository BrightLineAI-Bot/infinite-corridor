// The Lightning Giant (release 257, Tim 2026-10-21): a giant walking robot with an iron-and-copper club and Tesla coils
// on its shoulders, plus its lightning effects and the knocked-down Wayfarer. Native Canvas 2D, drawn by code.
const TAU = Math.PI * 2;

// Body proportions in body units (u = tile size x actor scale); club poses as angles from straight ahead (0),
// positive downward, for the club arm.
export const GIANT_ART = Object.freeze({
  // Gait (distance-driven, so planted feet never slide): stride is the stance sweep either side of the hip, in body units;
  // the stance phase keeps the foot flat on the ground, the swing phase lifts it with a heavy knee.
  stride: .17, stanceShare: .6, footLift: .1, bob: .02, pitch: .1, sway: .035, armSwing: .3, settle: 4,
  clubLength: .58, clubHead: .2,
  // Weathered, mismatched plate in faded olive-grey, rust and grime; a frayed hide garment; the blue lightning crest.
  metal: "#6d7068", metalDark: "#3e413b", metalEdge: "#16180f", plate: "#878b7f", rust: "#7d4528", grime: "#2b2a22",
  copper: "#a86a38", copperDark: "#6e4422", cloth: "#7b6447", clothDark: "#4f3f2b", clothLight: "#a38a64",
  core: "#7fd6ff", coreHot: "#eafaff", haze: "#7fd6ff", crest: "#2f8fe8", crestLight: "#dff4ff", crestEdge: "#0d3a66",
  poses: { idle: .85, arcs: .15, point: 1.2, pointFire: 1.2, swingReady: -2.35, swingFore: .75, swingBack: 2.55, slamRaise: -1.75, slamDown: .95, raise: -1.57, menace: -1.95, chest: 1.15, chargeLow: 2.2, upswing: -1.05 },
  freeArm: { idle: 1.35, arcs: -.05, point: -.05, pointFire: -.1, raise: -1.45, slamRaise: -1.5, slamDown: 1.2, menace: -1.6, chest: 2.4, chargeLow: .4, upswing: .2 },
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

// One foot through the stride cycle, as offsets from its hip: x in stride units (+1 forward), lift in footLift units.
// Stance (the first stanceShare of the cycle): the foot sweeps back at exactly the body's speed, flat on the ground, so it
// stays planted. Swing: an eased arc forward with the lift peaking mid-swing.
export function giantFoot(phase, moving = 1, offset = 0) {
  const p = (((phase + offset) / TAU) % 1 + 1) % 1, st = GIANT_ART.stanceShare;
  if (p < st) return { x: moving * (1 - 2 * p / st), lift: 0, planted: true };
  const q = (p - st) / (1 - st), ease = q * q * (3 - 2 * q);
  return { x: moving * (-1 + 2 * ease), lift: moving * Math.sin(Math.PI * q), planted: false };
}

// Gait state per actor (render-only, kept off the actor so drawing never mutates game state): the walk phase advances by
// the distance the actor actually travelled, so each planted foot stays put on the ground while the body passes over it.
const gaits = new WeakMap();
function gait(e, now, s, u) {
  const g = gaits.get(e) || { phase: 0, moving: 0 }; gaits.set(e, g);
  const x = Number(e.x) || 0, y = Number(e.y) || 0, dt = g.at == null ? 0 : Math.min(.1, Math.max(0, (now - g.at) / 1000));
  const travelled = g.x == null ? 0 : Math.hypot(x - g.x, y - g.y) * s;
  g.at = now; g.x = x; g.y = y;
  if (dt > 0) {
    const cycle = 2 * GIANT_ART.stride * u / GIANT_ART.stanceShare; // body travel per full stride cycle
    if (travelled < u * 1.5) g.phase = (g.phase + TAU * travelled / Math.max(1, cycle)) % TAU; // a teleport-sized jump never spins the legs
    const target = travelled / dt > u * .05 ? 1 : 0; g.moving += (target - g.moving) * Math.min(1, dt * GIANT_ART.settle);
  }
  return g;
}

// q: the shared pack paint context { k, b, u, t, flip, e, s }. `now` (ms) drives easing, gait timing and flicker only.
// A weathered old giant of a robot people, not a knight: hunched, head low and jutting, battered mismatched plates, a bare
// mechanical shoulder on the club arm and a frayed hide garment strapped over the other shoulder down to the waist.
export function drawLightningGiant(ctx, q, now = 0) {
  const A = GIANT_ART, { k, u, t, flip, e } = q, s0 = e.pack, pose = e.giantPose || "idle", attacking = !!s0?.attack, ground = q.b, b = ground - Math.max(0, Number(e.giantAir) || 0) * (q.s || u);
  const charged = e.giantCharged > 0, reduce = !!e.reduceMotion, lw = Math.max(1, u * .011);
  const G = reduce ? { phase: 0, moving: 0 } : gait(e, now, q.s || u, u), m = e.giantCloud || e.giantThrust || b < ground - 1 ? 0 : G.moving, ph = G.phase;
  const air = Math.max(0, Math.min(1, (ground - b) / Math.max(1, u)));
  ctx.fillStyle = `rgba(6,8,12,${.45 * (1 - air * .5)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * .36 * (1 - air * .35), u * .09 * (1 - air * .35), 0, 0, TAU); ctx.fill();
  if (charged) {
    const g = ctx.createRadialGradient(k, b - u * .6, u * .1, k, b - u * .6, u * .85); g.addColorStop(0, "rgba(127,214,255,.32)"); g.addColorStop(1, "rgba(127,214,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, b - u * .6, u * .7, u * .82, 0, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(k, 0); ctx.scale(flip, 1);
  // Body motion: the weight drops at each heel strike (twice a cycle), the torso pitches forward and rocks with the stride,
  // and breathes slowly when standing.
  const breathe = reduce ? 0 : Math.sin(t * 1.6) * u * .006, bob = m * u * A.bob * (1 + Math.cos(2 * ph)) / 2, Y = (h) => b - u * h + bob - breathe * (h > .6 ? 1 : 0);
  const pitch = A.pitch + m * A.sway * Math.sin(2 * ph) + (e.giantThrust ? .12 : 0);
  // Lit, weathered plate: shaded fill, grime at the base, a crisp outline; optional rust streak and dent.
  const plate = (pts, base, { light = .14, shadow = .26, rust = 0, dent = null } = {}) => {
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity; for (let i = 0; i < pts.length; i += 2) { minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]); minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1]); }
    const g = ctx.createLinearGradient(0, minY, 0, maxY); g.addColorStop(0, shadeHex(base, light)); g.addColorStop(.6, base); g.addColorStop(1, shadeHex(base, -shadow));
    path(); ctx.fillStyle = g; ctx.fill();
    if (rust || dent) { ctx.save(); path(); ctx.clip();
      if (rust) { ctx.fillStyle = A.rust; ctx.globalAlpha = .55; const rx = minX + (maxX - minX) * rust; ctx.beginPath(); ctx.moveTo(rx - u * .02, minY); ctx.lineTo(rx + u * .015, minY); ctx.lineTo(rx + u * .008, maxY); ctx.lineTo(rx - u * .01, maxY - (maxY - minY) * .3); ctx.closePath(); ctx.fill(); }
      if (dent) { ctx.globalAlpha = .5; ctx.strokeStyle = shadeHex(base, -.45); ctx.lineWidth = Math.max(1, u * .008); ctx.beginPath(); ctx.arc(dent[0], dent[1], u * .025, .4, 2.6); ctx.stroke(); ctx.strokeStyle = shadeHex(base, .3); ctx.beginPath(); ctx.arc(dent[0], dent[1] + u * .005, u * .025, 3.6, 5.6); ctx.stroke(); }
      ctx.restore(); }
    path(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke();
  };
  const segment = (x1, y1, x2, y2, w1, w2, base, opts) => {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    plate([x1 + nx * w1 / 2, y1 + ny * w1 / 2, x2 + nx * w2 / 2, y2 + ny * w2 / 2, x2 - nx * w2 / 2, y2 - ny * w2 / 2, x1 - nx * w1 / 2, y1 - ny * w1 / 2], base, opts);
  };
  const joint = (x, y, r, base) => { const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, shadeHex(base, .2)); g.addColorStop(1, shadeHex(base, -.3)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.stroke(); };
  const rivets = (pts) => { ctx.fillStyle = "#9a9d92"; for (let i = 0; i < pts.length; i += 2) { ctx.beginPath(); ctx.arc(pts[i], pts[i + 1], Math.max(.8, u * .01), 0, TAU); ctx.fill(); } };
  // Upper body is drawn in a frame pitched forward about the hips: the hunch.
  const hipY = Y(.55), upper = (fn) => { ctx.save(); ctx.translate(0, hipY); ctx.transform(1, 0, -Math.tan(pitch), 1, 0, 0); ctx.translate(0, -hipY); fn(); ctx.restore(); };
  const lean = (h) => Math.tan(pitch) * (hipY - Y(h)); // forward offset of a point at height h in the hunched frame
  // Legs: planted stance (foot flat, sliding back under the body), then a lifted swing with a strong knee raise.
  const legPose = (side, offset) => {
    const hx = side * u * .13, S = u * A.stride;
    if (e.giantThrust) return { hx, fx: hx + (side > 0 ? S * 1.6 : -S * 1.8), lift: side > 0 ? u * .05 : 0 }; // dash: a long braced stride
    if (b < ground - 1) return { hx, fx: hx + side * S * .5, lift: u * (side > 0 ? .16 : .1) }; // airborne: legs tucked
    const f = giantFoot(ph, m, offset);
    return { hx, fx: hx + S * f.x, lift: u * A.footLift * f.lift };
  };
  const leg = (side, offset, far) => {
    const { hx, fx, lift } = legPose(side, offset), fy = b - lift, L1 = u * .27, L2 = u * .27;
    const ax = fx, ay = fy - u * .07, dx = ax - hx, dy = ay - hipY, d = Math.min(L1 + L2 - 1e-3, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const kx = hx + Math.cos(a - c) * L1, ky = hipY + Math.sin(a - c) * L1, tone = far ? A.metalDark : A.metal, worn = far ? "#4b4e46" : A.plate;
    segment(hx, hipY, kx, ky, u * .2, u * .16, tone, { rust: far ? 0 : .7 });
    // Calf hydraulics behind the shin, then the shin and its battered guard.
    const px1 = kx - u * .05, py1 = ky + u * .04, px2 = ax - u * .06, py2 = ay - u * .01;
    segment(px1, py1, px1 + (px2 - px1) * .55, py1 + (py2 - py1) * .55, u * .045, u * .045, "#34372f");
    ctx.strokeStyle = far ? "#7a7d72" : "#b5b8ab"; ctx.lineWidth = Math.max(1, u * .016); ctx.beginPath(); ctx.moveTo(px1 + (px2 - px1) * .55, py1 + (py2 - py1) * .55); ctx.lineTo(px2, py2); ctx.stroke();
    segment(kx, ky, ax, ay, u * .17, u * .13, tone);
    segment(kx + u * .03, ky + u * .02, ax + u * .03, ay - u * .04, u * .08, u * .06, worn, { dent: [kx + u * .04, ky + (ay - ky) * .45], rust: .4 });
    joint(kx, ky, u * .065, worn);
    // Foot: a broad flat sole that stays level, toes rolling up only as it leaves the ground.
    const toe = lift > 0 ? Math.min(u * .03, lift * .5) : 0;
    plate([ax - u * .12, fy, ax + u * .15, fy - toe, ax + u * .14, fy - u * .06 - toe, ax + u * .04, fy - u * .1, ax - u * .1, fy - u * .1], far ? "#2d2f29" : A.metalDark, { rust: .3 });
    ctx.strokeStyle = A.grime; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ax + u * .06, fy - u * .01 - toe * .6); ctx.lineTo(ax + u * .06, fy - u * .07); ctx.stroke(); // toe split
  };
  // Arms hang long and heavy (a mechanical shoulder ball; no armour on the club side, free to move).
  const shoulderY = Y(.88);
  const arm = (shx, angle, far, club) => {
    const ua = angle * .55 + .4, ex = shx + Math.cos(ua) * u * .23, ey = shoulderY + Math.sin(ua) * u * .23;
    const hx = ex + Math.cos(angle) * u * .22, hy = ey + Math.sin(angle) * u * .22, tone = far ? A.metalDark : A.metal;
    joint(shx, shoulderY, u * .085, far ? "#3d4038" : "#5b5e55"); // exposed shoulder ball
    if (!far) { ctx.strokeStyle = A.grime; ctx.lineWidth = Math.max(1, u * .014); ctx.beginPath(); ctx.moveTo(shx - u * .05, shoulderY + u * .02); ctx.quadraticCurveTo(shx, shoulderY + u * .1, ex - u * .02, ey); ctx.stroke(); } // cable bundle
    segment(shx, shoulderY, ex, ey, u * .15, u * .12, tone, { rust: far ? 0 : .3 }); joint(ex, ey, u * .06, far ? "#4b4e46" : A.plate);
    segment(ex, ey, hx, hy, u * .18, u * .15, tone, { dent: far ? null : [ex + (hx - ex) * .5, ey + (hy - ey) * .5] });
    if (club) drawClub(hx, hy, angle);
    const fc = Math.cos(angle), fs = Math.sin(angle), fnx = -fs, fny = fc, r = u * .08;
    plate([hx - fc * r + fnx * r, hy - fs * r + fny * r, hx + fc * r * .7 + fnx * r * 1.05, hy + fs * r * .7 + fny * r * 1.05, hx + fc * r * .7 - fnx * r * 1.05, hy + fs * r * .7 - fny * r * 1.05, hx - fc * r - fnx * r, hy - fs * r - fny * r], far ? "#2d2f29" : A.metalDark);
    ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; for (const o of [-.45, 0, .45]) { ctx.beginPath(); ctx.moveTo(hx + fc * r * .2 + fnx * r * o, hy + fs * r * .2 + fny * r * o); ctx.lineTo(hx + fc * r * .65 + fnx * r * o, hy + fs * r * .65 + fny * r * o); ctx.stroke(); }
  };
  const drawClub = (hx, hy, angle) => { // a Tesla mace: worn steel haft with grip wraps, a flanged capacitor head wound in copper
    const c = Math.cos(angle), sn = Math.sin(angle), nx = -sn, ny = c, L = u * A.clubLength, H = u * A.clubHead * 1.15;
    const cx = hx + c * L, cy = hy + sn * L, h0x = cx - c * H, h0y = cy - sn * H, W = u * .12, P = (f, o) => [hx + c * L * f + nx * o, hy + sn * L * f + ny * o];
    segment(hx - c * u * .08, hy - sn * u * .08, h0x, h0y, u * .07, u * .075, "#5a5c55");
    ctx.strokeStyle = A.clothDark; ctx.lineWidth = Math.max(1, u * .016); for (const f of [-.06, .02, .1]) { const [x1, y1] = P(f, u * .04), [x2, y2] = P(f + .03, -u * .04); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } // hide grip wraps
    const [fx1, fy1] = P((L - H) / L - .02, W * 1.25), [fx2, fy2] = P((L - H) / L - .02, -W * 1.25);
    plate([fx1, fy1, fx2, fy2, h0x - nx * W * .7, h0y - ny * W * .7, h0x + nx * W * .7, h0y + ny * W * .7], A.metalDark);
    plate([h0x + nx * W, h0y + ny * W, cx + nx * W * .9, cy + ny * W * .9, cx + c * u * .03 + nx * W * .5, cy + sn * u * .03 + ny * W * .5, cx + c * u * .03 - nx * W * .5, cy + sn * u * .03 - ny * W * .5, cx - nx * W * .9, cy - ny * W * .9, h0x - nx * W, h0y - ny * W], A.metal, { light: .2, rust: .65 });
    for (const f of [.2, .42, .64]) { const bx = h0x + (cx - h0x) * f, by = h0y + (cy - h0y) * f, ww = W * .98; ctx.strokeStyle = A.copperDark; ctx.lineWidth = u * .04; ctx.beginPath(); ctx.moveTo(bx + nx * ww, by + ny * ww); ctx.lineTo(bx - nx * ww, by - ny * ww); ctx.stroke(); ctx.strokeStyle = A.copper; ctx.lineWidth = u * .02; ctx.stroke(); }
    const vx = h0x + (cx - h0x) * .85, vy = h0y + (cy - h0y) * .85, hot = charged || pose === "raise";
    ctx.fillStyle = hot ? A.coreHot : A.core; ctx.globalAlpha = hot ? 1 : .85; for (const o of [-.5, .5]) { ctx.beginPath(); ctx.arc(vx + nx * W * o, vy + ny * W * o, u * .022, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    ctx.fillStyle = hot ? A.coreHot : A.core; ctx.beginPath(); ctx.arc(cx + c * u * .03, cy + sn * u * .03, u * .04, 0, TAU); ctx.fill();
    q.clubTip = { x: k + flip * cx, y: cy };
  };
  const pylon = (sx) => { // a Tesla coil on a vented mount, leaning back; it doubles as the dash thruster
    const bx = sx + (sx < 0 ? -u * .02 : u * .02), by = shoulderY - u * .1, tilt = -.28;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
    plate([-u * .06, 0, u * .06, 0, u * .045, -u * .045, -u * .045, -u * .045], A.metalDark, { rust: .5 });
    segment(0, -u * .045, 0, -u * .2, u * .045, u * .038, "#4b4e46");
    for (let i = 0; i < 5; i++) { const cy = -u * (.065 + i * .028); ctx.fillStyle = i % 2 ? A.copperDark : A.copper; ctx.beginPath(); ctx.ellipse(0, cy, u * (.04 - i * .003), u * .012, 0, 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(-u * .015, -u * .225, u * .005, 0, -u * .215, u * .06); g.addColorStop(0, "#e6e9dd"); g.addColorStop(1, "#6f7368");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -u * .215, u * .06, u * .026, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
    const top = { x: bx + Math.sin(-tilt) * -u * .215, y: by - Math.cos(tilt) * u * .215 };
    if (!reduce && (charged || pose === "arcs" || Math.sin(t * 7 + sx) > .85)) lightningBolt(ctx, top.x, top.y, top.x + u * .12 * Math.sin(t * 9 + sx), top.y - u * .16, { now, seed: Math.round(sx), segments: 4, width: Math.max(1, u * .012), branch: false });
  };
  const swing = m * A.armSwing * Math.sin(ph);
  const clubAngle = eased(e, "club", A.poses[pose] ?? A.poses.idle, now, A.ease) + (pose === "idle" ? swing * .3 : 0);
  const freeAngle = eased(e, "free", A.freeArm[pose] ?? A.freeArm.idle, now, A.ease) - (pose === "idle" ? swing : 0);
  // Far leg, far arm and coil behind everything.
  leg(-1, Math.PI, true);
  upper(() => pylon(-u * .28)); arm(-u * .28 + lean(.88), freeAngle, true, false); // arms hang from the leaned shoulders, unskewed
  // Pelvis and the waist cloth behind the near leg.
  plate([-u * .17, Y(.62), u * .18, Y(.62), u * .16, Y(.5), -u * .15, Y(.5)], A.metalDark, { rust: .2 });
  upper(() => {
    // Torso: a heavy, slightly asymmetric barrel of mismatched plates around the glowing core.
    plate([-u * .19, Y(.62), u * .2, Y(.62), u * .33, Y(.8), u * .27, Y(.93), -u * .26, Y(.95), -u * .31, Y(.79)], A.metal, { rust: .78, dent: [u * .2, Y(.72)] });
    plate([-u * .21, Y(.67), u * .2, Y(.66), u * .26, Y(.79), u * .19, Y(.89), -u * .17, Y(.9), -u * .25, Y(.8)], A.plate, { light: .18, dent: [-u * .12, Y(.84)] });
    plate([u * .1, Y(.67), u * .2, Y(.66), u * .23, Y(.74), u * .12, Y(.75)], "#6b6a58", { light: .1 }); // a newer, mismatched patch
    rivets([u * .11, Y(.675), u * .19, Y(.67), u * .21, Y(.735), u * .125, Y(.74), -u * .18, Y(.86), -u * .2, Y(.72)]);
    const pulse = pose === "chest" ? 1.4 : .55 + .45 * Math.sin(t * (charged ? 14 : 4)), coreY = Y(.79);
    ctx.fillStyle = A.metalDark; ctx.beginPath(); ctx.arc(u * .0, coreY, u * .085, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = A.core; ctx.globalAlpha = Math.min(1, .35 + .4 * pulse); ctx.beginPath(); ctx.arc(0, coreY, u * .07, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = A.coreHot; ctx.beginPath(); ctx.arc(0, coreY, u * .036, 0, TAU); ctx.fill();
    pylon(u * .22);
    ctx.strokeStyle = A.grime; ctx.lineWidth = Math.max(1, u * .012); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * u * .085, coreY + Math.sin(a) * u * .085); ctx.lineTo(Math.cos(a) * u * .1, coreY + Math.sin(a) * u * .1); ctx.stroke(); } // housing bolts
  });
  leg(1, 0, false);
  // The hide garment: strapped over the off-hand shoulder, across the chest to the near hip, knotted, with a loin flap
  // that swings a beat behind the stride.
  upper(() => {
    const sx = -u * .28, top = Y(.95), sway = reduce ? 0 : Math.sin(ph - .8) * m * u * .03 + Math.sin(t * 1.1) * u * .006;
    ctx.beginPath(); ctx.moveTo(sx - u * .07, top + u * .02); ctx.lineTo(sx + u * .1, top - u * .02); ctx.lineTo(u * .27, Y(.6)); ctx.lineTo(u * .13, Y(.55)); ctx.closePath();
    const g = ctx.createLinearGradient(sx, top, u * .2, Y(.55)); g.addColorStop(0, A.clothLight); g.addColorStop(.5, A.cloth); g.addColorStop(1, A.clothDark);
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#2c2318"; ctx.lineWidth = lw; ctx.stroke();
    ctx.strokeStyle = A.clothDark; ctx.lineWidth = Math.max(1, u * .01); for (const f of [.3, .55, .8]) { ctx.beginPath(); ctx.moveTo(sx + (u * .2 - sx) * f - u * .02, top + (Y(.57) - top) * f); ctx.lineTo(sx + (u * .2 - sx) * f + u * .05, top + (Y(.57) - top) * f - u * .03); ctx.stroke(); } // folds
    // Knot at the hip and the frayed loin flap.
    ctx.fillStyle = A.clothDark; ctx.beginPath(); ctx.ellipse(u * .2, Y(.575), u * .045, u * .035, .3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(u * .05, Y(.56)); ctx.lineTo(u * .22, Y(.575));
    const flapY = Y(.36), n = 5; for (let i = 0; i <= n; i++) { const f = 1 - i / n, x = u * .07 + f * u * .14 + sway * (1.3 - f * .3); ctx.lineTo(x + (i % 2 ? u * .012 : 0), flapY + (i % 2 ? u * .035 : -(i % 3) * u * .01)); }
    ctx.closePath(); const fg = ctx.createLinearGradient(0, Y(.57), 0, flapY); fg.addColorStop(0, A.cloth); fg.addColorStop(1, A.clothDark); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = "#2c2318"; ctx.lineWidth = lw; ctx.stroke();
    // Collar, then the head: low, thrust forward, a heavy brow ridge over a deep visor, a jutting jaw.
    plate([-u * .05, Y(.86), u * .2, Y(.86), u * .22, Y(.93), -u * .03, Y(.95)], A.metalDark); // neck housing, thrust forward
    const hx = u * .17, hb = Y(.9), H = u * .21;
    plate([hx - u * .12, hb, hx + u * .14, hb, hx + u * .17, hb - H * .55, hx + u * .1, hb - H * .92, hx - u * .05, hb - H, hx - u * .13, hb - H * .7], A.metal, { light: .2, rust: .25, dent: [hx - u * .05, hb - H * .7] });
    plate([hx - u * .02, hb - H * .66, hx + u * .2, hb - H * .7, hx + u * .19, hb - H * .52, hx - u * .01, hb - H * .5], "#5e6156", { light: .25 }); // brow ridge
    plate([hx + u * .02, hb - H * .5, hx + u * .17, hb - H * .5, hx + u * .16, hb - H * .3, hx + u * .03, hb - H * .3], "#14150f"); // deep visor
    ctx.fillStyle = A.core; ctx.fillRect(hx + u * .05, hb - H * .44, u * .09, u * .024); ctx.fillStyle = A.coreHot; ctx.fillRect(hx + u * .07, hb - H * .425, u * .05, u * .01);
    plate([hx, hb - H * .28, hx + u * .2, hb - H * .26, hx + u * .18, hb + u * .01, hx + u * .01, hb + u * .01], A.metalDark, { rust: .5 }); // jutting jaw
    drawCrest(ctx, A, u, hx - u * .1, hb - H * .78, t, now, reduce);
  });
  if (e.giantThrust) for (const [i, sx] of [-u * .28, u * .27].entries()) {
    const len = u * (.42 + (reduce ? 0 : .08 * Math.sin(t * 40 + i))), x0 = sx - u * .1 + lean(1.1), y0 = shoulderY - u * .24;
    const g = ctx.createLinearGradient(x0, y0, x0 - len, y0); g.addColorStop(0, "rgba(234,250,255,.95)"); g.addColorStop(.35, "rgba(127,214,255,.75)"); g.addColorStop(1, "rgba(127,214,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, y0 - u * .05); ctx.lineTo(x0 - len, y0 - u * .015); ctx.lineTo(x0 - len, y0 + u * .015); ctx.lineTo(x0, y0 + u * .05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(200,240,255,.45)"; ctx.lineWidth = Math.max(1, u * .01);
    for (let j = 0; j < 3; j++) { const yy = shoulderY + u * (.1 + j * .22), off = reduce ? 0 : ((t * 9 + j * .37) % 1) * u * .2; ctx.beginPath(); ctx.moveTo(-u * .36 - off, yy); ctx.lineTo(-u * .36 - off - u * .3, yy); ctx.stroke(); }
  }
  arm(u * .27 + lean(.88), clubAngle, false, true);
  ctx.restore();
  if (charged && !reduce) for (let i = 0; i < 3; i++) { const a = (t * 3 + i * 2.1) % TAU, r = u * .45; lightningBolt(ctx, k + Math.cos(a) * r * .6, b - u * .55 + Math.sin(a) * r, k + Math.cos(a + 1.2) * r * .6, b - u * .55 + Math.sin(a + 1.2) * r, { now, seed: i + 7, segments: 5, width: Math.max(1, u * .014), branch: false }); }
}

// Lighten (amount > 0) or darken (< 0) a #rrggbb colour.
function shadeHex(hex, amount) {
  const n = parseInt(hex.slice(1, 7), 16), f = (c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = f(n >> 16 & 255), g = f(n >> 8 & 255), bl = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

// Lightning crest (Tim 2026-10-21): blue, swept back like a pteranodon's crest and shaped like lightning. One long blade
// grows from the helm's crown and sweeps back and up with two sharp lightning notches; two shorter fins sit under it.
// Each blade shades from deep blue at the root to bright cyan at the edges, with a white-hot energy line along its spine.
// (rx, ry) is the crown point; facing is +x, so the crest runs toward -x.
function drawCrest(ctx, A, u, rx, ry, t, now, reduce) {
  const flick = reduce ? 0 : Math.sin(t * 9) * .02;
  const blade = (L, rise, w, drop) => {
    // Upper edge: root -> first notch -> second notch -> tip; lower edge returns with offset notches (a lightning zig).
    const top = [[u * .07, 0], [-L * .3, -rise * .42 - w * .3], [-L * .26, -rise * .5 + w * .05], [-L * .64, -rise * .82], [-L * .6, -rise * .76 + w * .08], [-L, -rise * (1 + flick)]];
    const bottom = [[-L * .7, -rise * .7 + w * .55], [-L * .74, -rise * .64 + w * .55], [-L * .36, -rise * .36 + w * .7], [-L * .4, -rise * .3 + w * .78], [-u * .04, drop]];
    return { pts: [...top, ...bottom], spine: [[u * .03, -w * .1], [-L * .28, -rise * .38], [-L * .62, -rise * .74], [-L * .96, -rise * .98]] };
  };
  const blades = [blade(u * .58, u * .36, u * .07, u * .04), blade(u * .42, u * .17, u * .055, u * .06), blade(u * .28, u * .03, u * .045, u * .07)];
  const path = (pts) => { ctx.beginPath(); ctx.moveTo(rx + pts[0][0], ry + pts[0][1]); for (const [x, y] of pts.slice(1)) ctx.lineTo(rx + x, ry + y); ctx.closePath(); };
  ctx.save(); ctx.lineJoin = "round";
  // Soft electric halo behind the whole crest.
  ctx.globalAlpha *= .28; ctx.strokeStyle = A.crestLight; ctx.lineWidth = u * .06; for (const B of blades) { path(B.pts); ctx.stroke(); } ctx.globalAlpha /= .28;
  for (const [i, B] of [...blades.entries()].reverse()) {
    const g = ctx.createLinearGradient(rx, ry, rx - u * .5, ry - u * .35); g.addColorStop(0, A.crestEdge); g.addColorStop(.45, A.crest); g.addColorStop(1, "#8fd3ff");
    path(B.pts); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = A.crestEdge; ctx.lineWidth = Math.max(1, u * .011); ctx.stroke();
    ctx.strokeStyle = i ? "rgba(223,244,255,.7)" : A.crestLight; ctx.lineWidth = Math.max(1, u * (i ? .007 : .011)); ctx.beginPath(); ctx.moveTo(rx + B.spine[0][0], ry + B.spine[0][1]); for (const [x, y] of B.spine.slice(1)) ctx.lineTo(rx + x, ry + y); ctx.stroke();
  }
  // The crown mount the crest grows from.
  ctx.fillStyle = A.metalDark; ctx.beginPath(); ctx.moveTo(rx - u * .08, ry + u * .05); ctx.quadraticCurveTo(rx + u * .02, ry - u * .04, rx + u * .1, ry + u * .03); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = Math.max(1, u * .01); ctx.stroke();
  if (!reduce && Math.sin(t * 5.3) > .55) lightningBolt(ctx, rx - u * .58, ry - u * .37, rx - u * .74, ry - u * .46, { now, seed: 77, segments: 3, width: Math.max(1, u * .012), branch: false });
  ctx.restore();
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
