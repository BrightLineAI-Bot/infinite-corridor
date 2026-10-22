// Glimpses of horror and violence (release 203; Tim, 2026-10-19: "some of the scenes need to be scenes of horror …
// some of them should be violent"). Same contract as glimpse-scenes.ts: draw(ctx, t, w, h, state) paints frame
// t ∈ [0, 1] in first person. Violence is shown the way the rest of the game shows it: silhouette, light and red,
// never anatomy. Canvas 2D only, no assets.
import { TAU, clamp, lerp, smooth, seeded, mix, rgba, glow, vignette } from "./glimpse-paint.js?v=r327-ae92ea7193c7";
import { paintHand } from "./glimpse-hand.js?v=r327-ae92ea7193c7";

// A hard jolt of the view, for impacts: amplitude in pixels at time t around `at`.
const jolt = (t, at, len, amp) => (t > at && t < at + len ? amp * (1 - (t - at) / len) : 0);
// Red across the view, from the edges in, for wounds and blood.
function redVeil(ctx, w, h, k) {
  if (k <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .15, w / 2, h / 2, Math.hypot(w, h) * .6);
  g.addColorStop(0, `rgba(120,0,0,${k * .15})`); g.addColorStop(1, `rgba(90,0,0,${k * .85})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
// Spatter: drops thrown across the view from one point, drawn as dark red flecks with a wet highlight.
function spatter(ctx, cx, cy, u, k, seed) {
  if (k <= 0) return;
  const r = seeded(seed);
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = Math.pow(r(), .6) * u * .9 * Math.min(1, k * 3), s = u * (.004 + r() * r() * .03);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .8 + k * u * .1 * r(); // they run down a little
    ctx.fillStyle = `rgba(${90 + r() * 50 | 0},0,${r() * 10 | 0},${.85 * clamp(k * 4)})`;
    ctx.beginPath(); ctx.ellipse(x, y, s * (1 + r()), s, a, 0, TAU); ctx.fill();
    if (s > u * .01) { ctx.fillStyle = `rgba(255,120,110,${.25 * clamp(k * 4)})`; ctx.beginPath(); ctx.arc(x - s * .3, y - s * .3, s * .3, 0, TAU); ctx.fill(); }
  }
}

// ------------------------------------------------------------------ The Fourth Floor
// A yellow stairwell. You climb with your hand on the rail; the door at the top is ajar. Inside, a small figure turns
// away from you toward a lamp. Your hands lift something heavy. The light swings; the floor goes dark and wet; a ring
// of keys sways on its hook long after.
function drawFourthFloor(ctx, t, w, h, state) {
  const T = t * 14, u = Math.min(w, h), climb = smooth(0, .38, t), inside = smooth(.36, .44, t), strike = .66;
  const shake = jolt(t, strike, .05, u * .03) * Math.sin(T * 90);
  ctx.save(); ctx.translate(shake, shake * .5);
  if (inside < 1) {
    // The stairwell: sickly yellow walls in one-point perspective, steps rising, each step bobbing the view.
    ctx.globalAlpha = 1 - inside;
    const bob = Math.abs(Math.sin(T * 4)) * u * .015, vy = h * .42 - climb * h * .1 + bob;
    const wall = ctx.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, "#5a5020"); wall.addColorStop(.5, "#a89a46"); wall.addColorStop(1, "#4a4018");
    ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2410"; ctx.beginPath(); ctx.moveTo(w * .38, vy - h * .16); ctx.lineTo(w * .62, vy - h * .16); ctx.lineTo(w * .62, vy + h * .1); ctx.lineTo(w * .38, vy + h * .1); ctx.fill(); // the landing above
    const door = smooth(.15, .38, t);
    ctx.fillStyle = "#1a1408"; ctx.fillRect(w * .45, vy - h * .14, w * .1, h * .22);
    ctx.fillStyle = rgba("#ffd27a", .25 + door * .4); ctx.fillRect(w * .45, vy - h * .14, w * .1 * (.12 + door * .2), h * .22); // the gap of light where it stands ajar
    for (let k = 0; k < 14; k++) { // steps
      const s = (k + (T * 1.6) % 1) / 14, y = lerp(h * 1.05, vy + h * .1, Math.pow(s, .55)), half = lerp(w * .7, w * .12, Math.pow(s, .55));
      ctx.fillStyle = k % 2 ? "#3a3012" : "#4a3e18"; ctx.fillRect(w / 2 - half, y - h * .03 * (1 - s), half * 2, h * .03 * (1 - s) + 1);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(w / 2 - half, y, half * 2, Math.max(1, h * .006 * (1 - s)));
    }
    ctx.strokeStyle = "#1a1206"; ctx.lineWidth = u * .02; ctx.beginPath(); ctx.moveTo(w * .98, h * .75); ctx.quadraticCurveTo(w * .8, h * .55, w * .58, vy + h * .05); ctx.stroke(); // the rail
    paintHand(ctx, { x: w * .84, y: h * .66 + bob, angle: -2.2, s: u * .09, curl: .78, splay: .2, thumb: "side", skin: { base: "#2a1c12", shade: "#0e0806", light: "#5a4026" }, rim: { color: "#ffd27a", a: .45 }, light: -2.6, lift: .15, sleeve: { color: "#1a140c", len: u * .5 }, time: T, seed: 31 }); // your hand on it
    ctx.globalAlpha = 1;
  }
  if (inside > 0) {
    // The room: a low lamp, a small figure at the table turning away, a ring of keys on a hook.
    ctx.globalAlpha = inside;
    const lampSwing = t > strike ? Math.sin((t - strike) * 14 * 4) * (1 - smooth(strike, 1, t)) * .5 : 0;
    const lx = w * .62 + Math.sin(lampSwing) * u * .12, ly = h * .3;
    ctx.fillStyle = "#120c06"; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter"; glow(ctx, lx, ly, u * .9, "#ffb050", .55); glow(ctx, lx, ly, u * .2, "#ffe0a0", .7); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(0, h * .72, w, h * .28); // floor
    ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 1; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(w * k / 8 - w * .2, h); ctx.lineTo(w / 2 + (k - 4) * w * .05, h * .72); ctx.stroke(); }
    const fx = w * .5, fy = h * .72, turn = smooth(.46, .56, t), fallen = smooth(strike + .02, strike + .12, t);
    // An old woman on a low stool, seen from behind: a shawl over hunched shoulders, a small head with its hair in a
    // bun, all in silhouette against the lamp and lit along her right edge (release 223: real proportions, not a pawn).
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fallen * 1.35); ctx.filter = "blur(.6px)"; ctx.fillStyle = "#0a0604";
    const body = new Path2D(); body.moveTo(-u * .12, 0); body.bezierCurveTo(-u * .135, -u * .1, -u * .14, -u * .21, -u * .09, -u * .3); body.bezierCurveTo(-u * .07, -u * .33, -u * .035, -u * .34, -u * .018, -u * .345);
    body.lineTo(u * .016, -u * .345); body.bezierCurveTo(u * .04, -u * .34, u * .07, -u * .325, u * .085, -u * .29); body.bezierCurveTo(u * .11, -u * .2, u * .12, -u * .1, u * .115, 0); body.closePath(); ctx.fill(body);
    const hx0 = turn * u * .014, head = new Path2D(); head.ellipse(hx0, -u * .383, u * .036, u * .045, turn * .25, 0, TAU); head.ellipse(hx0 - u * .012, -u * .418, u * .02, u * .017, 0, 0, TAU); ctx.fill(head); // head and the bun of her hair
    ctx.strokeStyle = "rgba(255,190,110,.45)"; ctx.lineWidth = u * .006; ctx.lineCap = "round"; // the lamp along her right side
    ctx.beginPath(); ctx.moveTo(u * .02, -u * .344); ctx.bezierCurveTo(u * .045, -u * .338, u * .072, -u * .322, u * .086, -u * .288); ctx.bezierCurveTo(u * .108, -u * .2, u * .116, -u * .12, u * .113, -u * .04); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx0, -u * .383, u * .036, u * .045, turn * .25, -1.2, .9); ctx.stroke();
    ctx.strokeStyle = "rgba(40,24,12,.6)"; ctx.lineWidth = u * .003; for (let k = 0; k < 6; k++) { const fxk = -u * .1 + k * u * .04; ctx.beginPath(); ctx.moveTo(fxk, -u * .08 - Math.abs(k - 2.5) * u * .008); ctx.lineTo(fxk + u * .004, -u * .02); ctx.stroke(); } // folds in the shawl
    ctx.restore();
    // The keys on their hook, still swaying when everything else is still.
    const kx = w * .22, ky = h * .38, sway = Math.sin(T * 3.1) * (t > strike ? .5 : .08);
    ctx.strokeStyle = "#c8a050"; ctx.lineWidth = u * .004; ctx.beginPath(); ctx.arc(kx + Math.sin(sway) * u * .04, ky + Math.cos(sway) * u * .04, u * .022, 0, TAU); ctx.stroke();
    for (let k = 0; k < 4; k++) { const a = sway + (k - 1.5) * .3, x0 = kx + Math.sin(sway) * u * .04, y0 = ky + Math.cos(sway) * u * .04 + u * .02; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.sin(a) * u * .05, y0 + Math.cos(a) * u * .05); ctx.stroke(); }
    // Your hands, and what they lift: rising from below into the light, then coming down.
    const lift = smooth(.52, strike - .02, t), down = smooth(strike - .02, strike + .015, t), handY = h * (1.2 - lift * .75 + down * .9), handX = w * (.56 - lift * .04);
    if (lift > 0 && handY < h * 1.3) {
      ctx.save(); ctx.translate(handX, handY); ctx.rotate(-.5 + lift * .9 - down * 2.2);
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-u * .015, -u * .5, u * .03, u * .62); // the haft
      ctx.fillStyle = "#6a6a70"; ctx.beginPath(); ctx.moveTo(-u * .015, -u * .5); ctx.lineTo(-u * .11, -u * .56); ctx.quadraticCurveTo(-u * .13, -u * .47, -u * .11, -u * .4); ctx.lineTo(-u * .015, -u * .44); ctx.fill(); // the head
      ctx.strokeStyle = rgba("#ffe0b0", .6); ctx.lineWidth = u * .003; ctx.beginPath(); ctx.moveTo(-u * .11, -u * .56); ctx.quadraticCurveTo(-u * .13, -u * .47, -u * .11, -u * .4); ctx.stroke();
      for (const [fy, k] of [[u * .0, 0], [u * .09, 1]]) paintHand(ctx, { x: -u * .015, y: fy, angle: Math.PI / 2, mirror: k ? 1 : -1, s: u * .055, curl: 1, splay: 0, thumb: "side", skin: { base: "#1e140c", shade: "#080402", light: "#4a3220" }, rim: { color: "#ffc070", a: .12, width: .03 }, light: -2, lift: 0, shadow: .85, seed: 40 + k }); // fists on the haft
      ctx.restore();
    }
    // After: the light swinging, the floor darkening and wet, the room red at the edges.
    const pool = smooth(strike + .04, .95, t);
    if (pool > 0) { ctx.fillStyle = `rgba(70,0,0,${.9 * pool})`; ctx.beginPath(); ctx.ellipse(fx + u * .18, fy + u * .03, u * .32 * pool, u * .06 * pool, 0, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(255,140,90,${.2 * pool})`; ctx.beginPath(); ctx.ellipse(fx + u * .12, fy + u * .02, u * .08 * pool, u * .01, 0, 0, TAU); ctx.fill(); }
    redVeil(ctx, w, h, smooth(strike, strike + .05, t) * (.6 - .3 * smooth(.8, 1, t)));
    if (t > strike && t < strike + .012) { ctx.fillStyle = "rgba(255,240,230,.85)"; ctx.fillRect(0, 0, w, h); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  vignette(ctx, w, h, .85);
}

// ------------------------------------------------------------------ The Hunt
// You are the predator. Your sight is heat: the cold forest blue-black, living things burning white and orange. You
// run; the deer runs. You close, leap, and your forelimbs come down. Red. Then your own breath, slowing.
function drawHunt(ctx, t, w, h, state) {
  const T = t * 12, u = Math.min(w, h);
  if (!state.hunt) { const r = seeded(666); state.hunt = { trees: Array.from({ length: 40 }, () => ({ x: (r() - .5) * 12, z0: r() * 30, wd: .15 + r() * .35 })), brush: Array.from({ length: 90 }, () => [(r() - .5) * 14, r() * 30, r()]) }; }
  const H = state.hunt, leap = .62, hit = .7, run = 1 - smooth(hit, hit + .1, t), speed = 5.5 * run, z = T * speed;
  const gait = Math.sin(T * 9) * run, sh = jolt(t, hit, .06, u * .05) * Math.sin(T * 80);
  const horizon = h * .45 + gait * u * .02 - smooth(leap, hit, t) * h * .1 + smooth(hit, hit + .05, t) * h * .25;
  ctx.save(); ctx.translate(sh, sh * .6); ctx.rotate(gait * .015 + smooth(hit, hit + .08, t) * .2);
  ctx.fillStyle = "#020814"; ctx.fillRect(-w, -h, w * 3, h * 3);
  const ground = ctx.createLinearGradient(0, horizon, 0, h * 1.3); ground.addColorStop(0, "#04122a"); ground.addColorStop(1, "#0a2a4a");
  ctx.fillStyle = ground; ctx.fillRect(-w, horizon, w * 3, h * 2);
  const f = h * .7, proj = (x, zz) => [w / 2 + x * f / zz, horizon + 1.1 * f / zz];
  for (const [x, z0, k] of H.brush) { const zz = ((z0 - z) % 30 + 30) % 30 + .6, [sx, sy] = proj(x, zz), s = f / zz * .3; ctx.fillStyle = `rgba(30,70,120,${clamp(3 / zz) * .6})`; ctx.beginPath(); ctx.ellipse(sx, sy, s * (1 + k), s * .4, 0, 0, TAU); ctx.fill(); }
  const trees = H.trees.map((q) => ({ ...q, zz: ((q.z0 - z) % 30 + 30) % 30 + .5 })).sort((a, b) => b.zz - a.zz);
  for (const q of trees) { const [sx, sy] = proj(q.x, q.zz), wd = q.wd * f / q.zz; ctx.fillStyle = mix("#0a1a34", "#16365a", clamp(2 / q.zz)); ctx.fillRect(sx - wd / 2, -h, wd, sy + h); }
  // The deer: a heat-bright shape bounding away, nearer each second until you are on it.
  const dz = lerp(9, .9, smooth(.05, hit, t)), dx = Math.sin(T * 1.7) * .8 * run, [px, py] = proj(dx, dz), ds = f / dz;
  if (t < hit + .02) {
    const bound = Math.abs(Math.sin(T * 7)) * ds * .25;
    ctx.save(); ctx.translate(px, py - bound);
    const heat = ctx.createRadialGradient(0, -ds * .45, ds * .05, 0, -ds * .4, ds * .7); heat.addColorStop(0, "#fffbe0"); heat.addColorStop(.35, "#ffb030"); heat.addColorStop(.8, "#c02a10"); heat.addColorStop(1, "rgba(120,10,40,0)");
    ctx.fillStyle = heat; ctx.beginPath(); ctx.ellipse(0, -ds * .45, ds * .32, ds * .26, 0, 0, TAU); ctx.fill(); // body from behind
    ctx.beginPath(); ctx.ellipse(0, -ds * .82, ds * .1, ds * .14, 0, 0, TAU); ctx.fill(); // head
    ctx.strokeStyle = "#ffd070"; ctx.lineWidth = ds * .04; for (const e of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e * ds * .05, -ds * .92); ctx.lineTo(e * ds * .2, -ds * 1.15); ctx.lineTo(e * ds * .3, -ds * 1.1); ctx.stroke(); } // antlers
    ctx.strokeStyle = "#e06020"; ctx.lineWidth = ds * .06; const kick = Math.sin(T * 7) * ds * .15; for (const e of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e * ds * .18, -ds * .3); ctx.lineTo(e * ds * .2, -ds * .05 + kick * e); ctx.stroke(); }
    ctx.restore();
  }
  // Your forelimbs: heat-white claws thrown forward in the leap, raking down.
  const reach = smooth(leap, hit, t), rake = smooth(hit - .02, hit + .04, t);
  if (reach > 0 && t < .9) for (const e of [-1, 1]) {
    ctx.save(); ctx.translate(w / 2 + e * w * (.32 - reach * .12), h * (1.25 - reach * .55 + rake * .4)); ctx.rotate(e * (.5 - reach * .4));
    // A heavy furred foreleg, hot orange in heat-sight, ending in a broad paw and three dark hooked claws.
    const g = ctx.createLinearGradient(0, u * .4, 0, -u * .3); g.addColorStop(0, "#a02008"); g.addColorStop(.5, "#ff7a20"); g.addColorStop(1, "#ffd080");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-u * .1, u * .45); ctx.quadraticCurveTo(-u * .13, 0, -u * .09, -u * .22); ctx.quadraticCurveTo(0, -u * .32, u * .09, -u * .22); ctx.quadraticCurveTo(u * .13, 0, u * .1, u * .45); ctx.fill();
    ctx.strokeStyle = "rgba(120,20,0,.5)"; ctx.lineWidth = u * .004; for (let k = 0; k < 9; k++) { const y = -u * .15 + k * u * .06; ctx.beginPath(); ctx.moveTo(-u * .08, y); ctx.quadraticCurveTo(0, y - u * .02, u * .08, y); ctx.stroke(); } // fur bands
    ctx.fillStyle = "#1a0606"; ctx.lineCap = "round";
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * u * .05 - u * .015, -u * .25); ctx.quadraticCurveTo(k * u * .07, -u * .36, k * u * .05 - e * u * .03, -u * .4); ctx.quadraticCurveTo(k * u * .06 + u * .01, -u * .33, k * u * .05 + u * .015, -u * .25); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
  // The strike: a white flash, spatter thrown across your sight, the world tinted red; then stillness and breath.
  if (t > hit && t < hit + .01) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(0, 0, w, h); }
  spatter(ctx, w * .5, h * .45, u, smooth(hit, hit + .04, t), 31);
  redVeil(ctx, w, h, smooth(hit, hit + .05, t) * .7);
  const breath = smooth(hit + .05, 1, t) * (.5 + .5 * Math.sin(T * lerp(9, 3, smooth(hit, 1, t))));
  if (breath > 0) { ctx.fillStyle = `rgba(255,255,255,${.04 * breath})`; ctx.fillRect(0, 0, w, h); }
  vignette(ctx, w, h, .9, "#100000");
}

