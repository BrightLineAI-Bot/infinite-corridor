// Release 678: drawing the Stalker (stalker.ts): the six-legged snow leopard, the winged silverback, the silver pool, its
// afterimages, its copies and decoys, the marks before each blow, and the silver marker at the screen edge while it hunts.
// Plain canvas paths, no sprites or gradients per frame beyond one shadow, so it stays cheap on a phone.
import { STALKER } from "./stalker.ts";

const FUR = "#f1f3f6", SHADE = "#b9c0cc", SPOT = "#7d8594", SILVER = "#d8e2ee", WING = "#3a2f44", WING_EDGE = "#c9d4e4";
const MARK_FILL = "rgba(255,80,190,.18)", MARK_EDGE = "rgba(255,130,210,.78)";

function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }

function drawCat(ctx, x, y, u, face, t, moving, pose = null) {
  // A white six-legged feline of the Corridor, stalking: lithe, low-slung, a sinuous back dipping between shoulder and haunch,
  // three pairs of jointed legs (the far three a shade darker so all six read), a round cat's head carried low and level with
  // a short muzzle and alert ears, glowing eyes, a long rope of a tail in an S.
  const gait = moving ? t * 9 : 0, bob = moving ? Math.abs(Math.sin(gait)) * .02 * u : 0, by = y - bob, F = (dx) => x + face * dx * u;
  // Poses: a crouch before the pounce (low, haunch high, tail lashing), the leap (stretched long, legs flung out), a raised paw
  // before the swipe.
  const sway = Math.sin(t * (pose === "crouch" ? 9 : 2.3)) * (pose === "crouch" ? .09 : .05) * u;
  ctx.save(); if (pose === "crouch") { ctx.translate(x, y); ctx.scale(1.04, .8); ctx.translate(-x, -y); } else if (pose === "leap") { ctx.translate(x, y - .1 * u); ctx.rotate(-face * .08); ctx.scale(1.16, .9); ctx.translate(-x, -y); }
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // The tail: from the haunch, low, then an S up to a curled silver tip.
  const tp = [[F(-.5), by - .4 * u], [F(-.78), by - .2 * u + sway], [F(-1.0), by - .32 * u], [F(-1.12), by - .62 * u - sway]];
  for (const [wd, col] of [[.105, "#8c96a6"], [.08, FUR]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, wd * u); ctx.beginPath(); ctx.moveTo(tp[0][0], tp[0][1]); ctx.bezierCurveTo(tp[1][0], tp[1][1], tp[2][0], tp[2][1], tp[3][0], tp[3][1]); ctx.stroke(); }
  ctx.fillStyle = SILVER; ellipse(ctx, tp[3][0], tp[3][1], .04 * u, .04 * u); ctx.fill();
  // Six jointed legs, spread along the body so all six read (the far three set back and a shade darker): a muscled upper leg,
  // a slim lower leg and a broad paw; the hind pair with the cat's backward hock.
  const legs = [{ at: .34, knee: -.05, hipY: .3, thick: .13 }, { at: .0, knee: -.04, hipY: .27, thick: .12 }, { at: -.36, knee: .1, hipY: .3, thick: .15 }];
  for (const side of [1, 0]) legs.forEach((L, i) => {
    const ph = Math.sin(gait + i * 2.1 + side * Math.PI), hipX = F(L.at + (side ? .07 : 0)), hipY = by - L.hipY * u - (side ? .025 * u : 0);
    let footX = hipX + face * ph * .1 * u, lift = Math.max(0, ph) * .04 * u, footY = y - .02 * u - lift;
    if (pose === "leap") { const reach = i === 0 ? .32 : i === 1 ? .08 : -.34; footX = hipX + face * reach * u; footY = by - (.12 + (i === 1 ? .04 : 0)) * u; lift = 0; }
    if (pose === "swipe" && i === 0 && !side) { footX = hipX + face * .28 * u; footY = by - .42 * u; }
    const kneeX = (hipX + footX) / 2 - face * L.knee * u, kneeY = pose === "leap" || (pose === "swipe" && i === 0 && !side) ? (hipY + footY) / 2 + .03 * u : by - .16 * u - lift * .5;
    const col = side ? "#a8b1bf" : "#eef1f5", edge = side ? "#7b8494" : "#8c96a6";
    // the upper leg: a tapered wedge of muscle
    const ux = kneeX - hipX, uy = kneeY - hipY, ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul, th = L.thick * u;
    ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, .012 * u);
    ctx.beginPath(); ctx.moveTo(hipX + nx * th * .5, hipY + ny * th * .5); ctx.quadraticCurveTo(hipX + ux * .5 + nx * th * .55, hipY + uy * .5 + ny * th * .55, kneeX + nx * th * .2, kneeY + ny * th * .2);
    ctx.lineTo(kneeX - nx * th * .2, kneeY - ny * th * .2); ctx.quadraticCurveTo(hipX + ux * .5 - nx * th * .45, hipY + uy * .5 - ny * th * .45, hipX - nx * th * .5, hipY - ny * th * .5); ctx.closePath(); ctx.fill(); ctx.stroke();
    // the lower leg and the paw
    const wx = footX - face * .015 * u, wy = footY - .06 * u; // the wrist, just above the paw
    for (const [lw, c] of [[.085, edge], [.066, col]]) { ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, lw * u); ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(wx, wy); ctx.lineTo(footX, footY); ctx.stroke(); }
    ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, .012 * u); ellipse(ctx, footX + face * .035 * u, footY, .07 * u, .034 * u); ctx.fill(); ctx.stroke();
  });
  // The body: deep chest, a dip behind the shoulders, a tucked waist, a round haunch.
  ctx.fillStyle = FUR; ctx.beginPath(); ctx.moveTo(F(-.52), by - .36 * u);
  ctx.bezierCurveTo(F(-.52), by - .54 * u, F(-.3), by - .52 * u, F(-.12), by - .45 * u);
  ctx.bezierCurveTo(F(.05), by - .4 * u, F(.2), by - .5 * u, F(.36), by - .5 * u);
  ctx.bezierCurveTo(F(.5), by - .5 * u, F(.52), by - .34 * u, F(.42), by - .24 * u);
  ctx.bezierCurveTo(F(.3), by - .17 * u, F(.15), by - .2 * u, F(.02), by - .26 * u);
  ctx.bezierCurveTo(F(-.15), by - .3 * u, F(-.3), by - .24 * u, F(-.44), by - .25 * u);
  ctx.bezierCurveTo(F(-.54), by - .26 * u, F(-.55), by - .31 * u, F(-.52), by - .36 * u); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#8c96a6"; ctx.lineWidth = Math.max(1, .014 * u); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.moveTo(F(-.45), by - .47 * u); ctx.bezierCurveTo(F(-.3), by - .51 * u, F(-.15), by - .45 * u, F(-.05), by - .43 * u); ctx.bezierCurveTo(F(.1), by - .42 * u, F(.25), by - .48 * u, F(.4), by - .47 * u); ctx.bezierCurveTo(F(.25), by - .44 * u, F(.05), by - .38 * u, F(-.45), by - .43 * u); ctx.fill(); // the sheen along the back
  ctx.strokeStyle = "rgba(205,226,245,.95)"; ctx.lineWidth = Math.max(1, .022 * u); ctx.beginPath(); ctx.moveTo(F(-.48), by - .5 * u); ctx.bezierCurveTo(F(-.3), by - .53 * u, F(-.12), by - .46 * u, F(.05), by - .45 * u); ctx.bezierCurveTo(F(.15), by - .47 * u, F(.22), by - .52 * u, F(.28), by - .55 * u); ctx.stroke();
  ctx.strokeStyle = `rgba(160,235,255,${.35 + .25 * Math.sin(t * 3)})`; ctx.lineWidth = Math.max(1, .01 * u); ctx.stroke(); // the liquid-silver seam down its spine
  // The near haunch and shoulder over the body: the muscle the near legs hang from.
  ctx.fillStyle = "#f3f5f8"; ctx.strokeStyle = "rgba(140,150,166,.7)"; ctx.lineWidth = Math.max(1, .012 * u);
  ellipse(ctx, F(-.36), by - .34 * u, .15 * u, .12 * u, face * .35); ctx.fill(); ctx.beginPath(); ctx.ellipse(F(-.36), by - .34 * u, .15 * u, .12 * u, face * .35, Math.PI * .1, Math.PI * 1.05); ctx.stroke();
  ellipse(ctx, F(.33), by - .36 * u, .11 * u, .12 * u, -face * .3); ctx.fill(); ctx.beginPath(); ctx.ellipse(F(.33), by - .36 * u, .11 * u, .12 * u, -face * .3, Math.PI * .15, Math.PI * .95); ctx.stroke();
  ellipse(ctx, F(0), by - .31 * u, .09 * u, .08 * u); ctx.fill();
  ctx.fillStyle = "rgba(150,164,184,.3)"; ctx.beginPath(); ctx.moveTo(F(.4), by - .26 * u); ctx.bezierCurveTo(F(.3), by - .2 * u, F(.15), by - .22 * u, F(.02), by - .27 * u); ctx.bezierCurveTo(F(-.15), by - .31 * u, F(-.3), by - .26 * u, F(-.44), by - .26 * u); ctx.bezierCurveTo(F(-.2), by - .33 * u, F(.15), by - .3 * u, F(.4), by - .26 * u); ctx.fill(); // belly shade
  ctx.strokeStyle = "rgba(170,225,255,.4)"; ctx.lineWidth = Math.max(1, .018 * u); for (const d of [-.3, -.1, .12]) { ctx.beginPath(); ctx.moveTo(F(d), by - .47 * u + (d > -.2 && d < 0 ? .04 * u : 0)); ctx.lineTo(F(d + .04), by - .39 * u); ctx.lineTo(F(d), by - .32 * u); ctx.stroke(); } // faint silver chevrons
  // The head: carried low and level, round skull, short muzzle, ears up and a little out.
  const hx = F(.56), hy = by - .5 * u;
  ctx.fillStyle = FUR; ctx.strokeStyle = "#8c96a6"; ctx.lineWidth = Math.max(1, .012 * u); ctx.beginPath(); ctx.moveTo(F(.22), by - .5 * u);
  ctx.bezierCurveTo(F(.34), by - .6 * u, F(.44), by - .6 * u, hx - face * .06 * u, hy - .08 * u); ctx.lineTo(hx + face * .02 * u, hy + .09 * u);
  ctx.bezierCurveTo(F(.5), by - .36 * u, F(.46), by - .3 * u, F(.4), by - .26 * u); ctx.lineTo(F(.3), by - .4 * u); ctx.closePath(); ctx.fill(); // the neck, flowing from the shoulder into the skull
  ctx.beginPath(); ctx.moveTo(F(.22), by - .5 * u); ctx.bezierCurveTo(F(.34), by - .6 * u, F(.44), by - .6 * u, hx - face * .06 * u, hy - .08 * u); ctx.stroke();
  ctx.fillStyle = FUR; ellipse(ctx, F(.27), by - .52 * u, .07 * u, .04 * u, -face * .4); ctx.fill(); // the shoulder blade, raised as it stalks
  for (const [ex, out] of [[-.06, -1], [.04, 1]]) { const bx = hx + face * ex * u, top = { x: bx + face * out * .03 * u, y: hy - .2 * u };
    ctx.fillStyle = FUR; ctx.beginPath(); ctx.moveTo(bx - face * .045 * u, hy - .07 * u); ctx.quadraticCurveTo(top.x - face * .01 * u, top.y + .02 * u, top.x, top.y); ctx.quadraticCurveTo(top.x + face * .02 * u, top.y + .04 * u, bx + face * .05 * u, hy - .07 * u); ctx.fill();
    ctx.fillStyle = "#c9d1dd"; ctx.beginPath(); ctx.moveTo(bx - face * .02 * u, hy - .08 * u); ctx.lineTo(top.x, top.y + .035 * u); ctx.lineTo(bx + face * .03 * u, hy - .08 * u); ctx.fill(); }
  ctx.fillStyle = FUR; ellipse(ctx, hx, hy, .13 * u, .105 * u); ctx.fill(); ctx.strokeStyle = "#8c96a6"; ctx.lineWidth = Math.max(1, .012 * u); ctx.stroke(); ctx.fillStyle = FUR; ellipse(ctx, hx - face * .02 * u, hy + .01 * u, .12 * u, .095 * u); ctx.fill(); // the round skull, outlined
  ctx.fillStyle = "#f7f9fb"; ctx.beginPath(); ctx.moveTo(hx - face * .1 * u, hy + .02 * u); ctx.lineTo(hx - face * .14 * u, hy + .1 * u); ctx.lineTo(hx - face * .07 * u, hy + .08 * u); ctx.lineTo(hx - face * .06 * u, hy + .12 * u); ctx.lineTo(hx + face * .02 * u, hy + .08 * u); ctx.closePath(); ctx.fill(); // the cheek ruff
  ctx.strokeStyle = "rgba(140,150,166,.8)"; ctx.lineWidth = Math.max(.8, .01 * u); ctx.beginPath(); ctx.moveTo(hx + face * .03 * u, hy + .075 * u); ctx.quadraticCurveTo(hx + face * .1 * u, hy + .095 * u, hx + face * .15 * u, hy + .06 * u); ctx.stroke(); // the jaw
  ctx.fillStyle = "#f7f9fb"; ellipse(ctx, hx + face * .1 * u, hy + .035 * u, .065 * u, .05 * u); ctx.fill(); // the short muzzle
  ctx.fillStyle = "#b8a2aa"; ctx.beginPath(); ctx.moveTo(hx + face * .15 * u, hy + .012 * u); ctx.lineTo(hx + face * .17 * u, hy + .03 * u); ctx.lineTo(hx + face * .145 * u, hy + .035 * u); ctx.fill(); // the nose
  ctx.strokeStyle = "rgba(200,210,224,.8)"; ctx.lineWidth = Math.max(.8, .01 * u); for (const d of [-.02, .01, .04]) { ctx.beginPath(); ctx.moveTo(hx + face * .12 * u, hy + .045 * u); ctx.lineTo(hx + face * .27 * u, hy + .045 * u + d * u); ctx.stroke(); } // whiskers
  ctx.fillStyle = "rgba(159,238,255,.35)"; ellipse(ctx, hx + face * .065 * u, hy - .02 * u, .06 * u, .035 * u); ctx.fill();
  ctx.fillStyle = "#9feeff"; ellipse(ctx, hx + face * .065 * u, hy - .02 * u, .03 * u, .017 * u, face * -.3); ctx.fill();
  ctx.fillStyle = "#16303c"; ellipse(ctx, hx + face * .068 * u, hy - .02 * u, .007 * u, .015 * u); ctx.fill(); // the slit pupil
  ctx.restore();
}

