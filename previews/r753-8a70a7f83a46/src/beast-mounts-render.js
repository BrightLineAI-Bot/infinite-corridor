// Release 748: the Wayfarer's mount, drawn with the beast's own renderer at its real size (MOUNT_BEASTS.scale), a saddle, harness
// or riding frame on its back (MOUNT_BEASTS.saddle), and the Wayfarer drawn last, on top, so even the biggest never hides them.
// The pack beasts reuse monster-render's cached sprites (one per mount id); the Stalker is drawn as its cat; each saddle is painted
// once into a small cached canvas per style, size and facing.
import { MOUNT_BEASTS } from "./beast-mounts.js?v=r753-8a70a7f83a46";
import { drawPackMonster } from "./monster-render.js?v=r753-8a70a7f83a46";
import { drawStalker } from "./stalker-render.js?v=r753-8a70a7f83a46";

// One reused actor per frame (no per-frame allocation beyond it).
const actor = { id: "", kind: "", packKind: "", x: 0, y: 0, scale: 1, facingX: 1, boss: false, hopLift: 0, stalkForm: "cat", stalkAct: { kind: "prowl", t: 0, total: 0 }, pack: null, mountView: true };
const seatOut = { up: 0, dx: 0 }, front = { style: null, x: 0, y: 0, u: 0, drop: 0, face: 1 };
// Draws the mount of `m` under the Wayfarer at `p` (raised `liftPx` by a jump). Returns where the Wayfarer sits: { up, dx } in pixels
// (up from their feet; along the screen, + right). drawMountFront, after the rider, adds anything that goes in front of them.
export function drawMount(ctx, m, p, s, now, liftPx = 0, reduceMotion = false) {
  const B = MOUNT_BEASTS[m?.beast]; front.style = null; if (!B) { seatOut.up = 0; seatOut.dx = 0; return seatOut; }
  const moving = (p.walkPhase || 0) % 2, face = p.facing === "left" ? -1 : p.facing === "right" ? 1 : (p.mountFace || 1); p.mountFace = face;
  Object.assign(actor, { id: `mount:${m.id}`, kind: m.beast, packKind: m.beast, x: p.x, y: p.y - liftPx / s, scale: B.scale, facingX: face, hopLift: reduceMotion ? 0 : Math.abs(Math.sin(moving * Math.PI)) * .5 });
  try {
    if (m.beast === "stalker") drawStalker(ctx, actor, s, now, reduceMotion);
    else drawPackMonster(ctx, actor, s, now, p.facing);
  } catch { /* a renderer that needs fight state it does not have draws nothing; the rider still shows */ }
  const bob = reduceMotion ? 0 : (Number(B.bob) || 0) * Math.sin(now / 420) * s, seat = B.seat * s + bob, dx = (Number(B.seatX) || 0) * face * s;
  const u = s * Math.max(.8, Math.min(1.6, B.scale * .5)), sx = (p.x + .5) * s + dx, sy = (p.y + .8) * s - liftPx - seat;
  if (B.saddle === "girth") { drawSaddle(ctx, "girth", sx + (Number(B.bandX) || 0) * face * s, sy, (Number(B.band) || 1.4) * s / 1.6, B.seat * s, face); drawSaddle(ctx, "girthSeat", sx, sy, u, B.seat * s, face); } // the band round the body's axis; the seat on its back
  else drawSaddle(ctx, B.saddle, sx, sy, B.saddle === "bowl" ? u * 1.35 : u, B.seat * s, face); // the drop without the bob: one cached image
  if (B.saddle === "bowl") Object.assign(front, { style: "bowlFront", x: sx, y: sy, u: u * 1.35, drop: B.seat * s, face });
  seatOut.up = seat; seatOut.dx = dx; return seatOut;
}
export function drawMountFront(ctx) { if (front.style) drawSaddle(ctx, front.style, front.x, front.y, front.u, front.drop, front.face); front.style = null; }

