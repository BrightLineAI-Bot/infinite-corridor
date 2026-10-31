import { astralBeamAnchors } from "./astral-worm.js?v=r613-927404a43539";
import { astralMountPresentation } from "./astral-worm-mount.js?v=r613-927404a43539";
import { knockdownPose, drawShockSparks } from "./lightning-giant-render.js?v=r613-927404a43539";
import { enemyMeleeGeometry } from "./combat.js?v=r613-927404a43539";
import { ruleRows } from "./elders.js?v=r613-927404a43539";
import { SEA_CREATURES } from "./sea-creatures.js?v=r613-927404a43539";
import { BOAT } from "./boats.js?v=r613-927404a43539";
import { MECH, DRONE } from "./vehicle-gates.js?v=r613-927404a43539";
import { isMarineTile } from "./world-beasts.js?v=r613-927404a43539";
import { jumpLift, STARFIELD_PLATFORMS, platformPos } from "./game.js?v=r613-927404a43539"; // 613: Starfield rafts
import { drawLandscapeTile, setLandscapeClock, drawTraversalCues, drawHazardBrinks, levelName, setLandscapeStaticPass, landscapeTileAnimated, animateLandscapeTiles, landscapeTileLift, watcherSigil } from "./landscape-render.js?v=r613-927404a43539";
import { elevationAt, LETHAL_KINDS } from "./landscape.js?v=r613-927404a43539";
import { liftAt, tileUnder, LIFT_PER_LEVEL } from "./landscape.js?v=r613-927404a43539";
import { SKY_DISCS } from "./skylands.js?v=r613-927404a43539"; // release 587
import { drawPackMonster, drawPackTelegraphs, drawPackEffects, crystalFlightLift, drawMorphEffects } from "./monster-render.js?v=r613-927404a43539";
import { GATE_REVENANT, DANGER } from "./monster-pack.js?v=r613-927404a43539";
import { drawRelayNode } from "./relay-network.js?v=r613-927404a43539";
import { structureOccupancy } from "./world.js?v=r613-927404a43539";
import { dungeonPointDiscovered, dungeonTileVisibility, DUNGEON_CHUNK_SIZE } from "./dungeon-framework.js?v=r613-927404a43539";

// Release 159: the tile size is a whole number of pixels everywhere it is computed (renderer, combat visuals, main),
// so cached tile textures and the ground image blit 1:1 instead of being resampled every frame.
export function cameraTransform(
  g,
  w,
  h,
  tileSize = Math.round(Math.max(28, Math.min(44, w / 12))),
) {
  return {
    tileSize,
    x: w / 2 - g.player.x * tileSize,
    y: h / 2 - g.player.y * tileSize,
  };
}
export function screenToWorld(g, w, h, x, y) {
  const c = cameraTransform(g, w, h);
  return { x: (x - c.x) / c.tileSize, y: (y - c.y) / c.tileSize };
}
export function renderScaleForViewport(width, height, deviceScale = 1, quality = "balanced") {
  if (quality === "low") return 1;
  return Math.min(Math.max(1, Number(deviceScale) || 1), 2);
}
export function presentationBudget(presentation = {}, area = "overworld") {
  const quality = ["low", "balanced", "full"].includes(presentation.effectiveQuality) ? presentation.effectiveQuality : "balanced";
  return { quality, weather: area === "overworld" && presentation.weather !== false && quality !== "low", ambientMotes: quality === "full" ? 16 : quality === "balanced" ? 6 : 0 };
}
export function visibleInCamera(o, left, top, right, bottom, padding = 2) {
  if (!o) return false;
  const b = o.bounds;
  if (b)
    return b.x + b.w >= left - padding && b.x <= right + padding &&
      b.y + b.h >= top - padding && b.y <= bottom + padding;
  return Number(o.x) >= left - padding && Number(o.x) <= right + padding &&
    Number(o.y) >= top - padding && Number(o.y) <= bottom + padding;
}
// Release 409 (Tim: "the white cracked area [after the Supernova]... overlays enemies and the Void Walker himself, so I can't
// see him... the characters and all enemies should still be visible"): ground the Supernova has scarred counts as seen, and
// a world beast is always drawn, so nothing fights unseen inside the white.
const scarredAt=(g,point)=>{const w=g.map?.width||32,t=g.map?.tiles?.[Math.floor(Number(point?.y)+.5)*w+Math.floor(Number(point?.x)+.5)];return !!t?.voidScar};
const discoveredInDungeon=(g,point)=>g.area!=="dungeon"||!!point?.worldBeast||scarredAt(g,point)||dungeonPointDiscovered(g.map,point);

