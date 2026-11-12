// Seed realms, drawn (seed-realms.ts). The ground is painted once into the renderer's ground cache (drawRealmTile); the cosmos
// seen through glass, windows and the drop is one cached galaxy image and two cached ship silhouettes, drawn each frame only
// through the cosmos tiles in view (drawRealmCosmos: one clip, at most three images); objects and the realms' own creatures are
// plain canvas paths (the creatures through the pack sprite cache, monster-render.ts). Original art.
import { hashSeed } from "./random.js?v=r908-077da6310291";
import { dungeonTileVisibility } from "./dungeon-framework.js?v=r908-077da6310291";
import { SEEDS } from "./skylands.js?v=r908-077da6310291";

export const REALM_PAINT = {
  husk: { floor: ["#6f665c", "#675f55"], grit: "#00000026", path: ["#7a6f60", "#73685a"], tie: "#4a3a2a", rail: "#a6a29a", rock: ["#3d3631", "#37312c"], rockTop: "#4f4741", ore: ["#7fd8c4", "#ffd27a"], plank: "#6b5134", plankDark: "#3e2e1d", rim: "rgba(170,200,255,.45)" },
  ship: { deck: ["#4b535c", "#465058"], seam: "#2a3037", bolt: "#7c8894", grate: ["#3a4149", "#363d45"], bar: "#22272d", wall: ["#262b31", "#23282e"], wallTop: "#39414a", hull: "#4a5562", glassSky: "#060814", frame: "#8fb4d6", catwalk: "#5c6670", light: "#ff4a5a" },
  stars: ["#ffffff55", "#cfe0ff66", "#ffe9c466"],
  // The cosmos behind the glass: the galaxy image's size (tiles), how much it moves with the camera (0 fixed to the screen,
  // 1 fixed to the world), how strongly it shows; the ships: how many, their size (tiles), the seconds to cross the sky.
  cosmos: { size: 26, parallax: .22, alpha: { husk: .45, ship: .8 }, ships: 2, shipSize: [5, 3], crossing: [140, 220], shipParallax: .32 },
};
const hh = (x, y, k = 0) => hashSeed(`${x},${y},${k}`);
function stars(ctx, px, py, s, x, y, n) { for (let i = 0; i < n; i++) { const q = hh(x, y, i + 7); if (q % 3 === 0) continue; ctx.fillStyle = REALM_PAINT.stars[q % 3]; const r = q % 13 === 0 ? 1.6 : 1; ctx.fillRect(px + (q % 97) / 97 * s, py + ((q >> 8) % 97) / 97 * s, r, r); } }

