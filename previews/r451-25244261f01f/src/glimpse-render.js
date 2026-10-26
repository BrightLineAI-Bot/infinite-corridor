// Glimpse drawing (release 193). Each Glimpse is painted by code onto one full-screen canvas, frame by frame: layered
// light, depth, particles and a slowly moving first-person viewpoint. No image files, nothing fetched. The catalogue and
// rules are in glimpses.ts. `drawGlimpse(ctx, id, t, w, h, state)` paints one frame at time t (0..1); `startGlimpse`
// runs one on a canvas until it ends or is stopped.
import { GLIMPSES } from "./glimpses.js?v=r451-25244261f01f";
import { TAU, clamp, lerp, smooth, seeded, hex, mix, rgba, makeCanvas, glow, vignette, fadeEdges, grain } from "./glimpse-paint.js?v=r451-25244261f01f";
import { SCENES } from "./glimpse-scenes.js?v=r451-25244261f01f";
import { HORROR } from "./glimpse-horror.js?v=r451-25244261f01f";
import { LEGEND } from "./glimpse-legend.js?v=r451-25244261f01f";
import { paintHand } from "./glimpse-hand.js?v=r451-25244261f01f";

// ------------------------------------------------------------------ The Wagon at Dusk
// You sit on a wagon bench; your worn hands hold the reins. The road unrolls through birches toward a setting sun, a
// lantern swings at the edge of sight, and someone asleep against your shoulder breathes slowly.
function wagonSetup(state) {
  const r = seeded(1913);
  state.clouds = Array.from({ length: 7 }, (_, i) => ({ x: r(), y: .1 + r() * .26, len: .18 + r() * .3, th: .012 + r() * .018, puffs: Array.from({ length: 9 }, () => [r() - .5, r() - .5, .5 + r() * .7]), speed: .002 + r() * .004, i }));
  state.stars = Array.from({ length: 90 }, () => [r(), r() * .42, .3 + r() * .9, r() * TAU]);
  state.hills = [0, 1, 2].map((k) => Array.from({ length: 5 }, () => [1 + r() * 5 + k * 2, r() * TAU, .3 + r() * .7]));
  state.canopies = [11, 12, 13, 14].map(canopySprite);
  state.trees = Array.from({ length: 22 }, (_, i) => ({ side: i % 2 ? 1 : -1, off: 1.9 + r() * 2.8, z0: r() * 34, h: 5.5 + r() * 3.5, lean: (r() - .5) * .08,
    marks: Array.from({ length: 11 }, () => [r(), r() * .7 + .15, r() * .5 + .4]),
    crowns: Array.from({ length: 2 + (i % 2) }, (_, k) => ({ sprite: (i + k) % 4, x: (r() - .5) * .5, y: .6 + k * .22 + r() * .1, s: .32 + r() * .14, ph: r() * TAU })) }));
  state.stones = Array.from({ length: 50 }, () => [(r() - .5) * 2.4, r() * 30, .03 + r() * .07]);
  state.tufts = Array.from({ length: 220 }, () => [(r() < .5 ? -1 : 1) * (1.3 + r() * 5), r() * 30, .08 + r() * .2, r()]);
  state.patches = Array.from({ length: 90 }, () => [(r() - .5) * 16, r() * 30, .6 + r() * 2.2, r()]);
  state.motes = Array.from({ length: 46 }, () => [r(), r(), .5 + r(), r() * TAU]);
  state.spots = Array.from({ length: 7 }, () => [r() - .5, r() - .5, .02 + r() * .03]);
}
// A birch canopy painted once into a sprite (hundreds of small leaves, shadowed inside, sunlit at the rim) and then
// drawn scaled every frame.
function canopySprite(seed) {
  const S = 220, c = makeCanvas(S, S), g = c.getContext("2d"), r = seeded(seed);
  const clumps = Array.from({ length: 6 }, () => [S * (.25 + r() * .5), S * (.2 + r() * .55), S * (.13 + r() * .12)]);
  for (const pass of [0, 1, 2]) for (const [x, y, rad] of clumps) for (let k = 0; k < (pass ? 70 : 90); k++) {
    const a = r() * TAU, d = Math.sqrt(r()) * rad, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * .8, lit = (lx - x + y - ly) / rad;
    if (pass === 1 && lit < 0) continue; if (pass === 2 && lit < .45) continue;
    g.fillStyle = pass === 0 ? (r() < .5 ? "#3a3a1a" : "#4a4420") : pass === 1 ? (r() < .5 ? "#a8902c" : "#8a9030") : (r() < .6 ? "#f4d468" : "#ffe9a0");
    g.globalAlpha = pass === 2 ? .9 : .85;
    g.beginPath(); g.ellipse(lx, ly, S * (.012 + r() * .01), S * (.006 + r() * .005), r() * TAU, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.strokeStyle = "rgba(60,50,40,.6)"; g.lineWidth = 1.2; // thin twigs
  for (const [x, y] of clumps) { g.beginPath(); g.moveTo(S / 2, S); g.quadraticCurveTo(S / 2 + (x - S / 2) * .3, (S + y) / 2, x, y); g.stroke(); }
  // Tinted copies of the same leaves: hazed by distance, darkened by dusk.
  const tinted = (color) => { const v = makeCanvas(S, S), vg = v.getContext("2d"); vg.drawImage(c, 0, 0); vg.globalCompositeOperation = "source-in"; vg.fillStyle = color; vg.fillRect(0, 0, S, S); return v; };
  return { leaf: c, haze: tinted("#b4a0b0"), dark: tinted("#241c2a") };
}
// One gloved hand gripping a rein, from behind and above, backlit by the sunset: the fist's knuckles toward the horse,
// rim-lit warm along the top, the lantern warming its outer side. `e` is -1 left, 1 right. Painted: glimpse-hand.ts.
function drawHand(ctx, px, py, s, e, dusk, warm, state, h) {
  paintHand(ctx, { x: px, y: py - s * .22, angle: e * .2, s: s * 1.05, foreshorten: .62, curl: 1, splay: 0, thumb: "side", mirror: e, skin: { base: mix("#24170f", "#0e0906", dusk * .7), shade: mix("#0a0604", "#030201", dusk * .7), light: mix(mix("#5a3a24", "#22160c", dusk * .7), "#a0583a", warm * .4) }, rim: { color: "#ff9a50", a: .75 * (1 - dusk * .55), width: .03 }, light: -1.75, shadow: .8, lift: .06, sleeve: { color: mix("#1c1812", "#0a0806", dusk), len: h, lightColor: "#ffb878" }, time: state.handT, seed: e > 0 ? 7 : 8 });
}
// The horse ahead, from behind and above: rump, back, collar, neck, ears; walking, nodding, tail swaying.
function drawHorse(ctx, hx, hy, H, T, dusk, lamp, unit) {
  const step = Math.sin(T * 3.3), nod = Math.sin(T * 3.3 + .8) * H * .025, coat = mix("#3e2414", "#140b07", dusk * .85), light = mix("#8a5432", "#30190f", dusk * .7), rim = rgba("#ffb878", .8 * (1 - dusk * .6));
  // Neck and head beyond the collar, mane down the crest, ears up.
  const poll = [hx + step * H * .01, hy - H * 1.18 + nod];
  const neck = ctx.createLinearGradient(hx - H * .2, 0, hx + H * .2, 0); neck.addColorStop(0, coat); neck.addColorStop(.75, light); neck.addColorStop(1, coat);
  ctx.fillStyle = neck; ctx.beginPath(); ctx.moveTo(hx - H * .2, hy - H * .7); ctx.bezierCurveTo(hx - H * .2, hy - H * .92, poll[0] - H * .13, poll[1] + H * .14, poll[0] - H * .1, poll[1]); ctx.quadraticCurveTo(poll[0], poll[1] - H * .06, poll[0] + H * .1, poll[1]); ctx.bezierCurveTo(poll[0] + H * .13, poll[1] + H * .14, hx + H * .2, hy - H * .92, hx + H * .2, hy - H * .7); ctx.closePath(); ctx.fill();
  for (const e of [-1, 1]) { ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(poll[0] + e * H * .03, poll[1] - H * .02); ctx.quadraticCurveTo(poll[0] + e * H * .09, poll[1] - H * .12, poll[0] + e * H * .075 + e * step * H * .01, poll[1] - H * .17); ctx.quadraticCurveTo(poll[0] + e * H * .11, poll[1] - H * .08, poll[0] + e * H * .1, poll[1] - H * .01); ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = unit * .002; ctx.stroke(); }
  ctx.strokeStyle = mix("#1a0f09", "#0a0604", dusk); ctx.lineCap = "round";
  for (let k = 0; k < 9; k++) { const y = lerp(poll[1] + H * .02, hy - H * .72, k / 8), x = lerp(poll[0], hx, k / 8) + Math.sin(T * 2 + k) * H * .012; ctx.lineWidth = H * (.05 - k * .002); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(k * 1.7) * H * .03, y + H * .07); ctx.stroke(); }
  // Collar and hames at the withers, brass knobs catching the lantern.
  ctx.lineWidth = H * .11; ctx.strokeStyle = mix("#2a1a12", "#0e0907", dusk); ctx.beginPath(); ctx.ellipse(hx, hy - H * .7, H * .27, H * .12, 0, Math.PI * .95, Math.PI * 2.05); ctx.stroke();
  ctx.fillStyle = rgba("#ffd08a", .55 + lamp * .4); for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + e * H * .3, hy - H * .8, H * .03, 0, TAU); ctx.fill(); }
  // The back, broadening toward you, with the backband across it.
  const back = ctx.createLinearGradient(hx - H * .5, 0, hx + H * .5, 0); back.addColorStop(0, coat); back.addColorStop(.6, light); back.addColorStop(1, coat);
  ctx.fillStyle = back; ctx.beginPath(); ctx.moveTo(hx - H * .27, hy - H * .7); ctx.bezierCurveTo(hx - H * .4, hy - H * .55, hx - H * .5, hy - H * .42, hx - H * .52, hy - H * .3); ctx.lineTo(hx + H * .52, hy - H * .3); ctx.bezierCurveTo(hx + H * .5, hy - H * .42, hx + H * .4, hy - H * .55, hx + H * .27, hy - H * .7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = mix("#24160e", "#0c0806", dusk); ctx.lineWidth = H * .06; ctx.beginPath(); ctx.moveTo(hx - H * .44, hy - H * .5); ctx.quadraticCurveTo(hx, hy - H * .56, hx + H * .44, hy - H * .5); ctx.stroke();
  // The rump: one broad mass rolling with each step, a shallow groove down the spine, rim light from the sun ahead.
  const tilt = step * .05, rump = ctx.createRadialGradient(hx + H * .12, hy - H * .32, H * .05, hx, hy - H * .12, H * .62);
  rump.addColorStop(0, light); rump.addColorStop(.55, coat); rump.addColorStop(1, mix("#1a0e08", "#080504", dusk));
  ctx.save(); ctx.translate(hx, hy - H * .12); ctx.rotate(tilt);
  ctx.fillStyle = rump; ctx.beginPath(); ctx.moveTo(-H * .56, -H * .18); ctx.bezierCurveTo(-H * .58, -H * .36, -H * .3, -H * .44, 0, -H * .38); ctx.bezierCurveTo(H * .3, -H * .44, H * .58, -H * .36, H * .56, -H * .18);
  ctx.bezierCurveTo(H * .58, H * .12, H * .4, H * .32, H * .1, H * .34); ctx.lineTo(-H * .1, H * .34); ctx.bezierCurveTo(-H * .4, H * .32, -H * .58, H * .12, -H * .56, -H * .18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rim; ctx.lineWidth = unit * .005; ctx.beginPath(); ctx.moveTo(-H * .5, -H * .3); ctx.bezierCurveTo(-H * .3, -H * .44, H * .3, -H * .44, H * .5, -H * .3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(H * .56, -H * .18); ctx.bezierCurveTo(H * .58, 0, H * .52, H * .15, H * .4, H * .26); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = rgba("#0e0805", .28); ctx.lineWidth = H * .025; ctx.beginPath(); ctx.moveTo(hx, hy - H * .48); ctx.quadraticCurveTo(hx + step * H * .01, hy - H * .25, hx, hy + H * .05); ctx.stroke();
  // Breeching strap round the rump; the tail falling and swaying.
  ctx.strokeStyle = mix("#2a1a10", "#0e0906", dusk); ctx.lineWidth = H * .05; ctx.beginPath(); ctx.moveTo(hx - H * .54, hy - H * .02); ctx.quadraticCurveTo(hx, hy + H * .14, hx + H * .54, hy - H * .02); ctx.stroke();
  ctx.strokeStyle = mix("#140c08", "#060403", dusk);
  for (let k = 0; k < 7; k++) { const sw = Math.sin(T * 1.4 + k * .15) * H * .1; ctx.lineWidth = H * (.06 - k * .006); ctx.beginPath(); ctx.moveTo(hx + (k - 3) * H * .006, hy - H * .42); ctx.bezierCurveTo(hx + sw * .3, hy - H * .2, hx + sw * .8 + (k - 3) * H * .01, hy + H * .05, hx + sw + (k - 3) * H * .025, hy + H * .3); ctx.stroke(); }
}
function drawWagon(ctx, t, w, h, state) {
  if (!state.trees) wagonSetup(state);
  const T = t * 14, dusk = smooth(0, 1, t), cx = w / 2, unit = Math.min(w, h);
  const bob = Math.abs(Math.sin(T * 3.3)) * unit * .006, roll = Math.sin(T * .9) * .012 + Math.sin(T * 3.3) * .003;
  const horizon = h * .44;
  ctx.save();
  ctx.translate(cx, h / 2 + bob); ctx.rotate(roll); ctx.translate(-cx, -h / 2);
  // Sky: dusk deepens as the sun goes down.
  const sky = ctx.createLinearGradient(0, -h * .05, 0, horizon);
  sky.addColorStop(0, mix("#26305e", "#080b1d", dusk)); sky.addColorStop(.55, mix("#8b5c86", "#2b2148", dusk)); sky.addColorStop(.85, mix("#f09a62", "#7a3f58", dusk)); sky.addColorStop(1, mix("#ffd29a", "#c46a54", dusk));
  ctx.fillStyle = sky; ctx.fillRect(-w * .1, -h * .1, w * 1.2, horizon + h * .1);
  for (const [x, y, s, ph] of state.stars) { const a = smooth(.35, .9, t) * (.5 + .5 * Math.sin(T * 1.7 + ph)) * (1 - y * 1.6); if (a > .02) { ctx.fillStyle = `rgba(235,235,255,${a})`; ctx.fillRect(x * w, y * horizon * 1.6, s * unit * .0025, s * unit * .0025); } }
  const sunX = w * .6, sunY = horizon - h * (.07 - .11 * dusk);
  ctx.globalCompositeOperation = "lighter"; glow(ctx, sunX, sunY, w * .55, "#ff9a52", .5 * (1 - dusk * .7)); glow(ctx, sunX, sunY, unit * .14, "#ffe0a8", .8 * (1 - dusk * .8)); ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = rgba("#fff1c8", 1 - dusk * .6); ctx.beginPath(); ctx.arc(sunX, sunY, unit * .028, 0, TAU); ctx.fill();
  for (const c of state.clouds) {
    const x0 = ((c.x + T * c.speed) % 1.4 - .2) * w, y0 = c.y * horizon * 1.5;
    for (const [dx, dy, s] of c.puffs) {
      const px = x0 + dx * c.len * w, py = y0 + dy * c.th * h, rx = c.len * w * .2 * s, ry = c.th * h * s;
      const g = ctx.createLinearGradient(0, py - ry, 0, py + ry);
      g.addColorStop(0, rgba(dusk < .5 ? "#7e5f8c" : "#2c2446", .35)); g.addColorStop(1, rgba(dusk < .6 ? "#ffb27a" : "#a4566a", .55 * (1 - dusk * .5)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, TAU); ctx.fill();
    }
  }
  state.hills.forEach((waves, k) => {
    const base = horizon + h * (.005 + k * .012), amp = h * (.035 + k * .02), shade = [mix("#7c5f80", "#3a2d4c", dusk), mix("#4b3a57", "#241c33", dusk), mix("#2f2536", "#151019", dusk)][k];
    ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(-w * .1, horizon + h * .2);
    for (let x = -w * .1; x <= w * 1.1; x += w / 60) { let y = 0; for (const [f, ph, a] of waves) y += Math.sin(x / w * f + ph + T * .004 * (k + 1)) * a; ctx.lineTo(x, base - amp * (.6 + y * .35)); }
    ctx.lineTo(w * 1.1, horizon + h * .2); ctx.fill();
  });
  // Sun rays slanting down through the haze.
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 7; k++) { const a = Math.PI * (.55 + k * .085) + Math.sin(T * .2 + k) * .02, len = h * 1.4, spread = .025 + (k % 3) * .012, alpha = .07 * (1 - dusk * .85);
    const g = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(a) * len, sunY + Math.sin(a) * len); g.addColorStop(0, rgba("#ffd6a0", alpha)); g.addColorStop(1, rgba("#ffd6a0", 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX + Math.cos(a - spread) * len, sunY + Math.sin(a - spread) * len); ctx.lineTo(sunX + Math.cos(a + spread) * len, sunY + Math.sin(a + spread) * len); ctx.fill(); }
  ctx.globalCompositeOperation = "source-over";
  // Meadow and road in perspective. World: the road is 2.4 wide; the eye 1.9 above the ground.
  const f = h * .62, eye = 1.9, speed = 2.2, scroll = T * speed, project = (x, z) => [cx + x * f / z, horizon + eye * f / z], wrap0 = (z0) => ((z0 - scroll) % 30 + 30) % 30 + .9;
  const meadow = ctx.createLinearGradient(0, horizon, 0, h);
  meadow.addColorStop(0, mix("#a08a6a", "#3a2c38", dusk)); meadow.addColorStop(.12, mix("#6a6a3c", "#2a2a24", dusk)); meadow.addColorStop(1, mix("#2a3418", "#0e120a", dusk));
  ctx.fillStyle = meadow; ctx.fillRect(-w * .1, horizon, w * 1.2, h);
  const sunlit = ctx.createRadialGradient(sunX, horizon, 0, sunX, horizon, w * .6); sunlit.addColorStop(0, rgba("#ffcf80", .45 * (1 - dusk * .8))); sunlit.addColorStop(1, rgba("#ffcf80", 0));
  ctx.fillStyle = sunlit; ctx.fillRect(-w * .1, horizon, w * 1.2, h * .4);
  const haze = ctx.createLinearGradient(0, horizon - h * .06, 0, horizon + h * .05);
  haze.addColorStop(0, rgba("#ffb27a", 0)); haze.addColorStop(.6, rgba(dusk < .7 ? "#f2a070" : "#6a3a52", .4 * (1 - dusk * .5))); haze.addColorStop(1, rgba("#3b2a35", 0));
  ctx.fillStyle = haze; ctx.fillRect(-w * .1, horizon - h * .06, w * 1.2, h * .11);
  for (const [x, z0, s, k] of state.patches) { const z = wrap0(z0), [sx, sy] = project(x, z), rw = s * f / z, a = clamp(6 / z) * .22;
    if (Math.abs(x) < 1.6) continue;
    ctx.fillStyle = rgba(mix(k < .4 ? "#2a3416" : k < .75 ? "#5a6a2a" : "#9a8a48", "#141810", dusk), a); ctx.beginPath(); ctx.ellipse(sx, sy, rw, rw * .035, 0, 0, TAU); ctx.fill(); }
  const [lnx, lny] = project(-1.2, .9), [rnx] = project(1.2, .9), [fx, fy] = project(0, 80);
  const road = ctx.createLinearGradient(0, horizon, 0, h);
  road.addColorStop(0, mix("#c09878", "#4a3a3c", dusk)); road.addColorStop(.2, mix("#7a5c45", "#33282a", dusk)); road.addColorStop(1, mix("#3e2c1e", "#1a120e", dusk));
  ctx.fillStyle = road; ctx.beginPath(); ctx.moveTo(fx - 1, fy); ctx.lineTo(fx + 1, fy); ctx.lineTo(rnx, lny); ctx.lineTo(lnx, lny); ctx.fill();
  for (const [rx, a] of [[-.62, .5], [.62, .5], [-1.2, .35], [1.2, .35]]) { const [ax, ay] = project(rx, .9); ctx.strokeStyle = rgba("#1d1410", a); ctx.lineWidth = unit * (Math.abs(rx) > 1 ? .004 : .012); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(ax, ay); ctx.stroke(); }
  const wrap = (z0) => ((z0 - scroll) % 30 + 30) % 30 + .9;
  for (const [x, z0, s] of state.stones) { const z = wrap(z0), [sx, sy] = project(x, z), r = s * f / z; ctx.fillStyle = rgba("#1a120c", .55 * clamp(3 / z)); ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.6, r * .5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgba("#e8c09a", .25 * clamp(3 / z) * (1 - dusk)); ctx.beginPath(); ctx.ellipse(sx + r * .3, sy - r * .15, r * .6, r * .18, 0, 0, TAU); ctx.fill(); }
  for (const [x, z0, s, k] of state.tufts) {
    const z = wrap(z0), [sx, sy] = project(x, z), r = s * f / z, a = clamp(5 / z);
    ctx.strokeStyle = rgba(mix(k < .5 ? "#6a7a38" : "#9a8442", "#20261a", dusk), a * .8); ctx.lineWidth = Math.max(.8, r * .035); ctx.beginPath();
    for (let j = -4; j <= 4; j++) { const tip = sx + j * r * .22 + Math.sin(T * 1.5 + k * 9 + j) * r * .08; ctx.moveTo(sx + j * r * .05, sy); ctx.quadraticCurveTo(sx + j * r * .1, sy - r * .5, tip, sy - r * (.7 + ((j + 4) % 3) * .2)); }
    ctx.stroke();
    ctx.strokeStyle = rgba("#ffd9a0", a * .4 * (1 - dusk)); ctx.beginPath(); ctx.moveTo(sx + r * .1, sy - r * .4); ctx.lineTo(sx + r * .25, sy - r * .85); ctx.stroke();
  }
  // Birches passing on both sides, far to near.
  const trees = state.trees.map((q) => ({ ...q, z: ((q.z0 - scroll) % 34 + 34) % 34 + .6 })).sort((a, b) => b.z - a.z);
  for (const q of trees) {
    const x = q.side * q.off, [bx, by] = project(x, q.z), s = f / q.z, th = q.h * s, tw = Math.max(1.5, .15 * s), fog = clamp((q.z - 4) / 28);
    if (bx < -w * .4 || bx > w * 1.4) continue;
    const topX = bx + q.lean * th, sunSide = q.side < 0 ? .72 : .4;
    const [sx1, sy1] = project(x - .3, Math.max(.7, q.z - 7)); // a long shadow reaching toward you
    ctx.fillStyle = rgba("#0c0a10", .28 * (1 - dusk * .6) * (1 - fog)); ctx.beginPath(); ctx.moveTo(bx - tw, by); ctx.lineTo(bx + tw, by); ctx.lineTo(sx1 + tw * 3, sy1); ctx.lineTo(sx1 - tw * 3, sy1); ctx.fill();
    const bark = ctx.createLinearGradient(bx - tw, 0, bx + tw, 0);
    bark.addColorStop(0, mix(mix("#8c8a8e", "#7c6c78", fog), "#2a2430", dusk * .7)); bark.addColorStop(sunSide, mix(mix("#f6efe4", "#b4a0a8", fog), "#5c4a58", dusk * .75)); bark.addColorStop(1, mix(mix("#a8a09c", "#7c6c78", fog), "#3a3040", dusk * .7));
    ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(bx - tw, by); ctx.lineTo(topX - tw * .3, by - th); ctx.lineTo(topX + tw * .3, by - th); ctx.lineTo(bx + tw, by); ctx.fill();
    ctx.fillStyle = rgba("#1a1418", .75 * (1 - fog * .6));
    for (const [m, y, l] of q.marks) { const yy = by - th * y, xx = lerp(bx, topX, y) + (m - .5) * tw * (1 - y * .6); ctx.fillRect(xx - tw * l * .5, yy, tw * l * (1 - y * .5), Math.max(1, th * .007)); }
    for (const c of q.crowns) {
      const size = c.s * th * 1.6, px = lerp(bx, topX, c.y) + c.x * th * .3, py = by - th * c.y, sway = Math.sin(T * 1.3 + c.ph) * .04;
      const sp = state.canopies[c.sprite];
      ctx.save(); ctx.translate(px, py); ctx.rotate(sway); ctx.globalAlpha = 1 - fog * .35;
      ctx.drawImage(sp.leaf, -size / 2, -size / 2, size, size);
      if (fog > .05) { ctx.globalAlpha = fog * .7; ctx.drawImage(sp.haze, -size / 2, -size / 2, size, size); }
      if (dusk > .05) { ctx.globalAlpha = dusk * .75; ctx.drawImage(sp.dark, -size / 2, -size / 2, size, size); }
      ctx.restore();
    }
  }
  // The horse, the shafts and the wagon's front board.
  const hx = cx + Math.sin(T * 3.3) * unit * .004, hy = h * .72 + bob * .5, H = unit * .3, lamp = .35 + dusk * .65;
  ctx.strokeStyle = mix("#6e4e36", "#2a1d15", dusk); ctx.lineWidth = unit * .022; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(w * .12, h * .86); ctx.lineTo(hx - H * .62, hy - H * .25); ctx.moveTo(w * .88, h * .86); ctx.lineTo(hx + H * .62, hy - H * .25); ctx.stroke();
  drawHorse(ctx, hx, hy, H, T, dusk, lamp, unit);
  const board = ctx.createLinearGradient(0, h * .8, 0, h * .9);
  board.addColorStop(0, mix("#c08a5a", "#4a3020", dusk)); board.addColorStop(.06, mix("#3a281a", "#140e09", dusk)); board.addColorStop(1, mix("#1a120c", "#080504", dusk));
  ctx.fillStyle = board; ctx.fillRect(-w * .1, h * .8, w * 1.2, h * .3);
  ctx.strokeStyle = rgba("#1a120c", .45); ctx.lineWidth = unit * .002; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-w * .1, h * (.83 + k * .02)); ctx.bezierCurveTo(w * .3, h * (.835 + k * .02), w * .6, h * (.825 + k * .02), w * 1.1, h * (.832 + k * .02)); ctx.stroke(); }
  // The reins, from the bit down over the board to your hands, sagging and swaying.
  const hands = [[w * .35, h * .87], [w * .63, h * .875]], sway = Math.sin(T * 1.9) * unit * .012, nod = Math.sin(T * 3.3 + .8) * H * .025;
  ctx.lineWidth = unit * .008; ctx.strokeStyle = mix("#6b4a2e", "#2a1c12", dusk);
  hands.forEach(([px, py], i) => { const e = i ? 1 : -1, bitX = hx + e * H * .08, bitY = hy - H * 1.12 + nod; ctx.beginPath(); ctx.moveTo(bitX, bitY); ctx.bezierCurveTo(hx + e * H * .25, hy - H * .7 + sway, lerp(bitX, px, .7) + sway, py - unit * .1, px - e * unit * .05, py - unit * .04); ctx.stroke(); });
  // The lantern hanging from its hook at the right, swinging; it brightens as the light goes.
  const swing = Math.sin(T * 1.25) * .18, pivot = [w * .95, -h * .05], len = h * .36, lx = pivot[0] + Math.sin(swing) * len, ly = pivot[1] + Math.cos(swing) * len;
  const flick = .9 + .1 * Math.sin(T * 17) * Math.sin(T * 7.3);
  ctx.globalCompositeOperation = "lighter"; glow(ctx, lx, ly, unit * .6, "#ff9b45", .22 * lamp * flick); glow(ctx, lx, ly, unit * .15, "#ffd48a", .55 * lamp * flick); ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "#151010"; ctx.lineWidth = unit * .005; ctx.beginPath(); ctx.moveTo(...pivot); ctx.lineTo(lx, ly - unit * .08); ctx.stroke();
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(-swing * .6);
  const lw = unit * .075, lh = unit * .11;
  const glass = ctx.createRadialGradient(0, lh * .05, 0, 0, 0, lw * .6); glass.addColorStop(0, rgba("#fff0c0", .9 * lamp * flick)); glass.addColorStop(1, rgba("#c87a30", .55 * lamp));
  ctx.fillStyle = glass; ctx.fillRect(-lw * .4, -lh * .35, lw * .8, lh * .7);
  ctx.fillStyle = rgba("#fffbe8", flick); ctx.beginPath(); ctx.moveTo(0, -lh * .14 * flick); ctx.quadraticCurveTo(lw * .1, lh * .05, 0, lh * .14); ctx.quadraticCurveTo(-lw * .1, lh * .05, 0, -lh * .14 * flick); ctx.fill();
  ctx.strokeStyle = "#1a1412"; ctx.lineWidth = unit * .007; ctx.strokeRect(-lw * .42, -lh * .37, lw * .84, lh * .74);
  for (const e of [-.15, .15]) { ctx.beginPath(); ctx.moveTo(lw * e, -lh * .37); ctx.lineTo(lw * e, lh * .37); ctx.stroke(); }
  ctx.fillStyle = "#1a1412"; ctx.beginPath(); ctx.moveTo(-lw * .52, -lh * .37); ctx.lineTo(0, -lh * .64); ctx.lineTo(lw * .52, -lh * .37); ctx.fill(); ctx.fillRect(-lw * .5, lh * .37, lw, lh * .09);
  ctx.strokeStyle = rgba("#ffcf8a", .5 * lamp); ctx.lineWidth = unit * .002; ctx.beginPath(); ctx.moveTo(-lw * .5, -lh * .37); ctx.lineTo(0, -lh * .64); ctx.stroke();
  ctx.restore();
  // Someone asleep against your left shoulder, wrapped in a plaid blanket; it rises and falls with their breathing.
  const breath = Math.sin(T * .75) * unit * .008;
  ctx.save(); ctx.beginPath(); ctx.moveTo(-w * .1, h * .5 + breath); ctx.bezierCurveTo(w * .08, h * .44 + breath, w * .2, h * .56 + breath, w * .24, h * .74 + breath); ctx.bezierCurveTo(w * .26, h * .86, w * .26, h * .96, w * .25, h * 1.1); ctx.lineTo(-w * .1, h * 1.1); ctx.closePath();
  const wool = ctx.createLinearGradient(0, h * .45, w * .28, h); wool.addColorStop(0, mix("#3a1a16", "#160a08", dusk)); wool.addColorStop(1, mix("#140a08", "#060303", dusk));
  ctx.fillStyle = wool; ctx.fill(); ctx.clip();
  ctx.lineWidth = unit * .012; ctx.strokeStyle = rgba(mix("#0e1420", "#05070a", dusk), .4); // plaid: dark bands both ways, thin gold lines
  for (let k = -2; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-w * .1 + k * unit * .07, h * .4); ctx.lineTo(-w * .1 + k * unit * .07 + w * .1, h * 1.1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-w * .1, h * .45 + k * unit * .07 + breath); ctx.lineTo(w * .3, h * .52 + k * unit * .07 + breath); ctx.stroke(); }
  ctx.lineWidth = unit * .002; ctx.strokeStyle = rgba(mix("#a88040", "#3a2c18", dusk), .25);
  for (let k = -2; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-w * .1 + k * unit * .07 + unit * .02, h * .4); ctx.lineTo(-w * .1 + k * unit * .07 + w * .1 + unit * .02, h * 1.1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-w * .1, h * .47 + k * unit * .07 + breath); ctx.lineTo(w * .3, h * .54 + k * unit * .07 + breath); ctx.stroke(); }
  const fold = ctx.createLinearGradient(w * .02, 0, w * .26, 0); fold.addColorStop(0, "rgba(0,0,0,.35)"); fold.addColorStop(.7, "rgba(0,0,0,0)"); fold.addColorStop(1, "rgba(0,0,0,.4)");
  ctx.fillStyle = fold; ctx.fillRect(-w * .1, h * .4, w * .4, h * .7); ctx.restore();
  ctx.strokeStyle = rgba(mix("#c8704a", "#4a2018", dusk), .8); ctx.lineWidth = unit * .002; ctx.lineCap = "round"; // fringe along the edge, stirring
  for (let k = 0; k < 26; k++) { const u = k / 25, x = lerp(-w * .05, w * .235, u), y = lerp(h * .48, h * .7, u * u) + breath, sw = Math.sin(T * 1.3 + k) * unit * .006; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + unit * .012, y - unit * .01, x + unit * .02 + sw, y - unit * .025); ctx.stroke(); }
  ctx.strokeStyle = rgba("#ffb878", .5 * (1 - dusk * .6)); ctx.lineWidth = unit * .004; ctx.beginPath(); ctx.moveTo(-w * .1, h * .5 + breath); ctx.bezierCurveTo(w * .08, h * .44 + breath, w * .2, h * .56 + breath, w * .24, h * .74 + breath); ctx.stroke();
  // Your hands on the reins.
  state.handT = T; hands.forEach(([px, py0], i) => drawHand(ctx, px, py0 + Math.sin(T * 3.3 + i) * unit * .004, unit * .3, i ? 1 : -1, dusk, clamp(.15 + dusk * .5 + i * .3), state, h * 1.2 - py0));
  // Motes and, later, fireflies in the warm air.
  ctx.globalCompositeOperation = "lighter";
  for (const [x, y, s, ph] of state.motes) {
    const px = ((x + Math.sin(T * .3 + ph) * .02 + T * .004) % 1) * w, py = ((y - T * .01 * s) % 1 + 1) % 1 * h * .8;
    const fire = smooth(.45, .8, t) * (s > 1.1 ? 1 : 0), a = .25 + .2 * Math.sin(T * 2 + ph) + fire * (.5 + .5 * Math.sin(T * 3 + ph * 3));
    glow(ctx, px, py, unit * (.006 + fire * .012) * s, fire ? "#d8ff8a" : "#ffd9a0", clamp(a));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
  vignette(ctx, w, h, .7 + dusk * .15, "#06040a");
}

