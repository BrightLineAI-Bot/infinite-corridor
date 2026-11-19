// The Triceratops hatchling in Standard View (hatchling.ts): the companion on the shared Triceratops rig (triceratops-render.ts
// drawTriceratopsBody with `triForm`: the baby's and the young form's proportions), his mother lying sick in the Beast Hotel's straw,
// the pen of lashed branches he is rescued from, and his drawn-only visuals (the three beams focusing on the horn and the blast, gatling
// bolts, the tail whirl, the stomp's ring, the chill, the heal and the buffs). Drawing only: nothing here changes the game.
// Close View: the companion's card is replaced by his skinned body (close-view.ts admitHatchling sets HATCH_DRAW.skipBody while it
// paints the cards); his mother and the pen stay cards; the visuals lie on the floor.
import { drawTriceratopsBody } from "./triceratops-render.ts";
import { HATCHLING } from "./hatchling.ts";

const TAU = Math.PI * 2;
export const HATCH_ART = Object.freeze({
  // the young form's prance and the baby's hop while walking (tiles, and hops a second); none under Reduced Motion
  prance: Object.freeze({ young: .07, baby: .05, rate: 9 }),
  // his drawn height in tiles by form (the tallest of his Close View body and card: Close View's look framing and card bounds)
  height: Object.freeze({ baby: 1.2, young: 1.7 }),
  beam: "#fff2b0", beamCore: "#ffffff", bolt: "#ffe680", chill: "#bfe9ff", heal: "#8ff0a4", whirl: "rgba(255,240,160,", stomp: "rgba(185,168,136,",
  buff: Object.freeze({ damage: "#ff9a5a", defence: "#9ad0ff", stamina: "#b8f07a" }),
  // where the young form's horns are, in tiles x his scale from his feet (along his facing, up): the two brow horn tips and the nose horn,
  // and the focus ahead of the nose where the three beams meet before the blast
  tips: Object.freeze([Object.freeze([.86, .8]), Object.freeze([.8, .72]), Object.freeze([.92, .5])]), focus: Object.freeze([1.3, .64]),
  straw: "#d9b860", strawDark: "#a8873a", post: "#6b4a26", postLight: "#8f6a3c", rope: "#c9b48a", sick: "#9fd28a",
});
export const HATCH_DRAW = { skipBody: false };
// One reused actor each (no per-frame allocation beyond them).
const COMPANION = { id: "hatchling", kind: "triceratops", triForm: "baby", x: 0, y: 0, scale: 1, facingX: 1, pack: null, hp: 1, maxHp: 1, reduceMotion: false, poiseBreak: 0 };
const MAMA = { id: "hatch-mama", kind: "triceratops", x: 0, y: 0, scale: 1.9, facingX: -1, pack: null, hp: 1, maxHp: 1, reduceMotion: false, resting: "sick" };
const BABY = { id: "hatch-pen-baby", kind: "triceratops", triForm: "baby", x: 0, y: 0, scale: HATCHLING.forms.baby.scale, facingX: 1, pack: null, hp: 1, maxHp: 1, reduceMotion: false, poiseBreak: 0 };
const PACKS = { charge: { attack: "ramCharge", phase: "attack" }, beam: { attack: "ramCharge", phase: "windup" }, whirl: { attack: "heavySweep", phase: "attack" }, stompUp: { attack: "shockwave", phase: "windup" }, stomp: { attack: "shockwave", phase: "attack" }, gatling: { attack: "shockwave", phase: "windup" }, bite: { attack: "ramCharge", phase: "attack" } };
const Q = { k: 0, b: 0, u: 0, s: 0, t: 0, flip: 1, e: null, state: "idle" };