// A seed realm's tile, painted into the ground cache. True when drawn (a realm's open drop is the ordinary starfield).
export function drawRealmTile(ctx, t, x, y, s, tiles, w) {
  if (!t?.realm || (t.chasm && !t.catwalk)) return false;
  const P = REALM_PAINT[t.realm] || REALM_PAINT.husk, px = x * s, py = y * s, d = t.detail || 0, at = (dx, dy) => tiles?.[(y + dy) * w + x + dx], gap = (dx, dy) => { const q = at(dx, dy); return !q || q.chasm; };
  const fill = (c) => { ctx.fillStyle = c; ctx.fillRect(px, py, s + 1, s + 1); };
  switch (t.kind) {
    case "huskFloor": case "huskPath": {
      fill((t.kind === "huskPath" ? P.path : P.floor)[d & 1]);
      ctx.fillStyle = P.grit; for (let i = 0; i < 3; i++) { const q = hh(x, y, i); ctx.fillRect(px + (q % 89) / 89 * s, py + ((q >> 7) % 89) / 89 * s, s * .12, s * .08); }
      if (t.kind === "huskPath") { ctx.fillStyle = P.tie; for (let i = 0; i < 2; i++) ctx.fillRect(px + s * .1, py + s * (.2 + i * .5), s * .8, s * .1); ctx.fillStyle = P.rail; ctx.fillRect(px + s * .25, py, Math.max(1, s * .05), s + 1); ctx.fillRect(px + s * .7, py, Math.max(1, s * .05), s + 1); }
      break;
    }
    case "huskTrestle": {
      fill("#0b0e11"); stars(ctx, px, py, s, x, y, 2);
      ctx.fillStyle = P.plankDark; const along = t.bridgeAxis === "x";
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? P.plank : P.plankDark; if (along) ctx.fillRect(px + s * (.05 + i * .32), py + s * .08, s * .26, s * .84); else ctx.fillRect(px + s * .08, py + s * (.05 + i * .32), s * .84, s * .26); }
      ctx.fillStyle = P.rail; if (along) { ctx.fillRect(px, py + s * .25, s + 1, Math.max(1, s * .05)); ctx.fillRect(px, py + s * .7, s + 1, Math.max(1, s * .05)); } else { ctx.fillRect(px + s * .25, py, Math.max(1, s * .05), s + 1); ctx.fillRect(px + s * .7, py, Math.max(1, s * .05), s + 1); }
      break;
    }
    case "huskRock": {
      fill(P.rock[d & 1]); ctx.fillStyle = P.rockTop; ctx.fillRect(px, py, s + 1, s * .3);
      if (t.ore) { const q = hh(x, y, 3); ctx.fillStyle = P.ore[q & 1]; for (let i = 0; i < 3; i++) { const qq = hh(x, y, i + 11); ctx.fillRect(px + (qq % 80) / 100 * s + s * .1, py + ((qq >> 6) % 60) / 100 * s + s * .3, Math.max(2, s * .08), Math.max(2, s * .08)); } }
      break;
    }
    case "shipDeck": {
      fill(P.deck[(x + y) & 1]); ctx.fillStyle = P.seam; ctx.fillRect(px, py, s + 1, 1); ctx.fillRect(px, py, 1, s + 1);
      ctx.fillStyle = P.bolt; for (const [u, v] of [[.12, .12], [.88, .12], [.12, .88], [.88, .88]]) ctx.fillRect(px + s * u - 1, py + s * v - 1, 2, 2);
      if (t.door) { ctx.fillStyle = "#c8a24a55"; ctx.fillRect(px, py + s * .45, s + 1, s * .1); }
      break;
    }
    case "shipGrate": case "shipCatwalk": {
      if (t.catwalk) { fill(P.glassSky); stars(ctx, px, py, s, x, y, 2); } else fill(P.grate[d & 1]);
      ctx.fillStyle = t.catwalk ? P.catwalk : P.bar; const along = t.bridgeAxis === "x";
      for (let i = 0; i < 5; i++) { if (along || !t.catwalk) ctx.fillRect(px + s * (.1 + i * .2), py + (t.catwalk ? s * .12 : 0), Math.max(1, s * .06), t.catwalk ? s * .76 : s + 1); else ctx.fillRect(px + s * .12, py + s * (.1 + i * .2), s * .76, Math.max(1, s * .06)); }
      if (t.catwalk) { ctx.fillStyle = P.light; if (along) { ctx.fillRect(px, py + s * .1, s + 1, 1); ctx.fillRect(px, py + s * .88, s + 1, 1); } else { ctx.fillRect(px + s * .1, py, 1, s + 1); ctx.fillRect(px + s * .88, py, 1, s + 1); } }
      else if (t.promenade || t.spine) { ctx.fillStyle = "#5ad1ff33"; ctx.fillRect(px, py + s * .48, s + 1, Math.max(1, s * .04)); }
      break;
    }
    case "shipGlass": case "shipStarWindow": {
      fill(P.glassSky); stars(ctx, px, py, s, x, y, 4);
      ctx.strokeStyle = t.window ? "#9fc4e6aa" : "#8fb4d677"; ctx.lineWidth = Math.max(1, s * (t.window ? .08 : .04)); ctx.strokeRect(px + .5, py + .5, s - 1, s - 1);
      ctx.fillStyle = "#ffffff12"; ctx.beginPath(); ctx.moveTo(px + s * .15, py + s * .85); ctx.lineTo(px + s * .45, py + s * .15); ctx.lineTo(px + s * .55, py + s * .15); ctx.lineTo(px + s * .25, py + s * .85); ctx.fill(); // a glint on the glass
      break;
    }
    case "shipWall": {
      fill(P.wall[d & 1]); ctx.fillStyle = t.hull ? P.hull : P.wallTop; ctx.fillRect(px, py, s + 1, s * (t.hull ? .4 : .25));
      ctx.fillStyle = "#00000044"; ctx.fillRect(px + s * .5, py + s * .3, 1, s * .7);
      if (!t.hull && d === 2) { ctx.fillStyle = "#5ad1ff66"; ctx.fillRect(px + s * .2, py + s * .55, s * .2, s * .06); }
      break;
    }
    default: return false;
  }
  if (!t.blocked && !t.chasm && t.realm === "husk") { ctx.fillStyle = P.rim; const k = Math.max(1, s * .05); if (gap(0, -1)) ctx.fillRect(px, py, s + 1, k); if (gap(-1, 0)) ctx.fillRect(px, py, k, s + 1); if (gap(1, 0)) ctx.fillRect(px + s - k, py, k + 1, s + 1); if (gap(0, 1)) { ctx.fillStyle = "#2a2420"; ctx.fillRect(px, py + s * .82, s + 1, s * .18 + 1); } }
  return true;
}

