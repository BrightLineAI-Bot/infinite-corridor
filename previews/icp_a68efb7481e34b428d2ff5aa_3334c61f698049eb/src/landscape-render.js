// Landscape Pack drawing: high-detail procedural textures for overland geography, cached per (kind, variant, tile
// size) in offscreen canvases, plus per-frame animation (surf, glow) and pseudo-3D elevation: a raised tile's top is
// drawn shifted up by its level and a shaded cliff face fills the drop below it.
import { LIFT_PER_LEVEL } from "./landscape.js?v=icp_a68efb7481e34b428d2ff5aa_3334c61f698049eb";

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
  // ---- Diving (W5): the seabed scene
  seabed(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3c5a62"], [1, "#2b464e"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 8; i++) { c.fillStyle = r() < .5 ? "#5d7c7f88" : "#1e333888"; c.beginPath(); c.ellipse(r() * s, r() * s, 1 + r() * 2.5, 1, r() * 3, 0, TAU); c.fill(); } },
  seabedRock(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#1d2f38"], [1, "#0f1b22"]]); c.fillRect(0, 0, s, s); granite(c, s, r, "#00000088"); for (let i = 0; i < 3; i++) { c.fillStyle = "#6fa58a55"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 2, 0, TAU); c.fill(); } },
  kelp(c, s, r) { PAINT.seabed(c, s, r); for (let i = 0; i < 3; i++) { const x = s * (.2 + r() * .6); c.strokeStyle = r() < .5 ? "#3f8a4a" : "#2f6b3a"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, s); c.bezierCurveTo(x - 4, s * .6, x + 4, s * .4, x, s * .05); c.stroke(); } },
  airVent(c, s, r) { PAINT.seabed(c, s, r); c.fillStyle = grad(c, 0, 0, s, s, [[0, "#bfe9ff55"], [1, "#4f8fb033"]]); c.beginPath(); c.arc(s / 2, s / 2, s * .42, 0, TAU); c.fill(); },
  // ---- Grottoes (W6): Drowned Chapel, Kelp Cathedral, Pearl Trench, Sunken Settlement
  chapelFloor(c, s, r) { c.fillStyle = "#3e5560"; c.fillRect(0, 0, s, s); c.strokeStyle = "#22343c"; c.lineWidth = 1; c.strokeRect(1, 1, s / 2 - 1, s / 2 - 1); c.strokeRect(s / 2, s / 2, s / 2 - 1, s / 2 - 1); c.fillStyle = "#6fa58a44"; c.beginPath(); c.arc(r() * s, r() * s, 2, 0, TAU); c.fill(); },
  chapelWall(c, s, r) { c.fillStyle = grad(c, 0, 0, 0, s, [[0, "#3a4a52"], [1, "#1c262c"]]); c.fillRect(0, 0, s, s); c.fillStyle = "#0e161b"; c.beginPath(); c.arc(s / 2, s * .55, s * .22, Math.PI, 0); c.fillRect(s * .28, s * .55, s * .44, s * .4); c.fill(); },
  kelpWall(c, s, r) { c.fillStyle = "#123020"; c.fillRect(0, 0, s, s); for (let i = 0; i < 6; i++) { const x = r() * s; c.strokeStyle = r() < .5 ? "#2f6b3a" : "#1f4a2a"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, s); c.bezierCurveTo(x - 5, s * .6, x + 5, s * .3, x, 0); c.stroke(); } },
  pearlSand(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#4f6470"], [1, "#3a4c56"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 4; i++) { c.fillStyle = "#f4f0ffcc"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 1.6, 0, TAU); c.fill(); } },
  trenchWall(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#141a26"], [1, "#07090f"]]); c.fillRect(0, 0, s, s); granite(c, s, r, "#2a3550aa"); },
  ruinFloor(c, s, r) { c.fillStyle = "#4a5552"; c.fillRect(0, 0, s, s); c.strokeStyle = "#2b3331"; c.lineWidth = 1; for (let k = 0; k < s; k += s / 3) { c.beginPath(); c.moveTo(0, k); c.lineTo(s, k); c.stroke(); } c.fillStyle = "#6fa58a44"; c.fillRect(r() * s, r() * s, 3, 2); },
  ruinWall(c, s, r) { c.fillStyle = "#2e3634"; c.fillRect(0, 0, s, s); c.fillStyle = "#4a5552"; for (let y = 0; y < s; y += s / 4) for (let x = (y / (s / 4)) % 2 ? 0 : s / 4; x < s; x += s / 2) c.fillRect(x + 1, y + 1, s / 4 - 2, s / 4 - 2); },
  seaCurrent(c, s, r) { PAINT.seabed(c, s, r); c.fillStyle = "#7fd0ff22"; c.fillRect(0, 0, s, s); },
  dock(c, s, r) { c.fillStyle = "#1d5a86"; c.fillRect(0, 0, s, s); for (let k = 0; k < s; k += s / 4) { c.fillStyle = grad(c, 0, k, 0, k + s / 4, [[0, "#a07c52"], [1, "#6e5234"]]); c.fillRect(s * .08, k + 1, s * .84, s / 4 - 2); } c.fillStyle = "#3b2a1c"; for (const q of [.08, .84]) c.fillRect(s * q, 0, s * .08, s); },
  // ---- Waterbodies (landscape version 2): blue, swampy, poison and deep water palettes
  deepOcean(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#0f3558"], [1, "#071d36"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 2; i++) { c.fillStyle = "#1c4a7655"; c.beginPath(); c.ellipse(r() * s, r() * s, s * .34, s * .07, 0, 0, TAU); c.fill(); } },
  lakeWater(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3b8cc4"], [1, "#2a6f a6".replace(" ", "")]]); c.fillRect(0, 0, s, s); ripples(c, s, r, "#bfe6ff44"); },
  bogGround(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#4b4a2c"], [1, "#3a3a22"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 10; i++) { c.strokeStyle = r() < .5 ? "#7d8a4a99" : "#2a2a1699"; c.lineWidth = 1; const x = r() * s, y = r() * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 3, y - 3 - r() * 4); c.stroke(); } },
  mireWater(c, s, r) { PAINT.bogGround(c, s, r); c.fillStyle = "#4f5d3399"; c.fillRect(0, 0, s, s); ripples(c, s, r, "#a3b07a44"); },
  swampWater(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3c4a2e"], [1, "#25301d"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 3; i++) { c.fillStyle = "#6f8a3a66"; c.beginPath(); c.ellipse(r() * s, r() * s, s * .12, s * .07, r() * 3, 0, TAU); c.fill(); } },
  toxicBog(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3d3a3f"], [1, "#2a2630"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 6; i++) { c.fillStyle = r() < .5 ? "#7cbf3a77" : "#8a4fb066"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 2, 0, TAU); c.fill(); } },
  toxicMire(c, s, r) { PAINT.toxicBog(c, s, r); c.fillStyle = "#6fa52a77"; c.fillRect(0, 0, s, s); ripples(c, s, r, "#d4ff8a44"); },
  toxicWater(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#5f9a1f"], [1, "#3a5f14"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 4; i++) { c.fillStyle = "#c6ff6a88"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 2.2, 0, TAU); c.fill(); } },
  alienMoss(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#2b1d40"], [1, "#1c1430"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 9; i++) { c.fillStyle = r() < .5 ? "#5a3d8a" : "#3a2a5e"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 2.5, 0, TAU); c.fill(); } for (let i = 0; i < 3; i++) { const x = r() * s, y = r() * s; c.strokeStyle = "#8ef6d0aa"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - 4, x + 1, y - 7); c.stroke(); } },
  alienPlatform(c, s, r) { c.fillStyle = "#34264f"; c.fillRect(0, 0, s, s); c.fillStyle = grad(c, 0, 0, s, s, [[0, "#b6a2ff"], [1, "#5a4bb3"]]); hexagon(c, s * .5, s * .5, s * .46); c.fill(); c.strokeStyle = "#e9e1ff"; c.lineWidth = 1.5; c.stroke(); c.strokeStyle = "#ffffff55"; hexagon(c, s * .5, s * .5, s * .3); c.stroke(); },
  crystalSpire(c, s, r) { PAINT.alienMoss(c, s, r); for (let i = 0; i < 3; i++) { const x = s * (.25 + i * .25), h = s * (.6 + r() * .35), w = s * .1; c.fillStyle = grad(c, x - w, 0, x + w, 0, [[0, "#fdf2ff"], [.5, "#c08bff"], [1, "#6b3cc0"]]); c.beginPath(); c.moveTo(x - w, s); c.lineTo(x - w * .6, s - h); c.lineTo(x, s - h - w); c.lineTo(x + w * .6, s - h); c.lineTo(x + w, s); c.fill(); } },
  alienPool(c, s, r) { PAINT.alienMoss(c, s, r); c.fillStyle = grad(c, 0, 0, s, s, [[0, "#5ff7d1"], [1, "#1f9c8d"]]); c.beginPath(); c.ellipse(s / 2, s / 2, s * .44, s * .36, 0, 0, TAU); c.fill(); },
  lava(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#ffdf6a"], [.45, "#ff7a1f"], [1, "#b8250f"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 5; i++) { c.fillStyle = "#5a1608aa"; c.beginPath(); c.ellipse(r() * s, r() * s, s * (.08 + r() * .12), s * .05, r() * 3, 0, TAU); c.fill(); } },
  volcanicRim(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3b302c"], [1, "#1f1816"]]); c.fillRect(0, 0, s, s); granite(c, s, r, "#ff6a2a55"); for (let i = 0; i < 3; i++) { c.fillStyle = "#ff8a3a88"; c.fillRect(r() * s, r() * s, 2, 2); } },
  ashSlope(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#5a514c"], [1, "#3d3632"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 14; i++) { c.fillStyle = r() < .5 ? "#7a706a" : "#2a2522"; c.fillRect(r() * s, r() * s, 1.5, 1.5); } granite(c, s, r, "#1c171555"); },
  skyBridge(c, s, r) { c.clearRect(0, 0, s, s); c.fillStyle = "#4b3a29"; for (let k = 0; k < s; k += s / 5) { c.fillStyle = grad(c, k, 0, k + s / 5, 0, [[0, "#9a7a52"], [1, "#6a5236"]]); c.fillRect(k + 1, s * .18, s / 5 - 2, s * .64); } c.strokeStyle = "#d8c49a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, s * .16); c.quadraticCurveTo(s / 2, s * .26, s, s * .16); c.moveTo(0, s * .84); c.quadraticCurveTo(s / 2, s * .94, s, s * .84); c.stroke(); },
  // ---- Underlands (dungeon environments)
  chasmLedge(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3f3a40"], [1, "#2a262c"]]); c.fillRect(0, 0, s, s); granite(c, s, r, "#0e0c1088"); },
  chasmWall(c, s, r) { c.fillStyle = grad(c, 0, 0, 0, s, [[0, "#26222a"], [1, "#121014"]]); c.fillRect(0, 0, s, s); granite(c, s, r, "#00000088"); },
  chasmStair(c, s, r) { c.fillStyle = "#2c282e"; c.fillRect(0, 0, s, s); for (let y = 0; y < s; y += s / 4) { c.fillStyle = grad(c, 0, y, 0, y + s / 4, [[0, "#6a6370"], [1, "#3a3540"]]); c.fillRect(2, y + 1, s - 4, s / 4 - 2); } },
  abyss(c, s, r) { c.fillStyle = grad(c, 0, 0, 0, s, [[0, "#1d1636"], [1, "#05030c"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#5b4a9a" : "#2e2654"; c.fillRect(r() * s, r() * s, 1.5, 1.5); } },
  riverStone(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#3c4648"], [1, "#2b3335"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 6; i++) { c.fillStyle = r() < .5 ? "#56676a" : "#1f2729"; c.beginPath(); c.ellipse(r() * s, r() * s, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, TAU); c.fill(); } },
  riverWall(c, s, r) { c.fillStyle = "#1c2426"; c.fillRect(0, 0, s, s); bricks(c, s, r); c.fillStyle = "#3e6a5f44"; c.fillRect(0, s * .7, s, s * .3); },
  frostFloor(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#cfdde8"], [1, "#9fb4c6"]]); c.fillRect(0, 0, s, s); c.strokeStyle = "#ffffff99"; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const x = r() * s, y = r() * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * s * .6, y + (r() - .5) * s * .6); c.stroke(); } },
  iceWall(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#8fb6cf"], [1, "#3e6680"]]); c.fillRect(0, 0, s, s); c.fillStyle = "#e9f6ff66"; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * .4, 0); c.lineTo(0, s * .5); c.fill(); },
  iceSpire(c, s, r) { PAINT.frostFloor(c, s, r); for (let i = 0; i < 2; i++) { const x = s * (.35 + i * .3), hh = s * (.7 + r() * .25); c.fillStyle = grad(c, x - 4, 0, x + 4, 0, [[0, "#ffffff"], [1, "#6fa5c8"]]); c.beginPath(); c.moveTo(x - s * .12, s); c.lineTo(x, s - hh); c.lineTo(x + s * .12, s); c.fill(); } },
  ossuary(c, s, r) { c.fillStyle = "#4a4239"; c.fillRect(0, 0, s, s); for (let i = 0; i < 9; i++) { c.fillStyle = r() < .6 ? "#cfc3ad" : "#8c8170"; const x = r() * s, y = r() * s; if (r() < .3) { c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); c.fillStyle = "#2a241e"; c.fillRect(x - 1, y - .5, 1, 1); c.fillRect(x + .5, y - .5, 1, 1); } else c.fillRect(x, y, 4 + r() * 3, 1.5); } },
  cryptWall(c, s, r) { c.fillStyle = "#2c2622"; c.fillRect(0, 0, s, s); bricks(c, s, r); for (let i = 0; i < 2; i++) { c.fillStyle = "#cfc3ad"; c.beginPath(); c.arc(s * (.3 + i * .4), s * .5, s * .08, 0, TAU); c.fill(); c.fillStyle = "#16120f"; c.fillRect(s * (.27 + i * .4), s * .47, 2, 2); c.fillRect(s * (.32 + i * .4), s * .47, 2, 2); } },
  sarcophagus(c, s, r) { PAINT.ossuary(c, s, r); c.fillStyle = grad(c, 0, 0, s, 0, [[0, "#7c7468"], [1, "#4c463e"]]); c.fillRect(s * .18, s * .08, s * .64, s * .84); c.strokeStyle = "#1e1a16"; c.lineWidth = 1.5; c.strokeRect(s * .18, s * .08, s * .64, s * .84); c.strokeStyle = "#a99f8f"; c.beginPath(); c.moveTo(s * .5, s * .2); c.lineTo(s * .5, s * .8); c.moveTo(s * .35, s * .35); c.lineTo(s * .65, s * .35); c.stroke(); if (r() < .35) { c.fillStyle = "#000000aa"; c.fillRect(s * .2, s * .1, s * .6, s * .05); } },
  fungusFloor(c, s, r) { c.fillStyle = grad(c, 0, 0, s, s, [[0, "#2a3326"], [1, "#1b2219"]]); c.fillRect(0, 0, s, s); for (let i = 0; i < 6; i++) { c.fillStyle = r() < .5 ? "#7bd8b877" : "#c49be877"; c.beginPath(); c.arc(r() * s, r() * s, 1 + r() * 1.5, 0, TAU); c.fill(); } },
  fungusWall(c, s, r) { c.fillStyle = "#151a14"; c.fillRect(0, 0, s, s); granite(c, s, r, "#00000088"); for (let i = 0; i < 3; i++) { c.fillStyle = "#6fd8b866"; c.beginPath(); c.arc(r() * s, r() * s, 2, 0, TAU); c.fill(); } },
  glowcap(c, s, r) { PAINT.fungusFloor(c, s, r); c.fillStyle = "#d7cfb8"; c.fillRect(s * .44, s * .45, s * .12, s * .5); const cap = grad(c, 0, s * .15, 0, s * .5, [[0, "#9ff2d6"], [1, "#3e9c84"]]); c.fillStyle = cap; c.beginPath(); c.ellipse(s * .5, s * .45, s * .42, s * .25, 0, Math.PI, 0); c.fill(); c.fillStyle = "#ffffff66"; for (let i = 0; i < 4; i++) c.fillRect(s * (.25 + i * .15), s * .32, 2, 2); },
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

const FACE = { underlands: ["#2e2a33", "#0d0b10"], volcanic: ["#3a2b25", "#140d0b"], mountains: ["#4f4a45", "#26231f"], desert: ["#a8743d", "#6b4422"], alien: ["#4a3878", "#1d1533"], castle: ["#57504a", "#2a2623"], coast: ["#a68b56", "#6d5933"] };

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
// Level identity (operator ask 2026-10-14): every height reads the same in every biome and dungeon. Ground is plain;
// each raised level gets a lighter wash and that many carved survey notches, so level 3 always shows three notches.
export const LEVEL_WASH = [0, .07, .13, .19, .25, .31];
export const LEVEL_TRIM = [null, "#c08a4a", "#5fc1b4", "#e2c04f", "#a98ae6", "#f4f6ff"]; // bronze, teal, gold, violet, white
export function levelName(elev) { return elev > 0 ? `LEVEL ${elev}` : "GROUND"; }
function drawLevelMarks(ctx, t, x, y, px, py, s, tiles, w) {
  const e = Math.min(5, t.elev || 0);
  if (e <= 0 || t.kind === "skyBridge") return;
  ctx.fillStyle = `rgba(255,246,226,${LEVEL_WASH[e]})`; ctx.fillRect(px, py, s + .5, s + .5);
  ctx.strokeStyle = LEVEL_TRIM[e] + "d9"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.strokeRect(px + s * .06, py + s * .06, s * .88, s * .88); // the level's trim
  const edge = N4.some(([dx, dy]) => { const n = tiles?.[(y + dy) * w + x + dx]; return n && !n.blocked && (n.elev || 0) !== e; });
  if (!edge && (x * 3 + y * 5) % 4 !== 0) return;
  const len = s * .24, gap = Math.max(3, s * .09), ox = px + s * .14, oy = py + s * .14, lw = Math.max(1.5, s * .045);
  for (let k = 0; k < e; k++) {
    const nx = ox + k * gap;
    ctx.fillStyle = "#000000b0"; ctx.fillRect(nx, oy, lw, len);          // the carved groove
    ctx.fillStyle = "#ffffffa6"; ctx.fillRect(nx + lw, oy, lw * .7, len); // its lit lip
  }
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

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
  drawLevelMarks(ctx, t, x, y, px, py, s, tiles, w);
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
  else if (t.kind === "seaCurrent" && t.current) { // streaks flowing with the current
    const f = (clock * 1.1 + d * .07) % 1, { dx, dy } = t.current; ctx.strokeStyle = "#cfefffaa"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { const g = (f + i * .5) % 1, cx = px + s / 2 + dx * (g - .5) * s + (dy ? (i - .5) * s * .4 : 0), cy = py + s / 2 + dy * (g - .5) * s + (dx ? (i - .5) * s * .4 : 0); ctx.beginPath(); ctx.moveTo(cx - dx * s * .18, cy - dy * s * .18); ctx.lineTo(cx + dx * s * .18, cy + dy * s * .18); ctx.lineTo(cx + dx * s * .08 - dy * s * .08, cy + dy * s * .08 - dx * s * .08); ctx.stroke(); }
  }
  else if (t.kind === "deepOcean" || t.kind === "lakeWater") { ctx.strokeStyle = t.kind === "deepOcean" ? "#6fa2d055" : "#d8f0ff77"; ctx.lineWidth = 1.2; const y = py + s * .5 + Math.sin(clock * 1.2 + d) * 2; ctx.beginPath(); ctx.moveTo(px + 3, y); ctx.quadraticCurveTo(px + s / 2, y - 3, px + s - 3, y); ctx.stroke(); }
  else if (t.kind === "toxicWater" || t.kind === "toxicMire" || t.kind === "swampWater") { const f = (clock * .6 + d * .13) % 1; ctx.fillStyle = t.kind === "swampWater" ? `rgba(170,190,120,${.5 * (1 - f)})` : `rgba(210,255,120,${.7 * (1 - f)})`; ctx.beginPath(); ctx.arc(px + s * ((d % 5) / 5 + .1), py + s * (.8 - f * .5), s * (.04 + f * .06), 0, TAU); ctx.fill(); } // rising bubbles
  else if (t.kind === "ocean") { ctx.strokeStyle = "#a8dcf088"; ctx.lineWidth = 1.5; for (let i = 0; i < 2; i++) { const y = py + s * (.3 + i * .4) + Math.sin(clock * 1.6 + d + i) * 2; ctx.beginPath(); ctx.moveTo(px + 2, y); ctx.quadraticCurveTo(px + s / 2, y - 3, px + s - 2, y); ctx.stroke(); } if ((d + Math.floor(clock * 2)) % 9 === 0) { ctx.fillStyle = "#ffffffcc"; ctx.fillRect(px + (d % s), py + s * .5, 2, 2); } }
  else if (t.kind === "shallows") { ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 1; const y = py + s * .5 + Math.sin(clock * 2 + d) * s * .2; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + s, y + 1); ctx.stroke(); }
  else if (t.kind === "glowcap" || t.kind === "fungusFloor") { const p = .3 + .25 * Math.sin(clock * 1.6 + d); ctx.fillStyle = `rgba(150,255,214,${p * .3})`; ctx.beginPath(); ctx.arc(px + s * .5, py + s * .45, s * .35, 0, TAU); ctx.fill(); }
  else if (t.kind === "abyss") { const f = (clock * .25 + d * .17) % 1; ctx.fillStyle = `rgba(150,130,230,${.5 * (1 - f)})`; ctx.fillRect(px + s * ((d % 5) / 5 + .1), py + s * f, 1.5, 1.5); } // motes sinking into the dark
  else if (t.kind === "alienMoss" || t.kind === "alienPool" || t.kind === "crystalSpire") { const p = .35 + .3 * Math.sin(clock * 2.2 + d * .7); ctx.fillStyle = `rgba(120,255,214,${p * .35})`; ctx.beginPath(); ctx.arc(px + s * ((d % 5) / 5 + .1), py + s * (((d >> 3) % 5) / 5 + .1), s * .12, 0, TAU); ctx.fill(); }
  else if (t.kind === "alienPlatform") { ctx.strokeStyle = `rgba(233,225,255,${.4 + .3 * Math.sin(clock * 3 + d)})`; ctx.lineWidth = 1; hexagon(ctx, px + s / 2, py + s / 2, s * .48); ctx.stroke(); }
}

// Atlas colour for a section's landscape (null when plain).
export function landscapeAtlasColor(biome) { return ({ mountains: "#d9e3ea", desert: "#d6b26e", coast: "#3f7fa3", alien: "#9a6fe0", castle: "#8a7f73", sea: "#1d4f7a", isles: "#4f9fb0", lake: "#4a90c8", swamp: "#5d6b3c", blight: "#7cbf3a" })[biome] || null; }

// Pit edges: every walkable tile beside lava, a chasm, a canyon or deep water gets a crumbling, lit lip on that side
// and a shadow falling into the hazard, so a drop is never a surprise. Runs for every map, landscape or not.
const BRINK = { abyss: "#e9dfc6", canyon: "#e9dfc6", lava: "#ffb35c", river: "#d6f1ff", dungeonWater: "#d6f1ff", ocean: "#f2fbff", deepOcean: "#f2fbff", lakeWater: "#e6f6ff", swampWater: "#c9d39a", toxicWater: "#d9ff9a" };
export function drawHazardBrinks(ctx, map, w, l, t, r, b, s, visible = () => true) {
  const T = map?.tiles; if (!T) return;
  const lift = (q) => (map.landscape ? Math.max(0, (q.elev || 0) - (q.slope ? .5 : 0)) * LIFT_PER_LEVEL * s : 0);
  for (let y = Math.max(0, t); y < b; y++) for (let x = Math.max(0, l); x < r; x++) {
    const a = T[y * w + x];
    if (!a || a.blocked || BRINK[a.kind] || !visible(x, y)) continue;
    const px = x * s, py = y * s - lift(a);
    for (const [dx, dy] of N4) {
      const n = T[(y + dy) * w + x + dx], color = n && BRINK[n.kind];
      if (!color || a.kind === "bridge") continue;
      const band = Math.max(2, s * .09);
      ctx.fillStyle = "#00000099"; // shadow cast down into the hazard
      if (dy === 1) ctx.fillRect(px, py + s, s, band * 1.6); else if (dy === -1) ctx.fillRect(px, py - band * 1.6, s, band * 1.6); else if (dx === 1) ctx.fillRect(px + s, py, band * 1.6, s); else ctx.fillRect(px - band * 1.6, py, band * 1.6, s);
      ctx.fillStyle = color;
      for (let k = 0; k < 5; k++) { // jagged, crumbling rim: five uneven teeth along the edge
        const o = k * s / 5, tooth = band * (.6 + ((x * 7 + y * 13 + k * 5) % 5) / 6);
        if (dy === 1) ctx.fillRect(px + o, py + s - tooth, s / 5 - 1, tooth); else if (dy === -1) ctx.fillRect(px + o, py, s / 5 - 1, tooth);
        else if (dx === 1) ctx.fillRect(px + s - tooth, py + o, tooth, s / 5 - 1); else ctx.fillRect(px, py + o, tooth, s / 5 - 1);
      }
    }
  }
}

// Traversal cues near the player: stripes on dangerous drops, chevrons on walkable slopes, and the ledge prompt.
export function drawTraversalCues(ctx, map, w, player, s, now, hint, visible = () => true) {
  if (!player) return;
  if (!map?.landscape) { if (hint?.kind === "brink" && now < hint.until) edgePrompt(ctx, hint, s, 0, .55 + .35 * Math.sin(now / 160)); return; }
  const px = Math.floor(player.x + .5), py = Math.floor(player.y + .75), at = (x, y) => map.tiles[y * w + x], h = Math.floor(map.tiles.length / w), pulse = .55 + .35 * Math.sin(now / 160);
  for (let y = Math.max(0, py - 5); y <= Math.min(h - 1, py + 5); y++) for (let x = Math.max(0, px - 6); x <= Math.min(w - 1, px + 6); x++) {
    const t = at(x, y);
    if (!t || t.blocked || !visible(x, y)) continue;
    const lift = Math.max(0, (t.elev || 0) - (t.slope ? .5 : 0)) * LIFT_PER_LEVEL * s, tx = x * s, ty = y * s - lift;
    for (const [dx, dy, side] of [[0, 1, "s"], [0, -1, "n"], [1, 0, "e"], [-1, 0, "w"]]) {
      const n = at(x + dx, y + dy), drop = (t.elev || 0) - (n && !n.blocked ? (n.elev || 0) : (t.elev || 0));
      if (drop < 2 || Math.hypot(x - px, y - py) > 4.5) continue;
      ctx.fillStyle = drop >= 4 ? `rgba(230,40,40,${pulse})` : `rgba(255,150,40,${pulse * .85})`;
      const band = Math.max(2, s * .1);
      for (let k = 0; k < 4; k++) { // hazard stripes along the edge
        if (side === "s") ctx.fillRect(tx + k * s / 4, ty + s - band, s / 8, band); else if (side === "n") ctx.fillRect(tx + k * s / 4, ty, s / 8, band);
        else if (side === "e") ctx.fillRect(tx + s - band, ty + k * s / 4, band, s / 8); else ctx.fillRect(tx, ty + k * s / 4, band, s / 8);
      }
    }
    if (!t.slope && Math.hypot(x - px, y - py) <= 3.5) for (const [dx, dy] of N4) { // what rises beside you: jumpable (+1) or too high (+2)
      const n = at(x + dx, y + dy), up = n && !n.blocked && !n.slope ? (n.elev || 0) - (t.elev || 0) : 0;
      if (up < 1) continue;
      const ex = tx + s / 2 + dx * s * .36, ey = ty + s / 2 + dy * s * .36;
      if (up === 1) { ctx.strokeStyle = "rgba(130,232,255,.85)"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.moveTo(ex - s * .1 - dy * 0, ey + s * .06); ctx.lineTo(ex, ey - s * .06); ctx.lineTo(ex + s * .1, ey + s * .06); ctx.stroke(); }
      else { ctx.strokeStyle = "rgba(255,95,80,.85)"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.moveTo(ex - s * .08, ey - s * .08); ctx.lineTo(ex + s * .08, ey + s * .08); ctx.moveTo(ex + s * .08, ey - s * .08); ctx.lineTo(ex - s * .08, ey + s * .08); ctx.stroke(); }
    }
    if (t.slope && Math.hypot(x - px, y - py) <= 6) { // chevrons point uphill
      const up = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => { const n = at(x + dx, y + dy); return n && !n.blocked && (n.elev || 0) > (t.elev || 0) - (t.slope ? 0 : 1) && (n.elev || 0) >= (t.elev || 0); }) || [0, -1];
      ctx.strokeStyle = "rgba(255,244,214,.65)"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath();
      const cx = tx + s / 2, cy = ty + s / 2, ux = up[0] * s * .18, uy = up[1] * s * .18, vx = -up[1] * s * .16, vy = up[0] * s * .16;
      ctx.moveTo(cx - ux + vx, cy - uy + vy); ctx.lineTo(cx + ux, cy + uy); ctx.lineTo(cx - ux - vx, cy - uy - vy); ctx.stroke();
    }
  }
  if (hint && now < hint.until) {
    const t = at(hint.x, hint.y), lift = t ? Math.max(0, (t.elev || 0)) * LIFT_PER_LEVEL * s : 0, cx = hint.x * s + s / 2, cy = hint.y * s - lift + s / 2;
    if (hint.kind === "brink") return edgePrompt(ctx, hint, s, lift, pulse);
    ctx.fillStyle = hint.kind === "climb" ? `rgba(120,230,255,${pulse})` : `rgba(255,120,80,${pulse})`;
    ctx.beginPath(); ctx.moveTo(cx, cy - s * .38); ctx.lineTo(cx + s * .22, cy - s * .08); ctx.lineTo(cx + s * .08, cy - s * .08); ctx.lineTo(cx + s * .08, cy + s * .2); ctx.lineTo(cx - s * .08, cy + s * .2); ctx.lineTo(cx - s * .08, cy - s * .08); ctx.lineTo(cx - s * .22, cy - s * .08); ctx.closePath(); ctx.fill();
    ctx.font = `bold ${Math.max(9, Math.round(s * .26))}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000000aa"; ctx.lineWidth = 3;
    const label = hint.kind === "climb" ? "JUMP" : "TOO HIGH"; ctx.strokeText(label, cx, cy - s * .48); ctx.fillText(label, cx, cy - s * .48);
  }
}

// The brink guard's prompt: a pulsing red bar on the edge the player was stopped at.
function edgePrompt(ctx, hint, s, lift, pulse) {
  const cx = hint.x * s + s / 2, cy = hint.y * s - lift + s / 2;
  ctx.strokeStyle = `rgba(255,70,60,${pulse})`; ctx.lineWidth = Math.max(2, s * .08); ctx.strokeRect(hint.x * s + 2, hint.y * s - lift + 2, s - 4, s - 4);
  ctx.font = `bold ${Math.max(9, Math.round(s * .26))}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000000aa"; ctx.lineWidth = 3;
  ctx.strokeText("EDGE", cx, cy - s * .55); ctx.fillText("EDGE", cx, cy - s * .55); ctx.textAlign = "start";
}