// The pose fields his act gives the shared rig (the pack attack names the rig already reads).
export function hatchlingPack(out) {
  const a = out?.act; if (!a) return null;
  if (a.kind === "beam") { const M = HATCHLING.young.moves.beam, t = M.charge + .25 - a.left; return t < M.charge ? PACKS.beam : PACKS.charge; }
  if (a.kind === "stomp") return a.n === 0 || (a.left % HATCHLING.young.moves.stomp.gap) > .12 ? PACKS.stompUp : PACKS.stomp;
  return PACKS[a.kind] || null;
}
// The companion's presentation: where, how big, which form, which way, how high (the prance). Null when he is not out here.
export function hatchlingPresentation(g, now, reduce = false) {
  const h = g?.save?.mounts?.hatchling, o = h?.out; if (!o || !h.owned || h.form === "big" || o.area !== g.areaStateId?.()) return null;
  const P = HATCH_ART.prance, hop = !reduce && o.moving ? Math.abs(Math.sin(now / 1000 * P.rate)) * (P[h.form] || 0) : 0;
  return { form: h.form, x: o.x, y: o.y, face: o.face < 0 ? -1 : 1, scale: HATCHLING.forms[h.form].scale, closeViewScale: HATCHLING.forms[h.form].closeViewScale || HATCHLING.forms[h.form].scale, hop, pack: hatchlingPack(o) };
}
function body(ctx, actor, s, now, cx, by) {
  Q.k = cx; Q.b = by; Q.u = s * actor.scale; Q.s = s; Q.t = now / 1000; Q.flip = actor.facingX < 0 ? -1 : 1; Q.e = actor; Q.state = actor.pack ? (actor.pack.phase === "windup" ? "windup" : "attack") : "idle";
  ctx.save(); try { drawTriceratopsBody(ctx, Q, now); } finally { ctx.restore(); }
}
// The companion's draw entry for the renderer's depth-sorted list (or null). Its fn paints him at his feet.
export function hatchlingDraw(ctx, g, s, now) {
  const reduce = !!(g.presentation?.reduceMotion || g.presentation?.safeMode), pr = hatchlingPresentation(g, now, reduce); if (!pr) return null;
  return { x: pr.x, y: pr.y, hatchling: true, nativeHeight: HATCH_ART.height[pr.form] || HATCH_ART.height.baby, fn: () => drawHatchlingCompanion(ctx, g, s, now, reduce) };
}
export function drawHatchlingCompanion(ctx, g, s, now, reduce = false) {
  const pr = hatchlingPresentation(g, now, reduce); if (!pr) return false;
  if (HATCH_DRAW.skipBody) { ctx.fillStyle = "rgba(0,0,0,0)"; return true; } // Close View draws his skinned body
  Object.assign(COMPANION, { triForm: pr.form, x: pr.x, y: pr.y - pr.hop, scale: pr.scale, facingX: pr.face, pack: pr.pack, reduceMotion: reduce, noShadow: true });
  const cx = (pr.x + .5) * s, foot = (pr.y + .82) * s;
  ctx.fillStyle = "rgba(4,4,6,.36)"; ctx.beginPath(); ctx.ellipse(cx, foot, .8 * pr.scale * s * (1 - pr.hop), .15 * pr.scale * s, 0, 0, TAU); ctx.fill(); // his shadow stays on the ground through the hop
  body(ctx, COMPANION, s, now, cx, foot - pr.hop * s);
  return true;
}

