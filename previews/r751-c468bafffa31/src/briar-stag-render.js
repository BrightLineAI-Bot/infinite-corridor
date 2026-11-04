// The Briar Stag's body and effects (release 705). Drawing only: nothing here changes combat state.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). `now` (ms) drives the gait and flicker.
import { STAG, DANGER } from "./monster-pack.js?v=r751-c468bafffa31";

const TAU = Math.PI * 2;
export const STAG_ART = {
  hide: "#5a4632", hideDark: "#3a2c1e", bark: "#2a1d12", moss: "#5f7a3a", mossLight: "#8fae58", antler: "#d9ccb0", antlerDark: "#9c8a6a",
  bramble: "#3d2a18", thorn: "#e8e0c8", blossom: "#f4f0ff", blossomCore: "#ffd8f0", eye: "#c8ff8a", fire: "#9cff6a", fireCore: "#e6ffd0",
  stride: .16, stanceShare: .6, settle: 6,
};
export const STAG_EFFECT_KINDS = new Set(["briar", "thorn", "rootLine", "rootRing", "stagSpike", "burnTree", "birdDive", "mire"]);

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
  mend: { pitch: .1, head: .75, tuck: 0, gallop: 0, open: 0 }, // release 708: crown raised to the sky
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
  if (e.stagMending) { const g = ctx.createRadialGradient(k, b - u * 1.2, u * .05, k, b - u * 1.2, u * .9); g.addColorStop(0, "rgba(200,255,170,.45)"); g.addColorStop(1, "rgba(200,255,170,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(k, b - u * 1.2, u * .9, 0, TAU); ctx.fill(); if (!reduce) { ctx.fillStyle = "rgba(220,255,190,.8)"; for (let i = 0; i < 6; i++) { const ph = (t * .7 + i / 6) % 1; ctx.beginPath(); ctx.arc(k + Math.sin(i * 2.1) * u * .5, b - ph * u * 1.6, u * .018, 0, TAU); ctx.fill(); } } } // release 708: mending
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
    if (front) { const kx = x0 + (fx - x0) * .5 + u * .02 + fold * u * .1, ky = y0 + H * .5 - fold * u * .04, ex = x0 + (kx - x0) * .45 - u * .025, ey = y0 + (ky - y0) * .42, fx2 = fx + u * .012, fy2 = fy - u * .1; limb([x0, y0 - u * .06, ex, ey, kx, ky, fx2, fy2, fx, fy - u * .05], u * .14, u * .042, tone); ctx.fillStyle = far ? "#2a1e14" : "#4a3826"; ctx.beginPath(); ctx.ellipse(kx, ky, u * .028, u * .022, 0, 0, TAU); ctx.fill(); } // knee knob
    else { const sx2 = x0 + u * .06 + fold * u * .06, sy2 = y0 + H * .34, hx2 = x0 - u * .07 + (fx - x0) * .55 - fold * u * .1, hy2 = y0 + H * .62 - fold * u * .05; limb([x0, y0 - u * .06, sx2, sy2, hx2, hy2, fx, fy - u * .05], u * .17, u * .045, tone); }
    ctx.fillStyle = A.bark; ctx.beginPath(); ctx.moveTo(fx - u * .035, fy - u * .055); ctx.lineTo(fx + u * .045, fy - u * .05); ctx.lineTo(fx + u * .05, fy); ctx.lineTo(fx + u * .005, fy - u * .012); ctx.lineTo(fx - u * .04, fy); ctx.closePath(); ctx.fill(); // cloven hoof
    if (!far) { ctx.fillStyle = A.moss; ctx.beginPath(); ctx.ellipse(fx, fy - u * .07, u * .03, u * .012, 0, 0, TAU); ctx.fill(); } // fetlock moss
  };
  leg(hipX + u * .03, hipY, Math.PI, true, false); leg(sx - u * .02, sy, 0, true, true);
  // Body (release 708 visual passes): one smooth silhouette (rump, back, withers, deep chest, belly, flank), shaded as bark-hide,
  // with the near haunch and shoulder drawn over the leg roots so legs grow out of the body rather than sit beside it.
  const R = (x, y) => rot(u * x, hipY + u * y);
  const bodyPath = () => { ctx.beginPath(); ctx.moveTo(...R(-.48, -.27));
    ctx.bezierCurveTo(...R(-.3, -.37), ...R(.05, -.33), ...R(.24, -.39)); // back to withers
    ctx.bezierCurveTo(...R(.36, -.43), ...R(.47, -.33), ...R(.47, -.18)); // withers over the shoulder to the chest
    ctx.bezierCurveTo(...R(.48, -.03), ...R(.42, .07), ...R(.3, .09)); // deep chest to the brisket
    ctx.bezierCurveTo(...R(.12, .13), ...R(-.12, .1), ...R(-.24, .04)); // belly, tucking up
    ctx.bezierCurveTo(...R(-.4, .04), ...R(-.56, -.04), ...R(-.55, -.16)); // flank and haunch
    ctx.bezierCurveTo(...R(-.55, -.22), ...R(-.53, -.26), ...R(-.48, -.27)); ctx.closePath(); };
  const [gx0, gy0] = R(0, -.4), [gx1, gy1] = R(0, .12), grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1); grad.addColorStop(0, "#7a6248"); grad.addColorStop(.45, A.hide); grad.addColorStop(1, A.hideDark);
  bodyPath(); ctx.fillStyle = grad; ctx.fill();
  ctx.save(); bodyPath(); ctx.clip();
  ctx.strokeStyle = "rgba(34,22,12,.42)"; ctx.lineWidth = Math.max(1, u * .009); // bark furrows following the barrel
  for (let i = 0; i < 7; i++) { const x = -.44 + i * .13; ctx.beginPath(); ctx.moveTo(...R(x, -.38)); ctx.bezierCurveTo(...R(x + .04, -.22), ...R(x - .02, -.05), ...R(x + .03, .12)); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,236,200,.08)"; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath(); ctx.moveTo(...R(-.4, -.3)); ctx.bezierCurveTo(...R(-.1, -.34), ...R(.15, -.3), ...R(.34, -.36)); ctx.stroke(); // light along the back
  ctx.fillStyle = "rgba(20,12,6,.22)"; ctx.beginPath(); ctx.ellipse(...R(0, .1), u * .5, u * .09, -pitch, 0, TAU); ctx.fill(); // belly shadow
  ctx.restore();
  bodyPath(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw; ctx.stroke();
  // Spine: a bramble vine laid along the back, its thorns raking backward.
  ctx.strokeStyle = A.bramble; ctx.lineWidth = Math.max(1, u * .022); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(...R(-.46, -.27));
  for (let i = 1; i <= 8; i++) { const x = -.46 + i * .095, y = -.31 - Math.sin(i * .9) * .012 - (x > .15 ? (x - .15) * .35 : 0); ctx.lineTo(...R(x, y)); } ctx.stroke();
  ctx.lineWidth = Math.max(1, u * .012);
  for (let i = 1; i <= 8; i++) { const x = -.46 + i * .095, y = -.31 - (x > .15 ? (x - .15) * .35 : 0), [ax, ay] = R(x, y), [bx, by] = R(x - .05, y - .06); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); if (i % 3 === 0) { ctx.fillStyle = A.blossom; ctx.beginPath(); ctx.arc(ax, ay - u * .02, u * .016, 0, TAU); ctx.fill(); } }
  // Tail: a short upturned tuft.
  { const [tx, ty] = R(-.53, -.22), [cx2, cy2] = R(-.62, -.28), [ex, ey] = R(-.6, -.15); ctx.fillStyle = A.hideDark; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx2, cy2 + Math.sin(t * 3) * u * .01, ex, ey); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw * .8; ctx.stroke(); }
  leg(hipX - u * .02, hipY, Math.PI * .5 + Math.PI, false, false); leg(sx + u * .04, sy, Math.PI * .5, false, true);
  // Near haunch and shoulder over the leg roots.
  const muscle = (x, y, rx, ry, tilt) => { const [mx, my] = R(x, y), g = ctx.createRadialGradient(mx - u * rx * .2, my - u * ry * .5, u * .01, mx, my + u * ry * .3, u * Math.max(rx, ry) * 1.1); g.addColorStop(0, "#715a40"); g.addColorStop(.7, A.hide); g.addColorStop(1, "rgba(90,70,50,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(mx, my, u * rx, u * ry, tilt - pitch, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(42,29,18,.45)"; ctx.lineWidth = lw * .8; ctx.beginPath(); ctx.ellipse(mx, my, u * rx * .92, u * ry * .92, tilt - pitch, Math.PI * .35, Math.PI * .85); ctx.stroke(); }; // a soft-edged mass, only its lower curve lined
  muscle(-.33, -.13, .15, .2, -.35); muscle(.3, -.16, .11, .18, .3);
  // Neck: a tapered column rising from the shoulders (wide where it meets them), a moss mane along its crest.
  const [nx0, ny0] = R(.36, -.3), ha = -.5 - head + shake, nl = u * .32, hx = nx0 + Math.cos(ha) * nl, hy = ny0 + Math.sin(ha) * nl, px = -Math.sin(ha), py = Math.cos(ha);
  const [nbx, nby] = R(.24, -.36), [nfx, nfy] = R(.46, -.12);
  ctx.fillStyle = A.hide; ctx.beginPath(); ctx.moveTo(nbx, nby); ctx.quadraticCurveTo(nx0 - px * u * .02, ny0 - py * u * .1, hx - px * u * .065, hy - py * u * .065); ctx.lineTo(hx + px * u * .07, hy + py * u * .07); ctx.quadraticCurveTo(nx0 + px * u * .12, ny0 + py * u * .12, nfx, nfy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw; ctx.stroke();
  ctx.strokeStyle = "rgba(34,22,12,.35)"; ctx.lineWidth = Math.max(1, u * .008); for (let i = 1; i < 4; i++) { const k2 = i / 4, cx3 = nx0 + (hx - nx0) * k2, cy3 = ny0 + (hy - ny0) * k2, w = u * (.13 - .06 * k2); ctx.beginPath(); ctx.moveTo(cx3 - px * w * .7, cy3 - py * w * .7); ctx.lineTo(cx3 + px * w * .7, cy3 + py * w * .7); ctx.stroke(); } // neck rings of bark
  ctx.fillStyle = A.moss; ctx.beginPath(); ctx.moveTo(nbx, nby); ctx.quadraticCurveTo(nx0 - px * u * .06, ny0 - py * u * .14, hx - px * u * .06, hy - py * u * .06); ctx.quadraticCurveTo(nx0 - px * u * .0, ny0 - py * u * .05, nbx + u * .04, nby + u * .04); ctx.closePath(); ctx.fill(); // mane
  ctx.fillStyle = A.mossLight; ctx.beginPath(); ctx.ellipse(...R(.3, -.34), u * .07, u * .03, -pitch - .3, 0, TAU); ctx.fill();
  // Head: a long deer skull (brow, tapering muzzle, jaw), a dark muzzle and nostril, a brow ridge over the eye, two ears.
  const fa = ha + 1.15 + head * .4; // the face points ahead and down from the top of the neck
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(fa);
  ctx.fillStyle = A.hideDark; ctx.beginPath(); ctx.ellipse(-u * .05, -u * .09, u * .075, u * .026, -.75, 0, TAU); ctx.fill(); // far ear
  ctx.fillStyle = A.hide; ctx.beginPath(); ctx.moveTo(-u * .07, -u * .06);
  ctx.bezierCurveTo(u * .02, -u * .1, u * .14, -u * .08, u * .26, -u * .035); ctx.bezierCurveTo(u * .31, -u * .02, u * .31, u * .03, u * .27, u * .04 + P.open * u * .02);
  ctx.bezierCurveTo(u * .17, u * .06, u * .08, u * .09, -u * .02, u * .085); ctx.bezierCurveTo(-u * .08, u * .07, -u * .1, u * .01, -u * .07, -u * .06); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = "#3a2a1c"; ctx.beginPath(); ctx.moveTo(u * .2, -u * .045); ctx.bezierCurveTo(u * .27, -u * .035, u * .31, -u * .01, u * .29, u * .03); ctx.lineTo(u * .21, u * .04); ctx.closePath(); ctx.fill(); // dark muzzle
  if (P.open) { ctx.fillStyle = "#1a0d06"; ctx.beginPath(); ctx.moveTo(u * .13, u * .05); ctx.lineTo(u * .27, u * .04); ctx.lineTo(u * .21, u * .06 + P.open * u * .05); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#120a05"; ctx.beginPath(); ctx.ellipse(u * .275, -u * .012, u * .014, u * .009, .4, 0, TAU); ctx.fill(); // nostril
  ctx.strokeStyle = "rgba(34,22,12,.6)"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(u * .03, -u * .062); ctx.quadraticCurveTo(u * .07, -u * .075, u * .11, -u * .055); ctx.stroke(); // brow ridge
  ctx.fillStyle = hunting ? A.fireCore : A.eye; ctx.beginPath(); ctx.ellipse(u * .072, -u * .04, u * .02, u * .013, -.1, 0, TAU); ctx.fill();
  if (hunting || P.open) { const g = ctx.createRadialGradient(u * .072, -u * .04, 0, u * .072, -u * .04, u * .08); g.addColorStop(0, "rgba(200,255,140,.7)"); g.addColorStop(1, "rgba(200,255,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u * .072, -u * .04, u * .08, 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.hide; ctx.beginPath(); ctx.ellipse(-u * .03, -u * .085, u * .08, u * .028, -.55, 0, TAU); ctx.fill(); ctx.strokeStyle = A.bark; ctx.lineWidth = lw * .8; ctx.stroke(); // near ear
  ctx.fillStyle = "#c9a888"; ctx.beginPath(); ctx.ellipse(-u * .025, -u * .085, u * .05, u * .012, -.55, 0, TAU); ctx.fill(); // inner ear
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
    ctx.fillStyle = f.ember ? "#ff9a3a" : A.thorn; ctx.strokeStyle = A.bark; ctx.lineWidth = 1; if (f.ember) { ctx.shadowColor = "#ff7a1a"; ctx.shadowBlur = s * .2; } ctx.beginPath(); ctx.moveTo(L * .5, 0); ctx.lineTo(-L * .5, -s * .05); ctx.lineTo(-L * .35, 0); ctx.lineTo(-L * .5, s * .05); ctx.closePath(); ctx.fill(); ctx.stroke();
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
  } else if (f.kind === "burnTree") { // release 708: it grows, burns, then explodes
    const age = Number(f.age) || 0, grow = Math.min(1, age / Math.max(.01, f.grow)), burning = age >= f.grow, end = f.grow + f.burn, left = end - age, h = s * 2.2 * (.3 + .7 * grow), tw = s * .17;
    if (age < end) { if (left < 1.2) warn(ctx, x, y, STAG.grove.blast * s, 1 - Math.max(0, left) / 1.2); else { ctx.fillStyle = "rgba(255,80,190,.12)"; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * .7, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = burning ? "#2a160c" : "#4a3220"; ctx.beginPath(); ctx.moveTo(x - tw, y); ctx.lineTo(x - tw * .6, y - h * .55); ctx.lineTo(x + tw * .6, y - h * .55); ctx.lineTo(x + tw, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = burning ? "#2a160c" : "#4a3220"; ctx.lineWidth = Math.max(1, s * .05); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - h * .5); ctx.lineTo(x + sd * s * .35 * grow, y - h * .85); ctx.stroke(); }
      for (const [dx, dy, rr] of [[0, .82, .62], [-.32, .7, .42], [.34, .68, .44], [0, 1, .4]]) { ctx.fillStyle = burning ? "#2e2018" : "#5f8a3a"; ctx.beginPath(); ctx.ellipse(x + dx * s * grow, y - h * dy, s * rr * grow, s * rr * .78 * grow, 0, 0, TAU); ctx.fill(); }
      if (burning) { const fl = reduceMotion ? 1 : .8 + .2 * Math.sin(now / 70 + f.x); ctx.globalAlpha = .9; for (let i = 0; i < 11; i++) { const fx = x + Math.sin(i * 1.9) * s * .55, fy = y - h * (.55 + (i % 4) * .14), fh = s * (.38 + (i % 2) * .18) * fl; ctx.fillStyle = i % 2 ? "rgba(255,180,60,.9)" : "rgba(255,90,26,.85)"; ctx.beginPath(); ctx.moveTo(fx - s * .1, fy); ctx.quadraticCurveTo(fx + (reduceMotion ? 0 : Math.sin(now / 90 + i) * s * .05), fy - fh * 1.3, fx + s * .1, fy); ctx.closePath(); ctx.fill(); } ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(x, y - h * .6, 0, x, y - h * .6, s * 1.1); g.addColorStop(0, "rgba(255,140,40,.35)"); g.addColorStop(1, "rgba(255,140,40,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - h * .6, s * 1.1, 0, TAU); ctx.fill(); } }
    else { ctx.globalAlpha = Math.min(1, life * 2.5); const g = ctx.createRadialGradient(x, y - s * .4, 0, x, y - s * .4, STAG.grove.blast * s); g.addColorStop(0, "rgba(255,240,190,.95)"); g.addColorStop(.45, "rgba(255,120,30,.8)"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * .3, STAG.grove.blast * s, STAG.grove.blast * s * .8, 0, 0, TAU); ctx.fill(); }
  } else if (f.kind === "birdDive") { // its line, then a great dark bird stooping along it
    const ang = Math.atan2(f.dy, f.dx), L = f.length * s, armed = !(f.arming > 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = armed ? "rgba(255,80,190,.08)" : DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; if (!armed) ctx.setLineDash([s * .15, s * .1]); ctx.fillRect(0, -f.radius * s, L, f.radius * 2 * s); ctx.strokeRect(0, -f.radius * s, L, f.radius * 2 * s); ctx.restore();
    if (armed && Number.isFinite(f.bx)) { const bx = (f.bx + .5) * s, by = (f.by + .62) * s - s * .5, flap = reduceMotion ? .5 : .5 + .5 * Math.sin(now / 50);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(ang); ctx.fillStyle = "#2a2420"; ctx.beginPath(); ctx.ellipse(0, 0, s * .4, s * .12, 0, 0, TAU); ctx.fill();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * .1, 0); ctx.quadraticCurveTo(-s * .1, sd * s * (.5 + .3 * flap), -s * .55, sd * s * (.7 + .2 * flap)); ctx.lineTo(-s * .2, sd * s * .08); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = "#e8c070"; ctx.beginPath(); ctx.moveTo(s * .4, 0); ctx.lineTo(s * .55, s * .04); ctx.lineTo(s * .4, s * .07); ctx.closePath(); ctx.fill(); ctx.restore(); }
  } else if (f.kind === "mire") { // soft ground: dark, rippling, like water that is not wet
    const armed = !(f.arming > 0), fade = Math.min(1, life * 1.5), grow = armed ? 1 : 1 - f.arming / Math.max(.01, f.armTotal || 1);
    ctx.globalAlpha = fade * (.45 + .2 * grow); ctx.fillStyle = "#3a3024"; ctx.beginPath(); ctx.ellipse(x, y, r * grow, r * .6 * grow, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(160,190,140,.5)"; ctx.lineWidth = Math.max(1, s * .03);
    for (let i = 0; i < 3; i++) { const k = reduceMotion ? (i + 1) / 4 : ((now / 1600 + i / 3) % 1); ctx.beginPath(); ctx.ellipse(x, y, r * k * grow, r * .6 * k * grow, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (f.kind === "stagSpike") {
    if (!(f.arming > 0)) { ctx.globalAlpha = Math.min(1, life * 4); spike(ctx, x, y, s * .95, s * .2, Math.min(1, ((f.total || .45) - life) * 10)); if (!reduceMotion) { ctx.fillStyle = "rgba(156,255,106,.5)"; ctx.beginPath(); ctx.arc(x, y - s * .5, s * .08, 0, TAU); ctx.fill(); } }
  }
  ctx.restore();
}