// ------------------------------------------------------------------------------------------------ the cosmos
const COSMOS = { galaxy: new Map(), ships: new Map() }; // cached images, by realm and tile size (at most a few)
function canvasOf(w, h) { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); if (typeof document !== "undefined" && document.createElement) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; } return null; }
function galaxyImage(realm, px) {
  const key = `${realm}:${px}`; if (COSMOS.galaxy.has(key)) return COSMOS.galaxy.get(key);
  const c = canvasOf(px, px), g = c?.getContext?.("2d"); if (!g) { COSMOS.galaxy.set(key, null); return null; }
  const m = px / 2, ship = realm === "ship";
  const neb = g.createRadialGradient(m, m, 0, m, m, m); neb.addColorStop(0, ship ? "rgba(255,226,200,.9)" : "rgba(255,170,110,.75)"); neb.addColorStop(.12, ship ? "rgba(200,150,255,.45)" : "rgba(200,90,60,.35)"); neb.addColorStop(.5, ship ? "rgba(60,80,170,.18)" : "rgba(90,40,40,.14)"); neb.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = neb; g.fillRect(0, 0, px, px);
  for (let arm = 0; arm < (ship ? 3 : 2); arm++) for (let i = 0; i < 260; i++) { // the arms: dots along a log spiral
    const f = i / 260, a = arm * (Math.PI * 2 / (ship ? 3 : 2)) + f * 5.2, r = m * (.08 + f * .85), j = (hh(i, arm, 5) % 100) / 100 - .5;
    const x = m + Math.cos(a + j * .4) * r, y = m + Math.sin(a + j * .4) * r * .55; g.fillStyle = `rgba(${ship ? "220,220,255" : "255,210,170"},${(.7 * (1 - f)).toFixed(2)})`; g.fillRect(x, y, 1.4, 1.4);
  }
  COSMOS.galaxy.set(key, c); if (COSMOS.galaxy.size > 4) COSMOS.galaxy.delete(COSMOS.galaxy.keys().next().value); return c;
}
function shipImage(i, px) {
  const key = `${i}:${px}`; if (COSMOS.ships.has(key)) return COSMOS.ships.get(key);
  const [sw, sh] = REALM_PAINT.cosmos.shipSize, W = Math.ceil(sw * px * (1 + i * .3)), H = Math.ceil(sh * px * (1 + i * .3)), c = canvasOf(W, H), g = c?.getContext?.("2d"); if (!g) { COSMOS.ships.set(key, null); return null; }
  g.fillStyle = i ? "#1b2230" : "#232a38"; g.beginPath(); g.moveTo(W, H * .5); g.lineTo(W * .62, H * .12); g.lineTo(W * .1, H * .22); g.lineTo(0, H * .5); g.lineTo(W * .1, H * .78); g.lineTo(W * .62, H * .88); g.closePath(); g.fill(); // a long hull
  g.fillStyle = "#3a4558"; g.fillRect(W * .2, H * .4, W * .55, H * .2);
  g.fillStyle = "#9fd8ff"; for (let k = 0; k < 7; k++) g.fillRect(W * (.22 + k * .07), H * .47, Math.max(1, W * .012), Math.max(1, H * .05)); // lit ports
  g.fillStyle = "#ffb070"; g.fillRect(0, H * .44, W * .04, H * .12); // the drive
  COSMOS.ships.set(key, c); if (COSMOS.ships.size > 6) COSMOS.ships.delete(COSMOS.ships.keys().next().value); return c;
}
const cosmosTile = (t) => !!t?.realm && (t.kind === "shipGlass" || t.kind === "shipStarWindow" || (t.chasm && !t.catwalk && !t.bored));
const VIEW_TILES = [];
// Per frame: the galaxy (and, aboard the ship, slow ships passing) seen through the cosmos tiles in view. `view` is the tile
// rectangle drawn, (cx, cy) the camera's world point in tiles.
export function drawRealmCosmos(ctx, g, s, view, now, cx, cy, reduce = false) {
  const M = g.map, realm = M?.seedRealm?.realm; if (!realm) return 0;
  const W = M.width, C = REALM_PAINT.cosmos; VIEW_TILES.length = 0;
  for (let y = Math.max(0, view.t); y < Math.min(M.height, view.b); y++) for (let x = Math.max(0, view.l); x < Math.min(W, view.r); x++) { const t = M.tiles[y * W + x]; if (cosmosTile(t) && dungeonTileVisibility(M, x, y) !== "unseen") VIEW_TILES.push(x, y); }
  if (!VIEW_TILES.length) return 0;
  const px = Math.max(64, Math.min(1024, Math.round(C.size * s / 4) * 4)), img = galaxyImage(realm, px); if (!img) return 0;
  ctx.save(); ctx.beginPath(); for (let i = 0; i < VIEW_TILES.length; i += 2) ctx.rect(VIEW_TILES[i] * s, VIEW_TILES[i + 1] * s, s + .5, s + .5); ctx.clip();
  const ax = W / 2, ay = M.height / 2, gx = (cx + (ax - cx) * C.parallax) * s, gy = (cy + (ay - cy) * C.parallax) * s;
  ctx.globalAlpha = C.alpha[realm] ?? .6; ctx.drawImage(img, gx - px / 2, gy - px / 2, px, px);
  if (realm === "ship") { ctx.globalAlpha = .9; const T = reduce ? 0 : now / 1000;
    for (let i = 0; i < C.ships; i++) { const im = shipImage(i, s); if (!im) continue; const per = C.crossing[0] + (C.crossing[1] - C.crossing[0]) * i, f = ((T / per) + i * .47) % 1, sx = ax + (f - .5) * W * 1.6, sy = ay + (i ? 9 : -12);
      const wx = (cx + (sx - cx) * C.shipParallax) * s, wy = (cy + (sy - cy) * C.shipParallax) * s; ctx.drawImage(im, wx - im.width / 2, wy - im.height / 2); } }
  ctx.restore(); return VIEW_TILES.length / 2;
}