// ------------------------------------------------------------------ The Lantern, Faceted
// A moth's flight to a hanging lantern at night, seen through compound eyes: a mosaic of hexagonal facets, each a little
// out of place and a moment out of time. Wings beat at the edges; forelegs reach for the glass.
const LANTERN_BASE = [240, 150];
function lanternBase(g, t, state) {
  const [W, H] = LANTERN_BASE, T = t * 12, r = state.lanternRand ||= seeded(77);
  if (!state.lanternBits) { const q = seeded(4242); state.lanternBits = { leaves: Array.from({ length: 34 }, () => [q(), q(), .4 + q(), q() * TAU, q()]), bokeh: Array.from({ length: 18 }, () => [q(), q(), .5 + q(), q()]), moths: Array.from({ length: 5 }, () => [q() * TAU, .5 + q(), .6 + q()]) }; }
  const near = smooth(0, 1, t) ** 1.6, dist = lerp(5, .55, near);
  const swirl = (1 - near) * 1.4, ang = T * 2.1 + Math.sin(T * 5.7) * .35;
  const jx = (Math.sin(T * 9.1) + Math.sin(T * 13.7)) * .6, jy = (Math.sin(T * 8.3) + Math.cos(T * 11.9)) * .6;
  const lx = W / 2 + Math.cos(ang) * swirl * W * .16 + jx, ly = H / 2 + Math.sin(ang) * swirl * H * .22 + jy, scale = W * .09 / dist;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0a1024"); bg.addColorStop(.6, "#121a2c"); bg.addColorStop(1, "#1a1e22"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const mist = g.createLinearGradient(0, H * .55, 0, H); mist.addColorStop(0, "rgba(90,110,150,0)"); mist.addColorStop(1, "rgba(90,110,150,.25)"); g.fillStyle = mist; g.fillRect(0, H * .55, W, H * .45);
  for (const [x, y, s, k] of state.lanternBits.bokeh) { const px = ((x - (lx - W / 2) / W * .4) % 1 + 1) % 1 * W, py = y * H; g.globalCompositeOperation = "lighter"; glow(g, px, py, 4 + s * 8, k < .5 ? "#3a5a9a" : "#6a4a8a", .35); g.globalCompositeOperation = "source-over"; }
  // Leaves around the lantern, silhouetted, the near ones swinging past as you fly.
  for (const [x, y, s, a, k] of state.lanternBits.leaves) {
    const depth = .4 + k * 1.2, px = lx + (x - .5) * W * 1.6 / depth * (1 + near), py = ly + (y - .5) * H * 1.6 / depth * (1 + near), sz = s * scale * .5 / depth;
    if (px < -sz * 2 || px > W + sz * 2 || py < -sz * 2 || py > H + sz * 2) continue;
    g.fillStyle = k < .3 ? "#0d1a12" : "#16261a"; g.beginPath(); g.ellipse(px, py, sz, sz * .38, a + Math.sin(T * .7 + k * 9) * .15, 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,200,120,${.18 / depth})`; g.lineWidth = .5; g.stroke();
  }
  const flick = .85 + .15 * Math.sin(T * 19) * Math.sin(T * 7.1);
  g.globalCompositeOperation = "lighter"; glow(g, lx, ly, scale * 6, "#ff9a3a", .45 * flick); glow(g, lx, ly, scale * 2.2, "#ffd890", .8 * flick); g.globalCompositeOperation = "source-over";
  // The lantern: iron frame, smoked glass, a living flame.
  g.save(); g.translate(lx, ly); g.rotate(Math.sin(T * .9) * .08);
  const fw = scale * .9, fh = scale * 1.4;
  g.fillStyle = `rgba(255,190,110,${.5 * flick})`; g.fillRect(-fw / 2, -fh / 2, fw, fh);
  g.fillStyle = `rgba(255,248,220,${flick})`; g.beginPath(); g.ellipse(0, fh * .08, fw * .12, fh * .2 * flick, 0, 0, TAU); g.fill();
  g.strokeStyle = "#160f0c"; g.lineWidth = Math.max(.6, scale * .09); g.strokeRect(-fw / 2, -fh / 2, fw, fh);
  g.beginPath(); g.moveTo(0, -fh / 2); g.lineTo(0, fh / 2); g.moveTo(-fw / 2, 0); g.lineTo(fw / 2, 0); g.stroke();
  g.fillStyle = "#160f0c"; g.beginPath(); g.moveTo(-fw * .6, -fh / 2); g.lineTo(0, -fh * .85); g.lineTo(fw * .6, -fh / 2); g.fill();
  g.beginPath(); g.moveTo(0, -fh * .85); g.lineTo(0, -H * 2); g.stroke();
  g.restore();
  // Other moths circling the light.
  for (const [p, rr, sp] of state.lanternBits.moths) { const a = T * sp * 3 + p, mx = lx + Math.cos(a) * scale * 2.6 * rr, my = ly + Math.sin(a * 1.3) * scale * 1.8 * rr; g.fillStyle = "rgba(40,30,24,.85)"; g.beginPath(); g.ellipse(mx, my, scale * .22, scale * .1 * (1 + Math.sin(T * 40 + p)), a, 0, TAU); g.fill(); }
  // Your own wings beating at the top corners, translucent and veined.
  const beat = Math.sin(T * 26);
  for (const e of [-1, 1]) {
    g.save(); g.translate(W / 2 + e * W * .55, -H * .05); g.rotate(e * (.6 + beat * .35));
    const wg = g.createLinearGradient(0, 0, -e * W * .3, H * .5); wg.addColorStop(0, "rgba(120,96,70,.75)"); wg.addColorStop(1, "rgba(80,64,50,.2)");
    g.fillStyle = wg; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-e * W * .35, H * .1, -e * W * .28, H * .55); g.quadraticCurveTo(-e * W * .1, H * .4, 0, 0); g.fill();
    g.strokeStyle = "rgba(40,30,20,.6)"; g.lineWidth = .6; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(-e * W * (.08 * k), H * (.16 * k)); g.stroke(); }
    g.restore();
  }
  // Forelegs reaching for the glass as you land.
  const reach = smooth(.7, .9, t);
  if (reach > 0) for (const e of [-1, 1]) {
    g.strokeStyle = "#1c140e"; g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath();
    const bx = W / 2 + e * W * .18, by = H * 1.05, kx = W / 2 + e * W * (.3 - reach * .08), ky = H * (.85 - reach * .25), fx2 = W / 2 + e * W * (.12 - reach * .06), fy2 = H * (.62 - reach * .12);
    g.moveTo(bx, by); g.lineTo(kx, ky); g.lineTo(fx2, fy2); g.stroke();
    g.fillStyle = "#c8a070"; g.beginPath(); g.arc(kx, ky, 1, 0, TAU); g.fill();
  }
  // The final flare as you touch the light.
  const flare = smooth(.86, .97, t); if (flare > 0) { g.fillStyle = `rgba(255,236,200,${flare})`; g.fillRect(0, 0, W, H); }
}
function drawLantern(ctx, t, w, h, state) {
  const [W, H] = LANTERN_BASE;
  if (!state.history) { state.history = Array.from({ length: 3 }, () => makeCanvas(W, H)); state.base = 0; }
  // Three frames of memory: each facet sees a moment slightly older or newer than its neighbours.
  state.base = (state.base + 1) % 3; const cur = state.history[state.base];
  lanternBase(cur.getContext("2d"), t, state);
  // Large hexagonal facets, each holding its own small copy of the world, shifted by where it sits on the eye.
  const R = Math.min(w, h) / (state.quality === "low" ? 5.2 : 6.4), dx = Math.sqrt(3) * R, dy = R * 1.5;
  if (!state.facets || state.facetKey !== `${w}x${h}x${R}`) {
    const r = seeded(31), facets = [];
    for (let row = -1, y = -R * .5; y < h + R; row++, y += dy) for (let x = (row & 1 ? dx / 2 : 0) - dx / 2; x < w + dx; x += dx) facets.push({ x, y, jx: (r() - .5) * .03, jy: (r() - .5) * .03, lag: Math.floor(r() * 3), hue: r(), rot: (r() - .5) * .06 });
    const lens = makeCanvas(w, h), lg = lens.getContext("2d");
    for (const f of facets) {
      lg.save(); hexPath(lg, f.x, f.y, R * .97); lg.clip();
      const sh = lg.createRadialGradient(f.x - R * .35, f.y - R * .4, R * .04, f.x, f.y, R);
      sh.addColorStop(0, "rgba(255,255,255,.28)"); sh.addColorStop(.18, "rgba(255,255,255,.04)"); sh.addColorStop(.7, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.6)");
      lg.fillStyle = sh; lg.fillRect(f.x - R, f.y - R, R * 2, R * 2); lg.restore();
      lg.strokeStyle = "rgba(4,3,2,.9)"; lg.lineWidth = Math.max(1.5, R * .06); hexPath(lg, f.x, f.y, R); lg.stroke();
      lg.strokeStyle = "rgba(120,100,70,.25)"; lg.lineWidth = 1; hexPath(lg, f.x, f.y, R * .93); lg.stroke();
    }
    state.facets = facets; state.lens = lens; state.facetKey = `${w}x${h}x${R}`;
  }
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  const T = t * 12, span = .62; // each facet sees about this share of the frame
  for (const f of state.facets) {
    const u = f.x / w - .5, v = f.y / h - .5, src = state.history[(state.base + 3 - Math.min(f.lag, 2)) % 3];
    const sw = W * span, shh = H * span, sx = clamp(W * (.5 + u * .55 + f.jx) - sw / 2, 0, W - sw), sy = clamp(H * (.5 + v * .55 + f.jy) - shh / 2, 0, H - shh);
    ctx.save(); hexPath(ctx, f.x, f.y, R); ctx.clip();
    ctx.translate(f.x, f.y); ctx.rotate(f.rot + Math.sin(T * .7 + f.hue * 9) * .01);
    const k = Math.max(2.1 * R / sw, 2.1 * R / shh), dw = sw * k, dh = shh * k; ctx.drawImage(src, sx, sy, sw, shh, -dw / 2, -dh / 2, dw, dh); // cover the whole facet
    ctx.globalCompositeOperation = "color"; ctx.fillStyle = `hsla(${30 + f.hue * 40},40%,50%,.12)`; ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
  }
  ctx.drawImage(state.lens, 0, 0);
  vignette(ctx, w, h, .8);
}
function hexPath(g, x, y, r) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }

// ------------------------------------------------------------------ The Rule
// Your vision is a cellular automaton, Rule 30 and then Rule 110, unfolding toward you across a plane without end.
// One cell blinks out of step with the rule. That cell is you.
const RULE_WIDTH = 161;
function ruleRows(state, upTo) {
  const rows = state.ruleRows ||= [], switchAt = state.ruleSwitch;
  if (!rows.length) { const seed = new Uint8Array(RULE_WIDTH); seed[RULE_WIDTH >> 1] = 1; rows.push(seed); }
  while (rows.length <= upTo) {
    const prev = rows[rows.length - 1], next = new Uint8Array(RULE_WIDTH), rule = rows.length < switchAt ? 30 : 110;
    for (let i = 0; i < RULE_WIDTH; i++) { const l = prev[(i + RULE_WIDTH - 1) % RULE_WIDTH], c = prev[i], r = prev[(i + 1) % RULE_WIDTH]; next[i] = (rule >> (l << 2 | c << 1 | r)) & 1; }
    if (rows.length === switchAt) for (let i = 0; i < RULE_WIDTH; i += 7) next[i] ^= 1; // the seam where the rule changes
    rows.push(next);
  }
  return rows;
}
function drawRule(ctx, t, w, h, state) {
  const T = t * 13, rate = 9, rowsVisible = 170;
  state.ruleSwitch ||= Math.round(.45 * 13 * rate) + 12;
  const scroll = T * rate - 10; // rows already behind you
  const rows = ruleRows(state, Math.ceil(13 * rate + rowsVisible + 2)); // every row the Glimpse will show, built once
  // Texture: each cell a 4×4 tile with a dark rim, so cells read as tiles up close. Rule 30 cyan, Rule 110 violet.
  if (!state.tex || state.texRows < rows.length) {
    const C = 4, tex = makeCanvas(RULE_WIDTH * C, rows.length * C), tg = tex.getContext("2d"), img = tg.createImageData(RULE_WIDTH * C, rows.length * C), W4 = RULE_WIDTH * C;
    rows.forEach((row, y) => { const late = y >= state.ruleSwitch; for (let x = 0; x < RULE_WIDTH; x++) for (let py = 0; py < C; py++) for (let px = 0; px < C; px++) {
      const i = ((y * C + py) * W4 + x * C + px) * 4, rim = px === 0 || py === 0, on = row[x], core = px > 0 && px < 3 && py > 0 && py < 3;
      const c = on ? (late ? [176, 104, 255] : [52, 214, 255]) : [6, 10, 22];
      const k = rim ? .25 : core && on ? 1.15 : 1;
      img.data[i] = Math.min(255, c[0] * k); img.data[i + 1] = Math.min(255, c[1] * k); img.data[i + 2] = Math.min(255, c[2] * k); img.data[i + 3] = 255;
    } });
    tg.putImageData(img, 0, 0); state.tex = tex; state.texRows = rows.length;
  }
  const end = smooth(.78, .97, t), pitch = end * h * .9, horizon = h * .34 - pitch, f = h * .95, eye = .55, cx = w / 2, cell = .085, C = 4;
  ctx.fillStyle = "#010207"; ctx.fillRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, horizon - h * .3, 0, horizon); sky.addColorStop(0, "rgba(10,20,60,0)"); sky.addColorStop(1, `rgba(40,90,160,${.3 * (1 - end)})`);
  ctx.fillStyle = sky; ctx.fillRect(0, horizon - h * .3, w, h * .3);
  const plane = state.plane ||= makeCanvas(Math.max(1, w >> 2), Math.max(1, h >> 2)), pg = plane.getContext("2d");
  pg.clearRect(0, 0, plane.width, plane.height);
  ctx.imageSmoothingEnabled = false; pg.imageSmoothingEnabled = true;
  const fade = 1 - end * .97;
  for (let k = Math.ceil(scroll + rowsVisible); k >= Math.max(0, Math.floor(scroll + .5)); k--) {
    // Row k lies at world depth Z = (k - scroll) · cell; cells are square on the ground.
    const z = k - scroll, Z = z * cell; if (Z < .22) continue;
    const y0 = horizon + eye * f / (Z + cell), y1 = horizon + eye * f / Z, half = RULE_WIDTH / 2 * cell * f / Z;
    if (y0 > h || y1 < 0) continue;
    const a = clamp((rowsVisible - z) / 60) * clamp((Z - .22) / .15) * fade, depth = clamp(z / rowsVisible);
    ctx.globalAlpha = a * (1 - depth * .6); ctx.drawImage(state.tex, 0, k * C, RULE_WIDTH * C, C, cx - half, y0, half * 2, Math.max(1, y1 - y0 + .5));
    pg.globalAlpha = a; pg.drawImage(state.tex, 0, k * C, RULE_WIDTH * C, C, (cx - half) / 4, y0 / 4, half / 2, Math.max(.5, (y1 - y0) / 4 + .25));
  }
  ctx.globalAlpha = 1;
  const fogG = ctx.createLinearGradient(0, horizon, 0, horizon + h * .12); fogG.addColorStop(0, `rgba(30,60,110,${.55 * fade})`); fogG.addColorStop(1, "rgba(30,60,110,0)");
  ctx.fillStyle = fogG; ctx.fillRect(0, horizon, w, h * .12);
  ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .35; ctx.drawImage(plane, 0, 0, w, h); ctx.globalAlpha = .18; ctx.drawImage(plane, -w * .02, -h * .02, w * 1.04, h * 1.04); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  // Grid lines between cells, faint, close to you.
  ctx.strokeStyle = `rgba(120,200,255,${.0 * fade})`; ctx.lineWidth = 1;
  for (let i = -40; i <= 40; i += 4) { const x = i * cell; ctx.beginPath(); ctx.moveTo(cx + x * f / 60, horizon + eye * f / 60); ctx.lineTo(cx + x * f / .5, horizon + eye * f / .5); ctx.stroke(); }
  // You: one cell, a fixed distance ahead, that keeps its own time.
  const zYou = lerp(22, 5, end), kk = Math.floor(scroll + zYou), Zy = (kk - scroll) * cell, col = (RULE_WIDTH >> 1) + 3;
  const y0 = horizon + eye * f / (Zy + cell), y1 = horizon + eye * f / Zy, cw = cell * f / Zy, x0 = cx + (col - RULE_WIDTH / 2) * cw;
  const beat = Math.sin(T * 2.3) + Math.sin(T * 3.71 + 1) + Math.sin(T * .9), on = end > 0 ? .55 + .45 * Math.sin(T * 4) : (beat > .4 ? 1 : .15);
  const last = 1 - smooth(.93, 1, t);
  ctx.globalCompositeOperation = "lighter"; glow(ctx, x0 + cw / 2, (y0 + y1) / 2, cw * (2.5 + end * 5), "#ffb050", .8 * on * last); ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(255,190,90,${on * last})`; ctx.fillRect(x0 + cw * .1, y0, cw * .8, y1 - y0);
  vignette(ctx, w, h, .8);
}
const DRAW = { wagonAtDusk: drawWagon, lanternFaceted: drawLantern, theRule: drawRule, ...SCENES, ...HORROR, ...LEGEND };
export function hasGlimpseRenderer(id) { return typeof DRAW[id] === "function"; }
export function drawGlimpse(ctx, id, t, w, h, state) {
  state.rand ||= seeded(5);
  ctx.save(); DRAW[id](ctx, clamp(t), w, h, state); ctx.restore();
  if (state.quality !== "low") grain(ctx, w, h, state, .06);
  fadeEdges(ctx, w, h, t);
}
// Runs a Glimpse on `canvas` and calls onEnd when it finishes. With reduced motion it shows three held stills that fade
// into one another. Returns { stop() }.
export function startGlimpse(canvas, id, { reduceMotion = false, quality = "balanced", onEnd = () => {}, now = () => performance.now(), frame = (cb) => requestAnimationFrame(cb) } = {}) {
  const def = GLIMPSES[id]; if (!def) { onEnd(); return { stop() {} }; }
  const scale = Math.min(quality === "low" ? 1 : 2, globalThis.devicePixelRatio || 1);
  const w = Math.round((canvas.clientWidth || innerWidth) * scale), h = Math.round((canvas.clientHeight || innerHeight) * scale);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d"), state = { quality }, start = now(), seconds = reduceMotion ? def.reduced.length * 3.2 : def.seconds;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const e = (now() - start) / 1000 / seconds;
    if (e >= 1) { stopped = true; onEnd(); return; }
    if (!reduceMotion) drawGlimpse(ctx, id, e, w, h, state);
    else {
      // Still frames: each held, crossfading through black at the joins.
      const n = def.reduced.length, k = Math.min(n - 1, Math.floor(e * n)), local = e * n - k;
      drawGlimpse(ctx, id, def.reduced[k], w, h, state);
      const dark = Math.max(1 - smooth(0, .2, local), smooth(.8, 1, local));
      ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, w, h);
    }
    frame(tick);
  };
  frame(tick);
  return { stop() { stopped = true; } };
}