// ------------------------------------------------------------------ The Trench
// Night in a trench. Flares hang and drift; the sky flashes and the earth answers. The man ahead turns to say something
// you never hear. A shell lands. The world tips over, and there is only ringing white.
function drawTrench(ctx, t, w, h, state) {
  const T = t * 14, u = Math.min(w, h);
  if (!state.trench) { const r = seeded(1812); state.trench = { flashes: Array.from({ length: 9 }, () => [r() * .55, r(), .3 + r() * .7]), flares: Array.from({ length: 3 }, () => [r(), .1 + r() * .8]) }; }
  const S = state.trench, blast = .64, tip = smooth(blast, blast + .1, t), white = smooth(blast, blast + .015, t) * (1 - smooth(blast + .05, blast + .16, t) * .82);
  const quake = (jolt(t, blast, .08, u * .06) + S.flashes.reduce((a, [at, , k]) => a + jolt(t, at, .03, u * .012 * k), 0)) * Math.sin(T * 70);
  ctx.save(); ctx.translate(w / 2 + quake, h / 2 + quake * .7); ctx.rotate(tip * .9); ctx.translate(-w / 2, -h / 2);
  // Sky with drifting flares and distant shell flashes.
  let flash = 0; for (const [at, x, k] of S.flashes) flash = Math.max(flash, Math.max(0, 1 - Math.abs(t - at) * 45) * k);
  const sky = ctx.createLinearGradient(0, 0, 0, h * .5); sky.addColorStop(0, mix("#05060c", "#5a4a40", flash)); sky.addColorStop(1, mix("#1a1410", "#c09060", flash));
  ctx.fillStyle = sky; ctx.fillRect(-w, -h, w * 3, h * 2);
  for (const [x, ph] of S.flares) { const fx = (x + T * .01) * w, fy = h * (.12 + ((T * .02 + ph) % .3)); ctx.globalCompositeOperation = "lighter"; glow(ctx, fx, fy, u * .35, "#ffe0a0", .3); glow(ctx, fx, fy, u * .02, "#ffffff", .9); ctx.globalCompositeOperation = "source-over"; }
  // The trench walls: dark wet earth, revetment planks, sandbags along the lip.
  const lip = h * .48, mud = (side) => { ctx.fillStyle = mix("#1a140e", "#4a3a2a", flash * .6); ctx.beginPath(); ctx.moveTo(side < 0 ? -w : w * 2, -h); ctx.lineTo(side < 0 ? w * .3 : w * .7, lip); ctx.lineTo(side < 0 ? w * .22 : w * .78, h * 2); ctx.lineTo(side < 0 ? -w : w * 2, h * 2); ctx.fill(); };
  mud(-1); mud(1);
  ctx.fillStyle = mix("#0e0a06", "#3a2c1e", flash * .6); ctx.fillRect(w * .28, lip, w * .44, h * 2); // the far wall and the floor
  ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = u * .004; for (let k = 0; k < 8; k++) { const y = lip + k * h * .07; ctx.beginPath(); ctx.moveTo(w * (.3 - k * .01), y); ctx.lineTo(w * (.7 + k * .01), y); ctx.stroke(); }
  for (let k = 0; k < 9; k++) { ctx.fillStyle = mix("#2a2216", "#6a5a42", flash * .7); ctx.beginPath(); ctx.ellipse(w * (.3 + k * .05), lip - u * .01, u * .035, u * .018, 0, 0, TAU); ctx.fill(); }
  // The man ahead: helmet and shoulders against the light, turning toward you.
  const turn = smooth(.4, .55, t), mx = w * .5, my = h * .74, gone = t > blast + .01;
  if (gone) { ctx.fillStyle = "#06040a"; ctx.beginPath(); ctx.ellipse(mx + u * .05, h * .95, u * .2, u * .05, .1, 0, TAU); ctx.fill(); } // where he was
  if (!gone) {
  ctx.fillStyle = "#06040a"; ctx.beginPath(); ctx.moveTo(mx - u * .14, h * 1.1); ctx.quadraticCurveTo(mx - u * .15, my - u * .08, mx, my - u * .1); ctx.quadraticCurveTo(mx + u * .15, my - u * .08, mx + u * .14, h * 1.1); ctx.fill();
  ctx.beginPath(); ctx.ellipse(mx + turn * u * .015, my - u * .17, u * .05, u * .06, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(mx + turn * u * .015, my - u * .2, u * .095, u * .03, 0, 0, TAU); ctx.fill(); // brim
  ctx.strokeStyle = rgba("#ffd090", .5 + flash * .4); ctx.lineWidth = u * .003; ctx.beginPath(); ctx.ellipse(mx + turn * u * .015, my - u * .2, u * .095, u * .03, 0, Math.PI, TAU); ctx.stroke();
  if (turn > .3) { ctx.fillStyle = rgba("#c09070", .5 * turn); ctx.beginPath(); ctx.ellipse(mx + u * .03, my - u * .16, u * .015, u * .03, 0, 0, TAU); ctx.fill(); } // a sliver of his face
  }
  // Your rifle, held across the bottom of the view.
  ctx.save(); ctx.translate(w * .62, h * .96); ctx.rotate(-.35); ctx.fillStyle = "#1a120a"; ctx.fillRect(-u * .5, -u * .025, u * .9, u * .05); ctx.fillStyle = "#3a3a40"; ctx.fillRect(u * .2, -u * .015, u * .5, u * .02); ctx.restore();
  // The shell: a column of earth thrown up behind him, fire at its root, clods flying at you.
  if (t > blast) {
    const k = smooth(blast, blast + .06, t), fade = 1 - smooth(blast + .1, blast + .3, t);
    ctx.globalCompositeOperation = "lighter"; glow(ctx, mx, lip, u * 1.2 * k, "#ffa040", .8 * fade); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(20,14,8,${.95 * fade})`; ctx.beginPath(); ctx.moveTo(mx - u * .3 * k, lip); ctx.quadraticCurveTo(mx - u * .1, lip - h * .8 * k, mx, lip - h * .9 * k); ctx.quadraticCurveTo(mx + u * .12, lip - h * .8 * k, mx + u * .3 * k, lip); ctx.fill();
    const r = seeded(9); for (let i = 0; i < 40; i++) { const a = r() * TAU, d = k * u * (.3 + r() * 1.2); ctx.fillStyle = `rgba(30,20,12,${fade})`; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * d, lip - Math.abs(Math.sin(a)) * d, u * (.005 + r() * .02) * (1 + k), 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  // Deafness: everything goes white and ringing, then slowly grey, the sky tipped on its side.
  if (white > 0) { ctx.fillStyle = `rgba(235,230,220,${white})`; ctx.fillRect(0, 0, w, h); }
  if (t > blast + .1) { ctx.strokeStyle = `rgba(80,70,60,${.25 * (1 - smooth(.85, 1, t))})`; ctx.lineWidth = 1; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(w / 2, h / 2, u * (.1 + k * .1 + (T * .05) % .1), 0, TAU); ctx.stroke(); } }
  vignette(ctx, w, h, .8);
}

// ------------------------------------------------------------------ The Drowning
// You are under the water, looking up at the light. Something has your ankle. Pale hands rise out of the dark and take
// hold, more and more of them. The light grows small.
function drawDrowning(ctx, t, w, h, state) {
  const T = t * 13, u = Math.min(w, h);
  if (!state.drown) { const r = seeded(4242); state.drown = { hands: Array.from({ length: 14 }, (_, i) => ({ x: r(), at: .12 + i * .045 + r() * .03, a: (r() - .5) * .8, s: .7 + r() * .6 })), bubbles: Array.from({ length: 50 }, () => [r(), r(), .4 + r()]) }; }
  const S = state.drown, depth = smooth(.1, .95, t), lightR = lerp(u * .45, u * .03, depth);
  const water = ctx.createLinearGradient(0, 0, 0, h); water.addColorStop(0, mix("#3a7a86", "#06141a", depth)); water.addColorStop(.5, mix("#12404a", "#030a0e", depth)); water.addColorStop(1, "#010406");
  ctx.fillStyle = water; ctx.fillRect(0, 0, w, h);
  // The surface, far above: a rippling disc of light shrinking as you sink, rays slanting down from it.
  const sx = w / 2 + Math.sin(T * .7) * u * .03, sy = h * .1;
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 7; k++) { const a = Math.PI / 2 + (k - 3) * .14 + Math.sin(T * .4 + k) * .03, len = h * 1.2 * (1 - depth * .6), g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len); g.addColorStop(0, `rgba(180,240,240,${.12 * (1 - depth)})`); g.addColorStop(1, "rgba(180,240,240,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - .04) * len, sy + Math.sin(a - .04) * len); ctx.lineTo(sx + Math.cos(a + .04) * len, sy + Math.sin(a + .04) * len); ctx.fill(); }
  glow(ctx, sx, sy, lightR * 2, "#b8f0f0", .5 * (1 - depth * .5)); glow(ctx, sx, sy, lightR, "#ffffff", .7 * (1 - depth * .4));
  ctx.globalCompositeOperation = "source-over";
  // Your breath escaping.
  for (const [x, y, s] of S.bubbles) { const py = ((y - T * .08 * s) % 1 + 1) % 1 * h, px = w / 2 + (x - .5) * u * .4 + Math.sin(T * 3 + y * 30) * u * .01; ctx.strokeStyle = `rgba(220,255,255,${.5 * (1 - depth * .7)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, s * u * .008, 0, TAU); ctx.stroke(); }
  // The hands: pale, long-fingered, rising from the dark below and from the sides, closing on you.
  for (const q of S.hands) {
    const k = smooth(q.at, q.at + .12, t); if (k <= 0) continue;
    const fromSide = q.x < .2 || q.x > .8, bx = q.x * w, by = h * 1.15, reach = k * u * .55 * q.s, a = q.a + (fromSide ? (q.x < .5 ? .7 : -.7) : 0);
    const tx = bx + Math.sin(a) * reach, ty = by - Math.cos(a) * reach, grip = smooth(q.at + .1, q.at + .16, t);
    const arm = ctx.createLinearGradient(bx, by, tx, ty); arm.addColorStop(0, "rgba(40,60,60,0)"); arm.addColorStop(1, `rgba(${lerp(150, 90, depth) | 0},${lerp(175, 110, depth) | 0},${lerp(170, 110, depth) | 0},.95)`);
    ctx.strokeStyle = arm; ctx.lineWidth = u * .035 * q.s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.sin(a + .5) * reach * .5, by - reach * .5, tx, ty); ctx.stroke();
    // The hand, palm toward you, long fingers closing as it grips (painted: glimpse-hand.ts).
    paintHand(ctx, { x: tx + Math.sin(a) * u * .02 * q.s, y: ty - Math.cos(a) * u * .02 * q.s, angle: a, s: u * .075 * q.s, curl: grip * .85, splay: .9 - grip * .3, palm: true, claw: true, hook: 1, long: 1.25, thin: .8, mirror: q.x < .5 ? -1 : 1, skin: { base: mix("#a8c4c0", "#5a706c", depth), shade: mix("#4a605c", "#1a2624", depth), light: mix("#e0f0ec", "#8aa09c", depth) }, light: -1.57, time: T + q.x * 9, seed: 200 + Math.round(q.x * 1000) });
  }
  ctx.fillStyle = `rgba(0,0,0,${smooth(.75, 1, t)})`; ctx.fillRect(0, 0, w, h);
  vignette(ctx, w, h, .9, "#000608");
}

// ------------------------------------------------------------------ The Wheat
// Dusk in tall wheat. You walk; to your left the wheat parts, keeping pace. You stop. It stops. You turn your head.
// Behind you something tall stands up out of the field. It is very fast.
function drawWheat(ctx, t, w, h, state) {
  const T = t * 13, u = Math.min(w, h);
  if (!state.wheat) { const r = seeded(1347); state.wheat = { stalks: Array.from({ length: 900 }, () => ({ x: (r() - .5) * 20, z: (r() - .5) * 20, ph: r() * TAU, h: .9 + r() * .5, tone: r() })) }; }
  const S = state.wheat, stopAt = .42, turnAt = .55, lunge = .86;
  const walked = Math.min(t, stopAt) * 13 * 1.1, walking = t < stopAt - .03 ? 1 : 0, bob = Math.sin(T * 5) * walking * u * .012;
  const yaw = smooth(turnAt, .72, t) * Math.PI * .92, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const horizon = h * .4 + bob, f = h * .85, eye = 1.6;
  // Dusk sky: the sun is ahead of you; when you turn, the sky behind is darker.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, "#120e24"); sky.addColorStop(.7, mix("#6a3a40", "#2a1a2a", smooth(turnAt, .72, t))); sky.addColorStop(1, mix("#d06a3a", "#4a2a2a", smooth(turnAt, .72, t)));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon + 2);
  ctx.globalCompositeOperation = "lighter"; glow(ctx, w * .5 - yaw / Math.PI * w * 2.2, horizon, u * .6, "#ff8a40", .4); ctx.globalCompositeOperation = "source-over";
  // The far field as one golden band, so the wheat has no end.
  const band = ctx.createLinearGradient(0, horizon - u * .03, 0, h); band.addColorStop(0, "#7a4a24"); band.addColorStop(.25, "#5a3418"); band.addColorStop(1, "#2a1a0c");
  ctx.fillStyle = band; ctx.fillRect(0, horizon - u * .025, w, h);
  // World: you walk toward +z. The thing keeps pace in the wheat to your left, then is behind you.
  const thing = { x: -2.3, z: walked + 3.5 }, beastZ = walked - lerp(5, .4, smooth(lunge, lunge + .06, t)), rise = smooth(.66, .8, t);
  const view = (x, z) => { const dx = x, dz = z - walked; return [dx * cs - dz * sn, dx * sn + dz * cs]; };
  const items = [];
  for (const s of S.stalks) {
    const wx = s.x, wz = ((s.z - walked) % 20 + 30) % 20 - 10 + walked, [vx, vz] = view(wx, wz);
    if (vz < .35) continue;
    items.push({ s, vx, vz, wx, wz });
  }
  items.sort((a, b) => b.vz - a.vz);
  const [bvx, bvz] = view(0, beastZ);
  let beastDrawn = false;
  const drawBeast = () => {
    if (rise <= 0 || bvz < .3) return;
    const sx = w / 2 + bvx * f / bvz, gy = horizon + eye * f / bvz, H = 3.2 * rise * f / bvz, W = H * .26;
    ctx.fillStyle = "#040203";
    ctx.beginPath(); ctx.moveTo(sx - W * .4, gy); ctx.bezierCurveTo(sx - W * .55, gy - H * .5, sx - W * .45, gy - H * .85, sx - W * .12, gy - H * .92); ctx.quadraticCurveTo(sx, gy - H * 1.02, sx + W * .14, gy - H * .9); ctx.bezierCurveTo(sx + W * .5, gy - H * .82, sx + W * .55, gy - H * .5, sx + W * .4, gy); ctx.fill(); // a gaunt, hunched trunk
    ctx.beginPath(); ctx.ellipse(sx + W * .05, gy - H * .98, W * .16, W * .22, .2, 0, TAU); ctx.fill(); // a small head
    ctx.strokeStyle = "#040203"; ctx.lineCap = "round";
    for (const e of [-1, 1]) { ctx.lineWidth = W * .1; ctx.beginPath(); ctx.moveTo(sx + e * W * .35, gy - H * .78); ctx.quadraticCurveTo(sx + e * W * 1.1, gy - H * .55, sx + e * W * .9, gy - H * .12); ctx.stroke(); ctx.lineWidth = W * .035; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(sx + e * W * .9, gy - H * .12); ctx.lineTo(sx + e * W * (.95 + k * .06), gy - H * .02); ctx.stroke(); } } // long arms, long fingers
    ctx.globalCompositeOperation = "lighter"; for (const e of [-1, 1]) glow(ctx, sx + W * .05 + e * W * .06, gy - H * .99, W * .07, "#ff2a10", .95); ctx.globalCompositeOperation = "source-over";
  };
  for (const it of items) {
    if (!beastDrawn && it.vz < bvz) { drawBeast(); beastDrawn = true; }
    const { s, vx, vz, wx, wz } = it, sx = w / 2 + vx * f / vz, sy = horizon + eye * f / vz, ht = s.h * f / vz;
    if (sx < -40 || sx > w + 40) continue;
    // Stalks near the thing in the wheat bend away from it; once you stop, it stops, and they settle.
    const d = Math.hypot(wx - thing.x, wz - thing.z), part = t < turnAt + .05 ? clamp(1 - d / 1.1) : 0, away = Math.sign(wx - thing.x) || 1;
    const sway = Math.sin(T * 1.4 + s.ph) * ht * .04 + part * ht * .45 * away * (vx < 0 ? 1 : -1) * .6;
    const fog = clamp((vz - 1) / 9), stalk = mix(mix("#d8a050", "#a07030", s.tone), "#4a2c16", fog), head = mix(mix("#f0c870", "#c89848", s.tone), "#5a3418", fog);
    ctx.strokeStyle = stalk; ctx.lineWidth = Math.max(.8, f / vz * .01); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sway * .3, sy - ht * .6, sx + sway, sy - ht); ctx.stroke();
    ctx.fillStyle = head; ctx.save(); ctx.translate(sx + sway, sy - ht); ctx.rotate(sway / ht * 1.5); ctx.beginPath(); ctx.ellipse(0, -ht * .05, Math.max(.8, ht * .018), ht * .07, 0, 0, TAU); ctx.fill(); ctx.restore(); // slender ear of grain
  }
  if (!beastDrawn) drawBeast();
  // The lunge: it fills your sight; red; black.
  if (t > lunge + .03 && t < lunge + .05) redVeil(ctx, w, h, 1);
  if (t > lunge + .05) { ctx.fillStyle = `rgba(0,0,0,${smooth(lunge + .05, lunge + .08, t)})`; ctx.fillRect(0, 0, w, h); }
  vignette(ctx, w, h, .8);
}