// His mother in the Beast Hotel: lying in the straw, sick (her head low, a sickly green breath); well again once he is home.
export function drawHatchMama(ctx, o, s, now, reduce = false) {
  const cx = (o.x + .5) * s, by = (o.y + .82) * s, well = o.state === "well", t = reduce ? 0 : now / 1000;
  ctx.save();
  ctx.fillStyle = HATCH_ART.strawDark; ctx.beginPath(); ctx.ellipse(cx, by - s * .05, s * 2.1, s * .55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = HATCH_ART.straw; ctx.beginPath(); ctx.ellipse(cx, by - s * .1, s * 1.9, s * .42, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = HATCH_ART.strawDark; ctx.lineWidth = Math.max(1, s * .03);
  for (let i = 0; i < 14; i++) { const a = i * 2.4, x = cx + Math.cos(a) * s * 1.6, y = by - s * .1 + Math.sin(a) * s * .3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + 1) * s * .25, y + Math.sin(a + 1) * s * .08); ctx.stroke(); }
  Object.assign(MAMA, { x: o.x, y: o.y, resting: well ? "well" : "sick", reduceMotion: reduce, noShadow: true });
  body(ctx, MAMA, s, now, cx, by + s * .05); // lying in the straw
  if (!well) { // a slow sick breath, and a bandage over the flank
    ctx.fillStyle = "#efe8d8"; ctx.strokeStyle = "#7a6a50"; ctx.lineWidth = Math.max(1, s * .025); ctx.beginPath(); ctx.ellipse(cx + s * .15, by - s * .75, s * .32, s * .12, -.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c04040"; ctx.beginPath(); ctx.moveTo(cx + s * .07, by - s * .75); ctx.lineTo(cx + s * .23, by - s * .75); ctx.moveTo(cx + s * .15, by - s * .82); ctx.lineTo(cx + s * .15, by - s * .68); ctx.stroke();
    for (let i = 0; i < 3; i++) { const f = (t * .4 + i / 3) % 1, x = cx - s * (1.9 + f * .3), y = by - s * (.75 + f * .9); ctx.globalAlpha = (1 - f) * .6; ctx.strokeStyle = HATCH_ART.sick; ctx.lineWidth = Math.max(1.2, s * .04); ctx.beginPath(); ctx.arc(x, y, s * (.08 + f * .08), 0, 4.5); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else { ctx.fillStyle = "#ff8fa8"; const y = by - s * (2 + (reduce ? 0 : .08 * Math.sin(t * 2))); heart(ctx, cx - s * .9, y, s * .16); }
  ctx.restore();
}
function heart(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 1.6, y - r * .2, x - r * .6, y - r * 1.3, x, y - r * .4); ctx.bezierCurveTo(x + r * .6, y - r * 1.3, x + r * 1.6, y - r * .2, x, y + r); ctx.fill(); }

// The pen: a ring of sharpened stakes lashed with rope round the frightened hatchling (the back stakes, him, the front stakes).
export function drawHatchPen(ctx, o, s, now, reduce = false) {
  const cx = (o.x + .5) * s, by = (o.y + .82) * s, R = s * 1.15, open = o.state === "open", t = reduce ? 0 : now / 1000;
  ctx.save();
  ctx.fillStyle = "rgba(60,44,24,.35)"; ctx.beginPath(); ctx.ellipse(cx, by - s * .1, R * 1.1, R * .45, 0, 0, TAU); ctx.fill();
  const stake = (a) => { const x = cx + Math.cos(a) * R, y = by - s * .1 + Math.sin(a) * R * .42, h = s * (.95 + .12 * Math.sin(a * 3));
    ctx.fillStyle = HATCH_ART.post; ctx.fillRect(x - s * .06, y - h, s * .12, h); ctx.fillStyle = HATCH_ART.postLight; ctx.fillRect(x - s * .06, y - h, s * .04, h);
    ctx.beginPath(); ctx.moveTo(x - s * .06, y - h); ctx.lineTo(x, y - h - s * .14); ctx.lineTo(x + s * .06, y - h); ctx.closePath(); ctx.fillStyle = HATCH_ART.post; ctx.fill(); };
  const rope = (from, to) => { ctx.strokeStyle = HATCH_ART.rope; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = from + (to - from) * i / 12, x = cx + Math.cos(a) * R, y = by - s * .1 + Math.sin(a) * R * .42 - s * .55; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); };
  const N = 9, gap = open ? 2 : -1; // freed: two stakes pulled out at the front
  for (let i = 0; i < N; i++) { const a = Math.PI + i * TAU / N; if (Math.sin(a) < 0) stake(a); }
  rope(Math.PI, TAU);
  Object.assign(BABY, { x: o.x, y: o.y, poiseBreak: open ? 0 : .55 + (reduce ? 0 : .1 * Math.sin(t * 6)), facingX: 1, reduceMotion: reduce, noShadow: false });
  body(ctx, BABY, s, now, cx, by - s * .12);
  for (let i = 0; i < N; i++) { const a = Math.PI + i * TAU / N; if (Math.sin(a) >= 0 && !(open && (i === 6 || i === gap + 5))) stake(a); }
  rope(0, Math.PI);
  if (!open) { ctx.fillStyle = "#fff6d6"; ctx.font = `bold ${Math.max(9, Math.round(s * .32))}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("!", cx + s * .45, by - s * 1.35 - (reduce ? 0 : Math.abs(Math.sin(t * 4)) * s * .08)); }
  ctx.restore();
}

// His drawn-only visuals (game.hatchVisuals: bounded, runtime only).
// `flat` (Close View: drawn on its floor) lays them on the ground: no height, so they lie under him and run along the ground to the foe.
export function drawHatchVisuals(ctx, g, toScreen, s, reduce = false, flat = false) {
  const list = g.hatchVisuals; if (!list?.length) return; const up = flat ? 0 : 1;
  ctx.save(); ctx.lineCap = "round";
  for (const v of list) {
    const k = Math.max(0, Math.min(1, v.life / (v.total || 1))), [x, y] = toScreen(v);
    if (v.kind === "beamCharge") { // three beams from the three horn tips, focusing ahead of the nose as he charges
      const f = 1 - k, sc = v.sc || 1, d = v.dx < 0 ? -1 : 1, F = HATCH_ART.focus, fx = x + d * F[0] * sc * s, fy = y - F[1] * sc * s * up;
      for (const T of HATCH_ART.tips) { const tx = x + d * T[0] * sc * s, ty = y - T[1] * sc * s * up, ex = tx + (fx - tx) * Math.min(1, .3 + f), ey = ty + (fy - ty) * Math.min(1, .3 + f);
        ctx.globalAlpha = .35 + .6 * f; ctx.strokeStyle = HATCH_ART.beam; ctx.lineWidth = Math.max(2, s * .09); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = HATCH_ART.beamCore; ctx.lineWidth = Math.max(1, s * .035); ctx.stroke(); }
      const r = s * (.05 + .2 * f) * (reduce ? 1 : 1 + .12 * Math.sin(f * 40)), gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 2.2);
      gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.45, "rgba(255,240,170,.7)"); gr.addColorStop(1, "rgba(255,220,120,0)"); ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx, fy, r * 2.2, 0, TAU); ctx.fill();
    } else if (v.kind === "beam") { // the blast: from the focus along his aim, thick and bright, thinning as it fades
      const [x2, y2] = toScreen({ x: v.x2, y: v.y2 }), sc = v.sc || 1, d = x2 < x ? -1 : 1, F = HATCH_ART.focus, fx = x + d * F[0] * sc * s, fy = y - F[1] * sc * s * up, ey = y2 - F[1] * sc * s * .8 * up;
      ctx.globalAlpha = .45 * k; ctx.strokeStyle = HATCH_ART.beam; ctx.lineWidth = s * .6 * k + 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x2, ey); ctx.stroke();
      ctx.globalAlpha = k; ctx.lineWidth = s * .3 * k + 2; ctx.stroke(); ctx.strokeStyle = HATCH_ART.beamCore; ctx.lineWidth = s * .12 * k + 1; ctx.stroke();
      ctx.fillStyle = HATCH_ART.beamCore; ctx.beginPath(); ctx.arc(fx, fy, s * .22 * k + 2, 0, TAU); ctx.fill();
    } else if (v.kind === "bolt") { // a gatling horn bolt: a bright streak with a glowing head, from a horn tip to the foe
      const [x2, y2] = toScreen({ x: v.x2, y: v.y2 }), sc = v.sc || 1, d = x2 < x ? -1 : 1, T = HATCH_ART.tips[(v.n || 0) % 3], tx = x + d * T[0] * sc * s, ty = y - T[1] * sc * s * up, ey = y2 - s * .4 * up, f = 1 - k;
      const px = tx + (x2 - tx) * f, py = ty + (ey - ty) * f, L = Math.hypot(x2 - tx, ey - ty) || 1, ux = (x2 - tx) / L, uy = (ey - ty) / L;
      ctx.globalAlpha = 1; ctx.strokeStyle = HATCH_ART.bolt; ctx.lineWidth = Math.max(3, s * .12); ctx.beginPath(); ctx.moveTo(px - ux * s * .7, py - uy * s * .7); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = HATCH_ART.beamCore; ctx.lineWidth = Math.max(1.5, s * .05); ctx.stroke(); ctx.fillStyle = HATCH_ART.beamCore; ctx.beginPath(); ctx.arc(px, py, Math.max(2.5, s * .1), 0, TAU); ctx.fill();
    } else if (v.kind === "whirl" || v.kind === "stomp" || v.kind === "chill") {
      const r = (v.r || 1) * s * (v.kind === "chill" ? 1 - k * .7 : 1.1 - k * .5);
      ctx.globalAlpha = k * (v.kind === "chill" ? .8 : .7); ctx.strokeStyle = v.kind === "chill" ? HATCH_ART.chill : v.kind === "whirl" ? HATCH_ART.whirl + ".8)" : HATCH_ART.stomp + ".8)"; ctx.lineWidth = Math.max(2, s * .07);
      ctx.beginPath(); ctx.ellipse(x, y, r, r * .4, 0, 0, TAU); ctx.stroke();
      if (v.kind === "chill") for (let i = 0; i < 6; i++) { const a = i * TAU / 6, px = x + Math.cos(a) * r * .8, py = y + Math.sin(a) * r * .32; ctx.beginPath(); ctx.moveTo(px - s * .08, py); ctx.lineTo(px + s * .08, py); ctx.moveTo(px, py - s * .08); ctx.lineTo(px, py + s * .08); ctx.stroke(); } // snowflake glints
    } else if (v.kind === "heal") {
      ctx.globalAlpha = k; ctx.fillStyle = HATCH_ART.heal; for (let i = 0; i < 5; i++) { const a = i * 1.3, rise = (1 - k) * s * 1.2, px = x + Math.cos(a) * s * .35, py = y - s * .4 - rise - i * s * .08; ctx.fillRect(px - s * .03, py - s * .1, s * .06, s * .2); ctx.fillRect(px - s * .1, py - s * .03, s * .2, s * .06); }
    } else if (v.kind === "buff") {
      ctx.globalAlpha = k; ctx.strokeStyle = HATCH_ART.buff[v.buff] || "#fff"; ctx.lineWidth = Math.max(1.5, s * .05); const r = s * (.5 + (1 - k) * .4); ctx.beginPath(); ctx.ellipse(x, y + s * .3, r, r * .35, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - s * 1.1 - (1 - k) * s * .3); ctx.lineTo(x - s * .12, y - s * .95 - (1 - k) * s * .3); ctx.moveTo(x, y - s * 1.1 - (1 - k) * s * .3); ctx.lineTo(x + s * .12, y - s * .95 - (1 - k) * s * .3); ctx.stroke();
    } else if (v.kind === "nip") { ctx.globalAlpha = k; ctx.fillStyle = "#fff6d6"; ctx.beginPath(); ctx.arc(x, y - s * .2, s * .1 * (1 + (1 - k)), 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
