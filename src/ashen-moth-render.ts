// The Ashen Moth's body and effects (release 706). Drawing only: nothing here changes combat state.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster).
const TAU = Math.PI * 2;
export const MOTH_ART = {
  wing: "#55504a", wingDark: "#2c2824", wingEdge: "#14110e", vein: "#ff8a2a", eye: "#ff6a1a", eyeCore: "#ffe2b0",
  body: "#3a3430", fur: "#6a625a", ember: "#ffb04a", fire: "#ff7a1a", fireCore: "#ffe8b0", ash: "#8a847c",
  hover: .75, bob: .08, flap: 7,
};
export const MOTH_EFFECT_KINDS = new Set(["emberDust"]);

const smoothing = new WeakMap();
function eased(e, key, target, now, rate) {
  const st = smoothing.get(e) || {}; smoothing.set(e, st);
  const prev = st[key], last = st["@" + key], dt = last == null ? 0 : Math.min(.1, Math.max(0, (now - last) / 1000)); st["@" + key] = now;
  if (!Number.isFinite(prev) || !(dt > 0)) { st[key] = target; return target; }
  st[key] = prev + (target - prev) * Math.min(1, dt * rate); return st[key];
}
// Wing spread (1 open, 0 folded) and flap speed by pose.
const POSES = { idle: [1, 1], raise: [1.1, .6], beat: [1, 2.2], shake: [1, 2.8], climb: [.9, 1.8], dive: [.25, 0], spin: [1, 1.6], fold: [0, 0] };

