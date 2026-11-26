// Release 748: the Wayfarer's mount, drawn with the beast's own renderer at its real size (MOUNT_BEASTS.scale), a saddle, harness
// or riding frame on its back (MOUNT_BEASTS.saddle), and the Wayfarer drawn last, on top, so even the biggest never hides them.
// The pack beasts reuse monster-render's cached sprites (one per mount id); the Stalker is drawn as its cat; each saddle is painted
// once into a small cached canvas per style, size and facing.
import { MOUNT_BEASTS } from "./beast-mounts.js?v=r1078-76cb280a770b";
import { drawPackMonster } from "./monster-render.js?v=r1078-76cb280a770b";
import { drawStalker } from "./stalker-render.js?v=r1078-76cb280a770b";

// One reused actor per frame (no per-frame allocation beyond it).
const actor = { id: "", kind: "", packKind: "", x: 0, y: 0, scale: 1, facingX: 1, boss: false, hopLift: 0, stalkForm: "cat", stalkAct: { kind: "prowl", t: 0, total: 0 }, pack: null, mountView: true };
// Close View's skinned ridden Triceratops (beast-mounts.ts TRICERATOPS_CLOSE_VIEW) sets skipBody while it paints the card: saddle and rider only.
// seatDx / seatUp (tiles, along the card and up it): where Close View sees the skinned body's saddle on the card (close-view.ts
// riddenSeatOnCard; the card stands at the Wayfarer, the saddle just behind the shoulders), only while skipBody is set.
export const MOUNT_DRAW = { skipBody: false, seatDx: 0, seatUp: 0 };
const seatOut = { up: 0, dx: 0 }, front = { style: null, x: 0, y: 0, u: 0, drop: 0, face: 1 };
// Draws the mount of `m` under the Wayfarer at `p` (raised `liftPx` by a jump). Returns where the Wayfarer sits: { up, dx } in pixels
// (up from their feet; along the screen, + right). drawMountFront, after the rider, adds anything that goes in front of them.
export function drawMount(ctx, m, p, s, now, liftPx = 0, reduceMotion = false, hornPose = null, mountFacing = p.facing, drillPose = null) {
  const B = MOUNT_BEASTS[m?.beast]; front.style = null; if (!B) { seatOut.up = 0; seatOut.dx = 0; return seatOut; }
  const moving = (p.walkPhase || 0) % 2, face = mountFacing === "left" ? -1 : mountFacing === "right" ? 1 : (p.mountFace || 1); p.mountFace = face;
  const barrel = B.tack === "barrel"; // the Triceratops: a heavy body that does not hop; its leap tucks its legs (mountAir)
  Object.assign(actor, { id: `mount:${m.id}`, kind: m.beast, packKind: m.beast, x: p.x, y: p.y - liftPx / s, scale: B.scale, facingX: face, mountHornPose: m.beast === "triceratops" ? hornPose : null, triceratopsDisposition: m.variant === "silly" ? "silly" : "good", hopLift: reduceMotion || barrel ? 0 : Math.abs(Math.sin(moving * Math.PI)) * .5, mountAir: barrel ? Math.max(0, liftPx / s) : 0, reduceMotion, mountDrill: barrel && !!drillPose, noShadow: barrel && !!drillPose }); // the drill's shadow is drawn at the feet, outside its roll (drawMountShadow)
  try {
    if (MOUNT_DRAW.skipBody && m.beast === "triceratops") { /* Close View draws its skinned body (TRICERATOPS_CLOSE_VIEW.riddenBody) */ }
    else if (m.beast === "stalker") drawStalker(ctx, actor, s, now, reduceMotion);
    else drawPackMonster(ctx, actor, s, now, p.facing);
  } catch { /* a renderer that needs fight state it does not have draws nothing; the rider still shows */ }
  const bob = reduceMotion ? 0 : (Number(B.bob) || 0) * Math.sin(now / 420) * s, cv = barrel && MOUNT_DRAW.skipBody, seat = B.seat * s + bob + (cv ? MOUNT_DRAW.seatUp * s : 0), dx = cv ? MOUNT_DRAW.seatDx * s : (Number(B.seatX) || 0) * face * s; // Close View: the card stands at the Wayfarer; the rider is painted where the skinned body's saddle is seen on it (close-view-beast-triceratops.ts TRICERATOPS_RIG.seatF), from every side
  const u = s * Math.max(.8, Math.min(1.6, B.scale * .5)), sx = (p.x + .5) * s + dx, sy = (p.y + .8) * s - liftPx - seat;
  if (B.saddle === "girth") { drawSaddle(ctx, "girth", sx + (Number(B.bandX) || 0) * face * s, sy, (Number(B.band) || 1.4) * s / 1.6, B.seat * s, face); drawSaddle(ctx, "girthSeat", sx, sy, u, B.seat * s, face); } // the band round the body's axis; the seat on its back
  else if (barrel && MOUNT_DRAW.skipBody) { drawSaddle(ctx, "barrelSeat", sx, sy, u, 0, face); Object.assign(front, { style: "barrelGrip", x: sx, y: sy, u, drop: 0, face }); } // Close View's skinned body wears the blanket and girth: the card keeps the seat (and the rider's grip) under the rider
  else if (barrel) { const style = m.variant === "silly" ? "barrelSilly" : "barrel", drop = Math.max(0, B.seat - (Number(B.belly) || 0)) * s; // the girth round the barrel, never below the belly
    drawSaddle(ctx, style, sx, sy, u, drop, face); Object.assign(front, { style: style + "Front", x: sx, y: sy, u, drop, face }); }
  else drawSaddle(ctx, B.saddle, sx, sy, B.saddle === "bowl" ? u * 1.35 : u, B.seat * s, face); // the drop without the bob: one cached image
  if (B.saddle === "bowl") Object.assign(front, { style: "bowlFront", x: sx, y: sy, u: u * 1.35, drop: B.seat * s, face });
  seatOut.up = seat; seatOut.dx = dx; return seatOut;
}
// The ridden Triceratops's ground shadow at its feet, for the drill (renderer.ts draws it before the roll, so it never turns with the
// body or floats above it): the same ellipse the body draws standing, shrinking and fading with the leap's height.
export function drawMountShadow(ctx, m, p, s, liftPx = 0) {
  const B = MOUNT_BEASTS[m?.beast]; if (!B || B.tack !== "barrel" || MOUNT_DRAW.skipBody) return false; // (the skinned body's shadow is on the ground layer)
  const u = s * B.scale, air = Math.max(0, liftPx / s), sh = Math.max(.45, 1 - air * .25);
  ctx.fillStyle = `rgba(4,4,6,${(.42 * sh).toFixed(3)})`; ctx.beginPath(); ctx.ellipse((p.x + .5) * s, (p.y + .82) * s, .8 * sh * u, .15 * sh * u, 0, 0, Math.PI * 2); ctx.fill();
  return true;
}
export function drawMountFront(ctx) { if (front.style) drawSaddle(ctx, front.style, front.x, front.y, front.u, front.drop, front.face); front.style = null; }

