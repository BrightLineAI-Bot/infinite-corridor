// The Doom Chaser's body and effects (release 710). Drawing only: nothing here changes combat state.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). An original black dragon wearing
// the shared dragon body (crimson-dragon-render.ts drawDragonBody) in burnt-glass black, violet fire showing through its cracks.
import { drawDragonBody } from "./crimson-dragon-render.js?v=r892-e6a756178bad";
import { DANGER } from "./monster-pack.js?v=r892-e6a756178bad";

const TAU = Math.PI * 2;
export const DOOM_ART = {
  hide: "#1d1a26", hideDark: "#0a090f", hideLight: "#3a3450", belly: "#2a2436", bellyDark: "#120f19", horn: "#07060a", hornLight: "#4c3c66",
  membrane: "#130f1c", membraneLight: "#33264a", bone: "#040307", eye: "#d27aff", fire: "#8a3aff", fireCore: "#f2e2ff", ember: "#b070ff",
  glow: "150,70,255", aura: "130,60,230", teeth: "#d8cce8", cracks: "180,100,255", horns: [[-.07, .52], [-.02, .46], [.03, .38], [.07, .3]], scallop: .48,
};
export const DOOM_EFFECT_KINDS = new Set(["doomErupt", "doomScale", "darkPool", "doomWave", "doomTar", "doomOrb", "doomBurst"]);

// A tongue of black fire with a violet edge.
function darkFlame(ctx, x, y, h, w, now, seed = 0, reduce = false) {
  for (let i = 0; i < 3; i++) { const sx = x + (i - 1) * w * .45, fh = h * (.7 + .3 * Math.sin((reduce ? 0 : now / 85) + seed + i * 1.7));
    ctx.fillStyle = i === 1 ? "rgba(10,4,18,.95)" : "rgba(140,70,255,.8)"; ctx.beginPath(); ctx.moveTo(sx - w * .3, y); ctx.quadraticCurveTo(sx - w * .1, y - fh * .6, sx, y - fh); ctx.quadraticCurveTo(sx + w * .1, y - fh * .6, sx + w * .3, y); ctx.closePath(); ctx.fill(); }
}
function warn(ctx, x, y, r, progress) { ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = DANGER.fillStrong; ctx.beginPath(); ctx.ellipse(x, y, r * progress, r * .6 * progress, 0, 0, TAU); ctx.fill(); }
const ground = (e, s) => [(e.x + .5) * s, (e.y + .62) * s];