const structureRenderCache = new WeakMap();
const mapObjectCache = new WeakMap();
const renderCacheStats = { structureBuilds: 0, objectListBuilds: 0, visibleTiles: 0, visibleObjects: 0 };
function structureRenderMeta(o) {
  const cells = o.footprint || [], prior = structureRenderCache.get(o);
  if (prior && prior.cells === cells && prior.length === cells.length) return prior;
  const meta = { cells, length: cells.length, set: new Set(cells.map((c) => `${c.x},${c.y}`)) };
  structureRenderCache.set(o, meta);
  renderCacheStats.structureBuilds++;
  return meta;
}
function mapObjectLists(map) {
  const objects = map?.objects || [], prior = mapObjectCache.get(map);
  if (prior && prior.objects === objects && prior.length === objects.length) return prior;
  const value = {
    objects,
    length: objects.length,
    structures: objects.filter((o) => o.kind === "shack" || o.kind === "architecturalBuilding"),
    shelters: objects.filter((o) => o.kind === "shack"),
    animated: objects.filter((o) => ["shrine", "checkpoint", "ruinMarker", "apertureMemory"].includes(o.kind)),
  };
  mapObjectCache.set(map, value);
  renderCacheStats.objectListBuilds++;
  return value;
}
export function rendererDiagnostics() { return { ...renderCacheStats }; }
// Where render time goes (release 167): the diagnostic probe switches this on and reads the three parts each frame.
export const renderTimings = { on: false, ground: 0, world: 0, overlay: 0 };
function renderableObject(g,o){
  // Keep progression/interaction records, but do not repaint a consumed physical door or gate.
  const width = Math.max(1,Number(g.map?.width)||(g.area === "dungeon" ? 24 : 32));
  if ((o.kind === "sealedGate" || o.kind === "door" || o.kind === "deepShortcut") &&
      g.map?.tiles?.[Math.floor(o.y) * width + Math.floor(o.x)]?.kind === "voidScar") return false;
  return !g.renderObjectPredicate||g.renderObjectPredicate(o);
}
const PAL = {
  ash: ["#3b3834", "#5a5049"],
  glass: ["#345052", "#52716d"],
  ember: ["#553b34", "#85584a"],
  refuge: ["#485848", "#6f8067"],
  floor: ["#3b403d", "#555750"],
  hollowFloor: ["#46575a", "#53666a"],
  hollowWall: ["#101619", "#20292d"],
  cisternFloor: ["#344b47", "#405b54"],
  cisternWall: ["#25352f", "#3f5549"],
  kilnFloor: ["#594039", "#6b4b40"],
  kilnWall: ["#36231f", "#5d352a"],
  blocked: ["#232522", "#45423d"],
  tunnel: ["#2a2620", "#46403a"], // release 225: rough rubble floor where a shovel dug
  wall: ["#1d211f", "#403d37"],
  deepFloor: ["#242b30", "#364149"],
  deepWall: ["#12171b", "#2c343b"],
  threefoldDeepFloor: ["#4b4540", "#62584e"], threefoldDeepWall: ["#171515", "#302827"],
  descentDeepFloor: ["#27343d", "#344852"], descentDeepWall: ["#0e171d", "#1b2a32"],
  loopDeepFloor: ["#3d3648", "#51465e"], loopDeepWall: ["#17131e", "#30283b"],
  floodedDeepFloor: ["#294746", "#39605c"], floodedDeepWall: ["#102423", "#24413e"],
  fortressDeepFloor: ["#4a4035", "#615242"], fortressDeepWall: ["#1b1815", "#382e27"],
  sealedGate: ["#482b31", "#7b454e"],
  river: ["#203f48", "#2b5962"],
  dungeonWater: ["#183b46", "#245763"],
  canyon: ["#171616", "#302721"],
  bridge: ["#67533d", "#856b4b"],
  logBridge: ["#5b442e", "#866847"],
  cityFloor: ["#45454a", "#57565b"],
  cityWall: ["#292a2d", "#59585c"],
  arcologyFloor: ["#293e43", "#3d5960"],
  arcologyWall: ["#1b2d32", "#49666b"],
  cloisterFloor: ["#493f43", "#665459"],
  cloisterWall: ["#2d272b", "#625158"],
  supplyCache: ["#765f3c", "#2b251d", "#d7b96f"],
};
function h(x, y) {
  return (Math.imul(x + 37, 73856093) ^ Math.imul(y + 19, 19349663)) >>> 0;
}
const TRAVELER_LOOKS = new Set(["pilgrim", "peddler", "mercenary", "minstrel", "scholar", "traveler", "cartographer"]);
// Trails (release 115): a worn dirt track drawn over whatever ground the tile already shows.
// A frozen sea tile: pale blue-white ice with a lighter rim and a few cracks, seeded by position.
function seaIceTile(ctx, x, y, s) {
  const px = x * s, py = y * s, d = h(x, y);
  ctx.fillStyle = "#cfe6f2"; ctx.fillRect(px, py, s, s);
  ctx.fillStyle = "#e9f6fc"; ctx.fillRect(px + s * .06, py + s * .06, s * .88, s * .3);
  ctx.strokeStyle = "#8fb4c8"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath();
  ctx.moveTo(px + s * (.15 + (d % 5) * .1), py + s * .2); ctx.lineTo(px + s * .5, py + s * (.45 + (d % 3) * .08)); ctx.lineTo(px + s * (.85 - (d % 4) * .08), py + s * .8);
  ctx.moveTo(px + s * .5, py + s * (.45 + (d % 3) * .08)); ctx.lineTo(px + s * .25, py + s * .85); ctx.stroke();
}
// Release 265: Shale, the quarry keeper (Tim: "a small stone turtle... looks kind of like the mountain turtle, but...
// smaller... no ice on him... He could be wearing a hat"). A fitted-stone shell, stubby legs, a patient head and a
// wide-brimmed straw hat; he breathes slowly.
function quarryTurtle(ctx, x, y, s, now) {
  const cx = (x + .5) * s, cy = (y + .62) * s, b = 1 + Math.sin(now / 900) * .02, u = s / 32;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(0, 9 * u, 14 * u, 4 * u, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#5d6660"; for (const [lx, ly] of [[-10, 5], [10, 5], [-7, 9], [7, 9]]) { ctx.beginPath(); ctx.ellipse(lx * u, ly * u, 3.4 * u, 2.6 * u, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#6f7a72"; ctx.beginPath(); ctx.ellipse(13 * u, 0, 5 * u, 4 * u, 0, 0, 7); ctx.fill(); // head, looking right
  ctx.fillStyle = "#1e2420"; ctx.beginPath(); ctx.arc(15 * u, -1 * u, 1.1 * u, 0, 7); ctx.fill();
  ctx.scale(1, b); ctx.fillStyle = "#7d8780"; ctx.beginPath(); ctx.ellipse(0, 0, 12 * u, 9 * u, 0, Math.PI, 0); ctx.lineTo(12 * u, 3 * u); ctx.lineTo(-12 * u, 3 * u); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#4b534e"; ctx.lineWidth = Math.max(1, u * .9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11 * u, -2 * u); ctx.lineTo(11 * u, -2 * u); ctx.moveTo(-6 * u, -2 * u); ctx.lineTo(-5 * u, -8 * u); ctx.moveTo(4 * u, -2 * u); ctx.lineTo(5 * u, -8 * u); ctx.moveTo(-1 * u, -8.5 * u); ctx.lineTo(-1 * u, -2 * u); ctx.stroke(); // fitted stones
  ctx.fillStyle = "#c9a85a"; ctx.beginPath(); ctx.ellipse(0, -9 * u, 11 * u, 2.6 * u, 0, 0, 7); ctx.fill(); // the hat's brim
  ctx.fillStyle = "#b8954a"; ctx.beginPath(); ctx.ellipse(0, -12 * u, 5.5 * u, 4 * u, 0, Math.PI, 0); ctx.lineTo(5.5 * u, -9.5 * u); ctx.lineTo(-5.5 * u, -9.5 * u); ctx.fill();
  ctx.fillStyle = "#7a4a2a"; ctx.fillRect(-5.5 * u, -11 * u, 11 * u, 1.6 * u); // band
  ctx.restore();
}
// Release 265: a wood wall (upright planks with a cross brace) or a stone block (a cut block, a second course when stacked).
function buildTile(ctx, t, x, y, s) {
  const px = x * s, py = y * s;
  if (t.build === "wood" && (t.buildRun === "ne" || t.buildRun === "nw")) { // release 267: a fence on the diagonal
    const up = t.buildRun === "ne", ax = px + s * .1, bx = px + s * .9, ay = up ? py + s * .88 : py + s * .2, by = up ? py + s * .2 : py + s * .88;
    ctx.strokeStyle = "#00000045"; ctx.lineWidth = s * .12; ctx.beginPath(); ctx.moveTo(ax, ay + s * .06); ctx.lineTo(bx, by + s * .06); ctx.stroke();
    ctx.strokeStyle = "#6b4426"; ctx.lineWidth = s * .07; ctx.beginPath(); ctx.moveTo(ax, ay - s * .12); ctx.lineTo(bx, by - s * .12); ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const f = (k + .5) / 5, x0 = ax + (bx - ax) * f, y0 = ay + (by - ay) * f, w = s * .14;
      ctx.fillStyle = k % 2 ? "#8a5a32" : "#a06d3e"; ctx.beginPath(); ctx.moveTo(x0 - w / 2, y0); ctx.lineTo(x0 - w / 2, y0 - s * .34); ctx.lineTo(x0, y0 - s * .46); ctx.lineTo(x0 + w / 2, y0 - s * .34); ctx.lineTo(x0 + w / 2, y0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4e321a"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
    }
    return;
  }
  if (t.build === "wood" && t.buildRun === "v") { // release 265: built facing sideways, the fence runs up and down
    ctx.fillStyle = "#00000045"; ctx.fillRect(px + s * .5, py + s * .06, s * .14, s * .94);
    for (let k = 0; k < 4; k++) {
      const y0 = py + s * (.02 + k * .24);
      ctx.fillStyle = k % 2 ? "#8a5a32" : "#a06d3e"; ctx.beginPath(); ctx.moveTo(px + s * .38, y0 + s * .26); ctx.lineTo(px + s * .38, y0 + s * .06); ctx.lineTo(px + s * .47, y0 - s * .04); ctx.lineTo(px + s * .56, y0 + s * .06); ctx.lineTo(px + s * .56, y0 + s * .26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4e321a"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
    }
    ctx.fillStyle = "#6b4426"; ctx.fillRect(px + s * .43, py, s * .08, s);
    return;
  }
  if (t.build === "wood") { // a thin palisade of pointed stakes on a crossbar
    ctx.fillStyle = "#00000045"; ctx.fillRect(px + s * .02, py + s * .74, s * .96, s * .1);
    for (let k = 0; k < 5; k++) {
      const x0 = px + s * (.03 + k * .19), w = s * .17;
      ctx.fillStyle = k % 2 ? "#8a5a32" : "#a06d3e"; ctx.beginPath(); ctx.moveTo(x0, py + s * .78); ctx.lineTo(x0, py + s * .3); ctx.lineTo(x0 + w / 2, py + s * .16); ctx.lineTo(x0 + w, py + s * .3); ctx.lineTo(x0 + w, py + s * .78); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#4e321a"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
    }
    ctx.fillStyle = "#6b4426"; ctx.fillRect(px, py + s * .5, s, s * .08);
    return;
  }
  const level = t.buildLevel || 1;
  for (let k = 0; k < level; k++) {
    const top = py + s * (.18 - k * .16);
    ctx.fillStyle = "#00000038"; ctx.fillRect(px + s * .06, top + s * .74, s * .9, s * .12);
    ctx.fillStyle = "#7b7f86"; ctx.fillRect(px + s * .06, top + s * .5, s * .88, s * .3);
    ctx.fillStyle = "#a9aeb5"; ctx.fillRect(px + s * .06, top + s * .14, s * .88, s * .38);
    ctx.strokeStyle = "#4e5258"; ctx.lineWidth = Math.max(1, s * .04); ctx.strokeRect(px + s * .06, top + s * .14, s * .88, s * .66);
    ctx.beginPath(); ctx.moveTo(px + s * .06, top + s * .52); ctx.lineTo(px + s * .94, top + s * .52); ctx.stroke();
  }
}
function tile(ctx, t, x, y, s, map, w, activeBuildingId=null, scarSurface=null) {
  if (t?.kind === "seaIce") { seaIceTile(ctx, x, y, s); return; } // release 261: the Mountain Turtle's ice floor
  if (t?.build) { tileBase(ctx, t.buildOrig || t, x, y, s, map, w, activeBuildingId, scarSurface); buildTile(ctx, t, x, y, s); return; }
  tileBase(ctx, t, x, y, s, map, w, activeBuildingId, scarSurface);
  if (t?.trail) {
    const d = Number.isFinite(t.detail) ? t.detail : h(x, y), px = x * s, py = y * s;
    ctx.fillStyle = "#8a744f55"; ctx.fillRect(px + s * .12, py + s * .12, s * .76, s * .76);
    ctx.fillStyle = "#c2a87a33"; ctx.fillRect(px + s * (.2 + (d % 3) * .12), py + s * (.3 + (d % 2) * .25), s * .14, s * .1);
  }
  if (t?.sigil) sigilInlay(ctx, t, x, y, s);
}
// Release 289: a tile of the Watcher's sigil (watcher.ts): pale violet inlaid stone, the eye's pupil brightest; in arenas a
// border and tesserae of small tiles around it; on a shrine, the raised platforms (their faces are the landscape's own).
const SIGIL_INLAY = { lid: ["#b8b0d855", "#e6e0ff66"], ring: ["#b8b0d855", "#e6e0ff66"], eye: ["#a79ed066", "#e6e0ff55"], pupil: ["#d8d0ff99", "#ffffffaa"], orbit: ["#9f96c855", "#d8d2f855"], tools: ["#a79ed055", "#e6e0ff55"], border: ["#c9a15c44", "#e2c04f55"], tessera: ["#6d5f8a33", "#b8b0d833"] };
function sigilInlay(ctx, t, x, y, s) {
  const [fill, edge] = SIGIL_INLAY[t.sigil] || SIGIL_INLAY.ring, px = x * s, py = y * s - (t.landscape ? landscapeTileLift(t, s) : 0), d = Number.isFinite(t.detail) ? t.detail : h(x, y);
  if (t.sigil === "tessera") { for (let k = 0; k < 4; k++) { ctx.fillStyle = (d + k) % 3 ? fill : edge; ctx.fillRect(px + s * (.08 + (k % 2) * .44), py + s * (.08 + Math.floor(k / 2) * .44), s * .38, s * .38); } return; }
  ctx.fillStyle = fill; ctx.fillRect(px + s * .06, py + s * .06, s * .88, s * .88);
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, s * .04); ctx.strokeRect(px + s * .1, py + s * .1, s * .8, s * .8);
  if (t.sigil === "pupil") { ctx.fillStyle = "#ffffffcc"; ctx.beginPath(); ctx.arc(px + s * .5, py + s * .5, s * .16, 0, Math.PI * 2); ctx.fill(); }
}
// Release 289 (Tim: "pristine, where the glyph is just very bright... a little halo above it... super rare"): the pristine
// Watcher's tomb. Opened, its lid is pushed aside and the sigil dark.
function drawWatcherTomb(ctx, o, s, now) {
  const x0 = (o.x + .18) * s, y0 = (o.y + .02) * s, w = s * .64, hh = s * .9, open = o.state === "opened";
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse((o.x + .5) * s, (o.y + .95) * s, s * .38, s * .1, 0, 0, Math.PI * 2); ctx.fill();
  if (open) { ctx.fillStyle = "#14110e"; ctx.fillRect(x0, y0, w, hh); }
  ctx.save(); if (open) { ctx.translate(s * .14, s * .05); ctx.rotate(.18); }
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, "#d9d4e6"); g.addColorStop(1, "#9c96ac"); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, hh);
  ctx.strokeStyle = "#2a2433"; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, w, hh);
  const cx = (o.x + .5) * s, cy = (o.y + .4) * s, pulse = open ? 0 : .5 + .5 * Math.sin(now / 520);
  if (!open) { ctx.fillStyle = `rgba(207,196,255,${.16 + pulse * .12})`; ctx.beginPath(); ctx.arc(cx, cy, s * (.27 + pulse * .04), 0, Math.PI * 2); ctx.fill(); } // release 469: a soft disc, not shadowBlur (costly on phone GPUs)
  watcherSigil(ctx, cx, cy, s * .17, s, open ? .25 : .95, open ? "#6d6680" : "#f4f0ff");
  ctx.restore();
  if (!open) { ctx.strokeStyle = `rgba(236,230,255,${.45 + pulse * .35})`; ctx.lineWidth = Math.max(1.5, s * .035); ctx.beginPath(); ctx.ellipse(cx, (o.y - .32) * s - pulse * s * .04, s * .24, s * .07, 0, 0, Math.PI * 2); ctx.stroke(); }
}
// Release 301: a Watcher's dais, a round stepped stone with the sigil inlaid; dim while dormant, lit and haloed once attuned.
function drawWarpDais(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .55) * s, lit = o.state === "attuned", pulse = .5 + .5 * Math.sin(now / 480);
  ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .14, s * .5, s * .2, 0, 0, Math.PI * 2); ctx.fill();
  for (const [r, top, c0, c1] of [[.5, .1, "#77708a", "#4a4458"], [.4, 0, "#a39cb6", "#6c6680"]]) { const g = ctx.createLinearGradient(cx - s * r, 0, cx + s * r, 0); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy - top * s, s * r, s * r * .42, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#2a2433"; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .45); if (lit) { ctx.fillStyle = `rgba(216,200,255,${.18 + pulse * .12})`; ctx.beginPath(); ctx.arc(0, 0, s * (.3 + pulse * .04), 0, Math.PI * 2); ctx.fill(); } /* release 469: no shadowBlur */
  watcherSigil(ctx, 0, 0, s * .2, s, lit ? .95 : .4, lit ? "#f4f0ff" : "#3a3448"); ctx.restore();
  if (lit) { ctx.strokeStyle = `rgba(216,200,255,${.35 + pulse * .35})`; ctx.lineWidth = Math.max(1.5, s * .03); ctx.beginPath(); ctx.ellipse(cx, cy - s * (.55 + pulse * .05), s * .22, s * .06, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(216,200,255,${.08 + pulse * .06})`; ctx.beginPath(); ctx.moveTo(cx - s * .3, cy); ctx.lineTo(cx - s * .16, cy - s * .55); ctx.lineTo(cx + s * .16, cy - s * .55); ctx.lineTo(cx + s * .3, cy); ctx.closePath(); ctx.fill(); }
}
// Exact Supernova disks are static material on the cast-center ground plane. A single constant
// visual lift preserves a true circle across uneven physical tiles and survives later revisits.
const voidScarSurfaceCache = new WeakMap();
function voidScarSurface(map, area) {
  const source = map._voidScarCircles, legacySource = map._voidScarLegacyCells;
  const circles = (Array.isArray(source) ? source : []).filter(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)&&Number.isFinite(c.radius)&&c.radius>0);
  const legacy = Array.isArray(legacySource) ? legacySource : [];
  // Only the active overworld section is scanned. Water never acquires scar material, even where
  // a saved exact circle overlaps a coast; include the mask in cache identity for in-place changes.
  const marine = area === 'overworld' && circles.length ? (map.tiles || []).flatMap((tile, i) => isMarineTile(tile) ? [i] : []) : [];
  const signature = circles.map(c=>`${c.x},${c.y},${c.radius},${Number(c.visualLift)||0}`).join(';')+'|'+legacy.join(';')+'|water:'+marine.join(',');
  const prior = voidScarSurfaceCache.get(map);
  if(prior&&prior.source===source&&prior.legacySource===legacySource&&prior.signature===signature)return prior;
  const shapes=circles.map(circle=>{
    const {x,radius:r}=circle,y=circle.y-(Number(circle.visualLift)||0),seed=h(Math.round(x*1000),Math.round(circle.y*1000)),cracks=[];
    // Five fine rents across an entire disk, not a busy crack network in every tile.
    for(let i=0;i<5;i++){
      const a=(seed%628)/100+i*Math.PI*2/5,dx=Math.cos(a),dy=Math.sin(a),bend=((seed>>>(i*3))&7)/7-.5;
      const point=(rad,side)=>[x+r*(dx*rad-dy*side),y+r*(dy*rad+dx*side)];
      const path=[point(.94,0),point(.76,bend*.09),point(.61,-bend*.1),point(.4+(i%3)*.055,bend*.035)];
      cracks.push(path);
      if(i===1||i===4)cracks.push([path[2],point(.56,bend*.1+.07),point(.5,bend*.1+.12)]);
    }
    return {...circle,y,cracks};
  });
  const surface={source,legacySource,signature,shapes,marine,legacy:new Set(legacy),legacyAll:!Array.isArray(source)&&!Array.isArray(legacySource)};
  voidScarSurfaceCache.set(map,surface);return surface;
}
function drawVoidScarTile(ctx,t,x,y,s,map,w,activeBuildingId,surface){
  // Collision uses whole cells. Corners outside the exact disk remain ordinary harmless floor,
  // never a surviving wall or a white stair-step around the circular visual boundary.
  tileBase(ctx,{kind:'floor',blocked:false,detail:t.detail},x,y,s,map,w,activeBuildingId);
  if(surface&&!surface.legacyAll&&!surface.legacy.has(`${x},${y}`))return;
  // Old cell-only saves have no recoverable center. Preserve only those historical footprints.
  const px=x*s,py=y*s;ctx.fillStyle='#fffefd';ctx.fillRect(px,py,s,s);
  if(h(x,y)%5!==0)return;
  ctx.strokeStyle='#ba3e4d';ctx.lineWidth=Math.max(.65,s*.02);ctx.beginPath();
  ctx.moveTo(px+s*.18,py+s*.34);ctx.lineTo(px+s*.42,py+s*.48);ctx.lineTo(px+s*.7,py+s*.4);ctx.stroke();
}
function drawVoidScarSurface(ctx,g,s,mw,mh,surface){
  if(!surface.shapes.length)return;
  ctx.save();ctx.beginPath();
  if(g.area==='dungeon'&&g.map.dungeonContract?.discoveryEnabled&&g.map._dungeonRevealMode!=='full'){
    // Clip by ordinary discovery only, never reveal because a blast crossed into a chunk.
    for(let y=0;y<mh;y+=DUNGEON_CHUNK_SIZE)for(let x=0;x<mw;x+=DUNGEON_CHUNK_SIZE)
      if(dungeonTileVisibility(g.map,x,y)!=='unseen')ctx.rect(x*s,y*s,Math.min(DUNGEON_CHUNK_SIZE,mw-x)*s,Math.min(DUNGEON_CHUNK_SIZE,mh-y)*s);
  }else ctx.rect(0,0,mw*s,mh*s);
  ctx.clip();
  if(surface.marine.length){
    // Nonoverlapping row runs subtract ocean from the continuous disk, not from terrain/fog.
    // The outer blast contour stays smooth; shoreline clipping follows the existing tile geometry.
    ctx.beginPath();ctx.rect(0,0,mw*s,mh*s);
    for(let i=0;i<surface.marine.length;i++){
      const start=surface.marine[i],row=Math.floor(start/mw);let end=start;
      while(i+1<surface.marine.length&&surface.marine[i+1]===end+1&&Math.floor((end+1)/mw)===row)end=surface.marine[++i];
      ctx.rect((start%mw)*s,row*s,(end-start+1)*s,s);
    }
    ctx.clip('evenodd');
  }
  ctx.fillStyle='#fffefd';
  // Opaque raster fills form the exact circle union without a superlinear overlapping vector clip.
  // Every fracture segment lies inside its own convex disk, so no additional union clip is needed.
  for(const c of surface.shapes){ctx.beginPath();ctx.arc(c.x*s,c.y*s,c.radius*s,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='#ba3e4d';ctx.lineWidth=Math.max(.65,s*.02);ctx.lineCap='butt';ctx.lineJoin='miter';ctx.beginPath();
  for(const c of surface.shapes)for(const crack of c.cracks){ctx.moveTo(crack[0][0]*s,crack[0][1]*s);for(let i=1;i<crack.length;i++)ctx.lineTo(crack[i][0]*s,crack[i][1]*s)}
  ctx.stroke();ctx.restore();
}
// Release 589: a Skyland with a mode stands on cloud: open sky where the arena has void, soft cloud underfoot, and a darker
// underside where cloud meets sky. Other tiles (hazards, bridges) draw as they always do.
// Release 593 (Tim: "stars in the background... a penumbra around the character as he moves, and the background is kind of like
// glittering stars"): a chasm crossing's drop is open night sky. The tile holds a few fixed stars (cached with the ground); each
// frame a bounded handful glitter (CHASM_STARS.twinkle of the tiles in view), and a penumbra of light follows the Wayfarer.
export const CHASM_STARS = { sky: "#0b0e11", stars: 3, star: ["#ffffff2e", "#fff0c444"], glint: .4, // release 613 (Tim: "the background to be like the fog... dark... faint, faint specks of light... you won't be able to really discern... depth vs blackness"): the fog's own black, faint stars
  twinkleEvery: 3, penumbra: { inner: 2.6, outer: 7.5, dark: .78 } };
function drawStarChasm(ctx, t, x, y, s) {
  const px = x * s, py = y * s;
  ctx.fillStyle = CHASM_STARS.sky; ctx.fillRect(px, py, s + 1, s + 1);
  for (let i = 0; i < CHASM_STARS.stars; i++) { const q = h(x * 13 + i * 31, y * 17 + i * 7); if (q % 3 === 0) continue; ctx.fillStyle = CHASM_STARS.star[q % 5 ? 0 : 1]; const r = q % 11 === 0 ? 1.4 : 1; ctx.fillRect(px + (q % 97) / 97 * s, py + ((q >> 8) % 97) / 97 * s, r, r); }
}
// Per frame: the glittering stars over the chasm tiles in view (`list` is tile, x, y triples).
function glitterChasm(ctx, list, s, now) {
  for (let i = 0; i < list.length; i += 3) {
    const x = list[i + 1], y = list[i + 2], q = h(x * 5 + 1, y * 3 + 2), a = Math.sin(now / (520 + q % 600) + q) ; if (a < .55) continue;
    const px = x * s + (q % 89) / 89 * s, py = y * s + ((q >> 7) % 89) / 89 * s, r = 1 + (a - .55) * 4.5;
    ctx.fillStyle = `rgba(255,248,225,${(a - .55) * 2 * CHASM_STARS.glint})`; ctx.fillRect(px - r, py - .5, r * 2, 1); ctx.fillRect(px - .5, py - r, 1, r * 2);
  }
}
// Release r613-927404a43539: a Starfield raft: a slab of pale stone edged with faint light, its shadow lost in the stars below.
function drawRafts(ctx, g, s, now) {
  const t = Number(g.save?.playSeconds) || 0, H = STARFIELD_PLATFORMS.half;
  for (const m of g.map.movers) { const c = platformPos(m, t); if (g.area === "dungeon" && dungeonTileVisibility(g.map, Math.floor(c.x), Math.floor(c.y)) === "unseen") continue; const x = (c.x - H) * s, y = (c.y - H) * s, w = H * 2 * s, glow = .45 + .25 * Math.sin(now / 500 + m.phase * 6);
    ctx.fillStyle = "#00000066"; ctx.fillRect(x + s * .12, y + s * .22, w, w);
    ctx.fillStyle = "#cfc6b4"; ctx.fillRect(x, y, w, w); ctx.fillStyle = "#b3aa97"; ctx.fillRect(x, y + w * .78, w, w * .22);
    ctx.strokeStyle = `rgba(170,200,255,${glow})`; ctx.lineWidth = Math.max(1.5, s * .06); ctx.strokeRect(x + 1, y + 1, w - 2, w - 2);
    ctx.fillStyle = `rgba(200,220,255,${glow * .8})`; for (const [u, v] of [[.2, .2], [.8, .2], [.2, .8], [.8, .8]]) ctx.fillRect(x + w * u - 1.5, y + w * v - 1.5, 3, 3); }
}
let cloudSky = false; // set each frame from g.map.skyCloud (tile painters are handed the tile array, not the map)
export const CLOUD_PAINT = { sky: ["#6f9cc9", "#77a3cf"], puff: "#ffffff22", floor: ["#dfe6ef", "#d6dfeb"], shade: "#b4c3d666", rim: "#8ea4bf", gleam: "#ffffff44" };
function drawCloudTile(ctx, t, x, y, s, tiles, w) {
  const C = CLOUD_PAINT, d = Number.isFinite(t.detail) ? t.detail : h(x, y), px = x * s, py = y * s, below = tiles?.[(y + 1) * w + x];
  if (t.kind === "void") {
    ctx.fillStyle = C.sky[d & 1]; ctx.fillRect(px, py, s + 1, s + 1);
    if (d % 5 === 0) { ctx.fillStyle = C.puff; ctx.beginPath(); ctx.ellipse(px + s * .5, py + s * .55, s * .55, s * .22, 0, 0, Math.PI * 2); ctx.fill(); }
    return true;
  }
  if (t.blocked || t.environment || /bridge|canyon|water|river|gate/i.test(String(t.kind))) return false;
  ctx.fillStyle = C.floor[d & 1]; ctx.fillRect(px, py, s + 1, s + 1);
  ctx.fillStyle = C.shade; ctx.beginPath(); ctx.arc(px + s * (.25 + (d % 3) * .2), py + s * .7, s * .18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.gleam; ctx.beginPath(); ctx.arc(px + s * (.3 + (d % 4) * .12), py + s * .3, s * .14, 0, Math.PI * 2); ctx.fill();
  if (below?.kind === "void") { ctx.fillStyle = C.rim; ctx.fillRect(px, py + s * .78, s + 1, s * .22 + 1); }
  return true;
}
function tileBase(ctx, t, x, y, s, map, w, activeBuildingId=null, scarSurface=null) {
  if (t?.kind === "voidScar") { drawVoidScarTile(ctx,t,x,y,s,map,w,activeBuildingId,scarSurface); return; }
  if (t?.landscape && drawLandscapeTile(ctx, t, x, y, s, map, w)) return;
  if (cloudSky && drawCloudTile(ctx, t, x, y, s, map, w)) return; // release 589
  if (t?.chasm) { drawStarChasm(ctx, t, x, y, s); return; } // release 593
  const p = PAL[t.kind] || PAL.ash,
    d = Number.isFinite(t.detail) ? t.detail : h(x, y),
    px = x * s,
    py = y * s;
  ctx.fillStyle = p[d & 1];
  ctx.fillRect(px, py, s + 1, s + 1);
  if (t.kind === "river" || t.kind === "dungeonWater") {
    ctx.strokeStyle = (d & 1) ? "#8fc2c477" : "#659ca166"; ctx.lineWidth = 2;
    for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(px + ((d + q * 11) % 13), py + 7 + q * s * .26); ctx.quadraticCurveTo(px + s * .5, py + 2 + q * s * .26, px + s - 3, py + 7 + q * s * .26); ctx.stroke(); }
    return;
  }
  if (t.kind === "canyon") {
    ctx.fillStyle = "#070707cc"; ctx.fillRect(px + 3, py, s - 6, s + 1); ctx.strokeStyle = "#75584488"; ctx.beginPath(); ctx.moveTo(px + 2, py); ctx.lineTo(px + 7 + (d % 5), py + s * .45); ctx.lineTo(px + 3, py + s); ctx.stroke(); ctx.strokeStyle = "#8c6a4b55"; ctx.beginPath(); ctx.moveTo(px + s - 3, py); ctx.lineTo(px + s - 8, py + s * .6); ctx.lineTo(px + s - 2, py + s); ctx.stroke(); return;
  }
  if (t.kind === "bridge" || t.kind === "logBridge") {
    ctx.fillStyle = "#2b2119"; ctx.fillRect(px, py + 2, s + 1, s - 4); ctx.fillStyle = p[d & 1]; for (let q = 2; q < s; q += 7) ctx.fillRect(px + 2, py + q, s - 4, 5); ctx.strokeStyle = "#b594603f"; ctx.strokeRect(px + 2, py + 2, s - 4, s - 4); return;
  }
  if(t.kind==="hollowWall"){ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle="#05090b55";ctx.fillRect(px+3,py+3,s-6,s-6);ctx.strokeStyle="#82979b55";ctx.lineWidth=1.5;ctx.strokeRect(px+2,py+2,s-4,s-4);ctx.beginPath();ctx.moveTo(px+s*.18,py+s*.08);ctx.lineTo(px+s*.42,py+s*.42);ctx.lineTo(px+s*.31,py+s*.9);ctx.moveTo(px+s*.72,py+s*.12);ctx.lineTo(px+s*.62,py+s*.58);ctx.lineTo(px+s*.86,py+s*.86);ctx.stroke();if((d&3)===1){ctx.fillStyle="#9fb2b238";ctx.fillRect(px+s*.12,py+s*.48,s*.76,2)}return}
  if(t.kind==="cisternWall"){ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle="#18231f99";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py+s*.34);ctx.lineTo(px+s,py+s*.34);ctx.moveTo(px,py+s*.68);ctx.lineTo(px+s,py+s*.68);ctx.stroke();ctx.strokeStyle="#6f988052";ctx.lineWidth=1;for(let q=.16;q<.9;q+=.34){ctx.beginPath();ctx.moveTo(px+s*q,py);ctx.quadraticCurveTo(px+s*(q-.12),py+s*.48,px+s*(q+.05),py+s);ctx.stroke()}if((d&3)===2){ctx.strokeStyle="#79aaa466";ctx.beginPath();ctx.arc(px+s*.62,py+s*.76,s*.16,.1,2.7);ctx.stroke()}return}
  if(t.kind==="kilnWall"){ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle="#1a0d0bba";ctx.lineWidth=2;for(let row=0;row<3;row++){const yy=py+(row+1)*s/3;ctx.beginPath();ctx.moveTo(px,yy);ctx.lineTo(px+s,yy);ctx.stroke();const offset=(row+(d&1))%2?s*.28:s*.68;ctx.beginPath();ctx.moveTo(px+offset,yy-s/3);ctx.lineTo(px+offset,yy);ctx.stroke()}ctx.strokeStyle="#d8713b42";ctx.lineWidth=1;ctx.strokeRect(px+2,py+2,s-4,s-4);if((d&3)===0){ctx.fillStyle="#e47a4833";ctx.fillRect(px+3,py+s-4,s-6,2)}return}
  if(/DeepWall$/.test(t.kind)){const family=t.kind.replace("DeepWall","");ctx.fillStyle=p[d&1];ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle={threefold:"#c9956b55",descent:"#79a9bc55",loop:"#b294c955",flooded:"#83bbb055",fortress:"#c1a06f55"}[family]||"#87949a55";ctx.lineWidth=1.5;if(family==="threefold"){ctx.strokeRect(px+3,py+3,s-6,s-6);ctx.beginPath();ctx.moveTo(px+s*.5,py+3);ctx.lineTo(px+s*.5,py+s-3);ctx.stroke()}else if(family==="descent"){for(let q=5;q<s;q+=9){ctx.beginPath();ctx.moveTo(px+3,py+q);ctx.lineTo(px+s-3,py+q+3);ctx.stroke()}}else if(family==="loop"){ctx.beginPath();ctx.arc(px+s*.5,py+s*.5,s*.3,0,5.3);ctx.stroke()}else if(family==="flooded"){ctx.beginPath();ctx.moveTo(px+2,py+s*.3);ctx.quadraticCurveTo(px+s*.5,py+s*.12,px+s-2,py+s*.3);ctx.moveTo(px+2,py+s*.7);ctx.quadraticCurveTo(px+s*.5,py+s*.52,px+s-2,py+s*.7);ctx.stroke()}else{for(let q=s*.33;q<s;q+=s*.33){ctx.beginPath();ctx.moveTo(px,py+q);ctx.lineTo(px+s,py+q);ctx.stroke()}}return}
  if (t.structure === "districtDoor") {
    ctx.fillStyle = p[d & 1]; ctx.fillRect(px, py, s + 1, s + 1); ctx.fillStyle="#0b0d0d";ctx.fillRect(px+s*.2,py+s*.08,s*.6,s*.86);ctx.strokeStyle="#b79c7166";ctx.lineWidth=2;ctx.strokeRect(px+s*.18,py+s*.06,s*.64,s*.9);ctx.fillStyle="#c6a66a";ctx.fillRect(px+s*.66,py+s*.5,3,3);return;
  }
  if (t.structure === "districtWall") {
    const colors={city:["#37383c","#77757b"],arcology:["#20373d","#66939a"],cloister:["#3b3036","#8a6d75"],fortress:["#332f2b","#947c64"]}[t.districtStyle]||["#333","#777"],sides=t.wallSides||[];
    if(activeBuildingId===t.buildingId){const thick=s*.22;ctx.fillStyle=PAL[t.kind.replace('Wall','Floor')]?.[0]||"#41413f";ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle=colors[0];if(sides.includes("west"))ctx.fillRect(px,py,thick,s+1);if(sides.includes("east"))ctx.fillRect(px+s-thick,py,thick+1,s+1);if(sides.includes("north"))ctx.fillRect(px,py,s+1,thick);if(sides.includes("south"))ctx.fillRect(px,py+s-thick,s+1,thick+1);ctx.strokeStyle=colors[1]+"66";ctx.strokeRect(px+s*.04,py+s*.04,s*.92,s*.92);return}
    ctx.fillStyle=colors[0];ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle=colors[1]+"33";ctx.fillRect(px,py+s*.12,s+1,s*.12);ctx.fillRect(px,py+s*.58,s+1,s*.1);ctx.strokeStyle="#d5c6a22d";ctx.lineWidth=1;for(let q=.33;q<1;q+=.34){ctx.beginPath();ctx.moveTo(px,py+s*q);ctx.lineTo(px+s,py+s*q);ctx.stroke()}for(let q=.25;q<1;q+=.5){const off=((y+Math.round(q*4))&1)*s*.25;ctx.beginPath();ctx.moveTo(px+s*q-off,py);ctx.lineTo(px+s*q-off,py+s);ctx.stroke()}ctx.strokeStyle="#080a0acc";ctx.lineWidth=2;if(sides.includes("west")){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+s);ctx.stroke()}if(sides.includes("east")){ctx.beginPath();ctx.moveTo(px+s,py);ctx.lineTo(px+s,py+s);ctx.stroke()}if(sides.includes("north")){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+s,py);ctx.stroke()}if(sides.includes("south")){ctx.beginPath();ctx.moveTo(px,py+s);ctx.lineTo(px+s,py+s);ctx.stroke()}return;
  }
  if (t.structure === "shackWall") {
    ctx.fillStyle = PAL[t.kind]?.[d & 1] || PAL.floor[d & 1];
    ctx.fillRect(px, py, s + 1, s + 1);
    if (activeBuildingId === t.buildingId) {
      const thick = s * .22, sides = t.wallSides || [];
      ctx.fillStyle = "#39342e";
      if (sides.includes("west")) ctx.fillRect(px, py, thick, s + 1);
      if (sides.includes("east")) ctx.fillRect(px + s - thick, py, thick + 1, s + 1);
      if (sides.includes("north")) ctx.fillRect(px, py, s + 1, thick);
      if (sides.includes("south")) ctx.fillRect(px, py + s - thick, s + 1, thick + 1);
      ctx.strokeStyle = "#87776288";
      ctx.lineWidth = 1;
      if (sides.includes("west")) { ctx.beginPath(); ctx.moveTo(px + thick, py); ctx.lineTo(px + thick, py + s); ctx.stroke(); }
      if (sides.includes("east")) { ctx.beginPath(); ctx.moveTo(px + s - thick, py); ctx.lineTo(px + s - thick, py + s); ctx.stroke(); }
      if (sides.includes("north")) { ctx.beginPath(); ctx.moveTo(px, py + thick); ctx.lineTo(px + s, py + thick); ctx.stroke(); }
      if (sides.includes("south")) { ctx.beginPath(); ctx.moveTo(px, py + s - thick); ctx.lineTo(px + s, py + s - thick); ctx.stroke(); }
    }
    return;
  }
  if (t.blocked) {
    if (t.structure === "shack") {
      const same=(dx,dy)=>map[(y+dy)*w+x+dx]?.buildingId===t.buildingId;
      if(activeBuildingId===t.buildingId){const thick=s*.48;ctx.fillStyle="#3b403d";ctx.fillRect(px,py,s+1,s+1);ctx.fillStyle="#39342e";if(!same(-1,0))ctx.fillRect(px,py,thick,s+1);if(!same(1,0))ctx.fillRect(px+s-thick,py,thick+1,s+1);if(!same(0,-1))ctx.fillRect(px,py,s+1,thick);if(!same(0,1))ctx.fillRect(px,py+s-thick,s+1,thick+1);ctx.strokeStyle="#87776288";ctx.lineWidth=1;if(!same(-1,0)||!same(1,0)){ctx.beginPath();ctx.moveTo(px+s*.25,py);ctx.lineTo(px+s*.25,py+s);ctx.stroke()}if(!same(0,-1)||!same(0,1)){ctx.beginPath();ctx.moveTo(px,py+s*.25);ctx.lineTo(px+s,py+s*.25);ctx.stroke()}return}
      ctx.fillStyle="#39342e";ctx.fillRect(px,py,s+1,s+1);ctx.strokeStyle="#87776288";ctx.lineWidth=1;for(let q=.28;q<1;q+=.28){ctx.beginPath();ctx.moveTo(px,py+s*q);ctx.lineTo(px+s,py+s*q);ctx.stroke()}for(let q=.22;q<1;q+=.44){const off=(y&1)*s*.22;ctx.beginPath();ctx.moveTo(px+s*q-off,py);ctx.lineTo(px+s*q-off,py+s);ctx.stroke()}ctx.strokeStyle="#171512";ctx.lineWidth=2;if(!same(-1,0)){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+s);ctx.stroke()}if(!same(1,0)){ctx.beginPath();ctx.moveTo(px+s,py);ctx.lineTo(px+s,py+s);ctx.stroke()}if(!same(0,-1)){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+s,py);ctx.stroke()}if(!same(0,1)){ctx.beginPath();ctx.moveTo(px,py+s);ctx.lineTo(px+s,py+s);ctx.stroke()}return;
    }
    const up = y > 0 && map[(y - 1) * w + x]?.blocked,
      down = map[(y + 1) * w + x]?.blocked;
    ctx.fillStyle = p[1];
    ctx.fillRect(px + 2, py + (up ? 1 : 5), s - 4, s - (up ? 3 : 8));
    ctx.fillStyle = "#11100ed0";
    ctx.fillRect(px, py + s * 0.55, s, 2);
    ctx.fillRect(px + (d % 5) * s * 0.12, py + 4, 2, s * 0.42);
    if (!up) {
      ctx.fillStyle = "#9b947b33";
      ctx.fillRect(px + 4, py + 2, s - 9, 2);
      ctx.fillStyle = "#13120f";
      ctx.fillRect(px + (d % 7) + 3, py + 2, 3, 2);
    }
    if (!down) {
      ctx.fillStyle = "#05050599";
      ctx.fillRect(px + 2, py + s - 7, s - 4, 7);
    }
  } else {
    if(t.kind==="hollowFloor"){ctx.strokeStyle="#94a9aa28";ctx.beginPath();ctx.moveTo(px+s*.12,py+s*.74);ctx.lineTo(px+s*.48,py+s*.38);ctx.lineTo(px+s*.8,py+s*.5);ctx.stroke();if((d&3)===0){ctx.fillStyle="#0c111244";ctx.fillRect(px+s*.62,py+s*.18,s*.18,s*.18)}return}
    if(t.kind==="cisternFloor"){ctx.strokeStyle="#8ab8aa42";ctx.strokeRect(px+2,py+2,s-4,s-4);ctx.fillStyle="#18363255";ctx.beginPath();ctx.ellipse(px+s*(.35+(d&1)*.25),py+s*.62,s*.22,s*.09,0,0,7);ctx.fill();ctx.strokeStyle="#a1c8bd44";ctx.beginPath();ctx.arc(px+s*.55,py+s*.55,s*.18,.2,2.8);ctx.stroke();return}
    if(t.kind==="kilnFloor"){ctx.strokeStyle="#241411aa";ctx.lineWidth=2;ctx.strokeRect(px+2,py+2,s-4,s-4);ctx.fillStyle="#c26a3c55";for(const [qx,qy]of[[.18,.18],[.82,.18],[.18,.82],[.82,.82]]){ctx.beginPath();ctx.arc(px+s*qx,py+s*qy,2,0,7);ctx.fill()}ctx.strokeStyle="#dc7a4544";ctx.beginPath();ctx.moveTo(px+s*.1,py+s*.66);ctx.quadraticCurveTo(px+s*.5,py+s*.5,px+s*.9,py+s*.7);ctx.stroke();return}
    if(/DeepFloor$/.test(t.kind)){const family=t.kind.replace("DeepFloor","");ctx.strokeStyle={threefold:"#d4b08344",descent:"#8dc4d344",loop:"#c6a5dc44",flooded:"#9ad3c844",fortress:"#d0ae7544"}[family]||"#aab3b744";ctx.lineWidth=1;ctx.strokeRect(px+2,py+2,s-4,s-4);if(family==="threefold"){ctx.beginPath();ctx.moveTo(px+s*.5,py+5);ctx.lineTo(px+s*.78,py+s*.72);ctx.lineTo(px+s*.22,py+s*.72);ctx.closePath();ctx.stroke()}else if(family==="loop"){ctx.beginPath();ctx.arc(px+s*.5,py+s*.5,s*.22,0,6);ctx.stroke()}else if(family==="flooded"){ctx.beginPath();ctx.moveTo(px+4,py+s*.62);ctx.quadraticCurveTo(px+s*.5,py+s*.45,px+s-4,py+s*.62);ctx.stroke()}else if(family==="descent"){ctx.beginPath();ctx.moveTo(px+s*.2,py+s*.25);ctx.lineTo(px+s*.5,py+s*.75);ctx.lineTo(px+s*.8,py+s*.25);ctx.stroke()}else{ctx.fillStyle="#d6b77933";for(const[qx,qy]of[[.2,.2],[.8,.2],[.2,.8],[.8,.8]])ctx.fillRect(px+s*qx-1,py+s*qy-1,3,3)}return}
    ctx.fillStyle = "#d2c6aa12";
    ctx.fillRect(px + 3, py + 3, s - 7, 1);
    ctx.fillStyle = "#09090835";
    for (let i = 0; i < 2; i++)
      ctx.fillRect(
        px + 4 + ((d >> (i * 4)) % (s - 8)),
        py + 5 + ((d >> (i * 7)) % (s - 10)),
        2,
        2,
      );
    ctx.strokeStyle = "#17151266";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3 + (d % 8), py + s - 4);
    ctx.lineTo(px + s * 0.4, py + s * 0.55);
    ctx.lineTo(px + s - 5, py + 5 + (d % 7));
    ctx.stroke();
    if ((d & 7) === 0) {
      ctx.fillStyle = "#14120f88";
      ctx.fillRect(px, py + s - 3, 5 + (d % 9), 3);
    }
    if((d&15)===3){ctx.strokeStyle=t.kind==='ember'?'#c1744748':t.kind==='glass'?'#76b4ac42':'#93836a42';ctx.beginPath();ctx.arc(px+s*.62,py+s*.42,s*.13,0,Math.PI*1.5);ctx.stroke();ctx.fillStyle="#11130f88";ctx.fillRect(px+s*.58,py+s*.38,3,3)}
    if((d&31)===11){ctx.fillStyle="#c6a66a38";for(let q=0;q<3;q++)ctx.fillRect(px+6+q*5,py+s-8-(q%2)*3,2,2)}
  }
}
const COLORS = {
  player: ["#79877b", "#252b2a", "#b9925f"],
  ashling: ["#87503f", "#342727", "#b78a62"],
  glassMite: ["#607c79", "#283b3b", "#aab7aa"],
  sparkWarden: ["#6b6472", "#35313d", "#c09b58"],
  ashenHound: ["#765244", "#302724", "#c18a63"],
  veilMoth: ["#786887", "#302c39", "#b8a7cd"],
  rootBrute: ["#667052", "#303629", "#a99a67"],
  coilStalker: ["#47716d", "#263a39", "#87c0ad"],
  cinderWisp: ["#a95d3c", "#4b2923", "#efb15d"],
  voidSentinel: ["#645375", "#282333", "#b896cf"],
  hollowMarshal: ["#78434a", "#332429", "#b99b68"],
  riftColossus: ["#713841", "#2b2022", "#c18352"],
  mossGrazer: ["#667052", "#303629", "#a3b978"],
  lanternDoe: ["#8b7654", "#39332a", "#e8c66d"],
  hushling: ["#76698c", "#282431", "#cab7df"],
  gateRevenant: ["#311b34", "#100d15", "#e14f72"],
  latticeHunter: ["#3e7f88", "#142a32", "#d86ae8"],
  riftGrazer: ["#839b67", "#29372b", "#d7e58d"],
  archiveBehemoth: ["#6b3d78", "#1d1527", "#f0a052"],
  vesperwing:["#8b4b35","#251d1d","#ed8a45"],gravitantBell:["#54726e","#252b2a","#c0a66b"],mireApostle:["#71804d","#25291f","#b6d05c"],knifeChoir:["#675174","#211b29","#c28fe0"],
  npc: ["#9b815d", "#453832", "#879b8d"],
  villager: ["#a88d62", "#4d5a48", "#d9c9a0"],
  pilgrim: ["#b9ad92", "#6b5f4c", "#e7dcc0"],
  peddler: ["#9a6f45", "#5a3f2a", "#e0b35e"],
  mercenary: ["#6f6a62", "#3a3f46", "#b8a27a"],
  minstrel: ["#a35f6c", "#4a2f4f", "#e6c069"],
  scholar: ["#5f6f92", "#2f3550", "#c9cfe6"],
  traveler: ["#8c7d64", "#45403a", "#c7b48c"],
  cartographer: ["#7d8f6a", "#3b4a3a", "#f0d58a"],
  wandererCache: ["#7a5a3a", "#3a2a1c", "#e0c070"],
  militia: ["#8a7a5c", "#3f4a5a", "#c9b27a"],
  shipwright: ["#4f7f9a", "#3a2c22", "#d8c39a"],
  shrine: ["#557b74", "#263c3b", "#b7c1aa"],
  checkpoint: ["#668b91", "#304448", "#c7b887"],
  door: ["#76533b", "#382b25", "#9d805d"],
  tree: ["#65513b", "#353229", "#596344"],
  treeShrub: ["#536044", "#30372c", "#77855d"],
  treeSpindle: ["#675642", "#312c27", "#6d7653"],
  rock: ["#666a65", "#343735", "#90948b"],
  dungeon: ["#62576b", "#332d39", "#63817a"],
  chest: ["#8d6938", "#443326", "#b7a06a"],
  exit: ["#53796c", "#293a35", "#9aac99"],
  ruinMarker: ["#806b52", "#433a31", "#b09b79"],
  bossCue: ["#873f43", "#391f24", "#bd8257"],
  viewport: ["#3f7478", "#172b30", "#8de4df"],
  cache: ["#9a8549", "#4a4229", "#c1ae72"],
  deepAnchor: ["#4c7b78", "#243c3c", "#b7ddd1"],
  deepMechanism: ["#806b48", "#3b3328", "#e0bd70"],
  sealedGate: ["#743f4a", "#2d2026", "#e07886"],
  storyGhost: ["#72668d", "#272332", "#d8c7ef"],
  storyActor: ["#6e7f91", "#222a33", "#d9e7ef"],
  storyScene: ["#8d5d4f", "#32221e", "#efb18f"],
  deepShortcut: ["#596d62", "#202923", "#9fd0ae"],
  deepPortal: ["#535384", "#20203a", "#bbb4ef"],
  deepTransition: ["#675c49", "#28241d", "#dbc18a"],
  storyRelic: ["#8c7650", "#382f24", "#f0cf83"],
  storyTone: ["#557d82", "#26383b", "#9fe6dd"],
};
// Surface sea creatures (water world W3). Submerged: a ripple ring only. Telegraphs: a wake line (Lanceeel), a
// landing shadow (Breachfin), a tight coil ring (Ringcoil), jaws (Sinewake) and bubbles (Bog Lurker).
export function drawSeaCreature(ctx, e, s, now, colors, g) { // exported for the creature preview tests
  const cx = (e.x + .5) * s, cy = (e.y + .72) * s, t = e.seaTele;
  ctx.save();
  if (t?.type === "line") { ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = Math.max(2, s * .12); ctx.setLineDash([s * .3, s * .18]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + t.dx * t.len * s, cy + t.dy * t.len * s); ctx.stroke(); ctx.setLineDash([]); }
  if (t?.type === "shadow") { const k = t.big ? 2.4 : e.leviathan ? 1.8 : 1; ctx.fillStyle = "#0b1a2a88"; ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((t.x + .5) * s, (t.y + .72) * s, s * .6 * k, s * .3 * k, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  if (t?.type === "rings") for (const m of t.marks) { ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc((m.x + .5) * s, (m.y + .72) * s, s * (.5 + .1 * Math.sin(now / 90)), 0, 7); ctx.stroke(); }
  if (t?.type === "mark" || t?.type === "grip") { const p = g.player; ctx.strokeStyle = t.type === "grip" ? "#b48cffee" : "#ff8a6acc"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); if (t.type === "grip") { ctx.moveTo(cx, cy); ctx.quadraticCurveTo((cx + (p.x + .5) * s) / 2, cy - s, (p.x + .5) * s, (p.y + .72) * s); } else ctx.arc((p.x + .5) * s, (p.y + .72) * s, s * .7, 0, 7); ctx.stroke(); }
  if (t?.type === "coil" || t?.type === "jaw") { ctx.strokeStyle = "#ff8a6a99"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, s * .7, 0, 7); ctx.stroke(); }
  if (t?.type === "bubbles") for (let i = 0; i < 5; i++) { const f = (now / 500 + i * .2) % 1; ctx.fillStyle = `rgba(200,230,140,${1 - f})`; ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2.1) * s * .35, cy - f * s * .6, s * (.05 + f * .05), 0, 7); ctx.fill(); }
  if (e.kind === "angler") { const lx = cx + Math.sin(now / 600) * s * .1, ly = cy - s * .55, glow = .6 + .4 * Math.sin(now / 250); ctx.fillStyle = `rgba(255,242,160,${.25 * glow})`; ctx.beginPath(); ctx.arc(lx, ly, s * .35, 0, 7); ctx.fill(); ctx.fillStyle = "#fff2a0"; ctx.beginPath(); ctx.arc(lx, ly, s * .07, 0, 7); ctx.fill(); } // the lure shows even when it hides
  if (e.hidden) { // only a ripple betrays it
    const f = (now / 900 + (e.x + e.y) * .1) % 1; ctx.strokeStyle = `rgba(220,240,255,${.45 * (1 - f)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, s * (.2 + f * .4), s * (.08 + f * .15), 0, 0, 7); ctx.stroke(); ctx.restore(); return;
  }
  if (e.kind === "tentacle") { // a rising limb: a curling column with suckers; a pale ring before it slams
    if (t?.type === "slam") { ctx.strokeStyle = "#ff8a6acc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, s * .95, 0, 7); ctx.stroke(); }
    const sway = Math.sin(now / 240 + e.x) * s * .2; ctx.strokeStyle = e.hitFlash > 0 ? "#f3d2b0" : colors[0]; ctx.lineCap = "round"; ctx.lineWidth = s * .32;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + sway, cy - s * .8, cx - sway * .6, cy - s * 1.5); ctx.stroke();
    ctx.fillStyle = colors[2]; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + sway * i / 4, cy - s * .38 * i, s * .05, 0, 7); ctx.fill(); }
    ctx.restore(); return;
  }
  if (e.leviathan && /Kraken|kraken/.test(e.kind)) { // a kraken body: mantle and resting arms around it
    const k = e.scale || 2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.sin(now / 700 + i) * .2; ctx.strokeStyle = colors[1]; ctx.lineWidth = s * .16; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a) * s * k * .5, cy + Math.sin(a) * s * k * .3, cx + Math.cos(a + .4) * s * k * .75, cy + Math.sin(a + .4) * s * k * .45); ctx.stroke(); }
    ctx.fillStyle = e.hitFlash > 0 ? "#f3d2b0" : colors[0]; ctx.strokeStyle = colors[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy - s * .35 * k, s * .42 * k, s * .5 * k, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors[2]; for (const q of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + q * s * .16 * k, cy - s * .25 * k, s * .07 * k, 0, 7); ctx.fill(); }
    ctx.restore(); return;
  }
  if ((e.seaKind || e.kind) === "tyrantMosasaur") { drawMosasaur(ctx, e, cx, cy, s, now, colors); ctx.restore(); return; } // release 229
  const lift = (e.leapHeight || 0) * s, f = e.ai?.facing || "down", [fx, fy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[f], n = e.segments || 1;
  if (lift) { ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(cx, cy, s * .4, s * .14, 0, 0, 7); ctx.fill(); }
  for (let i = n - 1; i >= 0; i--) { // trailing body, head last
    const sz = e.scale || 1, wave = Math.sin(now / 160 + i * .9) * s * .12 * sz, bx = cx - fx * s * .32 * sz * i - fy * wave, by = cy - lift - fy * s * .32 * sz * i + fx * wave, r = s * sz * (i ? Math.max(.08, .2 - i * .012) : .27);
    ctx.fillStyle = e.hitFlash > 0 ? "#f3d2b0" : colors[i % 2 ? 1 : 0]; ctx.strokeStyle = colors[2]; ctx.lineWidth = Math.max(1, s * .03);
    ctx.beginPath(); ctx.ellipse(bx, by, Math.max(2, r), Math.max(2, r * .72), Math.atan2(fy, fx), 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.arc(cx + fx * s * .14 - fy * s * .08, cy - lift + fy * s * .14 + fx * s * .08 - s * .04, Math.max(1.5, s * .05), 0, 7); ctx.fill(); // eye
  if (e.kind === "breachfin") { ctx.fillStyle = colors[1]; ctx.beginPath(); ctx.moveTo(cx - s * .1, cy - lift - s * .15); ctx.lineTo(cx, cy - lift - s * .5); ctx.lineTo(cx + s * .12, cy - lift - s * .15); ctx.fill(); }
  ctx.restore();
}

// Release 229 (Tim): the Tyrant Mosasaur, seen from above as it swims. Its body is semi-segmented: a spine of joints
// laid along the path its head has swum (kept per creature in MOSASAUR_TRAILS, never saved), so it bends through its
// turns; and a whale-like kick runs down it, lifting and dropping the tail more toward its end (raised parts draw
// higher and a little larger; the fluke dips under the surface and fades on the downstroke). Over that spine: a long
// pointed snout whose toothed jaws gape as it locks on and lunges, a heavy banded barrel body with pale flanks, four
// paddle flippers rowing in turn and a downturned, shark-like fluke.
const MOSASAUR_TRAILS = new WeakMap();
const MOSASAUR_KICK = .14; // how high the tail's end rises and falls, as a share of the body's length
const MOSASAUR_WIDTH = [[0, .012], [.06, .035], [.16, .07], [.22, .095], [.32, .145], [.42, .14], [.52, .11], [.64, .07], [.78, .04], [.92, .02], [1, .014]]; // half-widths along the body, as a share of its length
const mosaWidth = (u) => { for (let i = 1; i < MOSASAUR_WIDTH.length; i++) { const [a, wa] = MOSASAUR_WIDTH[i - 1], [b, wb] = MOSASAUR_WIDTH[i]; if (u <= b) return wa + (wb - wa) * (u - a) / (b - a); } return .012; };
function mosasaurSpine(e, lenTiles, n) {
  const dir = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[e.ai?.facing || "down"] || [0, 1];
  let trail = MOSASAUR_TRAILS.get(e);
  if (!trail) { trail = [[e.x, e.y]]; MOSASAUR_TRAILS.set(e, trail); }
  const [hx, hy] = trail[0], moved = Math.hypot(e.x - hx, e.y - hy);
  if (moved > 2.5) trail.splice(0, trail.length, [e.x, e.y]); // a jump (a reload, a long lunge step): start over
  else if (moved > .05) trail.unshift([e.x, e.y]);
  // Keep just enough path for the body; past its end, the body runs straight back from the last point.
  let acc = 0; for (let i = 1; i < trail.length; i++) { acc += Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]); if (acc > lenTiles + 1) { trail.length = i + 1; break; } }
  const out = []; let seg = 0, along = 0;
  for (let k = 0; k <= n; k++) {
    const want = k / n * lenTiles;
    while (seg < trail.length - 1) { const [ax, ay] = trail[seg], [bx, by] = trail[seg + 1], d = Math.hypot(bx - ax, by - ay); if (along + d >= want) { const f = d ? (want - along) / d : 0; out.push([ax + (bx - ax) * f, ay + (by - ay) * f]); break; } along += d; seg++; }
    if (out.length === k) { const [lx, ly] = trail[trail.length - 1], back = want - along, [px, py] = trail.length > 1 ? trail[trail.length - 2] : [lx + dir[0], ly + dir[1]], dl = Math.hypot(px - lx, py - ly) || 1; out.push([lx - (px - lx) / dl * back, ly - (py - ly) / dl * back]); }
  }
  return out;
}
function drawMosasaur(ctx, e, cx, cy, s, now, colors) {
  const L = s * (e.scale || 3) * 1.15, T = now / 1000, n = 14, phase = e.sea?.phase, striking = phase === "strike";
  const gape = striking ? .55 : phase === "telegraph" ? .32 + .08 * Math.sin(now / 70) : .05 + .03 * Math.sin(T * 1.3);
  const flash = e.hitFlash > 0, back = flash ? "#f3d2b0" : colors[1], hide = flash ? "#f8e0c0" : colors[0], belly = colors[2];
  const ox = cx - (e.x + .5) * s, oy = cy - (e.y + .72) * s; // tile → screen offset, so the spine sits where the creature is drawn
  const spine = mosasaurSpine(e, L / s, n).map(([x, y]) => [(x + .5) * s + ox, (y + .72) * s + oy]);
  // The kick: height above the water (px) at each joint, growing toward the tail; a small side sway as well.
  const rate = striking ? 9 : 3.4, P = spine.map(([x, y], i) => {
    const u = i / n, z = Math.sin(T * rate - u * 3.6) * L * MOSASAUR_KICK * Math.pow(u, 1.5), a = spine[Math.max(0, i - 1)], b = spine[Math.min(n, i + 1)], tx = a[0] - b[0], ty = a[1] - b[1], tl = Math.hypot(tx, ty) || 1;
    const side = Math.sin(T * rate * .5 - u * 3) * L * .015 * u; return { x: x - ty / tl * side, y: y + tx / tl * side - z, z, ux: tx / tl, uy: ty / tl, u };
  });
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
  // Its shadow on the water, where the body would be without the kick.
  ctx.fillStyle = "#00000038"; for (let i = 2; i < n; i += 2) { const [x, y] = spine[i]; ctx.beginPath(); ctx.ellipse(x, y + L * .03, L * mosaWidth(i / n) * 1.1, L * mosaWidth(i / n) * .5, 0, 0, 7); ctx.fill(); }
  const nrm = (p) => [-p.uy, p.ux], at = (u) => { const f = u * n, i = Math.min(n - 1, Math.floor(f)), k = f - i, A = P[i], B = P[i + 1]; return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, z: A.z + (B.z - A.z) * k, ux: A.ux, uy: A.uy }; };
  const flipper = (u, side, len, wid, off) => { const p = at(u), [nx, ny] = nrm(p), row = Math.sin(T * 3.2 + off) * .35, w = L * mosaWidth(u), base = Math.atan2(ny * side, nx * side) + Math.atan2(-p.uy, -p.ux) * 0;
    ctx.save(); ctx.translate(p.x + nx * side * w * .8, p.y + ny * side * w * .8); ctx.rotate(Math.atan2(ny * side, nx * side) + side * (.9 - row) * (p.ux * ny - p.uy * nx > 0 ? 1 : -1)); ctx.fillStyle = back; ctx.beginPath(); ctx.ellipse(len * .5, 0, len * .55, wid, 0, 0, 7); ctx.fill(); ctx.strokeStyle = belly + "66"; ctx.lineWidth = Math.max(1, L * .006); ctx.beginPath(); ctx.moveTo(len * .1, wid * .3); ctx.quadraticCurveTo(len * .6, wid * .7, len * 1.02, 0); ctx.stroke(); ctx.restore(); };
  // The fluke, at the tail's end: larger as the tail rises, fading under the surface as it falls.
  { const t = P[n], q = P[n - 1], a = Math.atan2(t.y - q.y, t.x - q.x), up = t.z / (L * MOSASAUR_KICK), sc = 1 + up * .35;
    ctx.save(); ctx.globalAlpha = Math.max(.25, Math.min(1, .7 + up * .5)); ctx.translate(t.x, t.y); ctx.rotate(a); ctx.scale(sc, sc); ctx.fillStyle = back; ctx.beginPath(); ctx.moveTo(-L * .02, 0); ctx.quadraticCurveTo(L * .03, -L * .05, L * .02, -L * .1); ctx.quadraticCurveTo(L * .07, -L * .03, L * .05, 0); ctx.quadraticCurveTo(L * .09, L * .05, L * .06, L * .15); ctx.quadraticCurveTo(L * .03, L * .05, -L * .02, 0); ctx.fill(); ctx.restore(); }
  for (const side of [-1, 1]) flipper(.52, side, L * .15, L * .04, side > 0 ? 1.6 : 0); // rear flippers
  // The body from just behind the head to the tail: one outline through the joints, raised parts a little wider.
  const edge = (i, side) => { const p = P[i], [nx, ny] = nrm(p), w = L * mosaWidth(p.u) * (1 + p.z / L * 1.5); return [p.x + nx * w * side, p.y + ny * w * side]; };
  const body = new Path2D(), from = 3; body.moveTo(...edge(from, 1)); for (let i = from + 1; i <= n; i++) body.lineTo(...edge(i, 1)); for (let i = n; i >= from; i--) body.lineTo(...edge(i, -1)); body.closePath();
  ctx.fillStyle = belly; ctx.fill(body);
  ctx.save(); ctx.clip(body); ctx.lineWidth = L * .12; ctx.strokeStyle = hide; ctx.beginPath(); for (let i = from; i <= n; i++) i === from ? ctx.moveTo(P[i].x, P[i].y) : ctx.lineTo(P[i].x, P[i].y); ctx.stroke();
  ctx.lineWidth = L * .055; ctx.strokeStyle = back; ctx.stroke(); // the dark back down the middle, flanks paler
  ctx.strokeStyle = "#0000004a"; ctx.lineWidth = L * .022; for (let u = .28; u <= .62; u += .068) { const p = at(u), [nx, ny] = nrm(p), w = L * mosaWidth(u); ctx.beginPath(); ctx.moveTo(p.x + nx * w, p.y + ny * w); ctx.quadraticCurveTo(p.x - p.ux * L * .02, p.y - p.uy * L * .02, p.x - nx * w, p.y - ny * w); ctx.stroke(); } // bands across the back
  ctx.restore();
  ctx.strokeStyle = belly + "77"; ctx.lineWidth = Math.max(1, L * .005); ctx.stroke(body);
  for (const side of [-1, 1]) flipper(.3, side, L * .19, L * .05, side > 0 ? 0 : 1.6); // front flippers, larger
  // The head at the front joint: a heavy skull, and jaws that part from a hinge behind the eyes.
  const h = at(.2), hx = h.x, hy = h.y, ha = Math.atan2(P[0].y - h.y, P[0].x - h.x);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha);
  const jaw = (sign) => { ctx.save(); ctx.rotate(sign * gape * .5); ctx.fillStyle = sign < 0 ? hide : mixHex(hide, belly, .35); ctx.beginPath(); ctx.moveTo(0, sign * L * .075); ctx.quadraticCurveTo(L * .13, sign * L * .07, L * .27, sign * L * .008); ctx.lineTo(L * .27, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4ecd2"; for (let k = 1; k < 9; k++) { const x = k / 9 * L * .25; ctx.beginPath(); ctx.moveTo(x - L * .007, 0); ctx.lineTo(x, -sign * L * .02); ctx.lineTo(x + L * .007, 0); ctx.fill(); } ctx.restore(); };
  if (gape > .08) { ctx.fillStyle = "#5a1414"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-gape * .5) * L * .26, Math.sin(-gape * .5) * L * .26); ctx.lineTo(Math.cos(gape * .5) * L * .26, Math.sin(gape * .5) * L * .26); ctx.closePath(); ctx.fill(); }
  jaw(1); jaw(-1);
  ctx.fillStyle = back; ctx.beginPath(); ctx.ellipse(-L * .01, 0, L * .075, L * .08, 0, 0, 7); ctx.fill();
  for (const side of [-1, 1]) { ctx.fillStyle = "#f2c84a"; ctx.beginPath(); ctx.ellipse(L * .03, side * L * .05, L * .016, L * .011, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#120c06"; ctx.beginPath(); ctx.ellipse(L * .033, side * L * .05, L * .004, L * .009, 0, 0, 7); ctx.fill(); }
  ctx.restore(); ctx.restore();
}
const mixHex = (a, b, k) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`; };

// The skiff (water world W2): a plank hull with a bow pointing along `facing`, bobbing on the water.
function drawSkiff(ctx, x, y, s, facing, now) {
  const cx = (x + .5) * s, cy = (y + .72) * s + Math.sin(now / 420 + x) * s * .03, along = facing === "left" || facing === "right";
  ctx.save(); ctx.translate(cx, cy); if (!along) ctx.rotate(Math.PI / 2); if (facing === "left" || facing === "up") ctx.scale(-1, 1);
  ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(0, s * .08, s * .62, s * .2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#6b4a2e"; ctx.beginPath(); ctx.moveTo(-s * .55, -s * .16); ctx.lineTo(s * .38, -s * .16); ctx.quadraticCurveTo(s * .66, 0, s * .38, s * .16); ctx.lineTo(-s * .55, s * .16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c9a571"; ctx.lineWidth = Math.max(1, s * .04); ctx.stroke();
  ctx.fillStyle = "#8d6a43"; for (const k of [-.3, .05]) ctx.fillRect(k * s, -s * .13, s * .07, s * .26);
  ctx.restore();
}
// Release 269 (Tim: "it can turn into... a Viking longboat with a sail and a mast... the head of the Viking boat...
// something interesting, something cosmic, something understated... [for] the Wanderer's position in this whole cosmic
// nightmare"; then "show it in a profile in like an isometric view... we can see... the sides of a hull that are
// somewhat submerged in the water as it rides along the water"): while the hull guard holds, the skiff is a clinker-
// built longboat seen three-quarters on: a foreshortened deck, the near side of the hull with its strakes and a row of
// round shields, the lower hull under a foaming waterline, a stem post curling up into a spiral from which a
// lantern hangs, a little spiral galaxy behind its glass, a lower stern curl, and an upright mast with a striped square sail. It always shows its
// side: heading up or down it keeps its last side-on bearing.
// Release 311/315: the submersible is a small robot (Tim, release 315: "the submersible should kind of look like a robot...
// with a big large viewpoint... some very short legs... 2 robotic arms that extend from it... some boosters on the back...
// a little bit larger than the player"). part "back" draws the boosters, shell and the viewport's frame behind the
// Wayfarer; "front" draws the glass over them, the lower body (hiding their legs), the short legs and the arms. At sea
// (`water`) everything below the waterline is drowned in blue; diving, only an arm breaks the surface, with bubbles.
// Release 321: the drone. A round silver body with a blue eye toward its facing, two rotor arms with spinning discs, a
// rocket pod underneath; carrying, two claws reach down to the Wayfarer's shoulders. `heal` (0..1) glows it green.
function drawDrone(ctx, x, y, s, facing, now, carrying = false, heal = 0) {
  const cx = (x + .5) * s, cy = (y + .45) * s + Math.sin(now / 260) * s * .04, u = s * .34, dir = facing === "left" ? -1 : 1, spin = now / 40;
  ctx.save();
  if (carrying) { ctx.strokeStyle = "#6f7880"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.lineCap = "round"; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + side * u * .5, cy + u * .55); ctx.lineTo(cx + side * u * .95, cy + u * 1.6); ctx.lineTo(cx + side * u * .7, cy + u * 2.05); ctx.stroke(); } }
  ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(cx, cy + s * (carrying ? 1.75 : 1.05), u * 1.1, u * .3, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#4b525a"; ctx.lineWidth = Math.max(1.5, s * .06); ctx.beginPath(); ctx.moveTo(cx - u * 1.55, cy - u * .35); ctx.lineTo(cx + u * 1.55, cy - u * .35); ctx.stroke();
  for (const side of [-1, 1]) { const rx = cx + side * u * 1.55, ry = cy - u * .55; ctx.fillStyle = "#3a4048"; ctx.fillRect(rx - u * .12, ry, u * .24, u * .3); ctx.fillStyle = "#d8e6ee88"; ctx.beginPath(); ctx.ellipse(rx, ry, u * .8, u * .2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#ffffffdd"; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.moveTo(rx - Math.cos(spin + side) * u * .75, ry - Math.sin(spin + side) * u * .14); ctx.lineTo(rx + Math.cos(spin + side) * u * .75, ry + Math.sin(spin + side) * u * .14); ctx.stroke(); }
  ctx.fillStyle = "#5d656e"; ctx.fillRect(cx - u * .45, cy + u * .45, u * .9, u * .32); ctx.fillStyle = "#e0623c"; for (const k of [-.25, 0, .25]) { ctx.beginPath(); ctx.arc(cx + k * u, cy + u * .78, u * .09, 0, 7); ctx.fill(); }
  const body = ctx.createRadialGradient(cx - u * .3, cy - u * .35, u * .1, cx, cy, u); body.addColorStop(0, "#f4f7fa"); body.addColorStop(.6, "#b9c2ca"); body.addColorStop(1, "#6d767f");
  ctx.fillStyle = body; ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, s * .035); ctx.beginPath(); ctx.ellipse(cx, cy, u, u * .78, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#14202a"; ctx.beginPath(); ctx.ellipse(cx + dir * u * .38, cy, u * .36, u * .3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#5fd6f0"; ctx.beginPath(); ctx.arc(cx + dir * u * .45, cy, u * .15, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx + dir * u * .5, cy - u * .06, u * .05, 0, 7); ctx.fill();
  if (heal > 0) { ctx.globalAlpha = Math.min(1, heal) * .7; ctx.strokeStyle = "#7dff9a"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); ctx.ellipse(cx, cy, u * 1.35, u * 1.1, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}
// The empowered robot (release 389; redrawn in release 391, Tim: "less... more understated... more like a spacesuit...
// almost like a Black Panther suit, but still spacey, like Iron Man or War Machine... it looks too much like a Gundam or
// Ultraman Tiga... we don't want to depart from the overall gritty, down-to-earth feel"). Drawn in place of the Wayfarer, at
// their size: a dark graphite pressure suit, segmented and scuffed, with low plates at chest, shoulders, knees and forearms,
// a smooth helmet with one smoked visor band, a compact life-support pack with hoses to the chest, a dim amber status
// light (violet in releases 393 to 473, amber in 475, the Wayfarer's eye colour from 477), and small, cold thrusters at the back and heels that only show while it boosts.
export function drawPowerSuit(ctx, x, y, s, facing, now, frame = 0, attacking = false, boosting = false) {
  const t = now / 1000, k = x * s + s / 2, base = y * s + s * .84, u = s * .9, side = facing === "left" || facing === "right", back = facing === "up", dir = facing === "left" ? -1 : 1;
  const plate = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#5d636b"); g.addColorStop(.4, "#363a41"); g.addColorStop(1, "#1a1c20"); return g; };
  const suit = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#2c3036"); g.addColorStop(1, "#121418"); return g; };
  const edge = "#0a0b0d", worn = "#8a8f96", amber = COLORS.player[2], lw = Math.max(1, u * .016); // release 393 made it violet; 475 amber; 477 the Wayfarer's eye colour
  // Release 393 (Tim: "the same purple cosmic world as the lantern, rather than that golden... emblem... all the gold [should]
  // be that same color"): a small orb of night glass with a two-armed spiral of light and a bright core. Release 475 (Tim:
  // "the sigil on his armor should be yellow, not purple... the same sigil, but the golden or amber... the same as his eyes"):
  // the same sigil, in amber.
  // Release 477 (Tim: "take out the penumbra or the glow around it... just have the sigil... the color that his eyes are, and
  // that's it"): no halo, no glass orb, no motes; only the two-armed spiral and its core, in the Wayfarer's eye colour.
  const cosmos = (cx, cy, r) => { const eye = COLORS.player[2]; ctx.strokeStyle = eye; ctx.lineWidth = Math.max(.6, r * .18); ctx.lineCap = "round"; const spin = t * .5;
    for (const arm of [0, Math.PI]) { ctx.beginPath(); for (let q = 0; q <= 1.0001; q += .1) { const a = arm + spin + q * 4.2, rr = r * (.08 + q * .8); ctx[q ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .85); } ctx.stroke(); }
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(cx, cy, Math.max(.7, r * .2), 0, Math.PI * 2); ctx.fill(); ctx.lineCap = "butt"; };
  const poly = (pts, fill, stroke = edge) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](px, py)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); };
  const seg = (x0, y0, x1, y1, w0, w1, fill) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a); poly([[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]], fill || suit(x0 - w0, y0, x1 + w1, y1)); };
  const glowAt = (gx, gy, r, c, a) => { const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, "0")); g.addColorStop(1, c + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); };
  const scuff = (x0, y0, x1, y1) => { ctx.strokeStyle = worn + "66"; ctx.lineWidth = Math.max(.6, u * .006); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  const jet = (jx, jy, len) => { const g = ctx.createLinearGradient(jx, jy, jx, jy + len); g.addColorStop(0, "#e8f6ff"); g.addColorStop(.35, "#7fb9d8aa"); g.addColorStop(1, "#4a7fa000"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(jx - u * .025, jy); ctx.lineTo(jx + u * .025, jy); ctx.lineTo(jx, jy + len); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.translate(k, base); if (side) ctx.scale(dir, 1);
  ctx.fillStyle = "rgba(4,6,10,.45)"; ctx.beginPath(); ctx.ellipse(0, 0, u * .26, u * .07, 0, 0, Math.PI * 2); ctx.fill();
  const walk = frame ? Math.sin(t * 9) : 0, bob = Math.abs(walk) * u * .012; ctx.translate(0, -bob);
  if (boosting) { const fl = u * (.22 + .06 * Math.sin(t * 38)); for (const jx of side ? [-u * .17] : [-u * .09, u * .09]) jet(jx, -u * .5, fl); for (const jx of side ? [0] : [-u * .07, u * .07]) jet(jx, 0, fl * .7); }
  if (side) {
    const st = walk * u * .09;
    for (const [o, a] of [[-1, .65], [1, 1]]) { const fx = o * st; ctx.globalAlpha = a; seg(0, -u * .38, fx * .5 + u * .01, -u * .2, u * .05, u * .045); seg(fx * .5 + u * .01, -u * .2, fx, -u * .03, u * .042, u * .04); poly([[fx - u * .05, -u * .045], [fx + u * .08, -u * .03], [fx + u * .085, 0], [fx - u * .055, 0]], plate(fx - u * .05, -u * .05, fx + u * .08, 0)); poly([[fx * .5 - u * .025, -u * .25], [fx * .5 + u * .055, -u * .24], [fx * .5 + u * .05, -u * .17], [fx * .5 - u * .02, -u * .17]], plate(0, -u * .25, u * .05, -u * .17)); ctx.globalAlpha = 1; } // legs, knee plates, boots
    poly([[-u * .2, -u * .73], [-u * .09, -u * .75], [-u * .08, -u * .48], [-u * .19, -u * .46]], plate(-u * .2, -u * .75, -u * .08, -u * .46)); // the life-support pack
    ctx.strokeStyle = "#202328"; ctx.lineWidth = Math.max(1.5, u * .022); ctx.beginPath(); ctx.moveTo(-u * .1, -u * .52); ctx.quadraticCurveTo(-u * .02, -u * .5, u * .06, -u * .6); ctx.stroke(); // a hose round to the chest
    poly([[-u * .085, -u * .4], [u * .065, -u * .4], [u * .085, -u * .55], [u * .075, -u * .74], [-u * .09, -u * .75], [-u * .095, -u * .55]], suit(-u * .1, -u * .75, u * .09, -u * .4)); // torso
    poly([[-u * .02, -u * .72], [u * .075, -u * .71], [u * .085, -u * .56], [u * .0, -u * .55]], plate(0, -u * .72, u * .09, -u * .55)); // chest plate
    ctx.fillStyle = "#24272c"; ctx.fillRect(-u * .09, -u * .44, u * .17, u * .035); // belt
    cosmos(u * .062, -u * .645, u * .028);
    const ex = attacking ? u * .1 : u * .015, ey = attacking ? -u * .62 : -u * .56, hx = attacking ? u * .21 : u * .035, hy = attacking ? -u * .62 : -u * .43;
    seg(0, -u * .71, ex, ey, u * .035, u * .03); seg(ex, ey, hx, hy, u * .036, u * .032, plate(ex, ey, hx, hy)); ctx.fillStyle = "#16181b"; ctx.beginPath(); ctx.arc(hx, hy, u * .028, 0, Math.PI * 2); ctx.fill(); // arm, forearm plate, glove
    poly([[-u * .075, -u * .78], [u * .035, -u * .79], [u * .045, -u * .7], [-u * .07, -u * .69]], plate(-u * .07, -u * .79, u * .04, -u * .69)); // shoulder plate
    // Helmet: a smooth dome, the visor band wrapping forward, a small side module.
    ctx.fillStyle = plate(-u * .1, -u * .98, u * .1, -u * .78); ctx.beginPath(); ctx.ellipse(-u * .005, -u * .875, u * .095, u * .1, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke();
    const vg = ctx.createLinearGradient(0, -u * .92, 0, -u * .84); vg.addColorStop(0, "#3c5560"); vg.addColorStop(.5, "#0c1216"); vg.addColorStop(1, "#1b2a30"); ctx.fillStyle = vg; ctx.beginPath(); ctx.moveTo(u * .0, -u * .915); ctx.quadraticCurveTo(u * .095, -u * .915, u * .093, -u * .865); ctx.quadraticCurveTo(u * .09, -u * .835, u * .0, -u * .84); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#9cc6d455"; ctx.lineWidth = Math.max(.6, u * .007); ctx.beginPath(); ctx.moveTo(u * .02, -u * .905); ctx.lineTo(u * .07, -u * .9); ctx.stroke();
    poly([[-u * .07, -u * .9], [-u * .035, -u * .9], [-u * .035, -u * .85], [-u * .07, -u * .85]], plate(-u * .07, -u * .9, -u * .03, -u * .85)); scuff(u * .02, -u * .7, u * .05, -u * .66);
  } else {
    for (const sx of [-1, 1]) { const lx = sx * u * .07, lo = (frame ? Math.sin(t * 9 + (sx > 0 ? Math.PI : 0)) : 0) * u * .018;
      seg(lx, -u * .38, lx + sx * u * .005, -u * .2 + lo, u * .055, u * .046); seg(lx + sx * u * .005, -u * .2 + lo, lx, -u * .035 + lo, u * .045, u * .04);
      poly([[lx - u * .045, -u * .25 + lo], [lx + u * .045, -u * .25 + lo], [lx + u * .04, -u * .17 + lo], [lx - u * .04, -u * .17 + lo]], plate(lx - u * .05, -u * .26, lx + u * .05, -u * .17)); // knee plates
      poly([[lx - u * .055, -u * .05 + lo], [lx + u * .055, -u * .05 + lo], [lx + u * .06, lo], [lx - u * .06, lo]], plate(lx - u * .06, -u * .05, lx + u * .06, 0)); } // boots
    poly([[-u * .11, -u * .4], [u * .11, -u * .4], [u * .145, -u * .62], [u * .13, -u * .75], [-u * .13, -u * .75], [-u * .145, -u * .62]], suit(-u * .15, -u * .76, u * .15, -u * .4)); // the torso, a dark pressure suit
    ctx.strokeStyle = "#0e1013"; ctx.lineWidth = Math.max(.8, u * .01); for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(-u * .1, -u * (.46 + r * .025)); ctx.lineTo(u * .1, -u * (.46 + r * .025)); ctx.stroke(); } // ribbed waist
    ctx.fillStyle = "#24272c"; ctx.fillRect(-u * .12, -u * .43, u * .24, u * .035); for (const sx of [-1, 1]) { ctx.fillStyle = "#2e3238"; ctx.fillRect(sx * u * .07 - u * .025, -u * .43, u * .05, u * .045); } // belt and pouches
    if (back) { poly([[-u * .1, -u * .74], [u * .1, -u * .74], [u * .095, -u * .48], [-u * .095, -u * .48]], plate(-u * .1, -u * .74, u * .1, -u * .48)); for (const sx of [-1, 1]) { ctx.fillStyle = "#121418"; ctx.beginPath(); ctx.ellipse(sx * u * .055, -u * .5, u * .025, u * .014, 0, 0, Math.PI * 2); ctx.fill(); } ctx.strokeStyle = "#0e1013"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-u * .08, -u * .66); ctx.lineTo(u * .08, -u * .66); ctx.stroke(); glowAt(u * .06, -u * .7, u * .025, amber, .5); } // the life-support pack
    else { poly([[-u * .1, -u * .73], [u * .1, -u * .73], [u * .11, -u * .6], [u * .05, -u * .55], [-u * .05, -u * .55], [-u * .11, -u * .6]], plate(-u * .1, -u * .74, u * .1, -u * .55)); // the chest plate
      for (const sx of [-1, 1]) { ctx.strokeStyle = "#1c1f23"; ctx.lineWidth = Math.max(1.5, u * .02); ctx.beginPath(); ctx.moveTo(sx * u * .12, -u * .7); ctx.quadraticCurveTo(sx * u * .15, -u * .6, sx * u * .08, -u * .56); ctx.stroke(); } // hoses from the pack
      cosmos(0, -u * .64, u * .042); // the lantern's cosmos at the heart of the chest plate
      scuff(-u * .08, -u * .7, -u * .04, -u * .66); scuff(u * .03, -u * .6, u * .07, -u * .63); }
    for (const sx of [-1, 1]) { const ax = sx * u * .165, raise = attacking && sx > 0 ? -u * .08 : 0;
      seg(ax, -u * .7, ax + sx * u * .012, -u * .53 + raise, u * .036, u * .032); seg(ax + sx * u * .012, -u * .53 + raise, ax + sx * u * .018, -u * .39 + raise, u * .036, u * .032, plate(ax - u * .04, -u * .53, ax + u * .04, -u * .39)); // arm, forearm plate
      ctx.fillStyle = "#16181b"; ctx.beginPath(); ctx.arc(ax + sx * u * .018, -u * .37 + raise, u * .028, 0, Math.PI * 2); ctx.fill(); // glove
      poly([[sx * u * .1, -u * .775], [sx * u * .21, -u * .76], [sx * u * .215, -u * .68], [sx * u * .14, -u * .67]], plate(sx * u * .1, -u * .78, sx * u * .22, -u * .67)); } // shoulder plates
    // Helmet: a smooth dome, one smoked visor band, a small side module and its stub antenna.
    ctx.fillStyle = plate(-u * .1, -u * .98, u * .1, -u * .78); ctx.beginPath(); ctx.ellipse(0, -u * .875, u * .095, u * .1, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke();
    ctx.fillStyle = "#1a1c20"; ctx.fillRect(-u * .05, -u * .79, u * .1, u * .025); // neck seal
    if (!back) { const vg = ctx.createLinearGradient(0, -u * .92, 0, -u * .835); vg.addColorStop(0, "#3c5560"); vg.addColorStop(.45, "#0c1216"); vg.addColorStop(1, "#1b2a30"); ctx.fillStyle = vg; ctx.beginPath(); ctx.moveTo(-u * .082, -u * .9); ctx.quadraticCurveTo(0, -u * .925, u * .082, -u * .9); ctx.quadraticCurveTo(u * .085, -u * .855, u * .06, -u * .838); ctx.quadraticCurveTo(0, -u * .83, -u * .06, -u * .838); ctx.quadraticCurveTo(-u * .085, -u * .855, -u * .082, -u * .9); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#9cc6d455"; ctx.lineWidth = Math.max(.6, u * .007); ctx.beginPath(); ctx.moveTo(-u * .055, -u * .898); ctx.quadraticCurveTo(-u * .02, -u * .91, u * .01, -u * .905); ctx.stroke(); }
    poly([[u * .088, -u * .9], [u * .112, -u * .9], [u * .112, -u * .85], [u * .088, -u * .85]], plate(u * .088, -u * .9, u * .112, -u * .85)); ctx.strokeStyle = "#2a2d32"; ctx.lineWidth = Math.max(.8, u * .008); ctx.beginPath(); ctx.moveTo(u * .1, -u * .9); ctx.lineTo(u * .1, -u * .97); ctx.stroke();
  }
  ctx.restore();
}
function drawSubmersible(ctx, x, y, s, facing, now, part = "back", diving = 0, water = true, boosting = false) {
  const cx = (x + .5) * s, base = (y + .98) * s + (water ? Math.sin(now / 420 + x) * s * .03 : 0), dir = facing === "left" ? -1 : 1, t = now / 1000, u = s * 1.2;
  const metal = (y0, y1) => { const g = ctx.createLinearGradient(-u * .5, y0, u * .5, y1); g.addColorStop(0, "#f2f5f8"); g.addColorStop(.5, "#b9c1ca"); g.addColorStop(1, "#6f7883"); return g; };
  ctx.save(); ctx.translate(cx, base); ctx.scale(dir, 1);
  const waterline = -u * .3;
  if (diving > 0) {
    if (part === "back") {
      ctx.globalAlpha = .5; ctx.fillStyle = "#0b2a3a"; ctx.beginPath(); ctx.ellipse(0, -u * .2, u * .42, u * .22, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#d8f2ff99"; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i * .21) % 1; ctx.beginPath(); ctx.arc(u * (.2 - i * .1), -u * (.3 + k * .4), u * (.025 + k * .03), 0, 7); ctx.stroke(); }
      ctx.strokeStyle = "#c9cfd6"; ctx.lineWidth = u * .07; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(u * .18, -u * .28); ctx.lineTo(u * .26, -u * .62); ctx.stroke();
      ctx.lineWidth = u * .035; ctx.beginPath(); ctx.moveTo(u * .26, -u * .62); ctx.lineTo(u * .18, -u * .74); ctx.moveTo(u * .26, -u * .62); ctx.lineTo(u * .35, -u * .72); ctx.moveTo(u * .26, -u * .62); ctx.lineTo(u * .28, -u * .76); ctx.stroke(); ctx.lineCap = "butt";
    }
    ctx.restore(); return;
  }
  const torsoY = -u * .62, torsoR = u * .4;
  if (part === "back") {
    ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(0, 0, u * .48, u * .12, 0, 0, 7); ctx.fill();
    // boosters on the back, with a flicker of flame
    for (const bx of [-u * .3, u * .3]) { ctx.fillStyle = "#8f979f"; ctx.fillRect(bx - u * .07, torsoY - u * .3, u * .14, u * .36); ctx.strokeStyle = "#3a4048"; ctx.lineWidth = 1; ctx.strokeRect(bx - u * .07, torsoY - u * .3, u * .14, u * .36);
      if (!water) { const len = boosting ? .55 + .12 * Math.sin(t * 25) : .16 + .05 * Math.sin(t * 15), wide = boosting ? .08 : .05; ctx.fillStyle = `rgba(255,170,70,${.5 + .3 * Math.sin(t * 12 + bx)})`; ctx.beginPath(); ctx.moveTo(bx - u * wide, torsoY + u * .06); ctx.lineTo(bx, torsoY + u * len); ctx.lineTo(bx + u * wide, torsoY + u * .06); ctx.fill(); if (boosting) { ctx.fillStyle = "#fff3c0cc"; ctx.beginPath(); ctx.moveTo(bx - u * .03, torsoY + u * .06); ctx.lineTo(bx, torsoY + u * len * .55); ctx.lineTo(bx + u * .03, torsoY + u * .06); ctx.fill(); } } }
    ctx.fillStyle = metal(torsoY - torsoR, torsoY + torsoR); ctx.beginPath(); ctx.ellipse(0, torsoY, torsoR, torsoR * 1.02, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, u * .025); ctx.stroke();
    ctx.fillStyle = "#3a4048"; ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .27, 0, 7); ctx.fill(); // the viewport's frame
    ctx.fillStyle = "#123848"; ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .23, 0, 7); ctx.fill();
  } else {
    // the lower body (over the Wayfarer's legs), then the short legs
    ctx.save(); ctx.beginPath(); ctx.rect(-u, torsoY + u * .14, u * 2, u); ctx.clip();
    ctx.fillStyle = metal(torsoY - torsoR, torsoY + torsoR); ctx.beginPath(); ctx.ellipse(0, torsoY, torsoR, torsoR * 1.02, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, u * .025); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1.5, u * .03); ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .26, Math.PI * .1, Math.PI * .9); ctx.stroke();
    const step = water ? 0 : Math.sin(t * 6) * u * .03;
    for (const [lx, k] of [[-u * .16, 1], [u * .16, -1]]) { ctx.fillStyle = "#7d858e"; ctx.fillRect(lx - u * .06, torsoY + torsoR * .8, u * .12, u * .2 + k * step); ctx.fillStyle = "#4b525a"; ctx.beginPath(); ctx.ellipse(lx, torsoY + torsoR * .8 + u * .2 + k * step, u * .11, u * .045, 0, 0, 7); ctx.fill(); }
    // the glass
    const glass = ctx.createRadialGradient(-u * .07, torsoY - u * .14, u * .02, 0, torsoY - u * .05, u * .23); glass.addColorStop(0, "#d8f6ff55"); glass.addColorStop(1, "#5fc6e033"); ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .23, 0, 7); ctx.fill();
    ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = Math.max(1, u * .02); ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .17, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    ctx.strokeStyle = "#c9cfd6"; ctx.lineWidth = Math.max(1.5, u * .03); ctx.beginPath(); ctx.arc(0, torsoY - u * .05, u * .24, 0, 7); ctx.stroke();
    // two robotic arms from the shoulders, elbows bent, with three-fingered manipulators
    const sway = Math.sin(t * 2.2) * .12; ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      const sx = side * torsoR * .92, sy = torsoY + u * .02, ex = sx + side * u * .2, ey = sy + u * (.12 + side * sway * .3), hx = ex + side * u * .08, hy = ey + u * .2;
      ctx.strokeStyle = "#5d656e"; ctx.lineWidth = u * .09; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = "#d3d9df"; ctx.lineWidth = u * .045; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = "#3a4048"; ctx.beginPath(); ctx.arc(ex, ey, u * .045, 0, 7); ctx.fill();
      ctx.strokeStyle = "#3a4048"; ctx.lineWidth = Math.max(1, u * .028); ctx.beginPath(); for (const f of [-.5, 0, .5]) { ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.sin(f) * u * .06, hy + Math.cos(f) * u * .08); } ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (water) { // below the waterline the sea covers it
      ctx.save(); ctx.beginPath(); ctx.rect(-u, waterline, u * 2, u); ctx.clip();
      const sea = ctx.createRadialGradient(0, waterline, u * .1, 0, waterline, u * .62); sea.addColorStop(0, "#1d5a86f2"); sea.addColorStop(.75, "#1d5a86d0"); sea.addColorStop(1, "#1d5a8600");
      ctx.fillStyle = sea; ctx.beginPath(); ctx.ellipse(0, waterline, u * .62, u * .42, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "#cfefffaa"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, waterline, u * (.46 + .03 * Math.sin(t * 2)), u * .08, 0, 0, 7); ctx.stroke(); // a ring of ripples where it meets the water
    }
  }
  ctx.restore();
}
function drawLongboat(ctx, x, y, s, facing, now, side = "right", part = "back") {
  const dir = facing === "left" || (facing !== "right" && side === "left") ? -1 : 1, rock = Math.sin(now / 480 + x) * s * .035;
  const cx = (x + .5) * s, gy = (y + .6) * s + rock, L = s * .86, D = s * .13, H = s * .26, wl = H * .6;
  ctx.save(); ctx.translate(cx, gy); ctx.scale(dir, 1);
  // the hull's near side, from gunwale (y 0) down past the waterline, its ends sweeping up into the posts
  const hull = () => { ctx.beginPath(); ctx.moveTo(-L, -s * .06); ctx.quadraticCurveTo(-L * .86, H, -L * .55, H); ctx.lineTo(L * .55, H); ctx.quadraticCurveTo(L * .86, H, L, -s * .06); ctx.lineTo(L * .95, 0); ctx.lineTo(-L * .95, 0); ctx.closePath(); };
  if (part === "front") { // drawn over the Wayfarer, so they sit inside the boat
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(0, wl + s * .04, L * 1.02, s * .09, 0, 0, 7); ctx.fill();
  hull(); ctx.fillStyle = "#6a4629"; ctx.fill();
  ctx.save(); hull(); ctx.clip(); ctx.strokeStyle = "#8c6039"; ctx.lineWidth = Math.max(1, s * .022);
  for (const k of [.28, .55, .82]) { ctx.beginPath(); ctx.moveTo(-L, k * H - s * .04); ctx.quadraticCurveTo(0, k * H + s * .015, L, k * H - s * .04); ctx.stroke(); } // clinker strakes
  ctx.restore();
  hull(); ctx.strokeStyle = "#3e2614"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke();
  for (let k = 0; k < 5; k++) { // the near shields, hung along the gunwale
    const sx = -L * .5 + k * L * .25, sy = s * .03; ctx.fillStyle = ["#7b2f2a", "#c9b48c", "#2f4a5a"][k % 3];
    ctx.beginPath(); ctx.arc(sx, sy, s * .068, 0, 7); ctx.fill(); ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = Math.max(1, s * .02); ctx.stroke();
    ctx.fillStyle = "#b9a27a"; ctx.beginPath(); ctx.arc(sx, sy, s * .022, 0, 7); ctx.fill();
  }
  // the waterline: the sea laps over the lower hull, with a line of foam
  ctx.fillStyle = "#1d4f78b0"; ctx.beginPath(); ctx.moveTo(-L * 1.05, wl); for (let k = 0; k <= 12; k++) { const qx = -L * 1.05 + k * L * 2.1 / 12; ctx.lineTo(qx, wl + Math.sin(now / 300 + k * 1.3) * s * .012); } ctx.lineTo(L * 1.05, H + s * .08); ctx.lineTo(-L * 1.05, H + s * .08); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#e8f4ffcc"; ctx.lineWidth = Math.max(1, s * .025); ctx.beginPath(); for (let k = 0; k <= 12; k++) { const qx = -L * 1.02 + k * L * 2.04 / 12, qy = wl + Math.sin(now / 300 + k * 1.3) * s * .012; k ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke();
    ctx.restore(); return;
  }
  // the deck, foreshortened behind the near gunwale
  ctx.beginPath(); ctx.moveTo(-L * .95, 0); ctx.quadraticCurveTo(-L * .7, -D, -L * .4, -D); ctx.lineTo(L * .4, -D); ctx.quadraticCurveTo(L * .7, -D, L * .95, 0); ctx.closePath();
  ctx.fillStyle = "#8a6038"; ctx.fill(); ctx.strokeStyle = "#3e2614"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
  ctx.strokeStyle = "#6f4b2c"; ctx.lineWidth = Math.max(1, s * .015); for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * L * .2, -D * .9); ctx.lineTo(k * L * .2, -s * .01); ctx.stroke(); } // thwarts
  for (let k = 0; k < 5; k++) { const sx = -L * .5 + k * L * .25; ctx.fillStyle = "#4a3324"; ctx.beginPath(); ctx.ellipse(sx, -D * .95, s * .05, s * .022, 0, Math.PI, 0); ctx.fill(); } // the far shields' rims
  // the posts: the stem rises and curls into a spiral from which the lantern hangs; the stern curls lower
  const post = (px, up, r, sgn) => { ctx.strokeStyle = "#4a2f17"; ctx.lineWidth = Math.max(1.5, s * .045); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(px, -s * .06); ctx.quadraticCurveTo(px + sgn * s * .1, -up * .5, px + sgn * s * .06, -up); for (let t = 0; t <= 5; t += .25) { const rr = r * (1 - t / 6), a = Math.PI + t * sgn; ctx.lineTo(px + sgn * s * .06 + r + Math.cos(a) * rr * sgn, -up + Math.sin(a) * rr - (r - rr) * .2); } ctx.stroke(); };
  post(L, s * .42, s * .1, 1); post(-L, s * .26, s * .07, -1);
  const hx = L + s * .16, hy = -s * .44, glow = .6 + Math.sin(now / 1300) * .2;
  // a lantern hangs still from the curl (Tim: "the figurehead should be a lantern... a spiral in it... like a spiral
  // galaxy"): a short cord, a dark iron cap and frame, and behind the glass a small two-armed spiral of pale light
  const lx = hx - s * .02, ly = hy + s * .1, lw = s * .11, lh = s * .14;
  ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = Math.max(1, s * .018); ctx.beginPath(); ctx.moveTo(lx, hy - s * .02); ctx.lineTo(lx, ly - lh / 2); ctx.stroke();
  ctx.fillStyle = `rgba(150,170,255,${glow * .28})`; ctx.beginPath(); ctx.arc(lx, ly, s * .14, 0, 7); ctx.fill();
  ctx.fillStyle = "#121726"; ctx.fillRect(lx - lw / 2, ly - lh / 2, lw, lh); // the glass, dark like night
  ctx.save(); ctx.beginPath(); ctx.rect(lx - lw / 2, ly - lh / 2, lw, lh); ctx.clip();
  ctx.strokeStyle = `rgba(214,226,255,${.75 + glow * .25})`; ctx.lineWidth = Math.max(1, s * .016); ctx.lineCap = "round";
  for (const arm of [0, Math.PI]) { ctx.beginPath(); for (let t = 0; t <= 1; t += .1) { const a = arm + t * 4.2, r = s * (.005 + t * .042); const qx = lx + Math.cos(a) * r, qy = ly + Math.sin(a) * r * .8; t ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); } ctx.stroke(); }
  ctx.fillStyle = "#f4f2ff"; ctx.beginPath(); ctx.arc(lx, ly, Math.max(1, s * .014), 0, 7); ctx.fill(); // its bright core
  ctx.restore();
  ctx.strokeStyle = "#3a2c22"; ctx.lineWidth = Math.max(1, s * .02); ctx.strokeRect(lx - lw / 2, ly - lh / 2, lw, lh); // the frame
  ctx.fillStyle = "#3a2c22"; ctx.beginPath(); ctx.moveTo(lx - lw * .62, ly - lh / 2); ctx.lineTo(lx, ly - lh / 2 - s * .045); ctx.lineTo(lx + lw * .62, ly - lh / 2); ctx.closePath(); ctx.fill(); // the cap
  ctx.fillRect(lx - lw * .6, ly + lh / 2, lw * 1.2, s * .02); // the base
  // the mast and its square sail, upright, forward of the Wayfarer who sits amidships
  const mx = L * .42, top = -s * 1.32, sw = s * .6, belly = s * (.08 + Math.sin(now / 760) * .02);
  ctx.strokeStyle = "#3a2412"; ctx.lineWidth = Math.max(2, s * .055); ctx.beginPath(); ctx.moveTo(mx, -D * .5); ctx.lineTo(mx, top - s * .08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx - sw / 2, top); ctx.quadraticCurveTo(mx, top - belly * .4, mx + sw / 2, top); ctx.lineTo(mx + sw / 2 + belly * .2, top + s * .7); ctx.quadraticCurveTo(mx, top + s * .7 + belly, mx - sw / 2 - belly * .2, top + s * .7); ctx.closePath();
  ctx.fillStyle = "#e9dcbc"; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = "#a33a2f"; for (let k = 0; k < 4; k++) ctx.fillRect(mx - sw / 2 + k * sw / 3.5, top - s * .1, sw / 7, s); ctx.restore();
  ctx.strokeStyle = "#6e5a3c"; ctx.lineWidth = Math.max(1, s * .025); ctx.stroke();
  ctx.strokeStyle = "#3a2412"; ctx.lineWidth = Math.max(1.5, s * .045); ctx.beginPath(); ctx.moveTo(mx - sw / 2 - s * .05, top); ctx.lineTo(mx + sw / 2 + s * .05, top); ctx.stroke(); // the yard
  ctx.restore();
}
// Release 269: a small REPAIR tag over a skiff the Build button would patch.
function repairTag(ctx, x, y, s) { const bx = (x + .5) * s, by = (y + .2) * s; ctx.fillStyle = "#1d1c19e0"; ctx.fillRect(bx - s * .5, by - s * .32, s, s * .3); ctx.strokeStyle = "#b58c50"; ctx.lineWidth = 1; ctx.strokeRect(bx - s * .5, by - s * .32, s, s * .3); ctx.fillStyle = "#f0dbb5"; ctx.font = `bold ${Math.max(8, Math.round(s * .2))}px monospace`; ctx.textAlign = "center"; ctx.fillText("REPAIR", bx, by - s * .11); ctx.textAlign = "start"; }
// Release 197: an Elder Wanderer. Tall and faceless on four stilt legs; its body is its own rule, unfolding upward
// row by row, in the rule's colour. A pale disc floats where a head would be.
export function drawElder(ctx, o, s, now) {
  const hue = (o.rule * 137.508) % 360, walking = o.state === "walking", T = now / 1000 + (o.phase || 0) * 10;
  const cx = (o.x + .5) * s, foot = (o.y + .95) * s, H = s * 2.2, bodyW = s * .5, bodyTop = foot - H, bodyBot = foot - H * .42, bob = walking ? Math.sin(T * 3) * s * .03 : Math.sin(T) * s * .015;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(cx, foot, s * .45, s * .12, 0, 0, 7); ctx.fill();
  // Four long jointed legs, stepping in turn.
  ctx.strokeStyle = `hsl(${hue},25%,22%)`; ctx.lineWidth = Math.max(1.5, s * .045); ctx.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    const side = k < 2 ? -1 : 1, front = k % 2 ? 1 : -1, ph = walking ? Math.sin(T * 3 + k * 1.6) : 0;
    const hip = [cx + side * bodyW * .3, bodyBot + bob], toe = [cx + side * s * (.28 + front * .1) + ph * s * .12, foot - Math.max(0, ph) * s * .08], knee = [cx + side * s * .48, (hip[1] + toe[1]) / 2 - s * .2];
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...toe); ctx.stroke();
  }
  // The body: a cloak of its rule, rows rising; a fresh random row every 26 rows, so even rules that die out show
  // their character.
  const cols = 9, rowsShown = 15, rows = o.rows ||= Array.from({ length: 16 }, (_, k) => ruleRows(o.rule, 33, 26, Math.floor((o.phase || .5) * 1e6) + 7 + k * 7919).map((r) => r.slice(12, 12 + cols))).flat(), cw = bodyW / cols, ch = (bodyBot - bodyTop) / rowsShown, scroll = (T * 2.2) % (rows.length - rowsShown);
  const top = Math.floor(scroll);
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - bodyW / 2, bodyBot + bob); ctx.lineTo(cx - bodyW / 2, bodyTop + bodyW * .4 + bob); ctx.quadraticCurveTo(cx, bodyTop - bodyW * .2 + bob, cx + bodyW / 2, bodyTop + bodyW * .4 + bob); ctx.lineTo(cx + bodyW / 2, bodyBot + bob); ctx.closePath();
  ctx.fillStyle = `hsl(${hue},40%,8%)`; ctx.fill(); ctx.clip();
  ctx.fillStyle = `hsl(${hue},85%,64%)`;
  for (let y = 0; y <= rowsShown; y++) { const row = rows[(top + y) % rows.length]; for (let x = 0; x < cols; x++) if (row[x]) ctx.fillRect(cx - bodyW / 2 + x * cw + cw * .1, bodyBot + bob - (y + 1 - (scroll - top)) * ch + ch * .1, cw * .8, ch * .8); }
  ctx.restore();
  ctx.strokeStyle = `hsla(${hue},70%,70%,.6)`; ctx.lineWidth = 1; ctx.strokeRect(cx - bodyW / 2, bodyTop + bodyW * .4 + bob, bodyW, bodyBot - bodyTop - bodyW * .4);
  // The head: a pale floating disc with a faint halo, no face.
  const hy = bodyTop - s * .32 + bob + Math.sin(T * 1.3) * s * .04;
  const halo = ctx.createRadialGradient(cx, hy, 0, cx, hy, s * .45); halo.addColorStop(0, `hsla(${hue},90%,80%,.45)`); halo.addColorStop(1, `hsla(${hue},90%,80%,0)`);
  ctx.fillStyle = halo; ctx.fillRect(cx - s * .45, hy - s * .45, s * .9, s * .9);
  ctx.fillStyle = `hsl(${hue},30%,88%)`; ctx.beginPath(); ctx.ellipse(cx, hy, s * .13, s * .16, 0, 0, 7); ctx.fill();
  ctx.restore();
}
// Release 215: a strange tree, shrub or stone (strange.ts). Its own shape, but wrong: a pale ghost of it drifts half a
// step out of place and back, it flickers now and then, and slow motes rise from it. No label: you notice it or not.
// Release 225: something in the rock. A faint glint on the face of a wall block that hides treasure: a few points of
// light that brighten and fade in turn, so it reads as catching the light, not as a marker.
export function drawWallGlint(ctx, q, s, now) {
  const cx = (q.x + .5) * s, cy = (q.y + .55) * s;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const ph = now / 900 + i * 2.1 + q.x * .7 + q.y * 1.3, a = Math.max(0, Math.sin(ph)) ** 6, px = cx + Math.sin(i * 2.4 + q.y) * s * .28, py = cy + Math.cos(i * 1.7 + q.x) * s * .22;
    if (a < .02) continue;
    ctx.fillStyle = `rgba(255,236,170,${.85 * a})`; ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * .035), 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,236,170,${.5 * a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - s * .1 * a, py); ctx.lineTo(px + s * .1 * a, py); ctx.moveTo(px, py - s * .1 * a); ctx.lineTo(px, py + s * .1 * a); ctx.stroke();
  }
  ctx.restore();
}
// Release 225: a patch of disturbed earth (or, once dug, turned earth): a low mound of darker soil ringed by a few stones.
// Release 431: a cracked bronze bell on a weathered frame; a rung one hangs still with a faint warm glow.
// Release 595: a torn page lying on the floor, its corner lifting; an unread one gives off a faint light.
export function drawTornPage(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .6) * s, read = o.state === "read", lift = read ? 0 : Math.sin(now / 700 + o.x) * .06;
  ctx.save();
  if (!read) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * .7); g.addColorStop(0, "rgba(255,236,190,.32)"); g.addColorStop(1, "rgba(255,236,190,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * .7, 0, 7); ctx.fill(); }
  ctx.translate(cx, cy); ctx.rotate(-.18);
  ctx.fillStyle = "#00000033"; ctx.fillRect(-s * .26, -s * .3 + s * .05, s * .52, s * .62);
  ctx.fillStyle = read ? "#cbbf9f" : "#ece2c4"; ctx.beginPath(); ctx.moveTo(-s * .26, -s * .32); ctx.lineTo(s * .2, -s * .32); ctx.lineTo(s * .26, -s * .2 - lift * s); ctx.lineTo(s * .24, s * .3);
  for (let i = 0; i < 5; i++) ctx.lineTo(s * (.14 - i * .1), s * (.26 + (i % 2) * .06)); ctx.closePath(); ctx.fill(); // the torn edge along the foot
  ctx.strokeStyle = "#6b5a3f88"; ctx.lineWidth = Math.max(1, s * .02); for (let i = 0; i < 5; i++) { const y = -s * .2 + i * s * .1; ctx.beginPath(); ctx.moveTo(-s * .19, y); ctx.lineTo(s * (.12 - (i === 4 ? .14 : 0)), y); ctx.stroke(); }
  ctx.restore();
}
export function drawCrackedBell(ctx, o, s, now) {
  const cx = (o.x + .5) * s, base = (o.y + .9) * s, top = (o.y - .55) * s, rung = o.state === "rung", sway = rung ? 0 : Math.sin(now / 900 + o.x) * .05;
  ctx.save(); ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = Math.max(2, s * .09); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - s * .55, base); ctx.lineTo(cx - s * .45, top); ctx.lineTo(cx + s * .45, top); ctx.lineTo(cx + s * .55, base); ctx.stroke();
  ctx.translate(cx, top + s * .08); ctx.rotate(sway);
  if (rung) { const g = ctx.createRadialGradient(0, s * .45, 0, 0, s * .45, s * .8); g.addColorStop(0, "rgba(255,210,140,.35)"); g.addColorStop(1, "rgba(255,210,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, s * .45, s * .8, 0, 7); ctx.fill(); }
  ctx.strokeStyle = "#2a2018"; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * .1); ctx.stroke();
  const bell = ctx.createLinearGradient(-s * .32, 0, s * .32, 0); bell.addColorStop(0, "#5c3f1c"); bell.addColorStop(.45, rung ? "#c8964f" : "#9c7136"); bell.addColorStop(1, "#4a3216");
  ctx.fillStyle = bell; ctx.beginPath(); ctx.moveTo(-s * .14, s * .1); ctx.quadraticCurveTo(-s * .2, s * .45, -s * .34, s * .72); ctx.lineTo(s * .34, s * .72); ctx.quadraticCurveTo(s * .2, s * .45, s * .14, s * .1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1e150c"; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.moveTo(s * .04, s * .18); ctx.lineTo(-s * .03, s * .36); ctx.lineTo(s * .06, s * .5); ctx.lineTo(-s * .02, s * .68); ctx.stroke(); // the crack
  ctx.fillStyle = "#2a1d10"; ctx.beginPath(); ctx.arc(0, s * .74, s * .06, 0, 7); ctx.fill();
  ctx.restore();
}
// Release 455: writing in the stone. A low slab with a column of cut lines and, beside it, a smaller slanted hand; an
// unread one holds a faint pale light in its letters.
// Release 505: a brass chain-link lying in the dust, glinting until it is taken; then only its print remains.
export function drawSurveyorLink(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .62) * s, taken = o.state === "taken";
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.5);
  if (taken) { ctx.strokeStyle = "rgba(40,36,30,.5)"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.ellipse(0, 0, s * .24, s * .1, 0, 0, 7); ctx.stroke(); ctx.restore(); return; }
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(s * .03, s * .06, s * .28, s * .12, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#8a6a2e"; ctx.lineWidth = Math.max(2, s * .09); ctx.beginPath(); ctx.ellipse(0, 0, s * .24, s * .1, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#e6c46a"; ctx.lineWidth = Math.max(1, s * .04); ctx.beginPath(); ctx.ellipse(0, -s * .01, s * .22, s * .085, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
  const glint = .5 + .5 * Math.sin(now / 500 + o.x * 3); ctx.fillStyle = `rgba(255,240,190,${.25 + .5 * glint})`; ctx.beginPath(); ctx.arc(-s * .12, -s * .06, Math.max(1, s * .035), 0, 7); ctx.fill();
  ctx.restore();
}
// Release 551: Abel Corwin's statue, kneeling on a low plinth in pale Far Sleep stone, a brass chain from his boot to his hand.
export function drawSurveyorStatue(ctx, o, s, now) {
  const cx = (o.x + .5) * s, base = (o.y + .92) * s, stone = "#d9d4c6", shade = "#a8a294", edge = "#5f5a50";
  ctx.save(); ctx.lineJoin = "round";
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(cx, base, s * .5, s * .14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shade; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, s * .03); ctx.fillRect(cx - s * .42, base - s * .2, s * .84, s * .2); ctx.strokeRect(cx - s * .42, base - s * .2, s * .84, s * .2); // the plinth
  ctx.fillStyle = edge; for (let i = 0; i < 7; i++) ctx.fillRect(cx - s * .36 + i * s * .1, base - s * .12, s * .05, s * .025); // the column of numbers
  const g = ctx.createLinearGradient(cx - s * .3, 0, cx + s * .3, 0); g.addColorStop(0, stone); g.addColorStop(1, shade); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - s * .3, base - s * .2); ctx.lineTo(cx - s * .28, base - s * .42); ctx.lineTo(cx - s * .02, base - s * .44); ctx.lineTo(cx + s * .04, base - s * .2); ctx.closePath(); ctx.fill(); ctx.stroke(); // the kneeling leg
  ctx.beginPath(); ctx.moveTo(cx + s * .04, base - s * .2); ctx.lineTo(cx + s * .22, base - s * .2); ctx.lineTo(cx + s * .2, base - s * .36); ctx.lineTo(cx + s * .06, base - s * .38); ctx.closePath(); ctx.fill(); ctx.stroke(); // the planted boot
  ctx.beginPath(); ctx.moveTo(cx - s * .22, base - s * .4); ctx.lineTo(cx - s * .16, base - s * .9); ctx.lineTo(cx + s * .1, base - s * .92); ctx.lineTo(cx + s * .12, base - s * .4); ctx.closePath(); ctx.fill(); ctx.stroke(); // the coat
  ctx.beginPath(); ctx.arc(cx - s * .02, base - s * 1.02, s * .11, 0, 7); ctx.fill(); ctx.stroke(); // the bowed head
  ctx.beginPath(); ctx.moveTo(cx + s * .08, base - s * .82); ctx.lineTo(cx + s * .3, base - s * .62); ctx.lineTo(cx + s * .26, base - s * .55); ctx.lineTo(cx + s * .05, base - s * .7); ctx.closePath(); ctx.fill(); ctx.stroke(); // the arm held out
  ctx.strokeStyle = "#c79a3e"; ctx.lineWidth = Math.max(1.2, s * .035); ctx.setLineDash([Math.max(2, s * .05), Math.max(1, s * .025)]); ctx.beginPath(); ctx.moveTo(cx + s * .14, base - s * .22); ctx.quadraticCurveTo(cx + s * .34, base - s * .34, cx + s * .29, base - s * .6); ctx.stroke(); ctx.setLineDash([]); // brass chain, boot to hand
  if (o.state !== "seen") { const glint = .5 + .5 * Math.sin(now / 600); ctx.fillStyle = `rgba(255,236,170,${.3 + .5 * glint})`; ctx.beginPath(); ctx.arc(cx + s * .29, base - s * .6, Math.max(1, s * .04), 0, 7); ctx.fill(); }
  ctx.restore();
}
export function drawMarginNote(ctx, o, s, now) {
  const x = o.x * s + s * .14, y = o.y * s + s * .18, w = s * .72, h = s * .7, read = o.state === "read";
  ctx.save(); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + s * .04, w * .55, s * .1, 0, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, "#6f6a62"); g.addColorStop(1, "#4a4640"); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + s * .1); ctx.quadraticCurveTo(x + w / 2, y - s * .06, x + w, y + s * .1); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2c2925"; ctx.lineWidth = Math.max(1, s * .03); ctx.stroke();
  const glow = read ? 0 : .35 + .25 * Math.sin(now / 700 + o.x);
  ctx.strokeStyle = read ? "#2e2b27" : `rgba(236,226,196,${.55 + glow * .4})`; ctx.lineWidth = Math.max(1, s * .035);
  for (let i = 0; i < 4; i++) { const ly = y + s * (.2 + i * .12); ctx.beginPath(); ctx.moveTo(x + w * .12, ly); ctx.lineTo(x + w * (i === 3 ? .4 : .58), ly); ctx.stroke(); }
  ctx.lineWidth = Math.max(.8, s * .022); ctx.strokeStyle = read ? "#3a3530" : `rgba(214,190,150,${.5 + glow * .4})`;
  for (let i = 0; i < 3; i++) { const ly = y + s * (.22 + i * .14); ctx.beginPath(); ctx.moveTo(x + w * .68, ly + s * .03); ctx.lineTo(x + w * .88, ly - s * .02); ctx.stroke(); }
  ctx.restore();
}
// Release 415: Ilse the Lamplighter, at the age the Corridor deals her. A child or young woman with a lit taper beside a lamp
// post (lit), the woman holding the last lamp, the old woman beside a dark lamp, and in the Far Sleep a lamp with no post.
export function drawIlse(ctx, o, s, now) {
  const age = o.age, scale = age === "child" ? .74 : age === "young" ? .9 : 1, cx = (o.x + .5) * s, flick = .85 + .15 * Math.sin(now / 130 + o.x);
  const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,214,140,${a})`); g.addColorStop(1, "rgba(255,214,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const lamp = (x, y, lit) => { ctx.fillStyle = "#2b2420"; ctx.fillRect(x - s * .1, y - s * .14, s * .2, s * .26); ctx.fillStyle = lit ? `rgba(255,220,150,${.9 * flick})` : "#4a4440"; ctx.fillRect(x - s * .06, y - s * .1, s * .12, s * .16); if (lit) glow(x, y, s * 1.1, .35 * flick); };
  const postX = cx + s * .7, top = (o.y - .9) * s;
  if (o.stage !== 3 && o.stage !== 5) { ctx.strokeStyle = "#3a302a"; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); ctx.moveTo(postX, (o.y + .85) * s); ctx.lineTo(postX, top); ctx.stroke(); lamp(postX, top, o.stage !== 4); }
  if (o.stage === 5) { const fy = top - s * .2 + Math.sin(now / 700) * s * .08; lamp(postX, fy, true); }
  actor(ctx, o.x, o.y, s, "villager", "down", 0, "idle", false, scale);
  if (age === "old") { ctx.strokeStyle = "#6b5a48"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.moveTo(cx - s * .32, (o.y + .85) * s); ctx.lineTo(cx - s * .28, (o.y + .15) * s); ctx.stroke(); }
  const hx = cx + s * .26, hy = (o.y + .38) * s;
  if (o.stage === 3) lamp(hx, hy, true);
  else if (o.stage === 1 || o.stage === 2) { ctx.strokeStyle = "#d9c39a"; ctx.lineWidth = Math.max(1.2, s * .04); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + s * .1, hy - s * .5); ctx.stroke(); ctx.fillStyle = `rgba(255,200,110,${flick})`; ctx.beginPath(); ctx.ellipse(hx + s * .1, hy - s * .56, s * .04, s * .08, 0, 0, 7); ctx.fill(); glow(hx + s * .1, hy - s * .56, s * .45, .3 * flick); }
}
export function drawDigSpot(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .72) * s, dug = o.state === "dug";
  ctx.save();
  ctx.fillStyle = dug ? "#2a2018" : "#4a3a28"; ctx.beginPath(); ctx.ellipse(cx, cy, s * .42, s * .2, 0, 0, 7); ctx.fill();
  if (!dug) { ctx.fillStyle = "#5e4a32"; ctx.beginPath(); ctx.ellipse(cx - s * .05, cy - s * .05, s * .28, s * .12, -.1, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = "#120c08"; ctx.beginPath(); ctx.ellipse(cx, cy, s * .22, s * .09, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#8a8478";
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .4; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * s * .5, cy + Math.sin(a) * s * .25, s * .07, s * .05, a, 0, 7); ctx.fill(); }
  ctx.restore();
}
// Release 573 (Tim: "taller trees... that reach beyond the frame... you can't see the tops of some of them... you can walk
// behind them... maybe you can see like a silhouette"): a giant forest tree, its trunk `height` tiles tall and its crown above.
// The Wayfarer behind one is drawn again, faint (`ghost`), over it (giantTreeHides).
export const GIANT_TREE = { height: 9, trunk: .36, crown: 2.3, sway: .06, ghost: .45 };
export function drawGiantTree(ctx, o, s, now) {
  const G = GIANT_TREE, k = (o.x + .5) * s, base = (o.y + .82) * s, top = base - G.height * s, w = G.trunk * s, sway = Math.sin(now / 1900 + o.x * 1.7 + o.y) * G.sway * s;
  ctx.fillStyle = "#00000044"; ctx.beginPath(); ctx.ellipse(k, base, s * .9, s * .26, 0, 0, 7); ctx.fill();
  const bark = ctx.createLinearGradient(k - w, 0, k + w, 0); bark.addColorStop(0, "#2a1e15"); bark.addColorStop(.45, "#5a4330"); bark.addColorStop(1, "#22180f");
  ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(k - w * 1.6, base); ctx.quadraticCurveTo(k - w, base - s * .5, k - w * .8, base - s); ctx.lineTo(k - w * .55 + sway, top + s); ctx.lineTo(k + w * .55 + sway, top + s); ctx.lineTo(k + w * .8, base - s); ctx.quadraticCurveTo(k + w, base - s * .5, k + w * 1.6, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1a120c99"; ctx.lineWidth = Math.max(1, s * .03); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(k + i * w * .4, base - s * .2); ctx.lineTo(k + i * w * .3 + sway * .8, top + s * 1.5); ctx.stroke(); }
  ctx.strokeStyle = "#3d2c1f"; ctx.lineWidth = Math.max(2, s * .1); for (const [h, d] of [[.42, -1], [.58, 1], [.72, -1]]) { const y = base - G.height * s * h, x = k + sway * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + d * s * .8, y - s * .3, x + d * s * 1.5, y - s * .9); ctx.stroke(); ctx.fillStyle = "#24402a"; ctx.beginPath(); ctx.arc(x + d * s * 1.5, y - s * .95, s * .55, 0, 7); ctx.fill(); }
  const cx = k + sway, cy = top, R = G.crown * s;
  for (const [dx, dy, r, c] of [[-.55, .35, .75, "#1e3a24"], [.6, .4, .7, "#1e3a24"], [0, 0, 1, "#26482b"], [-.35, -.35, .7, "#2f5733"], [.4, -.3, .62, "#2f5733"], [0, -.62, .5, "#3a6a3c"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx * R, cy + dy * R, r * R, 0, 7); ctx.fill(); }
}
// Release 587: a floating disc of a skyway (skylands.ts SKY_DISCS): its shadow on the ground, the disc `level` lifts above it, a
// gentle bob. `d` is in foot coordinates (the Wayfarer's x + .5, y + .75).
export function discLift(level) { return level * LIFT_PER_LEVEL; }
export function drawSkyDisc(ctx, d, s, now) {
  const bob = Math.sin(now / 900 + d.x + d.y) * .05 * s, cx = d.x * s, gy = d.y * s, cy = gy - discLift(d.level) * s + bob, rx = d.r * s, ry = d.r * s * .55;
  ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(cx, gy, rx * .9, ry * .8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#8f8aa0"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .16, rx * .96, ry * .9, 0, 0, 7); ctx.fill();
  const top = ctx.createRadialGradient(cx - rx * .3, cy - ry * .35, 0, cx, cy, rx); top.addColorStop(0, "#ffffff"); top.addColorStop(.7, "#e9e4f2"); top.addColorStop(1, "#cfc7de");
  ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#d9b866"; ctx.lineWidth = Math.max(1, s * .05); ctx.stroke();
  ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, rx * .62, ry * .62, 0, 0, 7); ctx.stroke();
}
// Does a giant tree at `o` stand in front of the Wayfarer at `p` (drawn over them)?
export function giantTreeHides(o, p) {
  if (!(o.y > p.y)) return false; const G = GIANT_TREE, px = p.x + .5, py = p.y + .35, tx = o.x + .5, base = o.y + .82;
  return (Math.abs(px - tx) < G.trunk + .3 && py < base && py > base - G.height) || Math.hypot(px - tx, py - (base - G.height)) < G.crown * 1.05;
}
export function drawStrange(ctx, o, s, kind, now) {
  const T = now / 1000 + (o.x * 7 + o.y * 13) % 10, drift = Math.sin(T * .7) * .09, flick = Math.sin(T * 9) * Math.sin(T * 2.3) > .9 ? .35 : 1;
  ctx.save(); ctx.globalAlpha = flick; actor(ctx, o.x, o.y, s, kind, "down", 0, o.state || "idle", false, o.scale || 1); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .45 + .15 * Math.sin(T * 1.3);
  actor(ctx, o.x + drift, o.y - .04 - Math.abs(drift) * .5, s, kind, "down", 0, o.state || "idle", false, (o.scale || 1) * 1.04); ctx.restore();
  const cx = (o.x + .5) * s, cy = (o.y + .2) * s;
  const pulse = .3 + .12 * Math.sin(T * 1.9), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.3); g.addColorStop(0, `rgba(190,170,255,${pulse})`); g.addColorStop(.5, `rgba(150,200,255,${pulse * .4})`); g.addColorStop(1, "rgba(200,190,255,0)");
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(cx - s * 1.3, cy - s * 1.3, s * 2.6, s * 2.6); ctx.restore();
  for (let k = 0; k < 9; k++) { const p = ((T * .18 + k / 9) % 1), x = cx + Math.sin(T * .9 + k * 2.1) * s * .45, y = cy + s * .35 - p * s * 1.7, m = Math.max(2, s * .07); ctx.fillStyle = k % 3 ? `rgba(230,240,255,${(1 - p) * .95})` : `rgba(200,160,255,${(1 - p) * .95})`; ctx.fillRect(x, y, m, m); }
}
// Release 271 (Tim, 2026-10-21: "let's see if we can do a model rework on the gate revenant... increase its Fidelity,
// without increasing... processing requirements"). A hooded, horned wraith in a tattered cloak with the Gate's arch burning
// on its chest. Flat fills and batched paths only (no gradients or blur): about a dozen fills and strokes a frame, no more
// than the old ellipse, slabs and seven tendrils. Its pose shows its mind: faded while it stalks, an afterimage as it
// slips a blow, down on one knee while its poise is broken, eyes and sigil flaring as it winds up.
export function drawGateRevenant(ctx, e, s, now, ox = 0, oy = 0) { // exported for the creature preview tests
  const [cloth, shade, ember] = COLORS.gateRevenant, sc = Math.max(.6, Number(e.scale) || 1), u = s * sc, T = now / 1000;
  const k = (e.x + ox + .5) * s, base = (e.y + oy) * s + s * .82, fx = (e.facingX || 1) < 0 ? -1 : 1;
  const broken = e.gateBroken > 0, flare = e.telegraph > 0 || e.strike > 0 || e.gateAttack?.phase === "windup" || e.gateUnstoppable > 0;
  // Tim, 2026-10-21: in the long lava barrage "his chest... opens up to a large mouth that spews out lava, and [the] cape
  // flies back to be like wings... that reveals his true nature... his body is actually just a gaping maw". `maw` is 0..1:
  // opening through the warning, wide while the bombs fly, closing through the recovery.
  const atk = e.gateAttack, maw = broken || atk?.move !== "barrage" ? 0 : atk.phase === "warn" ? Math.min(1, 1 - atk.left / GATE_REVENANT.barrage.warn) : atk.phase === "recover" ? Math.max(0, atk.left / GATE_REVENANT.recover) : 1;
  const hover = broken ? 0 : Math.sin(T * 2.3 + (e.x + e.y) * .7) * .035 * u, sway = Math.sin(T * 3.1 + e.x) * .05;
  ctx.fillStyle = "#050504aa"; ctx.beginPath(); ctx.ellipse(k, base, u * .32, u * .1, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(k, base - hover); ctx.scale(fx * u, (broken ? .74 : 1) * u);
  if (broken) ctx.rotate(-.12);
  if (!e.aggro && !broken) ctx.globalAlpha = .7; // stalking: half in the dark
  const cloak = (dx) => { // shoulders to a ragged, drifting hem
    ctx.beginPath(); ctx.moveTo(dx - .2, -.74); ctx.quadraticCurveTo(dx - .42, -.4, dx - .38 - sway * .6, -.02);
    for (let i = 0; i < 5; i++) { const a = dx - .38 + (i + .5) * .152, w = Math.sin(T * 4 + i * 1.9) * .025; ctx.lineTo(a - .04 + sway * .4, -.13 + w); ctx.lineTo(a + .076 + sway * .3, (i % 2 ? .02 : -.05) + w); }
    ctx.quadraticCurveTo(dx + .44, -.4, dx + .2, -.74); ctx.closePath();
  };
  if (e.gateEvade) { const g = ctx.globalAlpha; ctx.globalAlpha = g * .3; ctx.fillStyle = ember; cloak(-(e.gateEvade.x || 0) * fx * .45); ctx.fill(); ctx.globalAlpha = g; }
  if (maw > 0) { // the cape flung back into wings
    const span = .45 + .5 * maw, lift = .25 * maw, flap = Math.sin(T * 9) * .03 * maw;
    ctx.fillStyle = shade; ctx.strokeStyle = ember + "8c"; ctx.lineWidth = .03; ctx.beginPath();
    for (const d of [-1, 1]) {
      ctx.moveTo(d * .14, -.72); ctx.quadraticCurveTo(d * span * .7, -.98 - lift - flap, d * span, -.92 - lift + flap);
      for (let i = 1; i <= 4; i++) { const f = 1 - i / 4.4; ctx.lineTo(d * span * f + d * .03, -.6 - lift * f + (i % 2 ? .1 : 0)); ctx.lineTo(d * span * (f - .08), -.72 - lift * f * 1.1); }
      ctx.lineTo(d * .16, -.3); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
  }
  // Trailing tatters, one stroke.
  ctx.strokeStyle = cloth; ctx.lineWidth = .05; ctx.lineCap = "round"; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const y0 = -.55 + i * .13, w = Math.sin(T * 3.4 + i * 1.3) * .08; ctx.moveTo(-.3, y0); ctx.quadraticCurveTo(-.52, y0 + .05 + w, -.66 + w * .5, y0 + .16 + w); }
  ctx.stroke();
  if (maw > 0) { ctx.save(); ctx.scale(1 - .3 * maw, 1); } // the cape gone to wings, the body narrows
  ctx.fillStyle = shade; cloak(0); ctx.fill(); ctx.strokeStyle = ember + "8c"; ctx.lineWidth = .03; ctx.stroke();
  if (maw > 0) ctx.restore();
  // The inner fold, lit from the sigil.
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-.1, -.68); ctx.quadraticCurveTo(-.17, -.32, -.12 + sway * .3, -.06); ctx.lineTo(.12 + sway * .3, -.08); ctx.quadraticCurveTo(.17, -.32, .1, -.68); ctx.closePath(); ctx.fill();
  // Pauldrons and talons.
  ctx.fillStyle = cloth; ctx.beginPath();
  for (const d of [-1, 1]) { ctx.moveTo(d * .1, -.76); ctx.quadraticCurveTo(d * .38, -.82, d * .4, -.6); ctx.quadraticCurveTo(d * .27, -.66, d * .12, -.62); ctx.closePath(); }
  ctx.fill();
  const reach = flare ? .14 : 0; ctx.strokeStyle = "#cfc2d6"; ctx.lineWidth = .028; ctx.beginPath();
  for (const t of [-.05, .02, .09]) { ctx.moveTo(.33, -.42 + t); ctx.lineTo(.47 + reach, -.36 + t * 1.5); }
  ctx.stroke();
  if (maw > .05) { // the chest split into one gaping mouth, fangs above and below, lava glowing in its throat
    const w = .2 + .1 * maw, h = .27 * maw, cy = -.4, pulse = .5 + .5 * Math.sin(T * 6);
    const lips = (g) => { ctx.beginPath(); ctx.moveTo(-w - g, cy); ctx.quadraticCurveTo(0, cy - h * 2 - g, w + g, cy); ctx.quadraticCurveTo(0, cy + h * 2 + g, -w - g, cy); ctx.closePath(); };
    ctx.fillStyle = "#4a0c18"; lips(.035); ctx.fill();
    ctx.fillStyle = "#c2321c"; lips(0); ctx.fill();
    ctx.fillStyle = "#ff8a2e"; ctx.beginPath(); ctx.ellipse(0, cy + h * .25, w * .62, h * (.75 + .1 * pulse), 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.ellipse(0, cy + h * .35, w * .28, h * (.35 + .1 * pulse), 0, 0, 7); ctx.fill();
    // Teeth: a row of small ones along each lip, pointing into the mouth...
    const lipAt = (up, t) => cy + up * h * 4 * t * (1 - t);
    ctx.fillStyle = "#ece2d4"; ctx.beginPath();
    for (const [up, n] of [[-1, 8], [1, 7]]) for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, x = -w + 2 * w * t, lip = lipAt(up, t), half = w / n * .75, len = Math.min(h * .6, .045);
      ctx.moveTo(x - half, lip); ctx.lineTo(x, lip - up * len); ctx.lineTo(x + half, lip);
    }
    ctx.fill();
    // ...and four great curved canines (Tim: "more pronounced, like canine. Fangs"), the upper pair reaching past the lower lip.
    ctx.beginPath();
    for (const [up, t, len] of [[-1, .22, .62], [-1, .78, .62], [1, .35, .26], [1, .65, .26]]) { // the lower pair small and apart: the lava's way out
      const x = -w + 2 * w * t, lip = lipAt(up, t), L = h * 2 * len * .8 + .02, half = (up > 0 ? .7 : 1) * (.026 + .012 * maw), bow = (t < .5 ? 1 : -1) * .03;
      // A cone: broad at the gum, tapering to a point that curves in toward the middle of the mouth.
      ctx.moveTo(x - half, lip + up * .012); ctx.quadraticCurveTo(x - half * .85, lip - up * L * .45, x + bow, lip - up * L);
      ctx.quadraticCurveTo(x + half * .55, lip - up * L * .4, x + half, lip + up * .012); ctx.closePath();
    }
    ctx.fill(); ctx.strokeStyle = "#7d5f55"; ctx.lineWidth = .012; ctx.stroke();
    if (atk?.phase === "active") { ctx.fillStyle = "#ff8a3a"; ctx.beginPath(); for (let i = 0; i < 4; i++) { const q = (T * 2.6 + i / 4) % 1, r = .045 * (1 - q * .5), x = Math.sin(i * 2.1 + T * 3) * .1 * q, y = cy - h - q * .55; ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r, 0, 0, 7); } ctx.fill(); }
  } else {
  // The Gate burning on its chest: a pointed arch and its keystone.
  const glow = broken ? .25 + .25 * (Math.sin(T * 17) > .3) : flare ? 1 : .55 + .2 * Math.sin(T * 2.6);
  ctx.globalAlpha *= glow; ctx.strokeStyle = ember; ctx.lineWidth = .035; ctx.beginPath();
  ctx.moveTo(-.07, -.3); ctx.lineTo(-.07, -.44); ctx.quadraticCurveTo(-.07, -.53, 0, -.58); ctx.quadraticCurveTo(.07, -.53, .07, -.44); ctx.lineTo(.07, -.3);
  ctx.moveTo(0, -.58); ctx.lineTo(0, -.5); ctx.stroke(); ctx.globalAlpha /= glow;
  }
  // Horns swept back, bone pale, then the hood over them.
  ctx.fillStyle = "#a58f9e"; ctx.beginPath();
  ctx.moveTo(-.17, -.86); ctx.quadraticCurveTo(-.44, -.86, -.52, -1.13); ctx.quadraticCurveTo(-.3, -1.0, -.06, -.98);
  ctx.moveTo(.04, -.99); ctx.quadraticCurveTo(-.02, -1.13, -.17, -1.25); ctx.quadraticCurveTo(.1, -1.17, .17, -.9); ctx.fill();
  ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(-.19, -.68); ctx.quadraticCurveTo(-.22, -.96, .02, -1.02); ctx.quadraticCurveTo(.2, -.95, .19, -.68); ctx.quadraticCurveTo(0, -.62, -.19, -.68); ctx.fill();
  ctx.strokeStyle = ember + "b0"; ctx.lineWidth = .03; ctx.stroke();
  ctx.fillStyle = "#050308"; ctx.beginPath(); ctx.ellipse(.02, -.8, .1, .085, 0, 0, 7); ctx.fill();
  // Eyes: slits, brighter on the hunt.
  ctx.fillStyle = flare ? "#ffd0dc" : e.aggro ? "#ff6e89" : ember; ctx.beginPath();
  for (const d of [-.045, .065]) { ctx.moveTo(d - .03, -.81); ctx.lineTo(d + .03, -.825); ctx.lineTo(d + .02, -.795); ctx.closePath(); }
  ctx.fill();
  ctx.restore();
}
function actor(
  ctx,
  x,
  y,
  s,
  kind,
  facing = "down",
  frame = 0,
  state = "idle",
  boss = false,
  scale = 1,
  segments = 1,
  segmentSpacing = 0,
) {
  const p = COLORS[kind] || COLORS.ashling,
    k = x * s + s / 2,
    base = y * s + s * 0.82,
    bob = frame % 2,
    sc = Math.max(0.6, Number(scale) || (boss ? 1.45 : 1));
  if (kind !== "player") {
    if (segments > 1) {
      const [fx, fy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[facing] || [0, 1],
        px = -fy,
        py = fx;
      for (let i = segments - 1; i >= 1; i--) {
        const wave = Math.sin((frame + i) * 0.9) * 0.1,
          cx = k - fx * s * segmentSpacing * i + px * s * wave,
          cy = base - fy * s * segmentSpacing * i + py * s * wave - s * 0.25 * sc;
        ctx.fillStyle = p[i % 2];
        ctx.strokeStyle = p[2];
        ctx.lineWidth = Math.max(1, s * 0.035);
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.27 * sc, s * 0.19 * sc, Math.atan2(fy, fx), 0, 7);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#050504aa";
    ctx.beginPath();
    ctx.ellipse(k, base, s * 0.3 * sc, s * 0.1, 0, 0, 7);
    ctx.fill();
  }
  const rect = (c, a, b, w, h) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.round(k + a * s * sc),
      Math.round(base + b * s * sc - bob),
      Math.max(2, Math.round(w * s * sc)),
      Math.max(2, Math.round(h * s * sc)),
    );
  };
  if(kind==="voidSentinel" || kind==="gateRevenant"){
    ctx.lineCap="round";
    for(let i=0;i<7;i++){
      const side=i%2?-1:1,a=-Math.PI*.15+(i/6)*Math.PI*1.3,wave=Math.sin(Number(frame)*.18+i*1.7)*.18,len=(.48+(i%3)*.12)*s*sc;
      ctx.strokeStyle=i===0&&state==="attack"?"#ff6e89":p[i%2];ctx.lineWidth=Math.max(2,s*.07*sc);ctx.beginPath();ctx.moveTo(k,base-s*.38*sc);ctx.quadraticCurveTo(k+Math.cos(a+wave)*len*.55+side*s*.08,base-s*.38*sc+Math.sin(a+wave)*len*.45,k+Math.cos(a+wave)*len,base-s*.38*sc+Math.sin(a+wave)*len);ctx.stroke();
    }
  }
  if (kind === "player") {
    rect(p[1], -0.22, -0.57, 0.44, 0.5);
    rect(p[0], -0.18, -0.76, 0.36, 0.28);
    rect("#171817", -0.12, -0.69, 0.24, 0.14);
    rect(p[2], -0.07, -0.66, 0.04, 0.04);
    rect(p[2], 0.04, -0.66, 0.04, 0.04);
    rect("#24231f", -0.2, -0.08, 0.13, 0.12);
    rect("#24231f", 0.07, -0.08, 0.13, 0.12);
    rect(p[2], facing === "left" ? -0.38 : 0.2, -0.48, 0.18, 0.05);
  } else if(kind==='vesperwing'){rect(p[1],-.09,-.62,.18,.56);ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(k-s*.08*sc,base-s*.5*sc);ctx.lineTo(k-s*.7*sc,base-s*.85*sc);ctx.lineTo(k-s*.48*sc,base-s*.22*sc);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(k+s*.08*sc,base-s*.5*sc);ctx.lineTo(k+s*.7*sc,base-s*.85*sc);ctx.lineTo(k+s*.48*sc,base-s*.22*sc);ctx.closePath();ctx.fill();rect(p[2],-.07,-.55,.14,.18)}
  else if(kind==='gravitantBell'){ctx.fillStyle=p[0];ctx.beginPath();ctx.ellipse(k,base-s*.48*sc,s*.38*sc,s*.43*sc,0,0,7);ctx.fill();ctx.strokeStyle=p[2];ctx.stroke();for(let q=-2;q<=2;q++)rect(p[1],q*.12,-.18,.06,.28)}
  else if(kind==='mireApostle'){ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(k,base-s*.25*sc,s*.48*sc,s*.32*sc,0,0,7);ctx.fill();rect(p[0],-.32,-.65,.64,.44);rect(p[2],-.08,-.53,.16,.16)}
  else if(kind==='knifeChoir'){rect(p[1],-.2,-.72,.4,.68);for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.strokeStyle=p[0];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(k,base-s*.4*sc);ctx.lineTo(k+Math.cos(a)*s*.55*sc,base-s*.4*sc+Math.sin(a)*s*.45*sc);ctx.stroke()}rect(p[2],-.08,-.62,.16,.14)}
  else if (kind === "glassMite") {
    rect(p[1], -0.31, -0.29, 0.62, 0.22);
    for (const q of [-0.3, -0.1, 0.12, 0.3]) rect(p[0], q, -0.12, 0.05, 0.19);
    rect(p[0], -0.17, -0.48, 0.18, 0.25);
    rect(p[2], -0.09, -0.43, 0.04, 0.1);
    rect(p[0], 0.04, -0.42, 0.15, 0.19);
  } else if (kind === "sparkWarden") {
    rect(p[1], -0.15, -0.7, 0.3, 0.65);
    rect(p[0], -0.2, -0.78, 0.4, 0.16);
    rect(p[2], -0.3, -0.75, 0.05, 0.7);
    for (let q = 0; q < 3; q++) rect(p[2], -0.1, -0.57 + q * 0.15, 0.2, 0.04);
  } else if (kind === "ashenHound") {
    rect(p[1],-.32,-.34,.62,.3);rect(p[0],.12,-.48,.3,.28);rect(p[2],.34,-.42,.06,.06);rect(p[0],-.38,-.45,.2,.09);rect(p[1],-.25,-.12,.08,.18);rect(p[1],.18,-.12,.08,.18);
  } else if (kind === "veilMoth") {
    rect(p[1],-.07,-.55,.14,.5);rect(p[0],-.42,-.62,.34,.35);rect(p[0],.08,-.62,.34,.35);rect(p[2],-.03,-.7,.06,.08);
  } else if (kind === "rootBrute") {
    rect(p[1],-.34,-.62,.68,.6);rect(p[0],-.27,-.82,.54,.27);rect(p[2],-.14,-.73,.08,.05);rect(p[0],-.47,-.5,.16,.52);rect(p[0],.31,-.5,.16,.52);
  } else if (kind === "coilStalker") {
    rect(p[1],-.28,-.5,.56,.42);rect(p[0],-.18,-.7,.36,.24);rect(p[2],-.34,-.4,.68,.06);rect(p[2],-.04,-.62,.08,.08);
  } else if (kind === "cinderWisp") {
    rect(p[1],-.18,-.55,.36,.38);rect(p[0],-.12,-.72,.24,.24);rect(p[2],-.06,-.63,.12,.12);rect(p[2],-.1,-.18,.2,.12);
  } else if (kind === "voidSentinel") {
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(k,base-s*.42*sc,s*.3*sc,s*.36*sc,0,0,7);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=Math.max(2,s*.04);ctx.stroke();rect(p[0],-.2,-.66,.4,.22);rect(p[2],-.07,-.57,.14,.08);
  } else if (kind === "gateRevenant") {
    ctx.fillStyle=p[1];ctx.beginPath();ctx.ellipse(k,base-s*.48*sc,s*.34*sc,s*.4*sc,0,0,7);ctx.fill();ctx.strokeStyle=p[2];ctx.lineWidth=Math.max(2,s*.045);ctx.stroke();rect(p[0],-.31,-.75,.62,.24);rect("#050308",-.17,-.67,.34,.13);rect(p[2],-.12,-.63,.06,.06);rect(p[2],.06,-.63,.06,.06);ctx.fillStyle=p[0];ctx.beginPath();ctx.moveTo(k-s*.25*sc,base-s*.62*sc);ctx.lineTo(k-s*.68*sc,base-s*.94*sc);ctx.lineTo(k-s*.5*sc,base-s*.36*sc);ctx.fill();ctx.beginPath();ctx.moveTo(k+s*.25*sc,base-s*.62*sc);ctx.lineTo(k+s*.68*sc,base-s*.94*sc);ctx.lineTo(k+s*.5*sc,base-s*.36*sc);ctx.fill();
  } else if (kind === "hollowMarshal") {
    rect(p[1], -0.29, -0.66, 0.58, 0.62);
    rect(p[0], -0.36, -0.62, 0.72, 0.18);
    rect(p[0], -0.23, -0.83, 0.46, 0.23);
    rect("#181717", -0.15, -0.75, 0.3, 0.07);
    rect(p[2], 0.3, -0.57, 0.09, 0.48);
  } else if (kind === "riftColossus") {
    rect(p[1], -0.41, -0.72, 0.7, 0.68);
    rect(p[0], -0.49, -0.57, 0.35, 0.48);
    rect(p[0], 0.13, -0.88, 0.38, 0.75);
    rect("#22191a", -0.18, -0.8, 0.28, 0.22);
    rect(p[2], -0.09, -0.7, 0.08, 0.07);
  } else if (kind === "mossGrazer") {
    rect(p[1], -.34, -.35, .62, .28); rect(p[0], .16, -.52, .27, .25); rect(p[2], .33, -.45, .06, .06); rect(p[1], -.24, -.13, .07, .18); rect(p[1], .18, -.13, .07, .18);
  } else if (kind === "lanternDoe") {
    rect(p[1], -.28, -.39, .55, .3); rect(p[0], .12, -.62, .25, .28); rect(p[2], .25, -.55, .07, .07); rect(p[1], -.2, -.14, .06, .22); rect(p[1], .16, -.14, .06, .22); rect(p[2], .19, -.79, .04, .21); rect(p[2], .31, -.79, .04, .21);
  } else if (kind === "hushling") {
    ctx.fillStyle=p[2]+"55";ctx.beginPath();ctx.arc(k,base-s*.4*sc,s*.38*sc,0,7);ctx.fill();rect(p[1],-.18,-.55,.36,.4);rect(p[0],-.13,-.7,.26,.24);rect(p[2],-.05,-.62,.1,.08);
  } else if (kind === "ashling") {
    rect(p[1], -0.2, -0.55, 0.4, 0.5);
    rect(p[0], -0.16, -0.72, 0.32, 0.24);
    rect(p[0], -0.25, -0.83, 0.08, 0.2);
    rect(p[0], 0.17, -0.83, 0.08, 0.2);
    rect(p[2], -0.08, -0.65, 0.04, 0.04);
    rect(p[1], -0.28, -0.28, 0.12, 0.25);
  } else if (kind === "npc" || kind === "shipwright" || kind === "villager" || kind === "militia" || TRAVELER_LOOKS.has(kind)) {
    rect(p[1], -0.22, -0.58, 0.44, 0.56);
    rect(p[0], -0.18, -0.75, 0.36, 0.23);
    rect(p[2], -0.1, -0.68, 0.04, 0.04);
    rect(p[2], 0.06, -0.68, 0.04, 0.04);
    rect(p[0], -0.29, -0.48, 0.1, 0.38);
    if (kind === "peddler") { rect(p[1], -0.42, -0.62, 0.2, 0.34); rect(p[2], -0.4, -0.58, 0.16, 0.05); }
    if (kind === "minstrel") { rect(p[2], 0.2, -0.5, 0.18, 0.22); rect(p[1], 0.26, -0.72, 0.04, 0.24); }
    if (kind === "scholar" || kind === "cartographer") { rect(p[2], 0.22, -0.46, 0.16, 0.2); rect(p[0], -0.24, -0.86, 0.48, 0.1); }
    if (kind === "pilgrim") { rect(p[2], 0.3, -0.95, 0.05, 0.94); rect(p[2], 0.24, -1, 0.17, 0.06); }
    if (kind === "militia" || kind === "mercenary") { rect(p[2], 0.3, -0.95, 0.06, 0.92); rect("#d8d2c4", 0.27, -1.02, 0.12, 0.1); rect(p[2], -0.22, -0.4, 0.44, 0.08); }
  } else {
    rect(p[1], -0.25, -0.42, 0.5, 0.42);
    rect(p[0], -0.18, -0.66, 0.36, 0.3);
    if (kind === "tree" || kind === "treeShrub" || kind === "treeSpindle") {
      if(state === "fallen") { rect(p[1], -.43, -.18, .86, .16); rect(p[0], -.35, -.27, .28, .22); }
      else if(state === "charred") { rect("#29231f", -.09, -.75, .18, .72); rect("#3b2d25", -.3, -.78, .25, .16); }
      else if(kind === "treeShrub") { rect(p[1],-.07,-.35,.14,.31);rect(p[0],-.38,-.48,.34,.31);rect(p[0],.03,-.52,.38,.35);rect(p[2],-.18,-.65,.38,.25); }
      else if(kind === "treeSpindle") { rect(p[1],-.07,-.91,.14,.87);rect(p[0],-.31,-.73,.28,.1);rect(p[0],.03,-.55,.33,.09);rect(p[2],-.22,-1.03,.18,.25); }
      else { rect(p[1], -0.1, -0.82, 0.2, 0.8); rect(p[0], -0.38, -0.86, 0.76, 0.32); rect("#71845b", -.27, -1.02, .54, .22); }
    } else if (kind === "rock" && (state === "moved" || state === "broken")) {
      rect("#4f514d", -.32, -.2, .2, .12); rect("#73766f", -.04, -.16, .24, .1); rect("#3c3f3b", .2, -.12, .13, .08);
    } else if (kind === "checkpoint") {
      rect("#b8f5f2", -0.08, -1.02, 0.16, 0.7);rect("#315c65", -0.32, -0.34, 0.64, 0.2);rect("#72d7df", -0.2, -0.92, 0.4, 0.12);
      ctx.strokeStyle="#d8ffff";ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();ctx.arc(k,base-s*.68,s*.25,Math.PI*.18,Math.PI*1.82);ctx.stroke();
    } else if (kind === "listenerDais") { // release 375: a round dais of dark glass, its rim lit, a column of the line above it
      const t=performance.now()/1000,pulse=.5+.5*Math.sin(t*3);ctx.fillStyle="#120f18";ctx.beginPath();ctx.ellipse(k,base-s*.2,s*.48,s*.2,0,0,7);ctx.fill();ctx.strokeStyle=`rgba(201,166,255,${.55+.4*pulse})`;ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();ctx.ellipse(k,base-s*.2,s*.42,s*.16,0,0,7);ctx.stroke();
      ctx.lineWidth=Math.max(1,s*.03);ctx.beginPath();ctx.ellipse(k,base-s*.2,s*.24,s*.09,t%6.3,0,4.2);ctx.stroke();const g=ctx.createLinearGradient(0,base-s*1.6,0,base-s*.2);g.addColorStop(0,"rgba(201,166,255,0)");g.addColorStop(1,`rgba(201,166,255,${.25+.25*pulse})`);ctx.fillStyle=g;ctx.fillRect(k-s*.18,base-s*1.6,s*.36,s*1.4);
    } else if (kind === "skyStair") { // release 571: pale steps climbing into the air, a glow where they end
      const t=performance.now()/1000,pulse=.5+.5*Math.sin(t*2);ctx.fillStyle="#00000044";ctx.beginPath();ctx.ellipse(k,base,s*.42,s*.12,0,0,7);ctx.fill();
      for(let i=0;i<5;i++){const w=s*(.5-i*.07),y=base-s*(.12+i*.22);ctx.fillStyle=i%2?"#e8e2f4":"#d4cce6";ctx.fillRect(k-w/2,y-s*.12,w,s*.14);ctx.fillStyle="#9c93b866";ctx.fillRect(k-w/2,y,w,s*.03)}
      const g=ctx.createRadialGradient(k,base-s*1.35,0,k,base-s*1.35,s*.5);g.addColorStop(0,`rgba(255,244,214,${.55+.35*pulse})`);g.addColorStop(1,"rgba(255,244,214,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(k,base-s*1.35,s*.5,0,7);ctx.fill();
    } else if (kind === "listeningStone") { // release 373: a dark standing stone with the Listener's violet, ringed like an ear
      ctx.fillStyle="#00000055";ctx.beginPath();ctx.ellipse(k,base,s*.36,s*.1,0,0,7);ctx.fill();
      ctx.fillStyle="#1c1726";ctx.beginPath();ctx.moveTo(k-s*.26,base);ctx.lineTo(k-s*.18,base-s*1.15);ctx.lineTo(k,base-s*1.32);ctx.lineTo(k+s*.18,base-s*1.15);ctx.lineTo(k+s*.26,base);ctx.closePath();ctx.fill();ctx.strokeStyle="#3b3550";ctx.lineWidth=Math.max(1,s*.04);ctx.stroke();
      const pulse=.55+.45*Math.sin(performance.now()/420);ctx.strokeStyle=`rgba(201,166,255,${.5+.4*pulse})`;ctx.lineWidth=Math.max(1.5,s*.05);
      for(const [r,a0,a1] of [[.2,-.4,3.6],[.12,.4,4.6],[.05,0,6.3]]){ctx.beginPath();ctx.arc(k,base-s*.7,s*r,a0,a1);ctx.stroke()}
      ctx.fillStyle="#f3eaff";ctx.beginPath();ctx.arc(k,base-s*1.2,s*.04+pulse*s*.02,0,7);ctx.fill();
    } else if (kind === "townSmith") { // release 395: the town smith: a stone forge with its coals, an anvil, the smith in a leather apron
      const t=performance.now()/1000,heat=.6+.3*Math.sin(t*2.3)+.1*Math.sin(t*7.1);ctx.fillStyle="#00000055";ctx.beginPath();ctx.ellipse(k,base,s*.46,s*.11,0,0,7);ctx.fill();
      rect("#3b3530",-0.46,-0.62,0.3,0.6);rect("#2a2420",-0.44,-0.72,0.26,0.12);ctx.fillStyle=`rgba(255,${Math.round(110+60*heat)},40,${.75*heat})`;ctx.fillRect(k-s*.4,base-s*.36,s*.22,s*.1);
      const g=ctx.createRadialGradient(k-s*.29,base-s*.32,0,k-s*.29,base-s*.32,s*.45);g.addColorStop(0,`rgba(255,140,50,${.35*heat})`);g.addColorStop(1,"rgba(255,140,50,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(k-s*.29,base-s*.32,s*.45,0,7);ctx.fill();
      rect("#4a4d52",-0.02,-0.3,0.3,0.08);rect("#2e3034",0.06,-0.22,0.14,0.2);rect("#3a3d42",0.02,-0.04,0.22,0.05);
      rect("#2c2622",0.3,-0.86,0.18,0.5);rect("#5a3f28",0.28,-0.62,0.22,0.3);ctx.fillStyle="#c79a76";ctx.beginPath();ctx.arc(k+s*.39,base-s*.92,s*.09,0,7);ctx.fill();rect("#1d1916",0.32,-0.36,0.06,0.36);rect("#1d1916",0.42,-0.36,0.06,0.36);
      ctx.strokeStyle="#6b5136";ctx.lineWidth=Math.max(2,s*.04);ctx.beginPath();ctx.moveTo(k+s*.31,base-s*.7);ctx.lineTo(k+s*.14,base-s*.5+Math.sin(t*3)*s*.04);ctx.stroke();rect("#5c6067",0.08,-0.56,0.12,0.07);
    } else if (kind === "shrine") {
      rect("#806f91", -0.06, -0.62, 0.12, 0.5);rect("#4d665f", -0.3, -0.2, 0.6, 0.17);
      ctx.strokeStyle="#8ed1c1";ctx.lineWidth=Math.max(2,s*.055);ctx.beginPath();ctx.arc(k,base-s*.55,s*.25,0,Math.PI*1.45);ctx.stroke();ctx.beginPath();ctx.arc(k,base-s*.55,s*.13,Math.PI*.3,Math.PI*1.8);ctx.stroke();
    } else if (kind === "door" || kind === "dungeon" || kind === "exit") {
      rect(p[0], -0.34, -0.82, 0.68, 0.82);
      rect("#171614", -0.23, -0.66, 0.46, 0.66);
    } else if (kind === "chest" || kind === "cache" || kind === "supplyCache") {
      rect(p[0], -0.3, -0.38, 0.6, 0.35);
      rect(p[2], -0.04, -0.31, 0.08, 0.12);
    }
  }
  if (state === "attack" || state === "telegraph")
    rect(
      state === "telegraph" ? "#c57b55" : p[2],
      facing === "left" ? -0.42 : 0.25,
      -0.45,
      0.17,
      0.05,
    );
}
export function drawWaymarkIcon(ctx,signalKind,s){
  const colors={beacon:'#72d7df',crossing:'#d5a464',danger:'#d16b62',event:'#a68ad2'},c=colors[signalKind]||'#b7b49d';ctx.strokeStyle=c;ctx.fillStyle=c+'22';ctx.lineWidth=Math.max(2,s*.07);ctx.beginPath();
  if(signalKind==='beacon')ctx.arc(0,0,s*.27,0,Math.PI*1.65);
  else if(signalKind==='crossing'){ctx.moveTo(-s*.25,-s*.2);ctx.lineTo(s*.22,0);ctx.lineTo(-s*.25,s*.2);}
  else if(signalKind==='danger'){ctx.moveTo(-s*.22,-s*.25);ctx.lineTo(-s*.22,s*.25);ctx.lineTo(s*.25,0);ctx.closePath();}
  else{ctx.arc(0,0,s*.23,0,Math.PI*1.5);ctx.lineTo(s*.28,0);}
  ctx.fill();ctx.stroke();if(signalKind==='danger'){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(s*.25,0);ctx.lineTo(s*.07,-s*.09);ctx.lineTo(s*.07,s*.09);ctx.closePath();ctx.fill()}return c;
}
function waymark(ctx,o,s){
  const cx=(o.x+.5)*s,cy=(o.y+.55)*s,a=Math.atan2(o.dirY,o.dirX);ctx.save();ctx.translate(cx,cy);ctx.rotate(a);drawWaymarkIcon(ctx,o.signalKind,s);ctx.restore();
}
function shelterSigil(ctx,cx,cy,r,glyph){
  const kind=Math.abs(glyph||0)%4;ctx.beginPath();
  if(kind===0){ctx.arc(cx,cy,r,Math.PI*.25,Math.PI*1.75);ctx.moveTo(cx+r*.2,cy-r*.7);ctx.lineTo(cx+r*.72,cy)}
  else if(kind===1){ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r*.82,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r*.82,cy);ctx.closePath();ctx.moveTo(cx,cy-r*.46);ctx.lineTo(cx+r*.36,cy);ctx.lineTo(cx,cy+r*.46)}
  else if(kind===2){ctx.moveTo(cx-r*.8,cy-r*.7);ctx.quadraticCurveTo(cx,cy-r*.08,cx+r*.8,cy-r*.7);ctx.moveTo(cx,cy-r*.08);ctx.lineTo(cx,cy+r);ctx.moveTo(cx-r*.55,cy+r*.48);ctx.quadraticCurveTo(cx,cy+r*.15,cx+r*.55,cy+r*.48)}
  else{for(let q=0;q<3;q++){const a=-Math.PI/2+q*Math.PI*2/3;ctx.moveTo(cx+Math.cos(a)*r+r*.18,cy+Math.sin(a)*r);ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,r*.18,0,7)}ctx.moveTo(cx,cy-r*.34);ctx.lineTo(cx+r*.3,cy+r*.18);ctx.lineTo(cx-r*.3,cy+r*.18);ctx.closePath()}
  ctx.stroke();
}
function insideShelter(o,p,map){
  const b=o.bounds||{x:o.x-2,y:o.y-2,w:5,h:4},cx=p.x+.5,cy=p.y+.7,inset=.22;
  if(map)return structureOccupancy(map,32,p.x,p.y,o.id)===o.id;
  return cx>b.x+inset&&cx<b.x+b.w-inset&&cy>b.y+inset&&cy<b.y+b.h-inset;
}
function shack(ctx,o,s,p,map){
  const b=o.bounds||{x:o.x-2,y:o.y-2,w:5,h:4},inside=insideShelter(o,p,map),x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s,accent={pilgrim:"#8f7658",relay:"#527d7b",chapel:"#806777",workshop:"#8c5944",stoneCottage:"#8b8170",ruinedKeep:"#9a8168",gatehouse:"#89765f",shrineHouse:"#706986",neonKiosk:"#42b8b2",relayBunker:"#4d8e9c",prismVault:"#a78cce",orbitalPod:"#7ea3bd",ribNest:"#9b647f",carapace:"#735e86"}[o.facadeStyle]||"#8f7658",condition=o.condition||"weathered",grain=(o.signGlyph||0)+b.x*3+b.y*5,masonry=['stoneCottage','ruinedKeep','gatehouse','shrineHouse'].includes(o.facadeStyle);
  ctx.save();
  const meta=structureRenderMeta(o),cells=meta.cells,set=meta.set;
  if(inside){ctx.strokeStyle=accent+"66";ctx.lineWidth=2;if(cells.length){for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}}else ctx.strokeRect(x+s*.08,y+s*.08,w-s*.16,h-s*.16);ctx.restore();return}
  if(cells.length&&o.shape!=='rect'){
   const palette={timber:['#2b2822','#8f7658'],masonry:['#34332e','#8b8170'],ruinedGatehouse:['#302d29','#9a8168'],cyberRelay:['#152b31','#42b8b2'],alienGeometric:['#24243b','#a78cce'],biomechanical:['#30222d','#9b647f']}[o.family]||['#292720',accent];ctx.fillStyle=palette[0];ctx.beginPath();for(const c of cells)ctx.rect(c.x*s,c.y*s,s+1,s+1);ctx.fill();ctx.strokeStyle=palette[1];ctx.lineWidth=2;for(const c of cells){for(const [dx,dy,ax,ay,bx,by]of[[-1,0,0,0,0,1],[1,0,1,0,1,1],[0,-1,0,0,1,0],[0,1,0,1,1,1]])if(!set.has(`${c.x+dx},${c.y+dy}`)){ctx.beginPath();ctx.moveTo((c.x+ax)*s,(c.y+ay)*s);ctx.lineTo((c.x+bx)*s,(c.y+by)*s);ctx.stroke()}}
   ctx.globalAlpha=.38;for(const c of cells)if(((c.x*3+c.y+grain)&3)===0){ctx.fillStyle=o.family==='cyberRelay'?'#65fff0':o.family==='biomechanical'?'#ca6e9e':'#d7c79a';ctx.beginPath();ctx.arc((c.x+.5)*s,(c.y+.5)*s,s*(o.family==='biomechanical'?.22:.1),0,7);ctx.fill()}ctx.globalAlpha=1;const door=o.door||cells[cells.length-1];ctx.fillStyle='#090b0b';ctx.fillRect((door.x+.16)*s,(door.y+.08)*s,s*Math.max(.65,(door.width||1)-.32),s*.84);ctx.strokeStyle=accent;ctx.strokeRect((door.x+.16)*s,(door.y+.08)*s,s*Math.max(.65,(door.width||1)-.32),s*.84);ctx.fillStyle='#c8bda4';ctx.font=`${Math.max(8,s*.18)}px monospace`;ctx.textAlign='center';ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.12);ctx.textAlign='start';ctx.restore();return;
  }
  const backY=y+s*.16,frontY=y+h-s*3.12,skew=s*.38,wallTop=frontY+s*.18;ctx.fillStyle=masonry?(condition==="kept"?"#39372f":"#302f2a"):(condition==="kept"?"#302d27":"#282720");ctx.fillRect(x,wallTop,w,Math.max(0,y+h-wallTop));
  ctx.fillStyle=masonry?"#686052":"#3a362d";for(let q=wallTop-y+s*.08,n=0;q<h;q+=s*(masonry?.3:.45+((grain+n)%3)*.04),n++){const inset=((grain+n*7)%5)*s*.035;ctx.fillRect(x+inset,y+q,w-inset-s*((grain+n)%4===0?.12:0),s*(masonry?.07:.055+((grain+n)%2)*.035))}
  if(masonry){ctx.strokeStyle="#17181588";ctx.lineWidth=1;for(let yy=wallTop+s*.32,row=0;yy<y+h;yy+=s*.32,row++){ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);ctx.stroke();for(let xx=x+s*(row%2?.5:1);xx<x+w;xx+=s){ctx.beginPath();ctx.moveTo(xx,yy-s*.32);ctx.lineTo(xx,yy);ctx.stroke()}}}
  ctx.strokeStyle=accent+"88";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+s*.08,wallTop);ctx.lineTo(x+s*.06,y+h-s*.08);ctx.moveTo(x+w-s*.07,wallTop);ctx.lineTo(x+w-s*.12,y+h-s*.06);ctx.stroke();
  ctx.fillStyle=o.roofProfile==="gable"?"#39342b":"#35312a";ctx.strokeStyle=accent+"88";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+s*.2,backY);ctx.lineTo(x+w-s*.2,backY);ctx.lineTo(x+w+skew,frontY);ctx.lineTo(x-skew,frontY);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="#5a514188";ctx.lineWidth=1;for(let q=.18;q<1;q+=.16){const yy=backY+(frontY-backY)*q;ctx.beginPath();ctx.moveTo(x+s*.2-skew*q,yy);ctx.lineTo(x+w-s*.2+skew*q,yy);ctx.stroke()}
  if(o.roofProfile==="gable"){ctx.strokeStyle=accent+"99";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w*.5,backY-s*.04);ctx.lineTo(x+w*.5,frontY+s*.04);ctx.stroke();ctx.fillStyle="#17171433";ctx.beginPath();ctx.moveTo(x+s*.2,backY);ctx.lineTo(x+w*.5,backY);ctx.lineTo(x+w*.5,frontY);ctx.lineTo(x-skew,frontY);ctx.closePath();ctx.fill()}
  if(o.roofProfile==="stepped"){ctx.fillStyle="#24211d";ctx.strokeStyle=accent+"77";ctx.lineWidth=2;ctx.fillRect(x+w*.3,y+(frontY-y)*.32,w*.4,s*.5);ctx.strokeRect(x+w*.3,y+(frontY-y)*.32,w*.4,s*.5)}
  if(o.facadeStyle==="ruinedKeep"||o.facadeStyle==="gatehouse"){ctx.fillStyle=accent+"cc";for(let q=0;q<5;q++)if(q!==2||o.facadeStyle==="gatehouse")ctx.fillRect(x+q*w/5,frontY-s*.18,w/10,s*.28)}
  ctx.fillStyle="#211f1b";ctx.strokeStyle=accent+"99";ctx.beginPath();ctx.moveTo(x-skew,frontY);ctx.lineTo(x+w+skew,frontY);ctx.lineTo(x+w+s*.12,frontY+s*.22);ctx.lineTo(x-s*.12,frontY+s*.22);ctx.closePath();ctx.fill();ctx.stroke();
  if(condition==="collapsed"){ctx.fillStyle="#10110f";ctx.beginPath();ctx.moveTo(x+w*.62,y+s*.56);ctx.lineTo(x+w*.74,y+s*.38);ctx.lineTo(x+w*.82,y+s*.82);ctx.lineTo(x+w*.68,y+s*1.08);ctx.closePath();ctx.fill()}
  const door=o.door||{x:b.x+Math.floor(b.w/2),y:b.y+b.h-1,width:1},doorWidth=Math.max(1,door.width||1),dx=(door.x+.15)*s,dy=(door.y+.05)*s,dw=(doorWidth-.3)*s;ctx.fillStyle="#0c0d0c";ctx.fillRect(dx,dy,dw,s*.95);ctx.strokeStyle=accent+"aa";ctx.lineWidth=2;ctx.strokeRect(dx,dy,dw,s*.95);
  const windows=Math.max(2,Math.floor(b.w/2));for(let q=0;q<windows;q++){const wx=x+s*.65+q*(w-s*1.3)/Math.max(1,windows-1);if(wx>(door.x-.15)*s&&wx<(door.x+doorWidth+.15)*s||condition==="collapsed"&&(q+grain)%3===0)continue;ctx.fillStyle=o.facadeStyle==="relay"?"#557f7b55":"#ad8b5d33";ctx.fillRect(wx-s*.28,y+h-s*.72,s*.56,s*.3);ctx.strokeStyle=accent+"77";ctx.strokeRect(wx-s*.28,y+h-s*.72,s*.56,s*.3);if(condition!=="kept"&&(q+grain)%2===0){ctx.beginPath();ctx.moveTo(wx-s*.32,y+h-s*.68);ctx.lineTo(wx+s*.31,y+h-s*.43);ctx.moveTo(wx+s*.3,y+h-s*.7);ctx.lineTo(wx-s*.3,y+h-s*.42);ctx.stroke()}}
  if(condition==="patched"||condition==="collapsed"){ctx.fillStyle="#4a4031aa";const px=x+w*(.2+Math.abs(grain%4)*.13);ctx.fillRect(px,y+h-s*1.42,s*.85,s*.68);ctx.strokeStyle="#74624c99";ctx.strokeRect(px,y+h-s*1.42,s*.85,s*.68)}
  if(condition!=="kept"){ctx.strokeStyle="#6c5b43aa";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+s*.18,y+h-s*.18);ctx.lineTo(x+s*1.22,wallTop+s*.12);if(condition==="collapsed"){ctx.moveTo(x+w-s*.22,y+h-s*.14);ctx.lineTo(x+w-s*1.35,wallTop)}ctx.stroke()}
  if(condition==="overgrown"){ctx.strokeStyle="#435a3f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w-s*.18,y+h);ctx.quadraticCurveTo(x+w-s*.85,y+h*.62,x+w-s*.38,wallTop);ctx.quadraticCurveTo(x+w-s*.08,y+s*1.08,x+w-s*.55,y+s*.62);ctx.stroke()}
  ctx.strokeStyle=accent+"bb";ctx.lineWidth=2;shelterSigil(ctx,x+w*.5,frontY-s*.42,s*.16,o.signGlyph);ctx.fillStyle="#c8bda4";ctx.font=`${Math.max(8,s*.18)}px monospace`;ctx.textAlign="center";ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.12);ctx.textAlign="start";ctx.restore();
}
function architecturalBuilding(ctx,o,s,p,map){
  const meta=structureRenderMeta(o),b=o.bounds,inside=structureOccupancy(map,32,p.x,p.y,o.id)===o.id,colors={city:["#393a3f","#858188"],arcology:["#18333b","#58a0a6"],cloister:["#3b2d35","#9a737f"],fortress:["#302b27","#9b8268"]}[o.districtStyle]||["#333","#888"],accent={copper:"#b37954",ivory:"#d5c8a7",oxide:"#9a6457",violet:"#9278a8"}[o.accent]||colors[1],cells=meta.cells,set=meta.set;
  ctx.save();if(inside){ctx.strokeStyle=accent+"77";ctx.lineWidth=2;for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}ctx.restore();return}
  ctx.fillStyle=colors[0];ctx.beginPath();for(const c of cells)ctx.rect(c.x*s,c.y*s,s+1,s+1);ctx.fill();ctx.globalAlpha=.28;ctx.fillStyle=colors[1];for(const c of cells)if(((c.x+c.y+o.signGlyph)&3)===0)ctx.fillRect(c.x*s+s*.12,c.y*s+s*.12,s*.76,s*.12);ctx.globalAlpha=1;
  const x=b.x*s,y=b.y*s,w=b.w*s,h=b.h*s;ctx.strokeStyle=accent;ctx.lineWidth=3;for(const c of cells){if(!set.has(`${c.x-1},${c.y}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo(c.x*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x+1},${c.y}`)){ctx.beginPath();ctx.moveTo((c.x+1)*s,c.y*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s,c.y*s);ctx.lineTo((c.x+1)*s,c.y*s);ctx.stroke()}if(!set.has(`${c.x},${c.y+1}`)){ctx.beginPath();ctx.moveTo(c.x*s,(c.y+1)*s);ctx.lineTo((c.x+1)*s,(c.y+1)*s);ctx.stroke()}}if((o.shape==='rect'||o.shape==='keep')&&(o.roofProfile==='gable'||o.roofProfile==='spire')){ctx.beginPath();ctx.moveTo(x+s*.18,y+h*.48);ctx.lineTo(x+w*.5,y+(o.roofProfile==='spire'?s*.12:h*.2));ctx.lineTo(x+w-s*.18,y+h*.48);ctx.stroke()}else if(o.districtStyle==='fortress'){ctx.fillStyle=accent+"bb";for(const c of cells)if(!set.has(`${c.x},${c.y-1}`)&&(c.x+c.y)%2===0)ctx.fillRect(c.x*s+s*.12,c.y*s-s*.12,s*.42,s*.3)}else{ctx.strokeStyle=accent+"66";ctx.lineWidth=1;for(const c of cells)if(!set.has(`${c.x},${c.y-1}`)){ctx.beginPath();ctx.moveTo(c.x*s+s*.12,c.y*s+s*.25);ctx.lineTo((c.x+1)*s-s*.12,c.y*s+s*.25);ctx.stroke()}}
  const doorX=(o.door.x+.12)*s,doorY=(o.door.y+.05)*s;ctx.fillStyle="#090b0b";ctx.fillRect(doorX,doorY,s*.76,s*.9);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(doorX,doorY,s*.76,s*.9);const frontTileY=o.door.side==='north'?b.y:b.y+b.h-1,frontY=o.door.side==='north'?y+s*.32:y+h-s*.58,step=o.facadeRhythm==='narrow'?1:o.facadeRhythm==='broad'?3:2;ctx.fillStyle=accent+"bb";for(let q=1;q<b.w-1;q+=step)if(set.has(`${b.x+q},${frontTileY}`)&&Math.abs(b.x+q-o.door.x)>1)ctx.fillRect(x+q*s+s*.18,frontY,s*.5,s*.2);
  ctx.fillStyle=accent;ctx.beginPath();const gx=(o.door.x+.5)*s,gy=o.door.side==='north'?doorY+s*1.18:doorY-s*.28,r=s*.18;for(let q=0;q<4;q++){const a=(o.signGlyph+q)*Math.PI/2,px=gx+Math.cos(a)*r,py=gy+Math.sin(a)*r;q?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke();ctx.fillStyle="#dfd4b2";ctx.font=`${Math.max(8,s*.2)}px monospace`;ctx.textAlign="center";ctx.fillText(o.name.toUpperCase(),x+w/2,y-s*.2);ctx.textAlign="start";ctx.restore();
}
// Release 159: the overworld's ground (tiles, trails and cliffs) was repainted tile by tile every frame,
// about ten times the dungeon's paint cost. It is now drawn once per section into an offscreen image at the screen's
// pixel scale and blitted each frame; only animated landscape overlays (water, lava, glow) are redrawn per frame.
// The image is rebuilt when the map, tile size, scale or occupied building changes, or when any tile is replaced or
// changes kind, blocking or elevation. Without an offscreen canvas (tests, old browsers) the per-tile path is used.
const GROUND_MAX_PIXELS = 8.4e6; // ~32 MB; larger sections are cached at a reduced scale
const ground = { canvas: null, map: null, s: 0, scale: 0, building: null, top: 0, reveal: null, revealSize: 0, revealIds: null, refs: [], kinds: [], blocked: [], elev: [], scarSurface: null };
function makeGroundCanvas() { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1); if (typeof document !== "undefined") return document.createElement("canvas"); return null; }
function drawGroundCache(ctx, g, s, mw, mh, activeBuildingId, view, scarSurface) {
  const T = g.map?.tiles, m = typeof ctx.getTransform === "function" ? ctx.getTransform() : null;
  if (!T || T.length !== mw * mh || !m || typeof ctx.drawImage !== "function") return false;
  // Dungeons (release 159) also cache their fog: the image changes whenever discovery installs a new revealed set.
  const dungeon = g.area === "dungeon", reveal = dungeon ? (g.map._dungeonRevealMode === "full" ? "full" : g.map._dungeonRevealed || null) : null, revealSize = reveal && reveal !== "full" ? reveal.size : 0;
  let dirty = !ground.canvas || ground.map !== g.map || ground.s !== s || ground.building !== activeBuildingId || ground.refs.length !== T.length || ground.scarSurface !== scarSurface;
  if (!dirty) for (let i = 0; i < T.length; i++) { const q = T[i]; if (q !== ground.refs[i] || q.kind !== ground.kinds[i] || q.blocked !== ground.blocked[i] || q.elev !== ground.elev[i]) { dirty = true; break; } }
  let top = 0; if (dirty) for (const q of T) top = Math.max(top, landscapeTileLift(q, s));
  const want = Math.hypot(m.a, m.b) || 1, fit = Math.sqrt(GROUND_MAX_PIXELS / (mw * s * (mh * s + (dirty ? top : ground.top)))), scale = Math.min(want, fit);
  if (dungeon && fit < want) return false; // a large dungeon at high pixel density would cache blurred: draw it per tile
  if (!dirty && Math.abs(scale - ground.scale) > 1e-6) dirty = true;
  // Release 165: exploring a dungeon reveals chunks one at a time. Redrawing the whole image for each (up to 4096
  // tiles, about once a second while exploring) was a visible hitch, so newly revealed chunks are repainted in place.
  let added = null;
  if (!dirty && (ground.reveal !== reveal || ground.revealSize !== revealSize)) {
    const was = ground.revealIds, now = reveal && reveal !== "full" ? reveal : null;
    if (was && now && [...was].every((id) => now.has(id))) added = [...now].filter((id) => !was.has(id)); else dirty = true;
  }
  const seen = (x, y) => !dungeon || dungeonTileVisibility(g.map, x, y) !== "unseen";
  if (!dirty && added?.length) {
    const gc = ground.canvas.getContext("2d"), reach = Math.ceil(ground.top / s) + 2; // fog hatching and tile edges paint up to a tile past their own square
    setLandscapeStaticPass(true);
    try {
      for (const id of added) {
        const c = /:(\d+),(\d+)$/.exec(id); if (!c) continue;
        const x0 = Number(c[1]) * DUNGEON_CHUNK_SIZE, y0 = Number(c[2]) * DUNGEON_CHUNK_SIZE, x1 = Math.min(mw, x0 + DUNGEON_CHUNK_SIZE), y1 = Math.min(mh, y0 + DUNGEON_CHUNK_SIZE);
        if (x0 >= mw || y0 >= mh) continue;
        // Clip to the chunk grown by one tile on every side (a neighbour's fog hatching reaches into it) plus the band its
        // raised tiles reach, then repaint, in order, every tile that can paint there: the region then matches a full
        // rebuild exactly.
        const cx0 = Math.max(0, x0 - 1) * s, cx1 = Math.min(mw, x1 + 1) * s, cy0 = Math.max(0, y0 - 1) * s - ground.top, cy1 = Math.min(mh, y1 + 1) * s;
        gc.save(); gc.beginPath(); gc.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); gc.clip(); gc.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
        for (let y = Math.max(0, y0 - 1 - reach); y < Math.min(mh, y1 + 1 + reach); y++) for (let x = Math.max(0, x0 - 3); x < Math.min(mw, x1 + 3); x++) { if (!seen(x, y)) fogTile(gc, x, y, s); else tile(gc, T[y * mw + x], x, y, s, T, mw, activeBuildingId, scarSurface); }
        gc.restore();
      }
    } finally { setLandscapeStaticPass(false); }
    Object.assign(ground, { reveal, revealSize, revealIds: new Set(reveal) });
    renderCacheStats.groundPatches = (renderCacheStats.groundPatches || 0) + added.length;
  } else if (!dirty && added) Object.assign(ground, { reveal, revealSize, revealIds: new Set(reveal) });
  if (dirty) {
    const c = ground.canvas || (ground.canvas = makeGroundCanvas()); if (!c) return false;
    // Release 167: a section of the same size reuses the image rather than reallocating it (tens of milliseconds on a
    // phone, on every section crossing).
    const cw = Math.ceil(mw * s * scale), ch = Math.ceil((mh * s + top) * scale);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const gc = c.getContext("2d"); if (!gc) { ground.canvas = null; return false; }
    gc.setTransform(1, 0, 0, 1, 0, 0); gc.clearRect(0, 0, cw, ch);
    gc.setTransform(scale, 0, 0, scale, 0, top * scale); gc.imageSmoothingEnabled = false;
    setLandscapeStaticPass(true);
    try { for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { if (!seen(x, y)) fogTile(gc, x, y, s); else tile(gc, T[y * mw + x], x, y, s, T, mw, activeBuildingId, scarSurface); } }
    finally { setLandscapeStaticPass(false); }
    Object.assign(ground, { map: g.map, s, scale, building: activeBuildingId, scarSurface, top, reveal, revealSize, revealIds: reveal && reveal !== "full" ? new Set(reveal) : null, refs: T.slice(), kinds: T.map((q) => q.kind), blocked: T.map((q) => q.blocked), elev: T.map((q) => q.elev) });
    renderCacheStats.groundBuilds = (renderCacheStats.groundBuilds || 0) + 1;
  }
  // Copy only the part on screen (view: visible tile bounds), rather than handing the browser the whole image to clip.
  const k = ground.scale, sx = Math.max(0, view.l * s), sy = Math.max(0, view.t * s), ex = Math.min(mw * s, view.r * s), ey = Math.min(mh * s + ground.top, view.b * s + ground.top);
  if (ex > sx && ey > sy) ctx.drawImage(ground.canvas, sx * k, sy * k, (ex - sx) * k, (ey - sy) * k, sx, sy - ground.top, ex - sx, ey - sy);
  return true;
}
// Permanent scars are one derived transparent raster layer, composited after animated terrain.
// Retained circle history never adds per-frame clip operations; geometry work happens only on a cache miss.
const scarOverlay = { canvas:null, map:null, surface:null, s:0, scale:0, want:0, width:0, height:0, reveal:null, revealSize:0, area:null, x0:0, y0:0, x1:0, y1:0 };
function drawVoidScarOverlay(ctx,g,s,mw,mh,view,surface){
  if(!surface.shapes.length)return;
  const m=typeof ctx.getTransform==='function'?ctx.getTransform():null;
  if(!m||typeof ctx.drawImage!=='function'){drawVoidScarSurface(ctx,g,s,mw,mh,surface);return}
  const want=Math.hypot(m.a,m.b)||1;
  const reveal=g.area==='dungeon'&&g.map.dungeonContract?.discoveryEnabled?(g.map._dungeonRevealMode==='full'?'full':g.map._dungeonRevealed||null):'full',revealSize=reveal&&reveal!=='full'?reveal.size:0;
  const covered=view.l*s>=scarOverlay.x0&&view.t*s>=scarOverlay.y0&&view.r*s<=scarOverlay.x1&&view.b*s<=scarOverlay.y1;
  if(!scarOverlay.canvas||scarOverlay.map!==g.map||scarOverlay.surface!==surface||scarOverlay.s!==s||scarOverlay.want!==want||scarOverlay.width!==mw||scarOverlay.height!==mh||scarOverlay.reveal!==reveal||scarOverlay.revealSize!==revealSize||scarOverlay.area!==g.area||!covered){
    const canvas=scarOverlay.canvas||(scarOverlay.canvas=makeGroundCanvas());
    if(!canvas){drawVoidScarSurface(ctx,g,s,mw,mh,surface);return}
    // Large dungeons keep a padded, chunk-aligned viewport raster at native pixel scale instead of
    // downsampling the whole map or falling back to historical-circle work every frame.
    const full=mw*s*mh*s*want*want<=GROUND_MAX_PIXELS,chunk=8;
    const x0=full?0:Math.max(0,Math.floor(view.l/chunk)*chunk)*s,y0=full?0:Math.max(0,Math.floor(view.t/chunk)*chunk)*s;
    const x1=full?mw*s:Math.min(mw,Math.ceil(view.r/chunk)*chunk)*s,y1=full?mh*s:Math.min(mh,Math.ceil(view.b/chunk)*chunk)*s;
    const scale=Math.min(want,Math.sqrt(GROUND_MAX_PIXELS/((x1-x0)*(y1-y0))));
    const cw=Math.max(1,Math.floor((x1-x0)*scale)),ch=Math.max(1,Math.floor((y1-y0)*scale));
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
    const gc=canvas.getContext('2d');
    if(!gc){scarOverlay.canvas=null;drawVoidScarSurface(ctx,g,s,mw,mh,surface);return}
    gc.setTransform(1,0,0,1,0,0);gc.clearRect(0,0,cw,ch);gc.setTransform(scale,0,0,scale,-x0*scale,-y0*scale);
    drawVoidScarSurface(gc,g,s,mw,mh,surface);
    Object.assign(scarOverlay,{map:g.map,surface,s,scale,want,width:mw,height:mh,reveal,revealSize,area:g.area,x0,y0,x1,y1});
    renderCacheStats.scarBuilds=(renderCacheStats.scarBuilds||0)+1;
    renderCacheStats.scarPixels=cw*ch;renderCacheStats.scarScale=scale;
  }
  const sx=Math.max(scarOverlay.x0,view.l*s),sy=Math.max(scarOverlay.y0,view.t*s),ex=Math.min(scarOverlay.x1,view.r*s),ey=Math.min(scarOverlay.y1,view.b*s),k=scarOverlay.scale;
  if(ex>sx&&ey>sy){ctx.drawImage(scarOverlay.canvas,(sx-scarOverlay.x0)*k,(sy-scarOverlay.y0)*k,(ex-sx)*k,(ey-sy)*k,sx,sy,ex-sx,ey-sy);renderCacheStats.scarBlits=(renderCacheStats.scarBlits||0)+1}
}
// The warm tint and vignette over the whole screen (release 167: painted once into a screen-sized image and copied each
// frame; filling the radial gradient anew every frame was the costliest single draw when Firefox renders on the CPU).
function drawScreenOverlay(ctx, w, h) {
  const m = typeof ctx.getTransform === "function" ? ctx.getTransform() : null, cw = ctx.canvas?.width, ch = ctx.canvas?.height;
  if (!m || !Number.isFinite(cw) || !Number.isFinite(ch) || !cw || !ch || typeof ctx.drawImage !== "function") return false;
  let o = render.overlay;
  if (!o || o.cw !== cw || o.ch !== ch || o.w !== w || o.h !== h || o.a !== m.a || o.d !== m.d) {
    const c = makeGroundCanvas(); if (!c) return false;
    c.width = cw; c.height = ch;
    const x = c.getContext("2d"); if (!x) return false;
    x.setTransform(m.a, 0, 0, m.d, 0, 0);
    x.fillStyle = "#5c4a3b0c"; x.fillRect(0, 0, w, h);
    const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.26, w / 2, h / 2, Math.max(w, h) * 0.7);
    v.addColorStop(0, "#0000"); v.addColorStop(1, "#080a0870");
    x.fillStyle = v; x.fillRect(0, 0, w, h);
    o = render.overlay = { canvas: c, cw, ch, w, h, a: m.a, d: m.d };
  }
  ctx.drawImage(o.canvas, 0, 0, w, h);
  return true;
}
export function render(ctx, g, w, h, now) {
  const timed = renderTimings.on, t0 = timed ? performance.now() : 0;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#141816";
  ctx.fillRect(0, 0, w, h);
  const budget = presentationBudget(g.presentation, g.area),
    s = Math.round(Math.max(28, Math.min(44, w / 12))),
    p = g.player,
    mw = Math.max(1,Number(g.map?.width)||(g.area === "dungeon" ? 24 : 32)),
    mh = Math.max(1,Number(g.map?.height)||Math.floor(g.map.tiles.length/mw)),
    l = Math.max(0, Math.floor(p.x - w / s / 2) - 2),
    t = Math.max(0, Math.floor(p.y - h / s / 2) - 2),
    r = Math.min(mw, l + Math.ceil(w / s) + 5),
    b = Math.min(mh, t + Math.ceil(h / s) + 5),
    jumping = now < (g.jumpUntil || 0),
    lift = jumpLift(g, now) * s,
    dodging = now < (p.dodgeUntil || 0);
  const objectLists=mapObjectLists(g.map), scarSurface=voidScarSurface(g.map,g.area);
  renderCacheStats.visibleTiles=(r-l)*(b-t);
  renderCacheStats.visibleObjects=0;
  const activeBuildingId=structureOccupancy(g.map.tiles,mw,p.x,p.y),activeShelter=objectLists.shelters.find(o=>o.id===activeBuildingId&&renderableObject(g,o));
  setLandscapeClock(now);
  const groundLift = (x, y) => (g.map?.landscape ? liftAt(g.map, mw, x, y) : 0);
  const crystalLift = e => crystalFlightLift(g.map, mw, e.x, e.y);
  const marineAt = e => g.area === "overworld" && isMarineTile(tileUnder(g.map, mw, e.x, e.y));
  ctx.save();
  ctx.translate(Math.round(w / 2 - p.x * s), Math.round(h / 2 - (p.y - groundLift(p.x, p.y)) * s));
  cloudSky = !!g.map?.skyCloud; // release 589
  const groundCached = (g.area === "overworld" || g.area === "dungeon") && drawGroundCache(ctx, g, s, mw, mh, activeBuildingId, { l, t, r, b }, scarSurface);
  if (groundCached) {
    const animated = render.animatedTiles || (render.animatedTiles = []), glitter = render.chasmGlitter || (render.chasmGlitter = []); animated.length = 0; glitter.length = 0;
    for (let y = t; y < b; y++) for (let x = l; x < r; x++) {
      const q = g.map.tiles[y * mw + x];
      if (q?.chasm && (x + y * 3) % CHASM_STARS.twinkleEvery === 0 && dungeonTileVisibility(g.map, x, y) !== "unseen") glitter.push(q, x, y); // release 593
      // In a dungeon, a lethal tile right beside the Wayfarer shows through the fog (as the per-tile path always did).
      if (g.area === "dungeon" && LETHAL_KINDS.has(q?.kind) && Math.hypot(x - p.x, y - p.y) < 2.6 && dungeonTileVisibility(g.map, x, y) === "unseen") tile(ctx, q, x, y, s, g.map.tiles, mw, activeBuildingId, scarSurface);
      else if (landscapeTileAnimated(q) && (g.area !== "dungeon" || dungeonTileVisibility(g.map, x, y) !== "unseen")) animated.push(q, x, y);
    }
    animateLandscapeTiles(ctx, animated, s); // release 185: one stroke per water kind, not one per tile
    if (glitter.length) glitterChasm(ctx, glitter, s, now);
    if (g.map.movers?.length) drawRafts(ctx, g, s, now); // release 613
  }
  else for (let y = t; y < b; y++)
    for (let x = l; x < r; x++) {
      if(g.area==="dungeon"&&dungeonTileVisibility(g.map,x,y)==="unseen"&&!(LETHAL_KINDS.has(g.map.tiles[y*mw+x]?.kind)&&Math.hypot(x-p.x,y-p.y)<2.6)){fogTile(ctx,x,y,s);continue}
      tile(ctx, g.map.tiles[y * mw + x], x, y, s, g.map.tiles, mw,activeBuildingId, scarSurface);
    }
  drawVoidScarOverlay(ctx,g,s,mw,mh,{l,t,r,b},scarSurface);
  const t1 = timed ? performance.now() : 0;
  for(const h of g.eliteHazards||[])if(visibleInCamera(h,l,t,r,b,h.radius||2)){const root=h.kind==='root-eruption',arming=h.arming>0;ctx.fillStyle=root?(arming?'#d1a75d22':'#758f3f66'):"#81994a55";ctx.strokeStyle=root?(arming?'#efd389cc':'#b7ce68dd'):"#b7ce6877";ctx.lineWidth=arming?3:2;ctx.beginPath();ctx.ellipse((h.x+.5)*s,(h.y+.65)*s,h.radius*s,h.radius*s*.55,0,0,7);ctx.fill();ctx.stroke();if(root){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.moveTo((h.x+.5)*s,(h.y+.65)*s);ctx.lineTo((h.x+.5+Math.cos(a)*h.radius)*s,(h.y+.65+Math.sin(a)*h.radius*.55)*s)}ctx.stroke()}}
  if(g.area==="overworld"&&g.seaHazards)drawSeaHazards(ctx,g.seaHazards,s,now,l,t,r,b,g.map);
  const seenTile=(x,y)=>g.area!=="dungeon"||dungeonTileVisibility(g.map,x,y)!=="unseen";
  drawHazardBrinks(ctx,g.map,mw,l,t,r,b,s,seenTile); // per frame: brinks sit over animated water, as before
  drawTraversalCues(ctx,g.map,mw,p,s,now,g.ledgeHint,seenTile);
  // Active combat effects, including Supernova, intentionally paint over fog. They never reveal tiles or actors.
  drawPackEffects(ctx,g.packEffects,s,now,(f)=>visibleInCamera(f,l,t,r,b,Math.max(3,f.radius||0,f.length||0)),(f)=>groundLift(f.x,f.y),g.presentation);
  drawMorphEffects(ctx,g.enemies,s,now); // release 385: the Morphling's cables, jaw, lunge and rising
  drawPackTelegraphs(ctx,g.enemies.filter(e=>e.packKind&&discoveredInDungeon(g,e)),s,now,(e)=>visibleInCamera(e,l,t,r,b,10),{ ground: groundLift, body: crystalLift, reduceMotion: !!(g.presentation?.reduceMotion || g.presentation?.safeMode) });
  for(const e of g.enemies)if(!e.dead&&discoveredInDungeon(g,e)&&e.eliteWindup>0&&visibleInCamera(e,l,t,r,b,e.kind==='gravitantBell'?6:3)){ctx.strokeStyle=DANGER.edge;ctx.lineWidth=3;/* release 397: the uniform warning colour */ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc((e.x+.5)*s,(e.y+.4)*s,(e.kind==='gravitantBell'?6:2.3)*s,0,7);ctx.stroke();ctx.setLineDash([])}
  for (const e of g.enemies)
    if (!e.dead && discoveredInDungeon(g,e) && e.telegraph > 0 && visibleInCamera(e,l,t,r,b,e.threatRange||2)) {
      const pulse = e.threatRange||(.65 + (0.9 - e.telegraph) * 0.2);
      ctx.fillStyle = DANGER.fill; // release 397: the uniform warning colour
      ctx.strokeStyle = DANGER.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (e.meleePhase) {
        const q=enemyMeleeGeometry(e),x=q.x*s,y=q.y*s,padding=.38,range=(q.range+padding)*s;
        if(q.kind==='stab') {
          const width=(q.width+padding)*s, px=-q.dy*width,py=q.dx*width;
          ctx.moveTo(x+px,y+py);ctx.lineTo(x+q.dx*range+px,y+q.dy*range+py);ctx.lineTo(x+q.dx*range-px,y+q.dy*range-py);ctx.lineTo(x-px,y-py);ctx.closePath();
        } else if(q.kind==='slam') ctx.arc(x,y,range,0,Math.PI*2);
        else {const a=Math.atan2(q.dy,q.dx),half=q.arc*Math.PI/360;ctx.moveTo(x,y);ctx.arc(x,y,range,a-half,a+half);ctx.closePath();}
      } else ctx.arc((e.x+.5)*s,(e.y+.45)*s,s*pulse,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
  for (const e of g.enemies) if(!e.dead && e.strike>0 && e.strikeGeometry && discoveredInDungeon(g,e)) {
    const q=e.strikeGeometry;
    if(!visibleInCamera({x:q.x,y:q.y},l,t,r,b,q.range))continue;
    ctx.strokeStyle=e.tentacles?'#927d9dcc':'#c2a77dcc';ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();
    if(q.kind==='stab'){ctx.moveTo(q.x*s,q.y*s);ctx.lineTo((q.x+q.dx*q.range)*s,(q.y+q.dy*q.range)*s)}
    else if(q.kind==='slam')ctx.arc(q.x*s,q.y*s,q.radius*s,0,Math.PI*2);
    else{const a=Math.atan2(q.dy,q.dx),half=q.arc*Math.PI/360;ctx.arc(q.x*s,q.y*s,q.range*s,a-half,a+half)}
    ctx.stroke();
  }
  if (dodging) {
    ctx.globalAlpha = 0.28;
    actor(
      ctx,
      p.x - (p.dodgeX || 0) * 0.32,
      p.y - (p.dodgeY || 0) * 0.32,
      s,
      "player",
      p.facing,
      0,
      "walk",
    );
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#9a8a6966";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      (p.x - (p.dodgeX || 0) * 0.7 + 0.5) * s,
      (p.y - (p.dodgeY || 0) * 0.7 + 0.75) * s,
    );
    ctx.lineTo((p.x + 0.5) * s, (p.y + 0.75) * s);
    ctx.stroke();
  }
  if (g.area === "dungeon" && g.map.wallGlints?.length) for (const q of g.map.wallGlints) if (visibleInCamera(q, l, t, r, b) && discoveredInDungeon(g, q)) drawWallGlint(ctx, q, s, now); // release 225
  const draws = [];
  for (const o of g.map.objects)
    if (renderableObject(g,o)&&discoveredInDungeon(g,o)&&visibleInCamera(o,l,t,r,b,o.vegetationForm==="giant"?GIANT_TREE.height+3:2)&&!(o.kind === "cache" && o.state === "hidden")&&!(o.kind==="displacementTrap"&&o.state!=="used")&&!(o.kind==="deepShortcut"&&o.state==="hidden")&&(renderCacheStats.visibleObjects++,true))
      draws.push({
        y: o.disc ? o.y + SKY_DISCS.radius + .002 : o.y, x: o.x, lift: o.disc ? discLift(o.elev || 0) : 0, // release 587: a skyway door stands on its disc
        fn: () => {
          if (o.kind === "wayfindingCue") waymark(ctx,o,s);
          else if(o.kind==="shelterHazard"){const cx=(o.x+.5)*s,cy=(o.y+.5)*s;ctx.strokeStyle=o.state==='armed'?'#d68b58aa':'#6e665c77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,s*.28,0,7);ctx.moveTo(cx-s*.2,cy);ctx.lineTo(cx+s*.2,cy);ctx.moveTo(cx,cy-s*.2);ctx.lineTo(cx,cy+s*.2);ctx.stroke()}
          else if(o.kind==="displacementTrap"){const cx=(o.x+.5)*s,cy=(o.y+.5)*s;ctx.strokeStyle='#806d8b66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy,s*.22,.3,5.5);ctx.stroke()}
          else if (o.kind === "warpDais") drawWarpDais(ctx, o, s, now); // release 301
          else if (o.kind === "watcherTomb") { const L = groundLift(o.x, o.y + .5) * s; ctx.save(); ctx.translate(0, -L); drawWatcherTomb(ctx, o, s, now); ctx.restore(); } // release 289 (lifted onto a shrine's eye)
          else if (o.kind === "traveler" && o.elder) drawElder(ctx, o, s, now);
          else if (o.kind === "traveler") {
            const f = o.facing || "down", step = o.state === "walking" ? Math.floor(now / 180) : 0, lift = o.mount ? .42 : 0;
            if (o.mount) actor(ctx, o.x, o.y + .05, s, o.mount, f, step, o.state === "walking" ? "walk" : "idle");
            actor(ctx, o.x, o.y - lift, s, o.look || "traveler", f, step, "idle");
            if (o.wanderer) { const q = g.save.wanderer?.quest; ctx.fillStyle = !q || q.done ? "#f0d58a" : "#9cc8b5"; ctx.font = `bold ${Math.max(10, s * .32)}px monospace`; ctx.textAlign = "center"; ctx.fillText(!q || q.done ? "!" : "…", (o.x + .5) * s, (o.y - lift - .25) * s); }
          }
          else if (o.kind === "wandererCache") { if (o.state !== "used") { actor(ctx, o.x, o.y, s, "wandererCache", "down", 0, "idle"); } }
          else if (o.quarryTurtle) quarryTurtle(ctx, o.x, o.y, s, now); // release 265: Shale, the quarry keeper
          else if (o.kind === "villager") { actor(ctx, o.x, o.y, s, o.guard ? "militia" : "villager", "down", 0, "idle"); ctx.fillStyle = "#9cc8b5"; ctx.beginPath(); ctx.arc((o.x + 0.5) * s, o.y * s - 6, 3, 0, 7); ctx.fill(); }
          else if (o.kind === "npc") {
            const n = g.save.consequences.npcs[o.id],
              cx = (o.x + 0.5) * s,
              cy = o.y * s;
            if (n?.status === "dead") {
              ctx.fillStyle = "#67574f";
              ctx.fillRect(cx - s * 0.3, cy + s * 0.55, s * 0.6, s * 0.16);
            } else {
              actor(ctx, o.x, o.y, s, o.kind, "down", 0, "idle");
              ctx.fillStyle =
                n?.disposition === "hostile" ? "#d9977a" : "#9cc8b5";
              ctx.beginPath();
              ctx.arc(cx, cy - 6, 3, 0, 7);
              ctx.fill();
            }
            ctx.textAlign = "center";
            ctx.font = "10px monospace";
            ctx.fillStyle = "#e2d5ba";
            ctx.fillText(
              o.name + (n?.status === "dead" ? " †" : ""),
              cx,
              cy - 15,
            );
            ctx.font = "8px monospace";
            ctx.fillStyle = "#a9b9ab";
            ctx.fillText(o.role, cx, cy - 27);
            ctx.textAlign = "start";
          } else if (o.kind === "shack" || o.kind === "architecturalBuilding") { /* roofs render after actors so exterior views conceal contents */ }
          else if (o.kind === "architecturalDistrict") { /* district title is carried by its buildings */ }
          else if (o.kind === "viewport") {
            actor(ctx, o.x, o.y, s, "viewport");
            ctx.strokeStyle = "#8de4df";
            ctx.lineWidth = Math.max(1.5, s * .055);
            ctx.strokeRect((o.x - .34) * s, (o.y - .82) * s, s * .68, s * .42);
            ctx.beginPath();ctx.moveTo((o.x-.22)*s,(o.y-.68)*s);ctx.lineTo((o.x+.2)*s,(o.y-.68)*s);ctx.moveTo((o.x-.12)*s,(o.y-.56)*s);ctx.lineTo((o.x+.28)*s,(o.y-.56)*s);ctx.stroke();
            ctx.fillStyle = "#d5efdf";
            ctx.font = "9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("VIEWPORT", (o.x + .5) * s, (o.y - .95) * s);
            ctx.textAlign = "start";
          } else if (o.kind === "diveSite") { // a bobbing red-and-white buoy with a dive flag
            const bx = (o.x + .5) * s, by = (o.y + .7) * s + Math.sin(now / 500 + o.x) * s * .04;
            ctx.strokeStyle = "#e8f4ff88"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bx, by + s * .1, s * (.35 + .1 * Math.sin(now / 400)), s * .12, 0, 0, 7); ctx.stroke();
            ctx.fillStyle = "#d8463a"; ctx.beginPath(); ctx.arc(bx, by, s * .22, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#f4f1ea"; ctx.fillRect(bx - s * .22, by - s * .02, s * .44, s * .08);
            ctx.fillStyle = "#3a2c22"; ctx.fillRect(bx - 1, by - s * .7, 2, s * .5); ctx.fillStyle = "#d8463a"; ctx.fillRect(bx + 1, by - s * .7, s * .3, s * .2); ctx.strokeStyle = "#f4f1ea"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 1, by - s * .7); ctx.lineTo(bx + 1 + s * .3, by - s * .5); ctx.stroke();
          } else if (o.kind === "airPocket") { // a rising column of bubbles
            for (let i = 0; i < 7; i++) { const f = (now / 1100 + i / 7) % 1, bx = (o.x + .5) * s + Math.sin(now / 300 + i * 2) * s * .15; ctx.fillStyle = `rgba(220,245,255,${.85 * (1 - f)})`; ctx.beginPath(); ctx.arc(bx, (o.y + .7) * s - f * s * 1.6, s * (.05 + (i % 3) * .025), 0, 7); ctx.fill(); }
            ctx.strokeStyle = "#bfe9ff99"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc((o.x + .5) * s, (o.y + .7) * s, s * .45, 0, 7); ctx.stroke();
          } else if (o.kind === "diveExit") { // the surface line: a rope rising out of view
            ctx.strokeStyle = "#d9c39a"; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.moveTo((o.x + .5) * s, (o.y + .8) * s); ctx.quadraticCurveTo((o.x + .7) * s, (o.y - 1) * s, (o.x + .45) * s, (o.y - 3) * s); ctx.stroke();
            ctx.fillStyle = "#e2d5ba"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("SURFACE", (o.x + .5) * s, (o.y + 1.2) * s); ctx.textAlign = "start";
          } else if (o.kind === "shipwreck") { // a broken hull heeled over on the sand, ribs showing
            const bx = (o.x + .5) * s, by = (o.y + .6) * s, spent = o.state === "used";
            ctx.save(); ctx.translate(bx, by); ctx.rotate(-.35);
            ctx.fillStyle = spent ? "#4a3a2c" : "#5d4330"; ctx.beginPath(); ctx.moveTo(-s * 1.6, -s * .1); ctx.quadraticCurveTo(0, s * .9, s * 1.5, -s * .2); ctx.lineTo(s * 1.1, -s * .45); ctx.quadraticCurveTo(0, s * .25, -s * 1.2, -s * .4); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#d8c7a6"; ctx.lineWidth = Math.max(1.5, s * .06); for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * s * .35, -s * .35); ctx.quadraticCurveTo(i * s * .38, -s * .9, i * s * .3, -s * 1.1); ctx.stroke(); }
            ctx.strokeStyle = "#3a2c22"; ctx.lineWidth = Math.max(2, s * .09); ctx.beginPath(); ctx.moveTo(s * .2, -s * .3); ctx.lineTo(s * .55, -s * 1.7); ctx.stroke();
            ctx.restore();
            if (!spent) { ctx.fillStyle = "#e2d5ba"; ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText("WRECK", bx, by - s * 1.4); ctx.textAlign = "start"; }
          } else if (o.kind === "digSpot") { drawDigSpot(ctx, o, s, now);
          } else if (o.kind === "ilse") { drawIlse(ctx, o, s, now);
          } else if (o.kind === "crackedBell") { drawCrackedBell(ctx, o, s, now);
          } else if (o.kind === "tornPage") { drawTornPage(ctx, o, s, now); // release 595
          } else if (o.kind === "surveyorLink") { drawSurveyorLink(ctx, o, s, now); // release 505
          } else if (o.kind === "surveyorStatue") { drawSurveyorStatue(ctx, o, s, now); // release 551
          } else if (o.kind === "marginNote") { drawMarginNote(ctx, o, s, now);
          } else if (o.kind === "townKeeper") { actor(ctx, o.x, o.y, s, "npc", "down", 0, "idle"); ctx.strokeStyle = "#c9a6ff"; ctx.lineWidth = Math.max(1.5, s * .05); ctx.beginPath(); ctx.arc((o.x + .5) * s, (o.y - .15) * s, s * .14, 0, 7); ctx.stroke(); // release 441: a keeper with an Aperture lens
          } else if (o.kind === "skiff") {
            drawSkiff(ctx, o.x, o.y, s, "right", performance.now());
            if (o.id === "skiff-moored" && g.mendTarget?.() && !g.mendTarget().aboard) repairTag(ctx, o.x, o.y, s); // release 269
          } else if (o.kind === "shipwright") {
            actor(ctx, o.x, o.y, s, "shipwright", "down", 0, "idle");
            ctx.fillStyle = "#e2d5ba"; ctx.font = "10px monospace"; ctx.textAlign = "center";
            ctx.fillText("SHIPWRIGHT", (o.x + .5) * s, (o.y - .3) * s); ctx.textAlign = "start";
          } else if (o.kind === "relayNode" || o.kind === "arrayPylon") {
            drawRelayNode(ctx, o, s, performance.now());
          } else if (o.kind === "relayTerminal") {
            actor(ctx, o.x, o.y, s, "shrine");
            ctx.fillStyle = "#d2c090";
            ctx.font = "10px monospace";
            ctx.fillText("RELAY", o.x * s, (o.y - 0.3) * s);
          } else if (o.kind === "tree" && o.vegetationForm === "giant" && o.state === "standing" && !o.strange) { drawGiantTree(ctx, o, s, now); // release 573
          } else {const kind=o.kind==="tree"&&o.vegetationForm==="shrub"?"treeShrub":o.kind==="tree"&&o.vegetationForm==="spindle"?"treeSpindle":o.kind;if(o.strange&&!o.strangeUsed)drawStrange(ctx,o,s,kind,now);else actor(ctx,o.x,o.y,s,kind,"down",0,o.state||"idle",false,o.scale||1);}
        },
      });
  for (const e of g.enemies)
    if (!e.dead && discoveredInDungeon(g,e) && visibleInCamera(e,l,t,r,b,e.kind === "psychicCrystal" || e.kind === "lightningGiant" ? 5 : 2))
      draws.push({
        y: e.y + (astralMountPresentation(e) ? .001 : 0), x: e.x,
        fn: () => {
          if (e.seaKind) { drawSeaCreature(ctx, e, s, now, SEA_CREATURES[e.seaKind].colors, g); return; }
          const f = e.ai?.facing || "down",
            q = e.recoil > 0 && !["astralWorm","astralMirage"].includes(e.kind) ? 0.12 : 0,
            ox = f === "left" ? q : f === "right" ? -q : 0,
            oy = f === "up" ? q : f === "down" ? -q : 0;
          if (e.hitFlash > 0 && e.kind !== "psychicCrystal") {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = "#d9b38b";
            const flashScale = Math.max(.7,Number(e.scale)||1);
            ctx.fillRect((e.x + .5 - .4*flashScale) * s, (e.y + .45 - .42*flashScale) * s, s * .8*flashScale, s * .75*flashScale);
            ctx.restore();
          }
          if (e.packKind && drawPackMonster(ctx, { ...e, x: e.x + ox, y: e.y + oy, ...(["voidWalker", "psychicCrystal", "lightningGiant"].includes(e.kind) ? { marine: !astralMountPresentation(e) && marineAt(e) } : {}), ...(e.kind === "astralWorm" ? { astralBeamGroundLiftDelta: (()=>{ const a=astralBeamAnchors({...e.astral,x:e.x,y:e.y,scale:Math.max(.6,Number(e.scale)||1),facingX:e.astral?.facingX||e.facingX||1});return groundLift(e.x,e.y)-groundLift(a.ground.x,a.ground.y); })() } : {}), ...(["voidWalker", "astralWorm", "astralMirage", "lightningGiant"].includes(e.kind) ? { reduceMotion: !!(g.presentation?.reduceMotion || g.presentation?.safeMode) } : {}), ...(e.kind === "psychicCrystal" ? { flightLiftDelta: crystalLift(e) - groundLift(e.x, e.y), reduceMotion: !!(g.presentation?.reduceMotion || g.presentation?.safeMode) } : {}) }, s, now, f)) return;
          if (e.kind === "gateRevenant") drawGateRevenant(ctx, e, s, now, ox, oy); // release 271
          else actor(
            ctx,
            e.x + ox,
            e.y + oy,
            s,
            e.kind,
            f,
            e.kind==="voidSentinel"?now/180:Math.floor(e.ai?.step || 0),
            e.telegraph > 0 ? "telegraph" : e.strike > 0 ? "attack" : "walk",
            e.boss,
            e.scale,
            e.segments,
            e.segmentSpacing,
          );
          if (e.strike > 0) {
            ctx.strokeStyle = "#c28152cc";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo((e.x + 0.5) * s, (e.y + 0.35) * s);
            const v = {
              left: [-0.8, 0],
              right: [0.8, 0],
              up: [0, -0.8],
              down: [0, 0.8],
            }[f];
            ctx.lineTo((e.x + 0.5 + v[0]) * s, (e.y + 0.35 + v[1]) * s);
            ctx.stroke();
          }
        },
      });
  // Release 587: the skyway's floating discs, each sorted at its front edge; the Wayfarer standing on one is drawn just after it, lifted.
  const onDisc = g.skyLevel > 0 && g.map?.skyDiscs ? g.map.skyDiscs.find((d) => d.level === g.skyLevel && Math.hypot(p.x + .5 - d.x, p.y + .75 - d.y) <= d.r + .05) : null;
  for (const d of g.map?.skyDiscs || []) if (visibleInCamera({ x: d.x, y: d.y }, l, t, r, b, 3)) draws.push({ y: d.y - .75 + d.r, fn: () => drawSkyDisc(ctx, d, s, now) });
  const playerDraw = {
    y: onDisc ? onDisc.y - .75 + onDisc.r + .001 : p.y, x: p.x, lift: g.skyLevel > 0 ? discLift(g.skyLevel) : 0,
    fn: () => {
      if (jumping) {
        ctx.fillStyle = "#05050477";
        ctx.beginPath();
        ctx.ellipse(
          (p.x + 0.5) * s,
          (p.y + 0.82) * s,
          s * 0.19,
          s * 0.055,
          0,
          0,
          7,
        );
        ctx.fill();
      }
      if (g.area === "overworld" && g.save.boat?.aboard) {
        // A jump lifts the skiff with the Wayfarer (release 158: leap a rogue wave's crest).
        const shieldLeft = Number(g.save.boat.shield) || 0; // release 269: under the hull guard, the skiff is a longboat (flickering back in its last 10 s)
        if (p.facing === "left" || p.facing === "right") g.longboatSide = p.facing;
        g._longboatFront = shieldLeft > 0 && (shieldLeft > 10 || Math.floor(now / 200) % 2 === 1); // the near hull goes over the Wayfarer, below
        g._subDive = (g.save.boat.sub || g.save.boat.mechSub) ? Math.max(0, ((g.subDiveUntil || 0) - now) / 1000) : 0; // release 311
        if ((g.save.boat.sub || g.save.boat.mechSub) && !g._longboatFront) drawSubmersible(ctx, p.x, p.y - lift / s, s, p.facing, now, "back", g._subDive);
        else (g._longboatFront ? drawLongboat : drawSkiff)(ctx, p.x, p.y - lift / s, s, p.facing, now, g.longboatSide || "right");
        if (g.mendTarget?.()) repairTag(ctx, p.x, p.y - .9 - lift / s, s);
        // Hull gauge under the skiff: green to amber to red as the hull takes damage.
        const hull = Math.max(0, Math.min(1, (g.save.boat.hull || 0) / BOAT.maxHull)), bx = (p.x + .08) * s, by = (p.y + 1.12) * s, bw = s * .84, bh = Math.max(3, s * .09);
        ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = hull > .6 ? "#6fcf7a" : hull > .3 ? "#e3b04b" : "#e2574a"; ctx.fillRect(bx, by, bw * hull, bh);
        if (hull <= .3 && Math.floor(now / 350) % 2) { ctx.strokeStyle = "#ffb3a8"; ctx.lineWidth = 1; ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2); }
        // Release 263/269: the hull guard (the skiff itself becomes a longboat).
        const shield = Number(g.save.boat.shield) || 0;
        // Release 269: the guard's own bar, bright fuchsia, extends the hull gauge to the right; blows eat into it, and when it is gone so is the guard.
        if (g.save.boat.sub) { const sw = bw * BOAT.sub.hull / BOAT.maxHull, left = Math.min(1, (Number(g.save.boat.subHull) || 0) / BOAT.sub.hull); ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - sw - 3, by - 1, sw + 2, bh + 2); ctx.fillStyle = "#d8dee5"; ctx.fillRect(bx - 2 - sw * left, by, sw * left, bh); } // release 311: the submersible's plating, silver, to the left
        if (shield > 0) { const gw = bw * BOAT.shield.bonus / BOAT.maxHull, left = Math.min(1, (Number(g.save.boat.guardHull) || 0) / BOAT.shield.bonus); ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx + bw + 1, by - 1, gw + 2, bh + 2); ctx.fillStyle = "#ff2fb4"; ctx.fillRect(bx + bw + 2, by, gw * left, bh); }
      }
      // Release 257: knocked flat by the Lightning Giant's shock, the Wayfarer tips over, shakes, and gets back up.
      const knocked = now < (p.stunnedUntil || 0), kd = knocked ? knockdownPose(now - (p.stunnedAt || now), (p.stunnedUntil || now) - (p.stunnedAt || now), !!(g.presentation?.reduceMotion || g.presentation?.safeMode)) : null;
      if (kd) { const fx = (p.x + .5) * s + kd.shake, fy = (p.y + .9) * s - lift; ctx.save(); ctx.translate(fx, fy); ctx.rotate(kd.angle * (p.facing === "left" ? -1 : 1)); ctx.translate(-(p.x + .5) * s, -(p.y + .9) * s + lift); }
      const drone = !!g.droneUp?.() && !!g.droneAt, mech = !!g.mechUp?.(), mechLift = (mech || drone) && g.mechBoosting ? s * (drone ? .35 : .22) : 0; // release 317: the robot ashore, lifted while it boosts; 321: the drone carries higher
      if (mech && g.save.mech?.empowered) { const cx = (p.x + .5) * s, cy = (p.y + .55) * s - lift - mechLift, r = s * (.72 + .05 * Math.sin(now / 140)), glow = ctx.createRadialGradient(cx, cy, r * .2, cx, cy, r); glow.addColorStop(0, "#ffb05a55"); glow.addColorStop(1, "#ff5a1f00"); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); } // release 383: the empowered robot's furnace glow
      const suited = mech && g.save.mech?.empowered === true; // release 389: empowered, the robot is a svelte silver suit in the Wayfarer's place
      if (mech && !suited) drawSubmersible(ctx, p.x, p.y - (lift + mechLift) / s, s, p.facing, now, "back", 0, false, g.mechBoosting);
      const subHidden = g.area === "overworld" && g.save.boat?.aboard && g._subDive > 0; if (subHidden) { ctx.save(); ctx.globalAlpha = .12; } // release 311: under the surface
      if (suited) drawPowerSuit(ctx, p.x, p.y - (lift + mechLift) / s, s, p.facing, now, Math.floor(p.walkPhase || 0), now < (p.attackUntil || 0), g.mechBoosting); else actor(
        ctx,
        p.x,
        p.y - (lift + (mech ? mechLift : 0)) / s, // release 543: in the robot, the Wayfarer rises with it (a boost left their legs below it)
        s,
        "player",
        p.facing,
        Math.floor(p.walkPhase || 0),
        now < (p.attackUntil || 0) ? "attack" : "walk",false,g.save.magicSkills?.active?.id==='ember-form'?1.25+.05*(g.save.magicSkills.active.rank||1):1,
      );
      if (kd) { ctx.restore(); drawShockSparks(ctx, (p.x + .5) * s, (p.y + .9) * s - lift, s, now); }
      if (subHidden) ctx.restore();
      if (mech && !suited) drawSubmersible(ctx, p.x, p.y - (lift + mechLift) / s, s, p.facing, now, "front", 0, false, g.mechBoosting);
      if (drone) { const carry = !!g.mechBoosting; drawDrone(ctx, carry ? p.x : g.droneAt.x, carry ? p.y - (lift + mechLift) / s - .62 : g.droneAt.y - lift / s, s, p.facing, now, carry, g.droneHealFx || 0); // release 321
        const m = g.save.mech, bx = (p.x + .08) * s, by = (p.y + 1.1) * s - lift, bw = s * .84, bh = Math.max(3, s * .08); // carry (blue) and mend readiness (green)
        ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh * 2 + 3); ctx.fillStyle = "#5fc6e0"; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, m.fuel / DRONE.carry)), bh); ctx.fillStyle = (m.healCd || 0) > 0 ? "#3f7f52" : "#7dff9a"; ctx.fillRect(bx, by + bh + 1, bw * Math.max(0, Math.min(1, 1 - (m.healCd || 0) / DRONE.healCooldown)), bh); }
      if (mech) { const m = g.save.mech, bx = (p.x + .08) * s, by = (p.y + 1.1) * s - lift, bw = s * .84, bh = Math.max(3, s * .08); // plating (silver) and boost (blue)
        ctx.fillStyle = "#0b1218cc"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh * 2 + 3); ctx.fillStyle = "#d8dee5"; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, m.plate / MECH.plate)), bh); ctx.fillStyle = "#5fc6e0"; ctx.fillRect(bx, by + bh + 1, bw * Math.max(0, Math.min(1, m.fuel / (MECH.boost * (m.empowered ? 2 : 1)))), bh); if (m.empowered) { ctx.fillStyle = "#ff8a3d"; ctx.fillRect(bx, by + bh * 2 + 2, bw, Math.max(2, bh * .6)); } } // release 383: an ember line while empowered
      if (g.area === "overworld" && g.save.boat?.aboard && (g.save.boat.sub || g.save.boat.mechSub) && !g._longboatFront) drawSubmersible(ctx, p.x, p.y - lift / s, s, p.facing, now, "front", g._subDive); // release 311: the window's glass and the arms
      if (g._longboatFront && g.area === "overworld" && g.save.boat?.aboard) drawLongboat(ctx, p.x, p.y - lift / s, s, p.facing, now, g.longboatSide || "right", "front"); // release 269
      // Poisoned (release 165): the Wayfarer pulses green while poison lasts.
      if (g.save.elites?.status?.poison > 0) { const pulse = .5 + .5 * Math.sin(now / 160); ctx.fillStyle = `rgba(120,230,90,${.12 + pulse * .22})`; ctx.strokeStyle = `rgba(150,255,110,${.35 + pulse * .45})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse((p.x + .5) * s, (p.y - lift / s + .35) * s, s * (.42 + pulse * .08), s * (.55 + pulse * .08), 0, 0, 7); ctx.fill(); ctx.stroke(); }
      if (now < (p.attackUntil || 0)) {
        const a = {
            right: 0,
            down: Math.PI / 2,
            left: Math.PI,
            up: -Math.PI / 2,
          }[p.facing],
          cx = (p.x + 0.5) * s,
          cy = (p.y + 0.35 - lift / s) * s,
          profile = g.attackProfile || { shape: "cone", range: 1.7, arc: 100 };
        ctx.strokeStyle = "#c6a36a";
        ctx.lineWidth = profile.shape === "thrust" ? 4 : 5;
        ctx.beginPath();
        if (profile.shape === "thrust") {
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + Math.cos(a) * s * profile.range,
            cy + Math.sin(a) * s * profile.range,
          );
        } else {
          const half = (profile.arc * Math.PI) / 360;
          ctx.arc(cx, cy, s * profile.range, a - half, a + half);
        }
        ctx.stroke();
        ctx.strokeStyle = "#3b2e23";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
  };
  draws.push(playerDraw);
  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) {
    const raise = (Number.isFinite(d.x) ? groundLift(d.x, d === playerDraw ? p.y : d.y) : 0) + (d.lift || 0);
    if (raise) { ctx.save(); ctx.translate(0, -raise * s); d.fn(); ctx.restore(); } else d.fn();
  }
  // Release 573: behind a giant tree the Wayfarer shows through, faint.
  if (g.area === "overworld" && g.map.objects.some((o) => o.vegetationForm === "giant" && o.state === "standing" && giantTreeHides(o, p))) {
    const raise = groundLift(p.x, p.y) + (playerDraw.lift || 0); ctx.save(); ctx.globalAlpha = GIANT_TREE.ghost; if (raise) ctx.translate(0, -raise * s); playerDraw.fn(); ctx.restore();
  }
  // Under water (W5): a blue-green wash with slow light shafts.
  if (g.map?.underwater) {
    ctx.fillStyle = "rgba(20,70,110,.28)"; ctx.fillRect(l * s, t * s, (r - l) * s, (b - t) * s);
    for (let i = 0; i < 4; i++) { const x0 = (l + ((i * 7 + now / 900) % (r - l + 6)) - 3) * s; ctx.fillStyle = "rgba(200,240,255,.06)"; ctx.beginPath(); ctx.moveTo(x0, t * s); ctx.lineTo(x0 + s * 1.5, t * s); ctx.lineTo(x0 + s * 4, b * s); ctx.lineTo(x0 + s * 2, b * s); ctx.fill(); }
  }
  // Stormkraken ink (W4): the sea goes dark beyond a small circle around the Wayfarer.
  if (g.area === "overworld" && (g.seaHazards?.fog?.length || g.novaFog)) {
    // Fog banks (release 156; release 158 smooths them): each bank is a cluster of soft puffs turning slowly about its
    // centre. Inside a bank the mist closes in around the Wayfarer gradually (fogLevel is eased in open-sea.ts).
    // Release 257: a Supernova's fog (g.novaFog) draws the same way, faded in and out by its alpha.
    const level = g.seaHazards?.fogLevel || 0, time = now / 1000; // release 407 (Tim: "the Supernova... covers the entire world, so I can't see him... the Supernova shouldn't cover the Void Walker or other creatures"): its fog no longer closes in around the Wayfarer, and its mist is thin
    for (const [f, fade] of [...(g.seaHazards?.fog || []).map((f) => [f, 1]), ...(g.novaFog?.fog || []).map((f) => [{ ...f, nova: true }, g.novaFog.alpha ?? 1])]) {
      if (fade <= 0) continue;
      for (let i = 0; i < 7; i++) {
        const a = (f.swirl || 0) + i * 2.399 + Math.sin(time * .2 + i) * .15, d = f.radius * (.15 + .55 * ((i * 37) % 10) / 10), pr = f.radius * (.45 + .1 * Math.sin(time * .3 + i * 1.7));
        const x = (f.x + Math.cos(a) * d) * s, y = (f.y + Math.sin(a) * d) * s, gr = ctx.createRadialGradient(x, y, 0, x, y, pr * s);
        gr.addColorStop(0, `rgba(222,231,236,${(f.nova ? .1 : .22) * fade * (1 - level * .5)})`); gr.addColorStop(1, "rgba(222,231,236,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, pr * s, 0, 7); ctx.fill();
      }
    }
    if (level > .01) {
      const px = (p.x + .5) * s, py = (p.y + .6) * s, gr = ctx.createRadialGradient(px, py, s * (1.4 + (1 - level) * 3), px, py, s * (3.6 + (1 - level) * 7));
      gr.addColorStop(0, "rgba(207,217,223,0)"); gr.addColorStop(1, `rgba(207,217,223,${.92 * level})`); ctx.fillStyle = gr; ctx.fillRect(px - w, py - h, w * 2, h * 2);
    }
    // Release 269 (Tim: "in fog it should cast a... violet glow"): the longboat's lantern lights the mist around it,
    // more strongly the deeper the fog.
    if (g._longboatFront && g.save.boat?.aboard) {
      const dir = g.longboatSide === "left" ? -1 : 1, lx = (p.x + .5) * s + dir * s * 1.0, ly = (p.y + .6) * s - s * .34, pulse = .9 + Math.sin(now / 1300) * .1, k = (.4 + .55 * level) * pulse;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 3.6); lg.addColorStop(0, `rgba(205,70,255,${Math.min(1, 1.1 * k)})`); lg.addColorStop(.25, `rgba(165,40,245,${.65 * k})`); lg.addColorStop(.6, `rgba(130,25,215,${.28 * k})`); lg.addColorStop(1, "rgba(110,20,190,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, s * 3.6, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = "source-over"; const tint = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 2.4); tint.addColorStop(0, `rgba(150,40,230,${.28 * k})`); tint.addColorStop(1, "rgba(150,40,230,0)"); ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(lx, ly, s * 2.4, 0, 7); ctx.fill(); ctx.restore(); // the mist itself takes the colour
    }
  }
  if (g.area === "overworld" && g.storm) { ctx.fillStyle = `rgba(16,24,38,${.28 * g.storm.strength})`; ctx.fillRect((p.x + .5) * s - w, (p.y + .6) * s - h, w * 2, h * 2); }
  if (g.area === "overworld" && now < (g.inkUntil || 0)) {
    const fade = Math.min(1, (g.inkUntil - now) / 600), px = (p.x + .5) * s, py = (p.y + .6) * s, grad = ctx.createRadialGradient(px, py, s * 1.4, px, py, s * 4.5);
    grad.addColorStop(0, "rgba(6,10,18,0)"); grad.addColorStop(1, `rgba(6,10,18,${.92 * fade})`);
    ctx.fillStyle = grad; ctx.fillRect(l * s, t * s, (r - l) * s, (b - t) * s);
  }
  for (const e of g.enemies)
    if (!e.dead && discoveredInDungeon(g,e) && !e.ambient && !e.hidden && !e.aloft && visibleInCamera(e,l,t,r,b,e.kind === "psychicCrystal" || e.kind === "lightningGiant" ? 5 : 2)) {
      const barY = e.packKind ? e.y - 0.1 - Math.max(0, (Number(e.scale) || 1) - 1) * 0.75 - (e.flying ? 0.35 : 0) - (e.kind === "psychicCrystal" ? crystalLift(e) : 0) : e.y - 0.1;
      ctx.fillStyle = "#211617";
      ctx.fillRect(e.x * s, barY * s, s, 3);
      ctx.fillStyle = "#9b4d50";
      ctx.fillRect(e.x * s, barY * s, (s * e.hp) / e.maxHp, 3);
    }
  drawEchoPatches(ctx,g,s,now);
  drawGlyphStatus(ctx,g,s,now,(e)=>discoveredInDungeon(g,e)&&visibleInCamera(e,l,t,r,b,2));
  if(g.damageNumbers)drawDamageNumbers(ctx,g,s,now); // release 461
  { const m=g.aimMark; if(m&&now<m.until){const e=g.enemies.find(q=>q.id===m.id&&!q.dead);if(e){const k=(m.until-now)/450,cx=(e.x+.5)*s,cy=(e.y+.45)*s,r=s*(.5+Math.max(0,Number(e.bodyRadius)||0)*.6+(1-k)*.12),a=r*.45;ctx.save();ctx.globalAlpha=Math.min(1,k*1.6);ctx.strokeStyle="#fff1c8";ctx.lineWidth=Math.max(2,s*.07);ctx.beginPath();for(const[sx,sy]of[[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.moveTo(cx+sx*r,cy+sy*r-sy*a);ctx.lineTo(cx+sx*r,cy+sy*r);ctx.lineTo(cx+sx*r-sx*a,cy+sy*r)}ctx.stroke();ctx.restore()}}} // release 469: where the swing went
  for(const o of objectLists.structures)if(renderableObject(g,o)&&discoveredInDungeon(g,o)&&visibleInCamera(o,l,t,r,b)){const drawStructure=o.kind==="shack"?shack:architecturalBuilding;
    // Object records outlive consumed building tiles. Clip roofs/facades to their surviving footprint
    // so they cannot visually restore destroyed walls or expose unexplored building geometry.
    const bounds = o.bounds || { x:o.x-2, y:o.y-2, w:5, h:4 };
    const cells = o.footprint?.length ? o.footprint : Array.from({length:Math.max(0,bounds.w*bounds.h)},(_,i)=>({x:bounds.x+i%bounds.w,y:bounds.y+Math.floor(i/bounds.w)}));
    let surviving = 0;
    for(const c of cells)if(g.map.tiles[c.y*mw+c.x]?.kind!=="voidScar"&&discoveredInDungeon(g,c))surviving++;
    if(!surviving)continue;
    ctx.save();
    if(surviving!==cells.length){
      ctx.beginPath();
      for(const c of cells)if(g.map.tiles[c.y*mw+c.x]?.kind!=="voidScar"&&discoveredInDungeon(g,c))ctx.rect(c.x*s,c.y*s,s,s);
      ctx.clip();
    }
    drawStructure(ctx,o,s,p,g.map.tiles);
    ctx.restore();
  }
  const frontShelter=objectLists.shelters.find(o=>renderableObject(g,o)&&discoveredInDungeon(g,o)&&p.x>=o.bounds.x-.6&&p.x<=o.bounds.x+o.bounds.w-.4&&p.y>=o.bounds.y+o.bounds.h-1&&p.y<=o.bounds.y+o.bounds.h+1.35);
  if(frontShelter)actor(ctx,p.x,p.y-lift/s,s,"player",p.facing,Math.floor(p.walkPhase||0),now<(p.attackUntil||0)?"attack":"walk",false,g.save.magicSkills?.active?.id==='ember-form'?1.25+.05*(g.save.magicSkills.active.rank||1):1);
  const motion = now / 1000;
  for (const o of objectLists.animated)
    if (renderableObject(g,o)&&discoveredInDungeon(g,o)&&visibleInCamera(o,l,t,r,b)) {
      const cx = (o.x + 0.5) * s,
        cy = (o.y + 0.35) * s,
        spin = motion * 0.55 + ((o.x * 13 + o.y * 7) % 11);
      ctx.strokeStyle = o.kind === "apertureMemory" ? "#c49be0aa" : "#a8bda066";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.52, spin, spin + Math.PI * 1.25);
      ctx.stroke();
      ctx.fillStyle = "#d9d1b877";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(spin) * s * 0.52, cy + Math.sin(spin) * s * 0.52, 2, 0, 7);
      ctx.fill();
    }
  ctx.restore();
  if (g.area === "dungeon" && g.map?.chasm) { const P = CHASM_STARS.penumbra, cx = w / 2, cy = h / 2, gr = ctx.createRadialGradient(cx, cy, s * P.inner, cx, cy, s * P.outer); gr.addColorStop(0, "rgba(4,3,14,0)"); gr.addColorStop(1, `rgba(4,3,14,${P.dark})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); } // release 593: the penumbra
  const t2 = timed ? performance.now() : 0;
  // Dungeons with their own weather (Underlands themes) show it too: snow in a cave, sparks rising from a lava bog.
  if(!budget.weather&&g.area==="dungeon"&&g.map.weather&&budget.quality!=="low"&&g.presentation?.weather!==false)budget.weather=true;
  if(budget.weather&&g.map.weather==="rain"){
    const count=budget.quality==="full"?34:18;ctx.strokeStyle="#9ec8d04d";ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<count;i++){const x=((i*83+motion*210+g.rx*41)%(w+80))-40,y=((i*47+motion*330+g.ry*59)%(h+90))-45;ctx.moveTo(x,y);ctx.lineTo(x-8,y+19)}ctx.stroke();ctx.fillStyle="#1d3b4730";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="snow"){
    const count=budget.quality==="full"?28:14;ctx.fillStyle="#dae2d78c";for(let i=0;i<count;i++){const x=((i*97+motion*(12+i%4)*3+g.rx*29)%(w+30))-15,y=((i*61+motion*(25+i%5)*4+g.ry*37)%(h+30))-15;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.55,0,7);ctx.fill()}
  }else if(budget.weather&&g.map.weather==="embers"){
    const count=budget.quality==="full"?26:14;for(let i=0;i<count;i++){const x=((i*79+Math.sin(motion+i)*20)%(w+20)+w)%(w+20)-10,y=h-((i*53+motion*(30+i%5*9))%(h+20));ctx.fillStyle=i%3?"#ff8a3acc":"#ffd06acc";ctx.fillRect(x,y,2,2)}ctx.fillStyle="#3a120614";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="drip"){
    const count=budget.quality==="full"?16:8;ctx.strokeStyle="#9ec8d066";ctx.lineWidth=1.2;ctx.beginPath();for(let i=0;i<count;i++){const x=(i*131)%w,y=((i*67+motion*260)%(h+40))-20;ctx.moveTo(x,y);ctx.lineTo(x,y+7)}ctx.stroke();
  }else if(budget.weather&&g.map.weather==="spores"){
    const count=budget.quality==="full"?30:16;for(let i=0;i<count;i++){const x=((i*97+Math.sin(motion*.6+i)*30)%w+w)%w,y=((i*61+Math.cos(motion*.4+i)*30+motion*6)%h+h)%h;ctx.fillStyle=i%2?"#a6ffdc88":"#d9b8ff88";ctx.beginPath();ctx.arc(x,y,1.2+(i%3)*.5,0,7);ctx.fill()}
  }else if(budget.weather&&g.map.weather==="petals"){ // release 305: the Far Sleep, pale petals drifting down a violet dusk
    const count=budget.quality==="full"?22:11;for(let i=0;i<count;i++){const f=(motion*(.05+(i%4)*.012)+i*.29)%1,x=((i*127+g.rx*37+Math.sin(motion*.7+i)*26)%w+w)%w,y=f*(h+20)-10,a=motion*1.4+i;ctx.fillStyle=["#f6e6ffcc","#ffe9b8cc","#d8f4ffcc","#ffd6eccc"][i%4];ctx.beginPath();ctx.ellipse(x,y,3,1.4,a,0,7);ctx.fill()}ctx.fillStyle="#3a2c6a1c";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="glints"){ // release 299: Geode Hollow, light catching on crystal dust
    const count=budget.quality==="full"?22:10;for(let i=0;i<count;i++){const p=Math.sin(motion*1.7+i*2.3);if(p<.55)continue;const x=(i*113+g.rx*29)%w,y=((i*71+motion*4)%h+h)%h,k=(p-.55)*9;ctx.fillStyle=i%2?"#f2e8ffcc":"#c7a8ffcc";ctx.fillRect(x-k,y-.6,k*2,1.2);ctx.fillRect(x-.6,y-k,1.2,k*2)}ctx.fillStyle="#2a1a4414";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="steam"){ // release 299: Brass Engine, steam rising from the pipes
    const count=budget.quality==="full"?12:6;for(let i=0;i<count;i++){const f=(motion*.18+i*.37)%1,x=(i*149+g.rx*31)%w+Math.sin(motion+i)*12,y=h*(1-f)-(i*53)%(h*.3);ctx.fillStyle=`rgba(220,214,200,${.16*(1-f)})`;ctx.beginPath();ctx.arc(x,y,10+f*26,0,7);ctx.fill()}ctx.fillStyle="#3a2a1210";ctx.fillRect(0,0,w,h);
  }else if(budget.weather&&g.map.weather==="sunbreak"){
    const glow=ctx.createLinearGradient(0,0,w*.8,h);glow.addColorStop(0,"#e7c87324");glow.addColorStop(.45,"#d8ad5220");glow.addColorStop(.7,"#0000");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  ctx.fillStyle = "#d8c9aa55";
  for (let i = 0; i < budget.ambientMotes; i++) {
    const phase = motion * (8 + (i % 4) * 2) + i * 97 + g.rx * 31 + g.ry * 17,
      x = ((phase * 3.1) % (w + 80)) - 40,
      y = ((i * 73 + Math.sin(phase * 0.07) * 45) % (h + 60)) - 30;
    ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, 1);
  }
  if (!drawScreenOverlay(ctx, w, h)) {
    ctx.fillStyle = "#5c4a3b0c";
    ctx.fillRect(0, 0, w, h);
    const priorVignette = render.vignette,
      v = priorVignette?.ctx === ctx && priorVignette.w === w && priorVignette.h === h
        ? priorVignette.gradient
        : ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.26,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.7,
    );
    if (v !== priorVignette?.gradient) {
      v.addColorStop(0, "#0000");
      v.addColorStop(1, "#080a0870");
      render.vignette = { ctx, w, h, gradient: v };
    }
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  // Area label, plus the player's height wherever the map has levels (operator ask 2026-10-14).
  ctx.font = "12px monospace";
  const place = g.area === "overworld" ? `SECTION ${g.rx},${g.ry}` : g.map.name.toUpperCase(),
    hasLevels = g.map?.landscape && (g.map._hasLevels ??= g.map.tiles.some((q) => (q.elev || 0) > 0)),
    label = hasLevels ? `${place} · ${levelName(elevationAt(g.map, mw, g.player.x, g.player.y))}` : place;
  ctx.fillStyle = "#151411ee";
  // Sits just beneath Map and Pack (release 183), aligned with them, never wider than the space before the next control.
  const labelY = h - (g.labelInset ?? 122), labelX = g.labelX ?? 8,
    boxW = Math.min(Math.max(150, ctx.measureText(label).width + 20), g.labelMaxWidth ?? Infinity);
  ctx.fillRect(labelX, labelY, boxW, 24);
  ctx.fillStyle = "#cec7b6";
  ctx.fillText(label, labelX + 8, labelY + 16, boxW - 16);
  if (timed) { const t3 = performance.now(); renderTimings.ground = t1 - t0; renderTimings.world = t2 - t1; renderTimings.overlay = t3 - t2; }
}

