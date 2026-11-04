// Release 737: the Wayfarer's mount, drawn with the beast's own renderer at its real size (MOUNT_BEASTS.scale), a saddle, harness
// or riding frame on its back (MOUNT_BEASTS.saddle), and the Wayfarer drawn last, on top, so even the biggest never hides them.
// The pack beasts reuse monster-render's cached sprites (one per mount id); the Stalker is drawn as its cat; each saddle is painted
// once into a small cached canvas per style, size and facing.
import { MOUNT_BEASTS } from "./beast-mounts.ts";
import { drawPackMonster } from "./monster-render.ts";
import { drawStalker } from "./stalker-render.ts";

// One reused actor per frame (no per-frame allocation beyond it).
const actor = { id: "", kind: "", packKind: "", x: 0, y: 0, scale: 1, facingX: 1, boss: false, hopLift: 0, stalkForm: "cat", stalkAct: { kind: "prowl", t: 0, total: 0 }, pack: null, mountView: true };
// Draws the mount of `m` under the Wayfarer at `p` (raised `liftPx` by a jump). Returns how far up the Wayfarer sits, in pixels.
export function drawMount(ctx, m, p, s, now, liftPx = 0, reduceMotion = false) {
  const B = MOUNT_BEASTS[m?.beast]; if (!B) return 0;
  const moving = (p.walkPhase || 0) % 2, face = p.facing === "left" ? -1 : p.facing === "right" ? 1 : (p.mountFace || 1); p.mountFace = face;
  Object.assign(actor, { id: `mount:${m.id}`, kind: m.beast, packKind: m.beast, x: p.x, y: p.y - liftPx / s, scale: B.scale, facingX: face, hopLift: reduceMotion ? 0 : Math.abs(Math.sin(moving * Math.PI)) * .5 });
  try {
    if (m.beast === "stalker") drawStalker(ctx, actor, s, now, reduceMotion);
    else drawPackMonster(ctx, actor, s, now, p.facing);
  } catch { /* a renderer that needs fight state it does not have draws nothing; the rider still shows */ }
  const seat = B.seat * s;
  drawSaddle(ctx, B.saddle, (p.x + .5) * s, (p.y + .8) * s - liftPx - seat, s * Math.max(.8, Math.min(1.6, B.scale * .5)), seat, face);
  return seat;
}

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
