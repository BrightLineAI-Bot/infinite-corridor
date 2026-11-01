// More Glimpses (release 199 onward; docs/narrative-bible.md section 5). Each scene is a draw function
// (ctx, t, w, h, state) painting frame t ∈ [0, 1] of a first-person view; `state` holds what a scene builds once.
// Canvas 2D only, no assets. The catalogue entries are in glimpses.ts.
import { TAU, clamp, lerp, smooth, seeded, mix, rgba, makeCanvas, glow, vignette } from "./glimpse-paint.js?v=r672-2e666a91bc19";
import { paintHand } from "./glimpse-hand.js?v=r672-2e666a91bc19";

// Soft cloud built from many shaded puffs: lit from above, shadowed beneath.
function cloudSprite(seed, light, shade) {
  // Many faint, flattened puffs: a sunlit crown, a grey underside, and wisps trailing at the edges.
  const S = 300, H = S * .55, c = makeCanvas(S, H), g = c.getContext("2d"), r = seeded(seed);
  const crown = (x) => H * (.62 - .28 * Math.exp(-((x / S - .5) ** 2) / .05));
  for (let k = 0; k < 140; k++) {
    const x = S * (.08 + r() * .84), top = crown(x), y = top + r() * (H * .7 - top), rad = S * (.03 + r() * .07) * (1 - Math.abs(x / S - .5));
    const lit = 1 - (y - top) / (H * .7 - top + 1);
    const gr = g.createRadialGradient(x, y - rad * .3, 0, x, y, rad);
    gr.addColorStop(0, rgba(mix(shade, light, lit), .22)); gr.addColorStop(1, rgba(mix(shade, light, lit), 0));
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad * 1.5, rad, 0, 0, TAU); g.fill();
  }
  for (let k = 0; k < 30; k++) { const x = S * (r() < .5 ? .02 + r() * .2 : .78 + r() * .2), y = H * (.5 + r() * .2), rad = S * (.02 + r() * .04); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(light, .12)); gr.addColorStop(1, rgba(light, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad * 2.5, rad * .6, 0, 0, TAU); g.fill(); }
  return c;
}

// A rounded bar (a finger), drawn with arcs so it works where ctx.roundRect is missing (older Safari and Chrome).
function pill(ctx, x, y, w, h) { const r = Math.min(w, h) / 2; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0); ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); ctx.closePath(); }