// Unexplored dungeon space: dark slate with a faint diagonal hatch, distinct from the indigo depth of a chasm.
function fogTile(ctx, x, y, s) {
  ctx.fillStyle = "#0b0e11"; ctx.fillRect(x * s, y * s, s + .5, s + .5);
  ctx.strokeStyle = "#161c22"; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = -1; k < 3; k++) { const o = k * s / 2 + ((x + y) % 2) * s / 4; ctx.moveTo(x * s + o, y * s + s); ctx.lineTo(x * s + o + s / 2, y * s); }
  ctx.stroke();
}

// Glyph statuses and strikes (release 98): flames on burning foes, a teal ring on slowed ones, frost on frozen ones,
// plus chain arcs and burst rings from glyphVisuals.
// Release 461: damage numbers, rising and fading: gold for what you deal, red for what you take.
function drawDamageNumbers(ctx,g,s,now){const list=g.damageFloaters;if(!list?.length)return;ctx.save();ctx.textAlign="center";ctx.lineJoin="round";
  for(const f of list){const k=Math.min(1,Math.max(0,(now-f.born)/900));if(k>=1)continue;const taken=f.kind==="taken",size=Math.max(11,Math.round(s*(taken?.36:.32))),x=(f.x+f.jitter)*s,y=(f.y-k*.9)*s;
    ctx.globalAlpha=k<.7?1:1-(k-.7)/.3;ctx.font=`bold ${size}px system-ui,sans-serif`;ctx.lineWidth=3;ctx.strokeStyle="rgba(0,0,0,.85)";ctx.strokeText(taken?`-${f.text}`:f.text,x,y);ctx.fillStyle=taken?"#ff6b6b":"#ffd970";ctx.fillText(taken?`-${f.text}`:f.text,x,y)}
  ctx.restore()}