// ---- Saddles (original designs; visual only) ----
const SADDLE_CACHE = new Map(), SADDLE_CACHE_MAX = 24;
const makeCanvas = (w, h) => { try { if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(w, h); if (typeof document !== "undefined") { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; } } catch { /* none */ } return null; };
// The saddle's seat sits at (x, y), `u` pixels to a unit, its straps hanging `drop` pixels down the beast's side.
export function drawSaddle(ctx, style, x, y, u, drop, face = 1) {
  if (!style) return;
  const W = Math.ceil(u * 2.2), H = Math.ceil(u * .6 + Math.min(drop, u * 2.4) + 4), key = `${style}|${W}|${H}|${face}`;
  let sp = SADDLE_CACHE.get(key);
  if (!sp && typeof ctx.drawImage === "function") {
    const c = makeCanvas(W, H), g = c?.getContext?.("2d");
    if (g) { paintSaddle(g, style, W / 2, u * .32, u, Math.min(drop, u * 2.4), face); if (SADDLE_CACHE.size >= SADDLE_CACHE_MAX) SADDLE_CACHE.delete(SADDLE_CACHE.keys().next().value); SADDLE_CACHE.set(key, (sp = c)); }
  }
  if (sp) ctx.drawImage(sp, x - W / 2, y - u * .32);
  else { ctx.save(); paintSaddle(ctx, style, x, y, u, Math.min(drop, u * 2.4), face); ctx.restore(); }
}
function strap(g, x1, y1, x2, y2, w, color) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function paintSaddle(g, style, x, y, u, drop, face) {
  const leather = "#6b3f22", dark = "#3a2112", brass = "#c9a05a", cloth = "#7a2830", iron = "#4a4f57";
  g.lineCap = "round"; g.lineJoin = "round";
  if (style === "strap") { // a saddle cloth, a high-cantled leather seat, a girth under the belly and a stirrup on each side
    g.fillStyle = cloth; g.beginPath(); g.ellipse(x, y + u * .1, u * .62, u * .2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = brass; g.fillRect(x - u * .58, y + u * .2, u * 1.16, u * .04);
    strap(g, x - u * .2, y + u * .12, x - u * .26, y + drop * .9, u * .07, dark); strap(g, x + u * .2, y + u * .12, x + u * .26, y + drop * .9, u * .07, dark); // the girth
    for (const sx of [-1, 1]) { const fx = x + sx * u * .34; strap(g, fx, y + u * .1, fx, y + drop * .55, u * .04, dark); g.strokeStyle = brass; g.lineWidth = u * .05; g.beginPath(); g.ellipse(fx, y + drop * .55 + u * .06, u * .08, u * .06, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = leather; g.beginPath(); g.moveTo(x - u * .42, y + u * .06); g.quadraticCurveTo(x, y + u * .22, x + u * .42, y + u * .06); g.lineTo(x + u * .36 * face, y - u * .12); g.quadraticCurveTo(x, y, x - u * .36 * face, y - u * .2); g.closePath(); g.fill();
    g.strokeStyle = dark; g.lineWidth = u * .03; g.stroke();
    g.fillStyle = brass; g.beginPath(); g.arc(x + u * .38 * face, y - u * .1, u * .05, 0, Math.PI * 2); g.fill(); // the pommel knob
    return;
  }
  if (style === "bowl" || style === "bowlFront") { // a shallow cup of riveted copper the rider sits in; its near rim is drawn over them
    const rim = (a0, a1) => { g.beginPath(); g.ellipse(x, y + u * .02, u * .5, u * .16, 0, a0, a1); g.stroke(); };
    if (style === "bowl") { g.fillStyle = "#8a5a2e"; g.beginPath(); g.ellipse(x, y + u * .02, u * .5, u * .16, 0, Math.PI, Math.PI * 2); g.fill(); g.strokeStyle = "#e0a868"; g.lineWidth = u * .05; rim(Math.PI, Math.PI * 2); return; }
    g.fillStyle = "#a8683a"; g.beginPath(); g.moveTo(x - u * .5, y + u * .02); g.quadraticCurveTo(x, y + u * .5, x + u * .5, y + u * .02); g.ellipse(x, y + u * .02, u * .5, u * .16, 0, 0, Math.PI); g.closePath(); g.fill();
    g.strokeStyle = "#5a3418"; g.lineWidth = u * .03; g.beginPath(); g.moveTo(x - u * .5, y + u * .02); g.quadraticCurveTo(x, y + u * .5, x + u * .5, y + u * .02); g.stroke();
    g.strokeStyle = "#e0a868"; g.lineWidth = u * .06; rim(0, Math.PI);
    g.fillStyle = "#f1d39a"; for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; g.beginPath(); g.arc(x + Math.cos(a) * u * .5, y + u * .02 + Math.sin(a) * u * .16, u * .025, 0, Math.PI * 2); g.fill(); } // rivets
    return;
  }
  if (style === "girth") { // a broad band right round the body (its far side faint behind it); "girthSeat", the padded seat above it
    const r = u * .8; g.lineWidth = u * .16;
    g.strokeStyle = "rgba(58,33,18,.55)"; g.beginPath(); g.ellipse(x, y + u * .3, r, r * .28, 0, Math.PI, Math.PI * 2); g.stroke(); // the far side
    g.strokeStyle = "#5a361c"; g.beginPath(); g.ellipse(x, y + u * .3, r, r * .28, 0, 0, Math.PI); g.stroke(); // the near side
    g.strokeStyle = "#c9a05a"; g.lineWidth = u * .04; g.beginPath(); g.ellipse(x, y + u * .3, r, r * .28, 0, .15, Math.PI - .15); g.stroke(); // a brass stitch line
    g.fillStyle = "#c9a05a"; g.fillRect(x - u * .06, y + u * .3 + r * .22, u * .12, u * .14); // the buckle
    return;
  }
  if (style === "girthSeat") {
    g.fillStyle = leather; g.beginPath(); g.ellipse(x, y + u * .06, u * .36, u * .13, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = dark; g.lineWidth = u * .03; g.stroke();
    strap(g, x - u * .25 * face, y + u * .04, x - u * .32 * face, y - u * .2, u * .05, iron); // a cantle bar
    return;
  }
  if (style === "harness") { // a seat frame on a padded board, lashed round the body with broad bands and brass rings
    for (const sx of [-.45, .45]) { strap(g, x + sx * u, y + u * .12, x + sx * u * 1.2, y + drop, u * .1, dark); g.strokeStyle = brass; g.lineWidth = u * .04; g.beginPath(); g.arc(x + sx * u * 1.1, y + drop * .5, u * .07, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "#8a6a44"; g.fillRect(x - u * .6, y + u * .02, u * 1.2, u * .16); g.strokeStyle = dark; g.lineWidth = u * .03; g.strokeRect(x - u * .6, y + u * .02, u * 1.2, u * .16);
    g.fillStyle = leather; g.beginPath(); g.ellipse(x, y + u * .02, u * .34, u * .1, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = iron; g.lineWidth = u * .05; g.beginPath(); g.moveTo(x - u * .3 * face, y); g.lineTo(x - u * .34 * face, y - u * .26); g.lineTo(x - u * .1 * face, y - u * .3); g.stroke(); // the backrest frame
    strap(g, x + u * .3 * face, y, x + u * .42 * face, y - u * .2, u * .05, iron); // a grab bar
    return;
  }
  // "frame": a riding frame of iron struts braced across the shoulders, a slung seat and two chains down to the forelimbs
  g.strokeStyle = iron; g.lineWidth = u * .06;
  g.beginPath(); g.moveTo(x - u * .7, y + u * .14); g.lineTo(x + u * .7, y + u * .14); g.moveTo(x - u * .5, y + u * .14); g.lineTo(x - u * .2, y - u * .12); g.moveTo(x + u * .5, y + u * .14); g.lineTo(x + u * .2, y - u * .12); g.stroke();
  for (const sx of [-.62, .62]) { g.setLineDash([u * .08, u * .05]); strap(g, x + sx * u, y + u * .16, x + sx * u * 1.1, y + drop * .7, u * .04, "#9aa0a8"); g.setLineDash([]); }
  g.fillStyle = cloth; g.beginPath(); g.moveTo(x - u * .3, y - u * .06); g.quadraticCurveTo(x, y + u * .18, x + u * .3, y - u * .06); g.lineTo(x + u * .26, y + u * .06); g.quadraticCurveTo(x, y + u * .26, x - u * .26, y + u * .06); g.closePath(); g.fill();
  g.fillStyle = brass; for (const sx of [-.7, 0, .7]) { g.beginPath(); g.arc(x + sx * u, y + u * .14, u * .05, 0, Math.PI * 2); g.fill(); }
}