// ------------------------------------------------------------------ The Sky
// You lie on your back in a field. An immense, slow sky; grass at the edges of sight. The clouds drift into the grid of
// the Atlas, a far cannon shakes the ground once, and your eyes close.
function drawSky(ctx, t, w, h, state) {
  const T = t * 15, u = Math.min(w, h);
  if (!state.sky) {
    const r = seeded(1805);
    state.sky = { clouds: Array.from({ length: 11 }, (_, i) => ({ sprite: cloudSprite(40 + i, "#ffffff", "#8a9cb8"), x: r() * 1.4 - .2, y: .08 + r() * .78, s: .45 + r() * .8, v: .004 + r() * .006 })),
      grass: Array.from({ length: 140 }, () => { const e = r() * 4 | 0; return { e, p: r(), len: .08 + r() * .22, bend: (r() - .5) * .5, ph: r() * TAU, tone: r() }; }), hawk: r() * TAU };
  }
  const S = state.sky, shake = smooth(.52, .53, t) * (1 - smooth(.53, .6, t)) * u * .006 * Math.sin(T * 60);
  ctx.save(); ctx.translate(shake, shake * .6);
  const sky = ctx.createRadialGradient(w * .5, h * .45, 0, w * .5, h * .5, Math.hypot(w, h) * .6);
  sky.addColorStop(0, "#5f8fd0"); sky.addColorStop(.6, "#8db3e2"); sky.addColorStop(1, "#d8e4f0");
  ctx.fillStyle = sky; ctx.fillRect(-10, -10, w + 20, h + 20);
  ctx.globalCompositeOperation = "lighter"; glow(ctx, w * .85, -h * .1, u * .8, "#fff2d0", .35); ctx.globalCompositeOperation = "source-over";
  // The Atlas grid surfacing in the sky, faint, then gone.
  const grid = smooth(.35, .5, t) * (1 - smooth(.62, .78, t));
  if (grid > 0) { ctx.strokeStyle = rgba("#ffe6a8", .35 * grid); ctx.lineWidth = Math.max(1, u * .002); const cell = u * .16, ox = (T * u * .01) % cell; for (let x = -cell + ox; x < w + cell; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = -cell + ox * .5; y < h + cell; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } }
  // Clouds: drifting, and while the grid shows, settling square to it.
  for (const c of S.clouds) {
    const cw = c.s * u * 1.4, ch = cw * .6; let x = ((c.x + T * c.v) % 1.6 - .3) * w, y = c.y * h;
    if (grid > 0) { const cell = u * .16; x = lerp(x, Math.round(x / cell) * cell, grid * .5); y = lerp(y, Math.round(y / cell) * cell, grid * .5); }
    ctx.drawImage(c.sprite, x - cw / 2, y - ch / 2, cw, ch);
  }
  // A hawk circling very high.
  const ha = S.hawk + T * .5, hx = w * .4 + Math.cos(ha) * u * .12, hy = h * .35 + Math.sin(ha) * u * .06, flap = Math.sin(T * 9) * .3;
  ctx.strokeStyle = "rgba(30,30,40,.7)"; ctx.lineWidth = Math.max(1, u * .003); ctx.beginPath(); ctx.moveTo(hx - u * .014, hy - u * .004 * flap); ctx.quadraticCurveTo(hx - u * .006, hy - u * .006, hx, hy); ctx.quadraticCurveTo(hx + u * .006, hy - u * .006, hx + u * .014, hy - u * .004 * flap); ctx.stroke();
  // Grass at the edges of sight, so close it is out of focus: tapered blades, a soft dark mass at their roots.
  for (const [ex, ey, rx, ry] of [[w / 2, h * 1.1, w * .75, h * .12]]) {
    const m = ctx.createRadialGradient(ex, ey, 0, ex, ey, Math.max(rx, ry)); m.addColorStop(0, "rgba(22,32,12,.9)"); m.addColorStop(1, "rgba(22,32,12,0)");
    ctx.fillStyle = m; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU); ctx.fill();
  }
  for (const b of S.grass) {
    if (b.e === 1) continue; // nothing above your head
    const sway = Math.sin(T * 1.3 + b.ph) * .06, len = b.len * u * 1.3, base = b.e === 0 ? [b.p * w, h + 6] : b.e === 2 ? [-6, h * (.2 + b.p * .9)] : [w + 6, h * (.2 + b.p * .9)];
    const dir = b.e === 0 ? [b.bend * .4 + sway, -1] : b.e === 2 ? [1, -.4 + b.bend * .3 + sway] : [-1, -.4 + b.bend * .3 + sway];
    const tip = [base[0] + dir[0] * len, base[1] + dir[1] * len], ctrl = [base[0] + dir[0] * len * .5 + b.bend * len * .25, base[1] + dir[1] * len * .55], wd = u * (.006 + b.tone * .012), nx = -dir[1], ny = dir[0];
    ctx.fillStyle = rgba(mix("#1e2a10", "#5a6a2c", b.tone * .8), .55 + b.tone * .35);
    ctx.beginPath(); ctx.moveTo(base[0] - nx * wd, base[1] - ny * wd); ctx.quadraticCurveTo(ctrl[0], ctrl[1], tip[0], tip[1]); ctx.quadraticCurveTo(ctrl[0] + nx * wd * .6, ctrl[1] + ny * wd * .6, base[0] + nx * wd, base[1] + ny * wd); ctx.fill();
  }
  ctx.restore();
  vignette(ctx, w, h, .45, "#1a2030");
  // The eyes close: lids from above and below.
  const lid = smooth(.86, .98, t);
  if (lid > 0) { ctx.fillStyle = "#0a0606"; ctx.beginPath(); ctx.ellipse(w / 2, -h * .5 + lid * h * .5, w * .9, h * .55, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(w / 2, h * 1.5 - lid * h * .5, w * .9, h * .55, 0, 0, TAU); ctx.fill(); }
}

