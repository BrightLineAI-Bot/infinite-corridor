// The Lightning Giant (release 257, Tim 2026-10-21): a big armoured, Armored Core-style robot that has lost one arm. It
// fights with a Tesla mace in the other, and boosts around on an energy eruption from the empty shoulder socket. Also its
// lightning effects and the knocked-down Wayfarer. Native Canvas 2D, drawn by code.
import { DANGER } from "./monster-pack.js?v=r583-3d55d3375c64"; // release 397
const TAU = Math.PI * 2;

// Body proportions in body units (u = tile size x actor scale); club poses as angles from straight ahead (0),
// positive downward, for the club arm.
export const GIANT_ART = Object.freeze({
  height: 1.12, hipY: .5, shoulderY: .9, headY: 1.04, legGap: .26, thigh: .25, shin: .25,
  // Gait (distance-driven, so planted feet never slide): stride is the stance sweep either side of the hip, in body units.
  stride: .15, stanceShare: .6, footLift: .09, bob: .018, settle: 4,
  // Boost: the forward lean and the eruption from the empty shoulder socket.
  boostLean: .14, boostPlume: .62,
  // At sea (release 257, Tim: "he'll just be riding his big cloud") it stands on a storm cloud this high above the water, bobbing.
  cloudRide: .16, cloudBob: .02,
  upperArm: .2, foreArm: .19, clubLength: .58, clubHead: .2,
  metal: "#6c7681", metalDark: "#3a424c", metalEdge: "#15191e", plate: "#8a95a1", copper: "#b8743c", copperDark: "#7a4a24",
  core: "#7fd6ff", coreHot: "#eafaff", haze: "#7fd6ff", crest: "#2f8fe8", crestLight: "#dff4ff", crestEdge: "#0d3a66", trim: "#3b9cf0", rivet: "#c3ccd5",
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

const smoothing = new WeakMap();
function eased(e, key, target, now, rate) {
  const st = smoothing.get(e) || {}; smoothing.set(e, st);
  const prev = st[key], dt = Math.min(.1, Math.max(0, (now - (st.at?.[key] ?? now)) / 1000));
  st.at = { ...(st.at || {}), [key]: now };
  if (!Number.isFinite(prev) || !(dt > 0)) { st[key] = target; return target; }
  st[key] = prev + (target - prev) * Math.min(1, dt * rate); return st[key];
}

// q: the shared pack paint context { k, b, u, t, flip, e, s }. `now` (ms) drives easing and flicker only.
// Drawn as one machine of overlapping, lit armour plates (key light from the upper left, cyan bounce from the core):
// far leg and the empty far socket first, then torso, skirt, near leg, collar, helm and crest, then the club arm on top.
export function drawLightningGiant(ctx, q, now = 0) {
  const A = GIANT_ART, { k, u, t, flip, e } = q, s0 = e.pack, pose = e.giantPose || "idle", attacking = !!s0?.attack, reduce = !!e.reduceMotion;
  const afloat = !!e.marine && e.fleeFade == null, trail = eased(e, "cloudTrail", -flip, now, 3), ground = q.b - (afloat ? u * (A.cloudRide + (reduce ? 0 : Math.sin(t * 1.6) * A.cloudBob)) : 0), b = ground - Math.max(0, Number(e.giantAir) || 0) * (q.s || u);
  const charged = e.giantCharged > 0, still = attacking || e.giantCloud || afloat;
  const G = reduce ? { phase: 0, moving: 0 } : gait(e, now, q.s || u, u), m = still || e.giantThrust || b < ground - 1 ? 0 : G.moving, ph = G.phase;
  const air = Math.max(0, Math.min(1, (ground - b) / Math.max(1, u))); // the shadow stays on the ground and shrinks while it leaps
  if (afloat) { ctx.fillStyle = "rgba(6,12,20,.32)"; ctx.beginPath(); ctx.ellipse(k, q.b, u * .62, u * .11, 0, 0, TAU); ctx.fill(); drawStormCloud(ctx, k, b, u, t, now, "back", reduce, trail); }
  else { ctx.fillStyle = `rgba(6,8,12,${.45 * (1 - air * .5)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * .36 * (1 - air * .35), u * .09 * (1 - air * .35), 0, 0, TAU); ctx.fill(); }
  if (charged) {
    const g = ctx.createRadialGradient(k, b - u * .6, u * .1, k, b - u * .6, u * .85); g.addColorStop(0, "rgba(127,214,255,.32)"); g.addColorStop(1, "rgba(127,214,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, b - u * .6, u * .7, u * .82, 0, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(k, 0); ctx.scale(flip, 1);
  // Boosting: the whole machine leans into the burst, pivoting on its feet.
  const lean = eased(e, "lean", e.giantThrust ? A.boostLean : 0, now, 10); if (lean) { ctx.translate(0, ground); ctx.rotate(lean); ctx.translate(0, -ground); }
  const bob = m * u * A.bob * (1 + Math.cos(2 * ph)) / 2, Y = (h) => b - u * h + bob, lw = Math.max(1, u * .011);
  // A lit plate: base fill, a lighter upper-left sheen, a darker lower band, and a crisp dark outline.
  const plate = (pts, base, { light = .16, shadow = .22, edge = A.metalEdge } = {}) => {
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
    let minY = Infinity, maxY = -Infinity; for (let i = 1; i < pts.length; i += 2) { minY = Math.min(minY, pts[i]); maxY = Math.max(maxY, pts[i]); }
    const g = ctx.createLinearGradient(0, minY, 0, maxY); g.addColorStop(0, shadeHex(base, light)); g.addColorStop(.55, base); g.addColorStop(1, shadeHex(base, -shadow));
    path(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke();
  };
  // A tapered armoured limb segment from (x1,y1) to (x2,y2), widths w1 -> w2.
  const segment = (x1, y1, x2, y2, w1, w2, base) => {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    plate([x1 + nx * w1 / 2, y1 + ny * w1 / 2, x2 + nx * w2 / 2, y2 + ny * w2 / 2, x2 - nx * w2 / 2, y2 - ny * w2 / 2, x1 - nx * w1 / 2, y1 - ny * w1 / 2], base);
  };
  const rivets = (pts) => { ctx.fillStyle = A.rivet; for (let i = 0; i < pts.length; i += 2) { ctx.beginPath(); ctx.arc(pts[i], pts[i + 1], Math.max(.8, u * .011), 0, TAU); ctx.fill(); } };
  const edgeLight = (pts) => { ctx.strokeStyle = "rgba(235,242,248,.75)"; ctx.lineWidth = Math.max(1, u * .009); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); }; // crisp catch-light on a top edge
  const trim = (pts, width = .016) => { ctx.strokeStyle = A.trim; ctx.lineWidth = Math.max(1, u * width); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
  const joint = (x, y, r, base) => { const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, shadeHex(base, .25)); g.addColorStop(1, shadeHex(base, -.25)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.stroke(); };
  // Legs: two-bone IK in the walk cycle; armoured thigh and shin, a knee cap, a heavy wedge foot with a toe plate.
  const hipY = Y(.55);
  const leg = (side, phase, far) => {
    // Planted stance then a lifted swing (giantFoot); braced long stride while boosting; tucked in the air.
    const hx = side * u * .13, S = u * A.stride, f = giantFoot(ph, m, phase);
    let fx = hx + side * u * .03 + S * f.x, lift = u * A.footLift * f.lift;
    if (e.giantThrust) { fx = hx + (side > 0 ? S * 1.5 : -S * 1.7); lift = side > 0 ? u * .04 : 0; }
    else if (b < ground - 1) { fx = hx + side * S * .5; lift = u * (side > 0 ? .14 : .09); }
    const fy = b - lift, L1 = u * .27, L2 = u * .27;
    const dx = fx - hx, dy = fy - u * .07 - hipY, d = Math.min(L1 + L2 - 1e-3, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const kx = hx + Math.cos(a - c) * L1, ky = hipY + Math.sin(a - c) * L1, ax = fx, ay = fy - u * .07;
    const tone = far ? A.metalDark : A.metal, plateTone = far ? "#4a535d" : A.plate;
    segment(hx, hipY, kx, ky, u * .2, u * .16, tone);
    segment(kx, ky, ax, ay, u * .17, u * .13, tone);
    segment(kx + u * .03, ky + u * .02, ax + u * .03, ay - u * .04, u * .08, u * .06, plateTone); // shin guard
    // Calf hydraulics: a cylinder and a polished rod from behind the knee to the heel.
    const px1 = kx - u * .05, py1 = ky + u * .04, px2 = ax - u * .05, py2 = ay - u * .02, pm = .55;
    segment(px1, py1, px1 + (px2 - px1) * pm, py1 + (py2 - py1) * pm, u * .045, u * .045, far ? "#30363d" : "#3e464f");
    ctx.strokeStyle = far ? "#7d8893" : "#c9d3dc"; ctx.lineWidth = Math.max(1, u * .018); ctx.beginPath(); ctx.moveTo(px1 + (px2 - px1) * pm, py1 + (py2 - py1) * pm); ctx.lineTo(px2, py2); ctx.stroke();
    plate([kx - u * .06, ky - u * .05, kx + u * .08, ky - u * .06, kx + u * .09, ky + u * .04, kx - u * .04, ky + u * .06], plateTone); // knee cap
    if (!far) trim([kx - u * .04, ky + u * .045, kx + u * .075, ky + u * .03]);
    plate([ax - u * .11, fy, ax + u * .17, fy, ax + u * .15, fy - u * .06, ax + u * .05, fy - u * .1, ax - u * .09, fy - u * .1], far ? "#2b3138" : A.metalDark); // foot
    plate([ax + u * .09, fy, ax + u * .19, fy, ax + u * .16, fy - u * .05, ax + u * .09, fy - u * .05], plateTone); // toe plate
  };
  // Arms: a pauldron over the shoulder root, an armoured upper arm, an elbow joint, a gauntlet and a fist.
  const shoulderY = Y(.9);
  const arm = (shx, angle, far, club) => {
    const ua = angle * .55 + .35, ex = shx + Math.cos(ua) * u * .21, ey = shoulderY + Math.sin(ua) * u * .21;
    const hx = ex + Math.cos(angle) * u * .2, hy = ey + Math.sin(angle) * u * .2, tone = far ? A.metalDark : A.metal;
    segment(shx, shoulderY, ex, ey, u * .16, u * .13, tone); joint(ex, ey, u * .065, far ? "#4a535d" : A.plate);
    segment(ex, ey, hx, hy, u * .17, u * .14, tone); // gauntlet
    if (club) drawClub(hx, hy, angle);
    const fc = Math.cos(angle), fs = Math.sin(angle), fnx = -fs, fny = fc, r = u * .075; // a blocky gauntlet fist, knuckles across the haft
    plate([hx - fc * r + fnx * r, hy - fs * r + fny * r, hx + fc * r * .7 + fnx * r * 1.05, hy + fs * r * .7 + fny * r * 1.05, hx + fc * r * .7 - fnx * r * 1.05, hy + fs * r * .7 - fny * r * 1.05, hx - fc * r - fnx * r, hy - fs * r - fny * r], far ? "#2b3138" : A.metalDark);
    ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; for (const o of [-.45, 0, .45]) { ctx.beginPath(); ctx.moveTo(hx + fc * r * .2 + fnx * r * o, hy + fs * r * .2 + fny * r * o); ctx.lineTo(hx + fc * r * .65 + fnx * r * o, hy + fs * r * .65 + fny * r * o); ctx.stroke(); } // knuckle lines
  };
  const drawClub = (hx, hy, angle) => { // a Tesla mace: steel haft with grip wraps, a flanged capacitor head wound in copper
    const c = Math.cos(angle), sn = Math.sin(angle), nx = -sn, ny = c, L = u * A.clubLength, H = u * A.clubHead * 1.15;
    const cx = hx + c * L, cy = hy + sn * L, h0x = cx - c * H, h0y = cy - sn * H, W = u * .12, P = (f, o) => [hx + c * L * f + nx * o, hy + sn * L * f + ny * o];
    segment(hx - c * u * .08, hy - sn * u * .08, h0x, h0y, u * .07, u * .075, "#59626c"); // haft
    ctx.strokeStyle = "#2a2f35"; ctx.lineWidth = Math.max(1, u * .012); for (const f of [-.06, .02, .1]) { const [x1, y1] = P(f, u * .04), [x2, y2] = P(f + .03, -u * .04); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } // grip wraps
    const [fx1, fy1] = P((L - H) / L - .02, W * 1.25), [fx2, fy2] = P((L - H) / L - .02, -W * 1.25); // lower flange
    plate([fx1, fy1, fx2, fy2, h0x - nx * W * .7, h0y - ny * W * .7, h0x + nx * W * .7, h0y + ny * W * .7], A.metalDark);
    plate([h0x + nx * W, h0y + ny * W, cx + nx * W * .9, cy + ny * W * .9, cx + c * u * .03 + nx * W * .5, cy + sn * u * .03 + ny * W * .5, cx + c * u * .03 - nx * W * .5, cy + sn * u * .03 - ny * W * .5, cx - nx * W * .9, cy - ny * W * .9, h0x - nx * W, h0y - ny * W], A.metal, { light: .25 }); // head
    for (const f of [.2, .42, .64]) { const bx = h0x + (cx - h0x) * f, by = h0y + (cy - h0y) * f, ww = W * .98; ctx.strokeStyle = A.copperDark; ctx.lineWidth = u * .04; ctx.beginPath(); ctx.moveTo(bx + nx * ww, by + ny * ww); ctx.lineTo(bx - nx * ww, by - ny * ww); ctx.stroke(); ctx.strokeStyle = A.copper; ctx.lineWidth = u * .02; ctx.stroke(); } // windings
    const vx = h0x + (cx - h0x) * .85, vy = h0y + (cy - h0y) * .85, hot = charged || pose === "raise";
    ctx.fillStyle = hot ? A.coreHot : A.core; ctx.globalAlpha = hot ? 1 : .85; for (const o of [-.5, .5]) { ctx.beginPath(); ctx.arc(vx + nx * W * o, vy + ny * W * o, u * .022, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; // vents
    ctx.fillStyle = hot ? A.coreHot : A.core; ctx.beginPath(); ctx.arc(cx + c * u * .03, cy + sn * u * .03, u * .04, 0, TAU); ctx.fill(); // capacitor cap
    q.clubTip = { x: k + flip * cx, y: cy };
  };
  const pauldron = (sx, far) => { // a rounded armoured shell over the arm root
    plate([sx - u * .15, shoulderY + u * .02, sx - u * .12, shoulderY - u * .09, sx, shoulderY - u * .13, sx + u * .13, shoulderY - u * .08, sx + u * .15, shoulderY + u * .04, sx + u * .08, shoulderY + u * .1, sx - u * .1, shoulderY + u * .09], far ? "#4a535d" : A.plate);
    if (far) return;
    edgeLight([sx - u * .11, shoulderY - u * .09, sx, shoulderY - u * .125, sx + u * .12, shoulderY - u * .075]);
    trim([sx - u * .13, shoulderY + u * .045, sx + u * .13, shoulderY + u * .065], .022); // blue rim band
    rivets([sx - u * .08, shoulderY - u * .07, sx + u * .02, shoulderY - u * .1, sx + u * .1, shoulderY - u * .05]);
  };
  const pylon = (sx) => { // a Tesla coil on a vented mount, leaning back; it doubles as the dash thruster
    const bx = sx + (sx < 0 ? -u * .05 : u * .03), by = shoulderY - u * .11, lean = -.22;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(lean);
    plate([-u * .06, 0, u * .06, 0, u * .045, -u * .045, -u * .045, -u * .045], A.metalDark); // vented mount
    ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; for (const x of [-.025, 0, .025]) { ctx.beginPath(); ctx.moveTo(x * u, -u * .008); ctx.lineTo(x * u, -u * .037); ctx.stroke(); }
    segment(0, -u * .045, 0, -u * .2, u * .045, u * .038, "#4a535d"); // core rod
    for (let i = 0; i < 5; i++) { const cy = -u * (.065 + i * .028); ctx.fillStyle = i % 2 ? A.copperDark : A.copper; ctx.beginPath(); ctx.ellipse(0, cy, u * (.04 - i * .003), u * .012, 0, 0, TAU); ctx.fill(); } // windings
    const g = ctx.createRadialGradient(-u * .015, -u * .225, u * .005, 0, -u * .215, u * .06); g.addColorStop(0, "#f2f6fa"); g.addColorStop(1, "#7d8893");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -u * .215, u * .06, u * .026, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.stroke(); // toroid
    ctx.restore();
    const top = { x: bx + Math.sin(-lean) * -u * .215 * -1, y: by - Math.cos(lean) * u * .215 };
    if (!reduce && (charged || pose === "arcs" || Math.sin(t * 7 + sx) > .85)) lightningBolt(ctx, top.x, top.y, top.x + u * .12 * Math.sin(t * 9 + sx), top.y - u * .16, { now, seed: Math.round(sx), segments: 4, width: Math.max(1, u * .012), branch: false });
    return top;
  };
  // The lost arm: a torn shoulder socket on the far side, capped by a ring housing with severed cable stubs. It is the
  // booster: a steady glow inside, and an eruption of energy out behind the machine whenever it boosts.
  // The lost arm: a torn shoulder socket at the back of the far shoulder, a ring housing with severed cable stubs, drawn
  // over the torso's back edge so the hole stays in view. It is the booster: a steady glow inside, and while boosting an
  // eruption of energy that blasts straight out of the hole, with a white-hot flare filling its mouth.
  const socket = (sx) => {
    const cy = shoulderY - u * .01, boost = e.giantThrust ? 1 : 0, flick = reduce ? 0 : Math.sin(t * 38) * .5 + .5, mouth = { x: sx - u * .02, y: cy };
    plate([sx - u * .1, cy + u * .05, sx - u * .08, cy - u * .07, sx + u * .06, cy - u * .1, sx + u * .12, cy - u * .02, sx + u * .09, cy + u * .08], "#4a535d"); // ring housing
    const g = ctx.createRadialGradient(mouth.x, cy, u * .01, mouth.x, cy, u * .07); g.addColorStop(0, boost ? "#ffffff" : "rgba(127,214,255,.9)"); g.addColorStop(.6, boost ? A.coreHot : "rgba(40,70,90,.9)"); g.addColorStop(1, boost ? A.core : "#11161b");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(mouth.x, cy, u * .062, u * .072, -.3, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.stroke(); // the open socket
    ctx.strokeStyle = A.copperDark; ctx.lineWidth = Math.max(1, u * .016); ctx.lineCap = "round";
    for (const [a, l] of [[2.5, .06], [3.2, .045], [3.9, .055]]) { ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * u * .06, cy + Math.sin(a) * u * .07); ctx.lineTo(sx + Math.cos(a) * u * (.06 + l), cy + Math.sin(a) * u * (.07 + l) + u * .02); ctx.stroke(); } // severed cables
    if (!boost) return;
    // The eruption, from inside the hole outward: layered plume, then a flare over the mouth, then sparks.
    const len = u * A.boostPlume * (.85 + .15 * flick), dir = { x: -.99, y: .06 }, px = -dir.y, py = dir.x;
    for (const [wide, color, alpha] of [[.15, "127,214,255", .4], [.095, "160,226,255", .75], [.045, "234,250,255", 1]]) {
      const pg = ctx.createLinearGradient(mouth.x, cy, mouth.x + dir.x * len, cy + dir.y * len); pg.addColorStop(0, `rgba(${color},${alpha})`); pg.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(mouth.x + px * u * wide * .45, cy + py * u * wide * .45); ctx.quadraticCurveTo(mouth.x + dir.x * len * .45 + px * u * wide, cy + dir.y * len * .45 + py * u * wide, mouth.x + dir.x * len, cy + dir.y * len);
      ctx.quadraticCurveTo(mouth.x + dir.x * len * .45 - px * u * wide, cy + dir.y * len * .45 - py * u * wide, mouth.x - px * u * wide * .45, cy - py * u * wide * .45); ctx.closePath(); ctx.fill();
    }
    const fl = ctx.createRadialGradient(mouth.x, cy, 0, mouth.x, cy, u * (.11 + .03 * flick)); fl.addColorStop(0, "rgba(255,255,255,.95)"); fl.addColorStop(.45, "rgba(170,230,255,.6)"); fl.addColorStop(1, "rgba(127,214,255,0)");
    ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(mouth.x, cy, u * (.11 + .03 * flick), 0, TAU); ctx.fill(); // flare at the mouth
    if (!reduce) for (let i = 0; i < 5; i++) { const f = ((t * 6 + i * .21) % 1), d = len * (.15 + f * .85), wob = Math.sin(i * 2.3 + t * 9) * u * .07 * f; ctx.fillStyle = `rgba(234,250,255,${1 - f})`; ctx.fillRect(mouth.x + dir.x * d + px * wob - u * .01, cy + dir.y * d + py * wob - u * .01, u * .02, u * .02); }
  };
  // Head jets (Tim, 2026-10-21, replacing the blade crest: "3 small Tesla coils that conform to the back of the head...
  // each of them will have an individual burst of energy coming out of it. It looks kind of like a bolt"; then "one more
  // bolt generator... towards the front of his head... a larger bolt", then "closer to the group... so it reads more like a
  // plumage"). A fourth, larger jet leads the group from the crown, most upright, with the biggest bolt. Three copper-
  // wound coil jets of different sizes sit along the back of the helm, fanned from up-and-back to straight back; each
  // fires its own bolt-shaped burst of energy, with a stray arc now and then. The crown cap's lit channel feeds them.
  const crest = (hb, H) => {
    const jets = [ // [root x, root y, direction, coil length, coil radius, burst length]
      [-u * .09, hb - H * .96, -2.45, u * .085, u * .032, u * .26],
      [-u * .145, hb - H * .78, -2.78, u * .07, u * .027, u * .2],
      [-u * .165, hb - H * .58, -3.04, u * .055, u * .022, u * .14],
      [-u * .03, hb - H - u * .012, -2.08, u * .1, u * .036, u * .36], // the lead generator: the biggest and most upright, with the largest bolt
    ];
    const headCap = () => {
    // The crown cap: a solid armoured plate over the top of the dome (its lower edge a seam across the helm), so the crest
    // reads as one piece with the head; the jets mount over its back edge.
    const cap = [u * .175, hb - H * .63, u * .13, hb - H * .9, u * .04, hb - H - u * .03, -u * .07, hb - H * .98 - u * .025, -u * .15, hb - H * .78, -u * .16, hb - H * .5, -u * .02, hb - H * .58];
    plate(cap, A.metal, { light: .32, shadow: .18 });
    edgeLight([u * .165, hb - H * .66, u * .125, hb - H * .91, u * .04, hb - H - u * .026, -u * .065, hb - H * .975 - u * .022]);
    ctx.strokeStyle = shadeHex(A.metal, -.4); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(u * .02, hb - H - u * .02); ctx.lineTo(u * .0, hb - H * .6); ctx.stroke(); // panel line
    // The lit channel: from the brow trim, up over the crown and back to the jets.
    const channel = [u * .17, hb - H * .64, u * .1, hb - H * .86, u * .02, hb - H * .94, -u * .08, hb - H * .88, -u * .13, hb - H * .74];
    trim(channel, .016);
    ctx.globalAlpha *= reduce ? .6 : .35 + .35 * Math.sin(t * 4); ctx.strokeStyle = A.coreHot; ctx.lineWidth = Math.max(1, u * .006); ctx.beginPath(); for (let n = 0; n < channel.length; n += 2) n ? ctx.lineTo(channel[n], channel[n + 1]) : ctx.moveTo(channel[0], channel[1]); ctx.stroke(); ctx.globalAlpha = 1;
    rivets([u * .11, hb - H * .7, -u * .12, hb - H * .6]);
    };
    const jet = ([x0, y0, a, len, r, burst], n) => {
      const c = Math.cos(a), sn = Math.sin(a), nx = -sn, ny = c, P = (f, o) => [x0 + c * f + nx * o, y0 + sn * f + ny * o];
      const pulse = reduce ? .85 : .75 + .25 * Math.sin(t * 13 + n * 2.1), L = burst * pulse, w = r * 1.5;
      // The burst first, so the nozzle sits over its root: a lightning-bolt glyph of energy, white at the nozzle.
      const tip = len + r * .3;
      { const [gx, gy] = P(tip + L * .3, 0), gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, L * .65); gl.addColorStop(0, "rgba(127,214,255,.35)"); gl.addColorStop(1, "rgba(127,214,255,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(gx, gy, L * .65, 0, TAU); ctx.fill(); } // soft glow
      const glyph = [[0, -w * .55], [L * .5, -w * .15], [L * .44, -w * .85], [L, 0], [L * .52, w * .2], [L * .58, w * .9], [0, w * .55]].map(([f, o]) => P(tip + f, o));
      const g = ctx.createLinearGradient(...P(tip, 0), ...P(tip + L, 0)); g.addColorStop(0, "rgba(255,255,255,.98)"); g.addColorStop(.35, "rgba(160,226,255,.92)"); g.addColorStop(1, "rgba(47,143,232,.15)");
      ctx.beginPath(); glyph.forEach(([x, y], k2) => k2 ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(47,143,232,.7)"; ctx.lineWidth = Math.max(1, u * .006); ctx.stroke();
      if (!reduce && Math.sin(t * 7.3 + n * 2.6) > .6) { const [ax, ay] = P(tip + L * .6, 0); lightningBolt(ctx, ax, ay, ax + Math.cos(a + .6) * u * .1, ay + Math.sin(a + .6) * u * .1, { now, seed: 60 + n, segments: 4, width: Math.max(1, u * .008), branch: false }); }
      // The coil: a mount on the helm, a copper-wound core, and a flared steel nozzle.
      joint(x0, y0, r * 1.15, A.metalDark);
      plate([...P(0, r), ...P(len * .82, r * .9), ...P(len * .82, -r * .9), ...P(0, -r)], "#3e464f");
      const turns = Math.max(3, Math.round(len / (u * .016)));
      for (let k2 = 0; k2 < turns; k2++) { const f = len * (.12 + .66 * k2 / (turns - 1)); ctx.strokeStyle = k2 % 2 ? A.copperDark : A.copper; ctx.lineWidth = Math.max(1, u * .011); ctx.beginPath(); ctx.moveTo(...P(f, r * 1.05)); ctx.lineTo(...P(f, -r * 1.05)); ctx.stroke(); }
      plate([...P(len * .78, r * .95), ...P(tip, r * 1.4), ...P(tip, -r * 1.4), ...P(len * .78, -r * .95)], A.metal, { light: .3 }); // nozzle
      ctx.fillStyle = A.coreHot; ctx.beginPath(); ctx.ellipse(...P(tip, 0), r * .35, r * 1.1, a, 0, TAU); ctx.fill(); // white-hot mouth
    };
    headCap();
    [2, 1, 0, 3].forEach((n) => jet(jets[n], n)); // the back jets lowest first, then the lead generator over them
  };
  const clubAngle = eased(e, "club", A.poses[pose] ?? A.poses.idle, now, A.ease) + (pose === "idle" ? m * Math.sin(ph) * .1 : 0);
  // Far side.
  leg(-1, Math.PI, true);
  // Torso: segmented waist, a barrel chest, a breastplate around the glowing core.
  plate([-u * .16, Y(.64), u * .18, Y(.64), u * .16, Y(.54), -u * .14, Y(.54)], A.metalDark);
  ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; for (const h of [.575, .61]) { ctx.beginPath(); ctx.moveTo(-u * .14, Y(h)); ctx.lineTo(u * .16, Y(h)); ctx.stroke(); }
  plate([-u * .19, Y(.63), u * .21, Y(.63), u * .34, Y(.81), u * .3, Y(.94), -u * .27, Y(.94), -u * .31, Y(.81)], A.metal);
  plate([-u * .2, Y(.66), u * .22, Y(.66), u * .28, Y(.8), u * .2, Y(.9), -u * .17, Y(.9), -u * .25, Y(.8)], A.plate, { light: .2 });
  edgeLight([-u * .25, Y(.81), -u * .17, Y(.895), u * .19, Y(.895)]);
  trim([-u * .23, Y(.8), -u * .1, Y(.8)]); trim([u * .14, Y(.8), u * .26, Y(.8)]); // seams either side of the core
  rivets([-u * .16, Y(.875), u * .19, Y(.875), -u * .19, Y(.7), u * .21, Y(.7)]);
  ctx.strokeStyle = shadeHex(A.plate, -.35); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(u * .02, Y(.66)); ctx.lineTo(u * .02, Y(.7)); ctx.moveTo(u * .02, Y(.885)); ctx.lineTo(u * .02, Y(.9)); ctx.stroke(); // centre panel line
  const pulse = pose === "chest" ? 1.4 : .55 + .45 * Math.sin(t * (charged ? 14 : 4)), coreY = Y(.79);
  ctx.fillStyle = A.metalDark; ctx.beginPath(); ctx.arc(u * .02, coreY, u * .085, 0, TAU); ctx.fill(); ctx.strokeStyle = A.metalEdge; ctx.stroke();
  ctx.fillStyle = A.core; ctx.globalAlpha = Math.min(1, .35 + .4 * pulse); ctx.beginPath(); ctx.arc(u * .02, coreY, u * .07, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = A.coreHot; ctx.beginPath(); ctx.arc(u * .02, coreY, u * .038, 0, TAU); ctx.fill();
  socket(-u * .3); // the lost arm's socket, over the torso's back edge
  // Near leg, then the hip skirt over both thigh roots.
  leg(1, 0, false);
  plate([-u * .22, Y(.59), u * .24, Y(.59), u * .22, Y(.47), u * .07, Y(.44), -u * .05, Y(.46), -u * .2, Y(.48)], A.metalDark);
  ctx.strokeStyle = A.metalEdge; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(u * .01, Y(.59)); ctx.lineTo(u * .01, Y(.455)); ctx.stroke(); // tasset split
  // Collar, helm (with a brow and a visor), and the crest.
  plate([-u * .17, Y(.92), u * .18, Y(.92), u * .15, Y(1.01), -u * .14, Y(1.01)], A.metalDark); // raised collar
  const hb = Y(.965), H = u * .255; // the helm: a heavy dome with a jutting brow, a visor slit and a jaw guard
  plate([-u * .14, hb, u * .18, hb, u * .215, hb - H * .45, u * .15, hb - H * .85, u * .03, hb - H, -u * .11, hb - H * .9, -u * .16, hb - H * .45], A.metal, { light: .24 });
  edgeLight([-u * .11, hb - H * .88, u * .03, hb - H * .98, u * .14, hb - H * .84]);
  plate([u * .03, hb - H * .52, u * .21, hb - H * .55, u * .2, hb - H * .3, u * .04, hb - H * .3], "#1a2026"); // visor recess
  trim([u * .0, hb - H * .58, u * .2, hb - H * .6], .02); // brow ridge
  ctx.fillStyle = A.core; ctx.fillRect(u * .06, hb - H * .48, u * .13, u * .028); ctx.fillStyle = A.coreHot; ctx.fillRect(u * .085, hb - H * .46, u * .08, u * .012);
  plate([u * .05, hb - H * .26, u * .19, hb - H * .26, u * .17, hb - u * .01, u * .05, hb - u * .01], A.metalDark); // jaw guard
  crest(hb, H);
  // Near side on top: thruster pylon, club arm, pauldron.
  pylon(u * .29);
  arm(u * .29, clubAngle, false, true); pauldron(u * .29, false);
  ctx.restore();
  if (afloat) drawStormCloud(ctx, k, b, u, t, now, "front", reduce, trail); // the near puffs swallow its feet
  if (charged && !reduce) for (let i = 0; i < 3; i++) { const a = (t * 3 + i * 2.1) % TAU, r = u * .45; lightningBolt(ctx, k + Math.cos(a) * r * .6, b - u * .55 + Math.sin(a) * r, k + Math.cos(a + 1.2) * r * .6, b - u * .55 + Math.sin(a + 1.2) * r, { now, seed: i + 7, segments: 5, width: Math.max(1, u * .014), branch: false }); }
}

// Lighten (amount > 0) or darken (< 0) a #rrggbb colour.
function shadeHex(hex, amount) {
  const n = parseInt(hex.slice(1, 7), 16), f = (c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = f(n >> 16 & 255), g = f(n >> 8 & 255), bl = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

// Its big storm cloud: ridden across the sea, and the one it rises on at its chasm. (k, y) is where its feet stand. The
// "back" layer goes under the body, the "front" layer (the near billows that swallow its feet) over it.
// Drawn as a traditional layered cartoon cloud in flat tones, not shaded in 3D (Tim, 2026-10-21: "billowy sections in
// the cloud front, up into the middle, and then... other sections that are not billowing... layered"). From the leading
// edge (its facing) back past the middle it is billows, each with a lit cap and a shadowed belly, ending in a large one
// at the trailing end; behind that it trails away in flat, tapered streaks of different lengths, stacked in layers. Shapes are [x, y, r] or streaks [from, to, y, h] in units of u, +x = facing.
const CLOUD_TONES = { edge: "#2a3038", dark: "#3d4550", mid: "#5f6a76", light: "#8a95a1", cap: "#b4bec8" };
const CLOUD_BILLOWS = { back: [[-.38, .0, .19], [-.2, -.04, .18], [-.02, -.13, .22], [.2, -.13, .22], [.4, -.04, .18], [.55, .04, .12]], front: [[-.36, .1, .15], [-.18, .1, .15], [.04, .11, .17], [.26, .1, .16], [.45, .07, .12]] };
const CLOUD_STREAKS = { back: [[-.2, -1.05, -.05, .2, "mid"], [-.3, -1.25, -.12, .09, "light"], [-.35, -.95, .07, .08, "dark"]], front: [[-.3, -.8, .13, .1, "dark"], [-.35, -1.1, .17, .06, "mid"], [-.4, -.68, .2, .05, "dark"], [-.38, -.92, .23, .04, "mid"]] };
// `trail` (-1..1) is the side the streaks trail toward: opposite its facing, eased by the caller as it turns. While it
// turns (|trail| small) the streaks draw in under the billows, so the cloud swaps ends without a jump.
export function drawStormCloud(ctx, k, y, u, t, now, layer, reduce = false, trail = 0) {
  const C = CLOUD_TONES, F = -(Math.sign(trail) || -1), L = .35 + .65 * Math.abs(trail), bob = (i) => reduce ? 0 : Math.sin(t * .9 + i * 1.7) * u * .008;
  const X = (x) => k + F * x * u, billows = CLOUD_BILLOWS[layer].map(([x, dy, r], i) => ({ x: X(x), y: y + dy * u + bob(i), r: r * u }));
  // A streak: a flat band, its head under the billows, thinning to a tapered end; their lengths differ, so the trailing
  // edge is jagged, which reads as movement.
  const streak = ([from, to, dy, h], dyOff = 0) => {
    const x0 = X(from), x1 = X(to * L + (1 - L) * from), cy = y + dy * u + dyOff, hh = h * u / 2;
    ctx.beginPath(); ctx.moveTo(x0, cy - hh); ctx.lineTo(x0 + (x1 - x0) * .55, cy - hh * .9); ctx.quadraticCurveTo(x0 + (x1 - x0) * .85, cy - hh * .6, x1, cy + hh * .15);
    ctx.quadraticCurveTo(x0 + (x1 - x0) * .8, cy + hh * .95, x0 + (x1 - x0) * .4, cy + hh); ctx.lineTo(x0, cy + hh); ctx.arc(x0, cy, hh, Math.PI / 2, -Math.PI / 2, F < 0); ctx.closePath();
  };
  const blob = (dx = 0, dy = 0) => { ctx.beginPath(); for (const c of billows) { ctx.moveTo(c.x + c.r + dx, c.y + dy); ctx.arc(c.x + dx, c.y + dy, c.r, 0, TAU); } };
  ctx.save();
  if (layer === "back" && !reduce) { ctx.strokeStyle = "rgba(160,190,215,.35)"; ctx.lineWidth = Math.max(1, u * .008); ctx.beginPath(); for (let i = 0; i < 8; i++) { const x = X((i / 7 - .5) * .7 + .1), f = (t * 1.8 + i * .37) % 1, y0 = y + u * (.16 + f * .1); ctx.moveTo(x, y0); ctx.lineTo(x - u * .02, y0 + u * .07); } ctx.stroke(); } // rain
  // Streaks first (furthest back), each with a dark edge copy just below it and a lit band along its top.
  for (const S of CLOUD_STREAKS[layer]) {
    streak(S, u * .012); ctx.fillStyle = C.edge; ctx.fill();
    streak(S); ctx.fillStyle = C[S[4]]; ctx.fill();
    ctx.save(); ctx.clip(); streak(S, -S[3] * u * .6); ctx.fillStyle = S[4] === "light" ? C.cap : C.light; ctx.globalAlpha *= .5; ctx.fill(); ctx.restore();
  }
  // Billows: a dark edge copy, the mid-tone body, then (clipped to it) a lit cap on each and a flat shadow across the belly.
  blob(0, u * .016); ctx.fillStyle = C.edge; ctx.fill();
  blob(); ctx.fillStyle = C.mid; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = C.light; for (const c of billows) { ctx.beginPath(); ctx.arc(c.x - c.r * .18, c.y - c.r * .28, c.r * .78, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.cap; for (const c of billows) { ctx.beginPath(); ctx.arc(c.x - c.r * .3, c.y - c.r * .48, c.r * .42, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.dark; const belly = Math.max(...billows.map((c) => c.y)) + u * (layer === "back" ? .02 : .04); ctx.fillRect(k - u * 2, belly, u * 4, u);
  ctx.restore();
  if (layer === "front" && !reduce && Math.sin(t * 4.1) > .7) { const a = Math.floor(t * 4.1 / TAU) * 2.39, x0 = X(.1 + Math.sin(a) * .25); lightningBolt(ctx, x0, y + u * .06, x0 + u * .1, y + u * .17, { now, seed: 90 + Math.floor(t), segments: 4, width: Math.max(1, u * .012), branch: false }); } // lightning flickering inside
  ctx.restore();
}
// The cloud that carries it away at its chasm (drawn under the body while `fleeFade` runs 1 -> 0): the same storm cloud.
export function drawGiantCloud(ctx, k, b, u, fade, t, trail = 0) {
  ctx.save(); ctx.globalAlpha *= Math.min(1, .45 + (1 - fade) * 1.5) * Math.max(.25, fade + .2);
  drawStormCloud(ctx, k, b, u, t, t * 1000, "back", false, trail); drawStormCloud(ctx, k, b, u, t, t * 1000, "front", false, trail);
  ctx.restore();
}

export const GIANT_EFFECT_KINDS = new Set(["giantArc", "giantBolt", "giantShock", "giantSky", "giantStrike", "giantChest"]);
// f: a pack effect; s: tile size. Positions use the shared projection (x+.5, y+.62).
export function drawGiantEffect(ctx, f, s, now, { reduceMotion = false } = {}) {
  const P = (x, y) => ({ x: (x + .5) * s, y: (y + .62) * s }), at = P(f.x, f.y), r = (f.radius || 1) * s, life = Math.max(0, f.life ?? 0), total = f.total || .5;
  ctx.save();
  if (f.kind === "giantArc") {
    { const rr = (f.range || 7.5) * s; ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.ellipse(at.x, at.y - .2 * s, rr, rr * .7, 0, 0, TAU); ctx.fill(); ctx.stroke(); } // release 397: the arcs' reach while they live
    const u = s * Math.max(.6, Number(f.scale) || 2), from = { x: at.x, y: at.y + .2 * s - u * .75 }, to = P(f.tx ?? f.x, f.ty ?? f.y);
    const n = 4, reach = f.connected ? 1 : .55;
    for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * s * .12, end = { x: from.x + (to.x - from.x) * reach + ox, y: from.y + (to.y - .35 * s - from.y) * reach };
      lightningBolt(ctx, from.x + ox * .3, from.y, end.x, end.y, { now: reduceMotion ? 0 : now, seed: (f.seed || 0) * 10 + i, segments: 9, jitter: .16, width: Math.max(1.2, s * .05) }); }
    if (f.connected) { ctx.fillStyle = "rgba(234,250,255,.6)"; ctx.beginPath(); ctx.arc(to.x, to.y - .35 * s, s * .18, 0, TAU); ctx.fill(); }
  } else if (f.kind === "giantBolt" && f.arming > 0) { // release 397: the lane it will fly, before it flies
    const v = Math.hypot(f.vx || 0, f.vy || 1) || 1, len = v * (f.life || .9) * s, a = Math.atan2(f.vy, f.vx), w2 = ((f.radius || .3) + .3) * s;
    ctx.translate(at.x, at.y - s * .2); ctx.rotate(a); ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .03); ctx.fillRect(0, -w2, len, w2 * 2); ctx.strokeRect(0, -w2, len, w2 * 2);
  } else if (f.kind === "giantBolt") {
    const v = Math.hypot(f.vx || 0, f.vy || 1) || 1, tail = { x: at.x - (f.vx / v) * s * .9, y: at.y - (f.vy / v) * s * .9 - s * .2 };
    lightningBolt(ctx, tail.x, tail.y, at.x, at.y - s * .2, { now: reduceMotion ? 0 : now, seed: Math.round(f.x * 13 + f.y * 7), segments: 5, jitter: .25, width: Math.max(1.2, s * .06), branch: false });
  } else if (f.kind === "giantShock") {
    const k2 = 1 - life / total; ctx.globalAlpha = 1 - k2;
    lightningBolt(ctx, at.x, at.y - s * 4, at.x, at.y, { now, seed: 3, segments: 10, jitter: .08, width: Math.max(2, s * .08) });
    ctx.strokeStyle = "#eafaff"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.ellipse(at.x, at.y, r * (.5 + k2), r * (.5 + k2) * .45, 0, 0, TAU); ctx.stroke();
  } else if (f.kind === "giantSky") {
    if (f.arming > 0) { // the mark: a crackling ring that tightens until the bolt falls
      const prog = 1 - f.arming / (f.armTotal || 1); ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = Math.max(1, s * .04); // release 397: the uniform warning colour
      ctx.beginPath(); ctx.ellipse(at.x, at.y, r, r * .45, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(255,110,199,${.1 + .2 * prog})`; ctx.beginPath(); ctx.ellipse(at.x, at.y, r * prog, r * prog * .45, 0, 0, TAU); ctx.fill();
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
