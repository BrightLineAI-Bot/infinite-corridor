// Release 678: drawing the Stalker (stalker.ts): the six-legged snow leopard, the winged silverback, the silver pool, its
// afterimages, its copies and decoys, the marks before each blow, and the silver marker at the screen edge while it hunts.
// Plain canvas paths, no sprites or gradients per frame beyond one shadow, so it stays cheap on a phone.
import { STALKER } from "./stalker.js?v=r683-4f02e723b08a";

const FUR = "#f1f3f6", SHADE = "#b9c0cc", SPOT = "#7d8594", SILVER = "#d8e2ee", WING = "#3a2f44", WING_EDGE = "#c9d4e4";
const MARK_FILL = "rgba(255,80,190,.18)", MARK_EDGE = "rgba(255,130,210,.78)";

function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }

function drawCat(ctx, x, y, u, face, t, moving) {
  // A six-legged snow leopard: long, low and heavy-shouldered, thick legs on big paws, a smoky-white coat with open rosettes,
  // a broad short-muzzled head with small rounded ears, and the very long, thick tail carried low and curling up at the tip.
  const gait = moving ? t * 9 : 0, sway = Math.sin(t * 2.2) * .04 * u, bob = moving ? Math.abs(Math.sin(gait)) * .02 * u : 0, by = y - bob;
  // The tail first, behind everything: as thick as a forearm, as long as the body.
  ctx.lineCap = "round"; ctx.strokeStyle = SHADE; ctx.lineWidth = Math.max(3, u * .15);
  const tx0 = x - face * .5 * u, ty0 = by - .36 * u, tail = [[tx0, ty0], [x - face * .95 * u, by - .2 * u + sway], [x - face * 1.18 * u, by - .5 * u - sway]];
  const tailPath = () => { ctx.beginPath(); ctx.moveTo(tail[0][0], tail[0][1]); ctx.quadraticCurveTo(tail[1][0], tail[1][1], tail[2][0], tail[2][1]); };
  tailPath(); ctx.stroke(); ctx.strokeStyle = FUR; ctx.lineWidth = Math.max(2, u * .12); tailPath(); ctx.stroke();
  ctx.strokeStyle = SPOT; ctx.lineWidth = Math.max(1, u * .025); for (const k of [.35, .6, .82]) { const qx = (1 - k) * (1 - k) * tail[0][0] + 2 * k * (1 - k) * tail[1][0] + k * k * tail[2][0], qy = (1 - k) * (1 - k) * tail[0][1] + 2 * k * (1 - k) * tail[1][1] + k * k * tail[2][1]; ctx.beginPath(); ctx.arc(qx, qy, .045 * u, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = "#4b5260"; ellipse(ctx, tail[2][0], tail[2][1], .06 * u, .06 * u); ctx.fill(); // the dark tail tip
  // Six thick legs in three pairs, far pair shaded; big round paws.
  for (const side of [1, 0]) for (let i = 0; i < 3; i++) {
    const lx = x + face * (-.36 + i * .3) * u, ph = Math.sin(gait + i * 2.1 + side * Math.PI) * .1 * u, top = by - .26 * u, foot = { x: lx + ph * face, y: y - .03 * u };
    ctx.strokeStyle = side ? "#9aa2b0" : SHADE; ctx.lineWidth = Math.max(2, u * .1); ctx.beginPath(); ctx.moveTo(lx, top); ctx.quadraticCurveTo(lx + ph * .4 * face - face * .03 * u, by - .12 * u, foot.x, foot.y); ctx.stroke();
    ctx.fillStyle = side ? "#aab2bf" : FUR; ellipse(ctx, foot.x + face * .03 * u, foot.y, .065 * u, .04 * u); ctx.fill();
  }
  // The body: deep chest and shoulders forward, a long back, a pale belly.
  ctx.fillStyle = "#e6e9ee"; ctx.beginPath(); ctx.moveTo(x - face * .52 * u, by - .3 * u);
  ctx.bezierCurveTo(x - face * .5 * u, by - .52 * u, x + face * .18 * u, by - .5 * u, x + face * .36 * u, by - .5 * u);
  ctx.bezierCurveTo(x + face * .5 * u, by - .48 * u, x + face * .5 * u, by - .2 * u, x + face * .3 * u, by - .17 * u);
  ctx.bezierCurveTo(x, by - .14 * u, x - face * .3 * u, by - .16 * u, x - face * .52 * u, by - .3 * u); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f7f8fa"; ellipse(ctx, x + face * .05 * u, by - .2 * u, .32 * u, .05 * u); ctx.fill();
  ctx.fillStyle = "rgba(150,160,175,.35)"; ellipse(ctx, x - face * .02 * u, by - .44 * u, .42 * u, .05 * u); ctx.fill(); // smoky back
  // Open rosettes (rings, broken), small spots on the shoulder.
  ctx.strokeStyle = SPOT; ctx.lineWidth = Math.max(1, u * .022);
  for (const [dx, dy, r] of [[-.36, -.36, .05], [-.2, -.42, .055], [-.04, -.36, .05], [.12, -.42, .045], [-.28, -.25, .04], [-.1, -.26, .045], [.05, -.27, .04]]) { ctx.beginPath(); ctx.arc(x + face * dx * u, by + dy * u, r * u, .4, Math.PI * 1.7); ctx.stroke(); }
  ctx.fillStyle = SPOT; for (const [dx, dy] of [[.26, -.4], [.32, -.33], [.22, -.3]]) { ellipse(ctx, x + face * dx * u, by + dy * u, .018 * u, .018 * u); ctx.fill(); }
  // The head: broad, short muzzle, small rounded ears set wide, pale eyes.
  const hx = x + face * .52 * u, hy = by - .5 * u;
  ctx.fillStyle = "#e6e9ee"; for (const k of [-1, 1]) { ellipse(ctx, hx - face * .04 * u + k * .07 * u, hy - .11 * u, .045 * u, .04 * u); ctx.fill(); }
  ctx.fillStyle = "#4b5260"; for (const k of [-1, 1]) { ellipse(ctx, hx - face * .04 * u + k * .07 * u, hy - .11 * u, .022 * u, .02 * u); ctx.fill(); }
  ctx.fillStyle = FUR; ellipse(ctx, hx, hy, .15 * u, .12 * u); ctx.fill();
  ctx.fillStyle = "#f7f8fa"; ellipse(ctx, hx + face * .09 * u, hy + .04 * u, .07 * u, .05 * u); ctx.fill(); // the muzzle
  ctx.fillStyle = "#8a6f74"; ellipse(ctx, hx + face * .14 * u, hy + .02 * u, .02 * u, .014 * u); ctx.fill(); // the nose
  ctx.fillStyle = SPOT; for (const [dx, dy] of [[-.06, -.05], [-.02, -.07], [-.08, .01]]) { ellipse(ctx, hx + face * dx * u, hy + dy * u, .012 * u, .012 * u); ctx.fill(); }
  ctx.fillStyle = "#9fe8ff"; ellipse(ctx, hx + face * .06 * u, hy - .025 * u, .024 * u, .016 * u); ctx.fill();
  ctx.fillStyle = "#1b2430"; ellipse(ctx, hx + face * .065 * u, hy - .025 * u, .007 * u, .013 * u); ctx.fill();
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
  if (form === "pool") drawPool(ctx, x, y, u, t, a.kind === "rise" ? 1 - Math.max(0, a.t) / (a.total || 1) : 0);
  else if (form === "ape") drawApe(ctx, x, y, u, face, t, lift > 1);
  else if (e.stalkClimb) { // claws in: the body upright against the bark or stone, legs scrabbling
    ctx.save(); ctx.translate(x, y - .35 * u); ctx.rotate(-face * Math.PI * .42); drawCat(ctx, 0, .35 * u, u, face, t * 1.8, true); ctx.restore();
    ctx.strokeStyle = "rgba(230,236,244,.55)"; ctx.lineWidth = Math.max(1, u * .02); for (let i = 0; i < 3; i++) { const cy = y - (.2 + i * .14) * u; ctx.beginPath(); ctx.moveTo(x - .08 * u + i * .05 * u, cy); ctx.lineTo(x - .02 * u + i * .05 * u, cy + .1 * u); ctx.stroke(); }
  }
  else drawCat(ctx, x, y, u, face, t, a.kind !== "wait" && a.kind !== "swipeWarn");
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
    if (q.kind === "xblade") { const r = q.radius * s, sp = q.spin || 0; ctx.strokeStyle = "#eef4fb"; ctx.lineWidth = Math.max(3, s * .1); ctx.lineCap = "round"; ctx.beginPath(); for (const k of [0, 1]) { const b = sp + k * Math.PI / 2 + Math.PI / 4; ctx.moveTo(qx - Math.cos(b) * r, qy - Math.sin(b) * r); ctx.lineTo(qx + Math.cos(b) * r, qy + Math.sin(b) * r); } ctx.stroke(); ctx.strokeStyle = "rgba(150,235,255,.6)"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke(); }
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
