// Landscape Pack drawing: high-detail procedural textures for overland geography, cached per (kind, variant, tile
// size) in offscreen canvases, plus per-frame animation (surf, glow) and pseudo-3D elevation: a raised tile's top is
// drawn shifted up by its level and a shaded cliff face fills the drop below it.
import { LIFT_PER_LEVEL } from "./landscape.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c";

const TAU = Math.PI * 2;
const cache = new Map();
let clock = 0;
export function setLandscapeClock(now) { clock = now / 1000; }
export function landscapeCacheSize() { return cache.size; }

function rand(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)) >>> 0) / 4294967296; }
function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }

// Each painter draws one tile top at (0,0) with size s, deterministic from `r`.
const PAINT = {
  alpineGrass(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#56684a"], [1, "#43553c"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 22; i++) { const x = r() * s, y = r() * s; c.strokeStyle = r() < .5 ? "#7c9466aa" : "#2f3d2a99"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 3, y - 2 - r() * 4); c.stroke(); } for (let i = 0; i < 3; i++) { c.fillStyle = "#8d8f86"; c.beginPath(); c.ellipse(r() * s, r() * s, 1.5 + r() * 2, 1 + r(), 0, 0, TAU); c.fill(); } },
  mountainRock(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#7d7f80"], [1, "#5a5d60"]]); c.fillRect(0, 0, s, s); granite(c, s, r); for (let i = 0; i < 4; i++) { c.fillStyle = "#7f9a5c66"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 2.5, 0, TAU); c.fill(); } },
  snowRock(c, s, r) { PAINT.mountainRock(c, s, r); for (let i = 0; i < 4; i++) { const x = r() * s, y = r() * s, w = s * (.25 + r() * .35); c.fillStyle = grad(c, x, y - w * .3, x, y + w * .3, [[0, "#ffffff"], [1, "#c9d8e6"]]); c.beginPath(); c.ellipse(x, y, w, w * .45, r() * .6 - .3, 0, TAU); c.fill(); } },
  snowPeak(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#ffffff"], [.6, "#e3edf6"], [1, "#bccfe0"]]); c.fillRect(0, 0, s, s); c.strokeStyle = "#a9bfd688"; c.lineWidth = 1; for (let i = 0; i < 4; i++) { const y = r() * s; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(s * .3, y - 3, s * .7, y + 3, s, y - 1); c.stroke(); } for (let i = 0; i < 6; i++) { c.fillStyle = "#ffffff"; c.fillRect(r() * s, r() * s, 1.5, 1.5); } },
  crag(c, s, r) { c.fillStyle = "#3d4044"; c.fillRect(0, 0, s, s); for (let i = 0; i < 5; i++) { const x = r() * s, h = s * (.4 + r() * .5); c.fillStyle = grad(c, x - 4, 0, x + 4, 0, [[0, "#6c7176"], [1, "#24272a"]]); c.beginPath(); c.moveTo(x - s * .14, s); c.lineTo(x, s - h); c.lineTo(x + s * .14, s); c.fill(); c.fillStyle = "#f2f6fa"; c.beginPath(); c.moveTo(x - s * .04, s - h + s * .1); c.lineTo(x, s - h); c.lineTo(x + s * .04, s - h + s * .1); c.fill(); } },
  mountainTrail(c, s, r) { c.fillStyle = "#6e6253"; c.fillRect(0, 0, s, s); for (let y = 2; y < s; y += s / 4) { c.fillStyle = grad(c, 0, y, 0, y + s / 4, [[0, "#9a8b77"], [1, "#5c5245"]]); c.fillRect(1, y, s - 2, s / 4 - 2); c.fillStyle = "#2c261f88"; c.fillRect(1, y + s / 4 - 2, s - 2, 1.5); } c.fillStyle = "#ffffffaa"; c.fillRect(r() * s * .4, 0, s * .2, 1.5); },
  sand(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#e2c27f"], [1, "#d1aa66"]]); c.fillRect(0, 0, s, s); ripples(c, s, r, "#b98f4f88"); for (let i = 0; i < 8; i++) { c.fillStyle = r() < .5 ? "#f3dda7" : "#a8834a"; c.fillRect(r() * s, r() * s, 1, 1); } },
  duneFace(c, s, r) { c.fillStyle = grad(c, 0, 0, 0, s, [[0, "#f0d394"], [1, "#b98c4d"]]); c.fillRect(0, 0, s, s); ripples(c, s, r, "#9d7440aa"); },
  duneCrest(c, s, r) { PAINT.sand(c, s, r); c.strokeStyle = "#fff0c8"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, s * .45); c.bezierCurveTo(s * .35, s * .3, s * .65, s * .6, s, s * .4); c.stroke(); },
  mesaTop(c, s, r) { c.fillStyle = "#b5623e"; c.fillRect(0, 0, s, s); for (let y = 3; y < s; y += 4 + r() * 3) { c.fillStyle = r() < .5 ? "#cf7a4f88" : "#8c472c88"; c.fillRect(0, y, s, 2); } granite(c, s, r, "#5e2c1a77"); },
  beach(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#eedcab"], [1, "#dcc48e"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 4; i++) { c.fillStyle = ["#f6efe2", "#d39a83", "#b9c8c9"][i % 3]; c.beginPath(); c.ellipse(r() * s, r() * s, 1.6, 1, r() * 3, 0, TAU); c.fill(); } },
  shallows(c, s, r) { c.fillStyle = "#d9c591"; c.fillRect(0, 0, s, s); c.fillStyle = "#3fb3b8aa"; c.fillRect(0, 0, s, s); ripples(c, s, r, "#e8fbfa55"); },
  ocean(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#1d5a86"], [1, "#123f66"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 3; i++) { c.fillStyle = "#2c78a855"; c.beginPath(); c.ellipse(r() * s, r() * s, s * .3, s * .08, 0, 0, TAU); c.fill(); } },
  alienMoss(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#2b1d40"], [1, "#1c1430"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 9; i++) { c.fillStyle = r() < .5 ? "#5a3d8a" : "#3a2a5e"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 2.5, 0, TAU); c.fill(); } for (let i = 0; i < 3; i++) { const x = r() * s, y = r() * s; c.strokeStyle = "#8ef6d0aa"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - 4, x + 1, y - 7); c.stroke(); } },
  alienPlatform(c, s, r) { c.fillStyle = "#34264f"; c.fillRect(0, 0, s, s); c.fillStyle = grad(c, 0, 0, s, s, [[0, "#b6a2ff"], [1, "#5a4bb3"]]); hexagon(c, s * .5, s * .5, s * .46); c.fill(); c.strokeStyle = "#e9e1ff"; c.lineWidth = 1.5; c.stroke(); c.strokeStyle = "#ffffff55"; hexagon(c, s * .5, s * .5, s * .3); c.stroke(); },
  crystalSpire(c, s, r) { PAINT.alienMoss(c, s, r); for (let i = 0; i < 3; i++) { const x = s * (.25 + i * .25), h = s * (.6 + r() * .35), w = s * .1; c.fillStyle = grad(c, x - w, 0, x + w, 0, [[0, "#fdf2ff"], [.5, "#c08bff"], [1, "#6b3cc0"]]); c.beginPath(); c.moveTo(x - w, s); c.lineTo(x - w * .6, s - h); c.lineTo(x, s - h - w); c.lineTo(x + w * .6, s - h); c.lineTo(x + w, s); c.fill(); } },
  alienPool(c, s, r) { PAINT.alienMoss(c, s, r); c.fillStyle = grad(c, 0, 0, s, s, [[0, "#5ff7d1"], [1, "#1f9c8d"]]); c.beginPath(); c.ellipse(s / 2, s / 2, s * .44, s * .36, 0, 0, TAU); c.fill(); },
  lava(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#ffdf6a"], [.45, "#ff7a1f"], [1, "#b8250f"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 5; i++) { c.fillStyle = "#5a1608aa"; c.beginPath(); c.ellipse(r() * s, r() * s, s * (.08 + r() * .12), s * .05, r() * 3, 0, TAU); c.fill(); } },
  volcanicRim(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3b302c"], [1, "#1f1816"]]); c.fillRect(0, 0, s, s); granite(c, s, r, "#ff6a2a55"); for (let i = 0; i < 3; i++) { c.fillStyle = "#ff8a3a88"; c.fillRect(r() * s, r() * s, 2, 2); } },
  ashSlope(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#5a514c"], [1, "#3d3632"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 14; i++) { c.fillStyle = r() < .5 ? "#7a706a" : "#2a2522"; c.fillRect(r() * s, r() * s, 1.5, 1.5); } granite(c, s, r, "#1c171555"); },
  skyBridge(c, s, r) { c.clearRect(0, 0, s, s); c.fillStyle = "#4b3a29"; for (let k = 0; k < s; k += s / 5) { c.fillStyle = grad(c, k, 0, k + s / 5, 0, [[0, "#9a7a52"], [1, "#6a5236"]]); c.fillRect(k + 1, s * .18, s / 5 - 2, s * .64); } c.strokeStyle = "#d8c49a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, s * .16); c.quadraticCurveTo(s / 2, s * .26, s, s * .16); c.moveTo(0, s * .84); c.quadraticCurveTo(s / 2, s * .94, s, s * .84); c.stroke(); },
  castleCourt(c, s, r) { flagstones(c, s, r, "#77706a", "#5b5550"); },
  castleStair(c, s, r) { c.fillStyle = "#4d4844"; c.fillRect(0, 0, s, s); for (let y = 0; y < s; y += s / 3) { c.fillStyle = grad(c, 0, y, 0, y + s / 3, [[0, "#a59c92"], [1, "#6f6861"]]); c.fillRect(2, y + 1, s - 4, s / 3 - 3); } },
  battlement(c, s, r) { flagstones(c, s, r, "#8c847b", "#6c655f"); c.fillStyle = "#3d3936"; for (let x = 0; x < s; x += s / 2) c.fillRect(x + 1, 0, s / 4, s * .14); },
  castleWall(c, s, r) { c.fillStyle = "#5c5650"; c.fillRect(0, 0, s, s); bricks(c, s, r); c.fillStyle = "#3a3632"; for (let x = 0; x < s; x += s / 2) c.fillRect(x, 0, s / 4, s * .18); },
  castleTower(c, s, r) { c.fillStyle = "#4a4541"; c.fillRect(0, 0, s, s); c.fillStyle = grad(c, 0, 0, s, s, [[0, "#9b928a"], [1, "#5b5550"]]); c.beginPath(); c.arc(s / 2, s / 2, s * .46, 0, TAU); c.fill(); c.strokeStyle = "#2c2926"; c.lineWidth = 2; c.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.fillStyle = "#35312e"; c.fillRect(s / 2 + Math.cos(a) * s * .38 - 2, s / 2 + Math.sin(a) * s * .38 - 2, 4, 4); } },
  castleKeep(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#6f4a3a"], [1, "#3e281f"]]); c.fillRect(0, 0, s, s); c.strokeStyle = "#2a1a14"; for (let y = 2; y < s; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(s, y); c.stroke(); } c.fillStyle = "#c9a14a"; c.fillRect(s * .45, s * .1, 2, s * .5); c.fillStyle = "#9c2f2f"; c.fillRect(s * .47, s * .1, s * .25, s * .16); },
};
function granite(c, s, r, color = "#2d2f3155") { c.strokeStyle = color; c.lineWidth = 1; for (let i = 0; i < 3; i++) { let x = r() * s, y = r() * s; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (r() - .5) * s * .4; y += r() * s * .25; c.lineTo(x, y); } c.stroke(); } for (let i = 0; i < 10; i++) { c.fillStyle = r() < .5 ? "#a3a6a855" : "#3b3e4155"; c.fillRect(r() * s, r() * s, 1.5, 1.5); } }
function ripples(c, s, r, color) { c.strokeStyle = color; c.lineWidth = 1; const off = r() * 6; for (let y = off; y < s; y += 5) { c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= s; x += 4) c.lineTo(x, y + Math.sin((x + y) * .35) * 1.4); c.stroke(); } }
function hexagon(c, x, y, rad) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; i ? c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); }
function flagstones(c, s, r, a, b) { c.fillStyle = b; c.fillRect(0, 0, s, s); for (let y = 0; y < s; y += s / 2) for (let x = 0; x < s; x += s / 2) { c.fillStyle = r() < .5 ? a : "#827a71"; c.fillRect(x + 1, y + 1, s / 2 - 2, s / 2 - 2); } }
function bricks(c, s, r) { c.strokeStyle = "#2c2926"; c.lineWidth = 1; for (let row = 0, y = 0; y < s; y += s / 4, row++) { c.beginPath(); c.moveTo(0, y); c.lineTo(s, y); c.stroke(); for (let x = (row % 2) * s / 4; x < s; x += s / 2) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + s / 4); c.stroke(); } } }

const FACE = { volcanic: ["#3a2b25", "#140d0b"], mountains: ["#4f4a45", "#26231f"], desert: ["#a8743d", "#6b4422"], alien: ["#4a3878", "#1d1533"], castle: ["#57504a", "#2a2623"], coast: ["#a68b56", "#6d5933"] };

function makeCanvas(size) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(size, size);
  if (typeof document !== "undefined") { const c = document.createElement("canvas"); c.width = c.height = size; return c; }
  return null;
}
function topTexture(kind, variant, s) {
  const key = `${kind}:${variant}:${s}`;
  if (cache.has(key)) return cache.get(key);
  const size = Math.max(4, Math.ceil(s)), canvas = makeCanvas(size), c = canvas?.getContext?.("2d");
  if (!c || !PAINT[kind]) return null;
  PAINT[kind](c, size, rand(variant * 7919 + kind.length * 104729));
  if (cache.size > 600) cache.delete(cache.keys().next().value);
  cache.set(key, canvas);
  return canvas;
}

// Draw one landscape tile. Returns false for tiles this module does not paint.
export function drawLandscapeTile(ctx, t, x, y, s, tiles, w) {
  if (!t?.landscape || !PAINT[t.kind]) return false;
  const level = (t.elev || 0) - (t.slope ? .5 : 0), lift = Math.max(0, level) * LIFT_PER_LEVEL * s, px = x * s, py = y * s - lift, variant = (t.detail || 0) % 4;
  if (t.kind === "skyBridge") {
    ctx.fillStyle = grad(ctx, 0, y * s, 0, y * s + s, [[0, "#0d0f12"], [1, "#25282c"]]); ctx.fillRect(px, y * s, s + 1, s + 1); // the ravine below
    ctx.fillStyle = "#00000055"; ctx.fillRect(px + s * .1, y * s + s * .55, s * .8, s * .2); // the bridge's shadow far below
    const tex = topTexture(t.kind, 0, s);
    if (tex) { ctx.save(); ctx.translate(px + s / 2, py + s / 2); if (t.bridgeAxis === "y") ctx.rotate(Math.PI / 2); ctx.drawImage(tex, -s / 2, -s / 2, s + .5, s + .5); ctx.restore(); }
    return true;
  }
  if (lift > 0) { // cliff face down to the tile's ground line, lit from the upper left
    const face = (t.volcanic ? FACE.volcanic : FACE[t.landscape]) || FACE.mountains, south = tiles?.[(y + 1) * w + x];
    ctx.fillStyle = grad(ctx, 0, py + s, 0, y * s + s, [[0, face[0]], [1, face[1]]]);
    ctx.fillRect(px, py + s, s + 1, lift + 1);
    ctx.fillStyle = "#00000033"; for (let k = 1; k < Math.ceil(level); k++) ctx.fillRect(px, py + s + k * LIFT_PER_LEVEL * s - 1, s + 1, 1.5);
    if (t.kind === "snowPeak" || t.kind === "snowRock") { ctx.fillStyle = "#f4f8fbcc"; ctx.fillRect(px, py + s, s + 1, Math.min(lift, s * .12)); }
    if (south && (south.elev || 0) < (t.elev || 0)) { ctx.fillStyle = "#00000022"; ctx.fillRect(px, y * s + s, s + 1, s * .18); } // cast shadow
  }
  const tex = topTexture(t.kind, variant, s);
  if (tex) ctx.drawImage(tex, px, py, s + .5, s + .5);
  else { ctx.save(); ctx.translate(px, py); PAINT[t.kind](ctx, s, rand(variant + 1)); ctx.restore(); } // no offscreen canvas (tests, old browsers)
  animate(ctx, t, px, py, s);
  if (lift > 0) { // rim light on edges that drop away, shade on lower sides
    const at = (dx, dy) => tiles?.[(y + dy) * w + x + dx], lower = (n) => !n || (n.elev || 0) < (t.elev || 0);
    if (lower(at(0, -1))) { ctx.fillStyle = "#ffffff55"; ctx.fillRect(px, py, s + 1, Math.max(1.5, s * .05)); }
    if (lower(at(-1, 0))) { ctx.fillStyle = "#ffffff30"; ctx.fillRect(px, py, Math.max(1.5, s * .05), s); }
    if (lower(at(1, 0))) { ctx.fillStyle = "#00000040"; ctx.fillRect(px + s - Math.max(2, s * .07), py, Math.max(2, s * .07), s + lift); }
    ctx.fillStyle = "#0000004d"; ctx.fillRect(px, y * s + s - 2, s + 1, 2); // contact shadow at the cliff foot
  }
  if (t.slope && t.kind !== "mountainTrail" && t.kind !== "castleStair") { ctx.fillStyle = "#ffffff18"; ctx.fillRect(px, py, s, s * .2); }
  return true;
}

function animate(ctx, t, px, py, s) {
  const d = t.detail || 0;
  if (t.kind === "lava") { const p = .5 + .5 * Math.sin(clock * 3 + d); ctx.fillStyle = `rgba(255,236,150,${.25 + p * .35})`; ctx.beginPath(); ctx.arc(px + s * ((d % 7) / 7 + .07), py + s * (((d >> 2) % 7) / 7 + .07), s * (.06 + p * .08), 0, TAU); ctx.fill(); const rise = (clock * .8 + d * .13) % 1; ctx.fillStyle = `rgba(255,140,60,${1 - rise})`; ctx.fillRect(px + s * ((d % 5) / 5 + .1), py - rise * s * 1.4, 2, 2); }
  else if (t.kind === "ocean") { ctx.strokeStyle = "#a8dcf088"; ctx.lineWidth = 1.5; for (let i = 0; i < 2; i++) { const y = py + s * (.3 + i * .4) + Math.sin(clock * 1.6 + d + i) * 2; ctx.beginPath(); ctx.moveTo(px + 2, y); ctx.quadraticCurveTo(px + s / 2, y - 3, px + s - 2, y); ctx.stroke(); } if ((d + Math.floor(clock * 2)) % 9 === 0) { ctx.fillStyle = "#ffffffcc"; ctx.fillRect(px + (d % s), py + s * .5, 2, 2); } }
  else if (t.kind === "shallows") { ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 1; const y = py + s * .5 + Math.sin(clock * 2 + d) * s * .2; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + s, y + 1); ctx.stroke(); }
  else if (t.kind === "alienMoss" || t.kind === "alienPool" || t.kind === "crystalSpire") { const p = .35 + .3 * Math.sin(clock * 2.2 + d * .7); ctx.fillStyle = `rgba(120,255,214,${p * .35})`; ctx.beginPath(); ctx.arc(px + s * ((d % 5) / 5 + .1), py + s * (((d >> 3) % 5) / 5 + .1), s * .12, 0, TAU); ctx.fill(); }
  else if (t.kind === "alienPlatform") { ctx.strokeStyle = `rgba(233,225,255,${.4 + .3 * Math.sin(clock * 3 + d)})`; ctx.lineWidth = 1; hexagon(ctx, px + s / 2, py + s / 2, s * .48); ctx.stroke(); }
}

// Atlas colour for a section's landscape (null when plain).
export function landscapeAtlasColor(biome) { return ({ mountains: "#d9e3ea", desert: "#d6b26e", coast: "#3f7fa3", alien: "#9a6fe0", castle: "#8a7f73" })[biome] || null; }