// ------------------------------------------------------------------ an Elder's speech (release 197)
// An Elder speaks one rule as a pattern: rows unfolding downward from a random row, in the rule's own colour, with a
// soft glow. `canvas` is sized by CSS; rows appear over `seconds` unless reduced motion asks for it all at once.
export function paintRule(canvas, rule, start, { cols = 72, rows = 46, seconds = 1.6, reduceMotion = false, rowsOf } = {}) {
  const scale = Math.min(2, globalThis.devicePixelRatio || 1), w = Math.round((canvas.clientWidth || 300) * scale), h = Math.round(w * rows / cols);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d"), cell = w / cols, grid = rowsOf(rule, cols, rows, start), hue = (rule * 137.508) % 360;
  const lit = `hsl(${hue},80%,66%)`, core = `hsl(${hue},90%,86%)`, began = performance.now();
  const draw = (shown) => {
    ctx.fillStyle = "#04060c"; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < shown; y++) for (let x = 0; x < cols; x++) if (grid[y][x]) {
      ctx.fillStyle = lit; ctx.fillRect(x * cell + cell * .08, y * cell + cell * .08, cell * .84, cell * .84);
      ctx.fillStyle = core; ctx.fillRect(x * cell + cell * .3, y * cell + cell * .3, cell * .4, cell * .4);
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .35; ctx.filter = `blur(${cell}px)`; ctx.drawImage(canvas, 0, 0); ctx.restore();
    const g = ctx.createLinearGradient(0, h * .75, 0, h); g.addColorStop(0, "rgba(4,6,12,0)"); g.addColorStop(1, "rgba(4,6,12,.85)"); ctx.fillStyle = g; ctx.fillRect(0, h * .75, w, h * .25);
  };
  if (reduceMotion) { draw(rows); return; }
  const tick = () => { const shown = Math.min(rows, Math.ceil((performance.now() - began) / 1000 / seconds * rows)); draw(shown); if (shown < rows && canvas.isConnected) requestAnimationFrame(tick); };
  draw(1); requestAnimationFrame(tick);
}
