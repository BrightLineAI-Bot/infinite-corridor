// The Briar Stag's body and effects (release 705). Drawing only: nothing here changes combat state.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). `now` (ms) drives the gait and flicker.
import { STAG, DANGER } from "./monster-pack.ts";

const TAU = Math.PI * 2;
export const STAG_ART = {
  hide: "#5a4632", hideDark: "#3a2c1e", bark: "#2a1d12", moss: "#5f7a3a", mossLight: "#8fae58", antler: "#d9ccb0", antlerDark: "#9c8a6a",
  bramble: "#3d2a18", thorn: "#e8e0c8", blossom: "#f4f0ff", blossomCore: "#ffd8f0", eye: "#c8ff8a", fire: "#9cff6a", fireCore: "#e6ffd0",
  stride: .16, stanceShare: .6, settle: 6,
};
export const STAG_EFFECT_KINDS = new Set(["briar", "thorn", "rootLine", "rootRing", "stagSpike"]);

const gaits = new WeakMap();
function gait(e, now, s, u) {
  const g = gaits.get(e) || { phase: 0, moving: 0 }; gaits.set(e, g);
  const x = Number(e.x) || 0, y = Number(e.y) || 0, dt = g.at == null ? 0 : Math.min(.1, Math.max(0, (now - g.at) / 1000));
  const travelled = g.x == null ? 0 : Math.hypot(x - g.x, y - g.y) * s;
  g.at = now; g.x = x; g.y = y;
  if (dt > 0) {
    if (travelled < u * 1.5) g.phase = (g.phase + TAU * travelled / Math.max(1, 2 * STAG_ART.stride * u / STAG_ART.stanceShare)) % TAU;
    const target = travelled / dt > u * .05 ? 1 : 0; g.moving += (target - g.moving) * Math.min(1, dt * STAG_ART.settle);
  }
  return g;
}
const smoothing = new WeakMap();
function eased(e, key, target, now, rate) {
  const st = smoothing.get(e) || {}; smoothing.set(e, st);
  const prev = st[key], last = st["@" + key], dt = last == null ? 0 : Math.min(.1, Math.max(0, (now - last) / 1000)); st["@" + key] = now;
  if (!Number.isFinite(prev) || !(dt > 0)) { st[key] = target; return target; }
  st[key] = prev + (target - prev) * Math.min(1, dt * rate); return st[key];
}
// How the pose bends the body: pitch of the body about the hind hips (+ rears up), head angle (+ raises), legs tucked, gallop.
const POSES = {
  idle: { pitch: 0, head: 0, tuck: 0, gallop: 0, open: 0 },
  lower: { pitch: -.06, head: -.75, tuck: 0, gallop: 0, open: 0 },
  charge: { pitch: -.05, head: -.8, tuck: 0, gallop: 1, open: 0 },
  rear: { pitch: .55, head: .35, tuck: .5, gallop: 0, open: .5 },
  stamp: { pitch: -.08, head: -.2, tuck: 0, gallop: 0, open: 0 },
  hookL: { pitch: -.04, head: -.55, tuck: 0, gallop: 0, open: 0, swing: -.45 },
  hookR: { pitch: -.04, head: -.35, tuck: 0, gallop: 0, open: 0, swing: .45 },
  toss: { pitch: .12, head: .5, tuck: 0, gallop: 0, open: .3 },
  shake: { pitch: 0, head: .15, tuck: 0, gallop: 0, open: 0, shake: 1 },
  shakeB: { pitch: 0, head: .05, tuck: 0, gallop: 0, open: 0, shake: -1 },
  crouch: { pitch: -.1, head: -.25, tuck: .35, gallop: 0, open: 0, squat: 1 },
  leap: { pitch: .1, head: .2, tuck: 1, gallop: 0, open: 0 },
  land: { pitch: -.12, head: -.35, tuck: .3, gallop: 0, open: 0, squat: .7 },
  bellow: { pitch: .18, head: .62, tuck: 0, gallop: 0, open: 1 },
};

