// The Crimson Tyrant's body and effects (release 709). Drawing only: nothing here changes combat state.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). An original red dragon: four
// legs, two great membrane wings, a long horned head on an S-curved neck, a heavy tail that is never still.
import { DRAGON, DANGER } from "./monster-pack.js?v=r709-3788b27b0267";

const TAU = Math.PI * 2;
export const DRAGON_ART = {
  hide: "#a8221a", hideDark: "#5a0f0b", hideLight: "#d2452e", belly: "#e09a4a", bellyDark: "#a86428", horn: "#2a1c18", hornLight: "#5a4a40",
  membrane: "#7a1410", membraneLight: "#b8382a", bone: "#3a0c0a", eye: "#ffd24a", fire: "#ff7a1a", fireCore: "#fff0c0", ember: "#ffb04a",
};
export const DRAGON_EFFECT_KINDS = new Set(["fireLine", "dragonMeteor", "dragonComet", "dragonBurst", "dragonScorch", "colonize", "dragonNova", "clawBeam"]);

const smoothing = new WeakMap();
function eased(e, key, target, now, rate) {
  const st = smoothing.get(e) || {}; smoothing.set(e, st);
  const prev = st[key], last = st["@" + key], dt = last == null ? 0 : Math.min(.1, Math.max(0, (now - last) / 1000)); st["@" + key] = now;
  if (!Number.isFinite(prev) || !(dt > 0)) { st[key] = target; return target; }
  st[key] = prev + (target - prev) * Math.min(1, dt * rate); return st[key];
}
// head: + raised; wing: 0 folded … 1 spread; rear: body tilted up at the front; jaw: open.
const POSES = {
  idle: { head: 0, wing: .15, rear: 0, jaw: 0 }, rise: { head: .2, wing: 1, rear: .1, jaw: 0 }, fly: { head: -.2, wing: 1, rear: -.05, jaw: .6 }, land: { head: -.1, wing: .5, rear: 0, jaw: 0 },
  rear: { head: .3, wing: .4, rear: .35, jaw: .3 }, rearBoth: { head: .4, wing: .6, rear: .5, jaw: .4 }, slam: { head: -.25, wing: .3, rear: -.1, jaw: .5 }, slamBoth: { head: -.3, wing: .5, rear: -.15, jaw: .6 },
  crouch: { head: -.15, wing: .3, rear: -.08, jaw: 0 }, hop: { head: .1, wing: .8, rear: .1, jaw: 0 }, wingLash: { head: 0, wing: 1, rear: .05, jaw: .3 },
  headUp: { head: .9, wing: .3, rear: .15, jaw: .7 }, charge: { head: .2, wing: .2, rear: .05, jaw: .3 }, breath: { head: -.05, wing: .25, rear: 0, jaw: 1 },
  colonize: { head: 1, wing: .7, rear: .2, jaw: .5 }, roar: { head: .6, wing: .9, rear: .15, jaw: 1 }, spinReady: { head: -.1, wing: .2, rear: 0, jaw: .2 }, spin: { head: -.1, wing: .3, rear: 0, jaw: .3 },
  tailSpin: { head: 0, wing: .2, rear: 0, jaw: .2 }, tailReady: { head: 0, wing: .2, rear: 0, jaw: 0 }, tailL: { head: 0, wing: .2, rear: 0, jaw: .2, tail: -1 }, tailR: { head: 0, wing: .2, rear: 0, jaw: .2, tail: 1 },
  roll: { head: -.2, wing: 0, rear: 0, jaw: 0 }, nova: { head: .5, wing: 1, rear: .1, jaw: 1 },
};

