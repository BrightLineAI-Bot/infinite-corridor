// The Earth Apatosaurus's standard-view body, its tree clones, and everything it lays on the ground (Tim, 2026-11-18). Drawing only:
// nothing here changes combat state. It reads the pose contract the gameplay sets (earth-apato.ts): e.apatoPose, apatoHeading,
// apatoGlow, apatoNeckLift, apatoNeckReach, apatoLash, apatoBeam, apatoWrap, apatoStep, apatoFx and apatoSaplings, never attack timing.
//
// The body is a heavy barrel on four pillar legs, a long whip tail, and a long neck drawn as one smooth tapering curve (a cubic from
// the shoulders to the head, sampled at APATO_ART.neck points, outlined as one shape so it bends along its whole length). Its hide is
// moss green, paler beneath; a bank of brown earth with grass and stones lies across its back; a seed sprout stands on its head and
// glows while it gathers the beam. Root necks are knotted vines with a bud for a head; its clones are wood: bark, branch and leaf.
// q: the shared pack paint context { k, b, u, s, t, flip, e } (monster-render.ts paintPackMonster). `now` (ms) drives the gait.
// No allocation per frame beyond the canvas calls: the neck's samples are preallocated, and the per-beast memo is a bounded map.
const TAU = Math.PI * 2;
export const APATO_ART = Object.freeze({
  hide: "#4f8f3a", hideLight: "#74b553", hideDark: "#2f5a22", outline: "#1a3312", belly: "#a7cf7c", earth: "#7a5634", earthLight: "#9a7048", earthDark: "#4e3420",
  grass: "#8fd14f", grassDark: "#4f8f2a", stone: "#9a948a", sprout: "#9cff5a", sproutDark: "#3f8f22", glow: "#eaff9a", eye: "#ffe14a", pupil: "#1a1200", mouth: "#2a1a10",
  bark: "#7a5634", barkDark: "#4a3220", barkLight: "#a07a50", leaf: "#6fbf3a", leafDark: "#3f7f22", vine: "#5f7f2a", vineDark: "#33461a", bud: "#a8d65a", thorn: "#e8e0c0",
  rock: "#8a7a66", rockDark: "#4f4438", rockLight: "#b8a890", beam: "#f4ff9a", beamCore: "#ffffff", venom: "#7fe03a",
  // shape (body units u: a tile times the actor's scale)
  neck: 22, bodyLen: .74, bodyH: .44, bodyY: .86, legX: [.4, -.42], legW: .23, farShift: .13, tailLen: 1.7, stride: .14, settle: 6, ease: 9,
  headLen: .26, headH: .12, neckRoot: .23, neckTip: .085, headY: 1.28, headLift: .9,
});
const MEMO = new Map(), MEMO_MAX = 24;
function memo(e, now) {
  const id = e.id || "apato"; let m = MEMO.get(id);
  if (!m) { m = { phase: 0, moving: 0, at: null, x: null, y: null, lift: 0, reach: 0, front: 0, glow: 0 }; MEMO.set(id, m); if (MEMO.size > MEMO_MAX) MEMO.delete(MEMO.keys().next().value); }
  return m;
}
const N = APATO_ART.neck, NX = new Float64Array(N + 1), NY = new Float64Array(N + 1), NR = new Float64Array(N + 1);
const smooth = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
// Samples a cubic from (ax, ay) through (bx, by), (cx, cy) to (dx, dy) into NX, NY; radii from r0 to r1.
function sampleNeck(ax, ay, bx, by, cx, cy, dx, dy, r0, r1) {
  for (let i = 0; i <= N; i++) { const t = i / N, m = 1 - t; NX[i] = m * m * m * ax + 3 * m * m * t * bx + 3 * m * t * t * cx + t * t * t * dx; NY[i] = m * m * m * ay + 3 * m * m * t * by + 3 * m * t * t * cy + t * t * t * dy; NR[i] = r0 + (r1 - r0) * Math.pow(t, .55); }
}
// The sampled neck as one closed outline (left side out, right side back).
function neckPath(ctx) {
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const j = Math.min(N, i + 1), h = Math.max(0, i - 1), tx = NX[j] - NX[h], ty = NY[j] - NY[h], m = Math.hypot(tx, ty) || 1, nx = -ty / m, ny = tx / m; if (i) ctx.lineTo(NX[i] + nx * NR[i], NY[i] + ny * NR[i]); else ctx.moveTo(NX[i] + nx * NR[i], NY[i] + ny * NR[i]); }
  for (let i = N; i >= 0; i--) { const j = Math.min(N, i + 1), h = Math.max(0, i - 1), tx = NX[j] - NX[h], ty = NY[j] - NY[h], m = Math.hypot(tx, ty) || 1, nx = -ty / m, ny = tx / m; ctx.lineTo(NX[i] - nx * NR[i], NY[i] - ny * NR[i]); }
  ctx.closePath();
}
function alongNeck(ctx, k, from = 0) { ctx.beginPath(); for (let i = from; i <= N; i++) { const j = Math.min(N, i + 1), h = Math.max(0, i - 1), tx = NX[j] - NX[h], ty = NY[j] - NY[h], m = Math.hypot(tx, ty) || 1; const x = NX[i] - ty / m * NR[i] * k, y = NY[i] + tx / m * NR[i] * k; if (i > from) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
// a dust burst and cracks where a head (or a clone's) strikes the ground: `age` 0..1 over APATO_FX.dustMs
export const APATO_FX = Object.freeze({ cock: -.35, snap: 28, dustMs: 650, dustPuffs: 7, cracks: 5 });
function slamDust(ctx, A, x, y, u, age, scale = 1) {
  if (!(age >= 0 && age < 1)) return; const r = u * scale * (.18 + .55 * smooth(age)), fade = 1 - age;
  ctx.save(); ctx.strokeStyle = A.earthDark; ctx.globalAlpha = fade * .9; ctx.lineWidth = Math.max(1, u * .02 * scale); ctx.lineCap = "round";
  for (let i = 0; i < APATO_FX.cracks; i++) { const a = i / APATO_FX.cracks * TAU + .4, l = u * scale * (.25 + .12 * (i % 2)) * Math.min(1, age * 4); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .3 + u * .02); ctx.lineTo(x + Math.cos(a + .25) * l, y + Math.sin(a + .25) * l * .6); ctx.stroke(); }
  for (let i = 0; i < APATO_FX.dustPuffs; i++) { const a = i / APATO_FX.dustPuffs * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * .45 - u * scale * .12 * age; ctx.globalAlpha = fade * .55; ctx.fillStyle = i % 2 ? A.earthLight : A.earth; ctx.beginPath(); ctx.arc(px, py, u * scale * (.06 + .07 * age), 0, TAU); ctx.fill(); }
  ctx.restore();
}
function fillNeck(ctx, A, u, light = true) {
  neckPath(ctx); ctx.fillStyle = A.hide; ctx.fill(); ctx.lineWidth = Math.max(1, u * .025); ctx.strokeStyle = A.outline; ctx.stroke();
  // the paler throat along its underside, and a light ridge along its top
  ctx.save(); neckPath(ctx); ctx.clip(); ctx.lineCap = "round";
  ctx.strokeStyle = A.belly; ctx.globalAlpha = .55; ctx.lineWidth = u * .07; ctx.beginPath(); for (let i = 0; i <= N; i++) { const j = Math.min(N, i + 1), h = Math.max(0, i - 1), tx = NX[j] - NX[h], ty = NY[j] - NY[h], m = Math.hypot(tx, ty) || 1; const x = NX[i] + ty / m * NR[i] * .75, y = NY[i] - tx / m * NR[i] * .75; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
  if (light) { ctx.strokeStyle = A.hideDark; ctx.globalAlpha = .28; ctx.lineWidth = Math.max(1, u * .012); for (let i = 2; i < N - 1; i += 2) { const tx = NX[i + 1] - NX[i - 1], ty = NY[i + 1] - NY[i - 1], m = Math.hypot(tx, ty) || 1, nx = ty / m, ny = -tx / m; ctx.beginPath(); ctx.moveTo(NX[i] + nx * NR[i], NY[i] + ny * NR[i]); ctx.quadraticCurveTo(NX[i] + tx / m * NR[i] * .35, NY[i] + ty / m * NR[i] * .35, NX[i] - nx * NR[i] * .2, NY[i] - ny * NR[i] * .2); ctx.stroke(); } } // a snake's belly scales
  if (light) { ctx.strokeStyle = A.hideLight; ctx.globalAlpha = .6; ctx.lineWidth = u * .035; ctx.beginPath(); for (let i = 0; i <= N; i++) { const j = Math.min(N, i + 1), h = Math.max(0, i - 1), tx = NX[j] - NX[h], ty = NY[j] - NY[h], m = Math.hypot(tx, ty) || 1; const x = NX[i] - ty / m * NR[i] * .55, y = NY[i] + tx / m * NR[i] * .55; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.restore();
}
// The head at (x, y), its snout along angle a; the sprout on top glowing by `glow`.
function drawHead(ctx, A, u, x, y, a, glow, open = 0, quiet = false, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const L = A.headLen * u, H = A.headH * u;
  ctx.fillStyle = A.hide; ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, u * .022);
  ctx.beginPath(); ctx.moveTo(-L * .35, -H); ctx.quadraticCurveTo(L * .6, -H * 1.25, L, -H * .1); ctx.quadraticCurveTo(L * 1.02, H * .55, L * .55, H * (.85 + open)); ctx.quadraticCurveTo(0, H * 1.15, -L * .35, H * .7); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (open > .05) { ctx.fillStyle = A.mouth; ctx.beginPath(); ctx.moveTo(L * .2, H * .5); ctx.lineTo(L * .95, H * .2); ctx.lineTo(L * .55, H * (.6 + open)); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = A.hideDark; ctx.beginPath(); ctx.moveTo(L * .25, H * .45); ctx.lineTo(L * .92, H * .2); ctx.stroke(); // the mouth line
  ctx.fillStyle = A.hideDark; ctx.beginPath(); ctx.arc(L * .86, -H * .3, u * .012, 0, TAU); ctx.fill(); // nostril
  // the eye (lit gold while it beams)
  if (glow > .05) { const g = ctx.createRadialGradient(L * .28, -H * .35, 0, L * .28, -H * .35, u * (.05 + .1 * glow)); g.addColorStop(0, A.beamCore); g.addColorStop(.4, A.beam); g.addColorStop(1, "rgba(244,255,154,0)"); ctx.fillStyle = g; ctx.globalAlpha = glow; ctx.beginPath(); ctx.arc(L * .28, -H * .35, u * (.05 + .1 * glow), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = A.eye; ctx.beginPath(); ctx.ellipse(L * .28, -H * .35, u * .03, u * .024, 0, 0, TAU); ctx.fill(); ctx.fillStyle = A.pupil; ctx.beginPath(); ctx.ellipse(L * .3, -H * .35, u * .01, u * .018, 0, 0, TAU); ctx.fill();
  // the seed sprout on its crown: a stem and two leaves, glowing as it gathers light
  const sx = -L * .05, sy = -H * 1.02, sway = quiet ? 0 : Math.sin(t * 2.3) * .12;
  if (glow > .02) { const r = u * (.12 + .22 * glow), g = ctx.createRadialGradient(sx, sy - u * .08, 0, sx, sy - u * .08, r); g.addColorStop(0, "rgba(255,255,220,.95)"); g.addColorStop(.35, "rgba(234,255,154,.7)"); g.addColorStop(1, "rgba(160,255,90,0)"); ctx.globalAlpha = Math.min(1, glow * 1.2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy - u * .08, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = A.sproutDark; ctx.lineWidth = Math.max(1, u * .018); ctx.beginPath(); ctx.moveTo(sx, sy + H * .1); ctx.quadraticCurveTo(sx + u * .01, sy - u * .05, sx + sway * u * .2, sy - u * .1); ctx.stroke();
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(sx + sway * u * .2, sy - u * .1); ctx.rotate(side * (.9 + sway) - .2); ctx.fillStyle = glow > .3 ? A.glow : A.sprout; ctx.strokeStyle = A.sproutDark; ctx.lineWidth = Math.max(1, u * .01); ctx.beginPath(); ctx.ellipse(0, -u * .045, u * .025, u * .05, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function drawLeg(ctx, A, u, x, top, lift, swing, far) {
  const w = A.legW * u * (far ? .9 : 1), foot = -lift * u;
  ctx.fillStyle = far ? A.hideDark : A.hide; ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, u * .022);
  const mid = (top + foot) / 2;
  ctx.beginPath(); ctx.moveTo(x - w * .62, top); ctx.bezierCurveTo(x - w * .72, top + (mid - top) * .6, x - w * .48 + swing * u * .5, mid, x - w * .5 + swing * u, foot - u * .03); ctx.lineTo(x + w * .52 + swing * u, foot - u * .03); ctx.bezierCurveTo(x + w * .5 + swing * u * .5, mid, x + w * .7, top + (mid - top) * .6, x + w * .62, top); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = far ? A.outline : A.hideDark; ctx.lineWidth = Math.max(1, u * .012); for (let i = 0; i < 3; i++) { const yy = foot - u * (.07 + i * .035); ctx.beginPath(); ctx.moveTo(x - w * .35 + swing * u, yy); ctx.quadraticCurveTo(x + swing * u, yy + u * .012, x + w * .35 + swing * u, yy); ctx.stroke(); } // wrinkles
  ctx.fillStyle = far ? A.outline : A.hideDark; ctx.beginPath(); ctx.ellipse(x + swing * u, foot - u * .015, w * .62, u * .03, 0, 0, TAU); ctx.fill(); // the pad
  ctx.fillStyle = A.thorn; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + swing * u + i * w * .3 + w * .1, foot - u * .03, u * .012, 0, TAU); ctx.fill(); } // toenails
}
// The pose's target neck values (lift: -1 down .. 1 up; reach; front: the forefeet raised for a stamp).
function poseTargets(e, dead) {
  const p = e.apatoPose, lift = Number(e.apatoNeckLift) || 0, reach = Number(e.apatoNeckReach) || 0;
  let front = 0;
  if (p === "seedStamp" || p === "spireStamp" || p === "handsCall") front = e.pack?.phase === "windup" ? .9 : 0;
  if (p === "stomp" && e.pack?.phase === "windup") front = .6;
  return { lift: dead ? -1 : p === "graze" || p === "feed" ? -.9 : p === "beamLift" || p === "beam" || p === "sweep" ? .9 : lift, reach: dead ? .2 : p === "slamRaise" ? APATO_FX.cock : reach, front }; // the slam's wind-up: drawn back like a cobra
}
export function drawEarthApato(ctx, q, now = 0) {
  const A = APATO_ART, { k, u, flip, e } = q, b = q.b, reduce = !!e.reduceMotion, t = reduce ? 0 : now / 1000, M = memo(e, now), dead = !!e.dead || (e.hp <= 0 && e.maxHp > 0);
  const x = Number(e.x) || 0, y = Number(e.y) || 0, dt = M.at == null ? 0 : Math.min(.1, Math.max(0, (now - M.at) / 1000)), moved = M.x == null ? 0 : Math.hypot(x - M.x, y - M.y);
  M.at = now; M.x = x; M.y = y;
  if (dt > 0 && moved < 2) { M.phase = (M.phase + TAU * moved / (2 * A.stride * 2 * Math.max(.6, Number(e.scale) || 1))) % TAU; M.moving += ((moved / dt > .05 ? 1 : 0) - M.moving) * Math.min(1, dt * A.settle); }
  if (reduce) M.moving = 0;
  if (e.apatoPose === "slam" && M.pose !== "slam") M.slamAt = now; else if (M.slamAt != null && now - M.slamAt > APATO_FX.dustMs) M.slamAt = null; M.pose = e.apatoPose; // the moment of contact
  const T = poseTargets(e, dead), rate = e.apatoPose === "slam" ? APATO_FX.snap : A.ease, ease = (cur, to) => !(dt > 0) || reduce ? to : cur + (to - cur) * Math.min(1, dt * rate); // the slam snaps down
  M.lift = ease(M.lift, T.lift); M.reach = ease(M.reach, T.reach); M.front = ease(M.front, T.front); M.glow = ease(M.glow, Math.max(0, Math.min(1, Number(e.apatoGlow) || 0)));
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0)), wob = stun && !reduce ? Math.sin(t * 9) * .15 * stun : 0;
  const lashing = !!e.apatoLash?.on || (e.apatoWrap?.on && e.apatoWrap.phase !== "track"); // the neck runs out over the ground: drawn there (drawApatoGround)
  ctx.save(); ctx.translate(k, b); ctx.scale(flip, 1);
  const ph = M.phase, mv = M.moving, bob = Math.abs(Math.sin(ph)) * .02 * u * mv, by = dead ? -A.bodyH * u * .95 : -A.bodyY * u - bob, front = M.front * .32 * u; // dead, it lies on its belly, legs folded under
  // shadow
  ctx.save(); ctx.scale(1, .32); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(-u * .1, 0, u * 1.2, u * .5, 0, 0, TAU); ctx.fill(); ctx.restore();
  // far legs, then the tail, the body, the near legs
  const legTop = by + A.bodyH * u * .45, step = (o) => Math.sin(ph + o), hindL = legTop + front * .1, foreL = legTop - front;
  const legs = [[A.legX[1], 1.6, true], [A.legX[0], 0, true]];
  const stepUp = e.apatoPose === 'stomp' ? Math.max(0, Math.min(1, Number(e.apatoStepLift) || 0)) : 0, stepFar = (Number(e.apatoStep) || 0) % 2 === 0; // the stomp chase: the next forefoot rising
  if (!dead) for (const [lx, o, far] of legs) { const s0 = step(o) * mv, lift = (lx > 0 ? M.front * .28 + (stepFar ? stepUp * .3 : 0) : 0) + Math.max(0, s0) * .06 * mv; drawLeg(ctx, A, u, lx * u + u * A.farShift, (lx > 0 ? foreL : hindL) - u * .03, lift, s0 * A.stride * .5, far); }
  // the tail: a tapering whip with a sway
  { const sway = reduce ? 0 : Math.sin(t * 1.4 + ph * .5) * .1, tx0 = -A.bodyLen * u * .85, ty0 = by + u * .02;
    sampleNeck(tx0, ty0, tx0 - u * .5, ty0 + u * .05, tx0 - u * 1.1, ty0 + u * (.32 + sway), tx0 - A.tailLen * u, ty0 + u * (.55 - sway * 2), A.bodyH * u * .62, u * .018);
    fillNeck(ctx, A, u, false); }
  // the barrel of its body
  ctx.save(); ctx.translate(0, by); ctx.rotate(wob * .2 - M.front * .1);
  const L = A.bodyLen * u, H = A.bodyH * u, g = ctx.createLinearGradient(0, -H, 0, H); g.addColorStop(0, A.hideLight); g.addColorStop(.45, A.hide); g.addColorStop(1, A.belly);
  ctx.fillStyle = g; ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, u * .025); ctx.beginPath(); ctx.ellipse(0, 0, L, H, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // the earth across its back: a brown bank, grass tufts and stones
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, L, H, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = A.earth; ctx.beginPath(); ctx.moveTo(-L * 1.05, -H * .05); for (let i = 0; i <= 12; i++) { const s = i / 12, xx = -L + s * 2 * L, yy = -H * (.35 + .12 * Math.sin(s * 11.3 + 1.7)); ctx.lineTo(xx, yy); } ctx.lineTo(L * 1.05, -H * 1.1); ctx.lineTo(-L * 1.05, -H * 1.1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = A.earthDark; for (let i = 0; i < 7; i++) { const s = (i + .5) / 7, xx = -L * .9 + s * 1.8 * L, yy = -H * (.62 + .1 * Math.sin(i * 2.7)); ctx.beginPath(); ctx.ellipse(xx, yy, u * .04, u * .02, .3, 0, TAU); ctx.fill(); }
  ctx.fillStyle = A.stone; for (let i = 0; i < 4; i++) { const xx = -L * .6 + i * L * .42, yy = -H * (.7 + .08 * Math.cos(i * 3.1)); ctx.beginPath(); ctx.ellipse(xx, yy, u * .028, u * .02, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = A.earthDark; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.ellipse(0, 0, L, H, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  // grass on top of the earth (sways)
  ctx.strokeStyle = A.grass; ctx.lineWidth = Math.max(1, u * .016); ctx.lineCap = "round";
  for (let i = 0; i < 14; i++) { const s = (i + .5) / 14, xx = -L * .92 + s * 1.84 * L, top = -H * Math.sqrt(Math.max(0, 1 - (xx / L) ** 2)), sw = reduce ? 0 : Math.sin(t * 2 + i) * u * .015, hgt = u * (.05 + .04 * ((i * 7) % 3) / 2); ctx.strokeStyle = i % 3 ? A.grass : A.grassDark; ctx.beginPath(); ctx.moveTo(xx, top + u * .01); ctx.quadraticCurveTo(xx + sw, top - hgt * .6, xx + sw * 2 + u * .01, top - hgt); ctx.stroke(); }
  // a few saplings' worth of sprouts poking from the earth, and root bumps while the hydra rises
  if (e.apatoPose === "hydra") { ctx.fillStyle = A.vine; for (let i = 0; i < 4; i++) { const xx = -L * .5 + i * L * .33; ctx.beginPath(); ctx.ellipse(xx, -H * .9, u * .05, u * .08, 0, 0, TAU); ctx.fill(); } }
  ctx.restore();
  // near legs
  if (dead) for (const lx of A.legX) { ctx.fillStyle = A.hideDark; ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.ellipse(lx * u + u * .18, -u * .08, u * .22, u * .08, 0, 0, TAU); ctx.fill(); ctx.stroke(); } // folded legs
  else for (const [lx, o] of [[A.legX[1], 0], [A.legX[0], 1.6 + Math.PI]]) { const s0 = step(o) * mv, lift = (lx > 0 ? M.front * .32 + (stepFar ? 0 : stepUp * .3) : 0) + Math.max(0, s0) * .06 * mv; drawLeg(ctx, A, u, lx * u, lx > 0 ? foreL : hindL, lift, s0 * A.stride * .5, false); }
  // the neck and head (unless the neck is out across the ground)
  const sx = L * .8, sy = by - H * .2 - front * .5;
  if (!lashing) {
    const shake = (e.apatoPose === 'leaf' || e.apatoPose === 'leafReady') && !reduce ? Math.sin(t * (e.apatoPose === 'leaf' ? 16 : 6)) * .18 : 0, lift = M.lift + wob + shake, reach = M.reach, down = Math.max(0, -lift), up = Math.max(0, lift), restY = by - u * A.headY;
    const hx = u * (1.38 + .5 * reach + .45 * down - .22 * up), hy = restY - u * A.headLift * up + (-u * .12 - restY) * smooth(down);
    const hx2 = Math.max(sx + u * .3, hx), c1x = sx + u * (.32 + .2 * reach + .2 * down), c1y = sy - u * (.22 + .15 * up) + u * .15 * down, c2x = hx2 - u * (.42 + .1 * up - .3 * down), c2y = hy + u * (.42 + .3 * up - .4 * down);
    sampleNeck(sx, sy, c1x, c1y, c2x, c2y, hx2, hy, A.neckRoot * u, A.neckTip * u); fillNeck(ctx, A, u, true);
    const ang = Math.atan2(NY[N] - NY[N - 2], NX[N] - NX[N - 2]), headA = e.apatoPose === "beamLift" || e.apatoPose === "beam" || e.apatoPose === "sweep" ? Math.min(ang, .25) : ang * .6 + (lift < 0 ? .5 : .15);
    drawHead(ctx, A, u, NX[N], NY[N], headA, M.glow, e.apatoPose === "leaf" || e.apatoPose === "wrapTrack" ? .5 : 0, reduce, t);
    if (!reduce && M.slamAt != null) slamDust(ctx, A, NX[N] + u * .1, -u * .02, u, (now - M.slamAt) / APATO_FX.dustMs, 1.2);
  } // else: the neck runs out from its chest over the ground (drawApatoGround draws it, rising to the chest)
  ctx.restore();
}
// ---------------------------------------------------------------- its tree clones: wood, bark and leaf
export function drawApatoClone(ctx, q, now = 0) {
  const A = APATO_ART, { k, u, flip, e } = q, b = q.b, reduce = !!e.reduceMotion, t = reduce ? 0 : now / 1000, M = memo(e, now), dead = !!e.dead || (e.hp <= 0 && e.maxHp > 0);
  const x = Number(e.x) || 0, y = Number(e.y) || 0, dt = M.at == null ? 0 : Math.min(.1, Math.max(0, (now - M.at) / 1000)), moved = M.x == null ? 0 : Math.hypot(x - M.x, y - M.y);
  M.at = now; M.x = x; M.y = y; if (dt > 0 && moved < 2) { M.phase = (M.phase + TAU * moved / .4) % TAU; M.moving += ((moved / dt > .05 ? 1 : 0) - M.moving) * Math.min(1, dt * 6); }
  const coil = !!e.apatoLatched, slam = e.apatoPose === "slam", lift = slam ? -.9 : e.apatoPose === "slamRaise" ? 1 : coil ? -.3 : .2, reachN = Math.max(0, Number(e.apatoNeckReach) || 0);
  M.lift = !(dt > 0) || reduce ? lift : M.lift + (lift - M.lift) * Math.min(1, dt * 10);
  ctx.save(); ctx.translate(k, b); ctx.scale(flip, 1); if (dead) { ctx.globalAlpha *= .6; ctx.rotate(-.15); }
  const ph = M.phase, mv = M.moving, by = -.62 * u, L = .42 * u, H = .24 * u;
  ctx.save(); ctx.scale(1, .32); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 0, u * .7, u * .32, 0, 0, TAU); ctx.fill(); ctx.restore();
  // root legs
  ctx.strokeStyle = A.barkDark; ctx.lineCap = "round";
  for (const [lx, o, far] of [[-.25, 1.6, true], [.25, 0, true], [-.25, 0, false], [.25, 1.6 + Math.PI, false]]) { const s0 = Math.sin(ph + o) * mv; ctx.lineWidth = u * (far ? .08 : .1); ctx.strokeStyle = far ? A.barkDark : A.bark; ctx.beginPath(); ctx.moveTo(lx * u, by + H * .4); ctx.quadraticCurveTo(lx * u + s0 * u * .06, by * .4, lx * u + s0 * u * .1, -Math.max(0, s0) * u * .05); ctx.stroke(); ctx.lineWidth = u * .03; ctx.beginPath(); ctx.moveTo(lx * u + s0 * u * .1, 0); ctx.lineTo(lx * u + s0 * u * .1 + u * .08, u * .01); ctx.moveTo(lx * u + s0 * u * .1, 0); ctx.lineTo(lx * u + s0 * u * .1 - u * .06, u * .01); ctx.stroke(); }
  // a branching tail
  const tw = e.apatoPose === "tail" ? Math.sin(t * 14) * .5 : reduce ? 0 : Math.sin(t * 1.6) * .1;
  ctx.strokeStyle = A.bark; ctx.lineWidth = u * .07; ctx.beginPath(); ctx.moveTo(-L * .8, by); ctx.quadraticCurveTo(-L * 1.6, by + u * (.05 + tw * .3), -L * 2.3, by + u * (.25 - tw * .4)); ctx.stroke();
  ctx.lineWidth = u * .03; ctx.beginPath(); ctx.moveTo(-L * 1.7, by + u * .12); ctx.lineTo(-L * 1.9, by - u * .1); ctx.moveTo(-L * 2.1, by + u * .2); ctx.lineTo(-L * 2.4, by + u * .05); ctx.stroke();
  ctx.fillStyle = A.leaf; for (const [lx, ly] of [[-L * 1.9, by - u * .12], [-L * 2.4, by + u * .03]]) { ctx.beginPath(); ctx.ellipse(lx, ly, u * .05, u * .03, .5, 0, TAU); ctx.fill(); }
  // the trunk of its body: bark with grain
  const g = ctx.createLinearGradient(0, by - H, 0, by + H); g.addColorStop(0, A.barkLight); g.addColorStop(.5, A.bark); g.addColorStop(1, A.barkDark);
  ctx.fillStyle = g; ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.ellipse(0, by, L, H, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = A.barkDark; ctx.lineWidth = Math.max(1, u * .012); for (let i = 0; i < 5; i++) { const yy = by - H * .6 + i * H * .3; ctx.beginPath(); ctx.moveTo(-L * .8, yy); ctx.quadraticCurveTo(0, yy + (i % 2 ? 1 : -1) * u * .03, L * .8, yy); ctx.stroke(); }
  ctx.fillStyle = A.barkDark; ctx.beginPath(); ctx.ellipse(-L * .2, by - H * .1, u * .03, u * .02, 0, 0, TAU); ctx.fill(); // a knot
  // a mane of leaves along the back
  for (let i = 0; i < 6; i++) { const s = (i + .5) / 6, xx = -L * .8 + s * 1.6 * L, top = by - H * Math.sqrt(Math.max(0, 1 - (xx / L) ** 2)); ctx.fillStyle = i % 2 ? A.leaf : A.leafDark; ctx.beginPath(); ctx.ellipse(xx, top - u * .02, u * .06, u * .035, -.3 + (reduce ? 0 : Math.sin(t * 2 + i) * .15), 0, TAU); ctx.fill(); }
  // the wooden neck and head
  const sx = L * .7, sy = by - H * .3, hx = u * (.62 + .45 * reachN + (M.lift < 0 ? -M.lift * .25 : 0)), hy = by - u * (.6 + .45 * M.lift) + (M.lift < 0 ? u * .2 * -M.lift : 0);
  sampleNeck(sx, sy, sx + u * .15, sy - u * .35, hx - u * .15, hy + u * .05, hx, hy, u * .085, u * .045);
  neckPath(ctx); ctx.fillStyle = A.bark; ctx.fill(); ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, u * .018); ctx.stroke();
  ctx.save(); neckPath(ctx); ctx.clip(); ctx.lineCap = "round"; ctx.lineWidth = Math.max(1, u * .012); ctx.strokeStyle = A.barkDark; alongNeck(ctx, .45); alongNeck(ctx, -.3, 3); ctx.strokeStyle = A.barkLight; ctx.globalAlpha = .7; alongNeck(ctx, .05, 1); ctx.restore(); // grain along the wood
  { const i = Math.round(N * .45), bx = NX[i], by2 = NY[i]; ctx.strokeStyle = A.barkDark; ctx.lineWidth = u * .025; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by2); ctx.lineTo(bx - u * .09, by2 - u * .08); ctx.stroke(); ctx.fillStyle = A.leaf; ctx.beginPath(); ctx.ellipse(bx - u * .1, by2 - u * .1, u * .035, u * .02, -.6, 0, TAU); ctx.fill(); } // a twig with a leaf
  if (e.apatoPose === "slam" && M.pose !== "slam") M.slamAt = now; else if (M.slamAt != null && now - M.slamAt > APATO_FX.dustMs) M.slamAt = null; M.pose = e.apatoPose;
  if (!reduce && M.slamAt != null) slamDust(ctx, A, hx + u * .08, -u * .02, u, (now - M.slamAt) / APATO_FX.dustMs, .6);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(.15); ctx.fillStyle = A.barkLight; ctx.strokeStyle = A.outline; ctx.beginPath(); ctx.ellipse(u * .06, 0, u * .1, u * .05, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c8ff6a"; ctx.beginPath(); ctx.arc(u * .07, -u * .015, u * .015, 0, TAU); ctx.fill(); // a green eye-knot
  ctx.fillStyle = A.leaf; ctx.beginPath(); ctx.ellipse(0, -u * .06, u * .025, u * .045, -.4, 0, TAU); ctx.fill(); ctx.restore(); // a leaf on its crown
  ctx.restore();
}
// ---------------------------------------------------------------- on the ground: its hazards, saplings, beam, lashing neck
// project(x, y): a world spot (tiles) to the canvas; `s` tile pixels; opts { quiet, capture } (capture: Close View's floor pass,
// which draws only what lies on the floor; drawn standing in Close View itself: close-view-apato.ts).
const DANGER_FILL = "rgba(255,80,190,.18)", DANGER_STRONG = "rgba(255,80,190,.32)", DANGER_EDGE = "rgba(255,130,210,.72)";
function ring(ctx, x, y, r, fill, edge, dash = false) { ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 2; if (dash) ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); } }
const SX = (x, s) => (x + .5) * s, SY = (y, s) => (y + .62) * s;
export function drawApatoSapling(ctx, x, y, s, grow, glow = 0, t = 0) {
  const h = s * (.25 + .45 * grow), sway = Math.sin(t * 2 + x) * s * .02;
  if (glow > 0) { const g = ctx.createRadialGradient(x, y - h * .6, 0, x, y - h * .6, s * .5); g.addColorStop(0, "rgba(244,255,154,.8)"); g.addColorStop(1, "rgba(244,255,154,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - h * .6, s * .5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "rgba(60,40,20,.5)"; ctx.beginPath(); ctx.ellipse(x, y, s * .14, s * .06, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = APATO_ART.bark; ctx.lineWidth = Math.max(1.5, s * (.03 + .03 * grow)); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sway, y - h * .5, x + sway * 2, y - h); ctx.stroke();
  ctx.fillStyle = APATO_ART.leaf; for (let i = 0; i < 2 + Math.round(grow * 3); i++) { const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * (.6 + i * .2), r = s * (.06 + .05 * grow); ctx.beginPath(); ctx.ellipse(x + sway * 2 + Math.cos(a) * r, y - h + Math.sin(a) * r * .6 + i * s * .02, r * .9, r * .45, a, 0, TAU); ctx.fill(); }
}
export function drawApatoGround(ctx, e, s, now, opts = {}) {
  const A = APATO_ART, quiet = !!opts.quiet, cap = !!opts.capture, t = quiet ? 0 : now / 1000, F = e.apatoFx;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  // saplings (standing: drawn in Close View itself when it captures the floor)
  for (const q of e.apatoSaplings || []) { const x = SX(q.x, s), y = SY(q.y, s); drawApatoSapling(ctx, x, y, s, Math.min(1, (q.grow || 0) / .7), q.grow > 0 && e.apatoBeam?.on ? .8 : 0, t); }
  // the wrap's coil mark: a ring of vine that follows you, then closes
  const W = e.apatoWrap;
  if (W?.on && (W.phase === "track" || W.phase === "lunge")) { const x = SX(W.x, s), y = SY(W.y, s), r = 1.15 * s; ring(ctx, x, y, r, W.phase === "lunge" ? DANGER_STRONG : DANGER_FILL, DANGER_EDGE, W.phase === "track");
    ctx.strokeStyle = A.vine; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU * 1.5 + (quiet ? 0 : t * 2), rr = r * (1 - i / 48) * (1 - .3 * (W.phase === "lunge" ? W.t : 0)); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * .6; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
  // the beam on the ground (from under the head along its line) and its light
  const B = e.apatoBeam;
  if (B?.on) { const x0 = SX(B.x, s), y0 = SY(B.y, s), x1 = SX(B.x + B.ax * B.len, s), y1 = SY(B.y + B.ay * B.len, s), wpx = B.width * s, flick = quiet ? 1 : .85 + .15 * Math.sin(t * 40);
    // its track on the ground: a soft green band, a bright core, scorched sparks where it ends
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(190,255,100,${(.22 * flick).toFixed(3)})`; ctx.lineWidth = wpx * 1.7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = `rgba(245,255,170,${(.55 * flick).toFixed(3)})`; ctx.lineWidth = wpx * .7; ctx.stroke(); ctx.strokeStyle = "rgba(255,255,235,.85)"; ctx.lineWidth = Math.max(1.5, wpx * .18); ctx.stroke();
    const gl = ctx.createRadialGradient(x1, y1, 0, x1, y1, s * .8); gl.addColorStop(0, "rgba(255,255,200,.7)"); gl.addColorStop(1, "rgba(160,255,90,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x1, y1, s * .8, 0, TAU); ctx.fill();
    if (!cap) { // the light from its eyes: from the head (where the body draws it, raised for the beam) down to the end of its track
      const sc = Math.max(.6, Number(e.scale) || 1), u = s * sc, fx = (Number(e.facingX) || 1) < 0 ? -1 : 1, hx = (e.x + .5) * s + fx * u * 1.16, hy = (e.y + .82) * s - u * (APATO_ART.bodyY + APATO_ART.headY + APATO_ART.headLift * .9 + .05);
      ctx.strokeStyle = `rgba(230,255,150,${(.35 * flick).toFixed(3)})`; ctx.lineWidth = wpx * .9; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,230,.8)"; ctx.lineWidth = Math.max(1.5, wpx * .22); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over"; }
  // the lashing neck (and the wrap's neck once it has shot out): a snake across the ground, its head at the end
  const Lh = e.apatoLash;
  if (Lh?.on && Lh.n >= 1) { const n = Lh.n; ring(ctx, SX(Lh.xs[n], s), SY(Lh.ys[n], s), .75 * s, DANGER_FILL, DANGER_EDGE); if (!cap) drawGroundNeck(ctx, A, s, Lh.xs, Lh.ys, n, e, t, quiet); }
  if (W?.on && W.phase !== "track" && !cap) { const h = e.apatoHeading || { x: e.facingX < 0 ? -1 : 1, y: 0 }, r = (Number(e.bodyRadius) || .9) * .55, bx = e.x + h.x * r, by = e.y + h.y * r, k = W.phase === "lunge" ? W.t : 1, tx = bx + (W.x - bx) * k, ty = by + (W.y - by) * k;
    GX[0] = bx; GY[0] = by; GX[1] = bx + (tx - bx) * .5 - (ty - by) * .12; GY[1] = by + (ty - by) * .5 + (tx - bx) * .12; GX[2] = tx; GY[2] = ty; drawGroundNeck(ctx, A, s, GX, GY, 2, e, t, quiet);
    if (W.phase === "hold") { const x = SX(W.x, s), y = SY(W.y, s); ctx.strokeStyle = A.hide; ctx.lineWidth = s * .16; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y - s * (.15 + i * .28), s * .42, s * .17, 0, 0, TAU); ctx.stroke(); } ctx.strokeStyle = A.outline; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y - s * (.15 + i * .28), s * .5, s * .22, 0, 0, TAU); ctx.stroke(); }
      if (!quiet) { ctx.fillStyle = A.venom; for (let i = 0; i < 6; i++) { const a = t * 3 + i, r = s * (.3 + .2 * ((t * 2 + i) % 1)); ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y - s * .9 - ((t * 2 + i) % 1) * s * .6, s * .05, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; } } }
  if (F) {
    // seeds: their landing spots, and the seed in its arc
    for (const q of F.seeds) { if (!q.on) continue; const x = SX(q.tx, s), y = SY(q.ty, s), k = q.delay > 0 ? 0 : Math.min(1, q.t / (q.total || 1)); ring(ctx, x, y, .9 * s * (.4 + .6 * k), DANGER_FILL, DANGER_EDGE, true);
      if (!cap && q.delay <= 0) { const fx = SX(q.fx, s), fy = SY(q.fy, s) - s * 1.2, px = fx + (x - fx) * k, py = fy + (y - fy) * k - Math.sin(Math.PI * k) * s * 2.2; ctx.fillStyle = "#b8823a"; ctx.strokeStyle = A.earthDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, s * .16, s * .1, k * 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = A.sprout; ctx.beginPath(); ctx.moveTo(px, py - s * .08); ctx.lineTo(px + s * .05, py - s * .17); ctx.stroke(); } }
    // spires: the cracked warning, then a spire of rock standing, then crumbling
    for (const q of F.spires) { if (!q.on) continue; const x = SX(q.x, s), y = SY(q.y, s), r = .75 * s;
      if (q.t < q.warn) { const k = q.t / q.warn; ring(ctx, x, y, r, k > .7 ? DANGER_STRONG : DANGER_FILL, DANGER_EDGE); ctx.strokeStyle = A.rockDark; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * .6 * k); ctx.stroke(); } }
      else if (!cap) { const k = Math.min(1, (q.t - q.warn) / .12), fade = Math.max(0, Math.min(1, (q.warn + q.up - q.t) / .25)), h = s * 1.8 * k * (.4 + .6 * fade); ctx.globalAlpha = .4 + .6 * fade; drawSpire(ctx, A, x, y, s, h); ctx.globalAlpha = 1; }
      else ring(ctx, x, y, r, DANGER_FILL, null); }
    // earth hands: a mound, a hand rising from it, a rock in its palm until thrown
    for (const q of F.hands) { if (!q.on) continue; const x = SX(q.x, s), y = SY(q.y, s), rise = Math.min(1, q.t / .7), sink = Math.max(0, Math.min(1, (q.life - q.t) / .5));
      ctx.fillStyle = A.earthDark; ctx.beginPath(); ctx.ellipse(x, y, s * .45, s * .2, 0, 0, TAU); ctx.fill();
      if (!cap) drawHand(ctx, A, x, y, s, rise * sink, q.throws > 0 && q.next < .5, t); }
    for (const q of F.rocks) { if (!q.on) continue; const x = SX(q.x, s), y = SY(q.y, s); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y, s * .22, s * .1, 0, 0, TAU); ctx.fill(); ring(ctx, x, y, .4 * s, DANGER_FILL, null); if (!cap) drawRock(ctx, A, x, y - s * .6, s * .28, t * 6); }
    // leaves and thorns
    for (const q of F.leaves) { if (!q.on) continue; const x = SX(q.x, s), y = SY(q.y, s); ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(x, y, s * .14, s * .06, 0, 0, TAU); ctx.fill(); if (!cap) drawLeaf(ctx, A, x, y - s * .45, s * 1.6, q.thorn ? Math.atan2(q.vy, q.vx) : quiet ? 0 : q.spin * 14, !!q.thorn); }
    // stomp waves: rings along the ground (jump them)
    for (const q of F.waves) { if (!q.on) continue; const x = SX(q.x, s), y = SY(q.y, s), r = Math.max(.05, q.r) * s; ctx.strokeStyle = DANGER_EDGE; ctx.lineWidth = Math.max(2, s * .14); ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "rgba(140,100,60,.7)"; ctx.lineWidth = Math.max(1, s * .06); ctx.stroke(); }
    // root necks: vines from its back to a hunting bud
    for (const q of F.roots) { if (!q.on) continue; const x = SX(q.x, s), y = SY(q.y, s), rise = Math.min(1, q.t / .45), fade = Math.max(0, Math.min(1, (q.life - q.t) / .4)); ring(ctx, x, y, .5 * s, DANGER_FILL, DANGER_EDGE);
      if (!cap) drawRoot(ctx, A, SX(q.bx, s), SY(q.by, s) - s * 1.5, x, y - s * .35, s, rise * fade, t, q.hx); }
  }
  ctx.restore();
}
const GX = new Float64Array(3), GY = new Float64Array(3);
// A neck over the ground through `n + 1` points (tiles): from its chest (high, where the body draws its shoulders) down to a head
// that skims the ground; one smooth tapering body (a spline through the midpoints), its head at the end.
const NSX = new Float64Array(40), NSY = new Float64Array(40);
function drawGroundNeck(ctx, A, s, xs, ys, n, e, t, quiet) {
  const scale = Math.max(.6, Number(e.scale) || 1), u = s * scale, fx = (Number(e.facingX) || 1) < 0 ? -1 : 1, chestH = u * (A.bodyY + A.bodyH * .2), last = Math.max(1, n), m = Math.min(n, 38);
  for (let i = 0; i <= m; i++) { const k = 1 - i / last, wave = quiet || i === 0 ? 0 : Math.sin(t * 8 - i * .9) * s * .05 * (i / last);
    NSX[i] = i === 0 ? (e.x + .5) * s + fx * A.bodyLen * .8 * u : SX(xs[i], s); NSY[i] = (i === 0 ? (e.y + .82) * s : SY(ys[i], s)) - chestH * k * k - s * .28 * (1 - k * k) + wave; }
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = s * .3; ctx.beginPath(); for (let i = 1; i <= m; i++) { const x = SX(xs[i], s), y = SY(ys[i], s); if (i > 1) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); // its shadow on the ground
  const W = (i) => u * (A.neckRoot - (A.neckRoot - A.neckTip) * Math.pow(i / last, .7)) * 1.9;
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < m; i++) {
    const x0 = i ? (NSX[i - 1] + NSX[i]) / 2 : NSX[0], y0 = i ? (NSY[i - 1] + NSY[i]) / 2 : NSY[0], x1 = (NSX[i] + NSX[i + 1]) / 2, y1 = (NSY[i] + NSY[i + 1]) / 2, w = W(i + .5);
    ctx.strokeStyle = pass === 0 ? A.outline : pass === 1 ? A.hide : A.belly; ctx.lineWidth = pass === 0 ? w + 3 : pass === 1 ? w : w * .3; ctx.globalAlpha = pass === 2 ? .45 : 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 + (pass === 2 ? w * .25 : 0)); ctx.quadraticCurveTo(NSX[i], NSY[i] + (pass === 2 ? w * .25 : 0), x1, y1 + (pass === 2 ? w * .25 : 0)); if (i === m - 1) ctx.lineTo(NSX[m], NSY[m] + (pass === 2 ? w * .25 : 0)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const a = Math.atan2(NSY[m] - NSY[Math.max(0, m - 1)], NSX[m] - NSX[Math.max(0, m - 1)]);
  ctx.translate(NSX[m], NSY[m]); if (Math.cos(a) < 0) { ctx.scale(-1, 1); drawHead(ctx, A, u, 0, 0, Math.PI - a, Number(e.apatoGlow) || 0, .45, quiet, t); } else drawHead(ctx, A, u, 0, 0, a, Number(e.apatoGlow) || 0, .45, quiet, t);
  ctx.restore();
}
function drawSpire(ctx, A, x, y, s, h) {
  const w = s * .42; ctx.fillStyle = A.rock; ctx.strokeStyle = A.rockDark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * .25, y - h * .55); ctx.lineTo(x + w * .05, y - h); ctx.lineTo(x + w * .3, y - h * .5); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = A.rockLight; ctx.beginPath(); ctx.moveTo(x - w * .25, y - h * .55); ctx.lineTo(x + w * .05, y - h); ctx.lineTo(x - w * .05, y - h * .3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = A.rockDark; ctx.beginPath(); ctx.ellipse(x, y, w * 1.1, w * .35, 0, 0, Math.PI); ctx.fill();
}
function drawHand(ctx, A, x, y, s, k, holding, t) {
  if (!(k > 0)) return; const h = s * 1.2 * k, w = s * .3;
  ctx.fillStyle = A.earth; ctx.strokeStyle = A.earthDark; ctx.lineWidth = 2;
  // the forearm out of the mound, the palm, four splayed fingers and a thumb
  ctx.beginPath(); ctx.moveTo(x - w * .6, y); ctx.quadraticCurveTo(x - w * .7, y - h * .45, x - w * .9, y - h * .7); ctx.lineTo(x + w * .9, y - h * .7); ctx.quadraticCurveTo(x + w * .7, y - h * .45, x + w * .6, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * .32, bx = x + (i - 1.5) * w * .5, by = y - h * .72, L = h * (.42 + (i === 1 || i === 2 ? .08 : 0)); ctx.lineWidth = w * .42; ctx.strokeStyle = A.earthDark; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L); ctx.stroke(); ctx.lineWidth = w * .3; ctx.strokeStyle = A.earthLight; ctx.stroke(); }
  ctx.lineWidth = w * .38; ctx.strokeStyle = A.earthDark; ctx.beginPath(); ctx.moveTo(x - w * .85, y - h * .5); ctx.lineTo(x - w * 1.35, y - h * .82); ctx.stroke(); ctx.lineWidth = w * .26; ctx.strokeStyle = A.earthLight; ctx.stroke();
  ctx.fillStyle = A.grass; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x - w * .4 + i * w * .4, y - h * .1 - i * h * .12, w * .12, w * .05, .5, 0, TAU); ctx.fill(); } // grass on the arm
  if (holding) drawRock(ctx, A, x, y - h * 1.15, s * .3, t);
}
function drawRock(ctx, A, x, y, r, spin) { ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.fillStyle = A.rock; ctx.strokeStyle = A.rockDark; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = r * (.8 + .2 * ((i * 5) % 3) / 2); if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = A.rockLight; ctx.beginPath(); ctx.arc(-r * .3, -r * .3, r * .25, 0, TAU); ctx.fill(); ctx.restore(); }
function drawLeaf(ctx, A, x, y, s, a, thorn) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (thorn) { ctx.fillStyle = A.thorn; ctx.strokeStyle = A.barkDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s * .2, 0); ctx.lineTo(-s * .12, -s * .05); ctx.lineTo(-s * .12, s * .05); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.fillStyle = A.leaf; ctx.strokeStyle = A.leafDark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-s * .2, 0); ctx.quadraticCurveTo(0, -s * .13, s * .2, 0); ctx.quadraticCurveTo(0, s * .13, -s * .2, 0); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * .18, 0); ctx.lineTo(s * .18, 0); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,220,.8)"; ctx.beginPath(); ctx.moveTo(-s * .2, 0); ctx.quadraticCurveTo(0, -s * .13, s * .2, 0); ctx.stroke(); }
  ctx.restore();
}
// A root neck: a knotted vine arcing from the beast's back down to its hunting bud.
function drawRoot(ctx, A, x0, y0, x1, y1, s, k, t, hx) {
  if (!(k > 0)) return; const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - s * 1.1, cx = x0 + (x1 - x0) * k, cy = y0 + (y1 - y0) * k;
  ctx.strokeStyle = A.vineDark; ctx.lineWidth = s * .3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx + Math.sin(t * 3 + x0) * s * .3, my, cx, cy); ctx.stroke();
  ctx.strokeStyle = A.vine; ctx.lineWidth = s * .2; ctx.stroke();
  ctx.strokeStyle = A.vineDark; ctx.lineWidth = s * .06; ctx.setLineDash([s * .06, s * .3]); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(y1 - my, x1 - mx)); ctx.fillStyle = A.bud; ctx.strokeStyle = A.vineDark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, s * .22, s * .14, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = A.thorn; for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(s * .14, i * s * .06); ctx.lineTo(s * .3, i * s * .12); ctx.lineTo(s * .18, 0); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#3a0c18"; ctx.beginPath(); ctx.ellipse(s * .17, 0, s * .05, s * .03, 0, 0, TAU); ctx.fill(); ctx.restore();
}
// A latched clone's coils round the Wayfarer, and a dazed duel foe's stars (drawn over the creature).
export function drawApatoMarks(ctx, e, s, now, quiet = false) {
  const t = quiet ? 0 : now / 1000;
  if (e.apatoLatched && e.apatoCoilAt) { const x = SX(e.apatoCoilAt.x, s), y = SY(e.apatoCoilAt.y, s); ctx.save(); ctx.strokeStyle = APATO_ART.bark; ctx.lineWidth = s * .1; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(x, y - s * (.25 + i * .3), s * .36, s * .14, 0, 0, TAU); ctx.stroke(); } ctx.restore(); }
  if (e.apatoDazed > 0 && !e.dead) { const u = s * Math.max(.6, Number(e.scale) || 1), x = (e.x + .5) * s, y = (e.y + .82) * s - u * 1.7; ctx.save(); ctx.fillStyle = "#fff6a0"; ctx.strokeStyle = "#7a5a00"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const a = t * 3 + i * TAU / 4, px = x + Math.cos(a) * u * .35, py = y + Math.sin(a) * u * .1; ctx.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? u * .03 : u * .07, b = j / 10 * TAU - Math.PI / 2; if (j) ctx.lineTo(px + Math.cos(b) * r, py + Math.sin(b) * r); else ctx.moveTo(px + Math.cos(b) * r, py + Math.sin(b) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore(); }
  if (e.apatoVenom > 0 && !e.dead && !quiet) { const u = s * Math.max(.6, Number(e.scale) || 1), x = (e.x + .5) * s, y = (e.y + .82) * s - u * .9; ctx.save(); ctx.fillStyle = APATO_ART.venom; ctx.globalAlpha = .7; for (let i = 0; i < 4; i++) { const k = (t * .8 + i / 4) % 1; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.3) * u * .4, y - k * u * .8, u * .04 * (1 - k * .5), 0, TAU); ctx.fill(); } ctx.restore(); }
}
// ---------------------------------------------------------------- Earth Resolve, its Echo: the root sigil under the Wayfarer
// q: game.earthResolve { x, y (tile centre), r (tiles), at, until (ms) }. A glowing ring of runes with roots growing out from it along
// the ground, their reach scaled with the radius; it brightens as she stands in it and fades over its last second. Floor only (both
// views draw it: Close View's floor is the capture, and close-view-beast-apato.ts raises a few cheap root spikes from it).
export const RESOLVE_ART = Object.freeze({ glow: "rgba(170,255,110,", rim: "rgba(90,180,60,", root: "#5a4026", rootLit: "#9cff5a", roots: 9, runes: 12, fade: 1000, grow: 450 });
export function drawEarthResolveSigil(ctx, q, s, now, inside = false, quiet = false) {
  if (!q) return false; const R = RESOLVE_ART, t = quiet ? 0 : now / 1000, x = q.x * s, y = q.y * s, r = q.r * s;
  const fade = Math.max(0, Math.min(1, (q.until - now) / R.fade)), born = Math.max(0, Math.min(1, (now - q.at) / R.grow)), a = fade * (.55 + (inside ? .35 : 0) + (quiet ? 0 : .1 * Math.sin(t * 3)));
  ctx.save(); ctx.lineCap = "round";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, R.glow + (.22 * a).toFixed(3) + ")"); g.addColorStop(.75, R.glow + (.1 * a).toFixed(3) + ")"); g.addColorStop(1, R.glow + "0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, 0, 0, Math.PI * 2); ctx.fill();
  // roots: from under her feet out past the ring, curling; their reach is the sigil's
  for (let i = 0; i < R.roots; i++) { const ang = i / R.roots * Math.PI * 2 + .3, len = r * (.85 + .3 * ((i * 7) % 3) / 2) * born, curl = (i % 2 ? 1 : -1) * .5, ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len * .6, mx = x + Math.cos(ang + curl * .5) * len * .55, my = y + Math.sin(ang + curl * .5) * len * .6 * .55;
    ctx.globalAlpha = fade; ctx.strokeStyle = R.root; ctx.lineWidth = Math.max(2, s * .1 * (1 - i % 3 * .2)); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = R.rootLit; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * .04); ctx.strokeStyle = R.root; ctx.globalAlpha = fade; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ang + curl) * s * .25, ey + Math.sin(ang + curl) * s * .15); ctx.stroke(); }
  // the ring and its runes
  ctx.globalAlpha = 1; ctx.strokeStyle = R.rim + (.9 * a).toFixed(3) + ")"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.ellipse(x, y, r * born, r * .6 * born, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = R.glow + a.toFixed(3) + ")"; ctx.lineWidth = Math.max(1, s * .035); ctx.beginPath(); ctx.ellipse(x, y, r * .78 * born, r * .47 * born, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < R.runes; i++) { const ang = i / R.runes * Math.PI * 2 + t * .2, rx = x + Math.cos(ang) * r * .89 * born, ry = y + Math.sin(ang) * r * .535 * born, k = s * .09;
    ctx.beginPath(); ctx.moveTo(rx - k, ry); ctx.lineTo(rx, ry - k * .7); ctx.lineTo(rx + k, ry); if (i % 2) { ctx.moveTo(rx, ry - k * .7); ctx.lineTo(rx, ry + k * .5); } ctx.stroke(); }
  ctx.restore(); return true;
}
// A duel foe held in its neck (e.apatoHeldBy): the front of the coils drawn over its body (the back half is under it, on the ground
// layer), three green bands round its middle with a dark edge, a drip of venom. q: the pack paint context of the held creature.
export function drawApatoCoilOver(ctx, q, now = 0) {
  const A = APATO_ART, { k, b, u, e } = q, quiet = !!e.reduceMotion, t = quiet ? 0 : now / 1000, cy = b - u * .55, rx = u * .62, ry = u * .2;
  ctx.save(); ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) { const y = cy - u * (.18 * (i - 1)) + (quiet ? 0 : Math.sin(t * 4 + i) * u * .01);
    ctx.strokeStyle = A.outline; ctx.lineWidth = u * .13; ctx.beginPath(); ctx.ellipse(k, y, rx, ry, 0, .1, Math.PI - .1); ctx.stroke();
    ctx.strokeStyle = A.hide; ctx.lineWidth = u * .1; ctx.stroke(); ctx.strokeStyle = A.belly; ctx.globalAlpha = .5; ctx.lineWidth = u * .03; ctx.beginPath(); ctx.ellipse(k, y + u * .02, rx, ry, 0, .3, Math.PI - .3); ctx.stroke(); ctx.globalAlpha = 1; }
  if (!quiet) { ctx.fillStyle = A.venom; for (let i = 0; i < 4; i++) { const f = (t * 1.3 + i / 4) % 1; ctx.globalAlpha = 1 - f; ctx.beginPath(); ctx.arc(k + (i - 1.5) * u * .25, cy + u * .25 + f * u * .4, u * .035, 0, TAU); ctx.fill(); } }
  ctx.restore(); return true;
}
