// Painting helpers shared by every Glimpse (release 199): seeded randomness, colour mixing, glows, vignettes, film
// grain and fades. Canvas 2D only; no assets.
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
export function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hex(c) { if (c[0] !== "#") return c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number); const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, k) { const x = hex(a), y = hex(b); return `rgb(${Math.round(lerp(x[0], y[0], k))},${Math.round(lerp(x[1], y[1], k))},${Math.round(lerp(x[2], y[2], k))})`; }
export function rgba(c, a) { const x = hex(c); return `rgba(${x[0]},${x[1]},${x[2]},${clamp(a)})`; }
export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
}
export function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(.35, rgba(color, alpha * .45)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
export function vignette(ctx, w, h, strength, color = "#000000") {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .62);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, strength));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
export function fadeEdges(ctx, w, h, t, inn = .07, out = .1) {
  const a = 1 - Math.min(smooth(0, inn, t), 1 - smooth(1 - out, 1, t));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, w, h); }
}
// Fine film grain: one small noise tile, laid at a new offset every frame.
export function grain(ctx, w, h, state, amount) {
  if (!state.grain) {
    const c = makeCanvas(96, 96), g = c.getContext("2d"), img = g.createImageData(96, 96), r = seeded(9);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); state.grain = c;
  }
  ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = "overlay";
  const ox = -Math.floor(state.rand() * 96), oy = -Math.floor(state.rand() * 96);
  for (let y = oy; y < h; y += 96) for (let x = ox; x < w; x += 96) ctx.drawImage(state.grain, x, y);
  ctx.restore();
}