function drawApe(ctx, x, y, u, face, t, flying) {
  // A hunched white silverback with bat wings, beating hard in the air.
  const flap = flying ? Math.sin(t * 14) : Math.sin(t * 2) * .25, span = (.85 + .25 * flap) * u, lift = (.25 - .2 * flap) * u;
  ctx.fillStyle = WING; ctx.strokeStyle = WING_EDGE; ctx.lineWidth = Math.max(1, u * .03);
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(x + side * .12 * u, y - .7 * u); ctx.lineTo(x + side * span, y - .7 * u - lift - .25 * u);
    for (let k = 3; k >= 1; k--) ctx.quadraticCurveTo(x + side * (span * k / 3 - .06 * u), y - .5 * u - lift * k / 3, x + side * span * (k - 1) / 3 + side * .1 * u, y - .52 * u);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = SHADE; for (const side of [-1, 1]) { ellipse(ctx, x + side * .3 * u, y - .3 * u, .1 * u, .3 * u, side * .25); ctx.fill(); } // long arms on the knuckles
  ctx.fillStyle = FUR; ellipse(ctx, x, y - .52 * u, .33 * u, .3 * u); ctx.fill(); // the great back
  ctx.fillStyle = SILVER; ellipse(ctx, x - face * .05 * u, y - .6 * u, .2 * u, .14 * u); ctx.fill();
  ctx.fillStyle = FUR; for (const side of [-1, 1]) { ellipse(ctx, x + side * .14 * u, y - .12 * u, .09 * u, .12 * u); ctx.fill(); }
  ctx.fillStyle = "#59606c"; ellipse(ctx, x + face * .17 * u, y - .76 * u, .13 * u, .12 * u); ctx.fill(); // the face
  ctx.fillStyle = "#9fe8ff"; ellipse(ctx, x + face * .23 * u, y - .79 * u, .022 * u, .018 * u); ctx.fill();
}