// One wing: an upper fore-wing and a rounded hind-wing, ash grey, ember veins, an eye-spot that glows.
function wing(ctx, A, u, side, spread, flap, kindled, now, reduce) {
  const lift = flap * u * .12, sw = Math.max(.08, spread);
  ctx.save(); ctx.scale(side, 1);
  const fore = [[0, -u * .05], [u * .55 * sw, -u * .38 - lift], [u * .95 * sw, -u * .3 - lift * 1.2], [u * .9 * sw, -u * .08 - lift * .6], [u * .3 * sw, u * .02]];
  const hind = [[0, u * .02], [u * .35 * sw, u * .02], [u * .62 * sw, u * .2 - lift * .3], [u * .45 * sw, u * .38], [u * .1 * sw, u * .22]];
  const shape = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; ctx.quadraticCurveTo(x0 + (x1 - x0) * .2, y0 + (y1 - y0) * .8, x1, y1); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = A.wingEdge; ctx.lineWidth = Math.max(1, u * .012); ctx.stroke(); };
  const g = ctx.createLinearGradient(0, -u * .4, u * sw, u * .1); g.addColorStop(0, A.wing); g.addColorStop(1, A.wingDark);
  shape(hind, A.wingDark); shape(fore, g);
  ctx.strokeStyle = kindled ? "rgba(255,190,90,.9)" : "rgba(255,138,42,.55)"; ctx.lineWidth = Math.max(1, u * .01);
  for (const [x, y] of [[.85, -.3], [.92, -.12], [.6, -.36], [.5, .25], [.55, .1]]) { ctx.beginPath(); ctx.moveTo(u * .04, 0); ctx.quadraticCurveTo(u * x * sw * .5, y * u * .6 - lift * .4, u * x * sw, y * u - lift * (y < 0 ? 1 : .3)); ctx.stroke(); }
  // The eye-spot: dark ring, ember iris, hot core.
  const ex = u * .55 * sw, ey = -u * .2 - lift * .8, er = u * .09 * Math.max(.4, sw), pulse = reduce ? 1 : .8 + .2 * Math.sin(now / 240 + side);
  ctx.fillStyle = A.wingEdge; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.35, er * 1.1, 0, 0, TAU); ctx.fill();
  const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er); eg.addColorStop(0, A.eyeCore); eg.addColorStop(.45, A.eye); eg.addColorStop(1, "rgba(255,106,26,.2)"); ctx.fillStyle = eg; ctx.globalAlpha *= pulse; ctx.beginPath(); ctx.ellipse(ex, ey, er, er * .85, 0, 0, TAU); ctx.fill(); ctx.globalAlpha /= pulse;
  if (kindled) { // flame along the leading edge
    for (let i = 0; i < 6; i++) { const k = i / 5, x = u * (.15 + .78 * k) * sw, y = -u * (.12 + .25 * Math.sin(k * 2.6)) - lift * (.4 + k * .8), h = u * (.07 + .04 * Math.sin(now / 90 + i * 1.9)) * (reduce ? .8 : 1);
      ctx.fillStyle = "rgba(255,122,26,.8)"; ctx.beginPath(); ctx.moveTo(x - u * .03, y); ctx.quadraticCurveTo(x, y - h * 1.4, x + u * .03, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = A.fireCore; ctx.beginPath(); ctx.arc(x, y - h * .3, u * .012, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

export function drawAshenMoth(ctx, q, now = 0) {
  const A = MOTH_ART, { k, u, e } = q, reduce = !!e.reduceMotion, t = now / 1000, kindled = e.mothKindled > 0;
  const [spread0, flapRate] = POSES[e.mothPose] || POSES.idle, spread = eased(e, "spread", e.mothCocoon ? 0 : spread0, now, 8);
  const air = Math.max(0, Number(e.mothAir) || 0), hover = u * (A.hover + air * .9) + (reduce ? 0 : Math.sin(t * 2.1) * u * A.bob), b = q.b - hover;
  const flap = reduce ? .3 : Math.sin(t * A.flap * flapRate) * Math.min(1, flapRate);
  ctx.fillStyle = "rgba(10,8,6,.35)"; ctx.beginPath(); ctx.ellipse(k, q.b, u * .7 * Math.max(.4, spread), u * .13, 0, 0, TAU); ctx.fill(); // its shadow on the ground
  if (kindled) { const g = ctx.createRadialGradient(k, b, u * .1, k, b, u * 1.3); g.addColorStop(0, "rgba(255,138,42,.3)"); g.addColorStop(1, "rgba(255,138,42,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(k, b, u * 1.3, u * .9, 0, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(k, b);
  if (e.mothPose === "spin" && !reduce) ctx.rotate(Math.sin(t * 9) * .25);
  if (e.mothPose === "dive") ctx.rotate((e.facingX || 1) * .35);
  if (e.mothCocoon) { // a cocoon of grey ash with ember cracks
    const g = ctx.createRadialGradient(-u * .08, -u * .15, u * .05, 0, 0, u * .5); g.addColorStop(0, "#9a948c"); g.addColorStop(1, "#3a3530"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, u * .32, u * .5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = A.wingEdge; ctx.lineWidth = Math.max(1, u * .015); ctx.stroke();
    ctx.strokeStyle = `rgba(255,150,60,${reduce ? .8 : .5 + .4 * Math.sin(now / 120)})`; ctx.lineWidth = Math.max(1, u * .012);
    for (let i = 0; i < 5; i++) { const y0 = -u * .38 + i * u * .17; ctx.beginPath(); ctx.moveTo(-u * .2, y0); ctx.lineTo(-u * .05, y0 + u * .05); ctx.lineTo(u * .08, y0 - u * .02); ctx.lineTo(u * .2, y0 + u * .04); ctx.stroke(); }
    ctx.restore(); return;
  }
  wing(ctx, A, u, -1, spread, flap, kindled, now, reduce); wing(ctx, A, u, 1, spread, flap, kindled, now, reduce);
  // Body: a furred thorax and a banded abdomen, a hooded head with feathered antennae ending in ember lanterns.
  ctx.fillStyle = A.body; ctx.beginPath(); ctx.ellipse(0, u * .2, u * .1, u * .26, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = A.wingEdge; ctx.lineWidth = Math.max(1, u * .01); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, u * (.08 + i * .09), u * .095 - i * u * .01, u * .02, 0, 0, Math.PI); ctx.stroke(); }
  const fg = ctx.createRadialGradient(-u * .03, -u * .06, u * .02, 0, -u * .02, u * .16); fg.addColorStop(0, A.fur); fg.addColorStop(1, A.body); ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, -u * .02, u * .14, u * .15, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = A.body; ctx.beginPath(); ctx.ellipse(0, -u * .17, u * .08, u * .07, 0, 0, TAU); ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = A.eye; ctx.beginPath(); ctx.arc(side * u * .045, -u * .18, u * .02, 0, TAU); ctx.fill();
    const ax = side * u * .22, ay = -u * .44 + (reduce ? 0 : Math.sin(t * 3 + side) * u * .015);
    ctx.strokeStyle = A.fur; ctx.lineWidth = Math.max(1, u * .012); ctx.beginPath(); ctx.moveTo(side * u * .03, -u * .22); ctx.quadraticCurveTo(side * u * .08, -u * .4, ax, ay); ctx.stroke();
    for (let i = 1; i < 6; i++) { const k2 = i / 6, x = side * u * .03 + (ax - side * u * .03) * k2, y = -u * .22 + (ay + u * .22) * k2 - Math.sin(k2 * Math.PI) * u * .05; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * u * .03, y - u * .03); ctx.stroke(); }
    const lg = ctx.createRadialGradient(ax, ay, 0, ax, ay, u * .07); lg.addColorStop(0, A.fireCore); lg.addColorStop(.4, A.ember); lg.addColorStop(1, "rgba(255,176,74,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(ax, ay, u * .07, 0, TAU); ctx.fill();
  }
  // Ash falling from it.
  if (!reduce) { ctx.fillStyle = "rgba(160,152,142,.55)"; for (let i = 0; i < 5; i++) { const ph = (t * .6 + i * .21) % 1; ctx.beginPath(); ctx.arc(Math.sin(i * 2.7) * u * .4, u * .2 + ph * hover, u * .012, 0, TAU); ctx.fill(); } }
  ctx.restore();
}

// Its moth-lings (fire orbs with `moth`) and kindling dust.
export function drawMothEffect(ctx, f, s, now, { reduceMotion = false } = {}) {
  const A = MOTH_ART, x = (f.x + .5) * s, y = (f.y + .62) * s, r = (Number(f.radius) || .5) * s, life = Math.max(0, Number(f.life) || 0);
  ctx.save();
  if (f.kind === "orb" && f.moth) {
    const cy = y - s * .45, flap = reduceMotion ? .6 : .5 + .5 * Math.sin(now / 40 + f.x * 7), a = Math.atan2(f.vy, f.vx);
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, s * .4); g.addColorStop(0, "rgba(255,176,74,.55)"); g.addColorStop(1, "rgba(255,176,74,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, s * .4, 0, TAU); ctx.fill();
    ctx.translate(x, cy); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = A.fire;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * s * .16 * (.4 + flap), 0, s * .16 * (.4 + flap), s * .11, side * .4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = A.fireCore; ctx.beginPath(); ctx.ellipse(0, 0, s * .045, s * .1, 0, 0, TAU); ctx.fill();
  } else if (f.kind === "emberDust") {
    if (f.arming > 0) { // a slow cloud of glowing dust, brightening as it is about to flare
      const total = Math.max(.001, Number(f.armTotal) || 1), k = 1 - f.arming / total;
      ctx.fillStyle = `rgba(120,110,100,${.25 + .15 * k})`; ctx.beginPath(); ctx.ellipse(x, y - s * .2, r * .9, r * .55, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 9; i++) { const a = i * 2.4 + f.x * 3 + (reduceMotion ? 0 : now / 900), d = r * (.2 + (i % 4) * .2); ctx.fillStyle = i % 3 ? `rgba(255,138,42,${.4 + .5 * k})` : `rgba(255,226,176,${.3 + .6 * k})`; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - s * .2 + Math.sin(a) * d * .5, Math.max(1, s * (.025 + .02 * k)), 0, TAU); ctx.fill(); }
    } else { // the flare
      ctx.globalAlpha = Math.min(1, life * 3); const g = ctx.createRadialGradient(x, y - s * .2, 0, x, y - s * .2, r * 1.2); g.addColorStop(0, "rgba(255,240,200,.95)"); g.addColorStop(.4, "rgba(255,138,42,.8)"); g.addColorStop(1, "rgba(255,90,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * .2, r * 1.2, r * .9, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
