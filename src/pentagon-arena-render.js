// The Stillworks, drawn (pentagon-arena.ts). Tim, 2026-11-04: "the arena of a world or civilization so advanced... that their
// technology just appears to be rock formations or structures... so finely structured everywhere that it is indistinguishable from
// rock... a manipulation of reality and density." An original look:
// - The floor is stone whose grain is a lattice: crisp and visible toward the heart, finer and finer toward the rim until it is only
//   speckled rock (density bands); where you stand, the stone resolves into the lattice under your feet, and that lattice is made of
//   lattices. Now and then a point of light runs along the grain, as if something in it were counting.
// - The formations are ridges that branch into ridges into ridges (one dendrite, joined across every formation tile), their faces
//   banded in strata that crowd closer and closer together (a density gradient). The stone beside them gives light, not shade.
// - Five standing lattices round the heart read as weathered slabs; closer, the weathering is ordered and has never worn.
// - The light falls inward: slow rings of it travel from the rim to the heart, where a five-fold figure, itself made of five-fold
//   figures, turns very slowly.
// Static layers are cached: each floor and formation tile is a sprite (a few variants per density band and edge), the heart's
// figure and the standing lattices are sprites, and the land beyond the map is a pattern of the same formations; the per-frame
// work is a handful of strokes, bounded by the quality tier, and still under reduced motion.
import { PENTAGON_ARENA } from "./pentagon-arena.js?v=r825-0c066edbc1a0";