// ------------------------------------------------------------------ The Burning Plain
// You walk barefoot over embers under a red sky. Your hands are ash and come apart in the wind. Figures stand in the
// fire, calm, and do not look at you. Nobody screams.
function drawPlain(ctx, t, w, h, state) {
  const T = t * 15, u = Math.min(w, h);
  if (!state.plain) { const r = seeded(999); state.plain = { figures: Array.from({ length: 16 }, () => ({ x: (r() - .5) * 14, z: 2 + r() * 16, s: .8 + r() * .4, ph: r() * TAU })), embers: Array.from({ length: 140 }, () => [r(), r(), r()]), cracks: Array.from({ length: 70 }, () => [(r() - .5) * 10, r() * 20, r() * TAU]) }; }
  const S = state.plain, horizon = h * .4 + Math.sin(T * 2.4) * u * .006, z0 = T * .8, f = h * .7;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, "#1a0404"); sky.addColorStop(.6, "#5a0e06"); sky.addColorStop(1, "#c0400e");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon + 2);
  ctx.fillStyle = "rgba(20,4,2,.6)"; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(((k * .27 + T * .004) % 1.2) * w, horizon * (.2 + k * .12), w * .3, h * .03, 0, 0, TAU); ctx.fill(); } // smoke banks
  const ground = ctx.createLinearGradient(0, horizon, 0, h); ground.addColorStop(0, "#ff7020"); ground.addColorStop(.15, "#5a1606"); ground.addColorStop(1, "#1a0602");
  ctx.fillStyle = ground; ctx.fillRect(0, horizon, w, h);
  // Glowing cracks in the ground, pulsing.
  ctx.lineCap = "round";
  for (const [x, z, a] of S.cracks) { const zz = ((z - z0) % 20 + 20) % 20 + .6, sx = w / 2 + x * f / zz, sy = horizon + 1.4 * f / zz, len = f / zz * .5, pulse = .6 + .4 * Math.sin(T * 2 + a * 5); ctx.strokeStyle = `rgba(255,${140 + pulse * 80 | 0},40,${clamp(4 / zz) * pulse})`; ctx.lineWidth = Math.max(1, f / zz * .02); ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * len, sy - Math.sin(a) * len * .2); ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len * .2); ctx.stroke(); }
  // Figures standing in fire: still, wrapped in flame, faces turned away.
  const figs = S.figures.map((q) => ({ ...q, zz: ((q.z - z0) % 16 + 16) % 16 + 1.2 })).sort((a, b) => b.zz - a.zz);
  for (const q of figs) {
    const sx = w / 2 + q.x * f / q.zz, sy = horizon + 1.4 * f / q.zz, fh = 1.7 * q.s * f / q.zz, fw = fh * .22;
    ctx.globalCompositeOperation = "lighter"; glow(ctx, sx, sy - fh * .3, fh * .6, "#ff6010", .35); ctx.globalCompositeOperation = "source-over";
    // A person, standing: small head, neck, sloping shoulders, arms hanging a little apart, a waist, legs lost in the flame.
    ctx.fillStyle = "#0a0202"; const P = (x, y) => [sx + x * fw, sy - y * fh], body = new Path2D(), m = (x, y) => body.moveTo(...P(x, y)), b = (x1, y1, x2, y2, x, y) => body.bezierCurveTo(...P(x1, y1), ...P(x2, y2), ...P(x, y));
    m(-.34, 0); b(-.36, .25, -.3, .45, -.27, .55); b(-.36, .6, -.4, .7, -.38, .8); b(-.36, .84, -.24, .86, -.1, .865); b(-.06, .87, -.05, .88, -.05, .9);
    body.lineTo(...P(.05, .9)); b(.05, .88, .06, .87, .1, .865); b(.24, .86, .36, .84, .38, .8); b(.4, .7, .36, .6, .27, .55); b(.3, .45, .36, .25, .34, 0); body.closePath(); ctx.fill(body);
    for (const e of [-1, 1]) { ctx.strokeStyle = "#0a0202"; ctx.lineCap = "round"; ctx.lineWidth = fw * .16; ctx.beginPath(); ctx.moveTo(...P(e * .36, .79)); ctx.quadraticCurveTo(...P(e * .47, .62), ...P(e * .44, .44)); ctx.stroke(); } // arms at the sides
    ctx.beginPath(); ctx.ellipse(sx, sy - fh * .94, fw * .14, fw * .18, 0, 0, TAU); ctx.fill(); // head
    ctx.strokeStyle = "rgba(255,150,60,.45)"; ctx.lineWidth = Math.max(1, fw * .03); ctx.beginPath(); ctx.moveTo(...P(.05, .9)); ctx.bezierCurveTo(...P(.24, .86), ...P(.36, .84), ...P(.38, .8)); ctx.stroke(); // firelight on a shoulder
    for (let k = 0; k < 7; k++) { const fx = sx + (k / 6 - .5) * fw * 1.3, fl = fh * (.3 + .25 * Math.sin(T * 6 + k * 2 + q.ph)), g = ctx.createLinearGradient(fx, sy, fx, sy - fl); g.addColorStop(0, "rgba(255,220,120,.9)"); g.addColorStop(.5, "rgba(255,110,20,.6)"); g.addColorStop(1, "rgba(160,20,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - fw * .15, sy); ctx.quadraticCurveTo(fx + Math.sin(T * 5 + k) * fw * .2, sy - fl * .6, fx, sy - fl); ctx.quadraticCurveTo(fx + fw * .1, sy - fl * .5, fx + fw * .15, sy); ctx.fill(); }
  }
  // Your hands, held out: grey ash, flaking away from the fingertips on the wind (painted: glimpse-hand.ts), lit from
  // below and ahead by the fire, with embers glowing in the cracks.
  const flake = smooth(.3, .95, t);
  for (const e of [-1, 1]) {
    const hx = w / 2 + e * w * .2, hy = h * .9 + Math.sin(T * 2.4 + e) * u * .01, hs = u * .14;
    const lengths = [0, 1, 2, 3].map((k) => 1 - clamp(flake * 1.4 - (e > 0 ? k : 3 - k) * .15) * .75);
    paintHand(ctx, { x: hx, y: hy - hs * .3, angle: e * .18, s: hs, mirror: e, foreshorten: .7, curl: .15, splay: .35, lengths, skin: { base: "#4a4440", shade: "#141010", light: "#8a807a", warm: "#5a2010" }, rim: { color: "#ff7a30", a: .7, width: .035 }, light: -1.4, shadow: .75, lift: .2, arm: hs * 2, time: T, seed: e > 0 ? 61 : 62 });
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const r = seeded(e > 0 ? 63 : 64); // embers in the cracks
    for (let k = 0; k < 9; k++) { const cx = hx + (r() - .5) * hs * .7, cy = hy - hs * .2 + r() * hs * .7, a = r() * TAU, l = hs * (.05 + r() * .08); ctx.strokeStyle = `rgba(255,${110 + r() * 60 | 0},30,${(.25 + .35 * Math.sin(T * 3 + k)) * (.4 + flake * .6)})`; ctx.lineWidth = 1 + r(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); ctx.stroke(); }
    ctx.restore();
  }
  // Embers and ash rising and blowing past; flakes of your hands among them.
  for (const [x, y, k] of S.embers) { const px = ((x + T * .03 * (1 + k)) % 1) * w, py = ((y - T * .04 * (1 + k)) % 1 + 1) % 1 * h; if (k < .6) { ctx.fillStyle = `rgba(255,${120 + k * 120 | 0},40,${.5 + k * .4})`; ctx.fillRect(px, py, 2, 2); } else if (flake > 0) { ctx.fillStyle = `rgba(110,100,95,${.7 * flake})`; ctx.fillRect(px, py, 3, 2); } }
  ctx.fillStyle = "rgba(255,80,0,.06)"; ctx.fillRect(0, 0, w, h);
  vignette(ctx, w, h, .85, "#100000");
}

export const HORROR = { fourthFloor: drawFourthFloor, theHunt: drawHunt, theTrench: drawTrench, theDrowning: drawDrowning, theWheat: drawWheat, burningPlain: drawPlain };