function drawGlyphStatus(ctx,g,s,now,visible){
  const t=now/1000;
  for(const e of g.enemies){if(e.dead||!visible(e))continue;const cx=(e.x+.5)*s,cy=(e.y+.45)*s;
    if((e.glyphBurn?.until||0)>now){for(let k=0;k<3;k++){const f=(t*2.2+k/3)%1;ctx.fillStyle=`rgba(255,${140+k*30},60,${.75*(1-f)})`;ctx.beginPath();ctx.arc(cx+(k-1)*s*.18,cy-s*.1-f*s*.45,s*(.09-.05*f),0,7);ctx.fill()}}
    if((e.glyphSlow?.until||0)>now){ctx.strokeStyle="#6fd0c4cc";ctx.lineWidth=Math.max(1.5,s*.05);ctx.setLineDash([s*.12,s*.08]);ctx.beginPath();ctx.ellipse(cx,cy+s*.35,s*.42,s*.14,0,0,7);ctx.stroke();ctx.setLineDash([])}
    if((e.hitStun||0)>.35){ctx.fillStyle="#dbe8ff55";ctx.beginPath();ctx.arc(cx,cy,s*.42,0,7);ctx.fill();ctx.strokeStyle="#eef5ffaa";ctx.lineWidth=1;for(let k=0;k<3;k++){const a=k*2.1+.4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*s*.38,cy+Math.sin(a)*s*.38);ctx.stroke()}}}
  for(const v of g.glyphVisuals||[]){const a=Math.max(0,v.life/v.max);
    if(v.kind==="arc"){ctx.strokeStyle=v.color;ctx.globalAlpha=a;ctx.lineWidth=Math.max(1.5,s*.06);ctx.beginPath();ctx.moveTo(v.x*s,v.y*s);const mx=(v.x+v.tx)/2*s+Math.sin(t*40)*s*.15,my=(v.y+v.ty)/2*s+Math.cos(t*37)*s*.15;ctx.lineTo(mx,my);ctx.lineTo(v.tx*s,v.ty*s);ctx.stroke();ctx.globalAlpha=1}
    else if(v.kind==="heal"){const rise=(1-a)*s*.6;ctx.font=`bold ${Math.max(10,Math.round(s*.32))}px system-ui,sans-serif`;ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle=`rgba(0,0,0,${a*.8})`;ctx.fillStyle=`rgba(120,240,140,${a})`;ctx.strokeText(`+${v.amount}`,v.x*s,v.y*s-rise);ctx.fillText(`+${v.amount}`,v.x*s,v.y*s-rise);ctx.textAlign="start"}
    else if(v.kind==="burst"){ctx.strokeStyle=`rgba(255,210,92,${a})`;ctx.lineWidth=Math.max(2,s*.08);ctx.beginPath();ctx.arc(v.x*s,v.y*s,v.radius*s*(1.1-a*.6),0,7);ctx.stroke();ctx.fillStyle=`rgba(255,180,70,${a*.25})`;ctx.fill()}}
}

