// The Crimson Tyrant's body and effects (release 709). Drawing only: nothing here changes combat state.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). An original red dragon: four
// legs, two great membrane wings, a long horned head on an S-curved neck, a heavy tail that is never still.
import { DRAGON, DANGER } from "./monster-pack.js?v=r737-432cda93ac7c";

const TAU = Math.PI * 2;
export const DRAGON_ART = {
  hide: "#a8221a", hideDark: "#5a0f0b", hideLight: "#d2452e", belly: "#e09a4a", bellyDark: "#a86428", horn: "#2a1c18", hornLight: "#5a4a40",
  membrane: "#7a1410", membraneLight: "#b8382a", bone: "#3a0c0a", eye: "#ffd24a", fire: "#ff7a1a", fireCore: "#fff0c0", ember: "#ffb04a", glow: "255,140,40", aura: "255,170,60", teeth: "#fff4e0", cracks: null, horns: [[-.06, .6], [0, .5], [.05, .38]], scallop: .28,
  // Its build (release 710): long and lean, a long neck, a long thin tail trailing out behind.
  build: { bodyLen: 1.14, bodyH: .74, legLen: 1.18, legW: .78, neckLen: 1.4, neckW: .78, tailSegs: 19, tailStep: .095, tailW: .3, tailTip: .012, tailBend: .03, tailWave: .07, tailStart: .38, headScale: 1.15, snout: 1.25, lean: true },
};
export const DRAGON_EFFECT_KINDS = new Set(["fireLine", "dragonMeteor", "dragonComet", "dragonBurst", "dragonScorch", "colonize", "dragonNova", "clawBeam"]);

// The walk: one stride cycle per `stride` tiles walked; feet swing `reach` and lift `lift` (in u).
export const DRAGON_GAIT = { stride: 2.4, reach: .16, lift: .07 };
// The default build (the Doom Chaser's, heavy): each dragon's art table may override any of it (`build`).
export const DRAGON_BUILD = { bodyLen: 1, bodyH: 1, legLen: 1, legW: 1, neckLen: 1, neckW: 1, tailSegs: 12, tailStep: .1, tailW: .4, tailTip: .05, tailBend: .085, tailWave: 0, tailStart: .55, headScale: 1.3, snout: 1, lean: false };
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
  // release 710 (the Doom Chaser): walking on its wings, a lunging bite, hanging under its black sun
  wingWalk: { head: -.15, wing: .9, rear: -.08, jaw: .4 }, wingL: { head: -.25, wing: 1, rear: -.15, jaw: .6 }, wingR: { head: -.2, wing: .75, rear: -.05, jaw: .6 },
  bite: { head: -.3, wing: .3, rear: -.12, jaw: 1 }, eclipse: { head: .4, wing: 1, rear: .1, jaw: .8 },
};