export function drawDoomChaser(ctx, q, now = 0) {
  const { k, b, u, e } = q, s = q.s || u, t = now / 1000, reduce = !!e.reduceMotion, air = Math.max(0, Number(e.dragonAir) || 0) * s, attack = e.pack?.attack;
  // Motes of darkness drifting up off it.
  if (!reduce) for (let i = 0; i < 7; i++) { const p = (t * .35 + i / 7) % 1, x = k + Math.sin(i * 2.3 + t * .5) * u * .7, y = b - air - u * (.2 + p * 1.1); ctx.fillStyle = `rgba(150,80,255,${.45 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, y, u * (.012 + .012 * (1 - p)), 0, TAU); ctx.fill(); }
  // Its breath: a sweeping cone of black flame (drawn on the ground, beneath the body).
  const br = attack === "doomBreath" && e.doomBreath; if (br) { const [gx, gy] = ground(e, s), a0 = br.angle - br.arc * Math.PI / 360, a1 = br.angle + br.arc * Math.PI / 360, R = br.reach * s;
    ctx.fillStyle = "rgba(40,10,70,.45)"; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.ellipse(gx, gy, R, R * .62, 0, a0, a1); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 9; i++) { const a = a0 + (a1 - a0) * ((i * .618) % 1), d = R * (.2 + ((i * .37 + t * 1.4) % .8)); darkFlame(ctx, gx + Math.cos(a) * d, gy + Math.sin(a) * d * .62, s * .55, s * .35, now, i, reduce); } }
  drawDragonBody(ctx, q, now, DOOM_ART);
  // The black sun it hangs under for the Eclipse.
  if (e.dragonPose === "eclipse") { const cx = k, cy = b - air - u * 1.7, R0 = u * .32;
    const g = ctx.createRadialGradient(cx, cy, R0 * .9, cx, cy, R0 * 2.4); g.addColorStop(0, "rgba(200,140,255,.85)"); g.addColorStop(.4, "rgba(120,50,220,.4)"); g.addColorStop(1, "rgba(60,20,120,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0 * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#020104"; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.fill(); }
  // Its beams: the Ruin Beam from its jaws, the Eclipse's turning hands from its heart.
  const rays = (attack === "doomBeam" || attack === "doomEclipse") && e.pack?.phase === "active" ? e.doomRays : null;
  if (rays?.length) { const ox = k, oy = attack === "doomEclipse" ? b - air - u * 1.7 : b - air - u * .75;
    for (const r of rays) { const ex = (e.x + Math.cos(r.angle) * r.length + .5) * s, ey = (e.y + Math.sin(r.angle) * r.length + .62) * s;
      ctx.lineCap = "round";
      for (const [wd, col] of [[s * .9, "rgba(140,70,255,.28)"], [s * .5, "rgba(8,3,14,.92)"], [s * .12, "rgba(225,190,255,.95)"]]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke(); }
      ctx.fillStyle = "rgba(140,70,255,.45)"; ctx.beginPath(); ctx.ellipse(ex, ey, s * .6, s * .35, 0, 0, TAU); ctx.fill(); } }
}

export function drawDoomEffect(ctx, f, s, now, { reduceMotion = false } = {}) {
  const x = (f.x + .5) * s, y = (f.y + .62) * s, r = (Number(f.radius) || .5) * s, life = Math.max(0, Number(f.life) || 0), total = Number(f.total) || 1;
  ctx.save();
  if (f.kind === "doomErupt" || f.kind === "doomScale") {
    if (f.arming > 0) { const k = 1 - f.arming / Math.max(.01, f.armTotal || 1); warn(ctx, x, y, r, k);
      if (f.kind === "doomScale" && f.from) { const fx = (f.from.x + .5) * s, fy = (f.from.y + .62) * s, m = Math.min(1, k * 2.5), sx = fx + (x - fx) * m, sy = fy + (y - fy) * m - Math.sin(Math.PI * m) * s * 2; // a scale tossed out, then lying there glowing
        ctx.translate(sx, sy); ctx.rotate(reduceMotion ? .5 : now / 200 + f.x); ctx.fillStyle = "#0b0912"; ctx.strokeStyle = `rgba(180,100,255,${.4 + k * .6})`; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.moveTo(0, -s * .22); ctx.lineTo(s * .14, 0); ctx.lineTo(0, s * .22); ctx.lineTo(-s * .14, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else { ctx.strokeStyle = `rgba(160,90,255,${.3 + k * .5})`; ctx.lineWidth = Math.max(1, s * .05); for (let i = 0; i < 3; i++) { const a = i * 2.1 + f.x; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .5); ctx.stroke(); } } } // the ground cracking
    else { ctx.globalAlpha = Math.min(1, life * 3); darkFlame(ctx, x, y, s * 1.6, r * 1.1, now, f.x, reduceMotion); const g = ctx.createRadialGradient(x, y - s * .3, 0, x, y - s * .3, r * 1.3); g.addColorStop(0, "rgba(220,180,255,.7)"); g.addColorStop(1, "rgba(100,40,200,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - s * .3, r * 1.3, 0, TAU); ctx.fill(); }
  } else if (f.kind === "darkPool") {
    const fade = Math.min(1, life, (Number(f.age) || 0) * 4); ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(6,2,12,.85)"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(150,80,255,.8)"; ctx.lineWidth = Math.max(1, s * .06); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + f.x, d = r * .5; darkFlame(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * .6, s * .45, s * .28, now, i + f.y, reduceMotion); }
  } else if (f.kind === "doomWave") {
    const a = Math.atan2(f.vy, f.vx), half = (f.half || 1.6) * s, fade = Math.min(1, life * 3);
    ctx.translate(x, y); ctx.scale(1, .62); ctx.rotate(a); ctx.globalAlpha = fade;
    ctx.fillStyle = DANGER.fill; ctx.fillRect(-r, -half, r * 2, half * 2); // what it really hits: its whole width, this deep
    ctx.lineCap = "round"; for (const [wd, col] of [[s * .7, "rgba(130,60,240,.35)"], [s * .4, "rgba(10,4,18,.92)"], [s * .1, "rgba(220,180,255,.9)"]]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(-r, -half); ctx.quadraticCurveTo(r * 2.2, 0, -r, half); ctx.stroke(); }
  } else if (f.kind === "doomTar") {
    if (f.arming > 0) { const k = 1 - f.arming / Math.max(.01, f.armTotal || 1), fx = (f.from?.x ?? f.x) + .5, fy = (f.from?.y ?? f.y) + .62, gx = (fx + (f.x + .5 - fx) * k) * s, gy = (fy + (f.y + .62 - fy) * k) * s - Math.sin(Math.PI * k) * s * 2.2;
      warn(ctx, x, y, r, k); ctx.fillStyle = "#0a0806"; ctx.beginPath(); ctx.arc(gx, gy, s * .3, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(200,170,255,.5)"; ctx.beginPath(); ctx.arc(gx - s * .08, gy - s * .08, s * .08, 0, TAU); ctx.fill(); }
    else { ctx.globalAlpha = Math.min(1, life * 2); ctx.fillStyle = "rgba(8,6,4,.9)"; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(160,140,200,.25)"; ctx.beginPath(); ctx.ellipse(x - r * .25, y - r * .15, r * .3, r * .12, -.3, 0, TAU); ctx.fill(); // glossy tar
      if (f.lit) for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + f.x, d = r * .55; darkFlame(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * .6, s * .7, s * .35, now, i, reduceMotion); } }
  } else if (f.kind === "doomOrb") {
    const cy = y - s * .5, m = Math.hypot(f.vx, f.vy) || 1; for (let i = 5; i >= 1; i--) { ctx.fillStyle = `rgba(120,50,220,${.35 / i})`; ctx.beginPath(); ctx.arc(x - f.vx / m * r * i * .8, cy - f.vy / m * r * i * .8, r * (1 - i * .12), 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#050208"; ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(200,140,255,.9)"; ctx.lineWidth = Math.max(1, s * .06); ctx.beginPath(); ctx.arc(x, cy, r * (1 + (reduceMotion ? 0 : .12 * Math.sin(now / 90))), 0, TAU); ctx.stroke();
  } else if (f.kind === "doomBurst") {
    const k = 1 - life / Math.max(.01, total), R = r * (.4 + k * .7); ctx.globalAlpha = Math.min(1, life * 3);
    if (f.ring) { ctx.strokeStyle = "rgba(160,90,255,.8)"; ctx.lineWidth = s * .25 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(x, y, R, R * .6, 0, 0, TAU); ctx.stroke(); }
    else { const g = ctx.createRadialGradient(x, y - s * .2, 0, x, y - s * .2, R); g.addColorStop(0, "rgba(6,2,10,.95)"); g.addColorStop(.6, "rgba(110,40,220,.7)"); g.addColorStop(1, "rgba(80,20,160,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * .2, R, R * .7, 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