// ------------------------------------------------------------------------------------------------ objects
export function drawRealmObject(ctx, o, s, now) {
  const cx = (o.x + .5) * s, cy = (o.y + .5) * s, pulse = .5 + .5 * Math.sin(now / 600 + (o.x + o.y));
  ctx.save();
  if (o.kind === "realmExit") {
    const live = o.state !== "sealed", c = o.onward ? [255, 214, 140] : [200, 160, 255];
    ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .42, s * .42, s * .1, 0, 0, 7); ctx.fill();
    if (live) { ctx.fillStyle = `rgba(${c},${.18 + pulse * .12})`; ctx.beginPath(); ctx.ellipse(cx, cy - s * .2, s * .55, s * .8, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = live ? `rgba(${c},${.75 + pulse * .25})` : "#5d5868"; ctx.lineWidth = Math.max(2, s * .09); ctx.beginPath(); ctx.ellipse(cx, cy - s * .2, s * .32, s * .62, 0, 0, 7); ctx.stroke();
    if (live) { ctx.fillStyle = `rgba(16,8,30,.85)`; ctx.beginPath(); ctx.ellipse(cx, cy - s * .2, s * .26, s * .55, 0, 0, 7); ctx.fill(); for (let i = 0; i < 6; i++) { const a = now / 900 + i, r = s * (.1 + (i % 3) * .06); ctx.fillStyle = `rgba(${c},.8)`; ctx.fillRect(cx + Math.cos(a) * r, cy - s * .2 + Math.sin(a) * r * 1.8, 2, 2); } }
  } else if (o.kind === "realmCrystal") {
    const used = o.state === "used";
    ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .38, s * .3, s * .08, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3b3640"; ctx.beginPath(); ctx.moveTo(cx - s * .3, cy + s * .38); ctx.lineTo(cx - s * .18, cy + s * .2); ctx.lineTo(cx + s * .2, cy + s * .2); ctx.lineTo(cx + s * .3, cy + s * .38); ctx.fill();
    if (!used) { ctx.fillStyle = `rgba(190,150,255,${.2 + pulse * .2})`; ctx.beginPath(); ctx.arc(cx, cy - s * .2, s * .45, 0, 7); ctx.fill(); }
    const tall = used ? .25 : .75; ctx.fillStyle = used ? "#5a5466" : "#c9a8ff"; ctx.beginPath(); ctx.moveTo(cx, cy + s * .22 - s * tall); ctx.lineTo(cx + s * .16, cy - s * .05); ctx.lineTo(cx + s * .1, cy + s * .22); ctx.lineTo(cx - s * .1, cy + s * .22); ctx.lineTo(cx - s * .16, cy - s * .05); ctx.closePath(); ctx.fill();
    if (!used) { ctx.fillStyle = "#f2e8ff"; ctx.beginPath(); ctx.moveTo(cx, cy + s * .22 - s * tall); ctx.lineTo(cx + s * .05, cy - s * .05); ctx.lineTo(cx - s * .04, cy + s * .1); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#8fe8ff"; ctx.beginPath(); ctx.moveTo(cx - s * .26, cy + s * .2); ctx.lineTo(cx - s * .2, cy - s * .1); ctx.lineTo(cx - s * .12, cy + s * .2); ctx.fill(); }
  } else if (o.kind === "realmCache") {
    const open = o.state === "used", ship = o.name === "Supply Locker";
    ctx.fillStyle = "#00000055"; ctx.fillRect(cx - s * .36, cy + s * .32, s * .72, s * .1);
    if (ship) { ctx.fillStyle = "#5b6672"; ctx.fillRect(cx - s * .3, cy - s * .35, s * .6, s * .7); ctx.fillStyle = open ? "#11151a" : "#3d4651"; ctx.fillRect(cx - s * .24, cy - s * .28, s * .48, s * .56); ctx.fillStyle = open ? "#5ad1ff" : "#ffcf6a"; ctx.fillRect(cx + s * .14, cy - s * .05, s * .05, s * .1); }
    else { ctx.fillStyle = "#5a4630"; ctx.fillRect(cx - s * .34, cy - s * .12, s * .68, s * .42); ctx.fillStyle = "#3a2c1d"; ctx.fillRect(cx - s * .34, cy - s * .12, s * .68, s * .08); ctx.fillStyle = "#222"; for (const u of [-.22, .22]) { ctx.beginPath(); ctx.arc(cx + s * u, cy + s * .32, s * .07, 0, 7); ctx.fill(); }
      if (!open) { ctx.fillStyle = "#8a8378"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx - s * .2 + i * s * .13, cy - s * .16, s * .08, 0, 7); ctx.fill(); } ctx.fillStyle = "#7fd8c4"; ctx.fillRect(cx - s * .05, cy - s * .22, s * .06, s * .05); } }
  } else if (o.kind === "realmSeed") {
    if (o.state !== "used") { const S = SEEDS[o.seed] || SEEDS.pumice; ctx.fillStyle = `rgba(255,255,255,${.12 + pulse * .15})`; ctx.beginPath(); ctx.arc(cx, cy, s * .3, 0, 7); ctx.fill(); ctx.fillStyle = S.color; ctx.beginPath(); ctx.ellipse(cx, cy + s * .05, s * .12, s * .16, .4, 0, 7); ctx.fill(); ctx.fillStyle = S.glint; ctx.fillRect(cx - s * .04, cy - s * .04, Math.max(2, s * .05), Math.max(2, s * .05)); }
  } else if (o.kind === "realmBeacon") {
    const lit = o.state === "lit";
    ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(cx, cy + s * .4, s * .32, s * .09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#4a4650"; ctx.fillRect(cx - s * .1, cy - s * .45, s * .2, s * .85); ctx.fillStyle = "#6a6572"; ctx.fillRect(cx - s * .22, cy - s * .5, s * .44, s * .1);
    if (lit) { ctx.fillStyle = `rgba(255,200,120,${.25 + pulse * .2})`; ctx.beginPath(); ctx.arc(cx, cy - s * .62, s * .38, 0, 7); ctx.fill(); ctx.fillStyle = "#ffd890"; ctx.beginPath(); ctx.moveTo(cx, cy - s * .9 - pulse * s * .06); ctx.quadraticCurveTo(cx + s * .14, cy - s * .62, cx, cy - s * .52); ctx.quadraticCurveTo(cx - s * .14, cy - s * .62, cx, cy - s * .9 - pulse * s * .06); ctx.fill(); }
    else { ctx.fillStyle = "#2a2730"; ctx.fillRect(cx - s * .12, cy - s * .62, s * .24, s * .1); }
  } else if (o.kind === "realmLore") {
    const ship = o.name === "Cracked Panel";
    ctx.fillStyle = ship ? "#2a3240" : "#57504a"; ctx.fillRect(cx - s * .26, cy - s * .32, s * .52, s * .62); ctx.fillStyle = ship ? "#5ad1ff88" : "#d8cbb488"; for (let i = 0; i < 4; i++) ctx.fillRect(cx - s * .18, cy - s * .22 + i * s * .12, s * (.36 - (i % 2) * .12), Math.max(1, s * .03));
  }
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ creatures
// Each takes the pack painter's frame q = { k (feet x), b (feet y), u (unit), t (seconds), p (palette), flip, e, state }.
function glow(ctx, x, y, r, color, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color + Math.round(a * 255).toString(16).padStart(2, "0")); g.addColorStop(1, color + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function shadow(ctx, k, b, rx, ry, a = .3) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(k, b, rx, ry, 0, 0, 7); ctx.fill(); }
const windup = (q) => q.state === "windup" ? 1 : 0;
export const SEED_REALM_BODIES = {
  hollowMiner(ctx, q) { // a hooded, see-through miner, lamp on its brow, pick raised
    const { k, b, u, t, p, flip } = q, lift = u * (.18 + Math.sin(t * 2) * .05), top = b - lift - u * 1.05;
    shadow(ctx, k, b, u * .26, u * .08, .25); ctx.save(); ctx.globalAlpha *= .82;
    const g = ctx.createLinearGradient(k, top, k, b - lift); g.addColorStop(0, p[0] + "e6"); g.addColorStop(1, p[0] + "10");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - u * .2, top + u * .25); ctx.quadraticCurveTo(k, top - u * .08, k + u * .2, top + u * .25); ctx.lineTo(k + u * .28, top + u * .85); for (let i = 3; i >= -3; i--) ctx.lineTo(k + i * u * .09, top + u * (1 + (i % 2 ? .08 : 0) + Math.sin(t * 5 + i) * .03)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p[1] + "dd"; ctx.beginPath(); ctx.ellipse(k + flip * u * .03, top + u * .3, u * .12, u * .13, 0, 0, 7); ctx.fill(); // the face, dark
    glow(ctx, k + flip * u * .05, top + u * .12, u * .35, p[2], .7); ctx.fillStyle = p[3]; ctx.fillRect(k + flip * u * .05 - u * .04, top + u * .09, u * .08, u * .06); // the lamp
    const raise = windup(q) ? -1.2 : Math.sin(t * 3) * .2, hx = k + flip * u * .25, hy = top + u * .5; ctx.strokeStyle = "#8a7a62"; ctx.lineWidth = Math.max(1.5, u * .05);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + flip * u * .32 * Math.cos(raise), hy + u * .32 * Math.sin(raise)); ctx.stroke(); // the haft
    const ex = hx + flip * u * .32 * Math.cos(raise), ey = hy + u * .32 * Math.sin(raise); ctx.strokeStyle = "#c9ced4"; ctx.lineWidth = Math.max(1.5, u * .04); ctx.beginPath(); ctx.moveTo(ex - u * .14, ey - u * .06); ctx.quadraticCurveTo(ex, ey - u * .14, ex + u * .14, ey - u * .06); ctx.stroke(); // the pick head
    ctx.restore();
  },
  veinWraith(ctx, q) { // a ribbon of glowing ore twisting over the drop, a bright knot for a heart
    const { k, b, u, t, p } = q, cy = b - u * (.9 + Math.sin(t * 1.7) * .1);
    shadow(ctx, k, b, u * .2, u * .06, .2); glow(ctx, k, cy, u * .8, p[0], .3);
    ctx.lineCap = "round"; for (let s = 0; s < 2; s++) { ctx.strokeStyle = s ? p[2] + "cc" : p[0] + "dd"; ctx.lineWidth = Math.max(1.5, u * (s ? .05 : .11)); ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const f = i / 10, x = k + Math.sin(f * 6 + t * 3) * u * .32 * (1 - f * .4), y = cy - u * .5 + f * u * 1.1; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    const pulse = .7 + .3 * Math.sin(t * 7) + windup(q) * .5; glow(ctx, k, cy, u * .3 * pulse, p[2], .95); ctx.fillStyle = p[3]; ctx.beginPath(); ctx.moveTo(k, cy - u * .12); ctx.lineTo(k + u * .08, cy); ctx.lineTo(k, cy + u * .12); ctx.lineTo(k - u * .08, cy); ctx.fill();
  },
  lastForeman(ctx, q) { // a huge ghost in a work coat, a drill-arm, a row of lamps for eyes
    const { k, b, u, t, p, flip } = q, lift = u * (.15 + Math.sin(t * 1.4) * .04), top = b - lift - u * 1.3;
    shadow(ctx, k, b, u * .5, u * .14, .35); glow(ctx, k, top + u * .5, u * 1.1, p[2], .18);
    ctx.save(); ctx.globalAlpha *= .9; const g = ctx.createLinearGradient(k, top, k, b - lift); g.addColorStop(0, p[0] + "f0"); g.addColorStop(1, p[0] + "18");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k - u * .45, top + u * .3); ctx.quadraticCurveTo(k, top - u * .1, k + u * .45, top + u * .3); ctx.lineTo(k + u * .55, top + u * 1.2); for (let i = 4; i >= -4; i--) ctx.lineTo(k + i * u * .13, top + u * (1.3 + (i % 2 ? .1 : 0) + Math.sin(t * 4 + i) * .04)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p[1] + "ee"; ctx.fillRect(k - u * .3, top + u * .2, u * .6, u * .22); // the visor
    for (let i = 0; i < 4; i++) { const x = k - u * .22 + i * u * .147; glow(ctx, x, top + u * .31, u * .14, p[2], .9); ctx.fillStyle = p[3]; ctx.fillRect(x - u * .03, top + u * .28, u * .06, u * .06); }
    const spin = t * (windup(q) ? 30 : 8), ax = k + flip * u * .55, ay = top + u * .75; ctx.fillStyle = "#6f6a60"; ctx.fillRect(Math.min(ax, ax + flip * u * .4), ay - u * .08, u * .4, u * .16); // the drill arm
    ctx.fillStyle = "#b9b2a4"; ctx.beginPath(); ctx.moveTo(ax + flip * u * .4, ay - u * .14); ctx.lineTo(ax + flip * u * .78, ay); ctx.lineTo(ax + flip * u * .4, ay + u * .14); ctx.fill();
    ctx.strokeStyle = "#5a554c"; ctx.lineWidth = Math.max(1, u * .02); for (let i = 0; i < 3; i++) { const f = ((spin / 6 + i / 3) % 1); ctx.beginPath(); ctx.moveTo(ax + flip * u * (.4 + f * .36), ay - u * .14 * (1 - f)); ctx.lineTo(ax + flip * u * (.4 + f * .36), ay + u * .14 * (1 - f)); ctx.stroke(); }
    ctx.restore();
  },
  deckSentry(ctx, q) { // an armoured ball on a humming field, one red lens
    const { k, b, u, t, p, flip } = q, cy = b - u * (.85 + Math.sin(t * 3) * .05), r = u * .3;
    shadow(ctx, k, b, u * .24, u * .07); ctx.strokeStyle = p[2] + "55"; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(k, b - u * .05 - i * u * .12, u * (.18 - i * .04), u * .04, 0, 0, 7); ctx.stroke(); }
    const g = ctx.createRadialGradient(k - r * .3, cy - r * .3, r * .1, k, cy, r); g.addColorStop(0, p[3]); g.addColorStop(.4, p[0]); g.addColorStop(1, p[1]); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(k, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(1, u * .03); ctx.beginPath(); ctx.arc(k, cy, r, -.3, Math.PI + .3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k - r, cy); ctx.lineTo(k + r, cy); ctx.stroke();
    const charge = windup(q); glow(ctx, k + flip * r * .45, cy, u * (.18 + charge * .2), p[2], .9); ctx.fillStyle = p[3]; ctx.beginPath(); ctx.arc(k + flip * r * .45, cy, u * .06, 0, 7); ctx.fill();
    ctx.fillStyle = p[1]; ctx.fillRect(k - u * .03, cy - r - u * .14, u * .06, u * .14); ctx.fillStyle = p[2]; ctx.fillRect(k - u * .03, cy - r - u * .17, u * .06, u * .04); // antenna
  },
  hullWarden(ctx, q) { // a tall security frame, visor slit, shock baton
    const { k, b, u, t, p, flip } = q, step = Math.sin(t * 6) * u * .04, hip = b - u * .55, sh = b - u * 1.05;
    shadow(ctx, k, b, u * .3, u * .09);
    ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(2, u * .09); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(k - u * .1, hip); ctx.lineTo(k - u * .14 + step, b); ctx.moveTo(k + u * .1, hip); ctx.lineTo(k + u * .14 - step, b); ctx.stroke(); // legs
    ctx.fillStyle = p[0]; ctx.beginPath(); ctx.moveTo(k - u * .26, sh); ctx.lineTo(k + u * .26, sh); ctx.lineTo(k + u * .18, hip); ctx.lineTo(k - u * .18, hip); ctx.closePath(); ctx.fill(); // torso
    ctx.fillStyle = p[1]; ctx.fillRect(k - u * .2, sh + u * .12, u * .4, u * .05); ctx.fillStyle = p[2]; ctx.fillRect(k - u * .05, sh + u * .22, u * .1, u * .1); // chest light
    ctx.fillStyle = p[0]; ctx.fillRect(k - u * .14, sh - u * .26, u * .28, u * .24); ctx.fillStyle = p[1]; ctx.fillRect(k - u * .12, sh - u * .17, u * .24, u * .06); glow(ctx, k + flip * u * .04, sh - u * .14, u * .16, p[2], .8); // head, visor
    const raise = windup(q) ? -1.1 : .5 + Math.sin(t * 2) * .1, hx = k + flip * u * .28, hy = sh + u * .08; ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(2, u * .07); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + flip * u * .2, hy + u * .2); ctx.stroke(); // arm
    const bx = hx + flip * u * .2, by = hy + u * .2; ctx.strokeStyle = "#2a2f36"; ctx.lineWidth = Math.max(2, u * .05); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + flip * u * .4 * Math.cos(raise), by - u * .4 * Math.sin(-raise)); ctx.stroke(); glow(ctx, bx + flip * u * .4 * Math.cos(raise), by - u * .4 * Math.sin(-raise), u * .15, p[2], .9); // baton
  },
  riveter(ctx, q) { // a six-legged repair crawler with a rivet gun on its back
    const { k, b, u, t, p, flip } = q, cy = b - u * .32;
    shadow(ctx, k, b, u * .34, u * .08); ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(1.5, u * .04);
    for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const ph = Math.sin(t * 10 + i * 2 + (sd > 0 ? 1 : 0)) * u * .04, x = k + (i - 1) * u * .14; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + sd * u * .12, cy - u * .1); ctx.lineTo(x + sd * u * .2 + ph, b - u * .02); ctx.stroke(); }
    ctx.fillStyle = p[0]; ctx.beginPath(); ctx.ellipse(k, cy, u * .26, u * .14, 0, 0, 7); ctx.fill(); ctx.fillStyle = p[1]; ctx.fillRect(k - u * .2, cy - u * .02, u * .4, u * .03);
    const aim = windup(q) ? -.6 : -.25; ctx.save(); ctx.translate(k - flip * u * .05, cy - u * .1); ctx.rotate(flip * aim); ctx.fillStyle = "#4a4236"; ctx.fillRect(0, -u * .05, flip * u * .32, u * .1); ctx.restore(); // the gun
    glow(ctx, k + flip * u * .16, cy - u * .02, u * .1, p[2], .9);
  },
  helmSovereign(ctx, q) { // the ship's mind in a heavy frame: a crowned head of light, shoulders like bulkheads
    const { k, b, u, t, p, flip } = q, step = Math.sin(t * 4) * u * .03, hip = b - u * .62, sh = b - u * 1.2;
    shadow(ctx, k, b, u * .5, u * .14, .38); glow(ctx, k, sh - u * .1, u * 1.1, p[2], .16);
    ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(3, u * .14); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(k - u * .16, hip); ctx.lineTo(k - u * .22 + step, b); ctx.moveTo(k + u * .16, hip); ctx.lineTo(k + u * .22 - step, b); ctx.stroke();
    ctx.fillStyle = p[0]; ctx.beginPath(); ctx.moveTo(k - u * .45, sh); ctx.lineTo(k + u * .45, sh); ctx.lineTo(k + u * .3, hip); ctx.lineTo(k - u * .3, hip); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p[1]; for (const sd of [-1, 1]) ctx.fillRect(k + sd * u * .38 - u * .12, sh - u * .12, u * .24, u * .2); // shoulder plates
    ctx.fillStyle = "#2b3140"; ctx.fillRect(k - u * .3, sh + u * .14, u * .6, u * .06); const core = .7 + .3 * Math.sin(t * 3) + windup(q) * .4; glow(ctx, k, sh + u * .32, u * .28 * core, p[2], .95); ctx.fillStyle = p[3]; ctx.beginPath(); ctx.arc(k, sh + u * .32, u * .07, 0, 7); ctx.fill();
    ctx.fillStyle = p[1]; ctx.fillRect(k - u * .16, sh - u * .38, u * .32, u * .3); glow(ctx, k + flip * u * .05, sh - u * .24, u * .2, p[2], .9); ctx.fillStyle = p[3]; ctx.fillRect(k - u * .12 + flip * u * .05, sh - u * .26, u * .24, u * .04); // head, eye band
    ctx.strokeStyle = p[2] + "cc"; ctx.lineWidth = Math.max(1, u * .03); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(k + i * u * .07, sh - u * .38); ctx.lineTo(k + i * u * .09, sh - u * (.5 + (i % 2 ? 0 : .06))); ctx.stroke(); } // the crown of light
    const raise = windup(q) ? -.9 : .4, ax = k + flip * u * .45, ay = sh + u * .05; ctx.strokeStyle = p[1]; ctx.lineWidth = Math.max(3, u * .12); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + flip * u * .35 * Math.cos(raise), ay + u * .35 * Math.sin(raise + 1)); ctx.stroke();
  },
};