// ------------------------------------------------------------------ Rain at the Window
// Night, a dark room. Rain runs down the glass; the lights outside swim. Someone's head rests on your shoulder. You never
// turn to see their face. Once, lightning.
function drawRain(ctx, t, w, h, state) {
  const T = t * 14, u = Math.min(w, h);
  if (!state.rain) {
    const r = seeded(77);
    state.rain = { lights: Array.from({ length: 40 }, () => [r(), .35 + r() * .5, .5 + r() * 1.5, r()]), drops: Array.from({ length: 160 }, () => [r(), r(), .3 + r() * .9]), runs: Array.from({ length: 22 }, () => ({ x: r(), y0: r(), v: .04 + r() * .09, s: .6 + r() * .8, wob: r() * TAU })) };
  }
  const S = state.rain, flash = Math.max(0, 1 - Math.abs(t - .58) * 40) + Math.max(0, 1 - Math.abs(t - .6) * 60) * .6;
  // Beyond the glass: out-of-focus lights, warm and cold.
  const out = ctx.createLinearGradient(0, 0, 0, h); out.addColorStop(0, mix("#0a0e1c", "#9aa6c8", flash)); out.addColorStop(1, mix("#151824", "#7a7f98", flash));
  ctx.fillStyle = out; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  for (const [x, y, s, k] of S.lights) glow(ctx, x * w + Math.sin(T * .2 + k * 9) * u * .004, y * h, u * .05 * s, k < .6 ? "#ffb060" : "#7ab0ff", .25 + .1 * Math.sin(T * .7 + k * 20));
  ctx.globalCompositeOperation = "source-over";
  // Water on the glass: still beads with a bright edge and a dark core, and drops running down in wandering paths.
  for (const [x, y, s] of S.drops) { const px = x * w, py = y * h, r = s * u * .006; ctx.fillStyle = "rgba(10,12,20,.35)"; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(220,230,255,.5)"; ctx.beginPath(); ctx.arc(px - r * .3, py - r * .3, r * .35, 0, TAU); ctx.fill(); }
  for (const d of S.runs) {
    const y = ((d.y0 + T * d.v) % 1.2 - .1) * h, x = d.x * w + Math.sin(y / h * 9 + d.wob) * u * .006, r = d.s * u * .008;
    const trail = ctx.createLinearGradient(0, y - u * .25, 0, y); trail.addColorStop(0, "rgba(180,200,255,0)"); trail.addColorStop(1, "rgba(180,200,255,.18)");
    ctx.strokeStyle = trail; ctx.lineWidth = r * .8; ctx.beginPath(); ctx.moveTo(x, y - u * .25); ctx.quadraticCurveTo(x - u * .005, y - u * .12, x, y); ctx.stroke();
    ctx.fillStyle = "rgba(15,18,30,.5)"; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.25, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,220,180,.55)"; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .4, r * .35, 0, TAU); ctx.fill();
  }
  // The window frame: dark wood mullions, lit at the edge by the room's one lamp.
  ctx.fillStyle = "#0b0807"; ctx.fillRect(0, 0, w, h * .06); ctx.fillRect(0, h * .9, w, h * .1); ctx.fillRect(0, 0, w * .05, h); ctx.fillRect(w * .95, 0, w * .05, h); ctx.fillRect(w * .485, 0, w * .03, h); ctx.fillRect(0, h * .47, w, h * .025);
  ctx.strokeStyle = rgba("#ffb070", .25); ctx.lineWidth = Math.max(1, u * .002); ctx.strokeRect(w * .05, h * .06, w * .435, h * .41); ctx.strokeRect(w * .515, h * .06, w * .435, h * .41); ctx.strokeRect(w * .05, h * .495, w * .435, h * .405); ctx.strokeRect(w * .515, h * .495, w * .435, h * .405);
  // Their head on your shoulder: hair close against the lower right, soft at its edge, strands catching the window's
  // light; it rises and falls with their breathing.
  const breath = Math.sin(T * .8) * u * .006, hx = w * .9, hy = h * 1.05 + breath, hr = u * .5;
  const hair = ctx.createRadialGradient(hx, hy, hr * .3, hx, hy, hr);
  hair.addColorStop(0, "rgba(14,10,9,1)"); hair.addColorStop(.82, "rgba(14,10,9,.97)"); hair.addColorStop(1, "rgba(14,10,9,0)");
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
  if (!S.strands) { const r = seeded(91); S.strands = Array.from({ length: 70 }, () => [r(), r(), r()]); }
  ctx.lineCap = "round";
  for (const [a0, l, k] of S.strands) {
    const a = Math.PI * (1.02 + a0 * .52), r0 = hr * (.8 + k * .14), x0 = hx + Math.cos(a) * r0, y0 = hy + Math.sin(a) * r0, lift = Math.sin(T * .9 + a0 * 20) * u * .004;
    ctx.strokeStyle = k > .7 ? rgba(mix("#8aa0d0", "#ffffff", flash), .35) : "rgba(40,30,28,.6)"; ctx.lineWidth = Math.max(.6, u * .0015);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(a + 1.4) * u * .03 * l, y0 + Math.sin(a + 1.4) * u * .03 * l + lift, x0 + Math.cos(a + 1.2) * u * .07 * l + lift, y0 + Math.sin(a + 1.2) * u * .07 * l); ctx.stroke();
  }
  if (flash > 0) { ctx.fillStyle = `rgba(220,230,255,${flash * .25})`; ctx.fillRect(0, 0, w, h); }
  vignette(ctx, w, h, .8);
}

