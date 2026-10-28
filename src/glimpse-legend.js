// Glimpses from the legends (release 219). Same contract as glimpse-scenes.ts: draw(ctx, t, w, h, state) paints frame
// t ∈ [0, 1] in first person. Tim, 2026-10-19: figures and places should be painterly (impressionist, pointillist,
// hatched) rather than hard-edged, so these scenes are laid down as brushstrokes: each backdrop is painted once from
// thousands of short tilted dabs, and the moving things are drawn as clusters of dabs over it. Canvas 2D only.
import { TAU, clamp, lerp, smooth, seeded, mix, hex, rgba, glow, vignette, makeCanvas } from "./glimpse-paint.js?v=r525-5ba50cb08225";
import { paintHand } from "./glimpse-hand.js?v=r525-5ba50cb08225";

// A canvas covered in brushwork: `color(x, y, r)` gives the [r, g, b] under a dab (x, y in [0, 1]), `angle(x, y)` its
// tilt. A flat wash under the strokes keeps the gaps from showing black. Painted once per size and cached by the caller.
function brushwork(w, h, size, color, seed, angle = () => 0, cover = 2.2) {
  const c = makeCanvas(w, h), g = c.getContext("2d"), r = seeded(seed);
  for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) { const [cr, cg, cb] = color(x / w, y / h, r); g.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`; g.fillRect(x, y, size + 1, size + 1); }
  g.lineCap = "round";
  const n = Math.ceil(w * h / (size * size * .35) * cover);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, [cr, cg, cb] = color(x / w, y / h, r), j = (r() - .5) * 30, a = angle(x / w, y / h) + (r() - .5) * .55, l = size * (.7 + r());
    g.strokeStyle = `rgb(${clamp(cr + j, 0, 255) | 0},${clamp(cg + j, 0, 255) | 0},${clamp(cb + j * 1.2, 0, 255) | 0})`;
    g.lineWidth = size * (.25 + r() * .3); g.beginPath(); g.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); g.lineTo(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); g.stroke();
  }
  return c;
}
const ramp = (stops, k) => { // colour along [[at, "#hex"], …]
  k = clamp(k); let i = 0; while (i < stops.length - 2 && k > stops[i + 1][0]) i++;
  const [a, ca] = stops[i], [b, cb] = stops[i + 1], x = hex(ca), y = hex(cb), m = clamp((k - a) / (b - a || 1));
  return [lerp(x[0], y[0], m), lerp(x[1], y[1], m), lerp(x[2], y[2], m)];
};
// A cluster of dabs: a patch of paint for something moving, so it sits in the same hand as the backdrop.
function dabs(ctx, x, y, rx, ry, n, colors, size, seed, angle = 0, alpha = 1) {
  const r = seeded(seed); ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()), px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d, t = angle + (r() - .5) * .8, l = size * (.6 + r() * .8);
    ctx.strokeStyle = rgba(colors[(r() * colors.length) | 0], alpha * (.6 + r() * .4)); ctx.lineWidth = size * (.3 + r() * .3);
    ctx.beginPath(); ctx.moveTo(px - Math.cos(t) * l / 2, py - Math.sin(t) * l / 2); ctx.lineTo(px + Math.cos(t) * l / 2, py + Math.sin(t) * l / 2); ctx.stroke();
  }
}

// ------------------------------------------------------------------ The Plant at the Bottom (Gilgamesh)
// Night on a rock over the sea; stones are tied to your feet. You drop. Down through the dark to a thorny plant that
// glows on the sea floor; your hand closes on it and the thorns open the palm. Dawn: you lay the plant on a stone by a
// freshwater pool and bathe. A snake comes out of the reeds, takes it, and is gone. Where it went, a pale skin is left.
// You look at the skin a long time. Everything goes soft.
const PLANT = "#ffe6a0";
function backdrops(w, h, u) {
  const size = Math.max(5, Math.round(u * .016));
  // Night: stars, a low moon, and its road of light on the sea, all in the same cool hand.
  const moonX = .62, moonY = .2;
  const night = brushwork(w, h, size, (x, y, r) => {
    if (y < .38) { const halo = Math.exp(-(((x - moonX) * w / h) ** 2 + (y - moonY) ** 2) / .012); if (r() < .003) return [230, 230, 255]; const b = ramp([[0, "#070816"], [.7, "#141a3a"], [1, "#2a3460"]], y / .38); return [b[0] + halo * 120, b[1] + halo * 120, b[2] + halo * 110]; }
    const road = Math.exp(-((x - moonX) ** 2) / (.0012 + (y - .38) * .01)) * (r() < .55 ? 1 : .25), b = ramp([[0, "#22325a"], [.4, "#0e1a30"], [1, "#04080e"]], (y - .38) / .62);
    return [b[0] + road * 215, b[1] + road * 200, b[2] + road * 150];
  }, 11, (x, y) => (y < .38 ? -.1 : 0));
  { const g = night.getContext("2d"); g.globalCompositeOperation = "lighter"; glow(g, moonX * w, moonY * h, u * .09, "#fff4d8", .9); glow(g, moonX * w, moonY * h, u * .03, "#ffffff", 1); }
  // The deep: green light from far above, falling in shafts, to black.
  const deep = brushwork(w, h * 2, size, (x, y) => { const shaft = Math.max(0, Math.sin(x * 11 + 1) * Math.sin(x * 4.3)) * (1 - y) * .25; return ramp([[0, "#4a9a90"], [.25, "#174a50"], [.6, "#071a20"], [1, "#020608"]], y - shaft); }, 23, () => 1.45);
  // Dawn at the pool: sky, a far hazy bank, a wall of reeds, the stone slab, and the water you stand in.
  const dawn = brushwork(w, h, size, (x, y, r) => {
    if (y < .3) return ramp([[0, "#e8b8a0"], [.6, "#f6d8b0"], [1, "#fff0c8"]], y / .3);
    if (y < .38) return ramp([[0, "#b8a8b8"], [1, "#8a90a0"]], (y - .3) / .08);
    if (y < .58) return ramp([[0, "#7a8448"], [1, "#4a5a2a"]], (y - .38) / .2 + (r() - .5) * .25);
    if (y < .66) return ramp([[0, "#6a6440"], [1, "#4a4632"]], (y - .58) / .08);
    return ramp([[0, "#dfe6d0"], [.25, "#9ab4b4"], [1, "#2e4e5a"]], (y - .66) / .34 + (r() - .5) * .08);
  }, 37, (x, y) => (y >= .38 && y < .58 ? -1.5 : y >= .66 ? 0 : -.15));
  {
    const g = dawn.getContext("2d"), r = seeded(41); g.lineCap = "round";
    for (let i = 0; i < 700; i++) { // reeds: tall leaning strokes, uneven heights, a few seed heads against the sky
      const x = r() * w, base = h * (.56 + r() * .04), top = h * (.24 + r() * .16), lean = (r() - .5) * u * .05;
      g.strokeStyle = mix(mix("#3a4a20", "#8a9a50", r()), "#c8b880", r() * .25); g.lineWidth = size * (.25 + r() * .35);
      g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + lean * .3, (base + top) / 2, x + lean, top); g.stroke();
      if (r() < .18) { g.strokeStyle = mix("#6a4a2a", "#a07a4a", r()); g.lineWidth = size * .7; g.beginPath(); g.moveTo(x + lean, top); g.lineTo(x + lean * 1.1, top - size * 1.6); g.stroke(); }
    }
    // The stone slab, nearer, flat and warm, reaching into the water.
    const cx = w * .36, cy = h * .68, rx = w * .26, ry = h * .085;
    for (let i = 0; i < 2600; i++) { const a = r() * TAU, d = Math.sqrt(r()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, top = 1 - (y - (cy - ry)) / (ry * 2);
      g.strokeStyle = mix(mix("#8a7458", "#d8c098", top * .8), "#5a4a38", r() * .3); g.lineWidth = size * (.35 + r() * .3); const l = size * (.8 + r()); g.beginPath(); g.moveTo(x - l / 2, y + (r() - .5) * 2); g.lineTo(x + l / 2, y + (r() - .5) * 2); g.stroke(); }
    for (let i = 0; i < 500; i++) { const x = cx + (r() - .5) * rx * 1.9, y = cy + ry * (1 + r() * .25); g.strokeStyle = rgba("#2a3a40", .12); g.lineWidth = size * .6; g.beginPath(); g.moveTo(x - size, y); g.lineTo(x + size, y); g.stroke(); } // its shadow on the water
  }
  return { night, deep, dawn, size, slab: [w * .36, h * .64] };
}
function drawPlant(ctx, x, y, s, pulse, seed) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, s * 2.4, PLANT, .35 * pulse); ctx.restore();
  // Stems, thorned, in short dark strokes; buds as bright dabs.
  const r = seeded(seed); ctx.lineCap = "round";
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * .28 + (r() - .5) * .2, len = s * (.8 + r() * .7);
    let px = x, py = y + s * .5;
    for (let j = 0; j < 6; j++) {
      const nx = px + Math.cos(a + Math.sin(j + k) * .25) * len / 6, ny = py + Math.sin(a + Math.sin(j + k) * .25) * len / 6;
      ctx.strokeStyle = mix("#2a3a20", "#6a7a3a", j / 6); ctx.lineWidth = s * .07 * (1 - j / 8); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.strokeStyle = "#1a2010"; ctx.lineWidth = s * .025; const side = j % 2 ? 1 : -1; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + Math.cos(a + side * 1.2) * s * .14, ny + Math.sin(a + side * 1.2) * s * .14); ctx.stroke(); // thorn
      px = nx; py = ny;
    }
    dabs(ctx, px, py, s * .1, s * .1, 6, [PLANT, "#fff8e0", "#e0b860"], s * .09, seed + k, 0, .6 + pulse * .4);
  }
}
// Your right hand, open and reaching, seen from behind: bare skin, warmed on the side toward the plant's light.
// `close` curls the fingers; `hurt` brings blood up where the thorns went in. The hand is painted (glimpse-hand.ts).
function drawReach(ctx, x, y, s, close, hurt, light, time) {
  paintHand(ctx, { x, y: y - s * .25, angle: -.45, s: s * .82, curl: close * .85, splay: .55 - close * .4, skin: { base: mix("#2e3232", "#6a5048", light * .5), shade: "#0a0e10", light: mix("#8a7464", "#f0c898", light * .6) }, rim: { color: PLANT, a: .5 * light }, light: -2.7, lift: .4, arm: s * 2.4, time, seed: 17 }); // a bare hand and forearm, warmed by the plant's light
  if (hurt > 0) { // blood threading up from the palm into the water
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.45);
    for (let k = 0; k < 4; k++) dabs(ctx, -s * .2 + k * s * .14, -s * .1 - hurt * s * .1, s * .04, s * .1 * hurt, 6, ["#8a1010", "#a01818", "#5a0808"], s * .04, 120 + k, -1.57, .7 * hurt);
    ctx.restore();
  }
}
// The snake: a long body of olive and bronze dabs along a sinuous path from `tail` to `head` progress on `path`.
function snakeAt(path, k) { const i = clamp(k) * (path.length - 1), a = Math.floor(i), b = Math.min(path.length - 1, a + 1), m = i - a; return [lerp(path[a][0], path[b][0], m), lerp(path[a][1], path[b][1], m)]; }
function drawSnake(ctx, path, head, length, s, T, ghost) {
  const steps = 40, pts = [];
  for (let i = steps; i >= 0; i--) { const k = head - length * i / steps; if (k < 0 || k > 1) continue; const [x, y] = snakeAt(path, k); pts.push([x, y + Math.sin(T * 6 - i * .5) * s * .25 * (ghost ? 0 : 1), s * (.42 - .32 * (i / steps) ** 1.5)]); }
  if (pts.length < 2) return;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // The body as one tapering stroke (tail to head), then scales and the pale belly line as dabs along it.
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1, th] = pts[i]; ctx.strokeStyle = ghost ? rgba("#f0ece0", ghost * .55) : "#3a4420"; ctx.lineWidth = th * 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  for (let i = 0; i < pts.length; i++) {
    const [x, y, th] = pts[i];
    if (ghost) dabs(ctx, x, y, th, th * .5, 3, ["#ffffff", "#e8eedc"], th * .7, 700 + i, .2, ghost * .8);
    else { dabs(ctx, x, y - th * .2, th * .8, th * .45, 4, i % 4 ? ["#5a6a2a", "#7a7a3a", "#3a4420"] : ["#a08a40", "#c0a858"], th * .7, 300 + i, .2); dabs(ctx, x, y + th * .5, th * .7, th * .15, 2, ["#c8c090"], th * .5, 500 + i, 0, .7); }
  }
  if (!ghost) { const [x, y, th] = pts[pts.length - 1], [px, py] = pts[pts.length - 2], a = Math.atan2(y - py, x - px), c = Math.cos(a), n = Math.sin(a); ctx.fillStyle = "#4a5226"; ctx.beginPath(); ctx.ellipse(x + c * th * .6, y + n * th * .6, th * 1.5, th * 1.05, a, 0, TAU); ctx.fill(); ctx.fillStyle = "#e8d870"; ctx.beginPath(); ctx.arc(x + c * th * 1.2 + n * th * .35, y + n * th * 1.2 - Math.abs(c) * th * .35, th * .22, 0, TAU); ctx.fill(); } // head and eye, facing the way it moves
}
function drawPlantScene(ctx, t, w, h, state) {
  const T = t * 16, u = Math.min(w, h);
  if (state.legendKey !== `${w}x${h}`) { state.legendKey = `${w}x${h}`; state.legend = backdrops(w, h, u); const r = seeded(919); state.bubbles = Array.from({ length: 40 }, () => [r(), r(), .5 + r()]); }
  const B = state.legend, dive = smooth(.12, .17, t), under = t >= .15 && t < .47, plantX = w * .5, plantY = h * .78;
  if (t < .15) {
    // The rock and the sea at night; you look down past your own feet, the stones roped to them. Then you tip forward.
    const tip = smooth(.1, .15, t);
    ctx.fillStyle = "#04060c"; ctx.fillRect(0, 0, w, h); // as the view tips, nothing of the last frame shows below
    ctx.save(); ctx.translate(0, -tip * h * .6); ctx.drawImage(B.night, 0, 0);
    dabs(ctx, w / 2, h * 1.04, u * .7, u * .16, 260, ["#1a1a20", "#2a2a32", "#3a3a46"], u * .03, 50, 0); // the rock's lip
    for (const e of [-1, 1]) { // the stones roped to your ankles: the ropes run up out of sight, to feet you never see
      const fx = w / 2 + e * u * .15, fy = h * .86, fw = u * .1, fl = u * .3;
      const sx = fx + e * u * .3, sy = fy + u * .08;
      ctx.strokeStyle = "#b8a880"; ctx.lineWidth = u * .009; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(fx + e * fw * .2, h * 1.02); ctx.quadraticCurveTo(fx + e * u * .1, fy + u * .14, sx - e * u * .06, sy); ctx.stroke(); // the rope, taut from below the frame
      ctx.fillStyle = "#3a3a42"; ctx.beginPath(); ctx.ellipse(sx, sy, u * .08, u * .06, e * .3, 0, TAU); ctx.fill();
      dabs(ctx, sx, sy, u * .075, u * .055, 90, ["#4a4a54", "#5e5e68", "#2e2e36"], u * .018, e > 0 ? 53 : 54, .3);
      dabs(ctx, sx - e * u * .01, sy - u * .035, u * .045, u * .015, 20, ["#9aa2bc", "#c0c6da"], u * .012, e > 0 ? 57 : 58, 0, .6);
    }
    ctx.restore();
    if (tip > 0) { ctx.fillStyle = `rgba(230,240,255,${smooth(.13, .15, t) * .9})`; ctx.fillRect(0, 0, w, h); }
  } else if (under) {
    // Down: the water slides up past you as you sink; at the bottom the plant waits in its own light.
    const sink = smooth(.15, .32, t), rise = smooth(.42, .47, t);
    ctx.drawImage(B.deep, 0, -h * sink + h * rise * .9);
    for (const [x, y, sp] of state.bubbles) { const py = ((y - T * .1 * sp) % 1 + 1) % 1 * h, px = w * (.3 + x * .4) + Math.sin(T * 2 + y * 20) * u * .01; ctx.strokeStyle = `rgba(210,250,250,${.45 * (1 - sink * .5)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, sp * u * .007, 0, TAU); ctx.stroke(); }
    const floor = smooth(.22, .32, t) * (1 - rise);
    if (floor > 0) {
      ctx.save(); ctx.globalAlpha = floor; ctx.translate(0, (1 - floor) * h * .3 + rise * h * .6);
      dabs(ctx, w / 2, h * .98, w * .7, h * .14, 260, ["#1a1a14", "#2a281e", "#0c0c0a", "#3a3424"], u * .03, 61, 0);
      const held = smooth(.4, .42, t);
      if (held < 1) drawPlant(ctx, plantX, plantY, u * .24, .7 + .3 * Math.sin(T * 2.4), 71);
      const reach = smooth(.3, .39, t), close = smooth(.38, .41, t), hurt = smooth(.385, .44, t);
      if (reach > 0) {
        const hx = lerp(w * .8, plantX + u * .05, reach) + held * 0, hy = lerp(h * 1.2, plantY - u * .02, reach) - held * h * .1;
        drawReach(ctx, hx, hy, u * .2, close, hurt, .4 + .6 * reach, T);
        if (held > 0) { ctx.globalCompositeOperation = "lighter"; glow(ctx, hx - u * .02, hy - u * .03, u * .2, PLANT, .45 * held); ctx.globalCompositeOperation = "source-over"; }
        if (hurt > 0) for (let k = 0; k < 5; k++) { const p = (T * .2 + k * .2) % 1; ctx.strokeStyle = rgba("#8a1010", .5 * hurt * (1 - p)); ctx.lineWidth = u * .004; ctx.beginPath(); ctx.moveTo(hx - u * .03 + k * u * .015, hy); ctx.bezierCurveTo(hx + Math.sin(k + T) * u * .03, hy - p * u * .1, hx - u * .02, hy - p * u * .2, hx + Math.sin(k * 2 + T) * u * .04, hy - p * u * .3); ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.fillStyle = `rgba(0,0,0,${.2 * sink * (1 - rise)})`; ctx.fillRect(0, 0, w, h);
    if (rise > 0) { ctx.fillStyle = `rgba(255,248,230,${smooth(.44, .47, t) * .95})`; ctx.fillRect(0, 0, w, h); }
  } else {
    // Dawn at a freshwater pool. The plant lies on the stone; you are in the water, which rocks you gently.
    const bob = Math.sin(T * 1.3) * u * .008, sink = smooth(.86, 1, t), stone = B.slab;
    ctx.save(); ctx.translate(0, bob + sink * h * .08); ctx.drawImage(B.dawn, 0, 0);
    ctx.globalCompositeOperation = "lighter"; glow(ctx, w * .7, h * .3, u * .6, "#fff0c8", .35 * (1 - smooth(.55, .85, t) * .5)); ctx.globalCompositeOperation = "source-over";
    // The snake's way: out of the reeds on the right, along the stone to the plant, back into the reeds on the left.
    const path = [[w * .72, h * .5], [w * .64, h * .6], [w * .54, h * .64], [w * .44, h * .63], stone, [w * .26, h * .62], [w * .16, h * .56], [w * .08, h * .5]];
    const come = smooth(.6, .7, t), go = smooth(.72, .84, t), taken = t > .71;
    // The shed skin, left where it turned on the stone: pale, empty, glowing a little.
    const skin = smooth(.74, .82, t);
    if (skin > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, stone[0], stone[1], u * .12, "#f4f0e0", .25 * skin); ctx.restore(); drawSnake(ctx, path.slice(2, 7), .9, .8, u * .07, T, .8 * skin); }
    if (!taken) drawPlant(ctx, stone[0], stone[1] - u * .06, u * .13, .6 + .2 * Math.sin(T * 2), 71);
    if (come > 0 && go < 1) {
      const head = taken ? lerp(4 / 7, 1.05, go) : lerp(0, 4 / 7, come);
      drawSnake(ctx, path, head, .45, u * .08, T, 0);
      if (taken) { const [x, y] = snakeAt(path, Math.min(1, head)); ctx.save(); ctx.globalCompositeOperation = "lighter"; glow(ctx, x, y, u * .06, PLANT, .7 * (1 - go)); ctx.restore(); dabs(ctx, x, y, u * .02, u * .015, 8, [PLANT, "#fff8e0"], u * .012, 81, 0, 1 - go); }
    }
    // The pool's near edge and your own hands resting in it, dark, lit along the knuckles.
    for (const e of [-1, 1]) dabs(ctx, w / 2 + e * u * .32, h * 1.02, u * .12, u * .06, 60, ["#1a2226", "#2a3438", "#3a4a4a"], u * .02, e > 0 ? 91 : 92, e * .4);
    ctx.restore();
    // Grief: the colour drains and everything goes soft and low.
    const grief = smooth(.84, 1, t);
    if (grief > 0) { ctx.fillStyle = `rgba(40,50,60,${grief * .55})`; ctx.fillRect(0, 0, w, h); if (state.quality !== "low") { ctx.save(); ctx.filter = `blur(${grief * u * .012}px)`; ctx.globalAlpha = .6; ctx.drawImage(ctx.canvas, 0, 0); ctx.restore(); } }
    if (t < .5) { ctx.fillStyle = `rgba(255,248,230,${1 - smooth(.47, .5, t)})`; ctx.fillRect(0, 0, w, h); }
  }
  vignette(ctx, w, h, under ? .85 : .55, under ? "#000408" : "#1a1008");
}

export const LEGEND = { thePlant: drawPlantScene };
