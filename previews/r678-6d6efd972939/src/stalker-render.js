// Release r678-6d6efd972939: drawing the Stalker (stalker.ts): the six-legged snow leopard, the winged silverback, the silver pool, its
// afterimages, its copies and decoys, the marks before each blow, and the silver marker at the screen edge while it hunts.
// Plain canvas paths, no sprites or gradients per frame beyond one shadow, so it stays cheap on a phone.
import { STALKER } from "./stalker.js?v=r678-6d6efd972939";

const FUR = "#f1f3f6", SHADE = "#b9c0cc", SPOT = "#7d8594", SILVER = "#d8e2ee", WING = "#3a2f44", WING_EDGE = "#c9d4e4";
const MARK_FILL = "rgba(255,80,190,.18)", MARK_EDGE = "rgba(255,130,210,.78)";

function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }

function drawCat(ctx, x, y, u, face, t, moving) {
  // Six legs in three pairs, a long low body, a heavy curled tail.
  const gait = moving ? t * 11 : 0;
  ctx.strokeStyle = SHADE; ctx.lineWidth = Math.max(1.5, u * .07); ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) for (const side of [0, 1]) {
    const lx = x + face * (-.28 + i * .26) * u, ph = Math.sin(gait + i * 2.1 + side * Math.PI) * .09 * u;
    ctx.beginPath(); ctx.moveTo(lx, y - .2 * u); ctx.lineTo(lx + ph + (side ? .03 : -.03) * u, y - .02 * u); ctx.stroke();
  }
  ctx.fillStyle = FUR; ellipse(ctx, x, y - .3 * u, .42 * u, .17 * u); ctx.fill();
  ctx.strokeStyle = FUR; ctx.lineWidth = Math.max(2, u * .1); ctx.beginPath(); ctx.moveTo(x - face * .4 * u, y - .32 * u);
  ctx.quadraticCurveTo(x - face * .72 * u, y - .55 * u + Math.sin(t * 3) * .05 * u, x - face * .6 * u, y - .72 * u); ctx.stroke();
  ctx.fillStyle = SPOT; for (const [dx, dy] of [[-.2, -.34], [0, -.38], [.16, -.3], [-.06, -.26], [-.3, -.28]]) { ellipse(ctx, x + face * dx * u, y + dy * u, .035 * u, .028 * u); ctx.fill(); }
  ctx.fillStyle = FUR; ellipse(ctx, x + face * .44 * u, y - .4 * u, .15 * u, .13 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + face * .38 * u, y - .5 * u); ctx.lineTo(x + face * .42 * u, y - .6 * u); ctx.lineTo(x + face * .47 * u, y - .51 * u); ctx.fill();
  ctx.fillStyle = "#9fe8ff"; ellipse(ctx, x + face * .5 * u, y - .42 * u, .025 * u, .02 * u); ctx.fill();
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
  else drawCat(ctx, x, y, u, face, t, a.kind !== "wait" && a.kind !== "swipeWarn");
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