function drawPool(ctx, x, y, u, t, rise) {
  ctx.fillStyle = "rgba(196,210,226,.92)"; ellipse(ctx, x, y - .05 * u, (.5 - .15 * rise) * u, (.17 + .25 * rise) * u); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = Math.max(1, u * .03);
  for (let i = 0; i < 2; i++) { const k = ((t * .9 + i * .5) % 1); ctx.globalAlpha = 1 - k; ellipse(ctx, x, y - .05 * u, (.2 + .35 * k) * u, (.07 + .12 * k) * u); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ellipse(ctx, x - .14 * u, y - .1 * u, .08 * u, .03 * u); ctx.fill();
}

// One great liquid blade: from its root at (x0, y0) along angle `a`, `len` px long, `w` px wide at the root, a slight curve,
// a mirror-bright edge.
function drawBlade(ctx, x0, y0, a, len, w, alpha = 1) {
  const c = Math.cos(a), sn = Math.sin(a), nx = -sn, ny = c, tx = x0 + c * len, ty = y0 + sn * len, bend = len * .08;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = "#cfd9e6"; ctx.beginPath(); ctx.moveTo(x0 + nx * w * .5, y0 + ny * w * .5);
  ctx.quadraticCurveTo(x0 + c * len * .55 + nx * (w * .55 + bend), y0 + sn * len * .55 + ny * (w * .55 + bend), tx, ty);
  ctx.quadraticCurveTo(x0 + c * len * .5 - nx * w * .2, y0 + sn * len * .5 - ny * w * .2, x0 - nx * w * .5, y0 - ny * w * .5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, w * .14); ctx.beginPath(); ctx.moveTo(x0 + nx * w * .5, y0 + ny * w * .5);
  ctx.quadraticCurveTo(x0 + c * len * .55 + nx * (w * .55 + bend), y0 + sn * len * .55 + ny * (w * .55 + bend), tx, ty); ctx.stroke();
  ctx.strokeStyle = "rgba(150,235,255,.55)"; ctx.lineWidth = Math.max(1, w * .08); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + c * len * .85, y0 + sn * len * .85); ctx.stroke();
  ctx.restore();
}
// The crossed blades on the Stalker: two great liquid blades rise out of its back, swing forward and lock crossed in an X in
// front of it (where the blow lands), longer than its body; the X then flies (drawFlyingX).
function drawBlades(ctx, e, s, x, y, u, face) {
  const b = e.stalkBlades; if (!b) return;
  const X = STALKER.turret.xblade, aim = b.aim, k = 1 - Math.max(0, b.t) / (b.total || 1), half = X.length * s / 2;
  const back = { x: x - face * .05 * u, y: y - .55 * u }, cx = (e.x + .5 + Math.cos(aim) * X.reach) * s, cy = (e.y + .5 + Math.sin(aim) * X.reach) * s;
  for (const side of [1, -1]) {
    const raisedAng = -Math.PI / 2 - side * .45, raisedMid = { x: back.x + Math.cos(raisedAng) * half * .8 + side * .1 * u, y: back.y + Math.sin(raisedAng) * half * .8 }, finalAng = aim + Math.PI / 2 + side * Math.PI / 4;
    let mid = raisedMid, ang = raisedAng, len = half * 2, root = null;
    if (b.phase === "rise") { len = half * 2 * (.3 + .7 * k); root = back; }
    else { const q = b.phase === "swing" ? k * k * (3 - 2 * k) : 1, d = Math.atan2(Math.sin(finalAng - raisedAng), Math.cos(finalAng - raisedAng));
      ang = raisedAng + d * q; mid = { x: raisedMid.x + (cx - raisedMid.x) * q, y: raisedMid.y + (cy - raisedMid.y) * q }; }
    if (root) drawBlade(ctx, root.x, root.y, ang, len, .2 * u);
    else drawBlade(ctx, mid.x - Math.cos(ang) * half, mid.y - Math.sin(ang) * half, ang, half * 2, .22 * u);
  }
  if (b.phase !== "rise") { ctx.save(); ctx.globalAlpha = b.phase === "hold" ? .95 : .5 * k; ctx.fillStyle = "rgba(220,245,255,.85)"; ellipse(ctx, cx, cy, .14 * u, .14 * u); ctx.fill(); ctx.restore(); }
}
// The flying X: two great blades crossed square to its flight, larger than the Stalker, a faint wake behind.
function drawFlyingX(ctx, q, s, now) {
  const qx = (q.x + .5) * s, qy = (q.y + .5) * s, r = q.radius * s, a = q.aim ?? Math.atan2(q.vy || 0, q.vx || 1);
  for (let k = 3; k >= 0; k--) { const back = k * .35 * s, ox = qx - Math.cos(a) * back, oy = qy - Math.sin(a) * back, al = k ? .18 / k : 1;
    for (const d of [Math.PI / 4, -Math.PI / 4]) { const b = a + Math.PI / 2 + d, c = Math.cos(b), sn = Math.sin(b); drawBlade(ctx, ox - c * r, oy - sn * r, b, 2 * r, r * .28, al); } }
  ctx.save(); ctx.fillStyle = `rgba(200,245,255,${.6 + .3 * Math.sin(now / 50)})`; ellipse(ctx, qx, qy, r * .14, r * .14); ctx.fill(); ctx.restore();
}
// The mist: long wisps of silver wheeling round where it is, trailing, two pale eyes in it.
function drawMist(ctx, x, y, u, t, k = 1) {
  ctx.save(); ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) { const a0 = t * 2.1 + i * .7, r = (.18 + (i % 4) * .1) * u, cx = x + Math.cos(a0) * r * 1.3, cy = y - .35 * u + Math.sin(a0) * r * .55;
    ctx.globalAlpha = k * (.16 + .08 * Math.sin(t * 2.7 + i)); ctx.strokeStyle = i % 3 ? "#e6ecf4" : "#b9c4d2"; ctx.lineWidth = (.12 + (i % 3) * .05) * u;
    ctx.beginPath(); ctx.arc(cx, cy, (.3 + (i % 2) * .15) * u, a0, a0 + 1.4 + (i % 3) * .3); ctx.stroke(); }
  ctx.globalAlpha = k * .25; ctx.fillStyle = "#dfe6ef"; ellipse(ctx, x, y - .35 * u, .45 * u, .28 * u); ctx.fill();
  ctx.globalAlpha = k * .95; ctx.fillStyle = "#bff3ff"; for (const d of [-1, 1]) { ellipse(ctx, x + d * .08 * u, y - .45 * u, .035 * u, .02 * u); ctx.fill(); }
  ctx.restore();
}