// Echo ground patches (release 99): webs, living flesh and incoming mortar marks.
function drawEchoPatches(ctx,g,s,now){
  for(const q of g.echoPatches||[]){const left=Math.max(0,(q.until-now)/1000),x=q.x*s,y=q.y*s,r=q.radius*s;
    if(q.kind==="web"){ctx.strokeStyle=`rgba(230,235,240,${Math.min(.7,left)})`;ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.6)}ctx.stroke();for(const f of[.4,.75,1]){ctx.beginPath();ctx.ellipse(x,y,r*f,r*f*.6,0,0,7);ctx.stroke()}}
    else if(q.kind==="flesh"){ctx.fillStyle=`rgba(150,40,60,${Math.min(.45,left*.2)})`;ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,7);ctx.fill();ctx.fillStyle=`rgba(220,120,130,${Math.min(.5,left*.2)})`;for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(x+Math.cos(k*1.3+now/700)*r*.6,y+Math.sin(k*1.7)*r*.35,s*.06,0,7);ctx.fill()}}
    else if(q.kind==="mortar"){const t=1-Math.min(1,left/.65);ctx.strokeStyle=q.voidEcho?`rgba(206,150,255,${.4+t*.5})`:`rgba(255,200,90,${.4+t*.5})`;ctx.lineWidth=Math.max(2,s*.06);ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,7);ctx.stroke();ctx.fillStyle=q.voidEcho?`rgba(151,82,224,${t*.3})`:`rgba(255,170,60,${t*.3})`;ctx.fill()}}
}