export function drawBriarStag(ctx, q, now = 0) {
  const A = STAG_ART, { k, u, flip, e } = q, s = q.s || u, reduce = !!e.reduceMotion, t = now / 1000;
  const air = Math.max(0, Number(e.stagAir) || 0) * s, ground = q.b, b = ground - air;
  const P = POSES[e.stagPose] || POSES.idle, hunting = e.stagHunt > 0;
  const G = reduce ? { phase: 0, moving: 0 } : gait(e, now, s, u), moving = e.pack?.attack && e.stagPose !== "charge" ? 0 : G.moving, ph = G.phase + (P.gallop ? t * 14 : 0);
  const pitch = eased(e, "pitch", P.pitch, now, 9), head = eased(e, "head", P.head + (P.swing || 0) * .3, now, 11), tuck = eased(e, "tuck", P.tuck, now, 8), squat = eased(e, "squat", P.squat || 0, now, 10);
  const shake = P.shake && !reduce ? Math.sin(t * 38) * .14 * P.shake : 0;
  // Shadow on the ground, shrinking while it is aloft.
  const lift = Math.min(1, air / Math.max(1, u * 2));
  ctx.fillStyle = `rgba(8,6,4,${.42 * (1 - lift * .55)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * .62 * (1 - lift * .4), u * .12 * (1 - lift * .4), 0, 0, TAU); ctx.fill();
  if (hunting) { const g = ctx.createRadialGradient(k, b - u * .7, u * .1, k, b - u * .7, u * 1.1); g.addColorStop(0, "rgba(156,255,106,.26)"); g.addColorStop(1, "rgba(156,255,106,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, b - u * .7, u * 1, u * 1.05, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(k, 0); ctx.scale(flip, 1);
  const lw = Math.max(1, u * .012), hipX = -u * .32, hipY = b - u * (.58 - squat * .1), shX = u * .3;
  // The body pivots about the hind hips when it rears.
  const rot = (x, y) => { const dx = x - hipX, dy = y - hipY, c = Math.cos(-pitch), sn = Math.sin(-pitch); return [hipX + dx * c - dy * sn, hipY + dx * sn + dy * c]; };
  const [sx, sy] = rot(shX, hipY - u * .04);
  // Legs: a hind leg bends at the stifle (forward) and the hock (back); a foreleg is near straight, with a knee. Each tapers
  // from a muscled top to a slim cannon and a cloven hoof, planted through the stride and lifted on the swing.
  const limb = (pts, w0, w1, tone) => { // a tapered polyline limb
    ctx.fillStyle = tone; ctx.beginPath(); const n = pts.length / 2, side = [];
    for (let i = 0; i < n; i++) { const x = pts[i * 2], y = pts[i * 2 + 1], px = pts[Math.max(0, i - 1) * 2], py = pts[Math.max(0, i - 1) * 2 + 1], nx2 = pts[Math.min(n - 1, i + 1) * 2], ny2 = pts[Math.min(n - 1, i + 1) * 2 + 1], dx = nx2 - px, dy = ny2 - py, l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (n - 1)) / 2; side.push([x - dy / l * w, y + dx / l * w, x + dy / l * w, y - dx / l * w]); }
    ctx.moveTo(side[0][0], side[0][1]); for (const q of side) ctx.lineTo(q[0], q[1]); for (let i = side.length - 1; i >= 0; i--) ctx.lineTo(side[i][2], side[i][3]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = Math.max(.8, lw * .8); ctx.stroke();
  };
  const leg = (x0, y0, phase, far, front) => {
    const swing = Math.sin(ph + phase) * moving * (P.gallop ? 1.6 : 1), lifted = Math.max(0, Math.cos(ph + phase)) * moving, fold = tuck * (front ? 1 : .85);
    const fx = x0 + swing * u * A.stride * 1.4 + (front ? fold * u * .12 : -fold * u * .1), groundY = air || tuck ? Math.min(b, y0 + u * .5) : b, fy = groundY - lifted * u * .09 - fold * u * .2;
    const tone = far ? A.hideDark : A.hide, H = fy - y0;
    if (front) { const kx = x0 + (fx - x0) * .5 - u * .015 + fold * u * .1, ky = y0 + H * .52 - fold * u * .04; limb([x0, y0 - u * .05, x0 + (kx - x0) * .4, y0 + (ky - y0) * .45, kx, ky, fx, fy - u * .05], u * .13, u * .045, tone); }
    else { const sx2 = x0 + u * .06 + fold * u * .06, sy2 = y0 + H * .34, hx2 = x0 - u * .07 + (fx - x0) * .55 - fold * u * .1, hy2 = y0 + H * .62 - fold * u * .05; limb([x0, y0 - u * .06, sx2, sy2, hx2, hy2, fx, fy - u * .05], u * .17, u * .045, tone); }
    ctx.fillStyle = A.bark; ctx.beginPath(); ctx.moveTo(fx - u * .035, fy - u * .055); ctx.lineTo(fx + u * .045, fy - u * .05); ctx.lineTo(fx + u * .05, fy); ctx.lineTo(fx + u * .005, fy - u * .012); ctx.lineTo(fx - u * .04, fy); ctx.closePath(); ctx.fill(); // cloven hoof
    if (!far) { ctx.fillStyle = A.moss; ctx.beginPath(); ctx.ellipse(fx, fy - u * .07, u * .03, u * .012, 0, 0, TAU); ctx.fill(); } // fetlock moss
  };
  leg(hipX + u * .03, hipY, Math.PI, true, false); leg(sx - u * .02, sy, 0, true, true);
  // Body: a barrel of bark-hide with ridged bark lines, moss over the shoulders and a bramble mane along the spine.
  const body = [rot(-u * .5, hipY - u * .12), rot(-u * .42, hipY - u * .34), rot(u * .1, hipY - u * .38), rot(u * .42, hipY - u * .32), rot(u * .48, hipY - u * .08), rot(u * .3, hipY + u * .1), rot(-u * .3, hipY + u * .1)];
  const grad = ctx.createLinearGradient(0, hipY - u * .4, 0, hipY + u * .12); grad.addColorStop(0, "#6e5840"); grad.addColorStop(.6, A.hide); grad.addColorStop(1, A.hideDark);
  ctx.beginPath(); ctx.moveTo(...body[0]); for (let i = 1; i < body.length; i++) { const [x0, y0] = body[i - 1], [x1, y1] = body[i]; ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); } ctx.closePath();
  ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.strokeStyle = "rgba(30,20,12,.5)"; ctx.lineWidth = Math.max(1, u * .01);
  for (let i = 0; i < 6; i++) { const x = -u * .42 + i * u * .16, [ax, ay] = rot(x, hipY - u * .38), [bx, by] = rot(x + u * .05, hipY + u * .1); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2 + u * .03, (ay + by) / 2, bx, by); ctx.stroke(); }
  ctx.fillStyle = A.moss; const [mx, my] = rot(u * .26, hipY - u * .3); ctx.beginPath(); ctx.ellipse(mx, my, u * .2, u * .1, -pitch, 0, TAU); ctx.fill();
  ctx.fillStyle = A.mossLight; ctx.beginPath(); ctx.ellipse(mx - u * .04, my - u * .03, u * .09, u * .04, -pitch, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = A.bramble; ctx.lineWidth = Math.max(1, u * .02); ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) { const [x, y] = rot(-u * .38 + i * u * .11, hipY - u * .36 - Math.sin(i * 1.7) * u * .02); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - u * .04, y - u * .08, x + u * .02 * Math.sin(i), y - u * .12); ctx.stroke(); ctx.fillStyle = A.thorn; ctx.beginPath(); ctx.arc(x + u * .02 * Math.sin(i), y - u * .12, Math.max(.8, u * .01), 0, TAU); ctx.fill(); }
  // Tail: a short tuft of bramble.
  { const [tx, ty] = rot(-u * .5, hipY - u * .22); ctx.strokeStyle = A.bramble; ctx.lineWidth = u * .03; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - u * .1, ty - u * .05, tx - u * .12, ty + u * .06 + Math.sin(t * 3) * u * .01); ctx.stroke(); }
  leg(hipX - u * .02, hipY, Math.PI * .5 + Math.PI, false, false); leg(sx + u * .04, sy, Math.PI * .5, false, true);
  // Neck and head, angled by `head` (+ up) about the shoulder.
  const [nx0, ny0] = rot(u * .36, hipY - u * .28), ha = -.5 - head + shake, nl = u * .31, hx = nx0 + Math.cos(ha) * nl, hy = ny0 + Math.sin(ha) * nl;
  ctx.strokeStyle = A.hide; ctx.lineWidth = u * .17; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(nx0, ny0); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = A.moss; ctx.lineWidth = u * .06; ctx.beginPath(); ctx.moveTo(nx0 - u * .02, ny0 - u * .05); ctx.lineTo(hx - u * .03, hy - u * .03); ctx.stroke();
  const fa = ha + 1.15 + head * .4; // the face points ahead and down from the top of the neck
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(fa);
  ctx.fillStyle = A.hide; ctx.beginPath(); ctx.moveTo(-u * .06, -u * .07); ctx.quadraticCurveTo(u * .16, -u * .09, u * .25, -u * .02); ctx.quadraticCurveTo(u * .27, u * .04, u * .2, u * .05 + P.open * u * .03); ctx.quadraticCurveTo(u * .05, u * .09, -u * .06, u * .06); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw; ctx.stroke();
  if (P.open) { ctx.fillStyle = "#1a0d06"; ctx.beginPath(); ctx.moveTo(u * .12, u * .045); ctx.lineTo(u * .24, u * .03); ctx.lineTo(u * .2, u * .05 + P.open * u * .05); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = A.bark; ctx.beginPath(); ctx.arc(u * .245, -u * .005, u * .018, 0, TAU); ctx.fill(); // nose
  ctx.fillStyle = hunting ? A.fireCore : A.eye; ctx.beginPath(); ctx.ellipse(u * .07, -u * .035, u * .022, u * .014, 0, 0, TAU); ctx.fill();
  if (hunting || P.open) { const g = ctx.createRadialGradient(u * .07, -u * .035, 0, u * .07, -u * .035, u * .08); g.addColorStop(0, "rgba(200,255,140,.7)"); g.addColorStop(1, "rgba(200,255,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u * .07, -u * .035, u * .08, 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.hideDark; ctx.beginPath(); ctx.ellipse(-u * .03, -u * .09, u * .07, u * .025, -.6, 0, TAU); ctx.fill(); // ear
  // The crown: two great antlers of branching tine, wound with bramble and hung with pale blossom; green fire in the Wild Hunt.
  const tips = [];
  const branch = (x, y, a, len, depth, side) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    ctx.strokeStyle = depth > 1 ? A.antlerDark : A.antler; ctx.lineWidth = Math.max(1, u * .03 * (depth + 1.2) / 3.5); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    if (depth <= 0) { tips.push([x2, y2]); return; }
    branch(x2, y2, a - .38 * side, len * .74, depth - 1, side); branch(x2, y2, a + .5 * side, len * .52, depth - 1, -side);
  };
  const crown = 1 + (hunting ? .06 : 0); // the far antler first, darker; then the near one
  ctx.globalAlpha *= .8; branch(-u * .05, -u * .08, -2.05, u * .3 * crown, 4, 1); ctx.globalAlpha /= .8;
  branch(u * .02, -u * .08, -1.55, u * .32 * crown, 4, -1);
  ctx.strokeStyle = A.bramble; ctx.lineWidth = Math.max(1, u * .012);
  for (let i = 0; i < tips.length; i += 2) { const [x1, y1] = tips[i], [x2, y2] = tips[(i + 3) % tips.length]; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + u * .06, x2, y2); ctx.stroke(); }
  tips.forEach(([x, y], i) => {
    if (i % 3 === 0) { ctx.fillStyle = A.blossom; for (let j = 0; j < 5; j++) { const a = j * TAU / 5 + i; ctx.beginPath(); ctx.arc(x + Math.cos(a) * u * .018, y + Math.sin(a) * u * .018, u * .014, 0, TAU); ctx.fill(); } ctx.fillStyle = A.blossomCore; ctx.beginPath(); ctx.arc(x, y, u * .01, 0, TAU); ctx.fill(); }
    if (hunting) { const fl = reduce ? .8 : .7 + .3 * Math.sin(t * 13 + i * 1.7), hgt = u * .09 * fl; ctx.fillStyle = "rgba(156,255,106,.75)"; ctx.beginPath(); ctx.moveTo(x - u * .025, y); ctx.quadraticCurveTo(x - u * .02, y - hgt * .6, x + (reduce ? 0 : Math.sin(t * 9 + i) * u * .015), y - hgt); ctx.quadraticCurveTo(x + u * .02, y - hgt * .6, x + u * .025, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = A.fireCore; ctx.beginPath(); ctx.arc(x, y - hgt * .25, u * .012, 0, TAU); ctx.fill(); }
  });
  ctx.restore();
  ctx.restore();
}

// Its effects. Warnings are in the one DANGER pink every boss uses (release 397/427).
function spike(ctx, x, y, h, w, k, A = STAG_ART) { // a root spike `h` tall, `k` (0–1) how far it has burst
  const hh = h * k; ctx.fillStyle = A.bark; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * .4, y - hh * .5, x, y - hh); ctx.quadraticCurveTo(x + w * .5, y - hh * .5, x + w, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#6e5236"; ctx.lineWidth = Math.max(1, w * .18); ctx.beginPath(); ctx.moveTo(x - w * .3, y - hh * .15); ctx.lineTo(x - w * .05, y - hh * .8); ctx.stroke();
  ctx.fillStyle = "#4a3624"; ctx.beginPath(); ctx.ellipse(x, y, w * 1.4, w * .45, 0, 0, TAU); ctx.fill();
}
function warn(ctx, x, y, r, progress) {
  ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = DANGER.fillStrong; ctx.beginPath(); ctx.ellipse(x, y, r * progress, r * .6 * progress, 0, 0, TAU); ctx.fill();
}
export function drawStagEffect(ctx, f, s, now, { reduceMotion = false } = {}) {
  const A = STAG_ART, x = (f.x + .5) * s, y = (f.y + .62) * s, r = (Number(f.radius) || .5) * s, life = Math.max(0, Number(f.life) || 0), age = Number(f.age) || 0;
  ctx.save();
  if (f.kind === "briar") {
    ctx.globalAlpha = Math.min(1, life * 1.5, age * 6 + .2); const grow = Math.min(1, age * 4);
    ctx.fillStyle = "rgba(40,28,14,.45)"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = A.bramble; ctx.lineWidth = Math.max(1, s * .045); ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + f.x * 2.3, l = r * .9 * grow, bx = x + Math.cos(a) * r * .3, by = y + Math.sin(a) * r * .15; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(a + 1) * l * .6, by - l * .5, bx + Math.cos(a) * l, by - l * .25); ctx.stroke(); ctx.fillStyle = A.thorn; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * l, by - l * .25, Math.max(.8, s * .025), 0, TAU); ctx.fill(); }
    ctx.fillStyle = A.moss; ctx.beginPath(); ctx.arc(x - r * .2, y - r * .12, s * .05, 0, TAU); ctx.fill();
  } else if (f.kind === "thorn") {
    const a = Math.atan2(f.vy, f.vx), L = s * .34, cy = y - s * .35; ctx.translate(x, cy); ctx.rotate(a);
    ctx.strokeStyle = "rgba(230,255,208,.35)"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.moveTo(-L * 1.4, 0); ctx.lineTo(-L * .3, 0); ctx.stroke();
    ctx.fillStyle = A.thorn; ctx.strokeStyle = A.bark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L * .5, 0); ctx.lineTo(-L * .5, -s * .05); ctx.lineTo(-L * .35, 0); ctx.lineTo(-L * .5, s * .05); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (f.kind === "rootLine") {
    for (let k = 0; k < f.steps; k++) {
      const px = (f.x + f.dx * k * f.step + .5) * s, py = (f.y + f.dy * k * f.step + .62) * s, at = f.warn + k * f.every, since = age - at;
      if (since < 0) warn(ctx, px, py, r, Math.max(0, Math.min(1, age / at)));
      else if (since < STAG.rootShow + .1) { ctx.globalAlpha = Math.min(1, (STAG.rootShow + .1 - since) * 4); spike(ctx, px, py, s * 1.05, s * .2, Math.min(1, since * 10)); ctx.globalAlpha = 1; }
    }
  } else if (f.kind === "rootRing") {
    const armed = !(f.arming > 0), total = Math.max(.001, Number(f.armTotal) || 1), progress = armed ? 1 : 1 - f.arming / total;
    for (let i = 0; i < f.spikes; i++) {
      const a = f.turn + i * TAU / f.spikes, px = (f.x + Math.cos(a) * f.ring + .5) * s, py = (f.y + Math.sin(a) * f.ring + .62) * s;
      if (!armed) warn(ctx, px, py, r, progress); else { ctx.globalAlpha = Math.min(1, life * 4); spike(ctx, px, py, s * .95, s * .18, Math.min(1, (f.total - life) * 10)); ctx.globalAlpha = 1; }
    }
  } else if (f.kind === "stagSpike") {
    if (!(f.arming > 0)) { ctx.globalAlpha = Math.min(1, life * 4); spike(ctx, x, y, s * .95, s * .2, Math.min(1, ((f.total || .45) - life) * 10)); if (!reduceMotion) { ctx.fillStyle = "rgba(156,255,106,.5)"; ctx.beginPath(); ctx.arc(x, y - s * .5, s * .08, 0, TAU); ctx.fill(); } }
  }
  ctx.restore();
}