// ------------------------------------------------------------------ Under the Ice
// You are a fish, looking up through ice. Light moves in the cracks. Shapes walk above; one kneels and lays a hand flat
// on the ice, over you.
function drawIce(ctx, t, w, h, state) {
  const T = t * 13, u = Math.min(w, h);
  if (!state.ice) {
    const r = seeded(303), cracks = [];
    for (let k = 0; k < 9; k++) { let x = r() * w, y = r() * h, a = r() * TAU; const pts = [[x, y]]; for (let s = 0; s < 14; s++) { a += (r() - .5) * .9; x += Math.cos(a) * u * .05; y += Math.sin(a) * u * .05; pts.push([x, y]); } cracks.push(pts); }
    state.ice = { cracks, bubbles: Array.from({ length: 60 }, () => [r(), r(), .3 + r()]), rising: Array.from({ length: 24 }, () => [r(), r(), .5 + r()]) };
  }
  const S = state.ice;
  const water = ctx.createRadialGradient(w / 2, h * .4, u * .05, w / 2, h * .5, Math.hypot(w, h) * .6);
  water.addColorStop(0, "#cfeaf2"); water.addColorStop(.45, "#6fa6b8"); water.addColorStop(1, "#0e2a34");
  ctx.fillStyle = water; ctx.fillRect(0, 0, w, h);
  // Caustics: bright wandering lines of focused light.
  ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(220,250,255,.08)"; ctx.lineWidth = u * .01;
  // A net of focused light: two families of wavering curves crossing.
  ctx.lineWidth = u * .006;
  for (const [ang, n] of [[.4, 16], [-.9, 16]]) { const ca = Math.cos(ang), sa = Math.sin(ang), span = Math.hypot(w, h);
    for (let k = 0; k < n; k++) { ctx.beginPath(); for (let s = -span / 2; s <= span / 2; s += span / 30) { const o = (k / n - .5) * span + Math.sin(s / u * 6 + T * .9 + k * 1.7) * u * .04 + Math.sin(s / u * 11 - T * 1.3 + k) * u * .02; const x = w / 2 + ca * s - sa * o, y = h / 2 + sa * s + ca * o; s === -span / 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); } }
  ctx.globalCompositeOperation = "source-over";
  // Cracks and trapped bubbles in the ice.
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(1, u * .0025);
  for (const pts of S.cracks) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  for (const [x, y, s] of S.bubbles) { ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x * w, y * h, s * u * .008, 0, TAU); ctx.stroke(); }
  // Figures walking above, seen from beneath: the dark soles of their boots stepping, and their blurred shadows.
  for (let k = 0; k < 3; k++) {
    const x = ((k * .37 + T * .025) % 1.3 - .15) * w, y = h * (.28 + k * .2), sz = u * (.16 - k * .025), ph = T * 2.4 + k * 2;
    const sh = ctx.createRadialGradient(x, y, 0, x, y, sz * 1.2); sh.addColorStop(0, "rgba(8,20,28,.35)"); sh.addColorStop(1, "rgba(8,20,28,0)");
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x, y, sz * .7, sz * 1.1, 0, 0, TAU); ctx.fill();
    for (const e of [-1, 1]) {
      const down = Math.sin(ph + (e > 0 ? Math.PI : 0)), press = clamp(down), fx = x + e * sz * .16, fy = y + (e > 0 ? 1 : -1) * Math.cos(ph) * sz * .3;
      ctx.fillStyle = `rgba(4,12,16,${.15 + press * .6})`;
      ctx.save(); ctx.translate(fx, fy); ctx.beginPath(); ctx.ellipse(0, -sz * .12, sz * .085, sz * .17, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, sz * .14, sz * .07, sz * .09, 0, 0, TAU); ctx.fill(); ctx.restore(); // sole and heel
    }
  }
  // One kneels; a hand comes down flat on the ice above you, darkening and sharpening as it presses.
  const press = smooth(.45, .7, t), hx = w * .52, hy = h * .45, hs = u * .2 * (1 + press * .4);
  if (press > 0) {
    // A right hand, palm down on the ice above you, fingers spread (painted: glimpse-hand.ts); dark through the ice,
    // sharpening as it presses.
    paintHand(ctx, { x: hx, y: hy - hs * .32, angle: -.12, s: hs * .72, palm: true, splay: .65, curl: .05, skin: { base: "#0c2028", shade: "#03090c", light: "#2a4a54" }, light: -1.8, shadow: .6, lift: .25, arm: hs * .5, alpha: .2 + press * .6, time: T, seed: 81 });
    ctx.globalCompositeOperation = "lighter"; glow(ctx, hx, hy, hs * .9, "#ffffff", .06 * press); ctx.globalCompositeOperation = "source-over";
  }
  // Bubbles rising from you; your fins fanning at the edges of sight.
  for (const [x, y, s] of S.rising) { const py = ((y - T * .05 * s) % 1 + 1) % 1 * h, px = x * w + Math.sin(T * 2 + y * 20) * u * .01; ctx.strokeStyle = "rgba(240,255,255,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, s * u * .006, 0, TAU); ctx.stroke(); }
  for (const e of [-1, 1]) {
    const fan = Math.sin(T * 2.6 + (e > 0 ? 1 : 0)) * .25;
    ctx.save(); ctx.translate(e < 0 ? -u * .02 : w + u * .02, h * .78); ctx.rotate(e * (.5 + fan));
    const fg = ctx.createLinearGradient(0, 0, -e * u * .3, 0); fg.addColorStop(0, "rgba(200,140,90,.6)"); fg.addColorStop(1, "rgba(200,140,90,.05)");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-e * u * .2, -u * .16, -e * u * .32, -u * .05); ctx.quadraticCurveTo(-e * u * .22, u * .08, 0, u * .04); ctx.fill();
    ctx.strokeStyle = "rgba(120,70,40,.35)"; ctx.lineWidth = 1; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-e * u * (.18 + k * .02), -u * (.12 - k * .025)); ctx.stroke(); }
    ctx.restore();
  }
  vignette(ctx, w, h, .7, "#02121a");
}