export function drawCrimsonTyrant(ctx, q, now = 0) {
  const A = DRAGON_ART, { k, u, flip, e } = q, reduce = !!e.reduceMotion, t = now / 1000, P = POSES[e.dragonPose] || POSES.idle;
  const air = Math.max(0, Number(e.dragonAir) || 0) * (q.s || u), ground = q.b, b = ground - air;
  const head = eased(e, "head", P.head + (e.dragonSway || 0) * .15, now, 7), wing = eased(e, "wing", P.wing, now, 6), rear = eased(e, "rear", P.rear, now, 7), jaw = eased(e, "jaw", P.jaw, now, 10);
  const charge = Math.max(0, Math.min(1, Number(e.dragonCharge) || 0)), flap = reduce ? 0 : Math.sin(t * (wing > .7 ? 6 : 1.4)) * (wing > .7 ? .2 : .04);
  const tailSwing = (reduce ? 0 : Math.sin(t * 1.6) * .25) + (P.tail || 0) * .9 + (e.dragonSway || 0) * .2;
  // Shadow, smaller as it climbs.
  const lift = Math.min(1, air / Math.max(1, u * 2));
  ctx.fillStyle = `rgba(10,4,2,${.45 * (1 - lift * .5)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * 1.1 * (1 - lift * .3), u * .2 * (1 - lift * .3), 0, 0, TAU); ctx.fill();
  if (charge > 0 || e.dragonPose === "nova") { const R = u * (.8 + charge * 1.2), g = ctx.createRadialGradient(k, b - u * .6, u * .1, k, b - u * .6, R); g.addColorStop(0, `rgba(255,170,60,${.25 + charge * .35})`); g.addColorStop(1, "rgba(255,120,40,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(k, b - u * .6, R, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(k, 0);
  // A whirl: the body turns on the spot (the facing flips as it goes round), blurred arcs round it.
  let face = flip; if (e.dragonSpin) { const c = Math.cos(e.dragonSpin); face = c >= 0 ? 1 : -1; ctx.scale(Math.max(.25, Math.abs(c)), 1); ctx.strokeStyle = "rgba(255,180,90,.35)"; ctx.lineWidth = u * .05; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, b - u * .3, u * (1.1 + i * .25), u * (.3 + i * .06), 0, e.dragonSpin + i, e.dragonSpin + i + 2); ctx.stroke(); } }
  ctx.scale(face, 1);
  if (e.dragonPose === "roll") { ctx.translate(0, b - u * .4); ctx.rotate(reduce ? .8 : t * 9); ctx.translate(0, -(b - u * .4)); }
  const lw = Math.max(1, u * .01), hipX = -u * .45, hipY = b - u * .5;
  const R = (x, y) => { const dx = x, dy = y, c = Math.cos(-rear), sn = Math.sin(-rear); return [hipX + (dx - hipX / u * 0) * 0 + (x * u - hipX) * c - y * u * sn, hipY + (x * u - hipX) * sn + y * u * c]; };
  const shape = (pts, fill, edge = A.bone) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); } ctx.lineTo(...pts[pts.length - 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.stroke(); };
  const limb = (pts, w0, w1, tone) => { const n = pts.length; ctx.fillStyle = tone; ctx.beginPath(); const L = [], Rt = []; for (let i = 0; i < n; i++) { const [x, y] = pts[i], [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(n - 1, i + 1)], dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (n - 1)) / 2; L.push([x - dy / l * w, y + dx / l * w]); Rt.push([x + dy / l * w, y - dx / l * w]); } ctx.moveTo(...L[0]); for (const p of L) ctx.lineTo(...p); for (const p of Rt.reverse()) ctx.lineTo(...p); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bone; ctx.lineWidth = lw; ctx.stroke(); };
  const claws = (x, y, dir = 1) => { ctx.fillStyle = A.horn; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * u * .05, y - u * .02); ctx.quadraticCurveTo(x + i * u * .05 + dir * u * .05, y, x + i * u * .06 + dir * u * .09, y + u * .01); ctx.lineTo(x + i * u * .05, y + u * .01); ctx.closePath(); ctx.fill(); } };
  // ---- the wing: an arm of bone with three long fingers and a membrane between them.
  const wingAt = (sx, sy, far) => { // folded: fingers swept back along the body; spread: a wide fan over the back
    const k2 = Math.max(0, Math.min(1, wing)), lerp = (a, b2) => a + (b2 - a) * k2, arm = lerp(-2.25, -1.7) + flap * .6, armL = u * lerp(.28, .48);
    const ex = sx + Math.cos(arm) * armL, ey = sy + Math.sin(arm) * armL;
    const fold = [-2.75, -2.95, -3.1], open = [-1.2, -1.85, -2.6], lenF = [.6, .52, .42], lenO = [1.25, 1.1, .85];
    const tips = [0, 1, 2].map((i) => { const a = lerp(fold[i], open[i]) + flap * (1 - i * .3), L = u * lerp(lenF[i], lenO[i]) * (far ? .9 : 1); return [ex + Math.cos(a) * L, ey + Math.sin(a) * L]; });
    const back = [sx - u * lerp(.45, .6), sy + u * .02];
    const g = ctx.createLinearGradient(ex, ey - u * .8, sx, sy + u * .2); g.addColorStop(0, far ? A.membrane : A.membraneLight); g.addColorStop(1, far ? A.hideDark : A.membrane);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(...tips[0]);
    const scallop = (a, b2) => { const mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2, dx = ex - mx, dy = ey - my; ctx.quadraticCurveTo(mx + dx * .28, my + dy * .28, b2[0], b2[1]); };
    scallop(tips[0], tips[1]); scallop(tips[1], tips[2]); scallop(tips[2], back); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.bone; ctx.lineWidth = Math.max(1, u * .022); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); for (const [x, y] of tips) { ctx.moveTo(ex, ey); ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = "rgba(40,6,4,.4)"; ctx.lineWidth = Math.max(1, u * .008); ctx.stroke();
    ctx.fillStyle = A.horn; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(arm - 1.2) * u * .09, ey + Math.sin(arm - 1.2) * u * .09); ctx.lineTo(ex + Math.cos(arm + .4) * u * .04, ey + Math.sin(arm + .4) * u * .04); ctx.closePath(); ctx.fill(); // the wing claw
  };
  const [wfx, wfy] = R(.1, -.42); wingAt(wfx - u * .05, wfy, true);
  // ---- the tail: long, heavy, tapering to a spiked club, swinging behind.
  { const segs = 11, pts = []; let x = hipX - u * .05, y = hipY - u * .08, a = Math.PI - .45; // a heavy tail that tapers to a spiked tip, swaying in an S
    for (let i = 0; i <= segs; i++) { pts.push([x, y]); const k2 = i / segs; a += .09 + Math.sin(t * 1.8 - i * .55) * (reduce ? 0 : .09) * k2 + tailSwing * .1 * k2; x += Math.cos(a) * u * .14; y += Math.sin(a) * u * .14 * .55; }
    limb(pts, u * .32, u * .03, A.hide);
    ctx.fillStyle = A.belly; for (let i = 1; i < segs; i += 2) { const [px, py] = pts[i]; ctx.beginPath(); ctx.ellipse(px, py + u * .04 * (1 - i / segs), u * .05 * (1 - i / segs) + u * .01, u * .025, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = A.horn; for (let i = 0; i < segs; i += 2) { const [px, py] = pts[i], hgt = u * .09 * (1 - i / segs) + u * .02; ctx.beginPath(); ctx.moveTo(px - u * .04, py - u * .12 * (1 - i / segs)); ctx.lineTo(px - u * .06, py - u * .12 * (1 - i / segs) - hgt); ctx.lineTo(px + u * .01, py - u * .12 * (1 - i / segs)); ctx.closePath(); ctx.fill(); }
    const [tx, ty] = pts[segs]; ctx.fillStyle = A.horn; ctx.beginPath(); for (let i = 0; i < 5; i++) { const aa = i * TAU / 5 + t * (reduce ? 0 : .5); ctx.lineTo(tx + Math.cos(aa) * u * .11, ty + Math.sin(aa) * u * .07); ctx.lineTo(tx + Math.cos(aa + .6) * u * .04, ty + Math.sin(aa + .6) * u * .03); } ctx.closePath(); ctx.fill(); }
  // ---- legs: far pair, then body, then near pair.
  const step = (x, y, front, far) => {
    const tone = far ? A.hideDark : A.hide, foot = b - (air ? u * .1 : 0), slam = front && (e.dragonPose === "rear" || e.dragonPose === "rearBoth") ? u * .35 : 0, fx = x + (front ? u * .1 : -u * .05), fy = foot - slam;
    if (front) limb([[x, y], [x + u * .06, y + (fy - y) * .45], [fx - u * .02, fy - u * .12], [fx, fy - u * .03]], u * .26, u * .11, tone);
    else limb([[x, y], [x + u * .14, y + (fy - y) * .35], [x - u * .05, y + (fy - y) * .7], [fx, fy - u * .03]], u * .34, u * .11, tone);
    claws(fx + u * .03, fy - u * .01, 1);
  };
  const [fsx, fsy] = R(.55, .02), [hsx, hsy] = R(-.05, 0);
  step(hsx + u * .08, hsy, false, true); step(fsx + u * .08, fsy, true, true);
  // ---- body: a deep chest, a strong back with a row of spines, a pale armoured belly.
  { const body = [R(-.08, -.05), R(-.02, -.38), R(.35, -.5), R(.75, -.42), R(.92, -.15), R(.82, .1), R(.45, .2), R(.05, .14), R(-.12, .06)];
    const [gx0, gy0] = R(.4, -.5), [gx1, gy1] = R(.4, .2), g = ctx.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, A.hideLight); g.addColorStop(.5, A.hide); g.addColorStop(1, A.hideDark); shape(body, g);
    ctx.save(); ctx.beginPath(); ctx.moveTo(...body[0]); for (const p of body) ctx.lineTo(...p); ctx.closePath(); ctx.clip();
    ctx.fillStyle = A.belly; for (let i = 0; i < 6; i++) { const [px, py] = R(.12 + i * .12, .12 - Math.sin(i * .5) * .03); ctx.beginPath(); ctx.ellipse(px, py, u * .07, u * .05, -rear, 0, TAU); ctx.fill(); ctx.strokeStyle = A.bellyDark; ctx.lineWidth = lw; ctx.stroke(); }
    ctx.strokeStyle = "rgba(60,8,6,.35)"; ctx.lineWidth = lw; for (let i = 0; i < 8; i++) { const [ax, ay] = R(.05 + i * .11, -.42 + Math.abs(i - 3.5) * .02); const [bx, by] = R(.1 + i * .11, .05); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + u * .04, (ay + by) / 2, bx, by); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = A.horn; for (let i = 0; i < 7; i++) { const [px, py] = R(.02 + i * .12, -.4 - Math.sin(i * .45) * .1); ctx.beginPath(); ctx.moveTo(px - u * .05, py + u * .02); ctx.lineTo(px - u * .07, py - u * .13); ctx.lineTo(px + u * .03, py + u * .01); ctx.closePath(); ctx.fill(); } }
  step(hsx - u * .04, hsy + u * .03, false, false);
  // ---- neck and head: an S-curve rising forward from the chest to a long horned head.
  const [nx0, ny0] = R(.8, -.3), ha = -.75 - head * .9, n1x = nx0 + Math.cos(ha) * u * .35, n1y = ny0 + Math.sin(ha) * u * .35, hx = n1x + Math.cos(ha + .5 + head * .3) * u * .3, hy = n1y + Math.sin(ha + .5 + head * .3) * u * .3;
  limb([[nx0 - u * .05, ny0 + u * .05], [nx0 + (n1x - nx0) * .5 + u * .03, ny0 + (n1y - ny0) * .5], [n1x, n1y], [hx, hy]], u * .34, u * .16, A.hide);
  ctx.fillStyle = A.belly; for (let i = 1; i < 5; i++) { const k2 = i / 5, px = nx0 + (hx - nx0) * k2 + u * .07, py = ny0 + (hy - ny0) * k2 + u * .05; ctx.beginPath(); ctx.ellipse(px, py, u * .05, u * .03, ha, 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.horn; for (let i = 0; i < 4; i++) { const k2 = i / 4, px = nx0 + (hx - nx0) * k2 - u * .06, py = ny0 + (hy - ny0) * k2 - u * .06; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - u * .07, py - u * .08); ctx.lineTo(px + u * .03, py - u * .01); ctx.closePath(); ctx.fill(); }
  const fa = ha + 1.25 + head * .6; ctx.save(); ctx.translate(hx, hy); ctx.rotate(fa);
  // horns behind the head: two great swept horns, then a crown of short ones
  ctx.fillStyle = A.horn; ctx.strokeStyle = A.hornLight; ctx.lineWidth = lw;
  for (const [ox, len] of [[-.04, .42], [.03, .34]]) { ctx.beginPath(); ctx.moveTo(u * ox, -u * .08); ctx.bezierCurveTo(u * (ox - .1), -u * .2, u * (ox - .28), -u * .24, u * (ox - len), -u * .12); ctx.bezierCurveTo(u * (ox - .26), -u * .17, u * (ox - .1), -u * .12, u * (ox + .04), -u * .05); ctx.closePath(); ctx.fill(); ctx.stroke(); } // two swept horns, crescent-thin
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(u * (.02 + i * .05), -u * .08); ctx.lineTo(u * (-.02 + i * .05), -u * .17); ctx.lineTo(u * (.05 + i * .05), -u * .07); ctx.closePath(); ctx.fill(); }
  // skull and upper jaw, lower jaw hinged open
  const open = jaw * .5;
  ctx.save(); ctx.rotate(open * .5); ctx.fillStyle = A.hideDark; ctx.beginPath(); ctx.moveTo(-u * .02, u * .02); ctx.lineTo(u * .36, u * .03); ctx.lineTo(u * .33, u * .08); ctx.lineTo(-u * .02, u * .1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bone; ctx.stroke();
  ctx.fillStyle = "#fff4e0"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(u * (.06 + i * .06), u * .03); ctx.lineTo(u * (.08 + i * .06), -u * .005); ctx.lineTo(u * (.1 + i * .06), u * .03); ctx.closePath(); ctx.fill(); } ctx.restore();
  if (jaw > .2 || charge > 0) { const g = ctx.createRadialGradient(u * .16, u * .04, 0, u * .16, u * .04, u * (.12 + charge * .25)); g.addColorStop(0, A.fireCore); g.addColorStop(.5, `rgba(255,140,40,${.5 + charge * .5})`); g.addColorStop(1, "rgba(255,90,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u * .16, u * .04, u * (.12 + charge * .25), 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.hide; ctx.beginPath(); ctx.moveTo(-u * .1, -u * .08); ctx.bezierCurveTo(u * .05, -u * .13, u * .25, -u * .08, u * .4, -u * .02); ctx.lineTo(u * .39, u * .03); ctx.lineTo(u * .02, u * .03); ctx.quadraticCurveTo(-u * .1, u * .02, -u * .1, -u * .08); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bone; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = "#fff4e0"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(u * (.08 + i * .06), u * .03); ctx.lineTo(u * (.1 + i * .06), u * .06); ctx.lineTo(u * (.12 + i * .06), u * .03); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = A.hideDark; ctx.beginPath(); ctx.moveTo(u * .02, -u * .07); ctx.quadraticCurveTo(u * .12, -u * .1, u * .2, -u * .07); ctx.stroke(); // brow ridge
  ctx.fillStyle = A.eye; ctx.beginPath(); ctx.ellipse(u * .1, -u * .055, u * .028, u * .014, -.15, 0, TAU); ctx.fill(); ctx.fillStyle = "#1a0400"; ctx.fillRect(u * .098, -u * .066, u * .006, u * .022);
  ctx.fillStyle = "#1a0400"; ctx.beginPath(); ctx.ellipse(u * .36, -u * .02, u * .012, u * .007, 0, 0, TAU); ctx.fill(); // nostril
  ctx.restore();
  // The sun it raises over its head when it claims the ground, and the heat it draws in for the Sunfall.
  if (e.dragonPose === "colonize" || e.dragonPose === "nova") { const R0 = u * (.15 + charge * (e.dragonPose === "nova" ? .9 : .55)), cx = hx + u * .1, cy = hy - u * .5 - charge * u * .4, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 1.6); g.addColorStop(0, "#fffbe8"); g.addColorStop(.35, "#ffd060"); g.addColorStop(.7, "rgba(255,110,30,.7)"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0 * 1.6, 0, TAU); ctx.fill();
    if (!reduce) { ctx.strokeStyle = "rgba(255,200,120,.6)"; ctx.lineWidth = Math.max(1, u * .015); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 2, r0 = R0 * (2.6 - ((t * 1.5 + i * .3) % 1) * 1.6); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r0 * .7, cy + Math.sin(a) * r0 * .7); ctx.stroke(); } } }
  step(fsx - u * .02, fsy + u * .04, true, false);
  const [wnx, wny] = R(.18, -.4); wingAt(wnx, wny, false);
  ctx.restore();
}

// ---- effects
function flame(ctx, x, y, h, w, now, seed = 0, reduce = false) { for (let i = 0; i < 3; i++) { const sx = x + (i - 1) * w * .45, fh = h * (.7 + .3 * Math.sin((reduce ? 0 : now / 90) + seed + i * 1.7)); ctx.fillStyle = i === 1 ? "rgba(255,200,90,.92)" : "rgba(255,100,30,.85)"; ctx.beginPath(); ctx.moveTo(sx - w * .3, y); ctx.quadraticCurveTo(sx - w * .1, y - fh * .6, sx, y - fh); ctx.quadraticCurveTo(sx + w * .1, y - fh * .6, sx + w * .3, y); ctx.closePath(); ctx.fill(); } }
function warn(ctx, x, y, r, progress) { ctx.fillStyle = DANGER.fill; ctx.strokeStyle = DANGER.edge; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = DANGER.fillStrong; ctx.beginPath(); ctx.ellipse(x, y, r * progress, r * .6 * progress, 0, 0, TAU); ctx.fill(); }
export function drawDragonEffect(ctx, f, s, now, { reduceMotion = false } = {}) {
  const x = (f.x + .5) * s, y = (f.y + .62) * s, r = (Number(f.radius) || .5) * s, life = Math.max(0, Number(f.life) || 0), age = Number(f.age) || 0, total = Number(f.total) || 1;
  ctx.save();
  if (f.kind === "fireLine") {
    for (let k = 0; k < f.steps; k++) { const px = (f.x + f.dx * k * f.step + .5) * s, py = (f.y + f.dy * k * f.step + .62) * s, at = f.warn + k * f.every, since = age - at;
      if (since < 0) warn(ctx, px, py, r, Math.max(0, Math.min(1, age / at))); else if (since < .6) { ctx.globalAlpha = Math.min(1, (.6 - since) * 3); flame(ctx, px, py, s * 1.1 * Math.min(1, since * 8), s * .5, now, k, reduceMotion); ctx.globalAlpha = 1; } }
  } else if (f.kind === "dragonMeteor") {
    if (f.arming > 0) { const k = 1 - f.arming / Math.max(.01, f.armTotal || 1), fy = y - s * 6 * (1 - k); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y, r * .5 * k, r * .3 * k, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(x, fy, 0, x, fy, s * .35); g.addColorStop(0, "#fff0c0"); g.addColorStop(.5, "#ff9a2a"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, fy, s * .35, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(255,150,60,.5)"; ctx.lineWidth = s * .08; ctx.beginPath(); ctx.moveTo(x, fy - s * .4); ctx.lineTo(x, fy - s * 1.1); ctx.stroke(); }
    else { ctx.globalAlpha = Math.min(1, life * 3); flame(ctx, x, y, s * 1.2, r * 1.2, now, f.x, reduceMotion); const g = ctx.createRadialGradient(x, y - s * .3, 0, x, y - s * .3, r * 1.3); g.addColorStop(0, "rgba(255,230,160,.8)"); g.addColorStop(1, "rgba(255,90,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - s * .3, r * 1.3, 0, TAU); ctx.fill(); }
  } else if (f.kind === "dragonComet") {
    if (f.to) { const lx = (f.to.x + .5) * s, ly = (f.to.y + .62) * s; warn(ctx, lx, ly, (f.blast || 2) * s, .5); }
    const cy = y - s * .7, m = Math.hypot(f.vx, f.vy) || 1; for (let i = 6; i >= 1; i--) { ctx.fillStyle = `rgba(255,${120 + i * 10},40,${.45 / i})`; ctx.beginPath(); ctx.arc(x - f.vx / m * r * i * .9, cy - f.vy / m * r * i * .9, r * (1 - i * .1), 0, TAU); ctx.fill(); }
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, r * 1.3); g.addColorStop(0, "#fffbe0"); g.addColorStop(.5, "#ffb040"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, r * 1.3, 0, TAU); ctx.fill();
  } else if (f.kind === "dragonBurst") {
    const k = 1 - life / Math.max(.01, total), R = r * (.5 + k * .6); ctx.globalAlpha = Math.min(1, life * 3); const g = ctx.createRadialGradient(x, y - s * .3, 0, x, y - s * .3, R); g.addColorStop(0, "rgba(255,250,220,.95)"); g.addColorStop(.4, "rgba(255,150,50,.85)"); g.addColorStop(1, "rgba(255,70,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * .3, R, R * .8, 0, 0, TAU); ctx.fill();
  } else if (f.kind === "dragonScorch") {
    const front = (Number(f.front) || 0) * s, a0 = f.angle - (f.arc >= 360 ? Math.PI : f.arc * Math.PI / 360), a1 = f.arc >= 360 ? a0 + TAU : f.angle + f.arc * Math.PI / 360, fade = Math.min(1, life);
    ctx.globalAlpha = fade; ctx.fillStyle = "rgba(60,14,4,.5)"; ctx.beginPath(); ctx.moveTo(x, y); ctx.ellipse(x, y, front, front * .6, 0, a0, a1); ctx.closePath(); ctx.fill();
    const n = Math.max(6, Math.floor(front / (s * .55))); for (let i = 0; i < n * 2; i++) { const a = a0 + (a1 - a0) * ((i * .618) % 1), d = front * (.25 + ((i * .37) % .75)); flame(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * .6, s * .45, s * .3, now, i, reduceMotion); }
    if (front < (f.reach || 7) * s - 1) { ctx.strokeStyle = "rgba(255,200,90,.9)"; ctx.lineWidth = s * .2; ctx.beginPath(); ctx.ellipse(x, y, front, front * .6, 0, a0, a1); ctx.stroke(); }
  } else if (f.kind === "colonize") { // the ground it is about to claim: glowing cracks, brighter as the sun grows
    const k = Math.min(1, age / Math.max(.1, total - .2)), pulse = reduceMotion ? .8 : .6 + .4 * Math.sin(now / 120);
    ctx.strokeStyle = `rgba(255,120,30,${(.25 + k * .55) * pulse})`; ctx.lineWidth = Math.max(1, s * .05);
    for (const i of f.tiles || []) { const tx = (i % 32 + .5) * s, ty = (Math.floor(i / 32) + .62) * s; ctx.beginPath(); ctx.moveTo(tx - s * .3, ty - s * .1); ctx.lineTo(tx - s * .05, ty + s * .05); ctx.lineTo(tx + s * .1, ty - s * .12); ctx.lineTo(tx + s * .32, ty + s * .08); ctx.stroke(); }
  } else if (f.kind === "dragonNova") {
    const k = 1 - life / Math.max(.01, total), R = r * (.3 + k * .9); ctx.globalAlpha = Math.min(1, life * 2); const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, "rgba(255,255,240,.95)"); g.addColorStop(.5, "rgba(255,180,70,.7)"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R, R * .7, 0, 0, TAU); ctx.fill();
  } else if (f.kind === "clawBeam") {
    const a = Math.atan2(f.vy, f.vx); ctx.translate(x, y - s * .4); ctx.rotate(a); ctx.strokeStyle = "rgba(255,170,60,.9)"; ctx.lineWidth = Math.max(2, s * .09); ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(-s * .2, 0, s * .45, -.9, .9); ctx.stroke(); ctx.strokeStyle = "rgba(255,245,210,.9)"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.arc(-s * .2, 0, s * .45, -.7, .7); ctx.stroke();
  }
  ctx.restore();
}