const SEA_SURFACE = new Set(["ocean", "deepOcean", "shallows"]);
// Open-sea hazards (release 152): spiralling maelstroms, the rogue wave's foam crest, and drifting ice.
function drawSeaHazards(ctx, sea, s, now, l, t, r, b, map) {
  const time = now / 1000, wet = (x, y) => SEA_SURFACE.has(map?.tiles?.[Math.floor(y) * 32 + Math.floor(x)]?.kind);
  for (const v of sea.whirlpools) {
    if (v.x + v.radius < l || v.x - v.radius > r || v.y + v.radius < t || v.y - v.radius > b) continue;
    const cx = v.x * s, cy = v.y * s, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, v.radius * s);
    g.addColorStop(0, "#02101cee"); g.addColorStop(.35, "#0a2a44aa"); g.addColorStop(1, "#1d4f7a00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, v.radius * s, 0, 7); ctx.fill();
    ctx.strokeStyle = "#cfeaffaa"; ctx.lineWidth = Math.max(1, s * .06);
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) { const f = k / 30, rad = v.radius * s * (1 - f * .92), a = arm * Math.PI / 2 + v.dir * (f * 5.5 + time * 2.2); const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  }
  if (sea.current) {
    const c = sea.current, nx = -c.dy, ny = c.dx;
    ctx.strokeStyle = "#bfe6ff55"; ctx.lineWidth = Math.max(1, s * .05);
    for (let lane = -1; lane <= 1; lane++) for (let k = -26; k < 26; k += 3) {
      const f = ((time * 1.7 + k + lane * 1.3) % 52 + 52) % 52 - 26, ox = 16 + nx * (c.offset + lane * c.width / 3) + c.dx * f, oy = 16 + ny * (c.offset + lane * c.width / 3) + c.dy * f;
      if (!wet(ox, oy) || !wet(ox + c.dx * .9, oy + c.dy * .9) || ox < l - 1 || ox > r + 1 || oy < t - 1 || oy > b + 1) continue;
      ctx.beginPath(); ctx.moveTo(ox * s, oy * s); ctx.lineTo((ox + c.dx * .9) * s, (oy + c.dy * .9) * s); ctx.stroke();
    }
  }
  for (const q of sea.reefs || []) {
    if (q.x + q.radius < l || q.x - q.radius > r || q.y + q.radius < t || q.y - q.radius > b) continue;
    for (let i = 0; i < 26; i++) { const a = i * 2.39996 + (q.shape % 7), d = q.radius * Math.sqrt((i + .5) / 26), rad = s * (.08 + ((q.shape >> (i % 20)) & 3) * .04);
      ctx.fillStyle = ["#d9776a88", "#e0a35a88", "#c46a9a88", "#f0d2a077"][(q.shape >> (i % 20)) & 3]; ctx.beginPath(); ctx.arc((q.x + Math.cos(a) * d) * s, (q.y + Math.sin(a) * d) * s, rad, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "#f6e7d266"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q.x * s, q.y * s, q.radius * s, 0, 7); ctx.stroke();
  }
  const w = sea.wave;
  if (w) {
    const travel = 46 / 5, tt = (sea.clock + w.phase) % w.period;
    if (tt < travel) {
      const pos = -23 + tt * 5, nx = -w.dy, ny = w.dx;
      for (const [off, col, lw] of [[-1.4, "#1d4f7a66", 1.4], [-.6, "#9fd3f0aa", .5], [0, "#f4fbffee", .18]]) {
        const ox = 16 + w.dx * (pos + off), oy = 16 + w.dy * (pos + off);
        ctx.strokeStyle = col; ctx.lineWidth = lw * s; ctx.beginPath();
        let pen = false;
        for (let k = -24; k <= 24; k += .5) { const wob = Math.sin(k * .7 + time * 3) * .25, wx = ox + nx * k + w.dx * wob, wy = oy + ny * k + w.dy * wob; if (!wet(wx, wy)) { pen = false; continue; } pen ? ctx.lineTo(wx * s, wy * s) : ctx.moveTo(wx * s, wy * s); pen = true; }
        ctx.stroke();
      }
    }
  }
  for (const berg of sea.bergs) {
    if (berg.x + berg.radius < l || berg.x - berg.radius > r || berg.y + berg.radius < t || berg.y - berg.radius > b) continue;
    const pts = []; for (let i = 0; i < 9; i++) { const a = berg.spin + i * Math.PI * 2 / 9, j = .78 + ((berg.shape >> (i * 2)) & 3) * .08; pts.push([(berg.x + Math.cos(a) * berg.radius * j) * s, (berg.y + Math.sin(a) * berg.radius * j) * s]); }
    ctx.fillStyle = "#0a223855"; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + s * .15, y + s * .25) : ctx.moveTo(x + s * .15, y + s * .25)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e6f4fb"; ctx.strokeStyle = "#8fb8cf"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#b9dcef"; ctx.beginPath(); ctx.moveTo(berg.x * s, berg.y * s); for (let i = 0; i < 3; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill();
  }
}