// ------------------------------------------------------------------ The Spheres
// An amber void. You are one of many spheres. They drift, touch and chime: a ring of light when two meet. You cannot
// tell which of them is you.
function drawSpheres(ctx, t, w, h, state) {
  const T = t * 14, u = Math.min(w, h);
  if (!state.spheres) { const r = seeded(9001); state.spheres = { balls: Array.from({ length: 34 }, () => ({ x: (r() - .5) * 8, y: (r() - .5) * 5, z: 2 + r() * 14, r: .25 + r() * .55, ph: r() * TAU, sp: .1 + r() * .3, hue: 28 + r() * 22 })), rings: [] }; }
  const S = state.spheres;
  const bg = ctx.createRadialGradient(w * .5, h * .55, 0, w * .5, h * .5, Math.hypot(w, h) * .65);
  bg.addColorStop(0, "#5a3410"); bg.addColorStop(.5, "#2a1606"); bg.addColorStop(1, "#0a0502");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const f = u * 1.1, camZ = T * .35, camX = Math.sin(T * .23) * .6, camY = Math.cos(T * .19) * .3;
  const view = S.balls.map((b) => { const z = ((b.z - camZ) % 16 + 16) % 16 + .8, x = b.x + Math.sin(T * b.sp + b.ph) * .5 - camX, y = b.y + Math.cos(T * b.sp * .8 + b.ph) * .4 - camY; return { b, z, sx: w / 2 + x * f / z, sy: h / 2 + y * f / z, sr: b.r * f / z }; }).sort((a, b) => b.z - a.z);
  // Chimes: when two near spheres overlap on screen, a ring of light spreads from where they touch.
  if (!state.lastChime || T - state.lastChime > .9) for (let i = 0; i < view.length; i++) for (let j = i + 1; j < view.length; j++) { const a = view[i], b = view[j]; if (Math.abs(a.z - b.z) < 1.2 && Math.hypot(a.sx - b.sx, a.sy - b.sy) < (a.sr + b.sr) * .95) { S.rings.push({ x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2, at: T, r: (a.sr + b.sr) / 2 }); state.lastChime = T; i = view.length; break; } }
  for (const v of view) {
    const fog = clamp((v.z - 2) / 14), { sx, sy, sr } = v;
    if (sx < -sr * 2 || sx > w + sr * 2 || sy < -sr * 2 || sy > h + sr * 2) continue;
    ctx.globalCompositeOperation = "lighter"; glow(ctx, sx, sy, sr * 2.4, "#ff9a3a", .12 * (1 - fog)); ctx.globalCompositeOperation = "source-over";
    const g = ctx.createRadialGradient(sx - sr * .35, sy - sr * .4, sr * .05, sx, sy, sr);
    g.addColorStop(0, `hsla(${v.b.hue},90%,${lerp(88, 50, fog)}%,${1 - fog * .6})`); g.addColorStop(.55, `hsla(${v.b.hue},80%,${lerp(45, 25, fog)}%,${1 - fog * .6})`); g.addColorStop(1, `hsla(${v.b.hue - 10},70%,${lerp(14, 10, fog)}%,${1 - fog * .6})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,200,140,${.35 * (1 - fog)})`; ctx.lineWidth = Math.max(1, sr * .04); ctx.beginPath(); ctx.arc(sx, sy, sr * .97, Math.PI * .1, Math.PI * .7); ctx.stroke(); // rim from the light below
    ctx.fillStyle = `rgba(255,250,235,${.7 * (1 - fog)})`; ctx.beginPath(); ctx.ellipse(sx - sr * .38, sy - sr * .42, sr * .14, sr * .09, -.6, 0, TAU); ctx.fill(); // specular
  }
  S.rings = S.rings.filter((q) => T - q.at < 2.2);
  for (const q of S.rings) { const k = (T - q.at) / 2.2; ctx.strokeStyle = `rgba(255,230,180,${(1 - k) * .6})`; ctx.lineWidth = Math.max(1, u * .004 * (1 - k)); ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (.5 + k * 4), 0, TAU); ctx.stroke(); }
  // At the end one sphere comes close enough to fill the view: in it, the whole field, and no one.
  const near = smooth(.8, .97, t);
  if (near > 0) { const r = u * lerp(.1, 1.2, near); const g = ctx.createRadialGradient(w / 2 - r * .3, h / 2 - r * .35, r * .05, w / 2, h / 2, r); g.addColorStop(0, "rgba(255,230,190,.95)"); g.addColorStop(.6, "rgba(200,120,40,.9)"); g.addColorStop(1, "rgba(40,20,6,.95)"); ctx.globalAlpha = near; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  vignette(ctx, w, h, .75);
}

// ------------------------------------------------------------------ Edge-Light
// Almost total darkness. A hairline of light lies along the edge of something vast that turns very slowly. Breathing
// that is not yours. The line closes to a point.
function drawEdge(ctx, t, w, h, state) {
  const T = t * 13, u = Math.min(w, h);
  if (!state.edge) { const r = seeded(13); state.edge = { motes: Array.from({ length: 70 }, () => [r(), r(), r()]), ridges: Array.from({ length: 30 }, () => [r() * TAU, .3 + r() * .7]) }; }
  const S = state.edge, breath = .75 + .25 * Math.sin(T * TAU / 4.2);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  // The shape: a circle many times the screen, its rim crossing the view; it turns, and the rim's light narrows.
  const R = u * 3.2, cx = w * .5 + Math.cos(T * .05) * u * .2, cy = h * .5 + R * .92 - t * u * .2, arcSpan = lerp(.55, .02, smooth(.7, .98, t)), mid = -Math.PI / 2 + Math.sin(T * .06) * .05;
  // Its near surface, barely there: a deep blue sheen just inside the rim, fading into the dark.
  const surf = ctx.createRadialGradient(cx, cy, R * .9, cx, cy, R); surf.addColorStop(0, "rgba(10,14,30,0)"); surf.addColorStop(.8, `rgba(24,32,64,${.25 * breath})`); surf.addColorStop(1, `rgba(60,70,120,${.35 * breath})`);
  ctx.fillStyle = surf; ctx.beginPath(); ctx.arc(cx, cy, R, mid - arcSpan * 1.4, mid + arcSpan * 1.4); ctx.arc(cx, cy, R * .9, mid + arcSpan * 1.4, mid - arcSpan * 1.4, true); ctx.fill();
  // Scattered light above the rim, then the rim itself: brightest at its middle, tapering to nothing at its ends.
  // A conic gradient carries the taper along the arc (a plain stroke where conic gradients are missing).
  const taper = (col, alpha) => {
    if (!ctx.createConicGradient) return rgba(col, alpha * breath);
    const g = ctx.createConicGradient(mid - Math.PI, cx, cy), at = (a) => ((a - (mid - Math.PI)) % TAU + TAU) % TAU / TAU;
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(at(mid - arcSpan), rgba(col, 0)); g.addColorStop(at(mid - arcSpan * .5), rgba(col, alpha * .35 * breath)); g.addColorStop(.5, rgba(col, alpha * breath)); g.addColorStop(at(mid + arcSpan * .5), rgba(col, alpha * .35 * breath)); g.addColorStop(at(mid + arcSpan), rgba(col, 0)); g.addColorStop(1, rgba(col, 0));
    return g;
  };
  for (const [dw, alpha, col] of [[u * .09, .07, "#5a70ff"], [u * .035, .16, "#90a8ff"], [u * .012, .4, "#dfe6ff"], [Math.max(1.2, u * .003), 1, "#fffaf0"]]) {
    ctx.strokeStyle = taper(col, alpha); ctx.lineWidth = dw; ctx.beginPath(); ctx.arc(cx, cy, R + (dw > u * .01 ? dw * .3 : 0), mid - arcSpan, mid + arcSpan); ctx.stroke();
  }
  // Far off, the edge of a second shape, smaller, its light a breath behind the first.
  const R2 = u * .9, c2x = w * .12, c2y = h * .2 - R2 * .95, k2 = .5 + .5 * Math.sin(T * TAU / 4.2 - 1.2);
  ctx.strokeStyle = `rgba(255,230,210,${.35 * k2 * (1 - smooth(.8, .95, t))})`; ctx.lineWidth = Math.max(1, u * .0015); ctx.beginPath(); ctx.arc(c2x, c2y, R2, Math.PI * .3, Math.PI * .55); ctx.stroke();
  // Faint ridges on the near side of the rim, catching a little of the light.
  ctx.strokeStyle = `rgba(150,160,190,${.07 * breath})`; ctx.lineWidth = 1;
  for (const [a, l] of S.ridges) { const ang = mid + Math.sin(a + T * .02) * arcSpan * .9, x0 = cx + Math.cos(ang) * R, y0 = cy + Math.sin(ang) * R; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(ang) * -u * .06 * l, y0 + Math.sin(ang) * -u * .06 * l); ctx.stroke(); }
  // Dust in the dark, lit only near the rim.
  for (const [x, y, s] of S.motes) { const px = ((x + T * .004) % 1) * w, py = ((y + T * .002 * s) % 1) * h, d = Math.abs(Math.hypot(px - cx, py - cy) - R); const a = clamp(1 - d / (u * .12)) * .6 * breath; if (a > .02) { ctx.fillStyle = `rgba(230,235,255,${a})`; ctx.fillRect(px, py, 1.5, 1.5); } }
  const end = smooth(.9, 1, t); if (end > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, cx + Math.cos(mid) * R, cy + Math.sin(mid) * R, u * .05 * (1 - end), "#ffffff", .8 * (1 - end)); ctx.globalCompositeOperation = "source-over"; }
}