export function drawCrimsonTyrant(ctx, q, now = 0) { drawDragonBody(ctx, q, now, DRAGON_ART); }
// The shared dragon body (release 710: the Doom Chaser wears it in its own colours).
export function drawDragonBody(ctx, q, now = 0, A = DRAGON_ART) {
  const { k, u, flip, e } = q, reduce = !!e.reduceMotion, t = now / 1000, P = POSES[e.dragonPose] || POSES.idle;
  const air = Math.max(0, Number(e.dragonAir) || 0) * (q.s || u), ground = q.b;
  // ---- motion: how far it has walked (the gait), which way it is going (a smooth turn; foreshortened going up or down the screen)
  const st = smoothing.get(e) || {}; smoothing.set(e, st);
  const dtm = st.lastT == null ? 0 : Math.min(.1, Math.max(0, (now - st.lastT) / 1000)), mvx = st.lastX == null ? 0 : (Number(e.x) || 0) - st.lastX, mvy = st.lastY == null ? 0 : (Number(e.y) || 0) - st.lastY;
  st.lastT = now; st.lastX = Number(e.x) || 0; st.lastY = Number(e.y) || 0;
  const moved = Math.hypot(mvx, mvy) < 2 ? Math.hypot(mvx, mvy) : 0, speed = dtm > 0 ? moved / dtm : 0, grounded = air < u * .05 && !e.dragonSpin && e.dragonPose !== "roll";
  st.phase = (st.phase || 0) + (grounded ? moved * TAU / DRAGON_GAIT.stride : 0);
  const walking = eased(e, "walk", grounded && speed > .2 ? 1 : 0, now, 6), vert = eased(e, "vert", moved > .001 ? Math.abs(mvy) / (moved || 1) : (st.vertHeld ?? 0), now, 4); st.vertHeld = vert;
  const phase = reduce ? 0 : st.phase, breathe = reduce ? 0 : Math.sin(t * 1.7) * .012;
  const head = eased(e, "head", P.head + (e.dragonSway || 0) * .15 + (reduce ? 0 : Math.sin(t * .9) * .05) + walking * Math.sin(phase * 2) * .04, now, 7), wing = eased(e, "wing", P.wing, now, 6), rear = eased(e, "rear", P.rear, now, 7), jaw = eased(e, "jaw", P.jaw, now, 10);
  const charge = Math.max(0, Math.min(1, Number(e.dragonCharge) || 0)), flap = reduce ? 0 : Math.sin(t * (wing > .7 ? 6 : 1.4)) * (wing > .7 ? .2 : .04);
  const tailSwing = (reduce ? 0 : Math.sin(t * 1.6) * .25) + (P.tail || 0) * .9 + (e.dragonSway || 0) * .2 + walking * Math.sin(phase) * .25;
  const bob = walking * Math.abs(Math.sin(phase)) * u * .025, b = ground - air - bob - (air ? Math.sin(t * 2.4) * u * .03 : 0);
  // Shadow, smaller as it climbs.
  const lift = Math.min(1, air / Math.max(1, u * 2));
  ctx.fillStyle = `rgba(10,4,2,${.42 * (1 - lift * .5)})`; ctx.beginPath(); ctx.ellipse(k, ground, u * .95 * (1 - lift * .3) * (1 - vert * .3), u * .2 * (1 - lift * .3) * (1 + vert * .4), 0, 0, TAU); ctx.fill();
  if (charge > 0 || e.dragonPose === "nova") { const R = u * (.8 + charge * 1.2), g = ctx.createRadialGradient(k, b - u * .6, u * .1, k, b - u * .6, R); g.addColorStop(0, `rgba(${A.aura},${.25 + charge * .35})`); g.addColorStop(1, `rgba(${A.aura},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(k, b - u * .6, R, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(k, 0);
  // A whirl: the body turns on the spot, blurred arcs round it. Otherwise it turns smoothly when it changes direction.
  const turn = eased(e, "face", flip, now, 9); let face = Math.sign(turn || flip) * Math.max(.4, Math.abs(turn));
  if (e.dragonSpin) { const c = Math.cos(e.dragonSpin); face = c >= 0 ? 1 : -1; ctx.scale(Math.max(.25, Math.abs(c)), 1); ctx.strokeStyle = `rgba(${A.aura},.35)`; ctx.lineWidth = u * .05; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, b - u * .3, u * (1.1 + i * .25), u * (.3 + i * .06), 0, e.dragonSpin + i, e.dragonSpin + i + 2); ctx.stroke(); } }
  { const down = st.lastDy = moved > .001 ? Math.sign(mvy) : (st.lastDy || 0); ctx.translate(0, ground); ctx.rotate(vert * down * .1 * Math.sign(face)); ctx.translate(0, -ground); }
  ctx.scale(face * (1 - vert * .22), 1);
  if (e.dragonPose === "roll") { ctx.translate(0, b - u * .4); ctx.rotate(reduce ? .8 : t * 9); ctx.translate(0, -(b - u * .4)); }
  const BD = { ...DRAGON_BUILD, ...(A.build || {}) }, lw = Math.max(1, u * .009), hipX = -u * .3, hipY = b - u * .44 * BD.legLen;
  // Body-local coordinates (x forward, y down, in u from the hips), tilted by `rear` about the hips, breathing.
  const R = (x, y) => { const c = Math.cos(-rear), sn = Math.sin(-rear), X0 = x * u * BD.bodyLen, Y0 = y * u * BD.bodyH * (1 + breathe); return [hipX + X0 * c - Y0 * sn, hipY + X0 * sn + Y0 * c]; };
  const smooth = (pts, closed = true) => { const n = pts.length; ctx.beginPath(); if (closed) { const m = (i) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2]; ctx.moveTo(...m(n - 1)); for (let i = 0; i < n; i++) { const mm = m(i); ctx.quadraticCurveTo(pts[i][0], pts[i][1], mm[0], mm[1]); } ctx.closePath(); } else { ctx.moveTo(...pts[0]); for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); ctx.lineTo(...pts[n - 1]); } };
  // A tapering tube along a spine, its outline smoothed; returns its two edges.
  const limb = (pts, w0, w1, tone, edge = A.bone) => { const n = pts.length, L = [], Rt = []; for (let i = 0; i < n; i++) { const [x, y] = pts[i], [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(n - 1, i + 1)], dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (n - 1)) / 2; L.push([x - dy / l * w, y + dx / l * w]); Rt.push([x + dy / l * w, y - dx / l * w]); }
    smooth([...L, ...[...Rt].reverse()]); ctx.fillStyle = tone; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.stroke(); } return { L, R: Rt }; };
  const claws = (x, y) => { ctx.fillStyle = A.horn; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * u * .045, y - u * .025); ctx.quadraticCurveTo(x + i * u * .045 + u * .06, y - u * .01, x + i * u * .05 + u * .08, y + u * .012); ctx.lineTo(x + i * u * .045, y + u * .008); ctx.closePath(); ctx.fill(); } };
  const ik = (ax, ay, bx, by, l1, l2, bend) => { const d = Math.min(l1 + l2 - .001, Math.max(.001, Math.hypot(bx - ax, by - ay))), a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), base = Math.atan2(by - ay, bx - ax); return [ax + Math.cos(base + bend * a) * l1, ay + Math.sin(base + bend * a) * l1]; };
  // ---- the wing: an arm of bone with three long fingers and a scalloped membrane between them.
  const wingAt = (sx, sy, far) => {
    const k2 = Math.max(0, Math.min(1, wing)), lerp = (a, b2) => a + (b2 - a) * k2, arm = lerp(-2.3, -1.7) + flap * .6, armL = u * lerp(.3, .5);
    const ex = sx + Math.cos(arm) * armL, ey = sy + Math.sin(arm) * armL;
    const fold = [-2.7, -2.9, -3.05], open = [-1.2, -1.85, -2.6], lenF = [.62, .54, .46], lenO = [1.25, 1.1, .85];
    const tips = [0, 1, 2].map((i) => { const a = lerp(fold[i], open[i]) + flap * (1 - i * .3), L = u * lerp(lenF[i], lenO[i]) * (far ? .9 : 1); return [ex + Math.cos(a) * L, ey + Math.sin(a) * L]; });
    const back = [sx - u * lerp(.4, .6), sy + u * .04];
    const g = ctx.createLinearGradient(ex, ey - u * .8, sx, sy + u * .2); g.addColorStop(0, far ? A.membrane : A.membraneLight); g.addColorStop(1, far ? A.hideDark : A.membrane);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(...tips[0]);
    const scallop = (a, b2) => { const mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2, dx = ex - mx, dy = ey - my; const d2 = A.scallop ?? .28; ctx.quadraticCurveTo(mx + dx * d2, my + dy * d2, b2[0], b2[1]); };
    scallop(tips[0], tips[1]); scallop(tips[1], tips[2]); scallop(tips[2], back); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.bone; ctx.lineWidth = Math.max(1, u * .02); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); for (const [x, y] of tips) { ctx.moveTo(ex, ey); ctx.quadraticCurveTo((ex + x) / 2 + u * .03, (ey + y) / 2 - u * .03, x, y); } ctx.stroke();
    ctx.fillStyle = A.horn; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(arm - 1.2) * u * .09, ey + Math.sin(arm - 1.2) * u * .09); ctx.lineTo(ex + Math.cos(arm + .4) * u * .04, ey + Math.sin(arm + .4) * u * .04); ctx.closePath(); ctx.fill(); // the wing claw
  };
  // ---- legs: jointed, planted, and stepping with the gait (diagonal pairs move together, like a walking lizard)
  const footY = (lifted) => b + bob - lifted;
  const leg = (front, far, off) => {
    const ph = phase + off, swing = walking * Math.sin(ph) * u * DRAGON_GAIT.reach, lifted = walking * Math.max(0, Math.cos(ph)) * u * DRAGON_GAIT.lift, tone = far ? A.hideDark : A.hide;
    const [sx, sy] = front ? R(.66, -.1) : R(.04, -.1), slam = front && (e.dragonPose === "rear" || e.dragonPose === "rearBoth") ? u * .3 : 0;
    const fx = sx + (front ? u * .08 : u * .02) + swing + (far ? u * .06 : 0), fy = Math.min(footY(lifted) - slam - (air ? u * .08 : 0), sy + u * (front ? .58 : .62) * BD.legLen), tuck = Math.min(1, air / (u * .3));
    const tx2 = fx + (sx - u * (front ? .05 : .22) - fx) * tuck, ty2 = fy + (sy + u * .3 - fy) * tuck;
    if (front) { const fx = tx2, fy = ty2, wx = fx - u * .03, wy = fy - u * .08, [kx, ky] = ik(sx, sy, wx, wy, u * .29 * BD.legLen, u * .27 * BD.legLen, 1);
      limb([[sx, sy - u * .06], [kx, ky], [wx, wy], [fx, fy - u * .02]], u * .3 * BD.legW, u * .09 * BD.legW, tone); ctx.fillStyle = tone; ctx.beginPath(); ctx.arc(kx, ky, u * .07 * BD.legW, 0, TAU); ctx.fill(); /* the elbow */ claws(fx + u * .02, fy - u * .015); }
    else { const fx = tx2, fy = ty2, hx = fx - u * .13, hy = fy - u * .14, [kx, ky] = ik(sx, sy, hx, hy, u * .3 * BD.legLen, u * .27 * BD.legLen, -1);
      limb([[sx, sy - u * .04], [kx, ky], [hx, hy], [fx, fy - u * .02]], u * .4 * BD.legW, u * .09 * BD.legW, tone); ctx.fillStyle = tone; ctx.beginPath(); ctx.arc(kx, ky, u * .08 * BD.legW, 0, TAU); ctx.fill(); /* the knee */
      if (!far) { ctx.fillStyle = A.hideLight; ctx.globalAlpha = .35; ctx.beginPath(); ctx.ellipse(sx - u * .02, sy - u * .02, u * .14, u * .09, .5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } // the light on the haunch
      claws(fx + u * .02, fy - u * .015); }
  };
  // ---- the far wing and far legs, behind the body
  { const [wx, wy] = R(.42, -.44); wingAt(wx - u * .04, wy, true); }
  leg(false, true, Math.PI); leg(true, true, 0);
  const hideGrad = ctx.createLinearGradient(0, hipY - u * .5 * BD.bodyH, 0, b); hideGrad.addColorStop(0, A.hideLight); hideGrad.addColorStop(.45, A.hide); hideGrad.addColorStop(1, A.hideDark); let tailPts = null, tailEdges = null;
  // ---- the tail: grows out of the hips as thick as the body there, dips toward the ground, sways, and ends in a spiked club
  { const segs = BD.tailSegs, pts = [R(.15, -.18), R(-.15, -.14)]; let [x, y] = pts[1], a = Math.PI - BD.tailStart + rear * .6;
    for (let i = 1; i <= segs; i++) { const k2 = i / segs; a += BD.tailBend + BD.tailWave * Math.sin(i * .5 - .6) + Math.sin(t * 1.8 - i * .5) * (reduce ? 0 : .05) * k2 * (12 / segs) + tailSwing * .07 * k2 * (12 / segs); x += Math.cos(a) * u * BD.tailStep; y = Math.min(b - u * .04, y + Math.sin(a) * u * BD.tailStep * .7); pts.push([x, y]); }
    const g = hideGrad; tailPts = pts;
    const tail = limb(pts, u * BD.tailW, u * BD.tailTip, g); tailEdges = tail;
    ctx.strokeStyle = A.belly; ctx.lineWidth = Math.max(1, u * .03); ctx.globalAlpha = .55; smooth(tail.R.slice(2), false); ctx.stroke(); ctx.globalAlpha = 1; // the paler underside
    ctx.fillStyle = A.horn; for (let i = 2; i < tail.L.length - 1; i += 1) { const [px, py] = tail.L[i], hgt = u * (.075 * (1 - i / pts.length) + .012) * (BD.tailW / .4); ctx.beginPath(); ctx.moveTo(px - u * .035, py + u * .01); ctx.lineTo(px - u * .05, py - hgt); ctx.lineTo(px + u * .015, py + u * .01); ctx.closePath(); ctx.fill(); }
    const [tx, ty] = pts[pts.length - 1], [px2, py2] = pts[pts.length - 3], ta = Math.atan2(ty - py2, tx - px2); ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta); ctx.fillStyle = A.horn; ctx.beginPath(); ctx.moveTo(-u * .06, 0); ctx.lineTo(-u * .02, -u * .09); ctx.lineTo(u * .05, -u * .03); ctx.lineTo(u * .13, 0); ctx.lineTo(u * .05, u * .03); ctx.lineTo(-u * .02, u * .09); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // ---- neck and head: a tapering S-curve rising from the chest to a long horned head
  const [nx0, ny0] = R(.86, -.26), ha = -.8 - head * .9, n1x = nx0 + Math.cos(ha) * u * .3 * BD.neckLen, n1y = ny0 + Math.sin(ha) * u * .3 * BD.neckLen, hx = n1x + Math.cos(ha + .55 + head * .3) * u * .26 * BD.neckLen, hy = n1y + Math.sin(ha + .55 + head * .3) * u * .26 * BD.neckLen;
  const neckPts = []; for (let i = 0; i <= 6; i++) { const s2 = i / 6, mx = (1 - s2) * (1 - s2) * (nx0 - u * .06) + 2 * (1 - s2) * s2 * n1x + s2 * s2 * hx, my = (1 - s2) * (1 - s2) * (ny0 + u * .04) + 2 * (1 - s2) * s2 * n1y + s2 * s2 * hy; neckPts.push([mx, my]); }
  { const g = ctx.createLinearGradient(nx0 - u * .2, ny0 - u * .3, nx0 + u * .2, ny0 + u * .1); g.addColorStop(0, A.hideLight); g.addColorStop(1, A.hide); const neck = limb(neckPts, u * .4 * BD.neckW, u * .2 * BD.neckW, g);
    ctx.strokeStyle = A.belly; ctx.globalAlpha = .3; ctx.lineWidth = Math.max(1, u * .04); smooth(neck.L.map(([px, py], i) => [px * .8 + neckPts[i][0] * .2, py * .8 + neckPts[i][1] * .2]), false); ctx.stroke(); ctx.globalAlpha = 1; // the pale throat
    ctx.fillStyle = A.horn; for (let i = 0; i < neck.R.length - 1; i++) { const [px, py] = neck.R[i], hh = u * (.07 - i * .006); ctx.beginPath(); ctx.moveTo(px - u * .03, py + u * .01); ctx.lineTo(px - u * .05, py - hh); ctx.lineTo(px + u * .02, py + u * .01); ctx.closePath(); ctx.fill(); } }
  const fa = ha + 1.25 + head * .6; ctx.save(); ctx.translate(hx, hy); ctx.rotate(fa); ctx.scale(BD.headScale * BD.snout, BD.headScale);
  // horns behind the head: two great swept horns, then a crown of short ones
  ctx.fillStyle = A.horn; ctx.strokeStyle = A.hornLight; ctx.lineWidth = lw;
  for (const [ox, len] of A.horns || DRAGON_ART.horns) { ctx.beginPath(); ctx.moveTo(u * ox, -u * .08); ctx.bezierCurveTo(u * (ox - .1), -u * .2, u * (ox - .28), -u * .24, u * (ox - len), -u * .12); ctx.bezierCurveTo(u * (ox - .26), -u * .17, u * (ox - .1), -u * .12, u * (ox + .04), -u * .05); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(u * (.02 + i * .05), -u * .08); ctx.lineTo(u * (-.02 + i * .05), -u * .17); ctx.lineTo(u * (.05 + i * .05), -u * .07); ctx.closePath(); ctx.fill(); }
  // skull and upper jaw, lower jaw hinged open
  const open = jaw * .5;
  ctx.save(); ctx.rotate(open * .5); ctx.fillStyle = A.hideDark; ctx.beginPath(); ctx.moveTo(-u * .02, u * .02); ctx.lineTo(u * .36, u * .03); ctx.lineTo(u * .33, u * .08); ctx.lineTo(-u * .02, u * .1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bone; ctx.stroke();
  ctx.fillStyle = A.teeth; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(u * (.06 + i * .06), u * .03); ctx.lineTo(u * (.08 + i * .06), -u * .005); ctx.lineTo(u * (.1 + i * .06), u * .03); ctx.closePath(); ctx.fill(); } ctx.restore();
  if (jaw > .2 || charge > 0) { const g = ctx.createRadialGradient(u * .16, u * .04, 0, u * .16, u * .04, u * (.12 + charge * .25)); g.addColorStop(0, A.fireCore); g.addColorStop(.5, `rgba(${A.glow},${.5 + charge * .5})`); g.addColorStop(1, `rgba(${A.glow},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u * .16, u * .04, u * (.12 + charge * .25), 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.hide; ctx.beginPath(); ctx.moveTo(-u * .12, -u * .07); ctx.bezierCurveTo(u * .05, -u * .13, u * .25, -u * .08, u * .4, -u * .02); ctx.lineTo(u * .39, u * .03); ctx.lineTo(u * .02, u * .03); ctx.quadraticCurveTo(-u * .12, u * .04, -u * .12, -u * .07); ctx.closePath(); ctx.fill(); ctx.strokeStyle = A.bone; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = A.teeth; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(u * (.08 + i * .06), u * .03); ctx.lineTo(u * (.1 + i * .06), u * .06); ctx.lineTo(u * (.12 + i * .06), u * .03); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = A.hideDark; ctx.beginPath(); ctx.moveTo(u * .02, -u * .07); ctx.quadraticCurveTo(u * .12, -u * .1, u * .2, -u * .07); ctx.stroke(); // brow ridge
  const blink = !reduce && (t % 4.3) < .12; ctx.fillStyle = A.eye; ctx.beginPath(); ctx.ellipse(u * .1, -u * .055, u * .028, blink ? u * .003 : u * .014, -.15, 0, TAU); ctx.fill(); if (!blink) { ctx.fillStyle = "#1a0400"; ctx.fillRect(u * .098, -u * .066, u * .006, u * .022); }
  ctx.fillStyle = "#1a0400"; ctx.beginPath(); ctx.ellipse(u * .36, -u * .02, u * .012, u * .007, 0, 0, TAU); ctx.fill(); // nostril
  if (!reduce && jaw < .2 && charge === 0) { const p2 = (t * .6) % 1; ctx.fillStyle = `rgba(${A.glow},${.18 * (1 - p2)})`; ctx.beginPath(); ctx.arc(u * (.42 + p2 * .12), -u * (.03 + p2 * .1), u * (.015 + p2 * .03), 0, TAU); ctx.fill(); } // a curl of smoke at the nostril
  ctx.restore();
  // ---- body: a deep chest and strong shoulders, narrowing to the hips where the tail takes over; scaled hide; a pale armoured belly.
  const body = [R(-.28, -.02), R(-.2, -.26), R(.12, -.36), R(.5, -.44), R(.86, -.36), R(1.02, -.16), R(.92, .06), R(.55, .13), R(.2, .1), R(-.12, .06)];
  { const [gx0, gy0] = R(.4, -.5), [gx1, gy1] = R(.4, .18), g = ctx.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, A.hideLight); g.addColorStop(.45, A.hide); g.addColorStop(1, A.hideDark);
    smooth(body); ctx.fillStyle = hideGrad; ctx.fill(); ctx.strokeStyle = A.bone; ctx.lineWidth = lw; ctx.stroke(); void g;
    if (tailPts) { const n = tailPts.length, w = (i) => u * (BD.tailW + (BD.tailTip - BD.tailW) * i / (n - 1)), root = tailPts.slice(0, 5); /* the tail's root laid over the body's rear outline: one creature, no seam */
      limb(root, w(0), w(4), hideGrad, null); ctx.strokeStyle = A.bone; ctx.lineWidth = lw; smooth(tailEdges.L.slice(2, 6), false); ctx.stroke(); smooth(tailEdges.R.slice(2, 6), false); ctx.stroke(); }
    ctx.save(); smooth(body); ctx.clip();
    if (BD.lean) { ctx.strokeStyle = A.hideDark; ctx.globalAlpha = .55; ctx.lineWidth = u * .07; smooth([R(-.3, -.22), R(.1, -.34), R(.5, -.42), R(.9, -.34)], false); ctx.stroke(); ctx.globalAlpha = 1; /* the darker line of the back */
      ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = Math.max(1, u * .012); for (let i = 0; i < 6; i++) { const [ax, ay] = R(.28 + i * .09, -.3), [cx2, cy2] = R(.22 + i * .09, -.1), [bx, by] = R(.26 + i * .085, .06); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx2, cy2, bx, by); ctx.stroke(); } /* ribs under a lean flank */
      ctx.fillStyle = A.hideLight; ctx.globalAlpha = .3; for (const [mx, my, rx, ry] of [[.8, -.2, .16, .12], [.02, -.16, .17, .12]]) { const [ex2, ey2] = R(mx, my); ctx.beginPath(); ctx.ellipse(ex2, ey2, u * rx, u * ry, -.4, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; /* shoulder and haunch */ }
    else { ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = lw; } if (!BD.lean) for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { const [px, py] = R(-.05 + i * .11 + (r % 2) * .055, -.36 + r * .1); ctx.beginPath(); ctx.arc(px, py, u * .045, .2, Math.PI - .2); ctx.stroke(); } // scale rows
    ctx.fillStyle = A.belly; for (let i = 0; i < 6; i++) { const [px, py] = R(.1 + i * .13, .1 - Math.sin(i * .55) * .03); ctx.beginPath(); ctx.ellipse(px, py, u * .075, u * .045, -rear, 0, TAU); ctx.fill(); ctx.strokeStyle = A.bellyDark; ctx.lineWidth = lw; ctx.stroke(); }
    if (A.cracks) { const pulse = reduce ? .8 : .65 + .35 * Math.sin(t * 2.2); for (const [wd, al] of [[u * .03, .25], [u * .01, .9]]) { ctx.strokeStyle = `rgba(${A.cracks},${al * pulse})`; ctx.lineWidth = Math.max(1, wd); for (let i = 0; i < 4; i++) { const pts = [R(.06 + i * .2, -.38 + (i % 2) * .05), R(.14 + i * .2, -.22), R(.09 + i * .2, -.07), R(.18 + i * .2, .06)]; ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q2 of pts.slice(1)) ctx.lineTo(...q2); ctx.stroke(); } } }
    ctx.restore();
    ctx.fillStyle = A.horn; for (let i = 0; i < 7; i++) { const [px, py] = R(-.08 + i * .13, -.34 - Math.sin(i * .5 + .3) * .14); ctx.beginPath(); ctx.moveTo(px - u * .045, py + u * .03); ctx.lineTo(px - u * .065, py - u * .11 + i * u * .004); ctx.lineTo(px + u * .025, py + u * .02); ctx.closePath(); ctx.fill(); } }
  // ---- near hind leg over the body's flank
  leg(false, false, 0);
  // The sun it raises over its head when it claims the ground, and the heat it draws in for the Sunfall.
  if (e.dragonPose === "colonize" || e.dragonPose === "nova") { const R0 = u * (.15 + charge * (e.dragonPose === "nova" ? .9 : .55)), cx = hx + u * .1, cy = hy - u * .5 - charge * u * .4, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 1.6); g.addColorStop(0, "#fffbe8"); g.addColorStop(.35, "#ffd060"); g.addColorStop(.7, "rgba(255,110,30,.7)"); g.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0 * 1.6, 0, TAU); ctx.fill();
    if (!reduce) { ctx.strokeStyle = "rgba(255,200,120,.6)"; ctx.lineWidth = Math.max(1, u * .015); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * 2, r0 = R0 * (2.6 - ((t * 1.5 + i * .3) % 1) * 1.6); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r0 * .7, cy + Math.sin(a) * r0 * .7); ctx.stroke(); } } }
  leg(true, false, Math.PI);
  { const [wx, wy] = R(.3, -.42); wingAt(wx, wy, false); }
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