// One Stalker, copy or decoy. Returns true (it drew itself).
export function drawStalker(ctx, e, s, now, reduceMotion = false) {
  const t = reduceMotion ? 0 : now / 1000, u = s * Math.max(.3, Number(e.scale) || STALKER.size), a = e.stalkAct || {};
  const x = (e.x + .5) * s, ground = (e.y + .9) * s, lift = (Number(e.stalkLift) || 0) * s, y = ground - lift, face = (e.facingX || 1) >= 0 ? 1 : -1;
  ctx.save();
  // Its afterimages fade where the blow fell.
  for (const g of e.stalkGhosts || []) { ctx.globalAlpha = Math.max(0, g.t / .6) * .45; const gx = (g.x + .5) * s, gy = (g.y + .9) * s; if (g.form === "ape") drawApe(ctx, gx, gy, u, face, t, false); else drawCat(ctx, gx, gy, u, face, t, false); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(0,0,0,.28)"; ellipse(ctx, x, ground, .42 * u * (1 - Math.min(.5, lift / (3 * s))), .13 * u); ctx.fill();
  if (e.stalkerDecoy) ctx.globalAlpha = Math.max(.15, Math.min(.7, (Number(e.stalkLife) || 0) / 1.5)) * (.75 + .25 * Math.sin(now / 70));
  else if (e.stalkerKin) ctx.globalAlpha = .92;
  const form = e.stalkForm || "cat";
  if (form === "mist") { const g = a.kind === "mistGather" ? 1 - Math.max(0, a.t) / (a.total || 1) : 1; if (g < 1) { ctx.globalAlpha = 1 - g; drawCat(ctx, x, y, u, face, t, false); ctx.globalAlpha = 1; } drawMist(ctx, x, y, u, t, g); }
  else if (form === "pool") drawPool(ctx, x, y, u, t, a.kind === "rise" ? 1 - Math.max(0, a.t) / (a.total || 1) : 0);
  else if (form === "ape") drawApe(ctx, x, y, u, face, t, lift > 1);
  else if (e.stalkClimb) { // claws in: the body upright against the bark or stone, legs scrabbling
    ctx.save(); ctx.translate(x, y - .35 * u); ctx.rotate(-face * Math.PI * .42); drawCat(ctx, 0, .35 * u, u, face, t * 1.8, true); ctx.restore();
    ctx.strokeStyle = "rgba(230,236,244,.55)"; ctx.lineWidth = Math.max(1, u * .02); for (let i = 0; i < 3; i++) { const cy = y - (.2 + i * .14) * u; ctx.beginPath(); ctx.moveTo(x - .08 * u + i * .05 * u, cy); ctx.lineTo(x - .02 * u + i * .05 * u, cy + .1 * u); ctx.stroke(); }
  }
  else drawCat(ctx, x, y, u, face, t, !["wait", "swipeWarn", "pounceWarn"].includes(a.kind), a.kind === "pounceWarn" ? "crouch" : a.kind === "pounce" || a.kind === "hop" ? "leap" : a.kind === "swipeWarn" ? "swipe" : null);
  if (!e.stalkerKin && !e.stalkerDecoy) drawBlades(ctx, e, s, x, y, u, face);
  if (!e.stalkerKin && !e.stalkerDecoy && form !== "pool" && (e.stalkTurretUp || 0) > 0) { // the turret popping out of its back
    const up = e.stalkTurretUp, bx = x - face * .08 * u, by = y - (form === "ape" ? .82 : .5) * u - up * .12 * u, aim = e.stalkTurret?.aim ?? (face > 0 ? 0 : Math.PI);
    ctx.fillStyle = "#8e98a8"; ellipse(ctx, bx, by, .1 * u * up, .06 * u * up); ctx.fill();
    ctx.strokeStyle = "#dfe8f3"; ctx.lineWidth = Math.max(2, u * .06 * up); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(aim) * .28 * u * up, by + Math.sin(aim) * .2 * u * up); ctx.stroke();
    if (e.stalkTurret) { ctx.fillStyle = `rgba(150,235,255,${.5 + .5 * Math.sin(now / 60)})`; ellipse(ctx, bx + Math.cos(aim) * .28 * u * up, by + Math.sin(aim) * .2 * u * up, .05 * u, .05 * u); ctx.fill(); }
  }
  if ((e.stalkCharged || 0) > 0) { const r = STALKER.energized.aura * s, k = .5 + .5 * Math.sin(now / 110); ctx.fillStyle = `rgba(120,220,255,${.12 + .08 * k})`; ellipse(ctx, x, y - .35 * u, r, r * .85); ctx.fill(); ctx.strokeStyle = `rgba(170,240,255,${.55 + .35 * k})`; ctx.lineWidth = Math.max(2, s * .05); ctx.stroke(); }
  if ((e.stalkShield || 0) > 0) { const aim = e.stalkShieldAim ?? 0, r = .62 * u; ctx.strokeStyle = `rgba(226,234,244,${.6 + .3 * Math.sin(now / 90)})`; ctx.lineWidth = Math.max(4, u * .14); ctx.beginPath(); ctx.ellipse(x, y - .4 * u, r, r * .8, 0, aim - 1, aim + 1); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = Math.max(1, u * .03); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (const q of e.stalkShots || []) { const qx = (q.x + .5) * s, qy = (q.y + .5) * s; // its shots
    if (q.kind === "xblade") { drawFlyingX(ctx, q, s, now); }
    else { const r = q.radius * s; ctx.fillStyle = q.kind === "sphere" ? "rgba(120,220,255,.45)" : "rgba(190,240,255,.85)"; ellipse(ctx, qx, qy, r, r); ctx.fill(); ctx.fillStyle = "#ffffff"; ellipse(ctx, qx, qy, r * .45, r * .45); ctx.fill(); } }
  if (e.hitFlash > 0) { ctx.globalAlpha = .5; ctx.fillStyle = "#ffffff"; ellipse(ctx, x, y - .4 * u, .45 * u, .35 * u); ctx.fill(); }
  ctx.restore();
  if (e.stalker && !e.stalkerKin) { ctx.save(); ctx.font = `bold ${Math.max(10, s * .3)}px serif`; ctx.textAlign = "center"; ctx.fillStyle = SILVER; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3; const ty = y - 1.15 * u; ctx.strokeText("The Stalker", x, ty); ctx.fillText("The Stalker", x, ty); ctx.restore(); }
  return true;
}

// The ground marked before each blow: the pounce's line, the leap's landing ring, the swipe's or fist's reach.
export function drawStalkerMarks(ctx, e, s, now) {
  const a = e.stalkAct; if (!a || e.dead) return;
  const F = STALKER.forms, pulse = .7 + .3 * Math.sin(now / 90), cx = (e.x + .5) * s, cy = (e.y + .82) * s;
  ctx.save(); ctx.fillStyle = MARK_FILL; ctx.strokeStyle = MARK_EDGE; ctx.lineWidth = Math.max(2, s * .06); ctx.globalAlpha = pulse;
  if (a.kind === "pounceWarn" && a.to) { ctx.lineWidth = Math.max(4, s * .5); ctx.strokeStyle = MARK_FILL.replace(".18", ".3"); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo((a.to.x + .5) * s, (a.to.y + .82) * s); ctx.stroke(); }
  else if (a.kind === "leapWarn" && a.to) { ellipse(ctx, (a.to.x + .5) * s, (a.to.y + .82) * s, F.ape.leap.radius * s, F.ape.leap.radius * s * .55); ctx.fill(); ctx.stroke(); }
  const T = e.stalkTurret, cone = T?.move === "cone" ? T : e.stalkConeFlash ? { aim: e.stalkConeFlash.aim, fire: true } : null;
  if (cone) { const R = STALKER.turret.cone, ox = (e.x + .5) * s, oy = (e.y + .5) * s; ctx.save(); ctx.fillStyle = cone.fire ? "rgba(190,240,255,.45)" : MARK_FILL; ctx.strokeStyle = cone.fire ? "#e8fbff" : MARK_EDGE; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, R.range * s, cone.aim - R.half, cone.aim + R.half); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if (e.stalkBlades && e.stalkBlades.phase !== "hold") { const X = STALKER.turret.xblade, b = e.stalkBlades; ellipse(ctx, (e.x + .5 + Math.cos(b.aim) * X.reach) * s, (e.y + .5 + Math.sin(b.aim) * X.reach) * s, X.cross * s, X.cross * s * .6); ctx.fill(); ctx.stroke(); }
  if (a.kind === "hop" && a.to) { ellipse(ctx, (a.to.x + .5) * s, (a.to.y + .82) * s, .7 * s, .38 * s); ctx.fill(); }
  else if (a.kind === "swipeWarn" || a.kind === "fistWarn") { const r = (e.stalkerKin || e.stalkerDecoy ? STALKER.kin.reach + .3 : a.kind === "fistWarn" ? F.ape.fist.reach : F.cat.swipe.reach) * s; ellipse(ctx, cx, cy, r, r * .55); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

// The pulsing silver marker at the screen edge, pointing the way it comes, with the warning beside it.
export function drawStalkerMarker(ctx, m, w, h, now) {
  if (!m) return;
  const cx = w / 2, cy = h / 2, c = Math.cos(m.angle), sn = Math.sin(m.angle), pad = 22;
  const k = Math.min((cx - pad) / Math.max(1e-6, Math.abs(c)), (cy - pad) / Math.max(1e-6, Math.abs(sn))), x = cx + c * k, y = cy + sn * k;
  const beat = .5 + .5 * Math.sin(now / (340 - 80 * (m.stage || 1))), alpha = .35 + .55 * Math.min(1, m.strength) * (.6 + .4 * beat), size = 9 + 5 * (m.stage || 1) / 3 + 3 * beat;
  ctx.save(); ctx.translate(x, y); ctx.rotate(m.angle); ctx.globalAlpha = alpha;
  ctx.fillStyle = "#e9f0f8"; ctx.strokeStyle = "#1a1f28"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * .7, size * .75); ctx.lineTo(-size * .3, 0); ctx.lineTo(-size * .7, -size * .75); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = `rgba(220,232,246,${.6 * beat})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, size + 4 + 6 * beat, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if (m.text) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = "bold 11px sans-serif"; ctx.textAlign = x < cx - 40 ? "left" : x > cx + 40 ? "right" : "center";
    const tx = Math.max(pad, Math.min(w - pad, x - c * 26)), ty = Math.max(pad + 6, Math.min(h - pad, y - sn * 26 + (Math.abs(sn) < .5 ? 18 : 0)));
    ctx.fillStyle = "#e9f0f8"; ctx.strokeStyle = "#000c"; ctx.lineWidth = 3; ctx.strokeText(m.text, tx, ty); ctx.fillText(m.text, tx, ty); ctx.restore();
  }
}
