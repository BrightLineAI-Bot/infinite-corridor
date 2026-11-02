// Release 678: drawing the Stalker (stalker.ts): the six-legged snow leopard, the winged silverback, the silver pool, its
// afterimages, its copies and decoys, the marks before each blow, and the silver marker at the screen edge while it hunts.
// Plain canvas paths, no sprites or gradients per frame beyond one shadow, so it stays cheap on a phone.
import { STALKER, spikeLines } from "./stalker.js?v=r695-bbf3bb21143d";

const OUTLINE = "rgba(140,150,166,.55)", FUR = "#f1f3f6", SHADE = "#b9c0cc", SPOT = "#7d8594", SILVER = "#d8e2ee", WING = "#3a2f44", WING_EDGE = "#c9d4e4";
const MARK_FILL = "rgba(255,80,190,.18)", MARK_EDGE = "rgba(255,130,210,.78)";

function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }

// The cat's head, side on, facing `face`, centred at (hx, hy): a big cat's profile (shared by every cat pose).
function catHead(ctx, hx, hy, u, face) {
  const E = (dx, dy) => ({ x: hx + face * dx * u, y: hy + dy * u }), path = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i += 2) ctx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); ctx.closePath(); };
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1, .012 * u);
  for (const [ex, back] of [[-.1, .05], [-.04, .04]]) { // ears, angled back
    const b0 = E(ex - .03, -.08), b1 = E(ex + .05, -.095), tip = E(ex - back, -.19);
    ctx.fillStyle = FUR; ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(b1.x, b1.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    const i0 = E(ex - .01, -.08), i1 = E(ex + .03, -.085), it = E(ex - back + .015, -.17); ctx.fillStyle = "#b9c2cf"; ctx.beginPath(); ctx.moveTo(i0.x, i0.y); ctx.lineTo(it.x, it.y); ctx.lineTo(i1.x, i1.y); ctx.fill(); }
  // The skull: a big cat's profile, the brow sloping to a short, deep, boxy muzzle, a chin under it.
  ctx.fillStyle = FUR; path([E(-.12, .04), E(-.15, -.06), E(-.06, -.1), E(.03, -.11), E(.09, -.075), E(.13, -.05), E(.165, -.03), E(.185, -.012), E(.18, .01), E(.172, .034), E(.13, .048), E(.12, .078), E(.07, .088), E(-.02, .095), E(-.12, .04)]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f6f8fb"; ellipse(ctx, hx + face * .135 * u, hy + .012 * u, .045 * u, .032 * u); ctx.fill(); // the whisker pad
  ctx.fillStyle = "#e6eaf0"; ellipse(ctx, hx + face * .1 * u, hy + .066 * u, .028 * u, .012 * u); ctx.fill(); // the chin
  ctx.strokeStyle = "#7f8898"; ctx.lineWidth = Math.max(1, .012 * u); ctx.beginPath(); const m0 = E(.09, .048), m1 = E(.13, .05), m2 = E(.165, .036); ctx.moveTo(m0.x, m0.y); ctx.quadraticCurveTo(m1.x, m1.y, m2.x, m2.y); ctx.stroke(); // the mouth
  ctx.fillStyle = "#8b7a84"; const n0 = E(.165, -.028), n1 = E(.188, -.012), n2 = E(.172, .004); ctx.beginPath(); ctx.moveTo(n0.x, n0.y); ctx.lineTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.fill(); // the nose
  ctx.strokeStyle = "rgba(160,170,186,.95)"; ctx.lineWidth = Math.max(1, .018 * u); ctx.beginPath(); const r0 = E(.0, -.07), r1 = E(.05, -.088), r2 = E(.095, -.062); ctx.moveTo(r0.x, r0.y); ctx.quadraticCurveTo(r1.x, r1.y, r2.x, r2.y); ctx.stroke(); // the brow ridge
  ctx.strokeStyle = "rgba(200,210,224,.7)"; ctx.lineWidth = Math.max(.6, .007 * u); for (const d of [-.012, .006]) { const w0 = E(.15, .012 + d), w1 = E(.25, .0 + d * 2.5); ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.lineTo(w1.x, w1.y); ctx.stroke(); } // two fine whiskers
  // Narrow almond eyes, angled down toward the nose, burning.
  const ec = E(.05, -.045); ctx.fillStyle = "rgba(159,238,255,.28)"; ellipse(ctx, ec.x, ec.y, .05 * u, .025 * u, face * .25); ctx.fill();
  ctx.fillStyle = "#9feeff"; ctx.beginPath(); const k0 = E(.015, -.052), k1 = E(.045, -.066), k2 = E(.085, -.04), k3 = E(.048, -.032); ctx.moveTo(k0.x, k0.y); ctx.quadraticCurveTo(k1.x, k1.y, k2.x, k2.y); ctx.quadraticCurveTo(k3.x, k3.y, k0.x, k0.y); ctx.fill();
  ctx.fillStyle = "#12232c"; ellipse(ctx, hx + face * .05 * u, hy - .048 * u, .005 * u, .011 * u); ctx.fill();
  ctx.strokeStyle = "#9aa4b4"; ctx.lineWidth = Math.max(1, .016 * u); ctx.beginPath(); const h0 = E(.01, -.058), h1 = E(.05, -.072), h2 = E(.09, -.046); ctx.moveTo(h0.x, h0.y); ctx.quadraticCurveTo(h1.x, h1.y, h2.x, h2.y); ctx.stroke(); // the lid, hooding the eye
  ctx.fillStyle = "#f7f9fb"; const c0 = E(-.12, .03), c1 = E(-.15, .1), c2 = E(-.07, .08), c3 = E(-.05, .12), c4 = E(.0, .09); ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y); ctx.closePath(); ctx.fill(); // the cheek ruff
}
// The penumbra of mist round the cat (shared by every cat pose, and the gorilla): it is not wholly here. Blue-grey, its accent
// colours (Tim: "the penumbra around the stalker should be slightly blue... I like blue and gray"). `F(dx)` maps along its facing.
function catMist(ctx, F, by, x, y, u, t, k = 1) {
  // A penumbra of mist round it, drifting: it is not wholly here. Wisps trail off its back and tail and pool at its feet.
  ctx.save(); ctx.globalAlpha *= k;
  const puff = (px, py, r, alpha, sy = .75) => { const g = ctx.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(196,214,240,${alpha})`); g.addColorStop(1, "rgba(196,214,240,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, r, r * sy, 0, 0, Math.PI * 2); ctx.fill(); };
  for (let i = 0; i < 6; i++) { const ph = t * .9 + i * 1.7; puff(F(-.55 + i * .22 + Math.sin(ph) * .04), by - (.36 + Math.cos(ph * 1.3) * .05) * u, (.38 + .06 * Math.sin(ph)) * u, .2 + .06 * Math.sin(ph * 1.7)); }
  for (let i = 0; i < 4; i++) { const k = ((t * .35 + i * .25) % 1); puff(F(-.5 - k * .5 + (i % 2) * .2), by - (.45 + k * .28 - (i % 2) * .15) * u, (.14 + k * .2) * u, .3 * (1 - k)); }
  puff(x, y - .04 * u, .7 * u, .22, .16);
  ctx.restore();
}
function drawCat(ctx, x, y, u, face, t, moving, pose = null) {
  // A white six-legged feline of the Corridor, stalking: lithe, low-slung, a sinuous back dipping between shoulder and haunch,
  // three pairs of jointed legs (the far three a shade darker so all six read), a round cat's head carried low and level with
  // a short muzzle and alert ears, glowing eyes, a long rope of a tail in an S.
  const gait = moving ? t * 9 : 0, bob = moving ? Math.abs(Math.sin(gait)) * .02 * u : 0, by = y - bob, F = (dx) => x + face * dx * u;
  // Poses: a crouch before the pounce (low, haunch high, tail lashing), the leap (stretched long, legs flung out), a raised paw
  // before the swipe.
  const sway = Math.sin(t * (pose === "crouch" ? 9 : 2.3)) * (pose === "crouch" ? .09 : .05) * u;
  ctx.save(); if (pose === "crouch") { ctx.translate(x, y); ctx.scale(1.04, .8); ctx.translate(-x, -y); } else if (pose === "stalk") { ctx.translate(x, y); ctx.scale(1.06, .84); ctx.translate(-x, -y); } else if (pose === "perch") { ctx.translate(x, y); ctx.scale(1.02, .74); ctx.translate(-x, -y); } else if (pose === "leap") { ctx.translate(x, y - .1 * u); ctx.rotate(-face * .08); ctx.scale(1.16, .9); ctx.translate(-x, -y); }
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (pose !== "climb") catMist(ctx, F, by, x, y, u, t);
  // The tail: from the haunch, low, then an S up to a curled silver tip.
  const tp = pose === "perch" ? [[F(-.5), by - .4 * u], [F(-.66), by + .05 * u], [F(-.5) + sway, by + .55 * u], [F(-.6) + sway, by + .95 * u]] : [[F(-.5), by - .4 * u], [F(-.78), by - .2 * u + sway], [F(-1.0), by - .32 * u], [F(-1.12), by - .62 * u - sway]];
  for (const [wd, col] of [[.105, "rgba(140,150,166,.55)"], [.08, FUR]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, wd * u); ctx.beginPath(); ctx.moveTo(tp[0][0], tp[0][1]); ctx.bezierCurveTo(tp[1][0], tp[1][1], tp[2][0], tp[2][1], tp[3][0], tp[3][1]); ctx.stroke(); }
  ctx.fillStyle = SILVER; ellipse(ctx, tp[3][0], tp[3][1], .04 * u, .04 * u); ctx.fill();
  // Six jointed legs, spread along the body so all six read (the far three set back and a shade darker): a muscled upper leg,
  // a slim lower leg and a broad paw; the hind pair with the cat's backward hock.
  const legs = [{ at: .34, knee: -.05, hipY: .3, thick: .13 }, { at: .0, knee: -.04, hipY: .27, thick: .12 }, { at: -.36, knee: .1, hipY: .3, thick: .15 }];
  for (const side of [1, 0]) legs.forEach((L, i) => {
    const ph = Math.sin(gait + i * 2.1 + side * Math.PI), hipX = F(L.at + (side ? .07 : 0)), hipY = by - L.hipY * u - (side ? .025 * u : 0);
    let footX = hipX + face * ph * .1 * u, lift = Math.max(0, ph) * .04 * u, footY = y - .02 * u - lift;
    if (pose === "perch") { footX = hipX + face * (i === 0 ? .22 : .1) * u; footY = y - .02 * u; lift = 0; } // folded under, the front paws at the edge
    if (pose === "leap") { const reach = i === 0 ? .32 : i === 1 ? .08 : -.34; footX = hipX + face * reach * u; footY = by - (.12 + (i === 1 ? .04 : 0)) * u; lift = 0; }
    if (pose === "swipe" && i === 0 && !side) { footX = hipX + face * .28 * u; footY = by - .42 * u; }
    const kneeX = (hipX + footX) / 2 - face * L.knee * u, kneeY = pose === "leap" || (pose === "swipe" && i === 0 && !side) ? (hipY + footY) / 2 + .03 * u : by - .16 * u - lift * .5;
    const col = side ? "#a8b1bf" : "#eef1f5", edge = side ? "#7b8494" : "rgba(140,150,166,.55)";
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
  ctx.bezierCurveTo(F(-.54), by - .26 * u, F(-.55), by - .31 * u, F(-.52), by - .36 * u); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(140,150,166,.55)"; ctx.lineWidth = Math.max(1, .014 * u); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.moveTo(F(-.45), by - .47 * u); ctx.bezierCurveTo(F(-.3), by - .51 * u, F(-.15), by - .45 * u, F(-.05), by - .43 * u); ctx.bezierCurveTo(F(.1), by - .42 * u, F(.25), by - .48 * u, F(.4), by - .47 * u); ctx.bezierCurveTo(F(.25), by - .44 * u, F(.05), by - .38 * u, F(-.45), by - .43 * u); ctx.fill(); // the sheen along the back
  // The near haunch and shoulder over the body: the muscle the near legs hang from.
  ctx.fillStyle = "#f3f5f8"; ctx.strokeStyle = "rgba(140,150,166,.7)"; ctx.lineWidth = Math.max(1, .012 * u);
  ellipse(ctx, F(-.36), by - .34 * u, .15 * u, .12 * u, face * .35); ctx.fill();
  ellipse(ctx, F(.33), by - .36 * u, .11 * u, .12 * u, -face * .3); ctx.fill();
  ellipse(ctx, F(0), by - .31 * u, .09 * u, .08 * u); ctx.fill();
  ctx.fillStyle = "rgba(150,164,184,.3)"; ctx.beginPath(); ctx.moveTo(F(.4), by - .26 * u); ctx.bezierCurveTo(F(.3), by - .2 * u, F(.15), by - .22 * u, F(.02), by - .27 * u); ctx.bezierCurveTo(F(-.15), by - .31 * u, F(-.3), by - .26 * u, F(-.44), by - .26 * u); ctx.bezierCurveTo(F(-.2), by - .33 * u, F(.15), by - .3 * u, F(.4), by - .26 * u); ctx.fill(); // belly shade
  ctx.strokeStyle = "rgba(150,220,255,.55)"; ctx.lineWidth = Math.max(1, .02 * u); for (const d of [-.3, -.1, .12]) { ctx.beginPath(); ctx.moveTo(F(d), by - .46 * u); ctx.lineTo(F(d + .045), by - .39 * u); ctx.lineTo(F(d), by - .32 * u); ctx.stroke(); } // the blue chevrons on its flank (Tim: "I did like those blue chevrons")
  // The head: a lean wedge carried low and level, a flat brow sloping into a long muzzle, a hard jaw, narrowed slanted eyes under a
  // brow ridge, ears angled back. A predator's face.
  const hx = F(.56), hy = by - .5 * u, E = (dx, dy) => ({ x: hx + face * dx * u, y: hy + dy * u }), path = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i += 2) ctx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); ctx.closePath(); };
  ctx.fillStyle = FUR; ctx.strokeStyle = "rgba(140,150,166,.55)"; ctx.lineWidth = Math.max(1, .012 * u); ctx.beginPath(); ctx.moveTo(F(.22), by - .5 * u);
  ctx.bezierCurveTo(F(.34), by - .6 * u, F(.44), by - .6 * u, hx - face * .06 * u, hy - .08 * u); ctx.lineTo(hx + face * .02 * u, hy + .09 * u);
  ctx.bezierCurveTo(F(.5), by - .36 * u, F(.46), by - .3 * u, F(.4), by - .26 * u); ctx.lineTo(F(.3), by - .4 * u); ctx.closePath(); ctx.fill(); // the neck
  ctx.beginPath(); ctx.moveTo(F(.22), by - .5 * u); ctx.bezierCurveTo(F(.34), by - .6 * u, F(.44), by - .6 * u, hx - face * .06 * u, hy - .08 * u); ctx.stroke();
  ctx.fillStyle = FUR; ellipse(ctx, F(.27), by - .52 * u, .07 * u, .04 * u, -face * .4); ctx.fill(); // the shoulder blade
  if (pose === "perch") { ctx.save(); ctx.translate(hx, hy); ctx.rotate(face * .35); ctx.translate(-hx, -hy + .06 * u); catHead(ctx, hx, hy, u, face); ctx.restore(); } else catHead(ctx, hx, hy, u, face);
  ctx.restore();
}

// The cat sitting, lying in wait by a door: lean and upright like a watching cat. The haunch small and set back, the back rising
// steeply to the shoulders, a narrow chest, the two near front legs straight and slim in front (the far pair a shade behind), the
// tail laid round its front feet, the head high on its neck. (Perched on high ground it crouches instead: drawCat's "perch".)
function drawCatSit(ctx, x, y, u, face, t) {
  const F = (dx) => x + face * dx * u, breathe = Math.sin(t * 2) * .006 * u, by = y - breathe, flick = Math.sin(t * 3.1) * .03 * u;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  catMist(ctx, F, by + .12 * u, x, y, u * .85, t, .7);
  // The tail round its feet, the tip flicking.
  for (const [wd, col] of [[.09, OUTLINE], [.07, FUR]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, wd * u); ctx.beginPath(); ctx.moveTo(F(-.22), y - .06 * u); ctx.bezierCurveTo(F(-.3), y + .02 * u, F(.05), y + .03 * u, F(.26), y - .02 * u + flick); ctx.stroke(); }
  ctx.fillStyle = SILVER; ellipse(ctx, F(.26), y - .02 * u + flick, .035 * u, .035 * u); ctx.fill();
  const leg = (fx, top, col) => { ctx.strokeStyle = OUTLINE; ctx.lineWidth = .075 * u; ctx.beginPath(); ctx.moveTo(F(fx - .02), top); ctx.lineTo(F(fx), y - .03 * u); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = .057 * u; ctx.stroke(); ctx.fillStyle = col; ellipse(ctx, F(fx + .025), y - .025 * u, .05 * u, .024 * u); ctx.fill(); };
  // Far front legs and the far middle paw, behind.
  leg(.05, by - .42 * u, "#aab3c0"); leg(.15, by - .42 * u, "#aab3c0");
  // The body: from a small haunch, the back rising steeply to the shoulders, a narrow chest down to the front legs.
  ctx.fillStyle = FUR; ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1, .013 * u); ctx.beginPath();
  ctx.moveTo(F(-.3), by - .05 * u); ctx.bezierCurveTo(F(-.36), by - .2 * u, F(-.24), by - .34 * u, F(-.1), by - .5 * u);
  ctx.bezierCurveTo(F(-.02), by - .6 * u, F(.08), by - .66 * u, F(.14), by - .66 * u); ctx.bezierCurveTo(F(.22), by - .6 * u, F(.24), by - .44 * u, F(.2), by - .3 * u);
  ctx.bezierCurveTo(F(.18), by - .18 * u, F(.12), by - .08 * u, F(.06), by - .05 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f3f5f8"; ellipse(ctx, F(-.17), by - .13 * u, .14 * u, .11 * u, face * .2); ctx.fill(); // the haunch
  ctx.fillStyle = "#eef1f5"; ellipse(ctx, F(-.04), y - .03 * u, .07 * u, .026 * u); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.stroke(); // the hind paw
  ctx.fillStyle = "rgba(150,164,184,.25)"; ellipse(ctx, F(.12), by - .32 * u, .05 * u, .18 * u); ctx.fill(); // the chest's shade
  ctx.strokeStyle = "rgba(150,220,255,.55)"; ctx.lineWidth = Math.max(1, .018 * u); for (const d of [-.16, -.04]) { ctx.beginPath(); ctx.moveTo(F(d - .03), by - (.38 + d * .7) * u); ctx.lineTo(F(d + .02), by - (.32 + d * .7) * u); ctx.lineTo(F(d - .02), by - (.25 + d * .7) * u); ctx.stroke(); } // the chevrons
  // Near front legs, straight and slim, in front.
  leg(.09, by - .45 * u, "#eef1f5"); leg(.19, by - .45 * u, "#eef1f5");
  // Neck and head, high and watchful.
  const hx = F(.2), hy = by - .86 * u;
  ctx.fillStyle = FUR; ctx.beginPath(); ctx.moveTo(F(.02), by - .6 * u); ctx.quadraticCurveTo(F(.06), hy + .02 * u, hx - face * .06 * u, hy - .05 * u); ctx.lineTo(hx + face * .03 * u, hy + .09 * u); ctx.quadraticCurveTo(F(.22), by - .62 * u, F(.2), by - .5 * u); ctx.closePath(); ctx.fill();
  catHead(ctx, hx, hy, u, face);
  ctx.restore();
}
// The cat climbing: upright against the bark or the stone, head up, the forelegs reaching by turns and the hind legs pushing, the
// tail hanging down for balance, claw marks scored behind it.
function drawCatClimb(ctx, x, y, u, face, t) {
  const climb = Math.sin(t * 8), F = (dx) => x + face * dx * u;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(230,236,244,.5)"; ctx.lineWidth = Math.max(1, u * .02); for (let i = 0; i < 4; i++) { const cy = y - (.1 + i * .17) * u + (t * .3 % .17) * u; ctx.beginPath(); ctx.moveTo(F(.1 + (i % 2) * .06), cy); ctx.lineTo(F(.13 + (i % 2) * .06), cy + .12 * u); ctx.stroke(); } // claw marks
  const sway = Math.sin(t * 1.8) * .1 * u;
  for (const [wd, col] of [[.105, OUTLINE], [.08, FUR]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, wd * u); ctx.beginPath(); ctx.moveTo(F(-.02), y - .15 * u); ctx.bezierCurveTo(F(-.1), y + .15 * u, F(.05) + sway, y + .35 * u, F(-.08) + sway, y + .6 * u); ctx.stroke(); }
  ctx.fillStyle = SILVER; ellipse(ctx, F(-.08) + sway, y + .6 * u, .04 * u, .04 * u); ctx.fill();
  // Six legs gripping the surface (in front of the body: x toward `face`), alternating.
  const limbs = [[-.95, climb, "#aab3c0"], [-.75, -climb, "#eef1f5"], [-.55, climb, "#aab3c0"], [-.38, -climb, "#eef1f5"], [-.22, climb, "#aab3c0"], [-.08, -climb, "#eef1f5"]];
  for (const [hy, ph, col] of limbs) { const from = { x: F(.02), y: y + hy * u }, to = { x: F(.2), y: y + (hy - .1 + ph * .07) * u };
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = .085 * u; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(F(.18), from.y + .05 * u, to.x, to.y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = .065 * u; ctx.stroke(); ctx.fillStyle = col; ellipse(ctx, to.x, to.y, .035 * u, .05 * u); ctx.fill(); }
  // The body, upright.
  ctx.fillStyle = FUR; ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(1, .014 * u); ctx.beginPath(); ctx.ellipse(x, y - .55 * u, .17 * u, .55 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(150,164,184,.3)"; ellipse(ctx, F(-.08), y - .55 * u, .06 * u, .45 * u); ctx.fill();
  ctx.strokeStyle = "rgba(150,220,255,.55)"; ctx.lineWidth = Math.max(1, .02 * u); for (const d of [-.75, -.55, -.35]) { ctx.beginPath(); ctx.moveTo(F(-.08), y + d * u); ctx.lineTo(F(-.02), y + (d - .04) * u); ctx.lineTo(F(.04), y + d * u); ctx.stroke(); } // the chevrons, up its back
  // The head, at the top, looking up the climb.
  ctx.save(); const hx = x + face * .02 * u, hy = y - 1.16 * u; ctx.translate(hx, hy); ctx.rotate(-face * Math.PI * .38); ctx.translate(-hx, -hy); catHead(ctx, hx, hy, u * .95, face); ctx.restore();
  ctx.restore();
}

// The winged silverback. Side on: a massive forward-leaning body, the shoulder hump high, a silver saddle down the back, dark
// chest skin, short thick hind legs, long arms on the knuckles; a low head with a crest and a heavy brow, glowing eyes; bat
// wings with three finger bones. Poses: walk (knuckle gait), fly (wings beating, legs tucked), charge (head down, wings swept
// back), raise (a fist up overhead), punch (an arm thrust out), kick (a hind leg out). `armsOut`: its fists are launched (the
// arms are drawn stretching to them instead).
export const APE_SHOULDER = { x: .24, y: .66 };
function drawApe(ctx, x, y, u, face, t, pose = "walk", armsOut = false) {
  const F = (dx) => x + face * dx * u, fly = pose === "fly", gait = pose === "walk" ? Math.sin(t * 7) : 0, edge = "#7e8898";
  if (fly) { /* legs tucked in flight */ }
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (pose === "charge") { ctx.translate(x, y); ctx.rotate(face * .18); ctx.translate(-x, -y); }
  else if (pose === "kick") { ctx.translate(x, y); ctx.rotate(-face * .16); ctx.translate(-x, -y); }
  else if (pose === "perch") { ctx.translate(x, y); ctx.scale(1, .88); ctx.translate(-x, -y); }
  catMist(ctx, F, y - .2 * u, x, y, u, t, .7); // the same mist as the cat
  // The wings: an arm bone out to the wrist, three long fingers fanning from it, the membrane scalloped between the tips and back
  // to the body. Folded like a cape on the ground, swept back in the charge, spread wide and beating in flight.
  const beat = fly ? Math.sin(t * 13) : 0;
  if (pose === "perch") { /* folded round it as a cloak, drawn after the body */ } else for (const [side, col, off] of [[-1, "#251d2e", .1], [1, WING, 0]]) {
    const S0 = { x: F(-.04 + off * .5), y: y - (.82 + off * .3) * u }, P = (dx, dy) => ({ x: S0.x + face * dx * u, y: S0.y + dy * u });
    const W = fly ? P(-.5 - off, -.55 - beat * .3) : pose === "charge" ? P(-.5, -.25) : P(-.22, -.42);
    const tips = fly ? [[-.55, -.25 + beat * .25], [-.7, .2 + beat * .2], [-.42, .6]] : pose === "charge" ? [[-.45, .05], [-.5, .3], [-.3, .45]] : [[-.32, .2], [-.38, .55], [-.18, .78]];
    const T = tips.map(([dx, dy]) => ({ x: W.x + face * dx * u, y: W.y + dy * u })), body = P(-.32, .45);
    ctx.fillStyle = col; ctx.strokeStyle = WING_EDGE; ctx.lineWidth = Math.max(1, .02 * u);
    ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.lineTo(W.x, W.y); ctx.lineTo(T[0].x, T[0].y);
    const pts = [...T, body];
    for (let i = 1; i < pts.length; i++) { const a0 = pts[i - 1], a1 = pts[i], mx = (a0.x + a1.x) / 2, my = (a0.y + a1.y) / 2; ctx.quadraticCurveTo(mx + (W.x - mx) * .25, my + (W.y - my) * .25, a1.x, a1.y); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = side > 0 ? "#b4abc4" : "#6d6480"; ctx.lineWidth = Math.max(1.2, .035 * u); ctx.beginPath(); ctx.moveTo(S0.x, S0.y); ctx.lineTo(W.x, W.y); for (const q of T) { ctx.moveTo(W.x, W.y); ctx.lineTo(q.x, q.y); } ctx.stroke();
    ctx.fillStyle = "#cfc8db"; ellipse(ctx, W.x, W.y, .03 * u, .03 * u); ctx.fill(); // the wrist claw
  }
  // The far arm (behind the body).
  const knuckle = (dx, swing) => ({ x: F(dx + swing * .1), y: y - .03 * u });
  const armFrom = (k) => ({ x: F(APE_SHOULDER.x - k * .06), y: y - APE_SHOULDER.y * u });
  const drawArm = (from, to, col) => { ctx.strokeStyle = edge; ctx.lineWidth = .2 * u; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo((from.x + to.x) / 2 + face * .06 * u, (from.y + to.y) / 2, to.x, to.y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = .17 * u; ctx.stroke(); ctx.fillStyle = "#59606c"; ellipse(ctx, to.x, to.y, .085 * u, .065 * u); ctx.fill(); };
  if ((armsOut || 0) < 2) drawArm(armFrom(1), knuckle(.26, -gait), "#b6bfcc");
  // Hind legs, short and thick.
  const hind = (dx, k, kick) => { const fx = kick ? F(.55) : F(dx + gait * k * .06), fy = kick ? y - .42 * u : y - .02 * u;
    ctx.strokeStyle = edge; ctx.lineWidth = .19 * u; ctx.beginPath(); ctx.moveTo(F(dx + .02), y - .38 * u); ctx.quadraticCurveTo(F(dx - .08), y - .2 * u, fx, fy); ctx.stroke();
    ctx.strokeStyle = k > 0 ? FUR : "#c9d1dc"; ctx.lineWidth = .16 * u; ctx.stroke(); ctx.fillStyle = "#59606c"; ellipse(ctx, fx + face * .05 * u, fy, .09 * u, .045 * u); ctx.fill(); }
  for (const [dx, k] of [[-.2, 1], [-.32, -1]]) if (!(pose === "kick" && k > 0)) hind(dx, k, false);
  // The body: long and hunched, the great hump at the shoulders sloping down to a low rump; it breathes, and bobs as it walks.
  const bob = (pose === "walk" ? Math.abs(gait) * .03 : Math.sin(t * 2) * .01) * u, Y = (dy) => y - dy * u - bob;
  ctx.fillStyle = FUR; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, .014 * u); ctx.beginPath();
  ctx.moveTo(F(-.5), Y(.3)); ctx.bezierCurveTo(F(-.56), Y(.55), F(-.3), Y(.72), F(-.05), Y(.82));
  ctx.bezierCurveTo(F(.18), Y(.92), F(.44), Y(.84), F(.44), Y(.62)); ctx.bezierCurveTo(F(.44), Y(.42), F(.22), Y(.3), F(0), Y(.3));
  ctx.bezierCurveTo(F(-.2), Y(.28), F(-.42), Y(.22), F(-.5), Y(.3)); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c7d0dc"; ctx.beginPath(); ctx.moveTo(F(-.5), Y(.44)); ctx.bezierCurveTo(F(-.38), Y(.66), F(-.1), Y(.8), F(.12), Y(.86)); ctx.bezierCurveTo(F(-.05), Y(.7), F(-.28), Y(.54), F(-.5), Y(.44)); ctx.fill(); // the silver saddle
  ctx.strokeStyle = "rgba(205,226,245,.9)"; ctx.lineWidth = Math.max(1, .02 * u); ctx.beginPath(); ctx.moveTo(F(-.5), Y(.47)); ctx.bezierCurveTo(F(-.35), Y(.7), F(-.08), Y(.83), F(.12), Y(.88)); ctx.stroke(); // the silver seam
  ctx.strokeStyle = "rgba(150,220,255,.55)"; ctx.lineWidth = Math.max(1, .02 * u); for (const d of [-.32, -.14, .04]) { ctx.beginPath(); ctx.moveTo(F(d), Y(.66 + d * .25)); ctx.lineTo(F(d + .05), Y(.58 + d * .25)); ctx.lineTo(F(d), Y(.5 + d * .25)); ctx.stroke(); } // the blue chevrons
  ctx.fillStyle = "rgba(255,255,255,.7)"; ellipse(ctx, F(.15), Y(.8), .16 * u, .05 * u, -face * .15); ctx.fill(); // light on the hump
  ctx.fillStyle = "#5d6573"; ellipse(ctx, F(.33), Y(.5), .09 * u, .13 * u, face * .25); ctx.fill(); // chest skin
  if (pose === "kick") hind(-.2, 1, true); // the kick, in front
  // The head: low and forward between the shoulders.
  const hx = F(.44), hy = Y(.7);
  ctx.fillStyle = FUR; ellipse(ctx, hx - face * .02 * u, hy - .02 * u, .14 * u, .13 * u); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e8edf3"; ctx.beginPath(); ctx.moveTo(hx - face * .1 * u, hy - .1 * u); ctx.quadraticCurveTo(hx - face * .02 * u, hy - .22 * u, hx + face * .06 * u, hy - .12 * u); ctx.fill(); // the crest
  ctx.fillStyle = "#4f5664"; ctx.beginPath(); ctx.moveTo(hx, hy - .07 * u); ctx.quadraticCurveTo(hx + face * .15 * u, hy - .08 * u, hx + face * .15 * u, hy + .02 * u); ctx.quadraticCurveTo(hx + face * .16 * u, hy + .1 * u, hx + face * .05 * u, hy + .1 * u); ctx.quadraticCurveTo(hx - face * .03 * u, hy + .06 * u, hx, hy - .07 * u); ctx.fill(); // the dark face
  ctx.fillStyle = "#3d434e"; ctx.fillRect(Math.min(hx + face * .02 * u, hx + face * .15 * u), hy - .065 * u, .13 * u, .03 * u); // the heavy brow
  ctx.fillStyle = "#9feeff"; ellipse(ctx, hx + face * .1 * u, hy - .025 * u, .025 * u, .013 * u); ctx.fill();
  ctx.fillStyle = "rgba(159,238,255,.3)"; ellipse(ctx, hx + face * .1 * u, hy - .025 * u, .06 * u, .03 * u); ctx.fill();
  ctx.fillStyle = "#3a404a"; ellipse(ctx, hx + face * .13 * u, hy + .045 * u, .035 * u, .025 * u); ctx.fill(); // the muzzle
  // The near arm: on the knuckles, raised overhead, or thrust out in a punch.
  if (!armsOut) { const from = armFrom(0), to = pose === "raise" ? { x: F(.2), y: y - 1.35 * u } : pose === "punch" ? { x: F(.95), y: y - .62 * u } : pose === "perch" ? knuckle(.42, 0) : knuckle(.34, gait); drawArm(from, to, FUR); }
  if (pose === "perch") { // the gargoyle: wings wrapped round it like a cloak, finger bones down its sides, the head watching over the top
    const R = { x: F(-.02), y: y - .86 * u }, peaks = [{ x: F(-.28), y: y - 1.32 * u }, { x: F(.06), y: y - 1.24 * u }];
    for (const [col, pk, back] of [["#251d2e", peaks[0], -.6], [WING, peaks[1], -.3]]) { ctx.fillStyle = col; ctx.strokeStyle = WING_EDGE; ctx.lineWidth = Math.max(1, .02 * u); ctx.beginPath(); ctx.moveTo(R.x, R.y);
      ctx.lineTo(pk.x, pk.y); // the wrist, risen above the shoulder
      ctx.quadraticCurveTo(F(back - .1), y - .8 * u, F(back), y - .06 * u); // the outer edge, draped down its side
      ctx.quadraticCurveTo(F(back + .15), y + .02 * u, F(back + .25), y - .1 * u); ctx.quadraticCurveTo(F(back + .4), y - .0 * u, F(back + .5), y - .14 * u); // scalloped hem
      ctx.quadraticCurveTo(F(back + .45), y - .55 * u, R.x, R.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = col === WING ? "#b4abc4" : "#6d6480"; ctx.lineWidth = Math.max(1.2, .03 * u); ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(pk.x, pk.y); for (const fx of [back, back + .25, back + .5]) { ctx.moveTo(pk.x, pk.y); ctx.quadraticCurveTo(F(fx + .05), y - .7 * u, F(fx), y - .08 * u); } ctx.stroke();
      ctx.fillStyle = "#cfc8db"; ctx.beginPath(); ctx.moveTo(pk.x, pk.y - .1 * u); ctx.lineTo(pk.x - .03 * u, pk.y + .02 * u); ctx.lineTo(pk.x + .03 * u, pk.y + .02 * u); ctx.fill(); } // the wrist claws
    const hx2 = F(.44), hy2 = y - .74 * u; ctx.fillStyle = "#9feeff"; ellipse(ctx, hx2 + face * .1 * u, hy2 - .025 * u, .025 * u, .013 * u); ctx.fill(); ctx.fillStyle = "rgba(159,238,255,.35)"; ellipse(ctx, hx2 + face * .1 * u, hy2 - .025 * u, .07 * u, .035 * u); ctx.fill(); // its eyes over the cloak
  }
  ctx.restore();
}
// A launched fist: the arm stretching from its shoulder to it, the fist (knuckles forward) where it is.
export function drawApeArm(ctx, from, to, u) {
  ctx.save(); ctx.lineCap = "round";
  ctx.strokeStyle = "#7e8898"; ctx.lineWidth = .15 * u; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  ctx.strokeStyle = FUR; ctx.lineWidth = .12 * u; ctx.stroke();
  ctx.strokeStyle = "rgba(160,235,255,.5)"; ctx.lineWidth = .025 * u; ctx.stroke();
  ctx.fillStyle = "#59606c"; ctx.strokeStyle = "#2f343c"; ctx.lineWidth = Math.max(1, .02 * u); ellipse(ctx, to.x, to.y, .14 * u, .11 * u); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#8c94a2"; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(to.x - .06 * u, to.y + i * .035 * u); ctx.lineTo(to.x + .06 * u, to.y + i * .035 * u); ctx.stroke(); }
  ctx.restore();
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

// The appendage: a sinuous limb of liquid silver out of its back, ending in a sword, three spikes, or diving into the ground.
function limbCurve(ctx, from, to, u, bulge = .4) {
  const mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - bulge * u;
  ctx.strokeStyle = "#7e8898"; ctx.lineWidth = .13 * u; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(mx, my, to.x, to.y); ctx.stroke();
  ctx.strokeStyle = "#dbe4ef"; ctx.lineWidth = .1 * u; ctx.stroke(); ctx.strokeStyle = "rgba(160,235,255,.55)"; ctx.lineWidth = .025 * u; ctx.stroke();
}
function drawLimb(ctx, e, s, x, y, u, face, now) {
  const l = e.stalkLimb; if (!l) return; const L = STALKER.limb[l.move], k = 1 - Math.max(0, l.t) / (l.total || 1), back = { x: x - face * .05 * u, y: y - .55 * u };
  const at = (dx, dy) => ({ x: (e.x + .5 + dx) * s, y: (e.y + .5 + dy) * s });
  if (l.move === "sword") { const ang = l.aim - L.arc + 2 * L.arc * Math.min(1, k * 1.15), hilt = at(Math.cos(ang) * .9, Math.sin(ang) * .9 - .5); limbCurve(ctx, back, hilt, u, .5); drawBlade(ctx, hilt.x, hilt.y, ang, (L.reach - .9) * s, .2 * u); }
  else if (l.move === "spikes") { const out = Math.sin(Math.PI * Math.min(1, k)) ; for (const q of spikeLines({ x: 0, y: 0 }, l.aim)) { const tip = at(q.to.x * (.35 + .65 * out), q.to.y * (.35 + .65 * out)); limbCurve(ctx, back, tip, u, .2); const a = Math.atan2(tip.y - back.y, tip.x - back.x); ctx.fillStyle = "#eef4fb"; ctx.beginPath(); ctx.moveTo(tip.x + Math.cos(a) * .3 * u, tip.y + Math.sin(a) * .3 * u); ctx.lineTo(tip.x - Math.sin(a) * .07 * u, tip.y + Math.cos(a) * .07 * u); ctx.lineTo(tip.x + Math.sin(a) * .07 * u, tip.y - Math.cos(a) * .07 * u); ctx.fill(); } }
  else if (l.move === "tendril") { const dive = at(Math.cos(l.aim) * 1.2, Math.sin(l.aim) * 1.2 + .4); limbCurve(ctx, back, dive, u, .7); ctx.fillStyle = "rgba(200,215,235,.6)"; ellipse(ctx, dive.x, dive.y, .2 * u, .07 * u); ctx.fill(); }
}
// The tendril's eruptions: a ring marked where the Wayfarer stood, then a burst of silver spikes out of the ground.
function drawErupts(ctx, e, s, now) {
  const R = STALKER.limb.tendril.radius;
  for (const q of e.stalkErupts || []) { const cx = (q.x + .5) * s, cy = (q.y + .82) * s;
    if (q.t > 0) { const k = 1 - q.t / q.total; ctx.fillStyle = `rgba(255,80,190,${.12 + .15 * k})`; ctx.strokeStyle = MARK_EDGE; ctx.lineWidth = Math.max(2, s * .05); ellipse(ctx, cx, cy, R * s, R * s * .55); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(220,235,250,.6)"; ellipse(ctx, cx, cy, R * s * k, R * s * .55 * k); ctx.fill(); }
    else { const k = Math.min(1, -q.t / q.burst); ctx.fillStyle = `rgba(235,244,252,${1 - k * .7})`; ctx.strokeStyle = "#8c96a6"; ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { const o = (i - 4) / 4, h = (1.6 - Math.abs(o) * .9) * s * (1 - k * .5), bx = cx + o * R * .8 * s, w = .14 * s; ctx.beginPath(); ctx.moveTo(bx - w, cy + Math.abs(o) * .1 * s); ctx.lineTo(bx + o * .35 * s, cy - h); ctx.lineTo(bx + w, cy + Math.abs(o) * .1 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  }
}

// The puddle's mouth: two jaws of liquid silver rising out of the floor round the marked spot, lined with blade teeth, opening as
// they rise and snapping shut on the bite.
function drawMouth(ctx, at, s, open, now) {
  const cx = (at.x + .5) * s, cy = (at.y + .82) * s, R = STALKER.pool.under.radius * s, gap = open * R * .9;
  ctx.save(); ctx.fillStyle = "rgba(200,214,232,.55)"; ellipse(ctx, cx, cy, R * 1.05, R * .45); ctx.fill();
  for (const side of [-1, 1]) {
    const jy = cy - R * .2 + side * gap * .6, h = R * (.25 + open * .55);
    ctx.fillStyle = "#cfd9e6"; ctx.strokeStyle = "#7e8898"; ctx.lineWidth = Math.max(1, s * .03);
    ctx.beginPath(); ctx.ellipse(cx, jy, R, h, 0, side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff"; for (let i = -3; i <= 3; i++) { const tx = cx + i * R * .26, ty = jy; ctx.beginPath(); ctx.moveTo(tx - R * .08, ty); ctx.lineTo(tx, ty - side * R * (.18 + open * .1)); ctx.lineTo(tx + R * .08, ty); ctx.fill(); } // the blade teeth
  }
  ctx.restore();
}
// The little chomping puddles.
function drawChompers(ctx, e, s, now) {
  for (const q of e.stalkChompers || []) { const cx = (q.x + .5) * s, cy = (q.y + .82) * s, r = .32 * s, fade = Math.min(1, q.life / .6), bite = q.state === "bite" ? 1 : q.state === "warn" ? .4 + .4 * Math.sin(now / 50) : .15;
    ctx.save(); ctx.globalAlpha = fade;
    if (q.state === "warn" && q.at) { ctx.fillStyle = MARK_FILL; ctx.strokeStyle = MARK_EDGE; ctx.lineWidth = Math.max(1.5, s * .04); ellipse(ctx, (q.at.x + .5) * s, (q.at.y + .82) * s, STALKER.pool.split.radius * s, STALKER.pool.split.radius * s * .55); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "rgba(196,210,226,.92)"; ellipse(ctx, cx, cy, r, r * .4); ctx.fill(); ctx.fillStyle = "#ffffff"; ellipse(ctx, cx - r * .3, cy - r * .1, r * .25, r * .08); ctx.fill();
    ctx.fillStyle = "#2a3140"; ctx.beginPath(); ctx.ellipse(cx, cy - r * .05, r * .45, r * .3 * bite + 1, 0, 0, Math.PI * 2); ctx.fill(); // the little mouth
    ctx.fillStyle = "#eef4fb"; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * r * .18 - r * .06, cy - r * .05 - r * .3 * bite); ctx.lineTo(cx + i * r * .18, cy - r * .05); ctx.lineTo(cx + i * r * .18 + r * .06, cy - r * .05 - r * .3 * bite); ctx.fill(); }
    ctx.restore(); }
}
// The tide: each wave a crescent of liquid silver bulging toward its course, a bright foam lip at the front, a fading wake behind.
function drawWaves(ctx, e, s, now) {
  for (const q of e.stalkWaves || []) { if (q.delay > 0 || q.d >= STALKER.cat.tide.length) continue;
    const fx = Math.cos(q.aim), fy = Math.sin(q.aim), px = -fy, py = fx, half = q.width / 2 * s, cx = (q.ox + .5 + fx * q.d) * s, cy = (q.oy + .75 + fy * q.d) * s, bulge = (.35 + q.n * .1) * s, depth = (.5 + q.n * .12) * s;
    const P = (o, f) => ({ x: cx + px * o + fx * f, y: cy + py * o + fy * f });
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    // the wake
    const w0 = P(-half, -depth * 2.2), w1 = P(half, -depth * 2.2), wm = P(0, -depth * 1.4); ctx.fillStyle = "rgba(200,214,232,.18)"; ctx.beginPath(); ctx.moveTo(w0.x, w0.y); ctx.quadraticCurveTo(wm.x, wm.y, w1.x, w1.y); const f1 = P(half, 0), fm = P(0, bulge), f0 = P(-half, 0); ctx.lineTo(f1.x, f1.y); ctx.quadraticCurveTo(fm.x, fm.y, f0.x, f0.y); ctx.closePath(); ctx.fill();
    // the body of the wave
    const b0 = P(-half * .92, -depth), b1 = P(half * .92, -depth), bm = P(0, -depth + bulge * .5); ctx.fillStyle = "rgba(196,210,228,.82)"; ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.quadraticCurveTo(fm.x, fm.y, f1.x, f1.y); ctx.lineTo(b1.x, b1.y); ctx.quadraticCurveTo(bm.x, bm.y, b0.x, b0.y); ctx.closePath(); ctx.fill();
    // the foam lip and the curl
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.quadraticCurveTo(fm.x, fm.y, f1.x, f1.y); ctx.stroke();
    ctx.strokeStyle = "rgba(160,235,255,.6)"; ctx.lineWidth = Math.max(1, s * .035); const c0 = P(-half * .8, -depth * .45), c1 = P(half * .8, -depth * .45), cm = P(0, -depth * .45 + bulge * .7); ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.quadraticCurveTo(cm.x, cm.y, c1.x, c1.y); ctx.stroke();
    ctx.fillStyle = "#ffffff"; for (let k = 0; k < 7; k++) { const o = -half + 2 * half * (k + .5) / 7, f = bulge * (1 - (o / half) ** 2) + Math.sin(now / 90 + k * 1.7) * .06 * s, d = P(o, f + .05 * s); ellipse(ctx, d.x, d.y, .05 * s, .05 * s); ctx.fill(); } // foam
    ctx.restore(); }
}

// One Stalker, copy or decoy. Returns true (it drew itself).
export function drawStalker(ctx, e, s, now, reduceMotion = false) {
  const t = reduceMotion ? 0 : now / 1000, u = s * Math.max(.3, Number(e.scale) || STALKER.size), a = e.stalkAct || {};
  const x = (e.x + .5) * s, ground = (e.y + .9) * s, lift = (Number(e.stalkLift) || 0) * s, y = ground - lift, face = (e.facingX || 1) >= 0 ? 1 : -1;
  ctx.save();
  // Its afterimages fade where the blow fell.
  for (const g of e.stalkGhosts || []) { ctx.globalAlpha = Math.max(0, g.t / .6) * .45; const gx = (g.x + .5) * s, gy = (g.y + .9) * s; if (g.form === "ape") drawApe(ctx, gx, gy, u, face, t, false); else drawCat(ctx, gx, gy, u, face, t, false); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(0,0,0,${e.stalkLurk || e.stalkVeil > 0 || e.stalkMirage ? .03 : .28})`; ellipse(ctx, x, ground, .42 * u * (1 - Math.min(.5, lift / (3 * s))), .13 * u); ctx.fill(); // no shadow to give it away while it lurks
  if (e.stalkerDecoy) ctx.globalAlpha = Math.max(.15, Math.min(.7, (Number(e.stalkLife) || 0) / 1.5)) * (.75 + .25 * Math.sin(now / 70));
  else if (e.stalkerKin) ctx.globalAlpha = .92;
  // Hiding: at a distance, stalking, it all but fades into its own mist.
  const hide = e.stalkerKin || e.stalkerDecoy ? 0 : Math.max(0, Math.min(1, Number(e.stalkHide) || 0));
  if (hide > 0) ctx.globalAlpha *= 1 - .6 * hide;
  // Lying in wait it is all but invisible: a faint shimmer, still, if you look; springing, it fades in.
  if (e.stalkLurk) ctx.globalAlpha = STALKER.lurk.alpha * (1 + .5 * Math.sin(now / 400));
  else if (e.stalkReveal > 0) ctx.globalAlpha *= 1 - .9 * (e.stalkReveal / STALKER.lurk.reveal);
  // Veiled in its fog: nearly gone, a faint blue glow about it if you look (it fades out and back over a moment).
  const veil = Math.max(0, Math.min(1, (Number(e.stalkVeil) || 0) / .4));
  if (veil > 0) { ctx.save(); ctx.globalAlpha = .12 * veil * (.7 + .3 * Math.sin(now / 260)); const gl = ctx.createRadialGradient(x, y - .4 * u, 0, x, y - .4 * u, .9 * u); gl.addColorStop(0, "rgba(120,180,255,.6)"); gl.addColorStop(1, "rgba(120,180,255,0)"); ctx.fillStyle = gl; ellipse(ctx, x, y - .4 * u, .9 * u, .7 * u); ctx.fill(); ctx.restore();
    ctx.globalAlpha *= 1 - (1 - STALKER.fog.alpha) * veil; }
  // The mirage: all but invisible as it darts; healing in hiding, a red glow gives it away.
  if (e.stalkMirage) { if (e.stalkRegen) { ctx.save(); ctx.globalAlpha = .55 + .2 * Math.sin(now / 150); const rg = ctx.createRadialGradient(x, y - .4 * u, 0, x, y - .4 * u, u); rg.addColorStop(0, "rgba(255,70,70,.7)"); rg.addColorStop(1, "rgba(255,70,70,0)"); ctx.fillStyle = rg; ellipse(ctx, x, y - .4 * u, u, .8 * u); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = STALKER.mirage.alpha * (1 + .6 * Math.sin(now / 90)) * (e.stalkRegen ? 2 : 1); }
  const form = e.stalkForm || "cat";
  if (form === "mist") { const g = a.kind === "mistGather" ? 1 - Math.max(0, a.t) / (a.total || 1) : 1; if (g < 1) { ctx.globalAlpha = 1 - g; drawCat(ctx, x, y, u, face, t, false); ctx.globalAlpha = 1; } drawMist(ctx, x, y, u, t, g); }
  else if (form === "pool") { if (a.kind === "mouthWarn" || a.kind === "mouth") drawMouth(ctx, a.at, s, a.kind === "mouth" ? Math.max(0, a.t) / (a.total || 1) * .6 : 1 - Math.max(0, a.t) / (a.total || 1) * .7, now); else drawPool(ctx, x, y, u * (a.kind === "under" ? .8 : 1), t, a.kind === "rise" ? 1 - Math.max(0, a.t) / (a.total || 1) : 0); }
  else if (form === "ape") {
    const fists = e.stalkFists || [], k = a.kind, strike = e.stalkStrike;
    const pose = lift > 1 * s * .5 ? "fly" : (k === "wait" || k === "lurk" || e.stalkPerch && k === "prowl") && !fists.length ? "perch" : k === "charge" || k === "chargeWarn" ? "charge" : k === "fistWarn" || k === "slamWarn" && !fists.length ? "raise" : strike ? (strike.n === 2 ? "kick" : "punch") : k === "lasersWarn" ? "raise" : k === "lasers" ? "punch" : ["prowl", "spring", "comboWarn", "retract", "mirage"].includes(k) ? "walk" : "stand";
    drawApe(ctx, x, y, u, face, t, pose, fists.length);
    fists.forEach((f, i) => drawApeArm(ctx, { x: x + face * (APE_SHOULDER.x - (fists.length > 1 && i ? .06 : 0)) * u, y: y - APE_SHOULDER.y * u }, { x: (f.x + .5) * s, y: (f.y + .9) * s - (f.lift || 0) * s - .3 * u }, u));
  }
  else if (e.stalkClimb) drawCatClimb(ctx, x, y, u, face, t);
  else if (a.kind === "tide") { /* it is the first wave (drawWaves) */ }
  else if ((a.kind === "prowl" || a.kind === "lurk" || a.kind === "wait") && e.stalkPerch) drawCat(ctx, x, y, u, face, t, false, "perch");
  else if (a.kind === "wait" || a.kind === "lurk") drawCatSit(ctx, x, y, u, face, t);
  else if (a.kind === "mirage") drawCat(ctx, x, y, u, face, t * 1.6, true, e.stalkSlash ? "swipe" : "leap");
  else if (a.kind === "flurry") drawCat(ctx, x, y, u, face, t, false, (e.stalkSlash?.n || 0) % 2 ? "swipe" : "crouch");
  else if (e.stalkCreep && a.kind === "prowl") drawCat(ctx, x, y, u, face, t * .55, true, "stalk");
  else drawCat(ctx, x, y, u, face, t, !["wait", "swipeWarn", "pounceWarn"].includes(a.kind), a.kind === "pounceWarn" ? "crouch" : a.kind === "pounce" || a.kind === "hop" ? "leap" : a.kind === "swipeWarn" ? "swipe" : null);
  if (!e.stalkerKin && !e.stalkerDecoy) { drawBlades(ctx, e, s, x, y, u, face); drawLimb(ctx, e, s, x, y, u, face, now); drawErupts(ctx, e, s, now); ctx.save(); ctx.globalAlpha = 1; drawChompers(ctx, e, s, now); drawWaves(ctx, e, s, now); ctx.restore(); }
  if (e.stalkSlash) { const k = e.stalkSlash.t / .14, ag = e.stalkSlash.aim, r = STALKER.cat.flurry.reach * s, cx = x + Math.cos(ag) * .3 * s, cy = y - .35 * u + Math.sin(ag) * .3 * s, tilt = e.stalkSlash.n % 2 ? .6 : -.6; // the flurry's claw marks in the air
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = "#eef6ff"; ctx.lineCap = "round"; for (let i = -1; i <= 1; i++) { ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.arc(cx + i * .08 * s * Math.cos(ag + tilt), cy + i * .08 * s * Math.sin(ag + tilt), r * .6, ag - .7 + tilt * .3, ag + .7 + tilt * .3); ctx.stroke(); } ctx.restore(); }
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
    else if (q.kind === "boomer") { const r = q.radius * s * 1.6, sp = q.spin || 0; for (const k of [0, 1]) { const b = sp + k * Math.PI; drawBlade(ctx, qx, qy, b, r, .12 * s); } ctx.fillStyle = "#8c96a6"; ellipse(ctx, qx, qy, .08 * s, .08 * s); ctx.fill(); }
    else if (q.kind === "laser") { const tx = qx - Math.cos(q.aim) * q.len * s, ty = qy - Math.sin(q.aim) * q.len * s; ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgba(120,200,255,.45)"; ctx.lineWidth = Math.max(4, s * .28); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(qx, qy); ctx.stroke(); ctx.strokeStyle = "#e9f8ff"; ctx.lineWidth = Math.max(2, s * .1); ctx.stroke(); ctx.restore(); }
    else if (q.kind === "blast") { const r = q.radius * s; ctx.fillStyle = "rgba(140,230,255,.35)"; ellipse(ctx, qx - q.vx * .03 * s, qy - q.vy * .03 * s, r * 1.6, r * 1.6); ctx.fill(); ctx.fillStyle = "#c9f6ff"; ellipse(ctx, qx, qy, r, r); ctx.fill(); ctx.fillStyle = "#ffffff"; ellipse(ctx, qx, qy, r * .45, r * .45); ctx.fill(); }
    else { const r = q.radius * s; ctx.fillStyle = q.kind === "sphere" ? "rgba(120,220,255,.45)" : "rgba(190,240,255,.85)"; ellipse(ctx, qx, qy, r, r); ctx.fill(); ctx.fillStyle = "#ffffff"; ellipse(ctx, qx, qy, r * .45, r * .45); ctx.fill(); } }
  if (hide > .05 && form !== "mist" && form !== "pool" && !e.stalkLurk && !(e.stalkVeil > 0) && !e.stalkMirage) { ctx.save(); ctx.globalAlpha = 1; catMist(ctx, (dx) => x + face * dx * u, y - .3 * u, x, y, u * 1.15, t, hide * 1.4); ctx.restore(); }
  if (e.hitFlash > 0) { ctx.globalAlpha = .5; ctx.fillStyle = "#ffffff"; ellipse(ctx, x, y - .4 * u, .45 * u, .35 * u); ctx.fill(); }
  ctx.restore();
  if (e.stalker && !e.stalkerKin && !e.stalkLurk && !(e.stalkVeil > 0) && !e.stalkMirage) { ctx.save(); ctx.font = `bold ${Math.max(10, s * .3)}px serif`; ctx.textAlign = "center"; ctx.fillStyle = SILVER; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3; const ty = y - 1.15 * u; ctx.strokeText("The Stalker", x, ty); ctx.fillText("The Stalker", x, ty); ctx.restore(); }
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
  const TM = e.stalkTurret, A = STALKER.arms, ex = (e.x + .5) * s, ey = (e.y + .5) * s;
  if (TM?.move === "sword") { const L = STALKER.limb.sword; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.arc(ex, ey, L.reach * s, TM.aim - L.arc, TM.aim + L.arc); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (TM?.move === "spikes") { ctx.save(); ctx.lineWidth = STALKER.limb.spikes.width * 2 * s; ctx.strokeStyle = MARK_FILL; for (const q of spikeLines(e, TM.aim)) { ctx.beginPath(); ctx.moveTo((q.from.x + .5) * s, (q.from.y + .5) * s); ctx.lineTo((q.to.x + .5) * s, (q.to.y + .5) * s); ctx.stroke(); } ctx.restore(); }
  if (a.kind === "grabWarn") { ctx.save(); ctx.lineWidth = .5 * s; ctx.strokeStyle = MARK_FILL.replace(".18", ".3"); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a.aim) * A.grab.reach * s, ey + Math.sin(a.aim) * A.grab.reach * s); ctx.stroke(); ctx.restore(); }
  if (a.kind === "chargeWarn") { ctx.save(); ctx.lineWidth = 1.1 * s; ctx.strokeStyle = MARK_FILL.replace(".18", ".26"); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a.aim) * A.charge.speed * A.charge.time * s, ey + Math.sin(a.aim) * A.charge.speed * A.charge.time * s); ctx.stroke(); ctx.restore(); }
  if (a.kind === "slamWarn" && a.at) { ellipse(ctx, (a.at.x + .5) * s, (a.at.y + .82) * s, A.slam.radius * s, A.slam.radius * s * .55); ctx.fill(); ctx.stroke(); }
  if (a.kind === "sweepWarn") { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.arc(ex, ey, A.sweep.reach * s, a.aim - A.sweep.arc, a.aim + A.sweep.arc); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (a.kind === "spinWarn") { ellipse(ctx, ex, ey + .3 * s, A.spin.reach * s, A.spin.reach * s * .6); ctx.fill(); ctx.stroke(); }
  if (a.kind === "comboWarn") { const r = (a.n === 2 ? A.combo.kick : A.combo.reach) * s; ellipse(ctx, ex, ey + .3 * s, r, r * .55); ctx.fill(); ctx.stroke(); }
  if (a.kind === "lasersWarn") { ctx.save(); ctx.strokeStyle = MARK_FILL.replace(".18", ".35"); ctx.lineWidth = Math.max(2, .3 * s); for (const deg of STALKER.arms.lasers.fan) { const g2 = a.aim + deg * Math.PI / 180; ctx.beginPath(); ctx.moveTo(ex, ey - .5 * s); ctx.lineTo(ex + Math.cos(g2) * 9 * s, ey - .5 * s + Math.sin(g2) * 9 * s); ctx.stroke(); } ctx.restore(); }
  if (a.kind === "flurryWarn") { const R = STALKER.cat.flurry; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.arc(ex, ey, (R.reach + R.lunge * 2) * s, a.aim - .8, a.aim + .8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (a.kind === "tideWarn") { const T = STALKER.cat.tide; ctx.save(); for (const wd of T.widths) { ctx.lineWidth = wd * s; ctx.strokeStyle = "rgba(255,80,190,.1)"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a.aim) * T.length * s, ey + Math.sin(a.aim) * T.length * s); ctx.stroke(); } ctx.restore(); }
  if (a.kind === "mouthWarn" && a.at) { const R = STALKER.pool.under.radius; ellipse(ctx, (a.at.x + .5) * s, (a.at.y + .82) * s, R * s, R * s * .55); ctx.fill(); ctx.stroke(); }
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