// ------------------------------------------------------------------ Glyph Rain
// Columns of characters fall: ones and zeros, then wedges of cuneiform and alphabets that never existed. For a moment
// they resolve into a face, and it falls apart.
// Glyphs drawn by hand (no fonts needed): ones and zeros, then wedge-marks like cuneiform and stroke-letters of
// alphabets that never existed.
function glyphAtlas() {
  const N = 42, S = 40, c = makeCanvas(S * N, S), g = c.getContext("2d"), r = seeded(2600);
  g.fillStyle = g.strokeStyle = "#d8ffe4"; g.lineCap = "round"; g.lineWidth = S * .13;
  g.font = `bold ${S * .7}px monospace`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("0", S / 2, S / 2); g.fillText("1", S * 1.5, S / 2);
  for (let i = 2; i < N; i++) {
    const ox = i * S;
    if (i < 22) for (let k = 0; k < 2 + (r() * 3 | 0); k++) { // wedges: a triangular head and a tail
      const x = ox + S * (.25 + r() * .5), y = S * (.25 + r() * .5), a = [0, Math.PI / 2, Math.PI / 4][r() * 3 | 0], L = S * (.18 + r() * .2);
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-L * .5, -S * .08); g.lineTo(-L * .5, S * .08); g.lineTo(-L * .2, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-L * .3, 0); g.lineTo(L * .5, 0); g.stroke(); g.restore();
    }
    else { // stroke letters: a stem with branches, hooks or a ring
      g.beginPath(); const sx = ox + S * (.35 + r() * .3); g.moveTo(sx, S * .18); g.lineTo(sx, S * .82);
      for (let k = 0; k < 1 + (r() * 3 | 0); k++) { const y = S * (.25 + r() * .5), d = (r() < .5 ? -1 : 1) * S * (.15 + r() * .15); g.moveTo(sx, y); g.lineTo(sx + d, y + (r() - .5) * S * .3); }
      g.stroke(); if (r() < .35) { g.beginPath(); g.arc(sx + (r() - .5) * S * .3, S * (.3 + r() * .4), S * .1, 0, TAU); g.stroke(); }
    }
  }
  return { c, N, S, binary: 2 };
}
function faceAt(x, y) { // a soft procedural face in [0,1]² for brightness: lit from the left, deep eyes, nose, mouth
  const dx = (x - .5) / .25, dy = (y - .5) / .36, oval = clamp((1.15 - Math.hypot(dx, dy)) * 2.5);
  const spot = (cx, cy, rx, ry) => clamp(1 - Math.hypot((x - cx) / rx, (y - cy) / ry));
  const light = .55 + .45 * clamp(.5 - (x - .5) * 2.2);
  const eyes = spot(.41, .43, .065, .035) + spot(.59, .43, .065, .035), brows = spot(.41, .37, .08, .015) + spot(.59, .37, .08, .015);
  const nose = clamp(1 - Math.abs(x - .52) / .02) * clamp(1 - Math.abs(y - .54) / .07), mouth = spot(.5, .68, .1, .02), cheeks = spot(.36, .56, .07, .08) + spot(.64, .56, .07, .08);
  return clamp(oval * (light + cheeks * .2) - eyes * 1.3 - brows * .4 - nose * .5 - mouth * 1.1);
}
function drawGlyphs(ctx, t, w, h, state) {
  const T = t * 13, u = Math.min(w, h);
  if (!state.glyphs) { const r = seeded(4004); state.glyphs = { atlas: glyphAtlas(), cols: Array.from({ length: 64 }, () => ({ v: .25 + r() * .6, off: r(), seed: Math.floor(r() * 1e6) })) }; }
  const G = state.glyphs, A = G.atlas, cell = Math.max(9, w / 64), cols = Math.ceil(w / cell), rows = Math.ceil(h / cell) + 1;
  ctx.fillStyle = "#010603"; ctx.fillRect(0, 0, w, h);
  const face = smooth(.35, .55, t) * (1 - smooth(.7, .85, t)), alien = smooth(.15, .45, t);
  // Beneath the glyphs, the face as a soft glow (one pixel per cell, scaled up smooth), so its shadows read.
  if (face > .02) {
    const map = state.faceMap ||= makeCanvas(cols, rows), mg = map.getContext("2d"), img = mg.createImageData(cols, rows);
    for (let k = 0; k < rows; k++) for (let c = 0; c < cols; c++) { const v = faceAt((c + .5) * cell / w * (w / h) - (w / h - 1) / 2, (k + .5) * cell / h), i = (k * cols + c) * 4; img.data[i] = 40 * v; img.data[i + 1] = 255 * v; img.data[i + 2] = 130 * v; img.data[i + 3] = 255; }
    mg.putImageData(img, 0, 0); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .38 * face; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(map, 0, 0, cols * cell, rows * cell); ctx.restore();
  }
  for (let c = 0; c < cols; c++) {
    const col = G.cols[c % G.cols.length], head = ((T * col.v + col.off) % 1.4) * rows;
    for (let k = 0; k < rows; k++) {
      const trail = head - k, inTrail = trail >= 0 && trail <= rows * .7;
      if (!inTrail && face < .05) continue;
      const fade = inTrail ? 1 - trail / (rows * .7) : 0, x = c * cell, y = k * cell;
      const fb = faceAt(x / w * (w / h) - (w / h - 1) / 2, y / h), lit = lerp(fade, clamp(fb * 1.15 + fade * .12), face);
      if (lit < .04) continue;
      const salt = (col.seed + k * 31 + Math.floor(T * (2 + col.v * 4)) * (trail < 1 ? 7 : 0)) >>> 0;
      const idx = alien < .5 && (salt % 10) / 10 > alien * 2 ? salt % A.binary : A.binary + salt % (A.N - A.binary);
      ctx.globalAlpha = clamp(lit * lit * 1.35); // squared: the face's shadows read as shadows
      ctx.drawImage(A.c, idx * A.S, 0, A.S, A.S, x, y, cell, cell);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "lighter"; glow(ctx, w / 2, h / 2, u * .6, "#40ff90", .06 + face * .06); ctx.globalCompositeOperation = "source-over";
  vignette(ctx, w, h, .8);
}

export const SCENES = { theSky: drawSky, rainAtWindow: drawRain, underTheIce: drawIce, theSpheres: drawSpheres, edgeLight: drawEdge, glyphRain: drawGlyphs };