export const STILLWORKS_ART = {
  res: 3, // sprite pixels per screen pixel at most (devicePixelRatio, capped)
  variants: 4,
  floor: ["#403e4e", "#3b3948", "#363443", "#312f3d"], // heart → rim: close in tone; the grain (lattice, specks) carries the density
  lattice: [.2, .13, .07, 0], fine: [.11, .06, 0, 0], speck: [6, 10, 16, 24], // per band: lattice alpha, the finer lattice's, stone specks
  latticeRgb: "196,210,255", node: "#c4ecff", lit: "rgba(206,222,255,.24)",
  ridge: ["#1d1c25", "#211f2a", "#1a1922", "#23212c"], ridgeLine: "#4d4a63", ridgeDark: "#100f15", ridgeFace: "#2d2b38", strata: "rgba(150,160,210,.16)", rim: "rgba(170,190,255,.3)", pore: "rgba(150,215,255,.45)",
  monolith: { w: 1.05, h: 3, body: ["#423f52", "#2a2836", "#1b1a23"], seam: "rgba(150,215,255,.5)", glow: "rgba(190,215,255,.16)" },
  // the pillars (arena version 2): a squat column standing on its 2×2 of formation, `h` tiles tall, strata crowding toward its foot,
  // seams of light; it throws light, not shadow (the Sunfall's shade is a rule of the stone, not a drawn shadow)
  pillar: { h: 2.4, inset: .12, body: ["#45425a", "#2c2a38", "#1c1b24"], cap: "#5a5672", seam: "rgba(150,215,255,.55)", glow: "rgba(190,215,255,.14)" },
  inlay: { stroke: "rgba(214,226,255,.5)", fill: "rgba(170,190,255,.07)", core: "rgba(232,240,255,.8)", depth: 2, turn: 90000 }, // turn: ms per revolution
  inward: { every: 7000, alpha: .16, rgb: "206,222,255" }, // a ring of light from the rim to the heart every `every` ms
  contours: [.25, .5, .75], // the floor's great order: faint five-sided terraces at these shares of its radius
  pulses: { full: 14, balanced: 8, low: 0, life: 2400, length: 3.2 }, // the counting in the grain
  near: { radius: 2.3, alpha: .3 }, // where the Wayfarer stands the grain resolves into its lattice
  beyond: "#15141b",
};
const A = STILLWORKS_ART, hh = (a, b) => { let n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; };
// ------------------------------------------------------------------------------------------------ sprites
const sprites = new Map(); let spriteS = 0, spriteRes = 0;
function canvasOf(w, h) { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); if (typeof document !== "undefined") { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; } return null; }
function resolution() { const d = Number(globalThis.devicePixelRatio) || 2; return Math.max(1, Math.min(A.res, Math.ceil(d))); }
// A cached sprite `key`, `w`×`h` tiles, painted once by `paint(ctx)` in tile pixels; null where no canvas can be made (tests).
function sprite(key, s, w, h, paint) {
  if (spriteS !== s) { sprites.clear(); spriteS = s; spriteRes = resolution(); }
  let c = sprites.get(key); if (c !== undefined) return c;
  c = canvasOf(Math.ceil(w * s * spriteRes), Math.ceil(h * s * spriteRes)); const x = c?.getContext?.("2d");
  if (!x) { sprites.set(key, null); return null; }
  x.scale(spriteRes, spriteRes); paint(x); sprites.set(key, c); return c;
}
export const stillworksSpriteCount = () => sprites.size; // bounded: 4 bands × 4 variants × 2 + 16 edges × 4 variants + a few
// ------------------------------------------------------------------------------------------------ painters (tile pixels, origin at 0,0)
function paintFloor(c, s, band, v, lit) {
  c.fillStyle = A.floor[band]; c.fillRect(0, 0, s + .5, s + .5);
  for (let i = 0; i < A.speck[band]; i++) { const q = hh(v * 97 + i, band * 31 + 7); c.fillStyle = q & 1 ? "rgba(0,0,0,.16)" : "rgba(230,232,255,.07)"; const r = .5 + (q % 3) * .35; c.fillRect((q % 997) / 997 * s, ((q >> 10) % 997) / 997 * s, r, r); } // stone
  const k = s / 4, a = A.lattice[band], f = A.fine[band];
  if (a > 0) { c.strokeStyle = `rgba(${A.latticeRgb},${a})`; c.lineWidth = .4; c.beginPath();
    for (let i = 0; i <= 4; i++) { c.moveTo(0, i * k); c.lineTo(s, i * k); }
    for (let i = -4; i <= 4; i++) { c.moveTo(i * k, 0); c.lineTo(i * k + s, s); c.moveTo(i * k + s, 0); c.lineTo(i * k, s); }
    c.stroke(); }
  if (f > 0) { c.strokeStyle = `rgba(${A.latticeRgb},${f})`; c.lineWidth = .22; c.beginPath(); const j = k / 2; // the lattice's own lattice
    for (let i = 0; i <= 8; i++) { c.moveTo(0, i * j); c.lineTo(s, i * j); } for (let i = -8; i <= 8; i++) { c.moveTo(i * j, 0); c.lineTo(i * j + s, s); } c.stroke(); }
  if (band < 3) for (let i = 0; i < 2; i++) { const q = hh(v * 13 + i * 5, band + 40); if (q % 3 === 0) continue; c.fillStyle = A.node; c.globalAlpha = .35 + (q % 4) * .1; c.fillRect((q % 4) * k + .2 - .5, ((q >> 4) % 4) * k + .2 - .5, 1, 1); c.globalAlpha = 1; } // nodes, lit
  if (lit) { const g = c.createLinearGradient?.(0, 0, 0, s * .6); if (g) { g.addColorStop(0, A.lit); g.addColorStop(1, "rgba(206,222,255,0)"); c.fillStyle = g; c.fillRect(0, 0, s + .5, s * .6); } } // the stone gives light where it should cast shade
}
// One branch of a ridge and its children (depth 2), from (x, y) along angle `a` for `len`.
function branch(c, x, y, a, len, wdt, depth, q) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  c.lineWidth = wdt * 1.6; c.strokeStyle = A.ridgeDark; c.beginPath(); c.moveTo(x + .6, y + .9); c.lineTo(ex + .6, ey + .9); c.stroke(); // its shadow side
  c.lineWidth = wdt; c.strokeStyle = A.ridgeLine; c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
  if (depth <= 0) return;
  for (const t of [.38, .72]) { const bx = x + (ex - x) * t, by = y + (ey - y) * t, side = (q >> (t > .5 ? 3 : 1)) & 1 ? 1 : -1, turn = .78 + ((q >> 5) % 5) * .06;
    branch(c, bx, by, a + side * turn, len * .42, wdt * .55, depth - 1, hh(q, depth * 7 + (t > .5 ? 1 : 2))); branch(c, bx, by, a - side * turn * .8, len * .3, wdt * .45, depth - 1, hh(q, depth * 11 + 3)); }
}
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function paintRidge(c, s, rim, v, links = 15 & ~rim) {
  c.fillStyle = A.ridge[v % A.ridge.length]; c.fillRect(0, 0, s + .5, s + .5);
  c.strokeStyle = "rgba(150,160,210,.05)"; c.lineWidth = .3; c.beginPath(); for (let i = 1; i < 10; i++) { c.moveTo(0, i * s / 10); c.lineTo(s, i * s / 10 - s * .08); } c.stroke(); // impossibly fine strata on its top
  const cx = s / 2, cy = s / 2; c.lineCap = "round";
  SIDES.forEach(([dx, dy], i) => { if ((rim & (1 << i)) || !(links & (1 << i))) return; branch(c, cx, cy, Math.atan2(dy, dx), s / 2, s * .075, 2, hh(v * 17 + i, rim + 3)); }); // to every side that is ridge too: one dendrite across the formation
  if (!links) branch(c, cx, cy, -Math.PI / 2 + v, s * .3, s * .06, 2, hh(v, 99)); // a knot of its own
  c.fillStyle = A.pore; for (let i = 0; i < 2; i++) { const q = hh(v * 3 + i, rim * 5 + 1); if (q % 2) c.fillRect(cx + ((q % 9) - 4) * s * .06 - .5, cy + (((q >> 4) % 9) - 4) * s * .06 - .5, 1, 1); } // a point of light deep in it
  c.lineCap = "butt";
  if (rim & 4) { const top = s * .7, hgt = s * .3; c.fillStyle = A.ridgeFace; c.fillRect(0, top, s + .5, hgt + .5); c.strokeStyle = A.strata; c.lineWidth = .35; c.beginPath(); // its face toward the floor: strata crowding downward (a density gradient)
    for (let k = 1; k < 9; k++) { const y = top + hgt * (1 - Math.pow(.7, k)); c.moveTo(0, y); c.lineTo(s, y); } c.stroke(); c.fillStyle = A.rim; c.fillRect(0, top - .6, s + .5, .8); }
  c.fillStyle = A.rim; if (rim & 1) c.fillRect(0, 0, s + .5, .8); if (rim & 2) c.fillRect(s - .8, 0, .8, s + .5); if (rim & 8) c.fillRect(0, 0, .8, s + .5);
}
function paintMonolith(c, s, v) {
  const M = A.monolith, w = M.w * s, H = M.h * s, x0 = (s * 1.2 - w) / 2, top = s * .25, base = top + H - s * .3;
  const g = c.createLinearGradient?.(x0, 0, x0 + w, 0); if (g) { g.addColorStop(0, M.body[0]); g.addColorStop(.55, M.body[1]); g.addColorStop(1, M.body[2]); c.fillStyle = g; } else c.fillStyle = M.body[1];
  c.beginPath(); c.moveTo(x0 + w * .12, top + s * .3); c.lineTo(x0 + w * .3, top + s * .1); c.lineTo(x0 + w * .55, top); c.lineTo(x0 + w * .8, top + s * .18); c.lineTo(x0 + w * .9, top + s * .4); c.lineTo(x0 + w, base); c.lineTo(x0, base); c.closePath(); c.fill(); // a slab, its cap faceted
  c.save(); c.clip();
  for (let i = 0; i < 26; i++) { const q = hh(v * 7 + i, 5), y = top + (q % 1000) / 1000 * H * .55; c.fillStyle = q & 1 ? "rgba(0,0,0,.2)" : "rgba(230,232,255,.08)"; c.fillRect(x0 + ((q >> 10) % 100) / 100 * w, y, 1.2, 1.2); } // weathered at the top...
  for (let i = 0; i < 30; i++) { const y = top + H * .25 + i * s * .075, a = Math.max(0, Math.min(.22, (y - top - H * .25) / (H * .6) * .22)); c.strokeStyle = `rgba(${A.latticeRgb},${a})`; c.lineWidth = .35; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y - s * .05); c.stroke(); } // ...ordered below: the weathering is a lattice
  c.strokeStyle = `rgba(${A.latticeRgb},.1)`; c.lineWidth = .3; c.beginPath(); for (let i = 1; i < 8; i++) { c.moveTo(x0 + i * w / 8, top + H * .4); c.lineTo(x0 + i * w / 8, base); } c.stroke();
  c.strokeStyle = M.seam; c.lineWidth = .8; c.beginPath(); c.moveTo(x0 + w * .5, base); c.lineTo(x0 + w * .46, top + H * .6); c.lineTo(x0 + w * .58, top + H * .38); c.moveTo(x0 + w * .47, top + H * .62); c.lineTo(x0 + w * .3, top + H * .5); c.moveTo(x0 + w * .57, top + H * .4); c.lineTo(x0 + w * .72, top + H * .3); c.stroke(); // its seams of light
  c.restore();
  c.strokeStyle = "rgba(190,205,255,.28)"; c.lineWidth = .6; c.beginPath(); c.moveTo(x0 + w * .12, top + s * .3); c.lineTo(x0 + w * .3, top + s * .1); c.lineTo(x0 + w * .55, top); c.stroke();
}
// A pillar, `n` tiles across, in a sprite `n` wide and `n + P.h` tall (its foot at the bottom).
function paintPillar(c, s, n, v) {
  const P = A.pillar, w = (n - P.inset * 2) * s, x0 = P.inset * s, H = (n + P.h) * s, top = s * .35, base = H - s * .2, capH = s * .55;
  const g = c.createLinearGradient?.(x0, 0, x0 + w, 0); if (g) { g.addColorStop(0, P.body[0]); g.addColorStop(.5, P.body[1]); g.addColorStop(1, P.body[2]); c.fillStyle = g; } else c.fillStyle = P.body[1];
  c.beginPath(); c.moveTo(x0, top + capH * .5); c.lineTo(x0 + w * .22, top); c.lineTo(x0 + w * .78, top); c.lineTo(x0 + w, top + capH * .5); c.lineTo(x0 + w, base); c.lineTo(x0, base); c.closePath(); c.fill(); // its body, the cap faceted
  c.save(); c.clip();
  for (let k = 1; k < 14; k++) { const y = top + capH + (base - top - capH) * (1 - Math.pow(.82, k)); c.strokeStyle = `rgba(${A.latticeRgb},${.05 + k * .012})`; c.lineWidth = .4; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y - s * .04); c.stroke(); } // strata crowding toward its foot: density
  c.strokeStyle = `rgba(${A.latticeRgb},.08)`; c.lineWidth = .3; c.beginPath(); for (let i = 1; i < 12; i++) { c.moveTo(x0 + i * w / 12, top + capH); c.lineTo(x0 + i * w / 12, base); } c.stroke(); // ...and its lattice
  for (let i = 0; i < 18; i++) { const q = hh(v * 11 + i, 23); c.fillStyle = q & 1 ? "rgba(0,0,0,.2)" : "rgba(230,232,255,.08)"; c.fillRect(x0 + ((q >> 10) % 100) / 100 * w, top + (q % 1000) / 1000 * capH * 1.6, 1.2, 1.2); } // weathered at the cap
  c.strokeStyle = P.seam; c.lineWidth = .8; const sx = x0 + w * (.35 + (v % 3) * .12); c.beginPath(); c.moveTo(sx, base); c.lineTo(sx - s * .08, base - H * .3); c.lineTo(sx + s * .1, top + capH * 1.4); c.moveTo(sx - s * .06, base - H * .28); c.lineTo(sx - s * .4, base - H * .42); c.stroke(); // a seam of light
  c.restore();
  c.fillStyle = P.cap; c.beginPath(); c.moveTo(x0, top + capH * .5); c.lineTo(x0 + w * .22, top); c.lineTo(x0 + w * .78, top); c.lineTo(x0 + w, top + capH * .5); c.lineTo(x0 + w * .78, top + capH); c.lineTo(x0 + w * .22, top + capH); c.closePath(); c.fill(); // the cap's top face
  c.strokeStyle = "rgba(190,205,255,.3)"; c.lineWidth = .6; c.stroke();
}
// The heart's figure: a pentagon of pentagons of pentagons (`depth`), radius `r` tiles, centred in a sprite of 2r+1 tiles.
const PENT = new Float64Array(10);
function pentPath(c, x, y, r, a0) { for (let k = 0; k < 5; k++) { const a = a0 + k * Math.PI * 2 / 5; PENT[k * 2] = x + Math.cos(a) * r; PENT[k * 2 + 1] = y + Math.sin(a) * r; } c.moveTo(PENT[0], PENT[1]); for (let k = 1; k < 5; k++) c.lineTo(PENT[k * 2], PENT[k * 2 + 1]); c.closePath(); }
function flake(c, x, y, r, a0, depth) {
  pentPath(c, x, y, r, a0); if (depth <= 0) return; const k = 1 / (1 + 2 * Math.cos(Math.PI / 5) * 1.0), rr = r * k * .95, off = r - rr;
  flake(c, x, y, rr, a0 + Math.PI, depth - 1); for (let i = 0; i < 5; i++) { const a = a0 + i * Math.PI * 2 / 5; flake(c, x + Math.cos(a) * off * 1.05, y + Math.sin(a) * off * 1.05, rr, a0, depth - 1); }
}
function paintInlay(c, s, R) {
  const I = A.inlay, x = (R + .5) * s, y = (R + .5) * s, r = R * s;
  c.fillStyle = I.fill; c.beginPath(); pentPath(c, x, y, r, -Math.PI / 2); c.fill();
  c.strokeStyle = I.stroke; c.lineWidth = .7; c.beginPath(); flake(c, x, y, r, -Math.PI / 2, I.depth); c.stroke();
  c.strokeStyle = "rgba(214,226,255,.22)"; c.lineWidth = .35; c.beginPath(); flake(c, x, y, r * .62, Math.PI / 2, 1); c.stroke();
}
// ------------------------------------------------------------------------------------------------ the tiles
export const isStillworksTile = (t) => t?.kind === "stillFloor" || t?.kind === "stillRidge";
export function drawStillworksTile(ctx, t, x, y, s) {
  if (!isStillworksTile(t)) return false; const v = (Number(t.detail) || 0) % A.variants, px = x * s, py = y * s;
  if (t.kind === "stillFloor") { const band = Math.max(0, Math.min(A.floor.length - 1, Number(t.band) || 0)), lit = !!t.lit, sp = sprite(`f${band}:${v}:${lit ? 1 : 0}`, s, 1, 1, (c) => paintFloor(c, s, band, v, lit));
    if (sp) ctx.drawImage(sp, px, py, s + .5, s + .5); else { ctx.save(); ctx.translate(px, py); paintFloor(ctx, s, band, v, lit); ctx.restore(); } return true; }
  const rim = (Number(t.rim) || 0) & 15, links = t.links === undefined ? 15 & ~rim : (Number(t.links) || 0) & 15, rv = v & 1, sp = sprite(`r${rim}:${links}:${rv}`, s, 1, 1, (c) => paintRidge(c, s, rim, rv, links)); // bounded: 16 edges × 16 joins × 2
  if (sp) ctx.drawImage(sp, px, py, s + .5, s + .5); else { ctx.save(); ctx.translate(px, py); paintRidge(ctx, s, rim, rv, links); ctx.restore(); }
  return true;
}
// ------------------------------------------------------------------------------------------------ the objects
export function drawStillworksObject(ctx, o, s, now, reduce = false) {
  if (o.kind === "stillMonolith") {
    const v = (Number(o.h) || 0) % A.variants, cx = (o.x + .5) * s, foot = (o.y + .95) * s, M = A.monolith;
    ctx.fillStyle = M.glow; ctx.beginPath(); ctx.ellipse(cx, foot + s * .05, s * .95, s * .38, 0, 0, 7); ctx.fill(); // it throws light, not shadow
    const sp = sprite(`m${v}`, s, 1.2, M.h + .3, (c) => paintMonolith(c, s, v)), x0 = cx - s * .6, y0 = foot - (M.h + .05) * s;
    if (sp) ctx.drawImage(sp, x0, y0, s * 1.2, s * (M.h + .3)); else { ctx.save(); ctx.translate(x0, y0); paintMonolith(ctx, s, v); ctx.restore(); }
    if (!reduce) for (let i = 0; i < 2; i++) { const k = ((now / 2600 + i * .5 + v * .17) % 1), y = foot - s * .3 - k * M.h * s * .62; ctx.fillStyle = `rgba(190,232,255,${.7 * Math.sin(k * Math.PI)})`; ctx.fillRect(cx - s * .02 + Math.sin(k * 9 + i) * s * .06, y, 2, 2); } // light climbing its seams
    return true;
  }
  if (o.kind !== "pentArenaGate") return false;
  const x = o.x * s, y = o.y * s, pulse = reduce ? .6 : .5 + .5 * Math.sin(now / 700); ctx.save();
  if (o.to === "vault") { // the way back: an arch in the ordered stone onto the vault's lamplight
    ctx.fillStyle = "#14121a"; ctx.fillRect(x + s * .06, y - s * .05, s * .88, s * 1.05);
    ctx.fillStyle = "#2a1e12"; ctx.beginPath(); ctx.moveTo(x + s * .2, y + s); ctx.lineTo(x + s * .2, y + s * .42); ctx.arc(x + s * .5, y + s * .42, s * .3, Math.PI, 0); ctx.lineTo(x + s * .8, y + s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(232,180,96,${.3 + .2 * pulse})`; ctx.fillRect(x + s * .32, y + s * .5, s * .36, s * .5);
    ctx.strokeStyle = A.rim; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.moveTo(x + s * .2, y + s); ctx.lineTo(x + s * .2, y + s * .42); ctx.arc(x + s * .5, y + s * .42, s * .3, Math.PI, 0); ctx.lineTo(x + s * .8, y + s); ctx.stroke();
  } else if (o.state === "open") { // the seam drawn back: stars beyond, and their light
    ctx.fillStyle = "#0b0e11"; ctx.beginPath(); ctx.moveTo(x + s * .5, y - s * .1); ctx.lineTo(x + s * .86, y + s * .5); ctx.lineTo(x + s * .5, y + s * 1.05); ctx.lineTo(x + s * .14, y + s * .5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff6dc"; for (const [u, w, r] of [[.42, .3, 1.2], [.6, .5, 1], [.47, .72, 1.4], [.36, .52, 1]]) ctx.fillRect(x + s * u, y + s * w, r, r);
    ctx.strokeStyle = `rgba(206,222,255,${.45 + .4 * pulse})`; ctx.lineWidth = Math.max(1.5, s * .05); ctx.stroke();
    ctx.fillStyle = `rgba(170,200,255,${.12 + .12 * pulse})`; ctx.beginPath(); ctx.ellipse(x + s * .5, y + s * 1.3, s * .9, s * .4, 0, 0, 7); ctx.fill();
  } else { // sealed: a seam no wider than a thought
    ctx.strokeStyle = `rgba(206,222,255,${.25 + .35 * pulse})`; ctx.lineWidth = Math.max(1, s * .035); ctx.beginPath(); ctx.moveTo(x + s * .5, y - s * .05); ctx.lineTo(x + s * .52, y + s * .4); ctx.lineTo(x + s * .48, y + s * .7); ctx.lineTo(x + s * .5, y + s); ctx.stroke();
    ctx.strokeStyle = `rgba(${A.latticeRgb},${.12 + .1 * pulse})`; ctx.lineWidth = .8; ctx.beginPath(); pentPath(ctx, x + s * .5, y + s * .5, s * .42, -Math.PI / 2); ctx.stroke();
  }
  ctx.restore(); return true;
}
// ------------------------------------------------------------------------------------------------ per frame
let beyondPattern = null, beyondS = 0, nearGrad = null, nearS = 0;
// Before the ground: the formations go on past the edge of the map, plain stone at that distance (a cached pattern).
export function drawStillworksBeyond(ctx, g, s, w, h) {
  if (!g.map?.stillworks) return; const p = g.player, x0 = p.x * s - w / 2 - s, y0 = p.y * s - h / 2 - s;
  if (beyondS !== s) { beyondS = s; const sp = sprite("beyond", s, 2, 2, (c) => { for (let i = 0; i < 4; i++) { c.save(); c.translate((i & 1) * s, (i >> 1) * s); paintRidge(c, s, 0, i & 1, [5, 10, 6, 9][i]); c.restore(); } }); beyondPattern = sp && typeof ctx.createPattern === "function" ? ctx.createPattern(sp, "repeat") || null : null; if (beyondPattern && typeof DOMMatrix !== "undefined") beyondPattern.setTransform?.(new DOMMatrix([1 / spriteRes, 0, 0, 1 / spriteRes, 0, 0])); } // the sprite is drawn at its own resolution
  ctx.fillStyle = beyondPattern || A.beyond; ctx.fillRect(x0, y0, w + s * 2, h + s * 2);
}
// After the ground, before the creatures: the floor's great order, the heart's figure, the light falling inward, the counting in the
// grain and the lattice under the Wayfarer's feet. `quality` is the presentation tier; `reduce` holds everything still.
export function drawStillworksLight(ctx, g, s, now, quality = "balanced", reduce = false) {
  const W = g.map?.stillworks; if (!W) return; const P = PENTAGON_ARENA, cx = W.cx * s, cy = W.cy * s, R = W.radius * s, inner = Math.cos(Math.PI / 5);
  ctx.save();
  // the great order: terraces and five spokes, faint
  ctx.strokeStyle = `rgba(${A.latticeRgb},.07)`; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); for (const k of A.contours) pentPath(ctx, cx, cy, R * k, -Math.PI / 2);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ctx.moveTo(cx + Math.cos(a) * P.inlay * s, cy + Math.sin(a) * P.inlay * s); ctx.lineTo(cx + Math.cos(a) * R * .93, cy + Math.sin(a) * R * .93); } ctx.stroke();
  // the light falls inward: a ring from the rim to the heart
  if (!reduce && quality !== "low") { const I = A.inward, k = 1 - (now % I.every) / I.every, a = I.alpha * Math.sin(k * Math.PI); ctx.strokeStyle = `rgba(${I.rgb},${a})`; ctx.lineWidth = Math.max(2, s * .16 * (.4 + k)); ctx.beginPath(); pentPath(ctx, cx, cy, Math.max(s, R * inner * k), -Math.PI / 2); ctx.stroke(); }
  // the heart's figure, turning very slowly
  const sp = sprite("inlay", s, P.inlay * 2 + 1, P.inlay * 2 + 1, (c) => paintInlay(c, s, P.inlay)), turn = reduce ? 0 : (now % A.inlay.turn) / A.inlay.turn * Math.PI * 2 / 5;
  ctx.translate(cx, cy); ctx.rotate(turn); if (sp) ctx.drawImage(sp, -(P.inlay + .5) * s, -(P.inlay + .5) * s, (P.inlay * 2 + 1) * s, (P.inlay * 2 + 1) * s); else { ctx.translate(-(P.inlay + .5) * s, -(P.inlay + .5) * s); paintInlay(ctx, s, P.inlay); }
  ctx.restore(); ctx.save();
  ctx.fillStyle = A.inlay.core; ctx.globalAlpha = reduce ? .7 : .55 + .35 * Math.sin(now / 900); ctx.beginPath(); ctx.arc(cx, cy, s * .09, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  // the counting in the grain: points of light running along the lattice, a few at a time
  const n = A.pulses[quality] ?? A.pulses.balanced, L = A.pulses.life, k4 = s / 4, px = g.player.x, py = g.player.y;
  if (n > 0) for (let i = 0; i < n; i++) { const cyc = Math.floor((now + i * 977) / L), q = hh(cyc * 31 + i, 7), t = reduce ? .5 : ((now + i * 977) % L) / L;
    const tx = Math.floor(px) + (q % 13) - 6, ty = Math.floor(py) + ((q >> 5) % 13) - 6, tile = g.map.tiles[ty * g.map.width + tx]; if (!tile || tile.kind !== "stillFloor") continue;
    const dir = (q >> 9) % 3, dx = dir === 0 ? 1 : dir === 1 ? .7071 : .7071, dy = dir === 0 ? 0 : dir === 1 ? .7071 : -.7071, along = t * A.pulses.length * s;
    const x = tx * s + ((q >> 12) % 4) * k4 + dx * along, y = ty * s + ((q >> 14) % 4) * k4 + dy * along, a = Math.sin(t * Math.PI) * .75;
    ctx.strokeStyle = `rgba(196,236,255,${a * .5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - dx * s * .16, y - dy * s * .16); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = `rgba(226,246,255,${a})`; ctx.fillRect(x - 1, y - 1, 2, 2); }
  // where the Wayfarer stands, the stone resolves into its lattice (and its lattice's lattice)
  if (quality !== "low") { const N = A.near, r = N.radius * s, ox = (px + .5) * s, oy = (py + .7) * s, j = s / 8;
    if (nearS !== s) { nearS = s; nearGrad = typeof ctx.createRadialGradient === "function" ? ctx.createRadialGradient(0, 0, 0, 0, 0, r) : null; if (nearGrad) { nearGrad.addColorStop(0, `rgba(${A.latticeRgb},${N.alpha})`); nearGrad.addColorStop(.6, `rgba(${A.latticeRgb},${N.alpha * .45})`); nearGrad.addColorStop(1, `rgba(${A.latticeRgb},0)`); } } // made once per tile size, drawn translated
    ctx.translate(ox, oy); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip(); ctx.globalAlpha = reduce ? 1 : .85 + .15 * Math.sin(now / 1300);
    const e = r + j, n = Math.ceil(2 * e / j) + 1, fy = ((oy % j) + j) % j, fd = (((oy - e - ox) % j) + j) % j; ctx.lineWidth = .6; ctx.strokeStyle = nearGrad || `rgba(${A.latticeRgb},${N.alpha * .5})`; ctx.beginPath(); // world-aligned lines, drawn in local space
    for (let y = -fy - n * j; y <= e; y += j) if (y >= -e) { ctx.moveTo(-e, y); ctx.lineTo(e, y); } for (let x = fd - n * j; x <= e; x += j) { ctx.moveTo(x, -e); ctx.lineTo(x + 2 * e, e); } ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
  drawStillworksPillars(ctx, W, s);
}
// The pillars (arena version 2; pentagon-arena.ts cover): one cached sprite per variant and size, drawn standing on their stone after the
// ground and before the creatures, so a Wayfarer sheltering behind one is still seen. At most `PENTAGON_ARENA.cover.count` draws.
function drawStillworksPillars(ctx, W, s) {
  if (!W.pillars?.length) return; const P = A.pillar;
  for (const q of W.pillars) { const n = Number(q.size) || 2, v = (Number(q.v) || 0) % A.variants, cx = (q.x + n / 2) * s, foot = (q.y + n) * s;
    ctx.fillStyle = P.glow; ctx.beginPath(); ctx.ellipse(cx, foot - s * .1, s * n * .7, s * .45, 0, 0, 7); ctx.fill();
    const sp = sprite(`p${n}:${v}`, s, n, n + P.h, (c) => paintPillar(c, s, n, v)), x0 = q.x * s, y0 = foot - (n + P.h) * s;
    if (sp) ctx.drawImage(sp, x0, y0, n * s, (n + P.h) * s); else { ctx.save(); ctx.translate(x0, y0); paintPillar(ctx, s, n, v); ctx.restore(); } }
}