// ---- Saddles (original designs; visual only) ----
const SADDLE_CACHE = new Map(), SADDLE_CACHE_MAX = 24;
const makeCanvas = (w, h) => { try { if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(w, h); if (typeof document !== "undefined") { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; } } catch { /* none */ } return null; };
// The saddle's seat sits at (x, y), `u` pixels to a unit, its straps hanging `drop` pixels down the beast's side.
export function drawSaddle(ctx, style, x, y, u, drop, face = 1) {
  if (!style) return;
  const top = style.startsWith("barrel") ? .7 : .32, W = Math.ceil(u * 2.2), H = Math.ceil(u * (top + .28) + Math.max(Math.min(drop, u * 2.4), style.startsWith("barrel") ? u * .3 : 0) + 4), key = `${style}|${W}|${H}|${face}`;
  let sp = SADDLE_CACHE.get(key);
  if (!sp && typeof ctx.drawImage === "function") {
    const c = makeCanvas(W, H), g = c?.getContext?.("2d");
    if (g) { paintSaddle(g, style, W / 2, u * top, u, Math.min(drop, u * 2.4), face); if (SADDLE_CACHE.size >= SADDLE_CACHE_MAX) SADDLE_CACHE.delete(SADDLE_CACHE.keys().next().value); SADDLE_CACHE.set(key, (sp = c)); }
  }
  if (sp) ctx.drawImage(sp, x - W / 2, y - u * top);
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
  if (style.startsWith("barrel")) { paintBarrel(g, style, x, y, u, drop, face); return; }
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

// The Triceratops's saddle (2026-11-18): a blanket draped over the back, a leather seat with a high cantle and a pommel, and a broad
// girth that wraps the barrel down to the belly line (never through the body). The front layer, drawn after the rider, is the near
// flap and stirrup over the rider's leg, so the Wayfarer sits astride the back. "barrelSilly": the Silly Goose's own tack, a teal
// blanket with sunny spots and a goose feather in the cantle. The leather is the same for both.
function paintBarrel(g, style, x, y, u, drop, face) {
  const silly = style.startsWith("barrelSilly"), frontLayer = style.endsWith("Front"), leather = "#6b3f22", dark = "#3a2112", brass = "#c9a05a", iron = "#4a4f57";
  const cloth = silly ? "#2f9aa6" : "#8a2c34", clothDark = silly ? "#1d6a74" : "#5a1a20", trim = silly ? "#ffd84a" : brass, F = (dx) => x + dx * face;
  if (style === "barrelGrip" || frontLayer) { // the rider's hand on the grab strap at the pommel: they hold on through the drill, the leap and the charge
    g.lineCap = "round"; g.strokeStyle = dark; g.lineWidth = u * .05; g.beginPath(); g.moveTo(F(.3 * u), y - u * .12); g.quadraticCurveTo(F(.26 * u), y - u * .34, F(.1 * u), y - u * .36); g.stroke();
    g.strokeStyle = leather; g.lineWidth = u * .03; g.stroke();
    g.fillStyle = "#d9b48a"; g.beginPath(); g.arc(F(.1 * u), y - u * .36, u * .045, 0, Math.PI * 2); g.fill(); g.strokeStyle = dark; g.lineWidth = u * .015; g.stroke(); // the gloved hand
    if (style === "barrelGrip") return;
  }
  if (frontLayer) { // the near flap over the rider's leg, its stirrup hanging below it
    g.fillStyle = leather; g.beginPath(); g.moveTo(F(-.16 * u), y + u * .02); g.lineTo(F(.12 * u), y + u * .02); g.quadraticCurveTo(F(.16 * u), y + u * .2, F(.1 * u), y + u * .34); g.lineTo(F(-.12 * u), y + u * .34); g.quadraticCurveTo(F(-.19 * u), y + u * .18, F(-.16 * u), y + u * .02); g.closePath(); g.fill();
    g.strokeStyle = dark; g.lineWidth = u * .025; g.stroke();
    g.strokeStyle = trim; g.lineWidth = u * .015; g.beginPath(); g.moveTo(F(-.13 * u), y + u * .3); g.lineTo(F(.08 * u), y + u * .3); g.stroke();
    strap(g, F(-.01 * u), y + u * .3, F(-.01 * u), y + u * .42, u * .03, dark);
    g.strokeStyle = iron; g.lineWidth = u * .03; g.beginPath(); g.moveTo(F(-.07 * u), y + u * .42); g.lineTo(F(.05 * u), y + u * .42); g.lineTo(F(.03 * u), y + u * .48); g.lineTo(F(-.05 * u), y + u * .48); g.closePath(); g.stroke();
    return;
  }
  if (style === "barrelSeat") { seat(); return; }
  const d = Math.max(u * .4, drop);
  // the girth: from under the blanket round the near flank to the belly, bowed out a little with the barrel
  g.lineCap = "butt"; g.strokeStyle = dark; g.lineWidth = u * .13; g.beginPath(); g.moveTo(F(.05 * u), y + u * .3); g.quadraticCurveTo(F(.12 * u), y + d * .7, F(.06 * u), y + d); g.stroke();
  g.strokeStyle = leather; g.lineWidth = u * .09; g.stroke();
  g.fillStyle = brass; g.fillRect(F(.1 * u) - u * .06, y + d * .62, u * .12, u * .09); g.fillStyle = dark; g.fillRect(F(.1 * u) - u * .03, y + d * .62 + u * .025, u * .06, u * .04);
  // the blanket over the back, its hem scalloped, trimmed and (the Silly Goose's) spotted
  const hem = u * .42;
  g.fillStyle = cloth; g.beginPath(); g.moveTo(F(-.55 * u), y + u * .06); g.quadraticCurveTo(F(0), y - u * .1, F(.5 * u), y + u * .07);
  g.lineTo(F(.46 * u), y + hem); for (let i = 0; i < 6; i++) { const a = .46 - (i + .5) * .17, b2 = .46 - (i + 1) * .17; g.quadraticCurveTo(F(a * u), y + hem + u * .08, F(b2 * u), y + hem); }
  g.closePath(); g.fill(); g.strokeStyle = clothDark; g.lineWidth = u * .025; g.stroke();
  g.strokeStyle = trim; g.lineWidth = u * .03; g.beginPath(); g.moveTo(F(.42 * u), y + hem - u * .05); g.lineTo(F(-.52 * u), y + hem - u * .05); g.stroke();
  if (silly) { g.fillStyle = trim; for (const [px, py] of [[-.38, .18], [-.14, .26], [.12, .2], [.34, .28], [-.3, .33], [.22, .34]]) { g.beginPath(); g.arc(F(px * u), y + py * u, u * .035, 0, Math.PI * 2); g.fill(); } }
  seat();
  if (silly) { // a goose feather standing in the cantle
    g.fillStyle = "#fbfbf4"; g.beginPath(); g.moveTo(F(-.34 * u), y - u * .18); g.quadraticCurveTo(F(-.52 * u), y - u * .4, F(-.44 * u), y - u * .62); g.quadraticCurveTo(F(-.36 * u), y - u * .42, F(-.31 * u), y - u * .2); g.closePath(); g.fill();
    g.strokeStyle = "#c9c4b0"; g.lineWidth = u * .012; g.beginPath(); g.moveTo(F(-.33 * u), y - u * .19); g.quadraticCurveTo(F(-.43 * u), y - u * .38, F(-.44 * u), y - u * .6); g.stroke();
  }
  function seat() { // the seat: deep leather between a high cantle (behind) and a pommel (in front)
  g.fillStyle = leather; g.beginPath(); g.moveTo(F(-.34 * u), y - u * .2); g.quadraticCurveTo(F(-.3 * u), y + u * .1, F(0), y + u * .1); g.quadraticCurveTo(F(.26 * u), y + u * .1, F(.3 * u), y - u * .1);
  g.quadraticCurveTo(F(.24 * u), y - u * .02, F(.1 * u), y); g.lineTo(F(-.18 * u), y); g.quadraticCurveTo(F(-.27 * u), y - u * .04, F(-.34 * u), y - u * .2); g.closePath(); g.fill();
  g.strokeStyle = dark; g.lineWidth = u * .025; g.stroke();
  g.fillStyle = brass; g.beginPath(); g.arc(F(.3 * u), y - u * .11, u * .045, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(F(-.33 * u), y - u * .19, u * .03, 0, Math.PI * 2); g.fill();
  }
}
